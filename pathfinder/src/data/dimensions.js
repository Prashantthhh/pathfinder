// The six interest dimensions (Holland's RIASEC). These replace the earlier
// eight tech dimensions everywhere: quiz scoring, career profiles, charts and
// sliders. `color` is the deep tone for light pages; `bright` is for the night map.

import { TYPE_COLORS, TYPE_NICKNAMES } from './palette.js';

const BLURBS = {
  R: 'Hands-on work with tools, machines, plants, animals or the outdoors.',
  I: 'Working things out: research, analysis, science and maths.',
  A: 'Expressing ideas through design, writing, music or performance.',
  S: 'Teaching, caring, advising and helping people.',
  E: 'Leading, selling, persuading and taking business risks.',
  C: 'Order, accuracy and procedure: records, rules and systems.',
};

export const DIMENSIONS = Object.entries(TYPE_COLORS).map(([id, c]) => ({
  id,
  label: c.name,
  nickname: TYPE_NICKNAMES[id],
  color: c.light,
  bright: c.dark,
  blurb: BLURBS[id],
}));

export const DIMENSION_IDS = DIMENSIONS.map((d) => d.id);
export const DIMENSION_BY_ID = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d]));
