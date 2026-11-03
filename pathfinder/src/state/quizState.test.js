import { describe, it, expect } from 'vitest';
import quiz from '../data/quiz.json';
import { PERSONAS } from '../engine/fixtures.js';
import { visibleQuestions } from '../engine/vector.js';
import { TIERS, tierOf, groupByTier, MIN_MATCH_PERCENT } from '../engine/tiers.js';
import {
  applyAnswer, quizReducer, sanitizeQuizState, initialQuizState, allAnswered, answeredCount, pruneHidden,
} from './quizState.js';

const q = (id) => quiz.questions.find((x) => x.id === id);
const reduce = (state, action) => quizReducer(state, action, quiz);
const persona = (id) => PERSONAS.find((p) => p.id === id);

describe('applyAnswer', () => {
  it('single choice replaces the previous answer', () => {
    const a = applyAnswer({}, q('q-stream'), 'pcm');
    const b = applyAnswer(a.answers, q('q-stream'), 'commerce');
    expect(b.answers['q-stream']).toEqual(['commerce']);
    expect(b.result).toBe('added');
  });
  it('clicking the already-chosen single option changes nothing', () => {
    const a = applyAnswer({}, q('q-stream'), 'pcm');
    expect(applyAnswer(a.answers, q('q-stream'), 'pcm').result).toBe('unchanged');
  });
  it('multi choice toggles on and off, and drops the key when empty', () => {
    const on = applyAnswer({}, q('q-act-1'), 'a1-R');
    expect(on.answers['q-act-1']).toEqual(['a1-R']);
    const off = applyAnswer(on.answers, q('q-act-1'), 'a1-R');
    expect(off.result).toBe('removed');
    expect('q-act-1' in off.answers).toBe(false);
  });
  it('interest questions allow 2 picks and block a third; subjects allow 3', () => {
    let answers = {};
    for (const id of ['a1-R', 'a1-I']) answers = applyAnswer(answers, q('q-act-1'), id).answers;
    const third = applyAnswer(answers, q('q-act-1'), 'a1-A');
    expect(third.result).toBe('blocked');
    expect(third.answers['q-act-1']).toHaveLength(2);
    let subjects = {};
    for (const id of ['maths', 'physics', 'chemistry']) subjects = applyAnswer(subjects, q('q-subjects'), id).answers;
    expect(applyAnswer(subjects, q('q-subjects'), 'biology').result).toBe('blocked');
  });
  it('ignores unknown options', () => {
    expect(applyAnswer({}, q('q-stream'), 'nope').result).toBe('unchanged');
  });
});

describe('conditional question (graduate field)', () => {
  it('only appears for students who said they have a graduate degree', () => {
    expect(visibleQuestions(quiz, {}).map((x) => x.id)).not.toContain('q-field');
    expect(visibleQuestions(quiz, { 'q-stream': ['pcm'] }).map((x) => x.id)).not.toContain('q-field');
    const vis = visibleQuestions(quiz, { 'q-stream': ['graduate'] }).map((x) => x.id);
    expect(vis.slice(0, 2)).toEqual(['q-stream', 'q-field']);
  });
  it('changing "graduate" to another stream drops the field answer', () => {
    let s = reduce(initialQuizState(), { type: 'answer', question: q('q-stream'), optionId: 'graduate' });
    s = reduce(s, { type: 'answer', question: q('q-field'), optionId: 'eng' });
    expect(s.answers['q-field']).toEqual(['eng']);
    s = reduce(s, { type: 'answer', question: q('q-stream'), optionId: 'pcm' });
    expect('q-field' in s.answers).toBe(false);
  });
  it('a graduate must answer the field before the quiz can be finished', () => {
    const answers = { ...persona('cse-graduate').answers };
    expect(allAnswered(quiz, answers)).toBe(true);
    delete answers['q-field'];
    expect(allAnswered(quiz, answers)).toBe(false);
  });
  it('pruneHidden removes only the answers that no longer apply', () => {
    const pruned = pruneHidden(quiz, { 'q-stream': ['pcb'], 'q-field': ['law'], 'q-act-1': ['a1-I'] });
    expect(pruned).toEqual({ 'q-stream': ['pcb'], 'q-act-1': ['a1-I'] });
  });
});

describe('quizReducer', () => {
  it('moves forward and back within bounds (16 steps normally, 17 for a graduate)', () => {
    let s = reduce(initialQuizState(), { type: 'back' });
    expect(s.step).toBe(0);
    for (let i = 0; i < 50; i++) s = reduce(s, { type: 'next' });
    expect(s.step).toBe(15);
    let g = reduce(initialQuizState(), { type: 'answer', question: q('q-stream'), optionId: 'graduate' });
    for (let i = 0; i < 50; i++) g = reduce(g, { type: 'next' });
    expect(g.step).toBe(16);
  });
  it('keeps answers when going back', () => {
    let s = reduce(initialQuizState(), { type: 'answer', question: q('q-act-1'), optionId: 'a1-R' });
    s = reduce(s, { type: 'next' });
    s = reduce(s, { type: 'back' });
    expect(s.answers['q-act-1']).toEqual(['a1-R']);
  });
  it('cannot finish until every visible question is answered', () => {
    expect(reduce(initialQuizState(), { type: 'finish' }).status).toBe('in-progress');
    const full = { ...initialQuizState(), answers: persona('commerce').answers };
    expect(allAnswered(quiz, full.answers)).toBe(true);
    expect(reduce(full, { type: 'finish' }).status).toBe('complete');
  });
  it('restart clears everything', () => {
    const s = reduce({ ...initialQuizState(), answers: persona('commerce').answers, step: 5 }, { type: 'restart' });
    expect(s).toEqual(initialQuizState());
  });
});

describe('sample students', () => {
  it('each answers every question that applies to them', () => {
    for (const p of PERSONAS) {
      expect(allAnswered(quiz, p.answers), p.id).toBe(true);
      expect(answeredCount(quiz, p.answers), p.id).toBe(visibleQuestions(quiz, p.answers).length);
    }
  });
  it('and the five cover science PCB, commerce, arts, a CSE graduate and ITI', () => {
    expect(PERSONAS.map((p) => p.answers['q-stream'][0])).toEqual(['pcb', 'commerce', 'arts', 'graduate', 'arts', 'diploma']);
  });
});

describe('sanitizeQuizState', () => {
  it('round-trips a valid save', () => {
    const saved = { answers: persona('cse-graduate').answers, step: 4, status: 'complete' };
    expect(sanitizeQuizState(saved, quiz)).toEqual(saved);
  });
  it('survives garbage', () => {
    for (const bad of [null, undefined, 'x', 42, [], { answers: 'no' }, { answers: { 'q-stream': 'pcm' }, step: 'a' }]) {
      const s = sanitizeQuizState(bad, quiz);
      expect(s.step).toBe(0);
      expect(typeof s.answers).toBe('object');
    }
  });
  it('drops unknown questions and options, and clamps the step', () => {
    const s = sanitizeQuizState({ answers: { gone: ['x'], 'q-stream': ['pcm', 'ghost'] }, step: 999, status: 'complete' }, quiz);
    expect(s.answers).toEqual({ 'q-stream': ['pcm'] });
    expect(s.step).toBe(15);
    expect(s.status).toBe('in-progress');
  });
  it('enforces single-choice and max limits and drops answers to hidden questions', () => {
    const s = sanitizeQuizState({
      answers: { 'q-stream': ['pcm', 'pcb'], 'q-act-1': ['a1-R', 'a1-I', 'a1-A'], 'q-field': ['law'] },
    }, quiz);
    expect(s.answers['q-stream']).toHaveLength(1);
    expect(s.answers['q-act-1']).toHaveLength(2);
    expect('q-field' in s.answers).toBe(false);
  });
});

describe('tiers', () => {
  it('uses strong >= 80, worth exploring 65-79, partial overlap 50-64', () => {
    const cases = [[100, 'strong'], [80, 'strong'], [79, 'worth'], [65, 'worth'], [64, 'partial'], [50, 'partial']];
    for (const [pct, id] of cases) expect(tierOf(pct)?.id, String(pct)).toBe(id);
  });
  it('never gives a tier to anything below 50', () => {
    for (const pct of [49, 45, 10, 0]) expect(tierOf(pct), String(pct)).toBeNull();
  });
  it('groups in order, omits empty tiers and drops items below the floor', () => {
    const groups = groupByTier([{ percent: 94 }, { percent: 70 }, { percent: 55 }, { percent: 50 }, { percent: 49 }, { percent: 20 }]);
    expect(groups.map((g) => g.tier.id)).toEqual(['strong', 'worth', 'partial']);
    expect(groups[2].items).toHaveLength(2);
    expect(groupByTier([{ percent: 49 }])).toEqual([]);
    expect(TIERS[TIERS.length - 1].min).toBe(MIN_MATCH_PERCENT);
  });
});
