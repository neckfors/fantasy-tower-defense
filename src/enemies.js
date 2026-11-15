import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { SPAWN_R, TOWER_R } from './world.js';
import { damageTower, addXp, game } from './game.js';

const HELD = ['Knife', 'Knife_Offhand', '1H_Crossbow', '2H_Crossbow', 'Throwable', 'Mug', '1H_Sword', '2H_Sword', 'Axe', '1H_Axe', '2H_Axe', 'Staff', 'Spellbook', 'Spellbook_open', 'Round_Shield', 'Badge_Shield', 'Rectangle_Shield', 'Spike_Shield', 'Wand', 'Dagger'];

// Peasant = recoloured KayKit rogue/barbarian with weapons hidden
const PEASANT_LOOKS = [
  { file: 'Rogue_Hooded', tint: 0xc9a77a },
  { file: 'Rogue', tint: 0xb08f66 },
  { file: 'Barbarian', tint: 0xd8c29a },
];

const models = {};
export async function loadModels() {
  const loader = new GLTFLoader();
  await Promise.all(PEASANT_LOOKS.map(async l => {
    models[l.file] = await loader.loadAsync(`assets/models/${l.file}.glb`);
  }));
}

export const enemies = [];
const active = enemies;
export const isAlive = e => e.state !== 'dead';

export function spawnPeasant(scene, hp) {
  const look = PEASANT_LOOKS[Math.floor(Math.random() * PEASANT_LOOKS.length)];
  const src = models[look.file];
  const obj = clone(src.scene);
  const mats = [];
  obj.traverse(n => {
    if (HELD.includes(n.name)) n.visible = false;
    if (n.isMesh) {
      n.castShadow = true;
      n.material = n.material.clone();
      n.material.color.setHex(look.tint);
      mats.push(n.material);
    }
  });
  obj.scale.setScalar(0.85 + Math.random() * 0.3);

  const a = Math.random() * Math.PI * 2;
  obj.position.set(Math.cos(a) * SPAWN_R, 0, Math.sin(a) * SPAWN_R);
  obj.rotation.y = Math.atan2(-obj.position.x, -obj.position.z); // face tower

  const mixer = new THREE.AnimationMixer(obj);
  const clip = name => THREE.AnimationClip.findByName(src.animations, name);
  const walk = mixer.clipAction(clip(Math.random() < 0.5 ? 'Walking_A' : 'Walking_B'));
  walk.time = Math.random() * walk.getClip().duration;
  walk.play();

  const e = { obj, mixer, walk, mats, clip, hp, state: 'walk', timer: 0, atk: 0, flash: 0,
    speed: 2.2 + Math.random() * 0.8, xp: 5 };
  scene.add(obj);
  active.push(e);
  return e;
}

export function damageEnemy(e, dmg) {
  if (!isAlive(e)) return;
  e.hp -= dmg;
  e.flash = 0.12;
  e.mats.forEach(m => m.emissive.setHex(0xff5522));
  if (e.hp <= 0) {
    e.state = 'dead'; e.timer = 0;
    e.mixer.stopAllAction();
    const a = e.mixer.clipAction(e.clip('Death_A'));
    a.setLoop(THREE.LoopOnce); a.clampWhenFinished = true; a.reset().play();
    game.kills++;
    addXp(e.xp);
  }
}

export function updateEnemies(dt, scene) {
  for (let i = active.length - 1; i >= 0; i--) {
    const e = active[i];
    e.mixer.update(dt);
    if (e.flash > 0 && (e.flash -= dt) <= 0) e.mats.forEach(m => m.emissive.setHex(0));
    const p = e.obj.position;
    if (e.state === 'walk') {
      const d = Math.hypot(p.x, p.z);
      if (d <= TOWER_R + 1.3) {
        e.state = 'hit';
        e.walk.fadeOut(0.2);
        e.mixer.clipAction(e.clip('Unarmed_Melee_Attack_Punch_A')).reset().fadeIn(0.2).play();
      } else {
        p.x -= (p.x / d) * e.speed * dt;   // straight line to the tower
        p.z -= (p.z / d) * e.speed * dt;
      }
    } else if (e.state === 'hit') {
      if ((e.atk += dt) >= 1) { e.atk = 0; damageTower(4); }
    } else {                               // dead: lie there, then sink away
      e.timer += dt;
      if (e.timer > 1.5) p.y -= dt * 0.6;
      if (e.timer > 3.5) { scene.remove(e.obj); active.splice(i, 1); }
    }
  }
}
