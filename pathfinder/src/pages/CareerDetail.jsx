import { Link, useParams } from 'react-router-dom';
import RadarChart from '../components/profile/RadarChart.jsx';
import SaveButton from '../components/common/SaveButton.jsx';
import DataPending from '../components/common/DataPending.jsx';
import Nova from '../components/nova/Nova.jsx';
import { AREA_BY_ID } from '../data/areas.js';
import { resolveLinks } from '../data/links.js';
import { MIN_MATCH_PERCENT, tierOf } from '../engine/tiers.js';
import { useProfile } from '../state/ProfileContext.jsx';
import useTitle from '../hooks/useTitle.js';

function Missing() {
  useTitle('Career not found');
  return (
    <section className="page page--narrow stub" aria-labelledby="cd-missing">
      <Nova size={110} mood="curious" />
      <h1 id="cd-missing">We couldn&rsquo;t find that career</h1>
      <p>The link may be out of date. <Link to="/explore">Browse all careers</Link>.</p>
    </section>
  );
}

export default function CareerDetail() {
  const { id } = useParams();
  const p = useProfile();
  const career = p.careers.find((c) => c.id === id);
  useTitle(career?.title ?? 'Career');
  if (!career) return <Missing />;

  const area = AREA_BY_ID[career.area];
  const links = resolveLinks(career.roadmaps);
  const hasProfile = !p.result.insufficient;
  const percent = p.percentById[career.id];
  const tier = hasProfile ? tierOf(percent) : null;
  const related = career.related.map((rid) => p.careers.find((c) => c.id === rid)).filter(Boolean);

  return (
    <article className="page career" aria-labelledby="career-title">
      <nav aria-label="Breadcrumb" className="career__crumbs">
        <Link to="/explore">Explore</Link> <span aria-hidden="true">›</span>{' '}
        <Link to={`/explore?area=${career.area}`}>{area?.label}</Link>
      </nav>

      <header className="career__head">
        <div>
          <p className="result__area">{area?.label}</p>
          <h1 id="career-title">{career.title}</h1>
          <p className="lede">{career.overview}</p>
        </div>
        <div className="career__actions">
          <SaveButton career={career} />
          <Link className="btn btn--quiet" to={`/nova?career=${career.id}`}>Ask Nova about this (demo)</Link>
        </div>
      </header>

      {career.entryNote && (
        <aside className="callout" aria-labelledby="entry-note-title">
          <h2 id="entry-note-title" className="callout__title">Entry route to know about</h2>
          <p>{career.entryNote}</p>
        </aside>
      )}

      <section className="career__match" aria-labelledby="match-title">
        <h2 id="match-title">How it lines up with you</h2>
        {hasProfile && tier ? (
          <>
            <p>
              <span className="match__pct">{percent}%</span> match score · <strong>{tier.label}</strong>
              {p.edited && <span className="fine"> (using your edited Career DNA)</span>}
            </p>
            <p className="fine">
              A match score shows how closely your answers line up with this career&rsquo;s profile. It is not a prediction of success.{' '}
              <Link to="/results">See your results and the reasons</Link>
            </p>
          </>
        ) : hasProfile ? (
          <p>
            This career is below the {MIN_MATCH_PERCENT}% match line for your current profile, so it isn&rsquo;t presented as a match.
            That says how your answers compare with its profile, not whether you could do the work.{' '}
            {p.edited && <span className="fine">(Using your edited Career DNA.) </span>}
            <Link to="/profile">See your Career DNA</Link>
          </p>
        ) : (
          <p>
            You don&rsquo;t have a profile yet, so there is no match score. <Link to="/quiz">Take the quiz</Link> to see how this career lines up with you.
          </p>
        )}
        {career.matchNote && <p className="fine"><strong>Note:</strong> {career.matchNote}</p>}
      </section>

      <div className="career__cols">
        <section aria-labelledby="resp-title">
          <h2 id="resp-title">Typical work</h2>
          <ul>{career.responsibilities.map((r) => <li key={r}>{r}</li>)}</ul>
        </section>
        <section aria-labelledby="skills-title">
          <h2 id="skills-title">Skills often used</h2>
          <ul>{career.skills.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
        <section aria-labelledby="subj-title">
          <h2 id="subj-title">Relevant subjects</h2>
          <ul>{career.subjects.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
        <section aria-labelledby="entry-title">
          <h2 id="entry-title">Ways in</h2>
          <ul>{career.entryRoutes.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
      </div>

      <section className="career__profile" aria-labelledby="prof-title">
        <h2 id="prof-title">This career&rsquo;s profile</h2>
        <p className="fine">
          How much the role leans on each dimension. These weights were set by hand for this project and are what
          your answers are compared with.
        </p>
        <RadarChart values={career.vector} title={`${career.title} profile`} className="career__radar" />
      </section>

      <section aria-labelledby="pay-title">
        <h2 id="pay-title">Salary and demand</h2>
        <div className="pending-row">
          <DataPending label="Salary" />
          <DataPending label="Demand" />
        </div>
        <p className="fine">
          We show these once a reliable source is connected, with the source and update date. We won&rsquo;t guess numbers.
        </p>
      </section>

      <div className="career__cols">
        <section aria-labelledby="proj-title">
          <h2 id="proj-title">Beginner project ideas</h2>
          <ul>{career.projects.map((s) => <li key={s}>{s}</li>)}</ul>
        </section>
        <section aria-labelledby="learn-title">
          <h2 id="learn-title">Learning resources</h2>
          {links.length ? (
            <ul>
              {links.map((l) => (
                <li key={l.url}>
                  <a href={l.url} target="_blank" rel="noopener noreferrer">
                    {l.label}<span className="sr-only"> (opens in a new tab)</span>
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <p>No verified learning link yet. We only list links we have checked.</p>
          )}
        </section>
      </div>

      {related.length > 0 && (
        <section aria-labelledby="rel-title">
          <h2 id="rel-title">Related careers</h2>
          <ul className="related">
            {related.map((r) => (
              <li key={r.id}>
                <Link to={`/careers/${r.id}`}>{r.title}</Link>
                <span className="fine"> {AREA_BY_ID[r.area]?.label}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
