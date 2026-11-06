// ===================== feat/tiere 5: what the animals do to garden and forest – browsing, rooting, the bark beetle, voles – protection,
// quiet zones, the signs one finds, and the API for the strategy mode „Ratscher von oben“ (TEINFLUSS) =====================
// A day-by-day model on the game's calendar (also through a time-lapse: every day passed is simulated, deterministic from the day):
//   Verbiss – roe deer bite the leading shoots of young trees, most in winter and spring (buds), by how many roe groups live within
//     400 m and how much they like the species (fir, oak, maple more than beech, larch, spruce); a tree guard (Wuchshülle), a fence or
//     a wire sleeve keeps them off. Shown on a planting of 40 young trees at the edge of the Klinge (half of them guarded) and on the
//     young trees of the garden and the garden planner.
//   Wühlschäden – a sounder ploughs a lawn for grubs on autumn and spring nights; an electric fence keeps them out.
//   Borkenkäfer – the spruces of the Klinge: bore dust first (green crown), six weeks later the brood flies out (red-brown crown) into
//     the neighbours, then the tree is grey and dead; out of the forest in time (felled: KERN 'fell') stops it. Last summer's trees are
//     there already (November 2026).
//   Wühlmäuse – hills in the garden meadow in autumn and spring, roots of young fruit trees without a vole basket.
//   Ruhezonen – the black stork's nest: no felling within 100 m, none and no skidding within 300 m from 1 March to 15 September.
// Signs in the world (wallows, rooted soil, browsed shoots, bore dust, beetle trees, vole hills, the nest) are found when one comes close
// and looks: KERN 'tiere:entdeckt' { kind: 'spur', id, title, source }. Saved in pav-tiere-v1 with the sightings.
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { ROADS } from '../world/roads.js';
import { FOREST } from '../world/forest.js';
import { inView } from '../npc/npc.js';
import { GPLAN } from '../gplan/gplan.js';
import { TARTEN } from './tiere_arten.js';
import { TKOERPER } from './tiere_koerper.js';
import { TIERE } from './tiere.js';
export const TEINFLUSS = (() => {
  const LSK = 'pav-tiere-v1';
  const E = {
    last: null,
    plot: null,
    garden: [],
    prot: [],
    wuehl: [],
    maus: [],
    kaefer: {},
    log: [],
    signs: [],
    huehner: null,
    ready: false,
    dirty: true,
    vis: {},
  };
  // ---------- the calendar of a game day ----------
  function dateOf(day) {
    try {
      const jd = DN.jdOf(day * 1440 + 720),
        d = new Date((jd - 2440587.5) * 864e5),
        y0 = Date.UTC(d.getUTCFullYear(), 0, 1);
      return { m: d.getUTCMonth(), doy: Math.floor((d.getTime() - y0) / 864e5), y: d.getUTCFullYear() };
    } catch (e) {
      return { m: 10, doy: 309, y: 2026 };
    }
  }
  const today = () => Math.floor(CLOCK.t / 1440);
  // a repeatable random number for a day and a key
  const rnd = (day, key) => {
    let h = 2166136261;
    const s = day + ':' + key;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
    return ((h >>> 0) % 100000) / 100000;
  };
  // ---------- saved ----------
  const num = Number.isFinite;
  function load() {
    const v = SAVE.get(LSK);
    if (!v || typeof v !== 'object') return;
    if (num(v.last)) E.last = v.last;
    if (Array.isArray(v.prot))
      E.prot = v.prot
        .filter(p => p && typeof p.kind === 'string' && num(p.x) && num(p.y) && (!p.r || num(p.r)))
        .slice(0, 200)
        .map(p => ({
          id: String(p.id || p.kind + Math.random()).slice(0, 40),
          kind: p.kind,
          x: p.x,
          y: p.y,
          r: num(p.r) ? p.r : 1,
          t: p.t,
        }));
    if (Array.isArray(v.wuehl))
      E.wuehl = v.wuehl.filter(a => Array.isArray(a) && a.length === 4 && a.every(num)).slice(-120);
    if (Array.isArray(v.maus))
      E.maus = v.maus.filter(a => Array.isArray(a) && a.length === 3 && a.every(num)).slice(-80);
    if (v.kaefer && typeof v.kaefer === 'object')
      for (const [k, a] of Object.entries(v.kaefer))
        if (Array.isArray(a) && a.length === 2 && a.every(num) && Object.keys(E.kaefer).length < 600) E.kaefer[k] = a;
    if (v.dmg && typeof v.dmg === 'object') E.dmg0 = v.dmg;
    if (v.huehner && typeof v.huehner === 'object' && num(v.huehner.x) && num(v.huehner.y))
      E.huehner = {
        x: v.huehner.x,
        y: v.huehner.y,
        n: num(v.huehner.n) ? Math.max(0, Math.min(40, v.huehner.n)) : 6,
        zu: !!v.huehner.zu,
        eier: num(v.huehner.eier) ? Math.max(0, Math.min(60, v.huehner.eier)) : 0,
      };
  }
  function save() {
    const dmg = {};
    for (const t of targets()) if (t.dmg > 0) dmg[t.id] = +t.dmg.toFixed(2);
    SAVE.set(
      LSK,
      Object.assign(SAVE.get(LSK) || { v: 1 }, {
        v: 1,
        last: E.last,
        prot: E.prot,
        wuehl: E.wuehl,
        maus: E.maus,
        kaefer: E.kaefer,
        dmg,
        huehner: E.huehner,
      })
    );
  }
  // ---------- the young trees: the planting at the Klinge, the garden's saplings, the planner's trees ----------
  // how much roe deer like a species (a leading shoot bitten per visit), after the German forest literature: fir and maple most
  const PAL = { tanne: 1, ahorn: 0.9, eiche: 0.85, buche: 0.55, laerche: 0.45, fichte: 0.2, obst: 0.7 };
  const SPN = {
    tanne: 'Weißtanne',
    ahorn: 'Bergahorn',
    eiche: 'Traubeneiche',
    buche: 'Rotbuche',
    laerche: 'Lärche',
    obst: 'Obstbaum',
  };
  function makePlot() {
    const G = TIERE.grid;
    if (!G) return null;
    // the open land in front of the family forest's edge, off the roads: the nearest free cell to the forest's north side
    let best = null;
    for (let gy = -340; gy <= 240; gy += 10)
      for (let gx = -300; gx <= 300; gx += 10) {
        const x = -470 + gx,
          y = -540 + gy;
        if (G.at(x, y) !== 3 || G.at(x + 16, y) !== 3 || G.at(x, y + 10) !== 3 || G.at(x + 16, y + 10) !== 3) continue;
        // (ROADS.edge keeps distances only up to 4 m from a road; then check a ring of points 8 m out)
        if (
          ROADS.edge &&
          [0, 1, 2, 3, 4, 5, 6, 7].some(
            k => ROADS.edge(x + 7 + Math.cos(k * 0.785) * 12, y + 4 + Math.sin(k * 0.785) * 12) > -3.8
          )
        )
          continue;
        const d = Math.hypot(gx, gy);
        if (!best || d < best.d) best = { d, x, y };
      }
    if (!best) return null;
    const trees = [],
      sp = ['tanne', 'buche', 'eiche', 'ahorn', 'laerche'];
    for (let i = 0; i < 8; i++)
      for (let j = 0; j < 5; j++)
        trees.push({
          id: 'p' + (i * 5 + j),
          x: best.x + i * 1.9 + (rnd(i, j) - 0.5) * 0.4,
          y: best.y + j * 1.9 + (rnd(j, i) - 0.5) * 0.4,
          sp: sp[j],
          dmg: 0,
          plot: true,
        });
    return { x: best.x, y: best.y, trees };
  }
  // Falko's young trees in the garden (garden/garten_heute.js) – a red-leaved one, one with berries, a young apple, a yellow one
  const GARDEN = [
    ['g_rot', -0.3, -10.9, 'ahorn'],
    ['g_beere', -4.0, -7.2, 'obst'],
    ['g_apfel', -4.4, -9.6, 'obst'],
    ['g_gelb', 9.1, 19.9, 'ahorn'],
  ];
  function targets() {
    const out = [];
    if (E.plot) out.push(...E.plot.trees);
    out.push(...E.garden);
    // the garden planner's planted trees (positions read only; the damage is kept here)
    try {
      const st = GPLAN.state;
      if (st && Array.isArray(st.items))
        for (const it of st.items)
          if (it && it.st === 'gepflanzt' && num(it.x) && num(it.y)) {
            const id = 'gp_' + it.id + '_' + Math.round(it.x * 10) + '_' + Math.round(it.y * 10);
            let t = E.gp && E.gp[id];
            if (!t) {
              E.gp = E.gp || {};
              // the plant's data (gplan): a fruit tree or not, and whether its planting put a vole basket round the roots
              const pd = GPLAN.data && GPLAN.data.db && GPLAN.data.db.byId ? GPLAN.data.db.byId.get(it.id) : null,
                steps = pd && GPLAN.M && GPLAN.M.plantSteps ? GPLAN.M.plantSteps(pd) : [];
              t = E.gp[id] = {
                id,
                x: it.x,
                y: it.y,
                sp:
                  (pd && /obst/i.test(String(pd.kategorie || pd.typ || pd.gruppe || ''))) ||
                  /apfel|birne|kirsch|pflaume|quitte|obst/i.test(it.id)
                    ? 'obst'
                    : 'ahorn',
                dmg: 0,
                gplan: true,
                korb: steps.includes('korb'),
              };
              if (E.dmg0 && num(E.dmg0[id])) t.dmg = E.dmg0[id];
            }
            out.push(t);
          }
    } catch (e) {}
    return out;
  }
  // protection of a point: a tree guard or a fence around it (roe deer), an electric fence (boar), a vole basket (voles)
  function prot(x, y, kind) {
    for (const p of E.prot) {
      const d = Math.hypot(p.x - x, p.y - y);
      if (kind === 'reh' && (p.kind === 'huelle' || p.kind === 'zaun') && d <= p.r + 0.05) return p;
      if (kind === 'sau' && p.kind === 'elektrozaun' && d <= p.r) return p;
      if (kind === 'maus' && p.kind === 'korb' && d <= p.r + 0.05) return p;
    }
    return null;
  }
  // ---------- pressure: how many roe deer live near a point ----------
  function rehDruck(x, y) {
    let p = 0;
    for (const g of TIERE.groups) {
      if (g.art !== 'reh' && g.art !== 'rothirsch') continue;
      const d = Math.min(Math.hypot(g.feed[0] - x, g.feed[1] - y), Math.hypot(g.home[0] - x, g.home[1] - y));
      if (d < 400) p += (1 - d / 400) * (g.art === 'rothirsch' ? 0.6 : 1);
    }
    return Math.min(2.5, p);
  }
  // a sounder roams several kilometres a night: every one within 2 km counts, the nearer the more
  function sauDruck(x, y) {
    let p = 0;
    for (const g of TIERE.groups) {
      if (g.art !== 'wildschwein') continue;
      const d = Math.hypot(g.home[0] - x, g.home[1] - y);
      if (d < 2000) p += 0.25 + 0.75 * (1 - d / 2000);
    }
    return Math.min(2, p);
  }
  // ---------- the bark beetle ----------
  const TINT = { 2: [1.55, 0.74, 0.4], 3: [0.82, 0.78, 0.72] };
  let spruces = null;
  const spruceList = () => {
    if (spruces) return spruces;
    const L = (FOREST.list || []).filter(t => t.sp === 'spruce' && t.h > 8 && !t.gone);
    if (L.length) spruces = L;
    return L;
  };
  function setStage(id, stage, day) {
    const t = FOREST.byId ? FOREST.byId(+id) : null;
    if (!stage) {
      delete E.kaefer[id];
      if (t) FOREST.tint(t, null);
    } else {
      E.kaefer[id] = [stage, day];
      if (t && FOREST.tint) FOREST.tint(t, TINT[stage] || null);
    }
    E.dirty = true;
  }
  function infest(t, day, why) {
    if (!t || E.kaefer[t.id] || t.gone) return false;
    setStage(t.id, 1, day);
    log({ art: 'borkenkaefer', kind: 'kaefer', id: t.id, x: t.x, y: t.y, day, why });
    return true;
  }
  // last summer: a group of dead grey spruces and a few red-brown ones on the sunny edge (deterministic)
  function seedBeetles(day) {
    const L = spruceList();
    if (!L.length || Object.keys(E.kaefer).length) return;
    const edge = L.filter(
      t => t.m !== undefined && FOREST.variant && /edge/.test((FOREST.variant(t.m) || [])[1] || '')
    );
    const pool = edge.length > 30 ? edge : L;
    const c0 = pool[Math.floor(rnd(1, 'k0') * pool.length)],
      c1 = pool[Math.floor(rnd(1, 'k1') * pool.length)];
    for (const [c, n, st] of [
      [c0, 9, 3],
      [c1, 6, 2],
    ]) {
      if (!c) continue;
      const near = L.filter(t => Math.hypot(t.x - c.x, t.y - c.y) < 22).slice(0, n);
      for (const t of near) setStage(t.id, st, day - (st === 3 ? 160 : 60));
    }
  }
  function beetleDay(day, d) {
    const L = spruceList();
    if (!L.length) return;
    const season = d.doy > 105 && d.doy < 245;
    // development: stage 1 → 2 after ~6 weeks of the warm season (the brood flies out), 2 → 3 after ~5 months
    for (const [id, [st, d0]] of Object.entries(E.kaefer)) {
      const age = day - d0;
      if (st === 1 && season && age > 42) {
        setStage(id, 2, day);
        const t = FOREST.byId(+id);
        log({ art: 'borkenkaefer', kind: 'ausflug', id: +id, x: t && t.x, y: t && t.y, day });
        // the young beetles go into the neighbours
        if (t) {
          let n = 0;
          for (const u of L) {
            if (n >= 3) break;
            if (u === t || E.kaefer[u.id] || u.gone || Math.hypot(u.x - t.x, u.y - t.y) > 18) continue;
            if (rnd(day, 'sp' + u.id) < 0.45) n += infest(u, day, 'nachbar') ? 1 : 0;
          }
        }
      } else if (st === 2 && age > 150) setStage(id, 3, day);
    }
    // new attacks on the warm days of spring and summer, most on the sunny edges
    if (season && rnd(day, 'neu') < 0.12) infest(L[Math.floor(rnd(day, 'wer') * L.length)], day, 'schwärmflug');
  }
  // ---------- one day ----------
  function log(e) {
    E.log.push(e);
    if (E.log.length > 2000) E.log.splice(0, E.log.length - 2000);
    KERN.emit('tiere:schaden', e);
  }
  function simDay(day) {
    const d = dateOf(day),
      doy = d.doy;
    // browsing: buds in winter and early spring, fresh shoots in May/June, little in summer and autumn
    const sf = doy < 115 || doy > 330 ? 1 : doy < 180 ? 0.65 : 0.22;
    for (const t of targets()) {
      if (t.dmg >= 1) continue;
      if (prot(t.x, t.y, 'reh')) continue;
      const press = rehDruck(t.x, t.y) * (t.plot ? 1 : 0.55);
      if (press <= 0) continue;
      if (rnd(day, 'v' + t.id) < 0.014 * sf * press * (PAL[t.sp] || 0.6)) {
        t.dmg = Math.min(1, t.dmg + 0.4);
        log({ art: 'reh', kind: 'verbiss', id: t.id, x: t.x, y: t.y, day, sp: t.sp });
        E.dirty = true;
      }
      // the buck frays a young tree in April and May
      if (t.plot && doy > 95 && doy < 150 && rnd(day, 'f' + t.id) < 0.002 * rehDruck(t.x, t.y)) {
        t.fege = day;
        log({ art: 'reh', kind: 'fegen', id: t.id, x: t.x, y: t.y, day });
        E.dirty = true;
      }
    }
    // rooting: a sounder in the garden meadow on autumn and spring nights, unless an electric fence is round it
    const rootSeason = (doy > 240 && doy < 335) || (doy > 60 && doy < 120);
    if (rootSeason) {
      // once they have found grubs in the lawn they come back several nights running (an episode of 2–5 nights)
      const press = sauDruck(-4, -10),
        fenced = !!prot(-4, -10, 'sau');
      if (!(E.sauBis >= day) && press > 0 && rnd(day, 'w') < 0.02 * press)
        E.sauBis = day + 1 + Math.floor(rnd(day, 'wn') * 4);
      if (E.sauBis >= day && !fenced) {
        const a = rnd(day, 'wa') * 6.283,
          r = rnd(day, 'wr') * 8;
        E.wuehl.push([-4 + Math.cos(a) * r, -10 + Math.sin(a) * r, 0.9 + rnd(day, 'ws') * 1.4, day]);
        log({ art: 'wildschwein', kind: 'wuehlen', x: -4, y: -10, day, garten: true });
        E.dirty = true;
      }
      // and at the edges of the fields by the forest (their feeding places)
      for (const g of TIERE.groups)
        if (g.art === 'wildschwein' && rnd(day, 'wf' + g.id) < 0.25) {
          const a = rnd(day, 'fa' + g.id) * 6.283;
          E.wuehl.push([
            g.feed[0] + Math.cos(a) * 12,
            g.feed[1] + Math.sin(a) * 12,
            1.2 + rnd(day, 'fs' + g.id) * 2,
            day,
          ]);
        }
    }
    // the grass grows over rooted soil in about two months
    E.wuehl = E.wuehl.filter(w => day - w[3] < 60).slice(-120);
    // voles: hills in the garden meadow in autumn and spring; roots of young fruit trees without a basket
    if ((doy > 250 && doy < 320) || (doy > 70 && doy < 140)) {
      if (rnd(day, 'm') < 0.07) {
        const a = rnd(day, 'ma') * 6.283,
          r = 1 + rnd(day, 'mr') * 6;
        E.maus.push([-2.5 + Math.cos(a) * r, -9 + Math.sin(a) * r, day]);
        E.dirty = true;
      }
      for (const t of targets())
        if (t.sp === 'obst' && !t.korb && !prot(t.x, t.y, 'maus') && t.dmg < 1 && rnd(day, 'mw' + t.id) < 0.004) {
          t.dmg = Math.min(1, t.dmg + 0.3);
          t.wurzel = day;
          log({ art: 'wuehlmaus', kind: 'wurzel', id: t.id, x: t.x, y: t.y, day });
        }
    }
    E.maus = E.maus.filter(m => day - m[2] < 120).slice(-80);
    beetleDay(day, d);
    // eggs: a hen lays almost daily in the long days, little in the short ones (laying follows the daylight)
    if (E.huehner && E.huehner.n > 0) {
      const lay = doy > 60 && doy < 240 ? 0.75 : doy < 300 ? 0.45 : 0.12;
      E.huehner.eier = Math.min(60, (E.huehner.eier || 0) + E.huehner.n * lay);
    }
    // the fox at the chickens (when there are chickens and their door stays open at night)
    if (E.huehner && !E.huehner.zu && E.huehner.n > 0 && rnd(day, 'fuchs') < 0.08) {
      E.huehner.n--;
      log({ art: 'fuchs', kind: 'huhn', x: E.huehner.x, y: E.huehner.y, day });
    }
    // the raccoon at the bins of the village
    if (doy > 60 && doy < 330 && rnd(day, 'wb') < 0.15) log({ art: 'waschbaer', kind: 'tonne', x: 222, y: -108, day });
  }
  // every day since the last one (also a time-lapse of months; at most two years at once)
  function catchUp() {
    const d = today();
    if (E.last === null) E.last = d - 1;
    if (d <= E.last) {
      E.last = d;
      return 0;
    }
    const n = Math.min(730, d - E.last);
    for (let k = d - n + 1; k <= d; k++) simDay(k);
    E.last = d;
    save();
    return n;
  }
  // ---------- drawing: saplings (fir and broadleaf, whole and browsed), tree guards, rooted soil, vole hills, bore dust, the nest ----------
  const lin = TKOERPER.lin;
  // the leaves by kind and day of the year: g green, a autumn colour, w withered but held (young beech and oak keep their dry leaves
  // through the winter), b bare (maple, larch)
  function leafState(kind, doy) {
    if (kind === 'tanne') return 'g';
    if (kind === 'ahorn') return doy >= 120 && doy < 280 ? 'g' : doy >= 280 && doy < 305 ? 'a' : 'b';
    if (kind === 'laerche') return doy >= 110 && doy < 285 ? 'g' : doy >= 285 && doy < 318 ? 'a' : 'b';
    return doy >= 125 && doy < 285 ? 'g' : doy >= 285 && doy < 320 ? 'a' : 'w';
  }
  // young trees about 1 m: the fir in whorls of flat branches with a leader, the larch slim and soft, beech/oak and maple with twigs and
  // leaf clusters; browsed: the leader or top bitten off, the tips short and bushy
  function geoSapling(kind, browsed, st) {
    const pos = [],
      col = [],
      idx = [];
    const add = (p, c) => {
      pos.push(...p);
      col.push(...c);
      return pos.length / 3 - 1;
    };
    // a cone (n sides) from (x, y0) radius r0 to y1 radius r1, colour c
    const cone = (y0, r0, y1, r1, c, n = 6, ox = 0, oz = 0, tx = 0, tz = 0) => {
      const b = [],
        t = [];
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        b.push(add([ox + Math.cos(a) * r0, y0, oz + Math.sin(a) * r0], c));
        t.push(add([ox + tx + Math.cos(a) * r1, y1, oz + tz + Math.sin(a) * r1], c));
      }
      for (let i = 0; i < n; i++) {
        const j = (i + 1) % n;
        idx.push(b[i], t[i], b[j], b[j], t[i], t[j]);
      }
      const cb = add([ox, y0, oz], c);
      for (let i = 0; i < n; i++) idx.push(cb, b[(i + 1) % n], b[i]);
    };
    // a flat branch or leaf cluster from (ox, y, oz) outwards at angle a: a shallow roof (seen from above), drooping to the tip
    const frond = (ox, y, oz, a, L, w, droop, c0, c1, rise = 0) => {
      const dx = Math.cos(a),
        dz = Math.sin(a),
        sx = -dz,
        sz = dx,
        R = [],
        Lf = [],
        Rt = [];
      for (let i = 0; i <= 3; i++) {
        const t = i / 3,
          px = ox + dx * L * t,
          pz = oz + dz * L * t,
          py = y + rise * t - droop * t * t,
          hw = w * (i === 3 ? 0.2 : i === 0 ? 0.55 : 1 - t * 0.35),
          c = i < 2 ? c0 : c1;
        R.push(add([px, py + hw * 0.3, pz], c));
        Lf.push(add([px + sx * hw, py - hw * 0.12, pz + sz * hw], c));
        Rt.push(add([px - sx * hw, py - hw * 0.12, pz - sz * hw], c));
      }
      for (let i = 0; i < 3; i++) {
        idx.push(R[i], Lf[i], R[i + 1], R[i + 1], Lf[i], Lf[i + 1]);
        idx.push(R[i], R[i + 1], Rt[i], Rt[i], R[i + 1], Rt[i + 1]);
      }
    };
    const stem = lin(0x4e4034),
      H = browsed ? 0.62 : 0.95;
    if (kind === 'tanne') {
      // silver fir: whorls of five flat, dark glossy branches, lighter new tips; the leader on top with its bud whorl
      const g = lin(0x1d3622),
        g2 = lin(0x2b4a2c),
        tiers = browsed
          ? [
              [0.14, 0.27, 6],
              [0.3, 0.26, 6],
              [0.45, 0.23, 7],
              [0.56, 0.17, 7],
            ]
          : [
              [0.16, 0.3, 5],
              [0.36, 0.26, 5],
              [0.55, 0.21, 5],
              [0.72, 0.15, 5],
              [0.85, 0.09, 4],
            ];
      cone(0, 0.014, H, 0.005, stem, 5);
      tiers.forEach(([y, L, n], k) => {
        for (let i = 0; i < n; i++)
          frond(
            0,
            y,
            0,
            (i / n) * 6.283 + k * 0.7,
            L * (0.85 + (0.3 * ((i * 7 + k * 3) % 5)) / 4),
            0.055,
            0.05,
            g,
            g2,
            0.02
          );
      });
      if (!browsed) cone(0.86, 0.012, 1.04, 0.003, g2, 5);
      else cone(0.56, 0.008, 0.66, 0.006, lin(0x6a5038), 4); // the bitten leader, a dry stub
    } else if (kind === 'laerche') {
      // larch: slim, the side twigs short and level all round the stem; soft light needles in tufts, golden in autumn, bare in winter
      cone(0, 0.012, H, 0.003, lin(0x5a4636), 5);
      const nd = st === 'g' ? lin(0x5c7c34) : st === 'a' ? lin(0x9c7a2c) : null,
        nd2 = st === 'g' ? lin(0x6e8c3c) : st === 'a' ? lin(0xb08c3a) : null,
        tw = lin(0x6a5848),
        n = browsed ? 7 : 9;
      for (let i = 0; i < n; i++) {
        const y = 0.16 + (i / n) * (H - 0.22),
          a = i * 2.4,
          L = (browsed ? 0.2 : 0.24) * (1 - (i / n) * 0.6);
        cone(y, 0.005, y + 0.03, 0.002, tw, 3, 0, 0, Math.cos(a) * L, Math.sin(a) * L);
        if (nd) frond(0, y, 0, a, L, 0.04, 0.02, nd, nd2, 0.02);
      }
    } else {
      // beech, oak, maple: an upright stem with alternate twigs, a few leaf clusters on each; the dry leaves of beech and oak stay
      // pale brown over the winter, the maple stands bare
      cone(0, 0.012, H, 0.004, stem, 5);
      const maple = kind === 'ahorn',
        leaf =
          st === 'g'
            ? lin(maple ? 0x46662a : 0x3e5c24)
            : st === 'a'
              ? lin(maple ? 0x9a7428 : 0x7c5230)
              : st === 'w'
                ? lin(0x8a6c4c)
                : null,
        leaf2 =
          st === 'g'
            ? lin(maple ? 0x527230 : 0x4a6a2a)
            : st === 'a'
              ? lin(maple ? 0xa8822e : 0x8a5c34)
              : st === 'w'
                ? lin(0x7a5e42)
                : null,
        tw = lin(0x5c4c3e),
        n = browsed ? 8 : 6;
      for (let i = 0; i < n; i++) {
        const y = 0.2 + (i / n) * (H - 0.26),
          a = i * 2.4 + (browsed ? 0.4 : 0),
          L = browsed ? 0.14 + 0.05 * (i % 2) : 0.24 - i * 0.025,
          ex = Math.cos(a) * L,
          ez = Math.sin(a) * L;
        cone(y, 0.005, y + L * 0.5, 0.002, tw, 3, 0, 0, ex, ez);
        if (leaf) {
          frond(ex * 0.45, y + L * 0.22, ez * 0.45, a + 0.6, 0.09, 0.035, 0.02, leaf, leaf2);
          frond(ex, y + L * 0.5, ez, a - 0.4, 0.1, 0.04, 0.025, leaf2, leaf);
        }
      }
      if (!browsed && leaf) frond(0, H, 0, 0.8, 0.08, 0.035, 0.0, leaf2, leaf, 0.03);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  // a low irregular mound (rooted soil, a vole hill, bore dust at a trunk foot): r = 1, height h, colours
  function geoMound(h, cA, cB, n = 14) {
    const pos = [],
      col = [],
      idx = [];
    pos.push(0, h, 0);
    col.push(...cA);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2,
        r = 0.75 + 0.25 * Math.sin(i * 2.7) * Math.cos(i * 1.3);
      pos.push(Math.cos(a) * r * 0.5, h * 0.75, Math.sin(a) * r * 0.5);
      col.push(...(i % 3 ? cA : cB));
      pos.push(Math.cos(a) * r, 0, Math.sin(a) * r);
      col.push(...cB);
    }
    for (let i = 0; i < n; i++) {
      const a = 1 + i * 2,
        b = 1 + ((i + 1) % n) * 2;
      idx.push(0, b, a, a, b, b + 1, a, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  // a hoof print: the two halves of a cloven hoof, pressed into soft ground (5 cm for a roe deer; scaled up for a boar)
  function geoPrint() {
    const pos = [],
      col = [],
      idx = [],
      c = lin(0x2a2018);
    for (const sx of [-1, 1]) {
      const b = pos.length / 3;
      pos.push(sx * 0.008, 0.003, 0);
      col.push(...c);
      for (let i = 0; i <= 8; i++) {
        const a = (i / 8) * Math.PI;
        pos.push(sx * (0.008 + Math.sin(a) * 0.011), 0.003, Math.cos(a) * 0.026);
        col.push(...c);
      }
      for (let i = 0; i < 8; i++) idx.push(b, b + 1 + i + (sx > 0 ? 1 : 0), b + 1 + i + (sx > 0 ? 0 : 1));
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  // where the prints are: a few steps through each roe group's and sounder's feeding place
  function prints() {
    const out = [];
    for (const g of TIERE.groups) {
      if (g.art !== 'reh' && g.art !== 'wildschwein') continue;
      const a = (g.seed % 628) / 100,
        dx = Math.cos(a),
        dy = Math.sin(a);
      for (let k = 0; k < 7; k++) {
        const s = (k - 3) * (g.art === 'reh' ? 0.55 : 0.45),
          side = (k % 2 ? 1 : -1) * 0.07;
        out.push({
          art: g.art,
          x: g.feed[0] + dx * s - dy * side,
          y: g.feed[1] + dy * s + dx * side,
          rot: Math.PI / 2 - a,
        });
      }
    }
    return out;
  }
  // rooted soil: lumpy turned-over sods – dark earth with clods of grass upside down, ragged at the edge
  function geoWuehl() {
    const pos = [],
      col = [],
      idx = [],
      N = 22,
      RR = [0, 0.3, 0.6, 0.85, 1.05],
      soil = lin(0x34271c),
      soil2 = lin(0x463526),
      sod = lin(0x4a5230),
      edge = lin(0x3e4a2a);
    for (let ri = 0; ri < RR.length; ri++)
      for (let k = 0; k < (ri ? N : 1); k++) {
        const q = (k / N) * 6.283,
          h = rnd(ri, 'h' + k),
          rr = RR[ri] * (1 + (ri === RR.length - 1 ? 0.25 : 0.12) * Math.sin(q * 5 + ri * 1.7)),
          z = ri === RR.length - 1 ? 0 : 0.02 + h * (ri ? 0.11 : 0.06);
        pos.push(Math.cos(q) * rr, z, Math.sin(q) * rr);
        col.push(...(ri === RR.length - 1 ? edge : h > 0.72 ? sod : h > 0.4 ? soil2 : soil));
      }
    for (let k = 0; k < N; k++) idx.push(0, 1 + ((k + 1) % N), 1 + k);
    for (let ri = 1; ri < RR.length - 1; ri++)
      for (let k = 0; k < N; k++) {
        const a = 1 + (ri - 1) * N + k,
          b = 1 + (ri - 1) * N + ((k + 1) % N),
          c = 1 + ri * N + k,
          d = 1 + ri * N + ((k + 1) % N);
        idx.push(a, b, c, b, d, c);
      }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    return g;
  }
  // a tree guard (Wuchshülle): a translucent-looking green tube, 1.2 m
  function geoGuard() {
    const g = new THREE.CylinderGeometry(0.065, 0.07, 1.2, 10, 1, true);
    g.translate(0, 0.6, 0);
    const c = lin(0x8fa58a),
      n = g.attributes.position.count,
      col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) col.set(c, i * 3);
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    return g;
  }
  const IM = {};
  const _m = new THREE.Matrix4(),
    _q = new THREE.Quaternion(),
    _s = new THREE.Vector3(),
    _p = new THREE.Vector3(),
    _e = new THREE.Euler();
  // the signs on the ground (wallow, rooted soil, vole hills, bore dust, prints): the animals' material with little sky light – the
  // terrain is darkened under the crowns, and dark wet mud would otherwise shine like a grey plate. A clone with the same shader patch
  // (onBeforeCompile), so the same program cache key: no new shader program
  let GMAT = null;
  function gmat() {
    if (GMAT) return GMAT;
    const M0 = TKOERPER.mat;
    GMAT = M0.clone();
    GMAT.onBeforeCompile = M0.onBeforeCompile;
    if (M0.customProgramCacheKey !== THREE.Material.prototype.customProgramCacheKey)
      GMAT.customProgramCacheKey = M0.customProgramCacheKey;
    GMAT.envMapIntensity = 0.22;
    GMAT.roughness = 1;
    return GMAT;
  }
  const FLAT = { wuehl: 1, maus: 1, bohrmehl: 1, tritt: 1 };
  function im(key, mk, max) {
    if (IM[key]) return IM[key];
    const m = new THREE.InstancedMesh(mk(), FLAT[key] ? gmat() : TKOERPER.mat, max);
    m.count = 0;
    m.frustumCulled = false;
    m.castShadow = false;
    m.receiveShadow = true;
    m.userData.noMerge = true;
    m.name = 'tiere ' + key;
    scene.add(m);
    return (IM[key] = m);
  }
  const ground = (x, y) => KERN.ground(x, y);
  function put(m, i, x, y, z, s, sy, rot) {
    _p.set(x, z, -y);
    _q.setFromEuler(_e.set(0, rot || 0, 0));
    _s.set(s, sy || s, s);
    m.setMatrixAt(i, _m.compose(_p, _q, _s));
  }
  // lying on the ground: tilted to the slope under it (rooted soil, hills, prints on a field that is not flat)
  const _n = new THREE.Vector3(),
    _up = new THREE.Vector3(0, 1, 0),
    _qt = new THREE.Quaternion();
  function putOn(m, i, x, y, s, rot, lift = 0.005) {
    const r = Math.max(0.5, s),
      zx = ground(x + r, y) - ground(x - r, y),
      zy = ground(x, y + r) - ground(x, y - r);
    _n.set(-zx / (2 * r), 1, zy / (2 * r)).normalize();
    _qt.setFromUnitVectors(_up, _n);
    _q.setFromEuler(_e.set(0, rot || 0, 0)).premultiply(_qt);
    _p.set(x, ground(x, y) + lift, -y);
    _s.set(s, 1, s);
    m.setMatrixAt(i, _m.compose(_p, _q, _s));
  }
  let leavesNow = null;
  function draw() {
    E.dirty = false;
    const d = dateOf(today()),
      KINDS = ['tanne', 'laerche', 'buche', 'ahorn'],
      leaves = KINDS.map(k => leafState(k, d.doy)).join('');
    if (leaves !== leavesNow) {
      for (const k of Object.keys(IM))
        if (/^bau/.test(k)) {
          scene.remove(IM[k]);
          IM[k].geometry.dispose();
          IM[k].dispose();
          delete IM[k];
        }
      leavesNow = leaves;
    }
    // saplings by kind and state (oak drawn like beech), guards round the protected ones; the planting lies in one place, so its
    // meshes get a bounding sphere and are culled out of view
    const T = targets().filter(t => t.plot),
      sets = {};
    for (const t of T) {
      const k = (KINDS.includes(t.sp) ? t.sp : 'buche') + (t.dmg >= 0.4 ? 1 : 0);
      (sets[k] = sets[k] || []).push(t);
    }
    for (const [k, list] of Object.entries(sets)) {
      const kind = k.slice(0, -1),
        m = im('bau' + k, () => geoSapling(kind, k.endsWith('1'), leafState(kind, d.doy)), 64);
      list.forEach((t, i) =>
        put(m, i, t.x, t.y, ground(t.x, t.y), 0.9 + rnd(1, t.id) * 0.3, null, rnd(2, t.id) * 6.28)
      );
      m.count = list.length;
      m.instanceMatrix.needsUpdate = true;
      m.computeBoundingSphere();
      m.frustumCulled = true;
    }
    for (const k of Object.keys(IM)) if (/^bau/.test(k) && !sets[k.slice(3)]) IM[k].count = 0;
    const guards = E.prot.filter(p => p.kind === 'huelle');
    const mg = im('huelle', geoGuard, 128);
    guards.slice(0, 128).forEach((p, i) => put(mg, i, p.x, p.y, ground(p.x, p.y) - 0.02, 1, 1, 0));
    mg.count = Math.min(128, guards.length);
    mg.instanceMatrix.needsUpdate = true;
    // rooted soil: dark clods; vole hills: small round brown hills
    const mw = im('wuehl', geoWuehl, 128);
    E.wuehl.slice(-128).forEach((w, i) => putOn(mw, i, w[0], w[1], w[2], w[3]));
    mw.count = Math.min(128, E.wuehl.length);
    mw.instanceMatrix.needsUpdate = true;
    const mm = im('maus', () => geoMound(0.07, lin(0x4a3a2a), lin(0x5a4834), 10), 80);
    E.maus.slice(-80).forEach((h, i) => put(mm, i, h[0], h[1], ground(h[0], h[1]) + 0.004, 0.22, 1, h[2]));
    mm.count = Math.min(80, E.maus.length);
    mm.instanceMatrix.needsUpdate = true;
    // bore dust at the foot of attacked spruces (stage 1 and 2), a ring of brown meal
    const mb = im('bohrmehl', () => geoMound(0.012, lin(0x8a5a30), lin(0x6a4a2a), 10), 200);
    let nb = 0;
    for (const [id, [st]] of Object.entries(E.kaefer)) {
      if (st > 2 || nb >= 200) continue;
      const t = FOREST.byId && FOREST.byId(+id);
      if (!t) continue;
      put(mb, nb++, t.x, t.y, ground(t.x, t.y) + 0.004, (t.dbh || 0.3) * 0.5 + 0.35, 1, +id);
    }
    mb.count = nb;
    mb.instanceMatrix.needsUpdate = true;
    // wallows by the sounders' homes: a muddy hollow in a flat wet spot, draped on the ground
    for (const g of TIERE.groups) if (g.art === 'wildschwein' && !g.wallow) g.wallow = wallowMesh(g);
    // hoof prints in the soft ground of the feeding places
    const PR = prints(),
      mp = im('tritt', geoPrint, 400);
    PR.slice(0, 400).forEach((p, i) =>
      put(mp, i, p.x, p.y, ground(p.x, p.y) + 0.004, p.art === 'reh' ? 1 : 1.9, 1, p.rot)
    );
    mp.count = Math.min(400, PR.length);
    mp.instanceMatrix.needsUpdate = true;
    nest();
    signs();
    markDirty();
  }
  // the wallow's place: the flattest, lowest spot within 30 m of the sounder's home (wallows lie in wet hollows)
  function wallowOf(g) {
    if (g.wallowAt) return g.wallowAt;
    let best = null;
    for (let a = 0; a < 12; a++)
      for (const r of [6, 14, 22, 30]) {
        const x = g.home[0] + Math.cos(a * 0.5236 + r) * r,
          y = g.home[1] + Math.sin(a * 0.5236 + r) * r,
          z = ground(x, y);
        let lo = z,
          hi = z;
        for (let k = 0; k < 6; k++) {
          const q = (k / 6) * 6.283,
            zz = ground(x + Math.cos(q) * 2, y + Math.sin(q) * 2);
          lo = Math.min(lo, zz);
          hi = Math.max(hi, zz);
        }
        const score = hi - lo + (z - ground(g.home[0], g.home[1])) * 0.05;
        if (!best || score < best.score) best = { score, x, y };
      }
    return (g.wallowAt = [best.x, best.y]);
  }
  // a wallow as its own small mesh: rings round the middle, each point on the ground, the mud wet and dark in the middle
  function wallowMesh(g) {
    const [cx, cy] = wallowOf(g),
      pos = [],
      col = [],
      idx = [],
      N = 18,
      RINGS = [0, 0.5, 0.95, 1.35, 1.6],
      wet = lin(0x2a241e),
      mud = lin(0x3c3226),
      dry = lin(0x54452f);
    for (let ri = 0; ri < RINGS.length; ri++)
      for (let k = 0; k < (ri ? N : 1); k++) {
        const q = (k / N) * 6.283,
          rr = RINGS[ri] * (1 + 0.18 * Math.sin(q * 3 + g.seed)),
          x = cx + Math.cos(q) * rr,
          y = cy + Math.sin(q) * rr;
        pos.push(x, ground(x, y) + (ri === RINGS.length - 1 ? 0.004 : 0.012), -y);
        col.push(...(ri < 2 ? wet : ri < 3 ? mud : dry));
      }
    // map (x, y) → three (x, -z) mirrors the ring, so the order is reversed here for faces that look up
    for (let k = 0; k < N; k++) idx.push(0, 1 + k, 1 + ((k + 1) % N));
    for (let ri = 1; ri < RINGS.length - 1; ri++)
      for (let k = 0; k < N; k++) {
        const a = 1 + (ri - 1) * N + k,
          b = 1 + (ri - 1) * N + ((k + 1) % N),
          c = 1 + ri * N + k,
          d = 1 + ri * N + ((k + 1) % N);
        idx.push(a, c, b, b, c, d);
      }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    geo.setIndex(idx);
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, gmat());
    m.userData.noMerge = true;
    m.receiveShadow = true;
    m.name = 'tiere suhle';
    scene.add(m);
    return m;
  }
  // the black stork's nest: a platform of sticks on an old tree near the nest place, ~18 m up
  let nestMesh = null;
  function nest() {
    if (nestMesh) return;
    const g = TIERE.groups.find(q => q.art === 'schwarzstorch');
    if (!g) return;
    const geo = geoMound(0.35, lin(0x4a3a2a), lin(0x3a2c20), 16);
    geo.scale(0.75, 1, 0.75);
    nestMesh = new THREE.Mesh(geo, TKOERPER.mat);
    nestMesh.userData.noMerge = true;
    let top = null;
    for (const t of FOREST.list || []) {
      const d = Math.hypot(t.x - g.nest[0], t.y - g.nest[1]);
      if (t.h > 18 && (!top || d < top.d)) top = { d, t };
    }
    const t = top ? top.t : { x: g.nest[0], y: g.nest[1], h: 20 };
    E.nestAt = [t.x + 0.9, t.y, ground(t.x, t.y) + Math.min(19, t.h * 0.72)];
    nestMesh.position.set(E.nestAt[0], E.nestAt[2], -E.nestAt[1]);
    nestMesh.name = 'tiere horst';
    scene.add(nestMesh);
  }
  // ---------- the signs one can find ----------
  function signs() {
    const S = [];
    for (const g of TIERE.groups)
      if (g.art === 'wildschwein') {
        const w = wallowOf(g);
        S.push({ kind: 'suhle', x: w[0], y: w[1], r: 12 });
      }
    for (const w of E.wuehl) S.push({ kind: 'wuehlstelle', x: w[0], y: w[1], r: 8 });
    for (const h of E.maus) S.push({ kind: 'wuehlmaushuegel', x: h[0], y: h[1], r: 5 });
    for (const t of targets()) {
      if (t.dmg >= 0.4) S.push({ kind: 'verbiss', x: t.x, y: t.y, r: 5 });
      if (t.fege) S.push({ kind: 'fegestelle', x: t.x, y: t.y, r: 5 });
    }
    for (const [id, [st]] of Object.entries(E.kaefer)) {
      const t = FOREST.byId && FOREST.byId(+id);
      if (t)
        S.push({
          kind: st === 1 ? 'bohrmehl' : 'kaeferbaum',
          x: t.x,
          y: t.y,
          r: st === 1 ? 6 : 35,
          z: st === 1 ? 0.3 : t.h * 0.7,
        });
    }
    for (const g of TIERE.groups)
      if (g.art === 'reh' || g.art === 'wildschwein')
        S.push({ kind: g.art === 'reh' ? 'trittsiegel_reh' : 'trittsiegel_sau', x: g.feed[0], y: g.feed[1], r: 4 });
    if (E.nestAt)
      S.push({
        kind: 'horst',
        x: E.nestAt[0],
        y: E.nestAt[1],
        z: E.nestAt[2] - ground(E.nestAt[0], E.nestAt[1]),
        r: 45,
      });
    E.signs = S;
  }
  let lookT = 0;
  function lookForSigns() {
    if (P.mode !== 'walk') return;
    for (const s of E.signs) {
      if (TIERE.found[s.kind] !== undefined) continue;
      const d = Math.hypot(s.x - P.x, s.y - P.y);
      if (d > s.r) continue;
      if (!inView(s.x, s.y, ground(s.x, s.y) + (s.z || 0.2))) continue;
      const sp = TARTEN.SPUREN[s.kind];
      if (!sp) continue;
      if (TIERE.discover('spur', s.kind, sp.title, TARTEN.sourceOf(sp.art))) PLAY.think && PLAY.think(sp.text, 6500);
    }
  }
  // ---------- the frame ----------
  function update(dt) {
    if (!E.ready) return;
    if (!E.plot && !E.plotTried && TIERE.grid) {
      E.plotTried = true;
      E.plot = makePlot();
      if (E.plot && E.dmg0) for (const t of E.plot.trees) if (num(E.dmg0[t.id])) t.dmg = E.dmg0[t.id];
      // the planting: the western half guarded with tubes when it was planted (spring 2026)
      if (E.plot && !E.prot.some(p => p.kind === 'huelle' && p.id.startsWith('p')))
        for (const t of E.plot.trees)
          if (+t.id.slice(1) < 20) E.prot.push({ id: t.id, kind: 'huelle', x: t.x, y: t.y, r: 0.1 });
      E.dirty = true;
    }
    if (!spruces && spruceList().length) {
      seedBeetles(today());
      // the stored stages back onto the crowns
      for (const [id, [st]] of Object.entries(E.kaefer)) {
        const t = FOREST.byId(+id);
        if (t && FOREST.tint) FOREST.tint(t, TINT[st] || null);
      }
      E.dirty = true;
    }
    if (catchUp()) E.dirty = true;
    if (E.dirty) draw();
    lookT += dt;
    if (lookT > 0.5) {
      lookT = 0;
      lookForSigns();
    }
  }
  // ---------- the API (also on TIERE: see docs/features/tiere.md, „API für Erweiterungen“) ----------
  const API = {
    // protection: { kind: 'huelle' (tree guard) | 'zaun' (fence, r) | 'elektrozaun' (electric fence, r) | 'korb' (vole basket), x, y, r }
    schutz: {
      add(p) {
        if (!p || !num(p.x) || !num(p.y) || !/^(huelle|zaun|elektrozaun|korb)$/.test(p.kind)) return null;
        const q = {
          id: String(p.id || p.kind + '_' + E.prot.length),
          kind: p.kind,
          x: p.x,
          y: p.y,
          r: num(p.r) ? p.r : 0.1,
          t: today(),
        };
        E.prot.push(q);
        E.dirty = true;
        save();
        KERN.emit('tiere:schutz', q);
        return q;
      },
      remove(id) {
        const n = E.prot.length;
        E.prot = E.prot.filter(p => p.id !== id);
        E.dirty = true;
        save();
        return n !== E.prot.length;
      },
      list: () => E.prot.slice(),
      at: (x, y, kind) => prot(x, y, kind),
    },
    // the young trees and their damage (0 whole … 1 lost)
    baeume: () =>
      targets().map(t => ({
        id: t.id,
        x: +t.x.toFixed(1),
        y: +t.y.toFixed(1),
        art: SPN[t.sp] || t.sp,
        dmg: t.dmg,
        geschuetzt: !!prot(t.x, t.y, 'reh'),
        plot: !!t.plot,
      })),
    // damage events: { art, kind: 'verbiss' | 'fegen' | 'wuehlen' | 'kaefer' | 'ausflug' | 'wurzel' | 'huhn' | 'tonne', id, x, y, day } –
    // optionally within an area (rect [x0, y0, x1, y1] or circle [x, y, r]) and a season ('winter' | 'spring' | 'summer' | 'autumn')
    schaden(o = {}) {
      const inA = e => {
        if (!num(e.x) || !num(e.y)) return !o.rect && !o.circle;
        if (o.rect) return e.x >= o.rect[0] && e.y >= o.rect[1] && e.x <= o.rect[2] && e.y <= o.rect[3];
        if (o.circle) return Math.hypot(e.x - o.circle[0], e.y - o.circle[1]) <= o.circle[2];
        return true;
      };
      const se = m => (m === 11 || m <= 1 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn');
      const L = E.log.filter(e => inA(e) && (!o.season || se(dateOf(e.day).m) === o.season));
      const sum = {};
      for (const e of L) sum[e.kind] = (sum[e.kind] || 0) + 1;
      return { n: L.length, sum, events: L.slice(-50) };
    },
    // the bark beetle: attacked spruces, their stage (1 bore dust, 2 brood flown / red-brown, 3 dead / grey), days until the brood flies
    kaefer: {
      list: () =>
        Object.entries(E.kaefer).map(([id, [st, d0]]) => {
          const t = FOREST.byId && FOREST.byId(+id);
          return {
            id: +id,
            stage: st,
            seit: d0,
            x: t ? +t.x.toFixed(1) : null,
            y: t ? +t.y.toFixed(1) : null,
            ausflugIn: st === 1 ? Math.max(0, 42 - (today() - d0)) : 0,
          };
        }),
      raus(id) {
        if (!E.kaefer[id]) return false;
        setStage(id, 0, today());
        log({ art: 'borkenkaefer', kind: 'raus', id: +id, day: today() });
        save();
        return true;
      },
      befall: id => infest(FOREST.byId && FOREST.byId(+id), today(), 'test'),
    },
    // quiet zones: is felling or skidding allowed at (x, y) today? → null, or { art, zone: 'horst' | 'brutzeit', d, why, bis }
    ruhe(x, y) {
      const g = TIERE.groups.find(q => q.art === 'schwarzstorch');
      if (!g) return null;
      const d = Math.hypot(x - g.nest[0], y - g.nest[1]),
        doy = dateOf(today()).doy,
        brut = doy >= 59 && doy <= 258;
      if (d <= 100)
        return {
          art: 'schwarzstorch',
          zone: 'horst',
          d: Math.round(d),
          why: 'Schwarzstorch-Horst: im Umkreis von 100 m nie fällen.',
          bis: null,
        };
      if (d <= 300 && brut)
        return {
          art: 'schwarzstorch',
          zone: 'brutzeit',
          d: Math.round(d),
          why: 'Brutzeit des Schwarzstorchs (1. März bis 15. September): bis 300 m vom Horst kein Holzeinschlag und kein Rücken.',
          bis: '15. September',
        };
      return null;
    },
    // how many animals of each kind live in an area now (whole groups and their sizes by the season; without an area the square)
    counts(o = {}) {
      const out = {};
      for (const g of TIERE.groups) {
        const p = o.rect
          ? g.home[0] >= o.rect[0] && g.home[1] >= o.rect[1] && g.home[0] <= o.rect[2] && g.home[1] <= o.rect[3]
          : o.circle
            ? Math.hypot(g.home[0] - o.circle[0], g.home[1] - o.circle[1]) <= o.circle[2]
            : true;
        if (!p) continue;
        const pl = TIERE.plan(g);
        out[g.art] = (out[g.art] || 0) + (pl.n || 0) + (pl.kids || 0);
      }
      return out;
    },
    // a nature value 0..100 for the strategy mode: rare species living here, quiet zones kept, the forest's health
    naturwert() {
      const rare = TIERE.groups.filter(g => TARTEN.A[g.art] && TARTEN.A[g.art].group === 'selten').length;
      const kaefer = Object.keys(E.kaefer).length,
        browsed = targets().filter(t => t.dmg >= 0.4).length;
      return Math.max(0, Math.min(100, Math.round(40 + rare * 6 - kaefer * 0.6 - browsed * 0.5)));
    },
    // chickens (for the strategy mode): where the coop is, how many, the door shut at night or not
    huehner(o) {
      if (o === null) E.huehner = null;
      else if (o && num(o.x) && num(o.y))
        E.huehner = { x: o.x, y: o.y, n: num(o.n) ? o.n : 6, zu: !!o.zu, eier: E.huehner ? E.huehner.eier || 0 : 0 };
      save();
      return E.huehner;
    },
    save,
    // simulate n days at once (the time-lapse does this by itself through the clock)
    sim(n) {
      const d0 = today();
      for (let k = 1; k <= n; k++) simDay(d0 + k);
      E.dirty = true;
      save();
    },
    state: () => ({
      plot: E.plot ? { x: E.plot.x, y: E.plot.y, n: E.plot.trees.length } : null,
      browsed: targets().filter(t => t.dmg >= 0.4).length,
      guarded: E.prot.filter(p => p.kind === 'huelle').length,
      wuehl: E.wuehl.length,
      maus: E.maus.length,
      kaefer: Object.values(E.kaefer).reduce((m, [st]) => ((m[st] = (m[st] || 0) + 1), m), {}),
      signs: E.signs.length,
      last: E.last,
      nest: E.nestAt || null,
    }),
    E,
  };
  whenLoaded(() => {
    load();
    E.garden = GARDEN.map(([id, x, y, sp]) => ({
      id,
      x,
      y,
      sp,
      dmg: E.dmg0 && num(E.dmg0[id]) ? E.dmg0[id] : 0,
      garden: true,
    }));
    E.ready = true;
  });
  KERN.tick(update, 'tiere-einfluss');
  // the mower started (garden/garage_play.js): noise for the animals near, and in May and June the fawns in the high grass
  KERN.on('garage:start', () => {
    TIERE.addNoise(P.x, P.y, 90, 20);
    const d = dateOf(today());
    if (d.doy > 125 && d.doy < 182 && E.kitz !== d.y) {
      E.kitz = d.y;
      if (PLAY.think)
        PLAY.think(
          'Mai und Juni: Ricken legen ihre Kitze ins hohe Gras, die Kitze drücken sich und fliehen nicht. Vor dem Mähen großer Wiesen absuchen – mit Hund, Drohne oder Scheuchen am Vorabend.',
          9000
        );
      KERN.emit('tiere:hinweis', {
        id: 'kitzrettung',
        title: 'Kitzrettung vor dem Mähen',
        source: TARTEN.sourceOf('reh'),
      });
    }
  });
  // a tree felled at the Klinge: a beetle tree out of the forest stops its brood
  KERN.on('fell', e => {
    if (e && E.kaefer[e.id]) API.kaefer.raus(e.id);
    // the chainsaw and the falling tree: game within a few hundred metres goes
    const t = e && FOREST.byId && FOREST.byId(+e.id);
    if (t) TIERE.addNoise(t.x, t.y, 220, 40);
  });
  KERN.on('reset', () => {
    E.prot = [];
    E.wuehl = [];
    E.maus = [];
    E.kaefer = {};
    E.log = [];
    E.last = null;
    for (const t of targets()) t.dmg = 0;
    spruces = null;
    E.dirty = true;
  });
  Object.assign(TIERE, {
    schutz: API.schutz,
    schaden: API.schaden,
    kaefer: API.kaefer,
    ruhe: API.ruhe,
    counts: API.counts,
    naturwert: API.naturwert,
    huehner: API.huehner,
    sim: API.sim,
    baeume: API.baeume,
  });
  return API;
})();
window.TEINFLUSS = TEINFLUSS;
