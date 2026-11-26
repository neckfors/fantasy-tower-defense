import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { game, dmgNow } from './game.js';
import { getModel, enemies, isAlive, damageEnemy } from './enemies.js';
import { fireArrow } from './combat.js';
import { spark, burst, ring } from './fx.js';
import { sfx } from './audio.js';
import { rankTargets, dist2 } from './targeting.js';
import { ignite } from './combat.js';
import { lob } from './shots.js';
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

export function updateHelpers(dt, scene) {
  while (elves.length > (game.elves || 0)) scene.remove(elves.pop().obj);           // new run
  while (dragons.length > (game.dragons || 0)) scene.remove(dragons.pop().obj);
  while (elves.length < (game.elves || 0)) spawnElf(scene);
  while (dragons.length < (game.dragons || 0)) spawnDragon(scene);

  for (const k of elves) {
    if (k.tier !== game.elves) { k.tier = game.elves; k.mats.forEach(m => m.color.setHex(tier(k.tier, 0x6fcf7a, GOLD, DIAMOND))); }
    k.mixer.update(dt); recover(k, dt);
    const a = (k.i / Math.max(1, elves.length)) * Math.PI * 2 + 0.8;
    k.obj.position.set(Math.cos(a) * 8, 0, Math.sin(a) * 8);
    const list = rankTargets(game.range), t = list[Math.min(k.i + 1, list.length - 1)];   // elves spread out past the sorcerer's target
    if (t) k.obj.rotation.y = Math.atan2(t.obj.position.x - k.obj.position.x, t.obj.position.z - k.obj.position.z);
    if ((k.cd -= dt) <= 0 && t && !game.over) {
      k.cd = 1.3;
      playOnce(k, k.idle, k.shoot, 0.7);
      fireArrow(scene, t, { origin: new THREE.Vector3(k.obj.position.x, 2.4, k.obj.position.z), mult: 0.7 + 0.15 * game.elves, noSnipe: true });
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
    const reach = 5 + 0.75 * (game.dragons - 1);
    let best = null, bn = 0;                       // the enemy with the most neighbours = best fire target
    for (const e of rankTargets(game.range)) {
      let n = 0;
      for (const o of enemies) if (isAlive(o) && dist2(e, o) < reach) n++;
      if (n > bn) { bn = n; best = e; }
    }
    if (!best) { k.cd = 0.4; continue; }
    k.cd = 4.2 - 0.4 * game.dragons;               // 3.8 / 3.4 / 3.0 s
    k.obj.rotation.y = Math.atan2(best.obj.position.x - p.x, best.obj.position.z - p.z);
    playOnce(k, k.fly, k.atk, 1);
    sfx('fireshoot');
    breathe(scene, p.clone().setY(p.y + 0.6), best, reach);
  }
}

function breathe(scene, from, target, reach) {
  const last = new THREE.Vector3();
  const where = () => last.set(target.obj.position.x, target.obj.position.y + 0.8, target.obj.position.z);
  const lvl = game.dragons, col = tier(lvl, 0xff6a1a, GOLD, DIAMOND);
  lob(scene, from, where, { color: col, size: 0.55 + 0.12 * lvl, speed: 24, arc: 0.5, onImpact: () => {
    burst(where(), col, 40, 10, 0.7, 2, -3);
    ring(target.obj.position, col, reach, 0.5);
    sfx('boom');
    for (const o of enemies) {
      if (!isAlive(o) || o.emerging || dist2(o, target) > reach) continue;
      ignite(o, dmgNow() * 0.1 * lvl);
      damageEnemy(o, dmgNow() * (0.55 + 0.15 * lvl), false, 'fire');   // 0.7x / 0.85x / 1x damage, hits a whole group
    }
  } });
}
