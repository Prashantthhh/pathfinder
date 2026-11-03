// Skill gap: the items are the O*NET skills and knowledge areas a career needs MORE than the
// average career does (see scripts/build-careers.mjs); the LEVELS are the student's own
// rating. An item is never inferred from an interest answer, so until the student rates
// one it is "not rated yet", which is different from "none".

export const LEVELS = ['none', 'learning', 'confident'];
export const LEVEL_LABELS = { none: 'Not yet', learning: 'Learning', confident: 'Confident' };

/** Ratings are stored under the skill's name, or "knowledge:<name>" for a knowledge area (some names are both). */
export const itemKey = (kind, name) => (kind === 'knowledge' ? `knowledge:${name}` : name);

/** Every rateable key used by any career. */
export const allItemKeys = (careers) => [
  ...new Set(careers.flatMap((c) => [...c.skills.map((n) => itemKey('skill', n)), ...(c.knowledge ?? []).map((n) => itemKey('knowledge', n))])),
];

/** Keep only known items with a known level. */
export function sanitizeRatings(raw, careers) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const known = new Set(allItemKeys(careers));
  return Object.fromEntries(Object.entries(raw).filter(([k, v]) => known.has(k) && LEVELS.includes(v)));
}

/**
 * Rows for one career: [{ key, name, kind: 'skill' | 'knowledge', level }] (level null = not rated),
 * plus counts and the gaps (rated "none" first, then not rated yet, then "learning").
 */
export function skillGap(career, ratings) {
  const items = [
    ...career.skills.map((name) => ({ kind: 'skill', name })),
    ...(career.knowledge ?? []).map((name) => ({ kind: 'knowledge', name })),
  ];
  const rows = items.map((i) => ({ ...i, key: itemKey(i.kind, i.name), level: ratings?.[itemKey(i.kind, i.name)] ?? null }));
  const count = (l) => rows.filter((r) => r.level === l).length;
  const order = { none: 0, null: 1, learning: 2 };
  return {
    rows,
    confident: count('confident'),
    learning: count('learning'),
    none: count('none'),
    unrated: count(null),
    total: rows.length,
    gaps: rows.filter((r) => r.level !== 'confident').sort((a, b) => order[a.level] - order[b.level]),
  };
}
