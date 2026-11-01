// Real topographic contour lines: sample a smooth height field on a grid, then
// run marching squares at several levels. Because every line is an iso-line of
// one field, lines never cross, which is what makes it read as a map.

// [cx, cy, radius, height] in 0..1 map space (x is scaled by aspect ratio).
const HILLS = [
  [0.18, 0.28, 0.2, 1.0],
  [0.78, 0.22, 0.24, 1.15],
  [0.52, 0.74, 0.26, 0.95],
  [0.92, 0.86, 0.16, 0.75],
  [0.04, 0.92, 0.22, 0.85],
  [0.4, 0.38, 0.12, 0.45],
];

export function heightAt(x, y, aspect) {
  let h = 0;
  for (const [cx, cy, r, a] of HILLS) {
    const dx = (x - cx) * aspect;
    const dy = y - cy;
    h += a * Math.exp(-(dx * dx + dy * dy) / (2 * r * r));
  }
  // low-frequency ripple so the hills are not perfect blobs
  h += 0.07 * Math.sin(x * aspect * 9 + y * 4) + 0.05 * Math.sin(x * aspect * 17 - y * 11 + 1.3);
  return h;
}

// Case table keyed by corner bits a(tl)=8, b(tr)=4, c(br)=2, d(bl)=1.
// Edges: T = a-b, R = b-c, B = d-c, L = a-d.
const CASES = {
  1: [['L', 'B']], 2: [['B', 'R']], 3: [['L', 'R']], 4: [['T', 'R']],
  5: [['T', 'L'], ['B', 'R']], 6: [['T', 'B']], 7: [['T', 'L']], 8: [['T', 'L']],
  9: [['T', 'B']], 10: [['T', 'R'], ['L', 'B']], 11: [['T', 'R']], 12: [['L', 'R']],
  13: [['R', 'B']], 14: [['L', 'B']],
};

/**
 * @returns {number[][]} segments as [x1, y1, x2, y2] in viewBox units
 */
export function contourSegments({ width, height, cols, rows, levels, field }) {
  const cw = width / cols;
  const ch = height / rows;
  const grid = [];
  for (let j = 0; j <= rows; j++) {
    const row = [];
    for (let i = 0; i <= cols; i++) row.push(field(i / cols, j / rows));
    grid.push(row);
  }
  const out = levels.map(() => []);
  levels.forEach((t, li) => {
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = grid[j][i];
        const b = grid[j][i + 1];
        const c = grid[j + 1][i + 1];
        const d = grid[j + 1][i];
        const idx = (a >= t ? 8 : 0) | (b >= t ? 4 : 0) | (c >= t ? 2 : 0) | (d >= t ? 1 : 0);
        const segs = CASES[idx];
        if (!segs) continue;
        const x0 = i * cw;
        const y0 = j * ch;
        const lerp = (v1, v2) => (t - v1) / (v2 - v1);
        const pt = {
          T: () => [x0 + lerp(a, b) * cw, y0],
          R: () => [x0 + cw, y0 + lerp(b, c) * ch],
          B: () => [x0 + lerp(d, c) * cw, y0 + ch],
          L: () => [x0, y0 + lerp(a, d) * ch],
        };
        for (const [e1, e2] of segs) out[li].push([...pt[e1](), ...pt[e2]()]);
      }
    }
  });
  return out;
}

export function segmentsToPath(segs) {
  return segs.map(([x1, y1, x2, y2]) => `M${x1.toFixed(1)} ${y1.toFixed(1)}L${x2.toFixed(1)} ${y2.toFixed(1)}`).join('');
}

let cached = null;

/** Contour paths for the site background (computed once per page load). */
export function backgroundContours() {
  if (cached) return cached;
  const width = 1200;
  const height = 800;
  const aspect = width / height;
  const levels = [];
  for (let t = 0.12; t < 1.4; t += 0.065) levels.push(Number(t.toFixed(3)));
  const perLevel = contourSegments({
    width, height, cols: 120, rows: 80, levels, field: (x, y) => heightAt(x, y, aspect),
  });
  cached = {
    width,
    height,
    minor: segmentsToPath(perLevel.filter((_, i) => i % 5 !== 0).flat()),
    index: segmentsToPath(perLevel.filter((_, i) => i % 5 === 0).flat()),
  };
  return cached;
}
