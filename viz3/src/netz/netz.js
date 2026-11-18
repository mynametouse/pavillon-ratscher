// ===================== feat/mehrspieler: playing together over the internet – the room, the others in the world, the host's clock (NETZ) =====================
// Stage 1 of docs/plans/plan_mehrspieler.md („Zu zweit im Garten“), in the free simulation: one browser opens a room (a code like KLOSS7
// and a link ?zusammen=KLOSS7), the others join; everybody sees everybody as their avatar (netz/netz_avatar.js) with a name in their own
// colour, walking, running, ducking, sitting, in a vehicle the vehicle itself. Who rules what: everybody their own figure and the vehicle
// they drive (no lag), the host the clock and date (the guest's own come back on leaving). A guest's own saved world stays as it is:
// gardens, the pavilion, the trees are everybody's own in this stage. Pointing (G, the middle mouse button) sets a ring in one's colour
// where one looks, with a word for what is there (Hier! / Hier rein! / Das Auto! / Da: Sarah!); gestures (wave, nod …); jump to a
// player. The zombie night keeps its own ZNETZ; this room closes when it or the Grenzland starts.
//   NETZ.open('host' | 'gast', code?, lokal?) · close() · on · role · code · peers {trystero id → peer} · list() → [{ pid, name, … }]
//   NETZ.me() → my state · stateOf(pid) · jumpTo(pid) · ping(ndc?) · geste(art) · link() · tell(name, data) (→ 'netz:<name>' over there)
//   NETZ.spiel(data, toPid?) · NETZ.labelRule = p => bool (games hide names) · NETZ.figRule = p => bool · NETZ.watch(fn) (UI refresh)
// Events: 'netz:open' { role, code }, 'netz:close', 'netz:peer' { k: 'neu' | 'weg', pid, name }, 'netz:spiel' { from, d }, 'netz:ping'.
// Saved: 'pav-netz-raum' { v: 1, code, role, t, uhr } while in a room – a reload within 15 minutes goes back into it.
// ?zusammen=CODE joins after loading (&lokal=1: through a BroadcastChannel, two pages of one browser – the tests).
import * as THREE from 'three';
import { cam, QS, scene, stage } from '../core/head.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { SAVE } from '../core/save.js';
import { P, collide, floorAt } from '../game/walkable.js';
import { go } from '../game/player.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { VEH } from '../vehicles/vehicle.js';
import { HAEUSER } from '../haeuser/haeuser.js';
import { NETZLOGIK as L } from './netz_logik.js';
import { NETZRAUM } from './netz_raum.js';
import { NAVATAR } from './netz_avatar.js';
export const NETZ = (() => {
  const APP = 'pavillon-ratscher-netz-1';
  const S = {
    on: false,
    role: null,
    code: '',
    T: null,
    lokal: false,
    peers: {},
    status: '',
    hostPid: null,
    sendT: 0,
    uhrT: 0,
    saveT: 0,
    alone: 0,
    reT: 0,
    had: false,
    uhr: null, // the guest's own clock before joining: { t, rate, e0 }
    zombie: false,
    gl: false,
    sent: 0,
    got: 0,
    pings: 0,
    labelRule: null,
    nach: null, // a jump into his house: beside him once its floor stands ({ pid, t })
    figRule: null,
    note: '',
    err: null,
  };
  const hyp = Math.hypot;
  const now = () => performance.now();
  const RAUM = SAVE.key('pav-netz-raum', {
    owner: 'Zusammen spielen: der offene Raum (für Neu laden)',
    kind: 'json',
    def: null,
    check: v =>
      v === null ||
      (!!v &&
        typeof v === 'object' &&
        v.v === 1 &&
        typeof v.code === 'string' &&
        /^[A-Z0-9]{4,8}$/.test(v.code) &&
        (v.role === 'host' || v.role === 'gast') &&
        Number.isFinite(v.t)),
  });
  // ---- who watches the room (the panel) ----
  const watchers = new Set();
  const changed = () => {
    for (const f of watchers)
      try {
        f();
      } catch (e) {
        console.warn('netz watch', e);
      }
  };
  function status(t) {
    S.status = t || '';
    changed();
  }
  const peerList = () => Object.values(S.peers).filter(p => p.pid);
  const byPid = pid => peerList().find(p => p.pid === pid) || null;
  const colorOf = av => L.FARBEN[L.avClean(av).c].css;
  // ---- what I send: 10 times a second ----
  function me() {
    const v = VEH && VEH.cur,
      seat = PLAY.seat;
    let sit = null;
    if (seat && !v) {
      const e = P.cam || { x: seat.x, y: seat.y, z: seat.eye };
      if (e && Number.isFinite(e.x) && Number.isFinite(e.y) && Number.isFinite(e.z))
        sit = { k: seat.kind === 'lie' ? 'lie' : 'sit', x: +e.x.toFixed(2), y: +e.y.toFixed(2), z: +e.z.toFixed(2) };
    }
    const yaw = seat && !v ? (seat.kind === 'ride' ? P.yaw : (seat.yaw ?? P.yaw)) : (P.body ?? P.yaw);
    return {
      x: +P.x.toFixed(2),
      y: +P.y.toFixed(2),
      z: +P.feet.toFixed(2),
      yaw: Math.round(yaw || 0),
      sp: +(P.speed || 0).toFixed(2),
      stn: P.stance || 'stand',
      air: !!P.air,
      jet: !!(window.JET && window.JET.flying),
      sit,
      car: v
        ? { id: v.id, x: +v.st.x.toFixed(2), y: +v.st.y.toFixed(2), psi: +v.st.psi.toFixed(3), u: +v.st.u.toFixed(2) }
        : null,
      inn: HAEUSER.H && Number.isInteger(HAEUSER.id) ? HAEUSER.id : null,
    };
  }
  const hello = () => ({
    pid: NAVATAR.pid,
    name: NAVATAR.name(),
    av: NAVATAR.av,
    role: S.role,
    v: L.PROTO,
    build: (window.PAV_BUILD && window.PAV_BUILD.src) || '',
  });
  const uhr = () => ({ k: 'uhr', t: CLOCK.t, rate: CLOCK.rate, e0: DN ? DN.e0 : null });
  // ---- the guest's clock: the host's while in the room, one's own again afterwards ----
  function applyClock(e) {
    let day = false;
    if (e.rate && CLOCK.rate !== e.rate && CLOCK.RATES && CLOCK.RATES[e.rate]) CLOCK.setRate(e.rate);
    if (DN && e.e0 !== null && Number.isFinite(e.e0) && DN.e0 !== e.e0) {
      DN.e0 = e.e0;
      day = true;
    }
    if (Math.abs(e.t - CLOCK.t) > 0.5 || day) CLOCK.t = e.t;
    if (day && DN && DN.active) DN.update(true);
  }
  function restoreClock() {
    const u = S.uhr;
    S.uhr = null;
    if (!u) return;
    try {
      applyClock({ t: u.t, rate: u.rate, e0: u.e0 });
    } catch (e) {}
  }
  // ---- the others ----
  function label(p) {
    if (p.lab) return p.lab;
    const lab = document.createElement('div');
    lab.className = 'nzlab';
    lab.style.display = 'none';
    (stage || document.body).appendChild(lab);
    p.lab = lab;
    return lab;
  }
  function figure(p) {
    if (p.F) {
      NAVATAR.drop(p.F);
      p.F = null;
    }
    const gen = (p.gen = (p.gen || 0) + 1);
    p.loading = true;
    NAVATAR.make(p.pid, p.name, p.av)
      .then(F => {
        if (!F) return;
        if (S.peers[p.id] !== p || p.gen !== gen || !S.on) return NAVATAR.drop(F);
        p.F = F;
        markDirty();
      })
      .catch(e => {
        S.err = 'figure ' + p.name + ': ' + String((e && e.message) || e).slice(0, 100);
      })
      .finally(() => {
        if (p.gen === gen) p.loading = false;
      });
  }
  function dropPeer(id, quiet) {
    const p = S.peers[id];
    if (!p) return;
    delete S.peers[id];
    if (p.F) NAVATAR.drop(p.F);
    p.F = null;
    p.gen = (p.gen || 0) + 1;
    if (p.lab) p.lab.remove();
    if (p.carId && VEH && VEH.by[p.carId]) delete VEH.by[p.carId].netU;
    KERN.unact('netz:veh:' + id);
    if (p.pid) {
      if (!quiet) PLAY.think(p.name + ' ist nicht mehr da.', 2600);
      KERN.emit('netz:peer', { k: 'weg', pid: p.pid, name: p.name });
    }
    if (S.on && S.role === 'gast' && p.role === 'host') status('Der Gastgeber ist weg – das Spiel wartet auf ihn.');
    else if (S.on) status(statusLine());
    markDirty();
  }
  const statusLine = () => {
    const n = peerList().length;
    if (S.role === 'host')
      return n
        ? 'Raum ' + S.code + ' · ' + (n === 1 ? '1 Mitspieler' : n + ' Mitspieler')
        : 'Raum ' + S.code + ' – wartet auf Mitspieler';
    return peerList().some(p => p.role === 'host')
      ? 'Im Raum ' + S.code + ' · ' + (n + 1) + ' Spieler'
      : 'Raum ' + S.code + ' – wartet auf den Gastgeber';
  };
  // ---- the messages ----
  const RATE = { st: 30, ev: 8 }; // at most so many per second and peer
  function allowed(p, k) {
    const t = now();
    p.rl = p.rl || {};
    const r = p.rl[k] || (p.rl[k] = { t, n: 0 });
    if (t - r.t > 1000) {
      r.t = t;
      r.n = 0;
    }
    return ++r.n <= RATE[k];
  }
  function wire(T) {
    T.on('hi', (d, from) => {
      S.got++;
      const h = L.hiClean(d);
      if (!h || h.pid === NAVATAR.pid) return;
      if (h.v !== L.PROTO) {
        status(h.name + ' hat eine andere Version des Spiels – bitte beide neu laden.');
        return;
      }
      // the same player again (a new connection), or the same browser after a reload (its old page silent for 3 s): the old entry goes
      const bs = h.pid.split('-')[0];
      for (const q of peerList())
        if (q.id !== from && (q.pid === h.pid || (q.pid.split('-')[0] === bs && now() - (q.stT || 0) > 3000)))
          dropPeer(q.id, true);
      let p = S.peers[from];
      if (!p) p = S.peers[from] = { id: from };
      const fresh = !p.pid,
        look = !fresh && (!L.avSame(p.av, h.av) || p.name !== h.name);
      Object.assign(p, { pid: h.pid, name: h.name, av: h.av, role: h.role, build: h.build, color: colorOf(h.av) });
      if (h.role === 'host') S.hostPid = h.pid;
      if (fresh) {
        T.send('hi', hello(), from);
        if (S.role === 'host') T.send('ev', uhr(), from);
        PLAY.think(p.name + ' ist dabei.', 2600);
        KERN.emit('netz:peer', { k: 'neu', pid: p.pid, name: p.name });
        const mine = hello().build;
        if (h.build && mine && h.build !== mine && !S.note)
          S.note = 'Ihr spielt verschiedene Stände des Spiels. Wenn etwas seltsam aussieht: beide neu laden.';
      }
      if (fresh || look) {
        figure(p);
        label(p);
      }
      status(statusLine());
    });
    T.on('st', (d, from) => {
      const p = S.peers[from];
      if (!p || !p.pid || !allowed(p, 'st')) return;
      const s = L.stClean(d);
      if (!s) return;
      S.got++;
      p.st = s;
      p.stT = now();
    });
    T.on('ev', (d, from) => {
      const p = S.peers[from];
      if (!p || !p.pid || !allowed(p, 'ev')) return;
      const e = L.evClean(d);
      if (!e) return;
      S.got++;
      if (e.k === 'uhr') {
        if (S.role === 'gast' && p.role === 'host') applyClock(e);
      } else if (e.k === 'ping') showPing(p, e);
      else if (e.k === 'geste') {
        if (p.F) NAVATAR.geste(p.F, e.art);
      } else if (e.k === 'spiel') KERN.emit('netz:spiel', { from: p.pid, d: e.d });
      else if (e.k === 'bye') dropPeer(from);
      else if (e.k.startsWith('x:')) KERN.emit('netz:' + e.k.slice(2), Object.assign({}, e, { from: p.pid }));
    });
    T.onJoin = id => {
      if (!S.peers[id]) S.peers[id] = { id };
      T.send('hi', hello(), id);
    };
    T.onLeave = id => dropPeer(id);
  }
  // ---- open a room, join one, leave ----
  let wake = null;
  async function wakeOn() {
    try {
      if (!wake && navigator.wakeLock && document.visibilityState === 'visible') {
        wake = await navigator.wakeLock.request('screen');
        wake.addEventListener && wake.addEventListener('release', () => (wake = null));
      }
    } catch (e) {
      wake = null;
    }
  }
  function wakeOff() {
    try {
      if (wake) wake.release();
    } catch (e) {}
    wake = null;
  }
  async function open(role, code, lokal) {
    if (S.zombie || S.gl) {
      status('Zusammen spielen geht in der freien Welt – die Zombie-Nacht und das Grenzland haben ihr eigenes.');
      return false;
    }
    if (S.on) close(true);
    S.role = role === 'host' ? 'host' : 'gast';
    S.code = L.clean(code) || L.newCode();
    S.lokal = !!lokal;
    S.had = false;
    S.alone = 0;
    S.note = '';
    if (S.role === 'gast' && !S.uhr) S.uhr = { t: CLOCK.t, rate: CLOCK.rate, e0: DN ? DN.e0 : null };
    status(S.role === 'host' ? 'Raum ' + S.code + ' wird geöffnet …' : 'Verbinde mit Raum ' + S.code + ' …');
    try {
      S.T = await NETZRAUM.open({ app: APP, code: S.code, lokal: S.lokal, actions: ['hi', 'st', 'ev'] });
    } catch (e) {
      S.err = String((e && e.message) || e).slice(0, 120);
      status('Keine Verbindung möglich (' + S.err.slice(0, 60) + ').');
      restoreClock();
      return false;
    }
    S.on = true;
    wire(S.T);
    S.T.start();
    keep();
    wakeOn();
    status(statusLine());
    KERN.emit('netz:open', { role: S.role, code: S.code });
    markDirty();
    return true;
  }
  function close(quiet) {
    if (!S.on) return;
    try {
      if (S.T) S.T.send('ev', { k: 'bye' });
    } catch (e) {}
    try {
      if (S.T) S.T.leave();
    } catch (e) {}
    for (const id of Object.keys(S.peers)) dropPeer(id, true);
    S.on = false;
    S.T = null;
    S.hostPid = null;
    SAVE.set(RAUM, null);
    wakeOff();
    if (S.role === 'gast') restoreClock();
    S.role = null;
    for (const r of rings.splice(0)) dropRing(r);
    status(quiet ? '' : 'Raum verlassen.');
    KERN.emit('netz:close', {});
    markDirty();
  }
  // the same room again, a new connection (a phone that slept, a relay that hiccuped)
  async function reconnect() {
    if (!S.on) return;
    S.reT = now();
    const T0 = S.T;
    try {
      if (T0) T0.leave();
    } catch (e) {}
    for (const id of Object.keys(S.peers)) dropPeer(id, true);
    try {
      const T = await NETZRAUM.open({ app: APP, code: S.code, lokal: S.lokal, actions: ['hi', 'st', 'ev'] });
      if (!S.on || S.T !== T0) {
        T.leave();
        return;
      }
      S.T = T;
      wire(T);
      T.start();
      status('Neu verbunden – ' + statusLine());
    } catch (e) {
      status('Verbindung verloren – versuche es gleich noch einmal …');
    }
  }
  const keep = () => {
    if (S.on) SAVE.set(RAUM, { v: 1, code: S.code, role: S.role, t: Date.now(), uhr: S.uhr || null });
  };
  // ---- per frame: send, move the others, their names, the vehicles they drive ----
  const _v = new THREE.Vector3();
  function project(x, y, z) {
    _v.set(x, z, -y).project(cam);
    if (!(_v.z < 1) || Math.abs(_v.x) > 1.05 || Math.abs(_v.y) > 1.05) return null;
    const r = stage.getBoundingClientRect();
    return [((_v.x + 1) / 2) * r.width, ((1 - _v.y) / 2) * r.height];
  }
  function step(p, dt, myInn) {
    const s = p.st;
    if (!s) {
      if (p.lab) p.lab.style.display = 'none';
      if (p.F) p.F.g.visible = false;
      return;
    }
    // glide to the last state; a big jump (a jump to a place, a vehicle put back) is taken at once
    const k = Math.min(1, dt * 10);
    if (p.x === undefined || hyp(s.x - p.x, s.y - p.y) > 25 || Math.abs(s.z - p.z) > 6) {
      p.x = s.x;
      p.y = s.y;
      p.z = s.z;
      p.yaw = s.yaw;
    } else {
      p.x += (s.x - p.x) * k;
      p.y += (s.y - p.y) * k;
      p.z += (s.z - p.z) * k;
      p.yaw += L.wrapDeg(s.yaw - p.yaw) * k;
    }
    // the vehicle he drives: here too (not the one I sit in)
    const car = s.car;
    if (car && VEH && VEH.by[car.id] && !(VEH.cur && VEH.cur.id === car.id)) {
      VEH.place(car.id, car.x, car.y, car.psi);
      VEH.by[car.id].netU = car.u;
      if (p.carId !== car.id) {
        if (p.carId && VEH.by[p.carId]) delete VEH.by[p.carId].netU;
        p.carId = car.id;
        blockCar(p);
      }
    } else if (p.carId) {
      if (VEH && VEH.by[p.carId]) delete VEH.by[p.carId].netU;
      p.carId = null;
      KERN.unact('netz:veh:' + p.id);
    }
    const stale = now() - (p.stT || 0) > 8000;
    const far = hyp(p.x - cam.position.x, p.y + cam.position.z) > 600;
    // standing in him (both at a door, a jump): his figure would fill the view from inside – it goes until one steps away
    const inMe =
      hyp(p.x - cam.position.x, p.y + cam.position.z) < 0.42 &&
      cam.position.y > p.z - 0.2 &&
      cam.position.y < p.z + 2.1;
    const show = !car && !stale && !far && !inMe && (s.inn || null) === myInn && (!S.figRule || S.figRule(p) !== false);
    if (p.F) {
      p.F.g.visible = show;
      if (show)
        NAVATAR.pose(
          p.F,
          { x: p.x, y: p.y, z: p.z, hd: p.yaw, sp: s.sp, stn: s.stn, air: s.air, jet: s.jet, sit: s.sit },
          dt
        );
      markDirty();
    }
    // the name over the head – in his colour, with how far he is when it is far, through walls (one finds the others)
    const lab = label(p);
    const okLab = !S.labelRule || S.labelRule(p) !== false;
    let at = null;
    if (okLab && !stale) {
      const hz = show && p.F ? p.z + (s.sit ? 1.25 : 2.0) * (p.F.netz.h / 1.8) + 0.25 : (car ? 0 : p.z) + 2.3;
      const ax = car ? car.x : p.x,
        ay = car ? car.y : p.y,
        az = car ? KERN.ground(car.x, car.y) + 2.2 : hz;
      at = project(ax, ay, Number.isFinite(az) ? az : p.z + 2.2);
    }
    if (at) {
      const d = hyp((car ? car.x : p.x) - P.x, (car ? car.y : p.y) - P.y);
      const extra = car
        ? ' · fährt'
        : (s.inn || null) !== myInn
          ? s.inn
            ? ' · im Haus'
            : ' · draußen'
          : d > 30
            ? ' · ' + Math.round(d) + ' m'
            : '';
      const txt = p.name + extra;
      if (lab.textContent !== txt) lab.textContent = txt;
      lab.style.setProperty('--nzc', p.color || '#2f88d8');
      lab.style.left = at[0] + 'px';
      lab.style.top = at[1] + 'px';
      lab.style.display = 'block';
    } else lab.style.display = 'none';
  }
  // one may not get into the vehicle another one drives: the action there says who drives
  function blockCar(p) {
    KERN.act({
      id: 'netz:veh:' + p.id,
      r: 3.4,
      prio: 0.95,
      pos: () => {
        const v = p.carId && VEH.by[p.carId];
        return v ? [v.st.x, v.st.y, v.st.z + 1.0] : [0, 0, -9999];
      },
      label: () => (p.carId && !VEH.cur ? p.name + ' fährt' : null),
      run: () => PLAY.think(p.name + ' sitzt am Steuer – lass ihn fahren.', 2600),
    });
  }
  function tick(dt) {
    if (!S.on || !S.T) return;
    dt = Math.min(dt, 0.1);
    S.sendT -= dt;
    if (S.sendT <= 0 && S.T.peers.size) {
      S.sendT = 0.1;
      S.T.send('st', me());
      S.sent++;
    }
    if (S.role === 'host' && S.T.peers.size) {
      S.uhrT -= dt;
      if (S.uhrT <= 0) {
        S.uhrT = 2;
        S.T.send('ev', uhr());
      }
    }
    S.saveT -= dt;
    if (S.saveT <= 0) {
      S.saveT = 30;
      keep();
    }
    // alone for a long time after there were others: the same room once more
    const t = now();
    if (S.T.peers.size) {
      S.had = true;
      S.alone = 0;
    } else if (S.had) {
      if (!S.alone) S.alone = t;
      if (t - S.alone > 20000 && t - S.reT > 20000) reconnect();
    }
    const myInn = HAEUSER.H && Number.isInteger(HAEUSER.id) ? HAEUSER.id : null;
    for (const p of Object.values(S.peers)) step(p, dt, myInn);
    for (const r of rings.slice()) ringStep(r, dt);
    if (S.nach) nachStep(dt);
  }
  KERN.tick(tick, 'netz');
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState !== 'visible' || !S.on) return;
    wakeOn();
    if (S.T && !S.T.peers.size && S.had && now() - S.reT > 5000) reconnect();
  });
  // ---- jump to another player ----
  // a free place beside one: behind him first (one comes up from behind), then round him – on his floor, nothing there one would bump
  // into (walls of a house, furniture, parked vehicles), no wall between him and it; null if there is none
  const _q = [0, 0];
  function free(x, y, z) {
    _q[0] = x;
    _q[1] = y;
    collide(_q, z, true);
    return hyp(_q[0] - x, _q[1] - y) < 0.08;
  }
  // (why: an array for the reasons, for tests; the path is tested from 0.35 m on – he may stand close to a door frame himself.) In a house
  // its rooms decide: the place in his room (or any room, when he stands in a doorway), a hand's breadth off its walls – the colliders
  // there answer for the village's house as well
  function beside(x0, y0, z0, yaw0, d, path = true, why = null) {
    const H = HAEUSER.H,
      rm = H && typeof H.roomAt === 'function' ? (x, y, z) => H.roomAt(x, y, z + 0.3) : null,
      r0 = rm ? rm(x0, y0, z0) : null;
    for (const dd of [d, d * 0.6])
      for (const da of [150, -150, 90, -90, 180, 45, -45, 0]) {
        const a = ((yaw0 + da) * Math.PI) / 180,
          tx = x0 + Math.sin(a) * dd,
          ty = y0 + Math.cos(a) * dd;
        const tz = floorAt(tx, ty, z0 + 0.5);
        const dz = tz - z0;
        let bad = !Number.isFinite(tz) || Math.abs(dz) > 0.45 ? 'floor' : '';
        if (!bad && rm) {
          const r = rm(tx, ty, tz);
          if (r == null || (r0 != null && r !== r0)) bad = 'room';
          else
            for (const [ox, oy] of [
              [0.25, 0],
              [-0.25, 0],
              [0, 0.25],
              [0, -0.25],
            ])
              if (rm(tx + ox, ty + oy, tz) !== r) bad = 'wall';
        } else if (!bad) {
          if (!free(tx, ty, tz)) bad = 'push';
          else if (path)
            for (const f of [0.25, 0.5, 0.75])
              if (f * dd >= 0.35 && !free(x0 + (tx - x0) * f, y0 + (ty - y0) * f, z0)) bad = 'path';
        }
        if (why) why.push([dd, da, +dz.toFixed(2), bad]);
        if (!bad) return [tx, ty, tz];
      }
    return null;
  }
  const face = (x, y) => (Math.atan2(x - P.x, y - P.y) * 180) / Math.PI;
  // beside him in his house, once its floor stands where he stands (a house is built over a few frames); on his place if no spot beside
  // him is free (a cramped room – his figure goes until one steps away); at the door if the house never gets there or he leaves it
  function nachStep(dt) {
    const n = S.nach,
      p = byPid(n.pid),
      t = p && p.st;
    n.t += dt;
    if (!t || !t.inn || !HAEUSER.H || HAEUSER.id !== t.inn || n.t > 4) {
      S.nach = null;
      return;
    }
    if (!(Math.abs(floorAt(t.x, t.y, t.z + 0.5) - t.z) < 0.3)) return;
    S.nach = null;
    const b = beside(t.x, t.y, t.z, t.yaw, 1.2) || [t.x, t.y, t.z];
    P.x = b[0];
    P.y = b[1];
    P.feet = b[2];
    P.vz = 0;
    if (hyp(P.x - t.x, P.y - t.y) > 0.3) P.yaw = P.body = face(t.x, t.y);
    markDirty(true);
  }
  async function jumpTo(pid) {
    const p = byPid(pid);
    if (!p || !p.st) return false;
    const s = p.st;
    if (PLAY.seated()) PLAY.stand(true);
    if (s.inn) {
      // in a house: into it (at its door), then beside him – he may stand just inside the door himself
      if (!(HAEUSER.H && HAEUSER.id === s.inn)) {
        if (HAEUSER.H) await HAEUSER.leave();
        if (!(await HAEUSER.enter(s.inn))) return false;
      }
      S.nach = { pid, t: 0 };
      nachStep(0);
      return true;
    }
    if (HAEUSER.H) await HAEUSER.leave();
    const x0 = s.car ? s.car.x : s.x,
      y0 = s.car ? s.car.y : s.y,
      d = s.car ? 4 : 1.8,
      a = ((s.yaw + 150) * Math.PI) / 180;
    // beside the vehicle he drives the body of it is in the way of the path test: only the place itself is tested
    let b = beside(x0, y0, s.z, s.yaw, d, !s.car);
    if (!b) {
      const tx = x0 + Math.sin(a) * d,
        ty = y0 + Math.cos(a) * d,
        tz = floorAt(tx, ty, s.z + 0.6);
      b = [tx, ty, Number.isFinite(tz) ? tz : s.z];
    }
    const yaw = (Math.atan2(x0 - b[0], y0 - b[1]) * 180) / Math.PI;
    KERN.spot('netz-ziel', { mode: 'walk', pos: [b[0], b[1]], z: b[2], yaw, pitch: 0, label: 'Bei ' + p.name });
    go('netz-ziel');
    return true;
  }
  // ---- pointing: a ring in one's colour where one looks, and a word for what is there ----
  const rings = [];
  const ringGeo = () => S.rg || (S.rg = new THREE.RingGeometry(0.5, 0.72, 40).rotateX(-Math.PI / 2));
  function ringAt(x, y, z, color, text) {
    const m = new THREE.Mesh(
      ringGeo(),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false })
    );
    m.position.set(x, z + 0.06, -y);
    m.renderOrder = 999;
    m.userData.noMerge = true;
    scene.add(m);
    const lab = document.createElement('div');
    lab.className = 'nzping';
    lab.textContent = text;
    lab.style.setProperty('--nzc', color);
    (stage || document.body).appendChild(lab);
    const r = { m, lab, t: 0, x, y, z, life: 6 };
    rings.push(r);
    if (rings.length > 8) dropRing(rings.shift());
    markDirty();
    return r;
  }
  function dropRing(r) {
    const i = rings.indexOf(r);
    if (i >= 0) rings.splice(i, 1);
    scene.remove(r.m);
    r.m.material.dispose();
    r.lab.remove();
  }
  function ringStep(r, dt) {
    r.t += dt;
    if (r.t > r.life) return dropRing(r);
    const k = 1 + 0.18 * Math.sin(r.t * 6);
    r.m.scale.set(k, 1, k);
    r.m.material.opacity = 0.95 * Math.min(1, (r.life - r.t) / 1.2);
    const at = project(r.x, r.y, r.z + 1.1);
    if (at) {
      r.lab.style.left = at[0] + 'px';
      r.lab.style.top = at[1] + 'px';
      r.lab.style.display = 'block';
    } else r.lab.style.display = 'none';
    r.lab.style.opacity = String(Math.min(1, (r.life - r.t) / 1.2));
    markDirty();
  }
  const NAMES = { car: 'Das Auto!', tractor: 'Der Traktor!', kombi: 'Das Auto!', verkehr: 'Das Auto!' };
  // what lies where one looks (ndc: [x, y] in −1…1, else the middle of the view)
  function aim(ndc) {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(new THREE.Vector2(ndc ? ndc[0] : 0, ndc ? ndc[1] : 0), cam);
    const o = rc.ray.origin,
      d = rc.ray.direction;
    const at = t => [o.x + d.x * t, -(o.z + d.z * t), o.y + d.y * t];
    let hit = null,
      house = null;
    if (HAEUSER.H) {
      // inside a house: the floor one stands on
      const t = d.y < -0.02 ? (P.feet - o.y) / d.y : 4;
      const q = at(Math.max(0.5, Math.min(25, t)));
      hit = { x: q[0], y: q[1], z: P.feet, t, art: 'hier' };
    } else {
      for (let t = 0.6; t < 260; t += t < 20 ? 0.35 : t < 80 ? 1 : 3) {
        const [x, y, z] = at(t);
        const g = KERN.ground(x, y, z + 0.5);
        if (!house && HAEUSER.houseAt && Number.isFinite(g) && z < g + 7 && z > g + 0.3) {
          const h = HAEUSER.houseAt(x, y);
          if (h) house = { x, y, z: g, t, art: 'haus' };
        }
        if (Number.isFinite(g) && z <= g) {
          hit = { x, y, z: g, t, art: 'hier' };
          break;
        }
      }
      if (house && (!hit || house.t < hit.t)) hit = house;
    }
    // the other players and the vehicles near the line of sight count before the ground behind them
    const near = (px, py, pz, r) => {
      const v = [px - o.x, pz - o.y, -py - o.z],
        t = v[0] * d.x + v[1] * d.y + v[2] * d.z;
      if (t < 0.5 || t > 260) return null;
      const c = [o.x + d.x * t, o.y + d.y * t, o.z + d.z * t];
      return hyp(c[0] - px, c[1] - pz, c[2] + py) < r ? t : null;
    };
    for (const p of peerList()) {
      if (!p.st || !p.F || !p.F.g.visible) continue;
      const t = near(p.x, p.y, p.z + 1.1, 0.9);
      if (t !== null && (!hit || t < hit.t + 0.5)) hit = { x: p.x, y: p.y, z: p.z, t, art: 'person', who: p.name };
    }
    for (const v of (VEH && VEH.list) || []) {
      if (!v.g || !v.g.visible || v === VEH.cur) continue;
      const t = near(v.st.x, v.st.y, v.st.z + 1, 2.0);
      if (t !== null && (!hit || t < hit.t + 1))
        hit = { x: v.st.x, y: v.st.y, z: v.st.z, t, art: 'fahrzeug', what: v.id };
    }
    return hit;
  }
  const pingText = h =>
    h.art === 'person'
      ? 'Da: ' + h.who + '!'
      : h.art === 'fahrzeug'
        ? NAMES[h.what] || 'Das Fahrzeug!'
        : h.art === 'haus'
          ? 'Hier rein!'
          : 'Hier!';
  function ping(ndc) {
    const h = aim(ndc);
    if (!h) return null;
    const color = colorOf(NAVATAR.av),
      txt = pingText(h);
    ringAt(h.x, h.y, h.z, color, NAVATAR.name() + ': ' + txt);
    S.pings++;
    if (S.on && S.T)
      S.T.send('ev', { k: 'ping', x: +h.x.toFixed(2), y: +h.y.toFixed(2), z: +h.z.toFixed(2), art: h.art, txt });
    KERN.emit('netz:ping', { x: h.x, y: h.y, z: h.z, art: h.art, mine: true });
    return h;
  }
  function showPing(p, e) {
    ringAt(e.x, e.y, e.z, p.color || '#2f88d8', p.name + ': ' + (e.txt || 'Hier!'));
    if (p.F && p.F.g.visible) NAVATAR.geste(p.F, 'zeigen', [e.x, e.y, e.z + 0.8]);
    KERN.emit('netz:ping', { x: e.x, y: e.y, z: e.z, art: e.art, from: p.pid });
  }
  // ---- gestures: one's own figure, and the others see it on theirs ----
  function geste(art) {
    if (!L.GESTEN.includes(art)) return false;
    if (art === 'zeigen') return !!ping();
    NAVATAR.gesteSelf(art);
    if (S.on && S.T) S.T.send('ev', { k: 'geste', art });
    return true;
  }
  // ---- for the games and other modules ----
  function stateOf(pid) {
    if (pid === NAVATAR.pid) return L.stClean(me());
    const p = byPid(pid);
    return p ? p.st : null;
  }
  function spiel(d, toPid) {
    if (!S.on || !S.T) return;
    const to = toPid ? (byPid(toPid) || {}).id : undefined;
    if (toPid && !to) return;
    S.T.send('ev', { k: 'spiel', g: 'vs', d }, to);
  }
  const tell = (name, data) => {
    if (S.on && S.T && S.T.peers.size) S.T.send('ev', Object.assign({}, data || {}, { k: 'x:' + name }));
  };
  const list = () =>
    peerList().map(p => ({
      pid: p.pid,
      name: p.name,
      role: p.role,
      color: p.color,
      av: p.av,
      st: p.st || null,
      fig: !!p.F,
      place: p.st ? KERN.place(p.st.x, p.st.y, p.st.z) : null,
      d: p.st ? Math.round(hyp(p.st.x - P.x, p.st.y - P.y)) : null,
    }));
  function link() {
    const u = new URL(location.href);
    u.search = '?zusammen=' + S.code + (S.lokal ? '&lokal=1' : '');
    u.hash = '';
    return u.href;
  }
  // ---- my avatar changed: the others get the new plan ----
  KERN.on('netz:avatar', () => {
    if (S.on && S.T && S.T.peers.size) S.T.send('hi', hello());
    changed();
  });
  // ---- the modes with a world of their own close the room ----
  KERN.on('zombie:start', () => {
    S.zombie = true;
    if (S.on) {
      close(true);
      PLAY.think('Zusammen spielen ist beendet – die Zombie-Nacht hat ihr eigenes „Zu zweit“.', 4000);
    }
  });
  KERN.on('zombie:stop', () => (S.zombie = false));
  KERN.on('grenzland:start', () => {
    S.gl = true;
    if (S.on) {
      close(true);
      PLAY.think('Zusammen spielen ist beendet – das Grenzland ist eine Welt für sich.', 4000);
    }
  });
  KERN.on('grenzland:stop', () => (S.gl = false));
  // ---- after loading: ?zusammen=CODE, or back into the room of before a reload ----
  whenLoaded(() =>
    setTimeout(() => {
      const lokal = QS.get('lokal') === '1',
        q = L.clean(QS.get('zusammen'));
      if (q.length >= 4) {
        open('gast', q, lokal);
        return;
      }
      const r = SAVE.get(RAUM);
      if (r && Date.now() - r.t < 15 * 60 * 1000) {
        S.uhr = r.uhr && Number.isFinite(r.uhr.t) ? r.uhr : null;
        open(r.role, r.code, lokal);
      } else if (r) SAVE.set(RAUM, null);
    }, 1200)
  );
  Object.assign(S, {
    open,
    close,
    reconnect,
    me,
    stateOf,
    list,
    byPid,
    jumpTo,
    ping,
    aim,
    geste,
    spiel,
    tell,
    link,
    watch: f => (watchers.add(f), () => watchers.delete(f)),
    changed,
    applyClock,
    beside,
    RAUM,
    APP,
  });
  return S;
})();
window.NETZ = NETZ;
