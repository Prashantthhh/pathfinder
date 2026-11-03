// Full-page screenshots at desktop and mobile widths, into e2e-output/shots/ (git-ignored).
//   npm run shots                      the default list below
//   npm run shots -- /careers/doctor   one path (as the science student)
// Needs a build (`npm run build`). Uses the same browser settings as `npm run e2e`.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { preview } from 'vite';
import { PERSONAS } from '../src/engine/fixtures.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const out = fileURLToPath(new URL('../e2e-output/shots/', import.meta.url));
mkdirSync(out, { recursive: true });

const LIST = [
  { name: 'dna', path: '/profile', persona: 'science-pcb' },
  { name: 'career-doctor', path: '/careers/doctor', persona: 'science-pcb' },
  { name: 'career-animator', path: '/careers/animator', persona: 'artistic-maker' },
  { name: 'career-doctor-skills-roadmap', path: '/careers/doctor#skills', persona: 'science-pcb', state: { saved: ['doctor'], roadmap: { doctor: ['class12', 'entrance'] }, skills: { 'Critical Thinking': 'confident', Writing: 'learning', Speaking: 'none' } } },
  { name: 'compare', path: '/compare', persona: 'science-pcb', state: { compare: ['doctor', 'animator', 'civil-servant'] } },
  { name: 'dashboard', path: '/dashboard', persona: 'science-pcb', state: { saved: ['doctor', 'animator'], roadmap: { doctor: ['class12', 'entrance'] }, skills: { Writing: 'confident' }, goal: 'Become a doctor' } },
  { name: 'dashboard-empty', path: '/dashboard', persona: 'science-pcb' },
  ...(process.env.SHOTS_EXTRA ? JSON.parse(process.env.SHOTS_EXTRA) : []),
];
const only = process.argv[2];
const jobs = only ? [{ name: only.replace(/\W+/g, '-').replace(/^-|-$/g, ''), path: only, persona: 'science-pcb' }] : LIST;

const server = await preview({ root, logLevel: 'silent', preview: { port: 4310, strictPort: false, open: false } });
const BASE = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch(process.env.E2E_CHROME_PATH ? { executablePath: process.env.E2E_CHROME_PATH } : { channel: process.env.E2E_BROWSER || 'msedge' });
for (const [label, viewport] of [['desktop', { width: 1280, height: 900 }], ['mobile', { width: 390, height: 844 }]]) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  for (const j of jobs) {
    const answers = PERSONAS.find((p) => p.id === j.persona).answers;
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.evaluate(([a, extra]) => localStorage.setItem('pathfinder:v1', JSON.stringify({ v: 1, quiz: { answers: a, step: 0, status: 'complete' }, ...(extra ?? {}) })), [answers, j.state]);
    await page.goto(BASE + j.path, { waitUntil: 'networkidle' });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    await page.screenshot({ path: `${out}${j.name}-${label}.png`, fullPage: true });
    console.log(`${j.name}-${label}.png${overflow > 0 ? `  (horizontal overflow ${overflow}px)` : ''}`);
  }
  await ctx.close();
}
await browser.close();
await server.close();
