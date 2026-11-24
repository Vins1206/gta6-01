// World rendering: sun-soaked top-down Solmaris — sea, sand, avenues,
// pastel rooftops, palms, cars with glass and lights, and little people.

import { WORLD_W, WORLD_H, ROAD_PITCH, ROAD_W, COLORS, DISTRICTS } from './config.js';
import { roadCentersX, roadCentersY, isWater } from './city.js';

function rect(ctx, x, y, w, h, fill) { ctx.fillStyle = fill; ctx.fillRect(x, y, w, h); }

export function drawWorld(ctx, G, cam) {
  const x0 = Math.max(0, cam.x - 40), y0 = Math.max(0, cam.y - 40);
  const x1 = Math.min(WORLD_W, cam.x + cam.w + 40), y1 = Math.min(WORLD_H, cam.y + cam.h + 40);
  // Ground: grass base, then sea and beach in the south-east.
  rect(ctx, x0, y0, x1 - x0, y1 - y0, COLORS.grass);
  ctx.fillStyle = COLORS.water;
  ctx.beginPath();
  ctx.moveTo(2950, 1750);
  for (let y = 1750; y <= WORLD_H; y += 80) ctx.lineTo(2950 + Math.max(0, 420 - (y - 1750) * 0.7) + Math.sin(y * 0.02 + G.time) * 8, y);
  ctx.lineTo(WORLD_W, WORLD_H); ctx.lineTo(WORLD_W, 1750); ctx.closePath(); ctx.fill();
  ctx.fillStyle = COLORS.sand;
  ctx.beginPath();
  ctx.moveTo(2800, 1600);
  for (let y = 1600; y <= WORLD_H; y += 80) ctx.lineTo(2800 + Math.max(0, 260 - (y - 1600) * 0.7), y);
  ctx.lineTo(WORLD_W, WORLD_H); ctx.lineTo(WORLD_W, 1600); ctx.closePath(); ctx.fill();
  // Animated wave sparkles.
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 40; i++) {
    const wx = 3050 + ((i * 173) % 720), wy = 1850 + ((i * 211) % 620);
    if (isWater(wx, wy)) ctx.fillRect(wx + Math.sin(G.time * 1.4 + i) * 6, wy, 22, 3);
  }
  // Marina boats: nine little hulls bobbing on the water.
  for (let i = 0; i < 9; i++) {
    const bx = 3180 + (i % 3) * 190, by = 1980 + Math.floor(i / 3) * 190 + Math.sin(G.time * 1.2 + i) * 4;
    if (bx > x0 && bx < x1 && by > y0 && by < y1 && isWater(bx, by)) {
      ctx.fillStyle = i % 2 ? '#f4f1de' : '#ef6f6c'; ctx.fillRect(bx - 20, by - 7, 40, 14);
      ctx.fillStyle = '#263238'; ctx.fillRect(bx - 4, by - 16, 8, 10);
      ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fillRect(bx + 6, by - 3, 10, 3);
    }
  }
  // Beach umbrellas: sixteen bright dots of shade along the sand.
  for (let i = 0; i < 16; i++) {
    const ux = 2880 + (i * 53) % 300, uy = 1660 + i * 52;
    if (ux > x0 && ux < x1 && uy > y0 && uy < y1) {
      ctx.fillStyle = ['#ef476f', '#ffd166', '#06d6a0', '#118ab2'][i % 4];
      ctx.beginPath(); ctx.arc(ux, uy, 11, Math.PI, 0); ctx.fill();
      ctx.strokeStyle = '#7a5230'; ctx.beginPath(); ctx.moveTo(ux, uy); ctx.lineTo(ux, uy + 9); ctx.stroke();
    }
  }
  // Parks.
  for (const p of G.city.parks) { if (p.x + p.w > x0 && p.x < x1 && p.y + p.h > y0 && p.y < y1) { rect(ctx, p.x, p.y, p.w, p.h, COLORS.park); rect(ctx, p.x + 16, p.y + 16, p.w - 32, p.h - 32, '#5db364'); } }
  drawRoads(ctx, x0, y0, x1, y1);
  // Sidewalk blocks under buildings.
  for (let bx = 32; bx < WORLD_W; bx += ROAD_PITCH) for (let by = 32; by < WORLD_H; by += ROAD_PITCH) {
    if (bx + ROAD_PITCH > x0 && bx < x1 && by + ROAD_PITCH > y0 && by < y1) {
      if (bx > 2700 && by > 1500) continue;
      rect(ctx, bx + ROAD_W - 8, by + ROAD_W - 8, ROAD_PITCH - ROAD_W + 16, ROAD_PITCH - ROAD_W + 16, COLORS.sidewalk);
    }
  }
  for (const b of G.city.buildings) if (b.x + b.w > x0 && b.x < x1 && b.y + b.h > y0 && b.y < y1) drawBuilding(ctx, b);
  for (const p of G.city.palms) if (p.x > x0 && p.x < x1 && p.y > y0 && p.y < y1) drawPalm(ctx, p.x, p.y, p.s);
  for (const l of G.city.lamps) if (l.x > x0 && l.x < x1 && l.y > y0 && l.y < y1) { ctx.fillStyle = '#5b5f66'; ctx.fillRect(l.x - 2, l.y - 2, 4, 4); ctx.fillStyle = '#ffe9a3'; ctx.beginPath(); ctx.arc(l.x, l.y, 3, 0, 7); ctx.fill(); }
  // District names painted on the ground.
  ctx.font = '700 21px system-ui, sans-serif'; ctx.textAlign = 'center';
  for (const d of DISTRICTS) if (d.x > x0 && d.x < x1 && d.y > y0 && d.y < y1) { ctx.fillStyle = 'rgba(255,255,255,0.5)'; ctx.fillText(d.name, d.x, d.y); }
}

function drawRoads(ctx, x0, y0, x1, y1) {
  ctx.fillStyle = COLORS.road;
  for (const cx of roadCentersX()) ctx.fillRect(cx - ROAD_W / 2, y0, ROAD_W, y1 - y0);
  for (const cy of roadCentersY()) ctx.fillRect(x0, cy - ROAD_W / 2, x1 - x0, ROAD_W);
  ctx.strokeStyle = COLORS.lane; ctx.lineWidth = 3; ctx.setLineDash([22, 20]);
  ctx.beginPath();
  for (const cx of roadCentersX()) { ctx.moveTo(cx, y0); ctx.lineTo(cx, y1); }
  for (const cy of roadCentersY()) { ctx.moveTo(x0, cy); ctx.lineTo(x1, cy); }
  ctx.stroke(); ctx.setLineDash([]);
  // Crosswalks at intersections.
  ctx.fillStyle = 'rgba(232,232,232,0.75)';
  for (const cx of roadCentersX()) for (const cy of roadCentersY()) {
    if (cx < x0 - 80 || cx > x1 + 80 || cy < y0 - 80 || cy > y1 + 80) continue;
    for (let i = -2; i <= 2; i++) { ctx.fillRect(cx - ROAD_W / 2 - 10, cy + i * 16 - 4, 8, 8); ctx.fillRect(cx + ROAD_W / 2 + 2, cy + i * 16 - 4, 8, 8); }
  }
}

function drawBuilding(ctx, b) {
  ctx.fillStyle = COLORS.roofShadow; ctx.fillRect(b.x + 9, b.y + 11, b.w, b.h);
  rect(ctx, b.x, b.y, b.w, b.h, b.trim);
  rect(ctx, b.x + 5, b.y + 5, b.w - 10, b.h - 10, b.color);
  // Rooftop details: AC boxes, skylight, water tank — seeded per building.
  const s = b.seed;
  ctx.fillStyle = 'rgba(0,0,0,0.16)';
  ctx.fillRect(b.x + 14 + (s % 40), b.y + 14, 26, 18);
  ctx.fillRect(b.x + b.w - 44, b.y + b.h - 34 - (s % 20), 24, 16);
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.fillRect(b.x + b.w / 2 - 16, b.y + b.h / 2 - 10, 32, 20);
  // Sunlit window strips catching the sunset on the facade.
  ctx.fillStyle = 'rgba(255,214,110,0.42)';
  for (let i = 0; i < 3; i++) ctx.fillRect(b.x + 10 + i * 22 + (s % 7), b.y + 8, 12, 4);
  ctx.fillRect(b.x + 10, b.y + b.h - 14, b.w - 20, 3);
  ctx.fillStyle = 'rgba(0,0,0,0.10)';
  for (let i = 0; i < b.floors; i++) ctx.fillRect(b.x + 8, b.y + 10 + i * 13, 5, 5);
  if (b.shop) {
    rect(ctx, b.x + 8, b.y + b.h - 24, b.w - 16, 17, '#263238');
    ctx.fillStyle = '#ffd166'; ctx.font = '700 10px system-ui, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(b.shop.toUpperCase(), b.x + b.w / 2, b.y + b.h - 12);
    rect(ctx, b.x + 8, b.y + b.h - 29, b.w - 16, 5, '#ef476f');
  }
}

export function drawPalm(ctx, x, y, s = 1) {
  ctx.strokeStyle = '#7a5230'; ctx.lineWidth = 4 * s;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 4 * s, y - 6 * s); ctx.stroke();
  ctx.strokeStyle = '#2e8b57'; ctx.lineWidth = 3 * s;
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + 0.4;
    ctx.beginPath(); ctx.moveTo(x + 4 * s, y - 6 * s);
    ctx.quadraticCurveTo(x + 4 * s + Math.cos(a) * 13 * s, y - 6 * s + Math.sin(a) * 9 * s - 4, x + 4 * s + Math.cos(a) * 19 * s, y - 6 * s + Math.sin(a) * 13 * s + 3);
    ctx.stroke();
  }
}

export function drawCar(ctx, car, time) {
  ctx.save(); ctx.translate(car.x, car.y); ctx.rotate(car.angle);
  ctx.fillStyle = 'rgba(15,12,30,0.30)'; ctx.fillRect(-car.w / 2 + 4, -car.h / 2 + 6, car.w, car.h);
  ctx.fillStyle = '#191919';
  for (const [wx, wy] of [[-car.w / 4, -car.h / 2 - 2], [car.w / 4, -car.h / 2 - 2], [-car.w / 4, car.h / 2 - 1], [car.w / 4, car.h / 2 - 1]]) ctx.fillRect(wx - 6, wy, 12, 4);
  ctx.fillStyle = car.dead ? '#3a3a3a' : car.color;
  roundRect(ctx, -car.w / 2, -car.h / 2, car.w, car.h, 7); ctx.fill();
  ctx.fillStyle = 'rgba(160,225,255,0.9)';
  roundRect(ctx, car.w * 0.06, -car.h / 2 + 4, car.w * 0.20, car.h - 8, 3); ctx.fill();
  ctx.fillStyle = 'rgba(30,40,60,0.85)';
  roundRect(ctx, -car.w * 0.28, -car.h / 2 + 4, car.w * 0.22, car.h - 8, 3); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.20)'; ctx.fillRect(-car.w / 2 + 3, -car.h / 2 + 2, car.w - 6, 3);
  // Headlights and brake lights.
  ctx.fillStyle = '#fff7ae'; ctx.fillRect(car.w / 2 - 3, -car.h / 2 + 3, 3, 5); ctx.fillRect(car.w / 2 - 3, car.h / 2 - 8, 3, 5);
  ctx.fillStyle = car.brake ? '#ff2222' : '#a31621'; ctx.fillRect(-car.w / 2, -car.h / 2 + 3, 3, 5); ctx.fillRect(-car.w / 2, car.h / 2 - 8, 3, 5);
  if (car.taxi) { ctx.fillStyle = '#111'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center'; ctx.fillText('TAXI', 0, 3); }
  if (car.kind === 'police') {
    ctx.fillStyle = '#1d3557'; ctx.fillRect(-car.w / 2, -car.h / 2, car.w, 5); ctx.fillRect(-car.w / 2, car.h / 2 - 5, car.w, 5);
    ctx.fillStyle = '#fff'; ctx.font = '700 8px system-ui'; ctx.textAlign = 'center'; ctx.fillText('POLICIA SOLMARIS', 0, 3);
    const flash = Math.sin(time * 10 + car.sirenPhase) > 0;
    ctx.fillStyle = flash ? '#ff2b2b' : '#2255ff';
    ctx.beginPath(); ctx.arc(-4, 0, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = flash ? '#2255ff' : '#ff2b2b';
    ctx.beginPath(); ctx.arc(5, 0, 4.5, 0, 7); ctx.fill();
    ctx.fillStyle = flash ? 'rgba(255,43,43,0.20)' : 'rgba(34,85,255,0.20)';
    ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fill();
  }
  if (car.dead) { ctx.fillStyle = 'rgba(40,40,40,0.5)'; ctx.beginPath(); ctx.arc(-6, -4, 9 + Math.sin(time * 3) * 2, 0, 7); ctx.fill(); }
  ctx.restore();
}

export function drawPerson(ctx, p, time, isPlayer = false) {
  const bob = p.dead ? 0 : Math.sin(p.phase || 0) * 1.6;
  ctx.save(); ctx.translate(p.x, p.y);
  ctx.fillStyle = 'rgba(15,12,30,0.25)'; ctx.beginPath(); ctx.ellipse(2, 4, 9, 5, 0, 0, 7); ctx.fill();
  if (p.dead) {
    ctx.rotate(Math.PI / 2); ctx.fillStyle = p.shirt; roundRect(ctx, -10, -5, 20, 10, 4); ctx.fill();
    ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(13, 0, 5, 0, 7); ctx.fill(); ctx.restore(); return;
  }
  ctx.rotate(p.angle);
  ctx.strokeStyle = '#2b2d42'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.moveTo(-2, -3); ctx.lineTo(-2 + bob, -8); ctx.moveTo(-2, 3); ctx.lineTo(-2 - bob, 8); ctx.stroke();
  ctx.fillStyle = p.shirt; roundRect(ctx, -7, -6, 13, 12, 5); ctx.fill();
  if (p.officer) { ctx.fillStyle = '#ffd166'; ctx.fillRect(2, -6, 3, 12); }
  if (isPlayer) { ctx.fillStyle = '#ef476f'; roundRect(ctx, -7, -6, 13, 12, 5); ctx.fill(); ctx.fillStyle = '#ffd166'; ctx.fillRect(-7, -2, 13, 4); }
  ctx.fillStyle = p.skin; ctx.beginPath(); ctx.arc(7, 0, 5.4, 0, 7); ctx.fill();
  ctx.fillStyle = isPlayer ? '#14213d' : '#3a2e2a'; ctx.beginPath(); ctx.arc(8.5, 0, 4.2, Math.PI * 0.6, Math.PI * 1.7); ctx.fill();
  ctx.restore();
  if (p.officer) { ctx.fillStyle = '#1d3557'; ctx.beginPath(); ctx.arc(p.x, p.y - 1, 3, 0, 7); ctx.fill(); }
}

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
