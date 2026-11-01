// Pure quiz state: answers, current step, status. No React, no storage, so it
// can be unit-tested and so saved data can be validated before it is trusted.

/**
 * state = {
 *   answers: { [questionId]: string[] }   option ids in the order they were picked
 *   step:    number                       index of the question being shown
 *   status:  'in-progress' | 'complete'
 * }
 */

export const initialQuizState = () => ({ answers: {}, step: 0, status: 'in-progress' });

export const isAnswered = (question, answers) => (answers[question.id]?.length ?? 0) > 0;

export const answeredCount = (quiz, answers) => quiz.questions.filter((q) => isAnswered(q, answers)).length;

export const allAnswered = (quiz, answers) => answeredCount(quiz, answers) === quiz.questions.length;

/**
 * Apply a click on an option.
 * @returns {{ answers, result: 'added' | 'removed' | 'blocked' | 'unchanged' }}
 *   `blocked` means a multi-select is at its limit, so nothing changed.
 */
export function applyAnswer(answers, question, optionId) {
  const option = question.options.find((o) => o.id === optionId);
  if (!option) return { answers, result: 'unchanged' };
  const current = answers[question.id] ?? [];

  if (question.type !== 'multi') {
    if (current.length === 1 && current[0] === optionId) return { answers, result: 'unchanged' };
    return { answers: { ...answers, [question.id]: [optionId] }, result: 'added' };
  }

  if (current.includes(optionId)) {
    const next = current.filter((id) => id !== optionId);
    const rest = { ...answers };
    if (next.length) rest[question.id] = next;
    else delete rest[question.id];
    return { answers: rest, result: 'removed' };
  }

  if (option.exclusive) return { answers: { ...answers, [question.id]: [optionId] }, result: 'added' };

  const withoutExclusive = current.filter((id) => !question.options.find((o) => o.id === id)?.exclusive);
  if (question.max && withoutExclusive.length >= question.max) return { answers, result: 'blocked' };
  return { answers: { ...answers, [question.id]: [...withoutExclusive, optionId] }, result: 'added' };
}

export function quizReducer(state, action, quiz) {
  const last = quiz.questions.length - 1;
  switch (action.type) {
    case 'answer':
      return { ...state, answers: applyAnswer(state.answers, action.question, action.optionId).answers };
    case 'next':
      return { ...state, step: Math.min(last, state.step + 1) };
    case 'back':
      return { ...state, step: Math.max(0, state.step - 1) };
    case 'goto':
      return { ...state, step: Math.min(last, Math.max(0, action.step)) };
    case 'finish':
      return allAnswered(quiz, state.answers) ? { ...state, status: 'complete' } : state;
    case 'reopen': // back into the quiz from results, keeping answers
      return { ...state, status: 'in-progress', step: Math.min(last, Math.max(0, action.step ?? 0)) };
    case 'replace': // state changed in another tab
      return action.state;
    case 'restart':
      return initialQuizState();
    default:
      return state;
  }
}

/**
 * Validate a saved quiz state against the current quiz definition. Anything
 * unknown (removed questions or options, bad types, out-of-range step) is
 * dropped rather than trusted, so an old or hand-edited save cannot crash the app.
 */
export function sanitizeQuizState(saved, quiz) {
  const base = initialQuizState();
  if (!saved || typeof saved !== 'object') return base;

  const answers = {};
  for (const q of quiz.questions) {
    const raw = saved.answers?.[q.id];
    if (!Array.isArray(raw)) continue;
    const valid = [...new Set(raw)].filter((id) => q.options.some((o) => o.id === id));
    const limited = q.type === 'multi' ? valid.slice(0, q.max ?? valid.length) : valid.slice(0, 1);
    if (limited.length) answers[q.id] = limited;
  }

  const last = quiz.questions.length - 1;
  const step = Number.isInteger(saved.step) ? Math.min(last, Math.max(0, saved.step)) : 0;
  const status = saved.status === 'complete' && allAnswered(quiz, answers) ? 'complete' : 'in-progress';
  return { answers, step, status };
}

export const hasProgress = (state) => Object.keys(state.answers).length > 0;
