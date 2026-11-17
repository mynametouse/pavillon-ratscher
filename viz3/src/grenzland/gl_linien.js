// ===================== feat/grenzland-strasse: traffic with a purpose on the roads near the player (GLLINIEN) =====================
// Falko, 17.11.2026 12:26 (chosen): „Verkehr mit Ziel“ – „Schulbus, Milchlaster, Holztransporter, Streifen mit festen Runden – und
// Krähwinkels Lkw zum Verfolgen.“ 13:27: realism over quantity – could it look like this in reality?
// The timetables are grenzland/gl_linien_data.js (pure, unit-tested). Here the world: every run is one line over the square's roads
// (GLAUTO's graph; a stop that lies along a road is reached by the road it lies on). Nobody near: the run is a number on its timetable.
// Within 300 m of the player its vehicle stands on the road where the timetable puts it – out of sight or far enough to come out of the
// haze – and drives from there in real time at a lorry's pace (60 km/h outside the village, 50 in it, slower on lanes and tracks and in
// curves, gently away), stops for the player and for the traffic ahead, waits at its stops; beyond 420 m it is a number again and keeps
// the delay it made. A driver sits in the cab (a figure of grenzland/gl_fig.js – he sees, and calls the police like anybody), the patrol
// has two officers (they are police: what they see counts at once). The patrol drives only while nobody is wanted: from the first star
// the wanted level's own cars come (grenzland/gl_fahndung.js) and the patrol drives on and leaves. Nothing before the mode starts, nothing
// in 1989 or while a mission of chapter 1 runs, everything gone at „Beenden“.
//   GLLINIEN.fahrzeuge() → [{ id, art, name, x, y, linie, naechster, steht, sichtbar }] · folgen(id) → { id, name, tour, jetzt }
//   GLLINIEN.markiere(id | null) (a point on the radar for the one followed) · tick(dt) · stop() · linien() · debug
import * as THREE from 'three';
import { cam, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { VEH } from '../vehicles/vehicle.js';
import { VNETZ } from '../verkehr/verkehr_netz.js';
import { FAHRT } from '../welt/fahrt.js';
import { VAUTO } from '../verkehr/verkehr_auto.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { VPROPS } from '../world/village_props.js';
import { FOREST } from '../world/forest.js';
import { BUSPLAN } from '../bus/bus_fahrplan.js';
import { GL } from './gl_state.js';
import { GLDATA } from './gl_data.js';
import { GLLOGIK } from './gl_logik.js';
import { GLFIG } from './gl_fig.js';
import { GLAUTO } from './gl_auto.js';
import { GLKARTE } from './gl_karte.js';
import { GLORTE } from './gl_orte.js';
import { GLLDATA, GLLWEG } from './gl_linien_data.js';
export const GLLINIEN = (() => {
  const S = {
    V: {}, // per vehicle of GLLDATA.FZ: { id, def, run, c (GLAUTO car), F (figures in it), lade, ... }
    randG: {}, // the region's road graph round each of the square's road ends that a run uses
    L: {}, // per run id: { legs, ws, len, L, P, kehre } (GLLWEG.fertigLinie) or null when it cannot be driven here
    err: '',
    n: { spawn: 0, drop: 0, fig: 0 },
    planT: 0,
    mark: null, // the vehicle the radar marks (chapter 2 follows it)
    // automated browser tests (navigator.webdriver) run without this traffic unless they switch it on (GLLINIEN.aus = false): the
    // other parts' tests keep their counts and witnesses
    aus: typeof navigator !== 'undefined' && !!navigator.webdriver,
    inMission: false, // a mission may want the traffic (chapter 2); chapter 1 drives without it
    log: [],
  };
  const hyp = Math.hypot;
  const R_IN = 300, // a vehicle appears within this many metres of the player
    R_OUT = 420, // and goes beyond these
    R_SEE = 190; // closer than this it appears only where the camera does not look
  // ---- the driver's people (added to the mode's cast if not there; figures of the traffic's Rocketbox files) ----
  const KLEID = {
    sl_milch: { ober: [232, 232, 228], unter: [44, 70, 120], schuh: [30, 30, 30], arm: true },
    sl_forst: { ober: [64, 92, 52], unter: [52, 58, 46], schuh: [60, 46, 34], arm: true, kragen: [200, 120, 30] },
    sl_spedition: { ober: [36, 44, 62], unter: [40, 42, 48], schuh: [28, 28, 28], arm: true },
    sl_zustell: { ober: [70, 74, 80], unter: [44, 46, 52], schuh: [30, 30, 30], arm: true, kragen: [200, 60, 40] },
    sl_liefer: { ober: [58, 66, 82], unter: [46, 48, 54], schuh: [30, 30, 30], arm: true },
  };
  const CAST = {
    sl_milchfahrer: {
      name: 'Milchfahrer',
      fig: 'vk_m16',
      clips: 'm',
      h: 1.79,
      kleid: 'sl_milch',
      voice: { g: 'm', age: 52 },
    },
    sl_holzfahrer: {
      name: 'Holzfahrer',
      fig: 'vk_m20',
      clips: 'm',
      h: 1.84,
      kleid: 'sl_forst',
      hut: 'basecap',
      voice: { g: 'm', age: 44 },
    },
    sl_kfahrer: {
      name: 'Fahrer der Spedition',
      fig: 'vk_m02',
      clips: 'm',
      h: 1.8,
      kleid: 'sl_spedition',
      voice: { g: 'm', age: 35 },
    },
    sl_lfahrer: {
      name: 'Lkw-Fahrer',
      fig: 'vk_m11',
      clips: 'm',
      h: 1.77,
      kleid: 'sl_liefer',
      voice: { g: 'm', age: 47 },
    },
    sl_zusteller: {
      name: 'Zustellerin',
      fig: 'vk_f02',
      clips: 'f',
      h: 1.67,
      kleid: 'sl_zustell',
      voice: { g: 'f', age: 38 },
    },
  };
  for (const q of GLLDATA.SCHULE.leute) {
    KLEID[q.id] = { ober: q.ober, unter: q.unter, schuh: [34, 34, 36], arm: true };
    CAST[q.id] = { name: q.name, fig: q.fig, clips: q.g, h: q.h, kleid: q.id, voice: { g: q.g, age: 15 } };
  }
  try {
    for (const [k, v] of Object.entries(KLEID)) if (GLDATA.KLEID && !GLDATA.KLEID[k]) GLDATA.KLEID[k] = v;
    for (const [k, v] of Object.entries(CAST)) if (GLDATA.CAST && !GLDATA.CAST[k]) GLDATA.CAST[k] = v;
  } catch (e) {}
  const WHO = {
    milch: ['sl_milchfahrer'],
    holz: ['sl_holzfahrer'],
    kraehwinkel: ['sl_kfahrer'],
    zustell: ['sl_zusteller'],
    liefer: ['sl_lfahrer'],
    streife: ['polizei1', 'polizei2'],
  };
  const on = () => GL.on && GL.era === 'heute' && !S.aus && (!GL.cur || S.inMission);
  const where = () => {
    const v = VEH.cur;
    return v ? { x: v.st.x, y: v.st.y, veh: v } : { x: P.x, y: P.y, veh: null };
  };
  // ---- the calendar of the game: the day (epoch days, as the buses count them) ----
  const tagOf = t => {
    try {
      const e = DN.e0 + Math.floor(t / 1440);
      return BUSPLAN.day(e);
    } catch (e) {
      return null;
    }
  };
  // ------------------------------------------------------------------ the lines ------------------------------------------------------------------
  const LKW = new Set(['koffer', 'milchlaster', 'holzlaster']);
  // the door a van delivers to: a house of the village (world/village.js, its facade with the door) or a shop of Schleusingen's old town
  // (welt/schleusingen.js: a building whose OSM name says the kind, its door facade) → { D (the door), n (out of the house) }
  function tuerVon(w) {
    try {
      if (w.haus) {
        const b = window.VILLAGE && VILLAGE.byId && VILLAGE.byId.get(w.haus),
          f = b && b.fac && b.fac.find(q => q.door);
        if (!f) return null;
        const u = f.door.u;
        return { D: [f.ax + f.dx * u, f.ay + f.dy * u], n: [f.nx, f.ny] };
      }
      if (w.laden) {
        const re = new RegExp(w.laden, 'i'),
          SC = window.SCHL,
          b = SC && SC.state === 'ready' && (SC.bld || []).find(q => q.s && q.s[0] && re.test(q.s[0]) && q.doorFac);
        if (!b) return null;
        const d = b.doorFac;
        return { D: [d.ax + d.dx * d.u, d.ay + d.dy * d.u], n: [d.dy, -d.dx], name: b.s[0] };
      }
    } catch (e) {}
    return null;
  }
  // a waypoint as a place: [x, y], and whether it lies on a road's edge (a stop) or is a node to pass
  function punkt(w) {
    if (w.rand) {
      let b = null,
        bd = 1e9;
      for (const q of GLAUTO.zufahrten()) {
        const d = hyp(q[0] - w.rand[0], q[1] - w.rand[1]);
        if (d < bd) {
          bd = d;
          b = q;
        }
      }
      return b;
    }
    if (w.lager) return GLLDATA.ORT.lagerTor;
    if (w.haus) {
      const T = tuerVon(w);
      return T ? [T.D[0] + T.n[0] * 3, T.D[1] + T.n[1] * 3] : null;
    }
    if (w.hof) {
      try {
        const b = window.VILLAGE && VILLAGE.byId && VILLAGE.byId.get(w.hof);
        if (b) return [b.cx, b.cy];
      } catch (e) {}
      return w.p || null;
    }
    return w.p || null;
  }
  const { nearestEdge, beine, fertigLinie: fertig, amWeg } = GLLWEG;
  const fertigLinie = (f, legs, W, lkw) => fertig(f, legs, W, lkw);
  // a run in the square: waypoints from its data, legs over GLAUTO's graph
  function bauLinie(f) {
    const G = GLAUTO.netz();
    if (!G || !G.nodes.length) return null;
    const lkw = LKW.has(GLLDATA.FZ[f.fz].typ);
    const W = f.weg.map(w => {
      const q = punkt(w);
      if (!q) return null;
      if (w.halt || w.hof || w.lager || w.haus) {
        const E = nearestEdge(G, q[0], q[1]);
        if (E && E.d < 60) return { w, q: [E.x, E.y], e: E.e };
      }
      return { w, q, n: GLAUTO.nodeNear(q[0], q[1]) };
    });
    if (W.some(o => !o)) return null;
    // beyond the square's road ends on along the region's roads: nobody appears or vanishes at the square's edge
    const z = W.length - 1;
    if (f.weg[0].rand) W[0].vor = randWeg(W[0].q, false);
    if (f.weg[z].rand) W[z].nach = randWeg(W[z].q, true);
    const legs = beine(G, W, lkw, f.weg[z].rand ? null : 0);
    if (!legs) return null;
    // (the departure is the time at the square's edge: the way in from beyond starts that much earlier)
    const vorL = (W[0].vor || []).reduce((a, k) => a + laenge(k.e.pts), 0);
    return Object.assign(fertigLinie(f, legs, W, lkw), {
      tueren: f.weg.map(w => (w.zustellen ? tuerVon(w) : null)),
      vorMin: vorL / f.tempo,
    });
  }
  const laenge = P => P.reduce((a, p, i) => (i ? a + hyp(p[0] - P[i - 1][0], p[1] - P[i - 1][1]) : 0), 0);
  // the region's roads round one of the square's road ends (welt/fahrt.js; built once) and the way on along them (GLLWEG.verlaengerung)
  function randWeg(q, aus) {
    const F = FAHRT && FAHRT.data && FAHRT.data.ways,
      box = window.GEOMAN && GEOMAN.roads && GEOMAN.roads.box;
    if (!F || !F.length || !box) return null;
    const k = Math.round(q[0]) + ',' + Math.round(q[1]);
    try {
      if (!(k in S.randG)) S.randG[k] = GLLWEG.stadtNetz(F, q[0], q[1], 1200);
      return GLLWEG.verlaengerung(S.randG[k], q, aus, box);
    } catch (e) {
      return null;
    }
  }
  // ---- Schleusingen: the town's roads (the region's ways beyond the square, welt/fahrt.js) as a graph round a point; the loading doors
  //      of its shops (laeden/laeden.js, laeden.json: doors with k 'liefer'; a field `anlieferung` [{ x, y, nx, ny }] of the agent
  //      laeden-leben goes first) ----
  function rampe(shop, tuer) {
    const L = window.LAEDEN,
      sh = L && L.data && L.data.shops && L.data.shops.find(q => q.id === shop);
    if (!sh) return null;
    const D =
      Array.isArray(sh.anlieferung) && sh.anlieferung.length
        ? sh.anlieferung
        : (sh.doors || []).filter(d => d.k === 'liefer');
    const d = D[Math.min(tuer, D.length - 1)];
    if (!d || !Number.isFinite(d.x) || !Number.isFinite(d.nx)) return null;
    // the lorry's back half a metre from the door, its front away from it; its rear axle (where the line it reverses on begins: GLAUTO
    // keeps both axles on a line)
    const T = GLAUTO.TYP.koffer,
      off = -T.yr + 0.45,
      ax = off + T.b;
    return {
      x: d.x + d.nx * off,
      y: d.y + d.ny * off,
      hd: Math.atan2(d.nx, d.ny),
      tuer: [d.x, d.y],
      ax: d.x + d.nx * ax,
      ay: d.y + d.ny * ax,
    };
  }
  // a delivery: in from the cheapest end of a main or county road of the town, past the yard's lane, backwards to the door (the lorry's
  // back half a metre from it), out forward the way it came. The yard's lane: from the door straight out 14 m, to the nearest road node
  function bauStadt(f) {
    const F = FAHRT && FAHRT.data && FAHRT.data.ways;
    if (!F || !F.length) return null;
    if (!f.weg[1].rampe) {
      // a shop's door in the old town: the waypoint where the street passes in front of it (the town must be built)
      const tueren = f.weg.map(w => (w.zustellen ? tuerVon(w) : null));
      if (f.weg.some((w, i) => w.zustellen && !tueren[i])) return null;
      const f2 = Object.assign({}, f, {
        weg: f.weg.map((w, i) =>
          tueren[i]
            ? Object.assign({}, w, { p: [tueren[i].D[0] + tueren[i].n[0] * 3, tueren[i].D[1] + tueren[i].n[1] * 3] })
            : w
        ),
      });
      const G = GLLWEG.stadtNetz(F, f.zentrum[0], f.zentrum[1]),
        Lf = G && G.nodes.length ? GLLWEG.stadtWeg(G, f2, LKW.has(GLLDATA.FZ[f.fz].typ)) : null;
      return Lf ? Object.assign(Lf, { tueren }) : null;
    }
    const R0 = rampe(...f.weg[1].rampe);
    if (!R0) return null;
    // (a graph of its own: the way gets a node where the yard's lane meets the road)
    const G = GLLWEG.stadtNetz(F, R0.x, R0.y);
    return G && G.nodes.length ? GLLWEG.rampenWeg(G, { x: R0.ax, y: R0.ay, hd: R0.hd }, f) : null;
  }
  function linieVon(f, sofort = false) {
    // (a run is tried again a little later when its data are not there yet: the town's roads, a shop, the village's houses. One line is
    // built per step of the plan – a town's graph takes up to a tenth of a second)
    const q = S.L[f.id];
    if (q === undefined || (q && q.fail && performance.now() > q.fail)) {
      if (!sofort && !(S.bau > 0)) return null;
      S.bau--;
      try {
        S.L[f.id] = (f.stadt ? bauStadt(f) : bauLinie(f)) || { fail: performance.now() + 8000 };
      } catch (e) {
        S.L[f.id] = { fail: performance.now() + 30000 };
        S.err = 'linie ' + f.id + ': ' + String((e && e.message) || e).slice(0, 160);
      }
    }
    const r = S.L[f.id];
    return r && r.legs ? r : null;
  }
  // ------------------------------------------------------------------ the vehicles ------------------------------------------------------------------
  function V(id) {
    return (S.V[id] = S.V[id] || {
      id,
      def: GLLDATA.FZ[id],
      run: null,
      c: null,
      F: [],
      done: new Set(),
      hold: 0,
      stopI: -1,
    });
  }
  // which run of a vehicle is on the road at t (a run keeps going with its delay until its numbers say it is done)
  function laufend(v, t, day, dayG) {
    const m = ((t % 1440) + 1440) % 1440,
      d0 = t - m;
    if (v.run) {
      const el = t - v.run.t0 - v.run.lag;
      if ((el >= v.run.P.dauer && !v.c) || el > v.run.P.dauer + 600) {
        v.done.add(v.run.key);
        v.run = null;
      } else return v.run;
    }
    for (const f of GLLDATA.FAHRTEN) {
      if (f.fz !== v.id) continue;
      const Lf = linieVon(f);
      if (!Lf) continue;
      for (const ab of f.ab)
        for (const [d, dd] of [
          [d0, day],
          [d0 - 1440, dayG || day],
        ]) {
          const t0 = d + ab - (Lf.vorMin || 0),
            key = f.id + '@' + t0;
          if (t < t0 || t - t0 >= Lf.P.dauer || v.done.has(key) || !GLLDATA.faehrt(f, dd)) continue;
          v.run = { key, f, t0, lag: 0, P: Lf.P, Lf, i: -1 };
          if (v.done.size > 40) v.done.clear();
          return v.run;
        }
    }
    return null;
  }
  // the game minutes into a run at which its numbers put it s metres along its way
  function elVon(run, sQ) {
    let lo = 0,
      hi = run.P.dauer;
    for (let k = 0; k < 30; k++) {
      const m = (lo + hi) / 2;
      if (GLLDATA.stand(run.P, m).s < sQ) lo = m;
      else hi = m;
    }
    return hi;
  }
  // where a vehicle is now by its numbers: { x, y, hd, s, i, halt }
  function lage(v, t) {
    const r = v.run;
    if (!r) return null;
    const st = GLLDATA.stand(r.P, t - r.t0 - r.lag),
      q = amWeg(r.Lf, st.s);
    return { x: q.x, y: q.y, hd: q.hd, s: st.s, i: st.i, halt: st.halt, fertig: st.fertig };
  }
  // the camera looks there (within its field and not far)?
  const _d = new THREE.Vector3();
  function imBlick(x, y) {
    try {
      cam.getWorldDirection(_d);
      const dx = x - cam.position.x,
        dy = y + cam.position.z,
        d = hyp(dx, dy) || 1;
      return (dx * _d.x - dy * _d.z) / (d * (hyp(_d.x, _d.z) || 1)) > 0.45;
    } catch (e) {
      return false;
    }
  }
  function spawn(v, L) {
    const def = v.def,
      o = Object.assign({}, def.o);
    if (def.art === 'holz') o.kasten = L.leer ? 'leer' : undefined;
    const c = GLAUTO.spawn(def.typ, o);
    if (!c) return null;
    c.linie = v.id;
    c.strasse = true;
    v.c = c;
    v.leer = !!L.leer;
    tandem(c);
    warnblink(c, v.def.art === 'zustell');
    const q = amWeg(v.run.Lf, L.s);
    v.leg = q.i;
    GLAUTO.onLine(c, q.leg.line, q.q, 0);
    c.v = L.halt || q.leg.rev ? 0 : Math.min(8, (q.leg.line.S && q.leg.line.S[Math.round(q.q)]) || 6);
    S.n.spawn++;
    fahrer(v);
    markDirty(true);
    return c;
  }
  // its own indicator lamps (only it blinks): the hazard lights of a van at the kerb
  function warnblink(c, an) {
    if (!an || c.mats) return;
    c.mats = [];
    c.g.traverse(o => {
      if (o.isMesh && o.name === 'blink') {
        o.material = o.material.clone();
        c.mats.push(o.material);
      }
    });
  }
  // a tandem at the rear (the type says how far apart): the type's one rear axle hidden, two copies of it in its place
  function tandem(c) {
    const T = c.T;
    if (!T.tandem || !c.parts.axR || c.tand) return;
    const a0 = c.parts.axR;
    a0.visible = false;
    c.tand = [-1, 1].map(s => {
      const g = a0.clone();
      g.visible = true;
      g.position.z = -(T.b + (s * T.tandem) / 2);
      c.g.add(g);
      return g;
    });
  }
  function drop(v) {
    for (const F of v.F) if (F && !F.gone) GLFIG.drop(F);
    v.F = [];
    if (v.c) {
      if (v.c.tand) for (const g of v.c.tand) if (g.parent) g.parent.remove(g);
      for (const m of v.c.mats || []) m.dispose();
      GLAUTO.remove(v.c);
      S.n.drop++;
    }
    v.c = null;
    v.lade = 0;
    v.parkt = false;
    v.zust = null;
  }
  // ---- the people in the cab: a driver (the patrol: two officers), seated where the type says ----
  function sitzOf(c, k) {
    const T = c.T;
    if (T.sitz) return [k ? -T.sitz[0] : T.sitz[0], T.sitz[1], T.sitz[2]];
    // an estate: the front seats some 1.25 m behind the front axle, their tops half a metre up; a panel van sits higher, nearer the axle
    return T.form === 'bus' ? [k ? 0.45 : -0.45, T.a - 0.95, 0.92] : [k ? 0.37 : -0.37, T.a - 1.25, 0.52];
  }
  function fahrer(v) {
    const ids = WHO[v.def.art] || [];
    const gen = (v.gen = (v.gen || 0) + 1);
    ids.forEach((id, k) => {
      if (!GLDATA.CAST[id]) return;
      GLFIG.make(id, { era: 'heute' })
        .then(F => {
          if (!F) return;
          if (!v.c || v.gen !== gen || !GL.on) return GLFIG.drop(F);
          F.sees = true;
          F.knows = false;
          F.r = v.def.art === 'streife' ? 45 : 28;
          F.cop = v.def.art === 'streife';
          F.linie = v.id;
          F.sitzK = k;
          GLFIG.sitz(F, v.c.x, v.c.y, v.c.hd, 0.5);
          v.F.push(F);
          S.n.fig++;
          setz(v);
        })
        .catch(() => {});
    });
  }
  const _s = new THREE.Vector3();
  // the figures with the vehicle (after it moved this frame): the seat in the world, the hip over it
  function setz(v) {
    const c = v.c;
    if (!c) return;
    for (const F of v.F) {
      if (!F || F.gone || F.zust) continue;
      const q = sitzOf(c, F.sitzK);
      _s.set(q[0], q[2], -q[1]);
      c.g.localToWorld(_s);
      const hip = (F.f && F.f.hipH) || 0.95;
      F.x = _s.x;
      F.y = -_s.z;
      F.z = _s.y - hip + 0.1;
      F.hd = c.hd;
      F.g.position.set(F.x, F.z, -F.y);
      F.g.rotation.set(0, -F.hd, 0);
      F.g.visible = c.g.visible;
    }
  }
  // ---- what to stop for: the player, the other vehicles of the mode, the traffic, the buses ----
  function hindernisse(c, p) {
    const H = [];
    H.push({ x: p.x, y: p.y, r: p.veh ? 1.0 : 0.6, gap: p.veh ? 3.5 : 2.5 });
    for (const o of GLAUTO.cars)
      if (o !== c && o.g.visible && hyp(o.x - c.x, o.y - c.y) < 60) H.push({ x: o.x, y: o.y, r: 1.1, gap: 3.5 });
    try {
      for (const a of VAUTO.cars || [])
        if (a.g && a.g.visible && hyp(a.x - c.x, a.y - c.y) < 60) H.push({ x: a.x, y: a.y, r: 1.0, gap: 3.5 });
    } catch (e) {}
    try {
      if (window.BUS && BUS.obstacles)
        for (const b of BUS.obstacles()) if (hyp(b.x - c.x, b.y - c.y) < 60) H.push({ x: b.x, y: b.y, r: b.r, gap: 3 });
    } catch (e) {}
    return H;
  }
  // ---- one vehicle per frame ----
  // where it is on its run (global metres over all legs)
  const globS = v => {
    const l = v.run.Lf.legs[v.leg || 0];
    return l.s0 + (l.rev ? l.L - v.c.s : v.c.s);
  };
  // backwards along its line towards its start, at walking pace, braking to stand with the rear axle at the start (the car's s is its
  // middle: the rear axle is b behind it); the wheels turn back
  const sMin = c => -c.T.b;
  function rueck(c, dt, vmax) {
    const rest = c.s - sMin(c),
      vT = Math.min(vmax, rest <= 0.12 ? 0 : Math.sqrt(2 * 1.0 * rest));
    c.v = Math.max(0, c.v + Math.max(-3 * dt, Math.min(0.5 * dt, vT - c.v)));
    c.s = Math.max(sMin(c), c.s - c.v * dt);
    GLAUTO.pose(c);
    c.spin -= (c.v * dt) / c.T.rw;
    if (c.parts.axF) {
      c.parts.axF.rotation.x = -c.spin;
      c.parts.axR.rotation.x = -c.spin;
    }
    c.bremst = c.v < 0.3;
  }
  function fahr(v, dt, p) {
    const c = v.c,
      r = v.run,
      Lf = r.Lf,
      lkw = Lf.lkw,
      W = r.f.weg,
      li = Math.min(v.leg || 0, Lf.legs.length - 1),
      leg = Lf.legs[li];
    if (c.line !== leg.line) GLAUTO.onLine(c, leg.line, leg.rev ? leg.L - c.T.a - 0.4 : 0, 0);
    // at the end of its last leg it stands (and goes when nobody looks)
    if (c.ende && li >= Lf.legs.length - 1) {
      c.v = 0;
      c.bremst = true;
      GLAUTO.pose(c);
      return;
    }
    if (c.tand) for (const g of c.tand) g.rotation.x = -c.spin;
    c.blau = false;
    c.horn = false;
    // the hazard lights of a van while it stands at a door
    if (c.mats) {
      const an = v.hold > 0 && W[v.stopI] && W[v.stopI].zustellen && performance.now() % 680 < 340;
      for (const m of c.mats) m.emissiveIntensity = an ? 2.6 : 0;
    }
    // at a door: the driver carries the box there and comes back
    if (v.hold > 0 && W[v.stopI] && W[v.stopI].zustellen) {
      c.v = 0;
      GLAUTO.pose(c);
      zustellen(v, dt);
      return;
    }
    // waiting at a stop
    if (v.hold > 0) {
      v.hold -= dt;
      c.v = 0;
      GLAUTO.pose(c);
      if (v.hold <= 0) {
        v.halte = Object.assign(v.halte || {}, { [v.stopI]: true });
        // the timber lorry leaves the pile loaded: its load is on now (the model of a loaded lorry in its place)
        if (W[v.stopI] && W[v.stopI].laden && v.leer) neuLaden(v);
      }
      return;
    }
    if (leg.rev) {
      // backwards into the lane or to the door – stopping while somebody stands behind it
      const back = VNETZ.at(leg.line, Math.max(0, c.s + c.T.yr - 2.2), {}),
        frei = hyp(p.x - back.x, p.y - back.y) > 2.8;
      rueck(c, dt, frei ? 1.5 : 0);
      if (c.s <= sMin(c) + 0.15 && c.v < 0.05) {
        if (leg.stop >= 0 && W[leg.stop] && W[leg.stop].halt && !(v.halte || {})[leg.stop]) {
          v.hold = W[leg.stop].warte || 10;
          v.stopI = leg.stop;
          return;
        }
        if (Lf.legs[li + 1]) {
          v.leg = li + 1;
          GLAUTO.onLine(c, Lf.legs[li + 1].line, 0, 0);
        }
      }
      return;
    }
    // forward: the next stop on this leg (not one reached backwards), else the leg's end when it reverses next
    const gs = leg.s0 + c.s,
      revStop = i => Lf.legs.some(l => l.rev && l.stop === i);
    let stopS = Infinity,
      stopI = -1;
    for (let i = 1; i < W.length; i++)
      if (W[i].halt && !(v.halte || {})[i] && !revStop(i) && Lf.ws[i] > gs - 2 && Lf.ws[i] <= leg.s0 + leg.L + 0.5) {
        stopS = Lf.ws[i] - leg.s0 - (lkw ? 1.0 : 0.5);
        stopI = i;
        break;
      }
    // (before reversing it stops with its front axle still on the line: GLAUTO keeps both axles on it)
    const nach = Lf.legs[li + 1],
      vorEnde = leg.L - c.T.a - 0.4;
    if (nach && nach.rev && stopI < 0) stopS = vorEnde;
    // outside the village a lorry may go 60, in it 50; the line's own limits and curves stay
    const inOrt =
      (v.ortT = (v.ortT || 0) - dt) > 0
        ? v.inOrt
        : ((v.ortT = 0.6), (v.inOrt = /Ratscher ·|Anger|Schleusingen/.test(String(KERN.place(c.x, c.y, 0) || ''))));
    const vmax = v.def.art === 'streife' ? (inOrt ? 13.9 : 22) : inOrt ? 13.4 : 16.7;
    GLAUTO.drive(c, dt, { vmax, acc: lkw ? 0.85 : 2.2, halt: hindernisse(c, p), stopS });
    if (stopI >= 0 && c.v < 0.15 && c.s > stopS - 1.6) {
      v.hold = W[stopI].warte || 10;
      v.stopI = stopI;
    } else if (nach && nach.rev && c.v < 0.12 && c.s > vorEnde - 1.2) {
      // past the lane: now backwards (its line ends where this one ends)
      v.leg = li + 1;
      GLAUTO.onLine(c, nach.line, nach.L - (leg.L - c.s), 0);
    } else if (nach && !nach.rev && c.s >= leg.L - 0.7) {
      v.leg = li + 1;
      GLAUTO.onLine(c, nach.line, 0, c.v);
    }
  }
  // a delivery at a door: out of the cab on the driver's side, to the door, in for a few seconds, back, in, on. (Without its driver – the
  // figure not loaded – it just waits its time.) The stop ends when the driver sits again.
  function zustellen(v, dt) {
    const c = v.c,
      F = v.F[0],
      T = (v.run.Lf.tueren || [])[v.stopI],
      fertig = () => {
        v.hold = 0;
        v.zust = null;
        v.halte = Object.assign(v.halte || {}, { [v.stopI]: true });
      };
    if (!F || F.gone || !T) {
      v.hold -= dt;
      if (v.hold <= 0) fertig();
      return;
    }
    // (out on the side of the door: the van's sliding door on the kerb side, or the driver's door when the house is across the road)
    const rx = Math.cos(c.hd),
      ry = -Math.sin(c.hd),
      sg = (T.D[0] - c.x) * rx + (T.D[1] - c.y) * ry >= 0 ? 1 : -1,
      Z = v.zust || (v.zust = { st: 'aus', t: 0 }),
      seite = [c.x + rx * sg * (c.T.hw + 0.7), c.y + ry * sg * (c.T.hw + 0.7)],
      vor = [T.D[0] + T.n[0] * 0.8, T.D[1] + T.n[1] * 0.8];
    Z.t += dt;
    if (Z.st === 'aus' && Z.t > 1.2) {
      F.zust = true;
      GLFIG.steh(F, true);
      GLFIG.place(F, seite[0], seite[1], Math.atan2(vor[0] - seite[0], vor[1] - seite[1]));
      F.g.visible = true;
      Z.st = 'hin';
      Z.t = 0;
      GLFIG.go(F, [vor[0], vor[1]], 1.4, () => {
        Z.st = 'drin';
        Z.t = 0;
        F.g.visible = false;
      });
    } else if (Z.st === 'hin' && Z.t > 40) {
      // (stuck on the way: in all the same)
      Z.st = 'drin';
      Z.t = 0;
      F.g.visible = false;
    } else if (Z.st === 'drin' && Z.t > 7) {
      GLFIG.place(F, vor[0], vor[1], Math.atan2(seite[0] - vor[0], seite[1] - vor[1]));
      F.g.visible = true;
      Z.st = 'zurueck';
      Z.t = 0;
      GLFIG.go(F, [seite[0], seite[1]], 1.4, () => {
        Z.st = 'ein';
      });
    } else if ((Z.st === 'zurueck' && Z.t > 40) || Z.st === 'ein') {
      GLFIG.sitz(F, c.x, c.y, c.hd, 0.9);
      F.zust = false;
      setz(v);
      fertig();
    }
  }
  // the timber lorry's load: the model with logs in place of the empty one (the crane loaded it while it stood)
  function neuLaden(v) {
    const c = v.c,
      s = c.s,
      line = c.line;
    for (const F of v.F) if (F && !F.gone) F.g.visible = false;
    const o = Object.assign({}, v.def.o);
    const n = GLAUTO.spawn(v.def.typ, o);
    if (!n) return;
    n.linie = v.id;
    n.strasse = true;
    tandem(n);
    GLAUTO.onLine(n, line, s, 0);
    if (c.tand) for (const g of c.tand) if (g.parent) g.parent.remove(g);
    GLAUTO.remove(c);
    v.c = n;
    v.leer = false;
    setz(v);
  }
  // ---- a vehicle that stands somewhere between its runs (a delivery at its loading door): there while one is near, appeared where
  //      nobody looked; it sets off from there when its run begins ----
  function parkOf(v, t, day, dayG) {
    return GLLDATA.parkt(t, day, dayG).find(q => q.fz === v.id) || null;
  }
  function parkTick(v, pk, p) {
    const R0 = pk.wo === 'rampe' ? rampe(...pk.rampe) : null;
    if (!R0) {
      if (v.c) drop(v);
      return;
    }
    const d = hyp(R0.x - p.x, R0.y - p.y);
    if (v.c) {
      if (d > R_OUT) drop(v);
      return;
    }
    if (d > R_IN || (d < R_SEE && imBlick(R0.x, R0.y))) return;
    const c = GLAUTO.spawn(v.def.typ, Object.assign({}, v.def.o));
    if (!c) return;
    c.linie = v.id;
    c.strasse = true;
    GLAUTO.park(c, R0.x, R0.y, R0.hd);
    tandem(c);
    v.c = c;
    v.parkt = true;
    S.n.spawn++;
    markDirty(true);
  }
  // ------------------------------------------------------------------ the timber pile ------------------------------------------------------------------
  // A pile of spruce logs („Polter“) beside the forest track near the Untere Klinge where the timber lorry loads: 5 m logs across, their
  // cut ends to the track, a pile 12 m long and some 1.7 m high on two skids, on the side of the wood beside the track (the crane reaches
  // 8 m). Built when the player comes
  // within 350 m, gone beyond 450 m and at the end. Vertex colours on the traffic's material (no new shader program).
  function polterLage() {
    const G = GLAUTO.netz(),
      q = GLLDATA.ORT.polter,
      E = G && nearestEdge(G, q[0], q[1]);
    if (!E) return null;
    const p = E.e.pts;
    let hd = 0,
      bd = 1e9;
    for (let i = 0; i + 1 < p.length; i++) {
      const d = hyp((p[i][0] + p[i + 1][0]) / 2 - E.x, (p[i][1] + p[i + 1][1]) / 2 - E.y);
      if (d < bd) {
        bd = d;
        hd = Math.atan2(p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]);
      }
    }
    // the side of the wood (else the right)
    const side =
      [1, -1].find(sg => {
        try {
          return FOREST && FOREST.owns && FOREST.owns(E.x + Math.cos(hd) * sg * 12, E.y - Math.sin(hd) * sg * 12);
        } catch (e) {
          return false;
        }
      }) || 1;
    const off = 5.2;
    return { x: E.x + Math.cos(hd) * side * off, y: E.y - Math.sin(hd) * side * off, hd };
  }
  function polter(p) {
    const q = GLLDATA.ORT.polter,
      d = hyp(p.x - q[0], p.y - q[1]);
    if (S.polter && (d > 450 || !on())) {
      if (S.polter.parent) S.polter.parent.remove(S.polter);
      S.polter.geometry.dispose();
      S.polter = null;
      markDirty(true);
      return;
    }
    if (S.polter || d > 350 || !on()) return;
    const A = polterLage();
    if (!A) return;
    const K = VPROPS.kit(),
      lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
      L = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)],
      bark = L(104, 88, 70),
      bark2 = L(88, 74, 60),
      wood = L(222, 194, 146),
      R = [
        0.17, 0.21, 0.19, 0.16, 0.22, 0.18, 0.2, 0.17, 0.19, 0.21, 0.18, 0.2, 0.16, 0.19, 0.22, 0.18, 0.17, 0.2, 0.19,
        0.21,
      ];
    // as a pile by a forest road is laid for the crane: the logs across, their cut ends to the track, the pile 12 m along it on two skids,
    // five layers (each lying in the hollows of the one below)
    const LP = 12;
    for (const x of [-1.6, 1.6]) K.box(x, 0, 0.08, 0.22, LP + 0.5, 0.16, 0, bark2);
    let n = 0,
      z = 0.16;
    for (let row = 0; row < 5; row++) {
      const cnt = 30 - row * 2,
        w = cnt * 0.4,
        r0 = R[(row * 7) % R.length];
      for (let i = 0; i < cnt; i++) {
        const r = R[n++ % R.length],
          y = -w / 2 + (w * (i + 0.5)) / cnt,
          x0 = -2.5 + ((i * 7 + row) % 3) * 0.06,
          x1 = 2.5 - ((i * 5 + row) % 3) * 0.07;
        GLORTE.rolle(K, [x0, y, z + r], [x1, y, z + r], r, i % 3 ? bark : bark2, 8, { capCol: wood });
      }
      z += r0 * 1.7;
    }
    const m = new THREE.Mesh(K.geo(), VFIG.mat());
    m.userData.noMerge = true;
    m.castShadow = false;
    m.name = 'grenzland polter';
    m.position.set(A.x, KERN.ground(A.x, A.y) || 0, -A.y);
    m.rotation.y = -A.hd;
    scene.add(m);
    S.polter = m;
    S.polterAt = [A.x, A.y];
    markDirty(true);
  }
  // ------------------------------------------------------------------ the pupils at the school bus stop ------------------------------------------------------------------
  // On school days, from a quarter of an hour before the 268 (7:02) and the 214 (7:40), three pupils wait in front of the shelter at the
  // Anger (only while the player is within 260 m); when the real bus (bus/bus.js) stands there with open doors they walk to its front
  // door and get in; after the departure (or if no bus came) they are gone where nobody looks.
  function schule(p, t) {
    const m = ((t % 1440) + 1440) % 1440,
      H = GLLDATA.ORT.wartehaus,
      d = hyp(p.x - H[0], p.y - H[1]),
      ab = d < 260 ? GLLDATA.schulbus(m, tagOf(t)) : null,
      K = (S.kinder = S.kinder || []);
    if (ab && !K.length && !S.kinderLaden) {
      S.kinderLaden = true;
      S.kinderAb = ab;
      // the shelter's open side faces the road (azimuth 200°): the places in front of it
      const az = (200 * Math.PI) / 180,
        ux = Math.cos(az),
        uy = -Math.sin(az),
        vx = Math.sin(az),
        vy = Math.cos(az);
      GLLDATA.SCHULE.leute.forEach((q, i) => {
        const [u, w] = GLLDATA.SCHULE.plaetze[i];
        const x = H[0] + ux * u + vx * w,
          y = H[1] + uy * u + vy * w;
        GLFIG.make(q.id, { era: 'heute', ding: i === 1 ? undefined : 'tasche' })
          .then(F => {
            if (!F) return;
            if (!GL.on || !S.kinderLaden) return GLFIG.drop(F);
            F.sees = true;
            F.knows = true;
            F.r = 25;
            F.linie = 'schule';
            GLFIG.place(F, x, y, az + (i - 1) * 0.5);
            K.push(F);
          })
          .catch(() => {});
      });
      return;
    }
    if (!K.length) {
      if (!ab) S.kinderLaden = false;
      return;
    }
    // the bus at the stop with its doors open: to the front door, in
    let bus = null;
    try {
      if (window.BUS && BUS.S)
        bus = BUS.S.inst.find(
          I =>
            I.st === 'halt' &&
            I.B &&
            I.B.open > 0.6 &&
            GLLDATA.SCHULE.abfahrten.some(a => a.linie === I.trip.line) &&
            hyp(I.x - GLLDATA.ORT.schulbus[0], I.y - GLLDATA.ORT.schulbus[1]) < 25
        );
    } catch (e) {}
    for (const F of K.slice()) {
      if (F.gone) continue;
      if (bus && !F.zumBus) {
        F.zumBus = true;
        const q = BUS.doorPt(bus, 0.6);
        GLFIG.go(F, [q.x ?? q[0], q.y ?? q[1]], 1.4, () => {
          GLFIG.drop(F);
          K.splice(K.indexOf(F), 1);
        });
      } else if (!ab && !F.zumBus && (d > 120 || !imBlick(F.x, F.y))) {
        GLFIG.drop(F);
        K.splice(K.indexOf(F), 1);
      }
    }
    if (!ab && !K.length) S.kinderLaden = false;
  }
  function schuleWeg() {
    for (const F of S.kinder || []) if (!F.gone) GLFIG.drop(F);
    S.kinder = [];
    S.kinderLaden = false;
  }
  // ------------------------------------------------------------------ per frame ------------------------------------------------------------------
  function tick(dt) {
    if (!GL.on) return;
    try {
      lauf(Math.min(dt, 0.25));
    } catch (e) {
      if (!S.err) console.warn('grenzland traffic', e);
      S.err = String((e && e.stack) || e).slice(0, 300);
    }
  }
  function lauf(dt) {
    if (!on()) {
      for (const v of Object.values(S.V)) if (v.c) drop(v);
      if (S.polter) polter(where());
      if (S.kinder && S.kinder.length) schuleWeg();
      return;
    }
    const p = where(),
      t = CLOCK.t,
      sterne = GLLOGIK.stars(GL.W);
    polter(p);
    if ((S.schulT = (S.schulT || 0) - dt) <= 0) {
      S.schulT = 0.5;
      schule(p, t);
    }
    // the plan a few times a second: who is on the road, who appears, who goes
    if ((S.planT -= dt) <= 0) {
      S.planT = 0.5;
      S.bau = 1;
      const day = tagOf(t),
        dayG = tagOf(t - 1440);
      for (const id of Object.keys(GLLDATA.FZ)) {
        const v = V(id),
          run = laufend(v, t, day, dayG);
        if (!run) {
          const pk = parkOf(v, t, day, dayG);
          if (pk) parkTick(v, pk, p);
          else if (v.c) drop(v);
          continue;
        }
        // it stood there (at a loading door): it sets off on its run from where it stands, the driver back in the cab
        if (v.c && v.parkt) {
          v.parkt = false;
          v.leg = 0;
          GLAUTO.onLine(v.c, run.Lf.legs[0].line, 0, 0);
          v.c.v = 0;
          if (!v.F.length) fahrer(v);
        }
        if (run.i < 0) {
          run.i = 0;
          v.halte = {};
          v.hold = 0;
          v.leg = 0;
          v.leer = v.def.art === 'holz';
        }
        if (v.c) {
          const d = hyp(v.c.x - p.x, v.c.y - p.y);
          // far: a number again (with the delay it made); the patrol while somebody is wanted: as soon as it is out of sight
          const weg = d > R_OUT || (v.def.art === 'streife' && sterne > 0 && (d > 120 || !imBlick(v.c.x, v.c.y)));
          // at the end of its way (where the region's roads end): gone – but not under the player's eyes (it waits there till then)
          const amEnde = v.c.ende && (v.leg || 0) >= run.Lf.legs.length - 1 && (d >= R_SEE || !imBlick(v.c.x, v.c.y));
          if (weg || amEnde) {
            const el = elVon(run, globS(v));
            run.lag = Math.max(0, t - run.t0 - el);
            if (amEnde) run.lag = -1e6;
            drop(v);
          }
          continue;
        }
        if (v.def.art === 'streife' && !GLLDATA.streife(sterne)) continue;
        let L = lage(v, t);
        if (!L || L.fertig) continue;
        const d = hyp(L.x - p.x, L.y - p.y);
        if (d > R_IN) continue;
        // not under the player's eyes: far enough to come out of the haze, or where the camera does not look – else further back on its
        // way, where nobody looks (it is a little late then)
        if (d < R_SEE && imBlick(L.x, L.y)) {
          let s2 = L.s,
            ok = false;
          for (let k = 0; k < 24 && s2 > 0; k++) {
            s2 = Math.max(0, s2 - 15);
            const q = amWeg(run.Lf, s2),
              dq = hyp(q.x - p.x, q.y - p.y);
            if (dq > R_IN) break;
            if (dq >= R_SEE || !imBlick(q.x, q.y)) {
              ok = true;
              break;
            }
          }
          if (!ok) continue;
          run.lag = Math.max(0, t - run.t0 - elVon(run, s2));
          L = lage(v, t);
          if (!L || L.fertig) continue;
        }
        // a stop already passed on the numbers counts as done
        for (let i = 1; i < run.f.weg.length; i++) if (run.Lf.ws[i] < L.s - 1) v.halte[i] = true;
        if (L.halt) {
          v.hold = run.f.weg[L.i] ? run.f.weg[L.i].warte || 10 : 10;
          v.stopI = L.i;
        }
        L.leer = v.def.art === 'holz' && !run.f.weg.some((w, i) => w.laden && v.halte[i]);
        spawn(v, L);
      }
    }
    for (const v of Object.values(S.V))
      if (v.c && v.run) {
        fahr(v, dt, p);
        setz(v);
      }
  }
  function stop() {
    for (const v of Object.values(S.V)) {
      drop(v);
      v.run = null;
      v.done.clear();
    }
    S.mark = null;
    schuleWeg();
    if (S.polter) {
      if (S.polter.parent) S.polter.parent.remove(S.polter);
      S.polter.geometry.dispose();
      S.polter = null;
    }
  }
  KERN.on('grenzland:stop', stop);
  KERN.on('grenzland:era', () => {
    for (const v of Object.values(S.V)) drop(v);
  });
  // ---- the radar: the vehicle chapter 2 follows ----
  GLKARTE.src(out => {
    if (!S.mark || !on()) return;
    const f = fahrzeug(S.mark);
    if (f) out.push({ x: f.x, y: f.y, k: 'punkt', name: f.name });
  });
  // ------------------------------------------------------------------ the API ------------------------------------------------------------------
  function fahrzeug(id) {
    const v = S.V[id];
    if (!v || !v.run) return null;
    const t = CLOCK.t,
      r = v.run,
      q = v.c ? { x: v.c.x, y: v.c.y, s: globS(v) } : lage(v, t);
    if (!q) return null;
    const W = r.f.weg;
    let naechster = r.f.nach || '';
    for (let i = 1; i < W.length; i++)
      if (W[i].halt && r.Lf.ws[i] > q.s + 1) {
        naechster = W[i].halt;
        break;
      }
    return {
      id,
      art: v.def.art,
      name: v.def.name,
      x: Math.round(q.x * 10) / 10,
      y: Math.round(q.y * 10) / 10,
      linie: r.f.id,
      naechster,
      steht: v.c ? v.hold > 0 || v.c.v < 0.2 : !!(lage(v, t) || {}).halt,
      sichtbar: !!v.c,
    };
  }
  const fahrzeuge = () => (on() ? Object.keys(S.V).map(fahrzeug).filter(Boolean) : []);
  function folgen(id) {
    const def = GLLDATA.FZ[id];
    if (!def) return null;
    return { id, name: def.name, art: def.art, tour: GLLDATA.tour(id), jetzt: fahrzeug(id) };
  }
  Object.assign(S, {
    tick,
    stop,
    fahrzeuge,
    folgen,
    markiere: id => (S.mark = id && GLLDATA.FZ[id] ? id : null),
    linien: () => [],
    debug: {
      // a run's line, its stops, how long it takes (numbers only)
      linie: id => {
        const f = GLLDATA.FAHRTEN.find(q => q.id === id);
        const Lf = f && linieVon(f, true);
        if (!Lf) return null;
        const pts = [];
        for (const l of Lf.legs)
          for (let i = 0; i < l.line.n; i += 10) pts.push([Math.round(l.line.X[i]), Math.round(l.line.Y[i])]);
        return {
          L: Math.round(Lf.L),
          ws: Lf.ws.map(Math.round),
          dauer: Math.round(Lf.P.dauer),
          kehre: Lf.kehre,
          legs: Lf.legs.map(l => (l.rev ? 'R' : 'V') + Math.round(l.L)),
          pts,
        };
      },
      // el (game minutes into a run) for its vehicle to stand d metres before waypoint i
      vor: (id, i, d) => {
        const f = GLLDATA.FAHRTEN.find(q => q.id === id);
        const Lf = f && linieVon(f, true);
        if (!Lf) return null;
        const s = Math.max(0, Lf.ws[i] - d);
        let lo = 0,
          hi = Lf.P.dauer;
        for (let k = 0; k < 40; k++) {
          const m = (lo + hi) / 2;
          if (GLLDATA.stand(Lf.P, m).s < s) lo = m;
          else hi = m;
        }
        return lo;
      },
      // where a run's waypoint lies on its line
      wp: (id, i) => {
        const f = GLLDATA.FAHRTEN.find(q => q.id === id);
        const Lf = f && linieVon(f, true);
        if (!Lf) return null;
        const q = amWeg(Lf, Math.max(0, Lf.ws[i] - 0.5));
        return { x: q.x, y: q.y, hd: q.hd, s: Lf.ws[i] };
      },
      polter: () => (S.polter ? { x: S.polterAt[0], y: S.polterAt[1] } : null),
      rampe: (shop, tuer = 0) => rampe(shop, tuer),
      kinder: () =>
        (S.kinder || []).map(F => ({
          id: F.id,
          x: Math.round(F.x * 10) / 10,
          y: Math.round(F.y * 10) / 10,
          bus: !!F.zumBus,
        })),
      // put a run's vehicle at el game minutes into the run (tests): it appears near the player as the plan allows
      run: (id, el = 0) => {
        const f = GLLDATA.FAHRTEN.find(q => q.id === id);
        if (!f) return false;
        const Lf = linieVon(f, true);
        if (!Lf) return false;
        const v = V(f.fz);
        drop(v);
        const t0 = CLOCK.t - el;
        v.run = { key: f.id + '@test' + Math.round(t0), f, t0, lag: 0, P: Lf.P, Lf, i: -1 };
        S.planT = 0;
        return true;
      },
      info: () =>
        Object.values(S.V).map(v => ({
          id: v.id,
          run: v.run ? v.run.f.id : '',
          c: !!v.c,
          s: v.c ? Math.round(v.c.s) : null,
          v: v.c ? Math.round(v.c.v * 10) / 10 : null,
          hold: Math.round(v.hold * 10) / 10,
          figs: v.F.length,
          leer: !!v.leer,
          lag: v.run ? Math.round(v.run.lag) : null,
          leg: v.leg || 0,
          zust: v.zust ? v.zust.st : '',
          x: v.c ? Math.round(v.c.x * 10) / 10 : null,
          y: v.c ? Math.round(v.c.y * 10) / 10 : null,
          hd: v.c ? Math.round(v.c.hd * 1000) / 1000 : null,
        })),
      S,
    },
  });
  return S;
})();
window.GLLINIEN = GLLINIEN;
