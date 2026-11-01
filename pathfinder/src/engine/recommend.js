import { DIMENSION_BY_ID, DIMENSION_IDS } from '../data/dimensions.js';
import { cosine, magnitude, toArray } from './cosine.js';

export const TOP_N = 5;
export const ALT_N = 3;
export const MIN_DRIVER_SHARE = 0.1;

/**
 * Explain a match. Cosine similarity is a sum over dimensions of
 *   (student_d * career_d) / (|student| * |career|)
 * so each dimension's term is exactly how much that dimension contributed to the
 * score. The largest terms are the "drivers".
 */
export function explain(profile, career) {
  const a = toArray(profile.vector);
  const b = toArray(career.vector);
  const denom = magnitude(profile.vector) * magnitude(career.vector);
  if (!denom) return { drivers: [], stretch: [], sentence: '' };

  const terms = DIMENSION_IDS.map((dim, i) => ({ dim, term: (a[i] * b[i]) / denom, i }));
  const total = terms.reduce((s, t) => s + t.term, 0) || 1;

  // Only dimensions that carry a meaningful part of the score are called
  // "drivers"; a 5% sliver is noise and would make the explanation misleading.
  const positive = terms.filter((t) => t.term > 0).sort((x, y) => y.term - x.term);
  const drivers = positive
    .filter((t, i) => i === 0 || t.term / total >= MIN_DRIVER_SHARE)
    .slice(0, 3)
    .map((t) => ({
      dim: t.dim,
      share: t.term / total,
      student: profile.display[t.dim],
      career: career.vector[t.dim],
      sources: profile.contributions
        .filter((c) => c.dim === t.dim)
        .sort((x, y) => y.weight - x.weight)
        .slice(0, 2)
        .map(({ prompt, label, optionId, questionId, kind }) => ({ prompt, label, optionId, questionId, kind })),
    }));

  // Dimensions the career leans on that the student's answers barely touched:
  // honest "you would be learning this" notes rather than hidden gaps.
  const stretch = DIMENSION_IDS
    .filter((d) => career.vector[d] >= 0.5 && profile.display[d] < 0.3)
    .sort((x, y) => career.vector[y] - career.vector[x])
    .slice(0, 2);

  const names = drivers.map((d) => DIMENSION_BY_ID[d.dim].label);
  const sentence = names.length
    ? `Your answers lean on ${list(names)}, which are also where ${career.title} puts most of its weight.`
    : '';
  return { drivers, stretch, sentence };
}

function list(items) {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

/**
 * Rank every career by cosine similarity to the student's profile.
 *
 * `score` is a 0-1 match score: how closely the shape of the student's answers
 * lines up with the career's profile. It is NOT a probability of success.
 */
export function recommend(profile, careers, { top = TOP_N, alternatives = ALT_N } = {}) {
  const insufficient = !magnitude(profile.vector);

  const ranked = careers
    .map((career) => ({ career, score: cosine(profile.vector, career.vector) }))
    .sort((x, y) => y.score - x.score || x.career.title.localeCompare(y.career.title))
    .map((r, i) => ({
      ...r,
      rank: i + 1,
      percent: Math.round(r.score * 100),
      why: explain(profile, r.career),
    }));

  if (insufficient) return { insufficient: true, ranked, matches: [], alternatives: [] };

  const matches = ranked.slice(0, top);
  const rest = ranked.slice(top);

  // Alternatives: strong scores from areas the top picks don't cover, so the
  // shortlist isn't three near-identical roles. Fill any gap by score.
  const coveredAreas = new Set(matches.slice(0, 3).map((m) => m.career.area));
  const fresh = rest.filter((r) => !coveredAreas.has(r.career.area)).slice(0, alternatives);
  const filler = rest.filter((r) => !fresh.includes(r)).slice(0, alternatives - fresh.length);
  const alts = [...fresh, ...filler].sort((x, y) => x.rank - y.rank);

  return { insufficient: false, ranked, matches, alternatives: alts };
}
