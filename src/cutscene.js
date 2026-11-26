import * as THREE from 'three';
import { game } from './game.js';
import { softTexture } from './world.js';
import { burst, ring, spark, shake } from './fx.js';
import { sfx } from './audio.js';
import { waveLabel } from './modes.js';

// The boss arrival "cutscene": the battle stands still, the camera swoops to the red portal,
// the boss steps out of the dark, stomps, and gets a name card. Tap / Space / Esc skips it.
const END = 8, EYES = 2.6, STEP = 3.4, STOMP = 4.8, BACK = 6.8, WALK = 5;

const el = document.createElement('div');
el.id = 'cine';
el.hidden = true;
el.innerHTML = '<div class="cdim"></div><div class="cflash"></div><div class="cwarn">⚠ SOMETHING IS COMING ⚠</div>'
  + '<div class="cname"><div class="crule"></div><h1></h1><p></p><div class="chp"><i></i></div></div>'
  + '<div class="cbar top"></div><div class="cbar bot"></div><div class="cskip">Tap or press Space to skip</div>';
document.body.appendChild(el);
const q = s => el.querySelector(s);

let cur = null;
let camera, controls, scene;
export function initCutscene(sc, cam, ctl) { scene = sc; camera = cam; controls = ctl; }

// cracks in the ground in front of the door
export function crackTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const g = c.getContext('2d');
  g.lineCap = 'round'; g.shadowColor = '#ff3a10'; g.shadowBlur = 8; g.strokeStyle = '#ffa23a';
  for (let k = 0; k < 9; k++) {
    let a = (k / 9) * Math.PI * 2 + Math.random() * 0.4, x = 128, y = 128;
    for (let s = 0; s < 6; s++) {
      g.lineWidth = 6 - s * 0.8;
      g.beginPath(); g.moveTo(x, y);
      a += (Math.random() - 0.5) * 1.1; x += Math.cos(a) * 19; y += Math.sin(a) * 19;
      g.lineTo(x, y); g.stroke();
    }
  }
  return new THREE.CanvasTexture(c);
}

export function startCutscene(boss, portal) {
  const door = portal.g.position, u = door.clone().setY(0).normalize();   // u: from the tower towards the door
  const from = door.clone().setY(0).addScaledVector(u, -0.5);
  boss.obj.position.copy(from);
  boss.obj.rotation.y = Math.atan2(-u.x, -u.z);
  boss.obj.scale.setScalar(boss.size);
  boss.emerging = 0;
  boss.obj.visible = false;
  const colors = boss.mats.map(m => m.color.clone());

  const eyes = [-1, 1].map(side => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: new THREE.Color(0xffd23a).multiplyScalar(3), blending: THREE.AdditiveBlending, depthWrite: false, depthTest: false }));
    s.position.set(side * 0.2, 1.62, 0.55);                // KayKit head; special bosses follow their own
    s.scale.setScalar(boss.t.eyes ? 0.2 : 0.28);
    s.visible = false;
    boss.obj.add(s);
    return s;
  });
  const head = (boss.t.head ?? []).map(n => boss.obj.getObjectByName(n)).filter(Boolean);
  const crack = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2),
    new THREE.MeshBasicMaterial({ map: crackTexture(), transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }));
  crack.position.copy(door).addScaledVector(u, -WALK).setY(0.2);
  scene.add(crack);

  cur = {
    boss, portal, u, from, colors, eyes, head, crack, t: 0, done: {},
    camPos: camera.position.clone(), camTarget: controls.target.clone(), fov: camera.fov,
    closePos: door.clone().addScaledVector(u, -27).setY(8),
    closeTarget: door.clone().addScaledVector(u, -4).setY(5.2),
  };
  q('h1').textContent = boss.t.name.toUpperCase();
  q('p').textContent = `${boss.t.title ?? 'Breaker of Walls'} · ${waveLabel()}`;
  el.hidden = false;
  el.className = '';
  void el.offsetWidth;                          // restart the CSS animations
  el.className = 'play';
  document.body.classList.add('cine');
  controls.enabled = false;
  game.cine = true;
  sfx('wave');
}

function finish() {
  const c = cur; if (!c) return;
  cur = null;
  const b = c.boss;
  b.obj.visible = true;
  b.obj.position.copy(c.from).addScaledVector(c.u, -WALK);
  b.mats.forEach((m, i) => m.color.copy(c.colors[i]));
  c.eyes.forEach(s => { b.obj.remove(s); s.material.dispose(); });
  scene.remove(c.crack); c.crack.material.map.dispose(); c.crack.material.dispose(); c.crack.geometry.dispose();
  b.mixer.stopAllAction();
  b.walk.reset().play();
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

const q1 = new THREE.Vector3();
function followHead({ boss, head, eyes }) {
  boss.obj.updateMatrixWorld(true);
  p.set(0, 0, 0);
  head.forEach(bone => p.add(bone.getWorldPosition(q1)));
  boss.obj.worldToLocal(p.divideScalar(head.length));
  const [x, y, z] = boss.t.eyes;
  eyes.forEach((s, i) => s.position.set(p.x + (i ? x : -x), p.y + y, p.z + z));
}

// called every drawn frame with real time (the game speed does not apply)
export function updateCutscene(dt) {
  const c = cur; if (!c) return;
  const t = (c.t += dt), b = c.boss;
  const once = (key, at, fn) => { if (t >= at && !c.done[key]) { c.done[key] = true; fn(); } };

  // camera: swoop in, creep closer, fly back
  const k = ease((t - 0.4) / 1.8) * (1 - ease((t - BACK) / (END - BACK - 0.1)));
  camera.position.lerpVectors(c.camPos, c.closePos, k).addScaledVector(c.u, ease((t - 2.2) / 4.4) * 4 * k);
  p.lerpVectors(c.camTarget, c.closeTarget, k);
  camera.lookAt(p);
  const wide = 2 * Math.atan(Math.tan(THREE.MathUtils.degToRad(c.fov / 2)) / camera.aspect) * THREE.MathUtils.radToDeg(1);
  camera.fov = c.fov + (Math.min(82, Math.max(c.fov, wide)) - c.fov) * k;     // upright screens: see wider
  camera.updateProjectionMatrix();

  // the door boils and the ground cracks
  if (t > 1.6 && t < STOMP) {
    c.portal.flash = Math.max(c.portal.flash, ease((t - 1.6) / 1.5) * 0.8);
    shake(0.12);
    if (Math.random() < dt * 40) spark(c.crack.position.x + (Math.random() - 0.5) * 8, 0.3, c.crack.position.z + (Math.random() - 0.5) * 8, 0, 2 + Math.random() * 3, 0, 0xff7a2a, 0.9);
  }
  once('rumble', 1.8, () => sfx('boom'));
  c.crack.scale.setScalar(2 + 13 * ease((t - 1.8) / 1.6));
  c.crack.material.opacity = clamp((t - 1.8) * 2) * (1 - ease((t - BACK) / 1));

  // eyes in the dark (with one blink), then the boss steps out
  b.obj.visible = t >= EYES;
  const blink = t > EYES + 0.3 && t < EYES + 0.45;
  c.eyes.forEach(s => { s.visible = t >= EYES && !blink; s.material.opacity = 1 - ease((t - STOMP) / 0.6); });
  const light = 0.03 + 0.97 * ease((t - STEP - 0.3) / (STOMP - STEP - 0.3));
  b.mats.forEach((m, i) => m.color.copy(c.colors[i]).multiplyScalar(light));
  b.obj.position.copy(c.from).addScaledVector(c.u, -WALK * clamp((t - STEP) / (STOMP - STEP)));
  once('walk', STEP, () => b.walk.reset().play());
  once('stomp', STOMP, () => {
    const at = b.obj.position;
    b.walk.stop();
    const roar = (b.t.roar ? b.clip(b.t.roar) : b.clip('Cheer')) || b.clip(b.t.atk);
    b.mixer.clipAction(roar).reset().play();
    ring(at, 0xffc14a, 18, 0.9, 0.3); ring(at, 0xff4020, 12, 0.6, 0.4);
    burst(p.copy(at).setY(1), 0xff8a3a, 60, 14, 0.9, 1, -9);
    shake(1.8); sfx('boss'); sfx('boom');
    c.portal.flash = 1;
  });
  b.mixer.update(t >= STEP ? dt : 0);
  if (c.head.length) followHead(c);

  if (t >= END) finish();
}
