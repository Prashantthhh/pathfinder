import { Link } from 'react-router-dom';
import MiniMap from './MiniMap.jsx';
import useYou from '../../hooks/useYou.js';
import { CAREER_COUNT_BY_DOMAIN, domainLabel } from '../../data/domainsIndex.js';

/**
 * The student's pin on the interest map with the three nearest domains as text.
 * With `focusId` (a career page) it also names that career's domain and says whether it is one of the nearest.
 */
export default function YourPlace({ focusId = null, id }) {
  const you = useYou();
  const nearIds = you?.near.map((n) => n.id) ?? [];
  const label = you
    ? `Interest map with your pin. Nearest domains: ${you.near.map((n) => n.label).join(', ')}.${focusId ? ` ${domainLabel(focusId)} is marked.` : ''}`
    : `Interest map${focusId ? ` with ${domainLabel(focusId)} marked` : ''}. Answer the quiz to see where you land.`;

  return (
    <div className="place" data-testid="your-place" id={id}>
      <MiniMap you={you} focusId={focusId} label={label} />
      <div>
        {!you ? (
          <p>
            {focusId ? <><strong>{domainLabel(focusId)}</strong> is marked on the map. </> : null}
            <Link to="/quiz">Answer the quiz</Link> and your pin appears here, with the three domains nearest to it.
          </p>
        ) : (
          <>
            {focusId && (
              <p data-testid="place-focus">
                <strong>{domainLabel(focusId)}</strong>{' '}
                {nearIds.includes(focusId)
                  ? 'is one of the three domains nearest to where your interests point.'
                  : 'is not among your three nearest domains. That is fine: the pin is where your interests point, not a limit.'}
              </p>
            )}
            <p className="place__lead">{focusId ? 'Your three nearest domains:' : 'Where your interests point, and the three domains nearest to it:'}</p>
            <ol className="place__list">
              {you.near.map((n) => (
                <li key={n.id}>
                  {CAREER_COUNT_BY_DOMAIN[n.id] > 0 ? <Link to={`/explore?domain=${n.id}`}>{n.label}</Link> : n.label}
                </li>
              ))}
            </ol>
            <p className="fine">A place to start looking, not a score. <Link to="/">See the full map</Link></p>
          </>
        )}
      </div>
    </div>
  );
}
