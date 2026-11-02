import { DIMENSION_IDS } from '../data/dimensions.js';
import { SETTING_IDS } from '../data/settings.js';

// A student's profile has three parts:
//   riasec    six interest scores built from the interest and school-subject answers
//   settings  work-setting preferences (0-1) from the work-style answers
//   context   stream, study-length and earning answers. These never change the
//             score; they only decide how matches are grouped (Strong / Explore further).

export const zeroVector = () => Object.fromEntries(DIMENSION_IDS.map((d) => [d, 0]));

/** Questions that apply to this student (a question can depend on an earlier answer). */
export const visibleQuestions = (quiz, answers) =>
  quiz.questions.filter((q) => !q.showIf || answers?.[q.showIf.question]?.[0] === q.showIf.option);

/** Subtract the profile's own average so only the SHAPE of the interests is compared. */
export function centre(obj, ids = DIMENSION_IDS) {
  const vals = ids.map((d) => Number(obj?.[d]) || 0);
  const mean = vals.reduce((a, b) => a + b, 0) / vals.length;
  return Object.fromEntries(ids.map((d, i) => [d, vals[i] - mean]));
}

export const magnitude = (obj, ids = DIMENSION_IDS) => Math.hypot(...ids.map((d) => Number(obj?.[d]) || 0));

/** Scale so the strongest value is 1 (for charts and sliders; relative emphasis, not a score). */
export function relative(obj, ids = DIMENSION_IDS) {
  const top = Math.max(0, ...ids.map((d) => Number(obj?.[d]) || 0));
  return Object.fromEntries(ids.map((d) => [d, top ? (Number(obj?.[d]) || 0) / top : 0]));
}

/**
 * answers: { [questionId]: string[] }  (option ids; unknown ids are ignored)
 */
export function buildProfile(answers, quiz) {
  const riasec = zeroVector();
  const settings = {};
  const context = { stream: null, study: null, earn: null };
  const contributions = [];
  let answeredCount = 0;

  const questions = visibleQuestions(quiz, answers);
  let streamId = null;
  let fieldId = null;

  for (const q of questions) {
    const chosen = (answers?.[q.id] ?? [])
      .map((id) => q.options.find((o) => o.id === id))
      .filter(Boolean);
    if (chosen.length) answeredCount++;
    for (const opt of chosen) {
      if (q.kind === 'interest' || q.kind === 'subjects') {
        for (const [dim, w] of Object.entries(opt.w ?? {})) {
          if (!(dim in riasec)) continue;
          riasec[dim] += w;
          contributions.push({ questionId: q.id, optionId: opt.id, label: opt.label, prompt: q.prompt, section: q.section, kind: q.kind, dim, weight: w });
        }
      } else if (q.kind === 'setting') {
        for (const [k, v] of Object.entries(opt.s ?? {})) if (SETTING_IDS.includes(k)) settings[k] = v;
      } else if (q.kind === 'stream') streamId = opt.id;
      else if (q.kind === 'grad-field') fieldId = opt.id;
      else if (q.kind === 'study') context.study = opt.value;
      else if (q.kind === 'earn') context.earn = opt.value;
    }
  }
  if (streamId) context.stream = streamId === 'graduate' ? (fieldId ? `grad-${fieldId}` : 'grad-any') : streamId;

  return {
    riasec,
    vector: centre(riasec),
    display: relative(riasec),
    settings,
    context,
    contributions,
    answeredCount,
  };
}
