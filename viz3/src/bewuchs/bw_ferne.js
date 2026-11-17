// ===================== feat/bewuchs stage 2b: flowering meadows far away – coloured speckles in the ground (BWFERNE) =====================
// The flowers of bw_blume.js stand as small plants out to ~25 m; beyond, a meadow in June would turn plain green. Here the ground shaders
// (world/roads.js landDetail, marked hook `feat/bewuchs`: they call bwFar( p, c, dist ) at the end) get the bloom of each place: a texture
// of 512² texels of 2 m (1 km) around the camera, each texel the colour of a flower in bloom there (drawn by its hash from the species
// of its kind of area, weighted by how many of them flower today) and in alpha how much of the ground they cover. The shader scatters dots
// of ~0.4 m (coarser further away) where the hash falls under that share; where a pixel spans many dots it takes their mean. Fields cut
// in the last weeks carry fewer (the share of the fields of a class that flower again after the cuts, from its care).
//   BWFERNE.shader(sh)   for world/roads.js S.shader: the uniforms into sh, the GLSL of bwFar
//   BWFERNE.day(doy)     the bloom of each class today (colours, share) – refills the texture
//   BWFERNE.want(x, y)   recentre the window (moved > 160 m) and go on with a refill (≤ 3 ms a frame)
//   BWFERNE.refill()     the maps changed: fill again
//   BWFERNE.state()      { on, x0, y0, n, classes: { id: share } }
import * as THREE from 'three';
import { markDirty } from '../core/assets.js';
import { BWKARTE } from './bw_karte.js';
import { BWPHAENO } from './bw_phaeno.js';
import { BWBLUME } from './bw_blume.js';
export const BWFERNE = (() => {
  const N = 512,
    RES = 2,
    SPAN = N * RES;
  const data = new Uint8Array(N * N * 4),
    tex = new THREE.DataTexture(data, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  const U = {
    tBwFar: { value: tex },
    uBwFarB: { value: new THREE.Vector4(0, 0, 1 / SPAN, 0) }, // x0, y0, 1/size, on
  };
  const S = { x0: NaN, y0: NaN, job: null, n: 0, bloom: [], doy: NaN };
  const lin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const hexLin = h =>
    typeof h === 'string' && h[0] === '#' ? [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16) / 255)) : null;
  // the share of a class's fields not cut in the last ~4 weeks (flowers come back after that) – from its care
  function uncut(k, doy) {
    const m = k && k.mow;
    if (!m || !m.cuts) return 1;
    let cut = 0;
    m.cuts.forEach((c, i) => {
      const sp = Math.max(1, m.spread || 1),
        sh = m.share && Number.isFinite(m.share[i]) ? m.share[i] : 1,
        // fields cut between doy − 28 and doy: their cut day c + off, off uniform in ±sp
        a = Math.max(c - sp, doy - 28),
        b = Math.min(c + sp, doy);
      if (b > a) cut += (sh * (b - a)) / (2 * sp);
    });
    return Math.max(0, 1 - cut);
  }
  // the bloom of each class today: up to six species (cumulative weight, linear colour) and the share of ground their flowers cover
  function day(doy) {
    S.doy = doy;
    const SP = BWBLUME.SP,
      MIX = BWBLUME.MIX || {},
      out = [];
    for (let c = 0; c < 32; c++) {
      const k = BWPHAENO.K[c],
        m = MIX[c];
      if (!k || !m || !(k.flowers > 0)) {
        out[c] = null;
        continue;
      }
      const L = [];
      let sum = 0;
      for (const [id, w] of Object.entries(m)) {
        const s = SP.find(q => q.id === id);
        if (!s) continue;
        const a = bloomOf(s, doy);
        if (!(a.amount > 0) || !a.col) continue;
        sum += w * a.amount;
        L.push([w * a.amount, a.col]);
      }
      if (!L.length || !(sum > 0)) {
        out[c] = null;
        continue;
      }
      L.sort((p, q) => q[0] - p[0]);
      const top = L.slice(0, 6);
      let acc = 0;
      const tot = top.reduce((p, q) => p + q[0], 0);
      // flowers per m² × their share in bloom × a head of ~3 cm² … as ground covered (a June meadow ~25 %), the cut fields fewer
      const share =
        Math.min(0.45, k.flowers * (sum / Object.values(m).reduce((p, q) => p + q, 0)) * 0.014) * uncut(k, doy);
      out[c] = {
        share,
        list: top.map(([w, col]) => {
          acc += w / tot;
          return [acc, col];
        }),
      };
    }
    S.bloom = out;
    S.job = null; // refill
    S.x0 = NaN;
  }
  // a species on doy: the colour seen from afar (the bloom; the seed head where it is light, like a dandelion clock) and how many show it
  function bloomOf(s, doy) {
    if (s.jahr) {
      for (const [fr, a, b, share] of s.jahr) {
        if (doy < a || doy > b + 0.999) continue;
        if (fr === 'bluete') return { amount: Number.isFinite(share) ? share : 1, col: hexLin(s.col) };
        if (fr === 'samen' && s.colSeed)
          return { amount: (Number.isFinite(share) ? share : 1) * 0.7, col: hexLin(s.colSeed) };
        return { amount: 0 };
      }
      return { amount: 0 };
    }
    // the lead's stand-in species: bloom windows
    for (const [a, b] of s.bluete || []) if (doy >= a && doy <= b) return { amount: 1, col: hexLin(s.col) };
    return { amount: 0 };
  }
  const hash = (x, y) => {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
    return s - Math.floor(s);
  };
  function want(x, y) {
    if (!S.bloom.length) return;
    const half = SPAN / 2;
    if (!S.job && Math.abs(x - (S.x0 + half)) < 160 && Math.abs(y - (S.y0 + half)) < 160) return;
    if (!S.job) {
      const x0 = Math.floor((x - half) / 16) * 16,
        y0 = Math.floor((y - half) / 16) * 16;
      S.job = { x0, y0, row: 0, buf: new Uint8Array(N * N * 4) };
    }
    const J = S.job,
      t0 = performance.now();
    while (J.row < N && performance.now() - t0 < 3) {
      const j = J.row++,
        yy = J.y0 + (j + 0.5) * RES;
      for (let i = 0; i < N; i++) {
        const xx = J.x0 + (i + 0.5) * RES,
          code = BWKARTE.codeAt(xx, yy),
          b = S.bloom[code & 31];
        if (!b) continue;
        const r = hash(xx, yy);
        let col = b.list[b.list.length - 1][1];
        for (const [cw, c] of b.list)
          if (r <= cw) {
            col = c;
            break;
          }
        const o = (j * N + i) * 4,
          vig = 0.45 + 0.55 * ((code >> 5) / 7),
          a = Math.min(1, b.share * vig);
        // premultiplied: the colour times its share (bilinear filtering between texels stays clean)
        J.buf[o] = Math.round(Math.min(1, col[0]) * a * 255);
        J.buf[o + 1] = Math.round(Math.min(1, col[1]) * a * 255);
        J.buf[o + 2] = Math.round(Math.min(1, col[2]) * a * 255);
        J.buf[o + 3] = Math.round(a * 255);
      }
    }
    if (J.row < N) return;
    data.set(J.buf);
    tex.needsUpdate = true;
    S.x0 = J.x0;
    S.y0 = J.y0;
    S.job = null;
    S.n++;
    U.uBwFarB.value.set(S.x0, S.y0, 1 / SPAN, 1);
    markDirty();
  }
  // the ground shaders' part (fwidth first: it must not sit after a branch that differs from pixel to pixel)
  const GLSL = `
uniform sampler2D tBwFar; uniform vec4 uBwFarB;
float bwFH( vec2 p ) { return fract( sin( dot( p, vec2( 41.3, 289.1 ) ) ) * 45758.5453 ); }
vec3 bwFar( vec2 p, vec3 c, float dist ) {
  float fw = length( fwidth( p ) );
  if ( uBwFarB.w < 0.5 || dist < 20.0 ) return c;
  vec2 u = ( p - uBwFarB.xy ) * uBwFarB.z;
  if ( u.x <= 0.0 || u.y <= 0.0 || u.x >= 1.0 || u.y >= 1.0 ) return c;
  vec4 f = texture( tBwFar, u );
  if ( f.a < 0.004 ) return c;
  // in from where the flowers of bw_blume.js end, out towards the haze
  float fade = smoothstep( 20.0, 34.0, dist ) * ( 1.0 - smoothstep( 600.0, 1000.0, dist ) );
  float s = max( 0.4, dist * 0.003 );
  float dots = step( bwFH( floor( p / s ) ), f.a );
  float k = mix( dots, f.a, smoothstep( 0.5 * s, 2.0 * s, fw ) );
  // the colour stored with its share multiplied in (so the texels blend cleanly): undone here
  return mix( c, min( f.rgb / f.a, vec3( 1.0 ) ), k * fade * 0.85 );
}
`;
  function shader(sh) {
    Object.assign(sh.uniforms, U);
    return GLSL;
  }
  const state = () => ({
    on: U.uBwFarB.value.w > 0.5,
    x0: S.x0,
    y0: S.y0,
    n: S.n,
    classes: Object.fromEntries(S.bloom.map((b, c) => [c, b ? +b.share.toFixed(3) : 0]).filter(([, v]) => v > 0)),
  });
  // the maps changed (cells loaded, the garden's site rebuilt): fill again
  const refill = () => {
    S.job = null;
    S.x0 = NaN;
  };
  Object.assign(S, { U, shader, day, want, refill, state });
  return S;
})();
if (typeof window !== 'undefined') window.BWFERNE = BWFERNE;
