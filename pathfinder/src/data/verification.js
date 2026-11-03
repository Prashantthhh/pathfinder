// How a registry entry counts as verified: the automatic checker found the page and the name,
// or a person confirmed it by hand and recorded the date.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isValidDate = (s) => typeof s === 'string' && ISO_DATE.test(s) && !Number.isNaN(Date.parse(s));

/** { verified, how: 'checker' | 'manual' | null, on: date | null } */
export function verificationOf(auto, manual) {
  if (auto?.loaded && auto?.needleFound) return { verified: true, how: 'checker', on: auto.checkedAt ?? null };
  if (manual && isValidDate(manual.verifiedOn)) return { verified: true, how: 'manual', on: manual.verifiedOn };
  return { verified: false, how: null, on: null };
}
