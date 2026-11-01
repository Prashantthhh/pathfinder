// Prints the top 5 matches (plus alternatives and "why") for sample students.
//   npm run samples            all sample students
//   npm run samples -- game-builder
import { readFileSync } from 'node:fs';
import { buildProfile } from '../src/engine/vector.js';
import { recommend } from '../src/engine/recommend.js';
import { PERSONAS } from '../src/engine/fixtures.js';
import { DIMENSION_BY_ID } from '../src/data/dimensions.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const careers = read('../src/data/careers.json');
const quiz = read('../src/data/quiz.json');

const only = process.argv[2];
for (const p of PERSONAS.filter((x) => !only || x.id === only)) {
  const profile = buildProfile(p.answers, quiz);
  const res = recommend(profile, careers);
  console.log(`\n=== ${p.name} ===`);
  console.log('Profile (strongest = 1.00): ' +
    Object.entries(profile.display).sort((a, b) => b[1] - a[1]).map(([d, v]) => `${d} ${v.toFixed(2)}`).join(' | '));
  console.log('Top 5 (match score, not a prediction of success):');
  res.matches.forEach((m) => {
    const drivers = m.why.drivers.map((d) => `${DIMENSION_BY_ID[d.dim].label} ${(d.share * 100).toFixed(0)}%`).join(', ');
    console.log(`  ${m.rank}. ${m.career.title.padEnd(24)} ${String(m.percent).padStart(3)}%   drivers: ${drivers}`);
  });
  console.log('Alternatives: ' + res.alternatives.map((m) => `${m.career.title} (${m.percent}%)`).join('; '));
  const first = res.matches[0];
  console.log(`Why #1: ${first.why.sentence}`);
  first.why.drivers.forEach((d) => d.sources.forEach((s) => console.log(`     ${DIMENSION_BY_ID[d.dim].label} <- "${s.label}"`)));
  if (first.why.stretch.length) console.log('     To learn: ' + first.why.stretch.map((d) => DIMENSION_BY_ID[d].label).join(', '));
}
