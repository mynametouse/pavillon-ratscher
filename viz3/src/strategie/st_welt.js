// ===================== feat/strategie: the strategy mode's bridges to the one world (STWELT) =====================
// „Ratscher von oben“ never keeps a second copy of the world (Falko 23:28: the modes are lenses on one world). Everything it shows or
// changes goes through here: the calendar and the sun (time/daynight.js), the weather (feat/wetter when it is there, else the climate),
// where the places are (the buildings as they stand now), the neighbours' walkers (npc/*), the player and the figure (game/*), the fuel
// in the cans and tanks (garden/garage_play.js), the lawn (garden/grass.js), the wood (world/fell.js, werk/holz*.js) and the workshop
// (werk/werk.js). Where a system had no way for it, it got a small one marked „feat/strategie“ (listed in docs/features/strategie.md).
import { KERN } from '../core/kern.js';
import { BUILD } from '../core/geo.js';
import { S0 } from '../garden/env.js';
import { GRASS, inPoly } from '../garden/grass.js';
import { GARAGE } from '../garden/garage.js';
import { GPLAY } from '../garden/garage_play.js';
import { P, PHASE } from '../game/walkable.js';
import { AVATAR } from '../game/avatar.js';
import { NPCS } from '../npc/npc.js';
import { LIFE } from '../npc/life.js';
import { ROADS } from '../world/roads.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { HOLZ } from '../werk/holz.js';
import { STDATA } from './st_data.js';
import { STCORE } from './st_core.js';
export const STWELT = (() => {
  const W = {};
  // ---------------- calendar, sun, weather ----------------
  W.dateOf = t => new Date((DN.e0 + Math.floor(t / 1440)) * 864e5);
  W.minOf = t => ((Math.floor(t) % 1440) + 1440) % 1440;
  W.day = (t, plan) => STCORE.day(W.dateOf(t), plan);
  W.sun = t => {
    try {
      const r = DN.riseSet(t, 'sun');
      if (r && r.up != null && r.down != null) return r;
    } catch (e) {}
    return { up: 7 * 60, down: 17 * 60 };
  };
  // mean cloud cover by month (DWD Meiningen 1991–2020, about) and the share of days with rain – the climate when there is no live weather
  const CLOUD = [0.78, 0.72, 0.68, 0.62, 0.6, 0.58, 0.56, 0.55, 0.6, 0.68, 0.8, 0.82],
    WET = [0.45, 0.4, 0.42, 0.36, 0.42, 0.45, 0.45, 0.42, 0.38, 0.4, 0.48, 0.5],
    STORM = [0.05, 0.05, 0.04, 0.02, 0.01, 0.01, 0.01, 0.01, 0.01, 0.03, 0.04, 0.05];
  const WXC = {};
  // the weather at game time t: { cloud 0..1, rain mm/h, wind km/h, storm, src } – the live one of feat/wetter (window.WETTER.at(t)),
  // else one drawn per day from the climate (the same day always gives the same weather)
  W.force = null; // tests: a fixed weather { cloud, rain, wind, storm, src }
  W.wx = t => {
    if (W.force) return W.force;
    const L = window.WETTER;
    if (L && typeof L.at === 'function')
      try {
        const v = L.at(t);
        if (v && Number.isFinite(v.cloud))
          return {
            cloud: v.cloud,
            rain: v.rain || 0,
            wind: v.wind || 0,
            storm: !!v.storm || (v.gust || 0) > 62,
            src: v.src || 'Wetter wie draußen',
          };
      } catch (e) {}
    const d = Math.floor(t / 1440),
      h = Math.floor(W.minOf(t) / 180);
    const k = d + ':' + h;
    if (WXC[k]) return WXC[k];
    const mo = W.dateOf(t).getUTCMonth(),
      r = STCORE.rng(((DN.e0 + d) * 7919) | 0),
      a = r(),
      b = r(),
      c = r(),
      rr = STCORE.rng(((DN.e0 + d) * 104729 + h * 31) | 0)();
    const cloud = Math.max(0, Math.min(1, CLOUD[mo] + (a - 0.5) * 0.9)),
      wet = b < WET[mo] * (0.6 + cloud * 0.6),
      storm = c < STORM[mo];
    const o = {
      cloud,
      rain: wet && rr < 0.55 ? +(0.3 + rr * 3).toFixed(1) : 0,
      wind: Math.round(storm ? 70 + c * 300 : 6 + a * 22),
      storm,
      src: 'Klima Meiningen (DWD), Tag für Tag gewürfelt',
    };
    const keys = Object.keys(WXC);
    if (keys.length > 400) for (const q of keys.slice(0, 200)) delete WXC[q];
    return (WXC[k] = o);
  };
  // ---------------- places as they stand now ----------------
  const WT = (x, y) => (BUILD.werkstatt ? BUILD.werkstatt.tf(x, y) : [x, y]);
  W.placePos = id => {
    try {
      if (id === 'werkstatt') return WT(0.8, -35.2);
      if (id === 'holzlager') return HOLZ.YARD0 ? [HOLZ.YARD0.x, HOLZ.YARD0.y] : WT(-1.5, -24.6);
      if (id === 'garage') {
        const h = GARAGE.home(PHASE).mower;
        return [h[0], h[1]];
      }
      if (id === 'bungalow' && BUILD.bungalow) return BUILD.bungalow.tf(9.8, 14.7);
      if (id === 'klinge') {
        const R = ROADS.routes && ROADS.routes.klinge;
        if (R && R.length) return R[R.length - 1].slice(0, 2);
      }
    } catch (e) {}
    const p = STDATA.PLACES[id];
    return p ? p.pos.slice() : null;
  };
  // the way from a to b: the route to the Klinge when one end is in the forest (the real track: garden → Anger → Geisenhöhner Weg →
  // field track → forest edge → Untere Klinge, world/roads.js), else straight (inside the garden, to the neighbours' yards)
  const FAR = 220;
  W.path = (a, b) => {
    const R = ROADS.routes && ROADS.routes.klinge;
    const near = p => Math.hypot(p[0], p[1]) < FAR;
    if (R && R.length > 2 && near(a) !== near(b)) {
      const route = near(a) ? R : R.slice().reverse();
      const first = route[0],
        last = route[route.length - 1];
      return [
        a.slice(0, 2),
        first.slice(0, 2),
        ...route.slice(1, -1).map(p => p.slice(0, 2)),
        last.slice(0, 2),
        b.slice(0, 2),
      ];
    }
    return [a.slice(0, 2), b.slice(0, 2)];
  };
  // ---------------- the player and the figure ----------------
  W.player = () => ({ x: P.x, y: P.y, mode: P.mode, fig: AVATAR.kind });
  W.figOf = id => (STDATA.PEOPLE[id] && STDATA.PEOPLE[id].fig) || null;
  W.playing = id => {
    const f = W.figOf(id);
    return !!f && AVATAR.kind === f;
  };
  // ---------------- the neighbours' walkers: positions, and steering one while he helps ----------------
  W.npc = name => NPCS[name] || null;
  W.npcPos = name => {
    const w = NPCS[name];
    return w ? [w.x, w.y] : null;
  };
  // take a neighbour's walker over: his day (npc/life.js) waits, fn(dt, w) moves him (returns true while it steers)
  W.npcTake = (name, fn) => {
    const w = NPCS[name];
    if (!w) return false;
    if (!w._strat) {
      w._strat = { ctl: w.ctl };
      try {
        LIFE.force(name, 'off');
      } catch (e) {}
    }
    w.ctl = dt => {
      let r = false;
      try {
        r = fn(dt, w);
      } catch (e) {
        console.warn('strategie npc', name, e);
      }
      if (r) return true;
      return w._strat && w._strat.ctl ? w._strat.ctl(dt) : false;
    };
    return true;
  };
  W.npcFree = name => {
    const w = NPCS[name];
    if (!w || !w._strat) return;
    w.ctl = w._strat.ctl;
    delete w._strat;
    try {
      LIFE.force(name, null);
    } catch (e) {}
  };
  // ---------------- fuel: the red can, the generator's and the mower's tanks (garden/garage_play.js – the same litres as on foot) ----------------
  W.fuel = () => ({
    can: GPLAY.C.fuel,
    canMax: GPLAY.CAN_L,
    gen: GPLAY.GEN.fuel,
    genMax: GPLAY.GEN_L,
    mower: GPLAY.M.fuel,
    mowerMax: GPLAY.TANK,
  });
  W.fuelUse = (what, l) => {
    const T = what === 'gen' ? GPLAY.GEN : what === 'mower' ? GPLAY.M : GPLAY.C;
    const q = Math.min(T.fuel, Math.max(0, l));
    T.fuel = Math.max(0, T.fuel - q);
    try {
      GPLAY.save();
    } catch (e) {}
    return q;
  };
  // refill a tank from the can (what was there): litres moved
  W.fuelFill = what => {
    const T = what === 'gen' ? GPLAY.GEN : GPLAY.M,
      max = what === 'gen' ? GPLAY.GEN_L : GPLAY.TANK,
      q = Math.min(GPLAY.C.fuel, max - T.fuel);
    if (q <= 0) return 0;
    GPLAY.C.fuel -= q;
    T.fuel += q;
    try {
      GPLAY.save();
    } catch (e) {}
    return q;
  };
  // ---------------- the lawn: the stripes of a mowing job, cut in the world as the job goes on (garden/grass.js GRASS.cut) ----------------
  const LAWN = { pts: null, area: 0 };
  function lawnStripes() {
    if (LAWN.pts) return LAWN;
    const poly = (S0 && S0.garden) || [];
    let x0 = 1e9,
      x1 = -1e9,
      y0 = 1e9,
      y1 = -1e9;
    for (const p of poly) {
      x0 = Math.min(x0, p[0]);
      x1 = Math.max(x1, p[0]);
      y0 = Math.min(y0, p[1]);
      y1 = Math.max(y1, p[1]);
    }
    // the mowing grid of garden/grass.js ends here: x −14 … 18, y −47 … 41
    x0 = Math.max(x0, -13.8);
    x1 = Math.min(x1, 17.8);
    y0 = Math.max(y0, -46.8);
    y1 = Math.min(y1, 40.8);
    const home = W.placePos('garage') || [2, 2];
    const stripes = [];
    const dx = 0.46;
    for (let x = x0 + dx / 2, i = 0; x < x1; x += dx, i++) {
      const seg = [];
      for (let y = y0; y <= y1; y += 0.25) {
        const ok = poly.length > 2 && inPoly(x, y, poly);
        if (ok) seg.push([x, y]);
        else if (seg.length) {
          stripes.push({ x, i, pts: seg.splice(0) });
        }
      }
      if (seg.length) stripes.push({ x, i, pts: seg.splice(0) });
    }
    // near the garage first: the stripes sorted by their distance from it, each run alternating its direction (the stripe look)
    stripes.sort((a, b) => Math.abs(a.x - home[0]) - Math.abs(b.x - home[0]));
    const pts = [];
    stripes.forEach((s, k) => {
      const run = k % 2 ? s.pts.slice().reverse() : s.pts;
      for (const p of run) pts.push([p[0], p[1], k % 2 ? -1 : 1]);
    });
    LAWN.pts = pts;
    LAWN.area = pts.length * 0.25 * dx;
    return LAWN;
  }
  W.lawn = lawnStripes;
  // cut the lawn from point index i0 to i1 of the stripes (the job's progress); returns the newly mown m²
  W.mow = (i0, i1, t) => {
    const L = lawnStripes();
    let m2 = 0;
    for (let i = Math.max(0, i0 | 0); i < Math.min(L.pts.length, i1 | 0); i++) {
      const p = L.pts[i];
      m2 += GRASS.cut(p[0], p[1], 0.25, t, p[2]);
    }
    return m2;
  };
  W.mownArea = t => GRASS.cutArea(t);
  W.CLOCK = CLOCK;
  return W;
})();
