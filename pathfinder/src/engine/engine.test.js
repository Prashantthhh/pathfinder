import { describe, it, expect } from 'vitest';
import careers from '../data/careers.json';
import meta from '../data/careersMeta.json';
import seeds from '../data/careerSeeds.json';
import registry from '../data/indiaRegistry.json';
import quiz from '../data/quiz.json';
import domainData from '../data/domains.json';
import { DIMENSION_IDS } from '../data/dimensions.js';
import { SETTINGS, SETTING_IDS } from '../data/settings.js';
import { STREAM_LABELS } from '../data/streams.js';
import { cosine } from './cosine.js';
import { buildProfile, centre, visibleQuestions } from './vector.js';
import { recommend, splitMatches, scoreOf, WEIGHTS } from './recommend.js';
import { assess } from './feasibility.js';
import { primaryType } from './explore.js';
import { PERSONAS } from './fixtures.js';
import { MIN_ALT_PERCENT, MIN_MATCH_PERCENT, tierOf } from './tiers.js';

const byId = (id) => careers.find((c) => c.id === id);
const persona = (id) => PERSONAS.find((p) => p.id === id);
const resultFor = (id) => recommend(buildProfile(persona(id).answers, quiz), careers);
const topIds = (res, n = 5) => res.matches.slice(0, n).map((m) => m.career.id);

describe('cosine', () => {
  it('is 1 for identical direction, regardless of scale', () => {
    expect(cosine({ R: 1, I: 2 }, { R: 2, I: 4 })).toBeCloseTo(1);
  });
  it('is 0 for orthogonal vectors and for empty ones', () => {
    expect(cosine({ R: 1 }, { I: 1 })).toBe(0);
    expect(cosine({}, { R: 1 })).toBe(0);
  });
});

describe('career data (generated from O*NET plus hand-written seeds)', () => {
  const domainIds = new Set(domainData.domains.map((d) => d.id));
  it('has the 61 approved careers with unique ids, in seed order', () => {
    expect(careers).toHaveLength(61);
    expect(new Set(careers.map((c) => c.id)).size).toBe(61);
    expect(careers.map((c) => c.id)).toEqual(seeds.careers.map((c) => c.id));
  });
  it('includes the five swaps and excludes the careers they replaced', () => {
    for (const id of ['ux-ui-designer', 'animator', 'entrepreneur', 'event-manager', 'industrial-designer']) expect(byId(id), id).toBeTruthy();
    for (const id of ['software-tester', 'network-engineer', 'market-research-analyst']) expect(byId(id), id).toBeUndefined();
    expect(byId('chemical-engineer')?.domain).toBe('chemical-materials');
  });
  it('every career sits in a known domain', () => {
    for (const c of careers) expect(domainIds.has(c.domain), c.id).toBe(true);
  });
  it('covers all 35 domains', () => {
    const empty = domainData.domains.filter((d) => !careers.some((c) => c.domain === d.id)).map((d) => d.id);
    expect(empty).toEqual([]);
  });
  it('interest scores are O*NET 1-7 values for all six types', () => {
    for (const c of careers) {
      expect(Object.keys(c.riasec).sort(), c.id).toEqual([...DIMENSION_IDS].sort());
      for (const v of Object.values(c.riasec)) expect(v >= 1 && v <= 7, `${c.id} ${v}`).toBe(true);
    }
  });
  it('work settings are 0-1 (relative to these careers) with the raw derived values kept', () => {
    for (const c of careers) {
      expect(Object.keys(c.settings).sort(), c.id).toEqual([...SETTING_IDS].sort());
      for (const k of SETTING_IDS) {
        expect(c.settings[k] >= 0 && c.settings[k] <= 1, `${c.id}.${k}`).toBe(true);
        expect(c.settingsRaw[k] >= 0 && c.settingsRaw[k] <= 1, `${c.id}.${k} raw`).toBe(true);
      }
    }
    for (const set of SETTINGS) {
      const vals = careers.map((c) => c.settings[set.id]);
      expect(Math.min(...vals), set.id).toBe(0);
      expect(Math.max(...vals), set.id).toBe(1);
    }
  });
  it('each career carries O*NET tasks, skills, a description and a traceable occupation code', () => {
    for (const c of careers) {
      expect(c.onet.code, c.id).toMatch(/^\d{2}-\d{4}\.\d{2}$/);
      expect(c.description.length, c.id).toBeGreaterThan(40);
      expect(c.tasks.length, c.id).toBeGreaterThanOrEqual(3);
      expect(c.skills.length, c.id).toBeGreaterThanOrEqual(3);
      expect(c.keywords.length, c.id).toBeGreaterThanOrEqual(2);
    }
  });
  it('flags loose O*NET matches, and only those', () => {
    const loose = careers.filter((c) => c.onet.loose).map((c) => c.id).sort();
    expect(loose).toEqual(['bank-officer', 'civil-servant', 'company-secretary', 'entrepreneur']);
    for (const c of careers.filter((x) => x.onet.loose)) expect(c.onet.loose.length).toBeGreaterThan(30);
  });
  it('typical route fields are valid and use known streams and study buckets', () => {
    for (const c of careers) {
      expect(c.entry.streams.length, c.id).toBeGreaterThan(0);
      for (const s of c.entry.streams) expect(s in STREAM_LABELS, `${c.id} ${s}`).toBe(true);
      expect(['≤3', '4-5', '5+'], c.id).toContain(c.entry.studyYears);
    }
  });
  it('India routes only reference registered exams and bodies', () => {
    for (const c of careers) {
      for (const r of c.routes) {
        if (r.exam) expect(registry.exams[r.exam], `${c.id} exam ${r.exam}`).toBeTruthy();
        if (r.body) expect(registry.bodies[r.body], `${c.id} body ${r.body}`).toBeTruthy();
      }
    }
  });
  it('the registry holds names and links only: no eligibility, fees, ages or patterns', () => {
    // what users can see is the name; needles are only search patterns for links:check
    const text = [...Object.values(registry.exams), ...Object.values(registry.bodies)].map((e) => e.name).join(' | ').toLowerCase();
    for (const banned of ['eligib', 'fee', 'age limit', 'percent', '%', 'syllabus', 'pattern', 'marks']) expect(text.includes(banned), banned).toBe(false);
    for (const e of [...Object.values(registry.exams), ...Object.values(registry.bodies)]) {
      if (e.url) expect(e.url).toMatch(/^https:\/\//);
    }
  });
  it('never invents salary or outlook figures', () => {
    for (const c of careers) {
      expect(c.salary).toBeNull();
      expect(c.outlook).toBeNull();
    }
  });
  it('related careers exist, are not the career itself, and are three', () => {
    const ids = new Set(careers.map((c) => c.id));
    for (const c of careers) {
      expect(c.related).toHaveLength(3);
      for (const r of c.related) {
        expect(ids.has(r), `${c.id} -> ${r}`).toBe(true);
        expect(r).not.toBe(c.id);
      }
    }
  });
  it('records where the numbers came from, for attribution', () => {
    expect(meta.source).toBe('O*NET 31.0 Database');
    expect(meta.release).toMatch(/August 2026/);
    expect(meta.license).toBe('CC BY 4.0');
    expect(meta.interests.sources).toContain('Machine Learning/Expert');
    expect(meta.settingsMethod).toMatch(/derived by PATHFINDER/);
  });
  it('sanity: well-known occupations have the primary interest Holland theory expects', () => {
    const expected = { electrician: 'R', 'graphic-designer': 'A', 'chartered-accountant': 'C', 'school-teacher': 'S', entrepreneur: 'E', physicist: 'I', 'film-director': 'A' };
    for (const [id, t] of Object.entries(expected)) expect(primaryType(byId(id)), id).toBe(t);
  });
});

describe('quiz data', () => {
  const kinds = (k) => quiz.questions.filter((q) => q.kind === k);
  it('stays under 20 questions for every student (16, or 17 for a graduate)', () => {
    expect(visibleQuestions(quiz, {}).length).toBe(16);
    expect(visibleQuestions(quiz, { 'q-stream': ['graduate'] }).length).toBe(17);
    expect(quiz.questions.length).toBeLessThan(20);
  });
  it('asks the required stream/education and constraints questions', () => {
    expect(kinds('stream')).toHaveLength(1);
    expect(kinds('stream')[0].options.map((o) => o.id)).toEqual(['pcm', 'pcb', 'commerce', 'arts', 'diploma', 'graduate']);
    expect(kinds('grad-field')).toHaveLength(1);
    expect(kinds('grad-field')[0].showIf).toEqual({ question: 'q-stream', option: 'graduate' });
    expect(kinds('study')).toHaveLength(1);
    expect(kinds('earn')).toHaveLength(1);
    for (const q of [...kinds('study'), ...kinds('earn')]) expect(q.options.map((o) => o.value)).toEqual(['yes', 'no', 'unsure']);
  });
  it('has unique question ids in known sections', () => {
    const sections = new Set(quiz.sections.map((s) => s.id));
    expect(new Set(quiz.questions.map((q) => q.id)).size).toBe(quiz.questions.length);
    for (const q of quiz.questions) expect(sections.has(q.section)).toBe(true);
  });
  it('eight interest questions offer exactly one activity per interest type', () => {
    expect(kinds('interest')).toHaveLength(8);
    for (const q of kinds('interest')) {
      expect(q.options).toHaveLength(6);
      expect(q.options.map((o) => Object.keys(o.w)[0]).sort()).toEqual([...DIMENSION_IDS].sort());
      expect(q.max).toBe(2);
    }
  });
  it('every option has its own Nova reaction, different from its siblings', () => {
    for (const q of quiz.questions) {
      expect(new Set(q.options.map((o) => o.id)).size).toBe(q.options.length);
      const reactions = new Set();
      for (const o of q.options) {
        expect(o.nova?.length, `${q.id}/${o.id}`).toBeGreaterThan(20);
        reactions.add(o.nova);
      }
      expect(reactions.size, `${q.id} reactions must differ per answer`).toBe(q.options.length);
    }
  });
  it('option weights only use known interest types; setting answers only known settings, in 0-1', () => {
    for (const q of [...kinds('interest'), ...kinds('subjects')]) {
      for (const o of q.options) for (const d of Object.keys(o.w)) expect(DIMENSION_IDS, `${q.id}/${o.id}`).toContain(d);
    }
    const covered = new Set();
    for (const q of kinds('setting')) {
      for (const o of q.options) {
        for (const [k, v] of Object.entries(o.s)) {
          expect(SETTING_IDS, `${q.id}/${o.id}`).toContain(k);
          expect(v >= 0 && v <= 1).toBe(true);
          covered.add(k);
        }
      }
    }
    expect([...covered].sort()).toEqual([...SETTING_IDS].sort());
  });
  it('every interest type can be raised by the interest questions', () => {
    for (const d of DIMENSION_IDS) expect(kinds('interest').some((q) => q.options.some((o) => (o.w[d] ?? 0) >= 1)), d).toBe(true);
  });
});

describe('buildProfile', () => {
  it('ignores unknown questions and options', () => {
    const p = buildProfile({ nope: ['x'], 'q-act-1': ['not-real'] }, quiz);
    expect(p.answeredCount).toBe(0);
    expect(Math.max(...Object.values(p.riasec))).toBe(0);
  });
  it('sums interest and subject answers into the six types', () => {
    const p = buildProfile({ 'q-act-1': ['a1-R', 'a1-I'], 'q-act-2': ['a2-R'], 'q-subjects': ['physics'] }, quiz);
    expect(p.riasec).toMatchObject({ R: 3, I: 2, A: 0, S: 0, E: 0, C: 0 });
  });
  it('centres the profile so only its shape is compared, and scales the display to 1', () => {
    const p = buildProfile(persona('commerce').answers, quiz);
    expect(Object.values(p.vector).reduce((a, b) => a + b, 0)).toBeCloseTo(0);
    expect(Math.max(...Object.values(p.display))).toBeCloseTo(1);
  });
  it('reads work-style answers into setting preferences', () => {
    const p = buildProfile({ 'q-set-people': ['crowd'], 'q-set-structure': ['free'] }, quiz);
    expect(p.settings).toEqual({ people: 0.95, team: 0.9, autonomy: 0.95, routine: 0.15 });
  });
  it('reads stream, field, study and earning answers into the context, never into the interests', () => {
    expect(buildProfile({ 'q-stream': ['pcb'] }, quiz).context.stream).toBe('pcb');
    expect(buildProfile({ 'q-stream': ['graduate'], 'q-field': ['law'] }, quiz).context.stream).toBe('grad-law');
    expect(buildProfile({ 'q-stream': ['graduate'] }, quiz).context.stream).toBe('grad-any');
    const p = buildProfile({ 'q-stream': ['pcm'], 'q-study': ['no'], 'q-earn': ['yes'] }, quiz);
    expect(p.context).toEqual({ stream: 'pcm', study: 'no', earn: 'yes' });
    expect(Math.max(...Object.values(p.riasec))).toBe(0);
  });
  it('ignores an answer to a question that does not apply (field without "graduate")', () => {
    expect(buildProfile({ 'q-stream': ['pcm'], 'q-field': ['law'] }, quiz).context.stream).toBe('pcm');
  });
  it('records which answers contributed to which interest type', () => {
    const p = buildProfile({ 'q-act-3': ['a3-S'] }, quiz);
    expect(p.contributions.some((c) => c.dim === 'S' && c.optionId === 'a3-S')).toBe(true);
  });
});

describe('recommend', () => {
  it('returns no matches when nothing has been answered', () => {
    const res = recommend(buildProfile({}, quiz), careers);
    expect(res.insufficient).toBe(true);
    expect(res.matches).toEqual([]);
  });
  it('a career interest profile matches itself best, with an interest score of 1', () => {
    for (const c of careers) {
      const profile = { riasec: c.riasec, vector: centre(c.riasec), display: c.riasec, settings: {}, context: {}, contributions: [] };
      const res = recommend(profile, careers);
      expect(res.matches[0].score, c.id).toBeCloseTo(1);
      expect(res.matches.slice(0, 3).map((m) => m.career.id), c.id).toContain(c.id);
    }
  });
  it('is sorted, bounded 0..1 and deterministic', () => {
    const a = resultFor('commerce');
    const b = resultFor('commerce');
    expect(a.ranked.map((r) => r.career.id)).toEqual(b.ranked.map((r) => r.career.id));
    for (let i = 0; i < a.ranked.length; i++) {
      expect(a.ranked[i].score).toBeLessThanOrEqual(1);
      expect(a.ranked[i].score).toBeGreaterThanOrEqual(0);
      if (i) expect(a.ranked[i - 1].score).toBeGreaterThanOrEqual(a.ranked[i].score);
    }
  });
  it('science (PCB) student: medicine and health careers lead', () => {
    const top = topIds(resultFor('science-pcb'), 3);
    expect(top).toContain('doctor');
    expect(top.every((id) => ['doctor', 'physiotherapist', 'clinical-psychologist', 'nurse', 'pharmacist'].includes(id)), top.join()).toBe(true);
  });
  it('commerce student: finance, business and administration careers lead', () => {
    const top = topIds(resultFor('commerce'), 8);
    expect(top).toEqual(expect.arrayContaining(['bank-officer', 'chartered-accountant', 'entrepreneur']));
  });
  it('arts student: creative and people careers lead', () => {
    const top = topIds(resultFor('arts'), 5);
    expect(top).toContain('musician');
    expect(top.some((id) => ['school-teacher', 'special-educator', 'content-writer', 'animator'].includes(id))).toBe(true);
  });
  it('CSE graduate: software and data careers lead', () => {
    expect(topIds(resultFor('cse-graduate'), 4)).toEqual(expect.arrayContaining(['software-developer', 'data-scientist']));
  });
  it('ITI student: skilled hands-on trades lead', () => {
    expect(topIds(resultFor('iti-hands-on'), 3)).toContain('electrician');
  });
  it('different students get different top picks', () => {
    const tops = PERSONAS.map((p) => topIds(resultFor(p.id), 1)[0]);
    expect(new Set(tops).size).toBe(PERSONAS.length);
  });
  it('work settings add a smaller term and can reorder similar careers', () => {
    const base = { 'q-act-1': ['a1-R'], 'q-act-2': ['a2-R'], 'q-act-3': ['a3-R'], 'q-act-4': ['a4-R'], 'q-act-5': ['a5-R'], 'q-act-6': ['a6-R'], 'q-act-7': ['a7-R'], 'q-act-8': ['a8-R'] };
    const handsOn = buildProfile({ ...base, 'q-set-hands': ['hands'] }, quiz);
    const desk = buildProfile({ ...base, 'q-set-hands': ['desk'] }, quiz);
    const e = byId('electrician');
    expect(scoreOf(handsOn, e).score).toBeGreaterThan(scoreOf(desk, e).score);
    expect(WEIGHTS.settings).toBeLessThan(WEIGHTS.interests);
    expect(scoreOf(buildProfile(base, quiz), e).settings).toBeNull(); // no settings answered: interests alone
  });
});

describe('match floors and tiers', () => {
  const singles = quiz.questions
    .filter((q) => q.kind === 'interest' || q.kind === 'subjects')
    .flatMap((q) => q.options.map((o) => ({ id: `${q.id}/${o.id}`, answers: { [q.id]: [o.id] } })));
  const profiles = [...PERSONAS.map((p) => ({ id: p.id, answers: p.answers })), ...singles];
  const results = profiles.map((p) => ({ id: p.id, res: recommend(buildProfile(p.answers, quiz), careers) }));

  it('never returns a match below 50%, and never an alternative below 45% or a repeat', () => {
    for (const { id, res } of results) {
      const ids = new Set(res.matches.map((m) => m.career.id));
      for (const m of res.matches) expect(m.percent, `${id} ${m.career.id}`).toBeGreaterThanOrEqual(MIN_MATCH_PERCENT);
      for (const a of res.alternatives) {
        expect(a.percent, `${id} ${a.career.id}`).toBeGreaterThanOrEqual(MIN_ALT_PERCENT);
        expect(ids.has(a.career.id)).toBe(false);
      }
      expect(res.matches.length).toBeLessThanOrEqual(8);
      expect(res.alternatives.length).toBeLessThanOrEqual(3);
    }
  });
  it('shows fewer matches rather than weak ones for a thin profile', () => {
    const thin = results.find((r) => r.id === 'q-subjects/arts').res;
    expect(thin.matches.length + thin.belowMatchFloor).toBe(careers.length - thin.ranked.filter((r) => r.percent >= 50).slice(8).length);
    expect(thin.ranked.length).toBe(61);
  });
  it('explanations are real: sources come from the student answers, and weaker drivers are not listed', () => {
    for (const p of PERSONAS) {
      const res = resultFor(p.id);
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
  it('a driver is only a type where BOTH the student and the career are above their own average', () => {
    for (const p of PERSONAS) {
      const profile = buildProfile(p.answers, quiz);
      for (const m of resultFor(p.id).matches) {
        const c = centre(m.career.riasec);
        for (const d of m.why.drivers) {
          expect(profile.vector[d.dim], `${p.id} ${m.career.id} ${d.dim} student`).toBeGreaterThan(0);
          expect(c[d.dim], `${p.id} ${m.career.id} ${d.dim} career`).toBeGreaterThan(0);
        }
      }
    }
  });
  it('the commerce student never "leans on" Artistic interests for Bank Officer', () => {
    const bank = resultFor('commerce').ranked.find((m) => m.career.id === 'bank-officer');
    expect(bank.why.drivers.map((d) => d.dim)).not.toContain('A');
    expect(bank.why.drivers.map((d) => d.dim)).toEqual(expect.arrayContaining(['C', 'E']));
  });
  it('tiers follow the agreed bands', () => {
    expect(tierOf(80).id).toBe('strong');
    expect(tierOf(75).id).toBe('strong');
    expect(tierOf(74).id).toBe('worth');
    expect(tierOf(60).id).toBe('worth');
    expect(tierOf(59).id).toBe('partial');
    expect(tierOf(50).id).toBe('partial');
    expect(tierOf(49)).toBeNull();
  });
});

describe('typical-route fit (stream and study length)', () => {
  const fits = (id, ctx) => assess(byId(id), ctx);
  it('is silent when nothing was answered', () => {
    expect(fits('doctor', {}).fits).toBe(true);
    expect(fits('doctor', { stream: null, study: 'unsure', earn: 'unsure' }).fits).toBe(true);
  });
  it('flags a different starting stream, with the labels of the usual ones', () => {
    const r = fits('doctor', { stream: 'commerce' });
    expect(r.fits).toBe(false);
    expect(r.reasons[0].kind).toBe('stream');
    expect(r.reasons[0].text).toContain('Science (PCB)');
    expect(fits('doctor', { stream: 'pcb' }).fits).toBe(true);
  });
  it('treats any-stream and any-graduate routes as open to everyone', () => {
    expect(fits('lawyer', { stream: 'pcm' }).fits).toBe(true);
    expect(fits('bank-officer', { stream: 'commerce' }).fits).toBe(true);
    expect(fits('bank-officer', { stream: 'grad-eng' }).fits).toBe(true);
  });
  it('flags a long route when the student wants to start work soon or is not open to 5+ years', () => {
    expect(fits('doctor', { stream: 'pcb', study: 'no' }).reasons.some((r) => r.kind === 'study')).toBe(true);
    expect(fits('doctor', { stream: 'pcb', earn: 'yes' }).reasons.some((r) => r.kind === 'study')).toBe(true);
    expect(fits('electrician', { stream: 'diploma', study: 'no', earn: 'yes' }).fits).toBe(true);
    expect(fits('doctor', { stream: 'pcb', study: 'yes', earn: 'no' }).fits).toBe(true);
  });
  it('does not count bachelor\'s years against a graduate whose degree already fits the route', () => {
    expect(fits('software-developer', { stream: 'grad-eng', earn: 'yes', study: 'no' }).fits).toBe(true);
    expect(fits('statistician', { stream: 'grad-eng', study: 'no' }).fits).toBe(false); // needs study beyond a degree
  });
  it('never changes the match score or hides a career', () => {
    const a = buildProfile({ ...persona('commerce').answers, 'q-earn': ['yes'] }, quiz);
    const b = buildProfile({ ...persona('commerce').answers, 'q-earn': ['no'], 'q-stream': ['pcb'] }, quiz);
    const ra = recommend(a, careers);
    const rb = recommend(b, careers);
    expect(ra.ranked.map((r) => [r.career.id, r.percent])).toEqual(rb.ranked.map((r) => [r.career.id, r.percent]));
    expect(ra.matches.map((m) => m.career.id)).toEqual(rb.matches.map((m) => m.career.id));
  });
});

describe('Strong / Explore further split', () => {
  it('puts a match in Strong only if it scores 75%+ AND its typical route fits; the rest are Explore further', () => {
    for (const p of PERSONAS) {
      const res = resultFor(p.id);
      const { strong, explore } = splitMatches(res.matches);
      expect(strong.length + explore.length).toBe(res.matches.length);
      for (const m of strong) {
        expect(m.percent).toBeGreaterThanOrEqual(75);
        expect(m.fit.fits).toBe(true);
      }
      for (const m of explore) expect(m.percent < 75 || !m.fit.fits).toBe(true);
    }
  });
  it('keeps a strong score visible when the route does not fit, with the reasons', () => {
    const { explore } = splitMatches(resultFor('commerce').matches);
    const civil = explore.find((m) => m.career.id === 'civil-servant');
    expect(civil).toBeTruthy();
    expect(civil.percent).toBeGreaterThanOrEqual(75);
    expect(civil.fit.reasons.length).toBeGreaterThan(0);
  });
  it('a graduate in a matching field gets technical careers as strong fits', () => {
    const { strong } = splitMatches(resultFor('cse-graduate').matches);
    expect(strong.map((m) => m.career.id)).toEqual(expect.arrayContaining(['software-developer', 'data-scientist']));
  });
});

describe('strongly Artistic student (drawing, design, making things)', () => {
  const res = resultFor('artistic-maker');
  const top = (n) => res.matches.slice(0, n).map((m) => m.career.id);
  it('puts Animator, Fashion, Graphic and Industrial Designer in the top 5, all with real scores', () => {
    expect(top(5)).toEqual(expect.arrayContaining(['animator', 'fashion-designer', 'graphic-designer', 'industrial-designer']));
    for (const id of ['animator', 'fashion-designer', 'graphic-designer']) expect(res.ranked.find((r) => r.career.id === id).percent, id).toBeGreaterThanOrEqual(80);
  });
  it('UX/UI Designer is not strong for a purely Artistic student: O*NET profiles it as Investigative-led', () => {
    expect(byId('ux-ui-designer').riasec.I).toBeGreaterThan(byId('ux-ui-designer').riasec.R);
    expect(res.ranked.find((r) => r.career.id === 'ux-ui-designer').percent).toBeLessThan(50);
  });
  it('it becomes the top match for a student who pairs Artistic with Investigative and Conventional picks', () => {
    const acts = (picks) => Object.fromEntries(picks.map((p, i) => [`q-act-${i + 1}`, p.map((t) => `a${i + 1}-${t}`)]));
    const answers = { ...persona('artistic-maker').answers, ...acts([['A', 'I'], ['A', 'I'], ['A', 'C'], ['A', 'I'], ['A', 'C'], ['A', 'I'], ['A', 'C'], ['A', 'I']]), 'q-subjects': ['arts', 'cs', 'maths'] };
    const r = recommend(buildProfile(answers, quiz), careers);
    expect(r.matches[0].career.id).toBe('ux-ui-designer');
    expect(r.matches[0].percent).toBeGreaterThanOrEqual(80);
  });
});

describe('related careers', () => {
  it('Graphic Designer lists UX/UI Designer (a hand-picked pin, then the nearest by interests), and vice versa', () => {
    expect(byId('graphic-designer').related[0]).toBe('ux-ui-designer');
    expect(byId('ux-ui-designer').related[0]).toBe('graphic-designer');
    for (const c of careers) expect(new Set(c.related).size, c.id).toBe(3);
  });
  it('neet-pg is gone from the India registry', async () => {
    const reg = (await import('../data/indiaRegistry.json')).default;
    expect(reg.exams['neet-pg']).toBeUndefined();
  });
});
