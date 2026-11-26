import { game } from './game.js';
import { load, save } from './modes.js';
import { SHOP } from './shop.js';

// "Start a new dynasty": wipes emeralds, Shop bonuses and story progress, and pays Crowns for it.
// Save keys in 'ftd-save': crowns, treasury (emeralds towards the next Crown), dynBest (best wave since
// the last reset), storyDone (story finished since the last reset).
export const UNLOCK_WAVE = 20;
const WAVES_PER_CROWN = 10, GEMS_PER_CROWN = 100, STORY_CROWNS = 2;

// what each of the first ten Crowns unlocks; every Crown after that gives +5% damage and +5% emeralds
export const REWARDS = [
  'Start each run with 100 coins',
  '15% more emeralds',
  '1 extra reroll in each run',
  'Pick a free upgrade when a run starts',
  'The Armoury is 15% cheaper',
  '15% more damage',
  '25% more tower health',
  'Choose from 4 cards at level-up',
  'A fallen tower rises once per run (25% health)',
  'Your first legendary comes at level 5',
];

export const crowns = () => load().crowns || 0;
// the first time, an Endless record from before dynasties counts too
const dynBest = () => { const s = load(); return s.dynBest ?? s.best ?? 0; };

// called as each wave starts; only runs that began at wave 1 count (a menu-picked later chapter doesn't)
export function recordDynastyWave() { if (game.fromStart && game.wave > dynBest()) save({ dynBest: game.wave }); }

// at the start of a run, after the Shop bonuses (not for the next story chapter: it is the same run)
export function applyCrowns() {
  const n = crowns(), has = k => n >= k, extra = Math.max(0, n - REWARDS.length);
  if (has(1)) game.coins = 100;
  game.gemMul = 1 + (has(2) ? 0.15 : 0) + 0.05 * extra;
  game.runReroll = has(3) ? 1 : 0;
  game.armouryMul = has(5) ? 0.85 : 1;
  game.dmg *= (has(6) ? 1.15 : 1) * (1 + 0.05 * extra);
  if (has(7)) { game.maxHp = Math.round(game.maxHp * 1.25); game.towerHp = game.maxHp; }
  game.extraCard = has(8) ? 1 : 0;
  game.rise = has(9);
  game.earlyLegend = has(10);
  if (has(4)) game.freePick = game.leveling = true;
}

const spentInShop = () => {
  const owned = load().shop || {};
  let sum = 0;
  for (const it of SHOP) for (let l = 0; l < (owned[it.id] || 0); l++) sum += Math.round(it.base * (1 + l * 1.2));
  return sum;
};

// what a reset would give right now
export function offer() {
  const s = load(), best = dynBest(), unspent = s.emeralds || 0, spent = spentInShop();
  const waveCrowns = best >= UNLOCK_WAVE ? Math.floor(best / WAVES_PER_CROWN) : 0;
  const story = s.storyDone ? STORY_CROWNS : 0;
  const pot = (s.treasury || 0) + unspent + spent, gemCrowns = Math.floor(pot / GEMS_PER_CROWN);
  return {
    best, unlocked: best >= UNLOCK_WAVE, unspent, spent, saved: s.treasury || 0, waveCrowns, story, gemCrowns,
    left: pot % GEMS_PER_CROWN, total: waveCrowns + story + gemCrowns, have: s.crowns || 0,
    shopLevels: Object.values(s.shop || {}).reduce((a, b) => a + b, 0), chapter: Math.min(s.unlocked || 1, 5),
  };
}

function startDynasty() {
  const o = offer();
  if (!o.unlocked) return;
  save({ crowns: o.have + o.total, treasury: o.left, emeralds: 0, shop: {}, unlocked: 1, dynBest: 0, storyDone: false });
  location.reload();
}

// ---- menu card and the confirm screen ----
const $ = id => document.getElementById(id);

export function refreshDynastyMenu() {
  const o = offer(), n = o.have;
  $('m-crowns').textContent = n ? `👑 ${n} Crown${n > 1 ? 's' : ''}` : '';
  $('m-dyn').classList.toggle('ready', o.unlocked);
  $('m-dyn').classList.toggle('locked', !o.unlocked);
  $('m-dyn').querySelector('.ic').textContent = o.unlocked ? '👑' : '🔒';
  $('m-dyn-what').textContent = o.unlocked ? 'Start over for Crowns' : `Reach wave ${UNLOCK_WAVE} to unlock`;
  $('m-dyn-state').textContent = o.unlocked ? `+${o.total} Crowns ready` : o.best ? `Best so far: wave ${o.best}` : '';
}

const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

function render() {
  const o = offer(), after = o.have + (o.unlocked ? o.total : 0);
  $('dyntitle').textContent = o.unlocked ? 'Start a new dynasty?' : 'New Dynasty';
  $('dynsub').textContent = o.unlocked ? `Your best run: wave ${o.best}`
    : `Reach wave ${UNLOCK_WAVE} in Endless, or in a Story run from chapter 1. ${o.best ? `Best so far: wave ${o.best}.` : ''}`;
  const gems = [`${o.unspent} unspent`, `${o.spent} spent in the Shop`, o.saved ? `${o.saved} saved earlier` : ''].filter(Boolean).join(' + ');
  $('dynboxes').hidden = !o.unlocked;
  $('dynboxes').innerHTML = `
    <div class="dynbox lose"><b>You lose</b><span>💎 ${plural(o.unspent, 'emerald')}</span><span>🛒 ${plural(o.shopLevels, 'Shop bonus level')}</span><span>🗺 Story progress (chapter ${o.chapter})</span></div>
    <div class="dynbox gain"><b>You gain ${plural(o.total, 'Crown')}</b><span>⚔ ${o.waveCrowns} for your best run</span>${o.story ? `<span>🏆 ${o.story} for finishing the story</span>` : ''}
      <span>💎 ${o.gemCrowns} from the Royal Treasury</span><small>${gems}. ${o.left}/${GEMS_PER_CROWN} stay towards the next one.</small></div>
    <div class="dynbox keep"><b>You keep</b><span>👑 Crowns you already have</span><span>∞ Best Endless wave</span><span>🔊 Sound and display settings</span></div>`;
  $('dynlist').innerHTML = REWARDS.map((text, i) => {
    const n = i + 1, cls = n <= o.have ? 'have' : n <= after ? 'new' : '';
    return `<li class="${cls}"><b>👑 ${n}</b><span>${text}</span><em>${cls === 'have' ? '✔ Yours' : cls === 'new' ? 'New!' : ''}</em></li>`;
  }).join('') + `<li class="${after > REWARDS.length ? 'new' : ''}"><b>👑 11+</b><span>Each: 5% more damage and emeralds</span><em></em></li>`;
  $('dynhold').hidden = $('dynnote').hidden = !o.unlocked;
  $('dynback').firstElementChild.textContent = o.unlocked ? 'Keep playing' : 'Back';
}

export function initDynastyMenu(click) {
  refreshDynastyMenu();
  $('m-dyn').onclick = () => { click(); render(); $('menu').hidden = true; $('dynasty').hidden = false; };
  $('dynback').onclick = () => { click(); $('dynasty').hidden = true; $('menu').hidden = false; };

  // hold for 2 seconds, so a stray tap can't wipe anything
  const btn = $('dynhold');
  let timer = 0;
  const start = () => { if (!timer) { btn.classList.add('holding'); timer = setTimeout(startDynasty, 2000); } };
  const stop = () => { clearTimeout(timer); timer = 0; btn.classList.remove('holding'); };
  btn.onpointerdown = e => { if (e.button === 0) start(); };
  btn.onpointerup = btn.onpointerleave = btn.onpointercancel = btn.onblur = stop;
  btn.onkeydown = e => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) start(); } };
  btn.onkeyup = stop;
  btn.oncontextmenu = e => e.preventDefault();       // a long press on touch screens would open a menu
}
