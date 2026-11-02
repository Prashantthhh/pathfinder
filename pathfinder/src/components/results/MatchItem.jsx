import { Link } from 'react-router-dom';
import { domainLabel } from '../../data/domainsIndex.js';
import { MIN_MATCH_PERCENT, tierOf } from '../../engine/tiers.js';
import WhyMatch from './WhyMatch.jsx';

const firstSentence = (text) => {
  const m = text.match(/^.*?[.!?](\s|$)/);
  return m ? m[0].trim() : text;
};

/**
 * One ranked career: score as a label and a neutral bar, the "why", and a way in.
 * Below the match line (an alternative at 45-49%) no number, bar or rank is shown,
 * only that it is below the line, so it can't be read as a match.
 * `showFit` adds the typical-route reasons that put a match under "Explore further".
 */
export default function MatchItem({ item, quiz, total, open = false, showFit = false }) {
  const { career, percent, fit } = item;
  const isMatch = percent >= MIN_MATCH_PERCENT;
  const tier = isMatch ? tierOf(percent) : null;

  return (
    <li className="result">
      <div className="result__head">
        <h3 className="result__title">
          <Link to={`/careers/${career.id}`}>{career.title}</Link>
        </h3>
        {isMatch ? (
          <p className="result__score">
            <span className="match__pct">{percent}%</span> match score
            <span className="result__rank"> · {tier.label.replace(' matches', ' match')}</span>
          </p>
        ) : (
          <p className="result__score result__score--low">Below the {MIN_MATCH_PERCENT}% match line</p>
        )}
      </div>
      <p className="result__area">{domainLabel(career.domain)}</p>
      {isMatch ? (
        <div className="match__bar" aria-hidden="true">
          <span style={{ width: `${percent}%` }} />
        </div>
      ) : (
        <p className="result__floor">
          It is shown only as a different domain to explore, because it sits below the {MIN_MATCH_PERCENT}% line for a match.
        </p>
      )}
      {showFit && fit.reasons.length > 0 && (
        <ul className="result__fit" aria-label="Why this is under Explore further">
          {fit.reasons.map((r) => <li key={r.text}>{r.text}</li>)}
          <li className="result__fit-note">Typical route, verify with the official body.</li>
        </ul>
      )}
      <p className="result__overview">{firstSentence(career.description)}</p>
      {career.onet.loose && <p className="result__loose">Approximate match to O*NET: {career.onet.loose}</p>}
      <WhyMatch item={item} quiz={quiz} open={open} />
    </li>
  );
}
