import { game } from './game.js';
import { stars } from './upgrades-more.js';
import { resetArmoury } from './sidebar.js';
import { addRange } from './game.js';

// Coins = this run only (spent in the Armoury sidebar). Emeralds = rare drops, saved forever,
// spent in the menu Shop on permanent bonuses. Save key 'ftd-save': emeralds, shop.
const KEY = 'ftd-save';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = o => { try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...o })); } catch {} };

export const SHOP = [
  { id: 'hp', icon: '🧱', name: 'Stronger Foundations', desc: '+50 starting max HP', max: 5, base: 3 },
  { id: 'dmg', icon: '🗡', name: 'Sharpened Tips', desc: '+5% starting damage', max: 5, base: 4 },
  { id: 'rate', icon: '🏹', name: "Fletcher's Craft", desc: '+5% starting fire rate', max: 5, base: 4 },
  { id: 'range', icon: '🔭', name: 'Far Sight', desc: '+4% starting range', max: 5, base: 3 },
  { id: 'xp', icon: '📖', name: 'Quick Learner', desc: '+8% XP', max: 5, base: 5 },
  { id: 'gold', icon: '💎', name: 'Gem Hunter', desc: '+2% emerald drop chance', max: 5, base: 5 },
  { id: 'volley', icon: '🎯', name: 'Early Volley', desc: 'Start with 2 arrows per shot', max: 1, base: 25 },
  { id: 'wind', icon: '💫', name: 'Second Wind', desc: 'Survive one lethal hit per run (back to 25% HP)', max: 1, base: 30 },
];

export const emeralds = () => read().emeralds || 0;
export const lvl = id => (read().shop || {})[id] || 0;
export const cost = it => Math.round(it.base * (1 + lvl(it.id) * 1.2));

export function addCoins(n) { game.coins = (game.coins || 0) + n; }

// rare emerald drop: chance grows with enemy xp; the boss always drops several
export function rollEmerald(e, onDrop) {
  const boss = e.type === 'boss';
  const chance = 0.03 + e.t.xp / 400 + 0.02 * lvl('gold');
  if (!boss && Math.random() > chance) return;
  const n = boss ? 5 : 1;
  write({ emeralds: emeralds() + n });
  game.gems = emeralds();
  game.runEmeralds = (game.runEmeralds || 0) + n;
  onDrop?.(n);
}

export function buy(it) {
  const c = cost(it);
  if (lvl(it.id) >= it.max || emeralds() < c) return false;
  write({ emeralds: emeralds() - c, shop: { ...(read().shop || {}), [it.id]: lvl(it.id) + 1 } });
  return true;
}

export function applyShop() {          // at the start of a run
  const L = lvl;
  game.maxHp += 50 * L('hp'); game.towerHp = game.maxHp;
  game.dmg *= 1 + 0.05 * L('dmg');
  game.rate *= 1 + 0.05 * L('rate');
  addRange(game, 1 + 0.04 * L('range'));
  game.xpMul = 1 + 0.08 * L('xp');
  if (L('volley')) game.multi = 2;
  game.wind = !!L('wind');
  game.coins = 0; game.runEmeralds = 0; game.gems = emeralds();
  game.rallyT = game.rapidT = game.frostT = game.shield = 0;
  resetArmoury();
}

// next story chapter: same run (upgrades kept), fresh tower and spells. Shop bonuses are already applied.
export function nextChapter() {
  game.towerHp = game.maxHp;
  game.rallyT = game.rapidT = game.frostT = game.shield = 0;
}

export function renderShop(el, onChange) {
  el.querySelector('.shopgold').textContent = `💎 ${emeralds()} emeralds`;
  const list = el.querySelector('.shoplist'); list.innerHTML = '';
  for (const it of SHOP) {
    const l = lvl(it.id), maxed = l >= it.max, c = cost(it);
    const b = document.createElement('button');
    b.className = 'card shopitem';
    b.disabled = maxed || emeralds() < c;
    b.innerHTML = `<div class="ic">${it.icon}</div><b>${it.name}</b><span>${it.desc}</span>${stars(l, it.max)}<span class="pr">${maxed ? 'MAX' : `💎 ${c}`}</span>`;
    b.onclick = () => { if (buy(it)) { renderShop(el, onChange); onChange?.(); } };
    list.appendChild(b);
  }
}
