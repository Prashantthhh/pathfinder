// Pure quiz state: answers, current step, status. No React, no storage, so it
// can be unit-tested and so saved data can be validated before it is trusted.
//
// Some questions depend on an earlier answer (the graduate's field only applies if
// the student said they have a degree), so "the questions" always means the VISIBLE
// ones for the current answers. `step` indexes into that visible list.

import { visibleQuestions } from '../engine/vector.js';

/**
 * state = {
 *   answers: { [questionId]: string[] }   option ids in the order they were picked
 *   step:    number                       index of the question being shown (among visible ones)
 *   status:  'in-progress' | 'complete'
 * }
 */

export const initialQuizState = () => ({ answers: {}, step: 0, status: 'in-progress' });

export const isAnswered = (question, answers) => (answers[question.id]?.length ?? 0) > 0;

export const answeredCount = (quiz, answers) => visibleQuestions(quiz, answers).filter((q) => isAnswered(q, answers)).length;

export const allAnswered = (quiz, answers) => {
  const visible = visibleQuestions(quiz, answers);
  return visible.length > 0 && visible.every((q) => isAnswered(q, answers));
};

/** Drop answers to questions that no longer apply (e.g. the field after changing "graduate" to "PCM"). */
export function pruneHidden(quiz, answers) {
  const visible = new Set(visibleQuestions(quiz, answers).map((q) => q.id));
  return Object.fromEntries(Object.entries(answers).filter(([id]) => visible.has(id)));
}

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
  const lastOf = (answers) => Math.max(0, visibleQuestions(quiz, answers).length - 1);
  switch (action.type) {
    case 'answer': {
      const answers = pruneHidden(quiz, applyAnswer(state.answers, action.question, action.optionId).answers);
      return { ...state, answers, step: Math.min(state.step, lastOf(answers)) };
    }
    case 'next':
      return { ...state, step: Math.min(lastOf(state.answers), state.step + 1) };
    case 'back':
      return { ...state, step: Math.max(0, state.step - 1) };
    case 'goto':
      return { ...state, step: Math.min(lastOf(state.answers), Math.max(0, action.step)) };
    case 'finish':
      return allAnswered(quiz, state.answers) ? { ...state, status: 'complete' } : state;
    case 'reopen': // back into the quiz from results, keeping answers
      return { ...state, status: 'in-progress', step: Math.min(lastOf(state.answers), Math.max(0, action.step ?? 0)) };
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
  const pruned = pruneHidden(quiz, answers);

  const last = Math.max(0, visibleQuestions(quiz, pruned).length - 1);
  const step = Number.isInteger(saved.step) ? Math.min(last, Math.max(0, saved.step)) : 0;
  const status = saved.status === 'complete' && allAnswered(quiz, pruned) ? 'complete' : 'in-progress';
  return { answers: pruned, step, status };
}

export const hasProgress = (state) => Object.keys(state.answers).length > 0;
