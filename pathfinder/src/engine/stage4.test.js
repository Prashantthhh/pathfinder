import { describe, it, expect } from 'vitest';
import careers from '../data/careers.json';
import quiz from '../data/quiz.json';
import demo from '../data/novaDemo.json';
import { DIMENSION_IDS } from '../data/dimensions.js';
import { AREA_BY_ID } from '../data/areas.js';
import { buildProfile } from './vector.js';
import { recommend } from './recommend.js';
import { PERSONAS } from './fixtures.js';
import { LEVELS, levelOf, profileFromDna, sanitizeDna } from './dna.js';
import { compareRuns, sanitizeSnapshot, snapshotMatches } from './compare.js';
import { filterCareers, searchCareers, sortCareers, surprise } from './explore.js';
import { answerFor } from './novaDemo.js';

const byId = (id) => careers.find((c) => c.id === id);
const profileOf = (i) => buildProfile(PERSONAS[i].answers, quiz);

describe('Career DNA edits', () => {
  it('maps values to plain words, never numbers', () => {
    expect(levelOf(0)).toBe('Barely');
    expect(levelOf(0.3)).toBe('A little');
    expect(levelOf(0.5)).toBe('Some');
    expect(levelOf(0.8)).toBe('A lot');
    expect(levelOf(1)).toBe('Strongest');
    expect(LEVELS[LEVELS.length - 1].max).toBe(Infinity);
  });
  it('sanitises saved DNA: known dimensions, clamped, or null', () => {
    expect(sanitizeDna(null)).toBeNull();
    expect(sanitizeDna([1, 2])).toBeNull();
    const s = sanitizeDna({ build: 5, data: -2, ai: 'x', bogus: 1 });
    expect(Object.keys(s).sort()).toEqual([...DIMENSION_IDS].sort());
    expect(s.build).toBe(1);
    expect(s.data).toBe(0);
    expect(s.ai).toBe(0);
  });
  it('edited DNA changes the recommendations', () => {
    const base = profileOf(0); // security-minded student
    const before = recommend(base, careers).matches[0].career.id;
    const edited = profileFromDna({ build: 0.1, data: 0.1, ai: 0.1, design: 1, security: 0, systems: 0, people: 0.6, play: 0.1 }, base);
    const after = recommend(edited, careers).matches[0].career.id;
    expect(before).toBe('security-analyst');
    expect(after).toBe('ui-ux-designer');
    expect(edited.edited).toBe(true);
    expect(Math.max(...Object.values(edited.display))).toBeCloseTo(1);
  });
  it('keeps the quiz answers as sources for the explanation', () => {
    const base = profileOf(0);
    const edited = profileFromDna({ ...base.display }, base);
    expect(edited.contributions).toBe(base.contributions);
  });
  it('all-zero DNA is insufficient, not a crash', () => {
    const zero = profileFromDna(Object.fromEntries(DIMENSION_IDS.map((d) => [d, 0])), null);
    expect(recommend(zero, careers).insufficient).toBe(true);
  });
});

describe('compareRuns', () => {
  const run = (i) => recommend(profileOf(i), careers).matches;
  it('flags new, dropped, up, down and same', () => {
    const prev = snapshotMatches(run(0)); // security persona
    const rows = compareRuns(prev, run(1)); // data persona
    expect(rows.rows.every((r) => ['new', 'up', 'down', 'same'].includes(r.move))).toBe(true);
    expect(rows.rows.find((r) => r.id === 'data-scientist').move).toBe('new');
    expect(rows.dropped.map((d) => d.id)).toContain('security-analyst');
  });
  it('same run compared with itself has no movement', () => {
    const m = run(2);
    const { rows, dropped } = compareRuns(snapshotMatches(m), m);
    expect(rows.every((r) => r.move === 'same')).toBe(true);
    expect(dropped).toHaveLength(0);
  });
  it('reports how many places a career moved', () => {
    const prev = { matches: [{ id: 'a', percent: 90, rank: 1 }, { id: 'b', percent: 80, rank: 2 }] };
    const now = [{ career: { id: 'b', title: 'B' }, percent: 91 }, { career: { id: 'a', title: 'A' }, percent: 85 }];
    const { rows } = compareRuns(prev, now);
    expect(rows.find((r) => r.id === 'b')).toMatchObject({ move: 'up', places: 1 });
    expect(rows.find((r) => r.id === 'a')).toMatchObject({ move: 'down', places: -1 });
  });
  it('sanitises saved snapshots', () => {
    expect(sanitizeSnapshot(null)).toBeNull();
    expect(sanitizeSnapshot({ matches: 'x' })).toBeNull();
    expect(sanitizeSnapshot({ matches: [{ id: 3, percent: 1, rank: 1 }, { id: 'ok', percent: 80.4, rank: 1 }] }).matches).toEqual([{ id: 'ok', percent: 80, rank: 1 }]);
  });
});

describe('searchCareers', () => {
  const find = (q) => searchCareers(careers, q).map((r) => r.career.id);
  it('returns everything for an empty query', () => {
    expect(find('')).toHaveLength(careers.length);
    expect(find('   ')).toHaveLength(careers.length);
  });
  it('finds by title, keyword and area', () => {
    expect(find('data analyst')).toContain('data-analyst');
    expect(find('react')).toContain('frontend-developer');
    expect(find('ethical hacking')).toContain('penetration-tester');
    expect(find('crossroads')).toContain('technical-writer');
  });
  it('matches word starts, not substrings', () => {
    expect(find('sec')).toContain('security-analyst');
    expect(find('ml')).not.toContain('frontend-developer'); // "html" must not match "ml"
    expect(find('ml')).toContain('ml-engineer');
  });
  it('needs every word to match', () => {
    expect(find('security banana')).toEqual([]);
  });
  it('ranks a title match above an overview-only match', () => {
    const ranked = sortCareers(searchCareers(careers, 'designer'), 'relevance');
    expect(ranked[0].career.id).toBe('ui-ux-designer');
  });
  it('is case-insensitive', () => {
    expect(find('PENETRATION')).toEqual(find('penetration'));
  });
});

describe('filter and sort', () => {
  const all = searchCareers(careers, '');
  const pct = Object.fromEntries(recommend(profileOf(0), careers).ranked.map((r) => [r.career.id, r.percent]));
  it('filters by area', () => {
    const out = filterCareers(all, { areas: new Set(['security']) });
    expect(out.map((r) => r.career.id).sort()).toEqual(['penetration-tester', 'security-analyst']);
  });
  it('filters by dimensions (career must lean on all of them)', () => {
    const out = filterCareers(all, { dims: new Set(['security', 'systems']) }).map((r) => r.career.id);
    expect(out).toContain('security-analyst');
    expect(out).toContain('penetration-tester');
    expect(out).not.toContain('frontend-developer');
  });
  it('saved-only and minimum match', () => {
    const saved = new Set(['data-analyst']);
    expect(filterCareers(all, { savedOnly: true, saved }).map((r) => r.career.id)).toEqual(['data-analyst']);
    const strong = filterCareers(all, { minPercent: 80, percentById: pct });
    expect(strong.length).toBeGreaterThan(0);
    expect(strong.every((r) => pct[r.career.id] >= 80)).toBe(true);
  });
  it('sorts by name and by match', () => {
    const names = sortCareers(all, 'name').map((r) => r.career.title);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    const byMatch = sortCareers(all, 'match', pct).map((r) => pct[r.career.id]);
    expect(byMatch).toEqual([...byMatch].sort((a, b) => b - a));
  });
});

describe('surprise', () => {
  const rngOf = (v) => () => v;
  it('never returns an excluded or liked career', () => {
    const excluded = new Set(careers.filter((c) => c.id !== 'game-developer').map((c) => c.id));
    expect(surprise(careers, { excluded, rng: rngOf(0) }).career.id).toBe('game-developer');
    expect(surprise(careers, { liked: ['game-developer'], excluded, rng: rngOf(0) })).toBeNull();
  });
  it('prefers a different area from the careers the student likes', () => {
    for (const liked of [['security-analyst'], ['data-scientist', 'ml-engineer'], ['frontend-developer']]) {
      for (const r of [0, 0.3, 0.6, 0.99]) {
        const s = surprise(careers, { liked, rng: rngOf(r) });
        const likedAreas = liked.map((id) => byId(id).area);
        expect(likedAreas).not.toContain(s.career.area);
        expect(liked).not.toContain(s.career.id);
      }
    }
  });
  it('explains itself from real shared dimensions', () => {
    const s = surprise(careers, { liked: ['security-analyst'], rng: rngOf(0) });
    expect(s.basedOn.id).toBe('security-analyst');
    expect(s.reason).toContain('Security Analyst');
    expect(s.reason).toContain(AREA_BY_ID[s.career.area].label);
    for (const d of s.shared) {
      expect(s.career.vector[d]).toBeGreaterThanOrEqual(0.4);
      expect(s.basedOn.vector[d]).toBeGreaterThanOrEqual(0.4);
    }
  });
  it('with no liked careers, picks something and says so honestly', () => {
    const s = surprise(careers, { rng: rngOf(0.5) });
    expect(s.career).toBeTruthy();
    expect(s.basedOn).toBeNull();
  });
  it('different random draws give different suggestions', () => {
    const picks = new Set([0, 0.3, 0.6, 0.99].map((r) => surprise(careers, { liked: ['security-analyst'], rng: rngOf(r) }).career.id));
    expect(picks.size).toBeGreaterThan(1);
  });
});

describe('Nova demo chat', () => {
  const ctx = { demo, careers, result: recommend(profileOf(0), careers) };
  const ask = (q, c = ctx) => answerFor(q, c);

  it('every preset question maps back to its own answer', () => {
    for (const p of demo.prompts) expect(ask(p.question).id, p.question).toBe(p.id);
  });
  it('suggested prompts all exist', () => {
    const ids = new Set(demo.prompts.map((p) => p.id));
    for (const id of demo.suggested) expect(ids.has(id)).toBe(true);
  });
  it('never claims to be live AI and says so in the greeting and fallback', () => {
    expect(demo.greeting.toLowerCase()).toContain('not a live ai');
    expect(demo.fallback.toLowerCase()).toContain('demo mode');
  });
  it('does not invent salary or course links', () => {
    const everything = JSON.stringify(demo);
    expect(everything).not.toMatch(/https?:\/\//);
    expect(everything).not.toMatch(/\d+\s*(lpa|lakh|crore|₹|\$|usd|inr)/i);
  });
  it('matches free text to presets', () => {
    expect(ask('how is the match score calculated?').id).toBe('match-score');
    expect(ask('will i succeed in this career').id).toBe('predict');
    expect(ask("what's the salary for a data analyst").id).toBe('salary');
    expect(ask('do I need an LLB for cyber law').id).toBe('cyber-law');
  });
  it('answers about a named career from the career data', () => {
    const a = ask('Tell me about Security Analyst');
    expect(a.source).toBe('career');
    expect(a.text).toContain(byId('security-analyst').overview);
    expect(a.text).toContain('data not connected yet');
    expect(a.link.to).toBe('/careers/security-analyst');
  });
  it('the cyber law career answer carries the LLB note', () => {
    const a = ask('Tell me about Tech Policy & Cyber Law');
    expect(a.text).toMatch(/LLB/);
  });
  it('explains the top match from the real results, and says when there are none', () => {
    const a = ask('why is my top match my top match?');
    expect(a.source).toBe('results');
    expect(a.text).toContain('Security Analyst');
    expect(a.text).toMatch(/not a prediction of success/);
    const none = ask('why is my top match my top match?', { ...ctx, result: null });
    expect(none.text).toMatch(/Take the quiz first/);
  });
  it('falls back honestly instead of guessing', () => {
    const a = ask('what is the weather in Hyderabad');
    expect(a.source).toBe('fallback');
    expect(a.text).toBe(demo.fallback);
  });
  it('two careers at once gets a one-at-a-time answer', () => {
    expect(ask('Frontend Developer and Backend Developer').id).toBe('multi-career');
  });
});

describe('career data additions', () => {
  it('Technical Writer explains that the score cannot measure writing', () => {
    expect(byId('technical-writer').matchNote).toMatch(/writing/);
  });
});

describe('quiz data still lines up with personas', () => {
  it('sample students rank sensibly after all changes', () => {
    expect(recommend(profileOf(0), careers).matches[0].career.id).toBe('security-analyst');
  });
});
