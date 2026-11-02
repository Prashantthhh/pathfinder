import { describe, it, expect } from 'vitest';
import { SURFACES, TYPE_COLORS, TYPE_NICKNAMES } from '../data/palette.js';
import { TYPES, TYPE_NAMES } from './hexmap.js';

const lum = (hex) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

describe('type colours', () => {
  it('cover all six types with matching names and nicknames', () => {
    expect(Object.keys(TYPE_COLORS)).toEqual(TYPES);
    for (const t of TYPES) {
      expect(TYPE_COLORS[t].name).toBe(TYPE_NAMES[t]);
      expect(TYPE_NICKNAMES[t].length).toBeGreaterThan(3);
    }
  });
  it('bright tones reach 4.5:1 on the night map, so they are safe for text and markers', () => {
    for (const t of TYPES) {
      expect(contrast(TYPE_COLORS[t].dark, SURFACES.night), `${t} on night`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(TYPE_COLORS[t].dark, SURFACES.night2), `${t} on night2`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('deep tones reach 4.5:1 on the light pages', () => {
    for (const t of TYPES) {
      expect(contrast(TYPE_COLORS[t].light, SURFACES.paper), `${t} on paper`).toBeGreaterThanOrEqual(4.5);
      expect(contrast(TYPE_COLORS[t].light, SURFACES.paperHi), `${t} on paperHi`).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('are not white or black, and the six are visibly different from each other', () => {
    const all = TYPES.flatMap((t) => [TYPE_COLORS[t].dark, TYPE_COLORS[t].light]);
    for (const c of all) {
      expect(lum(c)).toBeGreaterThan(0.02);
      expect(lum(c)).toBeLessThan(0.8);
    }
    expect(new Set(TYPES.map((t) => TYPE_COLORS[t].dark)).size).toBe(6);
    expect(new Set(TYPES.map((t) => TYPE_COLORS[t].light)).size).toBe(6);
  });
});

describe('surfaces', () => {
  it('ink on paper and paper on night are comfortably readable', () => {
    expect(contrast(SURFACES.ink, SURFACES.paper)).toBeGreaterThanOrEqual(7);
    expect(contrast(SURFACES.paperHi, SURFACES.night)).toBeGreaterThanOrEqual(7);
  });
  it('the signal button colour carries ink text and shows on the night map', () => {
    expect(contrast(SURFACES.signal, SURFACES.ink)).toBeGreaterThanOrEqual(7);
    expect(contrast(SURFACES.signal, SURFACES.night)).toBeGreaterThanOrEqual(7);
  });
});
