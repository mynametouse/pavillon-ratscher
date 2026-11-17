// ===================== feat/bewuchs stage 2: wildflowers among the blades – near as small plants, their year from the species table (BWBLUME) =====================
// Falko, 17.11.2026: „… Büsche mit Beeren, Gräser, Blumen und was so üblicherweise dort wächst auf Wiesen“; 21:30: lawn and meadows at once.
// The flowers stand in the same tiles as the blades (the near and the mid ring of bw_halm.js share their lists): each tile carries F slots of
// a small plant – two crossed quads with a picture of the atlas (the helper bewuchs-pflanzen draws it: 8 × 8 cells of 128 px, one plant
// in side view per cell, its foot at the bottom middle). On the card a slot takes the kind of area at its foot, draws a species from that
// area's mix (the daisies, white clover and dandelions of a lawn; margerites, buttercups, bellflowers, red clover of a hay meadow; poppies and
// cornflowers at a field's edge …) and shows it only if the species is out now (its frame of the day – bud, bloom, seed head – from the
// calendar) and the grass there has not just been cut (a mown meadow has no flowers for a few weeks). One draw call per ring.
// Until the helper's atlas and table are merged: a stand-in atlas drawn here (simple stems, leaves and heads) and the lead's mixes.
//   BWBLUME.build()      (re)make the meshes on the rings of BWHALM (bw_halm.js calls it after its build)
//   BWBLUME.day(doy)     the species' frames and amounts of the day → texture
//   BWBLUME.atlas(tex, cells)  use another atlas: cells { id: { bluete: n, knospe: n, samen: n, blatt: n } } (n = row * 8 + column)
//   BWBLUME.stats()      { rings: [{ tiles, slots }], species: { id: amount } }
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { markDirty, patchSV } from '../core/assets.js';
import { WXWIND } from '../wetter/wx_wind.js';
import { BWKARTE } from './bw_karte.js';
import { BWHALM } from './bw_halm.js';
export const BWBLUME = (() => {
  const S = { meshes: [], err: '', standin: true, doy: NaN };
  // ---------- species: height (m), the atlas cells of their frames, the calendar (day-of-year windows) ----------
  // (the lead's first estimates for southern Thuringia, ~450 m; the helper's table BWARTEN.blumen replaces them)
  const SP = [
    { id: 'loewenzahn', h: [0.1, 0.3], bluete: [[100, 140]], samen: [[122, 160]], col: '#f2c40c' },
    { id: 'gaensebluemchen', h: [0.05, 0.1], bluete: [[70, 300]], col: '#f4f1ea' },
    { id: 'weissklee', h: [0.06, 0.14], bluete: [[140, 265]], col: '#eeeadf' },
    { id: 'rotklee', h: [0.15, 0.35], bluete: [[140, 255]], col: '#c2477a' },
    { id: 'hahnenfuss', h: [0.3, 0.7], bluete: [[125, 180]], col: '#f2d21c' },
    { id: 'margerite', h: [0.3, 0.6], bluete: [[150, 200]], col: '#f6f4ec' },
    { id: 'glockenblume', h: [0.3, 0.6], bluete: [[140, 200]], col: '#7a5fc0' },
    { id: 'storchschnabel', h: [0.3, 0.6], bluete: [[160, 200]], col: '#6f72c8' },
    { id: 'flockenblume', h: [0.3, 0.7], bluete: [[175, 270]], col: '#b04f9a' },
    { id: 'schafgarbe', h: [0.25, 0.6], bluete: [[165, 285]], col: '#efe9dc' },
    { id: 'wiesenkerbel', h: [0.6, 1.2], bluete: [[120, 162]], col: '#f2f1e8' },
    { id: 'wildemoehre', h: [0.4, 0.9], bluete: [[180, 260]], col: '#efede2' },
    { id: 'rainfarn', h: [0.6, 1.2], bluete: [[195, 270]], col: '#e8b81a' },
    { id: 'wegwarte', h: [0.4, 1.0], bluete: [[190, 260]], col: '#7d9ae0' },
    { id: 'mohn', h: [0.3, 0.7], bluete: [[155, 200]], col: '#d8261c' },
    { id: 'kornblume', h: [0.3, 0.7], bluete: [[160, 225]], col: '#3f62d0' },
    { id: 'kamille', h: [0.15, 0.4], bluete: [[160, 240]], col: '#f5f3ea' },
    { id: 'herbstzeitlose', h: [0.08, 0.18], bluete: [[235, 280]], col: '#c49ad8' },
  ];
  let IDX = Object.fromEntries(SP.map((s, i) => [s.id, i]));
  // per area class: the species and their shares (the flowers per m² at peak are the class table's, bw_phaeno.js)
  let MIX = {
    1: { gaensebluemchen: 0.5, weissklee: 0.3, loewenzahn: 0.2 },
    2: { gaensebluemchen: 0.25, weissklee: 0.2, loewenzahn: 0.2, schafgarbe: 0.15, rotklee: 0.2 },
    3: {
      wiesenkerbel: 0.22,
      schafgarbe: 0.18,
      rainfarn: 0.12,
      wegwarte: 0.14,
      wildemoehre: 0.14,
      loewenzahn: 0.1,
      rotklee: 0.1,
    },
    4: {
      margerite: 0.16,
      hahnenfuss: 0.16,
      glockenblume: 0.1,
      storchschnabel: 0.08,
      rotklee: 0.14,
      flockenblume: 0.1,
      wiesenkerbel: 0.08,
      loewenzahn: 0.08,
      schafgarbe: 0.06,
      herbstzeitlose: 0.04,
    },
    5: { loewenzahn: 0.35, weissklee: 0.3, gaensebluemchen: 0.2, hahnenfuss: 0.15 },
    6: {
      margerite: 0.18,
      hahnenfuss: 0.18,
      rotklee: 0.16,
      glockenblume: 0.1,
      loewenzahn: 0.12,
      schafgarbe: 0.1,
      flockenblume: 0.1,
      herbstzeitlose: 0.06,
    },
    7: { rainfarn: 0.25, schafgarbe: 0.2, wegwarte: 0.15, flockenblume: 0.15, wildemoehre: 0.15, wiesenkerbel: 0.1 },
    8: { hahnenfuss: 0.3, wiesenkerbel: 0.25, storchschnabel: 0.2, rainfarn: 0.25 },
    10: { mohn: 0.45, kornblume: 0.3, kamille: 0.25 },
    12: { wiesenkerbel: 0.5, rainfarn: 0.5 },
    15: { schafgarbe: 0.4, weissklee: 0.3, loewenzahn: 0.3 },
    16: { gaensebluemchen: 0.6, weissklee: 0.4 },
    17: { weissklee: 0.6, gaensebluemchen: 0.4 },
    18: { gaensebluemchen: 0.4, loewenzahn: 0.35, weissklee: 0.25 },
  };
  // ---------- the stand-in atlas (until the helper's): 8 × 8 cells of 128 px, drawn on a canvas ----------
  const CELLS = {}; // id → { bluete, samen, blatt } cell numbers
  function standin() {
    const N = 1024,
      C = 128,
      cv = document.createElement('canvas');
    cv.width = cv.height = N;
    const x = cv.getContext('2d');
    x.clearRect(0, 0, N, N);
    let cell = 0;
    const at = n => [(n % 8) * C, Math.floor(n / 8) * C];
    const stem = (ox, oy, top, lean = 0) => {
      x.strokeStyle = '#3f6a22';
      x.lineWidth = 3;
      x.beginPath();
      x.moveTo(ox + C / 2, oy + C);
      x.quadraticCurveTo(ox + C / 2 + lean * 0.5, oy + (C + top) / 2, ox + C / 2 + lean, oy + top);
      x.stroke();
      x.fillStyle = '#4a7a2a';
      for (const s of [-1, 1]) {
        x.beginPath();
        x.ellipse(ox + C / 2 + s * 10, oy + C - 18, 12, 4, s * 0.6, 0, 6.2832);
        x.fill();
      }
    };
    for (const s of SP) {
      const n = cell++,
        [ox, oy] = at(n),
        top = 18,
        cx = ox + C / 2,
        cy = oy + top;
      stem(ox, oy, top + 6);
      x.fillStyle = s.col;
      const umbel = ['wiesenkerbel', 'wildemoehre', 'schafgarbe'].includes(s.id),
        cup = ['glockenblume', 'herbstzeitlose', 'mohn'].includes(s.id);
      if (umbel) {
        for (let k = 0; k < 14; k++) {
          x.beginPath();
          x.arc(cx + Math.cos(k * 0.45) * 22 * (k / 14), cy + Math.sin(k * 0.9) * 5, 6, 0, 6.2832);
          x.fill();
        }
      } else if (cup) {
        x.beginPath();
        x.ellipse(cx, cy, 14, 18, 0, 0, 6.2832);
        x.fill();
      } else {
        for (let k = 0; k < 10; k++) {
          const a = (k / 10) * 6.2832;
          x.beginPath();
          x.ellipse(cx + Math.cos(a) * 12, cy + Math.sin(a) * 6, 9, 4, a, 0, 6.2832);
          x.fill();
        }
        x.fillStyle = ['margerite', 'gaensebluemchen', 'kamille'].includes(s.id) ? '#f0c020' : s.col;
        x.beginPath();
        x.arc(cx, cy, 7, 0, 6.2832);
        x.fill();
      }
      CELLS[s.id] = { bluete: n };
    }
    // the dandelion's seed head
    {
      const n = cell++,
        [ox, oy] = at(n);
      stem(ox, oy, 26);
      x.fillStyle = 'rgba(245,245,240,0.92)';
      x.beginPath();
      x.arc(ox + C / 2, oy + 22, 18, 0, 6.2832);
      x.fill();
      CELLS.loewenzahn.samen = n;
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return t;
  }
  // ---------- per day: each species' cell now and how much of it is out (0–1) ----------
  const NS = 64; // species at most
  const SPT = new THREE.DataTexture(new Float32Array(NS * 4), 1, NS, THREE.RGBAFormat, THREE.FloatType);
  SPT.magFilter = SPT.minFilter = THREE.NearestFilter;
  SPT.generateMipmaps = false;
  // per class: 8 entries (species index, cumulative share)
  const MXT = new THREE.DataTexture(new Float32Array(8 * 32 * 4), 8, 32, THREE.RGBAFormat, THREE.FloatType);
  MXT.magFilter = MXT.minFilter = THREE.NearestFilter;
  MXT.generateMipmaps = false;
  function mixes() {
    const D = MXT.image.data;
    D.fill(0);
    for (const [c, m] of Object.entries(MIX)) {
      const e = Object.entries(m).filter(([id]) => IDX[id] !== undefined),
        sum = e.reduce((a, [, w]) => a + w, 0) || 1;
      let acc = 0;
      e.slice(0, 8).forEach(([id, w], k) => {
        acc += w / sum;
        const o = (+c * 8 + k) * 4;
        D[o] = IDX[id];
        D[o + 1] = k === Math.min(7, e.length - 1) ? 1.0001 : acc;
      });
    }
    MXT.needsUpdate = true;
  }
  // how far into a window [a, b] the day is: rises over the first sixth, falls over the last (0 outside)
  const inWin = (w, d) => {
    let best = 0;
    for (const [a, b] of w || []) {
      if (d < a || d > b) continue;
      const k = Math.max(4, (b - a) / 6);
      best = Math.max(best, Math.min(1, (d - a) / k, (b - d) / k));
    }
    return best;
  };
  function day(doy) {
    S.doy = doy;
    const D = SPT.image.data;
    D.fill(0);
    SP.forEach((s, i) => {
      if (i >= NS) return;
      const o = i * 4;
      D[o] = -1;
      if (s.jahr) {
        // the species table: one plant's phases [frame, from, to(, share)] – the phase of the day and its cell (its height share)
        for (const ph of s.jahr) {
          const [fr, a, b, share] = ph;
          if (doy < a || doy > b + 0.999) continue;
          const f = s.frames && s.frames[fr];
          if (!f || !(f.cell >= 0)) break;
          D[o] = f.cell;
          D[o + 1] = s.h[0] * (f.k || 1);
          D[o + 2] = s.h[1] * (f.k || 1);
          D[o + 3] = Number.isFinite(share) ? share : 1;
          break;
        }
        return;
      }
      const c = CELLS[s.id] || {},
        bl = inWin(s.bluete, doy),
        sa = c.samen != null ? inWin(s.samen, doy) : 0;
      // the frame: bloom, else the seed head; nothing out: no cell
      const useSeed = sa > bl;
      D[o] = useSeed ? c.samen : bl > 0 ? c.bluete : -1;
      D[o + 1] = s.h[0];
      D[o + 2] = s.h[1];
      D[o + 3] = Math.max(bl, sa);
    });
    SPT.needsUpdate = true;
    markDirty();
  }
  // the helper's species table (BWARTEN, bewuchs/bw_arten.js): its wildflowers (heights, atlas frames, the year of one plant) and the
  // mixes of its areas (flowers per m² by species – the eight most frequent of each); its atlas from dist/bewuchs/blumen.png
  function fromArten(A, base) {
    if (!A || !A.blumen) return 0;
    const L = [];
    for (const [id, b] of Object.entries(A.blumen)) {
      if (!b || !Array.isArray(b.hoehe_m) || !Array.isArray(b.jahr)) continue;
      const frames = {};
      for (const [fr, q] of Object.entries(b.bilder || {}))
        if (q && Array.isArray(q.zelle))
          frames[fr] = { cell: q.zelle[1] * 8 + q.zelle[0], k: Number.isFinite(q.hoehe) ? q.hoehe : 1 };
      L.push({ id, h: b.hoehe_m.slice(0, 2), frames, jahr: b.jahr, col: b.farbe });
    }
    if (!L.length) return 0;
    SP.length = 0;
    SP.push(...L.slice(0, NS));
    IDX = Object.fromEntries(SP.map((s, i) => [s.id, i]));
    const M = {};
    for (const [c, e] of Object.entries(A.flaechen || {})) {
      const top = Object.entries((e && e.blumen) || {})
        .filter(([id, v]) => IDX[id] !== undefined && v > 0)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
      if (top.length) M[c] = Object.fromEntries(top);
    }
    if (M[1]) M[18] = M[1]; // the garden's own lawn: the lawn's flowers
    MIX = M;
    S.MIX = M;
    mixes();
    // the atlas
    if (base != null)
      new THREE.TextureLoader().load(base + 'bewuchs/blumen.png', t => {
        t.colorSpace = THREE.SRGBColorSpace;
        t.anisotropy = 4;
        atlas(t, null);
        markDirty();
      });
    if (Number.isFinite(S.doy)) day(S.doy);
    S.arten = true;
    return SP.length;
  }
  // ---------- the flower patch: F slots per tile, each two crossed quads ----------
  function patch(F, ring) {
    const nv = 8,
      pos = new Float32Array(F * nv * 3),
      aF = new Float32Array(F * nv * 4),
      aQ = new Float32Array(F * nv * 3),
      idx = new Uint32Array(F * 12);
    let a = 1234567 + F;
    const R = () => {
      a = (a * 16807) % 2147483647;
      return (a - 1) / 2147483646;
    };
    for (let f = 0; f < F; f++) {
      const fx = R(),
        fy = R(),
        rS = R(),
        rZ = R(),
        rot = R();
      for (let q = 0; q < 2; q++)
        for (let v = 0; v < 4; v++) {
          const o = f * nv + q * 4 + v;
          aF.set([fx, fy, rS, rZ], o * 4);
          aQ.set([v & 1 ? 1 : -1, v & 2 ? 1 : 0, q + rot * 0.5], o * 3);
        }
      for (let q = 0; q < 2; q++) {
        const b = f * nv + q * 4;
        idx.set([b, b + 1, b + 2, b + 1, b + 3, b + 2], f * 12 + q * 6);
      }
    }
    const g = new THREE.InstancedBufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aF', new THREE.BufferAttribute(aF, 4));
    g.setAttribute('aQ', new THREE.BufferAttribute(aQ, 3));
    g.setIndex(new THREE.BufferAttribute(idx, 1));
    g.setAttribute('iT', ring.P.iT); // the ring's tiles (shared: uploaded once)
    g.setAttribute('iU', ring.P.iU);
    g.instanceCount = 0;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e5);
    return g;
  }
  const VS = `uniform highp sampler2D tBwK, tBwG, tBwS, tBwM, tBwSp, tBwMx;
uniform vec4 uBwG, uBwS, uBwM, uBwP, uBwFr;
uniform vec4 wxSw; uniform vec2 wxSwD; uniform vec2 wxGr;
attribute vec4 aF; attribute vec3 aQ; attribute vec4 iT; attribute vec4 iU;
varying vec2 vFlUv;
float flHash( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
float flCode( vec2 q ) {
  vec2 s = ( q - uBwS.xy ) * uBwS.zw;
  if ( s.x > 0.0 && s.y > 0.0 && s.x < 1.0 && s.y < 1.0 ) return floor( texture( tBwS, s ).r * 255.0 + 0.5 );
  vec2 g = ( q - uBwG.xy ) * uBwG.zw;
  if ( g.x <= 0.0 || g.y <= 0.0 || g.x >= 1.0 || g.y >= 1.0 ) return 0.0;
  return floor( texture( tBwG, g ).r * 255.0 + 0.5 );
}
float flCutH( int c, vec2 q ) {
  vec4 k0 = texelFetch( tBwK, ivec2( 0, c ), 0 ), k1 = texelFetch( tBwK, ivec2( 1, c ), 0 ), k4 = texelFetch( tBwK, ivec2( 4, c ), 0 );
  float hs = k0.y, doy = uBwP.x, g = k0.z;
  float sc = k1.x > 0.5 && k1.x < 12.0 ? 17.0 : 65.0;
  vec2 fw = q / sc + 0.4 * vec2( sin( q.y * 0.043 ), sin( q.x * 0.037 ) );
  vec2 fc = floor( fw ) + float( c ) * 7.13;
  float fh = flHash( fc ), fs = flHash( fc + 17.7 );
  float h = hs;
  if ( k1.x > 0.5 ) {
    float a = k1.y + ( fh - 0.5 ) * 4.0;
    h = min( hs, k0.x + g * max( mod( doy - a + fh * k1.x, k1.x ), 0.05 ) );
  } else if ( k1.y > 0.5 ) {
    float off = ( fh - 0.5 ) * 2.0 * k1.w, last = -1.0;
    if ( doy >= k1.y + off && fs < k4.y ) last = k1.y + off;
    if ( k1.z > 0.5 && doy >= k1.z + off && fs < k4.z ) last = k1.z + off;
    if ( k4.x > 0.5 && doy >= k4.x + off && fs < k4.w ) last = k4.x + off;
    if ( last > 0.0 ) h = min( hs, k0.x + g * ( doy - last ) );
  }
  return h;
}
void flPlant( out vec3 P ) {
  float Sz = iU.z;
  vec2 t0 = iT.xy;
  float th = flHash( t0 * 0.913 + 1.7 );
  vec2 b = fract( aF.xy + vec2( th, flHash( t0 + 9.1 ) ) );
  vec2 q = t0 + b * Sz;
  float zr = mix( mix( iT.z, iT.w, b.x ), mix( iU.x, iU.y, b.x ), b.y );
  P = vec3( q.x, zr - 0.05, - q.y );
  vFlUv = vec2( 0.0 );
  float code = flCode( q );
  int cls = int( mod( code, 32.0 ) );
  if ( cls == 0 ) return;
  vec4 k3 = texelFetch( tBwK, ivec2( 3, cls ), 0 );
  // slots used: flowers per m² at peak × the tile's area / slots, by the ring's fade
  vec2 cm = vec2( cameraPosition.x, - cameraPosition.z );
  float d = distance( q, cm );
  float fade = 1.0 - smoothstep( uBwFr.x, uBwFr.y, d );
  float rS = fract( aF.z + th * 3.3 ), rZ = fract( aF.w + th * 5.7 );
  if ( rZ > k3.z * Sz * Sz / uBwFr.z * fade * uBwP.y ) return;
  // the species from the class's mix
  int sp = -1;
  for ( int k = 0; k < 8; k++ ) { vec4 m = texelFetch( tBwMx, ivec2( k, cls ), 0 ); if ( m.y <= 0.0 ) break; if ( rS <= m.y ) { sp = int( m.x + 0.5 ); break; } }
  if ( sp < 0 ) return;
  vec4 s = texelFetch( tBwSp, ivec2( 0, sp ), 0 );
  // out now? (the amount thins them at the start and the end of their time); not where the grass was just cut
  if ( s.x < 0.0 || fract( rS * 17.1 ) > s.w ) return;
  float hf = mix( s.y, s.z, fract( rZ * 13.7 ) );
  float hc = flCutH( cls, q );
  if ( hc < hf * 0.6 && hf > 0.12 ) return;
  hf = min( hf, max( hc * 1.4, 0.06 ) );
  // the two quads, turned; the head sways with the wind
  float a = ( aQ.z + th ) * 3.1416;
  vec2 dir = vec2( cos( a ), sin( a ) );
  if ( aQ.z >= 1.0 ) dir = vec2( - dir.y, dir.x );
  float t = aQ.y;
  vec2 wd = vec2( wxSwD.x, - wxSwD.y );
  float wb = wxGr.x * ( 0.7 + 0.3 * sin( wxSw.z * 1.9 - dot( q, wd ) * 0.7 ) ) + wxGr.y * sin( wxSw.z * 7.3 + q.x * 3.1 + q.y * 2.3 );
  vec2 xy = q + dir * aQ.x * hf * 0.5 + wd * wb * hf * t * t;
  P = vec3( xy.x, zr + hf * t, - xy.y );
  float cell = s.x, col = mod( cell, 8.0 ), row = floor( cell / 8.0 );
  vFlUv = vec2( ( col + ( aQ.x * 0.5 + 0.5 ) ) / 8.0, 1.0 - ( row + 1.0 - t ) / 8.0 );
}
`;
  const U = {
    tBwSp: { value: SPT },
    tBwMx: { value: MXT },
    map: null,
  };
  function material(F) {
    const m = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: U.map,
      alphaTest: 0.5,
      side: THREE.DoubleSide,
      roughness: 0.75,
      metalness: 0,
      envMapIntensity: 0.6,
    });
    m.userData.leak = true;
    const ringU = { uBwFr: { value: new THREE.Vector4(10, 14, F, 0) } };
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, BWHALM.U, BWKARTE.U, U, ringU, {
        wxSw: WXWIND.U.wxSw,
        wxSwD: WXWIND.U.wxSwD,
        wxGr: WXWIND.UG.wxGr,
      });
      sh.vertexShader =
        VS +
        sh.vertexShader
          .replace('#include <beginnormal_vertex>', 'vec3 objectNormal = vec3( 0.0, 1.0, 0.0 );')
          .replace('#include <begin_vertex>', 'vec3 transformed; flPlant( transformed );\n  vMapUv = vFlUv;');
      sh.fragmentShader = sh.fragmentShader.replace(
        '#include <normal_fragment_begin>',
        'float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;\n  vec3 normal = normalize( vNormal );\n  vec3 nonPerturbedNormal = normal;'
      );
    };
    m.customProgramCacheKey = () => 'bwblume';
    m.userData.ringU = ringU;
    return patchSV(m);
  }
  // ---------- on the rings of BWHALM ----------
  function build() {
    for (const M of S.meshes) {
      scene.remove(M.mesh);
      M.mesh.geometry.dispose();
      M.mesh.material.dispose();
    }
    S.meshes = [];
    if (!U.map) U.map = standin();
    for (const R of BWHALM.rings) {
      if (R.tag === 'dicht') continue;
      const F = R.near ? 10 : 24,
        g = patch(F, R),
        mat = material(F),
        mesh = new THREE.Mesh(g, mat);
      mat.map = U.map;
      // the near ring's flowers to its edge, the mid ring's from there out to ~30 m (they thin out)
      if (R.near) mat.userData.ringU.uBwFr.value.set(R.r * 0.75, R.r, F, 0);
      else mat.userData.ringU.uBwFr.value.set(Math.min(R.r, 26) * 0.8, Math.min(R.r, 26), F, 0);
      mesh.frustumCulled = false;
      mesh.castShadow = false;
      mesh.receiveShadow = true;
      mesh.userData.noMerge = true;
      mesh.name = 'bewuchs-blumen-' + R.tag;
      // the tiles of the ring: as many as it has now
      mesh.onBeforeRender = () => {
        g.instanceCount = R.P.g.instanceCount;
      };
      scene.add(mesh);
      S.meshes.push({ mesh, R, F });
    }
    mixes();
    if (Number.isFinite(S.doy)) day(S.doy);
    markDirty();
  }
  function atlas(tex, cells) {
    if (tex) {
      U.map = tex;
      for (const M of S.meshes) M.mesh.material.map = tex;
      S.standin = false;
    }
    if (cells) for (const [id, c] of Object.entries(cells)) if (CELLS[id] || IDX[id] !== undefined) CELLS[id] = c;
    if (Number.isFinite(S.doy)) day(S.doy);
  }
  const stats = () => ({
    rings: S.meshes.map(M => ({ tag: M.R.tag, tiles: M.R.n, slots: M.R.n * M.F })),
    species: Object.fromEntries(SP.map((s, i) => [s.id, +SPT.image.data[i * 4 + 3].toFixed(2)])),
    standin: S.standin,
  });
  Object.assign(S, { build, day, atlas, stats, fromArten, SP, MIX, CELLS, U });
  BWHALM.onBuild = build;
  return S;
})();
if (typeof window !== 'undefined') window.BWBLUME = BWBLUME;
