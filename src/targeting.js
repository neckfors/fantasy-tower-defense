import { enemies, isAlive } from './enemies.js';

// Shared target choice, so the tower, helpers and Shadow Knights don't waste attacks on each other's prey.
export const distC = e => Math.hypot(e.obj.position.x, e.obj.position.z);
export const dist2 = (a, b) => Math.hypot(a.obj.position.x - b.obj.position.x, a.obj.position.z - b.obj.position.z);
// shots already on the way will kill it
export const doomed = e => (e.incoming || 0) >= e.hp;
// a Shadow Knight is on it: leave it alone while it is fighting it, or while it is still far from the tower
const reserved = e => e.claim && (e.claim.engaged || (e.state === 'walk' && distC(e) > 10));

// Enemies in range, best first: free ones nearest the tower, then knight prey, then already-doomed ones
export function rankTargets(range) {
  return enemies
    .filter(e => isAlive(e) && !e.emerging && distC(e) <= range)
    .map(e => ({ e, k: (doomed(e) ? 2000 : reserved(e) ? 1000 : 0) + distC(e) }))
    .sort((a, b) => a.k - b.k)
    .map(t => t.e);
}

// One target per shot: every shot counts its damage, so later shots move on once a kill is certain
export function pickShots(range, shots, dmg) {
  const list = rankTargets(range), out = [], planned = new Map();
  if (!list.length) return out;
  const need = e => e.hp - (e.incoming || 0) - (planned.get(e) || 0);
  for (let i = 0; i < shots; i++) {
    // spread first (one shot each), double up only when every living target already has one
    const t = list.find(e => !planned.has(e) && need(e) > 0 && !reserved(e))
      || list.find(e => need(e) > 0 && !reserved(e))
      || list.find(e => need(e) > 0) || list[0];
    planned.set(t, (planned.get(t) || 0) + dmg);
    out.push(t);
  }
  return out;
}
