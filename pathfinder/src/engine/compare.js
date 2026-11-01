// Compare two recommendation runs (before and after a retake) so a student can
// see how their matches moved. Pure functions over small snapshots.

/** Keep only what is needed to compare later: career id, rank and percent. */
export const snapshotMatches = (matches) => ({
  matches: matches.map((m) => ({ id: m.career.id, percent: m.percent, rank: m.rank })),
});

export function sanitizeSnapshot(raw) {
  if (!raw || !Array.isArray(raw.matches)) return null;
  const matches = raw.matches
    .filter((m) => m && typeof m.id === 'string' && Number.isFinite(m.percent) && Number.isFinite(m.rank))
    .slice(0, 10)
    .map((m) => ({ id: m.id, percent: Math.round(m.percent), rank: Math.round(m.rank) }));
  return matches.length ? { matches } : null;
}

/**
 * @returns rows for every career in either run:
 *   move: 'new' | 'up' | 'down' | 'same' | 'dropped'   (positions within the matches list)
 */
export function compareRuns(previous, currentMatches) {
  const prevPos = new Map(previous.matches.map((m, i) => [m.id, { pos: i + 1, percent: m.percent }]));
  const nowPos = new Map(currentMatches.map((m, i) => [m.career.id, { pos: i + 1, percent: m.percent, title: m.career.title }]));

  const rows = [];
  for (const [id, now] of nowPos) {
    const was = prevPos.get(id);
    let move = 'new';
    if (was) move = was.pos === now.pos ? 'same' : was.pos > now.pos ? 'up' : 'down';
    rows.push({ id, title: now.title, now, was: was ?? null, move, places: was ? was.pos - now.pos : 0 });
  }
  const dropped = [...prevPos]
    .filter(([id]) => !nowPos.has(id))
    .map(([id, was]) => ({ id, title: null, now: null, was, move: 'dropped', places: 0 }));
  return { rows, dropped };
}
