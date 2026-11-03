import { describe, expect, it } from 'vitest';
import careers from '../data/careers.json';
import quiz from '../data/quiz.json';
import registry from '../data/indiaRegistry.json';
import { appReducer, initialAppState, sanitizeAppState } from '../state/appState.js';
import { allSkillNames, skillGap, sanitizeRatings } from './skillGap.js';
import { progress, resolveStage, roadmapFor, sanitizeRoadmap } from './roadmap.js';
import { MAX_COMPARE, NOT_AVAILABLE, sideBySide } from './sideBySide.js';
import { nextStep } from './nextStep.js';
import { buildProfile } from './vector.js';
import { PERSONAS } from './fixtures.js';

const byId = (id) => careers.find((c) => c.id === id);
const env = { quiz, careers };
const act = (state, action) => appReducer(state, action, env);

describe('skill gap', () => {
  it('uses the career\'s own O*NET skills and the student\'s own ratings only', () => {
    const g = skillGap(byId('doctor'), { 'Critical Thinking': 'confident', Writing: 'none' });
    expect(g.rows.map((r) => r.skill)).toEqual(byId('doctor').skills);
    expect(g.confident).toBe(1);
    expect(g.none).toBe(1);
    expect(g.unrated).toBe(3);
  });
  it('nothing is rated from interest answers: a student with a full quiz still has every skill unrated', () => {
    const answers = PERSONAS.find((p) => p.id === 'cse-graduate').answers;
    expect(buildProfile(answers, quiz).riasec.I).toBeGreaterThan(0);
    const g = skillGap(byId('software-developer'), {});
    expect(g.unrated).toBe(g.total);
    expect(g.rows.every((r) => r.level === null)).toBe(true);
  });
  it('gaps are everything not confident: "not yet" first, then unrated, then learning', () => {
    const c = byId('doctor');
    const [a, b, d, e] = c.skills;
    const g = skillGap(c, { [a]: 'learning', [b]: 'none', [d]: 'confident' });
    expect(g.gaps.map((r) => r.level)).toEqual(['none', null, null, 'learning']);
    expect(g.gaps.some((r) => r.skill === d)).toBe(false);
    expect(e).toBeTruthy();
  });
  it('the reducer accepts only known skills and levels, and null clears', () => {
    let s = initialAppState();
    s = act(s, { type: 'skill/set', skill: 'Writing', level: 'learning' });
    expect(s.skills).toEqual({ Writing: 'learning' });
    expect(act(s, { type: 'skill/set', skill: 'Telepathy', level: 'confident' })).toBe(s);
    expect(act(s, { type: 'skill/set', skill: 'Writing', level: 'expert' })).toBe(s);
    expect(act(s, { type: 'skill/set', skill: 'Writing', level: null }).skills).toEqual({});
  });
  it('saved ratings are sanitised', () => {
    expect(sanitizeRatings({ Writing: 'confident', Telepathy: 'confident', Speaking: 'guru' }, careers)).toEqual({ Writing: 'confident' });
    expect(sanitizeRatings([1], careers)).toEqual({});
    expect(allSkillNames(careers).length).toBeGreaterThan(5);
  });
});

describe('roadmap', () => {
  it('Doctor follows the India route: Class 12 PCB, NEET UG, MBBS, internship, NMC registration', () => {
    const stages = roadmapFor(byId('doctor')).map(resolveStage);
    expect(stages.map((s) => s.id)).toEqual(['class12', 'entrance', 'mbbs', 'internship', 'registration']);
    expect(stages[1].exam).toBe('neet-ug');
    expect(stages[4].body).toBe('nmc');
  });
  it('every career has a roadmap that is specific to it, with unique stage ids', () => {
    for (const c of careers) {
      const stages = roadmapFor(c);
      expect(stages.length, c.id).toBeGreaterThanOrEqual(3);
      expect(new Set(stages.map((s) => s.id)).size, c.id).toBe(stages.length);
    }
    expect(roadmapFor(byId('animator')).map((s) => s.id)).not.toEqual(roadmapFor(byId('electrician')).map((s) => s.id));
  });
  it('generated stages come from the career\'s own route data', () => {
    const ids = roadmapFor(byId('electrician')).map((s) => s.id);
    expect(ids).toContain('exam-aitt');
    expect(ids).toContain('body-dgt');
    expect(roadmapFor(byId('animator')).some((s) => s.exam || s.body)).toBe(false);
  });
  it('stages only reference exams and bodies that exist in the registry, and never claim anything is free', () => {
    for (const c of careers) {
      for (const s of roadmapFor(c)) {
        if (s.exam) expect(registry.exams[s.exam], `${c.id} ${s.id}`).toBeTruthy();
        if (s.body) expect(registry.bodies[s.body], `${c.id} ${s.id}`).toBeTruthy();
        expect(JSON.stringify(s), `${c.id} ${s.id}`).not.toMatch(/\bfree\b|https?:/i);
      }
    }
  });
  it('a stage resource has a link only when its name is verified', () => {
    for (const c of careers) {
      for (const s of roadmapFor(c).map(resolveStage)) {
        for (const ref of [s.examRef, s.bodyRef]) if (ref) expect(Boolean(ref.url), `${c.id} ${s.id}`).toBe(ref.verified);
      }
    }
  });
  it('progress counts ticked stages and names the next one', () => {
    const c = byId('doctor');
    expect(progress(c, [])).toMatchObject({ done: 0, total: 5, next: { id: 'class12' } });
    expect(progress(c, ['class12', 'entrance'])).toMatchObject({ done: 2, next: { id: 'mbbs' } });
    expect(progress(c, ['class12', 'entrance', 'mbbs', 'internship', 'registration']).next).toBeNull();
  });
  it('the reducer toggles stages, rejects unknown ones and saved progress is sanitised', () => {
    let s = initialAppState();
    s = act(s, { type: 'roadmap/toggle', career: 'doctor', stage: 'class12' });
    s = act(s, { type: 'roadmap/toggle', career: 'doctor', stage: 'entrance' });
    expect(s.roadmap).toEqual({ doctor: ['class12', 'entrance'] });
    expect(act(s, { type: 'roadmap/toggle', career: 'doctor', stage: 'nope' })).toBe(s);
    expect(act(s, { type: 'roadmap/toggle', career: 'ghost', stage: 'x' })).toBe(s);
    s = act(act(s, { type: 'roadmap/toggle', career: 'doctor', stage: 'class12' }), { type: 'roadmap/toggle', career: 'doctor', stage: 'entrance' });
    expect(s.roadmap).toEqual({});
    expect(sanitizeRoadmap({ doctor: ['class12', 'nope', 'class12'], ghost: ['a'], lawyer: 'x' }, careers)).toEqual({ doctor: ['class12'] });
  });
});

describe('comparison', () => {
  const trio = ['doctor', 'animator', 'civil-servant'].map(byId);
  const sections = sideBySide(trio, { percentById: { doctor: 87, animator: 40 } });
  const rows = sections.flatMap((s) => s.rows);
  it('has the same fields for every career and no empty cell', () => {
    for (const r of rows) {
      expect(r.cells).toHaveLength(trio.length);
      for (const c of r.cells) expect(typeof c.text === 'string' && c.text.length > 0, r.id).toBe(true);
    }
  });
  it('says "Not available" instead of leaving gaps: salary, outlook, and a match with no profile', () => {
    const get = (id) => rows.find((r) => r.id === id).cells.map((c) => c.text);
    expect(get('salary')).toEqual([NOT_AVAILABLE, NOT_AVAILABLE, NOT_AVAILABLE]);
    expect(get('outlook')).toEqual([NOT_AVAILABLE, NOT_AVAILABLE, NOT_AVAILABLE]);
    expect(get('match')).toEqual(['87% · Strong match', '40% · below the 50% match line', NOT_AVAILABLE]);
  });
  it('shows a body or exam name only if it is verified, else "Check with the official body"', () => {
    const exam = rows.find((r) => r.id === 'exam').cells.map((c) => c.text);
    expect(exam[0]).toBe('NEET UG');
    expect(exam[1]).toBe(NOT_AVAILABLE); // Animator has no exam on record
  });
  it('allows at most three careers in the state', () => {
    let s = initialAppState();
    for (const id of ['doctor', 'animator', 'chef', 'lawyer']) s = act(s, { type: 'compare/toggle', id });
    expect(s.compare).toHaveLength(MAX_COMPARE);
    expect(s.compare).not.toContain('lawyer');
    expect(act(s, { type: 'compare/toggle', id: 'doctor' }).compare).toEqual(['animator', 'chef']);
    expect(sanitizeAppState({ compare: ['doctor', 'doctor', 'ghost', 'chef', 'lawyer', 'animator'] }, env).compare).toEqual(['doctor', 'chef', 'lawyer']);
  });
});

describe('next step', () => {
  const base = { status: 'complete', answered: 16, insufficient: false, saved: [], careers, roadmap: {}, ratings: {}, topMatch: { id: 'doctor', title: 'Doctor (MBBS)' } };
  it('walks the student from quiz to save to roadmap to skills to explore', () => {
    expect(nextStep({ ...base, answered: 0 }).kind).toBe('quiz');
    expect(nextStep({ ...base, status: 'in-progress' }).title).toBe('Finish the quiz');
    expect(nextStep(base)).toMatchObject({ kind: 'save', to: '/careers/doctor' });
    expect(nextStep({ ...base, saved: ['doctor'] })).toMatchObject({ kind: 'roadmap', to: '/careers/doctor#roadmap' });
    const all = ['class12', 'entrance', 'mbbs', 'internship', 'registration'];
    expect(nextStep({ ...base, saved: ['doctor'], roadmap: { doctor: all } }).kind).toBe('skills');
    const rated = Object.fromEntries(byId('doctor').skills.map((s) => [s, 'learning']));
    expect(nextStep({ ...base, saved: ['doctor'], roadmap: { doctor: all }, ratings: rated }).kind).toBe('explore');
  });
  it('continues the career whose roadmap is already under way', () => {
    const n = nextStep({ ...base, saved: ['animator', 'doctor'], roadmap: { doctor: ['class12'] } });
    expect(n.to).toBe('/careers/doctor#roadmap');
    expect(n.text).toMatch(/entrance/i);
  });
});
