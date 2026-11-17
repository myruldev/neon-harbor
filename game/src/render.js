// Neon Harbor — canvas rendering: the city, its cars and people, neon night.
// Everything is drawn from the state; no images, no external assets.

import { WORLD, BLOCK, ROAD_W, DISTRICTS, districtAt } from './config.js';
import { missionMarker } from './missions.js';

const HALF = ROAD_W / 2;

// 0 = full day, 1 = full night. Dusk 17:30-20:00, dawn 05:00-07:00.
export function nightFactor(timeMin) {
  const h = (timeMin / 60) % 24;
  if (h >= 20 || h < 5) return 1;
  if (h >= 17.5 && h < 20) return (h - 17.5) / 2.5;
  if (h >= 5 && h < 7) return 1 - (h - 5) / 2;
  if (h >= 10 && h < 17.5) return 0;
  return 0.25; // early morning / late afternoon haze
}

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawCarShape(ctx, car, night) {
  const m = car.model;
  const L = m.len;
  const W = m.wid;
  ctx.save();
  ctx.translate(car.x, car.y);
  ctx.rotate(car.angle);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  rr(ctx, -L / 2 + 3, -W / 2 + 4, L, W, 8);
  ctx.fill();
  // Body.
  ctx.fillStyle = car.color;
  rr(ctx, -L / 2, -W / 2, L, W, 8);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.45)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  // Roof + windshield + rear window.
  ctx.fillStyle = 'rgba(20,24,32,0.85)';
  rr(ctx, -L * 0.18, -W * 0.36, L * 0.3, W * 0.72, 4);
  ctx.fill();
  ctx.fillStyle = 'rgba(140,200,230,0.75)';
  ctx.fillRect(L * 0.16, -W * 0.34, L * 0.1, W * 0.68);
  ctx.fillRect(-L * 0.34, -W * 0.34, L * 0.08, W * 0.68);
  // Headlights / taillights.
  ctx.fillStyle = night > 0.3 ? '#fff8c0' : '#ffe9a8';
  ctx.beginPath();
  ctx.arc(L / 2 - 2, -W / 2 + 5, 2.5, 0, Math.PI * 2);
  ctx.arc(L / 2 - 2, W / 2 - 5, 2.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#ff2d2d';
  ctx.beginPath();
  ctx.arc(-L / 2 + 2, -W / 2 + 5, 2.5, 0, Math.PI * 2);
  ctx.arc(-L / 2 + 2, W / 2 - 5, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // Police light bar.
  if (car.driver === 'police') {
    const phase = Math.floor(car.sirenPhase / (Math.PI / 2)) % 2 === 0;
    ctx.fillStyle = phase ? '#ff2d2d' : '#2d6bff';
    ctx.fillRect(-6, -W / 2 + 3, 12, 6);
    ctx.fillStyle = phase ? '#2d6bff' : '#ff2d2d';
    ctx.fillRect(-6, W / 2 - 9, 12, 6);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 8px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', 0, 3);
  }
  if (car.isGold) {
    ctx.fillStyle = '#fff3b0';
    ctx.font = 'bold 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('GT', 0, 3);
  }
  ctx.restore();
}

function drawPerson(ctx, x, y, angle, shirt, walkPhase, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  // Shadow.
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.beginPath();
  ctx.ellipse(2, 3, 9 * scale, 7 * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  // Body: bobbing walk.
  const bob = Math.sin(walkPhase) * 1.5;
  ctx.rotate(angle);
  ctx.fillStyle = shirt;
  ctx.beginPath();
  ctx.arc(0, bob * 0.4, 9 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f0c8a0';
  ctx.beginPath();
  ctx.arc(5 * scale, bob * 0.4, 5 * scale, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function renderWorld(ctx, G, vw, vh) {
  const cam = G.camera;
  const night = nightFactor(G.time);
  const left = cam.x - vw / 2;
  const top = cam.y - vh / 2;
  ctx.save();
  ctx.translate(-left, -top);

  const city = G.city;
  const viewL = left - 80;
  const viewT = top - 80;
  const viewR = left + vw + 80;
  const viewB = top + vh + 80;

  // --- ground: district tints ---
  for (const d of DISTRICTS) {
    ctx.fillStyle = d.ground;
    ctx.fillRect(d.x0, d.y0, d.x1 - d.x0, d.y1 - d.y0);
  }
  // District names painted on the ground.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  for (const d of DISTRICTS) {
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText(d.name.toUpperCase(), (d.x0 + d.x1) / 2, (d.y0 + d.y1) / 2);
  }

  // --- water (marina basin) with a slow shimmer ---
  const t = G.elapsed;
  for (const w of city.water) {
    ctx.fillStyle = '#1e5f7a';
    ctx.fillRect(w.x, w.y, w.w, w.h);
    ctx.strokeStyle = 'rgba(140,220,255,0.35)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      const yy = w.y + 30 + i * 70 + Math.sin(t * 1.4 + i * 2) * 6;
      ctx.beginPath();
      ctx.moveTo(w.x + 14, yy);
      ctx.lineTo(w.x + w.w - 14, yy);
      ctx.stroke();
    }
  }

  // --- roads ---
  ctx.fillStyle = '#2e3138';
  for (let i = 0; i <= 12; i++) {
    ctx.fillRect(0, i * BLOCK - HALF, WORLD, ROAD_W);
    ctx.fillRect(i * BLOCK - HALF, 0, ROAD_W, WORLD);
  }
  // Sidewalk edges.
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 12; i++) {
    ctx.beginPath();
    ctx.moveTo(0, i * BLOCK - HALF); ctx.lineTo(WORLD, i * BLOCK - HALF);
    ctx.moveTo(0, i * BLOCK + HALF); ctx.lineTo(WORLD, i * BLOCK + HALF);
    ctx.moveTo(i * BLOCK - HALF, 0); ctx.lineTo(i * BLOCK - HALF, WORLD);
    ctx.moveTo(i * BLOCK + HALF, 0); ctx.lineTo(i * BLOCK + HALF, WORLD);
    ctx.stroke();
  }
  // Centre dashes.
  ctx.fillStyle = 'rgba(255,220,120,0.55)';
  for (let i = 0; i <= 12; i++) {
    for (let d = 0; d < WORLD; d += 56) {
      ctx.fillRect(d, i * BLOCK - 2, 28, 4);
      ctx.fillRect(i * BLOCK - 2, d, 4, 28);
    }
  }

  // --- parks ---
  for (const p of city.parks) {
    if (p.x > viewR || p.x + p.w < viewL || p.y > viewB || p.y + p.h < viewT) continue;
    ctx.fillStyle = '#3f7a3a';
    ctx.fillRect(p.x, p.y, p.w, p.h);
    ctx.strokeStyle = '#2c5a2a';
    ctx.lineWidth = 3;
    ctx.strokeRect(p.x + 4, p.y + 4, p.w - 8, p.h - 8);
  }
  // --- docks ---
  for (const d of city.docks) {
    ctx.fillStyle = '#8a7a5c';
    ctx.fillRect(d.x, d.y, d.w, d.h);
  }
  // --- containers ---
  for (const c of city.containers) {
    if (c.x > viewR || c.x + c.w < viewL || c.y > viewB || c.y + c.h < viewT) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.fillRect(c.x + 3, c.y + 4, c.w, c.h);
    ctx.fillStyle = c.color;
    ctx.fillRect(c.x, c.y, c.w, c.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 1.5;
    for (let k = 1; k < 5; k++) {
      ctx.beginPath();
      ctx.moveTo(c.x + (c.w / 5) * k, c.y);
      ctx.lineTo(c.x + (c.w / 5) * k, c.y + c.h);
      ctx.stroke();
    }
  }
  // --- palms / trees ---
  for (const p of city.palms) {
    if (p.x < viewL || p.x > viewR || p.y < viewT || p.y > viewB) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(p.x + 3, p.y + 4, 8, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.kind === 'palm' ? '#2f8f4e' : '#2a6b35';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.kind === 'palm' ? 11 : 9, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = p.kind === 'palm' ? '#57c465' : '#3f9150';
    ctx.beginPath();
    ctx.arc(p.x - 3, p.y - 3, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#7a5230';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  // --- buildings ---
  for (const b of city.buildings) {
    if (b.x > viewR || b.x + b.w < viewL || b.y > viewB || b.y + b.h < viewT) continue;
    ctx.fillStyle = 'rgba(0,0,0,0.32)';
    ctx.fillRect(b.x + 5, b.y + 6, b.w, b.h);
    ctx.fillStyle = b.roof;
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(b.x + 1, b.y + 1, b.w - 2, b.h - 2);
    // Inner roof detail.
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(b.x + 8, b.y + 8, b.w - 16, b.h - 16);
    // Windows glow at night on tall Neon Strip towers.
    if (b.tall) {
      ctx.fillStyle = night > 0.4 ? 'rgba(255,220,120,0.85)' : 'rgba(40,50,70,0.6)';
      for (let wx = b.x + 12; wx < b.x + b.w - 8; wx += 18) {
        for (let wy = b.y + 12; wy < b.y + b.h - 8; wy += 18) {
          if (((wx * 7 + wy * 13) % 5) < 3) ctx.fillRect(wx, wy, 7, 9);
        }
      }
    }
    // Neon sign strip.
    if (b.neon) {
      ctx.fillStyle = night > 0.3 ? '#ff2d78' : '#c22a62';
      ctx.fillRect(b.x + 6, b.y - 2, b.w - 12, 5);
    }
  }

  // --- HQ marker building (Rook's garage) ---
  const hq = { x: 1560, y: 2400, w: 180, h: 110 };
  ctx.fillStyle = 'rgba(0,0,0,0.3)';
  ctx.fillRect(hq.x + 5, hq.y + 6, hq.w, hq.h);
  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(hq.x, hq.y, hq.w, hq.h);
  ctx.fillStyle = '#ff2d78';
  ctx.fillRect(hq.x, hq.y, hq.w, 10);
  ctx.fillStyle = '#e8e8e8';
  ctx.font = 'bold 13px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ROOK\u2019S GARAGE', hq.x + hq.w / 2, hq.y + hq.h / 2 + 4);

  // --- mission + courier markers ---
  const marker = missionMarker(G);
  const pulse = 1 + Math.sin(t * 5) * 0.18;
  if (marker) {
    ctx.save();
    ctx.translate(marker.x, marker.y);
    ctx.strokeStyle = 'rgba(255,215,0,0.9)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = 'rgba(255,215,0,0.22)';
    ctx.beginPath();
    ctx.arc(0, 0, 34 * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffd700';
    ctx.beginPath();
    ctx.moveTo(0, -52);
    ctx.lineTo(10, -34);
    ctx.lineTo(-10, -34);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  if (G.courier) {
    ctx.save();
    ctx.translate(G.courier.x, G.courier.y);
    ctx.strokeStyle = 'rgba(92,214,255,0.95)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, 30 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#5cd6ff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('$', 0, 6);
    ctx.restore();
  }
  // --- cars ---
  for (const car of G.cars) {
    if (car.x < viewL || car.x > viewR || car.y < viewT || car.y > viewB) continue;
    drawCarShape(ctx, car, night);
    // White ring around the car the player drives.
    if (car.driver === 'player') {
      ctx.save();
      ctx.translate(car.x, car.y);
      ctx.rotate(car.angle);
      ctx.strokeStyle = 'rgba(255,255,255,0.85)';
      ctx.lineWidth = 2;
      rr(ctx, -car.model.len / 2 - 4, -car.model.wid / 2 - 4, car.model.len + 8, car.model.wid + 8, 10);
      ctx.stroke();
      ctx.restore();
    }
  }

  // --- pedestrians ---
  for (const ped of G.peds) {
    if (ped.x < viewL || ped.x > viewR || ped.y < viewT || ped.y > viewB) continue;
    drawPerson(ctx, ped.x, ped.y, ped.angle, ped.shirt, ped.walkPhase);
  }
  // --- officers ---
  for (const off of G.officers) {
    drawPerson(ctx, off.x, off.y, off.angle, '#1a2a6c', off.walkPhase);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 7px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PD', off.x, off.y - 12);
  }
  // --- enemies ---
  for (const e of G.enemies) {
    const shirt = e.kind === 'guard' ? '#3a3a3a' : '#7a1f1f';
    drawPerson(ctx, e.x, e.y, e.angle, shirt, e.walkPhase, 1.05);
    if (e.armed) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(e.x + Math.cos(e.angle) * 10, e.y + Math.sin(e.angle) * 10);
      ctx.lineTo(e.x + Math.cos(e.angle) * 24, e.y + Math.sin(e.angle) * 24);
      ctx.stroke();
    }
    // Health bar.
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(e.x - 14, e.y - 24, 28, 4);
    ctx.fillStyle = '#ff4444';
    ctx.fillRect(e.x - 14, e.y - 24, 28 * Math.max(0, e.hp / (e.kind === 'guard' ? 60 : 50)), 4);
  }

  // --- player on foot ---
  const p = G.player;
  if (!p.inCar) {
    drawPerson(ctx, p.x, p.y, p.angle, '#ff2d78', p.walkPhase, 1.1);
    // Direction tick + pistol in hand.
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(p.x + Math.cos(p.angle) * 12, p.y + Math.sin(p.angle) * 12);
    ctx.lineTo(p.x + Math.cos(p.angle) * 20, p.y + Math.sin(p.angle) * 20);
    ctx.stroke();
    if (G.pistol) {
      ctx.strokeStyle = '#222';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(p.x + Math.cos(p.angle) * 14, p.y + Math.sin(p.angle) * 14);
      ctx.lineTo(p.x + Math.cos(p.angle) * 26, p.y + Math.sin(p.angle) * 26);
      ctx.stroke();
    }
    // White ring so the player is always findable.
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 17, 0, Math.PI * 2);
    ctx.stroke();
  }

  // --- bullets ---
  ctx.strokeStyle = '#ffe14d';
  ctx.lineWidth = 3;
  for (const b of G.bullets) {
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
  // --- particles ---
  for (const pt of G.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // --- lamps (drawn as posts, glow handled in the night pass) ---
  ctx.fillStyle = '#22252c';
  for (const l of city.lamps) {
    if (l.x < viewL || l.x > viewR || l.y < viewT || l.y > viewB) continue;
    ctx.beginPath();
    ctx.arc(l.x, l.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();

  // --- night overlay + lights (screen space) ---
  if (night > 0.05) {
    ctx.fillStyle = `rgba(6,8,32,${0.52 * night})`;
    ctx.fillRect(0, 0, vw, vh);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const px = p.x - left;
    const py = p.y - top;
    // Player light.
    let g = ctx.createRadialGradient(px, py, 10, px, py, 260);
    g.addColorStop(0, `rgba(255,230,160,${0.28 * night})`);
    g.addColorStop(1, 'rgba(255,230,160,0)');
    ctx.fillStyle = g;
    ctx.fillRect(px - 260, py - 260, 520, 520);
    // Headlights for every car.
    for (const car of G.cars) {
      if (car.x < viewL || car.x > viewR || car.y < viewT || car.y > viewB) continue;
      const cx = car.x - left;
      const cy = car.y - top;
      const fx = Math.cos(car.angle);
      const fy = Math.sin(car.angle);
      const hx = cx + fx * (car.model.len / 2);
      const hy = cy + fy * (car.model.len / 2);
      g = ctx.createRadialGradient(hx, hy, 4, hx, hy, 150);
      g.addColorStop(0, `rgba(255,244,180,${0.30 * night})`);
      g.addColorStop(1, 'rgba(255,244,180,0)');
      ctx.fillStyle = g;
      ctx.fillRect(hx - 150, hy - 150, 300, 300);
      // Headlight cone ahead of the car.
      ctx.save();
      ctx.translate(hx, hy);
      ctx.rotate(car.angle);
      const cone = ctx.createLinearGradient(0, 0, 190, 0);
      cone.addColorStop(0, `rgba(255,244,180,${0.16 * night})`);
      cone.addColorStop(1, 'rgba(255,244,180,0)');
      ctx.fillStyle = cone;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(190, -46);
      ctx.lineTo(190, 46);
      ctx.lineTo(0, 8);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      // Police flashing glow.
      if (car.driver === 'police') {
        const phase = Math.floor(car.sirenPhase / (Math.PI / 2)) % 2 === 0;
        g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 120);
        g.addColorStop(0, phase ? `rgba(255,45,45,${0.35 * night + 0.1})` : `rgba(45,107,255,${0.35 * night + 0.1})`);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = g;
        ctx.fillRect(cx - 120, cy - 120, 240, 240);
      }
    }
    // Lamp glows.
    for (const l of city.lamps) {
      if (l.x < viewL || l.x > viewR || l.y < viewT || l.y > viewB) continue;
      const lx = l.x - left;
      const ly = l.y - top;
      g = ctx.createRadialGradient(lx, ly, 2, lx, ly, 70);
      g.addColorStop(0, `rgba(255,220,130,${0.20 * night})`);
      g.addColorStop(1, 'rgba(255,220,130,0)');
      ctx.fillStyle = g;
      ctx.fillRect(lx - 70, ly - 70, 140, 140);
    }
    // Neon district glow.
    const neon = districtAt(p.x, p.y);
    if (neon.name === 'Neon Strip') {
      g = ctx.createRadialGradient(vw / 2, vh / 2, 40, vw / 2, vh / 2, 420);
      g.addColorStop(0, `rgba(255,45,120,${0.07 * night})`);
      g.addColorStop(1, 'rgba(255,45,120,0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, vw, vh);
    }
    ctx.restore();
  }

  // Low-health red vignette.
  if (G.health < 35 && G.mode === 'playing') {
    const a = (0.35 - G.health / 100) * (0.6 + 0.4 * Math.sin(t * 6));
    const vg = ctx.createRadialGradient(vw / 2, vh / 2, vh * 0.3, vw / 2, vh / 2, vh * 0.75);
    vg.addColorStop(0, 'rgba(255,0,0,0)');
    vg.addColorStop(1, `rgba(255,0,0,${Math.max(0, a)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, vw, vh);
  }
}
