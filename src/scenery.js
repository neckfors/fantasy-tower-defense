import * as THREE from 'three';
import { softTexture } from './world.js';
import { portalAngles } from './portals.js';
import { spark } from './fx.js';

// Decoration around the arena: dirt roads from the doors, grass tufts, braziers and fireflies.
const braziers = [];
let grass, day = false;
export const setSceneryDay = on => (day = on);

export function initScenery(scene) {
  // roads from every door to the courtyard, soft at the edges
  const road = new THREE.MeshStandardMaterial({ color: 0x8a7556, roughness: 1, alphaMap: roadAlpha(), transparent: true, depthWrite: false });
  for (const a of portalAngles()) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 28).rotateX(-Math.PI / 2), road);
    m.position.set(Math.cos(a) * 22, 0.035, Math.sin(a) * 22);
    m.rotation.y = Math.PI / 2 - a;
    m.receiveShadow = true;
    scene.add(m);
  }

  // grass tufts (one instanced mesh), kept off the roads and courtyard
  const N = 2600, dummy = new THREE.Object3D(), shade = new THREE.Color();
  const blade = new THREE.ConeGeometry(0.09, 0.55, 3).translate(0, 0.27, 0);
  grass = new THREE.InstancedMesh(blade, new THREE.MeshStandardMaterial({ roughness: 1 }), N);
  const angles = portalAngles();
  for (let i = 0; i < N; i++) {
    let x, z;
    do {
      const a = Math.random() * Math.PI * 2, r = 9.8 + Math.sqrt(Math.random()) * 45;
      x = Math.cos(a) * r; z = Math.sin(a) * r;
    } while (angles.some(a => Math.abs(x * Math.sin(a) - z * Math.cos(a)) < 2.8 && x * Math.cos(a) + z * Math.sin(a) > 0));
    dummy.position.set(x, 0, z);
    dummy.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 6.28, (Math.random() - 0.5) * 0.5);
    dummy.scale.setScalar(0.6 + Math.random() * 0.9);
    dummy.updateMatrix();
    grass.setMatrixAt(i, dummy.matrix);
    grass.setColorAt(i, shade.setScalar(0.75 + Math.random() * 0.5));
  }
  scene.add(grass);

  // braziers between the roads
  const iron = new THREE.MeshStandardMaterial({ color: 0x2c2a30, roughness: 0.6, metalness: 0.3, flatShading: true });
  const coal = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff7a1a).multiplyScalar(2.2) });
  angles.forEach((angle, i) => {
    const a = angle + Math.PI / 6, p = new THREE.Vector3(Math.cos(a) * 9.4, 0, Math.sin(a) * 9.4);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.3, 1.5, 6), iron); post.position.set(p.x, 0.75, p.z);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.3, 0.4, 8), iron); bowl.position.set(p.x, 1.65, p.z);
    const fire = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), coal); fire.position.set(p.x, 1.86, p.z); fire.scale.y = 0.6;
    post.castShadow = bowl.castShadow = true;
    scene.add(post, bowl, fire);
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(7, 7).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: 0xff8a2a, map: softTexture(), transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.set(p.x, 0.13, p.z);
    scene.add(glow);
    braziers.push({ p, glow: glow.material, phase: i * 2.1 });
  });
}

// grass takes its colour from the chapter's ground
export function themeScenery(ground) {
  grass?.material.color.setHex(ground).multiplyScalar(1.25);
}

function roadAlpha() {
  const c = document.createElement('canvas'); c.width = 64; c.height = 256;
  const x = c.getContext('2d');
  x.fillStyle = '#000'; x.fillRect(0, 0, 64, 256);
  for (let i = 0; i < 900; i++) {
    const px = 32 + (Math.random() - 0.5) * 34, py = Math.random() * 256;
    x.fillStyle = `rgba(255,255,255,${0.12 + Math.random() * 0.2})`;
    x.beginPath(); x.arc(px, py, 3 + Math.random() * 8, 0, 6.29); x.fill();
  }
  return new THREE.CanvasTexture(c);
}

export function updateScenery(dt, t) {
  for (const b of braziers) {
    b.glow.opacity = (0.24 + Math.sin(t * 9 + b.phase) * 0.04 + Math.sin(t * 23 + b.phase) * 0.03) * (day ? 0.2 : 1);
    if (Math.random() < dt * 22) spark(b.p.x + (Math.random() - 0.5) * 0.5, 1.95, b.p.z + (Math.random() - 0.5) * 0.5, 0, 1.2 + Math.random(), 0, Math.random() < 0.6 ? 0xff7a1a : 0xffc850, 0.6);
  }
  if (!day && Math.random() < dt * 5) {             // fireflies, at night only
    const a = Math.random() * 6.28, r = 12 + Math.random() * 30;
    spark(Math.cos(a) * r, 0.6 + Math.random() * 3, Math.sin(a) * r, Math.random() - 0.5, (Math.random() - 0.3) * 0.5, Math.random() - 0.5, 0xd8ff8a, 2.8);
  }
}
