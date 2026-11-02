import { describe, it, expect } from 'vitest';
import domainData from '../../data/domains.json';
import { buildTerrain, contourLoops, heightAt, smoothLoop } from './terrain.js';

const gaussGrid = (cols) => {
  const grid = [];
  for (let j = 0; j <= cols; j++) {
    const row = [];
    for (let i = 0; i <= cols; i++) {
      const x = i / cols - 0.5;
      const y = j / cols - 0.5;
      const border = i === 0 || j === 0 || i === cols || j === cols;
      row.push(border ? -1 : Math.exp(-(x * x + y * y) / 0.02));
    }
    grid.push(row);
  }
  return grid;
};

describe('contourLoops', () => {
  const grid = gaussGrid(60);
  it('joins a single hill into one closed loop of roughly constant radius', () => {
    const loops = contourLoops(grid, 60, 60, 0.5);
    expect(loops).toHaveLength(1);
    const r = loops[0].map((p) => Math.hypot(p.x - 30, p.y - 30));
    expect(Math.max(...r) - Math.min(...r)).toBeLessThan(1.5);
  });
  it('finds nothing above the peak and one loop per hill for two hills', () => {
    expect(contourLoops(grid, 60, 60, 1.5)).toHaveLength(0);
    const two = gaussGrid(60).map((row, j) => row.map((v, i) => (i === 0 || j === 0 || i === 60 || j === 60 ? v : Math.max(v, Math.exp(-(((i - 12) / 60) ** 2 + ((j - 12) / 60) ** 2) / 0.004)))));
    expect(contourLoops(two, 60, 60, 0.5).length).toBe(2);
  });
  it('nests loops: a higher level lies inside a lower one (no crossings)', () => {
    const outer = contourLoops(grid, 60, 60, 0.3)[0];
    const inner = contourLoops(grid, 60, 60, 0.8)[0];
    const maxInner = Math.max(...inner.map((p) => Math.hypot(p.x - 30, p.y - 30)));
    const minOuter = Math.min(...outer.map((p) => Math.hypot(p.x - 30, p.y - 30)));
    expect(maxInner).toBeLessThan(minOuter);
  });
});

describe('smoothLoop', () => {
  it('draws a closed path and ignores degenerate input', () => {
    const d = smoothLoop([{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 }]);
    expect(d.startsWith('M')).toBe(true);
    expect(d.endsWith('Z')).toBe(true);
    expect(smoothLoop([{ x: 0, y: 0 }])).toBe('');
  });
});

describe('terrain for the 35 domains', () => {
  const hills = [{ x: 0, y: 0, weight: 1.1 }, ...domainData.domains.map((d) => ({ x: d.x, y: d.y, weight: 1 }))];
  const t = buildTerrain({ hills });
  it('puts land under the central trailhead and under every domain', () => {
    const lowest = t.levels[0].level;
    expect(heightAt(0, 0, hills)).toBeGreaterThan(lowest);
    for (const d of domainData.domains) expect(heightAt(d.x, d.y, hills), d.id).toBeGreaterThan(lowest);
  });
  it('is sea at the edge of the map, so every contour is a closed loop', () => {
    for (const row of [t.field[0], t.field[t.field.length - 1]]) for (const v of row) expect(v).toBeLessThan(0);
  });
  it('produces a path for every level, with higher levels having less land', () => {
    expect(t.levels).toHaveLength(5);
    for (const l of t.levels) expect(l.d.length).toBeGreaterThan(50);
    const area = (level) => t.field.flat().filter((v) => v >= level).length;
    for (let i = 1; i < t.levels.length; i++) expect(area(t.levels[i].level)).toBeLessThan(area(t.levels[i - 1].level));
  });
  it('is deterministic', () => {
    expect(buildTerrain({ hills }).levels.map((l) => l.d)).toEqual(t.levels.map((l) => l.d));
  });
});
