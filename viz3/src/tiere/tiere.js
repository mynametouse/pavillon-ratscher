// ===================== feat/tiere 3: the animals in the world – where and when they are, how they behave, what one discovers (TIERE) =====================
// Where: a habitat map in 20 m cells over the 2.4 km square from the real crowns (world/ratscher.js treeXY, the stand at the Klinge
// world/forest.js) and the buildings (RATSCHER.walls): forest, forest edge, open land, village. On it groups of animals with a home in
// cover and a place to feed (deterministic from a seed, so the world is the same on every visit): roe deer along the forest edges,
// sounders of wild boar deep in the large woods with their fields and meadows, red kites over the open land.
// When: by the sun (DN) and the calendar – roe deer come out at dusk and stay on the fields at night (in winter in groups, also by day),
// boar only at night, the kite by day from March to October; a group startled keeps to cover for a while.
// How: few animals near the observer are real models (time-lapse and far groups are only numbers); they graze, walk, look up, flee
// from the walker, a car or noise at their real flight distance – the roe deer in bounds with the white rump patch flared, the sounder
// trotting into the forest; the kite circles, banks and twists its tail. Seen for the first time: an event for the discovery book
// (KERN.emit('tiere:entdeckt', { kind: 'art', id, title, source })), saved (pav-tiere-v1).
import * as THREE from 'three';
import { COARSE, scene } from '../core/head.js';
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { collide, P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { RATSCHER } from '../world/ratscher.js';
import { ROADS } from '../world/roads.js';
import { FOREST } from '../world/forest.js';
import { inView } from '../npc/npc.js';
import { RENDER } from '../render/render.js';
import { VEH } from '../vehicles/vehicle.js';
import { TARTEN } from './tiere_arten.js';
import { TKOERPER } from './tiere_koerper.js';
export const TIERE = (() => {
  const LSK = 'pav-tiere-v1';
  const S = {
    on: true,
    grid: null,
    groups: [],
    live: [],
    seen: {},
    found: {},
    noise: [],
    frame: 0,
    acc: 0,
    drawT: 0,
    max: COARSE ? 14 : 26,
    spawnR: COARSE ? 330 : 430,
    dropR: COARSE ? 420 : 540,
    stats: { spawned: 0, dropped: 0, fled: 0 },
    force: null,
  };
  // ---------- saved: species seen and signs found (day of the game), validated field by field ----------
  const okMap = m => !!m && typeof m === 'object' && !Array.isArray(m);
  function load() {
    const v = SAVE.get(LSK);
    if (!v) return;
    for (const k of ['seen', 'found'])
      if (okMap(v[k]))
        for (const [id, d] of Object.entries(v[k])) if (Number.isFinite(d) && id.length < 40) S[k][id] = d;
  }
  let saveT = 0;
  const save = () => {
    saveT = 0;
    SAVE.set(LSK, Object.assign(SAVE.get(LSK) || {}, { v: 1, seen: S.seen, found: S.found }));
  };
  // ---------- time: sun elevation, morning or evening, month ----------
  const sunEl = () => {
    const s = DN.active && DN.state;
    if (s && Number.isFinite(s.sunEl)) return s.sunEl;
    const h = (((CLOCK.t % 1440) + 1440) % 1440) / 60;
    return 50 * Math.sin(((h - 6) / 12) * Math.PI);
  };
  const hour = () => (((CLOCK.t % 1440) + 1440) % 1440) / 60;
  // month 0..11 and day of the year from the calendar (time/daynight.js: Julian date of the game time)
  function cal() {
    try {
      const jd = DN.jdOf(CLOCK.t),
        d = new Date((jd - 2440587.5) * 864e5),
        y0 = Date.UTC(d.getUTCFullYear(), 0, 1);
      return { m: d.getUTCMonth(), doy: Math.floor((d.getTime() - y0) / 864e5), y: d.getUTCFullYear() };
    } catch (e) {
      return { m: 9, doy: 300, y: 2026 };
    }
  }
  S.cal = cal;
  const season = m => (m === 11 || m <= 1 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn');
  // deer wear the grey-brown winter coat from the autumn moult (late September, October) to the spring moult (May)
  const coatWinter = (m, doy) => doy < 140 || doy > 272;
  S.coatWinter = coatWinter;
  // ---------- a seeded random ----------
  function rng(seed) {
    let s = seed >>> 0 || 1;
    return () => {
      s ^= s << 13;
      s ^= s >>> 17;
      s ^= s << 5;
      return ((s >>> 0) % 1e6) / 1e6;
    };
  }
  const h01 = (a, b = 0) => {
    const s = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
    return s - Math.floor(s);
  };
  // ---------- the habitat map ----------
  const C = 20;
  function buildGrid() {
    const box = RATSCHER.box || [-1200, -1200, 1200, 1200],
      x0 = box[0],
      y0 = box[1],
      nx = Math.ceil((box[2] - x0) / C),
      ny = Math.ceil((box[3] - y0) / C),
      N = nx * ny;
    const cnt = new Uint16Array(N),
      bld = new Uint8Array(N),
      cls = new Uint8Array(N);
    const ci = (x, y) => {
      const i = Math.floor((x - x0) / C),
        j = Math.floor((y - y0) / C);
      return i < 0 || j < 0 || i >= nx || j >= ny ? -1 : j * nx + i;
    };
    const T = RATSCHER.treeXY || [];
    for (let k = 0; k + 2 < T.length; k += 3)
      if (T[k + 2] > 4) {
        const c = ci(T[k], T[k + 1]);
        if (c >= 0) cnt[c]++;
      }
    // the stand at the Klinge: its measured crowns (world/ratscher.js hands them to world/forest.js) and, once built, every stem
    const FL = FOREST.list && FOREST.list.length ? FOREST.list.map(t => [t.x, t.y, t.h]) : RATSCHER.forestCHM || [];
    for (const t of FL)
      if (t[2] > 6) {
        const c = ci(t[0], t[1]);
        if (c >= 0) cnt[c] += FOREST.list && FOREST.list.length ? 1 : 3;
      }
    const Wl = RATSCHER.walls || [];
    for (let k = 0; k + 3 < Wl.length; k += 4) {
      const mx = (Wl[k] + Wl[k + 2]) / 2,
        my = (Wl[k + 1] + Wl[k + 3]) / 2;
      for (const [dx, dy] of [
        [0, 0],
        [C, 0],
        [-C, 0],
        [0, C],
        [0, -C],
      ]) {
        const c = ci(mx + dx, my + dy);
        if (c >= 0) bld[c] = 1;
      }
    }
    // the modelled garden and its neighbours count as settled land
    for (let y = -60; y <= 60; y += C)
      for (let x = -60; x <= 60; x += C) {
        const c = ci(x, y);
        if (c >= 0) bld[c] = 1;
      }
    // classes: 1 forest, 2 edge (forest beside open land), 3 open, 4 settled
    const raw = new Uint8Array(N);
    for (let c = 0; c < N; c++) raw[c] = cnt[c] >= 3 ? 1 : 0;
    const nb = (c, f) => {
      const i = c % nx,
        j = (c - i) / nx;
      let n = 0;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const a = i + di,
            b = j + dj;
          if (a < 0 || b < 0 || a >= nx || b >= ny) continue;
          if (f(b * nx + a)) n++;
        }
      return n;
    };
    for (let c = 0; c < N; c++) {
      if (bld[c]) cls[c] = 4;
      else if (raw[c] && nb(c, k => raw[k]) >= 4) cls[c] = 1;
      else cls[c] = 3;
    }
    for (let c = 0; c < N; c++) if (cls[c] === 1 && nb(c, k => cls[k] === 3) >= 2) cls[c] = 2;
    S.grid = { x0, y0, nx, ny, cls, cnt, ci, at: (x, y) => cls[ci(x, y)] || 0 };
    return S.grid;
  }
  // the direction from a cell towards open land (mean of the open neighbours), unit or null
  function openDir(G, c) {
    const i = c % G.nx,
      j = (c - i) / G.nx;
    let dx = 0,
      dy = 0;
    for (let dj = -2; dj <= 2; dj++)
      for (let di = -2; di <= 2; di++) {
        const a = i + di,
          b = j + dj;
        if (a < 0 || b < 0 || a >= G.nx || b >= G.ny) continue;
        if (G.cls[b * G.nx + a] === 3) {
          dx += di;
          dy += dj;
        }
      }
    const l = Math.hypot(dx, dy);
    return l > 0.5 ? [dx / l, dy / l] : null;
  }
  const cellXY = (G, c) => [G.x0 + ((c % G.nx) + 0.5) * C, G.y0 + (Math.floor(c / G.nx) + 0.5) * C];
  const onRoad = (x, y, m = 1.5) => !!(ROADS.edge && ROADS.edge(x, y) > -m);
  // ---------- the groups: home in cover, a place to feed ----------
  function makeGroups() {
    const G = S.grid || buildGrid(),
      R = rng(52771),
      groups = [];
    const edges = [],
      deep = [];
    for (let c = 0; c < G.cls.length; c++) {
      if (G.cls[c] === 2) edges.push(c);
      else if (G.cls[c] === 1) {
        // deep forest: no open land within 60 m
        const [x, y] = cellXY(G, c);
        let ok = true;
        for (let a = 0; a < 8 && ok; a++) {
          const r = 60,
            q = (a / 8) * Math.PI * 2;
          if (G.at(x + Math.cos(q) * r, y + Math.sin(q) * r) !== 1) ok = false;
        }
        if (ok) deep.push(c);
      }
    }
    const shuffle = a => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(R() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const far = (list, x, y, d) => list.every(g => Math.hypot(g.home[0] - x, g.home[1] - y) > d);
    // a free place in open land along a direction, off roads and houses
    const openAt = (x, y, dir, d0, d1) => {
      for (let k = 0; k < 8; k++) {
        const d = d0 + (d1 - d0) * R(),
          q = Math.atan2(dir[1], dir[0]) + (R() - 0.5) * 0.9,
          px = x + Math.cos(q) * d,
          py = y + Math.sin(q) * d;
        if (G.at(px, py) === 3 && !onRoad(px, py, 4)) return [px, py];
      }
      return null;
    };
    // roe deer: along the edges, groups at least 170 m apart
    const roe = [];
    for (const c of shuffle(edges.slice())) {
      if (roe.length >= 28) break;
      const [x, y] = cellXY(G, c),
        od = openDir(G, c);
      if (!od || !far(roe, x, y, 170)) continue;
      const feed = openAt(x, y, od, 35, 120);
      if (!feed) continue;
      const home = [x - od[0] * 35, y - od[1] * 35];
      roe.push({ id: 'reh' + roe.length, art: 'reh', home, feed, edge: [x, y], seed: Math.floor(R() * 1e6) });
    }
    // wild boar: sounders in the deep woods with a field or meadow within reach; one old boar alone
    const boar = [];
    for (const c of shuffle(deep.slice())) {
      if (boar.length >= 5) break;
      const [x, y] = cellXY(G, c);
      if (!far(boar, x, y, 380)) continue;
      // the nearest open land
      let best = null;
      for (let a = 0; a < 16; a++) {
        const q = (a / 16) * Math.PI * 2;
        for (let r = 80; r < 420; r += 20) {
          const px = x + Math.cos(q) * r,
            py = y + Math.sin(q) * r;
          if (G.at(px, py) === 3 && !onRoad(px, py, 4)) {
            if (!best || r < best.r) best = { r, p: [px + Math.cos(q) * 40, py + Math.sin(q) * 40] };
            break;
          }
        }
      }
      if (!best) continue;
      boar.push({
        id: 'sau' + boar.length,
        art: 'wildschwein',
        home: [x, y],
        feed: best.p,
        seed: Math.floor(R() * 1e6),
        keiler: boar.length === 4,
      });
    }
    // red kites: two pairs, each over open land near an edge
    const kites = [];
    for (const c of shuffle(edges.slice())) {
      if (kites.length >= 2) break;
      const [x, y] = cellXY(G, c),
        od = openDir(G, c);
      if (!od) continue;
      const p = [x + od[0] * 160, y + od[1] * 160];
      if (G.at(p[0], p[1]) !== 3 || !kites.every(k => Math.hypot(k.home[0] - p[0], k.home[1] - p[1]) > 700)) continue;
      kites.push({ id: 'milan' + kites.length, art: 'rotmilan', home: p, feed: p, seed: Math.floor(R() * 1e6) });
    }
    const more = [];
    const id = (art, n) => art + n;
    // a place: edge cells (den, sett, perch) or open/settled cells, apart from the others of the species
    const pick = (list, art, n, apart, mk) => {
      const got = [];
      for (const c of shuffle(list.slice())) {
        if (got.length >= n) break;
        const [x, y] = cellXY(G, c);
        if (!got.every(g => Math.hypot(g.home[0] - x, g.home[1] - y) > apart)) continue;
        const g = mk(x, y, c);
        if (!g) continue;
        g.id = id(art, got.length);
        g.art = art;
        g.seed = Math.floor(R() * 1e6);
        got.push(g);
      }
      more.push(...got);
      return got;
    };
    const open = [],
      settled = [];
    for (let c = 0; c < G.cls.length; c++) {
      if (G.cls[c] === 3) open.push(c);
      else if (G.cls[c] === 4) settled.push(c);
    }
    // foxes: a den at the forest edge, mousing on the meadows in front of it
    pick(edges, 'fuchs', 6, 350, (x, y, c) => {
      const od = openDir(G, c),
        f = od && openAt(x, y, od, 60, 200);
      return f ? { home: [x - od[0] * 10, y - od[1] * 10], feed: f } : null;
    });
    // hares: a form in the open fields, away from the forest
    pick(open, 'hase', 10, 150, (x, y) => {
      if (onRoad(x, y, 5)) return null;
      for (let a = 0; a < 8; a++) if (G.at(x + Math.cos(a) * 80, y + Math.sin(a) * 80) !== 3) return null;
      return { home: [x, y], feed: [x + 12, y - 8] };
    });
    // badgers: a sett in the edge of the wood, foraging on the meadows nearby
    pick(edges, 'dachs', 2, 600, (x, y, c) => {
      const od = openDir(G, c),
        f = od && openAt(x, y, od, 40, 120);
      return f ? { home: [x - od[0] * 25, y - od[1] * 25], feed: f } : null;
    });
    // raccoons and martens: in the village (barns, bins, attics) at night
    pick(settled, 'waschbaer', 3, 220, (x, y) =>
      Math.hypot(x, y) < 70 ? null : { home: [x, y], feed: [x + 15, y + 10] }
    );
    pick(settled, 'marder', 3, 200, (x, y) =>
      Math.hypot(x, y) < 70 ? null : { home: [x, y], feed: [x - 12, y + 14] }
    );
    // a wildcat: far from the houses, at the edge of a large wood
    pick(edges, 'wildkatze', 1, 0, (x, y, c) => {
      const od = openDir(G, c),
        f = od && openAt(x, y, od, 20, 70);
      if (!f) return null;
      for (const s of settled.slice(0, 4000)) {
        const [sx, sy] = cellXY(G, s);
        if (Math.hypot(sx - x, sy - y) < 450) return null;
      }
      return { home: [x - od[0] * 30, y - od[1] * 30], feed: f };
    });
    // red deer: one group passing through from the large woods, out on the far fields at night
    pick(deep, 'rothirsch', 1, 0, (x, y) => {
      let best = null;
      for (let a = 0; a < 16 && !best; a++)
        for (let r = 100; r < 500; r += 25) {
          const px = x + Math.cos(a) * r,
            py = y + Math.sin(a) * r;
          if (G.at(px, py) === 3 && !onRoad(px, py, 6)) {
            best = [px + Math.cos(a) * 60, py + Math.sin(a) * 60];
            break;
          }
        }
      return best ? { home: [x, y], feed: best } : null;
    });
    // buzzards: three pairs over the fields; ravens: a pair over the woods; the black stork: a nest deep in the Klinge, soaring by day
    pick(edges, 'bussard', 3, 600, (x, y, c) => {
      const od = openDir(G, c);
      return od ? { home: [x + od[0] * 90, y + od[1] * 90], feed: [x + od[0] * 90, y + od[1] * 90] } : null;
    });
    pick(deep, 'kolkrabe', 1, 0, (x, y) => ({ home: [x, y], feed: [x, y] }));
    {
      // the nest: an old tree deep in the stand at the Klinge, ~260 m from the family forest (its quiet zone reaches it in spring)
      const nest = [-262, -772];
      more.push({ id: 'storch0', art: 'schwarzstorch', home: nest, feed: nest, seed: 4242, nest });
    }
    // the eagle owl: on a spruce top at the edge below the Untere Klinge at dusk
    {
      const J = [-606, -598];
      let top = null;
      for (const t of RATSCHER.forestCHM || []) {
        const d = Math.hypot(t[0] - J[0] - 40, t[1] - J[1] - 10);
        if (t[2] > 14 && (!top || d < top.d)) top = { d, p: [t[0], t[1], t[2]] };
      }
      const p = top ? top.p : [J[0] + 40, J[1] + 10, 18];
      more.push({ id: 'uhu0', art: 'uhu', home: [p[0], p[1]], feed: [p[0], p[1]], perchH: p[2] - 0.6, seed: 777 });
    }
    groups.push(...roe, ...boar, ...kites, ...more);
    for (const g of groups) {
      g.live = [];
      g.scared = -1e9;
      g.state = null;
    }
    S.groups = groups;
    return groups;
  }
  // ---------- the day of a group: where it is now and how many ----------
  // 'cover' (hidden in the forest, lying), 'out' (at the feeding place), 'sky' (a bird aloft), or null (away: not here today)
  function plan(g) {
    const el = sunEl(),
      h = hour(),
      { m, doy } = cal(),
      se = season(m),
      day = Math.floor(CLOCK.t / 1440),
      r = h01(g.seed % 1000, day);
    const scared = CLOCK.t - g.scared < 90;
    if (g.art === 'reh') {
      const winter = se === 'winter';
      const coatW = coatWinter(m, cal().doy);
      const n = winter ? 3 + Math.floor(r * 5) : 1 + Math.floor(r * 2.6);
      // in winter some groups merge: only every second one is out, the others join it
      if (winter && g.seed % 2) return { where: null, n: 0 };
      const outByDay = winter && r < 0.45;
      const out = !scared && (el < 5 || outByDay);
      // fawns from late May: the doe with one or two kids (the kids hidden in the grass by day)
      const kids = !winter && doy > 150 && doy < 300 && r > 0.35 ? 1 + (r > 0.75 ? 1 : 0) : 0;
      const buck = (g.seed % 3 === 0 && !winter) || (winter && r > 0.7);
      return { where: out ? 'out' : 'cover', n, kids: out ? kids : 0, buck, winter, coatW };
    }
    if (g.art === 'wildschwein') {
      const n = g.keiler ? 1 : 4 + Math.floor(r * 6);
      // the young of the year: born March to May (here ~1 April), striped for their first three to four months, then brown;
      // they grow from a third of their mother's length to three quarters by winter (next spring they are Überläufer)
      const age = (doy - 92 + 365) % 365;
      const young = g.keiler ? 0 : Math.floor(n * 0.6);
      const out = !scared && el < -7;
      return {
        where: out ? 'out' : 'cover',
        n,
        young,
        stripes: age < 115,
        youngSc: 0.34 + 0.44 * Math.min(1, age / 270),
      };
    }
    if (g.art === 'rotmilan') {
      const here = (m >= 2 && m <= 9) || r < 0.15;
      return { where: here && el > 4 ? 'sky' : null, n: here ? (r > 0.5 ? 2 : 1) : 0 };
    }
    const dusk = el < 3,
      night = el < -6;
    if (g.art === 'fuchs') {
      // dusk and night; in winter (and with young to feed in May/June) also by day now and then
      const out = !scared && (dusk || (se === 'winter' && r < 0.35) || (m >= 4 && m <= 5 && r < 0.25));
      return { where: out ? 'out' : 'cover', n: 1 };
    }
    if (g.art === 'hase') {
      // in its form by day (it sits tight until one nearly steps on it), out at dusk and night; in March the boxing
      return { where: !scared && dusk ? 'out' : 'cover', n: m === 2 && r > 0.5 ? 2 : 1 };
    }
    if (g.art === 'dachs') {
      // only at night; in the cold of winter it stays in the sett on most nights
      const cold = se === 'winter' && r < 0.7;
      return { where: !scared && night && !cold ? 'out' : null, n: 1 + (m >= 4 && m <= 7 && r > 0.6 ? 1 : 0) };
    }
    if (g.art === 'waschbaer' || g.art === 'marder') {
      const lazy = se === 'winter' && r < 0.5;
      return { where: !scared && night && !lazy ? 'out' : null, n: g.art === 'waschbaer' && r > 0.6 ? 2 : 1 };
    }
    if (g.art === 'wildkatze') return { where: !scared && dusk && r < 0.3 ? 'out' : null, n: 1 };
    if (g.art === 'rothirsch') {
      // a group of hinds with calves on a quarter of the nights; in the rut (mid September to mid October) a stag with them
      const rut = doy > 255 && doy < 290;
      const here = r < 0.25 || (rut && r < 0.5);
      return {
        where: here && !scared && night ? 'out' : null,
        n: here ? 3 + Math.floor(r * 4) : 0,
        stag: rut || r < 0.08,
        rut,
      };
    }
    if (g.art === 'bussard') return { where: el > 3 ? 'sky' : null, n: r > 0.4 ? 2 : 1 };
    if (g.art === 'kolkrabe') return { where: el > 2 ? 'sky' : null, n: 2 };
    if (g.art === 'schwarzstorch') {
      const here = doy > 75 && doy < 250;
      return { where: here && el > 8 && h01(g.seed, Math.floor(CLOCK.t / 90)) < 0.35 ? 'sky' : null, n: 1 };
    }
    if (g.art === 'uhu')
      return { where: el < 1 && el > -14 ? 'perch' : null, n: 1, calls: m <= 2 || m === 9 || m === 10 };
    return { where: null, n: 0 };
  }
  S.plan = plan;
  // ---------- individuals ----------
  const SP = {
    reh: { walk: 1.1, run: 11.5 },
    wildschwein: { walk: 0.9, run: 7.5 },
    rothirsch: { walk: 1.4, run: 11 },
    fuchs: { walk: 1.7, run: 9 },
    hase: { walk: 0.8, run: 12 },
    dachs: { walk: 0.8, run: 4 },
    waschbaer: { walk: 0.9, run: 4.5 },
    marder: { walk: 1.3, run: 6 },
    wildkatze: { walk: 1.0, run: 8 },
  };
  const BIRD = { rotmilan: 1, bussard: 1, kolkrabe: 1, schwarzstorch: 1, uhu: 1 };
  function spawn(g, i, pl) {
    const art = g.art,
      R = rng(g.seed + i * 977);
    let kind = 'reh',
      variant = {};
    if (art === 'reh') {
      const isKid = i >= pl.n;
      variant = { winter: !!pl.coatW };
      // a buck's antlers: cast in October to December, regrown in velvet over the winter, cleaned (gefegt) in April/May
      const doy = cal().doy;
      if (!isKid && i === 0 && pl.buck && doy > 32 && doy < 300) variant.antler = doy < 115 ? 'bast' : true;
      kind = 'reh';
      if (isKid) {
        variant.kid = true;
        // fawns keep their white spots until late summer
        if (doy < 245) variant.spots = true;
      }
    } else if (art === 'wildschwein') {
      kind = 'sau';
      const y = i >= pl.n - (pl.young || 0);
      variant = { young: y, stripes: y && pl.stripes };
    } else if (art === 'rothirsch') {
      kind = 'hirsch';
      variant = { winter: coatWinter(cal().m, cal().doy) };
      if (i === 0 && pl.stag) variant.antler = true;
      if (i >= 2 && !variant.antler) variant.kid = true;
    } else kind = TARTEN.A[art].model;
    const vkey = {
      winter: variant.winter,
      antler: variant.antler,
      young: variant.young,
      stripes: variant.stripes,
      spots: variant.spots,
    };
    for (const k of Object.keys(vkey)) if (!vkey[k]) delete vkey[k];
    const A = TKOERPER.make(kind, vkey);
    // size: kids and piglets smaller, a little individual spread
    let sc = 0.92 + R() * 0.16;
    if (variant.kid) sc *= art === 'rothirsch' ? 0.72 : 0.55;
    if (variant.young) sc *= (pl.youngSc || 0.5) * (0.92 + R() * 0.16);
    if (g.keiler) sc *= 1.18;
    A.g.scale.setScalar(sc);
    scene.add(A.g);
    const a = {
      g,
      i,
      art,
      A,
      sc,
      x: 0,
      y: 0,
      z: 0,
      az: R() * 360,
      v: 0,
      mode: 'graze',
      t: R() * 5,
      tx: 0,
      ty: 0,
      off: [(R() - 0.5) * 2, (R() - 0.5) * 2],
      alert: 0,
      fleeT: 0,
      bird: !!BIRD[art],
      seen: false,
      kid: !!variant.kid || !!variant.young,
    };
    // where it starts: at the group's place now
    place(a, pl, true);
    g.live.push(a);
    S.live.push(a);
    S.stats.spawned++;
    return a;
  }
  function drop(a) {
    a.A.dispose();
    a.g.live = a.g.live.filter(b => b !== a);
    S.live = S.live.filter(b => b !== a);
    S.stats.dropped++;
  }
  // the point of the group's place for this animal (formation around the centre)
  function spot(a, where) {
    const g = a.g,
      base = where === 'out' ? g.feed : g.home,
      spread = where === 'out' ? (a.art === 'wildschwein' ? 9 : 14) : 6;
    return [base[0] + a.off[0] * spread, base[1] + a.off[1] * spread];
  }
  // circles of the birds: radius, height above the ground, airspeed (m/s), share of the time flapping
  const FLY = {
    rotmilan: { r: [55, 125], alt: [45, 85], v: 8.5, flap: 0.1 },
    bussard: { r: [40, 85], alt: [25, 60], v: 7.5, flap: 0.15 },
    kolkrabe: { r: [140, 240], alt: [60, 110], v: 11, flap: 0.55 },
    schwarzstorch: { r: [110, 190], alt: [80, 150], v: 9.5, flap: 0.12 },
  };
  function place(a, pl, jump) {
    if (a.bird) {
      if (!jump) return;
      const g = a.g,
        F = FLY[a.art] || FLY.rotmilan;
      a.cr = F.r[0] + h01(g.seed, a.i) * (F.r[1] - F.r[0]);
      a.ca = h01(a.i, g.seed) * Math.PI * 2;
      a.alt = F.alt[0] + h01(g.seed + 7, a.i) * (F.alt[1] - F.alt[0]);
      a.fly = F;
      a.x = g.home[0] + Math.cos(a.ca) * a.cr;
      a.y = g.home[1] + Math.sin(a.ca) * a.cr;
      if (a.art === 'uhu') {
        a.x = g.home[0];
        a.y = g.home[1];
        a.az = 20;
      }
      return;
    }
    const p = spot(a, pl.where);
    a.tx = p[0];
    a.ty = p[1];
    if (jump) {
      a.x = p[0];
      a.y = p[1];
      a.mode = pl.where === 'cover' ? 'lie' : 'graze';
    }
  }
  // ---------- threats: the walker, a moving car, noise, the dog ----------
  S.noise = [];
  S.addNoise = (x, y, r, s = 4) => S.noise.push({ x, y, r, until: performance.now() / 1000 + s });
  function threats() {
    const out = [];
    const v = VEH && VEH.cur;
    if (P.mode === 'walk' && !v) out.push({ x: P.x, y: P.y, kind: 'walker', speed: P.speed || 0 });
    if (v && v.st && Number.isFinite(v.st.x)) {
      const sp = Math.hypot(v.st.u || 0, v.st.v || 0);
      out.push({ x: v.st.x, y: v.st.y, kind: 'car', speed: sp });
      out.push({ x: v.st.x, y: v.st.y, kind: 'noise', r: 70 });
    }
    const now = performance.now() / 1000;
    S.noise = S.noise.filter(n => n.until > now);
    for (const n of S.noise) out.push({ x: n.x, y: n.y, kind: 'noise', r: n.r });
    // the dog: at heel he is part of the walker (a little more noticeable); running free or chasing he counts on his own
    if (S.dog) {
      const d = S.dog();
      if (d && (Math.hypot(d[0] - P.x, d[1] - P.y) > 7 || d[2])) out.push({ x: d[0], y: d[1], kind: 'dog' });
      else if (d && out[0] && out[0].kind === 'walker') out[0].speed = Math.max(out[0].speed, 0.3) * 1.15;
    }
    return out;
  }
  // how close is too close for this animal: distance to flee, distance to look up
  function danger(a, T) {
    const F = TARTEN.A[a.art].flee || {};
    let worst = null;
    for (const t of T) {
      const d = Math.hypot(t.x - a.x, t.y - a.y);
      let f =
        t.kind === 'walker'
          ? F.walker
          : t.kind === 'car'
            ? t.speed > 1.5
              ? F.car
              : 0
            : t.kind === 'dog'
              ? F.dog
              : t.r || F.noise;
      if (!f) continue;
      // a walker who runs is noticed sooner, one standing still later; at night they let one come closer
      if (t.kind === 'walker') f *= (t.speed > 3.5 ? 1.25 : t.speed < 0.3 ? 0.7 : 1) * (sunEl() < -6 ? 0.75 : 1);
      // lying in cover they trust it: the hare in its form sits tight until one nearly steps on it
      if (a.mode === 'lie') f *= a.art === 'hase' ? 0.3 : 0.6;
      const k = d / f;
      if (!worst || k < worst.k) worst = { k, d, t };
    }
    return worst;
  }
  // ---------- one animal's step ----------
  const _v = new THREE.Vector3();
  function stepAnimal(a, dt, T, pl) {
    if (a.bird) return stepBird(a, dt, pl);
    const sp = SP[a.art] || SP.reh;
    a.t += dt;
    const dz = danger(a, T);
    // flight: the group goes when one goes
    if (dz && dz.k < 1 && a.mode !== 'flee') startFlee(a, dz.t);
    if (a.mode !== 'flee') {
      if (dz && dz.k < 1.45 && (a.art === 'reh' || a.art === 'rothirsch')) {
        a.alert = Math.min(1, a.alert + dt * 2);
        a.lookAt = dz.t;
      } else a.alert = Math.max(0, a.alert - dt * 0.5);
    }
    let want = 0,
      mode = a.mode;
    if (mode === 'flee') {
      a.fleeT -= dt;
      const t = a.from,
        dx = a.x - t.x,
        dy = a.y - t.y,
        d = Math.hypot(dx, dy) || 1;
      // away from the threat, bending towards cover
      const hx = a.g.home[0] - a.x,
        hy = a.g.home[1] - a.y,
        hd = Math.hypot(hx, hy) || 1;
      const ux = dx / d + (hx / hd) * 0.8,
        uy = dy / d + (hy / hd) * 0.8,
        ul = Math.hypot(ux, uy) || 1;
      a.tx = a.x + (ux / ul) * 30;
      a.ty = a.y + (uy / ul) * 30;
      want = sp.run * (a.kid ? 0.85 : 1);
      const F = TARTEN.A[a.art].flee || {};
      if (a.fleeT < 0 && (d > (F.walker || 80) * 2.2 || hd < 8)) {
        a.mode = 'lie';
        a.g.scared = CLOCK.t;
      }
    } else if (a.mode === 'lie' && pl.where === 'out') a.mode = 'walk';
    else if (pl.where === 'cover' && a.mode !== 'lie') {
      const p = spot(a, 'cover');
      a.tx = p[0];
      a.ty = p[1];
      a.mode = Math.hypot(a.tx - a.x, a.ty - a.y) < 3 ? 'lie' : 'walk';
    } else if (pl.where === 'out' && a.mode !== 'lie') {
      // at the feeding place: graze, now and then a few steps on; the boar roots
      const dHome = Math.hypot(a.tx - a.x, a.ty - a.y);
      if (a.mode === 'walk' && dHome < 2) a.mode = 'graze';
      if (a.mode === 'graze' && a.t > 6 + h01(a.i, Math.floor(a.t)) * 8) {
        a.t = 0;
        const R = h01(a.g.seed + a.i, CLOCK.t);
        const p = spot(a, 'out');
        a.tx = p[0] + (R - 0.5) * 10;
        a.ty = p[1] + (h01(R, a.i) - 0.5) * 10;
        a.mode = 'walk';
      }
    }
    if (a.mode === 'walk') want = sp.walk * (a.kid ? 1.1 : 1);
    if (a.mode === 'graze') want = 0;
    if (a.mode === 'lie') want = 0;
    if (a.alert > 0.6 && a.mode !== 'flee') want = 0;
    // steer: towards the target, turning at a speed the body allows
    const dx = a.tx - a.x,
      dy = a.ty - a.y,
      dist = Math.hypot(dx, dy);
    if (dist > 0.3 && want > 0) {
      const az = (Math.atan2(dx, dy) * 180) / Math.PI;
      let d = ((az - a.az + 540) % 360) - 180;
      const turn = (a.mode === 'flee' ? 260 : 120) * dt;
      a.az += Math.max(-turn, Math.min(turn, d));
    }
    if (dist < 0.4 && a.mode === 'walk') want = 0;
    const acc = a.mode === 'flee' ? 9 : 2.5;
    a.v += Math.max(-acc * dt * 2, Math.min(acc * dt, want - a.v));
    if (a.v < 0) a.v = 0;
    const r = (a.az * Math.PI) / 180;
    const nx = a.x + Math.sin(r) * a.v * dt,
      ny = a.y + Math.cos(r) * a.v * dt;
    const p = [nx, ny];
    if (Math.abs(nx) < 50 && Math.abs(ny) < 55) collide(p, KERN.ground(nx, ny), true);
    else if (KERN.pushOut) KERN.pushOut(p, 0.3 * a.sc);
    a.x = p[0];
    a.y = p[1];
    return a.v;
  }
  function startFlee(a, t) {
    a.mode = 'flee';
    a.from = { x: t.x, y: t.y };
    a.fleeT = 5 + Math.random() * 3;
    a.alert = 0;
    S.stats.fled++;
    // the others of the group go too, a moment later
    for (const b of a.g.live)
      if (b !== a && b.mode !== 'flee') {
        b.mode = 'flee';
        b.from = { x: t.x, y: t.y };
        b.fleeT = 5 + Math.random() * 3;
        b.v = Math.max(b.v, 2);
      }
    a.g.scared = CLOCK.t;
    KERN.emit('tiere:flucht', { art: a.art, gruppe: a.g.id, x: a.x, y: a.y, vor: t.kind });
  }
  // the kite: circles in the thermals, a few wingbeats now and then, banks, twists its tail
  function stepBird(a, dt, pl) {
    const g = a.g;
    a.t += dt;
    if (a.art === 'uhu') {
      // perched: turns its head slowly, now and then a long look the other way
      a.v = 0;
      a.look = Math.sin(a.t * 0.23) * 0.9 + (Math.sin(a.t * 0.07) > 0.8 ? 0.6 : 0);
      return 0;
    }
    const F = a.fly || FLY.rotmilan,
      v = F.v;
    a.ca += (v / a.cr) * dt * (a.i % 2 ? -1 : 1);
    // the circle drifts slowly with the wind
    const cx = g.home[0] + Math.sin(a.t * 0.013 + a.i) * 60,
      cy = g.home[1] + Math.cos(a.t * 0.011 + a.i * 2) * 50;
    a.x = cx + Math.cos(a.ca) * a.cr;
    a.y = cy + Math.sin(a.ca) * a.cr;
    // heading along the circle: tangent direction
    const tx = -Math.sin(a.ca) * (a.i % 2 ? -1 : 1),
      ty = Math.cos(a.ca) * (a.i % 2 ? -1 : 1);
    a.az = (Math.atan2(tx, ty) * 180) / Math.PI;
    a.flap = a.t % 23 < 23 * F.flap ? 1 : 0;
    a.bank = (a.i % 2 ? -1 : 1) * Math.atan((v * v) / (9.81 * a.cr)) * 1.4;
    a.twist = Math.sin(a.t * 0.9 + a.i) * 0.6;
    a.v = v;
    return v;
  }
  // ---------- place the model, animate it ----------
  function show(a, dt, far) {
    const A = a.A;
    if (a.bird) {
      const gz = KERN.ground(a.x, a.y);
      if (a.art === 'uhu') {
        a.z = gz + (a.g.perchH || 16);
        A.g.position.set(a.x, a.z, -a.y);
        A.g.rotation.set(0, Math.PI - (a.az * Math.PI) / 180, 0);
        A.anim(dt, 0, { perch: true, look: a.look });
        return;
      }
      a.z = gz + a.alt;
      A.g.position.set(a.x, a.z, -a.y);
      A.g.rotation.set(0, Math.PI - (a.az * Math.PI) / 180, 0);
      A.anim(dt, a.v, { flap: a.flap, bank: a.bank, twist: a.twist });
      return;
    }
    const r = (a.az * Math.PI) / 180,
      L = 0.45 * a.sc,
      fx = a.x + Math.sin(r) * L,
      fy = a.y + Math.cos(r) * L,
      bx = a.x - Math.sin(r) * L,
      by = a.y - Math.cos(r) * L;
    const zf = KERN.ground(fx, fy),
      zb = KERN.ground(bx, by);
    a.z = (zf + zb) / 2;
    A.g.position.set(a.x, a.z, -a.y);
    const pitch = Math.atan2(zf - zb, 2 * L);
    A.g.rotation.set(0, 0, 0);
    A.g.rotation.order = 'YXZ';
    A.g.rotation.y = Math.PI - r;
    A.g.rotation.x = -pitch;
    if (far) return;
    let look = 0;
    if (a.lookAt && a.alert > 0.1) {
      const az = (Math.atan2(a.lookAt.x - a.x, a.lookAt.y - a.y) * 180) / Math.PI;
      look = Math.max(-1.2, Math.min(1.2, (((((az - a.az + 540) % 360) - 180) * Math.PI) / 180) * -0.9));
    }
    const grazing = a.mode === 'graze' && a.alert < 0.3,
      art = a.art;
    // what grazing looks like: deer and hares crop grass, boar and badger root, the fox listens for mice, raccoon and marten sniff,
    // the wildcat sits and watches
    A.anim(dt, a.v, {
      graze: grazing ? GRAZE[art] || 0 : 0,
      dig: grazing && (art === 'wildschwein' || art === 'dachs') ? 1 : 0,
      sit: grazing && art === 'wildkatze' ? 1 : 0,
      alert: Math.max(a.alert, grazing && art === 'wildkatze' ? 0.4 : 0),
      lie: a.mode === 'lie' ? 1 : 0,
      flee: a.mode === 'flee' ? 1 : 0,
      look,
    });
  }
  const GRAZE = { reh: 1, rothirsch: 1, hase: 0.7, fuchs: 0.55, waschbaer: 0.6, marder: 0.6 };
  // ---------- discovery: a species seen for the first time ----------
  function discover(kind, id, title, src) {
    const book = kind === 'art' ? S.seen : S.found;
    if (book[id] !== undefined) return false;
    book[id] = CLOCK.day ? CLOCK.day() : 1;
    save();
    KERN.emit('tiere:entdeckt', { kind, id, title, source: src });
    return true;
  }
  S.discover = discover;
  const SEEN_R = { reh: 160, wildschwein: 110, rotmilan: 260, rothirsch: 220 };
  function lookFor(a) {
    if (a.seen || !(P.mode === 'walk' || (VEH && VEH.cur))) return;
    const d = Math.hypot(a.x - P.x, a.y - P.y);
    if (d > (SEEN_R[a.art] || 120)) return;
    if (!inView(a.x, a.y, a.z + (a.bird ? 0 : 0.5))) return;
    a.seen = true;
    const sp = TARTEN.A[a.art];
    if (discover('art', a.art, sp.name, TARTEN.sourceOf(a.art)))
      PLAY.think && PLAY.think(LINES[a.art] ? LINES[a.art](a) : sp.name + '!', 4200);
    KERN.emit('tiere:gesehen', { art: a.art, x: a.x, y: a.y, d: Math.round(d) });
  }
  const LINES = {
    reh: a =>
      a.A.variant && a.A.variant.antler
        ? 'Ein Rehbock – sein Gehörn hat drei Enden auf jeder Seite.'
        : 'Ein Reh! Es äst am Waldrand.',
    wildschwein: () => 'Wildschweine – eine Rotte. Lieber Abstand halten.',
    rotmilan: () =>
      'Ein Rotmilan – der gegabelte rote Schwanz. Mehr als die Hälfte aller Rotmilane brütet in Deutschland.',
  };
  // ---------- the frame ----------
  let ready = false;
  function update(dt) {
    if (!S.on || !ready) return;
    dt = Math.min(dt, 0.1);
    S.frame++;
    if (!S.groups.length) makeGroups();
    const where = KERN.where(),
      ox = where[0],
      oy = where[1];
    // the groups: who is near enough to be real, how many
    S.acc += dt;
    if (S.acc > 0.5) {
      S.acc = 0;
      for (const g of S.groups) {
        const pl = (g.state = S.force && S.force[g.art] ? S.force[g.art](g) : plan(g));
        const cx = pl.where === 'out' ? g.feed[0] : g.home[0],
          cy = pl.where === 'out' ? g.feed[1] : g.home[1];
        const d = Math.hypot(cx - ox, cy - oy),
          r = g.art === 'rotmilan' ? S.spawnR * 1.6 : S.spawnR;
        // in cover by day only when one comes into the wood close by (then they jump up and flee)
        const coverNear = pl.where === 'cover' && d < 90;
        const want = pl.where && (pl.where !== 'cover' || coverNear) && d < r ? pl.n + (pl.kids || 0) : 0;
        if (want > g.live.length && S.live.length < S.max)
          for (let i = g.live.length; i < want && S.live.length < S.max; i++) spawn(g, i, pl);
        else if ((want === 0 && g.live.length) || d > S.dropR * (g.art === 'rotmilan' ? 1.6 : 1)) {
          // gone: those out of sight go at once, those fleeing finish their run
          for (const a of g.live.slice())
            if (a.mode !== 'flee' && (d > S.dropR || !inView(a.x, a.y, a.z + 0.5))) drop(a);
        }
        // a new plan (dusk came): the live ones walk to the new place
        for (const a of g.live) if (a.mode !== 'flee') place(a, pl, false);
      }
    }
    const T = threats();
    let moved = false;
    for (const a of S.live) {
      const pl = a.g.state || { where: 'out' };
      const v = stepAnimal(a, dt, T, pl);
      const d = Math.hypot(a.x - ox, a.y - oy);
      const far = d > 260 && S.frame % 4 !== a.i % 4;
      show(a, far ? dt * 4 : dt, far);
      if ((v > 0.05 || a.alert > 0.05) && d < 220 && inView(a.x, a.y, a.z + 0.5)) moved = true;
      if (S.frame % 8 === a.i % 8) lookFor(a);
    }
    if (moved) {
      const now = performance.now() / 1000;
      if (now - S.drawT > (RENDER.hq ? 1 / 40 : 1 / 20)) {
        S.drawT = now;
        markDirty();
      }
    }
    saveT += dt;
  }
  // ---------- for tests and the strategy mode ----------
  S.state = () => ({
    groups: S.groups.length,
    byArt: S.groups.reduce((m, g) => ((m[g.art] = (m[g.art] || 0) + 1), m), {}),
    live: S.live.length,
    liveByArt: S.live.reduce((m, a) => ((m[a.art] = (m[a.art] || 0) + 1), m), {}),
    stats: S.stats,
    seen: Object.keys(S.seen),
    found: Object.keys(S.found),
    sunEl: +sunEl().toFixed(1),
    season: season(cal().m),
  });
  S.list = () =>
    S.live.map(a => ({
      art: a.art,
      g: a.g.id,
      x: +a.x.toFixed(1),
      y: +a.y.toFixed(1),
      z: +a.z.toFixed(1),
      mode: a.mode,
      v: +a.v.toFixed(2),
      alert: +a.alert.toFixed(2),
      kid: a.kid,
    }));
  S.groupList = () =>
    S.groups.map(g => ({ id: g.id, art: g.art, home: g.home, feed: g.feed, plan: g.state, live: g.live.length }));
  // the nearest group of a species to (x, y) – where to look
  S.nearest = (art, x, y) => {
    let b = null;
    for (const g of S.groups) {
      if (g.art !== art) continue;
      const d = Math.hypot(g.feed[0] - x, g.feed[1] - y);
      if (!b || d < b.d) b = { d, g };
    }
    return b && b.g;
  };
  // tests: every animal gone, no group startled (then the next update makes them anew)
  S.reset = () => {
    for (const a of S.live.slice()) drop(a);
    for (const g of S.groups) g.scared = -1e9;
  };
  S.update = update;
  S.save = save;
  whenLoaded(() => {
    load();
    ready = true;
  });
  KERN.tick(update, 'tiere');
  KERN.on('reset', () => {
    S.seen = {};
    S.found = {};
    save();
  });
  return S;
})();
window.TIERE = TIERE;
