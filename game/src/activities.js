// Side activities for Solmaris Heat — Checkpoint Rush, hidden film reels
// and police roadblocks. Authored for the Round 3 recovery cycle.
// Everything here is deterministic and uses only the base game's systems.

import { makeCar } from './entities.js';

export const RACE_GATES = [
  { x: 852, y: 852 }, { x: 1236, y: 852 }, { x: 1236, y: 1236 },
  { x: 1620, y: 1236 }, { x: 1620, y: 1620 }, { x: 2004, y: 1620 },
  { x: 2388, y: 1620 }, { x: 2388, y: 2004 },
];
export const RACE_START = { x: 852, y: 852 };
export const RACE_REWARD = 600;
export const RACE_BONUS_SECONDS = 6;
export const RACE_START_SECONDS = 30;

export const REELS = [
  { x: 468, y: 468 }, { x: 852, y: 468 }, { x: 1620, y: 468 }, { x: 2388, y: 468 },
  { x: 3156, y: 852 }, { x: 468, y: 1236 }, { x: 852, y: 1620 }, { x: 1236, y: 2004 },
  { x: 2004, y: 852 }, { x: 2772, y: 1236 }, { x: 3540, y: 468 }, { x: 468, y: 2004 },
  { x: 1620, y: 2004 }, { x: 2388, y: 2388 }, { x: 3156, y: 1620 }, { x: 852, y: 2388 },
  { x: 2004, y: 2388 }, { x: 2772, y: 2004 }, { x: 1236, y: 852 }, { x: 3540, y: 1236 },
];
export const REEL_REWARD = 25;
export const REEL_SET_BONUS = 500;

const BEST_KEY = 'solmaris-heat-race-best-v1';

export function createActivities() {
  let best = 0;
  try { best = Number(localStorage.getItem(BEST_KEY)) || 0; } catch { best = 0; }
  return {
    race: { active: false, gate: 0, timer: 0, elapsed: 0, best, starts: 0 },
    reelsTaken: [],
    roadblocks: [],
  };
}

export function startRace(G) {
  // Restarting mid-race is a clean reset: gate, clock and elapsed all zeroed
  // together so a stale timer can never carry into the new attempt.
  const a = G.activities;
  a.race.active = true; a.race.gate = 0; a.race.timer = RACE_START_SECONDS; a.race.elapsed = 0;
  a.race.starts += 1;
  return a.race;
}

export function raceTarget(G) {
  const r = G.activities && G.activities.race;
  if (!r || !r.active) return null;
  return RACE_GATES[r.gate] || null;
}

function toast(G, text) { G.toast = text; G.toastT = 3.4; }

export function updateActivities(G, dt) {
  const a = G.activities; if (!a) return;
  const p = G.player;
  // Hidden film reels: walk or drive through one to collect it.
  REELS.forEach((reel, i) => {
    if (a.reelsTaken.includes(i)) return;
    if (Math.hypot(reel.x - p.x, reel.y - p.y) < 34) {
      a.reelsTaken.push(i); G.money += REEL_REWARD; G.sound.pickup();
      if (a.reelsTaken.length >= REELS.length) {
        G.money += REEL_SET_BONUS;
        toast(G, 'All 20 film reels found! Full-set bonus: +$' + REEL_SET_BONUS);
      } else {
        toast(G, 'Film reel ' + a.reelsTaken.length + '/20: +$' + REEL_REWARD);
      }
    }
  });
  // Checkpoint Rush: press R near the start gate, or it arms on approach in a car.
  if (!a.race.active && p.car && Math.hypot(RACE_START.x - p.x, RACE_START.y - p.y) < 72) {
    startRace(G); toast(G, 'Checkpoint Rush! 8 gates — each gate adds +6s.');
  }
  if (a.race.active) {
    a.race.timer -= dt; a.race.elapsed += dt;
    if (a.race.timer <= 0) {
      a.race.active = false;
      toast(G, 'Checkpoint Rush — out of time. Drive to the start gate to retry.');
    } else {
      const gate = RACE_GATES[a.race.gate];
      if (gate && Math.hypot(gate.x - p.x, gate.y - p.y) < 78) {
        a.race.gate += 1; a.race.timer += RACE_BONUS_SECONDS; G.sound.pickup();
        if (a.race.gate >= RACE_GATES.length) {
          a.race.active = false; G.money += RACE_REWARD; G.rep += 4; G.sound.cash();
          const t = Math.round(a.race.elapsed * 10) / 10;
          if (!a.race.best || t < a.race.best) {
            a.race.best = t;
            try { localStorage.setItem(BEST_KEY, String(t)); } catch { /* offline play still works */ }
          }
          toast(G, 'Checkpoint Rush complete in ' + t + 's! +$' + RACE_REWARD);
        } else {
          toast(G, 'Gate ' + a.race.gate + '/8 — +6s');
        }
      }
    }
  }
  updateRoadblocks(G);
}

export function updateRoadblocks(G) {
  const a = G.activities; if (!a) return;
  const live = a.roadblocks.filter((c) => !c.dead && G.cars.includes(c));
  a.roadblocks = live;
  if (G.wanted >= 4 && live.length === 0) {
    const p = G.player;
    const bx = Math.max(90, Math.min(3750, p.x + 190));
    const by = Math.max(90, Math.min(2470, p.y));
    for (const off of [-30, 30]) {
      const cop = makeCar(bx, by + off, Math.PI / 2, 'police', G.rng);
      cop.roadblock = true; cop.speed = 0;
      G.cars.push(cop); a.roadblocks.push(cop);
    }
    toast(G, 'Police roadblock ahead!');
  }
  if (G.wanted < 4) {
    for (const c of live) c.dead = true;
    a.roadblocks = [];
  }
}

export function drawActivities(ctx, G) {
  const a = G.activities; if (!a) return;
  // Film reels: a small spinning canister with sprocket holes.
  REELS.forEach((reel, i) => {
    if (a.reelsTaken.includes(i)) return;
    const bob = Math.sin(G.time * 3 + i) * 3;
    ctx.save(); ctx.translate(reel.x, reel.y + bob);
    ctx.fillStyle = '#14213d'; ctx.beginPath(); ctx.arc(0, 0, 13, 0, 7); ctx.fill();
    ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.fillStyle = '#ffd60a';
    for (let k = 0; k < 5; k++) { const ang = k / 5 * Math.PI * 2 + G.time; ctx.beginPath(); ctx.arc(Math.cos(ang) * 7, Math.sin(ang) * 7, 2.2, 0, 7); ctx.fill(); }
    ctx.restore();
  });
  // Race gates: checkered rings, the current one pulsing gold.
  RACE_GATES.forEach((gate, i) => {
    if (!a.race.active && i !== 0) return;
    const current = a.race.active && a.race.gate === i;
    ctx.strokeStyle = current ? '#ffd60a' : 'rgba(255,255,255,0.75)';
    ctx.lineWidth = current ? 5 : 3;
    ctx.beginPath(); ctx.arc(gate.x, gate.y, current ? 34 + Math.sin(G.time * 6) * 5 : 28, 0, 7); ctx.stroke();
    ctx.fillStyle = current ? '#ffd60a' : '#fff'; ctx.font = '800 13px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(String(i + 1), gate.x, gate.y + 5);
  });
}
