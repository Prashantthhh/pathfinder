import { DIMENSION_IDS } from '../data/dimensions.js';

/** Turn a { dim: value } object into an array in canonical dimension order. */
export function toArray(vec, dims = DIMENSION_IDS) {
  return dims.map((d) => Number(vec?.[d]) || 0);
}

export function magnitude(vec, dims = DIMENSION_IDS) {
  return Math.sqrt(toArray(vec, dims).reduce((s, x) => s + x * x, 0));
}

/**
 * Cosine similarity of two dimension vectors (objects keyed by dimension id).
 * Returns 0 when either vector is all zeros, so "no data" never looks like a match.
 */
export function cosine(a, b, dims = DIMENSION_IDS) {
  const x = toArray(a, dims);
  const y = toArray(b, dims);
  let dot = 0;
  let nx = 0;
  let ny = 0;
  for (let i = 0; i < x.length; i++) {
    dot += x[i] * y[i];
    nx += x[i] * x[i];
    ny += y[i] * y[i];
  }
  if (nx === 0 || ny === 0) return 0;
  return dot / (Math.sqrt(nx) * Math.sqrt(ny));
}
