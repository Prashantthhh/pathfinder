import { Link } from 'react-router-dom';
import Nova from '../components/nova/Nova.jsx';
import { MAX_COMPARE, sideBySide } from '../engine/sideBySide.js';
import { useProfile } from '../state/ProfileContext.jsx';
import useTitle from '../hooks/useTitle.js';

/** 2-3 careers on the same fields. A field that has no data says "Not available". */
export default function Compare() {
  useTitle('Compare careers');
  const p = useProfile();
  const chosen = p.compare.map((id) => p.careers.find((c) => c.id === id)).filter(Boolean);
  const hasProfile = !p.result.insufficient;
  const options = p.careers.filter((c) => !p.compare.includes(c.id)).sort((a, b) => a.title.localeCompare(b.title));

  const picker = chosen.length < MAX_COMPARE && (
    <div className="cmp__add">
      <label htmlFor="compare-add" className="field-label">Add a career ({chosen.length} of {MAX_COMPARE})</label>
      <select id="compare-add" className="field" value="" onChange={(e) => e.target.value && p.toggleCompare(e.target.value)}>
        <option value="">Choose a career…</option>
        {options.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
      </select>
    </div>
  );

  if (chosen.length < 2) {
    return (
      <section className="page page--narrow cmp">
        <p className="eyebrow">Side by side</p>
        <h1>Compare careers</h1>
        <div className="stub stub--inline" data-testid="compare-empty">
          <Nova size={96} mood="curious" />
          <p>
            {chosen.length === 0 ? 'Pick two or three careers to see them on the same fields.' : `${chosen[0].title} is chosen. Add at least one more.`}
            {' '}You can also press <strong>Compare</strong> on any career in <Link to="/explore">Explore</Link> or on its own page.
          </p>
        </div>
        {chosen.length === 1 && <p><strong>{chosen[0].title}</strong> <button type="button" className="btn btn--quiet" onClick={() => p.toggleCompare(chosen[0].id)}>Remove</button></p>}
        {picker}
      </section>
    );
  }

  const sections = sideBySide(chosen, { percentById: hasProfile ? p.percentById : {}, ratings: p.skills, roadmap: p.roadmap });

  return (
    <section className="page cmp">
      <p className="eyebrow">Side by side</p>
      <h1>Compare careers</h1>
      <p className="lede">
        The same fields for every career. Where a field has no data for a career, it says &ldquo;Not available&rdquo; rather than leaving a gap.
        {!hasProfile && <> Your match score needs your quiz answers: <Link to="/quiz">take the quiz</Link>.</>}
      </p>

      <div className="cmp__tools">
        {picker}
        <button type="button" className="btn btn--quiet" onClick={p.clearCompare}>Clear the comparison</button>
      </div>

      <p className="fine cmp__hint">On a small screen, swipe the table sideways to see every career.</p>
      <div className="tablewrap" role="region" aria-label="Comparison table, scrolls sideways on small screens" tabIndex={0}>
        <table className="cmp__table" data-testid="compare-table">
          <caption className="sr-only">{chosen.map((c) => c.title).join(', ')} compared on the same fields</caption>
          <thead>
            <tr>
              <td className="cmp__corner" />
              {chosen.map((c) => (
                <th key={c.id} scope="col" className="cmp__head">
                  <Link to={`/careers/${c.id}`}>{c.title}</Link>
                  <button type="button" className="cmp__remove" onClick={() => p.toggleCompare(c.id)} aria-label={`Remove ${c.title} from the comparison`}>Remove</button>
                </th>
              ))}
            </tr>
          </thead>
          {sections.map((s) => (
            <tbody key={s.id}>
              <tr><th colSpan={chosen.length + 1} scope="colgroup" className="cmp__group">{s.title}</th></tr>
              {s.rows.map((r) => (
                <tr key={r.id} data-row={r.id}>
                  <th scope="row" className="cmp__label">{r.label}</th>
                  {r.cells.map((cell, i) => (
                    <td key={chosen[i].id} className={cell.text === 'Not available' ? 'is-na' : undefined}>{cell.text}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
      <p className="fine">
        Interest scores, skills and knowledge areas are from O*NET (US occupation data, estimates). Work feel is derived by PATHFINDER from O*NET Work Context.
        The India route is our general reading, so verify it with the official body.
      </p>
    </section>
  );
}
