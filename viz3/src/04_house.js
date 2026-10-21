// ===================== Pavillon Ratscher · construction, phase by phase =====================
// Two design variants on the same EG (4 × 4 m on the garage slab); the parts they share are built once, the rest per variant (varOn/varOff):
//  A – OG 4.9 × 5.8 m cantilevered 0.9 m to W, N, S; slim stair tower 2.6 × 3.7 m on the east (screw piles) with a spiral stair Ø 2.16 m
//      (DIN 18065: going 25 / 23.3 cm on the walking line, clear width 0.95 m): the tower door is the entrance – straight on into the library,
//      left up the spiral to the work room and on to the roof terrace.
//  B – no tower: OG 5.8 × 5.8 m cantilevered 0.9 m on all four sides, front door in the EG east wall under the cantilever. Inside, a ladder stair
//      (Leitertreppe 63°, oak treads 16 cm deep, clear width 0.69 m, handrails both sides) climbs through a trapdoor that usually stands open;
//      a second one rises along the OG east wall through a glazed roof hatch onto the larger roof terrace.
// Every door opens outwards (towards the tower / garden / terrace), so no room loses floor space to a door swing.
// Wall build-up from the outside (depth 0 = outer face of cladding), heated walls:
//   0.000 Yakisugi larch boards 22 mm + Deckleisten        (phase 8)
//   0.022 Traglattung 30/50 horizontal                      (phase 8)
//   0.052 Konterlattung 30/50 vertical on each stud         (phase 8)
//   0.082 Holzfaser-Dämmplatte 40 mm, diffusionsoffen       (phase 3 / 5)
//   0.122 KVH 6/14 studs e = 62.5 cm + 140 mm wood fibre    (phase 2 / 5)
//   0.262 OSB/3 15 mm, joints taped = airtight layer        (phase 3 / 5)
//   0.277 Lehmputz 15 mm on reed mat                        (phase 10)
const T = 0.292;
const DEP = { clad: [0, 0.022], lat: [0.022, 0.052], kon: [0.052, 0.082], hfd: [0.082, 0.122], stud: [0.122, 0.262], osb: [0.262, 0.277], clay: [0.277, 0.292] };
// stair tower (unheated): boards 22 + battens 30 + wood-fibre board 16 + studs 6/12 + larch lining 15 = 0.203
const TT = 0.203, DEPT = { clad: [0, 0.022], lat: [0.022, 0.052], kon: [0.052, 0.068], hfd: [0.068, 0.084], stud: [0.084, 0.188], osb: [0.188, 0.203] };
const SW = 0.06, SD = 0.14, BV = 0.006;
// levels
const zS = 0.15, zF = 0.316, zSill = zS + 0.004, zStud0 = zSill + SW;
const zE = 2.68, JD = 0.24, JW = 0.10, zJT = zE + JD, zOSB = zJT + 0.024 + 0.022, zO = zOSB + 0.020;     // OG floor 2.986
const zG = 5.15, RBh = 0.24, zC = zG + RBh, zRJ = zC + JD, zRB = zRJ + 0.024, zRI = zRB + 0.20, zR = zRI + 0.022, zD = zR + 0.004 + 0.04 + 0.028;   // terrace 5.948 (A)
// B: the roof joists span the full 5.8 m → BSH 12/28 instead of KVH 12/24, the terrace sits 4 cm higher
const JDB = 0.28, zRJb = zC + JDB, zRBb = zRJb + 0.024, zRIb = zRBb + 0.20, zRb = zRIb + 0.022, zDb = zRb + 0.004 + 0.04 + 0.028;      // terrace 5.988 (B)
// boxes (site coords)
const EG = { x0: 0, x1: 4, y0: 0, y1: 4 };
const OG = { x0: -0.9, x1: 4.0, y0: -0.9, y1: 4.9 };
const TW = { x0: 4.0, x1: 6.6, y0: 0.15, y1: 3.85 };            // stair tower (outer faces); its west side is the house wall, above the roof its own head wall
const RF = { x0: -1.4, x1: 4.5, y0: -1.4, y1: 5.4 };            // house roof plate; the tower rises through its east overhang
const PL = 0.9;                                                 // OG corner pier length
const STV = [0.95, 3.25];                                       // stove
const tR = { x0: RF.x0 + 0.3, x1: RF.x1 - 0.3, y0: RF.y0 + 0.3, y1: RF.y1 - 0.3 };   // terrace railing lines
// spiral stair: axis SC, tread radius SR (Ø 2.16 m), steel column Ø 168 mm; one full turn per storey, rising anticlockwise from the north
const SC = [5.22, 1.47], SR = 1.08, SCR = 0.084, zT0 = zF - 0.016;
const SPA = { z0: zT0, z1: zO, n: 14 }, SPB = { z0: zO, z1: zD, n: 15 };
for (const f of [SPA, SPB]) { f.rise = (f.z1 - f.z0) / f.n; f.da = 2 * Math.PI / f.n; }
const PASS = { y0: SC[1] + SR, y1: TW.y1 - TT };                       // passage / landings along the north side of the tower
const zTH = zD + 2.35;                                          // tower head: top of the walls (glazed lantern above the terrace)
const DOORY = [2.66, 3.52];                                     // all tower doors in one line: garden → passage → library; landing → work room; head → terrace
// ---- variant B: bigger OG and roof, trapdoor + roof hatch, two ladder stairs ----
const OGB = { x0: -0.9, x1: 4.9, y0: -0.9, y1: 4.9 };
const RFB = { x0: -1.4, x1: 5.4, y0: -1.4, y1: 5.4 };
const tRB = { x0: RFB.x0 + 0.3, x1: RFB.x1 - 0.3, y0: RFB.y0 + 0.3, y1: RFB.y1 - 0.3 };
const HT1 = { x0: 2.88, x1: 3.71, y0: 0.42, y1: 1.72 };        // trapdoor in the OG floor (clear opening), above the SE corner of the library
const HT2 = { x0: 3.78, x1: 4.60, y0: 2.46, y1: 3.84 };        // roof hatch (clear opening inside the curb) along the OG east wall, between two roof joists
const CK = { x0: HT2.x0 - 0.06, x1: HT2.x1 + 0.06, y0: HT2.y0 - 0.06, y1: HT2.y1 + 0.06 };   // outer faces of the hatch curb
const zK = zDb + 0.10;                                          // curb top: 17 cm above the waterproofing, 10 cm above the deck
// ladder stair: n rises between z0 and z1, 63° pitch; it rises in direction `dir` (+1 = north, -1 = south) and its top edge (floor edge) is at yTop
function mkLadder(L) { L.rise = (L.z1 - L.z0) / L.n; L.go = L.rise / Math.tan(L.deg * Math.PI / 180); L.run = L.n * L.go; L.yFoot = L.yTop - L.dir * L.run; return L; }
const lys = (L, s) => L.yFoot + L.dir * s;                     // site y at run distance s from the foot
const LAD1 = mkLadder({ x0: 2.92, x1: 3.70, yTop: HT1.y0, dir: -1, z0: zF, z1: zO, n: 13, deg: 63 });    // library → work room, rising southward along the east wall
const LAD2 = mkLadder({ x0: 3.80, x1: 4.58, yTop: HT2.y1, dir: 1, z0: zO, z1: zK, n: 15, deg: 63 });     // work room → roof, rising northward along the east wall
const ESTUB = [-0.25, HT1.y0 - JW / 2, HT1.y1 + JW / 2, 2.6, 3.45, 4.2];   // east cantilever joists; the second and third frame the trapdoor
// ---------------- wall helpers for any box ----------------
function wallOf(box, dep) {
  const face = { S: box.y0, N: box.y1, W: box.x0, E: box.x1 }, dirv = { S: 1, N: -1, W: 1, E: -1 }, len = s => (s === 'S' || s === 'N') ? [box.x0, box.x1] : [box.y0, box.y1];
  const rect = (side, a0, a1, d) => { const f = face[side], k = dirv[side], q0 = f + k * d[0], q1 = f + k * d[1]; const lo = Math.min(q0, q1), hi = Math.max(q0, q1); return (side === 'S' || side === 'N') ? [a0, a1, lo, hi] : [lo, hi, a0, a1]; };
  return { box, dep, face, dir: dirv, len,
    wl(side, a0, a1, d, z0, z1, m, o = {}) { const r = rect(side, a0, a1, d); return B(r[0], r[1], r[2], r[3], z0, z1, m, o); },
    col(side, a0, a1, d, z0, z1, tag) { const r = rect(side, a0, a1, d); COL.push([...r, z0, z1, tag, PH, PH_END]); },
    rect, sn: side => side === 'S' || side === 'N' };
}
function cutOps(a0, a1, z0, z1, ops) { let parts = [[a0, a1, z0, z1]];
  for (const o of ops) { const out = []; for (const [p0, p1, q0, q1] of parts) { if (o.a1 <= p0 || o.a0 >= p1 || o.h <= q0 || o.s >= q1) { out.push([p0, p1, q0, q1]); continue; }
      if (o.a0 > p0) out.push([p0, o.a0, q0, q1]); if (o.a1 < p1) out.push([o.a1, p1, q0, q1]); const x0 = Math.max(p0, o.a0), x1 = Math.min(p1, o.a1); if (o.s > q0) out.push([x0, x1, q0, o.s]); if (o.h < q1) out.push([x0, x1, o.h, q1]); } parts = out; }
  return parts.filter(p => p[1] - p[0] > 1e-3 && p[3] - p[2] > 1e-3); }
// plan rectangle [x0,x1,y0,y1] minus a hole {x0,x1,y0,y1}: up to four rectangles
function rectMinus(r, h) { const [x0, x1, y0, y1] = r; if (h.x1 <= x0 || h.x0 >= x1 || h.y1 <= y0 || h.y0 >= y1) return [r];
  const out = []; if (h.y0 > y0) out.push([x0, x1, y0, h.y0]); if (h.y1 < y1) out.push([x0, x1, h.y1, y1]);
  const ya = Math.max(y0, h.y0), yb = Math.min(y1, h.y1); if (h.x0 > x0) out.push([x0, h.x0, ya, yb]); if (h.x1 < x1) out.push([h.x1, x1, ya, yb]); return out; }
// stud frame of one wall side between a0..a1 (along), z0 (sill top) .. z1 (top of double plate)
function studFrame(W, side, a0, a1, ops, z0, z1, extraPosts = [], sw = SW) {
  const d = W.dep.stud, g = W.sn(side) ? 'x' : 'y'; const studs = new Set(); ops = ops.filter(o => o.s >= z0 - 0.08 && o.h <= z1);
  for (let a = a0 + 0.03; a < a1; a += 0.625) studs.add(+a.toFixed(3)); studs.add(+(a1 - 0.03).toFixed(3)); for (const p of extraPosts) studs.add(p);
  for (const o of ops) { studs.add(+(o.a0 - sw / 2 - 0.01).toFixed(3)); studs.add(+(o.a1 + sw / 2 + 0.01).toFixed(3)); }
  for (const a of [...studs].filter(a => a >= a0 + 0.02 && a <= a1 - 0.02).sort((p, q) => p - q)) { const inOp = ops.find(o => a > o.a0 && a < o.a1);
    if (!inOp) W.wl(side, a - sw / 2, a + sw / 2, d, z0, z1 - 2 * sw, MAT.kvh, { grain: 'z', bevel: BV, col: false });
    else { if (inOp.s > z0 + 0.1) W.wl(side, a - sw / 2, a + sw / 2, d, z0, inOp.s - sw, MAT.kvh, { grain: 'z', bevel: BV, col: false });
      if (inOp.h + 0.2 < z1 - 2 * sw) W.wl(side, a - sw / 2, a + sw / 2, d, inOp.h + 0.2, z1 - 2 * sw, MAT.kvh, { grain: 'z', bevel: BV, col: false }); } }
  for (const o of ops) { W.wl(side, o.a0 - sw - 0.01, o.a1 + sw + 0.01, d, o.h, Math.min(o.h + 0.2, z1 - 2 * sw), MAT.kvh, { grain: g, bevel: BV, col: false });
    if (o.s > z0 + 0.1) W.wl(side, o.a0 - sw - 0.01, o.a1 + sw + 0.01, d, o.s - sw, o.s, MAT.kvh, { grain: g, bevel: BV, col: false }); }
  W.wl(side, a0, a1, d, z1 - 2 * sw, z1 - sw, MAT.kvh, { grain: g, bevel: BV, col: false }); W.wl(side, a0, a1, d, z1 - sw, z1, MAT.kvh, { grain: g, bevel: BV, col: false });
}
function sheath(W, side, a0, a1, ops, z0, z1, { ins = true, osb = true, board = true, osbM = MAT.osb } = {}) {
  if (ins) for (const [p0, p1, q0, q1] of cutOps(a0, a1, z0 + 0.06, z1 - 0.12, ops)) W.wl(side, p0, p1, [W.dep.stud[0] + 0.004, W.dep.stud[1] - 0.004], q0, q1, MAT.hfd, { col: false, cast: false });
  if (osb) for (const [p0, p1, q0, q1] of cutOps(a0, a1, z0, z1, ops)) { W.wl(side, p0, p1, W.dep.osb, q0, q1, osbM, { col: false, grain: osbM === MAT.osb ? undefined : 'z' }); W.col(side, p0, p1, W.dep.osb, q0, q1, 'wall'); }
  if (board) for (const [p0, p1, q0, q1] of cutOps(a0, a1, z0, z1, ops)) W.wl(side, p0, p1, W.dep.hfd, q0, q1, MAT.hfdBoard, { col: false });
}
function facade(W, side, a0, a1, ops, z0, z1, part = 'all', clad = MAT.char) { const g = W.sn(side) ? 'x' : 'y';
  if (part !== 'clad') { for (let a = a0 + 0.03; a < a1; a += 0.625) for (const [p0, p1, q0, q1] of cutOps(a - 0.025, a + 0.025, z0, z1, ops)) W.wl(side, p0, p1, W.dep.kon, q0, q1, MAT.kvh, { col: false, cast: false, grain: 'z' });
    for (let z = z0 + 0.1; z < z1; z += 0.625) for (const [p0, p1, q0, q1] of cutOps(a0, a1, z - 0.025, z + 0.025, ops)) W.wl(side, p0, p1, W.dep.lat, q0, q1, MAT.kvh, { col: false, cast: false, grain: g }); }
  if (part === 'lat') return;
  for (const [p0, p1, q0, q1] of cutOps(a0, a1, z0, z1, ops)) { W.wl(side, p0, p1, W.dep.clad, q0, q1, clad, { col: false, grain: 'z' }); W.col(side, p0, p1, [0, W.dep.hfd[1]], q0, q1, 'wall'); }
  const ops2 = ops.map(o => ({ a0: o.a0 - 0.05, a1: o.a1 + 0.05, s: o.s - 0.04, h: o.h + 0.03 }));
  for (let a = a0 + 0.08; a < a1 - 0.04; a += 0.16) for (const [p0, p1, q0, q1] of cutOps(a - 0.022, a + 0.022, z0, z1, ops2)) W.wl(side, p0, p1, [-0.022, 0], q0, q1, clad, { col: false, cast: false, grain: 'z' });
}
// timber window in a wall of box W: fixed glazing in an oiled larch frame set 13.5 cm behind the outer face
function windowIn(W, side, a0, a1, s, h, { mull = [], door = false, open = false, sill = true, trans = [], glassDepth = 0.135 } = {}) {
  const fw = 0.08, depth = 0.09, rv = W.sn(side), f = W.face[side], k = W.dir[side], c = f + k * Math.min(glassDepth, W.dep.osb[1] - 0.05), inner = f + k * (W.dep.clay ? W.dep.clay[1] : W.dep.osb[1]);
  const box = (p0, p1, zz0, zz1, m, cc = c, dd = depth) => { const q0 = cc - dd / 2, q1 = cc + dd / 2; return rv ? B(p0, p1, Math.min(q0, q1), Math.max(q0, q1), zz0, zz1, m, { bevel: 0.004, col: false }) : B(Math.min(q0, q1), Math.max(q0, q1), p0, p1, zz0, zz1, m, { bevel: 0.004, col: false }); };
  box(a0, a1, h - fw, h, MAT.frame); if (!door) box(a0, a1, s, s + fw, MAT.frame); box(a0, a0 + fw, s, h, MAT.frame); box(a1 - fw, a1, s, h, MAT.frame);
  for (const m of mull) box(m - fw / 2, m + fw / 2, s, h, MAT.frame); for (const tz of trans) box(a0, a1, tz - fw / 2, tz + fw / 2, MAT.frame);
  const lo = Math.min(f, inner), hi = Math.max(f, inner), RV = W.dep === DEPT ? MAT.towerIn : MAT.larchIn;
  if (rv) { B(a0 - 0.02, a0, lo, hi, s, h, RV, { col: false }); B(a1, a1 + 0.02, lo, hi, s, h, RV, { col: false }); B(a0, a1, lo, hi, h, h + 0.02, RV, { col: false }); }
  else { B(lo, hi, a0 - 0.02, a0, s, h, RV, { col: false }); B(lo, hi, a1, a1 + 0.02, s, h, RV, { col: false }); B(lo, hi, a0, a1, h, h + 0.02, RV, { col: false }); }
  if (sill && !door) { const so = f - k * 0.045; if (rv) B(a0 - 0.03, a1 + 0.03, Math.min(so, c), Math.max(so, c), s - 0.03, s, MAT.fascia, { col: false }); else B(Math.min(so, c), Math.max(so, c), a0 - 0.03, a1 + 0.03, s - 0.03, s, MAT.fascia, { col: false });
    if (rv) B(a0, a1, Math.min(c, inner), Math.max(c, inner), s - 0.025, s, MAT.oakF, { col: false }); else B(Math.min(c, inner), Math.max(c, inner), a0, a1, s - 0.025, s, MAT.oakF, { col: false }); }
  if (!open) { const panes = [a0 + fw, ...mull.flatMap(m => [m - fw / 2, m + fw / 2]), a1 - fw];
    for (let q = 0; q < panes.length; q += 2) { const g = rv ? B(panes[q], panes[q + 1], c - 0.012, c + 0.012, s + (door ? 0 : fw), h - fw, MAT.glass, { cast: false, col: false }) : B(c - 0.012, c + 0.012, panes[q], panes[q + 1], s + (door ? 0 : fw), h - fw, MAT.glass, { cast: false, col: false }); g.renderOrder = 2; }
    if (rv) COL.push([a0, a1, lo, hi, s, h, 'glass', PH, null]); else COL.push([lo, hi, a0, a1, s, h, 'glass', PH, null]); }
}
// steel railing (posts, oak handrail, round bars) along a straight edge + collider
function railLine(p0, p1, z0, h = 1.0) { const [x0, y0] = p0, [x1, y1] = p1, L = Math.hypot(x1 - x0, y1 - y0); const n = Math.max(1, Math.round(L / 1.0));
  for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; B(x - 0.02, x + 0.02, y - 0.02, y + 0.02, z0, z0 + h, MAT.blacksteel, { col: false }); }
  beam([x0, y0, z0 + h], [x1, y1, z0 + h], 0.05, 0.04, MAT.oakF, { bevel: 0.004 });
  for (let t = 0.11; t < L; t += 0.11) { const x = x0 + (x1 - x0) * t / L, y = y0 + (y1 - y0) * t / L; beam([x, y, z0 + 0.06], [x, y, z0 + h - 0.02], 0.008, 0.008, MAT.blacksteel, { cast: false }); }
  COL.push([Math.min(x0, x1) - 0.04, Math.max(x0, x1) + 0.04, Math.min(y0, y1) - 0.04, Math.max(y0, y1) + 0.04, z0, z0 + h, 'rail', PH, PH_END]); }
// terrace railing: larch posts, handrail, steel cables
function rail(p0, p1, z0, h, { rails = [0.12], posts = 1.45, m = MAT.larch } = {}) {
  const [x0, y0] = p0, [x1, y1] = p1; const L = Math.hypot(x1 - x0, y1 - y0); const n = Math.max(1, Math.round(L / posts));
  for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; B(x - 0.04, x + 0.04, y - 0.04, y + 0.04, z0 - 0.3, z0 + h, m, { bevel: BV, grain: 'z' }); }
  beam([x0, y0, z0 + h], [x1, y1, z0 + h], 0.11, 0.045, m, { bevel: BV });
  for (const f of rails) beam([x0, y0, z0 + h * f], [x1, y1, z0 + h * f], 0.04, 0.04, m, { bevel: BV });
  for (let t = 0.08; t < L; t += 0.11) { const x = x0 + (x1 - x0) * t / L, y = y0 + (y1 - y0) * t / L; beam([x, y, z0 + h * 0.12], [x, y, z0 + h * 0.98], 0.006, 0.006, MAT.steel, { cast: false }); }
  const d = 0.05; COL.push([Math.min(x0, x1) - d, Math.max(x0, x1) + d, Math.min(y0, y1) - d, Math.max(y0, y1) + d, z0, z0 + h, 'rail', PH, null]);
}
// west windbreak: laminated glass between larch posts (sunset stays free)
function glassRail(t, zRx, zDx) { const g = B(t.x0 - 0.012, t.x0 + 0.012, t.y0 + 0.05, t.y1 - 0.05, zDx + 0.08, zDx + 1.04, MAT.glass, { cast: false, col: false }); g.renderOrder = 2;
  for (let y = t.y0; y <= t.y1 + 1e-6; y += (t.y1 - t.y0) / 4) B(t.x0 - 0.045, t.x0 + 0.045, y - 0.045, y + 0.045, zRx - 0.1, zDx + 1.08, MAT.larch, { bevel: BV, grain: 'z' });
  beam([t.x0, t.y0, zDx + 1.08], [t.x0, t.y1, zDx + 1.08], 0.11, 0.045, MAT.larch, { bevel: BV }); beam([t.x0, t.y0, zDx + 0.06], [t.x0, t.y1, zDx + 0.06], 0.07, 0.07, MAT.larch, { bevel: BV }); COL.push([t.x0 - 0.05, t.x0 + 0.05, t.y0, t.y1, zDx, zDx + 1.1, 'rail', PH, null]); }
// south parapet: four glass–glass PV modules between larch posts
let PVM = null;
function pvRail(t, zRx, zDx) { if (!PVM) { const c = document.createElement('canvas'); c.width = c.height = 256; const g = c.getContext('2d'); g.fillStyle = '#0f1626'; g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#2c3850'; g.lineWidth = 2; for (let i = 1; i < 6; i++) { g.beginPath(); g.moveTo(i * 256 / 6, 0); g.lineTo(i * 256 / 6, 256); g.stroke(); } for (let i = 1; i < 10; i++) { g.beginPath(); g.moveTo(0, i * 25.6); g.lineTo(256, i * 25.6); g.stroke(); }
    g.strokeStyle = '#56637c'; g.lineWidth = 1; for (let i = 0; i < 6; i++) for (let k = 0; k < 3; k++) { g.beginPath(); g.moveTo(i * 256 / 6 + 10 + k * 10, 0); g.lineTo(i * 256 / 6 + 10 + k * 10, 256); g.stroke(); }
    const tx = new THREE.CanvasTexture(c); tx.colorSpace = THREE.SRGBColorSpace; PVM = plain({ map: tx, roughness: 0.12, metalness: 0.3 }); }
  const n = 4, span = (t.x1 - 0.1 - t.x0 - 0.1) / n;
  for (let i = 0; i < n; i++) { const xa = t.x0 + 0.1 + i * span + 0.03; const pm = B(xa, xa + span - 0.06, t.y0 - 0.02, t.y0 + 0.02, zDx + 0.05, zDx + 1.02, { s: PVM, n: MAT.pvframe, def: MAT.pvframe }, { col: false });
    { const uv = pm.geometry.attributes.uv; for (let k = 0; k < uv.count; k++) uv.setXY(k, k % 2, (k >> 1) % 2); }
    B(xa, xa + span - 0.06, t.y0 - 0.025, t.y0 + 0.025, zDx + 0.05, zDx + 0.08, MAT.pvframe, { col: false }); B(xa, xa + span - 0.06, t.y0 - 0.025, t.y0 + 0.025, zDx + 0.99, zDx + 1.02, MAT.pvframe, { col: false }); }
  for (let i = 0; i <= n; i++) { const x = t.x0 + 0.1 + i * span; B(x - 0.045, x + 0.045, t.y0 - 0.045, t.y0 + 0.045, zRx - 0.1, zDx + 1.08, MAT.larch, { bevel: BV, grain: 'z' }); }
  beam([t.x0, t.y0, zDx + 1.08], [t.x1, t.y0, zDx + 1.08], 0.11, 0.045, MAT.larch, { bevel: BV }); COL.push([t.x0, t.x1, t.y0 - 0.05, t.y0 + 0.05, zDx, zDx + 1.1, 'rail', PH, null]); }
// round member between two site points (handrails, brackets)
function rod(p, q, r, m, seg = 12) { const a = V(...p), b = V(...q), L = a.distanceTo(b); const g = new THREE.CylinderGeometry(r, r, L, seg); g.rotateX(Math.PI / 2);
  const me = new THREE.Mesh(g, m); me.position.copy(a.clone().add(b).multiplyScalar(0.5)); me.lookAt(b); me.castShadow = true; me.receiveShadow = true; scene.add(me); return tagPh(me); }
// ladder stair (Leitertreppe): two oak stringers 4.5 × 20 cm, oak treads 16 cm deep and 4 cm thick (open risers – every tread reaches under the
// next one, so there is no gap underfoot), round oak handrails on steel brackets 80 cm above the nosing line, running on past the top edge as grab rails.
// Treads are walk surfaces of type 'ladder' (slower walking, stair sound); the stringers are colliders.
function ladderStair(L) { const sw = 0.045, sd = 0.20, tw = 0.16, th = 0.04, k = L.rise / L.go, zl = s => L.z0 + s * k;
  const xi0 = L.x0 + sw, xi1 = L.x1 - sw, xs = [L.x0 + sw / 2, L.x1 - sw / 2];
  for (const x of xs) { beam([x, lys(L, 0.04), zl(0.04) - 0.075], [x, lys(L, L.run - 0.06), zl(L.run - 0.06) - 0.075], sw, sd, MAT.oakF, { bevel: 0.004 });
    const ya = lys(L, -0.08), yb = lys(L, L.run); COL.push([x - sw / 2 - 0.004, x + sw / 2 + 0.004, Math.min(ya, yb), Math.max(ya, yb), L.z0, L.z1 + 0.9, 'rail', PH, PH_END]); }
  for (let i = 1; i < L.n; i++) { const s = i * L.go, zt = L.z0 + i * L.rise, ya = lys(L, s), yb = lys(L, s + tw);
    B(xi0, xi1, Math.min(ya, yb), Math.max(ya, yb), zt - th, zt, MAT.oakF, { walk: 'ladder', bevel: 0.003, grain: 'x' }); }
  for (const x of xs) { const sa = 0.08, sb = L.run + 0.06, h = 0.8; rod([x, lys(L, sa), zl(sa) + h], [x, lys(L, sb), zl(sb) + h], 0.021, MAT.oakF);
    for (const s of [0.35, L.run * 0.5, L.run - 0.25]) rod([x, lys(L, s), zl(s) + 0.13], [x, lys(L, s), zl(s) + h - 0.02], 0.007, MAT.blacksteel, 8); } }
const WE = wallOf(EG, DEP), WO = wallOf(OG, DEP), WT = wallOf(TW, DEPT), WOB = wallOf(OGB, DEP);
const EG_ops = { S: [{ a0: 0.45, a1: 2.25, s: 0.75, h: 2.15 }, { a0: 2.75, a1: 3.65, s: 0.75, h: 2.15 }], W: [{ a0: 0.6, a1: 2.5, s: 0.75, h: 2.15 }], E: [{ a0: DOORY[0], a1: DOORY[1], s: zF, h: 2.40 }], N: [] };
const EG_opsB = Object.assign({}, EG_ops, { E: [EG_ops.E[0], { a0: 1.9, a1: 2.5, s: 0.75, h: 2.15 }] });   // B: front door + small window beside the ladder
const bandS = zO + 0.7, bandH = zG - 0.06;
const OG_ops = { W: [{ a0: 0.0, a1: 4.0, s: zO, h: zG }], N: [{ a0: 0.0, a1: 3.1, s: bandS, h: bandH }], S: [{ a0: 0.0, a1: 3.1, s: bandS, h: bandH }], E: [{ a0: DOORY[0], a1: DOORY[1], s: zO, h: zO + 2.1 }] };
// B: window bands N and S between the corner piers (4.0 m), a shorter band in the east wall south of the roof ladder
const OG_opsB = { W: OG_ops.W, N: [{ a0: 0.0, a1: 4.0, s: bandS, h: bandH }], S: [{ a0: 0.0, a1: 4.0, s: bandS, h: bandH }], E: [{ a0: 0.0, a1: 2.0, s: bandS, h: bandH }] };
// tower openings: entrance door (east), slit windows beside the spiral, landing window, glazed band all round the head
const TW_ops = { E: [{ a0: DOORY[0], a1: DOORY[1], s: zT0, h: 2.40 }, { a0: 0.7, a1: 1.4, s: 1.0, h: 2.35 }, { a0: 0.7, a1: 1.4, s: zO + 0.55, h: zO + 2.2 }, { a0: 2.72, a1: 3.46, s: zO + 0.9, h: zO + 2.1 }, { a0: 0.45, a1: 3.55, s: zD + 0.85, h: zD + 2.1 }],
  S: [{ a0: 4.7, a1: 5.8, s: 1.35, h: 2.35 }, { a0: 4.7, a1: 5.8, s: zO + 0.75, h: zO + 1.95 }, { a0: 4.45, a1: 6.2, s: zD + 0.85, h: zD + 2.1 }],
  N: [{ a0: 4.7, a1: 5.8, s: zO + 0.9, h: zO + 2.1 }, { a0: 4.45, a1: 6.2, s: zD + 0.85, h: zD + 2.1 }],
  W: [{ a0: DOORY[0], a1: DOORY[1], s: zD, h: zD + 2.1 }, { a0: 0.45, a1: 2.35, s: zD + 0.85, h: zD + 2.1 }] };
const TW_SEG = [[0.335, zJT], [zJT, zD - 0.27], [zD - 0.27, zTH]];       // three lifts (platform framing): EG, OG, head
const twRange = s => WT.sn(s) ? [TW.x0, TW.x1] : [TW.y0 + 0.2, TW.y1 - 0.2];
const SIDES = ['S', 'N', 'W', 'E'], SNW = ['S', 'N', 'W'];
function ROOF_PARTS() { return [[RF.x0, OG.x1, RF.y0, RF.y1], [OG.x1, RF.x1, RF.y0, TW.y0], [OG.x1, RF.x1, TW.y1, RF.y1]]; }
const TRF = { x0: TW.x0 - 0.3, x1: TW.x1 + 0.3, y0: TW.y0 - 0.3, y1: TW.y1 + 0.3 };   // tower roof plate

// ############################ COMMON: slab, EG walls S/N/W, EG floor, stove ############################
// ======================= PHASE 0/1: existing slab with the tin garage, then cleared =======================
phase(PHN.bestand);
B(-0.15, 4.15, -0.15, 4.15, 0, zS, MAT.conc, { walk: 'stone' });
phase(PHN.bestand, PHN.garage);
{ const gm = MAT.metal, rm = MAT.roofGrey; for (const [x0, x1, y0, y1] of [[0.02, 3.98, 3.9, 3.98], [0.02, 0.1, 0.02, 3.98], [3.9, 3.98, 0.02, 3.98], [0.02, 0.6, 0.02, 0.1], [3.4, 3.98, 0.02, 0.1]]) B(x0, x1, y0, y1, zS, zS + 2.1, gm, { grain: 'z' });
  B(0.6, 3.4, 0.03, 0.09, zS, zS + 2.1, MAT.galv, { grain: 'x' });                                                                            // closed tilt door
  for (let x = 0.3; x < 3.9; x += 0.5) B(x - 0.015, x + 0.015, 0.1, 3.9, zS + 2.1, zS + 2.18, MAT.galv, { col: false, cast: false, grain: 'y' });
  B(-0.08, 4.08, -0.08, 4.08, zS + 2.18, zS + 2.22, rm, { col: false }); }
// ======================= PHASE 2/3: sealing, sill plates, anchors =======================
phase(PHN.abdicht);
B(0.0, 4.0, 0.0, 4.0, zS, zSill, MAT.bitumen, { col: false, cast: false });
phase(PHN.schwellen);
for (const s of SIDES) { const r = WE.sn(s) ? [0, 4] : [SD + 0.122, 4 - SD - 0.122];
  WE.wl(s, r[0], r[1], DEP.stud, zSill, zStud0, MAT.kvh, { grain: WE.sn(s) ? 'x' : 'y', bevel: BV, col: false });
  for (let a = 0.35; a < 3.9; a += 0.8) WE.wl(s, a - 0.02, a + 0.02, [0.17, 0.21], zStud0, zStud0 + 0.012, MAT.galv, { col: false });
  for (const a of [0.12, 3.88]) WE.wl(s, a - 0.045, a + 0.045, [0.262, 0.27], zSill, zSill + 0.26, MAT.galv, { col: false, cast: false }); }
// ======================= PHASE 5-7: EG stud frame, sheathing, insulation (east wall per variant) =======================
phase(PHN.egFrame);
studFrame(WE, 'S', 0, 4, EG_ops.S, zStud0, zE, [0.28, 2.5]); studFrame(WE, 'N', 0, 4, EG_ops.N, zStud0, zE, [0.6, 3.4]); studFrame(WE, 'W', SD + 0.122, 4 - SD - 0.122, EG_ops.W, zStud0, zE, [0.32, 3.0]);
phase(PHN.egOSB); for (const s of SNW) sheath(WE, s, 0, 4, EG_ops[s], zSill, zE, { ins: false, board: false });
phase(PHN.egIns); for (const s of SNW) sheath(WE, s, 0, 4, EG_ops[s], zSill, zE, { osb: false });
// ======================= PHASE 8/9: floor joists over the EG (shared part), braces S/N/W, hold-downs =======================
phase(PHN.joists);
{ const oy = { grain: 'y', bevel: BV, col: false }, ox = { grain: 'x', bevel: BV, col: false };
  for (let x = 0.05; x <= 3.96; x += 0.625) { const xx = Math.min(x, 3.95); if (Math.abs(xx - 3.175) < 0.01) continue; B(xx - JW / 2, xx + JW / 2, OG.y0, OG.y1, zE, zJT, MAT.kvh, oy); }
  B(OG.x0, OG.x0 + JW, OG.y0, OG.y1, zE, zJT, MAT.kvh, oy);
  for (let y = 0.45; y < 3.9; y += 0.625) B(OG.x0, 1.9, y - JW / 2, y + JW / 2, zE, zJT, MAT.kvh, ox);
  phase(PHN.braces);
  for (const [p, q] of [[[0.28, 0.11, 1.9], [0.28, OG.y0 + 0.05, zE - 0.02]], [[2.5, 0.11, 1.9], [2.5, OG.y0 + 0.05, zE - 0.02]], [[0.6, 3.89, 1.9], [0.6, OG.y1 - 0.05, zE - 0.02]], [[3.4, 3.89, 1.9], [3.4, OG.y1 - 0.05, zE - 0.02]],
    [[0.11, 0.32, 1.9], [OG.x0 + 0.05, 0.32, zE - 0.02]], [[0.11, 3.0, 1.9], [OG.x0 + 0.05, 3.0, zE - 0.02]]]) beam(p, q, 0.12, 0.12, MAT.larch, { bevel: BV });
  for (const [x, y] of [[0.3, 0.3], [3.7, 0.3], [0.3, 3.7], [3.7, 3.7]]) B(x - 0.03, x + 0.03, y - 0.03, y + 0.03, zE - 0.6, zJT + 0.3, MAT.galv, { col: false, cast: false }); }
// ======================= PHASE 17: chimney (through either roof) + rain chain =======================
phase(PHN.chimney);
cyl(STV[0], STV[1], zE - 0.2, 8.8, 0.1, MAT.steel, 28, undefined, { col: false }); COL.push([STV[0] - 0.11, STV[0] + 0.11, STV[1] - 0.11, STV[1] + 0.11, zE - 0.2, 9, 'chimney', PH, null]);
{ const c = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.2, 28), MAT.steel); c.position.copy(V(STV[0], STV[1], 8.95)); c.castShadow = true; tagPh(c); scene.add(c);
  cyl(STV[0], STV[1], 8.8, 8.87, 0.11, MAT.black, 20, undefined, { col: false }); }
{ const x = RF.x0 + 0.12, y = RF.y0 + 0.12; for (let z = 0.3; z < zC; z += 0.11) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 14), MAT.brass); r.position.copy(V(x, y, z)); r.rotation.y = (Math.round(z / 0.11) % 2) * Math.PI / 2; r.castShadow = true; tagPh(r); scene.add(r); }
  cyl(x, y, 0, 0.1, 0.34, MAT.stone, 28, 0.36); }
// ======================= PHASE 18/19: EG windows, library door (A: from the tower, B: front door – same opening, opens outwards) =======================
phase(PHN.windows);
windowIn(WE, 'S', 0.45, 2.25, 0.75, 2.15, { mull: [1.35] }); windowIn(WE, 'S', 2.75, 3.65, 0.75, 2.15, {}); windowIn(WE, 'W', 0.6, 2.5, 0.75, 2.15, { mull: [1.55] });
windowIn(WE, 'E', DOORY[0], DOORY[1], zF, 2.40, { door: true, open: true, sill: false });
phase(PHN.doors); hingeDoor('eg', boardLeaf(0.86, 2.06, { glass: [0.2, 0.12, 0.3, 1.6] }), { hx: EG.x1 - 0.04, hy: DOORY[1] - 0.02, a: [0, -1], w: 0.86, sign: 1, z0: zF, z1: zF + 2.06 });
B(EG.x1 - T, EG.x1, DOORY[0], DOORY[1], zF - 0.02, zF, MAT.slate, { walk: 'stone' });
// ======================= PHASE 20/21: EG facade S/N/W, plinth band =======================
for (const ph of [PHN.battens, PHN.cladding]) { phase(ph); const part = ph === PHN.battens ? 'lat' : 'clad'; for (const s of SNW) facade(WE, s, 0, 4, EG_ops[s], zS + 0.12, zE, part); }
B(-0.02, 4.02, -0.02, 4.02, zS, zS + 0.12, MAT.fascia, { col: false });
// ======================= PHASE 26-28: EG floor, clay plaster S/N/W, stove pipe =======================
phase(PHN.floors);
for (let x = 0.4; x < 3.7; x += 0.5) B(x - 0.04, x + 0.04, T, 4 - T, zSill, zSill + 0.12, MAT.kvh, { col: false, cast: false, grain: 'y' });
B(T, 4 - T, T, 4 - T, zSill, zSill + 0.12, MAT.xps, { col: false, cast: false }); B(T, 4 - T, T, 4 - T, zSill + 0.12, zF - 0.02, MAT.osb, { col: false, cast: false });
B(T, 4 - T, T, 4 - T, zF - 0.02, zF, MAT.floorP, { walk: 'wood', grain: 'y', cast: false });
phase(PHN.plaster);
for (const s of SNW) for (const [a0, a1, q0, q1] of cutOps(0, 4, zF, zE, EG_ops[s])) WE.wl(s, a0, a1, DEP.clay, q0, q1, MAT.clay, { col: false, grain: 'z' });
phase(PHN.stove); cyl(0.55, 3.45, zE - 0.5, zO, 0.065, MAT.galv, 16, undefined, { col: false }); B(0.42, 0.68, 3.32, 3.58, zE - 0.6, zE - 0.5, MAT.black, { col: false });
B(0.40, 0.70, 3.30, 3.60, zO, zO + 0.008, MAT.blacksteel, { col: false, cast: false }); B(2.3, 2.6, 1.05, 1.35, zO, zO + 0.008, MAT.blacksteel, { col: false, cast: false });

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

// ############################ VARIANT B: no tower – ladder stairs, trapdoor, roof hatch, OG cantilevered on all sides ############################
varOn('B');
// ======================= PHASE 4: front step =======================
phase(PHN.piles);
B(4.15, 4.65, DOORY[0] - 0.15, DOORY[1] + 0.15, 0, 0.15, MAT.stone, { walk: 'stone', bevel: 0.02 });   // sandstone step in front of the front door, under the cantilever
// ======================= PHASE 5-7: EG east wall with the front door and a small window =======================
phase(PHN.egFrame); studFrame(WE, 'E', SD + 0.122, 4 - SD - 0.122, EG_opsB.E, zStud0, zE, [0.32, 3.68]);
phase(PHN.egOSB); sheath(WE, 'E', 0, 4, EG_opsB.E, zSill, zE, { ins: false, board: false });
phase(PHN.egIns); sheath(WE, 'E', 0, 4, EG_opsB.E, zSill, zE, { osb: false });
// ======================= PHASE 8-10: joists for the 5.8 × 5.8 m OG: cantilevers on all four sides; trapdoor framed by two east cantilever joists and a trimmer =======================
phase(PHN.joists);
{ const oy = { grain: 'y', bevel: BV, col: false }, ox = { grain: 'x', bevel: BV, col: false };
  B(3.175 - JW / 2, 3.175 + JW / 2, OGB.y0, HT1.y0 - JW, zE, zJT, MAT.kvh, oy); B(3.175 - JW / 2, 3.175 + JW / 2, HT1.y1 + JW, OGB.y1, zE, zJT, MAT.kvh, oy);   // joist cut by the opening
  B(HT1.x0 - JW, HT1.x0, HT1.y0, HT1.y1, zE, zJT, MAT.kvh, oy);                                                                                                 // trimmer west of the opening
  B(4.35 - JW / 2, 4.35 + JW / 2, OGB.y0, OGB.y1, zE, zJT, MAT.kvh, oy); B(OGB.x1 - JW, OGB.x1, OGB.y0, OGB.y1, zE, zJT, MAT.kvh, oy);
  B(OGB.x0, OGB.x1, OGB.y0, OGB.y0 + JW, zE, zJT, MAT.kvh, ox); B(OGB.x0, OGB.x1, OGB.y1 - JW, OGB.y1, zE, zJT, MAT.kvh, ox);
  for (const y of ESTUB) B(2.1, OGB.x1, y - JW / 2, y + JW / 2, zE, zJT, MAT.kvh, ox);
  phase(PHN.braces);
  for (const y of [0.32, 3.68]) beam([3.89, y, 1.9], [OGB.x1 - 0.05, y, zE - 0.02], 0.12, 0.12, MAT.larch, { bevel: BV });
  phase(PHN.deck);
  for (const [x0, x1, y0, y1] of rectMinus([OGB.x0 + JW, OGB.x1 - JW, OGB.y0 + JW, OGB.y1 - JW], HT1)) {
    B(x0, x1, y0, y1, zJT, zJT + 0.024, MAT.ceilP, { col: false, cast: false, grain: 'x' }); B(x0, x1, y0, y1, zJT + 0.024, zOSB, MAT.osb, { walk: 'wood', cast: false }); } }
// ======================= PHASE 11-14: OG walls 5.8 × 5.8 m, ring beam, roof joists BSH 12/28 (span 5.8 m) with the roof hatch trimmed out, boarding =======================
phase(PHN.ogFrame);
for (const s of SIDES) { const [a0, a1] = WOB.len(s); const r = WOB.sn(s) ? [a0, a1] : [a0 + SD + 0.122, a1 - SD - 0.122];
  WOB.wl(s, r[0], r[1], DEP.stud, zOSB, zOSB + SW, MAT.kvh, { grain: WOB.sn(s) ? 'x' : 'y', bevel: BV, col: false });
  studFrame(WOB, s, r[0], r[1], OG_opsB[s], zOSB + SW, zG, []); }
phase(PHN.ogSheath);
for (const s of SIDES) { const [a0, a1] = WOB.len(s); sheath(WOB, s, a0, a1, OG_opsB[s], zOSB, zG); }
phase(PHN.ring);
for (const s of SIDES) { const [a0, a1] = WOB.len(s); WOB.wl(s, WOB.sn(s) ? a0 : a0 + SD + 0.122, WOB.sn(s) ? a1 : a1 - SD - 0.122, DEP.stud, zG, zC, MAT.bsh, { grain: WOB.sn(s) ? 'x' : 'y', bevel: BV }); }
{ const JW2 = 0.12, jo = g => ({ grain: g, bevel: BV, col: false });
  for (let y = OGB.y0 + 0.3; y < OGB.y1; y += 0.5) { if (y > HT2.y0 && y < HT2.y1) { B(RFB.x0, HT2.x0 - JW2, y - JW2 / 2, y + JW2 / 2, zC, zRJb, MAT.bsh, jo('x')); B(HT2.x1 + JW2, RFB.x1, y - JW2 / 2, y + JW2 / 2, zC, zRJb, MAT.bsh, jo('x')); }
    else B(RFB.x0, RFB.x1, y - JW2 / 2, y + JW2 / 2, zC, zRJb, MAT.bsh, jo('x')); }
  B(HT2.x0 - JW2, HT2.x0, HT2.y0, HT2.y1, zC, zRJb, MAT.bsh, jo('y')); B(HT2.x1, HT2.x1 + JW2, HT2.y0, HT2.y1, zC, zRJb, MAT.bsh, jo('y'));            // headers (Wechsel) of the roof hatch
  B(RFB.x0, RFB.x1, RFB.y0, RFB.y0 + JW2, zC, zRJb, MAT.kvh, jo('x')); B(RFB.x0, RFB.x1, RFB.y1 - JW2, RFB.y1, zC, zRJb, MAT.kvh, jo('x'));
  B(RFB.x0, RFB.x0 + JW2, RFB.y0, RFB.y1, zC, zRJb, MAT.kvh, jo('y')); B(RFB.x1 - JW2, RFB.x1, RFB.y0, RFB.y1, zC, zRJb, MAT.kvh, jo('y'));
  for (let x = OGB.x0 + 0.25; x < RFB.x1; x += 0.5) { B(x - JW2 / 2, x + JW2 / 2, RFB.y0, OGB.y0 + 0.2, zC, zRJb, MAT.kvh, jo('y')); B(x - JW2 / 2, x + JW2 / 2, OGB.y1 - 0.2, RFB.y1, zC, zRJb, MAT.kvh, jo('y')); } }
const RPB = rectMinus([RFB.x0, RFB.x1, RFB.y0, RFB.y1], HT2);
phase(PHN.roofBoard);
for (const [x0, x1, y0, y1] of RPB) B(x0, x1, y0, y1, zRJb, zRBb, MAT.ceilP, { walk: 'wood', cast: false, grain: 'x' });
// ======================= PHASE 15-17: roof insulation, sealing, hatch curb, fascia, chimney collar =======================
phase(PHN.roofIns);
for (const [x0, x1, y0, y1] of RPB) { B(x0 + 0.01, x1 - 0.01, y0 + 0.01, y1 - 0.01, zRBb, zRBb + 0.002, MAT.foil, { col: false, cast: false }); B(x0, x1, y0, y1, zRBb + 0.002, zRIb, MAT.hfdBoard, { walk: 'wood', cast: false }); }
phase(PHN.roofSeal);
for (const [x0, x1, y0, y1] of RPB) { B(x0, x1, y0, y1, zRIb, zRb, MAT.osb, { walk: 'wood', cast: false }); B(x0 + 0.005, x1 - 0.005, y0 + 0.005, y1 - 0.005, zRb, zRb + 0.004, MAT.epdm, { walk: 'wood', cast: false }); }
// hatch curb (Aufsatzkranz) 6 cm larch, EPDM taken up the outside, steel cap; inside the shaft a larch lining from the ceiling to the curb top
for (const [x0, x1, y0, y1] of [[CK.x0, CK.x1, CK.y0, HT2.y0], [CK.x0, CK.x1, HT2.y1, CK.y1], [CK.x0, HT2.x0, HT2.y0, HT2.y1], [HT2.x1, CK.x1, HT2.y0, HT2.y1]]) {
  B(x0, x1, y0, y1, zRb, zK - 0.012, MAT.larch, { col: false }); B(x0 - 0.004, x1 + 0.004, y0 - 0.004, y1 + 0.004, zK - 0.012, zK, MAT.fascia, { walk: 'wood' }); }
for (const [x0, x1, y0, y1] of [[CK.x0 - 0.004, CK.x1 + 0.004, CK.y0 - 0.004, CK.y0], [CK.x0 - 0.004, CK.x1 + 0.004, CK.y1, CK.y1 + 0.004], [CK.x0 - 0.004, CK.x0, CK.y0, CK.y1], [CK.x1, CK.x1 + 0.004, CK.y0, CK.y1]]) B(x0, x1, y0, y1, zRb, zK - 0.03, MAT.epdm, { col: false, cast: false });
for (const [x0, x1, y0, y1] of [[HT2.x0, HT2.x0 + 0.02, HT2.y0, HT2.y1], [HT2.x1 - 0.02, HT2.x1, HT2.y0, HT2.y1], [HT2.x0, HT2.x1, HT2.y0, HT2.y0 + 0.02], [HT2.x0, HT2.x1, HT2.y1 - 0.02, HT2.y1]]) B(x0, x1, y0, y1, zC, zK - 0.012, MAT.larchIn, { col: false, cast: false });
{ const f = { col: false }, e = 0.025, zt = zRb + 0.06;
  for (const [x0, x1, y0, y1] of [[RFB.x0 - e, RFB.x1 + e, RFB.y0 - e, RFB.y0], [RFB.x0 - e, RFB.x1 + e, RFB.y1, RFB.y1 + e], [RFB.x0 - e, RFB.x0, RFB.y0, RFB.y1], [RFB.x1, RFB.x1 + e, RFB.y0, RFB.y1]]) { B(x0, x1, y0, y1, zC, zt, MAT.fascia, f); COL.push([x0 - 0.01, x1 + 0.01, y0 - 0.01, y1 + 0.01, zC, zt, 'edge', PH, null]); } }
phase(PHN.chimney);
cyl(STV[0], STV[1], zRb, zRb + 0.16, 0.2, MAT.steel, 28, undefined, { col: false }); beam([STV[0], STV[1], 8.0], [0.2, 4.2, zDb], 0.02, 0.02, MAT.steel);
// ======================= PHASE 18/19: windows, roof hatch lid =======================
phase(PHN.windows);
windowIn(WE, 'E', 1.9, 2.5, 0.75, 2.15, {});
windowIn(WOB, 'W', 0.0, 4.0, zO, zG, { mull: [1.0, 2.0, 3.0], sill: false, trans: [zG - 0.42] });
windowIn(WOB, 'N', 0.0, 4.0, bandS, bandH, { mull: [1.0, 2.0, 3.0] }); windowIn(WOB, 'S', 0.0, 4.0, bandS, bandH, { mull: [1.0, 2.0, 3.0] });
windowIn(WOB, 'E', 0.0, 2.0, bandS, bandH, { mull: [1.0] });
phase(PHN.doors);
// glazed roof hatch: insulated lid (larch frame, triple glazing) hinged on the east side of the curb, opens to ~100° and rests there (gas struts)
{ const w = CK.x1 - CK.x0 + 0.04, l = CK.y1 - CK.y0 + 0.04, fw = 0.07, th = 0.06, g = new THREE.Group();
  const part = (x0, x1, z0, z1, y0, y1, m) => { const geo = new RoundedBoxGeometry(x1 - x0, y1 - y0, z1 - z0, 1, 0.006); siteUV(geo, 0, 0, 0, 'x'); const me = new THREE.Mesh(geo, m); me.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2); me.castShadow = true; me.receiveShadow = true; g.add(me); return me; };
  // local frame: X = site x (lid spans -w..0 west of the hinge), Y = up, Z = -site y (lid spans -l..0 north of the south end)
  part(-w, -w + fw, -l, 0, 0, th, MAT.frame); part(-fw, 0, -l, 0, 0, th, MAT.frame); part(-w + fw, -fw, -fw, 0, 0, th, MAT.frame); part(-w + fw, -fw, -l, -l + fw, 0, th, MAT.frame);
  { const gl = new THREE.Mesh(new THREE.BoxGeometry(w - 2 * fw, 0.024, l - 2 * fw), MAT.glass); gl.position.set(-w / 2, th * 0.6, -l / 2); gl.renderOrder = 2; g.add(gl); }
  part(-w + 0.01, -w + 0.03, -l / 2 - 0.12, -l / 2 + 0.12, -0.05, 0, MAT.blacksteel);   // pull handle under the free edge
  const hx = CK.x1 + 0.02, hy = CK.y0 - 0.02;
  flapDoor('roofhatch', g, { hx, hy, z: zK, rot: 'z', open: -0.55 * Math.PI, pos: [(HT2.x0 + HT2.x1) / 2, HT2.y1 + 0.25], label: 'Dachluke', openBox: [hx - 0.04, hx + 0.2, hy, hy + l, zK, zK + w] });
  WALK.push([hx - w, hx, hy, hy + l, zK + th, 'wood', PH, null, 'roofhatch']); }
// ======================= PHASE 20/21: battens and cladding all round (EG east wall, OG 5.8 × 5.8 m), steel bands =======================
for (const ph of [PHN.battens, PHN.cladding]) { phase(ph); const part = ph === PHN.battens ? 'lat' : 'clad';
  facade(WE, 'E', 0, 4, EG_opsB.E, zS + 0.12, zE, part);
  for (const s of SIDES) { const [a0, a1] = WOB.len(s); facade(WOB, s, a0, a1, OG_opsB[s], zOSB, zG, part); } }
for (const s of SIDES) { const [a0, a1] = WOB.len(s); WOB.wl(s, a0 - 0.03, a1 + 0.03, [-0.03, 0.09], zE - 0.02, zJT + 0.03, MAT.fascia, { col: false }); WOB.wl(s, a0 - 0.03, a1 + 0.03, [-0.03, 0.09], zG - 0.05, zC + 0.02, MAT.fascia, { col: false }); }
for (const [x0, x1, y0, y1] of [[OGB.x0 - 0.03, OGB.x1 + 0.03, OGB.y0 - 0.03, OGB.y0 + 0.1], [OGB.x0 - 0.03, OGB.x1 + 0.03, OGB.y1 - 0.1, OGB.y1 + 0.03], [OGB.x0 - 0.03, OGB.x0 + 0.1, OGB.y0, OGB.y1], [OGB.x1 - 0.1, OGB.x1 + 0.03, OGB.y0, OGB.y1]]) B(x0, x1, y0, y1, zE - 0.03, zE, MAT.fascia, { col: false, cast: false });
// ======================= PHASE 22: ladder stair library → work room, trapdoor (lid hinged on the north edge, usually open), guard rails W and E =======================
phase(PHN.stairA);
ladderStair(LAD1);
{ const w = HT1.x1 - HT1.x0 - 0.04, l = HT1.y1 - HT1.y0 - 0.04, g = new THREE.Group();
  // local frame: X = site x (0..w), Y = up (lid -0.04..0, top flush with the floor), Z = -site y (0..l, i.e. southward from the hinge)
  { const geo = new RoundedBoxGeometry(w, 0.04, l, 1, 0.004); siteUV(geo, 0, 0, 0, 'y'); const me = new THREE.Mesh(geo, MAT.floorP); me.position.set(w / 2, -0.02, l / 2); me.castShadow = true; me.receiveShadow = true; g.add(me); }
  for (const x of [0.06, w - 0.06]) { const b = new THREE.Mesh(new RoundedBoxGeometry(0.05, 0.03, l - 0.1, 1, 0.004), MAT.oakF); b.position.set(x, -0.055, l / 2); b.castShadow = true; g.add(b); }   // battens under the lid
  { const r = new THREE.Mesh(new THREE.TorusGeometry(0.03, 0.006, 6, 16), MAT.blacksteel); r.rotation.x = Math.PI / 2; r.position.set(w / 2, 0.003, l - 0.07); g.add(r); }                  // ring pull
  flapDoor('hatch', g, { hx: HT1.x0 + 0.02, hy: HT1.y1 - 0.02, z: zO, rot: 'x', open: -0.53 * Math.PI, pos: [(HT1.x0 + HT1.x1) / 2, HT1.y0 - 0.25], label: 'Bodenluke', openBox: [HT1.x0, HT1.x1, HT1.y1 - 0.04, HT1.y1 + 0.16, zO, zO + l] });
  WALK.push([HT1.x0, HT1.x1, HT1.y0, HT1.y1, zO, 'wood', PH, null, 'hatch']); }   // closed: the whole opening is floor again
railLine([HT1.x0, HT1.y0 + 0.02], [HT1.x0, HT1.y1 + 0.02], zO); railLine([HT1.x1, HT1.y0 + 0.02], [HT1.x1, HT1.y1 + 0.02], zO);
// ======================= PHASE 23: ladder stair work room → roof hatch =======================
phase(PHN.stairB);
ladderStair(LAD2);
// ======================= PHASE 24/25: terrace deck around the hatch, railings, guard rails S and W of the hatch (exit to the north, lid on the east) =======================
phase(PHN.terrace);
{ const CO = { x0: CK.x0 - 0.03, x1: CK.x1 + 0.03, y0: CK.y0 - 0.03, y1: CK.y1 + 0.03 }, dk = { t: MAT.deck, def: MAT.larch };
  for (let y = RFB.y0 + 0.35; y < RFB.y1 - 0.3; y += 0.6) for (const [x0, x1, y0, y1] of rectMinus([RFB.x0 + 0.3, RFB.x1 - 0.3, y - 0.03, y + 0.03], CO)) B(x0, x1, y0, y1, zRb + 0.004, zDb - 0.028, MAT.blacksteel, { col: false, cast: false });
  for (const [x0, x1, y0, y1] of rectMinus([RFB.x0 + 0.3, RFB.x1 - 0.3, RFB.y0 + 0.3, RFB.y1 - 0.3], CO)) B(x0, x1, y0, y1, zDb - 0.028, zDb, dk, { walk: 'wood', grain: 'x' }); }
phase(PHN.railings);
rail([tRB.x1, tRB.y0], [tRB.x1, tRB.y1], zDb, 1.08); rail([tRB.x0, tRB.y1], [tRB.x1, tRB.y1], zDb, 1.08);
glassRail(tRB, zRb, zDb); pvRail(tRB, zRb, zDb);
rail([CK.x0 - 0.06, CK.y0 - 0.06], [CK.x1 + 0.03, CK.y0 - 0.06], zDb, 1.08); rail([CK.x0 - 0.06, CK.y0 - 0.06], [CK.x0 - 0.06, CK.y1 + 0.02], zDb, 1.08);
// ======================= PHASE 26/27: OG floor (oak) with the trapdoor opening and its oak lining, clay plaster =======================
phase(PHN.floors);
for (const [x0, x1, y0, y1] of rectMinus([OGB.x0 + T, OGB.x1 - T, OGB.y0 + T, OGB.y1 - T], HT1)) B(x0, x1, y0, y1, zOSB, zO, MAT.floorP, { walk: 'wood', cast: false, grain: 'y' });
for (const [x0, x1, y0, y1] of [[HT1.x0, HT1.x0 + 0.02, HT1.y0, HT1.y1], [HT1.x1 - 0.02, HT1.x1, HT1.y0, HT1.y1], [HT1.x0, HT1.x1, HT1.y0, HT1.y0 + 0.02], [HT1.x0, HT1.x1, HT1.y1 - 0.02, HT1.y1]]) B(x0, x1, y0, y1, zE, zO - 0.045, MAT.oakF, { col: false, cast: false });
phase(PHN.plaster);
for (const [a0, a1, q0, q1] of cutOps(0, 4, zF, zE, EG_opsB.E)) WE.wl('E', a0, a1, DEP.clay, q0, q1, MAT.clay, { col: false, grain: 'z' });
for (const s of SIDES) { const [b0, b1] = WOB.len(s); for (const [a0, a1, q0, q1] of cutOps(b0, b1, zO, zG, OG_opsB[s])) WOB.wl(s, a0, a1, DEP.clay, q0, q1, MAT.clay, { col: false, grain: 'z' }); }
varOff();

// ---- geometry per variant for the rest of the app (walking labels, sound, viewpoints); window.GEO is updated in place when the variant changes ----
const ladderInfo = L => ({ x0: L.x0, x1: L.x1, y0: Math.min(L.yFoot, L.yTop), y1: Math.max(L.yFoot, L.yTop), z0: L.z0, z1: L.z1, n: L.n, rise: L.rise, go: L.go, dir: L.dir });
const GEO_A = { variant: 'A', zS, zF, zE, zU: zO, zO, zOSB, zG, zC, zR, zD, zTH, zT0, T, TT, EG, OG, TW, RF, SC, SR, PASS, DOORY, STV, tR, PL };
const GEO_B = Object.assign({}, GEO_A, { variant: 'B', zR: zRb, zD: zDb, zK, OG: OGB, RF: RFB, tR: tRB, TW: { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 }, HT1, HT2, CK, LAD1: ladderInfo(LAD1), LAD2: ladderInfo(LAD2) });
window.GEO_A = GEO_A; window.GEO_B = GEO_B; window.GEO = Object.assign({}, VARIANT === 'A' ? GEO_A : GEO_B);
