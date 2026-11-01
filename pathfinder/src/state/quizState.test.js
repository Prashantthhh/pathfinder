import { describe, it, expect } from 'vitest';
import quiz from '../data/quiz.json';
import { PERSONAS } from '../engine/fixtures.js';
import { TIERS, tierOf, groupByTier, MIN_MATCH_PERCENT } from '../engine/tiers.js';
import {
  applyAnswer, quizReducer, sanitizeQuizState, initialQuizState, allAnswered, answeredCount,
} from './quizState.js';

const q = (id) => quiz.questions.find((x) => x.id === id);
const reduce = (state, action) => quizReducer(state, action, quiz);

describe('applyAnswer', () => {
  it('single choice replaces the previous answer', () => {
    const a = applyAnswer({}, q('i-project'), 'tracker');
    const b = applyAnswer(a.answers, q('i-project'), 'vuln');
    expect(b.answers['i-project']).toEqual(['vuln']);
    expect(b.result).toBe('added');
  });
  it('clicking the already-chosen single option changes nothing', () => {
    const a = applyAnswer({}, q('i-project'), 'tracker');
    expect(applyAnswer(a.answers, q('i-project'), 'tracker').result).toBe('unchanged');
  });
  it('multi choice toggles on and off, and drops the key when empty', () => {
    const on = applyAnswer({}, q('i-saturday'), 'ctf');
    expect(on.answers['i-saturday']).toEqual(['ctf']);
    const off = applyAnswer(on.answers, q('i-saturday'), 'ctf');
    expect(off.result).toBe('removed');
    expect('i-saturday' in off.answers).toBe(false);
  });
  it('multi choice enforces its max and reports blocked', () => {
    let answers = {};
    for (const id of ['app', 'dataset', 'model']) answers = applyAnswer(answers, q('i-saturday'), id).answers;
    const fourth = applyAnswer(answers, q('i-saturday'), 'sketch');
    expect(fourth.result).toBe('blocked');
    expect(fourth.answers['i-saturday']).toHaveLength(3);
  });
  it('"None of these yet" is exclusive in both directions', () => {
    let a = applyAnswer({}, q('s-done'), 'code').answers;
    a = applyAnswer(a, q('s-done'), 'sql').answers;
    a = applyAnswer(a, q('s-done'), 'none').answers;
    expect(a['s-done']).toEqual(['none']);
    a = applyAnswer(a, q('s-done'), 'code').answers;
    expect(a['s-done']).toEqual(['code']);
  });
  it('ignores unknown options', () => {
    expect(applyAnswer({}, q('i-project'), 'nope').result).toBe('unchanged');
  });
});

describe('quizReducer', () => {
  it('moves forward and back within bounds', () => {
    let s = initialQuizState();
    s = reduce(s, { type: 'back' });
    expect(s.step).toBe(0);
    s = reduce(s, { type: 'next' });
    expect(s.step).toBe(1);
    for (let i = 0; i < 50; i++) s = reduce(s, { type: 'next' });
    expect(s.step).toBe(quiz.questions.length - 1);
  });
  it('keeps answers when going back', () => {
    let s = reduce(initialQuizState(), { type: 'answer', question: q('i-saturday'), optionId: 'ctf' });
    s = reduce(s, { type: 'next' });
    s = reduce(s, { type: 'back' });
    expect(s.answers['i-saturday']).toEqual(['ctf']);
  });
  it('cannot finish until every question is answered', () => {
    expect(reduce(initialQuizState(), { type: 'finish' }).status).toBe('in-progress');
    const full = { ...initialQuizState(), answers: PERSONAS[0].answers };
    expect(allAnswered(quiz, full.answers)).toBe(true);
    expect(reduce(full, { type: 'finish' }).status).toBe('complete');
  });
  it('restart clears everything', () => {
    const s = reduce({ ...initialQuizState(), answers: PERSONAS[0].answers, step: 5 }, { type: 'restart' });
    expect(s).toEqual(initialQuizState());
  });
});

describe('every sample student answers every question', () => {
  it('is complete', () => {
    for (const p of PERSONAS) expect(answeredCount(quiz, p.answers), p.id).toBe(quiz.questions.length);
  });
});

describe('sanitizeQuizState', () => {
  it('round-trips a valid save', () => {
    const saved = { answers: PERSONAS[0].answers, step: 4, status: 'complete' };
    expect(sanitizeQuizState(saved, quiz)).toEqual(saved);
  });
  it('survives garbage', () => {
    for (const bad of [null, undefined, 'x', 42, [], { answers: 'no' }, { answers: { 'i-project': 'tracker' }, step: 'a' }]) {
      const s = sanitizeQuizState(bad, quiz);
      expect(s.step).toBe(0);
      expect(typeof s.answers).toBe('object');
    }
  });
  it('drops unknown questions and options, and clamps the step', () => {
    const s = sanitizeQuizState({ answers: { gone: ['x'], 'i-project': ['tracker', 'ghost'] }, step: 999, status: 'complete' }, quiz);
    expect(s.answers).toEqual({ 'i-project': ['tracker'] });
    expect(s.step).toBe(quiz.questions.length - 1);
    expect(s.status).toBe('in-progress'); // not all answered, so cannot be complete
  });
  it('enforces single-choice and max limits from the saved data', () => {
    const s = sanitizeQuizState({ answers: { 'i-project': ['tracker', 'vuln'], 'i-saturday': ['app', 'dataset', 'model', 'game'] } }, quiz);
    expect(s.answers['i-project']).toHaveLength(1);
    expect(s.answers['i-saturday']).toHaveLength(3);
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
    expect(groupByTier([{ percent: 90 }]).map((g) => g.tier.id)).toEqual(['strong']);
    expect(groupByTier([{ percent: 49 }])).toEqual([]);
    expect(TIERS[TIERS.length - 1].min).toBe(MIN_MATCH_PERCENT);
  });
});
