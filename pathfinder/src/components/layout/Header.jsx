import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { starTips } from '../nova/starPath.js';

function BrandMark() {
  const tips = useMemo(() => starTips(50, 50, { long: 46, short: 31, valley: 12 }), []);
  return (
    <svg viewBox="0 0 100 100" width="32" height="32" aria-hidden="true" focusable="false" className="brand__mark">
      {tips.map((t, i) => (
        <g key={i} className={`nova__tip nova__tip--${t.north ? 'north' : t.kind}`}>
          <path d={t.leftFacet} className="nova__facet nova__facet--lt" />
          <path d={t.rightFacet} className="nova__facet nova__facet--dk" />
          <path d={t.d} className="brand__outline" />
        </g>
      ))}
    </svg>
  );
}

const LINKS = [
  { to: '/quiz', label: 'Find your career' },
  { to: '/explore', label: 'Explore careers' },
  { to: '/profile', label: 'My Career DNA' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/nova', label: 'Ask Nova' },
];

export default function Header() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();

  const toggleRef = useRef(null);

  useEffect(() => setOpen(false), [pathname]);

  // Escape closes the open menu and puts focus back on the button that opened it
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

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
          ref={toggleRef}
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
