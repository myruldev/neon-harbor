// Neon Harbor — all sound is synthesized with WebAudio: no audio files.
// Engine hum, police siren, gunshots, punches, pickups and a chiptune loop.

export function createAudio() {
  let ctx = null;
  let master = null;
  let engineOsc = null;
  let engineOsc2 = null;
  let engineGain = null;
  let engineFilter = null;
  let sirenOsc = null;
  let sirenGain = null;
  let sirenLfo = null;
  let musicTimer = null;
  let musicStep = 0;
  let muted = false;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.5;
      master.connect(ctx.destination);
      return true;
    } catch (e) {
      return false;
    }
  }

  function unlock() {
    if (ensure() && ctx.state === 'suspended') ctx.resume().catch(() => {});
  }

  function setMuted(m) {
    muted = m;
    if (master && ctx) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.05);
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = null) {
    if (!ensure()) return;
    try {
      const t0 = ctx.currentTime + when;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = type;
      o.frequency.setValueAtTime(freq, t0);
      if (slideTo !== null) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(vol, t0 + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
      o.connect(g);
      g.connect(master);
      o.start(t0);
      o.stop(t0 + dur + 0.05);
    } catch (e) { /* audio is best-effort */ }
  }

  function noise(dur, vol, filterFreq, when = 0) {
    if (!ensure()) return;
    try {
      const t0 = ctx.currentTime + when;
      const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const src = ctx.createBufferSource();
      src.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = filterFreq;
      const g = ctx.createGain();
      g.gain.value = vol;
      src.connect(f);
      f.connect(g);
      g.connect(master);
      src.start(t0);
    } catch (e) { /* audio is best-effort */ }
  }

  function setEngine(on, speed01) {
    if (!ensure()) return;
    try {
      if (on && !engineOsc) {
        engineOsc = ctx.createOscillator();
        engineOsc2 = ctx.createOscillator();
        engineFilter = ctx.createBiquadFilter();
        engineGain = ctx.createGain();
        engineOsc.type = 'sawtooth';
        engineOsc2.type = 'square';
        engineFilter.type = 'lowpass';
        engineFilter.frequency.value = 900;
        engineGain.gain.value = 0.0;
        engineOsc.connect(engineFilter);
        engineOsc2.connect(engineFilter);
        engineFilter.connect(engineGain);
        engineGain.connect(master);
        engineOsc.start();
        engineOsc2.start();
      }
      if (!engineOsc) return;
      const t = ctx.currentTime;
      if (on) {
        const f = 55 + speed01 * 145;
        engineOsc.frequency.setTargetAtTime(f, t, 0.08);
        engineOsc2.frequency.setTargetAtTime(f * 1.5 + 2, t, 0.08);
        engineFilter.frequency.setTargetAtTime(500 + speed01 * 1600, t, 0.1);
        engineGain.gain.setTargetAtTime(0.05 + speed01 * 0.06, t, 0.1);
      } else {
        engineGain.gain.setTargetAtTime(0, t, 0.08);
      }
    } catch (e) { /* audio is best-effort */ }
  }

  function setSiren(on) {
    if (!ensure()) return;
    try {
      if (on && !sirenOsc) {
        sirenOsc = ctx.createOscillator();
        sirenLfo = ctx.createOscillator();
        const lfoGain = ctx.createGain();
        sirenGain = ctx.createGain();
        sirenOsc.type = 'sine';
        sirenOsc.frequency.value = 820;
        sirenLfo.type = 'square';
        sirenLfo.frequency.value = 0.55;
        lfoGain.gain.value = 180;
        sirenGain.gain.value = 0.035;
        sirenLfo.connect(lfoGain);
        lfoGain.connect(sirenOsc.frequency);
        sirenOsc.connect(sirenGain);
        sirenGain.connect(master);
        sirenOsc.start();
        sirenLfo.start();
      } else if (!on && sirenOsc) {
        try { sirenOsc.stop(); } catch (e) {}
        try { sirenLfo.stop(); } catch (e) {}
        sirenOsc = null;
        sirenLfo = null;
        sirenGain = null;
      }
    } catch (e) { /* audio is best-effort */ }
  }

  // A tiny chiptune loop: bass line + lead arp in A minor, 116 BPM.
  const BASS = [55, 0, 55, 0, 65.41, 0, 55, 0, 49, 0, 49, 0, 61.74, 0, 73.42, 0];
  const LEAD = [220, 261.63, 329.63, 440, 329.63, 261.63, 220, 0, 196, 246.94, 293.66, 392, 293.66, 246.94, 220, 0];
  function startMusic() {
    if (!ensure() || musicTimer) return;
    musicTimer = setInterval(() => {
      if (muted || !ctx || ctx.state !== 'running') return;
      const stepDur = 60 / 116 / 2;
      const b = BASS[musicStep % BASS.length];
      const l = LEAD[musicStep % LEAD.length];
      if (b) tone(b, stepDur * 1.8, 'triangle', 0.10);
      if (l && musicStep % 2 === 0) tone(l, stepDur * 0.9, 'square', 0.035);
      if (musicStep % 8 === 4) noise(0.05, 0.05, 6000);
      musicStep++;
    }, (60 / 116 / 2) * 1000);
  }
  function stopMusic() {
    if (musicTimer) {
      clearInterval(musicTimer);
      musicTimer = null;
    }
  }

  return {
    unlock,
    setMuted,
    isMuted() { return muted; },
    startMusic,
    stopMusic,
    setEngine,
    setSiren,
    shot() { noise(0.14, 0.5, 3200); tone(180, 0.08, 'square', 0.2, 0, 60); },
    punch() { noise(0.09, 0.35, 900); },
    pickup() { tone(660, 0.09, 'sine', 0.25); tone(990, 0.12, 'sine', 0.25, 0.09); },
    cash() { tone(880, 0.1, 'sine', 0.22); tone(1174.66, 0.1, 'sine', 0.22, 0.09); tone(1567.98, 0.18, 'sine', 0.22, 0.18); },
    denied() { tone(160, 0.16, 'square', 0.15, 0, 110); },
    missionDone() {
      tone(523.25, 0.12, 'triangle', 0.25);
      tone(659.25, 0.12, 'triangle', 0.25, 0.12);
      tone(783.99, 0.22, 'triangle', 0.25, 0.24);
    },
    busted() { tone(392, 0.25, 'sawtooth', 0.2, 0, 220); tone(311.13, 0.4, 'sawtooth', 0.2, 0.25, 180); },
    crash() { noise(0.25, 0.5, 700); },
    horn() { tone(370, 0.18, 'square', 0.12); tone(466, 0.18, 'square', 0.12); },
  };
}
