import { describe, it, expect } from 'vitest';
import careers from '../data/careers.json';
import quiz from '../data/quiz.json';
import { PERSONAS } from '../engine/fixtures.js';
import { GOAL_MAX, appReducer, effectiveProfile, hasProfile, initialAppState, sanitizeAppState } from './appState.js';

const env = { quiz, careers };
const run = (state, action) => appReducer(state, action, env);
const withAnswers = (i) => ({ ...initialAppState(), quiz: { answers: PERSONAS[i].answers, step: 0, status: 'complete' } });

describe('appReducer', () => {
  it('toggles saved careers, ignoring unknown ids', () => {
    let s = run(initialAppState(), { type: 'saved/toggle', id: 'data-analyst' });
    expect(s.saved).toEqual(['data-analyst']);
    s = run(s, { type: 'saved/toggle', id: 'nope' });
    expect(s.saved).toEqual(['data-analyst']);
    s = run(s, { type: 'saved/toggle', id: 'data-analyst' });
    expect(s.saved).toEqual([]);
  });
  it('limits the goal note', () => {
    const s = run(initialAppState(), { type: 'goal/set', goal: 'x'.repeat(GOAL_MAX + 50) });
    expect(s.goal).toHaveLength(GOAL_MAX);
  });
  it('first DNA edit starts from the quiz result, then changes one dimension', () => {
    const s0 = withAnswers(0);
    const s = run(s0, { type: 'dna/set', dim: 'design', value: 0.9 });
    const base = effectiveProfile(s0, quiz).display;
    expect(s.dna.design).toBe(0.9);
    expect(s.dna.security).toBeCloseTo(base.security);
  });
  it('DNA can be built from scratch with no quiz, and reset', () => {
    let s = run(initialAppState(), { type: 'dna/set', dim: 'game', value: 1 });
    s = run(s, { type: 'dna/set', dim: 'play', value: 1 });
    expect(hasProfile(s, quiz)).toBe(true);
    s = run(s, { type: 'dna/reset' });
    expect(s.dna).toBeNull();
    expect(hasProfile(s, quiz)).toBe(false);
  });
  it('clamps DNA values', () => {
    expect(run(initialAppState(), { type: 'dna/set', dim: 'build', value: 7 }).dna.build).toBe(1);
    expect(run(initialAppState(), { type: 'dna/set', dim: 'build', value: -7 }).dna.build).toBe(0);
  });
  it('changing a quiz answer drops hand edits; navigating does not', () => {
    let s = run(withAnswers(0), { type: 'dna/set', dim: 'design', value: 0.9 });
    s = run(s, { type: 'quiz', action: { type: 'next' } });
    expect(s.dna).not.toBeNull();
    const q = quiz.questions[0];
    s = run(s, { type: 'quiz', action: { type: 'answer', question: q, optionId: 'game' } });
    expect(s.dna).toBeNull();
  });
  it('retake snapshots matches, clears answers and DNA, keeps saved careers and goal', () => {
    let s = { ...withAnswers(0), saved: ['data-analyst'], goal: 'be a pentester' };
    s = run(s, { type: 'dna/set', dim: 'design', value: 0.1 });
    s = run(s, { type: 'retake' });
    expect(s.quiz.answers).toEqual({});
    expect(s.dna).toBeNull();
    expect(s.saved).toEqual(['data-analyst']);
    expect(s.goal).toBe('be a pentester');
    expect(s.previous.matches.length).toBeGreaterThan(0);
  });
  it('retaking with no results keeps an older snapshot instead of erasing it', () => {
    const prev = { matches: [{ id: 'data-analyst', percent: 80, rank: 1 }] };
    const s = run({ ...initialAppState(), previous: prev }, { type: 'retake' });
    expect(s.previous).toEqual(prev);
  });
  it('wipe deletes everything', () => {
    const s = run({ ...withAnswers(0), saved: ['data-analyst'], goal: 'x', previous: { matches: [] } }, { type: 'wipe' });
    expect(s).toEqual(initialAppState());
  });
});

describe('sanitizeAppState', () => {
  it('survives garbage', () => {
    for (const bad of [null, undefined, 'x', 3, [], { quiz: 5, dna: 'x', saved: 'x', goal: 4, previous: 'x' }]) {
      const s = sanitizeAppState(bad, env);
      expect(s).toEqual(initialAppState());
    }
  });
  it('round-trips valid state', () => {
    const s0 = { ...withAnswers(1), saved: ['data-analyst'], goal: 'data', dna: null, previous: { matches: [{ id: 'data-analyst', percent: 80, rank: 1 }] } };
    expect(sanitizeAppState(s0, env)).toEqual(s0);
  });
  it('drops unknown saved ids, duplicates and unknown previous careers', () => {
    const s = sanitizeAppState({ saved: ['data-analyst', 'data-analyst', 'gone', 5], previous: { matches: [{ id: 'gone', percent: 80, rank: 1 }, { id: 'data-analyst', percent: 70, rank: 2 }] } }, env);
    expect(s.saved).toEqual(['data-analyst']);
    expect(s.previous.matches.map((m) => m.id)).toEqual(['data-analyst']);
  });
  it('keeps old saves from earlier versions (quiz only) working', () => {
    const s = sanitizeAppState({ v: 1, quiz: { answers: PERSONAS[0].answers, step: 3, status: 'complete' } }, env);
    expect(s.quiz.status).toBe('complete');
    expect(s.saved).toEqual([]);
    expect(s.dna).toBeNull();
  });
});
