// Suhl runtime, the package (dist/lazy/suhl.js): loaded by welt/suhl.js when its zone builds (or when a caller asks for data).
// It imports nothing of the app – three.js, KERN, WELT and the rest are handed in (ctx); its own parts live in lazy/suhl/** and are
// bundled in; the heavy work runs in the module worker lazy/suhl-worker.js. Not in modules.txt.
//   start(ctx) → the index of the data (aktuell.json, the products' indexes) and the functions welt/suhl.js forwards to (SUHL.*)
//   enter()    the zone is built: from now on tick(dt) streams by distance – far ground and warm shaders from 2.5 km before Suhl's
//              ground, the near ground (WELT) from 900 m, buildings and trees per tile (lazy/suhl/kern/stadt.js)
//   leave()    everything of Suhl out of the scene and the memory; the index stays
import { frame, LIVE } from './suhl/kern/geo.js';
import { loadIndex, SCHEMA } from './suhl/kern/index.js';
import { boden } from './suhl/kern/boden.js';
import { stadt } from './suhl/kern/stadt.js';
import { strassen } from './suhl/kern/strassen.js';
import { ampeln } from './suhl/kern/ampeln.js';
import { zeichen } from './suhl/kern/zeichen.js';
import { laeden } from './suhl/kern/laeden.js';
import { brunnen } from './suhl/kern/brunnen.js';
import { tuerme } from './suhl/kern/tuerme.js';
import { wasser } from './suhl/kern/wasser.js';
import { autos } from './suhl/kern/autos.js';
import { probe } from './suhl/kern/probe.js';
// the worker behind promises: ask({ op, … }, [transfer]) → the answer
function workerOf(url, xf) {
  let w = null,
    seq = 0;
  const open = new Map();
  const up = () => {
    if (w) return w;
    w = new Worker(url, { type: 'module' });
    w.onmessage = ev => {
      const m = ev.data,
        p = open.get(m.id);
      if (!p) return;
      open.delete(m.id);
      if (m.ok) p[0](m);
      else p[1](new Error(m.err));
    };
    w.onerror = ev => {
      for (const p of open.values()) p[1](new Error('worker: ' + (ev.message || 'error')));
      open.clear();
    };
    w.postMessage({ id: 0, op: 'init', xf });
    return w;
  };
  return {
    ask(msg, transfer) {
      return new Promise((res, rej) => {
        const id = ++seq;
        open.set(id, [res, rej]);
        up().postMessage(Object.assign({ id }, msg), transfer || []);
      });
    },
    busy: () => open.size,
    stop() {
      if (w) w.terminate();
      w = null;
      for (const p of open.values()) p[1](new Error('worker stopped'));
      open.clear();
    },
  };
}
const WARM = 2500, // far ground and shaders from this distance to Suhl's ground (m)
  NEAR = 900; // the near ground (WELT, its rings reach 760 m) from this distance
export async function start(ctx) {
  const { KERN, WELT, P, cam, markDirty } = ctx,
    G = frame(ctx.xf),
    base = new URL(ctx.base, document.baseURI).href,
    worker = workerOf(ctx.worker, ctx.xf),
    t0 = performance.now(),
    IX = await loadIndex(base),
    MARKT = [-4639.4, 12476.5],
    areas = () => ctx.SUHL.areas,
    B = boden(ctx, G, IX, worker),
    // the foot z0 of the building records counts only while they were computed on the ground that is valid now (contract, section 3)
    z0ok = () => !!(IX.prod.g && IX.prod.boden && IX.prod.g.basedOn && IX.prod.g.basedOn.boden === IX.prod.boden.v),
    C = stadt(ctx, G, IX, worker, { old: [MARKT[0], MARKT[1], 520], areas, z0ok }),
    ST = strassen(ctx, G, IX),
    AM = ST.on ? ampeln(ctx, ST) : null,
    ZE = ST.on ? zeichen(ctx, ST) : null,
    LA = C.on ? laeden(ctx, C) : null,
    BR = ST.on ? brunnen(ctx, ST) : null,
    TU = C.on ? tuerme(ctx, C) : null,
    WA = ST.on ? wasser(ctx, ST) : null,
    AU = ST.on ? autos(ctx, ST) : null,
    T = { index: Math.round(performance.now() - t0), enter: 0, warm: 0, first: 0 },
    A = { on: false, stage: 0, d: 1e9, quarter: null, mem0: null };
  // ---- the drive (welt/fahrt.js, round 2 of the roads system) asks a zone with ground of its own where that ground is: true (drawn
  // there), false (Suhl's land, the near tiles still loading – the vehicle waits instead of „Hier endet die Karte“), undefined (not
  // Suhl's land, or Suhl is not built). Registered once per page; the drive has no way to take it back. ----
  if (window.FAHRT && typeof window.FAHRT.ground === 'function' && !ctx.SUHL._fahrtGround) {
    ctx.SUHL._fahrtGround = true;
    window.FAHRT.ground((x, y) => (A.on && B.on && B.covers(x, y) ? WELT.heightAt(x, y) !== undefined : undefined));
  }
  // ---- the observer: the walker, else the camera; from above the height of the picture counts ----
  const top = () => (P.mode === 'top' ? P.th : 0),
    where = () => (P.mode === 'top' ? [P.tx, P.ty] : KERN.where() || [cam.position.x, -cam.position.z]);
  // ---- which area the observer is in (zentrum before kernstadt before stadt; quarters once their outlines come with the data) ----
  const inArea = (a, x, y) => Math.hypot(x - a.center[0], y - a.center[1]) <= a.r;
  function areaAt(x, y) {
    let best = null;
    for (const a of Object.values(areas())) if (inArea(a, x, y) && (!best || a.r < best.r)) best = a;
    return best ? best.id : null;
  }
  const mem = () => {
    const m = ctx.R.info.memory;
    return { geo: m.geometries, tex: m.textures, progs: (ctx.R.info.programs || []).length };
  };
  let acc = 0;
  function tick(dt) {
    if (!A.on) return;
    const o = where(),
      d = B.on ? B.distBox(o[0], o[1]) : 1e9;
    A.d = d;
    const far = d < WARM;
    if (far && !A.warmed) {
      // before the first mesh of Suhl can be seen: the one new program, the ground set known to WELT
      const tw = performance.now();
      A.warmed = true;
      B.register();
      if (C.on) C.warm();
      T.warm = Math.round(performance.now() - tw);
    }
    if (B.on) {
      B.setNeed(d < NEAR);
      B.tick(dt, o, far);
    }
    if (C.on && far) C.tick(dt, o, top());
    if (ST.on) ST.tick(dt, o, d < NEAR);
    // the things of the street space near the observer: hidden when the observer is far or high above
    const close = d < NEAR && top() < 150;
    for (const X of [AM, ZE, LA, BR, TU, WA, AU]) if (X) close ? X.tick(dt, o) : X.away();
    if (!T.first && C.on && C.n.built > 0) T.first = Math.round(performance.now() - T.t0);
    acc += dt;
    if (acc > 1) {
      acc = 0;
      const q = areaAt(o[0], o[1]);
      if (q !== A.quarter) {
        KERN.emit('suhl:quarter', { id: q, prev: A.quarter });
        A.quarter = q;
      }
      // the places to jump to stand on the ground once it is known there
      for (const [k, sp] of Object.entries(ctx.SUHL.SPOTS || {})) {
        const z = api.ground(sp[0][0], sp[0][1]);
        if (z !== undefined && Math.abs((KERN.spot(k) || {}).z - z) > 0.05) KERN.spot(k, { z });
      }
    }
  }
  const api = {
    version: IX.version,
    areas: {},
    probe: probe(ctx, worker),
    async enter() {
      A.on = true;
      A.warmed = false;
      A.mem0 = mem();
      T.t0 = performance.now();
      T.first = 0;
    },
    leave() {
      A.on = false;
      B.leave();
      C.leave();
      if (AM) AM.leave();
      if (ZE) ZE.leave();
      if (LA) LA.leave();
      if (BR) BR.leave();
      if (TU) TU.leave();
      if (WA) WA.leave();
      if (AU) AU.leave();
      if (ST.on) ST.clear();
      worker.stop();
      A.warmed = false;
      markDirty(true);
    },
    tick,
    covers: (x, y) => B.on && B.covers(x, y),
    ownFade: (x, y) => (B.on ? B.ownFade(x, y) : 1),
    pushOut: (p, r) => (C.on ? C.pushOut(p, r) : undefined),
    place(x, y) {
      if (!B.on || !B.covers(x, y)) return undefined;
      const n = ST.on ? ST.nameAt(x, y) : null;
      return n ? n + ', Suhl' : areaAt(x, y) === 'zentrum' ? 'Suhl, Zentrum' : 'Suhl';
    },
    // KERN 'ground' above the tiles: street and pavement surfaces (stage 3) – nothing yet, the tiles of WELT answer
    surface: () => undefined,
    // KERN 'terrain'/'ground' below the tiles: the far ground while the near tiles are not in yet
    terrainFar: (x, y) => (A.on && B.on ? B.heightFar(x, y) : undefined),
    // SUHL.ground: the ground one stands on (near tiles before the far ground), undefined outside Suhl's ground
    ground(x, y) {
      if (!B.on || !B.covers(x, y)) return undefined;
      const z = WELT.heightAt ? WELT.heightAt(x, y) : undefined;
      return z !== undefined ? z : B.heightFar(x, y);
    },
    areaAt,
    quarters: () => Object.values(areas()).filter(a => a.kind === 'viertel'),
    levelAt: (x, y) => (C.on ? C.levelAt(x, y) : -1),
    whenLevel: (x, y, n) => C.whenLevel(x, y, n === undefined ? 1 : n),
    building: id => (C.on ? C.building(id) : null),
    buildingAsync: async id => (C.on ? C.building(id) : null),
    buildingAt: (x, y) => (C.on ? C.buildingAt(x, y) : null),
    buildingsIn: a => (C.on ? C.buildingsIn(a) : []),
    // a hand-built replacement for one building (landmarks, interiors – stage 3): kept here, built by lazy/suhl-nah.js later
    detail(id, def) {
      api.details.set(String(id), def);
      return () => api.details.delete(String(id));
    },
    details: new Map(),
    override: (id, patch) => C.on && C.override(String(id), patch),
    reset: id => C.on && C.reset(id === undefined ? undefined : String(id)),
    add: rec => (C.on ? C.add(rec) : null),
    remove: id => C.on && C.remove(id),
    ways: (cx, cy, r) => (ST.on ? ST.ways(cx, cy, r === undefined ? 300 : r) : []),
    stops: () => [],
    signal: () => null,
    data: {
      // the numbers of a building for scenarios: what the record's d holds (computed in UTM by the pipeline, true m²: fa footprint,
      // gfa gross floor area, vol volume, rf roof area, ro roof area by direction, ru usable roof, res residents, heat, pv) with the
      // roof faces – nothing is computed from model geometry here
      building(id) {
        const b = api.building(id);
        if (!b) return null;
        const d = b.raw.d || {};
        return {
          id: b.id,
          quarter: b.quarter,
          use: b.use,
          era: b.era,
          levels: d.lv ?? b.levels,
          footprint: d.fa ?? null,
          floorArea: d.gfa ?? null,
          height: b.h,
          volume: d.vol ?? null,
          roof: b.roof.map(r => ({ area: r.area, areaPlan: r.areaPlan, az: r.az, slope: r.slope, cls: r.cls })),
          roofArea: d.rf ?? null,
          roofByDir: d.ro ?? null,
          roofUsable: d.ru ?? null,
          roofFlat: b.roofForm === 0,
          residents: d.res ?? null,
          heat: d.heat ?? null,
          pvKwp: d.pv ?? null,
          listed: b.flags.listed,
          vacant: b.flags.vacant,
          q: Object.assign({}, b.q, d.q !== undefined ? { d: d.q } : {}),
          src: b.raw.src || null,
        };
      },
      roofPlanes(id) {
        const b = api.building(id);
        return b
          ? b.roof.map((r, i) => ({ i, pts: r.pts, tris: r.tris, cls: r.cls, area: r.area, az: r.az, slope: r.slope }))
          : null;
      },
      quarter: () => null,
      async each(area, fn) {
        for (const id of api.buildingsIn(area)) fn(api.data.building(id));
      },
      meta: {
        schema: SCHEMA,
        versions: IX.version,
        attribution: Object.fromEntries(
          Object.values(IX.prod).map(p => [p.name, (p.index && p.index.attribution) || ''])
        ),
      },
    },
    status: () => ({
      on: A.on,
      d: Math.round(A.d),
      quarter: A.quarter,
      versions: IX.version,
      skipped: IX.skipped,
      products: Object.fromEntries(Object.values(IX.prod).map(p => [p.name, p.err ? 'Fehler: ' + p.err : 'v' + p.v])),
      boden: B.on ? B.state() : null,
      stadt: C.on ? C.state() : null,
      strassen: ST.on ? ST.state() : null,
      ampeln: AM ? AM.state() : null,
      zeichen: ZE ? ZE.state() : null,
      laeden: LA ? LA.state() : null,
      brunnen: BR ? BR.state() : null,
      tuerme: TU ? TU.state() : null,
      wasser: WA ? WA.state() : null,
      autos: AU ? AU.state() : null,
      worker: worker.busy(),
      live: Object.assign({}, LIVE),
      times: T,
      mem0: A.mem0,
      mem: mem(),
    }),
    _: { B, C, ST, G, IX },
  };
  return api;
}
