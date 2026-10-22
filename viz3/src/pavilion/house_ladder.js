// ############################ VARIANT B: no tower – ladder stairs, trapdoor, roof hatch, OG cantilevered on all sides ############################
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { VARIANT } from '../core/head.js';
import { B, beam, COL, cyl, flapDoor, PH, phase, PHN, siteUV, varOff, varOn, WALK } from '../core/geo.js';
import { MAT } from '../core/mats.js';
import {
  bandH,
  bandS,
  BV,
  CK,
  cutOps,
  DEP,
  DOORY,
  EG,
  EG_opsB,
  ESTUB,
  facade,
  glassRail,
  HT1,
  HT2,
  JW,
  LAD1,
  LAD2,
  ladderStair,
  OG,
  OG_opsB,
  OGB,
  PASS,
  PL,
  pvRail,
  rail,
  railLine,
  rectMinus,
  RF,
  RFB,
  SC,
  SD,
  sheath,
  SIDES,
  SR,
  studFrame,
  STV,
  SW,
  T,
  tR,
  tRB,
  TT,
  TW,
  WE,
  windowIn,
  WOB,
  zC,
  zD,
  zDb,
  zE,
  zF,
  zG,
  zJT,
  zK,
  zO,
  zOSB,
  zR,
  zRb,
  zRBb,
  zRIb,
  zRJb,
  zS,
  zSill,
  zStud0,
  zT0,
  zTH,
} from './house_base.js';
varOn('B');
// ======================= PHASE 4: front step =======================
phase(PHN.piles);
B(4.15, 4.65, DOORY[0] - 0.15, DOORY[1] + 0.15, 0, 0.15, MAT.stone, { walk: 'stone', bevel: 0.02 }); // sandstone step in front of the front door, under the cantilever
// ======================= PHASE 5-7: EG east wall with the front door and a small window =======================
phase(PHN.egFrame);
studFrame(WE, 'E', SD + 0.122, 4 - SD - 0.122, EG_opsB.E, zStud0, zE, [0.32, 3.68]);
phase(PHN.egOSB);
sheath(WE, 'E', 0, 4, EG_opsB.E, zSill, zE, { ins: false, board: false });
phase(PHN.egIns);
sheath(WE, 'E', 0, 4, EG_opsB.E, zSill, zE, { osb: false });
// ======================= PHASE 8-10: joists for the 5.8 × 5.8 m OG: cantilevers on all four sides; trapdoor framed by two east cantilever joists and a trimmer =======================
phase(PHN.joists);
{
  const oy = { grain: 'y', bevel: BV, col: false },
    ox = { grain: 'x', bevel: BV, col: false };
  B(3.175 - JW / 2, 3.175 + JW / 2, OGB.y0, HT1.y0 - JW, zE, zJT, MAT.kvh, oy);
  B(3.175 - JW / 2, 3.175 + JW / 2, HT1.y1 + JW, OGB.y1, zE, zJT, MAT.kvh, oy); // joist cut by the opening
  B(HT1.x0 - JW, HT1.x0, HT1.y0, HT1.y1, zE, zJT, MAT.kvh, oy); // trimmer west of the opening
  B(4.35 - JW / 2, 4.35 + JW / 2, OGB.y0, OGB.y1, zE, zJT, MAT.kvh, oy);
  B(OGB.x1 - JW, OGB.x1, OGB.y0, OGB.y1, zE, zJT, MAT.kvh, oy);
  B(OGB.x0, OGB.x1, OGB.y0, OGB.y0 + JW, zE, zJT, MAT.kvh, ox);
  B(OGB.x0, OGB.x1, OGB.y1 - JW, OGB.y1, zE, zJT, MAT.kvh, ox);
  for (const y of ESTUB) B(2.1, OGB.x1, y - JW / 2, y + JW / 2, zE, zJT, MAT.kvh, ox);
  phase(PHN.braces);
  for (const y of [0.32, 3.68])
    beam([3.89, y, 1.9], [OGB.x1 - 0.05, y, zE - 0.02], 0.12, 0.12, MAT.larch, { bevel: BV });
  phase(PHN.deck);
  for (const [x0, x1, y0, y1] of rectMinus([OGB.x0 + JW, OGB.x1 - JW, OGB.y0 + JW, OGB.y1 - JW], HT1)) {
    B(x0, x1, y0, y1, zJT, zJT + 0.024, MAT.ceilP, { col: false, cast: false, grain: 'x' });
    B(x0, x1, y0, y1, zJT + 0.024, zOSB, MAT.osb, { walk: 'wood', cast: false });
  }
}
// ======================= PHASE 11-14: OG walls 5.8 × 5.8 m, ring beam, roof joists BSH 12/28 (span 5.8 m) with the roof hatch trimmed out, boarding =======================
phase(PHN.ogFrame);
for (const s of SIDES) {
  const [a0, a1] = WOB.len(s);
  const r = WOB.sn(s) ? [a0, a1] : [a0 + SD + 0.122, a1 - SD - 0.122];
  WOB.wl(s, r[0], r[1], DEP.stud, zOSB, zOSB + SW, MAT.kvh, { grain: WOB.sn(s) ? 'x' : 'y', bevel: BV, col: false });
  studFrame(WOB, s, r[0], r[1], OG_opsB[s], zOSB + SW, zG, []);
}
phase(PHN.ogSheath);
for (const s of SIDES) {
  const [a0, a1] = WOB.len(s);
  sheath(WOB, s, a0, a1, OG_opsB[s], zOSB, zG);
}
phase(PHN.ring);
for (const s of SIDES) {
  const [a0, a1] = WOB.len(s);
  WOB.wl(s, WOB.sn(s) ? a0 : a0 + SD + 0.122, WOB.sn(s) ? a1 : a1 - SD - 0.122, DEP.stud, zG, zC, MAT.bsh, {
    grain: WOB.sn(s) ? 'x' : 'y',
    bevel: BV,
  });
}
{
  const JW2 = 0.12,
    jo = g => ({ grain: g, bevel: BV, col: false });
  for (let y = OGB.y0 + 0.3; y < OGB.y1; y += 0.5) {
    if (y > HT2.y0 && y < HT2.y1) {
      B(RFB.x0, HT2.x0 - JW2, y - JW2 / 2, y + JW2 / 2, zC, zRJb, MAT.bsh, jo('x'));
      B(HT2.x1 + JW2, RFB.x1, y - JW2 / 2, y + JW2 / 2, zC, zRJb, MAT.bsh, jo('x'));
    } else B(RFB.x0, RFB.x1, y - JW2 / 2, y + JW2 / 2, zC, zRJb, MAT.bsh, jo('x'));
  }
  B(HT2.x0 - JW2, HT2.x0, HT2.y0, HT2.y1, zC, zRJb, MAT.bsh, jo('y'));
  B(HT2.x1, HT2.x1 + JW2, HT2.y0, HT2.y1, zC, zRJb, MAT.bsh, jo('y')); // headers (Wechsel) of the roof hatch
  B(RFB.x0, RFB.x1, RFB.y0, RFB.y0 + JW2, zC, zRJb, MAT.kvh, jo('x'));
  B(RFB.x0, RFB.x1, RFB.y1 - JW2, RFB.y1, zC, zRJb, MAT.kvh, jo('x'));
  B(RFB.x0, RFB.x0 + JW2, RFB.y0, RFB.y1, zC, zRJb, MAT.kvh, jo('y'));
  B(RFB.x1 - JW2, RFB.x1, RFB.y0, RFB.y1, zC, zRJb, MAT.kvh, jo('y'));
  for (let x = OGB.x0 + 0.25; x < RFB.x1; x += 0.5) {
    B(x - JW2 / 2, x + JW2 / 2, RFB.y0, OGB.y0 + 0.2, zC, zRJb, MAT.kvh, jo('y'));
    B(x - JW2 / 2, x + JW2 / 2, OGB.y1 - 0.2, RFB.y1, zC, zRJb, MAT.kvh, jo('y'));
  }
}
const RPB = rectMinus([RFB.x0, RFB.x1, RFB.y0, RFB.y1], HT2);
phase(PHN.roofBoard);
for (const [x0, x1, y0, y1] of RPB) B(x0, x1, y0, y1, zRJb, zRBb, MAT.ceilP, { walk: 'wood', cast: false, grain: 'x' });
// ======================= PHASE 15-17: roof insulation, sealing, hatch curb, fascia, chimney collar =======================
phase(PHN.roofIns);
for (const [x0, x1, y0, y1] of RPB) {
  B(x0 + 0.01, x1 - 0.01, y0 + 0.01, y1 - 0.01, zRBb, zRBb + 0.002, MAT.foil, { col: false, cast: false });
  B(x0, x1, y0, y1, zRBb + 0.002, zRIb, MAT.hfdBoard, { walk: 'wood', cast: false });
}
phase(PHN.roofSeal);
for (const [x0, x1, y0, y1] of RPB) {
  B(x0, x1, y0, y1, zRIb, zRb, MAT.osb, { walk: 'wood', cast: false });
  B(x0 + 0.005, x1 - 0.005, y0 + 0.005, y1 - 0.005, zRb, zRb + 0.004, MAT.epdm, { walk: 'wood', cast: false });
}
// hatch curb (Aufsatzkranz) 6 cm larch, EPDM taken up the outside, steel cap; inside the shaft a larch lining from the ceiling to the curb top
for (const [x0, x1, y0, y1] of [
  [CK.x0, CK.x1, CK.y0, HT2.y0],
  [CK.x0, CK.x1, HT2.y1, CK.y1],
  [CK.x0, HT2.x0, HT2.y0, HT2.y1],
  [HT2.x1, CK.x1, HT2.y0, HT2.y1],
]) {
  B(x0, x1, y0, y1, zRb, zK - 0.012, MAT.larch, { col: false });
  B(x0 - 0.004, x1 + 0.004, y0 - 0.004, y1 + 0.004, zK - 0.012, zK, MAT.fascia, { walk: 'wood' });
}
for (const [x0, x1, y0, y1] of [
  [CK.x0 - 0.004, CK.x1 + 0.004, CK.y0 - 0.004, CK.y0],
  [CK.x0 - 0.004, CK.x1 + 0.004, CK.y1, CK.y1 + 0.004],
  [CK.x0 - 0.004, CK.x0, CK.y0, CK.y1],
  [CK.x1, CK.x1 + 0.004, CK.y0, CK.y1],
])
  B(x0, x1, y0, y1, zRb, zK - 0.03, MAT.epdm, { col: false, cast: false });
for (const [x0, x1, y0, y1] of [
  [HT2.x0, HT2.x0 + 0.02, HT2.y0, HT2.y1],
  [HT2.x1 - 0.02, HT2.x1, HT2.y0, HT2.y1],
  [HT2.x0, HT2.x1, HT2.y0, HT2.y0 + 0.02],
  [HT2.x0, HT2.x1, HT2.y1 - 0.02, HT2.y1],
])
  B(x0, x1, y0, y1, zC, zK - 0.012, MAT.larchIn, { col: false, cast: false });
{
  const f = { col: false },
    e = 0.025,
    zt = zRb + 0.06;
  for (const [x0, x1, y0, y1] of [
    [RFB.x0 - e, RFB.x1 + e, RFB.y0 - e, RFB.y0],
    [RFB.x0 - e, RFB.x1 + e, RFB.y1, RFB.y1 + e],
    [RFB.x0 - e, RFB.x0, RFB.y0, RFB.y1],
    [RFB.x1, RFB.x1 + e, RFB.y0, RFB.y1],
  ]) {
    B(x0, x1, y0, y1, zC, zt, MAT.fascia, f);
    COL.push([x0 - 0.01, x1 + 0.01, y0 - 0.01, y1 + 0.01, zC, zt, 'edge', PH, null]);
  }
}
phase(PHN.chimney);
cyl(STV[0], STV[1], zRb, zRb + 0.16, 0.2, MAT.steel, 28, undefined, { col: false });
beam([STV[0], STV[1], 8.0], [0.2, 4.2, zDb], 0.02, 0.02, MAT.steel);
// ======================= PHASE 18/19: windows, roof hatch lid =======================
phase(PHN.windows);
windowIn(WE, 'E', 1.9, 2.5, 0.75, 2.15, {});
windowIn(WOB, 'W', 0.0, 4.0, zO, zG, { mull: [1.0, 2.0, 3.0], sill: false, trans: [zG - 0.42] });
windowIn(WOB, 'N', 0.0, 4.0, bandS, bandH, { mull: [1.0, 2.0, 3.0] });
windowIn(WOB, 'S', 0.0, 4.0, bandS, bandH, { mull: [1.0, 2.0, 3.0] });
windowIn(WOB, 'E', 0.0, 2.0, bandS, bandH, { mull: [1.0] });
phase(PHN.doors);
// glazed roof hatch: insulated lid (larch frame, triple glazing) hinged on the east side of the curb, opens to ~100° and rests there (gas struts)
{
  const w = CK.x1 - CK.x0 + 0.04,
    l = CK.y1 - CK.y0 + 0.04,
    fw = 0.07,
    th = 0.06,
    g = new THREE.Group();
  const part = (x0, x1, z0, z1, y0, y1, m) => {
    const geo = new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 1, 0.006);
    siteUV(geo, 0, 0, 0, 'x');
    const me = new THREE.Mesh(geo, m);
    me.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    me.castShadow = true;
    me.receiveShadow = true;
    g.add(me);
    return me;
  };
  // local frame: X = site x (lid spans -w..0 west of the hinge), Y = up, Z = -site y (lid spans -l..0 north of the south end)
  part(-w, -w + fw, -l, 0, 0, th, MAT.frame);
  part(-fw, 0, -l, 0, 0, th, MAT.frame);
  part(-w + fw, -fw, -fw, 0, 0, th, MAT.frame);
  part(-w + fw, -fw, -l, -l + fw, 0, th, MAT.frame);
  {
    const gl = new THREE.Mesh(new THREE.BoxGeometry(w - 2 * fw, 0.024, l - 2 * fw), MAT.glass);
    gl.position.set(-w / 2, th * 0.6, -l / 2);
    gl.renderOrder = 2;
    g.add(gl);
  }
  part(-w + 0.01, -w + 0.03, -l / 2 - 0.12, -l / 2 + 0.12, -0.05, 0, MAT.blacksteel); // pull handle under the free edge
  const hx = CK.x1 + 0.02,
    hy = CK.y0 - 0.02;
  flapDoor('roofhatch', g, {
    hx,
    hy,
    z: zK,
    rot: 'z',
    open: -0.55 * Math.PI,
    pos: [(HT2.x0 + HT2.x1) / 2, HT2.y1 + 0.25],
    label: 'Dachluke',
    openBox: [hx - 0.04, hx + 0.2, hy, hy + l, zK, zK + w],
  });
  WALK.push([hx - w, hx, hy, hy + l, zK + th, 'wood', PH, null, 'roofhatch']);
}
// ======================= PHASE 20/21: battens and cladding all round (EG east wall, OG 5.8 × 5.8 m), steel bands =======================
for (const ph of [PHN.battens, PHN.cladding]) {
  phase(ph);
  const part = ph === PHN.battens ? 'lat' : 'clad';
  facade(WE, 'E', 0, 4, EG_opsB.E, zS + 0.12, zE, part);
  for (const s of SIDES) {
    const [a0, a1] = WOB.len(s);
    facade(WOB, s, a0, a1, OG_opsB[s], zOSB, zG, part);
  }
}
for (const s of SIDES) {
  const [a0, a1] = WOB.len(s);
  WOB.wl(s, a0 - 0.03, a1 + 0.03, [-0.03, 0.09], zE - 0.02, zJT + 0.03, MAT.fascia, { col: false });
  WOB.wl(s, a0 - 0.03, a1 + 0.03, [-0.03, 0.09], zG - 0.05, zC + 0.02, MAT.fascia, { col: false });
}
for (const [x0, x1, y0, y1] of [
  [OGB.x0 - 0.03, OGB.x1 + 0.03, OGB.y0 - 0.03, OGB.y0 + 0.1],
  [OGB.x0 - 0.03, OGB.x1 + 0.03, OGB.y1 - 0.1, OGB.y1 + 0.03],
  [OGB.x0 - 0.03, OGB.x0 + 0.1, OGB.y0, OGB.y1],
  [OGB.x1 - 0.1, OGB.x1 + 0.03, OGB.y0, OGB.y1],
])
  B(x0, x1, y0, y1, zE - 0.03, zE, MAT.fascia, { col: false, cast: false });
// ======================= PHASE 22: ladder stair library → work room, trapdoor (lid hinged on the north edge, usually open), guard rails W and E =======================
phase(PHN.stairA);
ladderStair(LAD1);
{
  const w = HT1.x1 - HT1.x0 - 0.04,
    l = HT1.y1 - HT1.y0 - 0.04,
    g = new THREE.Group();
  // local frame: X = site x (0..w), Y = up (lid -0.04..0, top flush with the floor), Z = -site y (0..l, i.e. southward from the hinge)
  {
    const geo = new RoundedBoxGeometry(w, 0.04, l, 1, 0.004);
    siteUV(geo, 0, 0, 0, 'y');
    const me = new THREE.Mesh(geo, MAT.floorP);
    me.position.set(w / 2, -0.02, l / 2);
    me.castShadow = true;
    me.receiveShadow = true;
    g.add(me);
  }
  for (const x of [0.06, w - 0.06]) {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.03, l - 0.1, 1, 0.004), MAT.oakF);
    b.position.set(x, -0.055, l / 2);
    b.castShadow = true;
    g.add(b);
  } // battens under the lid
  {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16), MAT.blacksteel);
    r.rotation.x = Math.PI / 2;
    r.position.set(w / 2, 0.003, l - 0.07);
    g.add(r);
  } // ring pull
  flapDoor('hatch', g, {
    hx: HT1.x0 + 0.02,
    hy: HT1.y1 - 0.02,
    z: zO,
    rot: 'x',
    open: -0.53 * Math.PI,
    pos: [(HT1.x0 + HT1.x1) / 2, HT1.y0 - 0.25],
    label: 'Bodenluke',
    openBox: [HT1.x0, HT1.x1, HT1.y1 - 0.04, HT1.y1 + 0.16, zO, zO + l],
  });
  WALK.push([HT1.x0, HT1.x1, HT1.y0, HT1.y1, zO, 'wood', PH, null, 'hatch']);
} // closed: the whole opening is floor again
railLine([HT1.x0, HT1.y0 + 0.02], [HT1.x0, HT1.y1 + 0.02], zO);
railLine([HT1.x1, HT1.y0 + 0.02], [HT1.x1, HT1.y1 + 0.02], zO);
// ======================= PHASE 23: ladder stair work room → roof hatch =======================
phase(PHN.stairB);
ladderStair(LAD2);
// ======================= PHASE 24/25: terrace deck around the hatch, railings, guard rails S and W of the hatch (exit to the north, lid on the east) =======================
phase(PHN.terrace);
{
  const CO = { x0: CK.x0 - 0.03, x1: CK.x1 + 0.03, y0: CK.y0 - 0.03, y1: CK.y1 + 0.03 },
    dk = { t: MAT.deck, def: MAT.larch };
  for (let y = RFB.y0 + 0.35; y < RFB.y1 - 0.3; y += 0.6)
    for (const [x0, x1, y0, y1] of rectMinus([RFB.x0 + 0.3, RFB.x1 - 0.3, y - 0.03, y + 0.03], CO))
      B(x0, x1, y0, y1, zRb + 0.004, zDb - 0.028, MAT.blacksteel, { col: false, cast: false });
  for (const [x0, x1, y0, y1] of rectMinus([RFB.x0 + 0.3, RFB.x1 - 0.3, RFB.y0 + 0.3, RFB.y1 - 0.3], CO))
    B(x0, x1, y0, y1, zDb - 0.028, zDb, dk, { walk: 'wood', grain: 'x' });
}
phase(PHN.railings);
rail([tRB.x1, tRB.y0], [tRB.x1, tRB.y1], zDb, 1.08);
rail([tRB.x0, tRB.y1], [tRB.x1, tRB.y1], zDb, 1.08);
glassRail(tRB, zRb, zDb);
pvRail(tRB, zRb, zDb);
rail([CK.x0 - 0.06, CK.y0 - 0.06], [CK.x1 + 0.03, CK.y0 - 0.06], zDb, 1.08);
rail([CK.x0 - 0.06, CK.y0 - 0.06], [CK.x0 - 0.06, CK.y1 + 0.02], zDb, 1.08);
// ======================= PHASE 26/27: OG floor (oak) with the trapdoor opening and its oak lining, clay plaster =======================
phase(PHN.floors);
for (const [x0, x1, y0, y1] of rectMinus([OGB.x0 + T, OGB.x1 - T, OGB.y0 + T, OGB.y1 - T], HT1))
  B(x0, x1, y0, y1, zOSB, zO, MAT.floorP, { walk: 'wood', cast: false, grain: 'y' });
for (const [x0, x1, y0, y1] of [
  [HT1.x0, HT1.x0 + 0.02, HT1.y0, HT1.y1],
  [HT1.x1 - 0.02, HT1.x1, HT1.y0, HT1.y1],
  [HT1.x0, HT1.x1, HT1.y0, HT1.y0 + 0.02],
  [HT1.x0, HT1.x1, HT1.y1 - 0.02, HT1.y1],
])
  B(x0, x1, y0, y1, zE, zO - 0.045, MAT.oakF, { col: false, cast: false });
phase(PHN.plaster);
for (const [a0, a1, q0, q1] of cutOps(0, 4, zF, zE, EG_opsB.E))
  WE.wl('E', a0, a1, DEP.clay, q0, q1, MAT.clay, { col: false, grain: 'z' });
for (const s of SIDES) {
  const [b0, b1] = WOB.len(s);
  for (const [a0, a1, q0, q1] of cutOps(b0, b1, zO, zG, OG_opsB[s]))
    WOB.wl(s, a0, a1, DEP.clay, q0, q1, MAT.clay, { col: false, grain: 'z' });
}
varOff();

// ---- geometry per variant for the rest of the app (walking labels, sound, viewpoints); window.GEO is updated in place when the variant changes ----
const ladderInfo = L => ({
  x0: L.x0,
  x1: L.x1,
  y0: Math.min(L.yFoot, L.yTop),
  y1: Math.max(L.yFoot, L.yTop),
  z0: L.z0,
  z1: L.z1,
  n: L.n,
  rise: L.rise,
  go: L.go,
  dir: L.dir,
});
export const GEO_A = {
  variant: 'A',
  zS,
  zF,
  zE,
  zU: zO,
  zO,
  zOSB,
  zG,
  zC,
  zR,
  zD,
  zTH,
  zT0,
  T,
  TT,
  EG,
  OG,
  TW,
  RF,
  SC,
  SR,
  PASS,
  DOORY,
  STV,
  tR,
  PL,
};
export const GEO_B = Object.assign({}, GEO_A, {
  variant: 'B',
  zR: zRb,
  zD: zDb,
  zK,
  OG: OGB,
  RF: RFB,
  tR: tRB,
  TW: { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 },
  HT1,
  HT2,
  CK,
  LAD1: ladderInfo(LAD1),
  LAD2: ladderInfo(LAD2),
});
window.GEO_A = GEO_A;
window.GEO_B = GEO_B;
window.GEO = Object.assign({}, VARIANT === 'A' ? GEO_A : GEO_B);
