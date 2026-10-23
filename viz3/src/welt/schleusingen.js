// ===================== Schleusingen: the old town after photos – walkable, the Rathaus to enter (SCHL) =====================
// Loaded only when the camera comes within 950 m of the Markt (Orte → „Schleusingen“, or on foot/by car), freed beyond 1350 m. Ground:
// the tiled world (welt/welt.js). Buildings: 789 OSM footprints of the old town (tools/welt/zone_schleusingen.py → dist/schleusingen/
// stadt.json: facades with their top line, roof faces, roof colour from the orthophoto, storeys, names, shops), drawn with the facade and
// roof shaders of the village (world/village.js – no new shader programs): plaster in the colours of the Markt photos (yellow, salmon,
// ochre, sage, cream), slate on upper floors and gables, half-timbering in the side streets; party walls without windows. Landmarks
// modelled after the photos (Wikimedia Commons 2008–2025): the Rathaus with its gable to the Markt, roof turret, clock and a door one can
// go through into the hall (Bürgerbüro), St. Johannis with its tower and dark cupola, the Bertholdsburg with round towers and the
// half-timbered top floor, the Marktbrunnen, street lamps (lit at night, they light the walls), benches. Street names on the HUD (OSM).
import * as THREE from 'three';
import { BASE, cam, scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { SPOTS } from '../game/player.js';
import { toast } from '../audio/audio.js';
import { RATSCHER } from '../world/ratscher.js';
import { VILLAGE } from '../world/village.js';
import { VPROPS } from '../world/village_props.js';
import { WELT } from './welt.js';
export const SCHL = (() => {
  const S = { on: false, state: 'idle', meshes: [], bld: [], segs: [], lamps: [], ms: 0, err: '' };
  if (!WELT.on) return S;
  S.on = true;
  const MARKT = [-1084.7, 1241.9],
    NEAR = 950,
    FAR = 1350,
    ZONE = [MARKT[0] - 600, MARKT[1] - 600, MARKT[0] + 600, MARKT[1] + 600],
    inZone = (x, y) => x > ZONE[0] && x < ZONE[2] && y > ZONE[1] && y < ZONE[3];
  S.MARKT = MARKT;
  const URL_ = BASE + 'schleusingen/stadt.json';
  const hh = n => {
    const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    linC = (c, k = 1) => c.map(v => lin(v) * k);
  // ---- the menu place: on the Markt, looking at the Rathaus ----
  const START = [-1100.5, 1214.5];
  SPOTS.schleusingen = {
    mode: 'walk',
    pos: START,
    z: 0,
    yaw: (Math.atan2(-1131 - START[0], 1198 - START[1]) * 180) / Math.PI,
    pitch: 4,
    label: 'Schleusingen (Markt)',
  };
  whenLoaded(() => {
    if (RATSCHER.hAt) SPOTS.schleusingen.z = RATSCHER.hAt(START[0], START[1]);
  });
  // ---- styles (world/village.js ST) and the colours of the photos ----
  const ST = {
    PLASTER: 0,
    MODERN: 1,
    SLATE: 2,
    SLATE_UP: 3,
    SLATE_GABLE: 4,
    FW: 5,
    FW_UP: 6,
    BARN: 7,
    BARN_FULL: 8,
    BRICK: 9,
    HALL: 10,
    SHED: 11,
    SCHOOL: 12,
  };
  // Markt and old town (Wikimedia Commons, 2008–2025): yellow, salmon, ochre, sage green, cream, white, light grey, rose, mint, straw
  const PAL = [
    [0.93, 0.84, 0.56],
    [0.89, 0.62, 0.53],
    [0.85, 0.66, 0.38],
    [0.66, 0.71, 0.6],
    [0.94, 0.9, 0.8],
    [0.95, 0.94, 0.91],
    [0.82, 0.82, 0.8],
    [0.92, 0.78, 0.66],
    [0.8, 0.86, 0.82],
    [0.9, 0.85, 0.62],
  ].map(c => linC(c, 0.82));
  const BOARDS = [
      [0.52, 0.48, 0.43],
      [0.45, 0.36, 0.28],
      [0.58, 0.55, 0.5],
    ],
    SHEET = [
      [0.8, 0.81, 0.8],
      [0.52, 0.6, 0.52],
      [0.72, 0.68, 0.62],
    ].map(c => linC(c, 0.85)),
    SAND = linC([0.8, 0.74, 0.62], 0.82), // the sandstone of St. Johannis and the Bertholdsburg
    CREAM = linC([0.95, 0.87, 0.66], 0.82); // the Rathaus front
  function styleOf(b, i) {
    const k = hh(i * 3.7 + 1),
      k2 = hh(i + 11.3),
      dM = Math.hypot(b.cx - MARKT[0], b.cy - MARKT[1]);
    const o = {
      style: ST.PLASTER,
      col: PAL[Math.floor(k2 * PAL.length)],
      timber: k2 < 0.6 ? 0 : k2 < 0.85 ? 1 : 2,
      frame: hh(i + 5) < 0.86 ? 0 : 1,
      door: Math.floor(hh(i + 9) * 6),
      shut: Math.floor(hh(i + 13) * 3),
      shutters: false,
      orn: false,
      raised: hh(i + 2) < 0.35,
      sp: 2.5 + hh(i + 4) * 0.5,
      typ: b.k === 2 ? 2 : b.k === 1 ? 1 : 0,
    };
    if (b.lm === 'rathaus') return Object.assign(o, { col: CREAM, frame: 0, door: 5, raised: false, sp: 2.6, typ: 0 });
    if (b.lm === 'kirche' || b.lm === 'burg' || b.lm === 'turm')
      return Object.assign(o, { col: SAND, frame: 0, door: 1, sp: 3.0, typ: 0 });
    if (b.k === 2) return Object.assign(o, { style: ST.SHED, col: linC(BOARDS[Math.floor(k * 3)], 0.8), sp: 3.2 });
    if (b.k === 1) {
      if (b.s || b.n)
        return Object.assign(o, { style: ST.MODERN, col: PAL[[4, 5, 6][Math.floor(k * 3)]], sp: 3.4, frame: 0 });
      return Object.assign(o, { style: ST.HALL, col: SHEET[Math.floor(k * 3)], sp: 4.5 });
    }
    if (dM < 80) o.style = k < 0.18 ? ST.SLATE_GABLE : k < 0.26 ? ST.SLATE_UP : ST.PLASTER;
    else if (b.old) {
      if (k < 0.08) o.style = ST.SLATE;
      else if (k < 0.2) o.style = ST.SLATE_UP;
      else if (k < 0.3) o.style = ST.SLATE_GABLE;
      else if (k < 0.4) o.style = ST.FW_UP;
      else if (k < 0.45) o.style = ST.FW;
    } else o.style = k < 0.45 ? ST.MODERN : k < 0.6 ? ST.SLATE_GABLE : ST.PLASTER;
    if (o.style === ST.SLATE || o.style === ST.SLATE_UP) o.orn = hh(i + 17) < 0.3;
    if (o.style === ST.PLASTER || o.style === ST.FW_UP) o.shutters = hh(i + 19) < 0.12;
    if (o.style === ST.MODERN) {
      o.col = PAL[[4, 5, 6, 0, 9, 3][Math.floor(k2 * 6)]];
      o.sp = 3.1 + hh(i + 4) * 0.4;
      o.frame = 0;
    }
    return o;
  }
  // ---- geometry buffers in the attribute layout of world/village.js ----
  function wallBuf() {
    const A = { position: [], normal: [], aW: [], aV: [], aG: [], aD: [], aC: [], aTan: [] },
      I = [];
    return {
      A,
      I,
      // one quad of a facade: a → b (outward to the right seen from above), feet za/zb, tops ta/tb above the building's foot z0
      quad(f, ax, ay, bx, by, ua, ub, ta, tb, z0, zLow, at) {
        const n = A.position.length / 3,
          nx = f.dy,
          ny = -f.dx;
        for (const [x, y, u, v, top] of [
          [ax, ay, ua, zLow - z0, ta],
          [ax, ay, ua, ta, ta],
          [bx, by, ub, zLow - z0, tb],
          [bx, by, ub, tb, tb],
        ]) {
          A.position.push(x, z0 + v, -y);
          A.normal.push(nx, 0, -ny);
          A.aW.push(u + at.u0, v, top, at.w);
          A.aV.push(u, at.LF, at.eave, at.st);
          A.aG.push(at.t0, at.tA, at.uA, at.t1);
          A.aD.push(at.du, at.dw, at.sp, at.fl);
          A.aC.push(at.col[0], at.col[1], at.col[2], at.pk);
          A.aTan.push(f.dx, 0, -f.dy);
        }
        I.push(n, n + 2, n + 3, n, n + 3, n + 1);
      },
      geo() {
        const g = new THREE.BufferGeometry();
        for (const [k, a] of Object.entries(A))
          g.setAttribute(
            k,
            new THREE.Float32BufferAttribute(a, k === 'position' || k === 'normal' || k === 'aTan' ? 3 : 4)
          );
        g.setIndex(I);
        g.computeBoundingSphere();
        return g;
      },
    };
  }
  function roofBuf() {
    const pos = [],
      nrm = [],
      uv = [],
      rk = [],
      tan = [];
    const push = (p, n, u, k, tg) => {
      pos.push(p[0], p[2], -p[1]);
      nrm.push(n[0], n[2], -n[1]);
      uv.push(u[0], u[1]);
      rk.push(k[0], k[1], k[2], k[3]);
      tan.push(tg[0], 0, -tg[1]);
    };
    const tri = (a, b, c, n, uvs, k, tg) => {
      const cr =
        ((b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1])) * n[0] +
        ((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2])) * n[1] +
        ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) * n[2];
      if (cr < 0) {
        push(a, n, uvs[0], k, tg);
        push(c, n, uvs[2], k, tg);
        push(b, n, uvs[1], k, tg);
      } else {
        push(a, n, uvs[0], k, tg);
        push(b, n, uvs[1], k, tg);
        push(c, n, uvs[2], k, tg);
      }
    };
    const Z4 = [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    const quad = (a, b, c, d, n, k, tg, uq = Z4) => {
      tri(a, b, c, n, [uq[0], uq[1], uq[2]], k, tg);
      tri(a, c, d, n, [uq[0], uq[2], uq[3]], k, tg);
    };
    return {
      tri,
      quad,
      geo() {
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
        g.setAttribute('aR', new THREE.Float32BufferAttribute(rk, 4));
        g.setAttribute('aTan', new THREE.Float32BufferAttribute(tan, 3));
        g.computeBoundingSphere();
        return g;
      },
    };
  }
  // ---- one building: facades (with the door), roof (faces, soffit, fascia, gutters, ridge tiles, chimney), collision segments ----
  function building(b, i, z0, WB, RB) {
    const o = b.st,
      pk = o.timber + 4 * o.frame + 16 * o.door + 128 * o.shut,
      eave = b.e;
    // the door: on the facade towards the nearest street (not a party wall), in a bay like world/village.js
    let doorF = -1,
      best = 1e9;
    b.F.forEach((f, k) => {
      const L = Math.hypot(f[2] - f[0], f[3] - f[1]);
      if (f[8] & 1 || L < 3 || f[9] > 15) return;
      const sc = f[9] - L * 0.05;
      if (sc < best) {
        best = sc;
        doorF = k;
      }
    });
    if (b.door != null) doorF = b.door;
    let u0 = 0;
    b.F.forEach((f, k) => {
      const [ax, ay, bx, by, t0, uA0, tA0, t1, fl] = f,
        L = Math.hypot(bx - ax, by - ay);
      if (L < 0.05) return;
      const F = { dx: (bx - ax) / L, dy: (by - ay) / L },
        gable = tA0 > Math.max(t0, t1) + 0.6 && uA0 > 0.3 && uA0 < L - 0.3,
        blind = fl & 1,
        st = blind && (o.style === ST.FW || o.style === ST.FW_UP) ? ST.PLASTER : o.style,
        sp = o.sp,
        nb = Math.max(1, Math.floor((L - 0.6) / sp)),
        bw = L / nb;
      let du = -1,
        dw = 0;
      if (k === doorF) {
        if (b.doorU != null) {
          du = b.doorU;
          dw = b.doorW || 1.1;
        } else if (o.typ === 0) {
          du = ((nb >= 3 ? (hh(i + 23) < 0.5 ? 1 : nb - 2) : 0) + 0.5) * bw;
          dw = 1.05;
        } else if (st === ST.HALL) {
          du = L / 2;
          dw = Math.min(5, L * 0.4);
        } else if (L > 3) {
          du = L / 2;
          dw = Math.min(2.5, L * 0.6);
        }
      }
      if (du >= 0) b.doorFac = { ax, ay, dx: F.dx, dy: F.dy, u: du, w: dw };
      const at = {
        u0,
        w: 4 * i + o.typ,
        LF: blind ? 0.5 : L,
        eave,
        st: b.stF ? b.stF(f, k) : st,
        t0,
        tA: gable ? tA0 : (t0 + t1) / 2,
        uA: gable ? uA0 : L / 2,
        t1,
        du,
        dw,
        sp,
        fl: (gable ? 1 : 0) + (o.shutters ? 2 : 0) + (o.orn ? 4 : 0) + (o.raised ? 8 : 0),
        col: b.colF ? b.colF(f, k) : o.col,
        pk,
      };
      const low = z0 - 2.0;
      if (b.hole && b.hole.k === k) {
        // a real opening (the Rathaus door): left part, right part, lintel
        const h0 = b.hole.u - b.hole.w / 2,
          h1 = b.hole.u + b.hole.w / 2,
          top = b.hole.h,
          P_ = u => [ax + F.dx * u, ay + F.dy * u],
          tAt = u =>
            gable
              ? u < uA0
                ? t0 + ((tA0 - t0) * u) / uA0
                : tA0 + ((t1 - tA0) * (u - uA0)) / (L - uA0)
              : t0 + ((t1 - t0) * u) / L;
        const seg = (ua, ub, zb, tt) => {
          const [x0, y0] = P_(ua),
            [x1, y1] = P_(ub);
          WB.quad(F, x0, y0, x1, y1, ua, ub, tt ? top : tAt(ua), tt ? top : tAt(ub), z0, zb, at);
        };
        const cuts = [0, h0, h1, L].concat(gable ? [uA0] : []).sort((p, q) => p - q);
        for (let c = 0; c + 1 < cuts.length; c++) {
          const ua = cuts[c],
            ub = cuts[c + 1];
          if (ub - ua < 0.01) continue;
          if (ua >= h0 - 1e-6 && ub <= h1 + 1e-6) {
            // above the opening: from the lintel up
            const [x0, y0] = P_(ua),
              [x1, y1] = P_(ub);
            WB.quad(F, x0, y0, x1, y1, ua, ub, tAt(ua), tAt(ub), z0, z0 + top, at);
          } else seg(ua, ub, low, false);
        }
        S.segs.push([ax, ay, ax + F.dx * h0, ay + F.dy * h0], [ax + F.dx * h1, ay + F.dy * h1, bx, by]);
      } else {
        if (gable) {
          const mx = ax + F.dx * uA0,
            my = ay + F.dy * uA0;
          WB.quad(F, ax, ay, mx, my, 0, uA0, t0, tA0, z0, low, at);
          WB.quad(F, mx, my, bx, by, uA0, L, tA0, t1, z0, low, at);
        } else WB.quad(F, ax, ay, bx, by, 0, L, t0, t1, z0, low, at);
        S.segs.push([ax, ay, bx, by]);
      }
      u0 += L;
    });
    // ---- roof ----
    const V3 = [],
      rv = b.rv;
    for (let k = 0; k < rv.length; k += 3) V3.push([rv[k], rv[k + 1], rv[k + 2] + z0]);
    const kind = b.rk,
      col = b.rc.map(lin),
      th = b.k === 0 ? 0.16 : 0.1,
      k1 = [kind, col[0], col[1], col[2]],
      T = [];
    for (let k = 0; k < b.rt.length; k += 3) {
      const a = V3[b.rt[k]],
        c = V3[b.rt[k + 1]],
        d = V3[b.rt[k + 2]];
      let nx = (c[1] - a[1]) * (d[2] - a[2]) - (c[2] - a[2]) * (d[1] - a[1]),
        ny = (c[2] - a[2]) * (d[0] - a[0]) - (c[0] - a[0]) * (d[2] - a[2]),
        nz = (c[0] - a[0]) * (d[1] - a[1]) - (c[1] - a[1]) * (d[0] - a[0]);
      const l = Math.hypot(nx, ny, nz) || 1;
      nx /= l;
      ny /= l;
      nz /= l;
      if (nz < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      T.push({ v: [a, c, d], n: [nx, ny, nz], gx: nz > 0.05 ? -nx / nz : 0, gy: nz > 0.05 ? -ny / nz : 0 });
    }
    const flat = !!b.fl;
    for (const t of T) {
      const n = t.n,
        hz = Math.hypot(n[0], n[1]);
      let ex = 1,
        ey = 0,
        dx = 0,
        dy = 1;
      if (hz > 0.05) {
        dx = n[0] / hz;
        dy = n[1] / hz;
        ex = -dy;
        ey = dx;
      }
      const cosS = Math.max(0.2, n[2]),
        uvs = t.v.map(p => [p[0] * ex + p[1] * ey, hz > 0.05 ? -(p[0] * dx + p[1] * dy) / cosS : p[1]]);
      RB.tri(t.v[0], t.v[1], t.v[2], n, uvs, k1, [ex, ey]);
      RB.tri(
        ...t.v.map(p => [p[0], p[1], p[2] - th]),
        [-n[0], -n[1], -n[2]],
        uvs,
        [10, col[0], col[1], col[2]],
        [ex, ey]
      );
    }
    // edges: once and outside the walls = the outline (fascia, gutter); twice with a bend = ridge or hip (ridge tiles)
    const E = new Map(),
      kf = v => v[0].toFixed(2) + ',' + v[1].toFixed(2);
    for (const t of T)
      for (let k = 0; k < 3; k++) {
        const a = t.v[k],
          c = t.v[(k + 1) % 3],
          kk = [kf(a), kf(c)].sort().join('|');
        let e = E.get(kk);
        if (!e) E.set(kk, (e = { a, c, t: [] }));
        e.t.push(t);
      }
    const ring = [];
    for (let k = 0; k < b.f.length; k += 2) ring.push([b.f[k], b.f[k + 1]]);
    const inside = (x, y) => {
      let c = false;
      for (let p = 0, q = ring.length - 1; p < ring.length; q = p++) {
        const [xi, yi] = ring[p],
          [xj, yj] = ring[q];
        if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
      }
      return c;
    };
    for (const e of E.values()) {
      const A = e.a,
        C = e.c,
        L = Math.hypot(C[0] - A[0], C[1] - A[1], C[2] - A[2]);
      if (L < 0.05) continue;
      const tg = [
        (C[0] - A[0]) / (Math.hypot(C[0] - A[0], C[1] - A[1]) || 1),
        (C[1] - A[1]) / (Math.hypot(C[0] - A[0], C[1] - A[1]) || 1),
      ];
      if (e.t.length === 1) {
        const mx = (A[0] + C[0]) / 2,
          my = (A[1] + C[1]) / 2;
        if (!flat && inside(mx, my)) continue; // an inner edge split differently on its two faces: not an outline
        const t = e.t[0],
          cx = (t.v[0][0] + t.v[1][0] + t.v[2][0]) / 3,
          cy = (t.v[0][1] + t.v[1][1] + t.v[2][1]) / 3;
        let nx = tg[1],
          ny = -tg[0];
        if (nx * (mx - cx) + ny * (my - cy) < 0) {
          nx = -nx;
          ny = -ny;
        }
        if (flat) {
          const up = 0.28,
            ix = -nx * 0.2,
            iy = -ny * 0.2,
            A2 = [A[0], A[1], A[2] + up],
            C2 = [C[0], C[1], C[2] + up],
            A3 = [A[0] + ix, A[1] + iy, A[2] + up],
            C3 = [C[0] + ix, C[1] + iy, C[2] + up];
          RB.quad([A[0], A[1], A[2] - 0.12], [C[0], C[1], C[2] - 0.12], C2, A2, [nx, ny, 0], [18, 0, 0, 0], tg);
          RB.quad(A2, C2, C3, A3, [0, 0, 1], [18, 0, 0, 0], tg);
          continue;
        }
        RB.quad(
          A,
          C,
          [C[0], C[1], C[2] - th - 0.04],
          [A[0], A[1], A[2] - th - 0.04],
          [nx, ny, 0],
          [11, col[0], col[1], col[2]],
          tg
        );
        if (Math.abs(C[2] - A[2]) < 0.08 && b.k !== 2) {
          const gz = (A[2] + C[2]) / 2 - th - 0.03,
            gk = [13, 0, 0, 0],
            g0 = [A[0] + nx * 0.02, A[1] + ny * 0.02, gz],
            g1 = [C[0] + nx * 0.02, C[1] + ny * 0.02, gz],
            g2 = [C[0] + nx * 0.16, C[1] + ny * 0.16, gz - 0.1],
            g3 = [A[0] + nx * 0.16, A[1] + ny * 0.16, gz - 0.1];
          RB.quad(g0, g1, g2, g3, [nx * 0.5, ny * 0.5, -0.86], gk, tg);
          RB.quad(g3, g2, [g2[0], g2[1], gz + 0.03], [g3[0], g3[1], gz + 0.03], [nx, ny, 0], gk, tg);
        }
      } else if (e.t.length === 2 && !flat) {
        const [t1, t2] = e.t,
          mz = (A[2] + C[2]) / 2,
          low = t => (t.v[0][2] + t.v[1][2] + t.v[2][2]) / 3 < mz - 0.05;
        if (!low(t1) || !low(t2) || t1.n[0] * t2.n[0] + t1.n[1] * t2.n[1] + t1.n[2] * t2.n[2] > 0.995) continue;
        const rk2 = [12, col[0], col[1], col[2]],
          w = 0.15,
          h = 0.07;
        for (const t of [t1, t2]) {
          const hz = Math.hypot(t.n[0], t.n[1]) || 1,
            dx = t.n[0] / hz,
            dy = t.n[1] / hz,
            dzz = -w * Math.hypot(t.gx, t.gy);
          RB.quad(
            [A[0], A[1], A[2] + h],
            [C[0], C[1], C[2] + h],
            [C[0] + dx * w, C[1] + dy * w, C[2] + dzz + h * 0.5],
            [A[0] + dx * w, A[1] + dy * w, A[2] + dzz + h * 0.5],
            [t.n[0], t.n[1], t.n[2] + 0.3],
            rk2,
            tg,
            [
              [0, 0],
              [L, 0],
              [L, 1],
              [0, 1],
            ]
          );
        }
      }
    }
    // a chimney on most houses with a ridge
    if (b.k === 0 && !flat && !b.lm && hh(i + 31) < 0.7 && V3.length) {
      const zm = Math.max(...V3.map(v => v[2])),
        top = V3.filter(v => v[2] > zm - 0.12);
      let A = null,
        C = null,
        dm = 0;
      for (const p of top)
        for (const q of top) {
          const d = Math.hypot(p[0] - q[0], p[1] - q[1]);
          if (d > dm) {
            dm = d;
            A = p;
            C = q;
          }
        }
      if (A && dm > 3) {
        const f = 0.25 + hh(i + 37) * 0.5;
        chimney(
          RB,
          A[0] + (C[0] - A[0]) * f,
          A[1] + (C[1] - A[1]) * f,
          zm,
          0.52,
          0.42,
          zm + 0.95,
          Math.atan2(C[1] - A[1], C[0] - A[0]),
          14 + Math.floor(hh(i + 41) * 3),
          col
        );
      }
    }
  }
  function chimney(RB, cx, cy, z0, w, d, z1, ang, kk, col) {
    const c = Math.cos(ang),
      s = Math.sin(ang),
      pt = (x, y, z) => [cx + x * c - y * s, cy + x * s + y * c, z];
    const box = (x0, x1, y0, y1, za, zb, kind) => {
      const kq = [kind, col[0], col[1], col[2]];
      for (const [p, q, n] of [
        [
          [x1, y0],
          [x1, y1],
          [1, 0],
        ],
        [
          [x1, y1],
          [x0, y1],
          [0, 1],
        ],
        [
          [x0, y1],
          [x0, y0],
          [-1, 0],
        ],
        [
          [x0, y0],
          [x1, y0],
          [0, -1],
        ],
      ]) {
        const nn = [n[0] * c - n[1] * s, n[0] * s + n[1] * c, 0],
          tg = [-nn[1], nn[0]],
          P4 = [pt(p[0], p[1], za), pt(q[0], q[1], za), pt(q[0], q[1], zb), pt(p[0], p[1], zb)];
        RB.quad(
          ...P4,
          nn,
          kq,
          tg,
          P4.map(p2 => [(p2[0] - cx) * tg[0] + (p2[1] - cy) * tg[1] + 3, p2[2]])
        );
      }
      RB.quad(pt(x0, y0, zb), pt(x1, y0, zb), pt(x1, y1, zb), pt(x0, y1, zb), [0, 0, 1], kq, [c, s]);
    };
    box(-w / 2, w / 2, -d / 2, d / 2, z0 - 1.4, z1, kk);
    box(-w / 2 - 0.05, w / 2 + 0.05, -d / 2 - 0.05, d / 2 + 0.05, z1, z1 + 0.08, 17);
  }
  // ---- loading, building, freeing ----
  let data = null,
    gz = null;
  async function load() {
    S.state = 'loading';
    const t0 = performance.now();
    try {
      toast('Schleusingen wird geladen …', 2500);
      const r = await fetch(URL_);
      if (!r.ok) throw new Error('stadt.json ' + r.status);
      data = await r.json();
      gz = await WELT.sampler(ZONE[0], ZONE[1], ZONE[2], ZONE[3]);
      S.loadMs = Math.round(performance.now() - t0);
      S.state = 'data';
    } catch (e) {
      S.state = 'error';
      S.err = String(e);
      console.warn('schleusingen', e);
    }
  }
  const ground = (x, y) => {
    const z = gz && gz(x, y);
    return z !== undefined && z !== null ? z : RATSCHER.hAt ? RATSCHER.hAt(x, y) : 0;
  };
  S.gz = ground;
  function build() {
    const t0 = performance.now();
    S.segs = [];
    S.bld = [];
    const WB = wallBuf(),
      RB = roofBuf();
    data.b.forEach((b, i) => {
      let cx = 0,
        cy = 0;
      const n = b.f.length / 2;
      for (let k = 0; k < b.f.length; k += 2) {
        cx += b.f[k] / n;
        cy += b.f[k + 1] / n;
      }
      b.cx = cx;
      b.cy = cy;
      b.i = i;
      // the foot: the lowest ground along the walls
      let z0 = 1e9;
      for (const f of b.F) {
        z0 = Math.min(z0, ground(f[0], f[1]), ground((f[0] + f[2]) / 2, (f[1] + f[3]) / 2));
      }
      if (!isFinite(z0)) z0 = ground(cx, cy);
      b.z0 = z0 - 0.1;
      b.st = styleOf(b, i);
      LM_PREP[b.lm] && LM_PREP[b.lm](b);
      try {
        building(b, i, b.z0, WB, RB);
      } catch (e) {
        console.warn('schleusingen building', i, e);
      }
      S.bld.push(b);
    });
    const wm =
        (VILLAGE.ready && RATSCHER.bld && RATSCHER.bld[0] && RATSCHER.bld[0].material) ||
        new THREE.MeshStandardMaterial({ color: 0xd8d0c0 }),
      rm =
        (VILLAGE.ready && VILLAGE.meshes[0] && VILLAGE.meshes[0].material) ||
        new THREE.MeshStandardMaterial({ color: 0x8a4a35 });
    add(new THREE.Mesh(WB.geo(), wm), 'walls');
    add(new THREE.Mesh(RB.geo(), rm), 'roofs');
    props();
    grid();
    S.ms = Math.round(performance.now() - t0);
    S.state = 'ready';
    SPOTS.schleusingen.z = ground(START[0], START[1]);
    markDirty(true);
  }
  function add(m, name) {
    m.name = 'schleusingen ' + name;
    m.userData.noMerge = true;
    m.castShadow = false;
    m.receiveShadow = false;
    scene.add(m);
    S.meshes.push(m);
    return m;
  }
  S.dispose = () => {
    for (const m of S.meshes) {
      scene.remove(m);
      m.geometry.dispose();
      if (m.userData.own) m.material.dispose();
      if (m.userData.tex) m.userData.tex.dispose();
    }
    S.meshes.length = 0;
    if (VPROPS.lamps)
      for (const l of S.lamps) {
        const k = VPROPS.lamps.indexOf(l);
        if (k >= 0) VPROPS.lamps.splice(k, 1);
      }
    S.lamps = [];
    S.segs = [];
    S.cells = null;
    S.bld = [];
    S.rathaus = null;
    data = null;
    gz = null;
    S.state = 'idle';
    markDirty(true);
  };
  // ---- landmarks: what the generic building gets in addition (style per facade, the door hole, towers, turret …) ----
  const LM_PREP = {
    rathaus(b) {
      // the front to the Markt: cream with yellow ornament and a grey stone ground floor; slate on the gable at the back (photos 2008, 2025)
      let fm = -1,
        dm = -1e9;
      b.F.forEach((f, k) => {
        const L = Math.hypot(f[2] - f[0], f[3] - f[1]),
          mx = (f[0] + f[2]) / 2,
          my = (f[1] + f[3]) / 2,
          d = Math.hypot(MARKT[0] - mx, MARKT[1] - my),
          sc = ((((f[3] - f[1]) / L) * (MARKT[0] - mx) - ((f[2] - f[0]) / L) * (MARKT[1] - my)) / d) * Math.min(L, 16);
        if (L > 8 && sc > dm) {
          dm = sc;
          fm = k;
        }
      });
      const f = b.F[fm],
        L = Math.hypot(f[2] - f[0], f[3] - f[1]);
      b.door = fm;
      b.doorU = L * 0.38;
      b.doorW = 1.5;
      b.hole = { k: fm, u: L * 0.38, w: 1.5, h: 2.6 };
      b.front = { k: fm, f, L };
      b.stF = (ff, k) => (k === fm ? ST.PLASTER : ff[6] > ff[4] + 1 ? ST.SLATE_UP : ST.PLASTER);
    },
    kirche(b) {
      b.stF = () => ST.PLASTER;
      b.F.forEach(f => (f[8] |= 1)); // no house windows: the church windows are tall arches (props)
    },
    burg(b) {
      b.stF = (f, k) => ST.FW_UP;
      b.st.sp = 2.9;
    },
    turm(b) {
      b.stF = () => ST.PLASTER;
      b.F.forEach(f => (f[8] |= 1));
    },
  };
  // ---- props: lamps, fountain, benches, the church tower, the castle towers, the Rathaus turret and hall ----
  function props() {
    const kit = VPROPS.kit;
    if (!kit) return;
    const K = kit(),
      IRON = [0.03, 0.03, 0.032],
      STONE = linC([0.7, 0.66, 0.58]),
      DARK = linC([0.16, 0.17, 0.19]),
      SLATE = linC([0.2, 0.21, 0.23]),
      GOLD = linC([0.85, 0.66, 0.25]),
      WOOD = linC([0.42, 0.27, 0.16]),
      RED = linC([0.62, 0.14, 0.1]);
    const gzz = (x, y) => ground(x, y);
    // the Marktbrunnen (photos 2025): octagonal platform, a big octagonal sandstone basin with bulging panels (covered in winter by a low
    // grey lid), a column with a capital and the figure of a woman in Renaissance dress, iron brackets
    {
      const [x, y] = MARKT,
        z = gzz(x, y),
        a8 = Math.PI / 8,
        LID = linC([0.72, 0.73, 0.72]);
      K.lathe(
        x,
        y,
        z - 0.25,
        [
          [4.4, 0],
          [4.4, 0.4],
          [3.2, 0.4],
        ],
        8,
        linC([0.6, 0.57, 0.52]),
        a8
      );
      K.lathe(
        x,
        y,
        z + 0.1,
        [
          [3.05, 0],
          [3.2, 0.35],
          [3.2, 0.7],
          [3.05, 1.05],
          [2.85, 1.12],
        ],
        8,
        STONE,
        a8
      );
      K.lathe(
        x,
        y,
        z + 1.12,
        [
          [2.9, 0],
          [0.45, 0.62],
        ],
        8,
        LID,
        a8
      );
      K.cyl(x, y, z + 1.6, z + 4.3, 0.36, 0.3, 12, STONE);
      K.cyl(x, y, z + 4.3, z + 4.45, 0.42, 0.5, 8, STONE);
      K.box(x, y, z + 4.45, 1.0, 1.0, 0.24, 0, STONE, true);
      // the figure: dress, bodice, sleeves, head
      K.lathe(
        x,
        y,
        z + 4.69,
        [
          [0.42, 0],
          [0.36, 0.5],
          [0.22, 0.95],
          [0.16, 1.05],
        ],
        10,
        linC([0.62, 0.6, 0.55])
      );
      K.cyl(x, y, z + 5.74, z + 6.1, 0.17, 0.2, 8, linC([0.64, 0.62, 0.57]), true);
      for (const sg of [-1, 1]) K.box(x + sg * 0.26, y, z + 5.62, 0.14, 0.14, 0.42, 0, linC([0.6, 0.58, 0.53]));
      K.ball(x, y, z + 6.24, 0.12, linC([0.66, 0.64, 0.6]), 8);
      for (let k = 0; k < 4; k++) {
        const an = (k * Math.PI) / 2 + 0.3;
        K.box(x + Math.cos(an) * 0.55, y + Math.sin(an) * 0.55, z + 2.6, 0.5, 0.03, 0.03, an, IRON);
        K.box(x + Math.cos(an) * 0.78, y + Math.sin(an) * 0.78, z + 2.35, 0.04, 0.04, 0.3, an, IRON);
      }
      S.segs.push(...circleSegs(x, y, 3.2, 8));
      S.fountain = [x, y, z];
    }
    // St. Johannis: the tower by the choir – square shaft, octagon, dark cupola with lantern and spire (photos 2008, 2025)
    for (const b of S.bld.filter(q => q.lm === 'kirche')) {
      const tx = -1246.0,
        ty = 1213.2,
        z = b.z0,
        w = 6.6,
        a = Math.atan2(b.F[0][3] - b.F[0][1], b.F[0][2] - b.F[0][0]);
      K.box(
        tx,
        ty,
        z - 1,
        w,
        w,
        31,
        a,
        SAND.map(v => v * 1.0)
      );
      K.box(tx, ty, z + 30, w + 0.4, w + 0.4, 0.5, a, STONE);
      K.lathe(
        tx,
        ty,
        z + 30.5,
        [
          [3.0, 0],
          [3.0, 6.5],
          [3.2, 6.5],
          [3.2, 6.9],
        ],
        8,
        SAND,
        Math.PI / 8
      );
      K.lathe(
        tx,
        ty,
        z + 37.4,
        [
          [3.2, 0],
          [2.6, 1.2],
          [1.4, 2.6],
          [0.9, 3.2],
        ],
        8,
        SLATE,
        Math.PI / 8
      );
      K.lathe(
        tx,
        ty,
        z + 40.6,
        [
          [0.9, 0],
          [0.9, 2.0],
          [1.3, 2.2],
          [0.5, 3.4],
          [0.12, 4.6],
          [0.05, 7.0],
        ],
        8,
        SLATE,
        Math.PI / 8
      );
      K.ball(tx, ty, z + 46.0, 0.25, GOLD, 8);
      // sound openings and tall arched windows: dark panes with a light frame
      for (let s = 0; s < 4; s++) {
        const an = a + (s * Math.PI) / 2,
          nx = Math.cos(an),
          ny = Math.sin(an),
          ox = tx + nx * (w / 2 + 0.03),
          oy = ty + ny * (w / 2 + 0.03),
          ex = -ny,
          ey = nx;
        arch(K, ox, oy, ex, ey, z + 23, 1.3, 3.2, DARK);
      }
      // nave windows on the long sides: every ~5.5 m, sill 3.5 m, 5 m tall
      for (const f of b.F) {
        const L = Math.hypot(f[2] - f[0], f[3] - f[1]);
        if (L < 8) continue;
        const dx = (f[2] - f[0]) / L,
          dy = (f[3] - f[1]) / L,
          nx = dy,
          ny = -dx,
          n = Math.floor(L / 5.5);
        for (let k = 0; k < n; k++) {
          const u = (k + 0.5) * (L / n);
          arch(K, f[0] + dx * u + nx * 0.03, f[1] + dy * u + ny * 0.03, dx, dy, z + 3.6, 1.5, 5.2, DARK);
        }
      }
      S.segs.push(...boxSegs(tx, ty, w, w, a));
    }
    // the Bertholdsburg: round towers with tall slate cones (photos 2008, 2025), a clock tower with a cupola
    for (const b of S.bld.filter(q => q.lm === 'burg' || q.lm === 'turm')) {
      const tw = (b.tw || []).filter((t, k, A) => !A.slice(0, k).some(q => Math.hypot(q[0] - t[0], q[1] - t[1]) < 3));
      if (b.lm === 'turm') {
        let cx = 0,
          cy = 0,
          r = 0;
        const n = b.f.length / 2;
        for (let k = 0; k < b.f.length; k += 2) {
          cx += b.f[k] / n;
          cy += b.f[k + 1] / n;
        }
        for (let k = 0; k < b.f.length; k += 2) r += Math.hypot(b.f[k] - cx, b.f[k + 1] - cy) / n;
        tw.push([cx, cy, r]);
      }
      for (const [x, y, r] of tw) {
        const z = b.z0,
          h = b.lm === 'turm' ? 13 : b.e + 4;
        K.lathe(
          x,
          y,
          z - 1,
          [
            [r + 0.15, 0],
            [r, 1.6],
            [r, h + 1],
          ],
          14,
          SAND
        );
        K.lathe(
          x,
          y,
          z + h,
          [
            [r + 0.45, 0],
            [0.12, r * 2.4 + 2],
            [0.04, r * 2.4 + 3.4],
          ],
          14,
          SLATE
        );
        K.ball(x, y, z + h + r * 2.4 + 3.4, 0.16, GOLD, 6);
        S.segs.push(...circleSegs(x, y, r, 10));
      }
      if (b.lm === 'burg') {
        // the clock tower on the south wing (photo from the south): square, a dark cupola with lantern
        const x = -1290.5,
          y = 1158.5,
          z = b.z0;
        K.box(x, y, z + b.e - 2, 4.2, 4.2, 9, 0.5, SAND);
        K.lathe(
          x,
          y,
          z + b.e + 7,
          [
            [2.6, 0],
            [2.0, 1.2],
            [1.0, 2.4],
            [0.7, 2.6],
          ],
          8,
          SLATE,
          Math.PI / 8
        );
        K.lathe(
          x,
          y,
          z + b.e + 9.6,
          [
            [0.7, 0],
            [0.7, 1.4],
            [0.9, 1.5],
            [0.08, 3.6],
          ],
          8,
          SLATE,
          Math.PI / 8
        );
        K.ball(x, y, z + b.e + 13.2, 0.18, GOLD, 6);
        K.disc(
          x + Math.cos(0.5 + Math.PI / 2) * -2.12,
          y + Math.sin(0.5 + Math.PI / 2) * -2.12,
          z + b.e + 5,
          -Math.cos(0.5 + Math.PI / 2),
          -Math.sin(0.5 + Math.PI / 2),
          0.9,
          linC([0.9, 0.88, 0.8]),
          16,
          false
        );
      }
    }
    // the Rathaus: roof turret with clock and cupola over the gable, red portal, the hall behind the door
    for (const b of S.bld.filter(q => q.lm === 'rathaus')) rathaus(K, b, { IRON, STONE, DARK, SLATE, GOLD, WOOD, RED });
    // benches (OSM): wood on iron, facing the fountain
    const WOODB = linC([0.4, 0.26, 0.15]);
    for (const [x, y] of data.benches || []) {
      const z = gzz(x, y),
        a = Math.atan2(MARKT[1] - y, MARKT[0] - x),
        c = Math.cos(a),
        s = Math.sin(a),
        rot = a + Math.PI / 2,
        len = 1.7;
      for (let i = 0; i < 3; i++)
        K.box(x + c * (0.12 - i * 0.13), y + s * (0.12 - i * 0.13), z + 0.42, len, 0.11, 0.035, rot, WOODB);
      for (let i = 0; i < 2; i++) K.box(x - c * 0.3, y - s * 0.3, z + 0.58 + i * 0.16, len, 0.03, 0.1, rot, WOODB);
      for (const t of [-len / 2 + 0.15, len / 2 - 0.15]) {
        const px = x - s * t,
          py = y + c * t;
        K.box(px, py, z, 0.06, 0.46, 0.42, rot, IRON);
        K.box(px - c * 0.3, py - s * 0.3, z, 0.05, 0.05, 0.86, rot, IRON);
      }
    }
    const mp = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.8,
      metalness: 0,
      envMapIntensity: 0.7,
    });
    const pm = add(new THREE.Mesh(K.geo(), mp), 'props');
    pm.userData.own = true;
    lamps();
    signs();
  }
  // ---- signs over the doors of shops, inns and offices (names from OSM) and over the Rathaus portal: one canvas atlas ----
  function signs() {
    const list = [];
    for (const b of S.bld) {
      const name = b.lm === 'rathaus' ? 'RATHAUS' : b.s && b.s[0];
      if (!name || !b.doorFac) continue;
      const d = b.doorFac;
      list.push({
        b,
        name,
        d,
        x: d.ax + d.dx * d.u + d.dy * 0.07,
        y: d.ay + d.dy * d.u - d.dx * 0.07,
        z: b.z0 + (name === 'RATHAUS' ? 3.35 : 2.95),
      });
    }
    if (S.rathaus) {
      // over the counter of the hall, on the back wall, facing the door
      const R = S.rathaus,
        p = R.Q(R.L / 2, R.w1 - 0.04, 0);
      list.unshift({
        b: { i: 0 },
        name: 'Bürgerbüro',
        d: { dx: -R.dx, dy: -R.dy },
        x: p[0],
        y: p[1],
        z: R.floor + 2.55,
      });
    }
    if (!list.length) return;
    const W = 1024,
      RH = 64,
      rows = Math.min(16, list.length),
      cv = document.createElement('canvas');
    cv.width = W;
    cv.height = RH * rows;
    const g = cv.getContext('2d'),
      BG = ['#24412d', '#5c1f1a', '#ece4cf', '#1e3050', '#3b2a1a'];
    list.slice(0, rows).forEach((it, r) => {
      const bg = it.name === 'RATHAUS' ? '#ece4cf' : BG[Math.floor(hh(it.b.i + 3) * BG.length)],
        fg = bg === '#ece4cf' ? '#5a1a12' : '#f2e2b0';
      g.font = 'bold 38px Georgia, "Times New Roman", serif';
      const tw = Math.min(W - 40, g.measureText(it.name).width);
      it.w = tw + 40;
      it.r = r;
      g.fillStyle = bg;
      g.fillRect(0, r * RH, it.w, RH);
      g.fillStyle = fg;
      g.textBaseline = 'middle';
      g.fillText(it.name, 20, r * RH + RH / 2 + 2, W - 40);
      g.strokeStyle = fg;
      g.lineWidth = 3;
      g.strokeRect(5, r * RH + 5, it.w - 10, RH - 10);
    });
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const pos = [],
      uv = [],
      nrm = [],
      idx = [];
    for (const it of list.slice(0, rows)) {
      const d = it.d,
        h = it.name === 'RATHAUS' ? 0.42 : 0.5,
        w = (h * it.w) / RH,
        nx = d.dy,
        ny = -d.dx,
        cx = it.x,
        cy = it.y,
        z = it.z,
        n = pos.length / 3,
        v0 = 1 - ((it.r + 1) * RH) / (RH * rows),
        v1 = 1 - (it.r * RH) / (RH * rows);
      for (const [s2, v, uu, vv] of [
        [-1, 0, 0, v0],
        [1, 0, it.w / W, v0],
        [1, 1, it.w / W, v1],
        [-1, 1, 0, v1],
      ]) {
        pos.push(cx + d.dx * s2 * (w / 2), z + v * h, -(cy + d.dy * s2 * (w / 2)));
        nrm.push(nx, 0, -ny);
        uv.push(uu, vv);
      }
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3);
    }
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    gg.setIndex(idx);
    gg.computeBoundingSphere();
    const m = add(
      new THREE.Mesh(gg, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0 })),
      'signs'
    );
    m.userData.own = true;
    m.userData.tex = tex;
    S.signs = list.slice(0, rows).map(it => it.name);
  }
  // a tall window with a round arch on a wall: lower left corner on the wall line (ox, oy), along (ex, ey)
  function arch(K, ox, oy, ex, ey, z0, w, h, col) {
    const p = (u, v) => [ox + ex * u, oy + ey * u, z0 + v],
      r = w / 2,
      FR = linC([0.78, 0.74, 0.66]);
    K.quad(p(-r - 0.12, -0.12), p(r + 0.12, -0.12), p(r + 0.12, h - r), p(-r - 0.12, h - r), FR);
    K.quad(p(-r, 0), p(r, 0), p(r, h - r), p(-r, h - r), col);
    for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI,
        a1 = ((k + 1) / 6) * Math.PI;
      K.tri(
        p(0, h - r),
        p(Math.cos(a0) * (r + 0.12), h - r + Math.sin(a0) * (r + 0.12)),
        p(Math.cos(a1) * (r + 0.12), h - r + Math.sin(a1) * (r + 0.12)),
        FR
      );
      K.tri(
        p(0, h - r + 0.001),
        p(Math.cos(a0) * r, h - r + Math.sin(a0) * r + 0.001),
        p(Math.cos(a1) * r, h - r + Math.sin(a1) * r + 0.001),
        col
      );
    }
  }
  const circleSegs = (x, y, r, n) => {
    const out = [];
    for (let k = 0; k < n; k++) {
      const a0 = (k / n) * Math.PI * 2,
        a1 = ((k + 1) / n) * Math.PI * 2;
      out.push([x + Math.cos(a0) * r, y + Math.sin(a0) * r, x + Math.cos(a1) * r, y + Math.sin(a1) * r]);
    }
    return out;
  };
  const boxSegs = (x, y, sx, sy, a) => {
    const c = Math.cos(a),
      s = Math.sin(a),
      P4 = [
        [-sx / 2, -sy / 2],
        [sx / 2, -sy / 2],
        [sx / 2, sy / 2],
        [-sx / 2, sy / 2],
      ].map(([u, v]) => [x + u * c - v * s, y + u * s + v * c]);
    return P4.map((p, k) => [p[0], p[1], P4[(k + 1) % 4][0], P4[(k + 1) % 4][1]]);
  };
  // ---- the Rathaus inside: the hall (Bürgerbüro) behind the door – walls, floor, ceiling, counter, benches, the town's arms ----
  function rathaus(K, b, C) {
    const fr = b.front;
    if (!fr) return;
    const f = fr.f,
      L = fr.L,
      dx = (f[2] - f[0]) / L,
      dy = (f[3] - f[1]) / L,
      nx = dy,
      ny = -dx, // out of the facade (to the Markt)
      z = b.z0,
      fl = z + 0.35,
      du = b.hole.u,
      D = (u, w) => [f[0] + dx * u - nx * w, f[1] + dy * u - ny * w]; // u along the front, w into the house
    S.rathaus = {
      f,
      L,
      dx,
      dy,
      nx,
      ny,
      floor: fl,
      door: D(du, 0),
      inside: D(du, 3.5),
      u0: 0.5,
      u1: L - 0.5,
      w0: 0.45,
      w1: Math.min(11, L),
    };
    // roof turret over the front gable: a square base, clock faces, a dark cupola with lantern (photo 2008)
    const top = Math.max(...b.rv.filter((v, k) => k % 3 === 2)) + z,
      [tx, ty] = D(L / 2, 3.2);
    K.box(tx, ty, top - 1.5, 2.2, 2.2, 3.4, Math.atan2(dy, dx), linC([0.95, 0.9, 0.75]));
    K.lathe(
      tx,
      ty,
      top + 1.9,
      [
        [1.6, 0],
        [1.2, 0.8],
        [0.6, 1.6],
        [0.45, 1.8],
      ],
      8,
      C.SLATE,
      Math.PI / 8
    );
    K.lathe(
      tx,
      ty,
      top + 3.7,
      [
        [0.45, 0],
        [0.45, 0.9],
        [0.6, 1.0],
        [0.05, 2.8],
      ],
      8,
      C.SLATE,
      Math.PI / 8
    );
    K.ball(tx, ty, top + 6.5, 0.12, C.GOLD, 6);
    for (const sg of [-1, 1]) {
      const [cx, cy] = [tx + nx * 1.12 * sg, ty + ny * 1.12 * sg];
      K.disc(cx, cy, top + 0.4, nx * sg, ny * sg, 0.62, linC([0.92, 0.9, 0.82]), 16, false);
      K.box(cx + nx * sg * 0.02, cy + ny * sg * 0.02, top + 0.4, 0.05, 0.05, 0.45, Math.atan2(dy, dx), C.IRON);
    }
    // a clock in the front gable, under the apex
    {
      const [cx, cy] = [f[0] + dx * (f[5] || L / 2) + nx * 0.04, f[1] + dy * (f[5] || L / 2) + ny * 0.04];
      K.disc(cx, cy, z + Math.max(f[4], f[7]) + 2.2, nx, ny, 0.7, linC([0.94, 0.92, 0.85]), 16, false);
      K.disc(
        cx + nx * 0.01,
        cy + ny * 0.01,
        z + Math.max(f[4], f[7]) + 2.2,
        nx,
        ny,
        0.55,
        linC([0.1, 0.1, 0.12]),
        16,
        false
      );
    }
    // the red portal around the door, steps
    {
      const u0 = du - 0.95,
        u1 = du + 0.95,
        P_ = (u, w) => [f[0] + dx * u + nx * w, f[1] + dy * u + ny * w],
        a = Math.atan2(dy, dx);
      for (const u of [u0, u1]) {
        const [x, y] = P_(u, 0.12);
        K.box(x, y, z, 0.32, 0.24, 2.95, a, C.RED);
      }
      const [x, y] = P_(du, 0.12);
      K.box(x, y, z + 2.75, 2.25, 0.3, 0.45, a, C.RED);
      const [sx, sy] = P_(du, 0.55);
      K.box(sx, sy, z - 0.4, 2.4, 1.1, 0.4 + (fl - z) / 2, a, linC([0.6, 0.58, 0.55]));
    }
    // inside: a box of walls 0.45 m behind the outside, the hall floor, a ceiling at 3.3 m
    const k2 = kit2(),
      PL = linC([0.93, 0.91, 0.86]),
      FLR = linC([0.55, 0.38, 0.22]),
      CEIL = linC([0.97, 0.96, 0.93]),
      w1 = S.rathaus.w1,
      u0 = 0.45,
      u1 = L - 0.45,
      w0 = 0.45,
      zc = fl + 3.3,
      Q = (u, w, zz) => [f[0] + dx * u - nx * w, f[1] + dy * u - ny * w, zz];
    // floor and ceiling (lit by hand: a little darker in the corners)
    k2.quad(Q(u0, w0, fl), Q(u1, w0, fl), Q(u1, w1, fl), Q(u0, w1, fl), FLR);
    k2.quad(Q(u0, w0, zc), Q(u0, w1, zc), Q(u1, w1, zc), Q(u1, w0, zc), CEIL);
    // walls facing in: front (with the door gap), back, sides
    const wall = (a, c, col) => k2.quad([a[0], a[1], fl], [c[0], c[1], fl], [c[0], c[1], zc], [a[0], a[1], zc], col);
    const dg0 = du - 0.75,
      dg1 = du + 0.75;
    wall(Q(dg0, w0), Q(u0, w0), PL);
    wall(Q(u1, w0), Q(dg1, w0), PL);
    k2.quad(Q(dg1, w0, fl + 2.6), Q(dg0, w0, fl + 2.6), Q(dg0, w0, zc), Q(dg1, w0, zc), PL);
    wall(Q(u0, w0), Q(u0, w1), PL);
    wall(Q(u0, w1), Q(u1, w1), linC([0.88, 0.85, 0.78]));
    wall(Q(u1, w1), Q(u1, w0), PL);
    // the door reveal (the wall's thickness)
    for (const [ua, ub] of [
      [dg0, dg0],
      [dg1, dg1],
    ]) {
      const s = ua === dg0 ? 1 : -1,
        A_ = Q(ua, 0, fl),
        B_ = Q(ub, w0, fl);
      if (s > 0) k2.quad(A_, B_, [B_[0], B_[1], fl + 2.6], [A_[0], A_[1], fl + 2.6], linC([0.8, 0.78, 0.72]));
      else k2.quad(B_, A_, [A_[0], A_[1], fl + 2.6], [B_[0], B_[1], fl + 2.6], linC([0.8, 0.78, 0.72]));
    }
    // the open door leaf (inside, swung to the left)
    {
      const h0 = Q(dg0, w0 + 0.02, fl),
        h1 = Q(dg0 + 0.1, w0 + 1.4, fl);
      k2.quad(h0, h1, [h1[0], h1[1], fl + 2.55], [h0[0], h0[1], fl + 2.55], linC([0.45, 0.08, 0.06]));
      k2.quad(h1, h0, [h0[0], h0[1], fl + 2.55], [h1[0], h1[1], fl + 2.55], linC([0.4, 0.07, 0.05]));
    }
    // the counter of the Bürgerbüro along the back wall, a bench, a table, ceiling lamps (bright patches), the arms of the town
    const a = Math.atan2(dy, dx),
      box = (u, w, zz, su, sw, sz, col) => {
        const [x, y] = Q(u, w, 0);
        k2.box(x, y, zz, su, sw, sz, a, col);
      };
    box(L / 2, w1 - 2.2, fl, Math.min(7, L - 3), 0.7, 1.05, linC([0.5, 0.34, 0.2]));
    box(L / 2, w1 - 2.2, fl + 1.05, Math.min(7.2, L - 2.8), 0.85, 0.06, linC([0.8, 0.78, 0.72]));
    box(L / 2, w1 - 0.9, fl, Math.min(6, L - 4), 0.6, 0.75, linC([0.35, 0.33, 0.32]));
    box(u0 + 0.35, (w0 + w1) / 2, fl, 0.45, Math.min(5, w1 - w0 - 2), 0.45, linC([0.45, 0.3, 0.18]));
    box(u1 - 2.2, w0 + 2.6, fl, 1.6, 0.9, 0.74, linC([0.5, 0.34, 0.2]));
    for (const [u, w] of [
      [L * 0.3, w0 + 3],
      [L * 0.7, w0 + 3],
      [L * 0.5, w1 - 4.5],
    ])
      box(u, w, zc - 0.06, 1.2, 0.3, 0.05, linC([1.6, 1.5, 1.2]));
    // the arms (Henneberg: black hen on a green triple hill, gold field) on the back wall
    {
      const [x, y] = Q(L / 2, w1 - 0.03, 0);
      k2.disc(x, y, fl + 2.35, nx, ny, 0.55, linC([0.85, 0.66, 0.2]), 16, false);
      k2.disc(x + nx * 0.01, y + ny * 0.01, fl + 2.25, nx, ny, 0.22, linC([0.06, 0.06, 0.06]), 10, false);
      k2.disc(x + nx * 0.01, y + ny * 0.01, fl + 1.95, nx, ny, 0.3, linC([0.1, 0.4, 0.15]), 10, false);
    }
    const im = add(new THREE.Mesh(k2.geo(), new THREE.MeshBasicMaterial({ vertexColors: true })), 'rathaus innen');
    im.userData.own = true;
    // collisions inside: the walls of the hall (the door gap stays open), the counter
    const seg = (p, q) => S.segs.push([p[0], p[1], q[0], q[1]]);
    seg(Q(u0, w0), Q(dg0, w0));
    seg(Q(dg1, w0), Q(u1, w0));
    seg(Q(u0, w0), Q(u0, w1));
    seg(Q(u0, w1), Q(u1, w1));
    seg(Q(u1, w1), Q(u1, w0));
    const cu = Math.min(7, L - 3) / 2;
    seg(Q(L / 2 - cu, w1 - 2.55), Q(L / 2 + cu, w1 - 2.55));
    seg(Q(L / 2 - cu, w1 - 1.85), Q(L / 2 + cu, w1 - 1.85));
    S.rathaus.Q = Q;
    S.rathaus.counter = Q(L / 2, w1 - 3.1); // where one stands at the counter (Ortsvorsteher: the concerns of Ratscher)
    S.rathaus.clerk = Q(L / 2, w1 - 1.5); // behind the counter
  }
  // a second kit for the hall (unlit colours: the light of the ceiling lamps is in them)
  const kit2 = () => VPROPS.kit();
  // ---- street lamps: the lantern of world/village_props.js, lit with the village's lamps (and lighting the walls) ----
  function lamps() {
    const L = data.lamps || [];
    if (!L.length || !VPROPS.kit) return;
    const kL = VPROPS.kit(),
      kG = VPROPS.kit(),
      IRON = [0.03, 0.03, 0.032];
    kL.cyl(0, 0, 0, 0.55, 0.11, 0.09, 8, IRON);
    kL.cyl(0, 0, 0.55, 3.55, 0.055, 0.042, 8, IRON);
    kL.cyl(0, 0, 3.55, 3.66, 0.09, 0.07, 8, IRON);
    kL.lathe(
      0,
      0,
      4.14,
      [
        [0.36, 0],
        [0.36, 0.035],
        [0.05, 0.25],
        [0.0, 0.26],
      ],
      4,
      IRON,
      Math.PI / 4
    );
    for (let k = 0; k < 4; k++) {
      const a = Math.PI / 4 + (k * Math.PI) / 2;
      kL.box(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 3.72, 0.025, 0.025, 0.44, a, IRON);
    }
    kG.lathe(
      0,
      0,
      3.72,
      [
        [0.16, 0],
        [0.29, 0.42],
      ],
      4,
      [1, 1, 1],
      Math.PI / 4
    );
    kG.lathe(
      0,
      0,
      3.72,
      [
        [0.0, 0],
        [0.16, 0],
      ],
      4,
      [1, 1, 1],
      Math.PI / 4
    );
    const mP = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.45,
        metalness: 0.5,
        envMapIntensity: 0.6,
      }),
      mG =
        VPROPS.glass || new THREE.MeshStandardMaterial({ color: 0x2a2c2e, emissive: 0xffc27a, emissiveIntensity: 0 }),
      iL = new THREE.InstancedMesh(kL.geo(), mP, L.length),
      iG = new THREE.InstancedMesh(kG.geo(), mG, L.length),
      m4 = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      one = new THREE.Vector3(1, 1, 1);
    L.forEach(([x, y], i) => {
      const z = ground(x, y);
      m4.compose(V(x, y, z - 0.05), q, one);
      iL.setMatrixAt(i, m4);
      iG.setMatrixAt(i, m4);
      const l = { x, y, z: z + 3.95, schl: true };
      S.lamps.push(l);
      S.segs.push(...circleSegs(x, y, 0.12, 4));
    });
    for (const im of [iL, iG]) {
      im.computeBoundingSphere();
      add(im, 'lamps');
    }
    iL.userData.own = true;
    if (VPROPS.lamps) VPROPS.lamps.push(...S.lamps);
  }
  // ---- collisions: wall segments in a 16 m grid ----
  function grid() {
    const C = new Map(),
      cs = 16;
    S.segs.forEach((s, k) => {
      const x0 = Math.floor(Math.min(s[0], s[2]) / cs),
        x1 = Math.floor(Math.max(s[0], s[2]) / cs),
        y0 = Math.floor(Math.min(s[1], s[3]) / cs),
        y1 = Math.floor(Math.max(s[1], s[3]) / cs);
      for (let i = x0; i <= x1; i++)
        for (let j = y0; j <= y1; j++) {
          const key = i + ',' + j;
          let a = C.get(key);
          if (!a) C.set(key, (a = []));
          a.push(k);
        }
    });
    S.cells = C;
  }
  function pushOut(p, r) {
    if (S.state !== 'ready' || !S.cells || !inZone(p[0], p[1])) return undefined;
    let moved = false;
    for (let it = 0; it < 2; it++) {
      const ci = Math.floor(p[0] / 16),
        cj = Math.floor(p[1] / 16);
      for (let i = ci - 1; i <= ci + 1; i++)
        for (let j = cj - 1; j <= cj + 1; j++) {
          const a = S.cells.get(i + ',' + j);
          if (!a) continue;
          for (const k of a) {
            const s = S.segs[k],
              ex = s[2] - s[0],
              ey = s[3] - s[1],
              l2 = ex * ex + ey * ey || 1,
              t = Math.max(0, Math.min(1, ((p[0] - s[0]) * ex + (p[1] - s[1]) * ey) / l2)),
              qx = s[0] + ex * t,
              qy = s[1] + ey * t,
              dx = p[0] - qx,
              dy = p[1] - qy,
              d = Math.hypot(dx, dy);
            if (d < r && d > 1e-6) {
              p[0] = qx + (dx / d) * r;
              p[1] = qy + (dy / d) * r;
              moved = true;
            }
          }
        }
    }
    return moved;
  }
  // ---- inside the Rathaus: the floor of the hall ----
  function inHall(x, y) {
    const R = S.rathaus;
    if (!R) return false;
    const ux = x - R.f[0],
      uy = y - R.f[1],
      u = ux * R.dx + uy * R.dy,
      w = -(ux * R.nx + uy * R.ny);
    return u > R.u0 - 0.6 && u < R.u1 + 0.6 && w > -0.05 && w < R.w1 + 0.3;
  }
  S.inHall = inHall;
  // ---- names on the HUD: landmarks, the Markt, the nearest named street ----
  const inPoly = (pts, x, y) => {
    let c = false;
    for (let p = 0, q = pts.length - 2; p < pts.length; q = p, p += 2) {
      const xi = pts[p],
        yi = pts[p + 1],
        xj = pts[q],
        yj = pts[q + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  const LMN = { rathaus: 'Rathaus', kirche: 'St. Johannis', burg: 'Schloss Bertholdsburg', turm: 'Heckenturm' };
  let pc = [1e9, 0, null];
  function place(x, y) {
    if (!inZone(x, y)) return null;
    if (Math.abs(x - pc[0]) < 0.7 && Math.abs(y - pc[1]) < 0.7) return pc[2];
    pc = [x, y, place0(x, y)];
    return pc[2];
  }
  function place0(x, y) {
    if (S.state !== 'ready' || !data) return 'Schleusingen';
    if (inHall(x, y)) return 'Rathaus Schleusingen – Bürgerbüro';
    for (const b of S.bld)
      if ((b.lm || b.n) && Math.abs(b.cx - x) < 40 && Math.abs(b.cy - y) < 40 && inPoly(b.f, x, y))
        return (b.lm ? LMN[b.lm] : b.n) + ', Schleusingen';
    if (data.marktplatz && inPoly(data.marktplatz, x, y)) return 'Markt, Schleusingen';
    let best = null,
      bd = 9;
    for (const s of data.st) {
      if (!s.n || s.k > 5) continue;
      const p = s.p;
      for (let k = 0; k + 3 < p.length; k += 2) {
        const ax = p[k],
          ay = p[k + 1],
          ex = p[k + 2] - ax,
          ey = p[k + 3] - ay,
          l2 = ex * ex + ey * ey || 1,
          t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2)),
          d = Math.hypot(x - ax - ex * t, y - ay - ey * t);
        if (d < bd) {
          bd = d;
          best = s.n;
        }
      }
    }
    return best ? best + ', Schleusingen' : 'Schleusingen';
  }
  S.place = place;
  KERN.provide('place', place, 20);
  KERN.provide('ground', (x, y) => (S.state === 'ready' && inHall(x, y) ? S.rathaus.floor : undefined), 10);
  KERN.provide('pushOut', pushOut, 10);
  KERN.provide('free', (x, y) => (inZone(x, y) ? true : undefined), 10);
  // ---- the loop: near the Markt the tiles and the town are loaded, far away freed ----
  let acc = 1;
  function tick(dt) {
    acc += dt;
    if (acc < 0.4) return;
    acc = 0;
    const walk = P.mode === 'walk',
      cx = walk ? P.x : cam.position.x,
      cy = walk ? P.y : -cam.position.z,
      d = Math.hypot(cx - MARKT[0], cy - MARKT[1]);
    if (d < NEAR) {
      WELT.need('schleusingen', true);
      if (S.state === 'idle') load();
    } else if (d > FAR) {
      WELT.need('schleusingen', false);
      if (S.state === 'ready') S.dispose();
    }
    if (S.state === 'data' && WELT.heightAt(MARKT[0], MARKT[1]) !== undefined && WELT.state().loading === 0) {
      try {
        build();
      } catch (e) {
        S.state = 'error';
        S.err = String(e);
        console.warn('schleusingen build', e);
      }
    }
  }
  (window.TICKS || (window.TICKS = [])).push(tick);
  S.status = () => ({
    state: S.state,
    buildings: S.bld.length,
    segs: S.segs.length,
    lamps: S.lamps.length,
    ms: S.ms,
    loadMs: S.loadMs || 0,
    err: S.err,
    welt: WELT.state(),
  });
  return S;
})();
window.SCHL = SCHL;
