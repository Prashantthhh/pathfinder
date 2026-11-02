# Design audit and Phase 1 decisions

Audit of the first version (CSE-only, 8 tech dimensions, parchment look) and what replaced it.
Four criticisms were confirmed by the product owner.

| # | What was wrong | What replaced it |
|---|----------------|------------------|
| 1 | **The backdrop was texture, not wayfinding.** The same faint contour lines sat behind every page, carried no information and were generated from hard-coded hills. | No global backdrop. Terrain exists only where it means something: the interest map. Its height field is built from the 35 domains' own positions, so land rises where careers cluster. |
| 2 | **Too beige and quiet.** One parchment tone and brown ink everywhere; sections looked alike; little contrast or energy. | Night-map surfaces for the map and key sections, light pages for reading, and six vivid trail-blaze colours (one per RIASEC type) used as a system: header blaze strip, map wedges, dots, region letters. Bricolage Grotesque display type and Atkinson Hyperlegible body type, self-hosted. |
| 3 | **The map was boxy and only on Home.** Destinations were rectangular label boxes (the card look), placed by hand, on one page, and could not scale to 35 domains. | One real map: Holland's hexagon as geography. Dots are placed by computed O*NET interest scores (`src/engine/hexmap.js`, `scripts/build-domains.mjs`), never by hand. A list twin gives touch and screen-reader access. The same projection will place the student ("you are here") and careers in later phases. |
| 4 | **Nova was small and idle.** Decorative; the compass pointed at nothing and did not travel with you. | Larger, faceted Nova with a real needle: she turns to a bearing and points at what is selected, with a route line, on the map, in the final call to action and (later) through the quiz and results. |

## Map semantics

- Six corners in Holland's order (R at the top, then I, A, S, E, C clockwise). Neighbouring types are alike; opposite types are least alike.
- A domain's **wedge is its primary interest**. A strong neighbouring interest nudges it toward that neighbour (at most 22 degrees). Distance from the centre says how distinct the primary interest is.
- A strong second interest on a **non-adjacent** type (for example Investigative plus Conventional) does not move the point; the readout names it.
- An early attempt summed the six corner vectors. That put Investigative+Conventional profiles (Maths, Software) near Realistic, which is mathematically fine and misleading for a student, so it was replaced by the Holland-code reading above.
- Points are spread slightly so labels never overlap (minimum gap enforced by test; maximum nudge recorded in `domains.json`).

## Data provenance and limits (must stay visible in the product)

- Source: O*NET 31.0 Database, August 2026 release, U.S. Department of Labor, Employment and Training Administration (USDOL/ETA), CC BY 4.0. SHA-256 of the downloaded archive is stored in `src/data/domains.json`.
- The RIASEC scores (`Career Interest Types.txt`, scale OI 1-7) are labelled by O*NET as **Machine Learning/Expert**, dated 02/2026. They are estimates, not survey ratings, and the Home page says so.
- O*NET 31.0 publishes **no Work Values file**. Work-setting preferences will therefore be derived from published Work Context items and labelled as derived by us, never as an O*NET score.
- **Military occupations have no interest data in O*NET**, so armed-forces careers cannot get an O*NET-sourced vector. The Defence & Police domain uses police, investigator and firefighter occupations.
- O*NET describes US occupations. It is never used for salary, outlook or qualifications in India; those show "data not connected yet" unless a cited Indian source exists.
- Required attribution and a note that the information was modified are in the footer of every page.

## Rebuilding the data

```
npm run onet:fetch      # download O*NET into .cache/onet (git-ignored)
npm run onet:domains    # rebuild src/data/domains.json from domainSeeds.json
```

`domainSeeds.json` lists each domain's representative occupations by exact O*NET title. The build fails loudly on a missing title or an occupation without interest data.
