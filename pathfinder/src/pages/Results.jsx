import { Link, useNavigate } from 'react-router-dom';
import Nova from '../components/nova/Nova.jsx';
import NovaBubble from '../components/nova/NovaBubble.jsx';
import MatchItem from '../components/results/MatchItem.jsx';
import SignLink from '../components/common/SignLink.jsx';
import ConfirmAction from '../components/common/ConfirmAction.jsx';
import { DIMENSION_BY_ID } from '../data/dimensions.js';
import { groupByTier, tierOf } from '../engine/tiers.js';
import { useProfile } from '../state/ProfileContext.jsx';
import useTitle from '../hooks/useTitle.js';

const list = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

function Empty() {
  return (
    <section className="page page--narrow stub" aria-labelledby="res-title">
      <Nova size={120} mood="curious" />
      <h1 id="res-title">No matches yet</h1>
      <p>Answer a few quiz questions and your matches will show up here, with the reasons behind each one.</p>
      <SignLink to="/quiz">Find your career</SignLink>
    </section>
  );
}

export default function Results() {
  useTitle('Your matches');
  const p = useProfile();
  const navigate = useNavigate();
  const { result, profile, quiz, careers } = p;

  if (result.insufficient) return <Empty />;

  const incomplete = p.status !== 'complete';
  const topDims = Object.entries(profile.display)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([d]) => DIMENSION_BY_ID[d]);

  const groups = groupByTier(result.matches);
  const strong = groups.some((g) => g.tier.id === 'strong');
  const novaText = strong
    ? `Your answers leaned most on ${list(topDims.map((d) => d.label))}. These are the careers whose profiles line up most closely.`
    : `Your answers are spread across several areas, so no career lines up very closely. That is normal, and it is a good reason to explore widely.`;

  const review = () => {
    p.reopen(0);
    navigate('/quiz', { state: { review: true } });
  };

  return (
    <div className="page results">
      <header className="results__intro">
        <div>
          <p className="eyebrow">Your trail map</p>
          <h1>Your matches</h1>
          <p className="lede">
            Each career is scored against the profile your answers built. Open &ldquo;Why this
            match&rdquo; on any of them to see what pushed it up.
          </p>
          <p className="note">
            <strong>A match score is not a prediction of success.</strong> It shows how closely the
            shape of your answers lines up with a career&rsquo;s profile. The career profiles were set
            by hand for this project, so use the scores to decide what to explore, not what to become.
          </p>
        </div>
        <div className="results__nova">
          <NovaBubble live>{novaText}</NovaBubble>
          <Nova size={130} mood={strong ? 'happy' : 'thinking'} />
        </div>
      </header>

      {incomplete && (
        <p className="banner" role="status">
          You haven&rsquo;t finished the quiz, so these matches are based on {p.answered} of {p.total} answers and
          may change. <Link to="/quiz">Continue the quiz</Link>
        </p>
      )}

      <p className="results__dims">
        Strongest in your profile:{' '}
        {topDims.map((d) => (
          <span key={d.id} className="chip">
            <span className="chip__blaze" style={{ background: d.color }} aria-hidden="true" />
            {d.label}
          </span>
        ))}{' '}
        <Link to="/profile">See your Career DNA</Link>
      </p>

      {groups.map(({ tier, items }) => (
        <section key={tier.id} className="results__group" aria-labelledby={`tier-${tier.id}`}>
          <h2 id={`tier-${tier.id}`}>{tier.label}</h2>
          <p className="section__intro">{tier.blurb}</p>
          <ol className="results__list">
            {items.map((m) => (
              <MatchItem key={m.career.id} item={m} quiz={quiz} total={careers.length} open={m.rank === 1} />
            ))}
          </ol>
        </section>
      ))}
      <p className="fine">
        The bands (80% and above, 60–79%, below 60%) are rough reading aids, not meaningful cut-offs.
      </p>

      {result.alternatives.length > 0 && (
        <section className="results__group" aria-labelledby="alts-title">
          <h2 id="alts-title">Other trails worth a look</h2>
          <p className="section__intro">
            These come from areas your top matches don&rsquo;t cover, so you can see more of the map.
            They don&rsquo;t have to be your next-best scores, and they are not second prizes.
          </p>
          <ol className="results__list">
            {result.alternatives.map((m) => (
              <MatchItem key={m.career.id} item={m} quiz={quiz} total={careers.length} />
            ))}
          </ol>
        </section>
      )}

      <details className="allranked">
        <summary>See all {careers.length} careers ranked</summary>
        <ol className="allranked__list">
          {result.ranked.map((r) => (
            <li key={r.career.id}>
              <Link to={`/careers/${r.career.id}`}>{r.career.title}</Link>
              <span>
                {r.percent}% <span className="allranked__tier">{tierOf(r.percent).label}</span>
              </span>
            </li>
          ))}
        </ol>
      </details>

      <div className="results__actions">
        <SignLink to="/explore">Explore careers</SignLink>
        <SignLink to="/profile" tone="quiet">Edit my Career DNA</SignLink>
        <button type="button" className="btn btn--quiet" onClick={review}>Review my answers</button>
        <ConfirmAction
          label="Retake the quiz"
          warning="This clears all your answers."
          confirmLabel="Yes, clear and retake"
          onConfirm={() => {
            p.restart();
            navigate('/quiz', { state: { review: true } });
          }}
        />
      </div>
    </div>
  );
}
