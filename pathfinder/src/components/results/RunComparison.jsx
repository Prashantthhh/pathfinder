import { compareRuns } from '../../engine/compare.js';

const sentence = (r) => {
  if (r.move === 'new') return 'new in your top matches';
  if (r.move === 'same') return `unchanged at #${r.now.pos}`;
  const n = Math.abs(r.places);
  return `${r.move === 'up' ? 'up' : 'down'} ${n} ${n === 1 ? 'place' : 'places'}, was #${r.was.pos}`;
};

/** After a retake: how the top matches moved compared with the previous attempt. */
export default function RunComparison({ previous, matches, careers }) {
  const { rows, dropped } = compareRuns(previous, matches);
  const title = (id) => careers.find((c) => c.id === id)?.title ?? id;
  return (
    <details className="compare">
      <summary>How your matches changed since your last attempt</summary>
      <div className="compare__body">
        <ol className="compare__list">
          {rows.map((r) => (
            <li key={r.id}>
              <strong>{r.title}</strong>: {sentence(r)}
              <span className="compare__pct"> · {r.now.percent}% now{r.was ? `, ${r.was.percent}% before` : ''}</span>
            </li>
          ))}
        </ol>
        {dropped.length > 0 && (
          <p className="fine">
            No longer in your top matches: {dropped.map((d) => `${title(d.id)} (was #${d.was.pos})`).join(', ')}.
          </p>
        )}
        <p className="fine">
          Matches move when your answers or Career DNA edits change. A change here is not good or bad news in itself.
        </p>
      </div>
    </details>
  );
}
