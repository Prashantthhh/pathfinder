import { useEffect } from 'react';

const BASE = 'PATHFINDER';
const DEFAULT_TITLE = `${BASE} — find where you fit on the career map`;
const DEFAULT_DESC =
  'PATHFINDER is a career map for students in India, in any stream. Answer a short quiz, see where you land among 35 career domains, and explore 61 careers with reasons, skills and typical routes. Not a prediction of success.';

/**
 * Sets the document title (read out by screen readers on navigation) and the meta description (shown by
 * search engines and link previews). Pass a short page description where one helps.
 */
export default function useTitle(title, description) {
  useEffect(() => {
    document.title = title ? `${title} · ${BASE}` : DEFAULT_TITLE;
    const meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', description || DEFAULT_DESC);
  }, [title, description]);
}
