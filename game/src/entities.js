// Living city entities: traffic cars, parked cars, pedestrians and police.
// Traffic follows the avenue grid lane by lane; police drive freely and
// hunt the player; pedestrians stroll the sidewalks and flee from danger.

import { WORLD_W, WORLD_H, CAR_COLORS, CAR_MODELS } from './config.js';
import { roadCentersX, roadCentersY, isOnRoad, isWater, makeRng } from './city.js';

let NEXT_ID = 1;

export function makeCar(x, y, angle, kind, rng) {
  const model = CAR_MODELS[Math.floor(rng() * CAR_MODELS.length)];
  const taxi = kind === 'traffic' && rng() < 0.16;
  return {
    id: NEXT_ID++, x, y, angle, speed: 0, steer: 0,
    w: model.w, h: model.h, model, kind,
    color: kind === 'police' ? '#f2f2f2' : taxi ? '#ffbe0b' : CAR_COLORS[Math.floor(rng() * CAR_COLORS.length)],
    taxi, health: 100, dead: false, sirenPhase: rng() * 6.28,
    dirX: Math.cos(angle), dirY: Math.sin(angle), turnCooldown: 0, brake: false,
  };
}

export function spawnParkedCars(rng) {
  const cars = [];
  const xs = roadCentersX(), ys = roadCentersY();
  for (let i = 0; i < 64; i++) {
    const vertical = rng() < 0.5;
    if (vertical) {
      const cx = xs[Math.floor(rng() * xs.length)];
      const y = 80 + rng() * (WORLD_H - 160);
      const side = rng() < 0.5 ? -1 : 1;
      const x = cx + side * 40;
      if (isWater(x, y)) continue;
      cars.push(makeCar(x, y, side > 0 ? Math.PI / 2 : -Math.PI / 2, 'parked', rng));
    } else {
      const cy = ys[Math.floor(rng() * ys.length)];
      const x = 80 + rng() * (WORLD_W - 160);
      const side = rng() < 0.5 ? -1 : 1;
      const y = cy + side * 40;
      if (isWater(x, y)) continue;
      cars.push(makeCar(x, y, side > 0 ? 0 : Math.PI, 'parked', rng));
    }
  }
  return cars;
}

export function spawnTrafficCar(G, rng) {
  const xs = roadCentersX(), ys = roadCentersY();
  for (let tries = 0; tries < 12; tries++) {
    const vertical = rng() < 0.5;
    let x, y, angle;
    if (vertical) {
      const cx = xs[Math.floor(rng() * xs.length)];
      const south = rng() < 0.5;
      x = cx + (south ? -26 : 26); y = 60 + rng() * (WORLD_H - 120);
      angle = south ? Math.PI / 2 : -Math.PI / 2;
    } else {
      const cy = ys[Math.floor(rng() * ys.length)];
      const east = rng() < 0.5;
      y = cy + (east ? 26 : -26); x = 60 + rng() * (WORLD_W - 120);
      angle = east ? 0 : Math.PI;
    }
    if (isWater(x, y)) continue;
    const d = Math.hypot(x - G.player.x, y - G.player.y);
    if (d < 420 || d > 1250) continue;
    const car = makeCar(x, y, angle, 'traffic', rng);
    car.speed = 110 + rng() * 55;
    return car;
  }
  return null;
}

export function makePed(x, y, rng) {
  const shirts = ['#ff6b6b', '#ffd93d', '#6bcbff', '#95d5b2', '#f9a8d4', '#ffa07a', '#c3aed6', '#ffffff'];
  return {
    id: NEXT_ID++, x, y, angle: rng() * 6.28, speed: 0,
    tx: x, ty: y, wait: rng() * 2, health: 30, dead: false, down: 0,
    shirt: shirts[Math.floor(rng() * shirts.length)],
    skin: ['#8d5524', '#c68642', '#e0ac69', '#f1c27d', '#ffdbac'][Math.floor(rng() * 5)],
    fleeX: 0, fleeY: 0, fleeT: 0, phase: rng() * 6.28,
  };
}

export function spawnPedsAround(G, rng, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    for (let tries = 0; tries < 10; tries++) {
      const x = G.player.x + (rng() - 0.5) * 1500;
      const y = G.player.y + (rng() - 0.5) * 1100;
      if (x < 40 || y < 40 || x > WORLD_W - 40 || y > WORLD_H - 40) continue;
      if (isWater(x, y) || isOnRoad(x, y)) continue;
      peds.push(makePed(x, y, rng)); break;
    }
  }
  return peds;
}

function nearestCross(x, y) {
  const xs = roadCentersX(), ys = roadCentersY();
  let best = null, bd = 1e9;
  for (const cx of xs) for (const cy of ys) {
    const d = Math.hypot(x - cx, y - cy);
    if (d < bd) { bd = d; best = { x: cx, y: cy, d }; }
  }
  return best;
}

export function updateTrafficCar(G, car, dt) {
  car.turnCooldown -= dt;
  car.brake = false;
  // Brake for anything ahead: player, pedestrians, other cars.
  const fx = car.x + Math.cos(car.angle) * 58, fy = car.y + Math.sin(car.angle) * 58;
  const check = (ox, oy, r) => Math.hypot(fx - ox, fy - oy) < r;
  let blocked = check(G.player.x, G.player.y, 44) && !G.player.car;
  if (G.player.car && check(G.player.car.x, G.player.car.y, 52)) blocked = true;
  for (const o of G.cars) { if (o !== car && !o.dead && check(o.x, o.y, 46)) { blocked = true; break; } }
  if (!blocked) for (const p of G.peds) { if (!p.dead && check(p.x, p.y, 30)) { blocked = true; break; } }
  const target = blocked ? 0 : 128;
  car.brake = blocked;
  car.speed += Math.max(-260 * dt, Math.min(90 * dt, target - car.speed));
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  // Turn at intersections.
  const cross = nearestCross(car.x, car.y);
  if (cross && cross.d < 14 && car.turnCooldown <= 0) {
    car.turnCooldown = 1.2;
    const roll = G.rng();
    if (roll > 0.5) {
      const turnLeft = roll < 0.75;
      const a = car.angle + (turnLeft ? -Math.PI / 2 : Math.PI / 2);
      car.angle = a;
      // Snap into the correct lane of the new avenue.
      if (Math.abs(Math.cos(a)) > 0.5) car.y = cross.y + (Math.cos(a) > 0 ? 26 : -26);
      else car.x = cross.x + (Math.sin(a) > 0 ? -26 : 26);
    }
  }
  if (car.x < 30 || car.x > WORLD_W - 30 || car.y < 30 || car.y > WORLD_H - 30 || isWater(car.x, car.y)) {
    car.angle += Math.PI; car.x = Math.max(40, Math.min(WORLD_W - 40, car.x)); car.y = Math.max(40, Math.min(WORLD_H - 40, car.y));
  }
}

export function updatePed(G, ped, dt) {
  if (ped.dead) return;
  ped.phase += dt * 8;
  if (ped.fleeT > 0) {
    ped.fleeT -= dt;
    const a = Math.atan2(ped.y - ped.fleeY, ped.x - ped.fleeX);
    ped.x += Math.cos(a) * 165 * dt; ped.y += Math.sin(a) * 165 * dt; ped.angle = a;
    return;
  }
  const d = Math.hypot(ped.tx - ped.x, ped.ty - ped.y);
  if (ped.wait > 0) { ped.wait -= dt; return; }
  if (d < 8) {
    ped.wait = 0.4 + G.rng() * 2.4;
    for (let t = 0; t < 8; t++) {
      const nx = ped.x + (G.rng() - 0.5) * 420, ny = ped.y + (G.rng() - 0.5) * 420;
      if (nx > 30 && ny > 30 && nx < WORLD_W - 30 && ny < WORLD_H - 30 && !isWater(nx, ny) && !isOnRoad(nx, ny)) { ped.tx = nx; ped.ty = ny; break; }
    }
    return;
  }
  const a = Math.atan2(ped.ty - ped.y, ped.tx - ped.x);
  ped.angle = a;
  ped.x += Math.cos(a) * 52 * dt; ped.y += Math.sin(a) * 52 * dt;
}

export function scarePeds(G, x, y, radius) {
  for (const p of G.peds) {
    if (!p.dead && Math.hypot(p.x - x, p.y - y) < radius) { p.fleeX = x; p.fleeY = y; p.fleeT = 1.6; }
  }
}

// ---------------- police ----------------

export function wantedPoliceCount(wanted) { return wanted === 0 ? 0 : Math.min(5, wanted + 1); }

export function spawnPoliceCar(G, rng) {
  const xs = roadCentersX(), ys = roadCentersY();
  const vertical = rng() < 0.5;
  let x, y;
  if (vertical) { x = xs[Math.floor(rng() * xs.length)]; y = G.player.y + (rng() < 0.5 ? -620 : 620); }
  else { y = ys[Math.floor(rng() * ys.length)]; x = G.player.x + (rng() < 0.5 ? -720 : 720); }
  x = Math.max(50, Math.min(WORLD_W - 50, x)); y = Math.max(50, Math.min(WORLD_H - 50, y));
  if (isWater(x, y)) { x = G.player.x - 500; y = G.player.y; }
  const car = makeCar(x, y, 0, 'police', rng);
  car.health = 140;
  return car;
}

export function updatePoliceCar(G, car, dt) {
  if (car.roadblock) { car.speed = 0; car.sirenPhase += dt * 9; return; }
  const target = G.player.car || G.player;
  const dx = target.x - car.x, dy = target.y - car.y;
  const dist = Math.hypot(dx, dy) || 1;
  const want = Math.atan2(dy, dx);
  let diff = want - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.steer = Math.max(-1, Math.min(1, diff * 2.2));
  const top = G.player.car ? 292 : 238;
  const accel = dist > 46 ? 235 : 40;
  car.speed = Math.min(top, car.speed + accel * dt);
  if (dist < 40) car.speed = Math.max(0, car.speed - 190 * dt);
  car.angle += car.steer * 2.1 * dt * Math.min(1, car.speed / 120 + 0.25);
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.sirenPhase += dt * 9;
}

export function makeOfficer(x, y, rng) {
  const ped = makePed(x, y, rng);
  ped.shirt = '#1d3557'; ped.officer = true; ped.health = 45; ped.speed = 118;
  return ped;
}

export function updateOfficer(G, ped, dt) {
  if (ped.dead) return;
  ped.phase += dt * 10;
  const dx = G.player.x - ped.x, dy = G.player.y - ped.y;
  const d = Math.hypot(dx, dy) || 1;
  if (!G.player.car && d < 560) {
    ped.x += (dx / d) * ped.speed * dt; ped.y += (dy / d) * ped.speed * dt; ped.angle = Math.atan2(dy, dx);
  } else if (G.player.car) {
    // Officers fall back to their cruiser when the player drives away.
    ped.wait = 1;
  }
}
