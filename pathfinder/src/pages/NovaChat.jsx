import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Nova from '../components/nova/Nova.jsx';
import demo from '../data/novaDemo.json';
import { answerFor, careerQuestion } from '../engine/novaDemo.js';
import { useProfile } from '../state/ProfileContext.jsx';
import useTitle from '../hooks/useTitle.js';

const SOURCE_LABEL = {
  preset: 'Demo · preset answer',
  career: 'Demo · built from the career page data, not AI',
  results: 'Demo · built from your saved results, not AI',
  fallback: 'Demo · no preset answer for this',
};

const greeting = () => ({ id: 'greeting', from: 'nova', text: demo.greeting, source: 'preset' });

/**
 * Nova chat in DEMO mode. There is no language model: answers are chosen from a
 * fixed list (see engine/novaDemo.js) and every Nova message says so.
 */
export default function NovaChat() {
  useTitle('Ask Nova (demo)');
  const p = useProfile();
  const [params] = useSearchParams();
  const [messages, setMessages] = useState(() => [greeting()]);
  const [draft, setDraft] = useState('');
  const [mood, setMood] = useState('happy');
  const counter = useRef(0);
  const endRef = useRef(null);
  const asked = useRef(false);

  const ask = (text) => {
    const clean = text.trim();
    if (!clean) return;
    const reply = answerFor(clean, { demo, careers: p.careers, result: p.result });
    counter.current += 1;
    const n = counter.current;
    setMessages((m) => [...m, { id: `u${n}`, from: 'you', text: clean }, { id: `n${n}`, from: 'nova', ...reply }]);
    setMood(reply.source === 'fallback' ? 'thinking' : 'happy');
    setDraft('');
  };

  // /nova?career=<id> (from a career page) opens with a question about that career.
  const careerId = params.get('career');
  useEffect(() => {
    if (asked.current || !careerId) return;
    const career = p.careers.find((c) => c.id === careerId);
    if (career) {
      asked.current = true;
      ask(careerQuestion(career));
    }
  }, [careerId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    endRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [messages]);

  const suggestions = demo.suggested.map((id) => demo.prompts.find((x) => x.id === id)).filter(Boolean);

  return (
    <div className="page chat">
      <header className="chat__head">
        <Nova size={96} mood={mood} />
        <div>
          <h1>Ask Nova <span className="tag tag--demo">Demo</span></h1>
          <p className="lede">Preset answers only. Nova is <strong>not live AI</strong> here.</p>
        </div>
      </header>

      <p className="demo-banner" role="note">
        <span className="tag tag--demo">Demo mode</span> This chat picks from answers written in advance. It
        doesn&rsquo;t understand free text beyond matching keywords, can&rsquo;t look anything up, and will say so when it has no
        answer. A few replies are filled in from your own results or the career pages, and are labelled that way.
      </p>

      <div className="chat__log" role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation with Nova">
        <ul className="chat__msgs">
        {messages.map((m) => (
          <li key={m.id} className={`msg msg--${m.from}`}>
            <p className="msg__who">{m.from === 'you' ? 'You' : 'Nova (demo)'}</p>
            <p className="msg__text">{m.text}</p>
            {m.from === 'nova' && <p className="msg__source">{SOURCE_LABEL[m.source] ?? SOURCE_LABEL.preset}</p>}
            {m.link && <p className="msg__link"><Link to={m.link.to}>{m.link.label}</Link></p>}
          </li>
        ))}
        </ul>
        <div ref={endRef} aria-hidden="true" className="chat__end" />
      </div>

      <section aria-labelledby="sugg-title" className="chat__sugg">
        <h2 id="sugg-title" className="chat__sugg-title">Try asking</h2>
        <ul>
          {suggestions.map((s) => (
            <li key={s.id}>
              <button type="button" className="prompt" onClick={() => ask(s.question)}>{s.question}</button>
            </li>
          ))}
        </ul>
      </section>

      <form
        className="chat__form"
        onSubmit={(e) => {
          e.preventDefault();
          ask(draft);
        }}
      >
        <label htmlFor="chat-input" className="field-label">Ask Nova (demo)</label>
        <div className="chat__row">
          <input
            id="chat-input"
            className="field"
            type="text"
            value={draft}
            maxLength={200}
            placeholder='e.g. "Tell me about Data Analyst"'
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="btn" disabled={!draft.trim()}>Send</button>
        </div>
      </form>

      <p>
        <button type="button" className="linkbtn" onClick={() => { setMessages([greeting()]); setMood('happy'); }}>
          Clear conversation
        </button>
      </p>
    </div>
  );
}
