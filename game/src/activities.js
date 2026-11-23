// Side activities for Solmaris Heat: hidden film-reel packages scattered
// over the city, and the Checkpoint Rush — a timed street race through
// glowing gates that pays for clean, fast driving.

import { WORLD_W, WORLD_H } from './config.js';
import { isWater, pointInRects } from './city.js';

export const PACKAGE_TOTAL = 20;

export function scatterPackages(G) {
  const out = [];
  let guard = 0;
  while (out.length < PACKAGE_TOTAL && guard++ < 600) {
    const x = 90 + G.rng() * (WORLD_W - 180), y = 90 + G.rng() * (WORLD_H - 180);
    if (isWater(x, y) || pointInRects(x, y, G.city.buildings, 4)) continue;
    if (out.some((p) => Math.hypot(p.x - x, p.y - y) < 260)) continue;
    out.push({ x, y, taken: false, phase: G.rng() * 6.28 });
  }
  return out;
}

// The Rush: eight gates from Sunset Strip, over Centro, to the Harbor.
export const RACE_GATES = [
  { x: 852, y: 1236 }, { x: 1236, y: 852 }, { x: 2004, y: 852 },
  { x: 2388, y: 1236 }, { x: 2388, y: 2004 }, { x: 1620, y: 2004 },
  { x: 852, y: 1620 }, { x: 468, y: 852 },
];
export const RACE_START = { x: 700, y: 1236 };
export const RACE_TIME = 115;

export function newRaceState() {
  return { active: false, gate: 0, timeLeft: 0, best: 0 };
}

export function updateActivities(G, dt, hooks) {
  // Hidden packages: walk or drive through a reel to collect it.
  for (const p of G.packages) {
    if (p.taken) continue;
    if (Math.hypot(p.x - G.player.x, p.y - G.player.y) < 30) {
      p.taken = true; G.packagesFound += 1; G.money += 25;
      hooks.onPackage(G.packagesFound);
    }
  }
  const race = G.race;
  if (!race.active) {
    // Standing on the start flag in a car arms the Rush (key R).
    const near = Math.hypot(RACE_START.x - G.player.x, RACE_START.y - G.player.y) < 64;
    if (near && G.player.car && G.input.justPressed('KeyR')) {
      race.active = true; race.gate = 0; race.timeLeft = RACE_TIME;
      hooks.onRaceStart();
    }
    return;
  }
  race.timeLeft -= dt;
  if (race.timeLeft <= 0) { race.active = false; hooks.onRaceFail(); return; }
  if (!G.player.car) { race.active = false; hooks.onRaceFail('onfoot'); return; }
  const gate = RACE_GATES[race.gate];
  if (gate && Math.hypot(gate.x - G.player.x, gate.y - G.player.y) < 74) {
    race.gate += 1; race.timeLeft += 6;
    hooks.onGate(race.gate, RACE_GATES.length);
    if (race.gate >= RACE_GATES.length) {
      race.active = false;
      const used = RACE_TIME + 6 * RACE_GATES.length - race.timeLeft;
      if (!race.best || used < race.best) race.best = Math.round(used);
      hooks.onRaceWin(Math.round(used));
    }
  }
}

export function raceTarget(G) {
  if (!G.race.active) return null;
  return RACE_GATES[G.race.gate] || null;
}
