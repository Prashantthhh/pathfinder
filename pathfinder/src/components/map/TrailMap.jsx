import { Link } from 'react-router-dom';
import { AREAS, TRAILHEAD } from '../../data/areas.js';
import { DIMENSION_BY_ID } from '../../data/dimensions.js';
import { smoothPath } from './path.js';

const TRAIL = smoothPath([TRAILHEAD, ...AREAS]);

/**
 * Career areas as destinations on a trail map. The DOM is one ordered list of
 * links, so it reads sensibly to screen readers and collapses to a vertical
 * trail on narrow screens; from tablet width up the same list is positioned
 * over the map.
 */
export default function TrailMap({ careers }) {
  const counts = careers.reduce((acc, c) => ({ ...acc, [c.area]: (acc[c.area] ?? 0) + 1 }), {});

  return (
    <div className="trailmap">
      <svg className="trailmap__trail" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        <path d={TRAIL} className="trailmap__worn" vectorEffect="non-scaling-stroke" />
        <path d={TRAIL} className="trailmap__line" vectorEffect="non-scaling-stroke" />
      </svg>

      <Link
        to="/quiz"
        className="trailmap__start"
        style={{ '--x': `${TRAILHEAD.x}%`, '--y': `${TRAILHEAD.y}%` }}
      >
        <span className="trailmap__start-mark" aria-hidden="true" />
        Trailhead <span className="trailmap__start-note">start with the quiz</span>
      </Link>

      <ol className="trailmap__list">
        {AREAS.map((a) => {
          const n = counts[a.id] ?? 0;
          return (
            <li
              key={a.id}
              className={['dest', a.x > 66 && 'dest--left', a.y > 85 && 'dest--up'].filter(Boolean).join(' ')}
              style={{ '--x': `${a.x}%`, '--y': `${a.y}%` }}
            >
              <Link to={`/explore?area=${a.id}`} className="dest__link">
                <span className="dest__blazes" aria-hidden="true">
                  {a.dims.map((d) => (
                    <span key={d} style={{ background: DIMENSION_BY_ID[d].color }} />
                  ))}
                </span>
                <span className="dest__text">
                  <span className="dest__name">{a.label}</span>
                  <span className="dest__count">{n} {n === 1 ? 'role' : 'roles'}</span>
                  <span className="dest__blurb">{a.blurb}</span>
                </span>
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
