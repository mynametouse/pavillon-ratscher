// ===================== feat/zeitreise-welt: what the chronicle's states look and sound like in the one world (ZKZEITWELT) =====================
// The Zeitreise (zukunft/zk_regie.js drives time, camera and halts; zukunft/zk_chronik.js holds the worlds as data) hands this module one
// STATE v1 per world and frame of the time-lapse; this module makes the village look and sound like it: the forested slopes around the
// village turn red-brown, grey, cleared and green again in patches, logging, the heating house and its trench, the wind turbine on a
// beetle clearing, the heavy-rain night with water in the street and the morning after, the blackout night. Two worlds at once (the split):
// what is the same in both stays on THREE layer 0, what differs goes on layer 21 (left world L) or 22 (right world R); shared surfaces whose
// look differs (terrain, far trees) take their uniforms per render from the camera's layers (scene.onBeforeRender).
// STAGE 0 (this commit): the API with stub behaviour so the regie and the workshop can integrate; the visuals follow in the next commits.
// INTERFACE (contract v1, docs/plans/auftraege/zeitreise-gemeinsam.md – keep it stable):
//   ZKZEITWELT.warm()            once when the Zeitreise starts: compile every program it will use (warmUp) – none later
//   ZKZEITWELT.set(L, R)         L, R = STATE v1 (R null: one world, everything on layer 0); idempotent, cheap when nothing changed
//   ZKZEITWELT.place(id)         → { pos:[x,y,z], look:[x,y,z] } in site metres (x east, y north, z absolute height) for the places that
//                                depend on built things ('heizhaus', 'windrad', 'kahlflaeche', 'strasse'); null for every other id
//   ZKZEITWELT.sound(L, R, side) the ambience for the state(s); side 'L'|'R'|'both' (the split: which world one hears)
//   ZKZEITWELT.clear()           everything back to today (meshes, uniforms, weather, lights, sound)
// Extra (tests, the regie's stubs): stats(), demo(w, yf) → a stub STATE v1 for 'allein'|'gewappnet' until ZKCHRONIK exists, LAYER, S.
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';

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
  // ---------- places that depend on what this module builds (site metres; refined when the things stand) ----------
  // eye height 1.65 m on foot; `look` is a point the camera looks at
  const EYE = 1.65;
  const PLACES = {
    // the street in the low part of the village where heavy rain runs together (Annahme until the terrain survey of the next commit)
    strasse: { pos: [214, -84], look: [224, -112], h: EYE, lh: 1.2 },
    // the heating house at the village edge by a farmyard (Annahme: a site, not a plan)
    heizhaus: { pos: [292, -150], look: [318, -168], h: EYE, lh: 4 },
    // a beetle clearing on a slope above the village, from its lower edge
    kahlflaeche: { pos: [470, -420], look: [520, -470], h: EYE, lh: 6 },
    // the wind turbine on a beetle clearing, seen from the field path at the village edge (hub ~160 m)
    windrad: { pos: [330, -260], look: [900, -1100], h: EYE, lh: 140 },
  };
  function place(id) {
    const p = PLACES[id];
    if (!p) return null;
    const [x, y] = p.pos,
      [lx, ly] = p.look;
    return { pos: [x, y, +(ter(x, y) + p.h).toFixed(2)], look: [lx, ly, +(ter(lx, ly) + p.lh).toFixed(2)] };
  }
  // ---------- stub states (STATE v1) until zukunft/zk_chronik.js lands: plausible curves, both worlds of the heavy climate ----------
  // The beetle years are the same in both (same climate); what differs is what the village does: clearing and planting together, the
  // heating house on beetle wood, the turbine – or each for themselves (left standing, fallen, pioneer growth, oil trucks).
  function demo(w, yf) {
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
  function warm() {
    if (S.warmed) return;
    S.warmed = true; // stage 0: nothing to compile yet
  }
  function set(L, R) {
    try {
      if (!S.warmed) warm();
      const sig = sigOf(L) + '|' + sigOf(R || null);
      S.L = L || null;
      S.R = R || null;
      S.split = !!R;
      if (sig === S.sig) return false;
      S.sig = sig;
      S.n.set++;
      markDirty(true);
      return true;
    } catch (e) {
      S.err = String(e && e.message ? e.message : e);
      console.warn('ZKZEITWELT.set', e);
      return false;
    }
  }
  // ---------- sound: the ambience mix for the state(s) (stage 0: computed, not played yet) ----------
  function mixOf(st) {
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
      sirens: W.rain && (+W.level || 0) > 0.05 ? 1 : 0,
      pumps: (+W.level || 0) > 0.02 || ((+W.mud || 0) > 0.2 && !W.rain) ? 1 : 0,
      generator: E.blackout && E.blackout.school ? 1 : 0,
      silence: E.blackout ? 1 : 0,
    };
  }
  function sound(L, R, side = 'both') {
    S.n.sound++;
    S.side = side;
    const mL = mixOf(L),
      mR = mixOf(R || null);
    S.mix = side === 'R' ? mR : side === 'L' || !mR ? mL : avgMix(mL, mR);
    return S.mix;
  }
  function avgMix(a, b) {
    if (!a || !b) return a || b;
    const o = {};
    for (const k of Object.keys(a)) o[k] = +((a[k] + b[k]) / 2).toFixed(3);
    return o;
  }
  function clear() {
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
    };
  }
  return { warm, set, place, sound, clear, stats, demo, LAYER, S, PLACES };
})();
window.ZKZEITWELT = ZKZEITWELT;
