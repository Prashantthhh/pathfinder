// Record that a person checked an exam or body name on its official site by hand.
//   npm run links:verify -- list
//   npm run links:verify -- add exams:upsc-cse --date 2026-11-05 [--note "seen on the notification page"]
//   npm run links:verify -- remove exams:upsc-cse
// Only entries that are in the registry can be added; `--date` (YYYY-MM-DD) is required and is the day you checked.
import { readFileSync, writeFileSync } from 'node:fs';
import { isValidDate } from '../src/data/verification.js';

const read = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const FILE = new URL('../src/data/india-manual-verification.json', import.meta.url);
const registry = read('../src/data/indiaRegistry.json');
const auto = read('../src/data/india-verification.json');
const manual = read('../src/data/india-manual-verification.json');

const [cmd, key, ...rest] = process.argv.slice(2);
const flag = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
const fail = (msg) => { console.error(msg); process.exit(1); };
const entryOf = (k) => { const [kind, id] = (k ?? '').split(':'); return registry[kind]?.[id] ? { kind, id, ...registry[kind][id] } : null; };

if (cmd === 'list') {
  const rows = Object.keys(auto.results).filter((k) => { const r = auto.results[k]; return !(r.loaded && r.needleFound); });
  console.log('Not confirmed by the checker (candidates for a manual check):');
  for (const k of rows) {
    const e = entryOf(k); const m = manual.entries[k];
    console.log(`  ${k.padEnd(24)} ${(e?.name ?? '?').padEnd(36)} ${e?.url ?? '(no url)'}  ${m ? `[verified manually on ${m.verifiedOn}]` : auto.results[k].loaded ? '[page loaded, name not found]' : '[site unreachable]'}`);
  }
  const extra = Object.keys(manual.entries).filter((k) => !rows.includes(k));
  if (extra.length) console.log('Also recorded manually: ' + extra.join(', '));
} else if (cmd === 'add') {
  const e = entryOf(key);
  if (!e) fail(`Unknown registry entry "${key}". Use kind:id, e.g. exams:upsc-cse (see \`list\`).`);
  const date = flag('date');
  if (!isValidDate(date)) fail('--date YYYY-MM-DD is required: the day you checked the name on the official site.');
  if (date > new Date().toISOString().slice(0, 10)) fail('--date is in the future.');
  manual.entries[key] = { verifiedOn: date, ...(flag('note') ? { note: flag('note') } : {}) };
  writeFileSync(FILE, JSON.stringify(manual, null, 2) + '\n');
  console.log(`Recorded: ${e.name} (${key}) verified manually on ${date}.`);
} else if (cmd === 'remove') {
  if (!manual.entries[key]) fail(`${key} is not recorded manually.`);
  delete manual.entries[key];
  writeFileSync(FILE, JSON.stringify(manual, null, 2) + '\n');
  console.log(`Removed ${key}.`);
} else fail('Usage: links:verify -- list | add <kind:id> --date YYYY-MM-DD [--note text] | remove <kind:id>');
