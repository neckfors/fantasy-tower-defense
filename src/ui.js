import { waveFx, levelFx } from './fx.js';
import { game } from './game.js';
import { sfx } from './audio.js';
import { pickStars } from './upgrades-more.js';
import { waveLabel, recordEndless, load } from './modes.js';

const $ = id => document.getElementById(id);
let levelOpen = false;
export const isLevelOpen = () => levelOpen;

export function updateHud() {
  $('wave').textContent = `⚔ ${waveLabel()}`;
  $('kills').textContent = `☠ ${game.kills}`;
  $('goldhud').textContent = `🪙 ${game.coins || 0}`;
  const gems = `💎 ${game.gems || 0}`, found = game.runEmeralds ? `+${game.runEmeralds} this run` : 'emeralds';
  if ($('gems').textContent !== gems) $('gems').textContent = gems;
  if ($('gemrun').textContent !== found) $('gemrun').textContent = found;
  $('hpfill').style.width = `${(game.towerHp / game.maxHp) * 100}%`;
  $('hptext').textContent = `${Math.ceil(game.towerHp)} / ${game.maxHp}`;
  $('xpfill').style.width = `${(game.xp / game.xpNeed) * 100}%`;
  $('lvl').textContent = `Level ${game.level}`;
}

export function banner(text) {
  const b = $('banner');
  b.textContent = text;
  sfx(text.includes('BOSS') ? 'boss' : 'wave'); waveFx(text.includes('BOSS'));
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}

export function showLevelUp(choices, onPick, again) {
  levelOpen = true;
  sfx('levelup'); levelFx();
  $('lvltitle').textContent = `Level ${game.level}!`;
  let left = game.rerolls || 0;
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
      c.onclick = () => { $('levelup').hidden = true; levelOpen = false; onPick(u); };
      box.appendChild(c);
    });
    if (left > 0) {
      const r = document.createElement('button');
      r.className = 'card'; r.style.width = '120px'; r.style.justifyContent = 'center';
      r.innerHTML = `<div class="ic">🔄</div><b>Reroll</b><span>${left} left</span>`;
      r.onclick = () => { left--; sfx('levelup'); render(again()); };
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
