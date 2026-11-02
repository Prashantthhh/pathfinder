import { Link } from 'react-router-dom';
import { TYPES, TYPE_NAMES } from '../../engine/hexmap.js';
import { CAREER_COUNT_BY_DOMAIN } from '../../data/domainsIndex.js';

/**
 * What the map is pointing at. The six bars are the O*NET interest scores that put
 * the domain where it is on the map (average of its representative occupations).
 */
export default function DomainReadout({ domain, groups, id }) {
  const group = domain && groups.find((g) => g.id === domain.group);
  return (
    <div className="readout" id={id} role="status" aria-live="polite">
      {!domain ? (
        <>
          <p className="readout__kicker">Nova is pointing at nothing yet</p>
          <p className="readout__lead">Hover, tap or arrow-key to a dot to see what is there.</p>
          <p className="fine">Each dot is a career domain. Where it sits on the map comes from the interests of the people who work in it.</p>
        </>
      ) : (
        <>
          <p className="readout__kicker">{group?.label}</p>
          <h3 className="readout__title">{domain.label}</h3>
          <p>{domain.blurb}</p>

          <p className="readout__sub">
            Mostly <strong>{TYPE_NAMES[domain.primary]}</strong>, then <strong>{TYPE_NAMES[domain.secondary]}</strong>
          </p>
          <ul className="bars">
            {TYPES.map((t) => (
              <li key={t} className={t === domain.primary ? 'bars__row is-primary' : 'bars__row'} style={{ '--t': `var(--${t.toLowerCase()})` }}>
                <span className="bars__t" aria-hidden="true">{t}</span>
                <span className="bars__name">{TYPE_NAMES[t]}</span>
                <span className="bars__track" aria-hidden="true"><span style={{ width: `${((domain.riasec[t] - 1) / 6) * 100}%` }} /></span>
                <span className="bars__v">{domain.riasec[t].toFixed(1)} of 7</span>
              </li>
            ))}
          </ul>
          <p className="fine readout__src">
            Based on O*NET occupations (US): {domain.occupations.map((o) => o.title).join(', ')}.
          </p>
          <p className="readout__go">
            {CAREER_COUNT_BY_DOMAIN[domain.id] > 0 ? (
              <Link to={`/explore?domain=${domain.id}`}>
                See the {CAREER_COUNT_BY_DOMAIN[domain.id]} {CAREER_COUNT_BY_DOMAIN[domain.id] === 1 ? 'career' : 'careers'} in this domain
              </Link>
            ) : (
              <span className="fine">No careers in this domain yet.</span>
            )}
          </p>
        </>
      )}
    </div>
  );
}
