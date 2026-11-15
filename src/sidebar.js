import { game, UPGRADES } from './game.js';
import { sfx } from './audio.js';

// In-run sidebar: spend coins (dropped by enemies) on upgrades that last for this run only.
const ITEMS = [
  ['Mending Stones', 40], ['Sharper Arrows', 60], ['Quick Draw', 60], ['Eagle Eye', 50],
  ['Reinforced Walls', 70], ['Volley', 150], ['Shadow Knights', 120], ['Chain Lightning', 100], ['Fire Arrows', 100],
].map(([n, base]) => ({ up: UPGRADES.find(u => u.name === n), base, count: 0 }));
const cost = it => Math.round(it.base * (1 + 0.4 * it.count));

const side = document.createElement('div');
side.id = 'side';
side.innerHTML = '<h3>Armoury <span id="sidecoins"></span></h3>';
const btns = ITEMS.map((it, i) => {
  const b = document.createElement('button');
  b.innerHTML = `<span><small>${i + 1}</small>${it.up.icon} ${it.up.name}</span><b></b>`;
  b.title = it.up.desc;
  b.onclick = () => buy(it);
  side.appendChild(b);
  return b;
});
document.body.appendChild(side);

const canBuy = () => !(game.leveling || game.over || game.menu || game.cleared);
function buy(it) {
  if (!canBuy() || (game.coins || 0) < cost(it)) return;
  game.coins -= cost(it); it.count++;
  it.up.apply(game);
  game.picks[it.up.name] = (game.picks[it.up.name] || 0) + 1;
  sfx('levelup');
}
addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  const i = +e.key - 1;
  if (ITEMS[i]) buy(ITEMS[i]);
});

export function updateSidebar() {
  side.style.display = game.menu || game.over ? 'none' : '';
  document.getElementById('sidecoins').textContent = `🪙 ${game.coins || 0}`;
  ITEMS.forEach((it, i) => {
    btns[i].lastChild.textContent = `🪙 ${cost(it)}`;
    btns[i].disabled = !canBuy() || (game.coins || 0) < cost(it);
  });
}
