// ===================== V16c the forest at the Klinge: a spruce stand with larch and pine to walk through (FOREST) =====================
// Where: the north-west lobe of the big forest south of the L 1625, between the junction J below the Untere Klinge, the field road
// along the forest edge and the forest track (research/klinge.md: 16.8 ha, ALKIS "Nadelholz", crown heights 10–28 m, median 17;
// the family's own forest "die Klinge" most likely the 2.3 ha tip next to J – CORE, uncertain until the parcel number is known).
// The canopy height model gives ~2300 dominant trees in the lobe; world/ratscher.js hands them over (RATSCHER.forestCHM) instead
// of drawing them as far cards. Between them this module plants the rest of the stand (jittered grid 3.6 m, ~600 stems/ha, heights
// after the measured neighbours, understory, young growth in the gaps), deterministic from a seed.
// Drawing: procedural trees – trunk with bark, branch whorls of needle sprays cut from the Poly Haven fir texture
// (public/tree/fir_twig_color.png), dead branches below the crown – in three levels of detail around the camera: near full
// (~1000 triangles, sun shadows), middle simple (~100), far a cross card from an atlas rendered at load. Neighbouring levels
// dissolve into each other by a screen dither over a few metres; outside its distance band a level collapses its vertices (no
// overdraw). Under the crowns the ground becomes needle litter with moss (world/ratscher.js terrain shader: forestFloor) and the
// light is dimmed beyond the sun's shadow box (canopy map, 2 m). Ferns, stumps and lying deadwood near the camera. Trunks are
// obstacles (world/worldcol.js). Hooks: place names (world/roads.js S.place), wind and birds (audio/audio.js FOREST.amb).
const FOREST = (() => {
  const S = { on: !!(GEO_REAL && window.GEOMAN && GEOMAN.terrain), ready: false, list: [], ms: 0, trunks: null, nNear: 0, nMid: 0 };
  // ---------- the stand: outlines in model metres (x east, y north) ----------
  const LOBE = [[-563, -584], [-458, -504], [-200, -442], [-101, -456], [-90, -504], [-56, -518], [-57, -555], [0, -576], [0, -895], [-144, -878], [-479, -690], [-536, -620]];
  const CORE = [[-563, -584], [-518, -536], [-423, -494], [-380, -560], [-426, -714], [-479, -690], [-536, -620]];
  const bboxOf = P => P.reduce((b, p) => [Math.min(b[0], p[0]), Math.min(b[1], p[1]), Math.max(b[2], p[0]), Math.max(b[3], p[1])], [1e9, 1e9, -1e9, -1e9]);
  const LB = bboxOf(LOBE), CB = bboxOf(CORE);
  function inPoly(P, x, y) { let c = false; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const xi = P[i][0], yi = P[i][1], xj = P[j][0], yj = P[j][1]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; } return c; }
  S.owns = (x, y) => S.on && x >= LB[0] && x <= LB[2] && y >= LB[1] && y <= LB[3] && inPoly(LOBE, x, y);
  S.inCore = (x, y) => S.on && x >= CB[0] && x <= CB[2] && y >= CB[1] && y <= CB[3] && inPoly(CORE, x, y);
  S.LOBE = LOBE; S.CORE = CORE;
  function polyDist(P, x, y) { let d = 1e9; for (let i = 0, j = P.length - 1; i < P.length; j = i++) { const ax = P[j][0], ay = P[j][1], dx = P[i][0] - ax, dy = P[i][1] - ay, L2 = dx * dx + dy * dy || 1, t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / L2)); d = Math.min(d, Math.hypot(x - ax - dx * t, y - ay - dy * t)); } return d; }
  // inside the forest: 1, fading over 15 m outside (sounds)
  S.amb = () => { if (!S.on || P.mode !== 'walk') return 0; const x = P.x, y = P.y; if (x < LB[0] - 20 || x > LB[2] + 20 || y < LB[1] - 20 || y > LB[3] + 20) return 0; return inPoly(LOBE, x, y) ? 1 : Math.max(0, 1 - polyDist(LOBE, x, y) / 15); };
  S.place = (x, y) => S.inCore(x, y) ? 'Die Klinge – Familienwald' : S.owns(x, y) ? 'Wald an der Klinge' : null;
  if (!S.on) return S;
  const mulberry = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  // ---------- species and their tree models ----------
  // H model height (m), rb trunk radius at the foot, cb crown base (share of the height), cr crown radius (share of the height) at the crown
  // base, whorl spacing, branches per whorl, droop/up: branch elevation at the crown base/top (rad), cards per branch, card size, needle
  // tint, dead branches below the crown (share kept), bark texture and bark tint at the top (pine: orange mirror bark)
  const SPEC = {
    spruce: { H: 24, rb: 0.21, cb: 0.48, cr: 0.13, whorl: 0.46, nB: 6, droop: -0.5, up: 0.4, cards: 4, cs: 0.8, tint: [0.56, 0.68, 0.5], dead: 0.95, bark: 'sprucebark', bt: [0.74, 0.7, 0.66], top: [1, 1, 1], hang: 0.6 },
    larch: { H: 26, rb: 0.22, cb: 0.55, cr: 0.115, whorl: 0.62, nB: 5, droop: -0.15, up: 0.6, cards: 3, cs: 0.8, tint: [0.66, 0.82, 0.44], dead: 0.4, bark: 'pinebark', bt: [0.8, 0.68, 0.6], top: [1, 0.95, 0.9], sparse: 0.72 },
    pine: { H: 24, rb: 0.22, cb: 0.66, cr: 0.16, whorl: 0.8, nB: 5, droop: -0.08, up: 0.3, cards: 3, cs: 0.9, tint: [0.52, 0.64, 0.56], dead: 0.3, bark: 'pinebark', bt: [0.72, 0.7, 0.68], top: [1.6, 0.9, 0.6] } };
  const VARIANTS = [['spruce', 'stand'], ['spruce', 'edge'], ['spruce', 'young'], ['larch', 'stand'], ['larch', 'edge'], ['larch', 'young'], ['pine', 'stand'], ['pine', 'edge']];
  const VI = {}; VARIANTS.forEach((v, i) => { VI[v[0] + ':' + v[1]] = i; });
  // needle sprays in the twig atlas (px of 1024, origin top left; stem at the bottom) and the bare dead branch (base on the left)
  const SPRAY = [[662, 35, 304, 349], [188, 42, 257, 283], [307, 403, 359, 397], [644, 457, 342, 399], [499, 260, 153, 155]], SMALL = [[546, 95, 63, 145], [390, 290, 86, 108]], DEAD = [319, 723, 705, 301];
  const rect = r => [r[0] / 1024, 1 - (r[1] + r[3]) / 1024, (r[0] + r[2]) / 1024, 1 - r[1] / 1024, r[2] / r[3]];   // u0, v0 (bottom), u1, v1 (top), aspect w/h
  // ---------- geometry builder ----------
  function GB() { return { p: [], n: [], uv: [], c: [], h: [], i: [] }; }
  function finish(G) { const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(G.p, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(G.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(G.uv, 2)); g.setAttribute('color', new THREE.Float32BufferAttribute(G.c, 3)); g.setAttribute('aH', new THREE.Float32BufferAttribute(G.h, 1)); g.setIndex(G.i); g.computeBoundingSphere(); return g; }
  // a card: from base along V (length len), across U (width wid); uv rect; dead: the image's long axis runs along V
  function card(G, b, V, U, len, wid, R, col, hRel, nrm, dead) { const k = G.p.length / 3, hw = wid / 2;
    const P4 = [[b[0] - U[0] * hw, b[1] - U[1] * hw, b[2] - U[2] * hw], [b[0] + U[0] * hw, b[1] + U[1] * hw, b[2] + U[2] * hw]];
    P4.push([P4[1][0] + V[0] * len, P4[1][1] + V[1] * len, P4[1][2] + V[2] * len], [P4[0][0] + V[0] * len, P4[0][1] + V[1] * len, P4[0][2] + V[2] * len]);
    const uv = dead ? [[R[0], R[1]], [R[0], R[3]], [R[2], R[3]], [R[2], R[1]]] : [[R[0], R[1]], [R[2], R[1]], [R[2], R[3]], [R[0], R[3]]];
    for (let q = 0; q < 4; q++) { G.p.push(...P4[q]); G.n.push(...nrm); G.uv.push(...uv[q]); G.c.push(...col); G.h.push(hRel + (q > 1 ? V[1] * len / 30 : 0)); }
    G.i.push(k, k + 1, k + 2, k, k + 2, k + 3); }
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const rotAround = (v, ax, a) => { const c = Math.cos(a), s = Math.sin(a), d = v[0] * ax[0] + v[1] * ax[1] + v[2] * ax[2], cr = cross(ax, v); return [v[0] * c + cr[0] * s + ax[0] * d * (1 - c), v[1] * c + cr[1] * s + ax[1] * d * (1 - c), v[2] * c + cr[2] * s + ax[2] * d * (1 - c)]; };
  // one tree model: lod 0 (near), 1 (middle); returns { bark, cards, H, W (crown radius at the base) }
  function buildModel(spName, variant, lod) {
    const sp = SPEC[spName], rnd = mulberry(VI[spName + ':' + variant] * 977 + lod * 13 + 5);
    const rr = (a, b) => a + (b - a) * rnd();
    const young = variant === 'young', edge = variant === 'edge';
    const H = young ? 4.5 : sp.H, cb = young ? 0.06 : edge ? sp.cb * 0.42 : sp.cb, cbY = H * cb, Rc = H * (young ? 0.28 : sp.cr * (edge ? 1.3 : 1)), rb = young ? 0.06 : sp.rb;
    const axis = y => { const f = y / H; return [0.05 * Math.sin(y * 0.35 + 1.3) * f * (young ? 0.3 : 1), 0.05 * Math.cos(y * 0.29 + 0.4) * f * (young ? 0.3 : 1)]; };
    const rAt = y => rb * Math.pow(Math.max(0.02, 1 - y / H * 0.985), 0.78) * (1 + 0.55 * Math.exp(-y / 0.38));
    // trunk
    const Bk = GB(), segR = lod ? 5 : 9, segH = lod ? 4 : 14, tile = 0.9, circ = 2 * Math.PI * rb;
    for (let i = 0; i <= segH; i++) { const t = i / segH, y = H * (t * t * 0.35 + t * 0.65), r = rAt(y), ax = axis(y), top = THREE.MathUtils.smoothstep(y, cbY * 0.6, H);
      const bt = sp.bt || [1, 1, 1], col = [bt[0] * (1 + (sp.top[0] - 1) * top), bt[1] * (1 + (sp.top[1] - 1) * top), bt[2] * (1 + (sp.top[2] - 1) * top)];
      for (let j = 0; j <= segR; j++) { const a = j / segR * Math.PI * 2, cx = Math.cos(a), cz = Math.sin(a);
        Bk.p.push(ax[0] + cx * r, y, ax[1] + cz * r); Bk.n.push(cx, 0.12, cz); Bk.uv.push(j / segR * circ / tile, y / tile); Bk.c.push(...col); Bk.h.push(y / H); } }
    for (let i = 0; i < segH; i++) for (let j = 0; j < segR; j++) { const a = i * (segR + 1) + j, b = a + segR + 1; Bk.i.push(a, b, a + 1, a + 1, b, b + 1); }
    // crown: whorls of branches, each carrying needle sprays (two crossed cards near, one large far)
    const Cd = GB(), tint = sp.tint, step = sp.whorl * (young ? 0.55 : 1) * (lod ? 1.6 : 1), sprays = lod ? [SPRAY[2], SPRAY[3], SPRAY[0]] : SPRAY;
    let rot0 = rr(0, 6.28);
    for (let y = cbY; y < H - 0.35; y += step * rr(0.85, 1.15)) { const rel = (y - cbY) / Math.max(0.5, H - cbY), ax = axis(y);
      let L = Rc * Math.pow(1 - rel, spName === 'pine' ? 0.55 : 0.85) * rr(0.82, 1.15) + 0.25; if (spName === 'pine') L *= 0.75 + 0.5 * Math.sin(Math.PI * Math.min(1, rel * 1.15));
      const n = Math.max(2, (lod ? 4 : sp.nB) + (rnd() < 0.5 ? 1 : 0) - (rel > 0.85 ? 1 : 0)); rot0 += 0.9;
      for (let k = 0; k < n; k++) { if (sp.sparse && rnd() > sp.sparse + 0.3 * rel) continue;
        const az = rot0 + k * 6.283 / n + rr(-0.3, 0.3), el = sp.droop + (sp.up - sp.droop) * rel + rr(-0.12, 0.12);
        const dir = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)], U0 = norm(cross(dir, [0, 1, 0])), out = norm([dir[0], 0.55, dir[2]]);
        const m = lod ? 1 : Math.max(1, Math.min(sp.cards, Math.round(L / sp.cs)));
        for (let c = 0; c < m; c++) { const R = rect(sprays[Math.floor(rnd() * sprays.length)]);
          const len = lod ? L * rr(1.0, 1.15) : Math.min(L, sp.cs * rr(0.85, 1.25) * Math.min(1.25, 0.55 + L * 0.3)), wid = len * R[4] * (lod ? 1.35 : 1.15);
          const along = lod ? 0 : (L - len) * (m > 1 ? c / (m - 1) : 0.5), r0 = rAt(y) * 0.8;
          const V = norm([dir[0], dir[1] - 0.12 * (c + 1) / m, dir[2]]), b = [ax[0] + dir[0] * (r0 + along), y + dir[1] * (r0 + along), ax[1] + dir[2] * (r0 + along)];
          const g = rr(0.84, 1.12), col = [tint[0] * g, tint[1] * g, tint[2] * g];
          const roll = rr(-0.45, 0.45); card(Cd, b, V, rotAround(U0, V, roll), len, wid, R, col, y / H, out, false);
          if (!lod) card(Cd, b, V, rotAround(U0, V, roll + 1.25 * (rnd() < 0.5 ? 1 : -1)), len * 0.92, wid * 0.9, R, col.map(v => v * 0.92), y / H, out, false);
          // Norway spruce: the twigs hang from the branches like a curtain
          if (!lod && sp.hang && rnd() < sp.hang) { const Rh = rect(sprays[Math.floor(rnd() * sprays.length)]), hl = len * rr(0.45, 0.7), hb = [b[0] + V[0] * len * 0.45, b[1] + V[1] * len * 0.45, b[2] + V[2] * len * 0.45];
            card(Cd, hb, norm([dir[0] * 0.3, -1, dir[2] * 0.3]), rotAround(U0, [0, 1, 0], rr(-0.4, 0.4)), hl, hl * Rh[4] * 1.1, Rh, col.map(v => v * 0.85), y / H, out, false); } } } }
    // the leader: a small upright spray at the top
    { const R = rect(lod ? SPRAY[2] : SMALL[0]), y = H - (lod ? 1.4 : 0.9), ax = axis(y), g = [tint[0], tint[1], tint[2]];
      for (const a of [0, 1.57]) card(Cd, [ax[0], y, ax[1]], [0, 1, 0], [Math.cos(a), 0, Math.sin(a)], lod ? 1.6 : 1.05, (lod ? 1.6 : 1.05) * R[4], R, g, 0.97, [0, 1, 0], false); }
    // dead branches below the crown (spruce keeps many, larch and pine few)
    if (!young) { const dStep = lod ? 0.9 : 0.27, R = rect(DEAD);
      for (let y = 1.0; y < cbY - 0.2; y += dStep * rr(0.8, 1.2)) { const f = y / cbY, n = lod ? 2 : 4 + Math.floor(rnd() * 2), ax = axis(y);
        for (let k = 0; k < n; k++) { if (rnd() > sp.dead * (0.45 + 0.55 * f)) continue;
          const az = rr(0, 6.283), el = rr(-0.55, -0.05), dir = [Math.cos(el) * Math.cos(az), Math.sin(el), Math.cos(el) * Math.sin(az)], L = (0.45 + 1.25 * f) * rr(0.6, 1.1) * (lod ? 1.3 : 1);
          const U = rotAround(norm(cross(dir, [0, 1, 0])), dir, rr(-0.8, 0.8)), r0 = rAt(y) * 0.85, g = rr(0.75, 1.05);
          card(Cd, [ax[0] + dir[0] * r0, y + dir[1] * r0, ax[1] + dir[2] * r0], dir, U, L, L / R[4] * 1.6, R, [0.62 * g, 0.57 * g, 0.5 * g], y / H, norm([dir[0], 0.8, dir[2]]), true); } } }
    return { bark: finish(Bk), cards: finish(Cd), H, W: Rc, rAt };
  }
  // ---------- materials: needle cards and bark with distance bands (dither), canopy shade for the far side of the shadow box ----------
  const CU = { tCan: { value: null }, bCan: { value: new THREE.Vector4(0, 0, 1, 1) }, uSunBox: { value: new THREE.Vector4(0, 0, 16, 0.8) } };   // w: share of the canopy shade kept inside the box
  const VSH = `attribute float aH; uniform vec4 uLod; uniform sampler2D tCan; uniform vec4 bCan, uSunBox; varying float vFade, vShade;`;
  const FSH = `varying float vFade, vShade; float fdHash( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }`;
  function patch(m, key, lodU, cardsMat, solo) {
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, CU); sh.uniforms.uLod = { value: lodU }; if (solo) Object.assign(sh.uniforms, solo);
      sh.vertexShader = VSH + (solo ? '\nuniform float uCut, uDelimb; varying float vY;' : '') + '\n' + sh.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>
        { ${solo ? `vec4 ipw = modelMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ); vFade = 1.0; vY = position.y; if ( aH < uDelimb ) gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 );` : `vec4 ipw = modelMatrix * instanceMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ); float dI = length( ipw.xz - cameraPosition.xz );
          vFade = smoothstep( uLod.x, uLod.y, dI ) * ( 1.0 - smoothstep( uLod.z, uLod.w, dI ) );
          if ( vFade < 0.002 ) gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 );   // outside its band: clipped, no fragments`}
          vec2 gp = vec2( ipw.x, -ipw.z ), cu = ( gp - bCan.xy ) * bCan.zw; float can = texture( tCan, cu ).r;
          float ob = max( smoothstep( uSunBox.z - 3.0, uSunBox.z, max( abs( gp.x - uSunBox.x ), abs( gp.y - uSunBox.y ) ) ), uSunBox.w );
          vShade = 1.0 - 0.82 * can * ob * ( 1.0 - smoothstep( 0.5, 1.0, aH ) ); }`);
      sh.fragmentShader = FSH + (solo ? '\nuniform float uCut; varying float vY;' : '') + '\n' + sh.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
          ${solo ? 'if ( vY < uCut ) discard;' : 'if ( vFade < 0.998 && vFade < fdHash( gl_FragCoord.xy ) ) discard;'}`)
        .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
          reflectedLight.directDiffuse *= vShade; reflectedLight.directSpecular *= vShade * vShade; reflectedLight.indirectDiffuse *= mix( vec3( 0.42, 0.47, 0.34 ), vec3( 1.0 ), vShade );`);
      if (cardsMat === true) sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
          diffuseColor.rgb *= mix( 0.5, 1.0, smoothstep( -0.35, 0.35, ( normal * mat3( viewMatrix ) ).y ) );`);
      if (cardsMat) sh.fragmentShader = sh.fragmentShader.replace('#include <alphatest_fragment>', `
          { vec2 tsz = vec2( textureSize( map, 0 ) ); float mip = max( 0.0, 0.5 * log2( max( dot( dFdx( vMapUv * tsz ), dFdx( vMapUv * tsz ) ), dot( dFdy( vMapUv * tsz ), dFdy( vMapUv * tsz ) ) ) ) );
            diffuseColor.a *= 1.0 + mip * 0.28; }   // minified alpha fades out: keep the sprays' coverage at a distance
          #include <alphatest_fragment>`); };
    m.customProgramCacheKey = () => 'forest_' + key + (solo ? '_solo' : ''); return m; }
  // ---------- the larch's year (European larch, Thuringia ~400 m): fresh green from mid April, gold from mid October, ----------
  // needles fall in November, bare twigs in winter. uSeas: x gold, y bare (colour and the share of needles gone), z fresh green
  const SEAS_U = { value: new THREE.Vector4(0, 0, 0, 0) };
  const SEAS_GLSL = `{ float lu = dot( diffuseColor.rgb, vec3( 0.3, 0.59, 0.11 ) );
      vec3 c = mix( diffuseColor.rgb, diffuseColor.rgb * vec3( 1.15, 1.2, 0.85 ), uSeas.z );
      c = mix( c, lu * vec3( 2.1, 1.42, 0.38 ), uSeas.x ); diffuseColor.rgb = mix( c, lu * vec3( 1.05, 0.86, 0.68 ), uSeas.y );
      if ( uSeas.y > 0.01 && fdHash( floor( vMapUv * 320.0 ) ) < uSeas.y * 0.9 ) discard; }`;
  function seasonal(m, hash) { const ob = m.onBeforeCompile, ck = m.customProgramCacheKey;
    m.onBeforeCompile = sh => { if (ob) ob.call(m, sh); sh.uniforms.uSeas = SEAS_U;
      sh.fragmentShader = 'uniform vec4 uSeas;\n' + (hash ? 'float fdHash( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }\n' : '') + sh.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n' + SEAS_GLSL); };
    m.customProgramCacheKey = () => (ck ? ck.call(m) : '') + '_seas'; return m; }
  const doyNow = () => { if (!window.DN || !window.CLOCK) return 180; const d = new Date((DN.jdOf(CLOCK.t) - 2440587.5) * 864e5); return (d - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5; };
  function seasonOf(doy) { const ss = (a, b, x) => THREE.MathUtils.smoothstep(x, a, b);
    const bare = Math.max(1 - ss(100, 120, doy), ss(306, 330, doy)), gold = ss(279, 301, doy), fresh = ss(100, 112, doy) * (1 - ss(128, 165, doy));
    return [gold, bare, fresh]; }
  S.season = () => { const q = SEAS_U.value; return { doy: Math.round(doyNow()), gold: +q.x.toFixed(2), bare: +q.y.toFixed(2), fresh: +q.z.toFixed(2) }; };
  // ---------- planting ----------
  const CELL = 8, GRID = new Map(); const gk = (i, j) => (i + 4096) * 8192 + (j + 4096);
  function gridAdd(t) { const k = gk(Math.floor(t.x / CELL), Math.floor(t.y / CELL)); let a = GRID.get(k); if (!a) GRID.set(k, a = []); a.push(t); }
  function nearAny(x, y, r) { const i0 = Math.floor((x - r) / CELL), i1 = Math.floor((x + r) / CELL), j0 = Math.floor((y - r) / CELL), j1 = Math.floor((y + r) / CELL);
    for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = GRID.get(gk(i, j)); if (a) for (const t of a) if ((t.x - x) ** 2 + (t.y - y) ** 2 < r * r) return true; } return false; }
  // canopy rasters (2 m): mask of the measured crowns (where the stand is closed) and the cover of all planted crowns (ground, light)
  const MR = 2, MX0 = LB[0] - 12, MY0 = LB[1] - 12, MW = Math.ceil((LB[2] - LB[0] + 24) / MR), MH = Math.ceil((LB[3] - LB[1] + 24) / MR);
  function splat(A, x, y, r, v, soft, raw) { const i0 = Math.max(0, Math.floor((x - r - MX0) / MR)), i1 = Math.min(MW - 1, Math.ceil((x + r - MX0) / MR)), j0 = Math.max(0, Math.floor((y - r - MY0) / MR)), j1 = Math.min(MH - 1, Math.ceil((y + r - MY0) / MR));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) { const d = Math.hypot(MX0 + (i + 0.5) * MR - x, MY0 + (j + 0.5) * MR - y); if (d > r) continue; const k = j * MW + i, w = soft ? v * Math.min(1, (r - d) / (r * 0.35)) : v; A[k] = raw ? A[k] + w : Math.min(1, A[k] + w); } }
  const at = (A, x, y) => { const i = Math.floor((x - MX0) / MR), j = Math.floor((y - MY0) / MR); return i < 0 || j < 0 || i >= MW || j >= MH ? 0 : A[j * MW + i]; };
  function plant() { const chm = (window.RATSCHER && RATSCHER.forestCHM) || [], rnd = mulberry(1609), rr = (a, b) => a + (b - a) * rnd(), T = [];
    const ground = (x, y) => window.ROADS ? ROADS.groundAt(x, y) : RATSCHER.hMesh(x, y), onRoad = (x, y, m) => window.ROADS && ROADS.edge(x, y) > -m;
    const mask = new Float32Array(MW * MH); for (const c of chm) splat(mask, c[0], c[1], c[3] * 1.25 + 1.6, 1, false);
    const CG = new Map(); for (const c of chm) { const k = gk(Math.floor(c[0] / 16), Math.floor(c[1] / 16)); let a = CG.get(k); if (!a) CG.set(k, a = []); a.push(c); }
    const chmNear = (x, y, f) => { const i0 = Math.floor(x / 16), j0 = Math.floor(y / 16); for (let i = i0 - 1; i <= i0 + 1; i++) for (let j = j0 - 1; j <= j0 + 1; j++) { const a = CG.get(gk(i, j)); if (a) for (const c of a) f(c, (c[0] - x) ** 2 + (c[1] - y) ** 2); } };
    const nearH = (x, y) => { let s = 0, w = 0; chmNear(x, y, (c, d2) => { if (d2 > 225) return; const k = 1 / (d2 + 4); s += c[2] * k; w += k; }); return w ? s / w : 17; };
    const nearSp = (x, y) => { let b = null, bd = 400; chmNear(x, y, (c, d2) => { if (d2 < bd) { bd = d2; b = c; } }); return b; };
    const pickSp = (con, r) => con ? (r < 0.78 ? 'spruce' : 'pine') : (r < 0.85 ? 'larch' : 'spruce');
    const isEdge = (x, y) => onRoad(x, y, 7) || [[7, 0], [-7, 0], [0, 7], [0, -7]].some(([a, b]) => at(mask, x + a, y + b) < 0.5) || polyDist(LOBE, x, y) < 5;
    const add = (x, y, h, sp, dom) => { const young = h < 6.5, v = young ? (sp === 'pine' ? 'spruce:young' : sp + ':young') : sp + ':' + (isEdge(x, y) ? 'edge' : 'stand');
      const k = { spruce: 0.0125, larch: 0.013, pine: 0.0135 }[sp] * (dom ? 1.12 : 1), t = { x, y, z: ground(x, y), h, sp, m: VI[v], w: rr(0.86, 1.14) * (v.endsWith('edge') ? 1.1 : 1), rot: rr(0, 6.283), dbh: Math.max(0.03, h * k * rr(0.85, 1.15)), core: S.inCore(x, y), id: T.length };
      T.push(t); gridAdd(t); return t; };
    for (const c of chm) { if (onRoad(c[0], c[1], 1.4) || nearAny(c[0], c[1], 1.6)) continue; add(c[0], c[1], Math.max(8, c[2]), pickSp(c[4], rnd()), true); }
    const G = 3.6;
    for (let gy = Math.floor(LB[1] / G); gy * G < LB[3]; gy++) for (let gx = Math.floor(LB[0] / G); gx * G < LB[2]; gx++) {
      const x = (gx + 0.5 + (rnd() - 0.5) * 0.85) * G, y = (gy + 0.5 + (rnd() - 0.5) * 0.85) * G, r = rnd(); if (!inPoly(LOBE, x, y) || onRoad(x, y, 1.3)) continue;
      if (at(mask, x, y) > 0.5) { if (r < 0.1 || nearAny(x, y, 2.3)) continue;
        const hn = nearH(x, y), c = nearSp(x, y), sp = c && rnd() < 0.7 ? pickSp(c[4], rnd()) : (rnd() < 0.62 ? 'spruce' : rnd() < 0.7 ? 'larch' : 'pine'), q = rnd();
        add(x, y, q < 0.62 ? hn * rr(0.78, 1.0) : q < 0.86 ? hn * rr(0.5, 0.78) : rr(2.5, 7.5), q < 0.86 ? sp : (rnd() < 0.85 ? 'spruce' : 'larch'), false); }
      else { if (r < 0.5 || nearAny(x, y, 1.9)) continue; add(x, y, rr(0.9, 4.8), rnd() < 0.85 ? 'spruce' : 'larch', false); } }
    // cover of the crowns as they stand now (light and ground)
    const cov = new Float32Array(MW * MH); for (const t of T) splat(cov, t.x, t.y, t.h * 0.16 * t.w + 1.2, t.h < 6.5 ? 0.25 : 0.7, true, true);   // raw sums (felling subtracts a crown)
    return { T, mask, cov }; }
  // ---------- the far atlas: every model drawn once from the side ----------
  function atlas(models, mats, rt0) { const C = 256, n = models.length, rt = rt0 || new THREE.WebGLRenderTarget(C * n, C * 3, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
    const pt = R.getRenderTarget(), pc = R.getClearColor(new THREE.Color()), pa = R.getClearAlpha(), sv = SV.on.value, gi = GI.on.value; SV.on.value = 0; GI.on.value = 0;
    R.setRenderTarget(rt); R.setClearColor(0x2c3626, 0); R.clear(); const info = [];
    models.forEach((Md, i) => { const sc = new THREE.Scene(); sc.add(new THREE.AmbientLight(0xffffff, Math.PI)); sc.add(new THREE.Mesh(Md.bark, mats[i].bark), new THREE.Mesh(Md.cards, mats[i].cards));
      const H = Md.H * 1.03, W = H / 2, side = new THREE.OrthographicCamera(-W / 2, W / 2, H, 0, 0.1, 400); side.position.set(0, 0, 150); side.lookAt(0, 0, 0);
      const top = new THREE.OrthographicCamera(-W / 2, W / 2, W / 2, -W / 2, 0.1, 400); top.position.set(0, H + 100, 0); top.up.set(0, 0, -1); top.lookAt(0, 0, 0);   // seen from above: u east, v north
      rt.scissorTest = true;
      rt.viewport.set(i * C, 0, C, C * 2); rt.scissor.set(i * C, 0, C, C * 2); R.setRenderTarget(rt); R.render(sc, side);
      rt.viewport.set(i * C, C * 2, C, C); rt.scissor.set(i * C, C * 2, C, C); R.setRenderTarget(rt); R.render(sc, top); info.push({ W, H }); });
    rt.scissorTest = false; rt.viewport.set(0, 0, C * n, C * 3); R.setRenderTarget(pt); R.setClearColor(pc, pa); SV.on.value = sv; GI.on.value = gi;
    return { tex: rt.texture, rt, info, n, models, mats, seas: SEAS_U.value.clone() }; }
  // ---------- building it all ----------
  const LODS = { hoch: [44, 175, 34], mittel: [34, 140, 26], schnell: [22, 95, 16] };   // near radius, middle radius, ground cover radius
  const lodR = () => LODS[RENDER.tier] || LODS.mittel;
  const MAX0 = 700, MAX1 = 6000, MAXC = 500;
  let MODELS0 = [], MODELS1 = [], IM0 = [], IM1 = [], U0 = [], U1 = [], U2 = null, COVER = [], CIM = [], A2 = null;
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), sv3 = new THREE.Vector3(), up3 = new THREE.Vector3(0, 1, 0), colT = new THREE.Color();
  function matrixOf(t, Md, out) { const s = t.h / Md.H; q4.setFromAxisAngle(up3, t.rot); out.compose(V(t.x, t.y, t.z - 0.05), q4, sv3.set(s * t.w, s, s * t.w)); return out; }
  function build() { const t0 = performance.now(); const P0 = plant(); S.list = P0.T;
    // canopy texture for ground and light
    const tex = new THREE.DataTexture(new Uint8Array(P0.cov.map(v => Math.round(Math.min(1, v) * 255))), MW, MH, THREE.RedFormat); tex.magFilter = THREE.LinearFilter; tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
    CU.tCan.value = tex; CU.bCan.value.set(MX0, MY0, 1 / (MW * MR), 1 / (MH * MR));
    // models and materials
    const twig = TXL.load(BASE + 'tree/fir_twig_color.png', () => markDirty(true)); twig.colorSpace = THREE.SRGBColorSpace; twig.anisotropy = ANISO;
    const barkTex = {}; for (const k of ['sprucebark', 'pinebark']) barkTex[k] = TEXMAN[k] ? { map: texUse(texFileOf(k, 'col'), true, [1, 1]).t, nrm: texUse(texFileOf(k, 'nrm'), false, [1, 1]).t, orm: texUse(texFileOf(k, 'orm'), false, [1, 1]).t } : null;
    const lodU = [new THREE.Vector4(-2, -1, 1e5, 1e5 + 1), new THREE.Vector4(1, 2, 1e5, 1e5 + 1), new THREE.Vector4(1, 2, 1e5, 1e5 + 1)]; U0 = lodU[0]; U1 = lodU[1]; U2 = lodU[2];
    const mk = (sp, lod) => { const B = barkTex[SPEC[sp].bark], key = sp + lod;
      const bark = patch(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, map: B && B.map, normalMap: lod ? null : B && B.nrm, roughnessMap: B && B.orm, aoMap: null, roughness: 1, envMapIntensity: 0.55 }), 'b' + key, lodU[lod], false);
      const cards = patch(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, map: twig, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.82, envMapIntensity: 0.5 }), 'c' + key, lodU[lod], true);
      if (sp === 'larch') seasonal(cards, false);
      return { bark, cards }; };
    const MATS = [{}, {}]; for (const sp of Object.keys(SPEC)) for (const l of [0, 1]) MATS[l][sp] = mk(sp, l);
    S._mk = { twig, barkTex, lodU, depth: null };
    MODELS0 = VARIANTS.map(([sp, v]) => buildModel(sp, v, 0)); MODELS1 = VARIANTS.map(([sp, v]) => buildModel(sp, v, 1));
    const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: twig, alphaTest: 0.42 }); S._mk.depth = depth;
    const inst = (geo, mat, max, shadow) => { const im = new THREE.InstancedMesh(geo, mat, max); im.count = 0; im.frustumCulled = false; im.castShadow = shadow; im.receiveShadow = true; im.userData.noMerge = true;
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); im.setColorAt(0, colT.setRGB(1, 1, 1)); im.instanceColor.setUsage(THREE.DynamicDrawUsage); scene.add(im); return im; };
    IM0 = MODELS0.map((Md, i) => { const sp = VARIANTS[i][0], b = inst(Md.bark, MATS[0][sp].bark, MAX0, true), c = inst(Md.cards, MATS[0][sp].cards, MAX0, true); c.customDepthMaterial = depth; return { b, c, Md }; });
    IM1 = MODELS1.map((Md, i) => { const sp = VARIANTS[i][0]; return { b: inst(Md.bark, MATS[1][sp].bark, MAX1, false), c: inst(Md.cards, MATS[1][sp].cards, MAX1, false), Md }; });
    // far: cross cards from the atlas, all trees, static (one instanced mesh per 160 m cell)
    { const q = seasonOf(doyNow()); SEAS_U.value.set(q[0], q[1], q[2], 0); }
    A2 = atlas(MODELS0, VARIANTS.map(([sp]) => { const cm = new THREE.MeshBasicMaterial({ map: twig, vertexColors: true, alphaTest: 0.42, side: THREE.DoubleSide }); if (sp === 'larch') seasonal(cm, true);
      return { bark: new THREE.MeshBasicMaterial({ map: barkTex[SPEC[sp].bark] && barkTex[SPEC[sp].bark].map, vertexColors: true }), cards: cm }; }));
    const fm = patch(new THREE.MeshStandardMaterial({ map: A2.tex, alphaTest: 0.32, side: THREE.DoubleSide, roughness: 1, envMapIntensity: 0.5 }), 'far', lodU[2], 'far');   // 'far': keeps the alpha coverage, no underside (its normals all point up)
    const fmc = fm.onBeforeCompile; fm.onBeforeCompile = sh => { fmc(sh); sh.vertexShader = 'attribute float aKind;\n' + sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>\n vMapUv.x = ( aKind + vMapUv.x ) / ${A2.n.toFixed(1)};`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize( vNormal ); nonPerturbedNormal = normal;'); };
    // two upright planes (side view, lower two thirds of the atlas) and one level plane in the crown (top view, upper third: from above the stand closes)
    const crossG = (() => { const a = new THREE.PlaneGeometry(1, 1), b = new THREE.PlaneGeometry(1, 1), c = new THREE.PlaneGeometry(1, 1); b.rotateY(Math.PI / 2); a.translate(0, 0.5, 0); b.translate(0, 0.5, 0);
      for (const g of [a, b]) { const u = g.attributes.uv; for (let i = 0; i < u.count; i++) u.setY(i, u.getY(i) * 2 / 3); }
      c.rotateX(-Math.PI / 2); c.translate(0, 0.66, 0); { const u = c.attributes.uv; for (let i = 0; i < u.count; i++) u.setY(i, 2 / 3 + u.getY(i) / 3); }
      const g = BufferGeometryUtils.mergeGeometries([a, b, c]);
      const nn = g.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0); const h = new Float32Array(nn.count); const pp = g.attributes.position; for (let i = 0; i < pp.count; i++) h[i] = i >= 8 ? 1 : pp.getY(i); g.setAttribute('aH', new THREE.BufferAttribute(h, 1)); return g; })();   // aH: height share; vertices 8–11 are the level plane (crown top, fully lit)
    for (const grp of cellsOf(S.list, 160)) { const g = crossG.clone(), kk = new Float32Array(grp.length); g.setAttribute('aKind', new THREE.InstancedBufferAttribute(kk, 1)); const im = new THREE.InstancedMesh(g, fm, grp.length);
      grp.forEach((t, i) => { const I = A2.info[t.m], s = t.h / MODELS0[t.m].H; q4.setFromAxisAngle(up3, t.rot); m4.compose(V(t.x, t.y, t.z - 0.1), q4, sv3.set(I.W * s * t.w, I.H * s, I.W * s * t.w)); im.setMatrixAt(i, m4); kk[i] = t.m; t.fi = [im, i];
        im.setColorAt(i, colT.setRGB(1, 1, 1).multiplyScalar(0.88 + (t.id % 7) * 0.035)); });
      im.castShadow = false; im.receiveShadow = false; im.userData.noMerge = true; im.computeBoundingSphere(); scene.add(im); S.far = (S.far || []).concat(im); }
    // ground cover near the camera: ferns, stumps, lying deadwood
    cover(P0); S.mask = P0.mask; S.cov = P0.cov;
    // trunks for collisions (world/worldcol.js): x, y, radius
    const tr = []; for (const t of S.list) if (t.h > 2.5) tr.push(t.x, t.y, t.dbh / 2 + 0.05); S.trunks = new Float32Array(tr);
    S.ready = true; S.buildMs = Math.round(performance.now() - t0); relod(true); }
  // ---------- ground cover ----------
  function cover(P0) { const rnd = mulberry(77), items = { fern: [], stump: [], stump2: [], deadlog: [] }, ground = (x, y) => window.ROADS ? ROADS.groundAt(x, y) : RATSCHER.hMesh(x, y);
    for (let y = LB[1]; y < LB[3]; y += 2) for (let x = LB[0]; x < LB[2]; x += 2) { const px = x + rnd() * 2, py = y + rnd() * 2; if (!inPoly(LOBE, px, py) || (window.ROADS && ROADS.edge(px, py) > -0.8)) { rnd(); rnd(); continue; }
      const k = at(P0.cov, px, py), r = rnd(), f = k > 0.25 && k < 0.85 ? 0.16 : k >= 0.85 ? 0.05 : 0.08;
      if (r < f) { if (!nearAny(px, py, 0.5)) items.fern.push({ x: px, y: py, s: 0.9 + rnd() * 0.8, v: Math.floor(rnd() * 4) }); }
      else if (r < f + 0.012) { if (!nearAny(px, py, 0.9)) items[rnd() < 0.7 ? 'stump' : 'stump2'].push({ x: px, y: py, s: 0.45 + rnd() * 0.45 }); }
      else if (r < f + 0.017) { if (!nearAny(px, py, 1.6)) items.deadlog.push({ x: px, y: py, s: 0.8 + rnd() * 0.6 }); } }
    for (const [id, list] of Object.entries(items)) { for (const it of list) { it.z = ground(it.x, it.y); it.rot = rnd() * 6.283; }
      loadGLBRaw(id, g => { if (!g) return; const vars = variantParts(g, MODELS[id]); if (!vars.length) return;
        const by = vars.map(() => []); list.forEach(it => by[(it.v ?? 0) % vars.length].push(it));
        vars.forEach((vr, vi) => { if (!by[vi].length) return; for (const part of vr.parts) { const mats = Array.isArray(part.mat) ? part.mat : [part.mat];
          mats.forEach(mt => { if (mt.isMeshStandardMaterial && (mt.alphaTest > 0 || mt.transparent)) { mt.side = THREE.DoubleSide; mt.transparent = false; mt.alphaTest = Math.max(mt.alphaTest, 0.45); } if (id === 'fern') mt.color && mt.color.multiplyScalar(0.8); });
          const im = new THREE.InstancedMesh(part.geo, part.mat, MAXC); im.count = 0; im.frustumCulled = false; im.castShadow = RENDER.tier !== 'schnell'; im.receiveShadow = true; im.userData.noMerge = true; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(im);
          CIM.push({ im, list: by[vi], local: part.local }); } }); relod(true); }); } }
  // ---------- choosing what is drawn near and in the middle (when the camera moved a few metres) ----------
  const last = { x: 1e9, y: 1e9, tier: '' }, sel0 = VARIANTS.map(() => []), sel1 = VARIANTS.map(() => []);
  function relod(force) { if (!S.ready) return; const cx = cam.position.x, cy = -cam.position.z, [R0, R1, Rc] = lodR();
    if (!force && Math.hypot(cx - last.x, cy - last.y) < 3 && last.tier === RENDER.tier) return; last.x = cx; last.y = cy; last.tier = RENDER.tier; const t0 = performance.now();
    U0.set(-2, -1, R0 - 6, R0); U1.set(R0 - 6, R0, R1 - 14, R1); U2.set(R1 - 14, R1, 1e5, 1e5 + 1);
    const far = cx < LB[0] - R1 || cx > LB[2] + R1 || cy < LB[1] - R1 || cy > LB[3] + R1;
    for (const a of sel0) a.length = 0; for (const a of sel1) a.length = 0;
    if (!far) { const i0 = Math.floor((cx - R1 - 2) / CELL), i1 = Math.floor((cx + R1 + 2) / CELL), j0 = Math.floor((cy - R1 - 2) / CELL), j1 = Math.floor((cy + R1 + 2) / CELL);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) { const a = GRID.get(gk(i, j)); if (!a) continue;
        for (const t of a) { if (t.gone) continue; const d = Math.hypot(t.x - cx, t.y - cy); if (d < R0 + 2) sel0[t.m].push(t); if (d > R0 - 8 && d < R1 + 2) sel1[t.m].push(t); } } }
    let n0 = 0, n1 = 0; const fill = (I, sel, max) => { const n = Math.min(max, sel.length); for (let k = 0; k < n; k++) { const t = sel[k]; matrixOf(t, I.Md, m4); I.b.setMatrixAt(k, m4); I.c.setMatrixAt(k, m4); const g = 0.86 + (t.id % 9) * 0.03; colT.setRGB(g, g, g); I.c.setColorAt(k, colT); I.b.setColorAt(k, colT); }
      for (const im of [I.b, I.c]) { im.count = n; im.instanceMatrix.needsUpdate = true; if (im.instanceColor) im.instanceColor.needsUpdate = true; } return n; };
    IM0.forEach((I, i) => { n0 += fill(I, sel0[i], MAX0); }); IM1.forEach((I, i) => { n1 += fill(I, sel1[i], MAX1); });
    for (const C of CIM) { let n = 0; if (!far) for (const it of C.list) { if (n >= MAXC) break; if (Math.abs(it.x - cx) > Rc || Math.abs(it.y - cy) > Rc || Math.hypot(it.x - cx, it.y - cy) > Rc) continue;
        q4.setFromAxisAngle(up3, it.rot); m4.compose(V(it.x, it.y, it.z - 0.04), q4, sv3.set(it.s, it.s, it.s)); m4.multiply(C.local); C.im.setMatrixAt(n++, m4); }
      C.im.count = n; C.im.instanceMatrix.needsUpdate = true; }
    S.nNear = n0; S.nMid = n1; S.ms = +(performance.now() - t0).toFixed(1); markDirty(true); }
  // per frame: the sun's shadow box for the canopy shade, the draw sets
  let seasT = 0;
  window.TICKS.push(dt => { if (!S.ready) return; if (typeof sunC !== 'undefined') CU.uSunBox.value.set(sunC[0], sunC[1], sunHalf, 0.8); relod(false);
    if ((seasT -= (dt || 0.016)) > 0) return; seasT = 2; const q = seasonOf(doyNow()), u = SEAS_U.value; if (Math.abs(q[0] - u.x) + Math.abs(q[1] - u.y) + Math.abs(q[2] - u.z) < 0.004) return;
    u.set(q[0], q[1], q[2], 0); markDirty(true);
    const a = A2 && A2.seas; if (a && Math.abs(a.x - u.x) + Math.abs(a.y - u.y) + Math.abs(a.z - u.z) > 0.12) A2 = atlas(A2.models, A2.mats, A2.rt); });
  whenLoaded(() => { if (!window.RATSCHER || !RATSCHER.ready) return; try { build(); } catch (e) { console.warn('forest', e); } });
  // ---------- the ground shader part (world/ratscher.js terrain): needle litter and moss under the crowns, light under the canopy ----------
  const FS_STUB = 'float fCan = 0.0, fOut = 1.0; vec3 forestFloor( vec2 p, vec3 c, float d ) { return c; }';
  S.shader = sh => { if (!window.DETAIL || (window.GLCHECK && GLCHECK.lite)) return FS_STUB;   // needs tDet from the road GLSL (world/roads.js), which LITE drops
    Object.assign(sh.uniforms, CU, { uFTile: { value: new THREE.Vector2(DETAIL.tile.needles || 2.4, DETAIL.tile.mossfloor || 2) } });
    const LN = DETAIL.L.needles.toFixed(1), LM = DETAIL.L.mossfloor.toFixed(1);
    return `uniform sampler2D tCan; uniform vec4 bCan, uSunBox; uniform vec2 uFTile; float fCan = 0.0, fOut = 1.0;
    vec3 forestFloor( vec2 p, vec3 c, float dist ) { vec2 dx = dFdx( p ), dy = dFdy( p ), cu = ( p - bCan.xy ) * bCan.zw;
      float k = ( cu.x > 0.0 && cu.y > 0.0 && cu.x < 1.0 && cu.y < 1.0 ) ? texture( tCan, cu ).r : 0.0;
      fCan = k; fOut = max( smoothstep( uSunBox.z - 3.0, uSunBox.z, max( abs( p.x - uSunBox.x ), abs( p.y - uSunBox.y ) ) ), uSunBox.w );
      float kf = smoothstep( 0.1, 0.5, k ) * ( 1.0 - smoothstep( 120.0, 260.0, dist ) );   // far away the photo's own forest floor and canopy take over
      if ( kf < 0.001 ) return c;
      vec3 nd = textureGrad( tDet, vec3( p / uFTile.x, ${LN} ), dx / uFTile.x, dy / uFTile.x ).rgb, ms = textureGrad( tDet, vec3( p / uFTile.y + 0.37, ${LM} ), dx / uFTile.y, dy / uFTile.y ).rgb;
      float mz = smoothstep( 0.45, 0.7, rdN( p * 0.11 + 3.1 ) ) * ( 0.6 + 0.4 * rdN( p * 0.9 ) );   // moss and leaf patches
      vec3 fl = mix( nd * vec3( 0.42, 0.37, 0.33 ), ms * vec3( 0.55, 0.66, 0.46 ), mz * 0.85 ) * ( 0.85 + 0.3 * rdN( p * 0.35 ) );
      return mix( c, fl, kf ); }`; };
  // the matching light lines (after lights_fragment_end): direct sun dimmed under the crowns beyond the shadow box, less sky
  S.LIGHT = 'reflectedLight.directDiffuse *= 1.0 - 0.86 * fCan * fOut; reflectedLight.directSpecular *= 1.0 - 0.9 * fCan * fOut; reflectedLight.indirectDiffuse *= mix( vec3( 1.0 ), vec3( 0.46, 0.5, 0.36 ), fCan ); reflectedLight.indirectSpecular *= 1.0 - 0.8 * fCan;';
  // ---------- V16c2 felling (world/fell.js): one tree taken out of the instancing, its profile, the gap it leaves ----------
  S.byId = id => S.list[id];
  S.model = m => MODELS0[m];
  S.variant = m => VARIANTS[m];
  S.scaleOf = t => { const Md = MODELS0[t.m]; return { s: t.h / Md.H, sw: t.h / Md.H * t.w }; };
  // radius of the trunk of tree t at z m above its foot (world metres, as drawn)
  S.trunkR = (t, z) => { const Md = MODELS0[t.m], s = t.h / Md.H; return Md.rAt(Math.max(0, z) / s) * s * t.w; };
  // materials for one tree outside the instancing: the near look, bark hidden below uCut (model height), cards gone below uDelimb (share of height)
  S.soloMats = (sp, U) => { const B = S._mk.barkTex[SPEC[sp].bark], lu = S._mk.lodU[0];
    const bark = patch(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, map: B && B.map, normalMap: B && B.nrm, roughnessMap: B && B.orm, roughness: 1, envMapIntensity: 0.55 }), 'b' + sp, lu, false, U);
    const cards = patch(new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, map: S._mk.twig, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.82, envMapIntensity: 0.5 }), 'c' + sp, lu, true, U);
    if (sp === 'larch') seasonal(cards, false); return { bark, cards, depth: S._mk.depth, barkMap: B }; };
  // take a tree out of the stand: near/middle sets, its far card, its trunk for collisions, its crown from the light and litter maps
  S.hide = t => { if (!t || t.gone) return; t.gone = true;
    if (t.fi) { const [im, i] = t.fi; im.getMatrixAt(i, m4); m4.scale(sv3.set(0, 0, 0)); im.setMatrixAt(i, m4); im.instanceMatrix.needsUpdate = true; }
    if (S.cov && CU.tCan.value) { splat(S.cov, t.x, t.y, t.h * 0.16 * t.w + 1.2, t.h < 6.5 ? -0.25 : -0.7, true, true); const d = CU.tCan.value.image.data, c = S.cov;
      for (let k = 0; k < c.length; k++) d[k] = Math.round(Math.max(0, Math.min(1, c[k])) * 255); CU.tCan.value.needsUpdate = true; }
    if (window.WCOL && WCOL.removeTree) WCOL.removeTree(t.x, t.y);
    relod(true); };
  S.stats = () => ({ trees: S.list.length, core: S.list.filter(t => t.core).length, near: S.nNear, mid: S.nMid, ms: S.ms, build: S.buildMs, cover: CIM.reduce((n, C) => n + C.im.count, 0) });
  return S; })();
window.FOREST = FOREST;
