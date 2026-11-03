// Skill gap: the skills are the career's O*NET skills; the LEVELS are the student's own
// rating. A skill is never inferred from an interest answer, so until the student rates
// one it is "not rated yet", which is different from "none".

export const LEVELS = ['none', 'learning', 'confident'];
export const LEVEL_LABELS = { none: 'Not yet', learning: 'Learning', confident: 'Confident' };

/** Every distinct O*NET skill name used by any career. */
export const allSkillNames = (careers) => [...new Set(careers.flatMap((c) => c.skills))];

/** Keep only known skills with a known level. */
export function sanitizeRatings(raw, careers) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const known = new Set(allSkillNames(careers));
  return Object.fromEntries(Object.entries(raw).filter(([k, v]) => known.has(k) && LEVELS.includes(v)));
}

/**
 * Rows for one career: [{ skill, level }] (level null = not rated), plus counts and the gaps
 * (skills rated "none" first, then not rated yet, then "learning").
 */
export function skillGap(career, ratings) {
  const rows = career.skills.map((skill) => ({ skill, level: ratings?.[skill] ?? null }));
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
