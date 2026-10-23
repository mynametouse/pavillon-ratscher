// ===================== feat/garage (Falko, 23.10.2026 10:53): the old tin garage of construction phase 0 =====================
// „Denk dran, dass bei der alten Blechgarage so zwei Schiebetüren sind, die man aufschieben kann. Und dort sind Geräte drin, also
// Rasenmäher … Ansonsten sind dort diverse Werkzeuge in den Regalen. … Und die Tür geht nach Norden.“
// Built here (static, before render/zmerge.js, so it is merged): the garage on the slab (4 × 4 m of corrugated sheet; walls west, south
// and east, the north side with a 2.5 m opening under a lintel), the top rail with the two sliding leaves (not merged: they move), steel
// shelves with tools, boxes, tins and pots, a workbench with a pegboard, garden tools, a wheelbarrow. Shown only in phase 0 ('Bestand');
// from phase 1 the garage stands at the south end of the garden (garden/env.js). The models of the mower and the petrol can are made here
// (mkMower, mkPetrolCan) and where they and Hubert's diesel can stand (GARAGE.home); the playing part – doors, mower, petrol – is
// garden/garage_play.js (it needs the game layer further down). Site coordinates: x east, y north, z up (metres).
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { scene, V } from '../core/head.js';
import { ANISO, dimIndoor, patchSV, plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { B, beam, bldBegin, bldEnd, BUILD, COL, cyl, PHN, phase, tagPh } from '../core/geo.js';
import { zS } from '../pavilion/house_base.js';
import { S0 } from './env.js';
import { gB, lcol, lwalk, rotDesc, siteGroup, worldOf } from './site_base.js';
// own seeded random numbers (core/head.js rnd() is one sequence for the whole scene – using it here would move the trees and the grass)
const rand = (
  s => () =>
    ((s = (s * 16807) % 2147483647) - 1) / 2147483646
)(2311);
const rr = (a, b) => a + (b - a) * rand();
// ---- measures ----
const Z0 = zS, // the garage floor: top of the slab
  HW = Z0 + 2.1, // top of the walls
  OP = { x0: 0.75, x1: 3.25, z1: Z0 + 1.98 }, // the door opening in the north wall
  LEAF = { w: 1.3, y0: 4.0, y1: 4.052, z0: Z0 + 0.025, z1: Z0 + 2.0, travel: 1.3 }, // sliding leaves on the outside of the north wall
  RAIL = { x0: -0.64, x1: 4.64, y0: 3.99, y1: 4.075, z0: Z0 + 2.035, z1: Z0 + 2.1 };
// ---- materials: indoor ones see less sky (dimIndoor as the walls of the site buildings: plain colours share their shader program) ----
const DIM = m => dimIndoor(m, 0.6, 0.6);
const pm = (c, r = 0.8, mt = 0) => DIM(plain({ color: c, roughness: r, metalness: mt }));
const wallIn = (() => {
  const m = MAT.metal.clone();
  delete m.userData.svPatched;
  m.userData.svDim = [0.6, 0.6];
  return patchSV(m);
})();
const GM = {
  wallIn,
  galv: pm(0x9aa2a8, 0.45, 0.7),
  board: pm(0xa98a62, 0.9),
  wood: pm(0x8a6a48, 0.8),
  handle: pm(0xb88a58, 0.65),
  dark: pm(0x2b2a28, 0.6, 0.2),
  steel: pm(0x8e959a, 0.4, 0.75),
  rust: pm(0x6e4630, 0.9, 0.3),
  red: pm(0xa8281f, 0.5, 0.1),
  blue: pm(0x2c5a9e, 0.5, 0.1),
  green: pm(0x3d6a3a, 0.6),
  yellow: pm(0xd4a020, 0.5),
  orange: pm(0xd0601c, 0.55),
  carton: pm(0xa27a4c, 0.95),
  terracotta: pm(0xb06038, 0.9),
  white: pm(0xd6d3cb, 0.6),
  grey: pm(0x5f6366, 0.7),
  sack: pm(0x5a4a38, 0.95),
};
// the tube's glass: emissive when the light is on (a uniform – no new shader)
const TUBE = plain({ color: 0xf4f6f2, roughness: 0.3, emissive: 0xeef4ff, emissiveIntensity: 0 });
// pegboard over the bench: hardboard with holes in a 25 mm grid and the outlines where the tools hang
const PEG = (() => {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const q = c.getContext('2d');
  q.fillStyle = '#a88b66';
  q.fillRect(0, 0, 256, 128);
  q.fillStyle = '#3a2e22';
  for (let x = 4; x < 256; x += 8) for (let y = 4; y < 128; y += 8) q.fillRect(x - 1, y - 1, 2, 2);
  for (let i = 0; i < 200; i++) {
    q.fillStyle = `rgba(60,45,30,${Math.random() * 0.06})`;
    q.fillRect(Math.random() * 256, Math.random() * 128, 6 + Math.random() * 20, 3 + Math.random() * 10);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = ANISO;
  return DIM(plain({ map: t, roughness: 0.9 }));
})();
// ---- helpers (site coordinates) ----
const box = (x0, x1, y0, y1, z0, z1, m, o = {}) =>
  B(x0, x1, y0, y1, z0, z1, m, Object.assign({ col: false, cast: false }, o));
const cylz = (x, y, z0, z1, r, m, seg = 14, r2) => cyl(x, y, z0, z1, r, m, seg, r2, { col: false, cast: false });
const _up = new THREE.Vector3(0, 1, 0);
// a round bar from p to q (site points), e.g. a tool handle
function rod(p, q, r, m, parent = scene, seg = 8) {
  const a = V(...p),
    b = V(...q),
    d = b.clone().sub(a),
    L = d.length();
  const g = new THREE.CylinderGeometry(r, r, L, seg);
  const me = new THREE.Mesh(g, m);
  me.position.copy(a).addScaledVector(d, 0.5);
  me.quaternion.setFromUnitVectors(_up, d.normalize());
  me.castShadow = false;
  me.receiveShadow = true;
  parent.add(me);
  return tagPh(me);
}
const col = (x0, x1, y0, y1, z0, z1) => COL.push([x0, x1, y0, y1, z0, z1, 'garage', PHN.bestand, PHN.garage]);
// merge the meshes of a group per material into one mesh each (the moving parts: a door leaf, the mower – few draw calls)
export function mergeByMat(g) {
  g.updateMatrixWorld(true);
  const inv = g.matrixWorld.clone().invert(),
    by = new Map();
  g.traverse(o => {
    if (!o.isMesh || o.userData.keep) return;
    const geo = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(
      inv.clone().multiply(o.matrixWorld)
    );
    for (const k of Object.keys(geo.attributes)) if (!['position', 'normal', 'uv'].includes(k)) geo.deleteAttribute(k);
    if (!geo.attributes.uv)
      geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(geo.attributes.position.count * 2), 2));
    if (!by.has(o.material)) by.set(o.material, { geos: [], cast: false, kids: [] });
    const e = by.get(o.material);
    e.geos.push(geo);
    e.cast = e.cast || o.castShadow;
    e.kids.push(o);
  });
  for (const [m, e] of by) {
    for (const o of e.kids) o.parent.remove(o);
    const me = new THREE.Mesh(mergeGeometries(e.geos, false), m);
    me.castShadow = e.cast;
    me.receiveShadow = true;
    g.add(me);
  }
  return g;
}
// ======================= the garage of phase 0 =======================
phase(PHN.bestand, PHN.garage);
// walls of corrugated sheet (ribs upright), the inner faces darker; the north wall beside and above the opening
{
  const W = (x0, x1, y0, y1, z0, z1, inner) =>
    B(x0, x1, y0, y1, z0, z1, { def: MAT.metal, [inner]: wallIn }, { grain: 'z' });
  W(0.02, 0.1, 0.02, 3.98, Z0, HW, 'e');
  W(3.9, 3.98, 0.02, 3.98, Z0, HW, 'w');
  W(0.1, 3.9, 0.02, 0.1, Z0, HW, 'n');
  W(0.1, OP.x0, 3.9, 3.98, Z0, HW, 's');
  W(OP.x1, 3.9, 3.9, 3.98, Z0, HW, 's');
  W(OP.x0, OP.x1, 3.9, 3.98, OP.z1, HW, 's');
  // galvanised angles: the corners, the frame of the opening
  for (const [x, y] of [
    [0.0, 0.0],
    [3.94, 0.0],
    [0.0, 3.94],
    [3.94, 3.94],
  ])
    box(x, x + 0.06, y, y + 0.06, Z0, HW + 0.02, MAT.galv, { grain: 'z' });
  box(OP.x0 - 0.05, OP.x0, 3.88, 4.0, Z0, OP.z1, MAT.galv, { grain: 'z' });
  box(OP.x1, OP.x1 + 0.05, 3.88, 4.0, Z0, OP.z1, MAT.galv, { grain: 'z' });
  box(OP.x0 - 0.05, OP.x1 + 0.05, 3.88, 4.0, OP.z1 - 0.05, OP.z1, MAT.galv, { grain: 'x' });
  // roof: purlins and the sheet (as before)
  for (let x = 0.3; x < 3.9; x += 0.5) box(x - 0.015, x + 0.015, 0.1, 3.9, HW, HW + 0.08, MAT.galv, { grain: 'y' });
  B(-0.08, 4.08, -0.08, 4.08, HW + 0.08, HW + 0.12, MAT.roofGrey, { col: false });
  // the top rail on the north side, on brackets; it runs on past both corners so the leaves can clear the opening
  box(RAIL.x0, RAIL.x1, RAIL.y0, RAIL.y1, RAIL.z0, RAIL.z1, MAT.galv, { grain: 'x', cast: true });
  for (const x of [-0.5, 0.35, 1.3, 2.0, 2.7, 3.65, 4.5]) {
    box(x - 0.03, x + 0.03, 3.98, RAIL.y1, RAIL.z1, RAIL.z1 + 0.05, MAT.galv);
    if (x < 0 || x > 4) box(x - 0.02, x + 0.02, 3.99, 4.01, RAIL.z0 - 0.25, RAIL.z1, MAT.galv);
  }
  for (const x of [-0.6, 4.6]) box(x - 0.02, x + 0.02, RAIL.y0, RAIL.y1, RAIL.z0 - 0.06, RAIL.z1, MAT.blacksteel); // end stops
  // floor guides at the foot of the leaves
  for (const x of [OP.x0 - 0.2, OP.x1 + 0.2]) box(x - 0.04, x + 0.04, 4.05, 4.12, Z0, Z0 + 0.06, MAT.blacksteel);
  // a fluorescent tube under the roof (it glows when switched on: garden/garage_play.js lends it a light) and its switch by the door
  box(1.4, 2.6, 1.95, 2.05, HW - 0.07, HW, GM.white);
  box(1.42, 2.58, 1.97, 2.03, HW - 0.1, HW - 0.07, TUBE);
  box(0.5, 0.6, 3.865, 3.9, Z0 + 1.3, Z0 + 1.42, GM.white);
  box(0.535, 0.565, 3.855, 3.865, Z0 + 1.34, Z0 + 1.38, GM.grey);
}
// ---- the two sliding leaves: a steel frame with corrugated sheet outside, hung from two rollers each, a handle; the east one carries the
//      hasp with the padlock. Closed they meet in the middle (xm); open each one slides `travel` to its side. Built in the coordinates of
//      `parent` (the scene: site coordinates; a building's group: its local frame), each leaf a group of its own (it moves) ----
function mkLeaves({ parent, keys, xm, w, y0, y1, z0, z1, zr, travel }) {
  const out = [];
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? xm - w : xm,
      x1 = x0 + w,
      g = new THREE.Group(),
      o = { parent: g, col: false, cast: true };
    const yf = y0,
      ys = y1 - 0.012; // frame from y0 to ys, the sheet in front of it
    // frame (40 × 40 tube): sides, top, bottom, a middle rail, a diagonal brace on the inside
    B(x0, x0 + 0.04, yf, ys, z0, z1, MAT.galv, o);
    B(x1 - 0.04, x1, yf, ys, z0, z1, MAT.galv, o);
    B(x0, x1, yf, ys, z1 - 0.04, z1, MAT.galv, o);
    B(x0, x1, yf, ys, z0, z0 + 0.04, MAT.galv, o);
    B(x0, x1, yf, ys, z0 + 0.98, z0 + 1.02, MAT.galv, o);
    {
      const a = [side < 0 ? x0 + 0.06 : x1 - 0.06, yf + 0.015, z0 + 0.06],
        b = [side < 0 ? x1 - 0.06 : x0 + 0.06, yf + 0.015, z0 + 0.96];
      const me = rod(a, b, 0.016, MAT.galv, g, 6);
      me.castShadow = true;
    }
    // the sheet, ribs upright
    B(x0 + 0.005, x1 - 0.005, ys, y1, z0 + 0.01, z1 - 0.005, MAT.metal, Object.assign({ grain: 'z' }, o));
    // the handle near the meeting edge (outside), standing off on two bolts; a pull handle inside too
    const hx = side < 0 ? x1 - 0.16 : x0 + 0.16,
      zh = z0 - 0.025;
    B(hx - 0.012, hx + 0.012, y1 + 0.03, y1 + 0.055, zh + 0.86, zh + 1.34, MAT.blacksteel, o);
    for (const z of [zh + 0.9, zh + 1.3]) B(hx - 0.01, hx + 0.01, y1, y1 + 0.03, z - 0.01, z + 0.01, MAT.blacksteel, o);
    B(hx - 0.012, hx + 0.012, yf - 0.05, yf - 0.025, zh + 0.9, zh + 1.25, MAT.blacksteel, o);
    for (const z of [zh + 0.93, zh + 1.22])
      B(hx - 0.01, hx + 0.01, yf - 0.025, yf, z - 0.01, z + 0.01, MAT.blacksteel, o);
    // hangers with rollers in the rail
    for (const x of [x0 + 0.16, x1 - 0.16]) {
      B(x - 0.03, x + 0.03, yf + 0.015, yf + 0.03, z1 - 0.06, zr + 0.04, MAT.galv, o);
      const wh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.03, 12), MAT.blacksteel);
      wh.rotation.x = Math.PI / 2;
      wh.position.copy(V(x, yf + 0.03, zr + 0.035));
      g.add(wh);
    }
    if (side > 0) {
      // hasp and padlock at the meeting edge
      B(x0 + 0.01, x0 + 0.09, y1, y1 + 0.012, zh + 1.08, zh + 1.13, MAT.blacksteel, o);
      B(x0 + 0.05, x0 + 0.09, y1 + 0.012, y1 + 0.03, zh + 1.02, zh + 1.07, MAT.brass, o);
    }
    mergeByMat(g);
    g.traverse(m => {
      if (m.isMesh) {
        m.userData.noMerge = true;
        tagPh(m);
      }
    });
    tagPh(g);
    parent.add(g);
    out.push({
      key: keys[side < 0 ? 0 : 1],
      side,
      g,
      x0,
      x1,
      y: (y0 + y1) / 2, // the leaf's plane (in the frame)
      ey: (y1 - y0) / 2 + 0.008,
      hx, // its handle
      z0,
      z1,
      travel,
      k: 0,
      want: 0,
    });
  }
  return out;
}
const leaves = mkLeaves({
  parent: scene,
  keys: ['garageW', 'garageO'],
  xm: 2.0,
  w: LEAF.w,
  y0: LEAF.y0,
  y1: LEAF.y1,
  z0: LEAF.z0,
  z1: LEAF.z1,
  zr: RAIL.z0,
  travel: LEAF.travel,
});
// ======================= inside: shelves, workbench, tools =======================
// steel shelf (Schwerlastregal): four perforated uprights, five chipboard levels, X braces at the back; the things on it come from fill(level)
function shelf(x0, x1, y0, y1, levels, fill, backAt) {
  const z1 = Z0 + 1.95;
  for (const x of [x0, x1 - 0.035]) for (const y of [y0, y1 - 0.035]) box(x, x + 0.035, y, y + 0.035, Z0, z1, GM.galv);
  for (const lz of levels) {
    const z = Z0 + lz;
    box(x0, x1, y0, y1, z, z + 0.022, GM.board, { grain: x1 - x0 > y1 - y0 ? 'x' : 'y' });
    // the steel beams under each level
    if (x1 - x0 > y1 - y0)
      for (const y of [y0, y1 - 0.03]) box(x0, x1, y, y + 0.03, z - 0.05, z, GM.galv, { grain: 'x' });
    else for (const x of [x0, x1 - 0.03]) box(x, x + 0.03, y0, y1, z - 0.05, z, GM.galv, { grain: 'y' });
  }
  // X brace at the back (against the wall)
  const L = backAt;
  if (L.axis === 'x') {
    rod([x0 + 0.02, L.at, Z0 + 0.1], [x1 - 0.02, L.at, z1 - 0.1], 0.006, GM.galv);
    rod([x1 - 0.02, L.at, Z0 + 0.1], [x0 + 0.02, L.at, z1 - 0.1], 0.006, GM.galv);
  } else {
    rod([L.at, y0 + 0.02, Z0 + 0.1], [L.at, y1 - 0.02, z1 - 0.1], 0.006, GM.galv);
    rod([L.at, y1 - 0.02, Z0 + 0.1], [L.at, y0 + 0.02, z1 - 0.1], 0.006, GM.galv);
  }
  for (const lz of levels) fill(Z0 + lz + 0.022);
}
// small things on a level, along a run (a0 → a1) at depth range (t0, t1); axis 'y': the shelf runs along y (west or east wall)
function things(axis, a0, a1, t0, t1, z, kinds) {
  let a = a0 + rr(0.0, 0.06);
  const P = (u, t) => (axis === 'y' ? [t, u] : [u, t]);
  while (a < a1 - 0.08) {
    const k = kinds[Math.floor(rand() * kinds.length)];
    const w = item(k, axis, a, t0, t1, z, P);
    a += w + rr(0.02, 0.08);
  }
}
// one item; returns the width it takes along the run
function item(k, axis, a, t0, t1, z, P) {
  const tm = (t0 + t1) / 2,
    d = t1 - t0;
  const bx = (u0, u1, s0, s1, z0, z1, m) => {
    const p = P(u0, s0),
      q = P(u1, s1);
    box(Math.min(p[0], q[0]), Math.max(p[0], q[0]), Math.min(p[1], q[1]), Math.max(p[1], q[1]), z0, z1, m);
  };
  const cy = (u, s, z0, z1, r, m, r2) => {
    const p = P(u, s);
    cylz(p[0], p[1], z0, z1, r, m, 12, r2);
  };
  switch (k) {
    case 'carton': {
      const w = rr(0.22, 0.38),
        h = rr(0.14, 0.3);
      bx(a, a + w, tm - d * 0.42, tm + d * 0.42, z, z + h, GM.carton);
      bx(a + w * 0.3, a + w * 0.7, tm - d * 0.43, tm - d * 0.42, z + h * 0.55, z + h * 0.8, GM.white);
      return w;
    }
    case 'crate': {
      const w = rr(0.3, 0.4),
        h = rr(0.16, 0.22),
        m = [GM.blue, GM.grey, GM.dark, GM.green][Math.floor(rand() * 4)];
      bx(a, a + w, tm - d * 0.45, tm + d * 0.45, z, z + h, m);
      return w;
    }
    case 'tins': {
      // paint tins, some stacked
      let u = a;
      for (let i = 0; i < 3; i++) {
        const r = rr(0.07, 0.1),
          h = rr(0.1, 0.17),
          m = rand() < 0.5 ? GM.white : GM.steel;
        cy(u + r, tm + rr(-0.05, 0.05), z, z + h, r, m);
        if (rand() < 0.4) cy(u + r, tm, z + h, z + h + h * 0.9, r * 0.95, rand() < 0.5 ? GM.white : GM.steel);
        u += 2 * r + 0.015;
      }
      return u - a;
    }
    case 'oil': {
      // motor oil and other cans: flat bottles with a cap
      let u = a;
      for (let i = 0; i < 3; i++) {
        const w = 0.09,
          m = [GM.yellow, GM.dark, GM.green, GM.red][Math.floor(rand() * 4)];
        bx(u, u + w, tm - 0.06, tm + 0.06, z, z + 0.22, m);
        cy(u + w / 2, tm, z + 0.22, z + 0.25, 0.015, GM.dark);
        u += w + 0.01;
      }
      return u - a;
    }
    case 'pots': {
      // stacked terracotta pots, cones
      const r = rr(0.07, 0.11),
        n = 3 + Math.floor(rand() * 4);
      for (let i = 0; i < n; i++) cy(a + r, tm, z + i * 0.035, z + i * 0.035 + r * 1.2, r, GM.terracotta, r * 0.72);
      return 2 * r;
    }
    case 'spray': {
      let u = a;
      for (let i = 0; i < 4; i++) {
        cy(u + 0.03, tm + rr(-0.06, 0.06), z, z + 0.19, 0.028, [GM.red, GM.blue, GM.steel, GM.yellow][i]);
        u += 0.07;
      }
      return u - a;
    }
    case 'cable': {
      // a coiled orange extension cable
      const p = P(a + 0.14, tm);
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.025, 6, 16), GM.orange);
      t.rotation.x = -Math.PI / 2;
      t.position.copy(V(p[0], p[1], z + 0.025));
      scene.add(tagPh(t));
      const t2 = t.clone();
      t2.position.y += 0.045;
      t2.scale.setScalar(0.93);
      scene.add(tagPh(t2));
      return 0.3;
    }
    case 'jars': {
      let u = a;
      for (let i = 0; i < 4; i++) {
        cy(u + 0.04, tm, z, z + 0.12, 0.04, GM.steel);
        cy(u + 0.04, tm, z + 0.12, z + 0.135, 0.042, [GM.red, GM.green, GM.yellow, GM.blue][i]);
        u += 0.09;
      }
      return u - a;
    }
    case 'trimmer': {
      // an orange hedge trimmer lying lengthwise
      bx(a, a + 0.28, tm - 0.07, tm + 0.07, z, z + 0.12, GM.orange);
      bx(a + 0.28, a + 0.62, tm - 0.03, tm + 0.03, z + 0.03, z + 0.05, GM.steel);
      return 0.64;
    }
    case 'gloves': {
      bx(a, a + 0.2, tm - 0.08, tm + 0.08, z, z + 0.04, GM.yellow);
      return 0.2;
    }
    case 'bucket': {
      cy(a + 0.15, tm, z, z + 0.28, 0.15, GM.grey, 0.12);
      return 0.3;
    }
    default:
      return 0.1;
  }
}
// west wall: a shelf along it (1.8 m)
const SW = { x0: 0.12, x1: 0.57, y0: 0.22, y1: 2.02 };
shelf(
  SW.x0,
  SW.x1,
  SW.y0,
  SW.y1,
  [0.1, 0.52, 0.94, 1.36, 1.78],
  z =>
    things(
      'y',
      SW.y0 + 0.04,
      SW.y1 - 0.04,
      SW.x0 + 0.03,
      SW.x1 - 0.03,
      z,
      z < Z0 + 0.3
        ? ['bucket', 'carton', 'crate', 'pots']
        : z < Z0 + 1.0
          ? ['tins', 'pots', 'carton', 'jars', 'spray']
          : ['carton', 'crate', 'cable', 'tins']
    ),
  { axis: 'y', at: SW.x0 + 0.01 }
);
col(SW.x0, SW.x1, SW.y0, SW.y1, Z0, Z0 + 1.95);
// east wall: the second shelf
const SE = { x0: 3.43, x1: 3.88, y0: 0.85, y1: 2.65 };
shelf(
  SE.x0,
  SE.x1,
  SE.y0,
  SE.y1,
  [0.1, 0.52, 0.94, 1.36, 1.78],
  z =>
    things(
      'y',
      SE.y0 + 0.04,
      SE.y1 - 0.04,
      SE.x0 + 0.03,
      SE.x1 - 0.03,
      z,
      z < Z0 + 0.3
        ? ['crate', 'carton', 'bucket']
        : z < Z0 + 1.0
          ? ['oil', 'spray', 'gloves', 'trimmer', 'jars']
          : ['carton', 'tins', 'crate', 'oil']
    ),
  { axis: 'y', at: SE.x1 - 0.01 }
);
col(SE.x0, SE.x1, SE.y0, SE.y1, Z0, Z0 + 1.95);
// two toolboxes on the east shelf (red and blue, with handles)
for (const [y, m, lz] of [
  [1.0, GM.red, 0.52],
  [1.62, GM.blue, 0.94],
]) {
  const z = Z0 + lz + 0.022;
  box(3.5, 3.82, y, y + 0.42, z, z + 0.18, m);
  box(3.5, 3.82, y + 0.03, y + 0.39, z + 0.18, z + 0.2, GM.dark);
  box(3.64, 3.68, y + 0.08, y + 0.34, z + 0.24, z + 0.26, GM.dark);
}
// the workbench against the south wall: beech top on a steel frame, a shelf below, a vice; the pegboard above with tools
const WB = { x0: 1.2, x1: 2.9, y0: 0.12, y1: 0.72, z: Z0 + 0.9 };
{
  const { x0, x1, y0, y1, z } = WB;
  box(x0, x1, y0, y1, z - 0.045, z, MAT.oakF, { grain: 'x' });
  for (const x of [x0 + 0.04, x1 - 0.08])
    for (const y of [y0 + 0.02, y1 - 0.06]) box(x, x + 0.04, y, y + 0.04, Z0, z - 0.045, GM.dark);
  box(x0 + 0.04, x1 - 0.04, y0 + 0.04, y1 - 0.04, Z0 + 0.18, Z0 + 0.2, GM.board, { grain: 'x' });
  box(x0 + 0.04, x1 - 0.04, y1 - 0.06, y1 - 0.02, z - 0.12, z - 0.045, GM.dark);
  // vice on the east corner
  box(x1 - 0.32, x1 - 0.12, y1 - 0.1, y1 + 0.04, z, z + 0.06, GM.blue);
  box(x1 - 0.3, x1 - 0.14, y1 + 0.04, y1 + 0.1, z, z + 0.12, GM.blue);
  box(x1 - 0.3, x1 - 0.14, y1 - 0.12, y1 - 0.08, z + 0.06, z + 0.12, GM.blue);
  rod([x1 - 0.22, y1 + 0.1, z + 0.07], [x1 - 0.22, y1 + 0.24, z + 0.07], 0.008, GM.steel);
  rod([x1 - 0.3, y1 + 0.24, z + 0.07], [x1 - 0.14, y1 + 0.24, z + 0.07], 0.007, GM.steel);
  // on the bench: a hammer, a few screws in a jar, a rag, a tin
  rod([x0 + 0.3, y0 + 0.35, z + 0.015], [x0 + 0.58, y0 + 0.42, z + 0.015], 0.013, GM.handle);
  box(x0 + 0.56, x0 + 0.62, y0 + 0.36, y0 + 0.48, z, z + 0.03, GM.dark);
  cylz(x0 + 0.9, y0 + 0.2, z, z + 0.11, 0.045, GM.steel);
  box(x0 + 1.05, x0 + 1.3, y0 + 0.3, y0 + 0.5, z, z + 0.012, GM.red);
  cylz(x0 + 0.15, y0 + 0.15, z, z + 0.14, 0.06, GM.white);
  // below: a crate, a second toolbox, a bucket
  box(x0 + 0.1, x0 + 0.55, y0 + 0.08, y0 + 0.48, Z0 + 0.2, Z0 + 0.42, GM.grey);
  box(x0 + 0.7, x0 + 1.15, y0 + 0.12, y0 + 0.4, Z0 + 0.2, Z0 + 0.38, GM.red);
  cylz(x1 - 0.3, y0 + 0.3, Z0, Z0 + 0.3, 0.14, GM.grey, 14, 0.12);
  // pegboard and its tools
  box(x0 + 0.05, x1 - 0.05, 0.1, 0.115, z + 0.15, z + 0.85, PEG, { grain: 'x' });
  const wy = 0.13;
  // saws, hammers, spanners, screwdrivers, pliers, a square
  box(x0 + 0.15, x0 + 0.6, wy - 0.008, wy + 0.004, z + 0.5, z + 0.62, GM.steel);
  box(x0 + 0.05, x0 + 0.17, wy - 0.012, wy + 0.012, z + 0.48, z + 0.64, GM.handle);
  for (let i = 0; i < 3; i++) {
    const x = x0 + 0.75 + i * 0.09;
    box(x - 0.012, x + 0.012, wy - 0.01, wy + 0.01, z + 0.32, z + 0.6, GM.handle);
    box(x - 0.04, x + 0.04, wy - 0.015, wy + 0.015, z + 0.6, z + 0.64, GM.dark);
  }
  for (let i = 0; i < 7; i++) {
    const x = x0 + 1.05 + i * 0.045;
    box(x - 0.008, x + 0.008, wy - 0.005, wy + 0.005, z + 0.42 - i * 0.012, z + 0.7, GM.steel);
  }
  for (let i = 0; i < 5; i++) {
    const x = x0 + 1.45 + i * 0.04;
    box(x - 0.01, x + 0.01, wy - 0.01, wy + 0.01, z + 0.56, z + 0.66, [GM.red, GM.yellow, GM.blue, GM.red, GM.dark][i]);
    box(x - 0.003, x + 0.003, wy - 0.004, wy + 0.004, z + 0.44, z + 0.56, GM.steel);
  }
  box(x0 + 0.25, x0 + 0.65, wy - 0.006, wy + 0.004, z + 0.22, z + 0.26, GM.steel);
  box(x0 + 0.25, x0 + 0.29, wy - 0.006, wy + 0.004, z + 0.22, z + 0.42, GM.steel);
  col(x0, x1, y0, y1, Z0, z);
}
// garden tools leaning against the south wall west of the bench: spade, rake, hoe, fork, broom
{
  const foot = y => [y, 0.36],
    z0 = Z0;
  const tools = [
    ['spade', 0.66],
    ['rake', 0.79],
    ['hoe', 0.9],
    ['fork', 1.01],
    ['broom', 1.12],
  ];
  for (const [k, x] of tools) {
    const [, fy] = foot(x),
      top = [x + rr(-0.03, 0.03), 0.13, z0 + 1.42 + rr(-0.06, 0.06)];
    if (k === 'spade' || k === 'fork') {
      // blade on the floor, handle up with a D grip
      const bot = [x, fy, z0 + 0.28];
      rod(bot, top, 0.016, GM.handle);
      if (k === 'spade') box(x - 0.09, x + 0.09, fy - 0.01, fy + 0.01, z0, z0 + 0.29, GM.rust, { grain: 'z' });
      else
        for (let i = 0; i < 4; i++)
          box(x - 0.08 + i * 0.05, x - 0.07 + i * 0.05, fy - 0.006, fy + 0.006, z0, z0 + 0.28, GM.steel);
      box(top[0] - 0.07, top[0] + 0.07, top[1] - 0.012, top[1] + 0.012, top[2] - 0.02, top[2] + 0.02, GM.dark);
    } else {
      // handle on the floor, head up against the wall
      const bot = [x, fy, z0];
      rod(bot, top, 0.014, GM.handle);
      const hz = top[2];
      if (k === 'rake') {
        box(x - 0.2, x + 0.2, 0.15, 0.17, hz - 0.01, hz + 0.02, GM.steel);
        for (let i = 0; i < 12; i++)
          box(x - 0.19 + i * 0.035, x - 0.185 + i * 0.035, 0.15, 0.2, hz - 0.08, hz, GM.steel);
      } else if (k === 'hoe') box(x - 0.08, x + 0.08, 0.15, 0.22, hz, hz + 0.012, GM.rust);
      else if (k === 'broom') {
        box(x - 0.2, x + 0.2, 0.14, 0.2, hz, hz + 0.05, GM.wood);
        box(x - 0.19, x + 0.19, 0.145, 0.195, hz + 0.05, hz + 0.13, GM.dark);
      }
    }
  }
}
// south-east corner: bags of potting soil and two old tyres
{
  box(3.0, 3.6, 0.15, 0.55, Z0, Z0 + 0.14, GM.sack);
  box(3.05, 3.62, 0.2, 0.6, Z0 + 0.14, Z0 + 0.27, GM.green);
  box(3.0, 3.55, 0.14, 0.52, Z0 + 0.27, Z0 + 0.39, GM.sack);
  for (const z of [Z0, Z0 + 0.19]) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.085, 8, 20), GM.dark);
    t.rotation.x = -Math.PI / 2;
    t.position.copy(V(3.55, 0.48, z + 0.09));
    scene.add(tagPh(t));
  }
  col(2.98, 3.88, 0.12, 0.8, Z0, Z0 + 0.6);
}
// the wheelbarrow along the west wall north of the shelf: green tray, wheel to the north, handles south
{
  const x = 0.44,
    y0 = 2.25;
  // the tray: a bottom and four sloping steel sides, open at the top, a rolled rim
  {
    const ty = y0 + 0.75,
      zb = Z0 + 0.36,
      zt = Z0 + 0.62,
      bw = 0.17,
      bl = 0.25,
      tw = 0.31,
      tl = 0.45;
    box(x - bw, x + bw, ty - bl, ty + bl, zb - 0.012, zb, GM.green);
    for (const s of [-1, 1]) {
      beam([x + s * bw, ty, zb], [x + s * tw, ty, zt], bl + tl, 0.012, GM.green, { cast: false });
      beam([x, ty + s * bl, zb], [x, ty + s * tl, zt], bw + tw, 0.012, GM.green, { cast: false });
      rod([x + s * tw, ty - tl, zt], [x + s * tw, ty + tl, zt], 0.012, GM.green);
      rod([x - tw, ty + s * tl, zt], [x + tw, ty + s * tl, zt], 0.012, GM.green);
    }
  }
  const w = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.07, 16), GM.dark);
  w.rotation.z = Math.PI / 2;
  w.position.copy(V(x, y0 + 1.3, Z0 + 0.17));
  scene.add(tagPh(w));
  for (const s of [-1, 1]) {
    rod([x + s * 0.06, y0 + 1.3, Z0 + 0.17], [x + s * 0.24, y0 + 0.2, Z0 + 0.5], 0.014, GM.dark);
    rod([x + s * 0.24, y0 + 0.2, Z0 + 0.5], [x + s * 0.26, y0 - 0.12, Z0 + 0.58], 0.016, GM.handle);
    rod([x + s * 0.2, y0 + 0.55, Z0 + 0.4], [x + s * 0.2, y0 + 0.5, Z0], 0.012, GM.dark);
  }
  col(x - 0.32, x + 0.32, y0 - 0.12, y0 + 1.48, Z0, Z0 + 0.66);
}
// on the east wall north of the shelf: a bow saw and the hose reel
{
  rod([3.885, 2.85, Z0 + 1.35], [3.885, 3.55, Z0 + 1.35], 0.006, GM.steel);
  const bow = new THREE.Mesh(new THREE.TorusGeometry(0.36, 0.012, 6, 20, Math.PI), GM.red);
  bow.rotation.y = Math.PI / 2;
  bow.position.copy(V(3.885, 3.2, Z0 + 1.35));
  scene.add(tagPh(bow));
  // the garden hose wound on its wall holder
  box(3.84, 3.9, 3.18, 3.32, Z0 + 0.82, Z0 + 1.12, GM.dark);
  box(3.7, 3.86, 3.22, 3.28, Z0 + 1.08, Z0 + 1.12, GM.dark);
  for (let i = 0; i < 4; i++) {
    const t = new THREE.Mesh(new THREE.TorusGeometry(0.15 - i * 0.004, 0.022, 6, 22), GM.green);
    t.rotation.y = Math.PI / 2;
    t.position.copy(V(3.74 + i * 0.03, 3.25, Z0 + 0.95));
    scene.add(tagPh(t));
  }
}
phase(null);
// ======================= from phase 1: the same garage at the south end of the garden, the store for the Klingenholz =======================
// (garden/env.js built it as a closed box until 23.10.2026) Corrugated walls on a plank floor over concrete pads, the flat roof with its two
// PV modules, the north end open under a lintel with a rail and the two sliding leaves; inside boards stacked on stickers along the walls,
// the mower's and the cans' places by the door. A movable building ('garage' – plan view). Local frame (garden/site_base.js): x across
// (≈ east), y along it (≈ north: the door), z up.
const SB = (() => {
  const r = S0.garage,
    c = [(r[0][0] + r[2][0]) / 2, (r[0][1] + r[2][1]) / 2],
    hy = Math.hypot(r[3][0] - r[0][0], r[3][1] - r[0][1]) / 2,
    hx = Math.hypot(r[1][0] - r[0][0], r[1][1] - r[0][1]) / 2,
    azN = (Math.atan2(r[3][0] - r[0][0], r[3][1] - r[0][1]) * 180) / Math.PI;
  return { b: { c, az: azN + 90 }, hx, hy, azN, zf: 0.14, zw: 0.14 + 2.2, op: 1.1 };
})();
phase(PHN.garage);
bldBegin('garage', 'Blechgarage', SB.b.c, { short: 'Garage', pad: 0.2 });
const SUED = (() => {
  const { b, hx, hy, zf, zw, op } = SB,
    g = siteGroup(b),
    r = rotDesc(b),
    T = 0.06,
    G = (x0, x1, y0, y1, z0, z1, m, o = {}) => gB(g, x0, x1, y0, y1, z0, z1, m, Object.assign({ cast: false }, o));
  // concrete pads, joists, plank floor (walkable)
  for (const x of [-hx + 0.2, hx - 0.2])
    for (const y of [-hy + 0.25, 0, hy - 0.25]) G(x - 0.2, x + 0.2, y - 0.2, y + 0.2, 0, 0.06, MAT.conc);
  for (const x of [-hx + 0.2, 0, hx - 0.2]) G(x - 0.05, x + 0.05, -hy, hy, 0.06, zf - 0.03, MAT.kvh, { grain: 'y' });
  G(-hx, hx, -hy, hy, zf - 0.03, zf, MAT.plank, { grain: 'y' });
  lwalk(r, -hx, hx, -hy, hy, zf, 'wood');
  // walls (ribs upright); the north end beside and above the opening
  const W = (x0, x1, y0, y1) => {
    G(x0, x1, y0, y1, zf - 0.03, zw, MAT.metal, { grain: 'z', cast: true });
    lcol(r, x0, x1, y0, y1, zf - 0.03, zw, 'wall');
  };
  W(-hx, -hx + T, -hy, hy);
  W(hx - T, hx, -hy, hy);
  W(-hx + T, hx - T, -hy, -hy + T);
  W(-hx + T, -op, hy - T, hy);
  W(op, hx - T, hy - T, hy);
  G(-op, op, hy - T, hy, zf + 1.98, zw, MAT.metal, { grain: 'z', cast: true });
  for (const [x, y] of [
    [-hx, -hy],
    [hx - 0.06, -hy],
    [-hx, hy - 0.06],
    [hx - 0.06, hy - 0.06],
  ])
    G(x, x + 0.06, y, y + 0.06, zf - 0.03, zw + 0.02, MAT.galv, { grain: 'z' });
  G(-op - 0.05, -op, hy - 0.12, hy + 0.01, zf, zf + 1.98, MAT.galv, { grain: 'z' });
  G(op, op + 0.05, hy - 0.12, hy + 0.01, zf, zf + 1.98, MAT.galv, { grain: 'z' });
  G(-op - 0.05, op + 0.05, hy - 0.12, hy + 0.01, zf + 1.93, zf + 1.98, MAT.galv, { grain: 'x' });
  // flat roof with the two PV modules (as before)
  G(-hx - 0.1, hx + 0.1, -hy - 0.12, hy + 0.12, zw, zw + 0.06, MAT.roofGrey, { cast: true });
  for (const y of [-1.0, 0.9]) {
    G(-0.58, 0.58, y - 0.88, y + 0.88, zw + 0.06, zw + 0.1, MAT.pvframe);
    G(-0.55, 0.55, y - 0.85, y + 0.85, zw + 0.1, zw + 0.12, MAT.pv, { cast: true });
  }
  // the rail beyond both sides of the opening, on brackets, and the leaves
  const zr = zf + 2.06;
  G(-op * 2 - 0.2, op * 2 + 0.2, hy + 0.01, hy + 0.095, zr, zr + 0.065, MAT.galv, { grain: 'x', cast: true });
  for (const x of [-op * 2 - 0.1, -op * 0.6, op * 0.6, op * 2 + 0.1])
    G(x - 0.03, x + 0.03, hy, hy + 0.095, zr + 0.065, zr + 0.11, MAT.galv);
  const lv = mkLeaves({
    parent: g,
    keys: ['suedW', 'suedO'],
    xm: 0,
    w: op + 0.05,
    y0: hy + 0.02,
    y1: hy + 0.072,
    z0: zf + 0.025,
    z1: zf + 2.02,
    zr,
    travel: op + 0.05,
  });
  // the store: boards on stickers, stacked along both long walls on bearers; a few beams standing at the back
  const stack = (x0, x1, y0, y1, n, seed) => {
    const R = (
      s => () =>
        ((s = (s * 16807) % 2147483647) - 1) / 2147483646
    )(seed);
    for (const y of [y0 + 0.15, (y0 + y1) / 2, y1 - 0.15])
      G(x0, x1, y - 0.05, y + 0.05, zf, zf + 0.1, MAT.kvh, { grain: 'x' });
    let z = zf + 0.1;
    for (let i = 0; i < n; i++) {
      const t = 0.026 + R() * 0.026;
      let x = x0;
      while (x < x1 - 0.08) {
        const w = Math.min(x1 - x, 0.12 + R() * 0.12);
        G(x, x + w - 0.012, y0 + R() * 0.06, y1 - R() * 0.06, z, z + t, MAT.larch, { grain: 'y' });
        x += w;
      }
      z += t;
      if (i < n - 1)
        for (const y of [y0 + 0.15, (y0 + y1) / 2, y1 - 0.15])
          G(x0 + 0.02, x1 - 0.02, y - 0.012, y + 0.012, z, z + 0.022, MAT.kvh, { grain: 'x' });
      z += 0.022;
    }
    lcol(r, x0, x1, y0, y1, zf, z, 'holz');
  };
  stack(-hx + 0.12, -0.7, -hy + 0.15, 1.5, 16, 71);
  stack(0.7, hx - 0.12, -hy + 0.15, 0.8, 12, 72);
  for (let i = 0; i < 5; i++) {
    const x = -0.45 + i * 0.2;
    beam([x, -hy + 0.1, zf], [x + 0.05, -hy + 0.3, zf + 2.0], 0.1, 0.1, MAT.kvh, { cast: false, parent: g });
  }
  lcol(r, -0.55, 0.55, -hy + 0.06, -hy + 0.35, zf, zf + 2.0, 'holz');
  return { g, r, leaves: lv };
})();
bldEnd({ c: SB.b.c, az: SB.azN + 180, L: SB.hy * 2, W: SB.hx * 2 });
phase(null);
// ======================= models: the mower and the petrol can (garden/garage_play.js uses them) =======================
// colours outdoors (they leave the garage)
const MM = {
  deck: plain({ color: 0x2f6a35, roughness: 0.45, metalness: 0.3 }),
  black: plain({ color: 0x1b1b1a, roughness: 0.6 }),
  tyre: plain({ color: 0x232322, roughness: 0.92 }),
  engine: plain({ color: 0x8a8f93, roughness: 0.5, metalness: 0.6 }),
  hub: plain({ color: 0xb8bdc0, roughness: 0.4, metalness: 0.7 }),
  bag: plain({ color: 0x2e3a2c, roughness: 0.95 }),
  cap: plain({ color: 0xe0b020, roughness: 0.5 }),
  red: plain({ color: 0xb8241c, roughness: 0.4, metalness: 0.05 }),
  redDark: plain({ color: 0x7a1912, roughness: 0.5 }),
};
// a petrol push mower (local frame: x right, y forward, z up; origin on the ground under the middle of the deck): green steel deck, four
// wheels, a grey engine with a black starter cover, a grass catcher behind, the handle back to the grip at y −0.98, z 0.93 with the safety bar
export const MOWER = { grip: [0, -0.98, 0.93], deck: [0.56, 0.6], len: 1.9 };
export function mkMower() {
  const g = new THREE.Group(),
    body = new THREE.Group(),
    wheels = [];
  g.add(body);
  const add = (geo, m, x, y, z, o = {}) => {
    const me = new THREE.Mesh(geo, m);
    me.position.copy(V(x, y, z));
    if (o.rz) me.rotation.z = o.rz;
    if (o.rx) me.rotation.x = o.rx;
    if (o.ry) me.rotation.y = o.ry;
    me.castShadow = true;
    me.receiveShadow = true;
    (o.to || body).add(me);
    return me;
  };
  // deck: a rounded shell, a skirt, the chute at the back
  add(new RoundedBoxGeometry(0.54, 0.16, 0.58, 3, 0.06), MM.deck, 0, 0.0, 0.17);
  add(new THREE.BoxGeometry(0.56, 0.05, 0.6), MM.deck, 0, 0, 0.085);
  add(new THREE.BoxGeometry(0.3, 0.08, 0.06), MM.black, 0, -0.31, 0.16);
  // engine: block, starter cover, air filter, fuel cap, muffler
  add(new THREE.CylinderGeometry(0.12, 0.13, 0.12, 18), MM.engine, 0.0, 0.03, 0.31);
  add(new THREE.CylinderGeometry(0.13, 0.125, 0.09, 18), MM.black, 0.0, 0.03, 0.415);
  add(new THREE.BoxGeometry(0.1, 0.1, 0.12), MM.black, -0.13, 0.06, 0.34);
  add(new THREE.CylinderGeometry(0.03, 0.03, 0.03, 12), MM.cap, 0.1, -0.04, 0.38);
  add(new THREE.BoxGeometry(0.07, 0.07, 0.1), MM.engine, 0.15, 0.13, 0.29);
  // wheels with hubs
  for (const [x, y, r] of [
    [-0.3, 0.2, 0.09],
    [0.3, 0.2, 0.09],
    [-0.3, -0.21, 0.1],
    [0.3, -0.21, 0.1],
  ]) {
    const w = new THREE.Group();
    w.position.copy(V(x, y, r));
    g.add(w);
    const t = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.045, 16), MM.tyre);
    t.rotation.z = Math.PI / 2;
    t.castShadow = true;
    w.add(t);
    const h = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.45, r * 0.45, 0.05, 12), MM.hub);
    h.rotation.z = Math.PI / 2;
    w.add(h);
    for (let i = 0; i < 3; i++) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(0.052, r * 1.5, 0.012), MM.hub);
      s.rotation.x = (i * Math.PI) / 3;
      w.add(s);
    }
    mergeByMat(w);
    wheels.push({ g: w, r });
  }
  // grass catcher between the handle bars
  add(new THREE.BoxGeometry(0.4, 0.28, 0.42), MM.bag, 0, -0.55, 0.3);
  add(new THREE.BoxGeometry(0.42, 0.04, 0.44), MM.deck, 0, -0.55, 0.46);
  add(new THREE.BoxGeometry(0.1, 0.03, 0.04), MM.black, 0, -0.33, 0.49);
  // handle: two tubes from the back of the deck up to the grip, a cross brace, the safety bar, the starter rope's grip on the right tube
  const tube = (p, q, r, m) => {
    const a = V(...p),
      b = V(...q),
      d = b.clone().sub(a),
      L = d.length(),
      me = new THREE.Mesh(new THREE.CylinderGeometry(r, r, L, 8), m);
    me.position.copy(a).addScaledVector(d, 0.5);
    me.quaternion.setFromUnitVectors(_up, d.normalize());
    me.castShadow = true;
    body.add(me);
    return me;
  };
  const G = MOWER.grip;
  for (const s of [-1, 1]) {
    tube([s * 0.22, -0.27, 0.2], [s * 0.235, -0.62, 0.55], 0.012, MM.black);
    tube([s * 0.235, -0.62, 0.55], [s * 0.24, G[1], G[2]], 0.012, MM.black);
  }
  tube([-0.24, G[1], G[2]], [0.24, G[1], G[2]], 0.016, MM.black);
  tube([-0.235, -0.66, 0.6], [0.235, -0.66, 0.6], 0.009, MM.black);
  tube([-0.22, G[1] + 0.05, G[2] - 0.03], [0.22, G[1] + 0.05, G[2] - 0.03], 0.008, MM.red);
  for (const s of [-1, 1])
    tube([s * 0.22, G[1] + 0.05, G[2] - 0.03], [s * 0.235, G[1] + 0.02, G[2] - 0.1], 0.007, MM.red);
  add(new THREE.BoxGeometry(0.08, 0.025, 0.03), MM.black, 0.27, -0.72, 0.66);
  tube([0.27, -0.72, 0.66], [0.06, 0.04, 0.42], 0.003, MM.black);
  mergeByMat(body);
  g.traverse(o => {
    if (o.isMesh) o.userData.noMerge = true;
  });
  return { g, body, wheels };
}
// the red 10 l petrol can (plastic): body, handle on top, the spout cap at the front corner; origin on the ground under its middle,
// long side along local y
export function mkPetrolCan(s = 1) {
  const g = new THREE.Group();
  const add = (geo, m, x, y, z) => {
    const me = new THREE.Mesh(geo, m);
    me.position.copy(V(x * s, y * s, z * s));
    me.scale.setScalar(s);
    me.castShadow = true;
    me.receiveShadow = true;
    g.add(me);
    return me;
  };
  add(new RoundedBoxGeometry(0.15, 0.28, 0.3, 2, 0.025), MM.red, 0, 0, 0.14);
  add(new RoundedBoxGeometry(0.035, 0.05, 0.16, 1, 0.012), MM.red, 0, -0.01, 0.305);
  add(new RoundedBoxGeometry(0.035, 0.05, 0.03, 1, 0.01), MM.red, 0, -0.07, 0.29);
  add(new RoundedBoxGeometry(0.035, 0.05, 0.03, 1, 0.01), MM.red, 0, 0.05, 0.29);
  add(new THREE.CylinderGeometry(0.022, 0.024, 0.04, 12), MM.black, 0, 0.105, 0.3);
  add(new THREE.BoxGeometry(0.152, 0.004, 0.2), MM.redDark, 0, 0.0, 0.12);
  mergeByMat(g);
  g.traverse(o => {
    if (o.isMesh) o.castShadow = o.receiveShadow = true;
  });
  return g;
}
// Hubert's diesel can (the metal jerrycan model of game/quests.js): repainted olive, the rust stays
export function oliveCan(root) {
  root.traverse(o => {
    if (!o.isMesh || !o.material || !o.material.map || !o.material.map.image) return;
    try {
      const img = o.material.map.image,
        w = img.width,
        h = img.height,
        c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      const q = c.getContext('2d');
      q.drawImage(img, 0, 0);
      const d = q.getImageData(0, 0, w, h),
        a = d.data;
      for (let i = 0; i < a.length; i += 4) {
        const r = a[i],
          gg = a[i + 1],
          b = a[i + 2],
          red = r - (gg + b) / 2,
          L = 0.3 * r + 0.59 * gg + 0.11 * b,
          k = Math.min(1, Math.max(0, (red - 25) / 50)),
          f = L / 95;
        a[i] = r + (92 * f - r) * k;
        a[i + 1] = gg + (100 * f - gg) * k;
        a[i + 2] = b + (55 * f - b) * k;
      }
      q.putImageData(d, 0, 0);
      const t = new THREE.CanvasTexture(c);
      t.colorSpace = THREE.SRGBColorSpace;
      t.flipY = o.material.map.flipY;
      t.wrapS = o.material.map.wrapS;
      t.wrapT = o.material.map.wrapT;
      t.anisotropy = ANISO;
      o.material = o.material.clone();
      o.material.map = t;
    } catch (e) {
      console.warn('olive can', e);
    }
  });
  return root;
}
// ======================= where the things stand =======================
// the two garages: the old one on the slab (phase 0; its frame is the site's) and the one at the south end (from phase 1; its frame follows
// the building when it is moved in the plan view – BUILD.garage.tf). Per garage: toW/toL between its frame and the site, axes, inside,
// the door (opening x0..x1 at the outside face y), the leaves, home places in its frame ([lx, ly, compass degrees in the frame])
const sW = (lx, ly) => {
  const w = worldOf(SB.b, lx, ly),
    Bg = BUILD.garage;
  return Bg ? Bg.tf(w[0], w[1]) : w;
};
const sAxes = () => {
  const o = sW(0, 0),
    x = sW(1, 0),
    y = sW(0, 1);
  return { o, ax: [x[0] - o[0], x[1] - o[1]], ay: [y[0] - o[0], y[1] - o[1]] };
};
const GAR = {
  alt: {
    id: 'alt',
    ph: [PHN.bestand, PHN.garage],
    leaves,
    toW: (x, y) => [x, y],
    toL: (x, y) => [x, y],
    axes: () => ({ o: [0, 0], ax: [1, 0], ay: [0, 1] }),
    inside: (lx, ly) => lx > 0.1 && lx < 3.9 && ly > 0.1 && ly < 3.9,
    door: { x0: OP.x0, x1: OP.x1, y: 3.98 },
    zf: Z0,
    home: { mower: [2.0, 2.78, 0], petrol: [3.63, 3.12, 0], diesel: [3.62, 3.6, 90] },
    bare: { c: [2.0, 5.0], hx: 1.35, hy: 0.9 },
  },
  sued: {
    id: 'sued',
    ph: [PHN.garage, 1e9],
    leaves: SUED.leaves,
    toW: sW,
    toL: (x, y) => {
      const { o, ax, ay } = sAxes(),
        dx = x - o[0],
        dy = y - o[1];
      return [dx * ax[0] + dy * ax[1], dx * ay[0] + dy * ay[1]];
    },
    axes: sAxes,
    inside: (lx, ly) => Math.abs(lx) < SB.hx - 0.06 && Math.abs(ly) < SB.hy - 0.06,
    door: { x0: -SB.op, x1: SB.op, y: SB.hy },
    zf: SB.zf,
    home: { mower: [0, SB.hy - 1.3, 0], petrol: [1.12, SB.hy - 0.45, 0], diesel: [1.12, SB.hy - 0.95, 90] },
    bare: { c: [0, SB.hy + 0.9], hx: SB.op + 0.25, hy: 0.85 },
  },
};
for (const G of Object.values(GAR)) for (const L of G.leaves) L.gar = G;
// the heading (compass degrees) of a garage's local +y – its door side
const headOf = G => {
  const { ay } = G.axes();
  return (Math.atan2(ay[0], ay[1]) * 180) / Math.PI;
};
export const GARAGE = {
  GAR,
  leaves: [...GAR.alt.leaves, ...GAR.sued.leaves],
  tube: TUBE,
  light: [2.0, 2.0, HW - 0.16], // where the tube's light shines from
  switch: [0.55, 3.86, Z0 + 1.36],
  Z0,
  OP,
  LEAF,
  // the garage standing in phase ph
  at: ph => (ph <= PHN.bestand ? GAR.alt : GAR.sued),
  // inside the old garage (site coordinates)
  inside: (x, y) => GAR.alt.inside(x, y),
  // inside the garage of phase ph
  insideAt(ph, x, y) {
    const G = GARAGE.at(ph),
      l = G.toL(x, y);
    return G.inside(l[0], l[1]);
  },
  headOf,
  // home(phase): where the mower (deck middle, heading in compass degrees), the petrol can and the diesel can stand: [x, y, z, az]
  home(ph) {
    const G = GARAGE.at(ph),
      hd = headOf(G),
      o = {};
    for (const k of ['mower', 'petrol', 'diesel']) {
      const [lx, ly, a] = G.home[k],
        w = G.toW(lx, ly);
      o[k] = [w[0], w[1], G.zf, a + hd];
    }
    return o;
  },
  // the worn patch in front of the door of the garage of phase ph: a rect for GRASS.bare
  bare(ph) {
    const G = GARAGE.at(ph);
    return { c: G.toW(G.bare.c[0], G.bare.c[1]), az: headOf(G) + 90, hx: G.bare.hx, hy: G.bare.hy };
  },
};
window.GARAGE = GARAGE;
