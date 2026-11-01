import { Link } from 'react-router-dom';
import { AREA_BY_ID } from '../../data/areas.js';
import { MIN_MATCH_PERCENT } from '../../engine/tiers.js';
import WhyMatch from './WhyMatch.jsx';

/** One ranked career: score as a label and a neutral bar, the "why", and a way in. */
export default function MatchItem({ item, quiz, total, open = false }) {
  const { career, percent, rank } = item;

  return (
    <li className="result">
      <div className="result__head">
        <span className="match__rank" aria-hidden="true">{rank}</span>
        <h3 className="result__title">
          <Link to={`/careers/${career.id}`}>{career.title}</Link>
        </h3>
        <p className="result__score">
          <span className="match__pct">{percent}%</span> match score
          <span className="result__rank"> · ranked {rank} of {total}</span>
        </p>
      </div>
      <p className="result__area">{AREA_BY_ID[career.area]?.label}</p>
      <div className="match__bar" aria-hidden="true">
        <span style={{ width: `${percent}%` }} />
      </div>
      {percent < MIN_MATCH_PERCENT && (
        <p className="result__floor">Below the {MIN_MATCH_PERCENT}% line for a match: shown only as a different area to explore.</p>
      )}
      <p className="result__overview">{career.overview}</p>
      <WhyMatch item={item} quiz={quiz} open={open} />
    </li>
  );
}
