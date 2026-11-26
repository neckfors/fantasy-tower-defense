// Keeps the game smooth: if frames stay slow, the picture is turned down one step at a time.
// If even the lowest step is no faster, the screen itself is capped: full quality comes back.
const LEVELS = [
  { ratio: 1.5, bloom: true, shadow: 2048 },
  { ratio: 1, bloom: true, shadow: 1024 },
  { ratio: 0.85, bloom: false, shadow: 1024 },
  { ratio: 0.7, bloom: false, shadow: 0 },
];
let level = 0, time = 0, frames = 0, before = 0, done = false, apply = () => {};

export function initQuality(renderer, composer, scene) {
  const bloom = composer.passes.find(p => p.strength !== undefined);
  const sun = scene.children.find(o => o.isDirectionalLight);
  // the glow is soft anyway, so it is worked out at half size
  const size = bloom.setSize.bind(bloom);
  bloom.setSize = (w, h) => size(Math.round(w / 2), Math.round(h / 2));
  apply = () => {
    const q = LEVELS[level], ratio = Math.min(devicePixelRatio, q.ratio);
    renderer.setPixelRatio(ratio); renderer.setSize(innerWidth, innerHeight);
    composer.setPixelRatio(ratio); composer.setSize(innerWidth, innerHeight);
    bloom.enabled = q.bloom;
    sun.castShadow = !!q.shadow;
    if (q.shadow && sun.shadow.mapSize.x !== q.shadow) {
      sun.shadow.mapSize.set(q.shadow, q.shadow);
      sun.shadow.map?.dispose(); sun.shadow.map = null;
    }
  };
  apply();
}

// raw = real seconds since the last frame; judged over 3-second stretches
export function watchFrame(raw) {
  if (done || document.hidden || raw > 0.25) return;      // tab switches and loading hiccups don't count
  time += raw; frames++;
  if (time < 3) return;
  const fps = frames / time;
  if (fps < 48 && level < LEVELS.length - 1) {
    if (!level) before = fps;
    level++; apply();
  } else if (fps < 48 && fps < before * 1.15) { level = 0; done = true; apply(); }
  time = frames = 0;
}
