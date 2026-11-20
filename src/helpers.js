import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { game, dmgNow } from './game.js';
import { getModel, enemies, isAlive, damageEnemy } from './enemies.js';
import { fireArrow } from './combat.js';
import { spark, burst, ring } from './fx.js';
import { sfx } from './audio.js';
import { tier, GOLD, DIAMOND } from './upgrades-more.js';

// Elf Archers (extra shooters beside the tower) and Baby Dragons (fire-breathing flyers)
const BODY = /_(Body|Head|Head_Hooded|ArmLeft|ArmRight|LegLeft|LegRight|Cape)$/;
const elves = [], dragons = [];
const clip = (m, n) => THREE.AnimationClip.findByName(m.animations, n);
const r1 = () => Math.random() - 0.5;

function spawnElf(scene) {
  const m = getModel('Rogue_Hooded'), obj = clone(m.scene), mats = [];
  obj.traverse(n => {
    if (!n.isMesh) return;
    if (!BODY.test(n.name) && n.name !== '2H_Crossbow') { n.visible = false; return; }
    n.material = n.material.clone(); n.material.map = null; n.material.color.setHex(0x6fcf7a); mats.push(n.material);
  });
  obj.scale.setScalar(1.3);
  scene.add(obj);
  const mixer = new THREE.AnimationMixer(obj);
  const idle = mixer.clipAction(clip(m, 'Idle')), shoot = mixer.clipAction(clip(m, '2H_Ranged_Shoot'));
  shoot.setLoop(THREE.LoopOnce, 1); idle.play();
  elves.push({ mats, obj, mixer, idle, shoot, cd: 0.5, back: 0, i: elves.length });
}

function spawnDragon(scene) {
  const m = getModel('Dragon'), obj = clone(m.scene), mats = [];
  obj.traverse(n => {
    if (!n.isMesh) return;
    n.material = n.material.clone(); n.material.metalness = 0; n.material.roughness = 0.8;
    if (/^Dragon_[134]$/.test(n.name)) { n.material.color.setHex(0xff9a2a); mats.push(n.material); }
  });
  obj.scale.setScalar(0.5);
  scene.add(obj);
  const mixer = new THREE.AnimationMixer(obj);
  const fly = mixer.clipAction(clip(m, 'DragonArmature|Dragon_Flying')), atk = mixer.clipAction(clip(m, 'DragonArmature|Dragon_Attack'));
  atk.setLoop(THREE.LoopOnce, 1); fly.play();
  dragons.push({ mats, obj, mixer, fly, atk, cd: 2, back: 0, ang: dragons.length * 2.1 });
}

function playOnce(k, base, once, dur) {
  base.crossFadeTo(once.reset().play(), 0.1, false);
  k.back = dur;
  k.base = base; k.once = once;
}
function recover(k, dt) {
  if (k.back > 0 && (k.back -= dt) <= 0) k.once.crossFadeTo(k.base.reset().play(), 0.15, false);
}

const nearest = () => {
  let best = null, bd = game.range;
  for (const e of enemies) {
    if (!isAlive(e)) continue;
    const d = Math.hypot(e.obj.position.x, e.obj.position.z);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
};

export function updateHelpers(dt, scene) {
  while (elves.length < (game.elves || 0)) spawnElf(scene);
  while (dragons.length < (game.dragons || 0)) spawnDragon(scene);

  for (const k of elves) {
    if (k.tier !== game.elves) { k.tier = game.elves; k.mats.forEach(m => m.color.setHex(tier(k.tier, 0x6fcf7a, GOLD, DIAMOND))); }
    k.mixer.update(dt); recover(k, dt);
    const a = (k.i / Math.max(1, elves.length)) * Math.PI * 2 + 0.8;
    k.obj.position.set(Math.cos(a) * 8, 0, Math.sin(a) * 8);
    const t = nearest();
    if (t) k.obj.rotation.y = Math.atan2(t.obj.position.x - k.obj.position.x, t.obj.position.z - k.obj.position.z);
    if ((k.cd -= dt) <= 0 && t && !game.over) {
      k.cd = 1.3;
      playOnce(k, k.idle, k.shoot, 0.7);
      fireArrow(scene, t, { origin: new THREE.Vector3(k.obj.position.x, 2.4, k.obj.position.z), mult: 0.6, noSnipe: true });
    }
  }

  for (const k of dragons) {
    if (k.tier !== game.dragons) { k.tier = game.dragons; k.mats.forEach(m => m.color.setHex(tier(k.tier, 0xff9a2a, GOLD, DIAMOND))); }
    k.mixer.update(dt); recover(k, dt);
    k.ang += dt * 0.5;
    const p = k.obj.position;
    p.set(Math.cos(k.ang) * 9, 9 + Math.sin(k.ang * 3) * 0.7, Math.sin(k.ang) * 9);
    k.obj.rotation.y = Math.atan2(-Math.sin(k.ang), Math.cos(k.ang)) ;
    if ((k.cd -= dt) > 0 || game.over) continue;
    let best = null, bn = 0;                       // the enemy with the most neighbours = best fire target
    for (const e of enemies) {
      if (!isAlive(e) || Math.hypot(e.obj.position.x, e.obj.position.z) > game.range + 4) continue;
      let n = 0;
      for (const o of enemies) if (isAlive(o) && Math.hypot(o.obj.position.x - e.obj.position.x, o.obj.position.z - e.obj.position.z) < 5) n++;
      if (n > bn) { bn = n; best = e; }
    }
    if (!best) { k.cd = 0.5; continue; }
    k.cd = 3.5;
    k.obj.rotation.y = Math.atan2(best.obj.position.x - p.x, best.obj.position.z - p.z);
    playOnce(k, k.fly, k.atk, 1);
    sfx('fireshoot');
    const T = new THREE.Vector3(best.obj.position.x, 0.8, best.obj.position.z);
    for (let i = 0; i < 40; i++) {                  // flame stream
      const q = p.clone().lerp(T, Math.random());
      spark(q.x + r1(), q.y + r1(), q.z + r1(), r1() * 3, r1() * 3 + 1, r1() * 3, Math.random() < 0.5 ? tier(game.dragons, 0xff6a1a, 0xffc83a, 0x8ff3ff) : tier(game.dragons, 0xffc040, 0xfff0a0, 0xffffff), 0.6);
    }
    burst(T, tier(game.dragons, 0xff6a1a, GOLD, DIAMOND), 30, 9, 0.6, 1, -2); ring(T, 0xff8a2a, 5, 0.5);
    for (const o of enemies) {
      if (!isAlive(o) || Math.hypot(o.obj.position.x - best.obj.position.x, o.obj.position.z - best.obj.position.z) > 5) continue;
      damageEnemy(o, dmgNow() * 1.5);
      o.burn = { t: 3, acc: 0, dps: dmgNow() * 0.25 };
    }
  }
}
