import * as THREE from 'three';
import { SPAWN_R, softTexture } from './world.js';
import { spark, burst, ring } from './fx.js';

// Magic doors: every enemy walks out of one of six stone archways around the arena.
const COUNT = 6, HALF = 3.4, PILLAR = 5.2, PORTAL_R = SPAWN_R + 0.3;
const portals = [];
const MAGIC = new THREE.Color(0x8a4cff), BOSS = new THREE.Color(0xff3320);

const vortexShader = {
  vertexShader: `varying vec2 vP; void main() { vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `uniform float time, power; uniform vec3 color; varying vec2 vP;
    void main() {
      vec2 p = (vP - vec2(0.0, ${(PILLAR * 0.72).toFixed(2)})) / vec2(${HALF.toFixed(2)}, ${PILLAR.toFixed(2)});
      float r = length(p), a = atan(p.y, p.x);
      float swirl = sin(a * 3.0 + r * 12.0 - time * 4.0) * 0.5 + 0.5;
      float swirl2 = sin(a * 5.0 - r * 7.0 + time * 2.3) * 0.5 + 0.5;
      vec3 c = color * (0.25 + swirl * swirl * 0.9 + swirl2 * 0.35) + vec3(0.9, 0.85, 1.0) * pow(max(0.0, 1.0 - r * 1.8), 2.0);
      gl_FragColor = vec4(c * (0.35 + power * 1.1), 0.55 + power * 0.4);
    }`,
};

function doorway() {                               // flat shape filling the inside of the arch
  const s = new THREE.Shape();
  s.moveTo(-HALF, 0); s.lineTo(-HALF, PILLAR); s.absarc(0, PILLAR, HALF, Math.PI, 0, true); s.lineTo(HALF, 0);
  return new THREE.ShapeGeometry(s, 24);
}

export function initPortals(scene) {
  const stone = new THREE.MeshStandardMaterial({ color: 0x5d5a6e, roughness: 0.95, flatShading: true });
  const shape = doorway(), block = new THREE.BoxGeometry(1.5, 1.3, 1.5), voussoir = new THREE.BoxGeometry(1.35, 1.3, 1.4);
  const gem = new THREE.OctahedronGeometry(0.32), glowTex = softTexture();
  for (let i = 0; i < COUNT; i++) {
    const a = (i / COUNT) * Math.PI * 2 + Math.PI / COUNT;
    const g = new THREE.Group();
    g.position.set(Math.cos(a) * PORTAL_R, 0, Math.sin(a) * PORTAL_R);
    g.rotation.y = Math.atan2(-g.position.x, -g.position.z);   // local +z faces the tower
    const add = (geo, mat, x, y, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); g.add(m); return m; };
    for (const side of [-1, 1]) {
      for (let k = 0; k < 4; k++) {
        const m = add(block, stone, side * (HALF + 0.65), 0.65 + k * 1.3);
        m.rotation.y = (Math.random() - 0.5) * 0.25; m.castShadow = m.receiveShadow = true;
      }
    }
    for (let k = 0; k <= 8; k++) {
      const t = (k / 8) * Math.PI;
      const m = add(voussoir, stone, Math.cos(t) * (HALF + 0.65), PILLAR + Math.sin(t) * (HALF + 0.65));
      m.rotation.z = t - Math.PI / 2; m.castShadow = true;
    }
    const runeMat = new THREE.MeshBasicMaterial({ color: MAGIC.clone() });
    for (const side of [-1, 1]) for (const y of [1.4, 3.4]) add(gem, runeMat, side * (HALF + 0.65), y, 0.85).scale.y = 1.7;
    add(gem, runeMat, 0, PILLAR + HALF + 0.65, 0.85).scale.setScalar(2);
    const mat = new THREE.ShaderMaterial({
      ...vortexShader, transparent: true, side: THREE.DoubleSide, depthWrite: false,
      uniforms: { time: { value: Math.random() * 9 }, power: { value: 0 }, color: { value: MAGIC.clone() } },
    });
    add(shape, mat, 0, 0);
    const pool = add(new THREE.PlaneGeometry(13, 9).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: MAGIC.clone(), map: glowTex, transparent: true, opacity: 0.15, blending: THREE.AdditiveBlending, depthWrite: false }), 0, 0.12, 1.5);
    scene.add(g);
    portals.push({ g, mat, runeMat, pool: pool.material, active: false, boss: false, power: 0, flash: 0 });
  }
}

export const portalAngles = () => portals.map((_, i) => (i / COUNT) * Math.PI * 2 + Math.PI / COUNT);

const shuffled = () => portals.map(p => [Math.random(), p]).sort((a, b) => a[0] - b[0]).map(t => t[1]);

// a new wave: more doors open the further you get
export function openPortals(wave, boss) {
  const n = Math.min(COUNT, 2 + Math.floor(wave / 3));
  closePortals();
  shuffled().slice(0, n).forEach((p, i) => { p.active = true; p.boss = boss && i === 0; p.flash = 1; ring(p.g.position, p.boss ? 0xff4020 : 0x9a6bff, 8, 0.8); });
}
export function closePortals() { for (const p of portals) { p.active = false; p.boss = false; } }
export const bossPortal = () => portals.find(p => p.boss) || randomPortal();

export function randomPortal() {
  let open = portals.filter(p => p.active);
  if (!open.length) { const p = portals[Math.floor(Math.random() * portals.length)]; p.flash = 1; return p; }
  return open[Math.floor(Math.random() * open.length)];
}

// a point in the doorway (with a little sideways spread); flashes the door
export function stepThrough(portal, width = 1) {
  portal.flash = 1;
  const off = (Math.random() - 0.5) * 2 * Math.max(0, HALF - 0.9 - width * 0.6);
  const c = portal.g.position, yaw = portal.g.rotation.y;
  const x = c.x + Math.cos(yaw) * off, z = c.z - Math.sin(yaw) * off;
  burst(new THREE.Vector3(x, 2, z), portal.boss ? 0xff5030 : 0xb98cff, 18, 5, 0.6, 1, 0);
  return { x, z };
}

const v = new THREE.Vector3();
export function updatePortals(dt) {
  for (const p of portals) {
    p.flash = Math.max(0, p.flash - dt * 1.8);
    p.power += ((p.active ? 0.65 : 0) - p.power) * Math.min(1, dt * 3);
    const power = p.power + p.flash * 0.6, col = p.boss ? BOSS : MAGIC;
    p.mat.uniforms.time.value += dt * (0.35 + power * 1.4);
    p.mat.uniforms.power.value = power;
    p.mat.uniforms.color.value.lerp(col, Math.min(1, dt * 4));
    p.runeMat.color.copy(p.mat.uniforms.color.value).multiplyScalar(0.5 + power * 2.4);
    p.pool.color.copy(p.mat.uniforms.color.value);
    p.pool.opacity = 0.12 + power * 0.5;
    const s = p.boss ? 1.35 : 1;
    p.g.scale.setScalar(p.g.scale.x + (s - p.g.scale.x) * Math.min(1, dt * 3));
    if (p.active && Math.random() < dt * 14) {     // embers drifting out of open doors
      v.set((Math.random() - 0.5) * HALF * 1.7, Math.random() * PILLAR, 0.3).applyMatrix4(p.g.matrixWorld);
      spark(v.x, v.y, v.z, -v.x * 0.04, 0.8 + Math.random(), -v.z * 0.04, p.boss ? 0xff5a2a : 0xa070ff, 1.3);
    }
  }
}
