// ===================== feat/strategie-dorf: the village's own things in the one world (STDWELT) =====================
// What a project of „Ratscher von oben“ leaves in the village besides the things of the Ortsvorsteher system (those amt/amt_world.js
// builds from AMT.ST.built): the meadow orchard on the leased or bought slope meadow – twelve young standard trees, each with its stake on
// the weather side, the wire guard against deer and, from May to October, a first small crown of leaves – and the roofed meeting place at
// the Anger (LEADER): posts, a tiled gable roof, a table with benches, a bike rack, an e-bike charging post. Built on first need (when the
// project is done: STRAT.S.ext.dorf.built), from the village kit (world/village_props.js VPROPS.kit: site coordinates, vertex colours) with
// one material of the settings amt/amt_world.js uses for its things (the same shader program); places beside the roads and clear of walls.
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { VPROPS } from '../world/village_props.js';
import { ROADS } from '../world/roads.js';
import { WCOL } from '../world/worldcol.js';
import { CLOCK } from '../time/clock.js';
import { STRAT } from './st_modus.js';
import { STDDATA } from './st_dorf_data.js';
export const STDWELT = (() => {
  const D = STDDATA,
    S = { items: {}, mat: null, leaf: null };
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    C = (r, g, b) => [lin(r), lin(g), lin(b)];
  const gz = (x, y) => KERN.terrain(x, y);
  const ready = () => !!(VPROPS && VPROPS.kit && ROADS && ROADS.edge && WCOL && WCOL.ready);
  const mat = () =>
    S.mat || (S.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, envMapIntensity: 0.6 }));
  const BARK = C(0.36, 0.29, 0.22),
    STAKE = C(0.62, 0.5, 0.34),
    WIRE = C(0.33, 0.35, 0.33),
    LEAF = C(0.34, 0.5, 0.22),
    WOOD = C(0.48, 0.33, 0.2),
    WOODD = C(0.34, 0.23, 0.14),
    TILE = C(0.5, 0.22, 0.15),
    PAVE = C(0.55, 0.53, 0.49),
    IRON = C(0.24, 0.25, 0.26),
    POST = C(0.36, 0.46, 0.36);
  // a stick between two points (a branch): four quads around the axis
  function stick(K, a, b, r, col) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      L = Math.hypot(...d) || 1,
      u = d.map(v => v / L);
    let p = Math.abs(u[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
    const x = [u[1] * p[2] - u[2] * p[1], u[2] * p[0] - u[0] * p[2], u[0] * p[1] - u[1] * p[0]],
      lx = Math.hypot(...x) || 1;
    p = x.map(v => v / lx);
    const q = [u[1] * p[2] - u[2] * p[1], u[2] * p[0] - u[0] * p[2], u[0] * p[1] - u[1] * p[0]];
    const ring = (c, rr) =>
      [0, 1, 2, 3].map(k => {
        const an = (k * Math.PI) / 2;
        return [0, 1, 2].map(i => c[i] + (p[i] * Math.cos(an) + q[i] * Math.sin(an)) * rr);
      });
    const A = ring(a, r),
      B = ring(b, r * 0.6);
    for (let k = 0; k < 4; k++) K.quad(A[k], A[(k + 1) % 4], B[(k + 1) % 4], B[k], col);
  }
  // free ground: off the road by at least `off` metres and clear of walls; searched on rings around (x, y)
  function freeAt(x, y, rad, off = 2.5, rMax = 30) {
    for (let r = 0; r <= rMax; r += 1)
      for (let k = 0; k < Math.max(1, Math.round(r * 3)); k++) {
        const a = (k / Math.max(1, Math.round(r * 3))) * Math.PI * 2,
          px = x + Math.cos(a) * r,
          py = y + Math.sin(a) * r;
        if (ROADS.edge(px, py) > -off) continue;
        if (WCOL.pushCircle([px, py], rad)) continue;
        return [px, py];
      }
    return null;
  }
  // ---- the meadow orchard: 3 rows of 4 standard trees, 11 × 12 m apart, on the slope meadow ----
  const leafy = () => {
    const mo = STRAT.W.dateOf(CLOCK.t).getUTCMonth();
    return mo >= 4 && mo <= 9;
  };
  function orchard() {
    const Ld = D.LAND.hangwiese,
      K = VPROPS.kit(),
      at = [],
      leaves = leafy();
    for (const dy of [-12, 0, 12])
      for (const dx of [-16.5, -5.5, 5.5, 16.5]) {
        const p = freeAt(Ld.c[0] + dx, Ld.c[1] + dy, 0.9, 3, 4);
        if (!p) continue;
        const [x, y] = p,
          z = gz(x, y),
          h = 1.75 + ((Math.abs(dx * 7 + dy * 3) % 5) / 5) * 0.25;
        // the stake on the west side (the weather side), the trunk, the wire guard, the leader and four branches cut back
        K.cyl(x - 0.22, y, z - 0.05, z + h + 0.15, 0.04, 0.035, 6, STAKE);
        K.cyl(x, y, z - 0.05, z + h, 0.032, 0.024, 6, BARK);
        K.cyl(x, y, z, z + 1.05, 0.2, 0.2, 9, WIRE);
        stick(K, [x, y, z + h - 0.05], [x, y, z + h + 0.75], 0.02, BARK);
        for (let k = 0; k < 4; k++) {
          const a = k * 1.62 + dx * 0.1,
            r = 0.55 + (k % 2) * 0.15;
          stick(
            K,
            [x, y, z + h - 0.1 - k * 0.06],
            [x + Math.cos(a) * r, y + Math.sin(a) * r, z + h + 0.38 - k * 0.04],
            0.015,
            BARK
          );
          if (leaves) K.ball(x + Math.cos(a) * r * 0.8, y + Math.sin(a) * r * 0.8, z + h + 0.32, 0.26, LEAF, 6);
        }
        if (leaves) K.ball(x, y, z + h + 0.62, 0.32, LEAF, 6);
        at.push([+x.toFixed(1), +y.toFixed(1)]);
      }
    if (K.empty()) return null;
    const m = new THREE.Mesh(K.geo(), mat());
    m.name = 'strategie-dorf:streuobst';
    m.userData.noMerge = true;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return { g: m, at, leaves, n: at.length };
  }
  // ---- the meeting place at the Anger: 4 × 3 m under a gable roof, pavement, table and benches, bike rack, charging post ----
  function treffpunkt() {
    const c0 = D.PLACES.anger.pos,
      p = freeAt(c0[0] + 9, c0[1] - 8, 3.2, 2.5, 34);
    if (!p) return null;
    const [x, y] = p,
      z = gz(x, y),
      e = ROADS.edge,
      // along the nearest road: the long side faces it
      gx = e(x + 0.8, y) - e(x - 0.8, y),
      gy = e(x, y + 0.8) - e(x, y - 0.8),
      rot = Math.atan2(gy, gx) + Math.PI / 2;
    const K = VPROPS.kit(),
      c = Math.cos(rot),
      s = Math.sin(rot),
      L = (u, v) => [x + u * c - v * s, y + u * s + v * c];
    K.box(x, y, z - 0.25, 4.8, 3.8, 0.3, rot, PAVE);
    for (const [u, v] of [
      [-1.9, -1.4],
      [1.9, -1.4],
      [-1.9, 1.4],
      [1.9, 1.4],
    ]) {
      const q = L(u, v);
      K.box(q[0], q[1], z, 0.14, 0.14, 2.35, rot, WOOD);
    }
    // the roof: two slopes from the eaves (2.35 m) to the ridge (3.25 m) along the long side, overhanging 0.35 m
    const P3 = (u, v, h) => {
      const q = L(u, v);
      return [q[0], q[1], z + h];
    };
    const ue = 2.4,
      ve = 1.95,
      he = 2.3,
      hr = 3.25;
    K.quad(P3(-ue, -ve, he), P3(ue, -ve, he), P3(ue, 0, hr), P3(-ue, 0, hr), TILE);
    K.quad(P3(ue, ve, he), P3(-ue, ve, he), P3(-ue, 0, hr), P3(ue, 0, hr), TILE);
    K.quad(P3(-ue, 0, hr), P3(ue, 0, hr), P3(ue, -ve, he), P3(-ue, -ve, he), WOODD);
    K.quad(P3(ue, 0, hr), P3(-ue, 0, hr), P3(-ue, ve, he), P3(ue, ve, he), WOODD);
    for (const u of [-1.9, 1.9]) {
      K.tri(P3(u, -1.5, 2.33), P3(u, 1.5, 2.33), P3(u, 0, hr - 0.05), WOOD);
      K.tri(P3(u, 1.5, 2.33), P3(u, -1.5, 2.33), P3(u, 0, hr - 0.05), WOOD);
    }
    // table and two benches
    const t = L(0, 0);
    K.box(t[0], t[1], z + 0.72, 1.9, 0.8, 0.06, rot, WOOD);
    for (const u of [-0.75, 0.75]) {
      const q = L(u, 0);
      K.box(q[0], q[1], z, 0.1, 0.6, 0.72, rot, WOODD);
    }
    for (const v of [-0.75, 0.75]) {
      const q = L(0, v);
      K.box(q[0], q[1], z + 0.42, 1.9, 0.3, 0.05, rot, WOOD);
      for (const u of [-0.8, 0.8]) {
        const r2 = L(u, v);
        K.box(r2[0], r2[1], z, 0.08, 0.26, 0.42, rot, WOODD);
      }
    }
    // the bike rack: three hoops beside, the charging post at the corner
    for (const u of [3.0, 3.6, 4.2]) {
      const a = L(u, -0.4),
        b = L(u, 0.4);
      stick(K, [a[0], a[1], z], [a[0], a[1], z + 0.8], 0.025, IRON);
      stick(K, [b[0], b[1], z], [b[0], b[1], z + 0.8], 0.025, IRON);
      stick(K, [a[0], a[1], z + 0.8], [b[0], b[1], z + 0.8], 0.025, IRON);
    }
    const lp = L(2.6, 1.6);
    K.box(lp[0], lp[1], z, 0.28, 0.22, 1.25, rot, POST);
    K.box(lp[0], lp[1], z + 1.25, 0.32, 0.26, 0.06, rot, C(0.82, 0.84, 0.8));
    const m = new THREE.Mesh(K.geo(), mat());
    m.name = 'strategie-dorf:treffpunkt';
    m.userData.noMerge = true;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return { g: m, at: [+x.toFixed(1), +y.toFixed(1)] };
  }
  const BUILD = { streuobst: orchard, treffpunkt };
  function drop(id) {
    const it = S.items[id];
    if (!it) return;
    if (it.g) {
      scene.remove(it.g);
      if (it.g.geometry) it.g.geometry.dispose();
    }
    delete S.items[id];
    markDirty(true);
  }
  // build what is done, drop what is no longer (a reset), the orchard's leaves by the season
  function refresh() {
    const B = (STRAT.S.ext.dorf && STRAT.S.ext.dorf.built) || {};
    for (const id of Object.keys(S.items)) if (B[id] == null) drop(id);
    if (!ready()) return;
    const t = CLOCK.t;
    for (const [id, when] of Object.entries(B)) {
      if (!BUILD[id] || t < when) continue;
      const it = S.items[id];
      if (it && !(id === 'streuobst' && it.leaves !== leafy())) continue;
      if (it) drop(id);
      try {
        const n = BUILD[id]();
        if (n) {
          S.items[id] = n;
          markDirty(true);
        }
      } catch (e) {
        console.warn('strategie-dorf build', id, e);
        S.items[id] = { g: null, err: String(e) };
      }
    }
  }
  let acc = 0;
  KERN.tick(dt => {
    if ((acc += dt) < 1) return;
    acc = 0;
    if (!warmed && STRAT.on) warm();
    refresh();
  }, 'strategie/dorf-welt');
  // compile ahead with the mode (no new shader program later, when a project's thing appears): this module's material and those of the
  // things amt/amt_world.js builds for the projects (its kit, a sign with a canvas texture, the lamp's lens, the lamp's light pool) – tiny
  // meshes under the ground for one frame, with the same shadow flags as the real ones
  let warmed = false;
  function warm() {
    if (warmed || !ready()) return false;
    warmed = true;
    const g = new THREE.Group(),
      cv = document.createElement('canvas');
    cv.width = cv.height = 4;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mats = [
      [mat(), true],
      [new THREE.MeshStandardMaterial({ map: tex, roughness: 0.85, side: THREE.DoubleSide }), false],
      [
        new THREE.MeshStandardMaterial({ color: 0x2a2a2a, emissive: 0xffc27a, emissiveIntensity: 0, roughness: 0.5 }),
        false,
      ],
      [
        new THREE.MeshBasicMaterial({
          map: tex,
          color: 0xffb35c,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending,
        }),
        false,
      ],
    ];
    const K = VPROPS.kit();
    K.box(0, 0, -80, 0.05, 0.05, 0.05, 0, WOOD);
    const geoK = K.geo(),
      geoP = new THREE.PlaneGeometry(0.05, 0.05);
    let first = null;
    mats.forEach(([M, sh], i) => {
      const m = new THREE.Mesh(i === 0 ? geoK : geoP, M);
      if (i) m.position.set(0, -80, 0);
      m.frustumCulled = false;
      m.castShadow = m.receiveShadow = sh;
      g.add(m);
      first = first || m;
    });
    S.warm = mats.map(m => m[0]);
    scene.add(g);
    first.onAfterRender = () => {
      first.onAfterRender = () => {};
      setTimeout(() => {
        scene.remove(g);
        geoK.dispose();
        geoP.dispose();
        // the materials stay (kept in S.warm): disposing one would release its compiled program again
        markDirty(true);
      }, 0);
    };
    markDirty(true);
    return true;
  }
  KERN.on('strategie:modus', d => {
    if (d && d.on) warm();
  });
  const state = () => ({
    items: Object.keys(S.items),
    at: Object.fromEntries(Object.entries(S.items).map(([k, it]) => [k, it.at || null])),
    trees: S.items.streuobst ? S.items.streuobst.n : 0,
  });
  return { refresh, state, warm, S };
})();
window.STDWELT = STDWELT;
