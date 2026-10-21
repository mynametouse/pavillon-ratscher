bldBegin('bungalow', 'Bungalow', BLD.bungalow.c, { short: 'Bungalow', pad: 0.3 });
// ===== D: grüner Bungalow (5,0 × 5,0 m) wie der Wohnwagen zur Pforte ausgerichtet: Giebel mit Haustür und zwei Fenstern mit Läden nach Norden, First Nord–Süd, Hintertür im Südgiebel =====
// local frame (az 0): +x = north (front gable), −x = south (back gable), +y = west, −y = east
{ const b = BLD.bungalow, g = siteGroup(b); const hx = b.L / 2, hy = b.W / 2, z0 = 0.12, zw = 2.15, pitch = 0.42, zr = zw + hy * pitch, T = 0.1, L = 0.012, zf = 0.14; const r = rotDesc(b);
  gB(g, -hx - 0.05, hx + 0.05, -hy - 0.05, hy + 0.05, 0, z0, MAT.conc, { cast: false });
  const DF = { a0: -0.45, a1: 0.45, s: z0, h: 2.02 }, DB = { a0: 0.9, a1: 1.7, s: z0, h: 2.02 };
  const OPS = { E: [DF, { a0: -1.95, a1: -1.15, s: 0.95, h: 1.8 }, { a0: 1.15, a1: 1.95, s: 0.95, h: 1.8 }],      // front (north): window – door – window
    W: [DB, { a0: -1.5, a1: -0.7, s: 0.95, h: 1.8 }],                                                                // back (south)
    N: [{ a0: -1.35, a1: -0.55, s: 1.15, h: 1.8 }, { a0: 0.55, a1: 1.35, s: 0.95, h: 1.8 }],                         // west side (kitchen window higher)
    S: [{ a0: -0.4, a1: 0.4, s: 0.95, h: 1.8 }] };                                                                   // east side
  const wm = MATS.greenBoards;
  lw(g, 'x', -hx, hx, hy - T + L, hy, z0, zw, OPS.N, wm, { grain: 'x' }); lw(g, 'x', -hx + T, hx - T, hy - T, hy - T + L, zf, zw, OPS.N, IW, { cast: false });
  lw(g, 'x', -hx, hx, -hy, -hy + T - L, z0, zw, OPS.S, wm, { grain: 'x' }); lw(g, 'x', -hx + T, hx - T, -hy + T - L, -hy + T, zf, zw, OPS.S, IW, { cast: false });
  lw(g, 'y', -hy + T - L, hy - T + L, -hx, -hx + T - L, z0, zw, OPS.W, wm, { grain: 'y' }); lw(g, 'y', -hy + T, hy - T, -hx + T - L, -hx + T, zf, zw, OPS.W, IW, { cast: false });
  lw(g, 'y', -hy + T - L, hy - T + L, hx - T + L, hx, z0, zw, OPS.E, wm, { grain: 'y' }); lw(g, 'y', -hy + T, hy - T, hx - T, hx - T + L, zf, zw, OPS.E, IW, { cast: false });
  gB(g, -hx + T, hx - T, -hy + T, hy - T, z0, zf, MAT.plank, { grain: 'x', cast: false }); gB(g, -hx + T, hx - T, -hy + T, hy - T, zw - 0.02, zw, ICEIL, { cast: false });
  // white trim: corner boards, windows with shutters, door linings
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) gB(g, sx > 0 ? hx - 0.02 : -hx - 0.02, sx > 0 ? hx + 0.02 : -hx + 0.02, sy > 0 ? hy - 0.12 : -hy - 0.02, sy > 0 ? hy + 0.02 : -hy + 0.12, z0, zw, MATS.white, { cast: false });
  for (const [run, tc, tOut, k, ops] of [['x', hy - T / 2, hy, 1, OPS.N], ['x', -hy + T / 2, -hy, -1, OPS.S], ['y', -hx + T / 2, -hx, -1, OPS.W], ['y', hx - T / 2, hx, 1, OPS.E]])
    for (const o of ops) { if (o.s <= z0) { ljamb(g, run, o.a0, o.a1, Math.min(tOut, tOut + 0.03 * k), Math.max(tOut, tOut + 0.03 * k), z0, o.h, MATS.white, 0.06); continue; }
      lwin(g, run, o.a0, o.a1, tc, o.s, o.h, { frame: MATS.white, fw: 0.05, depth: T + 0.02, mull: [(o.a0 + o.a1) / 2] }); lshut(g, run, o.a0, o.a1, tOut, k, o.s, o.h, MATS.white);
      lbox(g, run, o.a0 - 0.04, o.a1 + 0.04, Math.min(tOut, tOut + 0.06 * k), Math.max(tOut, tOut + 0.06 * k), o.s - 0.04, o.s, MATS.white, { cast: false }); }
  // roof prism along local x (first north–south, green gable triangles north and south), eaves to east and west, white fascia and barge boards
  { const sh = new THREE.Shape(); sh.moveTo(-hy, 0); sh.lineTo(0, zr - zw); sh.lineTo(hy, 0); sh.closePath(); const geo = new THREE.ExtrudeGeometry(sh, { depth: b.L, bevelEnabled: false }); geo.translate(0, 0, -b.L / 2);
    { const uv = geo.attributes.uv, p = geo.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getZ(i), p.getY(i)); }
    const me = new THREE.Mesh(geo, [MATS.greenBoards, MATS.whiteRoof]); me.rotation.y = Math.PI / 2; me.position.copy(V(0, 0, zw)); me.castShadow = true; me.receiveShadow = true; g.add(me); tagPh(me); }
  const ovx = 0.5, ovy = 0.45; const ze = zw - ovy * pitch;
  for (const sy of [-1, 1]) { slopeSlab(g, 0, sy * (hy + ovy) / 2, ze + (hy + ovy) * pitch / 2 + 0.035, b.L + 2 * ovx, hy + ovy, 0.06, -sy * (hy + ovy) * pitch, MATS.whiteRoof);
    gB(g, -hx - ovx, hx + ovx, sy * (hy + ovy) - 0.015, sy * (hy + ovy) + 0.015, ze - 0.19, ze + 0.02, MATS.white, { grain: 'x', cast: false });
    for (const sx of [-1, 1]) beam([sx * (hx + ovx), sy * (hy + ovy), ze - 0.09], [sx * (hx + ovx), 0, ze + (hy + ovy) * pitch - 0.09], 0.03, 0.2, MATS.white, { parent: g }); }
  // front terrace (north) with doormat and a chair beside the west window, back step (south)
  gB(g, hx + 0.05, hx + 1.6, -1.3, 1.3, 0, 0.08, MAT.conc, { cast: false }); gB(g, hx + 0.1, hx + 0.55, -0.4, 0.4, 0.08, 0.1, MATS.felt, { cast: false });
  gB(g, hx + 0.85, hx + 1.35, 0.6, 1.1, 0.44, 0.48, MAT.sage, { cast: false }); gB(g, hx + 0.85, hx + 1.35, 1.04, 1.1, 0.48, 0.92, MAT.sage, { cast: false });
  for (const [x, y] of [[hx + 0.88, 0.63], [hx + 1.32, 0.63], [hx + 0.88, 1.07], [hx + 1.32, 1.07]]) gB(g, x - 0.015, x + 0.015, y - 0.015, y + 0.015, 0.08, 0.44, MAT.sage, { grain: 'z', cast: false });
  gB(g, -hx - 0.6, -hx - 0.05, 0.8, 1.8, 0, 0.08, MAT.conc, { cast: false });
  // interior: a free walk from the front door to the back door along the middle; table with four chairs in the west half, kitchen on the west wall at the back, daybed on the east wall at the back, shelf east by the front
  const xi0 = -hx + T, xi1 = hx - T, yi0 = -hy + T, yi1 = hy - T;
  gB(g, xi0 + 0.02, -0.15, yi1 - 0.6, yi1 - 0.02, zf, zf + 0.88, MAT.larchIn); gB(g, xi0, -0.13, yi1 - 0.62, yi1, zf + 0.88, zf + 0.92, MATS.white, { cast: false });
  cyl(-0.95, yi1 - 0.31, zf + 0.92, zf + 0.93, 0.17, SINK, 18, undefined, { parent: g, cast: false }); gB(g, -1.95, -1.55, yi1 - 0.5, yi1 - 0.12, zf + 0.925, zf + 0.945, MAT.black, { cast: false });
  gB(g, xi0 + 0.02, -1.45, yi1 - 0.35, yi1 - 0.02, zf + 1.45, zf + 1.85, MAT.larchIn, { cast: false });
  RB(-0.45, 1.65, 0.35, 2.05, zf, zf + 0.012, 0.005, MAT.rug, { parent: g, cast: false });
  gB(g, 0.2, 1.0, 0.6, 1.8, zf + 0.72, zf + 0.76, MAT.oak); for (const [x, y] of [[0.26, 0.66], [0.94, 0.66], [0.26, 1.74], [0.94, 1.74]]) gB(g, x - 0.025, x + 0.025, y - 0.025, y + 0.025, zf, zf + 0.72, MAT.oak, { grain: 'z', cast: false });
  for (const [lx, ly, f] of [[1.28, 0.9, 0], [1.28, 1.5, 0], [-0.08, 0.9, 180], [-0.08, 1.5, 180]]) { const w = worldOf(b, lx, ly); placeGLB('desk_chair', { x: w[0], y: w[1], z: zf, face: f, h: 0.9, col: false }); lcol(r, lx - 0.21, lx + 0.21, ly - 0.21, ly + 0.21, zf, zf + 0.9, 'chair'); }
  gB(g, xi0 + 0.02, xi0 + 2.02, yi0 + 0.02, yi0 + 0.92, zf, zf + 0.42, MAT.larchIn); gB(g, xi0 + 0.04, xi0 + 2.0, yi0 + 0.04, yi0 + 0.9, zf + 0.42, zf + 0.58, MAT.linen, { cast: false });
  RB(xi0 + 0.06, xi0 + 1.98, yi0 + 0.06, yi0 + 0.88, zf + 0.58, zf + 0.66, 0.03, MAT.sage, { parent: g }); RB(xi0 + 0.06, xi0 + 0.6, yi0 + 0.1, yi0 + 0.85, zf + 0.62, zf + 0.76, 0.05, MAT.woolLight, { parent: g });
  gB(g, 0.7, 2.2, yi0 + 0.02, yi0 + 0.3, zf, zf + 1.8, MAT.oak, { grain: 'z' }); for (const z of [0.4, 0.8, 1.2, 1.6]) gB(g, 0.72, 2.18, yi0 + 0.03, yi0 + 0.29, zf + z, zf + z + 0.025, MAT.oak, { cast: false });
  { const w = worldOf(b, 1.45, yi0 + 0.16); placeGLB('books', { x: w[0], y: w[1], z: zf + 0.825, face: -90, w: 0.5, col: false }); }
  { const w = worldOf(b, 0.6, 1.2); placeGLB('bowl', { x: w[0], y: w[1], z: zf + 0.76, face: 0, w: 0.3, col: false }); }
  lwalk(r, -hx, hx, -hy, hy, zf); lwalk(r, hx, hx + 1.6, -1.3, 1.3, 0.08, 'stone'); lwalk(r, -hx - 0.6, -hx, 0.8, 1.8, 0.08, 'stone');
  lwc(r, 'y', -hy, hy, hx - T, hx + 0.02, 0, zw + 0.3, [DF]); lwc(r, 'y', -hy, hy, -hx - 0.02, -hx + T, 0, zw + 0.3, [DB]); lcol(r, -hx, hx, hy - T, hy + 0.02, 0, zw + 0.3); lcol(r, -hx, hx, -hy - 0.02, -hy + T, 0, zw + 0.3);
  lcol(r, 0.2, 1.0, 0.6, 1.8, zf + 0.3, zf + 0.76, 'table'); lcol(r, xi0, -0.15, yi1 - 0.62, yi1, zf, zf + 0.92, 'kitchen'); lcol(r, xi0, xi0 + 2.02, yi0, yi0 + 0.92, zf, zf + 0.66, 'bed'); lcol(r, 0.7, 2.2, yi0, yi0 + 0.3, zf, zf + 1.8, 'shelf');
  lcol(r, hx + 0.8, hx + 1.4, 0.55, 1.15, 0.08, 0.92, 'chair');
  // both doors open outwards: front door hinged at its east jamb, back door at its west jamb
  ldoor('bungalowN', b, boardLeaf(0.9, 1.88, { boards: false, mat: MATS.white, glass: [0.45, 0.4, 1.25, 1.7] }), { lx: hx - 0.03, ly: -0.45, dir: [0, 1], w: 0.9, sign: -1, z0: zf, z1: zf + 1.88 });
  ldoor('bungalowS', b, boardLeaf(0.8, 1.88, { boards: true, mat: MATS.white }), { lx: -hx + 0.03, ly: 1.7, dir: [0, -1], w: 0.8, sign: -1, z0: zf, z1: zf + 1.88 });
  // lived-in details outside (photo-scanned, real size): rubber boots by the front door, a painted bench on the north side, a rain barrel at the east corner
  { const P = (id, lx, ly, f, o = {}) => { const w = worldOf(b, lx, ly); placeGLB(id, Object.assign({ x: w[0], y: w[1], z: 0, face: faceOf(b, f) }, o)); };
    P('boots', hx + 0.32, 0.45, 180, { col: false }); P('bench_out', hx + 0.42, 1.55, 180); P('rain_barrel', hx - 0.35, -hy - 0.4, 0); }
  INSIDE.push({ b, hx, hy, ox: 0, oy: 0, z0: 0, z1: zw + 0.8, name: 'Bungalow' }); FOOT.push({ b, hx: hx + 0.1, hy: hy + 0.1, ox: 0, oy: 0 });
}

bldEnd(BLD.bungalow);
