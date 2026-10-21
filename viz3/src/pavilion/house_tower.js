// ############################ VARIANT A: stair tower ############################
varOn('A');
phase(PHN.garage);
B(TW.x1, TW.x1 + 0.55, DOORY[0] - 0.12, DOORY[1] + 0.12, 0, 0.15, MAT.stone, { walk: 'stone', bevel: 0.02 });   // step in front of the tower door
// ======================= PHASE 4: screw piles for the tower =======================
phase(PHN.piles);
// six screw piles under the tower walls (east row + the middle of the south and north walls; the west side sits on the edge of the slab), one under the spiral column
const PILES = [[TW.x1 - 0.14, TW.y0 + 0.14], [TW.x1 - 0.14, 2.0], [TW.x1 - 0.14, TW.y1 - 0.14], [5.3, TW.y0 + 0.14], [5.3, TW.y1 - 0.14], [SC[0], SC[1]]];
for (const [x, y] of PILES) { cyl(x, y, -0.6, 0.2, 0.038, MAT.galv, 12, undefined, { col: false }); B(x - 0.08, x + 0.08, y - 0.08, y + 0.08, 0.2, 0.215, MAT.galv, { col: false }); }
B(TW.x1 - 0.2, TW.x1 - 0.08, TW.y0 + 0.08, TW.y1 - 0.08, 0.215, 0.335, MAT.larch, { grain: 'y', bevel: BV, col: false });
B(TW.x0 + 0.02, TW.x1 - 0.08, TW.y0 + 0.08, TW.y0 + 0.2, 0.215, 0.335, MAT.larch, { grain: 'x', bevel: BV, col: false }); B(TW.x0 + 0.02, TW.x1 - 0.08, TW.y1 - 0.2, TW.y1 - 0.08, 0.215, 0.335, MAT.larch, { grain: 'x', bevel: BV, col: false });
B(TW.x0 + 0.02, TW.x0 + 0.14, TW.y0 + 0.2, TW.y1 - 0.2, zS, zS + 0.12, MAT.larch, { grain: 'y', bevel: BV, col: false });   // west sill on the edge of the slab
B(TW.x0, TW.x1 - TT, TW.y0 + TT, TW.y1 - TT, 0.2, zT0, MAT.stone, { walk: 'stone', cast: false, grain: 'x' });                   // tower floor: concrete pavers on chippings
B(SC[0] - 0.2, SC[0] + 0.2, SC[1] - 0.2, SC[1] + 0.2, zT0, zT0 + 0.015, MAT.blacksteel, { col: false });                      // column base plate
// ======================= PHASE 5-7: EG east wall (door into the tower) =======================
phase(PHN.egFrame); studFrame(WE, 'E', SD + 0.122, 4 - SD - 0.122, EG_ops.E, zStud0, zE, [0.32, 3.68]);
phase(PHN.egOSB); sheath(WE, 'E', 0, 4, EG_ops.E, zSill, zE, { ins: false, board: false });
phase(PHN.egIns); sheath(WE, 'E', 0, 4, EG_ops.E, zSill, zE, { osb: false });
// ======================= PHASE 8-10: rest of the floor joists, tower posts, deck =======================
phase(PHN.joists);
{ const oy = { grain: 'y', bevel: BV, col: false }, ox = { grain: 'x', bevel: BV, col: false };
  B(3.175 - JW / 2, 3.175 + JW / 2, OG.y0, OG.y1, zE, zJT, MAT.kvh, oy); B(OG.x1 - JW, OG.x1, OG.y0, OG.y1, zE, zJT, MAT.kvh, oy);
  B(OG.x0, OG.x1, OG.y0, OG.y0 + JW, zE, zJT, MAT.kvh, ox); B(OG.x0, OG.x1, OG.y1 - JW, OG.y1, zE, zJT, MAT.kvh, ox);
  phase(PHN.braces);
  // tower corner posts 12/12 (larch) from the sill to the head, and the steel column of the spiral
  for (const [x, y] of [[TW.x1 - 0.14, TW.y0 + 0.14], [TW.x1 - 0.14, TW.y1 - 0.14], [TW.x0 + 0.08, TW.y0 + 0.14], [TW.x0 + 0.08, TW.y1 - 0.14], [TW.x1 - 0.14, 2.0]]) B(x - 0.06, x + 0.06, y - 0.06, y + 0.06, 0.335, zTH - 0.12, MAT.larch, { grain: 'z', bevel: BV, col: false });
  cyl(SC[0], SC[1], zT0, zD + 1.05, SCR, MAT.blacksteel, 28);
  phase(PHN.joists);
  // OG landing in the tower: joists 10/24 spanning north–south between the passage beam and the north wall
  B(TW.x0, TW.x1 - TT, PASS.y0 - JW, PASS.y0, zE, zJT, MAT.kvh, ox);
  for (let x = TW.x0 + 0.1; x < TW.x1 - TT; x += 0.5) B(x - JW / 2, x + JW / 2, PASS.y0, PASS.y1, zE, zJT, MAT.kvh, oy);
  phase(PHN.deck);
  B(OG.x0 + JW, OG.x1 - JW, OG.y0 + JW, OG.y1 - JW, zJT, zJT + 0.024, MAT.ceilP, { col: false, cast: false, grain: 'x' });
  B(OG.x0 + JW, OG.x1 - JW, OG.y0 + JW, OG.y1 - JW, zJT + 0.024, zOSB, MAT.osb, { walk: 'wood', cast: false }); }
// ======================= PHASE 11-14: OG walls, tower walls, ring beam, roof joists, roof boarding =======================
phase(PHN.ogFrame);
{ const z0 = zOSB;
  for (const s of SIDES) { const [a0, a1] = WO.len(s); const r = WO.sn(s) ? [a0, a1] : [a0 + SD + 0.122, a1 - SD - 0.122];
    WO.wl(s, r[0], r[1], DEP.stud, z0, z0 + SW, MAT.kvh, { grain: WO.sn(s) ? 'x' : 'y', bevel: BV, col: false });
    studFrame(WO, s, r[0], r[1], OG_ops[s], z0 + SW, zG, []); }
  for (const s of ['E', 'S', 'N']) { const r = twRange(s); for (const [q0, q1] of TW_SEG) studFrame(WT, s, r[0], r[1], TW_ops[s], q0, q1, [], 0.06); }
  { const r = twRange('W'); studFrame(WT, 'W', r[0], r[1], TW_ops.W, zR, zTH, [], 0.06); }
  phase(PHN.ogSheath);
  for (const s of SIDES) { const [a0, a1] = WO.len(s); sheath(WO, s, a0, a1, OG_ops[s], z0, zG); }
  for (const s of ['E', 'S', 'N']) { const r = twRange(s); sheath(WT, s, r[0], r[1], TW_ops[s], 0.335, zTH, { ins: false, osbM: MAT.towerIn }); }
  { const r = twRange('W'); sheath(WT, 'W', r[0], r[1], TW_ops.W, zR, zTH, { ins: false, osbM: MAT.towerIn }); }
  phase(PHN.ring);
  for (const s of SIDES) { const [a0, a1] = WO.len(s); WO.wl(s, WO.sn(s) ? a0 : a0 + SD + 0.122, WO.sn(s) ? a1 : a1 - SD - 0.122, DEP.stud, zG, zC, MAT.bsh, { grain: WO.sn(s) ? 'x' : 'y', bevel: BV }); }
  // roof joists 12/24 e = 50 cm east–west, single span 4.9 m between the OG walls, 0.5 m overhang; stopped at the tower
  const JW2 = 0.12; for (let y = OG.y0 + 0.3; y < OG.y1; y += 0.5) { if (y > TW.y0 - 0.08 && y < TW.y1 + 0.08) B(RF.x0, OG.x1 - 0.02, y - JW2 / 2, y + JW2 / 2, zC, zRJ, MAT.kvh, { grain: 'x', bevel: BV, col: false }); else B(RF.x0, RF.x1, y - JW2 / 2, y + JW2 / 2, zC, zRJ, MAT.kvh, { grain: 'x', bevel: BV, col: false }); }
  B(RF.x0, RF.x1, RF.y0, RF.y0 + JW2, zC, zRJ, MAT.kvh, { grain: 'x', bevel: BV, col: false }); B(RF.x0, RF.x1, RF.y1 - JW2, RF.y1, zC, zRJ, MAT.kvh, { grain: 'x', bevel: BV, col: false });
  B(RF.x0, RF.x0 + JW2, RF.y0, RF.y1, zC, zRJ, MAT.kvh, { grain: 'y', bevel: BV, col: false }); B(RF.x1 - JW2, RF.x1, RF.y0, TW.y0, zC, zRJ, MAT.kvh, { grain: 'y', bevel: BV, col: false }); B(RF.x1 - JW2, RF.x1, TW.y1, RF.y1, zC, zRJ, MAT.kvh, { grain: 'y', bevel: BV, col: false });
  for (let x = OG.x0 + 0.25; x < RF.x1; x += 0.5) { B(x - JW2 / 2, x + JW2 / 2, RF.y0, OG.y0 + 0.2, zC, zRJ, MAT.kvh, { grain: 'y', bevel: BV, col: false }); B(x - JW2 / 2, x + JW2 / 2, OG.y1 - 0.2, RF.y1, zC, zRJ, MAT.kvh, { grain: 'y', bevel: BV, col: false }); }
  // tower: head floor joists over the passage, ring beam on the head walls, flat roof joists
  B(TW.x0 + TT, TW.x1 - TT, PASS.y0 - JW, PASS.y0, zD - 0.27, zD - 0.05, MAT.kvh, { grain: 'x', bevel: BV, col: false });
  for (let x = TW.x0 + 0.35; x < TW.x1 - TT; x += 0.5) B(x - JW / 2, x + JW / 2, PASS.y0, PASS.y1, zD - 0.27, zD - 0.05, MAT.kvh, { grain: 'y', bevel: BV, col: false });
  for (let y = TRF.y0 + 0.1; y < TRF.y1; y += 0.5) B(TRF.x0, TRF.x1, y - 0.04, y + 0.04, zTH, zTH + 0.2, MAT.kvh, { grain: 'x', bevel: BV, col: false });
  phase(PHN.roofBoard);
  for (const [x0, x1, y0, y1] of ROOF_PARTS()) B(x0, x1, y0, y1, zRJ, zRB, MAT.ceilP, { walk: 'wood', cast: false, grain: 'x' });
  B(TRF.x0, TRF.x1, TRF.y0, TRF.y1, zTH + 0.2, zTH + 0.224, MAT.towerIn, { col: false, cast: false, grain: 'x' }); }
// ======================= PHASE 15-17: roof insulation, sealing + fascia, chimney collar =======================
phase(PHN.roofIns);
for (const [x0, x1, y0, y1] of ROOF_PARTS()) { B(x0 + 0.01, x1 - 0.01, y0 + 0.01, y1 - 0.01, zRB, zRB + 0.002, MAT.foil, { col: false, cast: false }); B(x0, x1, y0, y1, zRB + 0.002, zRI, MAT.hfdBoard, { walk: 'wood', cast: false }); }
phase(PHN.roofSeal);
for (const [x0, x1, y0, y1] of ROOF_PARTS()) { B(x0, x1, y0, y1, zRI, zR, MAT.osb, { walk: 'wood', cast: false }); B(x0 + 0.005, x1 - 0.005, y0 + 0.005, y1 - 0.005, zR, zR + 0.004, MAT.epdm, { walk: 'wood', cast: false }); }
B(TRF.x0, TRF.x1, TRF.y0, TRF.y1, zTH + 0.224, zTH + 0.228, MAT.epdm, { col: false });
{ const f = { col: false }, e = 0.025, zt = zR + 0.06;
  for (const [x0, x1, y0, y1] of [[RF.x0 - e, RF.x1 + e, RF.y0 - e, RF.y0], [RF.x0 - e, RF.x1 + e, RF.y1, RF.y1 + e], [RF.x0 - e, RF.x0, RF.y0, RF.y1], [RF.x1, RF.x1 + e, RF.y0, TW.y0], [RF.x1, RF.x1 + e, TW.y1, RF.y1]]) { B(x0, x1, y0, y1, zC, zt, MAT.fascia, f); COL.push([x0 - 0.01, x1 + 0.01, y0 - 0.01, y1 + 0.01, zC, zt, 'edge', PH, null]); }
  const zh = zTH + 0.28; for (const [x0, x1, y0, y1] of [[TRF.x0 - e, TRF.x1 + e, TRF.y0 - e, TRF.y0], [TRF.x0 - e, TRF.x1 + e, TRF.y1, TRF.y1 + e], [TRF.x0 - e, TRF.x0, TRF.y0, TRF.y1], [TRF.x1, TRF.x1 + e, TRF.y0, TRF.y1]]) B(x0, x1, y0, y1, zTH, zh, MAT.fascia, f); }
phase(PHN.chimney);
cyl(STV[0], STV[1], zR, zR + 0.16, 0.2, MAT.steel, 28, undefined, { col: false }); beam([STV[0], STV[1], 8.0], [0.2, 4.2, zD], 0.02, 0.02, MAT.steel);
// ======================= PHASE 18/19: OG and tower windows, doors (all open outwards) =======================
phase(PHN.doors); B(TW.x1 - TT, TW.x1, DOORY[0], DOORY[1], zT0 - 0.02, zT0, MAT.slate, { walk: 'stone' }); phase(PHN.windows);
windowIn(WO, 'W', 0.0, 4.0, zO, zG, { mull: [1.0, 2.0, 3.0], sill: false, trans: [zG - 0.42] });
windowIn(WO, 'N', 0.0, 3.1, bandS, bandH, { mull: [1.03, 2.07] }); windowIn(WO, 'S', 0.0, 3.1, bandS, bandH, { mull: [1.03, 2.07] });
windowIn(WO, 'E', DOORY[0], DOORY[1], zO, zO + 2.1, { door: true, open: true, sill: false });
phase(PHN.doors); hingeDoor('ogE', boardLeaf(0.86, 2.06, { glass: [0.45, 0.5, 0.3, 1.7], boards: false, mat: MAT.frame }), { hx: OG.x1 - 0.04, hy: DOORY[1] - 0.02, a: [0, -1], w: 0.86, sign: 1, z0: zO, z1: zO + 2.06 });
B(OG.x1 - T, OG.x1, DOORY[0], DOORY[1], zOSB, zO, MAT.oakF, { walk: 'wood', col: false }); phase(PHN.windows);
windowIn(WT, 'E', DOORY[0], DOORY[1], zT0, 2.40, { door: true, open: true, sill: false });
phase(PHN.doors); hingeDoor('tower', boardLeaf(0.86, 2.06, { glass: [0.2, 0.12, 0.3, 1.6], mat: MAT.larch }), { hx: TW.x1 - 0.04, hy: DOORY[1] - 0.02, a: [0, -1], w: 0.86, sign: 1, z0: zT0, z1: zT0 + 2.06 });
phase(PHN.windows);
for (const s of ['E', 'S', 'N']) for (const o of TW_ops[s]) { if (s === 'E' && o.a0 === DOORY[0]) continue; const L = o.a1 - o.a0; windowIn(WT, s, o.a0, o.a1, o.s, o.h, { mull: L > 2.0 ? [o.a0 + L / 3, o.a0 + 2 * L / 3] : L > 1.3 ? [o.a0 + L / 2] : [] }); }
windowIn(WT, 'W', TW_ops.W[1].a0, TW_ops.W[1].a1, TW_ops.W[1].s, TW_ops.W[1].h, { mull: [(TW_ops.W[1].a0 + TW_ops.W[1].a1) / 2] });
windowIn(WT, 'W', DOORY[0], DOORY[1], zD, zD + 2.1, { door: true, open: true, sill: false });
phase(PHN.doors); hingeDoor('box', glassLeaf(0.86, 2.06), { hx: TW.x0 + 0.04, hy: DOORY[1] - 0.02, a: [0, -1], w: 0.86, sign: -1, z0: zD, z1: zD + 2.06 });
// ======================= PHASE 20/21: facade battens, then charred cladding (tower: own facade material; the house wall inside the tower gets larch boards) =======================
for (const ph of [PHN.battens, PHN.cladding]) { phase(ph); const part = ph === PHN.battens ? 'lat' : 'clad';
  for (const [a0, a1, m] of [[0, TW.y0, MAT.char], [TW.y0, TW.y1, MAT.towerIn], [TW.y1, 4, MAT.char]]) facade(WE, 'E', a0, a1, EG_ops.E, zS + 0.12, zE, part, m);
  for (const s of SNW) { const [a0, a1] = WO.len(s); facade(WO, s, a0, a1, OG_ops[s], zOSB, zG, part); }
  for (const [a0, a1, m] of [[OG.y0, TW.y0, MAT.char], [TW.y0, TW.y1, MAT.towerIn], [TW.y1, OG.y1, MAT.char]]) facade(WO, 'E', a0, a1, OG_ops.E, zOSB, zG, part, m);
  for (const s of ['E', 'S', 'N']) { const r = WT.sn(s) ? [TW.x0 + 0.02, TW.x1] : [TW.y0, TW.y1]; facade(WT, s, r[0], r[1], TW_ops[s], 0.3, zTH, part, MAT.charT); }
  facade(WT, 'W', TW.y0, TW.y1, TW_ops.W, zR, zTH, part, MAT.charT); }
B(TW.x0, TW.x1 + 0.01, TW.y0 - 0.01, TW.y1 + 0.01, 0.2, 0.3, MAT.fascia, { col: false });
// black steel bands at the OG floor and roof edges – not inside the stair tower (there the house wall is lined with the tower boards)
for (const s of SIDES) { const [a0, a1] = WO.len(s); const runs = s === 'E' ? [[a0 - 0.03, TW.y0], [TW.y1, a1 + 0.03]] : [[a0 - 0.03, a1 + 0.03]];
  for (const [r0, r1] of runs) { WO.wl(s, r0, r1, [-0.03, 0.09], zE - 0.02, zJT + 0.03, MAT.fascia, { col: false }); WO.wl(s, r0, r1, [-0.03, 0.09], zG - 0.05, zC + 0.02, MAT.fascia, { col: false }); } }
for (const [x0, x1, y0, y1] of [[OG.x0 - 0.03, OG.x1, OG.y0 - 0.03, OG.y0 + 0.1], [OG.x0 - 0.03, OG.x1, OG.y1 - 0.1, OG.y1 + 0.03], [OG.x0 - 0.03, OG.x0 + 0.1, OG.y0, OG.y1]]) B(x0, x1, y0, y1, zE - 0.03, zE, MAT.fascia, { col: false, cast: false });
// ======================= PHASE 22-25: spiral stair (flight A + OG landing, flight B + head floor), terrace deck, railings =======================
// oak treads 45 mm on the steel column, nosing 3.5°, outer steel stringer with round bars, oak handrail; walk surfaces per tread (inner/outer rotated boxes)
{ const TREAD_TH = 0.045, NOSE = 3.5 * Math.PI / 180;
  function sector(a0, a1, ztop, th, m, r0 = SCR, r1 = SR) { const sh = new THREE.Shape(), n = 8;
    sh.moveTo(r0 * Math.cos(a0), r0 * Math.sin(a0)); for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; sh.lineTo(r1 * Math.cos(a), r1 * Math.sin(a)); } sh.lineTo(r0 * Math.cos(a1), r0 * Math.sin(a1)); sh.closePath();
    const geo = new THREE.ExtrudeGeometry(sh, { depth: th, bevelEnabled: false }); const me = new THREE.Mesh(geo, m); me.rotation.x = -Math.PI / 2; me.position.copy(V(SC[0], SC[1], ztop - th)); me.castShadow = true; me.receiveShadow = true; scene.add(me); return tagPh(me); }
  function sectorWalk(a0, a1, ztop) { const am = (a0 + a1) / 2, h = (a1 - a0) / 2, rot = { cx: SC[0], cy: SC[1], c: Math.cos(am), s: Math.sin(am) };
    WALK.push([0.02, 0.57, -0.57 * Math.sin(h) - 0.03, 0.57 * Math.sin(h) + 0.03, ztop, 'wood', PH, PH_END, undefined, rot]); WALK.push([0.55, SR, -SR * Math.sin(h), SR * Math.sin(h), ztop, 'wood', PH, PH_END, undefined, rot]); }
  function flight(F, aStart) {
    for (let k = 1; k < F.n; k++) { const a0 = aStart + (k - 1) * F.da, a1 = a0 + F.da, zt = F.z0 + k * F.rise; sector(a0 - NOSE, a1, zt, TREAD_TH, MAT.oakF); sectorWalk(a0, a1, zt);
      // outer stringer bar under the tread end, two balusters, balustrade collider (rotated box at the outer edge)
      const am = (a0 + a1) / 2, rot = { cx: SC[0], cy: SC[1], c: Math.cos(am), s: Math.sin(am) }, ch = SR * Math.sin(F.da / 2);
      COL.push([SR - 0.08, SR + 0.02, -ch, ch, zt, zt + 1.0, 'rail', PH, PH_END, rot]);
      for (const f of [0.25, 0.75]) { const a = a0 + F.da * f, x = SC[0] + (SR - 0.05) * Math.cos(a), y = SC[1] + (SR - 0.05) * Math.sin(a); cyl(x, y, zt - 0.02, zt + 0.92 + F.rise * (f - 0.5), 0.007, MAT.blacksteel, 8, undefined, { col: false, cast: false }); } }
    // helical stringer and handrail (tubes along the outer edge)
    const pts = (r, dz) => { const o = []; const N = 64; for (let i = 0; i <= N; i++) { const a = aStart + (F.n - 1) * F.da * i / N; o.push(V(SC[0] + r * Math.cos(a), SC[1] + r * Math.sin(a), F.z0 + F.rise * (1 + (F.n - 1) * i / N) - 0.5 * F.rise + dz)); } return new THREE.CatmullRomCurve3(o); };
    for (const [r, dz, rad, m] of [[SR - 0.025, -0.12, 0.022, MAT.blacksteel], [SR - 0.05, 0.92, 0.024, MAT.oakF]]) { const me = new THREE.Mesh(new THREE.TubeGeometry(pts(r, dz), 160, rad, 10, false), m); me.castShadow = true; me.receiveShadow = true; scene.add(me); tagPh(me); }
    return aStart + F.n * F.da; }
  phase(PHN.stairA);
  { const aEnd = flight(SPA, Math.PI / 2);
    // OG landing: deck boards over the passage + the last sector of the turn (arrival), railing over the open shaft (west and east of the arrival)
    sector(aEnd - SPA.da - NOSE, aEnd, zO, 0.05, MAT.oakF); sectorWalk(aEnd - SPA.da, aEnd + 0.08, zO);
    B(TW.x0, TW.x1 - TT, PASS.y0, PASS.y1, zJT, zJT + 0.028, MAT.deck, { walk: 'wood', grain: 'x', col: false });
    B(TW.x0, TW.x1 - TT, PASS.y0, PASS.y1, zJT + 0.028, zO, MAT.oakF, { walk: 'wood', grain: 'x', cast: false, col: false });
    WALK.push([SC[0] - 0.5, SC[0] + 0.52, PASS.y0 - 0.17, PASS.y0, zO, 'wood', PH, PH_END]);
    railLine([TW.x0 + 0.02, PASS.y0], [SC[0] - 0.52, PASS.y0], zO); railLine([SC[0] + 0.54, PASS.y0], [TW.x1 - TT, PASS.y0], zO);
    // entrance: coat rail and shoe bench on the north wall of the passage (the open library door lies along the west part of this wall)
    B(5.05, 6.3, PASS.y1 - 0.3, PASS.y1, zT0, zT0 + 0.44, MAT.oakF, { bevel: 0.004 }); B(5.07, 6.28, PASS.y1 - 0.28, PASS.y1 - 0.02, zT0 + 0.08, zT0 + 0.1, MAT.oakF, { col: false });
    B(5.05, 6.3, PASS.y1 - 0.03, PASS.y1, 1.78, 1.86, MAT.oakF, { col: false, bevel: 0.003 }); for (let x = 5.15; x < 6.25; x += 0.2) beam([x, PASS.y1 - 0.035, 1.82], [x, PASS.y1 - 0.1, 1.86], 0.014, 0.014, MAT.blacksteel, { cast: false }); }
  phase(PHN.stairB);
  { const aEnd = flight(SPB, Math.PI / 2);
    sector(aEnd - SPB.da - NOSE, aEnd, zD, 0.05, MAT.oakF); sectorWalk(aEnd - SPB.da, aEnd + 0.08, zD);
    B(TW.x0 + TT, TW.x1 - TT, PASS.y0, PASS.y1, zD - 0.05, zD, MAT.oakF, { walk: 'wood', grain: 'x', col: false });
    WALK.push([SC[0] + 0.02, SC[0] + 0.52, PASS.y0 - 0.17, PASS.y0, zD, 'wood', PH, PH_END]); B(TW.x0, TW.x0 + TT, DOORY[0], DOORY[1], zD - 0.03, zD, MAT.oakF, { walk: 'wood', col: false });   // threshold to the terrace
    railLine([TW.x0 + TT, PASS.y0], [SC[0] - 0.02, PASS.y0], zD); railLine([SC[0] + 0.54, PASS.y0], [TW.x1 - TT, PASS.y0], zD); railLine([SC[0], PASS.y0 - 0.02], [SC[0], SC[1] + 0.12], zD); } }
phase(PHN.terrace);
for (let y = RF.y0 + 0.35; y < RF.y1 - 0.3; y += 0.6) B(RF.x0 + 0.3, (y > TW.y0 - 0.1 && y < TW.y1 + 0.1) ? OG.x1 - 0.02 : RF.x1 - 0.3, y - 0.03, y + 0.03, zR + 0.004, zD - 0.028, MAT.blacksteel, { col: false, cast: false });
{ const dk = { t: MAT.deck, def: MAT.larch }, o = { walk: 'wood', grain: 'x' };
  B(RF.x0 + 0.3, OG.x1, RF.y0 + 0.3, RF.y1 - 0.3, zD - 0.028, zD, dk, o); B(OG.x1, RF.x1 - 0.3, RF.y0 + 0.3, TW.y0, zD - 0.028, zD, dk, o); B(OG.x1, RF.x1 - 0.3, TW.y1, RF.y1 - 0.3, zD - 0.028, zD, dk, o); }
phase(PHN.railings);
rail([tR.x1, TW.y1 + 0.05], [tR.x1, tR.y1], zD, 1.08); rail([tR.x1, tR.y0], [tR.x1, TW.y0 - 0.05], zD, 1.08); rail([tR.x0, tR.y1], [tR.x1, tR.y1], zD, 1.08);
glassRail(tR, zR, zD); pvRail(tR, zR, zD);
// ======================= PHASE 26-27: EG east wall plaster, OG floor and plaster =======================
phase(PHN.plaster);
for (const [a0, a1, q0, q1] of cutOps(0, 4, zF, zE, EG_ops.E)) WE.wl('E', a0, a1, DEP.clay, q0, q1, MAT.clay, { col: false, grain: 'z' });
for (const s of SIDES) { const [b0, b1] = WO.len(s); for (const [a0, a1, q0, q1] of cutOps(b0, b1, zO, zG, OG_ops[s])) WO.wl(s, a0, a1, DEP.clay, q0, q1, MAT.clay, { col: false, grain: 'z' }); }
phase(PHN.floors); B(OG.x0 + T, OG.x1 - T, OG.y0 + T, OG.y1 - T, zOSB, zO, MAT.floorP, { walk: 'wood', cast: false, grain: 'y' });
varOff();
