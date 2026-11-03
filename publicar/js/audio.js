// Sonido: tonos por fase y ambientes generados en vivo (no requieren archivos).

let ctx = null;
let master = null;
let toneBus = null;
let ambBus = null;
let ambNodes = [];
let ambTimers = [];
let keepAlive = null;

function silentWav() {
  // WAV de 1 s en silencio: mantiene la sesión de audio de iOS en modo "reproducción"
  // para que se escuche aunque el iPhone esté en modo silencio.
  const rate = 8000, n = rate;
  const buf = new ArrayBuffer(44 + n);
  const v = new DataView(buf);
  const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVE'); w(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true);
  w(36, 'data'); v.setUint32(40, n, true);
  for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    toneBus = ctx.createGain();
    toneBus.connect(master);
    ambBus = ctx.createGain();
    ambBus.gain.value = 0;
    ambBus.connect(master);
  }
  if (ctx.state === 'suspended') ctx.resume();
  try {
    if (!keepAlive) {
      keepAlive = new Audio(silentWav());
      keepAlive.loop = true;
      keepAlive.setAttribute('playsinline', '');
    }
    keepAlive.play().catch(() => {});
  } catch (e) { /* sin elemento de audio */ }
  return ctx;
}

export function setVolumes({ tones = 80, music = 60 }) {
  if (!ctx) return;
  toneBus.gain.setTargetAtTime(tones / 100 * 0.5, ctx.currentTime, 0.05);
  ambBus.gain.setTargetAtTime(music / 100 * 0.6, ctx.currentTime, 0.4);
}

// Campanita suave para cada cambio de fase.
export function tone(freq, kind = 'in') {
  if (!ctx) return;
  const t = ctx.currentTime;
  const parts = kind === 'in' ? [1, 2] : kind === 'out' ? [1, 1.5] : [1];
  parts.forEach((mult, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.setValueAtTime(freq * mult, t);
    if (kind === 'in') o.frequency.exponentialRampToValueAtTime(freq * mult * 1.06, t + 0.6);
    if (kind === 'out') o.frequency.exponentialRampToValueAtTime(freq * mult * 0.94, t + 0.8);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(i ? 0.12 : 0.35, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
    o.connect(g).connect(toneBus);
    o.start(t);
    o.stop(t + 1.7);
  });
}

function noiseBuffer(seconds = 4, color = 'white') {
  const len = ctx.sampleRate * seconds;
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  let last = 0;
  for (let i = 0; i < len; i++) {
    const w = Math.random() * 2 - 1;
    if (color === 'brown') { last = (last + 0.02 * w) / 1.02; d[i] = last * 3.5; } else d[i] = w;
  }
  return b;
}

function loopNoise(color) {
  const src = ctx.createBufferSource();
  src.buffer = noiseBuffer(4, color);
  src.loop = true;
  return src;
}

function lfo(rate, depth, target) {
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.frequency.value = rate;
  g.gain.value = depth;
  o.connect(g).connect(target);
  o.start();
  ambNodes.push(o);
}

function pad(freqs, level = 0.05) {
  const out = ctx.createGain();
  out.gain.value = level;
  const f = ctx.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = 900;
  lfo(0.05, 300, f.frequency);
  freqs.forEach((fr, i) => {
    [0, 3].forEach((det) => {
      const o = ctx.createOscillator();
      o.type = i % 2 ? 'triangle' : 'sine';
      o.frequency.value = fr;
      o.detune.value = det * (i % 2 ? -1 : 1);
      o.connect(f);
      o.start();
      ambNodes.push(o);
    });
  });
  f.connect(out).connect(ambBus);
  ambNodes.push(f, out);
}

function chirp() {
  if (!ctx) return;
  const t = ctx.currentTime;
  const base = 2200 + Math.random() * 1600;
  for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const s = t + k * 0.13;
    o.frequency.setValueAtTime(base, s);
    o.frequency.exponentialRampToValueAtTime(base * (1.2 + Math.random() * 0.3), s + 0.08);
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.03, s + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.11);
    o.connect(g).connect(ambBus);
    o.start(s);
    o.stop(s + 0.12);
  }
}

export function startAmbient(id) {
  stopAmbient(true);
  if (!ctx || id === 'silencio') return;
  if (id === 'lluvia') {
    const n = loopNoise('white');
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 900;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000;
    const g = ctx.createGain(); g.gain.value = 0.18;
    lfo(0.13, 0.04, g.gain);
    n.connect(hp).connect(lp).connect(g).connect(ambBus);
    n.start();
    ambNodes.push(n, hp, lp, g);
  } else if (id === 'mar') {
    const n = loopNoise('brown');
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const g = ctx.createGain(); g.gain.value = 0.35;
    lfo(0.09, 350, lp.frequency);
    lfo(0.09, 0.22, g.gain);
    n.connect(lp).connect(g).connect(ambBus);
    n.start();
    ambNodes.push(n, lp, g);
  } else {
    pad([196, 246.94, 293.66, 392], 0.045);
    const n = loopNoise('brown');
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 300;
    const g = ctx.createGain(); g.gain.value = 0.08;
    n.connect(lp).connect(g).connect(ambBus);
    n.start();
    ambNodes.push(n, lp, g);
    const loop = () => { chirp(); ambTimers.push(setTimeout(loop, 3500 + Math.random() * 6000)); };
    ambTimers.push(setTimeout(loop, 2000));
  }
}

export function stopAmbient(immediate = false) {
  ambTimers.forEach(clearTimeout);
  ambTimers = [];
  const nodes = ambNodes;
  ambNodes = [];
  const kill = () => nodes.forEach((n) => { try { n.stop?.(); } catch (e) { /* ya detenido */ } try { n.disconnect(); } catch (e) { /* ya desconectado */ } });
  if (immediate || !ctx) kill();
  else {
    ambBus.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
    setTimeout(kill, 2500);
  }
}

export function stopAll() {
  stopAmbient();
  try { keepAlive?.pause(); } catch (e) { /* nada que pausar */ }
}

// Pantalla encendida durante la sesión.
let lock = null;
export async function keepScreenOn() {
  try { lock = await navigator.wakeLock?.request('screen'); } catch (e) { lock = null; }
}
export function releaseScreen() {
  try { lock?.release(); } catch (e) { /* ya liberado */ }
  lock = null;
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && lock === null && document.body.dataset.session === 'on') keepScreenOn();
});
