// ===================== garden planner 4: the planned plants in the 3D garden (GP3D) =====================
// Nothing at start: the group, the kinds and the instanced meshes are made on the first sync. Trees are ez-tree kinds like the garden's
// (garden/trees.js buildTreeKind: preset + seed + tint + mods) – the garden's own ash, oak, aspen and pine, plus a fruit tree (Oak Small,
// spreading, small aspen leaves) and two bushes (presets Bush 1 and 2), built on first use from the bark and leaf pictures the garden has
// loaded already; perennials and ground cover are mounds of leaf cards. Their materials are made the way the garden's are, so the shader
// programs are the ones the garden already has (tested: test/gartenplaner.py). Foliage, spring and autumn colour through the instance
// colour (like the garden trees), bare in winter; blossom and fruit as small dots on the leaf cards of the crown, in the material of the
// books in the bungalow (garden/garten_kit.js bookMesh: plain + instance colour). Trunks of trees from 5 years on stop the walker (COL).
import * as THREE from 'three';
import { scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, plain } from '../core/assets.js';
import { COL } from '../core/geo.js';
import { buildTreeKind, thinCards, TREES } from '../garden/trees.js';
import { rebuildGrids } from '../game/walkable.js';
import { GPMODEL as M } from './gplan_model.js';
export const GP3D = (() => {
  const S = { built: false, G: null, kinds: {}, meshes: {}, ncol: 0, stats: {} };
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0),
    sc = new THREE.Vector3(),
    v3 = new THREE.Vector3(),
    col = new THREE.Color(),
    ref = new THREE.Color('#6b8a3a'),
    fresh = new THREE.Color(1.25, 1.35, 1.0);
  // own kinds, built on first use (the garden's kinds are taken as they are)
  const OWN = {
    obst: {
      key: 'gp-obst',
      preset: 'Oak Small',
      seed: 3131,
      tint: 0xb9cc8f,
      mod: o => {
        o.branch.angle['1'] = 58;
        o.leaves.type = 'aspen';
        o.leaves.size = 0.95;
        o.leaves.count = 22;
        o.bark.type = 'willow';
      },
    },
    busch1: { key: 'gp-busch1', preset: 'Bush 1', seed: 501, tint: 0xc5d29a },
    busch2: { key: 'gp-busch2', preset: 'Bush 2', seed: 77, tint: 0xc9d6a0 },
  };
  function kind(k) {
    if (S.kinds[k]) return S.kinds[k];
    let K = null;
    if (OWN[k]) {
      try {
        K = buildTreeKind(OWN[k]);
      } catch (e) {
        console.warn('Gartenplaner: Baumart', k, e);
      }
    } else K = TREES[k] || null;
    if (!K) K = TREES.ash || TREES.oakA || null;
    if (K && !K.gpLeaf) K.gpLeaf = K.lg.index && K.lg.index.count > 24000 ? thinCards(K.lg, 0.6, 1.25) : K.lg;
    return (S.kinds[k] = K);
  }
  // which kind a plant is drawn as (a few kinds, reused with scale and tint)
  function kindOf(p) {
    const d = p.darstellung || {};
    if (d.typ === 'nadelbaum') return TREES.pine ? 'pine' : 'ash';
    if (d.typ === 'obstbaum') return 'obst';
    if (d.typ === 'strauch' || d.typ === 'kletter') return M.hash01(p.id) < 0.5 ? 'busch1' : 'busch2';
    if (d.krone === 'saeule' || d.krone === 'oval') return 'aspen';
    if (d.krone === 'breit' || d.krone === 'schirm' || d.krone === 'ueberhaengend') return 'oakB';
    return 'ash';
  }
  const shapeOf = p => {
    const t = p.darstellung && p.darstellung.typ;
    if (t === 'laubbaum' || t === 'obstbaum' || t === 'nadelbaum') return 'tree';
    if (t === 'strauch' || t === 'kletter') return 'bush';
    if (!t) return M.isTree(p) ? 'tree' : p.schicht === 'strauch' ? 'bush' : 'herb';
    return 'herb';
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
  // centres of (up to n) leaf cards of a leaf geometry, in its own space – where blossom and fruit sit
  function cards(geo, n = 360) {
    if (geo.userData.gpCards) return geo.userData.gpCards;
    const idx = geo.index ? geo.index.array : null,
      P = geo.attributes.position,
      quads = Math.floor((idx ? idx.length : P.count * 1.5) / 6),
      step = Math.max(1, Math.floor(quads / n)),
      out = [];
    for (let k = 0; k < quads; k += step) {
      const i0 = idx ? idx[k * 6] : k * 4;
      let x = 0,
        y = 0,
        z = 0;
      for (let j = 0; j < 4 && i0 + j < P.count; j++) {
        x += P.getX(i0 + j);
        y += P.getY(i0 + j);
        z += P.getZ(i0 + j);
      }
      out.push(x / 4, y / 4, z / 4);
    }
    return (geo.userData.gpCards = new Float32Array(out));
  }
  function im(geo, mat, cap, colour, depth) {
    const m = new THREE.InstancedMesh(geo, mat, cap);
    m.count = 0;
    if (colour) m.setColorAt(0, col.setRGB(1, 1, 1));
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.noMerge = true;
    if (depth) m.customDepthMaterial = depth;
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
    S.herbGeo = mound(base, 0.4, 1.7);
    S.leafMat = base.leaf;
    S.depth = base.depth;
    S.dotMat = plain({ roughness: 0.7 });
    S.dotGeo = new THREE.IcosahedronGeometry(1, 0);
    return true;
  }
  // an instanced mesh per slot, made anew with twice the room when more plants are planned
  function slot(name, cap, make) {
    const cur = S.meshes[name];
    if (cur && cur.instanceMatrix.count >= cap) return cur;
    if (cur) {
      S.G.remove(cur);
      cur.dispose();
    }
    return (S.meshes[name] = make(Math.max(8, cap * 2)));
  }
  const done = m => {
    m.instanceMatrix.needsUpdate = true;
    if (m.instanceColor) m.instanceColor.needsUpdate = true;
    m.computeBoundingSphere();
  };
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
    const c = tint(C.leaf, k);
    if (s.leaf === 'austrieb') c.lerp(fresh, 0.4);
    return c;
  }
  // blossom or fruit: n dots on leaf cards of the crown (deterministic), in world space through the plant's matrix
  function dotsOn(out, geo, mat, n, size, hex, seed) {
    const C = cards(geo),
      nc = C.length / 3;
    if (!nc) return;
    for (let i = 0; i < n; i++) {
      const j = Math.floor(M.hash01(seed + ':' + i) * nc);
      v3.set(C[j * 3], C[j * 3 + 1], C[j * 3 + 2]).applyMatrix4(mat);
      out.push([v3.x, v3.y, v3.z, size * (0.8 + 0.4 * M.hash01(seed + 's' + i)), hex]);
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
    const byKind = {},
      herbs = [],
      dots = [],
      cols = [];
    for (const e of list) {
      if (e.age === null) continue;
      const p = e.p,
        s = M.sizeAt(p, e.age, e.seed),
        se = M.season(p, month),
        z0 = KERN.ground(e.x, e.y),
        sh = shapeOf(p);
      if (sh === 'herb') {
        if (se.k <= 0) continue;
        herbs.push({ e, h: s.h * (0.35 + 0.65 * se.k), w: s.w, z0, se });
        continue;
      }
      const k = kindOf(p);
      (byKind[k] = byKind[k] || []).push({ e, s, se, z0, sh, c: M.crown(p, s) });
      if (sh === 'tree' && e.age >= 5) cols.push([e.x, e.y, Math.max(0.08, M.crown(p, s).tr)]);
    }
    // trees and bushes: bark and leaves per kind, blossom and fruit on their leaf cards
    let nt = 0,
      nb = 0;
    for (const k of new Set([...Object.keys(byKind), ...Object.keys(S.kinds)])) {
      const L = byKind[k] || [],
        K = kind(k);
      if (!K) continue;
      const bark = slot(k + ':b', L.length, n => im(K.bg, K.bark, n, false)),
        leaf = slot(k + ':l', L.length, n => im(K.gpLeaf, K.leaf, n, true, K.depth));
      L.forEach(({ e, s, se, z0, sh, c }, i) => {
        const sy = s.h / K.H,
          sx = THREE.MathUtils.clamp(s.w / 2 / K.R, sy * 0.5, sy * 1.8);
        q.setFromAxisAngle(up, M.hash01(e.seed + 'r') * 6.283);
        m4.compose(V(e.x, e.y, z0), q, sc.set(sx, sy, sx));
        bark.setMatrixAt(i, m4);
        const C = M.colours(e.p, month),
          kk = se.k <= 0.01 ? 0 : 0.7 + 0.3 * se.k;
        if (se.bloom && C.bloom)
          dotsOn(dots, K.gpLeaf, m4, Math.round(THREE.MathUtils.clamp(c.r * c.r * 22, 14, 170)), 0.04, C.bloom, e.seed);
        if (se.fruit && C.fruit && (sh === 'bush' || e.age >= 2))
          dotsOn(
            dots,
            K.gpLeaf,
            m4,
            Math.round(THREE.MathUtils.clamp(c.r * c.r * 7, 6, 60)),
            0.042,
            C.fruit,
            e.seed + 'f'
          );
        if (kk < 1) m4.compose(V(e.x, e.y, z0), q, sc.set(sx * kk, sy * (kk ? 1 : 0), sx * kk));
        leaf.setMatrixAt(i, m4);
        leaf.setColorAt(i, leafColour(e.p, se, e.seed));
      });
      bark.count = leaf.count = L.length;
      done(bark);
      done(leaf);
      for (const x of L) x.sh === 'tree' ? nt++ : nb++;
    }
    // perennials, ground cover: mounds of leaf cards
    const hm = slot('herb', herbs.length, n => im(S.herbGeo, S.leafMat, n, true, S.depth));
    herbs.forEach(({ e, h, w, z0, se }, i) => {
      q.setFromAxisAngle(up, M.hash01(e.seed + 'r') * 6.283);
      m4.compose(V(e.x, e.y, z0), q, sc.set(w, Math.max(0.05, h), w));
      hm.setMatrixAt(i, m4);
      hm.setColorAt(i, leafColour(e.p, se, e.seed));
      const C = M.colours(e.p, month);
      if (se.bloom && C.bloom)
        dotsOn(dots, S.herbGeo, m4, Math.round(THREE.MathUtils.clamp(w * w * 40, 5, 40)), 0.025, C.bloom, e.seed);
      if (se.fruit && C.fruit)
        dotsOn(dots, S.herbGeo, m4, Math.round(THREE.MathUtils.clamp(w * w * 25, 4, 30)), 0.02, C.fruit, e.seed + 'f');
    });
    hm.count = herbs.length;
    done(hm);
    // blossom and fruit (already in world space)
    const dm = slot('dots', dots.length, n => {
      const m = new THREE.InstancedMesh(S.dotGeo, S.dotMat, n);
      m.setColorAt(0, col.setRGB(1, 1, 1));
      m.castShadow = false;
      m.receiveShadow = true;
      m.userData.noMerge = true;
      S.G.add(m);
      return m;
    });
    dots.forEach(([x, y, z, s, hex], i) => {
      m4.compose(v3.set(x, y, z), q.identity(), sc.set(s, s, s));
      dm.setMatrixAt(i, m4);
      dm.setColorAt(i, col.set(hex));
    });
    dm.count = dots.length;
    done(dm);
    setCols(cols);
    S.stats = { trees: nt, bushes: nb + herbs.length, dots: dots.length, cols: cols.length };
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
