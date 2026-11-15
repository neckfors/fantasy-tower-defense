import { game } from './game.js';
import { enemies, isAlive, spawnPeasant } from './enemies.js';

const w = { toSpawn: 0, spawnT: 0, breakT: 2, running: false };

export function updateWaves(dt, scene, ui) {
  if (!w.running) {
    if ((w.breakT -= dt) <= 0) {
      game.wave++;
      w.toSpawn = 5 + game.wave * 3;
      w.spawnT = 0;
      w.running = true;
      ui.banner(`Wave ${game.wave}`);
    }
    return;
  }
  if (w.toSpawn > 0 && (w.spawnT -= dt) <= 0) {
    spawnPeasant(scene, 22 + game.wave * 6);
    w.toSpawn--;
    w.spawnT = Math.max(0.35, 1.1 - game.wave * 0.05);
  } else if (w.toSpawn === 0 && !enemies.some(isAlive)) {
    w.running = false;
    w.breakT = 4;
  }
}

export function resetWaves() { Object.assign(w, { toSpawn: 0, spawnT: 0, breakT: 2, running: false }); }
