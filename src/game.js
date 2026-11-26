import { MORE } from './upgrades-more.js';
// Shared game state + rules (no rendering here)
export const game = {
  wave: 0, towerHp: 500, maxHp: 500,
  dmg: 12, rate: 1.5, range: 26, multi: 1,
  xp: 0, level: 1, xpNeed: 20, kills: 0,
  leveling: false, over: false, picks: {},
};

// how far the late-game ramp has come: enemies get tougher for every wave after 10 (see modes.js for chapter starts)
export const wavesPast = () => Math.max(0, game.wave - (game.rampFrom ?? 10));

export function damageTower(n) {
  if (game.over || game.god) return;   // (game.picks counts chosen upgrades by name)
  if (game.shield > 0) { const a = Math.min(game.shield, n); game.shield -= a; n -= a; game.shieldFlash = 0.15; if (n <= 0) return; }   // Barricade
  if (game.wind && game.towerHp - n <= 0) { game.wind = false; game.towerHp = game.maxHp * 0.25; return; }   // Second Wind
  if (game.rise && game.towerHp - n <= 0) { game.rise = false; game.towerHp = game.maxHp * 0.25; return; }   // ninth Crown
  if (game.phoenix && game.towerHp - n <= 0) { game.phoenix = false; game.towerHp = game.maxHp * 0.5; game.phoenixBurst = true; return; }   // Phoenix Heart
  game.towerHp = Math.max(0, game.towerHp - n);
  if (game.towerHp === 0) game.over = true;
}

export const MAX_RANGE = 33;   // just inside the portals
export const addRange = (g, mul) => (g.range = Math.min(MAX_RANGE, g.range * mul));

export const dmgNow = () => game.dmg * (game.rallyT > 0 ? 1.5 : 1);   // Rally Cry buff
export const rateNow = () => game.rate * (game.rapidT > 0 ? 2 : 1);   // Rapid Fire buff

export function addXp(n) {
  game.xp += n * (game.xpMul || 1) * (Math.random() < (game.lucky || 0) ? 2 : 1);
  checkLevel();
}

export function checkLevel() {
  if (!game.leveling && game.xp >= game.xpNeed) {
    game.xp -= game.xpNeed;
    game.level++;
    game.xpNeed = Math.round(game.xpNeed * 1.22);
    game.leveling = true;
    if (isLegendaryLevel(game.level) && game.picks['Phoenix Heart']) game.phoenix = true;   // a used Phoenix Heart comes back
  }
}

export const UPGRADES = [...MORE,
  { icon: '🏹', name: 'Sharper Arrows', desc: '+25% damage', apply: g => (g.dmg *= 1.25) },
  { icon: '⚡', name: 'Quick Draw', desc: '+20% fire rate', apply: g => (g.rate *= 1.2) },
  { icon: '🔭', name: 'Eagle Eye', desc: '+8% range and +5% damage', max: 3, apply: g => { addRange(g, 1.08); g.dmg *= 1.05; } },
  { icon: '🛡', name: 'Reinforced Walls', desc: '+100 max HP and heal 100', apply: g => { g.maxHp += 100; g.towerHp = Math.min(g.maxHp, g.towerHp + 100); } },
  { icon: '🎯', name: 'Volley', desc: '+1 magic bolt per cast (spreads over several enemies)', apply: g => (g.multi += 1) },
  { icon: '👻', name: 'Shadow Knights', desc: '+1 shadow knight that leaves the tower and fights enemies', max: 3, apply: g => (g.knights = (g.knights || 0) + 1) },
  { icon: '🌩', name: 'Tesla Coil', desc: 'A Tesla coil on the tower zaps the nearest enemy and chains lightning to 2/3/4 more', max: 3, apply: g => (g.tesla = (g.tesla || 0) + 1) },
  { icon: '🔥', name: 'Fire Arrows', desc: 'Arrows set enemies on fire (burn damage over 3s)', max: 3, apply: g => (g.fire = (g.fire || 0) + 1) },
  { icon: '🏰', name: 'Ballista', desc: 'A heavy bolt hits the toughest enemy for 4x damage every 4s (stacks faster)', max: 3, apply: g => (g.ballista = (g.ballista || 0) + 1) },
  { icon: '💥', name: 'Critical Strikes', desc: '+15% chance for arrows to deal 2.5x damage', max: 3, apply: g => (g.crit = (g.crit || 0) + 0.15) },
  { icon: '❤', name: 'Mending Stones', desc: 'Heal 40% of max HP', apply: g => (g.towerHp = Math.min(g.maxHp, g.towerHp + g.maxHp * 0.4)) },
];

// Legendary upgrades: each can be taken once, offered only at levels 10, 20, 30, 40...
export const LEGENDARY = [
  { icon: '🌩', name: 'Arcane Storm', desc: 'Every 15 s, lightning strikes every enemy in range', apply: g => { g.storm = true; g.stormT = 3; } },
  { icon: '🔥', name: 'Phoenix Heart', desc: 'A fallen tower rises with half its health and burns nearby enemies. Recharges every 10 levels', apply: g => (g.phoenix = true) },
  { icon: '🧙', name: 'Twin Sorcerer', desc: 'A second wizard joins you on the tower, dealing 40% of your damage', apply: g => (g.twin = true) },
  { icon: '⏳', name: 'Time Warp', desc: 'Every 30 s, enemies nearly stop for 4 s', apply: g => { g.warp = true; g.warpCd = 3; g.warpT = 0; } },
  { icon: '👑', name: 'Golden Age', desc: '+50% coins and +25% XP', apply: g => { g.coinMul = 1.5; g.xpMul = (g.xpMul || 1) * 1.25; } },
  { icon: '🏯', name: 'Titan Walls', desc: '+50% max health, and the tower slowly repairs itself', apply: g => { const add = Math.round(g.maxHp * 0.5); g.maxHp += add; g.towerHp += add; g.titan = true; } },
].map(u => ({ ...u, legendary: true }));

export const isLegendaryLevel = n => (n >= 10 && n % 10 === 0) || (n === 5 && !!game.earlyLegend);   // tenth Crown: level 5 too
const legendLeft = () => LEGENDARY.filter(u => !game.picks[u.name]);
export const isLegendaryChoice = () => isLegendaryLevel(game.level) && legendLeft().length > 0;
// the next level that will offer a legendary, or 0 when all are taken
export function nextLegendary() {
  if (!legendLeft().length) return 0;
  let n = game.level + 1;
  while (!isLegendaryLevel(n)) n++;
  return n;
}

export function pickUpgrades(n = 3) {
  const pool = isLegendaryChoice() ? legendLeft() : UPGRADES.filter(u => !u.max || (game.picks[u.name] || 0) < u.max);
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
