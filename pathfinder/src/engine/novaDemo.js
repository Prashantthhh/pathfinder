import { DIMENSIONS } from '../data/dimensions.js';

// Nova's demo brain. There is NO language model here: the chat matches the
// user's words to a fixed list of answers written in advance. A few answers
// are filled in from local data (career pages, the user's own results) and
// are marked as such so nobody mistakes them for generated text.

const normalise = (s) => ` ${String(s).toLowerCase().replace(/[^a-z0-9+# ]+/g, ' ').replace(/\s+/g, ' ').trim()} `;
const mentions = (text, phrase) => text.includes(` ${phrase.toLowerCase().replace(/[^a-z0-9+# ]+/g, ' ').replace(/\s+/g, ' ').trim()} `);

/** "AI Engineer (LLM apps)" -> "ai engineer" */
const shortTitle = (c) => c.title.replace(/\(.*?\)/g, '').trim();

function careerAnswer(career) {
  const parts = [
    `${career.title}: ${career.overview}`,
    `Skills often used: ${career.skills.slice(0, 4).join('; ')}.`,
    `A beginner project idea: ${career.projects[0]}.`,
  ];
  if (career.entryNote) parts.push(career.entryNote);
  parts.push('Salary and demand: data not connected yet.');
  return parts.join(' ');
}

function topMatchAnswer(result) {
  if (!result || result.insufficient || !result.matches.length) {
    return {
      source: 'results',
      text: "I don't have matches for you yet, so there's nothing to explain. Take the quiz first and I can walk through the reasons.",
      link: { to: '/quiz', label: 'Take the quiz' },
    };
  }
  const top = result.matches[0];
  const answers = top.why.drivers.flatMap((d) => d.sources).slice(0, 2).map((s) => `"${s.label}"`);
  const text = [
    `${top.career.title} is at the top with a ${top.percent}% match score.`,
    top.why.sentence,
    answers.length ? `Answers behind it include ${answers.join(' and ')}.` : '',
    'Remember the score compares your answers with a hand-written career profile; it is not a prediction of success.',
  ].filter(Boolean).join(' ');
  return { source: 'results', text, link: { to: `/careers/${top.career.id}`, label: `Open ${top.career.title}` } };
}

/**
 * @param {string} input what the user typed or the suggested question
 * @param {{ demo: object, careers: object[], result?: object|null }} ctx
 * @returns {{ id: string, source: 'preset'|'career'|'results'|'fallback', text: string, link?: {to,label} }}
 */
export function answerFor(input, { demo, careers, result = null }) {
  const text = normalise(input);

  // 1. A question that is exactly one of the presets (from the suggestion buttons)
  const exact = demo.prompts.find((p) => normalise(p.question) === text);
  if (exact) return fromPrompt(exact, { careers, result });

  // 2. Preset phrases. A multi-word phrase hit counts double and wins on its own;
  //    prompts marked "strong" (salary, law degree...) also win on one word, so the
  //    honest "not connected" style answers beat a plain career summary.
  let best = null;
  let strongBest = null;
  for (const p of demo.prompts) {
    const hits = p.keywords.reduce((n, k) => (mentions(text, k) ? n + (k.includes(' ') ? 2 : 1) : n), 0);
    if (!hits) continue;
    if (!best || hits > best.hits) best = { p, hits };
    const wins = hits >= 2 || p.strong;
    if (wins && (!strongBest || hits > strongBest.hits)) strongBest = { p, hits };
  }
  if (strongBest) return fromPrompt(strongBest.p, { careers, result });

  // 3. A career named in the text
  const named = careers.filter((c) => mentions(text, shortTitle(c)));
  if (named.length === 1) {
    return { id: `career-${named[0].id}`, source: 'career', text: careerAnswer(named[0]), link: { to: `/careers/${named[0].id}`, label: `Open ${named[0].title}` } };
  }
  if (named.length > 1) {
    return { id: 'multi-career', source: 'preset', text: "I can only talk about one career at a time in demo mode. Name one and I'll share its summary. A side-by-side comparison tool is planned but not built yet." };
  }

  // 4. Single-word preset hit
  if (best) return fromPrompt(best.p, { careers, result });

  return { id: 'fallback', source: 'fallback', text: demo.fallback };
}

function fromPrompt(p, { result }) {
  if (p.kind === 'dimensions') {
    return { id: p.id, source: 'preset', text: `There are eight: ${DIMENSIONS.map((d) => `${d.label} (${d.blurb.replace(/\.$/, '').toLowerCase()})`).join('; ')}.` };
  }
  if (p.kind === 'results-top') return { id: p.id, ...topMatchAnswer(result) };
  return { id: p.id, source: 'preset', text: p.answer };
}

/** Suggested question for a career page, used by "Ask Nova about this career". */
export const careerQuestion = (career) => `Tell me about ${shortTitle(career)}`;
