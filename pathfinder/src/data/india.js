import registry from './indiaRegistry.json';
import verification from './india-verification.json';

// Indian exams and bodies are shown by NAME and LINK only when `npm run links:check`
// confirmed both that the official page loads and that it mentions the name.
// Anything else is shown as "Check with the official body". We record names and
// bodies only: no eligibility percentages, age limits, fees or exam patterns.

export const CHECK_TEXT = 'Check with the official body';

const lookup = (kind, id) => {
  const entry = registry[kind][id];
  if (!entry) return null;
  const v = verification.results?.[`${kind}:${id}`];
  const verified = Boolean(v?.loaded && v?.needleFound);
  return { id, name: entry.name, url: verified ? entry.url : null, verified };
};

/**
 * Route lines for a career, e.g. [{ exam: {name,url}|null, body: {name,url}|null }].
 * `exam`/`body` are null when unverified or not applicable; the caller prints CHECK_TEXT.
 */
export function routesFor(career) {
  return (career.routes ?? []).map((r) => ({
    exam: r.exam ? lookup('exams', r.exam) : null,
    body: r.body ? lookup('bodies', r.body) : null,
    hadExam: Boolean(r.exam),
    hadBody: Boolean(r.body),
  }));
}

export const verifiedOn = verification.checkedAt ?? null;
