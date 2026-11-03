// Turns the browser's small request into the DATA block Nova is allowed to use.
//
// The browser sends ids and numbers, not career text: careers, route names and domains are looked up
// HERE from PATHFINDER's own data, so the data can't be altered from the client. Nothing identifying the
// student is accepted: no name, email, goal note or free-text profile, only these fields.
import { STREAM_LABELS } from '../../src/data/streams.js';
import { verificationOf } from '../../src/data/verification.js';
import { STRONG_MIN, WORTH_MIN } from '../../src/engine/tiers.js';
import { MAX_HISTORY, MAX_QUESTION } from './rules.js';

const STUDY = { '≤3': 'up to 3 years', '4-5': '4 to 5 years', '5+': '5 or more years' };
const TYPES = { R: 'Realistic', I: 'Investigative', A: 'Artistic', S: 'Social', E: 'Enterprising', C: 'Conventional' };
export const CHECK = 'Check with the official body';

const text = (v, max) => (typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max) : '');
const int = (v, lo, hi) => (Number.isFinite(Number(v)) ? Math.min(hi, Math.max(lo, Math.round(Number(v)))) : null);

/** Validate the request. Returns { ok: true, value } or { ok: false, error }. */
export function parseRequest(body, data) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'bad_request' };
  const question = text(body.question, MAX_QUESTION + 1);
  if (!question || question.length > MAX_QUESTION) return { ok: false, error: 'bad_request' };

  const ctx = body.context && typeof body.context === 'object' ? body.context : {};
  const ids = new Set(data.careers.map((c) => c.id));

  const history = (Array.isArray(body.history) ? body.history : [])
    .filter((m) => m && (m.role === 'user' || m.role === 'nova') && typeof m.text === 'string')
    .slice(-MAX_HISTORY)
    .map((m) => ({ role: m.role === 'nova' ? 'assistant' : 'user', content: text(m.text, 600) }))
    .filter((m) => m.content);

  const matches = (Array.isArray(ctx.matches) ? ctx.matches : [])
    .filter((m) => m && typeof m.id === 'string' && ids.has(m.id) && int(m.percent, 0, 100) !== null)
    .slice(0, 5)
    .map((m) => ({ id: m.id, percent: int(m.percent, 0, 100) }));

  let dna = null;
  if (ctx.dna && typeof ctx.dna === 'object') {
    const d = {};
    for (const t of Object.keys(TYPES)) {
      const v = Number(ctx.dna[t]);
      if (Number.isFinite(v)) d[t] = Math.round(Math.min(1, Math.max(0, v)) * 10) / 10;
    }
    if (Object.keys(d).length === 6) dna = d;
  }

  const careerId = typeof ctx.careerId === 'string' && ids.has(ctx.careerId) ? ctx.careerId : null;
  // the full roadmap of the career being viewed, each stage marked done or not
  const stages = (Array.isArray(ctx.stages) ? ctx.stages : [])
    .filter((s) => s && typeof s === 'object' && text(s.title, 120))
    .slice(0, 12)
    .map((s) => ({ title: text(s.title, 120), detail: text(s.detail, 240), done: s.done === true }));
  return { ok: true, value: { question, history, matches, dna, careerId, stages: careerId ? stages : [] } };
}

const tierWord = (p) => (p >= STRONG_MIN ? 'strong match' : p >= WORTH_MIN ? 'worth exploring' : p >= 50 ? 'partial overlap' : 'below the 50% match line');

function named(kind, id, data) {
  const entry = data.registry[kind]?.[id];
  if (!entry) return CHECK;
  const key = `${kind}:${id}`;
  return verificationOf(data.auto[key], data.manual[key]).verified ? entry.name : CHECK;
}

function careerBlock(c, data) {
  const lines = [
    `Title: ${c.title}`,
    `Domain: ${data.domainLabel[c.domain] ?? c.domain}`,
    `Description (from O*NET, a US occupation): ${c.description}`,
    c.skills.length ? `Skills it needs more than most careers (O*NET): ${c.skills.join(', ')}` : `Core skills, common to many careers (O*NET): ${(c.coreSkills ?? []).join(', ')}`,
    `Knowledge areas it needs more than most careers (O*NET): ${(c.knowledge ?? []).join(', ')}`,
    `Typical route in India (verify with the official body): usually starts from ${c.entry.streams.map((s) => STREAM_LABELS[s] ?? s).join(', ')}; typical study length ${STUDY[c.entry.studyYears]}`,
  ];
  const exams = [...new Set((c.routes ?? []).filter((r) => r.exam).map((r) => named('exams', r.exam, data)))];
  const bodies = [...new Set((c.routes ?? []).filter((r) => r.body).map((r) => named('bodies', r.body, data)))];
  if (exams.length) lines.push(`Entrance exam: ${exams.join('; ')}`);
  if (bodies.length) lines.push(`Governing or licensing body: ${bodies.join('; ')}`);
  if (c.onet.loose) lines.push(`Note: ${c.onet.loose}`);
  lines.push('Salary and outlook for India: not available (data not connected yet)');
  return lines.join('\n');
}

/** The DATA text for the user turn. */
export function buildData(value, data) {
  const parts = ['DATA'];
  if (value.matches.length) {
    const rows = value.matches.map((m, i) => `${i + 1}. ${data.careers.find((c) => c.id === m.id).title}: ${m.percent}% (${tierWord(m.percent)})`);
    parts.push(`The student's top matches (a score compares interests, it is not a prediction):\n${rows.join('\n')}`);
  } else {
    parts.push("The student has no matches yet (they haven't taken the quiz).");
  }
  if (value.dna) {
    parts.push(`The student's Career DNA (0 to 1, where 1 is their own strongest interest): ${Object.entries(TYPES).map(([k, n]) => `${n} ${value.dna[k]}`).join(', ')}`);
  }
  if (value.careerId) {
    parts.push(`The career page the student is on:\n${careerBlock(data.careers.find((c) => c.id === value.careerId), data)}`);
  }
  if (value.stages.length) {
    const rows = value.stages.map((s, i) => `${i + 1}. [${s.done ? 'DONE' : 'NOT DONE'}] ${s.title}${s.detail ? ` (${s.detail})` : ''}`);
    const next = value.stages.find((s) => !s.done);
    parts.push(
      `The student's roadmap for this career (the typical route; the student ticks stages as they finish them):\n${rows.join('\n')}\n` +
      (next ? `The next step is the first stage not done: ${next.title}.` : 'Every stage is done.') +
      ' Never suggest a stage that is marked DONE as something still to do.',
    );
  }
  return parts.join('\n\n');
}
