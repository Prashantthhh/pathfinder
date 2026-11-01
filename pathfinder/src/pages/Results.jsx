import { Link, useNavigate } from 'react-router-dom';
import Nova from '../components/nova/Nova.jsx';
import NovaBubble from '../components/nova/NovaBubble.jsx';
import MatchItem from '../components/results/MatchItem.jsx';
import RunComparison from '../components/results/RunComparison.jsx';
import SignLink from '../components/common/SignLink.jsx';
import ConfirmAction from '../components/common/ConfirmAction.jsx';
import { DIMENSION_BY_ID } from '../data/dimensions.js';
import { MIN_ALT_PERCENT, MIN_MATCH_PERCENT, groupByTier, tierOf } from '../engine/tiers.js';
import { useProfile } from '../state/ProfileContext.jsx';
import useTitle from '../hooks/useTitle.js';

const list = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);
const plural = (n, one, many) => (n === 1 ? one : many);

function Empty({ answered }) {
  return (
    <section className="page page--narrow stub" aria-labelledby="res-title">
      <Nova size={120} mood="curious" />
      <h1 id="res-title">No matches yet</h1>
      {answered ? (
        <p>
          Your answers so far don&rsquo;t point toward anything yet (for example, &ldquo;none of these
          yet&rdquo; on its own says nothing about your interests). Answer a few more questions and
          your matches will show up here.
        </p>
      ) : (
        <p>Answer a few quiz questions and your matches will show up here, with the reasons behind each one.</p>
      )}
      <SignLink to="/quiz">{answered ? 'Continue the quiz' : 'Find your career'}</SignLink>
    </section>
  );
}

export default function Results() {
  useTitle('Your matches');
  const p = useProfile();
  const navigate = useNavigate();
  const { result, profile, quiz, careers } = p;

  if (result.insufficient) return <Empty answered={p.answered > 0} />;

  const incomplete = p.status !== 'complete' && !p.edited;
  const topDims = Object.entries(profile.display)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([d]) => DIMENSION_BY_ID[d]);

  const { matches, alternatives, wanted, belowMatchFloor } = result;
  const groups = groupByTier(matches);
  const strong = groups.some((g) => g.tier.id === 'strong');
  const listed = result.ranked.filter((r) => tierOf(r.percent));

  const novaText = strong
    ? `Your answers leaned most on ${list(topDims.map((d) => d.label))}. These are the careers whose profiles line up most closely.`
    : matches.length
      ? 'Your answers are spread across several areas, so no career lines up very closely. That is normal, and a good reason to explore widely.'
      : `None of the ${careers.length} careers reached a ${MIN_MATCH_PERCENT}% match yet. More answers will sharpen the picture.`;

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

      {p.edited && (
        <p className="banner" role="status">
          These matches use your <strong>edited Career DNA</strong>, not only your quiz answers.{' '}
          <Link to="/profile">Open Career DNA</Link>
        </p>
      )}

      {p.previous && matches.length > 0 && <RunComparison previous={p.previous} matches={matches} careers={careers} />}

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

      {matches.length === 0 && (
        <p className="banner" role="status">
          No career reaches a {MIN_MATCH_PERCENT}% match score with your answers so far, so none is
          presented as a match.
        </p>
      )}

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

      {matches.length > 0 && matches.length < wanted.top && (
        <p className="fine" data-testid="fewer-matches">
          Showing {matches.length} {plural(matches.length, 'match', 'matches')} rather than {wanted.top}: the
          other careers score below {MIN_MATCH_PERCENT}%, and we don&rsquo;t present anything below that as a match.
        </p>
      )}
      <p className="fine">
        Bands: strong is 80% and above, worth exploring is 65–79%, partial overlap is 50–64%. They are reading
        aids, not cut-offs with any meaning on their own.
      </p>

      <section className="results__group" aria-labelledby="alts-title">
        <h2 id="alts-title">Other trails worth a look</h2>
        <p className="section__intro">
          These come from areas your top matches don&rsquo;t cover, so you can see more of the map.
          They are not second prizes, and only careers scoring {MIN_ALT_PERCENT}% or more are suggested.
        </p>
        {alternatives.length > 0 && (
          <ol className="results__list">
            {alternatives.map((m) => (
              <MatchItem key={m.career.id} item={m} quiz={quiz} total={careers.length} />
            ))}
          </ol>
        )}
        {alternatives.length < wanted.alternatives && (
          <p className="fine" data-testid="fewer-alternatives">
            {alternatives.length === 0
              ? `No other career reaches a ${MIN_ALT_PERCENT}% match score, so there are no alternatives to suggest right now.`
              : `Showing ${alternatives.length} because only ${alternatives.length} other ${plural(alternatives.length, 'career reaches', 'careers reach')} a ${MIN_ALT_PERCENT}% match score or higher.`}
          </p>
        )}
      </section>

      <details className="allranked">
        <summary>See every career scoring {MIN_MATCH_PERCENT}% or more ({listed.length})</summary>
        <ol className="allranked__list">
          {listed.map((r) => (
            <li key={r.career.id}>
              <Link to={`/careers/${r.career.id}`}>{r.career.title}</Link>
              <span>
                {r.percent}% <span className="allranked__tier">{tierOf(r.percent).label}</span>
              </span>
            </li>
          ))}
        </ol>
        {belowMatchFloor > 0 && (
          <p className="fine">
            The other {belowMatchFloor} {plural(belowMatchFloor, 'career scores', 'careers score')} below {MIN_MATCH_PERCENT}% and
            {' '}{plural(belowMatchFloor, 'is', 'are')} not listed as {plural(belowMatchFloor, 'a match', 'matches')}.
          </p>
        )}
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
