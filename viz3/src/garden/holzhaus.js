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
import { keysBegin, keysSkip, KM, interiorNoShadow, paletteize, plant, pot, put, rng, twin } from './garten_kit.js';
// the atelier's floor: its own copy of the bungalow's (the same shader program), so the interior styles can change it (garden/atelier.js)
export const ATF = twin(KM.floor);
keysBegin();
bldBegin('holzhaus', 'Holzhaus', BLD.holzhaus.c, { short: 'Holzhaus', pad: 0.25 });
// ===== C: Holzhaus (3,0 × 3,6 m, an der Ostgrenze ausgerichtet; Pfosten auf Betonsteinen, Fensterband West, Pultdach mit grünen
// Biberschwanz-Schindeln, alte Busluke, Fassade ocker). Seit 23.10.2026 (Falko): Tür nach Norden, das Dach fällt nach Westen ab; innen ein Atelier
// (Töpfern, Malen, Schaukelstuhl, Klappsofa als Gästebett) – eingerichtet in garden/atelier.js (feat/einrichtung); hier Hülle, Boden und außen =====
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
  gB(g, -hx + T, hx - T, -hy + T, hy - T, zf, zf + 0.02, ATF, { grain: 'x', cast: false }); // the atelier's own floor (styles)
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
  // PV module on a ground stand south of the hut (it charges the battery inside): tilted 30° to the south on aluminium legs, cable to the
  // hut's south wall. Not west of the hut any more: on its stand it stood in the tractor's drive past the pavilion to the log yard
  // (test v16d:bridge), now ≥ 3 m clear of that line
  {
    const px = -0.4,
      py = -hy - 2.3,
      ang = 0.52,
      Lp = 1.7,
      Wp = 1.0,
      z0 = 0.32,
      dy = (Lp / 2) * Math.cos(ang),
      dz = (Lp / 2) * Math.sin(ang);
    const panel = put(
      g,
      new THREE.BoxGeometry(Wp, 0.035, Lp),
      [MAT.alu, MAT.alu, KM.pvCells, MAT.alu, MAT.alu, MAT.alu],
      px,
      py,
      z0 + dz + 0.02,
      {
        rx: ang,
      }
    );
    // junction box and two cross rails on the back
    for (const [w, h, d, x, z] of [
      [0.16, 0.03, 0.1, 0, -0.45],
      [Wp - 0.1, 0.03, 0.04, 0, -0.3],
      [Wp - 0.1, 0.03, 0.04, 0, 0.35],
    ]) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), w < 0.2 ? MAT.black : MAT.alu);
      m.position.set(x, -0.03, z);
      m.castShadow = true;
      panel.add(m);
    }
    for (const sx of [-1, 1]) {
      const x = px + sx * (Wp / 2 - 0.08);
      beam([x, py - dy + 0.05, 0], [x, py - dy + 0.05, z0 + 0.03], 0.04, 0.04, MAT.alu, { parent: g });
      beam([x, py + dy - 0.05, 0], [x, py + dy - 0.05, z0 + 2 * dz - 0.02], 0.04, 0.04, MAT.alu, { parent: g });
      beam([x, py - dy + 0.05, 0.05], [x, py + dy - 0.05, z0 + 2 * dz - 0.12], 0.03, 0.03, MAT.alu, { parent: g });
      gB(g, x - 0.08, x + 0.08, py - dy - 0.03, py - dy + 0.13, 0, 0.04, MAT.conc, { cast: false });
      gB(g, x - 0.08, x + 0.08, py + dy - 0.13, py + dy + 0.03, 0, 0.04, MAT.conc, { cast: false });
    }
    beam([px + 0.4, py + dy - 0.05, 0.5], [px + 0.5, py + dy - 0.05, 0.03], 0.012, 0.012, MAT.black, { parent: g });
    beam([px + 0.5, py + dy - 0.05, 0.02], [0.3, -hy - 0.02, 0.02], 0.014, 0.014, MAT.black, { parent: g });
    beam([0.3, -hy - 0.02, 0.02], [0.3, -hy - 0.02, zf], 0.014, 0.014, MAT.black, { parent: g });
    lcol(r, px - Wp / 2, px + Wp / 2, py - dy, py + dy, 0, z0 + 2 * dz, 'pv');
  }
  // ===================== inside: the atelier (feat/einrichtung, garden/atelier.js) – until 23.10.2026 Sarah's potting hut here =====================
  // the hut's seven models inside are gone (bench crate, lantern, books, basket, chair, side table, crate): their key numbers stay taken
  keysSkip(['crate', 'lantern_t', 'books', 'basket', 'desk_chair', 'side_table', 'crate']);
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
  // geraniums in pots beside the step, a boot scraper
  for (const [x, y, sz] of [
    [DN.a0 - 0.32, hy + 0.22, 0.13],
    [DN.a1 + 0.28, hy + 0.2, 0.11],
  ]) {
    const zs = pot(g, x, y, 0, sz, sz * 1.3);
    plant(g, x, y, zs, sz * 2.2, 'geranium', R);
  }
  gB(g, DN.a1 + 0.12, DN.a1 + 0.14, hy + 0.55, hy + 0.85, 0, 0.12, MAT.blacksteel, { cast: false });
  INSIDE.push({ b, hx, hy, ox: 0, oy: 0, z0: zf - 0.1, z1: zH + 0.4, name: 'Atelier' }); // feat/einrichtung: the hut is an atelier
  FOOT.push({ b, hx: hx + 0.1, hy: hy + 0.1, ox: 0, oy: 0 });
  interiorNoShadow(
    g,
    (x, y, z) => z > zf + 0.03 && z < zL - 0.05 && Math.abs(x) < hx - T - 0.02 && Math.abs(y) < hy - T - 0.02
  );
  paletteize(g, []);
}

bldEnd(BLD.holzhaus);
