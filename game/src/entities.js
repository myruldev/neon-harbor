// Neon Harbor — every moving thing: the player on foot and in cars, traffic AI,
// pedestrians, police pursuit, thugs and guards, bullets and particles.
// Wanted level, busts and crashes live here too.

import {
  WORLD, BLOCK, CAR_MODELS, CAR_COLORS, POLICE_COLOR, GOLD_CAR_COLOR,
  SPOTS, starsForHeat, policeCountForStars,
} from './config.js';
import { RNG } from './rng.js';
import { circleHits, resolveCircle, onRoad } from './city.js';

const TAU = Math.PI * 2;
const EAST = 0;
const SOUTH = Math.PI / 2;
const WEST = Math.PI;
const NORTH = -Math.PI / 2;
const HEADINGS = [EAST, SOUTH, WEST, NORTH];

function normAngle(a) {
  while (a > Math.PI) a -= TAU;
  while (a < -Math.PI) a += TAU;
  return a;
}

// Lane offset for right-hand traffic: the car sits 14px right of its road centre.
function laneOffset(heading) {
  if (heading === EAST) return { x: 0, y: 14 };
  if (heading === SOUTH) return { x: -14, y: 0 };
  if (heading === WEST) return { x: 0, y: -14 };
  return { x: 14, y: 0 };
}

function carXY(car) {
  const off = laneOffset(car.heading);
  if (car.axis === 'h') return { x: car.pos, y: car.road + off.y };
  return { x: car.road + off.x, y: car.pos };
}

export function makeCar(x, y, heading, model, color, driver) {
  const axis = (heading === EAST || heading === WEST) ? 'h' : 'v';
  const road = axis === 'h' ? Math.round(y / BLOCK) * BLOCK : Math.round(x / BLOCK) * BLOCK;
  const pos = axis === 'h' ? x : y;
  const sign = (heading === EAST || heading === SOUTH) ? 1 : -1;
  return {
    id: Math.random().toString(36).slice(2, 9),
    axis, road, pos, heading, sign,
    speed: 0, model, color, driver, // 'ai' | 'player' | 'none' | 'police'
    hp: 100, angle: heading, x, y,
    nextCross: nextCrossFrom(pos, sign),
    stuck: 0, smoke: 0, isGold: false, sirenPhase: Math.random() * TAU,
  };
}

function nextCrossFrom(pos, sign) {
  if (sign > 0) return (Math.floor(pos / BLOCK) + 1) * BLOCK;
  return Math.ceil(pos / BLOCK - 1) * BLOCK;
}

function randomRoadPoint(rng) {
  const i = rng.int(1, 11);
  const j = rng.int(1, 11);
  return { x: i * BLOCK, y: j * BLOCK };
}

export function spawnTraffic(G, n) {
  const rng = new RNG(G.seed * 31 + 5);
  for (let k = 0; k < n; k++) {
    const p = randomRoadPoint(rng);
    const heading = rng.pick(HEADINGS);
    const model = rng.pick(CAR_MODELS);
    const car = makeCar(p.x, p.y, heading, model, rng.pick(CAR_COLORS), 'ai');
    car.speed = rng.range(90, 150);
    const xy = carXY(car);
    car.x = xy.x;
    car.y = xy.y;
    G.cars.push(car);
  }
  // Parked cars along roads (stealable).
  for (let k = 0; k < 8; k++) {
    const p = randomRoadPoint(rng);
    const heading = rng.pick(HEADINGS);
    const model = rng.pick(CAR_MODELS);
    const car = makeCar(p.x, p.y, heading, model, rng.pick(CAR_COLORS), 'none');
    car.speed = 0;
    const xy = carXY(car);
    car.x = xy.x;
    car.y = xy.y;
    G.cars.push(car);
  }
  // The golden Comet GT at the docks, mission 2's target.
  const gold = makeCar(SPOTS.goldCar.x, SPOTS.goldCar.y, EAST, CAR_MODELS[5], GOLD_CAR_COLOR, 'none');
  gold.isGold = true;
  gold.x = SPOTS.goldCar.x;
  gold.y = SPOTS.goldCar.y;
  G.cars.push(gold);
}

export function spawnPeds(G, n) {
  const rng = new RNG(G.seed * 17 + 3);
  const shirts = ['#e74c3c', '#3498db', '#f1c40f', '#9b59b6', '#1abc9c', '#e67e22', '#ecf0f1', '#fd79a8'];
  for (let k = 0; k < n; k++) {
    const p = randomRoadPoint(rng);
    const axis = rng.chance(0.5) ? 'h' : 'v';
    const lane = rng.chance(0.5) ? 44 : -44;
    const road = axis === 'h' ? p.y + lane : p.x + lane;
    const pos = axis === 'h' ? p.x : p.y;
    G.peds.push({
      id: Math.random().toString(36).slice(2, 9),
      axis, road, pos,
      sign: rng.chance(0.5) ? 1 : -1,
      speed: rng.range(38, 68),
      shirt: rng.pick(shirts),
      x: axis === 'h' ? pos : road,
      y: axis === 'h' ? road : pos,
      angle: 0, walkPhase: rng.range(0, TAU),
      flee: 0, fleeX: 0, fleeY: 0, dead: false, hp: 30,
      nextCross: nextCrossFrom(pos, rng.chance(0.5) ? 1 : -1),
    });
  }
}

export function spawnPoliceCar(G) {
  const rng = new RNG((Math.random() * 1e9) | 0);
  const a = rng.range(0, TAU);
  const d = rng.range(650, 900);
  let x = G.player.x + Math.cos(a) * d;
  let y = G.player.y + Math.sin(a) * d;
  x = Math.max(80, Math.min(WORLD - 80, x));
  y = Math.max(80, Math.min(WORLD - 80, y));
  const roadX = Math.round(x / BLOCK) * BLOCK;
  const roadY = Math.round(y / BLOCK) * BLOCK;
  if (Math.abs(x - roadX) < Math.abs(y - roadY)) { x = roadX; } else { y = roadY; }
  const heading = rng.pick(HEADINGS);
  const car = makeCar(x, y, heading, CAR_MODELS[2], POLICE_COLOR, 'police');
  car.speed = 170;
  const xy = carXY(car);
  car.x = xy.x;
  car.y = xy.y;
  G.cars.push(car);
  return car;
}

export function spawnOfficer(G) {
  const a = Math.random() * TAU;
  const x = Math.max(60, Math.min(WORLD - 60, G.player.x + Math.cos(a) * 420));
  const y = Math.max(60, Math.min(WORLD - 60, G.player.y + Math.sin(a) * 420));
  G.officers.push({ x, y, angle: 0, speed: 175, hp: 50, walkPhase: Math.random() * TAU });
}

export function spawnThug(G, x, y) {
  G.enemies.push({ x, y, angle: 0, hp: 50, armed: false, speed: 120, attackCd: 0, walkPhase: 0, kind: 'thug' });
}

export function spawnGuard(G, x, y) {
  G.enemies.push({ x, y, angle: 0, hp: 60, armed: true, speed: 95, attackCd: 0, walkPhase: 0, kind: 'guard' });
}

// ---- wanted / heat ----

export function addHeat(G, amount, crime) {
  G.heat = Math.min(100, G.heat + amount);
  G.lastCrimeAt = G.elapsed;
  if (crime) setMessage(G, crime);
}

export function setMessage(G, text) {
  G.message = text;
  G.messageAt = G.elapsed;
}

export function wantedStars(G) {
  return starsForHeat(G.heat);
}

// ---- particles ----

export function burst(G, x, y, color, n, speed, life = 0.6, size = 3) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * TAU;
    const s = speed * (0.4 + Math.random() * 0.6);
    G.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: life * (0.5 + Math.random() * 0.5), maxLife: life, color, size,
    });
  }
}

export function updateParticles(G, dt) {
  for (let i = G.particles.length - 1; i >= 0; i--) {
    const p = G.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    p.life -= dt;
    if (p.life <= 0) G.particles.splice(i, 1);
  }
}

// ---- player on foot ----

function updatePlayerOnFoot(G, dt, input, audio) {
  const p = G.player;
  const mv = input.moveVector();
  const run = input.down('ShiftLeft') || input.down('ShiftRight');
  const speed = run ? 300 : 205;
  if (mv.x !== 0 || mv.y !== 0) {
    p.angle = Math.atan2(mv.y, mv.x);
    p.walkPhase += dt * (run ? 14 : 10);
  }
  const nx = p.x + mv.x * speed * dt;
  const ny = p.y + mv.y * speed * dt;
  const res = resolveCircle(G.city, nx, ny, p.radius);
  p.x = res.x;
  p.y = res.y;
  p.speed = (mv.x !== 0 || mv.y !== 0) ? speed : 0;

  // Aim with the mouse when armed.
  if (G.pistol) {
    const dx = input.mouse.worldX - p.x;
    const dy = input.mouse.worldY - p.y;
    if (dx * dx + dy * dy > 100) p.angle = Math.atan2(dy, dx);
  }

  // Punch.
  if (p.punchCd > 0) p.punchCd -= dt;
  if (input.wasPressed('KeyF') || (input.mouse.clicked && !G.pistol)) {
    punch(G, audio);
  }
  // Shoot.
  if (p.fireCd > 0) p.fireCd -= dt;
  if (G.pistol && input.mouse.down && p.fireCd <= 0) {
    fireWeapon(G, audio);
  }

  // Picked up by a police car touch? Handled in updatePolice.
  if (p.hurtCd > 0) p.hurtCd -= dt;
}

export function punch(G, audio) {
  const p = G.player;
  if (p.punchCd > 0 || p.inCar) return;
  p.punchCd = 0.38;
  audio.punch();
  const hx = p.x + Math.cos(p.angle) * 34;
  const hy = p.y + Math.sin(p.angle) * 34;
  burst(G, hx, hy, '#ffffff', 4, 120, 0.25, 2);
  // Hit enemies, peds, officers in front of the fist.
  const targets = [...G.enemies, ...G.peds, ...G.officers];
  for (const t of targets) {
    const dx = t.x - p.x;
    const dy = t.y - p.y;
    const d = Math.hypot(dx, dy);
    if (d < 52 && Math.abs(normAngle(Math.atan2(dy, dx) - p.angle)) < 1.2) {
      t.hp -= 18;
      burst(G, t.x, t.y, '#ffdd55', 6, 160, 0.3, 3);
      if (t.hp <= 0) killTarget(G, t);
      else if (t.kind === 'thug' || t.kind === 'guard') addHeat(G, 6, '');
    }
  }
}

export function fireWeapon(G, audio) {
  const p = G.player;
  if (!G.pistol || G.ammo <= 0 || p.inCar) {
    if (G.ammo <= 0 && G.pistol) setMessage(G, 'Out of ammo — find the pistol cache at HQ.');
    return;
  }
  p.fireCd = 0.26;
  G.ammo -= 1;
  audio.shot();
  const a = p.angle;
  const bx = p.x + Math.cos(a) * 26;
  const by = p.y + Math.sin(a) * 26;
  G.bullets.push({
    x: bx, y: by, vx: Math.cos(a) * 950, vy: Math.sin(a) * 950,
    from: 'player', damage: 34, life: 1.1,
  });
  burst(G, bx, by, '#ffd94d', 5, 200, 0.15, 2);
  addHeat(G, 4, '');
  // Nearby peds flee from the shot.
  for (const ped of G.peds) {
    const d = Math.hypot(ped.x - p.x, ped.y - p.y);
    if (d < 420) {
      ped.flee = 2.5;
      ped.fleeX = p.x;
      ped.fleeY = p.y;
    }
  }
}

function killTarget(G, t) {
  if (t.kind === 'thug' || t.kind === 'guard') {
    G.enemies = G.enemies.filter((e) => e !== t);
    burst(G, t.x, t.y, '#ff5555', 14, 220, 0.6, 3);
    addHeat(G, 12, t.kind === 'guard' ? 'Officer down — the heat is on!' : 'Thug down.');
  } else if (t.shirt !== undefined) {
    // A pedestrian.
    G.peds = G.peds.filter((e) => e !== t);
    burst(G, t.x, t.y, '#ff5555', 12, 200, 0.6, 3);
    G.stats.pedsHit += 1;
    addHeat(G, 15, 'You hit a pedestrian!');
  } else {
    G.officers = G.officers.filter((e) => e !== t);
    burst(G, t.x, t.y, '#ff5555', 12, 200, 0.6, 3);
    addHeat(G, 25, 'You took down an officer!');
  }
}

// ---- entering / leaving cars ----

export function nearestCar(G, maxDist) {
  const p = G.player;
  let best = null;
  let bestD = maxDist;
  for (const car of G.cars) {
    if (car.driver === 'police') continue;
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < bestD) {
      best = car;
      bestD = d;
    }
  }
  return best;
}

export function enterCar(G, car, audio) {
  const p = G.player;
  if (car.driver === 'ai') {
    // Carjacking: the driver bails out and runs.
    const a = Math.random() * TAU;
    G.peds.push({
      id: Math.random().toString(36).slice(2, 9),
      axis: 'h', road: car.y + 44, pos: car.x, sign: 1, speed: 160,
      shirt: '#e74c3c', x: car.x + Math.cos(a) * 30, y: car.y + Math.sin(a) * 30,
      angle: a, walkPhase: 0, flee: 3, fleeX: car.x, fleeY: car.y, dead: false, hp: 30,
      nextCross: car.x + 300,
    });
    addHeat(G, 25, 'Car stolen! The owner called it in.');
    G.stats.carsStolen += 1;
    audio.horn();
  } else if (car.isGold) {
    addHeat(G, 25, 'You stole the golden Comet GT!');
    G.stats.carsStolen += 1;
  }
  car.driver = 'player';
  car.speed = 0;
  p.inCar = car;
  p.x = car.x;
  p.y = car.y;
  audio.setEngine(true, 0);
}

export function exitCar(G, audio) {
  const p = G.player;
  const car = p.inCar;
  if (!car) return;
  car.driver = 'none';
  car.speed = 0;
  const side = car.angle + Math.PI / 2;
  const nx = car.x + Math.cos(side) * 30;
  const ny = car.y + Math.sin(side) * 30;
  const res = resolveCircle(G.city, nx, ny, p.radius);
  p.x = res.x;
  p.y = res.y;
  p.inCar = null;
  audio.setEngine(false, 0);
}

// ---- driving ----

function updatePlayerCar(G, dt, input, audio) {
  const p = G.player;
  const car = p.inCar;
  if (!car) return;
  const model = car.model;
  const fwd = input.down('KeyW') || input.down('ArrowUp');
  const back = input.down('KeyS') || input.down('ArrowDown');
  const left = input.down('KeyA') || input.down('ArrowLeft');
  const right = input.down('KeyD') || input.down('ArrowRight');
  const brake = input.down('Space');

  if (fwd) car.speed += model.accel * dt;
  else if (back) car.speed -= model.accel * 0.75 * dt;
  else car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 160 * dt);
  if (brake) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 700 * dt);
  car.speed = Math.max(-model.top * 0.45, Math.min(model.top, car.speed));

  const steer = (left ? -1 : 0) + (right ? 1 : 0);
  if (Math.abs(car.speed) > 5) {
    const grip = brake ? 1.9 : 1.25;
    car.angle += steer * (car.speed / model.top) * grip * dt * (car.speed >= 0 ? 1 : -1);
  }

  const prevX = car.x;
  const prevY = car.y;
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const res = resolveCircle(G.city, nx, ny, 20);
  if (res.hit && Math.abs(car.speed) > 120) {
    car.hp -= Math.abs(car.speed) * 0.06;
    audio.crash();
    burst(G, res.x, res.y, '#ffcc66', 8, 180, 0.4, 3);
    damagePlayer(G, Math.abs(car.speed) * 0.01, audio);
  }
  car.x = res.x;
  car.y = res.y;
  if (res.hit) car.speed *= 0.55;
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  p.speed = Math.abs(car.speed);

  // Running over pedestrians.
  for (const ped of [...G.peds]) {
    const d = Math.hypot(ped.x - car.x, ped.y - car.y);
    if (d < 26 && Math.abs(car.speed) > 40) {
      killTarget(G, ped);
      car.speed *= 0.92;
    }
  }
  // Ramming other cars.
  for (const other of G.cars) {
    if (other === car) continue;
    const d = Math.hypot(other.x - car.x, other.y - car.y);
    if (d < 42) {
      const push = (42 - d) / 2;
      const a = Math.atan2(other.y - car.y, other.x - car.x);
      other.x += Math.cos(a) * push;
      other.y += Math.sin(a) * push;
      car.x -= Math.cos(a) * push * 0.5;
      car.y -= Math.sin(a) * push * 0.5;
      if (Math.abs(car.speed) > 90) {
        other.hp -= 8;
        car.hp -= 4;
        audio.crash();
        burst(G, (car.x + other.x) / 2, (car.y + other.y) / 2, '#ffcc66', 6, 160, 0.35, 3);
        if (other.driver === 'police' && G.elapsed - (car.lastPoliceRamAt || 0) > 1.5) {
          car.lastPoliceRamAt = G.elapsed;
          addHeat(G, 10, 'You rammed a police car!');
        }
        car.speed *= 0.85;
      }
    }
  }
  if (car.hp <= 0) {
    burst(G, car.x, car.y, '#ff8833', 24, 260, 0.9, 4);
    burst(G, car.x, car.y, '#555555', 16, 120, 1.4, 5);
    audio.crash();
    setMessage(G, 'Your car is wrecked!');
    exitCar(G, audio);
    car.hp = 0;
  }
  if (car.hp < 40) {
    car.smoke += dt;
    if (car.smoke > 0.12) {
      car.smoke = 0;
      G.particles.push({
        x: car.x + (Math.random() - 0.5) * 20, y: car.y + (Math.random() - 0.5) * 20,
        vx: (Math.random() - 0.5) * 20, vy: -30 - Math.random() * 20,
        life: 1.1, maxLife: 1.1, color: '#777777', size: 5,
      });
    }
  }
  audio.setEngine(true, Math.abs(car.speed) / model.top);
}

// ---- traffic AI ----

function updateTrafficCar(G, car, dt, rng) {
  if (car.driver !== 'ai') return;
  // Slow for the car ahead on the same road.
  let target = car.model.top * 0.62;
  for (const other of G.cars) {
    if (other === car || other.axis !== car.axis || other.road !== car.road) continue;
    const ahead = (other.pos - car.pos) * car.sign;
    if (ahead > 0 && ahead < 78) {
      target = Math.min(target, other.driver === 'ai' ? other.speed : 0);
      if (ahead < 46) target = 0;
    }
  }
  // Police cars ahead of the player yield a little; traffic keeps its lane.
  if (car.speed < target) car.speed = Math.min(target, car.speed + 130 * dt);
  else car.speed = Math.max(target, car.speed - 220 * dt);

  car.pos += car.speed * car.sign * dt;
  // Reached the next intersection: maybe turn.
  if ((car.sign > 0 && car.pos >= car.nextCross) || (car.sign < 0 && car.pos <= car.nextCross)) {
    const cross = car.nextCross;
    const r = rng.next();
    const turn = r < 0.22 ? -1 : r < 0.44 ? 1 : 0;
    const cur = car.heading;
    let next = cur;
    if (turn === -1) next = normAngle(cur - Math.PI / 2);
    else if (turn === 1) next = normAngle(cur + Math.PI / 2);
    if (next === cur) {
      car.nextCross = nextCrossFrom(car.pos + car.sign * 2, car.sign);
    } else {
      // Switch axis at the intersection.
      const cx = car.axis === 'h' ? car.pos : car.road;
      const cy = car.axis === 'h' ? car.road : car.pos;
      car.heading = next;
      car.axis = (next === EAST || next === WEST) ? 'h' : 'v';
      car.sign = (next === EAST || next === SOUTH) ? 1 : -1;
      if (car.axis === 'h') { car.road = cy; car.pos = cx; }
      else { car.road = cx; car.pos = cy; }
      car.nextCross = nextCrossFrom(car.pos + car.sign * 2, car.sign);
    }
  }
  const xy = carXY(car);
  car.x = xy.x;
  car.y = xy.y;
  car.angle = car.heading;
  // Keep traffic on the map.
  if (car.pos < 0 || car.pos > WORLD) {
    car.pos = ((car.pos % WORLD) + WORLD) % WORLD;
    car.nextCross = nextCrossFrom(car.pos, car.sign);
  }
}

// ---- pedestrians ----

function updatePed(G, ped, dt, rng) {
  if (ped.flee > 0) {
    ped.flee -= dt;
    const a = Math.atan2(ped.y - ped.fleeY, ped.x - ped.fleeX);
    ped.x += Math.cos(a) * 170 * dt;
    ped.y += Math.sin(a) * 170 * dt;
    ped.angle = a;
    ped.walkPhase += dt * 16;
    const res = resolveCircle(G.city, ped.x, ped.y, 10);
    ped.x = res.x;
    ped.y = res.y;
    return;
  }
  ped.pos += ped.speed * ped.sign * dt;
  if ((ped.sign > 0 && ped.pos >= ped.nextCross) || (ped.sign < 0 && ped.pos <= ped.nextCross)) {
    const r = rng.next();
    if (r < 0.3) {
      // Turn onto the crossing road.
      const cx = ped.axis === 'h' ? ped.pos : ped.road;
      const cy = ped.axis === 'h' ? ped.road : ped.pos;
      ped.axis = ped.axis === 'h' ? 'v' : 'h';
      if (ped.axis === 'h') { ped.road = cy + (rng.chance(0.5) ? 44 : -44); ped.pos = cx; }
      else { ped.road = cx + (rng.chance(0.5) ? 44 : -44); ped.pos = cy; }
      ped.sign = rng.chance(0.5) ? 1 : -1;
      ped.nextCross = nextCrossFrom(ped.pos + ped.sign * 2, ped.sign);
    } else {
      ped.nextCross = nextCrossFrom(ped.pos + ped.sign * 2, ped.sign);
    }
  }
  if (ped.axis === 'h') { ped.x = ped.pos; ped.y = ped.road; ped.angle = ped.sign > 0 ? 0 : Math.PI; }
  else { ped.y = ped.pos; ped.x = ped.road; ped.angle = ped.sign > 0 ? Math.PI / 2 : -Math.PI / 2; }
  ped.walkPhase += dt * 9;
  if (ped.pos < 40 || ped.pos > WORLD - 40) {
    ped.sign *= -1;
    ped.nextCross = nextCrossFrom(ped.pos + ped.sign * 2, ped.sign);
  }
}

// ---- police ----

function updatePoliceCar(G, car, dt, audio) {
  if (car.driver !== 'police') return;
  const p = G.player;
  const dx = p.x - car.x;
  const dy = p.y - car.y;
  const dist = Math.hypot(dx, dy);
  const want = Math.atan2(dy, dx);
  const diff = normAngle(want - car.angle);
  car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
  const top = car.model.top * 1.02;
  if (Math.abs(diff) < 1.1) car.speed = Math.min(top, car.speed + 420 * dt);
  else car.speed = Math.max(60, car.speed - 200 * dt);
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const res = resolveCircle(G.city, nx, ny, 20);
  if (res.hit) car.speed *= 0.6;
  car.x = res.x;
  car.y = res.y;
  car.sirenPhase += dt * 6;
  // Ram the player (damage on a cooldown so a pile-up is survivable).
  if (dist < 46) {
    if (p.inCar) {
      if (G.elapsed - (car.lastRamAt || 0) > 0.6) {
        car.lastRamAt = G.elapsed;
        p.inCar.hp -= 8;
        audio.crash();
        burst(G, (car.x + p.x) / 2, (car.y + p.y) / 2, '#ffcc66', 5, 150, 0.3, 3);
      }
      car.speed *= 0.94;
    } else if (car.speed > 60) {
      if (G.elapsed - (car.lastRamAt || 0) > 0.6) {
        car.lastRamAt = G.elapsed;
        damagePlayer(G, 15, audio);
        addHeat(G, 2, '');
      }
    }
  }
  // Despawn when far away and the heat is gone.
  if (G.heat <= 0 && dist > 1400) {
    G.cars = G.cars.filter((c) => c !== car);
  }
}

function updateOfficer(G, off, dt, audio) {
  const p = G.player;
  const dx = p.x - off.x;
  const dy = p.y - off.y;
  const dist = Math.hypot(dx, dy);
  if (dist > 700) {
    // Too far: teleport closer, on the player's road.
    const a = Math.random() * TAU;
    off.x = Math.max(60, Math.min(WORLD - 60, p.x + Math.cos(a) * 380));
    off.y = Math.max(60, Math.min(WORLD - 60, p.y + Math.sin(a) * 380));
    return;
  }
  const a = Math.atan2(dy, dx);
  off.angle = a;
  off.x += Math.cos(a) * off.speed * dt;
  off.y += Math.sin(a) * off.speed * dt;
  off.walkPhase += dt * 12;
  const res = resolveCircle(G.city, off.x, off.y, 11);
  off.x = res.x;
  off.y = res.y;
  if (dist < 34 && !p.inCar) {
    G.bustedMeter += dt * 0.9;
    if (Math.random() < dt * 3) audio.punch();
  }
}

// ---- enemies (thugs / guards) ----

function updateEnemy(G, e, dt, audio) {
  const p = G.player;
  const dx = p.x - e.x;
  const dy = p.y - e.y;
  const dist = Math.hypot(dx, dy);
  e.attackCd -= dt;
  if (dist < 520) {
    const a = Math.atan2(dy, dx);
    e.angle = a;
    if (dist > (e.armed ? 300 : 34)) {
      e.x += Math.cos(a) * e.speed * dt;
      e.y += Math.sin(a) * e.speed * dt;
      e.walkPhase += dt * 11;
      const res = resolveCircle(G.city, e.x, e.y, 12);
      e.x = res.x;
      e.y = res.y;
    } else if (e.attackCd <= 0) {
      e.attackCd = e.armed ? 1.3 : 0.9;
      if (e.armed) {
        audio.shot();
        const spread = (Math.random() - 0.5) * 0.24;
        G.bullets.push({
          x: e.x + Math.cos(a) * 22, y: e.y + Math.sin(a) * 22,
          vx: Math.cos(a + spread) * 700, vy: Math.sin(a + spread) * 700,
          from: 'enemy', damage: 9, life: 1.2,
        });
        burst(G, e.x + Math.cos(a) * 26, e.y + Math.sin(a) * 26, '#ffd94d', 4, 160, 0.12, 2);
      } else {
        audio.punch();
        damagePlayer(G, 8, audio);
        burst(G, p.x, p.y, '#ffdd55', 5, 140, 0.25, 2);
      }
    }
  }
}

// ---- bullets ----

function updateBullets(G, dt, audio) {
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0;
    if (!dead && circleHits(G.city, b.x, b.y, 2)) {
      burst(G, b.x, b.y, '#ffcc66', 4, 120, 0.25, 2);
      dead = true;
    }
    if (!dead && b.from === 'player') {
      for (const e of [...G.enemies]) {
        if (Math.hypot(e.x - b.x, e.y - b.y) < 20) {
          e.hp -= b.damage;
          burst(G, b.x, b.y, '#ff5555', 6, 160, 0.3, 3);
          if (e.hp <= 0) killTarget(G, e);
          dead = true;
          break;
        }
      }
      if (!dead) for (const o of [...G.officers]) {
        if (Math.hypot(o.x - b.x, o.y - b.y) < 18) {
          o.hp -= b.damage;
          burst(G, b.x, b.y, '#ff5555', 6, 160, 0.3, 3);
          if (o.hp <= 0) killTarget(G, o);
          dead = true;
          break;
        }
      }
      if (!dead) for (const ped of [...G.peds]) {
        if (Math.hypot(ped.x - b.x, ped.y - b.y) < 16) {
          killTarget(G, ped);
          dead = true;
          break;
        }
      }
      if (!dead) for (const car of G.cars) {
        if (car.driver === 'player') continue;
        if (Math.hypot(car.x - b.x, car.y - b.y) < 26) {
          car.hp -= b.damage;
          burst(G, b.x, b.y, '#ffcc66', 4, 140, 0.25, 2);
          if (car.driver === 'police') addHeat(G, 8, 'You shot a police car!');
          dead = true;
          break;
        }
      }
    }
    if (!dead && b.from === 'enemy') {
      const p = G.player;
      const pr = p.inCar ? 24 : 14;
      if (Math.hypot(p.x - b.x, p.y - b.y) < pr) {
        damagePlayer(G, b.damage, audio);
        burst(G, b.x, b.y, '#ff5555', 5, 150, 0.3, 2);
        dead = true;
      }
    }
    if (dead) G.bullets.splice(i, 1);
  }
}

// ---- damage / bust / waste ----

export function damagePlayer(G, amount, audio, force = false) {
  const p = G.player;
  if (!force && p.hurtCd > 0 && amount < 10) return;
  p.hurtCd = 0.25;
  G.health -= amount;
  if (G.health <= 0) {
    G.health = 0;
    wastePlayer(G, audio);
  }
}

function wastePlayer(G, audio) {
  audio.setEngine(false, 0);
  audio.setSiren(false);
  audio.busted();
  const lost = Math.min(G.money, 300);
  G.money -= lost;
  G.endInfo = { kind: 'wasted', text: `Rook got wasted in the streets. The harbor medics patched him up — for $${lost}.` };
  G.mode = 'end';
}

export function bustPlayer(G, audio) {
  audio.setEngine(false, 0);
  audio.setSiren(false);
  audio.busted();
  const lost = Math.min(G.money, Math.max(200, Math.floor(G.money * 0.25)));
  G.money -= lost;
  G.heat = 0;
  G.bustedMeter = 0;
  G.endInfo = { kind: 'busted', text: `Busted! The Harbor PD impounded the car and fined Rook $${lost}. Marla is not happy.` };
  G.mode = 'end';
}

export function respawnAtHQ(G) {
  const p = G.player;
  if (p.inCar) {
    const car = p.inCar;
    car.driver = 'none';
    p.inCar = null;
  }
  p.x = SPOTS.hq.x;
  p.y = SPOTS.hq.y;
  p.angle = -Math.PI / 2;
  G.health = 100;
  G.heat = 0;
  G.bustedMeter = 0;
  G.cars = G.cars.filter((c) => c.driver !== 'police');
  G.officers = [];
  G.enemies = [];
  G.bullets = [];
  G.camera.x = p.x;
  G.camera.y = p.y;
}

// ---- top-level update ----

export function updateEntities(G, dt, input, audio) {
  const rng = updateEntities.rng || (updateEntities.rng = new RNG(G.seed * 101 + 11));
  const p = G.player;

  if (p.inCar) updatePlayerCar(G, dt, input, audio);
  else updatePlayerOnFoot(G, dt, input, audio);

  for (const car of G.cars) {
    if (car.driver === 'ai') updateTrafficCar(G, car, dt, rng);
    else if (car.driver === 'police') updatePoliceCar(G, car, dt, audio);
  }
  for (const ped of G.peds) updatePed(G, ped, dt, rng);
  for (const off of G.officers) updateOfficer(G, off, dt, audio);
  for (const e of [...G.enemies]) updateEnemy(G, e, dt, audio);
  updateBullets(G, dt, audio);
  updateParticles(G, dt);

  // Wanted decay: lay low and the heat cools off.
  const stars = wantedStars(G);
  if (G.heat > 0 && G.elapsed - G.lastCrimeAt > 8) {
    const nearPolice = G.cars.some((c) => c.driver === 'police' && Math.hypot(c.x - p.x, c.y - p.y) < 420)
      || G.officers.some((o) => Math.hypot(o.x - p.x, o.y - p.y) < 300);
    if (!nearPolice) G.heat = Math.max(0, G.heat - 2.2 * dt);
  }

  // Keep the police pressure matched to the wanted level.
  const wantPolice = policeCountForStars(stars);
  const havePolice = G.cars.filter((c) => c.driver === 'police').length;
  if (havePolice < wantPolice && G.heat > 0) spawnPoliceCar(G);
  if (stars >= 4 && G.officers.length < 2) spawnOfficer(G);
  if (stars < 4 && G.officers.length > 0 && G.heat <= 0) G.officers = [];

  // Busted: a police car sitting on the player on foot, or an officer holding him.
  if (!p.inCar && G.heat > 0) {
    for (const car of G.cars) {
      if (car.driver !== 'police') continue;
      const d = Math.hypot(car.x - p.x, car.y - p.y);
      if (d < 52 && car.speed < 70) G.bustedMeter += dt * 0.55;
    }
    if (G.bustedMeter > 0 && G.officers.length === 0) {
      const near = G.cars.some((c) => c.driver === 'police' && Math.hypot(c.x - p.x, c.y - p.y) < 220);
      if (!near) G.bustedMeter = Math.max(0, G.bustedMeter - dt * 0.4);
    }
    if (G.bustedMeter >= 1.6) bustPlayer(G, audio);
  } else if (G.bustedMeter > 0) {
    G.bustedMeter = Math.max(0, G.bustedMeter - dt * 0.5);
  }

  // Siren follows the chase.
  audio.setSiren(havePolice > 0 && G.heat > 0);

  // Camera follows the player.
  const tx = p.x;
  const ty = p.y;
  G.camera.x += (tx - G.camera.x) * Math.min(1, dt * 5);
  G.camera.y += (ty - G.camera.y) * Math.min(1, dt * 5);
}
