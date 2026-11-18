// Core game: state, player, driving, combat, wanted system, missions,
// taxi fares, pickups, camera, saving and the main draw.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H, SAVE_KEY } from './config.js';
import { buildCity, collideRects, pointInRects, isWater, isOnRoad, makeRng } from './city.js';
import { makeCar, spawnParkedCars, spawnTrafficCar, spawnPedsAround, updateTrafficCar, updatePed, scarePeds, wantedPoliceCount, spawnPoliceCar, updatePoliceCar, makeOfficer, updateOfficer } from './entities.js';
import { MISSIONS, missionMarker } from './missions.js';
import { drawWorld, drawCar, drawPerson } from './render.js';
import { drawHUD, drawDialog, drawStartScreen, drawEndScreen, drawObjectiveArrow } from './hud.js';
import { SoundBank } from './audio.js';

export function createGame(input, seed = 20261117) {
  const rng = makeRng(seed);
  const G = {
    rng, input, sound: new SoundBank(),
    city: buildCity(seed),
    time: 0, state: 'start', hasSave: false,
    player: { x: 470, y: 620, angle: 0, health: 100, car: null, fireCd: 0, punchCd: 0, phase: 0 },
    cars: [], peds: [], officers: [],
    money: 250, rep: 0, wanted: 0, heatCool: 12, bustMeter: 0,
    missionIndex: 0, mission: null, missionTimer: 0, missionArmed: false, cratesTaken: [],
    dialog: null, dialogQueue: [], storyDone: false,
    toast: '', toastT: 0, taxiTarget: null, taxiCooldown: 8,
    crates: [], tracers: [], sparks: [], cam: { x: 0, y: 0, w: VIEW_W, h: VIEW_H },
    muted: false, endKind: null, saveT: 0,
  };
  G.cars = spawnParkedCars(rng);
  // A friendly first car waits on the avenue east of the spawn, unlocked.
  const first = makeCar(612, 494, 0, 'parked', rng); first.color = '#e63946'; G.cars.push(first);
  for (let i = 0; i < 10; i++) { const c = spawnTrafficCar(G, rng); if (c) G.cars.push(c); }
  G.peds = spawnPedsAround(G, rng, 22);
  for (let i = 0; i < 8; i++) G.crates.push(newSideCrate(G));
  try { G.hasSave = !!localStorage.getItem(SAVE_KEY); } catch { G.hasSave = false; }
  return G;
}

function newSideCrate(G) {
  for (let t = 0; t < 20; t++) {
    const x = 80 + G.rng() * (WORLD_W - 160), y = 80 + G.rng() * (WORLD_H - 160);
    if (!isWater(x, y) && !pointInRects(x, y, G.city.buildings, 6)) return { x, y, phase: G.rng() * 6.28 };
  }
  return { x: 300, y: 300, phase: 0 };
}

export function startStory(G, cont) {
  G.sound.ensure();
  if (cont) loadGame(G);
  else { G.money = 250; G.rep = 0; G.missionIndex = 0; G.storyDone = false; }
  G.state = 'play'; G.endKind = null;
  G.player.health = 100; G.wanted = 0;
  assignMission(G);
}

export function assignMission(G) {
  G.cratesTaken = []; G.missionArmed = false; G.missionTimer = 0;
  if (G.missionIndex >= MISSIONS.length) { G.mission = null; G.storyDone = true; return; }
  G.mission = MISSIONS[G.missionIndex];
  if (G.mission.timer) G.missionTimer = G.mission.timer;
  G.dialogQueue = G.mission.dialog.map((d) => [...d]);
  G.dialog = G.dialogQueue.shift() || null;
  if (G.mission.raisesWanted) addWanted(G, G.mission.raisesWanted);
  showToast(G, G.mission.title);
}

function showToast(G, text) { G.toast = text; G.toastT = 3.4; }
export function addWanted(G, n) {
  const before = G.wanted;
  G.wanted = Math.max(0, Math.min(5, G.wanted + n));
  if (G.wanted > before) G.heatCool = 12;
}

function saveGame(G) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      money: G.money, rep: G.rep, missionIndex: G.missionIndex,
      x: G.player.x, y: G.player.y, storyDone: G.storyDone,
    }));
    G.hasSave = true;
  } catch { /* storage unavailable: the game still plays */ }
}
function loadGame(G) {
  try {
    const s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
    if (!s) return;
    G.money = s.money ?? 250; G.rep = s.rep ?? 0; G.missionIndex = s.missionIndex ?? 0;
    G.storyDone = !!s.storyDone;
    if (!G.storyDone) { G.player.x = s.x ?? G.player.x; G.player.y = s.y ?? G.player.y; }
  } catch { /* corrupted save ignored */ }
}

export function updateGame(G, dt) {
  G.time += dt;
  if (G.toastT > 0) G.toastT -= dt; else G.toast = '';
  if (G.state === 'start') {
    if (G.input.justPressed('Enter')) startStory(G, false);
    if (G.input.justPressed('KeyC') && G.hasSave) startStory(G, true);
    return;
  }
  if (G.state === 'busted' || G.state === 'wasted' || G.state === 'complete') {
    G.sound.setEngine(false);
    if (G.input.justPressed('Enter')) respawn(G);
    return;
  }
  if (G.input.justPressed('KeyM')) { G.muted = !G.muted; if (G.muted) G.sound.setEngine(false); }
  if (G.input.justPressed('KeyP')) { G.state = G.state === 'pause' ? 'play' : 'pause'; return; }
  if (G.state === 'pause') return;
  if (G.dialog) {
    if (G.input.mouse.clicked || G.input.justPressed('Enter', 'Space')) {
      G.dialog = G.dialogQueue.shift() || null;
      G.sound.ensure();
    }
    return;
  }
  stepPlay(G, dt);
}

function respawn(G) {
  const kind = G.state;
  G.state = 'play'; G.wanted = 0; G.bustMeter = 0; G.player.health = 100; G.player.car = null;
  if (kind === 'busted') { G.money = Math.max(0, G.money - 200); G.player.x = 1700; G.player.y = 950; }
  else if (kind === 'wasted') { G.money = Math.max(0, G.money - 150); G.player.x = 760; G.player.y = 950; }
  else if (kind === 'complete') { /* stay where the story ended */ }
  for (const c of G.cars) if (c.kind === 'police') c.dead = true;
  G.officers = [];
  if (!G.mission && !G.storyDone) assignMission(G);
  if (G.storyDone) G.mission = null;
  saveGame(G);
}

function stepPlay(G, dt) {
  const p = G.player;
  p.fireCd -= dt; p.punchCd -= dt;
  if (p.car) updateDriving(G, dt); else updateOnFoot(G, dt);
  // World life.
  let traffic = 0;
  for (const c of G.cars) {
    if (c.dead) continue;
    if (c.kind === 'traffic') { traffic++; updateTrafficCar(G, c, dt); collideCarWorld(G, c, false); }
    if (c.kind === 'police') { updatePoliceCar(G, c, dt); collideCarWorld(G, c, false); }
  }
  if (traffic < 13 && G.rng() < dt * 1.4) { const c = spawnTrafficCar(G, G.rng); if (c) G.cars.push(c); }
  G.cars = G.cars.filter((c) => {
    const d = Math.hypot(c.x - p.x, c.y - p.y);
    return !(c.kind === 'traffic' && d > 1500) && !(c.dead && d > 900) && c !== p.car || c === p.car;
  });
  for (const ped of G.peds) { updatePed(G, ped, dt); collideRects(ped, G.city.buildings, 9); }
  if (G.peds.filter((q) => !q.dead).length < 20 && G.rng() < dt * 2) G.peds.push(...spawnPedsAround(G, G.rng, 2));
  G.peds = G.peds.filter((q) => Math.hypot(q.x - p.x, q.y - p.y) < 1500);
  updatePolice(G, dt);
  updateCombat(G, dt);
  updatePickupsAndTaxi(G, dt);
  updateMission(G, dt);
  updateWanted(G, dt);
  // Effects decay.
  for (const t of G.tracers) t.t -= dt;
  G.tracers = G.tracers.filter((t) => t.t > 0);
  for (const s of G.sparks) { s.t -= dt; s.x += s.vx * dt; s.y += s.vy * dt; }
  G.sparks = G.sparks.filter((s) => s.t > 0);
  // Camera follows with a little look-ahead.
  const focus = p.car || p;
  const look = p.car ? Math.min(120, Math.abs(p.car.speed) * 0.4) : 0;
  const tx = focus.x + (p.car ? Math.cos(p.car.angle) * look : 0) - VIEW_W / 2;
  const ty = focus.y + (p.car ? Math.sin(p.car.angle) * look : 0) - VIEW_H / 2;
  G.cam.x += (Math.max(0, Math.min(WORLD_W - VIEW_W, tx)) - G.cam.x) * Math.min(1, dt * 5);
  G.cam.y += (Math.max(0, Math.min(WORLD_H - VIEW_H, ty)) - G.cam.y) * Math.min(1, dt * 5);
  G.sound.sirenTick(dt, G.wanted > 0 && !G.muted);
  G.sound.setEngine(!!p.car && !G.muted, p.car ? Math.abs(p.car.speed) / p.car.model.top : 0);
  G.saveT -= dt;
  if (G.saveT <= 0) { G.saveT = 6; saveGame(G); }
  if (p.health <= 0) { G.state = 'wasted'; G.sound.busted(); }
}

function updateOnFoot(G, dt) {
  const p = G.player, inp = G.input;
  let mx = (inp.down('KeyD', 'ArrowRight') ? 1 : 0) - (inp.down('KeyA', 'ArrowLeft') ? 1 : 0);
  let my = (inp.down('KeyS', 'ArrowDown') ? 1 : 0) - (inp.down('KeyW', 'ArrowUp') ? 1 : 0);
  const run = inp.down('ShiftLeft', 'ShiftRight');
  const sp = run ? 238 : 152;
  if (mx || my) {
    const len = Math.hypot(mx, my); mx /= len; my /= len;
    p.x += mx * sp * dt; p.y += my * sp * dt; p.angle = Math.atan2(my, mx); p.phase += dt * (run ? 13 : 9);
  }
  p.x = Math.max(16, Math.min(WORLD_W - 16, p.x)); p.y = Math.max(16, Math.min(WORLD_H - 16, p.y));
  if (isWater(p.x, p.y)) { p.x -= mx * sp * dt * 1.2; p.y -= my * sp * dt * 1.2; }
  collideRects(p, G.city.buildings, 11);
  for (const c of G.cars) if (!c.dead && c !== p.car && Math.hypot(c.x - p.x, c.y - p.y) < (c.w / 2 + 10)) {
    const a = Math.atan2(p.y - c.y, p.x - c.x); p.x = c.x + Math.cos(a) * (c.w / 2 + 11); p.y = c.y + Math.sin(a) * (c.w / 2 + 11);
  }
  if (inp.justPressed('KeyE')) tryEnterCar(G);
  // Aim at the mouse even on foot.
  const wx = G.cam.x + inp.mouse.x, wy = G.cam.y + inp.mouse.y;
  if (mx === 0 && my === 0) p.angle = Math.atan2(wy - p.y, wx - p.x);
}

function tryEnterCar(G) {
  const p = G.player;
  let best = null, bd = 52;
  for (const c of G.cars) { if (c.dead) continue; const d = Math.hypot(c.x - p.x, c.y - p.y); if (d < bd) { bd = d; best = c; } }
  if (!best) return;
  const wasTraffic = best.kind === 'traffic' || best.kind === 'police';
  best.kind = 'player'; best.brake = false;
  p.car = best; G.sound.door();
  if (wasTraffic) { addWanted(G, best.taxi ? 1 : 1); showToast(G, 'Car taken! The owner called the Policia…'); scarePeds(G, p.x, p.y, 130); }
  else showToast(G, 'Driving the ' + best.model.name + ' — WASD to drive');
}

function exitCar(G) {
  const p = G.player, car = p.car;
  car.kind = 'parked'; car.speed = 0;
  p.x = car.x + Math.cos(car.angle - Math.PI / 2) * 30; p.y = car.y + Math.sin(car.angle - Math.PI / 2) * 30;
  p.car = null; G.sound.door(); G.sound.setEngine(false);
}

function updateDriving(G, dt) {
  const p = G.player, car = p.car, inp = G.input;
  const fwd = inp.down('KeyW', 'ArrowUp'), back = inp.down('KeyS', 'ArrowDown');
  const left = inp.down('KeyA', 'ArrowLeft'), right = inp.down('KeyD', 'ArrowRight');
  if (fwd) car.speed += car.model.accel * dt;
  if (back) car.speed -= (car.speed > 4 ? 260 : 120) * dt;
  car.speed -= car.speed * (inp.down('Space') ? 1.5 : 0.32) * dt;
  car.speed = Math.max(-95, Math.min(car.model.top, car.speed));
  const steerTarget = (left ? -1 : 0) + (right ? 1 : 0);
  car.steer += (steerTarget - car.steer) * Math.min(1, dt * 8);
  const grip = inp.down('Space') ? 1.5 : car.model.grip;
  if (Math.abs(car.speed) > 3) car.angle += car.steer * grip * dt * (car.speed / car.model.top) * 1.55;
  car.x += Math.cos(car.angle) * car.speed * dt;
  car.y += Math.sin(car.angle) * car.speed * dt;
  car.brake = back || inp.down('Space');
  p.x = car.x; p.y = car.y; p.angle = car.angle;
  collideCarWorld(G, car, true);
  if (inp.justPressed('KeyE')) exitCar(G);
}

function collideCarWorld(G, car, isPlayerCar) {
  car.x = Math.max(26, Math.min(WORLD_W - 26, car.x)); car.y = Math.max(26, Math.min(WORLD_H - 26, car.y));
  if (isWater(car.x, car.y)) { car.x -= Math.cos(car.angle) * car.speed * 0.016; car.y -= Math.sin(car.angle) * car.speed * 0.016; car.speed *= 0.6; }
  const hit = collideRects(car, G.city.buildings, car.w / 2.4);
  if (hit && Math.abs(car.speed) > 55) {
    car.health -= Math.abs(car.speed) * 0.06; car.speed *= -0.25;
    if (isPlayerCar) { G.sound.crash(); addSpark(G, car.x, car.y, '#ffd166', 8); if (G.player.car === car) G.player.health -= 2; }
  } else if (hit) car.speed *= 0.5;
  for (const o of G.cars) {
    if (o === car || o.dead) continue;
    const d = Math.hypot(o.x - car.x, o.y - car.y);
    if (d < (car.w + o.w) / 2.4 && d > 0) {
      const a = Math.atan2(o.y - car.y, o.x - car.x);
      o.x += Math.cos(a) * 3; o.y += Math.sin(a) * 3;
      if (Math.abs(car.speed) > 70) { o.health -= 12; car.speed *= 0.55; if (isPlayerCar) { G.sound.crash(); addWanted(G, 1); } }
    }
  }
  for (const ped of [...G.peds, ...G.officers]) {
    if (ped.dead) continue;
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < car.w / 2.2) {
      if (Math.abs(car.speed) > 62) {
        ped.dead = true; car.health -= 4;
        if (isPlayerCar) { addWanted(G, 1); showToast(G, 'You hit a pedestrian!'); G.sound.crash(); }
      } else { ped.fleeX = car.x; ped.fleeY = car.y; ped.fleeT = 1.4; }
    }
  }
}

function addSpark(G, x, y, color, n) {
  for (let i = 0; i < n; i++) G.sparks.push({ x, y, vx: (G.rng() - 0.5) * 190, vy: (G.rng() - 0.5) * 190, t: 0.35 + G.rng() * 0.3, color });
}

function updatePolice(G, dt) {
  const p = G.player;
  const want = wantedPoliceCount(G.wanted);
  const cops = G.cars.filter((c) => c.kind === 'police' && !c.dead);
  if (cops.length < want && G.rng() < dt * 1.6) G.cars.push(spawnPoliceCar(G, G.rng));
  if (cops.length > want && want === 0) for (const c of cops) c.kind = 'traffic';
  // Officers on foot pour out of nearby cruisers when the player is on foot.
  if (!p.car && G.wanted >= 2 && G.officers.filter((o) => !o.dead).length < 3) {
    for (const c of cops) if (Math.hypot(c.x - p.x, c.y - p.y) < 300 && G.rng() < dt) G.officers.push(makeOfficer(c.x, c.y, G.rng));
  }
  for (const o of G.officers) {
    updateOfficer(G, o, dt); collideRects(o, G.city.buildings, 9);
    if (!o.dead && !p.car && Math.hypot(o.x - p.x, o.y - p.y) < 24 && p.punchCd <= 0) {
      // The grab is handled by the bust meter; officers also shove.
      G.bustMeter += dt * 0.55;
    }
  }
  G.officers = G.officers.filter((o) => Math.hypot(o.x - p.x, o.y - p.y) < 900 || o.dead === false && G.wanted > 0);
  // Bust pressure.
  let pressure = false;
  if (!p.car) {
    for (const c of cops) if (Math.hypot(c.x - p.x, c.y - p.y) < 54) pressure = true;
  } else if (Math.abs(p.car.speed) < 22) {
    for (const c of cops) if (Math.hypot(c.x - p.car.x, c.y - p.car.y) < 62) pressure = true;
  }
  if (pressure && G.wanted > 0) G.bustMeter += dt * 0.42;
  else G.bustMeter = Math.max(0, G.bustMeter - dt * 0.5);
  if (G.bustMeter >= 1) { G.state = 'busted'; G.sound.busted(); }
  // Police rams hurt a little.
  if (p.car) for (const c of cops) {
    if (Math.hypot(c.x - p.car.x, c.y - p.car.y) < 40 && Math.abs(c.speed) > 120 && p.punchCd <= 0) { p.health -= 3; p.punchCd = 0.8; addSpark(G, p.x, p.y, '#ff6b6b', 6); }
  }
}

function updateWanted(G, dt) {
  if (G.wanted === 0) return;
  let seen = false;
  for (const c of G.cars) if (c.kind === 'police' && !c.dead && Math.hypot(c.x - G.player.x, c.y - G.player.y) < 620) seen = true;
  for (const o of G.officers) if (!o.dead && Math.hypot(o.x - G.player.x, o.y - G.player.y) < 300) seen = true;
  if (seen) G.heatCool = 12;
  else {
    G.heatCool -= dt;
    if (G.heatCool <= 0) { G.wanted -= 1; G.heatCool = 12; if (G.wanted === 0) showToast(G, 'Heat lost. Solmaris breathes again.'); }
  }
}

function updateCombat(G, dt) {
  const p = G.player, inp = G.input;
  const wantFire = (inp.mouse.down || inp.down('KeyF')) && p.fireCd <= 0 && !p.car;
  if (!wantFire) return;
  p.fireCd = 0.21;
  const wx = G.cam.x + inp.mouse.x, wy = G.cam.y + inp.mouse.y;
  const a = Math.atan2(wy - p.y, wx - p.x); p.angle = a;
  // Punch range first.
  let victim = null, vd = 48;
  for (const q of [...G.peds, ...G.officers]) { if (q.dead) continue; const d = Math.hypot(q.x - p.x, q.y - p.y); if (d < vd) { vd = d; victim = q; } }
  if (victim) {
    victim.health -= 16; G.sound.punch(); addSpark(G, victim.x, victim.y, '#ffffff', 4);
    if (victim.health <= 0) { victim.dead = true; addWanted(G, victim.officer ? 2 : 1); }
    else if (victim.officer) addWanted(G, 1);
    scarePeds(G, p.x, p.y, 170); return;
  }
  // Otherwise a shot down the aim line.
  G.sound.shot(); addWanted(G, G.wanted === 0 ? 1 : 0);
  let bestT = 430, hitCar = null, hitPed = null;
  const targets = [...G.peds, ...G.officers].filter((q) => !q.dead).map((q) => ({ o: q, r: 11, car: false }));
  for (const c of G.cars) if (!c.dead && c !== p.car) targets.push({ o: c, r: c.w / 2, car: true });
  for (const t of targets) {
    const dx = t.o.x - p.x, dy = t.o.y - p.y;
    const proj = dx * Math.cos(a) + dy * Math.sin(a);
    if (proj < 0 || proj > bestT) continue;
    const perp = Math.abs(-dx * Math.sin(a) + dy * Math.cos(a));
    if (perp < t.r) { bestT = proj; if (t.car) { hitCar = t.o; hitPed = null; } else { hitPed = t.o; hitCar = null; } }
  }
  const ex = p.x + Math.cos(a) * bestT, ey = p.y + Math.sin(a) * bestT;
  G.tracers.push({ x1: p.x + Math.cos(a) * 16, y1: p.y + Math.sin(a) * 16, x2: ex, y2: ey, t: 0.09 });
  if (hitPed) {
    hitPed.health -= 22; addSpark(G, hitPed.x, hitPed.y, '#ffd166', 5);
    if (hitPed.health <= 0) { hitPed.dead = true; addWanted(G, hitPed.officer ? 2 : 1); }
  } else if (hitCar) {
    hitCar.health -= 20; addSpark(G, ex, ey, '#ffd166', 6);
    if (hitCar.health <= 0) { hitCar.dead = true; if (hitCar.kind === 'police') addWanted(G, 1); }
    if (hitCar.kind === 'traffic') hitCar.kind = 'parked';
  }
  scarePeds(G, p.x, p.y, 230);
}

function updatePickupsAndTaxi(G, dt) {
  const p = G.player;
  for (const c of G.crates) {
    if (Math.hypot(c.x - p.x, c.y - p.y) < 30) {
      G.money += 40; G.rep += 1; G.sound.pickup();
      showToast(G, 'Street crate: +$40');
      Object.assign(c, newSideCrate(G));
    }
  }
  G.taxiCooldown -= dt;
  if (p.car && !G.taxiTarget && G.taxiCooldown <= 0 && Math.abs(p.car.speed) < 30) {
    for (const ped of G.peds) {
      if (!ped.dead && Math.hypot(ped.x - p.x, ped.y - p.y) < 48) {
        G.peds = G.peds.filter((q) => q !== ped);
        const tx = Math.max(120, Math.min(WORLD_W - 120, p.x + (G.rng() - 0.5) * 1800));
        const ty = Math.max(120, Math.min(WORLD_H - 120, p.y + (G.rng() - 0.5) * 1400));
        G.taxiTarget = { x: tx, y: ty };
        showToast(G, 'Taxi fare! Take your passenger to the cyan ring.');
        G.sound.pickup(); break;
      }
    }
  }
  if (G.taxiTarget && p.car && Math.hypot(G.taxiTarget.x - p.x, G.taxiTarget.y - p.y) < 72) {
    const fare = 90 + Math.floor(G.rng() * 80);
    G.money += fare; G.rep += 2; G.sound.cash();
    showToast(G, 'Fare paid: +$' + fare + ' — five stars, no questions.');
    G.taxiTarget = null; G.taxiCooldown = 18;
  }
}

function updateMission(G, dt) {
  const m = G.mission, p = G.player;
  if (!m) return;
  if (m.timer) {
    G.missionTimer -= dt;
    if (G.missionTimer <= 0) {
      showToast(G, 'Out of time — the delivery window reopens. Try again!');
      G.missionTimer = m.timer; addWanted(G, 0);
    }
  }
  if (m.crates) {
    m.crates.forEach((c, i) => {
      if (G.cratesTaken.includes(i)) return;
      if (Math.hypot(c.x - p.x, c.y - p.y) < 36) {
        G.cratesTaken.push(i); G.sound.pickup();
        showToast(G, 'Crate recovered (' + G.cratesTaken.length + '/3)');
        if (G.cratesTaken.length === 2) addWanted(G, 1);
      }
    });
    if (G.cratesTaken.length >= m.crates.length) completeMission(G);
    return;
  }
  const mark = missionMarker(m, G);
  if (!mark) return;
  const d = Math.hypot(mark.x - p.x, mark.y - p.y);
  if (d < 58 && (!m.needsCar || p.car)) completeMission(G);
  else if (d < 58 && m.needsCar) showToastOnce(G, 'This objective needs a car.');
}
let toastLatch = 0;
function showToastOnce(G, text) { if (G.time - toastLatch > 4) { toastLatch = G.time; showToast(G, text); } }

function completeMission(G) {
  const m = G.mission;
  G.money += m.reward; G.rep += 5; G.sound.missionDone();
  showToast(G, m.doneText + '  (+$' + m.reward + ')');
  G.missionIndex += 1;
  saveGame(G);
  if (G.missionIndex >= MISSIONS.length) {
    G.mission = null; G.storyDone = true; G.state = 'complete'; saveGame(G);
  } else assignMission(G);
}

// ---------------- drawing ----------------

export function drawGame(ctx, G) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (G.state === 'start') { drawStartScreen(ctx, G); return; }
  const cam = G.cam;
  ctx.save(); ctx.translate(-cam.x, -cam.y);
  drawWorld(ctx, G, cam);
  // Side crates.
  for (const c of G.crates) {
    ctx.fillStyle = '#b08900'; ctx.fillRect(c.x - 9, c.y - 9 + Math.sin(G.time * 3 + c.phase) * 2, 18, 18);
    ctx.fillStyle = '#ffd60a'; ctx.fillRect(c.x - 9, c.y - 11 + Math.sin(G.time * 3 + c.phase) * 2, 18, 4);
  }
  // Mission crates and target beacon.
  if (G.mission) {
    if (G.mission.crates) G.mission.crates.forEach((c, i) => {
      if (G.cratesTaken.includes(i)) return;
      drawBeacon(ctx, G, c.x, c.y, '#ffd60a');
      ctx.fillStyle = '#8a5a00'; ctx.fillRect(c.x - 13, c.y - 13, 26, 26);
      ctx.fillStyle = '#ffd60a'; ctx.font = '800 12px system-ui'; ctx.textAlign = 'center'; ctx.fillText('?', c.x, c.y + 4);
    });
    else { const mark = missionMarker(G.mission, G); if (mark) drawBeacon(ctx, G, mark.x, mark.y, '#ffd60a'); }
  }
  if (G.taxiTarget) drawBeacon(ctx, G, G.taxiTarget.x, G.taxiTarget.y, '#00e5ff');
  for (const c of G.cars) if (c !== G.player.car) drawCar(ctx, c, G.time);
  for (const ped of G.peds) drawPerson(ctx, ped, G.time);
  for (const o of G.officers) drawPerson(ctx, o, G.time);
  if (G.player.car) drawCar(ctx, G.player.car, G.time);
  else drawPerson(ctx, G.player, G.time, true);
  // Player marker: a bobbing chevron so Mara is readable in any crowd.
  const focus = G.player.car || G.player;
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2.5;
  ctx.beginPath(); ctx.arc(focus.x, focus.y, (G.player.car ? 36 : 20) + Math.sin(G.time * 5) * 2.5, 0, 7); ctx.stroke();
  ctx.fillStyle = '#ffd60a';
  const bobY = focus.y - (G.player.car ? 52 : 34) + Math.sin(G.time * 5) * 3;
  ctx.beginPath(); ctx.moveTo(focus.x, bobY + 10); ctx.lineTo(focus.x - 8, bobY); ctx.lineTo(focus.x + 8, bobY); ctx.closePath(); ctx.fill();
  // Tracers and sparks.
  for (const t of G.tracers) { ctx.strokeStyle = 'rgba(255,230,120,0.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(t.x1, t.y1); ctx.lineTo(t.x2, t.y2); ctx.stroke(); }
  for (const s of G.sparks) { ctx.fillStyle = s.color; ctx.fillRect(s.x - 2, s.y - 2, 4, 4); }
  ctx.restore();
  drawObjectiveArrow(ctx, G, cam);
  drawHUD(ctx, G);
  drawDialog(ctx, G);
  if (G.state === 'pause') {
    ctx.fillStyle = 'rgba(8,10,24,0.66)'; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#fff'; ctx.font = '900 46px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW_W / 2, 340);
    ctx.font = '600 16px system-ui'; ctx.fillText('P — resume · Progress auto-saves every few seconds', VIEW_W / 2, 380);
  }
  if (G.state === 'busted' || G.state === 'wasted' || G.state === 'complete') drawEndScreen(ctx, G, G.state === 'complete' ? 'complete' : G.state);
  if (G.state === 'complete') G.endKind = 'complete';
}

function drawBeacon(ctx, G, x, y, color) {
  const grad = ctx.createLinearGradient(0, y - 190, 0, y);
  grad.addColorStop(0, 'rgba(255,214,10,0)'); grad.addColorStop(1, 'rgba(255,214,10,0.35)');
  ctx.fillStyle = color === '#ffd60a' ? grad : 'rgba(0,229,255,0.30)';
  ctx.fillRect(x - 12, y - 190, 24, 190);
  ctx.strokeStyle = color; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(x, y, 24 + Math.sin(G.time * 5) * 5, 0, 7); ctx.stroke();
  ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x, y, 6, 0, 7); ctx.fill();
}
