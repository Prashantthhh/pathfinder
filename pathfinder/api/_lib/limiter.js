// Per-user rate limit for the live Nova endpoint.
//
// There are no accounts, so a "user" is an anonymous client: the IP address, hashed with a random salt
// that lives only in memory (the address itself is never stored or logged). Counts live in this serverless
// instance's memory, so the limit is best-effort: separate instances don't share counts and a cold start
// resets them. For a hard limit across instances use a shared store (for example Upstash Redis / Vercel KV).
import { createHash, randomBytes } from 'node:crypto';

export function createLimiter({ perWindow = 8, windowMs = 10 * 60 * 1000, perDay = 40, globalPerDay = 600, now = Date.now } = {}) {
  const salt = randomBytes(16).toString('hex');
  const clients = new Map(); // hash -> { hits: number[], day: number[] }
  let global = { day: 0, n: 0 };
  const DAY = 24 * 60 * 60 * 1000;

  const key = (ip) => createHash('sha256').update(`${salt}:${ip || 'unknown'}`).digest('hex').slice(0, 24);

  return {
    /** @returns {{ ok: true } | { ok: false, retryAfter: number, scope: string }} */
    take(ip) {
      const t = now();
      const dayNo = Math.floor(t / DAY);
      if (global.day !== dayNo) global = { day: dayNo, n: 0 };
      if (global.n >= globalPerDay) return { ok: false, retryAfter: Math.ceil(((dayNo + 1) * DAY - t) / 1000), scope: 'global' };

      const k = key(ip);
      const c = clients.get(k) ?? { hits: [], day: [] };
      c.hits = c.hits.filter((x) => t - x < windowMs);
      c.day = c.day.filter((x) => t - x < DAY);
      if (c.hits.length >= perWindow) return { ok: false, retryAfter: Math.ceil((windowMs - (t - c.hits[0])) / 1000), scope: 'window' };
      if (c.day.length >= perDay) return { ok: false, retryAfter: Math.ceil((DAY - (t - c.day[0])) / 1000), scope: 'day' };
      c.hits.push(t);
      c.day.push(t);
      clients.set(k, c);
      global.n += 1;
      if (clients.size > 5000) for (const [kk, v] of clients) if (!v.day.length || t - v.day[v.day.length - 1] > DAY) clients.delete(kk);
      return { ok: true };
    },
  };
}
