// ===================== feat/ferne step 2: the forests between the trees and the far terrain – a canopy (FWALD) =====================
// Falko, 19.11.2026: „wenn sich der Horizont und Objekte in der Ferne am Horizont erst sehr langsam aufbauen … einen flüssigeren Übergang
// zwischen Horizontdarstellung und detaillierter Nahdarstellung“. The world's trees (weltwald/weltwald.js) stand out to rf (520 m on tier
// hoch, cards beyond the 3D ones); the terrain beyond the drawn tiles (760 m) is the surface model of world/ratscher.js, the forests on it
// raised. Between the two the tiles' bare ground with the forest only in the photo: a flat ring that the trees walk into as one drives.
// Here the forest's roof fills that ring: one mesh, rebuilt round the camera every 80 m moved (≤ 3 ms a frame), from a grid of 20 m per
// 400 m cell (tools/ferne/wald.py → dist/ferne/wald/<I>_<J>.bin per 3.2 km, loaded round the camera: cover, mean top height, conifers'
// share – made from weltwald/z/ at build time)
// on the ground the tiles draw (WELT.heightAt) – ending where the tiles end, the surface model takes over there.
// - the edges slope down (the vertices' cover from the four squares round them), the vertices a little off the grid and their heights
//   a little uneven: no grid on the skyline; crowns as a value noise of 6 m in the colour
// - colours: conifers dark, broadleaf in the season of the world's trees (WWALD.season(): fresh in May, autumn, bare in winter)
// - fades in by dither from rf − 90 to rf, where the cards thin out; ?noferne turns it off with the far houses
// FWALD.state() → { on, ready, cells, tris, ms, builds, err }
import * as THREE from 'three';
import { BASE, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { RATSCHER } from '../world/ratscher.js';
import { WELT } from '../welt/welt.js';
import { WWALD } from '../weltwald/weltwald.js';
import { FERNE } from './ferne.js';
export const FWALD = (() => {
  const S = { on: !!(FERNE.on && WWALD.on && WELT.on), ready: false, err: '', builds: 0, ms: 0, tris: 0, cells: 0 };
  if (!S.on) return S;
  const CELL = 400,
    RES = 20,
    NR = CELL / RES,
    OUT = 900, // the ring's outer edge (m): beyond the tiles nothing is built anyway
    MOVE = 80;
  const D = { cells: new Map(), index: null, blocks: new Map(), bc: 8 };
  const hh = n => {
    const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
  };
  // ---- the data: blocks of 8 × 8 cells (3.2 km), each loaded when the camera comes within OUT of it ----
  async function index() {
    try {
      const r = await fetch(BASE + 'ferne/wald.json');
      if (!r.ok) throw new Error('wald.json ' + r.status);
      const x = await r.json();
      D.bc = x.bc;
      D.index = new Set(x.blocks);
      S.ready = true;
    } catch (e) {
      S.err = String(e);
    }
  }
  async function loadBlock(k) {
    D.blocks.set(k, 'loading');
    try {
      const r = await fetch(BASE + 'ferne/wald/' + k + '.bin');
      if (!r.ok) throw new Error(k + ' ' + r.status);
      const buf = await new Response(r.body.pipeThrough(new DecompressionStream('deflate'))).arrayBuffer(),
        dv = new DataView(buf),
        n = dv.getUint32(4, true),
        o0 = 8 + n * 4;
      for (let q = 0; q < n; q++)
        D.cells.set(
          dv.getInt16(8 + q * 4, true) + '_' + dv.getInt16(10 + q * 4, true),
          new Uint8Array(buf, o0 + q * 800, 800)
        );
      D.blocks.set(k, 'ready');
      B.x = NaN; // build again with it
    } catch (e) {
      D.blocks.set(k, 'err');
      S.err = String(e);
    }
  }
  function want(x, y) {
    const s = D.bc * CELL,
      I0 = Math.floor((x - OUT) / s),
      I1 = Math.floor((x + OUT) / s),
      J0 = Math.floor((y - OUT) / s),
      J1 = Math.floor((y + OUT) / s);
    for (let I = I0; I <= I1; I++)
      for (let J = J0; J <= J1; J++) {
        const k = I + '_' + J;
        if (D.index.has(k) && !D.blocks.has(k)) loadBlock(k);
      }
  }
  // the square of 20 m at the grid indices (gx, gy) (world: x = gx·20): [height m, cover 0–1, conifers 0–1] or null
  function sq(gx, gy) {
    const i = Math.floor(gx / NR),
      j = Math.floor(gy / NR),
      c = D.cells.get(i + '_' + j);
    if (!c) return null;
    const o = ((gy - j * NR) * NR + (gx - i * NR)) * 2;
    return c[o] ? [c[o] / 2, (c[o + 1] & 15) / 15, (c[o + 1] >> 4) / 15] : null;
  }
  // ---- the material ----
  const U = {
    uFwD: { value: new THREE.Vector4(430, 520, 0, 0) },
    uFwB: { value: new THREE.Color(0.05, 0.075, 0.03) }, // broadleaf (linear), set by the season
    uFwC: { value: new THREE.Color(0.022, 0.036, 0.02) }, // conifers
  };
  const mat = new THREE.MeshStandardMaterial({
    vertexColors: false,
    roughness: 1,
    metalness: 0,
    envMapIntensity: 0.12,
  });
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader =
      'attribute float aCon; varying float vCon; varying vec3 vFwW;\n' +
      sh.vertexShader.replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vCon = aCon; vFwW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;'
      );
    sh.fragmentShader =
      'uniform vec4 uFwD; uniform vec3 uFwB, uFwC; varying float vCon; varying vec3 vFwW;\n' +
      'float fwH( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }\n' +
      'float fwN( vec2 p ) { vec2 i = floor( p ), f = fract( p ); f = f * f * ( 3.0 - 2.0 * f );\n' +
      '  return mix( mix( fwH( i ), fwH( i + vec2( 1, 0 ) ), f.x ), mix( fwH( i + vec2( 0, 1 ) ), fwH( i + vec2( 1, 1 ) ), f.x ), f.y ); }\n' +
      sh.fragmentShader
        .replace(
          'void main() {',
          `void main() {
  {
    float d = length( vFwW.xz - cameraPosition.xz ), f = smoothstep( uFwD.x, uFwD.y, d );
    if ( f < 0.999 ) {
      const float BAY[ 16 ] = float[ 16 ]( 0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0 );
      ivec2 q = ivec2( mod( gl_FragCoord.xy, 4.0 ) );
      if ( ( BAY[ q.y * 4 + q.x ] + 0.5 ) / 16.0 >= f ) discard;
    }
  }`
        )
        .replace(
          '#include <color_fragment>',
          `#include <color_fragment>
  // the crowns: one every ~7 m (cells of a jittered grid), dark gaps between them, each a dome lit from the sun's side (the normal
  // below); a coarser patchwork of stands at ~40 m
  vec2 fwP = vFwW.xz / 7.0, fwG = floor( fwP ), fwF = fwP - fwG, fwMv = vec2( 0.0 );
  float fwMd = 9.0;
  for ( int j = -1; j <= 1; j ++ ) for ( int i = -1; i <= 1; i ++ ) {
    vec2 o = vec2( float( i ), float( j ) ), r = o + 0.1 + 0.8 * vec2( fwH( fwG + o ), fwH( fwG + o + 31.7 ) ) - fwF;
    float d = dot( r, r );
    if ( d < fwMd ) { fwMd = d; fwMv = r; }
  }
  float fwCd = sqrt( fwMd ), fwS = fwN( vFwW.xz / 40.0 + 3.0 );
  diffuseColor.rgb = mix( uFwB, uFwC, vCon ) * ( 1.0 - 0.6 * smoothstep( 0.35, 0.8, fwCd ) ) * ( 0.75 + 0.5 * fwS ) * ( 0.85 + 0.3 * fwH( fwG + floor( fwP + fwMv ) * 0.0 + 5.3 ) );`
        )
        .replace(
          '#include <normal_fragment_begin>',
          `#include <normal_fragment_begin>
  normal = normalize( normal - 1.1 * smoothstep( 0.05, 0.75, fwCd ) * ( mat3( viewMatrix ) * vec3( fwMv.x, 0.0, fwMv.y ) ) / max( fwCd, 0.05 ) );`
        );
  };
  mat.customProgramCacheKey = () => 'ferne-wald';
  const mesh = new THREE.Mesh(new THREE.BufferGeometry(), mat);
  mesh.name = 'ferne wald';
  mesh.frustumCulled = false;
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.visible = false;
  scene.add(mesh);
  // ---- the build: the squares within OUT of the camera that have crowns, as one mesh of quads (20 m), in slices ----
  const B = { job: null, x: NaN, y: NaN, ok: -1, t: 0 };
  function start(x, y) {
    const g0x = Math.floor((x - OUT) / RES),
      g0y = Math.floor((y - OUT) / RES),
      n = Math.ceil((2 * OUT) / RES) + 1,
      cap = 24000;
    B.job = {
      x,
      y,
      g0x,
      g0y,
      n,
      row: 0,
      P: new Float32Array(cap * 3),
      C: new Float32Array(cap),
      I: new Uint32Array(cap * 6),
      nv: 0,
      ni: 0,
      cap,
      vid: new Map(), // grid vertex (gx, gy) → its index, or −1 (no ground there)
    };
  }
  // a grid vertex: its cover and height from the four squares round it, a little off the grid and uneven
  function vertex(J, gx, gy) {
    const k = gx * 65536 + gy;
    let v = J.vid.get(k);
    if (v !== undefined) return v;
    let cs = 0,
      hs = 0,
      ks = 0;
    for (let a = -1; a <= 0; a++)
      for (let b = -1; b <= 0; b++) {
        const t = sq(gx + a, gy + b);
        if (t) {
          cs += t[1];
          hs += t[0] * t[1];
          ks += t[2] * t[1];
        }
      }
    const c = cs / 4,
      jx = (hh(gx * 0.37 + gy * 1.91) - 0.5) * 9,
      jy = (hh(gx * 1.13 + gy * 0.71 + 5) - 0.5) * 9,
      x = gx * RES + jx,
      y = gy * RES + jy,
      z = WELT.heightAt(x, y);
    if (!Number.isFinite(z) || J.nv >= J.cap) {
      J.vid.set(k, -1);
      return -1;
    }
    const h =
      cs > 0
        ? (hs / cs) * 0.9 * THREE.MathUtils.smoothstep(c, 0.12, 0.55) * (0.78 + 0.4 * hh(gx * 2.3 + gy * 0.53))
        : 0;
    v = J.nv++;
    J.P[v * 3] = x;
    J.P[v * 3 + 1] = z + h - (h < 0.5 ? 0.6 : 0); // (an edge vertex tucked under the ground: no seam on the slope's foot)
    J.P[v * 3 + 2] = -y;
    J.C[v] = cs > 0 ? ks / cs : 0;
    J.vid.set(k, v);
    return v;
  }
  function step(budget) {
    const J = B.job,
      t0 = performance.now(),
      r2 = OUT * OUT;
    while (J.row < J.n && performance.now() - t0 < budget) {
      const gy = J.g0y + J.row++;
      for (let a = 0; a < J.n; a++) {
        const gx = J.g0x + a,
          cx = gx * RES + RES / 2 - J.x,
          cy = gy * RES + RES / 2 - J.y;
        if (cx * cx + cy * cy > r2) continue;
        const t = sq(gx, gy);
        if (!t || t[1] < 0.2 || J.ni + 6 > J.cap * 6) continue;
        const v0 = vertex(J, gx, gy),
          v1 = vertex(J, gx + 1, gy),
          v2 = vertex(J, gx + 1, gy + 1),
          v3 = vertex(J, gx, gy + 1);
        if (v0 < 0 || v1 < 0 || v2 < 0 || v3 < 0) continue;
        // (model y is north, three's z is south: the quad's order as seen from above)
        J.I.set([v0, v1, v2, v0, v2, v3], J.ni);
        J.ni += 6;
      }
    }
    S.ms = Math.max(S.ms * 0.9, performance.now() - t0);
    if (J.row < J.n) return;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(J.P.subarray(0, J.nv * 3), 3));
    g.setAttribute('aCon', new THREE.BufferAttribute(J.C.subarray(0, J.nv), 1));
    g.setIndex(new THREE.BufferAttribute(J.I.subarray(0, J.ni), 1));
    g.computeVertexNormals();
    mesh.geometry.dispose();
    mesh.geometry = g;
    mesh.visible = J.ni > 0 && !RATSCHER.map && !S.off;
    S.tris = J.ni / 3;
    S.builds++;
    B.x = J.x;
    B.y = J.y;
    B.job = null;
    markDirty();
  }
  // ---- the season's colours (sRGB → linear) ----
  const SUM = new THREE.Color().setRGB(0.21, 0.29, 0.12, THREE.SRGBColorSpace),
    FRESH = new THREE.Color().setRGB(0.28, 0.37, 0.13, THREE.SRGBColorSpace),
    GOLD = new THREE.Color().setRGB(0.42, 0.28, 0.11, THREE.SRGBColorSpace),
    BARE = new THREE.Color().setRGB(0.27, 0.24, 0.2, THREE.SRGBColorSpace);
  U.uFwC.value.setRGB(0.13, 0.19, 0.11, THREE.SRGBColorSpace);
  let seasonAt = -1;
  function season() {
    const q = WWALD.season ? WWALD.season() : { leaf: 1, gold: 0, fresh: 0 };
    U.uFwB.value
      .copy(SUM)
      .lerp(FRESH, q.fresh)
      .lerp(GOLD, q.gold * q.leaf)
      .lerp(BARE, 1 - q.leaf);
  }
  let acc = 0;
  function tick(dt) {
    if (!S.ready) return;
    acc += dt;
    if (acc > 2 || seasonAt < 0) {
      acc = 0;
      seasonAt = 1;
      season();
    }
    const b = WWALD.band ? WWALD.band() : { rf: 520 };
    U.uFwD.value.set(b.rf - 90, b.rf, 0, 0);
    if (RATSCHER.map || S.off) mesh.visible = false;
    if (B.job) return step(3);
    want(...KERN.where());
    // again when the camera moved 80 m, or when tiles came or went (at most every 1.5 s: while they load they come one by one)
    const [wx, wy] = KERN.where(),
      ok = WELT.n.ok,
      now = performance.now();
    if (!(B.x === B.x) || Math.hypot(wx - B.x, wy - B.y) > MOVE || (ok !== B.ok && now - B.t > 1500)) {
      B.ok = ok;
      B.t = now;
      start(wx, wy);
    }
  }
  S.state = () => ({
    on: S.on,
    ready: S.ready,
    cells: D.cells.size,
    blocks: [...D.blocks.values()].filter(v => v === 'ready').length,
    tris: S.tris,
    ms: +S.ms.toFixed(1),
    builds: S.builds,
    err: S.err,
  });
  S.U = U;
  S.mesh = mesh;
  whenLoaded(index);
  KERN.tick(tick, 'ferne-wald');
  window.FWALD = S;
  return S;
})();
