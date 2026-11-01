// Safe localStorage wrapper. Storage can be missing or throw (private windows,
// blocked site data), so every access is guarded and the app keeps working
// from memory when it fails.

export const STORAGE_KEY = 'pathfinder:v1';

const memory = new Map();

function backing() {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function load(fallback = null) {
  const raw = (() => {
    try {
      return backing()?.getItem(STORAGE_KEY) ?? memory.get(STORAGE_KEY) ?? null;
    } catch {
      return memory.get(STORAGE_KEY) ?? null;
    }
  })();
  if (raw == null) return fallback;
  try {
    return JSON.parse(raw);
  } catch {
    return fallback; // corrupt value: behave as if nothing was saved
  }
}

/** @returns {boolean} true if the value reached localStorage */
export function save(value) {
  const raw = JSON.stringify(value);
  memory.set(STORAGE_KEY, raw);
  try {
    backing()?.setItem(STORAGE_KEY, raw);
    return Boolean(backing());
  } catch {
    return false;
  }
}

export function clearAll() {
  memory.delete(STORAGE_KEY);
  try {
    backing()?.removeItem(STORAGE_KEY);
  } catch {
    /* nothing to clear */
  }
}
