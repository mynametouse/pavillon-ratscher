import * as THREE from 'three';
import { V } from '../core/head.js';
import { plain } from '../core/assets.js';
import { MAT } from '../core/mats.js';
import { beam, bldBegin, bldEnd, boardLeaf, cyl, tagPh } from '../core/geo.js';
import { placeGLB } from '../pavilion/interior.js';
import {
  planned,
  todayLook,
  BLD,
  faceOf,
  FOOT,
  gB,
  INSIDE,
  lbox,
  lcol,
  ldoor,
  ljamb,
  lshut,
  lw,
  lwalk,
  lwc,
  lwin,
  MATS,
  rotDesc,
  SINK,
  siteGroup,
  slopeSlab,
  worldOf,
} from './site_base.js';
import {
  armchair,
  bareBulb,
  bookMesh,
  bookRow,
  bulbMat,
  curtain,
  GACTS,
  garment,
  GLAMPS,
  GSEATS,
  jar,
  keysEnd,
  KM,
  mug,
  interiorNoShadow,
  paletteize,
  picture,
  plant,
  pot,
  put,
  rng,
  soft,
  twin,
} from './garten_kit.js';
// feat/einrichtung: the bungalow's own materials (twins: the same shader programs) – the interior styles change their colours; the
// furniture that changes with the style is built by garden/stil_bauten.js into BUNG.anchor
export const BW = {
  wood: twin(MAT.oak),
  sofa: twin(MAT.rust),
  cush: twin(MAT.sage),
  throw: twin(MAT.woolLight),
  rug: twin(MAT.rug),
};
export const BUNG = {};
// ===== D: grüner Bungalow (5,0 × 5,0 m) wie der Wohnwagen zur Pforte ausgerichtet: Giebel mit Haustür nach Norden, First Nord–Süd, Hintertür im Südgiebel
// geradeaus gegenüber. Seit 23.10.2026 (Falko) mit Anbau im Osten: eine kleine angebaute Garage, zum Raum ausgebaut – 1 m hinter dem Eingang
// buchtet die linke (östliche) Wand 1,5 m aus, dort steht das Bett. Innen: rechts in der Ecke die Küche, dahinter das Sofa; links der Hintertür ein
// taubenblauer, fast weißer Kleiderschrank, links daneben das Bett; in der Mitte eine nackte Glühbirne. =====
// Where it stands (30.10.2026): the orthophoto of 07.04.2024 (TH DOP) and Falko's photos 7197, 7222–7225, 7237 put it beside the washhouse,
// ~6.7 m further south than before, turned 6° like the washhouse (site.js bld). Beyond the annex in the east an open lean-to with the
// things kept dry (old window sashes, boards, a tarpaulin bundle – photos 7222, 7223: Falko's „das ganze linke seitliche Überdach");
// the front gable's roof runs on as a deep porch over the door.
// local frame (az 0): +x = north (front gable), −x = south (back gable), +y = west, −y = east; walking in from the north: right = west, left = east
const b0 = BLD.bungalow,
  AX1 = b0.L / 2 - 1.0, // annex: north face 1 m behind the front wall
  AY0 = -b0.W / 2 - 1.5, // annex: east face 1.5 m out
  ANX = { hx: (AX1 + b0.L / 2) / 2, hy: 0.75, ox: (AX1 - b0.L / 2) / 2, oy: -b0.W / 2 - 0.75 },
  LT = { y0: AY0 - 0.2, w: 1.3, x0: -b0.L / 2 - 0.1, x1: AX1 - 0.1, z0: 1.98, z1: 1.74 }; // the open lean-to beyond the annex
bldBegin('bungalow', 'Bungalow', b0.c, {
  short: 'Bungalow',
  rects: [
    { c: b0.c, az: b0.az, hx: b0.L / 2 + 0.3, hy: b0.W / 2 + 0.3 },
    { c: worldOf(b0, ANX.ox, ANX.oy), az: b0.az, hx: ANX.hx + 0.15, hy: ANX.hy + 0.15 },
    {
      c: worldOf(b0, (LT.x0 + LT.x1) / 2, LT.y0 - LT.w / 2),
      az: b0.az,
      hx: (LT.x1 - LT.x0) / 2 + 0.1,
      hy: LT.w / 2 + 0.1,
    },
  ],
});
{
  const b = BLD.bungalow,
    g = siteGroup(b),
    R = rng(815);
  const hx = b.L / 2,
    hy = b.W / 2,
    z0 = 0.12,
    zw = 2.15,
    pitch = 0.42,
    zr = zw + hy * pitch,
    T = 0.1,
    L = 0.012,
    zf = 0.14,
    za = 2.0, // annex ceiling (it sits under the eave of the main roof)
    zaw = 2.02; // annex walls outside
  const r = rotDesc(b);
  const W = (lx, ly) => worldOf(b, lx, ly);
  const GL = (id, lx, ly, z, f, o = {}) => {
    const w = W(lx, ly);
    return placeGLB(id, Object.assign({ x: w[0], y: w[1], z, face: faceOf(b, f) }, o));
  };
  // ---- slabs ----
  gB(g, -hx - 0.05, hx + 0.05, -hy - 0.05, hy + 0.05, 0, z0, MAT.conc, { cast: false });
  gB(g, -hx - 0.05, AX1 + 0.05, AY0 - 0.05, -hy - 0.05, 0, z0, MAT.conc, { cast: false });
  // ---- openings: N front gable, S back gable (runs on into the annex), W long side, AE annex east, AN annex north ----
  const DF = { a0: -0.45, a1: 0.45, s: z0, h: 2.02 },
    DB = { a0: -0.4, a1: 0.4, s: z0, h: 2.02 };
  const OPS = {
    N: [DF, { a0: -1.95, a1: -1.15, s: 0.95, h: 1.8 }, { a0: 1.15, a1: 1.95, s: 1.12, h: 1.8 }], // window – door – kitchen window (higher sill)
    S: [DB, { a0: 0.62, a1: 1.32, s: 1.0, h: 1.8 }],
    W: [
      { a0: -1.35, a1: -0.55, s: 1.0, h: 1.8 }, // over the sofa
      { a0: 0.55, a1: 1.35, s: 1.12, h: 1.8 }, // over the kitchen counter
    ],
    AE: [
      { a0: -1.6, a1: -0.9, s: 1.05, h: 1.75 }, // by the bed
      { a0: 0.35, a1: 1.05, s: 0.95, h: 1.75 }, // behind the reading chair
    ],
    AN: [{ a0: -3.5, a1: -2.95, s: 1.15, h: 1.7 }],
  };
  const wm = MATS.greenBoards;
  const ROOF = todayLook(plain({ color: 0xd4d3cd, roughness: 0.95 }), 0x4e6a4a, 0xd4d3cd); // today: green bitumen shingles (photos 26.10.2026)
  // west wall (full length)
  lw(g, 'x', -hx, hx, hy - T + L, hy, z0, zw, OPS.W, wm, { grain: 'x' });
  lw(g, 'x', -hx + T, hx - T, hy - T, hy - T + L, zf, zw, OPS.W, KM.wall, { cast: false });
  // east wall: only the stub north of the annex is left
  lw(g, 'x', AX1, hx, -hy, -hy + T - L, z0, zw, [], wm, { grain: 'x' });
  lw(g, 'x', AX1 - T, hx - T, -hy + T - L, -hy + T, zf, zw, [], KM.wall, { cast: false });
  // north (front) gable
  lw(g, 'y', -hy + T - L, hy - T + L, hx - T + L, hx, z0, zw, OPS.N, wm, { grain: 'y' });
  lw(g, 'y', -hy + T, hy - T, hx - T, hx - T + L, zf, zw, OPS.N, KM.wall, { cast: false });
  // south (back) gable, the annex part lower
  lw(g, 'y', -hy, hy - T + L, -hx, -hx + T - L, z0, zw, OPS.S, wm, { grain: 'y' });
  lw(g, 'y', AY0, -hy, -hx, -hx + T - L, z0, zaw, [], wm, { grain: 'y' });
  lw(g, 'y', -hy, hy - T, -hx + T - L, -hx + T, zf, zw, OPS.S, KM.wall, { cast: false });
  lw(g, 'y', AY0 + T, -hy, -hx + T - L, -hx + T, zf, za, [], KM.wall, { cast: false });
  // annex east and north walls
  lw(g, 'x', -hx, AX1, AY0, AY0 + T - L, z0, zaw, OPS.AE, wm, { grain: 'x' });
  lw(g, 'x', -hx + T, AX1 - T, AY0 + T - L, AY0 + T, zf, za, OPS.AE, KM.wall, { cast: false });
  lw(g, 'y', AY0, -hy, AX1 - T + L, AX1, z0, zaw, OPS.AN, wm, { grain: 'y' });
  lw(g, 'y', AY0 + T, -hy + T, AX1 - T, AX1 - T + L, zf, za, OPS.AN, KM.wall, { cast: false });
  // floors, ceilings, the header where the old east wall was opened
  gB(g, -hx + T, hx - T, -hy + T, hy - T, z0, zf, KM.floor, { grain: 'x', cast: false });
  gB(g, -hx + T, AX1 - T, AY0 + T, -hy + T, z0, zf, KM.floor, { grain: 'x', cast: false });
  gB(g, -hx + T, hx - T, -hy, hy - T, zw - 0.02, zw, KM.ceil, { grain: 'x', cast: false });
  gB(g, -hx + T, AX1 - T, AY0 + T, -hy, za - 0.02, za, KM.ceil, { grain: 'x', cast: false });
  gB(g, -hx + T, AX1 - T, -hy - 0.06, -hy + 0.06, za - 0.07, zw - 0.02, KM.wall, { cast: false });
  // white trim: corner boards, windows with shutters, door linings
  const corner = (x, y, sy, zt) =>
    gB(g, x - 0.02, x + 0.02, sy > 0 ? y - 0.12 : y - 0.02, sy > 0 ? y + 0.02 : y + 0.12, z0, zt, MATS.white, {
      cast: false,
    });
  corner(hx, hy, 1, zw);
  corner(hx, -hy, -1, zw);
  corner(-hx, hy, 1, zw);
  corner(AX1, AY0, -1, zaw);
  corner(-hx, AY0, -1, zaw);
  for (const [run, tc, tOut, k, ops] of [
    ['y', hx - T / 2, hx, 1, OPS.N],
    ['y', -hx + T / 2, -hx, -1, OPS.S],
    ['x', hy - T / 2, hy, 1, OPS.W],
    ['x', AY0 + T / 2, AY0, -1, OPS.AE],
    ['y', AX1 - T / 2, AX1, 1, OPS.AN],
  ])
    for (const o of ops) {
      if (o.s <= z0) {
        ljamb(
          g,
          run,
          o.a0,
          o.a1,
          Math.min(tOut, tOut + 0.03 * k),
          Math.max(tOut, tOut + 0.03 * k),
          z0,
          o.h,
          MATS.white,
          0.06
        );
        continue;
      }
      lwin(g, run, o.a0, o.a1, tc, o.s, o.h, {
        frame: MATS.white,
        fw: 0.05,
        depth: T + 0.02,
        mull: [(o.a0 + o.a1) / 2],
      });
      lshut(g, run, o.a0, o.a1, tOut, k, o.s, o.h, MATS.white); // white louvred shutters, open beside the windows (photos 7210, 7222–7224, 7236)
      lbox(
        g,
        run,
        o.a0 - 0.04,
        o.a1 + 0.04,
        Math.min(tOut, tOut + 0.06 * k),
        Math.max(tOut, tOut + 0.06 * k),
        o.s - 0.04,
        o.s,
        MATS.white,
        { cast: false }
      );
      // inner sill board
      const ti = tOut - k * T;
      lbox(
        g,
        run,
        o.a0 - 0.03,
        o.a1 + 0.03,
        Math.min(ti, ti - k * 0.13),
        Math.max(ti, ti - k * 0.13),
        o.s - 0.025,
        o.s,
        MATS.white,
        {
          cast: false,
        }
      );
    }
  // ---- roof: prism along local x (ridge north–south), slabs to east and west; over the annex the east slab ends at the wall ----
  {
    const sh = new THREE.Shape();
    sh.moveTo(-hy, 0);
    sh.lineTo(0, zr - zw);
    sh.lineTo(hy, 0);
    sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: b.L, bevelEnabled: false });
    geo.translate(0, 0, -b.L / 2);
    {
      const uv = geo.attributes.uv,
        p = geo.attributes.position;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i), p.getY(i));
    }
    const me = new THREE.Mesh(geo, [MATS.greenBoards, ROOF]);
    me.rotation.y = Math.PI / 2;
    me.position.copy(V(0, 0, zw));
    me.castShadow = true;
    me.receiveShadow = true;
    g.add(me);
    tagPh(me);
  }
  const ovx = 0.5,
    ovy = 0.45,
    OVF = 1.25, // the front (north) gable's roof runs on as a porch over the door (photos 7210, 7222, 7223)
    xCut = AX1 + 0.2; // the east eave keeps its overhang only north of the annex
  const ze = zw - ovy * pitch;
  // west slope
  slopeSlab(
    g,
    (OVF - ovx) / 2,
    (hy + ovy) / 2,
    ze + ((hy + ovy) * pitch) / 2 + 0.035,
    b.L + ovx + OVF,
    hy + ovy,
    0.06,
    -(hy + ovy) * pitch,
    ROOF
  );
  gB(g, -hx - ovx, hx + OVF, hy + ovy - 0.015, hy + ovy + 0.015, ze - 0.19, ze + 0.02, MATS.white, {
    grain: 'x',
    cast: false,
  });
  // east slope: north of the annex with overhang, over the annex down to the wall
  {
    const x0 = xCut,
      x1 = hx + OVF;
    slopeSlab(
      g,
      (x0 + x1) / 2,
      -(hy + ovy) / 2,
      ze + ((hy + ovy) * pitch) / 2 + 0.035,
      x1 - x0,
      hy + ovy,
      0.06,
      (hy + ovy) * pitch,
      ROOF
    );
    gB(g, x0, x1, -hy - ovy - 0.015, -hy - ovy + 0.015, ze - 0.19, ze + 0.02, MATS.white, { grain: 'x', cast: false });
    gB(g, x0 - 0.015, x0 + 0.015, -hy - ovy, -hy, ze - 0.19, zw, MATS.white, { cast: false });
    const y0 = -hy,
      xs = -hx - ovx;
    slopeSlab(g, (xs + x0) / 2, y0 / 2, zw + (hy * pitch) / 2 + 0.035, x0 - xs, hy, 0.06, hy * pitch, ROOF);
  }
  for (const sy of [-1, 1])
    for (const sx of [-1, 1]) {
      const yo = hy + ovy,
        bx = sx > 0 ? hx + OVF : -hx - ovx;
      beam(
        [bx, sy * yo, zw - (yo - hy) * pitch - 0.09],
        [bx, 0, ze + (hy + ovy) * pitch - 0.09],
        0.03,
        0.2,
        MATS.white,
        { parent: g }
      );
    }
  // the porch: a white tie beam across the front under the roof's end, and the plate on each side
  gB(g, hx + OVF - 0.14, hx + OVF - 0.04, -hy - ovy + 0.12, hy + ovy - 0.12, ze - 0.24, ze - 0.08, MATS.white, {
    grain: 'y',
    cast: false,
  });
  // the open lean-to beyond the annex (east): the shingle roof on three posts, falling away from the annex; under it what is kept dry – old
  // window sashes leaning against the annex, boards, a blue tarpaulin bundle (photos 7222, 7223)
  {
    const yo = LT.y0 - LT.w,
      post = MAT.kvh;
    slopeSlab(
      g,
      (LT.x0 + LT.x1) / 2,
      (LT.y0 + yo) / 2 - 0.05,
      (LT.z0 + LT.z1) / 2 + 0.03,
      LT.x1 - LT.x0 + 0.2,
      LT.w + 0.1,
      0.05,
      LT.z0 - LT.z1,
      ROOF
    );
    gB(g, LT.x0 - 0.1, LT.x1 + 0.1, yo - 0.13, yo - 0.1, LT.z1 - 0.12, LT.z1 + 0.04, MAT.plank, {
      grain: 'x',
      cast: false,
    }); // the fascia board
    for (const x of [LT.x0 + 0.12, (LT.x0 + LT.x1) / 2, LT.x1 - 0.12]) {
      gB(g, x - 0.05, x + 0.05, yo + 0.02, yo + 0.12, 0, LT.z1 - 0.02, post, { grain: 'z' });
      lcol(r, x - 0.07, x + 0.07, yo, yo + 0.14, 0, LT.z1, 'post');
    }
    beam([LT.x0, yo + 0.07, LT.z1 - 0.06], [LT.x1, yo + 0.07, LT.z1 - 0.06], 0.08, 0.1, post, { parent: g }); // the plate on the posts
    // a sash leaning against the annex's east wall: white frame, glass (x0..x0 + w along the wall, its foot `off` out from the wall)
    const sash = (x0, w, h, off) => {
      const ya = AY0 - off - 0.04,
        yb = AY0 - off;
      for (const [a, b2, c, d] of [
        [x0, x0 + 0.055, 0.02, h],
        [x0 + w - 0.055, x0 + w, 0.02, h],
        [x0, x0 + w, 0.02, 0.08],
        [x0, x0 + w, h - 0.06, h],
      ])
        gB(g, a, b2, ya, yb, c, d, MATS.white, { cast: false });
      gB(g, x0 + 0.05, x0 + w - 0.05, ya + 0.015, yb - 0.015, 0.08, h - 0.06, MAT.glass, { cast: false });
    };
    sash(-1.9, 0.9, 1.35, 0.12);
    sash(-1.75, 0.75, 1.2, 0.22);
    sash(-0.4, 1.0, 1.1, 0.14);
    for (let i = 0; i < 4; i++)
      beam(
        [0.62 + i * 0.1, AY0 - 0.42 - i * 0.05, 0.02],
        [0.66 + i * 0.1, AY0 - 0.14 - i * 0.04, 1.6 - i * 0.1],
        0.18,
        0.022,
        MAT.plank,
        { parent: g }
      ); // boards leaning against the annex
    gB(g, -1.1, -0.5, yo + 0.25, yo + 0.85, 0, 0.32, MATS.blue, { bevel: 0.08 });
  }
  // annex roof: shingles, falling 7 cm to the east, white fascia, gutter and downpipe into a rain barrel at the north-east corner
  {
    const ys = -hy,
      ye = AY0 - 0.15,
      xs = -hx - 0.15,
      xe = AX1 + 0.12,
      zt0 = 2.17,
      zt1 = 2.1;
    slopeSlab(g, (xs + xe) / 2, (ys + ye) / 2, (zt0 + zt1) / 2 - 0.04, xe - xs, ys - ye, 0.08, zt0 - zt1, ROOF); // the main roof's shingles go on over it (7224)
    gB(g, xs - 0.02, xe + 0.02, ye - 0.025, ye, zt1 - 0.15, zt1 + 0.01, MATS.white, { grain: 'x', cast: false });
    for (const x of [xs, xe]) gB(g, x - 0.012, x + 0.012, ye, ys, zt1 - 0.15, zt0 + 0.01, MATS.white, { cast: false });
    gB(g, xs, xe, ys - 0.03, ys + 0.03, zt0 - 0.005, zt0 + 0.03, MAT.zinc, { cast: false }); // flashing under the main eave
    const gy = ye - 0.07;
    put(
      g,
      new THREE.CylinderGeometry(0.06, 0.06, xe - xs, 10, 1, true, 0, Math.PI),
      MAT.zinc,
      (xs + xe) / 2,
      gy,
      zt1 - 0.06,
      {
        rz: -Math.PI / 2,
        cast: false,
      }
    );
    cyl(xe - 0.08, gy, 0.98, zt1 - 0.06, 0.04, MAT.zinc, 10, undefined, { parent: g, col: false });
    beam([xe - 0.08, gy, 1.0], [xe + 0.18, gy + 0.18, 0.92], 0.07, 0.07, MAT.zinc, { parent: g });
  }
  // ---- outside: front terrace (north) with doormat, chair and bench; back step (south); window boxes with geraniums ----
  gB(g, hx + 0.05, hx + 1.6, -1.3, 1.3, 0, 0.08, MAT.conc, { cast: false });
  gB(g, hx + 0.1, hx + 0.55, -0.4, 0.4, 0.08, 0.1, MATS.felt, { cast: false });
  gB(g, hx + 0.85, hx + 1.35, 0.6, 1.1, 0.44, 0.48, MAT.sage, { cast: false });
  gB(g, hx + 0.85, hx + 1.35, 1.04, 1.1, 0.48, 0.92, MAT.sage, { cast: false });
  for (const [x, y] of [
    [hx + 0.88, 0.63],
    [hx + 1.32, 0.63],
    [hx + 0.88, 1.07],
    [hx + 1.32, 1.07],
  ])
    gB(g, x - 0.015, x + 0.015, y - 0.015, y + 0.015, 0.08, 0.44, MAT.sage, { grain: 'z', cast: false });
  gB(g, -hx - 0.6, -hx - 0.05, -0.5, 0.5, 0, 0.08, MAT.conc, { cast: false });
  // window boxes: planned – today there are none (photos 26.10.2026)
  planned(g, () => {
    for (const [a0, a1] of [
      [-1.95, -1.15],
      [1.15, 1.95],
    ]) {
      const zb = a0 < 0 ? 0.95 - 0.06 : 1.12 - 0.06;
      gB(g, hx + 0.02, hx + 0.2, a0 + 0.02, a1 - 0.02, zb - 0.16, zb, MAT.larch, { cast: false });
      for (let i = 0; i < 4; i++) plant(g, hx + 0.11, a0 + 0.13 + i * 0.18, zb - 0.02, 0.2, 'geranium', R);
    }
    for (const o of OPS.W) {
      const zb = o.s - 0.06;
      gB(g, o.a0 + 0.02, o.a1 - 0.02, hy + 0.02, hy + 0.2, zb - 0.16, zb, MAT.larch, { cast: false });
      for (let i = 0; i < 4; i++) plant(g, o.a0 + 0.13 + i * 0.18, hy + 0.11, zb - 0.02, 0.2, 'geranium', R);
    }
  });
  // ===================== inside =====================
  const xi0 = -hx + T,
    xi1 = hx - T,
    yi1 = hy - T;
  // curtains that can be drawn ('Vorhänge zuziehen'): a pair along a wall, A = a0..a1 and B = b0..b1 with the window between a1 and b0; both
  // panels slide to the middle of the window (registered as small jobs further down, once the rooms are known)
  const drapes = [];
  const drape = (key, run, A, B, meshes, at) => {
    for (const me of meshes) me.userData.noMerge = true;
    drapes.push({ key, run, A, B, m: (A[1] + B[0]) / 2, meshes, at });
  };
  // ---- kitchen in the north-west corner (right after the front door): L of base units, butcher-block top, sink under the window,
  // a small enamel cooker by the door, open shelves, tiles, café curtains ----
  const KX = 1.8, // front of the north run (it runs along the front wall, x KX..xi1)
    KY = 1.8, // front of the west run (along the west wall, y KY..yi1)
    kz = zf + 0.86,
    wt = 0.04;
  gB(g, KX + 0.05, xi1, 0.62, yi1, zf, zf + 0.1, MAT.black, { cast: false });
  gB(g, 0.57, xi1, KY + 0.05, yi1, zf, zf + 0.1, MAT.black, { cast: false });
  gB(g, KX + 0.02, xi1, 1.17, yi1, zf + 0.1, kz, KM.front);
  gB(g, 0.55, KX + 0.02, KY + 0.02, yi1, zf + 0.1, kz, KM.front);
  // doors and drawers: slightly proud panels with dark gaps, handles
  const panelX = (y0, y1, z1, z2, m = KM.front) => {
    gB(g, KX, KX + 0.02, y0 + 0.003, y1 - 0.003, z1 + 0.003, z2 - 0.003, m, { cast: false });
    gB(g, KX - 0.012, KX, (y0 + y1) / 2 - 0.06, (y0 + y1) / 2 + 0.06, z2 - 0.06, z2 - 0.045, MAT.steel, {
      cast: false,
    });
  };
  const panelY = (x0, x1, z1, z2, m = KM.front) => {
    gB(g, x0 + 0.003, x1 - 0.003, KY, KY + 0.02, z1 + 0.003, z2 - 0.003, m, { cast: false });
    gB(g, (x0 + x1) / 2 - 0.06, (x0 + x1) / 2 + 0.06, KY - 0.012, KY, z2 - 0.06, z2 - 0.045, MAT.steel, {
      cast: false,
    });
  };
  for (const [y0, y1] of [
    [1.17, 1.62],
    [1.62, 2.07],
  ]) {
    panelX(y0, y1, zf + 0.1, zf + 0.68);
    panelX(y0, y1, zf + 0.68, kz);
  }
  panelY(0.55, 1.12, zf + 0.1, kz, KM.enamel); // small fridge under the counter
  for (const [x0, x1] of [
    [1.12, 1.47],
    [1.47, KX + 0.02],
  ]) {
    panelY(x0, x1, zf + 0.1, zf + 0.68);
    panelY(x0, x1, zf + 0.68, kz);
  }
  // worktop (oak, butcher block) with the sink cut-out look
  gB(g, KX - 0.02, xi1, 1.15, yi1, kz, kz + wt, BW.wood, { grain: 'y', cast: false });
  gB(g, 0.53, KX - 0.02, KY - 0.02, yi1, kz, kz + wt, BW.wood, { grain: 'x', cast: false });
  gB(g, 1.9, 2.3, 1.32, 1.84, kz + wt, kz + wt + 0.006, SINK, { cast: false });
  gB(g, 1.95, 2.25, 1.37, 1.79, kz + wt + 0.006, kz + wt + 0.008, MAT.blacksteel, { cast: false });
  cyl(2.32, 1.58, kz + wt, kz + wt + 0.24, 0.012, SINK, 8, undefined, { parent: g, col: false });
  beam([2.32, 1.58, kz + wt + 0.24], [2.16, 1.58, kz + wt + 0.2], 0.022, 0.022, SINK, { parent: g });
  cyl(2.32, 1.5, kz + wt, kz + wt + 0.07, 0.018, SINK, 8, undefined, { parent: g, col: false });
  // enamel cooker (two hotplates, oven) between the door and the sink; whistling kettle on it
  gB(g, KX + 0.02, xi1 - 0.01, 0.64, 1.15, zf, kz + wt, KM.enamel);
  gB(g, KX, KX + 0.02, 0.68, 1.11, zf + 0.18, zf + 0.62, KM.enamel, { cast: false });
  gB(g, KX - 0.004, KX, 0.73, 1.06, zf + 0.26, zf + 0.52, MAT.black, { cast: false });
  gB(g, KX - 0.02, KX - 0.008, 0.72, 1.07, zf + 0.6, zf + 0.615, MAT.steel, { cast: false });
  for (const y of [0.74, 0.86, 0.98, 1.08])
    cyl(KX - 0.012, y, zf + 0.72, zf + 0.75, 0.016, MAT.black, 10, undefined, { parent: g, col: false });
  const plateM = new THREE.MeshStandardMaterial({
    color: 0x2b2826,
    emissive: 0xff3c12,
    emissiveIntensity: 0,
    roughness: 0.55,
  });
  cyl(2.08, 0.79, kz + wt, kz + wt + 0.015, 0.075, plateM, 18, undefined, { parent: g, col: false });
  cyl(2.22, 1.0, kz + wt, kz + wt + 0.015, 0.075, MAT.blacksteel, 18, undefined, { parent: g, col: false });
  const steamM = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
  {
    const kz2 = kz + wt + 0.015;
    // whistling kettle: turned enamel body, lid with knob, spout with whistle cap, black handle
    const prof = [
      [0, 0],
      [0.085, 0],
      [0.1, 0.03],
      [0.098, 0.07],
      [0.075, 0.13],
      [0.045, 0.155],
      [0.045, 0.165],
      [0, 0.165],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    put(g, new THREE.LatheGeometry(prof, 18), KM.enamelRed, 2.08, 0.79, kz2);
    put(g, new THREE.SphereGeometry(0.014, 8, 6), MAT.black, 2.08, 0.79, kz2 + 0.175, { cast: false });
    put(g, new THREE.CylinderGeometry(0.011, 0.02, 0.12, 8), KM.enamelRed, 1.99, 0.79, kz2 + 0.09, { rz: 0.95 });
    put(g, new THREE.CylinderGeometry(0.014, 0.014, 0.025, 8), MAT.black, 1.94, 0.79, kz2 + 0.125, {
      rz: 0.95,
      cast: false,
    });
    put(g, new THREE.TorusGeometry(0.065, 0.009, 6, 12, Math.PI), MAT.black, 2.09, 0.79, kz2 + 0.15, { cast: false });
    for (let i = 0; i < 4; i++) {
      const s = put(
        g,
        new THREE.SphereGeometry(0.02 + i * 0.012, 8, 6),
        steamM,
        1.92 - i * 0.035,
        0.79,
        kz2 + 0.16 + i * 0.065,
        {
          cast: false,
        }
      );
      s.renderOrder = 3;
      s.receiveShadow = false;
    }
  }
  // put the kettle on: the hotplate glows, after a while the kettle whistles and steams; take it off again
  GACTS.push({
    key: 'kessel',
    b,
    lx: KX - 0.25,
    ly: 0.85,
    z: kz,
    r: 1.0,
    room: (x, y, z) => inLoc(x, y, 0, 0, hx, hy) && z < 2.6,
    label: st => (st.k === 1 ? null : st.k === 2 ? 'Kessel vom Herd nehmen' : 'Wasser aufsetzen'),
    run: st => {
      if (st.k === 2) {
        st.k = 0;
        st.think('Tee ist fertig.');
      } else {
        st.k = 1;
        st.t = 0;
        st.think('Der Kessel steht auf dem Herd …');
      }
      st.dirty();
    },
    tick: (dt, st) => {
      if (!st.k && plateM.emissiveIntensity === 0 && steamM.opacity === 0) return false;
      st.t = (st.t || 0) + dt;
      const heat = st.k ? Math.min(1, st.t / 4) : Math.max(0, plateM.emissiveIntensity / 1.1 - dt / 3);
      plateM.emissiveIntensity = heat * 1.1;
      if (st.k === 1 && st.t > 9) {
        st.k = 2;
        st.sound('whistle');
        st.think(
          'Das Wasser kocht – der Dampf pfeift durch die Flöte. Schwarzer Tee mag es sprudelnd, grüner lieber etwas abgekühlt.'
        );
      }
      steamM.opacity = st.k === 2 ? 0.13 + 0.06 * Math.sin(st.t * 5.3) : Math.max(0, steamM.opacity - dt * 0.3);
      return true;
    },
  });
  // tea towel on the oven rail
  gB(g, KX - 0.03, KX - 0.02, 0.92, 1.04, zf + 0.42, zf + 0.615, KM.curtainRed, { cast: false });
  // tiles over the worktops (not where the windows are)
  const tz = kz + wt;
  gB(g, xi1 - 0.008, xi1, 0.62, 1.15, tz, zf + 1.5, KM.tiles, { cast: false });
  gB(g, xi1 - 0.008, xi1, 1.95, yi1, tz, zf + 1.5, KM.tiles, { cast: false });
  gB(g, xi1 - 0.008, xi1, 1.15, 1.95, tz, 1.1, KM.tiles, { cast: false });
  gB(g, 1.35, xi1, yi1 - 0.008, yi1, tz, zf + 1.5, KM.tiles, { cast: false });
  gB(g, 0.53, 1.35, yi1 - 0.008, yi1, tz, 1.1, KM.tiles, { cast: false });
  // open shelves on the west wall next to the window: plates, mugs, jars
  for (const zs of [zf + 1.34, zf + 1.66]) gB(g, 1.42, 2.34, yi1 - 0.24, yi1, zs, zs + 0.025, BW.wood, { cast: false });
  for (const xb of [1.45, 2.31])
    gB(g, xb - 0.012, xb + 0.012, yi1 - 0.22, yi1, zf + 1.24, zf + 1.36, BW.wood, { cast: false });
  for (let i = 0; i < 6; i++)
    put(
      g,
      new THREE.CylinderGeometry(0.095, 0.095, 0.01, 20),
      i % 3 ? KM.porcelain : KM.enamelGreen,
      1.52 + i * 0.03,
      yi1 - 0.13,
      zf + 1.462,
      {
        rz: Math.PI / 2 - 0.12,
        cast: false,
      }
    );
  for (const xx of [1.5, 1.7])
    gB(g, xx, xx + 0.01, yi1 - 0.2, yi1 - 0.06, zf + 1.365, zf + 1.43, BW.wood, { cast: false });
  for (let i = 0; i < 4; i++)
    mug(g, 1.82 + i * 0.12, yi1 - 0.12, zf + 1.365, i % 2 ? KM.porcelain : KM.enamelGreen, 90);
  const jarFill = [KM.cream, MAT.logEnd, KM.straw, MAT.rust];
  for (let i = 0; i < 4; i++) jar(g, 1.55 + i * 0.18, yi1 - 0.12, zf + 1.685, 0.05, 0.16, jarFill[i]);
  // on the counter: Klingenholz end-grain board, bread box, fruit bowl, a jar with wooden spoons; herbs on the window sill
  gB(g, 0.72, 1.12, 1.9, 2.2, tz, tz + 0.04, KM.endgrain, { cast: false, bevel: 0.004 });
  gB(g, 1.47, 1.77, 2.06, yi1 - 0.02, tz, tz + 0.16, BW.wood);
  put(g, new THREE.CylinderGeometry(0.1, 0.1, 0.3, 14, 1, false, 0, Math.PI), BW.wood, 1.62, 2.22, tz + 0.16, {
    rz: Math.PI / 2,
    s: [0.7, 1, 1.55],
  });
  {
    const w = W(2.1, 2.12);
    placeGLB('bowl', { x: w[0], y: w[1], z: tz, face: 0, w: 0.28, col: false });
  }
  for (let i = 0; i < 3; i++) {
    const zs = pot(g, xi1 - 0.09, 1.3 + i * 0.25, 1.12, 0.06, 0.1);
    plant(g, xi1 - 0.09, 1.3 + i * 0.25, zs, 0.14, i === 1 ? 'spiky' : 'herb', R);
  }
  cyl(1.32, 2.3, tz, tz + 0.14, 0.05, KM.terracottaDark, 12, undefined, { parent: g, col: false });
  for (let i = 0; i < 3; i++)
    beam([1.32, 2.3, tz + 0.1], [1.32 + (i - 1) * 0.03, 2.3 + (i - 1) * 0.02, tz + 0.33], 0.012, 0.02, BW.wood, {
      parent: g,
    });
  // café curtains (red gingham) on rods in both kitchen windows, close to the glass
  curtain(g, 'y', 1.12, 1.98, xi1 - 0.015, 1.13, 1.5, KM.curtainRed, '-x', 6, 0.012);
  curtain(g, 'x', 0.52, 1.38, yi1 - 0.015, 1.13, 1.5, KM.curtainRed, '-y', 6, 0.012);
  gB(g, xi1 - 0.022, xi1 - 0.01, 1.1, 2.0, 1.505, 1.515, MAT.brass, { cast: false });
  gB(g, 0.5, 1.4, yi1 - 0.022, yi1 - 0.01, 1.505, 1.515, MAT.brass, { cast: false });
  // ---- living side (west, further back): sofa with blanket and cushions, coffee table with tea, plant, a picture ----
  const sx0 = -2.38,
    sx1 = -0.32,
    sy0 = 1.5,
    sy1 = yi1,
    ss = zf + 0.43;
  // (feat/einrichtung: the sofa with its cushions and blanket and the coffee table with the tea are built per interior style –
  // garden/stil_bauten.js; „Wie heute“ is the furniture that stood here)
  Object.assign(BUNG, { sx0, sx1, sy0, sy1, ss, zf });
  // rugs: wool in front of the sofa, a rag runner from door to door, a small one by the bed
  gB(g, -2.05, -0.42, 0.55, 1.45, zf, zf + 0.01, BW.rug, { cast: false, grain: 'x' });
  gB(g, -2.2, 2.2, -0.36, 0.36, zf, zf + 0.008, KM.rag, { cast: false, grain: 'x' });
  gB(g, -1.9, -0.65, -2.24, -1.82, zf, zf + 0.008, KM.rag, { cast: false, grain: 'y' });
  {
    const w = W(2.02, -1.55);
    placeGLB('plant_a', { x: w[0], y: w[1], z: zf, face: 30, h: 0.9, col: false });
    lcol(r, 1.75, 2.35, -1.85, -1.25, zf, zf + 0.85, 'plant');
  }
  // a little cast-iron stove (Kanonenofen) between sofa and kitchen on a tile plate, the pipe up through the west roof;
  // light it: the fire glows behind the door and flickers on the walls (it shares the one lamp light)
  const fireM = new THREE.MeshBasicMaterial({ color: 0x1a0d06 });
  {
    const sx = 0.1,
      sy = 2.05,
      zr0 = zw + (hy - sy) * pitch; // roof surface above the stove
    gB(g, sx - 0.38, sx + 0.38, sy - 0.33, yi1, zf, zf + 0.02, MAT.slate, { cast: false });
    gB(g, sx - 0.36, sx + 0.36, yi1 - 0.012, yi1, zf + 0.02, zf + 1.3, KM.tiles, { cast: false });
    cyl(sx, sy, zf + 0.02, zf + 0.12, 0.2, MAT.blacksteel, 18, 0.22, { parent: g, col: false });
    cyl(sx, sy, zf + 0.12, zf + 0.72, 0.19, MAT.blacksteel, 20, undefined, { parent: g, col: false });
    cyl(sx, sy, zf + 0.72, zf + 0.8, 0.21, MAT.blacksteel, 20, 0.19, { parent: g, col: false });
    for (const z of [zf + 0.3, zf + 0.6])
      put(g, new THREE.TorusGeometry(0.195, 0.012, 6, 24), MAT.brass, sx, sy, z, { rx: Math.PI / 2, cast: false });
    // fire door towards the room (−y) with a mica window, handle
    gB(g, sx - 0.09, sx + 0.09, sy - 0.205, sy - 0.18, zf + 0.22, zf + 0.42, MAT.blacksteel, { cast: false });
    gB(g, sx - 0.065, sx + 0.065, sy - 0.209, sy - 0.2, zf + 0.25, zf + 0.39, fireM, { cast: false });
    gB(g, sx + 0.06, sx + 0.1, sy - 0.225, sy - 0.205, zf + 0.31, zf + 0.33, MAT.brass, { cast: false });
    cyl(sx, sy, zf + 0.8, zr0 + 0.62, 0.06, MAT.blacksteel, 14, undefined, { parent: g, col: false });
    put(g, new THREE.ConeGeometry(0.12, 0.08, 14), MAT.blacksteel, sx, sy, zr0 + 0.68);
    gB(g, sx - 0.1, sx + 0.1, sy - 0.1, sy + 0.1, zr0 + 0.04, zr0 + 0.1, MAT.zinc, { cast: false });
    // a basket of firewood beside it
    GL('basket', sx + 0.28, sy - 0.43, zf, 30, { h: 0.22, col: false });
    for (let i = 0; i < 4; i++)
      put(
        g,
        new THREE.CylinderGeometry(0.035, 0.035, 0.3, 8),
        [MAT.logs, MAT.logEnd, MAT.logEnd],
        sx + 0.28,
        sy - 0.43 + (i - 1.5) * 0.06,
        zf + 0.2 + (i % 2) * 0.05,
        {
          rz: Math.PI / 2,
          cast: false,
        }
      );
    lcol(r, sx - 0.25, sx + 0.25, sy - 0.25, sy + 0.25, zf, zf + 0.85, 'stove');
    GACTS.push({
      key: 'ofen',
      b,
      lx: sx,
      ly: sy - 0.5,
      z: zf + 0.5,
      r: 1.1,
      room: (x, y, z) => inLoc(x, y, 0, 0, hx, hy) && z < 2.6,
      label: st => (st.k ? 'Feuer ausgehen lassen' : 'Feuer im Ofen anzünden'),
      run: st => {
        st.k = st.k ? 0 : 1;
        st.t = 0;
        st.think(
          st.k
            ? 'Unten zwei Scheite, obendrauf Anzündholz und ein Anzünder, von oben anzünden, Luftklappe auf – so brennt es sauber und raucht kaum. Das Holz knistert.'
            : 'Kein Holz mehr nachlegen – die Glut hält den Ofen noch eine Weile warm.'
        );
        st.lamp('ofen', !!st.k);
        st.dirty();
      },
      tick: (dt, st) => {
        st.t = (st.t || 0) + dt;
        const want = st.k ? 1 : 0;
        st.f = (st.f || 0) + Math.sign(want - (st.f || 0)) * Math.min(Math.abs(want - (st.f || 0)), dt / 3);
        if (st.f < 0.002 && !st.k) return false;
        const fl = st.f * (0.8 + 0.2 * Math.sin(st.t * 13.1) * Math.sin(st.t * 7.3 + 1.2));
        if (st.k && st.f > 0.5 && (st.next = (st.next ?? 1) - dt) <= 0) {
          st.next = 0.4 + Math.random() * 1.6;
          st.sound('crackle');
        }
        fireM.color.setRGB(0.1 + 0.9 * fl, 0.05 + 0.4 * fl, 0.02 + 0.05 * fl);
        st.flicker('ofen', fl);
        return true;
      },
    });
  }
  picture(g, 'x', -1.85, yi1, 1.55, 0.46, 0.36, 0, '-y');
  picture(g, 'y', -2.0, xi0, 1.55, 0.3, 0.38, 1, '+x', MAT.black);
  drape(
    'sofa',
    'x',
    [-1.62, -1.3],
    [-0.6, -0.28],
    [
      curtain(g, 'x', -1.62, -1.3, yi1 - 0.06, 0.98, 1.95, KM.curtainSage, '-y', 3, 0.03),
      curtain(g, 'x', -0.6, -0.28, yi1 - 0.06, 0.98, 1.95, KM.curtainSage, '-y', 3, 0.03),
    ],
    [-0.95, yi1 - 0.1, 1.45, 1.75]
  );
  gB(g, -1.7, -0.2, yi1 - 0.07, yi1 - 0.05, 1.96, 1.98, BW.wood, { cast: false });
  // radio cabinet west of the back door: old valve radio, a succulent, a framed photo
  gB(g, xi0, xi0 + 0.38, 0.56, 1.3, zf, zf + 0.7, BW.wood);
  gB(g, xi0 + 0.38, xi0 + 0.39, 0.6, 0.92, zf + 0.06, zf + 0.64, BW.wood, { cast: false });
  gB(g, xi0 + 0.38, xi0 + 0.39, 0.94, 1.26, zf + 0.06, zf + 0.64, BW.wood, { cast: false });
  {
    const rz = zf + 0.7;
    gB(g, xi0 + 0.06, xi0 + 0.3, 0.62, 1.06, rz, rz + 0.25, BW.wood, { bevel: 0.012 });
    gB(g, xi0 + 0.3, xi0 + 0.305, 0.66, 0.92, rz + 0.08, rz + 0.22, KM.straw, { cast: false });
    gB(g, xi0 + 0.3, xi0 + 0.305, 0.66, 1.02, rz + 0.03, rz + 0.06, KM.porcelain, { cast: false });
    for (const y of [0.95, 1.0])
      cyl(xi0 + 0.31, y, rz + 0.12, rz + 0.14, 0.014, KM.bakelite, 10, undefined, { parent: g, col: false });
    const w = W(xi0 + 0.2, 1.18);
    placeGLB('succulent', { x: w[0], y: w[1], z: rz, face: 0, h: 0.22, col: false });
  }
  // ---- back wall: dove-blue wardrobe left of the back door (doors open: clothes inside), night table, the double bed in the annex ----
  const wx0 = xi0,
    wx1 = xi0 + 0.58,
    wy0 = -1.72,
    wy1 = -0.52,
    wz1 = zf + 1.96;
  gB(g, wx0, wx1 - 0.02, wy0, wy0 + 0.02, zf + 0.08, wz1 - 0.06, KM.wardrobe);
  gB(g, wx0, wx1 - 0.02, wy1 - 0.02, wy1, zf + 0.08, wz1 - 0.06, KM.wardrobe);
  gB(g, wx0, wx0 + 0.02, wy0, wy1, zf + 0.08, wz1 - 0.06, KM.wardrobe, { cast: false });
  gB(g, wx0, wx1 - 0.02, wy0, wy1, zf + 0.08, zf + 0.1, KM.wardrobe, { cast: false });
  gB(g, wx0, wx1 - 0.02, wy0, wy1, wz1 - 0.08, wz1 - 0.06, KM.wardrobe, { cast: false });
  gB(g, wx0, wx1 - 0.04, wy0 + 0.04, wy1 - 0.04, zf, zf + 0.08, KM.wardrobeTrim, { cast: false });
  gB(g, wx0, wx1 + 0.02, wy0 - 0.03, wy1 + 0.03, wz1 - 0.06, wz1, KM.wardrobeTrim);
  gB(g, wx0 + 0.02, wx1 - 0.03, wy0 + 0.02, wy1 - 0.02, zf + 1.66, zf + 1.68, KM.wardrobe, { cast: false });
  cyl(wx0 + 0.28, (wy0 + wy1) / 2, zf + 1.56, zf + 1.565, 0.012, MAT.steel, 6, undefined, { parent: g, col: false });
  gB(g, wx0 + 0.27, wx0 + 0.29, wy0 + 0.03, wy1 - 0.03, zf + 1.55, zf + 1.565, MAT.steel, { cast: false });
  for (let i = 0; i < 7; i++) {
    const y = wy0 + 0.13 + i * 0.155,
      h = 0.6 + R() * 0.35;
    garment(g, wx0 + 0.28, y, zf + 1.5, 0.4, h, 0.05, KM.cloth[i % KM.cloth.length]);
  }
  for (let i = 0; i < 3; i++)
    gB(
      g,
      wx0 + 0.06,
      wx0 + 0.46,
      wy0 + 0.1 + i * 0.35,
      wy0 + 0.4 + i * 0.35,
      zf + 1.68,
      zf + 1.68 + 0.08 + R() * 0.08,
      i === 1 ? MAT.woolLight : MAT.linen,
      {
        cast: false,
      }
    );
  {
    // two doors with a raised panel and a little knob, hinged at the outer edges, opening into the room
    const leaf = (w, h, knobX) => {
      const lg = new THREE.Group(),
        add = (bw, bh, bd, x, y, z, m) => {
          const me = new THREE.Mesh(new THREE.BoxGeometry(bw, bh, bd), m);
          me.position.set(x, y, z);
          me.castShadow = true;
          me.receiveShadow = true;
          lg.add(me);
        };
      add(w - 0.006, h, 0.022, w / 2, h / 2, 0, KM.wardrobe);
      for (const zz of [0.013, -0.013]) {
        add(w - 0.16, 0.025, 0.006, w / 2, 0.1, zz, KM.wardrobeTrim);
        add(w - 0.16, 0.025, 0.006, w / 2, h - 0.1, zz, KM.wardrobeTrim);
        add(0.025, h - 0.175, 0.006, 0.08, h / 2, zz, KM.wardrobeTrim);
        add(0.025, h - 0.175, 0.006, w - 0.08, h / 2, zz, KM.wardrobeTrim);
      }
      const kn = new THREE.Mesh(new THREE.SphereGeometry(0.016, 10, 8), MAT.brass);
      kn.position.set(knobX, h * 0.52, 0.025);
      lg.add(kn);
      const kn2 = kn.clone();
      kn2.position.z = -0.025;
      lg.add(kn2);
      return lg;
    };
    const dw = (wy1 - wy0) / 2,
      dh = wz1 - 0.06 - (zf + 0.1);
    const dE = ldoor('schrankO', b, leaf(dw, dh, dw - 0.05), {
      lx: wx1 - 0.01,
      ly: wy0 + 0.003,
      dir: [0, 1],
      w: dw - 0.003,
      sign: -1,
      z0: zf + 0.1,
      z1: wz1 - 0.06,
    });
    const dW = ldoor('schrankW', b, leaf(dw, dh, dw - 0.05), {
      lx: wx1 - 0.01,
      ly: wy1 - 0.003,
      dir: [0, -1],
      w: dw - 0.003,
      sign: 1,
      z0: zf + 0.1,
      z1: wz1 - 0.06,
    });
    for (const d of [dE, dW]) {
      d.label = 'Schranktür';
      d.r = 1.2;
    }
  }
  // night table with a reading lamp, a book and a glass of water
  gB(g, xi0, xi0 + 0.4, -2.24, -1.8, zf, zf + 0.52, BW.wood, { bevel: 0.006 });
  gB(g, xi0 + 0.4, xi0 + 0.405, -2.2, -1.84, zf + 0.36, zf + 0.48, BW.wood, { cast: false });
  cyl(xi0 + 0.41, -2.02, zf + 0.41, zf + 0.43, 0.012, MAT.brass, 8, undefined, { parent: g, col: false });
  const nightMat = bulbMat(0xf3ead6);
  cyl(xi0 + 0.15, -2.1, zf + 0.52, zf + 0.54, 0.06, MAT.brass, 12, undefined, { parent: g, col: false });
  cyl(xi0 + 0.15, -2.1, zf + 0.54, zf + 0.8, 0.008, MAT.brass, 6, undefined, { parent: g, col: false });
  put(g, new THREE.CylinderGeometry(0.075, 0.11, 0.16, 16, 1, true), nightMat, xi0 + 0.15, -2.1, zf + 0.82, {
    cast: false,
  });
  gB(g, xi0 + 0.2, xi0 + 0.36, -1.98, -1.84, zf + 0.52, zf + 0.555, MAT.rust, { cast: false });
  cyl(xi0 + 0.3, -2.17, zf + 0.52, zf + 0.62, 0.03, KM.glassJar, 10, undefined, { parent: g, col: false });
  // the bed for two (160 × 200), head at the back wall, in the annex
  const bx0 = xi0,
    bx1 = xi0 + 2.0,
    by0 = AY0 + T + 0.01,
    by1 = by0 + 1.6,
    bm = zf + 0.46;
  gB(g, bx0, bx0 + 0.06, by0, by1, zf, zf + 1.0, BW.wood, { bevel: 0.008 });
  gB(g, bx0, bx0 + 0.07, by0 - 0.005, by1 + 0.005, zf + 0.96, zf + 1.02, BW.wood, { bevel: 0.01 });
  gB(g, bx1 - 0.06, bx1, by0, by1, zf, zf + 0.55, BW.wood, { bevel: 0.008 });
  for (const [y0, y1] of [
    [by0, by0 + 0.04],
    [by1 - 0.04, by1],
  ])
    gB(g, bx0 + 0.06, bx1 - 0.06, y0, y1, zf + 0.14, zf + 0.36, BW.wood, { bevel: 0.006 });
  soft(g, bx0 + 0.07, bx1 - 0.07, by0 + 0.04, by1 - 0.04, zf + 0.26, bm, 0.05, MAT.linen);
  soft(g, bx0 + 0.42, bx1 - 0.05, by0 + 0.02, by1 - 0.02, bm - 0.02, bm + 0.11, 0.05, KM.duvet, { puff: 0.03 });
  soft(g, bx0 + 0.4, bx0 + 0.58, by0 + 0.03, by1 - 0.03, bm + 0.04, bm + 0.13, 0.04, MAT.linen);
  for (const [y0, y1] of [
    [by0 + 0.08, by0 + 0.76],
    [by0 + 0.84, by1 - 0.08],
  ])
    soft(g, bx0 + 0.08, bx0 + 0.45, y0, y1, bm - 0.01, bm + 0.15, 0.06, MAT.linen, { puff: 0.03 });
  soft(g, bx1 - 0.5, bx1 - 0.08, by0 + 0.05, by1 - 0.05, bm + 0.1, bm + 0.15, 0.02, MAT.wool);
  // ---- the annex's north end: reading chair by the window, floor lamp, low book shelf, side table with a mug, basket ----
  armchair(g, 0.24, 1.0, AY0 + 0.14, AY0 + 0.94, zf, KM.velvet, '-y');
  soft(g, 0.3, 0.62, AY0 + 0.32, AY0 + 0.5, zf + 0.42, zf + 0.72, 0.06, KM.cream, { ry: 0.3 });
  lcol(r, 0.24, 1.0, AY0 + 0.14, AY0 + 0.94, zf, zf + 0.95, 'chair');
  GL('side_table', -0.1, AY0 + 0.38, zf, 0, { h: 0.5 });
  mug(g, -0.1, AY0 + 0.38, zf + 0.5, KM.enamelGreen, 40);
  GL('basket', -0.1, -3.1, zf, 20, { h: 0.2, col: false });
  for (const [x, y, m] of [
    [-0.14, -3.13, MAT.rust],
    [-0.06, -3.06, MAT.sage],
    [-0.1, -3.16, KM.cream],
  ])
    put(g, new THREE.SphereGeometry(0.05, 10, 8), m, x, y, zf + 0.17, { cast: false });
  const lampMat = bulbMat(0xf3ead6);
  {
    const lx = AX1 - T - 0.2,
      ly = AY0 + T + 0.2;
    cyl(lx, ly, zf, zf + 0.025, 0.13, MAT.blacksteel, 16, undefined, { parent: g, col: false });
    cyl(lx, ly, zf + 0.025, zf + 1.42, 0.012, MAT.brass, 8, undefined, { parent: g, col: false });
    put(g, new THREE.CylinderGeometry(0.13, 0.18, 0.24, 18, 1, true), lampMat, lx, ly, zf + 1.48, { cast: false });
    lcol(r, lx - 0.15, lx + 0.15, ly - 0.15, ly + 0.15, zf, zf + 1.6, 'lamp');
  }
  const books = [];
  {
    const sx0b = AX1 - T - 0.26,
      sx1b = AX1 - T,
      y1 = -2.42;
    gB(g, sx0b, sx1b, -3.32, y1 - 0.04, zf, zf + 0.025, BW.wood, { cast: false });
    for (const zs of [zf + 0.33, zf + 0.66])
      gB(g, sx0b, sx1b, -3.32, y1 - 0.04, zs, zs + 0.025, BW.wood, { cast: false });
    for (const yy of [-3.32, y1 - 0.06]) gB(g, sx0b, sx1b, yy, yy + 0.02, zf, zf + 0.685, BW.wood, { cast: false });
    for (const zs of [zf + 0.025, zf + 0.355])
      bookRow(books, 'y', -3.29, y1 - 0.07, sx1b - 0.23, sx1b - 0.01, zs, 0.29, R);
    lcol(r, sx0b, sx1b, -3.32, y1 - 0.04, zf, zf + 0.69, 'shelf');
    const zs = pot(g, sx0b + 0.13, -2.75, zf + 0.685, 0.08, 0.13);
    plant(g, sx0b + 0.13, -2.75, zs, 0.2, 'herb', R);
  }
  picture(g, 'y', -3.1, xi0, 1.48, 0.4, 0.3, 2, '+x');
  drape(
    'anbau',
    'x',
    [-1.78, -1.5],
    [-1.0, -0.72],
    [
      curtain(g, 'x', -1.78, -1.5, AY0 + T + 0.06, 1.0, 1.85, KM.curtainLinen, '+y', 3, 0.025),
      curtain(g, 'x', -1.0, -0.72, AY0 + T + 0.06, 1.0, 1.85, KM.curtainLinen, '+y', 3, 0.025),
    ],
    [-1.25, AY0 + T + 0.1, 1.4, 2.0]
  );
  // ---- table for two in the room (east of the walk from door to door) ----
  gB(g, 0.38, 1.12, -1.78, -1.14, zf + 0.72, zf + 0.75, BW.wood, { bevel: 0.006 });
  for (const [x, y] of [
    [0.43, -1.73],
    [1.07, -1.73],
    [0.43, -1.19],
    [1.07, -1.19],
  ])
    gB(g, x - 0.022, x + 0.022, y - 0.022, y + 0.022, zf, zf + 0.72, BW.wood, { grain: 'z', cast: false });
  gB(g, 0.5, 1.0, -1.62, -1.3, zf + 0.75, zf + 0.752, KM.curtainRed, { cast: false });
  {
    const zs = pot(g, 0.75, -1.46, zf + 0.752, 0.055, 0.09, KM.porcelain);
    plant(g, 0.75, -1.46, zs, 0.13, 'geranium', R);
  }
  for (const [lx, f] of [
    [1.42, 180],
    [0.08, 0],
  ]) {
    GL('desk_chair', lx, -1.46, zf, f, { h: 0.9, col: false });
    lcol(r, lx - 0.21, lx + 0.21, -1.67, -1.25, zf, zf + 0.9, 'chair');
  }
  // ---- by the front door: shoe bench, coat rail with jackets and a straw hat, the light switch, a picture ----
  const ey = -hy + T;
  gB(g, 1.55, 2.32, ey, ey + 0.34, zf + 0.38, zf + 0.42, BW.wood, { bevel: 0.005 });
  for (const x of [1.58, 2.29]) gB(g, x - 0.02, x + 0.02, ey, ey + 0.34, zf, zf + 0.38, BW.wood, { cast: false });
  gB(g, 1.6, 2.28, ey, ey + 0.32, zf + 0.12, zf + 0.14, BW.wood, { cast: false });
  for (const [x, m] of [
    [1.72, MAT.black],
    [1.86, MAT.black],
    [2.08, MAT.rust],
    [2.2, MAT.rust],
  ])
    soft(g, x - 0.05, x + 0.05, ey + 0.04, ey + 0.3, zf + 0.14, zf + 0.24, 0.03, m);
  gB(g, 1.52, 2.34, ey, ey + 0.025, zf + 1.56, zf + 1.66, BW.wood, { cast: false });
  for (const x of [1.66, 1.88, 2.1, 2.28])
    cyl(x, ey + 0.05, zf + 1.6, zf + 1.62, 0.012, MAT.brass, 6, undefined, { parent: g, col: false });
  garment(g, 1.68, ey + 0.08, zf + 1.6, 0.42, 0.8, 0.09, KM.cloth[1]);
  garment(g, 1.98, ey + 0.08, zf + 1.6, 0.38, 0.62, 0.07, KM.cloth[3]);
  cyl(2.18, ey + 0.2, zf + 1.48, zf + 1.495, 0.17, KM.straw, 20, undefined, { parent: g, col: false });
  cyl(2.18, ey + 0.2, zf + 1.495, zf + 1.6, 0.09, KM.straw, 16, 0.08, { parent: g, col: false });
  lcol(r, 1.52, 2.34, ey, ey + 0.36, zf, zf + 0.45, 'bench');
  // light switch (porcelain rotary switch) on the front wall, east of the door
  const SW = [xi1 - 0.02, -0.66, 1.12];
  put(g, new THREE.CylinderGeometry(0.035, 0.038, 0.03, 16), KM.porcelain, xi1 - 0.015, SW[1], SW[2], {
    rz: Math.PI / 2,
    cast: false,
  });
  gB(g, xi1 - 0.05, xi1 - 0.028, SW[1] - 0.007, SW[1] + 0.007, SW[2] - 0.026, SW[2] + 0.026, KM.bakelite, {
    cast: false,
  });
  picture(g, 'x', -0.3, AY0 + T, 1.5, 0.34, 0.27, 3, '+y', MAT.black);
  drape(
    'nordost',
    'y',
    [-2.2, -1.9],
    [-1.2, -0.9],
    [
      curtain(g, 'y', -2.2, -1.9, xi1 - 0.06, 0.93, 1.95, KM.curtainLinen, '-x', 3, 0.025),
      curtain(g, 'y', -1.2, -0.9, xi1 - 0.06, 0.93, 1.95, KM.curtainLinen, '-x', 3, 0.025),
    ],
    [xi1 - 0.1, -1.55, 1.45, 1.5]
  );
  gB(g, xi1 - 0.07, xi1 - 0.05, -2.25, -0.85, 1.96, 1.98, BW.wood, { cast: false });
  drape(
    'hinten',
    'y',
    [0.4, 0.66],
    [1.28, 1.54],
    [
      curtain(g, 'y', 0.4, 0.66, xi0 + 0.06, 0.98, 1.95, KM.curtainSage, '+x', 3, 0.025),
      curtain(g, 'y', 1.28, 1.54, xi0 + 0.06, 0.98, 1.95, KM.curtainSage, '+x', 3, 0.025),
    ],
    [xi0 + 0.1, 0.97, 1.45, 1.6]
  );
  gB(g, xi0 + 0.05, xi0 + 0.07, 0.35, 1.6, 1.96, 1.98, BW.wood, { cast: false });
  // ---- the bare bulb in the middle of the room ----
  const bulb = bareBulb(g, 0.1, -0.15, zw - 0.02, 1.9);
  bookMesh(g, books, R);
  // ---- lamps and places for the interactive part (garden/garten_in.js) ----
  const porchMat = bulbMat(0xfff2d6); // the porch lantern (built further down)
  const inLoc = (x, y, ox, oy, ex, ey2) => {
    const a = (b.az * Math.PI) / 180,
      c = worldOf(b, ox, oy),
      dx = x - c[0],
      dy = y - c[1];
    return Math.abs(dx * Math.sin(a) + dy * Math.cos(a)) < ex && Math.abs(-dx * Math.cos(a) + dy * Math.sin(a)) < ey2;
  };
  const inside = (x, y, z) =>
    z > -0.5 && z < 2.6 && (inLoc(x, y, 0, 0, hx, hy) || inLoc(x, y, ANX.ox, ANX.oy, ANX.hx, ANX.hy));
  // draw the curtains: k = 0 open … 1 closed; the inner edges meet in the middle of the window, the folds flatten as the cloth spreads
  for (const d of drapes) {
    const pose = k => {
      d.meshes.forEach((me, i) => {
        const [o, n] = i ? [d.B[1], d.B[0]] : [d.A[0], d.A[1]],
          inner = n + (d.m - n) * k,
          s = Math.abs(inner - o) / Math.abs(n - o),
          c = (o + inner) / 2;
        me.scale.x = s;
        me.scale.z = 1 / Math.sqrt(s);
        if (d.run === 'x') me.position.x = c;
        else me.position.z = -c;
      });
    };
    GACTS.push({
      key: 'vorhang:' + d.key,
      b,
      lx: d.at[0],
      ly: d.at[1],
      z: d.at[2],
      r: d.at[3],
      room: inside,
      label: st => (st.k ? 'Vorhänge aufziehen' : 'Vorhänge zuziehen'),
      run: st => {
        st.k = st.k ? 0 : 1;
        st.dirty();
      },
      tick: (dt, st) => {
        const want = st.k ? 1 : 0,
          f = st.f || 0;
        if (f === want) return false;
        st.f = f + Math.sign(want - f) * Math.min(Math.abs(want - f), dt / 0.8);
        pose(st.f);
        return true;
      },
    });
  }
  GLAMPS.push(
    {
      key: 'ofen',
      b,
      lx: 0.1,
      ly: 1.75,
      z: zf + 0.4,
      mat: null,
      glow: 0,
      dist: 3.2,
      inten: 2.2,
      color: 0xff8a3a,
      sw: null,
      label: 'Ofen',
      room: inside,
      r: 1.0,
    },
    {
      key: 'aussen',
      b,
      lx: hx + 0.18,
      ly: 0.78,
      z: 1.92,
      mat: porchMat,
      glow: 2.2,
      dist: 6,
      inten: 5,
      color: 0xffd9a8,
      sw: [xi1 - 0.02, -0.8, 1.12],
      swRoom: inside,
      prio: -0.3,
      label: 'Außenlicht',
      room: () => false,
      r: 1.3,
    },
    {
      key: 'bungalow',
      b,
      lx: 0.1,
      ly: -0.15,
      z: 1.86,
      mat: bulb,
      glow: 2.6,
      dist: 4.3,
      inten: 8.5,
      color: 0xffd6a0,
      sw: SW,
      label: 'Licht',
      room: inside,
      r: 1.3,
    },
    {
      key: 'leselampe',
      b,
      lx: AX1 - T - 0.2,
      ly: AY0 + T + 0.2,
      z: zf + 1.44,
      mat: lampMat,
      glow: 1.2,
      dist: 2.5,
      inten: 1.8,
      color: 0xffcf8f,
      sw: [AX1 - T - 0.2, AY0 + T + 0.2, zf + 1.1],
      label: 'Leselampe',
      room: inside,
      r: 1.1,
    },
    {
      key: 'nachttisch',
      b,
      lx: xi0 + 0.15,
      ly: -2.1,
      z: zf + 0.82,
      mat: nightMat,
      glow: 1.0,
      dist: 2.2,
      inten: 1.4,
      color: 0xffcf8f,
      sw: [xi0 + 0.15, -2.1, zf + 0.6],
      label: 'Nachttischlampe',
      room: inside,
      r: 1.6,
    }
  );
  GSEATS.push(
    {
      key: 'sofa',
      b,
      lx: -1.35,
      ly: 1.98,
      eye: ss + 0.78,
      yaw: 90,
      pitch: -4,
      kind: 'sit',
      label: 'Aufs Sofa setzen',
      at: [-1.35, 1.55],
      r: 1.3,
    },
    {
      key: 'sofa2',
      b,
      lx: -0.62,
      ly: 1.85,
      eye: ss + 0.25,
      yaw: 180,
      pitch: 4,
      kind: 'lie',
      label: 'Aufs Sofa legen',
      at: [-0.7, 1.55],
      r: 1.0,
    },
    {
      key: 'bett',
      b,
      lx: bx0 + 0.3,
      ly: by1 - 0.42,
      eye: bm + 0.32,
      yaw: 0,
      pitch: 2,
      kind: 'lie',
      label: 'Ins Bett legen',
      at: [-1.2, by1 - 0.1],
      r: 1.5,
    },
    {
      key: 'sessel',
      b,
      lx: 0.62,
      ly: AY0 + 0.5,
      eye: zf + 0.42 + 0.78,
      yaw: -90,
      pitch: -4,
      kind: 'sit',
      label: 'In den Sessel setzen',
      at: [0.62, AY0 + 1.0],
      r: 1.2,
    }
  );
  // ---- walking, colliders, doors ----
  lwalk(r, -hx, hx, -hy, hy, zf);
  lwalk(r, -hx, AX1, AY0, -hy, zf);
  lwalk(r, hx, hx + 1.6, -1.3, 1.3, 0.08, 'stone');
  lwalk(r, -hx - 0.6, -hx, -0.5, 0.5, 0.08, 'stone');
  lwc(r, 'y', -hy, hy, hx - T, hx + 0.02, 0, zw + 0.3, [DF]);
  lwc(r, 'y', AY0, hy, -hx - 0.02, -hx + T, 0, zw + 0.3, [DB]);
  lcol(r, -hx, hx, hy - T, hy + 0.02, 0, zw + 0.3);
  lcol(r, AX1 - T, hx, -hy - 0.02, -hy + T, 0, zw + 0.3);
  lcol(r, -hx, AX1, AY0 - 0.02, AY0 + T, 0, zaw + 0.3);
  lcol(r, AX1 - T, AX1 + 0.02, AY0, -hy + T, 0, zaw + 0.3);
  // ceilings as surfaces (like an upper floor): the shoulder camera stays below them, the walker never reaches them
  lwalk(r, -hx + T, hx - T, -hy, hy - T, zw);
  lwalk(r, -hx + T, AX1 - T, AY0 + T, -hy, za);
  lcol(r, KX - 0.02, xi1, 0.62, yi1, zf, kz + wt, 'kitchen');
  lcol(r, 0.53, KX, KY - 0.02, yi1, zf, kz + wt, 'kitchen');
  lcol(r, sx0, sx1, sy0, sy1, zf, zf + 0.8, 'sofa');
  lcol(r, -1.62, -0.92, 0.86, 1.34, zf, zf + 0.45, 'table');
  lcol(r, xi0, xi0 + 0.4, 0.56, 1.3, zf, zf + 0.95, 'cabinet');
  lcol(r, wx0, wx1 - 0.02, wy0 - 0.03, wy1 + 0.03, zf, wz1, 'wardrobe');
  lcol(r, xi0, xi0 + 0.42, -2.24, -1.8, zf, zf + 0.6, 'nightstand');
  lcol(r, bx0, bx1, by0, by1, zf, bm + 0.1, 'bed');
  lcol(r, 0.38, 1.12, -1.78, -1.14, zf + 0.3, zf + 0.76, 'table');
  lcol(r, hx + 0.8, hx + 1.4, 0.55, 1.15, 0.08, 0.92, 'chair');
  // both house doors open outwards: front door hinged at its east jamb, back door at its west jamb
  ldoor('bungalowN', b, boardLeaf(0.9, 1.88, { boards: false, mat: MATS.white, glass: [0.45, 0.4, 1.25, 1.7] }), {
    lx: hx - 0.03,
    ly: -0.45,
    dir: [0, 1],
    w: 0.9,
    sign: -1,
    z0: zf,
    z1: zf + 1.88,
  });
  ldoor('bungalowS', b, boardLeaf(0.8, 1.88, { boards: true, mat: MATS.white }), {
    lx: -hx + 0.03,
    ly: 0.4,
    dir: [0, -1],
    w: 0.8,
    sign: -1,
    z0: zf,
    z1: zf + 1.88,
  });
  // lived-in details outside (photo-scanned, real size): rubber boots by the front door, a painted bench on the north side, the rain barrel under
  // the annex's downpipe
  // porch lamp: an old wall lantern west of the front door, switched inside by the door ('Außenlicht')
  {
    const px = hx + 0.02,
      py = 0.78,
      pz = 2.0;
    gB(g, px, px + 0.04, py - 0.06, py + 0.06, pz - 0.12, pz + 0.06, MAT.blacksteel, { cast: false });
    gB(g, px + 0.04, px + 0.16, py - 0.015, py + 0.015, pz + 0.02, pz + 0.05, MAT.blacksteel, { cast: false });
    put(g, new THREE.CylinderGeometry(0.075, 0.055, 0.14, 8, 1, true), MAT.glass, px + 0.16, py, pz - 0.07, {
      cast: false,
    }).renderOrder = 2;
    put(g, new THREE.ConeGeometry(0.1, 0.08, 8), MAT.blacksteel, px + 0.16, py, pz + 0.04, { cast: false });
    put(g, new THREE.SphereGeometry(0.03, 10, 8), porchMat, px + 0.16, py, pz - 0.08, { cast: false });
    gB(g, px + 0.11, px + 0.21, py - 0.05, py + 0.05, pz - 0.15, pz - 0.14, MAT.blacksteel, { cast: false });
  }
  put(g, new THREE.CylinderGeometry(0.03, 0.032, 0.03, 14), KM.porcelain, xi1 - 0.015, -0.8, 1.12, {
    rz: Math.PI / 2,
    cast: false,
  });
  gB(g, xi1 - 0.045, xi1 - 0.028, -0.806, -0.794, 1.098, 1.142, KM.bakelite, { cast: false });
  GL('boots', hx + 0.32, 0.45, 0.08, 180, { col: false });
  GL('bench_out', hx + 0.42, 1.55, 0.08, 180);
  GL('rain_barrel', AX1 + 0.32, AY0 + 0.05, 0, 0);
  // firewood stacked against the annex's back wall, a board on top; a doormat at the back door
  {
    const x0 = -hx - 0.4,
      x1 = -hx - 0.04,
      y0 = AY0 + 0.12,
      y1 = -hy - 0.15,
      logGeo = (rr, len) => new THREE.CylinderGeometry(rr, rr * 1.03, len, 9);
    gB(g, x0, x1, y0 - 0.04, y1 + 0.04, 0, 0.06, MAT.weather, { cast: false });
    for (let row = 0, z = 0.06; row < 9; row++) {
      let y = y0 + (row % 2) * 0.04;
      let top = 0;
      while (y < y1 - 0.06) {
        const rr = 0.045 + R() * 0.025;
        put(
          g,
          logGeo(rr, x1 - x0 - R() * 0.05),
          [MAT.logs, MAT.logEnd, MAT.logEnd],
          (x0 + x1) / 2 + (R() - 0.5) * 0.04,
          y + rr,
          z + rr,
          {
            rz: Math.PI / 2,
            ry: (R() - 0.5) * 0.06,
          }
        );
        y += 2 * rr + 0.004;
        top = Math.max(top, 2 * rr);
      }
      z += top * 0.88;
    }
    gB(g, x0 - 0.05, x1 + 0.02, y0 - 0.08, y1 + 0.08, 1.02, 1.045, MAT.weather);
    lcol(r, x0, x1, y0 - 0.04, y1 + 0.04, 0, 1.05, 'wood');
    gB(g, -hx - 0.5, -hx - 0.1, -0.35, 0.35, 0.08, 0.095, MATS.felt, { cast: false });
  }
  // feat/einrichtung: the style layer hangs here (it moves with the building in the plan view)
  BUNG.anchor = siteGroup(b);
  Object.assign(BUNG, { inside, xi0, xi1, yi0: -hy + T, yi1, zw, AX1, AY0, T, bulb: [0.1, -0.15, 1.9], R });
  INSIDE.push({ b, hx, hy, ox: 0, oy: 0, z0: 0, z1: zw + 0.8, name: 'Bungalow' });
  INSIDE.push({ b, hx: ANX.hx, hy: ANX.hy, ox: ANX.ox, oy: ANX.oy, z0: 0, z1: zaw + 0.6, name: 'Bungalow – Anbau' });
  FOOT.push({ b, hx: hx + 0.1, hy: hy + 0.1, ox: 0, oy: 0 });
  FOOT.push({ b, hx: ANX.hx + 0.1, hy: ANX.hy + 0.1, ox: ANX.ox, oy: ANX.oy });
  keysEnd();
  interiorNoShadow(
    g,
    (x, y, z) =>
      z > 0.16 &&
      z < 2.08 &&
      ((Math.abs(x) < hx - T - 0.02 && Math.abs(y) < hy - T - 0.02) ||
        (x > -hx + T && x < AX1 - T && y > AY0 + T && y < -hy))
  );
  paletteize(g, [plateM]);
}

bldEnd(BLD.bungalow);
