// ===================== feat/welt-wald: the region's forests, copses, rows and single trees in 3D (WWALD) =====================
// Falko, 17.11.2026: the road from Ratscher to Suhl is flat – forests and trees only in the aerial image. Beyond Ratscher's 2.4 km square
// (its measured trees, the Klinge forest), Schleusingen's town zone (stadtgruen) and Suhl's tiles (the Suhl chat) every tree of the world
// tiles stands as a record in a 400 m cell (the grid of gebaeude/z/): weltwald/z/<i>_<j>.bin from tools/weltwald/baeume.py – found in the
// aerial images of 2024/25 (DOP RGB and colour infrared: what stands now), the canopy height model of WRI and Meta (heights, tops) and the
// leaf type map of Copernicus (conifer or broadleaf).
// Drawing, with few draw calls whatever the forest: a small fixed set of instanced meshes filled again around the camera as it moves
// (only what is in view, with a margin):
// - near (broadleaf to rnB, conifers to rnC m): the Klinge's spruce, pine and larch (world/forest.js models, its programs through
//   FOREST.kit – no new program) and the garden's broadleaf kinds (garden/trees.js TREES: their materials), shadows; trunks stop walkers
//   and vehicles (KERN.pushOut)
// - middle (to rm m): the conifers coarser – every tree at a stand's edge, a share of the inner ones (the rest as cards behind them)
// - far (to rf m) and the broadleaf beyond rnB: cards from an atlas of the five kinds rendered at load (two upright planes and a level one
//   in the crown), drawn with the program of Ratscher's far trees (world/ratscher.js 'geotree'); thinned with distance, the remaining
//   cards a little larger (the canopy stays closed)
// - budgets: draw calls (MAXCALL) and triangles (TRI) of the trees in view – the nearest in 3D first
// - beyond: the aerial image of the tiles, as before.
// Broadleaf follows the game's date: fresh green in May, autumn colours in October, bare from November (bark only; the atlas drawn
// again without leaves); the larch as the Klinge's (FOREST's season). ?nowald turns it all off (to compare).
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BASE, cam, COARSE, QS, R, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { GI, markDirty, SV, whenLoaded } from '../core/assets.js';
import { treeLeafLevels, TREES } from '../garden/trees.js';
import { RENDER } from '../render/render.js';
import { P } from '../game/walkable.js';
import { RATSCHER } from '../world/ratscher.js';
import { FOREST } from '../world/forest.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { WELT } from '../welt/welt.js';
export const WWALD = (() => {
  const S = {
    on: false,
    state: 'idle',
    err: '',
    cells: new Map(),
    n: { cells: 0, trees: 0, freed: 0, fetched: 0, bytes: 0 },
    sel: { near: 0, mid: 0, cards: 0, tris: 0, calls: 0, ms: 0 },
  };
  if (!WELT.on || !RATSCHER.box || QS.has('nowald')) return S;
  S.on = true;
  const RB = RATSCHER.box,
    CELL = 400,
    BLK = 25, // blocks of 25 m inside a cell (16 x 16): the unit of the selection
    NB = CELL / BLK;
  // the distance bands per graphics tier; phones (COARSE) tighter (docs/features/welt-wald.md: budgets)
  // rnB broadleaf in 3D (its crowns are heavy: ~4 400 triangles), rnC conifers at full detail, rm conifers coarser (~300 triangles), rf cards
  const BANDS = {
    hoch: { rnB: 24, rnC: 15, rm: 105, rf: 520, mid: 0.45, load: 760, free: 980 },
    mittel: { rnB: 20, rnC: 12, rm: 90, rf: 450, mid: 0.38, load: 700, free: 900 },
    schnell: { rnB: 16, rnC: 10, rm: 72, rf: 380, mid: 0.3, load: 620, free: 820 },
    phone: { rnB: 12, rnC: 7, rm: 50, rf: 300, mid: 0.22, load: 500, free: 680 },
  };
  const band = () => (COARSE ? BANDS.phone : BANDS[RENDER.tier] || BANDS.mittel);
  S.band = band;
  // kinds of the data (tools/weltwald/baeume.py): 0 spruce, 1 pine, 2 larch, 3 beech/broadleaf in the forest, 4 large broadleaf in the
  // open, 5 birch, 6 small broadleaf (fruit trees, rows), 7 shrub/young growth; flags 16 edge, 32 height measured, 64 forest, 128 young
  const KN = ['Fichte', 'Kiefer', 'Lärche', 'Buche', 'Laubbaum', 'Birke', 'Obstbaum', 'Strauch'];
  S.kinds = KN;
  // the 3D model of each kind: [source, name] – FOREST variants or garden kinds (TREES); the atlas column of its far card
  const MODEL = [
    ['f', 'spruce:stand'],
    ['f', 'pine:stand'],
    ['f', 'larch:stand'],
    ['t', 'oakA'],
    ['t', 'oakB'],
    ['t', 'aspen'],
    ['t', 'apple'],
    ['t', 'bushA'],
  ];
  const COLUMN = [0, 1, 2, 3, 3, 4, 3, 3];
  const BROAD = k => k >= 3;
  const hash = n => {
    const s = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  // ---------------------------------------------------------------- the season (broadleaf) ----------------------------------------------
  const doyNow = () => {
    try {
      const d = new Date((DN.jdOf(CLOCK.t) - 2440587.5) * 864e5);
      return (d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5;
    } catch (e) {
      return 180;
    }
  };
  const ss = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
  // leaf: 0 bare … 1 full (Thuringia 400–600 m: leaves from late April, autumn colours from late September, bare by mid November);
  // gold: autumn colour 0…1; fresh: the light green of May
  function seasonOf(doy) {
    const leaf = ss(108, 128, doy) * (1 - ss(298, 322, doy)),
      gold = ss(262, 300, doy),
      fresh = ss(108, 120, doy) * (1 - ss(135, 165, doy));
    return { doy: Math.round(doy), leaf, gold, fresh };
  }
  let SEASON = seasonOf(doyNow());
  S.season = () => ({
    ...SEASON,
    leaf: +SEASON.leaf.toFixed(2),
    gold: +SEASON.gold.toFixed(2),
    fresh: +SEASON.fresh.toFixed(2),
  });
  // autumn colour of a broadleaf kind (multiplied into the colour of its leaves): beech copper, oak brown, birch yellow, fruit mixed
  const AUTUMN = {
    3: [2.3, 1.15, 0.3],
    4: [1.8, 1.15, 0.45],
    5: [1.2, 1.12, 0.8],
    6: [2.4, 1.0, 0.4],
    7: [2.1, 1.1, 0.4],
  };
  // the green of summer (the birch: the garden's aspen leaves are golden – its own colour is its autumn)
  const SUMMER = { 3: [1, 1, 1], 4: [1, 1, 1], 5: [0.56, 0.98, 1.35], 6: [1, 1, 1], 7: [1, 1, 1] };
  const tmpC = new THREE.Color();
  function leafColour(k, g, a, out) {
    const A = AUTUMN[k] || AUTUMN[3],
      q = SEASON,
      // each tree turns at its own pace (rank a)
      au = THREE.MathUtils.clamp(q.gold * 1.35 - 0.35 + (a / 255 - 0.5) * 0.5, 0, 1),
      fr = q.fresh;
    const sm = SUMMER[k] || SUMMER[3];
    out.setRGB(
      g * (sm[0] + (A[0] - sm[0]) * au) * (1 + 0.12 * fr),
      g * (sm[1] + (A[1] - sm[1]) * au) * (1 + 0.2 * fr),
      g * (sm[2] + (A[2] - sm[2]) * au) * (1 - 0.15 * fr)
    );
    return out;
  }
  // a broadleaf tree still has its leaves when its rank is below the share of the season
  const leafy = (k, a) => !BROAD(k) || SEASON.leaf > 0.98 || a / 255 < SEASON.leaf;
  // ---------------------------------------------------------------- models and materials -----------------------------------------------
  const ZERO_LOD = () => new THREE.Vector4(-2, -1, 1e5, 1e5 + 1); // FOREST's bands: always shown – the selection here decides
  let KIT = null;
  const MOD = {}; // kind → { near: { bark, crown, H, W, R, ez }, mid: { … } }
  function kit() {
    if (KIT) return KIT;
    const fk = FOREST.kit && FOREST.kit();
    KIT = { f: fk && fk.models0 && fk.models0.length && fk.mk ? fk : null };
    return KIT;
  }
  // the materials of the Klinge's stand, patched by FOREST itself (same keys, same programs), with bands always on
  const FMAT = {};
  function fmat(sp, lod) {
    const key = sp + lod;
    if (FMAT[key]) return FMAT[key];
    const K = kit().f,
      B = K.mk.barkTex[FOREST.spec(sp).bark],
      lodU = ZERO_LOD();
    const bark = K.patch(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        map: B && B.map,
        normalMap: lod ? null : B && B.nrm,
        roughnessMap: B && B.orm,
        aoMap: null,
        roughness: 1,
        envMapIntensity: 0.55,
      }),
      'b' + key,
      lodU,
      false
    );
    const cards = K.patch(
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        vertexColors: true,
        map: K.mk.twig,
        alphaTest: 0.42,
        side: THREE.DoubleSide,
        roughness: 0.82,
        envMapIntensity: 0.5,
      }),
      'c' + key,
      lodU,
      true
    );
    if (sp === 'larch') K.seasonal(cards, false);
    return (FMAT[key] = { bark, cards, depth: K.mk.depth });
  }
  // the model of kind k at level lev (0 near, 1 middle): geometries and materials, or null
  function model(k, lev) {
    const M = (MOD[k] = MOD[k] || {});
    if (M[lev] !== undefined) return M[lev];
    let src = MODEL[k];
    // without the Klinge's stand (no real surroundings) the garden's pine stands in for the conifers
    if (src[0] === 'f' && !kit().f) src = ['t', 'pine'];
    let out = null;
    if (src[0] === 'f') {
      const K = kit().f,
        m = K.VI[src[1]],
        Md = (lev ? K.models1 : K.models0)[m],
        sp = src[1].split(':')[0],
        mat = fmat(sp, lev);
      if (Md)
        out = {
          bark: Md.bark,
          crown: Md.cards,
          bm: mat.bark,
          cm: mat.cards,
          depth: mat.depth,
          H: Md.H,
          W: Math.max(0.5, Md.W),
          f: true,
        };
    } else {
      const K = TREES[src[1]];
      if (K && K.bark && K.leaf) {
        const LG = treeLeafLevels(K);
        // broadleaf only near (the middle and far as cards of the whole tree – denser than a thinned crown, a tenth of the triangles)
        if (lev && BROAD(k)) {
          M[lev] = null;
          return null;
        }
        out = {
          bark: K.bgMid,
          crown: lev ? LG[2] : LG[1],
          bm: K.bark,
          cm: K.leaf,
          // the shadow of every broadleaf crown through the garden oak's depth material (three.js takes map and alpha test from the leaf
          // material each draw): its program is there since the garden's first shadows – the depth material of a kind the garden casts no
          // shadow with (apple, aspen, bush) would be compiled only here, with the lights of that moment, as a new program
          depth: (TREES.oakA && TREES.oakA.depth) || K.depth,
          H: K.H,
          W: K.R,
          f: false,
        };
      }
    }
    if (out) {
      out.tb = out.bark.index ? out.bark.index.count / 3 : out.bark.attributes.position.count / 3;
      out.tc = out.crown.index ? out.crown.index.count / 3 : out.crown.attributes.position.count / 3;
    }
    M[lev] = out;
    return out;
  }
  // the instanced meshes: one pair (bark, crown) per kind and level, made on first use; capacity grows when needed
  const IM = new Map(); // 'k:lev' → { k, lev, M, b, c, cap, n }
  const ROOT = new THREE.Group();
  ROOT.name = 'weltwald';
  ROOT.userData.noMerge = true;
  scene.add(ROOT);
  function pair(k, lev) {
    const key = k + ':' + lev;
    let p = IM.get(key);
    if (p) return p;
    const M = model(k, lev);
    if (!M) return null;
    p = { k, lev, M, cap: 0, n: 0, b: null, c: null };
    IM.set(key, p);
    grow(p, lev ? 400 : 96);
    return p;
  }
  // instance colours where the source draws with them (the program depends on it): the Klinge's bark and crowns, the garden's crowns
  function mk(geo, mat, cap, shadow, colour) {
    const im = new THREE.InstancedMesh(geo, mat, cap);
    im.count = 0;
    im.visible = false;
    im.frustumCulled = false; // filled around the camera, only what is in view
    im.castShadow = shadow;
    im.receiveShadow = true;
    im.userData.noMerge = true;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (colour) {
      im.setColorAt(0, tmpC.setRGB(1, 1, 1));
      im.instanceColor.setUsage(THREE.DynamicDrawUsage);
    }
    return im;
  }
  function grow(p, cap) {
    for (const w of ['b', 'c']) {
      const old = p[w],
        shadow = p.lev === 0,
        im = mk(w === 'b' ? p.M.bark : p.M.crown, w === 'b' ? p.M.bm : p.M.cm, cap, shadow, w === 'c' || p.M.f);
      if (w === 'c' && p.M.depth) im.customDepthMaterial = p.M.depth;
      im.name = 'weltwald ' + KN[p.k] + (p.lev ? ' mitte ' : ' nah ') + (w === 'b' ? 'stamm' : 'krone');
      if (old) {
        // what is written so far stays (a mesh grows in the middle of a fill)
        im.instanceMatrix.array.set(old.instanceMatrix.array.subarray(0, p.n * 16));
        if (im.instanceColor) im.instanceColor.array.set(old.instanceColor.array.subarray(0, p.n * 3));
        ROOT.remove(old);
        old.dispose();
      }
      ROOT.add(im);
      p[w] = im;
    }
    p.cap = cap;
  }
  // ---- the far cards: one instanced mesh for every kind (an atlas of five columns), Ratscher's far-tree program ----
  const CARD = { im: null, cap: 0, mat: null, tex: null, info: null, geo: null, ok: false, seas: -1 };
  const CK = 5;
  function atlasModels() {
    const K = kit().f;
    const ez = k => TREES[k] && TREES[k].bg && TREES[k].lg && TREES[k].leaf.map && TREES[k].leaf.map.image;
    const cols = [];
    for (const [sp, v] of [
      ['spruce', 'spruce:stand'],
      ['pine', 'pine:stand'],
      ['larch', 'larch:stand'],
    ]) {
      if (K) {
        const Md = K.models0[K.VI[v]];
        const B = K.mk.barkTex[FOREST.spec(sp).bark];
        const cm = new THREE.MeshBasicMaterial({
          map: K.mk.twig,
          vertexColors: true,
          alphaTest: 0.42,
          side: THREE.DoubleSide,
        });
        if (sp === 'larch') K.seasonal(cm, true);
        cols.push({
          parts: [
            [Md.bark, new THREE.MeshBasicMaterial({ map: B && B.map, vertexColors: true })],
            [Md.cards, cm],
          ],
        });
      } else if (ez('pine')) cols.push({ ez: 'pine' });
      else return null;
    }
    for (const k of ['oakA', 'aspen']) {
      if (!ez(k)) return null;
      cols.push({ ez: k });
    }
    return cols;
  }
  // the atlas: per column a tree in an orthographic view from the side (the lower two thirds of the column: C wide, 2 C high) and from
  // above (the upper third: C x C, the same width) – as the Klinge's far atlas; broadleaf with or without its leaves. Every column is
  // drawn so that the widest part of its crown lies at the same height of the card (CY), where the card's level plane is (cardGeo); the
  // tree stands at y0 of the card (the card is set that much lower). info: the share of the side cell the tree fills (w across, h up), y0
  const CY = 0.45;
  // the views from above keep TOP_A of their alpha (the card material tests at 0.24): where the atlas is seen in its fine levels a crown
  // from above stays whole; in the small mip levels – far away, or the level plane seen at a grazing angle from a hill or the road – its
  // average falls under the test and the plane is gone. Without it, a crown's average alpha passed there and each plane showed as an
  // olive square: carpets of squares along a stand's edge and over tree rows from above, dark lines across the crowns from the road
  const TOP_A = 0.28;
  function dimTops(rt, C) {
    if (!CARD.dim) {
      // the alpha of the upper third times TOP_A, the colour kept (blending only: no new program of the trees)
      const m = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        opacity: TOP_A,
        transparent: true,
        depthTest: false,
        depthWrite: false,
        blending: THREE.CustomBlending,
        blendEquation: THREE.AddEquation,
        blendSrc: THREE.ZeroFactor,
        blendDst: THREE.OneFactor,
        blendEquationAlpha: THREE.AddEquation,
        blendSrcAlpha: THREE.ZeroFactor,
        blendDstAlpha: THREE.SrcAlphaFactor,
      });
      const sc = new THREE.Scene();
      sc.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m));
      CARD.dim = { sc, cam: new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1) };
    }
    const ac = R.autoClear;
    R.autoClear = false;
    rt.viewport.set(0, 2 * C, C * CK, C);
    R.setRenderTarget(rt);
    R.render(CARD.dim.sc, CARD.dim.cam);
    R.autoClear = ac;
  }
  function drawAtlas(bare) {
    const cols = atlasModels();
    if (!cols) return false;
    const C = COARSE ? 192 : 256;
    if (!CARD.rt)
      CARD.rt = new THREE.WebGLRenderTarget(C * CK, C * 3, {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
        magFilter: THREE.LinearFilter,
      });
    const rt = CARD.rt,
      sv = SV.on.value,
      gi = GI.on.value,
      pt = R.getRenderTarget(),
      pc = R.getClearColor(new THREE.Color()),
      pa = R.getClearAlpha();
    SV.on.value = 0;
    GI.on.value = 0;
    R.setRenderTarget(rt);
    R.setClearColor(0x3f4b30, 0);
    R.clear();
    const info = [];
    cols.forEach((c, i) => {
      const sc = new THREE.Scene();
      sc.add(new THREE.AmbientLight(0xffffff, Math.PI));
      let crown;
      if (c.ez) {
        const K = TREES[c.ez];
        sc.add(new THREE.Mesh(K.bg, K.bark));
        if (!bare) sc.add(new THREE.Mesh(K.lg, K.leaf));
        crown = K.lg;
      } else {
        for (const [g, m] of c.parts) sc.add(new THREE.Mesh(g, m));
        crown = c.parts[1][0];
      }
      // the box of the full tree (with leaves): a card keeps its size through the year
      const bb = new THREE.Box3();
      if (c.ez) {
        const K = TREES[c.ez];
        for (const g of [K.bg, K.lg]) {
          if (!g.boundingBox) g.computeBoundingBox();
          bb.union(g.boundingBox);
        }
      } else bb.setFromObject(sc);
      if (!crown.boundingBox) crown.computeBoundingBox();
      const cb = crown.boundingBox,
        sz = bb.getSize(new THREE.Vector3()),
        ct = bb.getCenter(new THREE.Vector3()),
        hw = (Math.max(sz.x, sz.z) / 2) * 1.02,
        H = sz.y * 1.02,
        // the widest part of the crown (a cone at its foot, a round crown in its middle): a third up the crown
        f = THREE.MathUtils.clamp((cb.min.y - bb.min.y + 0.33 * (cb.max.y - cb.min.y)) / H, 0.25, 0.7),
        h = Math.min(1, H / (4 * hw), (1 - CY) / (1 - f), CY / f),
        y0 = CY - f * h,
        Hs = H / h,
        side = new THREE.OrthographicCamera(-Hs / 4, Hs / 4, (1 - y0) * Hs, -y0 * Hs, 0.1, 1000),
        top = new THREE.OrthographicCamera(-Hs / 4, Hs / 4, Hs / 4, -Hs / 4, 0.1, 1000);
      side.position.set(ct.x, bb.min.y, ct.z + 300);
      side.lookAt(ct.x, bb.min.y, ct.z);
      top.position.set(ct.x, bb.max.y + 200, ct.z);
      top.up.set(0, 0, -1);
      top.lookAt(ct.x, bb.min.y, ct.z);
      rt.scissorTest = true;
      rt.viewport.set(i * C, 0, C, 2 * C);
      rt.scissor.set(i * C, 0, C, 2 * C);
      R.setRenderTarget(rt);
      R.render(sc, side);
      rt.viewport.set(i * C, 2 * C, C, C);
      rt.scissor.set(i * C, 2 * C, C, C);
      R.setRenderTarget(rt);
      R.render(sc, top);
      info.push({ w: (2 * hw) / (Hs / 2), h, y0 });
    });
    rt.scissorTest = false;
    dimTops(rt, C);
    rt.viewport.set(0, 0, C * CK, C * 3);
    R.setRenderTarget(pt);
    R.setClearColor(pc, pa);
    SV.on.value = sv;
    GI.on.value = gi;
    CARD.info = info;
    CARD.bare = !!bare;
    const fk = kit().f;
    CARD.larch = fk ? fk.SEAS.value.clone() : null;
    return true;
  }
  // the card: two upright crossed planes (the side view) and a level one at CY (the view from above – a stand seen from a hill or the air
  // stays closed); normals up as the far trees of world/ratscher.js
  function cardGeo() {
    const a = new THREE.PlaneGeometry(1, 1),
      b = new THREE.PlaneGeometry(1, 1),
      c = new THREE.PlaneGeometry(1, 1);
    b.rotateY(Math.PI / 2);
    a.translate(0, 0.5, 0);
    b.translate(0, 0.5, 0);
    for (const g of [a, b]) {
      const u = g.attributes.uv;
      for (let i = 0; i < u.count; i++) u.setY(i, (u.getY(i) * 2) / 3);
    }
    c.rotateX(-Math.PI / 2);
    c.translate(0, CY, 0);
    {
      const u = c.attributes.uv;
      for (let i = 0; i < u.count; i++) u.setY(i, 2 / 3 + u.getY(i) / 3);
    }
    const g = BufferGeometryUtils.mergeGeometries([a, b, c]),
      nn = g.attributes.normal;
    for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0);
    return g;
  }
  // the card material: a copy of Ratscher's far trees with this atlas – the same shader patch and cache key, so the same program
  function cardSetup() {
    if (CARD.ok) return true;
    const src = RATSCHER.trees && RATSCHER.trees[0];
    if (!src || !src.material) return false;
    if (!drawAtlas(SEASON.leaf < 0.35)) return false;
    const m0 = src.material,
      m = m0.clone();
    m.map = CARD.rt.texture;
    m.alphaTest = 0.24; // a uniform (same program): far crowns stay dense in the small mip levels
    m.onBeforeCompile = m0.onBeforeCompile;
    m.customProgramCacheKey = m0.customProgramCacheKey;
    CARD.mat = m;
    CARD.geo = cardGeo();
    CARD.ok = true;
    cardGrow(3000);
    return true;
  }
  function cardGrow(cap, keep = 0) {
    const g = CARD.geo.clone();
    g.setAttribute(
      'aKind',
      new THREE.InstancedBufferAttribute(new Float32Array(cap), 1).setUsage(THREE.DynamicDrawUsage)
    );
    const im = new THREE.InstancedMesh(g, CARD.mat, cap);
    im.count = 0;
    im.visible = false;
    im.frustumCulled = false;
    im.castShadow = im.receiveShadow = false;
    im.userData.noMerge = true;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.setColorAt(0, tmpC.setRGB(1, 1, 1));
    im.instanceColor.setUsage(THREE.DynamicDrawUsage);
    im.name = 'weltwald karten';
    const old = CARD.im;
    if (old) {
      im.instanceMatrix.array.set(old.instanceMatrix.array.subarray(0, keep * 16));
      im.instanceColor.array.set(old.instanceColor.array.subarray(0, keep * 3));
      g.attributes.aKind.array.set(old.geometry.attributes.aKind.array.subarray(0, keep));
      ROOT.remove(old);
      old.geometry.dispose();
      old.dispose();
    }
    ROOT.add(im);
    CARD.im = im;
    CARD.cap = cap;
    CARD.tris = g.index ? g.index.count / 3 : g.attributes.position.count / 3;
  }
  // ---------------------------------------------------------------- the cells -------------------------------------------------------
  const Z = { index: null, state: 'idle', keys: [], busy: 0, rev: 0, err: '' };
  S.Z = Z;
  const insideRB = (x, y) => x > RB[0] && x < RB[2] && y > RB[1] && y < RB[3];
  const cellD = (i, j, x, y) =>
    Math.hypot(Math.max(i * CELL - x, 0, x - (i + 1) * CELL), Math.max(j * CELL - y, 0, y - (j + 1) * CELL));
  function zIndex() {
    Z.state = 'index';
    fetch(BASE + 'weltwald/z/index.json')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('index.json ' + r.status))))
      .then(j => {
        Z.index = j;
        Z.keys = Object.keys(j.cells || {});
        Z.state = 'ready';
      })
      .catch(e => {
        Z.state = 'error';
        Z.err = String(e);
      });
  }
  async function inflate(buf) {
    const ds = new DecompressionStream('deflate');
    return new Response(new Blob([buf]).stream().pipeThrough(ds)).arrayBuffer();
  }
  // WWB2 (tools/weltwald/baeume.py pack): magic, n, then deflate of the trees sorted by 25 m block, y, x – x (dm in the cell) as low and
  // high byte planes, y the same as differences, h (¼ m), r (dm), kind | flags; the rank (which trees a level thins) a hash of the place
  async function decode(c, buf) {
    const dv = new DataView(buf);
    if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'WWB2')
      throw new Error('not WWB2');
    const n = dv.getUint32(4, true),
      raw = new Uint8Array(await inflate(buf.slice(8))),
      x0 = c.i * CELL,
      y0 = c.j * CELL,
      T = {
        n,
        x: new Float32Array(n),
        y: new Float32Array(n),
        z: new Float32Array(n).fill(NaN),
        h: new Float32Array(n),
        r: new Float32Array(n),
        k: new Uint8Array(n),
        f: new Uint8Array(n),
        a: new Uint8Array(n),
        rot: new Float32Array(n),
        bs: new Uint32Array(NB * NB + 1),
      };
    let yd = 0;
    const cnt = T.bs;
    for (let t = 0; t < n; t++) {
      const xd = raw[t] | (raw[n + t] << 8);
      yd = (yd + (raw[2 * n + t] | (raw[3 * n + t] << 8))) & 0xffff;
      const x = x0 + xd / 10,
        y = y0 + yd / 10,
        kf = raw[6 * n + t];
      T.x[t] = x;
      T.y[t] = y;
      T.h[t] = raw[4 * n + t] / 4;
      T.r[t] = raw[5 * n + t] / 10;
      T.k[t] = kf & 15;
      T.f[t] = kf & 240;
      T.a[t] = Math.floor(hash(x * 1.731 + y * 0.913 + 17.3) * 256);
      T.rot[t] = hash(x * 0.731 + y * 1.913) * 6.2832;
      cnt[Math.min(NB - 1, (xd / 10 / BLK) | 0) + Math.min(NB - 1, (yd / 10 / BLK) | 0) * NB + 1]++;
    }
    // the trees come sorted by block: the start of each block
    for (let b = 0; b < NB * NB; b++) cnt[b + 1] += cnt[b];
    return T;
  }
  // the ground under the trees: the terrain as the tiles draw it (KERN.terrain), a few thousand per frame; again when tiles came
  const GROUND = { q: [], at: 0 };
  function groundSome(budget) {
    const t0 = performance.now();
    while (GROUND.q.length && performance.now() - t0 < budget) {
      const c = GROUND.q[0];
      if (!c.T || c.state !== 'ready') {
        GROUND.q.shift();
        continue;
      }
      const T = c.T,
        end = Math.min(T.n, c.zi + 1500);
      for (let t = c.zi; t < end; t++) {
        const z = KERN.terrain(T.x[t], T.y[t]);
        T.z[t] = Number.isFinite(z) ? z : NaN;
      }
      c.zi = end;
      if (end >= T.n) {
        c.zv = WELT.n.ok;
        c.zAll = true;
        GROUND.q.shift();
        Z.rev++;
      }
    }
  }
  function want(c) {
    if (!GROUND.q.includes(c)) {
      c.zi = 0;
      GROUND.q.push(c);
    }
  }
  function load(key) {
    const [i, j] = key.split('_').map(Number),
      c = { key, i, j, state: 'loading', T: null, zi: 0, zv: -1 };
    S.cells.set(key, c);
    Z.busy++;
    fetch(BASE + 'weltwald/z/' + key + '.bin')
      .then(r => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(key + ' ' + r.status))))
      .then(b => {
        S.n.bytes += b.byteLength;
        return decode(c, b);
      })
      .then(T => {
        Z.busy--;
        if (c.state === 'gone') return;
        c.T = T;
        c.state = 'ready';
        S.n.fetched++;
        want(c);
      })
      .catch(e => {
        Z.busy--;
        c.state = 'error';
        Z.err = String(e);
      });
  }
  function drop(c) {
    c.state = 'gone';
    c.T = null;
    S.cells.delete(c.key);
    S.n.freed++;
    Z.rev++;
  }
  // ---------------------------------------------------------------- choosing what is drawn --------------------------------------------
  const fwd = new THREE.Vector3();
  // the camera: where, which way (azimuth, the half width of the view with a margin), looking steeply (all around)
  function camNow() {
    cam.getWorldDirection(fwd);
    const yaw = Math.atan2(fwd.x, -fwd.z),
      pitch = Math.asin(THREE.MathUtils.clamp(fwd.y, -1, 1)),
      hfov = Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.aspect);
    return { x: cam.position.x, y: -cam.position.z, yaw, pitch, hfov };
  }
  const angd = (a, b) => {
    let d = a - b;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return Math.abs(d);
  };
  // the trees within radius rf of the camera that are in view (blocks of 25 m; in the blocks round the camera each tree), passed to
  // fn(T, t, d); within 8 m all round (their shadows fall into the view)
  function each(C, rmin, rmax, margin, fn) {
    const all = Math.abs(C.pitch) > 0.75,
      half = C.hfov + margin;
    for (const c of S.cells.values()) {
      if (c.state !== 'ready' || !c.T || cellD(c.i, c.j, C.x, C.y) > rmax) continue;
      const T = c.T,
        bx0 = c.i * CELL,
        by0 = c.j * CELL;
      for (let bj = 0; bj < NB; bj++)
        for (let bi = 0; bi < NB; bi++) {
          const b = bi + bj * NB,
            s0 = T.bs[b],
            s1 = T.bs[b + 1];
          if (s0 === s1) continue;
          const cx = bx0 + (bi + 0.5) * BLK,
            cy = by0 + (bj + 0.5) * BLK,
            dc = Math.hypot(cx - C.x, cy - C.y);
          if (dc - BLK * 0.71 > rmax || dc + BLK * 0.71 < rmin) continue;
          const byTree = !all && dc <= 40;
          if (!all && dc > 40) {
            const az = Math.atan2(cx - C.x, cy - C.y),
              ar = Math.asin(Math.min(1, (BLK * 0.75) / dc));
            if (angd(az, C.yaw) - ar > half) continue;
          }
          for (let t = s0; t < s1; t++) {
            const dx = T.x[t] - C.x,
              dy = T.y[t] - C.y,
              d = Math.hypot(dx, dy);
            if (d < rmin || d > rmax) continue;
            if (byTree && d > 8 && angd(Math.atan2(dx, dy), C.yaw) - Math.asin(Math.min(1, 6 / d)) > half) continue;
            fn(T, t, d);
          }
        }
    }
  }
  // instance matrix of a tree straight into the array (rotation about up, scale sx/sy, at x, y, z model)
  function put(arr, i, x, y, z, rot, sx, sy) {
    const c = Math.cos(rot),
      s = Math.sin(rot),
      o = i * 16;
    arr[o] = c * sx;
    arr[o + 1] = 0;
    arr[o + 2] = -s * sx;
    arr[o + 3] = 0;
    arr[o + 4] = 0;
    arr[o + 5] = sy;
    arr[o + 6] = 0;
    arr[o + 7] = 0;
    arr[o + 8] = s * sx;
    arr[o + 9] = 0;
    arr[o + 10] = c * sx;
    arr[o + 11] = 0;
    arr[o + 12] = x;
    arr[o + 13] = z;
    arr[o + 14] = -y;
    arr[o + 15] = 1;
  }
  // the 3D trees (near and middle): every tree within rnB (broadleaf) / rnC (conifers) of the camera, beyond it to rm the conifers at a
  // stand's edge and a share of the inner ones; what is left becomes a card. Budgets: at most MAXCALL meshes (when more kinds are in view,
  // those with the fewest trees become cards – near trees weigh more) and TRI triangles of all trees in view (3D trees nearest first;
  // the cards get the rest, the far ones thinned more when they do not fit)
  const MAXCALL = COARSE ? 8 : 10;
  const TRI = COARSE ? 56000 : 145000,
    TRI3D = COARSE ? 30000 : 88000; // the share of the 3D trees when the cards need the rest
  const NEARSET = [],
    CARDSET = [],
    FARSET = [];
  const NEARCAP = COARSE ? 90 : 220,
    MIDCAP = COARSE ? 900 : 2600,
    CARDCAP = COARSE ? 9000 : 24000;
  function pickNear(C, Bd) {
    NEARSET.length = 0;
    CARDSET.length = 0;
    each(C, 0, Bd.rm, 0.25, (T, t, d) => {
      const k = T.k[t];
      let lev = -1;
      if (BROAD(k)) {
        if (d < Bd.rnB) lev = 0;
      } else if (d < Bd.rnC) lev = 0;
      else if (T.f[t] & 16 || T.a[t] / 255 < Bd.mid * (1 - (0.55 * (d - Bd.rnC)) / (Bd.rm - Bd.rnC))) lev = 1;
      if (lev < 0) CARDSET.push(T, t, d);
      else NEARSET.push(T, t, d, k, lev);
    });
  }
  let NEARKEY = '';
  function fillNear() {
    // count per mesh pair, and the budget of draw calls (one call stays for the cards)
    const cnt = new Map();
    for (let q = 0; q < NEARSET.length; q += 5) {
      const key = NEARSET[q + 3] * 2 + NEARSET[q + 4];
      cnt.set(key, (cnt.get(key) || 0) + (NEARSET[q + 4] ? 1 : 6));
    }
    const order = [...cnt.entries()].sort((p, q) => q[1] - p[1]),
      allow = new Set(),
      maxPairs = Math.floor((MAXCALL - 1) / 2);
    for (const [key] of order) if (allow.size < maxPairs) allow.add(key);
    for (const p of IM.values()) p.n = 0;
    // the triangles the 3D trees may take: what the cards leave (6 a card), at least TRI3D
    const cardsWant = FARSET.length / 3 + CARDSET.length / 3 + NEARSET.length / 5,
      budget = Math.max(TRI3D, TRI - 6 * cardsWant);
    // by distance, so that the caps keep the nearest
    const idx = [];
    for (let q = 0; q < NEARSET.length; q += 5) idx.push(q);
    idx.sort((p, q) => NEARSET[p + 2] - NEARSET[q + 2]);
    let nN = 0,
      nM = 0,
      tris = 0,
      key = '';
    for (const q of idx) {
      const T = NEARSET[q],
        t = NEARSET[q + 1],
        d = NEARSET[q + 2],
        k = NEARSET[q + 3],
        lev = NEARSET[q + 4];
      // the ground as the tiles draw it now (finer tiles may have come since the cell was read)
      const z = KERN.terrain(T.x[t], T.y[t]);
      if (!Number.isFinite(z)) continue;
      T.z[t] = z;
      const capLev = lev ? MIDCAP : NEARCAP;
      const p = allow.has(k * 2 + lev) && (lev ? nM : nN) < capLev ? pair(k, lev) : null;
      const leaf = leafy(k, T.a[t]),
        tt = p ? p.M.tb + (leaf ? p.M.tc : 0) : 0;
      if (p && p.n >= p.cap && p.cap < capLev && tris + tt <= budget) grow(p, Math.min(capLev, p.cap * 2));
      if (!p || p.n >= p.cap || tris + tt > budget) {
        CARDSET.push(T, t, d);
        continue;
      }
      tris += tt;
      const M = p.M,
        h = T.h[t],
        sy = h / M.H,
        sx = THREE.MathUtils.clamp(T.r[t] / M.W, sy * 0.72, sy * 1.35);
      put(p.b.instanceMatrix.array, p.n, T.x[t], T.y[t], z - (M.f ? 0.05 : 0.1), T.rot[t], sx, sy);
      const g = 0.86 + (T.a[t] / 255) * 0.24;
      // the bark of the garden's kinds has no instance colours (as in the garden: the same program)
      if (p.b.instanceColor) p.b.instanceColor.setXYZ(p.n, g, g, g);
      if (BROAD(k)) leafColour(k, g, T.a[t], tmpC);
      else tmpC.setRGB(g, g, g);
      // a bare broadleaf tree: bark only – marked by a negative colour, its crown left out below
      if (!leaf) tmpC.setRGB(-1, -1, -1);
      p.c.instanceColor.setXYZ(p.n, tmpC.r, tmpC.g, tmpC.b);
      p.n++;
      if (lev) nM++;
      else {
        nN++;
        key += t + ',';
      }
    }
    let calls = 0;
    tris = 0;
    for (const p of IM.values()) {
      const b = p.b,
        c = p.c,
        cm = c.instanceMatrix.array,
        bm = b.instanceMatrix.array,
        cc = c.instanceColor.array;
      b.count = p.n;
      // the crowns: the bark's matrices of the trees in leaf, packed (a bare tree has none)
      let j = 0;
      for (let i = 0; i < p.n; i++) {
        if (cc[i * 3] < 0) continue;
        for (let e = 0; e < 16; e++) cm[j * 16 + e] = bm[i * 16 + e];
        cc[j * 3] = cc[i * 3];
        cc[j * 3 + 1] = cc[i * 3 + 1];
        cc[j * 3 + 2] = cc[i * 3 + 2];
        j++;
      }
      c.count = j;
      for (const im of [b, c]) {
        im.visible = im.count > 0 && !S.hidden;
        im.instanceMatrix.needsUpdate = true;
        if (im.instanceColor) im.instanceColor.needsUpdate = true;
        if (im.visible) calls++;
      }
      tris += b.count * p.M.tb + c.count * p.M.tc;
    }
    S.sel.near = nN;
    S.sel.mid = nM;
    S.sel.nearTris = Math.round(tris);
    S.sel.nearCalls = calls;
    trunks();
    // a new sun shadow map only for a changed near set while walking (driving, the shadow box follows the car and redraws anyway)
    const ch = key !== NEARKEY;
    NEARKEY = key;
    return ch;
  }
  // the trees from rm to rf: thinned with distance (a share by rank; the cards kept a little wider) – chosen every few metres
  const keepFar = (d, Bd) => Math.max(0.42, 1 - (0.6 * (d - Bd.rm)) / (Bd.rf - Bd.rm));
  function pickFar(C, Bd) {
    FARSET.length = 0;
    each(C, Bd.rm - 14, Bd.rf, 0.35, (T, t, d) => {
      const share = keepFar(d, Bd);
      if (T.a[t] / 255 < share) FARSET.push(T, t, share);
    });
  }
  // the card mesh: the cards left over from the near pass, then the far ones (those that came into the middle band since are skipped);
  // when they do not fit the triangles left, the far ones thinned more (and kept wider)
  function fillCards(C, Bd) {
    if (!cardSetup()) return;
    let n = 0;
    const cap = Math.min(CARDCAP, Math.max(0, Math.floor((TRI - (S.sel.nearTris || 0)) / CARD.tris))),
      scale = Math.min(1, Math.max(0.05, (cap - CARDSET.length / 3) / Math.max(1, FARSET.length / 3)));
    const take = (T, t, wide) => {
      if (!Number.isFinite(T.z[t])) return;
      if (n >= CARD.cap) {
        if (CARD.cap >= cap) return;
        cardGrow(Math.min(CARDCAP, CARD.cap * 2), n);
      }
      const k = T.k[t],
        col = COLUMN[k],
        I = CARD.info[col],
        // the tree's own shape in the side cell (C x 2C): width / height
        asp = I.w / (2 * I.h),
        h = T.h[t],
        sy = h / I.h,
        wv = THREE.MathUtils.clamp(T.r[t] * 2 * wide, h * asp * 0.75, h * asp * 1.35 * wide),
        sx = wv / I.w,
        im = CARD.im;
      put(im.instanceMatrix.array, n, T.x[t], T.y[t], T.z[t] - 0.3 - I.y0 * sy, T.rot[t], sx, sy);
      im.geometry.attributes.aKind.array[n] = col;
      const g = 0.88 + (T.a[t] / 255) * 0.2;
      if (BROAD(k) && !CARD.bare) leafColour(k, g, T.a[t], tmpC);
      else tmpC.setRGB(g, g, g);
      if (!BROAD(k)) tmpC.multiplyScalar(0.86);
      im.instanceColor.setXYZ(n, tmpC.r, tmpC.g, tmpC.b);
      n++;
    };
    for (let q = 0; q < CARDSET.length; q += 3) if (n < cap) take(CARDSET[q], CARDSET[q + 1], 1);
    for (let q = 0; q < FARSET.length && n < cap; q += 3) {
      const T = FARSET[q],
        t = FARSET[q + 1],
        share = FARSET[q + 2] * scale;
      if (scale < 1 && T.a[t] / 255 >= share) continue;
      if (Math.hypot(T.x[t] - C.x, T.y[t] - C.y) < Bd.rm) continue;
      take(T, t, Math.min(1.6, 1 / Math.sqrt(share)));
    }
    const im = CARD.im;
    im.count = n;
    im.visible = n > 0 && !S.hidden;
    im.instanceMatrix.needsUpdate = true;
    im.instanceColor.needsUpdate = true;
    im.geometry.attributes.aKind.needsUpdate = true;
    S.sel.cards = n;
    S.sel.cardTris = n * CARD.tris;
    S.sel.farScale = +scale.toFixed(2);
  }
  // ---- trunks: walkers and vehicles stop at the trees near the observer (KERN.pushOut, 8 m hash) ----
  const TR = { grid: new Map(), n: 0 };
  function trunks() {
    TR.grid.clear();
    TR.n = 0;
    for (const p of IM.values()) {
      if (p.lev || p.k === 7) continue;
      const m = p.b.instanceMatrix.array;
      for (let i = 0; i < p.n; i++) {
        const o = i * 16,
          x = m[o + 12],
          y = -m[o + 14],
          h = m[o + 5] * p.M.H;
        if (h < 4) continue;
        const r = Math.min(0.42, 0.06 + h * 0.0095),
          key = Math.floor(x / 8) + ',' + Math.floor(y / 8);
        let a = TR.grid.get(key);
        if (!a) TR.grid.set(key, (a = []));
        a.push(x, y, r);
        TR.n++;
      }
    }
  }
  function pushOut(p, r) {
    if (!TR.n || insideRB(p[0], p[1])) return undefined;
    let moved = false;
    const ci = Math.floor(p[0] / 8),
      cj = Math.floor(p[1] / 8);
    for (let i = ci - 1; i <= ci + 1; i++)
      for (let j = cj - 1; j <= cj + 1; j++) {
        const a = TR.grid.get(i + ',' + j);
        if (!a) continue;
        for (let q = 0; q < a.length; q += 3) {
          const dx = p[0] - a[q],
            dy = p[1] - a[q + 1],
            rr = r + a[q + 2],
            d = Math.hypot(dx, dy);
          if (d < rr && d > 1e-6) {
            p[0] = a[q] + (dx / d) * rr;
            p[1] = a[q + 1] + (dy / d) * rr;
            moved = true;
          }
        }
      }
    return moved ? true : undefined;
  }
  KERN.provide('pushOut', pushOut, 14);
  // ---------------------------------------------------------------- the loop ----------------------------------------------------------
  let acc = 0,
    seasT = 0;
  function hideAll(v) {
    if (S.hidden === v) return;
    S.hidden = v;
    for (const p of IM.values()) for (const im of [p.b, p.c]) im.visible = !v && im.count > 0;
    if (CARD.im) CARD.im.visible = !v && CARD.im.count > 0;
    markDirty(true);
  }
  const view = {
    x: 1e9,
    y: 1e9,
    yaw: 0,
    tier: '',
    rev: -1,
    fx: 1e9,
    fy: 1e9,
    fyaw: 0,
    frev: -1,
    season: -1,
    steep: false,
  };
  function tick(dt) {
    if (!LOADED) return;
    acc += dt;
    groundSome(GROUND.q.length ? 3 : 0);
    // the plan view and the map: the photo shows the forests
    hideAll(P.mode === 'top' || !!RATSCHER.map);
    const o = KERN.where();
    if (!o) return;
    const Bd = band();
    // the index once the observer comes near the square's edge or is beyond it
    if (!Z.index) {
      const dEdge = Math.min(o[0] - RB[0], RB[2] - o[0], o[1] - RB[1], RB[3] - o[1]);
      if (Z.state === 'idle' && dEdge < Bd.load + 200) zIndex();
      return;
    }
    // cells: fetch the nearest wanted (two at a time), free the far ones
    if (acc > 0.3) {
      acc = 0;
      for (const c of [...S.cells.values()]) if (cellD(c.i, c.j, o[0], o[1]) > Bd.free) drop(c);
      if (Z.busy < 2) {
        let best = null,
          bd = Bd.load;
        for (const key of Z.keys) {
          if (S.cells.has(key)) continue;
          const [i, j] = key.split('_').map(Number),
            d = cellD(i, j, o[0], o[1]);
          if (d < bd) {
            bd = d;
            best = key;
          }
        }
        if (best) load(best);
      }
      // tiles came since a cell's ground was read: read it again (the far cards stand on what is drawn)
      for (const c of S.cells.values())
        if (c.state === 'ready' && c.zAll && c.zv !== WELT.n.ok && cellD(c.i, c.j, o[0], o[1]) < Bd.rf) want(c);
    }
    // the season every few seconds; the atlas drawn again when the broadleaf lost or got its leaves, or the larch turned
    if ((seasT -= dt) <= 0) {
      seasT = 3;
      const q = seasonOf(doyNow()),
        ch = Math.abs(q.leaf - SEASON.leaf) + Math.abs(q.gold - SEASON.gold) + Math.abs(q.fresh - SEASON.fresh) > 0.01;
      SEASON = q;
      if (ch) view.season = -1;
      if (CARD.ok) {
        const bare = SEASON.leaf < 0.35,
          fk = kit().f,
          lq = fk && CARD.larch,
          ld = lq
            ? Math.abs(fk.SEAS.value.x - lq.x) + Math.abs(fk.SEAS.value.y - lq.y) + Math.abs(fk.SEAS.value.z - lq.z)
            : 0;
        if (bare !== CARD.bare || ld > 0.12) {
          drawAtlas(bare);
          view.season = -1;
        }
      }
    }
    if (S.hidden) return;
    const C = camNow(),
      steep = Math.abs(C.pitch) > 0.75,
      again = view.rev !== Z.rev || view.tier !== RENDER.tier || view.season < 0 || steep !== view.steep;
    const nearNow = again || Math.hypot(C.x - view.x, C.y - view.y) > 2.5 || angd(C.yaw, view.yaw) > 0.07;
    if (!nearNow) return;
    const farNow = again || Math.hypot(C.x - view.fx, C.y - view.fy) > 9 || angd(C.yaw, view.fyaw) > 0.12;
    const t0 = performance.now();
    view.x = C.x;
    view.y = C.y;
    view.yaw = C.yaw;
    view.rev = Z.rev;
    view.tier = RENDER.tier;
    view.season = 1;
    view.steep = steep;
    if (farNow) {
      view.fx = C.x;
      view.fy = C.y;
      view.fyaw = C.yaw;
      pickFar(C, Bd);
    }
    pickNear(C, Bd);
    const shadow = fillNear();
    fillCards(C, Bd);
    S.sel.ms = +(performance.now() - t0).toFixed(1);
    S.sel.tris = (S.sel.nearTris || 0) + (S.sel.cardTris || 0);
    S.sel.calls = (S.sel.nearCalls || 0) + (CARD.im && CARD.im.visible ? 1 : 0);
    markDirty(shadow && P.mode === 'walk' && S.sel.near > 0);
  }
  let LOADED = false;
  whenLoaded(() => {
    LOADED = true;
  });
  KERN.tick(tick, 'weltwald');
  // ---------------------------------------------------------------- for tests ---------------------------------------------------------
  S.status = () => ({
    on: S.on,
    index: Z.state,
    cells: [...S.cells.values()].filter(c => c.state === 'ready').length,
    loading: Z.busy,
    ground: GROUND.q.length,
    trees: [...S.cells.values()].reduce((n, c) => n + (c.T ? c.T.n : 0), 0),
    err: Z.err,
    sel: { ...S.sel },
    meshes: [...IM.values()].map(p => [KN[p.k], p.lev, p.n, p.cap]),
    cards: CARD.ok ? { n: CARD.im.count, cap: CARD.cap, bare: CARD.bare } : null,
    season: S.season(),
    trunks: TR.n,
  });
  // the trees of the loaded cells near (x, y) within r: [x, y, h, r, kind, flags] (tests)
  S.near = (x, y, r) => {
    const out = [];
    for (const c of S.cells.values()) {
      if (!c.T || cellD(c.i, c.j, x, y) > r) continue;
      const T = c.T;
      for (let t = 0; t < T.n; t++)
        if (Math.hypot(T.x[t] - x, T.y[t] - y) <= r)
          out.push([+T.x[t].toFixed(2), +T.y[t].toFixed(2), +T.h[t].toFixed(2), +T.r[t].toFixed(2), T.k[t], T.f[t]]);
    }
    return out;
  };
  // the trunks that stop walkers now: [[x, y, r], …] (tests)
  S.trunkList = (n = 20) => {
    const out = [];
    for (const a of TR.grid.values())
      for (let q = 0; q < a.length && out.length < n; q += 3) out.push([a[q], a[q + 1], a[q + 2]]);
    return out;
  };
  S.settled = () =>
    Z.state === 'ready' && !Z.busy && !GROUND.q.length && [...S.cells.values()].every(c => c.state !== 'loading');
  S.root = ROOT;
  return S;
})();
window.WWALD = WWALD;
