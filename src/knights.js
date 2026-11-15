import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { game } from './game.js';
import { getModel, enemies, isAlive, damageEnemy } from './enemies.js';

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
  knights.push({ obj, mixer, acts, cur: 'idle', target: null, swing: 0, i: knights.length });
}

function setAnim(k, name) {
  if (k.cur === name) return;
  k.acts[k.cur].fadeOut(0.15);
  k.acts[name].reset().fadeIn(0.15).play();
  k.cur = name;
}

export function updateKnights(dt, scene) {
  while (knights.length < (game.knights || 0)) spawnKnight(scene);
  const n = knights.length;
  for (const k of knights) {
    k.mixer.update(dt);
    const p = k.obj.position;
    if (!k.target || !isAlive(k.target)) {
      k.target = null;
      let bd = game.range * 0.9;
      for (const e of enemies) {
        if (!isAlive(e)) continue;
        const d = Math.hypot(e.obj.position.x, e.obj.position.z);
        if (d < bd) { bd = d; k.target = e; }
      }
    }
    let dx, dz, stop;
    if (k.target) { dx = k.target.obj.position.x - p.x; dz = k.target.obj.position.z - p.z; stop = 1.6 + k.target.obj.scale.x * 0.6; }
    else { const a = (k.i / n) * Math.PI * 2; dx = Math.cos(a) * 6.5 - p.x; dz = Math.sin(a) * 6.5 - p.z; stop = 0.3; }
    const d = Math.hypot(dx, dz);
    if (d > stop) {
      p.x += (dx / d) * 11 * dt; p.z += (dz / d) * 11 * dt;
      k.obj.rotation.y = Math.atan2(dx, dz);
      setAnim(k, 'run');
    } else if (k.target) {
      k.obj.rotation.y = Math.atan2(dx, dz);
      setAnim(k, 'atk');
      if ((k.swing += dt) >= 0.8) { k.swing = 0; damageEnemy(k.target, game.dmg * 1.5); }
    } else setAnim(k, 'idle');
  }
}
