// Career areas are the "destinations" on the trail map.
// (x, y) are percentages on the map canvas; `dims` are the dimensions whose
// trails lead to the area (used to draw the paths in the UI).

export const AREAS = [
  { id: 'software', label: 'Software Craft',   blurb: 'Web, mobile and server software, plus the people who test it.', x: 24, y: 62, dims: ['build', 'design'] },
  { id: 'data',     label: 'Data Basin',       blurb: 'Turning raw data into decisions and pipelines.',                x: 50, y: 74, dims: ['data'] },
  { id: 'ai',       label: 'AI Summit',        blurb: 'Machine learning and LLM-powered products.',                    x: 70, y: 22, dims: ['ai', 'data'] },
  { id: 'security', label: 'Security Ridge',   blurb: 'Defending systems and testing them from the outside.',          x: 84, y: 52, dims: ['security'] },
  { id: 'cloud',    label: 'Cloud & Networks', blurb: 'Infrastructure, delivery and connectivity.',                    x: 46, y: 36, dims: ['systems'] },
  { id: 'design',   label: 'Design & Product', blurb: 'Deciding what to build and how it should feel.',                x: 14, y: 28, dims: ['design', 'people'] },
  { id: 'games',    label: 'Game Grounds',     blurb: 'Interactive worlds and real-time graphics.',                    x: 30, y: 12, dims: ['play', 'build'] },
];

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a]));
