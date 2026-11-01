import { Link } from 'react-router-dom';
import { AREA_BY_ID } from '../../data/areas.js';
import { MIN_MATCH_PERCENT } from '../../engine/tiers.js';
import WhyMatch from './WhyMatch.jsx';

/**
 * One ranked career: score as a label and a neutral bar, the "why", and a way in.
 * Below the match line (an alternative at 45-49%) no number, bar or rank is shown,
 * only that it is below the line, so it can't be read as a match.
 */
export default function MatchItem({ item, quiz, total, open = false }) {
  const { career, percent, rank } = item;
  const isMatch = percent >= MIN_MATCH_PERCENT;

  return (
    <li className="result">
      <div className="result__head">
        {isMatch && <span className="match__rank" aria-hidden="true">{rank}</span>}
        <h3 className="result__title">
          <Link to={`/careers/${career.id}`}>{career.title}</Link>
        </h3>
        {isMatch ? (
          <p className="result__score">
            <span className="match__pct">{percent}%</span> match score
            <span className="result__rank"> · ranked {rank} of {total}</span>
          </p>
        ) : (
          <p className="result__score result__score--low">Below the {MIN_MATCH_PERCENT}% match line</p>
        )}
      </div>
      <p className="result__area">{AREA_BY_ID[career.area]?.label}</p>
      {isMatch ? (
        <div className="match__bar" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>
      ) : (
        <p className="result__floor">
          It is shown only as a different area to explore, because it sits below the {MIN_MATCH_PERCENT}% line for a match.
        </p>
      )}
      <p className="result__overview">{career.overview}</p>
      <WhyMatch item={item} quiz={quiz} open={open} />
    </li>
  );
}
