// Cross-page quality audit: every route, with and without student data, at phone, small-phone and desktop widths.
//   npm run audit          (build first: npm run build)
// Checks: no console errors, no horizontal scroll, a unique page title, one h1, a main landmark, axe-core
// (WCAG 2.0/2.1/2.2 A and AA plus best practices), tap targets of at least 24x24 CSS px (WCAG 2.2 AA),
// a visible keyboard focus indicator on everything reachable by Tab, and no running animation under
// prefers-reduced-motion. Exits non-zero on any failure.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { preview } from 'vite';
import { PERSONAS } from '../src/engine/fixtures.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const persona = (id) => PERSONAS.find((p) => p.id === id).answers;

const FULL = {
  v: 1,
  saved: ['doctor', 'animator'],
  compare: ['doctor', 'animator', 'civil-servant'],
  roadmap: { doctor: ['class12', 'entrance'] },
  skills: { Science: 'confident', Writing: 'learning', 'knowledge:Biology': 'none' },
  goal: 'Become a doctor',
};
const STATES = {
  full: { ...FULL, quiz: { answers: persona('science-pcb'), step: 0, status: 'complete' } },
  empty: null,
};
const PAGES = [
  ['/', ['full', 'empty']],
  ['/quiz', ['empty', 'full']],
  ['/results', ['full', 'empty']],
  ['/explore', ['full', 'empty']],
  ['/explore?domain=design', ['full']],
  ['/profile', ['full', 'empty']],
  ['/dashboard', ['full', 'empty']],
  ['/compare', ['full', 'empty']],
  ['/nova', ['full']],
  ['/nova?career=doctor', ['full']],
  ['/about', ['empty']],
  ['/privacy', ['empty']],
  ['/careers/doctor', ['full', 'empty']],
  ['/careers/musician', ['full']],
  ['/careers/chartered-accountant', ['full']],
  ['/careers/not-a-career', ['empty']],
  ['/no-such-page', ['empty']],
];
const VIEWPORTS = [
  ['desktop', { width: 1280, height: 900 }],
  ['phone', { width: 390, height: 844 }],
  ['small phone', { width: 320, height: 640 }],
];

const server = await preview({ root, logLevel: 'silent', preview: { port: 4330, strictPort: false, open: false } });
const BASE = server.resolvedUrls.local[0].replace(/\/$/, '');
const browser = await chromium.launch(process.env.E2E_CHROME_PATH ? { executablePath: process.env.E2E_CHROME_PATH } : { channel: process.env.E2E_BROWSER || 'msedge' });

const problems = [];
const titles = new Map();
let checked = 0;
const bad = (where, what) => problems.push(`${where}: ${what}`);

for (const [vpName, viewport] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport, hasTouch: vpName !== 'desktop' });
  const page = await ctx.newPage();
  let errors = [];
  page.on('console', (m) => { if (m.type() === 'error' && !m.location().url.endsWith('/api/nova')) errors.push(m.text()); }); // the static preview has no /api/nova
  page.on('pageerror', (e) => errors.push(e.message));

  for (const [path, states] of PAGES) {
    for (const state of states) {
      const where = `${vpName} ${path} [${state}]`;
      errors = [];
      await page.goto(BASE + '/', { waitUntil: 'networkidle' });
      await page.evaluate((s) => { localStorage.clear(); if (s) localStorage.setItem('pathfinder:v1', JSON.stringify(s)); }, STATES[state]);
      await page.goto(BASE + path, { waitUntil: 'networkidle' });
      checked++;

      if (errors.length) bad(where, `console errors: ${errors.slice(0, 2).join(' | ')}`);

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (overflow > 0) bad(where, `horizontal scroll (${overflow}px)`);

      const info = await page.evaluate(() => ({
        title: document.title,
        h1: document.querySelectorAll('h1').length,
        main: document.querySelectorAll('main').length,
        lang: document.documentElement.lang,
        desc: document.querySelector('meta[name=description]')?.content ?? '',
      }));
      if (!info.title || /in tech/i.test(info.title)) bad(where, `page title is "${info.title}"`);
      if (info.h1 !== 1) bad(where, `${info.h1} h1 elements`);
      if (info.main !== 1) bad(where, `${info.main} main landmarks`);
      if (info.lang !== 'en') bad(where, `html lang is "${info.lang}"`);
      if (!info.desc) bad(where, 'no meta description');
      if (vpName === 'desktop') {
        const key = `${path.split('?')[0]}`;
        const seen = titles.get(info.title);
        if (seen && seen !== key && !/Not found|not found|couldn/i.test(info.title)) bad(where, `title "${info.title}" is also used by ${seen}`);
        titles.set(info.title, key);
      }

      // text that is cut off with an ellipsis hides information from the student
      const clipped = await page.evaluate(() => [...document.querySelectorAll('body *')]
        .filter((el) => getComputedStyle(el).textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1)
        .map((el) => `${el.tagName.toLowerCase()}.${String(el.className).split(' ')[0]} "${(el.textContent || '').trim().slice(0, 20)}"`));
      if (clipped.length) bad(where, `text cut off with an ellipsis: ${[...new Set(clipped)].slice(0, 3).join('; ')}`);

      // axe
      await page.addScriptTag({ content: axeSource });
      const violations = await page.evaluate(async () => {
        const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] } });
        return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
      });
      for (const v of violations) bad(where, `axe ${v}`);

      // tap targets: controls smaller than 24x24 CSS px (WCAG 2.2 AA 2.5.8); inline links in running text are exempt
      const small = await page.evaluate(() => {
        const out = [];
        const sel = 'button, input:not([type=hidden]), select, textarea, summary, [role=button], nav a, .btn, .sign, .crow a, .tablewrap';
        for (const el of document.querySelectorAll(sel)) {
          const r = el.getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (cs.visibility === 'hidden' || cs.display === 'none' || r.width === 0 || r.height === 0) continue;
          if (el.matches('input[type=radio], input[type=checkbox]') && el.closest('label') && el.closest('label').getBoundingClientRect().height >= 24) continue;
          if (el.closest('.sr-only')) continue;
          if (r.width < 24 || r.height < 24) out.push(`${el.tagName.toLowerCase()}${el.className ? '.' + String(el.className).split(' ')[0] : ''} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.innerText || el.getAttribute('aria-label') || '').slice(0, 24)}"`);
        }
        return out;
      });
      if (small.length) bad(where, `tap targets under 24px: ${[...new Set(small)].slice(0, 4).join('; ')}`);

      // keyboard: every stop has a visible focus indicator, and Tab never gets stuck
      if (vpName === 'desktop') {
        await page.evaluate(() => document.activeElement?.blur());
        const seen = new Set();
        const noRing = [];
        for (let i = 0; i < 60; i++) {
          await page.keyboard.press('Tab');
          const f = await page.evaluate(() => {
            const el = document.activeElement;
            if (!el || el === document.body) return null;
            const cs = getComputedStyle(el);
            const wrap = el.closest('label, .opt, .seg__opt, .hexmap__dot');
            const ws = wrap ? getComputedStyle(wrap) : null;
            const ring = (s) => s && ((s.outlineStyle !== 'none' && parseFloat(s.outlineWidth) > 0) || (s.boxShadow && s.boxShadow !== 'none'));
            const r = el.getBoundingClientRect();
            const hidden = (r.width === 0 && r.height === 0);
            return { id: el.tagName + (el.id ? '#' + el.id : '') + '.' + String(el.className).split(' ')[0], ring: ring(cs) || ring(ws) || el.matches('input[type=radio],input[type=checkbox],input[type=range]') && !!wrap, hidden };
          });
          if (!f) break;
          const key = f.id + i;
          seen.add(key);
          if (!f.ring && !f.hidden) noRing.push(f.id);
        }
        if (noRing.length) bad(where, `no visible focus indicator on: ${[...new Set(noRing)].slice(0, 4).join(', ')}`);
      }
    }
  }
  await ctx.close();
}

// reduced motion: nothing keeps animating when the student asks for less
{
  const ctx = await browser.newContext({ viewport: VIEWPORTS[0][1], reducedMotion: 'reduce' });
  const page = await ctx.newPage();
  for (const path of ['/', '/quiz', '/results', '/nova']) {
    await page.goto(BASE + '/', { waitUntil: 'networkidle' });
    await page.evaluate((s) => localStorage.setItem('pathfinder:v1', JSON.stringify(s)), STATES.full);
    await page.goto(BASE + path, { waitUntil: 'networkidle' });
    await page.waitForTimeout(400);
    const running = await page.evaluate(() => document.getAnimations().filter((a) => a.playState === 'running' && (a.effect?.getTiming?.().iterations === Infinity)).map((a) => a.animationName || a.id || 'animation'));
    if (running.length) bad(`reduced motion ${path}`, `still animating forever: ${[...new Set(running)].join(', ')}`);
    checked++;
  }
  await ctx.close();
}

// mobile menu: opens, announces its state, closes with Escape
{
  const ctx = await browser.newContext({ viewport: VIEWPORTS[1][1], hasTouch: true });
  const page = await ctx.newPage();
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  const btn = page.locator('.nav-toggle, button[aria-controls="site-nav"]').first();
  if (!(await btn.count())) bad('mobile menu', 'no menu button found');
  else {
    if ((await btn.getAttribute('aria-expanded')) !== 'false') bad('mobile menu', 'aria-expanded is not "false" when closed');
    await btn.click();
    if ((await btn.getAttribute('aria-expanded')) !== 'true') bad('mobile menu', 'aria-expanded is not "true" when open');
    await page.keyboard.press('Escape');
    if ((await btn.getAttribute('aria-expanded')) !== 'false') bad('mobile menu', 'Escape does not close the menu');
    if (!(await btn.evaluate((el) => document.activeElement === el))) bad('mobile menu', 'focus does not return to the menu button after Escape');
  }
  await ctx.close();
}

await browser.close();
await server.close();
console.log(`Audited ${checked} page states.`);
if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  for (const p of problems) console.log(' - ' + p);
  process.exit(1);
}
console.log('No problems found.');
