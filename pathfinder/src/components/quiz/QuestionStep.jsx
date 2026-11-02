import { DIMENSION_BY_ID } from '../../data/dimensions.js';
import { SETTING_BY_ID } from '../../data/settings.js';

/**
 * What an answer recorded, shown once it is picked so nothing is hidden:
 *   interest / subjects  -> the interest types it counts toward (with their colour)
 *   setting              -> the work settings it describes
 *   stream, study, ...   -> a plain note: used only to arrange results, never to hide a career
 */
function recordedItems(option, kind) {
  if (kind === 'interest' || kind === 'subjects') {
    return Object.entries(option.w ?? {})
      .filter(([, w]) => w > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([d]) => ({ id: d, name: DIMENSION_BY_ID[d].label, color: DIMENSION_BY_ID[d].color }));
  }
  if (kind === 'setting') {
    return Object.keys(option.s ?? {}).map((k) => ({ id: k, name: SETTING_BY_ID[k].label }));
  }
  return [];
}

/**
 * One question as a native radio group (single) or checkbox group (multi), so
 * keyboard and screen-reader behaviour comes from the browser.
 */
export default function QuestionStep({ question, selected, onPick, describedBy }) {
  const multi = question.type === 'multi';
  const atLimit = multi && question.max && selected.filter((id) => !question.options.find((o) => o.id === id)?.exclusive).length >= question.max;
  const contextOnly = ['stream', 'grad-field', 'study', 'earn'].includes(question.kind);

  return (
    <fieldset className="question" aria-describedby={describedBy}>
      <legend className="question__prompt">{question.prompt}</legend>
      {question.hint && <p className="question__hint" id={`${question.id}-hint`}>{question.hint}</p>}

      <div className="options">
        {question.options.map((o) => {
          const checked = selected.includes(o.id);
          const locked = multi && atLimit && !checked && !o.exclusive;
          const items = checked ? recordedItems(o, question.kind) : [];
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
                {checked && items.length > 0 && (
                  <span className="opt__recorded">
                    Noted for:{' '}
                    {items.map((d, i) => (
                      <span key={d.id} className="opt__dim">
                        {d.color && <span className="opt__blaze" style={{ background: d.color }} aria-hidden="true" />}
                        {d.name}
                        {i < items.length - 1 ? ', ' : ''}
                      </span>
                    ))}
                  </span>
                )}
                {checked && contextOnly && (
                  <span className="opt__recorded">Used only to arrange your results. It never changes a score or hides a career.</span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
