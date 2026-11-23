// Bootstrap and screenshot setups for Solmaris Heat.
// Normal load shows the start screen. The ?shot=<name> URLs place the game
// in a real mid-action scene (used to take the entry's own screenshots);
// they drive the same systems — traffic, police, missions and HUD — with a
// fixed seed, never a staged picture.

import { createGame, startStory, drawGame, updateGame, assignMission } from './game.js';
import { makeCar } from './entities.js';
import { Input } from './input.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new Input(canvas);
const params = new URLSearchParams(location.search);
const shot = params.get('shot');

const G = createGame(input, 20261117);
window.__solmaris = G;

function snapCamera() {
  const f = G.player.car || G.player;
  G.cam.x = Math.max(0, Math.min(3840 - 1280, f.x - 640));
  G.cam.y = Math.max(0, Math.min(2560 - 720, f.y - 360));
}
function putPlayerInCar(x, y, angle, speed, color) {
  const car = G.cars.find((c) => c.kind === 'parked') || G.cars[0];
  car.x = x; car.y = y; car.angle = angle; car.speed = speed; car.kind = 'player';
  if (color) car.color = color;
  G.player.car = car; G.player.x = x; G.player.y = y;
  return car;
}
function addPolice(x, y, angle) {
  const cop = makeCar(x, y, angle, 'police', G.rng);
  G.cars.push(cop); return cop;
}
function settle(steps) { for (let i = 0; i < steps; i++) updateGame(G, 1 / 30); G.dialog = null; G.dialogQueue = []; }

if (shot) {
  G.state = 'play';
  if (shot === 'cover') {
    G.missionIndex = 2; assignMission(G);
    G.cratesTaken = [0]; G.money = 1450; G.rep = 15;
    putPlayerInCar(880, 880, 0, 165, '#e63946');
    addPolice(700, 845, 0); addPolice(640, 905, 0.2);
    G.wanted = 3; G.heatCool = 12;
    G.player.x = 880; G.player.y = 880;
  } else if (shot === 'foot') {
    G.missionIndex = 0; assignMission(G);
    G.dialog = ['Lina', 'Mara. You look almost retired. One week of driving — easy money.'];
    G.dialogQueue = [];
    G.player.x = 520; G.player.y = 612; G.money = 250;
  } else if (shot === 'chase') {
    G.missionIndex = 3; assignMission(G);
    G.money = 2300; G.rep = 22;
    putPlayerInCar(1080, 1252, 0, 215, '#3a86ff');
    addPolice(1470, 1225, 0); addPolice(1420, 1290, 0.1); addPolice(1560, 1330, -0.3);
    G.wanted = 4; G.heatCool = 12;
  } else if (shot === 'race') {
    G.missionIndex = 6; assignMission(G);
    G.money = 3900; G.rep = 44; G.packagesFound = 7;
    G.packages.slice(0, 7).forEach((p) => { p.taken = true; });
    putPlayerInCar(1480, 890, 0, 205, '#8338ec');
    addPolice(1290, 850, 0);
    G.race.active = true; G.race.gate = 2; G.race.timeLeft = 74;
    G.wanted = 1; G.heatCool = 12;
  } else if (shot === 'beach') {
    G.missionIndex = 4; assignMission(G);
    G.missionTimer = 96; G.money = 3150; G.rep = 31;
    putPlayerInCar(2620, 1648, 0, 185, '#ffd60a');
    addPolice(2440, 1615, 0);
    G.wanted = 2; G.heatCool = 12;
  }
  G.dialog = shot === 'foot' ? G.dialog : null;
  if (shot !== 'foot') G.dialogQueue = [];
  snapCamera();
  settle(shot === 'foot' ? 4 : 14);
  // Re-stage the chase cleanly after the settle steps: the live systems move
  // cars during those steps, so pin the final composition, heat and toast.
  if (shot !== 'foot') {
    const car = G.player.car;
    const keep = shot === 'cover' ? 2 : shot === 'chase' ? 3 : 1;
    const cops = G.cars.filter((c) => c.kind === 'police').slice(0, keep);
    G.cars = G.cars.filter((c) => c.kind !== 'police' || cops.includes(c));
    const spots = [[-195, -48], [-320, 22], [-235, 105]];
    cops.forEach((cop, i) => {
      const [dx, dy] = spots[i % spots.length];
      cop.x = car.x + dx; cop.y = car.y + dy; cop.angle = 0; cop.speed = 150; cop.dead = false;
    });
    car.speed = shot === 'cover' ? 165 : 195;
    G.wanted = shot === 'cover' ? 3 : shot === 'chase' ? 4 : shot === 'race' ? 1 : 2;
    G.heatCool = 12; G.bustMeter = 0; G.toast = ''; G.toastT = 0;
    G.player.health = 100;
  }
  snapCamera();
  if (shot === 'foot') G.dialog = ['Lina', 'Mara. You look almost retired. One week of driving — easy money.'];
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.033, (now - last) / 1000 || 0.016);
  last = now;
  if (!shot || shot === 'live') updateGame(G, dt);
  drawGame(ctx, G);
  input.endFrame();
  window.__ready = true;
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
