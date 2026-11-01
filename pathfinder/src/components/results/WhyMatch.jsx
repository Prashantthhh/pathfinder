import { DIMENSION_BY_ID } from '../../data/dimensions.js';

const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;

/**
 * "Why this match": built from the engine's own breakdown. Each driver is a
 * dimension that carried a meaningful share of the score. It shows how much
 * weight the career puts on that dimension and the quiz answers that pointed
 * there. It deliberately shows no percentage for the student: the student's
 * profile is relative (strongest dimension = 1), so "100%" would be misread
 * as a score or a level of skill.
 */
export default function WhyMatch({ item, quiz, open = false }) {
  const { why, career } = item;
  const sectionLabel = (id) => quiz.sections.find((s) => s.id === id)?.label ?? '';

  return (
    <details className="why" open={open}>
      <summary>Why this match</summary>
      <div className="why__body">
        {why.sentence && <p>{why.sentence}</p>}

        <ul className="why__drivers">
          {why.drivers.map((d) => {
            const dim = DIMENSION_BY_ID[d.dim];
            return (
              <li key={d.dim}>
                <p className="why__dim">
                  <span className="why__blaze" style={{ background: dim.color }} aria-hidden="true" />
                  <strong>{dim.label}</strong>
                  <span className="why__nums">
                    {career.title} puts a weight of {pct(d.career)} on {dim.label}
                  </span>
                </p>
                {d.sources.length > 0 && (
                  <>
                    <p className="why__from">Your answers that point here:</p>
                    <ul className="why__sources">
                      {d.sources.map((s) => (
                        <li key={`${s.questionId}-${s.optionId}`}>
                          <span className="why__section">{sectionLabel(s.section)}:</span> &ldquo;{s.label}&rdquo;
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </li>
            );
          })}
        </ul>

        {why.stretch.length > 0 && (
          <p className="why__stretch">
            <strong>Worth knowing:</strong> this role also leans on{' '}
            {why.stretch.map((d) => DIMENSION_BY_ID[d].label).join(' and ')}, which your answers
            barely touched. You would likely be building that from scratch.
          </p>
        )}
      </div>
    </details>
  );
}
