// ===================== feat/einrichtung (Falko, 23.10.2026): interior styles of the bungalow and the caravan =====================
// The atelier registers its styles itself (garden/atelier.js); here the two other buildings with interiors. Every style sets the colours
// and images of the building's own materials (garden/bungalow.js BW + the kit's bungalow-only ones, garden/carport.js CW) and builds its
// furnishing layer: in the bungalow the sofa with cushions and blanket, the coffee table with tea, a lamp shade around the bare bulb,
// plants and what the style brings (sheepskin, plates and a clock, a metal shelf, macramé and a string of lights …); in the caravan
// curtains, cushions, a cloth on the table, flowers, a rug, a quilt. „Wie heute“ is the furnishing as it was before.
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { MAT } from '../core/mats.js';
import { cyl } from '../core/geo.js';
import { gB, MATS } from './site_base.js';
import {
  canvasTex,
  curtain,
  GACTS,
  GSEATS,
  KM,
  mug,
  paintColor,
  put,
  soft,
  teapot,
  twin,
  useMaps,
} from './garten_kit.js';
import { CV, CW } from './carport.js';
import { BUNG, BW } from './bungalow.js';
import { sofaSound } from './atelier.js';
import {
  coffeeTable,
  cushions,
  hangingPlant,
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
const MAPS = { larch: MAT.larchIn, oak: MAT.oak, paint: MATS.greenBoards, conc: MAT.conc, oakF: MAT.oakF };
function surf(m, [set, col, rough]) {
  if (MAPS[set]) useMaps(m, MAPS[set]);
  paintColor(m, col);
  m.roughness = rough ?? m.userData.rough0 ?? m.roughness;
}
const pal = (c, r = 0.6) => new THREE.MeshStandardMaterial({ color: c, roughness: r });
// ===================== the bungalow =====================
const B = BUNG,
  BACC = twin(KM.red);
const BSTYLES = [
  {
    id: 'heute',
    name: 'Wie heute',
    note: 'Datsche wie sie ist: Kiefernholzdecke, Dielen, rote Karos, flaschengrüner Sessel, Flickenteppich',
    sw: [0xf6efe2, 0x55705a, 0xb8352c],
    acc: 1,
    wall: 0xf6efe2,
    ceil: 0xd9b98c,
    floor: ['oakF', 0xc49a70],
    wood: ['oak', 0xffffff],
    velvet: 0x55705a,
    sofa: [0xd07b55],
    cush: 0x93a084,
    throw: 0xfff6ea,
    rug: 0xf0e2c8,
    curRed: ['check', [0xb8352c, 0xf6f3ec, 8]],
    curSage: 0x93a084,
    curLinen: 0xf1ebdc,
    duvet: ['check', [0x5b7ea3, 0xf6f3ec, 10]],
    runner: ['rag', [0x8a3b32, 0xc9b48a, 0x3e5b7a, 0xd8cdb8, 0x6f7f4f, 0xb0643e, 0xe6dccb, 0x5a4a6a, 0xa8c0c8]],
    art: ['hills', 'flowers', 'botanical', 'garden'],
    sofaKind: 'box',
    table: 'oak',
  },
  {
    id: 'skandi',
    name: 'Skandinavisch hell',
    note: 'Weiß, helles Holz, Grau und Taubenblau, Leinen, Schaffell, Papierlampe, Pflanzen in weißen Töpfen',
    sw: [0xf7f6f2, 0xc9c9c5, 0x8ea3b8],
    acc: 4,
    wall: 0xf8f7f3,
    ceil: 0xf1eee8,
    floor: ['paint', 0xe4e0d7],
    wood: ['larch', 0xfff3e2],
    velvet: 0xb7c2c8,
    sofa: [0xc9c9c5],
    cush: 0x8ea3b8,
    throw: 0xf2f0ea,
    rug: 0xe9e6df,
    curRed: ['plain', [0xf2f0ea]],
    curSage: 0xe8e5de,
    curLinen: 0xf6f4ef,
    duvet: ['stripes', [0xf4f2ee, 0xdfe3e6, 0xf4f2ee, 0x9fb0bd]],
    runner: ['stripes', [0xf2f0ea, 0xd9d6cf, 0xf2f0ea, 0x9aa3a8]],
    art: ['lines', 'botanical', ['abstract', ['#f2efe8', '#8ea3b8', '#3a3a3a', '#d9c7a0']], 'grid'],
    sofaKind: 'slim',
    table: 'round',
    shade: 'globe',
    plants: [['trailing', -2.25, 0.62, 0.4, () => B.zf + 0.95]],
    hang: [[-0.95, 2.12, 0.55]],
    skin: true,
  },
  {
    id: 'landhaus',
    name: 'Landhaus',
    note: 'Cremeweiß, Honigeiche, Salbeigrün und Rot kariert, Faltenschirm, Teller an der Wand, Uhr, Trockenblumen',
    sw: [0xf1e6cf, 0x9aa889, 0xb0502e],
    acc: 1,
    wall: 0xf2e7cf,
    ceil: 0xd9b98c,
    floor: ['oak', 0xcfa982],
    wood: ['oak', 0xf2d2a6],
    velvet: 0x8f3f34,
    sofa: [0x9aa889],
    cush: 0xb0502e,
    throw: 0xe2cfa8,
    rug: 0xd9c3a0,
    curRed: ['check', [0xa8322a, 0xf6f1e4, 6]],
    curSage: 0x9aa889,
    curLinen: 0xf3ead6,
    duvet: ['patch', [0xb0502e, 0xe8dcc0, 0x7d93a8, 0x9aa889, 0xd9b36a]],
    runner: ['rag', [0x9c4a36, 0xd8c3a0, 0x5d6f86, 0xe6dccb, 0x7f8a5a]],
    art: ['flowers', 'hills', 'portrait', ['botanical', ['#f0e6d0', '#5a6e3a']]],
    sofaKind: 'skirt',
    table: 'trunk',
    shade: 'pleat',
    plants: [
      ['herb', -1.15, 2.32, 0.36, () => 1.0],
      ['herb', -0.75, 2.32, 0.36, () => 1.0],
    ],
    country: true,
  },
  {
    id: 'loft',
    name: 'Industrie/Loft',
    note: 'Grau, dunkel gebeiztes Holz, Beton, Cognac-Leder, Gitterlampe, Metallregal, Poster',
    sw: [0x8a8781, 0x8a5530, 0x2b2b2b],
    acc: 3,
    wall: 0xa3a09a,
    ceil: 0x4a423a,
    floor: ['conc', 0xcfcac2],
    wood: ['larch', 0x54473c],
    velvet: 0x3e3d3b,
    sofa: [0x8a5530, 0.55],
    cush: 0x4b4b4b,
    throw: 0x77736c,
    rug: 0x5a5650,
    curRed: ['plain', [0x55575a]],
    curSage: 0x5f6062,
    curLinen: 0xcfccc6,
    duvet: ['plain', [0x5a6068]],
    runner: ['plain', [0x3a3a3a]],
    art: [
      'abstract',
      'grid',
      ['lines', ['#2b2b2b', '#e8e4dc']],
      ['portrait', ['#9a958d', '#2b2b2b', '#c9b49a', '#5a3b2a']],
    ],
    sofaKind: 'chester',
    table: 'crate',
    shade: 'cage',
    plants: [['cactus', 0.62, -1.3, 0.3, () => B.zf + 0.752]],
    loft: true,
  },
  {
    id: 'boho',
    name: 'Boho',
    note: 'Sand und Terrakotta, Senf und Rost, Kelim, Tagesbett mit vielen Kissen, Rattanlampe, Makramee, Lichterkette, Pflanzen',
    sw: [0xe8d2b0, 0xc99a3a, 0xb0502e],
    acc: 7,
    wall: 0xead5b4,
    ceil: 0xd9b98c,
    floor: ['oakF', 0xe2c09a],
    wood: ['oak', 0xffffff],
    velvet: 0xc99a3a,
    sofa: [0xb0502e],
    cush: 0xc99a3a,
    throw: 0x2b6070,
    rug: 0xe9cfa8,
    curRed: ['stripes', [0xc99a3a, 0xf3e6cc, 0xb0502e, 0xf3e6cc]],
    curSage: 0xc98a64,
    curLinen: 0xf3e6cc,
    duvet: ['kilim', [0xb0502e, 0xe9cfa8, 0x2b6070, 0xc99a2e]],
    runner: ['kilim', [0xb0502e, 0xe9cfa8, 0x2b6070, 0xc99a2e]],
    art: [
      'sun',
      ['abstract', ['#e9cfa8', '#b0502e', '#5a3550', '#c99a2e']],
      ['flowers', ['#e9cfa8', '#2b6070', '#b0502e', '#f3c43b']],
      ['hills', ['#f2c48f', '#d9a36a', '#b0502e', '#7a4a2a']],
    ],
    sofaKind: 'daybed',
    table: 'low',
    shade: 'rattan',
    plants: [['trailing', -2.25, 0.62, 0.4, () => B.zf + 0.95]],
    hang: [
      [-0.95, 2.12, 0.55],
      [-1.95, 1.15, 0.7],
      [1.25, -2.05, 0.6],
    ],
    boho: true,
  },
];
function bApply(h) {
  const s = BSTYLES.find(q => q.id === h.cur);
  KM.wall.color.set(s.wall);
  paintColor(KM.ceil, s.ceil);
  surf(KM.floor, s.floor);
  surf(BW.wood, s.wood);
  KM.velvet.color.set(s.velvet);
  BW.sofa.color.set(s.sofa[0]);
  BW.sofa.roughness = s.sofa[1] ?? BW.sofa.userData.rough0;
  BW.cush.color.set(s.cush);
  BW.throw.color.set(s.throw);
  BW.rug.color.set(s.rug);
  paint(KM.curtainRed.map, s.curRed[0], s.curRed[1]);
  KM.curtainSage.color.set(s.curSage);
  KM.curtainLinen.color.set(s.curLinen);
  paint(KM.duvet.map, s.duvet[0], s.duvet[1]);
  paint(KM.rag.map, s.runner[0], s.runner[1]);
  paintArt(KM.art.map, s.art);
}
// the sofa in the living corner (against the west wall: back at y = sy1, facing −y; seat top at ss) – one kind per style
function bSofa(L, kind, h) {
  const { sx0, sx1, sy0, sy1, ss, zf } = B,
    xm = (sx0 + sx1) / 2;
  if (kind === 'box') {
    // as it stood before: low wooden feet, base, two seat cushions, back, arms, cushions, a folded blanket
    for (const [x, y] of [
      [sx0 + 0.06, sy0 + 0.06],
      [sx1 - 0.06, sy0 + 0.06],
      [sx0 + 0.06, sy1 - 0.06],
      [sx1 - 0.06, sy1 - 0.06],
    ])
      cyl(x, y, zf, zf + 0.09, 0.022, BW.wood, 8, 0.016, { parent: L, col: false });
    soft(L, sx0 + 0.02, sx1 - 0.02, sy0, sy1, zf + 0.08, zf + 0.24, 0.04, BW.sofa);
    soft(L, sx0 + 0.18, xm - 0.005, sy0 + 0.02, sy1 - 0.22, zf + 0.22, ss, 0.05, BW.sofa, { puff: 0.015 });
    soft(L, xm + 0.005, sx1 - 0.18, sy0 + 0.02, sy1 - 0.22, zf + 0.22, ss, 0.05, BW.sofa, { puff: 0.015 });
    soft(L, sx0 + 0.18, sx1 - 0.18, sy1 - 0.26, sy1 - 0.02, zf + 0.22, zf + 0.8, 0.07, BW.sofa);
    for (const [a0, a1] of [
      [sx0, sx0 + 0.18],
      [sx1 - 0.18, sx1],
    ])
      soft(L, a0, a1, sy0, sy1, zf + 0.1, zf + 0.6, 0.06, BW.sofa);
    soft(L, sx0 + 0.24, sx0 + 0.66, sy1 - 0.38, sy1 - 0.2, ss - 0.02, ss + 0.36, 0.07, BW.cush, { ry: 0.25 });
    soft(L, sx1 - 0.62, sx1 - 0.22, sy1 - 0.36, sy1 - 0.2, ss - 0.02, ss + 0.33, 0.07, KM.cream, { ry: -0.3 });
    soft(L, sx1 - 0.75, sx1 - 0.2, sy0 + 0.05, sy1 - 0.25, ss, ss + 0.06, 0.025, BW.throw);
    soft(L, sx1 - 0.7, sx1 - 0.25, sy1 - 0.18, sy1 - 0.02, zf + 0.62, zf + 0.84, 0.03, BW.throw);
    return;
  }
  if (kind === 'slim') {
    // Scandinavian: a light wooden frame on tapered legs, slim cushions, a straight back
    for (const [x, y] of [
      [sx0 + 0.1, sy0 + 0.08],
      [sx1 - 0.1, sy0 + 0.08],
      [sx0 + 0.1, sy1 - 0.08],
      [sx1 - 0.1, sy1 - 0.08],
    ])
      cyl(x, y, zf, zf + 0.2, 0.014, BW.wood, 8, 0.022, { parent: L, col: false });
    gB(L, sx0 + 0.06, sx1 - 0.06, sy0 + 0.02, sy1 - 0.02, zf + 0.2, zf + 0.26, BW.wood, { cast: false });
    soft(L, sx0 + 0.1, xm - 0.005, sy0 + 0.04, sy1 - 0.2, zf + 0.26, ss, 0.04, BW.sofa, { puff: 0.01 });
    soft(L, xm + 0.005, sx1 - 0.1, sy0 + 0.04, sy1 - 0.2, zf + 0.26, ss, 0.04, BW.sofa, { puff: 0.01 });
    soft(L, sx0 + 0.08, sx1 - 0.08, sy1 - 0.2, sy1 - 0.04, zf + 0.26, zf + 0.82, 0.05, BW.sofa);
    for (const x of [sx0 + 0.04, sx1 - 0.04])
      gB(L, x - 0.025, x + 0.025, sy0 + 0.06, sy1 - 0.04, zf + 0.26, zf + 0.58, BW.wood, { cast: false });
    cushions(
      L,
      [
        [sx0 + 0.5, sy1 - 0.28, 0.44, 0.15],
        [sx1 - 0.55, sy1 - 0.28, 0.42, -0.2],
      ],
      ss - 0.02,
      [BW.cush, BACC],
      h.R
    );
    soft(L, sx1 - 0.65, sx1 - 0.15, sy0 + 0.06, sy1 - 0.24, ss, ss + 0.04, 0.02, BW.throw);
    return;
  }
  if (kind === 'chester') {
    // leather, rolled arms, a buttoned back, on a dark plinth
    gB(L, sx0 + 0.02, sx1 - 0.02, sy0 + 0.02, sy1 - 0.02, zf, zf + 0.1, BW.wood, { cast: false });
    soft(L, sx0 + 0.04, sx1 - 0.04, sy0, sy1, zf + 0.1, zf + 0.28, 0.05, BW.sofa);
    soft(L, sx0 + 0.2, xm - 0.005, sy0 + 0.02, sy1 - 0.24, zf + 0.26, ss, 0.05, BW.sofa, { puff: 0.02 });
    soft(L, xm + 0.005, sx1 - 0.2, sy0 + 0.02, sy1 - 0.24, zf + 0.26, ss, 0.05, BW.sofa, { puff: 0.02 });
    soft(L, sx0 + 0.04, sx1 - 0.04, sy1 - 0.26, sy1, zf + 0.26, zf + 0.78, 0.08, BW.sofa);
    for (const x of [sx0 + 0.11, sx1 - 0.11]) {
      soft(L, x - 0.11, x + 0.11, sy0, sy1 - 0.1, zf + 0.26, zf + 0.62, 0.07, BW.sofa);
      put(
        L,
        new THREE.CylinderGeometry(0.11, 0.11, sy1 - sy0 - 0.12, 16),
        BW.sofa,
        x,
        (sy0 + sy1 - 0.1) / 2,
        zf + 0.64,
        {
          rx: Math.PI / 2,
          cast: false,
        }
      );
    }
    for (let i = 0; i < 8; i++)
      for (let k = 0; k < 2; k++)
        put(
          L,
          new THREE.SphereGeometry(0.012, 6, 5),
          MAT.black,
          sx0 + 0.32 + i * ((sx1 - sx0 - 0.64) / 7),
          sy1 - 0.265,
          zf + 0.55 + k * 0.14,
          { cast: false }
        );
    cushions(L, [[sx0 + 0.55, sy1 - 0.34, 0.4, 0.1]], ss - 0.02, [BACC], h.R);
    return;
  }
  if (kind === 'skirt') {
    // country: a skirt down to the floor, rolled arms, many cushions, a blanket
    soft(L, sx0 + 0.02, sx1 - 0.02, sy0, sy1, zf, zf + 0.26, 0.03, BW.sofa);
    soft(L, sx0 + 0.18, xm - 0.005, sy0 + 0.02, sy1 - 0.22, zf + 0.24, ss, 0.05, BW.sofa, { puff: 0.02 });
    soft(L, xm + 0.005, sx1 - 0.18, sy0 + 0.02, sy1 - 0.22, zf + 0.24, ss, 0.05, BW.sofa, { puff: 0.02 });
    soft(L, sx0 + 0.16, sx1 - 0.16, sy1 - 0.24, sy1 - 0.02, zf + 0.24, zf + 0.84, 0.09, BW.sofa, { puff: 0.02 });
    for (const x of [sx0 + 0.09, sx1 - 0.09]) {
      soft(L, x - 0.09, x + 0.09, sy0, sy1, zf + 0.1, zf + 0.56, 0.05, BW.sofa);
      put(L, new THREE.CylinderGeometry(0.1, 0.1, sy1 - sy0, 16), BW.sofa, x, (sy0 + sy1) / 2, zf + 0.58, {
        rx: Math.PI / 2,
        cast: false,
      });
    }
    cushions(
      L,
      [
        [sx0 + 0.42, sy1 - 0.3, 0.4, 0.2],
        [sx0 + 0.82, sy1 - 0.3, 0.36, -0.1],
        [sx1 - 0.78, sy1 - 0.3, 0.36, 0.15],
        [sx1 - 0.42, sy1 - 0.3, 0.4, -0.2],
      ],
      ss - 0.02,
      [BW.cush, KM.cream, BACC, BW.cush],
      h.R
    );
    soft(L, sx1 - 0.8, sx1 - 0.2, sy0 + 0.04, sy1 - 0.24, ss, ss + 0.05, 0.02, BW.throw);
    return;
  }
  // 'daybed': a low wooden frame with a mattress, a kilim throw, many cushions against the wall
  for (const [x, y] of [
    [sx0 + 0.05, sy0 + 0.05],
    [sx1 - 0.05, sy0 + 0.05],
    [sx0 + 0.05, sy1 - 0.05],
    [sx1 - 0.05, sy1 - 0.05],
  ])
    gB(L, x - 0.03, x + 0.03, y - 0.03, y + 0.03, zf, zf + 0.2, BW.wood, { cast: false });
  gB(L, sx0, sx1, sy0, sy1, zf + 0.2, zf + 0.26, BW.wood, { cast: false });
  soft(L, sx0 + 0.02, sx1 - 0.02, sy0 + 0.02, sy1 - 0.02, zf + 0.26, ss, 0.05, BW.sofa, { puff: 0.015 });
  soft(L, sx0 + 0.1, sx1 - 0.6, sy0 + 0.02, sy1 - 0.02, ss, ss + 0.02, 0.01, KM.rag, { cast: false });
  cushions(
    L,
    [
      [sx0 + 0.3, sy1 - 0.12, 0.5, 0.1],
      [sx0 + 0.75, sy1 - 0.12, 0.46, -0.15],
      [xm + 0.15, sy1 - 0.12, 0.5, 0.05],
      [sx1 - 0.55, sy1 - 0.12, 0.44, 0.2],
      [sx1 - 0.2, sy1 - 0.12, 0.36, -0.1],
      [sx0 + 0.55, sy1 - 0.3, 0.32, 0.3],
      [sx1 - 0.4, sy1 - 0.3, 0.32, -0.3],
    ],
    ss - 0.02,
    [BW.cush, BACC, BW.throw, KM.cream, BW.cush, BACC, KM.rag],
    h.R
  );
}
function bTable(L, kind) {
  const zf = B.zf,
    x = -1.27,
    y = 1.1;
  if (kind === 'oak') {
    gB(L, -1.62, -0.92, 0.86, 1.34, zf + 0.39, zf + 0.42, BW.wood, { bevel: 0.006 });
    for (const [lx, ly] of [
      [-1.58, 0.9],
      [-0.96, 0.9],
      [-1.58, 1.3],
      [-0.96, 1.3],
    ])
      gB(L, lx - 0.018, lx + 0.018, ly - 0.018, ly + 0.018, zf, zf + 0.39, BW.wood, { grain: 'z', cast: false });
    teapot(L, -1.35, 1.05, zf + 0.42, KM.porcelain, 200);
    mug(L, -1.12, 1.2, zf + 0.42, KM.enamelGreen, 110);
    mug(L, -1.5, 1.22, zf + 0.42, KM.porcelain, 30);
    gB(L, -1.2, -0.99, 0.92, 1.08, zf + 0.42, zf + 0.445, MAT.rust, { cast: false });
    return;
  }
  let top = zf + 0.42;
  if (kind === 'round') coffeeTable(L, x, y, zf, 0.62, 0.62, 0.42, pal(0xf2f0ea, 0.4), BW.wood, true);
  else if (kind === 'trunk') {
    gB(L, x - 0.36, x + 0.36, y - 0.22, y + 0.22, zf, zf + 0.4, BW.wood, { bevel: 0.01 });
    for (const dx of [-0.3, 0.3])
      gB(L, x + dx - 0.02, x + dx + 0.02, y - 0.225, y + 0.225, zf + 0.04, zf + 0.38, MAT.blacksteel, { cast: false });
    top = zf + 0.4;
  } else if (kind === 'crate') {
    gB(L, x - 0.36, x + 0.36, y - 0.24, y + 0.24, zf + 0.38, zf + 0.42, BW.wood, { cast: false });
    for (const [dx, dy] of [
      [-0.33, -0.21],
      [0.33, -0.21],
      [-0.33, 0.21],
      [0.33, 0.21],
    ])
      gB(L, x + dx - 0.015, x + dx + 0.015, y + dy - 0.015, y + dy + 0.015, zf, zf + 0.38, MAT.blacksteel, {
        cast: false,
      });
    gB(L, x - 0.34, x + 0.34, y - 0.22, y + 0.22, zf + 0.1, zf + 0.12, MAT.blacksteel, { cast: false });
  } else {
    put(L, new THREE.CylinderGeometry(0.34, 0.34, 0.03, 24), pal(0xb08d57, 0.35), x, y, zf + 0.3, { cast: false });
    put(L, new THREE.CylinderGeometry(0.2, 0.26, 0.28, 16), KM.straw, x, y, zf + 0.14, { cast: false });
    top = zf + 0.315;
  }
  teapot(L, x - 0.08, y - 0.05, top, KM.porcelain, 200);
  mug(L, x + 0.15, y + 0.08, top, BACC, 110);
  vessel(L, 'vase', x + 0.12, y - 0.1, top, 0.04, 0.16, BACC);
}
function bBuild(L, h) {
  const s = BSTYLES.find(q => q.id === h.cur),
    { zf, bulb } = B;
  bSofa(L, s.sofaKind, h);
  bTable(L, s.table);
  if (s.shade)
    shadeAround(
      L,
      s.shade,
      bulb[0],
      bulb[1],
      bulb[2],
      s.shade === 'globe'
        ? BPAPER
        : pal(s.shade === 'pleat' ? 0xefe3c8 : s.shade === 'rattan' ? 0xc8a46a : 0x2b2b2b, 0.7)
    );
  const potM = s.id === 'skandi' ? pal(0xf4f2ee) : s.id === 'loft' ? MAT.blacksteel : KM.terracotta;
  for (const [kind, x, y, size, zz] of s.plants || []) pottedPlant(L, x, y, zz ? zz() : zf, size, kind, potM, h.R);
  for (const [x, y, len] of s.hang || []) hangingPlant(L, x, y, B.zw, len, 0.42, potM, h.R);
  // the reading chair (annex): a sheepskin; a throw in the accent colour
  if (s.skin) sheepskin(L, 0.62, B.AY0 + 0.5, zf + 0.44, 0.4, 0.5, 0.3);
  if (s.country) {
    // plates on the wall over the sofa, a wall clock, a jug of dried flowers on the dining table
    // plates west of the sofa window, a wall clock on the front wall between the door and the kitchen window
    for (let i = 0; i < 3; i++) {
      const x = -2.18 + i * 0.29,
        z = 1.55 + (i === 1 ? 0.13 : 0);
      put(L, new THREE.CylinderGeometry(0.11, 0.11, 0.012, 22), pal(0xf3efe6, 0.3), x, B.yi1 - 0.01, z, {
        rx: Math.PI / 2,
        cast: false,
      });
      put(L, new THREE.TorusGeometry(0.085, 0.006, 4, 22), pal(0x2f4f8a, 0.3), x, B.yi1 - 0.018, z, { cast: false });
    }
    const cx = B.xi1 - 0.02,
      cy = 0.78,
      cz = 1.9;
    put(L, new THREE.CylinderGeometry(0.13, 0.13, 0.04, 24), BW.wood, cx, cy, cz, { rz: Math.PI / 2, cast: false });
    put(L, new THREE.CylinderGeometry(0.11, 0.11, 0.01, 24), pal(0xf3efe6, 0.4), cx - 0.022, cy, cz, {
      rz: Math.PI / 2,
      cast: false,
    });
    gB(L, cx - 0.032, cx - 0.027, cy - 0.005, cy + 0.005, cz, cz + 0.08, MAT.black, { cast: false });
    gB(L, cx - 0.032, cx - 0.027, cy - 0.06, cy, cz - 0.005, cz + 0.005, MAT.black, { cast: false });
    vessel(L, 'jug', 0.95, -1.62, zf + 0.752, 0.06, 0.17, pal(0x3f6e9a, 0.3));
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      put(
        L,
        new THREE.SphereGeometry(0.02, 6, 5),
        [KM.yellow, KM.straw, KM.red][k % 3],
        0.95 + Math.cos(a) * 0.06,
        -1.62 + Math.sin(a) * 0.06,
        zf + 1.05,
        { cast: false }
      );
    }
  }
  if (s.loft) {
    // a black arc lamp behind the sofa's south end (its dome over the seat), a bottle on the radio
    const lx = B.xi0 + 0.2,
      ly = 1.42;
    put(L, new THREE.CylinderGeometry(0.15, 0.15, 0.03, 20), MAT.blacksteel, lx, ly, zf + 0.015, { cast: false });
    put(L, new THREE.CylinderGeometry(0.012, 0.012, 1.55, 8), MAT.blacksteel, lx, ly, zf + 0.79, { cast: false });
    const arc = new THREE.TorusGeometry(0.45, 0.01, 6, 20, Math.PI / 2);
    put(L, arc, MAT.blacksteel, lx + 0.45, ly, zf + 1.56, { rz: Math.PI / 2, cast: false });
    put(
      L,
      new THREE.SphereGeometry(0.16, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      MAT.blacksteel,
      lx + 0.45,
      ly,
      zf + 1.86,
      {
        cast: false,
      }
    );
    vessel(L, 'bottle', B.xi0 + 0.18, 1.15, zf + 0.95, 0.04, 0.22, BACC);
  }
  if (s.boho) {
    macrame(L, 'x', -1.95, B.yi1 - 0.04, 1.95, 0.42, 0.55);
    stringLights(L, [-2.3, B.yi1 - 0.04, 1.98], [-0.35, B.yi1 - 0.04, 1.98], 16, pal(0xffe2a8, 0.4));
    pouf(L, -0.55, 0.8, zf, 0.24, BW.throw);
    pouf(L, -1.3, 0.52, zf, 0.2, BACC);
  }
}
const BPAPER = twin(KM.curtainLinen);
STIL.house('bungalow', {
  label: 'Bungalow',
  anchor: B.anchor,
  inside: B.inside,
  M: { acc: BACC },
  styles: BSTYLES.map(s => Object.assign({}, s, { apply: bApply, build: bBuild })),
  def: 'heute',
});
// ===================== the caravan =====================
const CACC = twin(KM.red),
  CCUR = twin(KM.curtainRed),
  CQUILT = twin(KM.rag);
CCUR.map = canvasTex(128, 128, [1 / 0.12, 1 / 0.12]);
CQUILT.map = canvasTex(256, 256, [1 / 0.9, 1 / 0.9]);
const CSTYLES = [
  {
    id: 'heute',
    name: 'Wie heute (80er)',
    note: 'Lärchenholz, salbeigrüne Polster, Wolldecke – wie er im Carport steht',
    sw: [0xd2ab7a, 0x93a084, 0x9a8f82],
    acc: 7,
    wood: ['larch', 0xffffff],
    wood2: ['oak', 0xffffff],
    fab: 0x93a084,
    bedA: 0x9a8f82,
    bedB: 0xfff6ea,
    sheet: 0xf4eee4,
    floor: ['oakF', 0xc49a70],
    liner: 0xf4f1e8,
  },
  {
    id: 'retro',
    name: 'Retro 70er',
    note: 'Dunkle Eiche, Orange und Braun, Streifenvorhänge, Häkeldecke, Kunstblumen',
    sw: [0x8a6a48, 0xc0702a, 0x6b4a2a],
    acc: 0,
    wood: ['oak', 0xb08860],
    wood2: ['oak', 0x9a7450],
    fab: 0xc0702a,
    bedA: 0x7a5a3a,
    bedB: 0xf0dcc0,
    sheet: 0xf0e2c8,
    floor: ['paint', 0x9a8a62],
    liner: 0xf0e2c0,
    curtains: ['stripes', [0xc0702a, 0x6b4a2a, 0xd9a03a, 0xf0e2c0]],
    quilt: ['patch', [0xc0702a, 0xd9a03a, 0x6b4a2a, 0xf0e2c0]],
    cush: [0x6b4a2a, 0xd9a03a],
    shade: ['dome', 0xd9782a],
  },
  {
    id: 'skandi',
    name: 'Skandinavisch hell',
    note: 'Weiß lackierte Schränke, helles Holz, Leinen, Grau und Taubenblau',
    sw: [0xf2f0ea, 0xc8c8c4, 0x8ea3b8],
    acc: 4,
    wood: ['paint', 0xf0eee8],
    wood2: ['larch', 0xfff4e4],
    fab: 0xc8c8c4,
    bedA: 0xd9d6cf,
    bedB: 0xf6f4ef,
    sheet: 0xf8f6f1,
    floor: ['paint', 0xe0dcd3],
    liner: 0xf7f6f2,
    curtains: ['plain', [0xf2f0ea]],
    quilt: ['stripes', [0xf4f2ee, 0xdfe3e6, 0xf4f2ee, 0x9fb0bd]],
    cush: [0x8ea3b8, 0xf2f0ea],
    plant: true,
    shade: ['globe', null],
  },
  {
    id: 'landhaus',
    name: 'Landhaus',
    note: 'Cremeweiß lackiert, Eiche, Salbeigrün, rot karierte Vorhänge, Patchwork-Decke, Blumen',
    sw: [0xe9e2cf, 0x9aa889, 0xb0502e],
    acc: 1,
    wood: ['paint', 0xe9e2cf],
    wood2: ['oak', 0xf0cfa5],
    fab: 0x9aa889,
    bedA: 0xe2cfa8,
    bedB: 0xf6f1e4,
    sheet: 0xf6f1e4,
    floor: ['oak', 0xcfa982],
    liner: 0xf2e9d4,
    curtains: ['check', [0xa8322a, 0xf6f1e4, 6]],
    quilt: ['patch', [0xb0502e, 0xe8dcc0, 0x7d93a8, 0x9aa889, 0xd9b36a]],
    cush: [0xb0502e, 0xf3ead6],
    flowers: true,
    shade: ['pleat', 0xefe3c8],
  },
  {
    id: 'boho',
    name: 'Boho',
    note: 'Helles Holz, Senf und Rost, Kelim, Makramee, Lichterkette, Pflanzen',
    sw: [0xf0d2a8, 0xc99a3a, 0xb0502e],
    acc: 7,
    wood: ['larch', 0xf6dcb8],
    wood2: ['larch', 0xe8c49a],
    fab: 0xc99a3a,
    bedA: 0x2b6070,
    bedB: 0xf3e6cc,
    sheet: 0xf3e6cc,
    floor: ['oakF', 0xe2c09a],
    liner: 0xf1e2c8,
    curtains: ['stripes', [0xc99a3a, 0xf3e6cc, 0xb0502e, 0xf3e6cc]],
    quilt: ['kilim', [0xb0502e, 0xe9cfa8, 0x2b6070, 0xc99a2e]],
    cush: [0xb0502e, 0x2b6070],
    plant: true,
    boho: true,
    shade: ['rattan', 0xc8a46a],
  },
];
function cApply(h) {
  const s = CSTYLES.find(q => q.id === h.cur);
  surf(CW.wood, s.wood);
  surf(CW.wood2, s.wood2);
  CW.fab.color.set(s.fab);
  CW.bedA.color.set(s.bedA);
  CW.bedB.color.set(s.bedB);
  CW.sheet.color.set(s.sheet);
  surf(CW.floor, s.floor);
  MATS.liner.color.set(s.liner);
  if (s.curtains) paint(CCUR.map, s.curtains[0], s.curtains[1]);
  if (s.quilt) paint(CQUILT.map, s.quilt[0], s.quilt[1]);
}
function cBuild(L, h) {
  const s = CSTYLES.find(q => q.id === h.cur),
    zf = CV.zf,
    HW = 1.065;
  if (s.id === 'heute') return;
  // curtains gathered at both sides of every side window, a rod over each
  for (const [sy, x0, x1, z0, z1] of CV.windows || []) {
    const t = sy * (HW - 0.03),
      dir = sy > 0 ? '-y' : '+y';
    curtain(L, 'x', x0 - 0.1, x0 + 0.1, t, z0 - 0.04, z1 + 0.05, CCUR, dir, 3, 0.02);
    curtain(L, 'x', x1 - 0.1, x1 + 0.1, t, z0 - 0.04, z1 + 0.05, CCUR, dir, 3, 0.02);
    gB(L, x0 - 0.12, x1 + 0.12, t - 0.008, t + 0.008, z1 + 0.06, z1 + 0.075, MAT.brass, { cast: false });
  }
  // the quilt on the bed, cushions on the dinette, a cloth on the table, a rug in the aisle
  soft(L, -2.42, -1.16, -1.0, 0.52, zf + 0.65, zf + 0.68, 0.01, CQUILT, { cast: false });
  const c = s.cush || [0xb0502e, 0xf3ead6];
  cushions(
    L,
    [
      [2.2, 0.6, 0.36, 0.1],
      [2.2, -0.62, 0.36, -0.15],
      [2.2, 0.0, 0.34, 0.05],
    ],
    zf + 0.5,
    [CACC, pal(c[0], 0.9), pal(c[1], 0.9)],
    h.R,
    'y'
  );
  gB(L, 1.5, 1.92, -0.43, 0.43, zf + 0.72, zf + 0.725, s.id === 'landhaus' ? CCUR : pal(c[1], 0.9), { cast: false });
  gB(L, -0.55, 1.2, -0.32, 0.32, zf, zf + 0.008, CQUILT, { cast: false });
  if (s.flowers || s.plant) {
    vessel(L, 'jug', 1.75, 0.2, zf + 0.725, 0.05, 0.15, CACC);
    for (let k = 0; k < 7; k++) {
      const a = (k / 7) * Math.PI * 2;
      put(
        L,
        new THREE.SphereGeometry(0.02, 6, 5),
        [KM.yellow, KM.red, KM.cream][k % 3],
        1.75 + Math.cos(a) * 0.05,
        0.2 + Math.sin(a) * 0.05,
        zf + 1.0,
        { cast: false }
      );
    }
  }
  // a pendant over the dinette table, its shade after the style (decor: the caravan's light is the dome in the middle)
  if (s.shade) {
    const [kind, col] = s.shade,
      zb = 2.2;
    put(L, new THREE.CylinderGeometry(0.004, 0.004, 2.53 - zb - 0.06, 5), KM.cord, 1.68, 0, (2.53 + zb + 0.06) / 2, {
      cast: false,
    });
    put(L, new THREE.CylinderGeometry(0.018, 0.02, 0.06, 10), KM.bakelite, 1.68, 0, zb + 0.06, { cast: false });
    put(L, new THREE.SphereGeometry(0.03, 10, 8), KM.porcelain, 1.68, 0, zb, { cast: false });
    shadeAround(L, kind, 1.68, 0, zb, kind === 'globe' ? BPAPER : pal(col, 0.6));
  }
  if (s.plant)
    pottedPlant(L, -0.3, 0.85, zf + 0.65, 0.35, 'trailing', s.id === 'skandi' ? pal(0xf4f2ee) : KM.terracotta, h.R);
  if (s.boho) stringLights(L, [1.4, 1.04, 1.92], [2.3, 1.04, 1.92], 8, pal(0xffe2a8, 0.4));
}
STIL.house('wohnwagen', {
  label: 'Wohnwagen',
  anchor: CV.anchor,
  inside: CV.inside,
  M: { acc: CACC },
  styles: CSTYLES.map(s => Object.assign({}, s, { apply: cApply, build: cBuild })),
  def: 'heute',
});
// ---- the dinette becomes a bed (Falko: the sofa bed „auch im Wohnwagen“): the table goes down onto the benches, two cushions close the gap ----
{
  const zf = CV.zf,
    sv = STIL.x('wohnwagen'),
    S = { k: sv && sv.bed === 1 ? 1 : 0, want: 0, anim: false, lanY: null };
  S.want = S.k;
  const lantern = () => (window.GLB_PLACED || []).find(it => it.type === 'lantern_t' && it.bld === 'carport');
  function pose(k) {
    const e = k * k * (3 - 2 * k);
    CV.table.position.y = -0.26 * e;
    CV.leg.scale.y = 1 - 0.38 * e;
    CV.fill.visible = k > 0.98;
    const it = lantern();
    if (it && it.root) {
      if (S.lanY === null) S.lanY = it.root.position.y;
      it.root.position.y = S.lanY - 0.26 * e;
    }
    CV.bed = k > 0.5 ? 1 : 0;
  }
  function settle() {
    const c = CV.tableCol;
    if (c) {
      c[4] = zf + (S.k > 0.5 ? 0 : 0.25);
      c[5] = zf + (S.k > 0.5 ? 0.5 : 0.72);
    }
    if (LATE.rebuildGrids) LATE.rebuildGrids();
  }
  pose(S.k);
  settle();
  GACTS.push({
    key: 'sitzecke-bett',
    b: CV.b,
    lx: CV.cvx + 1.15,
    ly: CV.cvy,
    z: zf + 0.6,
    r: 1.4,
    room: CV.inside,
    label: () => (S.anim ? null : S.k > 0.5 ? 'Bett wieder zur Sitzecke' : 'Tisch absenken – Bett bauen'),
    run: st => {
      S.want = S.k > 0.5 ? 0 : 1;
      S.anim = true;
      st.sound(sofaSound);
      if (S.want)
        st.think(
          'Tischbein einklappen, Platte auf die Leisten der Bänke legen, Rückenpolster drauf – fertig ist das Bett für zwei.'
        );
    },
    tick: (dt, st) => {
      const it = S.lanY === null && S.k > 0 ? lantern() : null;
      if (it && it.root) pose(S.k);
      if (!S.anim) return !!(it && it.root);
      S.k = S.k + Math.sign(S.want - S.k) * Math.min(Math.abs(S.want - S.k), dt / 1.2);
      pose(S.k);
      if (S.k === S.want) {
        S.anim = false;
        settle();
        STIL.x('wohnwagen', { bed: S.want });
        st.dirty();
      }
      return true;
    },
  });
  GSEATS.push({
    key: 'wohnwagen-gaestebett',
    b: CV.b,
    lx: CV.cvx + 1.95,
    ly: CV.cvy + 0.7,
    eye: zf + 0.5 + 0.3,
    yaw: 90,
    pitch: 2,
    kind: 'lie',
    label: () => (S.k > 0.98 && !S.anim ? 'Hinlegen' : null),
    at: [CV.cvx + 1.0, CV.cvy],
    r: 1.5,
  });
  window.WOHNWAGEN = { dinette: S, pose, settle };
}
