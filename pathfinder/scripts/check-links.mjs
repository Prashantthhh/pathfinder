// Verifies the India exam / governing-body registry against the OFFICIAL sites.
//   npm run links:check             report only
//   npm run links:check -- --write  also save src/data/india-verification.json
//   npm run links:check -- --only exams:aibe,bodies:bci --write   check just these entries (others keep their saved result)
//
// For every entry in src/data/indiaRegistry.json it loads the official page in a
// real browser and checks TWO things:
//   1. the page loads (HTTP < 400 and it has real content), and
//   2. the exam / body NAME appears in the page text (the entry's `needles`).
// The product shows a name and link only when both hold; otherwise it says
// "Check with the official body". Mismatches (page loads, name not found) are
// listed separately from unreachable sites, and make the command exit non-zero.
//
// Browser: Microsoft Edge by default. Override with E2E_BROWSER=chrome or E2E_CHROME_PATH.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const file = (p) => fileURLToPath(new URL(p, import.meta.url));
const registry = JSON.parse(readFileSync(file('../src/data/indiaRegistry.json'), 'utf8'));
const write = process.argv.includes('--write');
const onlyArg = process.argv.indexOf('--only');
const only = onlyArg >= 0 ? new Set(process.argv[onlyArg + 1].split(',')) : null;

const entries = [];
for (const kind of ['exams', 'bodies']) {
  for (const [id, e] of Object.entries(registry[kind])) entries.push({ key: `${kind}:${id}`, kind, id, ...e });
}

if (only) {
  const unknown = [...only].filter((k) => !entries.some((e) => e.key === k));
  if (unknown.length) { console.error(`Unknown registry entries: ${unknown.join(', ')}`); process.exit(2); }
  for (let i = entries.length - 1; i >= 0; i--) if (!only.has(entries[i].key)) entries.splice(i, 1);
}

const browser = await chromium.launch(process.env.E2E_CHROME_PATH
  ? { executablePath: process.env.E2E_CHROME_PATH }
  : { channel: process.env.E2E_BROWSER || 'msedge' });
// A normal desktop user-agent: several Indian government sites return 403 to "HeadlessChrome".
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36 Edg/130.0.0.0';
const ctx = await browser.newContext({ userAgent: UA });

async function check(e, attempt = 1) {
  if (!e.url) return { loaded: false, needleFound: false, note: 'no official URL on record' };
  const page = await ctx.newPage();
  try {
    const res = await page.goto(e.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('networkidle', { timeout: 12000 }).catch(() => {});
    const status = res?.status() ?? 0;
    const text = `${await page.title()}\n${await page.evaluate(() => document.body?.innerText ?? '')}`;
    const loaded = status > 0 && status < 400 && text.trim().length > 150;
    const hit = (e.needles ?? []).find((n) => new RegExp(n, 'i').test(text));
    return {
      loaded,
      status,
      finalUrl: page.url(),
      needleFound: Boolean(hit),
      matched: hit ?? null,
      note: !loaded ? `HTTP ${status || 'n/a'} or empty page` : hit ? 'ok' : `page loads but none of ${JSON.stringify(e.needles)} found`,
    };
  } catch (err) {
    return { loaded: false, needleFound: false, note: String(err.message).split('\n')[0].slice(0, 90) };
  } finally {
    await page.close();
  }
}

// one retry for sites that rate-limit or are slow
async function checkWithRetry(e) {
  const first = await check(e);
  if (first.loaded || !e.url) return first;
  await new Promise((r) => setTimeout(r, 4000));
  const second = await check(e);
  return second.loaded ? second : first;
}

// small worker pool
const results = {};
let next = 0;
await Promise.all(Array.from({ length: 3 }, async () => {
  while (next < entries.length) {
    const e = entries[next++];
    results[e.key] = await checkWithRetry(e);
  }
}));
await browser.close();

const rows = entries.map((e) => ({ e, r: results[e.key] }));
const ok = rows.filter(({ r }) => r.loaded && r.needleFound);
const mismatch = rows.filter(({ r }) => r.loaded && !r.needleFound);
const unreachable = rows.filter(({ r }) => !r.loaded);

for (const { e, r } of rows) {
  const mark = r.loaded && r.needleFound ? 'OK      ' : r.loaded ? 'MISMATCH' : 'UNREACH ';
  console.log(`${mark} ${e.key.padEnd(26)} ${e.name.padEnd(48)} ${r.note === 'ok' ? '' : r.note}`);
}
console.log(`\n${ok.length} verified (loads AND name found), ${mismatch.length} mismatched, ${unreachable.length} unreachable, of ${rows.length}.`);
if (mismatch.length) {
  console.log('\nMISMATCHES (the page loads but does not mention the name; shown as "Check with the official body"):');
  for (const { e, r } of mismatch) console.log(`  - ${e.name} (${e.url}) :: ${r.note}`);
}
if (unreachable.length) {
  console.log('\nUNREACHABLE (shown as "Check with the official body"):');
  for (const { e, r } of unreachable) console.log(`  - ${e.name} (${e.url ?? 'no URL'}) :: ${r.note}`);
}

if (write) {
  // Merge with the previous file: an unreachable site (these are often slow or rate-limited)
  // keeps an earlier verification and its date; only a run that actually LOADS the page and
  // does not find the name can remove a verification.
  const path = file('../src/data/india-verification.json');
  let previous = {};
  try {
    previous = JSON.parse(readFileSync(path, 'utf8')).results ?? {};
  } catch {
    /* first run */
  }
  const today = new Date().toISOString().slice(0, 10);
  const merged = {};
  // entries not checked this run (--only) keep their saved result
  for (const [key, r] of Object.entries(previous)) if (!(key in results) && (registry[key.split(':')[0]] ?? {})[key.split(':')[1]]) merged[key] = r;
  let kept = 0;
  for (const [key, r] of Object.entries(results)) {
    const old = previous[key];
    const oldVerified = old?.loaded && old?.needleFound;
    if (!r.loaded && oldVerified) {
      merged[key] = old;
      kept++;
    } else {
      merged[key] = { loaded: r.loaded, needleFound: r.needleFound, status: r.status ?? null, finalUrl: r.finalUrl ?? null, checkedAt: today };
    }
  }
  const out = { checkedAt: today, results: merged };
  writeFileSync(path, `${JSON.stringify(out, null, 2)}
`);
  const verified = Object.values(merged).filter((r) => r.loaded && r.needleFound).length;
  console.log(`
Saved src/data/india-verification.json (${today}): ${verified} verified in total${kept ? `, ${kept} kept from an earlier run because the site was unreachable this time` : ''}.`);
}
process.exit(mismatch.length ? 1 : 0);
