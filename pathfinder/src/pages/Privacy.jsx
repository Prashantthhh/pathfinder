import { useState } from 'react';
import useTitle from '../hooks/useTitle.js';
import { clearAll } from '../state/storage.js';
import { useProfile } from '../state/ProfileContext.jsx';

export default function Privacy() {
  useTitle('Privacy & your data');
  const [cleared, setCleared] = useState(false);
  const profile = useProfile();

  return (
    <article className="page page--narrow prose" aria-labelledby="privacy-title">
      <h1 id="privacy-title">Privacy &amp; your data</h1>
      <p>
        PATHFINDER has no account system. Your progress is saved in this browser, on this device, in local
        storage. The one thing that can leave your device is a question you ask Nova when live AI is on (see below).
      </p>
      <h2>What is saved</h2>
      <ul>
        <li>Your quiz answers and how far through the quiz you are, so you can resume later.</li>
        <li>Any edits you make to your Career DNA profile.</li>
        <li>Careers you save, the skills you rate, your roadmap ticks, careers picked for comparison and your goal note.</li>
        <li>A count of how many live Nova questions you have asked today (so we can keep within a free limit).</li>
      </ul>
      <h2>Asking Nova</h2>
      <p>
        When live AI is on, a question you ask Nova is sent to a small function on this site, which passes it to an AI
        provider to write the answer. Along with your question and up to four recent messages, it sends only: your top matches
        (career and score), your Career DNA (six numbers), the career page you are on and your next roadmap step.
        <strong> It does not send your name, contact details, goal note, saved list, quiz answers or any account, because there is none.</strong>{' '}
        Please don&rsquo;t type personal details into the chat: what you type is sent too. Replies are labelled <em>AI-generated</em>.
        The site keeps no copy of your question, and to limit use it counts requests from your connection in memory only (the
        address itself is not stored). The AI provider has its own handling of requests; check its policy before relying on it.
        If live AI is off, nothing is sent: Nova answers from preset demo answers in your browser.
      </p>
      <h2>What is not sent</h2>
      <p>
        No analytics and no cookies set by this app. If you clear your browser data, or use a private window, your
        progress goes with it.
      </p>
      <h2>Delete it now</h2>
      <p>
        <button
          type="button"
          className="btn"
          onClick={() => {
            clearAll();
            profile.wipe(); // also reset what is held in memory
            setCleared(true);
          }}
        >
          Clear my saved data
        </button>
      </p>
      <p role="status" className="prose__status">
        {cleared ? 'Done. Your saved quiz answers, profile edits, saved careers and goal note were removed from this browser.' : ''}
      </p>
    </article>
  );
}
