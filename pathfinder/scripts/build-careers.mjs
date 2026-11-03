// Builds src/data/careers.json (+ careersMeta.json) from careerSeeds.json and the O*NET database.
//   npm run onet:fetch && npm run onet:careers
//
// Per career, from its closest O*NET occupation (by exact title):
//   description  O*NET occupation description (US wording)
//   riasec       Occupational Interests, 1-7 (Career Interest Types.txt, scale OI)
//   settings     six work settings derived from Work Context (see src/data/settings.js)
//   tasks        the five most important core task statements (Task Statements + Task Ratings IM)
//   skills       the five most important essential skills (Essential Skills, scale IM)
//   related      three nearest careers by interest profile
// Fails loudly if anything is missing. Nothing here is used for Indian salary,
// outlook or qualifications.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DB_DIR } from './fetch-onet.mjs';
import { SETTINGS, normaliseContext } from '../src/data/settings.js';
import { STREAM_LABELS } from '../src/data/streams.js';
import { TYPES } from '../src/engine/hexmap.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seeds = JSON.parse(readFileSync(join(root, 'src/data/careerSeeds.json'), 'utf8'));
const seedById = Object.fromEntries(seeds.careers.map((s) => [s.id, s]));
const domains = JSON.parse(readFileSync(join(root, 'src/data/domains.json'), 'utf8'));
const registry = JSON.parse(readFileSync(join(root, 'src/data/indiaRegistry.json'), 'utf8'));

if (!existsSync(join(DB_DIR, 'Occupation Data.txt'))) {
  console.error('O*NET files not found. Run `npm run onet:fetch` first.');
  process.exit(2);
}
const tsv = (name) => {
  const [head, ...lines] = readFileSync(join(DB_DIR, name), 'utf8').split(/\r?\n/).filter(Boolean);
  const cols = head.split('\t');
  return lines.map((l) => Object.fromEntries(l.split('\t').map((v, i) => [cols[i], v])));
};

const problems = [];
const occ = new Map();
// provenance is recorded only for the occupations we actually use
const usedTitles = new Set(seeds.careers.map((c) => c.onet));
const usedCodes = new Set();
const provenance = (acc, row) => {
  acc.dates ??= new Set();
  acc.sources ??= new Set();
  acc.dates.add(row.Date);
  acc.sources.add(row['Domain Source']);
};
const finish = (acc) => {
  const toKey = (d) => d.split('/').reverse().join('-');
  const dates = [...(acc.dates ?? [])].sort((a, b) => toKey(a).localeCompare(toKey(b)));
  return { dateFrom: dates[0], dateTo: dates[dates.length - 1], sources: [...(acc.sources ?? [])].sort() };
};
for (const o of tsv('Occupation Data.txt')) {
  if (occ.has(o.Title)) occ.set(o.Title, null); // ambiguous
  else occ.set(o.Title, o);
  if (usedTitles.has(o.Title)) usedCodes.add(o['O*NET-SOC Code']);
}

const TYPE_BY_NAME = { Realistic: 'R', Investigative: 'I', Artistic: 'A', Social: 'S', Enterprising: 'E', Conventional: 'C' };
const riasecBy = new Map();
const interestsMeta = {};
for (const r of tsv('Career Interest Types.txt')) {
  const t = TYPE_BY_NAME[r['Element Name']];
  if (!t || r['Scale ID'] !== 'OI') continue;
  if (!riasecBy.has(r['O*NET-SOC Code'])) riasecBy.set(r['O*NET-SOC Code'], {});
  riasecBy.get(r['O*NET-SOC Code'])[t] = Number(r['Data Value']);
  if (usedCodes.has(r['O*NET-SOC Code'])) provenance(interestsMeta, r);
}

const ctxBy = new Map();
const contextMeta = {};
for (const r of tsv('Work Context.txt')) {
  if (r['Scale ID'] !== 'CX') continue;
  const code = r['O*NET-SOC Code'];
  if (!ctxBy.has(code)) ctxBy.set(code, new Map());
  ctxBy.get(code).set(r['Element ID'], Number(r['Data Value']));
  if (usedCodes.has(code)) provenance(contextMeta, r);
}

const taskText = new Map();
const taskMeta = {};
for (const t of tsv('Task Statements.txt')) {
  taskText.set(`${t['O*NET-SOC Code']}|${t['Task ID']}`, { text: t.Task, type: t['Task Type'] });
  if (usedCodes.has(t['O*NET-SOC Code'])) provenance(taskMeta, t);
}
const taskImportance = new Map();
for (const r of tsv('Task Ratings.txt')) {
  if (r['Scale ID'] !== 'IM') continue;
  const code = r['O*NET-SOC Code'];
  if (!taskImportance.has(code)) taskImportance.set(code, []);
  taskImportance.get(code).push({ id: r['Task ID'], value: Number(r['Data Value']) });
}

const skillsBy = new Map();
const skillMeta = {};
for (const r of tsv('Essential Skills.txt')) {
  if (r['Scale ID'] !== 'IM' || r['Recommend Suppress'] === 'Y') continue;
  const code = r['O*NET-SOC Code'];
  if (!skillsBy.has(code)) skillsBy.set(code, []);
  skillsBy.get(code).push({ name: r['Element Name'], value: Number(r['Data Value']) });
  if (usedCodes.has(code)) provenance(skillMeta, r);
}

const round = (n, p = 2) => Number(n.toFixed(p));

const centred = (r) => {
  const v = TYPES.map((t) => r[t]);
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return v.map((x) => x - m);
};
const cos = (a, b) => {
  const dot = a.reduce((s, x, i) => s + x * b[i], 0);
  const na = Math.hypot(...a);
  const nb = Math.hypot(...b);
  return na && nb ? dot / (na * nb) : 0;
};

const domainIds = new Set(domains.domains.map((d) => d.id));
const routeIds = { exam: new Set(Object.keys(registry.exams)), body: new Set(Object.keys(registry.bodies)) };

const careers = seeds.careers.map((s) => {
  const o = occ.get(s.onet);
  if (!o) {
    problems.push(`${s.id}: O*NET title ${o === null ? 'ambiguous' : 'not found'}: "${s.onet}"`);
    return null;
  }
  const code = o['O*NET-SOC Code'];
  if (!domainIds.has(s.domain)) problems.push(`${s.id}: unknown domain ${s.domain}`);
  for (const r of s.routes) {
    if (r.exam && !routeIds.exam.has(r.exam)) problems.push(`${s.id}: unknown exam ${r.exam}`);
    if (r.body && !routeIds.body.has(r.body)) problems.push(`${s.id}: unknown body ${r.body}`);
  }
  const stageIds = new Set();
  for (const st of s.roadmap ?? []) {
    if (!st.id || !st.title || stageIds.has(st.id)) problems.push(`${s.id}: bad or repeated roadmap stage "${st.id}"`);
    stageIds.add(st.id);
    if (st.exam && !routeIds.exam.has(st.exam)) problems.push(`${s.id}: roadmap stage ${st.id}: unknown exam ${st.exam}`);
    if (st.body && !routeIds.body.has(st.body)) problems.push(`${s.id}: roadmap stage ${st.id}: unknown body ${st.body}`);
  }
  for (const st of s.entry.streams) if (!(st in STREAM_LABELS)) problems.push(`${s.id}: unknown stream ${st}`);

  const riasec = riasecBy.get(code);
  if (!riasec || TYPES.some((t) => typeof riasec[t] !== 'number')) problems.push(`${s.id}: no interest scores for ${code}`);

  const ctx = ctxBy.get(code);
  const settings = {};
  for (const set of SETTINGS) {
    const vals = set.items.map((it) => {
      const v = ctx?.get(it.id);
      if (v === undefined) problems.push(`${s.id}: Work Context ${it.id} (${it.name}) missing for ${code}`);
      return normaliseContext(v, it.sign);
    });
    settings[set.id] = round(vals.reduce((a, b) => a + b, 0) / vals.length, 3);
  }

  const imp = (taskImportance.get(code) ?? [])
    .map((t) => ({ ...t, ...taskText.get(`${code}|${t.id}`) }))
    .filter((t) => t.text && t.type === 'Core')
    .sort((a, b) => b.value - a.value)
    .slice(0, 5)
    .map((t) => t.text);
  if (imp.length < 3) problems.push(`${s.id}: fewer than 3 core tasks for ${code}`);

  const skills = (skillsBy.get(code) ?? []).sort((a, b) => b.value - a.value).slice(0, 5).map((k) => k.name);
  if (skills.length < 3) problems.push(`${s.id}: fewer than 3 skills for ${code}`);

  return {
    id: s.id,
    title: s.title,
    domain: s.domain,
    keywords: s.keywords,
    onet: { code, title: s.onet, ...(s.loose ? { loose: s.loose } : {}) },
    description: o.Description,
    riasec: Object.fromEntries(TYPES.map((t) => [t, round(riasec?.[t] ?? 0)])),
    settings,
    tasks: imp,
    skills,
    entry: s.entry,
    routes: s.routes,
    ...(s.roadmap ? { roadmap: s.roadmap } : {}),
    salary: null,
    outlook: null,
  };
});

if (problems.length || careers.some((c) => !c)) {
  console.error(['', `${problems.length} problem(s):`, ...problems.map((p) => ` - ${p}`)].join('\n'));
  process.exit(1);
}

// Raw work-setting values are compressed (almost every occupation involves some contact with
// people, for example), so each setting is rescaled 0-1 ACROSS THESE CAREERS. The result means
// "relative to the other careers here". The raw derived value is kept in settingsRaw.
const settingRanges = {};
for (const set of SETTINGS) {
  const vals = careers.map((c) => c.settings[set.id]);
  settingRanges[set.id] = { min: Math.min(...vals), max: Math.max(...vals) };
}
for (const c of careers) {
  c.settingsRaw = c.settings;
  c.settings = Object.fromEntries(SETTINGS.map((set) => {
    const { min, max } = settingRanges[set.id];
    return [set.id, round(max > min ? (c.settingsRaw[set.id] - min) / (max - min) : 0.5, 3)];
  }));
}

// related careers: any hand-picked `relatedPins` from the seed first, then the nearest by interest profile, three in all
for (const c of careers) {
  const pins = (seedById[c.id].relatedPins ?? []).slice(0, 3);
  for (const id of pins) if (id === c.id || !careers.some((o) => o.id === id)) throw new Error(`${c.id}: bad relatedPins entry "${id}"`);
  const nearest = careers
    .filter((o) => o.id !== c.id && !pins.includes(o.id))
    .map((o) => ({ id: o.id, sim: cos(centred(c.riasec), centred(o.riasec)) }))
    .sort((a, b) => b.sim - a.sim || a.id.localeCompare(b.id))
    .map((o) => o.id);
  c.related = [...pins, ...nearest].slice(0, 3);
}

const readme = readFileSync(join(DB_DIR, 'Read Me.txt'), 'utf8').split(/\r?\n/);
const meta = {
  source: readme[0].trim(),
  release: readme[1].trim(),
  url: 'https://www.onetcenter.org/database.html',
  license: 'CC BY 4.0',
  licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
  interests: finish(interestsMeta),
  workContext: finish(contextMeta),
  tasks: finish(taskMeta),
  skills: finish(skillMeta),
  streams: STREAM_LABELS,
  settingsMethod: 'Six work settings derived by PATHFINDER from O*NET Work Context items (scale CX 1-5, rescaled 0-1), then rescaled across the careers in this product so 0 means the least and 1 the most among them. They are not O*NET scores. Items are listed in src/data/settings.js.',
  settingRanges,
  count: careers.length,
};

writeFileSync(join(root, 'src/data/careers.json'), `${JSON.stringify(careers, null, 2)}\n`);
writeFileSync(join(root, 'src/data/careersMeta.json'), `${JSON.stringify(meta, null, 2)}\n`);
console.log(`Wrote ${careers.length} careers.`);
for (const k of ['interests', 'workContext', 'tasks', 'skills']) console.log(`  ${k}: ${meta[k].sources.join(' + ')}, ${meta[k].dateFrom} to ${meta[k].dateTo}`);
const empty = domains.domains.filter((d) => !careers.some((c) => c.domain === d.id)).map((d) => d.id);
console.log(`Domains with no career yet: ${empty.length ? empty.join(', ') : 'none'}`);
