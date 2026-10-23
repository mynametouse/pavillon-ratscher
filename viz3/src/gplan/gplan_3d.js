// ===================== garden planner 4: the planned plants in the 3D garden (GP3D) =====================
// Nothing at start: the group, the instanced meshes and the bush shapes are made on the first sync. No new materials for the plants: the
// trees are the ez-tree kinds of the garden (garden/trees.js TREES: bark and leaf materials, leaf depth material), scaled to the size
// at the chosen age; shrubs, perennials, ground cover and climbers are mounds of the same leaf cards (thinned, from the ground up);
// foliage colour, autumn and blossom through the instance colour like the garden trees; blossom and fruit as a few small dots in the
// material of the books in the bungalow (garden/garten_kit.js bookMesh: plain + instance colour) – so the shader programs are the
// ones the garden already has. Trunks of trees from 5 years on stop the walker like the garden trees (COL, tag 'gplan').
import * as THREE from 'three';
import { scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, plain } from '../core/assets.js';
import { COL } from '../core/geo.js';
import { thinCards, TREES } from '../garden/trees.js';
import { rebuildGrids } from '../game/walkable.js';
import { GPMODEL as M } from './gplan_model.js';
export const GP3D = (() => {
  const S = { built: false, G: null, kinds: {}, bush: null, herb: null, dots: null, ncol: 0, stats: {} };
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0),
    sc = new THREE.Vector3(),
    col = new THREE.Color(),
    ref = new THREE.Color('#6b8a3a');
  // which garden tree a plant is drawn as (a few kinds, reused with scale and tint)
  function kindOf(p) {
    const d = p.darstellung || {};
    if (d.typ === 'nadelbaum') return TREES.pine ? 'pine' : 'ash';
    if (d.typ === 'obstbaum') return TREES.apple ? 'apple' : 'oakA';
    if (d.krone === 'saeule' || d.krone === 'oval') return 'aspen';
    if (d.krone === 'breit' || d.krone === 'schirm' || d.krone === 'ueberhaengend') return 'oakB';
    return 'ash';
  }
  const isTreeShape = p => {
    const t = p.darstellung && p.darstellung.typ;
    return t === 'laubbaum' || t === 'obstbaum' || t === 'nadelbaum' || (!t && M.isTree(p));
  };
  // a mound of leaf cards standing on the ground: unit size (1 wide, 1 high), from a tree's crown
  function mound(K, keep, grow) {
    const g = thinCards(K.lg, keep, grow);
    g.computeBoundingBox();
    const b = g.boundingBox,
      c = b.getCenter(new THREE.Vector3()),
      s = b.getSize(new THREE.Vector3());
    g.translate(-c.x, -b.min.y, -c.z);
    g.scale(1 / Math.max(s.x, s.z), 1 / s.y, 1 / Math.max(s.x, s.z));
    g.computeBoundingSphere();
    return g;
  }
  function im(geo, mat, cap, colour, depth) {
    const m = new THREE.InstancedMesh(geo, mat, cap);
    m.count = 0;
    if (colour) m.setColorAt(0, col.setRGB(1, 1, 1));
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.noMerge = true;
    if (depth) m.customDepthMaterial = depth;
    m.frustumCulled = false;
    S.G.add(m);
    return m;
  }
  function build() {
    if (S.built) return !!S.G;
    S.built = true;
    const base = TREES.oakA || TREES.ash || Object.values(TREES)[0];
    if (!base) return false;
    S.G = new THREE.Group();
    S.G.name = 'gplan';
    S.G.userData.noMerge = true;
    scene.add(S.G);
    S.bushGeo = mound(base, 0.3, 1.5);
    S.herbGeo = mound(base, 0.12, 2.2);
    S.leafMat = base.leaf;
    S.depth = base.depth;
    S.dotMat = plain({ roughness: 0.7 });
    S.dotGeo = new THREE.IcosahedronGeometry(1, 0);
    return true;
  }
  // instanced meshes grow when more plants are planned (made anew with twice the room)
  function ensure(slot, cap, make) {
    const cur = S[slot];
    if (cur && cur.instanceMatrix.count >= cap) return cur;
    const n = Math.max(16, cap * 2);
    if (cur) {
      S.G.remove(cur);
      cur.dispose();
    }
    return (S[slot] = make(n));
  }
  function kindMeshes(k, cap) {
    const K = TREES[k];
    let e = S.kinds[k];
    if (e && e.cap >= cap) return e;
    const n = Math.max(8, cap * 2);
    if (e) {
      for (const m of [e.bark, e.leaf]) {
        S.G.remove(m);
        m.dispose();
      }
    }
    if (!K.lgThin) K.lgThin = thinCards(K.lg, 0.55, 1.3);
    e = S.kinds[k] = { cap: n, bark: im(K.bg, K.bark, n, false), leaf: im(K.lgThin, K.leaf, n, true, K.depth), K };
    return e;
  }
  // instance colour that turns the leaf texture towards a target colour (the texture is roughly ref)
  function tint(hex, k = 1) {
    col.set(hex);
    col.setRGB(
      THREE.MathUtils.clamp(col.r / ref.r, 0.25, 4) * k,
      THREE.MathUtils.clamp(col.g / ref.g, 0.25, 4) * k,
      THREE.MathUtils.clamp(col.b / ref.b, 0.25, 4) * k
    );
    return col;
  }
  function leafColour(p, s, seed) {
    const C = M.colours(p, s.month),
      k = 0.9 + 0.16 * M.hash01(seed + 'c');
    if (s.bloom && C.bloom && (s.leaf === 'kahl' || s.leaf === 'austrieb')) return tint(C.bloom, 0.75 * k);
    const c = tint(C.leaf, k);
    if (s.leaf === 'austrieb') c.lerp(new THREE.Color(1.25, 1.35, 1.0), 0.35);
    return c;
  }
  // dots of blossom or fruit on the surface of a crown ellipsoid (deterministic)
  function dotsOn(out, x, y, z0, c, hex, n, size, seed) {
    for (let i = 0; i < n; i++) {
      const u = M.hash01(seed + ':u' + i),
        v = M.hash01(seed + ':v' + i),
        a = u * Math.PI * 2,
        h = v * 1.6 - 0.75,
        rr = Math.sqrt(Math.max(0, 1 - h * h)) * 0.97;
      out.push([x + Math.sin(a) * c.r * rr, y + Math.cos(a) * c.r * rr, z0 + c.zc + h * c.a, size, hex]);
    }
  }
  // the plan in 3D. list: [{ p, x, y, age (null: not planted yet), seed }]; o: { month, show }
  function sync(list, o) {
    const show = !!(o && o.show) && list.some(e => e.age !== null);
    if (!show) {
      if (S.G) S.G.visible = false;
      setCols([]);
      S.stats = { trees: 0, bushes: 0, dots: 0, cols: 0 };
      markDirty(true);
      return;
    }
    if (!build()) return;
    S.G.visible = true;
    const month = (o && o.month) || 6;
    const trees = {},
      bushes = [],
      herbs = [],
      dots = [],
      cols = [];
    for (const e of list) {
      if (e.age === null) continue;
      const p = e.p,
        s = M.sizeAt(p, e.age, e.seed),
        c = M.crown(p, s),
        z0 = KERN.ground(e.x, e.y),
        se = M.season(p, month),
        C = M.colours(p, month);
      if (isTreeShape(p) && Object.keys(TREES).length) {
        const k = kindOf(p);
        (trees[k] = trees[k] || []).push({ e, s, c, z0, se });
        if (e.age >= 5) cols.push([e.x, e.y, Math.max(0.08, c.tr)]);
        if (se.bloom && C.bloom)
          dotsOn(dots, e.x, e.y, z0, c, C.bloom, Math.round(Math.min(70, 10 + c.r * c.r * 6)), 0.07, e.seed);
        if (se.fruit && C.fruit && e.age >= 2)
          dotsOn(dots, e.x, e.y, z0, c, C.fruit, Math.round(Math.min(40, 4 + c.r * c.r * 3)), 0.055, e.seed + 'f');
      } else {
        // perennials that die back, and deciduous shrubs in winter: a low remnant (or nothing)
        const herb = !['strauch', 'kletter'].includes(p.darstellung && p.darstellung.typ) && p.schicht !== 'strauch';
        const k = se.k;
        if (k <= 0 && herb) continue;
        const hh = herb ? s.h * (0.35 + 0.65 * k) : s.h,
          ww = s.w * (p.darstellung && p.darstellung.typ === 'kletter' ? 0.55 : 1);
        (herb ? herbs : bushes).push({ e, h: hh, w: ww, z0, se, k });
        if (se.bloom && C.bloom)
          dotsOn(
            dots,
            e.x,
            e.y,
            z0,
            { r: ww * 0.48, zc: hh * 0.55, a: hh * 0.45 },
            C.bloom,
            Math.round(Math.min(30, 4 + ww * ww * 10)),
            herb ? 0.03 : 0.045,
            e.seed
          );
        if (se.fruit && C.fruit)
          dotsOn(
            dots,
            e.x,
            e.y,
            z0,
            { r: ww * 0.47, zc: hh * 0.5, a: hh * 0.42 },
            C.fruit,
            Math.round(Math.min(30, 4 + ww * ww * 8)),
            0.03,
            e.seed + 'f'
          );
      }
    }
    // trees: bark and leaves per kind
    let nt = 0;
    for (const k of Object.keys(TREES)) {
      const L = trees[k] || [];
      if (!L.length && !S.kinds[k]) continue;
      const E = kindMeshes(k, L.length),
        K = E.K;
      L.forEach(({ e, s, c, z0, se }, i) => {
        const sy = s.h / K.H,
          sx = THREE.MathUtils.clamp(c.r / K.R, sy * 0.5, sy * 1.7);
        q.setFromAxisAngle(up, M.hash01(e.seed + 'r') * 6.283);
        m4.compose(V(e.x, e.y, z0), q, sc.set(sx, sy, sx));
        E.bark.setMatrixAt(i, m4);
        if (se.k <= 0.01) m4.compose(V(e.x, e.y, z0), q, sc.set(0, 0, 0));
        else if (se.k < 1) m4.compose(V(e.x, e.y, z0), q, sc.set(sx * (0.7 + 0.3 * se.k), sy, sx * (0.7 + 0.3 * se.k)));
        E.leaf.setMatrixAt(i, m4);
        E.leaf.setColorAt(i, leafColour(e.p, se, e.seed));
      });
      for (const m of [E.bark, E.leaf]) {
        m.count = L.length;
        m.instanceMatrix.needsUpdate = true;
        if (m.instanceColor) m.instanceColor.needsUpdate = true;
      }
      nt += L.length;
    }
    // shrubs and perennials: mounds of leaf cards
    const fill = (slot, geo, L) => {
      const m = ensure(slot, L.length, n => im(geo, S.leafMat, n, true, S.depth));
      L.forEach(({ e, h, w, z0, se, k }, i) => {
        q.setFromAxisAngle(up, M.hash01(e.seed + 'r') * 6.283);
        m4.compose(V(e.x, e.y, z0), q, sc.set(w, Math.max(0.05, h), w));
        m.setMatrixAt(i, m4);
        const c = leafColour(e.p, se, e.seed);
        m.setColorAt(i, k < 0.3 ? c.multiplyScalar(0.8) : c);
      });
      m.count = L.length;
      m.instanceMatrix.needsUpdate = true;
      if (m.instanceColor) m.instanceColor.needsUpdate = true;
    };
    fill('bush', S.bushGeo, bushes);
    fill('herb', S.herbGeo, herbs);
    // blossom and fruit
    const dm = ensure('dots', dots.length, n => {
      const m = new THREE.InstancedMesh(S.dotGeo, S.dotMat, n);
      m.setColorAt(0, col.setRGB(1, 1, 1));
      m.castShadow = false;
      m.receiveShadow = true;
      m.userData.noMerge = true;
      m.frustumCulled = false;
      S.G.add(m);
      return m;
    });
    dots.forEach(([x, y, z, s, hex], i) => {
      m4.compose(V(x, y, z), q.identity(), sc.set(s, s, s));
      dm.setMatrixAt(i, m4);
      dm.setColorAt(i, col.set(hex));
    });
    dm.count = dots.length;
    dm.instanceMatrix.needsUpdate = true;
    if (dm.instanceColor) dm.instanceColor.needsUpdate = true;
    setCols(cols);
    S.stats = { trees: nt, bushes: bushes.length + herbs.length, dots: dots.length, cols: cols.length };
    markDirty(true);
  }
  // trunks in the walker's collision grid: own entries of COL, reused on every change (other modules keep indices into COL, so
  // entries are never removed – one no longer needed is switched off like a removed fence: top below its bottom)
  const MINE = [];
  function setCols(list) {
    if (!S.ncol && !list.length) return;
    list.forEach(([x, y, r], i) => {
      if (i >= MINE.length) {
        MINE.push(COL.length);
        COL.push([0, 0, 0, 0, 0, 4, 'gplan']);
      }
      const c = COL[MINE[i]];
      c[0] = x - r;
      c[1] = x + r;
      c[2] = y - r;
      c[3] = y + r;
      c[4] = 0;
      c[5] = 4;
    });
    for (let i = list.length; i < MINE.length; i++) COL[MINE[i]][5] = COL[MINE[i]][4] - 1;
    S.ncol = list.length;
    rebuildGrids();
  }
  return {
    sync,
    kindOf,
    get group() {
      return S.G;
    },
    get stats() {
      return S.stats;
    },
  };
})();
