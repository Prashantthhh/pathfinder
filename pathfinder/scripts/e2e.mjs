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
import { createRequire } from 'node:module';
import { chromium } from 'playwright-core';
import { preview } from 'vite';
import { PERSONAS } from '../src/engine/fixtures.js';

const root = fileURLToPath(new URL('..', import.meta.url));
const axeSource = readFileSync(createRequire(import.meta.url).resolve('axe-core/axe.min.js'), 'utf8');
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

// Accessibility scan with axe-core (WCAG 2.x A/AA plus best practices). Any violation fails.
const axeCheck = async (p, name) => {
  await p.addScriptTag({ content: axeSource });
  const violations = await p.evaluate(async () => {
    const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] } });
    return r.violations.map((v) => `${v.id} (${v.impact}): ${v.nodes.slice(0, 2).map((n) => n.target.join(' ')).join(' | ')}`);
  });
  check(`axe: no accessibility violations on ${name}`, violations.length === 0, violations.join(' ;; '));
};


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
check('printed alternative scores are all >= 50% (45-49% ones print no number)', altPcts.every((n) => n >= 50), altPcts.join(','));

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

await seed({ 'i-project': ['platformer'] }); // alternatives: QA 52%, UI/UX 49%, AI Engineer 48%
await page.goto(BASE + '/results', { waitUntil: 'networkidle' });
const alts = page.locator('[aria-labelledby="alts-title"] .result');
const lowAlts = alts.filter({ has: page.locator('.result__score--low') });
check('this profile has an alternative in the 45-49% range (so the checks below mean something)', (await lowAlts.count()) > 0);
const lowHeads = await lowAlts.evaluateAll((els) => els.map((e) => ({
  head: e.querySelector('.result__head').innerText + ' ' + e.querySelector('.result__floor').innerText,
  hasNumber: Boolean(e.querySelector('.match__pct')),
  hasBar: Boolean(e.querySelector('.match__bar')),
  hasRank: Boolean(e.querySelector('.match__rank')),
})));
check('alternatives under 50% say "below the 50% match line"', lowHeads.length > 0 && lowHeads.every((h) => /below the 50% match line/i.test(h.head)), JSON.stringify(lowHeads));
check('alternatives under 50% print no score, bar or rank', lowHeads.every((h) => !h.hasNumber && !h.hasBar && !h.hasRank && !/\d+%\s*match score/i.test(h.head)), JSON.stringify(lowHeads));
const midAlts = alts.filter({ hasNot: page.locator('.result__score--low') });
check('alternatives at 50%+ still show their score', (await midAlts.count()) === 0 || (await midAlts.first().locator('.match__pct').count()) === 1);

await seed({ 's-done': ['none'] });
await page.goto(BASE + '/results', { waitUntil: 'networkidle' });
check('answers with no signal: empty state, not a crash', await page.getByRole('heading', { name: 'No matches yet' }).isVisible());
check('...and explains that "none yet" says nothing yet', /don.t point toward anything/.test(lower(await page.locator('.stub').innerText())));

// ================================================================ STAGE 4
const rows = (p = page) => p.locator('.explore__list > li');
const goto = async (path, p = page) => { await p.goto(BASE + path, { waitUntil: 'networkidle' }); };
const topTitle = () => page.locator('.result__title').first().innerText();

// ---------------------------------------------------------------- Career DNA
await seed(persona.answers, 'complete');
await goto('/profile');
check('profile: heading and radar present', (await page.locator('h1').innerText()) === 'Your Career DNA' && (await page.locator('.radar__svg').count()) === 1);
check('profile: eight sliders', (await page.locator('.slider input[type=range]').count()) === 8);
check('profile: sliders show words, not percentages', !/\d+\s*%/.test(await page.locator('.profile__edit').innerText()));
check('profile: security slider reads "Strongest" for the security student', (await page.locator('.slider').filter({ hasText: 'Security' }).locator('.slider__word').innerText()).toLowerCase() === 'strongest');
check('profile: mini matches start with Security Analyst', (await page.locator('.profile__top li').first().innerText()).includes('Security Analyst'));
await axeCheck(page, '/profile');
await shot(page, 'profile', { fullPage: true });

const edit = async (dim, v) => page.locator(`#dna-${dim}`).fill(String(v));
for (const [d, v] of Object.entries({ build: 10, data: 10, ai: 10, design: 100, security: 0, systems: 0, people: 60, play: 10 })) await edit(d, v);
check('editing sliders marks the profile as edited', lower(await page.locator('.profile__status').innerText()).includes('edited by you'));
check('mini matches update live (UI/UX Designer first)', (await page.locator('.profile__top li').first().innerText()).includes('UI/UX Designer'), await page.locator('.profile__top').innerText());
await goto('/results');
check('results use edited DNA and say so', (await page.locator('.banner').first().innerText()).includes('edited Career DNA'));
check('results top match follows the edit', (await topTitle()) === 'UI/UX Designer', await topTitle());
await page.reload({ waitUntil: 'networkidle' });
check('edited DNA survives a reload', (await topTitle()) === 'UI/UX Designer');
await goto('/profile');
check('sliders keep their edited value after reload', (await page.locator('#dna-design').inputValue()) === '100' && (await page.locator('#dna-security').inputValue()) === '0');
await page.getByRole('button', { name: 'Reset to my quiz result' }).click();
check('reset returns to the quiz result', (await page.locator('.profile__top li').first().innerText()).includes('Security Analyst'));
check('reset removes the edited tag', !lower(await page.locator('.profile__status').innerText()).includes('edited by you'));

await page.locator('#goal').fill('Become a penetration tester');
await page.reload({ waitUntil: 'networkidle' });
check('goal note persists', (await page.locator('#goal').inputValue()) === 'Become a penetration tester');

// ---------------------------------------------------------------- Explore
await goto('/explore');
check('explore: lists all 23 careers', (await rows().count()) === 23 && (await page.locator('.explore__count').innerText()) === 'All 23 careers');
check('explore: security student sorts by best match by default', (await page.locator('#sort').inputValue()) === 'match' && (await rows().first().locator('.crow__title').innerText()) === 'Security Analyst');
check('explore: scores shown are labelled as match scores', (await rows().first().locator('.crow__score').innerText()).includes('match score'));
const exploreScores = await pcts(page.locator('.crow__score .match__pct'));
check('explore: no score under 50% is printed anywhere', exploreScores.length > 0 && exploreScores.every((n) => n >= 50), exploreScores.join(','));
const lowRows = await page.locator('.crow__score--low').allInnerTexts();
check('explore: low-scoring careers say "below the 50% match line" instead of a number', lowRows.length > 0 && lowRows.every((t) => /below the 50% match line/i.test(t) && !/\d+% match score/.test(t)), lowRows.slice(0, 2).join(' | '));
await axeCheck(page, '/explore');
await shot(page, 'explore', { fullPage: true });

await page.locator('#q').fill('security');
const urlHasQuery = await page.waitForURL(/q=security/, { timeout: 5000 }).then(() => true, () => false);
check('search writes the query to the URL', urlHasQuery, page.url());
const secRows = await rows().locator('.crow__title').allInnerTexts();
check('search finds Security Analyst and narrows the list', secRows.includes('Security Analyst') && secRows.length < 23, secRows.join(','));
check('count line updates', /Showing \d+ of 23 careers/.test(await page.locator('.explore__count').innerText()));
await page.locator('#q').fill('zzzzqq');
check('no results: friendly empty state', (await page.locator('.explore__empty').innerText()).includes('No careers match'));
await page.locator('.explore__empty').getByRole('button', { name: 'Clear all filters' }).click();
check('clearing filters restores the list', (await rows().count()) === 23);

await goto('/explore?area=security');
check('area filter from a link: only the 2 security careers', (await rows().count()) === 2 && (await page.locator('.explore__count').innerText()) === 'Showing 2 of 23 careers');
check('area checkbox reflects the URL', await page.getByRole('checkbox', { name: /Security Ridge/ }).isChecked());
await goto('/explore?dim=security,systems');
const dimRows = await rows().locator('.crow__title').allInnerTexts();
check('"leans on" filter requires all selected dimensions', dimRows.includes('Security Analyst') && !dimRows.includes('Frontend Developer'), dimRows.join(','));
await goto('/explore?match=1');
const matchPctsExplore = await pcts(page.locator('.crow__score .match__pct'));
check('"matches for me" shows only 50%+ careers', matchPctsExplore.length > 0 && matchPctsExplore.every((n) => n >= 50), matchPctsExplore.join(','));

await goto('/');
await page.getByRole('link', { name: /Security Ridge/ }).click();
await page.waitForURL('**/explore?area=security');
check('Home map destination opens Explore filtered to that area', (await rows().count()) === 2);

await goto('/explore');
const daRow = rows().filter({ hasText: 'Data Analyst' }).first();
const saveBtn = daRow.getByRole('button', { name: 'Save Data Analyst' });
check('save button starts unpressed', (await saveBtn.getAttribute('aria-pressed')) === 'false');
await saveBtn.click();
check('save button becomes pressed', (await saveBtn.getAttribute('aria-pressed')) === 'true');
await page.reload({ waitUntil: 'networkidle' });
check('saved career survives reload', (await rows().filter({ hasText: 'Data Analyst' }).first().getByRole('button', { name: 'Save Data Analyst' }).getAttribute('aria-pressed')) === 'true');
await goto('/explore?saved=1');
check('"careers I saved" filter shows just that career', (await rows().count()) === 1);
await goto('/profile');
check('profile lists the saved career', (await page.locator('.profile__saved').innerText()).includes('Data Analyst'));

// Surprise Me (profile = security student; top matches must be avoided)
await goto('/explore');
await page.getByRole('button', { name: /Surprise me/ }).click();
await page.locator('.surprise__box').waitFor();
const first = await page.locator('.surprise__lead a').innerText();
const topFive = ['Security Analyst', 'Penetration Tester', 'Network Engineer', 'Cloud Engineer', 'QA / SDET'];
check('Surprise Me avoids the top matches', !topFive.includes(first), first);
check('Surprise Me explains itself', (await page.locator('.surprise__box').innerText()).length > 60);
await page.getByRole('button', { name: 'Show me another' }).click();
const second = await page.locator('.surprise__lead a').innerText();
check('"Show me another" gives a different career', second !== first, `${first} vs ${second}`);
await shot(page, 'surprise');

await page.evaluate(() => localStorage.clear());
await goto('/explore');
check('without a profile "matches for me" is disabled', await page.getByRole('checkbox', { name: /Matches for me/ }).isDisabled());
check('without a profile the default sort is A to Z', (await page.locator('#sort').inputValue()) === 'name');
await page.getByRole('button', { name: /Surprise me/ }).click();
check('Surprise Me works with no profile', await page.locator('.surprise__box').isVisible());

// ---------------------------------------------------------------- Career detail
await goto('/careers/tech-policy-cyber-law');
const callout = await page.locator('.callout').innerText();
check('Cyber Law page says it usually needs an LLB after B.Tech', /LLB/.test(callout) && /B\.Tech/.test(callout) && /usually/i.test(callout), callout);
check('salary and demand say "data not connected yet"', (await page.locator('.pending').count()) === 2 && (await page.locator('.pending__value').allInnerTexts()).every((t) => t === 'Data not connected yet'));
const detailText = await page.locator('article.career').innerText();
check('no salary figures anywhere on the page', !/[₹$]|\blpa\b|\blakh/i.test(detailText));
check('no verified link: says so, shows none', detailText.includes('No verified learning link yet') && (await page.locator('article.career a[href^="http"]').count()) === 0);
check('without a profile it invites the quiz instead of a score', (await page.locator('.career__match').innerText()).includes('Take the quiz'));
await axeCheck(page, '/careers/tech-policy-cyber-law');
await shot(page, 'career-cyber-law', { fullPage: true });

await goto('/careers/technical-writer');
const link = page.locator('article.career a[href^="https://roadmap.sh"]');
check('roadmap link is exact, verified and opens safely', (await link.getAttribute('href')) === 'https://roadmap.sh/technical-writer' && (await link.getAttribute('rel')).includes('noopener') && (await link.getAttribute('target')) === '_blank');
check('Technical Writer explains the missing writing dimension', (await page.locator('.career__match').innerText()).includes('"writing" axis'));

await seed(persona.answers, 'complete');
await goto('/careers/security-analyst');
check('career page shows the user match score and its caveat', /\d+% match score/.test(await page.locator('.career__match').innerText()) && (await page.locator('.career__match').innerText()).includes('not a prediction of success'));
await goto('/careers/ui-ux-designer');
const lowDetail = await page.locator('.career__match').innerText();
check('career page below 50%: no score printed, says it is below the line', /below the 50% match line/i.test(lowDetail) && !/\d+% match score/.test(lowDetail), lowDetail);
await goto('/careers/security-analyst');
check('career page has a radar for the career profile', (await page.locator('.career__radar .radar__svg').count()) === 1);
await page.getByRole('link', { name: /Ask Nova about this/ }).click();
await page.waitForURL('**/nova?career=security-analyst');
check('"Ask Nova about this" opens the demo chat with that career', (await page.locator('.msg--nova').last().innerText()).includes('Security Analyst'));
await goto('/careers/not-a-career');
check('unknown career id: friendly not-found', await page.getByRole('heading', { name: /couldn.t find that career/ }).isVisible());

// ---------------------------------------------------------------- Nova demo chat
await page.evaluate(() => localStorage.clear());
await goto('/nova');
check('chat: DEMO and "not live AI" are on the page', (await page.locator('.demo-banner').innerText()).toLowerCase().includes('demo mode') && (await page.locator('main').innerText()).toLowerCase().includes('not live ai'));
check('chat: heading carries a Demo tag', lower(await page.locator('h1 .tag--demo').innerText()) === 'demo');
check('chat: log region is announced politely', (await page.locator('[role=log]').getAttribute('aria-live')) === 'polite');
await page.getByRole('button', { name: 'What does a match score mean?' }).click();
check('suggested question gets its preset answer', (await page.locator('.msg--nova').last().innerText()).includes('cosine similarity'));
await page.locator('#chat-input').fill('what is the salary of a data analyst');
await page.getByRole('button', { name: 'Send' }).click();
check('salary question gets the honest "not connected" answer', (await page.locator('.msg--nova').last().innerText()).includes('data not connected yet'));
await page.locator('#chat-input').fill('whats the weather in hyderabad');
await page.keyboard.press('Enter');
const fb = await page.locator('.msg--nova').last().innerText();
check('unknown question: says it is a demo with no preset answer', fb.includes('demo mode') && fb.includes('no preset answer'), fb);
await page.getByRole('button', { name: 'Why is my top match my top match?' }).click();
const noResults = await page.locator('.msg--nova').last().innerText();
check('no results yet: asks you to take the quiz first', noResults.includes('Take the quiz first'), noResults);
check('every Nova message carries a Demo source label', (await page.locator('.msg--nova').count()) === (await page.locator('.msg--nova .msg__source').count()));
check('every Nova label says Demo', (await page.locator('.msg__source').allInnerTexts()).every((t) => t.startsWith('Demo')));
await seed(persona.answers, 'complete');
await goto('/nova');
await page.getByRole('button', { name: 'Why is my top match my top match?' }).click();
const withResults = await page.locator('.msg--nova').last().innerText();
check('with results: explains the real top match, labelled as built from results', withResults.includes('Security Analyst') && withResults.includes('not AI'), withResults);
await axeCheck(page, '/nova');
await shot(page, 'nova-chat', { fullPage: true });

// ---------------------------------------------------------------- retake keeps saved careers and shows how matches moved
await seed(persona.answers, 'complete');
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('pathfinder:v1'));
  s.saved = ['data-analyst'];
  s.goal = 'keep me';
  localStorage.setItem('pathfinder:v1', JSON.stringify(s));
});
await goto('/profile');
await page.getByRole('button', { name: 'Retake the quiz' }).click();
check('retake asks for confirmation and says what is kept', (await page.locator('.confirm').innerText()).includes('Saved careers and your goal stay'));
await page.getByRole('button', { name: /Yes, retake/ }).click();
await page.waitForURL('**/quiz');
check('retake lands on a clean quiz', (await page.locator('.opt input:checked').count()) === 0 && (await stepText()).includes('question 1 of 13'));
const afterRetake = await page.evaluate(() => JSON.parse(localStorage.getItem('pathfinder:v1')));
check('retake kept saved careers and goal, and remembered the old matches', afterRetake.saved[0] === 'data-analyst' && afterRetake.goal === 'keep me' && afterRetake.previous.matches[0].id === 'security-analyst');
for (const q of quiz.questions) {
  for (const id of PERSONAS[1].answers[q.id]) await page.click(`input[name="${q.id}"][value="${id}"]`);
  const last = q.id === quiz.questions.at(-1).id;
  await page.getByRole('button', { name: last ? /See my matches/ : /Next/ }).click();
}
await page.waitForURL('**/results');
check('new answers give new results (Data Scientist first)', (await topTitle()) === 'Data Scientist', await topTitle());
const cmp = page.locator('.compare');
check('results show how matches changed since the last attempt', await cmp.isVisible());
await cmp.locator('summary').click();
const cmpText = await cmp.innerText();
check('comparison names careers that dropped out and new arrivals', cmpText.includes('Security Analyst') && cmpText.includes('new in your top matches') && cmpText.includes('No longer in your top matches'), cmpText);

// ---------------------------------------------------------------- accessibility scans of the remaining pages
await axeCheck(page, '/results');
await goto('/');
await axeCheck(page, '/ (home)');
await goto('/quiz');
await axeCheck(page, '/quiz (finished gate)');
await page.evaluate(() => localStorage.clear());
await goto('/quiz');
await axeCheck(page, '/quiz (question)');
await goto('/about');
await axeCheck(page, '/about');

// privacy wipe clears everything, including saved careers
await seed(persona.answers, 'complete');
await page.evaluate(() => {
  const s = JSON.parse(localStorage.getItem('pathfinder:v1'));
  s.saved = ['data-analyst'];
  s.goal = 'x';
  localStorage.setItem('pathfinder:v1', JSON.stringify(s));
});
await goto('/privacy');
await page.getByRole('button', { name: 'Clear my saved data' }).click();
const wiped = await page.evaluate(() => JSON.parse(localStorage.getItem('pathfinder:v1') ?? 'null'));
check('privacy wipe removes answers, saved careers, goal and old results', !wiped || (Object.keys(wiped.quiz.answers).length === 0 && wiped.saved.length === 0 && wiped.goal === '' && wiped.previous === null), JSON.stringify(wiped));
await goto('/results');
check('after the wipe results are empty', await page.getByRole('heading', { name: 'No matches yet' }).isVisible());

// ---------------------------------------------------------------- mobile
const m = await ctx.newPage();
await m.setViewportSize({ width: 390, height: 800 });
await m.goto(BASE + '/', { waitUntil: 'networkidle' });
await seed(persona.answers, 'complete');
await m.goto(BASE + '/results', { waitUntil: 'networkidle' });
const overflow = (p) => p.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check('results: no horizontal overflow on mobile', (await overflow(m)) === 0);
await shot(m, 'results-mobile', { fullPage: true });
for (const path of ['/profile', '/explore', '/careers/security-analyst', '/careers/tech-policy-cyber-law', '/nova', '/privacy', '/about']) {
  await m.goto(BASE + path, { waitUntil: 'networkidle' });
  check(`${path}: no horizontal overflow on mobile`, (await overflow(m)) === 0, String(await overflow(m)));
}
await m.goto(BASE + '/profile', { waitUntil: 'networkidle' });
await shot(m, 'profile-mobile', { fullPage: true });
await m.goto(BASE + '/explore', { waitUntil: 'networkidle' });
await shot(m, 'explore-mobile', { fullPage: true });
await m.goto(BASE + '/nova', { waitUntil: 'networkidle' });
await shot(m, 'nova-mobile', { fullPage: true });

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
