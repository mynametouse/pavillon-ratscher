import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { V } from '../core/head.js';
import { MAT } from '../core/mats.js';
import { beam, bldBegin, bldEnd, boardLeaf, cyl } from '../core/geo.js';
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
import {
  bulbMat,
  GACTS,
  GLAMPS,
  jar,
  keysBegin,
  KM,
  mug,
  paletteize,
  picture,
  plant,
  pot,
  put,
  rng,
  seedTray,
  soft,
  stone,
  teapot,
  wateringCan,
} from './garten_kit.js';
keysBegin();
bldBegin('holzhaus', 'Holzhaus', BLD.holzhaus.c, { short: 'Holzhaus', pad: 0.25 });
// ===== C: Holzhaus – Sarahs Hütte (3,0 × 3,6 m, an der Ostgrenze ausgerichtet; Pfosten auf Betonsteinen, Fensterband West, Pultdach mit grünen
// Biberschwanz-Schindeln, alte Busluke, Fassade ocker). Seit 23.10.2026 (Falko): Tür nach Norden, das Dach fällt nach Westen ab; eingerichtet als
// Pflanzhütte – Pflanztisch unter dem Fensterband, Anzuchtschalen, Töpfe, Gießkannen, Werkzeug an der Ostwand, Regal, Stuhl, Lampe =====
// local frame (az 96): +x ≈ east, +y ≈ north
{
  const b = BLD.holzhaus,
    g = siteGroup(b),
    R = rng(1966);
  const hx = b.L / 2,
    hy = b.W / 2,
    zf = 0.35,
    zL = zf + 2.2,
    zH = zL + 0.32,
    T = 0.08,
    L = 0.014;
  const r = rotDesc(b);
  const zTop = x => zL + ((zH - zL) * (x + hx)) / (2 * hx); // low in the west (window band), high at the boundary in the east
  const GL = (id, lx, ly, z, f, o = {}) => {
    const w = worldOf(b, lx, ly);
    return placeGLB(id, Object.assign({ x: w[0], y: w[1], z, face: faceOf(b, f) }, o));
  };
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
  const DN = { a0: -1.3, a1: -0.45, s: zf, h: zf + 2.0 }; // door in the north wall, west of the greenhouse
  const OPS = {
    W: [{ a0: -1.5, a1: 1.5, s: zf + 0.95, h: zf + 2.05 }],
    N: [DN],
    S: [{ a0: -1.2, a1: -0.6, s: zf + 1.05, h: zf + 1.65 }],
  };
  // outer walls (ochre boards) and inner pale lining, all with the same openings
  lw(g, 'y', -hy, hy, -hx, -hx + T - L, zf, zL, OPS.W, MATS.ochre, { grain: 'z' });
  lw(g, 'y', -hy + T, hy - T, -hx + T - L, -hx + T, zf, zL, OPS.W, MATS.pale, { grain: 'z', cast: false });
  lw(g, 'y', -hy, hy, hx - T + L, hx, zf, zH, [], MATS.ochre, { grain: 'z' });
  lw(g, 'y', -hy + T, hy - T, hx - T, hx - T + L, zf, zH, [], MATS.pale, { grain: 'z', cast: false });
  for (const sy of [-1, 1]) {
    const t0 = sy > 0 ? hy - T + L : -hy,
      t1 = sy > 0 ? hy : -hy + T - L,
      i0 = sy > 0 ? hy - T : -hy + T - L,
      i1 = sy > 0 ? hy - T + L : -hy + T;
    const ops = sy > 0 ? OPS.N : OPS.S;
    lw(g, 'x', -hx + T - L, hx - T + L, t0, t1, zf, zL, ops, MATS.ochre, { grain: 'z' });
    ltrap(g, 'x', -hx + T - L, hx - T + L, t0, t1, zL, zL, zTop(hx - T), MATS.ochre);
    lw(g, 'x', -hx + T, hx - T, i0, i1, zf, zL, ops, MATS.pale, { grain: 'z', cast: false });
    ltrap(g, 'x', -hx + T, hx - T, i0, i1, zL, zL, zTop(hx - T), MATS.pale);
  }
  gB(g, -hx + T, hx - T, -hy + T, hy - T, zf, zf + 0.02, MAT.oakF, { grain: 'x', cast: false });
  // Fensterband West: alter Holzrahmen dunkelbraun, 3 Felder; kleines Fenster Süd; Türzarge Nord, Tritt davor
  lwin(g, 'y', -1.5, 1.5, -hx + T / 2, zf + 0.95, zf + 2.05, {
    frame: MATS.oldFrame,
    fw: 0.06,
    depth: T + 0.02,
    mull: [-0.5, 0.5],
  });
  lwin(g, 'x', -1.2, -0.6, -hy + T / 2, zf + 1.05, zf + 1.65, { frame: MATS.oldFrame, fw: 0.05, depth: T + 0.02 });
  ljamb(g, 'x', DN.a0, DN.a1, hy - T, hy + 0.005, zf, zf + 2.0, MATS.oldFrame);
  gB(g, DN.a0 - 0.1, DN.a1 + 0.1, hy, hy + 0.5, 0.17, zf - 0.03, MAT.plank, { grain: 'x' });
  gB(g, DN.a0 - 0.1, DN.a1 + 0.1, hy, hy + 0.5, 0, 0.17, MAT.conc); // Tritt
  // roof: rafters along x (low at -x / garden side, high at +x / boundary), OSB, shingles, old bus roof hatch; gutter on the low west eave
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
    const hx0 = 0.3,
      hy0 = 0.35,
      zt = zTop(hx0) + 0.33;
    gB(g, hx0 - 0.33, hx0 + 0.33, hy0 - 0.28, hy0 + 0.28, zt - 0.12, zt, MATS.gold);
    gB(g, hx0 - 0.3, hx0 + 0.3, hy0 - 0.25, hy0 + 0.25, zt - 0.11, zt + 0.01, MAT.glass, { cast: false });
    gB(g, hx0 - 0.31, hx0 + 0.31, hy0 - 0.02, hy0 + 0.02, zt - 0.005, zt + 0.015, MAT.steel, { cast: false });
    gB(g, hx0 - 0.02, hx0 + 0.02, hy0 - 0.26, hy0 + 0.26, zt - 0.005, zt + 0.015, MAT.steel, { cast: false });
  }
  {
    const gx = -hx - ov - 0.06,
      gz = zTop(-hx - ov) + 0.02;
    put(g, new THREE.CylinderGeometry(0.06, 0.06, b.W + 0.3, 10, 1, true, 0, Math.PI), MAT.zinc, gx, 0, gz, {
      rz: -Math.PI / 2,
      ry: Math.PI / 2,
      cast: false,
    });
    cyl(gx, -hy + 0.05, 0.98, gz, 0.04, MAT.zinc, 10, undefined, { parent: g, col: false });
    beam([gx, -hy + 0.05, 1.0], [gx + 0.12, -hy + 0.3, 0.92], 0.07, 0.07, MAT.zinc, { parent: g });
    GL('rain_barrel', gx + 0.14, -hy + 0.36, 0, 0);
  }
  // PV module on a ground stand west of the hut (it charges the battery inside): tilted 30° to the south on aluminium legs, cable to the hut
  {
    const px = -hx - 1.4,
      py = 0.2,
      ang = 0.52,
      Lp = 1.7,
      Wp = 1.0,
      z0 = 0.32,
      dy = (Lp / 2) * Math.cos(ang),
      dz = (Lp / 2) * Math.sin(ang);
    put(
      g,
      new THREE.BoxGeometry(Wp, 0.035, Lp),
      [MAT.alu, MAT.alu, KM.pvCells, KM.cream, MAT.alu, MAT.alu],
      px,
      py,
      z0 + dz + 0.02,
      {
        rx: ang,
      }
    );
    for (const sx of [-1, 1]) {
      const x = px + sx * (Wp / 2 - 0.08);
      beam([x, py - dy + 0.05, 0], [x, py - dy + 0.05, z0 + 0.03], 0.04, 0.04, MAT.alu, { parent: g });
      beam([x, py + dy - 0.05, 0], [x, py + dy - 0.05, z0 + 2 * dz - 0.02], 0.04, 0.04, MAT.alu, { parent: g });
      beam([x, py - dy + 0.05, 0.05], [x, py + dy - 0.05, z0 + 2 * dz - 0.12], 0.03, 0.03, MAT.alu, { parent: g });
      gB(g, x - 0.08, x + 0.08, py - dy - 0.03, py - dy + 0.13, 0, 0.04, MAT.conc, { cast: false });
      gB(g, x - 0.08, x + 0.08, py + dy - 0.13, py + dy + 0.03, 0, 0.04, MAT.conc, { cast: false });
    }
    beam([px + 0.4, py + dy - 0.05, 0.5], [px + 0.5, py + dy - 0.05, 0.03], 0.012, 0.012, MAT.black, { parent: g });
    beam([px + 0.5, py + dy - 0.05, 0.02], [-hx - 0.02, 0.6, 0.02], 0.014, 0.014, MAT.black, { parent: g });
    beam([-hx - 0.02, 0.6, 0.02], [-hx - 0.02, 0.6, zf], 0.014, 0.014, MAT.black, { parent: g });
    lcol(r, px - Wp / 2, px + Wp / 2, py - dy, py + dy, 0, z0 + 2 * dz, 'pv');
  }
  // ===================== inside: Sarah's potting hut =====================
  const xi0 = -hx + T,
    xi1 = hx - T,
    yi0 = -hy + T,
    yi1 = hy - T,
    zt = zf + 0.88; // bench top
  // ---- potting bench along the window band: legs, slatted shelf below, worktop; seed trays, a heap of soil with a trowel, pots, twine, gloves ----
  const px0 = xi0,
    px1 = xi0 + 0.6,
    py0 = yi0 + 0.04,
    py1 = 0.95;
  for (const x of [px0 + 0.04, px1 - 0.04])
    for (const y of [py0 + 0.04, (py0 + py1) / 2, py1 - 0.04])
      gB(g, x - 0.025, x + 0.025, y - 0.025, y + 0.025, zf + 0.02, zt - 0.04, MAT.larch, { grain: 'z', cast: false });
  gB(g, px0, px1, py0, py1, zt - 0.04, zt, MAT.weather, { grain: 'y' });
  gB(g, px0 - 0.005, px1 + 0.005, py1 - 0.03, py1, zt, zt + 0.06, MAT.weather, { cast: false });
  for (let i = 0; i < 6; i++)
    gB(g, px0 + 0.02 + i * 0.096, px0 + 0.09 + i * 0.096, py0, py1, zf + 0.2, zf + 0.22, MAT.larch, { cast: false });
  seedTray(g, px0 + 0.08, px0 + 0.3, py0 + 0.1, py0 + 0.46, zt, R, 4, 6);
  seedTray(g, px0 + 0.32, px0 + 0.54, py0 + 0.1, py0 + 0.46, zt, R, 4, 6);
  seedTray(g, px0 + 0.08, px0 + 0.3, py0 + 0.5, py0 + 0.86, zt, R, 4, 6);
  put(g, new THREE.SphereGeometry(0.2, 12, 8), MAT.soil, px0 + 0.32, -0.25, zt, { s: [1, 0.35, 1.2] });
  put(g, new THREE.CylinderGeometry(0.012, 0.014, 0.12, 8), MAT.oak, px0 + 0.4, -0.22, zt + 0.14, { rz: 0.5, rx: 0.2 });
  put(g, new THREE.BoxGeometry(0.06, 0.12, 0.012), MAT.steel, px0 + 0.36, -0.22, zt + 0.07, { rz: 0.5, rx: 0.2 });
  for (let i = 0; i < 4; i++) pot(g, px0 + 0.18, 0.12, zt + i * 0.035, 0.07, 0.11, KM.terracotta);
  for (let i = 0; i < 3; i++) {
    const zs = pot(g, px0 + 0.42, 0.02 + i * 0.16, zt, 0.055, 0.09);
    plant(g, px0 + 0.42, 0.02 + i * 0.16, zs, 0.1 + R() * 0.05, i === 1 ? 'spiky' : 'herb', R);
  }
  put(g, new THREE.SphereGeometry(0.045, 10, 8), KM.twine, px0 + 0.2, 0.55, zt + 0.045, { cast: false });
  soft(g, px0 + 0.36, px0 + 0.5, 0.48, 0.62, zt, zt + 0.025, 0.01, KM.yellow, { ry: 0.4 });
  for (let i = 0; i < 4; i++)
    gB(
      g,
      px0 + 0.1 + i * 0.05,
      px0 + 0.14 + i * 0.05,
      0.72,
      0.8,
      zt,
      zt + 0.004,
      [KM.red, KM.yellow, MAT.sage, KM.cream][i],
      { cast: false }
    );
  for (let i = 0; i < 5; i++)
    beam(
      [px0 + 0.47 + (i % 3) * 0.02, 0.76 + i * 0.012, zt],
      [px0 + 0.47 + (i % 3) * 0.02 + 0.01, 0.76 + i * 0.012, zt + 0.15],
      0.012,
      0.004,
      MAT.larch,
      {
        parent: g,
      }
    );
  // under the bench: sacks of potting soil, stacked pots, a crate
  soft(g, px0 + 0.05, px0 + 0.5, py0 + 0.05, py0 + 0.6, zf + 0.22, zf + 0.42, 0.06, KM.cloth[1], { puff: 0.02 });
  soft(g, px0 + 0.08, px0 + 0.48, py0 + 0.62, py0 + 1.1, zf + 0.22, zf + 0.38, 0.06, KM.cloth[4], { puff: 0.02 });
  for (let i = 0; i < 5; i++)
    pot(g, px0 + 0.28, 0.3, zf + 0.22 + i * 0.04, 0.09, 0.14, i % 2 ? KM.terracottaDark : KM.terracotta);
  GL('crate', px0 + 0.3, 0.72, zf + 0.22, 90, { h: 0.2, col: false });
  // ---- shelves on the north wall (east of the door): seed jars, pots, a lantern, garden books, a basket of bulbs ----
  const sx0 = -0.3,
    sx1 = xi1,
    sy0 = yi1 - 0.3;
  for (const x of [sx0, 0.55, sx1 - 0.02])
    gB(g, x, x + 0.02, sy0, yi1, zf + 0.02, zf + 1.9, MAT.larch, { grain: 'z', cast: false });
  for (const zs of [zf + 0.45, zf + 0.95, zf + 1.4, zf + 1.85])
    gB(g, sx0, sx1, sy0, yi1, zs, zs + 0.025, MAT.larch, { cast: false });
  const jf = [KM.cream, MAT.logEnd, KM.straw, MAT.rust, MAT.sage, MAT.soil];
  for (let i = 0; i < 8; i++) jar(g, sx0 + 0.1 + i * 0.1, yi1 - 0.12, zf + 0.975, 0.035, 0.12, jf[i % jf.length]);
  for (let i = 0; i < 3; i++)
    for (let k = 0; k < 3 - (i % 2); k++) pot(g, sx0 + 1.0 + i * 0.2, yi1 - 0.14, zf + 0.475 + k * 0.04, 0.08, 0.12);
  {
    const w = worldOf(b, 0.95, yi1 - 0.14);
    placeGLB('lantern_t', { x: w[0], y: w[1], z: zf + 1.425, face: faceOf(b, 180), h: 0.32, col: false });
  }
  {
    const w = worldOf(b, 0.15, yi1 - 0.12);
    placeGLB('books', { x: w[0], y: w[1], z: zf + 1.425, face: faceOf(b, 90), w: 0.45, col: false });
  }
  GL('basket', 0.2, yi1 - 0.14, zf + 0.475, 180, { h: 0.18, col: false });
  for (let i = 0; i < 5; i++)
    put(
      g,
      new THREE.SphereGeometry(0.03, 8, 6),
      KM.straw,
      0.12 + (i % 3) * 0.06,
      yi1 - 0.16 + (i > 2 ? 0.05 : 0),
      zf + 0.64,
      {
        s: [1, 1.2, 1],
        cast: false,
      }
    );
  for (let i = 0; i < 6; i++)
    gB(
      g,
      sx0 + 0.75 + i * 0.07,
      sx0 + 0.8 + i * 0.07,
      yi1 - 0.2,
      yi1 - 0.06,
      zf + 1.875,
      zf + 1.875 + 0.06 + R() * 0.04,
      [KM.red, KM.yellow, MAT.sage, KM.cream][i % 4],
      {
        cast: false,
      }
    );
  // ---- east wall: tool rail with rake, hoe, spade, hand fork, shears; straw hat and apron; watering cans and a bucket below ----
  const ex = xi1;
  gB(g, ex - 0.03, ex, -0.85, 1.05, zf + 1.5, zf + 1.6, MAT.larch, { cast: false });
  const tool = (y, len, head) => {
    cyl(ex - 0.07, y, zf + 1.6 - len, zf + 1.62, 0.016, MAT.oak, 8, undefined, { parent: g, col: false });
    cyl(ex - 0.045, y, zf + 1.52, zf + 1.54, 0.008, MAT.steel, 6, undefined, { parent: g, col: false });
    head(y, zf + 1.6 - len);
  };
  tool(-0.7, 1.35, (y, z) => {
    gB(g, ex - 0.1, ex - 0.04, y - 0.2, y + 0.2, z - 0.03, z, MAT.blacksteel, { cast: false });
    for (let i = 0; i < 9; i++)
      gB(g, ex - 0.09, ex - 0.06, y - 0.19 + i * 0.047, y - 0.18 + i * 0.047, z - 0.09, z - 0.03, MAT.blacksteel, {
        cast: false,
      });
  });
  tool(-0.4, 1.3, (y, z) =>
    gB(g, ex - 0.12, ex - 0.04, y - 0.08, y + 0.08, z - 0.12, z, MAT.blacksteel, { cast: false })
  );
  tool(-0.12, 1.1, (y, z) => {
    gB(g, ex - 0.09, ex - 0.05, y - 0.1, y + 0.1, z - 0.26, z, MAT.steel, { cast: false });
  });
  tool(0.15, 0.95, (y, z) => {
    for (let i = 0; i < 4; i++)
      gB(g, ex - 0.08, ex - 0.06, y - 0.07 + i * 0.045, y - 0.055 + i * 0.045, z - 0.22, z, MAT.steel, { cast: false });
  });
  cyl(ex - 0.06, 0.4, zf + 1.3, zf + 1.48, 0.014, KM.red, 8, undefined, { parent: g, col: false });
  cyl(ex - 0.06, 0.45, zf + 1.3, zf + 1.48, 0.014, KM.red, 8, undefined, { parent: g, col: false });
  gB(g, ex - 0.07, ex - 0.05, 0.38, 0.47, zf + 1.18, zf + 1.31, MAT.steel, { cast: false });
  put(g, new THREE.TorusGeometry(0.17, 0.025, 6, 20), KM.enamelGreen, ex - 0.06, 0.72, zf + 1.3, {
    ry: Math.PI / 2,
    cast: false,
  });
  cyl(ex - 0.12, 0.98, zf + 1.48, zf + 1.495, 0.17, KM.straw, 20, undefined, { parent: g, col: false });
  cyl(ex - 0.12, 0.98, zf + 1.495, zf + 1.6, 0.09, KM.straw, 16, 0.08, { parent: g, col: false });
  soft(g, ex - 0.05, ex - 0.02, 0.82, 1.12, zf + 0.7, zf + 1.45, 0.01, MAT.sage);
  wateringCan(g, ex - 0.2, 0.55, zf + 0.02, 200, MAT.zinc, 1.0);
  wateringCan(g, ex - 0.25, 0.15, zf + 0.02, 160, KM.enamelGreen, 0.85);
  cyl(ex - 0.2, -0.3, zf + 0.02, zf + 0.3, 0.13, MAT.zinc, 16, 0.11, { parent: g, col: false });
  // ---- the cosy corner (south-east): chair with a cushion, side table with tea and the seed catalogue, a rag rug ----
  GL('desk_chair', 0.85, -1.05, zf + 0.02, -135, { h: 0.9, col: false });
  lcol(r, 0.64, 1.06, -1.26, -0.84, zf, zf + 0.9, 'chair');
  GL('side_table', 1.12, -1.48, zf + 0.02, 0, { h: 0.5 });
  teapot(g, 1.05, -1.48, zf + 0.52, KM.enamelGreen, 220);
  mug(g, 1.22, -1.42, zf + 0.52, KM.porcelain, 30);
  gB(g, 1.08, 1.3, -1.62, -1.46, zf + 0.52, zf + 0.535, MAT.rust, { cast: false });
  gB(g, 0.2, 1.3, -1.6, -0.55, zf + 0.02, zf + 0.03, KM.rag, { cast: false, grain: 'y' });
  // tomato seedlings in pots on a crate under the south window
  GL('crate', -0.3, yi0 + 0.25, zf + 0.02, 0, { h: 0.22 });
  for (let i = 0; i < 4; i++) {
    const zs = pot(g, -0.48 + (i % 2) * 0.17, yi0 + 0.18 + Math.floor(i / 2) * 0.15, zf + 0.24, 0.06, 0.09);
    plant(g, -0.48 + (i % 2) * 0.17, yi0 + 0.18 + Math.floor(i / 2) * 0.15, zs, 0.16, 'herb', R);
  }
  // PV battery and charge controller (south wall)
  gB(g, 0.05, 0.55, yi0, yi0 + 0.4, zf + 0.02, zf + 0.4, MAT.black);
  gB(g, 0.07, 0.53, yi0 + 0.02, yi0 + 0.38, zf + 0.4, zf + 0.42, MAT.alu, { cast: false });
  gB(g, 0.18, 0.4, yi0, yi0 + 0.05, zf + 1.05, zf + 1.3, KM.cream, { cast: false });
  gB(g, 0.22, 0.36, yi0 + 0.05, yi0 + 0.052, zf + 1.18, zf + 1.25, MAT.pv, { cast: false });
  picture(g, 'x', 0.9, yi0, zf + 1.55, 0.36, 0.46, 2, '+y');
  // bundles of herbs drying under the rafters
  for (let i = 0; i < 4; i++) {
    const x = -0.6 + i * 0.32,
      y = -1.3,
      z = zTop(x) - 0.25;
    cyl(x, y, z + 0.1, zTop(x) - 0.02, 0.003, KM.twine, 4, undefined, { parent: g, col: false });
    cyl(x, y, z + 0.07, z + 0.1, 0.018, KM.twine, 6, undefined, { parent: g, col: false });
    for (let k = 0; k < 5; k++) {
      const a = (k / 5) * 6.28 + R();
      put(
        g,
        new THREE.ConeGeometry(0.03, 0.2, 5),
        i % 2 ? KM.herbDry : KM.straw,
        x + Math.cos(a) * 0.025,
        y + Math.sin(a) * 0.025,
        z - 0.02,
        {
          rx: Math.PI + Math.cos(a) * 0.25,
          rz: Math.sin(a) * 0.25,
          cast: false,
        }
      );
    }
  }
  // ---- the lamp: green enamel shade over the bench, switch by the door ----
  const lampM = bulbMat(0xfff2d6);
  {
    const lx = px1 - 0.15,
      ly = -0.3,
      lz = zf + 1.75;
    cyl(lx, ly, lz + 0.16, zTop(lx) - 0.005, 0.004, KM.cord, 4, undefined, { parent: g, col: false });
    put(g, new THREE.ConeGeometry(0.16, 0.12, 18, 1, true), KM.enamelGreen, lx, ly, lz + 0.06, { cast: false });
    put(g, new THREE.SphereGeometry(0.035, 12, 8), lampM, lx, ly, lz + 0.02, { cast: false });
  }
  const SW = [DN.a1 + 0.12, yi1 - 0.01, zf + 1.1];
  gB(g, SW[0] - 0.04, SW[0] + 0.04, yi1 - 0.03, yi1, SW[2] - 0.05, SW[2] + 0.05, KM.porcelain, { cast: false });
  gB(g, SW[0] - 0.008, SW[0] + 0.008, yi1 - 0.045, yi1 - 0.03, SW[2] - 0.02, SW[2] + 0.02, KM.bakelite, {
    cast: false,
  });
  const hutIn = (x, y, z) => {
    const a = (b.az * Math.PI) / 180,
      dx = x - b.c[0],
      dy = y - b.c[1];
    return (
      z > zf - 0.5 &&
      z < zH + 0.5 &&
      Math.abs(dx * Math.sin(a) + dy * Math.cos(a)) < hx &&
      Math.abs(-dx * Math.cos(a) + dy * Math.sin(a)) < hy
    );
  };
  GLAMPS.push({
    key: 'holzhaus',
    b,
    lx: px1 - 0.15,
    ly: -0.3,
    z: zf + 1.72,
    mat: lampM,
    glow: 2.4,
    dist: 3.8,
    inten: 4,
    color: 0xffd6a0,
    sw: SW,
    label: 'Lampe',
    room: hutIn,
    r: 1.2,
  });
  // water the seedlings (the soil in the trays darkens)
  GACTS.push({
    key: 'giessen',
    b,
    lx: px1 + 0.1,
    ly: -0.3,
    z: zf + 0.9,
    r: 1.0,
    room: hutIn,
    label: st => (st.wet ? null : 'Setzlinge gießen'),
    run: st => {
      st.wet = 1;
      st.think('Die Setzlinge sind gegossen – Sarah wird sich freuen.');
      KM.traySoil.color.copy(MAT.soil.color).multiplyScalar(0.5);
      st.dirty();
    },
  });
  // ---- collision, floors ----
  lwalk(r, -hx + T, hx - T, -hy + T, hy - T, zf + 0.02);
  lwalk(r, DN.a0, DN.a1, hy - T - 0.01, hy + 0.01, zf + 0.02);
  lwalk(r, DN.a0 - 0.1, DN.a1 + 0.1, hy + 0.01, hy + 0.5, zf - 0.03, 'wood');
  lwc(r, 'y', -hy, hy, -hx - 0.01, -hx + T, 0, zL);
  lwc(r, 'y', -hy, hy, hx - T, hx + 0.01, 0, zH);
  lwc(r, 'x', -hx, hx, hy - T, hy + 0.01, zf, zH, [{ a0: DN.a0, a1: DN.a1, s: zf - 0.1, h: zf + 2.0 }]);
  lwc(r, 'x', -hx, hx, -hy - 0.01, -hy + T, 0, zH);
  lcol(r, -hx, hx, -hy, hy, 0, 0.24, 'base');
  lwalk(r, -hx + T, hx - T, -hy + T, hy - T, zL); // the roof as a surface: keeps the shoulder camera inside
  lcol(r, px0, px1, py0, py1, zf, zt + 0.06, 'bench');
  lcol(r, sx0, sx1, sy0, yi1, zf, zf + 1.9, 'shelf');
  lcol(r, xi1 - 0.35, xi1, -0.5, 0.75, zf, zf + 0.35, 'cans');
  lcol(r, 0.05, 0.55, yi0, yi0 + 0.4, zf, zf + 0.42, 'battery');
  // door: hinged at the west jamb, opens outwards (north)
  // a wreath of dried herbs and rose hips on the outside of the door (the leaf's −Z face looks north)
  const leafH = boardLeaf(0.85, 1.98, { mat: MATS.ochre });
  {
    const wr = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.028, 6, 20), KM.herbDry);
    wr.position.set(0.42, 1.5, -0.05);
    leafH.add(wr);
    const hips = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.3;
      hips.push(
        new THREE.SphereGeometry(0.018, 6, 5).translate(0.42 + Math.cos(a) * 0.12, 1.5 + Math.sin(a) * 0.12, -0.075)
      );
    }
    leafH.add(new THREE.Mesh(BufferGeometryUtils.mergeGeometries(hips), KM.red));
  }
  ldoor('holzhaus', b, leafH, {
    lx: DN.a0,
    ly: hy - 0.03,
    dir: [1, 0],
    w: 0.85,
    sign: 1,
    z0: zf + 0.01,
    z1: zf + 1.99,
  });
  // a long flower box under the window band (west), on two brackets
  {
    const bx = -hx - 0.02,
      bz = zf + 0.78;
    gB(g, bx - 0.2, bx, -1.25, 1.25, bz, bz + 0.16, MAT.larch);
    for (const y of [-0.9, 0.9])
      gB(g, bx - 0.16, bx, y - 0.02, y + 0.02, bz - 0.14, bz, MAT.blacksteel, { cast: false });
    for (let i = 0; i < 8; i++)
      plant(g, bx - 0.1, -1.1 + i * 0.315, bz + 0.14, 0.2, i % 3 === 1 ? 'herb' : 'geranium', R);
  }
  // outside the south wall: the hose reel on the wall, a wheelbarrow with soil parked below the small window
  GL('hose_reel', 0.62, -hy - 0.13, 0.75, 90, { h: 0.5, col: false });
  {
    const wg = new THREE.Group();
    wg.position.copy(V(-0.55, -hy - 0.75, 0));
    wg.rotation.y = 0.35;
    g.add(wg);
    // tray (four tilted sides and a bottom), wheel at the front (+x), handles and legs at the back
    gB(wg, -0.3, 0.3, -0.25, 0.25, 0.36, 0.38, KM.enamelGreen);
    for (const sgn of [-1, 1]) {
      put(wg, new THREE.BoxGeometry(0.66, 0.24, 0.015), KM.enamelGreen, 0, sgn * 0.3, 0.49, { rx: sgn * 0.3 });
      put(wg, new THREE.BoxGeometry(0.015, 0.24, 0.6), KM.enamelGreen, sgn * 0.34, 0, 0.49, { rz: -sgn * 0.35 });
    }
    put(wg, new THREE.SphereGeometry(0.26, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), MAT.soil, 0, 0, 0.42, {
      s: [1.1, 0.45, 0.85],
    });
    put(wg, new THREE.TorusGeometry(0.15, 0.045, 8, 18), MAT.black, 0.52, 0, 0.2, { rx: 0, cast: true });
    put(wg, new THREE.CylinderGeometry(0.04, 0.04, 0.12, 10), MAT.steel, 0.52, 0, 0.2, { rx: Math.PI / 2 });
    for (const sgn of [-1, 1]) {
      beam([0.52, sgn * 0.06, 0.2], [-0.75, sgn * 0.27, 0.55], 0.03, 0.04, MAT.oak, { parent: wg });
      beam([-0.25, sgn * 0.2, 0.36], [-0.3, sgn * 0.22, 0.0], 0.025, 0.025, MAT.steel, { parent: wg });
    }
    lcol(r, -1.1, 0.05, -hy - 1.1, -hy - 0.4, 0, 0.6, 'barrow');
  }
  // stepping stones from the gravel path (west) to the new door
  for (const [x, y, sz] of [
    [-2.05, 1.55, 0.24],
    [-1.75, 2.2, 0.22],
    [-1.15, 2.72, 0.25],
  ])
    stone(g, b, x, y, sz, R, FOOT);
  // geraniums in pots beside the step, a boot scraper
  for (const [x, y, sz] of [
    [DN.a0 - 0.32, hy + 0.22, 0.13],
    [DN.a1 + 0.28, hy + 0.2, 0.11],
  ]) {
    const zs = pot(g, x, y, 0, sz, sz * 1.3);
    plant(g, x, y, zs, sz * 2.2, 'geranium', R);
  }
  gB(g, DN.a1 + 0.12, DN.a1 + 0.14, hy + 0.55, hy + 0.85, 0, 0.12, MAT.blacksteel, { cast: false });
  INSIDE.push({ b, hx, hy, ox: 0, oy: 0, z0: zf - 0.1, z1: zH + 0.4, name: 'Holzhaus' });
  FOOT.push({ b, hx: hx + 0.1, hy: hy + 0.1, ox: 0, oy: 0 });
  paletteize(g, []);
}

bldEnd(BLD.holzhaus);
