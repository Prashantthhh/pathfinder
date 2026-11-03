// Shows what the AI provider actually answers (status and message) and which models your key can use.
//   npm run nova:diagnose
// Reads NOVA_API_KEY from pathfinder/.env, .env.local or the shell. The key is never printed.
import { existsSync, readFileSync } from 'node:fs';

const env = { ...process.env };
for (const name of ['.env', '.env.local']) {
  const url = new URL(`../${name}`, import.meta.url);
  if (!existsSync(url)) continue;
  for (const line of readFileSync(url, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && m[2] && !line.trim().startsWith('#') && !(m[1] in process.env)) env[m[1]] = m[2].replace(/^['"]|['"]$/g, '');
  }
}
const key = env.NOVA_API_KEY;
if (!key) {
  console.log('NOVA_API_KEY is not set (looked in .env, .env.local and the shell).');
  process.exit(1);
}
const url = env.NOVA_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const model = env.NOVA_MODEL || 'llama-3.3-70b-versatile';
const redact = (t) => String(t).split(key).join('[key]').replace(/gsk_[A-Za-z0-9]+/g, 'gsk_[redacted]').slice(0, 700);

console.log(`Key: present (${key.length} characters, starts "${key.slice(0, 4)}…" hidden after that)`);
console.log(`URL:   ${url}`);
console.log(`Model: ${model}${env.NOVA_MODEL ? ' (from NOVA_MODEL)' : ' (default)'}\n`);

async function call(label, u, init) {
  try {
    const res = await fetch(u, init);
    const text = await res.text();
    console.log(`${label}: HTTP ${res.status} ${res.statusText}`);
    return { res, text };
  } catch (e) {
    console.log(`${label}: network error: ${redact(e.cause?.code ?? e.message)}`);
    return null;
  }
}

const chat = await call('POST chat/completions', url, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
  body: JSON.stringify({ model, messages: [{ role: 'user', content: 'Reply with the single word: ok' }], max_tokens: 5 }),
});
if (chat) console.log(redact(chat.text), '\n');

const modelsUrl = url.replace(/\/chat\/completions\/?$/, '/models');
const list = await call('GET models', modelsUrl, { headers: { Authorization: `Bearer ${key}` } });
if (list) {
  try {
    const ids = (JSON.parse(list.text).data ?? []).map((m) => m.id).sort();
    console.log(`${ids.length} models available to this key:`);
    for (const id of ids) console.log(`  ${id}${id === model ? '   <- the configured model' : ''}`);
  } catch {
    console.log(redact(list.text));
  }
}
