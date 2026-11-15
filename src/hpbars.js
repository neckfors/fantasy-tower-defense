import * as THREE from 'three';
import { enemies, isAlive } from './enemies.js';

// Floating life bars (DOM overlay projected from 3D). Bosses get a bigger bar with their name.
const box = document.createElement('div');
box.id = 'bars';
document.body.appendChild(box);
const v = new THREE.Vector3();

export function updateBars(camera) {
  const w = innerWidth, h = innerHeight;
  for (const e of enemies) {
    if (!e.bar) {
      const boss = e.type === 'boss';
      const d = document.createElement('div');
      d.className = 'ebar' + (boss ? ' boss' : '');
      d.innerHTML = (boss ? `<em>${e.t.name}</em>` : '') + '<div><i></i></div>';
      box.appendChild(d);
      e.bar = d; e.barFill = d.querySelector('i');
    }
    const alive = isAlive(e);
    v.copy(e.obj.position); v.y += 2.3 * e.obj.scale.x + (e.t.fly ? 0.8 : 0.3);
    v.project(camera);
    const show = alive && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
    e.bar.style.display = show ? '' : 'none';
    if (!show) continue;
    e.bar.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px,${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-100%)`;
    e.barFill.style.width = `${Math.max(0, e.hp / e.maxHp) * 100}%`;
  }
}

export function removeBar(e) { if (e.bar) { e.bar.remove(); e.bar = null; } }
