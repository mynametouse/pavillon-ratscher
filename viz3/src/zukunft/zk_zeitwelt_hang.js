// ===================== feat/zeitreise-welt: the forested slopes around the village follow the chronicle's forest (ZKHANG) =====================
// Falko 13.11.2026: a slight colour shift of the crowns „macht kaum etwas mit dem Bewusstsein der Menschen“ – so every spruce slope seen
// from the village changes, in patches like beetle nests, not as a tint: green → red-brown → grey snags → cleared (brown slash, greening
// with the years) or fallen → young growth (pioneers: birch, rowan, spruce; or the planted mix: beech, maple, fir).
// Where: (1) the 21 000 trees of the canopy height model drawn as far cards (world/ratscher.js; `con` = conifer) – a per-instance jitter
// attribute and a patch field decide each spruce's stage in the vertex shader (collapsed when cleared or fallen, small and of another kind
// when young); (2) the terrain's orthophoto (world/ratscher.js terrain shader, geoCol) – dark forest pixels outside the village take the
// stage's ground colour, so the hills beyond the tree data (out to 12 km) and the ground under cleared cards change alike; (3) the
// forest at the Klinge (world/forest.js, near trees) through the first version (zukunft/zk_welt.js forest stages, ZKWELT.apply).
// The stage of a place: rank r = patch field (three octaves of value noise, ~100 m nests) + jitter; the state's shares, cumulative in the
// order young, cleared, fallen, grey, red, are turned into rank thresholds by the measured distribution of r over the conifer cards – so the
// shares on screen are the chronicle's shares. The oldest nests lie inside (young, cleared), the fresh red at their margins – as an
// outbreak spreads from its nests.
// Split: both materials take their uniforms per render from the camera's layers (layer 22 without 21 = the right world) – one program
// each, compiled in warm() (the materials are patched at run time: no hook in ratscher.js, the key gets a suffix); nothing per frame but
// eight numbers. clear() switches the uniforms off (the patched programs stay; off they draw exactly as before).
import * as THREE from 'three';
import { markDirty } from '../core/assets.js';
import { warmUp } from '../render/render.js';
import { scene } from '../core/head.js';

export const ZKHANG = (() => {
  const G = w => window[w];
  const NH = 12; // holes: circles around the village's buildings (dark roofs and shadows in the photo are not forest)
  const U = {
    uZkOn: { value: 0 },
    uZkT: { value: new THREE.Vector4(-1, -1, -1, -1) }, // rank thresholds: young, cleared, fallen, grey (cumulative)
    uZkT2: { value: new THREE.Vector4(-1, 0, 0, 0) }, // red threshold, young height (m), pioneer 1 / mixed 0, debug (1 mask, 2 stages)
    uZkM: { value: new THREE.Vector4(0.075, 0.105, 0.06, 0) }, // forest by the photo: dark below x…y (albedo), mean albedo z
    uZkHole: { value: Array.from({ length: NH }, () => new THREE.Vector3(0, 0, 0)) },
    // early nests (x, y, radius): the first big clearing with the planting and the turbine's clearing on the ridge (zk_zeitwelt_dinge.js)
    uZkSeed: { value: [new THREE.Vector3(120, -980, 95), new THREE.Vector3(230, -1290, 115)] },
  };
  const SEEDS = U.uZkSeed.value;
  const S = {
    ready: false,
    patched: false,
    err: null,
    Q: null,
    side: { L: null, R: null },
    n: 0,
    cards: 0,
    con: 0,
    holes: [],
  };
  // ---------- the patch field: identical in GLSL and JS (Dave Hoskins' hash without sine, value noise) ----------
  const GLSL = `uniform float uZkOn; uniform vec4 uZkT, uZkT2, uZkM; uniform vec3 uZkHole[ ${NH} ]; uniform vec3 uZkSeed[ 2 ];
    float zkH( vec2 p ) { vec3 p3 = fract( vec3( p.xyx ) * 0.1031 ); p3 += dot( p3, p3.yzx + 33.33 ); return fract( ( p3.x + p3.y ) * p3.z ); }
    float zkN( vec2 p ) { vec2 i = floor( p ), f = fract( p ), u = f * f * ( 3.0 - 2.0 * f );
      return mix( mix( zkH( i ), zkH( i + vec2( 1.0, 0.0 ) ), u.x ), mix( zkH( i + vec2( 0.0, 1.0 ) ), zkH( i + vec2( 1.0, 1.0 ) ), u.x ), u.y ); }
    // three octaves, each turned (37°, −61°, 13°), on a slowly warped plane: irregular stands, no squares of the noise's grid
    float zkRank( vec2 p ) {
      vec2 q = p + 70.0 * vec2( zkN( p * 0.004 + vec2( 11.0, 3.0 ) ), zkN( p * 0.004 - vec2( 7.0, 5.0 ) ) );
      float r = 0.6 * zkN( mat2( 0.7986, 0.6018, -0.6018, 0.7986 ) * q * 0.0105 + vec2( 3.7, 1.9 ) )
              + 0.3 * zkN( mat2( 0.4848, -0.8746, 0.8746, 0.4848 ) * q * 0.032 + vec2( -1.3, 7.1 ) )
              + 0.1 * zkN( mat2( 0.9744, 0.225, -0.225, 0.9744 ) * q * 0.11 );
      for ( int i = 0; i < 2; i++ ) { vec2 d = ( p - uZkSeed[ i ].xy ) / uZkSeed[ i ].z; r -= 0.42 * exp( - dot( d, d ) * 1.6 ); }
      return r; }
    // 0 green, 1 red, 2 grey, 3 fallen, 4 cleared, 5 young
    float zkStage( float r ) { return r >= uZkT2.x ? 0.0 : r >= uZkT.w ? 1.0 : r >= uZkT.z ? 2.0 : r >= uZkT.y ? 3.0 : r >= uZkT.x ? 4.0 : 5.0; }
  `;
  const fr = x => x - Math.floor(x);
  function zkH(x, y) {
    let a = fr(x * 0.1031),
      b = fr(y * 0.1031),
      c = fr(x * 0.1031);
    const d = a * (b + 33.33) + b * (c + 33.33) + c * (a + 33.33);
    a += d;
    b += d;
    c += d;
    return fr((a + b) * c);
  }
  function zkN(x, y) {
    const ix = Math.floor(x),
      iy = Math.floor(y),
      fx = x - ix,
      fy = y - iy,
      ux = fx * fx * (3 - 2 * fx),
      uy = fy * fy * (3 - 2 * fy);
    const a = zkH(ix, iy),
      b = zkH(ix + 1, iy),
      c = zkH(ix, iy + 1),
      d = zkH(ix + 1, iy + 1);
    return a + (b - a) * ux + (c + (d - c) * ux - (a + (b - a) * ux)) * uy;
  }
  const rot = (x, y, c, sn) => [c * x - sn * y, sn * x + c * y];
  const rank = (x, y) => {
    const qx = x + 70 * zkN(x * 0.004 + 11, y * 0.004 + 3),
      qy = y + 70 * zkN(x * 0.004 - 7, y * 0.004 - 5);
    const a = rot(qx * 0.0105, qy * 0.0105, 0.7986, 0.6018),
      b = rot(qx * 0.032, qy * 0.032, 0.4848, -0.8746),
      c = rot(qx * 0.11, qy * 0.11, 0.9744, 0.225);
    let r = 0.6 * zkN(a[0] + 3.7, a[1] + 1.9) + 0.3 * zkN(b[0] - 1.3, b[1] + 7.1) + 0.1 * zkN(c[0], c[1]);
    for (const s of SEEDS) {
      const dx = (x - s.x) / s.z,
        dy = (y - s.y) / s.z;
      r -= 0.42 * Math.exp(-(dx * dx + dy * dy) * 1.6);
    }
    return r;
  };
  // the ground's own jitter (terrain shader: 0.12 · noise at 3 m); the cards' is a hash per tree
  const jitG = (x, y) => zkN(x * 0.33 + 5, y * 0.33 + 5);
  const jit = (x, y) => zkH(x * 3.1 + 17.3, y * 2.7 - 5.1);
  // ---------- far cards (world/ratscher.js: crossed cards with an atlas of five trees, kind 4 = the conifer) ----------
  const VS_HEAD = `attribute float aZk; varying float vZkS; varying float vZkA;
    float zkSc = 1.0, zkKd = 0.0;
    void zkPrep( float kind ) {
      zkKd = kind; vZkS = 0.0; vZkA = 0.0; zkSc = 1.0;
      if ( uZkOn < 0.5 || aZk < 0.0 ) return;
      #ifdef USE_INSTANCING
      vec2 zp = vec2( instanceMatrix[ 3 ].x, - instanceMatrix[ 3 ].z );
      float H = length( instanceMatrix[ 1 ].xyz );
      #else
      vec2 zp = vec2( 0.0 ); float H = 20.0;
      #endif
      float r = 0.88 * zkRank( zp ) + 0.12 * aZk, s = zkStage( r );
      vZkS = s; vZkA = aZk;
      if ( s > 2.5 && s < 4.5 ) zkSc = 0.0;   // fallen or cleared: no crown left standing (the ground shows it)
      if ( s > 4.5 ) {                        // young: of its own kind, as high as the young stand
        zkSc = clamp( uZkT2.y / max( H, 1.0 ), 0.0, 1.0 ); if ( zkSc < 0.1 ) zkSc = 0.0;
        zkKd = uZkT2.z > 0.5 ? ( aZk < 0.55 ? 3.0 : 4.0 ) : ( aZk < 0.3 ? 2.0 : aZk < 0.55 ? 1.0 : 4.0 );
      }
    }
  `;
  const FS_HEAD = `varying float vZkS; varying float vZkA;
`; // (the line must end: three's shader goes on with #define)
  const FS_TINT = `
    if ( vZkS > 0.5 ) {
      float zl = dot( diffuseColor.rgb, vec3( 0.3, 0.55, 0.15 ) );
      if ( vZkS < 1.5 ) diffuseColor.rgb = vec3( 0.5, 0.15, 0.035 ) * ( 0.6 + 3.0 * zl );                                    // rust red
      else if ( vZkS < 2.5 ) { diffuseColor.rgb = vec3( 0.44, 0.44, 0.42 ) * ( 0.7 + 2.5 * zl ); diffuseColor.a *= 0.55 + 0.3 * vZkA; } // silver-grey, thin
      else if ( vZkS > 4.5 ) diffuseColor.rgb *= uZkT2.z > 0.5 ? vec3( 1.05, 1.18, 0.8 ) : vec3( 0.95, 1.08, 0.9 );          // young
      if ( uZkT2.w > 1.5 ) diffuseColor.rgb = vZkS < 1.5 ? vec3( 0.8, 0.1, 0.0 ) : vZkS < 2.5 ? vec3( 0.6 ) : vec3( 0.1, 0.9, 0.2 );
    }`;
  function patchCards(orig) {
    if (S.mat) return S.mat;
    const mat = orig.clone(),
      ob = orig.onBeforeCompile;
    mat.name = 'zeitreise geotree';
    mat.onBeforeCompile = (sh, r) => {
      ob.call(orig, sh, r);
      Object.assign(sh.uniforms, U);
      let vs = sh.vertexShader;
      vs = vs.replace('void main() {', 'void main() {\n zkPrep( aKind );');
      vs = vs.replace('( aKind + vMapUv.x )', '( zkKd + vMapUv.x )');
      vs = vs.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed *= zkSc;');
      sh.vertexShader = GLSL + VS_HEAD + vs;
      sh.fragmentShader =
        GLSL + FS_HEAD + sh.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\n' + FS_TINT);
      if (!/zkPrep\( aKind \)/.test(sh.vertexShader) || !/zkKd \+ vMapUv/.test(sh.vertexShader))
        S.err = 'cards: shader anchors not found';
    };
    const key = orig.customProgramCacheKey ? orig.customProgramCacheKey() : 'geotree';
    mat.customProgramCacheKey = () => key + '-zk';
    S.mat = mat;
    S.orig = orig;
    return mat;
  }
  // the cards wear the patched copy while the slopes are on, their own material otherwise
  function wear(on) {
    const RT = G('RATSCHER');
    if (!RT || !RT.trees || !S.mat || S.worn === on) return;
    for (const im of RT.trees) im.material = on ? S.mat : S.orig;
    S.worn = on;
  }
  // ---------- terrain (world/ratscher.js terrainMat: geoCol is the orthophoto as albedo) ----------
  const TERRAIN = `
    vec3 zkSlope( vec2 p, vec3 c ) {
      if ( uZkOn < 0.5 ) return c;
      float l = dot( c, vec3( 0.3, 0.55, 0.15 ) );
      // is it forest? asked of the 10 km photo a few mip levels up (stands, not single crowns), the 24 km one beyond it
      vec2 uO = gUV( p, bGO );
      vec3 cs = geoAlb( ( uO.x > 0.0 && uO.y > 0.0 && uO.x < 1.0 && uO.y < 1.0 ) ? texture2D( tGO, uO, 2.5 ).rgb : texture2D( tGF, gUV( p, bGF ), 1.0 ).rgb, uGGain );
      float ls = dot( cs, vec3( 0.3, 0.55, 0.15 ) );
      // spruce stands in these photos are dark and a little bluish (albedo blue − green ≈ +0.018), fields and meadows yellowish (−0.012),
      // broadleaf woods in between (measured on ortho_outer/ortho_far at the trees of the canopy model): dark and bluish = conifers
      float fm = ( 1.0 - smoothstep( uZkM.x, uZkM.y, ls ) ) * smoothstep( -0.004, 0.012, cs.b - cs.g );
      for ( int i = 0; i < ${NH}; i++ ) { vec3 h = uZkHole[ i ]; if ( h.z > 0.0 ) fm *= smoothstep( h.z - 25.0, h.z, distance( p, h.xy ) ); }
      if ( uZkT2.w > 0.5 && uZkT2.w < 1.5 ) return mix( c, vec3( 0.9, 0.0, 0.9 ), fm );
      if ( fm < 0.01 ) return c;
      float r = 0.88 * zkRank( p ) + 0.12 * zkN( p * 0.33 + 5.0 ), s = zkStage( r );
      if ( s < 0.5 ) return c;
      float tx = clamp( l / uZkM.z, 0.55, 1.6 );
      vec3 col;
      if ( s < 1.5 ) col = vec3( 0.23, 0.07, 0.022 );                                                   // rust-red crowns
      else if ( s < 2.5 ) col = vec3( 0.25, 0.245, 0.225 );                                            // silver-grey snags over the litter
      else if ( s < 3.5 ) col = vec3( 0.11, 0.094, 0.075 ) * ( 0.75 + 0.5 * zkN( p * 0.7 ) );          // fallen trunks, criss-cross
      else if ( s < 4.5 ) {                                                                              // cleared: slash, then grass and herbs
        float a = clamp( ( uZkT.y - r ) / max( uZkT.y - uZkT.x, 0.03 ), 0.0, 1.0 );
        col = mix( vec3( 0.27, 0.22, 0.16 ), vec3( 0.22, 0.21, 0.12 ), a ) * ( 0.85 + 0.3 * zkN( p * 0.5 ) );  // light brown-grey, greening
      } else col = mix( vec3( 0.2, 0.17, 0.11 ), uZkT2.z > 0.5 ? vec3( 0.15, 0.19, 0.07 ) : vec3( 0.17, 0.2, 0.08 ), clamp( 0.35 + uZkT2.y / 6.0, 0.0, 1.0 ) )
                 * mix( 1.1, 0.7, clamp( uZkT2.y / 12.0, 0.0, 1.0 ) );                                                         // young: muted yellow-green over the brown ground
      if ( uZkT2.w > 1.5 ) col = s < 1.5 ? vec3( 0.8, 0.1, 0.0 ) : s < 2.5 ? vec3( 0.6 ) : s < 3.5 ? vec3( 0.3, 0.2, 0.6 ) : s < 4.5 ? vec3( 0.8, 0.7, 0.1 ) : vec3( 0.1, 0.9, 0.2 );
      return mix( c, col * mix( 1.0, tx, 0.55 ), fm );
    }
  `;
  function patchTerrain(mat) {
    if (mat.userData.zk) return;
    const ob = mat.onBeforeCompile;
    mat.onBeforeCompile = (sh, r) => {
      ob.call(mat, sh, r);
      Object.assign(sh.uniforms, U);
      const A = 'vec3 gc = geoCol( vGeo );';
      if (sh.fragmentShader.indexOf(A) < 0) {
        S.err = 'terrain: shader anchor not found';
        return;
      }
      const fs = sh.fragmentShader.replace(A, 'vec3 gc = zkSlope( vGeo, geoCol( vGeo ) );'),
        k = fs.indexOf('void main() {');
      if (k < 0 || fs.indexOf('vec3 geoAlb(') < 0) {
        S.err = 'terrain: main or geoAlb not found';
        return;
      }
      sh.fragmentShader = fs.slice(0, k) + GLSL + TERRAIN + fs.slice(k);
    };
    const key = mat.customProgramCacheKey ? mat.customProgramCacheKey() : 'geoterrain';
    mat.customProgramCacheKey = () => key + '-zk';
    mat.userData.zk = true;
    mat.needsUpdate = true;
  }
  // ---------- once: the jitter attribute on every far card, the rank distribution, the village holes, the patched programs ----------
  function prepare() {
    if (S.ready) return true;
    const RT = G('RATSCHER');
    if (!RT || !RT.trees || !RT.trees.length || !RT.treeRecs) return false;
    const cards = new Set(RT.trees),
      arrs = new Map(),
      R = [];
    for (const im of RT.trees) arrs.set(im, new Float32Array(im.count).fill(-1));
    for (const it of RT.treeRecs) {
      if (!it.con) continue;
      for (const [im, i] of it.inst) {
        if (!cards.has(im)) continue;
        const j = jit(it.x, it.y);
        arrs.get(im)[i] = j;
        R.push(0.88 * rank(it.x, it.y) + 0.12 * j);
      }
    }
    for (const [im, a] of arrs) im.geometry.setAttribute('aZk', new THREE.InstancedBufferAttribute(a, 1));
    R.sort((a, b) => a - b);
    S.Q = Float32Array.from(R);
    S.cards = RT.trees.length;
    S.con = R.length;
    // the village: up to NH circles round the buildings (k-means on their centres, radius = the farthest member + 18 m)
    const V = G('VILLAGE'),
      B = V && V.bld ? V.bld.filter(b => isFinite(b.cx) && isFinite(b.cy)) : [];
    S.holes = kmeans(
      B.map(b => [b.cx, b.cy]),
      NH
    );
    S.holes.forEach((h, i) => U.uZkHole.value[i].set(h[0], h[1], h[2]));
    patchCards(RT.trees[0].material);
    // a hidden carrier of the original card material: the first version's young-tree impostors (zukunft/zk_welt.js) look it up by its
    // key 'geotree' in the scene and draw with it – they must find it while the cards wear the copy
    const dec = new THREE.InstancedMesh(RT.trees[0].geometry, S.orig, 1);
    dec.setColorAt(0, new THREE.Color(1, 1, 1));
    dec.count = 0;
    dec.visible = false;
    dec.frustumCulled = false;
    dec.name = 'zeitreise geotree-original';
    scene.add(dec);
    S.decoy = dec;
    if (RT.terrainMat) patchTerrain(RT.terrainMat);
    S.patched = true;
    S.ready = true;
    return true;
  }
  function kmeans(P, k) {
    if (!P.length) return [];
    let C = [];
    for (let i = 0; i < k && i < P.length; i++) C.push(P[Math.floor(((i + 0.5) * P.length) / k)].slice());
    const asg = new Int32Array(P.length);
    for (let it = 0; it < 12; it++) {
      P.forEach((p, i) => {
        let bi = 0,
          bd = 1e18;
        C.forEach((c, j) => {
          const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2;
          if (d < bd) {
            bd = d;
            bi = j;
          }
        });
        asg[i] = bi;
      });
      C = C.map((c, j) => {
        let sx = 0,
          sy = 0,
          n = 0;
        P.forEach((p, i) => {
          if (asg[i] === j) {
            sx += p[0];
            sy += p[1];
            n++;
          }
        });
        return n ? [sx / n, sy / n] : c;
      });
    }
    return C.map((c, j) => {
      let r = 0;
      P.forEach((p, i) => {
        if (asg[i] === j) r = Math.max(r, Math.hypot(p[0] - c[0], p[1] - c[1]));
      });
      return [+c[0].toFixed(1), +c[1].toFixed(1), +(r + 18).toFixed(1)];
    });
  }
  // the rank below which a share s of the conifer cards lies
  function q(s) {
    const Q = S.Q;
    if (!Q || !Q.length || s <= 0) return -1;
    if (s >= 1) return 2;
    return Q[Math.min(Q.length - 1, Math.floor(s * Q.length))];
  }
  // a state's eight numbers (null: today)
  function uniformsOf(st) {
    const F = st && st.forest;
    if (!F) return null;
    const v = k => Math.max(0, +F[k] || 0);
    const c1 = v('young'),
      c2 = c1 + v('cleared'),
      c3 = c2 + v('fallen'),
      c4 = c3 + v('grey'),
      c5 = c4 + v('red');
    return {
      T: [q(c1), q(c2), q(c3), q(c4)],
      T2: [q(c5), Math.max(0, +F.regrowH || 0), F.regrow === 'pionier' ? 1 : 0],
    };
  }
  const put = u => {
    if (!u) {
      U.uZkOn.value = 0;
      return;
    }
    U.uZkOn.value = 1;
    wear(true);
    U.uZkT.value.set(...u.T);
    U.uZkT2.value.set(u.T2[0], u.T2[1], u.T2[2], U.uZkT2.value.w);
  };
  // the uniforms of the world this render draws (zk_zeitwelt.js calls it from scene.onBeforeRender with 'L' or 'R')
  function side(s) {
    put(S.side[s] || S.side.L);
  }
  function set(L, R) {
    if (!prepare()) return false;
    S.side.L = uniformsOf(L);
    S.side.R = R ? uniformsOf(R) : null;
    put(S.side.L);
    S.n++;
    markDirty(true);
    return true;
  }
  function warm() {
    if (!prepare()) return false;
    const RT = G('RATSCHER');
    // compile both patched programs now (the uniforms are values: switching them later compiles nothing)
    put({ T: [0.1, 0.2, 0.3, 0.4], T2: [0.5, 3, 1] });
    try {
      const w = new THREE.InstancedMesh(RT.trees[0].geometry, S.mat, 1);
      w.setColorAt(0, new THREE.Color(1, 1, 1));
      w.frustumCulled = false;
      warmUp(w);
      if (RT.meshes && RT.meshes[0]) warmUp(RT.meshes[0]);
    } catch (e) {
      S.err = 'warm: ' + e;
    }
    put(null);
    return true;
  }
  function clear() {
    S.side.L = S.side.R = null;
    put(null);
    wear(false);
    markDirty(true);
  }
  function debug(mode) {
    U.uZkT2.value.w = mode || 0;
    markDirty(true);
  }
  function stats() {
    return {
      ready: S.ready,
      on: U.uZkOn.value,
      cards: S.cards,
      conifers: S.con,
      T: U.uZkT.value.toArray().map(v => +v.toFixed(3)),
      T2: U.uZkT2.value.toArray().map(v => +v.toFixed(3)),
      holes: S.holes.length,
      err: S.err,
    };
  }
  // the stage at a place: of a spruce card standing there (card true) or of the ground (the terrain's jitter) – 0 green … 5 young
  function stageAt(x, y, st, card) {
    const u = uniformsOf(st);
    if (!u || !S.Q) return 0;
    const r = 0.88 * rank(x, y) + 0.12 * (card ? jit(x, y) : jitG(x, y)),
      T = u.T;
    return r >= u.T2[0] ? 0 : r >= T[3] ? 1 : r >= T[2] ? 2 : r >= T[1] ? 3 : r >= T[0] ? 4 : 5;
  }
  return { warm, set, side, clear, stats, debug, stageAt, rank, q, U, S };
})();
