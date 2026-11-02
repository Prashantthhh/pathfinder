// Terrain for the interest map. The height field is the sum of one hill per
// domain (plus a gentle central hill, the "trailhead"), so land rises where
// careers cluster and the contour lines mean something: tighter rings = a
// denser neighbourhood of careers.
//
// Contours are drawn with marching squares and joined into closed loops so each
// elevation level can be filled as a terrace (holes become lakes).

/** Height at a point in unit coordinates. */
export function heightAt(x, y, hills, sigma = 0.2) {
  let h = 0;
  for (const p of hills) {
    const dx = x - p.x;
    const dy = y - p.y;
    h += (p.weight ?? 1) * Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));
  }
  // low-frequency ripple so coastlines are not perfect blobs
  return h + 0.1 * Math.sin(x * 6.1 + y * 3.7) + 0.07 * Math.sin(x * 11.3 - y * 8.9 + 1.2);
}

const edgeId = (kind, i, j) => `${kind}${i},${j}`;

// corner bits: a(top-left)=8, b(top-right)=4, c(bottom-right)=2, d(bottom-left)=1
// edges: T = a-b, R = b-c, B = d-c, L = a-d
const CASES = {
  1: [['L', 'B']], 2: [['B', 'R']], 3: [['L', 'R']], 4: [['T', 'R']],
  5: [['T', 'L'], ['B', 'R']], 6: [['T', 'B']], 7: [['T', 'L']], 8: [['T', 'L']],
  9: [['T', 'B']], 10: [['T', 'R'], ['L', 'B']], 11: [['T', 'R']], 12: [['L', 'R']],
  13: [['R', 'B']], 14: [['L', 'B']],
};

/**
 * Closed contour loops of `grid` (rows+1 by cols+1 samples) at `level`.
 * Crossings are identified by their grid edge, so neighbouring cells agree on
 * them exactly and loops join without tolerance tricks.
 * @returns {{x:number,y:number}[][]} loops in grid-cell units (0..cols, 0..rows)
 */
export function contourLoops(grid, cols, rows, level) {
  const segs = [];
  for (let j = 0; j < rows; j++) {
    for (let i = 0; i < cols; i++) {
      const a = grid[j][i];
      const b = grid[j][i + 1];
      const c = grid[j + 1][i + 1];
      const d = grid[j + 1][i];
      const idx = (a >= level ? 8 : 0) | (b >= level ? 4 : 0) | (c >= level ? 2 : 0) | (d >= level ? 1 : 0);
      const cell = CASES[idx];
      if (!cell) continue;
      const id = { T: edgeId('h', i, j), B: edgeId('h', i, j + 1), L: edgeId('v', i, j), R: edgeId('v', i + 1, j) };
      for (const [e1, e2] of cell) segs.push([id[e1], id[e2]]);
    }
  }

  const point = (id) => {
    const kind = id[0];
    const [i, j] = id.slice(1).split(',').map(Number);
    if (kind === 'h') {
      const v1 = grid[j][i];
      const v2 = grid[j][i + 1];
      return { x: i + (level - v1) / (v2 - v1), y: j };
    }
    const v1 = grid[j][i];
    const v2 = grid[j + 1][i];
    return { x: i, y: j + (level - v1) / (v2 - v1) };
  };

  const byEdge = new Map();
  segs.forEach((s, n) => {
    for (const e of s) {
      if (!byEdge.has(e)) byEdge.set(e, []);
      byEdge.get(e).push(n);
    }
  });

  const used = new Array(segs.length).fill(false);
  const loops = [];
  for (let n = 0; n < segs.length; n++) {
    if (used[n]) continue;
    used[n] = true;
    const chain = [segs[n][0], segs[n][1]];
    // extend forward from the last edge
    for (;;) {
      const last = chain[chain.length - 1];
      const next = (byEdge.get(last) ?? []).find((m) => !used[m]);
      if (next === undefined) break;
      used[next] = true;
      chain.push(segs[next][0] === last ? segs[next][1] : segs[next][0]);
    }
    // extend backward from the first edge (only needed for chains that hit the border)
    for (;;) {
      const first = chain[0];
      const next = (byEdge.get(first) ?? []).find((m) => !used[m]);
      if (next === undefined) break;
      used[next] = true;
      chain.unshift(segs[next][0] === first ? segs[next][1] : segs[next][0]);
    }
    if (chain.length > 1 && chain[0] === chain[chain.length - 1]) chain.pop(); // closed loop
    loops.push(chain.map(point));
  }
  return loops;
}

/** Closed smooth path through the points (quadratic curves through edge midpoints). */
export function smoothLoop(points, scale = 1) {
  const n = points.length;
  if (n < 3) return '';
  const f = (v) => (v * scale).toFixed(1);
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
  let d = `M${f(mid(points[n - 1], points[0]).x)} ${f(mid(points[n - 1], points[0]).y)}`;
  for (let i = 0; i < n; i++) {
    const p = points[i];
    const m = mid(p, points[(i + 1) % n]);
    d += `Q${f(p.x)} ${f(p.y)} ${f(m.x)} ${f(m.y)}`;
  }
  return `${d}Z`;
}

/**
 * Terrain for the map.
 * @param {{x:number,y:number,weight?:number}[]} hills  in unit coordinates (centre 0,0; hexagon corner radius 1)
 * @returns {{ levels: {level:number, d:string}[], size:number, field: number[][] }}
 *   `d` paths are in viewBox units (0..size), centre at (size/2, size/2), unit radius = radius px.
 */
export function buildTerrain({ hills, size = 1000, radius = 420, cols = 120, levels = [0.35, 0.75, 1.15, 1.6, 2.1], sigma = 0.2 }) {
  const cell = size / cols;
  const grid = [];
  for (let j = 0; j <= cols; j++) {
    const row = [];
    for (let i = 0; i <= cols; i++) {
      const border = i === 0 || j === 0 || i === cols || j === cols;
      const x = (i * cell - size / 2) / radius;
      const y = (j * cell - size / 2) / radius;
      row.push(border ? -1 : heightAt(x, y, hills, sigma));
    }
    grid.push(row);
  }
  const out = levels.map((level) => ({
    level,
    d: contourLoops(grid, cols, cols, level).map((loop) => smoothLoop(loop, cell)).join(''),
  }));
  return { levels: out, size, field: grid };
}
