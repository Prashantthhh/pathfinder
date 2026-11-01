import { useMemo } from 'react';
import { starTips } from './starPath.js';

export const NOVA_MOODS = ['idle', 'happy', 'curious', 'thinking'];

const EYES = {
  idle: (
    <>
      <circle cx="88" cy="97" r="3.4" />
      <circle cx="112" cy="97" r="3.4" />
    </>
  ),
  happy: (
    <>
      <path d="M82.5 99 Q88 91 93.5 99" className="nova__line" />
      <path d="M106.5 99 Q112 91 117.5 99" className="nova__line" />
    </>
  ),
  curious: (
    <>
      <circle cx="88" cy="98" r="4.6" />
      <circle cx="112" cy="98" r="4.6" />
      <path d="M81 87 L94 83.5" className="nova__line" />
      <path d="M106 86 L119 87.5" className="nova__line" />
    </>
  ),
  thinking: (
    <>
      <circle cx="88" cy="97" r="5.6" className="nova__eye-white" />
      <circle cx="112" cy="97" r="5.6" className="nova__eye-white" />
      <circle cx="90" cy="95" r="2.6" />
      <circle cx="114" cy="95" r="2.6" />
    </>
  ),
};

const MOUTHS = {
  idle: <path d="M90 113 Q100 120 110 113" className="nova__line" />,
  happy: <path d="M87 108.5 Q100 128 113 108.5 Z" className="nova__mouth-open" />,
  curious: <ellipse cx="100" cy="115" rx="3.6" ry="4.6" />,
  thinking: <path d="M92 115 L107 111.5" className="nova__line" />,
};

/**
 * Nova, a small star-compass character. Pure SVG.
 *
 * - `mood` changes the face only; what Nova says is up to the caller.
 * - `label`: accessible name. When omitted the SVG is decorative (aria-hidden),
 *   which is right when Nova sits next to text that already says the same thing.
 * - `reactKey`: change it to replay the small bounce when Nova reacts to something new.
 */
export default function Nova({ mood = 'idle', size = 160, label, reactKey, className = '' }) {
  const tips = useMemo(() => starTips(100, 100), []);
  const m = NOVA_MOODS.includes(mood) ? mood : 'idle';
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg
      className={`nova nova--${m} ${className}`}
      viewBox="0 0 200 200"
      width={size}
      height={size}
      focusable="false"
      data-mood={m}
      {...a11y}
    >
      <g key={reactKey} className="nova__body">
        <g className="nova__star">
          {tips.map((t, i) => (
            <path key={i} d={t.d} className={`nova__tip nova__tip--${t.north ? 'north' : t.kind}`} />
          ))}
        </g>
        <circle cx="100" cy="100" r="43" className="nova__bezel" />
        <circle cx="100" cy="100" r="37" className="nova__face" />
        <g className="nova__features">
          {m === 'happy' && (
            <>
              <circle cx="78" cy="108" r="5" className="nova__cheek" />
              <circle cx="122" cy="108" r="5" className="nova__cheek" />
            </>
          )}
          {EYES[m]}
          {MOUTHS[m]}
        </g>
      </g>
    </svg>
  );
}
