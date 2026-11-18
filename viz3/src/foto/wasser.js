// ===================== feat/fotorealismus: the water of the reservoir and the ponds (WASSER) =====================
// world/ratscher.js lays every water body of the geodata (the Ratscher reservoir, 82 ha, and seven ponds) as one flat polygon with a
// mirror-smooth material: a grey-blue plate with a hard edge, at the bank a still mirror. Once the world stands, the same water gets
// - waves: three layers of one tiling texture of slopes (a sum of random waves, drawn once, 256²), each at its own scale (wave
//   lengths of metres, of a metre, of a hand's width), drifting with the wind at the speed of such waves and crossing one another.
//   Their steepness follows the weather's wind (Cox and Munk's mean square slope of a wind-ruffled surface, less for the short
//   fetch of an inland lake) – calm: a slow, flat swell that mirrors the sky; windy: ruffled, the mirror broken up. A fourth, very
//   large layer makes the gusts' patches: stretches of smoother and of rougher water side by side, as on every lake.
// - the right gloss at every distance: waves too small for the picture's pixels (far away, or seen flat) no longer tilt the surface –
//   their slopes become roughness instead (a GGX lobe of the same slope variance). So the sun's glitter is a narrow, sparkling path
//   near the bank and a wide, soft one far out, and the far water mirrors a blurred sky instead of a sharp one. Towards the horizon
//   the waves' fronts hide their backs: seen flat the surface is flattened and roughened the same way.
// - a bank: every body carries a small map of the distance to its bank (drawn once from its outline, 0.4–3.2 m a texel, exact near
//   the bank). In the last two and a half metres the water thins out to nothing – the aerial photo's own bank shows through –,
//   behind it lies a band of lighter, greener shallows before the dark of the deep.
// - the sun's shadows (the trees of the bank, the dam; the hills' at a low sun): the glitter ends where the shadow begins.
// No new light, no render pass, one shader program (in place of the old one), one texture of 256² and a bank map per body (the
// reservoir's: 200 kB). The water moves in real time, not in the game's; it asks for pictures (15 a second) only while it is in the
// picture and within 600 m, and not on tier „schnell“ or a phone – there it moves when the picture is drawn anyway (as the brook,
// garden/stream.js).
//   ?nowasser            the water as world/ratscher.js made it (comparisons)
//   WASSER.state()       { on, built, bodies, tris, maps: [[w, h, m per texel], …], ms, wind, slope, near }
//   WASSER.set({ on })   the old plate back, or the waves again (comparisons in one session)
//   WASSER.step(s)       moves the waves on by s seconds (tests; with window.FREEZE they stand still otherwise)
//   WASSER.bank(x, y)    the distance to the nearest bank as the maps hold it (m; inside positive, outside negative; null: no map there)
import * as THREE from 'three';
import { COARSE, QS, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { ANISO, markDirty, whenLoaded } from '../core/assets.js';
import { RENDER } from '../render/render.js';
import { RATSCHER } from '../world/ratscher.js';
export const WASSER = (() => {
  const S = {
    on: !QS.has('nowasser'),
    built: false,
    bodies: 0,
    tris: 0,
    maps: [],
    ms: 0,
    wind: 0,
    dir: 250,
    slope: 0,
    near: Infinity,
    live: false,
    last: 0,
    req: 0,
    old: [],
    neu: [],
    fields: [],
  };
  // the three layers of waves – T: the tile (m); v: how fast its waves run (m/s); a: their course against the wind (rad); r: the
  // tile's own turn (rad; hides the grid of the repeats); w: its share of the slopes (the squares add up to 1); l: the length of
  // the waves that carry most of it (m; below a pixel's size they turn into roughness)
  const LAY = [
    { T: 23, v: 1.7, a: 0, r: 0, w: 0.35, l: 3.5 },
    { T: 7.3, v: 1.0, a: 0.42, r: 0.65, w: 0.6, l: 1.1 },
    { T: 2.1, v: 0.5, a: -0.35, r: -1.12, w: 0.72, l: 0.32 },
  ];
  const GUST = 610; // the tile of the gusts' patches (m)
  const NEAR = 600; // within this the moving water asks for pictures (m)
  const LO = -8, // the bank maps hold distances from LO (outside) to HI (inside), a byte's step: 0.125 m
    HI = 24;
  const SHALLOW = new THREE.Color(0x596150); // the bed showing through at the bank (the deep: the material's colour)
  const U = {
    tWa: { value: null },
    // the tiles' drift, 0–1: layer 1 (x, y), layer 2 (z, w); layer 3 (x, y), the gusts (z, w)
    uWaO1: { value: new THREE.Vector4(0, 0, 0.37, 0.61) },
    uWaO2: { value: new THREE.Vector4(0.83, 0.19, 0.13, 0.52) },
    // x: the waves' steepness (root mean square slope)
    uWaA: { value: new THREE.Vector4(0.04, 0, 0, 0) },
  };
  // ---------- the tile: slopes of a sum of random waves (r, g: their two components, 4 root mean squares to a byte's half range) and a
  // slow, smooth field (b: 0–1, the gusts' patches) ----------
  function tile() {
    const n = 256,
      N = n * n,
      sx = new Float32Array(N),
      sy = new Float32Array(N),
      hh = new Float32Array(N),
      SIN = new Float32Array(n);
    for (let i = 0; i < n; i++) SIN[i] = Math.sin((6.283185307 * i) / n);
    let seed = 20261118;
    const rnd = () => {
      seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    // waves of 3 to 18 crests across the tile, running every way, the longer ones steeper
    for (let j = 0; j < 24; j++) {
      const ang = rnd() * 6.283185307,
        kk = 3 + rnd() * rnd() * 15,
        kx = Math.round(Math.cos(ang) * kk),
        ky = Math.round(Math.sin(ang) * kk),
        k = Math.hypot(kx, ky),
        ph = Math.floor(rnd() * n);
      if (k < 1) continue;
      const a = (0.6 + 0.8 * rnd()) / Math.sqrt(k),
        ax = (a * kx) / k,
        ay = (a * ky) / k;
      for (let y = 0, o = 0; y < n; y++)
        for (let x = 0; x < n; x++, o++) {
          const c = SIN[(kx * x + ky * y + ph + 64) & 255]; // the height's sine, a quarter on: its slope
          sx[o] += c * ax;
          sy[o] += c * ay;
        }
    }
    // the gusts: one to three crests across the tile
    for (let j = 0; j < 7; j++) {
      const kx = Math.round(rnd() * 6 - 3),
        ky = Math.round(rnd() * 6 - 3),
        ph = Math.floor(rnd() * n),
        a = 0.5 + rnd();
      if (!kx && !ky) continue;
      for (let y = 0, o = 0; y < n; y++)
        for (let x = 0; x < n; x++, o++) hh[o] += a * SIN[(kx * x + ky * y + ph) & 255];
    }
    let q = 0,
      lo = Infinity,
      hi = -Infinity;
    for (let o = 0; o < N; o++) {
      q += sx[o] * sx[o] + sy[o] * sy[o];
      if (hh[o] < lo) lo = hh[o];
      if (hh[o] > hi) hi = hh[o];
    }
    const k = 127.5 / (4 * Math.sqrt(q / N)),
      d = new Uint8Array(N * 4);
    for (let o = 0; o < N; o++) {
      d[o * 4] = Math.max(0, Math.min(255, Math.round(127.5 + sx[o] * k)));
      d[o * 4 + 1] = Math.max(0, Math.min(255, Math.round(127.5 + sy[o] * k)));
      d[o * 4 + 2] = Math.round((255 * (hh[o] - lo)) / (hi - lo || 1));
      d[o * 4 + 3] = 255;
    }
    const t = new THREE.DataTexture(d, n, n, THREE.RGBAFormat, THREE.UnsignedByteType);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = ANISO;
    t.needsUpdate = true;
    return t;
  }
  // ---------- a body's triangles, all turned the same way, and its bank: the edges that only one triangle has ----------
  function outline(w) {
    const T = [],
      cnt = new Map(),
      key = (a, b) => (a < b ? a * 65536 + b : b * 65536 + a);
    for (let t = 0; t < w.tri.length; t += 3) {
      const p = w.tri[t],
        q = w.tri[t + 1],
        r = w.tri[t + 2];
      if ((w.x[q] - w.x[p]) * (w.y[r] - w.y[p]) - (w.y[q] - w.y[p]) * (w.x[r] - w.x[p]) >= 0) T.push(p, q, r);
      else T.push(p, r, q);
      for (const [a, b] of [
        [p, q],
        [q, r],
        [r, p],
      ])
        cnt.set(key(a, b), (cnt.get(key(a, b)) || 0) + 1);
    }
    const B = []; // a bank edge: from (x, z) by (ux, uz) – three's axes, z south
    for (const [k, c] of cnt)
      if (c === 1) {
        const a = Math.floor(k / 65536),
          b = k % 65536;
        B.push(w.x[a], -w.y[a], w.x[b] - w.x[a], -(w.y[b] - w.y[a]));
      }
    return { T, B };
  }
  // ---------- the map of the distance to the bank: exact within HI of it (each bank edge writes its neighbourhood), inside or
  // outside row by row from the edges the row crosses ----------
  function field(B) {
    let x0 = Infinity,
      x1 = -Infinity,
      z0 = Infinity,
      z1 = -Infinity;
    for (let i = 0; i < B.length; i += 4)
      for (const [x, z] of [
        [B[i], B[i + 1]],
        [B[i] + B[i + 2], B[i + 1] + B[i + 3]],
      ]) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (z < z0) z0 = z;
        if (z > z1) z1 = z;
      }
    const s = Math.min(3.2, Math.max(0.4, Math.max(x1 - x0, z1 - z0) / 480)),
      pad = 4 * s + 2,
      W = Math.ceil((x1 - x0 + 2 * pad) / s),
      H = Math.ceil((z1 - z0 + 2 * pad) / s),
      R = HI + s,
      d2 = new Float32Array(W * H).fill(R * R);
    x0 -= pad;
    z0 -= pad;
    for (let e = 0; e < B.length; e += 4) {
      const ax = B[e],
        az = B[e + 1],
        ux = B[e + 2],
        uz = B[e + 3],
        L = ux * ux + uz * uz || 1,
        i0 = Math.max(0, Math.floor((Math.min(ax, ax + ux) - R - x0) / s)),
        i1 = Math.min(W - 1, Math.ceil((Math.max(ax, ax + ux) + R - x0) / s)),
        j0 = Math.max(0, Math.floor((Math.min(az, az + uz) - R - z0) / s)),
        j1 = Math.min(H - 1, Math.ceil((Math.max(az, az + uz) + R - z0) / s));
      for (let j = j0; j <= j1; j++) {
        const rz = z0 + (j + 0.5) * s - az;
        for (let i = i0, o = j * W + i0; i <= i1; i++, o++) {
          const rx = x0 + (i + 0.5) * s - ax;
          let t = (rx * ux + rz * uz) / L;
          t = t < 0 ? 0 : t > 1 ? 1 : t;
          const px = rx - t * ux,
            pz = rz - t * uz,
            q = px * px + pz * pz;
          if (q < d2[o]) d2[o] = q;
        }
      }
    }
    const d = new Uint8Array(W * H),
      xs = [];
    for (let j = 0; j < H; j++) {
      const zc = z0 + (j + 0.5) * s;
      xs.length = 0;
      for (let e = 0; e < B.length; e += 4) {
        const az = B[e + 1],
          bz = az + B[e + 3];
        if (az > zc !== bz > zc) xs.push(B[e] + ((zc - az) / (bz - az)) * B[e + 2]);
      }
      xs.sort((a, b) => a - b);
      for (let i = 0, o = j * W, n = 0; i < W; i++, o++) {
        const xc = x0 + (i + 0.5) * s;
        while (n < xs.length && xs[n] < xc) n++;
        const v = Math.sqrt(d2[o]) * (n & 1 ? 1 : -1);
        d[o] = Math.round((255 * (Math.min(HI, Math.max(LO, v)) - LO)) / (HI - LO));
      }
    }
    return { d, W, H, s, x0, z0 };
  }
  // ---------- the material: one program for all bodies, each with its bank map ----------
  function material(old, F) {
    const f = v => v.toFixed(4),
      m2 = l => `mat2( ${f(Math.cos(l.r))}, ${f(Math.sin(l.r))}, ${f(-Math.sin(l.r))}, ${f(Math.cos(l.r))} )`,
      [A, B, C] = LAY;
    const t = new THREE.DataTexture(F.d, F.W, F.H, THREE.RedFormat, THREE.UnsignedByteType);
    t.magFilter = t.minFilter = THREE.LinearFilter;
    t.generateMipmaps = false;
    t.unpackAlignment = 1;
    t.needsUpdate = true;
    const own = {
      tWaB: { value: t },
      // where the map lies: its corner (x, z) and 1 / its size (m)
      uWaB: { value: new THREE.Vector4(F.x0, F.z0, 1 / (F.W * F.s), 1 / (F.H * F.s)) },
    };
    const m = new THREE.MeshStandardMaterial({
      color: 0x34484b, // the deep: dark, more green than blue (the blue comes from the mirrored sky)
      roughness: 0.12,
      metalness: 0,
      envMapIntensity: 1.0,
      transparent: true,
      polygonOffset: old.polygonOffset,
      polygonOffsetFactor: old.polygonOffsetFactor,
      polygonOffsetUnits: old.polygonOffsetUnits,
    });
    m.onBeforeCompile = sh => {
      Object.assign(sh.uniforms, U, own);
      sh.vertexShader =
        'varying vec3 vWaP;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n  vWaP = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;'
        );
      sh.fragmentShader =
        'uniform sampler2D tWa; uniform sampler2D tWaB; uniform vec4 uWaB; uniform vec4 uWaO1; uniform vec4 uWaO2; uniform vec4 uWaA; varying vec3 vWaP; vec2 waS = vec2( 0.0 );\n' +
        sh.fragmentShader
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
  {
    // the distance to the bank (m): the shallows lighter and greener, the last metres thin out to the photo of the bank
    float waB = texture2D( tWaB, ( vWaP.xz - uWaB.xy ) * uWaB.zw ).r * ${f(HI - LO)} + ${f(LO)};
    diffuseColor.rgb = mix( vec3( ${f(SHALLOW.r)}, ${f(SHALLOW.g)}, ${f(SHALLOW.b)} ), diffuseColor.rgb, smoothstep( 0.4, 10.0, waB ) );
    diffuseColor.a *= smoothstep( 0.0, 2.6, waB );
  }`
          )
          .replace(
            '#include <roughnessmap_fragment>',
            `#include <roughnessmap_fragment>
  {
    vec2 waP = vWaP.xz, waX = dFdx( waP ), waY = dFdy( waP );
    float waFa = max( length( waX ), length( waY ) ), waFb = min( length( waX ), length( waY ) );
    float waF = max( waFb, waFa * 0.125 );   // a pixel's size on the water as the filter (anisotropic, 8) sees it
    float waG = texture2D( tWa, waP / ${f(GUST)} + uWaO2.zw ).b;
    float waA = uWaA.x * mix( 0.55, 1.3, smoothstep( 0.25, 0.75, waG ) );   // the gusts' patches
    mat2 waM2 = ${m2(B)}, waM3 = ${m2(C)};
    vec2 wa1 = texture2D( tWa, waP / ${f(A.T)} + uWaO1.xy ).rg * 2.0 - 1.0;
    vec2 wa2 = ( texture2D( tWa, waM2 * waP / ${f(B.T)} + uWaO1.zw ).rg * 2.0 - 1.0 ) * waM2;
    vec2 wa3 = ( texture2D( tWa, waM3 * waP / ${f(C.T)} + uWaO2.xy ).rg * 2.0 - 1.0 ) * waM3;
    // what the pixels no longer show of each layer, and seen flat: the waves' fronts hide their backs
    vec3 waL = smoothstep( vec3( ${f(A.l)}, ${f(B.l)}, ${f(C.l)} ) * 0.12, vec3( ${f(A.l)}, ${f(B.l)}, ${f(C.l)} ) * 0.7, vec3( waF ) );
    float waK = clamp( normalize( cameraPosition - vWaP ).y * 5.0, 0.3, 1.0 );
    vec3 waW = vec3( ${f(A.w * A.w)}, ${f(B.w * B.w)}, ${f(C.w * C.w)} );
    waS = ( wa1 * ${f(A.w)} + wa2 * ${f(B.w)} + wa3 * ${f(C.w)} ) * ( 4.0 * waA * waK );
    // the slopes that no longer tilt the surface, as the roughness of the same slope variance (GGX: alpha² = 2 variance)
    float waV = waA * waA * ( dot( waW, waL ) + ( 1.0 - waK * waK ) * dot( waW, 1.0 - waL ) );
    roughnessFactor = sqrt( sqrt( 0.0002 + 2.0 * waV ) );
  }`
          )
          .replace(
            '#include <normal_fragment_maps>',
            `#include <normal_fragment_maps>
  normal = normalize( ( viewMatrix * vec4( normalize( vec3( - waS.x, 1.0, - waS.y ) ), 0.0 ) ).xyz );`
          );
    };
    m.customProgramCacheKey = () => 'foto-wasser';
    return m;
  }
  // ---------- the waves' drift and steepness ----------
  function advance(dt, jump) {
    const W = window.WETTER && window.WETTER.S && window.WETTER.S.cur, // the weather of the moment (wetter/wetter.js): wind in m/s, where it comes from
      v = W && Number.isFinite(+W.wind) ? Math.max(0, +W.wind) : 0;
    if (W && Number.isFinite(+W.dir)) S.dir = +W.dir;
    S.wind += (v - S.wind) * (jump ? 1 : Math.min(1, dt * 0.4)); // a new wind takes a few seconds to ruffle the water
    // Cox and Munk (1954): the mean square slope of the sea is 0.003 + 0.00512 · wind (m/s); a lake of a kilometre: less
    S.slope = 0.7 * Math.sqrt(0.003 + 0.00512 * Math.min(12, S.wind));
    U.uWaA.value.x = S.slope;
    if (!(dt > 0)) return;
    // where the wind goes (it comes from S.dir): three's x east, z south
    const r = (S.dir * Math.PI) / 180,
      wx = -Math.sin(r),
      wz = Math.cos(r),
      O = [U.uWaO1.value, U.uWaO1.value, U.uWaO2.value],
      K = ['x', 'z', 'x'],
      K2 = ['y', 'w', 'y'];
    for (let i = 0; i < 3; i++) {
      const l = LAY[i],
        // the waves' course, then into the turned tile
        ca = Math.cos(l.a),
        sa = Math.sin(l.a),
        dx = wx * ca - wz * sa,
        dz = wx * sa + wz * ca,
        cr = Math.cos(l.r),
        sr = Math.sin(l.r),
        k = (l.v * dt) / l.T,
        u = O[i][K[i]] - (cr * dx - sr * dz) * k,
        w = O[i][K2[i]] - (sr * dx + cr * dz) * k;
      O[i][K[i]] = u - Math.floor(u);
      O[i][K2[i]] = w - Math.floor(w);
    }
    // the gusts travel with the wind
    const g = (Math.max(1, S.wind) * dt) / GUST,
      o = U.uWaO2.value;
    o.z -= wx * g;
    o.w -= wz * g;
    o.z -= Math.floor(o.z);
    o.w -= Math.floor(o.w);
  }
  function seen(d) {
    const now = performance.now(),
      still = !!window.FREEZE; // tests step the world by hand: the waves stand, the wind of the moment counts
    advance(still ? 0 : Math.min(0.1, Math.max(0, (now - S.last) / 1000)), still);
    S.near = now - S.last > 5 ? d : Math.min(S.near, d); // the nearest of the bodies in this picture
    S.last = now;
    if (d < NEAR && RENDER.tier !== 'schnell' && !COARSE) S.live = true;
  }
  // ---------- the bodies, in place of the plate ----------
  function build() {
    const M = window.GEOMAN,
      t0 = performance.now();
    if (!M || !M.water || !RATSCHER.water || !RATSCHER.water.length) return;
    const old = RATSCHER.water[0];
    U.tWa.value = tile();
    for (const w of M.water) {
      if (!w.tri || w.tri.length < 3) continue;
      const { T, B } = outline(w);
      if (!B.length) continue;
      const F = field(B),
        n = w.x.length,
        pos = new Float32Array(n * 3),
        nor = new Float32Array(n * 3),
        P = [];
      for (let i = 0; i < n; i++) {
        pos[i * 3] = w.x[i];
        pos[i * 3 + 1] = w.z;
        pos[i * 3 + 2] = -w.y[i];
        nor[i * 3 + 1] = 1;
        P.push(w.x[i], -w.y[i]);
      }
      // (for the distance to the camera: the corners and the middle of every triangle)
      for (let t = 0; t < T.length; t += 3)
        P.push((w.x[T[t]] + w.x[T[t + 1]] + w.x[T[t + 2]]) / 3, -(w.y[T[t]] + w.y[T[t + 1]] + w.y[T[t + 2]]) / 3);
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      g.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
      g.setIndex(T);
      g.computeBoundingBox();
      g.computeBoundingSphere();
      const me = new THREE.Mesh(g, material(old.material, F));
      me.name = 'wasser ' + (w.name || S.neu.length);
      me.userData.noMerge = true;
      me.receiveShadow = true;
      me.renderOrder = -1; // before everything else that is see-through (glass, rain, the brook)
      me.visible = old.visible;
      me.onBeforeRender = (r, s, c) => {
        let m = Infinity;
        const cx = c.position.x,
          cz = c.position.z;
        for (let i = 0; i < P.length; i += 2) {
          const a = P[i] - cx,
            b = P[i + 1] - cz,
            q = a * a + b * b;
          if (q < m) m = q;
        }
        seen(Math.sqrt(m + (c.position.y - w.z) ** 2));
      };
      scene.add(me);
      S.neu.push(me);
      S.fields.push(F);
      S.tris += T.length / 3;
      S.maps.push([F.W, F.H, +F.s.toFixed(2)]);
    }
    if (!S.neu.length) return;
    S.old = RATSCHER.water.slice();
    for (const o of S.old) scene.remove(o);
    RATSCHER.water.length = 0;
    RATSCHER.water.push(...S.neu);
    S.bodies = S.neu.length;
    advance(0, true);
    S.built = true;
    S.ms = Math.round(performance.now() - t0);
    markDirty();
  }
  function set(o) {
    if (o && 'on' in o && S.built && !!o.on !== S.on) {
      S.on = !!o.on;
      const vis = RATSCHER.water.length ? RATSCHER.water[0].visible : true,
        [a, b] = S.on ? [S.old, S.neu] : [S.neu, S.old];
      for (const m of a) scene.remove(m);
      for (const m of b) {
        m.visible = vis;
        scene.add(m);
      }
      RATSCHER.water.length = 0;
      RATSCHER.water.push(...b);
      markDirty();
    }
    return state();
  }
  const state = () => ({
    on: S.on,
    built: S.built,
    bodies: S.bodies,
    tris: S.tris,
    maps: S.maps,
    ms: S.ms,
    wind: +S.wind.toFixed(2),
    slope: +S.slope.toFixed(4),
    near: Number.isFinite(S.near) ? Math.round(S.near) : null,
  });
  function step(s) {
    advance(Math.max(0, +s || 0), true);
    markDirty();
    return state();
  }
  // the distance to the bank as the maps hold it at the model's (x, y): the nearest texel of the first map that covers the point
  function bank(x, y) {
    for (const F of S.fields) {
      const i = Math.floor((x - F.x0) / F.s),
        j = Math.floor((-y - F.z0) / F.s);
      if (i >= 0 && j >= 0 && i < F.W && j < F.H) return +((F.d[j * F.W + i] / 255) * (HI - LO) + LO).toFixed(2);
    }
    return null;
  }
  if (S.on) {
    whenLoaded(() => {
      try {
        build();
      } catch (e) {
        console.warn('wasser', e);
      }
    });
    // the moving water asks for its next picture, at most 15 a second and only after a picture that showed it nearby
    KERN.tick(() => {
      if (!S.live) return;
      const now = performance.now();
      if (now - S.req < 66) return;
      S.req = now;
      S.live = false;
      markDirty();
    }, 'wasser');
  }
  return { state, set, step, bank, outline, field, U, S, LAY };
})();
if (typeof window !== 'undefined') window.WASSER = WASSER;
