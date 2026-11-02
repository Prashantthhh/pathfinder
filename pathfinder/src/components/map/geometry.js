// Shared drawing geometry for the interest map. Unit coordinates (hexagon corner
// radius 1, centre 0,0) map onto a 1000 x 1000 SVG viewBox.

export const SIZE = 1000;
export const CENTER = SIZE / 2;
export const RADIUS = 310;

export const toPx = (u) => CENTER + u * RADIUS;
/** Percentage of the map's width/height, for absolutely positioned HTML on top of the SVG. */
export const toPct = (u) => (toPx(u) / SIZE) * 100;
