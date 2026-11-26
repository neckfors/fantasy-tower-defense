import * as THREE from 'three';
import { game, dmgNow, rateNow } from './game.js';
import { enemies, isAlive, damageEnemy } from './enemies.js';
import { rankTargets, distC } from './targeting.js';
import { arc, ignite } from './combat.js';
import { burst, ring, shake } from './fx.js';
import { banner } from './ui.js';
import { sfx } from './audio.js';

// The effects of the legendary upgrades that act on their own during a battle.
export const STORM_EVERY = 15, WARP_EVERY = 30, WARP_TIME = 4;
const PHOENIX_R = 20;
const stormMat = new THREE.LineBasicMaterial({ color: 0xd9b8ff });
const BASE = new THREE.Vector3(0, 0.3, 0);

export function updateLegendary(dt, scene) {
  if (!dt || game.over) return;

  if (game.phoenixBurst) {                          // the tower just rose again (see damageTower)
    game.phoenixBurst = false;
    banner('🔥 Phoenix Heart! The tower rises 🔥'); sfx('boom'); shake(1);
    ring(BASE, 0xff7a1a, PHOENIX_R, 0.9); ring(BASE, 0xffd23f, PHOENIX_R * 0.7, 0.6);
    for (let k = 0; k < 6; k++) burst(new THREE.Vector3(0, 3 + k * 2.2, 0), k % 2 ? 0xff7a1a : 0xffd23f, 40, 16, 1.1, 3, -4);
    for (const e of [...enemies]) {
      if (!isAlive(e) || distC(e) > PHOENIX_R) continue;
      ignite(e, dmgNow() * 1.5);
      damageEnemy(e, dmgNow() * 5, false, 'fire');
    }
  }

  if (game.storm) {                                  // Arcane Storm
    game.stormT -= dt;
    if (game.stormT <= 0) {
      const list = rankTargets(game.range);
      if (!list.length) game.stormT = 0.5;           // stays charged until there is something to hit
      else {
        game.stormT = STORM_EVERY;
        // about half a second of the tower's own damage on every enemy in range
        const dmg = Math.max(dmgNow() * 2, dmgNow() * rateNow() * game.multi * 0.5);
        for (const e of list) {
          const p = e.obj.position, hit = new THREE.Vector3(p.x, p.y + 1.2, p.z);
          const sky = new THREE.Vector3(p.x + (Math.random() - 0.5) * 5, 30, p.z + (Math.random() - 0.5) * 5);
          arc(scene, sky, hit, stormMat, 0.35); arc(scene, sky, hit, stormMat, 0.25);
          burst(hit, 0xd9b8ff, 12, 7, 0.4, 1, 0); ring(p, 0xb45cff, 2.5, 0.35);
          damageEnemy(e, dmg, false, 'zap');
        }
        sfx('zap'); sfx('boom'); shake(0.5);
      }
    }
  }

  if (game.warp) {                                   // Time Warp (enemies.js slows them while warpT > 0)
    if (game.warpT > 0) game.warpT = Math.max(0, game.warpT - dt);
    game.warpCd -= dt;
    if (game.warpCd <= 0) {
      if (!rankTargets(game.range).length) game.warpCd = 0.5;
      else {
        game.warpCd = WARP_EVERY; game.warpT = WARP_TIME;
        ring(BASE, 0x5ee0ff, 40, 1.1); ring(BASE, 0xb45cff, 28, 0.9); sfx('frost');
      }
    }
  }

  if (game.titan && game.towerHp > 0) game.towerHp = Math.min(game.maxHp, game.towerHp + game.maxHp * 0.005 * dt);   // Titan Walls repair
}
