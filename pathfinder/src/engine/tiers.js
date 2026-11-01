// Match-strength bands for the results page. The cut-offs are rough reading
// aids, not statistically meaningful boundaries, and the UI says so.

export const TIERS = [
  { id: 'strong', min: 80, label: 'Strong matches', blurb: 'Your answers line up closely with these careers.' },
  { id: 'worth', min: 60, label: 'Worth exploring', blurb: 'A good part of the profile overlaps. Read the details before deciding.' },
  { id: 'partial', min: 0, label: 'Partial overlap', blurb: 'Only some of your answers line up. Explore these out of curiosity, not because of the score.' },
];

export const tierOf = (percent) => TIERS.find((t) => percent >= t.min) ?? TIERS[TIERS.length - 1];

/** Group ranked items ({ percent }) into non-empty tiers, preserving order. */
export function groupByTier(items) {
  return TIERS
    .map((tier) => ({ tier, items: items.filter((i) => tierOf(i.percent).id === tier.id) }))
    .filter((g) => g.items.length > 0);
}
