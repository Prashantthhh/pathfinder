import { useMemo, useRef, useState } from 'react';
import Nova from '../nova/Nova.jsx';
import { TYPES, TYPE_NAMES, CORNERS, bearingOf, cornerAngle } from '../../engine/hexmap.js';
import { TYPE_NICKNAMES } from '../../data/palette.js';
import { CENTER, RADIUS, SIZE, toPct, toPx } from './geometry.js';
import { buildTerrain } from './terrain.js';
import { isArrow, neighbour } from './nav.js';

const rad = (d) => (d * Math.PI) / 180;
const typeVar = (t) => `var(--${t.toLowerCase()})`;

function wedgePath(i) {
  const a1 = rad(cornerAngle(i) - 30);
  const a2 = rad(cornerAngle(i) + 30);
  const R = RADIUS * 1.04;
  const p = (a) => `${(CENTER + R * Math.cos(a)).toFixed(1)} ${(CENTER + R * Math.sin(a)).toFixed(1)}`;
  return `M${CENTER} ${CENTER}L${p(a1)}L${p(a2)}Z`;
}

function CornerLabel({ i, type }) {
  const a = rad(cornerAngle(i));
  const cos = Math.cos(a);
  const x = CENTER + RADIUS * 1.16 * cos;
  const y = CENTER + RADIUS * 1.16 * Math.sin(a);
  const anchor = Math.abs(cos) < 0.3 ? 'middle' : cos > 0 ? 'start' : 'end';
  const dy = i === 0 ? -52 : i === 3 ? 30 : -12;
  return (
    <g className="hexmap__corner" textAnchor={anchor} style={{ '--t': typeVar(type) }}>
      <text x={x} y={y + dy} className="hexmap__corner-letter">{type}</text>
      <text x={x} y={y + dy + 28} className="hexmap__corner-name">{TYPE_NAMES[type]}</text>
      <text x={x} y={y + dy + 50} className="hexmap__corner-nick">{TYPE_NICKNAMES[type]}</text>
    </g>
  );
}

/**
 * The interest map: Holland's hexagon as terrain, the 35 domains as places, and
 * Nova at the centre pointing at whichever domain is active.
 *
 * Interaction: hover or focus previews a domain, click/Enter selects it. The dots
 * share one tab stop (roving tabindex); arrow keys move to the nearest neighbour.
 * The domain list beside it does the same job for touch and screen readers.
 */
export default function HexMap({ domains, activeId, selectedId, onHover, onSelect }) {
  const terrain = useMemo(() => {
    const hills = [{ x: 0, y: 0, weight: 1.1 }, ...domains.map((d) => ({ x: d.x, y: d.y, weight: 1 }))];
    return buildTerrain({ hills, size: SIZE, radius: RADIUS, cols: 120, levels: [0.4, 0.8, 1.2, 1.65, 2.15] });
  }, [domains]);

  const points = useMemo(() => domains.map((d) => ({ id: d.id, x: d.x, y: d.y })), [domains]);
  const refs = useRef({});
  const [rovingId, setRovingId] = useState(null);
  const tabId = rovingId ?? selectedId ?? domains[0].id;

  const active = domains.find((d) => d.id === activeId) ?? null;
  const bearing = active ? bearingOf(active) : 0;

  const onKeyDown = (e, id) => {
    if (!isArrow(e.key)) return;
    const next = neighbour(points, id, e.key);
    if (!next) return;
    e.preventDefault();
    setRovingId(next);
    refs.current[next]?.focus();
  };

  const hexPoints = CORNERS.map((c) => `${toPx(c.x).toFixed(1)},${toPx(c.y).toFixed(1)}`).join(' ');

  return (
    <div className="hexmap">
      <svg className="hexmap__svg" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" focusable="false">
        <defs>
          <radialGradient id="hexmap-fade" cx="50%" cy="50%" r="50%">
            <stop offset="0.12" stopColor="#fff" stopOpacity="0" />
            <stop offset="0.45" stopColor="#fff" stopOpacity="1" />
            <stop offset="0.85" stopColor="#fff" stopOpacity="0.35" />
            <stop offset="1" stopColor="#fff" stopOpacity="0" />
          </radialGradient>
          <mask id="hexmap-wedge-mask">
            <circle cx={CENTER} cy={CENTER} r={RADIUS * 1.2} fill="url(#hexmap-fade)" />
          </mask>
          <radialGradient id="hexmap-sea" cx="50%" cy="50%" r="70%">
            <stop offset="0" stopColor="#12395a" />
            <stop offset="1" stopColor="#081827" />
          </radialGradient>
        </defs>
        <rect width={SIZE} height={SIZE} fill="url(#hexmap-sea)" rx="28" />

        <g mask="url(#hexmap-wedge-mask)">
          {TYPES.map((t, i) => (
            <path key={t} d={wedgePath(i)} className="hexmap__wedge" style={{ '--t': typeVar(t) }} />
          ))}
        </g>

        {terrain.levels.map((l, k) => (
          <path key={l.level} d={l.d} fillRule="evenodd" className={k === 0 ? 'hexmap__land hexmap__land--coast' : 'hexmap__land'} style={{ '--k': k }} />
        ))}

        {[0.5].map((r) => (
          <circle key={r} cx={CENTER} cy={CENTER} r={RADIUS * r} className="hexmap__ring" />
        ))}
        <polygon points={hexPoints} className="hexmap__hex" />
        {TYPES.map((t, i) => {
          const a = rad(cornerAngle(i) + 30);
          return (
            <line key={t} x1={CENTER} y1={CENTER} x2={CENTER + RADIUS * 1.04 * Math.cos(a)} y2={CENTER + RADIUS * 1.04 * Math.sin(a)} className="hexmap__spoke" />
          );
        })}

        {TYPES.map((t, i) => (
          <CornerLabel key={t} i={i} type={t} />
        ))}

        {active && (
          <g className="hexmap__route" key={active.id}>
            <line x1={CENTER} y1={CENTER} x2={toPx(active.x)} y2={toPx(active.y)} />
          </g>
        )}
      </svg>

      <div className="hexmap__nova">
        <Nova size={120} mood={active ? 'happy' : 'idle'} bearing={bearing} scan={!active} reactKey={active?.id ?? 'rest'} />
      </div>

      <div className="hexmap__dots" role="group" aria-label="Career domains on the map. Use the arrow keys to move between neighbouring domains, Enter to select.">
        <ol className="hexmap__list">
        {domains.map((d) => {
          const isActive = d.id === activeId;
          const isSelected = d.id === selectedId;
          const side = d.x > 0.38 ? 'left' : d.x < -0.38 ? 'right' : 'centre';
          // tooltips point outward from the centre so they never cover Nova or the route line
          const vert = d.y > 0 ? (d.y > 0.7 ? 'above' : 'below') : (d.y < -0.7 ? 'below' : 'above');
          return (
            <li key={d.id} style={{ left: `${toPct(d.x)}%`, top: `${toPct(d.y)}%`, '--t': typeVar(d.primary) }} className={isActive ? 'is-active' : undefined}>
              <button
                type="button"
                ref={(el) => { refs.current[d.id] = el; }}
                className={`hexmap__dot${isSelected ? ' is-selected' : ''}`}
                tabIndex={d.id === tabId ? 0 : -1}
                aria-pressed={isSelected}
                onMouseEnter={() => onHover(d.id)}
                onMouseLeave={() => onHover(null)}
                onFocus={() => {
                  setRovingId(d.id);
                  onHover(d.id);
                }}
                onBlur={() => onHover(null)}
                onKeyDown={(e) => onKeyDown(e, d.id)}
                onClick={() => onSelect(d.id)}
              >
                <span className="hexmap__dot-mark" aria-hidden="true" />
                <span className="sr-only">{d.label}</span>
              </button>
              {isActive && <span className={`hexmap__tip hexmap__tip--${side} hexmap__tip--${vert}`} aria-hidden="true">{d.label}</span>}
            </li>
          );
        })}
        </ol>
      </div>
    </div>
  );
}
