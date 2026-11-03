// Client side of live Nova. Builds the SMALL context the server is allowed to use, calls /api/nova, and
// says why when it can't, so the chat can fall back to the demo answers.
//
// Sent to the server (and from there to the AI provider): the question and up to 4 recent turns, the top
// matches (career id + score), the Career DNA (six numbers), the career page being viewed (id only; the
// server looks the career up), and the next roadmap stage (its title and a count). Nothing identifying:
// no name or email, no goal note, no saved list, no quiz answers.
import { progress } from './roadmap.js';

export const LIVE_DAILY_CAP = 25;
const CAP_KEY = 'pathfinder:nova-live';
const TIMEOUT_MS = 20000;

/** @returns the `context` object of the request */
export function buildNovaContext({ result, profile, career = null, ticked = [] }) {
  const ctx = {};
  if (result && !result.insufficient && result.matches?.length) {
    ctx.matches = result.matches.slice(0, 5).map((m) => ({ id: m.career.id, percent: m.percent }));
  }
  const d = profile?.display;
  if (d && Object.values(d).some((v) => v > 0)) ctx.dna = { R: d.R, I: d.I, A: d.A, S: d.S, E: d.E, C: d.C };
  if (career) {
    ctx.careerId = career.id;
    const p = progress(career, ticked);
    if (p.next) ctx.stage = { title: p.next.title, detail: p.next.detail ?? '', done: p.done, total: p.total };
  }
  return ctx;
}

const today = (now) => new Date(now).toISOString().slice(0, 10);

function readCap(storage, now) {
  try {
    const raw = JSON.parse(storage?.getItem(CAP_KEY) ?? 'null');
    return raw && raw.day === today(now) ? raw.n : 0;
  } catch {
    return 0;
  }
}
function bumpCap(storage, now) {
  try {
    storage?.setItem(CAP_KEY, JSON.stringify({ day: today(now), n: readCap(storage, now) + 1 }));
  } catch {
    /* storage unavailable: the server limit still applies */
  }
}

/**
 * @returns {Promise<{ ok: true, text: string } | { ok: false, reason: 'not_configured'|'rate_limited'|'provider_limit'|'upstream'|'filtered'|'daily_cap'|'bad_request', retryAfter?: number }>}
 */
export async function askLive({ question, history = [], context = {} }, { fetchImpl = globalThis.fetch, storage = globalThis.localStorage, now = Date.now() } = {}) {
  if (readCap(storage, now) >= LIVE_DAILY_CAP) return { ok: false, reason: 'daily_cap' };
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    const res = await fetchImpl('/api/nova', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question, history: history.slice(-4), context }),
      signal: ctl.signal,
    });
    let body = null;
    try {
      body = await res.json();
    } catch {
      // not JSON (for example the dev or preview server has no /api): live Nova isn't set up here
      return { ok: false, reason: 'not_configured' };
    }
    if (body?.error === 'not_configured') return { ok: false, reason: 'not_configured' };
    bumpCap(storage, now);
    if (res.ok && body?.ok && typeof body.answer === 'string' && body.answer.trim()) return { ok: true, text: body.answer };
    if (body?.error === 'rate_limited') return { ok: false, reason: 'rate_limited', retryAfter: Number(body.retryAfter) || 60 };
    if (['provider_limit', 'filtered', 'bad_request'].includes(body?.error)) return { ok: false, reason: body.error };
    return { ok: false, reason: 'upstream' };
  } catch {
    return { ok: false, reason: 'upstream' };
  } finally {
    clearTimeout(timer);
  }
}

/** Plain-language note shown with the demo answer when live Nova could not answer. */
export const FALLBACK_NOTE = {
  not_configured: "Live Nova isn't switched on here, so this is a preset demo answer.",
  upstream: "Live Nova couldn't answer just now, so this is a preset demo answer.",
  provider_limit: 'Live Nova has hit its free limit for now, so this is a preset demo answer.',
  rate_limited: "You've asked a lot of questions quickly. Live Nova needs a short rest, so this is a preset demo answer.",
  daily_cap: "You've used today's live questions, so this is a preset demo answer.",
  filtered: "Live Nova's answer included figures or dates we can't check, so we've not shown it. This is a preset demo answer instead.",
  bad_request: "That question couldn't be sent to live Nova, so this is a preset demo answer.",
};
