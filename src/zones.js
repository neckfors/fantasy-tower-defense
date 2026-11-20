import * as THREE from 'three';
import { game, dmgNow } from './game.js';
import { TOWER_R } from './world.js';
import { enemies, isAlive, damageEnemy } from './enemies.js';
import { spark, burst } from './fx.js';
import { tier, GOLD, DIAMOND } from './upgrades-more.js';

// Blizzard (falling snow + slow, slow itself lives in enemies.js) and Spike Wall (ring of spikes hurting melee enemies)
let spikeGroup = null, spikeN = 0, tick = 0;
const spikeMat = new THREE.MeshStandardMaterial({ color: 0x8a8f9a, metalness: 0.3, roughness: 0.5 });
const spikeGeo = new THREE.ConeGeometry(0.28, 1.6, 6);

function buildSpikes(scene) {
  const L = game.spikes;
  spikeMat.color.setHex(tier(L, 0x8a8f9a, GOLD, DIAMOND));
  spikeMat.metalness = tier(L, 0.3, 0.9, 0.6);
  spikeMat.emissive.setHex(tier(L, 0, 0x6a4a00, 0x2ab0d0));
  if (spikeGroup) scene.remove(spikeGroup);
  spikeGroup = new THREE.Group();
  const n = 18 + game.spikes * 8;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2, m = new THREE.Mesh(spikeGeo, spikeMat);
    m.position.set(Math.cos(a) * 5.4, 0.8, Math.sin(a) * 5.4);
    m.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5);   // lean outwards
    m.castShadow = true;
    spikeGroup.add(m);
  }
  scene.add(spikeGroup);
  spikeN = game.spikes;
}

let moatMesh = null, moatN = 0, moatR = 0;
function buildMoat(scene) {
  if (moatMesh) scene.remove(moatMesh);
  const col = tier(game.moat, 0x2a7fd0, 0x2fc46a, 0x9a4cff);
  const w = 2 + game.moat * 1.5;                   // band centred on the range ring
  game.moatIn = game.range - w / 2; game.moatOut = game.range + w / 2;
  moatMesh = new THREE.Mesh(new THREE.RingGeometry(game.moatIn, game.moatOut, 64),
    new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.65, side: THREE.DoubleSide, depthWrite: false }));
  moatMesh.rotation.x = -Math.PI / 2; moatMesh.position.y = 0.09;
  scene.add(moatMesh);
  moatN = game.moat; moatR = game.range;
}

export function updateZones(dt, scene) {
  if (game.moat) {
    if (moatN !== game.moat || moatR !== game.range) buildMoat(scene);
    moatMesh.material.opacity = 0.55 + Math.sin(performance.now() / 400) * 0.08;
    if (Math.random() < dt * 30) {
      const a = Math.random() * Math.PI * 2, r = game.moatIn + Math.random() * (game.moatOut - game.moatIn);
      spark(Math.cos(a) * r, 0.2, Math.sin(a) * r, 0, 1.2, 0, tier(game.moat, 0xbfe6ff, 0xc8ffd8, 0xe6d0ff), 0.5);
    }
  }
  if (game.blizzard) {
    const n = dt * 60 * game.blizzard, c = Math.min(30, Math.floor(n) + (Math.random() < n % 1 ? 1 : 0));
    for (let i = 0; i < c; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * game.range;
      spark(Math.cos(a) * r, 14 + Math.random() * 4, Math.sin(a) * r, (Math.random() - 0.5) * 2, -6, (Math.random() - 0.5) * 2, tier(game.blizzard, 0xdff4ff, 0xffe27a, 0x8ff3ff), 2.2);
    }
  }
  if (game.spikes) {
    if (spikeN !== game.spikes) buildSpikes(scene);
    if ((tick += dt) >= 0.5) {
      tick = 0;
      for (const e of enemies) {
        if (!isAlive(e) || e.t.stop || e.t.fly) continue;
        const p = e.obj.position, d = Math.hypot(p.x, p.z);
        if (d > TOWER_R + 1.3 + e.obj.scale.x * 0.5 + 3.5) continue;
        damageEnemy(e, dmgNow() * 0.4 * game.spikes, true);
        burst(new THREE.Vector3(p.x, 0.8, p.z), 0xc8ccd6, 4, 3, 0.25, 1, -4);
      }
    }
  }
}
