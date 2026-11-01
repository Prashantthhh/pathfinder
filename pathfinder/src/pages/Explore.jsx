import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import CareerRow from '../components/explore/CareerRow.jsx';
import Nova from '../components/nova/Nova.jsx';
import { AREAS } from '../data/areas.js';
import { DIMENSIONS } from '../data/dimensions.js';
import { filterCareers, searchCareers, sortCareers, surprise } from '../engine/explore.js';
import { MIN_MATCH_PERCENT } from '../engine/tiers.js';
import { useProfile } from '../state/ProfileContext.jsx';
import useTitle from '../hooks/useTitle.js';

const csv = (v) => (v ? v.split(',').filter(Boolean) : []);
const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);

export default function Explore() {
  useTitle('Explore careers');
  const p = useProfile();
  const { careers, result, percentById } = p;
  const hasProfile = !result.insufficient;

  // All filter state lives in the URL, so links like /explore?area=security work
  // and a filtered view can be shared or bookmarked.
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const areas = csv(params.get('area'));
  const dims = csv(params.get('dim'));
  const savedOnly = params.get('saved') === '1';
  const matchOnly = params.get('match') === '1' && hasProfile;
  const sort = params.get('sort') ?? (q ? 'relevance' : hasProfile ? 'match' : 'name');
  const sortValue = sort === 'match' && !hasProfile ? 'name' : sort;

  const update = (changes) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v === '' || v === null || v === false || (Array.isArray(v) && !v.length)) next.delete(k);
      else next.set(k, Array.isArray(v) ? v.join(',') : v === true ? '1' : v);
    }
    setParams(next, { replace: true });
  };

  const items = useMemo(() => {
    const found = searchCareers(careers, q);
    const filtered = filterCareers(found, {
      areas: new Set(areas),
      dims: new Set(dims),
      savedOnly,
      saved: new Set(p.saved),
      minPercent: matchOnly ? MIN_MATCH_PERCENT : undefined,
      percentById,
    });
    return sortCareers(filtered, sortValue, percentById);
  }, [careers, q, params.get('area'), params.get('dim'), savedOnly, matchOnly, sortValue, p.saved, percentById]); // eslint-disable-line react-hooks/exhaustive-deps

  const anyFilter = Boolean(q || areas.length || dims.length || savedOnly || matchOnly);
  const areaCounts = useMemo(() => careers.reduce((a, c) => ({ ...a, [c.area]: (a[c.area] ?? 0) + 1 }), {}), [careers]);

  // Filters start open on wide screens and closed on phones.
  const filtersRef = useRef(null);
  useEffect(() => {
    if (window.matchMedia?.('(min-width: 60rem)').matches && filtersRef.current) filtersRef.current.open = true;
  }, []);

  // Surprise Me: remembers what it has already shown so "another one" is new.
  const tried = useRef(new Set());
  const [pick, setPick] = useState(null);
  const [noMore, setNoMore] = useState(false);
  const surpriseMe = () => {
    const liked = [...new Set([...result.matches.slice(0, 3).map((m) => m.career.id), ...p.saved])];
    const excluded = new Set([...result.matches.map((m) => m.career.id), ...tried.current]);
    let next = surprise(careers, { liked, excluded });
    if (!next && tried.current.size) {
      tried.current = new Set(); // seen them all: start over
      setNoMore(true);
      next = surprise(careers, { liked, excluded: new Set(result.matches.map((m) => m.career.id)) });
    } else {
      setNoMore(false);
    }
    if (next) {
      tried.current.add(next.career.id);
      setPick(next);
    }
  };

  return (
    <div className="page explore">
      <header className="explore__head">
        <div>
          <p className="eyebrow">Destinations</p>
          <h1>Explore careers</h1>
          <p className="lede">
            {careers.length} careers across {AREAS.length} areas. Search, filter, or let Nova pick something unexpected.
            You don&rsquo;t need to take the quiz first.
          </p>
        </div>
        <button type="button" className="sign sign--quiet sign--button" onClick={surpriseMe}>
          <span className="sign__board">
            Surprise me <span className="sign__arrow" aria-hidden="true">✦</span>
          </span>
        </button>
      </header>

      <div className="surprise" role="status" aria-live="polite">
        {pick && (
          <div className="surprise__box">
            <Nova size={64} mood="happy" reactKey={pick.career.id} />
            <div>
              <p className="surprise__lead">
                How about <Link to={`/careers/${pick.career.id}`}>{pick.career.title}</Link>?
              </p>
              <p>{pick.reason}</p>
              {noMore && <p className="fine">You&rsquo;ve seen every suggestion, so I&rsquo;m starting again.</p>}
              <p className="surprise__actions">
                <Link to={`/careers/${pick.career.id}`}>Open career page</Link>
                <button type="button" className="linkbtn" onClick={surpriseMe}>Show me another</button>
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="explore__layout">
        <details className="filters" ref={filtersRef}>
          <summary>Search and filters{anyFilter ? ' (active)' : ''}</summary>
          <div className="filters__body">
            <div className="field-group">
              <label htmlFor="q" className="field-label">Search</label>
              <input
                id="q"
                type="search"
                className="field"
                placeholder="e.g. data, security, react"
                value={q}
                onChange={(e) => update({ q: e.target.value })}
                autoComplete="off"
              />
            </div>

            <fieldset className="field-group">
              <legend className="field-label">Area</legend>
              {AREAS.map((a) => (
                <label key={a.id} className="check">
                  <input type="checkbox" checked={areas.includes(a.id)} onChange={() => update({ area: toggle(areas, a.id) })} />
                  <span>{a.label} <span className="check__n">{areaCounts[a.id] ?? 0}</span></span>
                </label>
              ))}
            </fieldset>

            <fieldset className="field-group">
              <legend className="field-label">Leans on</legend>
              {DIMENSIONS.map((d) => (
                <label key={d.id} className="check">
                  <input type="checkbox" checked={dims.includes(d.id)} onChange={() => update({ dim: toggle(dims, d.id) })} />
                  <span>
                    <span className="chip__blaze chip__blaze--inline" style={{ background: d.color }} aria-hidden="true" />
                    {d.label}
                  </span>
                </label>
              ))}
            </fieldset>

            <fieldset className="field-group">
              <legend className="field-label">Show only</legend>
              <label className="check">
                <input type="checkbox" checked={savedOnly} onChange={() => update({ saved: !savedOnly })} />
                <span>Careers I saved <span className="check__n">{p.saved.length}</span></span>
              </label>
              <label className={hasProfile ? 'check' : 'check is-off'}>
                <input type="checkbox" checked={matchOnly} disabled={!hasProfile} onChange={() => update({ match: !matchOnly })} />
                <span>Matches for me ({MIN_MATCH_PERCENT}%+)</span>
              </label>
              {!hasProfile && <p className="fine">Take the quiz to filter by your matches.</p>}
            </fieldset>

            <div className="field-group">
              <label htmlFor="sort" className="field-label">Sort by</label>
              <select id="sort" className="field" value={sortValue} onChange={(e) => update({ sort: e.target.value })}>
                {hasProfile && <option value="match">Best match for me</option>}
                {q && <option value="relevance">Relevance</option>}
                <option value="name">Name (A to Z)</option>
              </select>
            </div>

            <p className="fine">
              Salary range, location and experience-level filters aren&rsquo;t here because that data isn&rsquo;t connected yet.
            </p>

            {anyFilter && (
              <button type="button" className="btn btn--quiet" onClick={() => setParams({}, { replace: true })}>
                Clear all filters
              </button>
            )}
          </div>
        </details>

        <section aria-labelledby="results-count" className="explore__results">
          <h2 id="results-count" className="explore__count">
            {items.length === careers.length ? `All ${careers.length} careers` : `Showing ${items.length} of ${careers.length} careers`}
          </h2>
          <p className="sr-only" role="status" aria-live="polite">
            {items.length} of {careers.length} careers shown
          </p>
          {items.length === 0 ? (
            <div className="explore__empty">
              <Nova size={90} mood="curious" />
              <p>
                No careers match{q ? <> &ldquo;{q}&rdquo;</> : ' those filters'}. Try fewer filters or a different word.
              </p>
              <button type="button" className="btn" onClick={() => setParams({}, { replace: true })}>Clear all filters</button>
            </div>
          ) : (
            <ol className="explore__list">
              {items.map(({ career }) => (
                <CareerRow key={career.id} career={career} percent={hasProfile ? percentById[career.id] : null} />
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
