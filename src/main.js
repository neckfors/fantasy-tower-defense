import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildWorld, animateFlag } from './world.js';
import { loadModels, spawnPeasant, updateEnemies, enemies } from './enemies.js';

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
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

await loadModels();
document.getElementById('load').style.opacity = 0;
setTimeout(() => document.getElementById('load').remove(), 700);

const clock = new THREE.Clock();
let spawnT = 0;
const countEl = document.getElementById('count');
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  if ((spawnT -= dt) <= 0 && enemies.length < 25) { spawnPeasant(scene); spawnT = 1.2; }
  updateEnemies(dt, scene);
  animateFlag(tower, t);
  controls.update();
  countEl.textContent = `Peasants: ${enemies.length}`;
  renderer.render(scene, camera);
});
