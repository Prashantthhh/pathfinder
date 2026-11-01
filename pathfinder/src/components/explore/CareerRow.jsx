import { Link } from 'react-router-dom';
import { AREA_BY_ID } from '../../data/areas.js';
import { DIMENSIONS } from '../../data/dimensions.js';
import { LEAN_THRESHOLD } from '../../engine/explore.js';
import { MIN_MATCH_PERCENT } from '../../engine/tiers.js';
import SaveButton from '../common/SaveButton.jsx';

/** One career in the Explore list: a log entry, not a card. */
export default function CareerRow({ career, percent }) {
  const leans = DIMENSIONS.filter((d) => career.vector[d.id] >= LEAN_THRESHOLD);
  return (
    <li className="crow">
      <div className="crow__main">
        <p className="crow__area">{AREA_BY_ID[career.area]?.label}</p>
        <h3 className="crow__title"><Link to={`/careers/${career.id}`}>{career.title}</Link></h3>
        <p className="crow__overview">{career.overview}</p>
        <p className="crow__leans">
          <span className="crow__leans-label">Leans on:</span>{' '}
          {leans.map((d) => (
            <span key={d.id} className="chip chip--small">
              <span className="chip__blaze" style={{ background: d.color }} aria-hidden="true" />
              {d.label}
            </span>
          ))}
        </p>
      </div>
      <div className="crow__side">
        {percent != null && percent >= MIN_MATCH_PERCENT && (
          <p className="crow__score">
            <span className="match__pct">{percent}%</span> match score
          </p>
        )}
        {percent != null && percent < MIN_MATCH_PERCENT && (
          <p className="crow__score crow__score--low">Below the {MIN_MATCH_PERCENT}% match line for your profile</p>
        )}
        <SaveButton career={career} />
      </div>
    </li>
  );
}
