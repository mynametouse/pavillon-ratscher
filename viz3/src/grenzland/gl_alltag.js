// ===================== feat/grenzland-alltag: the day of the village people in the world (GLALLTAG) =====================
// Falko, 17.11.2026 12:26 („Tagesablauf der Leute“) and 13:27 („… realistischer … Verkehr und das, was sich so tut auf den Straßen, vielleicht
// hier und da auch mal eine Clique …“): the people of grenzland/gl_alltag_data.js live their day by the game clock and the calendar – all of
// them as numbers (where, what), the nearest few as figures (grenzland/gl_fig.js: Rocketbox, the seven of the village in their own figures):
//   - within ~150 m of the player, at most eight at once (four on a phone: each figure holds ~9 MB of textures); loaded one after the other, freed beyond ~190 m
//   - they stand in twos and threes and talk (gestures, looks), queue at the shop on wheels, wait at the school bus stop, sit on the
//     benches of the Linde, the well and the Markt, work in front of their houses (a milk can, a bucket, under a bonnet, carrying wood),
//     hang about as a clique (the bus stop and the Feldscheune in Ratscher, the fountain on the Markt in Schleusingen), go to church
//   - who goes shopping walks to the shop's door and goes in (the door of the old town's shop rooms – schleusingen/si_innen.js SINNEN –, or
//     FASSADE.eingang where the agent `gebaeude` has it) and comes out again a few minutes later with a bag; who goes home walks to the
//     house door; whoever leaves walks off and is let go out of sight
//   - passing by: a nod, a greeting, a look away – by what the village thinks of the two (GLRUF.stufe of the agent `ruf`; 'neutral'
//     without it); with E one short line per person and situation
//   - what the base game's village already shows comes first (the Friday evening in the old school, the fire, the front gardens, out with
//     the car – dorf/*): one person is never shown twice
// Only in the mode, only today (not in 1989, not while a mission runs – chapter 2 can switch that on: GLALLTAG.mitMission), nothing before
// the mode starts, all gone after „Beenden“.
//   GLALLTAG.leute() → [{ id, name, ort, x, y, tun, platz, gezeigt }] · person(name | id) · tick(dt) · stop() · linien()
//   debug: zeit(min, wd) (the clock to a time, on a weekday 0–6), stand(), hin(id) (the view to a person)
import * as THREE from 'three';
import { cam, COARSE } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { VEH } from '../vehicles/vehicle.js';
import { STIMME } from '../audio/stimme.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { DCAL } from '../dorf/dorf_cal.js';
import { DPEOPLE } from '../dorf/dorf_people.js';
import { DLIFE } from '../dorf/dorf_life.js';
import { DCARS } from '../dorf/dorf_cars.js';
import { VILLAGE } from '../world/village.js';
import { SCHL } from '../welt/schleusingen.js';
import { GLDATA } from './gl_data.js';
import { GL } from './gl_state.js';
import { GLFIG } from './gl_fig.js';
import { GLAUTO } from './gl_auto.js';
import { GLFAHNDUNG } from './gl_fahndung.js';
import { GLHUD } from './gl_hud.js';
import { GLORTE } from './gl_orte.js';
import { GLALDATA } from './gl_alltag_data.js';
export const GLALLTAG = (() => {
  const D = GLALDATA;
  const MAX = COARSE ? 4 : 8,
    R_IN = 150,
    R_OUT = 190;
  const S = {
    on: false,
    mitMission: false, // chapter 2: the people stay out while a mission runs unless a mission wants them
    figs: new Map(), // person id → { F, p, st: 'hin' | 'da' | 'weg', ... }
    lade: null, // the person whose figure is loading
    ladeT: 0,
    jetzt: {}, // person id → the slot now (gl_alltag_data.js jetzt)
    belegt: {}, // place → the ids there now, in the order they came
    wo: {}, // person id → { x, y, hd, ... } where the person is now (the spot of the slot)
    simT: 0,
    sprT: 3, // until somebody of a group speaks again
    grussT: 0,
    homes: {},
    acc: 0,
    err: null,
    n: { make: 0, drop: 0, gruss: 0, sag: 0, tuer: 0, raus: 0, heim: 0 },
    gruesse: [], // the last greetings (tests): { id, text, stufe }
  };
  const hyp = Math.hypot;
  const KEY = p => 'al_' + p.id;
  // ---- the people as cast of the mode: their figures, clothes, voices (only what is not there already) ----
  for (const p of D.LEUTE) {
    const k = KEY(p);
    if (!GLDATA.CAST[k])
      GLDATA.CAST[k] = {
        name: p.name,
        fig: p.fig,
        clips: p.clips,
        h: p.h,
        stoop: p.stoop || 0,
        kleid: p.kleid,
        hut: p.hut,
        voice: p.voice,
      };
  }
  for (const [k, v] of Object.entries(D.KLEID)) if (GLDATA.KLEID && !GLDATA.KLEID[k]) GLDATA.KLEID[k] = v;
  function stimmen() {
    if (S.stimmen) return;
    S.stimmen = true;
    try {
      for (const p of D.LEUTE) STIMME.person('gl_' + KEY(p), Object.assign({ name: p.name }, p.voice));
    } catch (e) {}
  }
  // ---- time ----
  const eday = (t = CLOCK.t) => DN.e0 + Math.floor(t / 1440);
  const minOf = (t = CLOCK.t) => ((Math.floor(t) % 1440) + 1440) % 1440;
  const heute = () => GL.on && GL.era === 'heute';
  // where the player is (on foot or in a vehicle)
  function spieler() {
    const v = VEH.cur;
    return v && v.st ? [v.st.x, v.st.y] : [P.x, P.y];
  }
  // ---- the base game's village shows this person now? (dorf/dorf_cal.js, dorf/dorf_life.js) ----
  function basis(p, t) {
    if (!p.dorf) return null;
    const B = {};
    try {
      if (DLIFE.away && DLIFE.away(p.dorf, t))
        B.weg = p.dorf === 'ingrid' ? 'rathaus' : p.dorf === 'manfred' ? 'einkaufen' : 'arbeit';
      if (DCAL.on && DCAL.on('skat', t)) B.skat = true;
      else if (DCAL.on && DCAL.on('fire', t)) B.feuer = true;
      if (!B.weg && DLIFE.routine && DLIFE.routine(p.dorf, t)) B.garten = true;
    } catch (e) {}
    return B;
  }
  // a figure of the base game's village shows this person right now
  function dorfZeigt(p) {
    try {
      const f = p.dorf && DPEOPLE.figs && DPEOPLE.figs[p.dorf];
      return !!(f && f.g && f.g.visible);
    } catch (e) {
      return false;
    }
  }
  // a festival open now (only when the festivals' module builds it – an invisible festival takes nobody)
  function fest() {
    try {
      const G = window.GLFESTE;
      return G && G.offen ? G.offen() : null;
    } catch (e) {
      return null;
    }
  }
  // ---- free ground: not in a wall, not indoors ----
  function frei(x, y, r = 0.35) {
    try {
      const z = KERN.ground(x, y);
      if (!Number.isFinite(z)) return false;
      if (KERN.inside && KERN.inside(x, y, z + 1)) return false;
      const q = [x, y];
      if (KERN.pushOut(q, r) && hyp(q[0] - x, q[1] - y) > 0.05) return false;
    } catch (e) {
      return false;
    }
    return true;
  }
  // the nearest free spot to (x, y) within r metres (rings of growing radius)
  function freiNah(x, y, r = 6, rr = 0.35) {
    if (frei(x, y, rr)) return [x, y];
    for (let d = 0.8; d <= r; d += 0.8)
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2 + d,
          px = x + Math.sin(a) * d,
          py = y + Math.cos(a) * d;
        if (frei(px, py, rr)) return [px, py];
      }
    return null;
  }
  // ---- ways along the streets (the road graph of the mode, grenzland/gl_auto.js – Ratscher's square): people walk at the edge of the
  //      village street, not through gardens and houses. Short ways and the town: straight (in the old town doors face the street) ----
  const imQuadrat = (x, y) => Math.abs(x) < 1150 && Math.abs(y) < 1150 && hyp(x + 1085, y - 1240) > 420;
  function strassenweg(a, b) {
    if (hyp(a[0] - b[0], a[1] - b[1]) < 16 || !imQuadrat(a[0], a[1]) || !imQuadrat(b[0], b[1])) return null;
    try {
      const line = GLAUTO.route(a, b, { k: 0.4 });
      if (!line || !line.n) return null;
      let ia = 0,
        ib = line.n - 1,
        da = 1e9,
        db = 1e9;
      for (let k = 0; k < line.n; k++) {
        const d1 = hyp(line.X[k] - a[0], line.Y[k] - a[1]),
          d2 = hyp(line.X[k] - b[0], line.Y[k] - b[1]);
        if (d1 < da) {
          da = d1;
          ia = k;
        }
        if (d2 < db) {
          db = d2;
          ib = k;
        }
      }
      if (da > 35 || db > 35 || ib - ia < 4) return null;
      const pts = [];
      for (let k = ia; k < ib; k += 3) pts.push([line.X[k], line.Y[k]]);
      pts.push([line.X[ib], line.Y[ib]]);
      return pts;
    } catch (e) {
      return null;
    }
  }
  // the points of a walk from a to b: along the streets where there are some, else straight
  function wegNach(a, b) {
    const W = strassenweg(a, b);
    return W ? W.concat([[b[0], b[1]]]) : [[b[0], b[1]]];
  }
  // a polyline's point `back` metres before its end, and the rest of the way from there: { start, rest }
  function vorEnde(pts, back) {
    let acc = 0;
    for (let k = pts.length - 1; k > 0; k--) {
      const d = hyp(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
      if (acc + d >= back) {
        const u = (back - acc) / (d || 1),
          q = [pts[k][0] + (pts[k - 1][0] - pts[k][0]) * u, pts[k][1] + (pts[k - 1][1] - pts[k][1]) * u];
        return { start: q, rest: pts.slice(k) };
      }
      acc += d;
    }
    return { start: pts[0], rest: pts.slice(1) };
  }
  // ---- homes: the seven of the village where the base game has them (dorf/dorf_life.js); the others a house near the Anger, each its own ----
  function heim(p) {
    if (p.ort !== 'ratscher') return null;
    if (S.homes[p.id] !== undefined) return S.homes[p.id];
    let h = null;
    try {
      const H = DLIFE.homes ? DLIFE.homes() : null;
      if (p.dorf && H && H[p.dorf])
        h = { door: H[p.dorf].door, step: H[p.dorf].step, spot: H[p.dorf].spot, hd: H[p.dorf].hd };
      else if (H && VILLAGE.ready) {
        // a house with a door 50–220 m from the Anger, at least 25 m from every other home, by a fixed order
        const used = Object.values(H)
          .concat(Object.values(S.homes).filter(Boolean))
          .map(q => q.door);
        const C = VILLAGE.bld
          .filter(b => b.typ === 0 && b.id !== 215 && b.fac && b.fac.some(f => f.door))
          .map(b => ({ b, d: hyp(b.cx - 222, b.cy + 108) }))
          .filter(o => o.d > 50 && o.d < 220)
          .sort((a, z) => a.d - z.d);
        const n = C.length;
        for (let k = 0; k < n && !h; k++) {
          const b = C[(k * 7 + p.i * 13) % n].b,
            f = b.fac.find(q => q.door),
            u = f.door.u,
            door = [f.ax + f.dx * u, f.ay + f.dy * u];
          if (used.some(q => q && hyp(q[0] - door[0], q[1] - door[1]) < 25)) continue;
          const step = [door[0] + f.nx * 0.9, door[1] + f.ny * 0.9];
          if (!frei(step[0], step[1])) continue;
          h = {
            door,
            step,
            spot: [door[0] + f.nx * 2.2, door[1] + f.ny * 2.2],
            hd: Math.atan2(-f.nx, -f.ny) * (180 / Math.PI),
          };
        }
      }
    } catch (e) {
      S.err = 'heim ' + p.id + ': ' + ((e && e.message) || e);
    }
    if (h || (VILLAGE.ready && DLIFE.homes && DLIFE.homes())) S.homes[p.id] = h;
    return h;
  }
  // ---- the door of a shop near a place (schleusingen/si_innen.js; FASSADE of the agent `gebaeude` where it has one) ----
  // (arts: the kinds of shop in order of preference; a shop that is shut now is no door to go in)
  function tuerNah(x, y, arts, r = 45) {
    try {
      const I = window.SINNEN;
      if (I && I.doors && I.state === 'ready') {
        let best = null,
          bd = r;
        for (const h of I.doors.values()) {
          if (arts && !arts.includes(h.shop)) continue;
          if (I.shopOpen && !I.shopOpen(h.shop)) continue;
          const d = hyp(h.door.x - x, h.door.y - y) + (arts ? arts.indexOf(h.shop) * 40 : 0);
          if (d < bd) {
            bd = d;
            best = h;
          }
        }
        if (best) {
          const d = best.door;
          return { x: d.x + d.nx * 0.55, y: d.y + d.ny * 0.55, nx: d.nx, ny: d.ny, id: best.id, shop: best.shop };
        }
      }
    } catch (e) {}
    return null;
  }
  // ---- seats: the benches of Ratscher (GLFIG.platz) and of the Markt (welt/schleusingen.js) – free ones (nobody sits there, nobody
  //      of the others has it for their slot) ----
  const sitztDa = (x, y, id) => {
    for (const [k, w] of Object.entries(S.wo))
      if (k !== id && w && w.sitz && hyp(w.sitz.x - x, w.sitz.y - y) < 0.45) return true;
    for (const F of GLFIG.figs || [])
      if (F.sitzt && F.alltag !== id && F.g.visible && hyp(F.x - x, F.y - y) < 0.45) return true;
    return false;
  };
  function sitzNah(x, y, r, F0) {
    try {
      if (hyp(x + 1085, y - 1235) < 500) {
        let best = null,
          bd = r;
        for (const b of SCHL.benchSpots || []) {
          const d = hyp(b.x - x, b.y - y);
          if (d < bd && !sitztDa(b.x, b.y, F0)) {
            const g = KERN.ground(b.x, b.y);
            bd = d;
            best = {
              x: b.x,
              y: b.y,
              hd: (b.yaw * Math.PI) / 180,
              z: Number.isFinite(g) ? Math.max(0.38, Math.min(0.55, b.z - g)) : 0.45,
            };
          }
        }
        return best;
      }
      for (let k = 0; k < 4; k++) {
        const q = GLFIG.platz(x, y, r);
        if (q && !sitztDa(q.x, q.y, F0)) return q;
        if (!q) return null;
        r = Math.max(1, hyp(q.x - x, q.y - y) - 0.01);
        if (r < 1.1) return null;
      }
    } catch (e) {}
    return null;
  }
  // ---- where somebody stands for a slot: { x, y, hd, art, tuer, sitz, runde } ----
  // the others at the same place right now (in a fixed order: who came first) – a queue, a row, a group in a circle
  function mit(platz, id) {
    const L = S.belegt[platz] || [];
    return { i: Math.max(0, L.indexOf(id)), n: Math.max(1, L.length) };
  }
  // the runde: once round the Anger on its lanes (checked on the top view of the Anger)
  const RUNDE = [
    [214, -104.5],
    [236, -104.2],
    [258, -104.6],
    [268, -112],
    [264, -124.8],
    [246, -125.6],
    [228, -124.5],
    [212, -120],
    [208.5, -110],
  ];
  function platzOf(p, j) {
    const O = D.ORTE[j.platz];
    if (!O || O.innen) return null;
    const pos = O.pos;
    const { i, n } = mit(j.platz, p.id);
    const kreis = (cx, cy, r0) => {
      // a group: in a circle round a point, facing in
      const r = n <= 1 ? 0 : Math.max(0.75, r0 * Math.sqrt(n / 2)),
        a = (i / n) * Math.PI * 2 + 0.6;
      const x = cx + Math.sin(a) * r,
        y = cy + Math.cos(a) * r;
      return { x, y, hd: n <= 1 ? (p.i * 1.7) % (Math.PI * 2) : Math.atan2(cx - x, cy - y), mitte: [cx, cy] };
    };
    let o = null;
    switch (j.platz) {
      case 'wagen': {
        // a queue beside the van's hatch, the first a step west of where one buys (the player's place stays free)
        const x = pos[0] - i * 1.05,
          y = pos[1] - (i % 2) * 0.25;
        o = { x, y, hd: Math.atan2(239 - x, -119.6 - y) };
        break;
      }
      case 'haltestelle': {
        // in a row in front of the shelter's open side, facing the road (OSM shelter, world/dorfkern_data.js: az 196)
        const a = (196 * Math.PI) / 180,
          along = [Math.cos(a), -Math.sin(a)],
          k = i - (n - 1) / 2;
        if (j.tun === 'abhaengen') o = kreis(pos[0] + 0.2, pos[1] + 0.65, 0.7);
        else o = { x: pos[0] + along[0] * k * 0.95, y: pos[1] + along[1] * k * 0.95, hd: a + (k % 2 ? 0.25 : -0.2) };
        break;
      }
      case 'runde':
        o = { x: RUNDE[0][0], y: RUNDE[0][1], hd: 0, runde: RUNDE };
        break;
      case 'treff': {
        const T = (GLORTE.P && (j.tun === 'kegeln' ? GLORTE.P.kegel : GLORTE.P.treff)) || pos,
          ox = j.tun === 'kegeln' ? 2.2 : 0;
        o = kreis(T[0] + ox, T[1] + (j.tun === 'kegeln' ? 1.5 : 0), 0.9);
        break;
      }
      case 'damm': {
        const A = (GLORTE.P && GLORTE.P.angel) || pos,
          hd = (146.6 * Math.PI) / 180;
        o = { x: A[0] + Math.cos(hd) * 6, y: A[1] - Math.sin(hd) * 6, hd };
        break;
      }
      case 'hof': {
        const h = heim(p);
        if (!h) return null;
        if (j.pose === 'bonnet') {
          // under the bonnet of the own car where it is parked at the kerb (dorf/dorf_cars.js) – no car there, no bonnet
          const c = DCARS.cars && p.dorf ? DCARS.cars[p.dorf] : null;
          if (c && c.at && c.st === 'parked') {
            const ch = -c.g.rotation.y,
              x = c.at[0] + Math.sin(ch) * 2.75,
              y = c.at[1] + Math.cos(ch) * 2.75;
            o = { x, y, hd: ch + Math.PI, tuer: { x: h.step[0], y: h.step[1], heim: true } };
            break;
          }
          j.pose = null;
        }
        o = {
          x: h.spot[0],
          y: h.spot[1],
          hd: (h.hd * Math.PI) / 180,
          tuer: { x: h.step[0], y: h.step[1], heim: true },
        };
        break;
      }
      case 'baecker':
      case 'gaststaette': {
        // the shop's door (the bakery, else the café; the Gaststätte) – shut or none: one does not go
        const t = tuerNah(pos[0], pos[1], j.platz === 'baecker' ? ['baecker', 'cafe'] : ['gaststaette'], 120);
        if (!t) return null;
        // in front of the door, beside it (a step to one side along the facade)
        const side = j.tun === 'pause' ? 1.4 : 0,
          x = t.x + t.nx * 1.1 + t.ny * side,
          y = t.y + t.ny * 1.1 - t.nx * side;
        o = { x, y, hd: Math.atan2(-t.nx, -t.ny), tuer: t };
        break;
      }
      case 'kirche': {
        // in front of the south door of St. Johannis: before the service, and after it
        const T = O.tuer,
          c = kreis(pos[0], pos[1], 0.9);
        o = Object.assign(c, {
          tuer: { x: T[0] + T[2] * 0.4, y: T[1] + T[3] * 0.4, nx: T[2], ny: T[3], kirche: true },
        });
        break;
      }
      case 'marktmitte': {
        // the clique by the fountain on the Markt (welt/schleusingen.js), on its east side
        const f = SCHL.fountain;
        o = f ? kreis(f[0] + 5.2, f[1] - 0.8, 0.85) : kreis(pos[0], pos[1], 0.85);
        break;
      }
      case 'linde':
      case 'brunnen':
      case 'markt': {
        const q = sitzNah(pos[0], pos[1], j.platz === 'markt' ? 26 : 9, p.id);
        o = q ? { x: q.x, y: q.y, hd: q.hd, sitz: q } : kreis(pos[0] + 1.5, pos[1] - 1.5, 0.8);
        break;
      }
      case 'fest': {
        const G = window.GLFESTE;
        const q = G && G.platz ? G.platz(p.id, j) : null;
        if (!q) return null;
        o = q;
        break;
      }
      default:
        o = kreis(pos[0], pos[1], 0.85);
    }
    if (!o) return null;
    if (!o.sitz && !o.runde && O.dyn !== 'daheim') {
      const q = freiNah(o.x, o.y, 4);
      if (!q) return null;
      o.x = q[0];
      o.y = q[1];
    }
    o.platz = j.platz;
    o.art = O.art || 'stehen';
    return o;
  }
  // ---- which part of a visit to a door: going in, inside, coming out (shops: in a third of the slot, out after two thirds) ----
  function phase(j, o, m) {
    if (!o || !o.tuer || o.tuer.heim) return 'da';
    // church: in at three minutes to ten, out at eleven (a service at ten – an assumption)
    if (o.tuer.kirche) return m < 9 * 60 + 57 ? 'da' : m < 11 * 60 ? 'drin' : 'nach';
    if (j.platz === 'gaststaette' && j.tun === 'pause') return 'da';
    const L = j.bis - j.von,
      a = j.von + L * (j.platz === 'gaststaette' ? 0.15 : 0.3),
      b = j.platz === 'gaststaette' ? j.bis : j.von + L * 0.72;
    return m < a ? 'hin' : m < b ? 'drin' : 'raus';
  }
  // ---- the numbers: every second where everybody is ----
  function sim() {
    const t = CLOCK.t,
      e = eday(t),
      m = minOf(t),
      f = fest();
    const fd = f ? Object.assign({}, f) : null;
    // rain or snow now (feat/wetter): leisure outside stays in
    let regen = false;
    try {
      const W = window.WETTER && WETTER.state ? WETTER.state().cur : null;
      regen = !!W && (W.rain > 0.3 || W.snow > 0.3);
    } catch (e) {}
    S.regen = regen;
    // first what everybody does (mit() reads it), then where
    for (const p of D.LEUTE) {
      const j = D.jetzt(p, { eday: e, min: m, regen, fest: fd, basis: basis(p, t) });
      const was = S.jetzt[p.id];
      j.key = j.platz + '|' + j.tun + '|' + j.von;
      j.neu = !was || was.key !== j.key;
      S.jetzt[p.id] = j;
    }
    // who is where, in the order they came (who was there keeps the place in the queue)
    const nb = {};
    for (const p of D.LEUTE) {
      const j = S.jetzt[p.id];
      if (!j.innen && !j.basis) (nb[j.platz] = nb[j.platz] || []).push(p.id);
    }
    const anders = new Set();
    for (const [pl, ids] of Object.entries(nb)) {
      const alt = (S.belegt[pl] || []).filter(id => ids.includes(id));
      for (const id of ids) if (!alt.includes(id)) alt.push(id);
      nb[pl] = alt;
      const art = (D.ORTE[pl] || {}).art;
      if ((S.belegt[pl] || []).join() !== alt.join() && art !== 'bank' && art !== 'runde') anders.add(pl);
    }
    S.belegt = nb;
    for (const p of D.LEUTE) {
      const j = S.jetzt[p.id];
      const w0 = S.wo[p.id];
      const gleich = !j.neu && w0 && w0.key === j.key && !w0.dyn;
      if (gleich && !anders.has(j.platz)) {
        w0.ph = phase(j, w0, m);
        continue;
      }
      if (gleich && w0.zeigbar) {
        // only the group changed: make room (the spot moves, the slot stays)
        let o2 = null;
        try {
          o2 = platzOf(p, j);
        } catch (err) {}
        if (o2 && hyp(o2.x - w0.x, o2.y - w0.y) > 0.3)
          Object.assign(w0, { x: o2.x, y: o2.y, hd: o2.hd, mitte: o2.mitte, moved: true });
        w0.ph = phase(j, w0, m);
        continue;
      }
      let o = null;
      try {
        o = platzOf(p, j);
      } catch (err) {
        S.err = 'platz ' + p.id + ': ' + ((err && err.message) || err);
      }
      const O = D.ORTE[j.platz] || {};
      const pos = o ? [o.x, o.y] : O.pos || (heim(p) && heim(p).door) || null;
      S.wo[p.id] = Object.assign(o || {}, {
        key: j.key,
        x: pos ? pos[0] : null,
        y: pos ? pos[1] : null,
        ort: O.ort || p.ort,
        zeigbar: !!o && !j.innen && !j.basis,
        ph: phase(j, o, m),
        dyn: !o && !!O.dyn && !j.innen,
      });
    }
  }
  // ---- drawing: who is wanted as a figure ----
  function gewollt() {
    const [px, py] = spieler(),
      L = [];
    for (const p of D.LEUTE) {
      const w = S.wo[p.id],
        j = S.jetzt[p.id];
      if (!w || !w.zeigbar || w.x == null || !j) continue;
      // (inside: not drawn – who is drawn still walks in at the door)
      if (w.ph === 'drin' && !S.figs.has(p.id)) continue;
      // in at a door already (until the slot says out again), or done with it
      if (w.aus === 'fertig' || (w.aus === 'tuer' && w.ph !== 'raus' && w.ph !== 'nach')) continue;
      if (dorfZeigt(p)) continue;
      const d = hyp(w.x - px, w.y - py),
        has = S.figs.has(p.id);
      if (d < (has ? R_OUT : R_IN)) L.push({ p, d });
    }
    L.sort((a, b) => a.d - b.d);
    return L.slice(0, MAX).map(o => o.p);
  }
  // is a point in the camera's view (roughly) and near enough to be seen
  const _v = new THREE.Vector3();
  function imBlick(x, y, r = 70) {
    const dx = x - cam.position.x,
      dy = y + cam.position.z,
      d = hyp(dx, dy);
    if (d > r) return false;
    if (d < 4) return true;
    cam.getWorldDirection(_v);
    const fx = _v.x,
      fy = -_v.z,
      fl = hyp(fx, fy) || 1;
    return (dx * fx + dy * fy) / (d * fl) > 0.55;
  }
  // where one comes from towards a spot: { start, rest } – a point some 20–40 m before it on the way along the streets from home (or from
  // further off), out of view if it can be, and the rest of the way; in the town along the facade of the door
  function herkunft(p, w) {
    const ziel = w.tuer && !w.tuer.heim && !w.tuer.kirche ? [w.tuer.x, w.tuer.y] : [w.x, w.y],
      h = heim(p),
      wege = [];
    if (h && hyp(h.step[0] - ziel[0], h.step[1] - ziel[1]) < 400) {
      const W = strassenweg(h.step, ziel);
      if (W) wege.push([[h.step[0], h.step[1]]].concat(W, [ziel]));
    }
    if (!wege.length && imQuadrat(ziel[0], ziel[1])) {
      // from further off along the streets, from the side away from the player
      const [px, py] = spieler(),
        a = Math.atan2(ziel[0] - px, ziel[1] - py) + (p.i % 2 ? 0.6 : -0.6),
        far = [ziel[0] + Math.sin(a) * 70, ziel[1] + Math.cos(a) * 70],
        W = strassenweg(far, ziel);
      if (W) wege.push(W.concat([ziel]));
    }
    let best = null;
    for (const W of wege)
      for (const back of [32, 26, 40, 20]) {
        const v = vorEnde(W, back);
        if (!frei(v.start[0], v.start[1], 0.3)) continue;
        if (!imBlick(v.start[0], v.start[1], 90)) return v;
        if (!best) best = v;
      }
    if (best) return best;
    // no streets (the town): a start with a free straight way to the spot (no wall between – the police's line of sight,
    // grenzland/gl_fahndung.js, knows the town's walls), along the facade of a door first, else from any side
    const T = w.tuer && !w.tuer.heim ? w.tuer : null,
      vor = T ? [T.x + T.nx * 1.4, T.y + T.ny * 1.4] : ziel,
      dirs = [];
    if (T) dirs.push([T.ny, -T.nx], [-T.ny, T.nx]);
    for (let k = 0; k < 12; k++)
      dirs.push([Math.sin((k / 12) * Math.PI * 2 + p.i), Math.cos((k / 12) * Math.PI * 2 + p.i)]);
    for (const dd of [26, 20, 30, 14])
      for (const d of dirs) {
        const c = [vor[0] + d[0] * dd, vor[1] + d[1] * dd];
        if (!frei(c[0], c[1], 0.3)) continue;
        if (!GLFAHNDUNG.los(c[0], c[1], vor[0], vor[1])) continue;
        const v = { start: c, rest: T ? [vor, ziel] : [ziel] };
        if (!imBlick(c[0], c[1], 90)) return v;
        if (!best) best = v;
      }
    return best;
  }
  function laden(p) {
    S.lade = p.id;
    S.ladeT = 0;
    const j = S.jetzt[p.id],
      winter = D.winterM(D.ymd(eday()).m);
    // winter: a hat for those of the street who have none (the seven of the village keep their own look)
    const o = { era: 'heute' };
    if (winter && !p.dorf && !p.hut)
      o.hut = p.voice.g === 'f' || p.voice.age < 20 ? (p.i % 2 ? 'strick' : 'strickblau') : 'schieber';
    if (j && j.ding) o.ding = j.ding;
    GLFIG.make(KEY(p), o).then(F => {
      S.lade = null;
      if (!F) return;
      S.n.make++;
      const w2 = S.wo[p.id];
      if (!heute() || !S.on || !w2 || !w2.zeigbar || (GL.cur && !S.mitMission) || S.figs.has(p.id))
        return GLFIG.drop(F);
      F.knows = p.ort === 'ratscher'; // the village knows its neighbours
      F.sees = true;
      F.r = 24;
      F.alltag = p.id;
      const o2 = { F, p, st: 'da', key: null, sitz: null, t: 0, sagT: 0, geT: 2 + Math.random() * 6, grussT: 0, ri: 0 };
      S.figs.set(p.id, o2);
      einsetzen(o2, w2, true);
    });
  }
  function weg(o, why) {
    const F = o.F,
      w = S.wo[o.p.id];
    // gone in at a door, or off after coming out: not again for this slot
    if (w && w.key === o.key) {
      if (why === 'tuer') w.aus = w.ph === 'raus' || w.ph === 'nach' ? 'fertig' : 'tuer';
      else if (why === 'heim' || o.raus) w.aus = 'fertig';
    }
    if (o.sitz)
      try {
        GLFIG.steh(F, true);
      } catch (e) {}
    S.figs.delete(o.p.id);
    if (!F.gone) GLFIG.drop(F);
    S.n.drop++;
    if (why) S.n[why] = (S.n[why] || 0) + 1;
  }
  // put a figure where its slot wants it: walking in from where one comes (a new slot, or a shop's door), or there already
  function einsetzen(o, w, frisch) {
    const F = o.F,
      j = S.jetzt[o.p.id],
      m = minOf();
    o.key = w.key;
    o.ziel = null;
    o.sitz = null;
    o.ri = 0;
    if (F.sitzt)
      try {
        GLFIG.steh(F, true);
      } catch (e) {}
    GLFIG.pose(F, null);
    try {
      GLFIG.thing(F, (j && j.ding) || null);
    } catch (e) {}
    const [px, py] = spieler();
    const T = w.tuer;
    if (w.ph === 'raus' && T) {
      // out of the shop's door with a bag, off the way it came
      GLFIG.place(F, T.x, T.y, Math.atan2(T.nx, T.ny));
      try {
        GLFIG.thing(F, 'beutel');
      } catch (e) {}
      const q = herkunft(o.p, w);
      o.raus = true;
      const vor = [T.x + T.nx * 1.5, T.y + T.ny * 1.5];
      if (q) gehe(o, [vor].concat(q.rest.slice(0, -1).reverse(), [q.start]), 'weg');
      else gehe(o, [vor], 'weg');
      S.n.raus++;
      return;
    }
    if (w.ph === 'nach' && T && m - 11 * 60 < 8) {
      // out of the church, a few steps, then standing about
      GLFIG.place(F, T.x, T.y, Math.atan2(T.nx, T.ny));
      gehe(o, [[w.x, w.y]], 'da');
      return;
    }
    if (w.ph === 'hin' && T) {
      // towards the shop's door along the street, in at the door
      const q = herkunft(o.p, w) || { start: [w.x, w.y], rest: [] };
      GLFIG.place(F, q.start[0], q.start[1], Math.atan2(T.x - q.start[0], T.y - q.start[1]));
      const vor = [T.x + T.nx * 1.2, T.y + T.ny * 1.2];
      gehe(o, q.rest.slice(0, -1).concat([vor, [T.x, T.y]]), 'tuer');
      return;
    }
    if (w.runde) {
      // the round: on it where one does not see it begin
      let k = 0,
        bd = 1e9;
      w.runde.forEach((q, i) => {
        const d = hyp(q[0] - px, q[1] - py);
        if (d > 25 && d < bd && !imBlick(q[0], q[1], 60)) {
          bd = d;
          k = i;
        }
      });
      GLFIG.place(F, w.runde[k][0], w.runde[k][1], 0);
      o.ri = k;
      runde(o, w);
      return;
    }
    if (!frisch) {
      // on to the next spot near by, along the street when it is further
      gehe(o, wegNach([F.x, F.y], [w.x, w.y]), 'da');
      return;
    }
    const neu = j && m - j.von < 12,
      nah = hyp(w.x - px, w.y - py) < 22 || imBlick(w.x, w.y, 45);
    if (neu || nah) {
      // walk in along the street (a new slot, or one would see it pop up)
      const q = herkunft(o.p, w);
      if (q) {
        GLFIG.place(F, q.start[0], q.start[1], Math.atan2(w.x - q.start[0], w.y - q.start[1]));
        gehe(o, q.rest.slice(0, -1).concat([[w.x, w.y]]), 'da');
        return;
      }
    }
    GLFIG.place(F, w.x, w.y, w.hd || 0);
    ankommen(o, w);
  }
  // walk along points; then: 'da' (arrive at the slot's spot), 'tuer' (in at a door), 'heim', 'weg' (gone), 'runde'
  function gehe(o, pts, dann) {
    const F = o.F;
    o.st = dann === 'da' || dann === 'runde' ? 'hin' : dann;
    o.dann = dann;
    o.t = 0;
    o.ziel = pts[pts.length - 1];
    const v = o.p.voice.age > 64 ? 1.0 : o.p.voice.age < 20 ? 1.35 : 1.2;
    // (arrived: let go in this module's own turn – not inside the figures' loop of GLFIG.tick)
    GLFIG.go(F, pts, v, () => {
      if (F.gone) return;
      if (dann === 'tuer' || dann === 'weg' || dann === 'heim') o.ende = dann;
      else if (dann === 'runde') runde(o, S.wo[o.p.id]);
      else ankommen(o, S.wo[o.p.id]);
    });
  }
  function runde(o, w) {
    if (!w || !w.runde) return;
    o.ri = (o.ri + 1) % w.runde.length;
    gehe(o, [w.runde[o.ri]], 'runde');
  }
  function ankommen(o, w) {
    const F = o.F,
      j = S.jetzt[o.p.id];
    o.st = 'da';
    o.t = 0;
    if (!w || !j) return;
    if (w.sitz) {
      GLFIG.sitz(F, w.sitz.x, w.sitz.y, w.sitz.hd, w.sitz.z);
      o.sitz = w.sitz;
    } else {
      F.hd = w.hd || F.hd;
      if (j.pose) GLFIG.pose(F, j.pose);
    }
  }
  // the slot changed while one is drawn: walk to the new spot when it is near, else off (home through the door, into the shop, or out of
  // sight along the street)
  function umziehen(o, w) {
    const F = o.F,
      p = o.p,
      j = S.jetzt[p.id];
    GLFIG.pose(F, null);
    const T = w && w.tuer;
    if (
      w &&
      w.zeigbar &&
      w.x != null &&
      w.ph !== 'drin' &&
      hyp(w.x - F.x, w.y - F.y) < 70 &&
      !(T && !T.heim && !T.kirche)
    ) {
      einsetzen(o, w, false);
      return;
    }
    if (T && !T.heim && w.ph === 'hin' && hyp(T.x - F.x, T.y - F.y) < 90) {
      o.key = w.key;
      gehe(o, wegNach([F.x, F.y], [T.x + T.nx * 1.2, T.y + T.ny * 1.2]).concat([[T.x, T.y]]), 'tuer');
      return;
    }
    o.key = w ? w.key : null;
    const h = heim(p);
    if (j && (j.platz === 'daheim' || j.innen) && h && hyp(h.step[0] - F.x, h.step[1] - F.y) < 110) {
      gehe(o, wegNach([F.x, F.y], h.step).concat([[h.door[0], h.door[1]]]), 'heim');
      return;
    }
    // off towards where the next place is (or away from the player), let go out of sight
    const [px, py] = spieler();
    let dx = w && w.x != null ? w.x - F.x : F.x - px,
      dy = w && w.x != null ? w.y - F.y : F.y - py;
    const l = hyp(dx, dy) || 1;
    dx /= l;
    dy /= l;
    let q = freiNah(F.x + dx * 35, F.y + dy * 35, 6) || [F.x + dx * 20, F.y + dy * 20];
    // (in the town, where there is no road graph: a direction with a free straight way)
    if (!imQuadrat(F.x, F.y) && !GLFAHNDUNG.los(F.x, F.y, q[0], q[1]))
      for (let k = 1; k < 12; k++) {
        const a = Math.atan2(dx, dy) + (k % 2 ? 1 : -1) * Math.ceil(k / 2) * 0.5,
          c = [F.x + Math.sin(a) * 28, F.y + Math.cos(a) * 28];
        if (frei(c[0], c[1]) && GLFAHNDUNG.los(F.x, F.y, c[0], c[1])) {
          q = c;
          break;
        }
      }
    gehe(o, wegNach([F.x, F.y], q), 'weg');
  }
  // a bus standing at the stop near (x, y): the point by its front door, or null
  function busAmHalt(x, y) {
    try {
      const B = window.BUS;
      for (const I of (B && B.S && B.S.inst) || [])
        if (I.st === 'halt' && hyp(I.x - x, I.y - y) < 16 && Number.isFinite(I.hd)) {
          // (hd in radians; the front door on the right, near the front)
          const h = I.hd;
          return [I.x + Math.sin(h) * 4.8 + Math.cos(h) * 1.7, I.y + Math.cos(h) * 4.8 - Math.sin(h) * 1.7];
        }
      const G = window.GLLINIEN;
      for (const v of (G && G.fahrzeuge ? G.fahrzeuge() : []) || [])
        if (/bus/i.test(v.art || '') && hyp(v.x - x, v.y - y) < 14) return [v.x, v.y];
    } catch (e) {}
    return null;
  }
  // ---- per figure, every frame ----
  const GESTEN = ['arme', 'achsel', 'nicken', 'kopf', 'arme', 'nicken'];
  function verhalten(o, dt, px, py) {
    const F = o.F,
      p = o.p,
      w = S.wo[p.id];
    o.t += dt;
    if (F.gone) return S.figs.delete(p.id);
    if (o.ende) return weg(o, o.ende === 'weg' ? null : o.ende);
    // the slot moved on
    if (w && o.key !== w.key && o.st !== 'tuer' && o.st !== 'weg' && o.st !== 'heim') return umziehen(o, w);
    // the school bus: a bus that stops at the stop (the base game's lines, bus/bus.js, or the school bus of the agent `strasse`) takes
    // whoever waits for it – they walk to its front door and get in
    if (w && o.st === 'da' && w.platz === 'haltestelle' && S.jetzt[p.id] && S.jetzt[p.id].tun === 'warten') {
      const b = busAmHalt(w.x, w.y);
      if (b) return gehe(o, [[b[0], b[1]]], 'tuer');
    }
    // shops: inside now – who stands at the door goes in
    if (w && w.ph === 'drin' && o.st === 'da' && w.tuer) {
      return gehe(o, [[w.tuer.x, w.tuer.y]], 'tuer');
    }
    // stuck walking (a wall, a fence, a car): no headway for four seconds – near the door: in; out of sight: gone (as if arrived);
    // in sight: standing where one is
    if (o.st === 'hin' || o.st === 'weg' || o.st === 'tuer' || o.st === 'heim') {
      o.fortT = (o.fortT || 0) + dt;
      if (o.fortT > 4) {
        const zl = o.ziel ? hyp(F.x - o.ziel[0], F.y - o.ziel[1]) : 0,
          gut = o.fortD == null || o.fortD - zl > 0.3 || (F.vNow || 0) > 0.3;
        o.fortT = 0;
        o.fortD = zl;
        if (!gut || o.t > 90) {
          if ((o.st === 'tuer' || o.st === 'heim') && zl < 8) return weg(o, o.st);
          if (!imBlick(F.x, F.y, 60)) return weg(o, o.st === 'tuer' || o.st === 'heim' ? o.st : null);
          F.path = null;
          F.st = 'steht';
          if (o.st === 'hin') ankommen(o, w);
          else o.st = 'weg';
        }
      }
    } else o.fortD = null;
    // the ground under one standing or sitting: the tiles of the town and the land come in finer after a while – stand on them
    if ((o.bodenT = (o.bodenT || 0) - dt) <= 0) {
      o.bodenT = 0.8;
      const g = KERN.ground(F.x, F.y);
      if (Number.isFinite(g) && !F.path) {
        if (F.sitzt && o.sitz) {
          if (Math.abs(g - (F.boden ?? g)) > 0.15) GLFIG.sitz(F, o.sitz.x, o.sitz.y, o.sitz.hd, o.sitz.z);
        } else if (!F.sitzt && Math.abs(g - F.z) > 0.12) GLFIG.place(F, F.x, F.y, F.hd);
      }
    }
    const d = hyp(F.x - px, F.y - py);
    if (o.st === 'weg' && d > R_OUT * 0.8 && !imBlick(F.x, F.y, 80)) return weg(o);
    // the player passes: a greeting, a nod, a look away (standing or walking)
    if ((o.grussT -= dt) <= 0 && d < 6.5 && S.grussT <= 0 && !GL.cur && (o.st === 'da' || o.st === 'hin') && !VEH.cur) {
      o.grussT = 120;
      S.grussT = 6;
      gruessen(o);
    }
    if (o.st !== 'da') return;
    // the group made room for somebody: a step to the new spot
    if (w && w.moved) {
      w.moved = false;
      if (!o.sitz && hyp(w.x - F.x, w.y - F.y) > 0.4) return gehe(o, [[w.x, w.y]], 'da');
    }
    // a group: who speaks, who listens
    if ((o.geT -= dt) <= 0) {
      o.geT = 5 + Math.random() * 9;
      const grp = [...S.figs.values()].filter(
        q => q !== o && q.st === 'da' && q.F && hyp(q.F.x - F.x, q.F.y - F.y) < 3.2
      );
      if (grp.length && !F.f.walker.talking && !o.sagT) {
        GLFIG.talking(F, true);
        const g = GESTEN[(Math.random() * GESTEN.length) | 0];
        if (!o.sitz || g === 'nicken' || g === 'kopf') GLFIG.geste(F, g, { sec: 1.4 + Math.random() });
        for (const q of grp) GLFIG.blick(q.F, F);
        const T = 2.2 + Math.random() * 2.5;
        o.sprichtT = T;
      } else if (!grp.length && Math.random() < 0.45 && !o.blickSp) {
        // alone: a look round, now and then the phone (the young ones)
        if (p.voice.age < 30 && Math.random() < 0.5) GLFIG.geste(F, 'telefon', { sec: 5 + Math.random() * 6 });
        else
          GLFIG.blick(
            F,
            F.x + Math.sin(F.hd + (Math.random() - 0.5) * 2.4) * 8,
            F.y + Math.cos(F.hd + (Math.random() - 0.5) * 2.4) * 8
          );
      }
    }
    if (o.sprichtT > 0 && (o.sprichtT -= dt) <= 0) {
      o.sprichtT = 0;
      if (!o.sagT) GLFIG.talking(F, false);
    }
    if (o.sagT > 0 && (o.sagT -= dt) <= 0) {
      o.sagT = 0;
      GLFIG.talking(F, false);
      GLFIG.blick(F, null);
    }
  }
  function stufeOf(ort) {
    try {
      const R = window.GLRUF;
      const s = R && R.stufe ? R.stufe(ort) : null;
      return ['beliebt', 'neutral', 'misstrauisch', 'verhasst'].includes(s) ? s : 'neutral';
    } catch (e) {
      return 'neutral';
    }
  }
  function sag(o, text, sec) {
    const F = o.F;
    GLHUD.sub(o.p.name, text, Math.max(1800, text.length * 62));
    GLFIG.talking(F, true);
    o.sagT = sec || Math.max(1.6, text.length * 0.06);
    S.n.sag++;
    try {
      STIMME.say('gl_' + KEY(o.p), text, { at: [F.x, F.y] });
    } catch (e) {}
  }
  function gruessen(o) {
    const F = o.F,
      st = stufeOf(o.p.ort),
      g = D.gruss(st, D.tz(minOf()));
    S.n.gruss++;
    S.gruesse.push({ id: o.p.id, text: g.text, stufe: st });
    if (S.gruesse.length > 12) S.gruesse.shift();
    if (g.weg) {
      // turned away: a wave of the hand, the back to the two
      const [px, py] = spieler();
      GLFIG.geste(F, g.geste);
      if (!o.sitz) F.hd = Math.atan2(F.x - px, F.y - py);
      sag(o, g.text);
      return;
    }
    if (g.tuschel) {
      // a look, a shake of the head, and a word to the one beside
      GLFIG.blick(F, 'spieler');
      GLFIG.geste(F, g.geste);
      const nb = [...S.figs.values()].find(q => q !== o && q.st === 'da' && hyp(q.F.x - F.x, q.F.y - F.y) < 3.2);
      setTimeout(() => {
        if (F.gone) return;
        if (nb && !nb.F.gone) {
          GLFIG.blick(F, nb.F);
          GLFIG.blick(nb.F, F);
          GLFIG.talking(F, true);
          setTimeout(() => !F.gone && GLFIG.talking(F, false), 1800);
        } else GLFIG.blick(F, null);
      }, 1400);
      return;
    }
    GLFIG.blick(F, 'spieler');
    GLFIG.geste(F, g.geste);
    sag(o, g.text, 1.6);
  }
  // ---- E: one line from the person one faces ----
  function gegenueber() {
    if (!heute() || VEH.cur || GL.cur) return null;
    const yaw = (P.yaw * Math.PI) / 180;
    let best = null,
      bd = 3;
    for (const o of S.figs.values()) {
      if (!o.F || o.F.gone || o.st === 'weg' || o.st === 'tuer') continue;
      const d = hyp(o.F.x - P.x, o.F.y - P.y);
      let a = Math.atan2(o.F.x - P.x, o.F.y - P.y) - yaw;
      while (a > Math.PI) a -= 2 * Math.PI;
      while (a < -Math.PI) a += 2 * Math.PI;
      if (Math.abs(a) < 1.1 && d < bd) {
        bd = d;
        best = o;
      }
    }
    return best;
  }
  function reden(o) {
    o = o || gegenueber();
    if (!o) return null;
    const j = S.jetzt[o.p.id],
      lage = (j && D.LAGE[j.tun]) || 'sonst',
      text = D.ansage(o.p, lage, stufeOf(o.p.ort));
    if (!text) return null;
    if (o.st === 'hin' && o.F.path) {
      // stops for a word
      o.F.path = null;
      o.F.st = 'steht';
      o.st = 'da';
    }
    if (!o.sitz) GLFIG.face(o.F, P.x, P.y);
    GLFIG.blick(o.F, 'spieler');
    sag(o, text, Math.max(2, text.length * 0.065));
    o.grussT = 120;
    return text;
  }
  KERN.act({
    id: 'gl-alltag',
    prio: 0.15,
    r: 3,
    label: () => {
      const o = gegenueber();
      return o ? 'Reden mit ' + o.p.name : null;
    },
    pos: () => {
      const o = gegenueber();
      return o ? [o.F.x, o.F.y, (o.F.z || 0) + 1] : [0, 0, -999];
    },
    run: () => reden(),
  });
  // ---- per frame ----
  function alleWeg() {
    for (const o of [...S.figs.values()]) weg(o);
  }
  function lauf(dt) {
    if (!heute() || (GL.cur && !S.mitMission)) {
      if (S.figs.size) alleWeg();
      S.on = false;
      return;
    }
    if (!S.on) {
      S.on = true;
      S.simT = 0;
      stimmen();
    }
    S.grussT -= dt;
    if ((S.simT -= dt) <= 0) {
      S.simT = 0.5;
      sim();
      // who should be a figure; who is too far or no longer wanted is let go out of sight (or at once when far)
      const G = gewollt(),
        want = new Set(G.map(p => p.id)),
        [px, py] = spieler();
      for (const o of [...S.figs.values()]) {
        if (want.has(o.p.id)) continue;
        const d = hyp(o.F.x - px, o.F.y - py);
        if (d > R_OUT || !imBlick(o.F.x, o.F.y, 70)) weg(o);
        else if (o.st === 'da' || o.st === 'hin') umziehen(o, null);
      }
      if (S.lade) {
        if ((S.ladeT += 0.5) > 40) S.lade = null;
      } else if (S.figs.size < MAX) {
        const p = G.find(q => !S.figs.has(q.id));
        if (p) laden(p);
      }
    }
    const [px, py] = spieler();
    for (const o of [...S.figs.values()])
      try {
        verhalten(o, dt, px, py);
      } catch (e) {
        if (!S.err) console.warn('grenzland alltag', o.p.id, e);
        S.err = o.p.id + ': ' + ((e && e.message) || e);
      }
    if (S.figs.size) markDirty();
  }
  function tick(dt) {
    if (!GL.on) return;
    try {
      lauf(Math.min(dt, 0.25));
    } catch (e) {
      if (!S.err) console.warn('grenzland alltag', e);
      S.err = String((e && e.stack) || e).slice(0, 300);
    }
  }
  function stop() {
    try {
      alleWeg();
    } catch (e) {}
    S.on = false;
    S.lade = null;
    S.jetzt = {};
    S.wo = {};
  }
  // (its own turn after the mode's, as grenzland/gl_ereignis.js has it – nothing runs before the mode starts: tick checks GL.on)
  KERN.tick(tick, 'grenzland/alltag');
  KERN.on('grenzland:stop', () => stop());
  KERN.on('grenzland:era', () => alleWeg());
  // ---- the API ----
  function leute() {
    if (!Object.keys(S.jetzt).length && GL.on) sim();
    return D.LEUTE.map(p => {
      const j = S.jetzt[p.id] || {},
        w = S.wo[p.id] || {},
        o = S.figs.get(p.id);
      return {
        id: p.id,
        name: p.name,
        ort: w.ort || p.ort,
        x: o ? o.F.x : w.x,
        y: o ? o.F.y : w.y,
        tun: j.tun || 'daheim',
        platz: j.platz || 'daheim',
        gezeigt: !!o,
      };
    });
  }
  const person = n => {
    const k = String(n || '').toLowerCase();
    return leute().find(q => q.id === k || q.name.toLowerCase() === k) || null;
  };
  Object.assign(S, {
    leute,
    person,
    tick,
    stop,
    reden,
    linien: () => D.linien(),
    debug: {
      // the clock to min (minutes of the day), on weekday wd (0 Sunday … 6 Saturday) if given – forward in time
      zeit(min, wd) {
        let d = Math.floor(CLOCK.t / 1440);
        if (wd != null) for (let k = 0; k < 7 && DCAL.wd(d * 1440) !== wd; k++) d++;
        CLOCK.t = d * 1440 + min;
        try {
          if (DN.active) DN.update(true);
        } catch (e) {}
        S.simT = 0;
        return CLOCK.t;
      },
      stand: () => ({
        on: S.on,
        gezeigt: [...S.figs.keys()],
        st: Object.fromEntries([...S.figs.entries()].map(([k, o]) => [k, o.st])),
        lade: S.lade,
        n: Object.assign({}, S.n),
        err: S.err,
        jetzt: Object.fromEntries(
          Object.entries(S.jetzt).map(([k, j]) => [k, j.platz + ':' + j.tun + (j.basis ? ':basis' : '')])
        ),
        gruesse: S.gruesse.slice(),
        max: MAX,
      }),
      hin(id) {
        const w = S.wo[id],
          o = S.figs.get(id);
        const x = o ? o.F.x : w && w.x,
          y = o ? o.F.y : w && w.y;
        return x == null ? null : [x, y];
      },
      wo: id => S.wo[id] || null,
      sim,
    },
  });
  return S;
})();
window.GLALLTAG = GLALLTAG;
