// ===================== V16e near the walker: what makes the village lived in, loaded and dropped by distance (VNEAR) =====================
// Per house (always the same, from its number): a fence or a hedge along the street with a gate at the door, flower boxes under the street
// windows, wheelie bins, a woodpile at a side wall (barns too), a lamp over the door (lit at night), the blue house-number plate,
// sometimes a satellite dish. Built per 80 m cell when the camera comes within 95 m of it, one cell per tick, and dropped again beyond 170 m:
// one mesh and one draw call per cell, one material for all (kinds: plain, log ends, hedge leaves, boards, lamp glass). Window places
// follow the facade shader's bays (world/village.js); fences stop short of other buildings and of the road (ROADS.edge).
const VNEAR = (() => {
  const S = { on: false, cells: new Map(), built: 0, dropped: 0, CS: 80, R1: 95, R2: 170 };
  if (!window.RATSCHER || !RATSCHER.on) return S;
  const hh = n => { const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453; return s - Math.floor(s); };
  const lin = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4), L = (r, g, b) => [lin(r), lin(g), lin(b)];
  const gz = (x, y) => RATSCHER.hMesh ? RATSCHER.hMesh(x, y) : RATSCHER.hAt(x, y);
  const FENCE = [L(0.92, 0.91, 0.87), L(0.45, 0.30, 0.20), L(0.25, 0.36, 0.25), L(0.18, 0.18, 0.18), L(0.55, 0.38, 0.24)], HEDGE = L(0.22, 0.36, 0.16), BINS = [L(0.28, 0.29, 0.30), L(0.15, 0.30, 0.60), L(0.42, 0.28, 0.16), L(0.85, 0.72, 0.10)];
  const FLOW = [L(0.82, 0.10, 0.12), L(0.92, 0.35, 0.55), L(0.95, 0.93, 0.90), L(0.85, 0.30, 0.15)], LEAF = L(0.20, 0.38, 0.14), BOX = L(0.40, 0.25, 0.15);
  // ---- the material: vertex colours, kinds by attribute ----
  const U = { uNightL: { value: 0 } };
  function mat() { const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, envMapIntensity: 0.6 }); m.defines = { USE_UV: '' };
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, U);
      sh.vertexShader = 'attribute float aK; varying float vK;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vK = aK;');
      sh.fragmentShader = `varying float vK; uniform float uNightL;
        float nh( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
        float nn( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f ); return mix( mix( nh( i ), nh( i + vec2( 1, 0 ) ), f.x ), mix( nh( i + vec2( 0, 1 ) ), nh( i + vec2( 1, 1 ) ), f.x ), f.y ); }
        float gGlowN = 0.0;\n` + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        { float k = floor( vK + 0.5 ); vec2 p = vUv; float px = max( fwidth( p.x ), fwidth( p.y ) ), aa = smoothstep( 0.01, 0.05, px );
          if ( k == 1.0 ) {   // log ends: rings of light wood, bark, dark gaps between the logs
            vec2 q = p / 0.19 + vec2( 0.5 * mod( floor( p.y / 0.19 ), 2.0 ), 0.0 ), c = floor( q ), f = fract( q ) - 0.5; float r = 0.40 + 0.08 * nh( c ), d = length( f );
            vec3 wood = vec3( 0.42, 0.30, 0.17 ) * ( 0.8 + 0.3 * nh( c + 3.1 ) ) * ( 0.9 + 0.1 * sin( d * 90.0 ) );
            diffuseColor.rgb *= mix( mix( wood, vec3( 0.14, 0.09, 0.06 ), smoothstep( r - 0.07, r, d ) ), vec3( 0.03 ), smoothstep( r, r + 0.04, d ) ) * ( 1.0 - aa ) + vec3( 0.2, 0.14, 0.08 ) * aa; }
          else if ( k == 2.0 ) { float n = nn( p * 14.0 ) * 0.6 + nn( p * 37.0 ) * 0.4; diffuseColor.rgb *= mix( 0.45 + 0.9 * n * n, 0.75, aa ); }   // hedge leaves
          else if ( k == 3.0 ) { diffuseColor.rgb *= 0.9 + 0.12 * nn( vec2( p.x * 40.0, p.y * 2.0 ) ) * ( 1.0 - aa ); }   // boards
          else if ( k == 4.0 ) { gGlowN = 1.0; } }`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += vec3( 1.0, 0.75, 0.45 ) * 5.0 * uNightL * gGlowN;'); };
    m.customProgramCacheKey = () => 'v16e-near'; return m; }
  let M = null;
  // ---- the facade's windows as the shader places them (bays, storeys, the low-eave rule) ----
  function windows(b, f) { const o = b.st, st = o.style, ST = VILLAGE.ST, out = [];
    if (![ST.PLASTER, ST.MODERN, ST.SLATE, ST.SLATE_UP, ST.SLATE_GABLE, ST.FW, ST.FW_UP].includes(st) || f.kind !== 'eave') return out;
    const plH = o.raised ? 0.6 : 0.35, stH = 2.75, ww = st === ST.MODERN ? 1.25 : 0.95, wh0 = st === ST.MODERN ? 1.4 : 1.3, sill0 = 0.85, nb = Math.max(1, Math.floor((f.L - 0.6) / o.sp)), bw = f.L / nb;
    if (f.L < ww + 0.7) return out;
    for (let fi = 0; fi < 3; fi++) { let sill = sill0, wh = wh0; const fb = plH + fi * stH, eave = Math.min(f.t0, f.t1);
      if (fi === 0) { const fit = eave - 0.25 - fb - sill; if (fit < wh && fit > 0.75) wh = fit; else if (fit <= 0.75) { sill = Math.max(0.5, eave - 0.25 - fb - 0.9); wh = 0.9; } }
      if (eave - (fb + sill + wh) < 0.18 || fb + sill > eave - 0.2) break;
      for (let i = 0; i < nb; i++) { const bc = (i + 0.5) * bw; if (f.door && fi === 0 && Math.abs(bc - f.door.u) < Math.max(bw * 0.5, f.door.w * 0.5 + ww * 0.5 + 0.1)) continue; out.push({ u: bc, v: fb + sill, w: ww, fi }); } }
    return out; }
  const onWall = (b, f, u, off, v) => [f.ax + f.dx * u + f.nx * off, f.ay + f.dy * u + f.ny * off, b.foot + v];
  // is (x, y) free of every building (margin m) – fences and piles stop there
  function freeAt(x, y, m, skip) { for (const b of VILLAGE.bld) { if (b === skip || x < b.bb[0] - m || x > b.bb[2] + m || y < b.bb[1] - m || y > b.bb[3] + m) continue;
      let c = false; for (const f of b.fac) if ((f.ay > y) !== (f.by > y) && x < (f.bx - f.ax) * (y - f.ay) / (f.by - f.ay) + f.ax) c = !c; if (c) return false;
      for (const f of b.fac) { const dx = x - f.ax, dy = y - f.ay, t = Math.max(0, Math.min(f.L, dx * f.dx + dy * f.dy)); if (Math.hypot(dx - f.dx * t, dy - f.dy * t) < m) return false; } } return true; }
  // ---- one house's things ----
  function house(K, b) { const o = b.st, ST = VILLAGE.ST, k1 = hh(b.id + 51), k2 = hh(b.id + 53), k3 = hh(b.id + 57);
    const F = b.fac.find(f => f.door), isHouse = b.typ === 0;
    if (isHouse && F) {
      // the street: how far in front of the door facade the road begins
      let dR = 0; for (let d = 1.5; d < 16; d += 0.5) { const p = onWall(b, F, F.door.u, d, 0); if (window.ROADS && ROADS.edge && ROADS.edge(p[0], p[1]) > -0.7) { dR = d; break; } }
      if (dR > 2.6) {   // a fence or a hedge, with a gate in front of the door
        const dF = dR - 0.7, hedge = k1 < 0.28, col = FENCE[Math.floor(k2 * FENCE.length)], ext = 3 + k3 * 3, u0 = -ext, u1 = F.L + ext, gate = [F.door.u - 0.6, F.door.u + 0.6];
        let run = null; const runs = []; for (let u = u0; u <= u1 + 1e-6; u += 0.25) { const p = onWall(b, F, u, dF, 0), ok = (u < gate[0] || u > gate[1]) && freeAt(p[0], p[1], 0.6, null) && !(window.ROADS && ROADS.edge(p[0], p[1]) > -0.35);
          if (ok) { if (!run) run = [u, u]; else run[1] = u; } else if (run) { runs.push(run); run = null; } } if (run) runs.push(run);
        for (const [a, c] of runs) { if (c - a < 0.8) continue; const A = onWall(b, F, a, dF, 0), C = onWall(b, F, c, dF, 0), len = c - a, rot = Math.atan2(F.dy, F.dx), mx = (A[0] + C[0]) / 2, my = (A[1] + C[1]) / 2;
          if (hedge) { const n = Math.ceil(len / 2.5); for (let i = 0; i < n; i++) { const t0 = a + i * len / n, t1 = a + (i + 1) * len / n, P = onWall(b, F, (t0 + t1) / 2, dF, 0); K.kind(2).box(P[0], P[1], gz(P[0], P[1]) - 0.1, t1 - t0 + 0.02, 0.62, 1.15 + hh(b.id + i) * 0.15, rot, HEDGE); } continue; }
          for (let u = a; u <= c + 1e-6; u += 2.0) { const P = onWall(b, F, Math.min(u, c), dF, 0); K.kind(3).box(P[0], P[1], gz(P[0], P[1]) - 0.05, 0.08, 0.08, 1.12, rot, col); }   // posts
          for (const zz of [0.25, 0.8]) { const n = Math.ceil(len / 3); for (let i = 0; i < n; i++) { const t0 = a + i * len / n, t1 = a + (i + 1) * len / n, P = onWall(b, F, (t0 + t1) / 2, dF - 0.05, 0); K.kind(3).box(P[0], P[1], gz(P[0], P[1]) + zz, t1 - t0, 0.03, 0.07, rot, col); } }
          for (let u = a + 0.06; u < c; u += 0.12) { const P = onWall(b, F, u, dF - 0.08, 0); K.kind(3).box(P[0], P[1], gz(P[0], P[1]) + 0.08, 0.07, 0.02, 0.92 + 0.06 * ((u * 8.33 | 0) % 2), rot, col); } }   // pickets
        if (!hedge) { const P = onWall(b, F, gate[1] + 0.35, dF - 0.25, 0); K.kind(0).box(P[0], P[1], gz(P[0], P[1]), 0.06, 0.06, 1.0, 0, L(0.3, 0.3, 0.3)); K.box(P[0], P[1], gz(P[0], P[1]) + 1.0, 0.36, 0.22, 0.3, Math.atan2(F.dy, F.dx), k3 < 0.5 ? L(0.15, 0.15, 0.16) : L(0.55, 0.15, 0.12)); } }   // mailbox
      // flower boxes under some street windows (geraniums)
      if (k2 < 0.45) for (const w of windows(b, F)) { if (hh(b.id * 7 + w.u) > 0.75) continue; const P = onWall(b, F, w.u, 0.13, w.v - 0.2), rot = Math.atan2(F.dy, F.dx), fc = FLOW[Math.floor(hh(b.id + w.u) * FLOW.length)];
        K.kind(0).box(P[0], P[1], P[2], w.w + 0.05, 0.2, 0.17, rot, BOX);
        for (let i = 0; i < 6; i++) { const t = (i + 0.5) / 6 - 0.5, Q = onWall(b, F, w.u + t * w.w, 0.13 + (hh(i + b.id) - 0.5) * 0.08, w.v - 0.01 + hh(i * 3 + b.id) * 0.06); K.ball(Q[0], Q[1], Q[2], 0.075, i % 2 ? LEAF : fc, 5); }
        for (let i = 0; i < 3; i++) { const Q = onWall(b, F, w.u + ((i + 0.5) / 3 - 0.5) * w.w, 0.2, w.v - 0.28); K.ball(Q[0], Q[1], Q[2], 0.07, LEAF, 5); } }
      // the door: lamp above, blue number plate beside it
      { const d0 = o.raised ? 0.6 : 0.35, P = onWall(b, F, F.door.u, 0.08, d0 + 2.38), rot = Math.atan2(F.dy, F.dx); K.kind(0).box(P[0], P[1], P[2], 0.12, 0.12, 0.2, rot, L(0.12, 0.12, 0.12)); const G = onWall(b, F, F.door.u, 0.15, d0 + 2.4); K.kind(4).box(G[0], G[1], G[2], 0.1, 0.06, 0.14, rot, L(0.9, 0.85, 0.7));
        const N2 = onWall(b, F, F.door.u + 0.78, 0.02, d0 + 1.9); K.kind(0).box(N2[0], N2[1], N2[2], 0.22, 0.02, 0.16, rot, L(0.12, 0.25, 0.62)); const N3 = onWall(b, F, F.door.u + 0.78, 0.035, d0 + 1.93); K.box(N3[0], N3[1], N3[2], 0.12, 0.01, 0.1, rot, L(0.9, 0.9, 0.9)); }
      // wheelie bins beside the door
      { const n = 1 + Math.floor(k3 * 3), side = k1 < 0.5 ? -1 : 1, rot = Math.atan2(F.dy, F.dx); for (let i = 0; i < n; i++) { const u = F.door.u + side * (1.3 + i * 0.68); if (u < 0.4 || u > F.L - 0.4) continue; const P = onWall(b, F, u, 0.55, 0), z = gz(P[0], P[1]);
          if (!freeAt(P[0], P[1], 0.2, b)) continue; const c = BINS[Math.floor(hh(b.id + i * 5) * BINS.length)]; K.kind(0).box(P[0], P[1], z, 0.58, 0.72, 0.95, rot, c); K.box(P[0], P[1], z + 0.95, 0.62, 0.78, 0.05, rot, c.map(v => v * 0.8)); } }
      // a satellite dish under the eave
      if (k3 > 0.78) { const P = onWall(b, F, F.L * 0.82, 0.35, Math.min(F.t0, F.t1) - 0.7), nx = F.nx, ny = F.ny; K.kind(0).lathe(P[0], P[1], P[2] - 0.3, [[0.0, 0], [0.02, 0.3]], 4, L(0.6, 0.6, 0.6)); K.disc(P[0] + nx * 0.05, P[1] + ny * 0.05, P[2] + 0.05, nx, ny, 0.32, L(0.85, 0.85, 0.84), 14); } }
    // a woodpile at a side wall (houses and barns), facing out
    if ((isHouse && k1 > 0.55) || (b.st.style === ST.BARN || b.st.style === ST.BARN_FULL) && k2 > 0.4) {
      const side = b.fac.filter(f => f !== F && f.L > 3.2 && f.kind !== 'slope').sort((p, q) => hh(b.id + p.L) - hh(b.id + q.L))[0];
      if (side) { const len = Math.min(3.4, side.L * 0.55), u = side.L / 2, P = onWall(b, side, u, 0.4, 0), rot = Math.atan2(side.dy, side.dx);
        if (freeAt(P[0] + side.nx * 0.4, P[1] + side.ny * 0.4, 0.3, b)) { const z = gz(P[0], P[1]), h = 1.25 + k2 * 0.4;
          K.kind(1).box(P[0], P[1], z, len, 0.5, h, rot, [1, 1, 1]); const T = onWall(b, side, u, 0.55, 0); K.kind(3).box(T[0], T[1], z + h, len + 0.3, 0.8, 0.04, rot, L(0.35, 0.33, 0.30)); } } } }
  // ---- cells ----
  function cellOf(x, y) { return Math.floor(x / S.CS) + ':' + Math.floor(y / S.CS); }
  function buildCell(c) { const K = VPROPS.kit(); for (const b of c.bld) { try { house(K, b); } catch (e) { console.warn('village near', b.id, e); } }
    if (K.empty()) { c.mesh = null; c.ready = true; return; }
    const me = new THREE.Mesh(K.geo(), M || (M = mat())); me.userData.noMerge = true; me.castShadow = false; me.receiveShadow = false; scene.add(me); c.mesh = me; c.ready = true; S.built++; markDirty(); }
  function dropCell(c) { if (c.mesh) { scene.remove(c.mesh); c.mesh.geometry.dispose(); } c.mesh = null; c.ready = false; S.dropped++; markDirty(); }
  let acc = 0;
  function tick(dt) { acc += dt; if (acc < 0.35) return; acc = 0; if (!S.on) return;
    const n = window.VILLAGE && VILLAGE.night ? VILLAGE.night() : 0, nl = n > 0.1 ? Math.min(1, (n - 0.1) / 0.3) : 0; if (Math.abs(nl - U.uNightL.value) > 0.01) { U.uNightL.value = nl; markDirty(); }
    const p = cam.position, x = p.x, y = -p.z, top = P.mode === 'top'; let todo = null, best = 1e9;
    const lite = RENDER.tier === 'schnell', R1 = lite ? 45 : S.R1, R2 = lite ? 110 : S.R2;   // V16e1: the lightest tier (software graphics) keeps fewer cells
    for (const c of S.cells.values()) { const d = Math.hypot(c.cx - x, c.cy - y) - S.CS * 0.7;
      if (c.ready && (d > R2 || top)) dropCell(c); else if (!c.ready && d < R1 && !top && d < best) { best = d; todo = c; } }
    if (todo) buildCell(todo); }
  S.dispose = () => { for (const c of S.cells.values()) if (c.ready) dropCell(c); S.cells.clear(); const i = (window.TICKS || []).indexOf(tick); if (i >= 0) TICKS.splice(i, 1); S.on = false; };
  S.state = () => ({ cells: S.cells.size, ready: [...S.cells.values()].filter(c => c.ready).length, built: S.built, dropped: S.dropped });
  whenLoaded(() => { if (!window.VILLAGE || !VILLAGE.ready || !window.VPROPS || !VPROPS.kit) return;
    for (const b of VILLAGE.bld) { if (b.typ === 2) continue; const k = cellOf(b.cx, b.cy); let c = S.cells.get(k); if (!c) S.cells.set(k, c = { bld: [], ready: false, mesh: null, cx: (Math.floor(b.cx / S.CS) + 0.5) * S.CS, cy: (Math.floor(b.cy / S.CS) + 0.5) * S.CS }); c.bld.push(b); }
    (window.TICKS || (window.TICKS = [])).push(tick); S.on = true; });
  return S; })();
window.VNEAR = VNEAR;
