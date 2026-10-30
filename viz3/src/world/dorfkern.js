// ===================== feat/dorfkern: the open space of the centre as Falko filmed it (pan of 10.04.2023, photo of Anger 15) =====================
// The well in front of Anger 15 (OSM man_made=water_well): a polygonal sandstone wall with copings round a sunken basin, steps down on its
// south side, the wooden pump post; a brown and a green bench and the green bin beside it; concrete pavers around it with a granite kerb; the
// two big limes by it (their measured crowns moved to the trunks of the video), the picnic table, the bin and the log bench on the green,
// the long trimmed hedges; concrete power poles with the overhead line along the north side of the street, the vending machine by the post
// box, the picket fence (brown pickets, red-brown posts) along the meadow behind the bus stop, the white box behind it, the small porch roof
// of Anger 23; in the Easter weeks an arch of coloured eggs over the well. Places: rays of the video frames on the ground
// (docs/features/dorfkern.md, data in world/dorfkern_data.js). Geometry from the kit of world/village_props.js, the materials of
// world/village_props.js and world/village_near.js – no new shader programs; three meshes, built once, collisions before world/worldcol.js.
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { RATSCHER } from './ratscher.js';
import { VILLAGE } from './village.js';
import { VPROPS } from './village_props.js';
import { VNEAR } from './village_near.js';
import { DKDATA } from './dorfkern_data.js';
export const DORFKERN = (() => {
  const S = { on: false, ready: false, meshes: [], easter: false };
  if (!window.RATSCHER || !RATSCHER.on || !DKDATA.open) return S;
  const O = DKDATA.open;
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    L = (r, g, b) => [lin(r), lin(g), lin(b)];
  const gz = (x, y) => KERN.terrain(x, y);
  const STONE = L(0.6, 0.55, 0.47),
    COPE = L(0.66, 0.62, 0.55),
    IRON = L(0.14, 0.14, 0.14),
    CONC = L(0.62, 0.61, 0.58),
    WOOD = L(0.42, 0.29, 0.18);
  const az2rot = az => ((90 - az) * Math.PI) / 180; // compass azimuth of the long axis -> kit rotation (counter-clockwise from east)
  // ---- the well: an octagon (rectangle with chamfered corners) of sandstone, copings on top, the basin sunk, steps down to the south ----
  function well(kS, kP, segs) {
    const w = O.well,
      [cx, cy] = w.c,
      rot = az2rot(w.az + 90),
      c = Math.cos(rot),
      s = Math.sin(rot),
      pt = (u, v) => [cx + u * c - v * s, cy + u * s + v * c],
      a = w.size[0] / 2,
      b = w.size[1] / 2,
      k = w.chamfer,
      z = gz(cx, cy) + 0.03,
      h = w.h,
      t = 0.42,
      dep = 0.7;
    // u along az + 90 (the long side), v towards az (the steps are at v < 0)
    const P8 = [
      [-a + k, -b],
      [a - k, -b],
      [a, -b + k],
      [a, b - k],
      [a - k, b],
      [-a + k, b],
      [-a, b - k],
      [-a, -b + k],
    ];
    for (let i = 0; i < 8; i++) {
      const p = P8[i],
        q = P8[(i + 1) % 8],
        mu = (p[0] + q[0]) / 2,
        mv = (p[1] + q[1]) / 2,
        len = Math.hypot(q[0] - p[0], q[1] - p[1]),
        ang = Math.atan2(q[1] - p[1], q[0] - p[0]),
        nu = Math.sin(ang),
        nv = -Math.cos(ang); // inward is −n for this winding
      const parts = i === 0 ? [-len / 2, -0.55, 0.55, len / 2] : [-len / 2, len / 2]; // the south wall has the gap for the steps
      for (let j = 0; j + 1 < parts.length; j += 2) {
        const l0 = parts[j],
          l1 = parts[j + 1],
          lm = (l0 + l1) / 2,
          ll = l1 - l0,
          du = Math.cos(ang) * lm - nu * (t / 2),
          dv = Math.sin(ang) * lm - nv * (t / 2),
          P = pt(mu + du, mv + dv);
        kS.box(P[0], P[1], z - dep, ll + (i % 2 ? 0.0 : 0.02), t, h + dep, rot + ang, STONE);
        kS.box(P[0], P[1], z + h, ll + 0.12, t + 0.14, 0.13, rot + ang, COPE);
        const A = pt(mu + Math.cos(ang) * l0, mv + Math.sin(ang) * l0),
          B = pt(mu + Math.cos(ang) * l1, mv + Math.sin(ang) * l1);
        segs.push(A[0], A[1], B[0], B[1]);
      }
    }
    // the basin floor, the steps down in the gap, two pillar stones beside it, the pump post at the back
    {
      const P = pt(0, 0);
      kS.box(P[0], P[1], z - dep, 2 * a - 0.8, 2 * b - 0.8, 0.03, rot, L(0.32, 0.32, 0.29));
    }
    for (let i = 0; i < 3; i++) {
      const P = pt(0, -b + 0.2 + i * 0.3);
      kS.box(P[0], P[1], z - dep, 1.1, 0.32, (2 - i) * 0.23 + 0.06, rot, L(0.58, 0.54, 0.46));
    }
    for (const sx of [-1, 1]) {
      const P = pt(sx * 0.78, -b + t / 2);
      kS.box(P[0], P[1], z - 0.05, 0.45, 0.5, h + 0.35, rot, COPE);
    }
    {
      const P = pt(0.3, b - t - 0.2);
      kP.box(P[0], P[1], z - dep, 0.18, 0.18, dep + 1.35, rot, L(0.36, 0.25, 0.16));
      kP.box(P[0], P[1], z + 0.62, 0.08, 0.32, 0.07, rot + Math.PI / 2, L(0.3, 0.3, 0.3));
    }
    S.well = { c: w.c, rot, z };
  }
  // ---- benches: wooden slats on two frames, facing az (degrees), in a colour ----
  function bench(k, x, y, az, len, col, segs) {
    const z = gz(x, y),
      a = ((90 - az) * Math.PI) / 180,
      c = Math.cos(a),
      s = Math.sin(a),
      rot = a + Math.PI / 2,
      dk = col.map(v => v * 0.75);
    for (let i = 0; i < 4; i++)
      k.box(x + c * (0.15 - i * 0.11), y + s * (0.15 - i * 0.11), z + 0.42, len, 0.09, 0.035, rot, i % 2 ? col : dk);
    for (let i = 0; i < 3; i++) k.box(x - c * 0.27, y - s * 0.27, z + 0.55 + i * 0.13, len, 0.03, 0.09, rot, col);
    for (const tt of [-len / 2 + 0.12, len / 2 - 0.12]) {
      const px = x - s * tt,
        py = y + c * tt;
      k.box(px, py, z, 0.06, 0.48, 0.42, rot, dk);
      k.box(px - c * 0.27, py - s * 0.27, z, 0.05, 0.05, 0.9, rot, dk);
    }
    segs.push(x - (s * len) / 2, y + (c * len) / 2, x + (s * len) / 2, y - (c * len) / 2);
  }
  // ---- a run of boxes along a polyline (hedges, pickets) ----
  function along(pts, step, fn) {
    for (let i = 0; i + 1 < pts.length; i++) {
      const [ax, ay] = pts[i],
        [bx, by] = pts[i + 1],
        l = Math.hypot(bx - ax, by - ay),
        n = Math.max(1, Math.ceil(l / step));
      for (let j = 0; j < n; j++) {
        const t0 = j / n,
          t1 = (j + 1) / n;
        fn(
          ax + (bx - ax) * (t0 + t1) * 0.5,
          ay + (by - ay) * (t0 + t1) * 0.5,
          l / n,
          Math.atan2(by - ay, bx - ax),
          j,
          i
        );
      }
    }
  }
  function hedges(kN, segs) {
    for (const hd of O.hedges)
      along(hd.p, 2.2, (x, y, l, rot, j) => {
        kN.kind(2).box(
          x,
          y,
          gz(x, y) - 0.08,
          l + 0.04,
          hd.w || 0.6,
          (hd.h || 0.9) + ((j * 7) % 3) * 0.03,
          rot,
          L(0.21, 0.33, 0.14)
        );
        const c = Math.cos(rot) * (l / 2),
          s = Math.sin(rot) * (l / 2);
        segs.push(x - c, y - s, x + c, y + s);
      });
  }
  function fences(kN, segs) {
    const PICK = L(0.44, 0.31, 0.2),
      POST = L(0.5, 0.24, 0.15);
    for (const fe of O.fences)
      along(fe.p, 2.5, (x, y, l, rot) => {
        const z = gz(x, y),
          c = Math.cos(rot),
          s = Math.sin(rot);
        kN.kind(3).box(x - (c * l) / 2, y - (s * l) / 2, z - 0.05, 0.09, 0.09, 1.18, rot, POST);
        for (const zz of [0.25, 0.8]) kN.kind(3).box(x, y, z + zz, l, 0.03, 0.07, rot, PICK);
        const n = Math.floor(l / 0.11);
        for (let i = 0; i < n; i++) {
          const tt = -l / 2 + (i + 0.5) * (l / n);
          kN.kind(3).box(
            x + c * tt + s * 0.04,
            y + s * tt - c * 0.04,
            z + 0.06,
            0.055,
            0.02,
            0.96 + 0.04 * (i % 2),
            rot,
            PICK
          );
        }
        segs.push(x - (c * l) / 2, y - (s * l) / 2, x + (c * l) / 2, y + (s * l) / 2);
      });
  }
  // ---- concrete power poles with a cross-arm and the overhead line (three wires sagging between the poles) ----
  function poles(kP, kM, trunks) {
    const P = O.poles,
      tops = [];
    for (const [x, y] of P) {
      const z = gz(x, y),
        H = 8.6;
      kP.cyl(x, y, z - 0.2, z + H, 0.17, 0.1, 8, CONC, true);
      for (const zz of [1.2, 4.4, 7.4])
        kP.cyl(x, y, z + zz, z + zz + 0.05, 0.185 - zz * 0.009, 0.18 - zz * 0.009, 8, L(0.55, 0.55, 0.52));
      tops.push([x, y, z + H]);
      trunks.push([x, y, 2]);
    }
    for (let i = 0; i + 1 < tops.length; i++) {
      const [ax, ay, az] = tops[i],
        [bx, by, bz] = tops[i + 1],
        l = Math.hypot(bx - ax, by - ay),
        r = Math.atan2(by - ay, bx - ax),
        nx = -Math.sin(r),
        ny = Math.cos(r);
      for (const [o, dz] of [
        [-0.35, -0.3],
        [0.35, -0.3],
        [0, 0.08],
      ]) {
        const N = 10;
        for (let k = 0; k < N; k++) {
          const t0 = k / N,
            t1 = (k + 1) / N,
            z0 = az + (bz - az) * t0 + dz - 0.5 * 4 * t0 * (1 - t0),
            z1 = az + (bz - az) * t1 + dz - 0.5 * 4 * t1 * (1 - t1),
            mx = ax + (bx - ax) * (t0 + t1) * 0.5 + nx * o,
            my = ay + (by - ay) * (t0 + t1) * 0.5 + ny * o,
            seg = l / N;
          // a thin box tilted along the sag: approximated by its middle height (pieces are short)
          kM.box(mx, my, (z0 + z1) / 2 - 0.012, seg + 0.02, 0.025, 0.025, r, IRON);
        }
      }
      for (const [x, y, z] of [tops[i], tops[i + 1]]) kM.box(x, y, z - 0.35, 0.12, 1.0, 0.1, r, L(0.3, 0.3, 0.3)); // cross-arms
    }
  }
  // ---- small things: the picnic table, the bins, the log bench, the vending machine, the white box ----
  function things(kP, kN, segs, trunks) {
    for (const [x, y, az] of O.picnic) {
      const z = gz(x, y),
        r = az2rot(az),
        c = Math.cos(r),
        s = Math.sin(r);
      kP.box(x, y, z + 0.72, 1.9, 0.75, 0.05, r, WOOD);
      for (const o of [-0.62, 0.62]) {
        kP.box(x - s * o, y + c * o, z + 0.43, 1.9, 0.28, 0.045, r, WOOD);
        for (const e of [-0.75, 0.75])
          kP.box(x + c * e - s * o * 0.5, y + s * e + c * o * 0.5, z, 0.05, 0.05, 0.72, r, L(0.4, 0.4, 0.4));
      }
      segs.push(x - c * 0.95, y - s * 0.95, x + c * 0.95, y + s * 0.95);
    }
    for (const [x, y, col] of O.bins) {
      const z = gz(x, y),
        cc = L(...col);
      kP.cyl(x, y, z, z + 0.62, 0.05, 0.05, 6, L(0.3, 0.3, 0.3));
      kP.cyl(x, y, z + 0.35, z + 0.95, 0.2, 0.21, 10, cc, true);
      trunks.push([x, y, 1]);
    }
    for (const [x, y, az, len] of O.logs) {
      const z = gz(x, y),
        r = az2rot(az);
      kN.kind(3).box(x, y, z + 0.2, len, 0.32, 0.26, r, L(0.42, 0.33, 0.24));
      for (const e of [-len / 2 + 0.4, len / 2 - 0.4])
        kN.kind(3).box(x + Math.cos(r) * e, y + Math.sin(r) * e, z, 0.3, 0.5, 0.2, r, L(0.36, 0.28, 0.2));
      segs.push(
        x - (Math.cos(r) * len) / 2,
        y - (Math.sin(r) * len) / 2,
        x + (Math.cos(r) * len) / 2,
        y + (Math.sin(r) * len) / 2
      );
    }
    {
      const [x, y, az] = O.vending,
        z = gz(x, y),
        r = az2rot(az + 90);
      kP.cyl(x, y, z, z + 1.0, 0.035, 0.035, 6, L(0.55, 0.55, 0.55));
      kP.box(x, y, z + 1.0, 0.56, 0.22, 0.66, r, L(0.62, 0.08, 0.1));
      const c = Math.cos(r - Math.PI / 2),
        s = Math.sin(r - Math.PI / 2);
      kP.box(x + c * 0.1, y + s * 0.1, z + 1.06, 0.46, 0.04, 0.54, r, L(0.92, 0.92, 0.9));
      for (const o of [-0.14, 0, 0.14])
        kP.box(
          x + c * 0.125 + Math.cos(r) * o,
          y + s * 0.125 + Math.sin(r) * o,
          z + 1.18,
          0.09,
          0.02,
          0.3,
          r,
          L(0.85, 0.6, 0.2)
        );
      trunks.push([x, y, 1]);
    }
    {
      const [x, y, az, lx, ly, h] = O.whitebox,
        r = az2rot(az);
      kP.box(x, y, gz(x, y) - 0.05, lx, ly, h, r, L(0.92, 0.92, 0.9));
      const c = Math.cos(r) * (lx / 2),
        s = Math.sin(r) * (lx / 2),
        nx = -Math.sin(r) * (ly / 2),
        ny = Math.cos(r) * (ly / 2);
      segs.push(x - c - nx, y - s - ny, x + c - nx, y + s - ny, x - c + nx, y - s + ny, x + c + nx, y + s + ny);
    }
  }
  // ---- the porch roof of Anger 23 over its door (village.js puts the door on the street side) ----
  function porch(kP) {
    for (const [id, w, d, zt] of O.porches || []) {
      const b = VILLAGE.byId && VILLAGE.byId.get(id),
        f = b && b.fac.find(k => k.door);
      if (!f) continue;
      const u = f.door.u,
        bx = f.ax + f.dx * u,
        by = f.ay + f.dy * u,
        z = b.foot + zt,
        rot = Math.atan2(f.dy, f.dx),
        RED = L(0.55, 0.16, 0.12);
      for (const sd of [-1, 1]) {
        // two slopes of a small gable roof sticking out of the wall
        const cx = bx + f.nx * (d / 2) + f.dx * ((sd * w) / 4),
          cy = by + f.ny * (d / 2) + f.dy * ((sd * w) / 4);
        kP.box(cx, cy, z + 0.18 - 0.05, w / 2 + 0.05, d, 0.06, rot, RED);
      }
      kP.box(
        bx + f.nx * (d / 2),
        by + f.ny * (d / 2),
        z + 0.24,
        0.12,
        d,
        0.06,
        rot,
        RED.map(v => v * 0.7)
      );
      for (const sd of [-1, 1])
        kP.box(
          bx + f.nx * (d - 0.05) + f.dx * sd * (w / 2 - 0.08),
          by + f.ny * (d - 0.05) + f.dy * sd * (w / 2 - 0.08),
          b.foot,
          0.08,
          0.08,
          zt,
          rot,
          L(0.3, 0.2, 0.14)
        );
    }
  }
  // ---- the limes by the well: the measured crowns moved to the trunks seen in the video (world/ratscher.js treeRecs, cards beyond 100 m) ----
  function limes() {
    const recs = RATSCHER.treeRecs || [],
      T = RATSCHER.treeXY,
      m4 = new THREE.Matrix4(),
      p = new THREE.Vector3(),
      q = new THREE.Quaternion(),
      sc = new THREE.Vector3();
    S.limes = [];
    for (const lm of O.limes) {
      const r = recs.find(k => Math.hypot(k.x - lm.from[0], k.y - lm.from[1]) < 0.6);
      if (!r) continue;
      const k = lm.h / r.h;
      for (const [im, i] of r.inst) {
        im.getMatrixAt(i, m4);
        m4.decompose(p, q, sc);
        p.copy(V(lm.at[0], lm.at[1], gz(lm.at[0], lm.at[1]) - 0.3));
        sc.multiplyScalar(k);
        if (lm.w) sc.x = sc.z = sc.x * lm.w;
        m4.compose(p, q, sc);
        im.setMatrixAt(i, m4);
        im.instanceMatrix.needsUpdate = true;
        im.computeBoundingSphere();
      }
      if (T)
        for (let i = 0; i + 2 < T.length; i += 3)
          if (Math.abs(T[i] - r.x) < 0.05 && Math.abs(T[i + 1] - r.y) < 0.05) {
            T[i] = lm.at[0];
            T[i + 1] = lm.at[1];
            T[i + 2] = lm.h;
          }
      r.x = lm.at[0];
      r.y = lm.at[1];
      r.h = lm.h;
      S.limes.push([r.x, r.y, r.h]);
    }
  }
  // ---- in the Easter weeks (Palm Sunday to the Sunday after Easter) an arch of coloured eggs over the well ----
  function easterDay(Y) {
    const a = Y % 19,
      b = Math.floor(Y / 100),
      c = Y % 100,
      d = Math.floor(b / 4),
      e = b % 4,
      f = Math.floor((b + 8) / 25),
      g = Math.floor((b - f + 1) / 3),
      h = (19 * a + b - d - g + 15) % 30,
      i = Math.floor(c / 4),
      k = c % 4,
      l = (32 + 2 * e + 2 * i - h - k) % 7,
      m = Math.floor((a + 11 * h + 22 * l) / 451),
      mo = Math.floor((h + l - 7 * m + 114) / 31),
      dd = ((h + l - 7 * m + 114) % 31) + 1;
    return Date.UTC(Y, mo - 1, dd) / 864e5;
  }
  S.isEaster = (eday = null) => {
    if (eday === null) {
      if (!window.DN || !window.CLOCK) return false;
      eday = LATE.DN.e0 + Math.floor(LATE.CLOCK.t / 1440);
    }
    const Y = new Date(eday * 864e5).getUTCFullYear(),
      E = easterDay(Y);
    return eday >= E - 7 && eday <= E + 7;
  };
  function garland(k) {
    if (!S.well) return;
    const { c, rot, z } = S.well,
      [cx, cy] = c,
      cs = Math.cos(rot),
      sn = Math.sin(rot),
      w = O.well,
      a = w.size[0] / 2 - 0.4,
      cols = [
        L(0.95, 0.85, 0.1),
        L(0.9, 0.2, 0.25),
        L(0.2, 0.5, 0.9),
        L(0.25, 0.75, 0.3),
        L(0.95, 0.5, 0.1),
        L(0.75, 0.35, 0.85),
      ],
      GR = L(0.12, 0.35, 0.12);
    // the arch over the long axis of the well, from one end wall to the other, wound with green and hung with eggs
    for (let i = 0; i <= 28; i++) {
      const t = i / 28,
        ang = Math.PI * t,
        u = -a * Math.cos(ang),
        h = z + w.h + 0.12 + 1.6 * Math.sin(ang),
        x = cx + u * cs,
        y = cy + u * sn;
      k.ball(x, y, h, 0.11, GR, 5);
      const e = cols[i % cols.length];
      k.lathe(
        x + 0.05 * Math.sin(i),
        y + 0.05 * Math.cos(i),
        h - 0.2,
        [
          [0.0, 0],
          [0.05, 0.02],
          [0.065, 0.07],
          [0.05, 0.12],
          [0.0, 0.14],
        ],
        6,
        e
      );
    }
  }
  function tick() {
    const on = S.isEaster();
    if (on !== S.easter) {
      S.easter = on;
      if (S.garland) S.garland.visible = on && !RATSCHER.map;
      markDirty();
    }
  }
  function build() {
    const t0 = performance.now(),
      kit = VPROPS.kit,
      M = VPROPS.mat;
    if (!kit || !M) return;
    const kP = kit(),
      kM = kit(),
      kS = kit(),
      kN = kit(),
      kE = kit(),
      segs = [],
      trunks = [];
    const step = (n, f) => {
      try {
        f();
      } catch (e) {
        console.warn('dorfkern ' + n, e);
      }
    };
    step('well', () => well(kS, kP, segs));
    step('benches', () => {
      for (const [x, y, az, len, col] of O.benches) bench(kP, x, y, az, len, L(...col), segs);
    });
    step('hedges', () => hedges(kN, segs));
    step('fences', () => fences(kN, segs));
    step('poles', () => poles(kP, kM, trunks));
    step('things', () => things(kP, kN, segs, trunks));
    step('porch', () => porch(kP));
    step('limes', () => limes());
    step('garland', () => garland(kE));
    const add = (k, m) => {
      if (k.empty()) return null;
      const me = new THREE.Mesh(k.geo(), m);
      me.userData.noMerge = true;
      me.castShadow = false;
      me.receiveShadow = false;
      scene.add(me);
      S.meshes.push(me);
      RATSCHER.bld.push(me); // hidden with the buildings in the map view
      return me;
    };
    add(kP, M.paint);
    add(kM, M.metal);
    add(kS, M.stone);
    add(kN, VNEAR.mat ? VNEAR.mat() : M.paint);
    S.garland = add(kE, M.paint);
    if (S.garland) {
      const i = RATSCHER.bld.indexOf(S.garland);
      if (i >= 0) RATSCHER.bld.splice(i, 1); // its own visibility (Easter)
      S.garland.visible = false;
    }
    // collisions: before world/worldcol.js builds its grid (module order)
    if (segs.length) {
      const W0 = RATSCHER.walls || new Float32Array(0),
        W1 = new Float32Array(W0.length + segs.length);
      W1.set(W0);
      W1.set(segs, W0.length);
      RATSCHER.walls = W1;
    }
    if (RATSCHER.treeXY) for (const t of trunks) RATSCHER.treeXY.push(t[0], t[1], t[2]);
    S.segs = segs.length / 4;
    S.offTick = KERN.tick(tick, 'world/dorfkern');
    tick();
    S.on = S.ready = true;
    S.ms = Math.round(performance.now() - t0);
    markDirty(true);
  }
  whenLoaded(() => {
    if (!RATSCHER.ready || !window.VPROPS || !VPROPS.ready) return;
    try {
      build();
    } catch (e) {
      console.warn('dorfkern', e);
    }
  });
  S.state = () => ({
    ready: S.ready,
    meshes: S.meshes.length,
    segs: S.segs || 0,
    limes: (S.limes || []).length,
    easter: S.easter,
    ms: S.ms,
  });
  return S;
})();
window.DORFKERN = DORFKERN;
