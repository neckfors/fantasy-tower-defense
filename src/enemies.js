import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { TOWER_R } from './world.js';
import { randomPortal, stepThrough } from './portals.js';
import { mergedModel } from './merge.js';
import { popNumber } from './numbers.js';
import { lob } from './shots.js';
import { poisonBurst } from './combat.js';
import { damageTower, addXp, game, dmgNow } from './game.js';
import { sfx } from './audio.js';
import { addCoins, rollEmerald, emeralds } from './shop.js';
import { emeraldToast, removeBar } from './hpbars.js';
import { pickup, deathFx, hurtFx, shake } from './fx.js';
import { makeBoss, bossFor } from './bosses.js';

// hp/dmg/xp are multipliers; keep = weapon meshes left visible; stop = distance from tower where it attacks
export const TYPES = {
  peasant: { name: 'Peasant', files: [['Rogue_Hooded', 0xc9a77a], ['Rogue', 0xb08f66], ['Barbarian', 0xd8c29a]], scale: [0.85, 1.15], hp: 1, speed: [2.2, 3.0], dmg: 4, xp: 5, keep: [], atk: 'Unarmed_Melee_Attack_Punch_A', from: 1, weight: 10 },
  rogue: { name: 'Rogue', files: [['Rogue', 0xffffff]], scale: [1, 1], hp: 0.7, speed: [4, 4.8], dmg: 3, xp: 7, keep: ['Knife', 'Knife_Offhand'], atk: '1H_Melee_Attack_Stab', from: 2, weight: 5 },
  warrior: { name: 'Warrior', files: [['Knight', 0xffffff]], scale: [1.1, 1.1], hp: 2.2, speed: [1.8, 2.1], dmg: 8, xp: 12, keep: ['1H_Sword', 'Round_Shield'], atk: '1H_Melee_Attack_Slice_Horizontal', from: 3, weight: 4 },
  wizard: { name: 'Wizard', files: [['Mage', 0xffffff]], scale: [1, 1], hp: 1.2, speed: [2.3, 2.6], dmg: 7, xp: 10, keep: ['2H_Staff'], atk: 'Spellcasting', stop: 14, from: 4, weight: 3 },
  troll: { name: 'Troll', files: [['Barbarian', 0x7fbf6a]], scale: [1.8, 1.8], hp: 4.5, speed: [1.5, 1.7], dmg: 15, xp: 30, keep: ['2H_Axe'], atk: '2H_Melee_Attack_Chop', from: 6, weight: 2 },
  giant: { name: 'Giant', files: [['Knight', 0xaab4c8]], scale: [2.7, 2.7], hp: 10, speed: [1.1, 1.3], dmg: 30, xp: 60, keep: ['2H_Sword'], atk: '2H_Melee_Attack_Slice', from: 8, weight: 1 },
  dragon: { name: 'Dragon', files: [['Dragon', null]], raw: true, fly: 7, anims: { walk: 'DragonArmature|Dragon_Flying', die: 'DragonArmature|Dragon_Death' }, scale: [1.6, 1.6], hp: 7, speed: [2.4, 2.8], dmg: 36, xp: 45, keep: [], atk: 'DragonArmature|Dragon_Attack', stop: 13, from: 7, weight: 1 },
  boss: { name: 'Giant Warlord', files: [['Knight', 0xd04a3a]], scale: [3.8, 3.8], hp: 32, speed: [1.0, 1.0], dmg: 60, xp: 250, keep: ['2H_Sword'], atk: '2H_Melee_Attack_Spin', from: 99, weight: 0 },
};

const BODY = /_(Body|Head|ArmLeft|ArmRight|LegLeft|LegRight|Cape|Helmet|Hat)$/;
const models = {};
export async function loadModels() {
  const loader = new GLTFLoader();
  const names = new Set(Object.values(TYPES).flatMap(t => t.files.map(f => f[0])));
  await Promise.all([...names].map(async n => { models[n] = await loader.loadAsync(`assets/models/${n}.glb`); }));
}

export const getModel = n => models[n];
export const enemies = [];
export const isAlive = e => e.state !== 'dead';
const rnd = ([a, b]) => a + Math.random() * (b - a);

export function pickType(wave) {
  const pool = Object.entries(TYPES).filter(([, t]) => t.weight && t.from <= wave);
  let r = Math.random() * pool.reduce((s, [, t]) => s + t.weight, 0);
  for (const [k, t] of pool) if ((r -= t.weight) <= 0) return k;
  return 'peasant';
}

// every enemy gets its own bone textures on the graphics card; give them back when it goes
const free = obj => obj.traverse(n => n.skeleton?.dispose());
const EMERGE = 0.7;                       // seconds spent coming through a door
export function spawnEnemy(scene, typeKey, baseHp, portal = randomPortal()) {
  let t = TYPES[typeKey];
  const special = typeKey === 'boss' ? makeBoss(bossFor(game.wave), t) : null;   // each chapter's own boss
  const [file, tint] = t.files[Math.floor(Math.random() * t.files.length)];
  const src = special ? special.src : models[file];
  const wanted = name => BODY.test(name) || t.keep.includes(name);
  if (special) t = special.t;
  const obj = special ? special.obj : clone(t.raw ? src.scene : mergedModel(`${file}|${t.keep}`, src.scene, wanted));
  const mats = [];
  obj.traverse(n => {
    if (!n.isMesh) return;
    n.castShadow = true; n.layers.enable(1);
    n.material = n.material.clone();
    if (special) n.frustumCulled = false;     // their stored bounds don't follow the animation
    else if (t.raw) {                       // non-KayKit model: keep its colours, just clone materials for hit flash
      n.material.metalness = 0;         // metallic look is black without an environment map
      n.material.roughness = 0.8;
      if (/^Dragon_[134]$/.test(n.name)) n.material.color.lerp(new THREE.Color(0xc23b2a), 0.65);   // model is near-black: make it red
    } else n.material.color.setHex(tint);
    if (n.material.emissive) mats.push(n.material);
  });
  const size = rnd(t.scale);
  obj.scale.setScalar(size * 0.3);

  const spot = stepThrough(portal, size);
  obj.position.set(spot.x, t.fly ? 1 : 0, spot.z);
  obj.rotation.y = Math.atan2(-obj.position.x, -obj.position.z);

  const mixer = new THREE.AnimationMixer(obj);
  const clip = name => THREE.AnimationClip.findByName(src.animations, name);
  const walk = mixer.clipAction(clip(t.anims?.walk ?? (Math.random() < 0.5 ? 'Walking_A' : 'Walking_B')));
  walk.time = Math.random() * walk.getClip().duration;
  walk.timeScale = 0.7 + rnd(t.speed) * 0.2;
  walk.play();

  const hp = baseHp * t.hp;
  const e = { type: typeKey, t, obj, mixer, walk, mats, clip, hp, maxHp: hp, state: 'walk', timer: 0, atk: 0, flash: 0, tint: 0, size, emerging: EMERGE, speed: rnd(t.speed), xp: t.xp };
  scene.add(obj);
  enemies.push(e);
  return e;
}

const head = new THREE.Vector3();
const setTint = (e, c) => { if (e.tint !== c) { e.tint = c; e.mats.forEach(m => m.emissive.setHex(c)); } };

export function damageEnemy(e, dmg, quiet, kind = 'hit') {
  if (!isAlive(e)) return;
  e.hp -= dmg;
  popNumber(head.copy(e.obj.position).setY(e.obj.position.y + 2.2 * e.obj.scale.x), dmg, kind, e);
  if (!quiet) { e.flash = 0.12; setTint(e, 0xff5522); }   // damage over time doesn't flash: it has its own colour
  if (e.hp <= 0 || !quiet) sfx(e.hp <= 0 ? 'die' : 'hit');
  if (e.hp <= 0) {
    e.state = 'dead'; e.timer = 0;
    e.mixer.stopAllAction();
    const a = e.mixer.clipAction(e.clip(e.t.anims?.die ?? 'Death_A'));
    a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.reset().play();
    game.kills++;
    if (e.type === 'boss' && !game.cine) game.bossFallen = { boss: e, gems: emeralds() };   // main.js starts the death cutscene
    if (e.poison) poisonBurst(e.obj.parent, e);         // Poison Tips: toxic cloud on death
    e.emerging = 0; e.obj.scale.setScalar(e.size);
    addXp(e.xp);
    addCoins(Math.ceil(e.xp / 5));
    const coins = Math.min(4, Math.ceil(e.xp / 15));
    for (let k = 0; k < coins; k++) pickup(e.obj.position, false);
    rollEmerald(e, n => { emeraldToast(n); for (let k = 0; k < Math.min(n, 3); k++) pickup(e.obj.position, true); });
    removeBar(e);
    e.obj.traverse(n => n.layers.disable(1));
    deathFx(e.obj.position, Math.min(2.5, e.obj.scale.x));
    if (e.obj.scale.x >= 3) shake(0.8);
  }
}

export function clearEnemies(scene) {
  enemies.forEach(e => { scene.remove(e.obj); free(e.obj); removeBar(e); });
  enemies.length = 0;
}

// wizards and dragons attack from range: their bolt / fireball has to reach the tower before it hurts
function strike(e, scene) {
  const hit = () => {
    const sh = game.shield > 0;
    damageTower(e.t.dmg);
    sfx(sh ? 'shieldhit' : 'hurt');
    if (!sh) hurtFx();
    if (game.thorns) damageEnemy(e, dmgNow() * 0.8 * game.thorns, false, 'spike');
  };
  if (!e.t.stop) { hit(); if (!(game.shield > 0)) towerNumber(e, 3.6); return; }
  const p = e.obj.position, d = Math.hypot(p.x, p.z) || 1, dragon = !!e.t.fly;
  const from = new THREE.Vector3(p.x - (p.x / d) * (dragon ? 2.6 : 1), p.y + (dragon ? 1.8 : 2.4), p.z - (p.z / d) * (dragon ? 2.6 : 1));
  const to = new THREE.Vector3((p.x / d) * 3.6, dragon ? 9 : 7, (p.z / d) * 3.6);
  sfx(dragon ? 'fireshoot' : 'shoot');
  lob(scene, from, to, {
    color: dragon ? 0xff5a10 : 0xc050ff, size: dragon ? 1.15 : 0.5, speed: dragon ? 15 : 19, arc: dragon ? 0.8 : 2,
    onImpact: () => { const sh = game.shield > 0; hit(); if (!sh) towerNumber(e, 3.8, to.y); },
  });
}
function towerNumber(e, r, y = 4) {
  const p = e.obj.position, d = Math.hypot(p.x, p.z) || 1;
  popNumber(head.set((p.x / d) * r, y, (p.z / d) * r), e.t.dmg, 'tower');
}

export function updateEnemies(dt, scene) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    const edt = game.warpT > 0 && e.state !== 'dead' ? dt * 0.12 : dt;     // Time Warp: nearly frozen in time
    e.mixer.update(edt);
    if (e.flash > 0) e.flash -= dt;
    if (e.slowT > 0) e.slowT -= dt;
    const alive = e.state !== 'dead';          // status colour: hit, ice, poison, fire
    setTint(e, e.flash > 0 ? 0xff5522 : !alive ? 0 : game.warpT > 0 ? 0x4a2a9a : game.frostT > 0 || e.slowT > 0 ? 0x1a5a9a : e.poison ? 0x1f7a10 : e.burn ? 0x7a2a00 : 0);
    const p = e.obj.position;
    if (e.emerging > 0 && alive) {             // grow out of the doorway; dragons also climb to flying height
      e.emerging = Math.max(0, e.emerging - edt);
      e.obj.scale.setScalar(e.size * (1 - 0.7 * (e.emerging / EMERGE) ** 2));
    }
    if (e.t.fly && alive && p.y < e.t.fly) p.y = Math.min(e.t.fly, p.y + dt * 3.5);

    if (e.state === 'walk') {
      const d = Math.hypot(p.x, p.z);
      if (d <= (e.t.stop ?? TOWER_R + 1.3 + e.size * 0.5 + (e.t.gap ?? 0))) {
        e.state = 'hit';
        e.walk.fadeOut(0.2);
        e.mixer.clipAction(e.clip(e.t.atk)).reset().fadeIn(0.2).play();
      } else {
        let slow = game.frostT > 0 ? 0.4 : 1;   // Frost Nova slow
        if (e.slowT > 0) slow *= 1 - 0.25 * (game.frostA || 0);                     // Frost Arrows
        if (game.blizzard && d <= game.range) slow *= 1 - 0.15 * game.blizzard;      // Blizzard
        if (game.moat && !e.t.fly && d >= game.moatIn && d <= game.moatOut) slow *= 1 - (0.15 + 0.15 * game.moat);   // Moat: 30/45/60%
        const sp = e.speed * slow * (e.emerging > 0 ? 1.3 : 1);
        p.x -= (p.x / d) * sp * edt;  // straight line to the tower
        p.z -= (p.z / d) * sp * edt;
      }
    } else if (e.state === 'hit') {
      if ((e.atk += edt) >= (e.t.stop ? (e.t.fly ? 1.8 : 1.4) : 1)) {
        e.atk = 0;
        strike(e, scene);
      }
    } else fallStep(e, i, dt, scene);
  }
}

// dead: lie there, then sink away
function fallStep(e, i, dt, scene) {
  const p = e.obj.position;
  e.timer += dt;
  if (e.t.fly && p.y > 0) p.y = Math.max(0, p.y - dt * 8);   // dragons crash to the ground
  if (e.timer > 1.5) p.y -= dt * 0.6;
  if (e.timer > 3.5) { scene.remove(e.obj); free(e.obj); enemies.splice(i, 1); }
}

// only the dead keep moving (boss death cutscene); `except` is animated by the cutscene itself
export function updateDead(dt, scene, except) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    if (e === except || e.state !== 'dead') continue;
    e.mixer.update(dt);
    setTint(e, 0);
    fallStep(e, i, dt, scene);
  }
}
