// The live Nova endpoint's logic, separate from Vercel's request objects so it can be tested with the
// model call mocked. The API key comes ONLY from the environment (NOVA_API_KEY), is sent only to the
// provider, and is never returned, logged or sent to the browser.
//
// Provider: any OpenAI-compatible chat-completions API. Defaults to Groq (free tier).
//   NOVA_API_KEY  (required)  NOVA_API_URL  NOVA_MODEL
import { loadData } from './data.js';
import { parseRequest, buildData } from './context.js';
import { checkAnswer } from './guard.js';
import { createLimiter } from './limiter.js';
import { SYSTEM_PROMPT } from './rules.js';

export const DEFAULT_URL = 'https://api.groq.com/openai/v1/chat/completions';
export const DEFAULT_MODEL = 'llama-3.3-70b-versatile';
const TIMEOUT_MS = 15000;

const sharedLimiter = createLimiter();

/**
 * @param {{ method: string, body: any, ip?: string, env?: Record<string,string|undefined>, fetchImpl?: typeof fetch,
 *           limiter?: ReturnType<typeof createLimiter>, data?: object }} req
 * @returns {Promise<{ status: number, body: object, headers?: object }>}
 */
export async function handleNova({ method, body, ip = '', env = process.env, fetchImpl = globalThis.fetch, limiter = sharedLimiter, data = null }) {
  if (method !== 'POST') return { status: 405, body: { ok: false, error: 'method_not_allowed' }, headers: { Allow: 'POST' } };

  const key = env.NOVA_API_KEY;
  if (!key) return { status: 503, body: { ok: false, error: 'not_configured' } };

  const d = data ?? loadData();
  const parsed = parseRequest(body, d);
  if (!parsed.ok) return { status: 400, body: { ok: false, error: parsed.error } };

  const slot = limiter.take(ip);
  if (!slot.ok) return { status: 429, body: { ok: false, error: 'rate_limited', retryAfter: slot.retryAfter }, headers: { 'Retry-After': String(slot.retryAfter) } };

  const v = parsed.value;
  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...v.history,
    { role: 'user', content: `${buildData(v, d)}\n\nStudent's question: ${v.question}` },
  ];

  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  let res;
  try {
    res = await fetchImpl(env.NOVA_API_URL || DEFAULT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ model: env.NOVA_MODEL || DEFAULT_MODEL, messages, temperature: 0.3, max_tokens: 320 }),
      signal: ctl.signal,
    });
  } catch {
    return { status: 502, body: { ok: false, error: 'upstream' } };
  } finally {
    clearTimeout(timer);
  }
  // 429 from the provider means the free limit is hit; any other failure is just "unavailable".
  if (res.status === 429) return { status: 502, body: { ok: false, error: 'provider_limit' } };
  if (!res.ok) return { status: 502, body: { ok: false, error: 'upstream' } };

  let answer;
  try {
    answer = (await res.json())?.choices?.[0]?.message?.content;
  } catch {
    return { status: 502, body: { ok: false, error: 'upstream' } };
  }
  const checked = checkAnswer(answer);
  if (!checked.ok) return { status: 502, body: { ok: false, error: checked.reason } };
  return { status: 200, body: { ok: true, source: 'ai', answer: checked.text } };
}
