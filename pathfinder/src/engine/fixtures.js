// Hand-written sample students used by tests and `npm run samples`.
// Answers are { questionId: [optionId, ...] }. Each picks interest answers a real
// student of that kind plausibly would; they are not tuned to any career.

const acts = (picks) => Object.fromEntries(picks.map((p, i) => [`q-act-${i + 1}`, p.map((t) => `a${i + 1}-${t}`)]));

export const PERSONAS = [
  {
    id: 'science-pcb',
    name: 'Science (PCB) student',
    stream: 'Science (PCB), Class 12',
    answers: {
      'q-stream': ['pcb'],
      ...acts([['I', 'S'], ['I', 'S'], ['S', 'I'], ['S', 'I'], ['I', 'S'], ['S', 'I'], ['S', 'R'], ['S', 'I']]),
      'q-subjects': ['biology', 'chemistry', 'psychology'],
      'q-set-people': ['small'], 'q-set-pace': ['some'], 'q-set-structure': ['mix'], 'q-set-hands': ['mixed'],
      'q-study': ['yes'], 'q-earn': ['no'],
    },
  },
  {
    id: 'commerce',
    name: 'Commerce student',
    stream: 'Commerce, Class 12',
    answers: {
      'q-stream': ['commerce'],
      ...acts([['E', 'C'], ['E', 'C'], ['E', 'C'], ['C', 'E'], ['E', 'C'], ['E', 'C'], ['E', 'C'], ['E', 'C']]),
      'q-subjects': ['business', 'maths'],
      'q-set-people': ['crowd'], 'q-set-pace': ['fast'], 'q-set-structure': ['mix'], 'q-set-hands': ['desk'],
      'q-study': ['unsure'], 'q-earn': ['yes'],
    },
  },
  {
    id: 'arts',
    name: 'Arts / Humanities student',
    stream: 'Arts, Class 12',
    answers: {
      'q-stream': ['arts'],
      ...acts([['A', 'S'], ['A', 'S'], ['A', 'S'], ['A', 'S'], ['A', 'S'], ['A', 'S'], ['A', 'E'], ['A', 'S']]),
      'q-subjects': ['languages', 'arts', 'humanities'],
      'q-set-people': ['small'], 'q-set-pace': ['some'], 'q-set-structure': ['free'], 'q-set-hands': ['desk'],
      'q-study': ['yes'], 'q-earn': ['no'],
    },
  },
  {
    id: 'cse-graduate',
    name: 'CSE graduate',
    stream: 'Graduate in engineering (CSE)',
    answers: {
      'q-stream': ['graduate'],
      'q-field': ['eng'],
      ...acts([['I', 'C'], ['I', 'C'], ['I', 'C'], ['I', 'C'], ['I', 'R'], ['I', 'C'], ['I', 'C'], ['I', 'C']]),
      'q-subjects': ['maths', 'cs', 'physics'],
      'q-set-people': ['small'], 'q-set-pace': ['some'], 'q-set-structure': ['mix'], 'q-set-hands': ['desk'],
      'q-study': ['no'], 'q-earn': ['yes'],
    },
  },
  {
    id: 'iti-hands-on',
    name: 'ITI student (hands-on)',
    stream: 'Diploma / ITI',
    answers: {
      'q-stream': ['diploma'],
      ...acts([['R', 'C'], ['R'], ['R', 'C'], ['R'], ['R', 'I'], ['R', 'C'], ['R'], ['R', 'C']]),
      'q-subjects': ['physics', 'pe'],
      'q-set-people': ['small'], 'q-set-pace': ['some'], 'q-set-structure': ['clear'], 'q-set-hands': ['hands'],
      'q-study': ['no'], 'q-earn': ['yes'],
    },
  },
];
