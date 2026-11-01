import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { starTips } from '../nova/starPath.js';

const TIPS = starTips(50, 50, { long: 46, short: 31, valley: 12 });

function BrandMark() {
  return (
    <svg viewBox="0 0 100 100" width="30" height="30" aria-hidden="true" focusable="false" className="brand__mark">
      {TIPS.map((t, i) => (
        <path key={i} d={t.d} className={`nova__tip nova__tip--${t.north ? 'north' : t.kind}`} />
      ))}
    </svg>
  );
}

const LINKS = [
  { to: '/quiz', label: 'Find your career' },
  { to: '/explore', label: 'Explore careers' },
  { to: '/profile', label: 'My Career DNA' },
  { to: '/nova', label: 'Ask Nova', tag: 'Demo' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link to="/" className="brand">
          <BrandMark />
          <span className="brand__word">PATHFINDER</span>
        </Link>

        <button
          type="button"
          className="nav-toggle"
          aria-expanded={open}
          aria-controls="site-nav"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? 'Close' : 'Menu'}
        </button>

        <nav id="site-nav" aria-label="Main" className={open ? 'site-nav is-open' : 'site-nav'}>
          <ul>
            {LINKS.map((l) => (
              <li key={l.to}>
                <NavLink to={l.to}>
                  {l.label}
                  {l.tag && <span className="nav-tag">{l.tag}</span>}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </header>
  );
}
