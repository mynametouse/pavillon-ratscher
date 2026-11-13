// ===================== feat/cockpit: the inside of a car as geometry – dashboard, cluster, wheel, seats, doors, mirrors, wipers (CPBUILD) =====================
// Built once when it is first needed (getting into the car), in the car's own frame (x right, y forward, z up; vehicles/car.js) and placed
// by anchor points (A: eye, H-point, wheel, windscreen, mirrors – docs/features/cockpit.md), so the same inside fits a new body of the
// same class. Generic, no maker's marks: a soft-touch dashboard with a recess for the cluster under its hood, round dials behind a
// three-spoke wheel, a centre stack with the navi's screen and vents, a console with the selector lever and the handbrake, fabric seats,
// door panels, A-pillar trims, sun visors, an interior mirror and two door mirror heads. Static parts are merged per material (a handful of
// draw calls); what moves stays apart: the wheel, the needles, the arrows, the lever, the stalks, the pedals, the wipers.
//   CPBUILD.anchors(v) → A · CPBUILD.build(A) → parts · CPBUILD.mats() (shared materials, made on first use)
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { V } from '../core/head.js';
export const CPBUILD = (() => {
  // ---- anchor points per vehicle (the car's frame, metres). Falko's estate today (vehicles/car.js: eye from its spec, the glasshouse BL/RF,
  // the mirror arms); a body from the roads chat names its own (docs/features/cockpit.md, „Ankerpunkte“) ----
  const CAR = {
    eye: [-0.36, -0.22, 1.17],
    hp: [-0.36, -0.1, 0.62], // the driver's H-point (hip joint on the seat)
    wheel: { c: [-0.36, 0.3, 0.86], tilt: 0.44, r: 0.185 }, // centre, tilt of its plane from upright (top forward), rim radius
    dash: { face: 0.49, top: 0.966, ws: 0.84, x: 0.745 }, // face (y), top (z), windscreen base (y), half width
    ws: { y0: 0.82, z0: 0.97, w0: 0.8, y1: -0.05, z1: 1.55, w1: 0.64 }, // windscreen: base and top edge (y, z, half width)
    floor: 0.45,
    door: 0.755, // inner face of the door trims (|x|)
    mirL: [-0.99, 0.67, 1.04], // door mirror heads (centre)
    mirR: [0.99, 0.67, 1.04],
    mirI: [0, 0.22, 1.285], // interior mirror (centre of its glass)
    roof: 1.51, // under the headliner
  };
  // the tractor (vehicles/tractor.js): eye from its spec, the wheel on its column, the pod in front of it, the levers on the right
  const TRACTOR = {
    eye: [0, -0.45, 2.42],
    wheel: { c: [0, -0.05, 2.12], tilt: 0.85, r: 0.2 },
    pod: [0, 0.17, 2.27], // above the rim, on a stem from the column
    lever: [0.42, -0.48, 2.05],
  };
  function anchors(v) {
    const A = JSON.parse(JSON.stringify(v && v.id === 'tractor' ? TRACTOR : CAR));
    if (v && v.spec && Array.isArray(v.spec.eye)) A.eye = v.spec.eye.slice();
    return A;
  }
  // ---- materials: plain lit ones like the body's (vehicles/car.js), unlit faces whose brightness the cockpit sets (day light or backlight) ----
  let MAT = null;
  function canvasTex(n, draw, rep) {
    const c = document.createElement('canvas');
    c.width = c.height = n;
    const g = c.getContext('2d');
    draw(g, n);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    if (rep) t.repeat.set(rep, rep);
    t.anisotropy = 4;
    return t;
  }
  // a fine grain (soft-touch plastic, leather): grey around 0.9 with small specks
  const grain = (g, n) => {
    const im = g.createImageData(n, n);
    let s = 7;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < n * n; i++) {
      const v = 222 + (rnd() - 0.5) * 34 + (rnd() < 0.04 ? -22 : 0);
      im.data[i * 4] = im.data[i * 4 + 1] = im.data[i * 4 + 2] = v;
      im.data[i * 4 + 3] = 255;
    }
    g.putImageData(im, 0, 0);
  };
  // the seats' weave: fine diagonal threads in two shades
  const weave = (g, n) => {
    g.fillStyle = '#e4e4e4';
    g.fillRect(0, 0, n, n);
    for (let y = 0; y < n; y += 2)
      for (let x = 0; x < n; x += 2) {
        const v = ((x + y) >> 1) % 4 < 2 ? 205 : 240;
        g.fillStyle = `rgb(${v},${v},${v})`;
        g.fillRect(x, y, 2, 2);
      }
    for (let i = 0; i < 400; i++) {
      g.fillStyle = 'rgba(0,0,0,0.05)';
      g.fillRect((i * 37) % n, (i * 91) % n, 2, 1);
    }
  };
  function mats() {
    if (MAT) return MAT;
    const gr = canvasTex(128, grain, 1),
      wv = canvasTex(64, weave, 1);
    const S = o => new THREE.MeshStandardMaterial(o);
    MAT = {
      pad: S({ color: 0x2a2c2f, roughness: 0.8, map: gr }), // soft-touch top of the dashboard
      hard: S({ color: 0x1d1e21, roughness: 0.68, map: gr }), // lower dashboard, console, stack
      gloss: S({ color: 0x0b0c0d, roughness: 0.18, metalness: 0.15 }), // piano black: bezels, vents' frames
      satin: S({ color: 0x9aa0a6, roughness: 0.3, metalness: 0.9 }), // satin chrome: rings, handles, slats' edges
      leather: S({ color: 0x18191a, roughness: 0.52, map: gr }), // wheel rim, knob, armrests
      fabric: S({ color: 0x3b3e43, roughness: 0.96, map: wv }), // seats
      liner: S({ color: 0xb4b0a8, roughness: 0.95 }), // pillar trims and visors, as the car's headliner
      rubber: S({ color: 0x111111, roughness: 0.92 }),
      metal: S({ color: 0x45484c, roughness: 0.45, metalness: 0.7 }),
      black: S({ color: 0x08090a, roughness: 0.62 }),
      // unlit: the cluster, the navi, the needles and the arrows (the cockpit sets their colour – day light or backlight)
      needle: new THREE.MeshBasicMaterial({ color: 0xff4d1a }),
      arrow: new THREE.MeshBasicMaterial({ color: 0x2bd968 }),
      // the mirrors without live pictures: polished metal that shows the sky's light
      mirrorOff: S({ color: 0x8f989f, roughness: 0.07, metalness: 1 }),
      drops: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, opacity: 0, color: 0xd8e2ea }),
    };
    MAT.drops.map = canvasTex(256, dropsArt, 2);
    return MAT;
  }
  // rain drops on glass: small beads, bright at one edge, transparent between them
  function dropsArt(g, n) {
    g.clearRect(0, 0, n, n);
    let s = 11;
    const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for (let i = 0; i < 260; i++) {
      const x = rnd() * n,
        y = rnd() * n,
        r = 1.2 + rnd() * rnd() * 4.5;
      g.fillStyle = 'rgba(40,50,60,0.35)';
      g.beginPath();
      g.ellipse(x, y, r, r * (0.85 + rnd() * 0.3), 0, 0, 7);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.75)';
      g.beginPath();
      g.arc(x - r * 0.3, y - r * 0.35, Math.max(0.6, r * 0.35), 0, 7);
      g.fill();
    }
  }
  // ---- geometry helpers (model frame → three: V(x, y, z) = (x, z, −y)) ----
  // a rounded box in the model's measures: sx across, sy along, sz up
  const rb = (sx, sy, sz, r = 0.01, seg = 2) =>
    new RoundedBoxGeometry(sx, sz, sy, seg, Math.min(r, Math.min(sx, sy, sz) * 0.45));
  // a mesh at (x, y, z) of the model, turned: tilt about x (positive: nose up, top back), yaw about z (positive: nose left), roll
  function put(par, geo, mat, x = 0, y = 0, z = 0, tilt = 0, yaw = 0, roll = 0) {
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(V(x, y, z));
    m.rotation.set(tilt, yaw, -roll, 'YXZ');
    par.add(m);
    return m;
  }
  // a side profile ([y, z] points, a smooth curve through them) extruded across x from x0 to x1, edges softly bevelled
  const EXM = new THREE.Matrix4().set(0, 0, 1, 0, 0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 0, 1);
  function ext(pts, x0, x1, bev = 0.005, seg = 5) {
    const sh = new THREE.Shape();
    sh.moveTo(pts[0][0], pts[0][1]);
    sh.splineThru(pts.slice(1).map(p => new THREE.Vector2(p[0], p[1])));
    const mk = b =>
      new THREE.ExtrudeGeometry(sh, {
        depth: Math.max(0.002, x1 - x0 - 2 * b),
        bevelEnabled: b > 0,
        bevelThickness: b,
        bevelSize: b,
        bevelSegments: 2,
        curveSegments: seg,
      });
    let g = mk(bev);
    // a bevel can fold where the curve turns sharply (NaN corners): then without it
    if (bev > 0 && g.attributes.position.array.some(v => !Number.isFinite(v))) {
      g.dispose();
      g = mk(0);
      bev = 0;
    }
    g.applyMatrix4(EXM);
    g.translate(x0 + bev, 0, 0);
    // texture coordinates in metres (×12: the grain about 8 cm a tile)
    const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 12, uv.getY(i) * 12);
    g.computeVertexNormals();
    return g;
  }
  // a strut between two model points, a rounded bar of w × d
  function strut(par, a, b, w, d, mat, r = 0.01) {
    const dx = b[0] - a[0],
      dy = b[1] - a[1],
      dz = b[2] - a[2],
      L = Math.hypot(dx, dy, dz);
    const m = new THREE.Mesh(new RoundedBoxGeometry(w, L, d, 2, Math.min(r, w * 0.45, d * 0.45)), mat);
    m.position.copy(V((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2));
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), V(dx, dy, dz).normalize());
    par.add(m);
    return m;
  }
  const BAD = [];
  // the meshes under root merged per material (as vehicles/car.js does for the body): a few draw calls for the static inside
  function merge(root) {
    root.updateMatrixWorld(true);
    const inv = root.matrixWorld.clone().invert(),
      by = new Map(),
      kill = [];
    root.traverse(o => {
      if (!o.isMesh || o.userData.keep) return;
      const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(
        inv.clone().multiply(o.matrixWorld)
      );
      for (const k of Object.keys(g.attributes))
        if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
      if (!g.attributes.uv)
        g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      g.clearGroups();
      kill.push(o);
      // a part with a broken corner would hide every part of its material (no bounding sphere): left out and counted
      if (g.attributes.position.array.some(v => !Number.isFinite(v))) {
        BAD.push((o.geometry && o.geometry.type) || '?');
        g.dispose();
        return;
      }
      if (!by.has(o.material)) by.set(o.material, []);
      by.get(o.material).push(g);
    });
    for (const o of kill) {
      o.parent.remove(o);
      o.geometry.dispose();
    }
    for (const [mat, gs] of by) {
      const me = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(gs), mat);
      me.receiveShadow = true;
      me.castShadow = false;
      root.add(me);
      for (const g of gs) g.dispose();
    }
  }
  // ---- the dashboard: a normal profile, and in front of the driver a recess with the cluster's face under a hood ----
  function dashboard(st, A) {
    const M = MAT,
      d = A.dash,
      f = d.face,
      t = d.top,
      W = d.x,
      wx = A.wheel.c[0];
    const normal = [
      [d.ws + 0.06, A.floor + 0.12],
      [f + 0.13, A.floor + 0.11],
      [f + 0.04, A.floor + 0.15],
      [f + 0.005, A.floor + 0.23],
      [f - 0.002, t - 0.16],
      [f + 0.01, t - 0.08],
      [f + 0.05, t - 0.03],
      [f + 0.13, t - 0.008],
      [f + 0.25, t],
      [d.ws + 0.02, t + 0.002],
      [d.ws + 0.06, t - 0.02],
    ];
    // in front of the driver: the shelf under the cluster, its back wall, the hood over it with a soft lip
    const recess = [
      [d.ws + 0.06, A.floor + 0.12],
      [f + 0.13, A.floor + 0.11],
      [f + 0.04, A.floor + 0.15],
      [f + 0.005, A.floor + 0.23],
      [f - 0.002, t - 0.19],
      [f + 0.02, t - 0.158],
      [f + 0.12, t - 0.152],
      [f + 0.175, t - 0.13],
      [f + 0.19, t - 0.03],
      [f + 0.12, t - 0.012],
      [f + 0.045, t - 0.012],
      [f + 0.022, t + 0.002],
      [f + 0.05, t + 0.024],
      [f + 0.15, t + 0.03],
      [f + 0.28, t + 0.01],
      [d.ws + 0.02, t + 0.002],
      [d.ws + 0.06, t - 0.02],
    ];
    const x0 = wx - 0.22,
      x1 = wx + 0.22;
    put(st, ext(normal, -W, x0), M.pad);
    put(st, ext(recess, x0, x1), M.pad);
    put(st, ext(normal, x1, W), M.pad);
    // a softer seam along the face: the lower dashboard in the harder plastic (knee bolster, glovebox line)
    put(st, rb(W * 2 - 0.08, 0.03, 0.2, 0.012), M.hard, 0, f + 0.012, A.floor + 0.25);
    put(st, rb(0.42, 0.012, 0.15, 0.01), M.hard, 0.37, f - 0.006, t - 0.24);
    // the cluster's cave: side cheeks under the hood
    for (const sx of [x0 + 0.012, x1 - 0.012]) put(st, rb(0.024, 0.2, 0.14, 0.008), M.pad, sx, f + 0.1, t - 0.085);
    return { x0, x1 };
  }
  // ---- the cluster: a face (canvas texture, drawn by vehicles/cockpit_cluster.js), needles on pivots, two arrows, chrome rings ----
  function cluster(st, mov, A, face) {
    const M = MAT,
      d = A.dash,
      t = d.top,
      y = d.face + 0.15,
      z = t - 0.095,
      tilt = 0.26;
    const g = new THREE.Group();
    g.position.copy(V(A.wheel.c[0], y, z));
    g.rotation.set(-tilt, 0, 0);
    mov.add(g);
    const W = face.w,
      H = face.h;
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(W, H), face.mat);
    g.add(fm);
    // needles: speed and revs (long), fuel and temperature (short), each on a pivot in the face's plane (x right, y up, z to the eye)
    const needle = (len, tail, w0, w1) => {
      const s = new THREE.Shape();
      s.moveTo(-tail, -w0 / 2);
      s.lineTo(len, -w1 / 2);
      s.lineTo(len + w1, 0);
      s.lineTo(len, w1 / 2);
      s.lineTo(-tail, w0 / 2);
      s.closePath();
      return new THREE.ShapeGeometry(s);
    };
    const piv = (x, yy, geo) => {
      const p = new THREE.Group();
      p.position.set(x, yy, 0.0035);
      g.add(p);
      const n = new THREE.Mesh(geo, M.needle);
      p.add(n);
      return p;
    };
    const D = face.dial,
      big = needle(D.r * 0.86, D.r * 0.2, 0.0042, 0.0013),
      small = needle(D.r * 0.32, D.r * 0.06, 0.0026, 0.001);
    const parts = {
      face: fm,
      group: g,
      rpm: piv(D.L[0], D.L[1], big),
      spd: piv(D.R[0], D.R[1], big),
      temp: piv(D.L[0], D.L[1] - D.r * 0.5, small),
      fuel: piv(D.R[0], D.R[1] - D.r * 0.5, small),
    };
    // hub caps over the needles and the chrome rings round the dials (static, merged)
    const cap = new THREE.CylinderGeometry(D.r * 0.13, D.r * 0.15, 0.006, 20);
    cap.rotateX(Math.PI / 2);
    const ring = new THREE.TorusGeometry(D.r * 1.03, 0.0022, 6, 48);
    const sg = new THREE.Group();
    sg.position.copy(g.position);
    sg.rotation.copy(g.rotation);
    st.add(sg);
    for (const c of [D.L, D.R]) {
      const m = new THREE.Mesh(cap, M.black);
      m.position.set(c[0], c[1], 0.006);
      sg.add(m);
      const r = new THREE.Mesh(ring, M.satin);
      r.position.set(c[0], c[1], 0.003);
      sg.add(r);
    }
    // the indicator arrows (green, shown while blinking), top middle of the face
    const arrow = dir => {
      const s = new THREE.Shape(),
        a = 0.011;
      s.moveTo(dir * a, 0);
      s.lineTo(0, a * 0.8);
      s.lineTo(0, a * 0.32);
      s.lineTo(-dir * a * 0.8, a * 0.32);
      s.lineTo(-dir * a * 0.8, -a * 0.32);
      s.lineTo(0, -a * 0.32);
      s.lineTo(0, -a * 0.8);
      s.closePath();
      const m = new THREE.Mesh(new THREE.ShapeGeometry(s), M.arrow);
      m.position.set(dir * 0.026, H / 2 - 0.016, 0.003);
      m.visible = false;
      g.add(m);
      return m;
    };
    parts.arL = arrow(-1);
    parts.arR = arrow(1);
    return parts;
  }
  // ---- the steering wheel: a leather rim (slightly oval), three spokes, the airbag pad; column shroud and stalks (they do not turn) ----
  function wheel(mov, st, A) {
    const M = MAT,
      W = A.wheel,
      R = W.r;
    const base = new THREE.Group();
    base.position.copy(V(W.c[0], W.c[1], W.c[2]));
    base.rotation.set(-W.tilt, 0, 0); // the top towards the windscreen; local z points at the driver, the column runs along −z
    mov.add(base);
    const spin = new THREE.Group();
    base.add(spin);
    const rim = new THREE.TorusGeometry(R, 0.0165, 12, 64);
    rim.scale(1, 1, 1.22);
    spin.add(new THREE.Mesh(rim, M.leather));
    // spokes: left, right, lower – dished towards the hub, which sits a little ahead of the rim's plane
    const sp = [];
    for (const a of [0, Math.PI, -Math.PI / 2]) {
      const len = R - 0.05,
        m = new THREE.Mesh(new RoundedBoxGeometry(len, a === -Math.PI / 2 ? 0.05 : 0.042, 0.016, 2, 0.006), M.hard);
      m.position.set(Math.cos(a) * (0.05 + len / 2), Math.sin(a) * (0.05 + len / 2), -0.016);
      m.rotation.z = a;
      m.rotateY(-0.18);
      sp.push(m);
      spin.add(m);
    }
    const pad = new THREE.Mesh(new RoundedBoxGeometry(0.125, 0.1, 0.05, 3, 0.02), M.hard);
    pad.position.set(0, 0.006, -0.03);
    spin.add(pad);
    const seam = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.004, 0.004, 1, 0.0015), M.satin);
    seam.position.set(0, -0.022, -0.004);
    spin.add(seam);
    // the column shroud into the dashboard and the stalks on it (left: indicators and lights, right: wipers)
    const col = new THREE.Mesh(new RoundedBoxGeometry(0.085, 0.082, 0.24, 2, 0.025), M.hard);
    col.position.set(0, -0.006, -0.17);
    base.add(col);
    const stalk = side => {
      const p = new THREE.Group();
      p.position.set(side * 0.04, 0.012, -0.075);
      base.add(p);
      const c = new THREE.CylinderGeometry(0.0055, 0.0075, 0.13, 10);
      c.rotateZ(Math.PI / 2);
      c.translate(side * 0.065, 0, 0);
      p.add(new THREE.Mesh(c, M.hard));
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.0085, 0.0085, 0.03, 12), M.hard);
      tip.rotation.z = Math.PI / 2;
      tip.position.set(side * 0.135, 0, 0);
      p.add(tip);
      p.rotation.y = side * -0.18;
      return p;
    };
    return { base, spin, stalkL: stalk(-1), stalkR: stalk(1) };
  }
  // ---- centre stack, console, selector lever, handbrake, vents, climate knobs, the navi's bezel and screen ----
  function centre(st, mov, A, navi) {
    const M = MAT,
      d = A.dash,
      f = d.face,
      t = d.top,
      fl = A.floor;
    // the stack: a panel standing out of the face from the navi down to the console
    put(st, rb(0.27, 0.06, 0.4, 0.02), M.hard, 0, f - 0.018, t - 0.29);
    // navi: a gloss bezel, the screen a little in front of it, tipped back
    const nz = t - 0.125,
      ny = f - 0.046,
      nt = 0.2;
    put(st, rb(0.235, 0.024, 0.145, 0.012), M.gloss, 0, ny, nz, -nt);
    const nf = new THREE.Group();
    nf.position.copy(V(0, ny, nz));
    nf.rotation.set(-nt, 0, 0);
    mov.add(nf);
    const sc = new THREE.Mesh(new THREE.PlaneGeometry(navi.w, navi.h), navi.mat);
    sc.position.z = 0.0125;
    nf.add(sc);
    // centre vents: gloss frames, satin slats
    for (const sx of [-1, 1]) {
      put(st, rb(0.085, 0.02, 0.05, 0.01), M.gloss, sx * 0.055, f - 0.052, t - 0.255);
      for (let k = 0; k < 3; k++)
        put(st, rb(0.07, 0.006, 0.004, 0.0015), M.satin, sx * 0.055, f - 0.064, t - 0.27 + k * 0.014);
    }
    // the hazard switch between them, climate knobs below
    put(st, rb(0.022, 0.012, 0.022, 0.004), M.gloss, 0, f - 0.055, t - 0.255);
    for (const x of [-0.075, 0, 0.075]) {
      const k = new THREE.CylinderGeometry(0.019, 0.02, 0.022, 24);
      k.rotateX(Math.PI / 2);
      put(st, k, M.hard, x, f - 0.06, t - 0.345);
      const r = new THREE.TorusGeometry(0.0195, 0.0016, 6, 32);
      put(st, r, M.satin, x, f - 0.072, t - 0.345);
    }
    // the console between the seats: from the stack back to the armrest, the selector's gate, the handbrake's boot
    put(st, rb(0.23, 0.95, 0.15, 0.03), M.hard, 0, f - 0.5, fl + 0.075);
    put(st, rb(0.25, 0.32, 0.08, 0.03), M.leather, 0, f - 0.83, fl + 0.19);
    put(st, rb(0.09, 0.16, 0.012, 0.006), M.gloss, 0, f - 0.32, fl + 0.152);
    put(st, rb(0.012, 0.11, 0.004, 0.002), M.satin, 0.02, f - 0.32, fl + 0.159);
    // the selector lever (P R N D): a pivot in the gate, a shaft and a leather knob
    const lever = new THREE.Group();
    lever.position.copy(V(0, f - 0.32, fl + 0.155));
    mov.add(lever);
    {
      const sh = new THREE.CylinderGeometry(0.008, 0.011, 0.09, 12);
      sh.translate(0, 0.045, 0);
      lever.add(new THREE.Mesh(sh, M.metal));
      const kn = new THREE.Mesh(new RoundedBoxGeometry(0.042, 0.06, 0.065, 3, 0.019), M.leather);
      kn.position.set(0, 0.105, 0.004);
      lever.add(kn);
      const bt = new THREE.Mesh(new RoundedBoxGeometry(0.012, 0.006, 0.02, 1, 0.002), M.satin);
      bt.position.set(-0.022, 0.118, 0);
      lever.add(bt);
    }
    // the handbrake: a lever in a boot behind the selector
    const hand = new THREE.Group();
    hand.position.copy(V(0, f - 0.62, fl + 0.152));
    mov.add(hand);
    {
      const l = new THREE.Mesh(new RoundedBoxGeometry(0.035, 0.03, 0.24, 2, 0.012), M.leather);
      l.position.set(0, 0.015, 0.11);
      hand.add(l);
      const b = new THREE.Mesh(new RoundedBoxGeometry(0.014, 0.012, 0.02, 1, 0.004), M.satin);
      b.position.set(0, 0.03, 0.23);
      hand.add(b);
    }
    return { lever, hand, screen: sc };
  }
  // ---- seats (driver and passenger): cushion and back with side bolsters, headrest on two posts, rails ----
  function seats(st, A) {
    const M = MAT,
      h = A.hp,
      fl = A.floor,
      rec = 0.38; // the back reclined about 22°
    for (const sx of [-1, 1]) {
      const x = sx * Math.abs(h[0]),
        y = h[1],
        z = h[2];
      // cushion, a little higher at the front, and its bolsters
      put(st, rb(0.48, 0.5, 0.1, 0.035, 3), M.fabric, x, y + 0.12, z - 0.1, 0.14);
      for (const s2 of [-1, 1])
        put(st, rb(0.07, 0.44, 0.07, 0.03, 3), M.fabric, x + s2 * 0.215, y + 0.1, z - 0.045, 0.14);
      // back: the middle and the bolsters, reclined
      const by = y - 0.2 - Math.sin(rec) * 0.3,
        bz = z + 0.28;
      put(st, rb(0.44, 0.1, 0.62, 0.04, 3), M.fabric, x, by, bz, rec);
      for (const s2 of [-1, 1])
        put(st, rb(0.075, 0.14, 0.52, 0.035, 3), M.fabric, x + s2 * 0.215, by + 0.03, bz - 0.03, rec, s2 * 0.12);
      // headrest
      const hy = by - Math.sin(rec) * 0.38,
        hz = bz + 0.36;
      put(st, rb(0.27, 0.1, 0.17, 0.04, 3), M.fabric, x, hy + 0.03, hz + 0.06, -0.12);
      for (const s2 of [-1, 1]) {
        const c = new THREE.CylinderGeometry(0.0055, 0.0055, 0.12, 8);
        put(st, c, M.satin, x + s2 * 0.075, hy - 0.005, hz - 0.03, rec);
      }
      // rails and the frame under the cushion
      for (const s2 of [-1, 1]) put(st, rb(0.03, 0.55, 0.03, 0.008), M.metal, x + s2 * 0.19, y + 0.08, fl + 0.02);
      put(
        st,
        rb(0.4, 0.4, Math.max(0.03, z - 0.15 - fl - 0.03), 0.02),
        M.black,
        x,
        y + 0.1,
        (z - 0.15 + fl + 0.03) / 2
      );
    }
  }
  // ---- door panels, A-pillar trims, sun visors, the interior mirror's housing, the door mirror heads ----
  function trims(st, mov, A) {
    const M = MAT,
      dx = A.door,
      w = A.ws;
    for (const sx of [-1, 1]) {
      const x = sx * (dx - 0.012);
      // armrest with the pull handle and the window switches, the inner handle, the speaker
      put(st, rb(0.075, 0.42, 0.05, 0.02, 3), M.leather, x - sx * 0.02, 0.05, 0.69);
      put(st, rb(0.03, 0.14, 0.05, 0.012), M.hard, x - sx * 0.035, 0.12, 0.735);
      put(st, rb(0.05, 0.09, 0.012, 0.005), M.gloss, x - sx * 0.035, 0.2, 0.718);
      put(st, rb(0.02, 0.08, 0.03, 0.008), M.satin, x - sx * 0.008, 0.36, 0.81);
      put(st, rb(0.03, 0.14, 0.06, 0.02), M.hard, x - sx * 0.006, 0.37, 0.81);
      const spk = new THREE.CylinderGeometry(0.075, 0.075, 0.01, 28);
      spk.rotateZ(Math.PI / 2);
      put(st, spk, M.black, x - sx * 0.004, 0.36, A.floor + 0.12);
      put(st, rb(0.03, 0.62, 0.36, 0.03), M.hard, x + sx * 0.004, 0.1, A.floor + 0.19);
      // A-pillar trim inside the body's pillar
      strut(
        st,
        [sx * (w.w0 - 0.035), w.y0 - 0.03, w.z0 + 0.015],
        [sx * (w.w1 - 0.03), w.y1 - 0.015, w.z1 - 0.035],
        0.065,
        0.03,
        M.liner,
        0.012
      );
      // sun visor folded up under the headliner
      put(st, rb(0.36, 0.15, 0.024, 0.01, 3), M.liner, sx * 0.34, w.y1 - 0.1, A.roof - 0.025, 0.08);
      put(st, rb(0.02, 0.02, 0.03, 0.005), M.hard, sx * 0.53, w.y1 - 0.06, A.roof - 0.012);
    }
    // interior mirror: a stem from the glass, a housing (its glass is the mirrors' module's)
    const mi = A.mirI;
    strut(st, [mi[0], mi[1] + 0.03, mi[2] + 0.06], [mi[0], mi[1] + 0.012, mi[2] + 0.01], 0.022, 0.016, M.hard, 0.006);
    put(st, rb(0.25, 0.034, 0.07, 0.016, 3), M.black, mi[0], mi[1] + 0.012, mi[2], 0.05, -0.2);
    // door mirror heads (black housings) round the body's small ones
    for (const p of [A.mirL, A.mirR]) put(st, rb(0.21, 0.14, 0.15, 0.045, 3), M.black, p[0], p[1], p[2]);
  }
  // ---- pedals (brake and accelerator, automatic gearbox) ----
  function pedals(mov, A) {
    const M = MAT,
      x = A.wheel.c[0],
      fl = A.floor;
    const mk = (px, w, h, armL) => {
      const p = new THREE.Group();
      p.position.copy(V(px, A.dash.face + 0.2, fl + 0.32));
      mov.add(p);
      const arm = new THREE.Mesh(new RoundedBoxGeometry(0.012, armL, 0.015, 1, 0.004), M.metal);
      arm.position.set(0, -armL / 2, 0);
      p.add(arm);
      const pad = new THREE.Mesh(new RoundedBoxGeometry(w, h, 0.02, 2, 0.006), M.rubber);
      pad.position.set(0, -armL, 0.008);
      pad.rotation.x = -0.35;
      p.add(pad);
      return p;
    };
    return { brk: mk(x - 0.03, 0.085, 0.065, 0.2), gas: mk(x + 0.13, 0.05, 0.11, 0.22) };
  }
  // ---- the light switch: a knob left of the wheel (0 – AUTO – low beam) ----
  function lightKnob(mov, A) {
    const M = MAT,
      p = new THREE.Group();
    p.position.copy(V(A.wheel.c[0] - 0.29, A.dash.face - 0.004, A.dash.top - 0.235));
    mov.add(p);
    const k = new THREE.CylinderGeometry(0.024, 0.026, 0.02, 24);
    k.rotateX(Math.PI / 2);
    k.translate(0, 0, 0.01);
    p.add(new THREE.Mesh(k, M.hard));
    const mark = new THREE.Mesh(new RoundedBoxGeometry(0.004, 0.018, 0.004, 1, 0.0015), M.satin);
    mark.position.set(0, 0.012, 0.021);
    p.add(mark);
    return p;
  }
  // ---- wipers: two arms on the outside of the windscreen, pivoting in its plane; the drops inside it ----
  function wipers(mov, A) {
    const M = MAT,
      w = A.ws,
      dy = w.y0 - w.y1,
      dz = w.z1 - w.z0,
      L = Math.hypot(dy, dz),
      ang = Math.atan2(dy, dz); // the screen's plane: local y up the slope, local z into the car
    const plane = new THREE.Group();
    plane.position.copy(V(0, w.y0 + 0.02, w.z0 - 0.01));
    plane.rotation.set(ang, 0, 0);
    mov.add(plane);
    const arms = [];
    for (const [px, len] of [
      [-0.3, 0.6],
      [0.32, 0.5],
    ]) {
      const p = new THREE.Group();
      p.position.set(px, 0.025, -0.018);
      plane.add(p);
      const arm = new THREE.Mesh(new RoundedBoxGeometry(len * 0.62, 0.012, 0.01, 1, 0.003), M.black);
      arm.position.set(len * 0.31, 0, 0);
      p.add(arm);
      const blade = new THREE.Mesh(new RoundedBoxGeometry(len, 0.01, 0.014, 1, 0.003), M.rubber);
      blade.position.set(len * 0.52, 0.012, -0.004);
      p.add(blade);
      const cap = new THREE.CylinderGeometry(0.014, 0.016, 0.02, 12);
      cap.rotateX(Math.PI / 2);
      p.add(new THREE.Mesh(cap, M.black));
      arms.push(p);
    }
    // the drops: a thin trapezoid just inside the glass (narrower at the top, like the windscreen)
    const geo = new THREE.BufferGeometry(),
      a = w.w0 - 0.05,
      b = w.w1 - 0.05,
      h = L - 0.06;
    geo.setAttribute(
      'position',
      new THREE.Float32BufferAttribute([-a, 0.02, 0.012, a, 0.02, 0.012, b, h, 0.012, -b, h, 0.012], 3)
    );
    geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 2.2, 0, 1.9, 1.5, 0.3, 1.5], 2));
    geo.setIndex([0, 1, 2, 0, 2, 3]);
    geo.computeVertexNormals();
    const drops = new THREE.Mesh(geo, M.drops);
    drops.renderOrder = 3;
    drops.visible = false;
    plane.add(drops);
    return { plane, arms, drops };
  }
  // ---- everything: a group for the body (static merged, moving apart) and the parts the cockpit animates ----
  function build(A, face, navi) {
    mats();
    const root = new THREE.Group(),
      st = new THREE.Group(),
      mov = new THREE.Group();
    root.name = 'cockpit';
    root.add(st, mov);
    dashboard(st, A);
    const cl = cluster(st, mov, A, face);
    const wh = wheel(mov, st, A);
    const ce = centre(st, mov, A, navi);
    seats(st, A);
    trims(st, mov, A);
    const pe = pedals(mov, A);
    const lk = lightKnob(mov, A);
    const wi = wipers(mov, A);
    merge(st);
    // what moves: each moving part merged in itself (one draw call per material and part)
    for (const g of [wh.spin, wh.stalkL, wh.stalkR, ce.lever, ce.hand, pe.brk, pe.gas, lk, ...wi.arms]) merge(g);
    mov.traverse(o => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = !(o.material && o.material.isMeshBasicMaterial);
      }
    });
    return { root, st, mov, cl, wh, ce, pe, lk, wi };
  }
  // ---- the tractor's cab: its own wheel (thin rim, three metal spokes, a spinner knob) that turns, a pod with the gauges on the column,
  // the arrows; the hands as in the car (the body's static wheel is hidden by the cockpit) ----
  function tractor(A, face) {
    mats();
    const M = MAT,
      root = new THREE.Group(),
      st = new THREE.Group(),
      mov = new THREE.Group();
    root.name = 'cockpit';
    root.add(st, mov);
    const W = A.wheel,
      R = W.r;
    const base = new THREE.Group();
    base.position.copy(V(W.c[0], W.c[1], W.c[2]));
    base.rotation.set(-W.tilt, 0, 0);
    mov.add(base);
    const spin = new THREE.Group();
    base.add(spin);
    spin.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.0145, 10, 56), M.hard));
    for (const a of [Math.PI / 2, (7 * Math.PI) / 6, (11 * Math.PI) / 6]) {
      const len = R - 0.035,
        m = new THREE.Mesh(new RoundedBoxGeometry(len, 0.02, 0.008, 1, 0.003), M.metal);
      m.position.set(Math.cos(a) * (0.035 + len / 2), Math.sin(a) * (0.035 + len / 2), -0.02);
      m.rotation.z = a;
      m.rotateY(-0.2);
      spin.add(m);
    }
    const cap = new THREE.CylinderGeometry(0.045, 0.05, 0.035, 20);
    cap.rotateX(Math.PI / 2);
    const cm = new THREE.Mesh(cap, M.hard);
    cm.position.z = -0.03;
    spin.add(cm);
    // the spinner knob on the rim (at eight o'clock), standing towards the driver
    const kn = new THREE.CylinderGeometry(0.014, 0.016, 0.06, 14);
    kn.rotateX(Math.PI / 2);
    const km = new THREE.Mesh(kn, M.leather);
    km.position.set(Math.cos((7 * Math.PI) / 6) * R, Math.sin((7 * Math.PI) / 6) * R, 0.03);
    spin.add(km);
    // the column down into the floor
    const col = new THREE.Mesh(new RoundedBoxGeometry(0.07, 0.07, 0.36, 2, 0.02), M.hard);
    col.position.set(0, 0, -0.22);
    base.add(col);
    // the pod: a soft box, the face on its back turned to the eye
    const pod = new THREE.Group();
    pod.position.copy(V(A.pod[0], A.pod[1], A.pod[2]));
    const e = V(A.eye[0], A.eye[1], A.eye[2]).sub(pod.position);
    pod.rotation.set(-Math.atan2(e.y, e.z), 0, 0);
    st.add(pod);
    const box = new THREE.Mesh(new RoundedBoxGeometry(face.w + 0.03, face.h + 0.03, 0.07, 3, 0.02), M.hard);
    box.position.z = -0.036;
    pod.add(box);
    // its stem down to the column
    strut(
      st,
      [A.pod[0], A.pod[1] + 0.02, A.pod[2] - 0.03],
      [W.c[0], W.c[1] + 0.12, W.c[2] - 0.05],
      0.07,
      0.06,
      M.hard,
      0.02
    );
    const fg = new THREE.Group();
    fg.position.copy(pod.position);
    fg.rotation.copy(pod.rotation);
    mov.add(fg);
    const fm = new THREE.Mesh(new THREE.PlaneGeometry(face.w, face.h), face.mat);
    fm.position.z = 0.0005;
    fg.add(fm);
    const nd = new THREE.Shape(),
      L = face.dial.r * 0.86;
    nd.moveTo(-L * 0.2, -0.0018);
    nd.lineTo(L, -0.0006);
    nd.lineTo(L, 0.0006);
    nd.lineTo(-L * 0.2, 0.0018);
    nd.closePath();
    const rpm = new THREE.Group();
    rpm.position.set(face.dial.c[0], face.dial.c[1], 0.003);
    fg.add(rpm);
    rpm.add(new THREE.Mesh(new THREE.ShapeGeometry(nd), M.needle));
    const arrow = dir => {
      const sh = new THREE.Shape(),
        a = 0.007;
      sh.moveTo(dir * a, 0);
      sh.lineTo(0, a * 0.8);
      sh.lineTo(0, a * 0.32);
      sh.lineTo(-dir * a * 0.8, a * 0.32);
      sh.lineTo(-dir * a * 0.8, -a * 0.32);
      sh.lineTo(0, -a * 0.32);
      sh.lineTo(0, -a * 0.8);
      sh.closePath();
      const m = new THREE.Mesh(new THREE.ShapeGeometry(sh), M.arrow);
      m.position.set(0.022 + dir * 0.012, face.h / 2 - 0.009, 0.002);
      m.visible = false;
      fg.add(m);
      return m;
    };
    const arL = arrow(-1),
      arR = arrow(1);
    merge(st);
    merge(spin);
    mov.traverse(o => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = !(o.material && o.material.isMeshBasicMaterial);
      }
    });
    return { root, st, mov, wh: { base, spin }, cl: { face: fm, rpm, arL, arR } };
  }
  return { anchors, build, tractor, mats, CAR, TRACTOR, BAD };
})();
