import { useProfile } from '../../state/ProfileContext.jsx';

/** Toggle button for saving a career. The visible text says Save or Saved; aria-pressed carries the state too. */
export default function SaveButton({ career }) {
  const { saved, toggleSaved } = useProfile();
  const on = saved.includes(career.id);
  return (
    <button type="button" className={on ? 'save is-on' : 'save'} aria-pressed={on} onClick={() => toggleSaved(career.id)}>
      <span aria-hidden="true">{on ? '★' : '☆'}</span> {on ? 'Saved' : 'Save'}<span className="sr-only"> {career.title}</span>
    </button>
  );
}
