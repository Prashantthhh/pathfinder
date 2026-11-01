// End-to-end checks in a real browser. Run with:  npm run e2e
//
// It builds the app, serves the build with Vite's preview server on a free
// port, drives the UI by clicking, and exits non-zero if any check fails.
//
// Browser: uses Microsoft Edge by default (installed on Windows). Override with
//   E2E_BROWSER=chrome         another installed channel
//   E2E_CHROME_PATH=...        path to any Chromium-based executable
// Set E2E_SHOTS=1 to save screenshots to e2e-output/.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { preview } from 'vite';
import { PERSONAS } from '../src/engine/fixtures.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const readJson = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const quiz = readJson('../src/data/quiz.json');
const shotsDir = process.env.E2E_SHOTS ? fileURLToPath(new URL('../e2e-output/', import.meta.url)) : null;
if (shotsDir) mkdirSync(shotsDir, { recursive: true });

if (!existsSync(new URL('../dist/index.html', import.meta.url))) {
  console.error('No build found. Run `npm run e2e` (it builds first) or `npm run build`.');
  process.exit(2);
}

let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : `  -> ${extra}`}`);
  if (!ok) failures++;
};
const lower = (s) => s.toLowerCase();

const server = await preview({ root, logLevel: 'silent', preview: { port: 4300, strictPort: false, open: false } });
const BASE = server.resolvedUrls.local[0].replace(/\/$/, '');

const launchOptions = process.env.E2E_CHROME_PATH
  ? { executablePath: process.env.E2E_CHROME_PATH }
  : { channel: process.env.E2E_BROWSER || 'msedge' };
const browser = await chromium.launch(launchOptions);
const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(e.message));

const shot = (p, name, opts = {}) => (shotsDir ? p.screenshot({ path: `${shotsDir}${name}.png`, ...opts }) : null);
const bubble = () => page.locator('.quiz__nova .bubble').innerText();
const stepText = async (p = page) => lower(await p.locator('.quiz__count').innerText());
const seed = (answers, status = 'in-progress') =>
  page.evaluate((state) => localStorage.setItem('pathfinder:v1', JSON.stringify({ v: 1, quiz: state })), { answers, step: 0, status });
const pcts = (loc) => loc.evaluateAll((els) => els.map((e) => parseInt(e.textContent, 10)));

const q0 = quiz.questions[0];
const q1 = quiz.questions[1];
const persona = PERSONAS[0];

// ---------------------------------------------------------------- quiz flow
await page.goto(BASE + '/quiz', { waitUntil: 'networkidle' });
await page.evaluate(() => localStorage.clear());
await page.reload({ waitUntil: 'networkidle' });
check('fresh visit goes straight to question 1', (await stepText()).includes('question 1 of 13'));
check('Nova intro uses the section intro', (await bubble()).includes('What pulls you in'));
check('no Back button on first question', (await page.getByRole('button', { name: /Back/ }).count()) === 0);

await page.getByRole('button', { name: /Next/ }).click();
check('Next with no answer shows an alert', await page.locator('[role=alert]').isVisible());
check('still on question 1', (await stepText()).includes('question 1 of 13'));

const [a, b] = q0.options;
await page.click(`input[name="${q0.id}"][value="${a.id}"]`);
check("Nova reacts to first pick with that answer's text", (await bubble()) === a.nova, await bubble());
await page.click(`input[name="${q0.id}"][value="${b.id}"]`);
check('Nova reacts to second pick with a different, specific text', (await bubble()) === b.nova, await bubble());
check('alert cleared after answering', (await page.locator('[role=alert]').count()) === 0);
check('selected rows show what was recorded', (await page.locator('.opt.is-selected .opt__recorded').count()) === 2);
await page.click(`input[name="${q0.id}"][value="${b.id}"]`);
check('unticking gets a removal message', (await bubble()).includes('taken'), await bubble());

await page.click(`input[name="${q0.id}"][value="${q0.options[2].id}"]`);
await page.click(`input[name="${q0.id}"][value="${q0.options[3].id}"]`);
check('4th pick is disabled at max 3', await page.locator(`input[name="${q0.id}"][value="${q0.options[4].id}"]`).isDisabled());

await page.locator(`input[name="${q0.id}"][value="${q0.options[3].id}"]`).focus();
await page.keyboard.press('Space');
check('Space toggles a checkbox from the keyboard', !(await page.locator(`input[name="${q0.id}"][value="${q0.options[3].id}"]`).isChecked()));
await page.keyboard.press('Space');

await page.getByRole('button', { name: /Next/ }).click();
check('advanced to question 2', (await stepText()).includes('question 2 of 13'));
check('focus moved to the step heading', await page.evaluate(() => document.activeElement?.className === 'quiz__step'));
await page.click(`input[name="${q1.id}"][value="${q1.options[0].id}"]`);
check('single choice: Nova text for that exact option', (await bubble()) === q1.options[0].nova);
await page.getByRole('button', { name: /Back/ }).click();
check('Back returns to question 1', (await stepText()).includes('question 1 of 13'));
check('earlier answers kept after Back', (await page.locator(`input[name="${q0.id}"]:checked`).count()) === 3);

const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pathfinder:v1')));
check('progress written to localStorage', stored?.quiz?.answers?.[q0.id]?.length === 3 && stored.quiz.answers[q1.id]?.[0] === q1.options[0].id);

await page.reload({ waitUntil: 'networkidle' });
check('reload shows the resume gate', await page.getByRole('heading', { name: 'Welcome back' }).isVisible());
check('gate states how many answered', (await page.locator('.gate').innerText()).includes('answered 2 of 13'));
await page.getByRole('button', { name: /Resume at question/ }).click();
check('resume lands on the saved question with answers', (await page.locator(`input[name="${q0.id}"]:checked`).count()) === 3);
await shot(page, 'quiz-q1', { fullPage: true });

await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Start over' }).click();
check('start over asks for confirmation', await page.getByRole('button', { name: /Yes, clear/ }).isVisible());
await page.getByRole('button', { name: /Yes, clear/ }).click();
check('after clearing: question 1, nothing selected', (await page.locator('.opt input:checked').count()) === 0 && (await stepText()).includes('question 1 of 13'));

// ---------------------------------------------------------------- full run -> results
for (const q of quiz.questions) {
  for (const id of persona.answers[q.id]) await page.click(`input[name="${q.id}"][value="${id}"]`);
  const last = q.id === quiz.questions.at(-1).id;
  await page.getByRole('button', { name: last ? /See my matches/ : /Next/ }).click();
}
await page.waitForURL('**/results');
check('finishing goes to /results', true);
check('results heading', (await page.locator('h1').innerText()) === 'Your matches');
const titles = await page.locator('.result__title').allInnerTexts();
check('top match is Security Analyst', titles[0] === 'Security Analyst', titles.join(' | '));
check('says a match score is not a prediction of success', (await page.locator('.note').first().innerText()).includes('not a prediction of success'));
check('Why this match is open for #1', await page.locator('.result').first().locator('details').evaluate((d) => d.open));
check('no incomplete banner when finished', (await page.locator('.banner').count()) === 0);
await shot(page, 'results-desktop', { fullPage: true });

// tiers, floors and wording
const tierHeadings = await page.locator('.results__group > h2').allInnerTexts();
check('only the three agreed band headings (plus alternatives)', tierHeadings.every((h) => ['Strong matches', 'Worth exploring', 'Partial overlap', 'Other trails worth a look'].includes(h)), tierHeadings.join(', '));
const matchPcts = await pcts(page.locator('.results__group[aria-labelledby^="tier-"] .match__pct'));
check('every listed match is 50% or higher', matchPcts.length > 0 && matchPcts.every((n) => n >= 50), matchPcts.join(','));
const strongPcts = await pcts(page.locator('[aria-labelledby="tier-strong"] .match__pct'));
check('Strong matches are all >= 80%', strongPcts.length > 0 && strongPcts.every((n) => n >= 80), strongPcts.join(','));
const worthPcts = await pcts(page.locator('[aria-labelledby="tier-worth"] .match__pct'));
check('Worth exploring are all 65-79%', worthPcts.every((n) => n >= 65 && n <= 79), worthPcts.join(','));
const altPcts = await pcts(page.locator('[aria-labelledby="alts-title"] .match__pct'));
check('alternatives are all >= 45%', altPcts.every((n) => n >= 45), altPcts.join(','));

// Why this match: no student percentage, shows career weight + answers
await page.locator('.result details').first().evaluate((d) => { d.open = true; });
const resultsText = lower(await page.locator('.results').innerText());
check('no "your profile" percentage anywhere in Why this match', !resultsText.includes('your profile 1') && !/your profile \d+%/.test(resultsText) && !/your profile\s+\d/.test(resultsText));
const why = lower(await page.locator('.result').first().locator('.why').innerText());
check("Why this match shows the career's weight", why.includes('puts a weight of'));
check('Why this match lists the quiz answers behind it', why.includes('your answers that point here') && why.includes('tried ctfs'));

// neutral bars, blaze colours kept on markers
const barInfo = await page.locator('.match__bar span').first().evaluate((el) => ({ inline: el.getAttribute('style'), bg: getComputedStyle(el).backgroundColor }));
check('result bars have no inline colour and use the neutral ink-soft', !/background/.test(barInfo.inline) && barInfo.bg === 'rgb(79, 74, 59)', JSON.stringify(barInfo));
const blazeCount = await page.locator('.why__blaze').first().evaluate((el) => getComputedStyle(el).backgroundColor);
check('dimension markers still carry a blaze colour', blazeCount !== 'rgba(0, 0, 0, 0)' && blazeCount !== 'rgb(79, 74, 59)', blazeCount);

// all-ranked list respects the floor
await page.locator('.allranked summary').click();
const listedPcts = await page.locator('.allranked__list li > span').evaluateAll((els) => els.map((e) => parseInt(e.textContent, 10)));
check('"every career scoring 50% or more" lists nothing under 50%', listedPcts.length > 0 && listedPcts.every((n) => n >= 50), listedPcts.join(','));
check('says how many are not listed', (await page.locator('.allranked').innerText()).toLowerCase().includes('below 50%'));

// completed quiz gate; reload persistence
await page.goto(BASE + '/quiz', { waitUntil: 'networkidle' });
check('completed quiz shows the finished gate', await page.getByRole('heading', { name: /finished the quiz/ }).isVisible());
await page.goto(BASE + '/results', { waitUntil: 'networkidle' });
check('results survive a full reload', (await page.locator('.result__title').first().innerText()) === 'Security Analyst');

// ---------------------------------------------------------------- low-score profiles
await seed({ 'i-headline': ['llm'] });
await page.goto(BASE + '/results', { waitUntil: 'networkidle' });
const fewM = page.getByTestId('fewer-matches');
check('fewer than 5 matches: explains why', (await fewM.isVisible()) && lower(await fewM.innerText()).includes('rather than 5') && (await fewM.innerText()).includes('below 50%'), await fewM.innerText().catch(() => 'missing'));
const fewMatchPcts = await pcts(page.locator('.results__group[aria-labelledby^="tier-"] .match__pct'));
check('fewer-matches profile still lists nothing under 50%', fewMatchPcts.length > 0 && fewMatchPcts.length < 5 && fewMatchPcts.every((n) => n >= 50), fewMatchPcts.join(','));
const noAlts = page.getByTestId('fewer-alternatives');
check('no alternatives reach 45%: says so', (await noAlts.isVisible()) && lower(await noAlts.innerText()).includes('no other career reaches a 45%'), await noAlts.innerText().catch(() => 'missing'));
check('incomplete banner appears for partial answers', await page.locator('.banner').first().isVisible());
await shot(page, 'results-few', { fullPage: true });

await seed({ 'i-notice': ['fun'] });
await page.goto(BASE + '/results', { waitUntil: 'networkidle' });
const someAlts = page.getByTestId('fewer-alternatives');
check('some but fewer than 3 alternatives: explains the count', (await someAlts.isVisible()) && lower(await someAlts.innerText()).includes('showing 2 because only 2 other careers reach a 45%'), await someAlts.innerText().catch(() => 'missing'));

await seed(PERSONAS[1].answers, 'complete');
await page.goto(BASE + '/results', { waitUntil: 'networkidle' });
const lowAlt = page.locator('[aria-labelledby="alts-title"] .result').filter({ has: page.locator('.result__floor') });
const lowAltPcts = await pcts(page.locator('[aria-labelledby="alts-title"] .result:has(.result__floor) .match__pct'));
check('alternatives under 50% are labelled as not a match', (await lowAlt.count()) === 0 || lowAltPcts.every((n) => n >= 45 && n < 50), lowAltPcts.join(','));
const allAltPcts = await pcts(page.locator('[aria-labelledby="alts-title"] .match__pct'));
const floorLabels = await page.locator('[aria-labelledby="alts-title"] .result__floor').count();
check('every alternative under 50% carries the label', floorLabels === allAltPcts.filter((n) => n < 50).length, `${floorLabels} labels vs ${allAltPcts}`);

await seed({ 's-done': ['none'] });
await page.goto(BASE + '/results', { waitUntil: 'networkidle' });
check('answers with no signal: empty state, not a crash', await page.getByRole('heading', { name: 'No matches yet' }).isVisible());
check('...and explains that "none yet" says nothing yet', /don.t point toward anything/.test(lower(await page.locator('.stub').innerText())));

// ---------------------------------------------------------------- mobile
const m = await ctx.newPage();
await m.setViewportSize({ width: 390, height: 800 });
await m.goto(BASE + '/', { waitUntil: 'networkidle' });
await seed(persona.answers, 'complete');
await m.goto(BASE + '/results', { waitUntil: 'networkidle' });
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('results: no horizontal overflow on mobile', (await overflow(m)) === 0);
await shot(m, 'results-mobile', { fullPage: true });
await m.evaluate(() => localStorage.clear());
await m.goto(BASE + '/quiz', { waitUntil: 'networkidle' });
check('quiz: no horizontal overflow on mobile', (await overflow(m)) === 0);
await m.click(`input[name="${q0.id}"][value="${q0.options[0].id}"]`);
await shot(m, 'quiz-mobile');
await m.close(); // other tabs would legitimately re-save over a corrupt value below

// ---------------------------------------------------------------- resilience
await page.evaluate(() => localStorage.setItem('pathfinder:v1', '{not json'));
await page.goto(BASE + '/quiz', { waitUntil: 'networkidle' });
check('corrupt storage: app still loads the quiz', await page.locator('.quiz__count').isVisible());
await page.evaluate(() => localStorage.clear());
await page.goto(BASE + '/results', { waitUntil: 'networkidle' });
check('results with no answers shows the empty state', await page.getByRole('heading', { name: 'No matches yet' }).isVisible());

check('no console errors', errors.length === 0, errors.join(' | '));

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
await browser.close();
await new Promise((resolve) => server.httpServer.close(resolve));
process.exit(failures ? 1 : 0);
