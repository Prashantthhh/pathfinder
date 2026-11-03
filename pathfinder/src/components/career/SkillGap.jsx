import { LEVELS, LEVEL_LABELS, skillGap } from '../../engine/skillGap.js';
import { useProfile } from '../../state/ProfileContext.jsx';

function Group({ title, rows, detail, career, setSkill }) {
  if (rows.length === 0) return null;
  return (
    <>
      <h3 className="career__sub">{title}</h3>
      <ul className="skillrate">
        {rows.map((r) => (
          <li key={r.key}>
            <fieldset className="seg">
              <legend>
                {r.name}
                {detail[r.name] != null && <span className="seg__edge"> +{detail[r.name].toFixed(1)} above the average career</span>}
              </legend>
              <div className="seg__opts">
                {LEVELS.map((l) => (
                  <label key={l} className={r.level === l ? 'seg__opt is-on' : 'seg__opt'}>
                    <input type="radio" name={`rate-${career.id}-${r.key}`} checked={r.level === l} onChange={() => setSkill(r.key, l)} />
                    <span>{LEVEL_LABELS[l]}</span>
                  </label>
                ))}
                {r.level && (
                  <button type="button" className="seg__clear" onClick={() => setSkill(r.key, null)} aria-label={`Clear my rating for ${r.name}`}>Clear</button>
                )}
              </div>
            </fieldset>
          </li>
        ))}
      </ul>
    </>
  );
}

/**
 * The O*NET skills and knowledge areas this career needs MORE than the average career does, each
 * rated by the student: not yet, learning or confident. Nothing is pre-filled or guessed from the quiz.
 */
export default function SkillGapSection({ career }) {
  const { skills, setSkill } = useProfile();
  const gap = skillGap(career, skills);
  const work = gap.gaps.filter((g) => g.level !== null);
  const edgeOf = (list) => Object.fromEntries((list ?? []).map((d) => [d.name, d.edge]));

  return (
    <section className="career__skills" id="skills" aria-labelledby="skills-gap-title">
      <h2 id="skills-gap-title">Your skills and knowledge for this career</h2>
      <p className="section__intro">
        These are the skills and knowledge areas this career needs <em>more than the average career does</em> (from O*NET).
        Rate where <em>you</em> are today. We never guess from your interest answers, and the ratings stay on this device.
      </p>
      <Group title="Skills" rows={gap.rows.filter((r) => r.kind === 'skill')} detail={edgeOf(career.skillDetail)} career={career} setSkill={setSkill} />
      {career.skills.length === 0 && <p className="fine">No single skill stands out above the average career here.</p>}
      <Group title="Knowledge areas" rows={gap.rows.filter((r) => r.kind === 'knowledge')} detail={edgeOf(career.knowledgeDetail)} career={career} setSkill={setSkill} />
      <div className="skillsum" data-testid="skill-summary" role="status" aria-live="polite">
        <p>
          <strong>{gap.confident} of {gap.total}</strong> confident
          {gap.learning > 0 && <> · {gap.learning} learning</>}
          {gap.none > 0 && <> · {gap.none} not yet</>}
          {gap.unrated > 0 && <> · {gap.unrated} not rated</>}
        </p>
        {gap.unrated === gap.total ? (
          <p className="fine">Rate an item above to see where your gaps are.</p>
        ) : work.length === 0 && gap.unrated === 0 ? (
          <p className="fine">You rated yourself confident in all {gap.total}.</p>
        ) : (
          <p className="fine">
            {work.length > 0 ? `To work on: ${work.map((g) => `${g.name}${g.level === 'learning' ? ' (learning)' : ''}`).join(', ')}.` : 'Rate the rest to see where your gaps are.'}
          </p>
        )}
      </div>
    </section>
  );
}
