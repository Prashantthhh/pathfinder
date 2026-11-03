import { describe, expect, it } from 'vitest';
import { isValidDate, verificationOf } from './verification.js';
import manual from './india-manual-verification.json';
import { routesFor } from './india.js';

describe('link verification', () => {
  it('counts a checker hit as verified, with its date', () => {
    expect(verificationOf({ loaded: true, needleFound: true, checkedAt: '2026-11-02' }, undefined)).toEqual({ verified: true, how: 'checker', on: '2026-11-02' });
  });
  it('does not count a loaded page without the name, or an unreachable site', () => {
    expect(verificationOf({ loaded: true, needleFound: false }, undefined).verified).toBe(false);
    expect(verificationOf({ loaded: false, needleFound: false }, undefined).verified).toBe(false);
  });
  it('counts a manual entry with a valid date, labelled as manual', () => {
    expect(verificationOf({ loaded: true, needleFound: false }, { verifiedOn: '2026-11-05' })).toEqual({ verified: true, how: 'manual', on: '2026-11-05' });
  });
  it('ignores a manual entry without a real date', () => {
    for (const bad of [undefined, '', '5 Nov', '2026-13-45', 20261105]) expect(verificationOf(null, { verifiedOn: bad }).verified, String(bad)).toBe(false);
    expect(isValidDate('2026-11-05')).toBe(true);
  });
  it('manual entries are only ones a person recorded, each with a real date', () => {
    for (const [k, v] of Object.entries(manual.entries)) {
      expect(k).toMatch(/^(exams|bodies):/);
      expect(isValidDate(v.verifiedOn), k).toBe(true);
    }
  });
  it('an unconfirmed name still reads "Check with the official body" (no link)', () => {
    const career = { routes: [{ exam: 'iimc-entrance' }] };
    const [r] = routesFor(career);
    expect(r.exam.verified).toBe(false);
    expect(r.exam.url).toBeNull();
  });
});
