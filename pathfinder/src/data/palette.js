// The visual system's colours in one place (injected into CSS in main.jsx).
//
// Each RIASEC type has a trail-blaze colour in two tones:
//   dark  - bright, for use on the night map (SURFACES.night)
//   light - deeper, for use on the light reading pages (SURFACES.paper)
// Neither is white or black. Both tones must reach 4.5:1 on their surface so
// they are safe for text as well as markers; this is enforced in
// src/engine/palette.test.js. Colour is never the only cue: every use is paired
// with the letter and name of the type.

export const SURFACES = {
  paper: '#F7F4EC',
  paperHi: '#FFFDF8',
  night: '#0A1D30',
  night2: '#0F2A44',
  signal: '#FFC93C',
  ink: '#10243A',
};

export const TYPE_COLORS = {
  R: { name: 'Realistic', dark: '#FF8A3D', light: '#B94A07' },
  I: { name: 'Investigative', dark: '#4DB8FF', light: '#0B66B8' },
  A: { name: 'Artistic', dark: '#FF6FB5', light: '#B01E6F' },
  S: { name: 'Social', dark: '#5EDB8E', light: '#17703C' },
  E: { name: 'Enterprising', dark: '#FFD23F', light: '#8A6500' },
  C: { name: 'Conventional', dark: '#B79CFF', light: '#5B3FC0' },
};

/** Plain-language nicknames used across the site. */
export const TYPE_NICKNAMES = {
  R: 'Doers', I: 'Thinkers', A: 'Creators', S: 'Helpers', E: 'Persuaders', C: 'Organisers',
};
