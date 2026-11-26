import * as THREE from 'three';

// Floating damage numbers. Small repeated ticks (poison, burn...) are added up per enemy and kind.
const box = document.createElement('div');
box.id = 'nums';
document.body.append(box);
const live = [];
const v = new THREE.Vector3();
const LIFE = 0.9, MAX = 40;

export function popNumber(pos, amount, kind = 'hit', key = null) {
  const old = key && live.find(o => o.key === key && o.kind === kind && o.t < 0.35);
  if (old) { old.v += amount; old.el.textContent = Math.round(old.v) || 1; return; }
  if (live.length >= MAX) live.shift().el.remove();
  const el = document.createElement('b');
  el.className = `n-${kind}`;
  el.textContent = Math.round(amount) || 1;
  box.append(el);
  live.push({ el, key, kind, v: amount, t: 0, pos: new THREE.Vector3(pos.x + (Math.random() - 0.5), pos.y, pos.z + (Math.random() - 0.5)) });
}

export function updateNumbers(dt, camera) {
  for (let i = live.length - 1; i >= 0; i--) {
    const o = live[i];
    if ((o.t += dt) > LIFE) { o.el.remove(); live.splice(i, 1); continue; }
    v.copy(o.pos); v.y += o.t * 2.6;
    v.project(camera);
    o.el.style.opacity = v.z < 1 ? Math.min(1, (LIFE - o.t) * 3) : 0;
    o.el.style.transform = `translate(${(v.x * 0.5 + 0.5) * innerWidth}px,${(-v.y * 0.5 + 0.5) * innerHeight}px) translate(-50%,-50%)`;
  }
}
