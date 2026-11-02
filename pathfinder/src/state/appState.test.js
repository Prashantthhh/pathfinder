import { describe, it, expect } from 'vitest';
import careers from '../data/careers.json';
import quiz from '../data/quiz.json';
import { PERSONAS } from '../engine/fixtures.js';
import { GOAL_MAX, appReducer, effectiveProfile, hasProfile, initialAppState, sanitizeAppState } from './appState.js';

const env = { quiz, careers };
const run = (state, action) => appReducer(state, action, env);
const answersOf = (id) => PERSONAS.find((p) => p.id === id).answers;
const withAnswers = (id) => ({ ...initialAppState(), quiz: { answers: answersOf(id), step: 0, status: 'complete' } });

describe('appReducer', () => {
  it('toggles saved careers, ignoring unknown ids', () => {
    let s = run(initialAppState(), { type: 'saved/toggle', id: 'chef' });
    expect(s.saved).toEqual(['chef']);
    s = run(s, { type: 'saved/toggle', id: 'nope' });
    expect(s.saved).toEqual(['chef']);
    s = run(s, { type: 'saved/toggle', id: 'chef' });
    expect(s.saved).toEqual([]);
  });
  it('limits the goal note', () => {
    const s = run(initialAppState(), { type: 'goal/set', goal: 'x'.repeat(GOAL_MAX + 50) });
    expect(s.goal).toHaveLength(GOAL_MAX);
  });
  it('first DNA edit starts from the quiz result, then changes one interest type', () => {
    const s0 = withAnswers('commerce');
    const s = run(s0, { type: 'dna/set', dim: 'A', value: 0.9 });
    const base = effectiveProfile(s0, quiz).display;
    expect(s.dna.A).toBe(0.9);
    expect(s.dna.C).toBeCloseTo(base.C);
  });
  it('DNA can be built from scratch with no quiz, and reset', () => {
    let s = run(initialAppState(), { type: 'dna/set', dim: 'R', value: 1 });
    s = run(s, { type: 'dna/set', dim: 'I', value: 0.4 });
    expect(hasProfile(s, quiz)).toBe(true);
    s = run(s, { type: 'dna/reset' });
    expect(s.dna).toBeNull();
    expect(hasProfile(s, quiz)).toBe(false);
  });
  it('clamps DNA values', () => {
    expect(run(initialAppState(), { type: 'dna/set', dim: 'R', value: 7 }).dna.R).toBe(1);
    expect(run(initialAppState(), { type: 'dna/set', dim: 'R', value: -7 }).dna.R).toBe(0);
  });
  it('changing a quiz answer drops hand edits; navigating does not', () => {
    let s = run(withAnswers('commerce'), { type: 'dna/set', dim: 'A', value: 0.9 });
    s = run(s, { type: 'quiz', action: { type: 'next' } });
    expect(s.dna).not.toBeNull();
    const q = quiz.questions.find((x) => x.id === 'q-act-1');
    s = run(s, { type: 'quiz', action: { type: 'answer', question: q, optionId: 'a1-R' } });
    expect(s.dna).toBeNull();
  });
  it('retake snapshots matches, clears answers and DNA, keeps saved careers and goal', () => {
    let s = { ...withAnswers('commerce'), saved: ['chef'], goal: 'be an accountant' };
    s = run(s, { type: 'dna/set', dim: 'A', value: 0.1 });
    s = run(s, { type: 'retake' });
    expect(s.quiz.answers).toEqual({});
    expect(s.dna).toBeNull();
    expect(s.saved).toEqual(['chef']);
    expect(s.goal).toBe('be an accountant');
    expect(s.previous.matches.length).toBeGreaterThan(0);
  });
  it('retaking with no results keeps an older snapshot instead of erasing it', () => {
    const prev = { matches: [{ id: 'chef', percent: 80, rank: 1 }] };
    const s = run({ ...initialAppState(), previous: prev }, { type: 'retake' });
    expect(s.previous).toEqual(prev);
  });
  it('wipe deletes everything', () => {
    const s = run({ ...withAnswers('commerce'), saved: ['chef'], goal: 'x', previous: { matches: [] } }, { type: 'wipe' });
    expect(s).toEqual(initialAppState());
  });
});

describe('effective profile', () => {
  it('follows hand-edited interests but keeps the quiz stream, study and settings', () => {
    const base = withAnswers('cse-graduate');
    const edited = run(base, { type: 'dna/set', dim: 'R', value: 1 });
    const p = effectiveProfile(edited, quiz);
    expect(p.edited).toBe(true);
    expect(p.context.stream).toBe('grad-eng');
    expect(p.settings.people).toBe(0.5);
  });
});

describe('sanitizeAppState', () => {
  it('survives garbage', () => {
    for (const bad of [null, undefined, 'x', 3, [], { quiz: 5, dna: 'x', saved: 'x', goal: 4, previous: 'x' }]) {
      expect(sanitizeAppState(bad, env)).toEqual(initialAppState());
    }
  });
  it('round-trips valid state', () => {
    const s0 = { ...withAnswers('arts'), saved: ['chef'], goal: 'design', dna: null, previous: { matches: [{ id: 'chef', percent: 80, rank: 1 }] } };
    expect(sanitizeAppState(s0, env)).toEqual(s0);
  });
  it('drops unknown saved ids, duplicates and unknown previous careers', () => {
    const s = sanitizeAppState({ saved: ['chef', 'chef', 'gone', 5], previous: { matches: [{ id: 'gone', percent: 80, rank: 1 }, { id: 'chef', percent: 70, rank: 2 }] } }, env);
    expect(s.saved).toEqual(['chef']);
    expect(s.previous.matches.map((m) => m.id)).toEqual(['chef']);
  });
  it('discards an older 8-dimension save instead of misreading it', () => {
    const s = sanitizeAppState({ v: 1, quiz: { answers: { 'i-saturday': ['ctf'] }, step: 3, status: 'complete' }, dna: { build: 1, data: 0.5, ai: 0, design: 0, security: 1, systems: 1, people: 0, play: 0 }, saved: ['security-analyst'] }, env);
    expect(s.quiz.answers).toEqual({});
    expect(s.quiz.status).toBe('in-progress');
    expect(s.saved).toEqual([]);
  });
});
