// ---------- the garden of today: the small things on Falko's photos of 26.10.2026 (placed where the photos see them, ±1–2 m) ----------
// A brush pile in the meadow, the white plastic table with two chairs and the pink parasol on the lawn west of the washhouse, the rusty
// clothes-line pole; along the field path (Falko 30.10.: beside it, not on it) the board stack under a white tarpaulin on the garden side
// and the logs on the field side – two long ones, a pile of short ones further west. (The painted boards are the washhouse's front: garden/washhouse.js.) Plain materials
// of the kind the garden has (no new shader programs); colliders where one would bump into them.
import * as THREE from 'three';
import { rnd, rr, scene } from '../core/head.js';
import { plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { B, beam, COL, cyl, phase, tagPh } from '../core/geo.js';
import { S0 } from './env.js';
import { STREAM } from './stream_geo.js';
import { GSEATS } from './garten_kit.js';
import { FENCE_MAT } from './fences.js';
import { worldOf } from './site_base.js';
phase(null);
const white = plain({ color: 0xf1f1ec, roughness: 0.5 }),
  pink = plain({ color: 0xd98fa0, roughness: 0.8, side: THREE.DoubleSide }),
  tarp = plain({ color: 0xdcdcd4, roughness: 0.8 }),
  twig = plain({ color: 0x5a4a3a, roughness: 0.9 });
// ---- brush pile: twigs and boards criss-cross on a low dark mound ----
{
  const [x, y] = [-2.5, 7.6];
  cyl(x, y, 0, 0.2, 0.5, plain({ color: 0x3b3328, roughness: 1 }), 12, 0.75, { col: false });
  for (let i = 0; i < 16; i++) {
    const a = rnd() * Math.PI,
      L = rr(0.8, 1.6),
      cx = x + rr(-0.45, 0.45),
      cy = y + rr(-0.45, 0.45),
      z = rr(0.18, 0.6);
    beam(
      [cx - (Math.cos(a) * L) / 2, cy - (Math.sin(a) * L) / 2, z],
      [cx + (Math.cos(a) * L) / 2, cy + (Math.sin(a) * L) / 2, z + rr(-0.15, 0.2)],
      0.03,
      0.03,
      i % 2 ? twig : MAT.plank,
      { cast: true }
    );
  }
}
// ---- white plastic table, two chairs and the pink parasol ----
{
  const [x, y] = [9.3, 3.7]; // in front of the washhouse's painted front, south-west of the bungalow (photos 7236, 7237)
  cyl(x, y, 0.7, 0.73, 0.55, white, 24);
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + 0.4;
    beam(
      [x + Math.cos(a) * 0.4, y + Math.sin(a) * 0.4, 0],
      [x + Math.cos(a) * 0.22, y + Math.sin(a) * 0.22, 0.7],
      0.04,
      0.04,
      white
    );
  }
  COL.push([x - 0.5, x + 0.5, y - 0.5, y + 0.5, 0, 0.73, 'table', null, null]);
  for (const [cx, cy, f] of [
    [x + 0.95, y + 0.2, 1],
    [x - 0.8, y - 0.55, -1],
  ]) {
    B(cx - 0.24, cx + 0.24, cy - 0.24, cy + 0.24, 0.42, 0.46, white);
    B(cx + f * 0.2, cx + f * 0.24, cy - 0.24, cy + 0.24, 0.46, 0.9, white, { col: false });
    for (const [dx, dy] of [
      [-0.2, -0.2],
      [0.2, -0.2],
      [-0.2, 0.2],
      [0.2, 0.2],
    ])
      B(cx + dx - 0.02, cx + dx + 0.02, cy + dy - 0.02, cy + dy + 0.02, 0, 0.42, white, { col: false });
  }
  // the parasol beside it, closed – south-west of the table (7227, 7236, 7237, 7244: right of the table seen from the west and from the north-east)
  const px = x - 0.35,
    py = y - 0.85;
  cyl(px, py, 0, 2.05, 0.02, MAT.steel, 8, undefined, { col: false });
  cyl(px, py, 1.0, 2.05, 0.03, pink, 12, 0.16, { col: false });
}
// ---- the old clothes-line pole, rusty steel with a crossbar, by the lawn west of the washhouse (photo 7239) ----
{
  const [x, y] = [8.9, 0.2],
    rust = plain({ color: 0x7a4a33, roughness: 0.85, metalness: 0.3 });
  cyl(x, y, 0, 2.25, 0.035, rust, 10);
  beam([x - 0.02, y, 2.2], [x + 0.75, y + 0.02, 2.2], 0.04, 0.04, rust);
  beam([x, y, 1.75], [x + 0.45, y + 0.01, 2.18], 0.03, 0.03, rust, { cast: false });
}
// ---- along the field path (site.js path: the OSM track past the garden, heading 117°): s along it from its west end, o across (+ field side)
const [PA, PB] = S0.path,
  PL = Math.hypot(PB[0] - PA[0], PB[1] - PA[1]),
  U = [(PB[0] - PA[0]) / PL, (PB[1] - PA[1]) / PL],
  N = [-U[1], U[0]];
const at = (s, o, z = 0) => [PA[0] + U[0] * s + N[0] * o, PA[1] + U[1] * s + N[1] * o, z];
// colliders along a member lying parallel to the path: one box per metre
function colAlong(s0, s1, o, half, z1, tag) {
  for (let s = s0; s < s1 - 1e-6; s += 1) {
    const [x0, y0] = at(s, o),
      [x1, y1] = at(Math.min(s + 1, s1), o);
    COL.push([
      Math.min(x0, x1) - half,
      Math.max(x0, x1) + half,
      Math.min(y0, y1) - half,
      Math.max(y0, y1) + half,
      0,
      z1,
      tag,
      null,
      null,
    ]);
  }
}
// ---- the board stack under a white tarpaulin on the garden side of the path, along it (photos 7186, 7187) ----
{
  const s = 17.0,
    o = -3.0,
    L = 3.6,
    w = 1.25,
    h = 1.1;
  for (const ds of [-1.3, 0, 1.3])
    beam(at(s + ds, o - w / 2 - 0.05, 0.06), at(s + ds, o + w / 2 + 0.05, 0.06), 0.1, 0.12, MAT.kvh);
  beam(
    at(s - L / 2 + 0.1, o, 0.12 + (h - 0.2) / 2),
    at(s + L / 2 - 0.1, o, 0.12 + (h - 0.2) / 2),
    w - 0.1,
    h - 0.2,
    MAT.plank
  );
  beam(at(s - L / 2, o, h - 0.04), at(s + L / 2, o, h - 0.04), w + 0.06, 0.06, tarp, { bevel: 0.02 });
  for (const side of [-1, 1])
    beam(
      at(s - L / 2, o + side * (w / 2 + 0.02), h * 0.62),
      at(s + L / 2, o + side * (w / 2 + 0.02), h * 0.62),
      0.02,
      h * 0.68,
      tarp,
      {
        cast: false,
      }
    );
  for (const e of [-1, 1])
    beam(
      at(s + e * (L / 2 + 0.01), o - w / 2, h * 0.7),
      at(s + e * (L / 2 + 0.01), o + w / 2, h * 0.7),
      0.02,
      h * 0.55,
      tarp,
      { cast: false }
    );
  colAlong(s - L / 2, s + L / 2, o, w / 2 + 0.05, h, 'boards');
}
// ---- the logs on the field side of the path, along it (photos 7188, 7189): two long ones on cross pieces, a pile of short ones further west ----
{
  const s0 = 9.5,
    L = 9.0;
  for (const ds of [1.2, L - 1.2])
    beam(at(s0 + ds, 2.7, 0.07), at(s0 + ds, 4.3, 0.07), 0.14, 0.14, MAT.kvh, { cast: false });
  for (const [o, d] of [
    [3.15, 0.62],
    [3.85, 0.55],
  ])
    beam(at(s0, o, 0.14 + d / 2), at(s0 + L, o, 0.14 + d / 2), d, d, MAT.logs, { bevel: d * 0.45, cast: true });
  colAlong(s0, s0 + L, 3.5, 0.75, 0.76, 'logs');
  // the short ones: three below, two on top, 4 m long
  const s1 = 2.0,
    L2 = 4.0;
  for (const [o, z, d] of [
    [3.0, 0, 0.4],
    [3.42, 0, 0.38],
    [3.84, 0, 0.42],
    [3.21, 0.36, 0.36],
    [3.63, 0.36, 0.4],
  ])
    beam(at(s1 + rr(-0.15, 0.15), o, z + d / 2), at(s1 + L2 + rr(-0.15, 0.15), o, z + d / 2), d, d, MAT.logs, {
      bevel: d * 0.45,
      cast: true,
    });
  colAlong(s1, s1 + L2, 3.42, 0.65, 0.76, 'logs');
}
// ---- the slab terrace at the brook west of the gate (photos 7204–7207): grey concrete slabs on the garden side, the steps down to the
// water at its north-east corner (garden/stream.js), on its west side the green bench with a little table between its two seats, a
// terracotta pot, a white plastic chair at the bank, a lantern and two grave lights by the steps ----
{
  const T = STREAM.TERR,
    u = STREAM.U, // along the brook (east-south-east)
    n = [-STREAM.N[0], -STREAM.N[1]], // towards the brook
    tp = (dt, dn, z = 0) => {
      const [x, y] = STREAM.wpt(T.t + dt, T.o - dn);
      return [x, y, z];
    }; // dt along the brook, dn towards it, from the terrace's centre
  const box = (dt0, dt1, dn0, dn1, z0, z1, m, o = {}) =>
    beam(tp(dt0, (dn0 + dn1) / 2, (z0 + z1) / 2), tp(dt1, (dn0 + dn1) / 2, (z0 + z1) / 2), dn1 - dn0, z1 - z0, m, o);
  const colBox = (dt0, dt1, dn0, dn1, z1, tag) => {
    const P = [tp(dt0, dn0), tp(dt1, dn0), tp(dt0, dn1), tp(dt1, dn1)];
    COL.push([
      Math.min(...P.map(q => q[0])),
      Math.max(...P.map(q => q[0])),
      Math.min(...P.map(q => q[1])),
      Math.max(...P.map(q => q[1])),
      0,
      z1,
      tag,
      null,
      null,
    ]);
  };
  // 5 × 5 slabs of 44 cm, a few a shade lighter or darker, sunk to 2 cm above the lawn
  const SLABS = [0xa9a8a2, 0x9d9b94, 0xb3b1aa].map(c => plain({ color: c, roughness: 0.92 }));
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 5; j++) {
      const c0 = -T.ht + i * 0.44 + 0.01,
        d0 = -T.ho + j * 0.44 + 0.01;
      box(c0, c0 + 0.42, d0, d0 + 0.42, -0.03, 0.02, SLABS[(i * 7 + j * 3) % 3], { cast: false });
    }
  // the bench: two seats and the table between, along the terrace's west edge, backrest to the west; green paint
  const green = plain({ color: 0x3f8f45, roughness: 0.55 }),
    bt = -T.ht - 0.38; // the bench's middle line
  for (const [d0, d1] of [
    [-0.95, -0.3],
    [0.3, 0.95],
  ]) {
    for (const k of [-1, 0, 1]) box(bt + k * 0.13 - 0.05, bt + k * 0.13 + 0.05, d0, d1, 0.41, 0.44, green); // seat slats
    for (const z of [0.6, 0.76]) box(bt - 0.24, bt - 0.2, d0, d1, z - 0.05, z + 0.05, green); // backrest boards
    for (const d of [d0 + 0.04, d1 - 0.04]) {
      box(bt - 0.2, bt + 0.2, d - 0.03, d + 0.03, 0.36, 0.41, green); // seat frame
      box(bt - 0.18, bt - 0.12, d - 0.03, d + 0.03, 0, 0.82, green, { cast: false }); // back leg up into the backrest
      box(bt + 0.14, bt + 0.2, d - 0.03, d + 0.03, 0, 0.41, green, { cast: false }); // front leg
    }
  }
  box(bt - 0.2, bt + 0.22, -0.28, 0.28, 0.6, 0.64, green); // the little table between the seats: a top over a box
  box(bt - 0.16, bt + 0.18, -0.24, 0.24, 0.12, 0.6, plain({ color: 0x48a24f, roughness: 0.55 }));
  colBox(bt - 0.26, bt + 0.24, -0.98, 0.98, 0.86, 'bench');
  GSEATS.push({
    key: 'bank-am-bach',
    b: { c: tp(0, 0), az: (Math.atan2(u[0], u[1]) * 180) / Math.PI },
    lx: bt + 0.02,
    ly: -0.62,
    eye: 0.43 + 0.72,
    yaw: 0,
    pitch: -8,
    kind: 'sit',
    label: 'Auf die Bank am Bach setzen',
    at: [bt + 0.3, -0.62],
    r: 1.3,
  });
  // terracotta pot with a green bottle at the bench's north end; the white plastic chair at the bank, facing the water
  {
    const [x, y] = tp(bt, T.ho + 0.15);
    cyl(x, y, 0, 0.26, 0.15, plain({ color: 0xb0603a, roughness: 0.9 }), 14, 0.2, { col: false });
    cyl(x + 0.04, y, 0.24, 0.5, 0.045, plain({ color: 0x3b7a4a, roughness: 0.3 }), 8, undefined, { col: false });
    COL.push([x - 0.2, x + 0.2, y - 0.2, y + 0.2, 0, 0.3, 'pot', null, null]);
  }
  {
    const ct = -0.95,
      cd = T.ho + 0.2,
      cream = plain({ color: 0xe9e2cc, roughness: 0.6 });
    box(ct - 0.23, ct + 0.23, cd - 0.24, cd + 0.2, 0.4, 0.44, cream); // seat
    box(ct - 0.23, ct + 0.23, cd - 0.3, cd - 0.25, 0.44, 0.9, cream, { cast: false }); // backrest on the garden side
    for (const [a, b2] of [
      [-0.21, -0.27],
      [0.21, -0.27],
      [-0.21, 0.18],
      [0.21, 0.18],
    ])
      box(ct + a - 0.015, ct + a + 0.015, cd + b2 - 0.015, cd + b2 + 0.015, 0, 0.42, MAT.steel, { cast: false });
    colBox(ct - 0.25, ct + 0.25, cd - 0.32, cd + 0.22, 0.9, 'chair');
  }
  // the lantern (grey metal, glass panes) at the terrace's north-east corner and two grave lights by the steps
  {
    const [x, y] = tp(0.35, T.ho - 0.12),
      grey = plain({ color: 0x6f7270, roughness: 0.5, metalness: 0.4 }),
      glass = plain({ color: 0xd6dcd8, roughness: 0.1, transparent: true, opacity: 0.35 });
    B(x - 0.11, x + 0.11, y - 0.11, y + 0.11, 0.02, 0.05, grey, { col: false });
    for (const [dx, dy] of [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ])
      B(x + dx * 0.1 - 0.01, x + dx * 0.1 + 0.01, y + dy * 0.1 - 0.01, y + dy * 0.1 + 0.01, 0.05, 0.33, grey, {
        col: false,
      });
    B(x - 0.095, x + 0.095, y - 0.095, y + 0.095, 0.06, 0.32, glass, { col: false, cast: false });
    cyl(x, y, 0.33, 0.45, 0.15, grey, 4, 0.02, { col: false });
    cyl(x, y, 0.45, 0.5, 0.02, grey, 6, undefined, { col: false });
    const glow = plain({ color: 0xf2f0e8, roughness: 0.3 }),
      cap = plain({ color: 0x9a9c9a, roughness: 0.4, metalness: 0.6 });
    for (const [dt, dn] of [
      [0.2, T.ho + 0.3],
      [1.25, T.ho + 0.35],
    ]) {
      const [gx, gy] = tp(dt, dn);
      const gz = STREAM.zAt(gx, gy);
      cyl(gx, gy, gz, gz + 0.11, 0.035, glow, 10, undefined, { col: false, cast: false });
      cyl(gx, gy, gz + 0.11, gz + 0.13, 0.037, cap, 10, undefined, { col: false, cast: false });
    }
  }
}

// ===================== round 3 (30.10.2026): what the photos of 26.10.2026 still showed (docs/plans/garten_fotos_abgleich.md) =====================
const rust = plain({ color: 0x7a4a33, roughness: 0.85, metalness: 0.3 }),
  greenM = plain({ color: 0x3f8f45, roughness: 0.55 });
// a member as a box between two site points (no collider)
const bar = (p, q, w, m, o = {}) => beam(p, q, w, w, m, Object.assign({ cast: false }, o));
// chain-link between two posts: a ribbon with the fence's wire mesh (garden/fences.js FENCE_MAT.mesh – no new program)
function meshRibbon(pts, z0, z1, topAbs = null) {
  const pos = [],
    uv = [],
    idx = [];
  let s = 0;
  pts.forEach((p, k) => {
    if (k) s += Math.hypot(p[0] - pts[k - 1][0], p[1] - pts[k - 1][1]);
    const za = (p[2] ?? 0) + z0,
      zb = topAbs ?? (p[2] ?? 0) + z1;
    pos.push(p[0], za, -p[1], p[0], zb, -p[1]);
    uv.push(s / 0.2, za / 0.2, s / 0.2, zb / 0.2);
    if (k) {
      const a = (k - 1) * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx);
  geo.computeVertexNormals();
  const me = new THREE.Mesh(geo, FENCE_MAT.mesh);
  me.renderOrder = 1;
  me.receiveShadow = true;
  me.userData.noMerge = true;
  return me;
}
// a thin wall collider along a member (rotated box, as the fences of garden/fences.js)
function colLine(a, b, z1, tag, ph0, ph1) {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
    ang = Math.atan2(b[1] - a[1], b[0] - a[0]);
  COL.push([
    -L / 2,
    L / 2,
    -0.05,
    0.05,
    0,
    z1,
    tag,
    ph0,
    ph1,
    { cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, c: Math.cos(ang), s: Math.sin(ang) },
  ]);
}
// ---- the fence along the field path (construction phase 0; photos 7176, 7187, 7197, 7198, 7200, 7213, 7214): chain-link 1.3 m high on
// concrete posts, on the path's side of the brook along the top of its bank, from the garden's north-west corner to the east boundary; at
// the slab over the culvert the double gate of rusty frames with chain-link, both leaves open into the garden over the banks (the drive of
// v16d:bridge passes between its posts); a short piece of chain-link across the brook west of the gate (7199, 7206) ----
phase(0, 1);
{
  const ST = STREAM,
    oF = t => ST.cOff(t) - ST.WT - 0.08, // just outside the top of the bank, path side
    P = t => {
      const [x, y] = ST.wpt(t, oF(t));
      return [x, y, 0];
    },
    G = 1.5, // half width of the gate opening (the tractor is 2.28 m wide)
    t0 = 13.5,
    t1 = 38.2,
    H = 1.3;
  const greyPost = MAT.conc;
  for (const [ta, tb] of [
    [t0, ST.TB - G],
    [ST.TB + G, t1],
  ]) {
    const n = Math.max(1, Math.ceil((tb - ta) / 2.6)),
      pts = [];
    for (let i = 0; i <= n * 3; i++) pts.push(P(ta + ((tb - ta) * i) / (n * 3)));
    scene.add(tagPh(meshRibbon(pts, 0.05, H)));
    for (let i = 0; i <= n; i++) {
      const [x, y] = P(ta + ((tb - ta) * i) / n),
        end = i === 0 || i === n;
      B(x - 0.055, x + 0.055, y - 0.055, y + 0.055, 0, H + 0.25, greyPost, { col: false, cast: true });
      if (end && ((i === n && tb < ST.TB) || (i === 0 && ta > ST.TB))) {
        // a strut from the gate post down to the ground, on the fence's side (7197)
        const q = P(i === 0 ? ta + 1.1 : tb - 1.1);
        bar([x, y, 1.0], [q[0], q[1], 0.02], 0.04, rust);
      }
    }
    for (let i = 0; i < pts.length - 1; i += 3) {
      bar([pts[i][0], pts[i][1], H - 0.02], [pts[i + 3][0], pts[i + 3][1], H - 0.02], 0.008, rust);
      bar([pts[i][0], pts[i][1], 0.08], [pts[i + 3][0], pts[i + 3][1], 0.08], 0.008, rust);
      colLine(pts[i], pts[i + 3], H, 'zaun0', 0, 1);
    }
  }
  // the two gate leaves: frames of rusty tube with chain-link, hinged at the posts, standing open into the garden (over the banks beside
  // the slab: the drive keeps clear)
  for (const sgn of [-1, 1]) {
    const tp = ST.TB + sgn * G,
      [hx, hy] = P(tp),
      along = [ST.U[0] * -sgn, ST.U[1] * -sgn], // closed: towards the gate's middle
      into = ST.N, // into the garden
      a = (100 * Math.PI) / 180,
      d = [along[0] * Math.cos(a) + into[0] * Math.sin(a), along[1] * Math.cos(a) + into[1] * Math.sin(a)],
      Lw = G - 0.05,
      e = [hx + d[0] * Lw, hy + d[1] * Lw];
    for (const z of [0.12, H - 0.04]) bar([hx, hy, z], [e[0], e[1], z], 0.04, rust);
    bar([hx, hy, 0.12], [hx, hy, H - 0.04], 0.04, rust);
    bar([e[0], e[1], 0.12], [e[0], e[1], H - 0.04], 0.04, rust);
    bar([hx, hy, 0.14], [e[0], e[1], H - 0.06], 0.025, rust); // the diagonal brace
    const rib = meshRibbon(
      [
        [hx + d[0] * 0.03, hy + d[1] * 0.03, 0],
        [e[0] - d[0] * 0.03, e[1] - d[1] * 0.03, 0],
      ],
      0.14,
      H - 0.06
    );
    scene.add(tagPh(rib));
    colLine([hx, hy], e, H, 'zaun0', 0, 1);
  }
  // chain-link across the brook, 2.6 m west of the gate's middle: two rusty posts in the banks, the mesh down to the water
  {
    const t = ST.TB - 2.6,
      c = ST.cOff(t),
      pa = ST.wpt(t, c - 1.15),
      pb = ST.wpt(t, c + 1.15),
      za = ST.zAt(pa[0], pa[1]),
      zb = ST.zAt(pb[0], pb[1]),
      zm = ST.WZ - 0.05,
      pts = [];
    for (let i = 0; i <= 8; i++) {
      const a = -1.15 + (2.3 * i) / 8,
        [x, y] = ST.wpt(t, c + a);
      pts.push([x, y, Math.max(zm, ST.zAt(x, y))]);
    }
    const rib = meshRibbon(pts, 0.0, 1.0, Math.max(za, zb) + 0.7); // from the ground in the ditch up to a level top
    scene.add(tagPh(rib));
    for (const [p, z] of [
      [pa, za],
      [pb, zb],
    ])
      bar([p[0], p[1], z - 0.2], [p[0], p[1], Math.max(za, zb) + 0.75], 0.045, rust);
    bar([pa[0], pa[1], Math.max(za, zb) + 0.7], [pb[0], pb[1], Math.max(za, zb) + 0.7], 0.03, rust);
  }
}
phase(null);
// ---- the green potting table at the brook (7199, 7206): a green metal stand with a white sink, pots and bowls on the top, a shelf below;
// on the garden-side top of the bank between the slab terrace and the gate, its back to the brook ----
{
  const t = STREAM.TB - 2.5,
    o = STREAM.cOff(t) + STREAM.WT + 0.6,
    [x, y] = STREAM.wpt(t, o),
    b = { c: [x, y], az: (Math.atan2(STREAM.U[0], STREAM.U[1]) * 180) / Math.PI }, // local x along the brook, y towards it
    W2 = (lx, ly) => worldOf(b, lx, ly),
    box = (lx0, lx1, ly0, ly1, z0, z1, m) => {
      const p = W2((lx0 + lx1) / 2, (ly0 + ly1) / 2);
      beam(
        [p[0] - (b.u[0] * (lx1 - lx0)) / 2, p[1] - (b.u[1] * (lx1 - lx0)) / 2, (z0 + z1) / 2],
        [p[0] + (b.u[0] * (lx1 - lx0)) / 2, p[1] + (b.u[1] * (lx1 - lx0)) / 2, (z0 + z1) / 2],
        ly1 - ly0,
        z1 - z0,
        m,
        { cast: z1 - z0 > 0.05 }
      );
    };
  b.u = STREAM.U;
  const sinkM = plain({ color: 0xf2f2ee, roughness: 0.35 }),
    terra = plain({ color: 0xb0603a, roughness: 0.9 }),
    blue = plain({ color: 0x5c86b8, roughness: 0.5 });
  for (const lx of [-0.47, 0.47])
    for (const ly of [-0.22, 0.22]) box(lx - 0.02, lx + 0.02, ly - 0.02, ly + 0.02, 0, 0.88, greenM);
  box(-0.52, 0.52, -0.27, 0.27, 0.86, 0.9, greenM); // the top
  box(-0.5, 0.5, -0.25, 0.25, 0.3, 0.33, greenM); // the shelf
  box(-0.52, 0.52, 0.25, 0.28, 0.9, 1.12, greenM); // the upstand at the back (towards the brook)
  box(-0.12, 0.26, -0.18, 0.18, 0.9, 1.0, sinkM); // the white sink set into the top
  // pots, a blue bowl, a stack of small pots on the shelf
  for (const [lx, ly, h, r, m] of [
    [-0.36, -0.08, 0.16, 0.08, terra],
    [-0.22, 0.12, 0.12, 0.06, terra],
    [0.4, -0.05, 0.08, 0.11, blue],
    [-0.3, 0.0, 0.22, 0.07, terra],
    [0.25, 0.05, 0.18, 0.06, terra],
  ]) {
    const [px2, py2] = W2(lx, ly),
      z = h > 0.2 ? 0.33 : 0.9;
    cyl(px2, py2, z, z + h, r, m, 12, r * 0.75, { col: false });
  }
  const c4 = [W2(-0.55, -0.3), W2(0.55, -0.3), W2(-0.55, 0.3), W2(0.55, 0.3)];
  COL.push([
    Math.min(...c4.map(q => q[0])),
    Math.max(...c4.map(q => q[0])),
    Math.min(...c4.map(q => q[1])),
    Math.max(...c4.map(q => q[1])),
    0,
    1.1,
    'table',
    null,
    null,
  ]);
}
// ---- the white garden bench north-west of the greenhouse, facing west over the lawn (7237, 7240, 7243, 7244): slats, backrest, armrests;
// one can sit on it ----
{
  const b = { c: [9.6, -1.1], az: 16 }, // local x along the bench, y to the west (its front)
    W2 = (lx, ly) => worldOf(b, lx, ly),
    seg = (lx0, lx1, ly, z, w, h) => {
      const p = W2(lx0, ly),
        q = W2(lx1, ly);
      beam([p[0], p[1], z], [q[0], q[1], z], w, h, white, { cast: true });
    };
  for (let k = 0; k < 4; k++) seg(-0.72, 0.72, 0.02 + k * 0.11, 0.44, 0.09, 0.025); // seat slats
  for (const z of [0.6, 0.72, 0.84]) seg(-0.72, 0.72, -0.17, z, 0.025, 0.08); // backrest boards (east side)
  for (const lx of [-0.7, 0.7]) {
    seg(lx - 0.025, lx + 0.025, 0.3, 0.21, 0.05, 0.42); // front leg
    seg(lx - 0.025, lx + 0.025, -0.15, 0.45, 0.05, 0.9); // back leg up into the backrest
    seg(lx - 0.025, lx + 0.025, 0.07, 0.65, 0.5, 0.04); // armrest
  }
  const c4 = [W2(-0.78, -0.22), W2(0.78, -0.22), W2(-0.78, 0.36), W2(0.78, 0.36)];
  COL.push([
    Math.min(...c4.map(q => q[0])),
    Math.max(...c4.map(q => q[0])),
    Math.min(...c4.map(q => q[1])),
    Math.max(...c4.map(q => q[1])),
    0,
    0.45,
    'bench',
    null,
    null,
  ]);
  GSEATS.push({
    key: 'weisse-bank',
    b,
    lx: -0.3,
    ly: 0.1,
    eye: 0.44 + 0.72,
    yaw: -90,
    pitch: -6,
    kind: 'sit',
    label: 'Auf die weiße Bank setzen',
    at: [-0.3, 0.75],
    r: 1.2,
  });
}
// ---- the white plastic lounge chair south of the greenhouse (7243, 7244) ----
{
  const b = { c: [8.35, -5.65], az: 290 },
    W2 = (lx, ly) => worldOf(b, lx, ly),
    seg = (lx0, lx1, ly, z0, z1, w) => {
      const p = W2(lx0, ly),
        q = W2(lx1, ly);
      beam([p[0], p[1], z0], [q[0], q[1], z1], w, 0.03, white, { cast: true });
    };
  for (const ly of [-0.22, -0.07, 0.07, 0.22]) seg(-0.3, 0.25, ly, 0.38, 0.4, 0.13); // the seat
  for (const ly of [-0.22, -0.07, 0.07, 0.22]) seg(-0.32, -0.45, ly, 0.42, 0.85, 0.13); // the backrest, leaning back
  for (const ly of [-0.27, 0.27]) {
    seg(0.22, 0.22, ly, 0.0, 0.38, 0.05);
    seg(-0.28, -0.28, ly, 0.0, 0.38, 0.05);
    seg(-0.3, 0.2, ly, 0.6, 0.58, 0.05);
  }
  const p = W2(0, 0);
  COL.push([p[0] - 0.35, p[0] + 0.35, p[1] - 0.35, p[1] + 0.35, 0, 0.6, 'chair', null, null]);
}
