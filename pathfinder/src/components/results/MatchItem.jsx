import { Link } from 'react-router-dom';
import { AREA_BY_ID } from '../../data/areas.js';
import { DIMENSION_BY_ID } from '../../data/dimensions.js';
import WhyMatch from './WhyMatch.jsx';

/** One ranked career: score as a label and a bar, the "why", and a way in. */
export default function MatchItem({ item, quiz, total, open = false }) {
  const { career, percent, rank, why } = item;
  const lead = why.drivers[0] && DIMENSION_BY_ID[why.drivers[0].dim];

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
        <span style={{ width: `${percent}%`, background: lead?.color }} />
      </div>
      <p className="result__overview">{career.overview}</p>
      <WhyMatch item={item} quiz={quiz} open={open} />
    </li>
  );
}
