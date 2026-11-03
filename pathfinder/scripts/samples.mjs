// Prints the top 5 matches (plus split, alternatives and "why") for the sample students.
//   npm run samples            all sample students
//   npm run samples -- arts    one student
import { readFileSync } from 'node:fs';
import { buildProfile } from '../src/engine/vector.js';
import { recommend, splitMatches } from '../src/engine/recommend.js';
import { PERSONAS } from '../src/engine/fixtures.js';
import { DIMENSION_BY_ID } from '../src/data/dimensions.js';
import { tierOf } from '../src/engine/tiers.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const careers = read('../src/data/careers.json');
const quiz = read('../src/data/quiz.json');
const domains = Object.fromEntries(read('../src/data/domains.json').domains.map((d) => [d.id, d.label]));

const only = process.argv[2];
for (const p of PERSONAS.filter((x) => (only ? x.id === only : x.id !== 'iti-hands-on'))) {
  const profile = buildProfile(p.answers, quiz);
  const res = recommend(profile, careers);
  const { strong } = splitMatches(res.matches);
  console.log(`\n=== ${p.name}  [${p.stream}] ===`);
  console.log('Interests (strongest = 1.00): ' + Object.entries(profile.display).sort((a, b) => b[1] - a[1]).map(([d, v]) => `${DIMENSION_BY_ID[d].label} ${v.toFixed(2)}`).join(' | '));
  console.log(`Context: stream=${profile.context.stream}, open to 5+ yrs=${profile.context.study}, need to earn soon=${profile.context.earn}`);
  console.log('Top 5 (match score, not a prediction of success):');
  res.matches.slice(0, 5).forEach((m) => {
    const bucket = strong.includes(m) ? 'STRONG FIT' : 'explore further';
    const why = m.fit.reasons.map((r) => r.text).join('; ');
    console.log(`  ${m.rank}. ${m.career.title.padEnd(34)} ${String(m.percent).padStart(3)}%  ${tierOf(m.percent).label.padEnd(15)} ${bucket}${why ? `  <- ${why}` : ''}`);
    console.log(`       ${domains[m.career.domain]}`);
  });
  console.log(`Matches shown: ${res.matches.length}; strong fits: ${strong.length}; careers below the 50% line: ${res.belowMatchFloor}`);
  console.log('Alternatives: ' + (res.alternatives.map((m) => `${m.career.title} (${m.percent}%)`).join('; ') || 'none'));
}
