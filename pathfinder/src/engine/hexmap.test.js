import { describe, it, expect } from 'vitest';
import domainData from '../data/domains.json';
import seeds from '../data/domainSeeds.json';
import { CORNERS, R_MAX, R_MIN, TYPES, TYPE_NAMES, cornerAngle, maxLeadFor, place, shapeOf, spread, wedgeOf } from './hexmap.js';

const flat = { R: 3, I: 3, A: 3, S: 3, E: 3, C: 3 };
const pure = (t, hi = 7, lo = 1.5) => Object.fromEntries(TYPES.map((x) => [x, x === t ? hi : lo]));

describe('hexagon geometry', () => {
  it('has the six types in Holland order, R at the top, opposite pairs R-S, I-E, A-C', () => {
    expect(TYPES).toEqual(['R', 'I', 'A', 'S', 'E', 'C']);
    expect(CORNERS[0].x).toBeCloseTo(0);
    expect(CORNERS[0].y).toBeCloseTo(-1);
    for (const [a, b] of [['R', 'S'], ['I', 'E'], ['A', 'C']]) {
      const A = CORNERS[TYPES.indexOf(a)];
      const B = CORNERS[TYPES.indexOf(b)];
      expect(A.x + B.x).toBeCloseTo(0);
      expect(A.y + B.y).toBeCloseTo(0);
    }
    expect(cornerAngle(1) - cornerAngle(0)).toBe(60);
    expect(Object.keys(TYPE_NAMES)).toEqual(TYPES);
  });
});

describe('place()', () => {
  const maxLead = maxLeadFor([pure('R'), pure('I')]);
  it('puts a pure profile in its own wedge', () => {
    for (const t of TYPES) expect(wedgeOf(place(pure(t), maxLead))).toBe(t);
  });
  it('puts the strongest profile at the edge of the land and a flat one near the middle', () => {
    expect(Math.hypot(...Object.values(place(pure('S'), maxLead)))).toBeCloseTo(R_MAX, 1);
    expect(Math.hypot(...Object.values(place(flat, maxLead)))).toBeCloseTo(R_MIN, 2);
  });
  it('a stronger primary interest sits further out', () => {
    const near = Math.hypot(...Object.values(place(pure('A', 4.5), maxLead)));
    const far = Math.hypot(...Object.values(place(pure('A', 6.5), maxLead)));
    expect(far).toBeGreaterThan(near);
  });
  it('nudges toward a strong NEIGHBOUR but stays in its wedge', () => {
    const toI = place({ ...pure('R', 6), I: 5.5 }, maxLead);
    const toC = place({ ...pure('R', 6), C: 5.5 }, maxLead);
    expect(toI.x).toBeGreaterThan(0.02); // I is clockwise of R (to the right)
    expect(toC.x).toBeLessThan(-0.02);
    expect(wedgeOf(toI)).toBe('R');
    expect(wedgeOf(toC)).toBe('R');
  });
  it('ignores a strong NON-adjacent second interest for position, but reports it', () => {
    const ic = { R: 2, I: 6, A: 2, S: 2, E: 2, C: 5.8 };
    const p = place(ic, maxLead);
    expect(wedgeOf(p)).toBe('I');
    expect(shapeOf(ic)).toMatchObject({ primary: 'I', secondary: 'C' });
  });
  it('is symmetric: the mirror profile lands at the mirror position', () => {
    const a = place({ R: 6, I: 5, A: 1, S: 1, E: 1, C: 1 }, maxLead);
    const b = place({ R: 6, I: 1, A: 1, S: 1, E: 1, C: 5 }, maxLead);
    expect(a.x).toBeCloseTo(-b.x);
    expect(a.y).toBeCloseTo(b.y);
  });
  it('is deterministic and tolerant of missing values', () => {
    expect(place({ R: 5 }, maxLead)).toEqual(place({ R: 5 }, maxLead));
    expect(Number.isFinite(place({}, maxLead).x)).toBe(true);
  });
});

describe('spread()', () => {
  const dense = Array.from({ length: 12 }, (_, i) => ({ x: 0.5 + (i % 3) * 0.01, y: 0.1 + Math.floor(i / 3) * 0.01 }));
  it('separates crowded points and keeps them close to where the data put them', () => {
    const out = spread(dense, { minDist: 0.1, iterations: 400 });
    expect(out.minGap).toBeGreaterThan(0.085);
    expect(out.maxMove).toBeLessThan(0.35);
  });
  it('is deterministic', () => {
    expect(spread(dense).points).toEqual(spread(dense).points);
  });
  it('handles identical points and stays inside the limit', () => {
    const same = Array.from({ length: 5 }, () => ({ x: 0.9, y: 0 }));
    const out = spread(same, { minDist: 0.1, limit: 0.94 });
    expect(out.minGap).toBeGreaterThan(0.05);
    for (const p of out.points) expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(0.9401);
  });
  it('leaves already-separated points alone', () => {
    const apart = [{ x: -0.5, y: 0 }, { x: 0.5, y: 0 }];
    const out = spread(apart);
    expect(out.maxMove).toBeLessThan(1e-9);
  });
});

describe('generated domain data', () => {
  const { meta, domains, groups } = domainData;
  it('has exactly the 35 domains from the seed list, in order, with unique ids', () => {
    expect(domains).toHaveLength(35);
    expect(new Set(domains.map((d) => d.id)).size).toBe(35);
    expect(domains.map((d) => d.id)).toEqual(seeds.domains.map((d) => d.id));
  });
  it('every domain belongs to a known group and has a plain-language blurb', () => {
    const ids = new Set(groups.map((g) => g.id));
    for (const d of domains) {
      expect(ids.has(d.group), d.id).toBe(true);
      expect(d.blurb.length).toBeGreaterThan(20);
    }
  });
  it('records where the numbers came from', () => {
    expect(meta.source).toMatch(/^O\*NET 31\.0 Database$/);
    expect(meta.release).toMatch(/August 2026/);
    expect(meta.license).toBe('CC BY 4.0');
    expect(meta.interests.source).toBe('Machine Learning/Expert'); // disclosed in the UI
    expect(meta.interests.date).toMatch(/^\d{2}\/\d{4}$/);
    expect(meta.sha256).toMatch(/^[0-9a-f]{64}$/);
  });
  it('every domain is backed by real, traceable O*NET occupations', () => {
    for (const d of domains) {
      expect(d.occupations.length, d.id).toBeGreaterThanOrEqual(2);
      for (const o of d.occupations) expect(o.code, `${d.id} ${o.title}`).toMatch(/^\d{2}-\d{4}\.00$/);
    }
  });
  it('RIASEC values stay on the O*NET 1-7 scale and the primary type matches the highest score', () => {
    for (const d of domains) {
      for (const t of TYPES) expect(d.riasec[t] >= 1 && d.riasec[t] <= 7, `${d.id} ${t}`).toBe(true);
      const top = TYPES.reduce((a, b) => (d.riasec[b] > d.riasec[a] ? b : a));
      expect(d.primary, d.id).toBe(top);
    }
  });
  it('positions come from the data (not hand-placed) and stay within a small nudge of it', () => {
    const maxLead = maxLeadFor(domains.map((d) => d.riasec));
    for (const d of domains) {
      expect(Math.hypot(d.x, d.y), `${d.id} must stay out of Nova's space`).toBeGreaterThan(0.34);
      const home = place(d.riasec, maxLead);
      expect(Math.hypot(home.x - d.home.x, home.y - d.home.y), d.id).toBeLessThan(0.002);
      expect(Math.hypot(d.x - d.home.x, d.y - d.home.y), d.id).toBeLessThan(0.15);
      expect(Math.hypot(d.x, d.y), d.id).toBeLessThanOrEqual(0.94);
      expect(d.wedge, `${d.id} drifted out of its wedge`).toBe(d.primary);
    }
  });
  it('labels never sit on top of each other', () => {
    for (let i = 0; i < domains.length; i++) {
      for (let j = i + 1; j < domains.length; j++) {
        expect(Math.hypot(domains[i].x - domains[j].x, domains[i].y - domains[j].y), `${domains[i].id}/${domains[j].id}`).toBeGreaterThan(0.085);
      }
    }
  });
  it('all six regions are populated, so the map has somewhere to go in every direction', () => {
    for (const t of TYPES) expect(domains.filter((d) => d.primary === t).length, t).toBeGreaterThanOrEqual(3);
  });
  it('sanity: well-known occupations land where Holland theory says', () => {
    const p = (id) => domains.find((d) => d.id === id).primary;
    expect(p('design')).toBe('A');
    expect(p('film-music-arts')).toBe('A');
    expect(p('teaching-education')).toBe('S');
    expect(p('accounting-audit')).toBe('C');
    expect(p('business-management')).toBe('E');
    expect(p('mechanical-manufacturing')).toBe('R');
    expect(p('physical-sciences')).toBe('I');
  });
});
