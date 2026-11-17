// Neon Harbor — the story: four missions for Rook Calloway, who owes fixer
// Marla Voss $50,000, plus repeatable courier side jobs from the phone booth.

import { SPOTS, STORY, fmtMoney } from './config.js';
import { addHeat, setMessage, spawnThug, spawnGuard, burst } from './entities.js';
import { saveGame } from './state.js';

export const MISSIONS = [
  {
    id: 1,
    title: 'First Fare',
    reward: 800,
    intro: [
      ['Marla Voss', 'Rook. You owe me fifty grand, and the meter is running. First job: my driver is sick. Pick up my passenger at Sunset Beach and drive him to Hotel Lumen.'],
      ['Rook Calloway', 'A taxi job? I used to outrun the whole Harbor PD.'],
      ['Marla Voss', 'Then this will be easy. Get a car, pick him up, don\u2019t scratch the paint.'],
    ],
    steps: [
      { kind: 'goto', x: SPOTS.hq.x, y: SPOTS.hq.y, r: 70, label: 'Meet Marla at your garage', hint: 'Walk to the yellow marker.' },
      { kind: 'pickup', x: SPOTS.passenger.x, y: SPOTS.passenger.y, r: 60, label: 'Pick up the passenger at Sunset Beach', hint: 'You need a car — press E near one to get in.' },
      { kind: 'drive', x: SPOTS.hotel.x, y: SPOTS.hotel.y, r: 60, label: 'Drive the passenger to Hotel Lumen', hint: 'Stay on the roads. Mind the traffic.' },
    ],
    outro: [
      ['Marla Voss', 'Clean run. Eight hundred, on the books. Three jobs left, Rook.'],
    ],
  },
  {
    id: 2,
    title: 'Golden Getaway',
    reward: 1500,
    intro: [
      ['Marla Voss', 'Dante Kroll parks his golden Comet GT at the docks like nobody would dare touch it. Touch it. Bring it to the garage.'],
      ['Rook Calloway', 'Stealing from Kroll? That man collects debts in broken bones.'],
      ['Marla Voss', 'So drive fast. And Rook — there\u2019s a pistol in the glovebox now. You\u2019ll need it.'],
    ],
    steps: [
      { kind: 'goto', x: SPOTS.goldCar.x, y: SPOTS.goldCar.y, r: 80, label: 'Find the golden Comet GT at Harbor Docks', hint: 'Follow the yellow marker to the docks.' },
      { kind: 'steal', x: SPOTS.goldCar.x, y: SPOTS.goldCar.y, r: 70, label: 'Steal the Comet GT (press E)', hint: 'Press E next to the gold car. Expect heat.' },
      { kind: 'deliverCar', x: SPOTS.hq.x, y: SPOTS.hq.y, r: 80, label: 'Deliver the Comet GT to your garage', hint: 'The cops will be looking. Lose them or outrun them.' },
    ],
    outro: [
      ['Marla Voss', 'Beautiful. Kroll is furious, which is exactly the point. The pistol is yours — aim with the mouse, click to fire.'],
    ],
  },
  {
    id: 3,
    title: 'Three Packages',
    reward: 2000,
    intro: [
      ['Marla Voss', 'Kroll\u2019s runners are moving three packages across the city. Take all three before they reach his warehouse. His boys will not hand them over nicely.'],
      ['Rook Calloway', 'Packages, thugs, and a pistol. Finally a normal Tuesday.'],
    ],
    steps: [
      { kind: 'collect', x: SPOTS.package1.x, y: SPOTS.package1.y, r: 45, label: 'Grab package 1 in Old Town (press E)', hint: 'A thug is guarding it. Punch (F) or shoot.' },
      { kind: 'collect', x: SPOTS.package2.x, y: SPOTS.package2.y, r: 45, label: 'Grab package 2 in Crest Hills (press E)', hint: 'Watch for the guard.' },
      { kind: 'collect', x: SPOTS.package3.x, y: SPOTS.package3.y, r: 45, label: 'Grab package 3 at Marina Bay (press E)', hint: 'Last one. Then bring them home.' },
      { kind: 'goto', x: SPOTS.hq.x, y: SPOTS.hq.y, r: 80, label: 'Bring the packages to your garage', hint: 'Three packages, one very angry Kroll.' },
    ],
    outro: [
      ['Marla Voss', 'Kroll\u2019s network is blind now. Two thousand. One job left — the big one.'],
    ],
  },
  {
    id: 4,
    title: 'The Ledger',
    reward: 5000,
    intro: [
      ['Marla Voss', 'Kroll keeps a ledger in his dock warehouse — every debt, every name, including yours. Take it, and your fifty grand disappears with it.'],
      ['Rook Calloway', 'Then tonight the harbor gets its books balanced.'],
      ['Marla Voss', 'His guards are armed. So are you now. Get the ledger and come home.'],
    ],
    steps: [
      { kind: 'goto', x: SPOTS.warehouse.x, y: SPOTS.warehouse.y, r: 90, label: 'Reach Kroll\u2019s warehouse at Harbor Docks', hint: 'Armed guards inside. Be ready.' },
      { kind: 'clear', x: SPOTS.warehouse.x, y: SPOTS.warehouse.y, r: 200, label: 'Take out Kroll\u2019s guards (0/4)', hint: 'Aim with the mouse, click to shoot.' },
      { kind: 'collect', x: SPOTS.ledger.x, y: SPOTS.ledger.y, r: 50, label: 'Grab the ledger (press E)', hint: 'The ledger is on the crate. Take it and run.' },
      { kind: 'escape', x: SPOTS.hq.x, y: SPOTS.hq.y, r: 80, label: 'Escape to your garage!', hint: 'Four stars. Lose the cops and get home.' },
    ],
    outro: [
      ['Marla Voss', 'It\u2019s done, Rook. The ledger burns tonight, and so does your debt. Neon Harbor is yours now — drive it like you mean it.'],
    ],
  },
];

export function currentMission(G) {
  return MISSIONS[G.missionIndex] || null;
}

export function currentStep(G) {
  const m = currentMission(G);
  if (!m) return null;
  return m.steps[G.missionStep] || null;
}

export function missionMarker(G) {
  const s = currentStep(G);
  if (!s || !G.missionActive) return null;
  return { x: s.x, y: s.y, label: s.label };
}

export function startMission(G, audio) {
  const m = currentMission(G);
  if (!m) return;
  G.missionActive = true;
  G.missionStep = 0;
  G.missionState = { guardsSpawned: 0, guardsTotal: 4, thugsSpawned: {} };
  queueDialog(G, m.intro);
}

export function queueDialog(G, lines) {
  for (const [speaker, text] of lines) {
    G.dialogQueue.push({ speaker, text });
  }
  if (!G.dialog && G.dialogQueue.length > 0) {
    G.dialog = G.dialogQueue.shift();
    G.mode = 'dialog';
  }
}

export function advanceDialog(G) {
  if (G.dialogQueue.length > 0) {
    G.dialog = G.dialogQueue.shift();
  } else {
    G.dialog = null;
    G.mode = 'playing';
  }
}

function completeMission(G, audio) {
  const m = currentMission(G);
  G.missionActive = false;
  G.money += m.reward;
  G.stats.missionsDone += 1;
  G.stats.earned += m.reward;
  audio.cash();
  audio.missionDone();
  setMessage(G, `Mission complete: ${m.title} — earned ${fmtMoney(m.reward)}!`);
  saveGame(G);
  G.missionIndex += 1;
  G.missionStep = 0;
  G.missionState = {};
  if (m.id === 2) {
    G.pistol = true;
    G.ammo = 24;
  }
  if (m.outro) queueDialog(G, m.outro);
  if (G.missionIndex >= MISSIONS.length) {
    G.mode = 'complete';
  }
}

function advanceStep(G, audio) {
  const m = currentMission(G);
  G.missionStep += 1;
  audio.pickup();
  if (G.missionStep >= m.steps.length) {
    completeMission(G, audio);
  } else {
    const s = currentStep(G);
    if (s) setMessage(G, s.label);
  }
}

function near(G, x, y, r) {
  const p = G.player;
  return Math.hypot(p.x - x, p.y - y) < r;
}

// Called every frame while a mission is active. Handles step completion.
export function updateMissions(G, dt, input, audio) {
  const m = currentMission(G);
  if (!m || !G.missionActive) return;
  const s = currentStep(G);
  if (!s) return;
  const st = G.missionState;

  if (s.kind === 'goto') {
    if (near(G, s.x, s.y, s.r)) {
      if (m.id === 4 && G.missionStep === 0 && !st.guardsSpawned) {
        // Warehouse ambush: four armed guards.
        st.guardsSpawned = 4;
        spawnGuard(G, s.x - 90, s.y - 60);
        spawnGuard(G, s.x + 90, s.y - 60);
        spawnGuard(G, s.x - 90, s.y + 60);
        spawnGuard(G, s.x + 90, s.y + 60);
        setMessage(G, 'Kroll\u2019s guards are here!');
        addHeat(G, 10, '');
      }
      advanceStep(G, audio);
    }
  } else if (s.kind === 'pickup') {
    if (G.player.inCar && near(G, s.x, s.y, s.r)) {
      queueDialog(G, [['Passenger', 'Hotel Lumen, and step on it. The meter\u2019s running, friend.']]);
      advanceStep(G, audio);
    }
  } else if (s.kind === 'drive') {
    if (G.player.inCar && near(G, s.x, s.y, s.r)) {
      advanceStep(G, audio);
    }
  } else if (s.kind === 'steal') {
    if (G.player.inCar && G.player.inCar.isGold) {
      queueDialog(G, [['Rook Calloway', 'She\u2019s a beauty. Now let\u2019s see if she outruns the law.']]);
      advanceStep(G, audio);
    }
  } else if (s.kind === 'deliverCar') {
    if (G.player.inCar && G.player.inCar.isGold && near(G, s.x, s.y, s.r)) {
      advanceStep(G, audio);
    }
  } else if (s.kind === 'collect') {
    // A thug guards each package; spawn him when the player gets close.
    const key = `thug${G.missionStep}`;
    if (!st.thugsSpawned[key] && near(G, s.x, s.y, 260)) {
      st.thugsSpawned[key] = true;
      spawnThug(G, s.x + 50, s.y + 30);
      setMessage(G, 'A thug is guarding the package!');
    }
    if (near(G, s.x, s.y, s.r) && input.wasPressed('KeyE')) {
      burst(G, s.x, s.y, '#ffd94d', 12, 160, 0.5, 3);
      audio.pickup();
      advanceStep(G, audio);
    }
  } else if (s.kind === 'clear') {
    const left = G.enemies.filter((e) => e.kind === 'guard').length;
    const label = `Take out Kroll\u2019s guards (${4 - left}/4)`;
    if (s.label !== label) s.label = label;
    if (left === 0 && st.guardsSpawned > 0) {
      advanceStep(G, audio);
    }
  } else if (s.kind === 'escape') {
    if (near(G, s.x, s.y, s.r)) {
      advanceStep(G, audio);
    }
  }
}

// ---- courier side jobs ----

export function tryStartCourier(G, audio) {
  const p = G.player;
  if (G.courier) return;
  if (G.courierCooldown > 0) {
    setMessage(G, 'The phone is quiet for now. Check back soon.');
    return;
  }
  if (Math.hypot(p.x - SPOTS.phoneBooth.x, p.y - SPOTS.phoneBooth.y) > 70) return;
  // Pick a random drop-off far from the booth.
  const spots = [SPOTS.hotel, SPOTS.passenger, SPOTS.package2, SPOTS.package3, SPOTS.warehouse];
  const dest = spots[Math.floor(Math.random() * spots.length)];
  const dist = Math.hypot(dest.x - SPOTS.phoneBooth.x, dest.y - SPOTS.phoneBooth.y);
  const reward = 150 + Math.round(dist / 10);
  G.courier = { x: dest.x, y: dest.y, deadline: 100, reward, label: dest.label };
  audio.pickup();
  setMessage(G, `Courier job: deliver to ${dest.label} in 100s — ${fmtMoney(reward)}.`);
}

export function updateCourier(G, dt, audio) {
  if (G.courierCooldown > 0) G.courierCooldown -= dt;
  const c = G.courier;
  if (!c) return;
  c.deadline -= dt;
  if (c.deadline <= 0) {
    G.courier = null;
    G.courierCooldown = 25;
    setMessage(G, 'Courier job failed — the package went cold.');
    return;
  }
  const p = G.player;
  if (Math.hypot(p.x - c.x, p.y - c.y) < 55) {
    G.money += c.reward;
    G.stats.couriersDone += 1;
    G.stats.earned += c.reward;
    audio.cash();
    setMessage(G, `Courier delivered — earned ${fmtMoney(c.reward)}!`);
    G.courier = null;
    G.courierCooldown = 12;
    saveGame(G);
  }
}
