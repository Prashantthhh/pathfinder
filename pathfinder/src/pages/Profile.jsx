import { Link, useNavigate } from 'react-router-dom';
import YourPlace from '../components/map/YourPlace.jsx';
import RadarChart from '../components/profile/RadarChart.jsx';
import DnaSliders from '../components/profile/DnaSliders.jsx';
import Nova from '../components/nova/Nova.jsx';
import ConfirmAction from '../components/common/ConfirmAction.jsx';
import SignLink from '../components/common/SignLink.jsx';
import { DIMENSIONS } from '../data/dimensions.js';
import { SETTINGS } from '../data/settings.js';
import { STREAM_LABELS } from '../data/streams.js';
import { levelOf } from '../engine/dna.js';
import { GOAL_MAX } from '../state/appState.js';
import { useProfile } from '../state/ProfileContext.jsx';
import useTitle from '../hooks/useTitle.js';

export default function Profile() {
  useTitle('My Career DNA', 'Your six interest levels (Holland RIASEC), adjustable with sliders, and where they place you on the career map.');
  const p = useProfile();
  const navigate = useNavigate();
  const { quiz, careers, result } = p;

  const values = p.dna ?? p.profile.display;
  const hasAnswers = p.answered > 0;
  const savedCareers = p.saved.map((id) => careers.find((c) => c.id === id)).filter(Boolean);
  const radarDescription = `Radar chart of six interest types. ${DIMENSIONS.map((d) => `${d.label}: ${levelOf(values[d.id])}`).join(', ')}.`;

  const answeredList = p.questions
    .filter((q) => p.answers[q.id]?.length)
    .map((q) => ({
      q,
      section: quiz.sections.find((s) => s.id === q.section).label,
      labels: p.answers[q.id].map((id) => q.options.find((o) => o.id === id)?.label).filter(Boolean),
    }));

  return (
    <div className="page profile">
      <header className="profile__head">
        <p className="eyebrow">Career DNA</p>
        <h1>Your Career DNA</h1>
        <p className="lede">
          The shape of your interests across six types (Holland&rsquo;s RIASEC). This is the profile your
          matches are compared against, and you can change it as you learn about yourself.
        </p>
      </header>

      {!hasAnswers && !p.edited && (
        <div className="banner" role="status">
          <Nova size={56} mood="curious" className="banner__nova" />
          <span>
            You haven&rsquo;t taken the quiz yet, so there is nothing here. Take the quiz to fill this in, or
            move the sliders to describe yourself by hand.{' '}
            <Link to="/quiz">Take the quiz</Link>
          </span>
        </div>
      )}

      <div className="profile__grid">
        <RadarChart values={values} title="Your Career DNA" description={radarDescription} className="profile__chart" />

        <section aria-labelledby="adjust-title" className="profile__edit">
          <h2 id="adjust-title">Adjust your profile</h2>
          <p className="fine">
            Each slider shows how much an interest type stands out for you compared with your others. It is
            not a mark or a measure of skill. Your matches update as you move them.
          </p>
          <DnaSliders values={values} onChange={p.setDna} />
          <p className="profile__status" role="status">
            {p.edited ? (
              <>
                <span className="tag">Edited by you</span>{' '}
                {hasAnswers ? 'Changing a quiz answer later will reset these edits.' : 'Built by hand, with no quiz answers behind it.'}
              </>
            ) : hasAnswers ? (
              'Showing what your quiz answers say.'
            ) : (
              ''
            )}
          </p>
          {p.edited && (
            <button type="button" className="btn btn--quiet" onClick={p.resetDna}>
              {hasAnswers ? 'Reset to my quiz result' : 'Clear my edits'}
            </button>
          )}
        </section>
      </div>

      <section className="profile__section" aria-labelledby="place-title">
        <h2 id="place-title">Where this puts you on the map</h2>
        <p className="section__intro">The pin moves as you change the sliders.</p>
        <YourPlace />
      </section>

      <section className="profile__section" aria-labelledby="points-title">
        <h2 id="points-title">What this profile points to right now</h2>
        {result.insufficient || result.matches.length === 0 ? (
          <p>No career reaches a 50% match score yet. Move a slider or take the quiz to see matches.</p>
        ) : (
          <ol className="profile__top">
            {result.matches.slice(0, 3).map((m) => (
              <li key={m.career.id}>
                <Link to={`/careers/${m.career.id}`}>{m.career.title}</Link>
                <span className="fine"> {m.percent}% match score</span>
              </li>
            ))}
          </ol>
        )}
        <p><Link to="/results">See full results and the reasons</Link></p>
      </section>

      {(p.profile.context.stream || Object.keys(p.profile.settings).length > 0) && (
        <section className="profile__section" aria-labelledby="where-title">
          <h2 id="where-title">Where you are and how you like to work</h2>
          <p className="fine">
            These come from your quiz answers. Stream and study answers only decide how matches are grouped; work
            settings add a smaller part of the score. Change them by reviewing your answers.
          </p>
          <ul className="profile__facts">
            {p.profile.context.stream && <li><strong>Stream:</strong> {STREAM_LABELS[p.profile.context.stream] ?? p.profile.context.stream}</li>}
            {p.profile.context.study && <li><strong>Open to 5+ years of study:</strong> {{ yes: 'yes', no: 'no', unsure: 'not sure' }[p.profile.context.study]}</li>}
            {p.profile.context.earn && <li><strong>Need to earn soon:</strong> {{ yes: 'yes', no: 'no', unsure: 'not sure' }[p.profile.context.earn]}</li>}
            {SETTINGS.filter((st) => typeof p.profile.settings[st.id] === 'number').map((st) => {
              const v = p.profile.settings[st.id];
              return <li key={st.id}><strong>{st.label}:</strong> {v < 0.34 ? st.low : v > 0.66 ? st.high : 'somewhere in between'}</li>;
            })}
          </ul>
        </section>
      )}

      <section className="profile__section" aria-labelledby="goal-title">
        <h2 id="goal-title">Your career goal</h2>
        <label htmlFor="goal" className="fine">
          Optional. A line or two about where you would like to get to. It stays on this device.
        </label>
        <textarea
          id="goal"
          className="field"
          rows={3}
          maxLength={GOAL_MAX}
          value={p.goal}
          onChange={(e) => p.setGoal(e.target.value)}
          aria-describedby="goal-count"
        />
        <p id="goal-count" className="fine">{p.goal.length} / {GOAL_MAX}</p>
      </section>

      <section className="profile__section" aria-labelledby="saved-title">
        <h2 id="saved-title">Saved careers</h2>
        {savedCareers.length === 0 ? (
          <p>
            Nothing saved yet. Use <strong>Save</strong> on any career in <Link to="/explore">Explore</Link> and it will appear here.
          </p>
        ) : (
          <ul className="profile__saved">
            {savedCareers.map((c) => (
              <li key={c.id}>
                <Link to={`/careers/${c.id}`}>{c.title}</Link>
                <button type="button" className="linkbtn" onClick={() => p.toggleSaved(c.id)} aria-label={`Remove ${c.title} from saved`}>
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {answeredList.length > 0 && (
        <details className="profile__answers">
          <summary>Your quiz answers ({answeredList.length} of {p.total})</summary>
          <dl>
            {answeredList.map(({ q, section, labels }) => (
              <div key={q.id}>
                <dt><span className="why__section">{section}</span> {q.prompt}</dt>
                <dd>{labels.join('; ')}</dd>
              </div>
            ))}
          </dl>
        </details>
      )}

      <div className="results__actions">
        <SignLink to="/results">See my matches</SignLink>
        {hasAnswers && (
          <button
            type="button"
            className="btn btn--quiet"
            onClick={() => {
              p.reopen(0);
              navigate('/quiz', { state: { review: true } });
            }}
          >
            Review my answers
          </button>
        )}
        <ConfirmAction
          label="Retake the quiz"
          warning="This clears your answers and any Career DNA edits. Saved careers and your goal stay."
          confirmLabel="Yes, retake"
          onConfirm={() => {
            p.restart();
            navigate('/quiz', { state: { review: true } });
          }}
        />
      </div>
    </div>
  );
}
