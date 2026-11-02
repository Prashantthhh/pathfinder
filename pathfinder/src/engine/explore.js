import { DIMENSION_BY_ID, DIMENSION_IDS } from '../data/dimensions.js';
import { DOMAIN_BY_ID } from '../data/domainsIndex.js';
import { cosine } from './cosine.js';
import { centre } from './vector.js';

const words = (s) => String(s).toLowerCase().split(/[^a-z0-9+#]+/).filter(Boolean);

// Where a query word can match, and how much it counts.
const FIELDS = [
  { weight: 6, get: (c) => c.title },
  { weight: 4, get: (c) => (c.keywords ?? []).join(' ') },
  { weight: 2, get: (c) => DOMAIN_BY_ID[c.domain]?.label ?? '' },
  { weight: 2, get: (c) => (c.skills ?? []).join(' ') },
  { weight: 1, get: (c) => [c.description, ...(c.tasks ?? [])].join(' ') },
];

/**
 * Search careers by name, keyword or related terms. Every word typed must
 * match the START of a word somewhere in the career ("sec" finds Security,
 * but "ml" does not match "html"). Empty query returns everything, in order.
 * @returns {{ career, score }[]}
 */
export function searchCareers(careers, query) {
  const tokens = words(query ?? '');
  if (!tokens.length) return careers.map((career) => ({ career, score: 0 }));

  const out = [];
  for (const career of careers) {
    const fieldWords = FIELDS.map((f) => words(f.get(career)));
    let score = 0;
    let all = true;
    for (const t of tokens) {
      let best = 0;
      FIELDS.forEach((f, i) => {
        if (fieldWords[i].some((w) => w.startsWith(t))) best = Math.max(best, f.weight);
      });
      if (!best) {
        all = false;
        break;
      }
      score += best;
    }
    if (all) out.push({ career, score });
  }
  return out;
}

/** The interest type a career scores highest on (ties go to the earlier type). */
export const primaryType = (career) =>
  DIMENSION_IDS.reduce((best, d) => (career.riasec[d] > career.riasec[best] ? d : best), DIMENSION_IDS[0]);

/**
 * Filters (all optional):
 *   domains: Set of domain ids (any)      types: Set of interest types (career's primary type, any)
 *   savedOnly + saved: Set of ids         minPercent + percentById: only careers at/above a match score
 */
export function filterCareers(items, { domains, types, savedOnly, saved, minPercent, percentById } = {}) {
  return items.filter(({ career }) => {
    if (domains?.size && !domains.has(career.domain)) return false;
    if (types?.size && !types.has(primaryType(career))) return false;
    if (savedOnly && !saved?.has(career.id)) return false;
    if (minPercent != null && (percentById?.[career.id] ?? -1) < minPercent) return false;
    return true;
  });
}

/** sort: 'relevance' (search score) | 'name' | 'match' (needs percentById) */
export function sortCareers(items, sort = 'relevance', percentById = {}) {
  const byName = (a, b) => a.career.title.localeCompare(b.career.title);
  const copy = [...items];
  if (sort === 'name') return copy.sort(byName);
  if (sort === 'match') return copy.sort((a, b) => (percentById[b.career.id] ?? -1) - (percentById[a.career.id] ?? -1) || byName(a, b));
  return copy.sort((a, b) => b.score - a.score || 0);
}

const joinNames = (names) => (names.length <= 1 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

/**
 * Surprise Me: a career the student is less likely to know about, tied to what
 * they already like. Candidates exclude `excluded` ids (liked careers, top
 * matches, anything already tried). With liked careers, careers from OTHER domains
 * whose interest profile is similar are preferred; with none, any candidate is picked.
 *
 * @param {object[]} careers
 * @param {{ liked?: string[], excluded?: Set<string>, rng?: () => number }} opts
 * @returns {{ career, reason, shared: string[], basedOn: object|null } | null}
 */
export function surprise(careers, { liked = [], excluded = new Set(), rng = Math.random } = {}) {
  const likedCareers = careers.filter((c) => liked.includes(c.id));
  const skip = new Set([...excluded, ...liked]);
  const pool = careers.filter((c) => !skip.has(c.id));
  if (!pool.length) return null;
  const pick = (list) => list[Math.min(list.length - 1, Math.floor(rng() * list.length))];
  const domainName = (c) => DOMAIN_BY_ID[c.domain]?.label ?? 'another domain';

  if (!likedCareers.length) {
    const career = pick(pool);
    return { career, reason: `A pick from ${domainName(career)}: have a look and see if it sparks anything.`, shared: [], basedOn: null };
  }

  const likedDomains = new Set(likedCareers.map((c) => c.domain));
  const scored = pool.map((c) => {
    let best = { sim: -Infinity, from: null };
    for (const l of likedCareers) {
      const sim = cosine(centre(c.riasec), centre(l.riasec));
      if (sim > best.sim) best = { sim, from: l };
    }
    return { career: c, ...best };
  });
  const fresh = scored.filter((s) => !likedDomains.has(s.career.domain)).sort((a, b) => b.sim - a.sim);
  const ranked = (fresh.length ? fresh : [...scored].sort((a, b) => b.sim - a.sim)).slice(0, 4);
  const chosen = pick(ranked);

  // interest types both careers score high on
  const shared = DIMENSION_IDS
    .filter((d) => chosen.career.riasec[d] >= 4.5 && chosen.from.riasec[d] >= 4.5)
    .sort((a, b) => Math.min(chosen.career.riasec[b], chosen.from.riasec[b]) - Math.min(chosen.career.riasec[a], chosen.from.riasec[a]))
    .slice(0, 2);
  const reason = shared.length
    ? `Like ${chosen.from.title}, it scores high on ${joinNames(shared.map((d) => DIMENSION_BY_ID[d].label))} interests, but it lives in ${domainName(chosen.career)}, so it may be less familiar.`
    : `Related to ${chosen.from.title}, but from ${domainName(chosen.career)}, so it may be less familiar.`;
  return { career: chosen.career, reason, shared, basedOn: chosen.from };
}
