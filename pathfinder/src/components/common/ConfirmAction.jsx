import { useState } from 'react';

/**
 * Two-step button for destructive actions: the first click asks, the second
 * does it. Keeps the ask inline so there is no modal focus trap to manage.
 */
export default function ConfirmAction({ label, warning, confirmLabel = 'Yes, clear it', onConfirm, className = 'btn btn--quiet' }) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <button type="button" className={className} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }
  return (
    <span className="confirm" role="group" aria-label={label}>
      <span className="confirm__text">{warning}</span>
      <button type="button" className="btn btn--danger" onClick={onConfirm} autoFocus>
        {confirmLabel}
      </button>
      <button type="button" className="btn btn--quiet" onClick={() => setAsking(false)}>
        Keep my answers
      </button>
    </span>
  );
}
