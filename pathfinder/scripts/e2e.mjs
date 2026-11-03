// End-to-end checks in a real browser. Run with:  npm run e2e
//
// It builds the app, serves the build with Vite's preview server on a free
// port, drives the UI by clicking, and exits non-zero if any check fails.
// Where it can, it compares what the UI shows with what the engine computes for
// the same answers, so the two cannot drift apart.
//
// Browser: Microsoft Edge by default (installed on Windows). Override with
//   E2E_BROWSER=chrome         another installed channel
//   E2E_CHROME_PATH=...        path to any Chromium-based executable
// Set E2E_SHOTS=1 to save screenshots to e2e-output/.
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';
import { preview } from 'vite';
import { PERSONAS } from '../src/engine/fixtures.js';
import { buildProfile } from '../src/engine/vector.js';
import { recommend, splitMatches } from '../src/engine/recommend.js';
import { profileFromDna } from '../src/engine/dna.js';
import { locate } from '../src/engine/youAreHere.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
const readJson = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));
const quiz = readJson('../src/data/quiz.json');
const careers = readJson('../src/data/careers.json');
const registry = readJson('../src/data/indiaRegistry.json');
const verification = readJson('../src/data/india-verification.json');
const manualVerification = readJson('../src/data/india-manual-verification.json');
const shotsDir = process.env.E2E_SHOTS ? fileURLToPath(new URL('../e2e-output/', import.meta.url)) : null;
if (shotsDir) {
  mkdirSync(shotsDir, { recursive: true });
  // clear leftovers so a screenshot is never from an older run
  for (const f of readdirSync(shotsDir)) if (f.endsWith('.png')) rmSync(`${shotsDir}${f}`);
}

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
const CHECK_TEXT = 'Check with the official body';

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
const goto = async (path, p = page) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); };
const bubble = () => page.locator('.quiz__nova .bubble').innerText();
const stepText = async () => lower(await page.locator('.quiz__count').innerText());
const pcts = (loc) => loc.evaluateAll((els) => els.map((e) => parseInt(e.textContent, 10)));
const persona = (id) => PERSONAS.find((p) => p.id === id);
const seed = (answers, status = 'in-progress', extra = {}) =>
  page.evaluate(([a, st, ex]) => localStorage.setItem('pathfinder:v1', JSON.stringify({ v: 1, quiz: { answers: a, step: 0, status: st }, ...ex })), [answers, status, extra]);
const clearAll = () => page.evaluate(() => localStorage.clear());
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
const titlesIn = (id) => page.locator(`section[aria-labelledby="${id}"] .result__title`).allInnerTexts();
const engineFor = (answers) => {
  const profile = buildProfile(answers, quiz);
  const res = recommend(profile, careers);
  return { profile, res, split: splitMatches(res.matches) };
};

// Accessibility scan with axe-core (WCAG 2.x A/AA plus best practices). Any violation fails.
const axeCheck = async (p, name) => {
  await p.addScriptTag({ content: axeSource });
  const violations = await p.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } });
    return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
  });
  check(`axe: no accessibility violations on ${name}`, violations.length === 0, violations.join(' ;; '));
};

// Answer whatever question is showing, from an answers map, then move on. Returns the number of questions answered.
async function runQuiz(answers) {
  let asked = 0;
  for (let i = 0; i < 25; i++) {
    const name = await page.locator('.question input').first().getAttribute('name');
    const picks = answers[name];
    if (!picks) throw new Error(`no answer for ${name}`);
    for (const id of picks) await page.click(`input[name="${name}"][value="${id}"]`);
    asked++;
    const final = await page.getByRole('button', { name: /See my matches/ }).count();
    await page.getByRole('button', { name: final ? /See my matches/ : /Next/ }).click();
    if (final) break;
  }
  return asked;
}

// ================================================================ HOME: the interest map
await goto('/');
await clearAll();
await goto('/');
check('home: headline and the 35-domain promise', lower(await page.locator('h1').innerText()).includes('find where you fit') && (await page.locator('.h-lede').innerText()).includes('35 career domains'));
check('home: states the India / any-stream audience', lower(await page.locator('.eyebrow').first().innerText()).includes('india'));
check('home: map has exactly 35 domain dots, and the list twin the same 35 in 7 groups', (await page.locator('.hexmap__dot').count()) === 35 && (await page.locator('.dindex__btn').count()) === 35 && (await page.locator('.dindex__group').count()) === 7);
check('home: all six RIASEC corners are labelled', (await page.locator('.hexmap__corner').count()) === 6);
check('home: the dots share one tab stop (roving tabindex)', (await page.locator('.hexmap__dot[tabindex="0"]').count()) === 1);
check('home: nothing selected, so Nova is not pointing yet', lower(await page.locator('.readout').innerText()).includes('pointing at nothing yet'));

const restBearing = await page.locator('.hexmap__nova .nova__aim').evaluate((el) => el.getAttribute('style'));
await page.locator('.hexmap__dot', { hasText: 'Visual, Product' }).hover();
await page.waitForTimeout(150);
const readout = await page.locator('.readout').innerText();
check('home: hovering a domain fills the readout with name, group and O*NET basis', readout.includes('Visual, Product & Fashion Design') && /creative & media/i.test(readout) && readout.includes('O*NET occupations (US)') && readout.includes('Graphic Designers'), readout.slice(0, 200));
check('home: readout shows six interest scores out of 7 and names Artistic as primary', (await page.locator('.bars__row').count()) === 6 && (await page.locator('.bars__v').first().innerText()).includes('of 7') && readout.includes('Mostly Artistic'));
const aimed = await page.locator('.hexmap__nova .nova__aim').evaluate((el) => el.getAttribute('style'));
check('home: Nova points at the domain (her bearing changes)', aimed !== restBearing && /--bearing:\s*\d+(\.\d+)?deg/.test(aimed), `${restBearing} -> ${aimed}`);
check('home: a label and a route line appear for the active domain', (await page.locator('.hexmap__tip').innerText()).includes('Visual, Product') && (await page.locator('.hexmap__route line').count()) === 1);
check('home: readout links to the careers in that domain', (await page.locator('.readout__go a').getAttribute('href')) === '/explore?domain=design' && (await page.locator('.readout__go a').innerText()).includes('3 careers'));
await shot(page, 'home-pointing');

await page.locator('.hexmap__dot', { hasText: 'Chemical & Materials' }).hover();
check('home: every domain has a career (Chemical & Materials links to 1)', (await page.locator('.readout__go').innerText()).includes('1 career') && !(await page.locator('.readout__go').innerText()).includes('No careers'));

await page.locator('.hexmap__dot', { hasText: 'Accounting & Audit' }).click();
await page.mouse.move(5, 400);
check('home: clicking a dot keeps it selected after the mouse leaves', (await page.locator('.readout').innerText()).includes('Accounting & Audit') && (await page.locator('.hexmap__dot[aria-pressed="true"]').count()) === 1);
await page.locator('.hexmap__dot', { hasText: 'Accounting & Audit' }).click();
check('home: clicking again clears the selection', (await page.locator('.hexmap__dot[aria-pressed="true"]').count()) === 0);

await page.locator('.hexmap__dot[tabindex="0"]').focus();
const startName = await page.locator('.readout .readout__title').innerText();
await page.keyboard.press('ArrowRight');
check('home: arrow keys move to a neighbouring domain', (await page.locator('.readout .readout__title').innerText()) !== startName);
await page.keyboard.press('Enter');
check('home: Enter selects the focused domain', (await page.locator('.hexmap__dot[aria-pressed="true"]').count()) === 1);
await page.locator('.dindex__btn', { hasText: 'Law & Legal Services' }).click();
check('home: choosing from the list selects the same domain on the map', (await page.locator('.readout').innerText()).includes('Law & Legal Services') && (await page.locator('.hexmap__dot[aria-pressed="true"]').innerText()).includes('Law & Legal Services'));

const homeText = await page.locator('main').innerText();
check('home: discloses O*NET estimates (machine learning), US data, India labelling and "data not connected yet"', homeText.includes('Machine Learning/Expert') && /US occupations/.test(homeText) && /India facts are labelled/.test(homeText) && /data not connected yet/.test(homeText));
check('home: step 3 (placing you on the map) is live, no longer marked Coming next', (await page.locator('.h-step--soon').count()) === 0 && lower(await page.locator('.h-steps').innerText()).includes('you are here') === false && (await page.locator('.h-steps li').count()) === 3);
check('no global contour backdrop', (await page.locator('svg.contours').count()) === 0);
await shot(page, 'home-full', { fullPage: true });

// ---------------------------------------------------------------- O*NET attribution on every page
const attributionPages = ['/', '/quiz', '/results', '/explore', '/profile', '/nova', '/about', '/privacy', '/careers/doctor', '/careers/nope'];
let attributionOk = true;
let attributionDetail = '';
for (const path of attributionPages) {
  await goto(path);
  const f = await page.locator('footer').innerText();
  const links = await page.locator('footer a').evaluateAll((as) => as.map((a) => a.href));
  const ok = f.includes('O*NET 31.0 Database') && f.includes('U.S. Department of Labor, Employment and Training Administration (USDOL/ETA)') && f.includes('CC BY 4.0') && f.includes('trademark of USDOL/ETA')
    && /modified/.test(f) && /has not approved, endorsed, or tested/.test(f)
    && links.includes('https://www.onetcenter.org/database.html') && links.includes('https://creativecommons.org/licenses/by/4.0/');
  if (!ok) { attributionOk = false; attributionDetail += ` ${path}`; }
}
check('O*NET attribution (CC BY 4.0) with modification notice and links is in the footer of every page', attributionOk, attributionDetail);

// ================================================================ QUIZ
await clearAll();
await goto('/quiz');
check('quiz: starts at question 1 of 16', (await stepText()).includes('question 1 of 16'));
check('quiz: first question is stream/education with the six agreed options', (await page.locator('.question__prompt').innerText()).includes('where you are in your studies') && (await page.locator('.question input').count()) === 6);
check('quiz: Nova intro uses the section intro', (await bubble()).includes('never hides a career'));
check('quiz: no Back button on question 1', (await page.getByRole('button', { name: /Back/ }).count()) === 0);

await page.getByRole('button', { name: /Next/ }).click();
check('quiz: Next with no answer shows an alert and stays', (await page.locator('[role=alert]').isVisible()) && (await stepText()).includes('question 1 of 16'));

await shot(page, 'quiz-stream', { fullPage: true });
const streamQ = quiz.questions.find((q) => q.id === 'q-stream');
await page.click('input[name="q-stream"][value="pcb"]');
check('quiz: Nova answers the specific stream picked', (await bubble()) === streamQ.options.find((o) => o.id === 'pcb').nova, await bubble());
check('quiz: alert clears once answered; stream answers say they only arrange results', (await page.locator('[role=alert]').count()) === 0 && (await page.locator('.opt.is-selected').innerText()).includes('never changes a score or hides a career'));
await page.click('input[name="q-stream"][value="pcm"]');
check('quiz: a different stream gets its own reaction', (await bubble()) === streamQ.options.find((o) => o.id === 'pcm').nova);

// conditional question: graduate -> field (17 questions), change back -> 16 and field dropped
await page.click('input[name="q-stream"][value="graduate"]');
await page.getByRole('button', { name: /Next/ }).click();
check('quiz: choosing "graduate" inserts the field question (now 17 in all)', (await stepText()).includes('question 2 of 17') && (await page.locator('.question__prompt').innerText()).includes('degree in') && (await page.locator('.question input').count()) === 7);
await page.click('input[name="q-field"][value="law"]');
check('quiz: Nova reacts to the field picked', (await bubble()) === quiz.questions.find((q) => q.id === 'q-field').options.find((o) => o.id === 'law').nova);
await page.getByRole('button', { name: /Back/ }).click();
await page.click('input[name="q-stream"][value="commerce"]');
const afterSwitch = await page.evaluate(() => JSON.parse(localStorage.getItem('pathfinder:v1')).quiz.answers);
check('quiz: switching away from "graduate" drops the field answer and returns to 16 questions', !('q-field' in afterSwitch) && (await stepText()).includes('question 1 of 16'), JSON.stringify(afterSwitch));

// interest question: two picks max, specific reactions, removal, chips, keyboard
await page.getByRole('button', { name: /Next/ }).click();
const act1 = quiz.questions.find((q) => q.id === 'q-act-1');
check('quiz: interest questions offer six activities, one per interest type, and say "up to 2"', (await page.locator('.question input').count()) === 6 && (await page.locator('.question__hint').innerText()).includes('up to 2'));
await page.click('input[name="q-act-1"][value="a1-R"]');
check('quiz: Nova reacts to the exact activity picked', (await bubble()) === act1.options.find((o) => o.id === 'a1-R').nova);
await page.click('input[name="q-act-1"][value="a1-I"]');
await shot(page, 'quiz-activity', { fullPage: true });
check('quiz: a second pick gets a different, specific reaction', (await bubble()) === act1.options.find((o) => o.id === 'a1-I').nova);
check('quiz: the third pick is disabled at the limit of 2', await page.locator('input[name="q-act-1"][value="a1-A"]').isDisabled());
check('quiz: selected rows show which interest type they count toward', (await page.locator('.opt.is-selected .opt__recorded').first().innerText()).includes('Realistic'));
await page.click('input[name="q-act-1"][value="a1-I"]');
check('quiz: unticking gets a removal message', (await bubble()).includes('taken'), await bubble());
await page.locator('input[name="q-act-1"][value="a1-I"]').focus();
await page.keyboard.press('Space');
check('quiz: Space toggles a checkbox from the keyboard', await page.locator('input[name="q-act-1"][value="a1-I"]').isChecked());
await page.getByRole('button', { name: /Next/ }).click();
check('quiz: focus moves to the step heading after Next', await page.evaluate(() => document.activeElement?.className === 'quiz__step'));
await page.getByRole('button', { name: /Back/ }).click();
check('quiz: Back keeps earlier answers', (await page.locator('input[name="q-act-1"]:checked').count()) === 2);
const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('pathfinder:v1')));
check('quiz: progress is written to localStorage', stored?.quiz?.answers?.['q-stream']?.[0] === 'commerce' && stored.quiz.answers['q-act-1'].length === 2);

await page.reload({ waitUntil: 'networkidle' });
check('quiz: reload shows the resume gate with the answered count', (await page.getByRole('heading', { name: 'Welcome back' }).isVisible()) && (await page.locator('.gate').innerText()).includes('answered 2 of 16'));
await page.getByRole('button', { name: /Resume at question/ }).click();
check('quiz: resume lands on the saved question with its answers', (await page.locator('input[name="q-act-1"]:checked').count()) === 2);
await page.reload({ waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Start over' }).click();
check('quiz: start over asks for confirmation', await page.getByRole('button', { name: /Yes, clear/ }).isVisible());
await page.getByRole('button', { name: /Yes, clear/ }).click();
check('quiz: after clearing, question 1 with nothing selected', (await page.locator('.opt input:checked').count()) === 0 && (await stepText()).includes('question 1 of 16'));

// ================================================================ FULL RUN -> RESULTS (commerce student)
await clearAll();
await goto('/quiz');
const commerce = persona('commerce');
const asked = await runQuiz(commerce.answers);
await page.waitForURL('**/results');
check('quiz: a full run asks exactly 16 questions and lands on /results', asked === 16);
check('results: heading', (await page.locator('h1').innerText()) === 'Your matches');

const exp = engineFor(commerce.answers);
const uiStrong = await titlesIn('strong-title');
const uiExplore = await titlesIn('explore-title');
check('results: the Strong fits list is exactly what the engine computes', JSON.stringify(uiStrong) === JSON.stringify(exp.split.strong.map((m) => m.career.title)), `${uiStrong} vs ${exp.split.strong.map((m) => m.career.title)}`);
check('results: the Explore further list is exactly what the engine computes', JSON.stringify(uiExplore) === JSON.stringify(exp.split.explore.map((m) => m.career.title)), `${uiExplore} vs ${exp.split.explore.map((m) => m.career.title)}`);
const strongPcts = await pcts(page.locator('section[aria-labelledby="strong-title"] .match__pct'));
check('results: every strong fit scores 75%+ and shows no route reason', strongPcts.length > 0 && strongPcts.every((n) => n >= 75) && (await page.locator('section[aria-labelledby="strong-title"] .result__fit').count()) === 0, strongPcts.join(','));
const civil = page.locator('section[aria-labelledby="explore-title"] .result', { hasText: 'Civil Servant' });
const civilFit = await civil.locator('.result__fit').innerText();
check('results: a strong score with an unsuited route sits under Explore further, with the reason and the "verify" note', (await pcts(civil.locator('.match__pct')))[0] >= 75 && /Typical route takes 4 to 5 years of study/.test(civilFit) && civilFit.includes('verify with the official body'), civilFit);
check('results: the context line says what was used and that it never changes a score or hides a career', (await page.getByTestId('context-line').innerText()).includes('never change a score or hide a career') && (await page.getByTestId('context-line').innerText()).includes('Commerce'));
check('results: a loose O*NET match says so in the list (Entrepreneur)', (await page.locator('.result', { hasText: 'Entrepreneur' }).first().locator('.result__loose').innerText()).includes('Approximate match to O*NET'));
check('results: says a match score is not a prediction of success', (await page.locator('.note').first().innerText()).includes('not a prediction of success'));

const allPcts = await pcts(page.locator('.results__group[aria-labelledby="strong-title"] .match__pct, .results__group[aria-labelledby="explore-title"] .match__pct'));
check('results: every listed match is 50% or higher', allPcts.length > 0 && allPcts.every((n) => n >= 50), allPcts.join(','));
const barInfo = await page.locator('.match__bar span').first().evaluate((el) => ({ inline: el.getAttribute('style'), bg: getComputedStyle(el).backgroundColor }));
check('results: bars are neutral (no inline colour, ink-2 token)', !/background/.test(barInfo.inline) && barInfo.bg === 'rgb(61, 80, 104)', JSON.stringify(barInfo));
const bank = page.locator('.result', { hasText: 'Bank Officer' }).first();
await bank.locator('details').evaluate((d) => { d.open = true; });
const bankWhy = lower(await bank.locator('.why').innerText());
check('results: Why this match shows O*NET interest scores and the answers behind them, no student percentage', bankWhy.includes('o*net rates') && bankWhy.includes('your answers that point here') && !/your profile\s*\d/.test(bankWhy));
check('results: Why this match does not claim the student "leans on" Artistic for Bank Officer (low-on-both is not a reason)', !bankWhy.includes('artistic interest'), bankWhy.slice(0, 300));
check('results: Why this match compares the day-to-day with work settings, labelled as derived', bankWhy.includes('work settings we derived'));
await page.locator('.allranked summary').click();
const listed = await page.locator('.allranked__list li > span').evaluateAll((els) => els.map((e) => parseInt(e.textContent, 10)));
check('results: "every career scoring 50% or more" lists nothing under 50%', listed.length > 0 && listed.every((n) => n >= 50), listed.join(','));
await axeCheck(page, '/results');
await shot(page, 'results-commerce', { fullPage: true });

await page.reload({ waitUntil: 'networkidle' });
check('results survive a full reload', JSON.stringify(await titlesIn('strong-title')) === JSON.stringify(uiStrong));

// other personas: what the UI shows equals the engine
for (const id of ['science-pcb', 'arts', 'cse-graduate']) {
  await seed(persona(id).answers, 'complete');
  await goto('/results');
  const e = engineFor(persona(id).answers);
  const ui = [...(await titlesIn('strong-title')), ...(await titlesIn('explore-title'))].sort();
  check(`results (${id}): the matches shown equal the engine's`, JSON.stringify(ui) === JSON.stringify(e.res.matches.map((m) => m.career.title).sort()), `${ui}`);
}
await seed(persona('cse-graduate').answers, 'complete');
await goto('/results');
check('results (CSE graduate): software and data careers are strong fits (a degree in the field already covers the study years)', (await titlesIn('strong-title')).includes('Software Developer') && (await titlesIn('strong-title')).includes('Data Scientist'));
// ---------------------------------------------------------------- Home: "you are here"
await clearAll();
await goto('/');
check('home (no answers): no pin, and an invitation to take the quiz', (await page.getByTestId('you-marker').count()) === 0 && await page.getByTestId('near-you-empty').isVisible());
const homeDomains = readJson('../src/data/domains.json');
for (const id of ['artistic-maker', 'cse-graduate']) {
  await seed(persona(id).answers, 'complete');
  await goto('/');
  const want = locate(buildProfile(persona(id).answers, quiz), homeDomains.domains, homeDomains.meta.maxLead).near.map((n) => n.label);
  const got = await page.locator('[data-testid="near-you"] .nearyou__pick').allInnerTexts();
  check(`home (${id}): a pin is on the map and the three nearest domains match the engine`, (await page.getByTestId('you-marker').count()) === 1 && JSON.stringify(got) === JSON.stringify(want), `${got} vs ${want}`);
  check(`home (${id}): the nearest domains are marked on the map`, (await page.locator('.hexmap__list li.is-near').count()) === 3);
}
await shot(page, 'home-you-are-here');
await page.locator('[data-testid="near-you"] .nearyou__pick').first().click();
check('home: choosing a nearby domain points Nova at it and fills the readout', (await page.locator('.readout__title').count()) === 1);
await axeCheck(page, '/ (with the pin)');

await seed(persona('undecided').answers, 'complete');
await goto('/results');
check('results (undecided): with no strong fit, it says so and points to Explore further', await page.getByTestId('no-strong').isVisible());
await shot(page, 'results-undecided', { fullPage: true });

// ---------------------------------------------------------------- floors and sparse results
await seed({ 'q-subjects': ['pe'] });
await goto('/results');
const fewM = page.getByTestId('fewer-matches');
check('sparse: fewer than 8 matches explains why (3 rather than 8, below 50%)', (await fewM.isVisible()) && (await fewM.innerText()).includes('rather than 8') && (await fewM.innerText()).includes('below 50%'), await fewM.innerText().catch(() => 'missing'));
const sparsePcts = await pcts(page.locator('.results__group[aria-labelledby="strong-title"] .match__pct, .results__group[aria-labelledby="explore-title"] .match__pct'));
check('sparse: nothing under 50% is listed as a match', sparsePcts.length > 0 && sparsePcts.length < 8 && sparsePcts.every((n) => n >= 50), sparsePcts.join(','));
const lowAlts = page.locator('[aria-labelledby="alts-title"] .result').filter({ has: page.locator('.result__score--low') });
check('sparse: this profile has alternatives in the 45-49% range', (await lowAlts.count()) > 0);
const lowInfo = await lowAlts.evaluateAll((els) => els.map((e) => ({
  head: e.querySelector('.result__head').innerText + ' ' + e.querySelector('.result__floor').innerText,
  hasNumber: Boolean(e.querySelector('.match__pct')), hasBar: Boolean(e.querySelector('.match__bar')),
})));
check('sparse: alternatives under 50% say "below the 50% match line" and print no score or bar', lowInfo.every((h) => /below the 50% match line/i.test(h.head) && !h.hasNumber && !h.hasBar && !/\d+%\s*match score/i.test(h.head)), JSON.stringify(lowInfo));
const someAlts = page.getByTestId('fewer-alternatives');
check('sparse: fewer than 3 alternatives explains the count', (await someAlts.isVisible()) && lower(await someAlts.innerText()).includes('showing 2 because only 2 other careers reach a 45%'), await someAlts.innerText().catch(() => 'missing'));
await seed({ 'q-act-1': ['a1-A'] });
await goto('/results');
check('sparse: no alternatives reach 45%: says so', lower(await page.getByTestId('fewer-alternatives').innerText()).includes('no other career reaches a 45%'));
check('sparse: partial answers show the incomplete banner', (await page.locator('.banner').first().innerText()).includes('haven'));
await seed({ 'q-stream': ['pcb'] });
await goto('/results');
check('answering only the stream gives no matches: friendly empty state', (await page.getByRole('heading', { name: 'No matches yet' }).isVisible()) && /don.t point toward anything/.test(lower(await page.locator('.stub').innerText())));

// ================================================================ CAREER PAGES (all 61)
const verifiedName = (kind, id) => {
  const r = verification.results?.[`${kind}:${id}`];
  return Boolean(r?.loaded && r?.needleFound) || Boolean(manualVerification.entries?.[`${kind}:${id}`]?.verifiedOn);
};
const allowedUrls = new Set([...Object.entries(registry.exams).filter(([id]) => verifiedName('exams', id)).map(([, e]) => e.url), ...Object.entries(registry.bodies).filter(([id]) => verifiedName('bodies', id)).map(([, e]) => e.url)]);
const unverifiedNames = [...Object.entries(registry.exams).filter(([id]) => !verifiedName('exams', id)).map(([, e]) => e.name), ...Object.entries(registry.bodies).filter(([id]) => !verifiedName('bodies', id)).map(([, e]) => e.name)];

await clearAll();
const careerProblems = [];
for (const c of careers) {
  await goto(`/careers/${c.id}`);
  const text = await page.locator('article.career').innerText();
  const h1 = await page.locator('h1').innerText();
  if (h1 !== c.title) careerProblems.push(`${c.id}: h1 ${h1}`);
  if (!text.includes('Typical route, verify with the official body')) careerProblems.push(`${c.id}: missing verify note`);
  if (!text.includes('Data not connected yet')) careerProblems.push(`${c.id}: missing salary/outlook placeholder`);
  if (/[₹$]|\blpa\b|\blakh/i.test(text)) careerProblems.push(`${c.id}: salary-like figure`);
  if ((await page.locator('.scores li').count()) !== 6) careerProblems.push(`${c.id}: not 6 interest scores`);
  if ((await page.locator('.feel li').count()) !== 6) careerProblems.push(`${c.id}: not 6 work settings`);
  const loose = (await page.locator('.callout').count()) === 1;
  if (loose !== Boolean(c.onet.loose)) careerProblems.push(`${c.id}: loose callout ${loose}`);
  for (const name of unverifiedNames) if (text.includes(name)) careerProblems.push(`${c.id}: shows unverified name "${name}"`);
  if (text.includes('FTII JET')) careerProblems.push(`${c.id}: old FTII JET name`);
  const hrefs = await page.locator('article.career a[href^="http"]').evaluateAll((as) => as.map((a) => a.href.replace(/\/$/, '')));
  for (const h of hrefs) if (![...allowedUrls].some((u) => u.replace(/\/$/, '') === h)) careerProblems.push(`${c.id}: link ${h} is not a verified official site`);
  for (const a of await page.locator('article.career a[href^="http"]').all()) {
    if (!((await a.getAttribute('rel')) ?? '').includes('noopener') || (await a.getAttribute('target')) !== '_blank') careerProblems.push(`${c.id}: external link not noopener`);
  }
  if (c.routes.length === 0 && !text.includes(CHECK_TEXT)) careerProblems.push(`${c.id}: no routes but no Check text`);
}
check('all 61 career pages: title, verify note, 6 interest scores, 6 work settings, loose notes only where flagged, salary/outlook "data not connected yet", only verified official links, no figures', careerProblems.length === 0, careerProblems.slice(0, 8).join(' ;; '));

await goto('/careers/doctor');
const docCareer = careers.find((c) => c.id === 'doctor');
const docText = await page.locator('article.career').innerText();
check("career: the description is O*NET's, with its US occupation named", docText.includes(docCareer.description) && docText.includes('Family Medicine Physicians'));
check('career: lists five O*NET tasks and the real interest scores', (await page.locator('#tasks-title + ul li').count()) === 5 && docText.includes(`${docCareer.riasec.I.toFixed(1)} of 7`));
check('career: shows the typical route and its verify label, and no eligibility numbers', docText.includes('Science (PCB)') && docText.includes('5 or more years') && !/\d+\s*%\s*(marks|aggregate)/i.test(docText));
check('career: NEET UG is a link only if verified, otherwise "Check with the official body"', verifiedName('exams', 'neet-ug') ? (await page.locator('article.career a[href="https://neet.nta.nic.in"]').count()) === 1 : !docText.includes('NEET UG') && docText.includes(CHECK_TEXT));
await goto('/careers/film-director');
const filmText = await page.locator('article.career').innerText();
check('career: Film Director uses the corrected FTII exam name ("FTII Entrance Test"), never "FTII JET"', !filmText.includes('FTII JET') && (verifiedName('exams', 'ftii-entrance') ? filmText.includes('FTII Entrance Test') : filmText.includes(CHECK_TEXT)));
await goto('/careers/graphic-designer');
const gdText = await page.locator('article.career').innerText();
check('career: an exam name that could not be confirmed (NID DAT) is not shown, only "Check with the official body"', verifiedName('exams', 'nid-dat') || (!gdText.includes('NID DAT') && gdText.includes(CHECK_TEXT)));
await goto('/careers/entrepreneur');
check('career: a loose O*NET match carries an "approximate match" callout (Entrepreneur)', (await page.locator('.callout').innerText()).includes('Chief Executives'));
await goto('/careers/chartered-accountant');
check('career: without a profile it invites the quiz instead of a score', (await page.locator('.career__match').innerText()).includes('Take the quiz'));
await goto('/careers/not-a-career');
check('career: unknown id gives a friendly not-found', await page.getByRole('heading', { name: /couldn.t find that career/ }).isVisible());
await goto('/careers/doctor');
await axeCheck(page, '/careers/doctor');
await shot(page, 'career-doctor', { fullPage: true });
await goto('/careers/entrepreneur');
await axeCheck(page, '/careers/entrepreneur');

await seed(persona('science-pcb').answers, 'complete');
await goto('/careers/doctor');
const docMatch = await page.locator('.career__match').innerText();
const pcbRanked = engineFor(persona('science-pcb').answers).res.ranked;
const docPct = pcbRanked.find((m) => m.career.id === 'doctor').percent;
check('career: with a profile it shows the same match score the engine computes, with the caveat', docMatch.includes(`${docPct}% match score`) && docMatch.includes('not a prediction of success'), docMatch);
await goto('/careers/chef');
const chefPct = pcbRanked.find((m) => m.career.id === 'chef').percent;
const chefText = await page.locator('.career__match').innerText();
check('career: below 50% it prints no score, only that it is below the line', chefPct < 50 && /below the 50% match line/i.test(chefText) && !/\d+% match score/.test(chefText), `${chefPct} :: ${chefText}`);

// ================================================================ EXPLORE
await seed(persona('science-pcb').answers, 'complete');
await goto('/explore');
const rows = () => page.locator('.explore__list > li');
check('explore: lists all 61 careers across 35 domains', (await rows().count()) === 61 && (await page.locator('.explore__count').innerText()) === 'All 61 careers' && (await page.locator('.lede').innerText()).includes('35 domains'));
check('explore: the domain filter lists all 35 domains', (await page.locator('.field-scroll label.check').count()) === 35 && (await page.locator('.field-scroll').innerText()).includes('Chemical & Materials'));
check('explore: sorts by best match for the student by default', (await page.locator('#sort').inputValue()) === 'match' && (await rows().first().locator('.crow__title').innerText()) === pcbRanked[0].career.title);
const exploreScores = await pcts(page.locator('.crow__score .match__pct'));
check('explore: no score under 50% is printed anywhere', exploreScores.length > 0 && exploreScores.every((n) => n >= 50), exploreScores.join(','));
const lowRows = await page.locator('.crow__score--low').allInnerTexts();
check('explore: low-scoring careers say "below the 50% match line" instead of a number', lowRows.length > 0 && lowRows.every((t) => /below the 50% match line/i.test(t) && !/\d+% match score/.test(t)));
await axeCheck(page, '/explore');
await shot(page, 'explore', { fullPage: true });

await page.locator('#q').fill('ias');
check('explore: search writes the query to the URL and finds Civil Servant by its Indian keyword', (await page.waitForURL(/q=ias/, { timeout: 5000 }).then(() => true, () => false)) && (await rows().locator('.crow__title').allInnerTexts()).includes('Civil Servant (IAS and allied services)'));
await page.locator('#q').fill('iti');
await page.waitForURL(/q=iti/);
const itiRows = await rows().locator('.crow__title').allInnerTexts();
check('explore: "iti" finds the ITI-route careers', itiRows.includes('Electrician') && itiRows.includes('Automobile Technician'), itiRows.join());
await page.locator('#q').fill('zzzzqq');
check('explore: no results gives a friendly empty state', (await page.locator('.explore__empty').innerText()).includes('No careers match'));
await page.locator('.explore__empty').getByRole('button', { name: 'Clear all filters' }).click();
check('explore: clearing filters restores all 61', (await rows().count()) === 61);

await goto('/explore?domain=design');
check('explore: a domain from a link filters to its careers (Design: 3)', (await rows().count()) === 3 && (await page.getByRole('checkbox', { name: /Visual, Product & Fashion Design/ }).isChecked()));
await goto('/explore?type=R');
const rRows = await rows().locator('.crow__title').allInnerTexts();
check('explore: "main interest" filter finds Realistic careers (Electrician, Automobile Technician)', rRows.includes('Electrician') && rRows.includes('Automobile Technician'));
await goto('/explore?match=1');
const matchOnly = await pcts(page.locator('.crow__score .match__pct'));
check('explore: "matches for me" shows only 50%+ careers', matchOnly.length > 0 && matchOnly.every((n) => n >= 50));

await goto('/explore');
const saveBtn = rows().filter({ hasText: 'Pharmacist' }).first().getByRole('button', { name: 'Save Pharmacist' });
check('explore: save starts unpressed', (await saveBtn.getAttribute('aria-pressed')) === 'false');
await saveBtn.click();
check('explore: save button becomes pressed', (await saveBtn.getAttribute('aria-pressed')) === 'true');
await page.reload({ waitUntil: 'networkidle' });
check('explore: saved career survives reload', (await rows().filter({ hasText: 'Pharmacist' }).first().getByRole('button', { name: 'Save Pharmacist' }).getAttribute('aria-pressed')) === 'true');
await goto('/explore?saved=1');
check('explore: "careers I saved" shows just that career', (await rows().count()) === 1);

await goto('/explore');
await page.getByRole('button', { name: /Surprise me/ }).click();
await page.locator('.surprise__box').waitFor();
const first = await page.locator('.surprise__lead a').innerText();
const topEight = pcbRanked.filter((m) => m.percent >= 50).slice(0, 8).map((m) => m.career.title);
check('explore: Surprise Me avoids the top matches and explains itself', !topEight.includes(first) && (await page.locator('.surprise__box').innerText()).length > 60, first);
await page.getByRole('button', { name: 'Show me another' }).click();
check('explore: "Show me another" gives a different career', (await page.locator('.surprise__lead a').innerText()) !== first);
await clearAll();
await goto('/explore');
check('explore: without a profile "matches for me" is disabled and the default sort is A-Z', (await page.getByRole('checkbox', { name: /Matches for me/ }).isDisabled()) && (await page.locator('#sort').inputValue()) === 'name');
await page.getByRole('button', { name: /Surprise me/ }).click();
check('explore: Surprise Me works with no profile', await page.locator('.surprise__box').isVisible());

// ================================================================ CAREER DNA
await seed(persona('commerce').answers, 'complete');
await goto('/profile');
check('profile: six interest sliders with plain-word levels, no percentages', (await page.locator('.slider input[type=range]').count()) === 6 && !/\d+\s*%/.test(await page.locator('.profile__edit').innerText()));
check('profile: strongest interest reads "Strongest"', lower(await page.locator('.slider').filter({ hasText: 'Conventional' }).locator('.slider__word').innerText()) === 'strongest');
const factText = await page.locator('.profile__facts').innerText();
check('profile: shows stream, study and earning answers and the work-setting preferences', factText.includes('Commerce') && factText.includes('Open to 5+ years of study') && factText.includes('Need to earn soon') && factText.includes('Time with people'));
await axeCheck(page, '/profile');
await shot(page, 'profile', { fullPage: true });
const before = await page.locator('.profile__top li').first().innerText();
for (const [d, v] of Object.entries({ R: 10, I: 10, A: 100, S: 20, E: 10, C: 5 })) await page.locator(`#dna-${d}`).fill(String(v));
check('profile: editing sliders marks the profile as edited', lower(await page.locator('.profile__status').innerText()).includes('edited by you'));
const edited = profileFromDna({ R: 0.1, I: 0.1, A: 1, S: 0.2, E: 0.1, C: 0.05 }, buildProfile(commerce.answers, quiz));
const expTop = recommend(edited, careers).matches[0].career.title;
check("profile: the live matches follow the edit and equal the engine's", (await page.locator('.profile__top li').first().innerText()).includes(expTop) && !before.includes(expTop), `${expTop} vs ${await page.locator('.profile__top li').first().innerText()}`);
await goto('/results');
check('profile: results use the edited DNA and say so', (await page.locator('.banner').first().innerText()).includes('edited Career DNA') && (await page.locator('.result__title').first().innerText()).length > 0);
await goto('/profile');
check('profile: edited DNA persists after navigating away', (await page.locator('#dna-A').inputValue()) === '100');
await page.getByRole('button', { name: 'Reset to my quiz result' }).click();
check('profile: reset returns to the quiz result', (await page.locator('.profile__top li').first().innerText()) === before);
await page.locator('#goal').fill('Become a chartered accountant');
await page.reload({ waitUntil: 'networkidle' });
check('profile: goal note persists', (await page.locator('#goal').inputValue()) === 'Become a chartered accountant');

await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('pathfinder:v1'));
  s.saved = ['pharmacist'];
  localStorage.setItem('pathfinder:v1', JSON.stringify(s));
});
await goto('/profile');
await page.getByRole('button', { name: 'Retake the quiz' }).click();
check('profile: retake asks for confirmation and says what is kept', (await page.locator('.confirm').innerText()).includes('Saved careers and your goal stay'));
await page.getByRole('button', { name: /Yes, retake/ }).click();
await page.waitForURL('**/quiz');
const afterRetake = await page.evaluate(() => JSON.parse(localStorage.getItem('pathfinder:v1')));
check('profile: retake kept saved careers and goal, and remembered the old matches', afterRetake.saved[0] === 'pharmacist' && afterRetake.goal === 'Become a chartered accountant' && afterRetake.previous.matches.length > 0);
await runQuiz(persona('science-pcb').answers);
await page.waitForURL('**/results');
const cmp = page.locator('.compare');
check('results: show how matches changed since the last attempt', await cmp.isVisible());
await cmp.locator('summary').click();
const cmpText = await cmp.innerText();
check('results: the comparison names new arrivals and careers that dropped out', cmpText.includes('new in your top matches') && cmpText.includes('No longer in your top matches'), cmpText.slice(0, 200));

// ================================================================ NOVA (demo)
await clearAll();
await goto('/nova');
check('nova: DEMO and "not live AI" are on the page', lower(await page.locator('.demo-banner').innerText()).includes('demo mode') && lower(await page.locator('main').innerText()).includes('not live ai'));
check('nova: log region is announced politely', (await page.locator('[role=log]').getAttribute('aria-live')) === 'polite');
await page.getByRole('button', { name: 'What does a match score mean?' }).click();
check('nova: a suggested question gets its preset answer', (await page.locator('.msg--nova').last().innerText()).includes('cosine similarity'));
await page.locator('#chat-input').fill('what is the salary of a chartered accountant');
await page.getByRole('button', { name: 'Send' }).click();
const salaryMsg = await page.locator('.msg--nova').last().innerText();
check('nova: a salary question gets the honest "data not connected" answer and says US data is not used for India', salaryMsg.includes('data not connected yet') && salaryMsg.includes('US'));
await page.locator('#chat-input').fill('which stream do I need for MBBS');
await page.keyboard.press('Enter');
check('nova: a stream question points to the typical-route label and refuses eligibility rules', (await page.locator('.msg--nova').last().innerText()).includes('verify with the official body'));
await page.locator('#chat-input').fill('Tell me about Chartered Accountant');
await page.keyboard.press('Enter');
const caMsg = await page.locator('.msg--nova').last().innerText();
check('nova: a named career is answered from its O*NET description, typical route and salary placeholder', caMsg.includes('Typical route in India') && caMsg.includes('data not connected yet') && caMsg.includes(careers.find((c) => c.id === 'chartered-accountant').description), caMsg.slice(0, 160));
await page.locator('#chat-input').fill('whats the weather in hyderabad');
await page.keyboard.press('Enter');
const fb = await page.locator('.msg--nova').last().innerText();
check('nova: an unknown question says it is a demo with no preset answer', fb.includes('demo mode') && fb.includes('no preset answer'));
check('nova: every Nova message carries a Demo source label', (await page.locator('.msg--nova').count()) === (await page.locator('.msg--nova .msg__source').count()) && (await page.locator('.msg__source').allInnerTexts()).every((t) => t.startsWith('Demo')));
await seed(persona('science-pcb').answers, 'complete');
await goto('/nova');
await shot(page, 'nova', { fullPage: true });
await page.getByRole('button', { name: 'Why is my top match my top match?' }).click();
const topTitle = pcbRanked[0].career.title;
check('nova: with results it explains the real top match, labelled as built from results', (await page.locator('.msg--nova').last().innerText()).includes(topTitle) && (await page.locator('.msg--nova').last().innerText()).includes('not AI'));
await axeCheck(page, '/nova');

// ================================================================ PRIVACY, RESILIENCE
await seed(persona('commerce').answers, 'complete', { saved: ['pharmacist'], goal: 'x' });
await goto('/privacy');
await page.getByRole('button', { name: 'Clear my saved data' }).click();
const wiped = await page.evaluate(() => JSON.parse(localStorage.getItem('pathfinder:v1') ?? 'null'));
check('privacy: wipe removes answers, saved careers, goal and old results', !wiped || (Object.keys(wiped.quiz.answers).length === 0 && wiped.saved.length === 0 && wiped.goal === '' && wiped.previous === null));
await goto('/results');
check('privacy: after the wipe results are empty', await page.getByRole('heading', { name: 'No matches yet' }).isVisible());

await page.evaluate(() => localStorage.setItem('pathfinder:v1', '{not json'));
await goto('/quiz');
check('resilience: corrupt storage still loads the quiz', await page.locator('.quiz__count').isVisible());
await page.evaluate(() => localStorage.setItem('pathfinder:v1', JSON.stringify({ v: 1, quiz: { answers: { 'i-saturday': ['ctf'] }, step: 3, status: 'complete' }, dna: { build: 1, security: 1, systems: 1 }, saved: ['security-analyst'] })));
await goto('/results');
check('resilience: an older (8-dimension) save is discarded, not misread', await page.getByRole('heading', { name: 'No matches yet' }).isVisible());

// ================================================================ other pages: a11y + mobile
await clearAll();
await goto('/');
await axeCheck(page, '/ (home)');
await goto('/quiz');
await axeCheck(page, '/quiz (question)');
await goto('/about');
await axeCheck(page, '/about');
check('about: explains the grouping rule and the data limits', (await page.locator('article').innerText()).includes('Strong fits and Explore further') && (await page.locator('article').innerText()).includes('Machine Learning/Expert'));
await goto('/privacy');
await axeCheck(page, '/privacy');

const m = await ctx.newPage();
await m.setViewportSize({ width: 390, height: 844 });
await m.goto(BASE + '/', { waitUntil: 'networkidle' });
await seed(persona('commerce').answers, 'complete');
for (const path of ['/', '/quiz', '/results', '/explore', '/profile', '/nova', '/about', '/privacy', '/careers/doctor', '/careers/civil-servant']) {
  await m.goto(BASE + path, { waitUntil: 'networkidle' });
  check(`${path}: no horizontal overflow on mobile`, (await overflow(m)) === 0, String(await overflow(m)));
}
await m.goto(BASE + '/', { waitUntil: 'networkidle' });
await shot(m, 'home-mobile', { fullPage: true });
await m.goto(BASE + '/results', { waitUntil: 'networkidle' });
await shot(m, 'results-mobile', { fullPage: true });
await m.close();

check('no console errors', errors.length === 0, errors.join(' | '));

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
await browser.close();
await new Promise((resolve) => server.httpServer.close(resolve));
process.exit(failures ? 1 : 0);
