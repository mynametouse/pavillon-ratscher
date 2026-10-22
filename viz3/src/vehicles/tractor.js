// ===================== V16b the tractor: a mid-size four-wheel-drive tractor (~100 PS) with cab and front loader, pallet fork in front =====================
// Generic (no make): green bonnet and wings, anthracite frame, light grey rims, white cab roof. Rear wheels 1.56 m, front 1.12 m, track 1.8 m,
// wheelbase 2.4 m, about 5.4 t with the loader. Front loader: two arms from the masts beside the cab, lift cylinders, a tool carrier with
// parallel guidance (the fork stays level while lifting), a pallet fork with two tines – R raises, G lowers, T tilts the tines up/back.
// Parked at the Untere Klinge (the end of the route from the garden, world/roads.js routes.klinge). Model frame as in vehicles/car.js
// (x right, y forward, z up, origin on the ground under the centre of mass: front axle +1.30 m, rear axle −1.10 m).
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LATE } from '../core/late.js';
import { V } from '../core/head.js';
import { markDirty } from '../core/assets.js';
import { MOTION } from '../render/render.js';
import { ROADS } from '../world/roads.js';
import { VEH } from './vehicle.js';
export const TRACTOR2 = (() => {
  const A = 1.3,
    B = 1.1,
    RR = 0.78,
    RF = 0.56,
    TRR = 1.8,
    TRF = 1.7;
  const M = {
    green: new THREE.MeshPhysicalMaterial({
      color: new THREE.Color('#2f6c34'),
      metalness: 0.15,
      roughness: 0.42,
      clearcoat: 0.6,
      clearcoatRoughness: 0.2,
    }),
    frame: new THREE.MeshStandardMaterial({ color: 0x2a2c2e, metalness: 0.35, roughness: 0.55 }),
    roof: new THREE.MeshStandardMaterial({ color: 0xe6e6e1, roughness: 0.5 }),
    glass: new THREE.MeshPhysicalMaterial({
      color: 0x1f2a2e,
      roughness: 0.05,
      transparent: true,
      opacity: 0.32,
      envMapIntensity: 1.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
    black: new THREE.MeshStandardMaterial({ color: 0x151617, roughness: 0.6 }),
    tyre: new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.95 }),
    rim: new THREE.MeshStandardMaterial({ color: 0xc3c6c8, metalness: 0.5, roughness: 0.38 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x9da2a6, metalness: 0.9, roughness: 0.25 }),
    seat: new THREE.MeshStandardMaterial({ color: 0x1d1e20, roughness: 0.9 }),
    head: new THREE.MeshStandardMaterial({
      color: 0xdfe3e6,
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
      emissiveIntensity: 0,
    }),
    rev: new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.2, emissive: 0xffffff, emissiveIntensity: 0 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xd0761c, roughness: 0.3 }),
  };
  M.greenD = M.green.clone();
  M.greenD.side = THREE.DoubleSide; // wings and mudguards: seen from inside too
  const g = new THREE.Group(),
    body = new THREE.Group();
  g.add(body);
  const add = (geo, mat, par = body) => {
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = true;
    m.receiveShadow = true;
    par.add(m);
    return m;
  };
  const bx = (sx, sy, sz, mat, x, y, z, rx = 0, rz = 0, par = body) => {
    const m = add(new THREE.BoxGeometry(sx, sz, sy), mat, par);
    m.position.copy(V(x, y, z));
    m.rotation.set(rx, rz, 0, 'YXZ');
    return m;
  };
  const strut = (a, b, w, d, mat, par = body) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      dz = b[2] - a[2],
      L = Math.hypot(dx, dy, dz);
    const m = add(new THREE.BoxGeometry(w, L, d), mat, par);
    m.position.copy(V((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), V(dx, dy, dz).normalize());
    return m;
  };
  const rod = (a, b, r, mat, par = body) => {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      dz = b[2] - a[2],
      L = Math.hypot(dx, dy, dz);
    const m = add(new THREE.CylinderGeometry(r, r, L, 10), mat, par);
    m.position.copy(V((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), V(dx, dy, dz).normalize());
    return m;
  };
  // ---- frame, engine, bonnet (tapering a little towards the top), grille with lamps, front weight ----
  bx(0.64, 2.7, 0.5, M.frame, 0, 0.75, 0.82);
  {
    const sh = new THREE.Shape();
    [
      [0.32, 1.0],
      [2.08, 1.0],
      [2.2, 1.18],
      [2.18, 1.62],
      [2.02, 1.74],
      [0.32, 1.78],
    ].forEach(([y, z], i) => (i ? sh.lineTo(y, z) : sh.moveTo(y, z)));
    sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, {
      depth: 0.84,
      bevelEnabled: true,
      bevelThickness: 0.04,
      bevelSize: 0.04,
      bevelOffset: -0.04,
      bevelSegments: 2,
    });
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getX(i),
        z = p.getY(i),
        x = (p.getZ(i) - 0.42) * (1 - 0.13 * Math.max(0, (z - 1.0) / 0.78));
      p.setXYZ(i, x, z, -y);
    }
    geo.computeVertexNormals();
    add(geo, M.green);
  }
  bx(0.6, 0.04, 0.46, M.black, 0, 2.205, 1.38); // grille
  for (let k = 0; k < 6; k++) bx(0.56, 0.02, 0.015, M.frame, 0, 2.225, 1.2 + k * 0.07);
  const heads = [];
  for (const sx of [-1, 1]) heads.push(bx(0.16, 0.05, 0.1, M.head, sx * 0.24, 2.21, 1.66));
  bx(0.78, 0.32, 0.4, M.frame, 0, 2.38, 0.66);
  for (let k = 0; k < 5; k++) bx(0.8, 0.05, 0.36, M.frame, 0, 2.27 + k * 0.06, 0.66); // front weights
  rod([0.45, 0.62, 1.7], [0.45, 0.62, 2.95], 0.055, M.black);
  rod([0.45, 0.62, 2.95], [0.45, 0.55, 3.02], 0.06, M.black); // exhaust
  // ---- cab: floor over the rear axle, four corner posts, glass all round, white roof; steps on the left ----
  const CY0 = -1.08,
    CY1 = 0.42,
    CZ0 = 1.38,
    CZ1 = 2.78,
    CW = 0.72;
  bx(1.46, CY1 - CY0, 0.08, M.frame, 0, (CY0 + CY1) / 2, CZ0);
  for (const sx of [-1, 1])
    for (const yy of [CY0 + 0.04, CY1 - 0.04])
      strut([sx * CW, yy, CZ0], [sx * (CW + 0.02), yy, CZ1], 0.07, 0.07, M.black);
  {
    const gq = [];
    const c = [
      [-CW, CY1, CZ0 + 0.04],
      [CW, CY1, CZ0 + 0.04],
      [CW, CY0, CZ0 + 0.04],
      [-CW, CY0, CZ0 + 0.04],
      [-CW - 0.02, CY1, CZ1],
      [CW + 0.02, CY1, CZ1],
      [CW + 0.02, CY0, CZ1],
      [-CW - 0.02, CY0, CZ1],
    ];
    const quad = (a, b, cc, d) => {
      for (const k of [a, b, cc, a, cc, d]) {
        const q = c[k];
        gq.push(q[0], q[2], -q[1]);
      }
    };
    quad(0, 1, 5, 4);
    quad(2, 3, 7, 6);
    quad(1, 2, 6, 5);
    quad(3, 0, 4, 7);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(gq, 3));
    geo.computeVertexNormals();
    const gm = add(geo, M.glass);
    gm.castShadow = false;
    gm.renderOrder = 2;
  }
  bx(1.62, CY1 - CY0 + 0.24, 0.1, M.roof, 0, (CY0 + CY1) / 2 + 0.04, CZ1 + 0.05);
  bx(1.5, CY1 - CY0 + 0.1, 0.03, M.frame, 0, (CY0 + CY1) / 2, CZ1 - 0.01);
  for (const sx of [-1, 1]) {
    bx(0.08, 0.06, 0.06, M.head, sx * 0.62, CY1 + 0.12, CZ1 + 0.02);
    bx(0.14, 0.03, 0.04, M.frame, sx * 0.6, CY1 + 0.1, CZ1 - 0.01);
  } // work lamps
  bx(0.11, 0.11, 0.09, M.amber, 0.55, CY0 + 0.2, CZ1 + 0.14); // beacon (off)
  for (const z of [0.55, 0.85, 1.15]) bx(0.3, 0.22, 0.03, M.frame, -0.82, -0.25, z); // steps
  strut([-0.72, -0.13, 0.5], [-0.72, -0.13, 1.38], 0.04, 0.04, M.frame);
  strut([-0.92, -0.37, 0.5], [-0.92, -0.37, 1.2], 0.04, 0.04, M.frame);
  // inside: seat, steering column and wheel, instrument pod, levers
  bx(0.5, 0.46, 0.1, M.seat, 0, -0.55, 1.78);
  bx(0.5, 0.1, 0.55, M.seat, 0, -0.8, 2.07, 0.15);
  bx(0.25, 0.42, 0.42, M.frame, 0, -0.55, 1.55);
  rod([0, 0.22, 1.42], [0, -0.02, 2.08], 0.04, M.black);
  bx(0.3, 0.12, 0.1, M.black, 0, 0.05, 2.05, -0.6);
  {
    const sw = new THREE.Group();
    sw.position.copy(V(0, -0.05, 2.12));
    sw.rotation.x = -0.85;
    body.add(sw);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.017, 8, 32), M.black);
    sw.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 12), M.black);
    hub.rotation.x = Math.PI / 2;
    sw.add(hub);
    for (const a of [0, 2.1, 4.2]) {
      const sp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.025, 0.015), M.black);
      sp.position.set(Math.cos(a) * 0.1, Math.sin(a) * 0.1, 0);
      sp.rotation.z = a;
      sw.add(sp);
    }
  }
  for (const [x, l] of [
    [0.42, 0.45],
    [0.5, 0.4],
  ])
    rod([x, -0.55, 1.6], [x, -0.48, 1.6 + l], 0.012, M.black);
  // ---- rear wings over the big wheels (with the tail lamps), front mudguards turn with the wheels; linkage at the back ----
  const wingGeo = (r, w, a0, a1) => {
    const gg = new THREE.CylinderGeometry(r, r, w, 28, 1, true, a0, a1 - a0);
    gg.rotateZ(Math.PI / 2);
    return gg;
  };
  const tails = [],
    brakes = [],
    revs = [];
  for (const sx of [-1, 1]) {
    const wg = add(wingGeo(RR + 0.09, 0.56, -0.25, 2.25), M.greenD);
    wg.position.copy(V((sx * TRR) / 2, -B, RR));
    const cap = add(new THREE.RingGeometry(0.3, RR + 0.09, 24, 1, Math.PI * 0.42, Math.PI * 0.62), M.greenD);
    cap.position.copy(V(sx * (TRR / 2 - 0.28), -B, RR));
    cap.rotation.y = Math.PI / 2;
    tails.push(bx(0.08, 0.04, 0.08, M.tail, sx * 1.12, -B - 0.86, RR + 0.2));
    brakes.push(bx(0.08, 0.04, 0.06, M.brake, sx * 1.12, -B - 0.86, RR + 0.11));
    bx(0.08, 0.04, 0.06, M.amber, sx * 1.12, -B - 0.86, RR + 0.3);
  }
  revs.push(bx(0.1, 0.04, 0.06, M.rev, 0.3, CY0 - 0.02, CZ1 - 0.05));
  bx(0.9, 0.3, 0.3, M.frame, 0, -B - 0.35, 0.95);
  for (const sx of [-1, 1]) strut([sx * 0.38, -B - 0.4, 0.75], [sx * 0.42, -B - 1.05, 0.55], 0.07, 0.07, M.frame);
  strut([0, -B - 0.45, 1.2], [0, -B - 0.95, 1.05], 0.06, 0.06, M.frame);
  bx(0.06, 0.12, 0.06, M.steel, 0, -B - 0.55, 0.78); // PTO stub
  bx(0.14, 0.86, 0.05, M.frame, 0, -B - 0.66, 0.46);
  rod([0, -2.16, 0.4], [0, -2.16, 0.6], 0.022, M.steel);
  bx(0.2, 0.08, 0.06, M.frame, 0, -B - 0.25, 0.46); // V16d: swinging drawbar with its pin (the trailer's hitch)
  // ---- wheels: rear 1.56 m, front 1.12 m (lathe tyres with a tread band), light grey rims ----
  const tyreGeo = (r, w, ri) => {
    const s = w * 0.18,
      pts = [
        [ri, -w / 2],
        [r - s, -w / 2],
        [r, -w / 2 + s],
        [r, w / 2 - s],
        [r - s, w / 2],
        [ri, w / 2],
      ].map(([a, b]) => new THREE.Vector2(a, b));
    const gg = new THREE.LatheGeometry(pts, 40);
    gg.rotateZ(Math.PI / 2);
    return gg;
  };
  const lugGeo = new THREE.BoxGeometry(0.06, 0.05, 0.16);
  const wheels = [];
  for (const [x, y, r, w, steer, drive] of [
    [-TRF / 2, A, RF, 0.34, 1, 1],
    [TRF / 2, A, RF, 0.34, 1, 1],
    [-TRR / 2, -B, RR, 0.44, 0, 1],
    [TRR / 2, -B, RR, 0.44, 0, 1],
  ]) {
    const piv = new THREE.Group(),
      node = new THREE.Group();
    piv.position.copy(V(x, y, r));
    piv.add(node);
    g.add(piv);
    const sx = Math.sign(x);
    const t = new THREE.Mesh(tyreGeo(r, w, r * 0.62), M.tyre);
    const rimG = new THREE.CylinderGeometry(r * 0.62, r * 0.62, w * 0.8, 28);
    rimG.rotateZ(Math.PI / 2);
    const rm = new THREE.Mesh(rimG, M.rim);
    const hubG = new THREE.CylinderGeometry(r * 0.2, r * 0.24, 0.1, 16);
    hubG.rotateZ(Math.PI / 2);
    const hb = new THREE.Mesh(hubG, M.frame);
    hb.position.x = sx * w * 0.4;
    node.add(t, rm, hb);
    {
      const nl = Math.round(r * 30),
        gs = [],
        m4 = new THREE.Matrix4(),
        q = new THREE.Quaternion();
      for (let k = 0; k < nl; k++) {
        const a = (k / nl) * Math.PI * 2;
        q.setFromEuler(new THREE.Euler(a + (k % 2 ? 0.5 : -0.5), 0, 0)); // tread lugs in a chevron, one mesh
        m4.compose(
          new THREE.Vector3(0, Math.cos(a) * (r + 0.01), Math.sin(a) * (r + 0.01)),
          q,
          new THREE.Vector3((w * 0.9) / 0.06, 1, 1)
        );
        gs.push(lugGeo.clone().applyMatrix4(m4));
      }
      node.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(gs), M.tyre));
    }
    for (const m of node.children) {
      m.castShadow = true;
      m.receiveShadow = true;
    }
    if (steer) {
      const mg = new THREE.Mesh(wingGeo(r + 0.07, w + 0.08, -0.2, 1.9), M.greenD);
      mg.castShadow = true;
      piv.add(mg);
    }
    wheels.push({ x, y, r, w, steer, drive, piv, node });
  }
  bx(1.3, 0.16, 0.14, M.frame, 0, A, RF); // front axle beam
  // ---- front loader: masts, arms, cross tube, lift cylinders, tool carrier and pallet fork (parallel guidance: the fork keeps its angle) ----
  const LD = { lift: -0.5, liftT: -0.5, tilt: 0, tiltT: 0, up: 0, ARM: 2.62, P0: [0.35, 1.86], X: 0.66, min: -0.6 }; // V16d: min −0.6 = the tines on the ground (under a log)
  for (const sx of [-1, 1]) {
    bx(0.1, 0.36, 0.95, M.green, sx * LD.X, 0.3, 1.42);
    bx(0.14, 0.2, 0.2, M.frame, sx * LD.X, LD.P0[0], LD.P0[1]);
  }
  const arms = new THREE.Group();
  arms.position.copy(V(0, LD.P0[0], LD.P0[1]));
  body.add(arms); // turns about the mast pivots (model x)
  for (const sx of [-1, 1]) {
    const a = bx(0.12, LD.ARM, 0.17, M.green, sx * LD.X, LD.ARM / 2, 0, 0, 0, arms);
    bx(0.1, 0.45, 0.12, M.green, sx * LD.X, LD.ARM - 0.15, -0.14, -0.6, 0, arms);
  }
  bx(1.42, 0.12, 0.12, M.green, 0, LD.ARM * 0.62, 0.02, 0, 0, arms);
  const cyl = [];
  for (const sx of [-1, 1]) {
    const c1 = add(new THREE.CylinderGeometry(0.055, 0.055, 1, 12), M.green),
      c2 = add(new THREE.CylinderGeometry(0.03, 0.03, 1, 10), M.steel);
    cyl.push({ sx, c1, c2 });
  }
  const tool = new THREE.Group();
  body.add(tool); // the carrier and the fork: placed at the arms' tips, turned by the tilt only
  bx(1.24, 0.08, 0.08, M.frame, 0, 0, 0.62, 0, 0, tool);
  bx(1.24, 0.1, 0.1, M.frame, 0, 0.02, 0.04, 0, 0, tool);
  for (const sx of [-1, 1]) {
    bx(0.07, 0.07, 0.66, M.frame, sx * 0.58, 0.0, 0.33, 0, 0, tool);
    bx(0.1, 0.05, 0.62, M.frame, sx * 0.36, 0.06, 0.33, 0, 0, tool);
    bx(0.1, 1.12, 0.045, M.frame, sx * 0.36, 0.62, 0.02, 0, 0, tool);
    bx(0.08, 0.12, 0.04, M.steel, sx * 0.36, 1.16, 0.02, 0, 0, tool);
  }
  function loaderPose(dt) {
    if (dt) {
      LD.lift += THREE.MathUtils.clamp(LD.liftT - LD.lift, -0.34 * dt, 0.34 * dt);
      LD.tilt += THREE.MathUtils.clamp(LD.tiltT - LD.tilt, -0.7 * dt, 0.7 * dt);
    }
    arms.rotation.x = LD.lift;
    const tipY = LD.P0[0] + Math.cos(LD.lift) * LD.ARM,
      tipZ = LD.P0[1] + Math.sin(LD.lift) * LD.ARM - 0.32;
    tool.position.copy(V(0, tipY, tipZ - 0.06));
    tool.rotation.x = LD.tilt;
    for (const c of cyl) {
      const a = [c.sx * (LD.X + 0.12), 0.55, 1.0],
        k = 0.42,
        b = [
          c.sx * (LD.X + 0.12),
          LD.P0[0] + Math.cos(LD.lift) * LD.ARM * k + Math.sin(LD.lift) * 0.12,
          LD.P0[1] + Math.sin(LD.lift) * LD.ARM * k - Math.cos(LD.lift) * 0.12,
        ];
      const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2],
        L = Math.hypot(b[1] - a[1], b[2] - a[2]),
        dir = V(0, b[1] - a[1], b[2] - a[2]).normalize();
      c.c1.scale.set(1, L * 0.6, 1);
      c.c1.position.copy(V(a[0], a[1] + (b[1] - a[1]) * 0.3, a[2] + (b[2] - a[2]) * 0.3));
      c.c1.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      c.c2.scale.set(1, L * 0.45, 1);
      c.c2.position.copy(V(b[0], b[1] - (b[1] - a[1]) * 0.225, b[2] - (b[2] - a[2]) * 0.225));
      c.c2.quaternion.copy(c.c1.quaternion);
    }
  }
  loaderPose(0);
  const model = {
    g,
    body,
    wheels,
    lamps: { head: [M.head], tail: [M.tail], brake: [M.brake], rev: [M.rev] },
    beam: [0, 2.3, 1.62],
    LD,
    fork: { tool, x: 0.36, y0: 0.06, y1: 1.18, top: 0.0425 }, // V16d: the tines in the tool frame (x across, y along, z up; top surface)
    update(v, dt) {
      if (v === VEH.cur) {
        if (LD.up) LD.liftT = THREE.MathUtils.clamp(LD.liftT + LD.up * 0.34 * dt, LD.min, 0.62);
      } // dt: game time from the vehicle tick
      if (Math.abs(LD.lift - LD.liftT) > 1e-3 || Math.abs(LD.tilt - LD.tiltT) > 1e-3) {
        loaderPose(dt);
        markDirty();
        if (VEH.cur === v) MOTION.lastMove = performance.now();
      }
    },
    key(k, down) {
      if (k === 'r' || k === 'up') LD.up = down ? 1 : LD.up === 1 ? 0 : LD.up;
      else if (k === 'g' || k === 'down') LD.up = down ? -1 : LD.up === -1 ? 0 : LD.up;
      else if ((k === 't' || k === 'tilt') && down) LD.tiltT = LD.tiltT > 0.1 ? 0 : 0.3;
      else if ((k === 'k' || k === 'hitch') && down && window.TRAILER) LATE.TRAILER.toggle();
    },
    // V16d collision parts (vehicles/vehicle.js collide): the body up to the front weights (full height), the loader in front of it only as high
    // as the carrier and the tines are – lifted, the fork reaches over a sawmill's bed or a trailer's floor
    colParts() {
      const tipY = LD.P0[0] + Math.cos(LD.lift) * LD.ARM,
        tz = LD.P0[1] + Math.sin(LD.lift) * LD.ARM - 0.38,
        y1 = tipY + 1.18 * Math.cos(LD.tilt),
        B0 = -2.0,
        B1 = 2.6;
      return [
        { cy: (B0 + B1) / 2, hl: (B1 - B0) / 2, hw: 1.14, z0: 0.25, z1: 2.9 },
        {
          cy: (B1 + y1) / 2,
          hl: Math.max(0.05, (y1 - B1) / 2),
          hw: 0.68,
          z0: tz - 0.04,
          z1: tz + 0.7 + 1.18 * Math.sin(LD.tilt),
        },
      ];
    },
    save: () => [+LD.liftT.toFixed(3), +LD.tiltT.toFixed(3)],
    load: a => {
      if (a && a.length >= 2) {
        LD.lift = LD.liftT = THREE.MathUtils.clamp(+a[0] || -0.5, LD.min, 0.62);
        LD.tilt = LD.tiltT = THREE.MathUtils.clamp(+a[1] || 0, 0, 0.3);
        loaderPose(0);
      }
    },
  };
  const spec = {
    id: 'tractor',
    name: 'Traktor',
    enterLabel: 'Auf den Traktor steigen',
    mass: 5400,
    Iz: 7200,
    a: A,
    b: B,
    track: (TRR + TRF) / 2,
    hcg: 1.05,
    rw: RR,
    mu: 0.85,
    Cf: 110000,
    Cr: 190000,
    offGrip: 1.35,
    offRoll: 0.7,
    steerMax: 0.8,
    steerV: 9,
    steerRate: 1.9,
    steerBack: 2.8,
    eng: {
      idle: 850,
      red: 2350,
      launch: 1150,
      drag: 170,
      curve: [
        [800, 300],
        [1300, 420],
        [1600, 440],
        [2000, 400],
        [2200, 330],
        [2350, 150],
        [2450, 0],
      ],
    },
    gears: [180, 100, 56, 31, 17.5],
    rev: 120,
    final: 1,
    eff: 0.85,
    split: 0.4,
    shift: 0.45,
    upAt: t => 1750 + 400 * t,
    downAt: () => 1050,
    brake: 32000,
    brakeF: 0.3,
    hand: true,
    cdA: 3.6,
    dive: 0.002,
    lean: 0.003,
    travel: 0.06,
    susp: 45,
    suspD: 11,
    box: { hw: 1.14, hl: 2.86, cy: 0.86, h: 2.9 },
    eye: [0, -0.45, 2.42],
    door: [-1.3, -0.25],
    reach: 2.4,
    beam: 300,
    beamAngle: 0.56,
    sound: 'diesel',
    cam: { dist: 8.2, height: 3.0, look: 2.0 },
    // at the Untere Klinge: on the forest-edge track a little before the junction, facing it
    home: () => {
      const R = ROADS.routes.klinge;
      if (R && R.length > 4) {
        const e = R[R.length - 1];
        let k = R.length - 1;
        while (k > 0 && Math.hypot(R[k][0] - e[0], R[k][1] - e[1]) < 14) k--;
        const a = R[k];
        return [a[0], a[1], Math.atan2(e[0] - a[0], e[1] - a[1])];
      }
      return [-565, -585, 4.3];
    },
  };
  return VEH.add(spec, model);
})();
window.TRACTOR2 = TRACTOR2; // V16d: the wood (werk/holz.js) and its tests reach the tractor's fork
