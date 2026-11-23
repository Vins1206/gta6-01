// City generation for Solmaris: a deterministic seeded layout of avenues,
// blocks, buildings, parks, palms, the beach and the sea.
// Roads sit on a grid; the south-east corner opens to sand and water.

import { WORLD_W, WORLD_H, ROAD_PITCH, ROAD_W, BLOCK, BUILDING_PALETTES } from './config.js';

export function makeRng(seed) {
  let s = seed >>> 0 || 1;
  return function rng() {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function roadCentersX() {
  const out = [];
  for (let x = ROAD_W / 2 + 32; x < WORLD_W; x += ROAD_PITCH) out.push(x);
  return out;
}
export function roadCentersY() {
  const out = [];
  for (let y = ROAD_W / 2 + 32; y < WORLD_H; y += ROAD_PITCH) out.push(y);
  return out;
}
export function isOnRoad(x, y) {
  const mx = ((x - 32) % ROAD_PITCH + ROAD_PITCH) % ROAD_PITCH;
  const my = ((y - 32) % ROAD_PITCH + ROAD_PITCH) % ROAD_PITCH;
  return mx < ROAD_W || my < ROAD_W;
}
export function isWater(x, y) {
  // The sea eats the south-east: a diagonal shoreline.
  return x > 2950 && y > 1750 && (x - 2950) + (y - 1750) * 0.7 > 420;
}
export function isBeach(x, y) {
  return x > 2800 && y > 1600 && !isWater(x, y) && (x - 2800) + (y - 1600) * 0.7 > 260;
}

const SHOP_NAMES = [
  'Cafe Coral', 'Taller Bruno', 'Farmacia Sol', 'Panaderia Luz', 'Hotel Mirlo',
  'Banco Laguna', 'Tienda Vera', 'Gym Ola', 'Cine Rex Solmaris', 'Floristeria Ana',
  'Bar El Faro', 'Libreria Mar', 'Zapateria Rio', 'Peluqueria Nube', 'Carniceria Leo',
  'Joyeria Prisma', 'Cafe Brisa', 'Taco Verde', 'Disco Palma', 'Oficina Norte',
];

export function buildCity(seed = 20261117) {
  const rng = makeRng(seed);
  const buildings = [];
  const palms = [];
  const lamps = [];
  const parks = [];
  let shopIdx = 0;

  for (let bx = 32 + ROAD_W; bx + BLOCK <= WORLD_W - 16; bx += ROAD_PITCH) {
    for (let by = 32 + ROAD_W; by + BLOCK <= WORLD_H - 16; by += ROAD_PITCH) {
      const cx = bx + BLOCK / 2, cy = by + BLOCK / 2;
      if (isWater(cx, cy) || isBeach(cx, cy)) continue;
      const roll = rng();
      if (roll < 0.10) {
        parks.push({ x: bx + 14, y: by + 14, w: BLOCK - 28, h: BLOCK - 28 });
        for (let i = 0; i < 7; i++) palms.push({ x: bx + 30 + rng() * (BLOCK - 60), y: by + 30 + rng() * (BLOCK - 60), s: 0.8 + rng() * 0.5 });
        continue;
      }
      // Subdivide the block into 2x2 lots with a small plaza gap.
      const lot = (BLOCK - 36) / 2;
      for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) {
        if (rng() < 0.12) continue; // empty lot / parking
        const lx = bx + 12 + i * (lot + 12), ly = by + 12 + j * (lot + 12);
        const pal = BUILDING_PALETTES[Math.floor(rng() * BUILDING_PALETTES.length)];
        const isShop = rng() < 0.30;
        buildings.push({
          x: lx, y: ly, w: lot, h: lot,
          color: pal[0], trim: pal[1],
          floors: 2 + Math.floor(rng() * 7),
          shop: isShop ? SHOP_NAMES[shopIdx++ % SHOP_NAMES.length] : null,
          seed: Math.floor(rng() * 1e9),
        });
      }
      for (let i = 0; i < 3; i++) palms.push({ x: bx + 8 + rng() * 16, y: by + rng() * BLOCK, s: 0.75 + rng() * 0.4 });
    }
  }
  for (const x of roadCentersX()) for (let y = 60; y < WORLD_H - 40; y += 190) {
    if (!isWater(x + 62, y)) lamps.push({ x: x + ROAD_W / 2 + 6, y });
    if (!isWater(x - 62, y + 90)) lamps.push({ x: x - ROAD_W / 2 - 6, y: y + 90 });
  }
  // Marina boats anchored in the bay and umbrellas dotted along the beach.
  const boats = [];
  for (let i = 0; i < 9; i++) {
    const bx = 3120 + rng() * 620, by = 1980 + rng() * 460;
    if (isWater(bx, by)) boats.push({ x: bx, y: by, angle: rng() * 6.28, hue: ['#ffffff', '#ff6b6b', '#ffd166', '#4cc9f0'][i % 4], s: 0.8 + rng() * 0.7 });
  }
  const umbrellas = [];
  for (let i = 0; i < 16; i++) {
    const ux = 2880 + rng() * 260, uy = 1700 + rng() * 700;
    if (isBeach(ux, uy)) umbrellas.push({ x: ux, y: uy, color: ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'][i % 4] });
  }
  return { buildings, palms, lamps, parks, boats, umbrellas };
}

export function collideRects(entity, rects, radius) {
  // Circle vs rect push-out, axis separated by game code calling twice.
  for (const r of rects) {
    const nx = Math.max(r.x, Math.min(entity.x, r.x + r.w));
    const ny = Math.max(r.y, Math.min(entity.y, r.y + r.h));
    const dx = entity.x - nx, dy = entity.y - ny;
    const d2 = dx * dx + dy * dy;
    if (d2 < radius * radius) {
      if (d2 === 0) { entity.x = r.x - radius; continue; }
      const d = Math.sqrt(d2);
      entity.x = nx + (dx / d) * radius;
      entity.y = ny + (dy / d) * radius;
      return r;
    }
  }
  return null;
}

export function pointInRects(x, y, rects, pad = 0) {
  for (const r of rects) {
    if (x >= r.x - pad && x <= r.x + r.w + pad && y >= r.y - pad && y <= r.y + r.h + pad) return r;
  }
  return null;
}
