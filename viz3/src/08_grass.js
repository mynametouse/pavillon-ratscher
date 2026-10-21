// ---------------- 3D lawn: instanced grass clumps + a few meadow flowers near the pavilion ----------------
function inPoly(x, y, poly) { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const a = poly[i], b = poly[j]; if (((a[1] > y) !== (b[1] > y)) && (x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0])) c = !c; } return c; }
const GRASS = { meshes: [] };
// grass, flowers and small plants inside the footprint of a building are hidden; when a building is moved in the plan view they are hidden where it
// stands now and shown again where it stood (there, extra grass grown with its own random numbers fills the lawn, so the garden's random look stays)
const FOOTHIDE = { list: [] };
function footHideReg(im) { if (!im || !im.isInstancedMesh) return; const a = im.instanceMatrix.array, n = im.count, pos = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { pos[i * 2] = a[i * 16 + 12]; pos[i * 2 + 1] = -a[i * 16 + 14]; } FOOTHIDE.list.push({ im, orig: a.slice(), pos, hid: new Uint8Array(n) }); footHideOne(FOOTHIDE.list[FOOTHIDE.list.length - 1], footRects()); }
function footRects() { const R = []; for (const B of Object.values(window.BUILD || {})) for (const r of bldRects(B)) { const c = rectCorners(r), xs = c.map(q => q[0]), ys = c.map(q => q[1]); R.push({ r, x0: Math.min(...xs) - 0.2, x1: Math.max(...xs) + 0.2, y0: Math.min(...ys) - 0.2, y1: Math.max(...ys) + 0.2 }); } return R; }
function footHideOne(e, R) { const a = e.im.instanceMatrix.array, o = e.orig, n = e.im.count; let ch = false;
  for (let i = 0; i < n; i++) { const x = e.pos[i * 2], y = e.pos[i * 2 + 1]; let h = 0; for (const q of R) if (x > q.x0 && x < q.x1 && y > q.y0 && y < q.y1 && inRect(q.r, x, y, 0.12)) { h = 1; break; }
    if (h === e.hid[i]) continue; e.hid[i] = h; ch = true; const b = i * 16; for (let k = 0; k < 16; k++) a[b + k] = o[b + k]; if (h) for (const k of [0, 1, 2, 4, 5, 6, 8, 9, 10]) a[b + k] = 0; }
  if (ch) e.im.instanceMatrix.needsUpdate = true; return ch; }
function footHideApply() { const R = footRects(); let ch = false; for (const e of FOOTHIDE.list) if (footHideOne(e, R)) ch = true; if (ch) markDirty(true); }
window.footHideApply = footHideApply;
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
// gravel lookups from a 1024² copy of the path mask (one small read-back instead of 9.4 MP plus one per plant)
const GMASK = (() => { const n = 1024, c = document.createElement('canvas'); c.width = c.height = n; const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(gmask, 0, 0, n, n); return { n, d: g.getImageData(0, 0, n, n).data, toPx: toPxF(n) }; })();
function gravelMask(x, y) { const [px, py] = GMASK.toPx(x, y); if (px < 0 || py < 0 || px >= GMASK.n || py >= GMASK.n) return 0; return GMASK.d[(Math.floor(py) * GMASK.n + Math.floor(px)) * 4] / 255; }
function buildGrass() {
  const gravelAt = gravelMask;
  const slots = (n, rmax, accept) => { const out = []; let tries = 0; while (out.length < n && tries < n * 6) { tries++; const a = rnd() * 6.283, r = Math.sqrt(rnd()) * rmax; const x = 2 + Math.cos(a) * r, y = 2 + Math.sin(a) * r; if (accept(x, y, r)) out.push([x, y, r]); } return out; };
  const okLawn = (x, y) => { if (x > -1.0 && x < 6.8 && y > -1.0 && y < 5.0) return false; if (STREAM.inDitch(x, y, 0.2) || STREAM.onBridge(x, y)) return false; for (const f of (window.SITE_FOOT || [])) if (inLocal(f.b, x, y, f.hx, f.hy, f.ox, f.oy)) return false; if (gravelAt(x, y) > 0.08) return false; if (!inPoly(x, y, S0.garden) && Math.hypot(x - 2, y - 2) > 9) return false;
    for (const t of S0.trees) if (Math.hypot(t[0] - x, t[1] - y) < 0.35) return false; return true; };
  const N = OFFLINE ? 22000 : (HQ0 ? 22000 : 6000);
  const pts = slots(N, 26, (x, y, r) => okLawn(x, y) && rnd() < 1.25 - r / 22);
  // the rest of the garden (north end, workshop, wooden house): a thinner second ring, own random numbers so the rest of the garden keeps its look
  { const R2 = mulberry(4711), N2 = OFFLINE ? 18000 : (HQ0 ? 18000 : 5000); let tries = 0, n2 = 0;
    while (n2 < N2 && tries < N2 * 10) { tries++; const x = -12.5 + R2() * 29.5, y = -45 + R2() * 83, r = Math.hypot(x - 2, y - 2);
      if (r < 21 || (r < 27.5 && R2() < (27.5 - r) / 6.5)) continue; if (!okLawn(x, y)) continue; pts.push([x, y, r]); n2++; } }
  GLL.load(BASE + 'grass/grass.glb.json', g => {
    let src = null; g.scene.traverse(o => { if (o.isMesh && !src) src = o; }); if (!src) return;
    const geo = src.geometry.clone(); const nn = geo.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0);
    const map = src.material.map; if (map) { map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = ANISO; }
    const mat0 = new THREE.MeshStandardMaterial({ map, color: 0xd6e2b0, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.85, envMapIntensity: 0.7 }); mat0.userData.leak = true; const mat = patchSV(mat0);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    for (const cl of cellsOf(pts.map(([x, y]) => ({ x, y })), 16)) { const im = new THREE.InstancedMesh(geo, mat, cl.length);
      cl.forEach(({ x, y }, i) => { q.setFromAxisAngle(up, rnd() * 6.283); const s = rr(0.1, 0.17), sh = s * rr(0.3, 0.6);
        m4.compose(V(x, y, -0.005), q, new THREE.Vector3(s, sh, s)); im.setMatrixAt(i, m4); im.setColorAt(i, new THREE.Color().setHSL(rr(0.2, 0.25), rr(0.35, 0.55), rr(0.42, 0.56))); });
      im.receiveShadow = true; im.castShadow = false; im.userData.noMerge = true; vegReady(im, 70); scene.add(im); GRASS.meshes.push(im); footHideReg(im); }
    // lawn under the buildings' original footprints (shown once a building has been moved away), own random numbers
    { const R = mulberry(9157), fill = [], N0 = N / (Math.PI * 26 * 26) * 0.9;
      for (const B of Object.values(window.BUILD || {})) for (const q of B.rects) { const r0 = { c: q.c0, az: q.az0, hx: q.hx, hy: q.hy }, cs = rectCorners(r0), xs = cs.map(c => c[0]), ys = cs.map(c => c[1]);
        const d = Math.hypot(q.c0[0] - 2, q.c0[1] - 2), k = N0 * THREE.MathUtils.clamp(1.25 - d / 22, 0, 1); if (d > 26 || k <= 0) continue;
        const n = Math.round(k * 4 * q.hx * q.hy); for (let i = 0; i < n * 2 && fill.length < 4000; i++) { const x = Math.min(...xs) + R() * (Math.max(...xs) - Math.min(...xs)), y = Math.min(...ys) + R() * (Math.max(...ys) - Math.min(...ys));
          if (!inRect(r0, x, y, 0.12) || (x > -1.0 && x < 6.8 && y > -1.0 && y < 5.0) || STREAM.inDitch(x, y, 0.2) || STREAM.onBridge(x, y) || gravelAt(x, y) > 0.08 || !inPoly(x, y, S0.garden)) continue; if (R() < 0.5) fill.push([x, y]); } }
      if (fill.length) { const im = new THREE.InstancedMesh(geo, mat, fill.length);
        fill.forEach(([x, y], i) => { q.setFromAxisAngle(up, R() * 6.283); const s = 0.1 + R() * 0.07, sh = s * (0.3 + R() * 0.3); m4.compose(V(x, y, -0.005), q, new THREE.Vector3(s, sh, s)); im.setMatrixAt(i, m4); im.setColorAt(i, new THREE.Color().setHSL(0.2 + R() * 0.05, 0.35 + R() * 0.2, 0.42 + R() * 0.14)); });
        im.receiveShadow = true; im.castShadow = false; im.userData.noMerge = true; vegReady(im, 70); scene.add(im); GRASS.meshes.push(im); footHideReg(im); GRASS.fill = fill.length; } }
    markDirty();
  });
  for (const [file, n] of [['flower_white.glb', HQ0 ? 160 : 80], ['flower_yellow.glb', HQ0 ? 100 : 50], ['flower_blue.glb', HQ0 ? 60 : 28]]) {
    const fp = slots(n, 30, (x, y, r) => r > 5.5 && okLawn(x, y));
    GLL.load(BASE + 'grass/' + file + '.json', g => { const parts = []; g.scene.updateMatrixWorld(true); g.scene.traverse(o => { if (o.isMesh) parts.push(o); });
      for (const p of parts) { const geo = p.geometry.clone().applyMatrix4(p.matrixWorld); const mat0 = new THREE.MeshStandardMaterial({ map: p.material.map || null, color: p.material.color || 0xffffff, alphaTest: 0.5, side: THREE.DoubleSide, roughness: 0.8 }); mat0.userData.leak = true; const mat = patchSV(mat0);
        if (mat.map) mat.map.colorSpace = THREE.SRGBColorSpace;
        const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
        for (const cl of [fp.map(([x, y]) => ({ x, y }))]) { const im = new THREE.InstancedMesh(geo, mat, cl.length);
          cl.forEach(({ x, y }, i) => { q.setFromAxisAngle(up, rnd() * 6.283); const s = rr(0.05, 0.08); m4.compose(V(x, y, 0), q, new THREE.Vector3(s, s, s)); im.setMatrixAt(i, m4); });
          im.receiveShadow = true; im.userData.noMerge = true; vegReady(im, 36); scene.add(im); GRASS.meshes.push(im); footHideReg(im); } } markDirty(); });
  }
}
// close-up detail: tall grass tufts along the plinth, path edges and tree trunks, ferns in the shade, dandelions in the lawn
function buildDetailPlants() {
  const tufts = [], ferns = [], dand = [];
  const inFoot = (x, y, pad = 0.15) => (window.SITE_FOOT || []).some(f => inLocal(f.b, x, y, f.hx + pad, f.hy + pad, f.ox, f.oy));
  for (let i = 0; i < (HQ0 || OFFLINE ? 260 : 80); i++) { const side = Math.floor(rnd() * 4), o = rr(0.0, 0.35); let x, y;   // (kept: changing this count would reshuffle the random garden)
    if (side < 2) { x = rr(-1.3, 7.3); y = side === 0 ? -1.25 - o : 5.15 + o; } else { y = rr(-1.3, 5.2); x = side === 2 ? -1.25 - o : 7.25 + o; }
    if (side === 3 && y > 2.0 && y < 4.2) continue; tufts.push({ x, y, s: rr(1.6, 2.6), c: rr(0.8, 1.05) }); }
  for (const tr of S0.trees) { if (Math.hypot(tr[0] - 2, tr[1] - 2) > 30) continue; for (let k = 0; k < 6; k++) { const a = rnd() * 6.283, d = rr(0.25, 0.8), x = tr[0] + Math.cos(a) * d, y = tr[1] + Math.sin(a) * d; if (!inFoot(x, y) && !STREAM.onBridge(x, y)) tufts.push({ x, y, z: STREAM.zAt(x, y), s: rr(1.8, 3.0), c: rr(0.75, 1.0) }); }
    if (tr[1] > 4) for (let k = 0; k < 3; k++) { const a = rnd() * 6.283, d = rr(0.5, 1.6), x = tr[0] + Math.cos(a) * d, y = tr[1] + Math.sin(a) * d; if (!inFoot(x, y, 0.3) && !STREAM.onBridge(x, y)) ferns.push({ x, y, z: STREAM.zAt(x, y), s: rr(0.8, 1.3) }); } }
  { const ST = STREAM, n = HQ0 || OFFLINE ? 420 : 170;   // the stream banks: tall grass and ferns following the slope, none on the bridge or the stairs
    for (let i = 0; i < n; i++) { const t = ST.TB + rr(-38, 38), side = rnd() < 0.5 ? -1 : 1, a = side * rr(0.5, ST.WT + 0.25); if (Math.abs(t - ST.TB) < ST.BR.w + 0.45) continue;
      if (side > 0 && ST.STAIRS.some(q => Math.abs(t - q.t) < ST.SW + 0.4)) continue; const [x, y] = ST.wpt(t, ST.cOff(t) + a), z = ST.zAt(x, y);
      if (rnd() < 0.8) tufts.push({ x, y, z: z - 0.01, s: rr(1.8, 3.2), c: rr(0.68, 0.95) }); else ferns.push({ x, y, z, s: rr(0.9, 1.45) }); } }
  for (let i = 0; i < 14; i++) ferns.push({ x: rr(-0.8, 4.8), y: rr(5.1, 5.8), s: rr(0.8, 1.2) });
  for (let i = 0; i < (HQ0 || OFFLINE ? 160 : 70); i++) { const a = rnd() * 6.283, r = rr(6, 26), x = 2 + Math.cos(a) * r, y = 2 + Math.sin(a) * r; if (!inPoly(x, y, S0.garden) || gravelAtPt0(x, y) || inFoot(x, y) || STREAM.inDitch(x, y, 0.2)) continue; dand.push({ x, y, s: rr(0.9, 1.3) }); }
  const reg = () => { const L = []; return { list: L, done: () => L.forEach(footHideReg) }; };
  if (MODELS.grass1) instanceVariants('grass1', tufts.filter((_, i) => i % 2 === 0), Object.assign({ cast: false, env: 0.6, tint: 0xe9f0d8, maxD: 38 }, reg()));
  if (MODELS.grass2) instanceVariants('grass2', tufts.filter((_, i) => i % 2 === 1), Object.assign({ cast: false, env: 0.6, maxD: 38 }, reg()));
  if (MODELS.fern) instanceVariants('fern', ferns, Object.assign({ cast: true, env: 0.6, maxD: 45 }, reg()));
  if (MODELS.dandelion) instanceVariants('dandelion', dand, Object.assign({ cast: false, env: 0.6, maxD: 30 }, reg()));
}
function gravelAtPt0(x, y) { return gravelMask(x, y) > 100 / 255; }
buildGrass(); buildDetailPlants();
