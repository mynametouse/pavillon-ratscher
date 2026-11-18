// ===================== feat/fotorealismus (foto-gebaeude): walls that look built and lived in – weathering in the facade shader (GEBFOTO) =====================
// Falko (18.11.2026): „Fassaden mit Putzstruktur, Gebrauchsspuren und natürlichen Farbabweichungen … Sockel und Fundamente“ – and nothing
// „sterile“ or „gleichförmig“. Every wall of the world – Ratscher's village, the buildings of ETHOS in the square and in the cells of the
// world, Schleusingen, Kloster Veßra, Suhl, the shops – is drawn by ONE material, the facade shader of world/village.js (wallMat). This
// module holds what that shader gets on top, as GLSL the village pastes in at four places (marked lines there):
//   pars    uniforms, a hash, a noise with its slope, the globals handed from the colour to the normal and the light
//   wall    after the wall's own colour, before shutters, sills and openings: the house's own tone (hash of its id: lighter, darker,
//           greyer, warmer), large soft patches, a plinth band on every dwelling (render or sandstone – slate and half-timbering ran to the
//           ground), shade under the eaves, a little bleaching higher up, rain runs, dirt runs under the ends of the window sills, splash
//           and soil at the foot with a ragged edge, green on the damp north side – strongest on barns and sheds, least on new houses, one
//           house in five freshly done; old walls are not plane (a soft slope in the normal), boards each lean their own way
//   normal  the slope and the grain of the plaster (the normal map of the plaster photo the garden's walls use already – no new file)
//   light   a rough wall does not mirror the sky at grazing angles (three's GGX lobe gave every facade seen along a street a pale veil)
// Generic wear, not a survey: where the dirt sits follows from height, side and chance, not from photos of the single house.
// Cost: no geometry, no draw call; two samplers more in the one wall program (7 of 16): a 256² noise made here (0.35 MB with its mips, no
// file) and the plaster's normal map; per wall pixel three texture fetches and five hashes more. GEBFOTO.set(k) scales it all (0 = the
// walls as before, for comparing in one load); ?nofotogeb starts with 0.
import * as THREE from 'three';
import { ANISO, markDirty } from '../core/assets.js';
export const GEBFOTO = (() => {
  const off = new URLSearchParams(location.search).has('nofotogeb');
  const N = 256;
  // ---- the noise: four fields that tile, each smooth between its lattice points – r clouds (32, 16, 8 texels), g mottling (8, 4),
  // b speckle (2), a runs (2–4 texels wide, 32–64 tall). Sampled twice by the shader: 32 m and 6 m across ----
  function noiseTex() {
    const d = new Uint8Array(N * N * 4);
    let s = 20261118;
    const rnd = () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
    const layer = (cx, cy) => {
      const L = Float32Array.from({ length: cx * cy }, rnd);
      return (x, y) => {
        const fx = (x / N) * cx,
          fy = (y / N) * cy,
          ix = Math.floor(fx),
          iy = Math.floor(fy),
          i1 = (ix + 1) % cx,
          j1 = (iy + 1) % cy;
        let tx = fx - ix,
          ty = fy - iy;
        tx = tx * tx * (3 - 2 * tx);
        ty = ty * ty * (3 - 2 * ty);
        const a = L[iy * cx + ix],
          b = L[iy * cx + i1],
          c = L[j1 * cx + ix],
          e = L[j1 * cx + i1];
        return a + (b - a) * tx + (c - a) * ty + (a - b - c + e) * tx * ty;
      };
    };
    const CH = [
      [
        [layer(8, 8), 0.55],
        [layer(16, 16), 0.3],
        [layer(32, 32), 0.15],
      ],
      [
        [layer(32, 32), 0.6],
        [layer(64, 64), 0.4],
      ],
      [[layer(128, 128), 1]],
      [
        [layer(128, 4), 0.6],
        [layer(64, 8), 0.4],
      ],
    ];
    CH.forEach((ch, k) => {
      const f = new Float32Array(N * N);
      let m = 0,
        q = 0;
      for (let y = 0; y < N; y++)
        for (let x = 0; x < N; x++) {
          let v = 0;
          for (const [l, w] of ch) v += l(x, y) * w;
          f[y * N + x] = v;
          m += v;
        }
      m /= N * N;
      for (let i = 0; i < N * N; i++) q += (f[i] - m) * (f[i] - m);
      const sd = Math.sqrt(q / (N * N)) || 1;
      // mean 0.5, spread 0.2 for every field (the far mip levels end at 0.5: no effect, no flicker)
      for (let i = 0; i < N * N; i++)
        d[i * 4 + k] = Math.max(0, Math.min(255, Math.round(255 * (0.5 + (0.2 * (f[i] - m)) / sd))));
    });
    const t = new THREE.DataTexture(d, N, N, THREE.RGBAFormat);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = Math.min(4, ANISO);
    t.needsUpdate = true;
    return t;
  }
  const S = {
    on: !off,
    N,
    U: { uFoto: { value: off ? 0 : 1 }, tFgN: { value: noiseTex() }, tPlasN: { value: null } },
  };
  // the village hands in its texture helper (the plaster's normal map: tex/plaster_ext_nrm, loaded for the garden's walls anyway)
  S.uniforms = tex => {
    if (!S.U.tPlasN.value) S.U.tPlasN.value = tex('plaster_ext', 'nrm', false);
    return S.U;
  };
  S.pars = `
    uniform float uFoto; uniform sampler2D tFgN, tPlasN;
    float fgH( vec2 p ) { vec3 q = fract( vec3( p.xyx ) * 0.1031 ); q += dot( q, q.yzx + 33.33 ); return fract( ( q.x + q.y ) * q.z ); }   // a hash without sin: the same on every GPU
    vec3 fgNg( vec2 p ) { vec2 i = floor( p ), f = fract( p ), u = f * f * ( 3.0 - 2.0 * f ), du = 6.0 * f * ( 1.0 - f );   // value noise and its slope
      float a = fgH( i ), b = fgH( i + vec2( 1.0, 0.0 ) ), c = fgH( i + vec2( 0.0, 1.0 ) ), d = fgH( i + vec2( 1.0, 1.0 ) ), k = a - b - c + d;
      return vec3( a + ( b - a ) * u.x + ( c - a ) * u.y + k * u.x * u.y, du * vec2( b - a + k * u.y, c - a + k * u.x ) ); }
    vec2 gFgB = vec2( 0.0 ); float gFgG = 0.0;   // the wall's slope (along it, up), how much of the plaster's grain shows`;
  // inside the village's colour block: its locals c (the wall's colour so far), v (height above the foot), uF, vW (x: metres around the
  // footprint, z: the wall's top here), bid, st, sty, house/barn/shed/hall/school, plH, win, lo, hi, bi, fi, px, fw, aaF, aaW
  S.wall = `
        if ( uFoto > 0.001 ) {   // feat/fotorealismus (foto-gebaeude, gebaeude/geb_foto.js): weathering
          float fk = uFoto, b1 = mod( bid, 4093.0 ), h1 = fgH( vec2( b1, 3.7 ) ), h2 = fgH( vec2( b1, 11.1 ) ), h3 = fgH( vec2( b1, 23.9 ) );
          float age = ( st == 1.0 ? 0.4 : barn || shed ? 1.25 : hall ? 0.8 : school ? 0.6 : 0.9 ) * ( h3 < 0.2 ? 0.45 : 0.7 + 0.6 * h3 );   // how worn: new houses least, barns most, one in five freshly done
          vec2 wp = vec2( vW.x, v ) + 53.0 * vec2( h1, h2 ); vec4 n0 = texture2D( tFgN, wp / 32.0 ), n1 = texture2D( tFgN, wp / 6.0 );   // each wall its own place in the noise
          vec3 nW = inverseTransformDirection( normalize( vNormal ), viewMatrix ); float north = clamp( -nW.z, 0.0, 1.0 ), west = 0.6 + 0.4 * clamp( 0.3 * nW.z - 0.9 * nW.x, -1.0, 1.0 );   // x east, z south: damp side, weather side
          float up = vW.z - v, nearK = 1.0 - smoothstep( 0.03, 0.14, px );
          if ( house && plH > 0.0 ) {   // the plinth of this house: grey render, a lighter one, or sandstone blocks – also under slate and half-timbering
            vec3 pc = h2 < 0.45 ? vec3( 0.24, 0.23, 0.21 ) : h2 < 0.75 ? vec3( 0.33, 0.315, 0.285 ) : vec3( 0.37, 0.30, 0.21 );
            pc *= 0.84 + 0.32 * n1.g;
            if ( h2 >= 0.75 ) { float ch = plH > 0.5 ? plH * 0.5 : plH, row = floor( v / ch ), bu = uF / 0.62 + 0.5 * mod( row, 2.0 );
              pc *= 0.86 + 0.28 * fgH( vec2( floor( bu ) + b1, row ) );
              pc *= 1.0 - 0.45 * ( 1.0 - aaF ) * max( 1.0 - bnd( fract( bu ), 0.02, 0.98, fw.x / 0.62 ), 1.0 - bnd( fract( v / ch ), 0.04, 0.96, fw.y / ch ) ); }
            float pt = 1.0 - smoothstep( plH - max( fw.y, 0.003 ), plH + max( fw.y, 0.003 ), v );
            c = mix( c, pc * ( 0.8 + 0.2 * smoothstep( -0.3, 1.4, v ) ), min( fk, 1.0 ) * pt );
            c *= 1.0 - fk * 0.32 * bnd( v, plH - 0.03, plH + 0.004, max( fw.y, 0.004 ) ) * ( 1.0 - aaW ); }   // the shadow line under its edge
          float lum = dot( c, vec3( 0.3, 0.59, 0.11 ) );
          c = mix( c, vec3( lum ), fk * 0.22 * h2 );   // the house's own tone: greyer,
          c *= 1.0 + fk * ( ( h1 - 0.5 ) * 0.22 + vec3( 0.03, 0.0, -0.04 ) * ( fract( h3 * 7.31 ) - 0.5 ) );   // lighter or darker, warmer or cooler
          c *= 1.0 + fk * age * ( 0.26 * ( n0.r - 0.5 ) + 0.1 * ( n0.g - 0.5 ) + 0.07 * ( n1.g - 0.5 ) * nearK );   // large soft patches, mottling up close
          c *= 1.0 - fk * 0.12 * ( 1.0 - smoothstep( 0.0, 0.6, up ) );   // under the eaves and verges: shade, dust the rain does not reach
          c = mix( c, vec3( dot( c, vec3( 0.3, 0.59, 0.11 ) ) ) * 1.05, fk * 0.1 * age * smoothstep( 1.6, 4.5, v ) );   // bleached a little higher up
          c *= 1.0 - fk * age * west * 0.13 * smoothstep( 0.56, 0.8, n1.a ) * ( 0.4 + 1.2 * n0.a ) * smoothstep( 0.1, 0.7, up );   // rain runs, more on the weather side
          if ( win > 0.5 ) { float dy = lo.y - 0.08 - v;   // dirt runs under the ends of the sill, a fainter veil under its length
            if ( dy > 0.0 && dy < 1.6 ) { float wk = fgH( vec2( b1 + bi * 7.0, fi * 3.0 + 1.0 ) ), ew = max( 0.03, fw.x * 1.5 );
              float ends = max( bnd( uF, lo.x - 0.11, lo.x - 0.03, ew ), bnd( uF, hi.x + 0.03, hi.x + 0.11, ew ) ), under = bnd( uF, lo.x - 0.05, hi.x + 0.05, ew * 2.0 ) * smoothstep( 0.45, 0.8, n1.a );
              c *= 1.0 - fk * age * ( 0.25 + 0.75 * wk ) * ( 0.34 * ends * exp( -dy * 2.2 ) + 0.14 * under * exp( -dy * 3.5 ) ) * ( 1.0 - smoothstep( 0.06, 0.25, px ) ); } }
          float sh = max( 0.08, 0.14 + ( 0.18 + 0.3 * age ) * ( 0.5 + 1.6 * ( n1.r - 0.5 ) ) ), spl = ( 1.0 - smoothstep( 0.3 * sh, sh, v + 0.12 * ( n1.b - 0.5 ) * nearK ) ) * mix( 0.4, 1.0, smoothstep( -0.8, -0.15, v ) );   // splash and soil at the foot: how high it reaches changes along the wall
          c = mix( c, mix( c * 0.8, vec3( 0.13, 0.105, 0.075 ), 0.5 ), min( 1.0, fk * spl * ( 0.4 + 0.4 * age ) ) );
          float alg = north * age * ( 1.0 - smoothstep( 0.15, 0.45 + 1.0 * n0.g, v ) ) * smoothstep( 0.38, 0.62, n1.r );   // green where the wall stays damp
          c = mix( c, c * vec3( 0.62, 0.78, 0.5 ), min( 1.0, fk * 0.55 * alg ) );
          bool grain = !( sty == 2.0 || sty == 3.0 || barn || shed || hall || st == 9.0 ) || ( house && v < plH );
          gFgG = fk * ( grain ? 1.0 - aaF : 0.0 );
          if ( nearK > 0.0 ) { gFgB = fk * age * 0.035 * nearK * fgNg( wp * 1.7 ).yz;   // an old wall is not plane
            if ( ( barn || shed ) && !( st == 7.0 && v < 2.2 ) ) gFgB.x += fk * 0.08 * nearK * ( fgH( vec2( floor( uF / 0.2 ) + b1, 5.0 ) ) - 0.5 ); }   // boards lean each their own way
        }`;
  S.normal = `
          if ( uFoto > 0.001 ) {   // feat/fotorealismus (foto-gebaeude): the wall's slope and the plaster's grain (not on reveals, glass, doors)
            vec3 fgP = texture2D( tPlasN, vec2( vV.x, vW.y ) * 0.5 ).xyz * 2.0 - 1.0;
            if ( gNrmK < 0.5 ) { float fgK = 1.0 - gWin; vec3 fgT = normalize( vTanV ), fgU = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
              vec2 fgS = ( gFgB - fgP.xy * ( 1.6 * gFgG ) ) * fgK; normal = normalize( normal - fgT * fgS.x - fgU * fgS.y ); } }`;
  S.light = `
          reflectedLight.indirectSpecular *= mix( 1.0, mix( 0.4, 1.0, gWin * gGlass ), min( uFoto, 1.0 ) );   // feat/fotorealismus (foto-gebaeude): rough walls do not mirror the sky – glass does`;
  // 0 = the walls as before, 1 = weathered (more is possible: a run-down street)
  S.set = k => {
    S.U.uFoto.value = Math.max(0, +k || 0);
    S.on = S.U.uFoto.value > 0;
    markDirty(true);
    return S.U.uFoto.value;
  };
  S.state = () => ({ on: S.on, k: S.U.uFoto.value, noise: N, grain: !!(S.U.tPlasN.value && S.U.tPlasN.value.image) });
  return S;
})();
window.GEBFOTO = GEBFOTO;
