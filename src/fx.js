import * as THREE from 'three';
import { game } from './game.js';

// Visual effects: additive particles, expanding rings, meteors, flying coin/emerald pickups, shield dome.
let scene;
const MAX = 2500;
const P = new Float32Array(MAX * 3), CL = new Float32Array(MAX * 3), BC = new Float32Array(MAX * 3);
const V = new Float32Array(MAX * 3), LF = new Float32Array(MAX), ML = new Float32Array(MAX), G = new Float32Array(MAX);
let n = 0, geo;
const C = new THREE.Color();
const TOP = new THREE.Vector3(0, 13.5, 0);
const rings = [], meteors = [], pickups = [];
let dome;

function glowTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const x = c.getContext('2d'), g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, '#fff'); g.addColorStop(0.35, '#fffa'); g.addColorStop(1, '#0000');
  x.fillStyle = g; x.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

export function initFx(sc) {
  scene = sc;
  geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(P, 3).setUsage(THREE.DynamicDrawUsage));
  geo.setAttribute('color', new THREE.BufferAttribute(CL, 3).setUsage(THREE.DynamicDrawUsage));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ size: 1.3, map: glowTexture(), vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  pts.frustumCulled = false;
  scene.add(pts);
  dome = new THREE.Mesh(new THREE.SphereGeometry(10.5, 32, 20),
    new THREE.MeshBasicMaterial({ color: 0x66aaff, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  dome.position.y = 6; dome.visible = false;
  scene.add(dome);
}

export function spark(x, y, z, vx, vy, vz, color, life = 0.5, g = 0) {
  if (n >= MAX) return;
  const i = n++;
  C.set(color);
  P.set([x, y, z], i * 3); V.set([vx, vy, vz], i * 3); BC.set([C.r, C.g, C.b], i * 3);
  LF[i] = ML[i] = life; G[i] = g;
}
const r = () => Math.random() * 2 - 1;
export function burst(p, color, count = 16, speed = 6, life = 0.6, up = 0, g = -6) {
  for (let k = 0; k < count; k++) {
    const d = new THREE.Vector3(r(), r(), r()).normalize().multiplyScalar(speed * (0.3 + Math.random() * 0.7));
    spark(p.x, p.y, p.z, d.x, d.y + up, d.z, color, life * (0.6 + Math.random() * 0.6), g);
  }
}
export function ring(p, color, maxR, time = 0.7, y = 0.2) {
  const m = new THREE.Mesh(new THREE.RingGeometry(0.88, 1, 64).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  m.position.set(p.x, y, p.z); m.scale.setScalar(0.01);
  scene.add(m); rings.push({ m, t: 0, time, maxR });
}

// falling fireball; onImpact runs when it lands (that is when damage is dealt)
export function meteor(target, delay, onImpact) { meteors.push({ target, t: -delay, mesh: null, onImpact }); }

const coinGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.1, 14).rotateX(Math.PI / 2);
const gemGeo = new THREE.OctahedronGeometry(0.55);
const coinMat = new THREE.MeshBasicMaterial({ color: 0xffd23f });
const gemMat = new THREE.MeshBasicMaterial({ color: 0x3dff8a });
// coin/emerald hops out of a dead enemy then flies to the tower
export function pickup(p, emerald) {
  const mesh = new THREE.Mesh(emerald ? gemGeo : coinGeo, emerald ? gemMat : coinMat);
  if (emerald) mesh.scale.setScalar(1.3);
  mesh.position.set(p.x, p.y + 1.2, p.z);
  scene.add(mesh);
  pickups.push({ mesh, emerald, t: 0, hop: emerald ? 0.9 : 0.45, vx: r() * 2.5, vy: 6 + Math.random() * 3, vz: r() * 2.5, spd: 0 });
}

// ---- the Armoury spells ----
const ORG = new THREE.Vector3(0, 0, 0);
export function castFx(name) {
  const R = game.range;
  if (name === 'Repair Tower') {
    ring(ORG, 0x55ff88, 10, 0.9); ring(ORG, 0xaaffcc, 6, 0.7, 6);
    for (let k = 0; k < 90; k++) { const a = Math.random() * 6.28, d = 2 + Math.random() * 4; spark(Math.cos(a) * d, 0.5, Math.sin(a) * d, 0, 4 + Math.random() * 5, 0, 0x66ff99, 1.4); }
  } else if (name === 'Rally Cry') {
    ring(ORG, 0xffd23f, R * 0.6, 0.9); ring(ORG, 0xfff2a0, 8, 0.6, 8);
    for (let k = 0; k < 70; k++) { const a = Math.random() * 6.28; spark(Math.cos(a) * 3, 1, Math.sin(a) * 3, Math.cos(a) * 3, 5 + Math.random() * 6, Math.sin(a) * 3, 0xffd23f, 1.1, -3); }
  } else if (name === 'Rapid Fire') {
    ring(ORG, 0xff5a2a, 9, 0.6, 13.5); ring(ORG, 0xffa040, 12, 0.8, 11);
    burst(TOP, 0xff7a1a, 60, 11, 0.8, 2, -2);
  } else if (name === 'Frost Nova') {
    ring(ORG, 0xaaf0ff, R, 0.9); ring(ORG, 0x5ac8ff, R * 0.7, 1.1); ring(ORG, 0xffffff, R * 0.4, 0.7);
    for (let k = 0; k < 260; k++) { const a = Math.random() * 6.28, d = Math.sqrt(Math.random()) * R; spark(Math.cos(a) * d, 4 + Math.random() * 12, Math.sin(a) * d, r(), -2 - Math.random() * 3, r(), 0xcff6ff, 2 + Math.random(), 0); }
  } else if (name === 'Barricade') {
    ring(ORG, 0x66aaff, 12, 0.8); ring(ORG, 0xbfe0ff, 9, 0.6, 7);
    for (let k = 0; k < 80; k++) { const a = Math.random() * 6.28, b = Math.random() * 3.14; spark(Math.cos(a) * Math.sin(b) * 10, 6 + Math.cos(b) * 10, Math.sin(a) * Math.sin(b) * 10, 0, 0, 0, 0x88c0ff, 0.9); }
  }
}

const ease = k => 1 - (1 - k) * (1 - k);
const tmp = new THREE.Vector3();
export function updateFx(dt) {
  if (!scene) return;
  // ambient buff sparkles
  if (game.rallyT > 0 && Math.random() < dt * 25) { const a = Math.random() * 6.28; spark(Math.cos(a) * 3.6, 0.5, Math.sin(a) * 3.6, 0, 4, 0, 0xffd23f, 1.2); }
  if (game.rapidT > 0 && Math.random() < dt * 30) spark(r() * 1.5, 13.5, r() * 1.5, r() * 3, 2 + Math.random() * 3, r() * 3, 0xff7a1a, 0.6);
  dome.visible = game.shield > 0;
  if (dome.visible) {
    game.shieldFlash = Math.max(0, (game.shieldFlash || 0) - dt);
    dome.material.opacity = 0.1 + 0.05 * Math.sin(performance.now() / 300) + game.shieldFlash * 1.5;
  }

  for (let i = n - 1; i >= 0; i--) {           // particles
    if ((LF[i] -= dt) <= 0) {
      n--; if (i !== n) { for (let j = 0; j < 3; j++) { P[i * 3 + j] = P[n * 3 + j]; V[i * 3 + j] = V[n * 3 + j]; BC[i * 3 + j] = BC[n * 3 + j]; } LF[i] = LF[n]; ML[i] = ML[n]; G[i] = G[n]; }
      continue;
    }
    V[i * 3 + 1] += G[i] * dt;
    for (let j = 0; j < 3; j++) P[i * 3 + j] += V[i * 3 + j] * dt;
    const f = LF[i] / ML[i];
    for (let j = 0; j < 3; j++) CL[i * 3 + j] = BC[i * 3 + j] * f;
  }
  geo.setDrawRange(0, n);
  geo.attributes.position.needsUpdate = geo.attributes.color.needsUpdate = true;

  for (let i = rings.length - 1; i >= 0; i--) {  // rings
    const o = rings[i], k = (o.t += dt) / o.time;
    if (k >= 1) { scene.remove(o.m); o.m.geometry.dispose(); o.m.material.dispose(); rings.splice(i, 1); continue; }
    o.m.scale.setScalar(Math.max(0.01, o.maxR * ease(k)));
    o.m.material.opacity = 0.95 * (1 - k);
  }

  for (let i = meteors.length - 1; i >= 0; i--) { // meteors
    const o = meteors[i];
    if ((o.t += dt) < 0) continue;
    const end = o.target.obj.position, FALL = 0.6;
    if (!o.mesh) {
      o.mesh = new THREE.Mesh(new THREE.SphereGeometry(0.9, 12, 10), new THREE.MeshBasicMaterial({ color: 0xffa040 }));
      scene.add(o.mesh);
    }
    const k = Math.min(1, o.t / FALL);
    tmp.set(end.x + 14 * (1 - k), end.y + 1 + 50 * (1 - k) * (1 - k * 0.2), end.z + 8 * (1 - k));
    o.mesh.position.copy(tmp);
    spark(tmp.x, tmp.y, tmp.z, r(), r(), r(), 0xff6a1a, 0.5);
    spark(tmp.x, tmp.y, tmp.z, r(), r(), r(), 0xffd070, 0.3);
    if (k >= 1) {
      tmp.set(end.x, end.y + 1, end.z);
      burst(tmp, 0xffa030, 45, 13, 0.9, 4, -9);
      burst(tmp, 0xff3a10, 25, 7, 1, 2, -3);
      ring(end, 0xff6a1a, 6, 0.5); ring(end, 0xffd070, 3.5, 0.35);
      scene.remove(o.mesh); o.mesh.geometry.dispose(); o.mesh.material.dispose();
      o.onImpact?.();
      meteors.splice(i, 1);
    }
  }

  for (let i = pickups.length - 1; i >= 0; i--) { // coins / emeralds
    const o = pickups[i], m = o.mesh;
    o.t += dt;
    m.rotation.y += dt * 8; if (o.emerald) m.rotation.x += dt * 3;
    if (o.t < o.hop) {
      o.vy -= 22 * dt;
      m.position.x += o.vx * dt; m.position.y = Math.max(0.4, m.position.y + o.vy * dt); m.position.z += o.vz * dt;
    } else {
      o.spd += dt * 60;
      tmp.copy(TOP).sub(m.position);
      const d = tmp.length();
      if (d < 1) {
        burst(TOP, o.emerald ? 0x3dff8a : 0xffd23f, o.emerald ? 18 : 6, 4, 0.5, 0, 0);
        scene.remove(m); pickups.splice(i, 1); continue;
      }
      m.position.addScaledVector(tmp.divideScalar(d), Math.min(d, (6 + o.spd) * dt));
    }
    if (o.emerald || Math.random() < 0.3) spark(m.position.x, m.position.y, m.position.z, r(), r(), r(), o.emerald ? 0x3dff8a : 0xffd23f, 0.4);
  }
}
