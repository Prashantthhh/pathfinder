import { createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState } from 'react';
import careers from '../data/careers.json';
import quiz from '../data/quiz.json';
import { buildProfile } from '../engine/vector.js';
import { recommend } from '../engine/recommend.js';
import { load, save, STORAGE_KEY } from './storage.js';
import { answeredCount, applyAnswer, hasProgress, initialQuizState, quizReducer, sanitizeQuizState } from './quizState.js';

const ProfileContext = createContext(null);

const reducer = (state, action) => quizReducer(state, action, quiz);

export function ProfileProvider({ children }) {
  // Whatever else is in the saved object is carried through untouched, so later
  // features (profile edits, saved careers) can share the same storage key.
  const saved = useRef(null);
  const [state, dispatch] = useReducer(reducer, null, () => {
    saved.current = load({}) ?? {};
    return sanitizeQuizState(saved.current.quiz, quiz);
  });
  const [storageOk, setStorageOk] = useState(true);

  useEffect(() => {
    const ok = save({ ...saved.current, v: 1, quiz: state });
    setStorageOk(ok);
  }, [state]);

  // Keep several open tabs from overwriting each other with stale progress.
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key !== STORAGE_KEY) return;
      const next = load({}) ?? {};
      saved.current = next;
      dispatch({ type: 'replace', state: sanitizeQuizState(next.quiz, quiz) });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const profile = useMemo(() => buildProfile(state.answers, quiz), [state.answers]);
  const result = useMemo(() => recommend(profile, careers), [profile]);

  const answer = useCallback((question, optionId) => {
    const out = applyAnswer(state.answers, question, optionId);
    if (out.result === 'added' || out.result === 'removed') dispatch({ type: 'answer', question, optionId });
    return out.result;
  }, [state.answers]);

  const value = useMemo(() => ({
    quiz,
    careers,
    ...state,
    answered: answeredCount(quiz, state.answers),
    total: quiz.questions.length,
    started: hasProgress(state),
    profile,
    result,
    storageOk,
    answer,
    next: () => dispatch({ type: 'next' }),
    back: () => dispatch({ type: 'back' }),
    goto: (step) => dispatch({ type: 'goto', step }),
    finish: () => dispatch({ type: 'finish' }),
    reopen: (step) => dispatch({ type: 'reopen', step }),
    restart: () => dispatch({ type: 'restart' }),
  }), [state, profile, result, storageOk, answer]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used inside <ProfileProvider>');
  return ctx;
}

export { initialQuizState };
