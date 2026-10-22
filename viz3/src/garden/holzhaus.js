import { beam, bldBegin, bldEnd, boardLeaf, RB } from '../core/geo.js';
import { MAT } from '../core/mats.js';
import { placeGLB } from '../pavilion/interior.js';
import {
  BLD,
  faceOf,
  FOOT,
  gB,
  INSIDE,
  lcol,
  ldoor,
  ljamb,
  ltrap,
  lw,
  lwalk,
  lwc,
  lwin,
  MATS,
  rotDesc,
  siteGroup,
  slopeSlabX,
  worldOf,
} from './site_base.js';
bldBegin('holzhaus', 'Holzhaus', BLD.holzhaus.c, { short: 'Holzhaus', pad: 0.25 });
// ===== C: Holzhaus (3,0 × 3,6 m, an der Ostgrenze ausgerichtet; Pfosten auf Betonsteinen, Fensterband West, Pultdach mit grünen Biberschwanz-Schindeln, alte Busluke, Fassade ocker) =====
{
  const b = BLD.holzhaus,
    g = siteGroup(b);
  const hx = b.L / 2,
    hy = b.W / 2,
    zf = 0.35,
    zL = zf + 2.2,
    zH = zL + 0.32,
    T = 0.08,
    L = 0.014;
  const r = rotDesc(b);
  const zTop = x => zH + ((zL - zH) * (x + hx)) / (2 * hx);
  for (const [x, y] of [
    [-hx + 0.15, -hy + 0.15],
    [hx - 0.15, -hy + 0.15],
    [-hx + 0.15, hy - 0.15],
    [hx - 0.15, hy - 0.15],
    [-hx + 0.15, 0],
    [hx - 0.15, 0],
  ]) {
    gB(g, x - 0.12, x + 0.12, y - 0.12, y + 0.12, 0, 0.2, MAT.conc);
    gB(g, x - 0.05, x + 0.05, y - 0.05, y + 0.05, 0.2, zf - 0.05, MAT.kvh, { grain: 'z' });
  }
  gB(g, -hx, hx, -hy, hy, zf - 0.05, zf, MAT.plank, { grain: 'x', cast: false });
  const OPS = {
    W: [{ a0: -1.5, a1: 1.5, s: zf + 0.95, h: zf + 2.05 }],
    S: [
      { a0: -0.2, a1: 0.7, s: zf, h: zf + 2.0 },
      { a0: -1.2, a1: -0.6, s: zf + 1.05, h: zf + 1.65 },
    ],
  };
  // outer walls (ochre boards) and inner pale lining, all with the same openings
  lw(g, 'y', -hy, hy, -hx, -hx + T - L, zf, zH, OPS.W, MATS.ochre, { grain: 'z' });
  lw(g, 'y', -hy + T, hy - T, -hx + T - L, -hx + T, zf, zH, OPS.W, MATS.pale, { grain: 'z', cast: false });
  lw(g, 'y', -hy, hy, hx - T + L, hx, zf, zL, [], MATS.ochre, { grain: 'z' });
  lw(g, 'y', -hy + T, hy - T, hx - T, hx - T + L, zf, zL, [], MATS.pale, { grain: 'z', cast: false });
  for (const sy of [-1, 1]) {
    const t0 = sy > 0 ? hy - T + L : -hy,
      t1 = sy > 0 ? hy : -hy + T - L,
      i0 = sy > 0 ? hy - T : -hy + T - L,
      i1 = sy > 0 ? hy - T + L : -hy + T;
    const ops = sy < 0 ? OPS.S : [];
    lw(g, 'x', -hx + T - L, hx - T + L, t0, t1, zf, zL, ops, MATS.ochre, { grain: 'z' });
    ltrap(g, 'x', -hx + T - L, hx - T + L, t0, t1, zL, zTop(-hx + T), zL, MATS.ochre);
    lw(g, 'x', -hx + T, hx - T, i0, i1, zf, zL, ops, MATS.pale, { grain: 'z', cast: false });
    ltrap(g, 'x', -hx + T, hx - T, i0, i1, zL, zTop(-hx + T), zL, MATS.pale);
  }
  gB(g, -hx + T, hx - T, -hy + T, hy - T, zf, zf + 0.02, MAT.oakF, { grain: 'x', cast: false });
  // Fensterband West: alter Holzrahmen dunkelbraun, 3 Felder; kleines Fenster Süd; Türzarge
  lwin(g, 'y', -1.5, 1.5, -hx + T / 2, zf + 0.95, zf + 2.05, {
    frame: MATS.oldFrame,
    fw: 0.06,
    depth: T + 0.02,
    mull: [-0.5, 0.5],
  });
  lwin(g, 'x', -1.2, -0.6, -hy + T / 2, zf + 1.05, zf + 1.65, { frame: MATS.oldFrame, fw: 0.05, depth: T + 0.02 });
  ljamb(g, 'x', -0.2, 0.7, -hy - 0.005, -hy + T, zf, zf + 2.0, MATS.oldFrame);
  gB(g, -0.3, 0.8, -hy - 0.5, -hy, 0.17, zf - 0.03, MAT.plank, { grain: 'x' });
  gB(g, -0.3, 0.8, -hy - 0.5, -hy, 0, 0.17, MAT.conc); // Tritt
  // roof: rafters along x (high at -x / garden side, low at +x / boundary), OSB, shingles, old bus roof hatch
  const ov = 0.42,
    nR = 8;
  for (let i = 0; i < nR; i++) {
    const y = -hy - 0.1 + (i * (b.W + 0.2)) / (nR - 1);
    beam([-hx - ov, y, zTop(-hx - ov) + 0.06], [hx + ov, y, zTop(hx + ov) + 0.06], 0.05, 0.12, MAT.kvh, { parent: g });
  }
  const rw = b.L + 2 * ov,
    dz = zTop(hx + ov) - zTop(-hx - ov);
  slopeSlabX(g, 0, 0, (zH + zL) / 2 + 0.13, rw, b.W + 0.3, 0.022, dz, MAT.osb);
  slopeSlabX(g, 0, 0, (zH + zL) / 2 + 0.155, rw + 0.04, b.W + 0.34, 0.02, dz, MATS.shingle);
  {
    const hx0 = -0.3,
      hy0 = 0.35,
      zt = zTop(hx0) + 0.33;
    gB(g, hx0 - 0.33, hx0 + 0.33, hy0 - 0.28, hy0 + 0.28, zt - 0.12, zt, MATS.gold);
    gB(g, hx0 - 0.3, hx0 + 0.3, hy0 - 0.25, hy0 + 0.25, zt - 0.11, zt + 0.01, MAT.glass, { cast: false });
    gB(g, hx0 - 0.31, hx0 + 0.31, hy0 - 0.02, hy0 + 0.02, zt - 0.005, zt + 0.015, MAT.steel, { cast: false });
    gB(g, hx0 - 0.02, hx0 + 0.02, hy0 - 0.26, hy0 + 0.26, zt - 0.005, zt + 0.015, MAT.steel, { cast: false });
  }
  gB(g, -hx - 1.9, -hx - 0.9, -0.6, 1.1, 0.25, 0.28, MAT.pv);
  gB(g, -hx - 1.9, -hx - 0.9, -0.6, 1.1, 0.22, 0.25, MAT.pvframe, { cast: false }); // PV-Modul am Boden
  // interior: desk at the window band, two stools, bed along the north wall, shelf, battery/charge controller corner, lantern, books
  gB(g, -hx + T + 0.02, -hx + T + 0.57, -0.55, 0.55, zf + 0.72, zf + 0.76, MAT.oak);
  for (const [x, y] of [
    [-hx + T + 0.06, -0.5],
    [-hx + T + 0.53, -0.5],
    [-hx + T + 0.06, 0.5],
    [-hx + T + 0.53, 0.5],
  ])
    gB(g, x - 0.02, x + 0.02, y - 0.02, y + 0.02, zf, zf + 0.72, MAT.oak, { grain: 'z', cast: false });
  gB(g, -0.58, hx - T, hy - T - 0.92, hy - T, zf, zf + 0.42, MAT.larchIn);
  gB(g, -0.56, hx - T - 0.02, hy - T - 0.9, hy - T - 0.02, zf + 0.42, zf + 0.58, MAT.linen, { cast: false });
  RB(-0.53, hx - T - 0.05, hy - T - 0.88, hy - T - 0.05, zf + 0.58, zf + 0.66, 0.03, MAT.wool, { parent: g });
  RB(hx - T - 0.6, hx - T - 0.1, hy - T - 0.8, hy - T - 0.15, zf + 0.62, zf + 0.76, 0.05, MAT.woolLight, { parent: g });
  for (const z of [1.45, 1.85])
    gB(g, hx - T - 0.26, hx - T, -0.9, 0.5, zf + z, zf + z + 0.03, MAT.oak, { cast: false });
  gB(g, 1.0, hx - T, -hy + T, -hy + T + 0.45, zf, zf + 0.4, MAT.black, { cast: false });
  gB(g, 1.02, hx - T - 0.02, -hy + T + 0.02, -hy + T + 0.43, zf + 0.4, zf + 0.42, MAT.alu, { cast: false });
  {
    const w = worldOf(b, -hx + T + 0.3, 0.25);
    placeGLB('lantern_t', { x: w[0], y: w[1], z: zf + 0.76, face: faceOf(b, 90), h: 0.36, col: false });
  }
  {
    const w = worldOf(b, -hx + T + 0.3, -0.25);
    placeGLB('books', { x: w[0], y: w[1], z: zf + 0.76, face: faceOf(b, 0), w: 0.3, col: false });
  }
  for (const ly of [-0.3, 0.35]) {
    const w = worldOf(b, -hx + T + 0.85, ly);
    placeGLB('footstool', { x: w[0], y: w[1], z: zf, face: faceOf(b, 90), h: 0.45, col: false });
    lcol(r, -hx + T + 0.7, -hx + T + 1.0, ly - 0.15, ly + 0.15, zf, zf + 0.45, 'stool');
  }
  // collision, floors
  lwalk(r, -hx + T, hx - T, -hy + T, hy - T, zf + 0.02);
  lwalk(r, -0.2, 0.7, -hy - 0.01, -hy + T + 0.01, zf + 0.02);
  lwalk(r, -0.3, 0.8, -hy - 0.5, -hy - 0.01, zf - 0.03, 'wood');
  lwc(r, 'y', -hy, hy, -hx - 0.01, -hx + T, 0, zH);
  lwc(r, 'y', -hy, hy, hx - T, hx + 0.01, 0, zL);
  lwc(r, 'x', -hx, hx, hy - T, hy + 0.01, 0, zL);
  lwc(r, 'x', -hx, hx, -hy - 0.01, -hy + T, zf, zL, [{ a0: -0.2, a1: 0.7, s: zf - 0.1, h: zf + 2.0 }]);
  lcol(r, -hx, hx, -hy, hy, 0, 0.24, 'base');
  lcol(r, -0.58, hx - T, hy - T - 0.92, hy - T, zf, zf + 0.66, 'bed');
  lcol(r, -hx + T, -hx + T + 0.57, -0.55, 0.55, zf + 0.3, zf + 0.76, 'table');
  lcol(r, 1.0, hx - T, -hy + T, -hy + T + 0.45, zf, zf + 0.42, 'battery');
  // door: hinged at the east jamb, opens outwards (south)
  ldoor('holzhaus', b, boardLeaf(0.9, 1.98, { mat: MATS.ochre }), {
    lx: 0.7,
    ly: -hy + 0.03,
    dir: [-1, 0],
    w: 0.9,
    sign: 1,
    z0: zf + 0.01,
    z1: zf + 1.99,
  });
  INSIDE.push({ b, hx, hy, ox: 0, oy: 0, z0: zf - 0.1, z1: zH + 0.4, name: 'Holzhaus' });
  FOOT.push({ b, hx: hx + 0.1, hy: hy + 0.1, ox: 0, oy: 0 });
}

bldEnd(BLD.holzhaus);
