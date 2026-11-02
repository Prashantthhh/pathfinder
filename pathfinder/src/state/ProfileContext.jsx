import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import careers from '../data/careers.json';
import quiz from '../data/quiz.json';
import { recommend } from '../engine/recommend.js';
import { visibleQuestions } from '../engine/vector.js';
import { load, save, STORAGE_KEY } from './storage.js';
import { answeredCount, applyAnswer, hasProgress } from './quizState.js';
import { appReducer, effectiveProfile, sanitizeAppState } from './appState.js';

const ProfileContext = createContext(null);

const env = { quiz, careers };
const reducer = (state, action) => appReducer(state, action, env);

export function ProfileProvider({ children }) {
  const [state, dispatch] = useReducer(reducer, null, () => sanitizeAppState(load({}), env));
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    setStorageOk(save({ v: 1, ...state }));
  }, [state]);

  // Keep several open tabs in step instead of overwriting each other with stale state.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      dispatch({ type: 'replace', state: sanitizeAppState(load({}), env) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const { quiz: q, dna, saved, goal, previous } = state;
  const profile = useMemo(() => effectiveProfile(state, quiz), [state]);
  const result = useMemo(() => recommend(profile, careers), [profile]);
  const questions = useMemo(() => visibleQuestions(quiz, q.answers), [q.answers]);
  const percentById = useMemo(() => Object.fromEntries(result.ranked.map((r) => [r.career.id, r.percent])), [result]);

  const answerRef = useRef(q.answers);
  answerRef.current = q.answers;
  const answer = useCallback((question, optionId) => {
    const out = applyAnswer(answerRef.current, question, optionId);
    if (out.result === 'added' || out.result === 'removed') dispatch({ type: 'quiz', action: { type: 'answer', question, optionId } });
    return out.result;
  }, []);

  const value = useMemo(() => ({
    quiz,
    careers,
    // quiz progress
    ...q,
    answered: answeredCount(quiz, q.answers),
    questions,
    total: questions.length,
    started: hasProgress(q),
    // profile + recommendations (follow hand edits when there are any)
    profile,
    result,
    percentById,
    dna,
    edited: Boolean(dna),
    saved,
    goal,
    previous,
    storageOk,
    // quiz actions
    answer,
    next: () => dispatch({ type: 'quiz', action: { type: 'next' } }),
    back: () => dispatch({ type: 'quiz', action: { type: 'back' } }),
    goto: (step) => dispatch({ type: 'quiz', action: { type: 'goto', step } }),
    finish: () => dispatch({ type: 'quiz', action: { type: 'finish' } }),
    reopen: (step) => dispatch({ type: 'quiz', action: { type: 'reopen', step } }),
    // "restart" = retake: remembers the matches, clears answers and DNA edits
    restart: () => dispatch({ type: 'retake' }),
    // profile actions
    setDna: (dim, v) => dispatch({ type: 'dna/set', dim, value: v }),
    resetDna: () => dispatch({ type: 'dna/reset' }),
    toggleSaved: (id) => dispatch({ type: 'saved/toggle', id }),
    setGoal: (g) => dispatch({ type: 'goal/set', goal: g }),
    wipe: () => dispatch({ type: 'wipe' }),
  }), [q, dna, saved, goal, previous, profile, result, percentById, questions, storageOk, answer]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>');
  return ctx;
}
