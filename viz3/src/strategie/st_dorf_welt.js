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
import { AMT } from '../amt/amt.js';
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
      p = freeAt(c0[0] + 17, c0[1] - 15, 3.2, 2.5, 34);
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
  // ---- a crisis mission's traces (strategie/st_dorf_krise.js, STRAT.S.ext.krise): the spruces across the track and later their logs at
  // the side; the sandbag wall at the culvert; smoke over the Klinge's edge and afterwards the burnt patch ----
  const SPRUCE = C(0.17, 0.27, 0.16),
    SAND = C(0.62, 0.53, 0.38),
    SMOKE = C(0.42, 0.42, 0.42),
    ASH = C(0.09, 0.08, 0.07);
  function krise(c) {
    const [x, y] = c.pos,
      z = gz(x, y),
      K = VPROPS.kit(),
      e = ROADS.edge,
      gx = e(x + 0.8, y) - e(x - 0.8, y),
      gy = e(x, y + 0.8) - e(x, y - 0.8),
      across = Math.atan2(gy, gx) || 0;
    const done = c.done != null;
    if (c.id === 'baum') {
      const n = Math.max(1, Math.min(3, c.sev || 2));
      for (let i = 0; i < n; i++) {
        const a = across + (i - (n - 1) / 2) * 0.45,
          ox = x + Math.cos(a + Math.PI / 2) * (i - (n - 1) / 2) * 3.2,
          oy = y + Math.sin(a + Math.PI / 2) * (i - (n - 1) / 2) * 3.2,
          L = 15 + i * 2;
        if (!done) {
          // the stem lies across the track, the root plate up at one end, the crown on the other side
          const A = [ox - Math.cos(a) * L * 0.35, oy - Math.sin(a) * L * 0.35],
            B = [ox + Math.cos(a) * L * 0.65, oy + Math.sin(a) * L * 0.65];
          stick(K, [A[0], A[1], gz(A[0], A[1]) + 0.35], [B[0], B[1], gz(B[0], B[1]) + 0.25], 0.2, BARK);
          K.disc(
            A[0] - Math.cos(a) * 0.2,
            A[1] - Math.sin(a) * 0.2,
            gz(A[0], A[1]) + 0.9,
            Math.cos(a),
            Math.sin(a),
            1.1,
            C(0.3, 0.24, 0.17),
            10
          );
          for (let k = 0; k < 5; k++) {
            const f = 0.45 + k * 0.12,
              px = A[0] + (B[0] - A[0]) * f,
              py = A[1] + (B[1] - A[1]) * f;
            K.ball(px, py, gz(px, py) + 0.7, 1.3 - k * 0.15, SPRUCE, 7);
          }
        } else {
          // cut to length at the side of the track (Hubert takes them as firewood), the brushwood in a heap
          const sx = x - Math.cos(across) * (6 + i * 0.7),
            sy = y - Math.sin(across) * (6 + i * 0.7),
            al = across + Math.PI / 2;
          for (let k = 0; k < 3; k++) {
            const px = sx + Math.cos(al) * (k * 2.8 - 2.8),
              py = sy + Math.sin(al) * (k * 2.8 - 2.8),
              pz = gz(px, py) + 0.22;
            stick(
              K,
              [px - Math.cos(al) * 1.25, py - Math.sin(al) * 1.25, pz],
              [px + Math.cos(al) * 1.25, py + Math.sin(al) * 1.25, pz],
              0.2,
              BARK
            );
          }
          K.ball(sx - Math.cos(across) * 2.2, sy - Math.sin(across) * 2.2, gz(sx, sy) + 0.3, 1.0, SPRUCE, 6);
        }
      }
    } else if (c.id === 'hochwasser') {
      if (!done || !c.ok) return null;
      // a wall of sandbags along the garden side of the brook at the culvert: two layers, bags laid like bricks
      const al = across + Math.PI / 2,
        bx = x - Math.cos(across) * 1.6,
        by = y - Math.sin(across) * 1.6;
      for (let r = 0; r < 2; r++)
        for (let k = -6; k <= 6; k++) {
          const u = (k + (r ? 0.5 : 0)) * 0.56,
            px = bx + Math.cos(al) * u,
            py = by + Math.sin(al) * u;
          K.box(px, py, gz(px, py) + r * 0.13, 0.54, 0.34, 0.13, al, SAND);
        }
    } else if (c.id === 'waldbrand') {
      if (!done) for (let k = 0; k < 6; k++) K.ball(x + k * 0.9, y + k * 0.5, z + 2 + k * 2.4, 1.6 + k * 0.5, SMOKE, 8);
      else
        for (let k = 0; k < 9; k++) {
          const a = k * 0.7,
            r = 3 + (k % 3) * 3,
            px = x + Math.cos(a) * r,
            py = y + Math.sin(a) * r;
          K.box(px, py, gz(px, py) - 0.02, 5 - (k % 3), 4 - (k % 2), 0.08, a, ASH);
        }
    }
    if (K.empty()) return null;
    const m = new THREE.Mesh(K.geo(), mat());
    m.name = 'strategie-dorf:krise-' + c.id;
    m.userData.noMerge = true;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return { g: m, at: [+x.toFixed(1), +y.toFixed(1)] };
  }
  // ---- the track to the Klinge after the work day: fresh gravel in the holes (lighter patches along the way) ----
  const GRAVEL = C(0.66, 0.64, 0.6),
    CAB = C(0.55, 0.57, 0.56);
  function schotter() {
    const R = ROADS.routes && ROADS.routes.klinge;
    if (!R || R.length < 3) return null;
    const seg = [];
    let L = 0;
    for (let i = 1; i < R.length; i++) {
      const d = Math.hypot(R[i][0] - R[i - 1][0], R[i][1] - R[i - 1][1]);
      seg.push(d);
      L += d;
    }
    const at = a => {
      for (let i = 1; i < R.length; i++) {
        if (a <= seg[i - 1]) {
          const k = a / seg[i - 1];
          return [
            R[i - 1][0] + (R[i][0] - R[i - 1][0]) * k,
            R[i - 1][1] + (R[i][1] - R[i - 1][1]) * k,
            Math.atan2(R[i][1] - R[i - 1][1], R[i][0] - R[i - 1][0]),
          ];
        }
        a -= seg[i - 1];
      }
      return null;
    };
    const K = VPROPS.kit(),
      pts = [];
    for (let k = 0; k < 10; k++) {
      const q = at(L * (0.2 + k * 0.05) + ((k * 37) % 7));
      if (!q) continue;
      const off = ((k % 3) - 1) * 0.6;
      const x = q[0] - Math.sin(q[2]) * off,
        y = q[1] + Math.cos(q[2]) * off;
      K.box(x, y, gz(x, y) + 0.02, 2.0 + (k % 2) * 0.8, 1.5, 0.06, q[2], GRAVEL);
      pts.push([+x.toFixed(1), +y.toFixed(1)]);
    }
    if (K.empty()) return null;
    const m = new THREE.Mesh(K.geo(), mat());
    m.name = 'strategie-dorf:schotter';
    m.userData.noMerge = true;
    m.receiveShadow = true;
    scene.add(m);
    return { g: m, at: pts[0], n: pts.length };
  }
  // ---- fibre: the grey street cabinet (network distribution point) at the Anger ----
  function glasfaser() {
    const c0 = D.PLACES.anger.pos,
      p = freeAt(c0[0] - 10, c0[1] + 7, 0.6, 0.8, 24);
    if (!p) return null;
    const [x, y] = p,
      z = gz(x, y),
      e = ROADS.edge,
      rot = Math.atan2(e(x, y + 0.8) - e(x, y - 0.8), e(x + 0.8, y) - e(x - 0.8, y)) + Math.PI / 2;
    const K = VPROPS.kit();
    K.box(x, y, z - 0.1, 0.95, 0.38, 1.35, rot, CAB);
    K.box(x, y, z + 1.25, 1.0, 0.42, 0.06, rot, C(0.42, 0.44, 0.43));
    K.box(x + Math.cos(rot) * 0.2, y + Math.sin(rot) * 0.2, z + 0.75, 0.12, 0.4, 0.05, rot, C(0.3, 0.31, 0.3));
    const m = new THREE.Mesh(K.geo(), mat());
    m.name = 'strategie-dorf:glasfaser';
    m.userData.noMerge = true;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return { g: m, at: [+x.toFixed(1), +y.toFixed(1)] };
  }
  // ---- the Kirmes weekend (the Ortsvorsteher system's date AMT.ST.kd, paid by the Ortsteilrat – strategie/st_dorf.js „Kirmes“): the
  // festival tent at the Anger with beer tables, and the Kirmesbaum – a peeled spruce with a green crown and a wreath with ribbons, set
  // up by the young people on the Friday, as in Thuringian villages ----
  const WHITE = C(0.9, 0.9, 0.88),
    RED = C(0.66, 0.12, 0.1),
    PEELED = C(0.78, 0.66, 0.5),
    GREEN = C(0.2, 0.42, 0.18);
  function kirmes() {
    const c0 = D.PLACES.anger.pos,
      p = freeAt(c0[0] - 15, c0[1] - 17, 4.2, 1.8, 36);
    if (!p) return null;
    const [x, y] = p,
      z = gz(x, y),
      e = ROADS.edge,
      rot = Math.atan2(e(x, y + 0.8) - e(x, y - 0.8), e(x + 0.8, y) - e(x - 0.8, y)) + Math.PI / 2,
      c = Math.cos(rot),
      s = Math.sin(rot),
      L = (u, v) => [x + u * c - v * s, y + u * s + v * c],
      P3 = (u, v, h) => {
        const q = L(u, v);
        return [q[0], q[1], z + h];
      };
    const K = VPROPS.kit();
    // the tent: 9 × 5 m, poles, a white roof with a red edge, closed back and sides to half height
    for (const u of [-4.5, -1.5, 1.5, 4.5])
      for (const v of [-2.5, 2.5]) {
        const q = L(u, v);
        K.box(q[0], q[1], z, 0.08, 0.08, 2.2, rot, WHITE);
      }
    K.quad(P3(-4.6, -2.6, 2.2), P3(4.6, -2.6, 2.2), P3(4.6, 0, 3.4), P3(-4.6, 0, 3.4), WHITE);
    K.quad(P3(4.6, 2.6, 2.2), P3(-4.6, 2.6, 2.2), P3(-4.6, 0, 3.4), P3(4.6, 0, 3.4), WHITE);
    K.quad(P3(-4.6, 0, 3.4), P3(4.6, 0, 3.4), P3(4.6, -2.6, 2.2), P3(-4.6, -2.6, 2.2), C(0.75, 0.75, 0.72));
    K.quad(P3(4.6, 0, 3.4), P3(-4.6, 0, 3.4), P3(-4.6, 2.6, 2.2), P3(4.6, 2.6, 2.2), C(0.75, 0.75, 0.72));
    for (const v of [-2.6, 2.6]) {
      const q = L(0, v);
      K.box(q[0], q[1], z + 1.95, 9.2, 0.04, 0.25, rot, RED);
    }
    for (const u of [-4.6, 4.6]) {
      K.tri(P3(u, -2.6, 2.2), P3(u, 2.6, 2.2), P3(u, 0, 3.4), WHITE);
      K.tri(P3(u, 2.6, 2.2), P3(u, -2.6, 2.2), P3(u, 0, 3.4), WHITE);
      const q = L(u, 0);
      K.box(q[0], q[1], z, 0.04, 5.2, 2.2, rot, WHITE);
    }
    const bk = L(0, 2.55);
    K.box(bk[0], bk[1], z, 9.1, 0.04, 1.2, rot, WHITE);
    // beer tables with benches inside
    for (const u of [-2.8, 0, 2.8]) {
      const t = L(u, 0.3);
      K.box(t[0], t[1], z + 0.74, 0.6, 2.2, 0.04, rot, C(0.55, 0.4, 0.25));
      K.box(t[0], t[1], z, 0.5, 0.06, 0.74, rot, IRON);
      for (const du of [-0.55, 0.55]) {
        const b = L(u + du, 0.3);
        K.box(b[0], b[1], z + 0.44, 0.25, 2.2, 0.04, rot, C(0.55, 0.4, 0.25));
      }
    }
    // the Kirmesbaum: 16 m, peeled, a green crown, the wreath at two thirds with ribbons
    const tb = freeAt(c0[0] + 3, c0[1] + 3, 0.6, 1.5, 20) || L(7, -4),
      tz = gz(tb[0], tb[1]);
    K.cyl(tb[0], tb[1], tz - 0.3, tz + 16, 0.16, 0.06, 8, PEELED);
    K.ball(tb[0], tb[1], tz + 16.8, 1.1, GREEN, 8);
    K.lathe(
      tb[0],
      tb[1],
      tz + 10.3,
      [
        [0.5, 0],
        [0.75, 0.3],
        [0.5, 0.6],
      ],
      12,
      GREEN
    );
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2;
      stick(
        K,
        [tb[0] + Math.cos(a) * 0.62, tb[1] + Math.sin(a) * 0.62, tz + 10.4],
        [tb[0] + Math.cos(a) * 0.75, tb[1] + Math.sin(a) * 0.75, tz + 8.6],
        0.03,
        k % 2 ? RED : WHITE
      );
    }
    const m = new THREE.Mesh(K.geo(), mat());
    m.name = 'strategie-dorf:kirmes';
    m.userData.noMerge = true;
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    return { g: m, at: [+x.toFixed(1), +y.toFixed(1)], baum: [+tb[0].toFixed(1), +tb[1].toFixed(1)] };
  }
  // the weekend of the Kirmes: from Friday noon (the tree goes up) to Monday noon
  const kirmesOn = t => {
    const kd = AMT.ST && AMT.ST.kd;
    return Number.isFinite(kd) && t >= kd - 12 * 60 && t < kd + 2 * 1440 + 12 * 60;
  };
  const BUILD = { streuobst: orchard, treffpunkt, schotter, glasfaser };
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
    for (const id of Object.keys(S.items)) if (id !== 'krise' && id !== 'kirmesfest' && B[id] == null) drop(id);
    if (S.items.kirmesfest && !kirmesOn(CLOCK.t)) drop('kirmesfest');
    // the crisis: rebuilt whenever its look changes (lying – cleared; smoke – ashes), dropped when it is history
    const kc = STRAT.S.ext.krise && STRAT.S.ext.krise.cur,
      kk = kc && !kc.wait && kc.pos ? kc.id + ':' + (kc.done == null ? 'an' : kc.ok ? 'ok' : 'spaet') : null;
    if (S.items.krise && S.items.krise.key !== kk) drop('krise');
    if (!ready()) return;
    if (kk && !S.items.krise)
      try {
        const n = krise(kc);
        S.items.krise = Object.assign(n || { g: null }, { key: kk });
        markDirty(true);
      } catch (e) {
        console.warn('strategie-dorf krise', e);
        S.items.krise = { g: null, key: kk, err: String(e) };
      }
    const t = CLOCK.t;
    if (kirmesOn(t) && !S.items.kirmesfest)
      try {
        const n = kirmes();
        S.items.kirmesfest = n || { g: null };
        markDirty(true);
      } catch (e) {
        console.warn('strategie-dorf kirmes', e);
        S.items.kirmesfest = { g: null, err: String(e) };
      }
    for (const [id, when] of Object.entries(B)) {
      if (!BUILD[id] || t < when || id === 'krise') continue;
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
    // only the kit is needed for the tiny meshes (not the roads and walls): warm at the very start of the mode, before anyone counts
    if (warmed || !(VPROPS && VPROPS.kit)) return false;
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
    items: Object.keys(S.items).filter(k => S.items[k].g),
    krise: S.items.krise ? S.items.krise.key : null,
    at: Object.fromEntries(Object.entries(S.items).map(([k, it]) => [k, it.at || null])),
    trees: S.items.streuobst ? S.items.streuobst.n : 0,
  });
  return { refresh, state, warm, S };
})();
window.STDWELT = STDWELT;
