// HUD, minimap, menus and dialog — everything the player reads.
// Drawn on the same canvas so screenshots show the full game at once.

import { VIEW_W, VIEW_H, WORLD_W, WORLD_H } from './config.js';
import { isWater, roadCentersX, roadCentersY } from './city.js';
import { roundRect } from './render.js';
import { missionMarker } from './missions.js';

export function drawMinimap(ctx, G) {
  const w = 218, h = 146, x = VIEW_W - w - 16, y = VIEW_H - h - 16;
  const sx = w / WORLD_W, sy = h / WORLD_H;
  ctx.save();
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = '#57a75a'; roundRect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.fillStyle = '#1b7f9e'; ctx.fillRect(x + 2950 * sx, y + 1750 * sy, w - 2950 * sx, h - 1750 * sy);
  ctx.fillStyle = '#ecd28a'; ctx.fillRect(x + 2800 * sx, y + 1600 * sy, 12, h - 1600 * sy);
  ctx.strokeStyle = '#33373f'; ctx.lineWidth = 3;
  ctx.beginPath();
  for (const cx of roadCentersX()) { ctx.moveTo(x + cx * sx, y); ctx.lineTo(x + cx * sx, y + h); }
  for (const cy of roadCentersY()) { ctx.moveTo(x, y + cy * sy); ctx.lineTo(x + w, y + cy * sy); }
  ctx.stroke();
  const mark = missionMarker(G.mission, G);
  if (mark) {
    ctx.fillStyle = '#ffd60a';
    ctx.beginPath(); ctx.arc(x + mark.x * sx, y + mark.y * sy, 5 + Math.sin(G.time * 5) * 1.5, 0, 7); ctx.fill();
    ctx.strokeStyle = '#111'; ctx.lineWidth = 1.5; ctx.stroke();
  }
  for (const c of G.cars) {
    if (c.kind === 'police' && !c.dead) { ctx.fillStyle = Math.sin(G.time * 9) > 0 ? '#ff2b2b' : '#2255ff'; ctx.fillRect(x + c.x * sx - 2, y + c.y * sy - 2, 4, 4); }
  }
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + G.player.x * sx, y + G.player.y * sy, 3.6, 0, 7); ctx.fill();
  ctx.strokeStyle = '#ef476f'; ctx.lineWidth = 2; ctx.stroke();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 2; roundRect(ctx, x, y, w, h, 10); ctx.stroke();
  ctx.fillStyle = '#fff'; ctx.font = '700 10px system-ui'; ctx.textAlign = 'left'; ctx.fillText('SOLMARIS', x + 8, y + 15);
  ctx.restore();
}

export function drawHUD(ctx, G) {
  const p = G.player;
  // Top-left: health, armor of the story — money and mission.
  panel(ctx, 16, 16, 342, 96);
  ctx.fillStyle = '#fff'; ctx.font = '800 17px system-ui'; ctx.textAlign = 'left';
  ctx.fillText('SOLMARIS HEAT', 30, 42);
  ctx.font = '600 13px system-ui'; ctx.fillStyle = '#ffd166';
  ctx.fillText('$ ' + Math.floor(G.money).toLocaleString('en-US'), 30, 66);
  ctx.fillStyle = '#9bf00b'; ctx.fillText('REP ' + G.rep, 130, 66);
  ctx.fillStyle = '#e8e8e8'; ctx.font = '600 12px system-ui';
  ctx.fillText(G.player.car ? 'Driving: ' + G.player.car.model.name : 'On foot — E enters a car', 30, 88);
  // Health bar.
  ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(30, 94, 150, 8);
  ctx.fillStyle = p.health > 30 ? '#06d6a0' : '#ef476f'; ctx.fillRect(30, 94, Math.max(0, p.health) * 1.5, 8);
  // Top-right: wanted stars.
  const wx = VIEW_W - 236;
  panel(ctx, wx, 16, 220, 62);
  ctx.font = '24px system-ui'; ctx.textAlign = 'left';
  for (let i = 0; i < 5; i++) {
    ctx.fillStyle = i < G.wanted ? (Math.sin(G.time * 6) > 0 || G.wanted < 4 ? '#ffd60a' : '#ff9f1c') : 'rgba(255,255,255,0.22)';
    ctx.fillText('★', wx + 16 + i * 30, 54);
  }
  ctx.fillStyle = '#fff'; ctx.font = '700 11px system-ui';
  ctx.fillText(G.wanted === 0 ? 'WANTED — CLEAR' : 'WANTED LEVEL ' + G.wanted, wx + 16, 30);
  if (G.wanted > 0) { ctx.fillStyle = '#ffd166'; ctx.fillText('Heat cools when unseen: ' + Math.ceil(G.heatCool) + 's', wx + 16, 70); }
  // Mission objective banner, top centre.
  if (G.mission) {
    const text = '◆ ' + G.mission.objective;
    ctx.font = '700 14px system-ui';
    const tw = Math.min(560, ctx.measureText(text).width + 36);
    panel(ctx, (VIEW_W - tw) / 2, 16, tw, 52);
    ctx.fillStyle = '#ffd60a'; ctx.textAlign = 'center';
    ctx.fillText(G.mission.title, VIEW_W / 2, 38);
    ctx.fillStyle = '#fff'; ctx.font = '600 12.5px system-ui';
    ctx.fillText(text, VIEW_W / 2, 58);
    if (G.missionTimer > 0) {
      ctx.fillStyle = 'rgba(10,14,28,0.82)'; roundRect(ctx, VIEW_W / 2 - 44, 74, 88, 26, 13); ctx.fill();
      ctx.fillStyle = G.missionTimer < 25 ? '#ef476f' : '#ffd166'; ctx.font = '800 15px system-ui';
      ctx.fillText('⏱ ' + Math.ceil(G.missionTimer) + 's', VIEW_W / 2, 93);
    }
  }
  // Bottom-left: context help / speed.
  panel(ctx, 16, VIEW_H - 64, 430, 48);
  ctx.fillStyle = '#e8e8e8'; ctx.font = '600 12px system-ui'; ctx.textAlign = 'left';
  const help = G.player.car
    ? 'WASD drive · SPACE handbrake · E exit car · M mute'
    : 'WASD move · SHIFT run · E steal / enter car · Click or F fight · P pause';
  ctx.fillText(help, 28, VIEW_H - 36);
  if (G.player.car) { ctx.fillStyle = '#ffd166'; ctx.font = '800 14px system-ui'; ctx.textAlign = 'right'; ctx.fillText(Math.round(Math.abs(G.player.car.speed) * 0.36) + ' km/h', 438, VIEW_H - 36); ctx.textAlign = 'left'; }
  if (G.bustMeter > 0.02 && !G.player.car) {
    ctx.fillStyle = '#ef476f'; ctx.font = '800 16px system-ui'; ctx.textAlign = 'center';
    ctx.fillText('POLICE ARE GRABBING YOU — RUN!', VIEW_W / 2, 120);
    ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(VIEW_W / 2 - 110, 130, 220, 10);
    ctx.fillStyle = '#ef476f'; ctx.fillRect(VIEW_W / 2 - 110, 130, G.bustMeter * 220, 10);
  }
  if (G.toast) {
    ctx.globalAlpha = Math.min(1, G.toastT);
    ctx.fillStyle = '#14213d'; roundRect(ctx, VIEW_W / 2 - 260, VIEW_H - 138, 520, 40, 9); ctx.fill();
    ctx.fillStyle = '#ffd166'; ctx.font = '700 14px system-ui'; ctx.textAlign = 'center';
    ctx.fillText(G.toast, VIEW_W / 2, VIEW_H - 112);
    ctx.globalAlpha = 1;
  }
  drawMinimap(ctx, G);
}

export function drawDialog(ctx, G) {
  if (!G.dialog) return;
  const [who, line] = G.dialog;
  ctx.fillStyle = 'rgba(10,14,28,0.88)'; roundRect(ctx, 240, VIEW_H - 178, 800, 78, 12); ctx.fill();
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; roundRect(ctx, 240, VIEW_H - 178, 800, 78, 12); ctx.stroke();
  ctx.fillStyle = '#ffd166'; ctx.font = '800 14px system-ui'; ctx.textAlign = 'left';
  ctx.fillText(who.toUpperCase(), 262, VIEW_H - 148);
  ctx.fillStyle = '#fff'; ctx.font = '600 15.5px system-ui';
  ctx.fillText(line, 262, VIEW_H - 122);
  ctx.fillStyle = '#9ad1ff'; ctx.font = '600 11px system-ui'; ctx.fillText('Click / Enter ▸', 950, VIEW_H - 110);
}

export function drawObjectiveArrow(ctx, G, cam) {
  const mark = missionMarker(G.mission, G);
  if (!mark || G.state !== 'play') return;
  const sx = G.player.x - cam.x, sy = G.player.y - cam.y;
  const dx = mark.x - G.player.x, dy = mark.y - G.player.y;
  const d = Math.hypot(dx, dy);
  if (d < 60) {
    ctx.strokeStyle = '#ffd60a'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(mark.x - cam.x, mark.y - cam.y, 26 + Math.sin(G.time * 5) * 5, 0, 7); ctx.stroke();
    return;
  }
  const a = Math.atan2(dy, dx);
  const ax = Math.max(50, Math.min(VIEW_W - 50, sx + Math.cos(a) * 110));
  const ay = Math.max(90, Math.min(VIEW_H - 90, sy + Math.sin(a) * 110));
  ctx.save(); ctx.translate(ax, ay); ctx.rotate(a);
  ctx.fillStyle = '#ffd60a'; ctx.beginPath(); ctx.moveTo(16, 0); ctx.lineTo(-8, -9); ctx.lineTo(-8, 9); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.fillStyle = '#ffd60a'; ctx.font = '700 11px system-ui'; ctx.textAlign = 'center';
  ctx.fillText(Math.round(d / 10) + ' m', ax, ay - 16);
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(10,14,28,0.72)'; roundRect(ctx, x, y, w, h, 10); ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; roundRect(ctx, x, y, w, h, 10); ctx.stroke();
}

export function drawStartScreen(ctx, G) {
  const grad = ctx.createLinearGradient(0, 0, 0, VIEW_H);
  grad.addColorStop(0, '#2b1055'); grad.addColorStop(0.45, '#7597de'); grad.addColorStop(0.72, '#ff9a5a'); grad.addColorStop(1, '#ffd166');
  ctx.fillStyle = grad; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = '#ffdf6b'; ctx.beginPath(); ctx.arc(1020, 470, 86, 0, 7); ctx.fill();
  // Skyline silhouette with lit windows.
  ctx.fillStyle = '#1b1035';
  const towers = [[0, 300, 90, 220], [100, 240, 70, 280], [185, 330, 110, 190], [310, 200, 80, 320], [405, 290, 95, 230], [880, 260, 85, 260], [975, 180, 75, 340], [1060, 310, 100, 210], [1170, 230, 110, 290]];
  for (const [x, y, w, h] of towers) { ctx.fillRect(x, y, w, h); ctx.fillStyle = '#ffd166'; for (let i = 0; i < 14; i++) ctx.fillRect(x + 8 + ((i * 29) % (w - 16)), y + 12 + ((i * 47) % (h - 30)), 6, 8); ctx.fillStyle = '#1b1035'; }
  ctx.fillStyle = '#12081f'; ctx.fillRect(0, 520, VIEW_W, 200);
  ctx.fillStyle = '#ef476f'; ctx.fillRect(0, 520, VIEW_W, 6);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff'; ctx.font = '900 76px system-ui';
  ctx.shadowColor = 'rgba(239,71,111,0.8)'; ctx.shadowBlur = 24;
  ctx.fillText('SOLMARIS HEAT', VIEW_W / 2, 150);
  ctx.shadowBlur = 0;
  ctx.font = '600 19px system-ui'; ctx.fillStyle = '#ffe9a3';
  ctx.fillText('An original open-world city of sun, sirens and second chances', VIEW_W / 2, 188);
  ctx.font = '600 15px system-ui'; ctx.fillStyle = '#fff';
  ctx.fillText('Explore on foot and by car · Steal cars · Run missions · Shake the Policia Solmaris', VIEW_W / 2, 222);
  ctx.fillStyle = 'rgba(10,14,28,0.82)'; roundRect(ctx, 390, 552, 500, 118, 14); ctx.fill();
  ctx.fillStyle = '#ffd166'; ctx.font = '800 21px system-ui';
  ctx.fillText(G.hasSave ? 'ENTER — New story      C — Continue (saved)' : 'ENTER — Start Mara\u2019s story', VIEW_W / 2, 592);
  ctx.fillStyle = '#e8e8e8'; ctx.font = '600 13.5px system-ui';
  ctx.fillText('WASD move / drive · E enter & steal cars · SHIFT run · SPACE handbrake', VIEW_W / 2, 622);
  ctx.fillText('Mouse aim · Click / F fight & shoot · P pause · Progress auto-saves', VIEW_W / 2, 646);
  ctx.fillStyle = '#ffd166'; ctx.font = 'italic 600 13px system-ui';
  ctx.fillText('Chapter 1 awaits: Lina Corvo is drinking coffee at Coral Row, and she is not patient.', VIEW_W / 2, 268);
}

export function drawEndScreen(ctx, G, kind) {
  ctx.fillStyle = kind === 'busted' ? 'rgba(20,30,80,0.78)' : kind === 'wasted' ? 'rgba(90,10,20,0.78)' : 'rgba(8,50,30,0.80)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
  ctx.font = '900 64px system-ui';
  ctx.fillText(kind === 'busted' ? 'BUSTED' : kind === 'wasted' ? 'WASTED' : 'STORY COMPLETE', VIEW_W / 2, 300);
  ctx.font = '600 18px system-ui'; ctx.fillStyle = '#ffe9a3';
  const line = kind === 'busted' ? 'The Policia Solmaris got their photo. Bail costs $200.'
    : kind === 'wasted' ? 'Mara wakes up at Hospital del Mar. Treatment costs $150.'
    : 'Mara delivered the golden coupe and walked into the sunset a free woman.';
  ctx.fillText(line, VIEW_W / 2, 345);
  ctx.fillText('Free roam continues — the city, taxis and crates are all still yours.', VIEW_W / 2, 375);
  ctx.font = '800 20px system-ui'; ctx.fillStyle = '#ffd166';
  ctx.fillText('ENTER — Back to the streets', VIEW_W / 2, 440);
}
