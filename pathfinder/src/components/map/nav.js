// Spatial keyboard navigation for the map: from one domain, the nearest domain
// in the direction of an arrow key.

const DIRS = {
  ArrowUp: { x: 0, y: -1 },
  ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 },
  ArrowRight: { x: 1, y: 0 },
};

export const isArrow = (key) => key in DIRS;

/**
 * @param {{id:string,x:number,y:number}[]} points
 * @returns {string|null} id of the best neighbour, or null if nothing lies that way
 */
export function neighbour(points, fromId, key) {
  const dir = DIRS[key];
  const from = points.find((p) => p.id === fromId);
  if (!dir || !from) return null;
  let best = null;
  let bestScore = Infinity;
  for (const p of points) {
    if (p.id === fromId) continue;
    const dx = p.x - from.x;
    const dy = p.y - from.y;
    const along = dx * dir.x + dy * dir.y;
    if (along <= 1e-6) continue;
    const across = Math.abs(dx * dir.y - dy * dir.x);
    // prefer close points that are roughly in line with the arrow
    const score = along + across * 1.6;
    if (score < bestScore) {
      bestScore = score;
      best = p.id;
    }
  }
  return best;
}
