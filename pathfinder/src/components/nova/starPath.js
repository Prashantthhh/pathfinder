// 8-point compass star centred on (cx, cy). Cardinal tips are longer than the
// intercardinal ones. Returns an SVG path "d" plus the individual tip polygons so
// the north tip can be coloured differently.

const polar = (cx, cy, r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const fmt = (p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;

export function starTips(cx, cy, { long = 92, short = 62, valley = 24 } = {}) {
  const tips = [];
  for (let k = 0; k < 8; k++) {
    const deg = -90 + k * 45;
    const r = k % 2 === 0 ? long : short;
    tips.push({
      kind: k % 2 === 0 ? 'cardinal' : 'inter',
      north: k === 0,
      d: `M${fmt(polar(cx, cy, valley, deg - 22.5))}L${fmt(polar(cx, cy, r, deg))}L${fmt(polar(cx, cy, valley, deg + 22.5))}Z`,
    });
  }
  return tips;
}
