// ===================== Hubert's car (feat/nachbarn, 23.10.2026): a mid-size estate of about 2005 on his self-built ramp =====================
// Falko: "Er repariert oft sein Auto: einen Ford Mondeo Kombi, etwa Baujahr 2005. Den fährt er auf eine kleine selbstgebaute Rampe." Modelled
// generic like vehicles/car.js – the proportions of such an estate (4.80 × 1.81 × 1.44 m, wheelbase 2.75 m, 205/55 R16), no makers' marks,
// no names, blank number plates. Body: the side profile extruded across the width with rounded edges, the ends drawn in; the engine bay is
// a real opening under a bonnet that opens (HOFCAR.bonnet(k), Hubert works under it: npc/life.js). Static parts are merged
// (render/zmerge.js); the bonnet stays its own mesh. Model frame: x right, y forward, z up; origin on the ground under the middle.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { scene, V } from '../core/head.js';
import { markDirty, patchSV } from '../core/assets.js';
import { COL } from '../core/geo.js';
import { HOF, RAMP } from './hof_hubert.js';
export const HOFCAR = (() => {
  const std = o => patchSV(new THREE.MeshStandardMaterial(o));
  const M = {
    paint: std({ color: 0x35574a, metalness: 0.5, roughness: 0.36, envMapIntensity: 1.0 }), // dark green metallic, a little tired
    glass: std({ color: 0x141b20, metalness: 0.3, roughness: 0.06, envMapIntensity: 1.3 }),
    black: std({ color: 0x17181a, roughness: 0.6 }),
    trim: std({ color: 0x0e0f10, roughness: 0.4 }),
    chrome: std({ color: 0xc4c8cb, metalness: 1, roughness: 0.2 }),
    tyre: std({ color: 0x151515, roughness: 0.92 }),
    rim: std({ color: 0x868b90, metalness: 0.7, roughness: 0.36 }),
    lamp: std({ color: 0xd2d8dc, metalness: 0.4, roughness: 0.1 }),
    tail: std({ color: 0x7a0d0b, roughness: 0.25 }),
    amber: std({ color: 0xc8701a, roughness: 0.3 }),
    plate: std({ color: 0xf0efe8, roughness: 0.5 }),
    engine: std({ color: 0x3d4043, metalness: 0.5, roughness: 0.55 }),
    rust: std({ color: 0x5a3f2c, roughness: 0.95 }),
    tank: std({ color: 0xd9d6c8, roughness: 0.5 }),
  };
  const YF = 2.402,
    YR = -2.402,
    AF = 1.48,
    AR = AF - 2.754,
    HW = 0.9,
    WR = 0.316;
  const car = new THREE.Group();
  const add = (geo, m, par = car) => {
    const me = new THREE.Mesh(geo, m);
    me.castShadow = true;
    me.receiveShadow = true;
    par.add(me);
    return me;
  };
  const P = (x, y, z) => new THREE.Vector3(x, z, -y);
  const bx = (sx, sy, sz, m, x, y, z, o = {}) => {
    const g = o.r ? new RoundedBoxGeometry(sx, sz, sy, 2, o.r) : new THREE.BoxGeometry(sx, sz, sy);
    const me = add(g, m, o.par);
    me.position.copy(P(x, y, z));
    if (o.rx) me.rotation.x = o.rx;
    if (o.rz) me.rotation.y = o.rz; // (a turn about the vertical: rz in the car's frame)
    return me;
  };
  const smooth = (a, b, t) => {
    const u = Math.min(1, Math.max(0, (t - a) / (b - a)));
    return u * u * (3 - 2 * u);
  };
  // a side outline (y forward, z up) extruded across the width, then bent: ends drawn in, sides leaning in towards the top
  function extrude(pts, width, bevel, bend) {
    const sh = new THREE.Shape();
    pts.forEach(([y, z], i) => (i ? sh.lineTo(y, z) : sh.moveTo(y, z)));
    sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, {
      depth: width - 2 * bevel,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelOffset: -bevel,
      bevelSegments: 2,
      curveSegments: 6,
    });
    const p = geo.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const y = p.getX(i),
        z = p.getY(i),
        x = p.getZ(i) - (width - 2 * bevel) / 2;
      const [nx, ny, nz] = bend ? bend(x, y, z) : [x, y, z];
      p.setXYZ(i, nx, nz, -ny);
    }
    geo.computeVertexNormals();
    return geo;
  }
  const arch = (yc, r, zc) => {
    const out = [];
    for (let k = 0; k <= 12; k++) {
      const a = (Math.PI * k) / 12;
      out.push([yc + Math.cos(a) * r, zc + Math.sin(a) * r]);
    }
    return out;
  };
  const ends = (x, y, z) => {
    const e = 1 - 0.07 * smooth(0.72, 1.0, Math.abs(y - (YF + YR) / 2) / ((YF - YR) / 2)),
      low = 1 - 0.035 * smooth(0.5, 0.22, z);
    return [x * e * low, y, z];
  };
  // ---- lower body: bumpers, sills with the wheel arches, the engine bay open on top (floor at 0.60), the tailgate up to the belt ----
  const AZ = 0.31,
    ARR = 0.4;
  const low = [
    [2.3, 0.2],
    [AF + ARR + 0.02, 0.2],
    ...arch(AF, ARR, AZ),
    [AF - ARR - 0.02, 0.2],
    [AR + ARR + 0.02, 0.2],
    ...arch(AR, ARR, AZ),
    [AR - ARR - 0.03, 0.21],
    [-2.33, 0.24],
    [-2.4, 0.36],
    [-2.4, 0.58],
    [-2.37, 0.63],
    [-2.36, 0.98],
    [-2.0, 0.985],
    [0.95, 0.94],
    [1.06, 0.92],
    [1.08, 0.6],
    [2.26, 0.6],
    [2.4, 0.58],
    [2.42, 0.4],
    [2.38, 0.27],
  ];
  add(extrude(low, 2 * HW, 0.07, ends), M.paint);
  // front wings: the body's upper edge beside the bonnet, the nose panel and the cowl under the windscreen
  const wing = [
    [1.06, 0.6],
    [1.06, 0.925],
    [2.05, 0.79],
    [2.3, 0.71],
    [2.4, 0.6],
  ];
  for (const s of [-1, 1]) {
    const g = extrude(wing, 0.12, 0.03, (x, y, z) => ends(x + s * (HW - 0.06), y, z));
    add(g, M.paint);
  }
  bx(1.5, 0.16, 0.12, M.paint, 0, 2.31, 0.66, { r: 0.03 });
  bx(1.62, 0.16, 0.3, M.black, 0, 1.0, 0.77);
  // ---- the engine bay: block, air box, battery, coolant tank, strut towers, radiator ----
  bx(1.62, 1.18, 0.04, M.trim, 0, 1.67, 0.6);
  bx(0.62, 0.5, 0.36, M.engine, 0.08, 1.7, 0.8);
  bx(0.5, 0.18, 0.12, M.black, 0.08, 1.7, 1.02, { r: 0.03 });
  bx(0.3, 0.36, 0.2, M.black, -0.5, 1.95, 0.8, { r: 0.02 });
  bx(0.26, 0.18, 0.2, M.black, 0.55, 1.35, 0.8);
  bx(0.14, 0.18, 0.16, M.tank, 0.62, 1.95, 0.84, { r: 0.03 });
  for (const s of [-1, 1]) bx(0.2, 0.2, 0.22, M.rust, s * 0.66, 1.42, 0.78, { r: 0.04 });
  bx(1.3, 0.06, 0.32, M.engine, 0, 2.2, 0.76);
  // ---- glasshouse: windscreen, side and rear windows as one tapered prism of dark glass; roof, pillars, rails over it ----
  const gh = [
    [0.98, 0.935],
    [0.12, 1.395],
    [-2.12, 1.41],
    [-2.35, 0.99],
  ];
  add(
    extrude(gh, 1.72, 0.03, (x, y, z) => [x * (1 - 0.2 * smooth(0.94, 1.42, z)), y, z]),
    M.glass
  );
  {
    const rf = new RoundedBoxGeometry(1.4, 0.06, 2.3, 2, 0.025);
    const m = add(rf, M.paint);
    m.position.copy(P(0, -1.0, 1.425));
  }
  const pillar = (a, b, w, m) => {
    const A = P(...a),
      Bv = P(...b),
      L = A.distanceTo(Bv);
    const me = add(new THREE.BoxGeometry(w, w, L), m);
    me.position.copy(A).add(Bv).multiplyScalar(0.5);
    me.lookAt(Bv);
    return me;
  };
  for (const s of [-1, 1]) {
    pillar([s * 0.84, 0.97, 0.94], [s * 0.69, 0.12, 1.41], 0.075, M.paint); // A
    pillar([s * 0.84, -0.12, 0.96], [s * 0.69, -0.12, 1.41], 0.07, M.trim); // B
    pillar([s * 0.84, -1.18, 0.97], [s * 0.69, -1.18, 1.42], 0.07, M.trim); // C
    pillar([s * 0.83, -2.3, 0.99], [s * 0.69, -2.1, 1.41], 0.12, M.paint); // D
    pillar([s * 0.85, 0.95, 0.955], [s * 0.85, -2.3, 0.995], 0.035, M.trim); // window sill trim
    // roof rails with their feet
    pillar([s * 0.6, -0.05, 1.5], [s * 0.6, -2.0, 1.5], 0.035, M.black);
    for (const y of [-0.05, -2.0]) bx(0.05, 0.12, 0.06, M.black, s * 0.6, y, 1.47);
    // mirrors, door gaps and handles, the side rubbing strip
    bx(0.1, 0.13, 0.11, M.black, s * 0.96, 0.82, 1.02, { r: 0.02 });
    for (const y of [0.95, -0.13, -1.2]) bx(0.004, 0.008, 0.62, M.trim, s * 0.905, y, 0.63);
    for (const y of [0.32, -0.75]) bx(0.02, 0.13, 0.03, M.chrome, s * 0.915, y, 0.86);
    bx(0.01, 2.0, 0.05, M.trim, s * 0.91, -0.15, 0.5);
  }
  // ---- front: headlamps, grille without a badge, intake, indicators, plate; rear: tall lamps beside the tailgate, plate, bumper ----
  for (const s of [-1, 1]) {
    // headlamps swept back along the wings, indicators at their outer ends, fog lamps low in the bumper
    bx(0.44, 0.1, 0.15, M.lamp, s * 0.58, 2.33, 0.67, { r: 0.03, rz: -s * 0.32 }); // (outer end back)
    bx(0.09, 0.08, 0.06, M.amber, s * 0.8, 2.22, 0.66, { rz: -s * 0.5 });
    const f = add(new THREE.CylinderGeometry(0.045, 0.045, 0.03, 12), M.lamp);
    f.rotation.x = Math.PI / 2;
    f.position.copy(P(s * 0.56, 2.43, 0.38));
    bx(0.12, 0.08, 0.42, M.tail, s * 0.8, -2.36, 0.83, { r: 0.02 });
  }
  // the grille: wide, a chrome frame, no badge
  bx(0.7, 0.05, 0.14, M.trim, 0, 2.4, 0.64, { r: 0.02 });
  bx(0.76, 0.03, 0.19, M.chrome, 0, 2.385, 0.64, { r: 0.03 });
  bx(1.0, 0.05, 0.13, M.trim, 0, 2.415, 0.38, { r: 0.02 });
  bx(0.52, 0.02, 0.11, M.plate, 0, 2.43, 0.5);
  bx(0.52, 0.02, 0.11, M.plate, 0, -2.41, 0.72);
  bx(1.7, 0.06, 0.08, M.trim, 0, -2.4, 0.46, { r: 0.02 });
  bx(0.9, 0.02, 0.03, M.chrome, 0, -2.38, 0.82); // the strip over the plate
  bx(0.02, 0.03, 0.42, M.black, 0.08, -2.35, 1.08, { rx: 0.45 }); // rear wiper
  // ---- wheels: tyres, five-spoke look as a disc with a hub ----
  for (const [y] of [[AF], [AR]])
    for (const s of [-1, 1]) {
      const t = add(new THREE.CylinderGeometry(WR, WR, 0.205, 20), M.tyre);
      t.rotation.z = Math.PI / 2;
      t.position.copy(P(s * 0.765, y, WR));
      const r = add(new THREE.CylinderGeometry(0.2, 0.2, 0.21, 10), M.rim);
      r.rotation.z = Math.PI / 2;
      r.position.copy(P(s * 0.77, y, WR));
      const h = add(new THREE.CylinderGeometry(0.06, 0.06, 0.22, 8), M.black);
      h.rotation.z = Math.PI / 2;
      h.position.copy(P(s * 0.77, y, WR));
    }
  // under the car: a dark floor so the ground does not show through under the sills
  bx(1.62, 4.2, 0.03, M.trim, 0, -0.05, 0.2, { r: 0 });
  // ---- the bonnet: its own mesh, hinged at the cowl, the front edge lifts ----
  const hinge = new THREE.Group();
  hinge.position.copy(P(0, 1.07, 0.93));
  car.add(hinge);
  {
    const top = [
      [1.07, 0.93],
      [2.05, 0.8],
      [2.31, 0.715],
      [2.3, 0.68],
      [2.05, 0.765],
      [1.07, 0.9],
    ].map(([y, z]) => [y - 1.07, z - 0.93]);
    const g = extrude(top, 1.6, 0.02, (x, y, z) => [x * (1 - 0.06 * smooth(0.7, 1.25, y)), y, z]);
    const m = add(g, M.paint, hinge);
    m.userData.noMerge = true;
  }
  // ---- on the ramp: front wheels on its flat tops, the rear ones on the ground, so the body pitches nose up about the rear axle ----
  const pitch = Math.atan2(RAMP.h, AF - AR),
    root = new THREE.Group(),
    piv = new THREE.Group();
  piv.position.copy(P(0, AR, 0));
  car.position.copy(P(0, -AR, 0));
  piv.rotation.x = pitch;
  piv.add(car);
  root.add(piv);
  root.position.copy(V(HOF.car.x, HOF.car.y, 0));
  root.rotation.y = (-HOF.car.az * Math.PI) / 180;
  scene.add(root);
  root.updateMatrixWorld(true);
  COL.push([
    HOF.car.x - 0.95,
    HOF.car.x + 0.95,
    HOF.car.y + YR - 0.05,
    HOF.car.y + YF + 0.05,
    0,
    1.6,
    'car',
    null,
    null,
  ]);
  hinge.traverse(o => (o.userData.noMerge = true));
  // where Hubert stands to work at the engine (in front of the car), at a wheel, at the boot – site coordinates
  const S = {
    root,
    hinge,
    open: 0,
    front: [HOF.car.x, HOF.car.y + YF + 0.55],
    side: [HOF.car.x - 1.25, HOF.car.y + AF],
    rear: [HOF.car.x + 0.2, HOF.car.y + YR - 0.6],
    // k: 0 shut … 1 open (about 62°)
    bonnet(k) {
      k = Math.max(0, Math.min(1, k));
      if (Math.abs(k - S.open) < 1e-3) return;
      S.open = k;
      hinge.rotation.x = k * 1.08;
      markDirty(true);
    },
  };
  S.bonnet(1);
  return S;
})();
window.HOFCAR = HOFCAR;
