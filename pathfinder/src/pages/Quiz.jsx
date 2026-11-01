import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Nova from '../components/nova/Nova.jsx';
import NovaBubble from '../components/nova/NovaBubble.jsx';
import ProgressTrail from '../components/quiz/ProgressTrail.jsx';
import QuestionStep from '../components/quiz/QuestionStep.jsx';
import ConfirmAction from '../components/common/ConfirmAction.jsx';
import SignLink from '../components/common/SignLink.jsx';
import { useProfile } from '../state/ProfileContext.jsx';
import { isAnswered } from '../state/quizState.js';
import useTitle from '../hooks/useTitle.js';

const DEFAULT_INTRO = 'Pick what feels true. After each answer I’ll tell you what I noted.';

/** Before the quiz starts, offer to resume or review instead of silently dropping the user in. */
function Gate({ kind, onContinue }) {
  const p = useProfile();
  const clear = () => {
    p.restart();
    onContinue();
  };

  return (
    <section className="page page--narrow gate" aria-labelledby="gate-title">
      <Nova size={130} mood="happy" />
      {kind === 'complete' ? (
        <>
          <h1 id="gate-title">You&rsquo;ve finished the quiz</h1>
          <p>All {p.total} questions are answered and saved in this browser.</p>
          <div className="gate__actions">
            <SignLink to="/results">See my matches</SignLink>
            <button
              type="button"
              className="btn btn--quiet"
              onClick={() => {
                p.reopen(0);
                onContinue();
              }}
            >
              Review or change my answers
            </button>
          </div>
        </>
      ) : (
        <>
          <h1 id="gate-title">Welcome back</h1>
          <p>
            You&rsquo;ve answered {p.answered} of {p.total} questions. Pick up where you left off, or
            start again.
          </p>
          <div className="gate__actions">
            <button type="button" className="btn" onClick={onContinue}>
              Resume at question {p.step + 1}
            </button>
          </div>
        </>
      )}
      <p className="gate__again">
        <ConfirmAction
          label="Start over"
          warning="This clears all your saved answers."
          confirmLabel="Yes, clear and start over"
          onConfirm={clear}
        />
      </p>
      {kind !== 'complete' && <p><Link to="/">Back to the trailhead</Link></p>}
    </section>
  );
}

export default function Quiz() {
  useTitle('Career quiz');
  const p = useProfile();
  const { quiz, step, answers } = p;
  const navigate = useNavigate();
  const location = useLocation();

  const [gate, setGate] = useState(() => {
    if (location.state?.review) return null;
    if (p.status === 'complete') return 'complete';
    return p.started ? 'resume' : null;
  });

  const question = quiz.questions[step];
  const section = quiz.sections.find((s) => s.id === question.section);
  const selected = answers[question.id] ?? [];
  const isLast = step === quiz.questions.length - 1;
  const firstInSection = quiz.questions.find((q) => q.section === question.section).id === question.id;

  // What Nova says: a reaction to the answer just given, else a reaction to
  // the answer already stored for this question, else a short intro.
  const [reaction, setReaction] = useState(null); // { questionId, text, mood, key }
  const [error, setError] = useState(false);
  const reactKey = useRef(0);

  const stored = selected.length ? question.options.find((o) => o.id === selected[selected.length - 1]) : null;
  const nova = reaction?.questionId === question.id
    ? reaction
    : stored
      ? { text: stored.nova, mood: stored.exclusive ? 'curious' : 'happy', key: 0 }
      : { text: firstInSection ? section.intro : DEFAULT_INTRO, mood: 'idle', key: 0 };

  const say = (text, mood) => {
    reactKey.current += 1;
    setReaction({ questionId: question.id, text, mood, key: reactKey.current });
  };

  const onPick = (optionId) => {
    const option = question.options.find((o) => o.id === optionId);
    const result = p.answer(question, optionId);
    setError(false);
    if (result === 'added') say(option.nova, option.exclusive ? 'curious' : 'happy');
    else if (result === 'removed') say(`Okay, I’ve taken “${option.label}” off your picks.`, 'curious');
    else if (result === 'blocked') say(`That’s ${question.max} picks already. Untick one if you want to swap.`, 'thinking');
  };

  const onNext = () => {
    if (!isAnswered(question, answers)) {
      setError(true);
      say('I need at least one answer here before we move on. There are no wrong ones.', 'curious');
      return;
    }
    setError(false);
    if (isLast) {
      p.finish();
      navigate('/results');
    } else {
      p.next();
    }
  };

  // Move focus to the step heading after Next/Back so keyboard and
  // screen-reader users land on the new question (not on first render).
  const headingRef = useRef(null);
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus({ preventScroll: false });
  }, [step]);

  if (gate) return <Gate kind={gate} onContinue={() => setGate(null)} />;

  return (
    <section className="quiz page" aria-labelledby="quiz-title">
      <h1 id="quiz-title" className="quiz__title">Find your career</h1>

      <div className="quiz__progress">
        <ProgressTrail quiz={quiz} step={step} answers={answers} />
      </div>

      <aside className="quiz__nova" aria-label="Nova">
        <Nova size={130} mood={nova.mood} reactKey={nova.key} />
        <NovaBubble live>{nova.text}</NovaBubble>
      </aside>

      <div className="quiz__question">
        <h2 className="quiz__step" tabIndex={-1} ref={headingRef}>
          <span className="quiz__section">{section.label}</span>
          <span className="quiz__count"> · Question {step + 1} of {quiz.questions.length}</span>
        </h2>
        <QuestionStep
          key={question.id}
          question={question}
          selected={selected}
          onPick={onPick}
          describedBy={error ? 'quiz-error' : undefined}
        />
        {error && (
          <p id="quiz-error" className="quiz__error" role="alert">
            Please choose at least one answer to continue.
          </p>
        )}
      </div>

      <div className="quiz__nav">
        <div className="quiz__buttons">
          {step > 0 && (
            <button type="button" className="btn btn--quiet" onClick={p.back}>
              ← Back
            </button>
          )}
          <button type="button" className="btn" onClick={onNext}>
            {isLast ? 'See my matches →' : 'Next →'}
          </button>
        </div>
        <p className="quiz__save" role="status">
          {p.storageOk
            ? 'Saved in this browser as you go. You can leave and resume later.'
            : 'Your browser is blocking storage, so progress will be lost when you close this tab.'}{' '}
          <Link to="/">Save and finish later</Link>
        </p>
      </div>
    </section>
  );
}
