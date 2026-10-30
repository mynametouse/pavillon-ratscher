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
import { BASE, scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { go } from '../game/player.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { TREES } from '../garden/trees.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
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
  KERN.scenario('schleusingen', { label: 'Schleusingen, Markt', order: 30, run: () => go('schleusingen') });
  KERN.spot('schleusingen', {
    mode: 'walk',
    pos: START,
    z: 0,
    yaw: (Math.atan2(-1131 - START[0], 1198 - START[1]) * 180) / Math.PI,
    pitch: 4,
    label: 'Schleusingen (Markt)',
  });
  whenLoaded(() => {
    if (RATSCHER.hAt) KERN.spot('schleusingen', { z: RATSCHER.hAt(START[0], START[1]) });
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
    SAND = linC([0.88, 0.82, 0.7], 0.82), // the sandstone of St. Johannis and the Bertholdsburg
    CREAM = linC([0.95, 0.87, 0.66], 0.82), // the Rathaus front
    SAND_B = linC([0.74, 0.67, 0.56], 0.82), // rough sandstone under the castle and the church
    BASE_C = linC([0.6, 0.58, 0.54], 0.82); // the stone base of a house on a slope
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
    // the Rathaus: a blue-grey stone ground floor under the cream plaster (photos 2025) – its facade quads are split at the floor line
    const gf = b.gf,
      wq = (F, ax, ay, bx, by, ua, ub, ta, tb, zz, zLow, at) => {
        const zs = gf ? z0 + gf.h : -1e9;
        if (zs > zLow + 0.01 && zs < zz + Math.min(ta, tb) - 0.01) {
          WB.quad(F, ax, ay, bx, by, ua, ub, zs - zz, zs - zz, zz, zLow, Object.assign({}, at, { col: gf.col }));
          WB.quad(F, ax, ay, bx, by, ua, ub, ta, tb, zz, zs, at);
        } else WB.quad(F, ax, ay, bx, by, ua, ub, ta, tb, zz, zLow, at);
      };
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
      let low = Math.min(z0 - 2.0, (b.zmin !== undefined ? b.zmin : z0) - 1.0);
      if (b.zmin !== undefined && z0 - b.zmin > 1.2) {
        // an exposed foot on a slope: a stone base of its own without windows (the shader's plaster plinth below the ground floor
        // would be a dark slab metres high; the castle and the church stand on rough sandstone, photos 2025)
        const hb = z0 - low;
        WB.quad(
          F,
          ax,
          ay,
          bx,
          by,
          0,
          L,
          hb,
          hb,
          low,
          low,
          Object.assign({}, at, {
            LF: 0.5,
            eave: hb,
            st: ST.PLASTER,
            t0: hb,
            tA: hb,
            uA: L / 2,
            t1: hb,
            du: -1,
            dw: 0,
            fl: 0,
            col: b.lm ? SAND_B : BASE_C,
          })
        );
        low = z0;
      }
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
          wq(F, x0, y0, x1, y1, ua, ub, tt ? top : tAt(ua), tt ? top : tAt(ub), z0, zb, at);
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
            wq(F, x0, y0, x1, y1, ua, ub, tAt(ua), tAt(ub), z0, z0 + top, at);
          } else seg(ua, ub, low, false);
        }
        S.segs.push([ax, ay, ax + F.dx * h0, ay + F.dy * h0], [ax + F.dx * h1, ay + F.dy * h1, bx, by]);
      } else {
        if (b.band && !blind) {
          // two bands (the castle): stone below, a half-timbered top storey with its own foot (photos 2025)
          const zb = eave - b.band,
            atU = Object.assign({}, at, {
              st: ST.FW,
              eave: b.band,
              t0: t0 - zb,
              tA: at.tA - zb,
              t1: t1 - zb,
              du: -1,
              dw: 0,
            }),
            atL = Object.assign({}, at, { st: ST.PLASTER });
          WB.quad(F, ax, ay, bx, by, 0, L, zb, zb, z0, low, atL);
          if (gable) {
            const mx = ax + F.dx * uA0,
              my = ay + F.dy * uA0;
            WB.quad(F, ax, ay, mx, my, 0, uA0, t0 - zb, tA0 - zb, z0 + zb, z0 + zb, atU);
            WB.quad(F, mx, my, bx, by, uA0, L, tA0 - zb, t1 - zb, z0 + zb, z0 + zb, atU);
          } else WB.quad(F, ax, ay, bx, by, 0, L, t0 - zb, t1 - zb, z0 + zb, z0 + zb, atU);
        } else if (gable) {
          const mx = ax + F.dx * uA0,
            my = ay + F.dy * uA0;
          wq(F, ax, ay, mx, my, 0, uA0, t0, tA0, z0, low, at);
          wq(F, mx, my, bx, by, uA0, L, tA0, t1, z0, low, at);
        } else wq(F, ax, ay, bx, by, 0, L, t0, t1, z0, low, at);
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
      b.roofT = T;
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
      S.data = data;
      // the ground from the world tiles; without them (no welt-test/ on this host) the town stands on the terrain of world/ratscher.js
      try {
        gz = await WELT.sampler(ZONE[0], ZONE[1], ZONE[2], ZONE[3]);
        S.noTiles = false;
      } catch (e) {
        gz = null;
        S.noTiles = true;
      }
      mk = gz ? marktPlane() : null;
      S.loadMs = Math.round(performance.now() - t0);
      S.state = 'data';
    } catch (e) {
      S.state = 'error';
      S.err = String(e);
      console.warn('schleusingen', e);
    }
  }
  // the Markt as a smooth inclined plane: over the old town the tiles carry the 30 m surface model of Copernicus, lumps up to 1.7 m where
  // the houses bleed in; the plane is fitted to it and blended in over 3 m either side of the square's edge – one ground for the houses'
  // feet, the props and the drawn tiles (a pad of WELT with this function)
  let mk = null;
  function marktPlane() {
    const P = data && data.marktplatz;
    if (!P || P.length < 6) return null;
    const xs = P.filter((v, k) => k % 2 === 0),
      ys = P.filter((v, k) => k % 2 === 1),
      bb = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)],
      mx = (bb[0] + bb[2]) / 2,
      my = (bb[1] + bb[3]) / 2;
    let n = 0,
      su = 0,
      sv = 0,
      sz = 0,
      suu = 0,
      svv = 0,
      suv = 0,
      suz = 0,
      svz = 0;
    for (let x = bb[0]; x <= bb[2]; x += 2)
      for (let y = bb[1]; y <= bb[3]; y += 2) {
        if (!inPoly(P, x, y)) continue;
        const z = gz(x, y),
          u = x - mx,
          v = y - my;
        if (z === undefined || z === null) continue;
        n++;
        su += u;
        sv += v;
        sz += z;
        suu += u * u;
        svv += v * v;
        suv += u * v;
        suz += u * z;
        svz += v * z;
      }
    if (n < 20) return null;
    const det3 = m =>
        m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
        m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
        m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]),
      M = [
        [n, su, sv],
        [su, suu, suv],
        [sv, suv, svv],
      ],
      R = [sz, suz, svz],
      D = det3(M);
    if (Math.abs(D) < 1e-9) return null;
    const [a, gx, gy] = [0, 1, 2].map(i => det3(M.map((row, r) => row.map((v, c) => (c === i ? R[r] : v)))) / D);
    return { P, bb, mx, my, a, gx, gy };
  }
  const distSeg = (x, y, ax, ay, bx, by) => {
    const dx = bx - ax,
      dy = by - ay,
      t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x - ax - dx * t, y - ay - dy * t);
  };
  function marktAdj(x, y, raw) {
    const m = mk,
      B = 3;
    if (!m || x < m.bb[0] - B || x > m.bb[2] + B || y < m.bb[1] - B || y > m.bb[3] + B) return raw;
    let d = 1e9;
    for (let p = 0, q = m.P.length - 2; p < m.P.length; q = p, p += 2)
      d = Math.min(d, distSeg(x, y, m.P[q], m.P[q + 1], m.P[p], m.P[p + 1]));
    const s = (inPoly(m.P, x, y) ? d : -d) / B,
      w = s >= 1 ? 1 : s <= -1 ? 0 : 0.5 + 0.75 * s - 0.25 * s * s * s; // smooth from 0 (3 m outside) to 1 (3 m inside)
    return w <= 0 ? raw : raw + w * (m.a + m.gx * (x - m.mx) + m.gy * (y - m.my) - raw);
  }
  const ground = (x, y) => {
    const z = gz && gz(x, y);
    return z !== undefined && z !== null ? marktAdj(x, y, z) : RATSCHER.hAt ? RATSCHER.hAt(x, y) : 0;
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
      // the foot: the lowest ground along the walls; on a slope the ground floor keeps to the upper side and the walls go down to the
      // lowest point (an exposed plinth, as the castle and the church stand on the edge of the old-town spur)
      const zs = [];
      for (const f of b.F) zs.push(ground(f[0], f[1]), ground((f[0] + f[2]) / 2, (f[1] + f[3]) / 2));
      zs.sort((p, q) => p - q);
      const zmin = zs.length ? zs[0] : ground(cx, cy),
        z70 = zs.length ? zs[Math.floor(zs.length * 0.7)] : zmin;
      b.zmin = zmin;
      b.z0 = z70 - zmin < 1.0 ? zmin - 0.1 : z70 - 0.4;
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
    try {
      streetMap();
    } catch (e) {
      console.warn('schleusingen streets', e);
    }
    // level ground where one walks inside: the hall of the Rathaus (under its floor), the courtyard of the castle
    const pads = [];
    for (const b of S.bld) {
      if (b.lm === 'rathaus') pads.push({ poly: b.f, z: b.z0 + 0.1 });
      if (b.lm === 'burg' && b.h) for (const h of b.h) pads.push({ poly: h, z: b.z0 + 0.05 });
    }
    if (mk) {
      // the Markt plane (after the Rathaus: the first pad that holds a point wins)
      const [x0, y0, x1, y1] = mk.bb,
        e = 3.5;
      pads.push({
        poly: [x0 - e, y0 - e, x1 + e, y0 - e, x1 + e, y1 + e, x0 - e, y1 + e],
        z: (x, y, raw) => marktAdj(x, y, raw),
      });
    }
    if (WELT.setPads) WELT.setPads('schleusingen', pads);
    S.ms = Math.round(performance.now() - t0);
    S.state = 'ready';
    pc = [1e9, 0, null]; // the cached place name was given before the town stood
    KERN.spot('schleusingen', { z: ground(START[0], START[1]) });
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
      if (!m.userData.sharedGeo) m.geometry.dispose(); // the trees use the garden's geometries
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
    S.pool = null;
    if (WELT.setPads) WELT.setPads('schleusingen', []);
    if (WELT.setOverlay) WELT.setOverlay(null);
    data = null;
    S.data = null;
    gz = null;
    mk = null;
    S.state = 'idle';
    pc = [1e9, 0, null];
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
        L = Math.hypot(f[2] - f[0], f[3] - f[1]),
        uD = f[5] > 3 && f[5] < L - 3 ? f[5] : L / 2; // the portal under the apex, at the foot of the clock tower (photo 2025)
      b.door = fm;
      b.doorU = uD;
      b.doorW = 1.5;
      b.hole = { k: fm, u: uD, w: 1.5, h: 2.6 };
      b.front = { k: fm, f, L };
      b.gf = { h: 3.3, col: linC([0.6, 0.64, 0.66], 0.82) }; // the blue-grey stone ground floor
      b.stF = (ff, k) => (k === fm ? ST.PLASTER : ff[6] > ff[4] + 1 ? ST.SLATE_UP : ST.PLASTER);
    },
    kirche(b) {
      b.stF = () => ST.PLASTER;
      b.F.forEach(f => (f[8] |= 1)); // no house windows: the church windows are tall arches (props)
    },
    burg(b) {
      b.stF = () => ST.PLASTER;
      b.band = 3.1;
      b.st.sp = 2.9;
      b.st.timber = 0;
      // two octagonal stair towers in the courtyard (photo of the courtyard 2008): in its northern corners, mostly in the yard, rising
      // 4 m over the eaves; their walls are facades of the castle (stone below, half-timbered top, collisions), caps in props()
      const h = b.h && b.h[0];
      if (!h) return;
      const pts = [];
      for (let k = 0; k < h.length; k += 2) pts.push([h[k], h[k + 1]]);
      const cx = pts.reduce((q, p) => q + p[0], 0) / pts.length,
        cy = pts.reduce((q, p) => q + p[1], 0) / pts.length;
      // corners: the ring points farthest from the centre in four directions, the two northern ones
      const far = dir =>
        pts.reduce((q, p) =>
          (p[0] - cx) * dir[0] + (p[1] - cy) * dir[1] > (q[0] - cx) * dir[0] + (q[1] - cy) * dir[1] ? p : q
        );
      const corners = [far([-1, 1]), far([1, 1])];
      b.stair = [];
      const top = b.e + 4.0;
      for (const c of corners) {
        const d = Math.hypot(cx - c[0], cy - c[1]) || 1,
          tx = c[0] + ((cx - c[0]) / d) * 2.4,
          ty = c[1] + ((cy - c[1]) / d) * 2.4,
          r = 2.1;
        b.stair.push([tx, ty, r, top]);
        for (let k = 0; k < 8; k++) {
          const a0 = (k * Math.PI) / 4 + Math.PI / 8,
            a1 = ((k + 1) * Math.PI) / 4 + Math.PI / 8,
            ax = tx + Math.cos(a0) * r,
            ay = ty + Math.sin(a0) * r,
            bx = tx + Math.cos(a1) * r,
            by = ty + Math.sin(a1) * r,
            L = Math.hypot(bx - ax, by - ay);
          b.F.push([ax, ay, bx, by, top, L / 2, top, top, 0, 99]);
        }
      }
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
    // dormers on the roofs round the Markt and in the old town (photos 2025: small shed dormers and gabled ones towards the street)
    for (const b of S.bld) {
      if (b.k !== 0 || b.fl || b.lm || !b.doorFac || !b.roofT || b.lv < 2) continue;
      const dM = Math.hypot(b.cx - MARKT[0], b.cy - MARKT[1]);
      if (dM > 260 || hh(b.i + 51) > (dM < 90 ? 0.95 : 0.5)) continue;
      dormers(K, b);
    }
    // the castle: small dormers on the outer slopes of its roofs (courtyard photo 2008)
    for (const b of S.bld) {
      if (b.lm !== 'burg' || !b.roofT) continue;
      const nOut = b.f.length / 2; // the outer ring comes first in the facades
      b.F.forEach((f, k) => {
        const L = Math.hypot(f[2] - f[0], f[3] - f[1]);
        if (k < nOut && L > 9 && Math.abs(f[4] - b.e) < 0.3 && Math.abs(f[7] - b.e) < 0.3) dormers(K, b, f, 5);
      });
    }
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
      // the square tower rises two storeys over the ridge, then the octagon with its arches, the dark cupola (photos 2008, 2025)
      K.box(tx, ty, z - 1, w, w, 39, a, SAND);
      K.box(tx, ty, z + 37.6, w + 0.4, w + 0.4, 0.5, a, STONE);
      K.lathe(
        tx,
        ty,
        z + 38.1,
        [
          [3.0, 0],
          [3.0, 6.5],
          [3.25, 6.5],
          [3.25, 6.9],
        ],
        8,
        SAND,
        Math.PI / 8
      );
      K.lathe(
        tx,
        ty,
        z + 45.0,
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
        z + 48.2,
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
      K.ball(tx, ty, z + 53.6, 0.25, GOLD, 8);
      for (let k = 0; k < 8; k++) {
        const an = (k * Math.PI) / 4 + Math.PI / 8,
          ox = tx + Math.cos(an) * 3.05,
          oy = ty + Math.sin(an) * 3.05;
        arch(K, ox, oy, -Math.sin(an), Math.cos(an), z + 39.6, 0.9, 3.0, DARK);
      }
      // sound openings and tall arched windows: dark panes with a light frame
      for (let s = 0; s < 4; s++) {
        const an = a + (s * Math.PI) / 2,
          nx = Math.cos(an),
          ny = Math.sin(an),
          ox = tx + nx * (w / 2 + 0.03),
          oy = ty + ny * (w / 2 + 0.03),
          ex = -ny,
          ey = nx;
        arch(K, ox, oy, ex, ey, z + 31, 1.3, 3.4, DARK);
      }
      // the portal on the side towards the street: a round-arched door in a stone frame
      {
        let fp = null;
        for (const f of b.F) {
          const L = Math.hypot(f[2] - f[0], f[3] - f[1]);
          if (L > 6 && (!fp || f[9] < fp[9])) fp = f;
        }
        if (fp) {
          const L = Math.hypot(fp[2] - fp[0], fp[3] - fp[1]),
            dx = (fp[2] - fp[0]) / L,
            dy = (fp[3] - fp[1]) / L;
          arch(
            K,
            fp[0] + dx * (L / 2) + dy * 0.05,
            fp[1] + dy * (L / 2) - dx * 0.05,
            dx,
            dy,
            z - 0.1,
            2.2,
            3.7,
            linC([0.16, 0.09, 0.05])
          );
        }
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
      for (const [x, y, r0] of tw) {
        // the round towers: a sandstone shaft with small windows, a slender pointed slate helm (photos from the south, 2025)
        const r = Math.min(r0, 4.0),
          z = b.z0,
          h = b.lm === 'turm' ? 13 : b.e + 4,
          hc = r * 2.7 + 2.5,
          zf = Math.min(z, ground(x, y), ground(x + r, y), ground(x - r, y), ground(x, y + r), ground(x, y - r)) - 1; // down the slope
        K.lathe(
          x,
          y,
          zf,
          [
            [r + 0.25, 0],
            [r + 0.15, z - zf + 0.6],
            [r, z - zf + 1.6],
            [r, z - zf + h],
          ],
          14,
          SAND
        );
        K.lathe(
          x,
          y,
          z + h + 0.9,
          [
            [r + 0.25, 0],
            [0.12, hc],
            [0.04, hc + 1.4],
          ],
          14,
          SLATE
        );
        K.ball(x, y, z + h + 0.9 + hc + 1.4, 0.16, GOLD, 6);
        for (let fl2 = 0; fl2 < Math.floor((h - 2) / 3.2); fl2++)
          for (let k = 0; k < 3; k++) {
            const an = (k / 3) * Math.PI * 2 + fl2 * 0.9 + x,
              ox = x + Math.cos(an) * (r + 0.02),
              oy = y + Math.sin(an) * (r + 0.02),
              ex = -Math.sin(an),
              ey = Math.cos(an),
              zz = z + 2.2 + fl2 * 3.2;
            K.quad(
              [ox - ex * 0.3, oy - ey * 0.3, zz],
              [ox + ex * 0.3, oy + ey * 0.3, zz],
              [ox + ex * 0.3, oy + ey * 0.3, zz + 1.0],
              [ox - ex * 0.3, oy - ey * 0.3, zz + 1.0],
              DARK
            );
          }
        S.segs.push(...circleSegs(x, y, r, 10));
      }
      // the caps of the stair towers: a dark curved cap with a lantern and a finial (courtyard photo 2008)
      for (const [x, y, r, top] of b.stair || []) {
        const z = b.z0 + top;
        K.lathe(
          x,
          y,
          z - 0.1,
          [
            [r + 0.35, 0],
            [r * 0.95, 0.9],
            [r * 0.45, 2.0],
            [0.35, 2.3],
          ],
          8,
          SLATE,
          Math.PI / 8
        );
        K.lathe(
          x,
          y,
          z + 2.2,
          [
            [0.35, 0],
            [0.35, 0.9],
            [0.5, 1.0],
            [0.06, 2.4],
          ],
          8,
          SLATE,
          Math.PI / 8
        );
        K.ball(x, y, z + 4.7, 0.12, GOLD, 6);
      }
      if (b.lm === 'burg') {
        // the fountain in the courtyard (OSM; photos 1969, 2002, 2008): a round basin with a short column
        for (const [fx, fy] of data.fountains || []) {
          if (!b.h || !b.h.some(h => inPoly(h, fx, fy))) continue;
          const z = b.z0 + 0.05;
          K.lathe(
            fx,
            fy,
            z,
            [
              [1.3, 0],
              [1.3, 0.75],
              [1.12, 0.75],
              [1.12, 0.3],
            ],
            12,
            STONE
          );
          K.cyl(fx, fy, z, z + 0.32, 1.12, 1.12, 12, linC([0.2, 0.3, 0.32]), true);
          K.cyl(fx, fy, z, z + 1.7, 0.2, 0.16, 8, STONE, true);
          K.ball(fx, fy, z + 1.8, 0.14, STONE, 8);
          S.segs.push(...circleSegs(fx, fy, 1.35, 10));
        }
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
    S.benchSpots = [];
    const WOODB = linC([0.4, 0.26, 0.15]);
    for (const [x, y] of data.benches || []) {
      const z = gzz(x, y),
        a = Math.atan2(MARKT[1] - y, MARKT[0] - x),
        c = Math.cos(a),
        s = Math.sin(a),
        rot = a + Math.PI / 2,
        len = 1.7;
      S.benchSpots.push({ x, y, z, yaw: (Math.atan2(Math.cos(a), Math.sin(a)) * 180) / Math.PI });
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
    trees();
  }
  // ---- trees round the Markt (photos 2025: young trees along the edges of the square): the garden's ash, instanced ----
  function trees() {
    const K = TREES.ash || TREES.oakA,
      M = data.marktplatz;
    if (!K || !K.bg || !M) return;
    const pts = [];
    for (let k = 0; k < M.length; k += 2) {
      const ax = M[k],
        ay = M[k + 1],
        bx = M[(k + 2) % M.length],
        by = M[(k + 3) % M.length],
        L = Math.hypot(bx - ax, by - ay);
      for (let d = 6; d < L - 4; d += 13) {
        const x = ax + ((bx - ax) * d) / L,
          y = ay + ((by - ay) * d) / L,
          // 3.5 m into the square (towards its middle)
          mx = (MARKT[0] - x) / (Math.hypot(MARKT[0] - x, MARKT[1] - y) || 1),
          my = (MARKT[1] - y) / (Math.hypot(MARKT[0] - x, MARKT[1] - y) || 1),
          tx = x + mx * 3.5,
          ty = y + my * 3.5;
        if (Math.hypot(tx - MARKT[0], ty - MARKT[1]) < 9 || pts.some(q => Math.hypot(q[0] - tx, q[1] - ty) < 9))
          continue;
        if (S.rathaus && Math.hypot(tx - S.rathaus.door[0], ty - S.rathaus.door[1]) < 12) continue;
        pts.push([tx, ty]);
      }
    }
    if (!pts.length) return;
    const ib = new THREE.InstancedMesh(K.bg, K.bark, pts.length),
      il = new THREE.InstancedMesh(K.lg, K.leaf, pts.length),
      m4 = new THREE.Matrix4(),
      q = new THREE.Quaternion();
    pts.forEach(([x, y], i) => {
      const h = 8.5 + hh(i + 71) * 2.5,
        sc = h / K.H;
      q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hh(i + 73) * 6.28);
      m4.compose(V(x, y, ground(x, y) - 0.1), q, new THREE.Vector3(sc * 0.8, sc, sc * 0.8));
      ib.setMatrixAt(i, m4);
      il.setMatrixAt(i, m4);
      S.segs.push(...circleSegs(x, y, 0.22, 6));
    });
    for (const im of [ib, il]) {
      im.computeBoundingSphere();
      add(im, 'trees').userData.sharedGeo = true;
    }
    S.trees = pts.length;
  }
  // ---- signs over the doors of shops, inns and offices (names from OSM) and over the Rathaus portal: one canvas atlas ----
  function signs() {
    const list = [];
    for (const b of S.bld) {
      const name = b.lm === 'rathaus' ? 'RATHAUS' : b.s && b.s[0];
      if (!name || !b.doorFac) continue;
      const d = b.doorFac,
        sa = b.signAt; // the Rathaus: on its portal's canopy
      list.push({
        b,
        name,
        d,
        x: sa ? sa[0] : d.ax + d.dx * d.u + d.dy * 0.07,
        y: sa ? sa[1] : d.ay + d.dy * d.u - d.dx * 0.07,
        z: sa ? sa[2] : b.z0 + (name === 'RATHAUS' ? 3.35 : 2.95),
        h: sa ? sa[3] : 0,
      });
    }
    if (S.rathaus && S.rathaus.counterSign) {
      // over the counter of the Bürgerbüro on the right wall, facing into the hall
      const R = S.rathaus,
        p = R.counterSign;
      list.unshift({ b: { i: 0 }, name: 'Bürgerbüro', d: { dx: R.nx, dy: R.ny }, x: p[0], y: p[1], z: p[2] });
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
      const bg = it.name === 'RATHAUS' ? '#2b2622' : BG[Math.floor(hh(it.b.i + 3) * BG.length)],
        fg = it.name === 'RATHAUS' ? '#e2bc55' : bg === '#ece4cf' ? '#5a1a12' : '#f2e2b0'; // the Rathaus: gold letters on dark
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
        h = it.h || (it.name === 'RATHAUS' ? 0.42 : 0.5),
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
  // the roof height over a point (top faces of the building's roof), or null
  function roofZ(b, x, y) {
    let best = null;
    for (const t of b.roofT) {
      const [a, c, d] = t.v,
        d0 = (c[1] - d[1]) * (a[0] - d[0]) + (d[0] - c[0]) * (a[1] - d[1]);
      if (Math.abs(d0) < 1e-9) continue;
      const l1 = ((c[1] - d[1]) * (x - d[0]) + (d[0] - c[0]) * (y - d[1])) / d0,
        l2 = ((d[1] - a[1]) * (x - d[0]) + (a[0] - d[0]) * (y - d[1])) / d0,
        l3 = 1 - l1 - l2;
      if (l1 < -1e-4 || l2 < -1e-4 || l3 < -1e-4) continue;
      const z = l1 * a[2] + l2 * c[2] + l3 * d[2];
      if (best === null || z > best) best = z;
    }
    return best;
  }
  // shed dormers over the street facade: front with a window, cheeks, a flat roof back into the main roof
  function dormers(K, b, f0, nMax = 4) {
    const f =
      f0 || (b.doorFac && b.F.find(q => Math.abs(q[0] - b.doorFac.ax) < 1e-6 && Math.abs(q[1] - b.doorFac.ay) < 1e-6));
    if (!f) return;
    const L = Math.hypot(f[2] - f[0], f[3] - f[1]),
      d = { dx: (f[2] - f[0]) / L, dy: (f[3] - f[1]) / L },
      ix = -d.dy,
      iy = d.dx, // into the house
      n = Math.min(nMax, Math.floor((L - 1.2) / 3.4)),
      col = b.st.col,
      rc = b.rc.map(lin).map(v => v * 0.85),
      FR = linC([0.92, 0.92, 0.9]),
      GL = linC([0.1, 0.12, 0.14]),
      shed = hh(b.i + 57) < 0.5;
    if (n < 1) return;
    for (let k = 0; k < n; k++) {
      const u = ((k + 0.5) * L) / n,
        px = f[0] + d.dx * u,
        py = f[1] + d.dy * u,
        d1 = 0.9,
        zb = roofZ(b, px + ix * d1, py + iy * d1);
      if (zb === null || zb < b.z0 + b.e - 0.5) continue;
      const hf = 1.35,
        zt = zb + hf,
        w = shed ? 2.0 : 1.35;
      let d2 = null;
      for (let dd = d1 + 0.2; dd < d1 + 7; dd += 0.1) {
        const z = roofZ(b, px + ix * dd, py + iy * dd);
        if (z === null) break;
        if (z >= zt + 0.12) {
          d2 = dd;
          break;
        }
      }
      if (d2 === null) continue;
      const P_ = (s2, dd, z) => [px + d.dx * s2 + ix * dd, py + d.dy * s2 + iy * dd, z],
        hw = w / 2;
      // front wall (faces the street), window with a frame
      K.quad(P_(-hw, d1, zb - 0.1), P_(hw, d1, zb - 0.1), P_(hw, d1, zt), P_(-hw, d1, zt), col);
      K.quad(
        P_(-0.45, d1 - 0.02, zb + 0.25),
        P_(0.45, d1 - 0.02, zb + 0.25),
        P_(0.45, d1 - 0.02, zb + 1.15),
        P_(-0.45, d1 - 0.02, zb + 1.15),
        FR
      );
      K.quad(
        P_(-0.37, d1 - 0.03, zb + 0.32),
        P_(0.37, d1 - 0.03, zb + 0.32),
        P_(0.37, d1 - 0.03, zb + 1.07),
        P_(-0.37, d1 - 0.03, zb + 1.07),
        GL
      );
      // cheeks
      K.tri(P_(-hw, d1, zb - 0.1), P_(-hw, d1, zt), P_(-hw, d2, zt + 0.12), col);
      K.tri(P_(hw, d1, zb - 0.1), P_(hw, d2, zt + 0.12), P_(hw, d1, zt), col);
      if (shed)
        K.quad(
          P_(-hw - 0.12, d1 - 0.2, zt + 0.02),
          P_(hw + 0.12, d1 - 0.2, zt + 0.02),
          P_(hw + 0.12, d2, zt + 0.14),
          P_(-hw - 0.12, d2, zt + 0.14),
          rc
        );
      else {
        // a small gable: two slopes from a ridge over the middle
        const zr = zt + 0.55;
        K.quad(
          P_(-hw - 0.12, d1 - 0.2, zt - 0.05),
          P_(0, d1 - 0.2, zr),
          P_(0, d2, zr),
          P_(-hw - 0.12, d2, zt - 0.05),
          rc
        );
        K.quad(
          P_(0, d1 - 0.2, zr),
          P_(hw + 0.12, d1 - 0.2, zt - 0.05),
          P_(hw + 0.12, d2, zt - 0.05),
          P_(0, d2, zr),
          rc
        );
        K.tri(P_(-hw, d1, zt), P_(hw, d1, zt), P_(0, d1, zr - 0.04), col);
      }
    }
  }
  // a tall window with a round arch on a wall: lower left corner on the wall line (ox, oy), along (ex, ey)
  function arch(K, ox, oy, ex, ey, z0, w, h, col) {
    // the frame 4 cm, the pane 8 cm off the wall (out = (ey, -ex)): in one plane they flickered into each other and the wall from afar
    const p = (u, v, o = 0.04) => [ox + ex * u + ey * o, oy + ey * u - ex * o, z0 + v],
      q = (u, v) => p(u, v, 0.08),
      r = w / 2,
      FR = linC([0.78, 0.74, 0.66]);
    K.quad(p(-r - 0.12, -0.12), p(r + 0.12, -0.12), p(r + 0.12, h - r), p(-r - 0.12, h - r), FR);
    K.quad(q(-r, 0), q(r, 0), q(r, h - r), q(-r, h - r), col);
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
        q(0, h - r),
        q(Math.cos(a0) * r, h - r + Math.sin(a0) * r),
        q(Math.cos(a1) * r, h - r + Math.sin(a1) * r),
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
    {
      // ---- the front to the Markt (photo 2025): a clock tower stands out of the middle of the gable, from the portal up to the apex – windows
      // with red frames, the town's arms over the portal, a clock under its dark cornice, on top an octagonal lantern with a slate cap and a
      // vane; a portal with two columns and a canopy (RATHAUS), a red frieze over the blue-grey ground floor, yellow ornaments in the gable
      const a = Math.atan2(dy, dx),
        P_ = (u, w) => [f[0] + dx * u + nx * w, f[1] + dy * u + ny * w], // w out of the facade
        TW = 3.6,
        TD = 0.55,
        CRT = linC([0.95, 0.89, 0.72]),
        RF = linC([0.5, 0.11, 0.09]),
        top = z + Math.max(f[4], f[6], f[7]) + 1.6, // the clock at the height of the apex, the tower above the roof
        onF = (u, zz, o) => {
          const p = P_(u, o);
          return [p[0], p[1], zz];
        };
      {
        // two piers beside the portal, the shaft from the lintel up; the part inside the house only above the hall's ceiling
        for (const sg of [-1, 1]) {
          const [x, y] = P_(du + sg * (0.75 + (TW / 2 - 0.75) / 2), TD / 2);
          K.box(x, y, z - 0.6, TW / 2 - 0.75, TD, 3.25, a, CRT);
          S.segs.push(...boxSegs(x, y, TW / 2 - 0.75, TD, a));
        }
        let [x, y] = P_(du, TD / 2);
        K.box(x, y, z + 2.6, TW, TD, top - z - 2.6, a, CRT, true);
        [x, y] = P_(du, -1.3);
        K.box(x, y, z + 3.9, TW, 2.6, top - z - 3.9, a, CRT);
        [x, y] = P_(du, -0.95);
        K.box(x, y, top - 0.05, TW + 0.35, 3.75, 0.32, a, linC([0.24, 0.15, 0.1]));
      }
      // windows of the tower in the rows of the facade: a red frame, white casements and transom, glass
      const GL = linC([0.08, 0.1, 0.13]),
        WF = linC([0.93, 0.93, 0.9]);
      const rect = (u0, u1, z0, z1, o, col) =>
        K.quad(onF(u0, z0, o), onF(u1, z0, o), onF(u1, z1, o), onF(u0, z1, o), col);
      for (let fi = 1; ; fi++) {
        const zz = z + 0.35 + fi * 2.75 + 0.85,
          h = 1.3,
          w = 0.95;
        if (zz + h > top - 2.3) break;
        rect(du - w / 2 - 0.13, du + w / 2 + 0.13, zz - 0.13, zz + h + 0.13, TD + 0.02, RF);
        rect(du - w / 2, du + w / 2, zz, zz + h, TD + 0.04, WF);
        for (const [p0, p1, q0, q1] of [
          [du - w / 2 + 0.07, du - 0.03, zz + 0.07, zz + h * 0.68],
          [du + 0.03, du + w / 2 - 0.07, zz + 0.07, zz + h * 0.68],
          [du - w / 2 + 0.07, du - 0.03, zz + h * 0.72, zz + h - 0.07],
          [du + 0.03, du + w / 2 - 0.07, zz + h * 0.72, zz + h - 0.07],
        ])
          rect(p0, p1, q0, q1, TD + 0.06, GL);
      }
      // the clock under the cornice: dark rim, white face, hands at ten past ten
      {
        const zc = top - 1.25,
          [x, y] = P_(du, TD + 0.02),
          [x2, y2] = P_(du, TD + 0.04);
        K.disc(x, y, zc, nx, ny, 0.68, linC([0.18, 0.12, 0.08]), 20, false);
        K.disc(x2, y2, zc, nx, ny, 0.58, linC([0.95, 0.94, 0.9]), 20, false);
        for (const [th, len, hw] of [
          [-Math.PI / 3, 0.32, 0.035],
          [Math.PI / 3, 0.48, 0.025],
        ]) {
          const su = Math.sin(th),
            sz = Math.cos(th),
            o = TD + 0.06;
          K.quad(
            onF(du + sz * hw, zc - su * hw, o),
            onF(du + su * len + sz * hw, zc + sz * len - su * hw, o),
            onF(du + su * len - sz * hw, zc + sz * len + su * hw, o),
            onF(du - sz * hw, zc + su * hw, o),
            C.IRON
          );
        }
      }
      // the lantern: a slate foot, the open octagon with its posts, a curved slate cap, a golden ball, the vane
      {
        const [cx, cy] = P_(du, -0.95),
          tz = top + 0.27;
        K.lathe(
          cx,
          cy,
          tz,
          [
            [1.55, 0],
            [1.4, 0.35],
            [1.0, 1.5],
          ],
          8,
          C.SLATE,
          Math.PI / 8
        );
        K.lathe(
          cx,
          cy,
          tz + 1.5,
          [
            [0.98, 0],
            [0.98, 1.7],
          ],
          8,
          C.DARK,
          Math.PI / 8
        );
        for (let k = 0; k < 8; k++) {
          const an = Math.PI / 8 + (k * Math.PI) / 4;
          K.box(
            cx + Math.cos(an) * 0.98,
            cy + Math.sin(an) * 0.98,
            tz + 1.5,
            0.15,
            0.15,
            1.7,
            an,
            linC([0.24, 0.15, 0.1])
          );
        }
        K.lathe(
          cx,
          cy,
          tz + 3.2,
          [
            [1.22, 0],
            [1.12, 0.25],
            [0.55, 1.3],
            [0.16, 2.3],
            [0.04, 3.1],
          ],
          8,
          C.SLATE,
          Math.PI / 8
        );
        K.ball(cx, cy, tz + 6.4, 0.2, C.GOLD, 8);
        K.box(cx, cy, tz + 6.5, 0.04, 0.04, 1.4, 0, C.IRON);
        K.box(cx + dx * 0.3, cy + dy * 0.3, tz + 7.35, 0.9, 0.03, 0.32, a, C.IRON);
      }
      // the portal: two columns on red bases with red capitals, a stone canopy with the name (signs()), steps
      for (const sg of [-1, 1]) {
        const [x, y] = P_(du + sg * 1.05, 1.42);
        K.box(x, y, z - 0.1, 0.36, 0.36, 0.38, a, C.RED);
        K.cyl(x, y, z + 0.28, z + 2.45, 0.14, 0.12, 10, CRT);
        K.box(x, y, z + 2.45, 0.34, 0.34, 0.2, a, C.RED);
        S.segs.push(...circleSegs(x, y, 0.2, 6));
      }
      {
        const [x, y] = P_(du, 1.1);
        K.box(x, y, z + 2.65, 2.7, 1.1, 0.42, a, linC([0.62, 0.62, 0.6]), true);
        const [sx, sy] = P_(du, 1.66);
        b.signAt = [sx, sy, z + 2.68, 0.36];
        const [tx, ty] = P_(du, 0.55);
        K.box(tx, ty, z - 0.4, 2.4, 1.1, 0.4 + (fl - z) / 2, a, linC([0.6, 0.58, 0.55]));
      }
      // the arms over the portal (a green wreath, the gold field, the black hen with its red comb)
      {
        const zA = z + 3.45,
          dsc = (o, r, col, du2 = 0, dz = 0) => {
            const [x, y] = P_(du + du2, TD + o);
            K.disc(x, y, zA + dz, nx, ny, r, col, 14, false);
          };
        dsc(0.02, 0.34, linC([0.15, 0.4, 0.17]));
        dsc(0.04, 0.27, linC([0.88, 0.68, 0.2]));
        dsc(0.06, 0.11, linC([0.05, 0.05, 0.05]), 0, -0.03);
        dsc(0.06, 0.06, linC([0.05, 0.05, 0.05]), 0.07, 0.09);
        dsc(0.08, 0.035, C.RED, 0.08, 0.15);
      }
      // a red frieze over the ground floor, along the whole front
      {
        const [x, y] = P_(L / 2, 0.05);
        K.box(x, y, z + 3.2, L, 0.1, 0.22, a, RF);
      }
      // red surrounds round the windows of the front and yellow arches over those of the upper floors (photo 2025); the openings come
      // from the wall shader (world/village.js) – bays and storeys computed here the same way
      {
        const LF = L,
          nb = Math.max(1, Math.floor((LF - 0.6) / b.st.sp)),
          bw = LF / nb,
          [t0, uA, tA, t1] = [f[4], f[5], f[6], f[7]],
          gableF = tA > Math.max(t0, t1) + 0.6 && uA > 0.3 && uA < L - 0.3,
          cl = (v, lo, hi) => Math.min(hi, Math.max(lo, v)),
          topAt = u =>
            !gableF
              ? t0 + ((t1 - t0) * u) / L
              : u < uA
                ? t0 + (tA - t0) * cl(u / Math.max(uA, 0.01), 0, 1)
                : tA + (t1 - tA) * cl((u - uA) / Math.max(LF - uA, 0.01), 0, 1),
          YL = linC([0.93, 0.77, 0.36]),
          o = 0.03,
          frame = (u0, u1, z0, z1, bd) => {
            rect(u0 - bd, u1 + bd, z0 - bd, z0, o, RF);
            rect(u0 - bd, u1 + bd, z1, z1 + bd, o, RF);
            rect(u0 - bd, u0, z0, z1, o, RF);
            rect(u1, u1 + bd, z0, z1, o, RF);
          };
        for (let bi = 0; bi < nb; bi++) {
          const bc = (bi + 0.5) * bw;
          if (Math.abs(bc - du) < TW / 2 + 0.4) continue; // behind the tower
          for (let fi = 0; fi < 9; fi++) {
            const fb = 0.35 + fi * 2.75;
            let ww = 0.95,
              wh = 1.3;
            const lo = fb + 0.85,
              attic = lo > b.e - 0.2;
            if (attic) {
              ww = 0.8;
              wh = 1.0;
            }
            const room = Math.min(topAt(bc - ww / 2), topAt(bc + ww / 2)) - (lo + wh);
            if (room <= (attic ? 0.4 : 0.18) || (attic && !gableF)) {
              if (attic) continue;
              break;
            }
            if (fi === 0 && Math.abs(bc - du) < Math.max(bw / 2, 0.75 + ww / 2 + 0.1)) continue;
            frame(bc - ww / 2, bc + ww / 2, z + lo, z + lo + wh, 0.1);
            if ((fi === 1 || fi === 2) && !attic) {
              // a segmental arch over the window
              const r = ww / 2 + 0.16,
                zb = z + lo + wh + 0.16;
              for (let k = 0; k < 8; k++) {
                const a0 = (k / 8) * Math.PI,
                  a1 = ((k + 1) / 8) * Math.PI;
                K.tri(
                  onF(bc, zb, o),
                  onF(bc + Math.cos(a0) * r, zb + Math.sin(a0) * r * 0.55, o),
                  onF(bc + Math.cos(a1) * r, zb + Math.sin(a1) * r * 0.55, o),
                  YL
                );
              }
              rect(bc - r, bc + r, zb - 0.06, zb, o, YL);
            }
          }
        }
      }
      // yellow ornaments in the gable: triangles beside the windows, as on the photo
      if (f[6] > Math.max(f[4], f[7]) + 2) {
        const uA = f[5],
          YL = linC([0.93, 0.77, 0.36]),
          zg = u => z + (u < uA ? f[4] + ((f[6] - f[4]) * u) / uA : f[6] + ((f[7] - f[6]) * (u - uA)) / (L - uA));
        for (const [du2, zb, w, h] of [
          [4.8, f[4] + 1.0, 1.4, 1.1],
          [3.0, f[4] + 3.8, 1.2, 1.0],
        ])
          for (const sg of [-1, 1]) {
            const u = uA + sg * du2;
            if (u - w / 2 < 0.3 || u + w / 2 > L - 0.3 || z + zb + h > Math.min(zg(u - w / 2), zg(u + w / 2)) - 0.3)
              continue;
            K.tri(onF(u - w / 2, z + zb, 0.05), onF(u + w / 2, z + zb, 0.05), onF(u, z + zb + h, 0.05), YL);
          }
      }
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
    // ---- the council chamber (Ratssaal) with the Bürgerbüro: U of tables with the chair's seat under the arms, flags, rows for visitors,
    // the counter on the right wall, windows, beams, ceiling lights, panelling, parquet; named spots for the tasks (S.rathaus.spots) ----
    const a = Math.atan2(dy, dx),
      uc = (u0 + u1) / 2,
      box = (u, w, zz, su, sw, sz, col, rot = 0) => {
        const [x, y] = Q(u, w, 0);
        k2.box(x, y, zz, su, sw, sz, a + rot, col);
      },
      WOODD = linC([0.3, 0.18, 0.1]),
      WOODM = linC([0.45, 0.29, 0.16]),
      TOP = linC([0.36, 0.22, 0.12]),
      CLOTH = linC([0.16, 0.25, 0.18]),
      SEAT = linC([0.45, 0.12, 0.1]),
      spots = { seats: [], visitors: [] },
      spot = (u, w, face) => {
        const [x, y] = Q(u, w, 0);
        return { x, y, z: fl, yaw: (Math.atan2(face[0], face[1]) * 180) / Math.PI };
      },
      dirU = [dx, dy],
      dirW = [-nx, -ny];
    // a chair facing direction ang (relative to the front: 0 = towards +u); tall back for the chair's seat
    const chair = (u, w, ang, tall) => {
      const c = Math.cos(ang),
        s2 = Math.sin(ang),
        at = (du2, dw2) => [u + du2 * c - dw2 * s2, w + du2 * s2 + dw2 * c];
      for (const [p, q] of [
        [-0.19, -0.19],
        [0.19, -0.19],
        [-0.19, 0.19],
        [0.19, 0.19],
      ]) {
        const [uu, ww] = at(p, q);
        box(uu, ww, fl, 0.04, 0.04, 0.45, WOODD);
      }
      box(u, w, fl + 0.45, 0.46, 0.46, 0.06, tall ? SEAT : WOODM, ang);
      const [bu, bw] = at(-0.22, 0);
      box(bu, bw, fl + 0.5, 0.05, 0.46, tall ? 1.05 : 0.48, tall ? SEAT : WOODM, ang);
    };
    // the U: head table under the arms, two legs towards the door
    const hw = 3.0,
      wh = w1 - 1.6,
      wl = w1 - 5.8;
    box(uc, wh, fl, 2 * hw + 0.8, 0.8, 0.72, WOODD);
    box(uc, wh, fl + 0.72, 2 * hw + 0.9, 0.9, 0.05, TOP);
    for (const sg of [-1, 1]) {
      box(uc + sg * hw, (wh + wl) / 2, fl, 0.8, wh - wl, 0.72, WOODD);
      box(uc + sg * hw, (wh + wl) / 2, fl + 0.72, 0.9, wh - wl + 0.1, 0.05, TOP);
    }
    box(uc, wh - 0.2, fl + 0.77, 2 * hw - 0.6, 0.35, 0.01, CLOTH);
    // chairs behind the head table (the middle one: the chair's seat), along the legs outside
    for (let k = -2; k <= 2; k++) {
      chair(uc + k * 1.15, w1 - 0.75, -Math.PI / 2, k === 0);
      spots.seats.push(spot(uc + k * 1.15, w1 - 0.75, [-dirW[0], -dirW[1]]));
    }
    spots.vorsitz = spots.seats[2];
    for (const sg of [-1, 1])
      for (let w = wh - 1.0; w > wl + 0.3; w -= 1.05) {
        chair(uc + sg * (hw + 0.75), w, sg < 0 ? 0 : Math.PI, false);
        spots.seats.push(spot(uc + sg * (hw + 0.75), w, sg < 0 ? dirU : [-dirU[0], -dirU[1]]));
      }
    // rows for visitors, facing the council; an aisle from the door
    for (const w of [2.0, 2.85, 3.7])
      for (let u = uc - hw - 0.4; u <= uc + hw + 0.4; u += 0.72) {
        if (Math.abs(u - du) < 0.85 || u < u0 + 0.6 || u > u1 - 3.2) continue;
        chair(u, w, Math.PI / 2, false);
        spots.visitors.push(spot(u, w, dirW));
      }
    // the speaker's place in front of the U (where the Ortsvorsteher speaks)
    spots.rednerpult = spot(uc, wl - 0.9, dirW);
    box(uc, wl - 0.45, fl, 0.6, 0.45, 1.1, WOODM);
    box(uc, wl - 0.45, fl + 1.1, 0.7, 0.5, 0.05, TOP);
    // the Bürgerbüro: a counter along the right wall, a desk behind it
    const ub = u1 - 2.1,
      wb0 = 1.3,
      wb1 = Math.min(4.9, wl - 0.5);
    box(ub, (wb0 + wb1) / 2, fl, 0.65, wb1 - wb0, 1.05, linC([0.55, 0.37, 0.21]));
    box(ub, (wb0 + wb1) / 2, fl + 1.05, 0.8, wb1 - wb0 + 0.1, 0.05, linC([0.82, 0.8, 0.74]));
    box(u1 - 0.8, (wb0 + wb1) / 2, fl, 0.7, 1.4, 0.74, WOODM);
    box(u1 - 0.8, (wb0 + wb1) / 2 - 0.3, fl + 0.74, 0.25, 0.4, 0.3, linC([0.08, 0.08, 0.09]));
    spots.counter = spot(ub - 0.9, (wb0 + wb1) / 2, dirU);
    spots.clerk = spot(u1 - 1.3, (wb0 + wb1) / 2, [-dirU[0], -dirU[1]]);
    // flags left and right of the arms: Thuringia (white over red) and Germany (black, red, gold)
    for (const [sg, cols] of [
      [-1, [linC([0.95, 0.95, 0.95]), linC([0.75, 0.05, 0.06])]],
      [1, [linC([0.04, 0.04, 0.04]), linC([0.75, 0.05, 0.06]), linC([0.95, 0.75, 0.05])]],
    ]) {
      const uu = uc + sg * 1.7,
        ww = w1 - 0.4;
      box(uu, ww, fl, 0.05, 0.05, 2.7, linC([0.7, 0.62, 0.35]));
      const n = cols.length;
      cols.forEach((col, k) => {
        const z0 = fl + 2.6 - ((k + 1) * 1.3) / n,
          z1 = fl + 2.6 - (k * 1.3) / n,
          A_ = Q(uu + 0.03, ww, z0),
          B_ = Q(uu + 0.03 + 0.8 * sg, ww, z0);
        k2.quad(A_, B_, [B_[0], B_[1], z1], [A_[0], A_[1], z1], col);
        k2.quad(B_, A_, [A_[0], A_[1], z1], [B_[0], B_[1], z1], col);
      });
    }
    // windows (daylight in the panes) in the front and the left wall, with frames and sills
    const SKY = linC([0.78, 0.86, 0.95]),
      FRM = linC([0.95, 0.95, 0.93]);
    const win = (P0, P1, nrm) => {
      // P0, P1: the window's lower corners on the wall (z = fl + 0.95), nrm: into the room (only to push the panes off the wall)
      const o = (p, d) => [p[0] + nrm[0] * d, p[1] + nrm[1] * d],
        [a0, a1] = [o(P0, 0.02), o(P1, 0.02)],
        [b0, b1] = [o(P0, 0.03), o(P1, 0.03)],
        za = fl + 0.95,
        zb = fl + 2.55;
      k2.quad(
        [a0[0], a0[1], za - 0.08],
        [a1[0], a1[1], za - 0.08],
        [a1[0], a1[1], zb + 0.08],
        [a0[0], a0[1], zb + 0.08],
        FRM
      );
      k2.quad([b0[0], b0[1], za], [b1[0], b1[1], za], [b1[0], b1[1], zb], [b0[0], b0[1], zb], SKY);
      const m0 = [(b0[0] + b1[0]) / 2, (b0[1] + b1[1]) / 2],
        m1 = o(m0, 0.005);
      k2.box(m1[0], m1[1], za, 0.05, 0.05, zb - za, Math.atan2(b1[1] - b0[1], b1[0] - b0[0]), FRM);
    };
    for (const u of [1.6, 3.6, du + 2.6, du + 4.6, u1 - 1.4])
      if (u > u0 + 0.6 && u < u1 - 0.6 && Math.abs(u - du) > 1.4) win(Q(u + 0.5, w0 + 0.0), Q(u - 0.5, w0 + 0.0), dirW);
    for (const w of [2.5, 5.5, 8.5]) if (w < w1 - 0.8) win(Q(u0, w - 0.5), Q(u0, w + 0.5), dirU);
    // ceiling: beams across, round lights
    for (let w = w0 + 1.6; w < w1 - 0.5; w += 2.2) box(uc, w, zc - 0.3, u1 - u0, 0.24, 0.3, WOODD);
    for (const [u, w] of [
      [uc - 3.5, 2.6],
      [uc + 3.5, 2.6],
      [uc - 3.5, 6.9],
      [uc + 3.5, 6.9],
      [uc, 4.7],
      [uc, w1 - 2.2],
    ]) {
      const [x, y] = Q(u, w, 0);
      k2.disc(x, y, zc - 0.33, 0, 0, 0.3, linC([1.9, 1.85, 1.7]), 14, true);
    }
    // panelling round the walls (a dark wood band to 1 m) and a picture rail
    const panel = (A_, B_, nrm) => {
      const o = (p, d) => [p[0] + nrm[0] * d, p[1] + nrm[1] * d],
        a0 = o(A_, 0.015),
        a1 = o(B_, 0.015);
      k2.quad(
        [a0[0], a0[1], fl],
        [a1[0], a1[1], fl],
        [a1[0], a1[1], fl + 1.0],
        [a0[0], a0[1], fl + 1.0],
        linC([0.33, 0.21, 0.12])
      );
    };
    panel(Q(dg0, w0), Q(u0, w0), dirW);
    panel(Q(u1, w0), Q(dg1, w0), dirW);
    panel(Q(u0, w0), Q(u0, w1), dirU);
    panel(Q(u0, w1), Q(u1, w1), [-dirW[0], -dirW[1]]);
    panel(Q(u1, w1), Q(u1, w0), [-dirU[0], -dirU[1]]);
    // parquet: boards along the room
    for (let k = 0, w = w0; w < w1 - 0.01; w += 0.6, k++) {
      const wa = w,
        wb2 = Math.min(w1, w + 0.6);
      k2.quad(
        Q(u0, wa, fl + 0.005),
        Q(u1, wa, fl + 0.005),
        Q(u1, wb2, fl + 0.005),
        Q(u0, wb2, fl + 0.005),
        k % 2 ? linC([0.5, 0.33, 0.19]) : linC([0.56, 0.38, 0.22])
      );
    }
    // the arms of Schleusingen (Henneberg: a black hen with a red comb on a green triple hill, gold field) as a shield on the back wall
    {
      const GD = linC([0.88, 0.68, 0.2]),
        GR = linC([0.12, 0.42, 0.16]),
        BK = linC([0.05, 0.05, 0.05]),
        RD = linC([0.75, 0.08, 0.06]),
        zs = fl + 1.75,
        S_ = (u, v, off) => {
          const p = Q(uc + u, w1 - 0.03 - off, 0);
          return [p[0], p[1], zs + v];
        };
      k2.quad(S_(-0.45, 0.25, 0), S_(0.45, 0.25, 0), S_(0.45, 1.05, 0), S_(-0.45, 1.05, 0), GD);
      k2.tri(S_(-0.45, 0.25, 0), S_(0, -0.25, 0), S_(0.45, 0.25, 0), GD);
      for (const [uh, r] of [
        [-0.25, 0.2],
        [0, 0.26],
        [0.25, 0.2],
      ]) {
        const q = S_(uh, 0, 0.01);
        k2.disc(q[0], q[1], zs + 0.22, nx, ny, r, GR, 12, false);
      }
      const disc = (u, v, r, col) => {
        const q = S_(u, 0, 0.02);
        k2.disc(q[0], q[1], zs + v, nx, ny, r, col, 12, false);
      };
      disc(0, 0.62, 0.17, BK);
      disc(0.13, 0.78, 0.07, BK);
      disc(0.17, 0.88, 0.06, BK);
      disc(0.17, 0.95, 0.035, RD);
      k2.tri(S_(-0.12, 0.62, 0.02), S_(-0.05, 0.75, 0.02), S_(-0.3, 0.92, 0.02), BK);
      k2.quad(S_(-0.04, 0.38, 0.02), S_(-0.02, 0.38, 0.02), S_(-0.02, 0.5, 0.02), S_(-0.04, 0.5, 0.02), BK);
      k2.quad(S_(0.04, 0.38, 0.02), S_(0.06, 0.38, 0.02), S_(0.06, 0.5, 0.02), S_(0.04, 0.5, 0.02), BK);
    }
    // light baked into the colours: brighter under the ceiling lights and in the middle, darker in the corners and low down
    const g2 = k2.geo(),
      P2 = g2.attributes.position,
      C2 = g2.attributes.color,
      [cx0, cy0] = Q(uc, (w0 + w1) / 2, 0),
      rmax = Math.hypot(u1 - u0, w1 - w0) / 2;
    for (let i = 0; i < P2.count; i++) {
      const x = P2.getX(i),
        y = -P2.getZ(i),
        zz = P2.getY(i),
        r = Math.min(1, Math.hypot(x - cx0, y - cy0) / rmax),
        k = 0.72 + 0.28 * (1 - r * r) + 0.08 * Math.min(1, Math.max(0, (zz - fl) / 3.3));
      C2.setXYZ(i, C2.getX(i) * k, C2.getY(i) * k, C2.getZ(i) * k);
    }
    const im = add(new THREE.Mesh(g2, new THREE.MeshBasicMaterial({ vertexColors: true })), 'rathaus innen');
    im.userData.own = true;
    // collisions inside: the walls of the hall (the door gap stays open), the U of tables, the counter, the speaker's desk
    const seg = (p, q) => S.segs.push([p[0], p[1], q[0], q[1]]);
    seg(Q(u0, w0), Q(dg0, w0));
    seg(Q(dg1, w0), Q(u1, w0));
    seg(Q(u0, w0), Q(u0, w1));
    seg(Q(u0, w1), Q(u1, w1));
    seg(Q(u1, w1), Q(u1, w0));
    const rect = (ua, wa, ub2, wb3) => {
      seg(Q(ua, wa), Q(ub2, wa));
      seg(Q(ub2, wa), Q(ub2, wb3));
      seg(Q(ub2, wb3), Q(ua, wb3));
      seg(Q(ua, wb3), Q(ua, wa));
    };
    rect(uc - hw - 0.4, wh - 0.4, uc + hw + 0.4, wh + 0.4);
    rect(uc - hw - 0.4, wl, uc - hw + 0.4, wh);
    rect(uc + hw - 0.4, wl, uc + hw + 0.4, wh);
    rect(ub - 0.33, wb0, ub + 0.33, wb1);
    rect(uc - 0.3, wl - 0.68, uc + 0.3, wl - 0.22);
    S.rathaus.Q = Q;
    S.rathaus.spots = spots;
    S.rathaus.counter = [spots.counter.x, spots.counter.y]; // where one stands at the counter (Ortsvorsteher: the concerns of Ratscher)
    S.rathaus.clerk = [spots.clerk.x, spots.clerk.y]; // behind the counter
    S.rathaus.counterSign = Q(u1 - 0.04, (wb0 + wb1) / 2, fl + 2.1);
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
    // light on the ground under each lamp at night: the soft disc of the village lamps (same material, shown with theirs)
    if (VPROPS.pool) {
      const pg = new THREE.PlaneGeometry(9, 9);
      pg.rotateX(-Math.PI / 2);
      const iP = new THREE.InstancedMesh(pg, VPROPS.pool.material, L.length);
      L.forEach(([x, y], i) => {
        m4.makeTranslation(x, ground(x, y) + 0.12, -y);
        iP.setMatrixAt(i, m4);
      });
      iP.renderOrder = 2;
      iP.computeBoundingSphere();
      iP.visible = VPROPS.pool.visible;
      S.pool = add(iP, 'lamp light');
    }
  }
  // ---- the streets over the photo (welt/welt.js overlay): asphalt with kerbs on the through roads, sett in the old town and on the Markt,
  // paving on footways; r = cover, g/r = surface (OSM surface, else by class and place) ----
  function streetMap() {
    const half = 460,
      size = 2 * half,
      N = 1024,
      x0 = MARKT[0] - half,
      y0 = MARKT[1] - half,
      sc = N / size,
      cv = document.createElement('canvas');
    cv.width = cv.height = N;
    const g = cv.getContext('2d'),
      X = x => (x - x0) * sc,
      Y = y => (y0 + size - y) * sc,
      SURF = {
        asphalt: 40,
        concrete: 40,
        paved: 40,
        sett: 120,
        cobblestone: 120,
        'cobblestone:flattened': 120,
        unhewn_cobblestone: 120,
        paving_stones: 200,
      },
      W = { 1: 8.0, 2: 7.0, 3: 5.6, 5: 3.6, 8: 2.2 };
    g.fillStyle = '#000';
    g.fillRect(0, 0, N, N);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const list = data.st.filter(s2 => W[s2.k]).sort((p2, q) => W[q.k] - W[p2.k]);
    for (const s2 of list) {
      const p = s2.p,
        mx = p[(p.length >> 2) * 2],
        my = p[(p.length >> 2) * 2 + 1];
      let code = SURF[s2.s];
      if (code === undefined)
        code = s2.k <= 2 ? 40 : s2.k === 8 ? 200 : Math.hypot(mx - MARKT[0], my - MARKT[1]) < 320 ? 120 : 40;
      g.strokeStyle = `rgb(255,${code},0)`;
      g.lineWidth = W[s2.k] * sc;
      g.beginPath();
      for (let k = 0; k < p.length; k += 2) (k ? g.lineTo : g.moveTo).call(g, X(p[k]), Y(p[k + 1]));
      g.stroke();
    }
    if (data.marktplatz) {
      const m = data.marktplatz;
      g.fillStyle = 'rgb(255,120,0)';
      g.beginPath();
      for (let k = 0; k < m.length; k += 2) (k ? g.lineTo : g.moveTo).call(g, X(m[k]), Y(m[k + 1]));
      g.closePath();
      g.fill();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = 4;
    if (WELT.setOverlay) WELT.setOverlay(tex, x0, y0, size);
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
  // sitting down: on the benches of the Markt and on every chair of the council chamber (the tasks have their own seats too)
  const nearSeat = () => {
    if (S.state !== 'ready' || P.mode !== 'walk') return null;
    const R = S.rathaus,
      all = (S.benchSpots || []).concat(R && R.spots ? R.spots.seats.concat(R.spots.visitors) : []);
    let best = null,
      bd = 1.3;
    for (const s2 of all) {
      const d = Math.hypot(s2.x - P.x, s2.y - P.y);
      if (d < bd && Math.abs(s2.z - P.feet) < 0.8) {
        bd = d;
        best = s2;
      }
    }
    return best;
  };
  PLAY.act({
    id: 'schl:sit',
    r: 1.3,
    prio: 0.03,
    label: () => (!PLAY.seat && nearSeat() ? 'Hinsetzen' : null),
    pos: () => {
      const s2 = nearSeat();
      return s2 ? [s2.x, s2.y, s2.z + 0.6] : null;
    },
    run: () => {
      const s2 = nearSeat();
      if (s2) PLAY.sit({ x: s2.x, y: s2.y, eye: s2.z + 1.2, yaw: s2.yaw, pitch: -6, leaveLabel: 'Aufstehen' });
    },
  });
  KERN.provide('place', place, 20);
  KERN.provide('ground', (x, y) => (S.state === 'ready' && inHall(x, y) ? S.rathaus.floor : undefined), 10);
  KERN.provide('inside', (x, y) => S.state === 'ready' && inHall(x, y), 10); // the hall is indoors (acoustics, lamps, no waving down cars)
  KERN.provide('pushOut', pushOut, 10);
  KERN.provide('free', (x, y) => (inZone(x, y) ? true : undefined), 10);
  // ---- near the Markt the tiles and the town are loaded, far away freed (KERN.zone, core/kern.js: build near, drop far) ----
  KERN.zone({
    id: 'schleusingen',
    x: MARKT[0],
    y: MARKT[1],
    near: NEAR,
    far: FAR,
    build: async () => {
      WELT.need('schleusingen', true);
      await load();
      if (S.state === 'error') throw new Error(S.err);
      if (!S.noTiles)
        await KERN.until(() => WELT.heightAt(MARKT[0], MARKT[1]) !== undefined && WELT.state().loading === 0, 900);
      try {
        build();
      } catch (e) {
        S.state = 'error';
        S.err = String(e);
        throw e;
      }
    },
    drop: () => {
      WELT.need('schleusingen', false);
      if (S.state !== 'idle' && S.state !== 'error') S.dispose();
    },
    tick: () => {
      if (S.pool && VPROPS.pool && S.pool.visible !== VPROPS.pool.visible) {
        S.pool.visible = VPROPS.pool.visible;
        markDirty();
      }
    },
  });
  S.status = () => ({
    state: S.state,
    buildings: S.bld.length,
    segs: S.segs.length,
    lamps: S.lamps.length,
    trees: S.trees || 0,
    signs: (S.signs || []).length,
    ms: S.ms,
    loadMs: S.loadMs || 0,
    noTiles: !!S.noTiles,
    err: S.err,
    welt: WELT.state(),
  });
  return S;
})();
window.SCHL = SCHL;
