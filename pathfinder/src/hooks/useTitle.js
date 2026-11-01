import { useEffect } from 'react';

const BASE = 'PATHFINDER';

/** Sets the document title (read out by screen readers on navigation). */
export default function useTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : `${BASE} — find your trail in tech`;
  }, [title]);
}
