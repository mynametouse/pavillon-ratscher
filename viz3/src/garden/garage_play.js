// ===================== feat/garage (Falko, 23.10.2026 10:53): the old garage to use – sliding doors, the lawn mower, petrol =====================
// „… zwei Schiebetüren, die man aufschieben kann. Und dort sind Geräte drin, also Rasenmäher, den kann man auch rausholen und damit den
// Rasen mähen übrigens. … Der Rasenmäher braucht auch Benzin. Auch das Aggregat läuft übrigens mit Benzin statt Diesel.“
// The garage itself (walls, leaves, shelves, the models) is garden/garage.js; here what one does with it, through the core services:
//  - the two leaves slide open and shut one by one (action „Tor aufschieben“ / „Tor zuschieben“), with a metal rumble; they are obstacles
//    where they are (VEH.extra: walkers and vehicles)
//  - the mower: „Rasenmäher nehmen“ at its handle – then one pushes it (it stays in front, turns with the view, walking backwards pulls it),
//    „Motor starten“ (pull cord, only with petrol), the running mower cuts the lawn (GRASS.cut in garden/grass.js, it grows back over a few
//    game days), the tank (1 l) lasts about an hour of game time; Q lets go (the safety bar stops the engine); KERN event 'garage:gemaeht'
//  - the red petrol can (PLAY thing): „Rasenmäher tanken“, „Aggregat tanken“ (the workshop's generator runs on petrol: its tank empties
//    while machines run, empty it stops them); an empty can is full again the next morning (the petrol station)
//  - where the mower and the cans stand: phase 0 in the old garage, from phase 1 at the garage at the south end (GARAGE.home); Hubert's
//    diesel can (game/quests.js) follows when the phase changes
// Saved: one key, pav-garage-v1 (doors, mower, can, generator, the mown lawn as a coarse grid). Test: viz3/test/garage.py.
import * as THREE from 'three';
import { SAVE } from '../core/save.js';
import { KERN } from '../core/kern.js';
import { scene, V } from '../core/head.js';
import { dimIndoor, markDirty, patchSV, whenLoaded } from '../core/assets.js';
import { DOORS, PHN } from '../core/geo.js';
import { GARAGE, MOWER, mkMower, mkPetrolCan } from './garage.js';
import { WORKS } from './workshop.js';
import { GRASS } from './grass.js';
import { blocked, floorAt, P, PHASE, setPhase } from '../game/walkable.js';
import { CAM3, go } from '../game/player.js';
import { audio } from '../audio/audio.js';
import { HELD, PLAY, SFX } from '../game/play.js';
import { QUESTS } from '../game/quests.js';
import { CLOCK } from '../time/clock.js';
import { VEH } from '../vehicles/vehicle.js';
export const GPLAY = (() => {
  const KEY = 'pav-garage-v1';
  const TANK = 1.0, // litres in the mower's tank
    BURN = 1.0, // litres per game hour: a tank lasts about an hour
    CAN_L = 10,
    GEN_L = 12,
    GEN_BURN = 1.1,
    REACH = 1.36, // the walker's middle → the middle of the deck
    CUT_R = 0.25; // blade radius
  const Z0 = GARAGE.Z0;
  const M = { x: 2, y: 2.78, z: Z0, az: 0, pitch: 0, mode: 'park', run: false, fuel: 0.6, warm: -1e9, tries: 0 };
  const C = { fuel: 8.0, refillAt: null };
  const GEN = { fuel: 9.0 };
  const S = {
    loaded: false,
    ph: null,
    px: 0,
    py: 0,
    cutAcc: 0,
    cutX: 1e9,
    cutY: 1e9,
    m2: 0,
    m2emit: 0,
    saveAcc: 0,
    tPrev: null,
    dirty: false,
  };
  const rnd2 = v => Math.round(v * 100) / 100;
  const fwdOf = az => [Math.sin((az * Math.PI) / 180), Math.cos((az * Math.PI) / 180)];
  const rgtOf = az => [Math.cos((az * Math.PI) / 180), -Math.sin((az * Math.PI) / 180)];
  const angDiff = (a, b) => {
    let d = a - b;
    while (d > 180) d -= 360;
    while (d < -180) d += 360;
    return d;
  };
  const litres = v => (Math.round(v * 10) / 10).toLocaleString('de-DE') + ' l';
  const pct = (v, cap) => Math.round((100 * Math.max(0, v)) / cap) + ' %';
  const on0 = () => PHASE <= PHN.bestand;
  // ======================= sounds (synthesised, positional through audio.spatial) =======================
  let nbuf = null;
  const ctxOf = () => (audio.ready && audio.ready() ? audio.raw() : null);
  function noise(c) {
    if (nbuf) return nbuf;
    const n = c.sampleRate * 2,
      b = c.createBuffer(1, n, c.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return (nbuf = b);
  }
  function burst(r, t, { f = 300, q = 0.8, type = 'bandpass', peak = 0.3, a = 0.005, d = 0.1, f1 = null, vol = 1 }) {
    const c = r.ctx,
      s = c.createBufferSource(),
      fl = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = noise(c);
    fl.type = type;
    fl.frequency.setValueAtTime(f, t);
    if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    fl.Q.value = q;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * vol), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    s.connect(fl);
    fl.connect(g);
    g.connect(r.sfx);
    s.start(t, Math.random() * 1.2, a + d + 0.05);
  }
  function tone(r, t, { f0 = 200, f1 = null, type = 'triangle', peak = 0.1, a = 0.004, d = 0.2, vol = 1 }) {
    const c = r.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + a + d);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * vol), t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
    o.connect(g);
    g.connect(r.sfx);
    o.start(t);
    o.stop(t + a + d + 0.05);
  }
  const near = (x, y, ref = 7) => {
    const sp = audio.spatial ? audio.spatial(x, y, ref) : { vol: 1 };
    return Math.min(1, sp.vol * 1.4);
  };
  // the leaf on its rollers: a low rumble with rattling sheet, a clang at the stop
  function rumble(x, y, dur, open) {
    const r = ctxOf();
    if (!r) return;
    const t = r.ctx.currentTime + 0.01,
      vol = near(x, y, 9);
    if (vol < 0.01) return;
    burst(r, t, { type: 'lowpass', f: 220, peak: 0.5, a: 0.15, d: dur, vol });
    for (let i = 0; i < Math.round(dur * 14); i++)
      burst(r, t + 0.05 + i / 14 + Math.random() * 0.03, {
        f: 900 + Math.random() * 1400,
        q: 4,
        peak: 0.07,
        d: 0.04,
        vol,
      });
    for (let i = 0; i < 3; i++) tone(r, t + i * 0.35, { f0: 140 + i * 13, f1: 120, peak: 0.05, d: 0.4, vol });
    const te = t + dur;
    burst(r, te, { type: 'lowpass', f: 400, peak: 0.6, d: 0.18, vol });
    for (const [f, k] of [
      [310, 0.16],
      [520, 0.1],
      [830, 0.06],
    ])
      tone(r, te + 0.005, { f0: f, f1: f * 0.97, peak: k * (open ? 1 : 1.2), d: 0.5, vol });
  }
  // the starter rope: a quick rising rasp, a few strokes of the engine (caught or not)
  function pull(x, y, caught) {
    const r = ctxOf();
    if (!r) return;
    const t = r.ctx.currentTime + 0.01,
      vol = near(x, y, 8);
    burst(r, t, { f: 700, f1: 2600, q: 1.2, peak: 0.22, a: 0.25, d: 0.12, vol });
    for (let i = 0; i < (caught ? 4 : 6); i++) {
      const tt = t + 0.3 + i * (caught ? 0.07 : 0.11);
      burst(r, tt, { type: 'lowpass', f: 260, peak: 0.45, d: 0.06, vol });
      tone(r, tt, { f0: 95, f1: 70, type: 'sawtooth', peak: 0.06, d: 0.07, vol });
    }
  }
  // the engine dying: a few slower strokes
  function sputter(x, y) {
    const r = ctxOf();
    if (!r) return;
    const t = r.ctx.currentTime + 0.01,
      vol = near(x, y, 8);
    for (let i = 0; i < 5; i++) {
      const tt = t + i * (0.1 + i * 0.05);
      burst(r, tt, { type: 'lowpass', f: 240, peak: 0.4 - i * 0.06, d: 0.07, vol });
    }
  }
  const ENGINE = 'garage:maeher';
  function engineSound(on) {
    if (on) {
      if (!audio.hasLoop(ENGINE) && audio.has('generator')) {
        audio.loopAt(ENGINE, 'generator', M.x, M.y, { vol: 0.85, ref: 7, rate: 1.0 });
        audio.loopRate(ENGINE, 1.38, 0.35);
      }
    } else if (audio.hasLoop(ENGINE)) {
      audio.loopRate(ENGINE, 0.6, 0.5);
      audio.stopLoop(ENGINE, 0.9);
    }
  }
  // ======================= the sliding leaves =======================
  const leafOff = L => {
    const k = L.k * L.k * (3 - 2 * L.k);
    return L.side * L.travel * k;
  };
  const leafBox = L => {
    if (!on0()) return null;
    const o = leafOff(L);
    return {
      c: [(L.x0 + L.x1) / 2 + o, 4.026],
      ax: [1, 0],
      ay: [0, 1],
      ex: (L.x1 - L.x0) / 2,
      ey: 0.03,
      z0: L.z0,
      z1: L.z1,
    };
  };
  function slide(L, v, quiet) {
    if (L.want === v) return;
    L.want = v;
    if (!quiet) rumble((L.x0 + L.x1) / 2 + leafOff(L), 4.03, 1.15, v > 0.5);
    S.dirty = true;
  }
  for (const L of GARAGE.leaves) {
    VEH.extra.push({ box: () => leafBox(L), garage: L.key });
    KERN.act({
      id: 'garage:' + L.key,
      r: 1.7,
      prio: 0.1,
      obj: () => L.g,
      pos: () => {
        const hx = L.side < 0 ? L.x1 - 0.16 : L.x0 + 0.16;
        return [hx + leafOff(L), 4.03, Z0 + 1.1];
      },
      label: () => (on0() ? (L.want > 0.5 ? 'Tor zuschieben' : 'Tor aufschieben') : null),
      run: () => slide(L, L.want > 0.5 ? 0 : 1),
    });
  }
  function leavesTick(dt) {
    let moving = false;
    for (const L of GARAGE.leaves) {
      if (L.k === L.want) continue;
      const s = dt / 1.15;
      L.k = L.want > L.k ? Math.min(L.want, L.k + s) : Math.max(L.want, L.k - s);
      L.g.position.x = leafOff(L);
      moving = true;
    }
    if (moving) markDirty(true);
  }
  // can a thing at p be reached from where the walker is (not through the closed garage)
  GARAGE.reach = (p, px = P.x, py = P.y) => {
    if (!on0() || !GARAGE.inside(p[0], p[1]) || GARAGE.inside(px, py)) return true;
    const [W, E] = GARAGE.leaves;
    return py > 3.8 && py < 5.4 && ((px < 2.0 && W.k > 0.6) || (px >= 2.0 && E.k > 0.6));
  };
  // ======================= the mower =======================
  const MW = mkMower();
  scene.add(MW.g);
  // indoors (in the old garage) the mower takes the dim garage colours (same shader programs as the garage)
  const dimOf = new Map();
  MW.g.traverse(o => {
    if (!o.isMesh) return;
    const m = o.material;
    if (!dimOf.has(m)) {
      const d = m.clone();
      delete d.userData.svPatched;
      dimOf.set(m, patchSV(dimIndoor(d, 0.6, 0.6)));
    }
    o.userData.mat = [m, dimOf.get(m)];
  });
  let dimNow = null;
  function dimTick() {
    const d = on0() && GARAGE.inside(M.x, M.y);
    if (d === dimNow) return;
    dimNow = d;
    MW.g.traverse(o => {
      if (o.isMesh && o.userData.mat) o.material = o.userData.mat[d ? 1 : 0];
    });
    markDirty();
  }
  function pose() {
    MW.g.position.copy(V(M.x, M.y, M.z));
    MW.g.rotation.set(M.pitch, (-M.az * Math.PI) / 180, 0, 'YXZ');
    MW.g.updateMatrixWorld(true);
  }
  const floorUnder = (x, y, z) => floorAt(x, y, z + 0.05);
  function settle() {
    const f = fwdOf(M.az),
      zf = floorUnder(M.x + f[0] * 0.2, M.y + f[1] * 0.2, M.z),
      zb = floorUnder(M.x - f[0] * 0.21, M.y - f[1] * 0.21, M.z);
    M.z = (zf + zb) / 2;
    M.pitch = Math.atan2(zf - zb, 0.41);
  }
  const TOKEN = { garage: 'maeher' };
  // the footprint: deck, wheels and the grass catcher (the handle is above everything)
  const mowBox = (x, y, az, z) => {
    const f = fwdOf(az);
    return { c: [x - f[0] * 0.21, y - f[1] * 0.21], ax: rgtOf(az), ay: f, ex: 0.34, ey: 0.55, z0: z, z1: z + 0.5 };
  };
  VEH.extra.push({ box: () => mowBox(M.x, M.y, M.az, M.z), tow: TOKEN, garage: 'maeher' });
  // would the mower bump into something there (walls, shelves, trees, the leaves, vehicles, the neighbours), or drop more than a step
  function hits(x, y, az, z) {
    const A = mowBox(x, y, az, z);
    if (VEH.boxHits(A, z + 0.06, z + 0.5, TOKEN).length) return true;
    const f = fwdOf(az);
    for (const s of [0.32, -0.75]) {
      const q = floorUnder(x + f[0] * s, y + f[1] * s, z);
      if (Math.abs(q - z) > 0.3) return true;
    }
    return false;
  }
  // the handle as a thing in the hand: the figure holds it with both arms (third person), nothing drawn in the first-person view
  const HANDLE = PLAY.thing({
    id: 'maeher',
    name: 'Rasenmäher',
    carry3: 'arms',
    grip3: { fwd: 0.3, dy: -0.05 },
    desc: () =>
      'Benzin-Rasenmäher am Griff: schieben (W), ziehen (S), lenken mit dem Blick. Tank ' +
      litres(M.fuel) +
      ' von 1 l.',
    world: null,
    held: new THREE.Group(),
    icon3d: () => MW.g,
    iconRot: [-0.5, 2.4, 0],
    dropLabel: 'Rasenmäher loslassen',
    sfx: () => SFX.click(),
    onPlace: () => {
      HANDLE.state = 'gone';
      release('drop');
    },
  });
  HANDLE.gone();
  // the grip in the world, and where one stands to push
  const gripW = () => {
    const f = fwdOf(M.az);
    return [M.x + f[0] * MOWER.grip[1], M.y + f[1] * MOWER.grip[1], M.z + MOWER.grip[2]];
  };
  const standW = () => {
    const f = fwdOf(M.az);
    return [M.x - f[0] * REACH, M.y - f[1] * REACH];
  };
  function grab() {
    if (M.mode === 'push') return;
    const [sx, sy] = standW(),
      fz = floorAt(sx, sy, M.z + 0.3);
    if (blocked(sx, sy, fz) || Math.abs(fz - M.z) > 0.35) {
      PLAY.think('Da komme ich nicht hinter den Griff.');
      return;
    }
    P.x = sx;
    P.y = sy;
    P.feet = fz;
    P.vz = 0;
    P.yaw = M.az;
    P.body = M.az;
    if (!CAM3.on) P.pitch = Math.min(P.pitch, -22);
    S.px = P.x;
    S.py = P.y;
    M.mode = 'push';
    M.tries = 0;
    PLAY.give(HANDLE);
    if (PLAY.carry !== HANDLE) PLAY.toHand(HANDLE);
    S.dirty = true;
    markDirty();
  }
  function release(why) {
    if (M.mode !== 'push') return;
    M.mode = 'park';
    if (M.run) stop(why === 'drop' || why === 'hand' ? 'Bügel losgelassen – der Motor geht aus.' : null);
    if (PLAY.slotOf(HANDLE) >= 0) PLAY.take(HANDLE);
    HANDLE.state = 'gone';
    S.dirty = true;
    save();
  }
  function start() {
    if (M.run || M.mode !== 'push') return;
    if (M.fuel <= 0.005) {
      PLAY.think('Der Tank ist leer. Erst tanken: Mäher loslassen (Q), den Benzinkanister nehmen.');
      return;
    }
    // cold: the first pull seldom does it
    const cold = CLOCK.t - M.warm > 45 && M.tries === 0;
    M.tries++;
    pull(M.x, M.y, !cold);
    if (cold) {
      PLAY.think('Springt nicht an – kalt braucht er meist zwei Züge.', 2400);
      return;
    }
    M.run = true;
    M.warm = CLOCK.t;
    S.m2 = 0;
    S.m2emit = 0;
    setTimeout(() => M.run && engineSound(true), 380);
    KERN.emit('garage:start', { fuel: M.fuel });
  }
  function stop(msg) {
    if (!M.run) return;
    M.run = false;
    M.warm = CLOCK.t;
    engineSound(false);
    sputter(M.x, M.y);
    if (msg) PLAY.think(msg, 2600);
    if (S.m2 > 0.01) KERN.emit('garage:gemaeht', { m2: rnd2(S.m2), gesamt: rnd2(GRASS.cutArea(CLOCK.t)) });
    S.m2 = 0;
    S.m2emit = 0;
    S.dirty = true;
    save();
  }
  KERN.act({
    id: 'garage:maeher',
    r: 1.25,
    prio: 0.3,
    obj: () => MW.g,
    pos: () => gripW(),
    label: () =>
      M.mode === 'park' && !PLAY.hold && GARAGE.reach([M.x, M.y]) && !(VEH && VEH.cur) ? 'Rasenmäher nehmen' : null,
    run: grab,
  });
  KERN.act({
    id: 'garage:motor',
    r: 0.6,
    prio: 1.5,
    gest3: null,
    pos: () => [P.x, P.y, P.feet + 1.0],
    label: () =>
      M.mode === 'push' && PLAY.carry === HANDLE
        ? M.run
          ? 'Motor abstellen · Tank ' + pct(M.fuel, TANK)
          : M.fuel > 0.005
            ? 'Motor starten · Tank ' + pct(M.fuel, TANK)
            : 'Tank leer'
        : null,
    hold: () => (!M.run && M.fuel > 0.005 ? 0.7 : 0),
    holdLabel: 'Am Seil ziehen …',
    run: () => (M.run ? stop() : start()),
  });
  // ---- pushing: the mower stays in front, its heading follows the view (it swings round the walker), walking moves both along it ----
  function pushTick(dt) {
    if (PLAY.carry !== HANDLE || P.mode !== 'walk' || PLAY.seated() || (VEH && VEH.cur)) {
      release(PLAY.carry !== HANDLE ? 'hand' : 'away');
      return;
    }
    const f0 = fwdOf(M.az),
      d = angDiff(P.yaw, M.az),
      maxT = 85 * dt,
      tq = Math.max(-maxT, Math.min(maxT, d));
    // the step along the mower (sideways steps are not possible with it), slower than walking
    let s = (P.x - S.px) * f0[0] + (P.y - S.py) * f0[1];
    const vmax = 1.35 * dt * (s < 0 ? 0.7 : 1);
    s = Math.max(-vmax, Math.min(vmax, s * 0.55));
    const tryAt = (s1, t1) => {
      const az = M.az + t1,
        f = fwdOf(az),
        px = S.px + f0[0] * s1,
        py = S.py + f0[1] * s1,
        mx = px + f[0] * REACH,
        my = py + f[1] * REACH,
        mz = floorUnder(mx, my, M.z);
      if (hits(mx, my, az, mz)) return null;
      if (blocked(px, py, P.feet)) return null;
      return { az, px, py, mx, my, mz };
    };
    const r = tryAt(s, tq) || (Math.abs(tq) > 1e-4 ? tryAt(s, 0) : null) || (Math.abs(s) > 1e-5 ? tryAt(0, tq) : null);
    const ox = M.x,
      oy = M.y;
    if (r) {
      P.x = r.px;
      P.y = r.py;
      M.az = r.az;
      M.x = r.mx;
      M.y = r.my;
      M.z = r.mz;
    } else {
      P.x = S.px;
      P.y = S.py;
    }
    P.body = M.az;
    S.px = P.x;
    S.py = P.y;
    settle();
    const ds = Math.hypot(M.x - ox, M.y - oy) * Math.sign(s || 1);
    if (Math.abs(ds) > 1e-5) for (const w of MW.wheels) w.g.rotation.x -= ds / w.r;
    pose();
    markDirty();
  }
  // ---- the running engine: fuel, the lawn under the deck, the sound, a little shaking ----
  function runTick(dt, dmin) {
    M.fuel = Math.max(0, M.fuel - (dmin / 60) * BURN);
    M.warm = CLOCK.t;
    if (M.fuel <= 0) {
      stop('Der Tank ist leer – der Motor geht aus.');
      return;
    }
    S.cutAcc += dt;
    const moved = Math.hypot(M.x - S.cutX, M.y - S.cutY);
    if (S.cutAcc > 0.12 || moved > 0.1) {
      S.cutAcc = 0;
      S.cutX = M.x;
      S.cutY = M.y;
      if (!(on0() && GARAGE.inside(M.x, M.y))) {
        const f = fwdOf(M.az),
          shade = Math.abs(f[1]) >= Math.abs(f[0]) ? Math.sign(f[1]) : Math.sign(f[0]);
        const m2 = GRASS.cut(M.x + f[0] * 0.03, M.y + f[1] * 0.03, CUT_R, CLOCK.t, shade);
        S.m2 += m2;
        if (S.m2 - S.m2emit >= 10) {
          S.m2emit = S.m2;
          KERN.emit('garage:gemaeht', { m2: rnd2(S.m2), gesamt: rnd2(GRASS.cutArea(CLOCK.t)), laeuft: true });
        }
        if (m2 > 0) S.dirty = true;
      }
    }
    MW.body.position.y = Math.sin(performance.now() * 0.09) * 0.0015;
    if (audio.hasLoop(ENGINE)) {
      audio.moveLoop(ENGINE, M.x, M.y);
      audio.loopRate(ENGINE, P.speed > 0.2 ? 1.28 : 1.38, 0.4);
    }
    markDirty();
  }
  // ======================= the petrol can =======================
  const CANT = PLAY.thing({
    id: 'benzin',
    name: 'Benzinkanister',
    carry3: 'side',
    grip3: { hang: 0.33 },
    desc: () =>
      'Roter Benzinkanister, 10 l – ' +
      (C.fuel > 0.05 ? 'noch ' + litres(C.fuel) + ' Benzin.' : 'leer.') +
      ' Für den Rasenmäher und das Stromaggregat.',
    world: mkPetrolCan(),
    held: mkPetrolCan(),
    r: 1.25,
    hz: 0.28,
    prio: 0.25,
    vm: { x: 0.3, y: -0.47, z: -0.56, ry: 1.4, rz: 0.06 },
    sfx: () => SFX.clunk(),
    can: () => GARAGE.reach(CANT.pos),
    takeLabel: () => 'Benzinkanister nehmen' + (C.fuel > 0.05 ? '' : ' (leer)'),
    onPlace: () => (S.dirty = true),
    onTake: () => (S.dirty = true),
  });
  // pouring: the can tilts in the first-person view
  const pourWork = k => {
    HELD.anim = {
      t: 0,
      dur: 1,
      f: () => ({ rz: -1.0 * Math.min(1, k * 4), dy: 0.2 * Math.min(1, k * 4), dx: -0.1 * Math.min(1, k * 4) }),
      res: () => {},
      kind: 'pour',
    };
  };
  const capW = () => {
    const f = fwdOf(M.az),
      r = rgtOf(M.az);
    return [M.x + f[0] * -0.04 + r[0] * 0.1, M.y + f[1] * -0.04 + r[1] * 0.1, M.z + 0.4];
  };
  KERN.act({
    id: 'garage:tanken',
    r: 1.3,
    prio: 0.8,
    obj: () => MW.g,
    pos: () => capW(),
    need: () => (PLAY.has(CANT) ? CANT : null),
    label: () => {
      if (!PLAY.has(CANT) || M.mode !== 'park' || !GARAGE.reach([M.x, M.y])) return null;
      if (C.fuel <= 0.01) return 'Benzinkanister ist leer';
      if (M.fuel >= TANK - 0.02) return 'Rasenmäher: Tank voll';
      return 'Rasenmäher tanken · Tank ' + pct(M.fuel, TANK);
    },
    hold: () => (C.fuel > 0.01 && M.fuel < TANK - 0.02 ? 2.6 : 0),
    holdLabel: 'Tanken …',
    anim3: 'pour',
    start: () => SFX.glug(2.4),
    work: pourWork,
    cancel: () => (HELD.anim = null),
    run: () => {
      HELD.anim = null;
      if (C.fuel <= 0.01) return PLAY.think(emptyCanText());
      if (M.fuel >= TANK - 0.02) return PLAY.think('Der Tank ist schon voll.');
      const q = Math.min(C.fuel, TANK - M.fuel);
      C.fuel -= q;
      M.fuel += q;
      checkEmptyCan();
      PLAY.think(
        'Getankt: ' + litres(q) + '. Im Kanister ' + (C.fuel > 0.05 ? 'noch ' + litres(C.fuel) + '.' : 'nichts mehr.'),
        2600
      );
      S.dirty = true;
      save();
    },
  });
  const emptyCanText = () =>
    'Der Benzinkanister ist leer. Morgen früh ist er wieder voll – dann ist die Tankstelle offen.';
  function checkEmptyCan() {
    if (C.fuel > 0.01 || C.refillAt != null) return;
    C.fuel = 0;
    C.refillAt = Math.round(CLOCK.t + CLOCK.until(7, 0));
  }
  // ======================= the generator at the workshop (petrol) =======================
  const genM = WORKS.machines.find(m => m.key === 'gen');
  const genW = () => {
    const B0 = window.BUILD && window.BUILD.werkstatt,
      p = genM ? [genM.pos[0], genM.pos[1] - 0.8] : [4.35, -38.6];
    return B0 ? B0.tf(p[0], p[1]) : p;
  };
  KERN.act({
    id: 'garage:aggregat',
    r: 1.5,
    prio: -0.15,
    pos: () => [...genW(), 0.5],
    need: () => (PLAY.carry === CANT ? CANT : null),
    label: () =>
      PLAY.carry === CANT
        ? WORKS.genOn
          ? 'Aggregat läuft – nicht tanken'
          : GEN.fuel >= GEN_L - 0.05
            ? 'Aggregat: Tank voll'
            : 'Aggregat tanken · Tank ' + pct(GEN.fuel, GEN_L)
        : 'Stromaggregat (Benzin) · Tank ' + pct(GEN.fuel, GEN_L),
    hold: () => (PLAY.carry === CANT && !WORKS.genOn && C.fuel > 0.01 && GEN.fuel < GEN_L - 0.05 ? 3.2 : 0),
    holdLabel: 'Tanken …',
    anim3: 'pour',
    start: () => SFX.glug(3.0),
    work: pourWork,
    cancel: () => (HELD.anim = null),
    run: () => {
      HELD.anim = null;
      if (PLAY.carry !== CANT)
        return PLAY.think(
          'Benzin-Stromaggregat, 2,8 kW: Es läuft, sobald eine Maschine in der Werkstatt an ist, und braucht dann gut einen Liter in der Stunde. Tank: ' +
            litres(GEN.fuel) +
            ' von 12 l. Tanken mit dem roten Benzinkanister aus der Garage.',
          7000
        );
      if (WORKS.genOn) return PLAY.think('Nie bei laufendem Motor tanken – erst die Maschinen ausschalten.');
      if (C.fuel <= 0.01) return PLAY.think(emptyCanText());
      if (GEN.fuel >= GEN_L - 0.05) return PLAY.think('Der Tank des Aggregats ist voll.');
      const q = Math.min(C.fuel, GEN_L - GEN.fuel);
      C.fuel -= q;
      GEN.fuel += q;
      checkEmptyCan();
      PLAY.think('Aggregat getankt: ' + litres(q) + '. Tank ' + litres(GEN.fuel) + ' von 12 l.', 2800);
      S.dirty = true;
      save();
    },
  });
  let genWarn = -1e9;
  function genTick(dmin) {
    if (WORKS.genOn) {
      GEN.fuel = Math.max(0, GEN.fuel - (dmin / 60) * GEN_BURN);
      S.dirty = true;
    }
    if (GEN.fuel > 0) return;
    // empty: the machines stop (and do not start)
    let off = 0;
    for (const m of WORKS.machines) {
      const d = DOORS[m.key];
      if (d && d.kind === 'machine' && d.target > 0.5) {
        d.target = 0;
        off++;
      }
    }
    if (off && performance.now() - genWarn > 15000) {
      genWarn = performance.now();
      PLAY.think('Kein Strom – das Aggregat hat kein Benzin mehr. Mit dem Benzinkanister aus der Garage tanken.', 4500);
    }
  }
  // ======================= where things stand =======================
  const dist2 = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  function mowerHome(ph) {
    const h = GARAGE.home(ph).mower;
    M.x = h[0];
    M.y = h[1];
    M.az = h[3];
    M.z = floorUnder(h[0], h[1], h[2] + 0.1);
    settle();
    pose();
  }
  function canHome(T, h) {
    T.place(h[0], h[1], floorAt(h[0], h[1], h[2] + 0.1), (-h[3] * Math.PI) / 180);
  }
  // on the slab of the old garage once it is gone, or still at the home of the phase before: to the home of this phase
  const inOld = p => p[0] > -0.6 && p[0] < 4.6 && p[1] > -0.6 && p[1] < 4.7;
  function onPhase(old, ph) {
    if (M.mode === 'push') release('phase');
    const H0 = old == null ? null : GARAGE.home(old),
      H1 = GARAGE.home(ph),
      moveIt = p => ph > PHN.bestand && inOld(p);
    if ((H0 && dist2([M.x, M.y], H0.mower) < 0.4) || moveIt([M.x, M.y])) mowerHome(ph);
    if (CANT.state === 'world' && ((H0 && dist2(CANT.pos, H0.petrol) < 0.4) || moveIt(CANT.pos)))
      canHome(CANT, H1.petrol);
    const D = QUESTS.things && QUESTS.things.CAN;
    if (D && D.state === 'world' && ((H0 && dist2(D.pos, H0.diesel) < 0.4) || moveIt(D.pos))) canHome(D, H1.diesel);
    S.dirty = true;
  }
  // ======================= saving =======================
  function save() {
    if (!S.loaded) return;
    S.dirty = false;
    SAVE.set(KEY, {
      v: 1,
      doors: GARAGE.leaves.map(L => (L.want > 0.5 ? 1 : 0)),
      mower: {
        x: rnd2(M.x),
        y: rnd2(M.y),
        z: rnd2(M.z),
        az: Math.round(M.az * 10) / 10,
        fuel: Math.round(M.fuel * 1000) / 1000,
      },
      can: {
        fuel: rnd2(C.fuel),
        refill: C.refillAt,
        st: CANT.state === 'world' ? 'world' : PLAY.has(CANT) ? 'inv' : 'world',
        pos: CANT.pos.map(rnd2),
        yaw: rnd2(CANT.yaw || 0),
        slot: PLAY.slotOf(CANT),
      },
      gen: rnd2(GEN.fuel),
      grass: GRASS.cutSave(CLOCK.t),
    });
  }
  const num = (v, lo, hi) => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
  function load() {
    const s = SAVE.get(KEY);
    S.ph = PHASE;
    mowerHome(PHASE);
    canHome(CANT, GARAGE.home(PHASE).petrol);
    if (s && s.v === 1) {
      if (Array.isArray(s.doors))
        GARAGE.leaves.forEach((L, i) => {
          L.k = L.want = s.doors[i] === 1 ? 1 : 0;
          L.g.position.x = leafOff(L);
        });
      const m = s.mower;
      if (m && num(m.x, -300, 300) && num(m.y, -300, 300) && num(m.z, -20, 20) && num(m.az, -720, 720)) {
        M.x = m.x;
        M.y = m.y;
        M.z = m.z;
        M.az = m.az;
        settle();
        pose();
      }
      if (m && num(m.fuel, 0, TANK)) M.fuel = m.fuel;
      const c = s.can;
      if (c && num(c.fuel, 0, CAN_L)) C.fuel = c.fuel;
      if (c && num(c.refill, -1e9, 1e12)) C.refillAt = c.refill;
      if (c && c.st === 'inv') setTimeout(() => PLAY.give(CANT, num(c.slot, 0, 30) ? c.slot : undefined), 80);
      else if (c && Array.isArray(c.pos) && c.pos.length === 3 && c.pos.every(v => num(v, -300, 300)))
        CANT.place(c.pos[0], c.pos[1], c.pos[2], num(c.yaw, -10, 10) ? c.yaw : 0);
      if (num(s.gen, 0, GEN_L)) GEN.fuel = s.gen;
      if (s.grass) GRASS.cutLoad(s.grass, CLOCK.t);
    }
    S.tPrev = CLOCK.t;
    S.loaded = true;
    dimNow = null;
    dimTick();
    markDirty(true);
  }
  // ======================= every frame (first among the ticks: the figure then sees where the mower holds it) =======================
  let growAcc = 0;
  function tick(dt) {
    if (!S.loaded) return;
    GARAGE.on = on0();
    if (PHASE !== S.ph) {
      const old = S.ph;
      S.ph = PHASE;
      onPhase(old, PHASE);
    }
    leavesTick(dt);
    const t = CLOCK.t,
      dmin = S.tPrev == null ? 0 : Math.max(0, Math.min(600, t - S.tPrev));
    S.tPrev = t;
    if (M.mode === 'push') pushTick(dt);
    if (M.run) runTick(dt, dmin);
    genTick(dmin);
    if (C.refillAt != null && t >= C.refillAt) {
      C.fuel = CAN_L;
      C.refillAt = null;
      S.dirty = true;
    }
    dimTick();
    growAcc += dmin;
    if (growAcc >= 20) {
      growAcc = 0;
      GRASS.grow(t);
    }
    S.saveAcc += dt;
    if (S.dirty && S.saveAcc > 4) {
      S.saveAcc = 0;
      save();
    }
  }
  (window.TICKS = window.TICKS || []).unshift(tick);
  whenLoaded(() => setTimeout(load, 450));
  // ---- where am I: inside the old garage (acoustics, the light on the thing in the hand) ----
  KERN.provide('inside', (x, y, z) => on0() && GARAGE.inside(x, y) && z !== undefined && z < Z0 + 2.0);
  // ---- a place to jump to and a start situation: in front of the old garage (phase 0) ----
  KERN.spot('garage', { mode: 'walk', pos: [2.0, 7.4], z: 0, yaw: 180, pitch: -6, label: 'Alte Garage' });
  KERN.scenario('garage', {
    label: 'Alte Garage (Bauphase 0)',
    order: 14,
    run: () => {
      if (PHASE !== PHN.bestand) setPhase(PHN.bestand);
      go('garage');
    },
  });
  return {
    M,
    C,
    GEN,
    MW,
    HANDLE,
    CANT,
    leaves: GARAGE.leaves,
    slide,
    grab,
    release,
    start,
    stop,
    save,
    load,
    home: () => GARAGE.home(PHASE),
    mowerHome,
    TANK,
    CAN_L,
    GEN_L,
    REACH,
  };
})();
window.GPLAY = GPLAY;
