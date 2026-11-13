// ===================== Suhl: the registration of the city (SUHL) – everything else is loaded when one gets there =====================
// Suhl lies ~13 km north-north-west of the garden. This small module is all of Suhl in the page: one zone of core/kern.js around the
// whole municipality, the places to jump to, the start situation ?szenario=suhl, and the contract SUHL.* as a shell. No request at
// the start. When the zone builds, the package dist/lazy/suhl.js comes (src/lazy/suhl.js and src/lazy/suhl/**, with its worker
// lazy/suhl-worker.js): index, streaming by distance, detail levels, ground and collisions for KERN. A package cannot import modules
// of the app (it is bundled on its own – a second three.js otherwise), so everything it needs is handed in here (ctx).
// Data: SUHL.BASE – the data repo's GitHub Pages (same origin as the site), ?suhl=<url> for another base, the local test server
// serves dist/suhl/ (the test puts viz3/extra/suhl-laufzeit/probe there). ?suhl=1 shows the menu entry (hidden until Falko has seen the city).
// Contract and plan: docs/features/suhl.md, docs/plans/plan_suhl.md (sections 3 and 6).
import * as THREE from 'three';
import { BASE, COARSE, QS, R, cam, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { ANISO, markDirty } from '../core/assets.js';
import { TREES } from '../garden/trees.js';
import { warmUp } from '../render/render.js';
import { P } from '../game/walkable.js';
import { go } from '../game/player.js';
import { RATSCHER } from '../world/ratscher.js';
import { VILLAGE } from '../world/village.js';
import { WELT } from './welt.js';
export const SUHL = (() => {
  const M = window.GEOMAN,
    q = QS.get('suhl'),
    S = { on: false, state: 'idle', O: [-4698.2, 12255.7], BASE: '', version: null, err: '', areas: {}, data: {} };
  if (!M || !M.xf || !WELT.on) return S;
  S.on = true;
  // ---- where the data live: ?suhl=<url>, the data repo beside the site, or dist/suhl/ of a test server ----
  S.BASE = (() => {
    if (q && q !== '1') return q.endsWith('/') ? q : q + '/';
    const k = location.pathname.indexOf('/pavillon-ratscher/');
    return k >= 0 ? location.origin + location.pathname.slice(0, k) + '/pavillon-daten/suhl/' : 'suhl/';
  })();
  S.MENU = q !== null;
  // ---- model metres (x east, y north) <-> ETRS89 / UTM 32N <-> WGS84 (Krüger series; exact to a millimetre) ----
  const { a: XA, b: XB, ex: EX, ey: EY } = M.xf,
    S2 = XA * XA + XB * XB,
    n = 1 / (2 * 298.257222101 - 1),
    AK = (6378137 / (1 + n)) * (1 + (n * n) / 4 + n ** 4 / 64) * 0.9996,
    AL = [n / 2 - (2 * n * n) / 3 + (5 * n ** 3) / 16, (13 * n * n) / 48 - (3 * n ** 3) / 5, (61 * n ** 3) / 240],
    BE = [n / 2 - (2 * n * n) / 3 + (37 * n ** 3) / 96, (n * n) / 48 + n ** 3 / 15, (17 * n ** 3) / 480],
    DE = [2 * n - (2 * n * n) / 3 - 2 * n ** 3, (7 * n * n) / 3 - (8 * n ** 3) / 5, (56 * n ** 3) / 15],
    LON0 = (9 * Math.PI) / 180,
    ser = (C, f, g, u, v) => C.reduce((s, c, j) => s + c * f(2 * (j + 1) * u) * g(2 * (j + 1) * v), 0);
  S.toUTM = (x, y) => [XA * x - XB * y + EX, XB * x + XA * y + EY];
  S.fromUTM = (E, N) => [(XA * (E - EX) + XB * (N - EY)) / S2, (-XB * (E - EX) + XA * (N - EY)) / S2];
  S.toModel = (lat, lon) => {
    const ph = (lat * Math.PI) / 180,
      la = (lon * Math.PI) / 180 - LON0,
      c = (2 * Math.sqrt(n)) / (1 + n),
      t = Math.sinh(Math.atanh(Math.sin(ph)) - c * Math.atanh(c * Math.sin(ph))),
      xi = Math.atan2(t, Math.cos(la)),
      eta = Math.atanh(Math.sin(la) / Math.sqrt(1 + t * t));
    return S.fromUTM(
      500000 + AK * (eta + ser(AL, Math.cos, Math.sinh, xi, eta)),
      AK * (xi + ser(AL, Math.sin, Math.cosh, xi, eta))
    );
  };
  S.toLatLon = (x, y) => {
    const [E, N] = S.toUTM(x, y),
      xi = N / AK,
      eta = (E - 500000) / AK,
      x2 = xi - ser(BE, Math.sin, Math.cosh, xi, eta),
      e2 = eta - ser(BE, Math.cos, Math.sinh, xi, eta),
      chi = Math.asin(Math.sin(x2) / Math.cosh(e2)),
      ph = chi + DE.reduce((s, d, j) => s + d * Math.sin(2 * (j + 1) * chi), 0);
    return [(ph * 180) / Math.PI, ((LON0 + Math.atan2(Math.sinh(e2), Math.cos(x2))) * 180) / Math.PI];
  };
  // ---- the areas known without data (circles from tools/suhl/out/bestand/gebiete.geojson; outlines and quarters come with the index) ----
  const area = (id, name, x, y, r, parent) =>
    (S.areas[id] = { id, name, kind: 'gebiet', center: [x, y], r, poly: null, parent });
  area('stadt', 'Stadt Suhl', -4362, 13836, 10337, null);
  area('kernstadt', 'Kernstadt Suhl', -5144, 12775, 6374, 'stadt');
  area('zentrum', 'Zentrum Suhl', -4878, 12316, 899, 'kernstadt');
  // ---- the package: loaded once (zone, or a call that needs data), started with what it may use of the app ----
  let api = null,
    pkgP = null;
  const lazy = name => new URL('lazy/' + name, document.baseURI).href,
    built = [],
    freed = [],
    waiting = []; // calls made before the package came: [name, args, off] – replayed when it starts
  const ctx = () => ({
    THREE,
    KERN,
    WELT,
    RATSCHER,
    VILLAGE,
    TREES,
    SUHL: S,
    scene,
    cam,
    R,
    P,
    COARSE,
    ANISO,
    markDirty,
    warmUp,
    xf: M.xf,
    base: S.BASE,
    worker: lazy('suhl-worker.js'),
    get VEH() {
      return window.VEH;
    },
  });
  S.load = () =>
    pkgP ||
    (pkgP = import(lazy('suhl.js'))
      .then(mod => mod.start(ctx()))
      .then(a => {
        api = a;
        S.version = a.version;
        Object.assign(S.areas, a.areas || {});
        for (const w of waiting.splice(0)) w[2] = a[w[0]](...w[1]);
        return a;
      })
      .catch(e => {
        pkgP = null;
        S.err = String((e && e.message) || e);
        throw e;
      }));
  S.ready = () => S.load().then(() => S);
  S.onBuilt = fn => built.push(fn);
  S.onFreed = fn => freed.push(fn);
  Object.defineProperty(S, 'near', { get: () => S.state === 'ready' });
  // ---- the contract as a shell: questions answer null/undefined until the package is there, the …Async forms load it ----
  const ask = { areaAt: null, levelAt: -1, ground: undefined, building: null, buildingAt: null, signal: null };
  for (const [k, v] of Object.entries(ask)) S[k] = (...a) => (api ? api[k](...a) : v);
  for (const k of ['quarters', 'buildingsIn', 'ways', 'stops']) S[k] = (...a) => (api ? api[k](...a) : []);
  for (const k of ['buildingAsync', 'whenLevel']) S[k] = (...a) => S.load().then(p => p[k](...a));
  for (const k of ['detail', 'override', 'reset', 'add', 'remove'])
    S[k] = (...a) => {
      if (api) return api[k](...a);
      const w = [k, a, null];
      waiting.push(w);
      return () => (waiting.includes(w) ? waiting.splice(waiting.indexOf(w), 1) : typeof w[2] === 'function' && w[2]());
    };
  for (const k of ['building', 'roofPlanes', 'quarter']) S.data[k] = (...a) => (api ? api.data[k](...a) : null);
  S.data.each = (...a) => S.load().then(p => p.data.each(...a));
  Object.defineProperty(S.data, 'meta', { get: () => (api ? api.data.meta : null) });
  S.status = () =>
    Object.assign(
      { state: S.state, base: S.BASE, version: S.version, err: S.err, loaded: !!api },
      { zone: (KERN.zones().find(z => z.id === 'suhl') || { state: '' }).state },
      api ? api.status() : {}
    );
  // ---- places to jump to and the start situation (the heights are set from the ground once it is there) ----
  const SPOTS = {
    suhl: [[-4638.5, 12474.5], 62, 'Suhl (Markt)'], // the middle of the square, clear of the crowns of its trees (10 m)
    suhl_steinweg: [[-4753.5, 12321.8], -131, 'Suhl, Steinweg'], // on the street's axis, 5 m from the houses on both sides (was inside Steinweg 18)
    suhl_bahnhof: [[-5352, 11938], -120, 'Suhl, Bahnhof'],
    suhl_ccs: [[-4990, 12400], -62, 'Suhl, Congress Centrum'],
  };
  S.SPOTS = SPOTS;
  for (const [k, [pos, yaw, label]] of Object.entries(SPOTS))
    KERN.spot(k, { mode: 'walk', pos, z: 60, yaw, pitch: 4, label });
  KERN.scenario('suhl', { label: 'Suhl, Markt', order: 33, menu: S.MENU, run: () => go('suhl') });
  if (S.MENU) {
    // the menu entry until the city is released: only with ?suhl=… (game/input.js has bound its chips before this module runs)
    // the menu was bound before this chip existed (game/hud.js closes it for every data-spot it found): close it here as well
    const there = () => {
      if (window.HUD && HUD.open) HUD.setMenu(false);
      go('suhl');
    };
    const v = document.querySelector('#menu [data-spot="vessra"]');
    if (v) {
      const b = v.cloneNode(false);
      b.dataset.spot = 'suhl';
      b.title = 'Suhl: die Stadt aus Daten (Stufe 2) – wird erst dort geladen';
      b.textContent = 'Suhl';
      b.addEventListener('click', there);
      v.after(b);
    }
    // and a card at the top of the menu's start page (Falko, 13.11.2026: „ich finde nirgendwo einen Button, wo ich nach Suhl
    // kommen kann“ – the chip sits under Hingehen → Weiter weg)
    const r = document.querySelector('#menu [data-page="start"] .mresume');
    if (r) {
      const c = document.createElement('button');
      c.type = 'button';
      c.className = 'mtut';
      c.id = 'suhlbtn';
      c.innerHTML =
        '<b>Nach Suhl</b><span>Vorschau: die Stadt aus Daten – Markt mit Rotem Rathaus, Dianabrunnen, Congress Centrum. ' +
        'Lädt beim ersten Mal etwas.</span>';
      c.addEventListener('click', there);
      r.after(c);
    }
  }
  // one may walk where Suhl's ground is; walls, place names and the ground come from the package (the near ground itself is a tile
  // set of WELT; above it later the street surfaces, below it the far ground while the near tiles are not in yet)
  const live = () => api && S.state === 'ready';
  KERN.provide('free', (x, y) => (live() && api.covers(x, y) ? true : undefined), 10);
  KERN.provide('pushOut', (p, r) => (live() ? api.pushOut(p, r) : undefined), 15);
  KERN.provide('place', (x, y, z) => (live() ? api.place(x, y, z) : undefined), 20);
  KERN.provide('ground', (x, y, z) => (live() ? api.surface(x, y, z) : undefined), 8);
  KERN.provide('ground', (x, y) => (live() ? api.terrainFar(x, y) : undefined), 3);
  KERN.provide('terrain', (x, y) => (live() ? api.terrainFar(x, y) : undefined), 3);
  // Suhl keeps its own ground (the road cut and fill are in its terrain tiles): 0 on it, 1 from 100 m outside – welt/fahrt.js must not
  // carve there (its ownFade for Kloster Veßra; hook F1). Before the package is there nothing of Suhl is drawn: 1.
  S.ownFade = (x, y) => (api ? api.ownFade(x, y) : 1);
  // ---- the way there (S2-7): once the drive wakes (a vehicle heads out of the square, or one stands outside it), the approach ways
  // and the named routes garden → Suhl come into welt/fahrt.js from the data repo – "Suhl" becomes a destination on the small map, the
  // A 73 with its viaducts and the country road lead there. Two small files of the street product (anfahrt.json: the ways outside
  // Suhl's ground, carved as the region's; anfahrt-grund.json: the ways on Suhl's corridor tiles, whose ground already holds the cut),
  // never at the start. Only with ?suhl=… until the city is released (Falko, 13.11.2026: preview first). ----
  const approach = { state: S.MENU ? 'waiting' : 'off', err: '', sets: [] };
  // by bus (S2-7): the world's timetable with Suhl's roads (tools/suhl/bus/fahrplan_suhl.py) – lines 200–203, 300, 400 run on into the
  // city, and its own buses (SNG Suhl/Zella-Mehlis) run; bus/bus.js loads it instead of bus/fahrplan.json (hook B1), only with ?suhl=…
  S.busPlan = S.MENU ? BASE + 'bus/fahrplan_suhl.json' : null;
  S.approach = approach;
  if (S.MENU)
    KERN.until(() => window.FAHRT && FAHRT.add && FAHRT.active, 1e9)
      .then(() => {
        approach.state = 'loading';
        const json = u => fetch(u).then(r => (r.ok ? r.json() : null));
        return json(S.BASE + 'aktuell.json').then(a => {
          const p = a && a.products && a.products.s;
          if (!p || !p.path) return [null, null];
          return Promise.all([json(S.BASE + p.path + 'anfahrt.json'), json(S.BASE + p.path + 'anfahrt-grund.json')]);
        });
      })
      .then(([out, own]) => {
        if (out && FAHRT.add('suhl/anfahrt', out)) approach.sets.push('suhl/anfahrt');
        if (own && FAHRT.add('suhl/anfahrt-grund', own, { carve: false })) approach.sets.push('suhl/anfahrt-grund');
        approach.state = approach.sets.length ? 'in' : 'none';
      })
      .catch(e => {
        approach.state = 'error';
        approach.err = String((e && e.message) || e);
      });
  // ---- the zone: the smallest circle around the municipality plus 1.5 km (the garden, Schleusingen and Kloster Veßra stay outside) ----
  KERN.zone({
    id: 'suhl',
    x: -4362,
    y: 13836,
    near: 11800,
    far: 12400,
    keep: 60,
    build: async () => {
      S.state = 'loading';
      try {
        await (await S.load()).enter();
      } catch (e) {
        // no data at the base (the data repo not there yet, offline): nothing of Suhl, no error for the visitor; tried again on the next visit
        S.state = 'error';
        S.err = String((e && e.message) || e);
        console.warn('Suhl', e);
        return;
      }
      S.state = 'ready';
      KERN.emit('suhl:built', {});
      for (const fn of built) fn(S);
    },
    drop: () => {
      if (api) api.leave();
      S.state = 'idle';
      KERN.emit('suhl:freed', {});
      for (const fn of freed) fn(S);
    },
    tick: dt => api && api.tick(dt),
  });
  return S;
})();
window.SUHL = SUHL;
