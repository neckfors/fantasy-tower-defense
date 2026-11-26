import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Pass } from 'three/addons/postprocessing/Pass.js';

// Picture pipeline: scene -> hidden-enemy silhouettes -> bloom (glow on magic and fire) -> tone mapping.
class OverlayPass extends Pass {
  constructor(draw) { super(); this.draw = draw; this.needsSwap = false; }
  render(renderer, writeBuffer, readBuffer) {      // draws on top of the scene, keeping its depth
    renderer.setRenderTarget(readBuffer);
    this.draw();
  }
}

export function initPost(renderer, scene, camera, overlay) {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer, new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 2 }));
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new OverlayPass(overlay));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.55, 0.45, 0.85));
  composer.addPass(new OutputPass());
  composer.setPixelRatio(renderer.getPixelRatio());
  composer.setSize(innerWidth, innerHeight);
  return composer;
}
