// ===================== feat/einrichtung (Falko, 23.10.2026): the wooden house becomes an atelier =====================
// „… die Holzhütte, die übrigens eher ein Atelier sein soll als eine Gartenhütte – hier soll zum Beispiel getöpfert werden, gemalt, Kunst
// erschaffen werden. Es soll aber auch ein Schaukelstuhl drinstehen und ein Sofa, das man gegebenenfalls ausklappen kann … als Gästebett.“
// The hut's shell, its door to the north and the roof falling west stay (garden/holzhaus.js). Inside: a pottery corner (wheel with a stool, a
// wedging table, clay, shelves with pots drying, fired and glazed, a small kiln), a painting corner (work table under the window band, an
// easel with a canvas, paints, brushes, finished pictures), a rocking chair that rocks while one sits in it, and a click-clack sofa bed along
// the east wall: „Sofa ausklappen“ folds its back down into a guest bed (then „Hinlegen“), „Sofa zusammenklappen“; the state is saved.
// Five styles (garden/stil.js): Atelier hell, Skandinavisch, Landhaus, Industrie/Loft, Boho.
// local frame (az 96): +x ≈ east, +y ≈ north, z up; inner walls x ±1.42, y ±1.72, floor top 0.37
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { V } from '../core/head.js';
import { markDirty, plain, whenLoaded } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { TASKS } from '../core/tasks.js';
import { MAT } from '../core/mats.js';
import { beam, bldBegin, bldEnd, COL } from '../core/geo.js';
import { BLD, gB, lcol, MATS, rotDesc, siteGroup, worldOf } from './site_base.js';
import {
  bulbMat,
  canvasTex,
  GACTS,
  GLAMPS,
  GSEATS,
  KM,
  mergeGroup,
  paintColor,
  paletteize,
  put,
  redraw,
  rng,
  soft,
  twin,
  useMaps,
} from './garten_kit.js';
import { ATF } from './holzhaus.js';
import {
  cushions,
  framed,
  macrame,
  paint,
  paintArt,
  pottedPlant,
  pouf,
  shadeAround,
  sheepskin,
  STIL,
  stringLights,
  vessel,
} from './stil.js';
bldBegin('holzhaus', 'Holzhaus', BLD.holzhaus.c, { short: 'Holzhaus', pad: 0.25 });
const b = BLD.holzhaus,
  g = siteGroup(b),
  R = rng(2310);
const hx = b.L / 2,
  hy = b.W / 2,
  zf = 0.35,
  T = 0.08,
  FZ = zf + 0.02,
  xi0 = -hx + T,
  xi1 = hx - T,
  yi0 = -hy + T,
  yi1 = hy - T,
  zL = zf + 2.2,
  zH = zL + 0.32,
  zTop = x => zL + ((zH - zL) * (x + hx)) / (2 * hx),
  DN = { a0: -1.3, a1: -0.45 };
const r = rotDesc(b);
const deg = Math.PI / 180;
const worldOfB = (lx, ly) => worldOf(b, lx, ly);
// ---- the atelier's own materials (twins of the kit's: no new shader programs; the styles change their colours and images) ----
const AM = {
  wall: MATS.pale,
  floor: ATF,
  wood: twin(MAT.larchIn),
  fab: twin(MAT.linen),
  fab2: twin(MAT.wool),
  acc: twin(KM.red),
  rug: twin(KM.rag),
  art: twin(KM.art),
  canvas: twin(KM.art),
  paper: twin(KM.curtainLinen),
};
AM.rug.map = canvasTex(128, 512, [1 / 0.5, 1]);
AM.art.map = canvasTex(512, 512);
AM.canvas.map = canvasTex(256, 320);
// clay in its stages (plain colours: they go into the shared palette)
const CLAY = {
  wet: new THREE.MeshStandardMaterial({ color: 0x8b8176, roughness: 0.55 }),
  leather: new THREE.MeshStandardMaterial({ color: 0xa79d92, roughness: 0.9 }),
  bisque: new THREE.MeshStandardMaterial({ color: 0xe7d4c4, roughness: 0.85 }),
  glaze: [0x9dbfae, 0x2d4f8c, 0xc0883a, 0xf1ede5, 0x3b2418, 0x7a9a5a].map(
    c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.22 })
  ),
};
const wheelBody = new THREE.MeshStandardMaterial({ color: 0x5f7584, roughness: 0.45, metalness: 0.2 }),
  panM = new THREE.MeshStandardMaterial({ color: 0xe9e6df, roughness: 0.5 }),
  kilnM = new THREE.MeshStandardMaterial({ color: 0xb8bcbd, roughness: 0.35, metalness: 0.65 });
// (these plain colours become swatches of the shared palette – paletteize at the end – no programs of their own)
// ===================== the furniture that stays in every style =====================
// ---- work table under the window band (painting, glazing): paints, brushes in jars, a palette, a sketchbook; a clamp lamp ----
const wt = { x0: xi0, x1: xi0 + 0.56, y0: -0.3, y1: 1.32, z: FZ + 0.84 };
for (const x of [wt.x0 + 0.04, wt.x1 - 0.04])
  for (const y of [wt.y0 + 0.04, (wt.y0 + wt.y1) / 2, wt.y1 - 0.04])
    gB(g, x - 0.025, x + 0.025, y - 0.025, y + 0.025, FZ, wt.z - 0.04, AM.wood, { grain: 'z', cast: false });
gB(g, wt.x0, wt.x1, wt.y0, wt.y1, wt.z - 0.04, wt.z, AM.wood, { grain: 'y', cast: false });
gB(g, wt.x0 + 0.02, wt.x1 - 0.02, wt.y0 + 0.02, wt.y1 - 0.02, FZ + 0.22, FZ + 0.24, AM.wood, { cast: false });
// below: a stack of drawing paper, sketchbooks, a box of paints
gB(g, wt.x0 + 0.06, wt.x1 - 0.08, wt.y0 + 0.08, wt.y0 + 0.62, FZ + 0.24, FZ + 0.3, KM.cream, { cast: false });
for (let i = 0; i < 4; i++)
  gB(
    g,
    wt.x0 + 0.08,
    wt.x0 + 0.34,
    wt.y0 + 0.75 + i * 0.012,
    wt.y0 + 0.98 + i * 0.01,
    FZ + 0.24 + i * 0.022,
    FZ + 0.26 + i * 0.022,
    [MAT.black, KM.red, MAT.sage, KM.cream][i],
    { cast: false }
  );
gB(g, wt.x0 + 0.1, wt.x1 - 0.1, wt.y1 - 0.42, wt.y1 - 0.08, FZ + 0.24, FZ + 0.36, AM.wood, { cast: false });
{
  const z = wt.z;
  // palette (thin board with paint blobs)
  put(g, new THREE.CylinderGeometry(0.17, 0.17, 0.008, 22), AM.wood, wt.x0 + 0.3, 0.05, z + 0.004, {
    s: [1, 1, 0.7],
    cast: false,
  });
  const blobs = [0xd8452f, 0xf3c43b, 0x2d4f8c, 0xf4f1ea, 0x3f6b3a, 0x6b3a2a, 0xe0a0a0];
  blobs.forEach((c, i) => {
    const a = (i / blobs.length) * Math.PI * 1.6 - 0.4;
    put(
      g,
      new THREE.SphereGeometry(0.018, 8, 5),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.3 }),
      wt.x0 + 0.3 + Math.cos(a) * 0.11,
      0.05 + Math.sin(a) * 0.075,
      z + 0.009,
      { s: [1, 0.35, 1], cast: false }
    );
  });
  // jars with brushes, a water jar, tubes of paint, a rag, a sketchbook, a pencil cup
  for (const [x, y, n] of [
    [wt.x0 + 0.12, 0.42, 7],
    [wt.x0 + 0.2, 0.55, 5],
  ]) {
    put(g, new THREE.CylinderGeometry(0.04, 0.036, 0.12, 12), KM.glassJar, x, y, z + 0.06, { cast: false });
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2,
        len = 0.24 + R() * 0.08;
      put(
        g,
        new THREE.CylinderGeometry(0.004, 0.006, len, 5),
        k % 2 ? AM.wood : KM.bakelite,
        x + Math.cos(a) * 0.015,
        y + Math.sin(a) * 0.015,
        z + len / 2 + 0.01,
        { rx: Math.cos(a) * 0.12, rz: Math.sin(a) * 0.12, cast: false }
      );
    }
  }
  put(g, new THREE.CylinderGeometry(0.05, 0.045, 0.13, 12), KM.glassJar, wt.x0 + 0.42, 0.62, z + 0.065, {
    cast: false,
  });
  put(
    g,
    new THREE.CylinderGeometry(0.046, 0.041, 0.07, 12),
    new THREE.MeshStandardMaterial({ color: 0x8a9a8f, roughness: 0.3 }),
    wt.x0 + 0.42,
    0.62,
    z + 0.035,
    { cast: false }
  );
  for (let i = 0; i < 9; i++) {
    const c = blobs[i % blobs.length];
    put(
      g,
      new THREE.CylinderGeometry(0.012, 0.013, 0.09, 8),
      MAT.alu,
      wt.x0 + 0.38 + (i % 3) * 0.03,
      -0.18 + Math.floor(i / 3) * 0.035,
      z + 0.012,
      { rx: Math.PI / 2, rz: 0.2 + R() * 0.3, cast: false }
    );
    put(
      g,
      new THREE.CylinderGeometry(0.008, 0.008, 0.015, 8),
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.5 }),
      wt.x0 + 0.38 + (i % 3) * 0.03,
      -0.13 + Math.floor(i / 3) * 0.035,
      z + 0.012,
      { rx: Math.PI / 2, cast: false }
    );
  }
  soft(g, wt.x0 + 0.12, wt.x0 + 0.34, -0.25, -0.05, z, z + 0.03, 0.012, KM.cream, { ry: 0.3, cast: false });
  gB(g, wt.x0 + 0.08, wt.x0 + 0.38, 0.8, 1.1, z, z + 0.018, MAT.black, { cast: false });
  gB(g, wt.x0 + 0.09, wt.x0 + 0.37, 0.81, 1.09, z + 0.018, z + 0.02, KM.cream, { cast: false });
  put(g, new THREE.CylinderGeometry(0.035, 0.035, 0.1, 12), KM.enamelGreen, wt.x0 + 0.45, 1.15, z + 0.05, {
    cast: false,
  });
  for (let k = 0; k < 5; k++)
    put(
      g,
      new THREE.CylinderGeometry(0.004, 0.004, 0.16, 5),
      [KM.yellow, KM.red, MAT.black][k % 3],
      wt.x0 + 0.45 + (k - 2) * 0.008,
      1.15,
      z + 0.13,
      { rz: (k - 2) * 0.08, cast: false }
    );
  // clamp lamp at the window edge of the table: a post, an arm reaching over the work, the shade looking down
  const lx = wt.x0 + 0.05,
    ly = 0.32,
    zp = z + 0.48,
    ax = wt.x0 + 0.4,
    az = z + 0.4;
  gB(g, lx - 0.03, lx + 0.03, ly - 0.03, ly + 0.03, z - 0.05, z + 0.02, MAT.blacksteel, { cast: false });
  beam([lx, ly, z + 0.02], [lx, ly, zp], 0.014, 0.014, MAT.blacksteel, { parent: g });
  beam([lx, ly, zp], [ax, ly - 0.08, az], 0.012, 0.012, MAT.blacksteel, { parent: g });
  put(g, new THREE.ConeGeometry(0.07, 0.1, 16, 1, true), MAT.blacksteel, ax + 0.02, ly - 0.085, az - 0.05, {
    cast: false,
  });
  put(g, new THREE.SphereGeometry(0.022, 8, 6), KM.porcelain, ax + 0.02, ly - 0.085, az - 0.085, { cast: false });
}
lcol(r, wt.x0, wt.x1, wt.y0, wt.y1, FZ, wt.z, 'table');
// ---- hooks with an apron at the north end of the west wall, by the door ----
gB(g, xi0, xi0 + 0.02, 1.48, 1.7, FZ + 1.52, FZ + 1.58, AM.wood, { cast: false });
for (const y of [1.54, 1.64])
  put(g, new THREE.CylinderGeometry(0.008, 0.008, 0.05, 6), MAT.brass, xi0 + 0.04, y, FZ + 1.56, {
    rz: Math.PI / 2,
    cast: false,
  });
soft(g, xi0 + 0.02, xi0 + 0.05, 1.47, 1.66, FZ + 0.85, FZ + 1.55, 0.01, MAT.sage, { cast: false });
// ---- the easel with a canvas (painted further while playing), facing south-south-west: the window band lights it from the side ----
const EZ = { x: -0.18, y: 0.78, face: -112 }; // the canvas front looks along this direction (degrees from local +x towards +y): SSW
{
  const eg = new THREE.Group();
  eg.position.copy(V(EZ.x, EZ.y, FZ));
  eg.rotation.y = EZ.face * deg; // the group's +x looks along the canvas front
  g.add(eg);
  // H-frame: two uprights, a mast, feet; the canvas ledge and the top clamp; the canvas (front towards the group's +x)
  for (const y of [-0.26, 0.26]) gB(eg, -0.04, 0.0, y - 0.025, y + 0.025, 0, 1.62, AM.wood, { cast: false });
  gB(eg, -0.04, 0.0, -0.025, 0.025, 0.4, 1.9, AM.wood, { cast: false });
  gB(eg, -0.3, 0.12, -0.3, 0.3, 0, 0.04, AM.wood, { cast: false });
  gB(eg, -0.3, -0.26, -0.03, 0.03, 0.04, 0.5, AM.wood, { cast: false });
  gB(eg, -0.02, 0.07, -0.32, 0.32, 0.72, 0.75, AM.wood, { cast: false });
  gB(eg, 0.0, 0.05, -0.04, 0.04, 1.4, 1.46, AM.wood, { cast: false });
  gB(eg, 0.005, 0.03, -0.27, 0.27, 0.75, 1.43, AM.wood, { cast: false });
  put(eg, new THREE.PlaneGeometry(0.5, 0.64), AM.canvas, 0.032, 0, 1.08, { ry: Math.PI / 2, cast: false });
  gB(eg, 0.008, 0.03, -0.26, 0.26, 0.745, 0.76, KM.cream, { cast: false });
  // a few brushes and a rag on the ledge
  for (let k = 0; k < 3; k++)
    put(eg, new THREE.CylinderGeometry(0.004, 0.006, 0.22, 5), AM.wood, 0.05, -0.2 + k * 0.05, 0.765, {
      rz: Math.PI / 2,
      ry: 0.1 * k,
      cast: false,
    });
}
lcol(r, EZ.x - 0.32, EZ.x + 0.32, EZ.y - 0.32, EZ.y + 0.32, FZ, FZ + 1.9, 'easel');
// ---- shelves on the north wall east of the door: clay bags, pots drying (leather-hard), bisque, glazed pieces ----
const SH = { x0: -0.22, x1: 0.74, y0: yi1 - 0.28, y1: yi1, z: [0.1, 0.52, 0.94, 1.36, 1.78].map(z => FZ + z) };
for (const x of [SH.x0, 0.26, SH.x1 - 0.025])
  gB(g, x, x + 0.025, SH.y0, SH.y1, FZ, FZ + 1.84, AM.wood, { grain: 'z', cast: false });
for (const z of SH.z) gB(g, SH.x0, SH.x1, SH.y0, SH.y1, z, z + 0.022, AM.wood, { cast: false });
lcol(r, SH.x0, SH.x1, SH.y0, SH.y1, FZ, FZ + 1.84, 'shelf');
{
  const ym = (SH.y0 + SH.y1) / 2;
  // bottom: clay in plastic bags, a bucket of slip
  for (const [x, c] of [
    [-0.1, 0xd9dcd8],
    [0.1, 0xc9ccc7],
  ])
    soft(
      g,
      x - 0.1,
      x + 0.1,
      SH.y0 + 0.04,
      SH.y1 - 0.03,
      SH.z[0] + 0.022,
      SH.z[0] + 0.22,
      0.04,
      new THREE.MeshStandardMaterial({ color: c, roughness: 0.4 }),
      { puff: 0.02, cast: false }
    );
  put(
    g,
    new THREE.CylinderGeometry(0.11, 0.1, 0.26, 16),
    new THREE.MeshStandardMaterial({ color: 0x3f6e9a, roughness: 0.5 }),
    0.5,
    ym,
    SH.z[0] + 0.15,
    { cast: false }
  );
  put(g, new THREE.CylinderGeometry(0.1, 0.1, 0.01, 16), CLAY.wet, 0.5, ym, SH.z[0] + 0.27, { cast: false });
  // drying (leather-hard): bowls, cups, a vase
  const row = (z, mats, kinds) =>
    kinds.forEach((k, i) => {
      const x = SH.x0 + 0.1 + i * 0.13,
        [kind, rr, hh] = k;
      vessel(g, kind, x, ym, z + 0.022, rr, hh, mats[i % mats.length]);
    });
  row(
    SH.z[1],
    [CLAY.leather],
    [
      ['bowl', 0.06, 0.06],
      ['cup', 0.035, 0.08],
      ['cup', 0.035, 0.08],
      ['vase', 0.05, 0.2],
    ]
  );
  row(
    SH.z[2],
    [CLAY.bisque],
    [
      ['vase', 0.055, 0.22],
      ['bowl', 0.07, 0.065],
      ['jug', 0.05, 0.16],
      ['cup', 0.035, 0.08],
      ['bowl', 0.05, 0.05],
      ['bottle', 0.045, 0.2],
      ['cup', 0.035, 0.08],
    ]
  );
  row(SH.z[3], CLAY.glaze, [
    ['vase', 0.06, 0.24],
    ['bowl', 0.075, 0.07],
    ['jug', 0.055, 0.18],
    ['bottle', 0.05, 0.22],
    ['cup', 0.038, 0.085],
    ['bowl', 0.06, 0.06],
    ['vase', 0.045, 0.17],
  ]);
  vessel(g, 'vase', 0.05, ym, SH.z[4] + 0.022, 0.09, 0.34, CLAY.glaze[1]);
  vessel(g, 'jug', 0.45, ym, SH.z[4] + 0.022, 0.07, 0.24, CLAY.glaze[2]);
}
// the bowls turned on the wheel while playing: six places on the drying shelf (second board), shown as they are made
const MYBOWLS = [],
  BOWLM = { leather: plain({ color: 0xa79d92, roughness: 0.9 }), bisque: plain({ color: 0xe7d4c4, roughness: 0.85 }) };
{
  const ym = (SH.y0 + SH.y1) / 2;
  for (let i = 0; i < 6; i++) {
    const me = vessel(
      g,
      'bowl',
      SH.x0 + 0.62 + (i % 3) * 0.11,
      ym + (i < 3 ? -0.05 : 0.06),
      SH.z[1] + 0.022,
      0.055,
      0.055,
      BOWLM.leather
    );
    me.userData.noMerge = true;
    me.visible = false;
    MYBOWLS.push(me);
  }
}
// ---- the pottery corner: wheel with splash pan and pedal, a stool; wedging table with clay and tools along the south wall ----
const WH = { x: -0.84, y: -1.0 };
{
  gB(g, WH.x - 0.24, WH.x + 0.24, WH.y - 0.2, WH.y + 0.2, FZ, FZ + 0.32, wheelBody, { bevel: 0.02, cast: false });
  put(g, new THREE.CylinderGeometry(0.29, 0.26, 0.09, 26, 1, true), panM, WH.x, WH.y, FZ + 0.37, { cast: false });
  put(g, new THREE.CylinderGeometry(0.26, 0.26, 0.01, 26), panM, WH.x, WH.y, FZ + 0.33, { cast: false });
  put(g, new THREE.CylinderGeometry(0.03, 0.03, 0.06, 10), MAT.steel, WH.x, WH.y, FZ + 0.36, { cast: false });
  gB(g, WH.x + 0.3, WH.x + 0.46, WH.y + 0.1, WH.y + 0.24, FZ, FZ + 0.05, MAT.black, { cast: false });
  // the stool (seat at 0.45) east of the wheel: one sits facing west, the window light from the left
  const sx = WH.x + 0.52;
  put(g, new THREE.CylinderGeometry(0.17, 0.17, 0.04, 18), AM.wood, sx, WH.y, FZ + 0.43, { cast: false });
  for (let k = 0; k < 3; k++) {
    const a = (k / 3) * Math.PI * 2 + 0.3;
    put(
      g,
      new THREE.CylinderGeometry(0.016, 0.02, 0.44, 7),
      AM.wood,
      sx + Math.cos(a) * 0.11,
      WH.y + Math.sin(a) * 0.11,
      FZ + 0.21,
      { rx: Math.sin(a) * 0.12, rz: -Math.cos(a) * 0.12, cast: false }
    );
  }
  // slip bucket and a sponge beside the wheel
  put(g, new THREE.CylinderGeometry(0.12, 0.1, 0.3, 16), MAT.zinc, WH.x - 0.05, WH.y + 0.42, FZ + 0.15, {
    cast: false,
  });
  put(g, new THREE.CylinderGeometry(0.11, 0.11, 0.01, 16), CLAY.wet, WH.x - 0.05, WH.y + 0.42, FZ + 0.27, {
    cast: false,
  });
}
lcol(r, WH.x - 0.3, WH.x + 0.3, WH.y - 0.3, WH.y + 0.3, FZ, FZ + 0.42, 'wheel');
lcol(r, WH.x + 0.36, WH.x + 0.68, WH.y - 0.16, WH.y + 0.16, FZ, FZ + 0.45, 'stool');
// the wheel head with the clay on it turns (a group of its own, not merged with the room)
const head = new THREE.Group();
head.position.copy(V(WH.x, WH.y, FZ + 0.39));
g.add(head);
const CLAYP = {
  // the same number of points: the lump pulled up into a bowl (lerped while turning)
  lump: [
    [0.001, 0],
    [0.1, 0],
    [0.105, 0.02],
    [0.095, 0.06],
    [0.07, 0.09],
    [0.04, 0.105],
    [0.02, 0.11],
    [0.001, 0.112],
  ],
  bowl: [
    [0.001, 0],
    [0.06, 0],
    [0.09, 0.03],
    [0.115, 0.06],
    [0.125, 0.085],
    [0.118, 0.086],
    [0.09, 0.05],
    [0.001, 0.02],
  ],
};
const clayGeo = new THREE.LatheGeometry(
  CLAYP.lump.map(([x, y]) => new THREE.Vector2(x, y)),
  20
);
const bowlGeo = new THREE.LatheGeometry(
  CLAYP.bowl.map(([x, y]) => new THREE.Vector2(x, y)),
  20
);
const lumpPos = clayGeo.attributes.position.array.slice();
{
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 0.025, 28), MAT.alu);
  disc.position.y = 0.012;
  head.add(disc);
  const clay = new THREE.Mesh(clayGeo, plain({ color: 0x8b8176, roughness: 0.55 }));
  clay.position.y = 0.025;
  clay.name = 'clay';
  head.add(clay);
  for (const o of [disc, clay]) {
    o.userData.noMerge = true;
    o.castShadow = false;
    o.receiveShadow = true;
  }
}
function clayShape(k) {
  const p = clayGeo.attributes.position,
    q = bowlGeo.attributes.position.array;
  for (let i = 0; i < p.array.length; i++) p.array[i] = lumpPos[i] + (q[i] - lumpPos[i]) * k;
  p.needsUpdate = true;
  clayGeo.computeVertexNormals();
}
// ---- wedging table (Knettisch) along the south wall, west of the middle: canvas top, a block of clay, wire, sponge, water, tools ----
{
  const x0 = xi0,
    x1 = -0.44,
    y0 = yi0,
    y1 = yi0 + 0.36,
    z = FZ + 0.8;
  for (const x of [x0 + 0.04, x1 - 0.04])
    for (const y of [y0 + 0.04, y1 - 0.04])
      gB(g, x - 0.025, x + 0.025, y - 0.025, y + 0.025, FZ, z - 0.05, AM.wood, { cast: false });
  gB(g, x0, x1, y0, y1, z - 0.05, z, AM.wood, { cast: false });
  gB(g, x0 + 0.01, x1 - 0.01, y0 + 0.01, y1 - 0.01, z, z + 0.008, KM.cream, { cast: false });
  soft(g, x0 + 0.22, x0 + 0.46, y0 + 0.08, y0 + 0.26, z + 0.008, z + 0.13, 0.03, CLAY.wet, { ry: 0.2, cast: false });
  soft(g, x0 + 0.52, x0 + 0.64, y0 + 0.12, y0 + 0.24, z + 0.008, z + 0.07, 0.03, CLAY.leather, { cast: false });
  soft(g, x1 - 0.2, x1 - 0.1, y0 + 0.2, y0 + 0.28, z + 0.008, z + 0.04, 0.012, KM.yellow, { cast: false });
  vessel(g, 'bowl', x1 - 0.12, y0 + 0.1, z + 0.008, 0.07, 0.06, panM);
  for (const [dx, m] of [
    [0.06, AM.wood],
    [0.16, AM.wood],
  ])
    put(g, new THREE.CylinderGeometry(0.012, 0.012, 0.08, 6), m, x0 + dx, y1 - 0.06, z + 0.02, {
      rz: Math.PI / 2,
      cast: false,
    });
  gB(g, x0 + 0.07, x0 + 0.15, y1 - 0.065, y1 - 0.055, z + 0.019, z + 0.021, MAT.steel, { cast: false });
  for (let k = 0; k < 4; k++)
    gB(
      g,
      x0 + 0.7 + k * 0.05,
      x0 + 0.74 + k * 0.05,
      y1 - 0.14,
      y1 - 0.04,
      z + 0.008,
      z + 0.012,
      [AM.wood, MAT.steel, AM.wood, KM.red][k],
      { cast: false }
    );
  // below: two bags of clay, a reclaim bucket
  soft(
    g,
    x0 + 0.08,
    x0 + 0.42,
    y0 + 0.04,
    y1 - 0.04,
    FZ,
    FZ + 0.2,
    0.05,
    new THREE.MeshStandardMaterial({ color: 0xdcdedb, roughness: 0.35 }),
    { puff: 0.02, cast: false }
  );
  soft(
    g,
    x0 + 0.46,
    x0 + 0.78,
    y0 + 0.04,
    y1 - 0.04,
    FZ,
    FZ + 0.18,
    0.05,
    new THREE.MeshStandardMaterial({ color: 0xd0d3cf, roughness: 0.35 }),
    { puff: 0.02, cast: false }
  );
  lcol(r, x0, x1, y0, y1, FZ, z + 0.1, 'wedging');
}
// ---- the kiln (a small top loader on a stand) in the north-east corner, its controller on the east wall ----
const KI = { x: 1.1, y: 1.4 };
const kilnLed = bulbMat(0x2a0d08),
  kilnEye = bulbMat(0x1a0d06);
{
  for (const [dx, dy] of [
    [-0.18, -0.18],
    [0.18, -0.18],
    [-0.18, 0.18],
    [0.18, 0.18],
  ])
    gB(g, KI.x + dx - 0.015, KI.x + dx + 0.015, KI.y + dy - 0.015, KI.y + dy + 0.015, FZ, FZ + 0.3, MAT.blacksteel, {
      cast: false,
    });
  gB(g, KI.x - 0.22, KI.x + 0.22, KI.y - 0.22, KI.y + 0.22, FZ + 0.28, FZ + 0.31, MAT.blacksteel, { cast: false });
  put(g, new THREE.CylinderGeometry(0.26, 0.26, 0.5, 8), kilnM, KI.x, KI.y, FZ + 0.56, {
    ry: Math.PI / 8,
    cast: false,
  });
  for (const z of [0.36, 0.56, 0.76])
    put(g, new THREE.CylinderGeometry(0.265, 0.265, 0.02, 8), MAT.steel, KI.x, KI.y, FZ + z, {
      ry: Math.PI / 8,
      cast: false,
    });
  put(g, new THREE.CylinderGeometry(0.25, 0.26, 0.06, 8), MAT.blacksteel, KI.x, KI.y, FZ + 0.84, {
    ry: Math.PI / 8,
    cast: false,
  });
  gB(g, KI.x - 0.12, KI.x + 0.12, KI.y - 0.02, KI.y + 0.02, FZ + 0.87, FZ + 0.9, MAT.black, { cast: false });
  put(g, new THREE.CylinderGeometry(0.018, 0.018, 0.02, 10), kilnEye, KI.x - 0.25, KI.y, FZ + 0.58, {
    rz: Math.PI / 2,
    cast: false,
  });
  // controller box with a display on the east wall, a cable
  gB(g, xi1 - 0.08, xi1, KI.y - 0.12, KI.y + 0.08, FZ + 1.1, FZ + 1.36, MAT.black, { cast: false });
  gB(g, xi1 - 0.085, xi1 - 0.08, KI.y - 0.08, KI.y + 0.04, FZ + 1.26, FZ + 1.32, kilnLed, { cast: false });
  put(g, new THREE.CylinderGeometry(0.008, 0.008, 0.7, 5), MAT.black, xi1 - 0.03, KI.y - 0.02, FZ + 0.75, {
    cast: false,
  });
}
lcol(r, KI.x - 0.3, xi1, KI.y - 0.3, yi1, FZ, FZ + 0.9, 'kiln');
// ---- the PV battery and charge controller (they were there before) under the south wall ----
gB(g, 0.05, 0.55, yi0, yi0 + 0.4, FZ, FZ + 0.4, MAT.black);
gB(g, 0.07, 0.53, yi0 + 0.02, yi0 + 0.38, FZ + 0.4, FZ + 0.42, MAT.alu, { cast: false });
gB(g, 0.18, 0.4, yi0, yi0 + 0.05, zf + 1.05, zf + 1.3, KM.cream, { cast: false });
gB(g, 0.22, 0.36, yi0 + 0.05, yi0 + 0.052, zf + 1.18, zf + 1.25, MAT.pv, { cast: false });
lcol(r, 0.05, 0.55, yi0, yi0 + 0.4, FZ, FZ + 0.42, 'battery');
// ---- the rug in front of the sofa (its pattern follows the style) ----
gB(g, -0.32, 0.5, -0.62, 0.72, FZ, FZ + 0.008, AM.rug, { cast: false, grain: 'y' });
// ---- the lamp: a pendant over the middle (its shade follows the style), switch by the door ----
const LP = { x: -0.25, y: -0.12, z: FZ + 1.82 };
const lampM = bulbMat(0xfff2d6);
{
  const zc = zTop(LP.x) + 0.04;
  put(g, new THREE.CylinderGeometry(0.004, 0.004, zc - LP.z - 0.06, 5), KM.cord, LP.x, LP.y, (zc + LP.z + 0.06) / 2, {
    cast: false,
  });
  put(g, new THREE.CylinderGeometry(0.018, 0.02, 0.06, 10), KM.bakelite, LP.x, LP.y, LP.z + 0.06, { cast: false });
  const bulb = put(g, new THREE.SphereGeometry(0.032, 14, 10), lampM, LP.x, LP.y, LP.z, {
    s: [1, 1.25, 1],
    cast: false,
  });
  bulb.userData.noMerge = true;
}
const SW = [DN.a1 + 0.12, yi1 - 0.01, zf + 1.1];
gB(g, SW[0] - 0.04, SW[0] + 0.04, yi1 - 0.03, yi1, SW[2] - 0.05, SW[2] + 0.05, KM.porcelain, { cast: false });
gB(g, SW[0] - 0.008, SW[0] + 0.008, yi1 - 0.045, yi1 - 0.03, SW[2] - 0.02, SW[2] + 0.02, KM.bakelite, { cast: false });
const atelierIn = (x, y, z) => {
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
  lx: LP.x,
  ly: LP.y,
  z: LP.z - 0.04,
  mat: lampM,
  glow: 2.4,
  dist: 4.0,
  inten: 4.6,
  color: 0xffdcae,
  sw: SW,
  label: 'Lampe',
  room: atelierIn,
  r: 1.2,
});
// ===================== the rocking chair (south-east corner, looking north-west into the room) =====================
const RC = { x: 0.92, y: -1.26, face: 135 * deg, R: 1.1 }; // face: direction of the seat (radians, local x towards local y)
const rock = { th: 0, amp: 0, t: 0, on: false, eye: [RC.x, RC.y, FZ + 1.53] };
const chair = new THREE.Group(),
  rockG = new THREE.Group(),
  body = new THREE.Group();
chair.position.copy(V(RC.x, RC.y, FZ));
chair.rotation.y = RC.face;
g.add(chair);
chair.add(rockG);
rockG.add(body);
rockG.position.copy(V(0, 0, RC.R));
body.position.copy(V(0, 0, -RC.R));
{
  const W = AM.wood,
    a = 0.45 / RC.R;
  for (const y of [-0.25, 0.25]) {
    const run = new THREE.TorusGeometry(RC.R, 0.016, 6, 28, 2 * a);
    put(body, run, W, 0, y, RC.R, { rz: -Math.PI / 2 - a, s: [1, 1, 1.4], cast: false });
  }
  const zr = x => RC.R - Math.sqrt(RC.R * RC.R - x * x) + 0.012;
  // front and back legs on the runners, seat frame, woven seat, back posts leaning back, top rail, spindles, arms
  for (const [x, top] of [
    [0.19, 0.62],
    [-0.19, 0.44],
  ])
    for (const y of [-0.23, 0.23]) gB(body, x - 0.018, x + 0.018, y - 0.018, y + 0.018, zr(x), top, W, { cast: false });
  gB(body, -0.23, 0.23, -0.25, 0.25, 0.38, 0.42, W, { cast: false });
  gB(body, -0.2, 0.2, -0.22, 0.22, 0.415, 0.425, KM.straw, { cast: false });
  for (const y of [-0.22, 0.22]) {
    const p0 = [-0.2, y, 0.42],
      p1 = [-0.36, y * 0.95, 1.08],
      len = Math.hypot(p1[0] - p0[0], p1[2] - p0[2]);
    put(body, new THREE.BoxGeometry(0.036, len, 0.036), W, (p0[0] + p1[0]) / 2, y, (p0[2] + p1[2]) / 2, {
      rz: Math.atan2(p1[0] - p0[0], p1[2] - p0[2]),
      cast: false,
    });
  }
  const back = (k, zz) => [-0.2 - 0.16 * k, zz];
  for (const k of [0.45, 0.98]) {
    const [x, z] = back(k, 0.42 + 0.66 * k);
    gB(body, x - 0.02, x + 0.02, -0.22, 0.22, z - 0.03, z + 0.03, W, { cast: false });
  }
  for (let i = 0; i < 5; i++) {
    const y = -0.15 + i * 0.075,
      [x0, z0] = back(0.45, 0.72),
      [x1, z1] = back(0.98, 1.07),
      len = Math.hypot(x1 - x0, z1 - z0);
    put(body, new THREE.CylinderGeometry(0.009, 0.009, len, 6), W, (x0 + x1) / 2, y, (z0 + z1) / 2, {
      rz: Math.atan2(x1 - x0, z1 - z0),
      cast: false,
    });
  }
  for (const y of [-0.24, 0.24]) gB(body, -0.26, 0.27, y - 0.028, y + 0.028, 0.62, 0.65, W, { cast: false });
  // a cushion on the seat and a pad against the back (the style's second fabric)
  soft(body, -0.2, 0.2, -0.2, 0.2, 0.425, 0.48, 0.03, AM.fab2, { puff: 0.015, cast: false });
  soft(body, -0.33, -0.25, -0.18, 0.18, 0.55, 0.98, 0.03, AM.fab2, { ry: 0, cast: false });
}
mergeGroup(body, { cast: false });
lcol(r, RC.x - 0.42, RC.x + 0.42, RC.y - 0.42, RC.y + 0.42, FZ, FZ + 1.0, 'rocker');
// the eye of someone sitting in it (rocking moves it a few centimetres); θ > 0 leans the chair back
function rockPose(th) {
  const ex = -0.06,
    ez = 1.16,
    px = ex,
    pz = ez - RC.R,
    x1 = px * Math.cos(th) - pz * Math.sin(th) - RC.R * th,
    z1 = RC.R + px * Math.sin(th) + pz * Math.cos(th);
  rockG.position.copy(V(-RC.R * th, 0, RC.R));
  rockG.rotation.z = th;
  rock.eye = [RC.x + x1 * Math.cos(RC.face), RC.y + x1 * Math.sin(RC.face), FZ + z1];
}
rockPose(0);
// ===================== the click-clack sofa bed along the east wall =====================
// folded: seat 0.52 deep, the back upright against the wall; unfolded: the seat slides forward, the back folds down behind it – a bed
// of 1.22 × 1.9 m (in the real click-clack sofas the back clicks into the flat position the same way)
const SB = { y0: -0.92, y1: 0.98, zs: FZ + 0.24, k: 0, want: 0, anim: false };
SB.yc = (SB.y0 + SB.y1) / 2;
const sofa = { seat: new THREE.Group(), back: new THREE.Group(), bed: new THREE.Group() };
{
  const W = AM.wood,
    y0 = SB.y0,
    y1 = SB.y1;
  // plinth on short legs (stays where it is)
  gB(g, 0.6, xi1 - 0.02, y0 + 0.02, y1 - 0.02, FZ + 0.05, SB.zs, W, { cast: false, bevel: 0.01 });
  for (const x of [0.64, xi1 - 0.06])
    for (const y of [y0 + 0.06, y1 - 0.06])
      gB(g, x - 0.02, x + 0.02, y - 0.02, y + 0.02, FZ, FZ + 0.05, MAT.black, { cast: false });
  // the seat: cushion and a slim frame with two legs at its front (they carry it when it slides out)
  const sg = sofa.seat;
  g.add(sg);
  soft(sg, 0.58, 1.1, y0, y1, SB.zs, SB.zs + 0.2, 0.05, AM.fab, { puff: 0.012, cast: false });
  gB(sg, 0.6, 0.64, y0 + 0.04, y1 - 0.04, FZ + 0.08, SB.zs, W, { cast: false });
  for (const y of [y0 + 0.08, y1 - 0.08])
    gB(sg, 0.6, 0.64, y - 0.02, y + 0.02, FZ, FZ + 0.08, MAT.black, { cast: false });
  // the back: hinged at its lower front edge; built flat (towards the wall), turned up by 80° when folded
  const bg = sofa.back;
  g.add(bg);
  soft(bg, 0, 0.7, y0 - SB.yc, y1 - SB.yc, 0, 0.2, 0.05, AM.fab, { puff: 0.012, cast: false });
  // bedding for the guest bed: shown when it is unfolded – sheet, pillow, a folded blanket
  const bd = sofa.bed;
  g.add(bd);
  soft(bd, 0.2, 1.38, y0 + 0.02, y1 - 0.02, SB.zs + 0.2, SB.zs + 0.215, 0.006, KM.cream, { cast: false });
  soft(bd, 0.3, 0.76, y1 - 0.42, y1 - 0.08, SB.zs + 0.21, SB.zs + 0.33, 0.05, MAT.woolLight, {
    puff: 0.03,
    cast: false,
  });
  soft(bd, 0.86, 1.3, y1 - 0.44, y1 - 0.06, SB.zs + 0.21, SB.zs + 0.3, 0.05, MAT.woolLight, {
    puff: 0.03,
    cast: false,
  });
  soft(bd, 0.24, 1.36, y0 + 0.06, y0 + 1.15, SB.zs + 0.21, SB.zs + 0.27, 0.03, AM.fab2, { puff: 0.02, cast: false });
  for (const gg of [sg, bg, bd]) mergeGroup(gg, { cast: false });
}
// the sofa's collider: deeper and lower when it is a bed
const sofaCol = [0.56, xi1, SB.y0, SB.y1, FZ, FZ + 0.9, 'sofabed', null, null, r];
COL.push(sofaCol);
function sofaPose(k) {
  const e = k * k * (3 - 2 * k),
    dx = -0.4 * e;
  sofa.seat.position.copy(V(dx, 0, 0));
  sofa.back.position.copy(V(1.29 + (0.7 - 1.29) * e, SB.yc, SB.zs));
  sofa.back.rotation.z = (80 * (1 - e) * Math.PI) / 180;
  sofa.bed.visible = k > 0.98;
  if (A.deco) A.deco.visible = k < 0.02;
}
const A = { deco: null };
// ===================== styles =====================
const MAPS = { larch: MAT.larchIn, oak: MAT.oak, paint: MATS.greenBoards, conc: MAT.conc, oakF: MAT.oakF };
function surf(m, set, col, rough) {
  if (MAPS[set]) useMaps(m, MAPS[set]);
  paintColor(m, col);
  if (rough !== undefined) m.roughness = rough;
}
const STYLES = [
  {
    id: 'hell',
    name: 'Atelier hell',
    note: 'Weiß gekalkte Bretter, helle Lärche, Leinen, Sisal – viel Licht zum Arbeiten',
    sw: [0xf3eee4, 0xe4dccb, 0xc8b48a],
    acc: 0,
    wall: 0xf1ebdf,
    floor: ['oakF', 0xe6cfae],
    wood: ['larch', 0xffffff],
    fab: [0xe2d9c6, 0.95],
    fab2: 0xc6b08c,
    rug: ['sisal', [0xc8b48a]],
    art: ['hills', 'flowers', 'abstract', 'botanical'],
    shade: ['cone', 0xf2f0ea],
    plants: [['leafy', 0.3, yi0 + 0.2, 0.62, () => FZ + 0.42]],
  },
  {
    id: 'skandi',
    name: 'Skandinavisch',
    note: 'Weiß, Birke, Grau und Taubenblau, Schaffell, Papierlampe, Pflanzen in weißen Töpfen',
    sw: [0xf7f6f3, 0xc9c9c6, 0x8ea3b8],
    acc: 4,
    wall: 0xf7f6f2,
    floor: ['paint', 0xe7e3da],
    wood: ['larch', 0xfff6e8],
    fab: [0xc8c8c4, 0.95],
    fab2: 0x8e9aa3,
    rug: ['stripes', [0xf2f0ea, 0xd9d6cf, 0xf2f0ea, 0x9aa3a8]],
    art: ['lines', 'botanical', ['abstract', ['#f2efe8', '#8ea3b8', '#3a3a3a', '#d9c7a0']], 'grid'],
    shade: ['globe', null],
    plants: [
      ['leafy', 0.3, yi0 + 0.2, 0.7, () => FZ + 0.42],
      ['trailing', 0.05, 1.58, 0.35, SH => SH.z[4] + 0.022],
    ],
    skin: true,
  },
  {
    id: 'landhaus',
    name: 'Landhaus',
    note: 'Cremeweiße Wände, Eiche, Salbeigrün und Rost, Faltenschirm, Blumen und Korb',
    sw: [0xf1e6cf, 0x9aa889, 0xb0502e],
    acc: 1,
    wall: 0xefe2c6,
    floor: ['oak', 0xd8b890],
    wood: ['oak', 0xf2d6b0],
    fab: [0x9aa889, 0.95],
    fab2: 0xb4553f,
    rug: ['border', [0x9c4a36, 0xe8dcc0, 0x2f4a5a]],
    art: ['flowers', 'hills', 'portrait', ['botanical', ['#f0e6d0', '#5a6e3a']]],
    shade: ['pleat', 0xefe3c8],
    plants: [['herb', wt.x0 + 0.3, 1.0, 0.4, () => wt.z]],
    basket: true,
  },
  {
    id: 'loft',
    name: 'Industrie/Loft',
    note: 'Betongrau, schwarz gebeiztes Holz, Cognac-Leder, Gitterlampe, Metallhocker',
    sw: [0x77736c, 0x8a5530, 0x2b2b2b],
    acc: 3,
    wall: 0x8a8781,
    floor: ['conc', 0xcfcac2],
    wood: ['larch', 0x5a4c40],
    fab: [0x8a5530, 0.5],
    fab2: 0x4b4b4b,
    rug: ['border', [0x3a3a3a, 0x77736c, 0xa9a39a]],
    art: [
      'abstract',
      'grid',
      ['lines', ['#2b2b2b', '#e8e4dc']],
      ['portrait', ['#9a958d', '#2b2b2b', '#c9b49a', '#5a3b2a']],
    ],
    shade: ['cage', null],
    plants: [['cactus', 0.3, yi0 + 0.2, 0.5, () => FZ + 0.42]],
    stool: true,
  },
  {
    id: 'boho',
    name: 'Boho',
    note: 'Sand und Terrakotta, Senf und Rost, Kelim, Makramee, Rattanlampe, Lichterkette, viele Pflanzen',
    sw: [0xe2c7a6, 0xc99a3a, 0xb0502e],
    acc: 7,
    wall: 0xe4cba8,
    floor: ['oakF', 0xe8c9a0],
    wood: ['larch', 0xf0d2a8],
    fab: [0xc99a3a, 0.95],
    fab2: 0xb0502e,
    rug: ['kilim', [0xb0502e, 0xe9cfa8, 0x2b6070, 0xc99a2e]],
    art: [
      'sun',
      ['abstract', ['#e9cfa8', '#b0502e', '#5a3550', '#c99a2e']],
      ['flowers', ['#e9cfa8', '#2b6070', '#b0502e', '#f3c43b']],
      ['hills', ['#f2c48f', '#d9a36a', '#b0502e', '#7a4a2a']],
    ],
    shade: ['rattan', 0xc8a46a],
    plants: [
      ['leafy', 0.3, yi0 + 0.2, 0.7, () => FZ + 0.42],
      ['tall', -0.15, -1.45, 0.95],
      ['trailing', 0.05, 1.58, 0.35, SH => SH.z[4] + 0.022],
      ['trailing', wt.x0 + 0.12, 1.22, 0.3, () => wt.z],
    ],
    boho: true,
  },
];
function apply(h) {
  const s = STYLES.find(q => q.id === h.cur);
  paintColor(AM.wall, s.wall);
  surf(AM.floor, s.floor[0], s.floor[1]);
  surf(AM.wood, s.wood[0], s.wood[1]);
  AM.fab.color.set(s.fab[0]);
  AM.fab.roughness = s.fab[1];
  AM.fab2.color.set(s.fab2);
  paint(AM.rug.map, s.rug[0], s.rug[1]);
  paintArt(AM.art.map, s.art);
}
// the style's furnishing: lamp shade, pictures on the walls and leaning, cushions on the sofa, plants, and what the style brings along
function build(L, h) {
  const s = STYLES.find(q => q.id === h.cur),
    Rr = h.R,
    pal = c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.55 });
  shadeAround(L, s.shade[0], LP.x, LP.y, LP.z, s.shade[0] === 'globe' ? AM.paper : pal(s.shade[1] ?? 0x2b2b2b));
  const fm = s.id === 'loft' ? MAT.black : s.id === 'skandi' ? pal(0xf2f0ea) : AM.wood;
  // pictures: two over the sofa, one over the rocking chair, one over the door; canvases leaning on the south wall
  framed(L, AM.art, 'y', 0.42, xi1, FZ + 1.42, 0.56, 0.42, 0, '-x', fm);
  framed(L, AM.art, 'y', -0.38, xi1, FZ + 1.46, 0.3, 0.4, 1, '-x', fm);
  framed(L, AM.art, 'x', 0.95, yi0, FZ + 1.5, 0.42, 0.42, 2, '+y', fm);
  framed(L, AM.art, 'x', -0.1, yi1, FZ + 1.95, 0.3, 0.3, 3, '-y', fm);
  {
    const lean = new THREE.Group();
    lean.position.copy(V(-0.2, yi0 + 0.06, FZ));
    lean.rotation.x = 0.16; // its top against the wall
    L.add(lean);
    framed(lean, AM.art, 'x', 0, 0.0, 0.33, 0.4, 0.5, 3, '+y', null);
    gB(lean, -0.2, 0.2, -0.025, -0.005, 0.08, 0.58, AM.wood, { cast: false });
  }
  // cushions on the sofa (hidden while it is a bed) – a group of their own
  const deco = new THREE.Group();
  deco.userData.sep = true;
  L.add(deco);
  cushions(
    deco,
    [
      [1.0, SB.y1 - 0.3, 0.42, 0.2],
      [1.0, SB.y0 + 0.3, 0.4, -0.2],
      [0.98, SB.yc + 0.05, 0.36, 0.1],
    ],
    SB.zs + 0.2,
    [AM.acc, AM.fab2, KM.cream],
    Rr,
    'y'
  );
  if (s.id === 'landhaus' || s.id === 'boho')
    soft(
      deco,
      0.62,
      1.12,
      SB.y0 + 0.02,
      SB.y0 + 0.5,
      SB.zs + 0.2,
      SB.zs + 0.235,
      0.012,
      s.id === 'boho' ? AM.rug : AM.acc,
      { cast: false }
    );
  A.deco = deco;
  deco.visible = SB.k < 0.02;
  // plants
  for (const [kind, x, y, size, zf2] of s.plants) {
    const z = zf2 ? zf2(SH) : FZ;
    pottedPlant(
      L,
      x,
      y,
      z,
      size,
      kind,
      s.id === 'skandi' ? pal(0xf4f2ee) : s.id === 'loft' ? MAT.blacksteel : KM.terracotta,
      Rr
    );
  }
  // a vase with the accent colour on the work table, a jug with dried flowers in the country style
  vessel(L, 'vase', wt.x0 + 0.3, 1.24, wt.z, 0.05, 0.18, AM.acc);
  if (s.skin) sheepskin(L, RC.x - 0.05, RC.y + 0.05, FZ + 0.44, 0.42, 0.55, 0.6);
  if (s.basket) {
    put(L, new THREE.CylinderGeometry(0.17, 0.14, 0.26, 16), KM.straw, 0.32, SB.y1 + 0.2, FZ + 0.13, { cast: false });
    for (let k = 0; k < 3; k++)
      put(
        L,
        new THREE.SphereGeometry(0.06, 10, 8),
        [AM.acc, AM.fab2, KM.cream][k],
        0.28 + k * 0.05,
        SB.y1 + 0.18 + (k % 2) * 0.05,
        FZ + 0.28,
        { cast: false }
      );
    vessel(L, 'jug', wt.x0 + 0.28, 0.25, wt.z, 0.06, 0.18, CLAY.glaze[3]);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      put(
        L,
        new THREE.CylinderGeometry(0.003, 0.003, 0.26, 4),
        KM.herbDry,
        wt.x0 + 0.28 + Math.cos(a) * 0.02,
        0.25 + Math.sin(a) * 0.02,
        wt.z + 0.3,
        { rx: Math.sin(a) * 0.3, rz: -Math.cos(a) * 0.3, cast: false }
      );
      put(
        L,
        new THREE.SphereGeometry(0.018, 6, 5),
        [KM.yellow, KM.straw, KM.red][k % 3],
        wt.x0 + 0.28 + Math.cos(a) * 0.06,
        0.25 + Math.sin(a) * 0.06,
        wt.z + 0.43,
        { cast: false }
      );
    }
  }
  if (s.stool) {
    put(L, new THREE.CylinderGeometry(0.16, 0.16, 0.03, 18), MAT.blacksteel, -0.05, -0.55, FZ + 0.6, { cast: false });
    for (let k = 0; k < 4; k++) {
      const a = (k / 4) * Math.PI * 2 + 0.4;
      put(
        L,
        new THREE.CylinderGeometry(0.01, 0.012, 0.62, 6),
        MAT.blacksteel,
        -0.05 + Math.cos(a) * 0.12,
        -0.55 + Math.sin(a) * 0.12,
        FZ + 0.3,
        { rx: Math.sin(a) * 0.15, rz: -Math.cos(a) * 0.15, cast: false }
      );
    }
    gB(L, wt.x0 + 0.02, wt.x1 - 0.04, -0.28, -0.02, FZ + 1.5, FZ + 1.52, MAT.blacksteel, { cast: false });
  }
  if (s.boho) {
    macrame(L, 'y', -0.05, xi1 - 0.04, FZ + 1.95, 0.42, 0.55);
    stringLights(L, [xi0 + 0.06, -1.45, zL - 0.12], [xi0 + 0.06, 1.45, zL - 0.12], 18, pal(0xffe2a8));
    pouf(L, -0.05, -0.5, FZ, 0.22, AM.fab2);
  }
}
const ATELIER = STIL.house('atelier', {
  label: 'Atelier',
  anchor: g,
  inside: atelierIn,
  M: AM,
  styles: STYLES.map(s => Object.assign({}, s, { apply, build })),
  def: 'hell',
});
// ===================== playing: the sofa bed, the rocking chair, the wheel, the easel, the kiln =====================
const SAVED = STIL.x('atelier') && typeof STIL.x('atelier') === 'object' ? STIL.x('atelier') : {};
const AS = {
  sofa: SAVED.sofa === 1 ? 1 : 0,
  bowls: Number.isInteger(SAVED.bowls) ? Math.max(0, Math.min(6, SAVED.bowls)) : 0,
  fired: Number.isInteger(SAVED.fired) ? Math.max(0, Math.min(6, SAVED.fired)) : 0,
  pic: Number.isInteger(SAVED.pic) ? Math.max(0, Math.min(5, SAVED.pic)) : 1,
  motif: Number.isInteger(SAVED.motif) ? SAVED.motif % 3 : 0,
};
const keep = () => STIL.x('atelier', { sofa: AS.sofa, bowls: AS.bowls, fired: AS.fired, pic: AS.pic, motif: AS.motif });
SB.k = SB.want = AS.sofa;
sofaPose(SB.k);
sofaCol[0] = AS.sofa ? 0.16 : 0.56;
sofaCol[5] = FZ + (AS.sofa ? 0.5 : 0.9);
function showBowls() {
  MYBOWLS.forEach((me, i) => {
    me.visible = i < AS.bowls;
    me.material = i < AS.fired ? BOWLM.bisque : BOWLM.leather;
  });
}
showBowls();
// ---- sounds (synthesised, only near the atelier) ----
const tone = (A, fn) => {
  const rr = A && A.ready && A.ready() && A.raw();
  if (rr) fn(rr.ctx, rr.sfx);
};
const clack = (c, out, t, f = 900, v = 0.08) => {
  const n = c.createBufferSource(),
    buf = c.createBuffer(1, c.sampleRate * 0.08, c.sampleRate),
    d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.exp(-i / (c.sampleRate * 0.012));
  n.buffer = buf;
  const bp = c.createBiquadFilter(),
    gn = c.createGain();
  bp.type = 'bandpass';
  bp.frequency.value = f;
  bp.Q.value = 1.5;
  gn.gain.value = v;
  n.connect(bp);
  bp.connect(gn);
  gn.connect(out);
  n.start(t);
};
export const sofaSound = A =>
  tone(A, (c, out) => {
    const t = c.currentTime + 0.02;
    clack(c, out, t, 700, 0.09);
    clack(c, out, t + 0.12, 1300, 0.06);
    clack(c, out, t + 1.35, 600, 0.1);
  });
const creak = A =>
  tone(A, (c, out) => {
    const t = c.currentTime + 0.02,
      o = c.createOscillator(),
      gn = c.createGain();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(180 + Math.random() * 60, t);
    o.frequency.linearRampToValueAtTime(140 + Math.random() * 40, t + 0.25);
    gn.gain.setValueAtTime(0.0001, t);
    gn.gain.exponentialRampToValueAtTime(0.012, t + 0.05);
    gn.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    const lp = c.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 900;
    o.connect(lp);
    lp.connect(gn);
    gn.connect(out);
    o.start(t);
    o.stop(t + 0.32);
  });
const wheelHum = { node: null };
function hum(A, on) {
  tone(A, (c, out) => {
    if (on && !wheelHum.node) {
      const o = c.createOscillator(),
        gn = c.createGain(),
        lp = c.createBiquadFilter();
      o.type = 'triangle';
      o.frequency.value = 96;
      lp.type = 'lowpass';
      lp.frequency.value = 400;
      gn.gain.setValueAtTime(0.0001, c.currentTime);
      gn.gain.exponentialRampToValueAtTime(0.03, c.currentTime + 0.6);
      o.connect(lp);
      lp.connect(gn);
      gn.connect(out);
      o.start();
      wheelHum.node = { o, gn, c };
    } else if (!on && wheelHum.node) {
      const { o, gn, c: cc } = wheelHum.node;
      gn.gain.setTargetAtTime(0.0001, cc.currentTime, 0.15);
      o.stop(cc.currentTime + 0.8);
      wheelHum.node = null;
    }
  });
}
// ---- the sofa bed: unfold / fold (an animation of ~1.6 s), then a seat or a bed ----
const toLocal = (x, y) => {
  const a = (b.az * Math.PI) / 180,
    dx = x - b.c[0],
    dy = y - b.c[1];
  return [dx * Math.sin(a) + dy * Math.cos(a), -dx * Math.cos(a) + dy * Math.sin(a)];
};
GACTS.push({
  key: 'klappsofa',
  b,
  lx: 0.32,
  ly: SB.yc,
  z: FZ + 0.55,
  r: 1.5,
  room: atelierIn,
  label: () => (SB.anim ? null : SB.k > 0.5 ? 'Sofa zusammenklappen' : 'Sofa ausklappen'),
  run: st => {
    const P = LATE.P;
    if (SB.k < 0.5 && P) {
      const [lx, ly] = toLocal(P.x, P.y);
      if (lx > 0.05 && lx < 0.6 && ly > SB.y0 - 0.1 && ly < SB.y1 + 0.1) {
        st.think('Erst ein Stück zur Seite gehen – das Bett braucht hier Platz.');
        return;
      }
    }
    SB.want = SB.k > 0.5 ? 0 : 1;
    SB.anim = true;
    st.sound(sofaSound);
    if (SB.want)
      st.think(
        'Lehne nach hinten drücken, bis es klickt, dann flach legen – fertig ist das Gästebett. Bettzeug liegt im Regal.'
      );
  },
  tick: (dt, st) => {
    if (!SB.anim) return false;
    SB.k = SB.k + Math.sign(SB.want - SB.k) * Math.min(Math.abs(SB.want - SB.k), dt / 1.6);
    sofaPose(SB.k);
    if (SB.k === SB.want) {
      SB.anim = false;
      AS.sofa = SB.want;
      keep();
      KERN.emit('einrichtung:sofa', { house: 'atelier', bed: AS.sofa });
      sofaCol[0] = AS.sofa ? 0.16 : 0.56;
      sofaCol[5] = FZ + (AS.sofa ? 0.5 : 0.9);
      if (LATE.rebuildGrids) LATE.rebuildGrids();
      st.dirty();
    }
    return true;
  },
});
GSEATS.push(
  {
    key: 'atelier-sofa',
    b,
    lx: 0.82,
    ly: SB.yc - 0.2,
    eye: SB.zs + 0.2 + 0.74,
    yaw: 180,
    pitch: -4,
    kind: 'sit',
    label: () => (SB.k < 0.02 && !SB.anim ? 'Aufs Sofa setzen' : null),
    at: [0.3, SB.yc - 0.2],
    r: 1.3,
  },
  {
    key: 'atelier-bett',
    b,
    lx: 0.78,
    ly: SB.y1 - 0.3,
    eye: SB.zs + 0.2 + 0.3,
    yaw: 90,
    pitch: 2,
    kind: 'lie',
    label: () => (SB.k > 0.98 && !SB.anim ? 'Hinlegen' : null),
    at: [0.0, SB.yc],
    r: 1.5,
  },
  // the rocking chair: it rocks gently while one sits in it
  {
    key: 'schaukelstuhl',
    b,
    lx: RC.x,
    ly: RC.y,
    eye: FZ + 1.53,
    yaw: (Math.atan2(-Math.sin(RC.face), Math.cos(RC.face)) * 180) / Math.PI,
    pitch: -6,
    kind: 'sit',
    label: 'In den Schaukelstuhl setzen',
    at: [RC.x - 0.45, RC.y + 0.4],
    r: 1.3,
    follow: () => rock.eye,
    onSit: () => {
      rock.on = true;
    },
    onLeave: () => {
      rock.on = false;
    },
  },
  // the potter's wheel: sit down, then turn a bowl (and put it on the shelf to dry)
  {
    key: 'scheibe',
    b,
    lx: WH.x + 0.5,
    ly: WH.y,
    eye: FZ + 0.45 + 0.74,
    yaw: 180,
    pitch: -30,
    kind: 'sit',
    label: 'An die Töpferscheibe setzen',
    at: [WH.x + 0.75, WH.y + 0.25],
    r: 1.2,
    primary: () => potter.primary(),
    primaryLabel: () => potter.label(),
    onLeave: () => potter.leave(),
  }
);
// the rocking itself (and a creak now and then)
GACTS.push({
  key: 'schaukeln',
  b,
  lx: RC.x,
  ly: RC.y,
  z: -99,
  r: 0,
  label: () => null,
  run: () => {},
  tick: (dt, st) => {
    const want = rock.on ? 0.075 : 0;
    if (!rock.on && rock.amp < 0.002 && Math.abs(rock.th) < 0.002) {
      if (rock.th !== 0) {
        rock.th = 0;
        rockPose(0);
        return true;
      }
      return false;
    }
    rock.amp += (want - rock.amp) * Math.min(1, dt * (rock.on ? 0.8 : 1.5));
    rock.t += dt;
    const th = rock.amp * Math.sin(rock.t * Math.PI * 2 * 0.5);
    if (rock.on && Math.sign(th) !== Math.sign(rock.th) && th < 0 && Math.random() < 0.5) st.sound(creak);
    rock.th = th;
    rockPose(th);
    return true;
  },
});
// ---- the wheel: turn a bowl in ~6 s (the clay is pulled up into a bowl), put it on the shelf; tips how it is done ----
const potter = (() => {
  const S = { k: 0, phase: 'lump', spin: 0, t: 0 };
  const TIPS = [
    'So töpferst du: Ton gut kneten, Kugel fest in die Mitte der nassen Scheibe setzen – erst zentrieren, Ellbogen auf die Knie, Druck nach innen und unten.',
    'Daumen in die Mitte drücken und öffnen, dann mit einer Hand innen, einer außen die Wand langsam hochziehen – immer nass halten.',
    'Den Rand mit dem Schwamm glätten, mit dem Draht unter der Schale durchziehen und sie zum Trocknen lederhart werden lassen.',
  ];
  let tip = 0;
  return {
    label: () =>
      S.phase === 'turning'
        ? 'Die Scheibe dreht …'
        : S.phase === 'bowl'
          ? 'Schale zum Trocknen ins Regal stellen'
          : AS.bowls >= 6
            ? ''
            : 'Eine Schale drehen',
    primary() {
      const think = t => LATE.PLAY && LATE.PLAY.think(t);
      if (S.phase === 'lump') {
        if (AS.bowls >= 6) {
          think('Das Trockenregal ist voll – erst brennen.');
          return;
        }
        S.phase = 'turning';
        S.t = 0;
        think(TIPS[tip++ % TIPS.length]);
        hum(LATE.audio, true);
      } else if (S.phase === 'bowl') {
        AS.bowls++;
        keep();
        KERN.emit('einrichtung:schale', { n: AS.bowls });
        showBowls();
        S.phase = 'lump';
        clayShape(0);
        think(
          AS.bowls >= 6
            ? 'Sechs Schalen trocknen. Wenn sie lederhart sind, kommen sie in den Brennofen.'
            : 'Ab ins Regal – in ein paar Tagen ist sie lederhart.'
        );
        markDirty(true);
      }
    },
    leave() {
      if (S.phase === 'turning') {
        S.phase = 'lump';
        clayShape(0);
      }
      hum(LATE.audio, false);
    },
    tick(dt) {
      if (S.phase !== 'turning' && S.spin < 0.01) return false;
      const want = S.phase === 'turning' ? 1 : 0;
      S.spin += (want - S.spin) * Math.min(1, dt * 2);
      head.rotation.y += dt * S.spin * 2 * Math.PI * 2.2;
      if (S.phase === 'turning') {
        S.t += dt;
        const k = Math.min(1, Math.max(0, (S.t - 0.8) / 4.5));
        clayShape(k * k * (3 - 2 * k));
        if (S.t > 6) {
          S.phase = 'bowl';
          hum(LATE.audio, false);
        }
      }
      return true;
    },
    S,
  };
})();
GACTS.push({
  key: 'scheibe-dreht',
  b,
  lx: WH.x,
  ly: WH.y,
  z: -99,
  r: 0,
  label: () => null,
  run: () => {},
  tick: dt => potter.tick(dt),
});
// ---- the kiln: fire the dried bowls (bisque firing) – the display glows red, then they come out pale ----
const kiln = { on: false, t: 0 };
GACTS.push({
  key: 'brennofen',
  b,
  lx: KI.x - 0.35,
  ly: KI.y - 0.3,
  z: FZ + 0.9,
  r: 1.2,
  room: atelierIn,
  label: () => (kiln.on ? null : AS.bowls > AS.fired ? 'Schalen in den Brennofen' : null),
  run: st => {
    kiln.on = true;
    kiln.t = 0;
    kilnLed.emissive.set(0xff3a1a);
    kilnLed.emissiveIntensity = 2;
    st.think(
      'Schrühbrand: langsam auf 900 °C, damit das Restwasser entweicht – danach sind die Schalen fest und nehmen Glasur an.'
    );
    st.dirty();
  },
  tick: (dt, st) => {
    if (!kiln.on) return false;
    kiln.t += dt;
    kilnEye.emissive.set(0xff7a2a);
    kilnEye.emissiveIntensity = Math.min(2.5, kiln.t / 2);
    if (kiln.t > 8) {
      kiln.on = false;
      kilnLed.emissiveIntensity = 0;
      kilnEye.emissiveIntensity = 0;
      AS.fired = AS.bowls;
      keep();
      KERN.emit('einrichtung:brand', { n: AS.fired });
      showBowls();
      st.think('Der Ofen ist abgekühlt: die Schalen sind geschrüht – hell und hart. Jetzt glasieren.');
      st.dirty();
    }
    return true;
  },
});
// ---- the easel: paint on, step by step (the picture on the canvas grows), then start a new one ----
const MOTIFS = ['Landschaft', 'Stillleben', 'Abstrakt'];
function canvasPaint(m, s) {
  redraw(AM.canvas.map, (q, w, h) => {
    q.fillStyle = '#f4f1ea';
    q.fillRect(0, 0, w, h);
    const RR = rng(77 + m);
    q.strokeStyle = 'rgba(90,80,70,0.55)';
    q.lineWidth = 1.2;
    if (m === 0) {
      // landscape: sky, hills, trees, light
      q.beginPath();
      q.moveTo(0, h * 0.55);
      q.quadraticCurveTo(w * 0.4, h * 0.42, w, h * 0.58);
      q.stroke();
      if (s >= 1) {
        const g2 = q.createLinearGradient(0, 0, 0, h * 0.6);
        g2.addColorStop(0, '#9ec3dc');
        g2.addColorStop(1, '#f1d9b0');
        q.fillStyle = g2;
        q.fillRect(0, 0, w, h * 0.6);
        q.fillStyle = '#7f9a55';
        q.fillRect(0, h * 0.55, w, h * 0.45);
      }
      if (s >= 2)
        for (const [y0, c] of [
          [0.5, '#6e8452'],
          [0.62, '#4f6a3e'],
        ]) {
          q.fillStyle = c;
          q.beginPath();
          q.moveTo(0, h);
          for (let x = 0; x <= w; x += 8) q.lineTo(x, h * y0 + Math.sin(x * 0.03 + y0 * 9) * 12);
          q.lineTo(w, h);
          q.fill();
        }
      if (s >= 3)
        for (let i = 0; i < 9; i++) {
          const x = 15 + i * 28 + RR() * 8,
            y = h * 0.62 + RR() * 30;
          q.fillStyle = '#2f4426';
          q.beginPath();
          q.moveTo(x, y - 36);
          q.lineTo(x - 10, y);
          q.lineTo(x + 10, y);
          q.fill();
        }
      if (s >= 4) {
        q.fillStyle = 'rgba(255,240,200,0.85)';
        q.beginPath();
        q.arc(w * 0.75, h * 0.18, 18, 0, Math.PI * 2);
        q.fill();
      }
    } else if (m === 1) {
      // still life: a jug, two apples, a cloth
      q.strokeRect(w * 0.3, h * 0.35, w * 0.25, h * 0.35);
      if (s >= 1) {
        q.fillStyle = '#c9b48f';
        q.fillRect(0, 0, w, h * 0.62);
        q.fillStyle = '#8a6a48';
        q.fillRect(0, h * 0.62, w, h * 0.38);
      }
      if (s >= 2) {
        q.fillStyle = '#5d7fa3';
        q.beginPath();
        q.ellipse(w * 0.42, h * 0.55, w * 0.13, h * 0.17, 0, 0, Math.PI * 2);
        q.fill();
        q.fillRect(w * 0.35, h * 0.3, w * 0.14, h * 0.12);
      }
      if (s >= 3)
        for (const [x, c] of [
          [0.66, '#c0392b'],
          [0.78, '#d35400'],
        ]) {
          q.fillStyle = c;
          q.beginPath();
          q.arc(w * x, h * 0.66, w * 0.06, 0, Math.PI * 2);
          q.fill();
        }
      if (s >= 4) {
        q.fillStyle = 'rgba(255,255,255,0.7)';
        q.fillRect(w * 0.37, h * 0.45, 4, h * 0.12);
        q.fillStyle = 'rgba(240,235,225,0.9)';
        q.fillRect(0, h * 0.78, w * 0.55, h * 0.06);
      }
    } else {
      // abstract: fields of colour
      q.strokeRect(w * 0.1, h * 0.1, w * 0.8, h * 0.8);
      if (s >= 1) {
        q.fillStyle = '#e8e2d4';
        q.fillRect(0, 0, w, h);
      }
      if (s >= 2) {
        q.fillStyle = '#c0392b';
        q.fillRect(w * 0.1, h * 0.12, w * 0.5, h * 0.4);
      }
      if (s >= 3) {
        q.fillStyle = '#2d4f8c';
        q.fillRect(w * 0.45, h * 0.45, w * 0.42, h * 0.42);
      }
      if (s >= 4) {
        q.fillStyle = '#f3c43b';
        q.beginPath();
        q.arc(w * 0.3, h * 0.72, w * 0.12, 0, Math.PI * 2);
        q.fill();
      }
    }
    if (s >= 5) {
      q.fillStyle = '#2b2b2b';
      q.font = 'italic 14px serif';
      q.fillText('F. C.', w - 46, h - 12);
    }
  });
}
canvasPaint(AS.motif, AS.pic);
const PAINT_TIPS = [
  'Erst die großen Flächen dünn anlegen – von dunkel nach hell, von grob nach fein.',
  'Formen aus den Flächen herausholen: Halbe Augen zu, dann sieht man die Werte besser.',
  'Jetzt die Details – aber nicht überall: Das Auge braucht Ruhe.',
  'Zum Schluss die Lichter, pastos und sparsam.',
  'Fertig. Signieren, trocknen lassen – Öl braucht Wochen, Acryl nur Minuten.',
];
GACTS.push({
  key: 'malen',
  b,
  lx: EZ.x - 0.2,
  ly: EZ.y - 0.45,
  z: FZ + 1.2,
  r: 1.2,
  room: atelierIn,
  label: () => (AS.pic >= 5 ? 'Neues Bild beginnen' : 'Am Bild weitermalen'),
  run: st => {
    if (AS.pic >= 5) {
      AS.motif = (AS.motif + 1) % MOTIFS.length;
      AS.pic = 0;
      st.think('Neue Leinwand: ' + MOTIFS[AS.motif] + '. Erst mit Kohle die Komposition skizzieren.');
    } else {
      AS.pic++;
      st.think(PAINT_TIPS[AS.pic - 1]);
    }
    canvasPaint(AS.motif, AS.pic);
    keep();
    KERN.emit('einrichtung:bild', { motif: MOTIFS[AS.motif], step: AS.pic });
    st.dirty();
  },
});
// ---- the journal (key J): three small tasks as data (core/tasks.js) – they start the first time one comes into the atelier and advance
// on the atelier's own events ----
{
  const at = (x, y) => () => worldOf(b, x, y),
    start = { on: 'place', when: d => !!d && d.name === 'Atelier' };
  TASKS.define({
    id: 'atelier-toepfern',
    title: 'Töpfern: eine Schale drehen und brennen',
    who: 'Atelier',
    start,
    steps: [
      {
        text: 'An die Töpferscheibe setzen, eine Schale drehen und ins Regal stellen.',
        target: at(WH.x, WH.y),
        on: 'einrichtung:schale',
      },
      {
        text: 'Die Schalen trocknen lassen und im Brennofen brennen (Schrühbrand).',
        target: at(KI.x, KI.y),
        on: 'einrichtung:brand',
      },
    ],
    done: 'Die Schalen sind geschrüht – hell und hart, bereit zum Glasieren.',
  });
  TASKS.define({
    id: 'atelier-malen',
    title: 'Malen: ein Bild fertig malen',
    who: 'Atelier',
    start,
    steps: [
      {
        text: 'An der Staffelei weitermalen, bis das Bild fertig und signiert ist.',
        target: at(EZ.x, EZ.y),
        on: 'einrichtung:bild',
        when: d => !!d && d.step >= 5,
      },
    ],
    done: 'Fertig und signiert.',
  });
  TASKS.define({
    id: 'atelier-gaestebett',
    title: 'Ein Gästebett für Besuch',
    who: 'Atelier',
    start,
    steps: [
      {
        text: 'Das Klappsofa im Atelier zum Bett ausklappen.',
        target: at(0.9, SB.yc),
        on: 'einrichtung:sofa',
        when: d => !!d && d.bed === 1,
      },
    ],
    done: 'Das Gästebett steht, Bettzeug liegt darauf.',
  });
}
// ---- static parts: the room's furniture into the palette, no sun shadows indoors ----
paletteize(g, []);
bldEnd();
// the menu spot „Holzhaus“ is called „Atelier“ now (after game/player.js registered its spots), a spot inside and a start situation
// (?szenario=atelier – the tests start there)
whenLoaded(() => KERN.spot('holzhaus', { label: 'Atelier' }));
{
  const w = worldOfB(-0.85, 1.3);
  KERN.spot('atelier', { mode: 'walk', pos: w, z: FZ, yaw: b.az + 62, pitch: -10, bld: 'holzhaus', label: 'Atelier' });
  KERN.scenario('atelier', {
    label: 'Atelier (innen)',
    order: 14,
    run: () => window.GAME && window.GAME.go('atelier'),
  });
}
window.ATELIER = {
  house: ATELIER,
  sofa: SB,
  rock,
  potter,
  kiln,
  state: AS,
  setSofa(v) {
    SB.k = SB.want = v ? 1 : 0;
    AS.sofa = SB.k;
    sofaPose(SB.k);
    sofaCol[0] = AS.sofa ? 0.16 : 0.56;
    sofaCol[5] = FZ + (AS.sofa ? 0.5 : 0.9);
    if (LATE.rebuildGrids) LATE.rebuildGrids();
    keep();
    markDirty(true);
  },
};
