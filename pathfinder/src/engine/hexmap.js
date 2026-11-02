// The interest map: Holland's hexagon as geography.
//
// RIASEC types sit at the six corners in Holland's order, so neighbouring types
// (R-I, I-A, A-S, S-E, E-C, C-R) really are neighbours and opposite types
// (R-S, I-E, A-C) are opposites. A profile is placed the way Holland codes are
// read:
//   - its PRIMARY interest (the highest score) picks the wedge;
//   - a strong interest in a neighbouring type nudges it toward that neighbour
//     (at most 22 degrees, so it stays in its wedge);
//   - the distance from the centre says how DISTINCT the primary interest is
//     compared with the profile's own average (a flat profile sits near the middle).
// A second interest on a NON-adjacent type (e.g. Investigative + Conventional)
// does not move the point; the profile panel names it instead.
//
// Everything is in unit coordinates: centre (0,0), corner radius 1, y down.

export const TYPES = ['R', 'I', 'A', 'S', 'E', 'C'];
export const TYPE_NAMES = {
  R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional',
};

/** Corner angle in degrees, clockwise from the top: R at the top. */
export const cornerAngle = (i) => -90 + 60 * i;
const rad = (deg) => (deg * Math.PI) / 180;

export const CORNERS = TYPES.map((t, i) => ({
  type: t,
  x: Math.cos(rad(cornerAngle(i))),
  y: Math.sin(rad(cornerAngle(i))),
}));

const NUDGE_DEG = 22;
/** Radial range of the land: the middle is kept clear for Nova (the trailhead). */
export const R_MIN = 0.4;
export const R_MAX = 0.92;

const values = (riasec) => TYPES.map((t) => Number(riasec[t]) || 0);
const mean = (v) => v.reduce((a, b) => a + b, 0) / v.length;

/** Primary and secondary type (by score; ties go to the earlier type) plus the primary's lead over the profile mean. */
export function shapeOf(riasec) {
  const v = values(riasec);
  const order = v.map((x, i) => i).sort((a, b) => v[b] - v[a] || a - b);
  return {
    primary: TYPES[order[0]],
    secondary: TYPES[order[1]],
    tertiary: TYPES[order[2]],
    lead: v[order[0]] - mean(v),
    top3: order.slice(0, 3).map((i) => TYPES[i]),
  };
}

/** Largest primary lead across profiles. Computed once from the domain data and reused for every profile. */
export const maxLeadFor = (profiles) => Math.max(...profiles.map((p) => shapeOf(p).lead));

/** Position of a profile on the map, in unit coordinates. */
export function place(riasec, maxLead) {
  const v = values(riasec);
  const m = mean(v);
  const i = v.indexOf(Math.max(...v));
  const lead = v[i] - m;
  const next = v[(i + 1) % 6] - m;
  const prev = v[(i + 5) % 6] - m;
  const frac = (x) => (lead > 0 ? Math.min(1, Math.max(0, x / lead)) : 0);
  const angle = cornerAngle(i) + NUDGE_DEG * (frac(next) - frac(prev));
  const r = R_MIN + (R_MAX - R_MIN) * Math.min(1, Math.max(0, maxLead ? lead / maxLead : 0));
  return { x: r * Math.cos(rad(angle)), y: r * Math.sin(rad(angle)) };
}

/** The dominant type's index and a plain 0-359 bearing (clockwise from the top) for a point. */
export const bearingOf = (p) => ((Math.atan2(p.x, -p.y) * 180) / Math.PI + 360) % 360;

/** The wedge (corner type) a point lies in: the nearest corner by angle. */
export function wedgeOf(p) {
  let best = 0;
  let bestDot = -Infinity;
  CORNERS.forEach((c, k) => {
    const d = p.x * c.x + p.y * c.y;
    if (d > bestDot) {
      bestDot = d;
      best = k;
    }
  });
  return TYPES[best];
}

/**
 * Nudge points apart so labels and dots do not overlap, while keeping each close
 * to where the data put it. Deterministic (fixed iteration order, no randomness).
 *
 * @param {{x:number,y:number}[]} points
 * @param {{ minDist?: number, pull?: number, iterations?: number, limit?: number }} opts
 * @returns {{ points: {x,y}[], maxMove: number, minGap: number }}
 */
export function spread(points, { minDist = 0.1, pull = 0.08, iterations = 200, limit = 0.94 } = {}) {
  const home = points.map((p) => ({ ...p }));
  const pos = points.map((p) => ({ ...p }));

  for (let it = 0; it < iterations; it++) {
    const push = pos.map(() => ({ x: 0, y: 0 }));
    for (let i = 0; i < pos.length; i++) {
      for (let j = i + 1; j < pos.length; j++) {
        let dx = pos[j].x - pos[i].x;
        let dy = pos[j].y - pos[i].y;
        let d = Math.hypot(dx, dy);
        if (d >= minDist) continue;
        if (d < 1e-9) {
          // identical points: separate along a fixed, index-based direction
          const a = (i * 2.399963) % (2 * Math.PI);
          dx = Math.cos(a);
          dy = Math.sin(a);
          d = 1;
        }
        const move = (minDist - d) / 2;
        push[i].x -= (dx / d) * move;
        push[i].y -= (dy / d) * move;
        push[j].x += (dx / d) * move;
        push[j].y += (dy / d) * move;
      }
    }
    for (let i = 0; i < pos.length; i++) {
      // the last quarter of the iterations has no spring, so separation wins over staying home
      const spring = it < iterations * 0.75 ? pull : 0;
      pos[i].x += push[i].x + (home[i].x - pos[i].x) * spring;
      pos[i].y += push[i].y + (home[i].y - pos[i].y) * spring;
      const r = Math.hypot(pos[i].x, pos[i].y);
      if (r > limit) {
        pos[i].x *= limit / r;
        pos[i].y *= limit / r;
      }
    }
  }

  let maxMove = 0;
  let minGap = Infinity;
  for (let i = 0; i < pos.length; i++) {
    maxMove = Math.max(maxMove, Math.hypot(pos[i].x - home[i].x, pos[i].y - home[i].y));
    for (let j = i + 1; j < pos.length; j++) minGap = Math.min(minGap, Math.hypot(pos[j].x - pos[i].x, pos[j].y - pos[i].y));
  }
  return { points: pos, maxMove, minGap };
}
