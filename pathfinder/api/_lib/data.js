// Reads PATHFINDER's own data files for the server. Plain fs reads (not JSON imports), so it works in
// Node on Vercel without import attributes. `includeFiles` in vercel.json ships the data with the function.
import { readFileSync } from 'node:fs';

const read = (name) => JSON.parse(readFileSync(new URL(`../../src/data/${name}`, import.meta.url), 'utf8'));

let cache = null;
export function loadData() {
  if (!cache) {
    const domains = read('domains.json').domains;
    cache = {
      careers: read('careers.json'),
      domainLabel: Object.fromEntries(domains.map((d) => [d.id, d.label])),
      registry: read('indiaRegistry.json'),
      auto: read('india-verification.json').results ?? {},
      manual: read('india-manual-verification.json').entries ?? {},
    };
  }
  return cache;
}
