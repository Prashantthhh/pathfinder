// 8-point compass star centred on (cx, cy). Cardinal tips are longer than the
// intercardinal ones. Each tip is returned whole (for the outline) and as two
// facets (light and dark halves) so the star reads as faceted, not flat.
// Tip 0 is north: the one that points at things.

const polar = (cx, cy, r, deg) => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const f = (p) => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`;

export function starTips(cx, cy, { long = 92, short = 62, valley = 24 } = {}) {
  const tips = [];
  for (let k = 0; k < 8; k++) {
    const deg = -90 + k * 45;
    const r = k % 2 === 0 ? long : short;
    const left = polar(cx, cy, valley, deg - 22.5);
    const tip = polar(cx, cy, r, deg);
    const right = polar(cx, cy, valley, deg + 22.5);
    const c = [cx, cy];
    tips.push({
      kind: k % 2 === 0 ? 'cardinal' : 'inter',
      north: k === 0,
      d: `M${f(left)}L${f(tip)}L${f(right)}Z`,
      leftFacet: `M${f(c)}L${f(left)}L${f(tip)}Z`,
      rightFacet: `M${f(c)}L${f(tip)}L${f(right)}Z`,
    });
  }
  return tips;
}
