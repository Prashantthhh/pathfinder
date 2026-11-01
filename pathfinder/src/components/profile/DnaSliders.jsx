import { DIMENSIONS } from '../../data/dimensions.js';
import { levelOf } from '../../engine/dna.js';

/**
 * One slider per dimension. The value is shown as a word ("A lot"), not a
 * number: these are relative emphasis, not scores, and a number would be read
 * as a mark out of 100.
 */
export default function DnaSliders({ values, onChange }) {
  return (
    <ul className="sliders">
      {DIMENSIONS.map((d) => {
        const v = values[d.id] ?? 0;
        const word = levelOf(v);
        const id = `dna-${d.id}`;
        return (
          <li key={d.id} className="slider">
            <label htmlFor={id} className="slider__label">
              <span className="slider__blaze" style={{ background: d.color }} aria-hidden="true" />
              <span className="slider__name">{d.label}</span>
              <span className="slider__word" aria-hidden="true">{word}</span>
            </label>
            <input
              id={id}
              type="range"
              min="0"
              max="100"
              step="5"
              value={Math.round(v * 100)}
              aria-valuetext={word}
              aria-describedby={`${id}-hint`}
              onChange={(e) => onChange(d.id, Number(e.target.value) / 100)}
            />
            <span id={`${id}-hint`} className="slider__hint">{d.blurb}</span>
          </li>
        );
      })}
    </ul>
  );
}
