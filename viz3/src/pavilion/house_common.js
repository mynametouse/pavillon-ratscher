// ############################ COMMON: slab, EG walls S/N/W, EG floor, stove ############################
// ======================= PHASE 0/1: existing slab with the tin garage, then cleared =======================
phase(PHN.bestand);
B(-0.15, 4.15, -0.15, 4.15, 0, zS, MAT.conc, { walk: 'stone' });
phase(PHN.bestand, PHN.garage);
{
  const gm = MAT.metal,
    rm = MAT.roofGrey;
  for (const [x0, x1, y0, y1] of [
    [0.02, 3.98, 3.9, 3.98],
    [0.02, 0.1, 0.02, 3.98],
    [3.9, 3.98, 0.02, 3.98],
    [0.02, 0.6, 0.02, 0.1],
    [3.4, 3.98, 0.02, 0.1],
  ])
    B(x0, x1, y0, y1, zS, zS + 2.1, gm, { grain: 'z' });
  B(0.6, 3.4, 0.03, 0.09, zS, zS + 2.1, MAT.galv, { grain: 'x' }); // closed tilt door
  for (let x = 0.3; x < 3.9; x += 0.5)
    B(x - 0.015, x + 0.015, 0.1, 3.9, zS + 2.1, zS + 2.18, MAT.galv, { col: false, cast: false, grain: 'y' });
  B(-0.08, 4.08, -0.08, 4.08, zS + 2.18, zS + 2.22, rm, { col: false });
}
// ======================= PHASE 2/3: sealing, sill plates, anchors =======================
phase(PHN.abdicht);
B(0.0, 4.0, 0.0, 4.0, zS, zSill, MAT.bitumen, { col: false, cast: false });
phase(PHN.schwellen);
for (const s of SIDES) {
  const r = WE.sn(s) ? [0, 4] : [SD + 0.122, 4 - SD - 0.122];
  WE.wl(s, r[0], r[1], DEP.stud, zSill, zStud0, MAT.kvh, { grain: WE.sn(s) ? 'x' : 'y', bevel: BV, col: false });
  for (let a = 0.35; a < 3.9; a += 0.8)
    WE.wl(s, a - 0.02, a + 0.02, [0.17, 0.21], zStud0, zStud0 + 0.012, MAT.galv, { col: false });
  for (const a of [0.12, 3.88])
    WE.wl(s, a - 0.045, a + 0.045, [0.262, 0.27], zSill, zSill + 0.26, MAT.galv, { col: false, cast: false });
}
// ======================= PHASE 5-7: EG stud frame, sheathing, insulation (east wall per variant) =======================
phase(PHN.egFrame);
studFrame(WE, 'S', 0, 4, EG_ops.S, zStud0, zE, [0.28, 2.5]);
studFrame(WE, 'N', 0, 4, EG_ops.N, zStud0, zE, [0.6, 3.4]);
studFrame(WE, 'W', SD + 0.122, 4 - SD - 0.122, EG_ops.W, zStud0, zE, [0.32, 3.0]);
phase(PHN.egOSB);
for (const s of SNW) sheath(WE, s, 0, 4, EG_ops[s], zSill, zE, { ins: false, board: false });
phase(PHN.egIns);
for (const s of SNW) sheath(WE, s, 0, 4, EG_ops[s], zSill, zE, { osb: false });
// ======================= PHASE 8/9: floor joists over the EG (shared part), braces S/N/W, hold-downs =======================
phase(PHN.joists);
{
  const oy = { grain: 'y', bevel: BV, col: false },
    ox = { grain: 'x', bevel: BV, col: false };
  for (let x = 0.05; x <= 3.96; x += 0.625) {
    const xx = Math.min(x, 3.95);
    if (Math.abs(xx - 3.175) < 0.01) continue;
    B(xx - JW / 2, xx + JW / 2, OG.y0, OG.y1, zE, zJT, MAT.kvh, oy);
  }
  B(OG.x0, OG.x0 + JW, OG.y0, OG.y1, zE, zJT, MAT.kvh, oy);
  for (let y = 0.45; y < 3.9; y += 0.625) B(OG.x0, 1.9, y - JW / 2, y + JW / 2, zE, zJT, MAT.kvh, ox);
  phase(PHN.braces);
  for (const [p, q] of [
    [
      [0.28, 0.11, 1.9],
      [0.28, OG.y0 + 0.05, zE - 0.02],
    ],
    [
      [2.5, 0.11, 1.9],
      [2.5, OG.y0 + 0.05, zE - 0.02],
    ],
    [
      [0.6, 3.89, 1.9],
      [0.6, OG.y1 - 0.05, zE - 0.02],
    ],
    [
      [3.4, 3.89, 1.9],
      [3.4, OG.y1 - 0.05, zE - 0.02],
    ],
    [
      [0.11, 0.32, 1.9],
      [OG.x0 + 0.05, 0.32, zE - 0.02],
    ],
    [
      [0.11, 3.0, 1.9],
      [OG.x0 + 0.05, 3.0, zE - 0.02],
    ],
  ])
    beam(p, q, 0.12, 0.12, MAT.larch, { bevel: BV });
  for (const [x, y] of [
    [0.3, 0.3],
    [3.7, 0.3],
    [0.3, 3.7],
    [3.7, 3.7],
  ])
    B(x - 0.03, x + 0.03, y - 0.03, y + 0.03, zE - 0.6, zJT + 0.3, MAT.galv, { col: false, cast: false });
}
// ======================= PHASE 17: chimney (through either roof) + rain chain =======================
phase(PHN.chimney);
cyl(STV[0], STV[1], zE - 0.2, 8.8, 0.1, MAT.steel, 28, undefined, { col: false });
COL.push([STV[0] - 0.11, STV[0] + 0.11, STV[1] - 0.11, STV[1] + 0.11, zE - 0.2, 9, 'chimney', PH, null]);
{
  const c = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.2, 28), MAT.steel);
  c.position.copy(V(STV[0], STV[1], 8.95));
  c.castShadow = true;
  tagPh(c);
  scene.add(c);
  cyl(STV[0], STV[1], 8.8, 8.87, 0.11, MAT.black, 20, undefined, { col: false });
}
{
  const x = RF.x0 + 0.12,
    y = RF.y0 + 0.12;
  for (let z = 0.3; z < zC; z += 0.11) {
    const r = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 14), MAT.brass);
    r.position.copy(V(x, y, z));
    r.rotation.y = ((Math.round(z / 0.11) % 2) * Math.PI) / 2;
    r.castShadow = true;
    tagPh(r);
    scene.add(r);
  }
  cyl(x, y, 0, 0.1, 0.34, MAT.stone, 28, 0.36);
}
// ======================= PHASE 18/19: EG windows, library door (A: from the tower, B: front door – same opening, opens outwards) =======================
phase(PHN.windows);
windowIn(WE, 'S', 0.45, 2.25, 0.75, 2.15, { mull: [1.35] });
windowIn(WE, 'S', 2.75, 3.65, 0.75, 2.15, {});
windowIn(WE, 'W', 0.6, 2.5, 0.75, 2.15, { mull: [1.55] });
windowIn(WE, 'E', DOORY[0], DOORY[1], zF, 2.4, { door: true, open: true, sill: false });
phase(PHN.doors);
hingeDoor('eg', boardLeaf(0.86, 2.06, { glass: [0.2, 0.12, 0.3, 1.6] }), {
  hx: EG.x1 - 0.04,
  hy: DOORY[1] - 0.02,
  a: [0, -1],
  w: 0.86,
  sign: 1,
  z0: zF,
  z1: zF + 2.06,
});
B(EG.x1 - T, EG.x1, DOORY[0], DOORY[1], zF - 0.02, zF, MAT.slate, { walk: 'stone' });
// ======================= PHASE 20/21: EG facade S/N/W, plinth band =======================
for (const ph of [PHN.battens, PHN.cladding]) {
  phase(ph);
  const part = ph === PHN.battens ? 'lat' : 'clad';
  for (const s of SNW) facade(WE, s, 0, 4, EG_ops[s], zS + 0.12, zE, part);
}
B(-0.02, 4.02, -0.02, 4.02, zS, zS + 0.12, MAT.fascia, { col: false });
// ======================= PHASE 26-28: EG floor, clay plaster S/N/W, stove pipe =======================
phase(PHN.floors);
for (let x = 0.4; x < 3.7; x += 0.5)
  B(x - 0.04, x + 0.04, T, 4 - T, zSill, zSill + 0.12, MAT.kvh, { col: false, cast: false, grain: 'y' });
B(T, 4 - T, T, 4 - T, zSill, zSill + 0.12, MAT.xps, { col: false, cast: false });
B(T, 4 - T, T, 4 - T, zSill + 0.12, zF - 0.02, MAT.osb, { col: false, cast: false });
B(T, 4 - T, T, 4 - T, zF - 0.02, zF, MAT.floorP, { walk: 'wood', grain: 'y', cast: false });
phase(PHN.plaster);
for (const s of SNW)
  for (const [a0, a1, q0, q1] of cutOps(0, 4, zF, zE, EG_ops[s]))
    WE.wl(s, a0, a1, DEP.clay, q0, q1, MAT.clay, { col: false, grain: 'z' });
phase(PHN.stove);
cyl(0.55, 3.45, zE - 0.5, zO, 0.065, MAT.galv, 16, undefined, { col: false });
B(0.42, 0.68, 3.32, 3.58, zE - 0.6, zE - 0.5, MAT.black, { col: false });
B(0.4, 0.7, 3.3, 3.6, zO, zO + 0.008, MAT.blacksteel, { col: false, cast: false });
B(2.3, 2.6, 1.05, 1.35, zO, zO + 0.008, MAT.blacksteel, { col: false, cast: false });
