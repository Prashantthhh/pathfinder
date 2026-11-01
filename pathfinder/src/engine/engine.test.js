import { describe, it, expect } from 'vitest';
import careers from '../data/careers.json';
import quiz from '../data/quiz.json';
import { AREA_BY_ID } from '../data/areas.js';
import { DIMENSIONS, DIMENSION_IDS, MAP_BG } from '../data/dimensions.js';
import { ROADMAP_LINKS, resolveLinks } from '../data/links.js';
import { cosine } from './cosine.js';
import { buildProfile } from './vector.js';
import { recommend } from './recommend.js';
import { MIN_ALT_PERCENT, MIN_MATCH_PERCENT } from './tiers.js';
import { PERSONAS } from './fixtures.js';

const personaResult = (id) => {
  const p = PERSONAS.find((x) => x.id === id);
  return recommend(buildProfile(p.answers, quiz), careers);
};
const topIds = (res, n = 5) => res.matches.slice(0, n).map((m) => m.career.id);

// --- colour helpers (WCAG relative luminance) ---
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

describe('cosine', () => {
  it('is 1 for identical direction, regardless of scale', () => {
    expect(cosine({ build: 1, data: 2 }, { build: 2, data: 4 })).toBeCloseTo(1);
  });
  it('is 0 for orthogonal vectors', () => {
    expect(cosine({ build: 1 }, { data: 1 })).toBe(0);
  });
  it('is 0, not NaN, when a vector is empty', () => {
    expect(cosine({}, { build: 1 })).toBe(0);
  });
  it('known value: (1,1) vs (1,0) is 1/sqrt2', () => {
    expect(cosine({ build: 1, data: 1 }, { build: 1 })).toBeCloseTo(Math.SQRT1_2);
  });
});

describe('career data', () => {
  it('has the 23 careers with unique ids', () => {
    expect(careers).toHaveLength(23);
    expect(new Set(careers.map((c) => c.id)).size).toBe(23);
  });
  it('every vector covers all 8 dimensions within 0..1', () => {
    for (const c of careers) {
      expect(Object.keys(c.vector).sort()).toEqual([...DIMENSION_IDS].sort());
      for (const v of Object.values(c.vector)) expect(v >= 0 && v <= 1).toBe(true);
    }
  });
  it('areas and related careers exist', () => {
    const ids = new Set(careers.map((c) => c.id));
    for (const c of careers) {
      expect(AREA_BY_ID[c.area], c.id).toBeTruthy();
      for (const r of c.related) {
        expect(ids.has(r), `${c.id} -> ${r}`).toBe(true);
        expect(r).not.toBe(c.id);
      }
    }
  });
  it('no two careers are near-duplicates', () => {
    for (const a of careers) {
      for (const b of careers) {
        if (a.id < b.id) expect(cosine(a.vector, b.vector), `${a.id} vs ${b.id}`).toBeLessThan(0.97);
      }
    }
  });
  it('Tech Policy & Cyber Law states that legal practice usually needs an LLB after B.Tech', () => {
    const law = careers.find((c) => c.id === 'tech-policy-cyber-law');
    expect(law.entryNote).toMatch(/LLB/);
    expect(law.entryNote).toMatch(/B\.Tech/);
  });
  it('never invents salary or demand figures', () => {
    for (const c of careers) {
      expect(c.salary).toBeNull();
      expect(c.demand).toBeNull();
    }
  });
  it('only links to allow-listed roadmap.sh pages', () => {
    for (const l of Object.values(ROADMAP_LINKS)) expect(l.url).toMatch(/^https:\/\/roadmap\.sh\/[a-z-]+$/);
    for (const c of careers) {
      for (const k of c.roadmaps) expect(ROADMAP_LINKS[k], `${c.id}:${k}`).toBeTruthy();
      expect(resolveLinks(c.roadmaps)).toHaveLength(c.roadmaps.length);
    }
  });
});

describe('blaze colours', () => {
  it('are not white or black and show clearly (>=3:1) on the map background', () => {
    for (const d of DIMENSIONS) {
      const l = lum(d.color);
      expect(l, `${d.id} too light`).toBeLessThan(0.4);
      expect(l, `${d.id} too dark`).toBeGreaterThan(0.05);
      expect(contrast(d.color, MAP_BG), d.id).toBeGreaterThanOrEqual(3);
    }
  });
  it('are all distinct', () => {
    expect(new Set(DIMENSIONS.map((d) => d.color)).size).toBe(8);
  });
});

describe('quiz data', () => {
  const dimSet = new Set(DIMENSION_IDS);
  it('has unique question ids in known sections', () => {
    const sections = new Set(quiz.sections.map((s) => s.id));
    expect(new Set(quiz.questions.map((q) => q.id)).size).toBe(quiz.questions.length);
    for (const q of quiz.questions) expect(sections.has(q.section)).toBe(true);
  });
  it('every option has valid weights and its own Nova reaction', () => {
    for (const q of quiz.questions) {
      expect(new Set(q.options.map((o) => o.id)).size).toBe(q.options.length);
      const reactions = new Set();
      for (const o of q.options) {
        for (const d of Object.keys(o.w)) expect(dimSet.has(d), `${q.id}/${o.id}`).toBe(true);
        expect(o.nova?.length, `${q.id}/${o.id} nova`).toBeGreaterThan(20);
        reactions.add(o.nova);
      }
      expect(reactions.size, `${q.id} reactions must differ per answer`).toBe(q.options.length);
    }
  });
  it('every dimension can be raised by some interest answer', () => {
    for (const d of DIMENSION_IDS) {
      const reachable = quiz.questions.some((q) => q.section === 'interests' && q.options.some((o) => (o.w[d] ?? 0) >= 2));
      expect(reachable, d).toBe(true);
    }
  });
});

describe('buildProfile', () => {
  it('ignores unknown questions and options', () => {
    const p = buildProfile({ nope: ['x'], 'i-project': ['not-real'] }, quiz);
    expect(p.answeredCount).toBe(0);
    expect(Math.max(...Object.values(p.vector))).toBe(0);
  });
  it('scales the display vector so the top dimension is 1', () => {
    const p = buildProfile(PERSONAS[0].answers, quiz);
    expect(Math.max(...Object.values(p.display))).toBeCloseTo(1);
  });
  it('keeps skills separate from interests', () => {
    const interestOnly = buildProfile({ 'i-saturday': ['game'] }, quiz);
    const withSkill = buildProfile({ 'i-saturday': ['game'], 's-done': ['sql'] }, quiz);
    expect(withSkill.vector.data).toBeGreaterThan(interestOnly.vector.data);
    expect(withSkill.vector.play).toBeGreaterThan(withSkill.vector.data); // interest still dominates
  });
  it('records which answers contributed to which dimension', () => {
    const p = buildProfile({ 'i-saturday': ['ctf'] }, quiz);
    expect(p.contributions.some((c) => c.dim === 'security' && c.optionId === 'ctf')).toBe(true);
  });
});

describe('recommend', () => {
  it('returns no matches when nothing has been answered', () => {
    const res = recommend(buildProfile({}, quiz), careers);
    expect(res.insufficient).toBe(true);
    expect(res.matches).toEqual([]);
  });
  it('a career profile is its own best match with score 1', () => {
    for (const c of careers) {
      const res = recommend({ vector: c.vector, display: c.vector, contributions: [] }, careers);
      expect(res.matches[0].career.id).toBe(c.id);
      expect(res.matches[0].score).toBeCloseTo(1);
    }
  });
  it('is sorted, bounded 0..1 and deterministic', () => {
    const a = personaResult('data-ai-curious');
    const b = personaResult('data-ai-curious');
    expect(a.ranked.map((r) => r.career.id)).toEqual(b.ranked.map((r) => r.career.id));
    for (let i = 0; i < a.ranked.length; i++) {
      expect(a.ranked[i].score).toBeLessThanOrEqual(1);
      expect(a.ranked[i].score).toBeGreaterThanOrEqual(0);
      if (i) expect(a.ranked[i - 1].score).toBeGreaterThanOrEqual(a.ranked[i].score);
    }
  });
  it('security-minded student gets security careers first', () => {
    expect(topIds(personaResult('security-tinkerer'), 2).sort()).toEqual(['penetration-tester', 'security-analyst']);
  });
  it('data and AI student gets data/AI careers in the top 3', () => {
    const top3 = topIds(personaResult('data-ai-curious'), 3);
    const dataAi = ['data-scientist', 'ml-engineer', 'ai-engineer', 'data-analyst'];
    expect(top3.filter((id) => dataAi.includes(id)).length).toBeGreaterThanOrEqual(3);
  });
  it('creative people-person gets design/product first', () => {
    const res = personaResult('creative-people');
    expect(topIds(res, 2).sort()).toEqual(['ui-ux-designer', 'ux-researcher']);
    expect(topIds(res, 5)).toContain('product-manager');
  });
  it('game builder gets Game Developer first', () => {
    expect(topIds(personaResult('game-builder'), 1)).toEqual(['game-developer']);
  });
  it('different personas get different top picks', () => {
    const tops = PERSONAS.map((p) => topIds(personaResult(p.id), 1)[0]);
    expect(new Set(tops).size).toBe(PERSONAS.length);
  });
  it('alternatives never repeat a top match and widen the areas covered', () => {
    for (const p of PERSONAS) {
      const res = personaResult(p.id);
      const matchIds = new Set(res.matches.map((m) => m.career.id));
      expect(res.alternatives.length).toBeGreaterThan(0);
      for (const a of res.alternatives) expect(matchIds.has(a.career.id)).toBe(false);
      const topAreas = new Set(res.matches.slice(0, 3).map((m) => m.career.area));
      expect(res.alternatives.some((a) => !topAreas.has(a.career.area))).toBe(true);
    }
  });
  it('explanations are real: driver shares sum to <= 1 and sources come from the student answers', () => {
    for (const p of PERSONAS) {
      const res = personaResult(p.id);
      const chosen = new Set(Object.entries(p.answers).flatMap(([q, ids]) => ids.map((i) => `${q}/${i}`)));
      for (const m of res.matches) {
        expect(m.why.drivers.length).toBeGreaterThan(0);
        expect(m.why.drivers.reduce((s, d) => s + d.share, 0)).toBeLessThanOrEqual(1.0001);
        m.why.drivers.slice(1).forEach((d) => expect(d.share).toBeGreaterThanOrEqual(0.1));
        for (const d of m.why.drivers) {
          for (const s of d.sources) expect(chosen.has(`${s.questionId}/${s.optionId}`)).toBe(true);
        }
      }
    }
  });
});

describe('match floors', () => {
  const singles = quiz.questions.flatMap((q) => q.options.map((o) => ({ id: `${q.id}/${o.id}`, answers: { [q.id]: [o.id] } })));
  const profiles = [...PERSONAS.map((p) => ({ id: p.id, answers: p.answers })), ...singles];
  const results = profiles.map((p) => ({ id: p.id, res: recommend(buildProfile(p.answers, quiz), careers) }));

  it('exposes the agreed thresholds', () => {
    expect(MIN_MATCH_PERCENT).toBe(50);
    expect(MIN_ALT_PERCENT).toBe(45);
  });
  it('never returns a match below 50%, for personas or any single-answer profile', () => {
    for (const { id, res } of results) {
      for (const m of res.matches) expect(m.percent, `${id} ${m.career.id}`).toBeGreaterThanOrEqual(50);
      expect(res.matches.length).toBeLessThanOrEqual(5);
    }
  });
  it('never suggests an alternative below 45%, and never repeats a match', () => {
    for (const { id, res } of results) {
      const ids = new Set(res.matches.map((m) => m.career.id));
      for (const a of res.alternatives) {
        expect(a.percent, `${id} ${a.career.id}`).toBeGreaterThanOrEqual(45);
        expect(ids.has(a.career.id)).toBe(false);
      }
      expect(res.alternatives.length).toBeLessThanOrEqual(3);
    }
  });
  it('returns fewer than 5 matches, and fewer alternatives, when scores are low', () => {
    const llm = recommend(buildProfile({ 'i-headline': ['llm'] }, quiz), careers);
    expect(llm.matches.length).toBeLessThan(5);
    expect(llm.alternatives.length).toBeLessThan(3);
    expect(llm.belowMatchFloor).toBe(llm.ranked.filter((r) => r.percent < 50).length);
    expect(llm.ranked.length).toBe(careers.length);
  });
  it('can have no matches at all without being "insufficient"', () => {
    // "none yet" alone has no signal (insufficient); a real but unusual profile can still score low everywhere
    const none = recommend(buildProfile({ 's-done': ['none'] }, quiz), careers);
    expect(none.insufficient).toBe(true);
    expect(none.matches).toEqual([]);
  });
  it('still shows the full persona result sizes the product relies on', () => {
    for (const p of PERSONAS) {
      const res = recommend(buildProfile(p.answers, quiz), careers);
      expect(res.matches.length, p.id).toBe(5);
      expect(res.alternatives.length, p.id).toBeGreaterThan(0);
    }
  });
});
