import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { game, dmgNow } from './game.js';
import { getModel, enemies, isAlive, damageEnemy } from './enemies.js';
import { distC, doomed } from './targeting.js';
import { burst, ring } from './fx.js';

// Shadow Knights: ghostly knights that leave the tower, run to enemies and hit them.
const BODY = /_(Body|Head|ArmLeft|ArmRight|LegLeft|LegRight|Cape|Helmet)$/;
const KEEP = ['1H_Sword', 'Round_Shield'];
const knights = [];

function spawnKnight(scene) {
  const m = getModel('Knight');
  const obj = clone(m.scene);
  obj.traverse(n => {
    if (!n.isMesh) return;
    if (!BODY.test(n.name) && !KEEP.includes(n.name)) { n.visible = false; return; }
    n.material = n.material.clone();
    n.material.color.setHex(0x3a2a66); n.material.emissive.setHex(0x2a1a66);
    n.material.transparent = true; n.material.opacity = 0.82;
  });
  obj.scale.setScalar(1.3);
  obj.position.set(0, 0, 3.5);
  scene.add(obj);
  const mixer = new THREE.AnimationMixer(obj);
  const act = n => mixer.clipAction(THREE.AnimationClip.findByName(m.animations, n));
  const acts = { idle: act('Idle'), run: act('Walking_A'), atk: act('1H_Melee_Attack_Slice_Horizontal') };
  acts.run.timeScale = 1.8;
  acts.idle.play();
  knights.push({ obj, mixer, acts, cur: 'idle', target: null, swing: 0, engaged: false, blink: 0, i: knights.length });
}

function setAnim(k, name) {
  if (k.cur === name) return;
  k.acts[k.cur].fadeOut(0.15);
  k.acts[name].reset().fadeIn(0.15).play();
  k.cur = name;
}

// Knights take the fights the tower won't finish first: tough or standing enemies, close to the knight,
// not already doomed and not another knight's prey. Flyers are out of reach of a sword.
function choose(k) {
  const p = k.obj.position;
  let best = null, bs = Infinity;
  for (const e of enemies) {
    if (!isAlive(e) || e.emerging || e.t.fly || doomed(e) || distC(e) > game.range) continue;
    const swings = Math.min(8, e.hp / (dmgNow() * 1.1));
    const s = Math.hypot(e.obj.position.x - p.x, e.obj.position.z - p.z) - swings * 3
      - (e.state === 'hit' ? 6 : 0) + (e.claim ? 100 : 0) + (swings <= 1 ? 12 : 0);
    if (s < bs) { bs = s; best = e; }
  }
  return best;
}

const smoke = p => { const q = new THREE.Vector3(p.x, 1.4, p.z); burst(q, 0x7a4cff, 24, 5, 0.5, 1, 0); ring(q, 0x9a6bff, 2.4, 0.35); };

export function updateKnights(dt, scene) {
  while (knights.length > (game.knights || 0)) scene.remove(knights.pop().obj);   // new run
  while (knights.length < (game.knights || 0)) spawnKnight(scene);
  const n = knights.length;
  for (const e of enemies) e.claim = null;
  for (const k of knights) {
    if (k.target && (!isAlive(k.target) || !enemies.includes(k.target) || (!k.engaged && doomed(k.target)))) { k.target = null; k.engaged = false; }
    if (k.target) k.target.claim = k;
  }
  for (const k of knights) {
    k.mixer.update(dt);
    if (!dt) continue;
    const p = k.obj.position;
    if (!k.target) {
      k.target = choose(k); k.engaged = false;
      if (k.target) k.target.claim = k;
    }
    let dx, dz, stop;
    if (k.target) { dx = k.target.obj.position.x - p.x; dz = k.target.obj.position.z - p.z; stop = 1.6 + k.target.obj.scale.x * 0.6; }
    else { const a = (k.i / n) * Math.PI * 2; dx = Math.cos(a) * 6.5 - p.x; dz = Math.sin(a) * 6.5 - p.z; stop = 0.3; }
    let d = Math.hypot(dx, dz);
    k.blink -= dt;
    if (k.target && d > stop + 5 && k.blink <= 0) {   // shadow step: vanish and reappear next to the enemy
      k.blink = 1.2;
      smoke(p);
      const jump = d - stop;
      p.x += (dx / d) * jump; p.z += (dz / d) * jump;
      smoke(p);
      dx = k.target.obj.position.x - p.x; dz = k.target.obj.position.z - p.z; d = Math.hypot(dx, dz);
    }
    k.engaged = !!k.target && d <= stop + 0.3;
    if (d > stop + 0.05) {
      const step = Math.min(d - stop, 14 * dt);
      p.x += (dx / d) * step; p.z += (dz / d) * step;
      const r = Math.hypot(p.x, p.z);                // walk around the tower, not through it
      if (r < 5.2 && r > 0.01) { p.x *= 5.2 / r; p.z *= 5.2 / r; }
      k.obj.rotation.y = Math.atan2(dx, dz);
    }
    if (k.engaged) {
      k.obj.rotation.y = Math.atan2(dx, dz);
      setAnim(k, 'atk');
      if ((k.swing += dt) >= 0.8) {
        k.swing = 0;
        burst(new THREE.Vector3(k.target.obj.position.x, 1.6, k.target.obj.position.z), 0xb48cff, 10, 5, 0.3, 0, 0);
        damageEnemy(k.target, dmgNow() * 1.1, false, 'shadow');
      }
    } else setAnim(k, d > stop + 0.05 ? 'run' : 'idle');
  }
}
