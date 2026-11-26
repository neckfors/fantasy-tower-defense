// Colour by upgrade level: 1 = base, 2 = gold, 3 = diamond.
export const tier = (lvl, a, b, c) => (lvl >= 3 ? c : lvl === 2 ? b : a);
export const GOLD = 0xffc83a, DIAMOND = 0x8ff3ff;
// Upgrade level shown as stars: n filled out of max.
export const stars = (n, max) => `<span class="stars" aria-label="Level ${n} of ${max}">${'★'.repeat(n)}<i>${'☆'.repeat(max - n)}</i></span>`;
// On a level-up card: gold = levels you own, green blinking = the one you get by picking it.
export const pickStars = (own, max) => `<span class="stars" aria-label="You have level ${own} of ${max}">${'★'.repeat(own)}<em>★</em><i>${'☆'.repeat(Math.max(0, max - own - 1))}</i></span>`;
// Extra level-up upgrades. `max` = how many times one can be picked in a run.
export const MORE = [
  { icon: '🧊', name: 'Frost Arrows', desc: 'Arrows slow enemies by 25% per level for 2s', max: 3, apply: g => (g.frostA = (g.frostA || 0) + 1) },
  { icon: '☠', name: 'Poison Tips', desc: 'Shots poison enemies (stacks 5x). Poison jumps to nearby enemies and bursts on death', max: 3, apply: g => (g.poison = (g.poison || 0) + 1) },
  { icon: '🌵', name: 'Thorns', desc: 'Enemies that hit the tower take damage back', max: 3, apply: g => (g.thorns = (g.thorns || 0) + 1) },
  { icon: '📚', name: 'Quick Learner', desc: '+25% XP from kills', max: 3, apply: g => (g.xpMul = (g.xpMul || 1) * 1.25) },
  { icon: '🌀', name: 'Ricochet', desc: 'Arrows bounce to +1 more enemy for 60% damage', max: 3, apply: g => (g.ricochet = (g.ricochet || 0) + 1) },
  { icon: '💘', name: 'Sniper Shot', desc: 'Every 6th / 5th / 4th shot deals 3x damage', max: 3, apply: g => (g.sniper = (g.sniper || 0) + 1) },
  { icon: '❄', name: 'Blizzard', desc: 'A snowstorm slows every enemy in range by 15%', max: 3, apply: g => (g.blizzard = (g.blizzard || 0) + 1) },
  { icon: '🔱', name: 'Spike Wall', desc: 'Spikes ring the tower and hurt melee enemies that come close', max: 3, apply: g => (g.spikes = (g.spikes || 0) + 1) },
  { icon: '🧝', name: 'Elf Archer', desc: '+1 elf archer beside the tower; all elves hit harder', max: 3, apply: g => (g.elves = (g.elves || 0) + 1) },
  { icon: '🐉', name: 'Baby Dragon', desc: '+1 little dragon; all dragons throw bigger, hotter, faster fireballs', max: 3, apply: g => (g.dragons = (g.dragons || 0) + 1) },
  { icon: '🍀', name: 'Lucky Charm', desc: '+10% chance for double XP from a kill', max: 3, apply: g => (g.lucky = (g.lucky || 0) + 0.1) },
  { icon: '🔄', name: 'Reroll', desc: '+1 reroll of your choices at every level-up', max: 3, apply: g => (g.rerolls = (g.rerolls || 0) + 1) },
  { icon: '🧠', name: 'Wise Tower', desc: 'Your first level-up each wave offers 1 extra choice', max: 3, apply: g => (g.wise = (g.wise || 0) + 1) },
  { icon: '🌊', name: 'Moat', desc: 'A water moat rings the tower and slows walking enemies (slower and wider each level)', max: 3, apply: g => (g.moat = (g.moat || 0) + 1) },
];
