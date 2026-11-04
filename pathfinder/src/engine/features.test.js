import { describe, it, expect } from 'vitest';
import careers from '../data/careers.json';
import quiz from '../data/quiz.json';
import demo from '../data/novaDemo.json';
import { DIMENSION_IDS } from '../data/dimensions.js';
import { DOMAIN_BY_ID } from '../data/domainsIndex.js';
import { buildProfile } from './vector.js';
import { recommend } from './recommend.js';
import { PERSONAS } from './fixtures.js';
import { LEVELS, levelOf, profileFromDna, sanitizeDna } from './dna.js';
import { compareRuns, sanitizeSnapshot, snapshotMatches } from './compare.js';
import { filterCareers, primaryType, searchCareers, sortCareers, surprise } from './explore.js';
import { answerFor } from './novaDemo.js';

const byId = (id) => careers.find((c) => c.id === id);
const profileOf = (id) => buildProfile(PERSONAS.find((p) => p.id === id).answers, quiz);
const run = (id) => recommend(profileOf(id), careers);

describe('Career DNA edits', () => {
  it('maps values to plain words, never numbers', () => {
    expect(levelOf(0)).toBe('Barely');
    expect(levelOf(0.3)).toBe('A little');
    expect(levelOf(0.5)).toBe('Some');
    expect(levelOf(0.8)).toBe('A lot');
    expect(levelOf(1)).toBe('Strongest');
    expect(LEVELS[LEVELS.length - 1].max).toBe(Infinity);
  });
  it('sanitises saved DNA: the six interest types only, clamped, or null', () => {
    expect(sanitizeDna(null)).toBeNull();
    expect(sanitizeDna([1, 2])).toBeNull();
    const s = sanitizeDna({ R: 5, I: -2, A: 'x', bogus: 1 });
    expect(Object.keys(s).sort()).toEqual([...DIMENSION_IDS].sort());
    expect(s.R).toBe(1);
    expect(s.I).toBe(0);
    expect(s.A).toBe(0);
  });
  it('edited DNA changes the recommendations', () => {
    const base = profileOf('commerce');
    expect(run('commerce').matches[0].career.id).not.toBe('graphic-designer');
    const edited = profileFromDna({ R: 0.1, I: 0.1, A: 1, S: 0.2, E: 0.1, C: 0.05 }, base);
    const res = recommend(edited, careers);
    expect(res.matches.slice(0, 3).map((m) => m.career.id)).toEqual(expect.arrayContaining(['graphic-designer']));
    expect(edited.edited).toBe(true);
    expect(Math.max(...Object.values(edited.display))).toBeCloseTo(1);
  });
  it('keeps the quiz answers, settings and stream context when interests are edited', () => {
    const base = profileOf('science-pcb');
    const edited = profileFromDna({ ...base.display }, base);
    expect(edited.contributions).toBe(base.contributions);
    expect(edited.settings).toEqual(base.settings);
    expect(edited.context).toEqual(base.context);
  });
  it('all-zero or perfectly flat DNA is insufficient, not a crash', () => {
    const zero = profileFromDna(Object.fromEntries(DIMENSION_IDS.map((d) => [d, 0])), null);
    expect(recommend(zero, careers).insufficient).toBe(true);
    const flat = profileFromDna(Object.fromEntries(DIMENSION_IDS.map((d) => [d, 0.5])), null);
    expect(recommend(flat, careers).insufficient).toBe(true);
  });
});

describe('compareRuns', () => {
  const m = (id) => run(id).matches;
  it('flags new, dropped, up, down and same', () => {
    const prev = snapshotMatches(m('commerce'));
    const out = compareRuns(prev, m('science-pcb'));
    expect(out.rows.every((r) => ['new', 'up', 'down', 'same'].includes(r.move))).toBe(true);
    expect(out.rows.find((r) => r.id === 'doctor').move).toBe('new');
    expect(out.dropped.map((d) => d.id)).toContain('bank-officer');
  });
  it('the same run compared with itself has no movement', () => {
    const x = m('arts');
    const { rows, dropped } = compareRuns(snapshotMatches(x), x);
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
    expect(find('')).toHaveLength(61);
    expect(find('   ')).toHaveLength(61);
  });
  it('finds by title, Indian keyword, domain and skill', () => {
    expect(find('chartered')).toContain('chartered-accountant');
    expect(find('ias')).toContain('civil-servant');
    expect(find('mbbs')).toContain('doctor');
    expect(find('hospitality')).toEqual(expect.arrayContaining(['chef', 'hotel-manager', 'event-manager']));
    expect(find('iti')).toEqual(expect.arrayContaining(['electrician', 'automobile-technician']));
  });
  it('matches word starts, not substrings', () => {
    expect(find('count')).not.toContain('chartered-accountant'); // "count" is inside "accounts"
    expect(find('account')).toContain('chartered-accountant');
  });
  it('needs every word, ignores case, and returns nothing for gibberish', () => {
    expect(find('doctor banana')).toEqual([]);
    expect(find('DOCTOR')).toEqual(find('doctor'));
  });
  it('ranks a title match above a description-only match', () => {
    const ranked = sortCareers(searchCareers(careers, 'designer'), 'relevance');
    expect(ranked.slice(0, 4).every((r) => /designer/i.test(r.career.title))).toBe(true);
  });
});

describe('filter and sort', () => {
  const all = searchCareers(careers, '');
  const pct = Object.fromEntries(run('commerce').ranked.map((r) => [r.career.id, r.percent]));
  it('filters by domain', () => {
    const out = filterCareers(all, { domains: new Set(['design']) });
    expect(out.map((r) => r.career.id).sort()).toEqual(['fashion-designer', 'graphic-designer', 'industrial-designer']);
  });
  it('filters by primary interest type', () => {
    const r = filterCareers(all, { types: new Set(['R']) }).map((x) => x.career.id);
    expect(r).toEqual(expect.arrayContaining(['electrician', 'automobile-technician']));
    expect(r.every((id) => primaryType(byId(id)) === 'R')).toBe(true);
  });
  it('saved-only and minimum match', () => {
    const saved = new Set(['chef']);
    expect(filterCareers(all, { savedOnly: true, saved }).map((r) => r.career.id)).toEqual(['chef']);
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
    const excluded = new Set(careers.filter((c) => c.id !== 'chef').map((c) => c.id));
    expect(surprise(careers, { excluded, rng: rngOf(0) }).career.id).toBe('chef');
    expect(surprise(careers, { liked: ['chef'], excluded, rng: rngOf(0) })).toBeNull();
  });
  it('prefers a different domain from the careers the student likes', () => {
    for (const liked of [['chartered-accountant'], ['doctor', 'nurse'], ['graphic-designer']]) {
      for (const r of [0, 0.3, 0.6, 0.99]) {
        const s = surprise(careers, { liked, rng: rngOf(r) });
        const likedDomains = liked.map((id) => byId(id).domain);
        expect(likedDomains).not.toContain(s.career.domain);
        expect(liked).not.toContain(s.career.id);
      }
    }
  });
  it('explains itself from real interest scores', () => {
    const s = surprise(careers, { liked: ['chartered-accountant'], rng: rngOf(0) });
    expect(s.basedOn.id).toBe('chartered-accountant');
    expect(s.reason).toContain('Chartered Accountant');
    expect(s.reason).toContain(DOMAIN_BY_ID[s.career.domain].label);
    for (const d of s.shared) {
      expect(s.career.riasec[d]).toBeGreaterThanOrEqual(4.5);
      expect(s.basedOn.riasec[d]).toBeGreaterThanOrEqual(4.5);
    }
  });
  it('with no liked careers, picks something and says so honestly', () => {
    const s = surprise(careers, { rng: rngOf(0.5) });
    expect(s.career).toBeTruthy();
    expect(s.basedOn).toBeNull();
  });
  it('different random draws give different suggestions', () => {
    const picks = new Set([0, 0.3, 0.6, 0.99].map((r) => surprise(careers, { liked: ['chartered-accountant'], rng: rngOf(r) }).career.id));
    expect(picks.size).toBeGreaterThan(1);
  });
});

describe('Nova demo chat', () => {
  const ctx = { demo, careers, result: run('science-pcb') };
  const ask = (q, c = ctx) => answerFor(q, c);

  it('every preset question maps back to its own answer', () => {
    for (const p of demo.prompts) expect(ask(p.question).id, p.question).toBe(p.id);
  });
  it('suggested prompts all exist', () => {
    const ids = new Set(demo.prompts.map((p) => p.id));
    for (const id of demo.suggested) expect(ids.has(id)).toBe(true);
  });
  it('the greeting does not claim to be a demo or a live AI, and the fallback says it is a demo', () => {
    expect(demo.greeting.toLowerCase()).not.toContain('not a live ai');
    expect(demo.greeting.toLowerCase()).toContain('every reply says which');
    expect(demo.fallback.toLowerCase()).toContain('demo mode');
  });
  it('does not invent salary figures, course links or eligibility details', () => {
    const everything = JSON.stringify(demo);
    expect(everything).not.toMatch(/https?:\/\//);
    expect(everything).not.toMatch(/\d+\s*(lpa|lakh|crore|₹|\$|usd|inr)/i);
    expect(everything).not.toMatch(/\d+\s*%\s*(marks|in class|aggregate)/i);
  });
  it('matches free text to presets, and lets the honest answers win over a career name', () => {
    expect(ask('how is the match score calculated?').id).toBe('match-score');
    expect(ask('will i succeed in this career').id).toBe('predict');
    expect(ask("what's the salary of a chartered accountant").id).toBe('salary');
    expect(ask('which stream do I need for MBBS').id).toBe('streams');
    expect(ask('where does the career data come from').id).toBe('onet');
  });
  it('answers about a named career from its O*NET description and typical route', () => {
    const a = ask('Tell me about Chartered Accountant');
    expect(a.source).toBe('career');
    expect(a.text).toContain(byId('chartered-accountant').description);
    expect(a.text).toContain('Typical route in India');
    expect(a.text).toContain('verify with the official body');
    expect(a.text).toContain('data not connected yet');
    expect(a.link.to).toBe('/careers/chartered-accountant');
  });
  it('flags a loose O*NET match in the career answer', () => {
    expect(ask('Tell me about Civil Servant').text).toContain('approximate');
  });
  it('explains the top match from the real results, and says when there are none', () => {
    const a = ask('why is my top match my top match?');
    expect(a.source).toBe('results');
    expect(a.text).toContain('Doctor');
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
    expect(ask('Doctor and Dentist').id).toBe('multi-career');
  });
});
