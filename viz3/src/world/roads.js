// ===================== V16b roads and paths: the OSM ways drawn into the ground, the surface under the wheels, bridges =====================
// The ways (tools/geo/build_roads.py: kind, surface, width, polyline in model metres) are rasterised once at load into a road map over the
// drivable square (the 2.4 km of the 10 m terrain): R = distance to the nearest road edge (+ inside the road), G = kind × 8 + surface of
// that road, B = the signed lateral offset from its centre line, A = the phase of its dashed centre line (18 m: 6 m line, 12 m gap).
// The ground shaders (world/ratscher.js terrain, garden/env.js near ground) draw asphalt, concrete, gravel, two-track ruts, verges and
// markings from it (ROADS.GLSL, roadShade()); vehicles read the surface under each wheel (ROADS.at) and stand on ROADS.groundAt
// (terrain triangles, bridge decks). Bridges get a deck with railings, their height straight between the two ends.
// © OpenStreetMap contributors (ODbL), with the other geodata in the credits.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LATE } from '../core/late.js';
import { BASE, QUALITY, scene, V } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { ANISO, b64bytes, LM, markDirty, TEXMAN, whenLoaded } from '../core/assets.js';
import { DETAIL, GLCHECK } from '../core/detail.js';
import { STREAM } from '../garden/stream_geo.js';
import { GEO_REAL } from '../garden/env.js';
import { RATSCHER } from './ratscher.js';
export const ROADS = (() => {
  const M = window.GEOMAN && window.GEOMAN.roads;
  const S = {
    on: !!(GEO_REAL && M),
    ready: false,
    ways: [],
    decks: [],
    routes: (M && M.routes) || {},
    KINDS: (M && M.kinds) || [],
    SURF: (M && M.surf) || [],
  };
  const U = {
    tRoad: { value: null },
    bRoad: { value: new THREE.Vector4(0, 0, 1, 1) },
    uRoad: { value: new THREE.Vector4(0, 0, 0, 0) },
  }; // uRoad.x: road map present
  // detail textures for the ground up close: the photo gives the colour, these the grain (grass, soil, asphalt, gravel) – layers of the one
  // texture array of core/detail.js (V16b1: a shader may use 16 textures on many GPUs; four extra ones broke the near ground there)
  {
    const tl = (k, d) => (window.TEXMAN && TEXMAN[k] && TEXMAN[k].tile[0]) || d;
    Object.assign(U, {
      tDet: { value: DETAIL.tex },
      uDTile: {
        value: new THREE.Vector4(tl('lawn', 1.4), tl('forestfloor', 3), tl('asphalt', 2.5), tl('gravel', 1.6)),
      },
    });
  }
  const LY = n => DETAIL.L[n].toFixed(1);
  S.U = U;
  const EMIN = -4,
    ERNG = 12,
    LRNG = 8,
    DASH = 18; // encoding: edge distance −4 … +8 m, lateral offset ±8 m, dash period (m)
  // ---- the ground shader part: roadShade( p (site metres), ground colour, distance from the camera ) → colour ----
  S.GLSL = `uniform sampler2D tRoad; uniform highp sampler2DArray tDet; uniform vec4 bRoad, uRoad, uDTile;
    float rdH( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
    float rdN( vec2 p ) { vec2 i = floor( p ), f = fract( p ); vec2 u = f * f * ( 3.0 - 2.0 * f ); return mix( mix( rdH( i ), rdH( i + vec2( 1.0, 0.0 ) ), u.x ), mix( rdH( i + vec2( 0.0, 1.0 ) ), rdH( i + vec2( 1.0, 1.0 ) ), u.x ), u.y ); }
    float rdLine( float d, float hw, float fw ) { return clamp( ( hw - d ) / fw + 0.5, 0.0, 1.0 ) * min( 1.0, 2.0 * hw / fw ); }   // coverage of a line of half width hw
    float rdPhase( vec2 uv ) {   // phase of the dashes, bilinear over four texels unwrapped against the first (no seam where it wraps)
      vec2 q = uv * vec2( textureSize( tRoad, 0 ) ) - 0.5, f = fract( q ); ivec2 i = ivec2( floor( q ) );
      float a = texelFetch( tRoad, i, 0 ).a, b = texelFetch( tRoad, i + ivec2( 1, 0 ), 0 ).a, c = texelFetch( tRoad, i + ivec2( 0, 1 ), 0 ).a, d = texelFetch( tRoad, i + ivec2( 1, 1 ), 0 ).a;
      b -= floor( b - a + 0.5 ); c -= floor( c - a + 0.5 ); d -= floor( d - a + 0.5 ); return fract( mix( mix( a, b, f.x ), mix( c, d, f.x ), f.y ) ); }
    // a detail texture with mean 1 (two samples, one turned and scaled, against visible tiling); explicit gradients dx, dy of p, so it may sit in branches
    vec3 rdTex( float layer, vec2 p, float tile, vec2 dx, vec2 dy ) { vec2 q = p / tile; mat2 M = mat2( 0.8, -0.6, 0.6, 0.8 ) * 0.43;
      vec3 a = textureGrad( tDet, vec3( q, layer ), dx / tile, dy / tile ).rgb, b = textureGrad( tDet, vec3( M * q + 0.31, layer ), M * dx / tile, M * dy / tile ).rgb;
      return mix( a, b, 0.4 ) / max( textureLod( tDet, vec3( 0.5, 0.5, layer ), 20.0 ).rgb, vec3( 0.02 ) ); }
    // bare fields, stubble and gravel come out of the photos too bright and cold (like frost): brightness above 0.22 compressed, warmed
    vec3 landHi( vec3 c ) { float l = dot( c, vec3( 0.3, 0.59, 0.11 ) ), hi = smoothstep( 0.18, 0.42, l );
      return c * ( l > 0.22 ? ( 0.22 + ( l - 0.22 ) * 0.45 ) / l : 1.0 ) * mix( vec3( 1.0 ), vec3( 1.08, 1.0, 0.82 ), hi ); }
    vec3 landDetail( vec2 p, vec3 c, float dist ) { vec2 dx = dFdx( p ), dy = dFdy( p );
      // the aerial photos are cool and hazy (April, from the plane): the blue veil lifted from the darker ground, a little more colour
      float l = dot( c, vec3( 0.3, 0.59, 0.11 ) ), hz = 1.0 - smoothstep( 0.08, 0.35, l );
      c *= vec3( 1.0 + 0.08 * hz, 1.0, 0.62 + 0.38 * ( 1.0 - hz ) ); l = dot( c, vec3( 0.3, 0.59, 0.11 ) );
      c = landHi( c ); l = dot( c, vec3( 0.3, 0.59, 0.11 ) );
      c = max( mix( vec3( l ), c, 1.15 ), vec3( 0.0 ) ) * 0.8;   // and a little darker: grass and soil reflect less than the photo shows
      // up close the photo is soft: the grain of grass (most of the land) or of bare soil (brown fields), fading out by 150 m
      float k = 1.0 - smoothstep( 30.0, 150.0, dist ), gr = clamp( ( c.g - c.r ) * 12.0 + 0.7, 0.0, 1.0 );
      float n = ( rdN( p * 0.85 ) - 0.5 ) * 0.18 * ( 1.0 - smoothstep( 300.0, 700.0, dist ) );
      if ( k > 0.0 ) { vec3 d = gr < 0.02 ? rdTex( ${LY('forestfloor')}, p, uDTile.y, dx, dy ) : gr > 0.98 ? rdTex( ${LY('lawn')}, p, uDTile.x, dx, dy ) : mix( rdTex( ${LY('forestfloor')}, p, uDTile.y, dx, dy ), rdTex( ${LY('lawn')}, p, uDTile.x, dx, dy ), gr );
        c *= mix( vec3( 1.0 ), clamp( d, 0.2, 2.5 ), 0.8 * k ); }
      return c * ( 1.0 + n ); }
    vec3 roadShade( vec2 p, vec3 c, float dist ) {
      if ( uRoad.x < 0.5 ) return c;
      // everything that needs screen derivatives first, before any per-pixel branch
      vec2 dx = dFdx( p ), dy = dFdy( p ), uv = ( p - bRoad.xy ) * bRoad.zw; float fwp = length( abs( dx ) + abs( dy ) );
      vec4 t = texture( tRoad, uv ); float e = t.r * ${ERNG.toFixed(1)} + ${EMIN.toFixed(1)}, lat = t.b * ${(2 * LRNG).toFixed(1)} - ${LRNG.toFixed(1)}, fwE = max( fwidth( e ), 0.01 ), fwL = max( fwidth( lat ), 0.01 );
      if ( uv.x <= 0.001 || uv.y <= 0.001 || uv.x >= 0.999 || uv.y >= 0.999 || e < -1.4 ) return c;
      float code = floor( texelFetch( tRoad, ivec2( uv * vec2( textureSize( tRoad, 0 ) ) ), 0 ).g * 255.0 + 0.5 ), kind = floor( code / 8.0 ), surf = code - kind * 8.0;
      float al = abs( lat ), fine = 1.0 - smoothstep( 0.012, 0.05, fwp ), mid = 1.0 - smoothstep( 0.08, 0.4, fwp );
      float lum = dot( c, vec3( 0.3, 0.59, 0.11 ) ), hard = step( surf, 2.5 );   // asphalt, concrete, paving: a hard edge; gravel and earth fray into the grass
      float eN = e + ( rdN( p * 1.7 ) - 0.5 ) * mix( 0.5, 0.13, hard ) + ( rdN( p * 9.0 ) - 0.5 ) * 0.05 * mid;
      float k = smoothstep( -fwE, fwE, eN ) * ( 1.0 - smoothstep( 600.0, 1400.0, dist ) );
      float n1 = rdN( p * 0.23 ), n2 = rdN( p * 1.3 + 3.7 ), n3 = ( rdN( p * 23.0 ) - 0.5 ) * fine + ( rdN( p * 7.0 + 1.3 ) - 0.5 ) * 0.6 * mid;
      vec3 r;
      float kd = 1.0 - smoothstep( 25.0, 120.0, dist );
      if ( surf < 0.5 ) {   // asphalt: dark grey, patches and repairs after the photo's brightness, grain (texture up close); polished wheel tracks on wider roads
        r = vec3( 0.098, 0.1, 0.105 ) * clamp( lum / 0.12, 0.72, 1.45 ) * ( 0.84 + 0.3 * n1 ) * ( 0.94 + 0.12 * n2 ) * mix( vec3( 1.0 + 0.3 * n3 ), clamp( rdTex( ${LY('asphalt')}, p, uDTile.z, dx, dy ), 0.3, 2.2 ), kd );
        if ( kind < 3.5 ) r *= 1.0 - 0.07 * ( 1.0 - smoothstep( 0.25, 0.6, abs( al - 1.75 ) ) ) * mid; }
      else if ( surf < 1.5 ) { r = vec3( 0.32, 0.315, 0.3 ) * ( 0.88 + 0.2 * n1 ) * ( 1.0 + 0.22 * n3 ); }   // concrete
      else if ( surf < 2.5 ) {   // paving stones: small blocks
        vec2 bq = fract( p * vec2( 4.0, 6.0 ) ); float jt = ( 1.0 - smoothstep( 0.0, 0.08, min( min( bq.x, 1.0 - bq.x ), min( bq.y, 1.0 - bq.y ) ) ) ) * fine;
        r = vec3( 0.25, 0.235, 0.22 ) * ( 0.85 + 0.3 * rdH( floor( p * vec2( 4.0, 6.0 ) ) ) ) * ( 1.0 - 0.45 * jt ); }
      else if ( surf < 3.5 ) {   // gravel: light, coarse grain, wheel tracks a little darker and smoother
        r = mix( vec3( 0.35, 0.33, 0.29 ), c * 1.15, 0.35 ) * ( 0.85 + 0.3 * n1 ) * mix( vec3( 1.0 + 0.45 * n3 ), clamp( rdTex( ${LY('gravel')}, p, uDTile.w, dx, dy ), 0.3, 2.2 ), kd ); r *= 1.0 - 0.1 * ( 1.0 - smoothstep( 0.15, 0.35, abs( al - 0.78 ) ) ); }
      else {   // earth or grass: two wheel tracks of bare soil, grass between and beside them (a single trail on narrow paths)
        float rut = kind > 6.5 ? 1.0 - smoothstep( 0.18, 0.42, al ) : 1.0 - smoothstep( 0.16, 0.34, abs( al - 0.78 ) );
        rut *= ( surf > 4.5 ? 0.4 : 0.92 ) * ( 0.75 + 0.25 * n2 );
        vec3 soil = vec3( 0.25, 0.205, 0.155 ) * ( 0.8 + 0.35 * n1 ) * mix( vec3( 1.0 + 0.35 * n3 ), clamp( rdTex( ${LY('forestfloor')}, p, uDTile.y, dx, dy ), 0.3, 2.2 ), kd ), worn = c * vec3( 1.08, 1.05, 0.9 );
        r = mix( worn, soil, rut ); }
      // markings: edge lines (main roads, motorway), dashed centre line or lane divider (main and county roads, motorway); worn white paint
      if ( kind < 2.5 && hard > 0.5 && dist < 220.0 ) {
        float paint = 0.0;
        if ( kind < 1.5 ) paint = rdLine( abs( e - 0.27 ), 0.075, fwE );
        if ( al < 0.5 ) paint = max( paint, rdLine( al, 0.065, fwL ) * step( rdPhase( uv ), 0.3333 ) );
        r = mix( r, vec3( 0.58, 0.58, 0.56 ) * ( 0.85 + 0.15 * n2 ), paint * ( 0.8 + 0.2 * n1 ) * ( 1.0 - smoothstep( 120.0, 220.0, dist ) ) ); }
      // verge: beside asphalt and concrete a strip of trodden grass and grit
      vec3 o = c; if ( hard > 0.5 ) o = mix( c, vec3( 0.2, 0.19, 0.155 ) * ( 0.8 + 0.4 * n2 ), smoothstep( -0.7, -0.05, eN ) * ( 1.0 - k ) * 0.5 );
      return mix( o, r, k ); }`;
  // without textures (GPU below what the shader needs, core/detail.js GLCHECK.lite): the same functions, plain
  S.STUB =
    'float rdH( vec2 p ) { return 0.5; } float rdN( vec2 p ) { return 0.5; } vec3 roadShade( vec2 p, vec3 c, float d ) { return c; } vec3 landDetail( vec2 p, vec3 c, float d ) { return c; } vec3 landHi( vec3 c ) { return c; }';
  S.shader = sh => {
    if (window.GLCHECK && GLCHECK.lite) return S.STUB;
    Object.assign(sh.uniforms, U);
    return S.GLSL;
  }; // a ground material's onBeforeCompile: S.shader(sh) → GLSL to prepend
  const ground0 = (x, y) =>
    (Math.abs(x) < 120 && Math.abs(y) < 120) || !(window.RATSCHER && RATSCHER.ready)
      ? STREAM.zAt(x, y)
      : RATSCHER.hMesh(x, y);
  if (!S.on) {
    S.at = () => null;
    S.edge = () => -99;
    S.deckAt = () => null;
    S.groundAt = ground0;
    S.place = () => null;
    return S;
  }
  const [X0, Y0, X1, Y1] = M.box,
    RES = QUALITY === 'high' ? 1.25 : 2.0,
    W = Math.ceil((X1 - X0) / RES),
    H = Math.ceil((Y1 - Y0) / RES);
  let D = null; // RGBA bytes of the road map (also read on the CPU)
  // ---- parse the ways, rasterise the road map ----
  function parse(buf) {
    const a = new Int16Array(buf);
    let o = 0;
    while (o + 5 <= a.length) {
      const n = a[o],
        kind = a[o + 1],
        surf = a[o + 2],
        w = a[o + 3] / 10,
        fl = a[o + 4];
      o += 5;
      const p = new Float32Array(n * 2);
      for (let i = 0; i < n * 2; i++) p[i] = a[o + i] / 10;
      o += n * 2;
      S.ways.push({ kind, surf, w, fl: notBridge(fl, p) ? fl & ~1 : fl, p, mark: (M.mark || [])[kind] || 0 });
    }
  }
  // OpenStreetMap marks a bridge on the field path east of the garden (by Ronald's garden, about (37, 11)); there is none – the path runs on
  // into the village on the ground and the brook stays south of it (Falko, 30.10.2026; orthophoto). Bridges within 6 m of that spot are drawn
  // as ground. (The garden's own bridge over the brook is garden/stream.js, not an OSM way.)
  function notBridge(fl, p) {
    if (!(fl & 1)) return false;
    for (let i = 0; i < p.length; i += 2) if (Math.hypot(p[i] - 37, p[i + 1] - 11.5) < 6) return true;
    return false;
  }
  function raster() {
    const t0 = performance.now();
    D = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      D[i * 4 + 2] = 128;
    } // R 0 = far from every road
    const BAND = 4,
      enc = v => Math.max(0, Math.min(255, Math.round(v))),
      eK = 255 / ERNG,
      lK = 255 / (2 * LRNG);
    for (const wy of S.ways) {
      if (wy.fl & 1) continue; // bridges: their own deck
      const hw = wy.w / 2,
        code = wy.kind * 8 + wy.surf,
        p = wy.p,
        n = p.length / 2,
        R2 = hw + BAND;
      let s0 = 0;
      for (let k = 0; k < n - 1; k++) {
        const ax = p[k * 2],
          ay = p[k * 2 + 1],
          bx = p[k * 2 + 2],
          by = p[k * 2 + 3],
          L = Math.hypot(bx - ax, by - ay);
        if (L < 1e-3) continue;
        const ux = (bx - ax) / L,
          uy = (by - ay) / L;
        const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - R2 - X0) / RES)),
          i1 = Math.min(W - 1, Math.ceil((Math.max(ax, bx) + R2 - X0) / RES)),
          j0 = Math.max(0, Math.floor((Math.min(ay, by) - R2 - Y0) / RES)),
          j1 = Math.min(H - 1, Math.ceil((Math.max(ay, by) + R2 - Y0) / RES));
        for (let j = j0; j <= j1; j++) {
          const py = Y0 + (j + 0.5) * RES - ay;
          for (let i = i0; i <= i1; i++) {
            const px = X0 + (i + 0.5) * RES - ax;
            let t = px * ux + py * uy;
            const lat = ux * py - uy * px;
            const tc = t < 0 ? 0 : t > L ? L : t,
              d = Math.hypot(px - tc * ux, py - tc * uy),
              e = hw - d;
            if (e < -BAND) continue;
            const r8 = enc((e - EMIN) * eK),
              q = (j * W + i) * 4;
            if (r8 <= D[q]) continue;
            D[q] = r8;
            D[q + 1] = code;
            D[q + 2] = enc((Math.max(-LRNG, Math.min(LRNG, lat)) + LRNG) * lK);
            D[q + 3] = enc((((s0 + tc) / DASH) % 1) * 255) & 255;
          }
        }
        s0 += L;
      }
    }
    S.rasterMs = Math.round(performance.now() - t0);
  }
  function texture() {
    const t = new THREE.DataTexture(D, W, H, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.colorSpace = THREE.NoColorSpace;
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = ANISO;
    t.flipY = false;
    t.needsUpdate = true;
    U.tRoad.value = t;
    U.bRoad.value.set(X0, Y0, 1 / (W * RES), 1 / (H * RES));
    U.uRoad.value.x = 1;
  }
  // ---- queries (CPU): the road at a point, its edge distance; trees standing on a road are left out (world/ratscher.js) ----
  const pix = (x, y) => {
    const i = Math.floor((x - X0) / RES),
      j = Math.floor((y - Y0) / RES);
    return i < 0 || j < 0 || i >= W || j >= H ? -1 : (j * W + i) * 4;
  };
  S.at = (x, y) => {
    if (!D) return null;
    const q = pix(x, y);
    if (q < 0) return null;
    const e = (D[q] / 255) * ERNG + EMIN;
    if (e < -3.9) return null;
    const code = D[q + 1];
    return { e, kind: code >> 3, surf: code & 7, lat: (D[q + 2] / 255) * 2 * LRNG - LRNG };
  };
  S.edge = (x, y) => {
    if (!D) return -99;
    const q = pix(x, y);
    return q < 0 ? -99 : (D[q] / 255) * ERNG + EMIN;
  };
  // ---- bridges: a deck straight between the two ends (at the height of the higher ground across the width), railings on both sides ----
  function buildDecks() {
    const hM = (x, y) => RATSCHER.hMesh(x, y);
    const matTop = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 }),
      matSide = new THREE.MeshStandardMaterial({ color: 0x8d8a84, roughness: 0.85 }),
      matRail = new THREE.MeshStandardMaterial({ color: 0x9aa0a4, roughness: 0.45, metalness: 0.6 });
    matTop.onBeforeCompile = sh => {
      sh.vertexShader =
        'varying vec2 vRdP;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n vRdP = vec2( position.x, -position.z );'
        );
      sh.fragmentShader =
        'varying vec2 vRdP;\n' +
        S.shader(sh) +
        '\n' +
        sh.fragmentShader.replace(
          '#include <map_fragment>',
          '#include <map_fragment>\n diffuseColor.rgb *= roadShade( vRdP, vec3( 0.13, 0.13, 0.135 ), length( vViewPosition ) );'
        );
    };
    matTop.customProgramCacheKey = () => 'roaddeck';
    const top = [],
      side = [],
      rail = [];
    for (const wy of S.ways) {
      if (!(wy.fl & 1)) continue;
      const p = wy.p,
        n = p.length / 2,
        hw = wy.w / 2 + 0.35;
      const cum = [0];
      for (let k = 1; k < n; k++)
        cum.push(cum[k - 1] + Math.hypot(p[k * 2] - p[k * 2 - 2], p[k * 2 + 1] - p[k * 2 - 1]));
      const L = cum[n - 1];
      if (L < 3) continue;
      const dirAt = k => {
        const a = Math.max(0, k - 1),
          b = Math.min(n - 1, k + 1);
        const dx = p[b * 2] - p[a * 2],
          dy = p[b * 2 + 1] - p[a * 2 + 1],
          l = Math.hypot(dx, dy) || 1;
        return [dx / l, dy / l];
      };
      const endZ = k => {
        const [ux, uy] = dirAt(k),
          x = p[k * 2],
          y = p[k * 2 + 1];
        return Math.max(hM(x, y), hM(x - uy * hw, y + ux * hw), hM(x + uy * hw, y - ux * hw)) + 0.08;
      };
      const zA = endZ(0),
        zB = endZ(n - 1),
        zOf = s => zA + ((zB - zA) * s) / L;
      const deck = { way: wy, p, cum, L, hw, zOf, x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9 };
      for (let k = 0; k < n; k++) {
        deck.x0 = Math.min(deck.x0, p[k * 2] - hw);
        deck.x1 = Math.max(deck.x1, p[k * 2] + hw);
        deck.y0 = Math.min(deck.y0, p[k * 2 + 1] - hw);
        deck.y1 = Math.max(deck.y1, p[k * 2 + 1] + hw);
      }
      S.decks.push(deck);
      // the deck as a box strip: top, two sides, underside; railings: posts every 2 m and two rails
      for (let k = 0; k < n - 1; k++) {
        const [ux, uy] = dirAt(k),
          [vx, vy] = dirAt(k + 1);
        const A = [p[k * 2], p[k * 2 + 1], zOf(cum[k])],
          B = [p[k * 2 + 2], p[k * 2 + 3], zOf(cum[k + 1])];
        const aL = [A[0] - uy * hw, A[1] + ux * hw],
          aR = [A[0] + uy * hw, A[1] - ux * hw],
          bL = [B[0] - vy * hw, B[1] + vx * hw],
          bR = [B[0] + vy * hw, B[1] - vx * hw];
        const q = (a, b, c, d, arr) => {
          for (const v of [a, b, c, a, c, d]) arr.push(v[0], v[2], -v[1]);
        };
        q([...aR, A[2]], [...bR, B[2]], [...bL, B[2]], [...aL, A[2]], top);
        for (const [s0, s1] of [
          [aL, bL],
          [bR, aR],
        ]) {
          const z0 = s0 === aL ? A[2] : B[2],
            z1 = s1 === bL ? B[2] : A[2];
          q([...s0, z0 - 0.75], [...s1, z1 - 0.75], [...s1, z1], [...s0, z0], side);
        }
        q([...aL, A[2] - 0.75], [...bL, B[2] - 0.75], [...bR, B[2] - 0.75], [...aR, A[2] - 0.75], side);
      }
      // railings on both sides, 0.4 m short of the deck's ends (posts every ~2 m, two rails); the same lines are the colliders (world/worldcol.js)
      const at = sv => {
        let k = 0;
        while (k < n - 2 && cum[k + 1] < sv) k++;
        const L1 = cum[k + 1] - cum[k] || 1,
          f = (sv - cum[k]) / L1,
          ux = (p[k * 2 + 2] - p[k * 2]) / L1,
          uy = (p[k * 2 + 3] - p[k * 2 + 1]) / L1;
        return [
          p[k * 2] + (p[k * 2 + 2] - p[k * 2]) * f,
          p[k * 2 + 1] + (p[k * 2 + 3] - p[k * 2 + 1]) * f,
          zOf(sv),
          ux,
          uy,
        ];
      };
      const s0 = Math.min(0.4, L * 0.1),
        s1 = L - s0,
        np = Math.max(1, Math.round((s1 - s0) / 2));
      deck.rails = [];
      for (const sd of [1, -1]) {
        let prev = null;
        for (let j = 0; j <= np; j++) {
          const [x0, y0, z0, ux, uy] = at(s0 + ((s1 - s0) * j) / np),
            x = x0 - uy * sd * (hw - 0.08),
            y = y0 + ux * sd * (hw - 0.08);
          rail.push([x, y, z0, 0.05, 0.05, 1.0]);
          if (prev) {
            for (const zr of [0.55, 1.0]) rail.push([prev[0], prev[1], prev[2] + zr, x, y, z0 + zr, 'r']);
            deck.rails.push([prev[0], prev[1], x, y]);
          }
          prev = [x, y, z0];
        }
      }
    }
    if (!top.length) return;
    const mk = (arr, mat, idx) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3));
      g.computeVertexNormals();
      const me = new THREE.Mesh(g, mat);
      me.userData.noMerge = true;
      me.castShadow = true;
      me.receiveShadow = true;
      scene.add(me);
      return me;
    };
    mk(top, matTop);
    mk(side, matSide);
    // railings: posts and rails as thin boxes in one merged geometry
    const gs = [];
    const bx = new THREE.BoxGeometry(1, 1, 1);
    for (const r of rail) {
      const g = bx.clone(),
        m4 = new THREE.Matrix4();
      if (r[6] === 'r') {
        const dx = r[3] - r[0],
          dy = r[4] - r[1],
          dz = r[5] - r[2],
          L = Math.hypot(dx, dy, dz);
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 0, 0), V(dx, dy, dz).normalize());
        m4.compose(V((r[0] + r[3]) / 2, (r[1] + r[4]) / 2, (r[2] + r[5]) / 2), q, new THREE.Vector3(L, 0.05, 0.06));
      } else m4.compose(V(r[0], r[1], r[2] + r[5] / 2), new THREE.Quaternion(), new THREE.Vector3(r[3], r[5], r[4]));
      g.applyMatrix4(m4);
      gs.push(g);
    }
    const me = new THREE.Mesh(BufferGeometryUtils.mergeGeometries(gs), matRail);
    me.userData.noMerge = true;
    me.castShadow = true;
    scene.add(me);
  }
  // the deck under a point: [z, deck] where (x, y) lies on a deck (within its width), else null
  function deckAt(x, y) {
    for (const d of S.decks) {
      if (x < d.x0 || x > d.x1 || y < d.y0 || y > d.y1) continue;
      const p = d.p,
        n = p.length / 2;
      for (let k = 0; k < n - 1; k++) {
        const ax = p[k * 2],
          ay = p[k * 2 + 1],
          bx = p[k * 2 + 2],
          by = p[k * 2 + 3],
          L = Math.hypot(bx - ax, by - ay);
        if (L < 1e-3) continue;
        const ux = (bx - ax) / L,
          uy = (by - ay) / L,
          t = (x - ax) * ux + (y - ay) * uy;
        if (t < -0.01 || t > L + 0.01) continue;
        const lat = Math.abs(ux * (y - ay) - uy * (x - ax));
        if (lat > d.hw) continue;
        return [d.zOf(d.cum[k] + Math.max(0, Math.min(L, t))) + 0.02, d, lat];
      }
    }
    return null;
  }
  S.deckAt = deckAt;
  // the drivable ground under a point: the modelled site (flat, the stream), the terrain triangles, a bridge deck when coming from its level (z: the current height)
  S.groundAt = (x, y, z) => {
    let g = ground0(x, y);
    if (S.decks.length) {
      const d = deckAt(x, y);
      if (d && d[0] > g && (z == null || z > d[0] - 1.2)) g = d[0];
    }
    if (
      window.STREAM &&
      STREAM.onBridge &&
      Math.abs(x) < 120 &&
      Math.abs(y) < 120 &&
      STREAM.onBridge(x, y) &&
      (z == null || z > -0.7)
    )
      g = Math.max(g, (STREAM.BR && STREAM.BR.walkTop) || 0.06); // V16d: the garden bridge carries vehicles too (tractor and trailer to the sawmill)
    return g;
  };
  // ---- place names out in the land (game/game.js placeName): the Klinge, the villages after the map labels, the kind of road ----
  const PL = ((window.GEOMAN && GEOMAN.labels) || []).filter(l => l.k === 'place');
  const RN = {
    motorway: 'Autobahn A 73',
    main: 'Landstraße',
    county: 'Kreisstraße',
    street: 'Dorfstraße',
    lane: 'Wirtschaftsweg',
    service: 'Zufahrt',
    track: 'Feldweg',
    path: 'Pfad',
    foot: 'Fußweg',
  };
  S.place = (x, y) => {
    const fw = window.FOREST && LATE.FOREST.place(x, y);
    if (fw) return fw; // V16c: in the forest (world/forest.js)
    const J = (S.routes.klinge || []).slice(-1)[0];
    if (J && Math.hypot(x - J[0], y - J[1]) < 140) return 'Untere Klinge';
    let best = null,
      bd = 1e9;
    for (const l of PL) {
      const d = Math.hypot(x - l.x, y - l.y);
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    const r = S.at(x, y),
      rn = r && r.e > -0.5 ? RN[S.KINDS[r.kind]] : null,
      near = best && bd < (best.p >= 9 ? 700 : 380);
    if (near) return rn && rn !== 'Dorfstraße' ? best.t + ' · ' + rn : best.t;
    if (rn) return best && bd < 1500 ? rn + ' bei ' + best.t : rn;
    return best && bd < 1500 ? 'Feldflur bei ' + best.t : 'Feldflur';
  };
  // ---- load ----
  new THREE.FileLoader(LM).setResponseType('json').load(
    BASE + 'geo/' + M.file,
    j => {
      try {
        parse(b64bytes(j.b64).buffer);
        raster();
        texture();
        S.ready = true;
      } catch (e) {
        console.warn('roads', e);
      }
    },
    undefined,
    () => {}
  );
  whenLoaded(() => {
    if (!S.ready || !RATSCHER.ready) return;
    try {
      buildDecks();
    } catch (e) {
      console.warn('bridges', e);
    }
    markDirty(true);
  });
  return S;
})();
LATE.ROADS = ROADS;
window.ROADS = ROADS;
// the ground, the road surface and the place names out in the land as KERN services (core/kern.js)
KERN.provide('ground', (x, y, z) => ROADS.groundAt(x, y, z));
KERN.provide('surface', (x, y) => ROADS.at(x, y));
KERN.provide('place', (x, y) => ROADS.place(x, y), 0);
