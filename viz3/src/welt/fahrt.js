// ===================== FAHRT: driving out of the 2.4 km square – to Schleusingen and on to Kloster Veßra (feat/fahrt) =====================
// Beyond the square the ground is the tiled world (welt/welt.js). This module lets vehicles out there and keeps the ride smooth:
// - Nothing at the start: it wakes when a driven vehicle comes within 350 m of the edge of the square (or the walker is outside), then
//   asks WELT for tiles (WELT.need) around a point ahead of the vehicle (WELT.focus: the ground is there before the wheels; tiles
//   behind are freed sooner while driving fast, WELT.keep) and loads its road data (dist/fahrt/strassen.json, viz3/extra/fahrt/strecke.py).
// - The edge (vehicles/vehicle.js VEH.edge): a vehicle drives on where loaded tiles carry its four corners; where they are still
//   loading it is held („Gelände lädt …“, and VEH.limit brakes it in time before such ground ahead); where no tile set reaches,
//   „Hier endet die Karte.“
// - Roads (OSM, profiles from the same smoother as the tile pipeline): KERN.surface (grip, rolling resistance), KERN.ground on the
//   carriageway (the smooth longitudinal profile with a crown, instead of the 2 m mesh of a 30 m surface model), the tile mesh carved
//   to the same profile (WELT.setPads, under the pads of the zones), simple decks with railings on the bridges, place names (KERN.place:
//   „L 1625 · bei Rappelsdorf“, „Hauptstraße, Kloster Veßra“).
// - Signs: the yellow place-name signs at the village entries (front: name and municipality, back: the next place, the name struck
//   through) and direction signs where the routes turn, built within 450 m of the vehicle; routes and roads on the small map (MMAP).
// - Walls of the zones (Schleusingen) stop vehicles through KERN.pushOut (VEH.hitsOut).
// © OpenStreetMap contributors (ODbL 1.0) for the roads, places and signs.
import * as THREE from 'three';
import { BASE, scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { RATSCHER } from '../world/ratscher.js';
import { WELT } from './welt.js';
import { VEH } from '../vehicles/vehicle.js';
import { MMAP } from '../vehicles/minimap.js';
export const FAHRT = (() => {
  const S = {
    on: false,
    active: false,
    state: 'idle',
    err: '',
    cap: Infinity,
    signs: [],
    decks: [],
    n: { built: 0, dropped: 0 },
  };
  if (!WELT.on || !RATSCHER.box) return S;
  S.on = true;
  const RB = RATSCHER.box,
    GARDEN = [2, 2],
    VESSRA = 'zonen/vessra/';
  const insideRB = (x, y) => x > RB[0] && x < RB[2] && y > RB[1] && y < RB[3];
  // distance outside the square of the 10 m terrain (negative inside)
  const outRB = (x, y) => {
    const dx = Math.max(RB[0] - x, 0, x - RB[2]),
      dy = Math.max(RB[1] - y, 0, y - RB[3]);
    if (dx || dy) return Math.hypot(dx, dy);
    return -Math.min(x - RB[0], RB[2] - x, y - RB[1], RB[3] - y);
  };
  // ---------------- road data ----------------
  const D = { ways: [], seg: null, grid: new Map(), places: [], signs: [], routes: {}, park: {}, names: [] };
  const CELL = 32;
  const KIND_DE = {
    motorway: 'Autobahn',
    main: 'Landstraße',
    county: 'Kreisstraße',
    street: 'Straße',
    lane: 'Gemeindeverbindungsstraße',
    service: 'Zufahrt',
  };
  function parse(j) {
    D.names = j.names;
    D.kinds = j.kinds;
    D.surfs = j.surf;
    const segW = [],
      segI = [];
    for (const [k, sf, w10, fl, ni, ri, q] of j.ways) {
      const n = q.length / 3,
        p = new Float32Array(q.length);
      for (let i = 0; i < q.length; i++) p[i] = q[i] / 10;
      const w = { kind: k, kname: j.kinds[k], surf: sf, hw: w10 / 20, fl, name: j.names[ni], ref: j.names[ri], p, n };
      w.bb = [1e9, 1e9, -1e9, -1e9];
      for (let i = 0; i < n; i++) {
        w.bb[0] = Math.min(w.bb[0], p[i * 3]);
        w.bb[1] = Math.min(w.bb[1], p[i * 3 + 1]);
        w.bb[2] = Math.max(w.bb[2], p[i * 3]);
        w.bb[3] = Math.max(w.bb[3], p[i * 3 + 1]);
      }
      const wi = D.ways.length;
      D.ways.push(w);
      for (let i = 0; i < n - 1; i++) {
        const s = segW.length;
        segW.push(wi);
        segI.push(i);
        // into every grid cell the segment (widened by the reach of the carving) touches
        const ax = p[i * 3],
          ay = p[i * 3 + 1],
          bx = p[i * 3 + 3],
          by = p[i * 3 + 4],
          r = w.hw + 20,
          c0 = Math.floor((Math.min(ax, bx) - r) / CELL),
          c1 = Math.floor((Math.max(ax, bx) + r) / CELL),
          r0 = Math.floor((Math.min(ay, by) - r) / CELL),
          r1 = Math.floor((Math.max(ay, by) + r) / CELL);
        for (let cx = c0; cx <= c1; cx++)
          for (let cy = r0; cy <= r1; cy++) {
            const kk = cx * 100003 + cy;
            let a = D.grid.get(kk);
            if (!a) D.grid.set(kk, (a = []));
            a.push(s);
          }
      }
    }
    D.segW = Int32Array.from(segW);
    D.segI = Int32Array.from(segI);
    D.places = j.places.map(p => ({
      n: p.n,
      k: p.k,
      x: p.x,
      y: p.y,
      a: p.a.map(r => {
        const bb = [1e9, 1e9, -1e9, -1e9];
        for (let i = 0; i < r.length; i += 2) {
          bb[0] = Math.min(bb[0], r[i]);
          bb[1] = Math.min(bb[1], r[i + 1]);
          bb[2] = Math.max(bb[2], r[i]);
          bb[3] = Math.max(bb[3], r[i + 1]);
        }
        return { r, bb };
      }),
    }));
    D.signs = j.signs;
    D.routes = {};
    for (const k in j.routes) D.routes[k] = Array.from(j.routes[k].pts, v => v / 10);
    D.park = j.park || {};
  }
  // the nearest road under / near (x, y) within reach of its edge: the segment, the lateral offset, the profile height there
  const R0 = { w: null, d: 0, lat: 0, e: 0, z: 0, t: 0, s: -1, dx: 0, dy: 0 };
  function roadAt(x, y, reach = 0, skipBridge = false) {
    const a = D.grid.get(Math.floor(x / CELL) * 100003 + Math.floor(y / CELL));
    if (!a) return null;
    let best = null,
      be = 1e9;
    for (const s of a) {
      const w = D.ways[D.segW[s]];
      if (skipBridge && w.fl & 3) continue;
      const i = D.segI[s] * 3,
        p = w.p,
        ax = p[i],
        ay = p[i + 1],
        ex = p[i + 3] - ax,
        ey = p[i + 4] - ay,
        l2 = ex * ex + ey * ey || 1e-9,
        t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / l2)),
        qx = ax + ex * t,
        qy = ay + ey * t,
        d = Math.hypot(x - qx, y - qy),
        edge = d - w.hw;
      if (edge > reach || edge >= be) continue;
      be = edge;
      const L = Math.sqrt(l2);
      best = R0;
      best.w = w;
      best.s = s;
      best.t = t;
      best.d = d;
      best.lat = ((x - ax) * ey - (y - ay) * ex) / L;
      best.e = -edge;
      best.z = p[i + 2] + (p[i + 5] - p[i + 2]) * t;
      best.dx = ex / L;
      best.dy = ey / L;
    }
    return best;
  }
  // near the square the tiles blend into the edge of the 10 m terrain over 80 m (welt/welt.js innerFix): the roads too
  function edgeBlend(x, y, z) {
    const d = outRB(x, y);
    if (d > 80 || !RATSCHER.hMesh) return z;
    const hb = RATSCHER.hMesh(Math.min(RB[2], Math.max(RB[0], x)), Math.min(RB[3], Math.max(RB[1], y))),
      t = Math.max(0, d) / 80,
      w = t * t * (3 - 2 * t);
    return hb + (z - hb) * w;
  }
  const paved = w => w.surf <= 2;
  S.roadAt = roadAt;
  // ---------------- KERN: surface, ground, place ----------------
  KERN.provide(
    'surface',
    (x, y) => {
      if (!S.ready || insideRB(x, y)) return undefined;
      const r = roadAt(x, y, 0.4);
      return r && !(r.w.fl & 2) ? { e: r.e, kind: r.w.kind, surf: r.w.surf, lat: r.lat } : null;
    },
    5
  );
  // the ground on the roads is the tile mesh carved to the profile (carveZ below) – one surface for wheels, feet and eyes, under the
  // pads of the zones; only the bridge decks are this module's own ground (when coming from their level: a walker in the valley stays)
  KERN.provide(
    'ground',
    (x, y, z) => {
      if (!S.ready || insideRB(x, y)) return undefined;
      const r = roadAt(x, y, 0.5);
      if (!r || !(r.w.fl & 1)) return undefined;
      const g = edgeBlend(x, y, r.z);
      return z != null && z < g - 1.2 ? undefined : g;
    },
    7
  );
  // the carving of the tile mesh (WELT pads): the carriageway on the profile, the shoulder falling 8 %, beyond it the terrain cut or
  // filled with 1 : 1.5 slopes until it meets the ground (tools/welt/roads.py does the same in its detail block)
  // (not in the old town of Schleusingen: its buildings stand on the tiles as they are, the Markt has its own plane)
  const OLD = [-1084.7, 1241.9];
  function carveZ(x, y, raw) {
    if (insideRB(x, y) || Math.hypot(x - OLD[0], y - OLD[1]) < 300) return raw;
    const r = roadAt(x, y, 18, true);
    if (!r) return raw;
    const w = r.w,
      sh = w.kind <= 2 ? 1.5 : 0.6,
      zc = edgeBlend(x, y, r.z),
      cr = paved(w) ? 0.025 : 0.04;
    if (r.d <= w.hw) return zc - cr * r.d;
    const zs = zc - cr * w.hw - 0.08 * Math.min(r.d - w.hw, sh);
    if (r.d <= w.hw + sh) return zs;
    const k = (r.d - w.hw - sh) / 1.5;
    return Math.max(zs - k, Math.min(zs + k, raw));
  }
  // place names: in a village its street (or its name), on a road its number or name and the nearest village
  const inPoly = (r, x, y) => {
    let c = false;
    for (let i = 0, j = r.length - 2; i < r.length; j = i, i += 2)
      if (r[i + 1] > y !== r[j + 1] > y && x < ((r[j] - r[i]) * (y - r[i + 1])) / (r[j + 1] - r[i + 1]) + r[i]) c = !c;
    return c;
  };
  function placeAt(x, y) {
    for (const p of D.places)
      for (const a of p.a) if (x > a.bb[0] && x < a.bb[2] && y > a.bb[1] && y < a.bb[3] && inPoly(a.r, x, y)) return p;
    return null;
  }
  function nearestPlace(x, y, max = 3000) {
    let best = null,
      bd = max;
    for (const p of D.places) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (d < bd) {
        bd = d;
        best = p;
      }
    }
    return best;
  }
  let plKey = '',
    plVal = null,
    plX = 1e9,
    plY = 1e9;
  function place(x, y) {
    if (!S.ready || insideRB(x, y)) return null;
    if (Math.hypot(x - plX, y - plY) < 3 && plKey) return plVal;
    plX = x;
    plY = y;
    plKey = 'k';
    const pl = placeAt(x, y),
      r = roadAt(x, y, 4);
    let n = null;
    if (pl) n = r && r.w.name ? r.w.name + ', ' + pl.n : pl.n;
    else if (r) {
      const nb = nearestPlace(x, y),
        lbl = r.w.ref || r.w.name || KIND_DE[r.w.kname] || 'Straße';
      n = nb ? lbl + ' · bei ' + nb.n : lbl;
    } else {
      const nb = nearestPlace(x, y, 2500);
      n = nb ? 'Feldflur bei ' + nb.n : null;
    }
    plVal = n;
    return n;
  }
  S.place = place;
  KERN.provide('place', (x, y) => (S.ready ? place(x, y) : null), 8);
  // ---------------- tiles: where they exist (the end of the map), where they are loaded (the edge) ----------------
  const RECTS = [];
  let vessraMeta = 0;
  function rects() {
    if (!RECTS.length && WELT.meta) RECTS.push(rectOf(WELT.meta));
    // the zone sets of welt/welt.js (feat/vessra): their blocks reach further (the road to Kloster Veßra)
    if (WELT.addSet && !vessraMeta) {
      vessraMeta = 1;
      fetch(WELT.base + VESSRA + 'meta.json')
        .then(r => (r.ok ? r.json() : null))
        .then(j => {
          if (j) RECTS.push(rectOf(j));
        })
        .catch(() => {});
    }
    return RECTS;
  }
  function rectOf(m) {
    const r = m.tiling.levels['10'].rect,
      s = 409600 / 1024;
    return [420700 + r[0] * s, 5390800 + r[1] * s, 420700 + (r[2] + 1) * s, 5390800 + (r[3] + 1) * s];
  }
  const exists = (x, y) => {
    const R = rects();
    if (!R.length) return true; // not known yet: wait
    const [E, N] = WELT.toU(x, y);
    return R.some(r => E > r[0] + 2 && E < r[2] - 2 && N > r[1] + 2 && N < r[3] - 2);
  };
  // loaded: the 10 m terrain of the square, or a drawn tile
  const ready = (x, y) => insideRB(x, y) || WELT.heightAt(x, y) !== undefined;
  S.ready_ = ready;
  // ---------------- the edge (vehicles/vehicle.js) ----------------
  VEH.edge = v => {
    const s = v.st,
      B = v.spec.box,
      f = VEH.fwd(s.psi),
      rg = VEH.rgt(s.psi);
    let ok = true;
    for (const [i, j] of [
      [1, 1],
      [-1, 1],
      [1, -1],
      [-1, -1],
    ]) {
      const x = s.x + rg[0] * B.hw * i + f[0] * (B.cy + B.hl * j),
        y = s.y + rg[1] * B.hw * i + f[1] * (B.cy + B.hl * j);
      if (!ready(x, y)) {
        ok = false;
        if (!exists(x, y)) return 'end';
      }
    }
    if (ok) return null;
    S.waitT = performance.now();
    return 'wait';
  };
  // the speed limit before ground that is not there (yet): braking from 3.5 m/s² so that it stops 8 m before
  VEH.limit = (v, inp) => {
    const cap = S.cap,
      s = v.st,
      sp = Math.abs(s.u);
    if (!(cap < 99) || sp < cap - 1.2) return inp;
    if (sp < cap + 0.3) return { thr: 0, brk: 0, steer: inp.steer, hand: inp.hand };
    const k = Math.min(1, (sp - cap) * 0.35 + 0.25);
    return s.u > 0
      ? { thr: 0, brk: k, steer: inp.steer, hand: false }
      : { thr: k, brk: 0, steer: inp.steer, hand: false };
  };
  const _p = [0, 0];
  // walls of the zones beyond the square (KERN.pushOut answers inside a zone): three circles along the box
  VEH.hitsOut = (A, z0, z1, hits) => {
    if (!S.active || insideRB(A.c[0], A.c[1])) return;
    const r = A.ex,
      L = Math.max(0, A.ey - r);
    for (let k = -1; k <= 1; k++) {
      const cx = A.c[0] + A.ay[0] * L * k,
        cy = A.c[1] + A.ay[1] * L * k;
      _p[0] = cx;
      _p[1] = cy;
      if (!KERN.pushOut(_p, r)) continue;
      const dx = _p[0] - cx,
        dy = _p[1] - cy,
        d = Math.hypot(dx, dy);
      if (!(d > 1e-4 && d < r * 2)) continue;
      hits.push([{ n: [dx / d, dy / d], d, p: [_p[0] - (dx / d) * r, _p[1] - (dy / d) * r] }, null]);
    }
  };
  // ---------------- activation, focus, speed cap ----------------
  let acc = 0,
    farT = 0,
    lastLoad = 0;
  function load() {
    if (S.state !== 'idle' || performance.now() - lastLoad < 20000) return;
    lastLoad = performance.now();
    S.state = 'loading';
    const t0 = performance.now();
    fetch(BASE + 'fahrt/strassen.json')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(j => {
        parse(j);
        S.ready = true;
        S.state = 'ready';
        S.loadMs = Math.round(performance.now() - t0);
        carve(true);
        markDirty(true);
      })
      .catch(e => {
        S.state = 'idle';
        S.err = String(e);
      });
  }
  // the carving goes under the pads of the zones (welt/welt.js sorts 'under' last)
  let carved = false;
  function carve(on) {
    if (!WELT.setPads || on === carved || !D.ways.length) return;
    carved = on;
    if (!on) return WELT.setPads('fahrt', []);
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    for (const w of D.ways) {
      x0 = Math.min(x0, w.bb[0]);
      y0 = Math.min(y0, w.bb[1]);
      x1 = Math.max(x1, w.bb[2]);
      y1 = Math.max(y1, w.bb[3]);
    }
    x0 -= 30;
    y0 -= 30;
    x1 += 30;
    y1 += 30;
    WELT.setPads('fahrt', [{ poly: [x0, y0, x1, y0, x1, y1, x0, y1], z: carveZ, under: true }]);
  }
  function tick(dt) {
    acc += dt;
    const v = VEH.cur,
      walk = P.mode === 'walk',
      vx = v ? v.st.x : P.x,
      vy = v ? v.st.y : P.y,
      d = outRB(vx, vy);
    // awake: a driven vehicle within 350 m of the edge, or anyone outside; asleep again 450 m inside after 10 s
    const want = walk && ((v && d > -350) || d > -30);
    if (want) {
      farT = 0;
      if (!S.active) {
        S.active = true;
        WELT.need('fahrt', true);
        if (WELT.addSet) WELT.addSet(VESSRA);
        if (S.ready) carve(true);
      }
      if (!S.ready) load();
    } else if (S.active) {
      farT += dt;
      if (farT > 10 && (!walk || d < -450)) {
        S.active = false;
        WELT.need('fahrt', false);
        WELT.keep = 0;
        S.cap = Infinity;
        dropAll();
      }
    }
    if (!S.active) return;
    // the tiles ahead of a moving vehicle; behind it they go sooner
    if (v) {
      const s = v.st,
        sp = Math.abs(s.u),
        f = VEH.fwd(s.psi),
        sg = s.u < 0 ? -1 : 1,
        ah = Math.min(110, sp * 4);
      S.fx = s.x + f[0] * ah * sg;
      S.fy = s.y + f[1] * ah * sg;
      S.focusOn = sp > 2;
      WELT.keep = sp > 8 ? 12000 : 0;
      // the speed cap: the first point straight ahead (in the direction of travel) without loaded ground
      let cap = Infinity;
      if (d > -260) {
        const need = (sp * sp) / 7 + 30;
        for (let k = 0; k < 14; k++) {
          const dd = 6 + k * k * 1.6;
          if (dd > need) break;
          const x = s.x + f[0] * dd * sg,
            y = s.y + f[1] * dd * sg;
          if (!ready(x, y)) {
            cap = Math.sqrt(2 * 3.5 * Math.max(0, dd - 8));
            S.capEnd = !exists(x, y);
            break;
          }
        }
      }
      S.cap = cap;
      if (cap < sp - 0.5 && performance.now() - (S.msgT || 0) > 5000) {
        S.msgT = performance.now();
        PLAY.think(S.capEnd ? 'Hier endet die Karte.' : 'Gelände lädt …', 2200);
      }
    } else {
      S.focusOn = false;
      S.cap = Infinity;
      WELT.keep = 0;
    }
    if (acc > 0.5) {
      acc = 0;
      if (S.ready) near(vx, vy);
    }
  }
  WELT.focus = () => (S.active && S.focusOn && VEH.cur ? [S.fx, S.fy] : null);
  (window.TICKS || (window.TICKS = [])).push(dt => {
    try {
      tick(dt);
    } catch (e) {
      if (!S._err) {
        S._err = 1;
        console.warn('fahrt', e);
      }
    }
  });
  // ---------------- near the vehicle: bridge decks with railings, signs ----------------
  const matDeck = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.8,
    metalness: 0,
    envMapIntensity: 0.7,
  });
  const built = new Map(); // key → { meshes, extra }
  function dropKey(k) {
    const b = built.get(k);
    if (!b) return;
    for (const m of b.meshes) {
      scene.remove(m);
      m.geometry.dispose();
      if (m.userData.own) {
        for (const mm of [].concat(m.material)) {
          if (mm.map) mm.map.dispose();
          mm.dispose();
        }
      }
    }
    for (const x of b.extra || []) {
      const i = VEH.extra.indexOf(x);
      if (i >= 0) VEH.extra.splice(i, 1);
    }
    built.delete(k);
    S.n.dropped++;
  }
  function dropAll() {
    for (const k of [...built.keys()]) dropKey(k);
    S.signs = [];
    S.decks = [];
    carve(false);
    markDirty(true);
  }
  function addMesh(m, name) {
    m.name = 'fahrt ' + name;
    m.userData.noMerge = true;
    m.castShadow = false;
    m.receiveShadow = false;
    scene.add(m);
    return m;
  }
  // a little geometry kit: boxes with vertex colours in site coordinates (x east, y north, z up), turned by the azimuth a
  function kit() {
    const pos = [],
      col = [],
      nrm = [],
      idx = [];
    const box = (cx, cy, z0, sx, sy, sz, az, c) => {
      const ca = Math.cos(az),
        sa = Math.sin(az);
      // local x right (across), y forward (along az)
      const P8 = [];
      for (const [i, j, k] of [
        [-1, -1, 0],
        [1, -1, 0],
        [1, 1, 0],
        [-1, 1, 0],
        [-1, -1, 1],
        [1, -1, 1],
        [1, 1, 1],
        [-1, 1, 1],
      ]) {
        const lx = (i * sx) / 2,
          ly = (j * sy) / 2;
        P8.push([cx + lx * ca + ly * sa, cy - lx * sa + ly * ca, z0 + k * sz]);
      }
      const F = [
        [0, 1, 2, 3, [0, 0, -1]],
        [4, 7, 6, 5, [0, 0, 1]],
        [0, 4, 5, 1, null],
        [1, 5, 6, 2, null],
        [2, 6, 7, 3, null],
        [3, 7, 4, 0, null],
      ];
      for (const [a, b, c2, d] of F) {
        const n0 = pos.length / 3,
          A = P8[a],
          B = P8[b],
          C = P8[c2],
          u = [B[0] - A[0], B[1] - A[1], B[2] - A[2]],
          w = [C[0] - A[0], C[1] - A[1], C[2] - A[2]],
          n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]],
          L = Math.hypot(n[0], n[1], n[2]) || 1;
        for (const q of [A, B, C, P8[d]]) {
          pos.push(q[0], q[2], -q[1]);
          nrm.push(n[0] / L, n[2] / L, -n[1] / L);
          col.push(c[0], c[1], c[2]);
        }
        idx.push(n0, n0 + 2, n0 + 1, n0, n0 + 3, n0 + 2);
      }
    };
    const geo = () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
      g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
      g.setIndex(idx);
      g.computeBoundingSphere();
      return g;
    };
    return { box, geo, n: () => pos.length };
  }
  const lin = c => c.map(v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
  const C_DECK = lin([0.34, 0.34, 0.35]),
    C_SIDE = lin([0.6, 0.59, 0.56]),
    C_RAIL = lin([0.72, 0.74, 0.76]),
    C_POST = lin([0.62, 0.63, 0.64]),
    C_BACK = lin([0.55, 0.56, 0.57]);
  function buildDeck(w) {
    const K = kit(),
      p = w.p,
      extra = [];
    for (let i = 0; i < w.n - 1; i++) {
      const ax = p[i * 3],
        ay = p[i * 3 + 1],
        az = p[i * 3 + 2],
        bx = p[i * 3 + 3],
        by = p[i * 3 + 4],
        bz = p[i * 3 + 5],
        L = Math.hypot(bx - ax, by - ay);
      if (L < 0.2) continue;
      const a = Math.atan2(bx - ax, by - ay),
        mx = (ax + bx) / 2,
        my = (ay + by) / 2,
        // the deck: as the road on the bridge, a little crown left out
        mz = edgeBlend(mx, my, (az + bz) / 2),
        hw = w.hw + 0.5;
      // short boxes along the segment follow its slope in steps of 2 m
      const steps = Math.max(1, Math.ceil(L / 2));
      for (let k = 0; k < steps; k++) {
        const t = (k + 0.5) / steps,
          x = ax + (bx - ax) * t,
          y = ay + (by - ay) * t,
          z = edgeBlend(x, y, az + (bz - az) * t),
          l = L / steps + 0.05;
        K.box(x, y, z - 0.02, hw * 2, l, 0.03, a, C_DECK);
        K.box(x, y, z - 0.75, hw * 2 + 0.2, l, 0.73, a, C_SIDE);
        for (const sd of [-1, 1]) {
          const rx = x + Math.cos(a) * (hw - 0.12) * sd,
            ry = y - Math.sin(a) * (hw - 0.12) * sd;
          K.box(rx, ry, z, 0.25, l, 0.32, a, C_SIDE);
          K.box(rx, ry, z + 0.95, 0.07, l, 0.07, a, C_RAIL);
          if (k % 2 === 0) K.box(rx, ry, z + 0.3, 0.06, 0.06, 0.66, a, C_RAIL);
        }
      }
      // the railings hold the wheels (vehicles/vehicle.js guides)
      for (const sd of [-1, 1]) {
        const cx = mx + Math.cos(a) * (hw + 0.05) * sd,
          cy = my - Math.sin(a) * (hw + 0.05) * sd,
          f = [Math.sin(a), Math.cos(a)],
          r = [Math.cos(a), -Math.sin(a)];
        extra.push({
          guide: true,
          box: () => ({ c: [cx, cy], ax: r, ay: f, ex: 0.15, ey: L / 2 + 0.3, z0: mz - 1.5, z1: mz + 1.5 }),
        });
      }
    }
    const m = addMesh(new THREE.Mesh(K.geo(), matDeck), 'brücke');
    for (const x of extra) VEH.extra.push(x);
    return { meshes: [m], extra };
  }
  // ---- signs: a canvas per sign (front and back), panel and posts ----
  const YEL = '#f2b705',
    BLK = '#141414';
  function fitText(g, txt, x, y, maxW, px, weight = 700) {
    let s = px;
    g.font = `${weight} ${s}px "DIN Alternate", "Roboto Condensed", "Arial Narrow", Arial, sans-serif`;
    while (g.measureText(txt).width > maxW && s > 10) {
      s -= 2;
      g.font = `${weight} ${s}px "DIN Alternate", "Roboto Condensed", "Arial Narrow", Arial, sans-serif`;
    }
    g.fillText(txt, x, y);
  }
  function frame(g, W, H) {
    g.fillStyle = YEL;
    g.fillRect(0, 0, W, H);
    g.strokeStyle = BLK;
    g.lineWidth = H * 0.045;
    const m = H * 0.06;
    g.beginPath();
    g.roundRect ? g.roundRect(m, m, W - 2 * m, H - 2 * m, H * 0.05) : g.rect(m, m, W - 2 * m, H - 2 * m);
    g.stroke();
  }
  function signTex(sg) {
    const W = 384,
      H = 256,
      cv = document.createElement('canvas');
    cv.width = W * 2;
    cv.height = H;
    const g = cv.getContext('2d');
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    // front (left half)
    g.save();
    frame(g, W, H);
    g.fillStyle = BLK;
    if (sg.t === 'ort') {
      fitText(g, sg.n, W / 2, H * 0.42, W * 0.84, 82);
      fitText(g, sg.m || '', W / 2, H * 0.72, W * 0.8, 30, 600);
    } else {
      // a direction sign: the destination, its distance, an arrow
      const arrow = { l: '←', r: '→', g: '↑' }[sg.dir] || '↑';
      fitText(g, arrow + ' ' + sg.n, W / 2, H * 0.42, W * 0.84, 66);
      fitText(g, String(sg.km).replace('.', ',') + ' km', W / 2, H * 0.74, W * 0.6, 44, 600);
    }
    g.restore();
    // back (right half): the end of the place – the next place above, this one struck through
    g.save();
    g.translate(W, 0);
    if (sg.t === 'ort') {
      frame(g, W, H);
      g.fillStyle = BLK;
      if (sg.b) fitText(g, sg.b, W / 2, H * 0.3, W * 0.8, 50);
      fitText(g, sg.n, W / 2, sg.b ? H * 0.66 : H * 0.5, W * 0.8, sg.b ? 50 : 70);
      g.strokeStyle = '#c4161c';
      g.lineWidth = H * 0.07;
      g.beginPath();
      g.moveTo(W * 0.12, H * 0.88);
      g.lineTo(W * 0.88, H * 0.18);
      g.stroke();
    } else {
      g.fillStyle = '#8e9093';
      g.fillRect(0, 0, W, H);
    }
    g.restore();
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  function buildSign(sg) {
    const K = kit(),
      az = (sg.h * Math.PI) / 180,
      // the panel faces az: its normal is (sin az, cos az); across it runs (cos az, -sin az)
      nx = Math.sin(az),
      ny = Math.cos(az),
      ax = Math.cos(az),
      ay = -Math.sin(az),
      gz = KERN.ground(sg.x, sg.y),
      Wd = sg.t === 'ort' ? Math.max(1.05, Math.min(1.9, 0.62 + sg.n.length * 0.075)) : 1.3,
      Hd = sg.t === 'ort' ? 0.7 : 0.62,
      z0 = gz + 1.55;
    for (const sd of [-1, 1])
      K.box(sg.x + ax * sd * Wd * 0.32, sg.y + ay * sd * Wd * 0.32, gz - 0.3, 0.07, 0.07, 2.25 + Hd, az, C_POST);
    K.box(sg.x - nx * 0.03, sg.y - ny * 0.03, z0 - 0.02, Wd + 0.02, 0.025, Hd + 0.04, az, C_BACK);
    const posts = addMesh(new THREE.Mesh(K.geo(), matDeck), 'schild pfosten');
    // the panel: two quads, the front facing az and the back facing away, each with its half of the canvas
    const pos = [],
      uv = [],
      nrm = [],
      idx = [];
    const quad = (off, sgn, u0, u1) => {
      const n0 = pos.length / 3,
        cx = sg.x + nx * off,
        cy = sg.y + ny * off;
      for (const [s, h, u, v] of [
        [-1, 0, u0, 0],
        [1, 0, u1, 0],
        [1, 1, u1, 1],
        [-1, 1, u0, 1],
      ]) {
        const sx = s * sgn;
        pos.push(cx + ax * sx * (Wd / 2), z0 + h * Hd, -(cy + ay * sx * (Wd / 2)));
        nrm.push(nx * sgn, 0, -ny * sgn);
        uv.push(u, v);
      }
      idx.push(n0, n0 + 1, n0 + 2, n0, n0 + 2, n0 + 3);
    };
    quad(0.004, 1, 0, 0.5);
    quad(-0.03, -1, 0.5, 1);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx);
    g.computeBoundingSphere();
    const panel = addMesh(
      new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: signTex(sg), roughness: 0.55, metalness: 0 })),
      'schild ' + sg.n
    );
    panel.userData.own = true;
    return { meshes: [posts, panel] };
  }
  function near(x, y) {
    // the ground near the square is the 10 m terrain: signs there wait until the vehicle comes
    let ch = false;
    const want = new Set();
    D.signs.forEach((sg, i) => {
      if (Math.hypot(sg.x - x, sg.y - y) < 450) want.add('s' + i);
    });
    D.ways.forEach((w, i) => {
      if (w.fl & 1 && x > w.bb[0] - 500 && x < w.bb[2] + 500 && y > w.bb[1] - 500 && y < w.bb[3] + 500)
        want.add('b' + i);
    });
    for (const k of [...built.keys()])
      if (!want.has(k)) {
        const sg = k[0] === 's' ? D.signs[+k.slice(1)] : null,
          w = k[0] === 'b' ? D.ways[+k.slice(1)] : null,
          far = sg
            ? Math.hypot(sg.x - x, sg.y - y) > 650
            : w
              ? !(x > w.bb[0] - 700 && x < w.bb[2] + 700 && y > w.bb[1] - 700 && y < w.bb[3] + 700)
              : true;
        if (far) {
          dropKey(k);
          ch = true;
        }
      }
    let n = 0;
    for (const k of want) {
      if (built.has(k) || n >= 2) continue;
      const i = +k.slice(1);
      if (k[0] === 's') {
        const sg = D.signs[i];
        // the ground under the sign must be there (tiles), else next time
        if (!ready(sg.x, sg.y)) continue;
        built.set(k, buildSign(sg));
      } else {
        const w = D.ways[i];
        if (!ready(w.p[0], w.p[1])) continue;
        built.set(k, buildDeck(w));
      }
      S.n.built++;
      n++;
      ch = true;
    }
    S.signs = [...built.keys()].filter(k => k[0] === 's').map(k => D.signs[+k.slice(1)].n);
    S.decks = [...built.keys()].filter(k => k[0] === 'b').length;
    if (ch) markDirty(true);
  }
  // ---------------- the small map: roads beyond the square, the two routes, where the vehicle heads ----------------
  const COLK = ['#f2a07a', '#ffd27a', '#fff0a8', '#ffffff', '#e8e4dc', '#e8e4dc'],
    WID = [4.5, 3.6, 3.2, 2.6, 2.2, 1.8];
  if (MMAP) {
    MMAP.more = (g, Pf, cx, cy, R2) => {
      if (!S.ready || !S.active) return;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      for (let k = 5; k >= 0; k--) {
        g.strokeStyle = COLK[k];
        g.lineWidth = WID[k];
        g.beginPath();
        for (const w of D.ways) {
          if (w.kind !== k || w.bb[2] < cx - R2 || w.bb[0] > cx + R2 || w.bb[3] < cy - R2 || w.bb[1] > cy + R2)
            continue;
          for (let i = 0; i < w.n; i++) {
            const q = Pf(w.p[i * 3], w.p[i * 3 + 1]);
            i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]);
          }
        }
        g.stroke();
      }
      g.strokeStyle = 'rgba(120,210,255,0.8)';
      g.lineWidth = 3.5;
      for (const k in D.routes) {
        const r = D.routes[k];
        g.beginPath();
        for (let i = 0; i < r.length; i += 2) {
          const q = Pf(r[i], r[i + 1]);
          i ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]);
        }
        g.stroke();
      }
    };
    // the label: the destination the vehicle heads for (Markt Schleusingen, Baumschule Kammbach, the garden)
    MMAP.dest = (cx, cy, psi) => {
      if (!S.ready || !S.active) return null;
      const T = [['Garten', GARDEN[0], GARDEN[1]]];
      const rm = D.routes.markt,
        rb = D.routes.baumschule;
      if (rm) T.push(['Markt Schleusingen', rm[rm.length - 2], rm[rm.length - 1]]);
      if (rb) T.push(['Baumschule', rb[rb.length - 2], rb[rb.length - 1]]);
      let best = null,
        bs = -2;
      for (const t of T) {
        const dx = t[1] - cx,
          dy = t[2] - cy,
          d = Math.hypot(dx, dy);
        if (d < 40) continue;
        const sc = (dx * Math.sin(psi) + dy * Math.cos(psi)) / d;
        if (sc > bs) {
          bs = sc;
          best = [t[0], d];
        }
      }
      return best;
    };
  }
  // ---------------- tests and the error report ----------------
  S.status = () => ({
    on: S.on,
    active: S.active,
    state: S.state,
    ready: !!S.ready,
    ways: D.ways.length,
    signsNear: S.signs.slice(),
    decks: S.decks,
    built: S.n.built,
    dropped: S.n.dropped,
    cap: Number.isFinite(S.cap) ? +S.cap.toFixed(1) : null,
    carved,
    loadMs: S.loadMs || 0,
    err: S.err,
    welt: WELT.state(),
  });
  S.data = D;
  return S;
})();
window.FAHRT = FAHRT;
