// All persisted app state in one pure module: quiz progress, hand-edited
// Career DNA, saved careers, a career-goal note, and a snapshot of the previous
// run (so a retake can show how matches moved). No React, no storage.

import { DIMENSION_IDS } from '../data/dimensions.js';
import { buildProfile } from '../engine/vector.js';
import { recommend } from '../engine/recommend.js';
import { profileFromDna, sanitizeDna } from '../engine/dna.js';
import { sanitizeSnapshot, snapshotMatches } from '../engine/compare.js';
import { LEVELS, allItemKeys, sanitizeRatings } from '../engine/skillGap.js';
import { roadmapFor, sanitizeRoadmap } from '../engine/roadmap.js';
import { MAX_COMPARE } from '../engine/sideBySide.js';
import { initialQuizState, quizReducer, sanitizeQuizState } from './quizState.js';

export const GOAL_MAX = 300;

export const initialAppState = () => ({ quiz: initialQuizState(), dna: null, saved: [], goal: '', previous: null, skills: {}, roadmap: {}, compare: [] });

/** The profile the engine should use: hand-edited DNA if there is any, else the quiz result. */
export function effectiveProfile(state, quizData) {
  const base = buildProfile(state.quiz.answers, quizData);
  return state.dna ? profileFromDna(state.dna, base) : base;
}

export function appReducer(state, action, env) {
  const { quiz, careers } = env;
  switch (action.type) {
    case 'quiz': {
      const inner = action.action;
      const quizState = quizReducer(state.quiz, inner, quiz);
      // Changing an answer starts a new profile, so hand edits no longer apply.
      const dna = inner.type === 'answer' ? null : state.dna;
      return { ...state, quiz: quizState, dna };
    }
    case 'replace':
      return action.state;

    case 'dna/set': {
      const current = state.dna ?? effectiveProfile(state, quiz).display;
      const value = Math.min(1, Math.max(0, Number(action.value) || 0));
      return { ...state, dna: { ...current, [action.dim]: value } };
    }
    case 'dna/reset':
      return { ...state, dna: null };

    case 'saved/toggle': {
      if (!careers.some((c) => c.id === action.id)) return state;
      const has = state.saved.includes(action.id);
      return { ...state, saved: has ? state.saved.filter((id) => id !== action.id) : [...state.saved, action.id] };
    }
    // The student's own rating of a skill or knowledge area, by key (null clears it). Never set from anything else.
    case 'skill/set': {
      if (action.level !== null && !LEVELS.includes(action.level)) return state;
      if (!allItemKeys(careers).includes(action.skill)) return state;
      const skills = { ...state.skills };
      if (action.level === null) delete skills[action.skill];
      else skills[action.skill] = action.level;
      return { ...state, skills };
    }
    case 'roadmap/toggle': {
      const career = careers.find((c) => c.id === action.career);
      if (!career || !roadmapFor(career).some((s) => s.id === action.stage)) return state;
      const cur = state.roadmap[career.id] ?? [];
      const next = cur.includes(action.stage) ? cur.filter((s) => s !== action.stage) : [...cur, action.stage];
      const roadmap = { ...state.roadmap };
      if (next.length) roadmap[career.id] = next;
      else delete roadmap[career.id];
      return { ...state, roadmap };
    }
    case 'compare/toggle': {
      if (!careers.some((c) => c.id === action.id)) return state;
      if (state.compare.includes(action.id)) return { ...state, compare: state.compare.filter((id) => id !== action.id) };
      if (state.compare.length >= MAX_COMPARE) return state;
      return { ...state, compare: [...state.compare, action.id] };
    }
    case 'compare/clear':
      return { ...state, compare: [] };
    case 'goal/set':
      return { ...state, goal: String(action.goal ?? '').slice(0, GOAL_MAX) };

    // Retake: remember what the matches were, then clear answers and DNA edits.
    // Saved careers and the goal note are kept.
    case 'retake': {
      const before = recommend(effectiveProfile(state, quiz), careers);
      const previous = before.matches.length ? snapshotMatches(before.matches) : state.previous;
      return { ...state, quiz: initialQuizState(), dna: null, previous };
    }
    // Delete everything.
    case 'wipe':
      return initialAppState();
    default:
      return state;
  }
}

/** Validate whatever was in storage. Unknown or malformed parts are dropped. */
export function sanitizeAppState(saved, { quiz, careers }) {
  const base = initialAppState();
  if (!saved || typeof saved !== 'object') return base;
  const ids = new Set(careers.map((c) => c.id));
  return {
    quiz: sanitizeQuizState(saved.quiz, quiz),
    dna: sanitizeDna(saved.dna),
    saved: Array.isArray(saved.saved) ? [...new Set(saved.saved.filter((id) => typeof id === 'string' && ids.has(id)))] : [],
    skills: sanitizeRatings(saved.skills, careers),
    roadmap: sanitizeRoadmap(saved.roadmap, careers),
    compare: Array.isArray(saved.compare) ? [...new Set(saved.compare.filter((id) => typeof id === 'string' && ids.has(id)))].slice(0, MAX_COMPARE) : [],
    goal: typeof saved.goal === 'string' ? saved.goal.slice(0, GOAL_MAX) : '',
    previous: (() => {
      const p = sanitizeSnapshot(saved.previous);
      return p ? { matches: p.matches.filter((m) => ids.has(m.id)) } : null;
    })(),
  };
}

export const hasProfile = (state, quizData) => {
  const p = effectiveProfile(state, quizData);
  return Math.max(0, ...DIMENSION_IDS.map((d) => p.vector[d])) > 0;
};
