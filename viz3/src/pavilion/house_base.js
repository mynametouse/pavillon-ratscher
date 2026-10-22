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
const DEP = {
  clad: [0, 0.022],
  lat: [0.022, 0.052],
  kon: [0.052, 0.082],
  hfd: [0.082, 0.122],
  stud: [0.122, 0.262],
  osb: [0.262, 0.277],
  clay: [0.277, 0.292],
};
// stair tower (unheated): boards 22 + battens 30 + wood-fibre board 16 + studs 6/12 + larch lining 15 = 0.203
const TT = 0.203,
  DEPT = {
    clad: [0, 0.022],
    lat: [0.022, 0.052],
    kon: [0.052, 0.068],
    hfd: [0.068, 0.084],
    stud: [0.084, 0.188],
    osb: [0.188, 0.203],
  };
const SW = 0.06,
  SD = 0.14,
  BV = 0.006;
// levels
const zS = 0.15,
  zF = 0.316,
  zSill = zS + 0.004,
  zStud0 = zSill + SW;
const zE = 2.68,
  JD = 0.24,
  JW = 0.1,
  zJT = zE + JD,
  zOSB = zJT + 0.024 + 0.022,
  zO = zOSB + 0.02; // OG floor 2.986
const zG = 5.15,
  RBh = 0.24,
  zC = zG + RBh,
  zRJ = zC + JD,
  zRB = zRJ + 0.024,
  zRI = zRB + 0.2,
  zR = zRI + 0.022,
  zD = zR + 0.004 + 0.04 + 0.028; // terrace 5.948 (A)
// B: the roof joists span the full 5.8 m → BSH 12/28 instead of KVH 12/24, the terrace sits 4 cm higher
const JDB = 0.28,
  zRJb = zC + JDB,
  zRBb = zRJb + 0.024,
  zRIb = zRBb + 0.2,
  zRb = zRIb + 0.022,
  zDb = zRb + 0.004 + 0.04 + 0.028; // terrace 5.988 (B)
// boxes (site coords)
const EG = { x0: 0, x1: 4, y0: 0, y1: 4 };
const OG = { x0: -0.9, x1: 4.0, y0: -0.9, y1: 4.9 };
const TW = { x0: 4.0, x1: 6.6, y0: 0.15, y1: 3.85 }; // stair tower (outer faces); its west side is the house wall, above the roof its own head wall
const RF = { x0: -1.4, x1: 4.5, y0: -1.4, y1: 5.4 }; // house roof plate; the tower rises through its east overhang
const PL = 0.9; // OG corner pier length
const STV = [0.95, 3.25]; // stove
const tR = { x0: RF.x0 + 0.3, x1: RF.x1 - 0.3, y0: RF.y0 + 0.3, y1: RF.y1 - 0.3 }; // terrace railing lines
// spiral stair: axis SC, tread radius SR (Ø 2.16 m), steel column Ø 168 mm; one full turn per storey, rising anticlockwise from the north
const SC = [5.22, 1.47],
  SR = 1.08,
  SCR = 0.084,
  zT0 = zF - 0.016;
const SPA = { z0: zT0, z1: zO, n: 14 },
  SPB = { z0: zO, z1: zD, n: 15 };
for (const f of [SPA, SPB]) {
  f.rise = (f.z1 - f.z0) / f.n;
  f.da = (2 * Math.PI) / f.n;
}
const PASS = { y0: SC[1] + SR, y1: TW.y1 - TT }; // passage / landings along the north side of the tower
const zTH = zD + 2.35; // tower head: top of the walls (glazed lantern above the terrace)
const DOORY = [2.66, 3.52]; // all tower doors in one line: garden → passage → library; landing → work room; head → terrace
// ---- variant B: bigger OG and roof, trapdoor + roof hatch, two ladder stairs ----
const OGB = { x0: -0.9, x1: 4.9, y0: -0.9, y1: 4.9 };
const RFB = { x0: -1.4, x1: 5.4, y0: -1.4, y1: 5.4 };
const tRB = { x0: RFB.x0 + 0.3, x1: RFB.x1 - 0.3, y0: RFB.y0 + 0.3, y1: RFB.y1 - 0.3 };
const HT1 = { x0: 2.88, x1: 3.71, y0: 0.42, y1: 1.72 }; // trapdoor in the OG floor (clear opening), above the SE corner of the library
const HT2 = { x0: 3.78, x1: 4.6, y0: 2.46, y1: 3.84 }; // roof hatch (clear opening inside the curb) along the OG east wall, between two roof joists
const CK = { x0: HT2.x0 - 0.06, x1: HT2.x1 + 0.06, y0: HT2.y0 - 0.06, y1: HT2.y1 + 0.06 }; // outer faces of the hatch curb
const zK = zDb + 0.1; // curb top: 17 cm above the waterproofing, 10 cm above the deck
// ladder stair: n rises between z0 and z1, 63° pitch; it rises in direction `dir` (+1 = north, -1 = south) and its top edge (floor edge) is at yTop
function mkLadder(L) {
  L.rise = (L.z1 - L.z0) / L.n;
  L.go = L.rise / Math.tan((L.deg * Math.PI) / 180);
  L.run = L.n * L.go;
  L.yFoot = L.yTop - L.dir * L.run;
  return L;
}
const lys = (L, s) => L.yFoot + L.dir * s; // site y at run distance s from the foot
const LAD1 = mkLadder({ x0: 2.92, x1: 3.7, yTop: HT1.y0, dir: -1, z0: zF, z1: zO, n: 13, deg: 63 }); // library → work room, rising southward along the east wall
const LAD2 = mkLadder({ x0: 3.8, x1: 4.58, yTop: HT2.y1, dir: 1, z0: zO, z1: zK, n: 15, deg: 63 }); // work room → roof, rising northward along the east wall
const ESTUB = [-0.25, HT1.y0 - JW / 2, HT1.y1 + JW / 2, 2.6, 3.45, 4.2]; // east cantilever joists; the second and third frame the trapdoor
// ---------------- wall helpers for any box ----------------
function wallOf(box, dep) {
  const face = { S: box.y0, N: box.y1, W: box.x0, E: box.x1 },
    dirv = { S: 1, N: -1, W: 1, E: -1 },
    len = s => (s === 'S' || s === 'N' ? [box.x0, box.x1] : [box.y0, box.y1]);
  const rect = (side, a0, a1, d) => {
    const f = face[side],
      k = dirv[side],
      q0 = f + k * d[0],
      q1 = f + k * d[1];
    const lo = Math.min(q0, q1),
      hi = Math.max(q0, q1);
    return side === 'S' || side === 'N' ? [a0, a1, lo, hi] : [lo, hi, a0, a1];
  };
  return {
    box,
    dep,
    face,
    dir: dirv,
    len,
    wl(side, a0, a1, d, z0, z1, m, o = {}) {
      const r = rect(side, a0, a1, d);
      return B(r[0], r[1], r[2], r[3], z0, z1, m, o);
    },
    col(side, a0, a1, d, z0, z1, tag) {
      const r = rect(side, a0, a1, d);
      COL.push([...r, z0, z1, tag, PH, PH_END]);
    },
    rect,
    sn: side => side === 'S' || side === 'N',
  };
}
function cutOps(a0, a1, z0, z1, ops) {
  let parts = [[a0, a1, z0, z1]];
  for (const o of ops) {
    const out = [];
    for (const [p0, p1, q0, q1] of parts) {
      if (o.a1 <= p0 || o.a0 >= p1 || o.h <= q0 || o.s >= q1) {
        out.push([p0, p1, q0, q1]);
        continue;
      }
      if (o.a0 > p0) out.push([p0, o.a0, q0, q1]);
      if (o.a1 < p1) out.push([o.a1, p1, q0, q1]);
      const x0 = Math.max(p0, o.a0),
        x1 = Math.min(p1, o.a1);
      if (o.s > q0) out.push([x0, x1, q0, o.s]);
      if (o.h < q1) out.push([x0, x1, o.h, q1]);
    }
    parts = out;
  }
  return parts.filter(p => p[1] - p[0] > 1e-3 && p[3] - p[2] > 1e-3);
}
// plan rectangle [x0,x1,y0,y1] minus a hole {x0,x1,y0,y1}: up to four rectangles
function rectMinus(r, h) {
  const [x0, x1, y0, y1] = r;
  if (h.x1 <= x0 || h.x0 >= x1 || h.y1 <= y0 || h.y0 >= y1) return [r];
  const out = [];
  if (h.y0 > y0) out.push([x0, x1, y0, h.y0]);
  if (h.y1 < y1) out.push([x0, x1, h.y1, y1]);
  const ya = Math.max(y0, h.y0),
    yb = Math.min(y1, h.y1);
  if (h.x0 > x0) out.push([x0, h.x0, ya, yb]);
  if (h.x1 < x1) out.push([h.x1, x1, ya, yb]);
  return out;
}
// stud frame of one wall side between a0..a1 (along), z0 (sill top) .. z1 (top of double plate)
function studFrame(W, side, a0, a1, ops, z0, z1, extraPosts = [], sw = SW) {
  const d = W.dep.stud,
    g = W.sn(side) ? 'x' : 'y';
  const studs = new Set();
  ops = ops.filter(o => o.s >= z0 - 0.08 && o.h <= z1);
  for (let a = a0 + 0.03; a < a1; a += 0.625) studs.add(+a.toFixed(3));
  studs.add(+(a1 - 0.03).toFixed(3));
  for (const p of extraPosts) studs.add(p);
  for (const o of ops) {
    studs.add(+(o.a0 - sw / 2 - 0.01).toFixed(3));
    studs.add(+(o.a1 + sw / 2 + 0.01).toFixed(3));
  }
  for (const a of [...studs].filter(a => a >= a0 + 0.02 && a <= a1 - 0.02).sort((p, q) => p - q)) {
    const inOp = ops.find(o => a > o.a0 && a < o.a1);
    if (!inOp) W.wl(side, a - sw / 2, a + sw / 2, d, z0, z1 - 2 * sw, MAT.kvh, { grain: 'z', bevel: BV, col: false });
    else {
      if (inOp.s > z0 + 0.1)
        W.wl(side, a - sw / 2, a + sw / 2, d, z0, inOp.s - sw, MAT.kvh, { grain: 'z', bevel: BV, col: false });
      if (inOp.h + 0.2 < z1 - 2 * sw)
        W.wl(side, a - sw / 2, a + sw / 2, d, inOp.h + 0.2, z1 - 2 * sw, MAT.kvh, {
          grain: 'z',
          bevel: BV,
          col: false,
        });
    }
  }
  for (const o of ops) {
    W.wl(side, o.a0 - sw - 0.01, o.a1 + sw + 0.01, d, o.h, Math.min(o.h + 0.2, z1 - 2 * sw), MAT.kvh, {
      grain: g,
      bevel: BV,
      col: false,
    });
    if (o.s > z0 + 0.1)
      W.wl(side, o.a0 - sw - 0.01, o.a1 + sw + 0.01, d, o.s - sw, o.s, MAT.kvh, { grain: g, bevel: BV, col: false });
  }
  W.wl(side, a0, a1, d, z1 - 2 * sw, z1 - sw, MAT.kvh, { grain: g, bevel: BV, col: false });
  W.wl(side, a0, a1, d, z1 - sw, z1, MAT.kvh, { grain: g, bevel: BV, col: false });
}
function sheath(W, side, a0, a1, ops, z0, z1, { ins = true, osb = true, board = true, osbM = MAT.osb } = {}) {
  if (ins)
    for (const [p0, p1, q0, q1] of cutOps(a0, a1, z0 + 0.06, z1 - 0.12, ops))
      W.wl(side, p0, p1, [W.dep.stud[0] + 0.004, W.dep.stud[1] - 0.004], q0, q1, MAT.hfd, { col: false, cast: false });
  if (osb)
    for (const [p0, p1, q0, q1] of cutOps(a0, a1, z0, z1, ops)) {
      W.wl(side, p0, p1, W.dep.osb, q0, q1, osbM, { col: false, grain: osbM === MAT.osb ? undefined : 'z' });
      W.col(side, p0, p1, W.dep.osb, q0, q1, 'wall');
    }
  if (board)
    for (const [p0, p1, q0, q1] of cutOps(a0, a1, z0, z1, ops))
      W.wl(side, p0, p1, W.dep.hfd, q0, q1, MAT.hfdBoard, { col: false });
}
function facade(W, side, a0, a1, ops, z0, z1, part = 'all', clad = MAT.char) {
  const g = W.sn(side) ? 'x' : 'y';
  if (part !== 'clad') {
    for (let a = a0 + 0.03; a < a1; a += 0.625)
      for (const [p0, p1, q0, q1] of cutOps(a - 0.025, a + 0.025, z0, z1, ops))
        W.wl(side, p0, p1, W.dep.kon, q0, q1, MAT.kvh, { col: false, cast: false, grain: 'z' });
    for (let z = z0 + 0.1; z < z1; z += 0.625)
      for (const [p0, p1, q0, q1] of cutOps(a0, a1, z - 0.025, z + 0.025, ops))
        W.wl(side, p0, p1, W.dep.lat, q0, q1, MAT.kvh, { col: false, cast: false, grain: g });
  }
  if (part === 'lat') return;
  for (const [p0, p1, q0, q1] of cutOps(a0, a1, z0, z1, ops)) {
    W.wl(side, p0, p1, W.dep.clad, q0, q1, clad, { col: false, grain: 'z' });
    W.col(side, p0, p1, [0, W.dep.hfd[1]], q0, q1, 'wall');
  }
  const ops2 = ops.map(o => ({ a0: o.a0 - 0.05, a1: o.a1 + 0.05, s: o.s - 0.04, h: o.h + 0.03 }));
  for (let a = a0 + 0.08; a < a1 - 0.04; a += 0.16)
    for (const [p0, p1, q0, q1] of cutOps(a - 0.022, a + 0.022, z0, z1, ops2))
      W.wl(side, p0, p1, [-0.022, 0], q0, q1, clad, { col: false, cast: false, grain: 'z' });
}
// timber window in a wall of box W: fixed glazing in an oiled larch frame set 13.5 cm behind the outer face
function windowIn(
  W,
  side,
  a0,
  a1,
  s,
  h,
  { mull = [], door = false, open = false, sill = true, trans = [], glassDepth = 0.135 } = {}
) {
  const fw = 0.08,
    depth = 0.09,
    rv = W.sn(side),
    f = W.face[side],
    k = W.dir[side],
    c = f + k * Math.min(glassDepth, W.dep.osb[1] - 0.05),
    inner = f + k * (W.dep.clay ? W.dep.clay[1] : W.dep.osb[1]);
  const box = (p0, p1, zz0, zz1, m, cc = c, dd = depth) => {
    const q0 = cc - dd / 2,
      q1 = cc + dd / 2;
    return rv
      ? B(p0, p1, Math.min(q0, q1), Math.max(q0, q1), zz0, zz1, m, { bevel: 0.004, col: false })
      : B(Math.min(q0, q1), Math.max(q0, q1), p0, p1, zz0, zz1, m, { bevel: 0.004, col: false });
  };
  box(a0, a1, h - fw, h, MAT.frame);
  if (!door) box(a0, a1, s, s + fw, MAT.frame);
  box(a0, a0 + fw, s, h, MAT.frame);
  box(a1 - fw, a1, s, h, MAT.frame);
  for (const m of mull) box(m - fw / 2, m + fw / 2, s, h, MAT.frame);
  for (const tz of trans) box(a0, a1, tz - fw / 2, tz + fw / 2, MAT.frame);
  const lo = Math.min(f, inner),
    hi = Math.max(f, inner),
    RV = W.dep === DEPT ? MAT.towerIn : MAT.larchIn;
  if (rv) {
    B(a0 - 0.02, a0, lo, hi, s, h, RV, { col: false });
    B(a1, a1 + 0.02, lo, hi, s, h, RV, { col: false });
    B(a0, a1, lo, hi, h, h + 0.02, RV, { col: false });
  } else {
    B(lo, hi, a0 - 0.02, a0, s, h, RV, { col: false });
    B(lo, hi, a1, a1 + 0.02, s, h, RV, { col: false });
    B(lo, hi, a0, a1, h, h + 0.02, RV, { col: false });
  }
  if (sill && !door) {
    const so = f - k * 0.045;
    if (rv) B(a0 - 0.03, a1 + 0.03, Math.min(so, c), Math.max(so, c), s - 0.03, s, MAT.fascia, { col: false });
    else B(Math.min(so, c), Math.max(so, c), a0 - 0.03, a1 + 0.03, s - 0.03, s, MAT.fascia, { col: false });
    if (rv) B(a0, a1, Math.min(c, inner), Math.max(c, inner), s - 0.025, s, MAT.oakF, { col: false });
    else B(Math.min(c, inner), Math.max(c, inner), a0, a1, s - 0.025, s, MAT.oakF, { col: false });
  }
  if (!open) {
    const panes = [a0 + fw, ...mull.flatMap(m => [m - fw / 2, m + fw / 2]), a1 - fw];
    for (let q = 0; q < panes.length; q += 2) {
      const g = rv
        ? B(panes[q], panes[q + 1], c - 0.012, c + 0.012, s + (door ? 0 : fw), h - fw, MAT.glass, {
            cast: false,
            col: false,
          })
        : B(c - 0.012, c + 0.012, panes[q], panes[q + 1], s + (door ? 0 : fw), h - fw, MAT.glass, {
            cast: false,
            col: false,
          });
      g.renderOrder = 2;
    }
    if (rv) COL.push([a0, a1, lo, hi, s, h, 'glass', PH, null]);
    else COL.push([lo, hi, a0, a1, s, h, 'glass', PH, null]);
  }
}
// steel railing (posts, oak handrail, round bars) along a straight edge + collider
function railLine(p0, p1, z0, h = 1.0) {
  const [x0, y0] = p0,
    [x1, y1] = p1,
    L = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.round(L / 1.0));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n,
      y = y0 + ((y1 - y0) * i) / n;
    B(x - 0.02, x + 0.02, y - 0.02, y + 0.02, z0, z0 + h, MAT.blacksteel, { col: false });
  }
  beam([x0, y0, z0 + h], [x1, y1, z0 + h], 0.05, 0.04, MAT.oakF, { bevel: 0.004 });
  for (let t = 0.11; t < L; t += 0.11) {
    const x = x0 + ((x1 - x0) * t) / L,
      y = y0 + ((y1 - y0) * t) / L;
    beam([x, y, z0 + 0.06], [x, y, z0 + h - 0.02], 0.008, 0.008, MAT.blacksteel, { cast: false });
  }
  COL.push([
    Math.min(x0, x1) - 0.04,
    Math.max(x0, x1) + 0.04,
    Math.min(y0, y1) - 0.04,
    Math.max(y0, y1) + 0.04,
    z0,
    z0 + h,
    'rail',
    PH,
    PH_END,
  ]);
}
// terrace railing: larch posts, handrail, steel cables
function rail(p0, p1, z0, h, { rails = [0.12], posts = 1.45, m = MAT.larch } = {}) {
  const [x0, y0] = p0,
    [x1, y1] = p1;
  const L = Math.hypot(x1 - x0, y1 - y0);
  const n = Math.max(1, Math.round(L / posts));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n,
      y = y0 + ((y1 - y0) * i) / n;
    B(x - 0.04, x + 0.04, y - 0.04, y + 0.04, z0 - 0.3, z0 + h, m, { bevel: BV, grain: 'z' });
  }
  beam([x0, y0, z0 + h], [x1, y1, z0 + h], 0.11, 0.045, m, { bevel: BV });
  for (const f of rails) beam([x0, y0, z0 + h * f], [x1, y1, z0 + h * f], 0.04, 0.04, m, { bevel: BV });
  for (let t = 0.08; t < L; t += 0.11) {
    const x = x0 + ((x1 - x0) * t) / L,
      y = y0 + ((y1 - y0) * t) / L;
    beam([x, y, z0 + h * 0.12], [x, y, z0 + h * 0.98], 0.006, 0.006, MAT.steel, { cast: false });
  }
  const d = 0.05;
  COL.push([
    Math.min(x0, x1) - d,
    Math.max(x0, x1) + d,
    Math.min(y0, y1) - d,
    Math.max(y0, y1) + d,
    z0,
    z0 + h,
    'rail',
    PH,
    null,
  ]);
}
// west windbreak: laminated glass between larch posts (sunset stays free)
function glassRail(t, zRx, zDx) {
  const g = B(t.x0 - 0.012, t.x0 + 0.012, t.y0 + 0.05, t.y1 - 0.05, zDx + 0.08, zDx + 1.04, MAT.glass, {
    cast: false,
    col: false,
  });
  g.renderOrder = 2;
  for (let y = t.y0; y <= t.y1 + 1e-6; y += (t.y1 - t.y0) / 4)
    B(t.x0 - 0.045, t.x0 + 0.045, y - 0.045, y + 0.045, zRx - 0.1, zDx + 1.08, MAT.larch, { bevel: BV, grain: 'z' });
  beam([t.x0, t.y0, zDx + 1.08], [t.x0, t.y1, zDx + 1.08], 0.11, 0.045, MAT.larch, { bevel: BV });
  beam([t.x0, t.y0, zDx + 0.06], [t.x0, t.y1, zDx + 0.06], 0.07, 0.07, MAT.larch, { bevel: BV });
  COL.push([t.x0 - 0.05, t.x0 + 0.05, t.y0, t.y1, zDx, zDx + 1.1, 'rail', PH, null]);
}
// south parapet: four glass–glass PV modules between larch posts
let PVM = null;
function pvRail(t, zRx, zDx) {
  if (!PVM) {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const g = c.getContext('2d');
    g.fillStyle = '#0f1626';
    g.fillRect(0, 0, 256, 256);
    g.strokeStyle = '#2c3850';
    g.lineWidth = 2;
    for (let i = 1; i < 6; i++) {
      g.beginPath();
      g.moveTo((i * 256) / 6, 0);
      g.lineTo((i * 256) / 6, 256);
      g.stroke();
    }
    for (let i = 1; i < 10; i++) {
      g.beginPath();
      g.moveTo(0, i * 25.6);
      g.lineTo(256, i * 25.6);
      g.stroke();
    }
    g.strokeStyle = '#56637c';
    g.lineWidth = 1;
    for (let i = 0; i < 6; i++)
      for (let k = 0; k < 3; k++) {
        g.beginPath();
        g.moveTo((i * 256) / 6 + 10 + k * 10, 0);
        g.lineTo((i * 256) / 6 + 10 + k * 10, 256);
        g.stroke();
      }
    const tx = new THREE.CanvasTexture(c);
    tx.colorSpace = THREE.SRGBColorSpace;
    PVM = plain({ map: tx, roughness: 0.12, metalness: 0.3 });
  }
  const n = 4,
    span = (t.x1 - 0.1 - t.x0 - 0.1) / n;
  for (let i = 0; i < n; i++) {
    const xa = t.x0 + 0.1 + i * span + 0.03;
    const pm = B(
      xa,
      xa + span - 0.06,
      t.y0 - 0.02,
      t.y0 + 0.02,
      zDx + 0.05,
      zDx + 1.02,
      { s: PVM, n: MAT.pvframe, def: MAT.pvframe },
      { col: false }
    );
    {
      const uv = pm.geometry.attributes.uv;
      for (let k = 0; k < uv.count; k++) uv.setXY(k, k % 2, (k >> 1) % 2);
    }
    B(xa, xa + span - 0.06, t.y0 - 0.025, t.y0 + 0.025, zDx + 0.05, zDx + 0.08, MAT.pvframe, { col: false });
    B(xa, xa + span - 0.06, t.y0 - 0.025, t.y0 + 0.025, zDx + 0.99, zDx + 1.02, MAT.pvframe, { col: false });
  }
  for (let i = 0; i <= n; i++) {
    const x = t.x0 + 0.1 + i * span;
    B(x - 0.045, x + 0.045, t.y0 - 0.045, t.y0 + 0.045, zRx - 0.1, zDx + 1.08, MAT.larch, { bevel: BV, grain: 'z' });
  }
  beam([t.x0, t.y0, zDx + 1.08], [t.x1, t.y0, zDx + 1.08], 0.11, 0.045, MAT.larch, { bevel: BV });
  COL.push([t.x0, t.x1, t.y0 - 0.05, t.y0 + 0.05, zDx, zDx + 1.1, 'rail', PH, null]);
}
// round member between two site points (handrails, brackets)
function rod(p, q, r, m, seg = 12) {
  const a = V(...p),
    b = V(...q),
    L = a.distanceTo(b);
  const g = new THREE.CylinderGeometry(r, r, L, seg);
  g.rotateX(Math.PI / 2);
  const me = new THREE.Mesh(g, m);
  me.position.copy(a.clone().add(b).multiplyScalar(0.5));
  me.lookAt(b);
  me.castShadow = true;
  me.receiveShadow = true;
  scene.add(me);
  return tagPh(me);
}
// ladder stair (Leitertreppe): two oak stringers 4.5 × 20 cm, oak treads 16 cm deep and 4 cm thick (open risers – every tread reaches under the
// next one, so there is no gap underfoot), round oak handrails on steel brackets 80 cm above the nosing line, running on past the top edge as grab rails.
// Treads are walk surfaces of type 'ladder' (slower walking, stair sound); the stringers are colliders.
function ladderStair(L) {
  const sw = 0.045,
    sd = 0.2,
    tw = 0.16,
    th = 0.04,
    k = L.rise / L.go,
    zl = s => L.z0 + s * k;
  const xi0 = L.x0 + sw,
    xi1 = L.x1 - sw,
    xs = [L.x0 + sw / 2, L.x1 - sw / 2];
  for (const x of xs) {
    beam([x, lys(L, 0.04), zl(0.04) - 0.075], [x, lys(L, L.run - 0.06), zl(L.run - 0.06) - 0.075], sw, sd, MAT.oakF, {
      bevel: 0.004,
    });
    const ya = lys(L, -0.08),
      yb = lys(L, L.run);
    COL.push([
      x - sw / 2 - 0.004,
      x + sw / 2 + 0.004,
      Math.min(ya, yb),
      Math.max(ya, yb),
      L.z0,
      L.z1 + 0.9,
      'rail',
      PH,
      PH_END,
    ]);
  }
  for (let i = 1; i < L.n; i++) {
    const s = i * L.go,
      zt = L.z0 + i * L.rise,
      ya = lys(L, s),
      yb = lys(L, s + tw);
    B(xi0, xi1, Math.min(ya, yb), Math.max(ya, yb), zt - th, zt, MAT.oakF, {
      walk: 'ladder',
      bevel: 0.003,
      grain: 'x',
    });
  }
  for (const x of xs) {
    const sa = 0.08,
      sb = L.run + 0.06,
      h = 0.8;
    rod([x, lys(L, sa), zl(sa) + h], [x, lys(L, sb), zl(sb) + h], 0.021, MAT.oakF);
    for (const s of [0.35, L.run * 0.5, L.run - 0.25])
      rod([x, lys(L, s), zl(s) + 0.13], [x, lys(L, s), zl(s) + h - 0.02], 0.007, MAT.blacksteel, 8);
  }
}
const WE = wallOf(EG, DEP),
  WO = wallOf(OG, DEP),
  WT = wallOf(TW, DEPT),
  WOB = wallOf(OGB, DEP);
const EG_ops = {
  S: [
    { a0: 0.45, a1: 2.25, s: 0.75, h: 2.15 },
    { a0: 2.75, a1: 3.65, s: 0.75, h: 2.15 },
  ],
  W: [{ a0: 0.6, a1: 2.5, s: 0.75, h: 2.15 }],
  E: [{ a0: DOORY[0], a1: DOORY[1], s: zF, h: 2.4 }],
  N: [],
};
const EG_opsB = Object.assign({}, EG_ops, { E: [EG_ops.E[0], { a0: 1.9, a1: 2.5, s: 0.75, h: 2.15 }] }); // B: front door + small window beside the ladder
const bandS = zO + 0.7,
  bandH = zG - 0.06;
const OG_ops = {
  W: [{ a0: 0.0, a1: 4.0, s: zO, h: zG }],
  N: [{ a0: 0.0, a1: 3.1, s: bandS, h: bandH }],
  S: [{ a0: 0.0, a1: 3.1, s: bandS, h: bandH }],
  E: [{ a0: DOORY[0], a1: DOORY[1], s: zO, h: zO + 2.1 }],
};
// B: window bands N and S between the corner piers (4.0 m), a shorter band in the east wall south of the roof ladder
const OG_opsB = {
  W: OG_ops.W,
  N: [{ a0: 0.0, a1: 4.0, s: bandS, h: bandH }],
  S: [{ a0: 0.0, a1: 4.0, s: bandS, h: bandH }],
  E: [{ a0: 0.0, a1: 2.0, s: bandS, h: bandH }],
};
// tower openings: entrance door (east), slit windows beside the spiral, landing window, glazed band all round the head
const TW_ops = {
  E: [
    { a0: DOORY[0], a1: DOORY[1], s: zT0, h: 2.4 },
    { a0: 0.7, a1: 1.4, s: 1.0, h: 2.35 },
    { a0: 0.7, a1: 1.4, s: zO + 0.55, h: zO + 2.2 },
    { a0: 2.72, a1: 3.46, s: zO + 0.9, h: zO + 2.1 },
    { a0: 0.45, a1: 3.55, s: zD + 0.85, h: zD + 2.1 },
  ],
  S: [
    { a0: 4.7, a1: 5.8, s: 1.35, h: 2.35 },
    { a0: 4.7, a1: 5.8, s: zO + 0.75, h: zO + 1.95 },
    { a0: 4.45, a1: 6.2, s: zD + 0.85, h: zD + 2.1 },
  ],
  N: [
    { a0: 4.7, a1: 5.8, s: zO + 0.9, h: zO + 2.1 },
    { a0: 4.45, a1: 6.2, s: zD + 0.85, h: zD + 2.1 },
  ],
  W: [
    { a0: DOORY[0], a1: DOORY[1], s: zD, h: zD + 2.1 },
    { a0: 0.45, a1: 2.35, s: zD + 0.85, h: zD + 2.1 },
  ],
};
const TW_SEG = [
  [0.335, zJT],
  [zJT, zD - 0.27],
  [zD - 0.27, zTH],
]; // three lifts (platform framing): EG, OG, head
const twRange = s => (WT.sn(s) ? [TW.x0, TW.x1] : [TW.y0 + 0.2, TW.y1 - 0.2]);
const SIDES = ['S', 'N', 'W', 'E'],
  SNW = ['S', 'N', 'W'];
function ROOF_PARTS() {
  return [
    [RF.x0, OG.x1, RF.y0, RF.y1],
    [OG.x1, RF.x1, RF.y0, TW.y0],
    [OG.x1, RF.x1, TW.y1, RF.y1],
  ];
}
const TRF = { x0: TW.x0 - 0.3, x1: TW.x1 + 0.3, y0: TW.y0 - 0.3, y1: TW.y1 + 0.3 }; // tower roof plate
