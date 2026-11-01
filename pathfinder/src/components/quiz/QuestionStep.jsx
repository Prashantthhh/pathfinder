import { DIMENSION_BY_ID } from '../../data/dimensions.js';

/** Dimensions an option recorded, strongest first, for the "what this recorded" chips. */
const recorded = (option) =>
  Object.entries(option.w)
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([d]) => DIMENSION_BY_ID[d]);

/**
 * One question as a native radio group (single) or checkbox group (multi), so
 * keyboard and screen-reader behaviour comes from the browser.
 */
export default function QuestionStep({ question, selected, onPick, describedBy }) {
  const multi = question.type === 'multi';
  const atLimit = multi && question.max && selected.filter((id) => !question.options.find((o) => o.id === id)?.exclusive).length >= question.max;

  return (
    <fieldset className="question" aria-describedby={describedBy}>
      <legend className="question__prompt">{question.prompt}</legend>
      {question.hint && <p className="question__hint" id={`${question.id}-hint`}>{question.hint}</p>}

      <div className="options">
        {question.options.map((o) => {
          const checked = selected.includes(o.id);
          const locked = multi && atLimit && !checked && !o.exclusive;
          return (
            <label key={o.id} className={`opt${checked ? ' is-selected' : ''}${locked ? ' is-locked' : ''}`}>
              <input
                type={multi ? 'checkbox' : 'radio'}
                name={question.id}
                value={o.id}
                checked={checked}
                disabled={locked}
                onChange={() => onPick(o.id)}
              />
              <span className="opt__mark" aria-hidden="true" />
              <span className="opt__body">
                <span className="opt__label">{o.label}</span>
                {checked && recorded(o).length > 0 && (
                  <span className="opt__recorded">
                    Noted for:{' '}
                    {recorded(o).map((d, i) => (
                      <span key={d.id} className="opt__dim">
                        <span className="opt__blaze" style={{ background: d.color }} aria-hidden="true" />
                        {d.label}
                        {i < recorded(o).length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
