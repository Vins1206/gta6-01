// Solmaris Heat — tuning, palette and city dimensions.
// Everything here is original: the coastal city of Solmaris, its districts,
// its people and its cars were invented for this game.

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const WORLD_W = 3840;
export const WORLD_H = 2560;

// Road grid: vertical and horizontal avenues on a regular pitch.
export const ROAD_PITCH = 384;
export const ROAD_W = 104;
export const BLOCK = ROAD_PITCH - ROAD_W;

export const COLORS = {
  water: '#1b7f9e',
  waterDeep: '#14637f',
  sand: '#ecd28a',
  grass: '#57a75a',
  park: '#4c9a52',
  sidewalk: '#cfc8b8',
  curb: '#a9a294',
  road: '#33373f',
  roadEdge: '#26292f',
  lane: '#f5d76e',
  crosswalk: '#e8e8e8',
  plaza: '#d9c9a3',
  roofShadow: 'rgba(20,16,40,0.28)',
};

export const BUILDING_PALETTES = [
  ['#f2a65a', '#d97f36'], ['#ef6f6c', '#c84b48'], ['#f7ede2', '#d8c7ae'],
  ['#7fb5b5', '#55898d'], ['#ffd166', '#dda92e'], ['#8ecae6', '#5ea8c9'],
  ['#e5989b', '#b56576'], ['#b8b8ff', '#8484d8'], ['#95d5b2', '#64a97e'],
  ['#f4f1de', '#cfc9a8'], ['#ffafcc', '#e07ba4'], ['#a2d2ff', '#6fa8dc'],
];

export const CAR_COLORS = [
  '#e63946', '#f4a261', '#2a9d8f', '#e9c46a', '#457b9d', '#8338ec',
  '#ff006e', '#3a86ff', '#fb8500', '#ffffff', '#9bf00b', '#00b4d8',
  '#6c757d', '#22223b', '#ffbe0b', '#06d6a0',
];

export const CAR_MODELS = [
  { name: 'Coral Coupe', w: 46, h: 22, top: 265, accel: 210, grip: 3.4 },
  { name: 'Palmera Sedan', w: 50, h: 23, top: 235, accel: 180, grip: 3.0 },
  { name: 'Dune Buggy', w: 42, h: 22, top: 245, accel: 230, grip: 2.6 },
  { name: 'Cargo Van', w: 56, h: 26, top: 195, accel: 140, grip: 2.4 },
  { name: 'Sol Taxi', w: 50, h: 23, top: 230, accel: 175, grip: 3.0 },
  { name: 'Reef Pickup', w: 54, h: 25, top: 215, accel: 165, grip: 2.7 },
];

export const DISTRICTS = [
  { name: 'CORAL ROW', x: 500, y: 420 },
  { name: 'PALMERA DISTRICT', x: 1500, y: 420 },
  { name: 'OLD FOUNDRY', x: 2500, y: 420 },
  { name: 'MARINA VERDE', x: 3400, y: 900 },
  { name: 'SUNSET STRIP', x: 700, y: 1300 },
  { name: 'CENTRO SOLMARIS', x: 1700, y: 1300 },
  { name: 'HARBOR YARDS', x: 2750, y: 1400 },
  { name: 'LAGUNA FLATS', x: 900, y: 2150 },
  { name: 'MERCADO BAJO', x: 1900, y: 2150 },
  { name: 'PIER NUEVE', x: 3150, y: 2200 },
];

export const SAVE_KEY = 'solmaris-heat-save-v1';
