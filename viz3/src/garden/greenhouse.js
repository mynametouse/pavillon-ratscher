bldBegin('greenhouse', 'Gewächshaus', BLD.greenhouse.c, { short: 'Gewächshaus', pad: 0.05 });
// ===== Gewächshaus (2,0 × 1,4 m) direkt nördlich vom Holzhaus: Alu-Rahmen, Glas, Satteldach, Tür zur Gartenseite (West), Tomaten und Gurken =====
{
  const b = BLD.greenhouse,
    g = siteGroup(b);
  const hx = b.L / 2,
    hy = b.W / 2,
    ze = 1.35,
    zr = 1.95,
    f = 0.03,
    dy = 0.32;
  const r = rotDesc(b);
  gB(g, -hx, hx, -hy, hy, 0, 0.12, MAT.alu, { cast: false });
  for (const sx of [-1, 1])
    for (const sy of [-1, 1])
      gB(g, sx * hx - f, sx * hx + f, sy * hy - f, sy * hy + f, 0.12, ze, MAT.alu, { grain: 'z' });
  for (const sy of [-1, 1]) gB(g, -hx, hx, sy * hy - f, sy * hy + f, ze - f, ze + f, MAT.alu, { grain: 'x' });
  gB(g, -hx, hx, -f, f, zr - f, zr + f, MAT.alu, { grain: 'x' });
  for (const sx of [-1, 1])
    for (const sy of [-1, 1]) beam([sx * hx, sy * hy, ze], [sx * hx, 0, zr], 0.04, 0.04, MAT.alu, { parent: g });
  for (const i of [-0.33, 0.33])
    for (const sy of [-1, 1]) {
      gB(g, i * hx * 2 - f, i * hx * 2 + f, sy * hy - f, sy * hy + f, 0.12, ze, MAT.alu, { grain: 'z' });
      beam([i * hx * 2, sy * hy, ze], [i * hx * 2, 0, zr], 0.03, 0.03, MAT.alu, { parent: g });
    }
  for (const y of [-dy, dy]) gB(g, -hx - f, -hx + f, y - f, y + f, 0.12, ze, MAT.alu, { grain: 'z' });
  gB(g, -hx - f, -hx + f, -dy, dy, 1.33, ze, MAT.alu, { grain: 'y' }); // Türrahmen
  const glass = (x0, x1, y0, y1, z0, z1) => {
    const m = gB(g, x0, x1, y0, y1, z0, z1, MAT.glass, { cast: false, recv: false });
    if (m) m.renderOrder = 2;
  };
  for (const sy of [-1, 1]) glass(-hx, hx, sy * hy - 0.003, sy * hy + 0.003, 0.12, ze);
  glass(hx - 0.003, hx + 0.003, -hy, hy, 0.12, ze);
  glass(-hx - 0.003, -hx + 0.003, -hy, -dy, 0.12, ze);
  glass(-hx - 0.003, -hx + 0.003, dy, hy, 0.12, ze);
  for (const sx of [-1, 1]) {
    const sh = new THREE.Shape();
    sh.moveTo(-hy, 0);
    sh.lineTo(hy, 0);
    sh.lineTo(0, zr - ze);
    sh.closePath();
    const geo = new THREE.ShapeGeometry(sh);
    const me = new THREE.Mesh(geo, MAT.glass);
    me.position.copy(V(sx * hx, 0, ze));
    me.rotation.y = Math.PI / 2;
    me.renderOrder = 2;
    me.userData.noMerge = true;
    g.add(me);
    tagPh(me);
  }
  for (const sy of [-1, 1]) {
    const m = slopeSlab(
      g,
      0,
      (sy * hy) / 2,
      (ze + zr) / 2 + 0.02,
      b.L + 0.06,
      hy + 0.02,
      0.006,
      sy * -1 * (zr - ze),
      MAT.glass,
      { cast: false }
    );
    m.renderOrder = 2;
  }
  gB(g, -hx + 0.12, hx - 0.12, -hy + 0.08, -0.27, 0.12, 0.42, MAT.plank, { grain: 'x' });
  gB(g, -hx + 0.12, hx - 0.12, 0.27, hy - 0.08, 0.12, 0.42, MAT.plank, { grain: 'x' });
  gB(g, -hx + 0.14, hx - 0.14, -hy + 0.1, -0.29, 0.3, 0.4, MAT.soil, { cast: false });
  gB(g, -hx + 0.14, hx - 0.14, 0.29, hy - 0.1, 0.3, 0.4, MAT.soil, { cast: false });
  gB(g, -hx + 0.02, hx - 0.12, -0.27, 0.27, 0.12, 0.14, MAT.stone, { cast: false });
  const fernItems = [];
  for (let i = 0; i < 4; i++) {
    const lx = -hx + 0.35 + (i * (b.L - 0.7)) / 3,
      ly = -0.45;
    gB(g, lx - 0.012, lx + 0.012, ly - 0.012, ly + 0.012, 0.4, 1.7, MATS.stake, { grain: 'z', cast: false });
    for (let k = 0; k < 4; k++) {
      const z = 0.6 + k * 0.28;
      const s = new THREE.Mesh(new THREE.SphereGeometry(0.14 + rnd() * 0.05, 8, 6), MATS.leaf);
      s.position.copy(V(lx + (rnd() - 0.5) * 0.12, ly + (rnd() - 0.5) * 0.1, z));
      s.scale.set(1, 0.6, 1);
      s.castShadow = true;
      g.add(s);
      tagPh(s);
      if (k > 0 && rnd() < 0.8) {
        const t = new THREE.Mesh(new THREE.SphereGeometry(0.03 + rnd() * 0.012, 8, 6), MATS.tomato);
        t.position.copy(V(lx + (rnd() - 0.5) * 0.2, ly + 0.12 * (rnd() > 0.5 ? 1 : -1), z - 0.12));
        g.add(t);
        tagPh(t);
      }
    }
    const w = worldOf(b, lx + 0.05, 0.45);
    fernItems.push({ x: w[0], y: w[1], z: 0.4, s: 1.0 + rnd() * 0.3 });
  }
  if (MODELS.fern) instanceVariants('fern', fernItems, { cast: true, env: 0.6, tint: 0xd9f0b8 });
  lwalk(r, -hx - 0.05, hx - 0.12, -0.27, 0.27, 0.14, 'stone');
  lcol(r, -hx - 0.03, hx + 0.03, hy - 0.02, hy + 0.05, 0, 1.4, 'glass');
  lcol(r, -hx - 0.03, hx + 0.03, -hy - 0.05, -hy + 0.02, 0, 1.4, 'glass');
  lcol(r, hx - 0.02, hx + 0.05, -hy, hy, 0, 1.4, 'glass');
  lcol(r, -hx - 0.05, -hx + 0.02, -hy, -dy, 0, 1.4, 'glass');
  lcol(r, -hx - 0.05, -hx + 0.02, dy, hy, 0, 1.4, 'glass');
  lcol(r, -hx + 0.1, hx - 0.1, -hy + 0.06, -0.27, 0.12, 0.8, 'bed');
  lcol(r, -hx + 0.1, hx - 0.1, 0.27, hy - 0.06, 0.12, 0.8, 'bed');
  ldoor('greenhouse', b, glassLeaf(0.64, 1.21), {
    lx: -hx - 0.01,
    ly: -dy,
    dir: [0, 1],
    w: 0.64,
    sign: 1,
    z0: 0.12,
    z1: 1.33,
  });
  INSIDE.push({ b, hx, hy, ox: 0, oy: 0, z0: 0, z1: 2.0, name: 'Gewächshaus' });
  FOOT.push({ b, hx: hx + 0.05, hy: hy + 0.05, ox: 0, oy: 0 });
}

bldEnd(BLD.greenhouse);
