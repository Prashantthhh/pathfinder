import { DIMENSION_BY_ID } from '../../data/dimensions.js';
import { SETTING_BY_ID } from '../../data/settings.js';

const SETTING_STATE = {
  close: 'close to what you said',
  partly: 'partly like what you said',
  differs: 'different from what you said',
};

/**
 * "Why this match": built from the engine's own breakdown.
 *  - Interests: the interest types that carried a meaningful share of the score, with
 *    O*NET's own interest score for the career (1-7) and the quiz answers behind each.
 *    It deliberately shows no percentage for the student: the student's profile is
 *    relative (strongest = 1), so "100%" would be misread as a score or a skill level.
 *  - Work settings: how the day-to-day compares with what the student said they like.
 */
export default function WhyMatch({ item, quiz, open = false }) {
  const { why, career } = item;
  const sectionLabel = (id) => quiz.sections.find((s) => s.id === id)?.label ?? '';
  const notable = why.settingsNotes.filter((n) => n.state !== 'partly');

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
                    O*NET rates {career.title} {d.career.toFixed(1)} of 7 on {dim.label} interest
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

        {notable.length > 0 && (
          <div className="why__settings">
            <p className="why__from">How the day-to-day compares (work settings we derived from O*NET):</p>
            <ul className="why__sources">
              {notable.map((n) => (
                <li key={n.id}>
                  <strong>{SETTING_BY_ID[n.id].label}:</strong> {SETTING_STATE[n.state]}
                </li>
              ))}
            </ul>
          </div>
        )}

        {why.stretch.length > 0 && (
          <p className="why__stretch">
            <strong>Worth knowing:</strong> this career also leans on{' '}
            {why.stretch.map((d) => DIMENSION_BY_ID[d].label).join(' and ')} interests, which your answers
            barely touched. You would likely be building that from scratch.
          </p>
        )}
      </div>
    </details>
  );
}
