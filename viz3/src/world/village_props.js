// ===================== V16e the village centre after photos: old school with bell tower and clock, Dorflinde, fountain, street lamps =====================
// Places from the photographs with camera positions (Wikimedia Commons, see world/village.js) and OpenStreetMap: the old school of 1828
// (building 215, half-timbering in ox-blood red, slate gables) gets its ridge turret – slate, a clock on each side that shows the game time,
// louvred belfry, bell-shaped cap, ball and weather vane – and the fire siren; the Dorflinde planted in 1888 on the green of the Anger
// (a generated lime, the measured crowns there are hidden) with a ring of benches on paving; the sunken sandstone fountain on its paved
// square (OSM amenity=fountain) with flowers, bench and lantern; the school bus stop with its shelter and the post box; a signpost.
// Street lamps in the lantern style of the photos along the village streets (OSM ways near houses), lit at night: glowing heads, light
// on the ground beneath, and the eight nearest light the facades (world/village.js, uLampV). Collisions: walls and posts are added to
// RATSCHER.walls / RATSCHER.treeXY before world/worldcol.js builds its grid (module order).
const VPROPS = (() => {
  const S = { on: false, ready: false, lamps: [], meshes: [], ANGER: [222, -108], LINDE: [216.5, -106.5], FOUNTAIN: [191.3, -114.4] };
  if (!window.RATSCHER || !RATSCHER.on) return S;
  const hh = n => { const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
  const lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4), L = (r, g, b) => [lin(r), lin(g), lin(b)];
  const gz = (x, y) => RATSCHER.hMesh ? RATSCHER.hMesh(x, y) : RATSCHER.hAt(x, y);
  const tex = (k, m, srgb) => (window.TEXMAN && TEXMAN[k]) ? texFile(texFileOf(k, m), srgb).tex : null;
  // ---- a small geometry kit in site coordinates (x east, y north, z up), flat normals, uv in metres, vertex colours ----
  function kit() {
    const P = [], N = [], U = [], C = [], KA = []; let kk = 0;
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const K = {
      tri(a, b, c, col, ua = [0, 0], ub = [1, 0], uc = [1, 1]) { const n = crs(sub(b, a), sub(c, a)), l = Math.hypot(...n) || 1;
        for (const [p, u] of [[a, ua], [b, ub], [c, uc]]) { P.push(p[0], p[2], -p[1]); N.push(n[0] / l, n[2] / l, -n[1] / l); U.push(u[0], u[1]); C.push(col[0], col[1], col[2]); KA.push(kk); } },
      kind(v) { kk = v; return K; },   // a material kind per vertex (world/village_near.js)
      quad(a, b, c, d, col, w = 1, h = 1) { K.tri(a, b, c, col, [0, 0], [w, 0], [w, h]); K.tri(a, c, d, col, [0, 0], [w, h], [0, h]); },   // a b c d counter-clockwise seen from outside
      // a box from z0 to z0 + sz, turned by rot (radians, counter-clockwise) about its centre
      box(cx, cy, z0, sx, sy, sz, rot, col, bottom) { const c = Math.cos(rot), s = Math.sin(rot), p = (x, y, z) => [cx + x * c - y * s, cy + x * s + y * c, z];
        const x0 = -sx / 2, x1 = sx / 2, y0 = -sy / 2, y1 = sy / 2, z1 = z0 + sz;
        K.quad(p(x1, y0, z0), p(x1, y1, z0), p(x1, y1, z1), p(x1, y0, z1), col, sy, sz); K.quad(p(x1, y1, z0), p(x0, y1, z0), p(x0, y1, z1), p(x1, y1, z1), col, sx, sz);
        K.quad(p(x0, y1, z0), p(x0, y0, z0), p(x0, y0, z1), p(x0, y1, z1), col, sy, sz); K.quad(p(x0, y0, z0), p(x1, y0, z0), p(x1, y0, z1), p(x0, y0, z1), col, sx, sz);
        K.quad(p(x0, y0, z1), p(x1, y0, z1), p(x1, y1, z1), p(x0, y1, z1), col, sx, sy); if (bottom) K.quad(p(x0, y1, z0), p(x1, y1, z0), p(x1, y0, z0), p(x0, y0, z0), col, sx, sy); },
      // a surface of revolution: profile [[r, z], …] from the bottom up, seg sides, first side at angle a0
      lathe(cx, cy, z0, prof, seg, col, a0 = 0) { for (let i = 0; i + 1 < prof.length; i++) for (let k = 0; k < seg; k++) {
          const t0 = a0 + k / seg * Math.PI * 2, t1 = a0 + (k + 1) / seg * Math.PI * 2, [r0, h0] = prof[i], [r1, h1] = prof[i + 1];
          const a = [cx + Math.cos(t0) * r0, cy + Math.sin(t0) * r0, z0 + h0], b = [cx + Math.cos(t1) * r0, cy + Math.sin(t1) * r0, z0 + h0], c = [cx + Math.cos(t1) * r1, cy + Math.sin(t1) * r1, z0 + h1], d = [cx + Math.cos(t0) * r1, cy + Math.sin(t0) * r1, z0 + h1];
          const w = (t1 - t0) * Math.max(r0, r1), h = Math.hypot(r1 - r0, h1 - h0); if (r0 > 1e-4) K.tri(a, b, c, col, [0, 0], [w, 0], [w, h]); if (r1 > 1e-4) K.tri(a, c, d, col, [0, 0], [w, h], [0, h]); } },
      cyl(cx, cy, z0, z1, r0, r1, seg, col, top) { K.lathe(cx, cy, z0, top ? [[r0, 0], [r1, z1 - z0], [0, z1 - z0]] : [[r0, 0], [r1, z1 - z0]], seg, col); },
      ball(cx, cy, cz, r, col, seg = 8) { const pr = []; for (let i = 0; i <= 6; i++) { const a = -Math.PI / 2 + i / 6 * Math.PI; pr.push([Math.cos(a) * r, Math.sin(a) * r]); } K.lathe(cx, cy, cz, pr, seg, col); },
      disc(cx, cy, cz, nx, ny, R, col, seg = 16, two = true) { const rx = -ny, ry = nx, pt = a => [cx + rx * Math.sin(a) * R, cy + ry * Math.sin(a) * R, cz + Math.cos(a) * R];
        for (let k = 0; k < seg; k++) { const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2, c = [cx, cy, cz]; K.tri(c, pt(a1), pt(a0), col); if (two) K.tri(c, pt(a0), pt(a1), col); } },
      empty: () => !P.length,
      geo() { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
        g.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(C, 3)); if (KA.some(v => v)) g.setAttribute('aK', new THREE.Float32BufferAttribute(KA, 1)); g.computeBoundingSphere(); return g; } };
    return K; }
  const mesh = (g, m) => { const me = new THREE.Mesh(g, m); me.userData.noMerge = true; me.castShadow = false; me.receiveShadow = false; scene.add(me); S.meshes.push(me); return me; };
  function texMat(t, tile, o) { const m = new THREE.MeshStandardMaterial(Object.assign({ vertexColors: true, roughness: 0.9, envMapIntensity: 0.6 }, o));
    if (t) { m.defines = { USE_UV: '' }; m.onBeforeCompile = sh => { sh.uniforms.tKit = { value: t }; sh.fragmentShader = 'uniform sampler2D tKit;\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
      diffuseColor.rgb *= texture2D( tKit, vUv * ${(1 / tile).toFixed(4)} ).rgb / max( textureLod( tKit, vec2( 0.5 ), 12.0 ).rgb, vec3( 0.01 ) );`); }; }
    m.customProgramCacheKey = () => 'v16e-kit' + tile; return m; }
  // ---- colours (sRGB from the photos, linear here) ----
  const PAVE = L(0.42, 0.41, 0.39), SL = L(0.27, 0.29, 0.32), SLD = L(0.20, 0.21, 0.24), WOOD = L(0.40, 0.27, 0.17), WOODD = L(0.30, 0.20, 0.13), STONE = L(0.62, 0.58, 0.50), IRON = L(0.12, 0.12, 0.12);
  // ---- the old school: ridge turret with clocks, siren (building 215, ridge along the long axis; the turret at the west-north-west end) ----
  const CLK = { hands: null, dials: [], last: -1 };
  function school(kP, kM) { const b = window.VILLAGE && VILLAGE.byId.get(215); if (!b) return;
    const G = b.fac.filter(f => f.kind === 'gable'); if (G.length < 2) return;
    const ap = f => [f.ax + f.dx * f.uA, f.ay + f.dy * f.uA, b.foot + f.tA], A0 = ap(G[0]), A1 = ap(G[1]), W = A0[0] < A1[0] ? A0 : A1, E = A0[0] < A1[0] ? A1 : A0;   // apexes; the west one
    const Lr = Math.hypot(E[0] - W[0], E[1] - W[1]), dx = (E[0] - W[0]) / Lr, dy = (E[1] - W[1]) / Lr, rot = Math.atan2(dy, dx), zr = (W[2] + E[2]) / 2;
    const cx = W[0] + dx * 3.2, cy = W[1] + dy * 3.2;
    kP.box(cx, cy, zr - 2.4, 1.8, 1.8, 4.1, rot, SL);                         // base, slate, from inside the roof to the clocks' top
    kP.box(cx, cy, zr + 1.7, 2.02, 2.02, 0.13, rot, SLD);                       // cornice
    kP.box(cx, cy, zr + 1.83, 1.42, 1.42, 1.12, rot, L(0.04, 0.04, 0.045));    // belfry, dark inside
    for (const [px, py] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) { const c = Math.cos(rot), s = Math.sin(rot), ox = px * 0.66, oy = py * 0.66; kP.box(cx + ox * c - oy * s, cy + ox * s + oy * c, zr + 1.83, 0.3, 0.3, 1.12, rot, SL); }
    for (let side = 0; side < 4; side++) for (let k = 0; k < 6; k++) {   // louvres
      const a = rot + side * Math.PI / 2, c = Math.cos(a), s = Math.sin(a); kP.box(cx + c * 0.72, cy + s * 0.72, zr + 1.95 + k * 0.165, 0.08, 1.05, 0.05, a, L(0.16, 0.16, 0.17)); }
    kP.box(cx, cy, zr + 2.95, 1.86, 1.86, 0.12, rot, SLD);
    kP.lathe(cx, cy, zr + 3.07, [[1.08, 0], [1.02, 0.12], [0.82, 0.38], [0.62, 0.62], [0.5, 0.86], [0.46, 1.0], [0.36, 1.15], [0.2, 1.36], [0.07, 1.6], [0.0, 1.72]], 8, SL, rot + Math.PI / 8);   // bell-shaped cap, eight sides
    kM.cyl(cx, cy, zr + 4.6, zr + 6.15, 0.035, 0.025, 6, L(0.25, 0.25, 0.24)); kM.ball(cx, cy, zr + 5.05, 0.14, L(0.55, 0.47, 0.25));
    { const c = Math.cos(rot), s = Math.sin(rot); kM.box(cx + c * 0.28, cy + s * 0.28, zr + 5.6, 0.55, 0.02, 0.28, rot, L(0.18, 0.18, 0.18)); kM.box(cx, cy, zr + 5.45, 0.9, 0.025, 0.025, rot, L(0.18, 0.18, 0.18)); }   // vane
    // clock dials on the four sides of the base (the hands follow the game clock)
    for (let side = 0; side < 4; side++) { const a = rot + side * Math.PI / 2, nx = Math.cos(a), ny = Math.sin(a); CLK.dials.push({ x: cx + nx * 0.915, y: cy + ny * 0.915, z: zr + 1.05, nx, ny }); }
    // the fire siren on a mast at the middle of the ridge
    const mx = W[0] + dx * Lr * 0.55, my = W[1] + dy * Lr * 0.55; kM.cyl(mx, my, zr - 0.5, zr + 1.1, 0.045, 0.04, 6, L(0.4, 0.4, 0.4)); kM.cyl(mx, my, zr + 1.1, zr + 1.32, 0.32, 0.3, 10, L(0.45, 0.46, 0.46), true);
    S.school = { cx, cy, zr, rot }; }
  function clockDial() { const c = document.createElement('canvas'); c.width = c.height = 256; const x = c.getContext('2d');
    x.fillStyle = '#20262c'; x.beginPath(); x.arc(128, 128, 127, 0, 7); x.fill(); x.fillStyle = '#f2efe6'; x.beginPath(); x.arc(128, 128, 116, 0, 7); x.fill();
    x.fillStyle = '#16181a'; x.font = 'bold 30px Georgia, serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
    ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'].forEach((t, i) => { const a = i / 12 * Math.PI * 2; x.save(); x.translate(128 + Math.sin(a) * 88, 128 - Math.cos(a) * 88); x.rotate(a); x.fillText(t, 0, 0); x.restore(); });
    for (let i = 0; i < 60; i++) { const a = i / 60 * Math.PI * 2, r0 = i % 5 ? 108 : 104; x.lineWidth = i % 5 ? 2 : 4; x.beginPath(); x.moveTo(128 + Math.sin(a) * r0, 128 - Math.cos(a) * r0); x.lineTo(128 + Math.sin(a) * 114, 128 - Math.cos(a) * 114); x.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; }
  function clockMeshes() { if (!CLK.dials.length) return;
    const pos = [], nrm = [], uv = [], R = 0.44, seg = 28;
    for (const d of CLK.dials) { const rx = -d.ny, ry = d.nx, pt = a => [d.x + rx * Math.sin(a) * R, d.y + ry * Math.sin(a) * R, d.z + Math.cos(a) * R], tu = a => [0.5 + 0.5 * Math.sin(a), 0.5 + 0.5 * Math.cos(a)];
      for (let k = 0; k < seg; k++) { const a0 = k / seg * Math.PI * 2, a1 = (k + 1) / seg * Math.PI * 2;   // centre, a1, a0: counter-clockwise seen from outside
        for (const [p, u] of [[[d.x, d.y, d.z], [0.5, 0.5]], [pt(a1), tu(a1)], [pt(a0), tu(a0)]]) { pos.push(p[0], p[2], -p[1]); nrm.push(d.nx, 0, -d.ny); uv.push(u[0], u[1]); } } }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    mesh(g, new THREE.MeshStandardMaterial({ map: clockDial(), roughness: 0.5, envMapIntensity: 0.5, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 }));
    const hg = new THREE.BufferGeometry(); hg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(CLK.dials.length * 2 * 6 * 3), 3)); hg.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(CLK.dials.length * 2 * 6 * 3), 3));
    CLK.hands = mesh(hg, new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5, metalness: 0.4, side: THREE.DoubleSide })); CLK.hands.frustumCulled = false; clockSet(true); }
  function clockSet(force) { if (!CLK.hands) return; const t = window.CLOCK ? CLOCK.t : (Date.now() / 60000), m = Math.floor(t); if (!force && m === CLK.last) return; CLK.last = m;
    const hrs = ((t / 60) % 12 + 12) % 12, mins = ((t % 60) + 60) % 60; CLK.h = hrs; CLK.m = mins; const P = CLK.hands.geometry.attributes.position.array, N = CLK.hands.geometry.attributes.normal.array; let o = 0;
    for (const d of CLK.dials) { const rx = -d.ny, ry = d.nx, off = 0.02;
      for (const [ang, len, w] of [[hrs / 12 * Math.PI * 2, 0.24, 0.035], [mins / 60 * Math.PI * 2, 0.36, 0.025]]) { const ux = Math.sin(ang), uz = Math.cos(ang);   // along the hand: right·sin + up·cos
        const pt = (s, t2) => [d.x + d.nx * off + rx * (ux * s + uz * t2), d.y + d.ny * off + ry * (ux * s + uz * t2), d.z + (uz * s - ux * t2)];
        const q = [pt(-0.06, -w / 2), pt(len, -w / 2), pt(len, w / 2), pt(-0.06, w / 2)];
        for (const p of [q[0], q[1], q[2], q[0], q[2], q[3]]) { P[o] = p[0]; P[o + 1] = p[2]; P[o + 2] = -p[1]; N[o] = d.nx; N[o + 1] = 0; N[o + 2] = -d.ny; o += 3; } } }
    CLK.hands.geometry.attributes.position.needsUpdate = true; CLK.hands.geometry.attributes.normal.needsUpdate = true; CLK.hands.geometry.computeBoundingSphere(); markDirty(); }
  // ---- the Dorflinde (1888): a generated lime, 21 m (twice the ridges around it in the photo); the measured crowns there are hidden ----
  function hideTrees(x, y, r) { const m4 = new THREE.Matrix4(), z0 = new THREE.Matrix4().makeScale(0, 0, 0);
    for (const im of [...(RATSCHER.trees || []), ...(RATSCHER.mid || [])]) { let ch = false; for (let i = 0; i < im.count; i++) { im.getMatrixAt(i, m4); const e = m4.elements; if (Math.hypot(e[12] - x, -e[14] - y) < r) { im.setMatrixAt(i, z0); ch = true; } } if (ch) im.instanceMatrix.needsUpdate = true; }
    const T = RATSCHER.treeXY; if (T && T.length) { const keep = []; for (let i = 0; i + 2 < T.length; i += 3) if (Math.hypot(T[i] - x, T[i + 1] - y) >= r) keep.push(T[i], T[i + 1], T[i + 2]); T.length = 0; T.push(...keep); } }
  function linde(kP, kS) { const [x, y] = S.LINDE, z = gz(x, y); hideTrees(x, y, 7);
    let K = null; try { K = buildTreeKind({ key: 'linde', preset: 'Oak Large', seed: 1888, tint: 0x93b474, mod: o => {   // a broad, dense crown down to 3 m (photo 2026)
      Object.assign(o.branch.angle, { 1: 60, 2: 44, 3: 34 }); Object.assign(o.branch.children, { 0: 12, 1: 7, 2: 4 }); Object.assign(o.branch.length, { 0: 40, 1: 31, 2: 16, 3: 8 });
      o.branch.start['1'] = 0.2; o.branch.radius['0'] = 3.6; o.branch.gnarliness['1'] = 0.07; o.branch.force.strength = 0.006;
      o.leaves.type = 'oak'; o.leaves.count = 18; o.leaves.size = 5.6; o.leaves.sizeVariance = 0.55; o.leaves.start = 0.0; } }); } catch (e) { console.warn('linde', e); }
    if (K) { const s = 21 / K.H, m4 = new THREE.Matrix4().compose(V(x, y, z - 0.15), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.7), new THREE.Vector3(s * 1.2, s, s * 1.2)); S.lindeR = K.R * s * 1.2;
      K.bg.applyMatrix4(m4); K.lg.applyMatrix4(m4); K.leaf.envMapIntensity = 0.35; K.leaf.roughness = 0.95;   // less sky sheen on the leaves (backlit they looked frosted)   // in place, in world coordinates: VEG.lod and the frustum test both read the bounding sphere as world space
      const bark = new THREE.Mesh(K.bg, K.bark), leaf = new THREE.Mesh(K.lg, K.leaf), lo = new THREE.Mesh(thinCards(K.lg, 0.4, 1.45), K.leaf);
      for (const me of [bark, leaf, lo]) { me.userData.noMerge = true; me.castShadow = false; me.receiveShadow = false; me.geometry.computeBoundingSphere(); scene.add(me); S.meshes.push(me); }
      leaf.boundingSphere = leaf.geometry.boundingSphere; lo.visible = false; VEG.lod.push({ hi: leaf, lo, d: 70 }); S.lindeMeshes = [bark, leaf, lo]; }   // full crown within 70 m
    // paving under the tree and a ring of benches with their backs to the trunk
    S.pave.push({ c: [x + 0.6, y], r: 5.4 });
    for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2 + 0.3; bench(kP, x + Math.cos(a) * 2.25, y + Math.sin(a) * 2.25, a, 1.7); }
    S.trunks.push([x, y, 32]); }
  // ---- benches: wooden slats on two cast-iron frames; faces the direction a (radians) ----
  function bench(k, x, y, a, len = 1.8) { const z = gz(x, y), c = Math.cos(a), s = Math.sin(a), rot = a + Math.PI / 2;
    for (let i = 0; i < 3; i++) k.box(x + c * (0.12 - i * 0.13), y + s * (0.12 - i * 0.13), z + 0.42, len, 0.11, 0.035, rot, i % 2 ? WOOD : WOODD);   // seat
    for (let i = 0; i < 2; i++) k.box(x - c * 0.3, y - s * 0.3, z + 0.58 + i * 0.16, len, 0.03, 0.1, rot, WOOD);   // back
    for (const t of [-len / 2 + 0.15, len / 2 - 0.15]) { const px = x - s * t, py = y + c * t; k.box(px, py, z, 0.06, 0.46, 0.42, rot, IRON); k.box(px - c * 0.3, py - s * 0.3, z, 0.05, 0.05, 0.86, rot, IRON); }
    S.benches.push([x - s * len / 2, y + c * len / 2, x + s * len / 2, y - c * len / 2]); }
  // ---- the fountain: sunken sandstone basin with copings, steps down on the south side, flowers on the corners ----
  function fountain(kS, kP) { const [x, y] = S.FOUNTAIN, z = gz(x, y) + 0.04, ox = 2.6, oy = 1.9, t = 0.42, h = 0.62, dep = 0.75;
    const wall = (cx, cy, sx, sy) => { kS.box(cx, cy, z - dep, sx, sy, h + dep, 0, STONE); kS.box(cx, cy, z + h, sx + 0.1, sy + 0.1, 0.12, 0, L(0.68, 0.64, 0.56)); };
    wall(x, y + oy - t / 2, ox * 2, t); wall(x - ox + t / 2, y, t, oy * 2 - 2 * t); wall(x + ox - t / 2, y, t, oy * 2 - 2 * t);   // north, west, east
    const gap = 1.2; wall(x - (ox + gap / 2) / 2, y - oy + t / 2, ox - gap / 2, t); wall(x + (ox + gap / 2) / 2, y - oy + t / 2, ox - gap / 2, t);   // south, with the gap for the steps
    for (const sx of [-1, 1]) kS.box(x + sx * (gap / 2 + 0.22), y - oy + 0.05, z - 0.1, 0.46, 0.5, h + 0.33, 0, L(0.66, 0.62, 0.54));   // two pillar stones at the steps
    kS.box(x, y, z - dep, ox * 2 - 2 * t, oy * 2 - 2 * t, 0.02, 0, L(0.30, 0.31, 0.27));   // floor, damp
    for (let i = 0; i < 3; i++) kS.box(x, y - oy + t + 0.18 + i * 0.32, z - dep, gap, 0.36, (2 - i) * 0.25 + 0.05, 0, L(0.6, 0.56, 0.48));   // steps
    kS.box(x, y - oy + t / 2, z - dep, gap, t, dep - 0.02, 0, STONE);
    // flowers (geraniums red and white, trailing green) on the corners
    const fl = [L(0.75, 0.08, 0.10), L(0.92, 0.92, 0.88), L(0.85, 0.25, 0.45)], gr = L(0.20, 0.36, 0.14);
    for (const [cx2, cy2] of [[x - ox + 0.35, y + oy - 0.35], [x + ox - 0.35, y + oy - 0.35], [x - ox + 0.35, y - oy + 0.35], [x + ox - 0.35, y - oy + 0.35]]) {
      kP.box(cx2, cy2, z + h + 0.12, 0.5, 0.5, 0.18, 0, L(0.45, 0.40, 0.33));
      for (let i = 0; i < 14; i++) { const r1 = hh(cx2 * 7 + i), r2 = hh(cy2 * 3 + i * 1.7), a = r1 * 6.283, d = 0.05 + r2 * 0.25; kP.ball(cx2 + Math.cos(a) * d, cy2 + Math.sin(a) * d, z + h + 0.38 + r2 * 0.12, 0.07 + 0.04 * r1, i % 3 ? gr : fl[Math.floor(r2 * 3)], 5); }
      for (let i = 0; i < 4; i++) kP.ball(cx2 + (hh(i + cx2) - 0.5) * 0.5, cy2 + (hh(i + cy2) - 0.5) * 0.5, z + h - 0.05 - i * 0.12, 0.09, gr, 5); }
    // its collision: the outer walls (the steps stay open)
    S.segs.push(x - ox, y + oy, x + ox, y + oy, x - ox, y - oy, x - ox, y + oy, x + ox, y - oy, x + ox, y + oy, x - ox, y - oy, x - gap / 2, y - oy, x + gap / 2, y - oy, x + ox, y - oy);
    // the paved square around it, with a granite curb
    S.paveP.push([[185.9, -111.1], [196.7, -111.3], [199.9, -113.4], [198.5, -117.6], [194.0, -118.3], [187.3, -117.9], [185.7, -115.8]]);
    bench(kP, x + 4.3, y + 0.1, 0, 1.8); S.lampsFix.push([x + 4.2, y + 1.6]); }
  // ---- bus stop "Ratscher, Schulbushaltestelle" (OSM: shelter, bench, bin, lit), post box, signpost ----
  function busStop(kP, kM) { const x = 250.6, y = -99.6, a = (180 - 200) * Math.PI / 180, z = gz(x, y), c = Math.cos(a), s = Math.sin(a);   // the open side faces the road (azimuth 200°)
    const lx = (u, v) => [x + c * u - s * v, y + s * u + c * v];   // u along the road, v away from it (back)
    for (const [u, v, sx, sy] of [[0, 0.7, 3.0, 0.08], [-1.46, 0.0, 0.08, 1.45], [1.46, 0.0, 0.08, 1.45]]) { const p = lx(u, v); kP.box(p[0], p[1], z, sx, sy, 2.25, a, WOODD); }
    for (const [u, v] of [[-1.46, -0.7], [1.46, -0.7], [-1.46, 0.7], [1.46, 0.7]]) { const p = lx(u, v); kP.box(p[0], p[1], z, 0.1, 0.1, 2.3, a, WOOD); }
    { const p = lx(0, 0); kP.box(p[0], p[1], z + 2.3, 3.4, 1.9, 0.08, a, L(0.25, 0.14, 0.10)); kP.box(p[0], p[1], z + 2.38, 3.3, 1.8, 0.05, a, L(0.45, 0.20, 0.14)); }
    { const p = lx(0, 0.45); kP.box(p[0], p[1], z + 0.42, 2.6, 0.35, 0.05, a, WOOD); kP.box(p[0], p[1], z, 2.5, 0.06, 0.42, a, WOODD); }
    S.segs.push(...lx(-1.5, 0.75), ...lx(1.5, 0.75), ...lx(-1.5, -0.75), ...lx(-1.5, 0.75), ...lx(1.5, -0.75), ...lx(1.5, 0.75));
    // the H sign: a green H on a yellow disc
    { const p = lx(2.1, -0.6); kM.cyl(p[0], p[1], z, z + 2.6, 0.035, 0.035, 6, L(0.6, 0.6, 0.6)); const nx = Math.cos(a - Math.PI / 2), ny = Math.sin(a - Math.PI / 2);
      const sx = p[0] + nx * 0.045, sy = p[1] + ny * 0.045, sz = z + 2.36; kP.disc(sx, sy, sz, nx, ny, 0.24, L(0.97, 0.80, 0.0), 18);
      const rx = -ny, ry = nx, gH = L(0.05, 0.45, 0.2); for (const [u2, w2, hgt] of [[-0.075, 0.035, 0.24], [0.075, 0.035, 0.24], [0, 0.15, 0.035]]) kP.box(sx + rx * u2 + nx * 0.006, sy + ry * u2 + ny * 0.006, sz - hgt / 2, w2, 0.006, hgt, Math.atan2(ry, rx), gH);
      S.trunks.push([p[0], p[1], 2]); }
    { const px = 244.8, py = -98.6, pz = gz(px, py); kM.cyl(px, py, pz, pz + 0.95, 0.04, 0.04, 6, L(0.3, 0.3, 0.3)); kP.box(px, py, pz + 0.95, 0.42, 0.3, 0.55, a, L(0.98, 0.78, 0.0)); kP.box(px, py, pz + 1.5, 0.46, 0.34, 0.05, a, L(0.85, 0.66, 0.0)); S.trunks.push([px, py, 2]); }
    // signpost at the green (photo: Themar, Schleusingen)
    { const px = 241.8, py = -104.6, pz = gz(px, py); kM.cyl(px, py, pz, pz + 2.9, 0.04, 0.035, 6, L(0.75, 0.75, 0.75));
      for (const [ang, zz] of [[200, 2.65], [80, 2.42], [300, 2.19]]) { const ar = (90 - ang) * Math.PI / 180, cx2 = px + Math.cos(ar) * 0.42, cy2 = py + Math.sin(ar) * 0.42;
        kP.box(cx2, cy2, pz + zz, 0.8, 0.02, 0.17, ar, L(0.95, 0.95, 0.93)); kP.box(cx2, cy2, pz + zz + 0.02, 0.74, 0.025, 0.035, ar, L(0.05, 0.42, 0.18)); } S.trunks.push([px, py, 2]); } }
  // ---- paving (pavers texture) for the polygons and discs collected above, a granite curb along the polygons ----
  function paving(kPv, kS) {
    const polyTri = (pts, zOff) => { const v2 = pts.map(p => new THREE.Vector2(p[0], p[1])), T = THREE.ShapeUtils.triangulateShape(v2, []), cnt = pts.reduce((s, p) => [s[0] + p[0] / pts.length, s[1] + p[1] / pts.length], [0, 0]);
      for (const [a, b, c] of T) { const P3 = [a, b, c].map(i => [pts[i][0], pts[i][1], gz(pts[i][0], pts[i][1]) + zOff]); const cr = (P3[1][0] - P3[0][0]) * (P3[2][1] - P3[0][1]) - (P3[1][1] - P3[0][1]) * (P3[2][0] - P3[0][0]);
        const o = cr > 0 ? [0, 1, 2] : [0, 2, 1]; kPv.tri(P3[o[0]], P3[o[1]], P3[o[2]], PAVE, [P3[o[0]][0], P3[o[0]][1]], [P3[o[1]][0], P3[o[1]][1]], [P3[o[2]][0], P3[o[2]][1]]); } return cnt; };
    for (const pts of S.paveP) { polyTri(pts, 0.05);
      for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]), mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        kS.box(mx, my, gz(mx, my) - 0.1, l + 0.12, 0.15, 0.22, Math.atan2(b[1] - a[1], b[0] - a[0]), L(0.70, 0.70, 0.68)); } }
    for (const d of S.pave) { const n = 28, pts = []; for (let k = 0; k < n; k++) { const a = k / n * Math.PI * 2; pts.push([d.c[0] + Math.cos(a) * d.r, d.c[1] + Math.sin(a) * d.r]); } polyTri(pts, 0.04); } }
  // ---- street lamps in the lantern style of the photos, along the village streets ----
  function lampSpots() { const V2 = window.VILLAGE, houses = V2 ? V2.bld.filter(b => b.typ === 0) : [], out = [...S.lampsFix];
    const inBld = (x, y) => { for (const b of V2 ? V2.bld : []) { if (x < b.bb[0] - 1 || x > b.bb[2] + 1 || y < b.bb[1] - 1 || y > b.bb[3] + 1) continue; let c = false; for (const f of b.fac) if ((f.ay > y) !== (f.by > y) && x < (f.bx - f.ax) * (y - f.ay) / (f.by - f.ay) + f.ax) c = !c; if (c) return true;
        for (const f of b.fac) { const dx = x - f.ax, dy = y - f.ay, t = Math.max(0, Math.min(f.L, dx * f.dx + dy * f.dy)); if (Math.hypot(dx - f.dx * t, dy - f.dy * t) < 1.2) return true; } } return false; };
    const nearHouse = (x, y) => houses.some(b => Math.hypot(b.cx - x, b.cy - y) < 38), free = (x, y) => out.every(p => Math.hypot(p[0] - x, p[1] - y) > 20);
    for (const w of (window.ROADS && ROADS.ways) || []) { if (![2, 3, 4].includes(w.kind) || (w.fl & 1)) continue; const p = w.p, n = p.length / 2; let acc = 14, side = 1;
      for (let i = 0; i + 1 < n; i++) { const ax = p[i * 2], ay = p[i * 2 + 1], bx = p[i * 2 + 2], by = p[i * 2 + 3], l = Math.hypot(bx - ax, by - ay); if (l < 0.01) continue; const dx = (bx - ax) / l, dy = (by - ay) / l;
        for (let t = 0; t < l; t += 1) { acc += 1; if (acc < 33) continue; const x0 = ax + dx * t, y0 = ay + dy * t; if (Math.hypot(x0 - S.ANGER[0], y0 - S.ANGER[1]) > 430 || !nearHouse(x0, y0)) continue;
          const off = w.w / 2 + 0.75, x = x0 - dy * off * side, y = y0 + dx * off * side; if (inBld(x, y) || !free(x, y) || (ROADS.edge && ROADS.edge(x, y) > -0.25)) { side = -side; continue; }
          out.push([x, y, Math.atan2(-dx * side, dy * side)]); acc = 0; side = -side; } } }
    return out; }
  function lamps() { const spots = lampSpots(); if (!spots.length) return;
    const kL = kit(), kG = kit();   // one lamp at the origin: pole, base, lantern frame and hood; the glass apart (it glows)
    kL.cyl(0, 0, 0, 0.55, 0.11, 0.09, 8, IRON); kL.cyl(0, 0, 0.55, 3.55, 0.055, 0.042, 8, IRON); kL.cyl(0, 0, 3.55, 3.66, 0.09, 0.07, 8, IRON);
    kL.lathe(0, 0, 3.66, [[0.12, 0], [0.2, 0.06]], 4, IRON, Math.PI / 4);
    for (let k = 0; k < 4; k++) { const a = Math.PI / 4 + k * Math.PI / 2; kL.box(Math.cos(a) * 0.22, Math.sin(a) * 0.22, 3.72, 0.025, 0.025, 0.44, a, IRON); }
    kL.lathe(0, 0, 4.14, [[0.36, 0], [0.36, 0.035], [0.05, 0.25], [0.0, 0.26]], 4, IRON, Math.PI / 4); kL.ball(0, 0, 4.44, 0.04, IRON, 6);
    kG.lathe(0, 0, 3.72, [[0.16, 0], [0.29, 0.42]], 4, [1, 1, 1], Math.PI / 4); kG.lathe(0, 0, 3.72, [[0.0, 0], [0.16, 0]], 4, [1, 1, 1], Math.PI / 4);
    const gL = kL.geo(), gG = kG.geo(), n = spots.length, mP = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.5, envMapIntensity: 0.6 });
    const mG = new THREE.MeshStandardMaterial({ color: 0x2a2c2e, roughness: 0.15, metalness: 0, envMapIntensity: 0.9, emissive: 0xffc27a, emissiveIntensity: 0, transparent: false });
    const iL = new THREE.InstancedMesh(gL, mP, n), iG = new THREE.InstancedMesh(gG, mG, n), m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    spots.forEach(([x, y, a], i) => { const z = gz(x, y); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), a || 0); m4.compose(V(x, y, z - 0.05), q, one); iL.setMatrixAt(i, m4); iG.setMatrixAt(i, m4);
      S.lamps.push({ x, y, z: z + 3.95 }); S.trunks.push([x, y, 3]); });
    for (const im of [iL, iG]) { im.userData.noMerge = true; im.castShadow = false; im.receiveShadow = false; im.computeBoundingSphere(); scene.add(im); S.meshes.push(im); }
    S.glass = mG;
    // light on the ground under each lamp: a soft disc, added on top (at night only)
    const c = document.createElement('canvas'); c.width = c.height = 128; const x2 = c.getContext('2d'), gr = x2.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.25, 'rgba(255,255,255,0.5)'); gr.addColorStop(0.6, 'rgba(255,255,255,0.12)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x2.fillStyle = gr; x2.fillRect(0, 0, 128, 128);
    const pg = new THREE.PlaneGeometry(9, 9); pg.rotateX(-Math.PI / 2);
    const mPool = new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), color: 0x000000, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
    const iP = new THREE.InstancedMesh(pg, mPool, n); spots.forEach(([x, y], i) => { m4.makeTranslation(x, gz(x, y) + 0.12, -y); iP.setMatrixAt(i, m4); });
    iP.userData.noMerge = true; iP.renderOrder = 2; iP.visible = false; iP.computeBoundingSphere(); scene.add(iP); S.meshes.push(iP); S.pool = iP; }
  // ---- night: lamps on below the horizon (or in the evening light mode), the nearest light the facades ----
  const _v = new THREE.Vector3(), LV = [];
  function tick() { const V2 = window.VILLAGE; clockSet(false); if (S.lindeMeshes && RATSCHER.map) { S.lindeMeshes[1].visible = S.lindeMeshes[2].visible = false; } if (!S.glass || !V2 || !V2.U) return;
    const n = V2.night ? V2.night() : 0, on = n > 0.08 ? Math.min(1, (n - 0.08) / 0.3) : 0;
    if (Math.abs(on - (S.on1 || 0)) > 0.01) { S.on1 = on; S.glass.emissiveIntensity = 6 * on; S.pool.material.color.setRGB(0.24 * on, 0.165 * on, 0.085 * on); S.pool.visible = on > 0.01 && !RATSCHER.map; markDirty(); }
    const U = V2.U.uLampV; if (!U) return; const arr = U.value;
    if (on <= 0.01) { if (arr[0].w !== 0) { for (const a of arr) a.w = 0; markDirty(); } return; }
    const cp = cam.position; LV.length = 0; for (const l of S.lamps) { const d = (l.x - cp.x) ** 2 + (-l.y - cp.z) ** 2; LV.push([d, l]); } LV.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < arr.length; i++) { const it = LV[i]; if (!it) { arr[i].w = 0; continue; } _v.set(it[1].x, it[1].z, -it[1].y).applyMatrix4(cam.matrixWorldInverse); arr[i].set(_v.x, _v.y, _v.z, 9 * on); } }
  // ---- build: all props, collisions to the world, the place "Dorf" for the menu ----
  function build() { const t0 = performance.now(); S.trunks = []; S.segs = []; S.benches = []; S.pave = []; S.paveP = []; S.lampsFix = [];
    const kP = kit(), kM = kit(), kS = kit(), kPv = kit();
    try { school(kP, kM); } catch (e) { console.warn('school', e); }
    try { linde(kP, kS); } catch (e) { console.warn('linde', e); }
    try { fountain(kS, kP); } catch (e) { console.warn('fountain', e); }
    try { busStop(kP, kM); } catch (e) { console.warn('bus stop', e); }
    for (const [x, y, a] of [[415.4, -182.4, 0], [413.8, -179.8, 0.6]]) bench(kP, x, y, a, 1.8);   // by the cycleway (OSM benches)
    paving(kPv, kS);
    mesh(kP.geo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, envMapIntensity: 0.6 }));
    mesh(kM.geo(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.55, envMapIntensity: 0.7 }));
    mesh(kS.geo(), texMat(tex('flagstone', 'col', true), 1.5, { roughness: 0.95 }));
    const pv = mesh(kPv.geo(), texMat(tex('pavers', 'col', true), 1.3, { roughness: 0.9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
    try { clockMeshes(); } catch (e) { console.warn('clock', e); }
    try { lamps(); } catch (e) { console.warn('lamps', e); }
    // collisions: before world/worldcol.js builds (module order)
    if (S.segs.length || S.benches.length) { const W0 = RATSCHER.walls || new Float32Array(0), add = [...S.segs]; for (const b of S.benches) add.push(...b); const W1 = new Float32Array(W0.length + add.length); W1.set(W0); W1.set(add, W0.length); RATSCHER.walls = W1; }
    if (RATSCHER.treeXY) for (const t of S.trunks) RATSCHER.treeXY.push(t[0], t[1], t[2]);
    if (typeof SPOTS !== 'undefined') { const x = 241.5, y = -101.5; SPOTS.dorf = { mode: 'walk', pos: [x, y], z: gz(x, y), yaw: 292, pitch: 3, label: 'Dorf (Anger)' }; }
    for (const m of S.meshes) if (!S.lindeMeshes || !S.lindeMeshes.slice(1).includes(m)) { if (m !== S.pool) RATSCHER.bld.push(m); }   // hidden with the buildings in the map view
    (window.TICKS || (window.TICKS = [])).push(tick);
    S.on = true; S.ready = true; S.ms = Math.round(performance.now() - t0); markDirty(true); }
  S.dispose = () => { for (const m of S.meshes) { scene.remove(m); if (m.geometry) m.geometry.dispose(); const k = RATSCHER.bld.indexOf(m); if (k >= 2) RATSCHER.bld.splice(k, 1); } S.meshes.length = 0; S.lamps.length = 0; const i = (window.TICKS || []).indexOf(tick); if (i >= 0) TICKS.splice(i, 1);
    for (const L2 of [...VEG.lod]) if (S.lindeMeshes && S.lindeMeshes.includes(L2.hi)) VEG.lod.splice(VEG.lod.indexOf(L2), 1); CLK.hands = null; CLK.dials.length = 0; S.ready = false; };
  whenLoaded(() => { if (!RATSCHER.ready) return; try { build(); } catch (e) { console.warn('village props', e); } });
  // ---- names while walking (game/game.js placeName): the places of the centre, else the street (OSM names) ----
  const STREETS = {"Hauptstraße":[[230.0,-22.6,214.1,-94.1]],"Ratschner Anger":[[344.8,-170.6,332.9,-151.0,322.2,-140.5,295.2,-122.6,263.5,-109.3,214.1,-94.1,200.4,-119.5],[449.6,-337.8,414.0,-328.0,391.5,-317.4,371.2,-292.9],[237.0,-124.7,200.4,-119.5],[200.4,-119.5,194.7,-121.3,143.1,-110.0,107.7,-92.8,78.5,-60.5,63.7,-33.2],[371.2,-292.9,352.1,-235.6,349.1,-185.7,344.8,-170.6]],"Geisenhöhner Weg":[[182.8,-183.7,175.9,-211.5],[200.4,-119.5,187.8,-175.5,182.8,-183.7],[175.9,-211.5,159.1,-256.9]],"Zur Alten Schmiede":[[395.7,-181.3,383.5,-209.4,374.1,-213.0,367.6,-227.0,363.4,-230.8,352.1,-235.6],[344.8,-170.6,395.7,-181.3]],"An der Mühle":[[175.9,-211.5,213.5,-228.1,258.3,-254.3,344.0,-286.8,371.2,-292.9]]};
  S.place = (x, y) => { const d = (p, r) => Math.hypot(x - p[0], y - p[1]) < r;
    if (Math.hypot(x - S.ANGER[0], y - S.ANGER[1]) > 520) return null;
    if (d(S.LINDE, 14)) return 'Ratscher · Dorflinde am Anger'; if (S.school && d([S.school.cx + 5.5 * Math.cos(S.school.rot), S.school.cy + 5.5 * Math.sin(S.school.rot)], 15)) return 'Ratscher · Alte Schule (1828)';
    if (d(S.FOUNTAIN, 11)) return 'Ratscher · Dorfbrunnen'; if (d([250.6, -99.6], 6)) return 'Ratscher · Schulbushaltestelle';
    let best = null, bd = 18; for (const [n, ls] of Object.entries(STREETS)) for (const l of ls) for (let i = 0; i + 3 < l.length; i += 2) {
      const ax = l[i], ay = l[i + 1], dx = l[i + 2] - ax, dy = l[i + 3] - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)), e = Math.hypot(x - ax - dx * t, y - ay - dy * t); if (e < bd) { bd = e; best = n; } }
    return best ? 'Ratscher · ' + best : null; };
  S.clock = () => CLK.hands ? { h: +CLK.h.toFixed(3), m: +CLK.m.toFixed(2) } : null;   // the hands' time (tests)
  S.kit = kit; S.bench = (k, x, y, a, len) => bench(k, x, y, a, len);
  return S; })();
window.VPROPS = VPROPS;
