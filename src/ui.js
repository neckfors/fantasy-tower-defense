import { waveFx, levelFx } from './fx.js';
import { game } from './game.js';
import { sfx } from './audio.js';
import { waveLabel, recordEndless, load } from './modes.js';

const $ = id => document.getElementById(id);
let levelOpen = false;
export const isLevelOpen = () => levelOpen;

export function updateHud() {
  $('wave').textContent = `⚔ ${waveLabel()}`;
  $('kills').textContent = `☠ ${game.kills}`;
  $('goldhud').textContent = `🪙 ${game.coins || 0}`;
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

export function showLevelUp(choices, onPick) {
  levelOpen = true;
  sfx('levelup'); levelFx();
  $('lvltitle').textContent = `Level ${game.level}!`;
  const box = $('cards');
  box.innerHTML = '';
  choices.forEach(u => {
    const c = document.createElement('button');
    c.className = 'card';
    c.innerHTML = `<div class="ic">${u.icon}</div><b>${u.name}</b><span>${u.desc}</span>`;
    c.onclick = () => { $('levelup').hidden = true; levelOpen = false; onPick(u); };
    box.appendChild(c);
  });
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
