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

## Where you are on the map

`src/engine/youAreHere.js` places a student on the same hexagon as the 35 domains (Holland-code wedge, nudged toward a
strong neighbour) and returns the three nearest domains. The pin shows on Home, Results, Career DNA (it moves as the
sliders move) and career pages (which also mark that career's domain). It is a place to start looking, not a score.

## Skills, roadmap, compare, dashboard

- **Skill gap** (career page): the skills are the career's O*NET skills; the student rates each one (not yet / learning / confident).
  Nothing is inferred from interest answers, and an unrated skill is "not rated", not "none".
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
