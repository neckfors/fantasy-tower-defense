import { game, UPGRADES, LEGENDARY, nextLegendary } from './game.js';
import { crowns } from './dynasty.js';
import { stars } from './upgrades-more.js';
import { compactToggle } from './compact.js';
import { STORM_EVERY, WARP_EVERY, WARP_TIME } from './legendary.js';

// "Your power": how strong the tower is, on the left. Collapsed on small screens; tap the title to open.
const el = document.createElement('div');
el.id = 'power';
el.innerHTML = '<button id="powerhead">Your power <i></i></button><div id="powerlegs"></div><div id="powerbody"></div>';
document.body.appendChild(el);
const head = el.querySelector('#powerhead'), body = el.querySelector('#powerbody'), legs = el.querySelector('#powerlegs');
if (innerWidth < 900 || innerHeight < 560) el.classList.add('closed');
head.onclick = () => el.classList.toggle('closed');
compactToggle(el, el.insertBefore(document.createElement('div'), legs), 'ftd-small-power');

const BASE = { dmg: 12, rate: 1.5, range: 26 };       // a tower without any bonus
const pct = (now, base) => `+${Math.max(0, Math.round((now / base - 1) * 100))}%`;

// what an owned legendary is doing right now: [text, style, how charged it is (0-1)]
function status(name) {
  const timer = (left, every) => left <= 0.5 ? ['Ready', 'ready', 1] : [`⏳ ${Math.ceil(left)}s`, 'wait', Math.max(0, 1 - left / every)];
  if (name === 'Arcane Storm') return timer(game.stormT, STORM_EVERY);
  if (name === 'Time Warp') return game.warpT > 0 ? [`Active ${Math.ceil(game.warpT)}s`, 'active', game.warpT / WARP_TIME] : timer(game.warpCd, WARP_EVERY);
  if (name === 'Phoenix Heart') return game.phoenix ? ['Ready', 'ready', 1] : [`Used ↻ lv ${nextLegendary()}`, 'used', 0];
  return ['On', 'on', 0];
}
function updateLegs(list) {
  const html = list.map(u => {
    const [text, cls, full] = status(u.name);
    return `<div class="pu leg ${cls}" title="${u.desc}" style="--full:${Math.round(full * 50) * 2}%"><span>${u.icon}</span><span class="n">${u.name}</span><span class="st">${text}</span></div>`;
  }).join('');
  if (html !== lastLegs) legs.innerHTML = lastLegs = html;
}

let last = '', lastLegs = '';
export function updatePanel() {
  const hide = !!(game.menu || game.over);
  el.hidden = hide;
  if (!hide) updateLegs(LEGENDARY.filter(u => game.picks[u.name]));
  const state = [hide, game.dmg, game.rate, game.range, game.multi, game.level, JSON.stringify(game.picks)].join();
  if (state === last) return;
  last = state;
  if (hide) return;
  const stat = (icon, name, v) => `<span title="${name}">${icon}<em> ${name}</em></span><b>${v}</b>`;
  const owned = u => game.picks[u.name];
  const ups = UPGRADES.filter(u => u.name !== 'Mending Stones' && owned(u))
    .map(u => `<div class="pu" title="${u.desc}"><span>${u.icon}</span><span class="n">${u.name}</span>${u.max ? stars(owned(u), u.max) : `<span class="x">×${owned(u)}</span>`}</div>`);
  const next = nextLegendary();
  body.innerHTML = `<div class="pstats">${stat('🗡', 'Damage', pct(game.dmg, BASE.dmg))}${stat('⚡', 'Fire rate', pct(game.rate, BASE.rate))}${stat('🔭', 'Range', pct(game.range, BASE.range))}${stat('🎯', 'Bolts per cast', game.multi)}</div>`
    + (next ? `<div class="pnext${next === game.level + 1 ? ' soon' : ''}">✦ Next legendary: level ${next}</div>` : '')
    + (crowns() ? `<div class="pu" title="Crowns from earlier dynasties"><span>👑</span><span class="n">Crowns</span><span class="x">×${crowns()}</span></div>` : '')
    + ups.join('');
}
