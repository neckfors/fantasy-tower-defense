import * as THREE from 'three';
import { game } from './game.js';
import { enemies, isAlive, damageEnemy } from './enemies.js';

const ORIGIN = new THREE.Vector3(0, 13.5, 0);
const arrowGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 5).rotateX(Math.PI / 2);
const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffd77a });
const arrows = [];
let cooldown = 0;

const aim = e => new THREE.Vector3(e.obj.position.x, e.obj.position.y + 1.3, e.obj.position.z);

export function updateCombat(dt, scene) {
  cooldown -= dt;
  if (cooldown <= 0 && !game.over) {
    const targets = enemies
      .filter(isAlive)
      .map(e => ({ e, d: Math.hypot(e.obj.position.x, e.obj.position.z) }))
      .filter(t => t.d <= game.range)
      .sort((a, b) => a.d - b.d);
    if (targets.length) {
      for (let i = 0; i < game.multi; i++) fire(scene, targets[i % targets.length].e);
      cooldown = 1 / game.rate;
    }
  }

  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    if (!isAlive(a.target)) { scene.remove(a.mesh); arrows.splice(i, 1); continue; }
    const to = aim(a.target).sub(a.mesh.position), dist = to.length();
    if (dist < 0.9) {
      damageEnemy(a.target, game.dmg);
      scene.remove(a.mesh); arrows.splice(i, 1);
    } else {
      to.divideScalar(dist);
      a.mesh.position.addScaledVector(to, 45 * dt);
      a.mesh.lookAt(a.mesh.position.clone().add(to));
    }
  }
}

function fire(scene, target) {
  const mesh = new THREE.Mesh(arrowGeo, arrowMat);
  mesh.position.copy(ORIGIN);
  scene.add(mesh);
  arrows.push({ mesh, target });
}

export function clearArrows(scene) {
  arrows.forEach(a => scene.remove(a.mesh));
  arrows.length = 0;
}
