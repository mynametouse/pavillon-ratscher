// ===================== Kloster Veßra: the monastery, the village, the tree nursery – walkable (VESSRA) =====================
// ~9 km west of the garden. A zone of core/kern.js (KERN.zone): built when the walker or the camera comes within 950 m of the place
// (Orte → „Kloster Veßra“, ?szenario=vessra or ?szenario=baumschule, by car), freed beyond 1350 m. Ground: the tiled world
// (welt/welt.js) from the zone's own tile set welt-test/zonen/vessra/ (tools/welt/build.py --plan V,
// which also covers the road there). Buildings: OSM footprints (tools/welt/zone_vessra.py → dist/vessra/ort.json) drawn with the facade
// and roof shaders of the village (world/village.js – no new shader programs): the red sandstone ranges of the monastery and the domain,
// the half-timbered houses of the open-air museum (Hennebergisches Museum), plastered village houses. The Klosteranlage after photos
// (Wikimedia Commons 2017–2025, drone photos by Ermell 2021, plan of the monastery district): the Romanesque church St. Marien as a ruin –
// the twin-towered west front (light ashlar below, red sandstone towers with pyramid roofs), the nave walls with their tall round-arched
// windows and the stumps of the arcade piers, the triumphal arch of the crossing, the transept walls, the foundations of the choir, the
// Henneberg chapel and the south chapel with their apses; the gate church St. Erhard, the monastery wall with its gates, the cemetery.
// The tree nursery Baumschule Kammbach (OSM landuse=plant_nursery): sales yard inside the south gate on the Schulstraße with beds of
// container plants (fruit trees, berry shrubs, ornamental shrubs, climbers, ground cover), a sales hut with its counter, parking, young
// trees in rows on the field – named spots for the garden planner (VESSRA.baumschule). Street lamps, benches, street names on the HUD.
import * as THREE from 'three';
import { BASE, scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, texFile, texFileOf, TEXMAN, whenLoaded } from '../core/assets.js';
import { TREES } from '../garden/trees.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { go } from '../game/player.js';
import { toast } from '../audio/audio.js';
import { RATSCHER } from '../world/ratscher.js';
import { VILLAGE } from '../world/village.js';
import { VPROPS } from '../world/village_props.js';
import { WELT } from './welt.js';
export const VESSRA = (() => {
  const S = { on: false, state: 'idle', meshes: [], bld: [], segs: [], lamps: [], ms: 0, err: '' };
  if (!WELT.on) return S;
  S.on = true;
  // the place: between the monastery and the nursery; the church; load/free distances; the zone's own tile set
  const ORT = [-8850, -300],
    KL = [-8770, -377],
    NEAR = 950,
    FAR = 1350,
    SUB = 'zonen/vessra/',
    ZONE = [ORT[0] - 650, ORT[1] - 650, ORT[0] + 650, ORT[1] + 650],
    inZone = (x, y) => x > ZONE[0] && x < ZONE[2] && y > ZONE[1] && y < ZONE[3];
  S.ORT = ORT;
  S.KL = KL;
  S.SUB = SUB;
  WELT.addSet(SUB); // the tiles of Kloster Veßra and the road there come from this set wherever the camera is (welt/welt.js)
  const URL_ = BASE + 'vessra/ort.json';
  const hh = n => {
    const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    linC = (c, k = 1) => c.map(v => lin(v) * k);
  // ---- the menu place: on the forecourt by the Schleusinger Straße in front of the gate house (the entrance of the museum, beside the
  // gate church), looking through its passage to the church towers ----
  const GATE = [-8750.3, -239.0],
    START = [-8790.6, -272.4],
    yawTo = (x, y, tx, ty) => (Math.atan2(tx - x, ty - y) * 180) / Math.PI;
  S.START = START;
  KERN.spot('vessra', {
    mode: 'walk',
    pos: START,
    z: 0,
    yaw: yawTo(START[0], START[1], -8791, -377),
    pitch: 9,
    label: 'Kloster Veßra (Klostertor)',
  });
  // the nursery: on the Schulstraße in front of its gate, looking into the sales yard (no menu entry; ?szenario=baumschule) – the place
  // and the view are set again from the built yard (nursery(): S.baumschule.eingang)
  const BS = [-8863.3, -171.3];
  KERN.spot('baumschule', {
    mode: 'walk',
    pos: BS,
    z: 0,
    yaw: -97,
    pitch: 2,
    label: 'Baumschule Kammbach (Kloster Veßra)',
  });
  whenLoaded(() => {
    if (RATSCHER.hAt) KERN.spot('vessra', { z: RATSCHER.hAt(START[0], START[1]) });
    if (RATSCHER.hAt) KERN.spot('baumschule', { z: RATSCHER.hAt(BS[0], BS[1]) });
  });
  // start situations (core/kern.js; ?szenario=vessra, ?szenario=baumschule): the place is built once the walker stands there (KERN.zone)
  KERN.scenario('vessra', { label: 'Kloster Veßra, Klostertor', order: 31, run: () => go('vessra') });
  KERN.scenario('baumschule', { label: 'Baumschule Kammbach, Kloster Veßra', order: 32, run: () => go('baumschule') });
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
  // village houses (Panoramax 2025): white, cream, light yellow, light grey, pale apricot, sand
  const PAL = [
    [0.94, 0.93, 0.9],
    [0.93, 0.89, 0.78],
    [0.92, 0.86, 0.64],
    [0.82, 0.82, 0.8],
    [0.93, 0.82, 0.7],
    [0.86, 0.8, 0.68],
  ].map(c => linC(c, 0.82));
  // red sandstone of the monastery ranges and the domain (photos 2022, 2025): purple-red, brownish red, a lighter pink-grey
  const STONE = [
    [0.57, 0.38, 0.33],
    [0.53, 0.36, 0.3],
    [0.61, 0.44, 0.38],
  ].map(c => linC(c, 0.85));
  // the mixed pink and yellow rubble of the gate tower over its red ashlar (photo 2025 „Torgebäude“)
  const RUBBLE = linC([0.74, 0.6, 0.55], 0.85);
  const LIME = linC([0.86, 0.84, 0.78], 0.82), // the lime render of the gate church
    BOARDS = [
      [0.52, 0.48, 0.43],
      [0.45, 0.36, 0.28],
      [0.58, 0.55, 0.5],
    ];
  function styleOf(b, i) {
    const k = hh(i * 3.7 + 1),
      k2 = hh(i + 11.3);
    const o = {
      style: ST.PLASTER,
      col: PAL[Math.floor(k2 * PAL.length)],
      timber: 0,
      frame: hh(i + 5) < 0.8 ? 0 : 1,
      door: Math.floor(hh(i + 9) * 6),
      shut: Math.floor(hh(i + 13) * 3),
      shutters: false,
      orn: false,
      raised: hh(i + 2) < 0.3,
      sp: 2.6 + hh(i + 4) * 0.5,
      typ: b.k === 2 ? 2 : b.k === 1 ? 1 : 0,
    };
    if (b.lm === 'torkirche') return Object.assign(o, { col: LIME, frame: 1, door: 1, raised: false, sp: 3.4, typ: 0 });
    // the Kornhaus: pale pink render with white surrounds (photo 2022), not stone
    if (b.lm === 'kornhaus')
      return Object.assign(o, {
        col: linC([0.93, 0.85, 0.82], 0.82),
        frame: 0,
        door: 1,
        raised: false,
        sp: 2.9,
        typ: 0,
      });
    if (b.m === 'stone')
      return Object.assign(o, {
        col: STONE[Math.floor(k * STONE.length)],
        frame: 1,
        door: 1,
        raised: false,
        sp: b.k === 1 ? 4.6 : 3.3,
      });
    if (b.m === 'fw')
      return Object.assign(o, { style: ST.FW, timber: k < 0.75 ? 0 : 1, frame: 1, sp: 2.4, raised: false });
    if (b.k === 2) return Object.assign(o, { style: ST.SHED, col: linC(BOARDS[Math.floor(k * 3)], 0.8), sp: 3.2 });
    if (b.k === 1)
      return Object.assign(o, {
        style: k < 0.5 ? ST.BARN : ST.HALL,
        col: linC(BOARDS[Math.floor(k2 * 3)], 0.8),
        sp: 4.5,
      });
    o.style = k < 0.35 ? ST.MODERN : k < 0.45 ? ST.SLATE_GABLE : ST.PLASTER;
    if (o.style === ST.MODERN) {
      o.sp = 3.1 + hh(i + 4) * 0.4;
      o.frame = 0;
    }
    if (o.style === ST.PLASTER) o.shutters = hh(i + 19) < 0.1;
    return o;
  }
  // ---- geometry buffers in the attribute layout of world/village.js ----
  function wallBuf() {
    const A = { position: [], normal: [], aW: [], aV: [], aG: [], aD: [], aC: [], aTan: [] },
      I = [];
    return {
      A,
      I,
      // one quad of a facade: a → b (outward to the right seen from above), tops ta/tb above the building's foot z0, from zLow up
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
  // a pitched roof face for a landmark (towers, apses) in the roof shader: tiles (kind 0) with the uv of world/village.js roofs
  function roofTri(RB, a, b, c, col, kind = 0) {
    let nx = (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
      ny = (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
      nz = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l;
    ny /= l;
    nz /= l;
    if (nz < 0) {
      nx = -nx;
      ny = -ny;
      nz = -nz;
    }
    const hz = Math.hypot(nx, ny);
    let ex = 1,
      ey = 0,
      dx = 0,
      dy = 1;
    if (hz > 0.05) {
      dx = nx / hz;
      dy = ny / hz;
      ex = -dy;
      ey = dx;
    }
    const cosS = Math.max(0.2, nz),
      uvs = [a, b, c].map(p => [p[0] * ex + p[1] * ey, hz > 0.05 ? -(p[0] * dx + p[1] * dy) / cosS : p[1]]);
    RB.tri(a, b, c, [nx, ny, nz], uvs, [kind, col[0], col[1], col[2]], [ex, ey]);
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
      if (f[8] & 1 || L < 3 || f[9] > 20) return;
      const sc = f[9] - L * 0.05;
      if (sc < best) {
        best = sc;
        doorF = k;
      }
    });
    if (b.noDoor) doorF = -1;
    let u0 = 0;
    b.F.forEach((f, k) => {
      if (b.noWalls) return;
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
        if (o.typ === 0) {
          du = ((nb >= 3 ? (hh(i + 23) < 0.5 ? 1 : nb - 2) : 0) + 0.5) * bw;
          dw = 1.05;
        } else if (st === ST.HALL) {
          du = L / 2;
          dw = Math.min(5, L * 0.4);
        } else if (L > 3) {
          du = L / 2;
          dw = Math.min(2.8, L * 0.6);
        }
      }
      if (du >= 0) b.doorFac = { ax, ay, dx: F.dx, dy: F.dy, u: du, w: dw };
      const at = {
        u0,
        w: 4 * i + o.typ,
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
      let low = Math.min(z0 - 2.0, (b.zmin !== undefined ? b.zmin : z0) - 1.0);
      if (b.zmin !== undefined && z0 - b.zmin > 1.2) {
        // an exposed foot on a slope: a stone base of its own without windows
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
            col: STONE[1],
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
      S.segs.push([ax, ay, bx, by]);
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
    b.roofT = T;
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
    // a chimney on most village houses with a ridge
    if (b.k === 0 && !flat && !b.lm && !b.old && hh(i + 31) < 0.7 && V3.length) {
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
      toast('Kloster Veßra wird geladen …', 2500);
      const r = await fetch(URL_);
      if (!r.ok) throw new Error('ort.json ' + r.status);
      data = await r.json();
      S.data = data;
      // the ground from the zone's world tiles; without them (not published, or a host without welt-test/) the place stands on the
      // 120 m terrain of world/ratscher.js
      try {
        gz = await WELT.sampler(ZONE[0], ZONE[1], ZONE[2], ZONE[3]);
        S.noTiles = !gz.tiles;
        if (!gz.tiles) gz = null;
      } catch (e) {
        gz = null;
        S.noTiles = true;
      }
      S.loadMs = Math.round(performance.now() - t0);
      S.state = 'data';
    } catch (e) {
      S.state = 'error';
      S.err = String(e);
      console.warn('vessra', e);
    }
  }
  const ground = (x, y) => {
    const z = gz && gz(x, y);
    return z !== undefined && z !== null ? z : RATSCHER.hAt ? RATSCHER.hAt(x, y) : 0;
  };
  S.gz = ground;
  function add(m, name, own) {
    m.name = 'vessra ' + name;
    m.userData.noMerge = true;
    m.userData.own = !!own;
    m.castShadow = false;
    m.receiveShadow = false;
    scene.add(m);
    S.meshes.push(m);
    return m;
  }
  // materials: vertex colours (shared with the props of the village and Schleusingen), and stone – the programs of the paving of the
  // village centre (world/village_props.js texMat: vertex colour × a photo with mean 1, uv in metres): flagstones (1.5 m) for rubble
  // walls, pavers (1.3 m) with the uv scaled to a third for ashlar – courses of about 33 cm, blocks of a metre (the church)
  const propMat = () =>
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, envMapIntensity: 0.7 });
  function stoneMat(name = 'flagstone', tile = 1.5) {
    const t = TEXMAN[name] ? texFile(texFileOf(name, 'col'), true).tex : null,
      m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, envMapIntensity: 0.6 });
    if (t) {
      m.defines = { USE_UV: '' };
      m.onBeforeCompile = sh => {
        sh.uniforms.tKit = { value: t };
        sh.fragmentShader =
          'uniform sampler2D tKit;\n' +
          sh.fragmentShader.replace(
            '#include <map_fragment>',
            `#include <map_fragment>
      diffuseColor.rgb *= texture2D( tKit, vUv * ${(1 / tile).toFixed(4)} ).rgb / max( textureLod( tKit, vec2( 0.5 ), 12.0 ).rgb, vec3( 0.01 ) );`
          );
      };
    }
    m.customProgramCacheKey = () => 'v16e-kit' + tile;
    return m;
  }
  // the geometry of a kit with its uv scaled (the ashlar: the paver photo at three times its size)
  const scaledGeo = (Kx, f) => {
    const g = Kx.geo(),
      uv = g.attributes.uv;
    for (let i = 0; i < uv.array.length; i++) uv.array[i] *= f;
    return g;
  };
  S.dispose = () => {
    for (const m of S.meshes) {
      scene.remove(m);
      if (!m.userData.sharedGeo) m.geometry.dispose();
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
    S.pool = null;
    S.seats = [];
    S.baumschule = null;
    if (WELT.setPads) WELT.setPads('vessra', []);
    if (WELT.setOverlay && S.overlayTex && WELT.overlay && WELT.overlay() === S.overlayTex) WELT.setOverlay(null);
    S.overlayTex = null;
    data = null;
    S.data = null;
    gz = null;
    S.state = 'idle';
    pc = [1e9, 0, null];
    markDirty(true);
  };
  // ---- small geometry helpers on the kit of world/village_props.js (site coordinates, uv in metres, vertex colours) ----
  // a convex polygon facing `out` (the winding is fixed here), uv from a function of the point
  function poly(K, pts, out, col, uvf) {
    const a = pts[0],
      b = pts[1],
      c = pts[2],
      n = [
        (b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1]),
        (b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2]),
        (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]),
      ],
      ps = n[0] * out[0] + n[1] * out[1] + n[2] * out[2] < 0 ? pts.slice().reverse() : pts;
    for (let k = 1; k + 1 < ps.length; k++) K.tri(ps[0], ps[k], ps[k + 1], col, uvf(ps[0]), uvf(ps[k]), uvf(ps[k + 1]));
  }
  // a stone wall on the centre line a → b from zb to zt (a number, or [at a, at b]), thickness th, with openings
  // holes: { u (centre along the wall), w, z0 (sill; ≤ zb + 0.3 = a door), zs (spring of the arch), r (arch radius, 0 = flat) };
  // collision: the outline of the solid parts (doors stay open); colour per piece slightly varied
  function stoneWall(K, a, b, zb, zt, th, holes, col, o = {}) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (L < 0.1) return;
    const d = [(b[0] - a[0]) / L, (b[1] - a[1]) / L],
      n = [d[1], -d[0]],
      top = u => (Array.isArray(zt) ? zt[0] + ((zt[1] - zt[0]) * u) / L : zt),
      W = (u, s, z) => [a[0] + d[0] * u + n[0] * s * (th / 2), a[1] + d[1] * u + n[1] * s * (th / 2), z],
      uvF = s => p => [((p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1]) * s, p[2]],
      uvT = p => [(p[0] - a[0]) * d[0] + (p[1] - a[1]) * d[1], (p[0] - a[0]) * n[0] + (p[1] - a[1]) * n[1]];
    const hs = (holes || []).filter(h => h.u - h.w / 2 > 0.05 && h.u + h.w / 2 < L - 0.05).sort((p, q) => p.u - q.u),
      cuts = [0];
    for (const h of hs) cuts.push(h.u - h.w / 2, h.u + h.w / 2);
    cuts.push(L);
    const face = (s, ptsUZ) =>
      poly(
        K,
        ptsUZ.map(([u, z]) => W(u, s, z)),
        [n[0] * s, n[1] * s, 0],
        col,
        uvF(s)
      );
    const across = (u0, z0, u1, z1, out) =>
      poly(K, [W(u0, -1, z0), W(u1, -1, z1), W(u1, 1, z1), W(u0, 1, z0)], out, col, p => uvT(p).map(v => v));
    for (let k = 0; k + 1 < cuts.length; k++) {
      const u0 = cuts[k],
        u1 = cuts[k + 1],
        h = hs.find(q => Math.abs(q.u - (u0 + u1) / 2) < q.w / 2 - 1e-6);
      if (u1 - u0 < 1e-3) continue;
      if (!h) {
        for (const s of [-1, 1])
          face(s, [
            [u0, zb],
            [u1, zb],
            [u1, top(u1)],
            [u0, top(u0)],
          ]);
        continue;
      }
      // the opening: the wall below the sill, the reveals, the arch and the wall over it
      const r = Math.min(h.r || 0, h.w / 2),
        zA = h.zs + r; // the crown
      if (h.z0 > zb + 0.01) {
        for (const s of [-1, 1])
          face(s, [
            [u0, zb],
            [u1, zb],
            [u1, h.z0],
            [u0, h.z0],
          ]);
        across(u0, h.z0, u1, h.z0, [0, 0, 1]);
      }
      for (const [uu, sg] of [
        [u0, 1],
        [u1, -1],
      ])
        poly(
          K,
          [W(uu, -1, h.z0), W(uu, 1, h.z0), W(uu, 1, h.zs), W(uu, -1, h.zs)],
          [d[0] * sg, d[1] * sg, 0],
          col,
          p => [uvT(p)[1], p[2]]
        );
      const seg = r > 0.05 ? 8 : 1,
        pa = k2 => {
          if (r <= 0.05) return k2 === 0 ? [u1, h.zs] : [u0, h.zs];
          const t = (k2 / seg) * Math.PI;
          return [h.u + Math.cos(t) * r, h.zs + Math.sin(t) * r];
        };
      for (let q = 0; q < seg; q++) {
        const [ua, za] = pa(q),
          [ub, zb2] = pa(q + 1),
          tA = Math.max(top(ua), zA + 0.05),
          tB = Math.max(top(ub), zA + 0.05);
        for (const s of [-1, 1])
          face(s, [
            [ub, zb2],
            [ua, za],
            [ua, tA],
            [ub, tB],
          ]);
        across(ub, zb2, ua, za, [0, 0, -1]);
      }
      if (r > 0.05 && r < h.w / 2 - 0.01) {
        // a flat lintel beside a narrow arch: fill the shoulders
        for (const s of [-1, 1]) {
          face(s, [
            [u0, h.zs],
            [h.u - r, h.zs],
            [h.u - r, top(h.u - r)],
            [u0, top(u0)],
          ]);
          face(s, [
            [h.u + r, h.zs],
            [u1, h.zs],
            [u1, top(u1)],
            [h.u + r, top(h.u + r)],
          ]);
        }
      }
    }
    // the top (a sloping coping where zt varies), the ends
    across(0, top(0), L, top(L), [0, 0, 1]);
    if (o.ends !== false)
      for (const [uu, sg] of [
        [0, -1],
        [L, 1],
      ])
        poly(
          K,
          [W(uu, -1, zb), W(uu, 1, zb), W(uu, 1, top(uu)), W(uu, -1, top(uu))],
          [d[0] * sg, d[1] * sg, 0],
          col,
          p => [uvT(p)[1], p[2]]
        );
    // collision: both faces between the doors, closed at the ends
    if (o.collide !== false) {
      const doors = hs.filter(h => h.z0 <= zb + 0.35).map(h => [h.u - h.w / 2, h.u + h.w / 2]),
        spans = [];
      let s0 = 0;
      for (const [p, q] of doors) {
        spans.push([s0, p]);
        s0 = q;
      }
      spans.push([s0, L]);
      for (const [p, q] of spans) {
        if (q - p < 0.05) continue;
        const A1 = W(p, -1, 0),
          B1 = W(q, -1, 0),
          A2 = W(p, 1, 0),
          B2 = W(q, 1, 0);
        S.segs.push(
          [A1[0], A1[1], B1[0], B1[1]],
          [A2[0], A2[1], B2[0], B2[1]],
          [A1[0], A1[1], A2[0], A2[1]],
          [B1[0], B1[1], B2[0], B2[1]]
        );
      }
    }
  }
  // a dark window or blind arch on a wall face: lower left corner on the wall line (ox, oy), along (ex, ey); out = (ey, -ex)
  function arch(K, ox, oy, ex, ey, z0, w, h, col, frame, pointed) {
    const p = (u, v, o = 0.04) => [ox + ex * u + ey * o, oy + ey * u - ex * o, z0 + v],
      q = (u, v) => p(u, v, 0.08),
      r = w / 2,
      FR = frame || linC([0.78, 0.74, 0.66]),
      hs = pointed ? h - w * 0.85 : h - r;
    K.quad(p(-r - 0.12, -0.12), p(r + 0.12, -0.12), p(r + 0.12, hs), p(-r - 0.12, hs), FR);
    K.quad(q(-r, 0), q(r, 0), q(r, hs), q(-r, hs), col);
    if (pointed) {
      K.tri(p(-r - 0.12, hs), p(r + 0.12, hs), p(0, h + 0.14), FR);
      K.tri(q(-r, hs), q(r, hs), q(0, h), col);
      return;
    }
    for (let k = 0; k < 6; k++) {
      const a0 = (k / 6) * Math.PI,
        a1 = ((k + 1) / 6) * Math.PI;
      K.tri(
        p(0, hs),
        p(Math.cos(a0) * (r + 0.12), hs + Math.sin(a0) * (r + 0.12)),
        p(Math.cos(a1) * (r + 0.12), hs + Math.sin(a1) * (r + 0.12)),
        FR
      );
      K.tri(q(0, hs), q(Math.cos(a0) * r, hs + Math.sin(a0) * r), q(Math.cos(a1) * r, hs + Math.sin(a1) * r), col);
    }
  }
  const circleSegs = (x, y, r, n, a0 = 0, a1 = Math.PI * 2) => {
    const out = [];
    for (let k = 0; k < n; k++) {
      const t0 = a0 + ((a1 - a0) * k) / n,
        t1 = a0 + ((a1 - a0) * (k + 1)) / n;
      out.push([x + Math.cos(t0) * r, y + Math.sin(t0) * r, x + Math.cos(t1) * r, y + Math.sin(t1) * r]);
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
  // ---- the church St. Marien: a ruin since the fire of 1939 (photos 2017–2025, drone photos 2021, the plan of the district) ----
  // frame: u along the nave eastwards from the west portal, v to the north (from the OSM walls and towers)
  function kirche(KS, K, RB) {
    const C = data.kirche;
    if (!C || !C.north || !C.south || !C.portal || !C.towers || C.towers.length < 2) return;
    const N0 = [C.north[0], C.north[1]],
      N1 = [C.north[C.north.length - 2], C.north[C.north.length - 1]],
      Ln = Math.hypot(N1[0] - N0[0], N1[1] - N0[1]),
      ex = [(N1[0] - N0[0]) / Ln, (N1[1] - N0[1]) / Ln],
      en = [-ex[1], ex[0]],
      O = C.portal,
      U = (x, y) => [(x - O[0]) * ex[0] + (y - O[1]) * ex[1], (x - O[0]) * en[0] + (y - O[1]) * en[1]],
      Q = (u, v) => [O[0] + ex[0] * u + en[0] * v, O[1] + ex[1] * u + en[1] * v],
      Qz = (u, v, z) => [...Q(u, v), z],
      a = Math.atan2(ex[1], ex[0]);
    const vN = U(...N0)[1],
      S0 = [C.south[0], C.south[1]],
      S1 = [C.south[C.south.length - 2], C.south[C.south.length - 1]],
      vS = U(...S0)[1],
      vM = (vN + vS) / 2,
      uX = (U(...N1)[0] + U(...S1)[0]) / 2; // the crossing (the nave walls end at the transept)
    const tw = C.towers.map(r => {
      const us = [],
        vs = [];
      for (let k = 0; k < r.length; k += 2) {
        const [u, v] = U(r[k], r[k + 1]);
        us.push(u);
        vs.push(v);
      }
      return { u0: Math.min(...us), u1: Math.max(...us), v0: Math.min(...vs), v1: Math.max(...vs) };
    });
    tw.sort((p, q) => q.v0 - p.v0); // north first
    const uW = Math.max(tw[0].u1, tw[1].u1), // the east face of the west block
      vT0 = tw[1].v0,
      vT1 = tw[0].v1;
    let z = 1e9;
    for (const [u, v] of [
      [0.5, vM],
      [uW / 2, vM],
      [(uW + uX) / 2, vM],
      [uX, vM],
      [uX + 5, vM],
    ])
      z = Math.min(z, ground(...Q(u, v)));
    const zb = z - 0.6,
      LIGHT = linC([0.78, 0.75, 0.68]),
      RED = linC([0.64, 0.43, 0.38]),
      RED2 = linC([0.58, 0.39, 0.35]),
      DARK = linC([0.05, 0.045, 0.045]),
      ROOF = [0.38, 0.28, 0.24].map(lin);
    S.kirche = { O, ex, en, uX, uW, vN, vS, vM, z, Q };
    // -- the west block: light ashlar to the cornice at 12.6 m, the passage behind the portal (3.2 m wide) --
    const zc = z + 12.6,
      vp = 1.6;
    const block = (u0, u1, v0, v1, z0, z1, col, bottom) => {
      const cu = (u0 + u1) / 2,
        cv = (v0 + v1) / 2,
        [x, y] = Q(cu, cv);
      KS.box(x, y, z0, u1 - u0, v1 - v0, z1 - z0, a, col, bottom);
    };
    block(0, uW, vT0, vM - vp, zb, zc, LIGHT);
    block(0, uW, vM + vp, vT1, zb, zc, LIGHT);
    block(0, uW, vM - vp, vM + vp, z + 5.3, zc, LIGHT, true); // over the passage (a flat vault)
    S.segs.push(...boxSegs(...Q(uW / 2, (vT0 + vM - vp) / 2), uW, vM - vp - vT0, a));
    S.segs.push(...boxSegs(...Q(uW / 2, (vM + vp + vT1) / 2), uW, vT1 - vM - vp, a));
    // the portal: a round arch in a stepped frame over the passage, filled above the arch
    for (let k = 0; k < 7; k++) {
      const t0 = (k / 7) * Math.PI,
        t1 = ((k + 1) / 7) * Math.PI,
        p0 = [vM + Math.cos(t0) * vp, z + 3.7 + Math.sin(t0) * vp],
        p1 = [vM + Math.cos(t1) * vp, z + 3.7 + Math.sin(t1) * vp];
      poly(
        KS,
        [Qz(-0.02, p1[0], p1[1]), Qz(-0.02, p0[0], p0[1]), Qz(-0.02, p0[0], z + 5.35), Qz(-0.02, p1[0], z + 5.35)],
        [-ex[0], -ex[1], 0],
        LIGHT,
        p => [U(p[0], p[1])[1], p[2]]
      );
    }
    for (let s = 0; s < 3; s++) {
      // the stepped jambs and archivolts of the portal (light, a little proud of the wall)
      const r = vp + 0.25 + s * 0.28,
        o = -0.06 - s * 0.05;
      for (const sg of [-1, 1]) {
        const [x, y] = Q(o + 0.1, vM + sg * (r - 0.12));
        KS.box(x, y, z, 0.24, 0.24, 3.7, a, LIGHT);
      }
      for (let k = 0; k < 8; k++) {
        const t0 = (k / 8) * Math.PI,
          t1 = ((k + 1) / 8) * Math.PI;
        poly(
          KS,
          [
            Qz(o, vM + Math.cos(t0) * r, z + 3.7 + Math.sin(t0) * r),
            Qz(o, vM + Math.cos(t1) * r, z + 3.7 + Math.sin(t1) * r),
            Qz(o, vM + Math.cos(t1) * (r - 0.24), z + 3.7 + Math.sin(t1) * (r - 0.24)),
            Qz(o, vM + Math.cos(t0) * (r - 0.24), z + 3.7 + Math.sin(t0) * (r - 0.24)),
          ],
          [-ex[0], -ex[1], 0],
          LIGHT,
          p => [U(p[0], p[1])[1], p[2]]
        );
      }
    }
    // pilaster strips and the two friezes of small round arches on the west face (photo from the south-west 2025)
    for (const v of [vT0 + 0.35, vM - vp - 0.9, vM + vp + 0.9, vT1 - 0.35]) {
      const [x, y] = Q(-0.08, v);
      KS.box(x, y, z, 0.18, 0.6, 12.4, a, LIGHT);
    }
    for (const zz of [z + 7.1, z + 12.1]) {
      const [x, y] = Q(-0.12, vM);
      KS.box(x, y, zz, 0.26, vT1 - vT0 + 0.3, 0.3, a, LIGHT);
      for (let v = vT0 + 0.5; v < vT1 - 0.3; v += 0.7)
        arch(K, ...Q(-0.14, v), -en[0], -en[1], zz - 0.45, 0.42, 0.42, linC([0.5, 0.48, 0.44]));
    }
    // -- the towers: red sandstone over the light block, three storeys between cornices – two tall pointed blind arches, the clock
    // (north tower, west and east), a pointed twin window –, pyramid roofs of dark tiles with a rod (photos 2025 from the south-west
    // and from the nave) --
    const zt = zc + 16.2,
      z1 = zc + 5.2,
      z2 = zc + 10.8;
    for (const [ti, t] of tw.entries()) {
      const cu = (t.u0 + t.u1) / 2,
        cv = (t.v0 + t.v1) / 2,
        su = t.u1 - t.u0,
        sv = t.v1 - t.v0,
        [x, y] = Q(cu, cv);
      KS.box(x, y, zc, su, sv, zt - zc, a, ti ? RED2 : RED);
      for (const zz of [zc, z1, z2]) KS.box(x, y, zz - 0.05, su + 0.3, sv + 0.3, 0.3, a, LIGHT); // the cornices
      KS.box(x, y, zt - 0.1, su + 0.5, sv + 0.5, 0.35, a, RED); // the eaves course
      for (let f = 0; f < 4; f++) {
        const fa = a + (f * Math.PI) / 2,
          fx = Math.cos(fa),
          fy = Math.sin(fa),
          half = f % 2 ? sv / 2 : su / 2,
          wd = f % 2 ? su : sv,
          ox = x + fx * (half + 0.02),
          oy = y + fy * (half + 0.02),
          ax = -fy,
          ay = fx;
        for (const k of [-1, 1])
          arch(
            KS,
            ox + ax * k * (wd / 4.4),
            oy + ay * k * (wd / 4.4),
            ax,
            ay,
            zc + 0.6,
            wd / 2.6,
            4.1,
            RED2,
            RED,
            true
          );
        for (const k of [-1, 1])
          arch(K, ox + ax * k * 0.36, oy + ay * k * 0.36, ax, ay, z2 + 1.6, 0.52, 2.3, DARK, RED, true);
        arch(KS, ox, oy, ax, ay, z2 + 1.35, 1.6, 3.0, RED2, LIGHT, true);
        if (ti === 0 && (f === 0 || f === 2)) {
          // the clock: a dark face with a gold star (photo from the nave)
          K.disc(ox + fx * 0.06, oy + fy * 0.06, zc + 8.0, fx, fy, 0.75, linC([0.12, 0.2, 0.32]), 16, false);
          K.disc(ox + fx * 0.09, oy + fy * 0.09, zc + 8.0, fx, fy, 0.42, linC([0.85, 0.66, 0.25]), 8, false);
        }
      }
      // the pyramid roof (tiles in the roof shader), its rod and ball
      const r0 = 0.35,
        cs = [
          [t.u0 - r0, t.v0 - r0],
          [t.u1 + r0, t.v0 - r0],
          [t.u1 + r0, t.v1 + r0],
          [t.u0 - r0, t.v1 + r0],
        ].map(([u, v]) => Qz(u, v, zt + 0.2)),
        apex = Qz(cu, cv, zt + 7.4);
      for (let k = 0; k < 4; k++) roofTri(RB, cs[k], cs[(k + 1) % 4], apex, ROOF);
      K.cyl(x, y, zt + 7.2, zt + 8.8, 0.05, 0.04, 6, linC([0.3, 0.3, 0.3]));
      K.ball(x, y, zt + 8.2, 0.16, linC([0.75, 0.6, 0.25]), 6);
    }
    // between the towers: a low gallery of small arches and a gabled roof over the west block
    {
      const v0 = tw[1].v1,
        v1 = tw[0].v0,
        [x, y] = Q(uW / 2, (v0 + v1) / 2);
      KS.box(x, y, zc, uW - 0.6, v1 - v0, 1.6, a, RED);
      for (let v = v0 + 0.45; v < v1 - 0.3; v += 0.62)
        arch(K, ...Q(0.27, v), -en[0], -en[1], zc + 0.2, 0.36, 1.1, DARK, RED);
      // on the side of the nave the gallery is timber-framed with a row of windows (photo from the nave 2025)
      const WD = linC([0.3, 0.2, 0.13]),
        [gx, gy] = Q(uW - 0.33, (v0 + v1) / 2);
      K.box(gx, gy, zc - 0.05, 0.12, v1 - v0, 1.7, a, WD);
      for (let v = v0 + 0.5; v < v1 - 0.4; v += 0.75) {
        const p0 = Qz(uW - 0.26, v, zc + 0.55),
          p1 = Qz(uW - 0.26, v + 0.5, zc + 0.55),
          p2 = Qz(uW - 0.26, v + 0.5, zc + 1.3),
          p3 = Qz(uW - 0.26, v, zc + 1.3);
        poly(K, [p0, p1, p2, p3], [ex[0], ex[1], 0], linC([0.12, 0.16, 0.2]), p => [0, p[2]]);
      }
      const g0 = Qz(0.2, v0, zc + 1.6),
        g1 = Qz(uW - 0.2, v0, zc + 1.6),
        g2 = Qz(uW - 0.2, v1, zc + 1.6),
        g3 = Qz(0.2, v1, zc + 1.6),
        r0 = Qz(0.2, (v0 + v1) / 2, zc + 4.4),
        r1 = Qz(uW - 0.2, (v0 + v1) / 2, zc + 4.4);
      roofTri(RB, g0, g1, r1, ROOF);
      roofTri(RB, g0, r1, r0, ROOF);
      roofTri(RB, g3, r0, r1, ROOF);
      roofTri(RB, g3, r1, g2, ROOF);
      poly(KS, [g0, g3, r0], [-ex[0], -ex[1], 0], RED, p => [U(p[0], p[1])[1], p[2]]);
    }
    // -- the nave: the outer walls stand with their tall round-arched windows; of the arcades only the pier bases are left --
    const winsAt = (L0, L1, h0) => {
      const out = [];
      for (let u = L0 + 3.0; u < L1 - 2.0; u += 4.4) out.push({ u, w: 1.15, z0: h0, zs: h0 + 2.6, r: 0.58 });
      return out;
    };
    {
      const Ls = Math.hypot(S1[0] - S0[0], S1[1] - S0[1]);
      stoneWall(KS, N0, N1, zb, z + 10.2, 1.15, winsAt(0, Ln, z + 5.3), RED);
      const ws = winsAt(0, Ls, z + 5.0);
      ws.push({ u: 2.6, w: 1.8, z0: zb, zs: z + 2.3, r: 0.9 }); // the door to the cloister
      stoneWall(KS, S0, S1, zb, z + 9.6, 1.15, ws, RED2);
    }
    for (const sg of [-1, 1])
      for (let u = uW + 3.4, k = 0; u < uX - 1.5; u += 4.3, k++) {
        const [x, y] = Q(u, vM + sg * 4.4),
          last = u + 4.3 >= uX - 1.5,
          h = last ? 7.2 : 0.9 + hh(k * 3 + sg) * 0.7;
        KS.box(x, y, zb, 1.35, 1.35, h + (z - zb), a, k % 2 ? RED : RED2);
        KS.box(x, y, z + h, 1.55, 1.55, 0.18, a, RED);
        S.segs.push(...boxSegs(x, y, 1.4, 1.4, a));
      }
    // -- the crossing: the wall with the triumphal arch and the two aisle arches; the transept walls around --
    const tv = [];
    if (C.transept) for (let k = 0; k < C.transept.length; k += 2) tv.push(U(C.transept[k], C.transept[k + 1])[1]);
    {
      const vA = Math.min(vS - 0.6, ...tv),
        vB = Math.max(vN + 0.6, ...tv),
        A1 = Q(uX, vA),
        B1 = Q(uX, vB),
        mid = vM - vA;
      stoneWall(
        KS,
        A1,
        B1,
        zb,
        z + 15.6,
        1.4,
        [
          { u: mid, w: 8.6, z0: zb, zs: z + 8.6, r: 4.3 },
          { u: mid - 6.9, w: 3.2, z0: zb, zs: z + 4.6, r: 1.6 },
          { u: mid + 6.9, w: 3.2, z0: zb, zs: z + 4.6, r: 1.6 },
        ],
        RED,
        { ends: true }
      );
    }
    if (C.transept && C.transept.length >= 8) {
      // the ring of the transept (OSM): its east, north and south walls stand to the eaves, windows high up
      const R = C.transept,
        pts = [];
      for (let k = 0; k < R.length; k += 2) pts.push([R[k], R[k + 1]]);
      for (let k = 0; k < pts.length; k++) {
        const p = pts[k],
          q = pts[(k + 1) % pts.length],
          L = Math.hypot(q[0] - p[0], q[1] - p[1]),
          [um] = U((p[0] + q[0]) / 2, (p[1] + q[1]) / 2);
        if (L < 3 || um < uX + 1.5) continue; // the west side is the wall with the arches
        const east = U(p[0], p[1])[0] > uX + 6 && U(q[0], q[1])[0] > uX + 6,
          holes = [];
        if (east) {
          holes.push(
            { u: L / 2 - 4.2, w: 1.2, z0: z + 9.4, zs: z + 11.6, r: 0.6 },
            { u: L / 2 + 4.2, w: 1.2, z0: z + 9.4, zs: z + 11.6, r: 0.6 }
          );
        } else holes.push({ u: L / 2, w: 1.2, z0: z + 9.0, zs: z + 11.4, r: 0.6 });
        stoneWall(KS, p, q, zb, z + 14.2, 1.3, holes, k % 2 ? RED : RED2);
        if (east) {
          // the walled-up arch of the old choir on the inner face (a shade darker, framed – photo of the nave from the west 2025)
          const mx = (p[0] + q[0]) / 2 - ex[0] * 0.62,
            my = (p[1] + q[1]) / 2 - ex[1] * 0.62;
          arch(KS, mx, my, -en[0], -en[1], z, 6.4, 9.6, RED2, RED);
        }
      }
      // the foundations of the choir and its apse east of the transept, low in the grass (drone photo 2021)
      const E0 = U(...pts.reduce((m, p) => (U(p[0], p[1])[0] > U(m[0], m[1])[0] ? p : m), pts[0]))[0];
      const ue = E0 + 0.6,
        zf = z + 0.55;
      for (const sg of [-1, 1]) stoneWall(KS, Q(ue, vM + sg * 5.2), Q(ue + 7.5, vM + sg * 5.2), zb, zf, 0.9, [], RED2);
      for (let k = 0; k < 9; k++) {
        const t0 = -Math.PI / 2 + (k / 9) * Math.PI,
          t1 = -Math.PI / 2 + ((k + 1) / 9) * Math.PI;
        stoneWall(
          KS,
          Q(ue + 7.5 + Math.cos(t0) * 5.2, vM + Math.sin(t0) * 5.2),
          Q(ue + 7.5 + Math.cos(t1) * 5.2, vM + Math.sin(t1) * 5.2),
          zb,
          zf,
          0.9,
          [],
          RED2,
          { collide: false }
        );
      }
    }
  }
  // ---- the apses of the two chapels: half round, the Henneberg one plastered white under a cone of tiles (photo 2025) ----
  function apses(KS, K, RB) {
    const chapels = S.bld.filter(b => b.lm === 'henneberg' || b.lm === 'suedkapelle');
    for (const b of S.bld.filter(q => q.lm === 'apsis')) {
      if (!chapels.length) break;
      const ch = chapels.reduce((m, q) =>
        Math.hypot(q.cx - b.cx, q.cy - b.cy) < Math.hypot(m.cx - b.cx, m.cy - b.cy) ? q : m
      );
      let dx = b.cx - ch.cx,
        dy = b.cy - ch.cy;
      const l = Math.hypot(dx, dy) || 1;
      dx /= l;
      dy /= l;
      const px = -dy,
        py = dx;
      let s0 = 1e9,
        s1 = -1e9,
        w0 = 1e9,
        w1 = -1e9;
      for (let k = 0; k < b.f.length; k += 2) {
        const rx = b.f[k] - ch.cx,
          ry = b.f[k + 1] - ch.cy,
          s = rx * dx + ry * dy,
          w = rx * px + ry * py;
        s0 = Math.min(s0, s);
        s1 = Math.max(s1, s);
        w0 = Math.min(w0, w);
        w1 = Math.max(w1, w);
      }
      const r = Math.min((w1 - w0) / 2, Math.max(1.2, s1 - s0)),
        wc = (w0 + w1) / 2,
        cx = ch.cx + dx * s0 + px * wc,
        cy = ch.cy + dy * s0 + py * wc,
        z0 = ch.z0 - 0.4,
        white = ch.lm === 'henneberg',
        col = white ? linC([0.93, 0.92, 0.88]) : STONE[0],
        h = white ? 4.6 : 3.4,
        a0 = Math.atan2(dy, dx) - Math.PI / 2,
        n = 10,
        Kx = white ? K : KS;
      for (let k = 0; k < n; k++) {
        const t0 = a0 + (k / n) * Math.PI,
          t1 = a0 + ((k + 1) / n) * Math.PI,
          A = [cx + Math.cos(t0) * r, cy + Math.sin(t0) * r],
          B = [cx + Math.cos(t1) * r, cy + Math.sin(t1) * r],
          tm = (t0 + t1) / 2;
        poly(
          Kx,
          [
            [...A, z0],
            [...B, z0],
            [...B, z0 + h + 0.4],
            [...A, z0 + h + 0.4],
          ],
          [Math.cos(tm), Math.sin(tm), 0],
          col,
          p => [Math.atan2(p[1] - cy, p[0] - cx) * r, p[2]]
        );
        roofTri(
          RB,
          [cx + Math.cos(t0) * (r + 0.3), cy + Math.sin(t0) * (r + 0.3), z0 + h + 0.4],
          [cx + Math.cos(t1) * (r + 0.3), cy + Math.sin(t1) * (r + 0.3), z0 + h + 0.4],
          [cx, cy, z0 + h + 0.4 + r * (white ? 1.25 : 0.9)],
          [0.66, 0.33, 0.22].map(lin)
        );
      }
      if (white) {
        // a small window with a sandstone frame (photo 2025)
        const tm = a0 + Math.PI * 0.62;
        arch(
          K,
          cx + Math.cos(tm) * (r + 0.01),
          cy + Math.sin(tm) * (r + 0.01),
          -Math.sin(tm),
          Math.cos(tm),
          z0 + 2.2,
          0.6,
          1.0,
          linC([0.12, 0.14, 0.16]),
          linC([0.75, 0.62, 0.4])
        );
      }
      S.segs.push(...circleSegs(cx, cy, r, 8, a0, a0 + Math.PI));
    }
  }
  // ---- the gate church St. Erhard: lime render, pointed windows, sandstone quoins at the corners (photos 2019, 2025) ----
  function torkirche(K, b) {
    const QU = linC([0.6, 0.6, 0.57]);
    let k = 0;
    for (const f of b.F) {
      const L = Math.hypot(f[2] - f[0], f[3] - f[1]),
        dx = (f[2] - f[0]) / L,
        dy = (f[3] - f[1]) / L,
        nx = dy,
        ny = -dx;
      if (L < 2) continue;
      // quoins: alternating long and short blocks up the corner at the facade's start
      for (let zz = 0, j = 0; zz < f[4] - 0.4; zz += 0.55, j++) {
        const w = j % 2 ? 0.45 : 0.75;
        K.box(
          f[0] + dx * (w / 2) + nx * 0.03,
          f[1] + dy * (w / 2) + ny * 0.03,
          b.z0 + zz,
          w,
          0.08,
          0.5,
          Math.atan2(dy, dx),
          QU
        );
      }
      if (L > 8) {
        const n = Math.max(2, Math.floor(L / 3.8));
        for (let i = 0; i < n; i++) {
          const u = ((i + 0.5) * L) / n;
          if (k === 0 && i === 1) {
            // the door on the long side (photo 2019): a sandstone frame, a wooden leaf
            arch(
              K,
              f[0] + dx * u + nx * 0.02,
              f[1] + dy * u + ny * 0.02,
              dx,
              dy,
              b.z0 - 0.05,
              1.05,
              2.35,
              linC([0.28, 0.13, 0.07]),
              QU
            );
            continue;
          }
          arch(
            K,
            f[0] + dx * u + nx * 0.02,
            f[1] + dy * u + ny * 0.02,
            dx,
            dy,
            b.z0 + 2.4,
            0.95,
            3.0,
            linC([0.1, 0.12, 0.15]),
            QU,
            true
          );
        }
        k++;
      }
    }
  }
  // ---- landmarks among the OSM buildings: no house windows or doors from the facade shader (their openings are props) ----
  const LM_PREP = {
    torhaus(b) {
      b.noWalls = true; // its walls with the gate passage come from torhaus() (stone geometry), the roof stays generic
      b.noDoor = true;
    },
    torkirche(b) {
      b.F.forEach(f => (f[8] |= 1));
      b.noDoor = true;
    },
    henneberg(b) {
      b.F.forEach(f => (f[8] |= 1));
      b.noDoor = true;
    },
    suedkapelle(b) {
      b.F.forEach(f => (f[8] |= 1));
      b.noDoor = true;
    },
  };
  function build() {
    const t0 = performance.now();
    S.segs = [];
    S.bld = [];
    S.seats = [];
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
      // the foot: the lowest ground along the walls; on a slope the ground floor keeps to the upper side, a stone base below
      const zs = [];
      for (const f of b.F) zs.push(ground(f[0], f[1]), ground((f[0] + f[2]) / 2, (f[1] + f[3]) / 2));
      zs.sort((p, q) => p - q);
      const zmin = zs.length ? zs[0] : ground(cx, cy),
        z70 = zs.length ? zs[Math.floor(zs.length * 0.7)] : zmin;
      b.zmin = zmin;
      b.z0 = z70 - zmin < 1.0 ? zmin - 0.1 : z70 - 0.4;
      b.st = styleOf(b, i);
      if (LM_PREP[b.lm]) LM_PREP[b.lm](b);
      if (b.m === 'stone' && b.k === 1) b.F.forEach(f => (f[8] |= 1)); // the domain's stone barns: closed walls (Panoramax 2025)
      if (b.lm !== 'apsis')
        try {
          building(b, i, b.z0, WB, RB);
        } catch (e) {
          console.warn('vessra building', i, e);
        }
      S.bld.push(b);
    });
    const wm =
        (VILLAGE.ready && RATSCHER.bld && RATSCHER.bld[0] && RATSCHER.bld[0].material) ||
        new THREE.MeshStandardMaterial({ color: 0xd8d0c0 }),
      rm =
        (VILLAGE.ready && VILLAGE.meshes[0] && VILLAGE.meshes[0].material) ||
        new THREE.MeshStandardMaterial({ color: 0x8a4a35 });
    if (VPROPS.kit) {
      const K = VPROPS.kit(),
        KS = VPROPS.kit(),
        KA = VPROPS.kit(); // ashlar: the church
      const step = (name, f) => {
        try {
          f();
        } catch (e) {
          console.warn('vessra ' + name, e);
          S.err = S.err || name + ': ' + e;
        }
      };
      step('kirche', () => kirche(KA, K, RB));
      step('apses', () => apses(KA, K, RB));
      for (const b of S.bld.filter(q => q.lm === 'torkirche')) step('torkirche', () => torkirche(K, b));
      for (const b of S.bld.filter(q => q.lm === 'torhaus')) step('torhaus', () => torhaus(KS, K, b));
      step('walls', () => walls(KS, K));
      step('fences', () => fences(K));
      step('cemetery', () => cemetery(K));
      step('nursery', () => nursery(K));
      step('benches', () => benches(K));
      step('museum sign', () => museumSign(K));
      add(new THREE.Mesh(KS.geo(), stoneMat()), 'stone', true);
      if (!KA.empty()) add(new THREE.Mesh(scaledGeo(KA, 0.34), stoneMat('pavers', 1.3)), 'ashlar', true);
      add(new THREE.Mesh(K.geo(), propMat()), 'props', true);
      step('ponds', ponds);
      step('lamps', lamps);
      step('trees', trees);
      step('signs', signs);
    }
    add(new THREE.Mesh(WB.geo(), wm), 'walls');
    add(new THREE.Mesh(RB.geo(), rm), 'roofs');
    try {
      streetMap();
    } catch (e) {
      console.warn('vessra streets', e);
    }
    grid();
    S.ms = Math.round(performance.now() - t0);
    S.state = 'ready';
    pc = [1e9, 0, null]; // the cached place name was given before the place stood
    KERN.spot('vessra', { z: ground(START[0], START[1]) });
    const B = S.baumschule;
    if (B) {
      // in front of the nursery gate on the street, 4 m outside it, looking along the way in
      const w = B.frame.w,
        x = B.eingang.x - w[0] * 5.5,
        y = B.eingang.y - w[1] * 5.5;
      KERN.spot('baumschule', { pos: [x, y], z: ground(x, y), yaw: B.eingang.yaw });
    }
    markDirty(true);
  }
  // ---- the gate house beside the gate church: the entrance to the monastery grounds and the museum, a round-arched passage with a
  // barrel vault through it from the Schleusinger Straße into the courtyard (photo 2022 „Eingang“; plan of the district: Torgebäude) ----
  function torhaus(KS, K, b) {
    const ring = [];
    for (let k = 0; k < b.f.length; k += 2) ring.push([b.f[k], b.f[k + 1]]);
    // merge nearly straight runs of the outline into whole walls
    const pts = ring.filter((p, k) => {
      const a = ring[(k + ring.length - 1) % ring.length],
        c = ring[(k + 1) % ring.length],
        d1 = Math.atan2(p[1] - a[1], p[0] - a[0]),
        d2 = Math.atan2(c[1] - p[1], c[0] - p[0]);
      return Math.abs(Math.atan2(Math.sin(d2 - d1), Math.cos(d2 - d1))) > 0.3;
    });
    // the passage: through the middle, from the side facing the street (north) to the courtyard
    let nf = null,
      best = -1;
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k],
        q = pts[(k + 1) % pts.length],
        L = Math.hypot(q[0] - p[0], q[1] - p[1]),
        ny = -(q[0] - p[0]) / L;
      if (L > 4 && ny > best) {
        best = ny;
        nf = [(q[1] - p[1]) / L, ny];
      }
    }
    if (!nf) return;
    // a tall gate tower (photo 2025 „Torgebäude“): red sandstone ashlar up to above the arch, mixed pink and yellow rubble over it, two slit
    // windows over the arch on either gable
    const dir = [-nf[0], -nf[1]],
      side = [-dir[1], dir[0]],
      c = [b.cx, b.cy],
      z0 = b.z0,
      top = z0 + b.e,
      W = 3.6,
      zs = z0 + 3.2,
      zb = zs + W / 2 + 0.7,
      col = STONE[1],
      RUB = RUBBLE,
      cross = (p, q) => {
        // where the passage's centre line crosses the wall p → q (u along the wall), or null
        const ex = q[0] - p[0],
          ey = q[1] - p[1],
          den = dir[0] * ey - dir[1] * ex;
        if (Math.abs(den) < 1e-6) return null;
        const t = ((p[0] - c[0]) * ey - (p[1] - c[1]) * ex) / den,
          u = ((p[0] - c[0]) * dir[1] - (p[1] - c[1]) * dir[0]) / den;
        return u >= 0 && u <= 1 ? { t, u: u * Math.hypot(ex, ey) } : null;
      };
    const ends = [],
      FRAME = linC([0.66, 0.46, 0.4]),
      GLASS = linC([0.08, 0.08, 0.09]);
    for (let k = 0; k < pts.length; k++) {
      const p = pts[k],
        q = pts[(k + 1) % pts.length],
        x = cross(p, q),
        holes = x ? [{ u: x.u, w: W, z0: z0 - 0.7, zs, r: W / 2 }] : [];
      if (x) ends.push(x.t);
      stoneWall(KS, p, q, z0 - 0.7, zb, 0.7, holes, col);
      stoneWall(KS, p, q, zb, top, 0.7, [], RUB, { collide: false });
      if (!x) continue;
      // the slit windows in a frame of red sandstone, on the outer face
      const L = Math.hypot(q[0] - p[0], q[1] - p[1]),
        d = [(q[0] - p[0]) / L, (q[1] - p[1]) / L],
        mx = p[0] + d[0] * x.u,
        my = p[1] + d[1] * x.u;
      let n = [d[1], -d[0]];
      if ((mx - c[0]) * n[0] + (my - c[1]) * n[1] < 0) n = [-n[0], -n[1]];
      const rot = Math.atan2(d[1], d[0]);
      for (const [zw, hw] of [
        [z0 + 6.7, 0.95],
        [z0 + 9.3, 0.8],
      ]) {
        if (zw + hw > top - 0.3) continue;
        K.box(mx + n[0] * 0.36, my + n[1] * 0.36, zw - 0.14, 0.52, 0.06, hw + 0.28, rot, FRAME);
        K.box(mx + n[0] * 0.39, my + n[1] * 0.39, zw, 0.2, 0.04, hw, rot, GLASS);
      }
    }
    // the gables over the walls, flush with their outer faces (the generic roof stands on the eaves)
    for (const f of b.F) {
      const [ax0, ay0, bx0, by0, t0, uA, tA, t1] = f,
        L = Math.hypot(bx0 - ax0, by0 - ay0);
      if (L < 0.5 || tA < Math.max(t0, t1) + 0.6) continue;
      const dx = (bx0 - ax0) / L,
        dy = (by0 - ay0) / L,
        sg = ((ax0 + bx0) / 2 - c[0]) * dy - ((ay0 + by0) / 2 - c[1]) * dx < 0 ? -1 : 1,
        nx = dy * sg,
        ny = -dx * sg,
        ax = ax0 + nx * 0.35,
        ay = ay0 + ny * 0.35;
      poly(
        KS,
        [
          [ax, ay, z0 + t0],
          [bx0 + nx * 0.35, by0 + ny * 0.35, z0 + t1],
          [ax + dx * uA, ay + dy * uA, z0 + tA],
        ],
        [nx, ny, 0],
        RUB,
        p => [(p[0] - ax) * dx + (p[1] - ay) * dy, p[2]]
      );
    }
    if (ends.length < 2) return;
    const t0 = Math.min(...ends),
      t1 = Math.max(...ends),
      P = (t, s) => [c[0] + dir[0] * t + side[0] * s, c[1] + dir[1] * t + side[1] * s];
    // the side walls of the passage and the barrel vault over it
    for (const sg of [-1, 1])
      stoneWall(KS, P(t0, sg * (W / 2 + 0.15)), P(t1, sg * (W / 2 + 0.15)), z0 - 0.7, zs, 0.3, [], col);
    for (let k = 0; k < 8; k++) {
      const a0 = (k / 8) * Math.PI,
        a1 = ((k + 1) / 8) * Math.PI,
        q = (t, a) => [...P(t, Math.cos(a) * (W / 2)), zs + Math.sin(a) * (W / 2)],
        am = (a0 + a1) / 2;
      poly(
        KS,
        [q(t0, a0), q(t1, a0), q(t1, a1), q(t0, a1)],
        [-side[0] * Math.cos(am), -side[1] * Math.cos(am), -Math.sin(am)],
        col,
        p => [(p[0] - c[0]) * dir[0] + (p[1] - c[1]) * dir[1], p[2]]
      );
    }
    S.torhaus = { a: P(t0 - 0.4, 0), b: P(t1 + 0.4, 0), dir, w: W };
  }
  // ---- the monastery wall and the other walls (OSM barrier=wall): red sandstone rubble, ~3.2 m, gaps with pillars at the gates ----
  function gapsOn(a, b, L, wGate) {
    const dx = (b[0] - a[0]) / L,
      dy = (b[1] - a[1]) / L,
      out = [];
    for (const g of data.gates || []) {
      const t = (g[0] - a[0]) * dx + (g[1] - a[1]) * dy,
        d = Math.abs((g[0] - a[0]) * dy - (g[1] - a[1]) * dx);
      if (t > -0.5 && t < L + 0.5 && d < 1.6) {
        const w = g[2] === 'gate' ? wGate : 1.8;
        out.push([Math.max(0, t - w / 2), Math.min(L, t + w / 2)]);
      }
    }
    return out.sort((p, q) => p[0] - q[0]);
  }
  // the monastery wall and the other walls: grey-beige rubble with a pink tinge, moss on the coping (photos of the north and the south
  // monastery wall 2025)
  const WALLC = [
    [0.62, 0.56, 0.52],
    [0.66, 0.59, 0.54],
    [0.58, 0.52, 0.48],
  ].map(c => linC(c, 0.85));
  function walls(KS, K) {
    const COP = linC([0.42, 0.44, 0.33]);
    (data.walls || []).forEach((w, wi) => {
      const p = w.p,
        h = Math.min(4.2, Math.max(1.2, w.h || 3.2)),
        col = WALLC[wi % WALLC.length];
      for (let k = 0; k + 3 < p.length; k += 2) {
        const a = [p[k], p[k + 1]],
          b = [p[k + 2], p[k + 3]],
          L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 0.3) continue;
        const dx = (b[0] - a[0]) / L,
          dy = (b[1] - a[1]) / L,
          at = u => [a[0] + dx * u, a[1] + dy * u],
          gaps = gapsOn(a, b, L, 3.4),
          spans = [];
        let s0 = 0;
        for (const [g0, g1] of gaps) {
          spans.push([s0, g0]);
          s0 = g1;
          // gate pillars: square, a little higher, with a cap (photos of the gates 2022, 2025)
          for (const u of [g0, g1]) {
            const [x, y] = at(u),
              z = ground(x, y);
            KS.box(x, y, z - 0.5, 0.85, 0.85, h + 1.0, Math.atan2(dy, dx), col);
            K.box(x, y, z + h + 0.5, 1.0, 1.0, 0.14, Math.atan2(dy, dx), COP);
            S.segs.push(...boxSegs(x, y, 0.85, 0.85, Math.atan2(dy, dx)));
          }
        }
        spans.push([s0, L]);
        for (const [u0, u1] of spans) {
          if (u1 - u0 < 0.3) continue;
          const A = at(u0),
            B = at(u1),
            za = ground(...A),
            zb = ground(...B),
            zlo = Math.min(za, zb, ground(...at((u0 + u1) / 2))) - 0.6;
          stoneWall(KS, A, B, zlo, [za + h, zb + h], 0.7, [], col);
          // the coping: a slightly wider course on top
          const cx = (A[0] + B[0]) / 2,
            cy = (A[1] + B[1]) / 2;
          K.box(cx, cy, (za + zb) / 2 + h - 0.02, u1 - u0, 0.85, 0.12, Math.atan2(dy, dx), COP);
        }
      }
    });
  }
  // ---- fences (OSM barrier=fence: wooden posts and rails; the nursery's green metal fence) and hedges ----
  function fences(K) {
    const WOOD = linC([0.42, 0.3, 0.2]),
      GREEN = linC([0.1, 0.22, 0.12]),
      HEDGE = [linC([0.13, 0.22, 0.09]), linC([0.16, 0.25, 0.1])],
      nur = (data.areas || []).find(q => q.k === 'nursery');
    for (const f of data.fences || []) {
      const p = f.p,
        mi = (p.length >> 2) * 2,
        metal =
          !!(nur && (inPoly(nur.p, p[mi], p[mi + 1]) || nearPolyEdge(nur.p, p[mi], p[mi + 1]) < 3)) || f.m === 'metal',
        col = metal ? GREEN : WOOD,
        H = metal ? 1.7 : 1.15;
      for (let k = 0; k + 3 < p.length; k += 2) {
        const a = [p[k], p[k + 1]],
          b = [p[k + 2], p[k + 3]],
          L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        if (L < 0.2) continue;
        const dx = (b[0] - a[0]) / L,
          dy = (b[1] - a[1]) / L,
          rot = Math.atan2(dy, dx),
          gaps = gapsOn(a, b, L, 4.2),
          spans = [];
        let s0 = 0;
        for (const [g0, g1] of gaps) {
          spans.push([s0, g0]);
          s0 = g1;
        }
        spans.push([s0, L]);
        for (const [u0, u1] of spans) {
          if (u1 - u0 < 0.2) continue;
          const n = Math.max(1, Math.round((u1 - u0) / 2.4));
          for (let i = 0; i <= n; i++) {
            const u = u0 + ((u1 - u0) * i) / n,
              x = a[0] + dx * u,
              y = a[1] + dy * u;
            K.box(x, y, ground(x, y) - 0.2, 0.09, 0.09, H + 0.2, rot, col);
          }
          for (let i = 0; i < n; i++) {
            const ua = u0 + ((u1 - u0) * i) / n,
              ub = u0 + ((u1 - u0) * (i + 1)) / n,
              xm = a[0] + (dx * (ua + ub)) / 2,
              ym = a[1] + (dy * (ua + ub)) / 2,
              zm = ground(xm, ym);
            for (const zr of metal ? [0.15, 0.85, H - 0.06] : [0.35, H - 0.2])
              K.box(xm, ym, zm + zr, ub - ua, 0.04, metal ? 0.04 : 0.09, rot, col);
            if (metal)
              for (let j = 1; j < 8; j++)
                K.box(
                  xm - dx * ((ub - ua) / 2) + (dx * ((ub - ua) * j)) / 8,
                  ym - dy * ((ub - ua) / 2) + (dy * ((ub - ua) * j)) / 8,
                  zm + 0.15,
                  0.015,
                  0.015,
                  H - 0.2,
                  rot,
                  col
                );
          }
          const A = [a[0] + dx * u0, a[1] + dy * u0],
            B = [a[0] + dx * u1, a[1] + dy * u1];
          S.segs.push([A[0], A[1], B[0], B[1]]);
        }
      }
    }
    for (const hd of data.hedges || []) {
      const p = hd.p;
      for (let k = 0; k + 3 < p.length; k += 2) {
        const a = [p[k], p[k + 1]],
          b = [p[k + 2], p[k + 3]],
          L = Math.hypot(b[0] - a[0], b[1] - a[1]);
        for (let u = 0; u < L - 0.1; u += 2.0) {
          const l = Math.min(2.0, L - u),
            x = a[0] + ((b[0] - a[0]) * (u + l / 2)) / L,
            y = a[1] + ((b[1] - a[1]) * (u + l / 2)) / L;
          K.box(
            x,
            y,
            ground(x, y) - 0.2,
            l + 0.1,
            0.9,
            1.65 + hh(u + k) * 0.25,
            Math.atan2(b[1] - a[1], b[0] - a[0]),
            HEDGE[Math.floor(u / 2) % 2]
          );
        }
        S.segs.push(...boxSegs((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, L, 0.9, Math.atan2(b[1] - a[1], b[0] - a[0])));
      }
    }
  }
  // ---- the cemetery north of the church (OSM landuse=cemetery; photos 2026): rows of graves with headstones and crosses ----
  function cemetery(K) {
    const ce = (data.areas || []).find(q => q.k === 'cemetery');
    if (!ce) return;
    const kc = S.kirche,
      ex = kc ? kc.ex : [1, 0],
      en = kc ? kc.en : [0, 1],
      p = ce.p,
      xs = p.filter((v, k) => k % 2 === 0),
      ys = p.filter((v, k) => k % 2 === 1),
      cx = xs.reduce((s, v) => s + v, 0) / xs.length,
      cy = ys.reduce((s, v) => s + v, 0) / ys.length,
      R = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)),
      inB = (x, y) => S.bld.some(b => Math.abs(b.cx - x) < 40 && Math.abs(b.cy - y) < 40 && inPoly(b.f, x, y)),
      STONES = [linC([0.55, 0.54, 0.52]), linC([0.3, 0.3, 0.31]), linC([0.62, 0.5, 0.44]), linC([0.2, 0.2, 0.21])],
      BED = [linC([0.2, 0.26, 0.12]), linC([0.26, 0.2, 0.14]), linC([0.3, 0.32, 0.16])];
    let n = 0;
    for (let i = -R; i <= R && n < 90; i += 3.4) {
      if (Math.abs(i % 13.6) < 1) continue; // a path every fourth row
      for (let j = -R; j <= R && n < 90; j += 2.2) {
        const x = cx + ex[0] * i + en[0] * j,
          y = cy + ex[1] * i + en[1] * j;
        if (!inPoly(p, x, y) || inPoly(p, x, y) !== inPoly(p, x - ex[0] * 2, y - ex[1] * 2) || inB(x, y)) continue;
        if (S.segs.length && nearSeg(x, y, 1.6)) continue;
        const z = ground(x, y),
          k = hh(n * 7.1 + 3),
          rot = Math.atan2(en[1], en[0]),
          hx = x - ex[0] * 0.85,
          hy = y - ex[1] * 0.85;
        K.box(x, y, z - 0.05, 1.8, 0.85, 0.16, Math.atan2(ex[1], ex[0]), BED[n % 3]);
        if (k < 0.18) {
          K.box(hx, hy, z, 0.07, 0.07, 1.25, rot, linC([0.3, 0.22, 0.14]));
          K.box(hx, hy, z + 0.85, 0.06, 0.6, 0.07, rot, linC([0.3, 0.22, 0.14]));
        } else K.box(hx, hy, z - 0.1, 0.16, 0.6 + k * 0.2, 0.7 + k * 0.45, rot, STONES[Math.floor(k * 4) % 4]);
        S.segs.push(...boxSegs(hx, hy, 0.2, 0.7, rot));
        n++;
      }
    }
    S.graves = n;
  }
  const nearSeg = (x, y, r) => {
    for (const s of S.segs) {
      const ex = s[2] - s[0],
        ey = s[3] - s[1],
        l2 = ex * ex + ey * ey || 1,
        t = Math.max(0, Math.min(1, ((x - s[0]) * ex + (y - s[1]) * ey) / l2));
      if (Math.hypot(x - s[0] - ex * t, y - s[1] - ey * t) < r) return true;
    }
    return false;
  };
  // ---- ponds (OSM natural=water: Klosteranlage's ponds, the Dorfteich): a still water surface below the bank ----
  function ponds() {
    for (const w of (data.areas || []).filter(q => q.k === 'water')) {
      const p = w.p,
        pts = [];
      let zmin = 1e9;
      for (let k = 0; k < p.length; k += 2) {
        pts.push(new THREE.Vector2(p[k], p[k + 1]));
        zmin = Math.min(zmin, ground(p[k], p[k + 1]));
      }
      if (pts.length < 3) continue;
      const tris = THREE.ShapeUtils.triangulateShape(pts, []),
        pos = [];
      for (const t of tris) {
        // facing up (three: x, z = -y): the 2-D winding decides
        const [a, b, c] = t.map(i => pts[i]),
          up = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x) > 0;
        for (const q of up ? [a, b, c] : [a, c, b]) pos.push(q.x, zmin - 0.3, -q.y);
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.computeVertexNormals();
      g.computeBoundingSphere();
      for (let k = 0; k < g.attributes.normal.count; k++) g.attributes.normal.setXYZ(k, 0, 1, 0);
      add(
        new THREE.Mesh(
          g,
          new THREE.MeshStandardMaterial({ color: 0x1d2b27, roughness: 0.1, metalness: 0, envMapIntensity: 1.1 })
        ),
        'water',
        true
      );
      for (let k = 0; k < pts.length; k++) {
        const a = pts[k],
          b = pts[(k + 1) % pts.length];
        S.segs.push([a.x, a.y, b.x, b.y]);
      }
    }
  }
  // ---- the tree nursery Baumschule Kammbach (OSM landuse=plant_nursery, Schulstraße 52) ----
  // Inside the south gate: a gravel sales yard with a path into the grounds; south of the path parking and the sales hut with its counter,
  // north of it five beds of container plants by kind (from the path inwards: fruit trees, berry shrubs, ornamental shrubs, climbers,
  // ground cover); the grounds' own buildings stay as OSM has them; west of them young trees in rows on the field. Frame: u along the
  // Schulstraße to the north (from the south gate to the north gate), w into the grounds. Spots for the garden planner: VESSRA.baumschule.
  const ARTEN = [
    { art: 'obst', name: 'Obstgehölze', w0: 4.0, w1: 8.0, rows: 3, step: 1.8 },
    { art: 'beeren', name: 'Beerenobst', w0: 10.0, w1: 13.0, rows: 2, step: 1.2 },
    { art: 'zier', name: 'Ziergehölze', w0: 15.0, w1: 19.0, rows: 3, step: 1.5 },
    { art: 'kletter', name: 'Kletterpflanzen', w0: 21.0, w1: 24.5, rows: 2, step: 1.0 },
    { art: 'boden', name: 'Bodendecker', w0: 26.5, w1: 29.5, rows: 3, step: 0.7 },
  ];
  function nursery(K) {
    const ar = (data.areas || []).find(q => q.k === 'nursery');
    if (!ar) return;
    const gs = (data.gates || []).filter(g => g[2] === 'gate' && nearPolyEdge(ar.p, g[0], g[1]) < 4);
    if (gs.length < 1) return;
    gs.sort((p, q) => p[1] - q[1]);
    const G = [gs[0][0], gs[0][1]],
      N2 = gs.length > 1 ? [gs[gs.length - 1][0], gs[gs.length - 1][1]] : [G[0] - 6, G[1] + 40];
    let t = [N2[0] - G[0], N2[1] - G[1]];
    const lt = Math.hypot(t[0], t[1]) || 1;
    t = [t[0] / lt, t[1] / lt];
    let wv = [-t[1], t[0]];
    if (!inPoly(ar.p, G[0] + wv[0] * 6, G[1] + wv[1] * 6)) wv = [-wv[0], -wv[1]];
    const Y = (u, w) => [G[0] + t[0] * u + wv[0] * w, G[1] + t[1] * u + wv[1] * w],
      Yz = (u, w, dz = 0) => {
        const [x, y] = Y(u, w);
        return [x, y, ground(x, y) + dz];
      },
      rot = Math.atan2(t[1], t[0]),
      yawOf = d => (Math.atan2(d[0], d[1]) * 180) / Math.PI,
      spot = (u, w, d) => {
        const [x, y, z] = Yz(u, w);
        return { x, y, z, yaw: yawOf(d) };
      },
      box = (u, w, dz, su, sw, sz, col, rr = 0) => {
        const [x, y, z] = Yz(u, w, dz);
        K.box(x, y, z, su, sw, sz, rot + rr, col);
      },
      POT = linC([0.06, 0.06, 0.065]),
      WOOD = linC([0.46, 0.33, 0.2]),
      WOODD = linC([0.3, 0.2, 0.12]),
      CLOTH = linC([0.09, 0.09, 0.09]),
      BAMBOO = linC([0.7, 0.62, 0.42]);
    S.nursery = { G, t, w: wv };
    // the hut: boards, a mono-pitch roof, the counter window towards the path with a canopy and a shelf (photo-free: generic)
    const hu0 = -9.5,
      hu1 = -5.0,
      hw0 = 12.0,
      hw1 = 15.5;
    {
      const zH = 2.5;
      box((hu0 + hu1) / 2, (hw0 + hw1) / 2, -0.3, hu1 - hu0, hw1 - hw0, 0.45, linC([0.45, 0.44, 0.42])); // base
      // walls: the counter side (u = hu1) has a window opening between 0.95 and 2.0 m
      box((hu0 + hu1) / 2, hw0 + 0.06, 0.1, hu1 - hu0, 0.12, zH, WOOD);
      box((hu0 + hu1) / 2, hw1 - 0.06, 0.1, hu1 - hu0, 0.12, zH + 0.5, WOOD);
      box(hu0 + 0.06, (hw0 + hw1) / 2, 0.1, 0.12, hw1 - hw0, zH + 0.25, WOOD);
      box(hu1 - 0.06, (hw0 + hw1) / 2, 0.1, 0.12, hw1 - hw0, 0.85, WOOD);
      box(hu1 - 0.06, (hw0 + hw1) / 2, 2.0, 0.12, hw1 - hw0, 0.55, WOOD);
      box(hu1 - 0.06, hw0 + 0.35, 0.95, 0.12, 0.7, 1.05, WOOD);
      box(hu1 - 0.06, hw1 - 0.35, 0.95, 0.12, 0.7, 1.05, WOOD);
      box(hu1 + 0.2, (hw0 + hw1) / 2, 0.95, 0.5, hw1 - hw0 - 0.6, 0.06, WOODD); // the counter board
      box(hu1 - 0.5, (hw0 + hw1) / 2 - 0.6, 0.95, 0.4, 0.5, 0.25, linC([0.12, 0.12, 0.13])); // the till
      for (let i = 0; i < 9; i++) box(hu0 + 0.06 + (i * (hu1 - hu0 - 0.12)) / 8, hw0 + 0.0, 0.1, 0.04, 0.14, zH, WOODD); // board joints
      // roof: falling from the back (w1) to the front, overhanging; a canopy over the counter
      const r0 = Yz(hu0 - 0.4, hw1 + 0.4, 0.1 + zH + 0.65),
        r1 = Yz(hu1 + 0.4, hw1 + 0.4, 0.1 + zH + 0.65),
        r2 = Yz(hu1 + 0.4, hw0 - 0.4, 0.1 + zH + 0.1),
        r3 = Yz(hu0 - 0.4, hw0 - 0.4, 0.1 + zH + 0.1);
      const zr = ground(...Y(hu0, hw0));
      for (const q of [r0, r1, r2, r3]) q[2] = zr + q[2] - ground(q[0], q[1]);
      K.quad(r3, r2, r1, r0, linC([0.18, 0.19, 0.2]));
      K.quad(r0, r1, r2, r3, linC([0.18, 0.19, 0.2]));
      const c0 = Yz(hu1, hw0 + 0.2, 2.15),
        c1 = Yz(hu1, hw1 - 0.2, 2.15),
        c2 = Yz(hu1 + 1.3, hw1 - 0.2, 1.95),
        c3 = Yz(hu1 + 1.3, hw0 + 0.2, 1.95);
      for (const q of [c0, c1, c2, c3]) q[2] = zr + q[2] - ground(q[0], q[1]);
      K.quad(c0, c1, c2, c3, linC([0.12, 0.35, 0.18]));
      K.quad(c3, c2, c1, c0, linC([0.12, 0.35, 0.18]));
      const [x, y] = Y((hu0 + hu1) / 2, (hw0 + hw1) / 2);
      S.segs.push(...boxSegs(x, y, hu1 - hu0, hw1 - hw0, rot));
      S.hutSign = { at: Yz(hu1 + 0.01, (hw0 + hw1) / 2, 2.3), d: [wv[0], wv[1]], h: 0.36 };
    }
    // parking inside the gate: three spaces, wheel stops at their ends
    for (let i = 0; i < 3; i++) box(-8.6 + i * 2.8, 9.0, 0, 0.18, 1.6, 0.14, linC([0.5, 0.49, 0.46]), Math.PI / 2);
    // a bench by the hut
    {
      const [x, y, z] = Yz(-3.2, 17.5);
      benchAt(K, x, y, z, rot);
      S.seats.push({ x, y, z, yaw: yawOf([t[0], t[1]]) });
    }
    // the beds: a ground cloth with an edge of boards, plants in black containers in rows, a label at the path end
    const beete = [];
    const U0 = 3.0,
      U1 = 21.0;
    for (const A of ARTEN) {
      const wm = (A.w0 + A.w1) / 2,
        [cx, cy] = Y((U0 + U1) / 2, wm),
        slots = [];
      box((U0 + U1) / 2, wm, -0.05, U1 - U0, A.w1 - A.w0, 0.08, CLOTH);
      for (const w of [A.w0, A.w1]) box((U0 + U1) / 2, w, -0.05, U1 - U0 + 0.1, 0.05, 0.16, WOOD);
      for (const u of [U0, U1]) box(u, wm, -0.05, 0.05, A.w1 - A.w0, 0.16, WOOD);
      for (let r = 0; r < A.rows; r++) {
        const w = A.w0 + ((r + 0.5) * (A.w1 - A.w0)) / A.rows;
        for (let u = U0 + A.step / 2; u < U1 - A.step / 4; u += A.step) {
          const [x, y, z] = Yz(u, w, 0.03),
            k = hh(x * 3.1 + y * 1.7);
          slots.push([Math.round(x * 100) / 100, Math.round(y * 100) / 100]);
          plant(K, A.art, x, y, z, k, { POT, BAMBOO, WOOD });
        }
      }
      // the label: a board on a post at the path end of the bed
      const [lx, ly, lz] = Yz(U0 - 0.5, wm);
      K.box(lx, ly, lz, 0.07, 0.07, 1.25, rot, WOODD);
      beete.push({
        x: Math.round(cx * 100) / 100,
        y: Math.round(cy * 100) / 100,
        w: U1 - U0,
        h: A.w1 - A.w0,
        yaw: Math.round(yawOf(t) * 10) / 10,
        art: A.art,
        name: A.name,
        slots,
        label: [lx, ly, lz + 1.05],
      });
      S.segs.push(...boxSegs(cx, cy, U1 - U0, A.w1 - A.w0, rot)); // walk round the beds, not through them
    }
    // young trees in rows on the field west of the grounds' buildings (away from the tracks across it)
    const tracks = (data.st || []).filter(
      s => s.k >= 5 && s.p.some((v, k) => k % 2 === 0 && inPoly(ar.p, v, s.p[k + 1]))
    );
    const nearTrack = (x, y) =>
      tracks.some(s => {
        for (let k = 0; k + 3 < s.p.length; k += 2) {
          const ax = s.p[k],
            ay = s.p[k + 1],
            ex = s.p[k + 2] - ax,
            ey = s.p[k + 3] - ay,
            l2 = ex * ex + ey * ey || 1,
            tt = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2));
          if (Math.hypot(x - ax - ex * tt, y - ay - ey * tt) < 3.2) return true;
        }
        return false;
      });
    const inB = (x, y, m) =>
      S.bld.some(
        b =>
          Math.abs(b.cx - x) < 40 &&
          Math.abs(b.cy - y) < 40 &&
          (inPoly(b.f, x, y) || Math.hypot(b.cx - x, b.cy - y) < m)
      );
    let nT = 0;
    for (let w = 36; w < 160; w += 3.5)
      for (let u = -90; u < 90; u += 2.0) {
        const [x, y] = Y(u + (Math.floor(w / 3.5) % 2) * 0.6, w);
        if (!inPoly(ar.p, x, y) || nearPolyEdge(ar.p, x, y) < 2.5 || nearTrack(x, y) || inB(x, y, 14)) continue;
        const z = ground(x, y),
          k = hh(x * 1.3 + y * 7.7);
        youngTree(K, x, y, z, k);
        S.segs.push(...circleSegs(x, y, 0.12, 4));
        nT++;
      }
    S.youngTrees = nT;
    // the sign at the gate (Falko 23.10. 9:27: the name may appear, no logo)
    const [sx, sy, sz] = Yz(3.2, -0.9);
    for (const o of [-1.2, 1.2]) K.box(sx + t[0] * o, sy + t[1] * o, sz - 0.2, 0.1, 0.1, 2.5, rot, WOODD);
    S.gateSign = { at: [sx - wv[0] * 0.07, sy - wv[1] * 0.07, sz + 1.55], d: [t[0], t[1]], h: 0.62 };
    S.baumschule = {
      name: 'Baumschule Kammbach',
      eingang: spot(0.5, 1.5, wv),
      kasse: spot(hu1 + 1.6, (hw0 + hw1) / 2, [-t[0], -t[1]]),
      parkplatz: spot(-5.8, 6.0, wv),
      beete,
      frame: { G, u: t, w: wv },
    };
  }
  const nearPolyEdge = (p, x, y) => {
    let d = 1e9;
    for (let k = 0; k < p.length; k += 2) {
      const ax = p[k],
        ay = p[k + 1],
        bx = p[(k + 2) % p.length],
        by = p[(k + 3) % p.length],
        ex = bx - ax,
        ey = by - ay,
        l2 = ex * ex + ey * ey || 1,
        t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2));
      d = Math.min(d, Math.hypot(x - ax - ex * t, y - ay - ey * t));
    }
    return d;
  };
  // one plant in its container: fruit tree (staked, a small crown), berry bush, ornamental shrub (leaf colours of late October),
  // climber on a bamboo tripod, ground cover in a small pot
  function plant(K, art, x, y, z, k, C) {
    const autumn = [
        linC([0.45, 0.5, 0.16]),
        linC([0.62, 0.52, 0.12]),
        linC([0.3, 0.42, 0.14]),
        linC([0.55, 0.28, 0.1]),
      ],
      green = [linC([0.12, 0.3, 0.1]), linC([0.16, 0.34, 0.12]), linC([0.1, 0.24, 0.08])];
    if (art === 'obst') {
      K.cyl(x, y, z, z + 0.38, 0.2, 0.24, 8, C.POT, true);
      K.box(x + 0.08, y, z, 0.03, 0.03, 2.0, 0, C.BAMBOO);
      K.cyl(x, y, z + 0.3, z + 1.25, 0.03, 0.022, 5, linC([0.32, 0.24, 0.17]));
      const r = 0.3 + k * 0.12,
        hc = 0.7 + k * 0.3;
      K.lathe(
        x,
        y,
        z + 1.15,
        [
          [0.05, 0],
          [r, hc * 0.35],
          [r * 0.85, hc * 0.7],
          [0.02, hc],
        ],
        7,
        autumn[Math.floor(k * 4) % 4]
      );
    } else if (art === 'beeren') {
      K.cyl(x, y, z, z + 0.26, 0.15, 0.17, 8, C.POT, true);
      const r = 0.3 + k * 0.12;
      K.lathe(
        x,
        y,
        z + 0.2,
        [
          [0.06, 0],
          [r, 0.22],
          [r * 0.8, 0.5 + k * 0.2],
          [0.02, 0.62 + k * 0.25],
        ],
        7,
        k < 0.5 ? green[Math.floor(k * 6) % 3] : linC([0.42, 0.18, 0.12])
      );
    } else if (art === 'zier') {
      K.cyl(x, y, z, z + 0.32, 0.19, 0.21, 8, C.POT, true);
      const cols = [
          linC([0.36, 0.08, 0.1]),
          linC([0.66, 0.66, 0.2]),
          linC([0.62, 0.66, 0.5]),
          linC([0.7, 0.16, 0.1]),
          green[1],
          linC([0.25, 0.32, 0.12]),
        ],
        r = 0.36 + k * 0.2,
        h = 0.75 + k * 0.6;
      K.lathe(
        x,
        y,
        z + 0.26,
        [
          [0.08, 0],
          [r, h * 0.3],
          [r * 0.9, h * 0.75],
          [0.05, h],
        ],
        7,
        cols[Math.floor(k * 6) % 6]
      );
    } else if (art === 'kletter') {
      K.cyl(x, y, z, z + 0.26, 0.14, 0.16, 8, C.POT, true);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * Math.PI * 2 + k;
        K.box(x + Math.cos(a) * 0.08, y + Math.sin(a) * 0.08, z + 0.2, 0.015, 0.015, 1.45, a, C.BAMBOO);
      }
      K.lathe(
        x,
        y,
        z + 0.25,
        [
          [0.05, 0],
          [0.2, 0.3],
          [0.17, 1.0],
          [0.03, 1.35],
        ],
        6,
        k < 0.5 ? green[2] : linC([0.52, 0.14, 0.1])
      );
    } else {
      K.cyl(x, y, z, z + 0.1, 0.09, 0.1, 6, C.POT, true);
      K.lathe(
        x,
        y,
        z + 0.09,
        [
          [0.04, 0],
          [0.16, 0.05],
          [0.02, 0.12],
        ],
        6,
        k < 0.7 ? green[Math.floor(k * 9) % 3] : linC([0.45, 0.2, 0.3])
      );
    }
  }
  function youngTree(K, x, y, z, k) {
    const h = 1.6 + k * 1.4,
      r = 0.3 + k * 0.35,
      cols = [linC([0.5, 0.5, 0.14]), linC([0.62, 0.48, 0.12]), linC([0.34, 0.42, 0.13]), linC([0.58, 0.3, 0.1])];
    K.box(x + 0.07, y, z - 0.1, 0.03, 0.03, h * 0.75, 0, linC([0.66, 0.6, 0.42]));
    K.cyl(x, y, z - 0.1, z + h * 0.55, 0.035, 0.025, 4, linC([0.3, 0.24, 0.18]));
    K.lathe(
      x,
      y,
      z + h * 0.45,
      [
        [0.03, 0],
        [r, h * 0.2],
        [r * 0.8, h * 0.42],
        [0.02, h * 0.55],
      ],
      5,
      cols[Math.floor(k * 7) % 4]
    );
  }
  // ---- benches (OSM amenity=bench, and the nursery's): wood on iron; one may sit down ----
  function benchAt(K, x, y, z, a) {
    const c = Math.cos(a),
      s = Math.sin(a),
      rr = a + Math.PI / 2,
      len = 1.7,
      W = linC([0.4, 0.26, 0.15]),
      IRON = [0.03, 0.03, 0.032];
    for (let i = 0; i < 3; i++)
      K.box(x + c * (0.12 - i * 0.13), y + s * (0.12 - i * 0.13), z + 0.42, len, 0.11, 0.035, rr, W);
    for (let i = 0; i < 2; i++) K.box(x - c * 0.3, y - s * 0.3, z + 0.58 + i * 0.16, len, 0.03, 0.1, rr, W);
    for (const tt of [-len / 2 + 0.15, len / 2 - 0.15]) {
      const px = x - s * tt,
        py = y + c * tt;
      K.box(px, py, z, 0.06, 0.46, 0.42, rr, IRON);
      K.box(px - c * 0.3, py - s * 0.3, z, 0.05, 0.05, 0.86, rr, IRON);
    }
  }
  function benches(K) {
    for (const [x, y] of data.benches || []) {
      // facing the church in the monastery grounds, else away from the nearest wall
      const z = ground(x, y),
        a = Math.atan2(KL[1] - y, KL[0] - x);
      benchAt(K, x, y, z, a);
      S.seats.push({ x, y, z, yaw: (Math.atan2(Math.cos(a), Math.sin(a)) * 180) / Math.PI });
    }
  }
  // the museum's board on two posts beside the gate in the monastery wall, facing the Schleusinger Straße
  function museumSign(K) {
    const d = [-0.82, -0.57],
      nx = d[1],
      ny = -d[0],
      x = GATE[0] + nx * 2.0 + d[0] * 3.2,
      y = GATE[1] + ny * 2.0 + d[1] * 3.2,
      z = ground(x, y),
      rot = Math.atan2(d[1], d[0]);
    for (const o of [-1.55, 1.55])
      K.box(x + d[0] * o, y + d[1] * o, z - 0.2, 0.1, 0.1, 2.75, rot, linC([0.25, 0.17, 0.1]));
    S.museumSign = { at: [x, y, z + 1.85], d, h: 0.42 };
  }
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
      const l = { x, y, z: z + 3.95, vessra: true };
      S.lamps.push(l);
      S.segs.push(...circleSegs(x, y, 0.12, 4));
    });
    for (const im of [iL, iG]) {
      im.computeBoundingSphere();
      add(im, 'lamps');
    }
    iL.userData.own = true;
    if (VPROPS.lamps) VPROPS.lamps.push(...S.lamps);
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
  // ---- trees (OSM and the crowns found in the orthophoto, tools/welt/zone_vessra.py): near the church the garden's ash (instanced),
  // elsewhere simple round crowns and a few conifers in one mesh (late October: greens, yellows, browns) ----
  function trees() {
    const T = (data.trees || []).slice(),
      TK = TREES.ash || TREES.oakA,
      dK = t => Math.hypot(t[0] - KL[0], t[1] - KL[1]);
    if (!T.length) return;
    T.sort((p, q) => (q[3] === 1) - (p[3] === 1) || dK(p) - dK(q));
    const nAsh = TK && TK.bg ? Math.min(30, T.filter(t => t[3] === 1 && dK(t) < 260).length) : 0,
      ash = T.slice(0, nAsh),
      rest = T.slice(nAsh);
    if (nAsh) {
      const ib = new THREE.InstancedMesh(TK.bg, TK.bark, nAsh),
        il = new THREE.InstancedMesh(TK.lg, TK.leaf, nAsh),
        m4 = new THREE.Matrix4(),
        q = new THREE.Quaternion();
      ash.forEach((tr, i) => {
        const [x, y] = tr,
          h = tr[2] ? Math.min(22, Math.max(7, tr[2] * 2.6)) : 9 + hh(i + 71) * 4,
          sc = h / TK.H;
        q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), hh(i + 73) * 6.28);
        m4.compose(V(x, y, ground(x, y) - 0.1), q, new THREE.Vector3(sc * 0.95, sc, sc * 0.95));
        ib.setMatrixAt(i, m4);
        il.setMatrixAt(i, m4);
        S.segs.push(...circleSegs(x, y, 0.3, 6));
      });
      for (const im of [ib, il]) {
        im.computeBoundingSphere();
        add(im, 'trees').userData.sharedGeo = true;
      }
    }
    if (rest.length) add(new THREE.Mesh(crownGeo(rest), propMat()), 'crowns', true);
    S.trees = T.length;
  }
  function crownGeo(T) {
    const pos = [],
      nrm = [],
      col = [],
      idx = [],
      SEG = 7,
      LEAF = [
        [0.17, 0.27, 0.1],
        [0.24, 0.31, 0.11],
        [0.42, 0.42, 0.14],
        [0.56, 0.44, 0.12],
        [0.5, 0.27, 0.1],
        [0.2, 0.3, 0.12],
      ].map(c => linC(c)),
      FIR = linC([0.08, 0.15, 0.08]),
      BARK = linC([0.24, 0.2, 0.16]);
    // one ring of SEG vertices; the normal leans up (nz > 0) or down (nz < 0) from the horizontal out of the crown
    const ring = (cx, cy, z, r, c, nz) => {
      const base = pos.length / 3,
        hz = Math.sqrt(Math.max(0, 1 - nz * nz));
      for (let s = 0; s < SEG; s++) {
        const a = (s / SEG) * Math.PI * 2;
        pos.push(cx + Math.cos(a) * r, z, -(cy + Math.sin(a) * r));
        nrm.push(Math.cos(a) * hz, nz, -Math.sin(a) * hz);
        col.push(c[0], c[1], c[2]);
      }
      return base;
    };
    const band = (a, b) => {
      for (let s = 0; s < SEG; s++) {
        const s2 = (s + 1) % SEG;
        idx.push(a + s, a + s2, b + s2, a + s, b + s2, b + s);
      }
    };
    T.forEach(tr => {
      const [x, y] = tr,
        R = tr[2] || 3,
        k = hh(x * 0.37 + y * 1.13),
        fir = tr[3] !== 1 && k < 0.55, // the dark crowns of the April photo: mostly spruce and pine
        Ht = Math.min(24, Math.max(6, R * (fir ? 3.4 : 2.5))),
        z = ground(x, y) - 0.15,
        c = fir ? FIR : LEAF[Math.floor(hh(x * 1.7 - y) * LEAF.length) % LEAF.length];
      // the trunk
      const t0 = ring(x, y, z, 0.16 + R * 0.02, BARK, 0),
        t1 = ring(x, y, z + Ht * 0.45, 0.1 + R * 0.01, BARK, 0);
      band(t0, t1);
      // the crown: rings of a round (or conical) profile, normals out of the crown, darker below
      const prof = fir
          ? [
              [0.75, 0.12, -0.6],
              [0.62, 0.35, 0.1],
              [0.42, 0.6, 0.4],
              [0.22, 0.82, 0.7],
              [0.02, 1.0, 1.0],
            ]
          : [
              [0.3, 0.28, -0.9],
              [0.88, 0.42, -0.35],
              [1.0, 0.62, 0.1],
              [0.75, 0.84, 0.6],
              [0.12, 1.0, 1.0],
            ],
        rr = fir ? R * 0.75 : R;
      let prev = -1;
      prof.forEach(([f, hz, nz], j) => {
        const sh = 0.72 + 0.28 * (j / (prof.length - 1)),
          b = ring(
            x + (hh(x + j) - 0.5) * R * 0.15,
            y + (hh(y + j) - 0.5) * R * 0.15,
            z + Ht * hz,
            rr * f,
            c.map(v => v * sh),
            nz
          );
        if (prev >= 0) band(prev, b);
        prev = b;
      });
      S.segs.push(...circleSegs(x, y, 0.3, 5));
    });
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeBoundingSphere();
    return g;
  }
  // ---- signs: the nursery at its gate and on the hut, the labels of the beds, the museum at the monastery gate (one canvas atlas) ----
  function signs() {
    const list = [];
    if (S.gateSign) list.push({ name: 'Baumschule Kammbach', ...S.gateSign, bg: '#1f4d2b', fg: '#f4efe0' });
    if (S.hutSign) list.push({ name: 'Baumschule Kammbach · Kasse', ...S.hutSign, bg: '#1f4d2b', fg: '#f4efe0' });
    if (S.baumschule)
      for (const b of S.baumschule.beete) {
        const f = S.baumschule.frame;
        list.push({ name: b.name, at: b.label, d: [-f.w[0], -f.w[1]], h: 0.3, bg: '#f3eee0', fg: '#2a3a20' });
      }
    if (S.museumSign)
      list.push({ name: 'Hennebergisches Museum Kloster Veßra', ...S.museumSign, bg: '#5c1f1a', fg: '#f2e2b0' });
    if (!list.length) return;
    const W = 1024,
      RH = 64,
      rows = Math.min(16, list.length),
      cv = document.createElement('canvas');
    cv.width = W;
    cv.height = RH * rows;
    const g = cv.getContext('2d');
    list.slice(0, rows).forEach((it, r) => {
      g.font = 'bold 38px Georgia, "Times New Roman", serif';
      const tw = Math.min(W - 40, g.measureText(it.name).width);
      it.w = tw + 40;
      it.r = r;
      g.fillStyle = it.bg;
      g.fillRect(0, r * RH, it.w, RH);
      g.fillStyle = it.fg;
      g.textBaseline = 'middle';
      g.fillText(it.name, 20, r * RH + RH / 2 + 2, W - 40);
      g.strokeStyle = it.fg;
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
        h = it.h,
        w = (h * it.w) / RH,
        nx = d[1],
        ny = -d[0],
        [cx, cy, z] = it.at,
        n = pos.length / 3,
        v0 = 1 - ((it.r + 1) * RH) / (RH * rows),
        v1 = 1 - (it.r * RH) / (RH * rows);
      for (const [s2, v, uu, vv] of [
        [-1, 0, 0, v0],
        [1, 0, it.w / W, v0],
        [1, 1, it.w / W, v1],
        [-1, 1, 0, v1],
      ]) {
        pos.push(cx + d[0] * s2 * (w / 2) + nx * 0.03, z + v * h, -(cy + d[1] * s2 * (w / 2) + ny * 0.03));
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
      'signs',
      true
    );
    m.userData.tex = tex;
    S.signs = list.slice(0, rows).map(it => it.name);
  }
  // ---- the streets over the photo (welt/welt.js overlay): asphalt on the roads, water-bound gravel on the paths of the monastery,
  // the parking and the nursery's yard; r = cover, g/r = surface ----
  function streetMap() {
    const half = 460,
      C0 = [-8790, -235],
      size = 2 * half,
      N = 1024,
      x0 = C0[0] - half,
      y0 = C0[1] - half,
      sc = N / size,
      cv = document.createElement('canvas');
    cv.width = cv.height = N;
    const g = cv.getContext('2d'),
      X = x => (x - x0) * sc,
      Y = y => (y0 + size - y) * sc,
      SURF = { asphalt: 40, concrete: 40, paved: 40, chipseal: 40, sett: 120, cobblestone: 120, paving_stones: 200 },
      GRAVEL = { gravel: 1, fine_gravel: 1, compacted: 1, unpaved: 1, dirt: 1, ground: 1, pebblestone: 1 },
      W = { 1: 7.0, 2: 6.5, 3: 5.2, 5: 3.2, 6: 2.8, 7: 1.8, 8: 1.8 },
      museum = (data.areas || []).find(q => q.k === 'museum');
    g.fillStyle = '#000';
    g.fillRect(0, 0, N, N);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    const path = pts => {
      g.beginPath();
      for (let k = 0; k < pts.length; k += 2) (k ? g.lineTo : g.moveTo).call(g, X(pts[k]), Y(pts[k + 1]));
    };
    for (const a of (data.areas || []).filter(q => q.k === 'parking')) {
      g.fillStyle = 'rgb(255,240,0)';
      path(a.p);
      g.closePath();
      g.fill();
    }
    if (S.nursery) {
      const { G, t, w } = S.nursery,
        Yp = (u, ww) => [G[0] + t[0] * u + w[0] * ww, G[1] + t[1] * u + w[1] * ww];
      g.fillStyle = 'rgb(255,240,0)';
      path([...Yp(-10.5, 0.5), ...Yp(22, 0.5), ...Yp(22, 31), ...Yp(-10.5, 31)]);
      g.closePath();
      g.fill();
    }
    const list = (data.st || []).filter(s2 => W[s2.k]).sort((p2, q) => W[q.k] - W[p2.k]);
    for (const s2 of list) {
      const p = s2.p,
        mx = p[(p.length >> 2) * 2],
        my = p[(p.length >> 2) * 2 + 1],
        inMu = museum && inPoly(museum.p, mx, my);
      let code = SURF[s2.s];
      if (code === undefined) {
        if (GRAVEL[s2.s] || (s2.k >= 7 && inMu)) code = 240;
        else if (s2.k <= 3) code = 40;
        else if (s2.k === 5) code = inMu ? 240 : 40;
        else if (s2.k >= 7 && s2.s === '') code = inMu ? 240 : -1;
        else code = -1; // field tracks and paths outside: the orthophoto shows them
      }
      if (code < 0) continue;
      g.strokeStyle = `rgb(255,${code},0)`;
      g.lineWidth = W[s2.k] * sc;
      path(p);
      g.stroke();
    }
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.NoColorSpace;
    tex.anisotropy = 4;
    S.overlayTex = tex;
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
  // ---- names on the HUD: the church, named buildings, the nursery, the monastery grounds, the nearest named street ----
  const LMN = {
    torkirche: 'Torkirche St. Erhard',
    henneberg: 'Henneberger Kapelle',
    suedkapelle: 'Südkapelle',
    kornhaus: 'Kornhaus',
    kreuzgang: 'Kreuzgang',
    torhaus: 'Torhaus',
  };
  let pc = [1e9, 0, null];
  function place(x, y) {
    if (!inZone(x, y)) return null;
    if (Math.abs(x - pc[0]) < 0.7 && Math.abs(y - pc[1]) < 0.7) return pc[2];
    pc = [x, y, place0(x, y)];
    return pc[2];
  }
  function place0(x, y) {
    if (S.state !== 'ready' || !data) return 'Kloster Veßra';
    const C = data.kirche;
    if (C && C.area && inPoly(C.area, x, y)) return 'Klosterkirche St. Marien (Ruine), Kloster Veßra';
    for (const b of S.bld)
      if ((b.lm || b.n) && b.lm !== 'apsis' && Math.abs(b.cx - x) < 40 && Math.abs(b.cy - y) < 40 && inPoly(b.f, x, y))
        return (LMN[b.lm] || b.n || 'Kloster Veßra') + ', Kloster Veßra';
    for (const a of data.areas || []) {
      if (!inPoly(a.p, x, y)) continue;
      if (a.k === 'nursery') return 'Baumschule Kammbach, Kloster Veßra';
      if (a.k === 'cemetery') return 'Friedhof an der Klosterkirche, Kloster Veßra';
      if (a.k === 'garden' && a.n) return a.n + ', Kloster Veßra';
      if (a.k === 'water' && a.n) return a.n + ', Kloster Veßra';
      if (a.k === 'parking' && a.n) return 'Besucherparkplatz, Kloster Veßra';
    }
    const mu = (data.areas || []).find(q => q.k === 'museum');
    let best = null,
      bd = 9;
    for (const s of data.st) {
      if (!(s.n || s.r) || s.k > 5) continue; // unnamed roads by their number (L 1625 out of the village)
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
          best = s.n || s.r;
        }
      }
    }
    if (best) return best + ', Kloster Veßra';
    if (mu && inPoly(mu.p, x, y)) return 'Klosteranlage (Hennebergisches Museum), Kloster Veßra';
    return 'Kloster Veßra';
  }
  S.place = place;
  // sitting down: on the benches (OSM) and the nursery's bench
  const nearSeat = () => {
    if (S.state !== 'ready' || P.mode !== 'walk') return null;
    let best = null,
      bd = 1.3;
    for (const s2 of S.seats || []) {
      const d = Math.hypot(s2.x - P.x, s2.y - P.y);
      if (d < bd && Math.abs(s2.z - P.feet) < 0.8) {
        bd = d;
        best = s2;
      }
    }
    return best;
  };
  KERN.act({
    id: 'vessra:sit',
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
  KERN.provide('pushOut', pushOut, 10);
  KERN.provide('free', (x, y) => (inZone(x, y) ? true : undefined), 10);
  // ---- near the place its tiles and the place are loaded, far away freed (KERN.zone, core/kern.js: build near, drop far, measured from
  // KERN.where() – the walker, else the camera) ----
  KERN.zone({
    id: 'vessra',
    x: ORT[0],
    y: ORT[1],
    near: NEAR,
    far: FAR,
    build: async () => {
      WELT.need('vessra', true, SUB);
      await load();
      if (S.state === 'error') throw new Error(S.err);
      if (!S.noTiles)
        await KERN.until(() => WELT.heightAt(KL[0], KL[1]) !== undefined && WELT.state().loading === 0, 900);
      try {
        build();
      } catch (e) {
        S.state = 'error';
        S.err = String(e);
        throw e;
      }
    },
    drop: () => {
      WELT.need('vessra', false);
      if (S.state === 'ready') S.dispose();
      else {
        data = null;
        S.data = null;
        gz = null;
        S.state = 'idle';
      }
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
    youngTrees: S.youngTrees || 0,
    graves: S.graves || 0,
    signs: (S.signs || []).length,
    beete: S.baumschule ? S.baumschule.beete.length : 0,
    ms: S.ms,
    loadMs: S.loadMs || 0,
    noTiles: !!S.noTiles,
    err: S.err,
    zone: (KERN.zones().find(z => z.id === 'vessra') || { state: '' }).state,
    welt: WELT.state(),
  });
  return S;
})();
window.VESSRA = VESSRA;
