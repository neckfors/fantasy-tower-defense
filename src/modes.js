import { game } from './game.js';
import { setTheme } from './world.js';
import { jumpToWave } from './waves.js';

export const CHAPTERS = [
  { name: 'The Green Marches', intro: 'Peasants and bandits rise against your lonely tower.', ground: 0x4f7a3a, sky: 0x1d2540 },
  { name: 'Ashen Fields', intro: 'Warbands march under a smoky sky.', ground: 0x6b5a3a, sky: 0x3a2a2a },
  { name: 'The Frozen North', intro: 'Trolls stride out of the blizzard.', ground: 0xaab8c8, sky: 0x2a3a52 },
  { name: 'Cursed Bogs', intro: 'Wizards poison the mist.', ground: 0x3d5a3f, sky: 0x1f3a33 },
  { name: 'The Warlord\'s Throne', intro: 'The final stand against the Giant Warlord.', ground: 0x5a2f2f, sky: 0x3a1420 },
];
const KEY = 'ftd-save';
export const load = () => { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; } };
const save = s => { try { localStorage.setItem(KEY, JSON.stringify({ ...load(), ...s })); } catch {} };

export function startMode(scene, mode, chapter = 1) {
  game.mode = mode; game.chapter = chapter;
  const th = CHAPTERS[mode === 'story' ? chapter - 1 : 0];
  setTheme(scene, th);
  if (mode === 'story') jumpToWave((chapter - 1) * 10 + 1);
}
export const waveLabel = () => game.mode === 'story'
  ? `Ch.${game.chapter} · Wave ${(game.wave - 1) % 10 + 1}/10` : `Wave ${game.wave}`;

export function recordEndless() { const b = load().best || 0; if (game.wave > b) save({ best: game.wave }); }
export function chapterCleared() { save({ unlocked: Math.max(load().unlocked || 1, game.chapter + 1) }); }
