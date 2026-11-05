// ===================== feat/bus 3: the buses in the world – stops, boards, waiting, getting on, riding along (BUS) =====================
// The real lines of the timetable (bus/bus_fahrplan.js BUSPLAN; gtfs.de, DELFI e.V.) run through Ratscher, Schleusingen and on towards
// Kloster Veßra and Themar. What one meets:
// - Stops: where a stop of the timetable lies near the observer, a stop sign with the H, its name and the timetable case stands at the
//   kerb of each direction (the school bus stop at the old school has its shelter and sign already: world/village_props.js). At the
//   sign: „Fahrplan“ – a board with the next departures („203 Masserberg 7:43“), the day („Mittwoch, Schultag“), „Auf den Bus warten“
//   (the clock jumps like sleeping, to a minute before the bus).
// - Buses: every trip is its timetable; one near the observer (DRAW m) gets a model (bus/bus_modell.js) and drives its way with a bus's
//   pace through the minutes of its run (BUSPLAN.run: accelerating, braking, curves, standing at each stop; early buses wait). Whoever
//   stands at a stop when a bus is due, and whoever rides, has the clock in real time (time/clock.js CLOCK.focus) – so the bus comes at its
//   minute and drives as fast as a bus drives; a bus passing elsewhere drives in real time from where its timetable put it (it keeps its
//   own minutes, a little behind the racing clock). At a stop the doors open; „Einsteigen“ (KERN.act) at the front door.
// - Riding: a seat on the right behind the middle door (first person, like riding along in verkehr/verkehr.js), a panel with the line,
//   the next stops and their times; „Halt: <next>“ (the stop request), any stop of the list to get off there, „Fahrt abkürzen“ (a fade, the
//   clock jumps to the arrival – the ground there is loaded before it fades in). The bus drives its real way across the tiles beyond the
//   square (welt/welt.js streams them around the rider, welt/fahrt.js carves the roads); getting off puts one at the kerb beside the front
//   door. Saved during a ride (pav-bus-v1): the stop one boarded at or last passed – a reload puts one there.
// - Night: head lamps and the lit inside (shared lamp materials), one borrowed light ahead of the nearest bus (KERN.lights.borrow).
// - Sounds (synthesised): the diesel of the nearest bus, the doors.
// - The zombie night (zombie/z_state.js Z.on) has its own bus: no regular buses then.
// Events: 'bus:ein' { line, ziel, halt }, 'bus:aus' { line, halt }, 'bus:warten' { halt, min }, 'bus:ankunft' { line, halt }.
import * as THREE from 'three';
import { $, BASE, COARSE, stage, V } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { SAVE } from '../core/save.js';
import { floorAt, P } from '../game/walkable.js';
import { go } from '../game/player.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { RATSCHER } from '../world/ratscher.js';
import { DKDATA } from '../world/dorfkern_data.js';
import { WELT } from '../welt/welt.js';
import { FAHRT } from '../welt/fahrt.js';
import { VNETZ } from '../verkehr/verkehr_netz.js';
import { VEH } from '../vehicles/vehicle.js';
import { audio } from '../audio/audio.js';
import { Z } from '../zombie/z_state.js';
import { BUSPLAN } from './bus_fahrplan.js';
import { BUSMOD } from './bus_modell.js';
export const BUS = (() => {
  const LSK = SAVE.key('pav-bus-v1', {
    owner: 'Bus',
    kind: 'json',
    def: null,
    check: v =>
      v === null ||
      (!!v &&
        typeof v === 'object' &&
        v.v === 1 &&
        (v.ride === null ||
          (!!v.ride &&
            Number.isFinite(v.ride.x) &&
            Number.isFinite(v.ride.y) &&
            Math.abs(v.ride.x) < 50000 &&
            Math.abs(v.ride.y) < 50000))),
  });
  const S = {
    on: true,
    state: 'idle',
    err: '',
    inst: [],
    furn: new Map(),
    ride: null,
    focus: false,
    auto: true,
    t: 0,
    near: null,
    stats: { spawned: 0, dropped: 0, rides: 0, arrivals: 0, waits: 0, built: 0 },
  };
  const OBS = [];
  const DRAW = COARSE ? 420 : 620,
    MAXI = COARSE ? 2 : 3,
    FURN = 240,
    D = BUSMOD.DIM,
    RB = () => RATSCHER.box || [-1e9, -1e9, 1e9, 1e9];
  const insideRB = (x, y) => {
    const b = RB();
    return x > b[0] && x < b[2] && y > b[1] && y < b[3];
  };
  const T = () => CLOCK.t,
    e0 = () => (window.DN && Number.isFinite(DN.e0) ? DN.e0 : Math.round(Date.UTC(2026, 5, 1) / 864e5));
  const where = () => KERN.where() || [P.x, P.y];
  // ---------------- data ----------------
  function load() {
    if (S.state !== 'idle') return;
    S.state = 'loading';
    fetch(BASE + 'bus/fahrplan.json')
      .then(r => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(j => {
        BUSPLAN.parse(j);
        stopsOf();
        S.state = 'ready';
        KERN.emit('bus:bereit', { stations: BUSPLAN.S.stations.length, trips: BUSPLAN.S.trips.length });
      })
      .catch(e => {
        S.state = 'error';
        S.err = String(e);
        console.warn('bus', e);
      });
  }
  // ---------------- the stops: where a bus stands, where the sign stands ----------------
  // per platform: the directions the buses take there (the lane's heading at the stop) – a sign at the kerb on the right of each
  let STOPS = [];
  const SHELTER = () => (DKDATA && DKDATA.open && DKDATA.open.shelter) || { c: [248.8, -100.8], az: 196 };
  function stopsOf() {
    STOPS = [];
    const seen = new Map();
    const o = {};
    for (const P_ of BUSPLAN.S.pats) {
      P_.st.forEach(({ s, q }, k) => {
        if (s < 0) return;
        BUSPLAN.centreAt(P_, P_.s[k], o);
        const key = s + ':' + q + ':' + Math.round((((o.hd * 180) / Math.PI + 360) % 360) / 90);
        if (seen.has(key)) return;
        const st = BUSPLAN.S.stations[s],
          pl = st.pl[q],
          rx = Math.cos(o.hd),
          ry = -Math.sin(o.hd);
        let x = pl.x + rx * 3.9,
          y = pl.y + ry * 3.9,
          shelter = false;
        // the school bus stop at the old school: its shelter (world/village_props.js) – the sign is there already
        const sh = SHELTER();
        if (Math.hypot(sh.c[0] - pl.x, sh.c[1] - pl.y) < 30) {
          x = sh.c[0];
          y = sh.c[1];
          shelter = true;
        }
        const e = {
          s,
          q,
          x,
          y,
          hd: o.hd,
          az: ((o.hd * 180) / Math.PI + 360) % 360,
          shelter,
          name: st.n,
          i: STOPS.length,
        };
        seen.set(key, e);
        STOPS.push(e);
      });
    }
  }
  const stName = s => (s >= 0 && BUSPLAN.S.stations[s] ? BUSPLAN.S.stations[s].n : 'Rand der Karte');
  // a call (trip, k) on this kerb: the bus's heading there along the stop's direction
  const _h = {};
  // (and from this platform: the Zentralhaltestelle in Schleusingen has five, each line its own)
  function sameWay(e, d) {
    const P_ = BUSPLAN.S.pats[d.trip.pat];
    if (P_.st[d.k].q !== e.q) return false;
    BUSPLAN.centreAt(P_, P_.s[d.k], _h);
    return Math.cos(_h.hd - e.hd) > 0.3;
  }
  // ---------------- the furniture near the observer: signs, the board's action ----------------
  function furniture(ox, oy) {
    for (const e of STOPS) {
      const d = Math.hypot(e.x - ox, e.y - oy),
        f = S.furn.get(e.i);
      if (d < FURN && !f) {
        let sign = null;
        if (!e.shelter) {
          const z = KERN.ground(e.x, e.y);
          if (!Number.isFinite(z)) continue;
          // the sign faces the oncoming bus (its face across the road's direction); in its case the timetable of this kerb
          sign = BUSMOD.sign(e.x, e.y, z, (e.az + 180) % 360, e.name, aushang(e));
        }
        const id = 'bus:plan:' + e.i;
        KERN.act({
          id,
          r: 3.2,
          prio: 2,
          pos: () => [e.x, e.y, KERN.ground(e.x, e.y)],
          label: () => (S.ride || Z.on ? null : 'Fahrplan: ' + BUSPLAN.S.stations[e.s].short),
          run: () => board(e),
        });
        S.furn.set(e.i, { sign, id, z: e.shelter ? 0 : KERN.ground(e.x, e.y) });
        S.stats.built++;
        markDirty(true);
      } else if (f && f.sign && d < FURN && Math.abs(KERN.ground(e.x, e.y) - f.z) > 0.15) {
        // the ground there came later (tiles beyond the square): the sign onto it
        f.sign.dispose();
        f.z = KERN.ground(e.x, e.y);
        f.sign = BUSMOD.sign(e.x, e.y, f.z, (e.az + 180) % 360, e.name, aushang(e));
        markDirty(true);
      } else if (f && d > FURN + 140) {
        if (f.sign) f.sign.dispose();
        KERN.unact(f.id);
        S.furn.delete(e.i);
        markDirty(true);
      }
    }
  }
  // the printed timetable in the case of a sign: the departures of this kerb by hour, Monday–Friday, Saturday, Sunday and holidays
  function aushang(e) {
    return (c, w, h) => {
      const cols = [
          [0, 'Montag – Freitag', 1],
          [1, 'Samstag', 1 << 5],
          [2, 'Sonn- u. Feiertag', 1 << 6],
        ],
        mins = cols.map(() => new Map()),
        heads = new Map();
      for (const [ti, k] of BUSPLAN.S.byStation[e.s] || []) {
        const t = BUSPLAN.S.trips[ti],
          P_ = BUSPLAN.S.pats[t.pat];
        if (k === P_.last && !t.weiter) continue;
        if (!sameWay(e, { trip: t, k })) continue;
        const m = Math.round(t.t0 + t.d[k]) % 1440;
        heads.set(t.head || t.nach, (heads.get(t.head || t.nach) || 0) + 1);
        for (const [ci, , bit] of cols) {
          if (ci === 0 ? !(t.days & 0b11111) : !(t.days & bit)) continue;
          const hh = Math.floor(m / 60),
            L = mins[ci].get(hh) || [];
          const mm = String(m % 60).padStart(2, '0') + (t.school ? 's' : '');
          if (!L.includes(mm)) L.push(mm);
          mins[ci].set(hh, L);
        }
      }
      c.fillStyle = '#fbfbf8';
      c.fillRect(0, 0, w, h);
      c.fillStyle = '#0f7a3c';
      c.fillRect(0, 0, w, 30);
      c.fillStyle = '#fff';
      c.font = 'bold 15px Arial, sans-serif';
      c.textBaseline = 'middle';
      c.fillText(BUSPLAN.S.stations[e.s].n.slice(0, 30), 8, 15);
      c.fillStyle = '#222';
      c.font = '11px Arial, sans-serif';
      const dirs = [...heads.entries()].sort((a, b) => b[1] - a[1]).map(q => q[0]);
      c.fillText('Richtung ' + dirs.slice(0, 2).join(' / ').slice(0, 40), 8, 41);
      const x0 = [8, 112, 184],
        cw = [100, 68, 68];
      c.font = 'bold 10px Arial, sans-serif';
      cols.forEach(([ci, lbl]) => c.fillText(lbl.slice(0, ci ? 11 : 18), x0[ci], 57));
      c.font = '10px Arial, sans-serif';
      let y = 70;
      for (let hh = 4; hh <= 23 && y < h - 14; hh++) {
        if (!cols.some(([ci]) => mins[ci].has(hh))) continue;
        c.fillStyle = hh % 2 ? '#f0f0ec' : '#fbfbf8';
        c.fillRect(0, y - 6, w, 12.5);
        c.fillStyle = '#222';
        for (const [ci] of cols) {
          const L = (mins[ci].get(hh) || []).sort();
          c.fillText(String(hh).padStart(2, ' ') + '  ' + L.join(' '), x0[ci], y, cw[ci]);
        }
        y += 12.5;
      }
      if (y === 70) {
        // nothing leaves here in this direction: the buses end here
        c.font = 'bold 13px Arial, sans-serif';
        c.fillText('Ausstieg – hier enden die Fahrten', 8, 90);
      }
      c.fillStyle = '#666';
      c.font = '9px Arial, sans-serif';
      c.fillText('s = an Schultagen · Fahrplan gtfs.de (DELFI e.V.)', 8, h - 7);
    };
  }
  // the stop the player stands at (≤ r m from its sign)
  function stopAt(x, y, r = 40) {
    let best = null,
      bd = r;
    for (const e of STOPS) {
      const d = Math.hypot(e.x - x, e.y - y);
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }
  // ---------------- the buses near the observer ----------------
  const pool = [];
  let seed = 1;
  function getModel() {
    return pool.pop() || BUSMOD.build(seed++);
  }
  const _o = {},
    _c = {};
  function spawn(a, tau) {
    const Rn = BUSPLAN.run(a.trip, a.di);
    const I = {
      Rn,
      key: Rn.key,
      trip: a.trip,
      tau: tau ?? T(),
      B: getModel(),
      x: 0,
      y: 0,
      z: 0,
      hd: 0,
      v: 0,
      st: '',
      k: -1,
      dist: 0,
      seen: 0,
      endT: 0,
      lastS: null,
      hold: 0,
    };
    const tr = a.trip;
    I.B.sign(tr.line, tr.head || tr.nach);
    I.B.g.visible = true;
    S.inst.push(I);
    S.stats.spawned++;
    place(I, 0);
    return I;
  }
  function drop(I) {
    const i = S.inst.indexOf(I);
    if (i >= 0) S.inst.splice(i, 1);
    I.B.g.visible = false;
    I.B.setOpen(0);
    KERN.unact('bus:ein:' + I.key);
    if (pool.length < MAXI) pool.push(I.B);
    else I.B.dispose();
    S.stats.dropped++;
    markDirty(true);
  }
  // a point on the lane at s (clamped, extrapolated before the start)
  function lanePt(R, s, out) {
    VNETZ.at(R, Math.max(0, Math.min(R.L, s)), out);
    if (s < 0) {
      out.x -= Math.sin(out.hd) * -s;
      out.y -= Math.cos(out.hd) * -s;
    }
    return out;
  }
  // the ground under a point of the lane: where the ground is drawn (the square, loaded tiles beyond it) the ground one sees (KERN);
  // beyond the square before its tiles are there the road's profile (welt/fahrt.js carves the tiles to it)
  function zAt(R, s, x, y, zPrev) {
    if (!insideRB(x, y) && !(WELT.covers && WELT.covers(x, y))) {
      const i = Math.max(0, Math.min(R.n - 1, Math.round(s)));
      const zp = R.Zp[i];
      if (Number.isFinite(zp)) return zp;
    }
    const z = KERN.ground(x, y, zPrev);
    return Number.isFinite(z) ? z : (zPrev ?? 0);
  }
  const _f = {},
    _r = {};
  // the bus at its minute: on its lane with the front door at the stop, both axles on the lane, pitched with the road
  function place(I, dt) {
    BUSPLAN.at(I.Rn, I.tau, _o);
    const R = I.Rn.R,
      prevS = I.lastS;
    I.st = _o.st;
    I.k = _o.k;
    I.v = _o.v;
    // the front of the bus 1.0 m past the stop point: the front door (0.35–1.55 m behind the front) at the sign
    const sF = _o.s + 1.0,
      sA = sF - (D.L / 2 - D.AF),
      sB = sA - (D.AF - D.AR);
    lanePt(R, sA, _f);
    lanePt(R, sB, _r);
    const hd = Math.atan2(_f.x - _r.x, _f.y - _r.y),
      cx = _r.x + Math.sin(hd) * -D.AR,
      cy = _r.y + Math.cos(hd) * -D.AR,
      zF = zAt(R, sA, _f.x, _f.y, I.zF),
      zR = zAt(R, sB, _r.x, _r.y, I.zR);
    I.zF = zF;
    I.zR = zR;
    const pitch = Math.atan2(zF - zR, D.AF - D.AR),
      z = zR + (zF - zR) * (-D.AR / (D.AF - D.AR));
    if (prevS !== null) I.dist += Math.abs(_o.s - prevS);
    I.lastS = _o.s;
    const moved = Math.abs(cx - I.x) + Math.abs(cy - I.y) + Math.abs(z - I.z) > 0.002;
    I.x = cx;
    I.y = cy;
    I.z = z;
    I.hd = hd;
    const g = I.B.g;
    g.position.copy(V(cx, cy, z));
    g.rotation.set(pitch, -hd, 0, 'YXZ');
    I.B.wF.rotation.x = I.B.wR.rotation.x = -I.dist / D.RW;
    // doors: open while it stands at a stop (a second after arriving, closed 2 s before leaving), held while one gets on or off
    let open = 0;
    if ((I.st === 'halt' || I.st === 'ende') && I.Rn.P.st[I.k].s >= 0) {
      const A = I.Rn.A[I.k],
        Dd = I.Rn.D[I.k],
        since = (I.tau - A) * 60,
        left = (Dd - I.tau) * 60;
      open = Math.min((since - 0.8) / 1.1, I.st === 'ende' ? 1 : (left - 1.6) / 1.1);
      if (I.hold > 0) open = 1;
    }
    const o0 = I.B.open;
    I.B.setOpen(open);
    if ((o0 < 0.05 && I.B.open >= 0.05) || (o0 > 0.95 && I.B.open <= 0.95)) doorSound(I, I.B.open > o0);
    if (moved || o0 !== I.B.open) markDirty();
    return I;
  }
  // trips at their end (not drawn again while the timetable still counts them on the road)
  const GONE = new Set();
  function gone(k) {
    GONE.add(k);
    if (GONE.size > 60) GONE.delete(GONE.values().next().value);
  }
  // which trips to draw: those whose timetable puts them near the observer (nearest first), as many as there are models
  function choose(ox, oy) {
    if (CLOCK.warp) return;
    const act = BUSPLAN.active(T(), e0(), 3, 1);
    const cand = [];
    for (const a of act) {
      const key = a.trip.i + ':' + a.di;
      if (GONE.has(key) || S.inst.some(I => I.key === key)) continue;
      const P_ = BUSPLAN.S.pats[a.trip.pat],
        T0 = a.di * 1440 + a.trip.t0;
      // before its first stop in the world: only a trip that starts there stands ready (3 min before)
      if (T() < T0 + a.trip.a[0] - BUSPLAN.BUS.dwell - 0.05 && a.trip.vor) continue;
      const s = BUSPLAN.roughS(a.trip, a.di, T());
      BUSPLAN.centreAt(P_, s, _c);
      const d = Math.hypot(_c.x - ox, _c.y - oy);
      if (d < DRAW) cand.push([d, a]);
    }
    cand.sort((p, q) => p[0] - q[0]);
    for (const [, a] of cand) {
      if (S.inst.length >= MAXI) break;
      spawn(a);
    }
  }
  // per frame: the minute of each bus, its place, what it does
  function step(dt) {
    const [ox, oy] = where();
    const clk = T(),
      dClk = S.lastClk === undefined ? 0 : clk - S.lastClk;
    S.lastClk = clk;
    for (const I of S.inst.slice()) {
      if (I.hold > 0 && !(S.ride && S.ride.I === I && S.ride.busy)) I.hold -= dt;
      if (S.ride && S.ride.I === I) {
        // the bus one rides: exactly the clock (it runs in real time meanwhile); while the picture fades it waits at the stop
        if (S.ride.busy) S.ride.lag = clk - I.tau;
        else I.tau = clk - S.ride.lag;
      } else if (dClk > 2 || CLOCK.warp) {
        // the clock jumped (set, a scene) or races (waiting, sleeping – a time-lapse): the bus to its minute
        I.tau = clk;
      } else if (!(I.hold > 0 && I.st === 'halt')) {
        // a bus elsewhere: real time (it stands while the clock stands), never ahead of the clock; held while one gets on or off
        I.tau = Math.min(clk, I.tau + Math.max(0, Math.min(dt / 60, dClk + 1e-9)));
      }
      place(I, dt);
      const d = Math.hypot(I.x - ox, I.y - oy);
      I.endT = I.st === 'ende' ? I.endT + dt : 0;
      const edge = I.st === 'ende' && I.Rn.P.st[I.k].s < 0,
        over = edge || (I.st === 'ende' && (I.endT > 40 || d > 200));
      if (!(S.ride && S.ride.I === I) && (over || d > DRAW + 160)) {
        // a trip at its end is not drawn again
        if (over) gone(I.key);
        drop(I);
      }
    }
  }
  // the buses are solid for the walker and for vehicles (vehicles/vehicle.js VEH.extra: an oriented box each)
  for (let slot = 0; slot < MAXI; slot++)
    VEH.extra.push({
      bus: true,
      box: () => {
        const I = S.inst[slot];
        if (!I || !Number.isFinite(I.x) || !Number.isFinite(I.hd)) return null;
        const fx = Math.sin(I.hd),
          fy = Math.cos(I.hd);
        return { c: [I.x, I.y], ax: [fy, -fx], ay: [fx, fy], ex: D.W / 2, ey: D.L / 2, z0: I.z, z1: I.z + D.H };
      },
    });
  // ---------------- boarding ----------------
  // where one gets in and out: beside the front door, at the kerb (right side)
  function doorPt(I, out = 1.0) {
    const fx = Math.sin(I.hd),
      fy = Math.cos(I.hd),
      rx = Math.cos(I.hd),
      ry = -Math.sin(I.hd),
      y = (D.DOOR_F[0] + D.DOOR_F[1]) / 2;
    return [I.x + fx * y + rx * (D.W / 2 + out), I.y + fy * y + ry * (D.W / 2 + out)];
  }
  function acts() {
    for (const I of S.inst) {
      const id = 'bus:ein:' + I.key,
        can = !S.ride && !Z.on && I.st === 'halt' && I.B.open > 0.6 && I.k < I.Rn.P.last && I.Rn.P.st[I.k].s >= 0;
      if (can && !I.act) {
        I.act = true;
        KERN.act({
          id,
          r: 3.0,
          prio: 5,
          pos: () => {
            const p = doorPt(I, 0.6);
            return [p[0], p[1], I.z + 0.2];
          },
          label: () =>
            !S.ride && I.st === 'halt' && I.B.open > 0.6
              ? 'Einsteigen: ' + I.trip.line + ' ' + (I.trip.head || I.trip.nach)
              : null,
          run: () => enter(I),
        });
      } else if (!can && I.act) {
        I.act = false;
        KERN.unact(id);
      }
    }
  }
  // the seat: right, the first row behind the middle door, facing forward
  const SEAT = [0.98, -1.25];
  function eye(I) {
    const fx = Math.sin(I.hd),
      fy = Math.cos(I.hd),
      rx = Math.cos(I.hd),
      ry = -Math.sin(I.hd);
    return { x: I.x + rx * SEAT[0] + fx * SEAT[1], y: I.y + ry * SEAT[0] + fy * SEAT[1], z: I.z + D.FL + 1.2 };
  }
  const wrap = a => {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  };
  function enter(I) {
    if (S.ride || PLAY.seated() || VEH.cur || I.st !== 'halt') return false;
    closeBoard();
    S.ride = { I, from: I.k, want: null, lag: CLOCK.t - I.tau, lastHd: I.hd, k: I.k };
    I.hold = 2.5;
    PLAY.sit({
      kind: 'ride',
      fp: true,
      get lock() {
        return !S.ride || S.ride.I.st === 'fahrt';
      },
      lockMsg: 'Während der Fahrt bleibst du sitzen – „Halt“ im Bus-Fenster.',
      follow: () => {
        const R_ = S.ride;
        if (!R_) return eye(I);
        const d = wrap(I.hd - R_.lastHd);
        P.yaw += (d * 180) / Math.PI;
        R_.lastHd = I.hd;
        return eye(I);
      },
      yaw: (I.hd * 180) / Math.PI,
      pitch: -4,
      get back() {
        const p = doorPt(I, 1.0);
        return [p[0], p[1], I.z];
      },
      set back(x) {},
      onLeave: () => leaveRide(false),
    });
    CLOCK.focus('bus');
    S.stats.rides++;
    save();
    panel();
    KERN.emit('bus:ein', { line: I.trip.line, ziel: I.trip.head, halt: stName(I.Rn.P.st[I.k].s) });
    PLAY.think('Du steigst in den ' + I.trip.line + 'er nach ' + (I.trip.head || I.trip.nach) + '.', 2600);
    return true;
  }
  // out: at a stop (stood up or arrived where one wanted)
  function leaveRide(auto) {
    const R_ = S.ride;
    if (!R_) return;
    S.ride = null;
    const I = R_.I;
    I.hold = 2.5;
    if (auto) PLAY.stand(true);
    CLOCK.unfocus('bus');
    hidePanel();
    const halt = stName(I.Rn.P.st[I.k].s);
    KERN.emit('bus:aus', { line: I.trip.line, halt, x: P.x, y: P.y });
    PLAY.think(halt + '.', 2400);
    save();
  }
  // during a ride: arrived at the wanted stop → out; at the end of its way in the world → out
  function rideTick(dt) {
    const R_ = S.ride;
    if (!R_) return;
    const I = R_.I;
    if (I.st === 'halt' || I.st === 'ende') {
      if (R_.k !== I.k) {
        R_.k = I.k;
        save();
        panel();
      }
      const last = I.k >= I.Rn.P.last;
      if ((R_.want !== null && I.k >= R_.want && I.k !== R_.from) || last) {
        if (I.B.open > 0.9) {
          if (last && I.trip.weiter)
            PLAY.think('Weiter fährt der Bus über die Karte hinaus – nach ' + I.trip.nach + '.', 3600);
          leaveRide(true);
        } else I.hold = Math.max(I.hold, 0.5);
      }
    } else if (I.st === 'fahrt' && R_.shownK !== I.k) {
      R_.shownK = I.k;
      panel();
      // off from a stop: the display and the gong – „Nächster Halt: …“
      let nx = -1;
      for (let k = I.k + 1; k <= I.Rn.P.last; k++)
        if (I.Rn.P.st[k].s >= 0) {
          nx = k;
          break;
        }
      if (nx >= 0) {
        gong();
        PLAY.think('Nächster Halt: ' + stName(I.Rn.P.st[nx].s) + (R_.want === nx ? ' – Wagen hält' : ''), 3600);
      }
    }
  }
  // ---------------- the ground ahead of the bus one rides: the tiles beyond the square (welt/welt.js) load around a point ahead ----------------
  const _ah = {};
  FAHRT.focusBus = () => {
    const R_ = S.ride;
    if (!R_ || !(R_.I.v > 1.5)) return null;
    BUSPLAN.at(R_.I.Rn, R_.I.tau, _o);
    lanePt(R_.I.Rn.R, _o.s + Math.min(130, 20 + R_.I.v * 5), _ah);
    return [_ah.x, _ah.y];
  };
  let weltNeed = false;
  function groundAhead() {
    let want = false;
    const R_ = S.ride;
    if (R_) {
      const I = R_.I;
      BUSPLAN.at(I.Rn, I.tau, _o);
      lanePt(I.Rn.R, _o.s + 350, _ah);
      want = !insideRB(I.x, I.y) || !insideRB(_ah.x, _ah.y);
    }
    if (want !== weltNeed) {
      weltNeed = want;
      WELT.need('bus', want);
    }
  }
  // ---------------- „Fahrt abkürzen“: fade, the clock jumps to the arrival, the ground there loads ----------------
  let fadeEl = null;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  async function shorten() {
    const R_ = S.ride;
    if (!R_ || R_.busy) return;
    const I = R_.I,
      k = R_.want !== null ? R_.want : Math.min(I.Rn.P.last, I.k + 1);
    R_.want = k;
    R_.busy = true;
    if (!fadeEl) {
      fadeEl = document.createElement('div');
      fadeEl.id = 'busfade';
      stage.appendChild(fadeEl);
    }
    fadeEl.classList.add('on');
    await wait(450);
    const tau = I.Rn.A[k] + 0.02,
      dT = tau - I.tau;
    // arrived: the doors are open when the picture comes back (one gets off at once)
    I.hold = 4;
    if (dT > 0) {
      CLOCK.t = CLOCK.t + dT;
      I.tau = tau;
      S.lastClk = CLOCK.t;
    }
    place(I, 0);
    // the ground at the arrival: the tiles around the rider (welt/welt.js), at most 15 s
    const t0 = performance.now();
    await KERN.until(() => {
      if (performance.now() - t0 > 15000) return true;
      if (insideRB(I.x, I.y)) return true;
      const st = WELT.state ? WELT.state() : null;
      return !!st && st.loading === 0 && (!FAHRT.on || FAHRT.ready);
    }, 20).catch(() => {});
    place(I, 0);
    fadeEl.classList.remove('on');
    R_.busy = false;
    panel();
  }
  // ---------------- the ride panel ----------------
  let pan = null;
  function panel() {
    const R_ = S.ride;
    if (!R_) return hidePanel();
    if (!pan) {
      pan = document.createElement('div');
      pan.id = 'buspanel';
      stage.appendChild(pan);
      pan.addEventListener('click', ev => {
        const b = ev.target.closest('button');
        if (!b || !S.ride) return;
        const R2 = S.ride;
        if (b.dataset.halt !== undefined) {
          R2.want = +b.dataset.halt;
          bell();
          panel();
        } else if (b.dataset.k === 'kurz') shorten();
        else if (b.dataset.k === 'aus') {
          if (R2.I.st === 'halt' && R2.I.B.open > 0.5) PLAY.stand(true);
          else PLAY.think('Erst an der nächsten Haltestelle.');
        }
        b.blur();
      });
    }
    const I = R_.I,
      Rn = I.Rn,
      tr = I.trip,
      lag = R_.lag,
      next = I.st === 'halt' ? I.k : I.k + 1,
      rows = [];
    // the next stop one can get off at (not the one it stands at now)
    let nextReal = null;
    for (let k = I.k + 1; k <= Rn.P.last; k++)
      if (Rn.P.st[k].s >= 0) {
        nextReal = k;
        break;
      }
    for (let k = Math.max(next, R_.from + 1); k <= Rn.P.last; k++) {
      const s = Rn.P.st[k].s,
        want = R_.want === k;
      if (s < 0) continue;
      rows.push(
        `<li class="${want ? 'want' : ''}${k === next ? ' next' : ''}"><button type="button" data-halt="${k}"><span class="t">${BUSPLAN.hm(Rn.A[k] + lag)}</span><span class="n">${BUSPLAN.S.stations[s].n}</span>${want ? '<em>Halt</em>' : ''}</button></li>`
      );
    }
    const op = (BUSPLAN.S.lines[tr.line] || {}).op || '';
    const halts = R_.want !== null && R_.want === nextReal && I.st === 'fahrt';
    pan.innerHTML = `<header><b class="ln">${tr.line}</b><div><h3>${tr.head || tr.nach}</h3><span>${op}${tr.weiter ? ' · fährt weiter nach ' + tr.nach : ''}</span></div>${halts ? '<b class="halt">Wagen hält</b>' : ''}</header>
      <ol>${rows.join('')}</ol>
      <div class="row">${I.st === 'halt' && I.k !== R_.from ? '<button type="button" data-k="aus">Aussteigen</button>' : nextReal !== null && R_.want !== nextReal ? '<button type="button" data-halt="' + nextReal + '">Aussteigen an der nächsten Haltestelle</button>' : ''}<button type="button" data-k="kurz">Fahrt abkürzen</button></div>
      <p class="mnote">Haltestelle antippen: dort aussteigen. Fahrplan: gtfs.de (DELFI e.V.)</p>`;
    pan.hidden = false;
  }
  function hidePanel() {
    if (pan) pan.hidden = true;
  }
  // ---------------- the board at a stop ----------------
  let brd = null,
    brdStop = null;
  function board(e) {
    if (!brd) {
      brd = document.createElement('div');
      brd.id = 'busboard';
      stage.appendChild(brd);
      brd.addEventListener('click', ev => {
        const b = ev.target.closest('button');
        if (!b) return;
        if (b.dataset.k === 'x') closeBoard();
        else if (b.dataset.k === 'warten') waitFor(brdStop);
        b.blur();
      });
    }
    brdStop = e;
    renderBoard();
    brd.hidden = false;
  }
  function closeBoard() {
    if (brd) brd.hidden = true;
    brdStop = null;
  }
  function renderBoard() {
    const e = brdStop;
    if (!e || !brd) return;
    const now = T(),
      dep = BUSPLAN.departures(e.s, now, e0(), 40, 0.5)
        .filter(d => sameWay(e, d))
        .slice(0, 9),
      day = BUSPLAN.day(e0() + Math.floor(now / 1440));
    const here = S.inst.find(I => I.st === 'halt' && I.Rn.P.st[I.k] && I.Rn.P.st[I.k].s === e.s);
    const rows = dep.map(d => {
      const tr = d.trip,
        m = Math.round(d.t - now),
        isHere = here && here.trip === tr,
        // a bus of this trip on its way here, near: „fährt ein“
        coming = S.inst.some(
          I =>
            I.trip === tr &&
            I.st === 'fahrt' &&
            I.Rn.P.st[I.k + 1] &&
            I.Rn.P.st[I.k + 1].s === e.s &&
            Math.hypot(I.x - e.x, I.y - e.y) < 400
        );
      return `<tr${isHere ? ' class="here"' : ''}><td class="t">${BUSPLAN.hm(d.t)}</td><td class="l">${tr.line}</td><td class="z">${tr.head || tr.nach}</td><td class="m">${isHere ? 'steht da' : coming ? 'fährt ein' : m <= 0 ? 'jetzt' : m < 60 ? 'in ' + m + ' min' : ''}</td></tr>`;
    });
    brd.innerHTML = `<header><span class="h">H</span><div><h3>${stName(e.s)}</h3><span>${day.kind}</span></div><button type="button" class="x" data-k="x" aria-label="Schließen">×</button></header>
      <table>${rows.join('') || '<tr><td>Heute fährt hier nichts mehr.</td></tr>'}</table>
      <div class="row">${dep.length && !here ? '<button type="button" data-k="warten">Auf den Bus warten</button>' : ''}</div>
      <p class="mnote">Echter Fahrplan der Linien im Landkreis (gtfs.de, Daten DELFI e.V., Stand November 2026).</p>`;
  }
  // „Auf den Bus warten“: the clock jumps to a minute before the next bus here (like sleeping)
  function waitFor(e) {
    if (!e) return;
    const now = T(),
      c = BUSPLAN.calls(e.s, now, now + 24 * 60, e0()).find(q => q.t > now + 1.2 && sameWay(e, q));
    if (!c) return PLAY.think('Heute kommt hier kein Bus mehr.');
    const m = c.t - now - 1.0;
    S.stats.waits++;
    KERN.emit('bus:warten', { halt: stName(e.s), min: Math.round(m) });
    CLOCK.wait(m, 'Warten auf den Bus', () => renderBoard());
  }
  // ---------------- the clock in real time: waiting at a stop when a bus is due, riding ----------------
  function focusTick(ox, oy) {
    let want = !!S.ride;
    if (!want && P.mode === 'walk' && !PLAY.seated()) {
      const e = stopAt(P.x, P.y, 45);
      if (e) {
        const now = T();
        want =
          BUSPLAN.calls(e.s, now - 0.3, now + 3, e0()).some(q => sameWay(e, q)) ||
          S.inst.some(
            I =>
              (I.st === 'halt' || I.st === 'fahrt') &&
              I.Rn.P.st[Math.min(I.Rn.n - 1, I.k + (I.st === 'fahrt' ? 1 : 0))].s === e.s &&
              Math.hypot(I.x - e.x, I.y - e.y) < 500
          );
      }
      S.near = e ? e.name : null;
      // the first time at a stop: what one can do here (once per browser)
      if (e && !S.hinted && Math.hypot(P.x - e.x, P.y - e.y) < 14 && !Z.on) {
        S.hinted = true;
        if (SAVE.once('pav-bus-hint'))
          PLAY.think(
            'Neu: Busse nach dem echten Fahrplan – am Schild „Fahrplan“, „Auf den Bus warten“, einsteigen und mitfahren.',
            6500
          );
      }
    }
    if (want !== S.focus) {
      S.focus = want;
      if (want) CLOCK.focus('bus');
      else CLOCK.unfocus('bus');
    }
  }
  // ---------------- sounds (synthesised): the diesel of the nearest bus, the doors, the stop bell ----------------
  const raw = () => {
    const r = audio.raw && audio.raw();
    return r && r.ctx && r.ctx.state === 'running' ? r : null;
  };
  let eng = null;
  function engineTick(I) {
    const r = raw();
    if (!I || !r) {
      if (eng) {
        try {
          eng.g.gain.setTargetAtTime(0, eng.ctx.currentTime, 0.3);
          const e = eng;
          setTimeout(() => e.os.forEach(o => o.stop()), 1200);
        } catch (e) {}
        eng = null;
      }
      return;
    }
    if (!eng) {
      const os = [r.ctx.createOscillator(), r.ctx.createOscillator()],
        lp = r.ctx.createBiquadFilter(),
        g = r.ctx.createGain();
      os[0].type = 'sawtooth';
      os[1].type = 'square';
      os[0].frequency.value = 42;
      os[1].frequency.value = 21;
      lp.type = 'lowpass';
      lp.frequency.value = 240;
      g.gain.value = 0;
      os.forEach(o => (o.connect(lp), o.start()));
      lp.connect(g);
      g.connect(r.sfx);
      eng = { os, lp, g, ctx: r.ctx };
    }
    const inside = S.ride && S.ride.I === I,
      sp = inside ? { vol: 0.55, lp: 900 } : audio.spatial ? audio.spatial(I.x, I.y, 14) : { vol: 0.3, lp: 1200 },
      k = 0.62 + Math.min(1, I.v / 14) * 0.7;
    const t = eng.ctx.currentTime;
    eng.g.gain.setTargetAtTime(0.2 * sp.vol, t, 0.2);
    eng.os[0].frequency.setTargetAtTime(42 * k, t, 0.35);
    eng.os[1].frequency.setTargetAtTime(21 * k, t, 0.35);
    eng.lp.frequency.setTargetAtTime(Math.min(sp.lp, 180 + 150 * k), t, 0.25);
  }
  function hiss(x, y, len, f) {
    const r = raw();
    if (!r) return;
    const inside = S.ride && Math.hypot(S.ride.I.x - x, S.ride.I.y - y) < 8;
    const sp = inside ? { vol: 0.6, lp: 6000 } : audio.spatial ? audio.spatial(x, y, 10) : { vol: 0.3, lp: 4000 };
    if (sp.vol < 0.01) return;
    const n = Math.floor(r.ctx.sampleRate * len),
      buf = r.ctx.createBuffer(1, n, r.ctx.sampleRate),
      d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 1.5);
    const src = r.ctx.createBufferSource(),
      bp = r.ctx.createBiquadFilter(),
      g = r.ctx.createGain();
    src.buffer = buf;
    bp.type = 'bandpass';
    bp.frequency.value = Math.min(f, sp.lp);
    bp.Q.value = 0.8;
    g.gain.value = 0.35 * sp.vol;
    src.connect(bp);
    bp.connect(g);
    g.connect(r.sfx);
    src.start();
  }
  function doorSound(I, opening) {
    hiss(I.x, I.y, opening ? 0.55 : 0.4, opening ? 2600 : 1800);
  }
  // the announcement gong (two soft tones, down)
  function gong() {
    const r = raw();
    if (!r) return;
    const t = r.ctx.currentTime;
    for (const [f, dt] of [
      [659, 0],
      [523, 0.45],
    ]) {
      const o = r.ctx.createOscillator(),
        g = r.ctx.createGain();
      o.type = 'triangle';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.12, t + dt + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 1.1);
      o.connect(g);
      g.connect(r.sfx);
      o.start(t + dt);
      o.stop(t + dt + 1.2);
    }
  }
  function bell() {
    const r = raw();
    if (!r) return;
    const t = r.ctx.currentTime;
    for (const [f, dt] of [
      [988, 0],
      [784, 0.32],
    ]) {
      const o = r.ctx.createOscillator(),
        g = r.ctx.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t + dt);
      g.gain.exponentialRampToValueAtTime(0.18, t + dt + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.6);
      o.connect(g);
      g.connect(r.sfx);
      o.start(t + dt);
      o.stop(t + dt + 0.65);
    }
  }
  // ---------------- night: lamps, one borrowed light ahead of the nearest bus ----------------
  const dark = () =>
    window.DN && DN.active
      ? !!(DN.state && DN.state.sunEl < 4)
      : window.MODE_NOW === 'dusk' || window.MODE_NOW === 'night';
  let night = null;
  KERN.lights.borrow({
    id: 'bus:licht',
    n: 1,
    prio: 3,
    want: () => !Z.on && dark() && !!S.nearest && S.nearest.d < 160,
    on: ls => {
      const l = ls[0];
      l.color.setHex(0xfff1d6);
      l.distance = 30;
      l.decay = 1.4;
      l.intensity = 0;
    },
    tick: ls => {
      const l = ls[0],
        I = S.nearest && S.nearest.I;
      if (!I) return;
      const fx = Math.sin(I.hd),
        fy = Math.cos(I.hd);
      l.position.copy(V(I.x + fx * 13, I.y + fy * 13, I.z + 1.3));
      l.intensity = 16;
    },
  });
  // ---------------- saving: during a ride, the stop one boarded at or last stood at ----------------
  function save() {
    const R_ = S.ride;
    let v = { v: 1, ride: null };
    if (R_) {
      const I = R_.I,
        st = I.Rn.P.st[Math.max(I.Rn.P.first, Math.min(I.Rn.P.last, R_.k))],
        e = STOPS.find(q => q.s === st.s) || BUSPLAN.S.stations[st.s];
      v.ride = { x: +e.x.toFixed(1), y: +e.y.toFixed(1), name: stName(st.s), line: I.trip.line };
    }
    SAVE.set(LSK, v);
  }
  function restore() {
    const v = SAVE.get(LSK);
    if (!v || !v.ride) return;
    const r = v.ride;
    SAVE.set(LSK, { v: 1, ride: null });
    // the ground there (tiles beyond the square) may come later: stand there, the walk physics keeps one on it
    P.x = r.x;
    P.y = r.y;
    const z = KERN.ground(r.x, r.y);
    P.feet = floorAt(r.x, r.y, (Number.isFinite(z) ? z : P.feet) + 0.3);
    P.vz = 0;
    P.air = false;
    PLAY.think('Haltestelle ' + (r.name || '') + ' – hier warst du mit dem Bus.', 4200);
    markDirty(true);
  }
  // ---------------- the scenario: at the stop in Ratscher on a school day morning ----------------
  KERN.scenario('bus', {
    label: 'Mit dem Bus nach Schleusingen',
    order: 85,
    ask: 'Stellt die Uhr auf den nächsten Schultag, 7:38, an die Haltestelle Schleusebrücke in Ratscher.',
    run: async () => {
      await KERN.until(() => S.state === 'ready', 60);
      const now = T();
      let d = Math.floor(now / 1440) + 1;
      for (let i = 0; i < 14; i++, d++) {
        const q = BUSPLAN.day(e0() + d);
        if (q.wd < 5 && !q.hol && !q.ferien) break;
      }
      CLOCK.t = d * 1440 + 7 * 60 + 38;
      S.lastClk = CLOCK.t;
      // the kerb of the direction to Schleusingen (north-west), looking along the road towards the bus that comes
      const zh = BUSPLAN.S.stations.find(q => q.n === 'Schleusingen, Zentralhaltestelle') || { x: -1338, y: 1237 };
      let e = null,
        best = -2;
      for (const q of STOPS) {
        if (q.name !== 'Ratscher, Schleusebrücke') continue;
        const c = Math.cos(q.hd - Math.atan2(zh.x - q.x, zh.y - q.y));
        if (c > best) {
          best = c;
          e = q;
        }
      }
      if (!e) return;
      const px = e.x + Math.cos(e.hd) * 1.4,
        py = e.y - Math.sin(e.hd) * 1.4;
      KERN.spot('bus', {
        mode: 'walk',
        pos: [px, py],
        z: KERN.ground(px, py),
        yaw: (((e.hd + Math.PI) * 180) / Math.PI) % 360,
        pitch: -2,
        label: 'Bushaltestelle Ratscher, Schleusebrücke',
      });
      go('bus');
    },
  });
  // ---------------- the loop ----------------
  let acc = 0,
    started = 0;
  function tick(dt) {
    if (!S.on) return;
    if (S.state === 'idle') {
      // load after the start, not while the loading screen is up
      if (window.PAV_LOADED && (started += dt) > 2) {
        load();
      }
      return;
    }
    if (S.state !== 'ready') return;
    if (!S.restored) {
      S.restored = true;
      try {
        restore();
      } catch (e) {}
    }
    if (Z.on) {
      for (const I of S.inst.slice()) if (!(S.ride && S.ride.I === I)) drop(I);
      if (S.focus) {
        S.focus = false;
        CLOCK.unfocus('bus');
      }
      engineTick(null);
      return;
    }
    const [ox, oy] = where();
    acc += dt;
    if (acc > 0.5) {
      acc = 0;
      furniture(ox, oy);
      if (S.auto) choose(ox, oy);
      focusTick(ox, oy);
      groundAhead();
      if (brdStop && brd && !brd.hidden) {
        if (Math.hypot(P.x - brdStop.x, P.y - brdStop.y) > 12) closeBoard();
        else renderBoard();
      }
      BUSMOD.lamps(dark());
    }
    step(Math.min(dt, 0.25));
    acts();
    rideTick(dt);
    // the nearest bus: its engine, the borrowed light
    let best = null;
    for (const I of S.inst) {
      const d = Math.hypot(I.x - ox, I.y - oy);
      if (!best || d < best.d) best = { I, d };
    }
    S.nearest = best;
    engineTick(best && (best.d < 140 || (S.ride && S.ride.I === best.I)) && best.I.st !== 'ende' ? best.I : null);
  }
  KERN.tick(tick, 'bus');
  return {
    S,
    STOPS: () => STOPS,
    plan: BUSPLAN,
    // for the traffic (verkehr/verkehr_auto.js, verkehr/verkehr.js): each drawn bus as four circles along it
    obstacles: () => {
      OBS.length = 0;
      for (const I of S.inst) {
        if (!I.B.g.visible) continue;
        const fx = Math.sin(I.hd),
          fy = Math.cos(I.hd);
        for (const t of [-4.5, -1.5, 1.5, 4.5])
          OBS.push({ x: I.x + fx * t, y: I.y + fy * t, r: 1.3, kind: 'veh', moving: I.v > 0.5, bus: true });
      }
      return OBS;
    },
    // the bus standing nearest to the player with open doors (tests: what „Einsteigen“ does)
    einsteigen: () => {
      const I = S.inst
        .filter(q => q.st === 'halt' && q.B.open > 0.6)
        .sort((a, b) => Math.hypot(a.x - P.x, a.y - P.y) - Math.hypot(b.x - P.x, b.y - P.y))[0];
      return I ? enter(I) : false;
    },
    want: k => {
      if (S.ride) {
        S.ride.want = k;
        panel();
      }
    },
    load,
    spawn: (tripIdx, di, tau) => {
      const tr = BUSPLAN.S.trips[tripIdx];
      return tr ? spawn({ trip: tr, di }, tau) : null;
    },
    drop,
    enter,
    leave: () => leaveRide(true),
    shorten,
    board,
    closeBoard,
    waitFor,
    stopAt,
    // tests and the bug report: numbers only
    state: () => ({
      state: S.state,
      err: S.err,
      stations: BUSPLAN.S.stations.length,
      trips: BUSPLAN.S.trips.length,
      stops: STOPS.length,
      furn: S.furn.size,
      inst: S.inst.map(I => ({
        key: I.key,
        line: I.trip.line,
        head: I.trip.head,
        st: I.st,
        k: I.k,
        x: +I.x.toFixed(1),
        y: +I.y.toFixed(1),
        z: +I.z.toFixed(2),
        v: +I.v.toFixed(2),
        open: +I.B.open.toFixed(2),
        tau: +I.tau.toFixed(3),
        halt: stName(I.Rn.P.st[Math.max(0, I.k)].s),
      })),
      ride: S.ride
        ? {
            line: S.ride.I.trip.line,
            k: S.ride.I.k,
            want: S.ride.want,
            from: S.ride.from,
            st: S.ride.I.st,
            lag: +S.ride.lag.toFixed(3),
          }
        : null,
      focus: S.focus,
      near: S.near,
      stats: Object.assign({}, S.stats),
    }),
  };
})();
window.BUS = BUS;
