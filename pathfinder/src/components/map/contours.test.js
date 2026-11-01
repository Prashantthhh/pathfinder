import { describe, it, expect } from 'vitest';
import { contourSegments, backgroundContours, heightAt } from './contours.js';
import { smoothPath } from './path.js';

describe('contours', () => {
  it('draws a ring around a single hill and nothing below the base', () => {
    const field = (x, y) => Math.exp(-(((x - 0.5) ** 2 + (y - 0.5) ** 2) / 0.02));
    const [ring, none] = contourSegments({ width: 100, height: 100, cols: 40, rows: 40, levels: [0.5, 1.5], field });
    expect(ring.length).toBeGreaterThan(20);
    expect(none).toHaveLength(0);
    // every point of the 0.5 ring is roughly the same distance from the hill centre
    const dists = ring.map(([x1, y1]) => Math.hypot(x1 - 50, y1 - 50));
    expect(Math.max(...dists) - Math.min(...dists)).toBeLessThan(4);
  });
  it('keeps segments inside the viewBox', () => {
    const [segs] = contourSegments({ width: 100, height: 60, cols: 20, rows: 12, levels: [0.4], field: (x, y) => heightAt(x, y, 100 / 60) });
    for (const [x1, y1, x2, y2] of segs) {
      for (const v of [x1, x2]) expect(v >= 0 && v <= 100).toBe(true);
      for (const v of [y1, y2]) expect(v >= 0 && v <= 60).toBe(true);
    }
  });
  it('builds the background paths with both minor and index lines', () => {
    const c = backgroundContours();
    expect(c.minor.length).toBeGreaterThan(1000);
    expect(c.index.length).toBeGreaterThan(100);
  });
});

describe('smoothPath', () => {
  it('starts at the first point and ends at the last', () => {
    const d = smoothPath([{ x: 0, y: 0 }, { x: 10, y: 5 }, { x: 20, y: 0 }]);
    expect(d.startsWith('M0 0')).toBe(true);
    expect(d.endsWith('20 0')).toBe(true);
    expect((d.match(/C/g) || []).length).toBe(2);
  });
});
