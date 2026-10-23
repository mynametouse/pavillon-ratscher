// ===================== the neighbours' day (feat/nachbarn, 23.10.2026, plan: docs/plans/plan_leben.md section 1, Falko's words) =====================
// Hubert "hackt viel Holz, sägt Holz klein und stapelt es in kleinen, hohen Trockenhütchen … Das macht er eigentlich die ganze Zeit. Er
// repariert oft sein Auto … Also: entweder Holz hacken oder reparieren. Manchmal fährt er mit dem Traktor ins Dorf, etwa zur Dorfmitte,
// steigt ab, geht in ein Haus, kommt wieder heraus und fährt zurück." Ronald "fährt oft mit einem Traktor hin und her und mäht die Wiese; er
// füttert die Ziegen. Manchmal geht er zu Hubert rüber; dann sitzen die beiden am Tisch … vor der Werkstatt und reden über das, was im
// Dorf passiert."
// Each neighbour follows a plan by the game clock (time/clock.js; at night 22–6 they are at home: npc/hours.js). An activity is a small
// script (a generator: one step per frame, `yield` waits for the next frame) run from the walker's controller (npc/npc.js Walker.ctl);
// it walks, turns, takes work poses (npc/npc_real.js POSE) and puts tools into the hands. A new activity starts when the plan says so and
// the current one has run its minimum time (some – the trip, mowing – finish first). Talking with the visitor pauses it; a task that
// steers a neighbour itself (game/quests.js) takes over and the activity starts again afterwards. Conversations of the two at the table:
// text lines as subtitles when the visitor is near (no recordings for them yet).
import * as THREE from 'three';
import { scene, V } from '../core/head.js';
import { markDirty, plain } from '../core/assets.js';
import { DOOR, P } from '../game/walkable.js';
import { SPOTS } from '../game/player.js';
import { audio } from '../audio/audio.js';
import { HOF, SHEDS } from '../garden/hof_hubert.js';
import { HOFCAR } from '../garden/hof_auto.js';
import {
  GOATLURE,
  GOATS,
  leaveTractor,
  lerpAngle,
  MOWER,
  NM,
  NPCS,
  NPCUI,
  PAD,
  startDrive,
  TRACTOR,
  TRACTOR_HOME,
  tractorCol,
  trkPt,
} from './npc.js';
import { PLAY } from '../game/play.js';
import { QUESTS } from '../game/quests.js';
import { ROADS } from '../world/roads.js';
import { RATSCHER } from '../world/ratscher.js';
import { CLOCK } from '../time/clock.js';
export const LIFE = (() => {
  const H = NPCS.hubert,
    R = NPCS.ronald;
  const now = () => performance.now() / 1000;
  const mins = () => ((CLOCK.t % 1440) + 1440) % 1440;
  const D2R = Math.PI / 180;
  let DT = 0.025;
  // ---------------- small steps ----------------
  function stand(w, dt = DT) {
    w.v = 0;
    w.place();
    w.fig.anim(dt, 0);
    if (w.prop && !w.fig.real) holdProp(w);
  }
  // one frame towards (tx, ty); true when there
  function walk(w, tx, ty, sp = w.speed) {
    const dx = tx - w.x,
      dy = ty - w.y,
      d = Math.hypot(dx, dy);
    if (d < 0.18) {
      stand(w);
      return true;
    }
    w.az = lerpAngle(w.az, Math.atan2(dx, dy), Math.min(1, DT * 5));
    const mv = Math.min(d, sp * DT);
    w.x += Math.sin(w.az) * mv;
    w.y += Math.cos(w.az) * mv;
    w.v = sp;
    w.place();
    w.fig.anim(DT, sp);
    if (w.prop && !w.fig.real) holdProp(w);
    return false;
  }
  // the walk to the work is done: the activity's minimum time counts from here (a long walk is no work)
  const arrived = w => (w.since = now());
  function* go(w, path, sp) {
    if (w.fig.pose && w.fig.pose.k !== 'carry') pose(w, null); // (only an armful is carried while walking)
    for (const p of path) while (!walk(w, p[0], p[1], sp)) yield;
  }
  function* turn(w, az) {
    for (let t = 0; t < 0.8 && Math.abs(lerpAngle(0, az - w.az, 1)) > 0.03; t += DT) {
      w.az = lerpAngle(w.az, az, Math.min(1, DT * 6));
      stand(w);
      yield;
    }
  }
  // stand (in a pose) for sec seconds; each(t) runs every frame
  function* hold(w, sec, kind = null, each = null) {
    pose(w, kind);
    for (let t = 0; t < sec; t += DT) {
      if (kind && (!w.fig.pose || w.fig.pose.k !== kind)) pose(w, kind); // (a talk in between cleared it)
      if (w.fig.pose) w.fig.pose.t = t;
      if (each) each(t);
      stand(w);
      yield;
    }
  }
  function pose(w, k) {
    w.fig.pose = k ? { k, t: 0 } : null;
  }
  // sitting down on a chair or bench: { x, y, az (compass degrees), seat (height) }
  function* sit(w, c) {
    const a = c.az * D2R;
    yield* go(w, [[c.x + Math.cos(a) * 0.6, c.y - Math.sin(a) * 0.6]]); // beside the seat (on the sitter's right)
    yield* turn(w, a);
    // the visitor sits there: he waits beside it
    while (PLAY.seat && Math.hypot(PLAY.seat.x - c.x, PLAY.seat.y - c.y) < 0.5) {
      stand(w);
      yield;
    }
    w.x = c.x;
    w.y = c.y;
    w.az = a;
    w.fig.mode = 'sit';
    w.zOff = c.seat - (w.fig.hipH || 0.9) + 0.1;
    w.seated = c;
    w.since = now();
  }
  function rise(w) {
    if (!w.seated) return;
    const a = w.az;
    w.x += Math.cos(a) * 0.6;
    w.y -= Math.sin(a) * 0.6;
    w.fig.mode = 'stand';
    w.fig.speak = false;
    w.zOff = 0;
    w.seated = null;
  }
  // ---------------- things in the hands ----------------
  const PM = {
    steel: plain({ color: 0x5b6064, metalness: 0.8, roughness: 0.35 }),
    wood: plain({ color: 0x9a6b40, roughness: 0.8 }),
    orange: plain({ color: 0xd0601c, roughness: 0.5 }),
    dark: plain({ color: 0x232323, roughness: 0.6 }),
    split: plain({ color: 0xd8b98e, roughness: 0.85 }),
  };
  function prop(kind, build) {
    const g = new THREE.Group();
    build(g);
    g.traverse(o => {
      if (o.isMesh) {
        o.castShadow = true;
        o.userData.noMerge = true;
      }
    });
    g.visible = false;
    g.userData.kind = kind;
    scene.add(g);
    return g;
  }
  const MATLE = plain({ color: 0xc8a77c, roughness: 0.9 });
  const mesh = (g, geo, m, x, y, z) => {
    const me = new THREE.Mesh(geo, m);
    me.position.set(x, y, z);
    g.add(me);
    return me;
  };
  // the axe: handle along +y (grip at 0), head at the top, edge towards +z
  const AXE = prop('axe', g => {
    mesh(g, new THREE.CylinderGeometry(0.016, 0.02, 0.78, 8), PM.wood, 0, 0.27, 0);
    mesh(g, new THREE.BoxGeometry(0.035, 0.1, 0.19), PM.steel, 0, 0.62, 0.05);
  });
  // the chainsaw: body at the hands, the bar forward (−z)
  const SAW = prop('saw', g => {
    mesh(g, new THREE.BoxGeometry(0.17, 0.2, 0.32), PM.orange, 0, 0, 0.05);
    mesh(g, new THREE.BoxGeometry(0.03, 0.06, 0.5), PM.steel, 0, -0.02, -0.33);
    mesh(g, new THREE.BoxGeometry(0.035, 0.065, 0.46), PM.dark, 0, -0.02, -0.33).scale.set(1.05, 1.1, 1);
  });
  // an armful of split wood
  const ARM = prop('arm', g => {
    const b = new THREE.CylinderGeometry(0.075, 0.075, 0.34, 3);
    [
      [-0.08, 0, 0.2],
      [0.08, 0.01, -0.3],
      [0, 0.11, 0.9],
      [-0.07, 0.2, 2.6],
      [0.07, 0.19, 1.7],
    ].forEach(([x, y, r]) => {
      const m = mesh(g, b, [PM.split, MATLE, MATLE], x, y, 0);
      m.rotation.set(Math.PI / 2, r, 0);
    });
  });
  // hay for the goats
  const HAY = prop('arm', g => {
    for (let i = 0; i < 6; i++) {
      const m = mesh(
        g,
        new THREE.SphereGeometry(0.14, 8, 6),
        NM.hay,
        (i % 3) * 0.12 - 0.12,
        (i > 2 ? 0.1 : 0) - 0.02,
        (i % 2) * 0.08
      );
      m.scale.set(1.25, 0.6, 0.95);
    }
  });
  const WRENCH = prop('wrench', g => {
    mesh(g, new THREE.BoxGeometry(0.018, 0.24, 0.035), PM.steel, 0, 0.08, 0);
  });
  // the axe standing in the block while Hubert does something else, a round on it while he splits, halves that fly off
  const STUCK = prop('stuck', g => {
    mesh(g, new THREE.CylinderGeometry(0.016, 0.02, 0.78, 8), PM.wood, 0, 0.36, 0);
    mesh(g, new THREE.BoxGeometry(0.035, 0.1, 0.19), PM.steel, 0, 0.0, 0.05);
  });
  STUCK.position.copy(V(HOF.block[0] + 0.04, HOF.block[1] - 0.02, 0.52));
  STUCK.rotation.set(0.0, 0.7, -0.45, 'YXZ');
  STUCK.visible = true;
  const ROUND = prop('round', g => {
    mesh(
      g,
      new THREE.CylinderGeometry(0.15, 0.155, 0.33, 12),
      [plain({ color: 0x6f5a45, roughness: 0.95 }), MATLE, MATLE],
      0,
      0.165,
      0
    );
  });
  ROUND.position.copy(V(HOF.block[0], HOF.block[1], 0.5));
  const HALVES = [0, 1].map(() =>
    prop('half', g => {
      const m = mesh(
        g,
        new THREE.CylinderGeometry(0.15, 0.15, 0.33, 10, 1, false, 0, Math.PI),
        [PM.wood, MATLE, MATLE],
        0,
        0,
        0
      );
      m.rotation.x = Math.PI / 2;
    })
  );
  const _a = new THREE.Vector3(),
    _b = new THREE.Vector3(),
    _c = new THREE.Vector3(),
    _d = new THREE.Vector3(),
    _x = new THREE.Vector3(),
    _y = new THREE.Vector3(),
    _z = new THREE.Vector3(),
    _f = new THREE.Vector3(),
    _m = new THREE.Matrix4();
  // put the walker's tool where its hands are (called after each pose update, npc/npc_real.js `after`)
  function holdProp(w) {
    const p = w.prop;
    if (!p) return;
    const B = w.fig.bones;
    _f.set(Math.sin(w.az), 0, -Math.cos(w.az)); // facing, in three coordinates
    if (!B || !B.RightHand || !B.LeftHand) {
      p.position.copy(V(w.x + Math.sin(w.az) * 0.38, w.y + Math.cos(w.az) * 0.38, 1.0));
      p.rotation.set(0, -w.az, 0);
      p.updateMatrixWorld(true);
      return;
    }
    B.RightHand.getWorldPosition(_a);
    B.LeftHand.getWorldPosition(_b);
    _c.addVectors(_a, _b).multiplyScalar(0.5); // between the hands
    const k = p.userData.kind;
    if (k === 'axe' || k === 'wrench') {
      B.RightForeArm.getWorldPosition(_d);
      if (k === 'axe') {
        B.LeftForeArm.getWorldPosition(_x);
        _d.add(_x).multiplyScalar(0.5);
        _y.subVectors(_c, _d).normalize(); // along the forearms
      } else _y.subVectors(_a, _d).normalize();
      _z.copy(_f).addScaledVector(_y, -_f.dot(_y));
      if (_z.lengthSq() < 1e-4) _z.set(0, 1, 0);
      _z.normalize();
      _x.crossVectors(_y, _z);
      _m.makeBasis(_x, _y, _z);
      p.quaternion.setFromRotationMatrix(_m);
      p.position.copy(k === 'axe' ? _c : _a).addScaledVector(_y, k === 'axe' ? -0.08 : 0);
    } else if (k === 'saw') {
      p.position.copy(_c).addScaledVector(_f, 0.12);
      p.rotation.set(-0.38, -w.az, 0, 'YXZ');
    } else {
      p.position.copy(_c).addScaledVector(_f, 0.1);
      p.position.y += 0.03;
      p.rotation.set(0, -w.az, 0);
    }
    p.updateMatrixWorld(true);
  }
  function hand(w, p) {
    if (w.prop && w.prop !== p) w.prop.visible = false;
    w.prop = p || null;
    if (p) {
      p.visible = true;
      holdProp(w);
    }
    markDirty();
  }
  // ---------------- sounds at the yard (only when someone is near enough to hear) ----------------
  const near = (x, y, d) => Math.hypot(P.x - x, P.y - y) < d;
  function knock(x, y) {
    if (near(x, y, 45) && audio.has && audio.has('wedge_hit')) audio.at('wedge_hit', x, y, { vol: 0.75, ref: 10 });
  }
  let sawOn = false;
  function sawSound(on, x, y) {
    if (on && !sawOn && near(x, y, 60)) {
      audio.loopAt('hubsaw', 'csaw_cut', x, y, { vol: 0.55, ref: 9, rate: 1 });
      sawOn = true;
    } else if (!on && sawOn) {
      audio.stopLoop('hubsaw', 0.5);
      sawOn = false;
    }
  }
  // ================= Hubert =================
  const HUT = () => HOF.huts[HOF.stackHut];
  const BENCH = { x: HOF.bench[0], y: HOF.bench[1], az: 90, seat: 0.47 };
  const benchFront = s => {
    const p = [s.bench[0] + s.u[0] * 0.78, s.bench[1] + s.u[1] * 0.78];
    return { p, az: Math.atan2(s.bench[0] - p[0], s.bench[1] - p[1]) };
  };
  function* hChop(w) {
    const [bx, by] = HOF.block,
      spot = [bx - 0.62, by - 0.42],
      az = Math.atan2(bx - spot[0], by - spot[1]);
    yield* go(w, [spot]);
    yield* turn(w, az);
    arrived(w);
    try {
      STUCK.visible = false;
      hand(w, AXE);
      for (;;) {
        ROUND.visible = true;
        const n = 2 + ((Math.random() * 2) | 0);
        for (let i = 0; i < n; i++) {
          let hit = false;
          yield* hold(w, 2.6, 'chop', t => {
            if (!hit && t > 2.6 * 0.56) {
              hit = true;
              knock(bx, by);
              if (i === n - 1) split();
            }
          });
        }
        yield* hold(w, 1.3, 'pick');
      }
    } finally {
      hand(w, null);
      pose(w, null);
      STUCK.visible = true;
      ROUND.visible = false;
    }
  }
  let halvesT = 0;
  function split() {
    ROUND.visible = false;
    const [bx, by] = HOF.block;
    HALVES.forEach((h, j) => {
      h.visible = true;
      h.userData.f = { t: 0, a: j ? 0.9 : -2.2 + Math.random() * 0.4, x: bx, y: by };
    });
    halvesT = 6;
    markDirty();
  }
  function tickHalves(dt) {
    if (halvesT <= 0) return;
    halvesT -= dt;
    for (const h of HALVES) {
      const f = h.userData.f;
      if (!f) continue;
      f.t = Math.min(0.45, f.t + dt);
      const k = f.t / 0.45,
        r = 0.25 + 0.4 * k;
      h.position.copy(
        V(f.x + Math.cos(f.a) * r, f.y + Math.sin(f.a) * r, 0.6 * (1 - k) + Math.sin(k * Math.PI) * 0.25 + 0.08)
      );
      h.rotation.set(k * 1.5, f.a, 0);
      if (halvesT <= 0) h.visible = false;
    }
    markDirty();
  }
  function* hSaw(w) {
    const [hx, hy] = HOF.horse,
      spot = [hx + 0.45, hy - 0.72];
    yield* go(w, [spot]);
    yield* turn(w, 0);
    arrived(w);
    try {
      hand(w, SAW);
      for (;;) {
        sawSound(true, hx, hy);
        yield* hold(w, 5 + Math.random() * 3, 'saw');
        sawSound(false);
        yield* hold(w, 1.5);
        yield* hold(w, 1.4, 'pick');
      }
    } finally {
      sawSound(false);
      hand(w, null);
      pose(w, null);
    }
  }
  function* hStack(w) {
    const t0 = now(),
      heap = [HOF.heap[0] - 0.62, HOF.heap[1] + 0.28];
    try {
      for (;;) {
        const hut = HUT(),
          front = [hut.x + 0.92, hut.y];
        yield* go(w, [heap]);
        yield* turn(w, Math.atan2(HOF.heap[0] - heap[0], HOF.heap[1] - heap[1]));
        if (!w.since || w.since < t0) arrived(w);
        yield* hold(w, 1.5, 'pick');
        hand(w, ARM);
        pose(w, 'carry');
        yield* go(w, [front], 0.75);
        yield* turn(w, -Math.PI / 2);
        yield* hold(w, 1.3, 'place');
        hand(w, null);
        HOF.fillHut(hut.fill >= 0.99 ? 0.3 : hut.fill + 0.03); // a full hut: he starts it again (the dry wood went into the stove)
        markDirty();
        yield* hold(w, 0.6);
      }
    } finally {
      hand(w, null);
      pose(w, null);
    }
  }
  function* hCar(w) {
    const t0 = now();
    HOFCAR.bonnet(1);
    try {
      for (;;) {
        yield* go(w, [HOFCAR.front]);
        yield* turn(w, Math.PI);
        if (!w.since || w.since < t0) arrived(w);
        hand(w, WRENCH);
        yield* hold(w, 12 + Math.random() * 10, 'bonnet');
        hand(w, null);
        if (Math.random() < 0.5 && SHEDS[3]) {
          // fetches something from the bench in the workshop
          const b = benchFront(SHEDS[3]);
          yield* go(w, [b.p]);
          yield* turn(w, b.az);
          yield* hold(w, 4, 'bench');
        } else {
          yield* go(w, [HOFCAR.side]);
          yield* turn(w, Math.PI / 2);
          yield* hold(w, 3.5, 'pick');
        }
      }
    } finally {
      hand(w, null);
      pose(w, null);
    }
  }
  function* hPutter(w) {
    const b = benchFront(SHEDS[2] || SHEDS[0]);
    yield* go(w, [b.p]);
    yield* turn(w, b.az);
    arrived(w);
    try {
      for (;;) yield* hold(w, 8, 'bench');
    } finally {
      pose(w, null);
    }
  }
  function* sitFor(w, c) {
    try {
      yield* sit(w, c);
      for (;;) {
        stand(w);
        yield;
      }
    } finally {
      rise(w);
    }
  }
  // ---- the trip to the village: north to the field track, along it and the road to the centre (the route to the Klinge, world/roads.js),
  // stops at the Anger, goes into a house, comes out again, drives back ----
  // (worked out on first use: the walls of the village are there once the geodata are loaded)
  let TRIP0 = undefined;
  const TRIP = () => (TRIP0 === undefined ? (TRIP0 = tripRoute()) : TRIP0);
  function tripRoute() {
    const K = (ROADS.routes && ROADS.routes.klinge) || [];
    if (K.length < 20 || !ROADS.on) return null;
    const ANGER = [222, -108];
    let iS = 0,
      bd = 1e9;
    K.forEach((p, i) => {
      const d = Math.hypot(p[0] - ANGER[0], p[1] - ANGER[1]);
      if (d < bd && i < K.length * 0.7) {
        bd = d;
        iS = i;
      }
    });
    if (bd > 60) return null;
    const out = [[TRACTOR_HOME.x + 0.4, TRACTOR_HOME.y + 5], [-13.5, 37.2], trkPt(7), trkPt(20)]; // as his round (npc/npc.js)
    let last = out[out.length - 1];
    for (let i = 0; i <= iS; i++) {
      const p = K[i];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) > 5 || i === iS) {
        out.push([p[0], p[1]]);
        last = p;
      }
    }
    const stop = out[out.length - 1];
    // the house: the nearest building wall to the stop (OSM footprints), a point just in front of it
    let door = null;
    const W = RATSCHER.walls;
    if (W && W.length) {
      let best = 1e9;
      for (let i = 0; i + 3 < W.length; i += 4) {
        const ax = W[i],
          ay = W[i + 1],
          bx = W[i + 2],
          by = W[i + 3],
          dx = bx - ax,
          dy = by - ay,
          L2 = dx * dx + dy * dy;
        if (L2 < 1) continue;
        const t = Math.max(0.2, Math.min(0.8, ((stop[0] - ax) * dx + (stop[1] - ay) * dy) / L2)),
          px = ax + dx * t,
          py = ay + dy * t,
          d = Math.hypot(px - stop[0], py - stop[1]);
        if (d < best && d > 3) {
          best = d;
          const L = Math.sqrt(L2),
            nx = -dy / L,
            ny = dx / L,
            s = (stop[0] - px) * nx + (stop[1] - py) * ny > 0 ? 1 : -1;
          door = [px + nx * s * 0.45, py + ny * s * 0.45];
        }
      }
      if (best > 30) door = null;
    }
    if (!door) door = [stop[0] + 6, stop[1] + 3];
    const back = out.slice(0, -1).reverse();
    back.push([TRACTOR_HOME.x, TRACTOR_HOME.y]);
    return { out, back, stop, door };
  }
  const tripBlocked = () => !TRIP() || QUESTS.holds('tractor');
  function* hTrip(w, a) {
    if (tripBlocked()) {
      yield* hChop(w);
      return;
    }
    a.lock = true;
    const T = TRACTOR.g;
    if (Math.hypot(T.position.x - TRACTOR_HOME.x, -T.position.z - TRACTOR_HOME.y) > 1.5) {
      a.lock = false;
      yield* hChop(w);
      return;
    }
    try {
      yield* go(w, [[TRACTOR_HOME.x + 1.0, TRACTOR_HOME.y - 1.2]]);
      let there = false;
      startDrive(w, {
        route: TRIP().out,
        sp: 4.2,
        onEnd: ww => {
          there = true;
          leaveTractor(ww);
        },
      });
      a.trip = 'out';
      while (!there) {
        stand(w);
        yield;
      }
      a.trip = 'village';
      yield* go(w, [TRIP().door]);
      w.inside = true;
      w.fig.g.visible = false;
      markDirty();
      for (let t = 0, T1 = 50 + Math.random() * 40; t < T1; t += DT) yield;
      w.fig.g.visible = !w.away;
      w.inside = false;
      yield* hold(w, 2.5);
      yield* go(w, [TRIP().stop]);
      a.trip = 'back';
      startDrive(w, { route: TRIP().back, sp: 4.2 });
      stand(w);
      yield;
      a.trip = null;
    } finally {
      w.inside = false;
      if (!w.away) w.fig.g.visible = true;
      a.lock = false;
    }
  }
  // the evening or a night comes while he is still in the village: the trip is over at once (out of sight)
  function endTrip(a) {
    const w = a.w;
    if (w.drive) {
      audio.stopLoop('tractor', 0.3);
      w.drive = null;
    }
    TRACTOR.g.position.copy(V(TRACTOR_HOME.x, TRACTOR_HOME.y, 0));
    TRACTOR.g.rotation.set(0, -TRACTOR_HOME.az, 0);
    tractorCol(true);
    w.fig.mode = 'stand';
    w.state = 'roam';
    w.inside = false;
    if (Math.hypot(w.x - TRACTOR_HOME.x, w.y - TRACTOR_HOME.y) > 60) {
      w.x = TRACTOR_HOME.x + 1; // (not on foot across the fields)
      w.y = TRACTOR_HOME.y - 1.2;
      w.place();
    }
    w.fig.g.rotation.set(0, -w.az, 0); // (no pitch of the tractor seat)
    if (!w.away) w.fig.g.visible = true;
    a.trip = null;
    a.lock = false;
    if (a.it) {
      a.it.return();
      a.it = null;
    }
    markDirty(true);
  }
  // ================= Ronald =================
  const GATE_OUT = [PAD.x0 - 1.1, PAD.gy],
    GATE_IN = [PAD.x0 + 1.1, PAD.gy];
  const inPad = (x, y) => x > PAD.x0 && x < PAD.x1 && y > PAD.y0 && y < PAD.y1;
  // through the gate (opened and shut again behind him if it was shut)
  function* gate(w, inward) {
    const d = DOOR.paddockgate,
      shut = d && d.target < 0.5;
    yield* go(w, [inward ? GATE_OUT : GATE_IN]);
    if (shut) {
      d.target = 1; // (walkable.js swings it; toggleDoor would play the door sound at the visitor's ears)
      yield* hold(w, 1.0);
    }
    yield* go(w, [inward ? GATE_IN : GATE_OUT]);
    if (shut && d.target > 0.5) {
      yield* hold(w, 0.6);
      d.target = 0;
    }
  }
  // the way between Ronald's side and Hubert's yard: round the south of the garden (not through it, no fence in the way)
  const NW = [PAD.x0 - 1.1, PAD.y1 + 1.0]; // outside the paddock's north-west corner (from the meadow down its west side)
  const SOUTH = [
    [PAD.x0 - 1.1, PAD.y0 + 3.5],
    [13.5, -48.0],
    [-12.5, -46.8],
    [-16.5, -40],
    [-16.6, -28],
    [-19.7, -19.5],
    [-19.8, -8.6],
  ];
  const yard = x => x < -9;
  // Ronald from wherever he is to (tx, ty): through the gate if one of them is in the paddock, round the garden if one is at Hubert's
  const northEast = (x, y) => y > PAD.y1 && x > PAD.x0 - 2; // on the meadow north of the paddock
  function* rGo(w, tx, ty, sp) {
    if (inPad(w.x, w.y) && !inPad(tx, ty)) yield* gate(w, false);
    if (yard(w.x) && !yard(tx)) {
      yield* go(w, SOUTH.slice().reverse().slice(1), sp);
      if (northEast(tx, ty)) yield* go(w, [NW], sp);
    } else if (!yard(w.x) && yard(tx)) {
      if (northEast(w.x, w.y)) yield* go(w, [NW], sp);
      yield* go(w, SOUTH, sp);
    } else if (inPad(tx, ty) && northEast(w.x, w.y)) yield* go(w, [NW], sp);
    if (!inPad(w.x, w.y) && inPad(tx, ty)) yield* gate(w, true);
    if (!inPad(tx, ty) && northEast(tx, ty) && !northEast(w.x, w.y) && w.x > PAD.x0 - 3) yield* go(w, [NW], sp);
    yield* go(w, [[tx, ty]], sp);
  }
  // hay into the rack; the goats come to eat (GOATLURE, npc/npc.js)
  let rackHay = 0;
  const RACKHAY = (() => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.45, 0.5, 0.5), NM.hay);
    m.position.copy(V(PAD.rack[0], PAD.rack[1], 0.5));
    m.castShadow = m.receiveShadow = true;
    m.userData.noMerge = true;
    m.visible = false;
    scene.add(m);
    return m;
  })();
  function fillRack(k) {
    rackHay = Math.max(0, Math.min(1, k));
    RACKHAY.visible = rackHay > 0.05;
    RACKHAY.scale.set(1, Math.max(0.05, rackHay), 1);
    RACKHAY.position.copy(V(PAD.rack[0], PAD.rack[1], 0.45 + 0.25 * rackHay));
    markDirty(true);
  }
  function lure(x, y, r, sec) {
    Object.assign(GOATLURE, { x, y, r, until: now() + sec });
    for (const g of GOATS) if (!g.ctl) Object.assign(g, { target: null, wait: Math.random() * 1.5 });
  }
  function* rFeed(w) {
    const hay = [PAD.hay[0] - 1.25, PAD.hay[1] - 0.45],
      at = [PAD.rack[0], PAD.rack[1] - 0.85];
    try {
      for (let n = 0; n < 2; n++) {
        yield* rGo(w, ...hay);
        if (!n) arrived(w);
        yield* turn(w, 0.35); // the hay lies north of him
        yield* hold(w, 1.3, 'pick');
        hand(w, HAY);
        pose(w, 'carry');
        yield* go(w, [at], 0.8);
        yield* turn(w, 0);
        yield* hold(w, 1.3, 'place');
        hand(w, null);
        fillRack(rackHay + 0.55);
        lure(PAD.rack[0] - 0.95, PAD.rack[1] + 0.1, 0.9, 40); // round the rack's west end (he stands south of it)
        yield* hold(w, 1.2);
      }
      for (let t = 0; t < 25;) {
        const g = GOATS[(Math.random() * GOATS.length) | 0];
        yield* turn(w, Math.atan2(g.x - w.x, g.y - w.y));
        const s = 4 + Math.random() * 4;
        yield* hold(w, s);
        t += s;
        if (Math.random() < 0.3 && near(w.x, w.y, 25)) R.say('idle');
      }
    } finally {
      hand(w, null);
      pose(w, null);
    }
  }
  // looking after the paddock: a post of the fence, a goat, the trough
  function* rPaddock(w) {
    let first = true;
    try {
      for (;;) {
        if (first && inPad(w.x, w.y)) {
          arrived(w);
          first = false;
        }
        const r = Math.random();
        if (r < 0.35) {
          const g = GOATS[(Math.random() * GOATS.length) | 0];
          yield* rGo(w, g.x + 0.8, g.y - 0.6);
          yield* turn(w, Math.atan2(g.x - w.x, g.y - w.y));
          yield* hold(w, 2.5, 'pick');
        } else if (r < 0.65) {
          const y = PAD.y0 + 1 + Math.random() * (PAD.y1 - PAD.y0 - 2);
          yield* rGo(w, PAD.x1 - 0.7, y);
          yield* turn(w, Math.PI / 2);
          yield* hold(w, 3.5, 'pick');
        } else if (r < 0.8) {
          yield* rGo(w, PAD.trough[0], PAD.trough[1] - 0.8);
          yield* turn(w, 0);
          yield* hold(w, 3);
        } else {
          yield* rGo(w, PAD.x0 + 3 + Math.random() * 8, PAD.y0 + 3 + Math.random() * 12);
          yield* hold(w, 6 + Math.random() * 6);
        }
        pose(w, null);
        yield* hold(w, 1 + Math.random() * 2);
      }
    } finally {
      pose(w, null);
    }
  }
  // in the evening the goats go into the shelter (the task "Ziegen in den Stall": the visitor herds them, game/quests.js)
  function* rStall(w) {
    yield* rGo(w, PAD.x1 - 5.5, PAD.y1 - 3.0);
    arrived(w);
    try {
      for (;;) {
        if (!QUESTS.holds('goats')) lure(PAD.x1 - 2.4, PAD.y1 - 2.2, 1.0, 30);
        yield* turn(w, Math.PI / 2);
        yield* hold(w, 10);
      }
    } finally {
      pose(w, null);
    }
  }
  // ---- mowing: up and down the meadow north of the paddock with the cutter bar out; stops when somebody comes close ----
  const LANES = (() => {
    const out = [],
      x0 = PAD.x0 + 0.6,
      ys = -29,
      yn = 6;
    for (let k = 0; k < 7; k++) {
      const x = x0 + k * 2.0,
        up = k % 2 === 0;
      out.push([x, up ? ys : yn, false], [x, up ? yn : ys, true], [x + 1.0, up ? yn + 2.6 : ys - 2.6, false]); // [x, y, cutting]
    }
    return out;
  })();
  // the cut grass lies in a swath behind the cutter bar (right of the tractor): one strip per lane, gone when he mows again
  const SWATH = (() => {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    geo.translate(0, 0.5, 0);
    const m = new THREE.InstancedMesh(geo, plain({ color: 0x8c9a4c, roughness: 1 }), 16);
    m.count = 0;
    m.receiveShadow = true;
    m.userData.noMerge = true;
    m.frustumCulled = false;
    scene.add(m);
    return {
      m,
      n: 0,
      cur: null,
      M: new THREE.Matrix4(),
      Q: new THREE.Quaternion(),
      S: new THREE.Vector3(),
      Y: new THREE.Vector3(0, 1, 0),
    };
  })();
  const barAt = () => [MS.x + Math.cos(MS.az) * 1.8, MS.y - Math.sin(MS.az) * 1.8];
  function swath(on) {
    const W = SWATH;
    if (on === 'clear') {
      W.n = W.m.count = 0;
      W.cur = null;
    } else if (on) {
      if (W.n < 16) {
        const [x, y] = barAt();
        W.cur = { i: W.n++, x, y };
        W.m.count = W.n;
      }
    } else W.cur = null;
    markDirty();
  }
  function swathTo() {
    const W = SWATH,
      c = W.cur;
    if (!c) return;
    const [x, y] = barAt(),
      L = Math.hypot(x - c.x, y - c.y);
    W.Q.setFromAxisAngle(W.Y, -Math.atan2(x - c.x, y - c.y));
    W.M.compose(V((x + c.x) / 2, (y + c.y) / 2, 0), W.Q, W.S.set(0.55, 0.05, Math.max(0.01, L)));
    W.m.setMatrixAt(c.i, W.M);
    W.m.instanceMatrix.needsUpdate = true;
  }
  const MS = { x: MOWER.home.x, y: MOWER.home.y, az: MOWER.home.az * D2R };
  function mowerAt() {
    MOWER.g.position.copy(V(MS.x, MS.y, 0));
    MOWER.g.rotation.set(0, -MS.az, 0);
  }
  function seatOn(w) {
    const st = MOWER.seat || { back: 0.62, z: 0.14 };
    w.x = MS.x - Math.sin(MS.az) * st.back;
    w.y = MS.y - Math.cos(MS.az) * st.back;
    w.az = MS.az;
    w.zOff = st.top != null ? st.top - (w.fig.hipH || 0.9) + 0.1 : st.z;
  }
  function* drive(w, tx, ty, sp, cut) {
    for (;;) {
      const dx = tx - MS.x,
        dy = ty - MS.y,
        d = Math.hypot(dx, dy);
      const h = Math.atan2(dx, dy);
      if (d < 0.8 || (d < 2.5 && Math.cos(h - MS.az) < 0.2)) return; // there, or passed it (no circling round the point)
      const hold_ = w.talking || Math.hypot(P.x - MS.x, P.y - MS.y) < 5.5; // somebody close by: he stops
      if (!hold_) {
        MS.az = lerpAngle(MS.az, h, Math.min(1, DT * 1.5));
        const err = Math.abs(lerpAngle(0, h - MS.az, 1)),
          mv = Math.min(d, sp * (err > 0.5 ? 0.4 : 1) * DT);
        MS.x += Math.sin(MS.az) * mv;
        MS.y += Math.cos(MS.az) * mv;
        MOWER.roll(mv);
        mowerAt();
        w.v = mv / DT; // (npc/npc.js draws a moving neighbour)
        if (cut) swathTo();
        audio.moveLoop('mower', MS.x, MS.y);
      }
      if (hold_) w.v = 0;
      seatOn(w);
      w.place();
      w.fig.anim(DT, 0);
      yield;
    }
  }
  function* rMow(w, a) {
    const st = MOWER.seat || { back: 0.62 },
      mount = [
        MS.x - Math.cos(MS.az) * 1.0 - Math.sin(MS.az) * st.back,
        MS.y + Math.sin(MS.az) * 1.0 - Math.cos(MS.az) * st.back,
      ];
    yield* rGo(w, ...mount);
    a.lock = true;
    try {
      w.mow = true;
      w.fig.mode = 'sit';
      if (near(MS.x, MS.y, 80)) audio.loopAt('mower', 'tractor', MS.x, MS.y, { vol: 0.75, ref: 13, rate: 1.12 });
      for (let t = 0; t < 2; t += DT) {
        seatOn(w);
        stand(w);
        yield;
      }
      swath('clear');
      for (const [x, y, cut] of LANES) {
        if (cut) swath(true);
        yield* drive(w, x, y, 2.3, cut);
        if (cut) swath(false);
      }
      yield* drive(w, MOWER.home.x, MOWER.home.y - 3, 2.6);
      yield* drive(w, MOWER.home.x, MOWER.home.y, 1.2);
      a.lock = false;
    } finally {
      audio.stopLoop('mower', 1.0);
      swath(false);
      w.mow = false;
      w.fig.mode = 'stand';
      w.zOff = 0;
      w.x = MS.x - Math.cos(MS.az) * 1.0;
      w.y = MS.y + Math.sin(MS.az) * 1.0;
      a.lock = false;
    }
  }
  // ---- the visit at Hubert's table ----
  const CH = () => HOF.chairs; // [south chair (looks north), north chair (looks south)]
  function* rVisit(w) {
    const c = CH()[1];
    yield* rGo(w, HOF.table[0] - 1.3, HOF.table[1]); // round the west end of the table
    yield* sitFor(w, c);
  }
  function* hTalk(w) {
    yield* sitFor(w, CH()[0]);
  }
  // some days Hubert keeps at his car and Ronald stands beside it and talks ("… oder beim Auto")
  let atCarNow = false;
  function* rVisitCar(w) {
    atCarNow = false;
    const p = [HOFCAR.side[0] - 0.4, HOFCAR.side[1] + 1.5];
    yield* rGo(w, ...p);
    arrived(w);
    try {
      atCarNow = true;
      for (;;) {
        yield* turn(w, Math.atan2(H.x - w.x, H.y - w.y));
        yield* hold(w, 3);
      }
    } finally {
      atCarNow = false;
      w.fig.speak = false;
    }
  }
  // ================= the plans =================
  const tripDay = d => d % 3 === 2,
    talkDay = d => !tripDay(d) && d % 5 !== 4,
    talkAtCar = d => d % 4 === 1;
  const PATTERN = [
    ['chop', 'saw', 'stack', 'car', 'chop', 'car', 'stack', 'chop', 'car', 'saw', 'stack'],
    ['car', 'chop', 'stack', 'chop', 'car', 'saw', 'car', 'stack', 'chop', 'car', 'chop'],
  ];
  function hubertPlan(m, d) {
    const q = QUESTS.wants('hubert');
    if (q) return q;
    if (m < 7 * 60) return 'putter';
    if (m >= 21 * 60) return 'putter';
    if (m >= 19 * 60 + 30) return 'bench';
    if (talkDay(d) && ((m >= 15 * 60 + 45 && m < 18 * 60) || AG.ronald.cur === 'visit' || AG.ronald.cur === 'visitCar'))
      return talkAtCar(d) ? 'car' : 'talk';
    if (m >= 12 * 60 && m < 13 * 60) return 'table';
    if (tripDay(d) && m >= 14 * 60 + 30 && m < 15 * 60 + 30 && !tripBlocked()) return 'trip';
    const blk = Math.floor((m - 7 * 60) / 65);
    return PATTERN[d % 2][blk % PATTERN[0].length];
  }
  function ronaldPlan(m, d) {
    const q = QUESTS.wants('ronald');
    if (q) return q;
    if (m < 7 * 60 + 30) return 'feed';
    if (talkDay(d) && m >= 15 * 60 + 30 && m < 17 * 60 + 50) return talkAtCar(d) ? 'visitCar' : 'visit';
    if (m >= 17 * 60 + 50 && m < 19 * 60) return 'feed';
    if (m >= 19 * 60) return 'stall';
    if (d % 2 === 1 && m >= 8 * 60 && m < 11 * 60) return 'mow';
    if (d % 2 === 0 && m >= 13 * 60 && m < 15 * 60 + 30) return 'mow';
    return 'paddock';
  }
  const ACTS = {
    chop: hChop,
    saw: hSaw,
    stack: hStack,
    car: hCar,
    putter: hPutter,
    table: w => sitFor(w, CH()[0]),
    // his bench (game/home.js lets the visitor sit there too: then he takes the chair at the table)
    bench: w =>
      sitFor(w, PLAY.seat && Math.hypot(PLAY.seat.x - BENCH.x, PLAY.seat.y - BENCH.y) < 0.8 ? CH()[0] : BENCH),
    talk: hTalk,
    trip: hTrip,
    feed: rFeed,
    paddock: rPaddock,
    stall: rStall,
    mow: rMow,
    visit: rVisit,
    visitCar: rVisitCar,
  };
  // minimum real seconds before the plan may change an activity (a walk across the yard should lead to some work)
  const MIN = {
    chop: 25,
    saw: 25,
    stack: 30,
    car: 30,
    putter: 15,
    table: 20,
    bench: 20,
    talk: 30,
    feed: 30,
    paddock: 15,
    stall: 15,
    visit: 75,
    visitCar: 60,
  };
  const AG = {};
  function agent(w, plan, home) {
    const a = { name: w.name, w, plan, home, cur: null, it: null, t0: 0, lock: false, forced: null };
    a.after = () => holdProp(w); // npc/npc_real.js calls fig.after(fig) after each pose update
    a.ctl = dt => {
      if (w.drive || w.away || a.forced === 'off') return false; // ('off': the plain walker of npc/npc.js – tests that pose him by hand)
      if ((w.talking && !w.seated && !w.mow) || w.shy > 0) {
        if (w.fig.pose && w.fig.pose.k !== 'carry') w.fig.pose = null; // he turns to the visitor (npc/npc.js); the work waits
        return false;
      }
      DT = Math.min(dt, 0.1);
      if (!a.it) begin(a);
      try {
        if (a.it.next().done) {
          a.it = null;
          a.cur = null;
        }
      } catch (e) {
        console.warn('life', a.name, a.cur, e);
        a.it = null;
        a.cur = null;
        stand(w);
      }
      return true;
    };
    w.lifeCtl = a.ctl;
    w.life = {
      busy: () => !!(a.cur && a.cur !== 'trip' && a.cur !== 'visit' && (w.seated || (w.fig.pose && w.v === 0))),
      chatting: () => !!TALK.on,
      get cur() {
        return a.cur;
      },
    };
    AG[w.name] = a;
    return a;
  }
  function begin(a) {
    const m = mins(),
      d = CLOCK.day();
    a.cur = a.forced || a.plan(m, d);
    a.t0 = now();
    a.it = ACTS[a.cur](a.w, a);
  }
  function stop(a) {
    if (a.it) {
      try {
        a.it.return();
      } catch (e) {
        console.warn('life stop', e);
      }
    }
    a.it = null;
    a.cur = null;
    a.lock = false;
  }
  agent(H, hubertPlan, [-34.5, 38.5]);
  agent(R, ronaldPlan, [40, -42]);
  // ================= the two at the table: conversations about the village =================
  // [speaker, line] – Hubert says little and expects rain, Ronald talks (village life after docs/plans/plan_leben.md section 2)
  const TALKS = [
    [
      ['r', 'Freitag ist wieder Skat in der alten Schule. Kommst du?'],
      ['h', 'Wenn der Karl nicht wieder mischt wie ein Bäcker.'],
      ['r', 'Der hat letzte Woche dreimal Grand Hand gespielt.'],
      ['h', 'Und dreimal verloren.'],
      ['r', 'Die Inge bringt wieder ihren Zwiebelkuchen mit.'],
      ['h', 'Dann komm ich.'],
    ],
    [
      ['r', 'Die Jungs wollen Samstag ein Feuer machen, draußen am Acker Richtung Klinge.'],
      ['h', 'Bei dem Wind? Da brennt die halbe Klinge mit.'],
      ['r', 'Die Feuerwehr ist doch dabei.'],
      ['h', 'Eben. Die stehen rum und trinken Bier.'],
      ['r', 'Bring Kartoffeln mit. Die vom Acker.'],
      ['h', 'Nu. Ein paar.'],
    ],
    [
      ['r', 'Und? Läuft er wieder, dein Kombi?'],
      ['h', 'Läuft. Bis er nicht mehr läuft.'],
      ['r', 'Was war es diesmal?'],
      ['h', 'Keilriemen. Lichtmaschine. Und der Auspuff hängt.'],
      ['r', 'Kauf dir doch mal einen neuen.'],
      ['h', 'Einen neuen? Da ist nur noch Elektrik drin. Den kriegst du nie wieder heil.'],
    ],
    [
      ['r', 'Hast du gesehen, was der Junge drüben baut? Ein Häuschen mit Dachterrasse.'],
      ['h', 'Gesehen. Lärche, sagt er.'],
      ['r', 'Fleißig ist er. Und freundlich.'],
      ['h', 'Hm. Wird sich zeigen, wenn der erste Winter kommt.'],
      ['r', 'Du warst auch mal jung, Hubert.'],
      ['h', 'Das ist lange her.'],
    ],
    [
      ['r', 'Die Wildschweine waren wieder in den Kartoffeln, unten am Waldrand.'],
      ['h', 'Hab ich gesehen. Der ganze Acker umgegraben.'],
      ['r', 'Der Jäger sagt, nächste Woche sitzt er an.'],
      ['h', 'Der sitzt seit zwanzig Jahren an. Gesehen hat er noch keins.'],
      ['r', 'Aber der Schnaps im Hochsitz ist immer alle.'],
    ],
    [
      ['h', 'Morgen gibt es Regen.'],
      ['r', 'Im Radio sagen sie Sonne.'],
      ['h', 'Mein Knie sagt Regen.'],
      ['r', 'Dein Knie sagt seit dreißig Jahren Regen.'],
      ['h', 'Und meistens stimmt es.'],
      ['r', 'Na, dann stapel dein Holz mal schnell rein.'],
    ],
    [
      ['r', 'Die Uhr an der alten Schule geht wieder nach.'],
      ['h', 'Seit sie den Strom umgestellt haben.'],
      ['r', 'Die Gerda sagt, im Frühjahr wird die Linde geschnitten.'],
      ['h', 'Die Linde steht seit achtzehnhundertachtundachtzig. Die braucht keinen Schnitt.'],
      ['r', 'Sag das der Gemeinde.'],
      ['h', 'Mach ich. Freitag. Beim Skat.'],
    ],
    [
      ['r', 'Wie viele Hütten hast du jetzt eigentlich voll?'],
      ['h', 'Vier. Die fünfte wird diese Woche.'],
      ['r', 'Damit heizt du doch drei Winter.'],
      ['h', 'Zwei. Und einen für schlechte Zeiten.'],
      ['r', 'Du hast doch mehr Holz als die ganze Klinge.'],
      ['h', 'Holz ist nie genug.'],
    ],
    [
      ['h', 'Dein Bock hat heute früh wieder gebrüllt wie ein Ochse.'],
      ['r', 'Egon? Der hatte Hunger.'],
      ['h', 'Um fünf Uhr?'],
      ['r', 'Der hat immer um fünf Hunger. Wie du.'],
      ['h', 'Hm. Gib ihm mehr Heu.'],
    ],
    [
      ['r', 'Der Bus fährt ab Dezember nur noch zweimal am Tag nach Schleusingen.'],
      ['h', 'Mir egal. Ich hab den Traktor.'],
      ['r', 'Mit dem Traktor zum Arzt?'],
      ['h', 'Bin ich doch letztes Jahr auch. Hat keiner was gesagt.'],
      ['r', 'Weil keiner sich getraut hat.'],
    ],
    [
      ['h', 'Deine Frieda war wieder in meinem Kohl.'],
      ['r', 'Die mag deinen Kohl eben. Das ist ein Kompliment.'],
      ['h', 'Dann soll sie ihn bezahlen.'],
      ['r', 'Ich bring dir Käse vorbei. Von Frieda persönlich.'],
      ['h', 'Hm. Na gut.'],
    ],
    [
      ['r', 'Der Junge drüben macht jetzt Schneidebretter. Stirnholz, aus Eiche.'],
      ['h', 'Stirnholz? Da muss man genau arbeiten.'],
      ['r', 'Ich hab eins bestellt. Für die Küche.'],
      ['h', 'Wenn es was taugt, will ich auch eins.'],
      ['r', 'Sag ihm das selber. Der beißt nicht.'],
    ],
  ];
  const TALK = { on: false, i: 0, line: 0, t: 0, gap: 4, n: 0 };
  function hearing() {
    return !NPCUI.cur() && Math.hypot(P.x - H.x, P.y - H.y) < 18 && P.mode === 'walk';
  }
  function tickTalk(dt) {
    const both =
      !H.talking &&
      !R.talking &&
      ((H.seated &&
        R.seated &&
        H.seated === CH()[0] &&
        R.seated === CH()[1] &&
        AG.hubert.cur === 'talk' &&
        AG.ronald.cur === 'visit') ||
        (atCarNow &&
          AG.hubert.cur === 'car' &&
          AG.ronald.cur === 'visitCar' &&
          Math.hypot(H.x - R.x, H.y - R.y) < 4.5));
    if (!both) {
      if (TALK.on) {
        TALK.on = false;
        H.fig.speak = R.fig.speak = false;
      }
      return;
    }
    if (!TALK.on) {
      TALK.on = true;
      TALK.line = -1;
      TALK.t = 0;
      TALK.gap = 2.5;
      TALK.i = (CLOCK.day() * 3 + TALK.n++) % TALKS.length;
    }
    TALK.t += dt;
    if (TALK.t < TALK.gap) return;
    const C = TALKS[TALK.i];
    TALK.line++;
    TALK.t = 0;
    if (TALK.line >= C.length) {
      // a pause, then the next topic
      TALK.i = (TALK.i + 1) % TALKS.length;
      TALK.line = -1;
      TALK.gap = 14 + Math.random() * 10;
      H.fig.speak = R.fig.speak = false;
      return;
    }
    const [who, text] = C[TALK.line];
    const sp = who === 'h' ? H : R,
      li = sp === H ? R : H;
    sp.fig.speak = true;
    li.fig.speak = false;
    TALK.gap = Math.max(2.4, text.length * 0.062) + 0.7;
    TALK.last = text;
    if (hearing()) NPCUI.sub(sp, text);
    markDirty();
  }
  // ---- what they mutter at their work when the visitor stands close by (text only) ----
  const MUTTER = {
    chop: [
      'Buche. Die brennt lange.',
      'Zwei Jahre muss das trocknen. Mindestens.',
      'Ein Schlag, ein Scheit. So muss das.',
    ],
    stack: ['Rinde nach oben, sonst zieht der Regen rein.', 'Die fünfte wird diese Woche voll.', 'Luft muss durch.'],
    car: [
      'Der Krümmer. Immer der Krümmer.',
      'Zwanzig Jahre und läuft. Noch.',
      'Wer hat denn den Schlüssel wieder verlegt.',
    ],
    putter: ['Wo ist denn die Zange hin.', 'Ordnung ist das halbe Leben.'],
    feed: [
      'Na, ihr Rabauken? Essen gibt es!',
      'Egon, lass Lotte auch was übrig.',
      'Nicht drängeln, für jeden ist was da.',
    ],
    paddock: ['Der Pfosten hier muss mal neu.', 'Na, Frieda, heute schon ausgebüxt?', 'Wasser ist auch noch genug.'],
    stall: ['Rein mit euch, es wird kalt.', 'Morgen früh gibt es wieder Heu.'],
  };
  const muttered = { hubert: 0, ronald: 0 };
  function mutter(a) {
    const w = a.w,
      L = MUTTER[a.cur];
    if (!L || TALK.on || NPCUI.cur() || w.talking || !w.fig.g.visible || P.mode !== 'walk') return;
    if (Math.hypot(P.x - w.x, P.y - w.y) > 7 || now() - muttered[a.name] < 40 || Math.random() > 0.12) return;
    muttered[a.name] = now();
    w.sayText(L[(Math.random() * L.length) | 0]);
  }
  // ================= per tick =================
  let acc = 0,
    wasAway = { hubert: false, ronald: false };
  function tick(dt) {
    tickHalves(dt);
    tickTalk(dt);
    acc += dt;
    if (acc < 0.4) return;
    acc = 0;
    const m = mins(),
      d = CLOCK.day(),
      nightGoat = m >= 20 * 60 + 30 || m < 6 * 60 + 30;
    if (nightGoat && !QUESTS.holds('goats') && GOATLURE.until < now() + 5) lure(PAD.x1 - 2.4, PAD.y1 - 2.2, 1.0, 60);
    for (const a of Object.values(AG)) {
      const w = a.w;
      // night: at home (npc/hours.js hides them out of sight); in the morning they come from home
      if (w.away && !wasAway[a.name]) {
        stop(a);
        if (a.name === 'hubert' && (a.trip || w.drive || w.inside)) endTrip(a);
        if (w.mow) {
          w.mow = false;
          w.fig.mode = 'stand';
        }
        rise(w);
        w.x = a.home[0];
        w.y = a.home[1];
        w.place();
        HOFCAR.bonnet(0);
        fillRack(0);
      }
      wasAway[a.name] = !!w.away;
      if (w.fig.after !== a.after) w.fig.after = a.after; // (the real figures replace the simple ones after loading)
      if (w.away) continue;
      // a task steers him (game/quests.js sets its own controller): the activity waits and starts again afterwards
      if (w.ctl && w.ctl !== a.ctl) {
        if (a.it) {
          stop(a);
          rise(w);
          hand(w, null);
          pose(w, null);
        }
        continue;
      }
      if (!w.ctl && !w.drive) w.ctl = a.ctl;
      // late in the evening and Hubert is still in the village: home at once when nobody sees it
      if (
        a.name === 'hubert' &&
        (m >= 21 * 60 + 30 || m < 6 * 60) &&
        (a.trip || w.inside) &&
        Math.hypot(P.x - w.x, P.y - w.y) > 60
      ) {
        endTrip(a);
        w.x = TRACTOR_HOME.x + 1;
        w.y = TRACTOR_HOME.y - 1.2;
        w.fig.g.visible = true;
        w.place();
      }
      if (a.forced === 'off') {
        if (a.it) stop(a);
        continue;
      }
      mutter(a);
      if (a.cur && !a.lock && !w.drive) {
        const want = a.forced || a.plan(m, d),
          t1 = w.since && w.since >= a.t0 ? w.since : null; // arrived at the work (else still on the way)
        if (want !== a.cur && ((t1 && now() - t1 > (MIN[a.cur] || 20)) || (!t1 && now() - a.t0 > 150))) stop(a);
      }
    }
    if (HOFCAR.open > 0 && m >= 21 * 60 && AG.hubert.cur !== 'car') HOFCAR.bonnet(0);
    if (m >= 6 * 60 && m < 21 * 60 && HOFCAR.open < 1 && AG.hubert.cur === 'car') HOFCAR.bonnet(1);
  }
  window.TICKS.push(tick);
  // the visitor may sit down at Hubert's table too (a free chair): to listen to the two, or to wait for them
  HOF.chairs.forEach((c, i) =>
    PLAY.act({
      id: 'seat:hof' + i,
      r: 1.3,
      prio: -0.1,
      pos: [c.x, c.y, c.seat],
      label: () => (PLAY.seat || H.seated === c || R.seated === c ? null : 'Auf den Stuhl setzen'),
      run: () => PLAY.sit({ x: c.x, y: c.y, eye: c.seat + 0.78, yaw: c.az, pitch: -4, kind: 'sit' }),
    })
  );
  // while Hubert sits on his bench, the visitor cannot sit down on him (the seat of game/home.js)
  {
    const b = PLAY.acts().find(a => a.id === 'seat:hubertbench');
    if (b) {
      const l0 = b.label;
      b.label = () => (H.seated === BENCH ? null : l0());
    }
  }
  // place names (garden/places.js window.sitePlace): Hubert's yard and workshops, Ronald's meadow
  {
    const sp0 = window.sitePlace;
    const inShed = (x, y) =>
      SHEDS.some(S => {
        const dx = x - S.c[0],
          dy = y - S.c[1];
        return Math.abs(dx * S.u[0] + dy * S.u[1]) < S.D / 2 && Math.abs(dx * S.v[0] + dy * S.v[1]) < S.L / 2;
      });
    window.sitePlace = (x, y, z) => {
      const r = sp0 ? sp0(x, y, z) : null;
      if (r === 'Nachbargrundstück West' && y > -26 && y < 40 && x > -44)
        return inShed(x, y) ? 'Huberts Werkstatt' : 'Huberts Hof';
      if (r === 'Nachbargrundstück Ost' && x > PAD.x0 - 2 && x < PAD.x1 + 2 && y > PAD.y1 && y < 10)
        return 'Ronalds Wiese';
      return r;
    };
  }
  // the viewpoints follow the moved paddock and the yard (game/player.js SPOTS; menu "Ziegen", "Bei Hubert")
  if (SPOTS.ziegen) Object.assign(SPOTS.ziegen, { pos: [PAD.x0 - 2.6, PAD.gy + 1.5], yaw: 108, pitch: -2 });
  if (SPOTS.hubert) Object.assign(SPOTS.hubert, { pos: [-11.6, 8.2], yaw: -112, pitch: -3 });
  return {
    AG,
    get TRIP() {
      return TRIP();
    },
    TALK,
    TALKS,
    LANES,
    MS,
    plan: n => AG[n] && AG[n].plan(mins(), CLOCK.day()),
    cur: n => AG[n] && AG[n].cur,
    // tests and the tasks: make a neighbour do something now (null: back to the plan)
    force(n, k) {
      const a = AG[n];
      if (!a) return;
      a.forced = k || null;
      if (a.cur !== k) {
        if (a.name === 'hubert' && a.trip) endTrip(a);
        stop(a);
        rise(a.w);
        hand(a.w, null);
        pose(a.w, null);
        if (a.w.mow) {
          a.w.mow = false;
          a.w.fig.mode = 'stand';
          a.w.zOff = 0;
        }
      }
    },
    fillRack,
    endTrip: () => endTrip(AG.hubert),
    swaths: () => SWATH.n,
  };
})();
window.LIFE = LIFE;
