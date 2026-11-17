// ===================== feat/bewuchs: grass blades in rings around the camera, made on the graphics card (BWHALM) =====================
// Falko, 17.11.2026 20:19: the lawn is „noch 2D, komplett flach“; „Rasen, Gras, Wildblumen … wobei es trotzdem im Browser weiterhin
// flüssig laufen können soll“. Two rings follow the camera: near (to ~14 m) single curved blades of three triangles, in tiles of 1 m;
// beyond it (to ~40 m) simple blades of one triangle in tiles of 2 m, only where the grass is tall enough to show. A tile is one instance
// of a fixed patch of K blades (its pattern turned and mirrored by the tile's hash, so no grid shows); everything a blade needs it reads on
// the card at its foot: the kind of area and its vigour (BWKARTE's textures), its height today (the class table of BWPHAENO: grown since the
// field was cut, each field on its own day), the garden's mowing (GRASS.MOW: cut cells are short and carry the mower's stripe), the
// orthophoto (no blades where it is not green – paths, bare soil, roofs –, the colour leaning towards it), the wind (WXWIND, the same
// waves as the garden's lawn had) and the distance (blades shrink to nothing at a ring's edge – no popping). The processor only lists the
// tiles in view of each ring (nearest first) and their corner heights (KERN.ground, cached on a lattice) when the camera has moved or turned.
// One draw call per ring, one program per ring compiled at load (MeshStandardMaterial with patchSV like the other plants: sky
// visibility, baked light, the figures' shadows), receives the sun's shadow and casts none.
//   BWHALM.build(spec)   (re)make the rings for a tier: { near: { r, k }, mid: { r, k } } (bewuchs.js picks it)
//   BWHALM.update(force, dt) list the tiles for the camera now (cheap when nothing moved); dt the frame's seconds (the camera's speed)
//   BWHALM.U             the shared uniforms (class table, mowing, orthophoto, day, density)
//   BWHALM.stats()       { rings: [{ tiles, blades, tris }], blades, tris, z }
import * as THREE from 'three';
import { cam, scene } from '../core/head.js';
import { markDirty, patchSV } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { WXWIND } from '../wetter/wx_wind.js';
import { BWKARTE } from './bw_karte.js';
import { BWPHAENO } from './bw_phaeno.js';
export const BWHALM = (() => {
  const S = { rings: [], spec: null, z: new Map(), zq: 0, last: null, err: '' };
  // ---------- uniforms shared by the rings ----------
  const KT = new THREE.DataTexture(
    new Float32Array(BWPHAENO.TW * 32 * 4),
    BWPHAENO.TW,
    32,
    THREE.RGBAFormat,
    THREE.FloatType
  );
  KT.magFilter = KT.minFilter = THREE.NearestFilter;
  KT.generateMipmaps = false;
  KT.needsUpdate = true;
  const one = new THREE.DataTexture(new Uint8Array([255, 128, 0, 255]), 1, 1, THREE.RGBAFormat);
  one.needsUpdate = true;
  const U = {
    tBwK: { value: KT },
    tBwM: { value: one },
    uBwM: { value: new THREE.Vector4(0, 0, 0, 0) }, // x0, y0, 1/w, 1/h of the mowing grid (0: none)
    tBwF: { value: one },
    uBwF: { value: new THREE.Vector4(0, 0, 0, 0) }, // orthophoto box (as world/ratscher.js: ex − e0, ey − n0, 1/w), w = on
    uBwAB: { value: new THREE.Vector2(1, 0) },
    uBwP: { value: new THREE.Vector4(150, 1, 0, 0) }, // day of year, density scale, snow lying (0–1), hoarfrost (0–1)
  };
  // ---------- the patch of one tile: K blades, each 5 vertices (near: two segments and the tip) or 3 (one triangle) ----------
  function mulberry(a) {
    return () => {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function patch(K, near, cap) {
    const V = near
        ? [
            [-1, 0],
            [1, 0],
            [-1, 0.45],
            [1, 0.45],
            [0, 1],
          ]
        : [
            [-1, 0],
            [1, 0],
            [0, 1],
          ],
      I = near ? [0, 1, 2, 1, 3, 2, 2, 3, 4] : [0, 1, 2],
      nv = V.length,
      R = mulberry(near ? 7331 + K : 9173 + K),
      // tufts: grass grows in clumps – C centres on a jittered grid, the blades of each around it, leaning out from it
      C = Math.max(1, Math.round(K / (near ? 6 : 3))),
      m = Math.ceil(Math.sqrt(C)),
      cen = [];
    for (let c = 0; c < C; c++) cen.push([((c % m) + R()) / m, ((Math.floor(c / m) % m) + R()) / m]);
    const pos = new Float32Array(K * nv * 3),
      aB = new Float32Array(K * nv * 4),
      aV = new Float32Array(K * nv * 3),
      idx = new Uint32Array(K * I.length);
    for (let b = 0; b < K; b++) {
      // a blade of tuft b % C: within ~4 cm (near) of its centre, facing out from it; the thresholds in random order (thinning takes
      // blades evenly, whole tufts last); rR the facing (0–1 of a turn)
      const [cx, cy] = cen[b % C],
        a = R() * 6.2832,
        rr = (near ? 0.045 : 0.07) * Math.sqrt(R()),
        bx = (((cx + Math.cos(a) * rr) % 1) + 1) % 1,
        by = (((cy + Math.sin(a) * rr) % 1) + 1) % 1,
        rT = R(),
        rH = R(),
        rR = ((a + (R() - 0.5) * 0.9) / 6.2832 + 1) % 1;
      for (let v = 0; v < nv; v++) {
        const o = b * nv + v;
        aB.set([bx, by, rT, rH], o * 4);
        aV.set([V[v][0], V[v][1], rR], o * 3);
      }
      for (let k = 0; k < I.length; k++) idx[b * I.length + k] = b * nv + I[k];
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aB', new THREE.BufferAttribute(aB, 4));
    g.setAttribute('aV', new THREE.BufferAttribute(aV, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    const iT = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4),
      iU = new THREE.InstancedBufferAttribute(new Float32Array(cap * 4), 4);
    iT.setUsage(THREE.DynamicDrawUsage);
    iU.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('iT', iT);
    g.setAttribute('iU', iU);
    g.instanceCount = 0;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    g.boundingBox = new THREE.Box3(new THREE.Vector3(-1e5, -1e5, -1e5), new THREE.Vector3(1e5, 1e5, 1e5));
    return { g, iT, iU, cap, tris: (I.length / 3) * K };
  }
  // ---------- the blade in the vertex shader ----------
  const VS = `uniform highp sampler2D tBwK, tBwG, tBwS, tBwM, tBwF;
uniform vec4 uBwG, uBwS, uBwM, uBwF, uBwR, uBwP, uBwQ;
uniform vec2 uBwAB;
uniform vec4 wxSw; uniform vec2 wxSwD; uniform vec2 wxGr;
attribute vec4 aB; attribute vec3 aV; attribute vec4 iT; attribute vec4 iU;
varying vec3 vBwC;
float bwHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float bwNoise( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );
  return mix( mix( bwHash( i ), bwHash( i + vec2( 1.0, 0.0 ) ), f.x ), mix( bwHash( i + vec2( 0.0, 1.0 ) ), bwHash( i + vec2( 1.0, 1.0 ) ), f.x ), f.y ); }
// the code (class | vigour << 5) at model point q: the site's (0.25 m) inside the modelled site, else the guide's (0.5 m)
float bwCode( vec2 q, out float site ) {
  vec2 s = ( q - uBwS.xy ) * uBwS.zw;
  site = 0.0;
  if ( s.x > 0.0 && s.y > 0.0 && s.x < 1.0 && s.y < 1.0 ) { site = 1.0; return floor( texture( tBwS, s ).r * 255.0 + 0.5 ); }
  vec2 g = ( q - uBwG.xy ) * uBwG.zw;
  if ( g.x <= 0.0 || g.y <= 0.0 || g.x >= 1.0 || g.y >= 1.0 ) return 0.0;
  return floor( texture( tBwG, g ).r * 255.0 + 0.5 );
}
float k0h( int c ) { return texelFetch( tBwK, ivec2( 0, c ), 0 ).y; }
// the height of class c at q today: the stand uncut this year, or what has grown since this field was cut (its days from its hash)
float bwHeight( int c, vec2 q ) {
  vec4 k0 = texelFetch( tBwK, ivec2( 0, c ), 0 ), k1 = texelFetch( tBwK, ivec2( 1, c ), 0 ), k4 = texelFetch( tBwK, ivec2( 4, c ), 0 );
  float hs = k0.y, doy = uBwP.x, g = k0.z;
  float sc = k1.x > 0.5 && k1.x < 12.0 ? 17.0 : 65.0;
  vec2 fw = q / sc + 0.4 * vec2( sin( q.y * 0.043 ), sin( q.x * 0.037 ) );
  vec2 fc = floor( fw ) + float( c ) * 7.13;
  float fh = bwHash( fc ), fs = bwHash( fc + 17.7 );
  float h = hs;
  if ( k1.x > 0.5 ) {
    // mown every k1.x days between k1.y and k1.z, this field on its own day
    float a = k1.y + ( fh - 0.5 ) * 4.0;
    h = min( hs, k0.x + g * max( mod( doy - a + fh * k1.x, k1.x ), 0.05 ) );
  } else if ( k1.y > 0.5 ) {
    // cut on up to three days (± spread per field), each on its share of the fields
    float off = ( fh - 0.5 ) * 2.0 * k1.w, last = -1.0;
    if ( doy >= k1.y + off && fs < k4.y ) last = k1.y + off;
    if ( k1.z > 0.5 && doy >= k1.z + off && fs < k4.z ) last = k1.z + off;
    if ( k4.x > 0.5 && doy >= k4.x + off && fs < k4.w ) last = k4.x + off;
    if ( last > 0.0 ) h = min( hs, k0.x + g * ( doy - last ) );
  }
  return h;
}
void bwBlade( out vec3 P, out vec3 N ) {
  float Sz = iU.z;
  vec2 t0 = iT.xy;
  float th = bwHash( t0 * 0.731 + 3.1 );
  vec2 b = aB.xy;
  int sy = int( th * 8.0 );
  if ( ( sy & 1 ) == 1 ) b = b.yx;
  if ( ( sy & 2 ) == 2 ) b.x = 1.0 - b.x;
  if ( ( sy & 4 ) == 4 ) b.y = 1.0 - b.y;
  vec2 q = t0 + b * Sz;
  float zr = mix( mix( iT.z, iT.w, b.x ), mix( iU.x, iU.y, b.x ), b.y );
  float rT = fract( aB.z + th * 7.31 ), rH = fract( aB.w + th * 3.17 ), rR = fract( aV.z + th * 5.13 );
  float site;
  float code = bwCode( q, site );
  int cls = int( mod( code, 32.0 ) );
  float vig = floor( code / 32.0 ) / 7.0;
  vec4 k2 = texelFetch( tBwK, ivec2( 2, cls ), 0 ), k3 = texelFetch( tBwK, ivec2( 3, cls ), 0 );
  float dens = k2.w * mix( 0.4, 1.0, vig ) * uBwP.y;
  vec3 col = k2.rgb;
  // the orthophoto at the foot (outside the modelled site): no blades where it is not green, the colour a little towards it
  if ( uBwF.w > 0.5 && site < 0.5 ) {
    vec2 uv = vec2( uBwAB.x * q.x - uBwAB.y * q.y + uBwF.x, uBwAB.y * q.x + uBwAB.x * q.y + uBwF.y ) * uBwF.z;
    if ( uv.x > 0.0 && uv.y > 0.0 && uv.x < 1.0 && uv.y < 1.0 ) {
      vec3 pc = texture( tBwF, uv ).rgb;
      float gr = clamp( ( pc.g - pc.r ) * 12.0 + 0.7, 0.0, 1.0 ), lp = dot( pc, vec3( 0.3, 0.59, 0.11 ) );
      dens *= smoothstep( 0.25, 0.8, gr ) * smoothstep( 0.012, 0.03, lp );
      col = mix( col, pc * ( dot( col, vec3( 0.3, 0.59, 0.11 ) ) / max( lp, 0.01 ) ), 0.3 );
    }
  }
  vec2 cm = vec2( cameraPosition.x, - cameraPosition.z );
  float d = distance( q, cm );
  // a ring comes and goes by thinning (blades drop out evenly), the outermost also by shrinking into the ground
  float fade = smoothstep( uBwR.x, uBwR.y, d ) * ( 1.0 - smoothstep( uBwR.z, uBwR.w, d ) );
  dens *= fade;
  float h = bwHeight( cls, q ) * mix( 0.55, 1.35, rH ) * mix( 0.72, 1.22, bwNoise( q * 0.37 + 5.3 ) );
  if ( uBwQ.x > 0.5 ) h *= smoothstep( 0.0, 0.5, fade );
  // snow lying (wetter/wetter.js): the short grass under it, the tall sticks out of it, bowed
  h = max( 0.0, h - 0.07 * uBwP.z ) * ( 1.0 - 0.3 * uBwP.z );
  float stripe = 0.0;
  if ( uBwM.z > 0.0 ) {
    vec2 mu = ( q - uBwM.xy ) * uBwM.zw;
    if ( mu.x > 0.0 && mu.y > 0.0 && mu.x < 1.0 && mu.y < 1.0 ) {
      vec4 mw = texture( tBwM, mu );
      h *= mix( 0.3, 1.0, mw.r );
      stripe = ( mw.g * 2.0 - 1.0 ) * ( 1.0 - mw.r );
    }
  }
  if ( cls == 0 || rT > dens || h < 0.004 ) { P = vec3( q.x, zr - 0.05, - q.y ); N = vec3( 0.0, 1.0, 0.0 ); vBwC = vec3( 0.0 ); return; }
  float a = rR * 6.2832;
  vec2 dir = vec2( cos( a ), sin( a ) ), sd = vec2( - dir.y, dir.x );
  float t = aV.y;
  float w = k3.x * mix( 0.75, 1.35, fract( rH * 7.3 ) ) * ( Sz > 1.5 ? 1.7 : 1.0 );
  float bend = k3.y * ( 0.45 + fract( rT * 13.1 ) );
  vec2 wd = vec2( wxSwD.x, - wxSwD.y );
  float al = dot( q, wd );
  float wave = 0.62 + 0.38 * sin( wxSw.z * 1.9 - al * 0.7 ) * sin( wxSw.z * 0.73 - al * 0.23 + 1.3 );
  float wb = wxGr.x * wave + wxGr.y * sin( wxSw.z * 8.3 + q.x * 3.7 + q.y * 2.9 );
  vec2 lean = dir * bend * 0.6 + wd * wb * 1.4;
  float ll = min( dot( lean, lean ), 1.0 );
  float zt = h * t * ( 1.0 - 0.3 * ll * t );
  vec2 xy = q + lean * h * t * t + sd * aV.x * w * ( 1.0 - 0.8 * t ) * 0.5;
  P = vec3( xy.x, zr + zt, - xy.y );
  // the blade's face, turned up a little more towards its tip (the light shades it blade by blade)
  // (a short sward faces the sky like the ground under it; tall grass stands, its sides shade it)
  float tall = smoothstep( 0.1, 0.5, h );
  N = normalize( mix( vec3( dir.x, 0.0, - dir.y ), vec3( 0.0, 1.0, 0.0 ), mix( 0.55, 0.22, tall ) + 0.28 * t ) );
  // a little variety, a few dry blades in tall grass, darker at the foot (the sward shades itself), the mower's stripe, seed heads
  col *= mix( 0.78, 1.14, fract( rH * 3.7 + th ) );
  float dry = step( 1.0 - ( k0h( cls ) > 0.2 ? 0.1 : 0.025 ), fract( rH * 11.3 + th * 2.1 ) );
  col = mix( col, vec3( 0.34, 0.29, 0.12 ), dry * 0.8 );
  col *= mix( mix( 0.45, 0.2, tall ), mix( 1.12, 1.0, tall ), smoothstep( 0.0, 0.85, t ) );
  col *= 1.0 + 0.14 * stripe;
  float seed = k3.w * step( 0.72, fract( rT * 5.3 ) ) * smoothstep( 0.72, 1.0, t );
  vBwC = mix( col, vec3( 0.3, 0.24, 0.17 ), seed * 0.7 );
  // hoarfrost on the tips, a little snow caught in tall grass
  vBwC = mix( vBwC, vec3( 0.7, 0.74, 0.79 ), max( uBwP.w, 0.6 * uBwP.z ) * smoothstep( 0.35, 1.0, t ) * 0.75 );
}
`;
  function material(tag, ringU) {
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0,
      side: THREE.DoubleSide,
      envMapIntensity: 0.6,
    });
    m.userData.leak = true;
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U, BWKARTE.U, ringU, {
        wxSw: WXWIND.U.wxSw,
        wxSwD: WXWIND.U.wxSwD,
        wxGr: WXWIND.UG.wxGr,
      });
      sh.vertexShader =
        VS +
        sh.vertexShader
          .replace('#include <beginnormal_vertex>', 'vec3 bwP; vec3 objectNormal; bwBlade( bwP, objectNormal );')
          .replace('#include <begin_vertex>', 'vec3 transformed = bwP;');
      sh.fragmentShader =
        'varying vec3 vBwC;\n' +
        sh.fragmentShader
          .replace('#include <color_fragment>', '#include <color_fragment>\n  diffuseColor.rgb *= vBwC;')
          .replace(
            '#include <normal_fragment_begin>',
            'float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;\n  vec3 normal = normalize( vNormal );\n  vec3 nonPerturbedNormal = normal;'
          );
    };
    m.customProgramCacheKey = () => 'bwhalm-' + tag;
    return patchSV(m);
  }
  // ---------- the rings ----------
  function makeRing(tag, near, K, r, rIn, size, cap) {
    const P = patch(K, near, cap),
      ringU = {
        uBwR: { value: new THREE.Vector4(0, 0, 0, 0) },
        uBwQ: { value: new THREE.Vector4(near ? 0 : 1, 0, 0, 0) },
      },
      mat = material(tag, ringU),
      mesh = new THREE.Mesh(P.g, mat);
    mesh.frustumCulled = false;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    mesh.userData.noMerge = true;
    mesh.name = 'bewuchs-' + tag;
    mesh.renderOrder = -1; // drawn early: the ground behind the blades is hidden sooner
    // fades: the dense ring and the near ring thin out over their last quarter; the ring beyond thins in where the near one thins out
    // and shrinks into the ground at its end (w: shrink as well)
    if (near) ringU.uBwR.value.set(-2, -1, r * 0.72, r);
    else ringU.uBwR.value.set(rIn * 0.72, rIn, r * 0.78, r);
    scene.add(mesh);
    return { tag, near, K, r, rIn, size, P, mesh, mat, ringU, n: 0, cx: NaN, cy: NaN, yaw: NaN, minH: near ? 0 : 0.1 };
  }
  function build(spec) {
    for (const R of S.rings) {
      scene.remove(R.mesh);
      R.P.g.dispose();
      R.mat.dispose();
    }
    S.rings = [];
    S.spec = spec;
    if (!spec) return;
    const cap = (r, s) => Math.ceil((Math.PI * (r + 1.5 * s) ** 2) / (s * s));
    S.rings.push(makeRing('dicht', true, spec.dense.k, spec.dense.r, 0, 1, cap(spec.dense.r, 1)));
    S.rings.push(makeRing('nah', true, spec.near.k, spec.near.r, 0, 1, cap(spec.near.r, 1)));
    S.rings.push(
      makeRing('mittel', false, spec.mid.k, spec.mid.r, spec.near.r, spec.mid.s, cap(spec.mid.r, spec.mid.s))
    );
    update(true);
    if (S.onBuild) S.onBuild(); // the flowers on the same tiles (bw_blume.js)
    markDirty();
  }
  // ---------- tile lists ----------
  const zKey = (i, j, s) => (i + 32768) * 65536 + (j + 32768) + s * 4294967296;
  function zAt(i, j, s) {
    const k = zKey(i, j, s);
    let z = S.z.get(k);
    if (z === undefined) {
      z = KERN.ground(i * s, j * s, -100);
      if (!Number.isFinite(z)) z = 0;
      S.z.set(k, z);
      S.zq++;
    }
    return z;
  }
  const hNow = new Float32Array(32);
  function heightsNow() {
    const doy = U.uBwP.value.x;
    for (let c = 0; c < 32; c++) {
      const k = BWPHAENO.K[c];
      if (!k || !(k.dens > 0)) {
        hNow[c] = 0;
        continue;
      }
      const hs = BWPHAENO.seasonH(k, doy);
      // a regularly mown sward is about its mown height (plus a cycle's growth); cut meadows may be either – the uncut height
      hNow[c] = k.mow && k.mow.every ? Math.min(hs, k.h0 + k.g * BWPHAENO.shapeAt(doy) * k.mow.every) : hs;
    }
  }
  // does anything that the ring draws grow in the tile at (x0, y0) of size s? (corners and middle)
  function tileOn(x0, y0, s, minH) {
    for (const [u, v] of [
      [0.5, 0.5],
      [0.1, 0.1],
      [0.9, 0.1],
      [0.1, 0.9],
      [0.9, 0.9],
    ]) {
      const c = BWKARTE.codeAt(x0 + u * s, y0 + v * s) & 31;
      if (c && hNow[c] > minH) return true;
    }
    return false;
  }
  const v3 = new THREE.Vector3();
  const list = [];
  function fill(R, cx, cy, fx, fy, cosH, camH) {
    const s = R.size,
      r = R.r,
      i0 = Math.floor((cx - r) / s),
      i1 = Math.floor((cx + r) / s),
      j0 = Math.floor((cy - r) / s),
      j1 = Math.floor((cy + r) / s),
      rIn = R.near ? 0 : R.rIn * 0.7 - s;
    list.length = 0;
    if (camH < (R.near ? 30 : 70))
      for (let i = i0; i <= i1; i++)
        for (let j = j0; j <= j1; j++) {
          const x0 = i * s,
            y0 = j * s,
            dx = x0 + s / 2 - cx,
            dy = y0 + s / 2 - cy,
            d = Math.hypot(dx, dy);
          if (d > r + s * 0.71 || d < rIn) continue;
          // in view: within the horizontal angle (with a margin), or close to the camera's foot
          if (d > 2.5 + s && (dx * fx + dy * fy) / d < cosH) continue;
          if (!tileOn(x0, y0, s, R.minH)) continue;
          list.push(d, i, j);
        }
    // nearest first (fewer pixels drawn twice)
    const n = list.length / 3,
      ord = new Array(n);
    for (let k = 0; k < n; k++) ord[k] = k;
    ord.sort((a, b) => list[a * 3] - list[b * 3]);
    const cap = Math.min(n, R.P.cap),
      T = R.P.iT.array,
      Uu = R.P.iU.array;
    for (let k = 0; k < cap; k++) {
      const q = ord[k] * 3,
        i = list[q + 1],
        j = list[q + 2],
        o = k * 4;
      T[o] = i * s;
      T[o + 1] = j * s;
      T[o + 2] = zAt(i, j, s);
      T[o + 3] = zAt(i + 1, j, s);
      Uu[o] = zAt(i, j + 1, s);
      Uu[o + 1] = zAt(i + 1, j + 1, s);
      Uu[o + 2] = s;
      Uu[o + 3] = 0;
    }
    R.P.iT.needsUpdate = true;
    R.P.iU.needsUpdate = true;
    R.P.g.instanceCount = cap;
    R.n = cap;
  }
  // the camera's speed (m/s, smoothed over the frames' time dt): driving fast, the dense ring is left out (nobody sees single blades
  // at 50 km/h). A jump of the camera (a new view, a teleport, the map) is no speed: it starts again from rest.
  const SP = { x: NaN, y: NaN, v: 0 };
  function update(force, dt) {
    if (!S.rings.length) return;
    const p = cam.position,
      cx = p.x,
      cy = -p.z;
    if (Number.isFinite(SP.x)) {
      const d = Math.hypot(cx - SP.x, cy - SP.y),
        t = Math.min(0.25, Math.max(0.008, dt || 0.016));
      if (d > 15 || d / t > 90) SP.v = 0;
      else SP.v += (d / t - SP.v) * Math.min(1, t * 4);
    }
    SP.x = cx;
    SP.y = cy;
    cam.getWorldDirection(v3);
    let fx = v3.x,
      fy = -v3.z;
    const fl = Math.hypot(fx, fy);
    if (fl < 1e-3) {
      fx = 0;
      fy = 1;
    } else {
      fx /= fl;
      fy /= fl;
    }
    const yaw = Math.atan2(fx, fy),
      // half the horizontal field of view, a margin for the blades' lean and the tiles' size
      hf = Math.atan(Math.tan(((cam.fov || 60) * Math.PI) / 360) * (cam.aspect || 1.6)) + 0.35,
      cosH = Math.cos(Math.min(Math.PI, hf)),
      camH = p.y - zAt(Math.floor(cx), Math.floor(cy), 1);
    let ch = false;
    for (const R of S.rings) {
      const mv = R.near ? 0.25 : 1.2,
        tw = R.near ? 0.05 : 0.08;
      let dy = Math.abs(yaw - R.yaw);
      if (dy > Math.PI) dy = 2 * Math.PI - dy;
      // with a little hysteresis (no flicker of the ring at the edge)
      const fast = R.tag === 'dicht' && SP.v > (R.fast ? 7 : 9);
      if (
        !force &&
        fast === !!R.fast &&
        Math.hypot(cx - R.cx, cy - R.cy) < mv &&
        dy < tw &&
        Math.abs(camH - R.camH) < 2
      )
        continue;
      R.fast = fast;
      R.cx = cx;
      R.cy = cy;
      R.yaw = yaw;
      R.camH = camH;
      fill(R, cx, cy, fx, fy, cosH, fast ? 1e9 : camH);
      ch = true;
    }
    // the lattice of heights: forget the far points now and then
    if (S.z.size > 60000) {
      for (const [k, z] of S.z) {
        const s = Math.floor(k / 4294967296),
          r = k - s * 4294967296,
          i = Math.floor(r / 65536) - 32768,
          j = (r % 65536) - 32768;
        if (Math.hypot(i * s - cx, j * s - cy) > 90) S.z.delete(k);
      }
    }
    if (ch) markDirty();
  }
  // the class table for a day (BWPHAENO) → the texture; the heights for the tile test
  function day(doy) {
    U.uBwP.value.x = doy;
    BWPHAENO.table(doy, KT.image.data);
    KT.needsUpdate = true;
    heightsNow();
    for (const R of S.rings) R.cx = NaN; // list again (a field may have come or gone)
    markDirty();
  }
  function stats() {
    const rings = S.rings.map(R => ({ tag: R.tag, tiles: R.n, blades: R.n * R.K, tris: R.n * R.P.tris, r: R.r }));
    return {
      rings,
      blades: rings.reduce((a, r) => a + r.blades, 0),
      tris: rings.reduce((a, r) => a + r.tris, 0),
      z: S.z.size,
      zq: S.zq,
      speed: +SP.v.toFixed(1),
    };
  }
  heightsNow();
  Object.assign(S, { build, update, day, stats, U, zAt });
  return S;
})();
if (typeof window !== 'undefined') window.BWHALM = BWHALM;
