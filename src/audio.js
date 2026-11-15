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
  levelup: () => { [523, 659, 784, 1047, 1319].forEach((f, i) => { tone('triangle', f, f, 0.3, 0.18, i * 0.08); tone('sine', f * 2, f * 2, 0.4, 0.06, i * 0.08); }); noise(0.5, 5000, 0.06, 0.3); },
  wave: () => { tone('sawtooth', 110, 110, 0.6, 0.2); tone('sawtooth', 165, 165, 0.6, 0.15); tone('sawtooth', 220, 330, 0.5, 0.1, 0.25); noise(0.4, 300, 0.12); },
  boss: () => { tone('sawtooth', 70, 45, 1.4, 0.4); tone('square', 75, 40, 1.4, 0.2); noise(1.0, 150, 0.3); tone('sine', 50, 25, 1.6, 0.5, 0.1); tone('sawtooth', 140, 70, 1.0, 0.15, 0.5); },
  over: () => [392, 330, 262, 196].forEach((f, i) => tone('sawtooth', f, f * 0.95, 0.5, 0.2, i * 0.3)),
  win: () => [392, 523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, 0.4, 0.2, i * 0.15)),
  click: () => tone('triangle', 600, 800, 0.06, 0.15),
  fireshoot: () => { noise(0.14, 1200, 0.16); tone('sawtooth', 500, 120, 0.14, 0.07); tone('triangle', 1200, 400, 0.08, 0.05); },
  zap: () => { noise(0.18, 4000, 0.18); tone('sawtooth', 1800, 200, 0.16, 0.1); tone('square', 900, 90, 0.12, 0.06, 0.03); },
  coin: () => { tone('square', 1318, 1318, 0.05, 0.07); tone('square', 1760, 1760, 0.12, 0.07, 0.05); },
  gem: () => [1568, 2093, 2637].forEach((f, i) => tone('sine', f, f, 0.3, 0.12, i * 0.07)),
  heal: () => [392, 494, 587, 784].forEach((f, i) => tone('sine', f, f * 1.01, 0.4, 0.14, i * 0.08)),
  horn: () => { tone('sawtooth', 196, 196, 0.5, 0.18); tone('sawtooth', 294, 294, 0.5, 0.14, 0.15); tone('square', 392, 392, 0.6, 0.1, 0.3); },
  rapid: () => { for (let i = 0; i < 6; i++) tone('square', 400 + i * 160, 500 + i * 200, 0.07, 0.08, i * 0.04); noise(0.3, 3000, 0.12); },
  meteor: () => { tone('sawtooth', 1200, 80, 0.7, 0.12); noise(0.6, 900, 0.15); },
  boom: () => { tone('sine', 120, 28, 0.55, 0.45); noise(0.4, 250, 0.35); tone('sawtooth', 200, 40, 0.3, 0.12); },
  frost: () => { [2093, 2637, 3136, 2349].forEach((f, i) => tone('sine', f, f * 0.8, 0.5, 0.1, i * 0.05)); noise(0.7, 6000, 0.1); tone('triangle', 300, 80, 0.8, 0.12); },
  shield: () => { tone('triangle', 220, 440, 0.4, 0.2); tone('triangle', 330, 660, 0.4, 0.15, 0.05); noise(0.25, 1500, 0.1); },
  shieldhit: () => { tone('triangle', 900, 500, 0.18, 0.2); noise(0.1, 3000, 0.15); },
  pause: () => { tone('triangle', 500, 300, 0.12, 0.15); tone('triangle', 400, 200, 0.14, 0.12, 0.08); },
  resume: () => { tone('triangle', 300, 500, 0.12, 0.15); tone('triangle', 400, 700, 0.14, 0.12, 0.08); },
  fanfare: () => [523, 659, 784, 659, 784, 1047, 1319].forEach((f, i) => { tone('triangle', f, f, 0.35, 0.18, i * 0.11); tone('sine', f / 2, f / 2, 0.35, 0.12, i * 0.11); }),
};
const MIN_GAP = { shoot: 0.05, fireshoot: 0.05, hit: 0.05, die: 0.08, hurt: 0.2, zap: 0.08, coin: 0.04, gem: 0.1, boom: 0.06, shieldhit: 0.15 };

export function sfx(name) {
  if (!ctx || muted || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  if (MIN_GAP[name] && now - (last[name] || 0) < MIN_GAP[name]) return;   // avoid spamming
  last[name] = now;
  SFX[name]();
}
