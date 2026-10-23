// ===================== garden planner 4: the planned plants in the 3D garden (GP3D) =====================
// Nothing at start: the group, the kinds and the instanced meshes are made on the first sync. Trees are ez-tree kinds like the garden's
// (garden/trees.js buildTreeKind: preset + seed + tint + mods) – the garden's own ash, oak, aspen and pine, plus a fruit tree (Oak Small,
// spreading, small aspen leaves) and two bushes (presets Bush 1 and 2), built on first use from the bark and leaf pictures the garden has
// loaded already (perennials and ground cover: a low clump of the second bush). Their materials are made the way the garden's are, so the shader
// programs are the ones the garden already has (tested: test/gartenplaner.py). Foliage, spring and autumn colour through the instance
// colour (like the garden trees), bare in winter; blossom and fruit as small dots on the leaf cards of the crown, in the material of the
// books in the bungalow (garden/garten_kit.js bookMesh: plain + instance colour). Trunks of trees from 5 years on stop the walker (COL).
// Planting in the game (gplan/gplan_game.js): the hole with its heap of soil, the vole basket, the stake, the tree disc or the mulch – simple
// shapes in that same material with instance colours; plants in containers (the nursery, the stock) stand on pots of it.
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
    tmp = new THREE.Color(),
    ref = new THREE.Color('#6b8a3a');
  // own kinds, built on first use (the garden's kinds are taken as they are)
  const OWN = {
    obst: {
      key: 'gp-obst',
      preset: 'Oak Small',
      seed: 3131,
      tint: 0xb9cc8f,
      // a fruit tree: short stem, spreading crown, many small leaves (the preset has 24 twigs with 14 big leaves each)
      mod: o => {
        o.branch.angle['1'] = 60;
        o.branch.children = { 0: 5, 1: 3, 2: 3 };
        o.branch.start = { 1: 0.32, 2: 0.06, 3: 0.12 };
        o.leaves.type = 'aspen';
        o.leaves.size = 1.25;
        o.leaves.count = 30;
        o.bark.type = 'willow';
      },
    },
    busch1: { key: 'gp-busch1', preset: 'Bush 1', seed: 501, tint: 0xc5d29a },
    busch2: { key: 'gp-busch2', preset: 'Bush 2', seed: 77, tint: 0xc9d6a0 },
    // perennials, ground cover, bulbs: a low, leafy clump
    kraut: {
      key: 'gp-kraut',
      preset: 'Bush 2',
      seed: 913,
      tint: 0xc9d6a0,
      mod: o => {
        o.leaves.count = 24;
        o.leaves.size = 2.5;
      },
    },
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
  // mean colour of a kind's leaf picture times its material colour (linear) – what the instance colour multiplies
  function avgOf(K, mat) {
    if (K && K.gpAvg) return K.gpAvg;
    const img = mat.map && mat.map.image;
    if (!img || !img.width) return ref;
    try {
      const c = document.createElement('canvas');
      c.width = c.height = 32;
      const g = c.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, 32, 32);
      const d = g.getImageData(0, 0, 32, 32).data;
      let r = 0,
        gg = 0,
        b = 0,
        n = 0;
      for (let i = 0; i < d.length; i += 4)
        if (d[i + 3] > 128) {
          r += d[i];
          gg += d[i + 1];
          b += d[i + 2];
          n++;
        }
      if (!n) return ref;
      const a = new THREE.Color()
        .setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace)
        .multiply(mat.color);
      if (K) K.gpAvg = a;
      return a;
    } catch (e) {
      return ref;
    }
  }
  // instance colour that turns the leaf picture (mean avg) towards a target colour
  function tint(hex, avg, k = 1) {
    col.set(hex);
    col.setRGB(
      THREE.MathUtils.clamp(col.r / Math.max(0.01, avg.r), 0.3, 2.6) * k,
      THREE.MathUtils.clamp(col.g / Math.max(0.01, avg.g), 0.3, 2.6) * k,
      THREE.MathUtils.clamp(col.b / Math.max(0.01, avg.b), 0.3, 2.6) * k
    );
    return col;
  }
  // foliage of the month: the plant's own green, fresh light green while budding, its autumn colour
  function leafColour(p, s, seed, avg) {
    const C = M.colours(p, s.month),
      k = 0.92 + 0.14 * M.hash01(seed + 'c');
    if (s.leaf === 'austrieb')
      return tint('#' + tmp.set(C.leaf).lerp(new THREE.Color('#b9d97a'), 0.45).getHexString(), avg, k);
    return tint(C.leaf, avg, k);
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
  // the plan in 3D. list: [{ p, x, y, age (null: not in the ground in the year shown), seed, vis (the plant stands; default true), picked
  // (harvested this year: no fruit), parts ({ w, hole, korb, pfahl, disc, mulch } round a plant in the ground) }];
  // o: { month, pots: [{ p, x, y, z, seed }] plants at planting size in containers (the pot's foot at z) }
  function sync(list, o = {}) {
    const pots = o.pots || [],
      live = list.filter(e => e.vis !== false && e.age !== null),
      props = list.filter(e => e.parts);
    if (!live.length && !props.length && !pots.length) {
      if (S.G) S.G.visible = false;
      setCols([]);
      S.stats = { trees: 0, bushes: 0, dots: 0, cols: 0, parts: 0, pots: 0 };
      markDirty(true);
      return;
    }
    if (!build()) return;
    S.G.visible = true;
    const month = o.month || 6;
    const byKind = {},
      dots = [],
      cols = [],
      potList = [];
    // a plant in a container: planting size, standing on its pot
    for (const c of pots) {
      const pot = potSize(c.p);
      potList.push([c.x, c.y, c.z, pot]);
      live.push({ p: c.p, x: c.x, y: c.y, z0: c.z + pot.h * 0.92, age: 0, seed: c.seed, pot: true, picked: true });
    }
    for (const e of live) {
      const p = e.p,
        s = M.sizeAt(p, e.age, e.seed),
        se = M.season(p, month),
        z0 = e.z0 !== undefined ? e.z0 : KERN.ground(e.x, e.y),
        sh = shapeOf(p);
      // perennials that die back: gone in winter, low while budding
      if (sh === 'herb') {
        if (se.k <= 0) continue;
        s.h *= 0.35 + 0.65 * se.k;
      }
      const k = sh === 'herb' ? 'kraut' : kindOf(p);
      (byKind[k] = byKind[k] || []).push({ e, s, se, z0, sh, c: M.crown(p, s) });
      if (sh === 'tree' && e.age >= 5 && !e.pot) cols.push([e.x, e.y, Math.max(0.08, M.crown(p, s).tr)]);
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
        // a climber grows up a wall or a trellis: narrow and tall
        const climb = e.p.darstellung && e.p.darstellung.typ === 'kletter',
          sy = s.h / K.H,
          sx = climb
            ? THREE.MathUtils.clamp((s.w * 0.22) / K.R, sy * 0.25, sy * 0.6)
            : THREE.MathUtils.clamp(s.w / 2 / K.R, sy * 0.5, sy * 1.8);
        q.setFromAxisAngle(up, M.hash01(e.seed + 'r') * 6.283);
        m4.compose(V(e.x, e.y, z0), q, sc.set(sx, sy, sx));
        bark.setMatrixAt(i, m4);
        const C = M.colours(e.p, month),
          kk = se.k <= 0.01 ? 0 : 0.7 + 0.3 * se.k;
        const small = sh === 'herb';
        if (se.bloom && C.bloom)
          dotsOn(
            dots,
            K.gpLeaf,
            m4,
            Math.round(THREE.MathUtils.clamp(c.r * c.r * (small ? 60 : 22), small ? 5 : 14, 170)),
            small ? 0.025 : 0.04,
            C.bloom,
            e.seed
          );
        if (se.fruit && C.fruit && !e.picked && e.age >= M.bearingAge(e.p))
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
        leaf.setColorAt(i, leafColour(e.p, se, e.seed, avgOf(K, K.leaf)));
      });
      bark.count = leaf.count = L.length;
      done(bark);
      done(leaf);
      for (const x of L) x.sh === 'tree' ? nt++ : nb++;
    }
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
    const np = drawParts(props, potList);
    setCols(cols);
    S.stats = { trees: nt, bushes: nb, dots: dots.length, cols: cols.length, parts: np, pots: potList.length };
    markDirty(true);
  }
  // ---------------- what stands round a plant in the ground, and the pots ----------------
  // a container by the plant's size: trees 20 l, shrubs and climbers 5 l, perennials 1 l (diameter d, height h in m)
  function potSize(p) {
    if (M.isTree(p)) return { d: 0.36, h: 0.32 };
    if (p.schicht === 'strauch' || p.schicht === 'kletter') return { d: 0.24, h: 0.21 };
    return { d: 0.13, h: 0.11 };
  }
  const PART = {
    hole: '#2b1f16',
    heap: '#5b4331',
    korb: '#9aa1a3',
    disc: '#4a3626',
    mulch: '#7a5a3a',
    pfahl: '#a9845a',
    pot: '#26282a',
  };
  // three instanced meshes in the dots' material: lumps (hole, heap, basket, disc, mulch – a flattened ball), sticks (stakes), pots
  function partMesh(name, n, geo) {
    return slot(name, n, cap => {
      const m = new THREE.InstancedMesh(geo(), S.dotMat, cap);
      m.setColorAt(0, col.setRGB(1, 1, 1));
      m.castShadow = false;
      m.receiveShadow = true;
      m.userData.noMerge = true;
      S.G.add(m);
      return m;
    });
  }
  function drawParts(props, potList) {
    const lumps = [],
      sticks = [];
    for (const e of props) {
      const P = e.parts,
        w = P.w,
        z0 = KERN.ground(e.x, e.y),
        a = M.hash01(e.seed + 'h') * 6.283;
      if (P.hole) {
        lumps.push([e.x, e.y, z0, w / 2, 0.035, w / 2, 0, PART.hole]);
        lumps.push([
          e.x + Math.cos(a) * w * 0.95,
          e.y + Math.sin(a) * w * 0.95,
          z0 - 0.02,
          w * 0.5,
          Math.max(0.1, w * 0.3),
          w * 0.4,
          a,
          PART.heap,
        ]);
      }
      if (P.korb) lumps.push([e.x, e.y, z0 + 0.012, w * 0.38, 0.035, w * 0.38, 0, PART.korb]);
      if (P.disc) lumps.push([e.x, e.y, z0, w * 0.75, 0.03, w * 0.75, 0, PART.disc]);
      if (P.mulch) lumps.push([e.x, e.y, z0, w * 0.95, 0.045, w * 0.95, 0, PART.mulch]);
      if (P.pfahl) sticks.push([e.x - 0.14, e.y + 0.03, z0 - 0.3, 0.028, 1.9, PART.pfahl]);
    }
    const L = partMesh('part:lump', lumps.length, () => new THREE.IcosahedronGeometry(1, 1));
    lumps.forEach(([x, y, z, sx, sy, sz, a, hex], i) => {
      q.setFromAxisAngle(up, a);
      m4.compose(V(x, y, z), q, sc.set(sx, sy, sz));
      L.setMatrixAt(i, m4);
      L.setColorAt(i, col.set(hex));
    });
    L.count = lumps.length;
    done(L);
    const K = partMesh('part:stick', sticks.length, () => new THREE.CylinderGeometry(1, 1, 1, 6).translate(0, 0.5, 0));
    sticks.forEach(([x, y, z, r, h, hex], i) => {
      m4.compose(V(x, y, z), q.identity(), sc.set(r, h, r));
      K.setMatrixAt(i, m4);
      K.setColorAt(i, col.set(hex));
    });
    K.count = sticks.length;
    done(K);
    const T = partMesh('part:pot', potList.length, () =>
      new THREE.CylinderGeometry(0.5, 0.38, 1, 12).translate(0, 0.5, 0)
    );
    potList.forEach(([x, y, z, pot], i) => {
      m4.compose(V(x, y, z), q.identity(), sc.set(pot.d, pot.h, pot.d));
      T.setMatrixAt(i, m4);
      T.setColorAt(i, col.set(PART.pot));
    });
    T.count = potList.length;
    done(T);
    return lumps.length + sticks.length;
  }
  // rings of small dots on the ground (on site: the selected plant, where „hier setzen“ would put the chosen one) – the dots' material,
  // no new program; independent of the plants' visibility. rings: [{ x, y, r, hex }]
  let MARK = null,
    nMark = 0;
  function marks(rings) {
    if (!rings.length && !nMark) return;
    if (!MARK) {
      MARK = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), S.dotMat || plain({ roughness: 0.7 }), 96);
      MARK.setColorAt(0, col.setRGB(1, 1, 1));
      MARK.castShadow = false;
      MARK.receiveShadow = true;
      MARK.userData.noMerge = true;
      MARK.frustumCulled = false;
      scene.add(MARK);
    }
    let n = 0;
    for (const R of rings)
      for (let i = 0; i < 16 && n < 96; i++, n++) {
        const a = (i / 16) * Math.PI * 2,
          x = R.x + Math.sin(a) * R.r,
          y = R.y + Math.cos(a) * R.r;
        m4.compose(V(x, y, KERN.ground(x, y) + 0.05), q.identity(), sc.set(0.035, 0.035, 0.035));
        MARK.setMatrixAt(n, m4);
        MARK.setColorAt(n, col.set(R.hex));
      }
    MARK.count = nMark = n;
    MARK.instanceMatrix.needsUpdate = true;
    if (MARK.instanceColor) MARK.instanceColor.needsUpdate = true;
    markDirty();
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
    marks,
    get nMarks() {
      return nMark;
    },
    kindOf,
    get group() {
      return S.G;
    },
    get stats() {
      return S.stats;
    },
  };
})();
