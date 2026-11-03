import { useMemo } from 'react';
import domainData from '../data/domains.json';
import { locate } from '../engine/youAreHere.js';
import { useProfile } from '../state/ProfileContext.jsx';

/** The student's spot on the interest map (or null with no interest answers yet), following Career DNA edits. */
export default function useYou() {
  const p = useProfile();
  return useMemo(() => locate(p.profile, domainData.domains, domainData.meta.maxLead), [p.profile]);
}
