import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld, animateFlag } from './world.js';
import { loadModels, updateEnemies, clearEnemies } from './enemies.js';
import { updateCombat } from './combat.js';
import { updateWaves } from './waves.js';
import { game, checkLevel, pickUpgrades } from './game.js';
import * as ui from './ui.js';
import { initDev } from './dev.js';
import { initTower, updateTower } from './tower-fx.js';
import { applyShop, emeralds, renderShop } from './shop.js';
import { updateBars } from './hpbars.js';
import { initFx, updateFx, shakeStep, fireworks } from './fx.js';
import { updateKnights } from './knights.js';
import { updateSidebar } from './sidebar.js';
import { sfx, toggleMute, isMuted } from './audio.js';
import { CHAPTERS, startMode, load, chapterCleared } from './modes.js';
import { clearArrows } from './combat.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, innerWidth / innerHeight, 0.1, 300);
camera.position.set(0, 32, 46);
const controls = new OrbitControls(camera, renderer.domElement);
controls.target.set(0, 6, 0);
controls.enableDamping = true;
controls.maxPolarAngle = Math.PI * 0.47;
controls.minDistance = 20; controls.maxDistance = 90;
controls.autoRotate = true; controls.autoRotateSpeed = 0.4;

const tower = buildWorld(scene, renderer);

// faint ring showing the tower's range
const rangeRing = new THREE.Mesh(
  new THREE.RingGeometry(0.985, 1, 96).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x8fd0ff, transparent: true, opacity: 0.35 }));
rangeRing.position.y = 0.05;
scene.add(rangeRing);

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

await loadModels();
initTower(scene, tower);
initFx(scene);
document.getElementById('load').style.opacity = 0;
setTimeout(() => document.getElementById('load').remove(), 700);

// ---- menu & story chapters ----
const $ = id => document.getElementById(id);
game.menu = true;
const sv = load();
$('m-prog').textContent = `Chapter ${Math.min(sv.unlocked || 1, 5)} unlocked`;
$('m-best').textContent = sv.best ? `Best: wave ${sv.best}` : '';
$('mute').onclick = toggleMute;
$('mute').textContent = isMuted() ? '🔇' : '🔊';
const begin = (mode, ch) => { sfx('click'); $('menu').hidden = true; $('chapter').hidden = true; clearEnemies(scene); clearArrows(scene); game.cleared = false; startMode(scene, mode, ch); applyShop(); game.menu = false; };
const refreshGold = () => { $('m-gold').textContent = `💎 ${emeralds()}`; };
refreshGold();
$('m-shop').onclick = () => { sfx('click'); $('menu').hidden = true; $('shop').hidden = false; renderShop($('shop'), () => sfx('levelup')); };
$('shopback').onclick = () => { sfx('click'); $('shop').hidden = true; $('menu').hidden = false; refreshGold(); };
$('m-endless').onclick = () => begin('endless');
$('m-story').onclick = () => {
  sfx('click'); $('menu').hidden = true; $('chsel').hidden = false;
  const un = Math.min(load().unlocked || 1, CHAPTERS.length), box = $('chlist'); box.innerHTML = '';
  CHAPTERS.forEach((c, i) => {
    const b = document.createElement('button');
    b.className = 'card chbtn'; b.disabled = i + 1 > un;
    b.innerHTML = `<div class="ic">${i + 1 > un ? '🔒' : i + 1 < un ? '✔' : '⚔'}</div><b>${i + 1}. ${c.name}</b><span>${c.intro}</span>`;
    b.onclick = () => { $('chsel').hidden = true; begin('story', i + 1); };
    box.appendChild(b);
  });
};
$('chback').onclick = () => { sfx('click'); $('chsel').hidden = true; $('menu').hidden = false; };

// ---- pause (P / Esc / button) ----
const setPause = on => { if (on && (game.menu || game.over || game.leveling || game.cleared)) return; game.paused = on; $('pause').hidden = !on; sfx(on ? 'pause' : 'resume'); };
$('pausebtn').onclick = () => setPause(!game.paused);
$('resume').onclick = () => setPause(false);
$('quit').onclick = () => location.reload();
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'p' || e.key === 'P' || e.key === 'Escape') setPause(!game.paused);
});
let clearShown = false;
function showChapterClear() {
  const ch = game.chapter, last = ch >= CHAPTERS.length;
  chapterCleared(); sfx('win'); sfx('fanfare'); fireworks();
  $('chtitle').textContent = last ? 'Victory! The Warlord is slain' : `Chapter ${ch} cleared!`;
  $('chtext').textContent = last ? 'You have defended the realm. Try Endless mode for a real challenge.' : `Next: ${CHAPTERS[ch].name} - ${CHAPTERS[ch].intro}`;
  const b = $('chbtns'); b.innerHTML = '';
  const add = (t, f) => { const x = document.createElement('button'); x.className = 'card'; x.innerHTML = `<b>${t}</b>`; x.onclick = f; b.append(x); };
  if (!last) add('Next chapter', () => { clearShown = false; begin('story', ch + 1); });
  add('Main menu', () => location.reload());
  $('chapter').hidden = false;
}

// shadowy silhouettes: enemies hidden behind the tower/scenery are redrawn as translucent purple shades
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x7a4cff, transparent: true, opacity: 0.5, depthFunc: THREE.GreaterDepth, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -1500 });
function ghostPass() {
  if (game.menu) return;
  ghostMat.opacity = 0.42 + Math.sin(clock.elapsedTime * 5) * 0.08;
  const bg = scene.background, fog = scene.fog, sm = renderer.shadowMap.autoUpdate;
  scene.background = null; scene.fog = null; scene.overrideMaterial = ghostMat;
  renderer.shadowMap.autoUpdate = false; renderer.autoClear = false;
  camera.layers.set(1);
  renderer.render(scene, camera);
  camera.layers.set(0);
  renderer.autoClear = true; renderer.shadowMap.autoUpdate = sm;
  scene.overrideMaterial = null; scene.background = bg; scene.fog = fog;
}
const clock = new THREE.Clock();
let gameOverShown = false;
renderer.setAnimationLoop(() => {
  const frame = Math.min(clock.getDelta(), 0.05);
  const frozen = game.leveling || game.over || game.menu || game.cleared || game.paused;
  if (game.cleared && !clearShown) { clearShown = true; showChapterClear(); }
  const dt = frozen ? 0 : frame;

  if (game.leveling && !ui.isLevelOpen()) {
    ui.showLevelUp(pickUpgrades(3), up => { up.apply(game); game.picks[up.name] = (game.picks[up.name] || 0) + 1; game.leveling = false; checkLevel(); });
  }
  if (game.over && !gameOverShown) { gameOverShown = true; ui.showGameOver(); }

  updateWaves(dt, scene, ui);
  updateEnemies(dt, scene);
  updateCombat(dt, scene);
  animateFlag(tower, clock.elapsedTime);
  updateTower(frame, clock.elapsedTime);
  updateKnights(dt, scene);
  updateFx(dt);
  $('pausebtn').style.display = game.menu || game.over ? 'none' : '';
  updateSidebar();
  rangeRing.scale.set(game.range, 1, game.range);
  controls.update();
  ui.updateHud();
  const sk = shakeStep(frame);
  camera.position.add(sk);
  renderer.render(scene, camera);
  ghostPass();
  camera.position.sub(sk);
  updateBars(camera);
});

initDev(scene);
window.__game = game; // handy for debugging in the console
