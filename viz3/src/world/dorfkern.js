// ===================== feat/dorfkern: the open space of the centre as Falko filmed it (pan of 10.04.2023, photo of Anger 15) =====================
// The well in front of Anger 15 (OSM man_made=water_well): a polygonal sandstone wall with copings round a sunken basin, steps down on its
// south side, the wooden pump post; a brown and a green bench and the green bin beside it; concrete pavers round it and as the parking strip
// on the south side of the street, with granite kerbs; the limes by the well and on the green as 3D crowns (copies of the Dorflinde's, on the
// trunks the video shows); the picnic table, the bin and the log bench on the green, the long trimmed hedges; concrete power poles with the
// overhead line along the north side of the street, the vending machine by the post box, the picket fence (brown pickets, red-brown posts)
// along the meadow behind the bus stop, the white box behind it, the carved signpost and the flower bowl before the school, the porch roofs
// of Anger 23 and 13, the dormers of Anger 18; in the Easter weeks an arch of coloured eggs over the well. Places: rays of the video frames
// on the ground (docs/features/dorfkern.md, data in world/dorfkern_data.js). Geometry from the kit of world/village_props.js with its
// materials and the one of world/village_near.js – no new shader programs; a few meshes built once, collisions before world/worldcol.js.
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { RATSCHER } from './ratscher.js';
import { RENDER } from '../render/render.js';
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
  // ---- paving (concrete pavers, the texture of world/village_props.js) with a granite kerb: round the well, the parking strip ----
  function paving(kPv, kS) {
    for (const pa of O.paving || []) {
      const pts = pa.p,
        T = THREE.ShapeUtils.triangulateShape(
          pts.map(p => new THREE.Vector2(p[0], p[1])),
          []
        );
      for (const [a, b, c] of T) {
        const P3 = [a, b, c].map(i => [pts[i][0], pts[i][1], gz(pts[i][0], pts[i][1]) + 0.05]),
          cr = (P3[1][0] - P3[0][0]) * (P3[2][1] - P3[0][1]) - (P3[1][1] - P3[0][1]) * (P3[2][0] - P3[0][0]),
          o = cr > 0 ? [0, 1, 2] : [0, 2, 1];
        kPv.tri(P3[o[0]], P3[o[1]], P3[o[2]], L(0.5, 0.49, 0.46), ...o.map(i => [P3[i][0], P3[i][1]]));
      }
      // the kerb nearly flush (video, photo), in stones of up to 3 m that follow the ground
      for (const k of pa.kerb || []) {
        const A = pts[k],
          B = pts[(k + 1) % pts.length],
          l = Math.hypot(B[0] - A[0], B[1] - A[1]),
          n = Math.max(1, Math.ceil(l / 3));
        for (let j = 0; j < n; j++) {
          const mx = A[0] + ((B[0] - A[0]) * (j + 0.5)) / n,
            my = A[1] + ((B[1] - A[1]) * (j + 0.5)) / n;
          kS.box(
            mx,
            my,
            gz(mx, my) - 0.18,
            l / n + 0.02,
            0.16,
            0.27,
            Math.atan2(B[1] - A[1], B[0] - A[0]),
            L(0.66, 0.66, 0.64)
          );
        }
      }
    }
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
      // a red case with a white front and three windows of sweets, on a grey post, its top below the post box's (video 14–18 s)
      const [x, y, az] = O.vending,
        z = gz(x, y),
        r = az2rot(az + 90);
      kP.cyl(x, y, z, z + 0.66, 0.035, 0.035, 6, L(0.55, 0.55, 0.55));
      kP.box(x, y, z + 0.66, 0.52, 0.2, 0.5, r, L(0.62, 0.08, 0.1));
      const c = Math.cos(r + Math.PI / 2),
        s = Math.sin(r + Math.PI / 2);
      kP.box(x + c * 0.09, y + s * 0.09, z + 0.7, 0.44, 0.04, 0.42, r, L(0.92, 0.92, 0.9));
      for (const o of [-0.13, 0, 0.13])
        kP.box(
          x + c * 0.115 + Math.cos(r) * o,
          y + s * 0.115 + Math.sin(r) * o,
          z + 0.82,
          0.08,
          0.02,
          0.22,
          r,
          L(0.85, 0.6, 0.2)
        );
      trunks.push([x, y, 1]);
    }
    // the carved wooden signpost with its little roof and the concrete flower bowl on the lawn before the school (video 19–21 s, Commons 2026)
    if (O.signpost) {
      const [x, y] = O.signpost,
        z = gz(x, y);
      kP.cyl(x, y, z, z + 2.7, 0.13, 0.1, 7, L(0.45, 0.32, 0.2), true);
      kP.box(x, y, z + 2.7, 0.5, 0.42, 0.06, 0.4, L(0.3, 0.2, 0.12));
      kP.box(x, y, z + 2.76, 0.12, 0.5, 0.18, 0.4, L(0.3, 0.2, 0.12));
      for (const [ang, zz] of [
        [20, 2.25],
        [200, 2.05],
        [290, 1.85],
      ]) {
        const r = az2rot(ang);
        kP.box(x + Math.cos(r) * 0.32, y + Math.sin(r) * 0.32, z + zz, 0.5, 0.025, 0.14, r, L(0.12, 0.45, 0.2));
      }
      trunks.push([x, y, 1]);
    }
    if (O.planter) {
      const [x, y] = O.planter,
        z = gz(x, y);
      kP.cyl(x, y, z, z + 0.45, 0.16, 0.13, 8, CONC);
      kP.lathe(
        x,
        y,
        z + 0.45,
        [
          [0.12, 0],
          [0.42, 0.16],
          [0.5, 0.3],
          [0.42, 0.3],
          [0.0, 0.26],
        ],
        12,
        CONC
      );
      const FL = [L(0.85, 0.15, 0.35), L(0.9, 0.9, 0.88), L(0.6, 0.3, 0.75), L(0.2, 0.42, 0.15)];
      for (let i = 0; i < 14; i++) {
        const a = i * 2.4,
          d = 0.1 + (i % 4) * 0.08;
        kP.ball(x + Math.cos(a) * d, y + Math.sin(a) * d, z + 0.82, 0.08, FL[i % 4], 5);
      }
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
  // ---- dormers on a rebuilt house (Anger 18): slate cheeks and front, a white window, a small gable roof in the house's tiles ----
  function dormers(kP) {
    if (!VILLAGE.parts || !VILLAGE.roofZ) return;
    const SL = [0.13, 0.133, 0.145],
      WH = L(0.88, 0.88, 0.86),
      GL = L(0.05, 0.06, 0.07);
    for (const [id, d] of Object.entries(DKDATA.houses)) {
      if (!d.dormers) continue;
      const e = [...VILLAGE.parts.entries()].find(([, p]) => p.of === +id && p.look === d),
        b = e && VILLAGE.byId.get(e[0]);
      if (!b) continue;
      const D = d.dormers,
        dd = f => Math.abs((((((Math.atan2(f.nx, f.ny) * 180) / Math.PI - D.az) % 360) + 540) % 360) - 180),
        f = b.fac.filter(k => k.L > 3).reduce((a, c) => (dd(c) < dd(a) ? c : a)),
        RF = d.roof ? L(...d.roof) : L(0.66, 0.32, 0.22),
        rot = Math.atan2(f.dy, f.dx);
      for (const at of D.at) {
        const u = at * f.L,
          fx = f.ax + f.dx * u - f.nx * 0.9,
          fy = f.ay + f.dy * u - f.ny * 0.9,
          z0 = VILLAGE.roofZ(e[0], fx, fy),
          sl = VILLAGE.roofZ(e[0], fx - f.nx, fy - f.ny) - z0,
          hf = D.h,
          dep = (hf + 0.35) / Math.max(sl, 0.3),
          half = D.w / 2 + 0.12,
          zt = z0 + hf,
          rise = 0.45;
        if (z0 === null) continue;
        kP.box(fx - (f.nx * dep) / 2, fy - (f.ny * dep) / 2, z0 - 0.35, D.w, dep, hf + 0.35, rot, SL);
        kP.box(fx + f.nx * 0.02, fy + f.ny * 0.02, z0 + 0.2, D.w * 0.64, 0.04, hf - 0.42, rot, WH);
        kP.box(fx + f.nx * 0.035, fy + f.ny * 0.035, z0 + 0.28, D.w * 0.52, 0.04, hf - 0.58, rot, GL);
        const P = (a, c, z) => [fx + f.nx * c + f.dx * a, fy + f.ny * c + f.dy * a, z];
        for (const sd of [-1, 1]) {
          const A = P(sd * half, 0.15, zt - 0.05),
            B = P(0, 0.15, zt + rise),
            C = P(0, -dep - 0.2, zt + rise),
            Dd = P(sd * half, -dep - 0.2, zt - 0.05);
          kP.quad(A, B, C, Dd, RF);
          kP.quad(Dd, C, B, A, RF);
        }
        kP.tri(P(-half + 0.1, 0.1, zt - 0.02), P(half - 0.1, 0.1, zt - 0.02), P(0, 0.1, zt + rise - 0.06), SL);
        kP.tri(P(half - 0.1, 0.1, zt - 0.02), P(-half + 0.1, 0.1, zt - 0.02), P(0, 0.1, zt + rise - 0.06), SL);
      }
    }
  }
  // ---- the limes by the well and on the green: 3D crowns – copies of the Dorflinde's (world/village_props.js, same materials, the thinned
  // leaf cards), turned and scaled to the trunks and heights the video shows. On the lightest tier the measured crowns of world/ratscher.js
  // (cheap crossed cards) stand in for them, moved to the same trunks (tick switches by RENDER.tier) ----
  function limes() {
    const recs = RATSCHER.treeRecs || [],
      T = RATSCHER.treeXY,
      LM = VPROPS.lindeMeshes,
      [lx, ly] = VPROPS.LINDE,
      base = V(lx, ly, gz(lx, ly) - 0.15),
      H = 21, // the Dorflinde's height (world/village_props.js)
      m4 = new THREE.Matrix4(),
      p = new THREE.Vector3(),
      q = new THREE.Quaternion(),
      sc = new THREE.Vector3();
    S.limes = [];
    S.limeCards = [];
    S.limeMeshes = [];
    for (const lm of O.limes) {
      const r = lm.from && recs.find(k => Math.hypot(k.x - lm.from[0], k.y - lm.from[1]) < 0.6),
        z = gz(lm.at[0], lm.at[1]);
      if (r) {
        // the measured crown: its card moved onto the trunk, scaled to the height (shown on the lightest tier only)
        const k = lm.h / r.h;
        for (const [im, i] of r.inst) {
          im.getMatrixAt(i, m4);
          m4.decompose(p, q, sc);
          p.copy(V(lm.at[0], lm.at[1], z - 0.3));
          sc.multiplyScalar(k);
          if (lm.w) sc.x = sc.z = sc.x * lm.w;
          S.limeCards.push([im, i, new THREE.Matrix4().compose(p, q, sc)]);
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
      } else if (T) T.push(lm.at[0], lm.at[1], lm.h);
      if (LM) {
        // the Dorflinde's crown reaches down to 3–4 m on a trunk of 3 m girth: stretch the trunk to the crown base the video shows (cb),
        // squeeze the crown into what is left of the height; across, the trunk to its own diameter (dt) and the branches and leaves beyond
        // it to the crown's radius (rc) – one map for bark and leaves alike, so the branches stay in the leaves
        const st = srcStats(LM, base),
          s = lm.h / H,
          cb = lm.cb || st.u0 * s,
          kt = lm.dt ? lm.dt / 2 / st.rt : s * (lm.w || 1),
          kc = lm.rc ? Math.max(0.05, (lm.rc - kt * st.rt) / Math.max(1, st.rc - st.rt)) : s * (lm.w || 1),
          up = (lm.h - cb) / Math.max(1, st.top - st.u0);
        m4.makeRotationY(lm.turn || 0).premultiply(
          new THREE.Matrix4().makeTranslation(...V(lm.at[0], lm.at[1], z - 0.15).toArray())
        );
        for (const src of [LM[0], LM[3]]) {
          const g = src.geometry.clone(),
            a = g.attributes.position.array,
            bark = src === LM[0];
          for (let i = 0; i < a.length; i += 3) {
            const x = a[i] - base.x,
              u = a[i + 1] - base.y,
              y = a[i + 2] - base.z,
              r = Math.hypot(x, y),
              k = r <= st.rt ? kt : (kt * st.rt + kc * (r - st.rt)) / r,
              vc = cb + (u - st.u0) * up, // the crown's map, also for leaves and twigs hanging below its foot
              w = bark ? Math.min(1, Math.max(0, (r - st.rt) / st.rt)) : 1; // the trunk's own map near its axis
            a[i] = x * k;
            a[i + 1] = u < st.u0 ? (1 - w) * ((u * cb) / st.u0) + w * vc : vc;
            a[i + 2] = y * k;
          }
          g.applyMatrix4(m4);
          g.computeBoundingSphere();
          const me = new THREE.Mesh(g, src.material);
          me.userData.noMerge = true;
          me.castShadow = false;
          me.receiveShadow = false;
          me.visible = false;
          scene.add(me);
          S.meshes.push(me);
          S.limeMeshes.push(me);
        }
      }
      S.limes.push([lm.at[0], lm.at[1], lm.h]);
    }
    S.lite = null; // tick decides
  }
  // the Dorflinde's geometry measured once: trunk radius at 1–2 m (median), the crown's foot (3 % of the leaves lower), top, radius (95 %)
  function srcStats(LM, base) {
    if (S.src) return S.src;
    const b = LM[0].geometry.attributes.position.array,
      l = LM[3].geometry.attributes.position.array,
      rr = [],
      hs = [],
      rs = [];
    for (let i = 0; i < b.length; i += 3) {
      const u = b[i + 1] - base.y,
        r = Math.hypot(b[i] - base.x, b[i + 2] - base.z);
      if (u > 1 && u < 2 && r < 5) rr.push(r);
    }
    for (let i = 0; i < l.length; i += 9) {
      hs.push(l[i + 1] - base.y);
      rs.push(Math.hypot(l[i] - base.x, l[i + 2] - base.z));
    }
    const q = (v, f, d) => (v.length ? v.sort((p, n) => p - n)[Math.floor(v.length * f)] : d);
    S.src = {
      rt: q(rr, 0.5, 1),
      u0: Math.max(0.5, q(hs, 0.03, 3)),
      top: hs.length ? hs[hs.length - 1] : 21,
      rc: q(rs, 0.95, 9),
    };
    return S.src;
  }
  const Z0 = new THREE.Matrix4().makeScale(0, 0, 0);
  function limeTier() {
    const lite = RENDER.tier === 'schnell' || !S.limeMeshes.length,
      map = !!RATSCHER.map,
      key = (lite ? 1 : 0) + (map ? 2 : 0);
    if (key === S.lite) return;
    S.lite = key;
    for (const me of S.limeMeshes) me.visible = !lite && !map;
    for (const [im, i, m4] of S.limeCards) {
      im.setMatrixAt(i, lite ? m4 : Z0);
      im.instanceMatrix.needsUpdate = true;
      im.computeBoundingSphere();
    }
    markDirty();
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
      cols = [
        L(0.95, 0.85, 0.1),
        L(0.9, 0.2, 0.25),
        L(0.2, 0.5, 0.9),
        L(0.25, 0.75, 0.3),
        L(0.95, 0.5, 0.1),
        L(0.75, 0.35, 0.85),
      ],
      GR = L(0.12, 0.35, 0.12);
    // the arch on the end wall of the well (video 0–6 s: about 1.8 m wide and high), wound with green and hung with eggs
    const b = w.size[1] / 2 - w.chamfer,
      u0 = w.size[0] / 2 - 0.2; // the east-north-east end (left of the well in the video and in the photo, by the bin)
    for (let i = 0; i <= 24; i++) {
      const t = i / 24,
        ang = Math.PI * t,
        v = -b * Math.cos(ang),
        h = z + w.h + 0.13 + 1.55 * Math.sin(ang),
        x = cx + u0 * cs - v * sn,
        y = cy + u0 * sn + v * cs;
      k.ball(x, y, h, 0.12, GR, 5);
      k.lathe(
        x + 0.06 * Math.sin(i * 1.7),
        y + 0.06 * Math.cos(i * 1.7),
        h - 0.22,
        [
          [0.0, 0],
          [0.05, 0.02],
          [0.065, 0.07],
          [0.05, 0.12],
          [0.0, 0.14],
        ],
        6,
        cols[i % cols.length]
      );
    }
  }
  function tick() {
    if (S.limeMeshes) limeTier();
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
    const kPv = kit();
    step('paving', () => paving(kPv, kS));
    step('well', () => well(kS, kP, segs));
    step('benches', () => {
      for (const [x, y, az, len, col] of O.benches) bench(kP, x, y, az, len, L(...col), segs);
    });
    step('hedges', () => hedges(kN, segs));
    step('fences', () => fences(kN, segs));
    step('poles', () => poles(kP, kM, trunks));
    step('things', () => things(kP, kN, segs, trunks));
    step('porch', () => porch(kP));
    step('dormers', () => dormers(kP));
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
    if (M.pave) add(kPv, M.pave);
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
    src: S.src && Object.fromEntries(Object.entries(S.src).map(([k, v]) => [k, +v.toFixed(2)])),
    easter: S.easter,
    ms: S.ms,
  });
  return S;
})();
window.DORFKERN = DORFKERN;
