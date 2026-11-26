import { game, UPGRADES, LEGENDARY, nextLegendary } from './game.js';
import { stars } from './upgrades-more.js';
import { compactToggle } from './compact.js';

// "Your power": how strong the tower is, on the left. Collapsed on small screens; tap the title to open.
const el = document.createElement('div');
el.id = 'power';
el.innerHTML = '<button id="powerhead">Your power <i></i></button><div id="powerbody"></div>';
document.body.appendChild(el);
const head = el.querySelector('#powerhead'), body = el.querySelector('#powerbody');
if (innerWidth < 900 || innerHeight < 560) el.classList.add('closed');
head.onclick = () => el.classList.toggle('closed');
compactToggle(el, el.insertBefore(document.createElement('div'), body), 'ftd-small-power');

const BASE = { dmg: 12, rate: 1.5, range: 26 };       // a tower without any bonus
const pct = (now, base) => `+${Math.max(0, Math.round((now / base - 1) * 100))}%`;

let last = '';
export function updatePanel() {
  const hide = !!(game.menu || game.over);
  const state = [hide, game.dmg, game.rate, game.range, game.multi, game.level, JSON.stringify(game.picks)].join();
  if (state === last) return;
  last = state;
  el.hidden = hide;
  if (hide) return;
  const stat = (icon, name, v) => `<span title="${name}">${icon}<em> ${name}</em></span><b>${v}</b>`;
  const owned = u => game.picks[u.name];
  const legends = LEGENDARY.filter(owned)
    .map(u => `<div class="pu leg" title="${u.desc}"><span>${u.icon}</span><span class="n">${u.name}</span><span>✦</span></div>`);
  const ups = UPGRADES.filter(u => u.name !== 'Mending Stones' && owned(u))
    .map(u => `<div class="pu" title="${u.desc}"><span>${u.icon}</span><span class="n">${u.name}</span>${u.max ? stars(owned(u), u.max) : `<span class="x">×${owned(u)}</span>`}</div>`);
  const next = nextLegendary();
  body.innerHTML = `<div class="pstats">${stat('🗡', 'Damage', pct(game.dmg, BASE.dmg))}${stat('⚡', 'Fire rate', pct(game.rate, BASE.rate))}${stat('🔭', 'Range', pct(game.range, BASE.range))}${stat('🎯', 'Bolts per cast', game.multi)}</div>`
    + (next ? `<div class="pnext${next === game.level + 1 ? ' soon' : ''}">✦ Next legendary: level ${next}</div>` : '')
    + legends.join('') + ups.join('');
}
