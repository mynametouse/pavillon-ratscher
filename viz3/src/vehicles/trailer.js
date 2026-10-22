// ===================== V16d the stake trailer (Rungenanhänger): tandem axle, 4.4 × 2.0 m bed, four stakes a side, towed by the tractor =====================
// Generic (no make): anthracite frame, galvanised stakes, plank floor, red-and-white boards at the back. Bed 0.98 m high, stakes 1.2 m above
// it, front grid 1.3 m; tandem axle on balance beams in the middle of the bed, tyres 10.0/75-15.3 (Ø 0.77 m); A-frame drawbar hinged at the
// bed front, eye 4.1 m ahead of the axle centre, crank support leg. Towing: the axle follows the tractor's hitch on a tractrix (rigid
// drawbar, wheels without side slip): every step the axle moves towards the hitch so the drawbar keeps its length – exact for one axle,
// close for a tandem. Reversing folds it (jackknife); at 75° the drawbar stops it. The bed collides like a vehicle box (VEH.boxHits): the
// trailer is pushed out and holds the tractor back. Coupled, the tractor pulls the trailer's mass and its load (VEH spec.tow).
// K in the cab (or the button at the tacho) couples when the hitch is close to the eye, and uncouples where the tractor stands; on foot:
// at the drawbar. A parked trailer is an obstacle for vehicles and walkers (VEH.extra). The load is world/holz.js's business (TRAILER.bed).
// Model frame as vehicles/car.js (x right, y forward, z up, origin on the ground under the axle centre). Position in 'pav-trailer-v1'.
const TRAILER = (() => {
  const LD = 4.1, BY0 = -1.9, BY1 = 2.5, HW = 1.0, ZB = 0.98, ZS = 1.2, RT = 0.385, WT = 0.26, AX = 0.46, TRK = 1.68, M0 = 1650, ZP = ZB - 0.2, LR = LD - BY1, EZ = 0.52;
  const HITCH = [0, -2.18, 0.52];   // on the tractor: the pin of the swinging drawbar, behind the rear axle (vehicles/tractor.js model frame)
  const LS = 'pav-trailer-v1', MAXA = 75 * Math.PI / 180;
  const M = { frame: new THREE.MeshStandardMaterial({ color: 0x2c2f33, metalness: 0.45, roughness: 0.55 }), galv: new THREE.MeshStandardMaterial({ color: 0xaab0b4, metalness: 0.75, roughness: 0.42 }),
    black: new THREE.MeshStandardMaterial({ color: 0x151617, roughness: 0.7 }), tyre: new THREE.MeshStandardMaterial({ color: 0x171717, roughness: 0.95 }),
    rim: new THREE.MeshStandardMaterial({ color: 0x8f2a20, metalness: 0.3, roughness: 0.45 }), steel: new THREE.MeshStandardMaterial({ color: 0x9da2a6, metalness: 0.9, roughness: 0.3 }),
    tail: new THREE.MeshStandardMaterial({ color: 0x6d0a0a, roughness: 0.25, emissive: 0xff1a0c, emissiveIntensity: 0 }), brake: new THREE.MeshStandardMaterial({ color: 0x7a0c0c, roughness: 0.25, emissive: 0xff1608, emissiveIntensity: 0 }),
    amber: new THREE.MeshStandardMaterial({ color: 0xd0761c, roughness: 0.3 }), refl: new THREE.MeshStandardMaterial({ color: 0xa3120c, roughness: 0.2, metalness: 0.1 }) };
  // the plank floor and the red-and-white warning boards: canvas textures
  M.floor = (() => { const t = typeof boardTex === 'function' ? boardTex(0x6e5a44, 1 / 14, true, 0.18) : null; return new THREE.MeshStandardMaterial({ color: t ? 0xffffff : 0x6e5a44, map: t, roughness: 0.9 }); })();
  M.warn = (() => { const c = document.createElement('canvas'); c.width = 256; c.height = 64; const q = c.getContext('2d'); q.fillStyle = '#f2f2ee'; q.fillRect(0, 0, 256, 64); q.fillStyle = '#c4161c';
    for (let x = -64; x < 256; x += 48) { q.beginPath(); q.moveTo(x, 64); q.lineTo(x + 24, 64); q.lineTo(x + 88, 0); q.lineTo(x + 64, 0); q.closePath(); q.fill(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.35 }); })();
  M.plate = (() => { const c = document.createElement('canvas'); c.width = 520; c.height = 112; const x = c.getContext('2d'); x.fillStyle = '#f4f4f0'; x.fillRect(0, 0, 520, 112); x.strokeStyle = '#111'; x.lineWidth = 5; x.strokeRect(3, 3, 514, 106);
    x.fillStyle = '#1d3f9a'; x.fillRect(6, 6, 46, 100); x.fillStyle = '#f2d21e'; for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; x.beginPath(); x.arc(29 + Math.cos(a) * 13, 34 + Math.sin(a) * 13, 2.2, 0, 7); x.fill(); }
    x.fillStyle = '#fff'; x.font = 'bold 26px sans-serif'; x.textAlign = 'center'; x.fillText('D', 29, 92); x.fillStyle = '#111'; x.font = 'bold 74px "DIN Alternate", "Arial Narrow", Arial, sans-serif'; x.textAlign = 'left'; x.fillText('HBN T 471', 64, 84);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; return new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, metalness: 0.2 }); })();
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  // static parts are collected per material and merged (few draw calls)
  const parts = new Map(); const put = (geo, mat) => { if (!parts.has(mat)) parts.set(mat, []); parts.get(mat).push(geo); };
  const bxg = (sx, sy, sz, x, y, z, rx = 0) => { const geo = new THREE.BoxGeometry(sx, sz, sy); if (rx) geo.rotateX(rx); geo.translate(...V(x, y, z).toArray()); return geo; };
  const bx = (sx, sy, sz, mat, x, y, z, rx = 0) => put(bxg(sx, sy, sz, x, y, z, rx), mat);
  const rodg = (a, b, r, n = 10) => { const dx = b[0] - a[0], dy = b[1] - a[1], dz = b[2] - a[2], L = Math.hypot(dx, dy, dz); const geo = new THREE.CylinderGeometry(r, r, L, n);
    geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), V(dx, dy, dz).normalize())); geo.translate(...V((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2).toArray()); return geo; };
  // ---- frame: two main beams, the outer rails with stake pockets, cross members; plank floor ----
  const YM = (BY0 + BY1) / 2, BL = BY1 - BY0;
  for (const sx of [-1, 1]) { bx(0.1, BL, 0.16, M.frame, sx * 0.52, YM, ZB - 0.12); bx(0.07, BL, 0.12, M.frame, sx * (HW - 0.035), YM, ZB - 0.08); }
  for (let y = BY0 + 0.03; y <= BY1 - 0.02; y += BL / 7) bx(2 * HW - 0.08, 0.06, 0.08, M.frame, 0, y, ZB - 0.08);
  bx(2 * HW, 0.08, 0.14, M.frame, 0, BY0 + 0.04, ZB - 0.09); bx(2 * HW, 0.1, 0.16, M.frame, 0, BY1 - 0.05, ZB - 0.1);
  { const geo = bxg(2 * HW - 0.06, BL - 0.04, 0.04, 0, YM, ZB - 0.02); const uv = geo.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i), uv.getY(i) * 2.2); put(geo, M.floor); }
  // stakes: four a side in pockets on the outer rail (square tube 80 mm, galvanised), a chain across at the top for the load
  const STK = [-1.72, -0.42, 0.88, 2.18];
  for (const sx of [-1, 1]) for (const y of STK) { bx(0.08, 0.08, ZS + 0.18, M.galv, sx * (HW - 0.045), y, ZB + (ZS - 0.18) / 2); bx(0.12, 0.13, 0.14, M.frame, sx * (HW - 0.03), y, ZB - 0.12); bx(0.09, 0.09, 0.025, M.galv, sx * (HW - 0.045), y, ZB + ZS); }
  // front grid: frame, vertical bars, a cross bar; a little tool box on the drawbar side
  for (const sx of [-1, 1]) bx(0.07, 0.07, 1.34, M.frame, sx * (HW - 0.06), BY1 - 0.06, ZB + 0.65);
  bx(2 * HW - 0.06, 0.07, 0.07, M.frame, 0, BY1 - 0.06, ZB + 1.3); bx(2 * HW - 0.06, 0.05, 0.05, M.frame, 0, BY1 - 0.06, ZB + 0.66);
  for (let k = 1; k < 9; k++) bx(0.035, 0.025, 1.28, M.frame, -HW + 0.06 + k * (2 * HW - 0.12) / 9, BY1 - 0.06, ZB + 0.66);
  bx(0.5, 0.3, 0.3, M.frame, 0.52, BY1 + 0.2, ZB - 0.28);
  // tandem axle: balance beams on both sides with the pivot bracket, two axles (wheels: their own nodes below)
  for (const sx of [-1, 1]) { const x = sx * 0.62; bx(0.08, 1.22, 0.12, M.frame, x, 0, RT); bx(0.1, 0.2, ZB - 0.2 - RT, M.frame, x, 0, (ZB - 0.2 + RT) / 2); put(rodg([x - 0.07, 0, RT], [x + 0.07, 0, RT], 0.05, 12), M.steel); }
  for (const y of [-AX, AX]) put(rodg([-TRK / 2 + 0.08, y, RT], [TRK / 2 - 0.08, y, RT], 0.045, 12), M.black);
  // the back: light bar with tail lamps, indicators and reflectors, warning boards, number plate, mud flaps
  bx(2 * HW, 0.06, 0.12, M.frame, 0, BY0 - 0.02, ZB - 0.36); for (const sx of [-1, 1]) bx(0.05, 0.05, 0.26, M.frame, sx * 0.8, BY0 + 0.0, ZB - 0.2);
  const tails = [], brakes = [];
  for (const sx of [-1, 1]) { const tl = new THREE.Mesh(bxg(0.14, 0.04, 0.06, sx * 0.84, BY0 - 0.06, ZB - 0.33), M.tail), br = new THREE.Mesh(bxg(0.14, 0.04, 0.05, sx * 0.84, BY0 - 0.06, ZB - 0.39), M.brake); body.add(tl, br); tails.push(tl); brakes.push(br);
    bx(0.1, 0.04, 0.05, M.amber, sx * 0.66, BY0 - 0.06, ZB - 0.36); put(new THREE.CylinderGeometry(0.045, 0.045, 0.012, 3).rotateX(Math.PI / 2).translate(...V(sx * 0.48, BY0 - 0.06, ZB - 0.36).toArray()), M.refl);
    put(bxg(0.28, 0.012, 0.28, sx * (HW - 0.16), BY0 - 0.065, ZB - 0.62), M.warn); bx(0.36, 0.012, 0.32, M.black, sx * 0.84, -AX - 0.48, 0.2); }
  put(bxg(0.52, 0.012, 0.112, 0, BY0 - 0.065, ZB - 0.62), M.plate);
  for (const [mat, list] of parts) { const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(list), mat); m.castShadow = true; m.receiveShadow = true; body.add(m); }
  // ---- the drawbar: an A-frame hinged at the bed front (turns about x so the eye meets the hitch), eye, support leg ----
  const db = new THREE.Group(); db.position.copy(V(0, BY1, ZP)); body.add(db);
  { const L = [], s = []; for (const sx of [-1, 1]) L.push(rodg([sx * 0.48, -0.05, 0], [0, LR - 0.28, 0], 0.045, 10)); L.push(rodg([0, LR - 0.3, 0], [0, LR - 0.06, 0], 0.05, 12)); L.push(rodg([-0.3, 0.45, 0], [0.3, 0.45, 0], 0.03, 8));
    const m = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(L), M.frame); m.castShadow = true; db.add(m);
    const eye = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.022, 8, 18), M.steel); eye.position.copy(V(0, LR, 0)); eye.rotation.x = Math.PI / 2; eye.castShadow = true; db.add(eye);
    for (const sx of [-1, 1]) { const h = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.16, 8), M.black); h.rotation.z = Math.PI / 2; h.position.copy(V(sx * 0.42, 0.06, 0.02)); db.add(h); } }   // brake and light hoses (folded)
  const leg = new THREE.Group(); leg.position.copy(V(0.0, LR - 0.62, 0)); db.add(leg);
  const legO = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.42, 10), M.frame); legO.position.y = -0.1; leg.add(legO);
  const crank = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.02), M.black); crank.position.set(0.08, 0.13, 0); leg.add(crank);
  const legI = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.026, 1, 10), M.galv), foot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.02, 0.16), M.frame); leg.add(legI, foot); legO.castShadow = legI.castShadow = foot.castShadow = true;
  // ---- wheels: tandem, tyres 10.0/75-15.3 (lathe with a tread band), red rims ----
  const tyreGeo = (() => { const r = RT, w = WT, ri = r * 0.6, sh = w * 0.2, pts = [[ri, -w / 2], [r - sh, -w / 2], [r, -w / 2 + sh], [r, w / 2 - sh], [r - sh, w / 2], [ri, w / 2]].map(([a, b]) => new THREE.Vector2(a, b)); const gg = new THREE.LatheGeometry(pts, 32); gg.rotateZ(Math.PI / 2);
    const lug = new THREE.BoxGeometry(w * 0.86, 0.02, 0.05), gs = [gg], m4 = new THREE.Matrix4(); for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; m4.makeRotationX(a); m4.setPosition(0, Math.cos(a) * (r + 0.004), Math.sin(a) * (r + 0.004)); gs.push(lug.clone().applyMatrix4(m4)); }
    return BufferGeometryUtils.mergeGeometries(gs.map(x => x.index ? x.toNonIndexed() : x)); })();
  const rimGeo = new THREE.CylinderGeometry(RT * 0.6, RT * 0.6, WT * 0.82, 24).rotateZ(Math.PI / 2), hubGeo = new THREE.CylinderGeometry(0.07, 0.09, 0.08, 12).rotateZ(Math.PI / 2);
  const wheels = [];
  for (const y of [-AX, AX]) for (const sx of [-1, 1]) { const x = sx * TRK / 2, piv = new THREE.Group(), node = new THREE.Group(); piv.position.copy(V(x, y, RT)); piv.add(node); g.add(piv);
    const t = new THREE.Mesh(tyreGeo, M.tyre), rm = new THREE.Mesh(rimGeo, M.rim), hb = new THREE.Mesh(hubGeo, M.steel); hb.position.x = sx * WT * 0.42; node.add(t, rm, hb); for (const m of [t, rm, hb]) { m.castShadow = true; m.receiveShadow = true; }
    wheels.push({ x, y, piv, node }); }
  g.traverse(o => { if (o.isMesh) o.userData.noMerge = true; });
  // ---------------- state, saving ----------------
  const S = { g, LD, HITCH, bed: { y0: BY0 + 0.06, y1: BY1 - 0.1, hw: HW - 0.1, z: ZB, h: ZS }, st: { x: 0, y: 0, psi: 0, z: 0, pitch: 0, roll: 0, spin: 0 }, tow: null, cargo: 0, ver: 0, placed: false };
  const fwd = a => [Math.sin(a), Math.cos(a)], rgt = a => [Math.cos(a), -Math.sin(a)];
  const toW = (lx, ly) => { const s = S.st, f = fwd(s.psi), r = rgt(s.psi); return [s.x + r[0] * lx + f[0] * ly, s.y + r[1] * lx + f[1] * ly]; };
  const tr = () => window.VEH && VEH.by && VEH.by.tractor;
  const hitchW = v => { const p = VEH.toW(v, HITCH[0], HITCH[1]), s = v.st; return [p[0], p[1], s.z + HITCH[2] + Math.sin(s.pitch) * HITCH[1]]; };
  const eyeW = () => toW(0, LD);
  function save() { try { localStorage.setItem(LS, JSON.stringify({ x: +S.st.x.toFixed(2), y: +S.st.y.toFixed(2), psi: +S.st.psi.toFixed(4), c: !!S.tow })); } catch (e) {} }
  // ---------------- pose: on its wheels (balance beams: each wheel on its ground), the drawbar to the hitch or onto the support leg ----------------
  const _e = new THREE.Euler(0, 0, 0, 'YXZ');
  let legT = 1;   // 1: leg down (parked), 0: up (coupled)
  function pose(dt = 0) { const s = S.st, zq = s.z + 0.7; let zf = 0, zr = 0, zl = 0, zrr = 0;
    for (const w of wheels) { const p = toW(w.x, w.y); w.gz = ROADS.groundAt(p[0], p[1], zq); if (w.y > 0) zf += w.gz / 2; else zr += w.gz / 2; if (w.x < 0) zl += w.gz / 2; else zrr += w.gz / 2; }
    s.z = (zf + zr) / 2; s.pitch = Math.atan2(zf - zr, 2 * AX) * 0.5; s.roll = Math.atan2(zl - zrr, TRK);   // the balance beams take half of the slope between the axles
    g.position.copy(V(s.x, s.y, s.z)); _e.set(s.pitch, -s.psi, -s.roll, 'YXZ'); g.quaternion.setFromEuler(_e);
    for (const w of wheels) { w.node.rotation.x = -s.spin; const zPlane = s.z + Math.sin(s.pitch) * w.y - Math.sin(s.roll) * w.x; w.piv.position.y = RT + THREE.MathUtils.clamp(w.gz - zPlane, -0.08, 0.08); }
    // the drawbar: the eye's height above the pivot gives its angle
    const pz = s.z + ZP + Math.sin(s.pitch) * BY1; let ez;
    const v = S.tow; if (v) ez = hitchW(v)[2]; else { const e = eyeW(); ez = ROADS.groundAt(e[0], e[1], zq) + EZ; }
    const ph = Math.asin(THREE.MathUtils.clamp((ez - pz) / LR, -0.7, 0.7)) - s.pitch; db.rotation.x = ph;
    // the support leg stays upright and reaches the ground when parked
    legT = THREE.MathUtils.clamp(legT + (v ? -1 : 1) * dt * 1.6, 0, 1); leg.rotation.x = -ph - s.pitch;
    const lw = (() => { const e = toW(0, BY1 + (LR - 0.62) * Math.cos(ph)); return ROADS.groundAt(e[0], e[1], zq); })(), top = pz + Math.sin(ph + s.pitch) * (LR - 0.62);
    const reach = Math.max(0.12, top - lw - 0.02), Lg = 0.12 + (reach - 0.12) * legT; legI.scale.y = Lg; legI.position.y = -0.1 - Lg / 2 + 0.06; foot.position.y = -0.1 - Lg + 0.06; crank.rotation.x = legT * 6; }
  // ---------------- towing: the tractrix, the fold limit, collisions ----------------
  function follow(v, dt) { const s = S.st, H = hitchW(v); let dx = s.x - H[0], dy = s.y - H[1], d = Math.hypot(dx, dy);
    if (d > LD + 2.5 || d < 0.5) { place(H, v.st.psi); return; }   // the tractor was put somewhere else
    const ox = s.x, oy = s.y; s.x = H[0] + dx / d * LD; s.y = H[1] + dy / d * LD; s.psi = Math.atan2(H[0] - s.x, H[1] - s.y);
    let rel = s.psi - v.st.psi; while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI;
    if (Math.abs(rel) > MAXA) { s.psi = v.st.psi + Math.sign(rel) * MAXA; const f = fwd(s.psi); s.x = H[0] - f[0] * LD; s.y = H[1] - f[1] * LD; }
    const f = fwd(s.psi), mv = (s.x - ox) * f[0] + (s.y - oy) * f[1]; s.spin += mv / RT;
    // the bed against walls, trunks, the garden and other vehicles: pushed out, and the tractor is held back by as much
    const B = box(); if (B) { const hits = VEH.boxHits(B, s.z + 0.3, s.z + ZB + Math.max(0.3, S.cargoH || 0), v); let push = [0, 0], big = 0;
      for (const [h] of hits) { if (h.d < 0.004) continue; push[0] += h.n[0] * h.d; push[1] += h.n[1] * h.d; big = Math.max(big, h.d); }
      if (big > 0.004) { s.x += push[0]; s.y += push[1]; const vs = v.st, vf = fwd(vs.psi), vr = rgt(vs.psi); vs.x += push[0]; vs.y += push[1];
        const pn = Math.hypot(push[0], push[1]), nx = push[0] / pn, ny = push[1] / pn, wv = [vs.u * vf[0] + vs.v * vr[0], vs.u * vf[1] + vs.v * vr[1]], into = wv[0] * nx + wv[1] * ny;
        if (into < 0) { wv[0] -= into * nx; wv[1] -= into * ny; vs.u = wv[0] * vf[0] + wv[1] * vf[1]; vs.v = wv[0] * vr[0] + wv[1] * vr[1]; if (-into > 1.2 && window.VSND) VSND.thud(v, Math.min(1, -into / 6)); }
        S.hitT = performance.now(); } }
    S.ver++; }
  function box() { const s = S.st, f = fwd(s.psi), r = rgt(s.psi), cy = (BY0 + BY1) / 2; return { c: [s.x + f[0] * cy, s.y + f[1] * cy], ax: r, ay: f, ex: HW + 0.02, ey: (BY1 - BY0) / 2 + 0.03, z0: s.z + 0.15, z1: s.z + ZB + ZS }; }
  // straight behind the hitch H (heading psi of the tractor)
  function place(H, psi) { const f = fwd(psi); Object.assign(S.st, { x: H[0] - f[0] * LD, y: H[1] - f[1] * LD, psi }); S.ver++; pose(); }
  // ---------------- coupling ----------------
  const canCouple = v => { if (!v || S.tow) return false; const H = hitchW(v), e = eyeW(); let rel = v.st.psi - S.st.psi; while (rel > Math.PI) rel -= 2 * Math.PI; while (rel < -Math.PI) rel += 2 * Math.PI;
    return Math.hypot(H[0] - e[0], H[1] - e[1]) < 1.25 && Math.abs(rel) < 0.8 && Math.abs(H[2] - (ROADS.groundAt(e[0], e[1]) + EZ)) < 0.6; };
  function couple(v, quiet) { if (!v) return false; S.tow = v; v.spec.tow = () => M0 + (S.cargo || 0);
    const H = hitchW(v), s = S.st, dx = s.x - H[0], dy = s.y - H[1], d = Math.hypot(dx, dy) || 1; s.x = H[0] + dx / d * LD; s.y = H[1] + dy / d * LD; s.psi = Math.atan2(H[0] - s.x, H[1] - s.y);
    S.ver++; pose(); if (!quiet) { SFX.drop && SFX.drop(); PLAY.think('Angekuppelt: Bolzen zu, Stützfuß hoch, Licht- und Bremsleitung dran.', 3200); } save(); markDirty(true); return true; }
  function uncouple(quiet) { const v = S.tow; if (!v) return false; if (Math.hypot(v.st.u, v.st.v) > 0.4) { PLAY.think('Erst anhalten.', 1500); return false; }
    S.tow = null; delete v.spec.tow; if (!quiet) { SFX.drop && SFX.drop(); PLAY.think('Abgekuppelt: Stützfuß runter, Leitungen ab, Bolzen raus.', 3000); } save(); markDirty(true); return true; }
  function toggle() { const v = tr(); if (S.tow) return uncouple(); if (canCouple(v)) return couple(v); const H = v && hitchW(v), e = eyeW(), d = H ? Math.hypot(H[0] - e[0], H[1] - e[1]) : 99;
    PLAY.think(d < 6 ? `Die Kupplung ist noch ${d.toFixed(1).replace('.', ',')} m von der Öse weg – rückwärts genau davor stellen (Kamera hinter dem Traktor hilft).` : 'Kein Anhänger hinter dem Traktor.', 3200); return false; }
  // ---------------- per frame ----------------
  let lastSave = 0;
  function update(dt) { if (!LOAD.finished || !S.placed) return; const v = S.tow;
    if (v) { const sp = Math.hypot(v.st.u, v.st.v); if (sp > 0.001 || S.dirty) { follow(v, dt); S.dirty = false; pose(dt); markDirty(); lastSave += sp * dt; if (lastSave > 40) { lastSave = 0; save(); } } else if (legT > 0) pose(dt);
      const on = VEH.lightsOn(v), brk = v.st.brakeOn && v.st.engine; for (const m of tails) m.material.emissiveIntensity = on ? 1.6 : 0; for (const m of brakes) m.material.emissiveIntensity = brk ? 3.2 : on ? 1.2 : 0; }
    else if (legT < 1) { pose(dt); markDirty(); } }
  window.TICKS.unshift(dt => { try { update(dt); } catch (e) { if (!S._err) { S._err = 1; console.warn('trailer', e); } } });   // runs after VEH (which unshifted itself before): see below
  // VEH puts its tick first; the trailer must follow the tractor in the same frame: move it right behind VEH's tick
  { const i = window.TICKS.findIndex(f => String(f).includes('update(dt); } catch (e) { if (!S._err) { S._err = 1; console.warn(\'trailer\''));
    const j = window.TICKS.findIndex(f => String(f).includes("console.warn('veh'")); if (i >= 0 && j >= 0 && i < j) { const f = window.TICKS.splice(i, 1)[0]; window.TICKS.splice(j, 0, f); } }
  // ---------------- in the world ----------------
  scene.add(g);
  VEH.extra.push(S.ex = { box: () => box(), get tow() { return S.tow; }, trailer: true });
  // on foot at the drawbar: couple / uncouple
  PLAY.act({ id: 'trailer:hitch', r: 1.9, prio: 0.6, obj: () => g, pos: () => { const e = toW(0, LD - 0.3); return [e[0], e[1], S.st.z + 0.6]; },
    label: () => { if (VEH.cur) return null; const v = tr(); return S.tow ? 'Anhänger abkuppeln' : canCouple(v) ? 'Anhänger ankuppeln' : null; },
    run: () => { if (S.tow) uncouple(); else couple(tr()); } });
  // the tractor's home: the trailer coupled behind it; "Fahrzeuge zurückstellen" sets it back there
  function home() { const v = tr(); if (!v) return; place(hitchW(v), v.st.psi); couple(v, true); }
  const reset0 = VEH.reset; VEH.reset = () => { reset0(); home(); };
  whenLoaded(() => { const v = tr(); let sv = null; try { sv = JSON.parse(localStorage.getItem(LS) || 'null'); } catch (e) {}
    if (sv && isFinite(sv.x) && isFinite(sv.y)) { Object.assign(S.st, { x: sv.x, y: sv.y, psi: sv.psi || 0 }); S.placed = true; if (sv.c && v) couple(v, true); else pose(); }
    else { S.placed = true; home(); }
    legT = S.tow ? 0 : 1; pose(); markDirty(true); });
  // the load (world/holz.js): a world point in the bed's frame [x across, y along, z above the bed floor]
  const local = p => { const s = S.st, dx = p[0] - s.x, dy = p[1] - s.y, f = fwd(s.psi), r = rgt(s.psi); return [dx * r[0] + dy * r[1], dx * f[0] + dy * f[1], (p[2] || 0) - s.z - ZB]; };
  // where a log of radius r put down at x (across) comes to rest: it rolls into the lowest gap between the stakes and the logs already there
  // (circles in the cross-section; the load lies lengthwise); null when it would stick out above the stakes
  function slot(x0, r) { const L = S.loadList || [], hw = S.bed.hw, zAt = x => { let z = r; for (const o of L) { const ro = (o.d0 + o.d1) / 400, dx = Math.abs(x - o.tx); if (dx < r + ro) z = Math.max(z, o.tz + Math.sqrt((r + ro) ** 2 - dx * dx)); } return z; };
    let x = THREE.MathUtils.clamp(x0, -hw + r, hw - r), z = zAt(x);
    for (let k = 0; k < 200; k++) { const zl = x - 0.01 >= -hw + r ? zAt(x - 0.01) : 1e9, zr = x + 0.01 <= hw - r ? zAt(x + 0.01) : 1e9; if (zl < z - 1e-4 && zl <= zr) { x -= 0.01; z = zl; } else if (zr < z - 1e-4) { x += 0.01; z = zr; } else break; }
    return z + r > ZS + 0.05 ? null : { x, z }; }
  return Object.assign(S, { toW, eyeW, hitchW, box, pose, couple, uncouple, toggle, canCouple, home, save, local, slot, mass: () => M0 + (S.cargo || 0) });
})();
window.TRAILER = TRAILER;
