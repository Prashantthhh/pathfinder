import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Nova from '../components/nova/Nova.jsx';
import demo from '../data/novaDemo.json';
import { answerFor, careerQuestion } from '../engine/novaDemo.js';
import { FALLBACK_NOTE, askLive, buildNovaContext } from '../engine/novaLive.js';
import { useProfile } from '../state/ProfileContext.jsx';
import useTitle from '../hooks/useTitle.js';

const SOURCE_LABEL = {
  ai: 'AI-generated · it can be wrong. Check with the official body for anything time-sensitive.',
  preset: 'Demo · preset answer',
  career: 'Demo · built from the career page data, not AI',
  results: 'Demo · built from your saved results, not AI',
  fallback: 'Demo · no preset answer for this',
};

const greeting = () => ({ id: 'greeting', from: 'nova', text: demo.greeting, source: 'preset' });

/**
 * Nova chat. It tries live AI first (POST /api/nova, a serverless function that holds the key) and labels
 * those replies "AI-generated". If there is no key, the call fails, or a limit is hit, it answers from the
 * preset demo answers (see engine/novaDemo.js) and says so. Every Nova message carries its source.
 */
export default function NovaChat() {
  useTitle('Ask Nova');
  const p = useProfile();
  const [params] = useSearchParams();
  const [messages, setMessages] = useState(() => [greeting()]);
  const [draft, setDraft] = useState('');
  const [mood, setMood] = useState('happy');
  const [live, setLive] = useState('unknown'); // 'unknown' | 'live' | 'demo'
  const [busy, setBusy] = useState(false);
  const pausedUntil = useRef(0);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const counter = useRef(0);
  const endRef = useRef(null);
  const asked = useRef(false);

  const careerForContext = () => {
    const id = params.get('career');
    return id ? p.careers.find((c) => c.id === id) ?? null : null;
  };

  const ask = async (text) => {
    const clean = text.trim();
    if (!clean || busy) return;
    counter.current += 1;
    const n = counter.current;
    const history = messagesRef.current
      .filter((m) => m.id !== 'greeting' && !m.pending && m.text)
      .map((m) => ({ role: m.from === 'you' ? 'user' : 'nova', text: m.text }));
    setMessages((m) => [...m, { id: `u${n}`, from: 'you', text: clean }]);
    setDraft('');

    const demoReply = (note) => {
      const reply = answerFor(clean, { demo, careers: p.careers, result: p.result });
      setMessages((m) => [...m, { id: `n${n}`, from: 'nova', ...reply, note }]);
      setMood(reply.source === 'fallback' ? 'thinking' : 'happy');
    };

    if (live === 'demo' || Date.now() < pausedUntil.current) {
      demoReply(live === 'demo' ? null : FALLBACK_NOTE.rate_limited);
      return;
    }
    setBusy(true);
    setMood('thinking');
    const career = careerForContext();
    const out = await askLive({
      question: clean,
      history,
      context: buildNovaContext({ result: p.result, profile: p.profile, career, ticked: career ? p.roadmap[career.id] ?? [] : [] }),
    });
    setBusy(false);
    if (out.ok) {
      setLive('live');
      setMessages((m) => [...m, { id: `n${n}`, from: 'nova', source: 'ai', text: out.text }]);
      setMood('happy');
      return;
    }
    if (out.reason === 'not_configured') setLive('demo');
    if (out.reason === 'rate_limited') pausedUntil.current = Date.now() + (out.retryAfter ?? 60) * 1000;
    demoReply(out.reason === 'not_configured' ? null : FALLBACK_NOTE[out.reason] ?? FALLBACK_NOTE.upstream);
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
          <h1>Ask Nova {live === 'live' ? <span className="tag tag--ai">AI</span> : live === 'demo' ? <span className="tag tag--demo">Demo</span> : null}</h1>
          <p className="lede">
            {live === 'demo'
              ? <>Live AI isn&rsquo;t switched on here, so Nova answers from <strong>preset demo answers</strong>.</>
              : <>Nova answers with AI when it can, and from preset demo answers when it can&rsquo;t.</>}
          </p>
        </div>
      </header>

      <p className="demo-banner" role="note" data-testid="nova-banner">
        <span className="tag tag--demo">How replies are labelled</span>{' '}
        <strong>AI-generated</strong> replies come from a language model that is given only your top matches, your Career DNA, the
        career you are looking at and your next roadmap step (no name or contact details). It can be wrong, and it is told to say
        &ldquo;check with the official body&rdquo; for anything that changes. <strong>Demo</strong> replies are chosen from answers
        written in advance and are used when live AI is off, busy or out of its free limit.
      </p>

      <div className="chat__log" tabIndex={0} role="log" aria-live="polite" aria-relevant="additions" aria-label="Conversation with Nova">
        <ul className="chat__msgs">
        {messages.map((m) => (
          <li key={m.id} className={`msg msg--${m.from}`}>
            <p className="msg__who">{m.from === 'you' ? 'You' : m.source === 'ai' ? 'Nova (AI-generated)' : 'Nova (demo)'}</p>
            <p className="msg__text">{m.text}</p>
            {m.from === 'nova' && <p className="msg__source" data-source={m.source}>{SOURCE_LABEL[m.source] ?? SOURCE_LABEL.preset}</p>}
            {m.note && <p className="msg__note">{m.note}</p>}
            {m.link && <p className="msg__link"><Link to={m.link.to}>{m.link.label}</Link></p>}
          </li>
        ))}
        {busy && <li className="msg msg--nova" data-testid="nova-thinking"><p className="msg__who">Nova</p><p className="msg__text">Thinking…</p></li>}
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
        <label htmlFor="chat-input" className="field-label">Ask Nova</label>
        <div className="chat__row">
          <input
            id="chat-input"
            className="field"
            type="text"
            value={draft}
            maxLength={300}
            placeholder='e.g. "Tell me about Data Analyst"'
            onChange={(e) => setDraft(e.target.value)}
            autoComplete="off"
          />
          <button type="submit" className="btn" disabled={!draft.trim() || busy}>Send</button>
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
