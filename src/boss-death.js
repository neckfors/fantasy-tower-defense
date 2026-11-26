import * as THREE from 'three';
import { game } from './game.js';
import { burst, ring, spark, shake } from './fx.js';
import { sfx } from './audio.js';
import { enemies, isAlive, damageEnemy, updateDead } from './enemies.js';
import { cancelSpawns } from './waves.js';
import { clearArrows } from './combat.js';
import { clearShots } from './shots.js';
import { emeralds } from './shop.js';
import { crackTexture } from './cutscene.js';

// The boss death "cutscene": the camera zooms to the dying boss, light breaks out of it, and when it
// hits the ground a golden wave kills every other enemy (full rewards). Tap / Space / Esc skips it.
const END = 8.2, SLOW = 1.2, FALL = 2.6, HIT = 3.4, SWEEP = 3.9, SWEPT = 6.0, BACK = 3.9, CARD = 6.1, REACH = 80;
const GOLD = 0xffc14a;

const el = document.createElement('div');
el.id = 'fall';
el.hidden = true;
el.innerHTML = '<div class="cdim"></div><div class="fflash"></div><div class="fblow">Final blow!</div>'
  + '<div class="cname"><div class="crule"></div><h1></h1><p></p></div>'
  + '<div class="cbar top"></div><div class="cbar bot"></div><div class="cskip">Tap or press Space to skip</div>';
document.body.appendChild(el);
const q = s => el.querySelector(s);

let cur = null;
let camera, controls, scene;
export function initBossDeath(sc, cam, ctl) { scene = sc; camera = cam; controls = ctl; }
export const isBossDying = () => !!cur;

const additive = opts => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, ...opts });
const gold = k => new THREE.Color(GOLD).multiplyScalar(k);

// thin spikes of light that break out of the boss
function makeBeams() {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0.05, 0, 1, -0.05, 0], 3));
  const mat = additive({ color: gold(1.6) });
  const group = new THREE.Group();
  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.set(Math.random() * 6.28, Math.random() * 6.28, Math.random() * 6.28);
    group.add(m);
  }
  scene.add(group);
  return { group, geo, mat };
}

// `fallen` = { boss, gems: emeralds owned before the boss dropped any }
export function startBossDeath({ boss, gems }) {
  cancelSpawns();                                     // nothing new comes out of the doors
  clearArrows(scene); clearShots();                   // nothing already in the air may hit the tower afterwards
  const at = boss.obj.position.clone().setY(0);
  const d = at.length();
  const u = at.clone().setY(0).normalize();
  const h = 2.4 * boss.size;                          // roughly how tall the boss is
  const out = d > 22 ? -1 : 1;                        // film from the side with more room (not through a doorway)
  const side = new THREE.Vector3(-u.z, 0, u.x);
  const die = boss.mixer.clipAction(boss.clip(boss.t.anims?.die ?? 'Death_A'));

  const beams = makeBeams();
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2), additive({ map: crackTexture() }));
  crack.position.copy(at).setY(0.22);
  const wave = new THREE.Mesh(new THREE.RingGeometry(0.93, 1, 96).rotateX(-Math.PI / 2), additive({ color: gold(1.8) }));
  wave.position.copy(at).setY(0.6);
  wave.visible = false;
  scene.add(crack, wave);

  cur = {
    boss, at, h, die, beams, crack, wave, gems, t: 0, done: {},
    swept: enemies.filter(isAlive).length,
    camPos: camera.position.clone(), camTarget: controls.target.clone(), fov: camera.fov,
    closePos: at.clone().addScaledVector(u, out * h * 1.9).addScaledVector(side, h * 1.1).setY(h * 1.15),
    closeTarget: at.clone().setY(h * 0.35),
  };
  q('h1').textContent = `THE ${boss.t.name.toUpperCase()} HAS FALLEN`;
  el.hidden = false;
  el.className = '';
  void el.offsetWidth;                                // restart the CSS animations
  el.className = 'play';
  document.body.classList.add('cine');
  controls.enabled = false;
  game.cine = true;
}

// every living enemy closer to the boss than `radius` dies (normal rewards)
function sweep(radius) {
  const c = cur;
  for (const e of [...enemies]) {
    const p = e.obj.position;
    if (!isAlive(e) || Math.hypot(p.x - c.at.x, p.z - c.at.z) > radius) continue;
    burst(p.clone().setY(p.y + 1.5), GOLD, 18, 8, 0.7, 1, -3);
    damageEnemy(e, e.hp + 1, true);
  }
}

function card() {
  const got = emeralds() - cur.gems;
  q('p').textContent = `Wave ${game.mode === 'story' ? (game.wave - 1) % 10 + 1 : game.wave} cleared`
    + (cur.swept ? ` · ${cur.swept} ${cur.swept === 1 ? 'enemy' : 'enemies'} swept away` : '')
    + (got > 0 ? ` · 💎 +${got}` : '');
}

function finish() {
  const c = cur; if (!c) return;
  sweep(Infinity);                                    // skipping still ends the wave the same way
  cur = null;
  for (const e of enemies) if (!isAlive(e)) { e.obj.visible = false; e.timer = 99; }   // removed on the next update
  for (const m of [c.crack, c.wave]) { scene.remove(m); m.material.map?.dispose(); m.material.dispose(); m.geometry.dispose(); }
  scene.remove(c.beams.group); c.beams.geo.dispose(); c.beams.mat.dispose();
  camera.position.copy(c.camPos); controls.target.copy(c.camTarget);
  camera.fov = c.fov; camera.updateProjectionMatrix();
  controls.enabled = true;
  el.hidden = true;
  document.body.classList.remove('cine');
  game.cine = false;
}

const skip = () => { if (cur && cur.t > 0.6) finish(); };      // not in the first moment: that tap was meant for the game
el.addEventListener('pointerdown', skip);
addEventListener('keydown', e => {
  if (!cur || !['Space', 'Escape', 'Enter', 'KeyP', 'KeyF'].includes(e.code)) return;
  e.preventDefault(); e.stopImmediatePropagation();
  skip();
}, true);

const clamp = x => Math.min(1, Math.max(0, x));
const ease = x => { x = clamp(x); return x * x * (3 - 2 * x); };
const p = new THREE.Vector3();

// how far through its death animation the boss is: slow at first, staggering, then the fall
const pose = t => t < SLOW ? 0.1 * (t / SLOW)
  : t < FALL ? 0.1 + 0.16 * ((t - SLOW) / (FALL - SLOW))
    : 0.26 + 0.74 * clamp((t - FALL) / (HIT - FALL + 0.3));

// called every drawn frame with real time (the game speed does not apply)
export function updateBossDeath(dt) {
  const c = cur; if (!c) return;
  const t = (c.t += dt), b = c.boss;
  const once = (key, at, fn) => { if (t >= at && !c.done[key]) { c.done[key] = true; fn(); } };

  // camera: zoom in on the boss, then pull back to watch the wave sweep the arena
  const k = ease(t / 1.1) * (1 - ease((t - BACK) / 1.2));
  camera.position.lerpVectors(c.camPos, c.closePos, k);
  p.lerpVectors(c.camTarget, c.closeTarget, k);
  camera.lookAt(p);
  const wide = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) / camera.aspect) * THREE.MathUtils.radToDeg(1);
  camera.fov = c.fov + (Math.min(82, Math.max(c.fov, wide)) - c.fov) * k;     // upright screens: see wider
  camera.updateProjectionMatrix();

  // the boss: death animation, staggering, glowing, then fading away
  c.die.time = c.die.getClip().duration * 0.999 * pose(t);
  b.mixer.update(0);
  const stagger = t > SLOW && t < FALL ? Math.sin(t * 26) * 0.35 * (1 - (t - SLOW) / (FALL - SLOW)) : 0;
  b.obj.position.set(c.at.x + stagger, b.obj.position.y, c.at.z);
  const charge = ease((t - SLOW) / (HIT - SLOW)) * (1 - ease((t - HIT) / 1.2));
  b.mats.forEach(m => m.emissive.setHex(GOLD).multiplyScalar(charge * 0.45));
  const fade = 1 - ease((t - 5.2) / 1.2);
  if (fade < 1) b.mats.forEach(m => { if (!m.transparent) { m.transparent = true; m.needsUpdate = true; } m.opacity = fade; });
  b.obj.visible = fade > 0.02;

  c.beams.group.position.copy(c.at).setY(c.h * 0.45);
  c.beams.group.rotation.y = t * 0.9; c.beams.group.rotation.x = t * 0.35;
  c.beams.group.scale.setScalar(0.5 + c.h * 1.1 * ease((t - SLOW) / (HIT - SLOW)));
  c.beams.mat.opacity = ease((t - SLOW) / 0.8) * (1 - ease((t - HIT) / 0.25));

  once('groan', 0.05, () => sfx('boss'));
  if (t > SLOW && t < HIT) { shake(0.1); if (Math.random() < dt * 30) spark(c.at.x, c.h * 0.5, c.at.z, (Math.random() - 0.5) * 12, Math.random() * 8, (Math.random() - 0.5) * 12, GOLD, 0.9); }
  once('hit', HIT, () => {
    ring(c.at, 0xfff2c0, 16, 0.7, 0.4);
    burst(p.copy(c.at).setY(1.5), GOLD, 90, 18, 1.2, 1, -9);
    shake(1.8); sfx('boom');
  });
  c.crack.scale.setScalar(1 + 20 * ease((t - HIT) / 0.5));
  c.crack.material.opacity = t < HIT ? 0 : 1 - ease((t - 6.4) / 1.4);

  once('wave', SWEEP, () => sfx('fanfare'));
  const w = clamp((t - SWEEP) / (SWEPT - SWEEP));
  c.wave.visible = w > 0 && w < 1;
  c.wave.scale.setScalar(Math.max(0.01, w * REACH));
  c.wave.material.opacity = 1 - w * 0.5;
  if (w > 0) sweep(w >= 1 ? Infinity : w * REACH);
  updateDead(dt, scene, b);                           // the battle is frozen, but the fallen still fall

  once('card', CARD, card);
  if (t >= END) finish();
}
