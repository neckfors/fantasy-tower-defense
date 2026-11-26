import { game, dmgNow } from './game.js';
import { sfx } from './audio.js';
import { enemies, isAlive, damageEnemy } from './enemies.js';
import { castFx, meteor, shake } from './fx.js';
import { compactToggle } from './compact.js';

// In-run Armoury: spend coins (run-only) on consumables and timed buffs. These are different
// from the level-up upgrades, which are permanent for the run.
const inRange = e => isAlive(e) && Math.hypot(e.obj.position.x, e.obj.position.z) <= game.range;
const ITEMS = [
  { icon: '🔧', name: 'Repair Tower', desc: 'Heal 50% of max HP', short: 'Heals half your HP', base: 50, use: g => (g.towerHp = Math.min(g.maxHp, g.towerHp + g.maxHp * 0.5)) },
  { icon: '📯', name: 'Rally Cry', desc: '+50% damage for 30s', short: '+50% damage, 30s', base: 70, timer: 'rallyT', use: g => (g.rallyT = 30) },
  { icon: '🔥', name: 'Rapid Fire', desc: '+100% fire rate for 30s', short: 'Shoot 2× as fast, 30s', base: 70, timer: 'rapidT', use: g => (g.rapidT = 30) },
  { icon: '☄', name: 'Meteor Strike', desc: 'Meteors rain on every enemy in range for 5x damage', short: 'Hits all enemies in range', base: 90, can: () => enemies.some(inRange),
    use: g => enemies.filter(inRange).forEach(e => meteor(e, Math.random() * 0.6, () => { damageEnemy(e, dmgNow() * 5, false, 'heavy'); sfx('boom'); shake(0.35); })) },
  { icon: '❄', name: 'Frost Nova', desc: 'Slow all enemies by 60% for 8s', short: 'Slows all enemies, 8s', base: 60, timer: 'frostT', use: g => (g.frostT = 8) },
  { icon: '🧱', name: 'Barricade', desc: 'Shield that absorbs 200 damage', short: 'Shield: blocks 200 damage', base: 80, use: g => (g.shield = (g.shield || 0) + 200) },
].map(it => ({ ...it, count: 0 }));
const cost = it => Math.round(it.base * (1 + 0.25 * it.count));

const side = document.createElement('div');
side.id = 'side';
side.innerHTML = '<h3>Armoury <span id="sidecoins"></span></h3>';
compactToggle(side, side.firstChild, 'ftd-small-armoury');
const btns = ITEMS.map((it, i) => {
  const b = document.createElement('button');
  b.innerHTML = `<span><small>${i + 1}</small>${it.icon} ${it.name}<i>${it.short}</i></span><b></b>`;
  b.title = it.desc;
  b.onclick = () => buy(it);
  side.appendChild(b);
  return b;
});
const xp = document.getElementById('xp');   // level bar lives under the Armoury
if (xp) side.appendChild(xp);
document.body.appendChild(side);

const canBuy = () => !(game.leveling || game.over || game.menu || game.cleared || game.paused);
function buy(it) {
  if (!canBuy() || (game.coins || 0) < cost(it) || (it.can && !it.can())) return;
  game.coins -= cost(it); it.count++;
  it.use(game);
  castFx(it.name);
  sfx(SND[it.name] || 'levelup');
}
const SND = { 'Repair Tower': 'heal', 'Rally Cry': 'horn', 'Rapid Fire': 'rapid', 'Meteor Strike': 'meteor', 'Frost Nova': 'frost', 'Barricade': 'shield' };
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const i = +e.key - 1;
  if (ITEMS[i]) buy(ITEMS[i]);
});

export function resetArmoury() { ITEMS.forEach(it => (it.count = 0)); }

let last = '';
export function updateSidebar() {
  // redraw only when something on it changed
  const state = [game.menu, game.over, canBuy(), game.coins, ...ITEMS.map(it => `${it.count}:${it.timer ? Math.ceil(game[it.timer] || 0) : ''}`)].join();
  if (state === last) return;
  last = state;
  side.style.display = game.menu || game.over ? 'none' : '';
  document.getElementById('sidecoins').textContent = `🪙 ${game.coins || 0}`;
  ITEMS.forEach((it, i) => {
    const t = it.timer && game[it.timer] > 0 ? ` ${Math.ceil(game[it.timer])}s` : '';
    btns[i].lastChild.textContent = t || `🪙 ${cost(it)}`;
    btns[i].classList.toggle('active', !!t);
    btns[i].disabled = !canBuy() || (game.coins || 0) < cost(it);
  });
}
