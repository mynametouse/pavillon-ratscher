// ===================== feat/fotorealismus (foto-gebaeude): walls that look built and lived in – weathering in the facade shader (GEBFOTO) =====================
// Falko (18.11.2026): „Fassaden mit Putzstruktur, Gebrauchsspuren und natürlichen Farbabweichungen … Sockel und Fundamente“ – and nothing
// „sterile“ or „gleichförmig“. Every wall of the world – Ratscher's village, the buildings of ETHOS in the square and in the cells of the
// world, Schleusingen, Kloster Veßra, Suhl, the shops – is drawn by ONE material, the facade shader of world/village.js (wallMat). This
// module holds what that shader gets on top, as GLSL the village pastes into its wall and roof shaders (marked lines there):
//   pars    uniforms, a hash, a noise with its slope, the globals handed from the colour to the normal and the light
//   wall    after the wall's own colour, before shutters, sills and openings: a plinth that reads from across the street (dwellings
//           0.45–0.9 m in dark or light render or sandstone blocks – slate and half-timbering ran to the ground –, the barns' masonry in
//           courses; a ledge that catches the light, a dark damp foot, splash dirt on the wall just above it), the house's own tone (hash of
//           its id: lighter, darker, greyer, warmer), large soft patches, each half-timber panel its own tone, shade under the eaves, a
//           little bleaching higher up, a few rain runs, dirt runs under the ends of the window sills, green on the damp north side –
//           strongest on barns and sheds, least on new houses, one house in four freshly done; plaster one can see: its grain (the normal
//           map of the plaster photo the garden's walls use already, twice: as it is and 3.5 times coarser) in the normal and in the
//           colour; old walls are not plane, boards each lean their own way; the sill looks up a little and throws the sun's shadow
//   open    inside an opening: the reveal shades window, door and gate as the sun stands (a dark band along the lintel and the jamb
//           towards the sun), less sky reaches in under the lintel and in the corners
//   normal  the slope and the grain; ledges and sills
//   light   a rough wall does not mirror the sky at grazing angles (three's GGX lobe gave every facade seen along a street a pale veil);
//           the sun's light times what the reveals and sills let through
//   roof    (the village's roof shader, the one material of every roof) clay tiles in rows one reads from the street, each row its
//           tone, weathering in soft patches, the north side darker with moss in patches
// Generic wear and generic parts, not a survey: where the dirt sits follows from height, side and chance, the plinth's height and
// material from the house's number – not from photos of the single house.
// Cost: no geometry, no draw call; two samplers more in the one wall program (7 of 16): a 256² noise made here (0.35 MB with its mips, no
// file) and the plaster's normal map, one more in the roof program (the noise, 8 of 16); per wall pixel four texture fetches and a few
// hashes more, per roof pixel two fetches. GEBFOTO.set(k) scales it all (0 = the
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
    t.anisotropy = Math.min(2, ANISO); // soft fields: little to gain from more
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
    // the wall's slope (along it, up); sills and ledges that face up a little; how much of the sun reaches the point (reveals and sills shade); the sun in the wall's frame (along, up, out)
    vec2 gFgB = vec2( 0.0 ); float gFgUp = 0.0, gFgSun = 1.0; vec3 gFgL = vec3( 0.0 );`;
  // inside the village's colour block: its locals c (the wall's colour so far), v (height above the foot), uF, vW (z: the wall's top
  // here), bid, st, sty, house/barn/shed/hall/school, plH, stH, sill, wh, win, lo, hi, bi, bc, fi, px, fw, aaF, aaW
  S.wall = `
        if ( uFoto > 0.001 ) {   // feat/fotorealismus (foto-gebaeude, gebaeude/geb_foto.js): the wall as built and weathered
          float fk = uFoto, f1 = min( fk, 1.0 ), b1 = mod( bid, 4093.0 ), h1 = fgH( vec2( b1, 3.7 ) ), h2 = fgH( vec2( b1, 11.1 ) ), h3 = fgH( vec2( b1, 23.9 ) ), h4 = fgH( vec2( b1, 31.3 ) );
          float age = ( st == 1.0 ? 0.4 : barn || shed ? 1.25 : hall ? 0.8 : school ? 0.6 : 0.8 ) * ( h3 < 0.25 ? 0.4 : 0.55 + 0.75 * h3 * h3 );   // how worn: new houses least, barns most; one house in four freshly done, few neglected
          vec3 fN = normalize( vNormal ), fT = normalize( vTanV ), fU = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz ), nW = inverseTransformDirection( fN, viewMatrix );
          float ws = dot( ( vec4( -vViewPosition, 0.0 ) * viewMatrix ).xyz + cameraPosition, ( vec4( fT, 0.0 ) * viewMatrix ).xyz );   // metres along the wall in the world: the same on a wall and on what another module lays over it (fassade's skins, split facades)
          vec2 wp = vec2( ws, v ) + 53.0 * vec2( h1, h2 ), wq = vec2( uF, v ); vec4 n0 = texture2D( tFgN, wp / 32.0 ), n1 = texture2D( tFgN, wp / 6.0 );   // each wall its own place in the noise: clouds, mottling
          vec3 pa = texture2D( tPlasN, wq * 0.5 ).xyz * 2.0 - 1.0, pb = texture2D( tPlasN, wq * 0.143 + vec2( 0.37, 0.61 ) ).xyz * 2.0 - 1.0;   // the plaster's grain: as the photo has it, and three and a half times coarser (rough cast, seen from the street)
          float north = clamp( -nW.z, 0.0, 1.0 ), west = 0.6 + 0.4 * clamp( 0.3 * nW.z - 0.9 * nW.x, -1.0, 1.0 );   // x east, z south: damp side, weather side
          #if NUM_DIR_LIGHTS > 0
            gFgL = vec3( dot( directionalLights[ 0 ].direction, fT ), dot( directionalLights[ 0 ].direction, fU ), dot( directionalLights[ 0 ].direction, fN ) );   // the sun (the scene's one directional light)
          #endif
          float up = vW.z - v, nearK = 1.0 - smoothstep( 0.03, 0.14, px );
          // ---- the plinth: a band of its own material that reads from across the street – dwellings 0.45–0.9 m in render or sandstone (also under slate and half-timbering, which ran to the ground), the barns' masonry in courses ----
          float pT = house ? ( plH > 0.0 ? plH + 0.1 + 0.2 * h4 : 0.0 ) : st == 7.0 ? 2.2 : barn || shed ? 0.45 : hall ? 0.5 : 0.0; bool inP = v < pT;
          if ( house && pT > 0.0 ) {
            vec3 pc = h2 < 0.45 ? vec3( 0.2, 0.19, 0.175 ) : h2 < 0.75 ? vec3( 0.3, 0.285, 0.26 ) : vec3( 0.35, 0.28, 0.19 );   // dark grey render, a lighter one, sandstone
            pc *= 0.8 + 0.4 * n1.g;
            if ( h2 >= 0.75 ) { float ch = pT > 0.62 ? pT * 0.5 : pT, row = floor( v / ch ), bu = ws / 0.62 + 0.5 * mod( row, 2.0 );
              pc *= 0.84 + 0.32 * fgH( vec2( floor( bu ) + b1, row ) );
              pc *= 1.0 - 0.5 * ( 1.0 - aaF ) * max( 1.0 - bnd( fract( bu ), 0.02, 0.98, fw.x / 0.62 ), 1.0 - bnd( fract( v / ch ), 0.04, 0.96, fw.y / ch ) ); }
            c = mix( c, pc * ( 0.8 + 0.2 * smoothstep( -0.3, 1.4, v ) ), f1 * ( 1.0 - smoothstep( pT - max( fw.y, 0.003 ), pT + max( fw.y, 0.003 ), v ) ) ); }
          else if ( st == 7.0 && inP ) { float row = floor( v / 0.28 ), bu = ws / 0.55 + 0.5 * mod( row, 2.0 );
            c *= 1.0 + f1 * ( 0.3 * ( fgH( vec2( floor( bu ) + b1, row ) ) - 0.5 ) - 0.4 * ( 1.0 - aaF ) * max( 1.0 - bnd( fract( bu ), 0.03, 0.97, fw.x / 0.55 ), 1.0 - bnd( fract( v / 0.28 ), 0.06, 0.94, fw.y / 0.28 ) ) ); }
          if ( pT > 0.0 ) { float led = bnd( v, pT - 0.045, pT, max( fw.y, 0.004 ) ) * ( 1.0 - aaW );   // its ledge: a face that looks up a little – it catches the light, a clear line from afar
            gFgUp = f1 * led; c *= 1.0 + f1 * 0.1 * led; c *= 1.0 - f1 * 0.22 * bnd( v, pT - 0.11, pT - 0.045, max( fw.y, 0.006 ) ) * ( 1.0 - aaW ); }
          c *= 1.0 - f1 * 0.36 * ( 1.0 - smoothstep( -0.05, 0.32, v ) );   // the foot stays damp: dark at the ground
          float lum = dot( c, vec3( 0.3, 0.59, 0.11 ) );
          c = mix( c, vec3( lum ), fk * 0.22 * h2 );   // the house's own tone: greyer,
          c *= 1.0 + fk * ( ( h1 - 0.5 ) * 0.24 + vec3( 0.03, 0.0, -0.04 ) * ( fract( h3 * 7.31 ) - 0.5 ) );   // lighter or darker, warmer or cooler
          c *= 1.0 + fk * age * ( 0.34 * ( n0.r - 0.5 ) + 0.16 * ( n0.g - 0.5 ) + 0.1 * ( n1.g - 0.5 ) * nearK );   // large soft patches, mottling up close
          if ( sty == 5.0 || sty == 6.0 ) { float flv = mod( v - plH, stH ), zone = flv < sill ? 0.0 : flv < sill + wh ? 1.0 : 2.0;   // half-timbering: every panel was filled and limewashed by itself
            c *= 1.0 + fk * 0.1 * ( 0.4 + age ) * ( fgH( vec2( bi * 4.0 + step( bc, uF ) + b1, fi * 3.0 + zone ) ) - 0.5 ); }
          c *= 1.0 - fk * 0.14 * ( 1.0 - smoothstep( 0.0, 0.6, up ) );   // under the eaves and verges: shade, dust the rain does not reach
          c = mix( c, vec3( dot( c, vec3( 0.3, 0.59, 0.11 ) ) ) * 1.05, fk * 0.1 * age * smoothstep( 1.6, 4.5, v ) );   // bleached a little higher up
          c *= 1.0 - fk * max( age - 0.3, 0.0 ) * west * ( barn || shed || hall ? 0.2 : 0.13 ) * smoothstep( 0.6, 0.84, n1.a ) * smoothstep( 0.5, 0.72, n0.a + 0.5 * ( n0.r - 0.5 ) ) * smoothstep( 0.1, 0.7, up );   // rain runs: here and there, on worn walls, more on the weather side
          if ( win > 0.5 ) { float sx = bnd( uF, lo.x - 0.07, hi.x + 0.07, fw.x ), dy = lo.y - 0.08 - v;
            gFgUp = max( gFgUp, f1 * sx * bnd( v, lo.y - 0.06, lo.y, fw.y ) * ( 1.0 - aaW ) );   // the sill catches the light,
            if ( gFgL.z > 0.03 && gFgL.y > 0.0 ) { float ls = min( 0.32, 0.055 * gFgL.y / gFgL.z ), ox = 0.055 * gFgL.x / gFgL.z;   // and throws a shadow as long as the sun stands steep to this wall
              gFgSun = 1.0 - f1 * bnd( uF + ox, lo.x - 0.07, hi.x + 0.07, max( fw.x, 0.012 ) ) * bnd( v, lo.y - 0.06 - ls, lo.y - 0.05, max( fw.y, 0.008 ) ) * ( 1.0 - aaW ); }
            if ( dy > 0.0 && dy < 1.6 ) { float wk = fgH( vec2( b1 + bi * 7.0, fi * 3.0 + 1.0 ) ), ew = max( 0.03, fw.x * 1.5 );   // dirt runs under the ends of the sill, a fainter veil under its length
              float ends = max( bnd( uF, lo.x - 0.11, lo.x - 0.03, ew ), bnd( uF, hi.x + 0.03, hi.x + 0.11, ew ) ), under = bnd( uF, lo.x - 0.05, hi.x + 0.05, ew * 2.0 ) * smoothstep( 0.45, 0.8, n1.a );
              c *= 1.0 - fk * age * ( 0.25 + 0.75 * wk ) * ( 0.3 * ends * exp( -dy * 2.4 ) + 0.12 * under * exp( -dy * 3.5 ) ) * ( 1.0 - smoothstep( 0.06, 0.25, px ) ); } }
          float sh = max( 0.1, 0.2 + ( 0.25 + 0.35 * age ) * ( 0.5 + 1.6 * ( n1.r - 0.5 ) ) ), spl = ( 1.0 - smoothstep( 0.3 * sh, sh, v + 0.12 * ( n1.b - 0.5 ) * nearK ) ) * mix( 0.4, 1.0, smoothstep( -0.8, -0.15, v ) );   // splash and soil at the foot: how high it reaches changes along the wall
          if ( house && pT > 0.0 ) spl = max( spl, 0.85 * ( 1.0 - smoothstep( 0.0, 0.6 * sh, v - pT + 0.08 * ( n1.b - 0.5 ) * nearK ) ) * step( pT, v ) );   // and on the wall just above the plinth, where the rain splashes off its ledge
          c = mix( c, mix( c * 0.8, vec3( 0.13, 0.105, 0.075 ), 0.5 ), min( 1.0, fk * spl * ( 0.15 + 0.6 * age ) ) );
          float alg = north * age * ( 1.0 - smoothstep( 0.15, 0.45 + 1.0 * n0.g, v ) ) * smoothstep( 0.38, 0.62, n1.r );   // green where the wall stays damp
          c = mix( c, c * vec3( 0.62, 0.78, 0.5 ), min( 1.0, fk * 0.55 * alg ) );
          // ---- plaster one can see: the grain in the normal (the sun rakes over it) and, as the sky lights it from above, in the colour (so it shows in the shade too); the plinth rougher ----
          bool grain = ( inP && pT > 0.0 ) || !( sty == 2.0 || sty == 3.0 || barn || shed || hall || st == 9.0 );
          float gA = grain ? ( inP ? 1.6 : 1.0 ) : 0.0, gF = gA * ( 1.0 - aaF ), gC = gA * ( 1.0 - smoothstep( 0.02, 0.09, px ) );
          c *= 1.0 + fk * ( gF * ( 0.8 * pa.y + 0.4 * pa.x ) + gC * ( 0.65 * pb.y + 0.25 * pb.x ) );
          gFgB = -fk * ( 1.7 * gF * pa.xy + 1.2 * gC * pb.xy );
          if ( nearK > 0.0 ) { gFgB += fk * age * 0.035 * nearK * fgNg( wp * 1.7 ).yz;   // an old wall is not plane
            if ( ( barn || shed ) && !inP ) gFgB.x += fk * 0.08 * nearK * ( fgH( vec2( floor( uF / 0.2 ) + b1, 5.0 ) ) - 0.5 ); }   // boards lean each their own way
        }`;
  // inside the village's opening block, after window, door or gate are painted (its locals p, q, sl2, dep, tU, tV, lo, hi, inWin, Tv, Uv, Nv):
  // the opening has depth for the light too – the reveal shades what lies behind the wall's face, less sky reaches in under the lintel
  S.open = `
          if ( uFoto > 0.001 ) {   // feat/fotorealismus (foto-gebaeude): the sun and the sky in the reveal
            bool fRev = gNrmK > 0.5; float fD = fRev ? min( tU, tV ) : dep, f1 = min( uFoto, 1.0 ), fS = 1.0; vec2 fP = p + sl2 * fD;   // the point seen: fD metres behind the wall's face
            if ( gFgL.z > 0.03 ) { vec2 e = fP + gFgL.xy / gFgL.z * fD; float sw = max( 0.012, 0.8 * max( fw.x, fw.y ) );   // where its way to the sun leaves the wall's face: through the opening, or the wall shades it
              float inU = bnd( e.x, lo.x, hi.x, sw ), inV = bnd( e.y, lo.y, hi.y, sw );
              fS = fRev ? ( tU < tV ? inV * step( lo.x - 0.002, e.x ) * step( e.x, hi.x + 0.002 ) : inU * step( lo.y - 0.002, e.y ) * step( e.y, hi.y + 0.002 ) ) : inU * inV; }
            gFgSun *= mix( 1.0, fS, inWin * f1 );
            float eT = max( hi.y - fP.y, 0.0 ), eS = max( min( fP.x - lo.x, hi.x - fP.x ), 0.0 ), fA = min( 1.4, fD / 0.15 );
            c *= 1.0 - inWin * f1 * ( fRev ? 0.5 : 1.0 ) * min( 0.6, fA * ( 0.4 * exp( -eT / 0.08 ) + 0.24 * exp( -eS / 0.05 ) ) ); }`;
  // inside the village's roof block (its locals k: kind, col, p: metres along the eave and up the slope, px, rc): tiles in rows one can
  // read from the street, each row a little different, weathering in soft patches, the north side darker and mossy in patches
  S.roof = `
          if ( uFoto > 0.001 && k < 4.5 ) {   // feat/fotorealismus (foto-gebaeude, gebaeude/geb_foto.js): the roof's faces
            float f1 = min( uFoto, 1.0 ); vec2 rb = floor( col.rg * 255.0 + 0.5 ); float r1 = fgH( rb ), r2 = fgH( rb + 17.0 );   // the roof's own number: its colour in the aerial photo
            vec2 rp = p + 61.0 * vec2( r1, r2 ); vec4 m0 = texture2D( tFgN, rp / 32.0 ), m1 = texture2D( tFgN, rp / 6.0 );
            vec3 nW = inverseTransformDirection( normalize( vNormal ), viewMatrix ); float nrt = smoothstep( 0.08, 0.45, -nW.z ), fFar = 1.0 - smoothstep( 0.12, 0.3, px );   // z south: a face that looks north
            if ( k < 0.5 ) { float ry = p.y / 0.325, row = floor( ry ), fy = fract( ry ), wl = max( fwidth( ry ), 0.02 );   // clay tiles: eight rows on the photo's 2.6 m – each row's butt end faces whoever looks up from the street, the wider the flatter the look
              float ndv = abs( dot( normalize( vNormal ), normalize( vViewPosition ) ) ), du = clamp( 0.062 * sqrt( 1.0 - ndv * ndv ) / max( ndv, 0.05 ), 0.03, 0.42 );
              float line = mix( 1.0 - bnd2( fy, du, 0.96, wl ), du + 0.04, smoothstep( 0.3, 0.8, wl ) );
              rc *= 1.0 - f1 * 0.42 * line * fFar; rc *= 1.0 + f1 * fFar * ( 0.14 * ( fgH( vec2( row, rb.x + rb.y ) ) - 0.5 ) + 0.06 * ( fy - 0.5 ) * ( 1.0 - smoothstep( 0.3, 0.8, wl ) ) ); }   // each row a little different, lighter towards its lower end
            rc *= 1.0 + f1 * ( 0.24 * ( m0.r - 0.5 ) + 0.12 * ( m0.g - 0.5 ) );   // weathered in large soft patches
            rc *= 1.0 - f1 * 0.14 * nrt;   // the north side stays damp: darker, and moss in patches (little on sheet metal)
            rc = mix( rc, rc * vec3( 0.6, 0.72, 0.36 ), f1 * 0.6 * nrt * smoothstep( 0.5, 0.72, m0.g + 0.6 * ( m1.r - 0.5 ) ) * ( k > 1.5 && k < 2.5 ? 0.3 : 1.0 ) ); }`;
  S.roofPars = `
    float bnd2( float x, float a, float b, float w ) { return clamp( ( x - a ) / w + 0.5, 0.0, 1.0 ) - clamp( ( x - b ) / w + 0.5, 0.0, 1.0 ); }   // 1 in [a, b], edges soft over w`;
  S.normal = `
          if ( uFoto > 0.001 && gNrmK < 0.5 ) {   // feat/fotorealismus (foto-gebaeude): the wall's slope and grain; sills and ledges look up a little (not on reveals, glass, doors)
            float fgK = 1.0 - gWin; vec3 fgT = normalize( vTanV ), fgU = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
            normal = normalize( normal - ( fgT * gFgB.x + fgU * gFgB.y ) * fgK + fgU * ( 0.9 * gFgUp * fgK ) ); }`;
  S.light = `
          reflectedLight.indirectSpecular *= mix( 1.0, mix( 0.4, 1.0, gWin * gGlass ), min( uFoto, 1.0 ) );   // feat/fotorealismus (foto-gebaeude): rough walls do not mirror the sky – glass does
          reflectedLight.directDiffuse *= gFgSun; reflectedLight.directSpecular *= gFgSun;   // the sun as it reaches into reveals and under sills`;
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
