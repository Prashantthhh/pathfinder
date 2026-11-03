import { Link } from 'react-router-dom';
import { DIMENSION_BY_ID } from '../../data/dimensions.js';
import { domainLabel } from '../../data/domainsIndex.js';
import { primaryType } from '../../engine/explore.js';
import { MIN_MATCH_PERCENT } from '../../engine/tiers.js';
import SaveButton from '../common/SaveButton.jsx';
import CompareButton from '../common/CompareButton.jsx';

const firstSentence = (text) => {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return m ? m[0].trim() : text;
};

/** One career in the Explore list: a log entry, not a card. */
export default function CareerRow({ career, percent }) {
  const main = DIMENSION_BY_ID[primaryType(career)];
  return (
    <li className="crow">
      <div className="crow__main">
        <p className="crow__area">{domainLabel(career.domain)}</p>
        <h3 className="crow__title"><Link to={`/careers/${career.id}`}>{career.title}</Link></h3>
        <p className="crow__overview">{firstSentence(career.description)}</p>
        <p className="crow__leans">
          <span className="crow__leans-label">Main interest:</span>{' '}
          <span className="chip chip--small">
            <span className="chip__blaze" style={{ background: main.color }} aria-hidden="true" />
            {main.label}
          </span>
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
        <CompareButton career={career} />
      </div>
    </li>
  );
}
