import { setDay } from './world.js';
import { setSceneryDay } from './scenery.js';

// Day / night and fullscreen buttons.
const $ = id => document.getElementById(id);
const KEY = 'ftd-day';

export function initDisplay(renderer, composer) {
  const bloom = composer.passes.find(p => 'strength' in p);
  let day = (() => { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } })();
  const apply = () => {                      // looks only: the game plays the same
    setDay(day);
    setSceneryDay(day);
    bloom.strength = day ? 0.22 : 0.55;
    bloom.threshold = day ? 0.95 : 0.85;
    $('daybtn').textContent = day ? '🌙' : '☀';
    $('daybtn').title = day ? 'Switch to night' : 'Switch to day';
  };
  $('daybtn').onclick = () => {
    day = !day;
    try { localStorage.setItem(KEY, day ? '1' : '0'); } catch {}
    apply();
  };
  apply();

  const root = document.documentElement;
  const enter = root.requestFullscreen || root.webkitRequestFullscreen;
  if (!enter || !(document.fullscreenEnabled || document.webkitFullscreenEnabled)) { $('fsbtn').remove(); return; }   // iPhone browsers
  $('fsbtn').onclick = () => {
    if (isFullscreen()) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else Promise.resolve(enter.call(root)).catch(() => {});
  };
  const mark = () => $('fsbtn').classList.toggle('fast', isFullscreen());
  document.addEventListener('fullscreenchange', mark);
  document.addEventListener('webkitfullscreenchange', mark);
}

export const isFullscreen = () => !!(document.fullscreenElement || document.webkitFullscreenElement);
