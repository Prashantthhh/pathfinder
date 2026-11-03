import domainData from '../../data/domains.json';
import { TYPES, CORNERS, cornerAngle } from '../../engine/hexmap.js';
import { CENTER, RADIUS, SIZE, toPx } from './geometry.js';

const { domains } = domainData;
const rad = (d) => (d * Math.PI) / 180;
const typeVar = (t) => `var(--${t.toLowerCase()})`;

/**
 * A small static copy of the interest map for other pages: all 35 domains as dots, the student's
 * pin (if they have one) with their three nearest domains ringed, and optionally one domain
 * named (the career being viewed). Decorative: the same facts are given in text beside it.
 */
export default function MiniMap({ you = null, focusId = null, label }) {
  const near = new Set(you?.near.map((n) => n.id) ?? []);
  const focus = domains.find((d) => d.id === focusId) ?? null;
  const hex = CORNERS.map((c) => `${toPx(c.x).toFixed(1)},${toPx(c.y).toFixed(1)}`).join(' ');
  const px = you ? toPx(you.x) : 0;
  const py = you ? toPx(you.y) : 0;
  // keep the focus label inside the box: anchor it toward the centre
  const fx = focus ? toPx(focus.x) : 0;
  const fy = focus ? toPx(focus.y) : 0;
  const anchor = fx > CENTER + 40 ? 'end' : fx < CENTER - 40 ? 'start' : 'middle';

  return (
    <svg className="minimap" viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={label} data-testid="minimap">
      <rect width={SIZE} height={SIZE} rx="28" className="minimap__sea" />
      <polygon points={hex} className="minimap__hex" />
      {TYPES.map((t, i) => {
        const a = rad(cornerAngle(i));
        return (
          <text key={t} x={CENTER + RADIUS * 1.2 * Math.cos(a)} y={CENTER + RADIUS * 1.2 * Math.sin(a) + 22} textAnchor="middle" className="minimap__letter" style={{ fill: typeVar(t) }}>{t}</text>
        );
      })}
      {you && you.near.map((n) => {
        const d = domains.find((x) => x.id === n.id);
        return <line key={n.id} x1={px} y1={py} x2={toPx(d.x)} y2={toPx(d.y)} className="minimap__link" />;
      })}
      {domains.map((d) => (
        <circle key={d.id} cx={toPx(d.x)} cy={toPx(d.y)} r={d.id === focusId ? 17 : near.has(d.id) ? 15 : 11} className={`minimap__dot${near.has(d.id) ? ' is-near' : ''}${d.id === focusId ? ' is-focus' : ''}`} style={{ fill: typeVar(d.primary) }} />
      ))}
      {focus && (
        <text x={fx} y={fy - 28} textAnchor={anchor} className="minimap__name">{focus.label}</text>
      )}
      {you && (
        <g transform={`translate(${px.toFixed(1)} ${py.toFixed(1)})`}>
          <path d="M0 0 C-30 -19 -30 -70 0 -76 C30 -70 30 -19 0 0Z" className="minimap__pin" />
          <circle cy="-47" r="11" className="minimap__eye" />
        </g>
      )}
    </svg>
  );
}
