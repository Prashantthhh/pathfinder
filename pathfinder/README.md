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
```

## End-to-end tests

`npm run e2e` builds the app, serves it on a free port, and clicks through the quiz,
save/resume, results bands and floors, and mobile layout. It exits non-zero on any failure.

It uses `playwright-core`, which does not download a browser. By default it uses the
Microsoft Edge that ships with Windows.

- `E2E_BROWSER=chrome` use another installed browser channel
- `E2E_CHROME_PATH=/path/to/chromium` use any Chromium-based executable
- `E2E_SHOTS=1` save screenshots to `e2e-output/` (git-ignored)

## Matching rules

- Match score = cosine similarity between the student's 8-dimension profile and the career's.
  It is not a prediction of success.
- Bands: strong 80%+, worth exploring 65-79%, partial overlap 50-64%.
- Nothing under 50% is shown as a match. Alternatives (careers from other areas) need 45%+,
  and fewer are shown when fewer qualify.
- Salary and demand are `null` ("data not connected yet"). External links are limited to the
  verified allow-list in `src/data/links.js`.
