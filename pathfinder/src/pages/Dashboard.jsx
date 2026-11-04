import { Link } from 'react-router-dom';
import YourPlace from '../components/map/YourPlace.jsx';
import SaveButton from '../components/common/SaveButton.jsx';
import CompareButton from '../components/common/CompareButton.jsx';
import SignLink from '../components/common/SignLink.jsx';
import { domainLabel } from '../data/domainsIndex.js';
import { nextStep } from '../engine/nextStep.js';
import { progress } from '../engine/roadmap.js';
import { skillGap } from '../engine/skillGap.js';
import { MIN_MATCH_PERCENT, tierOf } from '../engine/tiers.js';
import { useProfile } from '../state/ProfileContext.jsx';
import useTitle from '../hooks/useTitle.js';

/**
 * Everything the student has done in one place: saved careers, roadmap ticks, skill ratings and one
 * next step. Only the student's own data is shown: no scores of progress, rankings or badges.
 */
export default function Dashboard() {
  useTitle('My dashboard', 'Your saved careers, roadmap progress and one suggested next step, kept on this device.');
  const p = useProfile();
  const hasProfile = !p.result.insufficient;
  const saved = p.saved.map((id) => p.careers.find((c) => c.id === id)).filter(Boolean);
  const top = hasProfile ? p.result.matches[0]?.career ?? null : null;
  const step = nextStep({
    status: p.status, answered: p.answered, insufficient: p.result.insufficient,
    saved: p.saved, careers: p.careers, roadmap: p.roadmap, ratings: p.skills,
    topMatch: top ? { id: top.id, title: top.title } : null,
  });

  return (
    <div className="page dashboard">
      <p className="eyebrow">Your trail so far</p>
      <h1>My dashboard</h1>
      <p className="lede">Your saved careers, the roadmap steps you have ticked and a next step. It is all on this device, and all from what you did here.</p>

      <section className="dash__next" aria-labelledby="next-title" data-testid="next-step">
        <p className="dash__kicker" id="next-title">Your next step</p>
        <h2 className="dash__next-h">{step.title}</h2>
        <p>{step.text}</p>
        <SignLink to={step.to}>{step.label}</SignLink>
      </section>

      <section className="dash__sec" aria-labelledby="saved-title">
        <h2 id="saved-title">Saved careers</h2>
        {saved.length === 0 ? (
          <p data-testid="dash-no-saved">
            Nothing saved yet. Press <strong>Save</strong> on a career in <Link to="/explore">Explore</Link>
            {hasProfile && <> or in <Link to="/results">your matches</Link></>} and it appears here with a roadmap.
          </p>
        ) : (
          <ul className="dash__list">
            {saved.map((c) => {
              const pr = progress(c, p.roadmap[c.id]);
              const g = skillGap(c, p.skills);
              const pct = hasProfile ? p.percentById[c.id] : null;
              return (
                <li key={c.id} className="dash__item" data-career={c.id}>
                  <div className="dash__item-main">
                    <p className="result__area">{domainLabel(c.domain)}</p>
                    <h3 className="dash__item-h"><Link to={`/careers/${c.id}`}>{c.title}</Link></h3>
                    <p className="dash__facts">
                      {pct != null && (pct >= MIN_MATCH_PERCENT ? <span>{pct}% match score · {tierOf(pct).label.replace(' matches', ' match')}</span> : <span>Below the {MIN_MATCH_PERCENT}% match line</span>)}
                      {pct != null && ' · '}
                      <span>Skills and knowledge: {g.confident} of {g.total} confident{g.unrated === g.total ? ' (none rated yet)' : ''}</span>
                    </p>
                    <p className="roadmap__progress" data-testid="dash-progress">
                      Roadmap: {pr.done} of {pr.total} stages ticked
                      <span className="roadmap__bar" aria-hidden="true"><span style={{ width: `${(pr.done / pr.total) * 100}%` }} /></span>
                    </p>
                    <p className="dash__next-stage">
                      {pr.next ? <>Next stage: <strong>{pr.next.title}</strong>. <Link to={`/careers/${c.id}#roadmap`}>Open the roadmap</Link></> : <>Every stage is ticked. <Link to={`/careers/${c.id}#roadmap`}>Open the roadmap</Link></>}
                    </p>
                  </div>
                  <div className="dash__item-side">
                    <SaveButton career={c} />
                    <CompareButton career={c} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        {p.compare.length >= 2 && <p><Link to="/compare">See your comparison of {p.compare.length} careers</Link></p>}
      </section>

      {hasProfile && (
        <section className="dash__sec" aria-labelledby="where-title">
          <h2 id="where-title">Where you are on the map</h2>
          <YourPlace />
        </section>
      )}

      {p.goal && (
        <section className="dash__sec" aria-labelledby="goal-title">
          <h2 id="goal-title">Your career goal</h2>
          <p className="dash__goal">{p.goal}</p>
          <p className="fine">Written by you. <Link to="/profile">Edit it in Career DNA</Link>.</p>
        </section>
      )}
    </div>
  );
}
