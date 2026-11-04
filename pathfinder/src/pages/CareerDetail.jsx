import { Link, useParams } from 'react-router-dom';
import RadarChart from '../components/profile/RadarChart.jsx';
import SaveButton from '../components/common/SaveButton.jsx';
import DataPending from '../components/common/DataPending.jsx';
import Nova from '../components/nova/Nova.jsx';
import careersMeta from '../data/careersMeta.json';
import { DIMENSIONS } from '../data/dimensions.js';
import { domainLabel } from '../data/domainsIndex.js';
import { CORE_LABEL } from '../engine/skillGap.js';
import Named from '../components/common/Named.jsx';
import CompareButton from '../components/common/CompareButton.jsx';
import SkillGapSection from '../components/career/SkillGap.jsx';
import Roadmap from '../components/career/Roadmap.jsx';
import YourPlace from '../components/map/YourPlace.jsx';
import { CHECK_TEXT, routesFor, verifiedOn } from '../data/india.js';
import { SETTINGS } from '../data/settings.js';
import { STREAM_LABELS } from '../data/streams.js';
import { STUDY_LABELS } from '../engine/feasibility.js';
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
  useTitle(career?.title ?? 'Career', career ? `${career.title}: ${career.description.slice(0, 130).replace(/\s+\S*$/, '')}… Skills, interest profile and the typical route in India.` : undefined);
  if (!career) return <Missing />;

  const hasProfile = !p.result.insufficient;
  const percent = p.percentById[career.id];
  const tier = hasProfile ? tierOf(percent) : null;
  const related = career.related.map((rid) => p.careers.find((c) => c.id === rid)).filter(Boolean);
  const routes = routesFor(career);
  const interestValues = Object.fromEntries(DIMENSIONS.map((d) => [d.id, career.riasec[d.id] / 7]));
  const streams = career.entry.streams.map((s) => STREAM_LABELS[s] ?? s);

  return (
    <article className="page career" aria-labelledby="career-title">
      <nav aria-label="Breadcrumb" className="career__crumbs">
        <Link to="/explore">Explore</Link> <span aria-hidden="true">›</span>{' '}
        <Link to={`/explore?domain=${career.domain}`}>{domainLabel(career.domain)}</Link>
      </nav>

      <header className="career__head">
        <div>
          <p className="result__area">{domainLabel(career.domain)}</p>
          <h1 id="career-title">{career.title}</h1>
          <p className="lede">{career.description}</p>
          <p className="fine">
            Description from O*NET, which describes the US occupation <strong>{career.onet.title}</strong> ({career.onet.code}).
          </p>
        </div>
        <div className="career__actions">
          <SaveButton career={career} />
          <CompareButton career={career} />
          {p.compare.length >= 2 && <Link className="btn btn--quiet" to="/compare">See the comparison ({p.compare.length})</Link>}
          <Link className="btn btn--quiet" to={`/nova?career=${career.id}`}>Ask Nova about this</Link>
        </div>
      </header>

      {career.onet.loose && (
        <aside className="callout" aria-labelledby="loose-title">
          <h2 id="loose-title" className="callout__title">An approximate match to O*NET</h2>
          <p>{career.onet.loose}</p>
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
              A match score shows how closely your interests line up with this career&rsquo;s interest profile. It is not a
              prediction of success. <Link to="/results">See your results and the reasons</Link>
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
      </section>

      <div className="career__cols">
        <section aria-labelledby="tasks-title">
          <h2 id="tasks-title">Typical work</h2>
          <ul>{career.tasks.map((t) => <li key={t}>{t}</li>)}</ul>
          <p className="fine">Task statements from O*NET, describing this occupation in the US.</p>
        </section>
        <section aria-labelledby="skills-title">
          <h2 id="skills-title">What it needs more than most careers</h2>
          {career.skills.length > 0 ? (
            <>
              <h3 className="career__sub">Skills</h3>
              <ul>{career.skillDetail.map((d) => <li key={d.name}>{d.name} <span className="fine">(+{d.edge.toFixed(1)} on O*NET&rsquo;s 1&ndash;5 scale)</span></li>)}</ul>
            </>
          ) : (
            <>
              <h3 className="career__sub">{CORE_LABEL}</h3>
              <ul>{career.coreSkillDetail.map((d) => <li key={d.name}>{d.name} <span className="fine">(importance {d.importance.toFixed(1)} of 5)</span></li>)}</ul>
              <p className="fine">No single skill stands out above the average career here, so these are the most important skills overall, shared by many careers.</p>
            </>
          )}
          <h3 className="career__sub">Knowledge areas</h3>
          <ul>{career.knowledgeDetail.map((d) => <li key={d.name}>{d.name} <span className="fine">(+{d.edge.toFixed(1)})</span></li>)}</ul>
          <p className="fine">
            Ranked by how much more this career needs each item than the average of these {p.careers.length} careers
            (O*NET importance, estimated, US occupations), not by raw importance.
          </p>
        </section>
      </div>

      <section className="career__place" aria-labelledby="map-title">
        <h2 id="map-title">Where it sits on the map</h2>
        <YourPlace focusId={career.domain} />
      </section>

      <section className="career__profile" aria-labelledby="prof-title">
        <h2 id="prof-title">Interest profile</h2>
        <p className="fine">
          O*NET&rsquo;s interest scores for this occupation, from 1 to 7 on Holland&rsquo;s six types. O*NET describes these as{' '}
          {careersMeta.interests.sources.join(' and ')}, so treat them as estimates. They are what your answers are compared with.
        </p>
        <div className="career__profile-grid">
          <RadarChart values={interestValues} title={`${career.title} interest profile`} className="career__radar" />
          <ul className="scores">
            {DIMENSIONS.map((d) => (
              <li key={d.id} style={{ '--t': d.color }}>
                <span className="scores__letter" aria-hidden="true">{d.id}</span>
                <span className="scores__name">{d.label}</span>
                <span className="scores__track" aria-hidden="true"><span style={{ width: `${(career.riasec[d.id] / 7) * 100}%` }} /></span>
                <span className="scores__v">{career.riasec[d.id].toFixed(1)} of 7</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="feel-title">
        <h2 id="feel-title">How the work feels day to day</h2>
        <p className="fine">
          Six work settings <strong>derived by PATHFINDER</strong> from O*NET Work Context, shown relative to the other careers here
          (the left end is the least among them, the right end the most). They are not O*NET scores.
        </p>
        <ul className="feel">
          {SETTINGS.map((st) => (
            <li key={st.id}>
              <span className="feel__label">{st.label}</span>
              <span className="feel__track" aria-hidden="true"><span style={{ left: `${career.settings[st.id] * 100}%` }} /></span>
              <span className="feel__ends"><span>{st.low}</span><span>{st.high}</span></span>
            </li>
          ))}
        </ul>
      </section>

      <section className="career__route" aria-labelledby="route-title">
        <h2 id="route-title">The route in India</h2>
        <p className="fine">
          <strong>Typical route, verify with the official body.</strong> This is our general reading of how people usually enter
          this career, not an eligibility rule. We don&rsquo;t give percentages, age limits, fees or exam patterns.
        </p>
        <dl className="route">
          <div><dt>Usually starts from</dt><dd>{streams.join(' · ')}</dd></div>
          <div><dt>Typical study length</dt><dd>{STUDY_LABELS[career.entry.studyYears]}</dd></div>
        </dl>
        <h3 className="route__h">Entrance exam and governing body</h3>
        {routes.length === 0 ? (
          <p>{CHECK_TEXT}.</p>
        ) : (
          <ul className="route__list">
            {routes.map((r, i) => (
              <li key={i}>
                {r.hadExam && <span><span className="route__k">Exam:</span> <Named item={r.exam} /></span>}
                {r.hadExam && r.hadBody && ' · '}
                {r.hadBody && <span><span className="route__k">Body:</span> <Named item={r.body} /></span>}
              </li>
            ))}
          </ul>
        )}
        <p className="fine">
          A name is shown with a link only if its official site loaded and mentioned it when we last checked
          {verifiedOn ? ` (${verifiedOn})` : ''}, or if a person confirmed it by hand (the date is shown next to it). Otherwise we say &ldquo;{CHECK_TEXT}&rdquo;.
        </p>
      </section>

      <SkillGapSection career={career} />

      <Roadmap career={career} />

      <section aria-labelledby="pay-title">
        <h2 id="pay-title">Salary and outlook</h2>
        <div className="pending-row">
          <DataPending label="Salary" />
          <DataPending label="Outlook" />
        </div>
        <p className="fine">
          We show these once a cited Indian source is connected, with its source and date. O*NET is US data, so we
          don&rsquo;t use it for pay or outlook in India, and we won&rsquo;t guess numbers.
        </p>
      </section>

      <section aria-labelledby="learn-title">
        <h2 id="learn-title">Learning resources</h2>
        <p>None added yet. We only list links we have checked.</p>
      </section>

      {related.length > 0 && (
        <section aria-labelledby="rel-title">
          <h2 id="rel-title">Related careers</h2>
          <p className="fine">Nearest by interest profile.</p>
          <ul className="related">
            {related.map((r) => (
              <li key={r.id}>
                <Link to={`/careers/${r.id}`}>{r.title}</Link>
                <span className="fine"> {domainLabel(r.domain)}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="fine career__source">
        Source: {careersMeta.source} ({careersMeta.release.replace(' Release', '')}) by the U.S. Department of Labor, Employment and
        Training Administration, used under {careersMeta.license}. PATHFINDER has modified this information. USDOL/ETA has not
        approved, endorsed, or tested these modifications.
      </p>
    </article>
  );
}
