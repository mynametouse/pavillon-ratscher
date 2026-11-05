// ===================== feat/zombie: the weapons as models (ZWMOD) – a Doppelflinte that breaks open, a chainsaw, axes, spade, fork, scythe =====================
// Built from simple shapes but at true size (Falko 5.11.2026: „Die First Person Ansicht muss samt des Tragens der Waffe … realistischer
// aussehen“): every model has its handle (or the gun's axis) along +y from y = 0 (the lower end, the butt), the head or the muzzle at the
// top, +x the edge (axes) or the right side, +z the top of the gun and the saw. The parts of one material are merged into one mesh (a model is
// 3–5 draw calls); the moving parts stay apart: the gun's barrels with the fore-end turn on the hinge pin (group 'lauf', rotation.x < 0
// opens it), its two shells in the chambers ('patrone0' right, 'patrone1' left); the chain of the saw ('kette').
// All materials are plain MeshStandardMaterials (core/assets.js plain): the same shader program as every other thing in the hand.
// HANDS: where the hands hold each weapon in first person (zombie/z_fp.js): a point on the handle, the direction of the index finger along
// it, the fingers' pose (zombie/z_fp.js HPOSE: grip, trigger, cradle …); GRIP: where the figure's hand holds it in third person (game/avatar.js: at · len from the lower end); LIE: how it lies on the ground.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { plain } from '../core/assets.js';
export const ZWMOD = (() => {
  let MT = null;
  const mats = () =>
    MT ||
    (MT = {
      wood: plain({ color: 0x8a6a45, roughness: 0.75 }),
      ash: plain({ color: 0xa5835a, roughness: 0.62 }),
      dark: plain({ color: 0x4d3b2a, roughness: 0.7 }),
      steel: plain({ color: 0x9a9fa2, roughness: 0.32, metalness: 0.85 }),
      worn: plain({ color: 0x75797b, roughness: 0.55, metalness: 0.7 }),
      rust: plain({ color: 0x6d4a35, roughness: 0.8, metalness: 0.3 }),
      black: plain({ color: 0x1c1c1c, roughness: 0.55 }),
      rubber: plain({ color: 0x151515, roughness: 0.9 }),
      orange: plain({ color: 0xd8641c, roughness: 0.45 }),
      grey: plain({ color: 0x5b5f61, roughness: 0.5 }),
      walnut: plain({ color: 0x5a3820, roughness: 0.42 }),
      blued: plain({ color: 0x23272b, roughness: 0.3, metalness: 0.7 }),
      case: plain({ color: 0x7d7a73, roughness: 0.3, metalness: 0.85 }),
      paint: plain({ color: 0x2b2d2f, roughness: 0.6, metalness: 0.3 }),
      brass: plain({ color: 0xb8925a, roughness: 0.3, metalness: 0.9 }),
      hull: plain({ color: 0x9f2219, roughness: 0.5 }),
      card: plain({ color: 0x8c2a1c, roughness: 0.85 }),
      label: plain({ color: 0xe8dcc0, roughness: 0.85 }),
    });
  // ---- a part list per material, merged into one mesh each ----
  const _m = new THREE.Matrix4(),
    _q = new THREE.Quaternion(),
    _e = new THREE.Euler(),
    _p = new THREE.Vector3(),
    _s = new THREE.Vector3();
  function kit() {
    const by = new Map();
    const K = {
      add(m, g, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
        g = g.index ? g.toNonIndexed() : g;
        for (const n of Object.keys(g.attributes))
          if (n !== 'position' && n !== 'normal' && n !== 'uv') g.deleteAttribute(n);
        if (!g.attributes.uv)
          g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
        _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
        g.applyMatrix4(_m);
        let l = by.get(m);
        if (!l) by.set(m, (l = []));
        l.push(g);
        return K;
      },
      build(into, name) {
        for (const [m, l] of by) {
          const me = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(l, false), m);
          me.castShadow = true;
          if (name) me.name = name;
          into.add(me);
        }
        by.clear();
        return into;
      },
    };
    return K;
  }
  const rbox = (w, h, d, r = 0.004) => new RoundedBoxGeometry(w, h, d, 2, Math.min(r, Math.min(w, h, d) * 0.45));
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);
  const cyl = (r0, r1, len, seg = 10) => new THREE.CylinderGeometry(r1, r0, len, seg); // r0 at the lower end (−y), r1 at the upper
  const tube = (pts, r, seg = 16, rad = 8) =>
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg, r, rad, false);
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  // a side profile (u along the model's y, v along its z) extruded across x, centred
  const PROF = new THREE.Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);
  function sideways(shape, depth, bevel = 0) {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 2,
      curveSegments: 8,
    });
    g.translate(0, 0, -depth / 2);
    g.applyMatrix4(PROF);
    return g;
  }
  // a flat profile in the model's x–y plane extruded along z (axe heads, the spade's blade), centred
  function flat(shape, depth, bevel = 0) {
    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: bevel > 0,
      bevelSize: bevel,
      bevelThickness: bevel,
      bevelSegments: 1,
      curveSegments: 8,
    });
    g.translate(0, 0, -depth / 2);
    return g;
  }
  const shape = (pts, close = true) => {
    const s = new THREE.Shape();
    s.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) {
      const p = pts[i];
      if (p.length === 4) s.quadraticCurveTo(p[0], p[1], p[2], p[3]);
      else s.lineTo(p[0], p[1]);
    }
    if (close) s.closePath();
    return s;
  };
  // squeeze the z of a geometry by f(x, y) (wedges: thick at the eye, thin at the edge)
  function taper(g, f, axis = 'z') {
    const a = g.attributes.position;
    for (let i = 0; i < a.count; i++) {
      const k = f(a.getX(i), a.getY(i), a.getZ(i));
      if (axis === 'z') a.setZ(i, a.getZ(i) * k);
      else a.setX(i, a.getX(i) * k);
    }
    a.needsUpdate = true;
    g.computeVertexNormals();
    return g;
  }
  const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
  // ---- a 12-bore shell: brass head and red hull, along +y from its base (y = 0) ----
  function shell(M) {
    const g = new THREE.Group();
    kit()
      .add(M.brass, cyl(0.0112, 0.0112, 0.004, 12), 0, 0.002, 0)
      .add(M.brass, cyl(0.0104, 0.0104, 0.013, 12), 0, 0.0105, 0)
      .add(M.hull, cyl(0.0102, 0.0099, 0.05, 12), 0, 0.042, 0)
      .build(g);
    return g;
  }
  const MODELS = {
    // ---- Doppelflinte, side by side, 12/70: butt at y 0, muzzles at y 1.095, the barrels' axis at z 0 ----
    flinte: M => {
      const g = new THREE.Group(),
        K = kit();
      // the stock: an English straight grip in walnut, narrower at the wrist; a black rubber butt pad
      const st = sideways(
        shape([
          [0.36, 0.011],
          [0.33, 0.006],
          [0.26, -0.004, 0.2, -0.016],
          [0.012, -0.05],
          [0.004, -0.118, 0.012, -0.184],
          [0.12, -0.15, 0.22, -0.072],
          [0.3, -0.04, 0.36, -0.031],
        ]),
        0.026,
        0.006
      );
      taper(st, (x, y) => (y > 0.3 ? 0.82 + (y - 0.3) * 2.2 : 1.05 - (y / 0.3) * 0.23), 'x');
      K.add(M.walnut, st);
      K.add(M.rubber, rbox(0.04, 0.012, 0.142, 0.005), 0, 0.004, -0.117);
      // the action (case hardened), the fences behind the barrels, the top strap, the top lever, the safety
      K.add(M.case, rbox(0.044, 0.096, 0.041, 0.006), 0, 0.408, -0.0105);
      for (const s of [-1, 1])
        K.add(M.case, new THREE.SphereGeometry(0.0118, 12, 8), s * 0.0105, 0.383, 0.0, 0, 0, 0, 1, 0.7, 1);
      K.add(M.case, rbox(0.016, 0.07, 0.006, 0.0025), 0, 0.33, 0.009);
      K.add(M.blued, rbox(0.011, 0.042, 0.006, 0.002), 0.004, 0.348, 0.016, 0, 0, -0.18);
      K.add(M.blued, rbox(0.008, 0.012, 0.004, 0.0015), 0, 0.318, 0.013);
      // trigger guard and the two triggers
      K.add(
        M.blued,
        tube(
          [V3(0, 0.318, -0.034), V3(0, 0.335, -0.062), V3(0, 0.372, -0.07), V3(0, 0.405, -0.058), V3(0, 0.418, -0.033)],
          0.0028,
          14,
          6
        ),
        0,
        0,
        0,
        0,
        0,
        0,
        1.4,
        1,
        1
      );
      for (const [y, l] of [
        [0.364, 0.024],
        [0.384, 0.022],
      ])
        K.add(M.blued, rbox(0.006, 0.006, l, 0.002), 0, y, -0.031 - l / 2, -0.25);
      K.build(g);
      // the barrels with the fore-end: turn about the hinge pin (y 0.455, z −0.022)
      const lauf = new THREE.Group();
      lauf.name = 'lauf';
      lauf.position.set(0, 0.455, -0.022);
      g.add(lauf);
      const L = kit(),
        hy = -0.455,
        hz = 0.022; // model coordinates → the group's
      for (const s of [-1, 1]) {
        L.add(M.blued, cyl(0.0113, 0.0099, 0.71, 14), s * 0.0106, 0.74 + hy, 0 + hz);
        L.add(M.black, new THREE.CircleGeometry(0.0091, 12), s * 0.0106, 1.0952 + hy, hz, -Math.PI / 2);
        L.add(M.black, new THREE.CircleGeometry(0.0094, 12), s * 0.0106, 0.3848 + hy, hz, Math.PI / 2);
      }
      L.add(M.blued, box(0.007, 0.705, 0.005), 0, 0.738 + hy, 0.0098 + hz);
      L.add(M.blued, box(0.006, 0.62, 0.005), 0, 0.7 + hy, -0.0098 + hz);
      L.add(M.brass, new THREE.SphereGeometry(0.0022, 8, 6), 0, 1.088 + hy, 0.0135 + hz);
      L.add(M.blued, rbox(0.017, 0.07, 0.014, 0.003), 0, 0.42 + hy, -0.016 + hz); // the lumps under the breech
      // the fore-end: walnut, its iron at the back
      L.add(M.walnut, rbox(0.04, 0.236, 0.024, 0.009), 0, 0.582 + hy, -0.021 + hz);
      L.add(M.case, rbox(0.037, 0.032, 0.022, 0.006), 0, 0.472 + hy, -0.02 + hz);
      L.build(lauf);
      // two shells in the chambers (hidden while closed – only their heads show at the breech when it is open)
      for (const s of [0, 1]) {
        const p = shell(M);
        p.name = 'patrone' + s;
        p.position.set((s ? -1 : 1) * 0.0106, 0.3852 + hy, hz);
        lauf.add(p);
      }
      return g;
    },
    // ---- chainsaw (a 45 cc farm saw): rear handle at y 0, the bar to y 0.8 on the right side, +z up ----
    motorsaege: M => {
      const g = new THREE.Group(),
        K = kit();
      K.add(M.black, rbox(0.032, 0.16, 0.032, 0.01), 0, 0.075, 0.128); // rear handle
      K.add(M.black, rbox(0.03, 0.032, 0.14, 0.01), 0, 0.004, 0.068);
      K.add(M.black, rbox(0.03, 0.03, 0.08, 0.01), 0, 0.15, 0.1);
      K.add(M.orange, rbox(0.012, 0.032, 0.022, 0.004), 0, 0.11, 0.104); // throttle trigger
      K.add(M.grey, rbox(0.19, 0.29, 0.135, 0.028), 0, 0.265, 0.024); // crankcase and tank
      K.add(M.orange, rbox(0.172, 0.23, 0.098, 0.034), 0, 0.282, 0.118); // top cover
      K.add(M.black, rbox(0.11, 0.05, 0.022, 0.008), 0, 0.2, 0.172); // the cover's lock and filter cap
      K.add(M.orange, rbox(0.032, 0.2, 0.15, 0.014), -0.106, 0.262, 0.046); // starter housing (left)
      K.add(M.black, rbox(0.016, 0.06, 0.022, 0.006), -0.128, 0.26, 0.098); // starter grip
      K.add(M.grey, rbox(0.032, 0.15, 0.1, 0.012), 0.106, 0.35, 0.004); // sprocket cover (right)
      K.add(M.worn, rbox(0.09, 0.034, 0.06, 0.008), -0.03, 0.413, 0.03); // muffler
      K.add(M.black, rbox(0.17, 0.012, 0.115, 0.006), 0, 0.418, 0.152, -0.38); // chain brake / hand guard
      // the front handle: a tube from the right side over the top down the left side
      K.add(
        M.black,
        tube(
          [
            V3(0.075, 0.352, 0.02),
            V3(0.07, 0.362, 0.15),
            V3(0.0, 0.372, 0.208),
            V3(-0.085, 0.372, 0.172),
            V3(-0.128, 0.37, 0.06),
            V3(-0.122, 0.352, -0.038),
            V3(-0.09, 0.33, -0.046),
          ],
          0.0125,
          26,
          8
        )
      );
      // the guide bar (steel, rounded nose)
      const bar = sideways(
        shape([
          [0.37, -0.037],
          [0.775, -0.03],
          [0.81, -0.03, 0.81, -0.005],
          [0.81, 0.02, 0.775, 0.02],
          [0.37, 0.028],
        ]),
        0.005
      );
      K.add(M.steel, bar, 0.056, 0, 0);
      K.build(g);
      // the chain: a dark rim round the bar
      const ch = kit();
      ch.add(
        M.blued,
        sideways(
          shape([
            [0.365, -0.044],
            [0.775, -0.037],
            [0.818, -0.037, 0.818, -0.005],
            [0.818, 0.027, 0.775, 0.027],
            [0.365, 0.035],
          ]),
          0.008
        ),
        0.056,
        0,
        0
      );
      ch.build(g, 'kette');
      return g;
    },
    // ---- spade: blade at y 0–0.28 (edge at y 0), shaft, D-grip at the top (y 1.15); the blade's face looks to +z ----
    spaten: M => {
      const g = new THREE.Group(),
        K = kit();
      const bl = flat(
        shape([
          [-0.09, 0.28],
          [-0.09, 0.035],
          [-0.088, 0.004, -0.06, 0.0],
          [0.06, 0.0],
          [0.088, 0.004, 0.09, 0.035],
          [0.09, 0.28],
        ]),
        0.0032
      );
      const a = bl.attributes.position;
      for (let i = 0; i < a.count; i++) a.setZ(i, a.getZ(i) + 0.014 * (a.getX(i) / 0.09) ** 2); // dished
      a.needsUpdate = true;
      bl.computeVertexNormals();
      K.add(M.worn, bl);
      for (const s of [-1, 1]) K.add(M.worn, box(0.078, 0.005, 0.016), s * 0.047, 0.283, 0.008); // the treads
      K.add(M.paint, cyl(0.023, 0.019, 0.13, 10), 0, 0.3, 0); // the socket
      K.add(M.paint, box(0.042, 0.13, 0.005), 0, 0.2, 0.004);
      K.add(M.ash, cyl(0.0178, 0.0172, 0.72, 10), 0, 0.72, 0); // the shaft
      // the D-grip: two cheeks and the crossbar
      for (const s of [-1, 1]) K.add(M.ash, rbox(0.016, 0.13, 0.026, 0.006), s * 0.042, 1.09, 0, 0, 0, -s * 0.38);
      K.add(M.ash, cyl(0.0155, 0.0155, 0.12, 10), 0, 1.142, 0, 0, 0, Math.PI / 2);
      K.add(M.paint, cyl(0.019, 0.019, 0.04, 10), 0, 1.035, 0);
      K.build(g);
      return g;
    },
    // ---- manure fork: four tines at y 0–0.3 (curving to +z), the shaft to y 1.45 ----
    mistgabel: M => {
      const g = new THREE.Group(),
        K = kit();
      for (const x of [-0.084, -0.028, 0.028, 0.084]) {
        K.add(M.rust, tube([V3(x, 0.3, 0), V3(x * 1.02, 0.15, 0.012), V3(x * 1.05, 0.025, 0.036)], 0.0055, 10, 6));
        K.add(M.rust, new THREE.ConeGeometry(0.0055, 0.03, 6), x * 1.05, 0.012, 0.04, Math.PI + 0.3);
      }
      K.add(M.rust, rbox(0.19, 0.022, 0.02, 0.006), 0, 0.305, 0.0);
      K.add(M.rust, cyl(0.021, 0.017, 0.13, 10), 0, 0.36, 0);
      K.add(M.wood, cyl(0.0168, 0.0162, 1.04, 10), 0, 0.93, 0);
      K.add(M.dark, cyl(0.0175, 0.0175, 0.03, 10), 0, 1.44, 0);
      K.build(g);
      return g;
    },
    // ---- crowbar (Kuhfuß): a hexagonal bar, the chisel at y 0, the goose neck with the claw at the top ----
    brechstange: M => {
      const g = new THREE.Group(),
        K = kit();
      K.add(M.blued, cyl(0.0125, 0.0125, 0.74, 6), 0, 0.42, 0);
      K.add(M.blued, rbox(0.03, 0.06, 0.01, 0.003), 0, 0.03, 0.002, 0.12);
      const neck = [];
      for (let i = 0; i <= 10; i++) {
        const a = Math.PI - (i / 10) * (Math.PI * 1.08);
        neck.push(V3(0.05 + Math.cos(a) * 0.05, 0.79 + Math.sin(a) * 0.05, 0));
      }
      neck.push(V3(0.104, 0.738, 0));
      K.add(M.blued, tube(neck, 0.0125, 22, 6));
      for (const s of [-1, 1])
        K.add(M.blued, rbox(0.012, 0.04, 0.008, 0.002), 0.104 + s * 0.008, 0.72, 0, 0, 0, s * 0.15);
      K.build(g);
      return g;
    },
    // ---- hatchet: handle 0–0.38, the head at the top, the edge to +x ----
    beil: M => {
      const g = new THREE.Group(),
        K = kit();
      K.add(M.ash, cyl(0.0165, 0.0142, 0.37, 10), 0, 0.19, 0, 0, 0, 0, 0.8, 1, 1);
      K.add(M.ash, new THREE.SphereGeometry(0.019, 10, 8), 0, 0.012, 0, 0, 0, 0, 0.85, 0.6, 1);
      const hd = flat(
        shape([
          [-0.03, 0.345],
          [-0.03, 0.395],
          [0.02, 0.398],
          [0.06, 0.402, 0.1, 0.432],
          [0.112, 0.37, 0.1, 0.31],
          [0.06, 0.336, 0.02, 0.342],
        ]),
        0.028
      );
      taper(hd, x => 1 - 0.9 * clamp01((x - 0.015) / 0.095));
      K.add(M.steel, hd);
      K.build(g);
      return g;
    },
    // ---- the forest worker's axe (Wolfgang's hall): a curved helve 0–0.8, a heavy painted head with a bright edge ----
    axt: M => {
      const g = new THREE.Group(),
        K = kit();
      K.add(
        M.ash,
        tube([V3(0, 0.0, 0), V3(-0.012, 0.25, 0), V3(0.008, 0.55, 0), V3(0, 0.79, 0)], 0.0168, 14, 8),
        0,
        0,
        0,
        0,
        0,
        0,
        0.82,
        1,
        1
      );
      K.add(M.ash, new THREE.SphereGeometry(0.021, 10, 8), -0.004, 0.008, 0, 0, 0, 0, 0.9, 0.7, 1.1);
      const prof = [
        [-0.045, 0.715],
        [-0.045, 0.786],
        [0.03, 0.79],
        [0.1, 0.802, 0.146, 0.826],
        [0.162, 0.755, 0.146, 0.684],
        [0.1, 0.71, 0.03, 0.72],
      ];
      const wedge = x => 1 - 0.92 * clamp01((x - 0.0) / 0.15);
      K.add(M.paint, taper(flat(shape(prof), 0.036), wedge));
      // the ground edge: the same wedge, a hair thicker, only near the edge
      const edge = taper(
        flat(
          shape([
            [0.112, 0.815],
            [0.135, 0.826, 0.146, 0.826],
            [0.162, 0.755, 0.146, 0.684],
            [0.13, 0.69, 0.112, 0.697],
          ]),
          0.036
        ),
        x => wedge(x) * 1.05
      );
      K.add(M.steel, edge);
      K.build(g);
      return g;
    },
    // ---- scythe: the snath 0–1.5 with two grips (nibs to +x), the blade at the top reaching to −x, its edge to +z ----
    sense: M => {
      const g = new THREE.Group(),
        K = kit();
      K.add(M.ash, tube([V3(0, 0, 0), V3(0.02, 0.5, 0.02), V3(0.0, 1.0, 0.03), V3(-0.01, 1.5, 0)], 0.016, 18, 8));
      for (const y of [0.55, 1.05]) K.add(M.ash, cyl(0.013, 0.012, 0.13, 8), 0.07, y, 0, 0, 0, -Math.PI / 2);
      K.add(M.worn, cyl(0.02, 0.02, 0.05, 10), -0.01, 1.49, 0);
      const bl = new THREE.ExtrudeGeometry(
        shape([
          [-0.02, -0.022],
          [-0.35, -0.07, -0.68, 0.12],
          [-0.34, 0.012, -0.02, 0.036],
        ]),
        { depth: 0.0025, bevelEnabled: false, curveSegments: 14 }
      );
      bl.rotateX(Math.PI / 2);
      K.add(M.steel, bl, -0.01, 1.505, 0);
      K.build(g);
      return g;
    },
  };
  // ---- the box of shells on Hubert's table (it goes with the gun) ----
  function shellBox(M) {
    const g = new THREE.Group();
    kit()
      .add(M.card, rbox(0.105, 0.072, 0.074, 0.004), 0, 0.036, 0)
      .add(M.label, box(0.07, 0.03, 0.002), 0, 0.04, 0.0375)
      .build(g);
    const s = shell(M);
    s.rotation.set(0, 0, Math.PI / 2);
    s.position.set(0.09, 0.011, 0.02);
    g.add(s);
    return g;
  }
  // how each lies on the ground or a table: rotation of the model (three's frame, y up) and its lift
  const LIE = {
    flinte: { rz: Math.PI / 2, lift: 0.022 },
    motorsaege: { rx: -Math.PI / 2, lift: 0.046 },
    spaten: { rx: -Math.PI / 2, lift: 0.018 },
    mistgabel: { rx: -Math.PI / 2, lift: 0.017 },
    brechstange: { rx: -Math.PI / 2, lift: 0.0125 },
    beil: { rx: -Math.PI / 2, lift: 0.017 },
    axt: { rx: -Math.PI / 2, lift: 0.019 },
    sense: { rz: Math.PI / 2, lift: 0.016 },
  };
  // third person (game/avatar.js 'tool'): the hand at at · len from the lower end
  const GRIP = {
    spaten: { at: 0.85, len: 1.15 },
    mistgabel: { at: 0.75, len: 1.45 },
    brechstange: { at: 0.2, len: 0.85 },
    beil: { at: 0.22, len: 0.4 },
    axt: { at: 0.15, len: 0.8 },
    sense: { at: 0.5, len: 1.5 },
    motorsaege: { at: 0.15, len: 0.6 },
    flinte: { at: 0.3, len: 1.1 },
  };
  // first person: the hands on the weapon – p the middle of the fist on the handle, y the way the index finger points along it
  // (without L the left hand stays free: a fist at the side, ready to shove)
  const HANDS = {
    flinte: {
      R: { p: [0, 0.322, -0.017], y: [0, 1, 0], pose: 'trigger' },
      L: { p: [0, 0.6, -0.026], y: [0, 1, 0], pose: 'grip' },
    },
    motorsaege: { R: { p: [0, 0.085, 0.128], y: [0, 1, 0] }, L: { p: [-0.127, 0.37, 0.07], y: [0, 0, 1] } }, // L: the side of the front handle
    spaten: { R: { p: [0, 1.142, 0], y: [-1, 0, 0] }, L: { p: [0, 0.76, 0], y: [0, -1, 0] } },
    mistgabel: { R: { p: [0, 1.2, 0], y: [0, -1, 0] }, L: { p: [0, 0.84, 0], y: [0, -1, 0] } },
    brechstange: { R: { p: [0, 0.27, 0], y: [0, 1, 0] }, L: { p: [0, 0.13, 0], y: [0, 1, 0] } },
    beil: { R: { p: [0, 0.085, 0], y: [0, 1, 0] } },
    axt: { R: { p: [0, 0.4, 0], y: [0, 1, 0] }, L: { p: [0, 0.075, 0], y: [0, 1, 0] } },
    sense: { R: { p: [0.075, 1.05, 0], y: [1, 0, 0] }, L: { p: [0.075, 0.55, 0], y: [1, 0, 0] } },
  };
  return { mats, MODELS, LIE, GRIP, HANDS, shell, shellBox, kit, rbox };
})();
window.ZWMOD = ZWMOD;
