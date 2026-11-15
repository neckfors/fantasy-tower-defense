import { game } from './game.js';

// Gold + permanent bonuses, saved in localStorage ('ftd-save': gold, shop)
const KEY = 'ftd-save';
const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const write = o => { try { localStorage.setItem(KEY, JSON.stringify({ ...read(), ...o })); } catch {} };

export const SHOP = [
  { id: 'hp', icon: '🧱', name: 'Stronger Foundations', desc: '+50 starting max HP', max: 5, base: 40 },
  { id: 'dmg', icon: '🗡', name: 'Sharpened Tips', desc: '+5% starting damage', max: 5, base: 50 },
  { id: 'rate', icon: '🏹', name: "Fletcher's Craft", desc: '+5% starting fire rate', max: 5, base: 50 },
  { id: 'range', icon: '🔭', name: 'Far Sight', desc: '+4% starting range', max: 5, base: 40 },
  { id: 'xp', icon: '📖', name: 'Quick Learner', desc: '+8% XP', max: 5, base: 60 },
  { id: 'gold', icon: '💰', name: 'Treasure Hunter', desc: '+10% gold', max: 5, base: 60 },
  { id: 'volley', icon: '🎯', name: 'Early Volley', desc: 'Start with 2 arrows per shot', max: 1, base: 400 },
  { id: 'wind', icon: '💫', name: 'Second Wind', desc: 'Survive one lethal hit per run (back to 25% HP)', max: 1, base: 500 },
];

export const gold = () => read().gold || 0;
export const lvl = id => (read().shop || {})[id] || 0;
export const cost = it => Math.round(it.base * (1 + lvl(it.id) * 1.2));

export function bank(n) {            // called on every kill
  const g = Math.max(1, Math.round(n * (game.goldMul || 1)));
  game.runGold = (game.runGold || 0) + g;
  game.coins = (game.coins || 0) + g;     // in-run coins for the sidebar shop
  write({ gold: gold() + g });
}

export function buy(it) {
  const c = cost(it);
  if (lvl(it.id) >= it.max || gold() < c) return false;
  write({ gold: gold() - c, shop: { ...(read().shop || {}), [it.id]: lvl(it.id) + 1 } });
  return true;
}

export function applyShop() {          // at the start of a run
  const L = lvl;
  game.maxHp += 50 * L('hp'); game.towerHp = game.maxHp;
  game.dmg *= 1 + 0.05 * L('dmg');
  game.rate *= 1 + 0.05 * L('rate');
  game.range *= 1 + 0.04 * L('range');
  game.xpMul = 1 + 0.08 * L('xp');
  game.goldMul = 1 + 0.1 * L('gold');
  if (L('volley')) game.multi = 2;
  game.wind = !!L('wind');
  game.runGold = 0; game.coins = 0;
}

export function renderShop(el, onChange) {
  el.querySelector('.shopgold').textContent = `💰 ${gold()} gold`;
  const list = el.querySelector('.shoplist'); list.innerHTML = '';
  for (const it of SHOP) {
    const l = lvl(it.id), maxed = l >= it.max, c = cost(it);
    const b = document.createElement('button');
    b.className = 'card shopitem';
    b.disabled = maxed || gold() < c;
    b.innerHTML = `<div class="ic">${it.icon}</div><b>${it.name}</b><span>${it.desc}</span><span class="lv">${it.max > 1 ? `Level ${l}/${it.max}` : (l ? 'Owned' : '')}</span><span class="pr">${maxed ? 'MAX' : `💰 ${c}`}</span>`;
    b.onclick = () => { if (buy(it)) { renderShop(el, onChange); onChange?.(); } };
    list.appendChild(b);
  }
}
