// Builds src/data/domains.json from src/data/domainSeeds.json + the O*NET database.
//   npm run onet:fetch && npm run onet:domains
//
// For each domain: resolve its representative occupations by EXACT O*NET title,
// average their RIASEC "Occupational Interests" (1-7), project the result onto the
// interest map (src/engine/hexmap.js) and spread overlapping points apart.
// The script fails loudly if a title is missing or ambiguous.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CACHE, DB_DIR, ONET_VERSION } from './fetch-onet.mjs';
import { TYPES, maxLeadFor, place, shapeOf, spread, wedgeOf } from '../src/engine/hexmap.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seeds = JSON.parse(readFileSync(join(root, 'src/data/domainSeeds.json'), 'utf8'));

if (!existsSync(join(DB_DIR, 'Occupation Data.txt'))) {
  console.error('O*NET files not found. Run `npm run onet:fetch` first.');
  process.exit(2);
}

const tsv = (name) => {
  const [head, ...lines] = readFileSync(join(DB_DIR, name), 'utf8').split(/\r?\n/).filter(Boolean);
  const cols = head.split('\t');
  return lines.map((l) => Object.fromEntries(l.split('\t').map((v, i) => [cols[i], v])));
};

// --- occupations by exact title (the .00 base code only) ---
const byTitle = new Map();
for (const o of tsv('Occupation Data.txt')) {
  if (!o['O*NET-SOC Code'].endsWith('.00')) continue;
  if (byTitle.has(o.Title)) throw new Error(`Ambiguous O*NET title: ${o.Title}`);
  byTitle.set(o.Title, o['O*NET-SOC Code']);
}

// --- RIASEC per occupation (scale OI, 1-7) ---
const ELEMENT_TO_TYPE = { 'Realistic': 'R', 'Investigative': 'I', 'Artistic': 'A', 'Social': 'S', 'Enterprising': 'E', 'Conventional': 'C' };
const riasecBy = new Map();
let interestsDate = '';
let interestsSource = '';
for (const r of tsv('Career Interest Types.txt')) {
  const type = ELEMENT_TO_TYPE[r['Element Name']];
  if (!type || r['Scale ID'] !== 'OI') continue;
  if (!riasecBy.has(r['O*NET-SOC Code'])) riasecBy.set(r['O*NET-SOC Code'], {});
  riasecBy.get(r['O*NET-SOC Code'])[type] = Number(r['Data Value']);
  interestsDate = r.Date;
  interestsSource = r['Domain Source'];
}

const round = (n, p = 3) => Number(n.toFixed(p));
const problems = [];
const domains = seeds.domains.map((d) => {
  const occupations = d.occupations.map((title) => {
    const code = byTitle.get(title);
    if (!code) { problems.push(`${d.id}: O*NET title not found: "${title}"`); return null; }
    const riasec = riasecBy.get(code);
    if (!riasec || TYPES.some((t) => typeof riasec[t] !== 'number')) { problems.push(`${d.id}: no RIASEC data for "${title}" (${code})`); return null; }
    return { code, title, riasec };
  }).filter(Boolean);
  if (!occupations.length) return { ...d, occupations: [], riasec: null };
  const riasec = Object.fromEntries(TYPES.map((t) => [t, round(occupations.reduce((s, o) => s + o.riasec[t], 0) / occupations.length, 2)]));
  return { ...d, occupations: occupations.map(({ code, title }) => ({ code, title })), riasec };
});

if (problems.length) {
  console.error(['', `${problems.length} problem(s):`, ...problems.map((p) => ` - ${p}`)].join('\n'));
  process.exit(1);
}

const maxLead = maxLeadFor(domains.map((d) => d.riasec));
const raw = domains.map((d) => place(d.riasec, maxLead));
const spreadOut = spread(raw, { minDist: 0.105, pull: 0.06, iterations: 400, limit: 0.93 });

const out = {
  meta: {
    source: `O*NET ${ONET_VERSION} Database`,
    release: readFileSync(join(DB_DIR, 'Read Me.txt'), 'utf8').split(/\r?\n/)[1].trim(),
    url: 'https://www.onetcenter.org/database.html',
    license: 'CC BY 4.0',
    licenseUrl: 'https://creativecommons.org/licenses/by/4.0/',
    interests: { file: 'Career Interest Types.txt', scale: 'OI (1-7)', date: interestsDate, source: interestsSource },
    sha256: existsSync(join(CACHE, 'sha256.txt')) ? readFileSync(join(CACHE, 'sha256.txt'), 'utf8').trim() : null,
    method: 'Domain RIASEC = mean of its representative O*NET occupations. Position: primary interest picks the wedge, a strong neighbouring interest nudges toward it, distance from the centre = how distinct the primary interest is (src/engine/hexmap.js). Points are then spread slightly so labels do not overlap.',
    maxLead: round(maxLead, 4),
    spread: { maxMove: round(spreadOut.maxMove, 3), minGap: round(spreadOut.minGap, 3) },
  },
  groups: seeds.groups,
  domains: domains.map((d, i) => ({
    ...d,
    home: { x: round(raw[i].x), y: round(raw[i].y) },
    x: round(spreadOut.points[i].x),
    y: round(spreadOut.points[i].y),
    primary: shapeOf(d.riasec).primary,
    secondary: shapeOf(d.riasec).secondary,
    wedge: wedgeOf(spreadOut.points[i]),
  })),
};

writeFileSync(join(root, 'src/data/domains.json'), `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote src/data/domains.json: ${out.domains.length} domains, maxLead=${out.meta.maxLead}, max nudge ${out.meta.spread.maxMove}, min gap ${out.meta.spread.minGap}`);
console.log(`Interests: ${interestsSource}, ${interestsDate}; release: ${out.meta.release}`);
