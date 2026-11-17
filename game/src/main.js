// Neon Harbor — bootstrap and game loop. Wires the screens (title / pause /
// dialog / busted / story-complete), the keyboard interaction, saving, and the
// ?shot= staging used to take the entry's screenshots.

import { DEFAULT_SEED, SPOTS, CAR_MODELS, CAR_COLORS } from './config.js';
import { createState, saveGame, loadSave, applySave, clearSave } from './state.js';
import { createInput } from './input.js';
import { createAudio } from './audio.js';
import { renderWorld } from './render.js';
import { updateHUD, drawMinimap } from './hud.js';
import {
  spawnTraffic, spawnPeds, updateEntities, enterCar, exitCar, nearestCar,
  makeCar, spawnPoliceCar, spawnGuard, addHeat, setMessage, respawnAtHQ,
} from './entities.js';
import {
  MISSIONS, currentMission, currentStep, startMission, updateMissions,
  queueDialog, advanceDialog, tryStartCourier, updateCourier,
} from './missions.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const params = new URLSearchParams(location.search);
const seed = Number(params.get('seed')) || DEFAULT_SEED;
const shot = params.get('shot');

const G = createState(seed);
const input = createInput(canvas);
const audio = createAudio();

let vw = 0;
let vh = 0;
let lastNow = performance.now();
let lastAutoSave = 0;
let lastHurtAt = -999;
let prevHealth = G.health;

function resize() {
  vw = window.innerWidth;
  vh = window.innerHeight;
  canvas.width = vw;
  canvas.height = vh;
}
window.addEventListener('resize', resize);
resize();

// ---- screen helpers ----

function show(id) {
  document.getElementById(id).hidden = false;
}
function hide(id) {
  document.getElementById(id).hidden = true;
}
function showOnly(id) {
  for (const s of ['screen-title', 'screen-pause', 'screen-end', 'screen-complete']) {
    document.getElementById(s).hidden = s !== id;
  }
  document.getElementById('hud').hidden = id !== null;
  document.getElementById('dialog').hidden = true;
}

function startNewGame() {
  audio.unlock();
  audio.startMusic();
  showOnly(null);
  G.mode = 'playing';
  G.missionIndex = 0;
  startMission(G, audio);
  setMessage(G, 'Mission 1: First Fare — meet Marla at your garage.');
}

function continueGame(save) {
  audio.unlock();
  audio.startMusic();
  applySave(G, save);
  G.missionActive = true;
  G.missionStep = 0;
  G.missionState = { guardsSpawned: 0, guardsTotal: 4, thugsSpawned: {} };
  G.heat = 0;
  showOnly(null);
  G.mode = 'playing';
  const m = currentMission(G);
  if (m) {
    setMessage(G, `Welcome back — ${m.title} restarted.`);
    queueDialog(G, m.intro);
  }
}

function pauseGame() {
  if (G.mode !== 'playing') return;
  G.mode = 'paused';
  audio.setEngine(false, 0);
  showOnly('screen-pause');
}
function resumeGame() {
  if (G.mode !== 'paused') return;
  G.mode = 'playing';
  showOnly(null);
}

// ---- title screen wiring ----

const save = loadSave();
const btnContinue = document.getElementById('btn-continue');
const saveNote = document.getElementById('save-note');
if (save) {
  btnContinue.hidden = false;
  saveNote.textContent = `Saved game: ${missionLabel(save)} — continue where you left off.`;
}
function missionLabel(s) {
  const m = MISSIONS[s.missionIndex];
  return m ? `mission ${m.id}: ${m.title}` : 'free roam';
}
document.getElementById('btn-start').addEventListener('click', () => {
  clearSave();
  // Fresh state for a brand-new run.
  const fresh = createState(seed);
  Object.assign(G, fresh);
  G.city = fresh.city;
  spawnTraffic(G, 14);
  spawnPeds(G, 26);
  startNewGame();
});
btnContinue.addEventListener('click', () => {
  const s = loadSave();
  if (s) continueGame(s);
});
document.getElementById('btn-resume').addEventListener('click', resumeGame);
document.getElementById('btn-save').addEventListener('click', () => {
  if (saveGame(G)) setMessage(G, 'Game saved.');
});
document.getElementById('btn-quit').addEventListener('click', () => {
  saveGame(G);
  G.mode = 'title';
  showOnly('screen-title');
});
document.getElementById('dlg-next').addEventListener('click', () => advanceDialog(G));
document.getElementById('end-continue').addEventListener('click', () => {
  respawnAtHQ(G);
  showOnly(null);
  G.mode = 'playing';
});
document.getElementById('complete-continue').addEventListener('click', () => {
  showOnly(null);
  G.mode = 'playing';
});
document.getElementById('btn-mute').addEventListener('click', () => toggleMute());
canvas.addEventListener('pointerdown', () => audio.unlock());

function toggleMute() {
  audio.unlock();
  const m = !audio.isMuted();
  audio.setMuted(m);
  document.getElementById('btn-mute').textContent = m ? '✕' : '♪';
}

// ---- populate the world ----

spawnTraffic(G, 14);
spawnPeds(G, 26);
G.camera.x = G.player.x;
G.camera.y = G.player.y;

// ---- screenshot staging (?shot=...) ----

function stageShot(name) {
  // Skip the title screen and the intro dialogs; the shot is the game itself.
  audio.unlock();
  const p = G.player;
  if (name === 'start') return; // title screen, nothing to stage
  showOnly(null);
  G.mode = 'playing';
  if (name === 'cover') {
    // Dusk chase on the Neon Strip: Rook in a sports car, 3 stars, police closing in.
    G.time = 18 * 60 + 45;
    G.missionIndex = 1;
    G.missionActive = true;
    G.missionStep = 2;
    G.missionState = { guardsSpawned: 0, guardsTotal: 4, thugsSpawned: {} };
    const car = makeCar(1800, 2100, 0, CAR_MODELS[5], '#e74c3c', 'none');
    car.x = 1800;
    car.y = 2114;
    G.cars.push(car);
    enterCar(G, car, audio);
    addHeat(G, 55, '');
    spawnPoliceCar(G);
    spawnPoliceCar(G);
    setMessage(G, 'Mission 2: Golden Getaway — deliver the Comet GT to your garage.');
  } else if (name === 'street') {
    // Daytime on foot in Old Town, first package job ahead.
    G.time = 14 * 60;
    G.missionIndex = 2;
    G.missionActive = true;
    G.missionStep = 0;
    G.missionState = { guardsSpawned: 0, guardsTotal: 4, thugsSpawned: {} };
    p.x = 720;
    p.y = 720;
    G.camera.x = p.x;
    G.camera.y = p.y;
    setMessage(G, 'Mission 3: Three Packages — grab package 1 in Old Town.');
  } else if (name === 'mission') {
    // Night raid on Kroll's warehouse: armed, four stars, guards everywhere.
    G.time = 21 * 60 + 30;
    G.missionIndex = 3;
    G.missionActive = true;
    G.missionStep = 1;
    G.missionState = { guardsSpawned: 4, guardsTotal: 4, thugsSpawned: {} };
    G.pistol = true;
    G.ammo = 24;
    p.x = 3150;
    p.y = 1200;
    p.angle = -Math.PI / 2;
    spawnGuard(G, 3060, 990);
    spawnGuard(G, 3240, 990);
    spawnGuard(G, 3060, 1110);
    spawnGuard(G, 3240, 1110);
    addHeat(G, 80, '');
    spawnPoliceCar(G);
    G.camera.x = p.x;
    G.camera.y = p.y;
    setMessage(G, 'Mission 4: The Ledger — take out Kroll\u2019s guards (0/4).');
  } else if (name === 'night') {
    // Neon night drive through the Strip with a 2-star tail.
    G.time = 22 * 60;
    G.missionIndex = 0;
    G.missionActive = true;
    G.missionStep = 1;
    G.missionState = { guardsSpawned: 0, guardsTotal: 4, thugsSpawned: {} };
    const car = makeCar(1800, 2400, 0, CAR_MODELS[4], '#f39c12', 'none');
    car.x = 1800;
    car.y = 2414;
    G.cars.push(car);
    enterCar(G, car, audio);
    addHeat(G, 35, '');
    spawnPoliceCar(G);
    setMessage(G, 'Mission 1: First Fare — pick up the passenger at Sunset Beach.');
  }
}

if (shot) stageShot(shot);
else showOnly('screen-title');

// ---- interaction (E key) ----

function handleInteract() {
  const p = G.player;
  if (p.inCar) {
    exitCar(G, audio);
    return;
  }
  const s = currentStep(G);
  const nearPackage = G.missionActive && s && s.kind === 'collect'
    && Math.hypot(p.x - s.x, p.y - s.y) < s.r + 10;
  if (nearPackage) return; // missions.js handles the pickup on the same press
  const car = nearestCar(G, 78);
  if (car) {
    enterCar(G, car, audio);
    return;
  }
  tryStartCourier(G, audio);
}

// ---- main loop ----

function frame(now) {
  requestAnimationFrame(frame);
  try {
    frameBody(now);
  } finally {
    // Always clear per-frame edges, even if a render step throws.
    input.endFrame();
  }
}

function frameBody(now) {
  const dt = Math.min(0.05, Math.max(0, (now - lastNow) / 1000));
  lastNow = now;

  // Mouse position in world coordinates (for aiming).
  input.mouse.worldX = G.camera.x + (input.mouse.x - vw / 2);
  input.mouse.worldY = G.camera.y + (input.mouse.y - vh / 2);

  if (G.mode === 'playing') {
    G.elapsed += dt;
    G.time += dt * 0.5; // 1 game hour per 2 real minutes
    if (G.time >= 24 * 60) G.time -= 24 * 60;

    updateEntities(G, dt, input, audio);
    updateMissions(G, dt, input, audio);
    updateCourier(G, dt, audio);

    // Health slowly recovers out of combat.
    if (G.health < prevHealth) lastHurtAt = G.elapsed;
    prevHealth = G.health;
    if (G.health < G.maxHealth && G.elapsed - lastHurtAt > 6) {
      G.health = Math.min(G.maxHealth, G.health + 2.5 * dt);
    }

    if (input.wasPressed('KeyE')) handleInteract();
    if (input.wasPressed('Enter') && !G.missionActive && currentMission(G)) {
      startMission(G, audio);
    }
    if (input.wasPressed('Escape') || input.wasPressed('KeyP')) pauseGame();
    if (G.elapsed - lastAutoSave > 60) {
      lastAutoSave = G.elapsed;
      saveGame(G);
    }
  } else if (G.mode === 'dialog') {
    if (input.wasPressed('KeyE') || input.wasPressed('Enter') || input.wasPressed('Space')) {
      advanceDialog(G);
    }
    if (input.wasPressed('Escape')) pauseGame();
  } else if (G.mode === 'paused') {
    if (input.wasPressed('Escape') || input.wasPressed('KeyP')) resumeGame();
  } else if (G.mode === 'title') {
    // Slow drift around the garage behind the title screen.
    G.camera.x = SPOTS.hq.x + Math.cos(now / 9000) * 260;
    G.camera.y = SPOTS.hq.y + Math.sin(now / 11000) * 200;
    G.time = 17 * 60 + 30;
  }

  if (input.wasPressed('KeyM')) toggleMute();

  // Dialog overlay follows the state.
  const dlg = document.getElementById('dialog');
  if (G.mode === 'dialog' && G.dialog) {
    dlg.hidden = false;
    document.getElementById('dlg-speaker').textContent = G.dialog.speaker;
    document.getElementById('dlg-text').textContent = G.dialog.text;
  } else {
    dlg.hidden = true;
  }

  // End screen follows the state.
  if (G.mode === 'end' && G.endInfo) {
    document.getElementById('end-title').textContent = G.endInfo.kind === 'busted' ? 'BUSTED' : 'WASTED';
    document.getElementById('end-text').textContent = G.endInfo.text;
    showOnly('screen-end');
  } else if (G.mode === 'complete') {
    showOnly('screen-complete');
  }

  renderWorld(ctx, G, vw, vh);
  if (G.mode !== 'title') {
    updateHUD(G);
    drawMinimap(G);
  }
}

requestAnimationFrame(frame);

// Debug / play-test handle (used by the maker's own tests, not by the game).
window.__NH = {
  G,
  version: 'neon-harbor-round2',
  startNewGame,
  stageShot,
  state() {
    return {
      mode: G.mode,
      money: G.money,
      health: G.health,
      heat: G.heat,
      pistol: G.pistol,
      ammo: G.ammo,
      missionIndex: G.missionIndex,
      missionStep: G.missionStep,
      missionActive: G.missionActive,
      player: { x: G.player.x, y: G.player.y, inCar: !!G.player.inCar },
      cars: G.cars.length,
      police: G.cars.filter((c) => c.driver === 'police').length,
      peds: G.peds.length,
      enemies: G.enemies.length,
      time: G.time,
    };
  },
};
