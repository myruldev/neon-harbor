// Neon Harbor — the single game state object, plus save / load.
// Everything the sim touches lives here so modules share one source of truth.

import { SAVE_KEY, SPOTS, DEFAULT_SEED } from './config.js';
import { buildCity } from './city.js';

export function createState(seed = DEFAULT_SEED) {
  const city = buildCity(seed);
  return {
    seed,
    city,
    mode: 'title', // title | playing | paused | dialog | end | complete
    time: 17 * 60 + 30, // 17:30, golden hour
    money: 120,
    health: 100,
    maxHealth: 100,
    heat: 0, // 0..100, maps to 1-5 wanted stars
    lastCrimeAt: -999,
    bustedMeter: 0,
    pistol: false,
    ammo: 0,
    player: {
      x: SPOTS.hq.x, y: SPOTS.hq.y, angle: -Math.PI / 2,
      speed: 0, radius: 14, inCar: null, punchCd: 0, fireCd: 0,
      walkPhase: 0, hurtCd: 0,
    },
    cars: [], // traffic + parked + police cars
    peds: [],
    officers: [], // police on foot
    enemies: [], // thugs + armed guards
    bullets: [],
    particles: [],
    camera: { x: SPOTS.hq.x, y: SPOTS.hq.y },
    missionIndex: 0,
    missionStep: 0,
    missionActive: false,
    missionState: {}, // per-mission scratch (flags, spawned ids)
    dialog: null, // { speaker, lines, i, onDone }
    dialogQueue: [],
    courier: null, // { x, y, deadline, reward, label }
    courierCooldown: 0,
    stats: { carsStolen: 0, missionsDone: 0, couriersDone: 0, earned: 0, pedsHit: 0 },
    message: '', // toast text
    messageAt: 0,
    elapsed: 0,
    endInfo: null, // { kind: 'busted'|'wasted', text }
    shot: null, // screenshot staging mode (?shot=...)
    muted: false,
  };
}

// ---- save / load (localStorage) ----

export function saveGame(G) {
  try {
    const data = {
      v: 1,
      money: Math.floor(G.money),
      health: G.health,
      missionIndex: G.missionIndex,
      pistol: G.pistol,
      ammo: G.ammo,
      time: G.time,
      px: G.player.x,
      py: G.player.y,
      stats: G.stats,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    return true;
  } catch (e) {
    return false;
  }
}

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    if (!d || d.v !== 1) return null;
    return d;
  } catch (e) {
    return null;
  }
}

export function applySave(G, d) {
  G.money = d.money;
  G.health = d.health;
  G.missionIndex = d.missionIndex;
  G.pistol = d.pistol;
  G.ammo = d.ammo;
  G.time = d.time;
  G.player.x = d.px;
  G.player.y = d.py;
  G.player.inCar = null;
  if (d.stats) G.stats = { ...G.stats, ...d.stats };
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    /* storage unavailable */
  }
}
