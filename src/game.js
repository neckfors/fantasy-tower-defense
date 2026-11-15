// Shared game state + rules (no rendering here)
export const game = {
  wave: 0, towerHp: 500, maxHp: 500,
  dmg: 12, rate: 1.5, range: 26, multi: 1,
  xp: 0, level: 1, xpNeed: 20, kills: 0,
  leveling: false, over: false, picks: {},
};

export function damageTower(n) {
  if (game.over || game.god) return;   // (game.picks counts chosen upgrades by name)
  if (game.wind && game.towerHp - n <= 0) { game.wind = false; game.towerHp = game.maxHp * 0.25; return; }   // Second Wind
  game.towerHp = Math.max(0, game.towerHp - n);
  if (game.towerHp === 0) game.over = true;
}

export function addXp(n) {
  game.xp += n * (game.xpMul || 1);
  checkLevel();
}

export function checkLevel() {
  if (!game.leveling && game.xp >= game.xpNeed) {
    game.xp -= game.xpNeed;
    game.level++;
    game.xpNeed = Math.round(game.xpNeed * 1.35);
    game.leveling = true;
  }
}

export const UPGRADES = [
  { icon: '🏹', name: 'Sharper Arrows', desc: '+25% damage', apply: g => (g.dmg *= 1.25) },
  { icon: '⚡', name: 'Quick Draw', desc: '+20% fire rate', apply: g => (g.rate *= 1.2) },
  { icon: '🔭', name: 'Eagle Eye', desc: '+12% range', apply: g => (g.range *= 1.12) },
  { icon: '🛡', name: 'Reinforced Walls', desc: '+100 max HP and heal 100', apply: g => { g.maxHp += 100; g.towerHp = Math.min(g.maxHp, g.towerHp + 100); } },
  { icon: '🎯', name: 'Volley', desc: '+1 arrow per shot (different targets)', apply: g => (g.multi += 1) },
  { icon: '❤', name: 'Mending Stones', desc: 'Heal 40% of max HP', apply: g => (g.towerHp = Math.min(g.maxHp, g.towerHp + g.maxHp * 0.4)) },
];

export function pickUpgrades(n = 3) {
  const pool = [...UPGRADES];
  const out = [];
  while (out.length < n && pool.length) out.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  return out;
}
