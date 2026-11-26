import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld, animateFlag, onThemeChange } from './world.js';
import { initPortals, updatePortals } from './portals.js';
import { initScenery, themeScenery, updateScenery } from './scenery.js';
import { initPost } from './post.js';
import { initQuality, watchFrame } from './quality.js';
import { updateShots, clearShots } from './shots.js';
import { updateNumbers } from './numbers.js';
import { loadModels, updateEnemies, clearEnemies } from './enemies.js';
import { updateCombat } from './combat.js';
import { updateWaves } from './waves.js';
import { game, checkLevel, pickUpgrades } from './game.js';
import * as ui from './ui.js';
// import { initDev } from './dev.js';      // cheat code off for now
import { initTower, updateTower } from './tower-fx.js';
import { applyShop, nextChapter, emeralds, renderShop } from './shop.js';
import { updateBars } from './hpbars.js';
import { initFx, updateFx, shakeStep, fireworks } from './fx.js';
import { updateKnights } from './knights.js';
import { updateHelpers } from './helpers.js';
import { updateZones } from './zones.js';
import { updateSidebar } from './sidebar.js';
import { sfx, toggleMute, isMuted } from './audio.js';
import { CHAPTERS, startMode, load, chapterCleared } from './modes.js';
import { clearArrows } from './combat.js';
import { applyCrowns, initDynastyMenu } from './dynasty.js';
import { initDisplay, isFullscreen } from './display.js';
import { updateLegendary } from './legendary.js';
import { updatePanel } from './panel.js';
import { initCutscene, updateCutscene } from './cutscene.js';
import { initBossDeath, startBossDeath, updateBossDeath, isBossDying } from './boss-death.js';
import { isLegendaryChoice } from './game.js';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
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

let composer;                              // set up after the models have loaded
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer?.setSize(innerWidth, innerHeight);
});

await loadModels();
initTower(scene, tower);
initFx(scene);
initPortals(scene);
initScenery(scene);
onThemeChange(themeScenery);
themeScenery(0x4f7a3a);
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
// carryOn: the next story chapter of the same run (keeps upgrades; Shop bonuses are already in them)
const begin = (mode, ch, carryOn) => {
  sfx('click'); $('menu').hidden = true; $('chapter').hidden = true;
  clearEnemies(scene); clearArrows(scene); clearShots(); game.cleared = false;
  startMode(scene, mode, ch, carryOn);
  if (carryOn) nextChapter();
  else { game.fromStart = mode === 'endless' || ch === 1; applyShop(); applyCrowns(); }
  game.menu = false;
};
const refreshGold = () => { $('m-gold').textContent = `💎 ${emeralds()}`; };
refreshGold();
initDynastyMenu(() => sfx('click'));
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
const setPause = on => { if (on && (game.menu || game.over || game.leveling || game.cleared || game.cine)) return; game.paused = on; $('pause').hidden = !on; sfx(on ? 'pause' : 'resume'); };
$('pausebtn').onclick = () => setPause(!game.paused);
$('resume').onclick = () => setPause(false);
$('quit').onclick = () => location.reload();
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (e.key === 'p' || e.key === 'P' || (e.key === 'Escape' && !isFullscreen())) setPause(!game.paused);   // in fullscreen, Esc only leaves it
});
// ---- game speed (F / button): the battle is simulated several times per drawn frame ----
const SPEEDS = [1, 2];
let speed = 1;
const nextSpeed = () => {
  speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
  $('speedbtn').textContent = `${speed > 1 ? '⏩' : '▶'} ${speed}×`;
  $('speedbtn').classList.toggle('fast', speed > 1);
  sfx('click');
};
$('speedbtn').onclick = nextSpeed;
addEventListener('keydown', e => {
  if (e.target.tagName !== 'INPUT' && (e.key === 'f' || e.key === 'F')) nextSpeed();
});
let clearShown = false;
function showChapterClear() {
  const ch = game.chapter, last = ch >= CHAPTERS.length;
  chapterCleared(); sfx('win'); sfx('fanfare'); fireworks();
  $('chtitle').textContent = last ? 'Victory! The Warlord is slain' : `Chapter ${ch} cleared!`;
  $('chtext').textContent = last ? 'You have defended the realm. Try Endless mode for a real challenge.' : `Next: ${CHAPTERS[ch].name} - ${CHAPTERS[ch].intro}`;
  const b = $('chbtns'); b.innerHTML = '';
  const add = (t, f) => { const x = document.createElement('button'); x.className = 'card'; x.innerHTML = `<b>${t}</b>`; x.onclick = f; b.append(x); };
  if (!last) add('Next chapter', () => { clearShown = false; begin('story', ch + 1, true); });
  add('Main menu', () => location.reload());
  $('chapter').hidden = false;
}

// shadowy silhouettes: enemies hidden behind the tower/scenery are redrawn as translucent purple shades
const ghostMat = new THREE.MeshBasicMaterial({ color: 0x7a4cff, transparent: true, opacity: 0.5, depthFunc: THREE.GreaterDepth, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -1500 });
function ghostPass() {
  if (game.menu || game.cine) return;
  ghostMat.opacity = 0.42 + Math.sin(clock.elapsedTime * 5) * 0.08;
  const bg = scene.background, fog = scene.fog, sm = renderer.shadowMap.autoUpdate, clear = renderer.autoClear;
  scene.background = null; scene.fog = null; scene.overrideMaterial = ghostMat;
  renderer.shadowMap.autoUpdate = false; renderer.autoClear = false;
  camera.layers.set(1);
  renderer.render(scene, camera);
  camera.layers.set(0);
  renderer.autoClear = clear; renderer.shadowMap.autoUpdate = sm;
  scene.overrideMaterial = null; scene.background = bg; scene.fog = fog;
}
composer = initPost(renderer, scene, camera, ghostPass);
initQuality(renderer, composer, scene);
initDisplay(renderer, composer);
initCutscene(scene, camera, controls);
initBossDeath(scene, camera, controls);
const clock = new THREE.Clock();
let gameOverShown = false;
renderer.setAnimationLoop(() => {
  const raw = clock.getDelta(), frame = Math.min(raw, 0.05);
  watchFrame(raw);
  const frozen = game.leveling || game.over || game.menu || game.cleared || game.paused || game.cine;
  if (game.cleared && !clearShown) { clearShown = true; showChapterClear(); }
  const dt = frozen ? 0 : frame;

  if (game.leveling && !game.cine && !ui.isLevelOpen()) {      // waits for a cutscene to end
    const legend = isLegendaryChoice();       // legendary levels offer 3, and don't use up Wise Tower
    const nPick = legend ? 3 : 3 + (game.extraCard || 0) + ((game.wise || 0) && game.wiseWave !== game.wave ? game.wise : 0);
    if (!legend) game.wiseWave = game.wave;
    ui.showLevelUp(pickUpgrades(nPick), up => { up.apply(game); game.picks[up.name] = (game.picks[up.name] || 0) + 1; game.leveling = game.freePick = false; checkLevel(); }, () => pickUpgrades(nPick));
  }
  if (game.over && !gameOverShown) { gameOverShown = true; ui.showGameOver(); }

  animateFlag(tower, clock.elapsedTime);
  updateTower(frame, clock.elapsedTime);
  for (let i = 0; i < speed; i++) {
    // stop stepping as soon as something pauses the battle (level-up, defeat, chapter cleared)
    const step = i && (game.leveling || game.over || game.cleared || game.cine || game.bossFallen) ? 0 : dt;
    if (i && !step) break;
    updateWaves(step, scene, ui);
    updateEnemies(step, scene);
    updateCombat(step, scene);
    updateLegendary(step, scene);
    updateKnights(step, scene);
    updateHelpers(step, scene);
    updateZones(step, scene);
    updateShots(step);
    updateFx(game.cine ? frame / speed : step);      // effects keep moving during the boss cutscene
  }
  if (game.bossFallen && !game.cine) {
    const fallen = game.bossFallen;
    game.bossFallen = null;
    if (!game.over) startBossDeath(fallen);
  }
  updatePortals(frame);
  updateScenery(frame, clock.elapsedTime);
  const bar = game.menu || game.over ? 'none' : '';
  $('pausebtn').style.display = $('speedbtn').style.display = $('daybtn').style.display = bar;
  if ($('fsbtn')) $('fsbtn').style.display = bar;
  updatePanel();
  updateSidebar();
  rangeRing.scale.set(game.range, 1, game.range);
  if (isBossDying()) updateBossDeath(frame);
  else if (game.cine) updateCutscene(frame);
  else controls.update();
  ui.updateHud();
  const sk = shakeStep(frame);
  camera.position.add(sk);
  composer.render();
  camera.position.sub(sk);
  updateBars(camera);
  updateNumbers(frame, camera);
});

// initDev(scene);                         // cheat code off for now: uncomment both lines to get it back
window.__game = game; // handy for debugging in the console
