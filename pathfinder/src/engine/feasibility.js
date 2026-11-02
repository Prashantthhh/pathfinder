import { STREAM_LABELS } from '../data/streams.js';

// "Typical route" fit: does the route into a career usually start from the
// student's stream, and does its usual study length clash with what they told us?
//
// This ONLY groups results (Strong / Explore further). It never hides a career and
// never changes the match score. The stream and study-length fields on each career
// are our general reading of the usual route in India, not eligibility rules; the
// UI labels them "typical route, verify with the official body".

export { STREAM_LABELS };

const joinOr = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`);

export const STUDY_LABELS = { '≤3': 'up to 3 years', '4-5': '4 to 5 years', '5+': '5 or more years' };

const isGraduate = (s) => typeof s === 'string' && s.startsWith('grad-');

/**
 * Streams that do not narrow the route: any stream, or "any graduate degree" (every
 * 12th-level stream can go on to take some degree, so that is not a stream mismatch).
 */
const isOpen = (streams) => streams.includes('any') || streams.includes('grad-any');

/**
 * @param {{ entry: { streams: string[], studyYears: string } }} career
 * @param {{ stream?: string|null, study?: string|null, earn?: string|null }} context
 * @returns {{ fits: boolean, reasons: { kind: 'stream'|'study', text: string }[] }}
 */
export function assess(career, context = {}) {
  const reasons = [];
  const { streams, studyYears } = career.entry;
  const s = context.stream;

  // 1. Does the route usually start from the student's stream?
  const streamOk = !s || isOpen(streams) || streams.includes(s);
  if (!streamOk) {
    reasons.push({ kind: 'stream', text: `Typical route starts from ${joinOr(streams.map((x) => STREAM_LABELS[x] ?? x))}` });
  }

  // 2. Does the usual study length clash with what the student told us?
  //    A graduate whose degree already matches the route has done the bachelor's
  //    years, so only routes that need study BEYOND a degree (5+) count for them.
  const hasDegreeAlready = isGraduate(s) && streamOk;
  const longRoute = hasDegreeAlready ? studyYears === '5+' : studyYears === '5+' || studyYears === '4-5';
  if (context.study === 'no' && studyYears === '5+') {
    reasons.push({ kind: 'study', text: `Typical route takes 5 or more years of study${hasDegreeAlready ? ' in total, so more study beyond a degree' : ''}` });
  } else if (context.earn === 'yes' && longRoute) {
    reasons.push({
      kind: 'study',
      text: hasDegreeAlready
        ? 'Typical route needs further study beyond a degree before a full-time role'
        : `Typical route takes ${STUDY_LABELS[studyYears]} of study before a full-time role`,
    });
  }

  return { fits: reasons.length === 0, reasons };
}
