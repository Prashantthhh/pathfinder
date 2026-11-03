// Side-by-side comparison of 2-3 careers on the same fields. Every field is always present:
// a value that does not exist is the text "Not available", never a gap.

import { DIMENSIONS } from '../data/dimensions.js';
import { SETTINGS } from '../data/settings.js';
import { STREAM_LABELS } from '../data/streams.js';
import { domainLabel } from '../data/domainsIndex.js';
import { CHECK_TEXT, routesFor } from '../data/india.js';
import { STUDY_LABELS } from './feasibility.js';
import { tierOf } from './tiers.js';
import { CORE_LABEL, skillGap } from './skillGap.js';
import { progress } from './roadmap.js';

export const MAX_COMPARE = 3;
export const NOT_AVAILABLE = 'Not available';
const first = (text) => (text.match(/^.*?[.!?](\s|$)/)?.[0] ?? text).trim();
const uniq = (a) => [...new Set(a)].join('; ');

/**
 * @param careers 2-3 careers
 * @param ctx { percentById, ratings, roadmap }  the student's own data (any may be empty)
 * @returns sections: [{ id, title, rows: [{ id, label, cells: [{ text }] }] }]  (cell.text is always a non-empty string)
 */
export function sideBySide(careers, ctx = {}) {
  const { percentById = {}, ratings = {}, roadmap = {} } = ctx;
  const row = (id, label, fn) => ({ id, label, cells: careers.map((c) => ({ text: fn(c) || NOT_AVAILABLE })) });
  const named = (c, key, had) => uniq(routesFor(c).filter((r) => r[had]).map((r) => (r[key]?.verified ? r[key].name : CHECK_TEXT)));
  const matchText = (c) => {
    const pct = percentById[c.id];
    if (typeof pct !== 'number') return '';
    const tier = tierOf(pct);
    return `${pct}%${tier ? ` · ${tier.label.replace(' matches', ' match')}` : ' · below the 50% match line'}`;
  };

  return [
    {
      id: 'you', title: 'You',
      rows: [
        row('match', 'Match score', matchText),
        row('skills-rated', 'Skills and knowledge you have rated', (c) => { const g = skillGap(c, ratings); return `${g.total - g.unrated} of ${g.total} rated; confident in ${g.confident}`; }),
        row('road', 'Roadmap progress', (c) => { const p = progress(c, roadmap[c.id]); return `${p.done} of ${p.total} stages`; }),
      ],
    },
    {
      id: 'about', title: 'The career',
      rows: [
        row('domain', 'Domain', (c) => domainLabel(c.domain)),
        row('what', 'In brief', (c) => first(c.description)),
        row('skills', 'Skills it needs more than most careers', (c) => (c.skills.length ? c.skills.join(', ') : c.coreSkills?.length ? `${CORE_LABEL}: ${c.coreSkills.join(', ')}` : '')),
        row('knowledge', 'Knowledge it needs more than most careers', (c) => (c.knowledge ?? []).join(', ')),
        row('salary', 'Salary (India)', (c) => (c.salary ? String(c.salary) : '')),
        row('outlook', 'Outlook (India)', (c) => (c.outlook ? String(c.outlook) : '')),
      ],
    },
    {
      id: 'interests', title: 'Interest scores (O*NET, 1 to 7)',
      rows: DIMENSIONS.map((d) => row(`int-${d.id}`, d.label, (c) => (typeof c.riasec[d.id] === 'number' ? c.riasec[d.id].toFixed(1) : ''))),
    },
    {
      id: 'settings', title: 'How the work feels (relative to the other careers here)',
      rows: SETTINGS.map((s) => row(`set-${s.id}`, s.label, (c) => {
        const v = c.settings?.[s.id];
        if (typeof v !== 'number') return '';
        return v < 0.34 ? s.low : v > 0.66 ? s.high : 'Somewhere in between';
      })),
    },
    {
      id: 'route', title: 'The route in India (typical route, verify with the official body)',
      rows: [
        row('streams', 'Usually starts from', (c) => c.entry.streams.map((s) => STREAM_LABELS[s] ?? s).join(', ')),
        row('study', 'Typical study length', (c) => STUDY_LABELS[c.entry.studyYears]),
        row('exam', 'Entrance exam', (c) => named(c, 'exam', 'hadExam')),
        row('body', 'Governing or licensing body', (c) => named(c, 'body', 'hadBody')),
      ],
    },
  ];
}
