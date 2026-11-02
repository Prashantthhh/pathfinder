import { useId } from 'react';
import { DIMENSIONS } from '../../data/dimensions.js';
import { levelOf } from '../../engine/dna.js';

// A wider-than-tall canvas leaves room for the longer interest-type labels ("Investigative", "Enterprising").
const W = 640;
const H = 480;
const CX = W / 2;
const CY = H / 2;
const R = 140;
const LABEL_R = 172;
const RINGS = [0.25, 0.5, 0.75, 1];

const angle = (i) => -Math.PI / 2 + (2 * Math.PI * i) / DIMENSIONS.length;
const point = (i, r) => [CX + r * Math.cos(angle(i)), CY + r * Math.sin(angle(i))];
const clamp01 = (v) => Math.min(1, Math.max(0, Number(v) || 0));
const pts = (list) => list.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');

/**
 * Career DNA radar chart, hand-drawn SVG. Rings are drawn like contour lines.
 * `values` is { dimensionId: 0..1 } (relative emphasis, strongest = 1).
 * A visually-hidden table carries the same numbers for screen readers.
 */
export default function RadarChart({ values, title = 'Career DNA', description, className = '' }) {
  const uid = useId();
  const shape = DIMENSIONS.map((d, i) => point(i, R * clamp01(values?.[d.id])));
  const summary = description
    ?? `Radar chart of ${DIMENSIONS.length} dimensions. ${DIMENSIONS.map((d) => `${d.label}: ${levelOf(clamp01(values?.[d.id]))}`).join(', ')}.`;

  return (
    <figure className={`radar ${className}`}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-labelledby={`${uid}-t ${uid}-d`}
        className="radar__svg"
      >
        <title id={`${uid}-t`}>{title}</title>
        <desc id={`${uid}-d`}>{summary}</desc>

        {RINGS.map((f) => (
          <polygon
            key={f}
            points={pts(DIMENSIONS.map((_, i) => point(i, R * f)))}
            className={f === 1 ? 'radar__ring radar__ring--outer' : 'radar__ring'}
          />
        ))}
        {DIMENSIONS.map((d, i) => {
          const [x, y] = point(i, R);
          return <line key={d.id} x1={CX} y1={CY} x2={x} y2={y} className="radar__axis" />;
        })}

        <polygon points={pts(shape)} className="radar__shape" />

        {DIMENSIONS.map((d, i) => {
          const [vx, vy] = shape[i];
          const [ex, ey] = point(i, R);
          const [lx, ly] = point(i, LABEL_R);
          const cos = Math.cos(angle(i));
          const anchor = cos > 0.3 ? 'start' : cos < -0.3 ? 'end' : 'middle';
          return (
            <g key={d.id}>
              <circle cx={ex} cy={ey} r="5" fill={d.color} className="radar__tip" />
              <circle cx={vx} cy={vy} r="7" fill={d.color} className="radar__vertex" />
              <text x={lx} y={ly} textAnchor={anchor} dominantBaseline="middle" className="radar__label">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>

      <table className="sr-only">
        <caption>{title}: how much each dimension stands out compared with the others</caption>
        <thead>
          <tr><th scope="col">Dimension</th><th scope="col">Level</th></tr>
        </thead>
        <tbody>
          {DIMENSIONS.map((d) => (
            <tr key={d.id}>
              <th scope="row">{d.label}</th>
              <td>{levelOf(clamp01(values?.[d.id]))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
