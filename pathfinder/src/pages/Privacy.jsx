import { useState } from 'react';
import useTitle from '../hooks/useTitle.js';
import { clearAll } from '../state/storage.js';

export default function Privacy() {
  useTitle('Privacy & your data');
  const [cleared, setCleared] = useState(false);

  return (
    <article className="page page--narrow prose" aria-labelledby="privacy-title">
      <h1 id="privacy-title">Privacy &amp; your data</h1>
      <p>
        PATHFINDER has no server or account system. Everything below stays in this browser, on this
        device, in local storage.
      </p>
      <h2>What is saved</h2>
      <ul>
        <li>Your quiz answers and how far through the quiz you are, so you can resume later.</li>
        <li>Any edits you make to your Career DNA profile.</li>
        <li>Careers you save.</li>
      </ul>
      <h2>What is not</h2>
      <p>
        Nothing is sent anywhere. No analytics, no cookies set by this app. If you clear your
        browser data, or use a private window, your progress goes with it.
      </p>
      <h2>Delete it now</h2>
      <p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            clearAll();
            setCleared(true);
          }}
        >
          Clear my saved data
        </button>
      </p>
      <p role="status" className="prose__status">
        {cleared ? 'Done. Your saved quiz answers, profile edits and saved careers were removed from this browser.' : ''}
      </p>
    </article>
  );
}
