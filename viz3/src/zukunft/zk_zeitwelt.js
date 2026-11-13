// ===================== feat/zeitreise-welt: what the chronicle's states look and sound like in the one world (ZKZEITWELT) =====================
// The Zeitreise (zukunft/zk_regie.js drives time, camera and halts; zukunft/zk_chronik.js holds the worlds as data) hands this module one
// STATE v1 per world and frame of the time-lapse; this module makes the village look and sound like it: the forested slopes around the
// village turn red-brown, grey, cleared and green again in patches, logging, the heating house and its trench, the wind turbine on a
// beetle clearing, the heavy-rain night with water in the street and the morning after, the blackout night. Two worlds at once (the split):
// what is the same in both stays on THREE layer 0, what differs goes on layer 21 (left world L) or 22 (right world R); shared surfaces whose
// look differs (terrain, far trees) take their uniforms per render from the camera's layers (scene.onBeforeRender).
// Parts (each with its own signature – set() only rebuilds a part whose numbers changed): zk_zeitwelt_hang.js the slopes (ZKHANG).
// INTERFACE (contract v1, docs/plans/auftraege/zeitreise-gemeinsam.md – keep it stable):
//   ZKZEITWELT.warm()            once when the Zeitreise starts: compile every program it will use (warmUp) – none later
//   ZKZEITWELT.set(L, R)         L, R = STATE v1 (R null: one world, everything on layer 0); idempotent, cheap when nothing changed
//   ZKZEITWELT.place(id)         → { pos:[x,y,z], look:[x,y,z] } in site metres (x east, y north, z absolute height) for the places that
//                                depend on built things ('heizhaus', 'windrad', 'kahlflaeche', 'strasse'); null for every other id
//   ZKZEITWELT.sound(L, R, side) the ambience for the state(s); side 'L'|'R'|'both' (the split: which world one hears)
//   ZKZEITWELT.cue(id, side, info) a stress test's cue (ZKCHRONIK.CUES: regen, donner, sirene, blaulicht, pumpe, oel, licht-aus, stille,
//                                aggregat, schule-licht, aggregat-feuerwehr) at its phase; side 'L'|'R'|'both'; info { ev, p, h }
//   ZKZEITWELT.clear()           everything back to today (meshes, uniforms, weather, lights, sound)
// Extra (tests, the regie's stubs): stats(), demo(w, yf) → a stub STATE v1 for 'allein'|'gewappnet' until ZKCHRONIK exists, LAYER, S.
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { ZKKIT } from './zk_zeitwelt_kit.js';
import { ZKHANG } from './zk_zeitwelt_hang.js';
import { ZKDINGE } from './zk_zeitwelt_dinge.js';
import { ZKNACHT } from './zk_zeitwelt_nacht.js';
import { ZKTON } from './zk_zeitwelt_ton.js';
import { ZKDATA } from './zk_data.js';
import { WXTON } from '../wetter/wx_ton.js';
import { ZKWELT } from './zk_welt.js';

export const ZKZEITWELT = (() => {
  const LAYER = { both: 0, L: 21, R: 22 };
  const S = {
    warmed: false,
    L: null,
    R: null,
    split: false,
    side: 'both',
    sig: '',
    mix: null,
    n: { set: 0, sound: 0 },
    err: null,
  };
  const ter = (x, y) => (KERN.terrain ? KERN.terrain(x, y) : 0) || 0;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const smooth = (a, b, v) => {
    const t = clamp((v - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  // ---------- places that depend on what this module builds (site metres; the sites: zk_zeitwelt_dinge.js, zk_zeitwelt_nacht.js) ----------
  // eye height 1.65 m on foot; `look` is a point the camera looks at (absolute heights)
  const EYE = 1.65;
  const PLACES = {
    // in the street by the brook, on the pavement of its lower part, looking up the street towards the Anger (water, the fire engine)
    strasse: () => {
      const n = ZKNACHT.sites(),
        P = n.flood,
        c = n.cam,
        e = P.length ? P[0] : [c.x + 40, c.y];
      return [c.x, c.y, EYE, e[0], e[1], 1.3];
    },
    // in front of the heating house, from the lane: hall, bunker with the chips, chimney, the sign
    heizhaus: () => {
      const h = ZKDINGE.sites().heiz,
        c = ZKDINGE.sites().heizCam;
      return [c[0], c[1], EYE, h.x + 3, h.y, 4.5];
    },
    // at the lower edge of the clearing with the planting, looking up into it
    kahlflaeche: () => {
      const k = ZKDINGE.sites().kahl;
      return [k.x + 4, k.y + 44, EYE, k.x - 8, k.y - 40, 5];
    },
    // on the clearing below the ridge, ~300 m from the turbine (with fov ~60 the whole rotor and the forest below fit the picture)
    windrad: () => {
      const w = ZKDINGE.sites().wind,
        c = ZKDINGE.sites().windCam;
      return [c[0], c[1], EYE, w.x, w.y, ZKDINGE.HUB * 0.62];
    },
  };
  function place(id) {
    const f = PLACES[id];
    if (!f) return null;
    try {
      const [x, y, h, lx, ly, lh] = f();
      return {
        pos: [+x.toFixed(2), +y.toFixed(2), +(ter(x, y) + h).toFixed(2)],
        look: [+lx.toFixed(2), +ly.toFixed(2), +(ter(lx, ly) + lh).toFixed(2)],
      };
    } catch (e) {
      S.err = 'place ' + id + ': ' + e;
      return null;
    }
  }
  // ---------- stub states (STATE v1) until zukunft/zk_chronik.js lands: plausible curves, both worlds of the heavy climate ----------
  // The beetle years are the same in both (same climate); what differs is what the village does: clearing and planting together, the
  // heating house on beetle wood, the turbine – or each for themselves (left standing, fallen, pioneer growth, oil trucks).
  // the chronicle's state when it is there (zukunft/zk_chronik.js), else the stub below
  const demo = (w, yf) => (window.ZKCHRONIK && ZKCHRONIK.state ? ZKCHRONIK.state(w, yf) : stub(w, yf));
  function stub(w, yf) {
    const g = w === 'gewappnet',
      y = yf;
    // share of the spruce area struck by the beetle so far (2026: 0.18 – much of the region is already dead)
    const struck = clamp(0.18 + 0.62 * smooth(2026, 2036, y), 0, 0.8);
    const dead = clamp(struck - 0.12 * (1 - smooth(2026, 2030, y)), 0, 1); // red for ~1–2 years, then grey
    const red = clamp(struck - dead + 0.06 * smooth(2026, 2029, y) * (1 - smooth(2033, 2037, y)), 0, 0.3);
    const clearedAll = g ? dead * smooth(2027, 2034, y) * 0.8 : dead * smooth(2028, 2040, y) * 0.35;
    const fallen = g ? 0 : dead * smooth(2032, 2045, y) * 0.4;
    // young growth on what was cleared (planted mixed forest together, pioneers – birch, rowan, spruce – alone)
    const young = clearedAll * smooth(2033, 2050, y) * (g ? 0.95 : 0.7);
    const cleared = clearedAll - young;
    const grey = clamp(dead - clearedAll - fallen, 0, 1);
    const green = clamp(1 - red - grey - cleared - fallen - young, 0, 1);
    // the heavy-rain night in an example year (both worlds), the blackout night later
    const rainY = 2031,
      outY = 2038,
      inRain = y >= rainY && y < rainY + 0.02,
      ph = inRain ? (y - rainY) / 0.02 : 0;
    return {
      y,
      forest: {
        green,
        red,
        grey,
        cleared,
        fallen,
        young,
        regrow: g ? 'mischwald' : 'pionier',
        regrowH: clamp((y - 2033) * (g ? 0.45 : 0.6), 0, 12),
        harvest: g
          ? smooth(2027, 2030, y) * (1 - smooth(2036, 2040, y))
          : 0.2 * smooth(2029, 2031, y) * (1 - smooth(2034, 2036, y)),
        planted: g ? smooth(2030, 2040, y) : 0,
      },
      water: {
        rain: inRain ? 'starkregen' : null,
        level: inRain ? (g ? 0.12 : 0.55) * Math.sin(Math.PI * clamp(ph * 1.4, 0, 1)) : 0,
        mud: y >= rainY && y < rainY + 0.5 ? (g ? 0.15 : 0.9) * smooth(rainY, rainY + 0.012, y) : 0,
        debris: y >= rainY + 0.012 && y < rainY + 0.5 && !g ? 1 : 0,
        prepared: g ? smooth(2027, 2030, y) : 0,
        marks:
          y >= rainY
            ? [
                { y: 2023, h: 0.25 },
                { y: rainY, h: g ? 0.12 : 0.55 },
              ]
            : [{ y: 2023, h: 0.25 }],
      },
      energy: {
        heatNet: g ? (y < 2030 ? 0 : y < 2032 ? 1 : 2) : 0,
        oilTruck: !g,
        chips: g && y >= 2032 ? 1 : 0,
        windrad: g ? (y < 2034 ? 0 : y < 2035.5 ? 1 : 2) : 0,
        pvRoof: g ? 0.1 + 0.55 * smooth(2026, 2045, y) : 0.1 + 0.2 * smooth(2026, 2050, y),
        battery: g ? smooth(2032, 2040, y) : 0.15 * smooth(2030, 2050, y),
        blackout: y >= outY && y < outY + 0.004 ? { school: g, islands: g ? 0.35 : 0.08 } : null,
      },
      signs: g ? ['pflanzung', 'heizhaus'].filter((s, i) => y >= (i ? 2032 : 2031)) : [],
    };
  }
  // ---------- the state's look ----------
  // the signature of what a state shows (rounded: the time-lapse calls set() every frame; work only when the picture changes)
  const sigOf = st =>
    st
      ? JSON.stringify([
          st.forest &&
            ['green', 'red', 'grey', 'cleared', 'fallen', 'young', 'regrowH', 'harvest', 'planted'].map(
              k => +(+st.forest[k] || 0).toFixed(3)
            ),
          st.forest && st.forest.regrow,
          st.water && [
            st.water.rain,
            +(+st.water.level || 0).toFixed(3),
            +(+st.water.mud || 0).toFixed(2),
            +(+st.water.debris || 0).toFixed(2),
          ],
          st.energy && [
            st.energy.heatNet,
            !!st.energy.oilTruck,
            st.energy.windrad,
            !!st.energy.blackout,
            st.energy.blackout && st.energy.blackout.school,
          ],
          st.signs,
        ])
      : '';
  // ---------- the parts: each gets set(L, R) only when its own numbers changed; side(s) per render in the split ----------
  const r3 = v => +(+v || 0).toFixed(3);
  // the first version's PV: whole roof planes in their order until a share is reached (as ZKWELT's roofShare counts them)
  const KL = { on: false, curve: null, dieback0: null, pv: null };
  function pvCounts(st) {
    const R = ZKWELT.S.roof;
    if (!st || !R) return { np: 0, nf: 0 };
    const share = Math.max(0, Math.min(1, (st.energy && +st.energy.pvRoof) || 0)),
      want = Math.round((R.mods.length + R.flats.length) * share);
    let n = 0,
      np = 0,
      nf = 0;
    for (const p of R.P) {
      if (n >= want) break;
      n += p.mods.length;
      if (p.flat) nf = p.i1;
      else np = p.i1;
    }
    return { np, nf };
  }
  function pvSide(c) {
    const W = ZKWELT.S;
    if (!c || !W.roofMesh) return;
    W.roofMesh.count = c.np;
    W.roofMesh.visible = c.np > 0;
    if (W.flatMesh && W.flatBody) {
      W.flatMesh.count = W.flatBody.count = c.nf;
      W.flatMesh.visible = W.flatBody.visible = c.nf > 0;
    }
  }
  const PARTS = [
    {
      id: 'hang',
      sig: st =>
        st && st.forest
          ? ['green', 'red', 'grey', 'cleared', 'fallen', 'young', 'regrowH'].map(k => r3(st.forest[k])).join() +
            st.forest.regrow
          : '',
      warm: () => ZKHANG.warm(),
      set: (L, R) => ZKHANG.set(L, R),
      side: s => ZKHANG.side(s),
      clear: () => ZKHANG.clear(),
      stats: () => ZKHANG.stats(),
    },
    {
      // the first version's world (zukunft/zk_welt.js): PV on the village roofs (energy.pvRoof) and the forest at the Klinge (the near trees
      // of world/forest.js – the slope cards leave that lobe out). Its beetle curve (ZKDATA.DIEBACK at ZKDATA.YEARS) is set to the
      // chronicle's for the time of the Zeitreise, so the family forest dies, is cleared and grows again in the chronicle's years; the
      // real year goes in (quarter years: its stand is rebuilt at most four times a year of the time-lapse). PV in the split: the share of
      // each world as instance counts per render (side). The forest itself shows the left world in the split (its trees are one set).
      id: 'klinge',
      sig: st =>
        st
          ? [
              st.forest && st.forest.regrow,
              Math.floor((+st.y || 2026) * 4) / 4,
              r3(st.energy && st.energy.pvRoof),
              Math.round(((st.water && +st.water.level) || 0) * 20),
            ].join()
          : '',
      warm: () => {
        ZKWELT.warm();
        KL.curve = {};
        for (const w of ['allein', 'gewappnet'])
          KL.curve[w] = ZKDATA.YEARS.map((y, i) =>
            i === 0
              ? 0
              : window.ZKCHRONIK
                ? Math.min(0.999, Math.max(0, 1 - ZKCHRONIK.state(w, y + 0.5).forest.green))
                : ZKDATA.DIEBACK[i]
          );
        // the curve must rise: never below the year before
        for (const c of Object.values(KL.curve))
          for (let i = 1; i < c.length; i++) c[i] = Math.max(c[i], c[i - 1] + 1e-4);
      },
      set: (L, R) => {
        const st = L || R;
        if (!st) return;
        const mode = st.forest && st.forest.regrow === 'mischwald' ? 'umbau' : 'natur';
        if (!KL.dieback0) KL.dieback0 = ZKDATA.DIEBACK.slice();
        const c = KL.curve && KL.curve[mode === 'umbau' ? 'gewappnet' : 'allein'];
        if (c) c.forEach((v, i) => (ZKDATA.DIEBACK[i] = v));
        const y = Math.floor((+st.y || 2026) * 4) / 4;
        // the river (the Schleuse below the dam: the first version's flood) rises with the events – Annahme: 3 × the street's level
        const lv = (st.water && +st.water.level) || 0;
        ZKWELT.apply(
          {
            pvRoof: (st.energy && +st.energy.pvRoof) || 0,
            forest: st.forest && +st.forest.green < 0.999 ? { mode } : null,
            flood: lv > 0.02 ? Math.round(lv * 3 * 20) / 20 : 0,
          },
          y
        );
        KL.on = true;
        // PV counts of both worlds for the split
        KL.pv = { L: pvCounts(L), R: R ? pvCounts(R) : null };
        pvSide(KL.pv.L);
      },
      side: s => pvSide(KL.pv && (KL.pv[s] || KL.pv.L)),
      clear: () => {
        if (!KL.on) return;
        ZKWELT.clear();
        if (KL.dieback0) KL.dieback0.forEach((v, i) => (ZKDATA.DIEBACK[i] = v));
        KL.dieback0 = null;
        KL.on = false;
      },
      stats: () => ({
        on: KL.on,
        pv: KL.pv,
        err: ZKWELT.S.err || null,
        dieback: ZKDATA.DIEBACK.map(v => +v.toFixed(2)),
      }),
    },
    {
      // the things (heating house, trench, turbine, logging, the rain night, the blackout, signs): each compares its own description
      id: 'dinge',
      sig: st => sigOf(st),
      set: (L, R) => {
        ZKNACHT.set(L, R);
        ZKKIT.setAll(L, R);
      },
      clear: () => {
        ZKKIT.clearAll();
        ZKNACHT.clear();
      },
      stats: () => ({
        err: ZKKIT.S.err || ZKDINGE.S.err || ZKNACHT.S.err,
        anim: ZKKIT.S.animN,
        dark: ZKNACHT.S.dark,
        shown: ZKKIT.T.filter(t => (t.A && t.A.visible) || (t.B && t.B.visible)).map(
          t => t.def.id + (t.B && t.B.visible ? ':2' : '')
        ),
      }),
    },
  ];
  const psig = {};
  const guard = (name, fn) => {
    try {
      return fn();
    } catch (e) {
      S.err = name + ': ' + String(e && e.message ? e.message : e);
      console.warn('ZKZEITWELT ' + name, e);
      return null;
    }
  };
  // the split draws the scene twice (left camera layers 0+21, right 0+22): shared surfaces take that world's uniforms before each render.
  // Installed once by warm() and left in place (inert outside the split), chained to whatever was there.
  function hook() {
    if (S.hooked) return;
    const prev = scene.onBeforeRender;
    scene.onBeforeRender = function (r, sc, cam, rt) {
      if (prev) prev.call(this, r, sc, cam, rt);
      if (!S.split || !cam || !cam.layers) return;
      const m = cam.layers.mask,
        side = (m >>> LAYER.R) & 1 && !((m >>> LAYER.L) & 1) ? 'R' : 'L';
      if (side === S.drawn) return;
      S.drawn = side;
      for (const P of PARTS) if (P.side) P.side(side);
    };
    S.hooked = true;
  }
  function warm() {
    if (S.warmed) return;
    S.warmed = true;
    hook();
    // the sign atlas first (its texture is part of the sign program), then every material of the kit, then the slopes' programs
    guard('nacht warm', () => ZKNACHT.warm());
    guard('kit warm', () => ZKKIT.warm());
    for (const P of PARTS) if (P.warm) guard(P.id + ' warm', P.warm);
    // animation and sound bursts run with the frame (the clock of the Zeitreise does not run by itself)
    if (!S.offTick && KERN.tick)
      S.offTick = KERN.tick(dt => {
        if (!S.L) return;
        ZKKIT.tick(dt);
        ZKTON.tick(dt);
        if (ZKNACHT.flickering()) markDirty();
        // the street flood's foam at night, no blue flash without the engine
        const V = window.VILLAGE;
        ZKKIT.U.uZkNight.value = ZKNACHT.S.nightFn ? ZKNACHT.S.nightFn.call(V) : V && V.night ? V.night() : 0;
        if (!ZKKIT.T.some(t => t.def.id === 'feuerwehr' && ((t.A && t.A.visible) || (t.B && t.B.visible))))
          ZKKIT.U.uZkBlue.value = 0;
      }, 'zukunft/zeitwelt');
  }
  function set(L, R) {
    if (!S.warmed) warm();
    const sig = sigOf(L) + '|' + sigOf(R || null);
    S.L = L || null;
    S.R = R || null;
    S.split = !!R;
    cueReset(S.L, 'L');
    cueReset(S.R || S.L, 'R');
    // a take of the other world (the regie shows one world after the other, set(world, null)): its cues start afresh
    const wk = S.L && S.L.forest ? S.L.forest.regrow + (S.R ? '|' + (S.R.forest && S.R.forest.regrow) : '') : '';
    if (wk !== S.wkey) {
      if (S.wkey !== undefined && !S.R) {
        CUE.L = {};
        CUE.R = {};
        CUE.ev = { L: null, R: null };
      }
      S.wkey = wk;
    }
    S.drawn = null;
    if (sig === S.sig) return false;
    S.sig = sig;
    S.n.set++;
    for (const P of PARTS) {
      const k = P.sig(L) + '|' + (R ? P.sig(R) : '-');
      if (psig[P.id] === k) continue;
      psig[P.id] = k;
      guard(P.id, () => P.set(S.L, S.R));
    }
    markDirty(true);
    return true;
  }
  // ---------- sound: the ambience mix for the state(s) (stage 0: computed, not played yet) ----------
  // ---------- cues of the stress tests (ZKCHRONIK.CUES; the regie calls cue() at each cue's phase during a halt) ----------
  // A side that has had a cue in the current event follows its cues (the fire engine arrives with 'blaulicht', the school lights up with
  // 'schule-licht', the pumps run from 'pumpe'); a side without cues (a seek, the test, a stub) follows the state alone.
  const CUE = { L: {}, R: {}, ev: { L: null, R: null } };
  const cueOn = (side, id) => !!(CUE[side] && CUE[side][id]);
  const cueSeen = side => !!(CUE[side] && CUE[side].seen);
  ZKKIT.cue = (side, id, fallback) => (cueSeen(side) ? cueOn(side, id) : !!fallback);
  function cue(id, side, info) {
    try {
      const ev = info && (info.ev && info.ev.id ? info.ev.id : info.ev);
      // one world on the screen (a take of the regie: set(thatWorld, null)): its cues are that world's whatever side they name
      const sides = !S.split || side === 'both' || !side ? ['L', 'R'] : side === 'R' ? ['R'] : ['L'];
      for (const sd of sides) {
        if (ev && CUE.ev[sd] !== ev) {
          CUE[sd] = {};
          CUE.ev[sd] = ev;
        }
        CUE[sd][id] = true;
        CUE[sd].seen = true;
      }
      // one-shots: thunder (the weather's own), the village siren, the generator starting, the lights flickering out
      if (id === 'donner' && WXTON && WXTON.thunder) WXTON.thunder(700 + Math.random() * 1800);
      if (id === 'licht-aus') ZKNACHT.flicker();
      const heard = S.side === 'both' || sides.includes(S.side) || !S.split;
      if (heard) ZKTON.cue(id);
      // what the cue changes: the things that follow cues, the ambience
      if (S.L) {
        ZKKIT.setAll(S.L, S.R);
        if (S.mixArgs) sound(...S.mixArgs);
      }
      S.n.cue = (S.n.cue || 0) + 1;
      S.lastCue = id;
      return true;
    } catch (e) {
      S.err = 'cue ' + id + ': ' + e;
      return false;
    }
  }
  // a state without an event (no rain, no water, no blackout) ends the cues of its side
  function cueReset(st, side) {
    if (!st || !CUE[side].seen) return;
    const W = st.water || {},
      E = st.energy || {};
    if (!W.rain && !(+W.level > 0) && !E.blackout && !(+W.mud > 0.01)) {
      CUE[side] = {};
      CUE.ev[side] = null;
    }
  }
  function mixOf(st, side = 'L') {
    if (!st) return null;
    const F = st.forest || {},
      W = st.water || {},
      E = st.energy || {};
    const deadK = clamp((+F.grey || 0) + (+F.fallen || 0) + 0.5 * (+F.red || 0), 0, 1),
      openK = clamp((+F.cleared || 0) + (+F.young || 0) * 0.5, 0, 1);
    return {
      birds: +clamp(1 - 0.75 * deadK - 0.35 * openK, 0.1, 1).toFixed(3),
      deadWind: +clamp(deadK * 1.2, 0, 1).toFixed(3),
      harvester: +clamp(+F.harvest || 0, 0, 1).toFixed(3),
      rain: W.rain ? 1 : 0,
      water: +clamp((+W.level || 0) / 0.4, 0, 1).toFixed(3),
      sirens: ZKKIT.cue(side, 'blaulicht', W.rain && (+W.level || 0) > 0.05) && (W.rain || +W.level > 0) ? 1 : 0,
      pumps:
        ZKKIT.cue(side, 'pumpe', (+W.level || 0) > 0.02) || ((+W.mud || 0) > 0.2 && !W.rain && !(+W.level > 0.01))
          ? 1
          : 0,
      generator:
        E.blackout && (ZKKIT.cue(side, 'aggregat', E.blackout.school) || ZKKIT.cue(side, 'aggregat-feuerwehr', false))
          ? 1
          : 0,
      silence: E.blackout ? 1 : 0,
    };
  }
  function sound(L, R, side = 'both') {
    S.n.sound++;
    S.side = side;
    S.mixArgs = [L, R, side];
    const mL = mixOf(L, 'L'),
      mR = mixOf(R || null, 'R');
    // one world (R null, also a take of the right world): its own mix whatever side is named
    S.mix = !R ? mL : side === 'R' ? mR : side === 'L' ? mL : avgMix(mL, mR);
    ZKTON.set(S.mix);
    return S.mix;
  }
  function avgMix(a, b) {
    if (!a || !b) return a || b;
    const o = {};
    for (const k of Object.keys(a)) o[k] = +((a[k] + b[k]) / 2).toFixed(3);
    return o;
  }
  function clear() {
    for (const P of PARTS) if (P.clear) guard(P.id + ' clear', P.clear);
    guard('ton clear', () => ZKTON.clear());
    CUE.L = {};
    CUE.R = {};
    CUE.ev = { L: null, R: null };
    for (const k of Object.keys(psig)) delete psig[k];
    S.L = S.R = null;
    S.split = false;
    S.sig = '';
    S.mix = null;
    S.side = 'both';
    markDirty(true);
  }
  function stats() {
    return {
      warmed: S.warmed,
      split: S.split,
      sets: S.n.set,
      sig: S.sig.length,
      mix: S.mix,
      err: S.err,
      places: Object.keys(PLACES),
      parts: Object.fromEntries(PARTS.map(P => [P.id, P.stats ? guard(P.id + ' stats', P.stats) : null])),
      ton: ZKTON.stats(),
    };
  }
  return {
    warm,
    set,
    place,
    sound,
    clear,
    stats,
    demo,
    LAYER,
    S,
    PLACES,
    hang: ZKHANG,
    kit: ZKKIT,
    dinge: ZKDINGE,
    nacht: ZKNACHT,
    ton: ZKTON,
  };
})();
window.ZKZEITWELT = ZKZEITWELT;
