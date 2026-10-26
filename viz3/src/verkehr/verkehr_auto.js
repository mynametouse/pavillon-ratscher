// ===================== feat/verkehr 4: cars on the streets – model, driving, braking, the car one may drive (VAUTO) =====================
// Falko, 25.10.2026: „… oder auch mal mit dem Auto fahren. Auch in Schleusingen. Ich möchte die Autos auch anhalten können. … Ähnlich wie
// bei GTA.“ A car follows its line (verkehr/verkehr_netz.js: the right-hand lane of a route through the place, speed limit per metre from the
// way and the curves) at village speed: it accelerates gently, brakes ahead of curves and junctions, keeps its distance to the car in front,
// stops for whoever stands in its lane – the player, a walker, a parked vehicle – and goes round a walker at the edge when the other lane
// is free; it honks if the player stays in the way. Front axle and rear axle run on the line (the body turns like a real car), the body
// stands on the ground (KERN.ground) with the pitch of the slope, the wheels turn; at night the head lamps glow and light a patch of the road
// ahead (an additive quad – no new light, so no shader is compiled again). The model: the size of the player's car (Logan MCV), plain,
// without a brand – body, glass, dashboard, lamps of vertex colours (one shader program with the villagers' cars), the two axles turning.
// For „Selbst fahren“ one extra vehicle of vehicles/vehicle.js (VEH, id 'verkehr', the physics of the player's own car) waits far out in
// the fields until it takes the place of a stopped car: same body, the player drives it, and gives it back.
import * as THREE from 'three';
import { cam, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { PLAY } from '../game/play.js';
import { audio } from '../audio/audio.js';
import { DN } from '../time/daynight.js';
import { VPROPS } from '../world/village_props.js';
import { VEH } from '../vehicles/vehicle.js';
import { DCARS } from '../dorf/dorf_cars.js';
import { NPCS, TRACTOR } from '../npc/npc.js';
import { VNETZ } from './verkehr_netz.js';
import { VFIG } from './verkehr_fig.js';
export const VAUTO = (() => {
  const S = { cars: [], n: 0, honks: 0 };
  // the measures of the player's car (vehicles/car.js): axles, overhangs, width, wheels
  const A = 1.25,
    B = 1.655,
    WB = A + B,
    YF = 2.047,
    YR = -2.426,
    HW = 0.87,
    TR = 1.468,
    RW = 0.31,
    HL = (YF - YR) / 2,
    CY = (YF + YR) / 2;
  S.DIM = { A, B, YF, YR, HW, HL, CY };
  const L = VFIG.L;
  // ---- the model (car frame of the kit: x right, y forward, z up; origin on the ground under the centre of mass) ----
  function prism(k, b, t, z0, z1, col, top = true) {
    const [bx0, bx1, by0, by1] = b,
      [tx0, tx1, ty0, ty1] = t;
    k.quad([bx1, by0, z0], [bx1, by1, z0], [tx1, ty1, z1], [tx1, ty0, z1], col);
    k.quad([bx1, by1, z0], [bx0, by1, z0], [tx0, ty1, z1], [tx1, ty1, z1], col);
    k.quad([bx0, by1, z0], [bx0, by0, z0], [tx0, ty0, z1], [tx0, ty1, z1], col);
    k.quad([bx0, by0, z0], [bx1, by0, z0], [tx1, ty0, z1], [tx0, ty0, z1], col);
    if (top) k.quad([tx0, ty0, z1], [tx1, ty0, z1], [tx1, ty1, z1], [tx0, ty1, z1], col);
  }
  // a square beam from a to b (thickness t)
  function beam(k, a, b, t, col) {
    const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]],
      l = Math.hypot(...d) || 1,
      u0 = Math.abs(d[2]) / l > 0.9 ? [1, 0, 0] : [0, 0, 1],
      cr = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]],
      n = v => {
        const m = Math.hypot(...v) || 1;
        return v.map(x => (x / m) * (t / 2));
      },
      u = n(cr(d, u0)),
      w = n(cr(d, u)),
      P = (o, su, sw) => [o[0] + u[0] * su + w[0] * sw, o[1] + u[1] * su + w[1] * sw, o[2] + u[2] * su + w[2] * sw],
      C = [
        [1, 1],
        [-1, 1],
        [-1, -1],
        [1, -1],
      ];
    for (let i = 0; i < 4; i++) {
      const [s0, w0] = C[i],
        [s1, w1] = C[(i + 1) % 4];
      k.quad(P(a, s0, w0), P(a, s1, w1), P(b, s1, w1), P(b, s0, w0), col);
      k.quad(P(a, s0, w0), P(b, s0, w0), P(b, s1, w1), P(a, s1, w1), col); // both windings: seen from either side
    }
  }
  const bodyGeo = {};
  function bodyOf(hex) {
    if (bodyGeo[hex]) return bodyGeo[hex];
    const k = VPROPS.kit(),
      c = VFIG.col(hex),
      body = c,
      dark = L(0.07, 0.075, 0.08),
      glass = L(0.09, 0.115, 0.14),
      trim = L(0.16, 0.16, 0.17),
      inner = L(0.13, 0.13, 0.14);
    k.box(0, CY, 0.3, 2 * HW, YF - YR - 0.06, 0.5, 0, body); // lower body
    prism(k, [-HW, HW, 1.0, YF - 0.03], [-HW + 0.04, HW - 0.04, 1.1, YF - 0.12], 0.8, 0.9, body); // the bonnet, falling to the front
    prism(k, [-HW, HW, YR + 0.03, 1.0], [-HW + 0.02, HW - 0.02, YR + 0.05, 1.0], 0.8, 0.86, body, false); // the waist under the windows (open on top: the cabin)
    prism(k, [-HW + 0.06, HW - 0.06, YR + 0.1, 1.0], [-0.72, 0.72, YR + 0.18, -0.05], 0.86, 1.47, glass); // glasshouse
    prism(k, [-0.73, 0.73, YR + 0.17, -0.04], [-0.7, 0.7, YR + 0.2, -0.1], 1.47, 1.54, body); // roof
    for (const sx of [-0.62, 0.62]) k.box(sx, (YR + 0.1) / 2 - 0.05, 1.54, 0.04, -YR - 0.25, 0.05, 0, dark); // roof rails
    k.box(0, CY, 0.17, 2 * HW - 0.12, YF - YR + 0.04, 0.16, 0, dark, true); // sills and bumpers
    k.box(0, YF - 0.02, 0.48, 0.9, 0.04, 0.16, 0, dark); // grille
    for (const sx of [-1, 1]) {
      // A-pillars along the windscreen and B-pillars (seen from inside as well)
      beam(k, [sx * 0.8, 1.0, 0.85], [sx * 0.7, -0.06, 1.48], 0.05, trim);
      beam(k, [sx * 0.83, -0.75, 0.85], [sx * 0.71, -0.75, 1.48], 0.07, trim);
    }
    // inside (seen by a passenger): a dark floor over the body, the dashboard up to the windscreen, the steering wheel, the seats,
    // the roof lining (facing down)
    k.box(0, -0.65, 0.8, 1.66, 3.2, 0.04, 0, inner);
    k.box(0, 0.73, 0.8, 1.64, 0.52, 0.24, 0, inner, true);
    k.box(0, 0.62, 1.04, 1.6, 0.3, 0.03, 0, dark);
    for (let i = 0; i < 14; i++) {
      // the steering wheel: a ring of short beams, tilted towards the driver
      const a0 = (i / 14) * Math.PI * 2,
        a1 = ((i + 1) / 14) * Math.PI * 2,
        p = a => [-0.36 + Math.cos(a) * 0.18, 0.44 + Math.sin(a) * 0.18 * 0.35, 1.02 + Math.sin(a) * 0.18 * 0.94];
      beam(k, p(a0), p(a1), 0.03, dark);
    }
    beam(k, [-0.36, 0.44, 1.02], [-0.36, 0.62, 0.92], 0.05, dark);
    k.quad([-0.71, -0.1, 1.46], [0.71, -0.1, 1.46], [0.71, YR + 0.24, 1.46], [-0.71, YR + 0.24, 1.46], inner);
    for (const sx of [-0.38, 0.38]) {
      k.box(sx, -0.3, 0.5, 0.5, 0.5, 0.42, 0, inner, true);
      k.box(sx, -0.62, 0.92, 0.48, 0.12, 0.46, 0, inner, true);
    }
    k.box(0, -1.5, 0.5, 1.4, 0.55, 0.42, 0, inner, true);
    for (const sx of [-1, 1]) {
      k.box(sx * 0.86, -0.2, 0.62, 0.02, 0.04, 0.03, 0, trim); // door handle
      k.box(sx * 0.93, 0.62, 0.95, 0.12, 0.06, 0.08, 0, dark); // mirror
    }
    // number plates (white-ish, unreadable at the distance: no made-up numbers)
    k.box(0, YF + 0.005, 0.32, 0.52, 0.01, 0.11, 0, L(0.86, 0.86, 0.82));
    k.box(0, YR - 0.005, 0.62, 0.52, 0.01, 0.11, 0, L(0.86, 0.86, 0.82));
    const g = k.geo();
    g.computeBoundingSphere();
    return (bodyGeo[hex] = g);
  }
  let axleGeo = null,
    wheelGeo = null,
    headGeo = null,
    tailGeo = null,
    poolGeo = null;
  function wheel(k, x) {
    const tyre = L(0.05, 0.05, 0.05),
      rim = L(0.5, 0.51, 0.52),
      s = Math.sign(x) || 1;
    // a short cylinder along x (the axle): tyre tread, both sides, the rim on the outside
    const n = 16,
      w = 0.19;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI * 2,
        a1 = ((i + 1) / n) * Math.PI * 2,
        p = (a, r, xx) => [xx, Math.cos(a) * r, Math.sin(a) * r];
      k.quad(p(a0, RW, x - w / 2), p(a1, RW, x - w / 2), p(a1, RW, x + w / 2), p(a0, RW, x + w / 2), tyre);
    }
    k.disc(x + (s * w) / 2, 0, 0, s, 0, RW, tyre, n, true);
    k.disc(x + s * (w / 2 + 0.003), 0, 0, s, 0, 0.19, rim, 10, false);
    k.disc(x - (s * w) / 2, 0, 0, -s, 0, RW * 0.9, tyre, n, false);
  }
  function geos() {
    if (axleGeo) return;
    let k = VPROPS.kit();
    wheel(k, -TR / 2);
    wheel(k, TR / 2);
    axleGeo = k.geo();
    k = VPROPS.kit();
    wheel(k, 0);
    wheelGeo = k.geo();
    k = VPROPS.kit();
    for (const sx of [-0.62, 0.62]) k.box(sx, YF - 0.04, 0.66, 0.34, 0.06, 0.13, 0, [1, 1, 1]);
    headGeo = k.geo();
    k = VPROPS.kit();
    for (const sx of [-0.7, 0.7]) k.box(sx, YR + 0.03, 0.78, 0.2, 0.06, 0.3, 0, [1, 1, 1]);
    tailGeo = k.geo();
    // the patch of light on the road ahead: a quad in the car frame (y from the bumper 2 … 16 m ahead), a soft cone in the texture
    const cv = document.createElement('canvas');
    cv.width = 64;
    cv.height = 128;
    const g = cv.getContext('2d'),
      im = g.createImageData(64, 128);
    for (let j = 0; j < 128; j++)
      for (let i = 0; i < 64; i++) {
        const v = j / 127, // 0 near the car, 1 far ahead
          u = (i / 63) * 2 - 1,
          wide = 0.35 + 0.65 * v,
          side = Math.max(0, 1 - Math.pow(Math.abs(u) / wide, 2)),
          along = Math.pow(Math.sin(Math.min(1, v * 1.25) * Math.PI * 0.5), 0.6) * (1 - Math.pow(v, 2.2)),
          a = side * along;
        const q = (j * 64 + i) * 4;
        im.data[q] = im.data[q + 1] = im.data[q + 2] = Math.round(255 * a);
        im.data[q + 3] = 255;
      }
    g.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(cv);
    S.poolMat = new THREE.MeshBasicMaterial({
      map: t,
      color: 0xffe2b0,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
      toneMapped: false,
      opacity: 0.55,
    });
    poolGeo = new THREE.PlaneGeometry(5.2, 14);
    poolGeo.rotateX(-Math.PI / 2);
    poolGeo.translate(0, 0.06, -(YF + 7));
  }
  // lamps: shared materials for all the traffic (head lamps on at night; tail lamps dim at night, bright when braking)
  const LM = {
    head: new THREE.MeshStandardMaterial({
      color: 0xd9dee2,
      metalness: 0.3,
      roughness: 0.12,
      emissive: 0xfff2d6,
      emissiveIntensity: 0,
    }),
    tail: new THREE.MeshStandardMaterial({
      color: 0x6d0a0a,
      roughness: 0.25,
      emissive: 0xff1a0c,
      emissiveIntensity: 0,
    }),
    brake: new THREE.MeshStandardMaterial({
      color: 0x7a0c0c,
      roughness: 0.25,
      emissive: 0xff1608,
      emissiveIntensity: 3.2,
    }),
  };
  S.LM = LM;
  const own = m => {
    m.userData.noMerge = true;
    m.castShadow = false;
    m.receiveShadow = false;
    return m;
  };
  function model(hex) {
    geos();
    const g = new THREE.Group(),
      body = own(new THREE.Mesh(bodyOf(hex), VFIG.mat())),
      axF = own(new THREE.Mesh(axleGeo, VFIG.mat())),
      axR = own(new THREE.Mesh(axleGeo, VFIG.mat())),
      head = own(new THREE.Mesh(headGeo, LM.head)),
      tail = own(new THREE.Mesh(tailGeo, LM.tail)),
      pool = own(new THREE.Mesh(poolGeo, S.poolMat));
    axF.position.set(0, RW, -A);
    axR.position.set(0, RW, B);
    pool.visible = false;
    pool.renderOrder = 2;
    g.add(body, axF, axR, head, tail, pool);
    g.name = 'verkehr car';
    scene.add(g);
    return { g, body, axF, axR, head, tail, pool };
  }
  // ---- night: lamps on (as vehicles/vehicle.js: the sun below 4°, or the fixed dusk and night moods) ----
  const dark = () =>
    window.DN && DN.active
      ? !!(DN.state && DN.state.sunEl < 4)
      : window.MODE_NOW === 'dusk' || window.MODE_NOW === 'night';
  // ---- a car on a line ----
  const _p = {},
    _q = {},
    _e = new THREE.Euler(0, 0, 0, 'YXZ');
  // place on the line: front and rear axle on the line (shifted by lat to the right), the body between them
  function pose(c) {
    const R = c.line,
      off = c.lat;
    VNETZ.at(R, c.s + A, _p);
    const fx = _p.x + Math.cos(_p.hd) * off,
      fy = _p.y - Math.sin(_p.hd) * off;
    VNETZ.at(R, c.s - B, _q);
    const rx = _q.x + Math.cos(_q.hd) * off,
      ry = _q.y - Math.sin(_q.hd) * off,
      hd = Math.atan2(fx - rx, fy - ry),
      x = rx + (fx - rx) * (B / WB),
      y = ry + (fy - ry) * (B / WB);
    c.x = x;
    c.y = y;
    c.hd = hd;
    const zF = KERN.ground(fx, fy, c.z + 0.6),
      zR = KERN.ground(rx, ry, c.z + 0.6),
      z = zR + (zF - zR) * (B / WB);
    c.z = Number.isFinite(z) ? z : c.z;
    const pitch = Math.atan2(zF - zR, WB);
    c.g.position.set(x, c.z, -y);
    _e.set(Number.isFinite(pitch) ? pitch : 0, -hd, 0, 'YXZ');
    c.g.quaternion.setFromEuler(_e);
  }
  function spawn(o) {
    const m = model(o.col || '#888888');
    const c = Object.assign(m, {
      id: ++S.n,
      place: o.place,
      who: o.who || null,
      col: o.col,
      line: o.line,
      s: Math.max(B, o.s || B),
      v: o.v || 0,
      lat: 0,
      latT: 0,
      z: 0,
      st: 'fahren',
      spin: 0,
      blockT: 0,
      honkT: 0,
      stop: null,
      brake: false,
      seenT: 0,
      age: 0,
    });
    VNETZ.at(c.line, c.s, _p);
    c.z = KERN.ground(_p.x, _p.y);
    pose(c);
    // an obstacle for the player's car and for walkers (vehicles/vehicle.js: VEH.extra – the trailer and the garage gates use it too)
    c.box = {
      box: () =>
        c.g.visible
          ? {
              c: [c.x + Math.sin(c.hd) * CY, c.y + Math.cos(c.hd) * CY],
              ax: [Math.cos(c.hd), -Math.sin(c.hd)],
              ay: [Math.sin(c.hd), Math.cos(c.hd)],
              ex: HW,
              ey: HL,
              z0: c.z,
              z1: c.z + 1.5,
            }
          : null,
      verkehr: c,
    };
    if (VEH && VEH.extra) VEH.extra.push(c.box);
    S.cars.push(c);
    markDirty();
    return c;
  }
  function remove(c) {
    const i = S.cars.indexOf(c);
    if (i >= 0) S.cars.splice(i, 1);
    if (VEH && VEH.extra) {
      const j = VEH.extra.indexOf(c.box);
      if (j >= 0) VEH.extra.splice(j, 1);
    }
    scene.remove(c.g);
    c.st = 'weg';
    markDirty();
  }
  // a short honk at the car, louder the nearer it is to the camera
  function honk(c) {
    S.honks++;
    const r = audio.raw && audio.raw();
    if (!r || !audio.ready()) return;
    const C = r.ctx,
      d = Math.hypot(c.x - cam.position.x, c.y + cam.position.z),
      v = 0.08 / Math.max(1, d / 8);
    if (v < 0.004) return;
    const g = C.createGain(),
      lp = C.createBiquadFilter(),
      t = C.currentTime + 0.02;
    lp.type = 'lowpass';
    lp.frequency.value = 2400;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(v, t + 0.02);
    g.gain.setValueAtTime(v, t + 0.32);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
    lp.connect(g);
    g.connect(r.sfx);
    for (const f of [415, 494]) {
      const os = C.createOscillator();
      os.type = 'square';
      os.frequency.value = f;
      os.connect(lp);
      os.start(t);
      os.stop(t + 0.46);
    }
  }
  // ---- the sound of the nearest car that moves: tyres on the road and a low engine, louder the nearer and the faster (Web Audio on
  // the game's sound bus, one chain for all, built the first time a car comes near) ----
  const SND = { g: null, os: null, t: 0 };
  function sound(dt) {
    if ((SND.t += dt) < 0.1) return;
    SND.t = 0;
    const r = audio.raw && audio.raw();
    if (!r || !audio.ready()) return;
    let best = null,
      bd = 50;
    for (const c of S.cars) {
      if (!c.g.visible || c.v < 0.5) continue;
      const d = Math.hypot(c.x - cam.position.x, c.y + cam.position.z);
      if (d < bd) {
        bd = d;
        best = c;
      }
    }
    const C = r.ctx;
    if (!SND.g) {
      if (!best) return;
      const n = C.sampleRate * 2,
        buf = C.createBuffer(1, n, C.sampleRate),
        d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      const src = C.createBufferSource(),
        bp = C.createBiquadFilter(),
        os = C.createOscillator(),
        lp = C.createBiquadFilter(),
        eg = C.createGain(),
        g = C.createGain();
      src.buffer = buf;
      src.loop = true;
      bp.type = 'bandpass';
      bp.frequency.value = 520;
      bp.Q.value = 0.6;
      os.type = 'sawtooth';
      os.frequency.value = 40;
      lp.type = 'lowpass';
      lp.frequency.value = 220;
      eg.gain.value = 0.35;
      g.gain.value = 0;
      src.connect(bp);
      bp.connect(g);
      os.connect(lp);
      lp.connect(eg);
      eg.connect(g);
      g.connect(r.sfx);
      src.start();
      os.start();
      Object.assign(SND, { g, os, bp });
    }
    const want = best ? Math.min(0.05, (0.01 + best.v * 0.0035) * Math.min(1, 7 / Math.max(3, bd))) : 0;
    SND.g.gain.setTargetAtTime(want, C.currentTime, 0.25);
    if (best) {
      SND.os.frequency.setTargetAtTime(32 + best.v * 3.5, C.currentTime, 0.3);
      SND.bp.frequency.setTargetAtTime(380 + best.v * 25, C.currentTime, 0.3);
    }
  }
  // ---- obstacles: what stands or moves near a car's way ----
  // walkers: [{ x, y, r, kind: 'player' | 'ped', ref }] from verkehr/verkehr.js; vehicles and the villagers' cars from their modules
  const OB = [];
  function obstacles(walkers, skipVeh) {
    OB.length = 0;
    for (const w of walkers) OB.push(w);
    if (VEH && VEH.list)
      for (const v of VEH.list) {
        if (v === skipVeh || (v.g && !v.g.visible)) continue;
        const s = v.st,
          b = v.spec.box,
          f = [Math.sin(s.psi), Math.cos(s.psi)],
          moving = Math.hypot(s.u, s.v) > 0.5;
        for (const t of [-1, 0, 1]) {
          const o = b.cy + t * Math.max(0, b.hl - b.hw);
          OB.push({ x: s.x + f[0] * o, y: s.y + f[1] * o, r: b.hw, kind: 'veh', moving, ref: v });
        }
      }
    // Hubert's old tractor (on its trip to the Anger, or parked) and the two neighbours on foot
    if (TRACTOR && TRACTOR.g && TRACTOR.g.visible) {
      const tp = TRACTOR.g.position,
        az = -TRACTOR.g.rotation.y;
      for (const t of [-0.6, 0.9])
        OB.push({ x: tp.x + Math.sin(az) * t, y: -tp.z + Math.cos(az) * t, r: 1.0, kind: 'veh', moving: false });
    }
    for (const w of [NPCS.hubert, NPCS.ronald])
      if (w && w.fig && w.fig.g.visible && !w.drive) OB.push({ x: w.x, y: w.y, r: 0.32, kind: 'ped' });
    if (DCARS && DCARS.cars)
      for (const d of Object.values(DCARS.cars)) {
        if (!d.g || !d.g.visible || !d.at) continue;
        const h = -d.g.rotation.y;
        const moving = d.st === 'leaving' || d.st === 'arriving';
        for (const t of [-1.3, 0, 1.3])
          OB.push({ x: d.at[0] + Math.sin(h) * t, y: d.at[1] + Math.cos(h) * t, r: 0.9, kind: 'dcar', moving });
      }
    return OB;
  }
  const OWN = [];
  // ---- per frame: every car ----
  // ctx: { walkers, night, near(x, y) → is it near the observer (full detail) }
  let lampsOn = null;
  function tick(dt, ctx) {
    sound(dt);
    if (!S.cars.length) return;
    const night = dark();
    if (night !== lampsOn) {
      lampsOn = night;
      LM.head.emissiveIntensity = night ? 3.2 : 0;
      LM.tail.emissiveIntensity = night ? 1.4 : 0;
      for (const c of S.cars) c.pool.visible = night;
      markDirty();
    }
    const obs = obstacles(ctx.walkers || [], ctx.skipVeh);
    for (const c of S.cars) {
      if (c.st === 'weg' || c.st === 'geliehen') continue;
      c.age += dt;
      drive(c, dt, obs, ctx);
      if (c.st !== 'weg') {
        pose(c);
        const spun = (c.spin += (c.v * dt) / RW);
        c.axF.rotation.x = -spun;
        c.axR.rotation.x = -spun;
        const brk = c.brake || (c.v < 0.1 && c.st !== 'parkt');
        c.tail.material = brk ? LM.brake : LM.tail;
        c.pool.visible = night && c.g.visible;
        if (c.v > 0.01 || c.moved) markDirty();
        c.moved = c.v > 0.01;
      }
    }
  }
  // speed and lane: the line's limit, a stop ahead (waved down, letting someone out), the car in front, whoever stands in the way
  function drive(c, dt, obs, ctx) {
    const R = c.line,
      s = c.s,
      look = Math.min(60, 14 + (c.v * c.v) / 4);
    // the limit of the line, a little ahead (the front sees the curve before the middle is in it)
    const i = Math.min(R.n - 1, Math.max(0, Math.round((s + 2) / R.step)));
    let vT = R.S[i] * (c.vk || 1),
      stopAt = Infinity,
      latNeed = 0,
      why = null;
    if (c.stop) stopAt = Math.min(stopAt, c.stop.s);
    if (c.st === 'steht' || c.st === 'parkt') stopAt = Math.min(stopAt, s);
    // oncoming traffic close ahead: no going round
    let oncoming = false;
    const own = OWN;
    own.length = 0;
    for (const o of S.cars) {
      if (o === c || o.st === 'weg' || o.st === 'geliehen' || o.place !== c.place) continue;
      const dx = o.x - c.x,
        dy = o.y - c.y,
        d = Math.hypot(dx, dy);
      if (d > look + 8) continue;
      const fx = Math.sin(c.hd),
        fy = Math.cos(c.hd),
        ahead = dx * fx + dy * fy,
        same = Math.cos(o.hd - c.hd);
      if (ahead < 0) continue;
      if (same < -0.5 && ahead < 45) oncoming = true;
      if (same > 0.3 && (o.st === 'steht' || o.st === 'parkt') && o.v < 0.1) {
        // a car standing in front (stopped for someone, letting someone out): like a parked vehicle – wait, then round it
        for (const t of [-1, 0, 1]) {
          const off = CY + t * (HL - HW);
          own.push({ x: o.x + Math.sin(o.hd) * off, y: o.y + Math.cos(o.hd) * off, r: HW, kind: 'veh', moving: false });
        }
      } else if (same > 0.3) {
        // a car in front on my way: keep the distance (bumper to bumper 2 m standing, about 1 s moving)
        const pr = VNETZ.project(R, o.x, o.y, s, s + look);
        if (pr && pr.d < 1.6 && pr.s > s) {
          const free = pr.s - s - 2 * HL - 2 - c.v * 0.8;
          stopAt = Math.min(stopAt, s + Math.max(0, pr.s - s - 2 * HL - 2));
          vT = Math.min(vT, Math.max(0, o.v + free * 0.5));
          why = why || 'auto';
        }
      }
    }
    // walkers, the player, vehicles: in the lane ahead → go round (a walker at the edge, the other lane free) or stop before them
    let playerBlocks = false;
    for (const o of own.length ? obs.concat(own) : obs) {
      if (Math.abs(o.x - c.x) > look + 6 || Math.abs(o.y - c.y) > look + 6) continue;
      const pr = VNETZ.project(R, o.x, o.y, s - 4, s + look);
      if (!pr || pr.d > 5) continue;
      const rel = pr.lat - c.lat,
        clear = HW + o.r + 0.35;
      if (Math.abs(rel) > clear) continue;
      const ahead = pr.s - s;
      // a walker beside the way at once; the player, a parked car or one that stands after a moment of waiting: round it on the left
      // if the other lane is free (once begun, it goes on round it: passT)
      const canPass =
        (o.kind === 'ped' ||
          (o.kind === 'player' && (c.blockT > 5 || c.passT > 0)) ||
          ((o.kind === 'veh' || o.kind === 'dcar') && !o.moving && (c.blockT > 3 || c.passT > 0))) &&
        !oncoming &&
        c.st === 'fahren';
      const need = pr.lat - (HW + o.r + 0.5),
        lo = c.laneOff || 1.2,
        maxLeft = -(lo + Math.max(0.7, 2.1 - lo)); // over the middle, on a narrow lane a wheel on the verge
      if (canPass && rel > -0.3 && need >= maxLeft) {
        latNeed = Math.min(latNeed, need);
        if (o.kind !== 'ped') c.passT = 2.5;
        if (ahead > -3) vT = Math.min(vT, c.lat - need > 0.35 ? 1.0 : o.kind === 'ped' ? 6 : 4);
        continue;
      }
      if (ahead < 1.2) continue; // beside or behind the front: nothing to stop for
      // (before something it may go round later: a few metres more, to swing out)
      const room = o.kind === 'player' || ((o.kind === 'veh' || o.kind === 'dcar') && !o.moving) ? 3.5 : 0,
        stopS = s + ahead - (HL + 0.1 + o.r + 1.4 + room);
      if (stopS < stopAt) {
        stopAt = stopS;
        why = o.kind;
      }
      if (o.kind === 'player') playerBlocks = true;
    }
    // lane: back to the middle of the lane when nothing needs passing; at a stop to the kerb (a little to the right)
    // (standing it keeps its place; sideways only while it rolls)
    if (c.st === 'steht' || c.st === 'parkt') c.latT = c.lat;
    else
      c.latT =
        latNeed < 0 ? latNeed : c.stop && c.stop.kerb && c.stop.s - s < 25 ? Math.min(0.6, c.kerbRoom ?? 0.6) : 0;
    const dl = c.latT - c.lat;
    c.lat += Math.sign(dl) * Math.min(Math.abs(dl), dt * (c.v > 0.2 ? 0.35 + c.v * 0.18 : 0.05));
    c.passT = Math.max(0, (c.passT || 0) - dt);
    // speed: braking to stop before stopAt (3 m/s² normal, up to 6 when it must), accelerating at 1.6 m/s²
    if (stopAt < Infinity) {
      const d = stopAt - s;
      vT = Math.min(vT, d <= 0.05 ? 0 : Math.sqrt(2 * 3 * d));
    }
    const dv = vT - c.v,
      acc = dv > 0 ? Math.min(dv, 1.6 * dt) : Math.max(dv, -(stopAt - s < 6 ? 6.5 : 3.5) * dt);
    c.brake = acc < -0.4 * dt || (vT < 0.05 && c.v < 0.3);
    c.v = Math.max(0, c.v + acc);
    if (stopAt < Infinity && s + c.v * dt > stopAt) c.v = Math.max(0, (stopAt - s) / Math.max(dt, 1e-3));
    c.s = Math.min(R.L, s + c.v * dt);
    c.why = why;
    // the player in the way: honk after a moment, again if he stays
    if (playerBlocks && c.v < 0.5) {
      c.blockT += dt;
      if (c.blockT > 2.5 && c.honkT <= 0) {
        honk(c);
        c.honkT = 7;
        if (ctx.onHonk) ctx.onHonk(c);
      }
    } else if ((why === 'veh' || why === 'dcar') && c.v < 0.5) c.blockT += dt;
    else if (!playerBlocks) c.blockT = Math.max(0, c.blockT - dt * 0.5);
    c.honkT -= dt;
    // the stop is reached
    if (c.stop && c.v < 0.05 && c.stop.s - c.s < 0.6) {
      const st = c.stop;
      c.stop = null;
      c.st = st.then || 'steht';
      if (st.done) st.done(c);
    }
    if (c.s >= R.L - 0.5 && c.st === 'fahren') c.st = 'ende';
  }
  // waved down: stop with the passenger door beside (x, y) – or before him when he stands in the lane
  function halt(c, x, y, done) {
    const pr = VNETZ.project(c.line, x, y, c.s, c.s + 80);
    if (!pr) return false;
    // stop so that the middle of the car is beside him (but not closer than braking allows)
    const brk = (c.v * c.v) / (2 * 3.5) + 1;
    let s = Math.max(c.s + brk, pr.s);
    if (Math.abs(pr.lat) < HW + 0.6) s = Math.max(c.s + brk, pr.s - HL - 1.6); // in the lane: before him
    c.stop = { s: Math.min(c.line.L - 1, s), kerb: true, then: 'steht', done };
    c.kerbRoom = Math.max(0, Math.min(0.6, pr.lat - HW - 0.7));
    c.st = 'halt';
    return true;
  }
  // drive on (after a stop): a stop ahead may be given (s, then, done)
  function go(c, stop) {
    c.st = 'fahren';
    c.stop = stop || null;
    c.blockT = 0;
  }
  // ---- the car the player may drive: an extra vehicle of vehicles/vehicle.js with the physics of the player's car ----
  const HIDE = [-905, -1215]; // out in the fields, far from everything, while nobody has it
  let BV = null;
  function borrowVeh() {
    if (BV) return BV;
    const base = VEH && VEH.by && VEH.by.car;
    if (!base) return null;
    geos();
    const g = new THREE.Group(),
      body = new THREE.Group(),
      bm = own(new THREE.Mesh(bodyOf('#888888'), VFIG.mat()));
    g.add(body);
    body.add(bm);
    const lamps = {
      head: [LM.head.clone()],
      tail: [LM.tail.clone()],
      brake: [LM.brake.clone()],
      rev: [LM.head.clone()],
    };
    lamps.brake[0].emissiveIntensity = 0;
    lamps.rev[0].emissive.setHex(0xffffff);
    body.add(own(new THREE.Mesh(headGeo, lamps.head[0])), own(new THREE.Mesh(tailGeo, lamps.brake[0])));
    const wheels = [];
    for (const [x, y, steer, dr] of [
      [-TR / 2, A, 1, 1],
      [TR / 2, A, 1, 1],
      [-TR / 2, -B, 0, 0],
      [TR / 2, -B, 0, 0],
    ]) {
      const piv = new THREE.Group(),
        node = new THREE.Group();
      piv.position.set(x, RW, -y);
      piv.add(node);
      g.add(piv);
      const wm = own(new THREE.Mesh(wheelGeo, VFIG.mat()));
      node.add(wm);
      wheels.push({ x, y, r: RW, w: 0.185, steer, drive: dr, piv, node });
    }
    const model = { g, body, wheels, lamps, beam: [0, YF - 0.12, 0.7], bodyMesh: bm };
    const spec = Object.assign({}, base.spec, {
      id: 'verkehr',
      name: 'Fremdes Auto',
      enterLabel: 'Einsteigen',
      home: () => [HIDE[0], HIDE[1], 0, false],
    });
    delete spec.L;
    BV = VEH.add(spec, model);
    VEH.place('verkehr', HIDE[0], HIDE[1], 0);
    g.visible = false;
    for (const o of g.children) o.castShadow = false;
    // its own entry of the action button: only while it is lent (vehicles/vehicle.js registers one for every vehicle)
    KERN.act({
      id: 'veh:verkehr',
      r: 2.2,
      prio: 0.55,
      obj: () => g,
      pos: () => {
        const p = VEH.toW(BV, spec.door[0], spec.door[1]);
        return [p[0], p[1], BV.st.z + 1.0];
      },
      label: () => (S.lent && g.visible && !VEH.cur && !PLAY.seated() ? 'Einsteigen' : null),
      run: () => VEH.enter('verkehr'),
    });
    return BV;
  }
  // the car c becomes the vehicle the player drives (same place, colour, heading); returns the VEH vehicle
  function lend(c) {
    const v = borrowVeh();
    if (!v) return null;
    v.model.bodyMesh.geometry = bodyOf(c.col || '#888888');
    v.g.visible = true;
    VEH.place('verkehr', c.x, c.y, c.hd);
    c.g.visible = false;
    c.st = 'geliehen';
    c.v = 0;
    S.lent = c;
    markDirty(true);
    return v;
  }
  // the vehicle back into the traffic car (where it stands now): the line from there, or null if it is off any road
  function unlend(line, s) {
    const c = S.lent,
      v = BV;
    if (!c || !v) return null;
    S.lent = null;
    v.g.visible = false;
    if (VEH.cur === v) VEH.exit();
    VEH.place('verkehr', HIDE[0], HIDE[1], 0);
    if (line) {
      c.line = line;
      c.s = Math.max(B, s || B);
      c.lat = 0;
      c.v = 0;
      c.st = 'steht';
      c.g.visible = true;
      pose(c);
    }
    markDirty(true);
    return c;
  }
  S.where = () => (BV ? { x: BV.st.x, y: BV.st.y, psi: BV.st.psi, z: BV.st.z, shown: BV.g.visible } : null);
  S.veh = () => BV;
  Object.assign(S, { spawn, remove, tick, halt, go, pose, honk, lend, unlend, borrowVeh, dark, HIDE });
  return S;
})();
window.VAUTO = VAUTO;
