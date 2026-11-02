import { describe, it, expect } from 'vitest';
import domainData from '../../data/domains.json';
import { isArrow, neighbour } from './nav.js';

const pts = [
  { id: 'c', x: 0, y: 0 },
  { id: 'right', x: 0.2, y: 0.02 },
  { id: 'far-right', x: 0.6, y: 0 },
  { id: 'left', x: -0.2, y: 0 },
  { id: 'up', x: 0.01, y: -0.25 },
  { id: 'down', x: 0, y: 0.3 },
  { id: 'diag', x: 0.18, y: -0.18 },
];

describe('neighbour', () => {
  it('moves to the nearest point in each direction', () => {
    expect(neighbour(pts, 'c', 'ArrowRight')).toBe('right');
    expect(neighbour(pts, 'c', 'ArrowLeft')).toBe('left');
    expect(neighbour(pts, 'c', 'ArrowUp')).toBe('up');
    expect(neighbour(pts, 'c', 'ArrowDown')).toBe('down');
  });
  it('returns null when nothing lies that way, and for unknown input', () => {
    expect(neighbour(pts, 'far-right', 'ArrowRight')).toBeNull();
    expect(neighbour(pts, 'nope', 'ArrowRight')).toBeNull();
    expect(neighbour(pts, 'c', 'a')).toBeNull();
    expect(isArrow('ArrowUp')).toBe(true);
    expect(isArrow('Enter')).toBe(false);
  });
  it('every domain on the real map can be reached from the centre-most one with arrow keys', () => {
    const points = domainData.domains.map((d) => ({ id: d.id, x: d.x, y: d.y }));
    const start = [...points].sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y))[0].id;
    const seen = new Set([start]);
    const queue = [start];
    while (queue.length) {
      const id = queue.shift();
      for (const k of ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']) {
        const n = neighbour(points, id, k);
        if (n && !seen.has(n)) {
          seen.add(n);
          queue.push(n);
        }
      }
    }
    expect(seen.size).toBe(points.length);
  });
});
