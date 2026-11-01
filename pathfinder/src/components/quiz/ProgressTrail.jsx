/**
 * Quiz progress drawn as a trail: one waypoint per question, grouped by section.
 * The visual is decorative; a progressbar role carries the text equivalent.
 */
export default function ProgressTrail({ quiz, step, answers }) {
  const total = quiz.questions.length;
  const current = quiz.questions[step];
  const section = quiz.sections.find((s) => s.id === current.section);

  return (
    <div
      className="trail-progress"
      role="progressbar"
      aria-label="Quiz progress"
      aria-valuemin={1}
      aria-valuemax={total}
      aria-valuenow={step + 1}
      aria-valuetext={`Question ${step + 1} of ${total}, ${section.label}`}
    >
      <div className="trail-progress__sections" aria-hidden="true">
        {quiz.sections.map((s, si) => {
          const qs = quiz.questions.map((q, i) => ({ q, i })).filter(({ q }) => q.section === s.id);
          return (
            <div key={s.id} className={`trail-progress__section trail-progress__section--${si}`} style={{ flex: qs.length }}>
              <span className={s.id === current.section ? 'trail-progress__name is-current' : 'trail-progress__name'}>{s.label}</span>
              <div className="trail-progress__cells">
                {qs.map(({ q, i }) => {
                  const state = i === step ? 'current' : answers[q.id]?.length ? 'done' : i < step ? 'skipped' : 'todo';
                  return <span key={q.id} className={`trail-progress__cell trail-progress__cell--${state}`} />;
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
