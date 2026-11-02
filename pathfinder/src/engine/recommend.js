import { DIMENSION_BY_ID, DIMENSION_IDS } from '../data/dimensions.js';
import { SETTING_BY_ID, SETTING_IDS } from '../data/settings.js';
import { cosine } from './cosine.js';
import { assess } from './feasibility.js';
import { centre, magnitude } from './vector.js';
import { MIN_ALT_PERCENT, MIN_MATCH_PERCENT, tierOf } from './tiers.js';

export const TOP_N = 8;
export const ALT_N = 3;
export const MIN_DRIVER_SHARE = 0.1;

// Match score = how closely the SHAPE of the student's interests lines up with a
// career's: cosine similarity of the two interest profiles after each has had its
// own average removed (so "likes everything a bit" does not match everything). Work
// settings add a smaller, separate "does the day-to-day feel right" term. It is a
// match score, never a probability of success.
export const WEIGHTS = { interests: 0.85, settings: 0.15 };

/** 0-1 closeness of the student's work-setting preferences, or null if none were given. */
export function settingsSimilarity(settings, career) {
  const keys = SETTING_IDS.filter((k) => typeof settings?.[k] === 'number');
  if (!keys.length) return null;
  const diff = keys.reduce((s, k) => s + Math.abs(settings[k] - career.settings[k]), 0) / keys.length;
  return 1 - diff;
}

export function scoreOf(profile, career) {
  const interest = Math.max(0, cosine(profile.vector, centre(career.riasec)));
  const settings = settingsSimilarity(profile.settings, career);
  const score = settings === null ? interest : WEIGHTS.interests * interest + WEIGHTS.settings * settings;
  return { score, interest, settings };
}

const list = (items) => (items.length <= 1 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`);

/**
 * Explain a match. The interest part of the score is a sum over the six types of
 * (student_t x career_t) / (|student| x |career|), on centred profiles, so each
 * type's term is exactly how much it contributed. The largest are the "drivers".
 */
export function explain(profile, career) {
  const s = profile.vector;
  const c = centre(career.riasec);
  const denom = magnitude(s) * magnitude(c);

  const drivers = [];
  let stretch = [];
  if (denom) {
    // A "driver" is a type where BOTH profiles are above their own average. (A type where both
    // are below average also adds to a centred cosine, but "you both care little about it" is
    // not a reason to say you lean on it.)
    const terms = DIMENSION_IDS
      .filter((d) => s[d] > 0 && c[d] > 0)
      .map((d) => ({ dim: d, term: (s[d] * c[d]) / denom }));
    const total = terms.reduce((a, t) => a + t.term, 0) || 1;
    const positive = terms.sort((a, b) => b.term - a.term);
    positive
      .filter((t, i) => i === 0 || t.term / total >= MIN_DRIVER_SHARE)
      .slice(0, 3)
      .forEach((t) => {
        drivers.push({
          dim: t.dim,
          share: t.term / total,
          career: career.riasec[t.dim], // O*NET interest score, 1-7
          sources: profile.contributions
            .filter((x) => x.dim === t.dim)
            .sort((a, b) => b.weight - a.weight)
            .slice(0, 2)
            .map(({ prompt, label, optionId, questionId, section, kind }) => ({ prompt, label, optionId, questionId, section, kind })),
        });
      });
    // Types this career clearly leans on that the student's answers barely touched.
    stretch = DIMENSION_IDS
      .filter((d) => c[d] >= 1.2 && profile.display[d] < 0.3)
      .sort((a, b) => c[b] - c[a])
      .slice(0, 2);
  }

  // How the day-to-day compares with what the student said they like.
  const settingsNotes = SETTING_IDS
    .filter((k) => typeof profile.settings?.[k] === 'number')
    .map((k) => {
      const diff = Math.abs(profile.settings[k] - career.settings[k]);
      return { id: k, label: SETTING_BY_ID[k].label, pref: profile.settings[k], career: career.settings[k], state: diff <= 0.25 ? 'close' : diff >= 0.5 ? 'differs' : 'partly' };
    });

  const names = drivers.map((d) => DIMENSION_BY_ID[d.dim].label);
  const sentence = names.length
    ? `Your answers lean on ${list(names)} interests, which are also where ${career.title} sits.`
    : '';
  return { drivers, stretch, settingsNotes, sentence };
}

/**
 * Rank every career by match score.
 *
 * `percent` is the rounded match score. Only careers at or above MIN_MATCH_PERCENT are
 * matches; alternatives (a different domain from the top matches) need MIN_ALT_PERCENT.
 * `fit` says whether the typical route suits the student's stream and study answers.
 */
export function recommend(profile, careers, { top = TOP_N, alternatives = ALT_N } = {}) {
  const insufficient = !magnitude(profile.vector);

  const ranked = careers
    .map((career) => ({ career, ...scoreOf(profile, career) }))
    .sort((x, y) => y.score - x.score || x.career.title.localeCompare(y.career.title))
    .map((r, i) => ({
      ...r,
      rank: i + 1,
      percent: Math.round(r.score * 100),
      why: explain(profile, r.career),
      fit: assess(r.career, profile.context),
    }));

  if (insufficient) return { insufficient: true, ranked, matches: [], alternatives: [], belowMatchFloor: ranked.length, wanted: { top, alternatives } };

  const eligible = ranked.filter((r) => r.percent >= MIN_MATCH_PERCENT);
  const matches = eligible.slice(0, top);
  const rest = ranked.filter((r) => !matches.includes(r) && r.percent >= MIN_ALT_PERCENT);

  // Alternatives: other domains than the top matches cover, so the shortlist is not
  // near-identical roles. Fewer than asked for is fine; the floor matters more.
  const covered = new Set(matches.slice(0, 3).map((m) => m.career.domain));
  const fresh = rest.filter((r) => !covered.has(r.career.domain)).slice(0, alternatives);
  const filler = rest.filter((r) => !fresh.includes(r)).slice(0, alternatives - fresh.length);
  const alts = [...fresh, ...filler].sort((x, y) => x.rank - y.rank);

  return {
    insufficient: false,
    ranked,
    matches,
    alternatives: alts,
    belowMatchFloor: ranked.filter((r) => r.percent < MIN_MATCH_PERCENT).length,
    wanted: { top, alternatives },
  };
}

/**
 * Strong / Explore further. "Strong fits" are strong matches (80%+) whose typical route
 * also suits the student's stream and study answers. Everything else that is still a
 * match goes to "Explore further", each with its score band and the reasons. Nothing is hidden.
 */
export function splitMatches(matches) {
  const strong = matches.filter((m) => tierOf(m.percent)?.id === 'strong' && m.fit.fits);
  const explore = matches.filter((m) => !strong.includes(m));
  return { strong, explore };
}
