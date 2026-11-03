import { Link } from 'react-router-dom';
import { CAREER_COUNT_BY_DOMAIN } from '../../data/domainsIndex.js';

/** Beside the map: where the student landed and the three nearest domains, or an invitation to find out. */
export default function NearYou({ you, onPick }) {
  if (!you) {
    return (
      <div className="nearyou" data-testid="near-you-empty">
        <p className="nearyou__kicker">Where would you land?</p>
        <p>Answer the quiz and a pin appears on this map, with the three domains nearest to it.</p>
        <Link to="/quiz">Find your place</Link>
      </div>
    );
  }
  return (
    <div className="nearyou" data-testid="near-you">
      <p className="nearyou__kicker">You are here</p>
      <p className="nearyou__lead">The three domains nearest to where your interests point:</p>
      <ol className="nearyou__list">
        {you.near.map((n) => (
          <li key={n.id}>
            <button type="button" className="nearyou__pick" onClick={() => onPick(n.id)}>{n.label}</button>
            {CAREER_COUNT_BY_DOMAIN[n.id] > 0 && (
              <Link className="nearyou__go" to={`/explore?domain=${n.id}`}>
                {CAREER_COUNT_BY_DOMAIN[n.id]} {CAREER_COUNT_BY_DOMAIN[n.id] === 1 ? 'career' : 'careers'}
              </Link>
            )}
          </li>
        ))}
      </ol>
      <p className="fine">A place to start looking, not a score. <Link to="/results">See your matches</Link></p>
    </div>
  );
}
