// Vercel serverless function: POST /api/nova. All logic is in api/_lib/nova.js.
import { handleNova } from './_lib/nova.js';

export default async function handler(req, res) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      body = null;
    }
  }
  const ip = String(req.headers['x-forwarded-for'] ?? req.headers['x-real-ip'] ?? '').split(',')[0].trim();
  const out = await handleNova({ method: req.method, body, ip });
  res.setHeader('Cache-Control', 'no-store');
  for (const [k, v] of Object.entries(out.headers ?? {})) res.setHeader(k, v);
  res.status(out.status).json(out.body);
}
