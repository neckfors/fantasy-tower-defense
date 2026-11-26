import * as THREE from 'three';
import { game, dmgNow, rateNow } from './game.js';
import { sfx } from './audio.js';
import { sorcererCast, twinCast } from './tower-fx.js';
import { enemies, isAlive, damageEnemy } from './enemies.js';
import { burst, spark, ring } from './fx.js';
import { rankTargets, pickShots, doomed, dist2 } from './targeting.js';
import { tier, GOLD, DIAMOND } from './upgrades-more.js';

const ORIGIN = new THREE.Vector3(0, 15.5, 0);
const arrowGeo = new THREE.CylinderGeometry(0.06, 0.06, 1.2, 5).rotateX(Math.PI / 2);
const arrowMat = new THREE.MeshBasicMaterial({ color: 0xffd77a });
const arrows = [];
let cooldown = 0, ballT = 2;

const aim = e => new THREE.Vector3(e.obj.position.x, e.obj.position.y + 1.3, e.obj.position.z);

export function updateCombat(dt, scene) {
  cooldown -= dt;
  for (const k of ['rallyT', 'rapidT', 'frostT']) if (game[k] > 0 && !game.resting) game[k] = Math.max(0, game[k] - dt);
  if (cooldown <= 0 && !game.over) {
    const shots = pickShots(game.range, game.multi, dmgNow());
    if (shots.length) {
      volley(scene, shots);
      if (game.twin) twinVolley(scene);
      cooldown = 1 / rateNow();
    }
  }

  if (game.ballista && !game.over) {               // ballista
    ballT -= dt;
    if (ballT <= 0) {
      let best = null;                              // toughest enemy that isn't already as good as dead
      for (const e of rankTargets(game.range)) if (!doomed(e) && (!best || e.hp > best.hp)) best = e;
      if (best) {
        ballT = 4 / game.ballista;
        const A = ORIGIN.clone(), B = aim(best);
        for (let k = 0; k < 3; k++) { const line = new THREE.Line(jagged(A, B), fireMat2); scene.add(line); bolts.push({ line, life: 0.3 }); }
        burst(B, 0xffe08a, 30, 10, 0.5, 1, -4); ring(best.obj.position, 0xffe08a, 4, 0.4); sfx('hit');
        damageEnemy(best, dmgNow() * 4, false, 'heavy');
      } else ballT = 0.3;
    }
  }
  teslaStep(dt, scene);
  for (const e of enemies) {                       // poison
    const p = e.poison;
    if (!p) continue;
    if (!isAlive(e)) { e.poison = null; continue; }
    if (Math.random() < dt * 8) { const q = e.obj.position; spark(q.x + r2() * 0.5, q.y + Math.random() * 2, q.z + r2() * 0.5, 0, 1.5, 0, 0x6aff3a, 0.6); }
    p.t -= dt; p.acc += dt; p.jump = (p.jump ?? 1) - dt;
    if (p.jump <= 0) {                              // contagion: jumps to one healthy neighbour (faster and further per level)
      p.jump = 1.6 - 0.3 * game.poison;
      let best = null, bd = 4.5 + game.poison;
      for (const o of enemies) {
        if (o === e || o.poison || !isAlive(o) || o.emerging) continue;
        const d = dist2(e, o);
        if (d < bd) { bd = d; best = o; }
      }
      if (best) infect(scene, e, best, 1);
    }
    if (p.acc >= 0.5) { p.acc -= 0.5; damageEnemy(e, dmgNow() * 0.06 * p.n * game.poison, true, 'poison'); }
    if (p.t <= 0 && isAlive(e)) e.poison = null;
  }
  for (const e of enemies) {                       // burning
    if (!e.burn) continue;
    if (!isAlive(e)) { e.burn = null; continue; }
    if (Math.random() < dt * 25) { const p = e.obj.position, s = e.obj.scale.x; spark(p.x + (Math.random() - 0.5) * s, p.y + Math.random() * 2 * s, p.z + (Math.random() - 0.5) * s, 0, 2.5, 0, Math.random() < 0.5 ? 0xff6a1a : 0xffc040, 0.6); }   // flames
    e.burn.t -= dt; e.burn.acc += dt;
    if (e.burn.acc >= 0.5) { e.burn.acc -= 0.5; damageEnemy(e, e.burn.dps * 0.5, true, 'fire'); }
    if (e.burn && e.burn.t <= 0) e.burn = null;
  }
  for (let i = bolts.length - 1; i >= 0; i--) {    // lightning visuals
    if ((bolts[i].life -= dt) <= 0) { scene.remove(bolts[i].line); bolts[i].line.geometry.dispose(); bolts.splice(i, 1); }
  }

  for (let i = arrows.length - 1; i >= 0; i--) {
    const a = arrows[i];
    if (!a) continue;
    if (!isAlive(a.target)) {                        // target died first: fly on to another enemy near it
      let best = null, bd = 12;
      for (const e of enemies) {
        if (!isAlive(e) || e.emerging || doomed(e)) continue;
        const d = dist2(a.target, e);
        if (d < bd) { bd = d; best = e; }
      }
      if (!best) { burst(a.mesh.position, 0xffd77a, 6, 3, 0.3, 0, 0); remove(scene, i); continue; }
      a.target = best; best.incoming = (best.incoming || 0) + a.expect;
    }
    a.age += dt;
    const to = aim(a.target).sub(a.mesh.position), dist = to.length(), step = 45 * dt;
    const col = a.snipe ? 0xffffff : game.fire ? 0xff7a1a : a.magic ? 0x8fc4ff : 0xffd77a;
    if (dt) spark(a.mesh.position.x, a.mesh.position.y, a.mesh.position.z, r2(), r2(), r2(), col, a.magic ? 0.45 : 0.3);   // trail
    if (dt && a.magic) spark(a.mesh.position.x, a.mesh.position.y, a.mesh.position.z, 0, 0, 0, 0xffffff, 0.15);
    if (dt && (dist < Math.max(0.9, step) || a.age > 4)) {
      burst(a.mesh.position, col, 12, 6, 0.4, 1, -8);
      const crit = Math.random() < (game.crit || 0), lite = a.lite;
      const t = a.target;
      if (a.snipe) { ring(a.mesh.position, 0xffffff, 4, 0.35); burst(a.mesh.position, 0xffffff, 20, 9, 0.4, 1, 0); }
      if (crit) { ring(a.mesh.position, 0xff4040, 3, 0.3); burst(a.mesh.position, 0xff4040, 16, 8, 0.4, 1, 0); }
      remove(scene, i);
      if (!lite) onHit(scene, t);
      damageEnemy(t, dmgNow() * a.mult * (crit ? 2.5 : 1), false, crit || a.snipe ? 'crit' : 'hit');
      if (!lite) bounce(scene, t);
    } else if (dist > 0.001) {
      to.divideScalar(dist);
      // straight out of the wand first, then a sharp turn that tightens until it hits
      if (a.age >= a.launch) {
        if (a.launch && !a.turned) { a.turned = true; burst(a.mesh.position, col, 6, 3, 0.25, 0, 0); }
        const turn = a.launch ? 12 + (a.age - a.launch) * 60 : 3 + a.age * 20;
        a.dir.lerp(to, Math.min(1, dt * turn)).normalize();
      }
      a.mesh.position.addScaledVector(a.dir, step);
      a.mesh.lookAt(a.mesh.position.clone().add(a.dir));
    }
  }
}

function remove(scene, i) {
  const a = arrows[i];
  a.target.incoming = Math.max(0, (a.target.incoming || 0) - a.expect);
  scene.remove(a.mesh); arrows.splice(i, 1);
}

// poison hops from one enemy to another, with a visible green strand
function infect(scene, from, to, stacks) {
  const q = to.poison || (to.poison = { n: 0, t: 0, acc: 0 });
  q.n = Math.min(5, q.n + stacks); q.t = 4;
  const A = aim(from), B = aim(to);
  const line = new THREE.Line(jagged(A, B), poisonMat); scene.add(line); bolts.push({ line, life: 0.35 });
  burst(B, 0x6aff3a, 12, 4, 0.5, 1, -3);
}
// a poisoned enemy bursts into a toxic cloud when it dies
export function poisonBurst(scene, dead) {
  const R = 7 + game.poison;
  ring(dead.obj.position, 0x6aff3a, R * 0.7, 0.5);
  for (const o of enemies) if (o !== dead && isAlive(o) && !o.emerging && dist2(dead, o) <= R) infect(scene, dead, o, Math.ceil(dead.poison.n / 2));
}

const r2 = () => (Math.random() - 0.5) * 2;
// a short-lived lightning strand between two points
export function arc(scene, a, b, mat, life = 0.3) {
  const line = new THREE.Line(jagged(a, b), mat); scene.add(line); bolts.push({ line, life });
}
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
const poisonMat = new THREE.LineBasicMaterial({ color: 0x6aff3a });
const fireMat2 = new THREE.LineBasicMaterial({ color: 0xffe08a });
const fireMat = new THREE.MeshBasicMaterial({ color: 0xff7a1a });

// set the enemy on fire; a weaker burn never replaces a stronger one
export function ignite(target, dps) {
  target.burn = { t: 3, acc: target.burn?.acc || 0, dps: Math.max(dps, target.burn?.dps || 0) };
}
function onHit(scene, target) {
  if (game.fire) ignite(target, dmgNow() * 0.4 * game.fire);
  if (game.frostA) target.slowT = 2;
  if (game.poison) { const p = target.poison || (target.poison = { n: 0, t: 0, acc: 0 }); p.n = Math.min(5, p.n + 1); p.t = 4; }
}
function bounce(scene, target) {
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
      onHit(scene, best);
      damageEnemy(best, dmgNow() * 0.6, false, 'bounce');
      const line = new THREE.Line(jagged2(aim(at), aim(best)), ricMat); scene.add(line); bolts.push({ line, life: 0.2 });
      burst(aim(best), tier(game.ricochet, 0xffb84a, GOLD, DIAMOND), 10, 6, 0.3, 0, 0);
      at = best;
    }
  }
}

// Tesla Coil: a coil on top of the tower zaps the nearest enemy and chains on to neighbours
let coil = null, coilBall = null, coilL = 0, teslaT = 1;
const COIL_POS = new THREE.Vector3(1.9, 13.2, -1.2);
function buildCoil(scene) {
  if (coil) scene.remove(coil);
  coil = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: tier(game.tesla, 0x8a6a3a, GOLD, DIAMOND), metalness: 0.7, roughness: 0.35 });
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.4, 2.2, 10), metal); col.position.y = 1.1;
  coil.add(col);
  for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.55 - i * 0.08, 0.1, 6, 14), metal); r.rotation.x = Math.PI / 2; r.position.y = 0.6 + i * 0.5; coil.add(r); }
  coilBall = new THREE.Mesh(new THREE.SphereGeometry(0.55, 14, 10), new THREE.MeshBasicMaterial({ color: tier(game.tesla, 0x9fe0ff, 0xfff0a0, 0xffffff) }));
  coilBall.position.y = 2.5;
  coil.add(coilBall);
  coil.position.copy(COIL_POS);
  scene.add(coil);
  coilL = game.tesla;
}
function teslaStep(dt, scene) {
  if (coil) coil.visible = !!game.tesla;
  if (!game.tesla) return;
  if (coilL !== game.tesla) buildCoil(scene);
  coilBall.scale.setScalar(1 + Math.sin(performance.now() / 120) * 0.15);
  if (Math.random() < dt * 6) { const p = COIL_POS; spark(p.x + r2() * 0.4, p.y + 2.5 + r2() * 0.4, p.z + r2() * 0.4, r2() * 2, r2() * 2, r2() * 2, 0xcff4ff, 0.3); }
  if ((teslaT -= dt) > 0 || game.over) return;
  const first = rankTargets(game.range).find(e => !doomed(e));
  if (!first) { teslaT = 0.3; return; }
  teslaT = 2.2 - 0.4 * game.tesla;                 // 1.8 / 1.4 / 1.0 s
  const col = tier(game.tesla, 0x9fe0ff, GOLD, DIAMOND);
  boltMat.color.setHex(col);
  let from = new THREE.Vector3(COIL_POS.x, COIL_POS.y + 2.5, COIL_POS.z), target = first, mult = 1.5;
  const hit = new Set();
  for (let n = 0; n <= 1 + game.tesla && target; n++) {   // first zap + 2/3/4 chains
    hit.add(target);
    damageEnemy(target, dmgNow() * mult, false, 'zap');
    const B = aim(target);
    for (let k = 0; k < 2; k++) { const line = new THREE.Line(jagged(from, B), boltMat); scene.add(line); bolts.push({ line, life: 0.25 }); }
    burst(B, col, 14, 7, 0.4, 0, 0); sfx('zap'); ring(target.obj.position, col, 2.5, 0.3);
    for (let k = 0; k < 10; k++) { const p = from.clone().lerp(B, Math.random()); spark(p.x, p.y, p.z, r2() * 2, r2() * 2, r2() * 2, 0xcff4ff, 0.3); }
    from = B; mult = 0.7;
    let next = null, nd = 10;
    for (const e of enemies) {
      if (hit.has(e) || !isAlive(e)) continue;
      const d = dist2(e, target);
      if (d < nd) { nd = d; next = e; }
    }
    target = next;
  }
}

const orbMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0x9fd0ff).multiplyScalar(2) });
const orbGeo = new THREE.SphereGeometry(0.22, 10, 8);
const sniperMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
const LAUNCH = 0.1;                        // seconds a bolt flies straight out of the wand before turning

// The sorcerer's volley: he faces the first target and everything shoots out of the wand.
// Bolts meant for others then turn sharply towards their own enemy.
function volley(scene, shots) {
  const staff = sorcererCast(shots[0].obj.position) || ORIGIN;
  const forward = aim(shots[0]).sub(staff).normalize();
  const flat = new THREE.Vector3(forward.x, 0, forward.z).normalize();
  shots.forEach((target, i) => {
    let dir = null;                                 // the first bolt is aimed straight at its target
    if (i) {
      const side = (i % 2 ? 1 : -1) * Math.ceil(i / 2) * 0.09;   // a narrow fan so each bolt can be seen
      dir = new THREE.Vector3(flat.x - flat.z * side, -0.08, flat.z + flat.x * side).normalize();
    }
    fireArrow(scene, target, { origin: staff, dir, magic: true, launch: dir ? LAUNCH : 0 });
  });
}

// Twin Sorcerer: a matching volley at 40% damage. No on-hit extras, so it stays 40%.
function twinVolley(scene) {
  const shots = pickShots(game.range, game.multi, dmgNow() * 0.4);
  if (!shots.length) return;
  const staff = twinCast(shots[0].obj.position);
  if (staff) for (const target of shots) fireArrow(scene, target, { origin: staff, magic: true, mult: 0.4, noSnipe: true, lite: true });
}

let shotN = 0;
export function fireArrow(scene, target, o = {}) {
  const origin = o.origin || ORIGIN;
  ricMat.color.setHex(tier(game.ricochet, 0xffb84a, GOLD, DIAMOND));
  sniperMat.color.setHex(tier(game.sniper, 0xffffff, GOLD, DIAMOND));
  const snipe = !o.noSnipe && game.sniper && ++shotN % Math.max(3, 7 - game.sniper) === 0;
  const mesh = new THREE.Mesh(arrowGeo, snipe ? sniperMat : game.fire ? fireMat : o.magic ? orbMat : arrowMat);
  mesh.position.copy(origin);
  mesh.scale.set(1.8, 1.8, 1.3);
  if (o.magic && !snipe) mesh.add(new THREE.Mesh(orbGeo, mesh.material));
  if (snipe) mesh.scale.set(3.2, 3.2, 2.2);
  scene.add(mesh);
  burst(origin, snipe ? 0xffffff : game.fire ? 0xff7a1a : o.magic ? 0x9fd0ff : 0xffe9a0, snipe ? 24 : 8, 4, 0.35, 1, 0);   // muzzle flash
  const mult = (o.mult || 1) * (snipe ? 3 : 1), expect = dmgNow() * mult;
  target.incoming = (target.incoming || 0) + expect;
  const dir = o.dir ? o.dir.clone() : aim(target).sub(origin).normalize();
  mesh.lookAt(origin.clone().add(dir));
  arrows.push({ mesh, target, mult, expect, snipe, magic: o.magic, lite: o.lite, dir, launch: o.launch || 0, age: 0 });
  sfx(game.fire ? 'fireshoot' : 'shoot');
}

export function clearArrows(scene) {
  arrows.forEach(a => { a.target.incoming = 0; scene.remove(a.mesh); });
  arrows.length = 0;
}
