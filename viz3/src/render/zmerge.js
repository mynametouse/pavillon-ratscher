// ---------- merge static meshes by material (few draw calls) ----------
// Variant-tagged meshes (A = tower, B = ladder) go into buckets of their variant. A shared mesh whose bucket (material, shadow, phase) also exists
// in a variant is copied into both variants' buckets, so the visible variant still draws each material/phase in one call.
// Movable buildings (plan view) are merged per building, in the building's own frame, and the merged meshes stay children of its root group.
import * as THREE from 'three';
import { scene, VARIANT } from '../core/head.js';
import { MAT } from '../core/mats.js';
import { sky } from '../garden/env.js';
import { WORKS } from '../garden/workshop.js';
(function () {
  const skip = new Set();
  Object.values(window.DOORS).forEach(d => d.group && d.group.traverse(o => skip.add(o)));
  if (window.WORKS && WORKS.noMerge) for (const g of WORKS.noMerge) g.traverse(o => skip.add(o));
  const varOf = o => {
    for (let a = o; a; a = a.parent) if (a.userData && a.userData.var) return a.userData.var;
    return null;
  };
  const rootOf = o => {
    for (let a = o.parent; a; a = a.parent) if (a.userData && (a.userData.bldRoot || a.userData.mergeRoot)) return a;
    return null;
  }; // movable building or built-in furniture item
  const invOf = new Map(),
    toRoot = r => {
      if (!invOf.has(r)) invOf.set(r, r.matrixWorld.clone().invert());
      return invOf.get(r);
    };
  const meshes = [];
  scene.updateMatrixWorld(true);
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || skip.has(o) || o === window.stoveGlow || o.userData.noMerge || o.userData.glb)
      return;
    if (!o.geometry.attributes.uv || !o.geometry.attributes.normal) return;
    if (o.geometry.attributes.position.count > 30000) return;
    meshes.push(o);
  });
  const matsOf = o => (Array.isArray(o.material) ? o.material : [o.material]);
  const groupsOf = (o, g) =>
    Array.isArray(o.material) && g.groups.length
      ? g.groups
      : [{ start: 0, count: g.attributes.position.count, materialIndex: 0 }];
  const baseKey = (o, m) =>
    m.uuid +
    (o.castShadow ? 'c' : 'n') +
    (o.renderOrder || 0) +
    '|' +
    (o.userData.ph ?? '') +
    '|' +
    (o.userData.phEnd ?? '') +
    '|' +
    ((r => (r ? r.userData.bldRoot || r.userData.mergeRoot : ''))(rootOf(o)) || '');
  const varKeys = new Set();
  for (const o of meshes) {
    if (!varOf(o)) continue;
    const ms = matsOf(o);
    const gs = Array.isArray(o.material) && o.geometry.groups.length ? o.geometry.groups : [{ materialIndex: 0 }];
    for (const gr of gs) if (ms[gr.materialIndex]) varKeys.add(baseKey(o, ms[gr.materialIndex]));
  }
  const buckets = new Map();
  const kill = [];
  for (const o of meshes) {
    const g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(),
      rt = rootOf(o);
    g.applyMatrix4(rt ? toRoot(rt).clone().multiply(o.matrixWorld) : o.matrixWorld);
    const mats = matsOf(o),
      v = varOf(o);
    for (const gr of groupsOf(o, g)) {
      const m = mats[gr.materialIndex];
      if (!m) continue;
      const bk = baseKey(o, m);
      const Pa = g.attributes.position.array,
        Na = g.attributes.normal.array,
        Ua = g.attributes.uv.array;
      for (const t of v ? [v] : varKeys.has(bk) ? ['A', 'B'] : ['']) {
        const key = bk + '|' + t;
        if (!buckets.has(key))
          buckets.set(key, {
            m,
            cast: o.castShadow,
            ro: o.renderOrder || 0,
            ph: o.userData.ph,
            phEnd: o.userData.phEnd,
            v: t,
            root: rt,
            p: [],
            n: [],
            u: [],
          });
        const b = buckets.get(key);
        b.p.push(Pa.subarray(gr.start * 3, (gr.start + gr.count) * 3));
        b.n.push(Na.subarray(gr.start * 3, (gr.start + gr.count) * 3));
        b.u.push(Ua.subarray(gr.start * 2, (gr.start + gr.count) * 2));
      }
    }
    kill.push(o);
  }
  for (const o of kill) o.parent.remove(o);
  const cat = arrs => {
    let L = 0;
    for (const a of arrs) L += a.length;
    const out = new Float32Array(L);
    let k = 0;
    for (const a of arrs) {
      out.set(a, k);
      k += a.length;
    }
    return out;
  };
  for (const b of buckets.values()) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(cat(b.p), 3));
    g.setAttribute('normal', new THREE.BufferAttribute(cat(b.n), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(cat(b.u), 2));
    g.computeBoundingSphere();
    const me = new THREE.Mesh(g, b.m);
    me.castShadow = b.cast;
    me.receiveShadow = true;
    me.renderOrder = b.ro;
    me.matrixAutoUpdate = false;
    me.userData.merged = true;
    if (b.ph !== undefined) me.userData.ph = b.ph;
    if (b.phEnd !== undefined) me.userData.phEnd = b.phEnd;
    if (b.v) {
      me.userData.var = b.v;
      me.visible = b.v === VARIANT;
    }
    (b.root || scene).add(me);
  }
  window.MERGED = { removed: kill.length, buckets: buckets.size };
})();
// occluder export for the sky-visibility bake (opaque static geometry near the house, only what is visible: active variant)
window.exportOccluders = function (bounds = [-2, 6.2, -2, 6.2, -0.1, 9]) {
  const out = [];
  scene.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  const shown = o => {
    for (let a = o; a; a = a.parent) if (!a.visible) return false;
    return true;
  };
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o === sky || !shown(o)) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    if (
      ms.some(
        m =>
          m.transparent ||
          m === MAT.glass ||
          m === MAT.paper ||
          m === MAT.paperOG ||
          m === MAT.steel ||
          m.userData.leaf ||
          m.alphaTest > 0
      )
    )
      return;
    if (o.userData.door) return;
    let isDoor = false;
    o.traverseAncestors(a => {
      if (a.userData.door) isDoor = true;
    });
    if (isDoor) return;
    const g = o.geometry,
      p = g.attributes.position,
      idx = g.index;
    const n = idx ? idx.count : p.count;
    if (n > 600000) return;
    for (let i = 0; i < n; i++) {
      v.fromBufferAttribute(p, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld);
      out.push(v.x, v.y, v.z);
    }
  });
  // filter triangles to bounds (three coords -> site: x, -z, y)
  const res = [];
  for (let i = 0; i < out.length; i += 9) {
    let inside = false;
    for (let k = 0; k < 9; k += 3) {
      const x = out[i + k],
        y = -out[i + k + 2],
        z = out[i + k + 1];
      if (x > bounds[0] && x < bounds[1] && y > bounds[2] && y < bounds[3] && z > bounds[4] && z < bounds[5])
        inside = true;
    }
    if (inside) for (let k = 0; k < 9; k++) res.push(out[i + k]);
  }
  return new Float32Array(res);
};
// geometry with colours for the global-illumination bake (test/gi.py): triangles of opaque static geometry near the house plus each
// triangle's diffuse albedo (linear RGB: material colour × mean colour of its texture)
window.exportGI = function (bounds) {
  const S2L = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const avg = new Map();
  const texMean = t => {
    const im = t && t.image;
    if (!im || !(im.width > 0)) return null;
    if (avg.has(im)) return avg.get(im);
    let r = null;
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 16;
      const q = c.getContext('2d');
      q.drawImage(im, 0, 0, 16, 16);
      const d = q.getImageData(0, 0, 16, 16).data;
      const s = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4)
        for (let k = 0; k < 3; k++)
          s[k] += t.colorSpace === THREE.SRGBColorSpace ? S2L(d[i + k] / 255) : d[i + k] / 255;
      r = s.map(v => v / 256);
    } catch (e) {
      r = null;
    }
    avg.set(im, r);
    return r;
  };
  const tris = [],
    alb = [];
  scene.updateMatrixWorld(true);
  const v = new THREE.Vector3();
  const shown = o => {
    for (let a = o; a; a = a.parent) if (!a.visible) return false;
    return true;
  };
  const inB = (x, y, z) =>
    x > bounds[0] && x < bounds[1] && y > bounds[2] && y < bounds[3] && z > bounds[4] && z < bounds[5];
  scene.traverse(o => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || o === sky || !shown(o)) return;
    const ms = Array.isArray(o.material) ? o.material : [o.material];
    if (
      ms.some(
        m =>
          m.transparent ||
          m === MAT.glass ||
          m === MAT.paper ||
          m === MAT.paperOG ||
          m.userData.leaf ||
          m.alphaTest > 0 ||
          !m.isMeshStandardMaterial
      )
    )
      return;
    if (o.userData.door) return;
    let isDoor = false;
    o.traverseAncestors(a => {
      if (a.userData.door) isDoor = true;
    });
    if (isDoor) return;
    const m = ms[0],
      mm = texMean(m.map) || [1, 1, 1],
      col = [m.color.r * mm[0], m.color.g * mm[1], m.color.b * mm[2]].map(x => Math.min(0.95, x));
    const g = o.geometry,
      p = g.attributes.position,
      idx = g.index;
    const n = idx ? idx.count : p.count;
    if (n > 900000) return;
    const t = [];
    for (let i = 0; i < n; i += 3) {
      t.length = 0;
      let ins = false;
      for (let k = 0; k < 3; k++) {
        v.fromBufferAttribute(p, idx ? idx.getX(i + k) : i + k).applyMatrix4(o.matrixWorld);
        t.push(v.x, v.y, v.z);
        if (inB(v.x, -v.z, v.y)) ins = true;
      }
      if (ins) {
        tris.push(...t);
        alb.push(...col);
      }
    }
  });
  return { tris: new Float32Array(tris), alb: new Float32Array(alb) };
};
