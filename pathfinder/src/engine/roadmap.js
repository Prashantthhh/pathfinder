// A roadmap is the list of steps for one career in India. A career with hand-written stages
// (career.roadmap) uses them; every other career gets stages built from its own typical-route
// data (start streams, entrance exam, study length, governing body). Stages only point at exam
// and body ids from the India registry, so a link appears only if that name is verified.
// Progress is the set of stage ids the student ticked.

import { STREAM_LABELS } from '../data/streams.js';
import { lookup } from '../data/india.js';
import { STUDY_LABELS } from './feasibility.js';

const uniq = (arr) => [...new Set(arr)];

export function roadmapFor(career) {
  if (career.roadmap?.length) return career.roadmap;
  const stages = [];
  const streams = career.entry.streams.map((s) => STREAM_LABELS[s] ?? s);
  stages.push({ id: 'start', title: `Start from: ${streams.join(', ')}`, detail: career.entry.streams.includes('any') ? 'Any stream can begin this route.' : undefined });

  const exams = uniq((career.routes ?? []).map((r) => r.exam).filter(Boolean));
  if (exams.length) exams.forEach((e) => stages.push({ id: `exam-${e}`, title: 'Entrance exam', exam: e }));
  else stages.push({ id: 'admission', title: 'Find the admission route', detail: 'No single entrance exam is recorded for this career. Check with the official body or the institutions that teach it.' });

  stages.push({ id: 'study', title: 'Degree, diploma or training', detail: `Typical length: ${STUDY_LABELS[career.entry.studyYears]}.` });

  uniq((career.routes ?? []).map((r) => r.body).filter(Boolean)).forEach((b) => stages.push({ id: `body-${b}`, title: 'Governing or licensing body', detail: 'Check what, if anything, you must register for.', body: b }));

  stages.push({ id: 'work', title: `Start working: ${career.title}`, detail: 'Read the career page for typical work and skills.' });
  return stages;
}

/** A stage with its resource names resolved against the verified registry. */
export function resolveStage(stage) {
  return { ...stage, examRef: stage.exam ? lookup('exams', stage.exam) : null, bodyRef: stage.body ? lookup('bodies', stage.body) : null };
}

/** { done, total, next } for a career given the ticked stage ids. */
export function progress(career, doneIds = []) {
  const stages = roadmapFor(career);
  const done = new Set(doneIds);
  const ticked = stages.filter((s) => done.has(s.id));
  return { done: ticked.length, total: stages.length, next: stages.find((s) => !done.has(s.id)) ?? null };
}

/** { careerId: [stageId] } with unknown careers and stages dropped. */
export function sanitizeRoadmap(raw, careers) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const out = {};
  for (const c of careers) {
    const ids = raw[c.id];
    if (!Array.isArray(ids)) continue;
    const valid = new Set(roadmapFor(c).map((s) => s.id));
    const keep = uniq(ids.filter((id) => valid.has(id)));
    if (keep.length) out[c.id] = keep;
  }
  return out;
}
