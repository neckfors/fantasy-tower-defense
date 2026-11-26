import * as THREE from 'three';

export const SPAWN_R = 35;
export const TOWER_R = 3.2;

let groundMesh, themeSky, sceneRef, hemi, sun, torch, stars, sunDisc;
let day = false, theme = { ground: 0x4f7a3a, sky: 0x1d2540 };
const onTheme = [];
export const onThemeChange = fn => onTheme.push(fn);

// soft round glow, used for light pools on the ground
let soft;
export function softTexture() {
  if (soft) return soft;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d'), g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, '#fff'); g.addColorStop(0.5, '#fff6'); g.addColorStop(1, '#fff0');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  return (soft = new THREE.CanvasTexture(c));
}

// mottled near-white texture, tinted by the material colour
function noiseTexture(repeat) {
  const c = document.createElement('canvas'); c.width = c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#e6e6e6'; x.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const v = 190 + Math.floor(Math.random() * 66), r = 1 + Math.random() * (i < 120 ? 22 : 4);
    const px = Math.random() * 256, py = Math.random() * 256;
    x.fillStyle = `rgba(${v},${v},${v},${i < 120 ? 0.35 : 0.75})`;
    for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) { x.beginPath(); x.arc(px + dx, py + dy, r, 0, 6.29); x.fill(); }   // seamless
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat, repeat);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// gradient sky with stars: horizon matches the fog, darker overhead
function buildSky(scene) {
  themeSky = { horizon: { value: new THREE.Color(0x1d2540) }, top: { value: new THREE.Color(0x070a18) } };
  const dome = new THREE.Mesh(new THREE.SphereGeometry(190, 32, 20), new THREE.ShaderMaterial({
    uniforms: themeSky, side: THREE.BackSide, depthWrite: false, fog: false,
    vertexShader: 'varying vec3 vP; void main() { vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'uniform vec3 horizon, top; varying vec3 vP; void main() { gl_FragColor = vec4(mix(horizon, top, smoothstep(0.0, 0.45, normalize(vP).y)), 1.0); }',
  }));
  dome.renderOrder = -1;
  scene.add(dome);
  const pts = [];
  for (let i = 0; i < 700; i++) {
    const v = new THREE.Vector3().randomDirection(); v.y = Math.abs(v.y) * 0.9 + 0.06;
    pts.push(v.normalize().multiplyScalar(180));
  }
  stars = new THREE.Points(new THREE.BufferGeometry().setFromPoints(pts),
    new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.4, sizeAttenuation: false, transparent: true, opacity: 0.8, fog: false }));
  scene.add(stars);
  sunDisc = new THREE.Sprite(new THREE.SpriteMaterial({ map: softTexture(), color: new THREE.Color(0xfff2c0).multiplyScalar(2), transparent: true, depthWrite: false, fog: false }));
  sunDisc.position.set(-90, 38, -140); sunDisc.scale.setScalar(30); sunDisc.visible = false;
  scene.add(sunDisc);
}

// chapter look: ground colour + sky/fog colour
export function setTheme(scene, { ground, sky }) {
  sceneRef = scene; theme = { ground, sky };
  groundMesh.material.color.setHex(ground);
  paintSky();
  onTheme.forEach(fn => fn(ground));
}

export function setDay(on) { day = on; paintSky(); }

// by night the chapter's sky colour; by day a bright sky that keeps a hint of it
function paintSky() {
  const night = new THREE.Color(theme.sky);
  const horizon = night.clone(), top = night.clone().multiplyScalar(0.22);
  if (day) {
    const hint = night.clone().multiplyScalar(1 / Math.max(night.r, night.g, night.b));
    horizon.setHex(0xb4d4ee).lerp(hint, 0.22);
    top.setHex(0x3f7fd0).lerp(hint, 0.12);
  }
  sceneRef.background.copy(horizon);
  sceneRef.fog.color.copy(horizon);
  sceneRef.fog.near = day ? 65 : 45; sceneRef.fog.far = day ? 160 : 110;
  themeSky.horizon.value.copy(horizon);
  themeSky.top.value.copy(top);
  stars.visible = !day; sunDisc.visible = day;
  hemi.color.setHex(day ? 0xdcecff : 0xbcd0ff); hemi.groundColor.setHex(day ? 0x7a7550 : 0x2a3a22); hemi.intensity = day ? 1.5 : 0.9;
  sun.color.setHex(day ? 0xfff6e4 : 0xffe2b0); sun.intensity = day ? 2.9 : 2.2;
  torch.intensity = day ? 8 : 40;
}

export function buildWorld(scene, renderer) {
  scene.background = new THREE.Color(0x1d2540);
  scene.fog = new THREE.Fog(0x1d2540, 45, 110);

  sceneRef = scene;
  hemi = new THREE.HemisphereLight(0xbcd0ff, 0x2a3a22, 0.9);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffe2b0, 2.2);
  sun.position.set(-25, 40, 20);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 120 });
  scene.add(sun);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  buildSky(scene);

  // ground: big grass disc
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(80, 64).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x4f7a3a, roughness: 1, map: noiseTexture(14) }));
  ground.receiveShadow = true;
  scene.add(ground);
  groundMesh = ground;

  // dirt courtyard around the tower
  const dirt = new THREE.Mesh(
    new THREE.CircleGeometry(9, 48).rotateX(-Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x8a7556, roughness: 1, map: noiseTexture(3) }));
  dirt.position.y = 0.02; dirt.receiveShadow = true;
  scene.add(dirt);

  // spawn circle: ring of glowing standing stones
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x77798a, roughness: 0.9 });
  const glow = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xc9a24a).multiplyScalar(1.8) });
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    if ([0, 1, 7].includes(i % 8)) continue;       // leave room for the six magic doors (at 30 + n*60 degrees)
    const h = 1 + Math.random() * 0.8;
    const s = new THREE.Mesh(new THREE.BoxGeometry(0.8, h, 0.6), stoneMat);
    s.position.set(Math.cos(a) * (SPAWN_R + 3), h / 2, Math.sin(a) * (SPAWN_R + 3));
    s.rotation.y = -a + (Math.random() - 0.5) * 0.3;
    s.castShadow = s.receiveShadow = true;
    scene.add(s);
    const rune = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.25, 0.05), glow);
    rune.position.set(0, h * 0.3, 0.33); s.add(rune);
  }

  // scattered rocks and trees (simple procedural)
  const trunk = new THREE.MeshStandardMaterial({ color: 0x5a3d26 });
  const leaf = new THREE.MeshStandardMaterial({ color: 0x2f6b34, flatShading: true });
  for (let i = 0; i < 60; i++) {
    const a = Math.random() * Math.PI * 2, r = SPAWN_R + 8 + Math.random() * 35;
    const t = new THREE.Group();
    const k = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.45, 2, 6), trunk); k.position.y = 1;
    const c1 = new THREE.Mesh(new THREE.ConeGeometry(2, 4, 7), leaf); c1.position.y = 4;
    const c2 = new THREE.Mesh(new THREE.ConeGeometry(1.5, 3, 7), leaf); c2.position.y = 6;
    [k, c1, c2].forEach(m => { m.castShadow = true; t.add(m); });
    t.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    t.scale.setScalar(0.8 + Math.random() * 0.8);
    scene.add(t);
  }

  const tower = buildTower();
  scene.add(tower);
  return tower;
}

function buildTower() {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x8b8fa3, roughness: 0.95, flatShading: true });
  const dark = new THREE.MeshStandardMaterial({ color: 0x6b6f80, roughness: 0.95, flatShading: true });
  const roofM = new THREE.MeshStandardMaterial({ color: 0x5b3f8f, roughness: 0.6, flatShading: true });
  const add = (geo, mat, y) => { const m = new THREE.Mesh(geo, mat); m.position.y = y; m.castShadow = m.receiveShadow = true; g.add(m); return m; };

  add(new THREE.CylinderGeometry(4.4, 5, 1.2, 10), dark, 0.6);                 // base
  add(new THREE.CylinderGeometry(3.2, 3.8, 9, 10), stone, 5.7);                // body
  add(new THREE.CylinderGeometry(4.2, 3.4, 1.2, 10), dark, 10.8);              // top ledge
  for (let i = 0; i < 10; i++) {                                               // battlements
    const a = (i / 10) * Math.PI * 2;
    const m = add(new THREE.BoxGeometry(1.1, 1.1, 1.1), stone, 12);
    m.position.x = Math.cos(a) * 3.8; m.position.z = Math.sin(a) * 3.8; m.rotation.y = -a;
  }
  add(new THREE.CylinderGeometry(2.6, 2.8, 2.4, 10), stone, 12.2);             // turret
  add(new THREE.CylinderGeometry(2.9, 2.9, 0.25, 10), roofM, 13.5);            // open platform (the sorcerer stands here)
  add(new THREE.CylinderGeometry(0.08, 0.08, 3.6, 5), dark, 15.2).position.x = 2.5;   // flag pole
  const flag = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.8, 8, 1),
    new THREE.MeshStandardMaterial({ color: 0xc23b3b, side: THREE.DoubleSide }));
  flag.position.set(3.25, 16.4, 0); flag.userData.flag = true; g.add(flag);
  g.userData.flag = flag;

  // door + glowing windows
  const doorM = new THREE.MeshStandardMaterial({ color: 0x4a3220 });
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.6, 0.5), doorM);
  door.position.set(0, 2.1, 3.7); g.add(door);
  const winM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xffc766).multiplyScalar(1.7) });
  for (const [y, a] of [[7, 0.5], [8.5, -0.9], [7.5, 2.2]]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1, 0.3), winM);
    w.position.set(Math.sin(a) * 3.35, y, Math.cos(a) * 3.35); w.rotation.y = a; g.add(w);
  }
  torch = new THREE.PointLight(0xffa24a, 40, 14); torch.position.set(0, 4, 4.5); g.add(torch);
  return g;
}

export function animateFlag(tower, t) {
  const f = tower.userData.flag, p = f.geometry.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    p.setZ(i, Math.sin(t * 5 + x * 3) * 0.12 * (x + 0.7));
  }
  p.needsUpdate = true;
}
