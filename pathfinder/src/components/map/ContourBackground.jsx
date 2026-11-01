import { useMemo } from 'react';
import { backgroundContours } from './contours.js';

/**
 * Site-wide topographic backdrop. Purely decorative (aria-hidden), fixed behind
 * the content, and kept faint so text contrast is decided by the paper colour.
 */
export default function ContourBackground() {
  const c = useMemo(() => backgroundContours(), []);
  return (
    <svg
      className="contours"
      viewBox={`0 0 ${c.width} ${c.height}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <path className="contours__minor" d={c.minor} />
      <path className="contours__index" d={c.index} />
    </svg>
  );
}
