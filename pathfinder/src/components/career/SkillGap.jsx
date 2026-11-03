import { LEVELS, LEVEL_LABELS, skillGap } from '../../engine/skillGap.js';
import { useProfile } from '../../state/ProfileContext.jsx';

/**
 * The skills O*NET rates most important for this career, each rated by the student: not yet,
 * learning or confident. Nothing is pre-filled or guessed from the quiz.
 */
export default function SkillGapSection({ career }) {
  const { skills, setSkill } = useProfile();
  const gap = skillGap(career, skills);
  const work = gap.gaps.filter((g) => g.level !== null);

  return (
    <section className="career__skills" id="skills" aria-labelledby="skills-gap-title">
      <h2 id="skills-gap-title">Your skills for this career</h2>
      <p className="section__intro">
        These are the skills O*NET rates most important for this career. Rate where <em>you</em> are today.
        We never guess a skill from your interest answers, and the ratings stay on this device.
      </p>
      <ul className="skillrate">
        {gap.rows.map((r) => (
          <li key={r.skill}>
            <fieldset className="seg">
              <legend>{r.skill}</legend>
              <div className="seg__opts">
                {LEVELS.map((l) => (
                  <label key={l} className={r.level === l ? 'seg__opt is-on' : 'seg__opt'}>
                    <input type="radio" name={`skill-${career.id}-${r.skill}`} checked={r.level === l} onChange={() => setSkill(r.skill, l)} />
                    <span>{LEVEL_LABELS[l]}</span>
                  </label>
                ))}
                {r.level && (
                  <button type="button" className="seg__clear" onClick={() => setSkill(r.skill, null)} aria-label={`Clear my rating for ${r.skill}`}>Clear</button>
                )}
              </div>
            </fieldset>
          </li>
        ))}
      </ul>
      <div className="skillsum" data-testid="skill-summary" role="status" aria-live="polite">
        <p>
          <strong>{gap.confident} of {gap.total}</strong> confident
          {gap.learning > 0 && <> · {gap.learning} learning</>}
          {gap.none > 0 && <> · {gap.none} not yet</>}
          {gap.unrated > 0 && <> · {gap.unrated} not rated</>}
        </p>
        {gap.unrated === gap.total ? (
          <p className="fine">Rate a skill above to see where your gaps are.</p>
        ) : work.length === 0 && gap.unrated === 0 ? (
          <p className="fine">You rated yourself confident in all {gap.total}.</p>
        ) : (
          <p className="fine">
            {work.length > 0 ? `To work on: ${work.map((g) => `${g.skill}${g.level === 'learning' ? ' (learning)' : ''}`).join(', ')}.` : 'Rate the rest to see where your gaps are.'}
          </p>
        )}
      </div>
    </section>
  );
}
