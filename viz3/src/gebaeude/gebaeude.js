// ===================== feat/welt-gebaeude: every building in 3D – the ones the app still lacked, from ETHOS.BUILDA (GEB) =====================
// Falko (5.11.2026): roofs only printed in the aerial photo, flat on the ground – sheds, garages, barns, carports OpenStreetMap lacks – should
// stand as buildings like the others, at their true place. ETHOS.BUILDA (Forschungszentrum Jülich, footprint and height of every building in
// Germany, for Thuringia from the state's LoD2; ODbL 1.0) gives footprint and height; tools/welt-gebaeude/prep.py keeps the ones the app
// does not have yet (overlap with the 337 OSM buildings of world/ratscher.js, outside the hand-modelled garden and yards), estimates the kind
// (house, barn, hall, shed or garage, round tank, tower) and the roof (gable along the long side, hipped, mono-pitch or flat – a data field
// the state's LoD2 replaces later) and takes the roof colour from the 2024 orthophoto. Here they are built like Schleusingen's houses
// (welt/schleusingen.js): facades and roofs in the attribute layout of world/village.js, drawn with the village's own facade and roof
// materials – no new shader programs; walls into the collisions of the square (RATSCHER.walls before world/worldcol.js builds its grid).
// Ratscher's square: dist/gebaeude/ratscher.json, built once after the village (few ms). ?nogeb leaves them out (to compare).
import * as THREE from 'three';
import { BASE, COARSE, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { LM, markDirty, whenLoaded } from '../core/assets.js';
import { RATSCHER } from '../world/ratscher.js';
import { VILLAGE } from '../world/village.js';
import { WELT } from '../welt/welt.js';
import { GEBDACH } from './geb_dach.js';
export const GEB = (() => {
  const S = { on: false, ready: false, n: 0, bld: [], meshes: [], nSeg: 0, ms: 0, err: '', trees: 0, stats: null };
  if (!window.RATSCHER || !RATSCHER.on || new URLSearchParams(location.search).has('nogeb')) return S;
  S.on = true;
  const ID0 = 2000; // building ids in the facade shader's hash (world/village.js: 0–336 OSM, 4000+ rebuilt parts of the centre)
  const hh = n => {
    const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    linC = (c, k = 1) => c.map(v => lin(v) * k);
  // styles of world/village.js (ST) and its colours
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
  };
  const PASTEL = [
    [0.93, 0.89, 0.78],
    [0.93, 0.84, 0.56],
    [0.92, 0.77, 0.63],
    [0.8, 0.88, 0.76],
    [0.95, 0.94, 0.91],
    [0.84, 0.83, 0.8],
    [0.93, 0.81, 0.77],
    [0.87, 0.76, 0.53],
    [0.87, 0.9, 0.86],
    [0.96, 0.92, 0.85],
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
      [0.58, 0.26, 0.2],
    ].map(c => linC(c, 0.85)),
    GREY = [
      [0.78, 0.77, 0.74],
      [0.86, 0.84, 0.8],
      [0.7, 0.69, 0.66],
      [0.88, 0.86, 0.78],
    ].map(c => linC(c, 0.82)),
    CONCRETE = linC([0.62, 0.61, 0.58], 0.82);
  const ANGER = [222, -108];
  // ---- the look of one building: kind, size, the old centre (more slate and half-timbering), chance ----
  function styleOf(b, id) {
    const k = hh(id * 3.7 + 1),
      k2 = hh(id + 11.3),
      A = b.A,
      o = {
        style: ST.PLASTER,
        col: PASTEL[Math.floor(k2 * PASTEL.length)],
        timber: k2 < 0.6 ? 0 : k2 < 0.85 ? 1 : 2,
        frame: hh(id + 5) < 0.86 ? 0 : 1,
        door: Math.floor(hh(id + 9) * 6),
        shut: Math.floor(hh(id + 13) * 3),
        shutters: false,
        orn: false,
        raised: hh(id + 2) < 0.6,
        sp: 2.7 + hh(id + 4) * 0.5,
        typ: b.k === 0 ? 0 : b.k === 2 ? 2 : 1,
        noWin: false,
        doorW: 0,
      };
    if (b.k === 4 || b.k === 5) return Object.assign(o, { col: CONCRETE, noWin: true, doorW: -1, raised: false }); // tank, tower: concrete
    if (b.k === 2) {
      // garages (flat roof, garage-sized): plaster or brick with a light up-and-over door; sheds and lean-tos: weathered boards
      if (b.r === 0 && A >= 14 && A <= 120) {
        const brick = k < 0.25;
        return Object.assign(o, {
          style: brick ? ST.BRICK : ST.PLASTER,
          col: brick ? linC([0.62, 0.33, 0.26]) : GREY[Math.floor(k2 * GREY.length)],
          noWin: true,
          door: [4, 4, 3, 0, 5, 4][Math.floor(hh(id + 9) * 6)],
          doorW: 2.3,
          raised: false,
          sp: 3.2,
        });
      }
      return Object.assign(o, {
        style: k < 0.78 ? ST.SHED : ST.BRICK,
        col: k < 0.78 ? linC(BOARDS[Math.floor(k2 * 3)], 0.8) : linC([0.62, 0.33, 0.26]),
        sp: 3.2,
        doorW: A < 12 ? 0.9 : 1.2,
      });
    }
    if (b.k === 1) {
      if (A >= 350) return Object.assign(o, { style: ST.HALL, col: SHEET[Math.floor(k * 4)], sp: 4.5 });
      o.style = k < 0.55 ? ST.BARN : k < 0.82 ? ST.BARN_FULL : ST.BRICK;
      o.col = o.style === ST.BRICK ? linC([0.62, 0.33, 0.26]) : linC(BOARDS[Math.floor(k2 * 3)], 0.8);
      o.sp = 3.4;
      return o;
    }
    // a flat-roofed building of several storeys (flats, a school, offices): light plaster, plain white windows on every storey
    if (b.r === 0 && b.h >= 9) {
      return Object.assign(o, {
        style: ST.MODERN,
        col: PASTEL[[0, 4, 4, 9, 1, 5][Math.floor(k2 * 6)]],
        sp: 3.3 + hh(id + 4) * 0.4,
        frame: 0,
        raised: false,
      });
    }
    // houses: as world/village.js styleOf0 – the older look near the Anger
    const dC = Math.hypot(b.cx - ANGER[0], b.cy - ANGER[1]),
      old = dC < 330 ? 1 - dC / 330 : 0,
      r = k * (0.55 + 0.45 * (1 - old));
    if (dC < 420) {
      if (r < 0.12) o.style = ST.SLATE;
      else if (r < 0.3) o.style = ST.SLATE_UP;
      else if (r < 0.4) o.style = ST.FW_UP;
      else if (r < 0.46) o.style = ST.FW;
      else if (r < 0.58) o.style = ST.SLATE_GABLE;
    } else o.style = r < 0.5 ? ST.MODERN : r < 0.62 ? ST.SLATE_GABLE : ST.PLASTER;
    if (o.style === ST.SLATE || o.style === ST.SLATE_UP) o.orn = hh(id + 17) < 0.35;
    if (o.style === ST.PLASTER || o.style === ST.FW_UP) o.shutters = hh(id + 19) < 0.18;
    if (o.style === ST.MODERN) {
      o.col = PASTEL[[0, 4, 4, 9, 1, 5][Math.floor(k2 * 6)]];
      o.sp = 3.3 + hh(id + 4) * 0.4;
      o.frame = 0;
    }
    return o;
  }
  // ---- geometry buffers in the attribute layout of world/village.js (as welt/schleusingen.js) ----
  function wallBuf() {
    const A = { position: [], normal: [], aW: [], aV: [], aG: [], aD: [], aC: [], aTan: [] },
      I = [];
    return {
      A,
      I,
      // one quad of a facade: a → b (outward to the right seen from above), tops ta/tb above the building's foot z0, down to zLow
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
      n: () => pos.length / 3,
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
  // ---- one building: facades (door, no windows on party walls, a stone base on a slope), roof (faces, soffit, fascia, gutters, ridge
  // tiles, parapet of a flat roof, a chimney on most houses), collision segments – after welt/schleusingen.js building() ----
  function building(b, id, z0, WB, RB, segs) {
    const o = b.st,
      pk = o.timber + 4 * o.frame + 16 * o.door + 128 * o.shut,
      eave = b.e;
    // the door: on the facade towards the nearest street (not a party wall), else on the longest one
    let doorF = -1,
      best = 1e9;
    if (o.doorW >= 0)
      b.F.forEach((f, k) => {
        const L = Math.hypot(f[2] - f[0], f[3] - f[1]);
        if (f[8] & 1 || L < (b.k === 0 ? 3 : 2.0)) return;
        const sc = (f[9] > 20 ? 30 : f[9]) - L * 0.08;
        if (sc < best) {
          best = sc;
          doorF = k;
        }
      });
    let u0 = 0;
    b.F.forEach((f, k) => {
      const [ax, ay, bx, by, t0, uA0, tA0, t1, fl] = f,
        L = Math.hypot(bx - ax, by - ay);
      if (L < 0.05) return;
      const F = { dx: (bx - ax) / L, dy: (by - ay) / L },
        gable = tA0 > Math.max(t0, t1) + 0.6 && uA0 > 0.3 && uA0 < L - 0.3,
        blind = fl & 1 || o.noWin,
        st = blind && (o.style === ST.FW || o.style === ST.FW_UP) ? ST.PLASTER : o.style,
        sp = o.sp,
        nb = Math.max(1, Math.floor((L - 0.6) / sp)),
        bw = L / nb;
      let du = -1,
        dw = 0;
      if (k === doorF) {
        if (o.doorW > 0) {
          dw = Math.min(o.doorW, L * 0.7);
          du = b.k === 2 ? L / 2 : (Math.floor(nb / 2) + 0.5) * bw;
        } else if (o.typ === 0) {
          du = ((nb >= 3 ? (hh(id + 23) < 0.5 ? 1 : nb - 2) : 0) + 0.5) * bw;
          dw = 1.05;
        } else if (st === ST.HALL) {
          du = L / 2;
          dw = Math.min(5, L * 0.4);
        } else {
          du = (Math.floor(nb / 2) + 0.5) * bw;
          dw = Math.min(3.0, L * 0.35);
        }
      }
      const at = {
        u0,
        w: 4 * id + o.typ,
        LF: blind ? 0.5 : L,
        eave,
        st,
        t0,
        tA: gable ? tA0 : (t0 + t1) / 2,
        uA: gable ? uA0 : L / 2,
        t1,
        du,
        dw,
        sp,
        fl: (gable ? 1 : 0) + (o.shutters ? 2 : 0) + (o.orn ? 4 : 0) + (o.raised ? 8 : 0),
        col: o.col,
        pk,
      };
      let low = Math.min(z0 - 1.5, b.zmin - 0.8);
      if (z0 - b.zmin > 1.2) {
        // an exposed foot on a slope: a plain base of its own without windows (the plaster plinth would be a dark slab metres high)
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
            col: CONCRETE,
          })
        );
        low = z0;
      }
      if (gable) {
        const mx = ax + F.dx * uA0,
          my = ay + F.dy * uA0;
        WB.quad(F, ax, ay, mx, my, 0, uA0, t0, tA0, z0, low, at);
        WB.quad(F, mx, my, bx, by, uA0, L, tA0, t1, z0, low, at);
      } else WB.quad(F, ax, ay, bx, by, 0, L, t0, t1, z0, low, at);
      segs.push(ax, ay, bx, by);
      u0 += L;
    });
    // ---- roof ----
    const V3 = [],
      rv = b.rv;
    for (let k = 0; k < rv.length; k += 3) V3.push([rv[k], rv[k + 1], rv[k + 2] + z0]);
    const col = b.rc.map(lin),
      th = b.k === 0 ? 0.16 : 0.1,
      k1 = [b.rk, col[0], col[1], col[2]],
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
          // a parapet with a sheet-metal cap (a tank: its rim)
          const up = b.k === 4 ? 0.12 : 0.28,
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
        if (Math.abs(C[2] - A[2]) < 0.08 && b.k < 2) {
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
    if (b.k === 0 && !flat && hh(id + 31) < 0.7 && V3.length) {
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
        const f = 0.25 + hh(id + 37) * 0.5;
        chimney(
          RB,
          A[0] + (C[0] - A[0]) * f,
          A[1] + (C[1] - A[1]) * f,
          zm,
          0.52,
          0.42,
          zm + 0.95,
          Math.atan2(C[1] - A[1], C[0] - A[0]),
          14 + Math.floor(hh(id + 41) * 3),
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
  // ---- buildings → meshes per 400 m cell (frustum culling), wall segments; the foot on the terrain as drawn (KERN). Built in pieces of
  // a few milliseconds per frame (KERN.tick): no hitch at load or when a cell comes in while driving ----
  const CELL = 400;
  function prep(b, id) {
    let cx = 0,
      cy = 0,
      A = 0;
    const n = b.f.length / 2;
    for (let k = 0; k < b.f.length; k += 2) {
      const j = (k + 2) % b.f.length;
      cx += b.f[k] / n;
      cy += b.f[k + 1] / n;
      A += b.f[k] * b.f[j + 1] - b.f[j] * b.f[k + 1];
    }
    b.cx = cx;
    b.cy = cy;
    b.A = Math.abs(A) / 2;
    b.id = id;
  }
  // the wall feet of a list (collisions) without building anything
  function segsOf(list) {
    const out = [];
    for (const b of list)
      for (const f of b.F) if (Math.hypot(f[2] - f[0], f[3] - f[1]) >= 0.05) out.push(f[0], f[1], f[2], f[3]);
    return out;
  }
  // the fences, hedges, bins and woodpiles world/village_near.js puts around the village's houses keep off these buildings as well:
  // its freeAt asks GEB.footFree (a grid of 16 m over the footprints of the square, margin up to 1 m)
  const FG = new Map(),
    FGS = 16;
  function footIndex(list) {
    for (const b of list) {
      const f = b.f;
      let x0 = 1e9,
        y0 = 1e9,
        x1 = -1e9,
        y1 = -1e9;
      for (let k = 0; k < f.length; k += 2) {
        x0 = Math.min(x0, f[k]);
        x1 = Math.max(x1, f[k]);
        y0 = Math.min(y0, f[k + 1]);
        y1 = Math.max(y1, f[k + 1]);
      }
      b.bb = [x0, y0, x1, y1];
      for (let i = Math.floor((x0 - 1) / FGS); i <= Math.floor((x1 + 1) / FGS); i++)
        for (let j = Math.floor((y0 - 1) / FGS); j <= Math.floor((y1 + 1) / FGS); j++) {
          const k = i + ',' + j;
          if (!FG.has(k)) FG.set(k, []);
          FG.get(k).push(b);
        }
    }
  }
  S.footFree = (x, y, m) => {
    const L = FG.get(Math.floor(x / FGS) + ',' + Math.floor(y / FGS));
    if (!L) return true;
    m = Math.min(m, 1);
    for (const b of L) {
      const bb = b.bb,
        f = b.f,
        n = f.length;
      if (x < bb[0] - m || x > bb[2] + m || y < bb[1] - m || y > bb[3] + m) continue;
      let c = false;
      for (let k = 0; k < n; k += 2) {
        const j = (k + 2) % n,
          ax = f[k],
          ay = f[k + 1],
          dx = f[j] - ax,
          dy = f[j + 1] - ay,
          L2 = dx * dx + dy * dy,
          t = L2 > 0 ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)) : 0;
        if (ay > y !== f[j + 1] > y && x < (dx * (y - ay)) / dy + ax) c = !c;
        if (Math.hypot(x - ax - dx * t, y - ay - dy * t) < m) return false;
      }
      if (c) return false;
    }
    return true;
  };
  function one(J, b, id) {
    prep(b, id);
    // the foot: the ground along the walls; on a slope the ground floor keeps to the upper side, the walls go down to the lowest point
    const zs = [];
    for (const f of b.F) zs.push(J.ground(f[0], f[1]), J.ground((f[0] + f[2]) / 2, (f[1] + f[3]) / 2));
    zs.sort((p, q) => p - q);
    const zmin = zs.length ? zs[0] : J.ground(b.cx, b.cy),
      z70 = zs.length ? zs[Math.floor(zs.length * 0.7)] : zmin;
    b.zmin = zmin;
    b.z0 = z70 - zmin < 1.0 ? zmin - 0.05 : z70 - 0.4;
    b.st = styleOf(b, id);
    const key = Math.floor(b.cx / CELL) + ',' + Math.floor(b.cy / CELL);
    let c = J.cells.get(key);
    if (!c) J.cells.set(key, (c = { WB: wallBuf(), RB: roofBuf(), n: 0 }));
    try {
      building(b, id, b.z0, c.WB, c.RB, J.segs);
      c.n++;
    } catch (e) {
      console.warn('gebaeude', id, e);
    }
  }
  const JOBS = [];
  S.jobs = () => JOBS.length;
  function job(list, id0, ground, done) {
    const J = { list, id0, ground, done, i: 0, cells: new Map(), segs: [], dead: false };
    JOBS.push(J);
    return J;
  }
  function runJobs() {
    const t0 = performance.now();
    while (JOBS.length && performance.now() - t0 < 8) {
      const J = JOBS[0];
      if (!J.dead && J.i < J.list.length) {
        try {
          one(J, J.list[J.i], J.id0 + J.i);
        } catch (e) {
          console.warn('gebaeude', J.id0 + J.i, e); // a broken record is skipped, the job goes on
        }
        J.i++;
        continue;
      }
      JOBS.shift();
      if (J.dead) continue;
      try {
        J.done(J.cells, J.segs);
      } catch (e) {
        S.err = String(e);
        console.warn('gebaeude', e);
      }
    }
  }
  KERN.tick(runJobs, 'gebaeude/bau');
  function add(m, name, out) {
    m.name = 'gebaeude ' + name;
    m.userData.noMerge = true;
    m.castShadow = false;
    m.receiveShadow = false;
    scene.add(m);
    out.push(m);
    return m;
  }
  // ---- Ratscher's square ----
  let data = null;
  new THREE.FileLoader(LM).setResponseType('json').load(
    BASE + 'gebaeude/ratscher.json',
    j => (data = j),
    undefined,
    e => (S.err = 'ratscher.json: ' + (e && e.message ? e.message : e))
  );
  function buildRatscher() {
    const t0 = performance.now(),
      ground = (x, y) => (RATSCHER.hMesh ? RATSCHER.hMesh(x, y) : RATSCHER.hAt(x, y));
    S.bld = data.b;
    S.stats = data.stats || null;
    data.b.forEach((b, i) => prep(b, ID0 + i));
    footIndex(data.b);
    // the village's own materials (world/village.js): same programs, its lamps and windows at night
    const wm = VILLAGE.ready && RATSCHER.bld[0] && RATSCHER.bld[0].material,
      rm = VILLAGE.ready && VILLAGE.meshes[0] && VILLAGE.meshes[0].material;
    if (!wm || !rm) throw new Error('village materials missing');
    // collisions now (world/worldcol.js builds its grid after this module): the wall feet
    const segs = segsOf(data.b),
      W0 = RATSCHER.walls || new Float32Array(0),
      W1 = new Float32Array(W0.length + segs.length);
    W1.set(W0);
    W1.set(segs, W0.length);
    RATSCHER.walls = W1;
    S.nSeg = segs.length / 4;
    // (no boxes for the garden's walk grid: no new building reaches into it – x −50…50, y −55…55 – the walker meets them through
    // KERN.pushOut like the village's)
    // trees of the canopy model that were these buildings' roofs (no OSM footprint to keep them out when the trees were found): hidden
    hideTrees(data.trees || []);
    S.n = data.b.length;
    S.msPrep = Math.round(performance.now() - t0);
    // the meshes over the next frames
    const t1 = performance.now();
    job(data.b, ID0, ground, cells => {
      for (const [k, c] of cells) {
        if (!c.n) continue;
        add(new THREE.Mesh(c.WB.geo(), wm), 'walls ' + k, S.meshes);
        add(new THREE.Mesh(c.RB.geo(), rm), 'roofs ' + k, S.meshes);
      }
      // hidden with the village in the map view (world/ratscher.js setMap toggles RATSCHER.bld)
      for (const m of S.meshes) {
        RATSCHER.bld.push(m);
        m.visible = !RATSCHER.map;
      }
      S.ms = Math.round(performance.now() - t1);
      S.ready = true;
      markDirty(true);
    });
  }
  function hideTrees(list) {
    if (!list.length) return;
    const z = new THREE.Matrix4().makeScale(0, 0, 0),
      recs = RATSCHER.treeRecs || [],
      XY = RATSCHER.treeXY,
      gone = [];
    for (const [x, y] of list) {
      const r = recs.find(q => Math.abs(q.x - x) < 0.15 && Math.abs(q.y - y) < 0.15);
      if (r) {
        for (const [im, i] of r.inst) {
          im.setMatrixAt(i, z);
          im.instanceMatrix.needsUpdate = true;
        }
        r.gone = true;
        S.trees++;
      }
      gone.push([x, y]);
    }
    // their trunks out of the list world/worldcol.js builds from (it runs after this module)
    if (XY && gone.length) {
      const keep = [];
      for (let i = 0; i + 2 < XY.length; i += 3)
        if (!gone.some(([x, y]) => Math.abs(XY[i] - x) < 0.15 && Math.abs(XY[i + 1] - y) < 0.15))
          keep.push(XY[i], XY[i + 1], XY[i + 2]);
      RATSCHER.treeXY = keep;
    }
  }
  // ---- beyond the square: cells of 400 m along the roads one drives (welt/fahrt.js), Schleusingen around its old town, Kloster Veßra –
  // fetched and built when the observer comes within NEAR of a cell, freed beyond FAR; the foot on the terrain as drawn there (the tiles
  // of welt/welt.js when they are in, else the coarse terrain – a cell is set down again when the ground under it changes) ----
  const Z = {
    index: null,
    state: 'idle',
    cells: new Map(),
    segs: [],
    grid: new Map(),
    busy: false,
    built: 0,
    freed: 0,
    n: 0,
  };
  S.Z = Z;
  const NEAR = COARSE ? 500 : 700, // phones: the same buildings, the far cells a little earlier out of memory
    FAR = COARSE ? 680 : 900,
    ZB = RATSCHER.box;
  // distance from (x, y) to the rectangle of cell (i, j)
  const cellD = (i, j, x, y) =>
    Math.hypot(Math.max(i * CELL - x, 0, x - (i + 1) * CELL), Math.max(j * CELL - y, 0, y - (j + 1) * CELL));
  function zIndex() {
    Z.state = 'index';
    fetch(BASE + 'gebaeude/z/index.json')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('index.json ' + r.status))))
      .then(j => {
        Z.index = j;
        Z.keys = Object.keys(j.cells || {}).sort();
        Z.state = 'ready';
      })
      .catch(e => {
        Z.state = 'error';
        Z.err = String(e);
      });
  }
  function zGround(x, y) {
    const z = KERN.terrain(x, y);
    return Number.isFinite(z) ? z : RATSCHER.hAt(x, y);
  }
  function zBuild(c, then) {
    const t0 = performance.now(),
      wm = RATSCHER.bld[0] && RATSCHER.bld[0].material,
      rm = VILLAGE.meshes[0] && VILLAGE.meshes[0].material;
    if (c.job) c.job.dead = true;
    c.job = job(c.data.b, 10000 + Z.keys.indexOf(c.key) * 400, zGround, (cells, segs) => {
      c.job = null;
      zDrop(c, true);
      for (const [k, sc] of cells) {
        if (!sc.n) continue;
        for (const m of [new THREE.Mesh(sc.WB.geo(), wm), new THREE.Mesh(sc.RB.geo(), rm)]) {
          add(m, 'z ' + c.key + ' ' + k, c.meshes);
          RATSCHER.bld.push(m);
          m.visible = !RATSCHER.map;
        }
      }
      c.segs = segs;
      // the ground under a few buildings as it was when built – compared later (the tiles may come in after)
      c.probe = c.data.b.filter((b, k) => k % 7 === 0).map(b => [b.cx, b.cy, zGround(b.cx, b.cy)]);
      c.ms = Math.round(performance.now() - t0);
      c.state = 'built';
      Z.built++;
      zGrid();
      markDirty(true);
      if (then) then();
    });
  }
  function zDrop(c, keepData) {
    for (const m of c.meshes) {
      scene.remove(m);
      m.geometry.dispose();
      const k = RATSCHER.bld.indexOf(m);
      if (k >= 2) RATSCHER.bld.splice(k, 1);
    }
    c.meshes = [];
    c.segs = [];
    if (!keepData) {
      if (c.job) {
        c.job.dead = true;
        Z.busy = false;
      }
      c.job = null;
      c.data = null;
      c.state = 'idle';
      Z.freed++;
      zGrid();
      markDirty(true);
    }
  }
  // the wall feet of the built cells in an 8 m hash (KERN.pushOut below)
  function zGrid() {
    Z.grid.clear();
    Z.segs = [];
    for (const c of Z.cells.values())
      for (let k = 0; k + 3 < c.segs.length; k += 4) Z.segs.push(c.segs.slice(k, k + 4));
    Z.segs.forEach((s, k) => {
      for (let i = Math.floor(Math.min(s[0], s[2]) / 8); i <= Math.floor(Math.max(s[0], s[2]) / 8); i++)
        for (let j = Math.floor(Math.min(s[1], s[3]) / 8); j <= Math.floor(Math.max(s[1], s[3]) / 8); j++) {
          const key = i + ',' + j;
          let a = Z.grid.get(key);
          if (!a) Z.grid.set(key, (a = []));
          a.push(k);
        }
    });
    Z.n = [...Z.cells.values()].reduce((n, c) => n + (c.meshes.length ? c.data.b.length : 0), 0);
  }
  // walker and vehicles beyond the square: out of these walls; answers only when it moved the point (the zones are asked next)
  function zPush(p, r) {
    if (!Z.segs.length) return undefined;
    let moved = false;
    const ci = Math.floor(p[0] / 8),
      cj = Math.floor(p[1] / 8);
    for (let i = ci - 1; i <= ci + 1; i++)
      for (let j = cj - 1; j <= cj + 1; j++) {
        const a = Z.grid.get(i + ',' + j);
        if (!a) continue;
        for (const k of a) {
          const s = Z.segs[k],
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
    return moved ? true : undefined;
  }
  // on by default since the cells were tested with the tiles (6.11. night); ?nogebz leaves them out (to compare)
  const ZON = !new URLSearchParams(location.search).has('nogebz');
  if (ZON) KERN.provide('pushOut', zPush, 15);
  let zAcc = 0,
    zCheck = 0;
  function zTick(dt) {
    zAcc += dt;
    if (zAcc < 0.5 || Z.busy || !VILLAGE.ready || !ZB) return;
    zAcc = 0;
    const o = KERN.where();
    if (!o) return;
    const [x, y] = o,
      dEdge = Math.min(x - ZB[0], ZB[2] - x, y - ZB[1], ZB[3] - y);
    if (!Z.index) {
      if (Z.state === 'idle' && dEdge < NEAR + 300) zIndex();
      return;
    }
    // free what is far
    for (const c of Z.cells.values()) {
      const [i, j] = c.ij;
      if ((c.meshes.length || c.state === 'building') && cellD(i, j, x, y) > FAR) zDrop(c);
    }
    // the nearest wanted cell not built yet: fetch and build it (one at a time)
    let best = null,
      bd = NEAR;
    for (const key of Z.keys) {
      const c = Z.cells.get(key);
      if (c && (c.meshes.length || c.state !== 'idle')) continue;
      const [i, j] = key.split('_').map(Number),
        d = cellD(i, j, x, y);
      if (d < bd) {
        bd = d;
        best = key;
      }
    }
    if (best) {
      let c = Z.cells.get(best);
      if (!c)
        Z.cells.set(
          best,
          (c = { key: best, ij: best.split('_').map(Number), meshes: [], segs: [], data: null, state: 'idle' })
        );
      Z.busy = true;
      c.state = 'loading';
      const go = j => {
        c.data = j;
        c.state = 'building';
        try {
          zBuild(c, () => (Z.busy = false));
        } catch (e) {
          c.state = 'error';
          Z.err = String(e);
          Z.busy = false;
          console.warn('gebaeude cell', best, e);
        }
      };
      if (c.data) go(c.data);
      else
        fetch(BASE + 'gebaeude/z/' + best + '.json')
          .then(r => (r.ok ? r.json() : Promise.reject(new Error(best + ' ' + r.status))))
          .then(go)
          .catch(e => {
            c.state = 'error';
            Z.err = String(e);
            Z.busy = false;
          });
      return;
    }
    // a built cell whose ground changed (the tiles came in): set down again (one check every 2 s)
    if ((zCheck += 1) % 4) return;
    for (const c of Z.cells.values()) {
      if (!c.meshes.length || !c.probe) continue;
      if (c.probe.some(([px, py, pz]) => Math.abs(zGround(px, py) - pz) > 0.4)) {
        zBuild(c);
        c.reseat = (c.reseat || 0) + 1;
        break;
      }
    }
  }
  if (ZON) KERN.tick(zTick, 'gebaeude/zellen');
  // ---- the world's image tiles without the printed roofs (tools/welt-gebaeude/kacheln.py → gh-pages welt-test/v2/, a set of its own
  // with only the retouched tiles): welt/welt.js takes a tile's image from there when its key is listed. Off until tested (?welt2) ----
  S.TILES2 = false;
  const T2 = { on: S.TILES2 || new URLSearchParams(location.search).has('welt2'), keys: null, state: 'idle', n: 0 };
  S.T2 = T2;
  if (T2.on && WELT.on) {
    T2.state = 'loading';
    fetch(WELT.base + 'v2/index.json')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('v2/index.json ' + r.status))))
      .then(j => {
        T2.keys = new Set(j.tiles || []);
        T2.state = 'ready';
        WELT.imgBase = t => {
          if (!T2.keys.has(t.k)) return t.base;
          T2.n++;
          return WELT.base + 'v2/';
        };
      })
      .catch(e => {
        T2.state = 'error';
        T2.err = String(e);
      });
  }
  whenLoaded(() => {
    // the village has its roof colours by now: the copies of the original photos are not needed any more (memory on phones)
    if (VILLAGE.ready) GEBDACH.near = GEBDACH.inner = null;
    if (!data || !RATSCHER.ready) return;
    try {
      buildRatscher();
    } catch (e) {
      S.err = String(e);
      console.warn('gebaeude', e);
    }
  });
  S.dispose = () => {
    for (const m of S.meshes) {
      scene.remove(m);
      m.geometry.dispose();
      const k = RATSCHER.bld.indexOf(m);
      if (k >= 2) RATSCHER.bld.splice(k, 1);
    }
    S.meshes.length = 0;
    S.ready = false;
  };
  return S;
})();
window.GEB = GEB;
