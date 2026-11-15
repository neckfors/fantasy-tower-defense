import * as THREE from 'three';
import { enemies, isAlive } from './enemies.js';

// Medieval life bars. Normal enemies: small bar above the head (projected from 3D).
// Bosses: big bar with their name at the top of the screen.
const box = document.createElement('div');
box.id = 'bars';
const top = document.createElement('div');
top.id = 'bossbars';
document.body.append(box, top);
const v = new THREE.Vector3();

export function updateBars(camera) {
  const w = innerWidth, h = innerHeight;
  for (const e of enemies) {
    const boss = e.type === 'boss';
    if (!e.bar) {
      const d = document.createElement('div');
      d.className = boss ? 'bbar' : 'ebar';
      d.innerHTML = (boss ? `<em>${e.t.name}</em>` : '') + '<div><i></i></div>';
      (boss ? top : box).appendChild(d);
      e.bar = d; e.barFill = d.querySelector('i');
    }
    const alive = isAlive(e);
    if (boss) {
      e.bar.style.display = alive ? '' : 'none';
    } else {
      v.copy(e.obj.position); v.y += 2.3 * e.obj.scale.x + (e.t.fly ? 0.8 : 0.3);
      v.project(camera);
      const show = alive && v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1;
      e.bar.style.display = show ? '' : 'none';
      if (!show) continue;
      e.bar.style.transform = `translate(${(v.x * 0.5 + 0.5) * w}px,${(-v.y * 0.5 + 0.5) * h}px) translate(-50%,-100%)`;
    }
    e.barFill.style.width = `${Math.max(0, e.hp / e.maxHp) * 100}%`;
  }
}

const toast = document.createElement('div');
toast.id = 'toast';
document.body.appendChild(toast);
export function emeraldToast(n) {
  toast.textContent = `💎 +${n} emerald${n > 1 ? 's' : ''}!`;
  toast.classList.remove('show'); void toast.offsetWidth; toast.classList.add('show');
}

export function removeBar(e) { if (e.bar) { e.bar.remove(); e.bar = null; } }
