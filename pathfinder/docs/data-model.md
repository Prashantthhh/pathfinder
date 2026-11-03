# Data model, scoring and sources (Phase 2)

## What a career is
61 careers across all 35 domains.
`src/data/careers.json` is **generated** by `scripts/build-careers.mjs` from two inputs:

| Input | Contents |
|---|---|
| `careerSeeds.json` (hand-written) | id, title, domain, the exact O*NET occupation title, loose-match note, search keywords, typical route (`entry`), India exam/body ids (`routes`) |
| O*NET 31.0 Database (CC BY 4.0) | description, interest scores (RIASEC, 1-7), tasks, skills, Work Context |

Generated per career: `riasec`, `settings` (+ `settingsRaw`), `tasks` (5 most important core tasks), `skills` (5), `related` (3 nearest by interest profile), `salary: null`, `outlook: null`.

## Scoring
The student's profile has three parts.

1. **Interests (`riasec`)**: counts from eight "pick up to two activities" questions plus the school-subjects question.
2. **Work settings (`settings`)**: six 0-1 preferences from four work-style questions.
3. **Context (`stream`, `study`, `earn`)**: stream/education and two constraints. **Never part of the score.**

`score = 0.85 * interest + 0.15 * settings` (interest only if no settings were answered), where

- `interest` = cosine similarity of the student's and the career's interest profiles **after each has its own average removed** (so "likes everything a bit" does not match everything), clipped at 0;
- `settings` = 1 minus the mean absolute difference over the settings the student answered.

`percent` is the rounded score. Bands: strong >= 75, worth exploring 60-74, partial overlap 50-59 (cutoffs chosen with `npm run spread` so a student gets about three strong careers, as the old 80 did). Nothing below 50 is a match; alternatives (other domains than the top three) need 45+ and are shown with no number below 50.

**Drivers** in "Why this match" are interest types where BOTH profiles are above their own average. (Low-on-both also adds to a centred cosine but is not a reason.)

## Strong fits vs Explore further
`feasibility.assess()` compares the career's typical route with the student's context. It never changes a score and never hides a career.

- **Strong fits** = score >= 75 **and** the typical route suits the student's stream and study answers.
- **Explore further** = every other match, with the reasons: a different usual starting stream, or a longer route than the student wants.
- Any 12th-level stream can start "any graduate degree" routes, so those are not a stream mismatch. A graduate whose degree already fits a route has done its bachelor's years, so only routes needing study beyond a degree count against them.

`entry.streams` and `entry.studyYears` are **our general reading** of the usual route in India, not eligibility rules. They are labelled "typical route, verify with the official body" everywhere. We record no eligibility percentages, age limits, fees or exam patterns.

## Work settings (derived by us, not O*NET)
O*NET 31.0 has no Work Values file. `src/data/settings.js` lists the Work Context items behind each setting. Raw values are compressed (nearly every occupation involves some contact with people), so each setting is rescaled 0-1 across the 61 careers; `settingsRaw` keeps the unscaled value.

## India routes
`indiaRegistry.json` holds exam and governing-body **names** with their official URLs. `npm run links:check` loads each official page in a real browser and checks that **the page loads and the name appears on it**. Results are in `india-verification.json`; an unreachable site keeps an earlier verification (with its date), and only a loaded page that lacks the name removes one. The UI shows a name and link only when verified; otherwise "Check with the official body".

**Manual verification.** A person can confirm a name by hand: `npm run links:verify -- add exams:upsc-cse --date YYYY-MM-DD` writes `india-manual-verification.json` (`list` shows candidates, `remove` undoes it). The date is required. The UI then shows the link with "(verified manually on <date>)". The checker never writes this file, and it ships empty.

## Known limits
- O*NET labels its interest scores "Machine Learning/Expert" (02/2026); they are estimates and describe US occupations. Nothing from O*NET is used for Indian salary, outlook or qualifications (those show "data not connected yet").
- Armed-forces careers are absent: O*NET has no interest data for military occupations.
- Loose O*NET matches (flagged in the product): Entrepreneur, Company Secretary, Bank Officer, Civil Servant.
- Some placements surprise (O*NET puts Cybersecurity under Conventional and Nursing under Investigative).

## Rebuilding
```
npm run onet:fetch      # download O*NET into .cache/onet (git-ignored)
npm run onet:domains    # domains.json from domainSeeds.json
npm run onet:careers    # careers.json + careersMeta.json from careerSeeds.json
npm run links:check -- --write   # re-verify exam and body names on official sites
```
