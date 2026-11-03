import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { buildProfile } from './vector.js';
import { PERSONAS } from './fixtures.js';
import { locate } from './youAreHere.js';
import { bearingOf, wedgeOf } from './hexmap.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const quiz = read('../data/quiz.json');
const { domains, meta } = read('../data/domains.json');
const at = (id) => locate(buildProfile(PERSONAS.find((p) => p.id === id).answers, quiz), domains, meta.maxLead);

describe('you are here', () => {
  it('is null with no interest signal, and for a perfectly flat profile', () => {
    expect(locate(buildProfile({}, quiz), domains, meta.maxLead)).toBeNull();
    expect(locate({ riasec: { R: 2, I: 2, A: 2, S: 2, E: 2, C: 2 } }, domains, meta.maxLead)).toBeNull();
  });
  it('returns the three nearest domains, nearest first, inside the map', () => {
    const you = at('artistic-maker');
    expect(you.near).toHaveLength(3);
    expect(you.near[0].dist).toBeLessThanOrEqual(you.near[1].dist);
    expect(Math.hypot(you.x, you.y)).toBeLessThanOrEqual(0.93);
  });
  it('lands in the wedge of the student\'s leading type, with domains of that kind nearby', () => {
    const a = at('artistic-maker');
    expect(wedgeOf(a)).toBe('A');
    expect(domains.find((d) => d.id === a.near[0].id).primary).toBe('A');
    const c = at('cse-graduate');
    expect(['I', 'C']).toContain(wedgeOf(c));
    expect(bearingOf(c)).not.toBeNaN();
  });
  it('is deterministic', () => {
    expect(at('commerce')).toEqual(at('commerce'));
  });
});
