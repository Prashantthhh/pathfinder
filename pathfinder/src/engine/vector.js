import { DIMENSION_IDS } from '../data/dimensions.js';

// Interest and work-style answers describe what pulls the student in; skills
// answers describe what they can already do. They are scaled separately and
// blended so that a lack of experience never drowns out interest.
export const SECTION_WEIGHTS = { interest: 0.75, skills: 0.25 };

export const zeroVector = () => Object.fromEntries(DIMENSION_IDS.map((d) => [d, 0]));

const kindOf = (sectionId) => (sectionId === 'skills' ? 'skills' : 'interest');

/**
 * answers: { [questionId]: string[] }  (option ids; unknown ids are ignored)
 *
 * Returns
 *  - vector:  blended profile (what the engine compares)
 *  - display: same shape, scaled so the strongest dimension is 1 (for charts)
 *  - contributions: every (answer -> dimension) push with its weight, used to
 *    explain recommendations
 *  - answeredCount: number of questions with at least one valid option
 */
export function buildProfile(answers, quiz) {
  const raw = { interest: zeroVector(), skills: zeroVector() };
  const picks = [];
  let answeredCount = 0;

  for (const q of quiz.questions) {
    const chosen = (answers?.[q.id] ?? [])
      .map((id) => q.options.find((o) => o.id === id))
      .filter(Boolean);
    if (chosen.length) answeredCount++;
    const kind = kindOf(q.section);
    for (const opt of chosen) {
      for (const [dim, w] of Object.entries(opt.w)) {
        if (!(dim in raw[kind])) continue;
        raw[kind][dim] += w;
        picks.push({ questionId: q.id, optionId: opt.id, label: opt.label, prompt: q.prompt, section: q.section, kind, dim, raw: w });
      }
    }
  }

  const maxOf = (v) => Math.max(0, ...Object.values(v));
  const scale = {
    interest: maxOf(raw.interest) ? SECTION_WEIGHTS.interest / maxOf(raw.interest) : 0,
    skills: maxOf(raw.skills) ? SECTION_WEIGHTS.skills / maxOf(raw.skills) : 0,
  };

  const vector = zeroVector();
  for (const d of DIMENSION_IDS) vector[d] = raw.interest[d] * scale.interest + raw.skills[d] * scale.skills;

  const top = maxOf(vector);
  const display = zeroVector();
  for (const d of DIMENSION_IDS) display[d] = top ? vector[d] / top : 0;

  const contributions = picks.map((p) => ({ ...p, weight: p.raw * scale[p.kind] }));
  return { vector, display, contributions, answeredCount };
}
