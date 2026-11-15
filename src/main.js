import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld, animateFlag } from './world.js';
import { loadModels, updateEnemies } from './enemies.js';
import { updateCombat } from './combat.js';
import { updateWaves } from './waves.js';
import { game, checkLevel, pickUpgrades } from './game.js';
import * as ui from './ui.js';
import { initDev } from './dev.js';

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
document.getElementById('load').style.opacity = 0;
setTimeout(() => document.getElementById('load').remove(), 700);

const clock = new THREE.Clock();
let gameOverShown = false;
renderer.setAnimationLoop(() => {
  const frame = Math.min(clock.getDelta(), 0.05);
  const frozen = game.leveling || game.over;
  const dt = frozen ? 0 : frame;

  if (game.leveling && !ui.isLevelOpen()) {
    ui.showLevelUp(pickUpgrades(3), up => { up.apply(game); game.leveling = false; checkLevel(); });
  }
  if (game.over && !gameOverShown) { gameOverShown = true; ui.showGameOver(); }

  updateWaves(dt, scene, ui);
  updateEnemies(dt, scene);
  updateCombat(dt, scene);
  animateFlag(tower, clock.elapsedTime);
  rangeRing.scale.set(game.range, 1, game.range);
  controls.update();
  ui.updateHud();
  renderer.render(scene, camera);
});

initDev(scene);
window.__game = game; // handy for debugging in the console
