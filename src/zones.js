import * as THREE from 'three';
import { game, dmgNow } from './game.js';
import { TOWER_R } from './world.js';
import { enemies, isAlive, damageEnemy } from './enemies.js';
import { spark, burst } from './fx.js';

// Blizzard (falling snow + slow, slow itself lives in enemies.js) and Spike Wall (ring of spikes hurting melee enemies)
let spikeGroup = null, spikeN = 0, tick = 0;
const spikeMat = new THREE.MeshStandardMaterial({ color: 0x8a8f9a, metalness: 0.3, roughness: 0.5 });
const spikeGeo = new THREE.ConeGeometry(0.28, 1.6, 6);

function buildSpikes(scene) {
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

export function updateZones(dt, scene) {
  if (game.blizzard) {
    const n = dt * 60 * game.blizzard, c = Math.min(30, Math.floor(n) + (Math.random() < n % 1 ? 1 : 0));
    for (let i = 0; i < c; i++) {
      const a = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * game.range;
      spark(Math.cos(a) * r, 14 + Math.random() * 4, Math.sin(a) * r, (Math.random() - 0.5) * 2, -6, (Math.random() - 0.5) * 2, 0xdff4ff, 2.2);
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
