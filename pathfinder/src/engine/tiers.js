// Match-strength bands for the results page, as specified for the product:
//   strong >= 75%, worth exploring 60-74%, partial overlap 50-59%.
// (Re-set from 80/65 when scoring moved to centred interests: 75 gives a student about
// three strong careers, as 80 did before. See `npm run spread`.)
// Nothing below MIN_MATCH_PERCENT is ever presented as a match. Alternatives
// (careers from other areas) may go down to MIN_ALT_PERCENT.
// Percentages are the rounded match scores that are shown to the user.

export const MIN_MATCH_PERCENT = 50;
export const MIN_ALT_PERCENT = 45;
export const STRONG_MIN = 75;
export const WORTH_MIN = 60;

export const TIERS = [
  { id: 'strong', min: STRONG_MIN, label: 'Strong matches', blurb: 'Your answers line up closely with these careers.' },
  { id: 'worth', min: WORTH_MIN, label: 'Worth exploring', blurb: 'A good part of the profile overlaps. Read the details before deciding.' },
  { id: 'partial', min: MIN_MATCH_PERCENT, label: 'Partial overlap', blurb: 'Only some of your answers line up. Explore these out of curiosity, not because of the score.' },
];

/** The tier for a percent, or null when it is too low to count as a match. */
export const tierOf = (percent) => TIERS.find((t) => percent >= t.min) ?? null;

/** Group ranked items ({ percent }) into non-empty tiers, preserving order. Items below the match floor are dropped. */
export function groupByTier(items) {
  return TIERS
    .map((tier) => ({ tier, items: items.filter((i) => tierOf(i.percent)?.id === tier.id) }))
    .filter((g) => g.items.length > 0);
}
