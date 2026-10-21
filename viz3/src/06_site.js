// ---------- existing buildings on the plot (the owner's photos + aerial): B carport + caravan, C wooden house, D green bungalow, greenhouse, wash house ----------
// Walls are built with real openings (outside cladding and inside lining), every door opens outwards and every room is walkable.
phase(null);
const BLD = S0.bld;
// local frame: x along the long side (compass heading az), y to the left of it (az - 90), z up
function siteGroup(b) { const g = new THREE.Group(); g.position.copy(V(b.c[0], b.c[1], 0)); g.rotation.y = -(b.az - 90) * Math.PI / 180; scene.add(g); return g; }
function gB(g, x0, x1, y0, y1, z0, z1, m, o = {}) { return B(x0, x1, y0, y1, z0, z1, m, Object.assign({ parent: g, col: false }, o)); }
function worldOf(b, lx, ly) { const a = b.az * Math.PI / 180; const ux = [Math.sin(a), Math.cos(a)], vy = [Math.sin(a - Math.PI / 2), Math.cos(a - Math.PI / 2)]; return [b.c[0] + lx * ux[0] + ly * vy[0], b.c[1] + lx * ux[1] + ly * vy[1]]; }
// tilted slab in the local frame: box w (x) × d (along the slope, y) × t, raised by dz over its length (slope along local y, +y end higher)
function slopeSlab(g, cx, cy, zc, w, d, t, dz, m, o = {}) { const L = Math.hypot(d, dz); const geo = new THREE.BoxGeometry(w, t, L); siteUV(geo, cx, cy, zc, 'x', [w, L]);
  const me = new THREE.Mesh(geo, m); me.position.copy(V(cx, cy, zc)); me.rotation.x = Math.atan2(dz, d); me.castShadow = o.cast ?? true; me.receiveShadow = true; g.add(me); return tagPh(me); }
// same, sloping along local x (+x end higher by dz)
function slopeSlabX(g, cx, cy, zc, w, d, t, dz, m, o = {}) { const L = Math.hypot(w, dz); const geo = new THREE.BoxGeometry(L, t, d); siteUV(geo, cx, cy, zc, 'y', [L, d]);
  const me = new THREE.Mesh(geo, m); me.position.copy(V(cx, cy, zc)); me.rotation.z = Math.atan2(dz, w); me.castShadow = o.cast ?? true; me.receiveShadow = true; g.add(me); return tagPh(me); }
// painted board cladding: canvas texture with board shadows (horizontal or vertical boards)
function boardTex(hex, boardW, vertical, wear = 0.08) { const c = document.createElement('canvas'); c.width = c.height = 512; const q = c.getContext('2d'); const col = new THREE.Color(hex);
  q.fillStyle = '#' + col.getHexString(); q.fillRect(0, 0, 512, 512); const n = Math.round(1 / boardW), bw = 512 / n;
  for (let i = 0; i < n; i++) { const k = 1 + (rnd() - 0.5) * wear; q.fillStyle = '#' + col.clone().multiplyScalar(k).getHexString(); if (vertical) q.fillRect(i * bw, 0, bw, 512); else q.fillRect(0, i * bw, 512, bw);
    q.fillStyle = 'rgba(0,0,0,0.35)'; if (vertical) q.fillRect(i * bw, 0, 2, 512); else q.fillRect(0, i * bw, 512, 3); q.fillStyle = 'rgba(255,255,255,0.12)'; if (vertical) q.fillRect(i * bw + 2, 0, 2, 512); else q.fillRect(0, i * bw + 3, 512, 2); }
  for (let i = 0; i < 1500; i++) { q.fillStyle = `rgba(0,0,0,${rnd() * 0.08})`; q.fillRect(rnd() * 512, rnd() * 512, rr(1, 3), rr(1, 14)); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return t; }
// painted boards: photo texture of white painted planks (grain, seams, worn paint, relief) tinted to the paint colour – the canvas boards stay as fallback
function boardMat(hex, boardW, vertical, o = {}) {
  const PHOTO = { paintwood: [0.457, 0.381, 0.339, 0.52], weatherwood: [0.061, 0.058, 0.05, 0.84] }, ph = o.photo || "paintwood", A = PHOTO[ph];
  if (TEXMAN[ph]) { const c = new THREE.Color(hex); c.r /= A[0]; c.g /= A[1]; c.b /= A[2];   // divide out the photo's own albedo, so the boards get the paint colour on average
    const m = pbrMat(ph, { color: c, rot: vertical ? 0 : Math.PI / 2, nrm: 0.9, rough: (o.rough ?? 0.82) / A[3], env: 0.7, fallback: hex }); m.name = 'boards'; return m; }
  const t = boardTex(hex, boardW, vertical, o.wear); const m = new THREE.MeshStandardMaterial({ map: t, roughness: o.rough ?? 0.82, metalness: 0, envMapIntensity: 0.7 }); m.name = 'boards'; return patchSV(m); }
// green bitumen scallop shingles (Biberschwanz) as on the wooden house
function shingleTex() { const c = document.createElement('canvas'); c.width = c.height = 512; const q = c.getContext('2d'); const px = 512; // 1 m
  q.fillStyle = '#2a2d2a'; q.fillRect(0, 0, px, px); const rowH = 0.145 * px, sw = 0.167 * px; let row = 0;
  for (let y = -rowH; y < px + rowH; y += rowH, row++) { const off = (row % 2) * sw / 2; for (let x = -sw; x < px + sw; x += sw) { const g = 0.86 + rnd() * 0.28; q.fillStyle = `rgb(${Math.round(78 * g)},${Math.round(96 * g)},${Math.round(84 * g)})`; q.beginPath(); q.moveTo(x + off, y); q.lineTo(x + off + sw, y); q.lineTo(x + off + sw, y + rowH * 0.95); q.arc(x + off + sw / 2, y + rowH * 0.95, sw / 2, 0, Math.PI); q.closePath(); q.fill();
      q.strokeStyle = 'rgba(0,0,0,0.45)'; q.lineWidth = 1.5; q.stroke(); } }
  for (let i = 0; i < 14000; i++) { q.fillStyle = `rgba(${rnd() > 0.5 ? 255 : 0},255,255,${rnd() * 0.12})`; q.fillRect(rnd() * px, rnd() * px, 1, 1); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return t; }
const MATS = {
  ochre: boardMat(0xc8903c, 0.095, true, { wear: 0.12 }),           // Holzhaus C, Endzustand ocker
  pale: dimIndoor(boardMat(0xe9d6ad, 0.095, true, { wear: 0.05 }), 0.65, 0.5),            // Innenschalung Holzhaus
  greenBoards: boardMat(0x8aa37c, 0.11, false, { wear: 0.07 }),      // Bungalow D
  white: plain({ color: 0xf1efe8, roughness: 0.75 }),
  whiteRoof: plain({ color: 0xd4d3cd, roughness: 0.95 }),
  cream: plain({ color: 0xece8da, roughness: 0.42, metalness: 0.08, envMapIntensity: 0.9, side: THREE.DoubleSide }),
  creamBox: plain({ color: 0xece8da, roughness: 0.42, metalness: 0.08, envMapIntensity: 0.9 }),
  liner: dimIndoor(plain({ color: 0xf4f1e8, roughness: 0.8, side: THREE.DoubleSide }), 0.6, 0.6),
  tint: plain({ color: 0x1b2024, roughness: 0.06, metalness: 0.2, transparent: true, opacity: 0.62, envMapIntensity: 1.2 }),
  caravanDark: plain({ color: 0x23272b, roughness: 0.18, metalness: 0.25 }),
  gold: plain({ color: 0xb9a160, roughness: 0.4, metalness: 0.6 }),
  felt: plain({ color: 0x2b2927, roughness: 0.97 }),
  oldFrame: plain({ color: 0x6a3f2b, roughness: 0.7 }),
  shingle: (() => { const m = new THREE.MeshStandardMaterial({ map: shingleTex(), roughness: 0.95, metalness: 0, envMapIntensity: 0.6 }); m.name = 'shingle'; return patchSV(m); })(),
  tyre: plain({ color: 0x1c1c1c, roughness: 0.9 }),
  tomato: plain({ color: 0xc2352a, roughness: 0.4 }),
  leaf: plain({ color: 0x3f7f35, roughness: 0.9, side: THREE.DoubleSide }),
  stake: plain({ color: 0x8d7a5a, roughness: 0.9 }),
  blue: plain({ color: 0x2a5aa8, roughness: 0.5 }),
};
MATS.tint.depthWrite = false;
// hammered ('stucco') aluminium skin of the old caravan: a fine dented relief as a normal map
{ const N = 256, h = new Float32Array(N * N); for (let k = 0; k < 1500; k++) { const cx = rnd() * N, cy = rnd() * N, r = 3 + rnd() * 5, a = (rnd() - 0.5) * 0.7;
    for (let y = -Math.ceil(r); y <= r; y++) for (let x = -Math.ceil(r); x <= r; x++) { const d = (x * x + y * y) / (r * r); if (d < 1) h[(((cy + y) | 0) % N + N) % N * N + ((((cx + x) | 0) % N + N) % N)] += a * (1 - d) * (1 - d); } }
  const c = document.createElement('canvas'); c.width = c.height = N; const q = c.getContext('2d'), img = q.createImageData(N, N);
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const dx = h[y * N + (x + 1) % N] - h[y * N + (x - 1 + N) % N], dy = h[((y + 1) % N) * N + x] - h[((y - 1 + N) % N) * N + x]; const nx = -dx * 1.6, ny = dy * 1.6, L = Math.hypot(nx, ny, 1), i = (y * N + x) * 4;
    img.data[i] = (nx / L * 0.5 + 0.5) * 255; img.data[i + 1] = (ny / L * 0.5 + 0.5) * 255; img.data[i + 2] = (1 / L * 0.5 + 0.5) * 255; img.data[i + 3] = 255; }
  q.putImageData(img, 0, 0); const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3.5, 3.5); t.anisotropy = ANISO;
  for (const m of [MATS.cream, MATS.creamBox]) { m.normalMap = t; m.normalScale.set(0.45, 0.45); m.roughness = 0.5; m.needsUpdate = true; } }
grime(MATS.ochre, 0.45, 0.5, 0.08, 0.12); grime(MATS.greenBoards, 0.45, 0.5, 0.08, 0.1); grime(MATS.white, 0.5, 0.5, 0.06); grime(MATS.creamBox, 0.4, 0.55, 0.05, 0.16); grime(MATS.cream, 0.4, 0.55, 0.05, 0.2); grime(MATS.stake, 0.3, 0.3, 0.1);
function wheel(g, x, y, z, r, w, rimR) { const geo = new THREE.CylinderGeometry(r, r, w, 24); const me = new THREE.Mesh(geo, MATS.tyre); me.position.copy(V(x, y, z)); me.rotation.x = Math.PI / 2; me.castShadow = true; g.add(me); tagPh(me);
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(rimR, rimR, w + 0.01, 20), MAT.steel); rim.position.copy(V(x, y, z)); rim.rotation.x = Math.PI / 2; g.add(rim); tagPh(rim); }
// ---- local-frame colliders, floors and doors (rotation descriptor at index 9, see 12_game) ----
function rotDesc(b, ox = 0, oy = 0) { const a = b.az * Math.PI / 180; const c = Math.sin(a), s = Math.cos(a); const w = worldOf(b, ox, oy); return { cx: w[0], cy: w[1], c, s }; }
function lcol(r, x0, x1, y0, y1, z0, z1, tag = 'wall') { COL.push([x0, x1, y0, y1, z0, z1, tag, PH, PH_END, r]); }
function lwalk(r, x0, x1, y0, y1, zt, type = 'wood') { WALK.push([x0, x1, y0, y1, zt, type, PH, PH_END, undefined, r]); }
function ldoor(key, b, leaf, { lx, ly, dir, w, sign, z0, z1, ox = 0, oy = 0 }) { const a = b.az * Math.PI / 180; const ux = [Math.sin(a), Math.cos(a)], vy = [-Math.cos(a), Math.sin(a)]; const h = worldOf(b, lx + ox, ly + oy); const d = [dir[0] * ux[0] + dir[1] * vy[0], dir[0] * ux[1] + dir[1] * vy[1]];
  return hingeDoor(key, leaf, { hx: h[0], hy: h[1], a: d, w, sign, z0, z1 }); }
function inLocal(b, x, y, hx, hy, ox = 0, oy = 0) { const a = b.az * Math.PI / 180; const c = Math.sin(a), s = Math.cos(a); const w = worldOf(b, ox, oy); const dx = x - w[0], dy = y - w[1]; const lx = dx * c + dy * s, ly = -dx * s + dy * c; return Math.abs(lx) < hx && Math.abs(ly) < hy; }
const INSIDE = []; const FOOT = []; window.SITE_FOOT = FOOT;
const IW = dimIndoor(plain({ color: 0xf3f1ea, roughness: 0.85 }), 0.6, 0.6); const ICEIL = dimIndoor(plain({ color: 0xf1ede6, roughness: 0.9 }), 0.62, 0.9); const SINK = plain({ color: 0x8a949c, roughness: 0.35, metalness: 0.6 });
function faceOf(b, localDeg) { return b.az + localDeg; } // placeGLB face angle: compass degrees; local 0 = facing +y of the building (az)
// ---- walls with openings in a local frame: run 'x' = wall along local x (thickness t0..t1 in y), run 'y' = along local y (thickness in x); ops [{a0,a1,s,h}] ----
function lw(g, run, a0, a1, t0, t1, z0, z1, ops, m, o = {}) { for (const [p0, p1, q0, q1] of cutOps(a0, a1, z0, z1, ops)) { if (run === 'x') gB(g, p0, p1, t0, t1, q0, q1, m, o); else gB(g, t0, t1, p0, p1, q0, q1, m, o); } }
function lwc(r, run, a0, a1, t0, t1, z0, z1, doors = [], tag = 'wall') { for (const [p0, p1, q0, q1] of cutOps(a0, a1, z0, z1, doors)) { if (run === 'x') lcol(r, p0, p1, t0, t1, q0, q1, tag); else lcol(r, t0, t1, p0, p1, q0, q1, tag); } }
function lbox(g, run, a0, a1, t0, t1, z0, z1, m, o = {}) { return run === 'x' ? gB(g, a0, a1, t0, t1, z0, z1, m, o) : gB(g, t0, t1, a0, a1, z0, z1, m, o); }
// window: frame + pane centred at tc in the wall thickness
function lwin(g, run, a0, a1, tc, z0, z1, { frame = MATS.white, fw = 0.05, depth = 0.07, mull = [], glassM = MAT.glass } = {}) {
  const fb = (p0, p1, q0, q1) => lbox(g, run, p0, p1, tc - depth / 2, tc + depth / 2, q0, q1, frame, { cast: false });
  fb(a0, a1, z0, z0 + fw); fb(a0, a1, z1 - fw, z1); fb(a0, a0 + fw, z0 + fw, z1 - fw); fb(a1 - fw, a1, z0 + fw, z1 - fw); for (const m of mull) fb(m - fw / 2, m + fw / 2, z0 + fw, z1 - fw);
  const gl = lbox(g, run, a0 + fw, a1 - fw, tc - 0.004, tc + 0.004, z0 + fw, z1 - fw, glassM, { cast: false, recv: false }); if (gl) gl.renderOrder = 2; }
// door lining (jambs + head) on the outer face, outward direction k (+1/-1 along the thickness axis)
function ljamb(g, run, a0, a1, t0, t1, z0, z1, m, w = 0.05) { lbox(g, run, a0 - w, a0, t0, t1, z0, z1 + w, m, { cast: false }); lbox(g, run, a1, a1 + w, t0, t1, z0, z1 + w, m, { cast: false }); lbox(g, run, a0, a1, t0, t1, z1, z1 + w, m, { cast: false }); }
// louvred shutters left and right of a window, on the outer face (tOut, outward sign k)
function lshut(g, run, a0, a1, tOut, k, z0, z1, m) { const w = (a1 - a0) / 2, f = tOut + 0.035 * k, t0 = Math.min(tOut, f), t1 = Math.max(tOut, f), s0 = Math.min(f, f + 0.006 * k), s1 = Math.max(f, f + 0.006 * k);
  for (const [p0, p1] of [[a0 - w - 0.05, a0 - 0.05], [a1 + 0.05, a1 + w + 0.05]]) { lbox(g, run, p0, p1, t0, t1, z0 - 0.02, z1 + 0.02, m);
    for (let z = z0 + 0.12; z < z1 - 0.06; z += 0.11) lbox(g, run, p0 + 0.04, p1 - 0.04, s0, s1, z, z + 0.018, MAT.fascia, { cast: false }); } }
// trapezoid infill (gable of a mono-pitch roof): along the run from a0 (top zA) to a1 (top zB), base z0, thickness t0..t1
function ltrap(g, run, a0, a1, t0, t1, z0, zA, zB, m) { const sh = new THREE.Shape(); sh.moveTo(a0, z0); sh.lineTo(a1, z0); sh.lineTo(a1, zB); sh.lineTo(a0, zA); sh.closePath();
  const geo = new THREE.ExtrudeGeometry(sh, { depth: t1 - t0, bevelEnabled: false }); const me = new THREE.Mesh(geo, m);
  if (run === 'x') me.position.set(0, 0, -t1); else { me.rotation.y = Math.PI / 2; me.position.set(t0, 0, 0); }
  me.castShadow = true; me.receiveShadow = true; g.add(me); return tagPh(me); }

bldBegin('carport', 'Carport mit Wohnwagen', BLD.carport.c, { short: 'Carport', pad: 0.3 });
// ===== B: carport 6,0 × 4,0 m, ca. 3,5 m hoch (Pfosten 12/12, Pfetten, Sparren, Trapezblech) with the Tabbert caravan; door side faces the garden entrance (north) =====
{ const b = BLD.carport, g = siteGroup(b); const hx = b.L / 2, hy = b.W / 2; const zh = 3.05, zl = 2.8, py = hy - 0.2; const xs = [-hx + 0.25, 0, hx - 0.25];
  for (const x of xs) for (const sy of [-1, 1]) { const zt = sy > 0 ? zh : zl, y = sy * py; gB(g, x - 0.06, x + 0.06, y - 0.06, y + 0.06, 0.12, zt, MAT.kvh, { grain: 'z' }); gB(g, x - 0.08, x + 0.08, y - 0.08, y + 0.08, 0, 0.12, MAT.galv);
    if (x !== 0) beam([x, y, zt - 0.75], [x - Math.sign(x) * 0.7, y, zt - 0.02], 0.06, 0.1, MAT.kvh, { parent: g });
    beam([x, y, zt - 0.6], [x, y - sy * 0.55, zt - 0.02], 0.06, 0.1, MAT.kvh, { parent: g }); }
  for (const sy of [-1, 1]) { const zt = sy > 0 ? zh : zl; gB(g, -hx, hx, sy * py - 0.06, sy * py + 0.06, zt, zt + 0.2, MAT.kvh, { grain: 'x' }); }                       // Pfetten
  const k = (zh - zl) / (2 * py), zr = y => zl + 0.2 + (y + py) * k;   // underside of the rafters
  const nR = 9; for (let i = 0; i < nR; i++) { const x = -hx + 0.08 + i * (b.L - 0.16) / (nR - 1); beam([x, -hy - 0.25, zr(-hy - 0.25) + 0.08], [x, hy + 0.25, zr(hy + 0.25) + 0.08], 0.08, 0.16, MAT.kvh, { parent: g }); }
  slopeSlab(g, 0, 0, zr(0) + 0.175, b.L + 0.3, b.W + 0.5, 0.03, k * (b.W + 0.5), MAT.metal);
  for (const x of xs) for (const sy of [-1, 1]) { const c = worldOf(b, x, sy * py); COL.push([c[0] - 0.1, c[0] + 0.1, c[1] - 0.1, c[1] + 0.1, 0, 2.6, 'post', PH, PH_END]); }
  FOOT.push({ b, hx, hy, ox: 0, oy: 0 });
  // garden table and two folding chairs just outside the south-east corner (photo-scanned bistro set; the box version stays as fallback)
  { const w = worldOf(b, hx + 0.15, -hy - 0.85);
    placeGLB('garden_set', { x: w[0], y: w[1], z: 0, face: faceOf(b, 90), h: 0.86 }, () => {
      gB(g, hx - 0.2, hx + 0.5, -hy - 1.2, -hy - 0.5, 0.68, 0.72, MAT.larch); for (const [x, y] of [[hx - 0.15, -hy - 1.15], [hx + 0.45, -hy - 1.15], [hx - 0.15, -hy - 0.55], [hx + 0.45, -hy - 0.55]]) gB(g, x - 0.02, x + 0.02, y - 0.02, y + 0.02, 0, 0.68, MAT.larch, { grain: 'z', cast: false });
      gB(g, hx - 0.85, hx - 0.4, -hy - 1.1, -hy - 0.65, 0.44, 0.48, MAT.linen); gB(g, hx - 0.85, hx - 0.79, -hy - 1.1, -hy - 0.65, 0.48, 0.95, MAT.linen); gB(g, hx + 0.65, hx + 1.1, -hy - 1.1, -hy - 0.65, 0.44, 0.48, MAT.linen); gB(g, hx + 1.04, hx + 1.1, -hy - 1.1, -hy - 0.65, 0.48, 0.95, MAT.linen);
      const r = rotDesc(b); lcol(r, hx - 0.25, hx + 0.55, -hy - 1.25, -hy - 0.45, 0, 0.75, 'table'); }); }
}
// ===== Wohnwagen (Tabbert, Bj. 80er): Aufbau 5,0 × 2,2 m, Deichsel nach Westen, Tür auf der Nordseite zum Garteneingang (links), Innenhöhe 1,90 m =====
{ const b = BLD.carport, g = siteGroup(b); const cvx = 0.35, cvy = -0.35; const cv = new THREE.Group(); cv.position.copy(V(cvx, cvy, 0)); g.add(cv);
  const X0 = -2.5, X1 = 2.5, Z0 = 0.42, Z1 = 2.58, HW = 1.1, zf = 0.5;
  const arc = (cx, cz, r, a0, a1, n) => { const o = []; for (let i = 0; i <= n; i++) { const a = a0 + (a1 - a0) * i / n; o.push(new THREE.Vector2(cx + r * Math.cos(a), cz + r * Math.sin(a))); } return o; };
  const outline = [...arc(X0 + 0.1, Z0 + 0.1, 0.1, Math.PI, 1.5 * Math.PI, 3), ...arc(X1 - 0.1, Z0 + 0.1, 0.1, -0.5 * Math.PI, 0, 3), ...arc(X1 - 0.25, Z1 - 0.25, 0.25, 0, 0.5 * Math.PI, 6), ...arc(X0 + 0.62, Z1 - 0.62, 0.62, 0.5 * Math.PI, Math.PI, 12)];
  const dens = (pts, maxL) => { const o = []; for (let i = 0; i < pts.length; i++) { const a = pts[i], c = pts[(i + 1) % pts.length]; const n = Math.max(1, Math.ceil(a.distanceTo(c) / maxL)); for (let k = 0; k < n; k++) o.push(a.clone().lerp(c, k / n)); } return o; };
  const offs = (pts, d) => pts.map((p, i) => { const a = pts[(i - 1 + pts.length) % pts.length], c = pts[(i + 1) % pts.length]; const tx = c.x - a.x, tz = c.y - a.y, L = Math.hypot(tx, tz) || 1; return new THREE.Vector2(p.x - tz / L * d, p.y + tx / L * d); });
  const OUT = dens(outline, 0.1), INN = offs(OUT, 0.035);
  // window holes in the wrap (front panorama window, rear window): y spans to leave open per segment midpoint
  const wrapHole = m => (m.x < X0 + 0.32 && m.y > 1.3 && m.y < 2.32) ? 0.85 : (m.x > X1 - 0.05 && m.y > 1.6 && m.y < 2.2) ? 0.7 : 0;
  function ribbon(pts, y0, y1, inward, mat, glassOnly = false) { const P = [], N = [], U = []; let s = 0;
    for (let i = 0; i < pts.length; i++) { const a = pts[i], c = pts[(i + 1) % pts.length]; const dx = c.x - a.x, dz = c.y - a.y, L = Math.hypot(dx, dz); if (L < 1e-5) continue;
      let nx = dz / L, nz = -dx / L; if (inward) { nx = -nx; nz = -nz; } const m = a.clone().add(c).multiplyScalar(0.5), hw = wrapHole(m);
      const spans = glassOnly ? (hw ? [[-hw, hw]] : []) : (hw ? [[y0, -hw], [hw, y1]] : [[y0, y1]]);
      for (const [ya, yb] of spans) { const q = [[a.x, ya, a.y], [c.x, ya, c.y], [c.x, yb, c.y], [a.x, yb, a.y]].map(p => new THREE.Vector3(p[0], p[2], -p[1]));
        const nrm = new THREE.Vector3(nx, nz, 0); const e1 = q[1].clone().sub(q[0]), e2 = q[2].clone().sub(q[0]); const flip = e1.cross(e2).dot(nrm) < 0;
        const tri = flip ? [0, 2, 1, 0, 3, 2] : [0, 1, 2, 0, 2, 3]; const uv = [[s, ya], [s + L, ya], [s + L, yb], [s, yb]];
        for (const k of tri) { P.push(q[k].x, q[k].y, q[k].z); N.push(nrm.x, nrm.y, nrm.z); U.push(uv[k][0], uv[k][1]); } }
      s += L; }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3)); geo.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    const me = new THREE.Mesh(geo, mat); me.castShadow = !glassOnly; me.receiveShadow = true; if (glassOnly) me.renderOrder = 2; cv.add(me); return tagPh(me); }
  ribbon(OUT, -HW, HW, false, MATS.cream); ribbon(INN, -HW + 0.035, HW - 0.035, true, MATS.liner); ribbon(offs(OUT, 0.012), -HW, HW, false, MATS.tint, true);
  // side panels with real holes: door (north), windows; outer skin and inner lining
  const HOLES = { 1: [[0.2, 0.85, 0.55, 2.25], [-1.3, -0.35, 1.2, 1.85], [1.45, 2.3, 1.3, 1.85]], [-1]: [[-1.75, -0.55, 1.2, 1.9], [-0.2, 0.75, 1.5, 1.95], [1.45, 2.3, 1.3, 1.85]] };
  for (const sy of [1, -1]) { for (const [pts, yy, m] of [[OUT, sy * HW, MATS.cream], [INN, sy * (HW - 0.035), MATS.liner]]) { const sh = new THREE.Shape(pts.map(p => p.clone()));
      for (const [x0, x1, z0, z1] of HOLES[sy]) { const h = new THREE.Path(); h.moveTo(x0, z0); h.lineTo(x1, z0); h.lineTo(x1, z1); h.lineTo(x0, z1); h.closePath(); sh.holes.push(h); }
      const geo = new THREE.ShapeGeometry(sh, 4); const me = new THREE.Mesh(geo, m); me.position.z = -yy; me.castShadow = true; me.receiveShadow = true; cv.add(me); tagPh(me); }
    for (const [x0, x1, z0, z1] of HOLES[sy]) { const door = x0 === 0.2 && sy > 0; const y0 = sy > 0 ? HW - 0.045 : -HW - 0.01, y1 = sy > 0 ? HW + 0.01 : -HW + 0.045;
      gB(cv, x0 - 0.03, x0, y0, y1, z0, z1, MAT.black, { cast: false }); gB(cv, x1, x1 + 0.03, y0, y1, z0, z1, MAT.black, { cast: false }); gB(cv, x0 - 0.03, x1 + 0.03, y0, y1, z1, z1 + 0.03, MAT.black, { cast: false }); gB(cv, x0 - 0.03, x1 + 0.03, y0, y1, z0 - 0.03, z0, door ? MAT.alu : MAT.black, { cast: false });
      if (!door) { const gl = gB(cv, x0, x1, sy * (HW - 0.015) - 0.003, sy * (HW - 0.015) + 0.003, z0, z1, MATS.tint, { cast: false, recv: false }); if (gl) gl.renderOrder = 2; } }
    // brown/gold decor stripes, cut at the door
    const ys0 = sy > 0 ? HW : -HW - 0.006, ys1 = sy > 0 ? HW + 0.006 : -HW;
    for (const [z0, z1, m] of [[1.02, 1.1, MATS.oldFrame], [1.13, 1.16, MATS.gold]]) for (const [x0, x1] of (sy > 0 ? [[X0 + 0.05, 0.17], [0.88, X1 - 0.05]] : [[X0 + 0.05, X1 - 0.05]])) gB(cv, x0, x1, ys0, ys1, z0, z1, m, { cast: false }); }
  // chassis, axle, wheels, corner steadies, A-frame drawbar with gas box and jockey wheel, rear lights, roof vent
  for (const y of [-0.62, 0.62]) gB(cv, X0 + 0.2, X1 - 0.3, y - 0.04, y + 0.04, 0.26, 0.42, MAT.galv);
  gB(cv, -0.75, -0.45, -1.0, 1.0, 0.26, 0.34, MAT.galv); wheel(cv, -0.6, 1.0, 0.32, 0.31, 0.17, 0.17); wheel(cv, -0.6, -1.0, 0.32, 0.31, 0.17, 0.17);
  for (const [x, y] of [[X0 + 0.35, 0.62], [X0 + 0.35, -0.62], [X1 - 0.4, 0.62], [X1 - 0.4, -0.62]]) { gB(cv, x - 0.05, x + 0.05, y - 0.05, y + 0.05, 0.03, 0.3, MAT.steel, { grain: 'z' }); gB(cv, x - 0.1, x + 0.1, y - 0.1, y + 0.1, 0, 0.03, MAT.conc); }
  beam([X0 + 0.25, 0.55, 0.36], [X0 - 1.05, 0.04, 0.4], 0.07, 0.07, MAT.galv, { parent: cv }); beam([X0 + 0.25, -0.55, 0.36], [X0 - 1.05, -0.04, 0.4], 0.07, 0.07, MAT.galv, { parent: cv });
  gB(cv, X0 - 1.25, X0 - 1.0, -0.08, 0.08, 0.34, 0.5, MAT.steel); gB(cv, X0 - 0.8, X0 - 0.73, -0.035, 0.035, 0.12, 0.45, MAT.steel); wheel(cv, X0 - 0.77, 0, 0.1, 0.1, 0.05, 0.03);
  gB(cv, X0 - 0.62, X0 - 0.05, -0.42, 0.42, 0.42, 0.8, MATS.creamBox, { bevel: 0.03 });
  for (const sy of [-1, 1]) gB(cv, X1 - 0.005, X1 + 0.012, sy * 0.85 - 0.08, sy * 0.85 + 0.08, 0.6, 0.85, MATS.tomato, { cast: false });
  gB(cv, -0.6, 0.0, -0.3, 0.3, Z1 - 0.01, Z1 + 0.07, MATS.white); gB(cv, -0.55, -0.05, -0.25, 0.25, Z1 + 0.07, Z1 + 0.075, MATS.tint, { cast: false });
  // --- interior: floor, dinette (front, west), cupboard, kitchen (south), wardrobe, transverse double bed (rear, east), overhead lockers
  gB(cv, X0 + 0.05, X1 - 0.05, -HW + 0.04, HW - 0.04, zf - 0.03, zf, MAT.oakF, { grain: 'x', cast: false });
  gB(cv, X0 + 0.04, X0 + 0.5, -1.05, 1.05, zf, zf + 0.42, MAT.larchIn); RB(X0 + 0.06, X0 + 0.5, -1.03, 1.03, zf + 0.42, zf + 0.5, 0.025, MAT.sage, { parent: cv }); RB(X0 + 0.06, X0 + 0.2, -1.0, 1.0, zf + 0.5, zf + 0.92, 0.04, MAT.sage, { parent: cv });
  for (const sy of [-1, 1]) { gB(cv, X0 + 0.5, -1.35, sy > 0 ? 0.5 : -1.05, sy > 0 ? 1.05 : -0.5, zf, zf + 0.42, MAT.larchIn); RB(X0 + 0.5, -1.37, sy > 0 ? 0.52 : -1.03, sy > 0 ? 1.03 : -0.52, zf + 0.42, zf + 0.5, 0.025, MAT.sage, { parent: cv }); RB(X0 + 0.5, -1.37, sy > 0 ? 0.9 : -1.03, sy > 0 ? 1.03 : -0.9, zf + 0.5, zf + 0.9, 0.04, MAT.sage, { parent: cv }); }
  gB(cv, X0 + 0.55, -1.42, -0.42, 0.42, zf + 0.68, zf + 0.72, MAT.larchIn); gB(cv, -1.95, -1.88, -0.04, 0.04, zf, zf + 0.68, MAT.alu, { grain: 'z', cast: false });
  gB(cv, -1.3, -0.35, 0.6, 1.06, zf, zf + 0.62, MAT.larchIn); gB(cv, -1.32, -0.33, 0.58, 1.06, zf + 0.62, zf + 0.65, MAT.oak, { cast: false }); gB(cv, -0.95, -0.36, -1.06, -0.84, zf, zf + 0.2, MAT.larchIn);   // cupboard (north), wheel box (south)
  gB(cv, -0.35, 0.95, -1.06, -0.5, zf, zf + 0.88, MAT.larchIn); gB(cv, -0.37, 0.97, -1.06, -0.48, zf + 0.88, zf + 0.92, MATS.white, { cast: false }); cyl(0.6, -0.78, zf + 0.92, zf + 0.93, 0.15, SINK, 18, undefined, { parent: cv, cast: false }); gB(cv, -0.25, 0.2, -0.98, -0.58, zf + 0.925, zf + 0.945, MAT.black, { cast: false });
  gB(cv, 0.95, 1.38, 0.5, 1.06, zf, zf + 1.86, MAT.larchIn, { grain: 'z' }); gB(cv, 0.95, 1.38, -1.06, -0.5, zf, zf + 1.86, MAT.larchIn, { grain: 'z' });
  gB(cv, 1.4, X1 - 0.06, -1.05, 1.05, zf, zf + 0.42, MAT.larchIn); gB(cv, 1.42, X1 - 0.08, -1.03, 1.03, zf + 0.42, zf + 0.58, MAT.linen, { cast: false }); RB(1.45, X1 - 0.1, -1.0, 1.0, zf + 0.58, zf + 0.64, 0.03, MAT.wool, { parent: cv }); RB(X1 - 0.6, X1 - 0.12, -0.92, -0.1, zf + 0.62, zf + 0.76, 0.05, MAT.woolLight, { parent: cv }); RB(X1 - 0.6, X1 - 0.12, 0.1, 0.92, zf + 0.62, zf + 0.76, 0.05, MAT.woolLight, { parent: cv });
  for (const [x0, x1] of [[X0 + 0.3, -1.4], [1.45, X1 - 0.2]]) for (const sy of [-1, 1]) gB(cv, x0, x1, sy > 0 ? 0.72 : -1.05, sy > 0 ? 1.05 : -0.72, 1.95, 2.3, MAT.larchIn, { cast: false });
  gB(cv, 0.22, 0.83, HW + 0.03, HW + 0.4, 0.22, 0.25, MAT.galv); gB(cv, 0.25, 0.8, HW + 0.36, HW + 0.4, 0.0, 0.22, MAT.galv, { cast: false });   // Einstiegstritt
  { const w = worldOf(b, cvx - 1.65, cvy); placeGLB('lantern_t', { x: w[0], y: w[1], z: zf + 0.72, face: 30, h: 0.3, col: false }); }
  // --- collision and floors (local frame of the caravan body)
  const r = rotDesc(b, cvx, cvy);
  lwalk(r, X0 + 0.05, X1 - 0.05, -HW + 0.04, HW + 0.05, zf); lwalk(r, 0.22, 0.83, HW + 0.05, HW + 0.4, 0.25, 'stone');
  lwc(r, 'x', X0, X1, HW - 0.04, HW + 0.03, zf, Z1, [{ a0: 0.2, a1: 0.85, s: 0.3, h: 2.3 }], 'caravan'); lwc(r, 'x', X0, X1, -HW - 0.03, -HW + 0.04, zf, Z1, [], 'caravan');
  lcol(r, X0 - 0.03, X0 + 0.04, -HW, HW, zf, Z1, 'caravan'); lcol(r, X1 - 0.04, X1 + 0.03, -HW, HW, zf, Z1, 'caravan');
  lcol(r, X0, X1, -HW, HW, 0, 0.47, 'caravan'); lcol(r, X0 - 1.3, X0, -0.45, 0.45, 0, 0.82, 'drawbar');
  lcol(r, X0 + 0.04, -1.35, -1.05, 1.05, zf, zf + 0.5, 'bench'); lcol(r, X0 + 0.55, -1.42, -0.42, 0.42, zf + 0.25, zf + 0.72, 'table'); lcol(r, -1.3, -0.35, 0.6, 1.06, zf, zf + 0.65, 'cupboard');
  lcol(r, -0.35, 0.95, -1.06, -0.5, zf, zf + 0.92, 'kitchen'); lcol(r, 0.95, 1.38, 0.5, 1.06, zf, zf + 1.86, 'wardrobe'); lcol(r, 0.95, 1.38, -1.06, -0.5, zf, zf + 1.86, 'wardrobe'); lcol(r, 1.4, X1 - 0.06, -1.05, 1.05, zf, zf + 0.64, 'bed');
  // door: hinged at the front (west) jamb as on German caravans, opens outwards
  ldoor('caravan', b, boardLeaf(0.65, 1.7, { boards: false, mat: MATS.creamBox, glass: [0.33, 0.44, 0.95, 1.45] }), { lx: 0.2, ly: HW - 0.02, dir: [1, 0], w: 0.65, sign: 1, z0: 0.55, z1: 2.25, ox: cvx, oy: cvy });
  INSIDE.push({ b, hx: 2.5, hy: 1.1, ox: cvx, oy: cvy, z0: zf - 0.1, z1: Z1 + 0.1, name: 'Wohnwagen' });
}

bldEnd(BLD.carport); bldBegin('holzhaus', 'Holzhaus', BLD.holzhaus.c, { short: 'Holzhaus', pad: 0.25 });
// ===== C: Holzhaus (3,0 × 3,6 m, an der Ostgrenze ausgerichtet; Pfosten auf Betonsteinen, Fensterband West, Pultdach mit grünen Biberschwanz-Schindeln, alte Busluke, Fassade ocker) =====
{ const b = BLD.holzhaus, g = siteGroup(b); const hx = b.L / 2, hy = b.W / 2, zf = 0.35, zL = zf + 2.2, zH = zL + 0.32, T = 0.08, L = 0.014; const r = rotDesc(b);
  const zTop = x => zH + (zL - zH) * (x + hx) / (2 * hx);
  for (const [x, y] of [[-hx + 0.15, -hy + 0.15], [hx - 0.15, -hy + 0.15], [-hx + 0.15, hy - 0.15], [hx - 0.15, hy - 0.15], [-hx + 0.15, 0], [hx - 0.15, 0]]) { gB(g, x - 0.12, x + 0.12, y - 0.12, y + 0.12, 0, 0.2, MAT.conc); gB(g, x - 0.05, x + 0.05, y - 0.05, y + 0.05, 0.2, zf - 0.05, MAT.kvh, { grain: 'z' }); }
  gB(g, -hx, hx, -hy, hy, zf - 0.05, zf, MAT.plank, { grain: 'x', cast: false });
  const OPS = { W: [{ a0: -1.5, a1: 1.5, s: zf + 0.95, h: zf + 2.05 }], S: [{ a0: -0.2, a1: 0.7, s: zf, h: zf + 2.0 }, { a0: -1.2, a1: -0.6, s: zf + 1.05, h: zf + 1.65 }] };
  // outer walls (ochre boards) and inner pale lining, all with the same openings
  lw(g, 'y', -hy, hy, -hx, -hx + T - L, zf, zH, OPS.W, MATS.ochre, { grain: 'z' }); lw(g, 'y', -hy + T, hy - T, -hx + T - L, -hx + T, zf, zH, OPS.W, MATS.pale, { grain: 'z', cast: false });
  lw(g, 'y', -hy, hy, hx - T + L, hx, zf, zL, [], MATS.ochre, { grain: 'z' }); lw(g, 'y', -hy + T, hy - T, hx - T, hx - T + L, zf, zL, [], MATS.pale, { grain: 'z', cast: false });
  for (const sy of [-1, 1]) { const t0 = sy > 0 ? hy - T + L : -hy, t1 = sy > 0 ? hy : -hy + T - L, i0 = sy > 0 ? hy - T : -hy + T - L, i1 = sy > 0 ? hy - T + L : -hy + T; const ops = sy < 0 ? OPS.S : [];
    lw(g, 'x', -hx + T - L, hx - T + L, t0, t1, zf, zL, ops, MATS.ochre, { grain: 'z' }); ltrap(g, 'x', -hx + T - L, hx - T + L, t0, t1, zL, zTop(-hx + T), zL, MATS.ochre);
    lw(g, 'x', -hx + T, hx - T, i0, i1, zf, zL, ops, MATS.pale, { grain: 'z', cast: false }); ltrap(g, 'x', -hx + T, hx - T, i0, i1, zL, zTop(-hx + T), zL, MATS.pale); }
  gB(g, -hx + T, hx - T, -hy + T, hy - T, zf, zf + 0.02, MAT.oakF, { grain: 'x', cast: false });
  // Fensterband West: alter Holzrahmen dunkelbraun, 3 Felder; kleines Fenster Süd; Türzarge
  lwin(g, 'y', -1.5, 1.5, -hx + T / 2, zf + 0.95, zf + 2.05, { frame: MATS.oldFrame, fw: 0.06, depth: T + 0.02, mull: [-0.5, 0.5] });
  lwin(g, 'x', -1.2, -0.6, -hy + T / 2, zf + 1.05, zf + 1.65, { frame: MATS.oldFrame, fw: 0.05, depth: T + 0.02 });
  ljamb(g, 'x', -0.2, 0.7, -hy - 0.005, -hy + T, zf, zf + 2.0, MATS.oldFrame);
  gB(g, -0.3, 0.8, -hy - 0.5, -hy, 0.17, zf - 0.03, MAT.plank, { grain: 'x' }); gB(g, -0.3, 0.8, -hy - 0.5, -hy, 0, 0.17, MAT.conc);   // Tritt
  // roof: rafters along x (high at -x / garden side, low at +x / boundary), OSB, shingles, old bus roof hatch
  const ov = 0.42, nR = 8; for (let i = 0; i < nR; i++) { const y = -hy - 0.1 + i * (b.W + 0.2) / (nR - 1); beam([-hx - ov, y, zTop(-hx - ov) + 0.06], [hx + ov, y, zTop(hx + ov) + 0.06], 0.05, 0.12, MAT.kvh, { parent: g }); }
  const rw = b.L + 2 * ov, dz = zTop(hx + ov) - zTop(-hx - ov);
  slopeSlabX(g, 0, 0, (zH + zL) / 2 + 0.13, rw, b.W + 0.3, 0.022, dz, MAT.osb); slopeSlabX(g, 0, 0, (zH + zL) / 2 + 0.155, rw + 0.04, b.W + 0.34, 0.02, dz, MATS.shingle);
  { const hx0 = -0.3, hy0 = 0.35, zt = zTop(hx0) + 0.33; gB(g, hx0 - 0.33, hx0 + 0.33, hy0 - 0.28, hy0 + 0.28, zt - 0.12, zt, MATS.gold); gB(g, hx0 - 0.3, hx0 + 0.3, hy0 - 0.25, hy0 + 0.25, zt - 0.11, zt + 0.01, MAT.glass, { cast: false }); gB(g, hx0 - 0.31, hx0 + 0.31, hy0 - 0.02, hy0 + 0.02, zt - 0.005, zt + 0.015, MAT.steel, { cast: false }); gB(g, hx0 - 0.02, hx0 + 0.02, hy0 - 0.26, hy0 + 0.26, zt - 0.005, zt + 0.015, MAT.steel, { cast: false }); }
  gB(g, -hx - 1.9, -hx - 0.9, -0.6, 1.1, 0.25, 0.28, MAT.pv); gB(g, -hx - 1.9, -hx - 0.9, -0.6, 1.1, 0.22, 0.25, MAT.pvframe, { cast: false });   // PV-Modul am Boden
  // interior: desk at the window band, two stools, bed along the north wall, shelf, battery/charge controller corner, lantern, books
  gB(g, -hx + T + 0.02, -hx + T + 0.57, -0.55, 0.55, zf + 0.72, zf + 0.76, MAT.oak); for (const [x, y] of [[-hx + T + 0.06, -0.5], [-hx + T + 0.53, -0.5], [-hx + T + 0.06, 0.5], [-hx + T + 0.53, 0.5]]) gB(g, x - 0.02, x + 0.02, y - 0.02, y + 0.02, zf, zf + 0.72, MAT.oak, { grain: 'z', cast: false });
  gB(g, -0.58, hx - T, hy - T - 0.92, hy - T, zf, zf + 0.42, MAT.larchIn); gB(g, -0.56, hx - T - 0.02, hy - T - 0.9, hy - T - 0.02, zf + 0.42, zf + 0.58, MAT.linen, { cast: false }); RB(-0.53, hx - T - 0.05, hy - T - 0.88, hy - T - 0.05, zf + 0.58, zf + 0.66, 0.03, MAT.wool, { parent: g }); RB(hx - T - 0.6, hx - T - 0.1, hy - T - 0.8, hy - T - 0.15, zf + 0.62, zf + 0.76, 0.05, MAT.woolLight, { parent: g });
  for (const z of [1.45, 1.85]) gB(g, hx - T - 0.26, hx - T, -0.9, 0.5, zf + z, zf + z + 0.03, MAT.oak, { cast: false });
  gB(g, 1.0, hx - T, -hy + T, -hy + T + 0.45, zf, zf + 0.4, MAT.black, { cast: false }); gB(g, 1.02, hx - T - 0.02, -hy + T + 0.02, -hy + T + 0.43, zf + 0.4, zf + 0.42, MAT.alu, { cast: false });
  { const w = worldOf(b, -hx + T + 0.3, 0.25); placeGLB('lantern_t', { x: w[0], y: w[1], z: zf + 0.76, face: faceOf(b, 90), h: 0.36, col: false }); }
  { const w = worldOf(b, -hx + T + 0.3, -0.25); placeGLB('books', { x: w[0], y: w[1], z: zf + 0.76, face: faceOf(b, 0), w: 0.3, col: false }); }
  for (const ly of [-0.3, 0.35]) { const w = worldOf(b, -hx + T + 0.85, ly); placeGLB('footstool', { x: w[0], y: w[1], z: zf, face: faceOf(b, 90), h: 0.45, col: false }); lcol(r, -hx + T + 0.7, -hx + T + 1.0, ly - 0.15, ly + 0.15, zf, zf + 0.45, 'stool'); }
  // collision, floors
  lwalk(r, -hx + T, hx - T, -hy + T, hy - T, zf + 0.02); lwalk(r, -0.2, 0.7, -hy - 0.01, -hy + T + 0.01, zf + 0.02); lwalk(r, -0.3, 0.8, -hy - 0.5, -hy - 0.01, zf - 0.03, 'wood');
  lwc(r, 'y', -hy, hy, -hx - 0.01, -hx + T, 0, zH); lwc(r, 'y', -hy, hy, hx - T, hx + 0.01, 0, zL); lwc(r, 'x', -hx, hx, hy - T, hy + 0.01, 0, zL); lwc(r, 'x', -hx, hx, -hy - 0.01, -hy + T, zf, zL, [{ a0: -0.2, a1: 0.7, s: zf - 0.1, h: zf + 2.0 }]);
  lcol(r, -hx, hx, -hy, hy, 0, 0.24, 'base'); lcol(r, -0.58, hx - T, hy - T - 0.92, hy - T, zf, zf + 0.66, 'bed'); lcol(r, -hx + T, -hx + T + 0.57, -0.55, 0.55, zf + 0.3, zf + 0.76, 'table'); lcol(r, 1.0, hx - T, -hy + T, -hy + T + 0.45, zf, zf + 0.42, 'battery');
  // door: hinged at the east jamb, opens outwards (south)
  ldoor('holzhaus', b, boardLeaf(0.9, 1.98, { mat: MATS.ochre }), { lx: 0.7, ly: -hy + 0.03, dir: [-1, 0], w: 0.9, sign: 1, z0: zf + 0.01, z1: zf + 1.99 });
  INSIDE.push({ b, hx, hy, ox: 0, oy: 0, z0: zf - 0.1, z1: zH + 0.4, name: 'Holzhaus' }); FOOT.push({ b, hx: hx + 0.1, hy: hy + 0.1, ox: 0, oy: 0 });
}

bldEnd(BLD.holzhaus); bldBegin('greenhouse', 'Gewächshaus', BLD.greenhouse.c, { short: 'Gewächshaus', pad: 0.05 });
// ===== Gewächshaus (2,0 × 1,4 m) direkt nördlich vom Holzhaus: Alu-Rahmen, Glas, Satteldach, Tür zur Gartenseite (West), Tomaten und Gurken =====
{ const b = BLD.greenhouse, g = siteGroup(b); const hx = b.L / 2, hy = b.W / 2, ze = 1.35, zr = 1.95, f = 0.03, dy = 0.32; const r = rotDesc(b);
  gB(g, -hx, hx, -hy, hy, 0, 0.12, MAT.alu, { cast: false });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) gB(g, sx * hx - f, sx * hx + f, sy * hy - f, sy * hy + f, 0.12, ze, MAT.alu, { grain: 'z' });
  for (const sy of [-1, 1]) gB(g, -hx, hx, sy * hy - f, sy * hy + f, ze - f, ze + f, MAT.alu, { grain: 'x' });
  gB(g, -hx, hx, -f, f, zr - f, zr + f, MAT.alu, { grain: 'x' });
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) beam([sx * hx, sy * hy, ze], [sx * hx, 0, zr], 0.04, 0.04, MAT.alu, { parent: g });
  for (const i of [-0.33, 0.33]) for (const sy of [-1, 1]) { gB(g, i * hx * 2 - f, i * hx * 2 + f, sy * hy - f, sy * hy + f, 0.12, ze, MAT.alu, { grain: 'z' }); beam([i * hx * 2, sy * hy, ze], [i * hx * 2, 0, zr], 0.03, 0.03, MAT.alu, { parent: g }); }
  for (const y of [-dy, dy]) gB(g, -hx - f, -hx + f, y - f, y + f, 0.12, ze, MAT.alu, { grain: 'z' }); gB(g, -hx - f, -hx + f, -dy, dy, 1.33, ze, MAT.alu, { grain: 'y' });   // Türrahmen
  const glass = (x0, x1, y0, y1, z0, z1) => { const m = gB(g, x0, x1, y0, y1, z0, z1, MAT.glass, { cast: false, recv: false }); if (m) m.renderOrder = 2; };
  for (const sy of [-1, 1]) glass(-hx, hx, sy * hy - 0.003, sy * hy + 0.003, 0.12, ze);
  glass(hx - 0.003, hx + 0.003, -hy, hy, 0.12, ze); glass(-hx - 0.003, -hx + 0.003, -hy, -dy, 0.12, ze); glass(-hx - 0.003, -hx + 0.003, dy, hy, 0.12, ze);
  for (const sx of [-1, 1]) { const sh = new THREE.Shape(); sh.moveTo(-hy, 0); sh.lineTo(hy, 0); sh.lineTo(0, zr - ze); sh.closePath(); const geo = new THREE.ShapeGeometry(sh); const me = new THREE.Mesh(geo, MAT.glass); me.position.copy(V(sx * hx, 0, ze)); me.rotation.y = Math.PI / 2; me.renderOrder = 2; me.userData.noMerge = true; g.add(me); tagPh(me); }
  for (const sy of [-1, 1]) { const m = slopeSlab(g, 0, sy * hy / 2, (ze + zr) / 2 + 0.02, b.L + 0.06, hy + 0.02, 0.006, sy * -1 * (zr - ze), MAT.glass, { cast: false }); m.renderOrder = 2; }
  gB(g, -hx + 0.12, hx - 0.12, -hy + 0.08, -0.27, 0.12, 0.42, MAT.plank, { grain: 'x' }); gB(g, -hx + 0.12, hx - 0.12, 0.27, hy - 0.08, 0.12, 0.42, MAT.plank, { grain: 'x' }); gB(g, -hx + 0.14, hx - 0.14, -hy + 0.1, -0.29, 0.3, 0.4, MAT.soil, { cast: false }); gB(g, -hx + 0.14, hx - 0.14, 0.29, hy - 0.1, 0.3, 0.4, MAT.soil, { cast: false });
  gB(g, -hx + 0.02, hx - 0.12, -0.27, 0.27, 0.12, 0.14, MAT.stone, { cast: false });
  const fernItems = []; for (let i = 0; i < 4; i++) { const lx = -hx + 0.35 + i * (b.L - 0.7) / 3, ly = -0.45; gB(g, lx - 0.012, lx + 0.012, ly - 0.012, ly + 0.012, 0.4, 1.7, MATS.stake, { grain: 'z', cast: false });
    for (let k = 0; k < 4; k++) { const z = 0.6 + k * 0.28; const s = new THREE.Mesh(new THREE.SphereGeometry(0.14 + rnd() * 0.05, 8, 6), MATS.leaf); s.position.copy(V(lx + (rnd() - 0.5) * 0.12, ly + (rnd() - 0.5) * 0.1, z)); s.scale.set(1, 0.6, 1); s.castShadow = true; g.add(s); tagPh(s);
      if (k > 0 && rnd() < 0.8) { const t = new THREE.Mesh(new THREE.SphereGeometry(0.03 + rnd() * 0.012, 8, 6), MATS.tomato); t.position.copy(V(lx + (rnd() - 0.5) * 0.2, ly + 0.12 * (rnd() > 0.5 ? 1 : -1), z - 0.12)); g.add(t); tagPh(t); } }
    const w = worldOf(b, lx + 0.05, 0.45); fernItems.push({ x: w[0], y: w[1], z: 0.4, s: 1.0 + rnd() * 0.3 }); }
  if (MODELS.fern) instanceVariants('fern', fernItems, { cast: true, env: 0.6, tint: 0xd9f0b8 });
  lwalk(r, -hx - 0.05, hx - 0.12, -0.27, 0.27, 0.14, 'stone');
  lcol(r, -hx - 0.03, hx + 0.03, hy - 0.02, hy + 0.05, 0, 1.4, 'glass'); lcol(r, -hx - 0.03, hx + 0.03, -hy - 0.05, -hy + 0.02, 0, 1.4, 'glass'); lcol(r, hx - 0.02, hx + 0.05, -hy, hy, 0, 1.4, 'glass');
  lcol(r, -hx - 0.05, -hx + 0.02, -hy, -dy, 0, 1.4, 'glass'); lcol(r, -hx - 0.05, -hx + 0.02, dy, hy, 0, 1.4, 'glass');
  lcol(r, -hx + 0.1, hx - 0.1, -hy + 0.06, -0.27, 0.12, 0.8, 'bed'); lcol(r, -hx + 0.1, hx - 0.1, 0.27, hy - 0.06, 0.12, 0.8, 'bed');
  ldoor('greenhouse', b, glassLeaf(0.64, 1.21), { lx: -hx - 0.01, ly: -dy, dir: [0, 1], w: 0.64, sign: 1, z0: 0.12, z1: 1.33 });
  INSIDE.push({ b, hx, hy, ox: 0, oy: 0, z0: 0, z1: 2.0, name: 'Gewächshaus' }); FOOT.push({ b, hx: hx + 0.05, hy: hy + 0.05, ox: 0, oy: 0 });
}

bldEnd(BLD.greenhouse); bldBegin('bungalow', 'Bungalow', BLD.bungalow.c, { short: 'Bungalow', pad: 0.3 });
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

bldEnd(BLD.bungalow); bldBegin('washhouse', 'Waschhaus', BLD.washhouse.c, { short: 'Waschhaus', pad: 0.15 });
// ===== Waschhaus (2,0 × 1,6 m) nördlich vom Gewächshaus unter dem großen Baum: Holz, Pultdach mit Dachpappe, Tür zur Gartenseite (West), Toilette, Waschbecken, Regentonne =====
{ const b = BLD.washhouse, g = siteGroup(b); const hx = b.L / 2, hy = b.W / 2, z0 = 0.1, zh = 2.25, zl = 2.0, T = 0.06, dA = -0.38, dB = 0.37; const r = rotDesc(b);
  const zTop = y => zh + (zl - zh) * (y + hy) / (2 * hy);
  gB(g, -hx, hx, -hy, hy, 0, z0, MAT.conc, { cast: false });
  const wm = MAT.larch, DW = { a0: dA, a1: dB, s: z0, h: z0 + 1.92 };
  lw(g, 'x', -hx, hx, -hy, -hy + T, z0, zh, [], wm, { grain: 'z' }); lw(g, 'x', -hx, hx, hy - T, hy, z0, zl, [{ a0: -0.25, a1: 0.25, s: z0 + 1.4, h: z0 + 1.78 }], wm, { grain: 'z' });
  for (const sx of [-1, 1]) { const t0 = sx > 0 ? hx - T : -hx, t1 = sx > 0 ? hx : -hx + T; lw(g, 'y', -hy + T, hy - T, t0, t1, z0, zl, sx < 0 ? [DW] : [], wm, { grain: 'z' }); ltrap(g, 'y', -hy + T, hy - T, t0, t1, zl, zTop(-hy + T), zl, wm); }
  lwin(g, 'x', -0.25, 0.25, hy - T / 2, z0 + 1.4, z0 + 1.78, { frame: MATS.white, fw: 0.04, depth: T + 0.02 });
  ljamb(g, 'y', dA, dB, -hx - 0.005, -hx + T, z0, z0 + 1.92, MAT.frame, 0.04);
  gB(g, -hx + T, hx - T, -hy + T, hy - T, z0, z0 + 0.01, MAT.slate, { cast: false });
  const ov = 0.25; for (let i = 0; i < 5; i++) { const x = -hx + 0.05 + i * (b.L - 0.1) / 4; beam([x, -hy - ov, zTop(-hy - ov) + 0.05], [x, hy + ov, zTop(hy + ov) + 0.05], 0.05, 0.1, MAT.kvh, { parent: g }); }
  slopeSlab(g, 0, 0, (zh + zl) / 2 + 0.12, b.L + 0.2, b.W + 2 * ov, 0.024, -(zTop(-hy - ov) - zTop(hy + ov)), MAT.plank); slopeSlab(g, 0, 0, (zh + zl) / 2 + 0.145, b.L + 0.24, b.W + 2 * ov + 0.04, 0.012, -(zTop(-hy - ov) - zTop(hy + ov)), MATS.felt);
  cyl(hx - 0.35, 0.2, zl + 0.1, zh + 0.75, 0.04, MAT.steel, 12, undefined, { parent: g });
  cyl(0.55, -hy - 0.42, 0, 0.95, 0.3, MAT.black, 20, undefined, { parent: g }); gB(g, 0.22, 0.88, -hy - 0.75, -hy - 0.72, 0.9, 0.97, MAT.black, { cast: false });
  gB(g, -hx - 0.7, -hx, -0.5, 0.5, 0, 0.08, MAT.conc, { cast: false });
  // interior: WC at the east wall facing the door, washbasin with tap and mirror on the south wall, shelf on the north wall, water canister
  gB(g, 0.5, 0.92, -0.23, 0.23, z0, z0 + 0.42, MATS.white, { bevel: 0.02 }); gB(g, 0.48, 0.94, -0.25, 0.25, z0 + 0.42, z0 + 0.46, MATS.white, { cast: false }); gB(g, 0.76, 0.94, -0.21, 0.21, z0 + 0.46, z0 + 0.85, MATS.white, { cast: false });
  gB(g, -0.45, 0.1, -hy + T, -hy + T + 0.4, z0, z0 + 0.8, MAT.larchIn, { grain: 'z' }); gB(g, -0.47, 0.12, -hy + T, -hy + T + 0.42, z0 + 0.8, z0 + 0.83, MAT.oak, { cast: false }); cyl(-0.18, -hy + T + 0.22, z0 + 0.83, z0 + 0.95, 0.17, MATS.white, 20, 0.12, { parent: g, cast: false }); gB(g, -0.22, -0.14, -hy + T + 0.02, -hy + T + 0.12, z0 + 0.95, z0 + 1.15, MAT.steel, { cast: false });
  gB(g, -0.4, 0.05, -hy + T, -hy + T + 0.01, z0 + 1.15, z0 + 1.6, MATS.white, { cast: false });
  gB(g, -0.1, 0.8, hy - T - 0.25, hy - T, z0 + 1.25, z0 + 1.28, MAT.oak, { cast: false }); gB(g, 0.55, 0.9, 0.35, hy - T - 0.02, z0, z0 + 0.4, MATS.blue, { cast: false });
  lwalk(r, -hx, hx, -hy, hy, z0 + 0.01, 'stone'); lwalk(r, -hx - 0.7, -hx, -0.5, 0.5, 0.08, 'stone');
  lcol(r, -hx, hx, -hy - 0.02, -hy + T, 0, zh); lcol(r, -hx, hx, hy - T, hy + 0.02, 0, zl); lwc(r, 'y', -hy, hy, -hx - 0.02, -hx + T, 0, zl, [{ a0: dA, a1: dB, s: -0.1, h: z0 + 1.92 }]); lcol(r, hx - T, hx + 0.02, -hy, hy, 0, zh);
  lcol(r, 0.48, 0.94, -0.25, 0.25, z0, z0 + 0.85, 'wc'); lcol(r, -0.47, 0.12, -hy + T, -hy + T + 0.42, z0, z0 + 0.95, 'sink'); lcol(r, 0.55, 0.9, 0.35, hy - T, z0, z0 + 0.4, 'canister'); lcol(r, 0.25, 0.85, -hy - 0.72, -hy - 0.12, 0, 0.95, 'barrel');
  ldoor('washhouse', b, boardLeaf(0.73, 1.9, { mat: MAT.larchIn }), { lx: -hx + 0.03, ly: dA + 0.01, dir: [0, 1], w: 0.73, sign: 1, z0: z0 + 0.01, z1: z0 + 1.91 });
  INSIDE.push({ b, hx, hy, ox: 0, oy: 0, z0: 0, z1: zh + 0.3, name: 'Waschhaus' }); FOOT.push({ b, hx: hx + 0.1, hy: hy + 0.1, ox: 0, oy: 0 });
}
bldEnd(BLD.washhouse);
// ---- where am I (place label, indoor acoustics) ----
function inPolyXY(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], q = poly[j]; if (((a[1] > y) !== (q[1] > y)) && (x < (q[0] - a[0]) * (y - a[1]) / (q[1] - a[1]) + a[0])) c = !c; } return c; }
window.insideSite = (x, y, z) => INSIDE.some(i => z >= i.z0 && z <= i.z1 && inLocal(i.b, x, y, i.hx, i.hy, i.ox, i.oy));
window.sitePlace = (x, y, z) => { for (const i of INSIDE) if (z >= i.z0 && z <= i.z1 && inLocal(i.b, x, y, i.hx, i.hy, i.ox, i.oy)) return i.name;
  const cp = BLD.carport; if (inLocal(cp, x, y, cp.L / 2, cp.W / 2)) return 'Carport';
  const pd = window.NPC_PAD; if (pd && x > pd.x0 - 0.2 && x < pd.x1 + 0.2 && y > pd.y0 - 0.2 && y < pd.y1 + 0.2) return 'Ziegenweide';
  if (window.STREAM) { if (STREAM.onBridge(x, y)) return z < -0.4 ? 'Unter der Brücke' : 'Brücke über den Bach'; const a = STREAM.across(x, y);
    if (Math.abs(a) < STREAM.WT) { const [t] = STREAM.loc(x, y); if (a > 0.5 && STREAM.STAIRS.some(s => Math.abs(t - s.t) < STREAM.SW + 0.1)) return 'Treppe zum Bach'; return Math.abs(a) < STREAM.WW ? 'Im Bach' : 'Am Bach'; } }
  const [p1, p2] = S0.path; const dx = p2[0] - p1[0], dy = p2[1] - p1[1], L = Math.hypot(dx, dy); const t = ((x - p1[0]) * dx + (y - p1[1]) * dy) / L; const px = p1[0] + dx / L * t, py = p1[1] + dy / L * t; if (Math.hypot(x - px, y - py) < 1.8 && t > -5 && t < L + 5) return 'Feldweg';
  if (!inPolyXY(x, y, S0.garden)) return x < 2 ? 'Nachbargrundstück West' : 'Nachbargrundstück Ost'; return null; };
