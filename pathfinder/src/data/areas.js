// Career areas are the "destinations" on the trail map.
//
// (x, y) are percentages on the map canvas. The array order is the order the
// trail visits them, starting from TRAILHEAD. `dims` are the dimensions whose
// blaze colours mark the destination.

export const TRAILHEAD = { x: 6, y: 90 };

export const AREAS = [
  { id: 'software', label: 'Software Craft',   blurb: 'Web, mobile and server software, plus the people who test it.', x: 15, y: 65, dims: ['build', 'design'] },
  { id: 'data',     label: 'Data Basin',       blurb: 'Turning raw data into decisions and pipelines.',                x: 36, y: 79, dims: ['data'] },
  { id: 'bridge',   label: 'Crossroads',       blurb: 'Roles between engineering and the wider world: writing, advocacy, consulting and policy.', x: 62, y: 87, dims: ['people'] },
  { id: 'security', label: 'Security Ridge',   blurb: 'Defending systems and testing them from the outside.',          x: 86, y: 50, dims: ['security'] },
  { id: 'ai',       label: 'AI Summit',        blurb: 'Machine learning and LLM-powered products.',                    x: 75, y: 31, dims: ['ai', 'data'] },
  { id: 'cloud',    label: 'Cloud & Networks', blurb: 'Infrastructure, delivery and connectivity.',                    x: 48, y: 51, dims: ['systems'] },
  { id: 'design',   label: 'Design & Product', blurb: 'Deciding what to build and how it should feel.',                x: 24, y: 40, dims: ['design', 'people'] },
  { id: 'games',    label: 'Game Grounds',     blurb: 'Interactive worlds and real-time graphics.',                    x: 40, y: 13, dims: ['play', 'build'] },
];

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a]));
