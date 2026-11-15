import { game } from './game.js';

const $ = id => document.getElementById(id);
let levelOpen = false;
export const isLevelOpen = () => levelOpen;

export function updateHud() {
  $('wave').textContent = `⚔ Wave ${game.wave}`;
  $('kills').textContent = `☠ ${game.kills}`;
  $('hpfill').style.width = `${(game.towerHp / game.maxHp) * 100}%`;
  $('hptext').textContent = `${Math.ceil(game.towerHp)} / ${game.maxHp}`;
  $('xpfill').style.width = `${(game.xp / game.xpNeed) * 100}%`;
  $('lvl').textContent = `Level ${game.level}`;
}

export function banner(text) {
  const b = $('banner');
  b.textContent = text;
  b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}

export function showLevelUp(choices, onPick) {
  levelOpen = true;
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
  $('goinfo').textContent = `You held out to wave ${game.wave} with ${game.kills} kills.`;
  $('gameover').hidden = false;
}
$('restart').onclick = () => location.reload();
