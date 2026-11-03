import { CHECK_TEXT } from '../../data/india.js';

/** An exam or body name with its official link, only if the name is verified; else "Check with the official body". */
export default function Named({ item, fallback = CHECK_TEXT }) {
  if (!item || !item.verified) return <span>{fallback}</span>;
  return (
    <>
      <a href={item.url} target="_blank" rel="noopener noreferrer">
        {item.name}<span className="sr-only"> (opens the official site in a new tab)</span>
      </a>
      {item.how === 'manual' && <span className="route__manual" data-testid="manual-note"> (verified manually on {item.on})</span>}
    </>
  );
}
