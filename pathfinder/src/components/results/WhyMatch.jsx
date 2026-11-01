import { DIMENSION_BY_ID } from '../../data/dimensions.js';

const pct = (v) => `${Math.round((v ?? 0) * 100)}%`;

/**
 * "Why this match": built from the engine's own breakdown. Each driver is a
 * dimension that carried a meaningful share of the score, with the quiz
 * answers that raised it.
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
                    your profile {pct(d.student)} · {career.title} {pct(d.career)}
                  </span>
                </p>
                {d.sources.length > 0 && (
                  <ul className="why__sources">
                    {d.sources.map((s) => (
                      <li key={`${s.questionId}-${s.optionId}`}>
                        <span className="why__section">{sectionLabel(s.section)}:</span> &ldquo;{s.label}&rdquo;
                      </li>
                    ))}
                  </ul>
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
