import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import CareerRow from '../components/explore/CareerRow.jsx';
import Nova from '../components/nova/Nova.jsx';
import { DIMENSIONS } from '../data/dimensions.js';
import { CAREER_COUNT_BY_DOMAIN, DOMAINS, DOMAIN_GROUPS } from '../data/domainsIndex.js';
import { filterCareers, searchCareers, sortCareers, surprise } from '../engine/explore.js';
import { MIN_MATCH_PERCENT } from '../engine/tiers.js';
import { useProfile } from '../state/ProfileContext.jsx';
import useTitle from '../hooks/useTitle.js';
import useYou from '../hooks/useYou.js';

const csv = (v) => (v ? v.split(',').filter(Boolean) : []);
const toggle = (list, id) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
const DOMAINS_WITH_CAREERS = DOMAINS.filter((d) => CAREER_COUNT_BY_DOMAIN[d.id] > 0);

export default function Explore() {
  useTitle('Explore careers');
  const p = useProfile();
  const { careers, result, percentById } = p;
  const hasProfile = !result.insufficient;
  const you = useYou();
  const nearIds = you?.near.map((n) => n.id) ?? [];

  // All filter state lives in the URL, so links like /explore?domain=design work
  // and a filtered view can be shared or bookmarked.
  const [params, setParams] = useSearchParams();
  const q = params.get('q') ?? '';
  const domains = csv(params.get('domain'));
  const types = csv(params.get('type'));
  const nearActive = nearIds.length > 0 && nearIds.length === domains.length && nearIds.every((id) => domains.includes(id));
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
      domains: new Set(domains),
      types: new Set(types),
      savedOnly,
      saved: new Set(p.saved),
      minPercent: matchOnly ? MIN_MATCH_PERCENT : undefined,
      percentById,
    });
    return sortCareers(filtered, sortValue, percentById);
  }, [careers, q, params.get('domain'), params.get('type'), savedOnly, matchOnly, sortValue, p.saved, percentById]); // eslint-disable-line react-hooks/exhaustive-deps

  const anyFilter = Boolean(q || domains.length || types.length || savedOnly || matchOnly);

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
            {careers.length} careers across {DOMAINS_WITH_CAREERS.length} domains. Search, filter, or let Nova pick something
            unexpected. You don&rsquo;t need to take the quiz first.
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
                placeholder="e.g. doctor, ca, design, iti"
                value={q}
                onChange={(e) => update({ q: e.target.value })}
                autoComplete="off"
              />
            </div>

            <fieldset className="field-group">
              <legend className="field-label">Domain</legend>
              {you && (
                <button type="button" className={`btn btn--quiet near-btn${nearActive ? ' is-on' : ''}`} aria-pressed={nearActive} data-testid="near-you-filter" onClick={() => update({ domain: nearActive ? [] : nearIds })}>
                  Near you on the map
                </button>
              )}
              <div className="field-scroll" tabIndex={0} role="group" aria-label="Domains, scrollable">
                {DOMAIN_GROUPS.map((g) => {
                  const list = DOMAINS_WITH_CAREERS.filter((d) => d.group === g.id);
                  if (!list.length) return null;
                  return (
                    <div key={g.id} className="field-sub">
                      <p className="field-sub__h">{g.label}</p>
                      {list.map((d) => (
                        <label key={d.id} className="check">
                          <input type="checkbox" checked={domains.includes(d.id)} onChange={() => update({ domain: toggle(domains, d.id) })} />
                          <span>{d.label} <span className="check__n">{CAREER_COUNT_BY_DOMAIN[d.id]}</span></span>
                        </label>
                      ))}
                    </div>
                  );
                })}
              </div>
            </fieldset>

            <fieldset className="field-group">
              <legend className="field-label">Main interest</legend>
              {DIMENSIONS.map((d) => (
                <label key={d.id} className="check">
                  <input type="checkbox" checked={types.includes(d.id)} onChange={() => update({ type: toggle(types, d.id) })} />
                  <span>
                    <span className="chip__blaze chip__blaze--inline" style={{ background: d.color }} aria-hidden="true" />
                    {d.label} <span className="check__n">{d.nickname}</span>
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
