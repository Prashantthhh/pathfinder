// The one next step the dashboard suggests. Built only from what the student has done in the
// app (quiz, saved careers, roadmap ticks, skill ratings): no stats, no scores of progress.

import { progress } from './roadmap.js';
import { skillGap } from './skillGap.js';

/**
 * @param s { status, answered, insufficient, saved: ids, careers, roadmap, ratings, topMatch }
 * @returns { kind, title, text, to, label }
 */
export function nextStep({ status, answered, insufficient, saved, careers, roadmap = {}, ratings = {}, topMatch = null }) {
  if (!answered) return { kind: 'quiz', title: 'Take the quiz', text: 'It takes a few minutes and places you on the career map.', to: '/quiz', label: 'Find your place' };
  if (status !== 'complete') return { kind: 'quiz', title: 'Finish the quiz', text: 'Your matches get sharper with every answer.', to: '/quiz', label: 'Continue the quiz' };
  if (insufficient) return { kind: 'quiz', title: 'Answer a few more questions', text: 'Your answers so far do not say enough about your interests to match careers.', to: '/quiz', label: 'Review my answers' };

  const savedCareers = saved.map((id) => careers.find((c) => c.id === id)).filter(Boolean);
  if (!savedCareers.length) {
    return {
      kind: 'save',
      title: 'Save a career to follow',
      text: topMatch ? `Open ${topMatch.title}, or any career that caught your eye, and press Save. Saved careers get a roadmap here.` : 'Press Save on any career that caught your eye. Saved careers get a roadmap here.',
      to: topMatch ? `/careers/${topMatch.id}` : '/results',
      label: topMatch ? `Open ${topMatch.title}` : 'See my matches',
    };
  }

  const withProgress = savedCareers.map((c) => ({ c, p: progress(c, roadmap[c.id]) }));
  const focus = withProgress.find((x) => x.p.done > 0 && x.p.next) ?? withProgress.find((x) => x.p.next) ?? withProgress[0];
  if (focus.p.next) {
    return {
      kind: 'roadmap',
      title: `Next on your ${focus.c.title} roadmap`,
      text: focus.p.next.title + (focus.p.next.detail ? `. ${focus.p.next.detail}` : ''),
      to: `/careers/${focus.c.id}#roadmap`,
      label: 'Open the roadmap',
    };
  }
  const gap = skillGap(focus.c, ratings);
  if (gap.unrated > 0) {
    return { kind: 'skills', title: `Rate your skills for ${focus.c.title}`, text: `${gap.unrated} of the ${gap.total} skills and knowledge areas it needs are not rated yet. Only you can say where you are.`, to: `/careers/${focus.c.id}#skills`, label: 'Rate my skills' };
  }
  return { kind: 'explore', title: 'Look at another career', text: `You have ticked every stage on the ${focus.c.title} roadmap. Compare it with another career, or explore more.`, to: '/explore', label: 'Explore careers' };
}
