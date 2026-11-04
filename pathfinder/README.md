# PATHFINDER

Career discovery for B.Tech CSE students. React + Vite + react-router, frontend only:
data lives in `src/data`, progress is saved in the browser's localStorage.

```
npm install
npm run dev        # dev server
npm run build      # production build
npm test           # unit tests (vitest): engine, data integrity, quiz state, tiers
npm run samples    # print top matches for the sample students
npm run e2e        # build, then drive the real UI in a browser (see below)
npm run onet:fetch    # download O*NET into .cache/onet (git-ignored)
npm run onet:domains  # rebuild src/data/domains.json from the O*NET data
npm run onet:careers  # rebuild src/data/careers.json from the O*NET data
npm run links:check   # confirm exam / body names on official sites (add -- --write to save)
npm run links:verify  # list / add / remove names a person checked by hand (needs --date)
npm run spread        # score spread over simulated students (add -- --old <path> to compare)
```

## Quality checks

`npm run test:all` runs everything: unit tests, the end-to-end suite and the audit. Each can run alone:

- `npm test` unit tests (engine, data integrity, state, the Nova server code with the AI provider mocked)
- `npm run e2e` drives the real UI (details below)
- `npm run audit` visits every route, with and without student data, at 1280, 390 and 320 px wide and checks: no console
  errors, no horizontal scroll, a unique title and meta description, one `h1` and one `main`, axe-core (WCAG 2.0/2.1/2.2 A and AA plus best
  practices), tap targets of at least 24x24 px, a visible keyboard focus indicator on every Tab stop, no text cut off by an ellipsis,
  no endless animation under `prefers-reduced-motion`, and the mobile menu (state announced, Escape closes it and returns focus)
- `npm run shots` full-page desktop and mobile screenshots into `e2e-output/shots/` for a visual check

## End-to-end tests

`npm run e2e` builds the app, serves it on a free port, and clicks through the quiz,
Career DNA editing, Explore, career pages, the Nova demo chat, and runs an axe-core
accessibility scan on each page. It also checks the quiz,
save/resume, results bands and floors, and mobile layout. It exits non-zero on any failure.

It uses `playwright-core`, which does not download a browser. By default it uses the
Microsoft Edge that ships with Windows.

- `E2E_BROWSER=chrome` use another installed browser channel
- `E2E_CHROME_PATH=/path/to/chromium` use any Chromium-based executable
- `E2E_SHOTS=1` save screenshots to `e2e-output/` (git-ignored)

## Matching rules

See `docs/data-model.md` for the full model. In short:

- Interests use Holland's six RIASEC types. A match score is the cosine similarity of the student's and the
  career's interest profiles (each with its own average removed), plus a smaller work-settings term. It is not a
  prediction of success.
- Bands: strong 75%+, worth exploring 60-74%, partial overlap 50-59%. Nothing under 50% is a match; alternatives need 45%+.
- Stream and study answers only decide **Strong fits vs Explore further**. They never change a score or hide a career.
- Salary and outlook are `null` ("data not connected yet"). O*NET is US data and is not used for India.
- Indian exams and governing bodies are shown only if `npm run links:check` confirmed the name on the official site.

## Live Nova (optional)

Nova answers with AI when a key is set, and with the preset demo answers otherwise (no key, API error, free limit hit).
Live replies are labelled **AI-generated**; demo replies are labelled **Demo**.

- `POST /api/nova` is a Vercel serverless function (`api/nova.js`, logic in `api/_lib/`). The key is read **only** from the
  `NOVA_API_KEY` environment variable on the server. It is never in `src/`, the build, or git (`.env*` is git-ignored; a test checks this).
- The browser sends the question, up to 4 recent turns, top matches (id + score), the Career DNA (six numbers), the career page id and the next
  roadmap stage. The server looks the career up in its own data; it never trusts career text from the browser. No goal note, saved list, quiz
  answers, name or contact details are sent.
- The system prompt (`api/_lib/rules.js`) is server-side: answer only from the data given, never invent salaries, exam dates, eligibility rules
  or links, say "check with the official body" for anything time-sensitive, keep it short. A guard (`api/_lib/guard.js`) strips links and drops an
  answer that contains money figures or dates.
- Limits: 8 requests / 10 min and 40 / day per anonymous client (hashed IP, kept in memory only), 600 / day overall, and 25 live questions / day per
  browser. In-memory counts are per serverless instance, so this is best-effort; for a hard cross-instance limit add a shared store (Upstash
  Redis / Vercel KV).

**Provider.** Any OpenAI-compatible chat API. The default is [Groq](https://console.groq.com) (model `qwen/qwen3.8-27b`; Groq retires models, so `npm run nova:diagnose` prints the provider's real error and the models your key can use) (free tier, no card needed when last checked; limits and
data policy change, so read them). Get a key: sign in at console.groq.com, open **API Keys**, **Create API Key**, copy it (shown once). Other
options: Google AI Studio (key from aistudio.google.com; set `NOVA_API_URL=https://generativelanguage.googleapis.com/v1beta/openai/chat/completions` and a
`NOVA_MODEL`); free tiers of some providers may use requests to improve their products, so check before sending student questions.

```
# local: create pathfinder/.env.local (git-ignored) containing   NOVA_API_KEY=your-key
npm run dev            # the dev server also serves /api/nova
npm run nova:samples   # asks 5 sample questions through the same server code
# Vercel: Project > Settings > Environment Variables > add NOVA_API_KEY (Production and Preview), then redeploy
```

Optional: `NOVA_API_URL`, `NOVA_MODEL` (see `.env.example`).

## Where you are on the map

`src/engine/youAreHere.js` places a student on the same hexagon as the 35 domains (Holland-code wedge, nudged toward a
strong neighbour) and returns the three nearest domains. The pin shows on Home, Results, Career DNA (it moves as the
sliders move) and career pages (which also mark that career's domain). It is a place to start looking, not a score.

## Skills, roadmap, compare, dashboard

- **Skill gap** (career page; a career with no skill above the edge shows its top 3 by raw importance as "Core skills (common to many careers)"): the items are the O*NET skills and knowledge areas the career needs *more than the average career* (importance minus the
  cross-career mean, see `docs/data-model.md`); the student rates each one (not yet / learning / confident).
  Nothing is inferred from interest answers, and an unrated item is "not rated", not "none".
- **Roadmap** (career page): stages come from the career's own typical-route data (start stream, entrance exam, study length,
  governing body), or are hand-written in `careerSeeds.json` (`roadmap`) for well-known routes (Doctor, Dentist, Lawyer, CA, Civil
  Servant, Architect, Pilot). Stages point only at exam and body ids in the India registry, so a link shows only if that name is
  verified. No invented course links and no "free" claims. Ticks are saved in localStorage.
- **Compare** (`/compare`): 2-3 careers on the same fields; a field with no data says "Not available".
- **Dashboard** (`/dashboard`): saved careers, roadmap progress, skill counts, the pin on the map and one next step. Only the
  student's own data: no invented stats or badges.
- `npm run shots` takes full-page desktop and mobile screenshots into `e2e-output/shots/`.

## Deploying (Vercel)

There is no backend and no environment variables, so nothing secret is needed.

- Import the GitHub repo in Vercel.
- **Root Directory:** `pathfinder` (the app lives in a subfolder of the repo).
- Framework preset: Vite (auto-detected). Build command `npm run build`, output directory `dist`.
- `vercel.json` rewrites every path to `index.html` so deep links such as
  `/careers/security-analyst` work after a refresh, and adds a few basic security headers.

## Data sources and attribution

The interest map is built from the O*NET 31.0 Database (U.S. Department of Labor, Employment and
Training Administration), used under CC BY 4.0. O*NET describes US occupations and is never used here
for Indian salary, outlook or qualifications. See `docs/design-audit.md` for the model, the data
limits (including O*NET's own "Machine Learning/Expert" labelling of the interest scores) and how to
rebuild the data.
