// ===================== V16h a small timber crane on the stake trailer (KRAN): the trailer becomes a Rückewagen mit Kran =====================
// With the winch (werk/winde.js) the logs come out of the stand to the track; from there a forwarder trailer's crane loads them – it takes a
// log however it lies, which the pallet fork cannot (only across its tines). Generic (no make): a slewing column on a base at the front of
// the bed, a boom (2.7 m), a stick (2.3 m) with a telescope (1.3 m), a rotator and a log grapple; reach about 6 m around the column, lifting
// moment 3.6 t·m (about 1.4 t close in, 0.6 t at full reach). Worked on foot at the control block at the right front corner of the trailer
// (E): the crane takes the log the operator looks at, grips it, swings it over the bed and lays it between the stakes (lengthwise, butt to
// the front), then parks again. The trailer stands still meanwhile. Model in the trailer's frame (vehicles/trailer.js TRAILER.g: x right,
// y forward, z up, origin under the axle centre); the log in the grapple is a HOLZ log in state 'crane' (saved as lying where it was taken).
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { V } from '../core/head.js';
import { markDirty, LOAD } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { audio } from '../audio/audio.js';
import { PLAY, SFX } from '../game/play.js';
import { VEH } from '../vehicles/vehicle.js';
import { TRACTOR2 } from '../vehicles/tractor.js';
import { TRAILER } from '../vehicles/trailer.js';
import { HOLZ } from './holz.js';
export const KRAN = (() => {
  const S = { busy: false, seq: null, log: null, CAP: 3600, REACH: 6.1 };
  if (!TRAILER || !TRAILER.g) return S;
  const clamp = THREE.MathUtils.clamp,
    think = (t, ms) => PLAY.think(t, ms),
    de = (v, n = 1) => (+v).toLocaleString('de-DE', { minimumFractionDigits: n, maximumFractionDigits: n });
  const CY = 3.0, // the column: on the axis, ahead of the bed front (on the drawbar's frame)
    CZ = 2.2, // the boom's pivot height
    OFF = 0.12, // the pivot ahead of the column's axis
    L1 = 2.7,
    L2 = 2.3,
    TEL = 1.3,
    HANG = 0.78; // from the stick's tip down to the middle of a gripped log
  const W = TRACTOR2.model.winch && TRACTOR2.model.winch.mats;
  const M = {
    paint: W ? W.paint : new THREE.MeshStandardMaterial({ color: 0xc4521f, metalness: 0.25, roughness: 0.5 }),
    dark: W ? W.dark : new THREE.MeshStandardMaterial({ color: 0x1d1e20, metalness: 0.35, roughness: 0.6 }),
    steel: new THREE.MeshStandardMaterial({ color: 0xc9cdd0, metalness: 0.9, roughness: 0.22 }),
    hose: new THREE.MeshStandardMaterial({ color: 0x111213, roughness: 0.7 }),
  };
  const root = new THREE.Group();
  TRAILER.g.add(root);
  const mesh = (geo, mat, par) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    m.userData.noMerge = true;
    (par || root).add(m);
    return m;
  };
  // a box between two points of a parent's model frame (x right, y forward, z up)
  const _a = new THREE.Vector3(),
    _b = new THREE.Vector3(),
    _y = new THREE.Vector3(0, 1, 0);
  function stretch(m, a, b) {
    _a.copy(V(a[0], a[1], a[2]));
    _b.copy(V(b[0], b[1], b[2]));
    m.position.copy(_a).add(_b).multiplyScalar(0.5);
    m.scale.set(1, Math.max(1e-3, _a.distanceTo(_b)), 1);
    m.quaternion.setFromUnitVectors(_y, _b.sub(_a).normalize());
  }
  const unitBox = (w, d, mat, par) => mesh(new THREE.BoxGeometry(w, 1, d), mat, par);
  const unitRod = (r, mat, par) => mesh(new THREE.CylinderGeometry(r, r, 1, 10), mat, par);
  const box = (sx, sy, sz, x, y, z, mat, par) => {
    const m = mesh(new THREE.BoxGeometry(sx, sz, sy), mat, par);
    m.position.copy(V(x, y, z));
    return m;
  };
  // ---- base and column (fixed on the trailer) ----
  box(0.6, 0.5, 0.22, 0, CY, 0.66, M.paint);
  for (const sx of [-1, 1]) stretch(unitBox(0.08, 0.08, M.paint), [sx * 0.26, CY - 0.1, 0.7], [sx * 0.52, 2.38, 0.86]);
  box(0.42, 0.42, 0.22, 0, CY, 0.88, M.dark); // slewing gear
  // ---- the slewing part: column, head; the boom and the stick in it ----
  const slew = new THREE.Group();
  slew.position.copy(V(0, CY, 0.99));
  root.add(slew);
  {
    const col = mesh(new THREE.CylinderGeometry(0.12, 0.14, CZ - 0.99, 14), M.paint, slew);
    col.position.y = (CZ - 0.99) / 2;
    box(0.3, 0.36, 0.26, 0, 0.04, CZ - 0.99, M.paint, slew);
  }
  const boom = new THREE.Group();
  boom.position.copy(V(0, OFF, CZ - 0.99));
  slew.add(boom);
  box(0.16, L1 + 0.2, 0.22, 0, L1 / 2, 0, M.paint, boom);
  box(0.18, 0.2, 0.26, 0, L1, 0, M.paint, boom);
  const stick = new THREE.Group();
  stick.position.copy(V(0, L1, 0));
  boom.add(stick);
  box(0.14, L2 + 0.25, 0.17, 0, L2 / 2 - 0.12, 0, M.paint, stick);
  const tel = new THREE.Group();
  stick.add(tel);
  box(0.1, L2 - 0.1, 0.12, 0, L2 / 2, 0, M.steel, tel);
  box(0.13, 0.12, 0.14, 0, L2 + 0.02, 0, M.paint, tel);
  // hydraulic cylinders: boom (column → boom), stick (boom → the stick's lever), drawn between their ends every pose
  const cyl = [
    { tube: unitRod(0.055, M.paint, root), rod: unitRod(0.03, M.steel, root) },
    { tube: unitRod(0.048, M.paint, root), rod: unitRod(0.026, M.steel, root) },
  ];
  // ---- the rotator and the grapple: hangs from the tip, turns about the vertical ----
  const grap = new THREE.Group();
  root.add(grap);
  mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 10), M.dark, grap).position.y = -0.1;
  mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.12, 14), M.dark, grap).position.y = -0.24;
  box(0.16, 0.36, 0.1, 0, 0, -0.34, M.paint, grap);
  // two claws hinged above the log, each two curved tines round it (arcs about the gripped log's middle, 0.3 m below the hinges)
  const claws = [];
  for (const sx of [-1, 1]) {
    const c = new THREE.Group();
    c.position.copy(V(sx * 0.05, 0, -0.36));
    grap.add(c);
    for (const y of [-0.13, 0.13]) {
      const m = mesh(new THREE.TorusGeometry(0.3, 0.03, 6, 14, Math.PI * 0.9), M.paint, c);
      m.rotation.z = sx < 0 ? Math.PI / 2 : -Math.PI * 0.4; // left 90°…252°, right −72°…90°
      m.position.copy(V(0, y, -0.3));
    }
    claws.push({ sx, c });
  }
  // the control block at the right front corner of the bed: valves and levers
  box(0.3, 0.14, 0.2, 0.86, 2.62, 1.3, M.dark);
  for (let k = 0; k < 4; k++)
    stretch(unitRod(0.008, M.dark), [0.76 + k * 0.065, 2.56, 1.4], [0.76 + k * 0.065, 2.5, 1.62]);
  // few draw calls: the fixed parts of each moving group merged per material (the cylinders are stretched every pose – they stay)
  const keep = new Set(cyl.flatMap(c => [c.tube, c.rod]));
  function mergeKids(g) {
    const by = new Map();
    for (const c of [...g.children]) {
      if (!c.isMesh || keep.has(c)) continue;
      c.updateMatrix();
      if (!by.has(c.material)) by.set(c.material, []);
      by.get(c.material).push(c.geometry.clone().applyMatrix4(c.matrix));
      g.remove(c);
      c.geometry.dispose();
    }
    for (const [mat, list] of by) mesh(list.length > 1 ? BufferGeometryUtils.mergeGeometries(list) : list[0], mat, g);
  }
  for (const g of [root, slew, boom, stick, tel, grap, ...claws.map(c => c.c)]) mergeKids(g);
  // ---- pose: slew θ (0 = ahead, π = back over the bed), the tip at h (from the pivot) and z (absolute, trailer frame), grapple yaw φ, open ----
  // parked: over the bed, the boom raised, the stick down to the grapple above the floor (transport height about 3.9 m)
  const PARK = { h: 3.9, z: 2.35 };
  const Q = { th: Math.PI, h: PARK.h, z: PARK.z, phi: 0, open: 0, tel: 0 };
  function ik(h, z) {
    const zr = z - CZ;
    let d = Math.hypot(h, zr),
      t = 0;
    if (d > L1 + L2 - 0.02) t = clamp(d - (L1 + L2) + 0.06, 0, TEL);
    const L2e = L2 + t;
    d = Math.min(d, L1 + L2e - 0.01);
    const cA = clamp((L1 * L1 + d * d - L2e * L2e) / (2 * L1 * d), -1, 1),
      a = Math.atan2(zr, h) + Math.acos(cA),
      eh = L1 * Math.cos(a),
      ez = L1 * Math.sin(a),
      g = Math.atan2(zr - ez, h - eh);
    return { a, g, t };
  }
  function pose() {
    const k = ik(Q.h, Q.z);
    Q.tel = k.t;
    slew.rotation.y = -Q.th;
    boom.rotation.x = k.a;
    stick.rotation.x = k.g - k.a;
    tel.position.copy(V(0, k.t, 0));
    // the tip in the trailer frame; the grapple hangs from it
    const s = Math.sin(Q.th),
      c = Math.cos(Q.th),
      hr = OFF + L1 * Math.cos(k.a) + (L2 + k.t + 0.08) * Math.cos(k.g),
      zt = CZ + L1 * Math.sin(k.a) + (L2 + k.t + 0.08) * Math.sin(k.g);
    grap.position.copy(V(s * hr, CY + c * hr, zt));
    grap.rotation.set(0, -Q.phi, 0);
    for (const cl of claws) cl.c.rotation.z = cl.sx * (0.08 + Q.open * 0.62);
    // cylinders: boom from the column's foot side to a third of the boom, stick from the boom's top to the stick's lever
    const P2 = (hh, zz) => [s * hh, CY + c * hh, zz];
    const bA = P2(OFF - 0.18, CZ - 0.75),
      bB = P2(OFF + Math.cos(k.a) * 0.95 + Math.sin(k.a) * 0.14, CZ + Math.sin(k.a) * 0.95 - Math.cos(k.a) * 0.14),
      sA = P2(OFF + Math.cos(k.a) * 0.6 - Math.sin(k.a) * 0.2, CZ + Math.sin(k.a) * 0.6 + Math.cos(k.a) * 0.2),
      ex = OFF + L1 * Math.cos(k.a),
      ez = CZ + L1 * Math.sin(k.a),
      sB = P2(ex - Math.cos(k.g) * 0.3 - Math.sin(k.g) * 0.22, ez - Math.sin(k.g) * 0.3 + Math.cos(k.g) * 0.22);
    for (const [cy, A, B] of [
      [cyl[0], bA, bB],
      [cyl[1], sA, sB],
    ]) {
      const mid = [(A[0] + B[0]) / 2, (A[1] + B[1]) / 2, (A[2] + B[2]) / 2];
      stretch(cy.tube, A, [
        A[0] + (mid[0] - A[0]) * 1.15,
        A[1] + (mid[1] - A[1]) * 1.15,
        A[2] + (mid[2] - A[2]) * 1.15,
      ]);
      stretch(cy.rod, mid, B);
    }
    markDirty();
  }
  pose();
  S.tip = () => {
    root.updateWorldMatrix(true, false);
    const p = grap.position.clone().applyMatrix4(TRAILER.g.matrixWorld);
    return [p.x, -p.z, p.y];
  };
  // ---- a log's place in the trailer frame and back ----
  const tl = p => {
    const q = TRAILER.local([p[0], p[1], p[2]]);
    return [q[0], q[1], q[2] + TRAILER.bed.z];
  };
  const _w = new THREE.Vector3();
  const tw = (x, y, z) => {
    TRAILER.g.updateWorldMatrix(true, false);
    _w.copy(V(x, y, z)).applyMatrix4(TRAILER.g.matrixWorld);
    return [_w.x, -_w.z, _w.y];
  };
  // the logs it may take: lying on the ground, within reach, not under the trailer, not under another log
  function candidates() {
    const out = [];
    for (const l of HOLZ.logs) {
      if (l.st !== 'ground' || !l.p0) continue;
      const m = HOLZ.mid(l),
        q = tl(m),
        h = Math.hypot(q[0], q[1] - CY);
      if (h > S.REACH || h < 1.2) continue;
      if (Math.abs(q[0]) < TRAILER.bed.hw + 0.25 && q[1] > TRAILER.bed.y0 - 0.3 && q[1] < TRAILER.bed.y1 + 0.5)
        continue;
      const r = (l.d0 + l.d1) / 400;
      if (
        HOLZ.logs.some(
          o =>
            o !== l &&
            o.st === 'ground' &&
            o.p0 &&
            HOLZ.mid(o)[2] > m[2] + 0.1 &&
            Math.hypot(HOLZ.mid(o)[0] - m[0], HOLZ.mid(o)[1] - m[1]) < r + (o.d0 + o.d1) / 400
        )
      )
        continue;
      out.push({ l, q, h, kg: HOLZ.mass(l), r });
    }
    return out;
  }
  // the one I look at (from where I stand), else the nearest
  function choose() {
    const c = candidates();
    if (!c.length) return null;
    const y = (P.yaw * Math.PI) / 180,
      f = [Math.sin(y), Math.cos(y)];
    let best = null,
      bs = 1e9;
    for (const o of c) {
      const m = HOLZ.mid(o.l),
        dx = m[0] - P.x,
        dy = m[1] - P.y,
        d = Math.hypot(dx, dy) || 1,
        ang = Math.acos(clamp((dx * f[0] + dy * f[1]) / d, -1, 1)),
        sc = ang * 3 + d * 0.15;
      if (sc < bs) {
        bs = sc;
        best = o;
      }
    }
    return best;
  }
  // ---- the work: keyframes of (θ, h, z, φ, open) in game time ----
  const angTo = (a, b) => {
    let d = b - a;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    return a + d;
  };
  function start(o) {
    const l = o.l,
      ax = tl(l.p0),
      bx = tl(l.p1),
      phiL = Math.atan2(ax[0] - bx[0], ax[1] - bx[1]), // the grapple's +y towards the log's butt
      thL = Math.atan2(o.q[0], o.q[1] - CY),
      hL = o.h - OFF,
      zL = o.q[2] + HANG,
      slot = TRAILER.slot ? TRAILER.slot(0, o.r) : null;
    if (!slot) {
      think('Der Anhänger ist voll – höher als die Rungen geht nicht.', 3000);
      return false;
    }
    const zBed = TRAILER.bed.z + slot.z + HANG + 0.03,
      ta = clamp(
        (TRAILER.bed.y0 + TRAILER.bed.y1) / 2,
        TRAILER.bed.y0 + l.L / 2 - 0.25,
        TRAILER.bed.y1 - l.L / 2 + 0.2
      ),
      hB = CY - ta - OFF,
      safe = 3.3; // high enough that a log in the grapple clears the front grid (2.28 m)
    const th0 = Q.th,
      thA = angTo(th0, thL),
      phiA = angTo(Q.phi, phiL);
    const K = [
      { th: th0, h: Q.h, z: safe, phi: Q.phi, open: 0 },
      { th: thA, h: hL, z: Math.max(safe, zL + 1.0), phi: phiA, open: 1 },
      { th: thA, h: hL, z: zL, phi: phiA, open: 1 },
      { th: thA, h: hL, z: zL, phi: phiA, open: 0, grip: true },
      { th: thA, h: hL, z: Math.max(safe, zL + 1.4), phi: phiA, open: 0 },
      { th: angTo(thA, Math.PI), h: hB, z: Math.max(safe, zBed + 0.6), phi: angTo(phiA, 0), open: 0 },
      { th: angTo(thA, Math.PI), h: hB, z: zBed, phi: angTo(phiA, 0), open: 0 },
      { th: angTo(thA, Math.PI), h: hB, z: zBed, phi: angTo(phiA, 0), open: 1, drop: true },
      { th: angTo(thA, Math.PI), h: PARK.h, z: safe, phi: angTo(phiA, 0), open: 0 },
      { th: angTo(thA, Math.PI), h: PARK.h, z: PARK.z, phi: angTo(phiA, 0), open: 0 },
    ];
    S.seq = { K, i: 0, t: 0, dur: 0, from: null, l, slot, ta, r: o.r };
    S.busy = true;
    S.log = null;
    next();
    think(`Kran: ${HOLZ.SPN[l.sp] || 'Stamm'} ${de(l.L, 2)} m, etwa ${l ? HOLZ.mass(l) : 0} kg – aufladen.`, 2600);
    return true;
  }
  function next() {
    const q = S.seq;
    if (q.i >= q.K.length) return finish();
    const k = q.K[q.i];
    q.from = { th: Q.th, h: Q.h, z: Q.z, phi: Q.phi, open: Q.open };
    q.dur = Math.max(
      0.5,
      Math.abs(k.th - Q.th) / 0.55,
      Math.abs(k.h - Q.h) / 0.8,
      Math.abs(k.z - Q.z) / 0.6,
      Math.abs(k.phi - Q.phi) / 1.2,
      Math.abs(k.open - Q.open) / 1.4
    );
    q.t = 0;
  }
  function finish() {
    S.busy = false;
    S.seq = null;
    Q.th = ((Q.th % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    Q.phi = ((Q.phi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    sndStop();
  }
  // the log in the grapple: its middle at the grip, along the grapple's axis
  function carry(l) {
    const s = Math.sin(Q.th),
      c = Math.cos(Q.th),
      k = ik(Q.h, Q.z),
      hr = OFF + L1 * Math.cos(k.a) + (L2 + k.t + 0.08) * Math.cos(k.g),
      zt = CZ + L1 * Math.sin(k.a) + (L2 + k.t + 0.08) * Math.sin(k.g),
      gx = s * hr,
      gy = CY + c * hr,
      gz = zt - HANG,
      u = [Math.sin(Q.phi), Math.cos(Q.phi)]; // from the middle towards the butt
    l.p0 = tw(gx + (u[0] * l.L) / 2, gy + (u[1] * l.L) / 2, gz);
    l.p1 = tw(gx - (u[0] * l.L) / 2, gy - (u[1] * l.L) / 2, gz);
    HOLZ.moved(l);
  }
  function tick(dt) {
    if (!LOAD.finished || !S.seq) return;
    const q = S.seq,
      k = q.K[q.i];
    q.t += dt;
    const e0 = Math.min(1, q.t / q.dur),
      e = e0 * e0 * (3 - 2 * e0);
    for (const n of ['th', 'h', 'z', 'phi', 'open']) Q[n] = q.from[n] + (k[n] - q.from[n]) * e;
    pose();
    if (S.log) carry(S.log);
    try {
      sndTick();
    } catch (e) {} // a failing sound must never stop the crane
    if (e0 >= 1) {
      if (k.grip) {
        const l = q.l;
        l.cp0 = l.p0.slice();
        l.cp1 = l.p1.slice();
        l.st = 'crane';
        S.log = l;
        SFX.clunk && SFX.clunk();
      }
      if (k.drop && S.log) {
        const l = S.log;
        l.st = 'trailer';
        l.tx = q.slot.x;
        l.tz = q.slot.z;
        l.ta = q.ta;
        delete l.cp0;
        delete l.cp1;
        S.log = null;
        HOLZ.trailerMass();
        HOLZ.redraw();
        HOLZ.save();
        SFX.drop && SFX.drop();
        think('Auf dem Anhänger.', 1600);
      }
      q.i++;
      next();
    }
  }
  window.TICKS.push(dt => {
    try {
      tick(dt);
    } catch (e) {
      if (!S._err) {
        S._err = 1;
        console.warn('kran', e);
      }
    }
  });
  // ---- the control block (E / tap) ----
  const still = () => Math.hypot(TRAILER.tow ? TRAILER.tow.st.u : 0, TRAILER.tow ? TRAILER.tow.st.v : 0) < 0.2;
  PLAY.act({
    id: 'kran:op',
    r: 2.0,
    prio: 0.55,
    obj: () => root,
    pos: () => {
      const p = tw(0.86, 2.62, 1.3);
      return p;
    },
    label: () => {
      if (VEH.cur || PLAY.seated() || P.mode !== 'walk' || S.busy || !HOLZ.ready) return null;
      const o = choose();
      if (!o) {
        // only where logs lie about (not at every visit to the trailer)
        const c = tw(0, CY, 0);
        return HOLZ.logs.some(
          l => l.st === 'ground' && l.p0 && Math.hypot(HOLZ.mid(l)[0] - c[0], HOLZ.mid(l)[1] - c[1]) < 14
        )
          ? 'Kran: kein Stamm in Reichweite'
          : null;
      }
      return `Kran: ${HOLZ.SPN[o.l.sp] || 'Stamm'} ${de(o.l.L, 1)} m aufladen`;
    },
    run: () => {
      if (!still()) {
        think('Erst anhalten.', 1500);
        return;
      }
      const o = choose();
      if (!o) {
        think(
          `Kein Stamm in Reichweite: der Kran reicht etwa ${de(S.REACH, 0)} m um die Säule – den Anhänger näher an die Stämme stellen.`,
          4200
        );
        return;
      }
      if (o.kg * o.h > S.CAP) {
        think(
          `Zu schwer bei dieser Ausladung: etwa ${o.kg} kg auf ${de(o.h)} m (Hubmoment ${de(S.CAP / 1000)} t·m). Näher heranfahren.`,
          4600
        );
        return;
      }
      start(o);
    },
  });
  // ---- sound: the hydraulics while it moves (the tractor's pump), from the column ----
  const SND = { N: null };
  function sndTick() {
    const r = audio.raw && audio.raw();
    if (!r || !audio.ready()) return;
    if (!SND.N) {
      const c = r.ctx,
        o = c.createOscillator(),
        f = c.createBiquadFilter(),
        g = c.createGain(),
        p = c.createStereoPanner ? c.createStereoPanner() : null;
      o.type = 'sawtooth';
      o.frequency.value = 96;
      f.type = 'bandpass';
      f.frequency.value = 340;
      f.Q.value = 2.5;
      g.gain.value = 0;
      o.connect(f);
      f.connect(g);
      if (p) {
        g.connect(p);
        p.connect(r.sfx);
      } else g.connect(r.sfx);
      o.start();
      SND.N = { c, o, f, g, p };
    }
    const N = SND.N,
      t = N.c.currentTime,
      cp = tw(0, CY, 1.5),
      sp = audio.spatial(cp[0], cp[1], 10);
    N.g.gain.setTargetAtTime(sp.vol * 0.08, t, 0.1);
    N.o.frequency.setTargetAtTime(96 + (S.log ? 14 : 0), t, 0.3);
    if (N.p) N.p.pan.setTargetAtTime(sp.pan, t, 0.1);
  }
  function sndStop() {
    const N = SND.N;
    if (!N) return;
    SND.N = null;
    N.g.gain.setTargetAtTime(0, N.c.currentTime, 0.2);
    try {
      N.o.stop(N.c.currentTime + 1);
    } catch (e) {}
  }
  Object.assign(S, { candidates, choose, start, pose, Q, root });
  return S;
})();
window.KRAN = KRAN;
