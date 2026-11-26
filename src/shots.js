import * as THREE from 'three';
import { spark, burst, ring } from './fx.js';

// Lobbed fireballs / magic orbs: damage happens when they land, so you can see who is hurting whom.
const lobs = [];
const geo = new THREE.SphereGeometry(1, 12, 10);
const mats = new Map();
const mat = c => mats.get(c) || mats.set(c, new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(1.8) })).get(c);
const r = () => Math.random() * 2 - 1;

// to: Vector3, or a function returning one (to follow a moving enemy)
export function lob(scene, from, to, { color = 0xff7a1a, size = 0.5, speed = 22, arc = 1.5, onImpact } = {}) {
  const mesh = new THREE.Mesh(geo, mat(color));
  mesh.scale.setScalar(size);
  mesh.position.copy(from);
  scene.add(mesh);
  const target = typeof to === 'function' ? to : () => to;
  lobs.push({ scene, mesh, from: from.clone(), target, color, size, arc, t: 0, time: Math.max(0.25, from.distanceTo(target()) / speed), onImpact });
}

export function updateShots(dt) {
  if (!dt) return;
  for (let i = lobs.length - 1; i >= 0; i--) {
    const o = lobs[i];
    if (!o) continue;                              // an impact cleared the list
    const k = Math.min(1, (o.t += dt) / o.time), end = o.target(), p = o.mesh.position;
    p.lerpVectors(o.from, end, k);
    p.y += Math.sin(k * Math.PI) * o.arc;
    for (let j = 0; j < 3; j++) spark(p.x + r() * o.size * 0.6, p.y + r() * o.size * 0.6, p.z + r() * o.size * 0.6, r(), r() + 0.5, r(), j ? o.color : 0xfff2c0, 0.25 + o.size * 0.35);
    if (k >= 1) {
      burst(p, o.color, 14 + o.size * 20, 4 + o.size * 8, 0.55, 1, -5);
      ring(p, o.color, 1 + o.size * 3, 0.35, Math.max(0.2, p.y));
      o.scene.remove(o.mesh); lobs.splice(i, 1);
      o.onImpact?.();
    }
  }
}

export function clearShots() { lobs.forEach(o => o.scene.remove(o.mesh)); lobs.length = 0; }
