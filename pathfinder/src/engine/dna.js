import { DIMENSION_IDS } from '../data/dimensions.js';

// Career DNA is the student's 8-dimension profile. It can be edited by hand:
// edited values replace the quiz-derived vector, so recommendations follow.
//
// Values are RELATIVE emphasis (0..1, strongest dimension = 1 when it comes
// from the quiz). They are shown to people as words, never as a score, so
// "100%" is not misread as a level of skill.

export const LEVELS = [
  { max: 0.15, label: 'Barely' },
  { max: 0.4, label: 'A little' },
  { max: 0.65, label: 'Some' },
  { max: 0.85, label: 'A lot' },
  { max: Infinity, label: 'Strongest' },
];

export const levelOf = (v) => LEVELS.find((l) => (Number(v) || 0) <= l.max).label;

const clamp01 = (v) => Math.min(1, Math.max(0, Number(v) || 0));

/** Validate saved DNA: known dimensions only, clamped, or null if nothing usable. */
export function sanitizeDna(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const out = {};
  for (const d of DIMENSION_IDS) out[d] = clamp01(raw[d]);
  return out;
}

/**
 * Profile the engine should use when DNA has been edited. Keeps the quiz
 * answers' contributions so "why this match" can still cite them.
 */
export function profileFromDna(values, quizProfile) {
  const vector = Object.fromEntries(DIMENSION_IDS.map((d) => [d, clamp01(values[d])]));
  const top = Math.max(0, ...Object.values(vector));
  const display = Object.fromEntries(DIMENSION_IDS.map((d) => [d, top ? vector[d] / top : 0]));
  return {
    vector,
    display,
    contributions: quizProfile?.contributions ?? [],
    answeredCount: quizProfile?.answeredCount ?? 0,
    edited: true,
  };
}
