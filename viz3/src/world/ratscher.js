// ===================== Ratscher: the real surroundings from open geodata =====================
// Terrain: DGM1 (1 m laser scan, bare earth) within 1.2 km of the village centre, beyond it the surface (DOM1, Copernicus DEM) out to 12 km, so
// the wooded hills keep their canopy on the skyline; earth curvature included. Draped with the Thuringian orthophotos (20 cm … 6 m per pixel,
// © GDI-Th, CC BY 4.0) or an OSM-style map (© OpenStreetMap contributors, ODbL). 337 buildings from OSM footprints with roofs from the
// surface model (roof colours from the orthophoto), 21 000 trees from the canopy height model (tree tops, height, crown width, conifer or not).
// The modelled site (garden, Hubert, Ronald, workshop, stream and field path) stays as it is; the real land starts around it.
// Data preparation: scratchpad geo/tools (fetch_all, build_terrain2, build_osm, build_bld, pack).
const RATSCHER = (() => {
  const M = window.GEOMAN, S = { on: GEO_REAL && !!M, ready: false, map: false, tex: {}, mapTex: null, meshes: [], trees: [], bld: [], water: [], mid: [], hAt: () => 0, hMesh: () => 0 };
  if (!S.on) return S;
  const GB = BASE + 'geo/', LQ = QUALITY !== 'high' && !OFFLINE;
  const A = M.xf.a, Bq = M.xf.b, T = M.terrain;
  // haze over the land: exponential (aerial perspective) instead of the old linear fog that ended at 7 km; density per light mode in setMode
  THREE.ShaderChunk.fog_fragment = THREE.ShaderChunk.fog_fragment.replace('float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );', 'float fogFactor = 1.0 - exp( - fogDensity * vFogDepth );');
  scene.fog = new THREE.FogExp2(scene.fog.color.getHex(), 3.4e-5);
  // ---------- texture boxes: uv = (A x − B y + dE, B x + A y + dN) / w with dE = EX − e0 (small numbers: full float precision in the shader) ----------
  const box = t => new THREE.Vector4(M.xf.ex - t.e0, M.xf.ey - t.n0, 1 / t.w, 0);
  const GU = { tGN: { value: null }, tGI: { value: null }, tGO: { value: null }, tGF: { value: null }, bGN: { value: box(M.tex.near) }, bGI: { value: box(M.tex.inner) }, bGO: { value: box(M.tex.outer) }, bGF: { value: box(M.tex.far) },
    uGAB: { value: new THREE.Vector2(A, Bq) }, uGMap: { value: 0 }, uGGain: { value: 0.86 }, uGEdge: { value: new THREE.Vector3(T.cm[0], T.cm[1], 11800) }, uGFlat: { value: 0 }, uGFlatK: { value: 1 }, uGCurve: { value: 0 } };
  const GEO_GLSL = `uniform sampler2D tGN, tGI, tGO, tGF; uniform vec4 bGN, bGI, bGO, bGF; uniform vec2 uGAB; uniform float uGMap, uGGain, uGFlat, uGFlatK, uGCurve; uniform vec3 uGEdge; vec3 gGeoEm = vec3( 0.0 );
    // aerial photos are developed with more contrast than the ground has: bright roads and fields too bright, forests nearly black – a gentle curve towards albedo
    vec3 geoAlb( vec3 c, float g ) { return mix( c * g, 0.62 * pow( max( c, vec3( 0.0 ) ), vec3( 0.75 ) ) * g / 0.86, uGCurve ); }
    vec2 gUV( vec2 p, vec4 b ) { return vec2( uGAB.x * p.x - uGAB.y * p.y + b.x, uGAB.y * p.x + uGAB.x * p.y + b.y ) * b.z; }
    float gWt( vec2 uv, float m ) { vec2 d = min( uv, 1.0 - uv ); return smoothstep( 0.0, m, min( d.x, d.y ) ); }
    vec3 geoCol( vec2 p ) {
      vec2 uF = gUV( p, bGF ), uO = gUV( p, bGO ), uI = gUV( p, bGI ), uN = gUV( p, bGN );
      vec3 cF = texture2D( tGF, uF ).rgb, cO = texture2D( tGO, uO ).rgb, cI = texture2D( tGI, uI ).rgb, cN = texture2D( tGN, uN ).rgb;
      if ( uGMap > 0.5 ) { float l = dot( cF, vec3( 0.3, 0.55, 0.15 ) ); cF = mix( vec3( 0.42, 0.64, 0.34 ), vec3( 0.86, 0.87, 0.66 ), smoothstep( 0.045, 0.09, l ) ); }   // beyond the map: forest or open land in map colours
      vec3 c = mix( cF, cO, gWt( uO, 0.02 ) ); c = mix( c, cI, gWt( uI, 0.03 ) ); c = mix( c, cN, gWt( uN, 0.05 ) );
      return uGMap > 0.5 ? c : geoAlb( c, uGGain ); }`;
  const texLoad = (file, cb, lm = LM) => new THREE.TextureLoader(lm).load(GB + file, t => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = ANISO; t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; cb && cb(t); markDirty(); });
  const tfile = (o) => (LQ && o.lq) ? o.lq : o.file;
  S.tex = { near: texLoad(tfile(M.tex.near)), inner: texLoad(tfile(M.tex.inner)), outer: texLoad(tfile(M.tex.outer)), far: texLoad(tfile(M.tex.far)) };
  const setTex = set => { GU.tGN.value = set.near; GU.tGI.value = set.inner; GU.tGO.value = set.outer; GU.tGF.value = set.far; GEOGU.uGeoTex.value = set.near; };
  setTex(S.tex);
  // near ground: the orthophoto outside the modelled site (06_env)
  { const n = M.tex.near; GEOGU.uGeoAB.value.set(A, Bq); GEOGU.uGeoBox.value.set(M.xf.ex - n.e0, M.xf.ey - n.n0, 1 / n.w); GEOGU.uGeoGain.value = 0.86;
    const z = M.site; GEOGU.uGeoZone.value.set(z.x0, z.x1, z.y0, z.y1);
    const P1 = S0.path[0], P2 = S0.path[1], L = Math.hypot(P2[0] - P1[0], P2[1] - P1[1]); let nx = -(P2[1] - P1[1]) / L, ny = (P2[0] - P1[0]) / L; if (ny > 0) { nx = -nx; ny = -ny; }
    GEOGU.uGeoPath.value.set(P1[0], P1[1], nx, ny); }
  // ---------- binary data ----------
  const bin = {}; const fl = new THREE.FileLoader(LM).setResponseType('json');   // base64 in JSON (the artifact host serves no raw binary files)
  for (const [k, f] of [['terrain', T.file], ['bld', M.bld.file], ['trees', M.trees.file]]) fl.load(GB + f, j => { try { bin[k] = b64bytes(j.b64).buffer; } catch (e) { console.warn('geo', f, e); } }, undefined, () => {});
  let zI = null, zO = null;
  const bil = (Z, n, c, r) => { const c0 = Math.min(n - 2, Math.max(0, Math.floor(c))), r0 = Math.min(n - 2, Math.max(0, Math.floor(r))), fc = Math.min(1, Math.max(0, c - c0)), fr = Math.min(1, Math.max(0, r - r0));
    return (Z[r0 * n + c0] * (1 - fc) * (1 - fr) + Z[r0 * n + c0 + 1] * fc * (1 - fr) + Z[(r0 + 1) * n + c0] * (1 - fc) * fr + Z[(r0 + 1) * n + c0 + 1] * fc * fr) / 10; };
  function hAt(x, y) { if (!zI) return 0; if (Math.abs(x) < 120 && Math.abs(y) < 120) return 0;
    const I = T.inner; let c = (x - I.x0) / I.step, r = (y - I.y0) / I.step; if (c >= 0 && r >= 0 && c <= I.n - 1 && r <= I.n - 1) return bil(zI, I.n, c, r);
    const O = T.outer; return bil(zO, O.n, (x - O.x0) / O.step, (y - O.y0) / O.step); }
  S.hAt = hAt;
  // exact height of the drawn ground: the triangles of the 10 m mesh (diagonal i,j → i+1,j+1; the grid lines next to ±120 m moved onto it),
  // so wheels and feet stand on what is seen; inside the modelled square the flat near ground (0)
  let XS = null, YS = null;
  function hMesh(x, y) { if (Math.abs(x) < 120 && Math.abs(y) < 120) return 0; const I = T.inner, n = I.n; if (!zI || !XS) return hAt(x, y);
    let i = Math.floor((x - I.x0) / I.step), j = Math.floor((y - I.y0) / I.step); if (i < 0 || j < 0 || i > n - 2 || j > n - 2) return hAt(x, y);
    if (i > 0 && x < XS[i]) i--; else if (i < n - 2 && x >= XS[i + 1]) i++; if (j > 0 && y < YS[j]) j--; else if (j < n - 2 && y >= YS[j + 1]) j++;
    const u = (x - XS[i]) / (XS[i + 1] - XS[i]), v = (y - YS[j]) / (YS[j + 1] - YS[j]), k = j * n + i, za = zI[k], zb = zI[k + 1], zc = zI[k + n + 1], zd = zI[k + n];
    return (u >= v ? za + u * (zb - za) + v * (zc - zb) : za + v * (zd - za) + u * (zc - zd)) / 10; }
  S.hMesh = hMesh;
  // the drivable square (inner 10 m terrain): [x0, y0, x1, y1]
  S.box = [T.inner.x0, T.inner.y0, T.inner.x0 + (T.inner.n - 1) * T.inner.step, T.inner.y0 + (T.inner.n - 1) * T.inner.step];
  // ---------- terrain meshes ----------
  function terrainMat() {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, metalness: 0, envMapIntensity: 0.55 });
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, GU, FIELDU);
      sh.vertexShader = 'varying vec2 vGeo;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGeo = vec2( position.x, -position.z );');
      sh.fragmentShader = 'varying vec2 vGeo;\n' + GEO_GLSL + '\n' + FIELD_GLSL + '\n' + ROADS.shader(sh) + '\n' + sh.fragmentShader
        .replace('#include <map_fragment>', `#include <map_fragment>
          { vec3 gc = geoCol( vGeo ); if ( uGMap < 0.5 && uGFlat < 0.5 ) gc = roadShade( vGeo, landDetail( vGeo, gc, length( vViewPosition ) ), length( vViewPosition ) );   // V16b: roads and paths (world/roads.js)
            gc *= 1.0 - uCloudK * cloudSh( vGeo ) * ( 1.0 - uGFlat ); gGeoEm = gc * uGFlat * uGFlatK; diffuseColor.rgb *= gc * ( 1.0 - uGFlat ); }`)
        .replace('#include <emissivemap_fragment>', '#include <emissivemap_fragment>\n totalEmissiveRadiance += gGeoEm;')
        .replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n reflectedLight.indirectSpecular *= 0.35;')   // grass and soil scatter: no pale sky sheen at grazing angles (V16b, low driving views)
        .replace('#include <fog_fragment>', `#include <fog_fragment>
          #ifdef USE_FOG
          { vec2 ed = abs( vGeo - uGEdge.xy ); gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, smoothstep( uGEdge.z - 3200.0, uGEdge.z, max( ed.x, ed.y ) ) ); }   // the end of the data fades into the haze
          #endif`); };
    m.customProgramCacheKey = () => 'geoterrain'; return m; }
  function buildTerrain() {
    const I = T.inner, O = T.outer, buf = bin.terrain; zI = new Int16Array(buf, 0, I.n * I.n); zO = new Int16Array(buf, I.n * I.n * 2, O.n * O.n);
    const mat = terrainMat(); S.terrainMat = mat;
    // inner: 10 m grid with a hole for the near ground (240 m square of the model); the grid lines next to ±120 m are moved onto it
    { const n = I.n, xs = new Float32Array(n), ys = new Float32Array(n); for (let i = 0; i < n; i++) { xs[i] = I.x0 + i * I.step; ys[i] = I.y0 + i * I.step; }
      const iL = Math.round((-120 - I.x0) / I.step), iR = Math.round((120 - I.x0) / I.step), jB = Math.round((-120 - I.y0) / I.step), jT = Math.round((120 - I.y0) / I.step);
      xs[iL] = -120; xs[iR] = 120; ys[jB] = -120; ys[jT] = 120; XS = xs; YS = ys;
      const pos = new Float32Array(n * n * 3); for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) { const k = (j * n + i) * 3; pos[k] = xs[i]; pos[k + 1] = zI[j * n + i] / 10; pos[k + 2] = -ys[j]; }
      const idx = []; for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) { if (i >= iL && i < iR && j >= jB && j < jT) continue; const a = j * n + i, b = a + 1, c = a + n + 1, d = a + n; idx.push(a, b, c, a, c, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
      const me = new THREE.Mesh(g, mat); me.userData.noMerge = true; me.receiveShadow = false; scene.add(me); S.meshes.push(me); }
    // outer: 120 m grid, hole for the inner square; the cells along the hole are fanned onto the inner border points (no cracks)
    { const n = O.n, [h0, h1] = O.hole, nI = I.n, k12 = Math.round(O.step / I.step); const pos = [], idx = [];
      for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) pos.push(O.x0 + i * O.step, zO[j * n + i] / 10, -(O.y0 + j * O.step));
      const vO = (i, j) => j * n + i; const extra = new Map();
      const vI = (i, j) => { const key = i + ',' + j; let v = extra.get(key); if (v === undefined) { v = pos.length / 3; pos.push(I.x0 + i * I.step, zI[j * nI + i] / 10, -(I.y0 + j * I.step)); extra.set(key, v); } return v; };
      for (let j = 0; j < n - 1; j++) for (let i = 0; i < n - 1; i++) {
        if (i >= h0 && i < h1 && j >= h0 && j < h1) continue;
        const a = vO(i, j), b = vO(i + 1, j), c = vO(i + 1, j + 1), d = vO(i, j + 1);
        if (j === h0 - 1 && i >= h0 && i < h1) { const t = k => vI((i - h0) * k12 + k, 0); for (let k = 0; k < k12 / 2; k++) idx.push(a, t(k + 1), t(k)); idx.push(a, b, t(k12 / 2)); for (let k = k12 / 2; k < k12; k++) idx.push(b, t(k + 1), t(k)); continue; }
        if (j === h1 && i >= h0 && i < h1) { const t = k => vI((i - h0) * k12 + k, nI - 1); for (let k = 0; k < k12 / 2; k++) idx.push(d, t(k), t(k + 1)); idx.push(d, t(k12 / 2), c); for (let k = k12 / 2; k < k12; k++) idx.push(c, t(k), t(k + 1)); continue; }
        if (i === h0 - 1 && j >= h0 && j < h1) { const t = k => vI(0, (j - h0) * k12 + k); for (let k = 0; k < k12 / 2; k++) idx.push(a, t(k), t(k + 1)); idx.push(a, t(k12 / 2), d); for (let k = k12 / 2; k < k12; k++) idx.push(d, t(k), t(k + 1)); continue; }
        if (i === h1 && j >= h0 && j < h1) { const t = k => vI(nI - 1, (j - h0) * k12 + k); for (let k = 0; k < k12 / 2; k++) idx.push(b, t(k + 1), t(k)); idx.push(b, c, t(k12 / 2)); for (let k = k12 / 2; k < k12; k++) idx.push(c, t(k + 1), t(k)); continue; }
        idx.push(a, b, c, a, c, d); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); g.computeBoundingSphere();
      const me = new THREE.Mesh(g, mat); me.userData.noMerge = true; me.receiveShadow = false; scene.add(me); S.meshes.push(me); } }
  // ---------- water (reservoir, ponds): flat at their level, the terrain under them is carved ----------
  function buildWater() {
    const mat = new THREE.MeshStandardMaterial({ color: 0x3f5862, roughness: 0.07, metalness: 0, envMapIntensity: 1.0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -8 });
    const pos = [], idx = []; for (const w of M.water) { const b = pos.length / 3; for (let i = 0; i < w.x.length; i++) pos.push(w.x[i], w.z, -w.y[i]);
      for (let t = 0; t < w.tri.length; t += 3) { const [p, q, r] = [w.tri[t], w.tri[t + 1], w.tri[t + 2]]; const cr = (w.x[q] - w.x[p]) * (w.y[r] - w.y[p]) - (w.y[q] - w.y[p]) * (w.x[r] - w.x[p]); if (cr >= 0) idx.push(b + p, b + q, b + r); else idx.push(b + p, b + r, b + q); } }
    if (!idx.length) return; const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    const me = new THREE.Mesh(g, mat); me.userData.noMerge = true; scene.add(me); S.water.push(me); }
  // ---------- buildings: walls (plaster / boards / sheet, windows) and roofs coloured from the orthophoto ----------
  const WALL_GLSL = `varying vec4 vW; float gH( float n ) { return fract( sin( n * 12.9898 + 4.1 ) * 43758.5453 ); } float gWin = 0.0;`;
  function wallMat() {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0, envMapIntensity: 0.7 });
    m.onBeforeCompile = sh => {
      sh.vertexShader = 'attribute vec4 aW; varying vec4 vW;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vW = aW;');
      sh.fragmentShader = WALL_GLSL + '\n' + sh.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
        { float typ = mod( vW.w, 4.0 ), bid = floor( vW.w / 4.0 ), k = gH( bid ), v = vW.y, top = vW.z; vec3 c;
          if ( typ < 0.5 ) {   // house: plaster in light tones, windows in bays, two floors where the wall is high enough
            c = k < 0.18 ? vec3( 0.62, 0.59, 0.53 ) : k < 0.36 ? vec3( 0.58, 0.52, 0.42 ) : k < 0.54 ? vec3( 0.66, 0.64, 0.60 ) : k < 0.7 ? vec3( 0.55, 0.50, 0.46 ) : k < 0.85 ? vec3( 0.63, 0.56, 0.44 ) : vec3( 0.13, 0.14, 0.16 );   // plaster tones; one in seven clad in slate
            float per = 2.9 + gH( bid + 7.0 ) * 0.9, cu = fract( vW.x / per + gH( bid + 3.0 ) ), fl = mod( v, 2.8 ), ww = abs( cu - 0.5 ) * per;
            float inW = step( ww, 0.62 ) * step( 0.9, fl ) * step( fl, 2.3 ) * step( v, top - 0.5 ) * step( 0.6, v ), gl = step( ww, 0.54 ) * step( 0.98, fl ) * step( fl, 2.22 );
            vec3 wc = gl > 0.5 ? mix( vec3( 0.05, 0.06, 0.07 ), vec3( 0.19, 0.22, 0.25 ), smoothstep( 0.98, 2.22, fl ) ) : vec3( 0.7, 0.69, 0.66 );
            float aa = smoothstep( 0.22, 0.55, fwidth( vW.x ) + fwidth( v ) );   // far away the window grid would flicker: its average instead
            c = mix( mix( c, wc, inW ), c * 0.84, aa * step( 0.6, v ) * step( v, top - 0.5 ) ); gWin = gl * inW * ( 1.0 - aa ); }
          else if ( typ < 1.5 ) {   // barn, stable, hall: boards or sheet in grey and brown, a plinth of concrete, sometimes a row of small stable windows
            c = k < 0.3 ? vec3( 0.40, 0.39, 0.36 ) : k < 0.55 ? vec3( 0.33, 0.25, 0.18 ) : k < 0.8 ? vec3( 0.50, 0.48, 0.44 ) : vec3( 0.48, 0.27, 0.19 );
            float aa = smoothstep( 0.22, 0.55, fwidth( vW.x ) + fwidth( v ) );
            c *= 0.93 + 0.07 * sin( vW.x * ( k < 0.55 ? 41.9 : 62.8 ) ) * ( 1.0 - aa ); if ( v < 0.9 ) c = vec3( 0.55, 0.54, 0.51 );
            float bw = step( abs( fract( vW.x / 3.4 ) - 0.5 ) * 3.4, 0.45 ) * step( 1.9, v ) * step( v, 2.6 ) * step( v, top - 0.6 ) * step( 0.5, gH( bid + 1.0 ) );
            c = mix( c, mix( vec3( 0.1, 0.11, 0.12 ), c * 0.8, aa ), bw ); }
          else { c = k < 0.5 ? vec3( 0.36, 0.28, 0.2 ) * ( 0.92 + 0.08 * sin( vW.x * 41.9 ) ) : vec3( 0.48, 0.47, 0.45 ); }   // sheds and garages: boards or grey
          if ( v < 0.3 && typ < 0.5 ) c = vec3( 0.5, 0.49, 0.47 );
          c *= 0.78 + 0.22 * smoothstep( -0.3, 1.4, v );   // a little darker at the foot
          diffuseColor.rgb *= c; }`)
        .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = mix( roughnessFactor, 0.12, gWin );'); };
    m.customProgramCacheKey = () => 'geowall'; return m; }
  function roofMat() {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.82, metalness: 0, envMapIntensity: 0.6, side: THREE.DoubleSide });   // eaves seen from below
    m.onBeforeCompile = sh => { Object.assign(sh.uniforms, GU);
      sh.vertexShader = 'varying vec2 vGeo;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n vGeo = vec2( position.x, -position.z );');
      sh.fragmentShader = 'varying vec2 vGeo;\n' + GEO_GLSL + '\n' + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n diffuseColor.rgb *= geoCol( vGeo ) * 1.08;'); };
    m.customProgramCacheKey = () => 'georoof'; return m; }
  function buildBuildings() {
    const b = M.bld, buf = bin.bld; let o = 0; const nw = b.walls, nr = b.roofs, ni = b.ridx;
    const wp = new Int16Array(buf, o, nw * 3); o += nw * 6; const wt = new Int16Array(buf, o, nw * 4); o += nw * 8; const rp = new Int16Array(buf, o, nr * 3); o += nr * 6; const ri = new Uint32Array(buf.slice(o, o + ni * 4));
    const P = new Float32Array(nw * 3), W = new Float32Array(nw * 4);
    for (let i = 0; i < nw; i++) { P[i * 3] = wp[i * 3] / 10; P[i * 3 + 1] = wp[i * 3 + 2] / 100; P[i * 3 + 2] = -wp[i * 3 + 1] / 10; W[i * 4] = wt[i * 4] / 10; W[i * 4 + 1] = wt[i * 4 + 1] / 100; W[i * 4 + 2] = wt[i * 4 + 2] / 100; W[i * 4 + 3] = wt[i * 4 + 3]; }
    const wi = new Uint32Array(nw / 4 * 6); for (let s = 0, k = 0; s < nw; s += 4) { wi[k++] = s; wi[k++] = s + 2; wi[k++] = s + 1; wi[k++] = s + 1; wi[k++] = s + 2; wi[k++] = s + 3; }
    const gw = new THREE.BufferGeometry(); gw.setAttribute('position', new THREE.BufferAttribute(P, 3)); gw.setAttribute('aW', new THREE.BufferAttribute(W, 4)); gw.setIndex(new THREE.BufferAttribute(wi, 1)); gw.computeVertexNormals(); gw.computeBoundingSphere();
    const RP = new Float32Array(nr * 3); for (let i = 0; i < nr; i++) { RP[i * 3] = rp[i * 3] / 10; RP[i * 3 + 1] = rp[i * 3 + 2] / 100; RP[i * 3 + 2] = -rp[i * 3 + 1] / 10; }
    for (let t = 0; t < ni; t += 3) { const p = ri[t] * 3, q = ri[t + 1] * 3, r = ri[t + 2] * 3;   // roofs face up (Delaunay order is arbitrary); three z = −north
      const cr = (RP[q] - RP[p]) * (-RP[r + 2] + RP[p + 2]) - (-RP[q + 2] + RP[p + 2]) * (RP[r] - RP[p]); if (cr < 0) { const s = ri[t + 1]; ri[t + 1] = ri[t + 2]; ri[t + 2] = s; } }
    const gr = new THREE.BufferGeometry(); gr.setAttribute('position', new THREE.BufferAttribute(RP, 3)); gr.setIndex(new THREE.BufferAttribute(ri, 1)); gr.computeVertexNormals(); gr.computeBoundingSphere();
    for (const [g, m] of [[gw, wallMat()], [gr, roofMat()]]) { const me = new THREE.Mesh(g, m); me.userData.noMerge = true; me.castShadow = false; me.receiveShadow = false; scene.add(me); S.bld.push(me); }
    // V16b: every wall's foot as a segment [x1, y1, x2, y2] (vehicles collide with all buildings, vehicles/vehicle.js)
    { const segs = []; for (let s = 0; s + 3 < nw; s += 4) { const ax = P[s * 3], ay = -P[s * 3 + 2]; let bx = ax, by = ay, bd = -1;
        for (let k = 1; k < 4; k++) { const x = P[(s + k) * 3], y = -P[(s + k) * 3 + 2], d = (x - ax) ** 2 + (y - ay) ** 2; if (d > bd) { bd = d; bx = x; by = y; } }
        if (bd > 0.01) segs.push(ax, ay, bx, by); }
      S.walls = new Float32Array(segs); }
    // buildings within reach of a walk: colliders (oriented box around each footprint)
    const by = new Map(); for (let i = 0; i < nw; i += 2) { const bid = Math.floor(W[i * 4 + 3] / 4), x = P[i * 3], y = -P[i * 3 + 2]; if (Math.hypot(x - 2, y - 2) > 95) continue; let a = by.get(bid); if (!a) by.set(bid, a = []); a.push([x, y]); }
    for (const pts of by.values()) { const cx = pts.reduce((s, p) => s + p[0], 0) / pts.length, cy = pts.reduce((s, p) => s + p[1], 0) / pts.length; let sxx = 0, syy = 0, sxy = 0;
      for (const [x, y] of pts) { sxx += (x - cx) ** 2; syy += (y - cy) ** 2; sxy += (x - cx) * (y - cy); } const an = 0.5 * Math.atan2(2 * sxy, sxx - syy), c = Math.cos(an), s = Math.sin(an);
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9; for (const [x, y] of pts) { const lx = (x - cx) * c + (y - cy) * s, ly = -(x - cx) * s + (y - cy) * c; x0 = Math.min(x0, lx); x1 = Math.max(x1, lx); y0 = Math.min(y0, ly); y1 = Math.max(y1, ly); }
      COL.push([x0, x1, y0, y1, -2, 14, 'house', null, null, { cx, cy, c, s }]); }
    if (by.size) rebuildGrids(); }
  // ---------- trees: impostor cards (an atlas of five generated trees) beyond 100 m, real 3D crowns nearer ----------
  const TK = ['oakA', 'ash', 'oakB', 'aspen', 'pine'];
  function treeAtlas() {
    const Ks = TK.map(k => TREES[k]); if (Ks.some(K => !K || !K.leaf.map || !K.leaf.map.image)) return null;
    const C = 256, rt = new THREE.WebGLRenderTarget(C * TK.length, C, { generateMipmaps: true, minFilter: THREE.LinearMipmapLinearFilter, magFilter: THREE.LinearFilter });
    const sv = SV.on.value, gi = GI.on.value; SV.on.value = 0; GI.on.value = 0; const pt = R.getRenderTarget(), pc = R.getClearColor(new THREE.Color()), pa = R.getClearAlpha();
    R.setRenderTarget(rt); R.setClearColor(0x3f4b30, 0); R.clear(); const info = [];
    Ks.forEach((K, i) => { const sc = new THREE.Scene(); sc.add(new THREE.AmbientLight(0xffffff, Math.PI)); sc.add(new THREE.Mesh(K.bg, K.bark), new THREE.Mesh(K.lg, K.leaf));
      const bb = new THREE.Box3().setFromObject(sc), sz = bb.getSize(new THREE.Vector3()), c = bb.getCenter(new THREE.Vector3()); const hw = Math.max(sz.x, sz.z) / 2 * 1.02, H = sz.y * 1.02, s = Math.max(hw * 2, H);
      const cm = new THREE.OrthographicCamera(-s / 2, s / 2, s, 0, 0.1, 400); cm.position.set(c.x, bb.min.y, c.z + 150); cm.lookAt(c.x, bb.min.y, c.z);
      rt.viewport.set(i * C, 0, C, C); rt.scissor.set(i * C, 0, C, C); rt.scissorTest = true; R.setRenderTarget(rt); R.render(sc, cm); info.push({ w: hw * 2 / s, h: H / s }); });
    rt.scissorTest = false; rt.viewport.set(0, 0, C * TK.length, C); R.setRenderTarget(pt); R.setClearColor(pc, pa); SV.on.value = sv; GI.on.value = gi;
    return { tex: rt.texture, info }; }
  function buildTrees() {
    const t = new Int16Array(bin.trees), n = t.length / 5, far = [], mid = []; S.treeXY = [];   // x, y, height of every tree (vehicle collisions)
    for (let i = 0; i < n; i++) { const x = t[i * 5] / 10, y = t[i * 5 + 1] / 10, h = t[i * 5 + 2] / 100, r = t[i * 5 + 3] / 100, con = t[i * 5 + 4] > 0;
      if (STREAM.inDitch(x, y, 0.8)) continue; if (ROADS.edge(x, y) > -0.4) continue;   // V16b: a crown measured over a road stands beside it, not in it
      const hs = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
      const kind = con ? 4 : Math.floor(hs * 4), it = { x, y, z: hAt(x, y), h, r, kind, hs }; (Math.hypot(x - 2, y - 2) < 100 ? mid : far).push(it); S.treeXY.push(x, y, h); }
    // near: generated 3D trees (thinned leaf cards), as the garden's own trees
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), sv = new THREE.Vector3();
    const byK = new Map(); for (const it of mid) { const k = TK[it.kind]; if (!TREES[k]) continue; let a = byK.get(k); if (!a) byK.set(k, a = []); a.push(it); }
    for (const [k, list] of byK) { const K = TREES[k]; if (!K.lgFar) K.lgFar = thinCards(K.lg, 0.35, 1.55);
      const ib = new THREE.InstancedMesh(K.bg, K.bark, list.length), il = new THREE.InstancedMesh(K.lgFar, K.leaf, list.length);
      list.forEach((it, i) => { const sy = it.h / K.H, sx = THREE.MathUtils.clamp(it.r / K.R, sy * 0.75, sy * 1.3); q.setFromAxisAngle(up, it.hs * 6.283); m4.compose(V(it.x, it.y, it.z - 0.1), q, sv.set(sx, sy, sx)); ib.setMatrixAt(i, m4); il.setMatrixAt(i, m4);
        il.setColorAt(i, new THREE.Color(1, 1, 1).multiplyScalar(0.84 + it.hs * 0.2)); if (Math.hypot(it.x - 2, it.y - 2) < 90) COL.push([it.x - 0.3, it.x + 0.3, it.y - 0.3, it.y + 0.3, 0, 4, 'tree']); });
      for (const im of [ib, il]) { im.castShadow = false; im.receiveShadow = false; im.userData.noMerge = true; vegReady(im); scene.add(im); S.mid.push(im); } }
    rebuildGrids();
    // far: crossed cards with the atlas; one instanced mesh per 400 m cell (frustum culling)
    const A2 = treeAtlas(); if (!A2) return; const nK = TK.length;
    const mat = new THREE.MeshStandardMaterial({ map: A2.tex, alphaTest: 0.32, side: THREE.DoubleSide, roughness: 1, envMapIntensity: 0.55 });
    mat.onBeforeCompile = sh => { sh.vertexShader = 'attribute float aKind;\n' + sh.vertexShader.replace('#include <uv_vertex>', `#include <uv_vertex>\n vMapUv.x = ( aKind + vMapUv.x ) / ${nK.toFixed(1)};`);
      sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\n normal = normalize( vNormal ); nonPerturbedNormal = normal;'); };
    mat.customProgramCacheKey = () => 'geotree';
    const cross = (() => { const a = new THREE.PlaneGeometry(1, 1), b = new THREE.PlaneGeometry(1, 1); b.rotateY(Math.PI / 2); const g = BufferGeometryUtils.mergeGeometries([a, b]); g.translate(0, 0.5, 0);
      const nn = g.attributes.normal; for (let i = 0; i < nn.count; i++) nn.setXYZ(i, 0, 1, 0); return g; })();
    for (const grp of cellsOf(far, 400)) { const g = cross.clone(), kk = new Float32Array(grp.length); g.setAttribute('aKind', new THREE.InstancedBufferAttribute(kk, 1));
      const im = new THREE.InstancedMesh(g, mat, grp.length);
      grp.forEach((it, i) => { const I = A2.info[it.kind], asp = I.w / I.h, sy = it.h / I.h, wv = THREE.MathUtils.clamp(it.r * 2, it.h * asp * 0.75, it.h * asp * 1.35), sx = wv / I.w;
        q.setFromAxisAngle(up, it.hs * 6.283); m4.compose(V(it.x, it.y, it.z - 0.3), q, sv.set(sx, sy, sx)); im.setMatrixAt(i, m4); kk[i] = it.kind;
        im.setColorAt(i, new THREE.Color(1, 1, 1).offsetHSL((it.hs - 0.5) * 0.04, 0, (it.hs - 0.5) * 0.1).multiplyScalar(it.kind === 4 ? 0.82 : 1)); });
      im.castShadow = false; im.receiveShadow = false; im.userData.noMerge = true; vegReady(im); scene.add(im); S.trees.push(im); } }
  // ---------- map view: labels of places, hills, roads, water (drawn by SITEPLAN.drawOverlay) ----------
  const LBL = (M.labels || []).slice().sort((a, b) => b.p - a.p);
  S.overlay = (pr, put, W, H) => { const th = P.th; if (th < 160) return; const thr = th < 450 ? 3 : th < 1500 ? 4 : th < 4000 ? 5 : 6;
    for (const l of LBL) { if (l.p < thr) continue; if (l.k === 'road' && th > 3500) continue; const p = pr(l.x, l.y, l.z || 0); if (p[0] < -50 || p[0] > W + 50 || p[1] < -20 || p[1] > H + 20) continue;
      const cls = { place: 'gp', peak: 'gk', poi: 'gk', water: 'gw', river: 'gw', road: 'gr' }[l.k] || 'gr', fs = l.k === 'place' ? (l.p >= 9 ? 17 : l.p >= 8 ? 15 : 13) : l.k === 'road' ? 11 : 12;
      let ang = 0; if (l.a != null && (l.k === 'road' || l.k === 'river')) { ang = -l.a; while (ang > 90) ang -= 180; while (ang < -90) ang += 180; }
      put(p, l.k === 'peak' ? '▲ ' + l.t : l.t, cls, ang, fs); } };
  // ---------- switching ----------
  S.setMap = v => { v = !!v; if (v === S.map) return; S.map = v; const b = document.querySelector('#sitebar [data-sa="geomap"]'); if (b) b.setAttribute('aria-pressed', v ? 'true' : 'false');
    if (v && !S.mapTex) { S.mapTex = { near: null, inner: null, outer: null, far: S.tex.far }; let left = 3;
      const done = () => { if (--left) return; if (S.map) { setTex(S.mapTex); GU.uGMap.value = 1; } markDirty(true); };
      for (const k of ['near', 'inner', 'outer']) texLoad(tfile(M.map[k]), t => { S.mapTex[k] = t; done(); }, THREE.DefaultLoadingManager); }
    else if (v && S.mapTex.near) { setTex(S.mapTex); GU.uGMap.value = 1; } else if (!v) { setTex(S.tex); GU.uGMap.value = 0; }
    for (const m of [...S.trees, ...S.bld, ...S.water, ...S.mid]) m.visible = !v; GEOGU.uGeoMap.value = v ? 1 : 0; S.topMode(S.top); };
  // plan view: no haze, colour-true tone mapping (photo and map should look like themselves)
  const TM0 = R.toneMapping, sat0 = GRADE.sat.value, vig0 = GRADE.vig.value;
  S.top = false; S.curve = 0;   // photo-to-albedo curve: tried, the plain photo looks more natural (kept switchable)
  S.topMode = on => { if (!S.ready) return; S.top = on; R.toneMapping = on ? THREE.NeutralToneMapping : TM0; GRADE.sat.value = on ? (S.map ? 1.0 : 1.15) : sat0; GRADE.vig.value = on ? 0.12 : vig0;
    // plan view: photo and map mostly in their own colours (a third of the sun's relief stays on the photo), no warm evening light on the map
    const fk = on ? (S.map ? 1 : 0.65) : 0, k = 0.92 / Math.max(0.5, R.toneMappingExposure); GU.uGFlat.value = fk; GU.uGFlatK.value = k; GEOGU.uGeoFlat.value = fk; GEOGU.uGeoFlatK.value = k;
    GU.uGCurve.value = GEOGU.uGeoCurve.value = on ? 0 : S.curve;   // the plan view shows the photo as it is
    GU.uGGain.value = on ? (S.map ? 1 : 0.9) : 0.86; GEOGU.uGeoGain.value = GU.uGGain.value; markDirty(true); };
  S.village = () => { if (P.mode !== 'top') go('draufsicht'); const far = P.th > 600; P.tx = far ? 2 : 160; P.ty = far ? 2 : -120; P.th = far ? 110 : 1500; markDirty(); };
  document.querySelectorAll('#sitebar [data-sa="geomap"], #sitebar [data-sa="village"]').forEach(b => b.addEventListener('click', () => b.dataset.sa === 'geomap' ? S.setMap(!S.map) : S.village()));
  // ---------- build when every file is there ----------
  whenLoaded(() => { if (!bin.terrain) { console.warn('Geodaten fehlen'); return; }
    try { buildTerrain(); } catch (e) { console.warn('terrain', e); return; }
    for (const f of [buildWater, () => bin.bld && buildBuildings(), () => bin.trees && buildTrees()]) { try { f(); } catch (e) { console.warn('geo', e); } }
    for (const o of FAKEENV) { o.visible = false; scene.remove(o); }
    GEOGU.uGeoOn.value = 1; S.ready = true; document.body.dataset.geo = '1';
    document.querySelectorAll('#sitebar [data-sa="geomap"], #sitebar [data-sa="village"], #geoattr').forEach(e => e.hidden = false);
    if (P.mode === 'top') S.topMode(true); applyCam(); markDirty(true); });
  return S; })();
window.RATSCHER = RATSCHER;
