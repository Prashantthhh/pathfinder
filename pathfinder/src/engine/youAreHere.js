import { place } from './hexmap.js';

const NEAR_N = 3;

/**
 * Where a student's interests land on the Home map, and the domains closest to that spot.
 * Uses the same placement as the domains (Holland-code wedge, nudged toward a strong neighbour),
 * so "near" means "similar interest shape". It is a place to start looking, not a score.
 * Returns null until the profile has any interest signal.
 */
export function locate(profile, domains, maxLead, n = NEAR_N) {
  const v = profile?.riasec ?? profile?.vector;
  if (!v || !Object.values(v).some((x) => Number(x) !== 0)) return null;
  const spot = place(v, maxLead);
  if (Object.values(v).every((x) => x === Object.values(v)[0])) return null;
  const near = domains
    .map((d) => ({ id: d.id, label: d.label, dist: Math.hypot(d.x - spot.x, d.y - spot.y) }))
    .sort((a, b) => a.dist - b.dist || a.id.localeCompare(b.id))
    .slice(0, n);
  return { ...spot, near };
}
