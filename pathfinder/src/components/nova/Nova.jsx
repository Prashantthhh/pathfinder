import { useId, useMemo } from 'react';
import { starTips } from './starPath.js';

export const NOVA_MOODS = ['idle', 'happy', 'curious', 'thinking'];

const EYES = {
  idle: (
    <>
      <circle cx="87" cy="98" r="4.2" />
      <circle cx="113" cy="98" r="4.2" />
      <circle cx="88.4" cy="96.6" r="1.4" className="nova__glint" />
      <circle cx="114.4" cy="96.6" r="1.4" className="nova__glint" />
    </>
  ),
  happy: (
    <>
      <path d="M80.5 100 Q87 90 93.5 100" className="nova__line" />
      <path d="M106.5 100 Q113 90 119.5 100" className="nova__line" />
    </>
  ),
  curious: (
    <>
      <circle cx="87" cy="99" r="5.4" />
      <circle cx="113" cy="99" r="5.4" />
      <circle cx="88.6" cy="97.2" r="1.7" className="nova__glint" />
      <circle cx="114.6" cy="97.2" r="1.7" className="nova__glint" />
      <path d="M79 86.5 L94 82.5" className="nova__line" />
      <path d="M106 85 L121 87.5" className="nova__line" />
    </>
  ),
  thinking: (
    <>
      <circle cx="87" cy="98" r="6.4" className="nova__eye-white" />
      <circle cx="113" cy="98" r="6.4" className="nova__eye-white" />
      <circle cx="89.6" cy="95.4" r="3" />
      <circle cx="115.6" cy="95.4" r="3" />
      <path d="M79 88 L94 90.5" className="nova__line" />
      <path d="M106 90.5 L121 88" className="nova__line" />
    </>
  ),
};

const MOUTHS = {
  idle: <path d="M90 115 Q100 122 110 115" className="nova__line" />,
  happy: <path d="M86 109.5 Q100 130 114 109.5 Z" className="nova__mouth-open" />,
  curious: <ellipse cx="100" cy="116" rx="4" ry="5" />,
  thinking: <path d="M92 117 L108 113" className="nova__line" />,
};

const SPARKLE = 'M0 -9 L2.2 -2.2 L9 0 L2.2 2.2 L0 9 L-2.2 2.2 L-9 0 L-2.2 -2.2 Z';

/**
 * Nova, the star-compass guide. Pure SVG.
 *
 * - `bearing` (degrees, clockwise from the top) swings the star so the red north
 *   tip points that way. Nova's face stays upright. Use it to point at things.
 * - `scan` makes Nova sway gently while she has nothing to point at.
 * - `mood` changes the face only; what Nova says is up to the caller.
 * - `label`: accessible name. When omitted the SVG is decorative (aria-hidden),
 *   which is right when Nova sits next to text that says the same thing.
 * - `reactKey`: change it to replay the small bounce when Nova reacts to something new.
 */
export default function Nova({ mood = 'idle', size = 160, label, reactKey, bearing = 0, scan = false, className = '' }) {
  const uid = useId().replace(/:/g, '');
  const tips = useMemo(() => starTips(100, 100), []);
  const m = NOVA_MOODS.includes(mood) ? mood : 'idle';
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };

  return (
    <svg
      className={`nova nova--${m}${scan ? ' nova--scan' : ''} ${className}`}
      viewBox="0 0 200 200"
      width={size}
      height={size}
      focusable="false"
      data-mood={m}
      {...a11y}
    >
      <defs>
        <radialGradient id={`${uid}-face`} cx="40%" cy="32%" r="75%">
          <stop offset="0" stopColor="#FFFDF2" />
          <stop offset="1" stopColor="#FFE7B0" />
        </radialGradient>
        <linearGradient id={`${uid}-bezel`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFE08A" />
          <stop offset="1" stopColor="#E09A1F" />
        </linearGradient>
      </defs>

      <g key={reactKey} className="nova__body">
        <g className="nova__aim" style={{ '--bearing': `${bearing}deg` }}>
          <g className="nova__star">
            {tips.map((t, i) => {
              const kind = t.north ? 'north' : t.kind;
              return (
                <g key={i} className={`nova__tip nova__tip--${kind}`}>
                  <path d={t.leftFacet} className="nova__facet nova__facet--lt" />
                  <path d={t.rightFacet} className="nova__facet nova__facet--dk" />
                  <path d={t.d} className="nova__outline" />
                </g>
              );
            })}
          </g>
        </g>

        <circle cx="100" cy="100" r="44" fill={`url(#${uid}-bezel)`} className="nova__bezel" />
        <circle cx="100" cy="100" r="37" fill={`url(#${uid}-face)`} className="nova__face" />
        <path d="M70 80 Q80 66 98 64" className="nova__shine" />
        <g className="nova__features">
          {m === 'happy' && (
            <>
              <circle cx="77" cy="109" r="5.5" className="nova__cheek" />
              <circle cx="123" cy="109" r="5.5" className="nova__cheek" />
            </>
          )}
          {EYES[m]}
          {MOUTHS[m]}
        </g>

        {m === 'happy' && (
          <g className="nova__sparkles">
            <path d={SPARKLE} transform="translate(176 26) scale(0.9)" className="nova__spark" />
            <path d={SPARKLE} transform="translate(24 30) scale(0.55)" className="nova__spark nova__spark--b" />
          </g>
        )}
        {m === 'curious' && (
          <text x="172" y="34" className="nova__mark" textAnchor="middle">?</text>
        )}
        {m === 'thinking' && (
          <g className="nova__dots">
            <circle cx="160" cy="30" r="3.4" />
            <circle cx="172" cy="30" r="3.4" />
            <circle cx="184" cy="30" r="3.4" />
          </g>
        )}
      </g>
    </svg>
  );
}
