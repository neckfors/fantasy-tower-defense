import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { SPAWN_R, TOWER_R } from './world.js';
import { damageTower, addXp, game } from './game.js';
import { sfx } from './audio.js';
import { bank } from './shop.js';
import { removeBar } from './hpbars.js';

// hp/dmg/xp are multipliers; keep = weapon meshes left visible; stop = distance from tower where it attacks
export const TYPES = {
  peasant: { name: 'Peasant', files: [['Rogue_Hooded', 0xc9a77a], ['Rogue', 0xb08f66], ['Barbarian', 0xd8c29a]], scale: [0.85, 1.15], hp: 1, speed: [2.2, 3.0], dmg: 4, xp: 5, keep: [], atk: 'Unarmed_Melee_Attack_Punch_A', from: 1, weight: 10 },
  rogue: { name: 'Rogue', files: [['Rogue', 0xffffff]], scale: [1, 1], hp: 0.7, speed: [4, 4.8], dmg: 3, xp: 7, keep: ['Knife', 'Knife_Offhand'], atk: '1H_Melee_Attack_Stab', from: 2, weight: 5 },
  warrior: { name: 'Warrior', files: [['Knight', 0xffffff]], scale: [1.1, 1.1], hp: 2.2, speed: [1.8, 2.1], dmg: 8, xp: 12, keep: ['1H_Sword', 'Round_Shield'], atk: '1H_Melee_Attack_Slice_Horizontal', from: 3, weight: 4 },
  wizard: { name: 'Wizard', files: [['Mage', 0xffffff]], scale: [1, 1], hp: 1.2, speed: [2.3, 2.6], dmg: 5, xp: 10, keep: ['2H_Staff'], atk: 'Spellcasting', stop: 14, from: 4, weight: 3 },
  troll: { name: 'Troll', files: [['Barbarian', 0x7fbf6a]], scale: [1.8, 1.8], hp: 6, speed: [1.5, 1.7], dmg: 15, xp: 30, keep: ['2H_Axe'], atk: '2H_Melee_Attack_Chop', from: 6, weight: 2 },
  giant: { name: 'Giant', files: [['Knight', 0xaab4c8]], scale: [2.7, 2.7], hp: 14, speed: [1.1, 1.3], dmg: 30, xp: 60, keep: ['2H_Sword'], atk: '2H_Melee_Attack_Slice', from: 8, weight: 1 },
  dragon: { name: 'Dragon', files: [['Dragon', null]], raw: true, fly: 7, anims: { walk: 'DragonArmature|Dragon_Flying', die: 'DragonArmature|Dragon_Death' }, scale: [1.6, 1.6], hp: 10, speed: [2.4, 2.8], dmg: 20, xp: 45, keep: [], atk: 'DragonArmature|Dragon_Attack', stop: 13, from: 7, weight: 1 },
  boss: { name: 'Giant Warlord', files: [['Knight', 0xd04a3a]], scale: [3.8, 3.8], hp: 45, speed: [1.0, 1.0], dmg: 60, xp: 250, keep: ['2H_Sword'], atk: '2H_Melee_Attack_Spin', from: 99, weight: 0 },
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

export function spawnEnemy(scene, typeKey, baseHp) {
  const t = TYPES[typeKey];
  const [file, tint] = t.files[Math.floor(Math.random() * t.files.length)];
  const src = models[file];
  const obj = clone(src.scene);
  const mats = [];
  obj.traverse(n => {
    if (!n.isMesh) return;
    if (t.raw) {                       // non-KayKit model: keep as is, just clone materials for hit flash
      n.castShadow = true;
      n.material = n.material.clone();
      n.material.metalness = 0;          // metallic look is black without an environment map
      n.material.roughness = 0.8;
      if (/^Dragon_[134]$/.test(n.name)) n.material.color.lerp(new THREE.Color(0xc23b2a), 0.65);   // model is near-black: make it red
      if (n.material.emissive) mats.push(n.material);
      return;
    }
    if (!BODY.test(n.name) && !t.keep.includes(n.name)) { n.visible = false; return; }
    n.castShadow = true;
    n.material = n.material.clone();
    n.material.color.setHex(tint);
    mats.push(n.material);
  });
  obj.scale.setScalar(rnd(t.scale));

  const a = Math.random() * Math.PI * 2;
  obj.position.set(Math.cos(a) * SPAWN_R, t.fly || 0, Math.sin(a) * SPAWN_R);
  obj.rotation.y = Math.atan2(-obj.position.x, -obj.position.z);

  const mixer = new THREE.AnimationMixer(obj);
  const clip = name => THREE.AnimationClip.findByName(src.animations, name);
  const walk = mixer.clipAction(clip(t.anims?.walk ?? (Math.random() < 0.5 ? 'Walking_A' : 'Walking_B')));
  walk.time = Math.random() * walk.getClip().duration;
  walk.timeScale = 0.7 + rnd(t.speed) * 0.2;
  walk.play();

  const hp = baseHp * t.hp;
  const e = { type: typeKey, t, obj, mixer, walk, mats, clip, hp, maxHp: hp, state: 'walk', timer: 0, atk: 0, flash: 0, speed: rnd(t.speed), xp: t.xp };
  scene.add(obj);
  enemies.push(e);
  return e;
}

export function damageEnemy(e, dmg) {
  if (!isAlive(e)) return;
  e.hp -= dmg;
  e.flash = 0.12;
  e.mats.forEach(m => m.emissive.setHex(0xff5522));
  sfx(e.hp <= 0 ? 'die' : 'hit');
  if (e.hp <= 0) {
    e.state = 'dead'; e.timer = 0;
    e.mixer.stopAllAction();
    const a = e.mixer.clipAction(e.clip(e.t.anims?.die ?? 'Death_A'));
    a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.reset().play();
    game.kills++;
    addXp(e.xp);
    bank(Math.ceil(e.xp / 5));
    removeBar(e);
  }
}

export function clearEnemies(scene) {
  enemies.forEach(e => { scene.remove(e.obj); removeBar(e); });
  enemies.length = 0;
}

export function updateEnemies(dt, scene) {
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.mixer.update(dt);
    if (e.flash > 0 && (e.flash -= dt) <= 0) e.mats.forEach(m => m.emissive.setHex(0));
    const p = e.obj.position;

    if (e.state === 'walk') {
      const d = Math.hypot(p.x, p.z);
      if (d <= (e.t.stop ?? TOWER_R + 1.3 + e.obj.scale.x * 0.5)) {
        e.state = 'hit';
        e.walk.fadeOut(0.2);
        e.mixer.clipAction(e.clip(e.t.atk)).reset().fadeIn(0.2).play();
      } else {
        p.x -= (p.x / d) * e.speed * dt;   // straight line to the tower
        p.z -= (p.z / d) * e.speed * dt;
      }
    } else if (e.state === 'hit') {
      if ((e.atk += dt) >= 1) { e.atk = 0; damageTower(e.t.dmg); sfx('hurt'); }
    } else {                               // dead: lie there, then sink away
      e.timer += dt;
      if (e.t.fly && p.y > 0) p.y = Math.max(0, p.y - dt * 8);   // dragons crash to the ground
      if (e.timer > 1.5) p.y -= dt * 0.6;
      if (e.timer > 3.5) { scene.remove(e.obj); enemies.splice(i, 1); }
    }
  }
}
