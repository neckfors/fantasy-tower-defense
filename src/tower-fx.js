import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { game } from './game.js';
import { getModel } from './enemies.js';

// The sorcerer on top of the tower + decorations that grow with level and upgrades.
const BODY = /_(Body|Head|ArmLeft|ArmRight|LegLeft|LegRight|Cape|Hat)$/;
const mat = (color, o = {}) => new THREE.MeshStandardMaterial({ color, flatShading: true, ...o });
const GOLD = mat(0xffc94a, { metalness: 0.3, roughness: 0.4, emissive: 0x553300 });
const STONE = mat(0x6b6f80, { roughness: 0.95 });
const WOOD = mat(0x5a3d26);
const RUNE = new THREE.MeshBasicMaterial({ color: 0xffd77a });

let fx, orbit, crown, beacon, beaconLight, heal = [], mixer, idle, cast, sorc, yaw = 0, sig = '';

export function initTower(scene, tower) {
  fx = new THREE.Group(); tower.add(fx);
  const m = getModel('Mage');
  sorc = clone(m.scene);
  sorc.traverse(n => {
    if (!n.isMesh) return;
    if (!BODY.test(n.name) && n.name !== '2H_Staff') { n.visible = false; return; }
    n.castShadow = true;
  });
  sorc.scale.setScalar(1.5);
  sorc.position.y = 13.6;
  tower.add(sorc);
  mixer = new THREE.AnimationMixer(sorc);
  const clip = n => THREE.AnimationClip.findByName(m.animations, n);
  idle = mixer.clipAction(clip('Idle')); idle.play();
  cast = mixer.clipAction(clip('Spellcast_Shoot')); cast.setLoop(THREE.LoopOnce); cast.timeScale = 2;
  mixer.addEventListener('finished', () => idle.setEffectiveWeight(1));
}

// Snap to face the target and cast. Returns the wand tip (where the bolts leave from).
export function sorcererCast(p) {
  if (!sorc) return null;
  yaw = Math.atan2(p.x, p.z);
  sorc.rotation.y = yaw;
  idle.setEffectiveWeight(0);
  cast.reset().play();
  return new THREE.Vector3(Math.sin(yaw) * 1.5, 15.7, Math.cos(yaw) * 1.5);
}

function ring(count, fn) { for (let i = 0; i < count; i++) fx.add(fn(i, (i / count) * Math.PI * 2)); }

function rebuild() {
  fx.clear(); heal = [];
  const P = n => game.picks[n] || 0, L = game.level;

  // gold bands up the body + spires on the battlements: more every level
  for (let i = 0; i < Math.min(6, Math.floor(L / 2)); i++) {
    const y = 2.6 + i * 1.5, r = 3.8 - ((y - 1.2) / 9) * 0.6 + 0.12;
    const b = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.3, 10), GOLD); b.position.y = y; fx.add(b);
  }
  const spires = Math.min(10, L - 1);
  for (let i = 0; i < spires; i++) {
    const a = (i / 10) * Math.PI * 2;
    const s = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.4, 6), GOLD);
    s.position.set(Math.cos(a) * 3.8, 13.3, Math.sin(a) * 3.8); s.castShadow = true; fx.add(s);
  }
  // Quick Draw: crossbows on the battlements
  ring(Math.min(8, P('Quick Draw')), (i, a) => {
    const c = new THREE.Group();
    c.add(new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.12, 0.12), WOOD));
    const st = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.9), WOOD); st.position.z = 0.4; c.add(st);
    c.position.set(Math.cos(a + 0.3) * 4.4, 12.9, Math.sin(a + 0.3) * 4.4); c.rotation.y = -a; return c;
  });
  // Reinforced Walls: stone buttresses
  ring(Math.min(12, P('Reinforced Walls') ? 4 + 2 * P('Reinforced Walls') : 0), (i, a) => {
    const h = 3 + 0.6 * P('Reinforced Walls');
    const b = new THREE.Mesh(new THREE.BoxGeometry(1.2, h, 1.2), STONE);
    b.position.set(Math.cos(a) * 4.7, h / 2, Math.sin(a) * 4.7); b.rotation.y = -a; b.castShadow = true; return b;
  });
  // Volley: ballistas pointing out and up
  ring(Math.min(6, game.multi - 1), (i, a) => {
    const g = new THREE.Group();
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.25, 1.8, 6), STONE);
    barrel.rotation.x = Math.PI / 2 - 0.5; g.add(barrel);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.5, 0.5, 6), WOOD); base.position.y = -0.4; g.add(base);
    g.position.set(Math.cos(a + 0.5) * 2.6, 14.1, Math.sin(a + 0.5) * 2.6); g.rotation.y = Math.PI / 2 - (a + 0.5); return g;
  });
  // Mending Stones: pulsing green gems around the base
  ring(Math.min(12, P('Mending Stones') * 3), (i, a) => {
    const g = new THREE.Mesh(new THREE.OctahedronGeometry(0.45), new THREE.MeshStandardMaterial({ color: 0x55ff99, emissive: 0x22cc66, emissiveIntensity: 1 }));
    g.position.set(Math.cos(a) * 6.4, 0.9, Math.sin(a) * 6.4); heal.push(g); return g;
  });
  // Eagle Eye: glowing beacon
  beacon = null;
  if (P('Eagle Eye')) {
    beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35 + 0.1 * Math.min(4, P('Eagle Eye')), 12, 8), new THREE.MeshBasicMaterial({ color: 0x8fd0ff }));
    beacon.position.set(-2.5, 15.6, 0);
    beaconLight = new THREE.PointLight(0x8fd0ff, 25, 18); beacon.add(beaconLight); fx.add(beacon);
  }
  // Level milestones: orbiting runes (5, 10, 15) and a crown (15)
  orbit = null; crown = null;
  if (L >= 5) {
    orbit = new THREE.Group();
    const n = L >= 15 ? 14 : L >= 10 ? 10 : 6;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.8, 0.12), RUNE);
      r.position.set(Math.cos(a) * 6.2, 8 + Math.sin(i * 2) * 1.2, Math.sin(a) * 6.2); r.rotation.y = -a; orbit.add(r);
    }
    fx.add(orbit);
  }
  if (L >= 15) {
    crown = new THREE.Group();
    const t = new THREE.Mesh(new THREE.TorusGeometry(1, 0.12, 6, 16), GOLD); t.rotation.x = Math.PI / 2; crown.add(t);
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.7, 5), GOLD); c.position.set(Math.cos(a), 0.4, Math.sin(a)); crown.add(c);
    }
    crown.position.y = 18; crown.add(new THREE.PointLight(0xffd77a, 30, 16)); fx.add(crown);
  }
}

export function updateTower(dt, t) {
  if (!fx) return;
  mixer.update(dt);
  const turn = Math.atan2(Math.sin(yaw - sorc.rotation.y), Math.cos(yaw - sorc.rotation.y));
  sorc.rotation.y += turn * Math.min(1, dt * 12);
  const s = [game.level, game.multi, ...Object.entries(game.picks)].join();
  if (s !== sig) { sig = s; rebuild(); }
  if (orbit) orbit.rotation.y += dt * 0.5;
  if (crown) { crown.rotation.y += dt * 1.2; crown.position.y = 18 + Math.sin(t * 2) * 0.3; }
  if (beacon) beaconLight.intensity = 20 + Math.sin(t * 3) * 8;
  heal.forEach((g, i) => { g.material.emissiveIntensity = 0.6 + 0.5 * Math.sin(t * 2 + i); g.rotation.y += dt; });
}
