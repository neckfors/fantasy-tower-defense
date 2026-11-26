import * as THREE from 'three';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// A KayKit character is 6-9 separate pieces, each costing its own draw call (three times over: picture,
// shadow, silhouette). This joins the wanted pieces into one mesh, built once per look.
const cache = new Map();

export function mergedModel(key, source, wanted) {
  if (cache.has(key)) return cache.get(key);
  const root = clone(source);
  root.updateMatrixWorld(true);
  const meshes = [];
  root.traverse(n => { if (n.isMesh) meshes.push(n); });
  const parts = meshes.filter(m => wanted(m.name));
  const base = parts.find(m => m.isSkinnedMesh);
  const { skeleton, bindMatrix } = base;
  const geos = parts.map(m => {
    if (m.isSkinnedMesh) return plain(m.geometry);
    // a hat, cape or weapon hanging on a bone: rewrite it as skin that follows only that bone
    let bone = m.parent;
    const local = m.matrix.clone();
    while (bone && !skeleton.bones.includes(bone)) { local.premultiply(bone.matrix); bone = bone.parent; }
    const i = skeleton.bones.indexOf(bone);
    const to = bindMatrix.clone().invert().multiply(skeleton.boneInverses[i].clone().invert()).multiply(local);
    const g = plain(m.geometry, i);
    return g.applyMatrix4(to);
  });
  const mesh = new THREE.SkinnedMesh(mergeGeometries(geos), base.material);
  mesh.name = 'merged';
  base.parent.add(mesh);
  mesh.position.copy(base.position); mesh.quaternion.copy(base.quaternion); mesh.scale.copy(base.scale);
  mesh.bind(skeleton, bindMatrix);
  meshes.forEach(m => m.removeFromParent());
  cache.set(key, root);
  return root;
}

// the same attributes in the same number format, so the pieces can be joined
function plain(src, bone) {
  const g = new THREE.BufferGeometry(), count = src.attributes.position.count;
  const copy = (name, size, Type, get) => {
    const a = new Type(count * size);
    for (let v = 0; v < count; v++) for (let c = 0; c < size; c++) a[v * size + c] = get(v, c);
    g.setAttribute(name, new THREE.BufferAttribute(a, size));
  };
  const from = name => (v, c) => src.attributes[name].getComponent
    ? src.attributes[name].getComponent(v, c)
    : src.attributes[name][['getX', 'getY', 'getZ', 'getW'][c]](v);
  copy('position', 3, Float32Array, from('position'));
  copy('normal', 3, Float32Array, from('normal'));
  copy('uv', 2, Float32Array, from('uv'));
  copy('skinIndex', 4, Uint16Array, bone === undefined ? from('skinIndex') : (v, c) => (c ? 0 : bone));
  copy('skinWeight', 4, Float32Array, bone === undefined ? from('skinWeight') : (v, c) => (c ? 0 : 1));
  g.setIndex(src.index ? Array.from(src.index.array) : [...Array(count).keys()]);
  return g;
}
