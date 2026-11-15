import * as THREE from 'three';
import { game, dmgNow, rateNow } from './game.js';
import { sfx } from './audio.js';
import { sorcererCast } from './tower-fx.js';
import { enemies, isAlive, damageEnemy } from './enemies.js';

const ORIGIN = new THREE.Vector3(0, 13.5, 0);
const arrowGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 5).rotateX(Math.PI / 2);
const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffd77a });
const arrows = [];
let cooldown = 0;

const aim = e => new THREE.Vector3(e.obj.position.x, e.obj.position.y + 1.3, e.obj.position.z);

export function updateCombat(dt, scene) {
  cooldown -= dt;
  for (const k of ['rallyT', 'rapidT', 'frostT']) if (game[k] > 0) game[k] = Math.max(0, game[k] - dt);
  if (cooldown <= 0 && !game.over) {
    const targets = enemies
      .filter(isAlive)
      .map(e => ({ e, d: Math.hypot(e.obj.position.x, e.obj.position.z) }))
      .filter(t => t.d <= game.range)
      .sort((a, b) => a.d - b.d);
    if (targets.length) {
      for (let i = 0; i < game.multi; i++) fire(scene, targets[i % targets.length].e);
      cooldown = 1 / rateNow();
    }
  }

  for (const e of enemies) {                       // burning
    if (!e.burn) continue;
    if (!isAlive(e)) { e.burn = null; continue; }
    e.burn.t -= dt; e.burn.acc += dt;
    if (e.burn.acc >= 0.5) { e.burn.acc = 0; damageEnemy(e, e.burn.dps * 0.5, true); }
    if (e.burn.t <= 0) e.burn = null;
  }
  for (let i = bolts.length - 1; i >= 0; i--) {    // lightning visuals
    if ((bolts[i].life -= dt) <= 0) { scene.remove(bolts[i].line); bolts.splice(i, 1); }
  }

  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    if (!isAlive(a.target)) { scene.remove(a.mesh); arrows.splice(i, 1); continue; }
    const to = aim(a.target).sub(a.mesh.position), dist = to.length();
    if (dist < 0.9) {
      damageEnemy(a.target, dmgNow());
      onHit(scene, a.target);
      scene.remove(a.mesh); arrows.splice(i, 1);
    } else {
      to.divideScalar(dist);
      a.mesh.position.addScaledVector(to, 45 * dt);
      a.mesh.lookAt(a.mesh.position.clone().add(to));
    }
  }
}

const bolts = [];
const boltMat = new THREE.LineBasicMaterial({ color: 0x9fe0ff });
const fireMat = new THREE.MeshBasicMaterial({ color: 0xff7a1a });

function onHit(scene, target) {
  if (game.fire) target.burn = { t: 3, acc: 0, dps: dmgNow() * 0.25 * game.fire };
  let from = target;
  const hit = new Set([target]);
  for (let n = 0; n < (game.chain || 0); n++) {
    let best = null, bd = 9;
    for (const e of enemies) {
      if (hit.has(e) || !isAlive(e)) continue;
      const d = Math.hypot(e.obj.position.x - from.obj.position.x, e.obj.position.z - from.obj.position.z);
      if (d < bd) { bd = d; best = e; }
    }
    if (!best) break;
    hit.add(best);
    damageEnemy(best, dmgNow() * 0.5);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([aim(from), aim(best)]), boltMat);
    scene.add(line); bolts.push({ line, life: 0.18 });
    from = best;
  }
}

function fire(scene, target) {
  const mesh = new THREE.Mesh(arrowGeo, game.fire ? fireMat : arrowMat);
  mesh.position.copy(ORIGIN);
  scene.add(mesh);
  arrows.push({ mesh, target });
  sfx('shoot');
  sorcererCast(target.obj.position);
}

export function clearArrows(scene) {
  arrows.forEach(a => scene.remove(a.mesh));
  arrows.length = 0;
}
