// ===================== feat/verkehr 5: life on the streets – walkers, cars, waving one down, riding along, driving it (VERKEHR) =====================
// Falko, 25.10.2026: „Außerdem sollen ab und zu auch Leute einfach durchs Dorf schlendern oder auch mal mit dem Auto fahren. Auch in
// Schleusingen. Ich möchte die Autos auch anhalten können. Wenn es sich anbietet. Ähnlich wie bei GTA.“
// Two places, each a KERN.zone (built near, dropped far): Ratscher (around the Anger; the garden and the yards stay to the neighbours) and
// Schleusingen (around the Markt, once welt/schleusingen.js stands). Each place has a network (verkehr/verkehr_netz.js) for cars and one for
// walkers, from its OSM ways. Now and then somebody of verkehr/verkehr_leute.js comes along out of sight: walks along the edge of the road
// (on the left, facing the traffic; checked against the walls once when the place is built), at his own pace, sometimes with a dog or a
// bag, stops to look at a front garden, greets in passing („Hallo!“ as a subtitle – everyone here says du), walks on until out of sight
// and is gone; by day a few, at night almost nobody (the game clock). Cars (verkehr/verkehr_auto.js) come in at one edge of the place and
// leave at another, now and then, by day more. Walk up to someone: „Mit … sprechen“ – a small talk panel (#verkehrpanel, the look of the
// villagers' panel), with npc/ki.js free conversation when it is set up. A car coming towards the player: „Auto anhalten“ – it pulls over
// beside him, the driver asks what's up: „Mitfahren“ (as a passenger to the next place – the Anger, the bus stop, the Markt – then out),
// „Selbst fahren“ (the driver gets out, agrees or grumbles; the player drives that car with the controls of his own; when he leaves it,
// the driver walks over and drives on – or, if it stands far away, fetches it later), or just a word. Events: 'verkehr:angehalten',
// 'verkehr:mitfahrt', 'verkehr:selbst', 'verkehr:zurueck', 'verkehr:gruss'. Nothing is saved.
import * as THREE from 'three';
import { $, cam, COARSE } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { go } from '../game/player.js';
import { PLAY } from '../game/play.js';
import { NPCUI } from '../npc/npc.js';
import { ROADS } from '../world/roads.js';
import { VILLAGE } from '../world/village.js';
import { WCOL } from '../world/worldcol.js';
import { SCHL } from '../welt/schleusingen.js';
import { FAHRT } from '../welt/fahrt.js';
import { CLOCK } from '../time/clock.js';
import { VEH } from '../vehicles/vehicle.js';
import { DPEOPLE } from '../dorf/dorf_people.js';
import { DORF } from '../dorf/dorf.js';
import { KI } from '../npc/ki.js';
import { VLEUTE } from './verkehr_leute.js';
import { VNETZ } from './verkehr_netz.js';
import { VFIG } from './verkehr_fig.js';
import { VAUTO } from './verkehr_auto.js';
export const VERKEHR = (() => {
  const PP = VLEUTE.P;
  const S = {
    places: {},
    peds: [],
    busy: {}, // person → 'ped' | 'car' | 'driver' (one role at a time)
    idle: {}, // person → seconds since the figure was last needed
    t: 0,
    force: null, // tests: { peds, cars } targets instead of the clock's
    auto: true, // tests: false = nothing spawns by itself
    halted: null, // the car waved down
    ride: null, // { c, stop }
    lent: null, // { c, who, st, t, driver }
    recent: {}, // person → time before which he does not come again (just gone out of sight)
    stats: { peds: 0, cars: 0, greet: 0, honk: 0, rides: 0, lent: 0, back: 0, fetched: 0 },
    err: null,
  };
  const rnd = Math.random;
  const hour = () => ((((CLOCK ? CLOCK.t : 720) % 1440) + 1440) % 1440) / 60;
  const wrap = a => {
    while (a > Math.PI) a -= 2 * Math.PI;
    while (a < -Math.PI) a += 2 * Math.PI;
    return a;
  };
  const say = (k, what, ziel) => VLEUTE.line(k, what, ziel);
  const pick = a => a[Math.floor(rnd() * a.length)];
  // ---- the places ----
  const WS = { 1: 8.0, 2: 7.0, 3: 5.6, 4: 3.4, 5: 3.6, 6: 3.0, 7: 1.6, 8: 2.2 };
  const PLACES = {
    dorf: {
      id: 'dorf',
      name: 'Ratscher',
      c: [222, -108],
      carR: 560,
      walkR: 330,
      near: 650,
      far: 850,
      town: 300, // main roads within this of the centre: 50 km/h, outside 70
      walkKinds: [2, 3, 4, 5, 6, 7, 8],
      avoid: [[8, -12, 100]], // the garden, Hubert's and Ronald's yards: their own ground and fences, not for strollers
      stops: [
        [222, -108, 'zum Anger'],
        [250.6, -99.6, 'zur Bushaltestelle'],
      ],
      // night and day: [from hour, to hour, walkers, cars] (fractions: the chance of one more)
      day: [
        [0, 5, 0.1, 0.1],
        [5, 6.5, 0.4, 0.6],
        [6.5, 8, 1.4, 1.5],
        [8, 12, 2.6, 1.1],
        [12, 14, 2.2, 1.0],
        [14, 18, 2.8, 1.2],
        [18, 20, 2.0, 1.0],
        [20, 22, 1.0, 0.6],
        [22, 24, 0.3, 0.25],
      ],
      ways: () => (ROADS.ready && ROADS.ways.length ? ROADS.ways : null),
      ready: () => !!(ROADS.ready && WCOL.ready && VILLAGE.ready),
      alive: () => true,
      bld: () => VILLAGE.bld || [],
    },
  };
  if (SCHL.on && SCHL.MARKT)
    PLACES.stadt = {
      id: 'stadt',
      name: 'Schleusingen',
      c: SCHL.MARKT.slice(),
      carR: 470,
      walkR: 360,
      near: 800,
      far: 1000,
      town: 1e9,
      walkKinds: [2, 3, 5, 7, 8],
      avoid: [],
      stops: [
        [SCHL.MARKT[0], SCHL.MARKT[1], 'zum Markt'],
        [-1131, 1198, 'zum Rathaus'],
      ],
      day: [
        [0, 5, 0.2, 0.3],
        [5, 6.5, 0.8, 1.0],
        [6.5, 8, 2.0, 2.2],
        [8, 12, 3.4, 2.0],
        [12, 14, 3.0, 1.8],
        [14, 18, 3.6, 2.2],
        [18, 20, 2.6, 1.6],
        [20, 22, 1.4, 1.0],
        [22, 24, 0.5, 0.5],
      ],
      ways: () =>
        SCHL.state === 'ready' && SCHL.data && SCHL.data.st
          ? SCHL.data.st.map(s => ({ kind: s.k, w: WS[s.k] || 4, p: s.p }))
          : null,
      ready: () => SCHL.state === 'ready' && !!(SCHL.data && SCHL.data.st),
      alive: () => SCHL.state === 'ready',
      bld: () => SCHL.bld || [],
    };
  // ---- building a place: the networks, the walkers' side of each way (checked against walls), the cars' exits ----
  const inAvoid = (Pl, x, y) => Pl.avoid.some(([ax, ay, r]) => Math.hypot(x - ax, y - ay) < r);
  function walkSide(Pl, e, fwd) {
    const base = e.kind <= 5 ? Math.max(0.3, e.w / 2 - 0.45) : e.kind === 6 ? 0.6 : 0.25;
    const pts = fwd ? e.pts : e.pts.slice().reverse();
    for (let m = base; m >= -0.01; m -= 0.5) {
      const mag = Math.max(0, m),
        L = VNETZ.offset(pts.map(([x, y]) => ({ x, y, o: -mag, v: 0 })));
      let ok = true;
      for (let k = 0; ok && k + 1 < L.length; k++) {
        const a = L[k],
          b = L[k + 1],
          n = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 2));
        for (let j = 0; j <= n && ok; j++) {
          const x = a.x + ((b.x - a.x) * j) / n,
            y = a.y + ((b.y - a.y) * j) / n,
            q = [x, y];
          if (inAvoid(Pl, x, y)) ok = false;
          else {
            KERN.pushOut(q, 0.32);
            if (Math.hypot(q[0] - x, q[1] - y) > 0.04) ok = false;
          }
        }
      }
      if (ok) return mag;
    }
    return null;
  }
  const vmaxOf = (Pl, e) => {
    if (e.kind <= 2) {
      const m = e.pts[e.pts.length >> 1];
      return Math.hypot(m[0] - Pl.c[0], m[1] - Pl.c[1]) < Pl.town ? 13.9 : 19.4;
    }
    return e.kind === 3 ? (Pl.id === 'stadt' ? 8.3 : 9.7) : e.kind === 4 ? 8.3 : 5.6;
  };
  const laneOff = e => Math.max(0.75, Math.min(1.75, e.w / 4));
  function buildPlace(Pl) {
    const ways = Pl.ways();
    if (!ways) throw new Error('keine Straßen');
    const t0 = performance.now();
    const G = VNETZ.graph(ways, { kinds: new Set([1, 2, 3, 4, 5]), clip: [Pl.c[0], Pl.c[1], Pl.carR] }),
      W = VNETZ.graph(ways, { kinds: new Set(Pl.walkKinds), clip: [Pl.c[0], Pl.c[1], Pl.walkR] });
    for (const e of W.edges) e.wo = [walkSide(Pl, e, true), walkSide(Pl, e, false)];
    for (const n of W.nodes) n.ok = n.edges.some(e => e.wo[0] !== null || e.wo[1] !== null);
    // the exits of the cars: those that reach at least one other exit
    const cost = e => (e.len / vmaxOf(Pl, e)) * (e.kind === 4 ? 1.4 : e.kind === 5 ? 3 : 1);
    const ex = G.nodes.map((n, i) => (n.exit ? i : -1)).filter(i => i >= 0),
      exits = [];
    for (const a of ex) {
      const d = VNETZ.reach(G, a, cost);
      if (ex.some(b => b !== a && d[b] < Infinity)) exits.push(a);
    }
    Object.assign(Pl, { G, W, exits, cost, routes: new Map(), ms: Math.round(performance.now() - t0), on: true });
    Pl.nextPed = 1;
    Pl.nextCar = 4 + rnd() * 6;
    Pl.primed = false;
    KERN.emit('verkehr:ort', { id: Pl.id, state: 'ready' });
  }
  function dropPlace(Pl) {
    Pl.on = false;
    for (const d of S.peds.slice()) if (d.place === Pl.id) removePed(d);
    for (const c of VAUTO.cars.slice()) if (c.place === Pl.id && !(S.lent && S.lent.c === c)) removeCar(c);
    if (S.lent && S.lent.driver && S.lent.c.place === Pl.id) {
      const f = S.lent.driver.f;
      if (f) f.g.visible = false;
      S.lent.driver = null;
    }
    Pl.G = Pl.W = null;
    Pl.routes = new Map();
  }
  for (const Pl of Object.values(PLACES)) {
    S.places[Pl.id] = Pl;
    KERN.zone({
      id: 'verkehr:' + Pl.id,
      x: Pl.c[0],
      y: Pl.c[1],
      near: Pl.near,
      far: Pl.far,
      keep: 4,
      build: async () => {
        await KERN.until(() => Pl.ready(), 180);
        buildPlace(Pl);
      },
      drop: () => dropPlace(Pl),
    });
  }
  // ---- seeing: near, or in front of the camera ----
  const _f = new THREE.Vector3();
  let camF = [0, 1];
  function seen(x, y) {
    const dx = x - cam.position.x,
      dy = y + cam.position.z,
      d = Math.hypot(dx, dy);
    if (d < 22) return true;
    if (d > 200) return false;
    return (dx * camF[0] + dy * camF[1]) / d > 0.3;
  }
  // ---- walkers ----
  const _a = {};
  function walkRoute(Pl, o, prime) {
    const W = Pl.W,
      N = W.nodes,
      wcost = (e, fwd) => (e.wo[fwd ? 0 : 1] === null ? Infinity : e.len * (e.kind === 6 ? 1.5 : 1));
    const starts = [];
    for (let i = 0; i < N.length; i++) {
      const n = N[i];
      if (!n.ok) continue;
      const d = Math.hypot(n.x - o[0], n.y - o[1]);
      if (prime ? d < 230 : d > 55 && d < 170 && !seen(n.x, n.y)) starts.push(i);
    }
    for (let tries = 0; tries < 8 && starts.length; tries++) {
      const i = starts.splice(Math.floor(rnd() * starts.length), 1)[0],
        n = N[i],
        dist = VNETZ.reach(W, i, wcost);
      // a destination beyond the observer, seen from the start (so the way passes by), not too far
      const tx = o[0] - n.x,
        ty = o[1] - n.y,
        tl = Math.hypot(tx, ty) || 1;
      let best = -1,
        bs = -1e9;
      for (let j = 0; j < N.length; j++) {
        if (j === i || !(dist[j] < Infinity) || dist[j] < 80 || dist[j] > 520 || !N[j].ok) continue;
        const ux = N[j].x - o[0],
          uy = N[j].y - o[1],
          dj = Math.hypot(ux, uy),
          sc = (ux * tx + uy * ty) / (tl * (dj || 1)) + (prime ? rnd() : rnd() * 0.6) - (dj > 220 ? 1 : 0);
        if (sc > bs) {
          bs = sc;
          best = j;
        }
      }
      if (best < 0) continue;
      const path = VNETZ.route(W, i, best, wcost);
      if (!path) continue;
      const line = VNETZ.line(path, { off: (e, fwd) => -(e.wo[fwd ? 0 : 1] || 0), cut: 1.6 });
      if (!line || line.L < 40) continue;
      return line;
    }
    return null;
  }
  // a pause now and then where a house is near: looking at its front garden
  function pauses(Pl, line, key) {
    const out = [],
      B = Pl.bld();
    for (let s = 25 + rnd() * 40; s < line.L - 15; s += 45 + rnd() * 70) {
      if (rnd() < 0.35) continue;
      VNETZ.at(line, s, _a);
      let best = null,
        bd = 26;
      for (const b of B) {
        if (b.cx === undefined) continue;
        const d = Math.hypot(b.cx - _a.x, b.cy - _a.y);
        if (d < bd) {
          bd = d;
          best = b;
        }
      }
      if (best)
        out.push({ s, look: Math.atan2(best.cx - _a.x, best.cy - _a.y), t: 2.5 + rnd() * 4 + (PP[key].dog ? 2 : 0) });
    }
    return out;
  }
  function spawnPed(Pl, key, o, prime) {
    const line = walkRoute(Pl, o, prime);
    if (!line) return null;
    const p = PP[key],
      d = {
        key,
        p,
        place: Pl.id,
        line,
        s: 0,
        v: p.walk * (0.93 + rnd() * 0.14),
        sp: 0,
        st: 'gehen',
        t: 0,
        f: null,
        dog: null,
        pz: null,
        greeted: false,
        dodge: 0,
        wait: 0,
        x: 0,
        y: 0,
        z: 0,
        hd: 0,
        unseen: 0,
        born: S.t,
      };
    if (prime) {
      // already on the way: somewhere along the line, not right under the observer's eyes
      for (let k = 0; k < 12; k++) {
        const s = rnd() * line.L * 0.7;
        VNETZ.at(line, s, _a);
        if (Math.hypot(_a.x - o[0], _a.y - o[1]) > 25 || !seen(_a.x, _a.y)) {
          d.s = s;
          break;
        }
      }
    }
    d.pz = pauses(Pl, line, key).filter(q => q.s > d.s);
    VNETZ.at(line, d.s, _a);
    d.x = _a.x;
    d.y = _a.y;
    d.hd = _a.hd;
    d.z = KERN.ground(d.x, d.y);
    S.busy[key] = 'ped';
    S.peds.push(d);
    S.stats.peds++;
    VFIG.load(key).then(f => {
      if (!f || !S.peds.includes(d)) return;
      d.f = f;
      S.idle[key] = 0;
      if (p.dog) d.dog = VFIG.dog(p.dog.kind);
    });
    return d;
  }
  function removePed(d) {
    const i = S.peds.indexOf(d);
    if (i >= 0) S.peds.splice(i, 1);
    if (d.f) {
      d.f.g.visible = false;
      d.f.walker.talking = false;
    }
    if (d.dog) d.dog.free();
    d.dog = null;
    if (UI.cur && UI.cur.d === d) UI.close();
    if (S.busy[d.key] === 'ped') S.busy[d.key] = null;
    S.idle[d.key] = 0;
    S.recent[d.key] = S.t + 60;
    markDirty();
  }
  // obstacles for walkers: vehicles standing or moving, the cars of the villagers and of the traffic, the player, other walkers
  function pedObstacles() {
    const O = [];
    if (P.mode === 'walk' && !PLAY.seated() && !S.ride) O.push({ x: P.x, y: P.y, r: 0.4, who: 'player' });
    for (const d of S.peds) O.push({ x: d.x, y: d.y, r: 0.3, who: d });
    for (const c of VAUTO.cars) {
      if (!c.g.visible) continue;
      for (const t of [-1.3, 0, 1.3])
        O.push({ x: c.x + Math.sin(c.hd) * (t - 0.19), y: c.y + Math.cos(c.hd) * (t - 0.19), r: 0.95, car: true });
    }
    if (VEH.list)
      for (const v of VEH.list) {
        if (!v.g.visible) continue;
        const s = v.st,
          b = v.spec.box;
        for (const t of [-1, 0, 1]) {
          const o = b.cy + t * Math.max(0, b.hl - b.hw);
          O.push({ x: s.x + Math.sin(s.psi) * o, y: s.y + Math.cos(s.psi) * o, r: b.hw, car: true });
        }
      }
    if (window.DCARS)
      for (const c of Object.values(window.DCARS.cars || {})) {
        if (!c.g.visible || !c.at) continue;
        const h = -c.g.rotation.y;
        for (const t of [-1.3, 0, 1.3])
          O.push({ x: c.at[0] + Math.sin(h) * t, y: c.at[1] + Math.cos(h) * t, r: 0.95, car: true });
      }
    return O;
  }
  function pedTick(d, dt, O) {
    const L = d.line,
      f = d.f,
      pl = P.mode === 'walk' && !PLAY.seated() && !VEH.cur && !S.ride,
      dpx = P.x - d.x,
      dpy = P.y - d.y,
      dp = Math.hypot(dpx, dpy);
    let sp = 0,
      hdT = null;
    if (d.st === 'gehen') {
      // what is ahead on the way: go round it on the right (towards the middle of the road), wait for the player when it is close
      let need = 0,
        stopAhead = false;
      for (const o of O) {
        if (o.who === d || Math.abs(o.x - d.x) > 9 || Math.abs(o.y - d.y) > 9) continue;
        const pr = VNETZ.project(L, o.x, o.y, d.s - 1.5, d.s + 7);
        if (!pr || pr.d > 4) continue;
        const ahead = pr.s - d.s,
          rel = pr.lat - d.dodge;
        if (Math.abs(rel) > o.r + 0.45 || ahead < -1) continue;
        if (o.who === 'player' && ahead > 0 && ahead < 1.3) stopAhead = true;
        need = Math.max(need, pr.lat + o.r + 0.45);
      }
      d.dodge += Math.sign(Math.min(3, need) - d.dodge) * Math.min(Math.abs(Math.min(3, need) - d.dodge), dt * 0.9);
      if (stopAhead && (d.wait += dt) < 2.5) sp = 0;
      else {
        if (!stopAhead) d.wait = 0;
        sp = d.v * (d.dodge > 0.5 ? 0.85 : 1);
      }
      d.s += sp * dt;
      // a pause where a house is (the front garden), the greeting in passing
      const pz = d.pz[0];
      if (pz && d.s >= pz.s) {
        d.pz.shift();
        d.st = 'schaut';
        d.t = pz.t;
        d.look = pz.look;
      }
      if (d.s >= L.L - 0.05) {
        d.s = L.L;
        d.st = 'ende';
      }
    }
    if (pl && !d.greeted && dp < 4.6 && (d.st === 'gehen' || d.st === 'schaut')) {
      const fx = Math.sin(d.hd),
        fy = Math.cos(d.hd);
      if ((dpx * fx + dpy * fy) / (dp || 1) > 0.1 || dp < 2.2) {
        d.greeted = true;
        d.st = 'gruesst';
        d.t = 2.2;
        const line = pick(d.p.pass);
        UI.subtitle(d, line);
        S.stats.greet++;
        KERN.emit('verkehr:gruss', { who: d.key, text: line });
      }
    }
    if (d.st === 'schaut') {
      hdT = d.look;
      if ((d.t -= dt) <= 0) d.st = 'gehen';
    } else if (d.st === 'gruesst') {
      hdT = Math.atan2(dpx, dpy);
      if ((d.t -= dt) <= 0) d.st = 'gehen';
    } else if (d.st === 'spricht') hdT = Math.atan2(dpx, dpy);
    // where: on the line, shifted to the right by the dodge
    VNETZ.at(L, d.s, _a);
    const r = [Math.cos(_a.hd), -Math.sin(_a.hd)];
    d.x = _a.x + r[0] * d.dodge;
    d.y = _a.y + r[1] * d.dodge;
    d.z = KERN.ground(d.x, d.y, d.z + 0.5);
    const want = hdT !== null ? hdT : _a.hd;
    d.hd = wrap(d.hd + wrap(want - d.hd) * Math.min(1, dt * (hdT !== null ? 4 : 6)));
    d.sp = sp;
    if (f) {
      if (!f.g.visible) {
        f.g.visible = true;
        markDirty();
      }
      f.g.position.set(d.x, d.z, -d.y);
      f.g.rotation.y = -d.hd;
      f.anim(dt, sp);
      if (d.dog) {
        // the dog: a little ahead, on the side of the road's middle; sitting by its person while she stands
        const fw = [Math.sin(d.hd), Math.cos(d.hd)],
          rt = [Math.cos(d.hd), -Math.sin(d.hd)],
          dx = d.x + fw[0] * (sp > 0.1 ? 0.75 : 0.45) + rt[0] * 0.5,
          dy = d.y + fw[1] * (sp > 0.1 ? 0.75 : 0.45) + rt[1] * 0.5,
          g = d.dog.g;
        g.position.set(dx, KERN.ground(dx, dy, d.z + 0.5), -dy);
        g.rotation.y = -d.hd + (sp > 0.1 ? 0 : 0.6);
        g.visible = true;
        d.dog.anim(dt, sp);
      }
      if (sp > 0.05 || dp < 30) markDirty();
    }
  }
  const _h = new THREE.Vector3();
  function head(d) {
    const b = d.f && d.f.bones && d.f.bones.Head;
    if (b && d.f.g.visible) {
      const v = b.getWorldPosition(_h);
      return [v.x, -v.z, v.y];
    }
    return [d.x, d.y, d.z + (d.p.h || 1.7) - 0.1];
  }
  // ---- cars ----
  function carRoute(Pl, a, b) {
    const k = a + '-' + b;
    if (Pl.routes.has(k)) return Pl.routes.get(k);
    const path = VNETZ.route(Pl.G, a, b, Pl.cost);
    const line = path
      ? VNETZ.line(path, { off: e => laneOff(e), vmax: e => vmaxOf(Pl, e), cut: 6, aLat: 2.0, aBrk: 2.0, vMin: 2.6 })
      : null;
    if (line) {
      line.lane = new Float32Array(line.n);
      // the lane offset per metre (how far one may go to the left round a walker)
      let s = 0;
      for (const { e } of path) {
        const n = Math.ceil(e.len);
        for (let i = 0; i < n && s < line.n; i++, s++) line.lane[s] = laneOff(e);
      }
      line.ex = [a, b];
    }
    Pl.routes.set(k, line);
    return line;
  }
  // the closest point of a line to the observer (every 4 m)
  function closest(line, o) {
    let best = 1e9,
      bs = 0;
    for (let i = 0; i < line.n; i += 4) {
      const d = Math.hypot(line.X[i] - o[0], line.Y[i] - o[1]);
      if (d < best) {
        best = d;
        bs = i * line.step;
      }
    }
    return { d: best, s: bs };
  }
  function driverFor(Pl, who) {
    if (who) return S.busy[who] ? null : who;
    const c = VLEUTE.KEYS.filter(k => PP[k].car && PP[k].where.includes(Pl.id) && !S.busy[k]);
    return c.length ? pick(c) : null;
  }
  function spawnCar(Pl, o, opt = {}) {
    const who = driverFor(Pl, opt.who);
    if (!who || Pl.exits.length < 2) return null;
    // a route between two exits that passes near the observer; it starts out of sight, some 150–260 m before that point
    const cands = [];
    for (const a of Pl.exits)
      for (const b of Pl.exits) {
        if (a === b) continue;
        const line = carRoute(Pl, a, b);
        if (!line) continue;
        const cl = closest(line, o);
        cands.push({ line, cl, w: cl.d < 90 ? 3 : cl.d < 180 ? 1.2 : 0.3 });
      }
    if (!cands.length) return null;
    let sum = cands.reduce((s, q) => s + q.w, 0),
      r = rnd() * sum,
      ch = cands[0];
    for (const q of cands)
      if ((r -= q.w) <= 0) {
        ch = q;
        break;
      }
    const line = ch.line;
    let s = 0;
    if (opt.s !== undefined) s = opt.s;
    else if (opt.prime) s = Math.max(0, ch.cl.s - 60 - rnd() * 120);
    else {
      s = Math.max(0, ch.cl.s - (150 + rnd() * 110));
      // never appear in sight: back along the line until it is hidden (or the start)
      for (let k = 0; k < 30 && s > 0; k++) {
        VNETZ.at(line, s, _a);
        if (!seen(_a.x, _a.y) && Math.hypot(_a.x - o[0], _a.y - o[1]) > 90) break;
        s = Math.max(0, s - 15);
      }
    }
    VNETZ.at(line, s, _a);
    if (!opt.prime && opt.s === undefined && seen(_a.x, _a.y) && Math.hypot(_a.x - o[0], _a.y - o[1]) < 120)
      return null;
    const c = VAUTO.spawn({ place: Pl.id, line, s, who, col: PP[who].car, v: Math.min(line.S[Math.round(s)] || 8, 9) });
    c.vk = 0.92 + rnd() * 0.12;
    c.laneOff = 1.2;
    S.busy[who] = 'car';
    S.stats.cars++;
    return c;
  }
  function removeCar(c) {
    VAUTO.remove(c);
    if (S.busy[c.who] === 'car' || S.busy[c.who] === 'driver') S.busy[c.who] = null;
    if (S.halted === c) S.halted = null;
    if (UI.cur && UI.cur.c === c) UI.close();
  }
  // ---- population: how many by the hour, spawning out of sight, letting go far away ----
  function target(Pl) {
    if (S.force) return [S.force.peds ?? 0, S.force.cars ?? 0];
    const h = hour(),
      row = Pl.day.find(r => h >= r[0] && h < r[1]) || [0, 24, 0, 0];
    let p = row[2],
      c = row[3];
    if (COARSE) {
      p = Math.min(p, 2);
      c = Math.min(c, 1.5);
    }
    return [p, c];
  }
  const count = n => Math.floor(n) + (rnd() < n - Math.floor(n) ? 1 : 0);
  function placeTick(Pl, dt, o) {
    if (!Pl.alive()) {
      dropPlace(Pl);
      Pl.dead = true;
      return;
    }
    const d0 = Math.hypot(o[0] - Pl.c[0], o[1] - Pl.c[1]),
      [tp, tc] = target(Pl),
      peds = S.peds.filter(d => d.place === Pl.id),
      cars = VAUTO.cars.filter(c => c.place === Pl.id && c.st !== 'geliehen');
    // walkers only while the observer is in the place itself (not in the garden: they would load for nobody)
    if (S.auto && d0 < Pl.walkR + 40 && !inAvoid(Pl, o[0], o[1]) && (Pl.nextPed -= dt) <= 0) {
      const n = count(tp),
        prime = !Pl.primed; // the first ones are already on their way (the place was empty when one came)
      Pl.primed = true;
      Pl.nextPed = 4 + rnd() * 9;
      for (let k = peds.length; k < Math.min(n, COARSE ? 2 : 4) && k < peds.length + (prime ? 4 : 1); k++) {
        const free = VLEUTE.KEYS.filter(
          q => !S.busy[q] && PP[q].where.includes(Pl.id) && VFIG.avail(q) && !(S.recent[q] > S.t)
        );
        if (!free.length || !spawnPed(Pl, pick(free), o, prime)) break;
      }
    }
    if (S.auto && d0 < Pl.carR + 60 && (Pl.nextCar -= dt) <= 0) {
      Pl.nextCar = 12 + rnd() * 25;
      const n = count(tc);
      if (cars.length < Math.min(n, COARSE ? 2 : 3)) spawnCar(Pl, o, { prime: !Pl.carPrimed });
      Pl.carPrimed = true;
    }
    for (const c of cars) if (c.line.lane) c.laneOff = c.line.lane[Math.min(c.line.n - 1, Math.floor(c.s))] || 1.2;
    // walkers far away and out of sight: gone; at the end of their way: gone when nobody looks
    for (const d of peds) {
      const far = Math.hypot(d.x - o[0], d.y - o[1]),
        vis = seen(d.x, d.y);
      d.unseen = vis ? 0 : d.unseen + dt;
      if ((d.st === 'ende' && (!vis || far > 60)) || (far > 190 && d.unseen > 2) || (S.t - d.born > 900 && !vis))
        removePed(d);
      else if (d.st === 'ende' && d.unseen === 0 && (d.endT = (d.endT || 0) + dt) > 20) {
        // seen standing at the end of the way for long: on along a new way
        const line = walkRoute(Pl, [d.x, d.y], false);
        if (line) {
          d.line = line;
          d.s = 0;
          d.st = 'gehen';
          d.pz = pauses(Pl, line, d.key);
          d.endT = 0;
        }
      }
    }
    for (const c of cars) {
      if (c === S.halted || (S.ride && S.ride.c === c)) continue;
      const far = Math.hypot(c.x - o[0], c.y - o[1]),
        vis = seen(c.x, c.y);
      c.unseen = vis ? 0 : (c.unseen || 0) + dt;
      if (c.st === 'ende' || (far > 320 && c.unseen > 3) || (c.age > 400 && c.unseen > 5)) removeCar(c);
    }
  }
  // ---- the talk panel and the subtitles (the look of the villagers' panel, shell/css/verkehr.css) ----
  const UI = (() => {
    const host = ($('npcpanel') && $('npcpanel').parentNode) || $('stage') || document.body;
    const el = document.createElement('aside');
    el.id = 'verkehrpanel';
    el.hidden = true;
    el.setAttribute('aria-label', 'Gespräch auf der Straße');
    el.innerHTML =
      '<header><div class="who"><h3></h3><span class="role"></span></div><button type="button" class="x" aria-label="Schließen">×</button></header>' +
      '<div class="say"></div><div class="topics"></div>';
    host.appendChild(el);
    const sub = document.createElement('div');
    sub.id = 'verkehrsub';
    sub.hidden = true;
    host.appendChild(sub);
    const h3 = el.querySelector('h3'),
      role = el.querySelector('.role'),
      sayEl = el.querySelector('.say'),
      tp = el.querySelector('.topics');
    const U = { cur: null, n: {}, el, sub };
    let subT = null;
    const figOf = r =>
      r && r.d ? r.d.f : r && r.c && S.lent && S.lent.c === r.c && S.lent.driver ? S.lent.driver.f : null;
    function mouth(f, text) {
      if (!f) return;
      f.walker.talking = true;
      clearTimeout(f._tt);
      f._tt = setTimeout(() => (f.walker.talking = false), Math.max(2200, text.length * 60));
    }
    U.subtitle = (r, text, ms) => {
      const k = r && (r.key || r.who);
      sub.textContent = (k && PP[k] ? PP[k].name + ': ' : '') + text;
      sub.hidden = false;
      clearTimeout(subT);
      subT = setTimeout(() => (sub.hidden = true), ms || Math.max(2600, text.length * 62));
      if (r && r.f) mouth(r.f, text);
    };
    function button(label, fn, cls) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = label;
      if (cls) b.className = cls;
      b.addEventListener('click', fn);
      tp.appendChild(b);
      return b;
    }
    const free = () => !!(KI && KI.ready);
    function topics(k) {
      for (const [id, [label, ...lines]] of Object.entries(PP[k].topics))
        button(label, () => {
          const n = (U.n[k + id] = (U.n[k + id] || 0) + 1);
          U.say(lines[(n - 1) % lines.length]);
        });
    }
    U.say = text => {
      sayEl.textContent = text;
      mouth(figOf(U.cur), text);
    };
    U.line = () => sayEl.textContent;
    function top(k, extra) {
      const p = PP[k];
      h3.textContent = p.full;
      role.textContent = p.age + ' · ' + p.role + (extra || '');
      el.hidden = false;
      tp.innerHTML = '';
    }
    // a walker: greeting, small talk (or the free conversation), bye
    U.openPed = d => {
      if (U.cur) U.close();
      const k = d.key,
        p = d.p;
      U.cur = { d, key: k };
      top(k, p.dog ? ' · mit ' + p.dog.name : '');
      d.st = 'spricht';
      const n = (U.n[k] = (U.n[k] || 0) + 1);
      U.say(p.greet[(n - 1) % p.greet.length]);
      if (!free()) topics(k);
      button('Tschüss', () => U.close(), 'bye');
      KERN.emit('talk', { who: 'vk_' + k });
      if (KI && KI.talk && KI.person) KI.talk('vk_' + k);
      markDirty();
    };
    // the driver of a car that has stopped: along with him, drive it oneself, a word, bye
    U.openCar = c => {
      if (U.cur) U.close();
      const k = c.who;
      U.cur = { c, key: k };
      top(k, ' · im Auto');
      U.say(say(k, 'halt', c.ziel));
      button('Mitfahren', () => ride(c), 'quest');
      button('Selbst fahren', () => selbst(c), 'quest');
      if (!free()) topics(k);
      button(
        'Tschüss',
        () => {
          U.close();
          driveOn(c);
        },
        'bye'
      );
      KERN.emit('talk', { who: 'vk_' + k });
      if (KI && KI.talk && KI.person) KI.talk('vk_' + k);
      markDirty();
    };
    U.close = () => {
      const r = U.cur;
      if (!r) return;
      U.cur = null;
      el.hidden = true;
      const f = figOf(r);
      if (f) f.walker.talking = false;
      if (r.d && r.d.st === 'spricht') r.d.st = 'gehen';
      if (KI && KI.ended && KI.person) KI.ended('vk_' + r.key);
    };
    el.querySelector('.x').addEventListener('click', () => U.close());
    window.addEventListener('keydown', e => {
      if (e.key === 'Escape' && U.cur) {
        U.close();
        e.stopPropagation();
      }
    });
    return U;
  })();
  // ---- the free conversation (npc/ki.js): every person registered, the panel above is theirs ----
  if (KI && KI.person)
    for (const k of VLEUTE.KEYS) {
      const p = PP[k];
      KI.person({
        key: 'vk_' + k,
        name: p.name,
        g: p.g,
        age: p.age,
        role: p.role,
        sheet: p.sheet,
        pos: () => {
          const d = S.peds.find(q => q.key === k);
          if (d) return [d.x, d.y];
          const c = VAUTO.cars.find(q => q.who === k);
          return c ? [c.x, c.y] : [P.x, P.y];
        },
        mouth: on => {
          const d = S.peds.find(q => q.key === k),
            f = d ? d.f : S.lent && S.lent.who === k && S.lent.driver ? S.lent.driver.f : null;
          if (f) f.walker.talking = !!on;
        },
        sub: t => UI.subtitle({ key: k }, t),
        show: t => UI.cur && UI.cur.key === k && UI.say(t || '…'),
        host: () => UI.el,
        close: () => UI.close(),
        line: () => UI.line(),
      });
    }
  // ---- waving a car down, riding along, driving it ----
  const HW = VAUTO.DIM.HW;
  // beside the car on the right (the passenger door), out of walls
  function outRight(c, back = 0.3) {
    const r = [Math.cos(c.hd), -Math.sin(c.hd)],
      f = [Math.sin(c.hd), Math.cos(c.hd)];
    for (const side of [HW + 0.65, HW + 1.1, -(HW + 0.65)]) {
      const p = [c.x + r[0] * side - f[0] * back, c.y + r[1] * side - f[1] * back],
        q = p.slice();
      KERN.pushOut(q, 0.3);
      if (Math.hypot(q[0] - p[0], q[1] - p[1]) < 0.05) return [p[0], p[1], KERN.ground(p[0], p[1], c.z + 0.5)];
    }
    const p = [c.x + r[0] * (HW + 0.65), c.y + r[1] * (HW + 0.65)];
    return [p[0], p[1], KERN.ground(p[0], p[1], c.z + 0.5)];
  }
  // where a ride ends: a named place ahead on the way (≥ 80 m), else some 300 m on
  function rideStop(c) {
    const Pl = S.places[c.place],
      L = c.line;
    let best = null;
    for (const [x, y, name] of (Pl && Pl.stops) || []) {
      const pr = VNETZ.project(L, x, y, c.s + 80, L.L - 20);
      if (pr && pr.d < 45 && (!best || pr.s < best.s)) best = { s: pr.s, name };
    }
    if (!best) best = { s: Math.min(L.L - 25, c.s + 260 + rnd() * 120), name: 'ein Stück weiter' };
    if (best.s < c.s + 40) return null;
    return best;
  }
  function wave(c) {
    if (!c || c.st !== 'fahren' || S.halted || S.ride || S.lent) return false;
    const st = rideStop(c);
    c.ziel = st ? st.name : 'ein Stück weiter';
    c.rstop = st;
    if (!VAUTO.halt(c, P.x, P.y, () => arrived(c))) return false;
    S.halted = c;
    c.waved = true;
    c.haltT = 0;
    S.busy[c.who] = 'car';
    PLAY.think('Du winkst dem Auto.', 1800);
    VFIG.load(c.who); // the driver, in case he gets out
    return true;
  }
  function arrived(c) {
    c.haltT = 0;
    KERN.emit('verkehr:angehalten', { car: c.id, who: c.who, x: c.x, y: c.y });
    if (Math.hypot(P.x - c.x, P.y - c.y) < 12 && !UI.cur && !NPCUI.cur() && !(DORF.UI && DORF.UI.cur)) UI.openCar(c);
  }
  function driveOn(c) {
    if (S.halted === c) S.halted = null;
    c.waved = false;
    if (c.st === 'steht' || c.st === 'halt') VAUTO.go(c);
  }
  // „Mitfahren“: as a passenger (first person, seat on the right) to the stop of the ride, then out on the right
  function ride(c) {
    if (S.ride || PLAY.seated() || VEH.cur) return false;
    const st = c.rstop || rideStop(c);
    if (!st) {
      UI.say('Ach, ich bin gleich da – das lohnt sich nicht mehr. Tschüss!');
      return false;
    }
    UI.close();
    S.halted = null;
    S.ride = { c, stop: st, from: [P.x, P.y] };
    let lastHd = c.hd;
    const eye = () => {
      const r = [Math.cos(c.hd), -Math.sin(c.hd)],
        f = [Math.sin(c.hd), Math.cos(c.hd)];
      return { x: c.x + r[0] * 0.36 - f[0] * 0.22, y: c.y + r[1] * 0.36 - f[1] * 0.22, z: c.z + 1.17 };
    };
    PLAY.sit({
      kind: 'ride',
      fp: true,
      get lock() {
        return c.v > 0.4;
      },
      lockMsg: 'Während der Fahrt bleibst du sitzen.',
      follow: () => {
        const d = wrap(c.hd - lastHd);
        P.yaw += (d * 180) / Math.PI;
        lastHd = c.hd;
        return eye();
      },
      yaw: (c.hd * 180) / Math.PI,
      pitch: -3,
      get back() {
        return outRight(c);
      },
      set back(x) {},
      onLeave: () => {
        if (S.ride && S.ride.c === c) {
          // out early (it stood): it drives on
          S.ride = null;
          setTimeout(() => c.st !== 'weg' && VAUTO.go(c), 1500);
        }
      },
    });
    UI.subtitle({ key: c.who }, say(c.who, 'mit', st.name));
    S.stats.rides++;
    KERN.emit('verkehr:mitfahrt', { car: c.id, who: c.who, ziel: st.name, phase: 'ein' });
    VAUTO.go(c, { s: st.s, kerb: true, then: 'steht', done: () => letOut(c) });
    c.kerbRoom = 0.5;
    return true;
  }
  function letOut(c) {
    const R = S.ride;
    if (!R || R.c !== c) return;
    S.ride = null;
    PLAY.stand(true);
    UI.subtitle({ key: c.who }, say(c.who, 'ab'));
    KERN.emit('verkehr:mitfahrt', { car: c.id, who: c.who, ziel: R.stop.name, phase: 'aus', x: P.x, y: P.y });
    setTimeout(() => c.st !== 'weg' && VAUTO.go(c), 2200);
  }
  // „Selbst fahren“: the car becomes the extra vehicle (vehicles/vehicle.js), the driver waits at the kerb
  function selbst(c) {
    if (S.lent || PLAY.seated() || VEH.cur) return false;
    const text = say(c.who, 'selbst');
    UI.close();
    const out = outRight(c, 1.4),
      v = VAUTO.lend(c);
    if (!v) {
      PLAY.think('Das geht gerade nicht.');
      return false;
    }
    S.halted = null;
    S.lent = { c, who: c.who, st: 'fahren', t: 0, driver: null, told: false, entered: false };
    S.busy[c.who] = 'driver';
    S.stats.lent++;
    const L = S.lent;
    VFIG.load(c.who).then(f => {
      if (!f || S.lent !== L) return;
      L.driver = { f, x: out[0], y: out[1], z: out[2], hd: c.hd + Math.PI / 2 };
      f.g.visible = true;
      putFig(L.driver);
    });
    UI.subtitle({ key: c.who }, text, 4200);
    VEH.enter('verkehr');
    KERN.emit('verkehr:selbst', { car: c.id, who: c.who });
    return true;
  }
  function putFig(D) {
    D.f.g.position.set(D.x, D.z, -D.y);
    D.f.g.rotation.y = -D.hd;
  }
  // the lent car: is the player in it? when he leaves it, the driver walks over and drives on – or fetches it later
  function lentTick(dt) {
    const L = S.lent,
      v = VAUTO.veh(),
      w = VAUTO.where();
    if (!L || !v || !w) return;
    const inIt = VEH.cur === v;
    L.t += dt;
    if (inIt) {
      L.entered = true;
      if (L.st !== 'fahren') {
        L.st = 'fahren';
        L.t = 0;
      }
    } else if (L.st === 'fahren' && L.entered) {
      L.st = 'abgestellt';
      L.t = 0;
    }
    const D = L.driver;
    if (D) {
      if (L.st === 'holt') {
        // to the driver's door (left)
        const tx = w.x - Math.cos(w.psi) * (HW + 0.6),
          ty = w.y + Math.sin(w.psi) * (HW + 0.6),
          dx = tx - D.x,
          dy = ty - D.y,
          dd = Math.hypot(dx, dy);
        if (dd < 0.5) giveBack();
        else {
          const st = Math.min(dd, 1.35 * dt),
            q = [D.x + (dx / dd) * st, D.y + (dy / dd) * st];
          KERN.pushOut(q, 0.3);
          D.x = q[0];
          D.y = q[1];
          D.z = KERN.ground(D.x, D.y, D.z + 0.5);
          D.hd = Math.atan2(dx, dy);
          putFig(D);
          D.f.anim(dt, 1.35);
          markDirty();
        }
      } else {
        D.hd = wrap(D.hd + wrap(Math.atan2(w.x - D.x, w.y - D.y) - D.hd) * Math.min(1, dt * 2));
        putFig(D);
        D.f.anim(dt, 0);
      }
    }
    if (!S.lent) return;
    // put back home by the menu („Fahrzeuge zurückstellen“) or out in the fields: fetched
    if (!w.shown || Math.hypot(w.x - VAUTO.HIDE[0], w.y - VAUTO.HIDE[1]) < 5) return fetched(true);
    if (L.st === 'abgestellt') {
      const dDrv = D ? Math.hypot(w.x - D.x, w.y - D.y) : 1e9;
      if (D && dDrv < 80 && L.t > 2) {
        L.st = 'holt';
        UI.subtitle({ key: L.who }, dDrv < 6 ? 'Danke!' : 'Ich komm’ schon!', 2200);
      } else if (!D || dDrv >= 80) {
        if (!L.told && L.t > 1.5) {
          L.told = true;
          PLAY.think(D ? VLEUTE.DRIVE.fern : VLEUTE.DRIVE.holt, 4200);
        }
        if ((Math.hypot(P.x - w.x, P.y - w.y) > 50 && !seen(w.x, w.y)) || L.t > 120) fetched(false);
      }
    } else if (L.st === 'holt' && inIt) L.st = 'fahren';
  }
  // the driver is at his car: a word, he gets in and drives on along the nearest road (or leaves it be if it stands off the roads)
  function giveBack() {
    const L = S.lent,
      w = VAUTO.where(),
      Pl = S.places[L.c.place];
    let line = null,
      s0 = 0;
    if (Pl && Pl.G && w) {
      // the nearest way of the place, in the direction the car stands; from there to an exit
      let best = null;
      for (const e of Pl.G.edges)
        for (let k = 0; k + 1 < e.pts.length; k++) {
          const a = e.pts[k],
            b = e.pts[k + 1],
            dx = b[0] - a[0],
            dy = b[1] - a[1],
            l2 = dx * dx + dy * dy || 1,
            t = Math.max(0, Math.min(1, ((w.x - a[0]) * dx + (w.y - a[1]) * dy) / l2)),
            d = Math.hypot(w.x - a[0] - dx * t, w.y - a[1] - dy * t);
          if (d < 9 && (!best || d < best.d)) best = { e, d, fwd: Math.sin(w.psi) * dx + Math.cos(w.psi) * dy >= 0 };
        }
      if (best) {
        const from = best.fwd ? best.e.b : best.e.a,
          exits = Pl.exits.filter(x => x !== from && VNETZ.route(Pl.G, from, x, Pl.cost)),
          to = exits.length ? pick(exits) : null,
          path = to !== null ? VNETZ.route(Pl.G, from, to, Pl.cost) : [];
        if (path) {
          const full = [{ e: best.e, fwd: best.fwd }, ...path];
          line = VNETZ.line(full, {
            off: e => laneOff(e),
            vmax: e => vmaxOf(Pl, e),
            cut: 6,
            aLat: 2.0,
            aBrk: 2.0,
            vMin: 2.6,
          });
          if (line) {
            const pr = VNETZ.project(line, w.x, w.y, 0, 60);
            s0 = pr ? pr.s : 0;
            if (line.L - s0 < 30) line = null;
          }
        }
      }
    }
    const k = L.who,
      D = L.driver;
    if (D) D.f.g.visible = false;
    UI.subtitle({ key: k }, say(k, 'back'), 3600);
    S.stats.back++;
    if (line) {
      const c = VAUTO.unlend(line, s0);
      S.lent = null;
      S.busy[k] = 'car';
      KERN.emit('verkehr:zurueck', { car: c.id, who: k, faehrt: true });
      setTimeout(() => c.st !== 'weg' && VAUTO.go(c), 1800);
    } else {
      // off the roads (a field, a yard): he drives it off when nobody looks
      L.driver = null;
      PLAY.think(VLEUTE.DRIVE.fern, 4000);
      L.told = true;
      L.t = 0;
      L.st = 'abgestellt';
    }
  }
  function fetched(quiet) {
    const L = S.lent;
    if (!L) return;
    VAUTO.unlend(null);
    if (L.driver) L.driver.f.g.visible = false;
    VAUTO.remove(L.c);
    S.busy[L.who] = null;
    S.lent = null;
    S.stats.fetched++;
    if (!quiet) KERN.emit('verkehr:zurueck', { car: L.c.id, who: L.who, faehrt: false, geholt: true });
  }
  // ---- the action button: talk to a walker, wave a car down, talk to the driver ----
  const busyUI = () => !!(NPCUI.cur() || (DORF.UI && DORF.UI.cur));
  KERN.act({
    id: 'verkehr:reden',
    r: 2.6,
    prio: -0.25,
    label: () => {
      const d = S.nearPed;
      return d && d.f && d.f.g.visible && (!UI.cur || UI.cur.d !== d) && !busyUI()
        ? 'Mit ' + d.p.name + ' sprechen'
        : null;
    },
    pos: () => (S.nearPed ? head(S.nearPed) : null),
    run: () => S.nearPed && UI.openPed(S.nearPed),
  });
  KERN.act({
    id: 'verkehr:winken',
    r: 3,
    prio: 0.4,
    label: () => (S.waveCar && !busyUI() ? 'Auto anhalten' : null),
    pos: () => {
      const c = S.waveCar;
      if (!c) return null;
      const dx = c.x - P.x,
        dy = c.y - P.y,
        d = Math.hypot(dx, dy) || 1;
      return [P.x + (dx / d) * 1.2, P.y + (dy / d) * 1.2, P.feet + 1.2];
    },
    run: () => wave(S.waveCar),
  });
  KERN.act({
    id: 'verkehr:fahrer',
    r: 3.4,
    prio: 0.5,
    label: () => {
      const c = S.halted;
      return c && c.st === 'steht' && (!UI.cur || UI.cur.c !== c) && !busyUI()
        ? 'Mit ' + PP[c.who].name + ' reden'
        : null;
    },
    pos: () => {
      const c = S.halted;
      if (!c) return null;
      return [c.x + Math.cos(c.hd) * HW, c.y - Math.sin(c.hd) * HW, c.z + 1.1];
    },
    run: () => S.halted && UI.openCar(S.halted),
  });
  // ---- on the drive between the places: now and then an oncoming car on the road the player drives (welt/fahrt.js roads beyond the
  // square, world/roads.js inside it) – it comes from 400 m ahead in the other lane, passes and is gone behind ----
  const FAHR = { next: 15, n: 0 };
  function roadLine(x, y, psi) {
    const F = FAHRT && FAHRT.ready && FAHRT.data && FAHRT.data.ways && FAHRT.active,
      src = [];
    if (F)
      for (const w of FAHRT.data.ways) {
        if (
          w.kind < 1 ||
          w.kind > 3 ||
          w.bb[2] < x - 700 ||
          w.bb[0] > x + 700 ||
          w.bb[3] < y - 700 ||
          w.bb[1] > y + 700
        )
          continue;
        const p = [];
        for (let i = 0; i < w.n; i++) p.push(w.p[i * 3], w.p[i * 3 + 1]);
        src.push({ kind: w.kind, w: w.hw * 2, p });
      }
    else if (ROADS.ready) for (const w of ROADS.ways) if (w.kind >= 1 && w.kind <= 3) src.push(w);
    if (!src.length) return null;
    const G = VNETZ.graph(src, { kinds: new Set([1, 2, 3]), clip: [x, y, 650] }),
      fx = Math.sin(psi),
      fy = Math.cos(psi);
    // the edge under the player, in his direction
    let cur = null;
    for (const e of G.edges)
      for (let k = 0; k + 1 < e.pts.length; k++) {
        const a = e.pts[k],
          b = e.pts[k + 1],
          dx = b[0] - a[0],
          dy = b[1] - a[1],
          l = Math.hypot(dx, dy) || 1,
          t = Math.max(0, Math.min(1, ((x - a[0]) * dx + (y - a[1]) * dy) / (l * l))),
          d = Math.hypot(x - a[0] - dx * t, y - a[1] - dy * t),
          al = (dx * fx + dy * fy) / l;
        if (d < 8 && Math.abs(al) > 0.6 && (!cur || d < cur.d)) cur = { e, d, fwd: al > 0 };
      }
    if (!cur) return null;
    // on along the way with the smallest turn, ahead 420 m and back 150 m
    const dirAt = (e, fwd, end) => {
      const q = fwd ? e.pts : e.pts.slice().reverse(),
        a = end ? q[q.length - 2] : q[0],
        b = end ? q[q.length - 1] : q[1];
      return Math.atan2(b[0] - a[0], b[1] - a[1]);
    };
    function walk(e, fwd, len) {
      const out = [];
      let acc = 0;
      for (let hop = 0; hop < 20 && acc < len; hop++) {
        const node = fwd ? e.b : e.a,
          h0 = dirAt(e, fwd, true);
        let best = null;
        for (const n of G.nodes[node].edges) {
          if (n === e) continue;
          const nf = n.a === node,
            tu = Math.abs(wrap(dirAt(n, nf, false) - h0));
          if (tu < 1.1 && (!best || tu < best.tu)) best = { e: n, fwd: nf, tu };
        }
        if (!best) break;
        out.push({ e: best.e, fwd: best.fwd });
        acc += best.e.len;
        e = best.e;
        fwd = best.fwd;
      }
      return out;
    }
    const ahead = walk(cur.e, cur.fwd, 420),
      back = walk(cur.e, !cur.fwd, 150);
    // the player's way from behind to ahead; the car takes it the other way round
    const mine = [...back.reverse().map(p => ({ e: p.e, fwd: !p.fwd })), { e: cur.e, fwd: cur.fwd }, ...ahead];
    const theirs = mine.reverse().map(p => ({ e: p.e, fwd: !p.fwd }));
    const line = VNETZ.line(theirs, {
      off: e => laneOff(e),
      vmax: e => (e.kind <= 2 ? 19.4 : 13.9),
      cut: 6,
      aLat: 2.0,
      aBrk: 2.0,
      vMin: 3,
    });
    if (!line) return null;
    const pr = VNETZ.project(line, x, y, 0, line.L);
    if (!pr || pr.s < 250) return null;
    return { line, s0: Math.max(0, pr.s - 420) };
  }
  function fahrTick(dt, o) {
    for (const c of VAUTO.cars) {
      if (c.place !== 'fahrt' || c === S.halted || (S.ride && S.ride.c === c) || (S.lent && S.lent.c === c)) continue;
      const d = Math.hypot(c.x - o[0], c.y - o[1]);
      if (c.st === 'ende' || (d > 450 && !seen(c.x, c.y)) || c.age > 300) removeCar(c);
    }
    const v = VEH.cur;
    if (!v || !S.auto || (FAHR.next -= dt) > 0) return;
    FAHR.next = 30 + rnd() * 45;
    // the places have their own traffic; at night rarely; only while one drives on
    if (Object.values(S.places).some(Pl => Math.hypot(o[0] - Pl.c[0], o[1] - Pl.c[1]) < Pl.carR + 100)) return;
    const h = hour();
    if ((h < 5 || h >= 23) && rnd() > 0.25) return;
    if (Math.hypot(v.st.u, v.st.v) < 5 || VAUTO.cars.some(c => c.place === 'fahrt')) return;
    const who = VLEUTE.KEYS.filter(k => PP[k].car && !S.busy[k]);
    if (!who.length) return;
    const r = roadLine(v.st.x, v.st.y, v.st.psi);
    if (!r) return;
    const k = pick(who),
      c = VAUTO.spawn({ place: 'fahrt', line: r.line, s: r.s0, who: k, col: PP[k].car, v: 14 });
    c.vk = 0.9 + rnd() * 0.1;
    c.laneOff = 1.3;
    S.busy[k] = 'car';
    S.stats.cars++;
    FAHR.n++;
  }
  // ---- per frame ----
  let acc = 0;
  function tick(dt) {
    dt = Math.min(dt, 0.25);
    S.t += dt;
    cam.getWorldDirection(_f);
    const fl = Math.hypot(_f.x, _f.z) || 1;
    camF = [_f.x / fl, -_f.z / fl];
    const o = KERN.where() || [P.x, P.y];
    const live = Object.values(S.places).filter(Pl => Pl.on);
    for (const Pl of Object.values(S.places))
      if (Pl.dead && Pl.ready && Pl.ready() && KERN.zones().find(z => z.id === 'verkehr:' + Pl.id)?.state === 'ready') {
        Pl.dead = false;
        try {
          buildPlace(Pl);
        } catch (e) {
          S.err = String(e);
        }
      }
    try {
      for (const Pl of live) placeTick(Pl, dt, o);
    } catch (e) {
      if (!S.err) console.warn('verkehr', e);
      S.err = String((e && e.message) || e);
    }
    // walkers
    const O = S.peds.length ? pedObstacles() : [];
    let near = null,
      nd = 2.6;
    for (const d of S.peds) {
      pedTick(d, dt, O);
      if (d.f && d.f.g.visible) {
        const dd = Math.hypot(d.x - P.x, d.y - P.y);
        if (dd < nd) {
          nd = dd;
          near = d;
        }
      }
    }
    S.nearPed = near;
    // cars: who they must not run into
    const W = [];
    if (P.mode === 'walk' && !PLAY.seated() && !S.ride && !VEH.cur) W.push({ x: P.x, y: P.y, r: 0.35, kind: 'player' });
    for (const d of S.peds) W.push({ x: d.x, y: d.y, r: 0.32, kind: 'ped' });
    if (S.lent && S.lent.driver) W.push({ x: S.lent.driver.x, y: S.lent.driver.y, r: 0.32, kind: 'ped' });
    for (const k in DPEOPLE.figs) {
      const f = DPEOPLE.figs[k];
      if (f.g.visible && f.at) W.push({ x: f.at.x, y: f.at.y, r: 0.32, kind: 'ped' });
    }
    VAUTO.tick(dt, {
      walkers: W,
      onHonk: c => {
        S.stats.honk++;
        UI.subtitle({ key: c.who }, pick(VLEUTE.DRIVE.hupe), 2400);
      },
    });
    // a car coming towards the player: „Auto anhalten“ (5 times a second)
    if ((acc += dt) > 0.2) {
      acc = 0;
      let best = null,
        bd = 1e9;
      if (P.mode === 'walk' && !PLAY.seated() && !VEH.cur && !S.ride && !S.lent && !S.halted)
        for (const c of VAUTO.cars) {
          if (c.st !== 'fahren' || !c.g.visible) continue;
          const d = Math.hypot(c.x - P.x, c.y - P.y);
          if (d > 48 || d < 7) continue;
          const pr = VNETZ.project(c.line, P.x, P.y, c.s + 6, c.s + 46);
          if (pr && Math.abs(pr.lat) < 8 && pr.s > c.s + 6 && d < bd) {
            bd = d;
            best = c;
          }
        }
      S.waveCar = best;
    }
    // the car waved down: it waits while the player is near (or talks), else it drives on after a while
    const h = S.halted;
    if (h && h.st === 'steht') {
      const d = Math.hypot(h.x - P.x, h.y - P.y),
        talking = UI.cur && UI.cur.c === h;
      h.haltT += dt;
      if ((!talking && d > 15) || (!talking && h.haltT > 45) || h.haltT > 240) {
        if (talking) UI.close();
        UI.subtitle({ key: h.who }, say(h.who, 'wieder'), 2600);
        driveOn(h);
      }
    }
    // talk: the panel closes when one walks away
    if (UI.cur) {
      const r = UI.cur,
        p = r.d ? [r.d.x, r.d.y] : r.c ? [r.c.x, r.c.y] : null;
      if (!p || Math.hypot(p[0] - P.x, p[1] - P.y) > (r.c ? 9 : 4.8) || (r.d && !S.peds.includes(r.d))) UI.close();
    }
    if (S.lent) lentTick(dt);
    fahrTick(dt, o);
    // figures nobody needs any more: freed after a while (memory on the phone)
    for (const k of Object.keys(VFIG.figs)) {
      const used = S.peds.some(d => d.key === k) || (S.lent && S.lent.who === k && S.lent.driver);
      if (used) S.idle[k] = 0;
      else if ((S.idle[k] = (S.idle[k] || 0) + dt) > 15) {
        VFIG.drop(k);
        delete S.idle[k];
      }
    }
  }
  KERN.tick(tick, 'verkehr/verkehr');
  // ---- tests and the console ----
  const state = () => ({
    places: Object.fromEntries(
      Object.values(S.places).map(Pl => [
        Pl.id,
        {
          on: !!Pl.on,
          ms: Pl.ms,
          carNodes: Pl.G ? Pl.G.nodes.length : 0,
          carEdges: Pl.G ? Pl.G.edges.length : 0,
          walkEdges: Pl.W ? Pl.W.edges.length : 0,
          walkOk: Pl.W ? Pl.W.edges.filter(e => e.wo[0] !== null || e.wo[1] !== null).length : 0,
          exits: Pl.exits ? Pl.exits.length : 0,
          target: target(Pl),
        },
      ])
    ),
    peds: S.peds.map(d => ({
      key: d.key,
      place: d.place,
      st: d.st,
      x: +d.x.toFixed(1),
      y: +d.y.toFixed(1),
      z: +d.z.toFixed(2),
      s: +d.s.toFixed(1),
      L: +d.line.L.toFixed(0),
      shown: !!(d.f && d.f.g.visible),
      dog: !!d.dog,
      greeted: d.greeted,
    })),
    cars: VAUTO.cars.map(c => ({
      id: c.id,
      who: c.who,
      place: c.place,
      st: c.st,
      x: +c.x.toFixed(1),
      y: +c.y.toFixed(1),
      z: +c.z.toFixed(2),
      hd: +((c.hd * 180) / Math.PI).toFixed(0),
      v: +c.v.toFixed(2),
      s: +c.s.toFixed(1),
      L: +c.line.L.toFixed(0),
      lat: +c.lat.toFixed(2),
      why: c.why,
      shown: c.g.visible,
    })),
    halted: S.halted ? S.halted.id : null,
    ride: S.ride ? { car: S.ride.c.id, ziel: S.ride.stop.name, s: S.ride.stop.s } : null,
    lent: S.lent ? { car: S.lent.c.id, who: S.lent.who, st: S.lent.st, driver: !!S.lent.driver } : null,
    waveCar: S.waveCar ? S.waveCar.id : null,
    nearPed: S.nearPed ? S.nearPed.key : null,
    panel: UI.cur ? UI.cur.key : null,
    figs: Object.keys(VFIG.figs),
    loads: VFIG.loads,
    drops: VFIG.drops,
    requests: VFIG.requests.slice(),
    figErr: VFIG.err,
    stats: Object.assign({}, S.stats),
    err: S.err,
  });
  // a walker now (key, place; near: [x, y] the observer to pass by)
  function addPed(key, place = 'dorf', near = null, prime = true) {
    const Pl = S.places[place];
    if (!Pl || !Pl.on || S.busy[key]) return null;
    const d = spawnPed(Pl, key, near || KERN.where() || [P.x, P.y], prime);
    return d ? d.key : null;
  }
  // a car now: { place, who, s (on the route), near: [x, y], from, to (exits) }
  function addCar(o = {}) {
    const Pl = S.places[o.place || 'dorf'];
    if (!Pl || !Pl.on) return null;
    if (o.from !== undefined && o.to !== undefined) {
      const line = carRoute(Pl, o.from, o.to),
        who = driverFor(Pl, o.who);
      if (!line || !who) return null;
      const c = VAUTO.spawn({ place: Pl.id, line, s: o.s || 0, who, col: PP[who].car, v: o.v ?? 0 });
      c.vk = 1;
      c.laneOff = 1.2;
      S.busy[who] = 'car';
      S.stats.cars++;
      return c.id;
    }
    const c = spawnCar(Pl, o.near || KERN.where() || [P.x, P.y], { who: o.who, s: o.s, prime: o.prime });
    return c ? c.id : null;
  }
  const car = id => VAUTO.cars.find(c => c.id === id) || null;
  const clear = () => {
    for (const d of S.peds.slice()) removePed(d);
    for (const c of VAUTO.cars.slice()) if (!(S.lent && S.lent.c === c)) removeCar(c);
  };
  // a start for tests and a look: on the street by the Anger, by day (?szenario=verkehr)
  KERN.scenario('verkehr', {
    label: 'Ratscher: auf der Straße am Anger',
    order: 23,
    menu: false,
    run: () => {
      KERN.spot('_verkehr', {
        mode: 'walk',
        pos: [206, -117],
        z: KERN.ground(206, -117),
        yaw: 75,
        pitch: -2,
        label: 'Am Anger',
      });
      go('_verkehr');
    },
  });
  return {
    S,
    net: VNETZ,
    oncoming: () => {
      FAHR.next = 0;
    },
    places: S.places,
    state,
    addPed,
    addCar,
    car,
    clear,
    wave: id => wave(id ? car(id) : S.waveCar),
    ride: () => (S.halted ? ride(S.halted) : false),
    selbst: () => (S.halted ? selbst(S.halted) : false),
    talk: key => {
      const d = S.peds.find(q => q.key === key);
      if (d) UI.openPed(d);
      return !!d;
    },
    close: () => UI.close(),
    force: o => {
      S.force = o || null;
    },
    autoOn: v => {
      S.auto = !!v;
    },
    UI,
    line: (place, a, b) => carRoute(S.places[place], a, b),
  };
})();
window.VERKEHR = VERKEHR;
