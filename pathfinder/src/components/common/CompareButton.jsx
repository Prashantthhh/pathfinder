import { useProfile } from '../../state/ProfileContext.jsx';
import { MAX_COMPARE } from '../../engine/sideBySide.js';

/** Add or remove a career from the comparison (up to three). Visible text and aria-pressed both carry the state. */
export default function CompareButton({ career }) {
  const { compare, toggleCompare } = useProfile();
  const on = compare.includes(career.id);
  const full = !on && compare.length >= MAX_COMPARE;
  return (
    <button
      type="button"
      className={on ? 'save is-on' : 'save'}
      aria-pressed={on}
      disabled={full}
      title={full ? `You can compare up to ${MAX_COMPARE} careers. Remove one first.` : undefined}
      data-testid="compare-btn"
      onClick={() => toggleCompare(career.id)}
    >
      <span aria-hidden="true">{on ? '✓' : '+'}</span> {on ? 'Comparing' : 'Compare'}<span className="sr-only"> {career.title}</span>
    </button>
  );
}
