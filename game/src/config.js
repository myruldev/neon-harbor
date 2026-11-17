// Neon Harbor — configuration: world layout, districts, cars, story constants.
// All original content: a fictional seaside city, no Rockstar / GTA names or assets.

export const WORLD = 3600; // world is WORLD x WORLD pixels
export const BLOCK = 300; // city blocks are BLOCK x BLOCK
export const ROAD_W = 64; // road width in pixels
export const ROADS = 13; // road lines at 0, 300, ... 3600

export const SAVE_KEY = 'neon-harbor-save-v1';
export const DEFAULT_SEED = 7;

// Six districts, 3 columns x 2 rows. Each has its own ground tint and accent.
export const DISTRICTS = [
  { name: 'Old Town', x0: 0, y0: 0, x1: 1200, y1: 1800, ground: '#8a7a5c', accent: '#d8b25a', glow: '#ffd27a' },
  { name: 'Crest Hills', x0: 1200, y0: 0, x1: 2400, y1: 1800, ground: '#5d7a52', accent: '#9fc98a', glow: '#bfe8a8' },
  { name: 'Harbor Docks', x0: 2400, y0: 0, x1: 3600, y1: 1800, ground: '#6e6e72', accent: '#e0a53c', glow: '#ffc46b' },
  { name: 'Sunset Beach', x0: 0, y0: 1800, x1: 1200, y1: 3600, ground: '#c9a86a', accent: '#ff9d5c', glow: '#ffb37a' },
  { name: 'Neon Strip', x0: 1200, y0: 1800, x1: 2400, y1: 3600, ground: '#4a3a5e', accent: '#ff2d78', glow: '#ff5fa2' },
  { name: 'Marina Bay', x0: 2400, y0: 1800, x1: 3600, y1: 3600, ground: '#4a6a7a', accent: '#5cd6ff', glow: '#8fe3ff' },
];

export function districtAt(x, y) {
  for (const d of DISTRICTS) {
    if (x >= d.x0 && x < d.x1 && y >= d.y0 && y < d.y1) return d;
  }
  return DISTRICTS[0];
}

// Fixed story locations (on or beside roads, kept clear of buildings by the city builder).
export const SPOTS = {
  hq: { x: 1650, y: 2550, label: 'Rook\u2019s Garage (HQ)' },
  phoneBooth: { x: 1470, y: 2400, label: 'Courier Phone' },
  hotel: { x: 1950, y: 2850, label: 'Hotel Lumen' },
  passenger: { x: 450, y: 3150, label: 'Passenger' },
  goldCar: { x: 3150, y: 450, label: 'Golden Comet GT' },
  warehouse: { x: 3150, y: 1050, label: 'Kroll Warehouse' },
  package1: { x: 750, y: 750, label: 'Package 1' },
  package2: { x: 2250, y: 1350, label: 'Package 2' },
  package3: { x: 3150, y: 2850, label: 'Package 3' },
  ledger: { x: 3150, y: 1050, label: 'The Ledger' },
};

// Keep buildings out of a radius around these spots.
export const CLEAR_SPOTS = Object.values(SPOTS).map((s) => ({ x: s.x, y: s.y, r: 130 }));

export const CAR_MODELS = [
  { name: 'Sedan', len: 52, wid: 26, top: 150, accel: 420 },
  { name: 'Hatch', len: 44, wid: 24, top: 135, accel: 460 },
  { name: 'Coupe', len: 48, wid: 24, top: 165, accel: 500 },
  { name: 'Van', len: 60, wid: 28, top: 120, accel: 340 },
  { name: 'Taxi', len: 50, wid: 26, top: 145, accel: 430 },
  { name: 'Sport', len: 50, wid: 25, top: 195, accel: 560 },
];

export const CAR_COLORS = [
  '#c0392b', '#2980b9', '#27ae60', '#f39c12', '#8e44ad', '#e67e22',
  '#16a085', '#d5d8dc', '#2c3e50', '#e74c3c', '#7f8c8d', '#b7950b',
];

export const POLICE_COLOR = '#1a2a6c';
export const GOLD_CAR_COLOR = '#f7c948';

export const STORY = {
  hero: 'Rook Calloway',
  fixer: 'Marla Voss',
  villain: 'Dante Kroll',
  debt: 50000,
  intro: [
    'Rook Calloway drove getaway cars for the wrong people, and now he owes fixer Marla Voss $50,000.',
    'One last run of jobs, she says. Pay it off, or the harbor keeps him. Welcome to Neon Harbor.',
  ],
};

// Wanted: heat 0..100 maps to stars.
export function starsForHeat(heat) {
  if (heat >= 90) return 5;
  if (heat >= 70) return 4;
  if (heat >= 50) return 3;
  if (heat >= 30) return 2;
  if (heat > 0) return 1;
  return 0;
}

export function policeCountForStars(stars) {
  return [0, 1, 2, 3, 4, 5][stars] ?? 0;
}

export function fmtMoney(n) {
  return '$' + Math.floor(n).toLocaleString('en-US');
}

export function fmtClock(minutes) {
  const h = Math.floor(minutes / 60) % 24;
  const m = Math.floor(minutes % 60);
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
