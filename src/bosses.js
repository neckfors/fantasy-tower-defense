import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { game } from './game.js';

// One special boss per story chapter; Endless goes through them in the same order, then starts over.
// All CC BY 4.0 (credits: CREDITS.md and the main menu). A model is only downloaded when it is needed.
// height / width: size in the units of a KayKit character (about 2.4 tall), before the boss scale
// head + eyes: the bones the glowing eyes follow in the arrival cutscene, and [apart, up, forward] from them
// travel: the clip itself walks away and jumps back; this is the track that does it, to be held still
// knockback: the death throws the body far back; keep only part of that, so it stays in the picture
// gap: extra distance from the tower for bosses with long legs or a long body
export const BOSSES = [
  { file: 'goblin', name: 'Goblin Ghoul', title: 'Terror of the Green Marches', height: 2.3, head: ['mixamorigHead_1'], eyes: [0.12, 0.2, 0.33],
    travel: { track: 'mixamorigHips_56.position', axis: 1 },
    anims: { walk: 'Walk', die: 'Death' }, atk: 'Attack Combo', roar: 'Attack Combo' },
  { file: 'spider', name: 'Brood Spider', title: 'Weaver of the Ashen Fields', height: 1.7, width: 3.6, head: ['zub_L_big_06', 'zub_R_big_047'], eyes: [0.15, 0.22, 0.2], gap: 2,
    anims: { walk: 'Spider_Walk', die: 'Spider_Death' }, atk: 'Spider_Attack_1', roar: 'Spider_Attack_1' },
  { file: 'troll', name: 'Cave Troll', title: 'Fury of the Frozen North', height: 2.6, head: ['cave_troll_Hub003Bone001_068'], eyes: [0.11, 0.05, 0.3],
    anims: { walk: 'walk', die: 'death' }, atk: 'attack1', roar: 'attack1' },
  { file: 'worm', name: 'Bog Worm', title: 'Devourer of the Cursed Bogs', height: 2.4, width: 3.6, head: ['Teeth_Up_L_026', 'Teeth_Up_R_00'], eyes: [0.25, 0.25, 0.05], gap: 1,
    anims: { walk: 'WALK', die: 'DEATH' }, atk: 'ATTACK', roar: 'ATTACK' },
  { file: 'orc', name: 'Giant Warlord', title: 'Breaker of Walls', height: 2.6, head: ['Bip001_Eye_L_066', 'Bip001_Eye_R_068'], eyes: [0.07, 0, 0.1],
    knockback: { tracks: ['Bip001_01.position', 'Axe_1_Dummy_089.position'], axis: 1, keep: 0.4 },
    anims: { walk: 'ANM_WALK', die: 'ANM_DEATH' }, atk: 'ANM_ORC_LIGHT_ATTACK', roar: 'ANM_ORC_Roar' },
];

const index = wave => game.mode === 'story' ? game.chapter - 1 : (Math.floor(wave / 10) - 1) % BOSSES.length;
export const bossFor = wave => BOSSES[Math.max(0, index(wave))];

const state = {};                           // file -> { src, fit } | 'loading' | 'failed'
const loader = new GLTFLoader();

export function loadBoss(def) {
  if (state[def.file]) return;
  state[def.file] = 'loading';
  loader.loadAsync(`assets/models/bosses/${def.file}.glb`)
    .then(src => { stayPut(src, def); shortenKnockback(src, def); state[def.file] = { src, fit: measure(src, def) }; })
    .catch(err => { console.warn('Boss model missing, using the old Warlord instead', def.file, err); state[def.file] = 'failed'; });
}
// false while still downloading (the boss wave waits); a failed download counts as ready (fallback boss)
export const bossReady = def => { loadBoss(def); return state[def.file] !== 'loading'; };

function shortenKnockback(src, def) {
  if (!def.knockback) return;
  const { tracks, axis, keep } = def.knockback;
  const clip = THREE.AnimationClip.findByName(src.animations, def.anims.die);
  const [body, ...others] = tracks.map(name => clip.tracks.find(x => x.name === name));
  const path = body.clone().createInterpolant(), start = body.values[axis];
  for (const t of [body, ...others]) t.times.forEach((time, i) => { t.values[i * 3 + axis] -= (path.evaluate(time)[axis] - start) * (1 - keep); });
}

// the game moves the boss itself: walking drops the steady drift, attacking stays on the spot
function stayPut(src, def) {
  if (!def.travel) return;
  const { track, axis } = def.travel;
  for (const name of [def.anims.walk, def.atk, def.roar]) {
    const t = THREE.AnimationClip.findByName(src.animations, name).tracks.find(x => x.name === track);
    const v = t.values, n = t.times.length, first = v[axis], drift = v[(n - 1) * 3 + axis] - first, dur = t.times[n - 1];
    for (let i = 0; i < n; i++) v[i * 3 + axis] = name === def.anims.walk ? v[i * 3 + axis] - drift * t.times[i] / dur : first;
  }
}

// the downloads come in all sizes: measure the posed model once, so each can be scaled and stood on the ground
function measure(src, def) {
  const obj = clone(src.scene);
  const mixer = new THREE.AnimationMixer(obj);
  mixer.clipAction(THREE.AnimationClip.findByName(src.animations, def.anims.walk)).play();
  mixer.update(0);
  obj.updateMatrixWorld(true);
  const box = new THREE.Box3(), points = [];
  obj.traverse(n => {
    if (!n.isMesh) return;
    n.skeleton?.update();
    for (let i = 0; i < n.geometry.attributes.position.count; i++) {
      const v = n.getVertexPosition(i, new THREE.Vector3()).applyMatrix4(n.matrixWorld);
      box.expandByPoint(v); points.push(v);
    }
  });
  obj.traverse(n => n.skeleton?.dispose());
  const size = box.getSize(new THREE.Vector3());
  // centre on what touches the ground, so a weapon held out to one side doesn't push the body off its path
  const feet = new THREE.Box3().setFromPoints(points.filter(p => p.y < box.min.y + size.y * 0.08));
  const centre = feet.getCenter(new THREE.Vector3());
  const k = Math.min(def.height / size.y, def.width ? def.width / Math.max(size.x, size.z) : Infinity);
  return { k, x: -centre.x * k, y: -box.min.y * k, z: -centre.z * k, height: size.y * k };
}

// The model is wrapped so the game can treat it like any other character: feet at 0, facing +Z.
// Returns null if it is not there, and the caller uses the old KayKit Warlord.
export function makeBoss(def, base) {
  const s = state[def.file];
  if (!s?.src) return null;
  const inner = clone(s.src.scene);
  const fit = new THREE.Group();
  fit.scale.setScalar(s.fit.k);
  fit.position.set(s.fit.x, s.fit.y, s.fit.z);
  fit.add(inner);
  const turn = new THREE.Group();
  turn.rotation.y = def.yaw ?? 0;
  turn.add(fit);
  const obj = new THREE.Group();
  obj.add(turn);
  return { obj, src: s.src, t: { ...base, ...def, stop: undefined, tall: s.fit.height } };
}
