import { game } from './game.js';
import { enemies, isAlive, spawnEnemy, pickType, TYPES } from './enemies.js';
import { openPortals, closePortals, randomPortal, bossPortal } from './portals.js';
import { startCutscene } from './cutscene.js';

const w = { toSpawn: 0, spawnT: 0, breakT: 2, running: false, boss: false, squad: 0, door: null };
export const isBossWave = n => n % 10 === 0;

export function updateWaves(dt, scene, ui) {
  if (!w.running) {
    if ((w.breakT -= dt) <= 0) {
      game.wave++;
      w.toSpawn = 5 + game.wave * 3;
      w.spawnT = 0;
      w.running = true;
      w.boss = isBossWave(game.wave);
      w.squad = 0;
      openPortals(game.wave, w.boss);
      if (!w.boss) ui.banner(`Wave ${game.wave}`);          // boss waves get the cutscene instead
    }
    return;
  }
  const hp = 24 + game.wave * 4;
  if (w.boss) {                                   // boss arrives first, with the usual crowd
    w.boss = false;
    const door = bossPortal();
    startCutscene(spawnEnemy(scene, 'boss', hp * (game.wave / 10), door), door);
    w.spawnT = 1.2;
    return;
  }
  if (w.toSpawn > 0 && (w.spawnT -= dt) <= 0) {
    // enemies march out in squads of 3-5 through the same door, with a pause between squads
    if (w.squad <= 0) { w.squad = 3 + Math.floor(Math.random() * 3); w.door = randomPortal(); }
    spawnEnemy(scene, pickType(game.wave), hp, w.door);
    w.toSpawn--; w.squad--;
    w.spawnT = Math.max(0.35, 1.1 - game.wave * 0.05) * (w.squad > 0 ? 0.6 : 2.2);
  } else if (w.toSpawn === 0 && !enemies.some(isAlive)) {
    w.running = false;
    w.breakT = 4;
    closePortals();
    if (game.mode === 'story' && isBossWave(game.wave)) game.cleared = true;
  }
}

// Developer mode: jump so that the next wave started is `n`
export function jumpToWave(n) { game.wave = n - 1; Object.assign(w, { toSpawn: 0, spawnT: 0, breakT: 0.5, running: false, boss: false, squad: 0 }); closePortals(); }
export { TYPES };
