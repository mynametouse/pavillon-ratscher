// ===================== feat/ferne: the houses of the world far away (FERNE) =====================
// Falko, 19.11.2026 21:19: „Es ist manchmal etwas befremdlich, wenn sich der Horizont und Objekte in der Ferne am Horizont erst sehr
// langsam aufbauen … einen flüssigeren Übergang zwischen Horizontdarstellung und detaillierter Nahdarstellung.“ The houses of the world
// cells (gebaeude/gebaeude.js) stood only within 700–900 m of the camera, Schleusingen's old town (welt/schleusingen.js) within 950 m of
// its Markt – beyond, the roofs printed in the aerial photo, and a town came up house by house as one drove towards it.
// Here every building worth seeing from afar (tools/ferne/haeuser.py, at build time from the same cells: dist/ferne/haeuser.bin, 16
// bytes a building) stands as a plain block out to 6 km (tier „hoch“; „mittel“ 4.2 km, „schnell“ 2.5 km, phones 1.5 km): its footprint as a rectangle, walls to the eave, the roof's form
// (gable, hipped, flat, mono-pitch) to the top, the roof in its colour from the 2024 orthophoto, walls in the plaster, slate, wood or
// metal of its kind; windows as rows of darker panes that turn into an even shade where they get smaller than a pixel, at night lit like
// the village's (the same uniforms: world/village.js uNight, uWinP, uWinK).
// Where the detail is there, the blocks give way: a 400 m cell built by gebaeude.js, Schleusingen's old town once its zone stands. The
// blocks of such a cell dissolve over 0.8 s (a screen-door dither in the shader: no transparency, no sorting) while the detailed
// houses – the same footprint, height and roof colour – are already there; a cell freed far away gets its blocks back at once. New
// blocks fade in over a second; at the edge of the range they dissolve over the last kilometre, near the camera (under 300 m) they are
// never drawn (no crude boxes beside the walker before the cells are in).
// One draw call per 1.6 km block in reach, no shadows cast, one new shader program. The ground under each block from KERN.terrain when
// it is built, checked again while the finer tiles come in nearby. ?noferne leaves it all out (to compare).
//   FERNE.state()   { on, ready, blocks, built, buildings, tris, ms, hidden, err }
//   FERNE.set({ on, far })  on/off; far: the range (m) for comparisons
import * as THREE from 'three';
import { BASE, cam, COARSE, QS, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, whenLoaded } from '../core/assets.js';
import { RENDER } from '../render/render.js';
import { RATSCHER } from '../world/ratscher.js';
import { VILLAGE } from '../world/village.js';
import { WELT } from '../welt/welt.js';
export const FERNE = (() => {
  const S = {
    on: !QS.has('noferne') && !!(window.RATSCHER && RATSCHER.on),
    ready: false,
    err: '',
    blocks: new Map(),
    built: 0,
    ms: 0,
    farUser: 0,
  };
  const BLOCK = 1600,
    CELL = 400,
    // the range by tier: [fade in near from, to], [dissolve far from, to] (m)
    RANGE = {
      hoch: [220, 320, 5000, 6000],
      mittel: [220, 320, 3500, 4200],
      schnell: [220, 320, 2100, 2500],
      phone: [200, 300, 1250, 1500],
    };
  const range = () => {
    const r = RANGE[COARSE ? 'phone' : RENDER.tier] || RANGE.mittel;
    return S.farUser ? [r[0], r[1], S.farUser * 0.85, S.farUser] : r;
  };
  const hh = n => {
    const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const pal = a => a.map(c => c.map(lin));
  // walls by kind (sRGB): houses plaster in the village's pastels, a quarter slate-hung; barns and halls wood, grey render or metal;
  // sheds wood or grey; tanks and towers concrete
  const WALL = {
    house: pal([
      [0.86, 0.82, 0.72],
      [0.85, 0.79, 0.58],
      [0.83, 0.74, 0.63],
      [0.76, 0.8, 0.72],
      [0.88, 0.87, 0.84],
      [0.77, 0.76, 0.73],
      [0.85, 0.76, 0.72],
      [0.81, 0.72, 0.55],
    ]),
    slate: pal([
      [0.3, 0.32, 0.36],
      [0.35, 0.36, 0.39],
    ]),
    barn: pal([
      [0.46, 0.38, 0.3],
      [0.62, 0.62, 0.6],
      [0.72, 0.74, 0.74],
      [0.52, 0.35, 0.27],
      [0.55, 0.47, 0.37],
    ]),
    shed: pal([
      [0.42, 0.35, 0.28],
      [0.58, 0.57, 0.55],
      [0.58, 0.4, 0.31],
    ]),
    stone: pal([[0.62, 0.6, 0.56]]),
  };
  // ---- the fade of each 400 m cell (a texel of a 256² map: cell (i, j) at (i + 128, j + 128); texel (0, 0): Schleusingen's old town) ----
  const TW = 256,
    tex = new Uint8Array(TW * TW).fill(255),
    cellTex = new THREE.DataTexture(tex, TW, TW, THREE.RedFormat, THREE.UnsignedByteType);
  cellTex.magFilter = cellTex.minFilter = THREE.NearestFilter;
  cellTex.generateMipmaps = false;
  cellTex.unpackAlignment = 1;
  cellTex.needsUpdate = true;
  const FADE = new Map(); // texel index → { cur, tgt, up } (only the cells that are or were changing)
  const texel = (i, j) => (j + 128) * TW + (i + 128);
  function fadeOf(k) {
    let f = FADE.get(k);
    if (!f) FADE.set(k, (f = { cur: 1, tgt: 1, up: 1 }));
    return f;
  }
  // ---- the material: the standard one, its fragments dithered away by the cell's fade and the distance; windows on house walls ----
  const U = {
    tFeC: { value: cellTex },
    uFeD: { value: new THREE.Vector4(220, 320, 3400, 4000) },
  };
  let MAT = null;
  function material() {
    const VU = VILLAGE.U || {},
      W = {
        uNight: VU.uNight || { value: 0 },
        uWinP: VU.uWinP || { value: 0.3 },
        uWinK: VU.uWinK || { value: 1 },
      };
    const m = new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.88,
      metalness: 0,
      envMapIntensity: 0.7,
    });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U, W);
      sh.vertexShader =
        'attribute vec4 aFe; attribute vec2 aWu; uniform sampler2D tFeC; varying float vFeF; varying vec4 vFe; varying vec2 vWu; varying vec3 vFeW;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          `#include <begin_vertex>
  vFeF = texelFetch( tFeC, ivec2( aFe.xy ), 0 ).r;
  vFe = aFe; vWu = aWu * 0.1;   // (decimetres)
  if ( vFeF < 0.004 ) transformed = vec3( 0.0 );   // a hidden cell: its triangles collapse (no fragments)
  vFeW = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`
        );
      sh.fragmentShader =
        'uniform vec4 uFeD; uniform float uNight, uWinP, uWinK; varying float vFeF; varying vec4 vFe; varying vec2 vWu; varying vec3 vFeW;\n' +
        // the periodic pulse [a, b] of period 1, averaged over a pixel's width w (no shimmer where windows get smaller than a pixel)
        'float fePI( float t, float a, float b ) { return floor( t ) * ( b - a ) + clamp( fract( t ), a, b ) - a; }\n' +
        'float fePulse( float t, float a, float b, float w ) { w = max( w, 1e-4 ); return ( fePI( t + 0.5 * w, a, b ) - fePI( t - 0.5 * w, a, b ) ) / w; }\n' +
        'float feHash( vec2 p ) { return fract( sin( dot( p, vec2( 12.9898, 78.233 ) ) ) * 43758.5453 ); }\n' +
        sh.fragmentShader
          .replace(
            'void main() {',
            `void main() {
  {
    float d = distance( vFeW, cameraPosition );
    float f = vFeF * smoothstep( uFeD.x, uFeD.y, d ) * ( 1.0 - smoothstep( uFeD.z, uFeD.w, d ) );
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
  float feWin = 0.0, feLit = 0.0;
  if ( vFe.z > 0.5 && vWu.y > 0.55 ) {
    // windows of a house: 2.9 m apart, storeys of 2.75 m from 0.95 m up
    vec2 g = vec2( vWu.x / 2.9, ( vWu.y - 0.95 ) / 2.75 ), w = fwidth( g );
    feWin = fePulse( g.x, 0.3, 0.7, w.x ) * fePulse( g.y, 0.28, 0.74, w.y ) * step( 0.0, g.y );
    float lit = step( feHash( floor( g ) + vFe.w ), uWinP );
    feLit = feWin * mix( lit, uWinP, smoothstep( 0.35, 1.0, max( w.x, w.y ) ) );
    diffuseColor.rgb *= 1.0 - 0.5 * feWin;
  }`
          )
          .replace(
            '#include <emissivemap_fragment>',
            `#include <emissivemap_fragment>
  totalEmissiveRadiance += vec3( 1.0, 0.66, 0.36 ) * uWinK * uNight * feLit * 0.8;`
          );
    };
    m.customProgramCacheKey = () => 'ferne-haeuser';
    return m;
  }
  // ---- the data ----
  let DATA = null;
  async function fetchData() {
    const r = await fetch(BASE + 'ferne/haeuser.bin');
    if (!r.ok) throw new Error('haeuser.bin ' + r.status);
    const buf = await r.arrayBuffer(),
      dv = new DataView(buf);
    if (dv.getUint32(0, true) !== 0x314e5246) throw new Error('haeuser.bin: kein FRN1');
    const nb = dv.getUint32(4, true),
      rec0 = 8 + nb * 12;
    for (let k = 0; k < nb; k++) {
      const o = 8 + k * 12,
        I = dv.getInt16(o, true),
        J = dv.getInt16(o + 2, true),
        first = dv.getUint32(o + 4, true),
        n = dv.getUint32(o + 8, true);
      S.blocks.set(I + '_' + J, { I, J, first, n, mesh: null, state: 'idle', zv: -1, near: Infinity });
    }
    DATA = { dv, rec0 };
    S.buildings = [...S.blocks.values()].reduce((a, b) => a + b.n, 0);
  }
  // ---- one block as one mesh ----
  // the ground as it is drawn: the world's tiles near the camera, beyond them the terrain of world/ratscher.js (DGM1 round the village,
  // the surface model out to 12 km – a town on it stands on its own blurred roofs, as the ground drawn there does). Beyond 12 km nothing
  // is drawn under a far house yet (Meiningen, Trusetal: their tiles only within 760 m of the camera) – no block there, it would hang in
  // the haze.
  function ground(x, y) {
    let z = WELT.heightAt ? WELT.heightAt(x, y) : undefined;
    if (!Number.isFinite(z) && Math.hypot(x, y) < 11500) {
      z = KERN.terrain(x, y);
      if (!Number.isFinite(z) && RATSCHER.hAt) z = RATSCHER.hAt(x, y);
    }
    return Number.isFinite(z) ? z : NaN;
  }
  // in slices of `budget` ms (a big block is a few thousand buildings: never one long frame); true when the mesh stands
  function buildBlock(B, budget) {
    const t0 = performance.now(),
      { dv, rec0 } = DATA,
      ox = B.I * BLOCK,
      oy = B.J * BLOCK;
    // parts: per building x, y, base z, first vertex, vertex count (for the ground check)
    if (!B.work) B.work = { k: 0, nv: 0, P: [], N: [], C: [], F: [], Wu: [], IX: [], parts: [] };
    const WK = B.work,
      { P, N, C, F, Wu, IX } = WK;
    let nv = WK.nv;
    const tv = new THREE.Vector3(),
      tw = new THREE.Vector3(),
      tn = new THREE.Vector3();
    for (let k = WK.k; k < B.n; k++) {
      if ((k & 15) === 0 && k > WK.k && performance.now() - t0 > budget) {
        WK.k = k;
        WK.nv = nv;
        S.ms = Math.max(S.ms, Math.round(performance.now() - t0));
        return false;
      }
      const o = rec0 + (B.first + k) * 16,
        cx = ox + dv.getUint16(o, true) * 0.025,
        cy = oy + dv.getUint16(o + 2, true) * 0.025,
        L = dv.getUint16(o + 4, true) / 100,
        Wd = dv.getUint16(o + 6, true) / 100,
        a = (dv.getUint8(o + 8) / 256) * Math.PI,
        e = dv.getUint8(o + 9) * 0.25,
        h = Math.max(e, dv.getUint8(o + 10) * 0.25),
        fl = dv.getUint8(o + 11),
        cell = dv.getUint8(o + 15),
        kind = fl & 7,
        form = (fl >> 3) & 3,
        schl = fl & 64;
      const z0 = ground(cx, cy);
      if (!Number.isFinite(z0)) continue;
      const ci = cell === 255 ? -128 : B.I * 4 + (cell & 3),
        cj = cell === 255 ? -128 : B.J * 4 + (cell >> 2),
        ti = ci + 128,
        tj = cj + 128;
      if (ti < 0 || tj < 0 || ti >= TW || tj >= TW) continue;
      const hs = hh(cx * 0.37 + cy * 0.71),
        win = kind === 0 && L > 4 ? 1 : 0;
      // colours (linear): roof from the photo, walls by kind
      const rc = [lin(dv.getUint8(o + 12) / 255), lin(dv.getUint8(o + 13) / 255), lin(dv.getUint8(o + 14) / 255)];
      let wc;
      if (kind === 0)
        wc = hs < 0.24 && !schl ? WALL.slate[Math.floor(hs * 8) % 2] : WALL.house[Math.floor(hs * 97) % 8];
      else if (kind === 1) wc = WALL.barn[Math.floor(hs * 97) % 5];
      else if (kind === 2) wc = WALL.shed[Math.floor(hs * 97) % 3];
      else wc = WALL.stone[0];
      const v0 = nv,
        ca = Math.cos(a),
        sa = Math.sin(a),
        ux = (ca * L) / 2,
        uy = (sa * L) / 2,
        vx = (-sa * Wd) / 2,
        vy = (ca * Wd) / 2,
        zb = -4; // the walls reach 4 m under the ground (a slope, a block grounded on coarser terrain)
      // corners counter-clockwise from above: 0 (−u −v), 1 (+u −v), 2 (+u +v), 3 (−u +v)
      const X = [cx - ux - vx, cx + ux - vx, cx + ux + vx, cx - ux + vx],
        Y = [cy - uy - vy, cy + uy - vy, cy + uy + vy, cy - uy + vy];
      // a face from model points (x, y, z above the ground), coloured; normal from the corners, turned outwards by `out`
      const face = (pts, col, wall, outx, outy, outz) => {
        const b = nv;
        tv.set(pts[1][0] - pts[0][0], pts[1][2] - pts[0][2], -(pts[1][1] - pts[0][1]));
        tw.set(pts[2][0] - pts[0][0], pts[2][2] - pts[0][2], -(pts[2][1] - pts[0][1]));
        tn.crossVectors(tv, tw).normalize();
        let flip = tn.x * outx + tn.y * outz - tn.z * outy < 0;
        if (flip) tn.negate();
        for (const p of pts) {
          P.push(p[0], z0 + p[2], -p[1]);
          N.push(tn.x, tn.y, tn.z);
          C.push(col[0], col[1], col[2]);
          F.push(ti, tj, wall ? win : 0, hs * 251);
          Wu.push(wall ? p[3] : 0, wall ? p[2] : -9);
        }
        for (let t = 1; t + 1 < pts.length; t++) {
          if (flip) IX.push(b, b + t + 1, b + t);
          else IX.push(b, b + t, b + t + 1);
        }
        nv += pts.length;
      };
      // walls: per side the tops at its two corners (a mono-pitch roof rises from side 0–1 to side 2–3)
      const top = c => (form === 3 ? (c >= 2 ? h : e) : form === 0 ? h : e);
      for (let s = 0; s < 4; s++) {
        const p = s,
          q = (s + 1) % 4,
          len = Math.hypot(X[q] - X[p], Y[q] - Y[p]),
          nx = (Y[q] - Y[p]) / (len || 1),
          ny = -(X[q] - X[p]) / (len || 1);
        face(
          [
            [X[p], Y[p], zb, 0],
            [X[q], Y[q], zb, len],
            [X[q], Y[q], top(q), len],
            [X[p], Y[p], top(p), 0],
          ],
          wc,
          true,
          nx,
          ny,
          0
        );
        // the gable over the short sides (1–2 and 3–0) of a gable roof
        if (form === 1 && (s === 1 || s === 3))
          face(
            [
              [X[p], Y[p], e, 0],
              [X[q], Y[q], e, len],
              [(X[p] + X[q]) / 2, (Y[p] + Y[q]) / 2, h, len / 2],
            ],
            wc,
            true,
            nx,
            ny,
            0
          );
      }
      // the roof
      if (form === 0 || form === 3)
        face(
          [0, 1, 2, 3].map(c => [X[c], Y[c], top(c)]),
          rc,
          false,
          0,
          0,
          1
        );
      else {
        const r = form === 2 ? Math.max(0, L / 2 - Wd / 2) / (L / 2 || 1) : 1, // a hipped ridge shorter by the half width at each end
          R0 = [cx - ux * r, cy - uy * r, h],
          R1 = [cx + ux * r, cy + uy * r, h];
        face([[X[0], Y[0], e], [X[1], Y[1], e], R1, R0], rc, false, 0, 0, 1);
        face([[X[2], Y[2], e], [X[3], Y[3], e], R0, R1], rc, false, 0, 0, 1);
        if (form === 2) {
          face([[X[1], Y[1], e], [X[2], Y[2], e], R1], rc, false, 0, 0, 1);
          face([[X[3], Y[3], e], [X[0], Y[0], e], R0], rc, false, 0, 0, 1);
        }
      }
      WK.parts.push(cx, cy, z0, v0, nv - v0);
    }
    B.parts = WK.parts;
    B.work = null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute(
      'normal',
      new THREE.BufferAttribute(
        Int8Array.from(N, v => Math.round(v * 127)),
        3,
        true
      )
    );
    g.setAttribute(
      'color',
      new THREE.BufferAttribute(
        Uint8Array.from(C, v => Math.round(Math.min(1, v) * 255)),
        3,
        true
      )
    );
    g.setAttribute(
      'aFe',
      new THREE.BufferAttribute(
        Uint8Array.from(F, v => Math.max(0, Math.min(255, Math.round(v)))),
        4
      )
    );
    g.setAttribute(
      'aWu',
      new THREE.BufferAttribute(
        Int16Array.from(Wu, v => Math.max(-32768, Math.min(32767, Math.round(v * 10)))),
        2
      )
    );
    g.setIndex(nv > 65535 ? new THREE.Uint32BufferAttribute(IX, 1) : new THREE.Uint16BufferAttribute(IX, 1));
    g.computeBoundingSphere();
    if (!MAT) MAT = material();
    const me = new THREE.Mesh(g, MAT);
    me.name = 'ferne ' + B.I + '_' + B.J;
    me.castShadow = false;
    me.receiveShadow = true;
    me.matrixAutoUpdate = false;
    me.userData.noMerge = true;
    me.visible = !RATSCHER.map;
    scene.add(me);
    B.mesh = me;
    B.state = 'built';
    B.zv = WELT.n ? WELT.n.ok : 0;
    B.tris = IX.length / 3;
    S.built++;
    // the block's cells fade in (unless their detail is up already)
    for (let c = 0; c < 16; c++) {
      const f = fadeOf(texel(B.I * 4 + (c & 3), B.J * 4 + (c >> 2)));
      if (f.tgt > 0) f.cur = Math.min(f.cur, 0.001);
    }
    S.ms = Math.max(S.ms, Math.round(performance.now() - t0));
    markDirty();
    return true;
  }
  function dropBlock(B) {
    if (B.mesh) {
      scene.remove(B.mesh);
      B.mesh.geometry.dispose();
    }
    B.mesh = null;
    B.parts = null;
    B.work = null;
    B.state = 'idle';
  }
  // the ground again under a block near the camera when finer tiles came in (one block per call; buildings off by more than 0.3 m)
  function reground(B) {
    const pos = B.mesh.geometry.attributes.position,
      a = pos.array,
      p = B.parts;
    let moved = 0;
    for (let k = 0; k < p.length; k += 5) {
      const z = ground(p[k], p[k + 1]);
      if (!Number.isFinite(z) || Math.abs(z - p[k + 2]) < 0.3) continue;
      const dz = z - p[k + 2];
      p[k + 2] = z;
      for (let v = p[k + 3], e = v + p[k + 4]; v < e; v++) a[v * 3 + 1] += dz;
      moved++;
    }
    if (moved) {
      pos.needsUpdate = true;
      B.mesh.geometry.computeBoundingSphere();
      markDirty();
    }
    B.zv = WELT.n ? WELT.n.ok : 0;
    return moved;
  }
  // ---- which cells have their detail up: gebaeude.js's built cells, Schleusingen's zone ----
  function hiddenNow() {
    const out = new Set(),
      G = window.GEB && GEB.Z;
    if (G && G.cells)
      for (const c of G.cells.values()) if (c.meshes && c.meshes.length) out.add(texel(c.ij[0], c.ij[1]));
    if (window.SCHL && SCHL.state === 'ready') out.add(0);
    return out;
  }
  let acc = 0,
    CUR = null,
    lastHidden = new Set(),
    vis = true;
  function tick(dt) {
    if (!S.ready) return;
    const want = !RATSCHER.map && S.on;
    if (want !== vis) {
      vis = want;
      for (const B of S.blocks.values()) if (B.mesh) B.mesh.visible = vis;
      markDirty();
    }
    if (!vis) return;
    // the fades: cells whose detail came (dissolve over 0.8 s), went (back at once), new blocks (in over 1 s)
    const hid = hiddenNow();
    for (const k of hid)
      if (!lastHidden.has(k)) {
        const f = fadeOf(k);
        f.tgt = 0;
      }
    for (const k of lastHidden)
      if (!hid.has(k)) {
        const f = fadeOf(k);
        f.tgt = 1;
        f.cur = 1;
      }
    lastHidden = hid;
    let changed = false;
    for (const [k, f] of FADE) {
      if (f.cur !== f.tgt) {
        f.cur = f.tgt > f.cur ? Math.min(f.tgt, f.cur + dt) : Math.max(f.tgt, f.cur - dt / 0.8);
        changed = true;
      }
      const v = Math.round(f.cur * 255);
      if (tex[k] !== v) {
        tex[k] = v;
        changed = true;
      }
      if (f.cur === 1 && f.tgt === 1) FADE.delete(k);
    }
    if (changed) {
      cellTex.needsUpdate = true;
      markDirty();
    }
    // a block being built: its next slice (3 ms a frame)
    if (CUR) {
      try {
        if (buildBlock(CUR, 3)) CUR = null;
      } catch (e) {
        CUR.state = 'error';
        CUR.work = null;
        CUR = null;
        S.err = String(e);
        console.warn('ferne', e);
      }
      return;
    }
    // range and blocks, a few times a second: start the nearest wanted block, free the far ones, ground again
    acc += dt;
    if (acc < 0.25) return;
    acc = 0;
    const r = range();
    U.uFeD.value.set(r[0], r[1], r[2], r[3]);
    const x = cam.position.x,
      y = -cam.position.z,
      far = r[3];
    let best = null,
      bd = Infinity;
    for (const B of S.blocks.values()) {
      const dx = Math.max(B.I * BLOCK - x, 0, x - (B.I + 1) * BLOCK),
        dy = Math.max(B.J * BLOCK - y, 0, y - (B.J + 1) * BLOCK),
        d = Math.hypot(dx, dy);
      B.near = d;
      if (B.mesh && d > far + 600) dropBlock(B);
      else if (
        !B.mesh &&
        B.state !== 'error' &&
        d < far &&
        d < bd &&
        Math.hypot(B.I * BLOCK + 800, B.J * BLOCK + 800) < 12700
      ) {
        bd = d;
        best = B;
      }
    }
    if (best) {
      best.state = 'building';
      CUR = best;
      return;
    }
    const zv = WELT.n ? WELT.n.ok : 0;
    for (const B of S.blocks.values())
      if (B.mesh && B.near < 1500 && B.zv !== zv) {
        reground(B);
        break;
      }
  }
  function set(o) {
    if (o && 'on' in o) S.on = !!o.on;
    if (o && 'far' in o) S.farUser = +o.far || 0;
    markDirty();
    return state();
  }
  function state() {
    let blocks = 0,
      buildings = 0,
      tris = 0;
    for (const B of S.blocks.values())
      if (B.mesh) {
        blocks++;
        buildings += B.parts.length / 5;
        tris += B.tris;
      }
    return {
      on: S.on,
      ready: S.ready,
      blocks,
      built: S.built,
      buildings,
      tris,
      ms: S.ms,
      hidden: lastHidden.size,
      fading: [...FADE.values()].filter(f => f.cur !== f.tgt).length,
      range: range(),
      err: S.err,
    };
  }
  if (S.on) {
    whenLoaded(async () => {
      try {
        await fetchData();
        S.ready = true;
        markDirty();
      } catch (e) {
        S.err = String(e);
        console.warn('ferne', e);
      }
    });
    KERN.tick(tick, 'ferne');
  }
  S.state = state;
  S.cellFade = (i, j) => tex[texel(i, j)] / 255;
  S.set = set;
  S.U = U;
  return S;
})();
window.FERNE = FERNE;
