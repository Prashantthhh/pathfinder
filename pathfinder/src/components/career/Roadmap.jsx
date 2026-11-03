import { CHECK_TEXT } from '../../data/india.js';
import { STUDY_LABELS } from '../../engine/feasibility.js';
import { progress, resolveStage, roadmapFor } from '../../engine/roadmap.js';
import { useProfile } from '../../state/ProfileContext.jsx';
import Named from '../common/Named.jsx';

/**
 * The steps for this career in India, tick-able. Stages come from the career's own typical-route
 * data (or are hand-written for well-known routes). Only verified exam and body names are linked.
 */
export default function Roadmap({ career }) {
  const { roadmap, toggleStage } = useProfile();
  const done = roadmap[career.id] ?? [];
  const stages = roadmapFor(career).map(resolveStage);
  const p = progress(career, done);

  return (
    <section className="career__roadmap" id="roadmap" aria-labelledby="roadmap-title">
      <h2 id="roadmap-title">Your roadmap</h2>
      <p className="section__intro">
        <strong>Typical route, verify with the official body.</strong> These steps are our general reading of how people
        enter this career in India (typically {STUDY_LABELS[career.entry.studyYears]} of study). Tick a step when you have
        done it. Your ticks stay on this device.
      </p>
      <p className="roadmap__progress" data-testid="roadmap-progress" role="status" aria-live="polite">
        {p.done} of {p.total} stages ticked
        <span className="roadmap__bar" aria-hidden="true"><span style={{ width: `${(p.done / p.total) * 100}%` }} /></span>
      </p>
      <ol className="roadmap">
        {stages.map((s, i) => {
          const on = done.includes(s.id);
          return (
            <li key={s.id} className={on ? 'roadmap__stage is-done' : 'roadmap__stage'}>
              <label className="roadmap__label">
                <input type="checkbox" checked={on} onChange={() => toggleStage(career.id, s.id)} />
                <span className="roadmap__n" aria-hidden="true">{i + 1}</span>
                <span className="roadmap__title">{s.title}</span>
              </label>
              {s.detail && <p className="roadmap__detail">{s.detail}</p>}
              {(s.exam || s.body) && (
                <p className="roadmap__res">
                  {s.exam && <span><span className="route__k">Exam:</span> <Named item={s.examRef} /></span>}
                  {s.exam && s.body && ' · '}
                  {s.body && <span><span className="route__k">Body:</span> <Named item={s.bodyRef} /></span>}
                </p>
              )}
            </li>
          );
        })}
      </ol>
      <p className="fine">
        Links go only to official sites whose names we checked. Where we could not check, we say &ldquo;{CHECK_TEXT}&rdquo;.
      </p>
    </section>
  );
}
