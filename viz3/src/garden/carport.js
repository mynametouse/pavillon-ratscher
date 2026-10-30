import * as THREE from 'three';
import { V } from '../core/head.js';
import { MAT } from '../core/mats.js';
import { beam, bldBegin, bldEnd, boardLeaf, COL, cyl, PH, PH_END, RB, tagPh } from '../core/geo.js';
import { placeGLB } from '../pavilion/interior.js';
import {
  BLD,
  faceOf,
  FOOT,
  gB,
  inLocal,
  INSIDE,
  lcol,
  ldoor,
  lwalk,
  lwc,
  MATS,
  rotDesc,
  SINK,
  siteGroup,
  slopeSlab,
  wheel,
  worldOf,
} from './site_base.js';
// the caravan's roof stands on white-painted timber posts and beams with knee braces (Falko, 29.10.2026; photos of 26.10.2026)
const FRAMEW = MATS.white;
import { bulbMat, GLAMPS, GSEATS, mergeGroup, put, twin } from './garten_kit.js';
// feat/einrichtung: the caravan's own materials (twins: the same shader programs) – the interior styles change their colours
export const CW = {
  floor: twin(MAT.oakF),
  wood: twin(MAT.larchIn),
  wood2: twin(MAT.oak),
  fab: twin(MAT.sage),
  bedA: twin(MAT.wool),
  bedB: twin(MAT.woolLight),
  sheet: twin(MAT.linen),
};
export const CV = { anchor: null, inside: () => false, zf: 0.5, windows: [], bed: 0 };
bldBegin('carport', 'Carport mit Wohnwagen', BLD.carport.c, { short: 'Carport', pad: 0.3 });
// ===== B: carport 6,0 × 4,0 m, ca. 3,5 m hoch (Pfosten 12/12, Pfetten, Sparren, Trapezblech) with the Tabbert caravan; door side faces the garden entrance (north) =====
{
  const b = BLD.carport,
    g = siteGroup(b);
  const hx = b.L / 2,
    hy = b.W / 2;
  const zh = 3.05,
    zl = 2.8,
    py = hy - 0.2;
  const xs = [-hx + 0.25, 0, hx - 0.25],
    hasPost = (x, sy) => !(x === 0 && sy > 0); // the front (north, the door side) has two posts only, no middle one (Falko 30.10.2026)
  for (const x of xs)
    for (const sy of [-1, 1]) {
      if (!hasPost(x, sy)) continue;
      const zt = sy > 0 ? zh : zl,
        y = sy * py;
      gB(g, x - 0.06, x + 0.06, y - 0.06, y + 0.06, 0.12, zt, FRAMEW, { grain: 'z' });
      gB(g, x - 0.08, x + 0.08, y - 0.08, y + 0.08, 0, 0.12, MAT.galv);
      if (x !== 0) beam([x, y, zt - 0.75], [x - Math.sign(x) * 0.7, y, zt - 0.02], 0.06, 0.1, FRAMEW, { parent: g });
      beam([x, y, zt - 0.6], [x, y - sy * 0.55, zt - 0.02], 0.06, 0.1, FRAMEW, { parent: g });
    }
  for (const sy of [-1, 1]) {
    const zt = sy > 0 ? zh : zl;
    gB(g, -hx, hx, sy * py - 0.06, sy * py + 0.06, zt, zt + 0.2, FRAMEW, { grain: 'x' });
  } // Pfetten
  const k = (zh - zl) / (2 * py),
    zr = y => zl + 0.2 + (y + py) * k; // underside of the rafters
  const nR = 9;
  for (let i = 0; i < nR; i++) {
    const x = -hx + 0.08 + (i * (b.L - 0.16)) / (nR - 1);
    beam([x, -hy - 0.25, zr(-hy - 0.25) + 0.08], [x, hy + 0.25, zr(hy + 0.25) + 0.08], 0.08, 0.16, FRAMEW, {
      parent: g,
    });
  }
  slopeSlab(g, 0, 0, zr(0) + 0.175, b.L + 0.3, b.W + 0.5, 0.03, k * (b.W + 0.5), MAT.metal);
  for (const x of xs)
    for (const sy of [-1, 1]) {
      if (!hasPost(x, sy)) continue;
      const c = worldOf(b, x, sy * py);
      COL.push([c[0] - 0.1, c[0] + 0.1, c[1] - 0.1, c[1] + 0.1, 0, 2.6, 'post', PH, PH_END]);
    }
  FOOT.push({ b, hx, hy, ox: 0, oy: 0 });
  // garden table and two folding chairs just outside the south-east corner (photo-scanned bistro set; the box version stays as fallback)
  {
    const w = worldOf(b, hx + 0.15, -hy - 0.85);
    placeGLB('garden_set', { x: w[0], y: w[1], z: 0, face: faceOf(b, 90), h: 0.86 }, () => {
      gB(g, hx - 0.2, hx + 0.5, -hy - 1.2, -hy - 0.5, 0.68, 0.72, MAT.larch);
      for (const [x, y] of [
        [hx - 0.15, -hy - 1.15],
        [hx + 0.45, -hy - 1.15],
        [hx - 0.15, -hy - 0.55],
        [hx + 0.45, -hy - 0.55],
      ])
        gB(g, x - 0.02, x + 0.02, y - 0.02, y + 0.02, 0, 0.68, MAT.larch, { grain: 'z', cast: false });
      gB(g, hx - 0.85, hx - 0.4, -hy - 1.1, -hy - 0.65, 0.44, 0.48, MAT.linen);
      gB(g, hx - 0.85, hx - 0.79, -hy - 1.1, -hy - 0.65, 0.48, 0.95, MAT.linen);
      gB(g, hx + 0.65, hx + 1.1, -hy - 1.1, -hy - 0.65, 0.44, 0.48, MAT.linen);
      gB(g, hx + 1.04, hx + 1.1, -hy - 1.1, -hy - 0.65, 0.48, 0.95, MAT.linen);
      const r = rotDesc(b);
      lcol(r, hx - 0.25, hx + 0.55, -hy - 1.25, -hy - 0.45, 0, 0.75, 'table');
    });
  }
}
// ===== Wohnwagen (Tabbert, Bj. 80er): Aufbau 5,0 × 2,2 m, Deichsel nach Westen, Tür auf der Nordseite zum Garteneingang (links), Innenhöhe 1,90 m =====
{
  const b = BLD.carport,
    g = siteGroup(b);
  const cvx = 0.35,
    cvy = -0.35;
  const cv = new THREE.Group();
  cv.position.copy(V(cvx, cvy, 0));
  g.add(cv);
  const X0 = -2.5,
    X1 = 2.5,
    Z0 = 0.42,
    Z1 = 2.58,
    HW = 1.1,
    zf = 0.5;
  const arc = (cx, cz, r, a0, a1, n) => {
    const o = [];
    for (let i = 0; i <= n; i++) {
      const a = a0 + ((a1 - a0) * i) / n;
      o.push(new THREE.Vector2(cx + r * Math.cos(a), cz + r * Math.sin(a)));
    }
    return o;
  };
  const outline = [
    ...arc(X0 + 0.1, Z0 + 0.1, 0.1, Math.PI, 1.5 * Math.PI, 3),
    ...arc(X1 - 0.1, Z0 + 0.1, 0.1, -0.5 * Math.PI, 0, 3),
    ...arc(X1 - 0.25, Z1 - 0.25, 0.25, 0, 0.5 * Math.PI, 6),
    ...arc(X0 + 0.62, Z1 - 0.62, 0.62, 0.5 * Math.PI, Math.PI, 12),
  ];
  const dens = (pts, maxL) => {
    const o = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        c = pts[(i + 1) % pts.length];
      const n = Math.max(1, Math.ceil(a.distanceTo(c) / maxL));
      for (let k = 0; k < n; k++) o.push(a.clone().lerp(c, k / n));
    }
    return o;
  };
  const offs = (pts, d) =>
    pts.map((p, i) => {
      const a = pts[(i - 1 + pts.length) % pts.length],
        c = pts[(i + 1) % pts.length];
      const tx = c.x - a.x,
        tz = c.y - a.y,
        L = Math.hypot(tx, tz) || 1;
      return new THREE.Vector2(p.x - (tz / L) * d, p.y + (tx / L) * d);
    });
  const OUT = dens(outline, 0.1),
    INN = offs(OUT, 0.035);
  // window holes in the wrap (front panorama window, rear window): y spans to leave open per segment midpoint
  const wrapHole = m =>
    m.x < X0 + 0.32 && m.y > 1.3 && m.y < 2.32 ? 0.85 : m.x > X1 - 0.05 && m.y > 1.6 && m.y < 2.2 ? 0.7 : 0;
  function ribbon(pts, y0, y1, inward, mat, glassOnly = false) {
    const P = [],
      N = [],
      U = [];
    let s = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        c = pts[(i + 1) % pts.length];
      const dx = c.x - a.x,
        dz = c.y - a.y,
        L = Math.hypot(dx, dz);
      if (L < 1e-5) continue;
      let nx = dz / L,
        nz = -dx / L;
      if (inward) {
        nx = -nx;
        nz = -nz;
      }
      const m = a.clone().add(c).multiplyScalar(0.5),
        hw = wrapHole(m);
      const spans = glassOnly
        ? hw
          ? [[-hw, hw]]
          : []
        : hw
          ? [
              [y0, -hw],
              [hw, y1],
            ]
          : [[y0, y1]];
      for (const [ya, yb] of spans) {
        const q = [
          [a.x, ya, a.y],
          [c.x, ya, c.y],
          [c.x, yb, c.y],
          [a.x, yb, a.y],
        ].map(p => new THREE.Vector3(p[0], p[2], -p[1]));
        const nrm = new THREE.Vector3(nx, nz, 0);
        const e1 = q[1].clone().sub(q[0]),
          e2 = q[2].clone().sub(q[0]);
        const flip = e1.cross(e2).dot(nrm) < 0;
        const tri = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3];
        const uv = [
          [s, ya],
          [s + L, ya],
          [s + L, yb],
          [s, yb],
        ];
        for (const k of tri) {
          P.push(q[k].x, q[k].y, q[k].z);
          N.push(nrm.x, nrm.y, nrm.z);
          U.push(uv[k][0], uv[k][1]);
        }
      }
      s += L;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    const me = new THREE.Mesh(geo, mat);
    me.castShadow = !glassOnly;
    me.receiveShadow = true;
    if (glassOnly) me.renderOrder = 2;
    cv.add(me);
    return tagPh(me);
  }
  ribbon(OUT, -HW, HW, false, MATS.cream);
  ribbon(INN, -HW + 0.035, HW - 0.035, true, MATS.liner);
  ribbon(offs(OUT, 0.012), -HW, HW, false, MATS.tint, true);
  // side panels with real holes: door (north), windows; outer skin and inner lining
  // feat/einrichtung (Falko, 23.10.2026: „das Bett rechts und nicht links … sozusagen gespiegelt“): the windows follow the mirrored interior –
  // bed windows at the front, the dinette's at the rear, the kitchen window over the kitchen; the door stays where it is
  const HOLES = {
    1: [
      [0.2, 0.85, 0.55, 2.25],
      [-0.55, 0.05, 1.2, 1.85],
      [1.45, 2.3, 1.3, 1.85],
      [-2.3, -1.3, 1.3, 1.85],
    ],
    [-1]: [
      [0.75, 1.75, 1.2, 1.9],
      [-0.45, 0.5, 1.5, 1.95],
      [-2.3, -1.3, 1.3, 1.85],
    ],
  };
  CV.windows = [...HOLES[1].filter(q => q[0] !== 0.2).map(q => [1, ...q]), ...HOLES[-1].map(q => [-1, ...q])];
  for (const sy of [1, -1]) {
    for (const [pts, yy, m] of [
      [OUT, sy * HW, MATS.cream],
      [INN, sy * (HW - 0.035), MATS.liner],
    ]) {
      const sh = new THREE.Shape(pts.map(p => p.clone()));
      for (const [x0, x1, z0, z1] of HOLES[sy]) {
        const h = new THREE.Path();
        h.moveTo(x0, z0);
        h.lineTo(x1, z0);
        h.lineTo(x1, z1);
        h.lineTo(x0, z1);
        h.closePath();
        sh.holes.push(h);
      }
      const geo = new THREE.ShapeGeometry(sh, 4);
      const me = new THREE.Mesh(geo, m);
      me.position.z = -yy;
      me.castShadow = true;
      me.receiveShadow = true;
      cv.add(me);
      tagPh(me);
    }
    for (const [x0, x1, z0, z1] of HOLES[sy]) {
      const door = x0 === 0.2 && sy > 0;
      const y0 = sy > 0 ? HW - 0.045 : -HW - 0.01,
        y1 = sy > 0 ? HW + 0.01 : -HW + 0.045;
      gB(cv, x0 - 0.03, x0, y0, y1, z0, z1, MAT.black, { cast: false });
      gB(cv, x1, x1 + 0.03, y0, y1, z0, z1, MAT.black, { cast: false });
      gB(cv, x0 - 0.03, x1 + 0.03, y0, y1, z1, z1 + 0.03, MAT.black, { cast: false });
      gB(cv, x0 - 0.03, x1 + 0.03, y0, y1, z0 - 0.03, z0, door ? MAT.alu : MAT.black, { cast: false });
      if (!door) {
        const gl = gB(cv, x0, x1, sy * (HW - 0.015) - 0.003, sy * (HW - 0.015) + 0.003, z0, z1, MATS.tint, {
          cast: false,
          recv: false,
        });
        if (gl) gl.renderOrder = 2;
      }
    }
    // brown/gold decor stripes, cut at the door
    const ys0 = sy > 0 ? HW : -HW - 0.006,
      ys1 = sy > 0 ? HW + 0.006 : -HW;
    for (const [z0, z1, m] of [
      [1.02, 1.1, MATS.oldFrame],
      [1.13, 1.16, MATS.gold],
    ])
      for (const [x0, x1] of sy > 0
        ? [
            [X0 + 0.05, 0.17],
            [0.88, X1 - 0.05],
          ]
        : [[X0 + 0.05, X1 - 0.05]])
        gB(cv, x0, x1, ys0, ys1, z0, z1, m, { cast: false });
  }
  // chassis, axle, wheels, corner steadies, A-frame drawbar with gas box and jockey wheel, rear lights, roof vent
  for (const y of [-0.62, 0.62]) gB(cv, X0 + 0.2, X1 - 0.3, y - 0.04, y + 0.04, 0.26, 0.42, MAT.galv);
  gB(cv, -0.75, -0.45, -1.0, 1.0, 0.26, 0.34, MAT.galv);
  wheel(cv, -0.6, 1.0, 0.32, 0.31, 0.17, 0.17);
  wheel(cv, -0.6, -1.0, 0.32, 0.31, 0.17, 0.17);
  for (const [x, y] of [
    [X0 + 0.35, 0.62],
    [X0 + 0.35, -0.62],
    [X1 - 0.4, 0.62],
    [X1 - 0.4, -0.62],
  ]) {
    gB(cv, x - 0.05, x + 0.05, y - 0.05, y + 0.05, 0.03, 0.3, MAT.steel, { grain: 'z' });
    gB(cv, x - 0.1, x + 0.1, y - 0.1, y + 0.1, 0, 0.03, MAT.conc);
  }
  beam([X0 + 0.25, 0.55, 0.36], [X0 - 1.05, 0.04, 0.4], 0.07, 0.07, MAT.galv, { parent: cv });
  beam([X0 + 0.25, -0.55, 0.36], [X0 - 1.05, -0.04, 0.4], 0.07, 0.07, MAT.galv, { parent: cv });
  gB(cv, X0 - 1.25, X0 - 1.0, -0.08, 0.08, 0.34, 0.5, MAT.steel);
  gB(cv, X0 - 0.8, X0 - 0.73, -0.035, 0.035, 0.12, 0.45, MAT.steel);
  wheel(cv, X0 - 0.77, 0, 0.1, 0.1, 0.05, 0.03);
  gB(cv, X0 - 0.62, X0 - 0.05, -0.42, 0.42, 0.42, 0.8, MATS.creamBox, { bevel: 0.03 });
  for (const sy of [-1, 1])
    gB(cv, X1 - 0.005, X1 + 0.012, sy * 0.85 - 0.08, sy * 0.85 + 0.08, 0.6, 0.85, MATS.tomato, { cast: false });
  gB(cv, -0.6, 0.0, -0.3, 0.3, Z1 - 0.01, Z1 + 0.07, MATS.white);
  gB(cv, -0.55, -0.05, -0.25, 0.25, Z1 + 0.07, Z1 + 0.075, MATS.tint, { cast: false });
  // --- interior (feat/einrichtung: mirrored – entering through the door the bed is on the right): transverse double bed at the front (west,
  // under the panorama window), wardrobes, cupboard west of the door, kitchen opposite (south), dinette at the rear (east), overhead lockers.
  // The own materials (CW) let the interior styles change colours (garden/stil_bauten.js); CV.anchor carries the style layer.
  gB(cv, X0 + 0.05, X1 - 0.05, -HW + 0.04, HW - 0.04, zf - 0.03, zf, CW.floor, { grain: 'x', cast: false });
  // dinette (rear): bench across the rear wall, two side benches, table on one leg
  gB(cv, X1 - 0.5, X1 - 0.04, -1.05, 1.05, zf, zf + 0.42, CW.wood);
  RB(X1 - 0.5, X1 - 0.06, -1.03, 1.03, zf + 0.42, zf + 0.5, 0.025, CW.fab, { parent: cv });
  RB(X1 - 0.2, X1 - 0.06, -1.0, 1.0, zf + 0.5, zf + 0.92, 0.04, CW.fab, { parent: cv });
  for (const sy of [-1, 1]) {
    gB(cv, 1.35, X1 - 0.5, sy > 0 ? 0.5 : -1.05, sy > 0 ? 1.05 : -0.5, zf, zf + 0.42, CW.wood);
    RB(1.37, X1 - 0.5, sy > 0 ? 0.52 : -1.03, sy > 0 ? 1.03 : -0.52, zf + 0.42, zf + 0.5, 0.025, CW.fab, {
      parent: cv,
    });
    RB(1.37, X1 - 0.5, sy > 0 ? 0.9 : -1.03, sy > 0 ? 1.03 : -0.9, zf + 0.5, zf + 0.9, 0.04, CW.fab, { parent: cv });
  }
  // the table can be lowered onto the benches – with two cushions on it the dinette becomes a bed (garden/stil_bauten.js): table top and leg,
  // and the filler cushions, are groups of their own (merged by themselves, not with the caravan)
  {
    const tg = new THREE.Group(),
      leg = new THREE.Group(),
      fill = new THREE.Group();
    cv.add(tg, leg, fill);
    gB(tg, 1.42, X1 - 0.55, -0.42, 0.42, zf + 0.68, zf + 0.72, CW.wood2);
    gB(leg, 1.88, 1.95, -0.04, 0.04, zf, zf + 0.68, MAT.alu, { grain: 'z', cast: false });
    for (const [y0, y1] of [
      [-0.42, -0.005],
      [0.005, 0.42],
    ])
      RB(1.43, X1 - 0.56, y0, y1, zf + 0.42, zf + 0.5, 0.025, CW.fab, { parent: fill });
    fill.visible = false;
    for (const gg of [tg, leg, fill]) mergeGroup(gg, { cast: false });
    Object.assign(CV, { table: tg, leg, fill });
  }
  // cupboard between the wardrobe and the door (north), kitchen opposite the door (south): worktop, sink, two-burner hob
  gB(cv, -0.62, 0.12, 0.6, 1.06, zf, zf + 0.62, CW.wood);
  gB(cv, -0.64, 0.14, 0.58, 1.06, zf + 0.62, zf + 0.65, CW.wood2, { cast: false });
  gB(cv, -0.62, 0.68, -1.06, -0.5, zf, zf + 0.88, CW.wood);
  gB(cv, -0.64, 0.7, -1.06, -0.48, zf + 0.88, zf + 0.92, MATS.white, { cast: false });
  cyl(-0.3, -0.78, zf + 0.92, zf + 0.93, 0.15, SINK, 18, undefined, { parent: cv, cast: false });
  gB(cv, 0.12, 0.57, -0.98, -0.58, zf + 0.925, zf + 0.945, MAT.black, { cast: false });
  // two wardrobes (full height) between the bed and the middle
  gB(cv, -1.1, -0.67, 0.5, 1.06, zf, zf + 1.86, CW.wood, { grain: 'z' });
  gB(cv, -1.1, -0.67, -1.06, -0.5, zf, zf + 1.86, CW.wood, { grain: 'z' });
  // the transverse double bed (one lies across the caravan, head at the north side): base, mattress, duvet, two pillows
  gB(cv, X0 + 0.06, -1.12, -1.05, 1.05, zf, zf + 0.42, CW.wood);
  gB(cv, X0 + 0.08, -1.14, -1.03, 1.03, zf + 0.42, zf + 0.58, CW.sheet, { cast: false });
  RB(X0 + 0.1, -1.16, -1.0, 0.52, zf + 0.58, zf + 0.65, 0.03, CW.bedA, { parent: cv });
  RB(X0 + 0.14, -1.86, 0.58, 0.96, zf + 0.6, zf + 0.74, 0.05, CW.bedB, { parent: cv });
  RB(-1.8, -1.2, 0.58, 0.96, zf + 0.6, zf + 0.74, 0.05, CW.bedB, { parent: cv });
  for (const [x0, x1] of [
    [1.4, X1 - 0.3],
    [X0 + 0.2, -1.17],
  ])
    for (const sy of [-1, 1])
      gB(cv, x0, x1, sy > 0 ? 0.72 : -1.05, sy > 0 ? 1.05 : -0.72, 1.95, 2.3, CW.wood, { cast: false });
  gB(cv, 0.22, 0.83, HW + 0.03, HW + 0.4, 0.22, 0.25, MAT.galv);
  gB(cv, 0.25, 0.8, HW + 0.36, HW + 0.4, 0.0, 0.22, MAT.galv, { cast: false }); // Einstiegstritt
  {
    const w = worldOf(b, cvx + 1.65, cvy);
    placeGLB('lantern_t', { x: w[0], y: w[1], z: zf + 0.72, face: 30, h: 0.3, col: false });
  }
  // --- collision and floors (local frame of the caravan body)
  const r = rotDesc(b, cvx, cvy);
  lwalk(r, X0 + 0.05, X1 - 0.05, -HW + 0.04, HW + 0.05, zf);
  lwalk(r, 0.22, 0.83, HW + 0.05, HW + 0.4, 0.25, 'stone');
  lwc(r, 'x', X0, X1, HW - 0.04, HW + 0.03, zf, Z1, [{ a0: 0.2, a1: 0.85, s: 0.3, h: 2.3 }], 'caravan');
  lwc(r, 'x', X0, X1, -HW - 0.03, -HW + 0.04, zf, Z1, [], 'caravan');
  lcol(r, X0 - 0.03, X0 + 0.04, -HW, HW, zf, Z1, 'caravan');
  lcol(r, X1 - 0.04, X1 + 0.03, -HW, HW, zf, Z1, 'caravan');
  lcol(r, X0, X1, -HW, HW, 0, 0.47, 'caravan');
  lcol(r, X0 - 1.3, X0, -0.45, 0.45, 0, 0.82, 'drawbar');
  lcol(r, 1.35, X1 - 0.04, -1.05, 1.05, zf, zf + 0.5, 'bench');
  lcol(r, 1.42, X1 - 0.55, -0.42, 0.42, zf + 0.25, zf + 0.72, 'table');
  CV.tableCol = COL[COL.length - 1];
  lcol(r, -0.62, 0.12, 0.6, 1.06, zf, zf + 0.65, 'cupboard');
  lcol(r, -0.62, 0.68, -1.06, -0.5, zf, zf + 0.92, 'kitchen');
  lcol(r, -1.1, -0.67, 0.5, 1.06, zf, zf + 1.86, 'wardrobe');
  lcol(r, -1.1, -0.67, -1.06, -0.5, zf, zf + 1.86, 'wardrobe');
  lcol(r, X0 + 0.06, -1.12, -1.05, 1.05, zf, zf + 0.64, 'bed');
  // places: the dinette (north bench, looking at the table) and the bed (head at the north side, looking along it)
  GSEATS.push(
    {
      key: 'wohnwagen-sitz',
      b,
      lx: cvx + 1.72,
      ly: cvy + 0.78,
      eye: zf + 0.5 + 0.72,
      yaw: 90,
      pitch: -6,
      kind: 'sit',
      label: () => (CV.bed ? null : 'In die Sitzecke setzen'),
      at: [cvx + 1.0, cvy + 0.25],
      r: 1.2,
    },
    {
      key: 'wohnwagen-bett',
      b,
      lx: cvx - 1.8,
      ly: cvy + 0.74,
      eye: zf + 0.58 + 0.32,
      yaw: 90,
      pitch: 2,
      kind: 'lie',
      label: 'Ins Bett legen',
      at: [cvx - 0.88, cvy],
      r: 1.6,
    }
  );
  // a ceiling light (round plastic dome as in the 80s) over the middle, switch inside by the door – it borrows the garden's one lamp light
  // (garden/garten_in.js: no new point light)
  {
    const domeM = bulbMat(0xf6efe0);
    put(
      cv,
      new THREE.SphereGeometry(0.15, 18, 6, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
      domeM,
      0.3,
      0,
      Z1 - 0.045,
      {
        s: [1, 0.45, 1],
        cast: false,
      }
    );
    put(cv, new THREE.CylinderGeometry(0.16, 0.16, 0.012, 20), MATS.white, 0.3, 0, Z1 - 0.042, { cast: false });
    gB(cv, 0.08, 0.14, HW - 0.04, HW - 0.035, 1.42, 1.5, MATS.white, { cast: false });
    gB(cv, 0.1, 0.12, HW - 0.045, HW - 0.04, 1.44, 1.48, MAT.black, { cast: false });
    GLAMPS.push({
      key: 'wohnwagen',
      b,
      lx: cvx + 0.3,
      ly: cvy,
      z: Z1 - 0.12,
      mat: domeM,
      glow: 1.6,
      dist: 3.6,
      inten: 3.4,
      color: 0xffe2b8,
      sw: [cvx + 0.11, cvy + HW - 0.05, 1.46],
      label: 'Licht',
      room: (x, y, z) => CV.inside(x, y, z),
      r: 1.2,
    });
  }
  CV.anchor = cv;
  Object.assign(CV, { cvx, cvy, b });
  CV.inside = (x, y, z) => z > zf - 0.6 && z < Z1 + 0.2 && inLocal(b, x, y, X1, HW, cvx, cvy);
  CV.zf = zf;
  // door: hinged at the front (west) jamb as on German caravans, opens outwards
  ldoor('caravan', b, boardLeaf(0.65, 1.7, { boards: false, mat: MATS.creamBox, glass: [0.33, 0.44, 0.95, 1.45] }), {
    lx: 0.2,
    ly: HW - 0.02,
    dir: [1, 0],
    w: 0.65,
    sign: 1,
    z0: 0.55,
    z1: 2.25,
    ox: cvx,
    oy: cvy,
  });
  INSIDE.push({ b, hx: 2.5, hy: 1.1, ox: cvx, oy: cvy, z0: zf - 0.1, z1: Z1 + 0.1, name: 'Wohnwagen' });
}

bldEnd(BLD.carport);
