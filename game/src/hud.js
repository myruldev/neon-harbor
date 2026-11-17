// Neon Harbor — the HUD: money, health, wanted stars, clock, district,
// objective, speed, ammo, toast messages, and the live minimap.

import { WORLD, BLOCK, fmtMoney, fmtClock, districtAt } from './config.js';
import { wantedStars } from './entities.js';
import { currentMission, currentStep, missionMarker } from './missions.js';

function $(id) {
  return document.getElementById(id);
}

export function updateHUD(G) {
  const moneyEl = $('money');
  if (moneyEl) moneyEl.textContent = fmtMoney(G.money);
  const healthFill = $('health-fill');
  if (healthFill) {
    healthFill.style.width = Math.max(0, G.health) + '%';
    healthFill.style.background = G.health > 50 ? '#2ecc71' : G.health > 25 ? '#f39c12' : '#e74c3c';
  }
  const starsEl = $('stars');
  if (starsEl) {
    const s = wantedStars(G);
    starsEl.textContent = '\u2605'.repeat(s) + '\u2606'.repeat(5 - s);
    starsEl.classList.toggle('hot', s >= 3);
  }
  const clockEl = $('clock');
  if (clockEl) clockEl.textContent = fmtClock(G.time);
  const distEl = $('district');
  if (distEl) distEl.textContent = districtAt(G.player.x, G.player.y).name;
  const ammoEl = $('ammo');
  if (ammoEl) {
    ammoEl.style.display = G.pistol ? 'block' : 'none';
    ammoEl.textContent = 'Pistol \u2022 ' + G.ammo + ' ammo';
  }
  const speedEl = $('speed');
  if (speedEl) {
    if (G.player.inCar) {
      const kmh = Math.round(Math.abs(G.player.inCar.speed) * 0.28);
      speedEl.style.display = 'block';
      speedEl.textContent = kmh + ' km/h \u2022 ' + G.player.inCar.model.name;
    } else {
      speedEl.style.display = 'none';
    }
  }
  const objEl = $('objective');
  if (objEl) {
    const m = currentMission(G);
    const s = currentStep(G);
    if (m && G.missionActive && s) {
      objEl.innerHTML = `<b>${m.title}</b> — ${s.label}`;
      objEl.style.display = 'block';
    } else if (G.courier) {
      objEl.innerHTML = `<b>Courier</b> — deliver to ${G.courier.label} (${Math.ceil(G.courier.deadline)}s)`;
      objEl.style.display = 'block';
    } else if (m && !G.missionActive) {
      objEl.innerHTML = `<b>${m.title}</b> — press <b>Enter</b> to start the mission`;
      objEl.style.display = 'block';
    } else {
      objEl.style.display = 'none';
    }
  }
  const toastEl = $('toast');
  if (toastEl) {
    if (G.message && G.elapsed - G.messageAt < 4) {
      toastEl.textContent = G.message;
      toastEl.style.opacity = '1';
    } else {
      toastEl.style.opacity = '0';
    }
  }
  const bustedEl = $('busted-meter');
  if (bustedEl) {
    bustedEl.style.display = G.bustedMeter > 0.05 ? 'block' : 'none';
    const fill = bustedEl.querySelector('.busted-fill');
    if (fill) fill.style.width = Math.min(100, (G.bustedMeter / 1.6) * 100) + '%';
  }
}

export function drawMinimap(G) {
  const cv = $('minimap');
  if (!cv) return;
  const ctx = cv.getContext('2d');
  const S = cv.width;
  const scale = S / WORLD;
  ctx.clearRect(0, 0, S, S);
  // District tints.
  for (const d of [
    { x0: 0, y0: 0, x1: 1200, y1: 1800, c: '#6e6248' },
    { x0: 1200, y0: 0, x1: 2400, y1: 1800, c: '#4d6345' },
    { x0: 2400, y0: 0, x1: 3600, y1: 1800, c: '#5c5c60' },
    { x0: 0, y0: 1800, x1: 1200, y1: 3600, c: '#a8894f' },
    { x0: 1200, y0: 1800, x1: 2400, y1: 3600, c: '#453a58' },
    { x0: 2400, y0: 1800, x1: 3600, y1: 3600, c: '#3f5a68' },
  ]) {
    ctx.fillStyle = d.c;
    ctx.fillRect(d.x0 * scale, d.y0 * scale, (d.x1 - d.x0) * scale, (d.y1 - d.y0) * scale);
  }
  // Roads.
  ctx.strokeStyle = 'rgba(220,220,220,0.5)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * BLOCK * scale);
    ctx.lineTo(S, i * BLOCK * scale);
    ctx.moveTo(i * BLOCK * scale, 0);
    ctx.lineTo(i * BLOCK * scale, S);
    ctx.stroke();
  }
  // Water.
  ctx.fillStyle = '#1e5f7a';
  ctx.fillRect(3032 * scale, 3032 * scale, 236 * scale, 236 * scale);
  // Mission marker (pulsing yellow).
  const marker = missionMarker(G);
  if (marker) {
    const pulse = 3 + Math.sin(G.elapsed * 5) * 1.2;
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.arc(marker.x * scale, marker.y * scale, pulse + 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Courier marker (cyan).
  if (G.courier) {
    ctx.fillStyle = '#5cd6ff';
    ctx.beginPath();
    ctx.arc(G.courier.x * scale, G.courier.y * scale, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  // Police (red) and traffic (white) dots.
  for (const car of G.cars) {
    ctx.fillStyle = car.driver === 'police' ? '#ff2d2d' : 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(car.x * scale, car.y * scale, car.driver === 'police' ? 3 : 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow (pink, always on top).
  const p = G.player;
  ctx.save();
  ctx.translate(p.x * scale, p.y * scale);
  ctx.rotate(p.angle);
  ctx.fillStyle = '#ff2d78';
  ctx.beginPath();
  ctx.moveTo(7, 0);
  ctx.lineTo(-5, -5);
  ctx.lineTo(-5, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  // North indicator.
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 10px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('N', 5, 12);
}
