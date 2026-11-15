import { game, addXp } from './game.js';
import { jumpToWave } from './waves.js';
import { clearEnemies, enemies, isAlive, damageEnemy } from './enemies.js';
import { clearArrows } from './combat.js';

// Hidden developer panel: type "devmode" anywhere (or press F2) to toggle.
export function initDev(scene) {
  const el = document.createElement('div');
  el.style.cssText = 'display:none;position:fixed;left:16px;top:70px;background:#1a1626ee;border:1px solid #c9a24a;border-radius:10px;padding:10px 12px;font:13px Georgia,serif;color:#e8dcc0;z-index:50;flex-direction:column;gap:6px;width:200px';
  el.innerHTML = `<b style="color:#ffd77a">Developer mode</b>
    <label>Wave <input id="dw" type="number" min="1" value="10" style="width:60px"> <button id="dgo">Jump</button></label>
    <button id="dboss">Next boss wave</button>
    <button id="dxp">+1 level of XP</button>
    <button id="dkill">Kill all enemies</button>
    <label><input id="dgod" type="checkbox"> God mode</label>`;
  document.body.append(el);
  const $ = id => el.querySelector('#' + id);
  const go = n => { clearEnemies(scene); clearArrows(scene); jumpToWave(Math.max(1, n | 0)); };
  $('dgo').onclick = () => go(+$('dw').value);
  $('dboss').onclick = () => go(Math.floor(game.wave / 10) * 10 + 10);
  $('dxp').onclick = () => addXp(game.xpNeed);
  $('dkill').onclick = () => enemies.filter(isAlive).forEach(e => damageEnemy(e, 1e9));
  $('dgod').onchange = e => { game.god = e.target.checked; };

  let typed = '';
  addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT') return;
    const toggle = () => { el.style.display = el.style.display === 'none' ? 'flex' : 'none'; };
    if (e.key === 'F2') { e.preventDefault(); toggle(); return; }
    typed = (typed + e.key.toLowerCase()).slice(-7);
    if (typed === 'devmode') toggle();
  });
  window.__dev = { go };
}
