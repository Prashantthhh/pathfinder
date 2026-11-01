// The 8 dimensions every career and every student profile is measured on.
// Order matters: vectors are compared in this order.
//
// `color` is a trail-blaze colour. None are white or black, and each must reach
// 3:1 contrast against MAP_BG (WCAG 1.4.11 for graphical objects) – this is
// enforced in src/engine/engine.test.js. Colour is never the only cue: every
// use is paired with the label.

export const MAP_BG = '#F1E9D6';

export const DIMENSIONS = [
  { id: 'build',    label: 'Build',    color: '#A16207', blaze: 'gold',    blurb: 'Writing code and shipping things that work.' },
  { id: 'data',     label: 'Data',     color: '#1D63C4', blaze: 'blue',    blurb: 'Finding patterns and answers in numbers.' },
  { id: 'ai',       label: 'AI',       color: '#6D3FD0', blaze: 'violet',  blurb: 'Teaching machines to learn, predict and generate.' },
  { id: 'design',   label: 'Design',   color: '#B8266F', blaze: 'magenta', blurb: 'Shaping how products look, feel and flow.' },
  { id: 'security', label: 'Security', color: '#C62828', blaze: 'red',     blurb: 'Protecting systems and thinking like an attacker.' },
  { id: 'systems',  label: 'Systems',  color: '#0E7490', blaze: 'teal',    blurb: 'Infrastructure, networks and keeping things running.' },
  { id: 'people',   label: 'People',   color: '#2E7D32', blaze: 'green',   blurb: 'Communicating, coordinating and leading.' },
  { id: 'play',     label: 'Play',     color: '#D9480F', blaze: 'orange',  blurb: 'Games, experiments and creative tinkering.' },
];

export const DIMENSION_IDS = DIMENSIONS.map((d) => d.id);
export const DIMENSION_BY_ID = Object.fromEntries(DIMENSIONS.map((d) => [d.id, d]));
