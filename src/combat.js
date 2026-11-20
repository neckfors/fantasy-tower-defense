import * as THREE from 'three';
import { game, dmgNow, rateNow } from './game.js';
import { sfx } from './audio.js';
import { sorcererCast } from './tower-fx.js';
import { enemies, isAlive, damageEnemy } from './enemies.js';
import { burst, spark, ring } from './fx.js';
import { tier, GOLD, DIAMOND } from './upgrades-more.js';

const ORIGIN = new THREE.Vector3(0, 13.5, 0);
const arrowGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 5).rotateX(Math.PI / 2);
const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffd77a });
const arrows = [];
let cooldown = 0, ballT = 2;

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

  if (game.ballista && !game.over) {               // ballista
    ballT -= dt;
    if (ballT <= 0) {
      let best = null;
      for (const e of enemies) if (isAlive(e) && Math.hypot(e.obj.position.x, e.obj.position.z) <= game.range && (!best || e.hp > best.hp)) best = e;
      if (best) {
        ballT = 4 / game.ballista;
        const A = ORIGIN.clone(), B = aim(best);
        for (let k = 0; k < 3; k++) { const line = new THREE.Line(jagged(A, B), fireMat2); scene.add(line); bolts.push({ line, life: 0.3 }); }
        burst(B, 0xffe08a, 30, 10, 0.5, 1, -4); ring(best.obj.position, 0xffe08a, 4, 0.4); sfx('hit');
        damageEnemy(best, dmgNow() * 4);
      } else ballT = 0.3;
    }
  }
  for (const e of enemies) {                       // poison
    const p = e.poison;
    if (!p) continue;
    if (!isAlive(e)) { e.poison = null; continue; }
    if (Math.random() < dt * 8) { const q = e.obj.position; spark(q.x + r2() * 0.5, q.y + Math.random() * 2, q.z + r2() * 0.5, 0, 1.5, 0, 0x6aff3a, 0.6); }
    p.t -= dt; p.acc += dt;
    if (p.acc >= 0.5) { p.acc = 0; damageEnemy(e, dmgNow() * 0.06 * p.n * game.poison, true); }
    if (p.t <= 0) e.poison = null;
  }
  for (const e of enemies) {                       // burning
    if (!e.burn) continue;
    if (!isAlive(e)) { e.burn = null; continue; }
    if (Math.random() < dt * 25) { const p = e.obj.position, s = e.obj.scale.x; spark(p.x + (Math.random() - 0.5) * s, p.y + Math.random() * 2 * s, p.z + (Math.random() - 0.5) * s, 0, 2.5, 0, Math.random() < 0.5 ? 0xff6a1a : 0xffc040, 0.6); }   // flames
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
    const col = game.fire ? 0xff7a1a : 0xffd77a;
    spark(a.mesh.position.x, a.mesh.position.y, a.mesh.position.z, r2(), r2(), r2(), col, 0.35);   // trail
    spark(a.mesh.position.x, a.mesh.position.y, a.mesh.position.z, r2(), r2(), r2(), 0xffffff, 0.2);
    if (dist < 0.9) {
      burst(a.mesh.position, col, 12, 6, 0.4, 1, -8);
      const crit = Math.random() < (game.crit || 0);
      damageEnemy(a.target, dmgNow() * a.mult * (crit ? 2.5 : 1));
      if (a.snipe) { ring(a.mesh.position, 0xffffff, 4, 0.35); burst(a.mesh.position, 0xffffff, 20, 9, 0.4, 1, 0); }
      if (crit) { ring(a.mesh.position, 0xff4040, 3, 0.3); burst(a.mesh.position, 0xff4040, 16, 8, 0.4, 1, 0); }
      onHit(scene, a.target);
      scene.remove(a.mesh); arrows.splice(i, 1);
    } else {
      to.divideScalar(dist);
      a.mesh.position.addScaledVector(to, 45 * dt);
      a.mesh.lookAt(a.mesh.position.clone().add(to));
    }
  }
}

const r2 = () => (Math.random() - 0.5) * 2;
// jagged lightning line between two points
function jagged(a, b) {
  const pts = [a.clone()], N = 7;
  for (let i = 1; i < N; i++) {
    const p = a.clone().lerp(b, i / N);
    p.x += r2() * 0.9; p.y += r2() * 0.9; p.z += r2() * 0.9;
    pts.push(p);
  }
  pts.push(b.clone());
  return new THREE.BufferGeometry().setFromPoints(pts);
}
const bolts = [];
const ricMat = new THREE.LineBasicMaterial({ color: 0xffb84a });
const jagged2 = (a, b) => new THREE.BufferGeometry().setFromPoints([a, b]);
const boltMat = new THREE.LineBasicMaterial({ color: 0x9fe0ff });
const fireMat2 = new THREE.LineBasicMaterial({ color: 0xffe08a });
const fireMat = new THREE.MeshBasicMaterial({ color: 0xff7a1a });

function onHit(scene, target) {
  if (game.fire) target.burn = { t: 3, acc: 0, dps: dmgNow() * 0.25 * game.fire };
  if (game.frostA) target.slowT = 2;
  if (game.poison) { const p = target.poison || (target.poison = { n: 0, t: 0, acc: 0 }); p.n = Math.min(5, p.n + 1); p.t = 4; }
  if (game.ricochet) {                              // bounce to other enemies
    let at = target;
    const seen = new Set([target]);
    for (let n = 0; n < game.ricochet; n++) {
      let best = null, bd = 16;
      for (const e of enemies) {
        if (seen.has(e) || !isAlive(e)) continue;
        const d = Math.hypot(e.obj.position.x - at.obj.position.x, e.obj.position.z - at.obj.position.z);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) break;
      seen.add(best);
      damageEnemy(best, dmgNow() * 0.6);
      const line = new THREE.Line(jagged2(aim(at), aim(best)), ricMat); scene.add(line); bolts.push({ line, life: 0.2 });
      burst(aim(best), tier(game.ricochet, 0xffb84a, GOLD, DIAMOND), 10, 6, 0.3, 0, 0);
      at = best;
    }
  }
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
    const A = aim(from), B = aim(best);
    for (let k = 0; k < 2; k++) { const line = new THREE.Line(jagged(A, B), boltMat); scene.add(line); bolts.push({ line, life: 0.22 }); }
    burst(B, 0x9fe0ff, 14, 7, 0.4, 0, 0); sfx('zap');
    for (let k = 0; k < 10; k++) { const p = A.clone().lerp(B, Math.random()); spark(p.x, p.y, p.z, r2() * 2, r2() * 2, r2() * 2, 0xcff4ff, 0.3); }
    ring(best.obj.position, 0x9fe0ff, 2.5, 0.3);
    from = best;
  }
}

let shotN = 0;
export function fireArrow(scene, target, o = {}) {
  const origin = o.origin || ORIGIN;
  ricMat.color.setHex(tier(game.ricochet, 0xffb84a, GOLD, DIAMOND));
  sniperMat.color.setHex(tier(game.sniper, 0xffffff, GOLD, DIAMOND));
  const snipe = !o.noSnipe && game.sniper && ++shotN % Math.max(3, 7 - game.sniper) === 0;
  const mesh = new THREE.Mesh(arrowGeo, snipe ? sniperMat : game.fire ? fireMat : arrowMat);
  mesh.position.copy(origin);
  mesh.scale.set(1.8, 1.8, 1.3);
  if (snipe) mesh.scale.set(3.2, 3.2, 2.2);
  scene.add(mesh);
  burst(origin, snipe ? 0xffffff : game.fire ? 0xff7a1a : 0xffe9a0, snipe ? 24 : 14, 5, 0.4, 1, 0);   // muzzle flash
  arrows.push({ mesh, target, mult: (o.mult || 1) * (snipe ? 3 : 1), snipe });
  sfx(game.fire ? 'fireshoot' : 'shoot');
  if (!o.origin) sorcererCast(target.obj.position);
}
const fire = fireArrow;
const sniperMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

export function clearArrows(scene) {
  arrows.forEach(a => scene.remove(a.mesh));
  arrows.length = 0;
}
