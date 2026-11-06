// ===================== feat/bus 4: passengers – people of the traffic wait at the stop, get on and get off (BUSLEUTE) =====================
// The people of verkehr/verkehr_leute.js (Ratscher, Schleusingen) use the buses too: a few minutes before a bus is due at a stop near the
// player, 0–2 of them come along the verge (or are already there, after a time-lapse) and wait beside the sign, looking where the bus
// comes from; when it stands with its doors open they walk to the front door and get in (the bus waits for them – a ridden one leaves a
// few seconds late); when a bus stops near the player, 0–2 get off through the middle door and walk away along the verge until out of
// sight. Who, how many: from the trip, the day and the stop (the same bus brings the same people), fewer at night and in the early
// morning. Their figures (verkehr/verkehr_fig.js VFIG: Rocketbox, loaded near, freed far) are marked busy for the traffic
// (VERKEHR.S.busy[key] = 'bus') while they are passengers, so nobody walks twice; a word to the player when he waits beside them.
// Tests: BUSLEUTE.force = { ein, aus } (the counts for the next calls), BUSLEUTE.state().
import * as THREE from 'three';
import { cam } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { CLOCK } from '../time/clock.js';
import { VLEUTE } from '../verkehr/verkehr_leute.js';
import { VFIG } from '../verkehr/verkehr_fig.js';
import { VERKEHR } from '../verkehr/verkehr.js';
import { Z } from '../zombie/z_state.js';
import { BUSPLAN } from './bus_fahrplan.js';
import { BUSMOD } from './bus_modell.js';
import { BUS } from './bus.js';
export const BUSLEUTE = (() => {
  const S = { pax: [], done: new Map(), force: null, stats: { ein: 0, aus: 0, gruss: 0, weg: 0 }, log: [] };
  // (what happened, the last 40: [minute, what, person, state or why] – tests, the bug report)
  const log = (...a) => {
    S.log.push([+CLOCK.t.toFixed(2), ...a]);
    if (S.log.length > 40) S.log.shift();
  };
  const PP = VLEUTE.P,
    D = BUSMOD.DIM,
    NEAR = 150;
  const hyp = Math.hypot;
  const wrap = a => {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  };
  // in view: near, or ahead of the camera (from inside the bus too; far away a figure that appears is too small to notice)
  const _cd = new THREE.Vector3();
  function seen(x, y) {
    const dx = x - cam.position.x,
      dy = y + cam.position.z,
      d = hyp(dx, dy);
    if (d < 25) return true;
    if (d > 110) return false;
    cam.getWorldDirection(_cd);
    const l = hyp(_cd.x, _cd.z) || 1;
    return (dx * _cd.x - dy * _cd.z) / (l * d) > 0.35;
  }
  // a small hash of numbers → 0 … 1
  const hash = (...n) => {
    let h = 2166136261;
    for (const v of n) {
      h ^= Math.round(v * 7) & 0xffffffff;
      h = Math.imul(h, 16777619);
    }
    return ((h >>> 0) % 10007) / 10007;
  };
  // how many: by the hour (few at night and before six), the hash of the call
  // (tests: S.force = { ein, aus, line } – these counts, for that line only; nobody for the others meanwhile)
  function count(h, hour, kind, line) {
    if (S.force) return S.force.line && S.force.line !== line ? 0 : (S.force[kind] ?? 0);
    const night = hour < 5.5 || hour > 21.5,
      peak = (hour > 6.3 && hour < 8.3) || (hour > 12 && hour < 14.5) || (hour > 15.5 && hour < 17.5);
    if (night) return h < 0.85 ? 0 : 1;
    if (peak) return h < 0.3 ? 0 : h < 0.75 ? 1 : 2;
    return h < 0.5 ? 0 : h < 0.88 ? 1 : 2;
  }
  // the place of a stop for the people: Ratscher → dorf, Schleusingen → stadt (others: nobody of them)
  const townOf = n => (/^Ratscher/.test(n) ? 'dorf' : /^Schleusingen/.test(n) ? 'stadt' : null);
  function who(town, h) {
    const V = VERKEHR && VERKEHR.S;
    if (!V) return null;
    const free = VLEUTE.KEYS.filter(
      k =>
        !V.busy[k] &&
        !PP[k].dog &&
        PP[k].where.includes(town) &&
        VFIG.avail(k) &&
        !(V.recent[k] > V.t) &&
        !S.pax.some(q => q.key === k)
    );
    return free.length ? free[Math.floor(h * free.length) % free.length] : null;
  }
  function mark(k, on) {
    const V = VERKEHR && VERKEHR.S;
    if (!V) return;
    if (on) V.busy[k] = 'bus';
    else if (V.busy[k] === 'bus') {
      V.busy[k] = null;
      V.recent[k] = V.t + 90;
    }
  }
  function add(o) {
    const q = Object.assign(
      { f: null, x: 0, y: 0, z: 0, hd: 0, sp: 0, t: 0, greeted: false, gone: false, walk: PP[o.key].walk || 1.1 },
      o
    );
    q.z = KERN.ground(q.x, q.y);
    log('add', q.key, q.st, q.c ? q.c.trip.line + ' ' + BUSPLAN.hm(q.c.t) : q.I ? q.I.trip.line : '');
    mark(q.key, true);
    S.pax.push(q);
    VFIG.load(q.key).then(f => {
      if (!f) return;
      if (q.gone) return;
      q.f = f;
    });
    return q;
  }
  function remove(q, why) {
    log('rm', q.key, q.st, why || '');
    q.gone = true;
    const i = S.pax.indexOf(q);
    if (i >= 0) S.pax.splice(i, 1);
    if (q.f && q.f.g.visible) {
      q.f.g.visible = false;
      markDirty();
    }
    mark(q.key, false);
    if (why) S.stats[why]++;
  }
  function clear() {
    for (const q of S.pax.slice()) remove(q);
  }
  // per call: how many (decided once) and how many came so far
  const want = (k, now, n) => {
    let w = S.done.get(k);
    if (!w) {
      S.done.set(k, (w = { n: n(), got: 0, t: now }));
      if (S.done.size > 200) S.done.delete(S.done.keys().next().value);
    }
    return w;
  };
  // ---- plan (twice a second): who comes to wait for the buses due near the player, who gets off a bus that stops near him ----
  function plan() {
    if (Z.on || !BUSPLAN.ready || !VERKEHR) {
      if (S.pax.length) clear();
      return;
    }
    const [ox, oy] = KERN.where() || [P.x, P.y],
      now = CLOCK.t,
      hour = (((now % 1440) + 1440) % 1440) / 60,
      e0 = BUS.e0();
    for (const e of BUS.STOPS()) {
      if (hyp(e.x - ox, e.y - oy) > NEAR) continue;
      const town = townOf(e.name);
      if (!town) continue;
      for (const c of BUSPLAN.calls(e.s, now - 0.4, now + 4, e0)) {
        const Pt = BUSPLAN.S.pats[c.trip.pat];
        if (!BUS.sameWay(e, c) || (c.k === Pt.last && !c.trip.weiter)) continue;
        // how many, decided once per call; who comes is tried again until they are there (people of the traffic may be busy)
        const w = want('ein:' + c.trip.i + ':' + c.di + ':' + c.k + ':' + e.i, now, () =>
          count(hash(c.trip.i, c.di, c.k, 1), hour, 'ein', c.trip.line)
        );
        while (w.got < w.n && now < c.t - 0.1 && wait(e, c, town, w.got, now)) w.got++;
      }
    }
    for (const I of BUS.S.inst) {
      if (I.st !== 'halt' || I.B.open < 0.3 || hyp(I.x - ox, I.y - oy) > NEAR) continue;
      const st = I.Rn.P.st[I.k];
      // (nobody on board at the stop where the trip begins; one that comes from beyond the world brings people with it)
      if (!st || st.s < 0 || (I.k === I.Rn.P.first && !I.trip.vor)) continue;
      const town = townOf(BUSPLAN.S.stations[st.s].n);
      if (!town) continue;
      const w = want('aus:' + I.key + ':' + I.k, now, () => count(hash(I.trip.i, I.k, 2), hour, 'aus', I.trip.line));
      while (w.got < w.n && alight(I, town, w.got)) w.got++;
    }
  }
  // someone comes to wait: the spot beside the sign (a little further from the road), along the verge from where it is not seen
  function wait(e, c, town, j, now) {
    const k = who(town, hash(c.trip.i, c.di, j, 3));
    if (!k) {
      log('niemand', town, c.trip.line);
      return false;
    }
    const fx = Math.sin(e.hd),
      fy = Math.cos(e.hd),
      rx = Math.cos(e.hd),
      ry = -Math.sin(e.hd),
      along = (j ? 1.6 : -1.1) + (hash(c.trip.i, j, 4) - 0.5) * 0.8,
      out = e.shelter ? -1.3 : 0.55,
      tx = e.x + fx * along + rx * out,
      ty = e.y + fy * along + ry * out,
      look = wrap(e.hd + Math.PI + (hash(j, c.k, 5) - 0.5) * 0.9);
    // already there: after a time-lapse, or where nobody looks
    if (CLOCK.warp || !seen(tx, ty)) {
      add({ key: k, st: 'wartet', e, c, x: tx, y: ty, hd: look, tx, ty, look });
      return true;
    }
    // else along the verge, from the side one does not see, at most as far as one walks until the bus comes
    const walk = PP[k].walk || 1.1,
      far = Math.max(12, Math.min(45, (c.t - now) * 60 * walk * 0.75));
    for (const sg of hash(c.trip.i, j, 6) < 0.5 ? [1, -1] : [-1, 1]) {
      const sx = tx + fx * far * sg,
        sy = ty + fy * far * sg;
      if (seen(sx, sy)) continue;
      add({ key: k, st: 'kommt', e, c, x: sx, y: sy, hd: Math.atan2(tx - sx, ty - sy), tx, ty, look });
      return true;
    }
    log('gesehen', k, c.trip.line);
    return false;
  }
  // someone gets off: inside at the middle door, out to the verge, then along it, away from the front of the bus
  function alight(I, town, j) {
    const k = who(town, hash(I.trip.i, I.k, j, 7));
    if (!k) return false;
    const [x, y] = BUS.doorPt(I, -0.55, true),
      [ox, oy] = BUS.doorPt(I, 1.3 + j * 0.5, true),
      back = hash(I.trip.i, j, 8) < 0.65 ? -1 : 1;
    add({
      key: k,
      st: 'aus',
      I,
      x,
      y,
      hd: I.hd + Math.PI / 2,
      tx: ox,
      ty: oy,
      wait: j * 1.4,
      dir: I.hd + (back < 0 ? Math.PI : 0),
    });
    return true;
  }
  // the bus a waiting person waits for, standing at the stop with its doors open
  const busOf = q =>
    BUS.S.inst.find(
      I =>
        I.trip === q.c.trip &&
        I.Rn.key === q.c.trip.i + ':' + q.c.di &&
        I.st === 'halt' &&
        I.k === q.c.k &&
        I.B.open > 0.7
    );
  // walking towards (tx, ty); true when there
  function toward(q, dt, tx, ty, v) {
    const dx = tx - q.x,
      dy = ty - q.y,
      d = hyp(dx, dy);
    if (d < 0.2) {
      q.sp = 0;
      return true;
    }
    const st = Math.min(d, v * dt);
    q.x += (dx / d) * st;
    q.y += (dy / d) * st;
    q.hd = wrap(q.hd + wrap(Math.atan2(dx, dy) - q.hd) * Math.min(1, dt * 7));
    q.sp = v;
    return false;
  }
  const GREET = [
    'Na, auch auf den Bus?',
    'Der müsste gleich kommen.',
    'Hoffentlich ist er pünktlich – im Winter wird es knapp.',
    'Fährst du auch nach Schleusingen?',
  ];
  function move(dt) {
    const now = CLOCK.t,
      walkPl = P.mode === 'walk' && !PLAY.seated();
    for (const q of S.pax.slice()) {
      q.t += dt;
      if (q.st === 'kommt') {
        if (toward(q, dt, q.tx, q.ty, q.walk)) q.st = 'wartet';
      } else if (q.st === 'wartet') {
        q.sp = 0;
        q.hd = wrap(q.hd + wrap(q.look - q.hd) * Math.min(1, dt * 3));
        const I = busOf(q);
        if (I) {
          q.st = 'steigt';
          q.I = I;
        } else if (now > q.c.t + 2.5 && !seen(q.x, q.y)) remove(q, 'weg');
        else if (now > q.c.t + 4) {
          // the bus did not come here (it was not drawn): off along the verge
          q.st = 'geht';
          q.dir = q.e.hd + Math.PI;
          q.left = 40;
        }
        // a word when the player waits beside them
        if (walkPl && !q.greeted && hyp(P.x - q.x, P.y - q.y) < 2.8) {
          q.greeted = true;
          S.stats.gruss++;
          const h = (((now % 1440) + 1440) % 1440) / 60,
            line =
              h < 10 && hash(q.c.trip.i, 9) < 0.5 ? 'Morgen.' : GREET[Math.floor(hash(q.c.trip.i, q.t) * GREET.length)];
          try {
            VERKEHR.UI.subtitle({ key: q.key, f: q.f }, line);
          } catch (e) {}
        }
      } else if (q.st === 'steigt') {
        const I = q.I;
        if (!BUS.S.inst.includes(I)) {
          remove(q, 'weg');
          continue;
        }
        // the bus waits for them
        I.hold = Math.max(I.hold || 0, 1.2);
        const [dx, dy] = BUS.doorPt(I, 0.15);
        if (toward(q, dt, dx, dy, q.walk * 1.15)) {
          // in: through the door, out of sight
          remove(q, 'ein');
          KERN.emit('bus:fahrgast', { who: q.key, was: 'ein', line: I.trip.line });
        }
      } else if (q.st === 'aus') {
        if ((q.wait -= dt) > 0) {
          q.sp = 0;
          continue;
        }
        if (q.I && BUS.S.inst.includes(q.I)) q.I.hold = Math.max(q.I.hold || 0, 0.8);
        if (toward(q, dt, q.tx, q.ty, q.walk)) {
          q.st = 'geht';
          q.left = 30 + hash(q.t, 10) * 25;
          KERN.emit('bus:fahrgast', { who: q.key, was: 'aus', line: q.I && q.I.trip.line });
          S.stats.aus++;
        }
      } else if (q.st === 'geht') {
        const fx = Math.sin(q.dir),
          fy = Math.cos(q.dir),
          st = q.walk * dt;
        q.x += fx * st;
        q.y += fy * st;
        q.hd = wrap(q.hd + wrap(q.dir - q.hd) * Math.min(1, dt * 5));
        q.sp = q.walk;
        q.left -= st;
        if ((q.left <= 0 && !seen(q.x, q.y)) || q.left < -60) {
          remove(q);
          continue;
        }
      }
      q.z = KERN.ground(q.x, q.y, q.z + 0.5);
      if (!Number.isFinite(q.z)) q.z = 0;
      const f = q.f;
      if (f) {
        if (!f.g.visible) {
          f.g.visible = true;
          markDirty();
        }
        f.g.position.set(q.x, q.z, -q.y);
        f.g.rotation.y = -q.hd;
        f.anim(dt, q.sp);
        if (q.sp > 0.05 || hyp(q.x - P.x, q.y - P.y) < 30) markDirty();
      }
    }
  }
  let acc = 0;
  KERN.tick(dt => {
    if (Z.on || BUS.S.state !== 'ready') {
      if (S.pax.length) clear();
      return;
    }
    if ((acc += dt) > 0.5) {
      acc = 0;
      plan();
    }
    if (S.pax.length) move(Math.min(dt, 0.25));
  }, 'bus/leute');
  return {
    S,
    clear,
    // tests: forget who was planned for which bus
    reset: () => {
      clear();
      S.done.clear();
      S.log.length = 0;
    },
    set force(v) {
      S.force = v || null;
    },
    get force() {
      return S.force;
    },
    state: () => ({
      pax: S.pax.map(q => ({
        key: q.key,
        st: q.st,
        x: +q.x.toFixed(1),
        y: +q.y.toFixed(1),
        fig: !!(q.f && q.f.g.visible),
      })),
      stats: Object.assign({}, S.stats),
      log: S.log.slice(-14),
    }),
  };
})();
window.BUSLEUTE = BUSLEUTE;
