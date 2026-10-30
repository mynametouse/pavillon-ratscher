// ===================== Hubert's yard as it is today (feat/hubert-hof, 30.10.2026; first built by feat/nachbarn, 23.10.2026) =====================
// Falko (23.10.): "Die Gebäude auf seiner Seite sind nach Osten offene, überdachte Werkstätten, in denen er Werkzeug hat. Er hackt viel Holz,
// sägt Holz klein und stapelt es in kleinen, hohen Trockenhütchen, die er selbst gebaut hat: etwa 1 × 1 m, 2 m hoch, mit kleinen
// Ziegeldächern." (30.10.): the canopies were far too many and too big – look at the photos and the aerial again. Built here after Falko's
// photos of 26.10.2026 (7186–7196, 7204, 7208, 7233–7253) and the orthophoto of 07.04.2024 (DOP 20 cm, © GDI-Th): docs/features/hubert-hof.md.
//   – by the field path: the gravel yard (the brook runs in a pipe under its front), at its back the long, low, open shed, in front of it the
//     picnic table, an upright log, a white lattice gate, stacks of boards; the strapped board stack in its red frame under the trees;
//   – on the yard's south side the black farm gate (two leaves, opens for Hubert's tractor) onto the grass lane along Falko's west boundary;
//     on the lane's west side the row of small drying huts of pallets and boards with old red tiles, stacks of tiles and pallets;
//   – south of it Hubert's work yard: his open workshop (east open), the shed with the door, the white box body, the wood yard, table and
//     chairs, the car on its ramp (garden/hof_auto.js) and the small workshop behind it; along the plot's west edge the long buildings.
// Static parts are built here before render/zmerge.js (merged). HOF holds the places the neighbours' day (npc/life.js) and the tasks
// (game/quests.js) use; SHEDS the four sheds of site.json neigh (footprints; garden/trees.js keeps trees out of them). Site coordinates:
// x east, y north, z up (metres). Every position is in the tables LAYOUT and SHED_KIND below.
import * as THREE from 'three';
import { scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { ANISO, markDirty, patchSV, plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { B, beam, COL, cyl, hingeDoor, siteUV } from '../core/geo.js';
import { STREAM } from './stream_geo.js';
import { S0 } from './env.js';
import { placeGLB } from '../pavilion/interior.js';
// own seeded random numbers (core/head.js rnd() is one sequence for the whole scene – using it here would move other modules' trees)
const rand = (
  s => () =>
    ((s = (s * 16807) % 2147483647) - 1) / 2147483646
)(4711);
const rr = (a, b) => a + (b - a) * rand();
// ---- the field path's frame: t along the path (east-south-east), o across it into the plots (south-south-west) – the yard's front ----
const PF = (() => {
  const [P1, P2] = S0.path,
    L = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]),
    U = [(P2[0] - P1[0]) / L, (P2[1] - P1[1]) / L];
  let N = [-U[1], U[0]];
  if (N[1] > 0) N = [-N[0], -N[1]];
  return {
    U,
    N,
    xy: (t, o) => [P1[0] + U[0] * t + N[0] * o, P1[1] + U[1] * t + N[1] * o],
    to: (x, y) => [(x - P1[0]) * U[0] + (y - P1[1]) * U[1], (x - P1[0]) * N[0] + (y - P1[1]) * N[1]],
  };
})();
// ---------------- the layout (site coordinates; [t, o] in the path's frame where it says so) ----------------
// Sources: the DOP 2024 for the buildings, the hut row and the lane (it is older than the photos by two and a half years), the photos for what
// stands where in front of them. The model's field path runs a few metres south-west of the real one west of Falko's garden (OSM), so the
// yard keeps its relation to the path: the shed's front stands behind the brook.
export const LAYOUT = {
  culvert: { t: [-13, 11], pad: [0.45, 0.6] }, // the brook in a concrete pipe under the yard's front: t along the path, beyond the ditch's edges
  // the gravel of the yard: the culvert, the yard to the gate and the track behind the huts down to the work yard
  gravel: [
    ['to', -13, 1.6],
    ['to', 11, 1.6],
    ['cul', 11],
    [-12.64, 30.21],
    [-16.96, 31.79],
    [-19.3, 27.4],
    [-22.8, 18.0],
    [-27.0, 19.5],
    [-29.0, 30.0],
    ['cul', -13],
  ],
  gate: { c: [-14.8, 31.0], dir: [0.94, -0.342], w: 4.6, h: 1.3 }, // centre, the gate line (west → east), width between the posts
  fences: [
    [
      [-12.64, 30.21],
      [-9.3, 29.5],
    ], // from the gate to Falko's boundary
    [
      [-16.96, 31.79],
      [-18.25, 27.95],
    ], // from the gate to the first drying hut
  ],
  // the drying huts: a row along the lane's west side (bearing 200°, their open fronts to the lane), groups with gaps
  huts: {
    start: [-18.6, 26.6],
    dir: [-0.342, -0.94],
    at: [0, 1.7, 3.4, 6.0, 7.7, 9.4],
    fill: [1, 0.95, 1, 1, 0.45, 0.15],
  },
  tiles: [
    [4.7, 0], // [s along the row, offset towards the lane]: stacks of old roof tiles on pallets
    [4.7, 1.4],
    [-1.3, 0.3],
    [1.6, 1.3],
    [6.0, 1.7],
  ],
  pallets: [
    [0.6, -2.3], // stacks of pallets behind the huts
    [2.4, -2.4],
    [6.2, -2.2],
    [9.6, -2.6],
  ],
  // the sheds of site.json neigh in the same order: [kind, name]; footprints [back N, front N, front S, back S] in site.json
  // (0: the long open shed by the path, 1: the shed with the door, 2: his workshop, 3: the small workshop behind the car, open to it)
  // the long buildings along the plot's west edge and behind the workshop (no tree there, so not in neigh): corners [back N, front N, front S, back S]
  long: [
    {
      p: [
        [-35.92, 43.17],
        [-31.0, 41.5],
        [-37.6, 22.0],
        [-42.52, 23.67],
      ],
      eave: 2.7,
      roof: 'mono',
      mat: 'fibre',
    }, // dark grey
    {
      p: [
        [-46.38, 21.03],
        [-41.9, 20.0],
        [-47.4, -4.0],
        [-51.88, -2.97],
      ],
      eave: 2.5,
      roof: 'gable',
      mat: 'roofRed',
    }, // red-brown tiles
    {
      p: [
        [-35.16, 12.87],
        [-29.3, 11.6],
        [-33.0, -5.5],
        [-38.86, -4.23],
      ],
      eave: 2.6,
      roof: 'mono',
      mat: 'corr',
    }, // light, behind the workshop
    {
      p: [
        [-52.3, -6.5],
        [-44.2, -9.4],
        [-47.8, -19.2],
        [-55.9, -16.3],
      ],
      eave: 2.8,
      roof: 'gable',
      mat: 'roofRed',
    }, // the barn at the south-west corner
  ],
  // the north yard's things in front of the long shed (photos 7186, 7190–7192)
  north: {
    boards: [
      [-20.6, 37.6, 100],
      [-19.9, 35.5, 100],
    ], // stacks of boards with sticks and a corrugated sheet on top [x, y, facing az]
    whiteBoard: [-21.1, 33.7, 100],
    picnic: [-21.6, 31.4, 100],
    railing: [
      [-22.9, 29.7],
      [-23.3, 27.7],
    ],
    log: [-23.9, 26.9],
    lattice: [-24.7, 25.3, 100],
    redStack: [-10.73, 30.49, 20], // the strapped stack of sawn boards in its red frame, under the trees east of the gate
  },
  boxBody: { x0: -23.6, x1: -21.3, y0: 10.6, y1: 16.8 }, // the long white box body, its writing towards the garden
};
// the four sheds (SITE.neigh): what each one is
const SHED_KIND = [
  { name: 'Huberts Schuppen', open: true, hf: 2.65, hb: 2.15, roof: 'corr', kind: 'long' },
  { name: 'Huberts Schuppen', open: false, hf: 2.55, hb: 2.1, roof: 'fibre', kind: 'door' },
  { name: 'Huberts Werkstatt', open: true, hf: 2.6, hb: 2.05, roof: 'boxRed', kind: 'workshop' },
  { name: 'Huberts Werkstatt', open: true, hf: 2.35, hb: 1.95, roof: 'corr', kind: 'car' }, // („In der Werkstatt hinter dem Auto …“)
];
// the culvert's band across the path: the brook's ditch (garden/stream_geo.js: centre line cOff(t), half width WT) between t0 and t1, plus a margin
const CUL = (() => {
  const C = LAYOUT.culvert;
  let lo = 1e9,
    hi = -1e9;
  for (let t = C.t[0]; t <= C.t[1] + 1e-6; t += 0.25) {
    lo = Math.min(lo, STREAM.cOff(t));
    hi = Math.max(hi, STREAM.cOff(t));
  }
  return { t: C.t, o: [lo - STREAM.WT - C.pad[0], hi + STREAM.WT + C.pad[1]] };
})();
const pt = q => (q[0] === 'to' ? PF.xy(q[1], q[2]) : q[0] === 'cul' ? PF.xy(q[1], CUL.o[1]) : q);
// ---- canvas textures: end grain of stacked split wood, the tool wall, gravel ----
function canvasTex(w, h, draw, rep) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = ANISO;
  if (rep) t.repeat.set(rep[0], rep[1]);
  return t;
}
// one metre of stacked split logs seen from the end: quarter and half rounds, light wood, dark gaps, bark rims
const LOGEND = patchSV(
  new THREE.MeshStandardMaterial({
    map: canvasTex(256, 256, (q, w, h) => {
      q.fillStyle = '#35271c';
      q.fillRect(0, 0, w, h);
      const r0 = (
        s => () =>
          ((s = (s * 16807) % 2147483647) - 1) / 2147483646
      )(99);
      // a piece of split wood seen from its end: a wedge (quarter), a half or a whole round, bark on the round side, rings
      const piece = (cx, cy, r, a0, kind, l) => {
        const span = kind < 0.42 ? Math.PI / 2 + r0() * 0.5 : kind < 0.84 ? Math.PI : Math.PI * 2;
        q.fillStyle = `rgb(${(208 * l) | 0},${(163 * l) | 0},${(114 * l) | 0})`;
        q.beginPath();
        if (span < 6) q.moveTo(cx, cy);
        q.arc(cx, cy, r, a0, a0 + span);
        q.closePath();
        q.fill();
        q.strokeStyle = 'rgba(80,55,35,0.6)';
        q.lineWidth = 1.2;
        q.stroke();
        q.strokeStyle = 'rgba(88,62,44,0.9)'; // bark
        q.lineWidth = 2.4;
        q.beginPath();
        q.arc(cx, cy, r - 1, a0 + 0.05, a0 + span - 0.05);
        q.stroke();
        q.strokeStyle = 'rgba(125,85,48,0.3)';
        q.lineWidth = 1;
        for (let k = 1; k < 4; k++) {
          q.beginPath();
          q.arc(cx, cy, (r * k) / 4.2, a0, a0 + Math.min(span, Math.PI * 1.99));
          q.stroke();
        }
      };
      for (let row = 0; row < 11; row++)
        for (let col = 0; col < 11; col++)
          piece(
            (col + 0.5 + (row % 2) * 0.5) * (w / 10.6) + (r0() - 0.5) * 5,
            (row + 0.5) * (h / 10.6) + (r0() - 0.5) * 4,
            10 + r0() * 5,
            r0() * Math.PI * 2,
            r0(),
            0.72 + r0() * 0.32
          );
      for (let k = 0; k < 50; k++) piece(r0() * w, r0() * h, 5 + r0() * 3, r0() * 6.3, r0() * 0.84, 0.7 + r0() * 0.3);
    }),
    roughness: 0.95,
  })
);
// the tool wall: a board with outlines and tools hanging on nails (saws, hammers, spanners, an axe, pliers, a level)
const TOOLWALL = patchSV(
  new THREE.MeshStandardMaterial({
    map: canvasTex(512, 256, (q, w, h) => {
      q.fillStyle = '#8a7356';
      q.fillRect(0, 0, w, h);
      for (let x = 0; x < w; x += 32) {
        q.fillStyle = `rgba(60,40,25,${0.15 + ((x * 7) % 5) * 0.03})`;
        q.fillRect(x, 0, 2, h);
      }
      const tool = (x, y, f) => {
        q.save();
        q.translate(x, y);
        f();
        q.restore();
      };
      const steel = '#9aa1a6',
        dark = '#3b3b3b',
        wood = '#b07a45',
        red = '#a8322a';
      tool(40, 40, () => {
        q.fillStyle = steel;
        q.beginPath();
        q.moveTo(0, 0);
        q.lineTo(90, 10);
        q.lineTo(90, 40);
        q.lineTo(0, 22);
        q.fill();
        q.fillStyle = wood;
        q.fillRect(-26, -4, 30, 30);
      });
      tool(170, 30, () => {
        q.strokeStyle = red;
        q.lineWidth = 6;
        q.beginPath();
        q.moveTo(0, 60);
        q.quadraticCurveTo(60, -30, 120, 60);
        q.stroke();
        q.strokeStyle = steel;
        q.lineWidth = 3;
        q.beginPath();
        q.moveTo(0, 60);
        q.lineTo(120, 60);
        q.stroke();
      });
      for (const [x, s] of [
        [320, 1],
        [350, 0.8],
      ])
        tool(x, 30, () => {
          q.fillStyle = wood;
          q.fillRect(-4 * s, 0, 8 * s, 90 * s);
          q.fillStyle = dark;
          q.fillRect(-16 * s, -6 * s, 32 * s, 14 * s);
        });
      tool(400, 24, () => {
        q.fillStyle = wood;
        q.fillRect(-5, 0, 10, 120);
        q.fillStyle = dark;
        q.beginPath();
        q.moveTo(-6, 0);
        q.lineTo(-34, -8);
        q.lineTo(-38, 26);
        q.lineTo(-6, 18);
        q.fill();
      });
      for (let i = 0; i < 9; i++)
        tool(40 + i * 16, 150, () => {
          q.fillStyle = steel;
          q.fillRect(-3, 0, 6, 50 + i * 4);
          q.beginPath();
          q.arc(0, 0, 7, 0, Math.PI * 2);
          q.arc(0, 50 + i * 4, 6, 0, Math.PI * 2);
          q.fill();
        });
      for (let i = 0; i < 5; i++)
        tool(220 + i * 14, 150, () => {
          q.fillStyle = [red, '#2d5fa8', '#e0b020', red, dark][i];
          q.fillRect(-4, 0, 8, 26);
          q.fillStyle = steel;
          q.fillRect(-1.5, 26, 3, 34);
        });
      tool(310, 150, () => {
        q.fillStyle = '#d9b31f';
        q.fillRect(0, 0, 130, 16);
        q.fillStyle = '#4fae5a';
        q.fillRect(58, 4, 14, 8);
      });
      tool(360, 200, () => {
        q.strokeStyle = '#7a6a52';
        q.lineWidth = 4;
        for (let k = 0; k < 4; k++) {
          q.beginPath();
          q.arc(0, 0, 18 + k * 3, 0, Math.PI * 2);
          q.stroke();
        }
      });
      const r1 = (
        s => () =>
          ((s = (s * 16807) % 2147483647) - 1) / 2147483646
      )(5);
      for (let i = 0; i < 300; i++) {
        q.fillStyle = `rgba(40,30,20,${r1() * 0.08})`;
        q.fillRect(r1() * w, r1() * h, 3 + r1() * 8, 2 + r1() * 6);
      }
    }),
    roughness: 0.9,
  })
);
const OILCAN = plain({ color: 0x2f5d3a, roughness: 0.45, metalness: 0.4 });
const TYRE = plain({ color: 0x1c1c1c, roughness: 0.9 });
const SACK = plain({ color: 0xc9b48a, roughness: 1 });
const DRUM = plain({ color: 0x2f4f86, roughness: 0.5, metalness: 0.3 });
const BARROW = plain({ color: 0x4f7a45, roughness: 0.55, metalness: 0.3 });
const CRATE = plain({ color: 0x9a6b3d, roughness: 0.9 });
const SPLIT = plain({ color: 0xd8b98e, roughness: 0.85 });
const WHITE = plain({ color: 0xe9e7e1, roughness: 0.7 });
const TARP = plain({ color: 0x2f5d93, roughness: 0.75 }); // the blue tarpaulin over the thing in the long shed
const FRAMERED = plain({ color: 0x8a2b20, roughness: 0.6, metalness: 0.3 });
// ---- local-frame boxes for turned buildings: lx along the building's across axis, ly along its length, z up ----
function lbox(g, sx, sy, sz, m, x, y, z, o = {}) {
  const geo = new THREE.BoxGeometry(sx, sz, sy);
  siteUV(geo, x, y, z, o.grain || (sz >= sx && sz >= sy ? 'z' : sx >= sy ? 'x' : 'y'), [sx, sy]);
  const me = new THREE.Mesh(geo, m);
  me.position.set(x, z, -y);
  if (o.rz) me.rotation.z = o.rz;
  if (o.ry) me.rotation.y = o.ry;
  me.castShadow = o.cast ?? true;
  me.receiveShadow = true;
  g.add(me);
  return me;
}
// a group standing at (x, y) whose local x axis points along the site direction (ux, uy)
function frame(x, y, ux, uy) {
  const g = new THREE.Group();
  g.position.copy(V(x, y, 0));
  g.rotation.y = Math.atan2(uy, ux);
  scene.add(g);
  return g;
}
// colliders of a wall from a to b (site), split into pieces so the axis-aligned boxes stay close to a slanted wall
function colWall(a, b, t, z0, z1, tag = 'wall') {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
    n = Math.max(1, Math.ceil(L / 1.0));
  for (let i = 0; i < n; i++) {
    const p = [a[0] + ((b[0] - a[0]) * i) / n, a[1] + ((b[1] - a[1]) * i) / n],
      q = [a[0] + ((b[0] - a[0]) * (i + 1)) / n, a[1] + ((b[1] - a[1]) * (i + 1)) / n];
    COL.push([
      Math.min(p[0], q[0]) - t / 2,
      Math.max(p[0], q[0]) + t / 2,
      Math.min(p[1], q[1]) - t / 2,
      Math.max(p[1], q[1]) + t / 2,
      z0,
      z1,
      tag,
      null,
      null,
    ]);
  }
}
function bboxOf(pts) {
  const xs = pts.map(p => p[0]),
    ys = pts.map(p => p[1]);
  return [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
}
// a mono-pitch roof over the local box lu −D/2…D/2 (front at +D/2, eave hf; back eave hb), lv −L/2…L/2, overhangs front/back/sides
function monoRoof(g, D, L, hf, hb, m, ovF = 0.5, ovB = 0.3, ovS = 0.3) {
  const ang = Math.atan2(hf - hb, D),
    run = D + ovF + ovB,
    sl = run / Math.cos(ang),
    lc = (ovF - ovB) / 2,
    zc = hb + (lc + D / 2) * Math.tan(ang) + 0.05;
  const geo = new THREE.BoxGeometry(sl, 0.06, L + 2 * ovS);
  const p = geo.attributes.position,
    uv = geo.attributes.uv,
    nn = geo.attributes.normal;
  for (let k = 0; k < p.count; k++) {
    const ay = Math.abs(nn.getY(k));
    uv.setXY(k, ay > 0.5 ? p.getZ(k) : p.getX(k), ay > 0.5 ? p.getX(k) : p.getY(k));
  }
  const me = new THREE.Mesh(geo, m);
  me.position.set(lc, zc, 0);
  me.rotation.z = ang; // rises towards the front (+x)
  me.castShadow = me.receiveShadow = true;
  g.add(me);
  return me;
}
// a gable roof over the local box (ridge along the length lv), eave height he, ridge rise hr
function gableRoof(g, D, L, he, hr, m, ov = 0.4, ridge = MAT.zinc) {
  const ang = Math.atan2(hr, D / 2),
    run = D / 2 + ov,
    sl = run / Math.cos(ang);
  for (const s of [-1, 1]) {
    const geo = new THREE.BoxGeometry(sl, 0.06, L + 2 * ov);
    const p = geo.attributes.position,
      uv = geo.attributes.uv,
      nn = geo.attributes.normal;
    for (let k = 0; k < p.count; k++) {
      const ay = Math.abs(nn.getY(k));
      uv.setXY(k, ay > 0.5 ? p.getZ(k) : p.getX(k), ay > 0.5 ? p.getX(k) * s : p.getY(k));
    }
    const me = new THREE.Mesh(geo, m);
    me.position.set(s * (D / 4 - ov / 2), he + (D / 4 - ov / 2) * Math.tan(ang) + 0.04, 0);
    me.rotation.z = -s * ang;
    me.castShadow = me.receiveShadow = true;
    g.add(me);
  }
  lbox(g, 0.2, L + 2 * ov, 0.08, ridge, 0, 0, he + hr + 0.06, { grain: 'y' });
}
// end walls of a building: a polygon (lu, z) extruded through the wall's thickness at lv
function endWall(g, poly, lv, t, m) {
  const sh = new THREE.Shape();
  poly.forEach(([u, z], i) => (i ? sh.lineTo(u, z) : sh.moveTo(u, z)));
  sh.closePath();
  const eg = new THREE.ExtrudeGeometry(sh, { depth: t, bevelEnabled: false });
  const p = eg.attributes.position,
    uv = eg.attributes.uv;
  for (let k = 0; k < p.count; k++) uv.setXY(k, p.getX(k), p.getY(k));
  const me = new THREE.Mesh(eg, m);
  me.position.set(0, 0, -lv - t / 2); // (three z = −lv; the extrusion runs along +z)
  me.castShadow = me.receiveShadow = true;
  g.add(me);
}
// ---------------- the sheds: the four footprints of SITE.neigh ----------------
export const SHEDS = [];
function shed(r, i) {
  const K = SHED_KIND[i] || SHED_KIND[0],
    p0 = r[0],
    p1 = r[1],
    p3 = r[3];
  let ux = p1[0] - p0[0],
    uy = p1[1] - p0[1];
  const D = Math.hypot(ux, uy);
  ux /= D;
  uy /= D;
  const vx = -uy,
    vy = ux,
    L = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]),
    c = [(r[0][0] + r[2][0]) / 2, (r[0][1] + r[2][1]) / 2],
    { hf, hb } = K,
    t = 0.12;
  const at = (lu, lv) => [c[0] + lu * ux + lv * vx, c[1] + lu * uy + lv * vy];
  const g = frame(c[0], c[1], ux, uy);
  const wallM = MAT.weather;
  // floor, back wall, end walls (the roof falls to the back)
  if (K.open) lbox(g, D, L, 0.06, MAT.conc, 0, 0, 0.03, { cast: false });
  lbox(g, t, L + t, hb, wallM, -D / 2 + t / 2, 0, hb / 2);
  for (const s of [-1, 1])
    endWall(
      g,
      [
        [-D / 2, 0],
        [D / 2, 0],
        [D / 2, hf],
        [-D / 2, hb],
      ],
      s * (L / 2 - t / 2),
      t,
      wallM
    );
  if (K.open) {
    // the open side: posts, header
    const np = Math.max(2, Math.round(L / 3.3));
    for (let k = 0; k <= np; k++) {
      const lv = -L / 2 + 0.1 + ((L - 0.2) * k) / np;
      lbox(g, 0.14, 0.14, hf, MAT.kvh, D / 2 - 0.07, lv, hf / 2, { grain: 'z' });
      const [px, py] = at(D / 2 - 0.07, lv);
      COL.push([px - 0.1, px + 0.1, py - 0.1, py + 0.1, 0, hf, 'post', null, null]);
    }
    lbox(g, 0.16, L, 0.22, MAT.weather, D / 2 - 0.07, 0, hf - 0.11, { grain: 'y' });
  } else {
    // closed: the front wall with a plank door and a small window
    lbox(g, t, L + t, hf, wallM, D / 2 - t / 2, 0, hf / 2);
    lbox(g, 0.05, 1.2, 2.0, MAT.barnDoor, D / 2 + 0.02, -L * 0.18, 1.0, { grain: 'z' });
    lbox(g, 0.04, 0.9, 0.7, MAT.black, D / 2 + 0.02, L * 0.24, 1.45, { cast: false });
    lbox(g, 0.06, 1.0, 0.06, MAT.kvh, D / 2 + 0.04, L * 0.24, 1.08, { grain: 'y' });
    colWall(at(D / 2 - t / 2, -L / 2), at(D / 2 - t / 2, L / 2), t + 0.1, 0, hf);
  }
  monoRoof(g, D, L, hf, hb, MAT[K.roof] || MAT.corr);
  colWall(at(-D / 2 + t / 2, -L / 2), at(-D / 2 + t / 2, L / 2), t + 0.1, 0, hb);
  for (const s of [-1, 1]) colWall(at(-D / 2, s * (L / 2 - t / 2)), at(D / 2, s * (L / 2 - t / 2)), t + 0.1, 0, hb);
  COL.push([
    ...bboxOf([at(-D / 2, -L / 2), at(D / 2, -L / 2), at(D / 2, L / 2), at(-D / 2, L / 2)]),
    hf + 0.1,
    hf + 0.45,
    'roof',
    null,
    null,
  ]);
  const S = {
    c,
    u: [ux, uy],
    v: [vx, vy],
    D,
    L,
    he: hb,
    hf,
    at,
    bench: at(D / 2 + 0.6, 0),
    name: K.name,
    kind: K.kind,
    open: K.open,
  };
  SHEDS[i] = S;
  if (!K.open) return;
  // inside: workbench with the tool wall over it along the back wall
  const benchL = Math.min(3.0, L * 0.34),
    bv = K.kind === 'long' ? L / 2 - 0.6 - benchL / 2 : -L / 2 + 0.6 + benchL / 2,
    bu = -D / 2 + t + 0.36;
  lbox(g, 0.7, benchL, 0.07, MAT.oak, bu, bv, 0.86);
  for (const a of [-1, 1])
    for (const b of [-1, 1])
      lbox(g, 0.07, 0.07, 0.83, MAT.kvh, bu + a * 0.28, bv + b * (benchL / 2 - 0.08), 0.415, { grain: 'z' });
  lbox(g, 0.6, benchL - 0.2, 0.03, MAT.plank, bu, bv, 0.22, { cast: false });
  {
    const tw = new THREE.Mesh(new THREE.PlaneGeometry(benchL, 1.0), TOOLWALL);
    tw.position.set(-D / 2 + t + 0.012, 1.45, -bv);
    tw.rotation.y = Math.PI / 2;
    tw.receiveShadow = true;
    g.add(tw);
  }
  S.bench = at(bu, bv);
  S.benchV = bv;
  COL.push([...bboxOf([at(bu - 0.35, bv - benchL / 2), at(bu + 0.35, bv + benchL / 2)]), 0, 0.9, 'furn', null, null]);
  const lcyl = (r_, h, m, x, y, z, o = {}) => {
    const me = new THREE.Mesh(new THREE.CylinderGeometry(r_, o.r2 ?? r_, h, o.seg || 14), m);
    me.position.set(x, z, -y);
    if (o.rx) me.rotation.x = o.rx;
    if (o.rz) me.rotation.z = o.rz;
    me.castShadow = me.receiveShadow = true;
    g.add(me);
    return me;
  };
  function barrow(lu, lv) {
    lbox(g, 0.62, 0.85, 0.28, BARROW, lu, lv, 0.52);
    lcyl(0.18, 0.08, TYRE, lu, lv + 0.62, 0.18, { rz: Math.PI / 2 });
    for (const s of [-1, 1]) lbox(g, 0.04, 1.3, 0.04, MAT.black, lu + s * 0.26, lv - 0.15, 0.5);
  }
  if (K.kind === 'long') {
    // the long shed by the path: an old single-axle trailer, something big under a blue tarpaulin, boards on bearers along the back
    const tl = 0.3,
      tv = -L / 2 + 2.4;
    lbox(g, 1.6, 2.7, 0.06, MAT.weather, tl, tv, 0.6, { grain: 'y' });
    for (const s of [-1, 1]) {
      lbox(g, 0.05, 2.7, 0.42, MAT.weather, tl + s * 0.78, tv, 0.84, { grain: 'y' });
      lbox(g, 1.6, 0.05, 0.42, MAT.weather, tl, tv + s * 1.33, 0.84, { grain: 'x' });
      lcyl(0.33, 0.18, TYRE, tl + s * 0.95, tv, 0.33, { rz: Math.PI / 2, seg: 16 });
    }
    lbox(g, 1.4, 0.08, 0.08, MAT.black, tl + 1.45, tv, 0.45, { grain: 'x' });
    COL.push([...bboxOf([at(tl - 1.1, tv - 1.4), at(tl + 2.2, tv + 1.4)]), 0, 1.1, 'furn', null, null]);
    const cv = 0.6;
    lbox(g, 1.9, 4.1, 1.25, TARP, 0.2, cv, 0.66, { grain: 'y' });
    lbox(g, 1.6, 3.2, 0.32, TARP, 0.15, cv - 0.2, 1.42, { grain: 'y' });
    COL.push([...bboxOf([at(-0.8, cv - 2.1), at(1.2, cv + 2.1)]), 0, 1.6, 'furn', null, null]);
    for (const k of [-1, 0, 1]) lbox(g, 0.75, 0.1, 0.3, MAT.kvh, -D / 2 + t + 0.45, 0.4 + k * 1.6, 0.15);
    lbox(g, 0.7, 3.8, 0.42, MAT.plank, -D / 2 + t + 0.45, 0.4, 0.5, { grain: 'y' });
    colWall(at(-D / 2 + t + 0.45, -1.5), at(-D / 2 + t + 0.45, 2.3), 0.8, 0, 0.75, 'furn');
    barrow(1.4, L / 2 - 1.2);
  } else if (K.kind === 'workshop') {
    // his workshop: shelves on one end wall, firewood on the other, boards on bearers, an anvil on an oak stump, a wheelbarrow
    const sv = L / 2 - t - 0.25,
      sL = Math.min(2.6, D * 0.45);
    for (const z of [0.45, 1.05, 1.65]) {
      lbox(g, sL, 0.42, 0.03, MAT.plank, -D / 2 + t + 0.1 + sL / 2, sv, z, { grain: 'x' });
      for (let k = 0; k < 4; k++) {
        const w = rr(0.25, 0.42),
          h = rr(0.18, 0.34),
          lu = -D / 2 + t + 0.25 + k * (sL / 4);
        if (rand() < 0.25) continue;
        lbox(g, w, 0.32, h, rand() < 0.5 ? CRATE : OILCAN, lu, sv, z + 0.015 + h / 2);
      }
    }
    for (const a of [0, 1]) lbox(g, 0.05, 0.42, 1.75, MAT.kvh, -D / 2 + t + 0.1 + a * sL, sv, 0.875, { grain: 'z' });
    colWall(at(-D / 2 + t + 0.1, sv), at(-D / 2 + t + 0.1 + sL, sv), 0.5, 0, 1.8, 'furn');
    const fv = -sv * 0.97,
      fL = D * 0.55,
      fh = 1.6;
    const fw = lbox(g, fL, 0.5, fh, MAT.logs, -D / 2 + t + 0.05 + fL / 2, fv, fh / 2);
    fw.material = [MAT.logs, MAT.logs, MAT.logs, MAT.logs, LOGEND, LOGEND]; // logs lie across: end grain towards the room
    colWall(at(-D / 2 + t, fv), at(-D / 2 + t + fL, fv), 0.6, 0, fh, 'wood');
    for (const k of [-1, 0, 1]) lbox(g, 0.75, 0.1, 0.32, MAT.kvh, -D / 2 + t + 0.45, 1.0 + k * 1.5, 0.16);
    lbox(g, 0.7, 3.6, 0.36, MAT.plank, -D / 2 + t + 0.45, 1.0, 0.5, { grain: 'y' });
    colWall(at(-D / 2 + t + 0.45, -0.8), at(-D / 2 + t + 0.45, 2.8), 0.8, 0, 0.7, 'furn');
    lcyl(0.24, 0.62, MAT.logs, 0.6, 3.6, 0.31, { r2: 0.27 });
    lbox(g, 0.18, 0.5, 0.2, MAT.black, 0.6, 3.6, 0.72);
    barrow(1.3, -1.8);
  } else if (K.kind === 'car') {
    // the small shed by the car: oil drums, a stack of tyres
    for (const k of [0, 1]) lcyl(0.29, 0.88, DRUM, D / 2 - 0.9 - k * 0.62, L / 2 - 0.8, 0.44, { seg: 16 });
    for (let k = 0; k < 4; k++) lcyl(0.32, 0.2, TYRE, -0.4, L / 2 - 1.2, 0.1 + k * 0.205, { seg: 16 });
    COL.push([...bboxOf([at(-0.8, L / 2 - 1.6), at(D / 2 - 0.5, L / 2 - 0.4)]), 0, 0.9, 'furn', null, null]);
  }
}
S0.neigh.forEach((r, i) => shed(r, i));
// tools and things in the sheds (glTF, shared with the rest of the scene)
{
  const az = s => (Math.atan2(s.u[1], s.u[0]) * 180) / Math.PI; // the building's across axis as a turn about the vertical
  const put = (id, s, lu, lv, z, face, o = {}) => {
    if (!s) return;
    const [x, y] = s.at(lu, lv);
    placeGLB(id, Object.assign({ x, y, z, face: face + az(s) }, o));
  };
  const [s0, , s2, s3] = SHEDS;
  if (s2) {
    put('vice', s2, -s2.D / 2 + 0.5, s2.benchV + 0.9, 0.9, 90, { col: false });
    put('toolchest', s2, -s2.D / 2 + 0.55, s2.benchV + 2.2, 0.06, 90);
    put('ladder', s2, -s2.D / 2 + 0.25, 4.2, 0.06, 90, { col: false });
    put('rain_barrel', s2, s2.D / 2 + 0.5, s2.L / 2 - 0.6, 0, 0);
  }
  if (s3) {
    put('tyre_old', s3, -0.9, -s3.L / 2 + 1.2, 0.06, 0, { col: false });
    put('toolchest', s3, -s3.D / 2 + 0.55, s3.benchV + 2.0, 0.06, 90);
    put('jerrycan', s3, s3.D / 2 - 0.8, -s3.L / 2 + 0.6, 0.06, 70);
  }
  if (s0) put('crate', s0, 0.4, s0.L / 2 - 1.0, 0.06, 15, { col: false });
}
// ---------------- the yard: places used by the neighbours' day (npc/life.js) and the tasks (game/quests.js) ----------------
export const HOF = {
  block: [-17.3, 10.3], // chopping block (top 0.5 m)
  rounds: [-18.7, 11.5], // sawn rounds waiting to be split
  heap: [-16.1, 9.2], // split wood
  horse: [-19.2, 14.6], // sawhorse with a log
  toHuts: [[-16.2, 11.4]], // the way from the heap to the huts (round the chopping block)
  huts: [], // drying huts: { x, y, fill, front: [x, y] (where one stands to fill it), look (compass radians into the hut) }
  table: [-19.4, -5.8],
  chairs: [], // { x, y, az } (az: the way the sitter looks, compass degrees)
  car: { x: -17.4, y: -16.2, az: 0 }, // Hubert's estate on its ramp (garden/hof_auto.js), heading north
  bench: [-13.25, -0.1],
  shed: SHEDS[2] ? SHEDS[2].bench : [-26, 1],
  carShed: SHEDS[3] ? SHEDS[3].bench : [-24, -14],
  layout: LAYOUT,
  path: PF,
  sheds: SHEDS,
};
window.HOF = HOF;
// ---------------- the brook in a pipe under the yard's front: a concrete block fills the ditch, pipe mouths at both ends ----------------
HOF.culvert = CUL;
{
  const [t0, t1] = CUL.t,
    [o0, o1] = CUL.o,
    zb = -1.78;
  const [cx, cy] = PF.xy((t0 + t1) / 2, (o0 + o1) / 2);
  const g = frame(cx, cy, PF.U[0], PF.U[1]); // local x along the path, local y (−three z) = −N
  lbox(g, t1 - t0, o1 - o0, -zb, MAT.conc, 0, 0, zb / 2, { cast: false, grain: 'x' });
  // the pipe mouths where the brook goes in (east) and comes out (west): a dark hole in a concrete ring at the water
  for (const [t, s] of [
    [t0, -1],
    [t1, 1],
  ]) {
    const oc = STREAM.cOff(t),
      lv = -(oc - (o0 + o1) / 2),
      lu = t - (t0 + t1) / 2;
    const hole = new THREE.Mesh(new THREE.CircleGeometry(0.42, 20), MAT.black);
    hole.position.set(lu + s * 0.012, -1.05, -lv);
    hole.rotation.y = (s * Math.PI) / 2;
    g.add(hole);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.47, 0.07, 6, 20), MAT.conc);
    ring.position.set(lu + s * 0.03, -1.05, -lv);
    ring.rotation.y = (s * Math.PI) / 2;
    ring.castShadow = true;
    g.add(ring);
    // the headwall's collider (one stands in the ditch in front of it), split along the slanted face
    colWall(PF.xy(t, o0), PF.xy(t, o1), 0.3, -1.8, 0.0);
  }
}
const onYard = (x, y) => inCulvert(x, y) || inPolyXY(x, y, YARD);
const inCulvert = (x, y) => {
  const [t, o] = PF.to(x, y);
  return t > CUL.t[0] && t < CUL.t[1] && o > CUL.o[0] && o < CUL.o[1];
};
// one walks and drives over it (KERN.ground: before the stream's ditch of world/roads.js; only from its level, not from inside the ditch)
KERN.provide(
  'ground',
  (x, y, z) => (x < -40 || x > 0 || y < 28 || y > 56 || !inCulvert(x, y) || (z != null && z < -0.7) ? undefined : 0),
  15
);
// the brook's bank bushes (garden/trees.js, bankBushes) would stand in rows on the yard over the pipe: hidden there once the trees are built –
// their instances scaled to nothing, their trunks lowered out of reach; trees.js and its random sequence stay as they are
HOF.bushesHidden = 0;
const HIDDEN = new Set();
KERN.until(() => window.TREEG && window.TREEG.children.length > 0, 600)
  .then(() => {
    const m4 = new THREE.Matrix4(),
      p = new THREE.Vector3(),
      q = new THREE.Quaternion(),
      s = new THREE.Vector3();
    window.TREEG.traverse(o => {
      if (!o.isInstancedMesh) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const gh = o.geometry.boundingBox.max.y - o.geometry.boundingBox.min.y;
      for (let i = 0; i < o.count; i++) {
        o.getMatrixAt(i, m4);
        m4.decompose(p, q, s);
        if (s.y * gh > 3.2 || !onYard(p.x, -p.z)) continue; // only bushes, only on the yard
        o.setMatrixAt(i, m4.compose(p, q, s.set(0, 0, 0)));
        o.instanceMatrix.needsUpdate = true;
        HIDDEN.add(p.x.toFixed(1) + ',' + p.z.toFixed(1));
      }
    });
    for (const e of COL)
      if (e[6] === 'tree' && e[1] - e[0] < 0.2 && inCulvert((e[0] + e[1]) / 2, (e[2] + e[3]) / 2)) {
        e[4] = -20;
        e[5] = -19;
      }
    HOF.bushesHidden = HIDDEN.size;
    markDirty(true);
  })
  .catch(() => {});
// ---------------- worn ground: the gravel of the yard, wood chips round the chopping block, bare earth under the car ----------------
const FLAT = { roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 };
const GRAVEL = patchSV(
  new THREE.MeshStandardMaterial(
    Object.assign(
      {
        map: canvasTex(256, 256, (q, w, h) => {
          const r0 = (
            s => () =>
              ((s = (s * 16807) % 2147483647) - 1) / 2147483646
          )(31);
          q.fillStyle = '#7a7166';
          q.fillRect(0, 0, w, h);
          for (let i = 0; i < 40; i++) {
            q.fillStyle = `rgba(${r0() < 0.5 ? '92,80,64' : '128,120,108'},${0.25 + r0() * 0.3})`;
            q.beginPath();
            q.ellipse(r0() * w, r0() * h, 10 + r0() * 30, 6 + r0() * 18, r0() * 3, 0, 6.3);
            q.fill();
          }
          for (let i = 0; i < 2600; i++) {
            const l = 0.55 + r0() * 0.6;
            q.fillStyle = `rgba(${(178 * l) | 0},${(170 * l) | 0},${(158 * l) | 0},${0.5 + r0() * 0.5})`;
            q.beginPath();
            q.ellipse(r0() * w, r0() * h, 0.8 + r0() * 2.2, 0.6 + r0() * 1.6, r0() * 3, 0, 6.3);
            q.fill();
          }
        }),
      },
      FLAT
    )
  )
);
function decal(pts, m, uvScale = 1) {
  const geo = new THREE.ShapeGeometry(new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1]))));
  geo.rotateX(-Math.PI / 2); // (x, y) in the shape's plane → three (x, 0, −y)
  const p = geo.attributes.position,
    uv = geo.attributes.uv;
  for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) * uvScale, -p.getZ(i) * uvScale);
  const me = new THREE.Mesh(geo, m);
  me.position.y = 0.012;
  me.receiveShadow = true;
  scene.add(me);
  return me;
}
decal(LAYOUT.gravel.map(pt), GRAVEL, 0.3);
// ---- drying huts ("Trockenhütchen"): about 1.2 × 1.2 m, 2 m high, walls of pallets and boards, a little roof of old red tiles; the open
// front towards the lane shows the stacked wood ----
const HH = LAYOUT.huts;
const HUT_H = 2.0,
  HUT_W = 1.2,
  STACK_H = 1.7;
HH.at.forEach((s, k) => {
  const [dx, dy] = HH.dir,
    x = HH.start[0] + dx * s,
    y = HH.start[1] + dy * s,
    fx = -dy, // the front: square to the row, towards the lane (east-south-east)
    fy = dx;
  const fill = HH.fill[k];
  HOF.huts.push({ x, y, fill, front: [x + fx * 0.95, y + fy * 0.95], look: Math.atan2(-fx, -fy) });
  const g = frame(x, y, fx, fy),
    h = HUT_W / 2;
  lbox(g, HUT_W, HUT_W, 0.12, MAT.plank, 0, 0, 0.06, { grain: 'y' }); // pallet floor
  for (const a of [-1, 1]) for (const b of [-1, 1]) lbox(g, 0.08, 0.08, HUT_H, MAT.kvh, a * h, b * h, HUT_H / 2);
  // slats outside the posts (pallets stood on end): back and both sides, gaps for the air
  for (let z = 0.2; z < HUT_H - 0.1; z += 0.14) {
    lbox(g, 0.025, HUT_W + 0.1, 0.09, MAT.weather, -h - 0.05, 0, z + 0.045, { grain: 'y', cast: z < 0.3 });
    for (const b of [-1, 1])
      lbox(g, HUT_W + 0.1, 0.025, 0.09, MAT.weather, 0, b * (h + 0.05), z + 0.045, { grain: 'x' });
  }
  // the gable roof: the ridge along the row, eaves over the open front and the back, old red tiles
  gableRoof(g, HUT_W + 0.1, HUT_W + 0.1, HUT_H, 0.42, MAT.roofRed, 0.18, MAT.roofRed);
  for (const b of [-1, 1])
    endWall(
      g,
      [
        [-h - 0.05, HUT_H],
        [h + 0.05, HUT_H],
        [0, HUT_H + 0.42],
      ],
      b * (h + 0.04),
      0.03,
      MAT.weather
    );
  COL.push([x - 0.75, x + 0.75, y - 0.75, y + 0.75, 0, 2.5, 'hut', null, null]);
  // the stacked wood (the hut being filled: its stack is its own mesh, npc/life.js and the task change its height)
  const geo = new THREE.BoxGeometry(HUT_W - 0.16, 1, HUT_W - 0.16);
  geo.translate(0, 0.5, 0);
  stackUV(geo, STACK_H * fill, k);
  const st = new THREE.Mesh(geo, [LOGEND, LOGEND, SPLIT, MAT.logs, MAT.logs, MAT.logs]);
  st.position.set(0.02, 0.12, 0);
  st.scale.y = Math.max(0.05, STACK_H * fill);
  st.castShadow = st.receiveShadow = true;
  if (fill < 0.6 && HOF.stack === undefined) {
    st.userData.noMerge = true;
    HOF.stack = st; // the hut Hubert (and the task) fills
    HOF.stackHut = k;
  }
  g.add(st);
});
// uv of a stack of height h (the geometry is one metre high and scaled): end grain in metres, so a lower stack shows fewer rows, not squashed ones
function stackUV(geo, h, k) {
  const p = geo.attributes.position,
    uv = geo.attributes.uv,
    nn = geo.attributes.normal;
  for (let i = 0; i < p.count; i++) {
    const ax = Math.abs(nn.getX(i)) > 0.5;
    uv.setXY(i, ax ? p.getZ(i) + k * 0.31 : p.getX(i), p.getY(i) * h);
  }
  uv.needsUpdate = true;
}
HOF.fillHut = f => {
  const hut = HOF.huts[HOF.stackHut];
  if (!hut || !HOF.stack) return;
  hut.fill = Math.max(0.05, Math.min(1, f));
  HOF.stack.scale.y = STACK_H * hut.fill;
  stackUV(HOF.stack.geometry, HOF.stack.scale.y, HOF.stackHut);
  markDirty();
};
// a point beside the hut row: s metres along it from the first hut, off metres towards the lane (negative: behind the huts)
const rowPt = (s, off) => [
  HH.start[0] + HH.dir[0] * s - HH.dir[1] * off,
  HH.start[1] + HH.dir[1] * s + HH.dir[0] * off,
];
// stacks of old roof tiles on pallets, and stacks of pallets behind the huts
LAYOUT.tiles.forEach(([s, off], k) => {
  const [x, y] = rowPt(s, off),
    g = frame(x, y, -HH.dir[1], HH.dir[0]);
  lbox(g, 0.8, 1.2, 0.14, MAT.plank, 0, 0, 0.07, { grain: 'y' });
  const hgt = 0.45 + ((k * 37) % 5) * 0.09;
  for (const b of [-0.29, 0.29]) lbox(g, 0.66, 0.5, hgt, MAT.roofRed, 0, b, 0.14 + hgt / 2, { grain: 'x' });
  COL.push([x - 0.7, x + 0.7, y - 0.7, y + 0.7, 0, 0.14 + hgt, 'furn', null, null]);
});
LAYOUT.pallets.forEach(([s, off], k) => {
  const [x, y] = rowPt(s, off),
    g = frame(x, y, -HH.dir[1], HH.dir[0]),
    n = 6 + ((k * 3) % 5);
  for (let i = 0; i < n; i++)
    lbox(g, 1.0, 1.2, 0.13, i % 2 ? MAT.plank : MAT.weather, ((i * 7) % 3) * 0.02, 0, 0.065 + i * 0.145, {
      grain: 'y',
      cast: i === n - 1,
    });
  COL.push([x - 0.75, x + 0.75, y - 0.75, y + 0.75, 0, n * 0.145, 'furn', null, null]);
});
// ---------------- the black farm gate between the yard and the lane: two leaves of horizontal boards with a brace, on black posts ----------------
{
  const G = LAYOUT.gate,
    [gx, gy] = G.c,
    [dx, dy] = G.dir,
    hw = G.w / 2,
    lw = hw - 0.12;
  const posts = [
    [gx - dx * hw, gy - dy * hw],
    [gx + dx * hw, gy + dy * hw],
  ];
  for (const [px, py] of posts) {
    B(px - 0.08, px + 0.08, py - 0.08, py + 0.08, 0, G.h + 0.25, MAT.black, { col: true, grain: 'z' });
  }
  const leaf = (key, [hx, hy], a, sign) => {
    const gl = new THREE.Group(),
      box = (x0, x1, y0, y1, z0, z1) => {
        const me = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, y1 - y0, z1 - z0), MAT.black);
        me.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
        me.castShadow = me.receiveShadow = true;
        gl.add(me);
        return me;
      };
    for (const x of [0.06, lw - 0.06]) box(x - 0.055, x + 0.055, 0.05, G.h, -0.03, 0.03);
    for (let k = 0; k < 5; k++) {
      const z = 0.16 + k * ((G.h - 0.28) / 4);
      box(0, lw, z - 0.065, z + 0.065, -0.022, 0.022);
    }
    // the diagonal brace from the bottom at the hinge to the top at the free end (photo 7193)
    const Lb = Math.hypot(lw - 0.2, G.h - 0.35),
      br = new THREE.Mesh(new THREE.BoxGeometry(Lb, 0.1, 0.035), MAT.black);
    br.position.set(lw / 2, 0.16 + (G.h - 0.35) / 2, 0.035);
    br.rotation.z = Math.atan2(G.h - 0.35, lw - 0.2);
    br.castShadow = true;
    gl.add(br);
    const d = hingeDoor(key, gl, { hx, hy, a, w: lw, sign, z0: 0, z1: G.h, thick: 0.08 });
    d.label = 'Tor';
    d.r = 2.0;
    return d;
  };
  // both leaves swing into the yard (north); shut as on Falko's photos – npc/life.js opens them for the tractor
  const d1 = leaf('hofgate1', [posts[0][0] + dx * 0.09, posts[0][1] + dy * 0.09], [dx, dy], 1),
    d2 = leaf('hofgate2', [posts[1][0] - dx * 0.09, posts[1][1] - dy * 0.09], [-dx, -dy], -1);
  HOF.gate = {
    c: G.c,
    keys: ['hofgate1', 'hofgate2'],
    leaves: [d1, d2],
    set(v) {
      for (const d of this.leaves) d.target = v ? 1 : 0; // (game/walkable.js swings them; no door sound at the visitor's ears)
    },
    open: () => d1.t > 0.5 || d2.t > 0.5,
  };
  // the fences either side: black boards on posts
  for (const [a, b] of LAYOUT.fences) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]),
      n = Math.max(1, Math.round(L / 2.2));
    for (let k = 0; k <= n; k++) {
      const x = a[0] + ((b[0] - a[0]) * k) / n,
        y = a[1] + ((b[1] - a[1]) * k) / n;
      if (k) B(x - 0.06, x + 0.06, y - 0.06, y + 0.06, 0, 1.35, MAT.black, { col: false, grain: 'z' });
    }
    for (const z of [0.35, 0.8, 1.2]) beam([a[0], a[1], z], [b[0], b[1], z], 0.025, 0.12, MAT.black);
    colWall(a, b, 0.12, 0, 1.35, 'fence');
  }
}
// ---------------- the long buildings along the plot's west edge (aerial 2024): closed, low, roofs in their colours ----------------
LAYOUT.long.forEach(Lb => {
  const [p0, p1, , p3] = Lb.p;
  let ux = p1[0] - p0[0],
    uy = p1[1] - p0[1];
  const D = Math.hypot(ux, uy);
  ux /= D;
  uy /= D;
  const L = Math.hypot(p3[0] - p0[0], p3[1] - p0[1]),
    c = [(Lb.p[0][0] + Lb.p[2][0]) / 2, (Lb.p[0][1] + Lb.p[2][1]) / 2],
    g = frame(c[0], c[1], ux, uy),
    t = 0.2,
    he = Lb.eave,
    m = MAT[Lb.mat] || MAT.corr,
    at = (lu, lv) => [c[0] + lu * ux - lv * uy, c[1] + lu * uy + lv * ux];
  if (Lb.roof === 'mono') {
    const hb = he - 0.6;
    lbox(g, t, L, hb, MAT.weather, -D / 2 + t / 2, 0, hb / 2);
    lbox(g, t, L, he, MAT.weather, D / 2 - t / 2, 0, he / 2);
    for (const s of [-1, 1])
      endWall(
        g,
        [
          [-D / 2, 0],
          [D / 2, 0],
          [D / 2, he],
          [-D / 2, hb],
        ],
        s * (L / 2 - t / 2),
        t,
        MAT.weather
      );
    monoRoof(g, D, L, he, hb, m, 0.4, 0.3, 0.3);
    // a row of barn doors on the front
    for (let k = -1; k <= 1; k++)
      lbox(g, 0.05, 2.4, 2.1, MAT.barnDoor, D / 2 + 0.02, k * (L / 3), 1.05, { grain: 'z' });
  } else {
    const hr = Math.min(1.8, D * 0.32);
    for (const s of [-1, 1]) lbox(g, t, L, he, MAT.weather, s * (D / 2 - t / 2), 0, he / 2);
    for (const s of [-1, 1])
      endWall(
        g,
        [
          [-D / 2, 0],
          [D / 2, 0],
          [D / 2, he],
          [0, he + hr],
          [-D / 2, he],
        ],
        s * (L / 2 - t / 2),
        t,
        MAT.weather
      );
    gableRoof(g, D, L, he, hr, m, 0.4);
    for (let k = -1; k <= 1; k += 2)
      lbox(g, 0.05, 2.6, 2.2, MAT.barnDoor, D / 2 + 0.02, k * (L / 4), 1.1, { grain: 'z' });
  }
  const C = [at(-D / 2, -L / 2), at(D / 2, -L / 2), at(D / 2, L / 2), at(-D / 2, L / 2)];
  for (let k = 0; k < 4; k++) colWall(C[k], C[(k + 1) % 4], 0.3, 0, he);
});
// ---------------- the north yard: in front of the long shed (photos 7186, 7190–7192) ----------------
{
  const NY = LAYOUT.north,
    turn = az => [Math.sin((az * Math.PI) / 180), Math.cos((az * Math.PI) / 180)]; // the way a thing faces → its local x axis
  // stacks of boards on bearers with sticks between the layers, a corrugated sheet on top
  for (const [x, y, az] of NY.boards) {
    const g = frame(x, y, ...turn(az));
    for (const b of [-1.2, 0, 1.2]) lbox(g, 1.3, 0.12, 0.14, MAT.kvh, 0, b, 0.07);
    for (let k = 0; k < 6; k++) {
      lbox(g, 1.2, 3.0, 0.16, MAT.plank, 0, 0, 0.14 + k * 0.2 + 0.08, { grain: 'y', cast: k === 5 });
      for (const b of [-1.2, 0, 1.2]) lbox(g, 1.24, 0.04, 0.04, MAT.kvh, 0, b, 0.14 + k * 0.2 + 0.18, { cast: false });
    }
    lbox(g, 1.5, 3.3, 0.03, MAT.corr, 0, 0, 1.38, { grain: 'y' });
    COL.push([x - 0.85, x + 0.85, y - 1.58, y + 1.58, 0, 1.4, 'wood', null, null]);
  }
  // a white board leaning, the picnic table with its benches
  {
    const [x, y, az] = NY.whiteBoard,
      g = frame(x, y, ...turn(az));
    lbox(g, 0.03, 1.25, 1.0, WHITE, 0, 0, 0.5, { ry: 0, rz: 0.18, grain: 'y' });
  }
  {
    const [x, y, az] = NY.picnic,
      g = frame(x, y, ...turn(az));
    lbox(g, 0.75, 2.0, 0.05, MAT.weather, 0, 0, 0.74, { grain: 'y' });
    for (const a of [-1, 1]) {
      lbox(g, 0.28, 2.0, 0.045, MAT.weather, a * 0.62, 0, 0.45, { grain: 'y' });
      for (const b of [-0.75, 0.75]) {
        lbox(g, 1.5, 0.07, 0.07, MAT.weather, 0, b, 0.42, { grain: 'x', cast: false });
        lbox(g, 0.07, 0.07, 0.8, MAT.weather, a * 0.32, b, 0.37, { rz: a * 0.42, grain: 'z' });
      }
    }
    COL.push([x - 0.91, x + 0.91, y - 1.12, y + 1.12, 0, 0.78, 'furn', null, null]);
  }
  // the galvanised railing, the upright log section, the white lattice gate
  {
    const [a, b] = NY.railing;
    for (const p of [a, b]) cyl(p[0], p[1], 0, 1.0, 0.03, MAT.galv, 8, 0.03, { col: false });
    for (const z of [0.55, 0.98]) beam([a[0], a[1], z], [b[0], b[1], z], 0.04, 0.04, MAT.galv);
    colWall(a, b, 0.1, 0, 1.0, 'fence');
  }
  {
    const [x, y] = NY.log;
    cyl(x, y, 0, 1.95, 0.34, MAT.logs, 14, 0.4, { col: true });
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.33, 14), MAT.logEnd);
    top.rotation.x = -Math.PI / 2;
    top.position.copy(V(x, y, 1.952));
    scene.add(top);
  }
  {
    const [x, y, az] = NY.lattice,
      g = frame(x, y, ...turn(az));
    for (let k = 0; k < 10; k++) lbox(g, 0.03, 0.07, 1.2, WHITE, 0, -0.8 + k * 0.178, 0.65, { grain: 'z' });
    for (const z of [0.25, 1.05]) lbox(g, 0.04, 1.8, 0.08, WHITE, -0.035, 0, z, { grain: 'y' });
    COL.push([x - 0.2, x + 0.2, y - 0.9, y + 0.9, 0, 1.3, 'fence', null, null]);
  }
  // the strapped stack of fresh boards in a red steel frame (photo 7191), under the trees by the gate
  {
    const [x, y, az] = NY.redStack,
      g = frame(x, y, ...turn(az));
    lbox(g, 0.95, 2.2, 0.12, MAT.kvh, 0, 0, 0.06, { grain: 'y' });
    for (let k = 0; k < 7; k++)
      lbox(g, 0.9, 2.1 - (k % 2) * 0.12, 0.15, MAT.bsh, 0, 0, 0.2 + k * 0.165, { grain: 'y', cast: k === 6 });
    for (const a of [-1, 1])
      for (const b of [-1, 1]) lbox(g, 0.06, 0.06, 1.45, FRAMERED, a * 0.5, b * 1.05, 0.72, { grain: 'z' });
    for (const b of [-0.55, 0.55]) lbox(g, 1.0, 0.03, 0.03, FRAMERED, 0, b, 1.36, { cast: false });
    COL.push([x - 1.2, x + 1.2, y - 0.82, y + 0.82, 0, 1.45, 'wood', null, null]);
  }
}
// ---- the wood yard: a sawhorse with a log, the chopping block, rounds and split wood ----
{
  const [hx, hy] = HOF.horse;
  for (const dx of [-0.45, 0.45])
    for (const s of [-1, 1]) beam([hx + dx, hy - s * 0.42, 0], [hx + dx, hy + s * 0.18, 0.95], 0.07, 0.07, MAT.kvh);
  beam([hx - 0.5, hy - 0.12, 0.35], [hx + 0.5, hy - 0.12, 0.35], 0.05, 0.08, MAT.kvh);
  {
    const m = cyl(hx, hy, 0, 2.4, 0.15, MAT.logs, 14, 0.14, { col: false });
    m.rotation.set(0, 0, Math.PI / 2);
    m.position.copy(V(hx + 0.3, hy, 0.94)); // lies in the crosses of the legs
  }
  COL.push([hx - 0.6, hx + 0.6, hy - 0.5, hy + 0.3, 0, 1.0, 'furn', null, null]);
  // chopping block (an old oak round), sawn rounds, split wood
  const [kx, ky] = HOF.block;
  cyl(kx, ky, 0, 0.5, 0.29, MAT.logs, 16, 0.31, { col: false });
  {
    const top = new THREE.Mesh(new THREE.CircleGeometry(0.285, 16), MAT.logEnd);
    top.rotation.x = -Math.PI / 2;
    top.position.copy(V(kx, ky, 0.502));
    top.receiveShadow = true;
    scene.add(top);
  }
  COL.push([kx - 0.3, kx + 0.3, ky - 0.3, ky + 0.3, 0, 0.5, 'block', null, null]);
  const [rx, ry] = HOF.rounds;
  for (let k = 0; k < 9; k++) {
    const a = k * 2.4,
      d = k < 6 ? 0.42 : 0.2,
      x = rx + Math.cos(a) * d,
      y = ry + Math.sin(a) * d,
      z = k < 6 ? 0 : 0.33,
      r = rr(0.13, 0.19);
    cyl(x, y, z, z + 0.33, r, MAT.logs, 12, r, { col: false });
    const top = new THREE.Mesh(new THREE.CircleGeometry(r * 0.97, 12), MAT.logEnd);
    top.rotation.x = -Math.PI / 2;
    top.position.copy(V(x, y, z + 0.333));
    scene.add(top);
  }
  COL.push([rx - 0.65, rx + 0.65, ry - 0.65, ry + 0.65, 0, 0.66, 'wood', null, null]);
  // the heap of split wood: wedge-shaped pieces in a loose mound
  const [sx, sy] = HOF.heap;
  const piece = new THREE.CylinderGeometry(0.1, 0.1, 0.34, 3); // a split piece: a three-sided billet
  const SPLIT2 = plain({ color: 0xb8956a, roughness: 0.9 });
  for (let k = 0; k < 40; k++) {
    const a = rand() * Math.PI * 2,
      d = Math.sqrt(rand()) * 0.6,
      x = sx + Math.cos(a) * d,
      y = sy + Math.sin(a) * d * 0.8,
      z = 0.06 + (0.6 - d) * 0.55 * rand();
    const m = new THREE.Mesh(piece, [k % 3 === 0 ? MAT.logs : k % 3 === 1 ? SPLIT2 : SPLIT, MAT.logEnd, MAT.logEnd]);
    m.position.copy(V(x, y, z));
    m.rotation.set(Math.PI / 2 + rr(-0.4, 0.4), rr(0, 6.3), rr(-0.3, 0.3));
    m.castShadow = m.receiveShadow = true;
    scene.add(m);
  }
  COL.push([sx - 0.5, sx + 0.5, sy - 0.45, sy + 0.45, 0, 0.4, 'wood', null, null]);
}
// ---- table and two chairs in front of the workshop (Hubert and Ronald sit here and talk about the village) ----
{
  const [tx, ty] = HOF.table;
  B(tx - 0.55, tx + 0.55, ty - 0.4, ty + 0.4, 0.72, 0.76, MAT.weather, { col: false, grain: 'x' });
  for (const a of [-1, 1])
    for (const b of [-1, 1])
      B(tx + a * 0.48 - 0.03, tx + a * 0.48 + 0.03, ty + b * 0.32 - 0.03, ty + b * 0.32 + 0.03, 0, 0.72, MAT.kvh, {
        col: false,
        grain: 'z',
      });
  COL.push([tx - 0.56, tx + 0.56, ty - 0.41, ty + 0.41, 0, 0.76, 'furn', null, null]);
  // chairs north and south of the table, facing each other (seen from the garden both are in profile)
  for (const s of [-1, 1]) {
    const cx = tx + s * 0.12,
      cy = ty + s * 0.78,
      az = s > 0 ? 180 : 0;
    B(cx - 0.22, cx + 0.22, cy - 0.21, cy + 0.21, 0.42, 0.46, MAT.weather, { col: false, grain: 'x' });
    for (const a of [-1, 1])
      for (const b of [-1, 1])
        B(
          cx + a * 0.19 - 0.022,
          cx + a * 0.19 + 0.022,
          cy + b * 0.18 - 0.022,
          cy + b * 0.18 + 0.022,
          0,
          0.42,
          MAT.kvh,
          {
            col: false,
            grain: 'z',
          }
        );
    const by = cy + s * 0.2;
    for (const a of [-1, 1])
      B(cx + a * 0.19 - 0.022, cx + a * 0.19 + 0.022, by - 0.022, by + 0.022, 0.46, 0.92, MAT.kvh, {
        col: false,
        grain: 'z',
      });
    for (const z of [0.62, 0.8])
      B(cx - 0.21, cx + 0.21, by - 0.015, by + 0.015, z, z + 0.08, MAT.weather, { col: false, grain: 'x' });
    HOF.chairs.push({ x: cx, y: cy - s * 0.04, az, seat: 0.46 });
  }
  // a beer crate as a side table
  B(tx + 0.75, tx + 1.15, ty - 0.2, ty + 0.1, 0, 0.3, plain({ color: 0x2f5a2c, roughness: 0.6 }), { col: true });
}
// ---- the car's ramp: two self-built ramps of stacked squared timber under the front wheels ----
// the car (garden/hof_auto.js): wheelbase 2.75 m, front axle 1.47 m ahead of its centre; the flat tops are centred under the front axle
export const RAMP = { h: 0.32, ax: HOF.car.y + 1.47 };
RAMP.y0 = RAMP.ax - 0.55;
RAMP.y1 = RAMP.ax + 0.55;
{
  const { x } = HOF.car,
    track = 1.52;
  for (const s of [-1, 1]) {
    const cx = x + (s * track) / 2;
    for (let k = 0; k < 4; k++) {
      const z0 = k * 0.08;
      B(cx - 0.19, cx + 0.19, RAMP.y0 - 0.1 + k * 0.02, RAMP.y1 + 0.15, z0, z0 + 0.08, MAT.kvh, {
        col: false,
        grain: 'y',
      });
    }
    // the wedge: a slanted plank on two blocks
    const L = 1.1,
      ang = Math.atan2(RAMP.h, L);
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, Math.hypot(L, RAMP.h)), MAT.weather);
    m.position.copy(V(cx, RAMP.y0 - L / 2, RAMP.h / 2));
    m.rotation.x = ang; // rises towards the north (the plank's long axis is three z = south)
    m.castShadow = m.receiveShadow = true;
    siteUV(m.geometry, cx, RAMP.y0 - L / 2, RAMP.h / 2, 'y');
    scene.add(m);
    B(cx - 0.15, cx + 0.15, RAMP.y0 - 0.5, RAMP.y0 - 0.2, 0, 0.14, MAT.conc, { col: false });
  }
}
// ---- worn ground of the work yard: wood chips round the chopping block and under the sawhorse, bare earth under the car ----
{
  const CHIPS = patchSV(
    new THREE.MeshStandardMaterial(
      Object.assign(
        {
          map: canvasTex(256, 256, (q, w, h) => {
            const r0 = (
              s => () =>
                ((s = (s * 16807) % 2147483647) - 1) / 2147483646
            )(7);
            q.fillStyle = '#6b583f';
            q.fillRect(0, 0, w, h);
            for (let i = 0; i < 1600; i++) {
              const l = 0.6 + r0() * 0.7;
              q.fillStyle = `rgba(${(205 * l) | 0},${(165 * l) | 0},${(115 * l) | 0},${0.35 + r0() * 0.5})`;
              q.save();
              q.translate(r0() * w, r0() * h);
              q.rotate(r0() * 3.14);
              q.fillRect(-3, -1, 4 + r0() * 8, 1.5 + r0() * 2.5);
              q.restore();
            }
          }),
        },
        FLAT
      )
    )
  );
  const EARTH = plain(Object.assign({ color: 0x5c4b3a }, FLAT));
  const patch = (cx, cy, r, m, seed, sx = 1) => {
    const pts = [];
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2,
        k = r * (0.86 + 0.09 * Math.sin(i * 0.59 + seed) + 0.05 * Math.sin(i * 1.37 + seed * 2)); // a soft, irregular edge
      pts.push([cx + Math.cos(a) * k * sx, cy + Math.sin(a) * k]);
    }
    decal(pts, m, 1);
  };
  patch(HOF.block[0] - 0.3, HOF.block[1] + 0.3, 2.0, CHIPS, 1);
  patch(HOF.horse[0], HOF.horse[1] + 0.2, 1.4, CHIPS, 2);
  patch(HOF.car.x, HOF.car.y + 0.4, 3.1, EARTH, 3, 0.55);
}
// ---- the long white box body beside Hubert's sheds (photos 7208, 7233, 7234: „Zeit zum Entspannen“ on its side facing the garden) ----
{
  const { x0, x1, y0, y1 } = LAYOUT.boxBody,
    z0 = 0.45,
    z1 = 3.0;
  B(x0, x1, y0, y1, z0, z1, WHITE);
  B(x0 + 0.1, x1 - 0.1, y0 + 0.4, y1 - 0.4, 0.05, z0, MAT.blacksteel, { col: false });
  for (const y of [y0 + 1.2, y1 - 1.2])
    for (const x of [x0 + 0.1, x1 - 0.1])
      B(x - 0.11, x + 0.11, y - 0.36, y + 0.36, 0, 0.7, MAT.blacksteel, { col: false });
  // the black door panel low in the middle of the side facing the garden (photo 7233)
  B(x1, x1 + 0.03, (y0 + y1) / 2 - 0.8, (y0 + y1) / 2 + 0.6, z0 + 0.05, z0 + 1.35, MAT.black, { col: false });
  // the writing and the round logo on the east side, as a small canvas picture
  const cv = document.createElement('canvas');
  cv.width = 512;
  cv.height = 160;
  const c = cv.getContext('2d');
  c.fillStyle = '#eeeeea';
  c.fillRect(0, 0, 512, 160);
  c.strokeStyle = '#5c8fb0';
  c.lineWidth = 6;
  c.beginPath();
  c.arc(78, 80, 46, 0, Math.PI * 2);
  c.stroke();
  c.fillStyle = '#6d7174';
  c.font = '600 34px sans-serif';
  c.fillText('ZEIT ZUM', 150, 70);
  c.fillText('ENTSPANNEN', 150, 112);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = ANISO;
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.0), plain({ map: tex, roughness: 0.6 }));
  sign.position.copy(V(x1 + 0.012, (y0 + y1) / 2 + 0.6, 2.2));
  sign.rotation.y = Math.PI / 2;
  scene.add(sign);
}
// ---- where on Hubert's land a point is (npc/life.js names the places): his yard by the path, the lane, a shed ----
const inPolyXY = (x, y, P) => {
  let c = false;
  for (let i = 0, j = P.length - 1; i < P.length; j = i++) {
    const [xi, yi] = P[i],
      [xj, yj] = P[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
};
const YARD = LAYOUT.gravel.map(pt);
HOF.placeAt = (x, y) => {
  for (const S of SHEDS) {
    if (!S) continue;
    const dx = x - S.c[0],
      dy = y - S.c[1];
    if (Math.abs(dx * S.u[0] + dy * S.u[1]) < S.D / 2 && Math.abs(dx * S.v[0] + dy * S.v[1]) < S.L / 2) return S.name;
  }
  if (inCulvert(x, y) || inPolyXY(x, y, YARD)) return 'Huberts Hof';
  return null;
};
