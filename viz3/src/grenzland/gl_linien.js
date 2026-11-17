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
import { GLLDATA } from './gl_linien_data.js';
export const GLLINIEN = (() => {
  const S = {
    V: {}, // per vehicle of GLLDATA.FZ: { id, def, run, c (GLAUTO car), F (figures in it), lade, ... }
    L: {}, // per run id: { line, stopS, len, P } or null when it cannot be driven here
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
  // the speeds by kind of road: motorway, main, county, street, lane, service, track (m/s) – a lorry over 7.5 t: 60 km/h outside, 50 in
  // the village (the streets' own limit is lower there); a car as GLAUTO drives
  const VLKW = [22, 16.7, 16.7, 11, 7, 5, 4.6];
  function nearestEdge(G, x, y) {
    let best = null;
    for (const e of G.edges) {
      const p = e.pts;
      for (let i = 0; i + 1 < p.length; i++) {
        const ax = p[i][0],
          ay = p[i][1],
          dx = p[i + 1][0] - ax,
          dy = p[i + 1][1] - ay,
          l2 = dx * dx + dy * dy || 1e-9,
          u = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)),
          d = hyp(x - ax - dx * u, y - ay - dy * u);
        if (!best || d < best.d) best = { e, d, x: ax + dx * u, y: ay + dy * u };
      }
    }
    return best;
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
    if (w.hof) {
      try {
        const b = window.VILLAGE && VILLAGE.byId && VILLAGE.byId.get(w.hof);
        if (b) return [b.cx, b.cy];
      } catch (e) {}
      return w.p || null;
    }
    return w.p || null;
  }
  const cost = e => e.len / (GLAUTO.VMAX[e.kind] || 5);
  // a run's line: from waypoint to waypoint over the shortest ways; a stop is reached along the road it lies on (both ends of that
  // road's piece in the cheaper order); a turn back on itself is avoided where the other order allows
  function bauLinie(f) {
    const G = GLAUTO.netz();
    if (!G || !G.nodes.length) return null;
    const lkw = LKW.has(GLLDATA.FZ[f.fz].typ);
    const W = f.weg.map(w => {
      const q = punkt(w);
      if (!q) return null;
      if (w.halt || w.hof || w.lager) {
        const E = nearestEdge(G, q[0], q[1]);
        if (E && E.d < 60) return { w, q: [E.x, E.y], e: E.e };
      }
      return { w, q, n: GLAUTO.nodeNear(q[0], q[1]) };
    });
    if (W.some(o => !o)) return null;
    // the node sequence
    const seq = [];
    const push = (n, e) => {
      if (seq.length && seq[seq.length - 1].n === n && !e) return;
      seq.push({ n, e });
    };
    for (let i = 0; i < W.length; i++) {
      const o = W[i];
      if (o.e) {
        const prev = seq.length ? seq[seq.length - 1].n : null,
          next = i + 1 < W.length ? (W[i + 1].n ?? W[i + 1].e.a) : null;
        const c = (u, v) => {
          if (u === null || v === null || u === v) return 0;
          const p = VNETZ.route(G, u, v, cost);
          return p ? p.reduce((a, s) => a + cost(s.e), 0) : 1e9;
        };
        const ab = c(prev, o.e.a) + c(o.e.b, next),
          ba = c(prev, o.e.b) + c(o.e.a, next);
        const [n0, n1] = ab <= ba ? [o.e.a, o.e.b] : [o.e.b, o.e.a];
        push(n0);
        seq.push({ n: n1, e: o.e });
      } else push(o.n);
    }
    // the path: routes between the nodes, the stops' own pieces directly
    const path = [];
    for (let i = 1; i < seq.length; i++) {
      const a = seq[i - 1].n,
        b = seq[i].n;
      if (a === b) continue;
      if (seq[i].e) path.push({ e: seq[i].e, fwd: seq[i].e.a === a });
      else {
        const p = VNETZ.route(G, a, b, cost);
        if (!p) return null;
        path.push(...p);
      }
    }
    if (!path.length) return null;
    const VM = lkw ? VLKW : GLAUTO.VMAX;
    const line = VNETZ.line(path, {
      off: e => (e.kind > 3 ? 0 : Math.max(1.1, (e.w || 5) / 4)),
      vmax: e => VM[e.kind] || 5,
      cut: lkw ? 7 : 5,
      aLat: lkw ? 1.5 : 2.4,
      aBrk: lkw ? 1.4 : 2.6,
      vMin: 2.2,
      vEnd: f.weg[f.weg.length - 1].rand ? null : 0,
    });
    if (!line) return null;
    // where along it each waypoint lies (in order)
    const ws = [];
    let s0 = 0;
    for (const o of W) {
      const pr = VNETZ.project(line, o.q[0], o.q[1], s0, Infinity);
      const s = pr ? pr.s : s0;
      ws.push(s);
      s0 = s;
    }
    ws[0] = 0;
    ws[ws.length - 1] = line.L;
    const len = [];
    for (let i = 1; i < ws.length; i++) len.push(Math.max(1, ws[i] - ws[i - 1]));
    // a turn back on itself (a dead end) is reported (the line is kept: tests see it)
    let kehre = 0;
    for (let i = 8; i + 8 < line.n; i += 4) {
      const h1 = Math.atan2(line.X[i] - line.X[i - 8], line.Y[i] - line.Y[i - 8]),
        h2 = Math.atan2(line.X[i + 8] - line.X[i], line.Y[i + 8] - line.Y[i]);
      let d = Math.abs(h2 - h1);
      if (d > Math.PI) d = 2 * Math.PI - d;
      if (d > 2.6) kehre++;
    }
    return { line, ws, len, P: GLLDATA.plan(len, f), kehre, lkw };
  }
  function linieVon(f) {
    if (!(f.id in S.L)) {
      try {
        S.L[f.id] = bauLinie(f);
      } catch (e) {
        S.L[f.id] = null;
        S.err = 'linie ' + f.id + ': ' + String((e && e.message) || e).slice(0, 160);
      }
    }
    return S.L[f.id];
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
          const t0 = d + ab,
            key = f.id + '@' + t0;
          if (t < t0 || t - t0 >= Lf.P.dauer || v.done.has(key) || !GLLDATA.faehrt(f, dd)) continue;
          v.run = { key, f, t0, lag: 0, P: Lf.P, Lf, i: -1 };
          if (v.done.size > 40) v.done.clear();
          return v.run;
        }
    }
    return null;
  }
  // where a vehicle is now by its numbers: { x, y, hd, s, i, halt }
  function lage(v, t) {
    const r = v.run;
    if (!r) return null;
    const st = GLLDATA.stand(r.P, t - r.t0 - r.lag),
      q = VNETZ.at(r.Lf.line, st.s, {});
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
    GLAUTO.onLine(c, v.run.Lf.line, L.s, L.halt ? 0 : Math.min(8, v.run.Lf.line.S[Math.round(L.s)] || 6));
    c.v = L.halt ? 0 : Math.min(c.v, 8);
    S.n.spawn++;
    fahrer(v);
    markDirty(true);
    return c;
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
      GLAUTO.remove(v.c);
      S.n.drop++;
    }
    v.c = null;
    v.lade = 0;
  }
  // ---- the people in the cab: a driver (the patrol: two officers), seated where the type says ----
  function sitzOf(c, k) {
    const T = c.T;
    if (T.sitz) return [k ? -T.sitz[0] : T.sitz[0], T.sitz[1], T.sitz[2]];
    // an estate: the front seats some 1.25 m behind the front axle, their tops half a metre up
    return [k ? 0.37 : -0.37, T.a - 1.25, 0.52];
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
      if (!F || F.gone) continue;
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
  function fahr(v, dt, p) {
    const c = v.c,
      r = v.run,
      Lf = r.Lf,
      lkw = Lf.lkw;
    // the next stop ahead (a waypoint with a halt) and whether the vehicle waits at it now
    const W = r.f.weg;
    let stopS = Infinity,
      stopI = -1;
    for (let i = 1; i < W.length; i++)
      if (W[i].halt && !v.halte?.[i] && Lf.ws[i] > c.s - 2) {
        stopS = Lf.ws[i] - (lkw ? 1.0 : 0.5);
        stopI = i;
        break;
      }
    if (v.hold > 0) {
      v.hold -= dt;
      c.v = 0;
      GLAUTO.drive(c, 0, { stopS: c.s });
      if (v.hold <= 0) {
        v.halte = Object.assign(v.halte || {}, { [v.stopI]: true });
        // the timber lorry leaves the pile loaded: its load is on now (the model of a loaded lorry in its place)
        if (W[v.stopI] && W[v.stopI].laden && v.leer) neuLaden(v);
      }
      return;
    }
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
    }
    if (c.tand) for (const g of c.tand) g.rotation.x = -c.spin;
    // the wanted level's sound and light are not the patrol's: it drives quietly
    c.blau = false;
    c.horn = false;
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
  // ------------------------------------------------------------------ the timber pile ------------------------------------------------------------------
  // A pile of spruce logs („Polter“) beside the forest track near the Untere Klinge where the timber lorry loads: 5 m logs in a stack
  // some 1.6 m high on two skids, on the side of the wood, a little off the track (the crane reaches 8 m). Built when the player comes
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
    // two skids across, then the logs along the track in rows
    for (const y of [-1.6, 1.6]) K.box(0, y, 0.08, 3.6, 0.22, 0.16, 0, bark2);
    let n = 0,
      z = 0.16;
    for (const [cnt, w] of [
      [9, 3.4],
      [8, 3.05],
      [7, 2.7],
      [5, 2.0],
    ]) {
      let rm = 0;
      for (let i = 0; i < cnt; i++) {
        const r = R[n++ % R.length],
          x = -w / 2 + (w * (i + 0.5)) / cnt,
          y0 = -2.5 + ((i * 7) % 3) * 0.05,
          y1 = 2.5 - ((i * 5) % 3) * 0.06;
        GLORTE.rolle(K, [x, y0, z + r], [x, y1, z + r], r, i % 3 ? bark : bark2, 8, { capCol: wood });
        rm = Math.max(rm, r);
      }
      z += rm * 1.62;
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
      const day = tagOf(t),
        dayG = tagOf(t - 1440);
      for (const id of Object.keys(GLLDATA.FZ)) {
        const v = V(id),
          run = laufend(v, t, day, dayG);
        if (!run) {
          if (v.c) drop(v);
          continue;
        }
        if (run.i < 0) {
          run.i = 0;
          v.halte = {};
          v.hold = 0;
          v.leer = v.def.art === 'holz';
        }
        if (v.c) {
          const d = hyp(v.c.x - p.x, v.c.y - p.y);
          // far: a number again (with the delay it made); the patrol while somebody is wanted: as soon as it is out of sight
          const weg = d > R_OUT || (v.def.art === 'streife' && sterne > 0 && (d > 120 || !imBlick(v.c.x, v.c.y)));
          if (weg || v.c.ende) {
            const el = (q => {
              let lo = 0,
                hi = run.P.dauer;
              for (let k = 0; k < 30; k++) {
                const m = (lo + hi) / 2;
                if (GLLDATA.stand(run.P, m).s < q) lo = m;
                else hi = m;
              }
              return hi;
            })(v.c.s);
            run.lag = Math.max(0, t - run.t0 - el);
            if (v.c.ende) run.lag = -1e6;
            drop(v);
          }
          continue;
        }
        if (v.def.art === 'streife' && !GLLDATA.streife(sterne)) continue;
        const L = lage(v, t);
        if (!L || L.fertig) continue;
        const d = hyp(L.x - p.x, L.y - p.y);
        if (d > R_IN) continue;
        // not under the player's eyes: far enough to come out of the haze, or where the camera does not look
        if (d < R_SEE && imBlick(L.x, L.y)) continue;
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
      q = v.c ? { x: v.c.x, y: v.c.y, s: v.c.s } : lage(v, t);
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
        const Lf = f && linieVon(f);
        if (!Lf) return null;
        const pts = [];
        for (let i = 0; i < Lf.line.n; i += 10) pts.push([Math.round(Lf.line.X[i]), Math.round(Lf.line.Y[i])]);
        return {
          L: Math.round(Lf.line.L),
          ws: Lf.ws.map(Math.round),
          dauer: Math.round(Lf.P.dauer),
          kehre: Lf.kehre,
          pts,
        };
      },
      // el (game minutes into a run) for its vehicle to stand d metres before waypoint i
      vor: (id, i, d) => {
        const f = GLLDATA.FAHRTEN.find(q => q.id === id);
        const Lf = f && linieVon(f);
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
        const Lf = f && linieVon(f);
        if (!Lf) return null;
        const q = VNETZ.at(Lf.line, Lf.ws[i], {});
        return { x: q.x, y: q.y, hd: q.hd, s: Lf.ws[i] };
      },
      polter: () => (S.polter ? { x: S.polterAt[0], y: S.polterAt[1] } : null),
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
        const Lf = linieVon(f);
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
        })),
      S,
    },
  });
  return S;
})();
window.GLLINIEN = GLLINIEN;
