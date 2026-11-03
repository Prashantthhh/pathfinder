// How are match scores spread over realistic students?
//   npm run spread                          this tree
//   npm run spread -- --old <path>          also compare with an older checkout (git worktree) of the app
// Students are simulated: each has a theme (one or two interest types or dimensions), and every
// multi-choice answer favours options that carry the theme. Seeded, so runs are repeatable.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const args = process.argv.slice(2);
const oldIdx = args.indexOf('--old');
const oldRoot = oldIdx >= 0 ? resolve(args[oldIdx + 1]) : null;
const N = 3000;

function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

async function load(root) {
  const read = (p) => JSON.parse(readFileSync(resolve(root, p), 'utf8'));
  const imp = (p) => import(pathToFileURL(resolve(root, p)).href);
  const careers = read('src/data/careers.json');
  const quiz = read('src/data/quiz.json');
  const { buildProfile } = await imp('src/engine/vector.js');
  const { recommend } = await imp('src/engine/recommend.js');
  const { DIMENSION_IDS } = await imp('src/data/dimensions.js');
  return { careers, quiz, buildProfile, recommend, dims: DIMENSION_IDS };
}

function student(env, rand) {
  const theme = new Map();
  const first = env.dims[Math.floor(rand() * env.dims.length)];
  theme.set(first, 2);
  if (rand() < 0.65) { const second = env.dims[Math.floor(rand() * env.dims.length)]; if (second !== first) theme.set(second, 1); }
  const answers = {};
  const pick = (opts, k) => {
    const pool = opts.map((o) => ({ o, w: Math.exp(2 * Object.entries(o.w ?? {}).reduce((s, [d, v]) => s + (theme.get(d) ?? 0) * v, 0) / (Object.keys(o.w ?? {}).length || 1)) }));
    const out = [];
    for (let i = 0; i < k && pool.length; i++) {
      const total = pool.reduce((s, p) => s + p.w, 0); let r = rand() * total; let j = 0;
      while (j < pool.length - 1 && (r -= pool[j].w) > 0) j++;
      out.push(pool.splice(j, 1)[0].o.id);
    }
    return out;
  };
  for (const q of env.quiz.questions) {
    if (q.showIf) continue;
    const themed = q.options.some((o) => o.w);
    if (themed) answers[q.id] = pick(q.options, q.type === 'multi' ? 1 + Math.floor(rand() * (q.max ?? 1)) : 1);
    else answers[q.id] = [q.options[Math.floor(rand() * q.options.length)].id];
  }
  return { answers, theme: first };
}

function simulate(env) {
  const rand = rng(20261103);
  const pairs = []; const rows = [];
  for (let i = 0; i < N; i++) {
    const s = student(env, rand);
    const res = env.recommend(env.buildProfile(s.answers, env.quiz), env.careers);
    const pc = res.ranked.map((r) => r.percent);
    pairs.push(...pc);
    rows.push({ theme: s.theme, top: pc[0], pc });
  }
  return { pairs, rows, careers: env.careers.length };
}

const q = (arr, p) => { const s = [...arr].sort((a, b) => a - b); return s[Math.min(s.length - 1, Math.floor(p * s.length))]; };
const share = (arr, t) => arr.filter((v) => v >= t).length / arr.length;
const pct = (x) => `${(x * 100).toFixed(1)}%`;

function report(name, sim) {
  console.log(`\n## ${name}: ${N} simulated students x ${sim.careers} careers`);
  console.log('Score distribution over all student-career pairs:');
  for (let lo = 0; lo < 100; lo += 10) {
    const n = sim.pairs.filter((v) => v >= lo && v < lo + 10 + (lo === 90 ? 1 : 0)).length;
    console.log(`  ${String(lo).padStart(2)}-${String(lo + 9).padStart(2)}  ${pct(n / sim.pairs.length).padStart(6)}  ${'#'.repeat(Math.round((n / sim.pairs.length) * 120))}`);
  }
  const tops = sim.rows.map((r) => r.top);
  console.log(`Top-1 score per student: p10 ${q(tops, 0.1)}  p25 ${q(tops, 0.25)}  median ${q(tops, 0.5)}  p75 ${q(tops, 0.75)}  p90 ${q(tops, 0.9)}`);
  for (const t of [80, 65, 50]) {
    const counts = sim.rows.map((r) => r.pc.filter((v) => v >= t).length);
    console.log(`>= ${t}: pairs ${pct(share(sim.pairs, t))}  | students with at least one ${pct(counts.filter((c) => c > 0).length / N)}  | careers per student: median ${q(counts, 0.5)}, p90 ${q(counts, 0.9)}`);
  }
}

const here = await load(process.cwd());
const now = simulate(here);
let before = null;
if (oldRoot) { before = simulate(await load(oldRoot)); report(`BEFORE (${oldRoot})`, before); }
report('NOW', now);

if (before) {
  console.log('\n## Equivalent cutoffs (same share of student-career pairs as the old 80 / 65 / 50)');
  for (const t of [80, 65, 50]) {
    const target = share(before.pairs, t);
    let eq = 0; for (let c = 100; c >= 0; c--) if (share(now.pairs, c) >= target) { eq = c; break; }
    console.log(`  old ${t} (${pct(target)} of pairs)  ->  now ${eq}`);
  }
  console.log('Equivalent cutoffs by "students with at least one match above the line":');
  for (const t of [80, 65, 50]) {
    const target = before.rows.filter((r) => r.top >= t).length / N;
    let eq = 0; for (let c = 100; c >= 0; c--) if (now.rows.filter((r) => r.top >= c).length / N >= target) { eq = c; break; }
    console.log(`  old ${t} (${pct(target)} of students)  ->  now ${eq}`);
  }
}

console.log('\n## NOW: what a "Strong" cutoff would give per student (old 80 gave: median 3 careers, 99.8% of students at least one)');
for (const c of [70, 72, 75, 78, 80]) {
  const counts = now.rows.map((r) => r.pc.filter((v) => v >= c).length);
  console.log(`  strong >= ${c}: median ${q(counts, 0.5)} careers, p90 ${q(counts, 0.9)}, students with none ${pct(counts.filter((n) => n === 0).length / N)}, share of pairs ${pct(share(now.pairs, c))}`);
}

console.log('\n## NOW, by the student\'s leading type: median top-1 and how many careers clear each line');
for (const d of here.dims) {
  const rs = now.rows.filter((r) => r.theme === d);
  if (!rs.length) continue;
  const med = (t) => q(rs.map((r) => r.pc.filter((v) => v >= t).length), 0.5);
  console.log(`  ${d}  n=${String(rs.length).padStart(4)}  top-1 median ${q(rs.map((r) => r.top), 0.5)}  careers >=80: ${med(80)}, >=65: ${med(65)}, >=50: ${med(50)}`);
}
