// ===================== V16e Ratscher after photos: facades, roofs and chimneys of the village buildings (VILLAGE) =====================
// The 337 buildings of world/ratscher.js (OSM footprints; heights and roof shapes fitted to the surface model) get the look of Ratscher in
// the photographs (Wikimedia Commons: Aschroet 2026 CC0, Störfix 2013 CC BY-SA 3.0 DE, Michael Köhler 1986): slate cladding – often only on
// the upper floor or the gables, sometimes with white ornament bands –, half-timbering in dark brown or ox-blood red on white, plaster in
// pastel tones, barns of weathered boards on a masonry plinth, halls of sheet metal. Windows with white frames, two casements and a transom,
// sills and reveals with depth (the reveal is found along the view ray, no extra geometry), curtains, doors towards the street, gates; at
// night some windows are lit. Roofs are rebuilt from the fitted ones with overhanging eaves and verges, a fascia and soffit, ridge tiles,
// gutters and downpipes, chimneys; clay tiles in the colour the orthophoto shows for that building (else fibre cement, sheet metal, slate,
// bitumen). Per building: S.bld (facades, eave, roof, style). Landmarks, street lamps, near details: world/village_props.js.
import * as THREE from 'three';
import { LATE } from '../core/late.js';
import { scene } from '../core/head.js';
import { markDirty, texFile, texFileOf, TEXMAN, whenLoaded } from '../core/assets.js';
import { RATSCHER } from './ratscher.js';
import { ROADS } from './roads.js';
import { KERN } from '../core/kern.js';
export const VILLAGE = (() => {
  const S = { on: false, ready: false, bld: [], byId: new Map(), meshes: [], U: null, ANGER: [222, -108] };
  if (!window.RATSCHER || !RATSCHER.on) return S;
  const hh = n => {
    const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const tex = (k, m, srgb) => (window.TEXMAN && TEXMAN[k] ? texFile(texFileOf(k, m), srgb).tex : null);
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    linC = (c, k = 1) => c.map(v => lin(v) * k);
  // ---- styles; colours as seen in the photos (sRGB, made linear below) ----
  const ST = {
    PLASTER: 0,
    MODERN: 1,
    SLATE: 2,
    SLATE_UP: 3,
    SLATE_GABLE: 4,
    FW: 5,
    FW_UP: 6,
    BARN: 7,
    BARN_FULL: 8,
    BRICK: 9,
    HALL: 10,
    SHED: 11,
    SCHOOL: 12,
  };
  S.ST = ST;
  const PASTEL = [
    [0.93, 0.89, 0.78],
    [0.93, 0.84, 0.56],
    [0.92, 0.77, 0.63],
    [0.8, 0.88, 0.76],
    [0.95, 0.94, 0.91],
    [0.84, 0.83, 0.8],
    [0.93, 0.81, 0.77],
    [0.87, 0.76, 0.53],
    [0.87, 0.9, 0.86],
    [0.96, 0.92, 0.85],
  ].map(c => linC(c, 0.82));
  const BOARDS = [
      [0.52, 0.48, 0.43],
      [0.45, 0.36, 0.28],
      [0.58, 0.55, 0.5],
    ],
    SHEET = [
      [0.8, 0.81, 0.8],
      [0.52, 0.6, 0.52],
      [0.72, 0.68, 0.62],
      [0.58, 0.26, 0.2],
    ].map(c => linC(c, 0.85));
  // ---- the buildings of world/ratscher.js: walls as quads [A foot, A top, B foot, B top], u around the footprint, v above the foot ----
  function analyse() {
    const g = RATSCHER.bld[0].geometry,
      P = g.attributes.position.array,
      W = g.attributes.aW.array,
      nq = g.attributes.position.count / 4,
      B = new Map();
    for (let q = 0; q < nq; q++) {
      const s = q * 4,
        wv = Math.round(W[s * 4 + 3]),
        id = wv >> 2;
      let b = B.get(id);
      if (!b) B.set(id, (b = { id, typ: wv & 3, quads: [] }));
      const ax = P[s * 3],
        ay = -P[s * 3 + 2],
        bx = P[(s + 2) * 3],
        by = -P[(s + 2) * 3 + 2];
      b.quads.push({
        q,
        ax,
        ay,
        bx,
        by,
        ta: W[s * 4 + 2],
        tb: W[(s + 2) * 4 + 2],
        foot: P[s * 3 + 1] - W[s * 4 + 1],
        len: Math.hypot(bx - ax, by - ay),
      });
    }
    for (const b of B.values()) {
      facades(b);
      S.bld.push(b);
      S.byId.set(b.id, b);
    }
  }
  // consecutive collinear quads form one facade (a gable wall comes in two quads that meet at the apex)
  function facades(b) {
    const Q = b.quads,
      F = [],
      dir = q => Math.atan2(q.by - q.ay, q.bx - q.ax),
      same = (a, c) =>
        Math.abs(Math.atan2(Math.sin(dir(a) - dir(c)), Math.cos(dir(a) - dir(c)))) < 0.07 &&
        Math.hypot(a.bx - c.ax, a.by - c.ay) < 0.05;
    for (const q of Q) {
      const f = F[F.length - 1];
      if (f && same(f.qs[f.qs.length - 1], q)) f.qs.push(q);
      else F.push({ qs: [q] });
    }
    if (F.length > 1 && same(F[F.length - 1].qs[F[F.length - 1].qs.length - 1], F[0].qs[0])) {
      const l = F.pop();
      F[0].qs = l.qs.concat(F[0].qs);
    }
    b.foot = Q.reduce((m, q) => Math.min(m, q.foot), 1e9);
    b.fac = F;
    let area = 0,
      cx = 0,
      cy = 0,
      n = 0,
      tmin = 1e9,
      tmax = -1e9;
    for (const f of F) {
      const a = f.qs[0],
        z = f.qs[f.qs.length - 1];
      f.ax = a.ax;
      f.ay = a.ay;
      f.bx = z.bx;
      f.by = z.by;
      f.L = f.qs.reduce((s, q) => s + q.len, 0);
      const dx = (f.bx - f.ax) / (f.L || 1),
        dy = (f.by - f.ay) / (f.L || 1);
      f.dx = dx;
      f.dy = dy;
      // the top line along the facade: start, highest point (apex) and end
      let u = 0,
        uA = f.L / 2,
        tA = -1e9;
      f.t0 = a.ta;
      f.t1 = z.tb;
      for (const q of f.qs) {
        q.u0 = u;
        if (q.ta > tA + 0.01) {
          tA = q.ta;
          uA = u;
        }
        u += q.len;
        if (q.tb > tA + 0.01) {
          tA = q.tb;
          uA = u;
        }
      }
      const ends = Math.max(f.t0, f.t1);
      f.kind = tA > ends + 0.6 && uA > 0.3 && uA < f.L - 0.3 ? 'gable' : Math.abs(f.t0 - f.t1) > 0.6 ? 'slope' : 'eave';
      if (f.kind !== 'gable') {
        uA = f.L / 2;
        tA = (f.t0 + f.t1) / 2;
      }
      f.uA = uA;
      f.tA = tA;
      area += a.ax * z.by - z.bx * a.ay;
      cx += a.ax + z.bx;
      cy += a.ay + z.by;
      n += 2;
      tmin = Math.min(tmin, f.t0, f.t1);
      tmax = Math.max(tmax, tA, f.t0, f.t1);
    }
    b.area = Math.abs(area) / 2;
    b.cx = cx / n;
    b.cy = cy / n;
    b.eave = tmin;
    b.top = tmax;
    const sgn = area > 0 ? 1 : -1;
    for (const f of F) {
      f.nx = f.dy * sgn;
      f.ny = -f.dx * sgn;
    }
  } // outward normals (the walls run either way round)
  // ---- how close to a road a facade looks (doors and gates go there): the road map ahead of its middle ----
  function roadScore(f) {
    if (!window.ROADS || !ROADS.edge) return 0;
    const mx = (f.ax + f.bx) / 2,
      my = (f.ay + f.by) / 2;
    let s = -9;
    for (const d of [2.5, 5, 8, 12]) s = Math.max(s, ROADS.edge(mx + f.nx * d, my + f.ny * d) - d * 0.15);
    return s;
  }
  // ---- the colour of each roof in the orthophoto (near photo at ~1 m per pixel, else the inner one) ----
  function photoSampler() {
    const M = window.GEOMAN,
      xf = M.xf,
      mk = (t, o, n) => {
        const img = t && t.image;
        if (!img || !img.width) return null;
        const c = document.createElement('canvas');
        c.width = c.height = n;
        const x = c.getContext('2d', { willReadFrequently: true });
        x.drawImage(img, 0, 0, n, n);
        return { d: x.getImageData(0, 0, n, n).data, n, o };
      };
    const L = [mk(RATSCHER.tex.near, M.tex.near, 1024), mk(RATSCHER.tex.inner, M.tex.inner, 1024)].filter(Boolean);
    return (x, y) => {
      const E = xf.a * x - xf.b * y + xf.ex,
        N = xf.b * x + xf.a * y + xf.ey;
      for (const l of L) {
        const u = (E - l.o.e0) / l.o.w,
          v = (N - l.o.n0) / l.o.w;
        if (u < 0.002 || v < 0.002 || u > 0.998 || v > 0.998) continue;
        const i = (Math.floor((1 - v) * l.n) * l.n + Math.floor(u * l.n)) * 4;
        return [l.d[i] / 255, l.d[i + 1] / 255, l.d[i + 2] / 255];
      }
      return null;
    };
  }
  function hsl(c) {
    const mx = Math.max(...c),
      mn = Math.min(...c),
      l = (mx + mn) / 2,
      d = mx - mn;
    if (d < 1e-4) return [0, 0, l];
    const s = d / (1 - Math.abs(2 * l - 1));
    const h = mx === c[0] ? ((c[1] - c[2]) / d) % 6 : mx === c[1] ? (c[2] - c[0]) / d + 2 : (c[0] - c[1]) / d + 4;
    return [(h * 60 + 360) % 360, s, l];
  }
  // ---- style of a building: type, size, age (near the old centre around the Anger more slate and half-timbering), chance ----
  function styleOf(b) {
    const k = hh(b.id * 3.7 + 1),
      k2 = hh(b.id + 11.3),
      dC = Math.hypot(b.cx - S.ANGER[0], b.cy - S.ANGER[1]),
      old = dC < 330 ? 1 - dC / 330 : 0;
    const o = {
      style: ST.PLASTER,
      col: PASTEL[Math.floor(k2 * PASTEL.length)],
      timber: k2 < 0.6 ? 0 : k2 < 0.85 ? 1 : 2,
      frame: hh(b.id + 5) < 0.86 ? 0 : 1,
      door: Math.floor(hh(b.id + 9) * 6),
      shut: Math.floor(hh(b.id + 13) * 3),
      shutters: false,
      orn: false,
      raised: hh(b.id + 2) < 0.6,
      sp: 2.7 + hh(b.id + 4) * 0.5,
    };
    if (b.id === 215) {
      Object.assign(o, {
        style: ST.SCHOOL,
        col: linC([0.95, 0.94, 0.9], 0.82),
        timber: 1,
        frame: 0,
        door: 1,
        sp: 2.25,
        raised: false,
      });
      return o;
    } // the old school (1828): photos 2013, 2026
    if (b.typ === 2) {
      o.style = ST.SHED;
      o.col = linC(BOARDS[Math.floor(k * 3)], 0.8);
      o.sp = 3.2;
      return o;
    }
    if (b.typ === 1) {
      if (b.area > 520) {
        o.style = ST.HALL;
        o.col = SHEET[Math.floor(k * 4)];
        o.sp = 4.5;
      } else {
        o.style = k < 0.55 ? ST.BARN : k < 0.82 ? ST.BARN_FULL : ST.BRICK;
        o.col = o.style === ST.BRICK ? linC([0.62, 0.33, 0.26]) : linC(BOARDS[Math.floor(k2 * 3)], 0.8);
        o.sp = 3.4;
      }
      return o;
    }
    const r = k * (0.55 + 0.45 * (1 - old)); // houses: the older look near the centre
    if (dC < 420) {
      if (r < 0.12) o.style = ST.SLATE;
      else if (r < 0.3) o.style = ST.SLATE_UP;
      else if (r < 0.4) o.style = ST.FW_UP;
      else if (r < 0.46) o.style = ST.FW;
      else if (r < 0.58) o.style = ST.SLATE_GABLE;
      else o.style = ST.PLASTER;
    } else o.style = r < 0.5 ? ST.MODERN : r < 0.62 ? ST.SLATE_GABLE : ST.PLASTER;
    if (o.style === ST.SLATE || o.style === ST.SLATE_UP) o.orn = hh(b.id + 17) < 0.35;
    if (o.style === ST.PLASTER || o.style === ST.FW_UP) o.shutters = hh(b.id + 19) < 0.18;
    if (o.style === ST.MODERN) {
      o.col = PASTEL[[0, 4, 4, 9, 1, 5][Math.floor(k2 * 6)]];
      o.sp = 3.3 + hh(b.id + 4) * 0.4;
      o.frame = 0;
    }
    return o;
  }
  // ---- walls: the facade shader (linear colours) ----
  const WGLSL = `varying vec4 vW, vV, vG, vD, vC; varying vec3 vTanV;
    uniform sampler2D tPlas, tSlate, tWood; uniform float uNight, uWinP, uWinK; uniform vec4 uLampV[ 8 ];   // the nearest street lamps (view space, intensity)
    float vh( float n ) { return fract( sin( n * 12.9898 + 4.1 ) * 43758.5453 ); }
    float vh2( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
    float bnd( float x, float a, float b, float w ) { return clamp( ( x - a ) / w + 0.5, 0.0, 1.0 ) - clamp( ( x - b ) / w + 0.5, 0.0, 1.0 ); }   // 1 in [a, b], edges soft over w
    float topAt( float u ) { return u < vG.z ? mix( vG.x, vG.y, clamp( u / max( vG.z, 0.01 ), 0.0, 1.0 ) ) : mix( vG.y, vG.w, clamp( ( u - vG.z ) / max( vV.y - vG.z, 0.01 ), 0.0, 1.0 ) ); }
    vec3 timberCol( float i ) { return i < 0.5 ? vec3( 0.055, 0.032, 0.02 ) : i < 1.5 ? vec3( 0.27, 0.014, 0.018 ) : vec3( 0.022, 0.02, 0.018 ); }
    vec3 doorCol( float i ) { return i < 0.5 ? vec3( 0.07, 0.035, 0.018 ) : i < 1.5 ? vec3( 0.17, 0.08, 0.035 ) : i < 2.5 ? vec3( 0.02, 0.075, 0.035 ) : i < 3.5 ? vec3( 0.09, 0.19, 0.42 ) : i < 4.5 ? vec3( 0.70, 0.69, 0.66 ) : vec3( 0.25, 0.02, 0.02 ); }
    vec3 shutCol( float i ) { return i < 0.5 ? vec3( 0.025, 0.09, 0.045 ) : i < 1.5 ? vec3( 0.10, 0.05, 0.025 ) : vec3( 0.19, 0.20, 0.20 ); }
    vec3 texN( sampler2D t, vec2 p ) { return texture2D( t, p ).rgb / max( textureLod( t, vec2( 0.5 ), 12.0 ).rgb, vec3( 0.01 ) ); }   // a photo texture with mean 1
    float gWin = 0.0, gGlass = 0.0, gLit = 0.0, gNrmK = 0.0; vec3 gNrm = vec3( 0.0 );`;
  function wallMat(U) {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0, envMapIntensity: 0.75 });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader =
        'attribute vec4 aW, aV, aG, aD, aC; attribute vec3 aTan; varying vec4 vW, vV, vG, vD, vC; varying vec3 vTanV;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
        vW = aW; vV = aV; vG = aG; vD = aD; vC = aC; vTanV = normalize( ( modelViewMatrix * vec4( aTan, 0.0 ) ).xyz );`
        );
      sh.fragmentShader =
        WGLSL +
        '\n' +
        sh.fragmentShader
          .replace(
            '#include <map_fragment>',
            `#include <map_fragment>
        vec3 vCol;
        {
        float uF = vV.x, LF = vV.y, eave = vV.z, st = floor( vV.w + 0.5 ), v = vW.y;   // codes are rounded: interpolated integers come out a hair off (flags would flicker per pixel)
        float bid = floor( floor( vW.w + 0.5 ) / 4.0 ), k2 = vh( bid + 7.0 );
        float fl = floor( vD.w + 0.5 ), isGable = mod( fl, 2.0 ), shut = mod( floor( fl / 2.0 ), 2.0 ), orn = mod( floor( fl / 4.0 ), 2.0 ), raised = mod( floor( fl / 8.0 ), 2.0 );
        float pk = floor( vC.a + 0.5 ), tIdx = mod( pk, 4.0 ), fIdx = mod( floor( pk / 4.0 ), 4.0 ), dIdx = mod( floor( pk / 16.0 ), 8.0 ), sIdx = floor( pk / 128.0 );
        vec2 fw = max( vec2( fwidth( uF ), fwidth( v ) ), vec2( 1e-4 ) ); float px = max( fw.x, fw.y ), aaF = smoothstep( 0.012, 0.05, px ), aaW = smoothstep( 0.16, 0.42, px );
        bool school = st > 11.5, house = st < 6.5 || school, barn = st > 6.5 && st < 9.5, hall = st > 9.5 && st < 10.5, shed = st > 10.5 && st < 11.5;
        // storeys and openings: bays evenly along the facade; a window only where it fits under the eave or the gable line
        float plH = house ? ( raised > 0.5 ? 0.6 : 0.35 ) : 0.0, stH = school ? 3.4 : 2.75;
        float ww = school ? 1.0 : st == 1.0 ? 1.25 : 0.95, wh = school ? 1.5 : st == 1.0 ? 1.4 : 1.3, sill = school ? 0.95 : 0.85;
        if ( barn ) { ww = 0.75; wh = 0.6; sill = 1.6; stH = 99.0; } if ( hall ) { ww = vD.z * 0.7; wh = 0.8; sill = 3.2; stH = 99.0; } if ( shed ) { ww = 0.6; wh = 0.5; sill = 1.4; stH = 99.0; }
        float sp = vD.z, nb = max( 1.0, floor( ( LF - 0.6 ) / sp ) ), bw = LF / nb, bi = clamp( floor( uF / bw ), 0.0, nb - 1.0 ), bc = ( bi + 0.5 ) * bw;
        if ( LF < ww + 0.7 ) nb = 0.0;
        float fi = max( 0.0, floor( ( v - plH ) / stH ) ), fb = plH + fi * stH;
        if ( fi < 0.5 && house ) { float fit = eave - 0.25 - fb - sill; if ( fit < wh && fit > 0.75 ) wh = fit; else if ( fit <= 0.75 ) { sill = max( 0.5, eave - 0.25 - fb - 0.9 ); wh = 0.9; } }
        vec2 lo = vec2( bc - ww * 0.5, fb + sill ), hi = vec2( bc + ww * 0.5, fb + sill + wh );
        bool attic = fb + sill > eave - 0.2;
        if ( attic ) { ww = 0.8; wh = 1.0; lo.x = bc - 0.4; hi.x = bc + 0.4; hi.y = lo.y + 1.0; }
        float room = min( topAt( lo.x ), topAt( hi.x ) ) - hi.y;   // space left up to the top line
        float win = nb > 0.5 && room > ( attic ? 0.4 : 0.18 ) && ( !attic || isGable > 0.5 ) ? 1.0 : 0.0;
        if ( barn || shed ) win *= step( 0.45, vh( bid * 3.1 + bi * 1.7 ) );   // barns: a few small windows
        // the door (house), the gate (barn, hall, shed)
        float dW = vD.y, dU = vD.x, dH = house ? 2.15 : hall ? 4.2 : shed ? 2.1 : 3.3, d0 = house ? plH : 0.0;
        bool door = dW > 0.0 && abs( uF - dU ) < dW * 0.5 && v > d0 - 0.05 && v < d0 + dH;
        if ( dW > 0.0 && abs( bc - dU ) < max( bw * 0.5, dW * 0.5 + ww * 0.5 + 0.1 ) && fi < 0.5 ) win = 0.0;
        // ---- the wall itself ----
        bool upper = v > plH + stH - 0.15, inGable = isGable > 0.5 && v > eave - 0.02;
        float sty = st; if ( st == 3.0 && !upper ) sty = 0.0; if ( st == 6.0 && !upper ) sty = 0.0; if ( st == 4.0 ) sty = inGable ? 2.0 : 0.0; if ( school ) sty = inGable ? 2.0 : 5.0;
        vec3 base = vC.rgb, c; vec2 tq = vec2( uF, v );
        if ( sty == 2.0 || sty == 3.0 ) {   // slate: small shingles in offset rows, each a little different; white ornament bands
          float rh = 0.17, sw = 0.21, r = floor( v / rh ), off = mod( r, 2.0 ) * 0.5, cc = floor( uF / sw + off ); vec2 f = vec2( fract( uF / sw + off ), fract( v / rh ) );
          float edge = 1.0 - smoothstep( 0.0, 0.1 + 0.22 * ( 1.0 - 4.0 * ( f.x - 0.5 ) * ( f.x - 0.5 ) ), f.y );   // the rounded lower edge of the shingle above
          vec3 sl = vec3( 0.13, 0.133, 0.145 ) * ( 0.8 + 0.4 * vh2( vec2( r, cc ) ) ) * texN( tSlate, tq * 0.35 ).r;
          c = mix( sl * mix( 1.0 - 0.5 * edge, 1.0, aaF ), vec3( 0.11, 0.115, 0.13 ), aaF );
          if ( orn > 0.5 ) { float ob = mod( v - plH - 0.1, stH ), dz = abs( fract( uF / 0.84 ) - 0.5 ) * 2.0 + abs( ob - 0.36 ) / 0.3;   // a row of white diamonds under each floor line
            float o = ( 1.0 - smoothstep( 0.62 - px * 3.0, 0.62 + px * 3.0, dz ) ) * bnd( ob, 0.1, 0.62, fw.y ); if ( inGable ) o *= step( 0.5, topAt( uF ) - v ); c = mix( c, vec3( 0.62, 0.62, 0.60 ), o * ( 1.0 - aaF ) ); c = mix( c, c + vec3( 0.06 ) * bnd( ob, 0.1, 0.62, fw.y ), aaF * ( 1.0 - aaW ) ); } }
        else if ( sty == 5.0 || sty == 6.0 ) {   // half-timbering: sill beams and plates at the floors, rails at sill and lintel, posts beside the windows, braces in the end bays
          float tw = 0.17, flv = mod( v - plH, stH ), tim = 0.0;
          tim = max( tim, 1.0 - step( tw, flv ) ); tim = max( tim, step( stH - tw * 0.8, flv ) );
          tim = max( tim, bnd( flv, sill - tw, sill, fw.y ) ); tim = max( tim, bnd( flv, sill + wh, sill + wh + tw, fw.y ) );
          tim = max( tim, bnd( abs( uF - bc ), ww * 0.5, ww * 0.5 + tw, fw.x ) );
          tim = max( tim, step( uF, tw ) + step( LF - tw, uF ) ); tim = max( tim, bnd( abs( uF - bi * bw ), 0.0, tw * 0.5, fw.x ) );
          float e0 = bc - ww * 0.5, fx = bi < 0.5 ? uF / max( e0, 0.3 ) : bi > nb - 1.5 ? ( LF - uF ) / max( LF - bc - ww * 0.5, 0.3 ) : -1.0;   // braces in the end bays
          if ( fx > 0.0 && fx < 1.0 && flv > tw && flv < stH - tw ) { float dg = abs( ( flv - tw ) / ( stH - 2.0 * tw ) - fx ) * min( stH, max( e0, 0.3 ) ); tim = max( tim, step( dg, tw * 0.6 ) ); }
          if ( inGable ) { float tp = topAt( uF ); tim = max( tim, step( tp - v, tw * 1.2 ) ); tim = max( tim, bnd( v, eave + 2.0, eave + 2.0 + tw, fw.y ) * step( 0.3, tp - v ) );
            tim = max( tim, bnd( mod( uF, 1.25 ), 0.0, tw, fw.x ) ); }
          vec3 inf = vec3( 0.70, 0.69, 0.65 ), tb = timberCol( tIdx ) * ( 0.85 + 0.3 * vh2( floor( tq * 3.0 ) ) );
          float aaT = smoothstep( 0.07, 0.18, px ); c = mix( inf * ( 0.92 + 0.08 * texN( tPlas, tq * 0.5 ).r ), tb, tim * ( 1.0 - aaT ) ); c = mix( c, mix( inf, tb, 0.3 ), aaT ); }
        else if ( barn || shed ) {   // weathered vertical boards; barns on a masonry plinth
          float bwd = 0.2, bi2 = floor( uF / bwd ), gap = 1.0 - bnd( fract( uF / bwd ), 0.03, 0.97, fw.x / bwd );
          vec3 wd = texN( tWood, vec2( uF / 1.5, v / 1.5 ) ) * base * ( 0.8 + 0.4 * vh( bi2 + bid ) );
          c = mix( wd * ( 1.0 - 0.6 * gap * ( 1.0 - aaF ) ), base * 0.85, aaW * 0.5 );
          float pl = st == 7.0 ? 2.2 : 0.45; if ( v < pl ) c = st == 7.0 ? vec3( 0.32, 0.31, 0.29 ) * ( 0.9 + 0.1 * texN( tPlas, tq * 0.5 ).r ) : vec3( 0.24, 0.23, 0.21 ); }
        else if ( st == 9.0 ) {   // brick, running bond
          float ch = 0.083, row = floor( v / ch ), bu = uF / 0.25 + mod( row, 2.0 ) * 0.5, mor = max( 1.0 - bnd( fract( v / ch ), 0.07, 1.0, fw.y / ch ), 1.0 - bnd( fract( bu ), 0.04, 1.0, fw.x / 0.25 ) );
          vec3 bk = base * ( 0.75 + 0.5 * vh2( vec2( row, floor( bu ) ) ) ); c = mix( mix( bk, vec3( 0.36, 0.34, 0.31 ), mor * ( 1.0 - aaF ) ), base, aaF * 0.6 ); }
        else if ( hall ) { c = base * ( 0.9 + 0.1 * sin( uF * 31.4 ) * ( 1.0 - aaF ) ); if ( v < 0.5 ) c = vec3( 0.26, 0.25, 0.23 ); }   // trapezoidal sheet, ribs every 0.2 m
        else { c = base * ( 0.9 + 0.1 * texN( tPlas, tq * 0.5 ).r ); if ( v < plH ) c = vec3( 0.24, 0.23, 0.21 ) * ( 0.9 + 0.1 * texN( tPlas, tq * 0.7 ).g ); }   // plaster, a stone plinth
        c *= 0.8 + 0.2 * smoothstep( -0.3, 1.4, v );   // darker at the foot (splash, shade)
        // ---- shutters and sills, in the wall plane ----
        if ( win > 0.5 && aaW < 0.99 ) {
          if ( shut > 0.5 && !attic ) { float s1 = bnd( uF, lo.x - ww * 0.5, lo.x - 0.03, fw.x ) + bnd( uF, hi.x + 0.03, hi.x + ww * 0.5, fw.x ), s2 = bnd( v, lo.y, hi.y, fw.y );
            c = mix( c, shutCol( sIdx ) * ( 0.8 + 0.2 * step( 0.5, fract( v / 0.07 ) ) ), s1 * s2 * ( 1.0 - aaW ) ); }
          float sx = bnd( uF, lo.x - 0.07, hi.x + 0.07, fw.x ); c = mix( c, vec3( 0.42, 0.42, 0.41 ), sx * bnd( v, lo.y - 0.06, lo.y, fw.y ) * ( 1.0 - aaW ) );
          c *= 1.0 - 0.4 * sx * bnd( v, lo.y - 0.17, lo.y - 0.06, fw.y ) * ( 1.0 - aaW ); }
        // ---- openings with depth: window, door, gate – along the view ray: the reveal, or the glass / the leaf behind it ----
        float inWin = win * bnd( uF, lo.x, hi.x, fw.x ) * bnd( v, lo.y, hi.y, fw.y );
        if ( door ) { lo = vec2( dU - dW * 0.5, d0 ); hi = vec2( dU + dW * 0.5, d0 + dH ); inWin = bnd( uF, lo.x, hi.x, fw.x ) * bnd( v, lo.y, hi.y, fw.y ); }
        if ( inWin > 0.01 && aaW < 0.999 ) {
          vec3 Vd = normalize( -vViewPosition ), Nv = normalize( vNormal ), Tv = normalize( vTanV ), Uv = normalize( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
          float dn = max( 0.08, -dot( Vd, Nv ) ); vec2 sl2 = vec2( dot( Vd, Tv ), dot( Vd, Uv ) ) / dn;   // sideways metres per metre into the wall
          float dep = door ? ( house ? 0.2 : 0.08 ) : ( sty == 5.0 ? 0.07 : sty == 2.0 ? 0.1 : 0.15 ); vec2 p = vec2( uF, v ), q = p + sl2 * dep;
          float tU = sl2.x > 1e-4 ? ( hi.x - p.x ) / sl2.x : sl2.x < -1e-4 ? ( lo.x - p.x ) / sl2.x : 1e9, tV = sl2.y > 1e-4 ? ( hi.y - p.y ) / sl2.y : sl2.y < -1e-4 ? ( lo.y - p.y ) / sl2.y : 1e9;
          vec3 oc;
          if ( min( tU, tV ) < dep && aaW < 0.5 ) {   // the reveal, with its own normal (the sun lights it right)
            gNrm = tU < tV ? -sign( sl2.x ) * Tv : -sign( sl2.y ) * Uv; gNrmK = 1.0; oc = ( sty == 5.0 || sty == 2.0 || sty == 3.0 ? ( fIdx < 0.5 ? vec3( 0.62 ) : vec3( 0.07, 0.035, 0.02 ) ) : base ) * 0.9; }
          else {
            vec2 r = clamp( ( q - lo ) / ( hi - lo ), 0.0, 1.0 ), m = hi - lo, fr = 0.065 / m, sw = max( fr * 0.3, fw / m );   // edges never sharper than a pixel
            if ( door ) {
              if ( house ) {   // a door leaf: two panels, a glass light in some, a handle
                float pan = max( bnd( r.x, 0.14, 0.86, fr.x ) * bnd( r.y, 0.1, 0.45, fr.y ), bnd( r.x, 0.14, 0.86, fr.x ) * bnd( r.y, 0.55, 0.88, fr.y ) );
                float gl = bnd( r.x, 0.22, 0.78, fr.x ) * bnd( r.y, 0.6, 0.85, fr.y ) * step( 2.5, dIdx );
                oc = doorCol( dIdx ) * ( 1.0 - 0.25 * pan ); gGlass = gl; oc = mix( oc, vec3( 0.02, 0.025, 0.03 ), gl );
                oc = mix( oc, vec3( 0.5 ), bnd( r.x, 0.08, 0.13, fr.x ) * bnd( r.y, 0.46, 0.51, fr.y ) ); }
              else { float bd = fract( q.x / 0.16 ); oc = ( hall ? vec3( 0.36, 0.37, 0.36 ) : vec3( 0.11, 0.07, 0.04 ) ) * ( 0.8 + 0.2 * step( 0.08, bd ) );   // gate: boards with a brace, two leaves
                if ( !hall ) { float zz = abs( r.y - ( r.x > 0.5 ? 2.0 - 2.0 * r.x : 2.0 * r.x ) ); oc *= 1.0 - 0.3 * step( zz, 0.04 ); oc *= 1.0 - 0.5 * bnd( r.x, 0.495, 0.505, fr.x ); } } }
            else {   // a window: frame, two casements and a transom (old houses), glass, curtains in many
              vec3 fc = fIdx < 0.5 ? vec3( 0.68, 0.68, 0.66 ) : vec3( 0.07, 0.035, 0.02 );
              float frm = 1.0 - bnd( r.x, fr.x, 1.0 - fr.x, sw.x ) * bnd( r.y, fr.y, 1.0 - fr.y, sw.y );
              if ( st != 1.0 && !barn && !shed && !hall ) { frm = max( frm, bnd( r.x, 0.5 - fr.x * 0.5, 0.5 + fr.x * 0.5, sw.x ) * step( r.y, 0.7 ) ); frm = max( frm, bnd( r.y, 0.7 - fr.y * 0.4, 0.7 + fr.y * 0.4, sw.y ) ); }
              else if ( !barn && !shed && !hall ) frm = max( frm, bnd( r.x, 0.5 - fr.x * 0.5, 0.5 + fr.x * 0.5, sw.x ) );
              frm = mix( frm, 0.22, smoothstep( 0.02, 0.06, px ) );   // farther: frame and glass as their average
              float wid = bid * 1.37 + floor( uF / bw ) * 7.1 + fi * 3.3, cur = step( vh( wid ), 0.55 ) * step( 0.22, r.y ) * ( barn || hall ? 0.0 : 1.0 );
              float curP = cur * ( 0.8 + 0.2 * sin( q.x * 60.0 ) * ( 1.0 - aaF ) ); vec3 gc = mix( vec3( 0.012, 0.014, 0.016 ), vec3( 0.04, 0.045, 0.05 ), r.y );
              gc = mix( gc, vec3( 0.30, 0.30, 0.28 ), curP * 0.7 );
              gGlass = ( 1.0 - frm ) * ( 1.0 - curP * 0.7 ); oc = mix( gc, fc, frm );
              gLit = ( 1.0 - frm ) * step( vh( wid + 0.37 ), uWinP ) * ( 0.5 + 0.5 * cur ) * ( barn || hall ? 0.3 : 1.0 ); } }
          c = mix( c, oc, inWin ); gWin = inWin; }
        else if ( win > 0.5 && aaW > 0.0 ) c = mix( c, c * 0.72, aaW * win * bnd( uF, lo.x, hi.x, fw.x * 2.0 ) * bnd( v, lo.y, hi.y, fw.y * 2.0 ) );   // far: windows as a darker patch
        vCol = c;
        }
        diffuseColor.rgb *= vCol;`
          )
          .replace(
            '#include <roughnessmap_fragment>',
            '#include <roughnessmap_fragment>\n roughnessFactor = mix( roughnessFactor, 0.06, gWin * gGlass );'
          )
          .replace(
            '#include <normal_fragment_maps>',
            '#include <normal_fragment_maps>\n if ( gNrmK > 0.5 ) normal = normalize( gNrm );'
          )
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
          totalEmissiveRadiance += vec3( 1.0, 0.66, 0.36 ) * uWinK * uNight * gLit * gWin;
          { vec3 lp = vec3( 0.0 ), fp = -vViewPosition; for ( int i = 0; i < 8; i ++ ) { vec4 l = uLampV[ i ]; if ( l.w <= 0.0 ) continue; vec3 d = l.xyz - fp; float dd = dot( d, d );   // street lamps light the walls near them
            lp += l.w * max( dot( normal, d * inversesqrt( dd ) ), 0.0 ) / ( 1.0 + dd * 0.12 ); } totalEmissiveRadiance += diffuseColor.rgb * vec3( 1.0, 0.70, 0.42 ) * lp * 0.08; }`
          );
    };
    m.customProgramCacheKey = () => 'v16e-wall';
    return m;
  }
  // attributes for the wall quads: facade u and length, eave, style; the top line; door, bay spacing, flags; colours; along-wall direction
  function wallAttrs() {
    const g = RATSCHER.bld[0].geometry,
      n = g.attributes.position.count;
    const aV = new Float32Array(n * 4),
      aG = new Float32Array(n * 4),
      aD = new Float32Array(n * 4),
      aC = new Float32Array(n * 4),
      aT = new Float32Array(n * 3);
    for (const b of S.bld) {
      const o = b.st,
        pk = o.timber + 4 * o.frame + 16 * o.door + 128 * o.shut;
      for (const f of b.fac) {
        const fl = (f.kind === 'gable' ? 1 : 0) + (o.shutters ? 2 : 0) + (o.orn ? 4 : 0) + (o.raised ? 8 : 0);
        for (const q of f.qs)
          for (let k = 0; k < 4; k++) {
            const i = q.q * 4 + k,
              u = q.u0 + (k >= 2 ? q.len : 0);
            aV.set([u, f.L, b.eave, o.style], i * 4);
            aG.set([f.t0, f.tA, f.uA, f.t1], i * 4);
            aD.set([f.door ? f.door.u : -1, f.door ? f.door.w : 0, o.sp, fl], i * 4);
            aC.set([o.col[0], o.col[1], o.col[2], pk], i * 4);
            aT.set([f.dx, 0, -f.dy], i * 3);
          }
      }
    }
    for (const [k, a, s] of [
      ['aV', aV, 4],
      ['aG', aG, 4],
      ['aD', aD, 4],
      ['aC', aC, 4],
      ['aTan', aT, 3],
    ])
      g.setAttribute(k, new THREE.BufferAttribute(a, s));
  }
  // doors and gates: on the facade nearest a road (houses: an eave wall unless a gable is clearly nearer)
  function doors(b) {
    const o = b.st;
    if (o.style === ST.SCHOOL) {
      const f = b.fac.filter(f => f.kind === 'eave').reduce((a, c) => (c.ny < a.ny ? c : a)),
        nb = Math.max(1, Math.floor((f.L - 0.6) / o.sp));
      f.door = { u: (1.5 * f.L) / nb, w: 1.1 };
      return;
    }
    if (b.typ === 0 && b.eave < 2.2) return;
    const F = b.fac.filter(f => f.L > (b.typ === 0 ? 3 : 4) && f.kind !== 'slope');
    if (!F.length) return;
    for (const f of F) f.rs = roadScore(f) + (f.kind === 'eave' ? 1.0 : 0);
    const f = F.reduce((a, c) => (c.rs > a.rs ? c : a)),
      sp = o.sp,
      nb = Math.max(1, Math.floor((f.L - 0.6) / sp)),
      bw = f.L / nb;
    if (b.typ === 0) {
      const bi = nb >= 3 ? (hh(b.id + 23) < 0.5 ? 1 : nb - 2) : 0;
      f.door = { u: (bi + 0.5) * bw, w: 1.05 };
    } else if (o.style === ST.HALL) f.door = { u: f.L / 2, w: Math.min(5, f.L * 0.4) };
    else if (o.style === ST.SHED) {
      if (f.L > 3) f.door = { u: f.L / 2, w: Math.min(2.5, f.L * 0.6) };
    } else f.door = { u: (Math.floor(nb / 2) + 0.5) * bw, w: Math.min(3.0, f.L * 0.35) };
  }
  // ---- roofs: rebuilt from the fitted triangles of world/ratscher.js, with eaves and verges that overhang ----
  // a triangle facing n (site coordinates, z up): the order is turned if needed
  const tri = (push, a, b, c, n, uvs, k, tg) => {
    const cr =
      ((b[1] - a[1]) * (c[2] - a[2]) - (b[2] - a[2]) * (c[1] - a[1])) * n[0] +
      ((b[2] - a[2]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[2] - a[2])) * n[1] +
      ((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])) * n[2];
    if (cr < 0) {
      push(a, n, uvs[0], k, tg);
      push(c, n, uvs[2], k, tg);
      push(b, n, uvs[1], k, tg);
    } else {
      push(a, n, uvs[0], k, tg);
      push(b, n, uvs[1], k, tg);
      push(c, n, uvs[2], k, tg);
    }
  };
  const quad = (push, a, b, c, d, n, k, tg, uvq) => {
    const u = uvq || [
      [0, 0],
      [0, 0],
      [0, 0],
      [0, 0],
    ];
    tri(push, a, b, c, n, [u[0], u[1], u[2]], k, tg);
    tri(push, a, c, d, n, [u[0], u[2], u[3]], k, tg);
  };
  function roofs(sample) {
    const g = RATSCHER.bld[1].geometry,
      RP = g.attributes.position.array,
      RI = g.index.array,
      nt = RI.length / 3;
    // each roof triangle to the building whose footprint holds its centre
    const grid = new Map(),
      cs = 30,
      key = (x, y) => Math.floor(x / cs) + ':' + Math.floor(y / cs);
    for (const b of S.bld) {
      let x0 = 1e9,
        x1 = -1e9,
        y0 = 1e9,
        y1 = -1e9;
      for (const f of b.fac) {
        x0 = Math.min(x0, f.ax, f.bx);
        x1 = Math.max(x1, f.ax, f.bx);
        y0 = Math.min(y0, f.ay, f.by);
        y1 = Math.max(y1, f.ay, f.by);
      }
      b.bb = [x0, y0, x1, y1];
      b.tris = [];
      for (let i = Math.floor(x0 / cs); i <= Math.floor(x1 / cs); i++)
        for (let j = Math.floor(y0 / cs); j <= Math.floor(y1 / cs); j++) {
          const k = i + ':' + j;
          let a = grid.get(k);
          if (!a) grid.set(k, (a = []));
          a.push(b);
        }
    }
    const inside = (b, x, y) => {
      let c = false;
      for (const f of b.fac) {
        if (f.ay > y !== f.by > y && x < ((f.bx - f.ax) * (y - f.ay)) / (f.by - f.ay) + f.ax) c = !c;
      }
      return c;
    };
    const edgeD = (b, x, y) => {
      let m = 1e9;
      for (const f of b.fac) {
        const dx = x - f.ax,
          dy = y - f.ay,
          t = Math.max(0, Math.min(f.L, dx * f.dx + dy * f.dy));
        m = Math.min(m, Math.hypot(dx - f.dx * t, dy - f.dy * t));
      }
      return m;
    };
    for (let t = 0; t < nt; t++) {
      let x = 0,
        y = 0;
      for (let k = 0; k < 3; k++) {
        const i = RI[t * 3 + k];
        x += RP[i * 3] / 3;
        y -= RP[i * 3 + 2] / 3;
      }
      let hit = null;
      for (const b of grid.get(key(x, y)) || [])
        if (x >= b.bb[0] - 0.3 && x <= b.bb[2] + 0.3 && y >= b.bb[1] - 0.3 && y <= b.bb[3] + 0.3 && inside(b, x, y)) {
          hit = b;
          break;
        }
      if (!hit) {
        let bd = 4;
        for (const b of grid.get(key(x, y)) || []) {
          const d = edgeD(b, x, y);
          if (d < bd) {
            bd = d;
            hit = b;
          }
        }
      } // a triangle over a notch of an L-shaped plan: to the nearest building, as before
      if (hit) hit.tris.push(t);
      else S.lostTris = (S.lostTris || 0) + 1;
    }
    const pos = [],
      nrm = [],
      uv = [],
      rk = [],
      tan = [];
    const push = (p, n, u, k, tg) => {
      pos.push(p[0], p[2], -p[1]);
      nrm.push(n[0], n[2], -n[1]);
      uv.push(u[0], u[1]);
      rk.push(k[0], k[1], k[2], k[3]);
      tan.push(tg[0], 0, -tg[1]);
    };
    for (const b of S.bld) {
      if (b.tris.length) roofOf(b, RP, RI, push, sample);
    }
    const G = new THREE.BufferGeometry();
    G.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    G.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    G.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    G.setAttribute('aR', new THREE.Float32BufferAttribute(rk, 4));
    G.setAttribute('aTan', new THREE.Float32BufferAttribute(tan, 3));
    G.computeBoundingSphere();
    return G;
  }
  // roof kinds: 0 clay tiles, 1 fibre cement, 2 sheet, 3 slate, 4 flat (gravel, bitumen); 10 soffit, 11 fascia, 12 ridge, 13 zinc, 14–16 chimney brick/slate/plaster, 17 chimney cap, 18 parapet
  function roofKind(b, c) {
    const [, s, l] = hsl(c),
      o = b.st;
    if (b.flat) return o.style === ST.HALL && l > 0.45 ? 2 : 4;
    if (o.style === ST.HALL) return l > 0.5 && s < 0.2 ? 1 : 2;
    if ((o.style === ST.BARN || o.style === ST.BARN_FULL || o.style === ST.SHED) && s < 0.16 && l > 0.3) return 1;
    if (s < 0.14 && l < 0.33) return 3;
    return 0;
  }
  function roofOf(b, RP, RI, push, sample) {
    const V = new Map(),
      T = []; // the building's own vertices (shared between its triangles) and triangles
    const vtx = i => {
      let v = V.get(i);
      if (!v) V.set(i, (v = { x: RP[i * 3], y: -RP[i * 3 + 2], z: RP[i * 3 + 1], tri: [], ox: 0, oy: 0, dz: 0 }));
      return v;
    };
    for (const t of b.tris) {
      const a = vtx(RI[t * 3]),
        c = vtx(RI[t * 3 + 1]),
        d = vtx(RI[t * 3 + 2]);
      const ux = c.x - a.x,
        uy = c.y - a.y,
        uz = c.z - a.z,
        wx = d.x - a.x,
        wy = d.y - a.y,
        wz = d.z - a.z;
      let nx = uy * wz - uz * wy,
        ny = uz * wx - ux * wz,
        nz = ux * wy - uy * wx;
      const L = Math.hypot(nx, ny, nz) || 1;
      nx /= L;
      ny /= L;
      nz /= L;
      if (nz < 0) {
        nx = -nx;
        ny = -ny;
        nz = -nz;
      }
      const tr = { v: [a, c, d], n: [nx, ny, nz], gx: nz > 0.05 ? -nx / nz : 0, gy: nz > 0.05 ? -ny / nz : 0 };
      T.push(tr);
      for (const v of tr.v) v.tri.push(tr);
    }
    b.flat = T.every(t => t.n[2] > 0.985);
    // roof colour: the photo inside the footprint, shadows and glints left out
    const cs = [];
    for (const t of T)
      for (let k = 0; k < 7; k++) {
        const r1 = hh(b.id + k * 3.1),
          r2 = hh(b.id + k * 5.7) * (1 - r1);
        const [a, c, d] = t.v;
        const s = sample(a.x + (c.x - a.x) * r1 + (d.x - a.x) * r2, a.y + (c.y - a.y) * r1 + (d.y - a.y) * r2);
        if (s) cs.push(s);
      }
    cs.sort((p, q) => p[0] + p[1] + p[2] - (q[0] + q[1] + q[2]));
    const mid = cs.slice(
      Math.floor(cs.length * 0.25),
      Math.max(Math.floor(cs.length * 0.25) + 1, Math.floor(cs.length * 0.85))
    );
    let col = mid.length ? [0, 1, 2].map(i => mid.reduce((s, c) => s + c[i], 0) / mid.length) : [0.55, 0.3, 0.22];
    if (b.st.style === ST.SCHOOL) col = [0.72, 0.29, 0.17]; // the school's red-orange tiles (photos 2013, 2026)
    const kind = roofKind(b, col);
    if (kind === 0) {
      const [h, s, l] = hsl(col);
      if (s < 0.22 || (h > 40 && h < 300)) col = l < 0.3 ? [0.4, 0.24, 0.18] : [0.66, 0.32, 0.22];
    }
    if (kind === 4) {
      const l = (col[0] + col[1] + col[2]) / 3;
      col = [0, 1, 2].map(i => Math.min(0.62, l * 0.8 + col[i] * 0.2));
    } // flat: grey like the photo (gravel, bitumen)
    col = col.map(lin);
    b.roof = { kind, col };
    // overhang: outline vertices move out (eaves 0.45 m on houses, verges 0.3 m) and down the slope they lie in
    const oE = b.flat ? 0.04 : b.typ === 0 ? 0.45 : b.typ === 1 ? 0.35 : 0.2,
      oV = b.flat ? 0.04 : b.typ === 0 ? 0.3 : 0.2;
    for (const v of V.values()) {
      let ox = 0,
        oy = 0,
        nOn = 0;
      for (const f of b.fac) {
        const dx = v.x - f.ax,
          dy = v.y - f.ay,
          t = dx * f.dx + dy * f.dy,
          dd = Math.abs(dx * f.nx + dy * f.ny);
        if (t > -0.3 && t < f.L + 0.3 && dd < 0.35) {
          const o = f.kind === 'gable' ? oV : oE;
          ox += f.nx * o;
          oy += f.ny * o;
          nOn++;
        }
      }
      if (!nOn) continue;
      if (nOn > 2) {
        ox *= 2 / nOn;
        oy *= 2 / nOn;
      }
      let dz = 0;
      for (const t of v.tri) dz = Math.min(dz, t.gx * ox + t.gy * oy);
      v.ox = ox;
      v.oy = oy;
      v.dz = b.flat ? 0 : dz;
    }
    const P = v => [v.x + v.ox, v.y + v.oy, v.z + v.dz],
      th = b.typ === 0 ? 0.16 : 0.1,
      k1 = [kind, col[0], col[1], col[2]];
    // top faces (u along the eave, w up the slope, metres on the roof) and the soffit under them
    for (const t of T) {
      const n = t.n,
        hz = Math.hypot(n[0], n[1]);
      let ex = 1,
        ey = 0,
        dx = 0,
        dy = 1;
      if (hz > 0.05) {
        dx = n[0] / hz;
        dy = n[1] / hz;
        ex = -dy;
        ey = dx;
      }
      const cosS = Math.max(0.2, n[2]);
      const ps = t.v.map(P),
        uvs = ps.map(p => [p[0] * ex + p[1] * ey, hz > 0.05 ? -(p[0] * dx + p[1] * dy) / cosS : p[1]]);
      tri(push, ps[0], ps[1], ps[2], n, uvs, k1, [ex, ey]);
      tri(
        push,
        ...ps.map(p => [p[0], p[1], p[2] - th]),
        [-n[0], -n[1], -n[2]],
        uvs,
        [10, col[0], col[1], col[2]],
        [ex, ey]
      );
    }
    // edges: once = the outline (fascia, gutter along the level ones); twice with a bend = ridge or hip (ridge tiles)
    const E = new Map();
    for (const t of T)
      for (let k = 0; k < 3; k++) {
        const a = t.v[k],
          c = t.v[(k + 1) % 3],
          kk = [a, c]
            .map(v => v.x.toFixed(2) + ',' + v.y.toFixed(2))
            .sort()
            .join('|');
        let e = E.get(kk);
        if (!e) E.set(kk, (e = { a, c, t: [] }));
        e.t.push(t);
      }
    for (const e of E.values()) {
      const A = P(e.a),
        C = P(e.c),
        L = Math.hypot(C[0] - A[0], C[1] - A[1], C[2] - A[2]);
      if (L < 0.05) continue;
      const tg = [(C[0] - A[0]) / L, (C[1] - A[1]) / L];
      if (e.t.length === 1) {
        // fascia board: a vertical band from the roof edge down, facing out
        const t = e.t[0],
          mx = (A[0] + C[0]) / 2,
          my = (A[1] + C[1]) / 2,
          ps = t.v.map(P),
          cx = (ps[0][0] + ps[1][0] + ps[2][0]) / 3,
          cy = (ps[0][1] + ps[1][1] + ps[2][1]) / 3;
        let nx = tg[1],
          ny = -tg[0];
        if (nx * (mx - cx) + ny * (my - cy) < 0) {
          nx = -nx;
          ny = -ny;
        }
        if (b.flat) {
          // parapet with a sheet-metal cap
          const up = 0.28,
            ix = -nx * 0.2,
            iy = -ny * 0.2,
            A2 = [A[0], A[1], A[2] + up],
            C2 = [C[0], C[1], C[2] + up],
            A3 = [A[0] + ix, A[1] + iy, A[2] + up],
            C3 = [C[0] + ix, C[1] + iy, C[2] + up];
          quad(push, [A[0], A[1], A[2] - 0.12], [C[0], C[1], C[2] - 0.12], C2, A2, [nx, ny, 0], [18, 0, 0, 0], tg);
          quad(push, A2, C2, C3, A3, [0, 0, 1], [18, 0, 0, 0], tg);
          quad(
            push,
            A3,
            C3,
            [C[0] + ix, C[1] + iy, C[2]],
            [A[0] + ix, A[1] + iy, A[2]],
            [-nx, -ny, 0],
            [18, 0, 0, 0],
            tg
          );
          continue;
        }
        quad(
          push,
          A,
          C,
          [C[0], C[1], C[2] - th - 0.04],
          [A[0], A[1], A[2] - th - 0.04],
          [nx, ny, 0],
          [11, col[0], col[1], col[2]],
          tg
        );
        if (!b.flat && Math.abs(C[2] - A[2]) < 0.08 && b.typ !== 2) {
          // gutter under a level edge, and a downpipe at one end
          const gz = (A[2] + C[2]) / 2 - th - 0.03,
            gk = [13, 0, 0, 0],
            o1 = 0.02,
            o2 = 0.16;
          const g0 = [A[0] + nx * o1, A[1] + ny * o1, gz],
            g1 = [C[0] + nx * o1, C[1] + ny * o1, gz],
            g2 = [C[0] + nx * o2, C[1] + ny * o2, gz - 0.1],
            g3 = [A[0] + nx * o2, A[1] + ny * o2, gz - 0.1];
          quad(push, g0, g1, g2, g3, [nx * 0.5, ny * 0.5, -0.86], gk, tg);
          quad(push, g3, g2, [g2[0], g2[1], gz + 0.03], [g3[0], g3[1], gz + 0.03], [nx, ny, 0], gk, tg);
          if (L > 5 && b.typ === 0) {
            const z0 = gz - 0.08,
              z1 = b.foot + 0.05,
              s2 = 0.045,
              px0 = A[0] + nx * (o2 - 0.04) + tg[0] * 0.3,
              py0 = A[1] + ny * (o2 - 0.04) + tg[1] * 0.3;
            for (const [sx, sy] of [
              [1, 0],
              [0, 1],
              [-1, 0],
              [0, -1],
            ]) {
              const ax = px0 + sx * s2 - sy * s2,
                ay = py0 + sy * s2 + sx * s2,
                bx = px0 + sx * s2 + sy * s2,
                by = py0 + sy * s2 - sx * s2;
              quad(push, [ax, ay, z1], [bx, by, z1], [bx, by, z0], [ax, ay, z0], [sx, sy, 0], gk, tg);
            }
          }
        }
      } else if (e.t.length === 2 && !b.flat) {
        // ridge or hip: both faces fall away from the edge
        const [t1, t2] = e.t,
          mz = (A[2] + C[2]) / 2,
          low = t => t.v.map(P).reduce((s, p) => s + p[2], 0) / 3 < mz - 0.05;
        if (!low(t1) || !low(t2) || t1.n[0] * t2.n[0] + t1.n[1] * t2.n[1] + t1.n[2] * t2.n[2] > 0.995) continue;
        const rk2 = [12, col[0], col[1], col[2]],
          w = 0.15,
          h = 0.07;
        for (const t of [t1, t2]) {
          const hz = Math.hypot(t.n[0], t.n[1]) || 1,
            dx = t.n[0] / hz,
            dy = t.n[1] / hz,
            dzz = -w * Math.hypot(t.gx, t.gy);
          quad(
            push,
            [A[0], A[1], A[2] + h],
            [C[0], C[1], C[2] + h],
            [C[0] + dx * w, C[1] + dy * w, C[2] + dzz + h * 0.5],
            [A[0] + dx * w, A[1] + dy * w, A[2] + dzz + h * 0.5],
            [t.n[0], t.n[1], t.n[2] + 0.3],
            rk2,
            tg,
            [
              [0, 0],
              [L, 0],
              [L, 1],
              [0, 1],
            ]
          );
        }
      }
    }
    // a chimney on a house with a ridge
    const school = b.st.style === ST.SCHOOL;
    if (b.typ === 0 && !b.flat && (school || hh(b.id + 31) < 0.75)) {
      const vs = [...V.values()],
        zm = Math.max(...vs.map(v => v.z)),
        top = vs.filter(v => v.z > zm - 0.12);
      if (top.length >= 2) {
        let A = top[0],
          C = top[1],
          dm = 0;
        for (const p of top)
          for (const q of top) {
            const d = Math.hypot(p.x - q.x, p.y - q.y);
            if (d > dm) {
              dm = d;
              A = p;
              C = q;
            }
          }
        if (school && A.x > C.x) [A, C] = [C, A];
        if (dm > 3) {
          const f = school ? 0.62 : 0.25 + hh(b.id + 37) * 0.25,
            cx = A.x + (C.x - A.x) * f,
            cy = A.y + (C.y - A.y) * f,
            kk = school ? 14 : 14 + Math.floor(hh(b.id + 41) * 3);
          chimney(push, cx, cy, zm, 0.52, 0.42, zm + 0.95, Math.atan2(C.y - A.y, C.x - A.x), kk, col);
          b.chim = [cx, cy, zm + 0.95];
        }
      }
    }
  }
  function chimney(push, cx, cy, z0, w, d, z1, ang, kk, col) {
    const c = Math.cos(ang),
      s = Math.sin(ang),
      pt = (x, y, z) => [cx + x * c - y * s, cy + x * s + y * c, z];
    const box = (x0, x1, y0, y1, za, zb, kind) => {
      const kq = [kind, col[0], col[1], col[2]];
      for (const [p, q, n] of [
        [
          [x1, y0],
          [x1, y1],
          [1, 0],
        ],
        [
          [x1, y1],
          [x0, y1],
          [0, 1],
        ],
        [
          [x0, y1],
          [x0, y0],
          [-1, 0],
        ],
        [
          [x0, y0],
          [x1, y0],
          [0, -1],
        ],
      ]) {
        const nn = [n[0] * c - n[1] * s, n[0] * s + n[1] * c, 0],
          tg = [-nn[1], nn[0]],
          P4 = [pt(p[0], p[1], za), pt(q[0], q[1], za), pt(q[0], q[1], zb), pt(p[0], p[1], zb)];
        quad(
          push,
          ...P4,
          nn,
          kq,
          tg,
          P4.map(p2 => [(p2[0] - cx) * tg[0] + (p2[1] - cy) * tg[1] + 3, p2[2]])
        );
      }
      quad(push, pt(x0, y0, zb), pt(x1, y0, zb), pt(x1, y1, zb), pt(x0, y1, zb), [0, 0, 1], kq, [c, s]);
    };
    box(-w / 2, w / 2, -d / 2, d / 2, z0 - 1.4, z1, kk);
    box(-w / 2 - 0.05, w / 2 + 0.05, -d / 2 - 0.05, d / 2 + 0.05, z1, z1 + 0.08, 17);
  }
  const RGLSL = `varying vec4 vR; varying vec3 vTanR; varying vec2 vRuv; uniform sampler2D tTile, tTileN, tFib, tSlate, tPlas;
    float rh2( vec2 p ) { return fract( sin( dot( p, vec2( 127.1, 311.7 ) ) ) * 43758.5453 ); }
    vec3 rtN( sampler2D t, vec2 p ) { return texture2D( t, p ).rgb / max( textureLod( t, vec2( 0.5 ), 12.0 ).rgb, vec3( 0.01 ) ); }
    vec3 gRN = vec3( 0.0, 0.0, 1.0 ); float gRK = 0.0;`;
  function roofMat(U) {
    const m = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.85, metalness: 0, envMapIntensity: 0.65 });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U);
      sh.vertexShader =
        'attribute vec4 aR; attribute vec3 aTan; varying vec4 vR; varying vec3 vTanR; varying vec2 vRuv;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
        vR = aR; vRuv = uv; vTanR = normalize( ( modelViewMatrix * vec4( aTan, 0.0 ) ).xyz );`
        );
      sh.fragmentShader =
        RGLSL +
        '\n' +
        sh.fragmentShader
          .replace(
            '#include <map_fragment>',
            `#include <map_fragment>
        vec3 rc; float rr = 0.85, rm = 0.0;
        { float k = floor( vR.x + 0.5 ); vec3 col = vR.yzw; vec2 p = vRuv; float px = max( fwidth( p.x ), fwidth( p.y ) ), aa = smoothstep( 0.02, 0.09, px );
          if ( k < 0.5 ) {   // clay tiles: the photo texture, in the colour of this roof in the orthophoto
            vec3 t = rtN( tTile, p / 2.6 ); rc = col * mix( t, vec3( dot( t, vec3( 0.333 ) ) ), 0.5 ) * ( 0.92 + 0.16 * rh2( floor( p / vec2( 0.26, 0.36 ) ) ) * ( 1.0 - aa ) );
            gRN = texture2D( tTileN, p / 2.6 ).xyz * 2.0 - 1.0; gRK = 1.0 - aa; }
          else if ( k < 1.5 ) { float w = sin( p.x * 35.0 ); rc = vec3( 0.25, 0.25, 0.235 ) * ( 0.88 + 0.12 * w * ( 1.0 - aa ) ) * rtN( tFib, p / 1.8 ).r; gRN = vec3( cos( p.x * 35.0 ) * 0.3, 0.0, 1.0 ); gRK = 1.0 - aa; }   // corrugated fibre cement
          else if ( k < 2.5 ) { float f = fract( p.x / 0.2 ); rc = col * ( 0.92 + 0.08 * step( 0.75, f ) ); rr = 0.45; rm = 0.3; gRN = vec3( ( step( 0.7, f ) - step( 0.8, f ) ) * 0.7, 0.0, 1.0 ); gRK = 1.0 - aa; }   // trapezoidal sheet
          else if ( k < 3.5 ) {   // slate: small rectangles in offset rows
            float r = floor( p.y / 0.2 ), cc = floor( p.x / 0.3 + mod( r, 2.0 ) * 0.5 ), fy = fract( p.y / 0.2 );
            rc = vec3( 0.075, 0.08, 0.09 ) * ( 0.85 + 0.3 * rh2( vec2( r, cc ) ) ) * rtN( tSlate, p * 0.4 ).r; rc *= 1.0 - 0.4 * ( 1.0 - smoothstep( 0.0, 0.12, fy ) ) * ( 1.0 - aa ); rr = 0.6; }
          else if ( k < 4.5 ) { rc = col * ( 0.85 + 0.3 * rh2( floor( p * 2.0 ) ) * ( 1.0 - aa ) ) * rtN( tPlas, p * 0.5 ).r; }   // flat: gravel or bitumen in the photo's grey
          else if ( k < 10.5 ) { rc = vec3( 0.16, 0.10, 0.06 ) * ( 0.85 + 0.15 * step( 0.5, fract( p.x / 0.12 ) ) ); }   // soffit: boards
          else if ( k < 11.5 ) { rc = vec3( 0.10, 0.06, 0.035 ); }   // fascia
          else if ( k < 12.5 ) { rc = col * 0.7 * ( 0.85 + 0.15 * step( 0.12, fract( p.x / 0.4 ) ) ); }   // ridge tiles
          else if ( k < 13.5 ) { rc = vec3( 0.42, 0.43, 0.43 ); rr = 0.45; rm = 0.6; }   // zinc gutter and downpipe
          else if ( k < 14.5 ) { float row = floor( p.y / 0.083 ), mor = step( 0.85, fract( p.y / 0.083 ) ) + step( 0.92, fract( p.x / 0.25 + mod( row, 2.0 ) * 0.5 ) );
            rc = mix( vec3( 0.25, 0.06, 0.035 ) * ( 0.8 + 0.4 * rh2( vec2( row, floor( p.x / 0.25 ) ) ) ), vec3( 0.32, 0.30, 0.27 ), min( 1.0, mor ) * ( 1.0 - aa ) ); }   // chimney: brick
          else if ( k < 15.5 ) { rc = vec3( 0.075, 0.08, 0.09 ) * ( 0.85 + 0.3 * rh2( floor( p / vec2( 0.2, 0.17 ) ) ) ); }   // slate
          else if ( k < 16.5 ) { rc = vec3( 0.42, 0.40, 0.37 ) * rtN( tPlas, p * 0.5 ).r; }   // plaster
          else if ( k < 17.5 ) { rc = vec3( 0.12, 0.12, 0.125 ); }   // chimney cap
          else { rc = vec3( 0.36, 0.37, 0.37 ); rr = 0.4; rm = 0.5; }   // parapet: sheet-metal cap
        }
        diffuseColor.rgb *= rc;`
          )
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\n roughnessFactor = rr;')
          .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\n metalnessFactor = rm;')
          .replace(
            '#include <normal_fragment_maps>',
            `#include <normal_fragment_maps>
          if ( gRK > 0.0 ) { vec3 T = normalize( vTanR ), N = normalize( normal ), Bt = normalize( cross( N, T ) ); normal = normalize( mix( N, normalize( T * gRN.x + Bt * gRN.y + N * max( gRN.z, 0.2 ) ), 0.65 * gRK ) ); }`
          );
    };
    m.customProgramCacheKey = () => 'v16e-roof';
    return m;
  }
  // ---- night: windows lit by the clock (evening most, deep night a few, early morning some) ----
  S.winShare = () => {
    if (!window.CLOCK) return 0.4;
    const h = (((LATE.CLOCK.t / 60) % 24) + 24) % 24;
    return h < 5
      ? 0.05
      : h < 6
        ? 0.05 + (h - 5) * 0.25
        : h < 8
          ? 0.3 - (h - 6) * 0.1
          : h < 16
            ? 0.1
            : h < 18
              ? 0.1 + (h - 16) * 0.2
              : h < 22
                ? 0.5
                : 0.5 - (h - 22) * 0.22;
  };
  S.night = () => {
    if (window.DN && LATE.DN.active && LATE.DN.state) return LATE.DN.state.night;
    return window.MODE_NOW === 'dusk' ? 0.8 : 0;
  };
  function tick() {
    if (!S.U) return;
    const n = S.night(),
      p = window.DN && LATE.DN.active ? S.winShare() : 0.45;
    if (Math.abs(n - S.U.uNight.value) > 0.01 || Math.abs(p - S.U.uWinP.value) > 0.01) {
      S.U.uNight.value = n;
      S.U.uWinP.value = p;
      markDirty();
    }
  }
  // ---- build ----
  function build() {
    const t0 = performance.now();
    analyse();
    const sample = photoSampler();
    for (const b of S.bld) {
      b.st = styleOf(b);
      doors(b);
    }
    S.U = {
      tPlas: { value: tex('plaster_ext', 'col', true) },
      tSlate: { value: tex('slate', 'col', true) },
      tWood: { value: tex('weatherwood', 'col', true) },
      tTile: { value: tex('rooftiles', 'col', true) },
      tTileN: { value: tex('rooftiles', 'nrm', false) },
      tFib: { value: tex('fibrecement', 'col', true) },
      uNight: { value: 0 },
      uWinP: { value: 0.4 },
      uWinK: { value: 2.0 },
      uLampV: { value: Array.from({ length: 8 }, () => new THREE.Vector4()) },
    };
    wallAttrs();
    const wm = RATSCHER.bld[0];
    S.wall0 = wm.material;
    wm.material = wallMat(S.U);
    const rm = new THREE.Mesh(roofs(sample), roofMat(S.U));
    rm.userData.noMerge = true;
    rm.castShadow = false;
    rm.receiveShadow = false;
    scene.add(rm);
    const old = RATSCHER.bld[1];
    old.visible = false;
    S.roof0 = old;
    RATSCHER.bld[1] = rm;
    S.meshes.push(rm);
    S.offTick = KERN.tick(tick, 'world/village');
    tick();
    S.on = true;
    S.ready = true;
    S.ms = Math.round(performance.now() - t0);
    markDirty(true);
  }
  S.dispose = () => {
    for (const m of S.meshes) {
      scene.remove(m);
      m.geometry.dispose();
    }
    if (S.roof0) {
      RATSCHER.bld[1] = S.roof0;
      S.roof0.visible = true;
    }
    if (S.wall0) RATSCHER.bld[0].material = S.wall0;
    if (S.offTick) S.offTick();
    S.offTick = null;
    S.meshes.length = 0;
    S.bld.length = 0;
    S.byId.clear();
    S.ready = false;
  };
  whenLoaded(() => {
    if (!RATSCHER.ready || !RATSCHER.bld || RATSCHER.bld.length < 2) return;
    try {
      build();
    } catch (e) {
      console.warn('village', e);
    }
  });
  return S;
})();
window.VILLAGE = VILLAGE;
