// Suhl runtime, in the worker: one building record → geometry. Level 1 (near): facades and roofs in the attribute layout of
// world/village.js (the village's own facade and roof programs draw them – no new shader), ported from gebaeude/gebaeude.js
// building(): door, party walls without windows, a plain base on a slope, roof faces with soffit, fascia, gutters, ridge tiles, the
// parapet of a flat roof, a chimney. Level 2 (far): walls and roof faces with one colour per face, nothing else.
// All positions are metres relative to the tile's centre (model axes: x east, y north; three.js gets x, z, −y), heights absolute.
// Rules for the look (stage 2: quality 0, „nach Regeln“): kind, size, roof, floors, use and era of the record, the old town around
// the Markt; stage 3 replaces them per side after photos (record field S).
import { hh, linC } from '../kern/geo.js';
// styles of world/village.js (ST)
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
  // prefabricated slab blocks (WBS 70 and the like): washed concrete, light renders of the refurbishments after 1990
  SLAB = [
    [0.78, 0.76, 0.7],
    [0.9, 0.88, 0.8],
    [0.86, 0.8, 0.66],
    [0.8, 0.84, 0.86],
    [0.92, 0.9, 0.86],
    [0.84, 0.78, 0.7],
  ].map(c => linC(c, 0.82)),
  CONCRETE = linC([0.62, 0.61, 0.58], 0.82),
  BRICKC = linC([0.62, 0.33, 0.26]);
// ---- the look of one building (b.cx, b.cy relative to the tile; old: 0…1 how much old town – near the Markt) ----
export function styleOf(b, id, old) {
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
  if (b.k === 4 || b.k === 5) return Object.assign(o, { col: CONCRETE, noWin: true, doorW: -1, raised: false });
  if (b.k === 2) {
    if (b.r === 0 && A >= 14 && A <= 120) {
      const brick = k < 0.25;
      return Object.assign(o, {
        style: brick ? ST.BRICK : ST.PLASTER,
        col: brick ? BRICKC : GREY[Math.floor(k2 * GREY.length)],
        noWin: true,
        door: [4, 4, 3, 0, 5, 4][Math.floor(hh(id + 9) * 6)],
        doorW: 2.3,
        raised: false,
        sp: 3.2,
      });
    }
    return Object.assign(o, {
      style: k < 0.6 ? ST.SHED : ST.BRICK,
      col: k < 0.6 ? linC(BOARDS[Math.floor(k2 * 3)], 0.8) : BRICKC,
      sp: 3.2,
      doorW: A < 12 ? 0.9 : 1.2,
    });
  }
  if (b.k === 1) {
    if (A >= 350) return Object.assign(o, { style: ST.HALL, col: SHEET[Math.floor(k * 4)], sp: 4.5 });
    o.style = k < 0.3 ? ST.BARN : k < 0.5 ? ST.BARN_FULL : ST.BRICK;
    o.col = o.style === ST.BRICK ? BRICKC : linC(BOARDS[Math.floor(k2 * 3)], 0.8);
    o.sp = 3.4;
    return o;
  }
  // flat-roofed and several storeys: the slab blocks, schools, offices of 1949–1990 – light, plain windows on every storey
  if (b.r === 0 && b.h >= 9) {
    return Object.assign(o, {
      style: ST.MODERN,
      col: SLAB[Math.floor(k2 * SLAB.length)],
      sp: 3.0 + hh(id + 4) * 0.6,
      frame: 0,
      raised: false,
    });
  }
  // houses: slate-clad and half-timbered in the old town (Suhl's houses carry slate on the weather sides), plaster further out
  const r = k * (0.55 + 0.45 * (1 - old));
  if (old > 0) {
    if (r < 0.14) o.style = ST.SLATE;
    else if (r < 0.34) o.style = ST.SLATE_UP;
    else if (r < 0.4) o.style = ST.FW_UP;
    else if (r < 0.44) o.style = ST.FW;
    else if (r < 0.6) o.style = ST.SLATE_GABLE;
  } else o.style = r < 0.45 ? ST.MODERN : r < 0.62 ? ST.SLATE_GABLE : ST.PLASTER;
  if (o.style === ST.SLATE || o.style === ST.SLATE_UP) o.orn = hh(id + 17) < 0.35;
  if (o.style === ST.PLASTER || o.style === ST.FW_UP) o.shutters = hh(id + 19) < 0.12;
  if (o.style === ST.MODERN) {
    o.col = PASTEL[[0, 4, 4, 9, 1, 5][Math.floor(k2 * 6)]];
    o.sp = 3.1 + hh(id + 4) * 0.4;
    o.frame = 0;
  }
  return byEra(o, b, id, b.typ);
}
// ---- the look from the record's own facade parameters (data contract: fas over the tile's table fat = { mat, col, col2, sock,
// win: [axis spacing, width, height, sill, kind, frame colour, bars], balk, lv, q }) as far as the village's facade program can
// show them: material → style, the wall colour, the axis spacing of the windows. bt: the building type of the record. ----
const MATST = {
  putz: ST.PLASTER,
  platte: ST.MODERN,
  klinker: ST.BRICK,
  schiefer: ST.SLATE,
  fachwerk: ST.FW,
  sandstein: ST.PLASTER,
  sichtbeton: ST.MODERN,
  glas: ST.MODERN,
  blech: ST.HALL,
  holz: ST.SHED,
};
const MATNR = ['putz', 'platte', 'klinker', 'schiefer', 'fachwerk', 'sandstein', 'sichtbeton', 'glas', 'blech', 'holz'];
const MODERN_BT = { hochhaus: 1, punkthochhaus: 1, platte: 1, wbs70: 1, zeile: 1, zeilenbau: 1, block: 1 };
export const hex = h => [
  parseInt(h.slice(1, 3), 16) / 255,
  parseInt(h.slice(3, 5), 16) / 255,
  parseInt(h.slice(5, 7), 16) / 255,
];
const rgbOf = c => (typeof c === 'string' && c.length === 7 ? hex(c) : Array.isArray(c) && c.length >= 3 ? c : null);
// the style of a material word (or its number in the list of tools/suhl/gebaeude/fassade.py) for a building type
export function matStyle(mat, bt, k) {
  let st = MATST[typeof mat === 'number' ? MATNR[mat] : mat];
  if (st === undefined) st = ST.PLASTER;
  if (st === ST.PLASTER && MODERN_BT[bt]) st = ST.MODERN;
  if (st === ST.SHED && k === 1) st = ST.BARN_FULL;
  return st;
}
// what the type and era add to the look the material gave: light surrounds round the windows of the town houses and villas of up to
// 1948 (stucco frames), grey frames on what was built after 1990, white ones on the blocks of 1949–1990 (their plastic windows)
const OLD_BT = { stadthaus: 1, villa: 1, block: 1 };
function byEra(o, b, id, bt) {
  const st = o.style,
    plaster = st === ST.PLASTER || st === ST.SLATE_GABLE;
  if (OLD_BT[bt] && (b.era === 1 || b.era === 2) && plaster) o.surr = hh(id + 43) < 0.8;
  if (b.era === 4 && (st === ST.PLASTER || st === ST.MODERN)) o.frame = hh(id + 47) < 0.55 ? 3 : 0;
  if (b.era === 3 && st === ST.MODERN) o.frame = 0;
  return o;
}
export function styleFa(b, id, fa, bt) {
  const o = styleOf(b, id, 0),
    win = fa.win,
    c = rgbOf(fa.col);
  o.style = matStyle(fa.mat, bt, b.k);
  if (c) o.col = linC(c, 0.82);
  o.orn = o.style === ST.SLATE && hh(id + 17) < 0.35;
  o.shutters = false;
  o.raised = bt === 'stadthaus' || bt === 'villa' ? fa.sock >= 0.5 : false;
  o.typ = b.k === 0 || b.church ? 0 : b.k === 2 ? 2 : 1;
  if (Array.isArray(win)) {
    o.sp = Math.min(6, Math.max(2, win[0]));
    o.frame = win[5] ? 1 : 0;
    o.noWin = false;
  } else {
    o.noWin = true;
    if (b.k !== 2) o.doorW = -1;
  }
  if (bt === 'garage')
    Object.assign(o, { noWin: true, doorW: 2.3, door: [4, 4, 3, 0, 5, 4][Math.floor(hh(id + 9) * 6)], raised: false });
  return byEra(o, b, id, bt);
}
// ---- buffers ----
export function wallBuf() {
  const A = { position: [], normal: [], aW: [], aV: [], aG: [], aD: [], aC: [], aTan: [] },
    I = [];
  return {
    A,
    I,
    // one quad of a facade a → b (outward to the right seen from above), tops ta/tb above the foot z0, down to zLow
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
    out() {
      const o = {};
      for (const [k, a] of Object.entries(A)) o[k] = new Float32Array(a);
      o.index = A.position.length / 3 > 65535 ? new Uint32Array(I) : new Uint16Array(I);
      return o;
    },
  };
}
export function roofBuf() {
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
    out: () => ({
      position: new Float32Array(pos),
      normal: new Float32Array(nrm),
      uv: new Float32Array(uv),
      aR: new Float32Array(rk),
      aTan: new Float32Array(tan),
    }),
  };
}
// the normal of a roof triangle, turned upwards, and its fall (gx, gy)
function face(a, c, d) {
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
  return { v: [a, c, d], n: [nx, ny, nz], gx: nz > 0.05 ? -nx / nz : 0, gy: nz > 0.05 ? -ny / nz : 0 };
}
function inside(ring, x, y) {
  let c = false;
  for (let p = 0, q = ring.length - 1; p < ring.length; q = p++) {
    const [xi, yi] = ring[p],
      [xj, yj] = ring[q];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// ---- level 1: one building into the wall and roof buffers; its wall feet into segs ----
export function building(b, id, z0, WB, RB, segs) {
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
    if (L < 0.05 || b.open) return;
    // a wall may have a material and colour of its own (the record's S[i])
    const own = f[10],
      style = own && own.mat !== undefined ? matStyle(own.mat, b.typ, b.k) : o.style,
      wcol = own && rgbOf(own.col) ? linC(rgbOf(own.col), 0.82) : o.col,
      F = { dx: (bx - ax) / L, dy: (by - ay) / L },
      gable = tA0 > Math.max(t0, t1) + 0.6 && uA0 > 0.3 && uA0 < L - 0.3,
      blind = fl & 1 || o.noWin,
      st = blind && (style === ST.FW || style === ST.FW_UP) ? ST.PLASTER : style,
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
      fl: (gable ? 1 : 0) + (o.shutters ? 2 : 0) + (o.orn ? 4 : 0) + (o.raised ? 8 : 0) + (o.surr ? 64 : 0),
      col: wcol,
      pk,
    };
    let low = Math.min(z0 - 1.5, b.zmin - 0.8);
    if (z0 - b.zmin > 1.2) {
      // an exposed foot on a slope: a plain base of its own without windows
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
  if (o.style === ST.MODERN && b.r === 0 && b.e >= 8 && (BALK[b.typ] || (b.typ === 'block' && b.era === 3)))
    balconies(b, id, z0, RB, o);
  // ---- roof: the faces of the record, each with its own cover and colour (b.tris: corners above the foot, kc = [cover, r, g, b]) ----
  const col = b.trim,
    th = b.k === 0 || b.church ? 0.16 : 0.1,
    T = [],
    V3 = [];
  for (const q of b.tris) {
    const P = q.v.map(p => [p[0], p[1], p[2] + z0]),
      t = face(P[0], P[1], P[2]);
    t.kc = q.kc;
    T.push(t);
    V3.push(P[0], P[1], P[2]);
  }
  const flat = b.r === 0;
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
    RB.tri(t.v[0], t.v[1], t.v[2], n, uvs, t.kc, [ex, ey]);
    // the underside (soffit) where a roof stands free: pitched roofs with their overhang, open roofs (carports)
    if (!flat || b.open)
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
  for (const e of E.values()) {
    const A = e.a,
      C = e.c,
      L = Math.hypot(C[0] - A[0], C[1] - A[1], C[2] - A[2]);
    if (L < 0.05) continue;
    const lh = Math.hypot(C[0] - A[0], C[1] - A[1]) || 1,
      tg = [(C[0] - A[0]) / lh, (C[1] - A[1]) / lh];
    if (e.t.length === 1) {
      const mx = (A[0] + C[0]) / 2,
        my = (A[1] + C[1]) / 2,
        t = e.t[0],
        cx = (t.v[0][0] + t.v[1][0] + t.v[2][0]) / 3,
        cy = (t.v[0][1] + t.v[1][1] + t.v[2][1]) / 3;
      let nx = tg[1],
        ny = -tg[0];
      if (nx * (mx - cx) + ny * (my - cy) < 0) {
        nx = -nx;
        ny = -ny;
      }
      // an inner edge split differently on its two faces is not an outline: a point just outside it lies in the footprint too
      if (inside(ring, mx + nx * 0.25, my + ny * 0.25) && inside(ring, mx - nx * 0.25, my - ny * 0.25)) continue;
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
        RB.quad(A3, C3, [C3[0], C3[1], C[2]], [A3[0], A3[1], A[2]], [-nx, -ny, 0], [18, 0, 0, 0], tg);
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
  if (b.k === 0 && !flat && b.A > 45 && hh(id + 31) < 0.7 && V3.length) {
    let zm = -1e9;
    for (const v of V3) zm = Math.max(zm, v[2]);
    const top = V3.filter(v => v[2] > zm - 0.12);
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
// ---- balconies (stage 2, a rule): the prefabricated and flat-roofed blocks of 1949–1990 carry them on the long side away from the
// street and towards the sun (point blocks on every side facing south or west), from the first floor up, in every other bay of the facade
// program (its bays: (L − 0.6) / spacing, windows in their middles), so each stands before a window: a concrete slab of 1.25 m and a
// parapet of 1 m in a colour of the house – faces of the roof program (kind 4: flat, in the colour given), no new program ----
const BALK = { platte: 1, zeilenbau: 1, punkthochhaus: 1, hochhaus: 1, wbs70: 1 };
const PARA = ['#bdb8ad', '#c4825f', '#d8c48a', '#93a6b6', '#a9b99c', '#e4e0d6', '#b56b5a'].map(c => linC(hex(c), 0.85)),
  SLAB_C = linC([0.6, 0.59, 0.56], 0.85);
function balconies(b, id, z0, RB, o) {
  const sides = [];
  b.F.forEach(f => {
    const [ax, ay, bx, by, , , , , fl, sd] = f,
      L = Math.hypot(bx - ax, by - ay);
    if (fl & 1 || L < 9) return;
    const dx = (bx - ax) / L,
      dy = (by - ay) / L;
    sides.push({ ax, ay, dx, dy, nx: dy, ny: -dx, L, face: -0.5 * dy + 0.87 * dx, sd: Math.min(sd ?? 99, 30) });
  });
  if (!sides.length) return;
  const point = b.typ === 'punkthochhaus' || b.typ === 'hochhaus',
    longest = Math.max(...sides.map(q => q.L)),
    pick = point
      ? sides.filter(q => q.face > -0.25)
      : sides
          .filter(q => q.L >= 0.6 * longest)
          .sort((p, q) => q.sd + 6 * q.face - (p.sd + 6 * p.face)) // away from the street (courtyard, garden), else to the sun
          .slice(0, 1),
    pc = PARA[Math.floor(hh(id + 31) * PARA.length)];
  for (const s of pick) {
    const nb = Math.max(1, Math.floor((s.L - 0.6) / o.sp)),
      bw = s.L / nb,
      w = Math.min(bw * 0.88, 3.4);
    for (let fi = 1; z0 + 0.35 + fi * 2.75 + 2.45 <= z0 + b.e; fi++)
      for (let bi = 1; bi < nb - (nb > 3 ? 1 : 0); bi += 2)
        balcony(RB, s, (bi + 0.5) * bw, w, z0 + 0.35 + fi * 2.75, pc);
  }
}
function balcony(RB, s, uc, w, fb, pc) {
  const D = 1.25,
    T = 0.18,
    PH = 1.0,
    PT = 0.08,
    P = (u, d, z) => [s.ax + s.dx * u + s.nx * d, s.ay + s.dy * u + s.ny * d, z],
    u0 = uc - w / 2,
    u1 = uc + w / 2,
    zt = fb - 0.02,
    zb = zt - T,
    zp = zt + PH,
    di = D - PT,
    kS = [4, ...SLAB_C],
    kP = [4, ...pc],
    tg = [s.dx, s.dy],
    up = [0, 0, 1],
    out = [s.nx, s.ny, 0],
    inn = [-s.nx, -s.ny, 0],
    lf = [-s.dx, -s.dy, 0],
    rt = [s.dx, s.dy, 0],
    uq = (a, c) => [
      [0, 0],
      [a, 0],
      [a, c],
      [0, c],
    ];
  // the slab: underside, front edge, ends, top
  RB.quad(P(u0, 0, zb), P(u1, 0, zb), P(u1, D, zb), P(u0, D, zb), [0, 0, -1], kS, tg, uq(w, D));
  RB.quad(P(u0, D, zb), P(u1, D, zb), P(u1, D, zt), P(u0, D, zt), out, kS, tg, uq(w, T));
  RB.quad(P(u0, 0, zb), P(u0, D, zb), P(u0, D, zt), P(u0, 0, zt), lf, kS, tg, uq(D, T));
  RB.quad(P(u1, 0, zb), P(u1, D, zb), P(u1, D, zt), P(u1, 0, zt), rt, kS, tg, uq(D, T));
  RB.quad(P(u0, 0, zt), P(u1, 0, zt), P(u1, D, zt), P(u0, D, zt), up, kS, tg, uq(w, D));
  // the parapet along the front: its outer face flush with the slab's edge, the inner one, the cap
  RB.quad(P(u0, D, zt), P(u1, D, zt), P(u1, D, zp), P(u0, D, zp), out, kP, tg, uq(w, PH));
  RB.quad(P(u0, di, zt), P(u1, di, zt), P(u1, di, zp), P(u0, di, zp), inn, kP, tg, uq(w, PH));
  RB.quad(P(u0, di, zp), P(u1, di, zp), P(u1, D, zp), P(u0, D, zp), up, kP, tg, uq(w, PT));
  // … and at the two ends
  for (const [u, sg] of [
    [u0, -1],
    [u1, 1],
  ]) {
    const ui = u - sg * PT;
    RB.quad(P(u, 0, zt), P(u, D, zt), P(u, D, zp), P(u, 0, zp), sg < 0 ? lf : rt, kP, tg, uq(D, PH));
    RB.quad(P(ui, 0, zt), P(ui, di, zt), P(ui, di, zp), P(ui, 0, zp), sg < 0 ? rt : lf, kP, tg, uq(di, PH));
    RB.quad(
      P(Math.min(u, ui), 0, zp),
      P(Math.max(u, ui), 0, zp),
      P(Math.max(u, ui), D, zp),
      P(Math.min(u, ui), D, zp),
      up,
      kP,
      tg,
      uq(PT, D)
    );
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
// ---- level 2: walls and roof faces as plain coloured triangles (position, normal, colour – one lean program for the whole city) ----
const ROOFCOL = [
  [0.52, 0.27, 0.2],
  [0.3, 0.3, 0.29],
  [0.45, 0.47, 0.48],
  [0.16, 0.17, 0.19],
  [0.36, 0.35, 0.33],
].map(c => linC(c));
export function farBuf() {
  const pos = [],
    nrm = [],
    col = [];
  const tri = (a, b, c, n, k) => {
    for (const p of [a, b, c]) {
      pos.push(p[0], p[2], -p[1]);
      nrm.push(n[0], n[2], -n[1]);
      col.push(k[0], k[1], k[2]);
    }
  };
  return {
    tri,
    out: () => ({ position: new Float32Array(pos), normal: new Float32Array(nrm), color: new Float32Array(col) }),
  };
}
export function buildingFar(b, z0, FB) {
  const wc = b.st.col,
    low = Math.min(z0 - 1.5, b.zmin - 0.8);
  if (!b.open)
    for (const f of b.F) {
      const [ax, ay, bx, by, t0, uA0, tA0, t1] = f,
        L = Math.hypot(bx - ax, by - ay);
      if (L < 0.05) continue;
      const dx = (bx - ax) / L,
        dy = (by - ay) / L,
        n = [dy, -dx, 0],
        A0 = [ax, ay, low],
        B0 = [bx, by, low],
        A1 = [ax, ay, z0 + t0],
        B1 = [bx, by, z0 + t1];
      FB.tri(A0, B0, B1, n, wc);
      FB.tri(A0, B1, A1, n, wc);
      if (tA0 > Math.max(t0, t1) + 0.6 && uA0 > 0.3 && uA0 < L - 0.3)
        FB.tri(A1, B1, [ax + dx * uA0, ay + dy * uA0, z0 + tA0], n, wc);
    }
  for (const q of b.tris) {
    const P = q.v.map(p => [p[0], p[1], p[2] + z0]),
      t = face(P[0], P[1], P[2]),
      c = q.kc[1] + q.kc[2] + q.kc[3] > 0.02 ? [q.kc[1], q.kc[2], q.kc[3]] : ROOFCOL[Math.min(4, q.kc[0] | 0)],
      // counter-clockwise seen from above
      ccw = (P[1][0] - P[0][0]) * (P[2][1] - P[0][1]) - (P[1][1] - P[0][1]) * (P[2][0] - P[0][0]) > 0;
    if (ccw) FB.tri(P[0], P[1], P[2], t.n, c);
    else FB.tri(P[0], P[2], P[1], t.n, c);
  }
}
