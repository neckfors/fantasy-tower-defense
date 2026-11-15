// Procedural sound effects (WebAudio) - generated in code, no audio files, no licenses.
let ctx, master, noiseBuf;
let muted = (() => { try { return localStorage.getItem('ftd-mute') === '1'; } catch { return false; } })();

function init() {
  if (ctx) return;
  ctx = new (window.AudioContext || window.webkitAudioContext)();
  master = ctx.createGain(); master.gain.value = muted ? 0 : 0.35; master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}
addEventListener('pointerdown', () => { init(); ctx.resume(); });
addEventListener('keydown', e => { init(); ctx.resume(); if (e.key === 'm' || e.key === 'M') toggleMute(); });

export const isMuted = () => muted;
export function toggleMute() {
  muted = !muted;
  try { localStorage.setItem('ftd-mute', muted ? '1' : '0'); } catch {}
  if (master) master.gain.value = muted ? 0 : 0.35;
  const b = document.getElementById('mute'); if (b) b.textContent = muted ? '🔇' : '🔊';
}

function tone(type, f0, f1, dur, vol = 0.3, delay = 0) {
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g).connect(master); o.start(t); o.stop(t + dur);
}
function noise(dur, freq, vol = 0.3, delay = 0) {
  const t = ctx.currentTime + delay;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + dur);
}

const last = {};
const SFX = {
  shoot: () => { noise(0.08, 2500, 0.12); tone('triangle', 900, 300, 0.1, 0.08); },
  hit: () => { tone('square', 220, 90, 0.07, 0.08); },
  die: () => { tone('sawtooth', 300, 60, 0.3, 0.12); noise(0.2, 600, 0.1); },
  hurt: () => { tone('sine', 90, 40, 0.3, 0.4); noise(0.15, 200, 0.25); },
  levelup: () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.25, 0.2, i * 0.09)),
  wave: () => { tone('sawtooth', 110, 110, 0.5, 0.2); tone('sawtooth', 165, 165, 0.5, 0.15); },
  boss: () => { tone('sawtooth', 70, 45, 1.2, 0.4); tone('square', 75, 40, 1.2, 0.2); noise(0.8, 150, 0.3); },
  over: () => [392, 330, 262, 196].forEach((f, i) => tone('sawtooth', f, f * 0.95, 0.5, 0.2, i * 0.3)),
  win: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.4, 0.2, i * 0.15)),
  click: () => tone('triangle', 600, 800, 0.06, 0.15),
};
const MIN_GAP = { shoot: 0.05, hit: 0.05, die: 0.08, hurt: 0.2 };

export function sfx(name) {
  if (!ctx || muted || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (MIN_GAP[name] && now - (last[name] || 0) < MIN_GAP[name]) return;   // avoid spamming
  last[name] = now;
  SFX[name]();
}
