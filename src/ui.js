import { waveFx, levelFx } from './fx.js';
import { game, nextLegendary } from './game.js';
import { sfx } from './audio.js';
import { pickStars } from './upgrades-more.js';
import { waveLabel, recordEndless, load } from './modes.js';

const $ = id => document.getElementById(id);
let levelOpen = false;
export const isLevelOpen = () => levelOpen;

const shown = {};
const text = (id, v) => { if (shown[id] !== v) $(id).textContent = shown[id] = v; };
const width = (id, v) => { if (shown[id] !== v) $(id).style.width = shown[id] = v; };
export function updateHud() {
  text('wave', `⚔ ${waveLabel()}`);
  text('kills', `☠ ${game.kills}`);
  text('goldhud', `🪙 ${game.coins || 0}`);
  text('gems', `💎 ${game.gems || 0}`);
  text('gemrun', game.runEmeralds ? `+${game.runEmeralds} this run` : 'emeralds');
  width('hpfill', `${((game.towerHp / game.maxHp) * 100).toFixed(1)}%`);
  text('hptext', `${Math.ceil(game.towerHp)} / ${game.maxHp}`);
  width('xpfill', `${((game.xp / game.xpNeed) * 100).toFixed(1)}%`);
  const next = nextLegendary(), soon = next === game.level + 1;
  text('lvl', !next ? `Level ${game.level}` : soon ? `Level ${game.level} · ✦ Legendary next!` : `Level ${game.level} · ✦ Legendary at ${next}`);
  if (shown.soon !== soon) $('xp').classList.toggle('soon', (shown.soon = soon));
}

export function banner(text) {
  const b = $('banner');
  b.textContent = text;
  sfx(text.includes('BOSS') ? 'boss' : 'wave'); waveFx(text.includes('BOSS'));
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}

export function showLevelUp(choices, onPick, again) {
  levelOpen = true;
  const legend = !!choices[0]?.legendary;
  sfx(legend ? 'fanfare' : 'levelup'); levelFx();
  $('levelup').classList.toggle('legend', legend);
  $('lvltitle').textContent = legend ? '✦ LEGENDARY CHOICE ✦' : game.freePick ? '👑 Free upgrade' : `Level ${game.level}!`;
  const next = nextLegendary();
  $('lvlsub').textContent = legend ? `Level ${game.level} — choose one. Each can be taken only once.`
    : 'Choose an upgrade for your tower' + (!next ? '' : next === game.level + 1 ? ' · ✦ Your next level is legendary!' : ` · ✦ Next legendary at level ${next}`);
  // rerolls from upgrades come back every level-up and are used first; the Crown one is once per run
  let left = legend ? 0 : (game.rerolls || 0) + (game.runReroll || 0);
  const box = $('cards');
  const render = list => {
    box.innerHTML = '';
    list.forEach(u => {
      const c = document.createElement('button');
      c.className = 'card';
      const own = game.picks[u.name] || 0, instant = u.name === 'Mending Stones';
      const badge = instant ? '<em class="badge inst">Instant</em>' : own ? '<em class="badge up">Upgrade</em>' : '<em class="badge">New</em>';
      const level = instant ? '' : u.max
        ? `${pickStars(own, u.max)}<small class="lv">${own ? `You have level ${own} → get level ${own + 1}` : "You don't have this yet"}</small>`
        : `<small class="lv">${own ? `You have ×${own} → get ×${own + 1}` : "You don't have this yet"}</small>`;
      c.innerHTML = `${badge}<div class="ic">${u.icon}</div><b>${u.name}</b><span>${u.desc}</span>${level}`;
      if (u.legendary) {
        c.className = 'card legcard';
        c.innerHTML = `<div class="legin"><em class="legtag">Legendary</em><div class="ic">${u.icon}</div><b>${u.name}</b><span>${u.desc}</span></div>`;
      }
      c.onclick = () => { $('levelup').hidden = true; levelOpen = false; onPick(u); };
      box.appendChild(c);
    });
    if (left > 0) {
      const r = document.createElement('button');
      r.className = 'card'; r.style.width = '120px'; r.style.justifyContent = 'center';
      r.innerHTML = `<div class="ic">🔄</div><b>Reroll</b><span>${left} left</span>`;
      r.onclick = () => { if (left <= (game.runReroll || 0)) game.runReroll--; left--; sfx('levelup'); render(again()); };
      box.appendChild(r);
    }
  };
  render(choices);
  $('levelup').hidden = false;
}

export function showGameOver() {
  sfx('over');
  recordEndless();
  const best = load().best;
  $('goinfo').textContent = `You held out to ${waveLabel()} with ${game.kills} kills and found ${game.runEmeralds || 0} emeralds.` + (game.mode === 'endless' ? ` Best: wave ${best}.` : '');
  $('gameover').hidden = false;
}
$('restart').onclick = () => location.reload();
