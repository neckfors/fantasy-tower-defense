import { game } from './game.js';
import { enemies, isAlive, spawnEnemy, pickType, TYPES } from './enemies.js';

const w = { toSpawn: 0, spawnT: 0, breakT: 2, running: false, boss: false };
export const isBossWave = n => n % 10 === 0;

export function updateWaves(dt, scene, ui) {
  if (!w.running) {
    if ((w.breakT -= dt) <= 0) {
      game.wave++;
      w.toSpawn = 5 + game.wave * 3;
      w.spawnT = 0;
      w.running = true;
      w.boss = isBossWave(game.wave);
      ui.banner(w.boss ? `Wave ${game.wave} - BOSS!` : `Wave ${game.wave}`);
    }
    return;
  }
  const hp = 22 + game.wave * 6;
  if (w.boss) {                                   // boss arrives first, with the usual crowd
    w.boss = false;
    spawnEnemy(scene, 'boss', hp * (game.wave / 10));
  }
  if (w.toSpawn > 0 && (w.spawnT -= dt) <= 0) {
    spawnEnemy(scene, pickType(game.wave), hp);
    w.toSpawn--;
    w.spawnT = Math.max(0.35, 1.1 - game.wave * 0.05);
  } else if (w.toSpawn === 0 && !enemies.some(isAlive)) {
    w.running = false;
    w.breakT = 4;
  }
}

// Developer mode: jump so that the next wave started is `n`
export function jumpToWave(n) { game.wave = n - 1; Object.assign(w, { toSpawn: 0, spawnT: 0, breakT: 0.5, running: false, boss: false }); }
export { TYPES };
