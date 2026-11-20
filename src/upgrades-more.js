// Colour by upgrade level: 1 = base, 2 = gold, 3 = diamond.
export const tier = (lvl, a, b, c) => (lvl >= 3 ? c : lvl === 2 ? b : a);
export const GOLD = 0xffc83a, DIAMOND = 0x8ff3ff;
// Extra level-up upgrades. `max` = how many times one can be picked in a run.
export const MORE = [
  { icon: '🧊', name: 'Frost Arrows', desc: 'Arrows slow enemies by 25% per level for 2s', max: 3, apply: g => (g.frostA = (g.frostA || 0) + 1) },
  { icon: '☠', name: 'Poison Tips', desc: 'Arrows poison enemies (stacks up to 5x). Poison spreads when they die', max: 3, apply: g => (g.poison = (g.poison || 0) + 1) },
  { icon: '🌵', name: 'Thorns', desc: 'Enemies that hit the tower take damage back', max: 3, apply: g => (g.thorns = (g.thorns || 0) + 1) },
  { icon: '📚', name: 'Quick Learner', desc: '+25% XP from kills', max: 3, apply: g => (g.xpMul = (g.xpMul || 1) * 1.25) },
  { icon: '🌀', name: 'Ricochet', desc: 'Arrows bounce to +1 more enemy for 60% damage', max: 3, apply: g => (g.ricochet = (g.ricochet || 0) + 1) },
  { icon: '🎯', name: 'Sniper Shot', desc: 'Every 6th arrow deals 3x damage (more often each time)', max: 3, apply: g => (g.sniper = (g.sniper || 0) + 1) },
  { icon: '❄', name: 'Blizzard', desc: 'A snowstorm slows every enemy in range by 15%', max: 3, apply: g => (g.blizzard = (g.blizzard || 0) + 1) },
  { icon: '🔱', name: 'Spike Wall', desc: 'Spikes ring the tower and hurt melee enemies that come close', max: 3, apply: g => (g.spikes = (g.spikes || 0) + 1) },
  { icon: '🧝', name: 'Elf Archer', desc: 'An elf beside the tower fires her own arrows', max: 3, apply: g => (g.elves = (g.elves || 0) + 1) },
  { icon: '🐉', name: 'Baby Dragon', desc: 'A little dragon breathes fire on enemy groups', max: 3, apply: g => (g.dragons = (g.dragons || 0) + 1) },
  { icon: '🍀', name: 'Lucky Charm', desc: '+10% chance for double XP from a kill', max: 3, apply: g => (g.lucky = (g.lucky || 0) + 0.1) },
  { icon: '🔄', name: 'Reroll', desc: 'Reroll your level-up choices once per level', max: 3, apply: g => (g.rerolls = (g.rerolls || 0) + 1) },
  { icon: '🧠', name: 'Wise Tower', desc: 'Your first level-up each wave offers 1 extra choice', max: 3, apply: g => (g.wise = (g.wise || 0) + 1) },
  { icon: '🌊', name: 'Moat', desc: 'A water moat rings the tower and slows walking enemies (slower and wider each level)', max: 3, apply: g => (g.moat = (g.moat || 0) + 1) },
];
