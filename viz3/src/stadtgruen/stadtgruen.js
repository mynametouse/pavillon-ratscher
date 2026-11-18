// ===================== feat/stadtgruen: Schleusingen's street trees and green (STADTGRUEN) =====================
// Falko, 17.11.2026, after comparing the model with private views from the street: the town's streets were bare, in reality
// Hildburghäuser, Suhler and Ilmenauer Straße are lined with trees. The trees of dist/stadtgruen/baeume.json (tools/stadtgruen/build.py:
// rows along the three roads after the aerial images and the private views, trees in yards, gardens, by the castle and the brook from
// the aerial images and OpenStreetMap, hedges) stand while the town stands: built when the zone 'schleusingen' (welt/schleusingen.js)
// is ready, freed when it goes – nothing at the start. Nothing in welt/schleusingen.js changes: the town's state comes from KERN's
// 'zone' events, the trunks stop the walker and the vehicles through a KERN pushOut provider.
// Drawing: the species are ez-tree kinds made the way the garden's are (garden/trees.js buildTreeKind – the same materials, so the same
// shader programs; ash, oak, conifer, fruit tree and the hedge's bush are the garden's own kinds), one instanced mesh per kind, part
// (bark, crown) and level (full / mid / far, the garden's levels: barkLOD, thinned leaf cards), filled again for the camera when it moved
// or turned (only what is in front beyond the near ring); beyond the far ring crossed cards from the tree atlas of world/ratscher.js
// (its material and geometry, one instanced mesh per 400 m cell). The near level casts the sun's shadow. The season of the game's date:
// autumn colours through the instance colour of the crowns (as the garden planner's plants), leaf fall thins the crown (a thinner level),
// bare in winter (no crown; oak and hornbeam hedges keep some dry leaves). Draw-call budget: ≤ 6 per species in view + the cards.
import * as THREE from 'three';
import { BASE, cam, COARSE, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { buildTreeKind, thinCards, treeLeafLevels, TREES } from '../garden/trees.js';
import { RATSCHER } from '../world/ratscher.js';
import { SCHL } from '../welt/schleusingen.js';
import { RENDER } from '../render/render.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { SGREGELN as G } from './sg_regeln.js';
export const STADTGRUEN = (() => {
  const S = {
    on: !!SCHL.on && !/[?&]nostadtgruen\b/.test(location.search),
    state: 'idle',
    err: '',
    trees: [],
    off: {},
    meshes: [],
    ms: 0,
    loadMs: 0,
    doy: null,
    built: 0,
    freed: 0,
  };
  window.STADTGRUEN = S;
  if (!S.on) return S;

  // ---- the species' 3D kinds: own ones made like the garden's trees (same materials and programs), else the garden's ----
  const OWN = {
    // lime: a straight stem, a dense oval crown from about a third of the height
    linde: {
      key: 'sg-linde',
      preset: 'Oak Medium',
      seed: 1712,
      tint: 0x9db97e,
      mod: o => {
        Object.assign(o.branch.angle, { 1: 48, 2: 40, 3: 34 });
        Object.assign(o.branch.children, { 0: 9, 1: 5, 2: 3 });
        o.branch.start['1'] = 0.32;
        o.branch.gnarliness['1'] = 0.05;
        o.branch.force.strength = 0.012;
        o.leaves.count = 12;
        o.leaves.size = 3.0;
        o.leaves.sizeVariance = 0.4;
        o.leaves.start = 0.0;
      },
    },
    // maple: a rounder, wider crown with lobed leaves
    ahorn: {
      key: 'sg-ahorn',
      preset: 'Oak Medium',
      seed: 2207,
      tint: 0xa7c27f,
      mod: o => {
        Object.assign(o.branch.angle, { 1: 56, 2: 44, 3: 36 });
        Object.assign(o.branch.children, { 0: 8, 1: 5, 2: 3 });
        o.branch.start['1'] = 0.26;
        o.branch.gnarliness['1'] = 0.08;
        o.leaves.count = 12;
        o.leaves.size = 3.0;
        o.leaves.start = 0.0;
      },
    },
    // horse chestnut: a broad dome, big leaves
    kastanie: {
      key: 'sg-kastanie',
      preset: 'Oak Medium',
      seed: 3301,
      tint: 0x98b276,
      mod: o => {
        Object.assign(o.branch.angle, { 1: 62, 2: 46, 3: 38 });
        Object.assign(o.branch.children, { 0: 8, 1: 5, 2: 3 });
        o.branch.start['1'] = 0.22;
        o.leaves.count = 11;
        o.leaves.size = 3.5;
        o.leaves.start = 0.0;
      },
    },
    // birch: slender, light, white bark
    birke: {
      key: 'sg-birke',
      preset: 'Aspen Medium',
      seed: 808,
      tint: 0xc6d496,
      sommer: true, // feat/fotorealismus (foto-baeume): the aspen's leaf picture is October's gold – its summer green (eztree/textures.js); the autumn comes from the crown's colour as for the other kinds
      mod: o => {
        o.bark.type = 'birch';
        o.leaves.size = 2.1;
      },
    },
  };
  const GARDEN = { esche: 'ash', eiche: 'oakA', nadel: 'pine', obst: 'apple', hecke: 'bushB' };
  const HECKE = G.BY_ID.hecke;
  // species index → { K: the kind, B: bark per level, L: crown per level, avg: the leaf picture's mean colour, own } – while the town stands
  const KINDS = {};
  function kindOf(ai) {
    if (KINDS[ai] !== undefined) return KINDS[ai];
    const id = G.ARTEN[ai].id;
    let K = null,
      own = false;
    if (OWN[id])
      try {
        K = buildTreeKind(OWN[id]);
        own = true;
        // less sky sheen on the leaves (backlit they look frosted – as the Dorflinde, world/village_props.js)
        K.leaf.envMapIntensity = 0.4;
        K.leaf.roughness = 0.92;
      } catch (e) {
        console.warn('stadtgruen: Baumart', id, e);
      }
    if (!K) K = TREES[GARDEN[id]] || TREES.ash || TREES.oakA || null;
    if (!K) return (KINDS[ai] = null);
    const LG = treeLeafLevels(K),
      mid = K.bgMid || K.bg,
      far = K.bgFar || mid,
      // the near crown: a big one with fewer, slightly larger cards (as the garden planner's, gplan/gplan_3d.js) – its own, not shared
      near = K.lg.index && K.lg.index.count > 15000 ? thinCards(K.lg, 0.6, 1.24) : K.lg;
    // on a phone the full level is the garden's mid one; a hedge's bushes never need more (their full bark is twigs)
    const k =
      COARSE || id === 'hecke'
        ? { B: [mid, far, far], L: [LG[1], LG[2], LG[2]] }
        : { B: [K.bg, mid, far], L: [near, LG[1], LG[2]] };
    k.K = K;
    k.own = own;
    k.near = near !== K.lg ? near : null;
    k.avg = leafAvg(K.leaf);
    return (KINDS[ai] = k);
  }
  // the mean colour of a crown's leaf picture (linear, times the material colour): what the instance colour multiplies
  function leafAvg(mat) {
    const ref = new THREE.Color('#6b8a3a');
    const img = mat && mat.map && mat.map.image;
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
      return new THREE.Color().setRGB(r / n / 255, gg / n / 255, b / n / 255, THREE.SRGBColorSpace).multiply(mat.color);
    } catch (e) {
      return ref;
    }
  }
  // ---- the areas: Schleusingen while the town (welt/schleusingen.js) stands; Ratscher's village while the observer is near it, only
  // what its trees of the canopy height model and the village lack (the garden and the neighbours' plots as they are). One at a time
  // (they lie 2 km apart). Each: its data, what it keeps clear of when it is built (context) ----
  const AREAS = {
    schleusingen: { file: 'stadtgruen/baeume.json', context: () => contextTown() },
    // the L 1625 south of the village (tools/stadtgruen/build.py --ratscher): built when one comes within `near` of a point along the
    // road (from the garden the nearest is 490 m: not at the start), freed beyond `far`
    ratscher: {
      file: 'stadtgruen/ratscher.json',
      context: () => contextVillage(),
      seasons: false,
      c: [
        [-760, -60],
        [-420, -250],
        [0, -500],
        [300, -540],
      ],
      near: 380,
      far: 470,
    },
  };
  function wanted() {
    if (SCHL.state === 'ready') return 'schleusingen';
    if (SCHL.state !== 'idle' || !(window.GAME && GAME.loaded && GAME.loaded())) return null;
    const o = KERN.where(),
      R = AREAS.ratscher;
    if (!o || R.missing) return null;
    let d = 1e9;
    for (const c of R.c) d = Math.min(d, Math.hypot(o[0] - c[0], o[1] - c[1]));
    return d < R.near || (S.area === 'ratscher' && d < R.far) ? 'ratscher' : null;
  }
  // ---- loading, building, freeing ----
  let run = 0;
  async function start(area) {
    if (S.state !== 'idle') return;
    const my = ++run,
      t0 = performance.now(),
      A = AREAS[area];
    S.area = area;
    S.state = 'loading';
    S.err = '';
    try {
      if (!A.data) {
        const r = await fetch(BASE + A.file);
        if (!r.ok) {
          if (r.status === 404) A.missing = true; // no data for this area on this host
          throw new Error(A.file + ' ' + r.status);
        }
        A.data = await r.json();
      }
      if (my !== run) return;
      S.loadMs = Math.round(performance.now() - t0);
      S.data = A.data;
      S.trees = G.decode(A.data);
      S.state = 'kinds';
      S.kq = [...new Set(S.trees.map(t => t.art))];
    } catch (e) {
      if (my !== run) return;
      S.state = 'error';
      S.err = String((e && e.message) || e);
      console.warn('stadtgruen', e);
    }
  }
  // the kinds one per frame (an ez-tree takes a moment), then the rest at once
  function stepBuild() {
    if (S.state !== 'kinds') return;
    if (S.kq.length) {
      const t0 = performance.now();
      kindOf(S.kq.shift());
      S.kindMs = (S.kindMs || 0) + performance.now() - t0;
      return;
    }
    const t0 = performance.now();
    try {
      build();
      S.ms = Math.round(performance.now() - t0 + (S.kindMs || 0));
      S.state = 'ready';
      S.built++;
      KERN.emit('stadtgruen:ready', { n: S.shown, ms: S.ms });
    } catch (e) {
      S.state = 'error';
      S.err = String((e && e.message) || e);
      console.warn('stadtgruen build', e);
    }
    S.kindMs = 0;
  }
  // what stands in the town now: houses with their doors, lamps, the Markt and its trees, the shops' pads and bays, parked cars, stops
  function contextTown() {
    const C = { blds: [], lamps: [], bays: [], pads: [], stops: [], keep: [], markt: null };
    for (const b of SCHL.bld || []) {
      if (!b.f) continue;
      let R = 0;
      for (let k = 0; k < b.f.length; k += 2) R = Math.max(R, Math.hypot(b.f[k] - b.cx, b.f[k + 1] - b.cy));
      const d = b.doorFac;
      // the door's outward normal: the footprints run counter-clockwise (stadt.json), outside is right of a wall's direction
      C.blds.push({
        f: b.f,
        cx: b.cx,
        cy: b.cy,
        R,
        door: d ? [d.ax + d.dx * d.u, d.ay + d.dy * d.u] : null,
        n: d ? [d.dy, -d.dx] : null,
        sign: !!((b.s && b.s.length) || b.lm === 'rathaus'),
      });
    }
    for (const l of SCHL.lamps || []) C.lamps.push([l.x, l.y]);
    if (SCHL.data && SCHL.data.marktplatz) C.markt = SCHL.data.marktplatz;
    // the Markt trees of welt/schleusingen.js: their instance matrices (world x, −y)
    const m4 = new THREE.Matrix4(),
      v = new THREE.Vector3();
    for (const m of SCHL.meshes || [])
      if (m.isInstancedMesh && /trees$/.test(m.name))
        for (let i = 0; i < m.count; i++) {
          m.getMatrixAt(i, m4);
          v.setFromMatrixPosition(m4);
          C.keep.push([v.x, -v.z]);
        }
    const L = window.LAEDEN && LAEDEN.data;
    if (L) {
      for (const sh of L.shops || [])
        for (const p of (sh.parts || []).concat(sh.annex || [])) if (p.f) C.pads.push(p.f);
      for (const lot of L.lots || []) for (const b of lot.bays || []) C.bays.push(b);
    }
    const D = window.DINGE && DINGE.places;
    if (D) for (const p of D) if (p && isFinite(p.x) && isFinite(p.y)) C.bays.push([p.x, p.y, p.az || 0]);
    return C;
  }
  // in the village: whatever is solid within reach (walls and trunks of the canopy height model through KERN.pushOut – world/
  // worldcol.js), the lamps of the village
  const probe = [0, 0];
  function contextVillage() {
    const lamps = [];
    for (const l of window.VPROPS && VPROPS.lamps ? VPROPS.lamps : []) if (l && isFinite(l.x)) lamps.push([l.x, l.y]);
    // the world's own trees (canopy height model, world/ratscher.js; the forest's at the Klinge too): none added within 4 m of one
    const own = [],
      xy = RATSCHER.treeXY || [];
    for (let i = 0; i + 1 < xy.length; i += 3) own.push({ x: xy[i], y: xy[i + 1] });
    for (const f of RATSCHER.forestCHM || []) own.push({ x: f[0], y: f[1] });
    const roads = window.ROADS;
    return {
      lamps,
      trees: G.grid(own, 16),
      road: roads && roads.edgeAt ? (x, y) => roads.edgeAt(x, y) : null,
      solid: (x, y, r) => {
        probe[0] = x;
        probe[1] = y;
        return KERN.pushOut(probe, r) === true;
      },
    };
  }
  const ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  function build() {
    const C = AREAS[S.area].context();
    S.off = {};
    for (const t of S.trees) {
      t.off = G.blocked(t, C);
      if (t.off) S.off[t.off] = (S.off[t.off] || 0) + 1;
      t.z = KERN.ground(t.x, t.y);
      t.lv = -2;
    }
    const live = S.trees.filter(t => !t.off);
    for (const t of live) t.lv = 3; // every card stands until the first refill folds away the ones drawn in 3D
    S.live = live;
    S.shown = live.length;
    S.grid = G.grid(live, 16);
    // per species: bark and crown at three levels, each an instanced mesh with room for every tree of that species
    S.sets = [];
    const by = new Map();
    for (const t of live) {
      let a = by.get(t.art);
      if (!a) by.set(t.art, (a = []));
      a.push(t);
    }
    for (const [ai, list] of by) {
      const k = KINDS[ai];
      if (!k) continue;
      const K = k.K,
        set = { ai, k, K, list, b: [], l: [] };
      for (let lv = 0; lv < 3; lv++) {
        const ib = mesh(
            new THREE.InstancedMesh(k.B[lv], K.bark, list.length),
            'stadtgruen ' + G.ARTEN[ai].id + ' stamm ' + lv
          ),
          il = mesh(
            new THREE.InstancedMesh(k.L[lv], K.leaf, list.length),
            'stadtgruen ' + G.ARTEN[ai].id + ' krone ' + lv
          );
        il.setColorAt(0, new THREE.Color(1, 1, 1));
        il.customDepthMaterial = K.depth;
        // the near level casts the sun's shadow (the shadow box is a few tens of metres round the walker)
        ib.castShadow = il.castShadow = lv === 0;
        set.b.push(ib);
        set.l.push(il);
      }
      S.sets.push(set);
    }
    // what a tree of each species costs at each level (bark, crown): the budget counts in triangles
    const tri = g => (g ? Math.round((g.index ? g.index.count : g.attributes.position.count) / 3) : 0);
    S.costs = {};
    for (const set of S.sets) S.costs[set.ai] = [0, 1, 2].map(lv => [tri(set.k.B[lv]), tri(set.k.L[lv])]);
    cards(live);
    S.last = null;
    S.seasonKey = '';
    refill(true);
    markDirty(true);
  }
  function mesh(im, name) {
    im.name = name;
    im.count = 0;
    im.visible = false;
    im.frustumCulled = false; // filled for the camera: what is in it is in front anyway
    im.castShadow = false;
    im.receiveShadow = true;
    im.userData.noMerge = true;
    im.userData.sharedGeo = true;
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    scene.add(im);
    S.meshes.push(im);
    return im;
  }
  // ---- crossed cards beyond the far ring: the atlas of world/ratscher.js (its material and geometry, no new program) ----
  function cards(live) {
    S.cards = [];
    const src = RATSCHER.trees && RATSCHER.trees[0];
    if (!src || !src.geometry || !src.material) return;
    const info = ['oakA', 'ash', 'oakB', 'aspen', 'pine'].map(k => {
      const K = TREES[k];
      if (!K) return { w: 0.6, h: 1 };
      const bb = new THREE.Box3();
      for (const g of [K.bg, K.lg]) {
        if (!g.boundingBox) g.computeBoundingBox();
        bb.union(g.boundingBox);
      }
      const sz = bb.getSize(new THREE.Vector3()),
        hw = (Math.max(sz.x, sz.z) / 2) * 1.02,
        H = sz.y * 1.02,
        s = Math.max(hw * 2, H);
      return { w: (hw * 2) / s, h: H / s };
    });
    const cellOf = new Map();
    for (const t of live) {
      if (G.ARTEN[t.art].card < 0) continue;
      const k = Math.floor(t.x / 400) + ':' + Math.floor(t.y / 400);
      let a = cellOf.get(k);
      if (!a) cellOf.set(k, (a = []));
      a.push(t);
    }
    const m4 = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      up = new THREE.Vector3(0, 1, 0),
      sv = new THREE.Vector3(),
      pv = new THREE.Vector3(),
      c = new THREE.Color();
    for (const list of cellOf.values()) {
      const g = src.geometry.clone(),
        kk = new Float32Array(list.length);
      g.setAttribute('aKind', new THREE.InstancedBufferAttribute(kk, 1));
      const im = new THREE.InstancedMesh(g, src.material, list.length);
      list.forEach((t, i) => {
        const kind = G.ARTEN[t.art].card,
          I = info[kind],
          asp = I.w / I.h,
          sy = t.h / I.h,
          wv = Math.min(Math.max(t.r * 2, t.h * asp * 0.75), t.h * asp * 1.35),
          sx = wv / I.w;
        q.setFromAxisAngle(up, t.hs * 6.283);
        m4.compose(pv.set(t.x, t.z - 0.3, -t.y), q, sv.set(sx, sy, sx));
        im.setMatrixAt(i, m4);
        kk[i] = kind;
        im.setColorAt(i, c.setRGB(1, 1, 1));
        t.card = { im, i, m: m4.clone() };
      });
      im.name = 'stadtgruen karten';
      im.userData.noMerge = true;
      im.castShadow = im.receiveShadow = false;
      im.computeBoundingSphere();
      scene.add(im);
      S.meshes.push(im);
      S.cards.push(im);
    }
  }
  // ---- the season of the game's date; in Ratscher the trees keep the summer of the world's own trees beside them (world/ratscher.js has
  // no seasons for its broadleaved trees yet – AREAS.ratscher.seasons) ----
  function doyNow() {
    if (S.doy !== null) return S.doy;
    if (S.area && AREAS[S.area].seasons === false) return 196;
    try {
      return G.doyOf(DN.jdOf(CLOCK.t));
    } catch (e) {
      return 180;
    }
  }
  const col = new THREE.Color();
  // the colour of a crown: its season's colour (multiplying the leaf picture's mean), a little different from tree to tree
  function crownColour(t, se, avg) {
    const m = G.tint(se.col, se.k * (0.78 + 0.44 * t.hs), [avg.r, avg.g, avg.b], 0.88 + 0.2 * t.hs);
    return col.setRGB(m[0], m[1], m[2]);
  }
  // ---- the levels for the camera: refill the instanced meshes when the camera moved 2 m or turned 8°, or the season changed ----
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0),
    sv = new THREE.Vector3(),
    pv = new THREE.Vector3(),
    dir = new THREE.Vector3();
  function refill(force) {
    if (S.state !== 'ready' && !force) return;
    cam.getWorldDirection(dir);
    const cx = cam.position.x,
      cy = -cam.position.z,
      dl = Math.hypot(dir.x, dir.z) || 1,
      dx = dir.x / dl,
      dy = -dir.z / dl,
      doy = doyNow();
    const L = S.last;
    if (!force && L && L.doy === doy && Math.hypot(cx - L.x, cy - L.y) < 2 && dx * L.dx + dy * L.dy > 0.99) return;
    S.last = { x: cx, y: cy, dx, dy, doy };
    const R = G.radii(COARSE, RENDER.tier),
      N = G.budget(COARSE, RENDER.tier),
      // the half angle that counts as in view: half the diagonal field of view and some margin
      half = (Math.atan(Math.tan((cam.fov * Math.PI) / 360) * Math.hypot(1, cam.aspect || 1.6)) * 180) / Math.PI + 12,
      cone = Math.cos((Math.min(89, half) * Math.PI) / 180),
      top = cam.position.y - KERN.ground(cx, cy) > 60, // from high above: no full level
      seasons = G.ARTEN.map((a, i) => G.season(i, doy));
    S.season = { doy, st: seasons[0].st };
    // every tree's level: the nearest in view first, each level within its budget (sg_regeln.js assign)
    const prev = new Map();
    for (const t of S.live) prev.set(t, t.lv);
    const lf = seasons.map(se => se.leaf),
      cost = (t, lv) => {
        const c = S.costs[t.art];
        return c ? c[lv][0] + (G.leafLevel(lv, lf[t.art]) === null ? 0 : c[G.leafLevel(lv, lf[t.art])][1]) : 0;
      };
    S.levels = G.assign(S.live, cx, cy, dx, dy, R, N, cone, top, cost, t => t.art === HECKE);
    S.tris = S.levels.tris;
    const cardsDirty = new Set();
    for (const set of S.sets) {
      const se = seasons[set.ai],
        cnt = [0, 0, 0, 0, 0, 0];
      for (const t of set.list) {
        const lv = t.lv;
        // the card: shown unless the tree stands in 3D now
        const was3D = prev.get(t) >= 0 && prev.get(t) <= 2,
          is3D = lv >= 0 && lv <= 2;
        if (t.card && was3D !== is3D) {
          t.card.im.setMatrixAt(t.card.i, is3D ? ZERO : t.card.m);
          cardsDirty.add(t.card.im);
        }
        if (!is3D) continue;
        const K = set.K,
          sy = t.h / K.H,
          sx = THREE.MathUtils.clamp(t.r / K.R, sy * 0.7, sy * 1.35);
        q.setFromAxisAngle(up, t.hs * 6.283);
        m4.compose(pv.set(t.x, t.z - 0.1, -t.y), q, sv.set(sx, sy, sx));
        set.b[lv].setMatrixAt(cnt[lv]++, m4);
        const ll = G.leafLevel(lv, se.leaf);
        if (ll === null) continue;
        const j = cnt[3 + ll]++;
        set.l[ll].setMatrixAt(j, m4);
        set.l[ll].setColorAt(j, crownColour(t, se, set.k.avg));
      }
      for (let lv = 0; lv < 3; lv++) {
        const b = set.b[lv],
          l = set.l[lv];
        b.count = cnt[lv];
        l.count = cnt[3 + lv];
        b.visible = b.count > 0; // an empty mesh costs no draw call
        l.visible = l.count > 0;
        b.instanceMatrix.needsUpdate = true;
        l.instanceMatrix.needsUpdate = true;
        if (l.instanceColor) l.instanceColor.needsUpdate = true;
      }
    }
    for (const im of cardsDirty) im.instanceMatrix.needsUpdate = true;
    markDirty(S.levels[0] > 0);
  }
  // ---- freeing ----
  function stop() {
    run++;
    S.area = null;
    if (S.state === 'idle') return;
    for (const m of S.meshes) {
      scene.remove(m);
      if (m.name === 'stadtgruen karten') m.geometry.dispose(); // a clone of the atlas card (the material is Ratscher's)
      m.dispose();
    }
    S.meshes.length = 0;
    S.sets = [];
    S.cards = [];
    // the own kinds: their geometries and materials (the garden's kinds stay)
    for (const ai of Object.keys(KINDS)) {
      const k = KINDS[ai];
      if (k && k.own) {
        const K = k.K;
        for (const g of new Set([K.bg, K.bgMid, K.bgFar, K.lg, K.lgFar, K.lgFar2])) if (g) g.dispose();
        K.bark.dispose();
        K.leaf.dispose();
      }
      if (k && k.near) k.near.dispose(); // the thinned near crown is this module's own, also for a garden kind
      delete KINDS[ai];
    }
    S.trees = [];
    S.live = [];
    S.grid = null;
    S.shown = 0;
    S.levels = [0, 0, 0, 0];
    S.state = 'idle';
    S.freed++;
    markDirty(true);
  }
  // ---- the trunks stop the walker and the vehicles (inside the town's box only) ----
  const tmpL = [];
  KERN.provide(
    'pushOut',
    (p, r) => {
      if (S.state !== 'ready' || !S.grid) return undefined;
      const Z = (S.data && S.data.zone) || null;
      if (Z && (p[0] < Z[0] - 80 || p[0] > Z[2] + 80 || p[1] < Z[1] - 80 || p[1] > Z[3] + 80)) return undefined;
      return G.pushOut(S.grid, p, r, tmpL);
    },
    14
  );
  // ---- the round ----
  let acc = 0,
    look = 1;
  KERN.tick(dt => {
    // which area: the town when it stands (welt/schleusingen.js's zone), else Ratscher's village when near (checked twice a second)
    look += dt;
    if (look >= 0.5 || (S.area === 'schleusingen') !== (SCHL.state === 'ready')) {
      look = 0;
      const w = wanted();
      if (w !== S.area && !(S.state === 'error' && w === S.area)) {
        stop();
        if (w) start(w);
        return;
      }
    }
    if (S.state === 'kinds') return stepBuild();
    if (S.state !== 'ready') return;
    acc += dt;
    if (acc < 0.1) return;
    acc = 0;
    refill(false);
  }, 'stadtgruen');
  // ---- for the tests and the debugging: state, the trees (JSON-safe), the season set by hand ----
  S.status = () => ({
    on: S.on,
    area: S.area || null,
    state: S.state,
    err: S.err,
    trees: S.trees.length,
    shown: S.shown || 0,
    off: S.off,
    levels: S.levels ? [...S.levels] : [0, 0, 0, 0],
    tris: S.tris || 0,
    meshes: S.meshes.length,
    visible: S.meshes.filter(m => m.visible && (!m.isInstancedMesh || m.count > 0)).length,
    cards: (S.cards || []).length,
    kinds: Object.values(KINDS).filter(Boolean).length,
    season: S.season || null,
    ms: S.ms,
    loadMs: S.loadMs,
    built: S.built,
    freed: S.freed,
  });
  // the triangles of each species' levels (bark, crown): what a tree costs at each distance
  S.cost = () => {
    const tri = g => (g ? Math.round((g.index ? g.index.count : g.attributes.position.count) / 3) : 0),
      out = {};
    for (const [ai, k] of Object.entries(KINDS))
      if (k) out[G.ARTEN[ai].id] = [0, 1, 2].map(lv => [tri(k.B[lv]), tri(k.L[lv])]);
    return out;
  };
  S.list = (x, y, r) =>
    S.trees
      .filter(t => x === undefined || Math.hypot(t.x - x, t.y - y) <= r)
      .map(t => [+t.x.toFixed(2), +t.y.toFixed(2), G.ARTEN[t.art].id, t.h, t.r, t.f, +t.z.toFixed(2), t.off, t.lv]);
  S.setDoy = d => {
    S.doy = d === null || d === undefined ? null : +d;
    if (S.state === 'ready') refill(true);
  };
  S.refresh = () => S.state === 'ready' && refill(true);
  S.G = G;
  return S;
})();
