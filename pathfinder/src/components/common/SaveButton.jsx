import { useProfile } from '../../state/ProfileContext.jsx';

/** Toggle button for saving a career. The label stays "Save"; aria-pressed carries the state. */
export default function SaveButton({ career }) {
  const { saved, toggleSaved } = useProfile();
  const on = saved.includes(career.id);
  return (
    <button
      type="button"
      className={on ? 'save is-on' : 'save'}
      aria-pressed={on}
      aria-label={`Save ${career.title}`}
      onClick={() => toggleSaved(career.id)}
    >
      <span aria-hidden="true">{on ? '★' : '☆'}</span> {on ? 'Saved' : 'Save'}
    </button>
  );
}
