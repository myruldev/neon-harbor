// Neon Harbor — the city itself: a road grid, district-tinted blocks, buildings,
// parks, the marina basin, dock containers, palms and lamps. Deterministic per seed.
// Also the collision helpers every moving thing uses.

import { WORLD, BLOCK, ROAD_W, DISTRICTS, CLEAR_SPOTS, districtAt } from './config.js';
import { RNG, hash2 } from './rng.js';

const HALF = ROAD_W / 2; // 32

function nearClearSpot(x, y) {
  for (const s of CLEAR_SPOTS) {
    const dx = x - s.x;
    const dy = y - s.y;
    if (dx * dx + dy * dy < s.r * s.r) return true;
  }
  return false;
}

// Building roof palettes per district (roof colour + wall colour).
const ROOFS = {
  'Old Town': ['#a8622d', '#8a4f26', '#b07a3e', '#7a5a3a'],
  'Crest Hills': ['#3e5a3a', '#556b4a', '#6b7a52', '#43584a'],
  'Harbor Docks': ['#5a5f66', '#707880', '#4a4f55', '#8a6a3a'],
  'Sunset Beach': ['#d8a05a', '#e8b878', '#c98a4a', '#f0c080'],
  'Neon Strip': ['#7a2d5e', '#5e2a7a', '#a02d6e', '#3a2a6e'],
  'Marina Bay': ['#2d5a7a', '#3a6a8a', '#4a7a9a', '#2d4a6a'],
};

// Rook's garage: a fixed building the city builder must keep clear and solid.
const HQ_RECT = { x: 1560, y: 2400, w: 180, h: 110 };

function rectHitsFixed(x, y, w, h) {
  const fixed = [HQ_RECT, { x: 3032, y: 3032, w: 236, h: 236 }, { x: 3032, y: 2980, w: 236, h: 40 }, { x: 2980, y: 3032, w: 40, h: 236 }];
  for (const f of fixed) {
    if (x < f.x + f.w + 8 && x + w + 8 > f.x && y < f.y + f.h + 8 && y + h + 8 > f.y) return true;
  }
  return false;
}

export function buildCity(seed) {
  const rng = new RNG(seed);
  const buildings = [];
  const parks = [];
  const palms = [];
  const lamps = [];
  const containers = [];
  const water = [];
  const docks = [];

  // Marina basin: a water rectangle inside one Marina Bay block (roads stay clear).
  water.push({ x: 3032, y: 3032, w: 236, h: 236, label: 'Marina basin' });
  docks.push({ x: 3032, y: 2980, w: 236, h: 40 });
  docks.push({ x: 2980, y: 3032, w: 40, h: 236 });

  // Lamp posts at every intersection, palms along the beach district.
  for (let i = 0; i <= 12; i++) {
    for (let j = 0; j <= 12; j++) {
      if (i === 0 || i === 12 || j === 0 || j === 12) continue;
      lamps.push({ x: i * BLOCK + HALF + 6, y: j * BLOCK + HALF + 6 });
    }
  }

  for (let bx = 0; bx < 12; bx++) {
    for (let by = 0; by < 12; by++) {
      const x0 = bx * BLOCK + HALF;
      const y0 = by * BLOCK + HALF;
      const x1 = (bx + 1) * BLOCK - HALF;
      const y1 = (by + 1) * BLOCK - HALF;
      const cx = (x0 + x1) / 2;
      const cy = (y0 + y1) / 2;
      const district = districtAt(cx, cy);
      const roll = hash2(bx, by, seed);

      // Harbor Docks container yard: stacked coloured containers instead of buildings.
      if (district.name === 'Harbor Docks' && roll < 0.45) {
        const n = rng.int(3, 6);
        for (let k = 0; k < n; k++) {
          const cw = rng.int(60, 110);
          const ch = 26;
          const px = rng.range(x0 + 10, x1 - cw - 10);
          const py = rng.range(y0 + 10, y1 - ch - 10);
          if (nearClearSpot(px + cw / 2, py + ch / 2)) continue;
          containers.push({
            x: px, y: py, w: cw, h: ch,
            color: rng.pick(['#c0392b', '#2980b9', '#27ae60', '#e67e22', '#8e44ad', '#b7950b']),
          });
        }
        continue;
      }

      // Parks: green blocks with trees (no buildings). Never on the marina block.
      if (roll < 0.16 && !(bx === 10 && by === 10)) {
        parks.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, district: district.name });
        const trees = rng.int(4, 8);
        for (let k = 0; k < trees; k++) {
          palms.push({
            x: rng.range(x0 + 16, x1 - 16), y: rng.range(y0 + 16, y1 - 16),
            kind: district.name === 'Sunset Beach' ? 'palm' : 'tree',
          });
        }
        continue;
      }

      // Buildings: 1-3 per block, kept inside the block and off clear spots.
      const count = rng.int(1, 3);
      for (let k = 0; k < count; k++) {
        const w = rng.int(60, 150);
        const h = rng.int(60, 150);
        const px = rng.range(x0 + 6, x1 - w - 6);
        const py = rng.range(y0 + 6, y1 - h - 6);
        const pcx = px + w / 2;
        const pcy = py + h / 2;
        if (nearClearSpot(pcx, pcy)) continue;
        if (rectHitsFixed(px, py, w, h)) continue;
        // Keep buildings from overlapping each other in the same block.
        let overlap = false;
        for (const b of buildings) {
          if (b.bx === bx && b.by === by && px < b.x + b.w + 12 && px + w + 12 > b.x && py < b.y + b.h + 12 && py + h + 12 > b.y) {
            overlap = true;
            break;
          }
        }
        if (overlap) continue;
        buildings.push({
          x: px, y: py, w, h, bx, by,
          district: district.name,
          roof: rng.pick(ROOFS[district.name] || ROOFS['Old Town']),
          tall: district.name === 'Neon Strip' && rng.chance(0.5),
          neon: district.name === 'Neon Strip' && rng.chance(0.7),
        });
      }

      // Beach palms along Sunset Beach blocks.
      if (district.name === 'Sunset Beach' && rng.chance(0.6)) {
        palms.push({ x: rng.range(x0 + 14, x1 - 14), y: rng.range(y0 + 14, y1 - 14), kind: 'palm' });
      }
    }
  }

  // Obstacles everything collides with: buildings, containers, water, docks, HQ.
  const obstacles = [];
  obstacles.push({ x: HQ_RECT.x, y: HQ_RECT.y, w: HQ_RECT.w, h: HQ_RECT.h });
  for (const b of buildings) obstacles.push({ x: b.x, y: b.y, w: b.w, h: b.h });
  for (const c of containers) obstacles.push({ x: c.x, y: c.y, w: c.w, h: c.h });
  for (const w of water) obstacles.push({ x: w.x, y: w.y, w: w.w, h: w.h });
  for (const d of docks) obstacles.push({ x: d.x, y: d.y, w: d.w, h: d.h });

  return { seed, buildings, parks, palms, lamps, containers, water, docks, obstacles };
}

// True when a circle of radius r at (x, y) overlaps any obstacle or the world edge.
export function circleHits(city, x, y, r) {
  if (x < r || y < r || x > WORLD - r || y > WORLD - r) return true;
  for (const o of city.obstacles) {
    const nx = Math.max(o.x, Math.min(x, o.x + o.w));
    const ny = Math.max(o.y, Math.min(y, o.y + o.h));
    const dx = x - nx;
    const dy = y - ny;
    if (dx * dx + dy * dy < r * r) return true;
  }
  return false;
}

// Push a circle out of obstacles; returns {x, y, hit} with the corrected position.
export function resolveCircle(city, x, y, r) {
  let hit = false;
  x = Math.max(r, Math.min(WORLD - r, x));
  y = Math.max(r, Math.min(WORLD - r, y));
  for (const o of city.obstacles) {
    const nx = Math.max(o.x, Math.min(x, o.x + o.w));
    const ny = Math.max(o.y, Math.min(y, o.y + o.h));
    let dx = x - nx;
    let dy = y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 >= r * r) continue;
    hit = true;
    if (d2 < 0.0001) {
      // Centre inside the box: push out along the smallest penetration axis.
      const left = x - o.x;
      const right = o.x + o.w - x;
      const top = y - o.y;
      const bottom = o.y + o.h - y;
      const m = Math.min(left, right, top, bottom);
      if (m === left) x = o.x - r;
      else if (m === right) x = o.x + o.w + r;
      else if (m === top) y = o.y - r;
      else y = o.y + o.h + r;
    } else {
      const d = Math.sqrt(d2);
      dx /= d;
      dy /= d;
      x = nx + dx * r;
      y = ny + dy * r;
    }
  }
  return { x, y, hit };
}

// Is (x, y) on a road (within the asphalt, not a block)?
export function onRoad(x, y) {
  const mx = ((x % BLOCK) + BLOCK) % BLOCK;
  const my = ((y % BLOCK) + BLOCK) % BLOCK;
  return mx < HALF || mx > BLOCK - HALF || my < HALF || my > BLOCK - HALF;
}

// Nearest road centre coordinate at or after v (multiples of BLOCK).
export function nextRoadCoord(v) {
  return Math.ceil(v / BLOCK) * BLOCK;
}

export { DISTRICTS, districtAt };
