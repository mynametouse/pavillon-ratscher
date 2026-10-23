// ===================== WELT: the tiled world streamed around the player (tools/welt tiles on gh-pages welt-test/) =====================
// The quadtree of tools/welt (UTM 32N, tools/welt/wlib.py): terrain tiles (WTH1, 101 × 101 heights) and orthophoto tiles (512 px WebP) of
// levels 10–12 (400, 200, 100 m) in rings around the camera – loaded only while a zone asks for them (WELT.need, e.g. Schleusingen) and freed
// again when it no longer does. A tile is drawn when it is there and its children are not all there yet; skirts hide the steps between levels.
// Under drawn tiles the outer 120 m terrain of world/ratscher.js is lowered; where the inner 10 m terrain lies (bare earth, DGM1) the tiles
// step down instead and blend into its edge. KERN gets the height of the drawn triangles (terrain, ground) and 'free' (one may walk there).
// Tiles: <site>/welt-test/ (tests: dist/welt-test/, ?welt=<url> for another base). Sources and licences: welt-test/ATTRIBUTION.md.
import * as THREE from 'three';
import { scene, cam } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { ANISO, markDirty } from '../core/assets.js';
import { P } from '../game/walkable.js';
import { RATSCHER } from '../world/ratscher.js';
import { ROADS } from '../world/roads.js';
export const WELT = (() => {
  const M = window.GEOMAN;
  const S = {
    on: false,
    active: false,
    meta: null,
    base: '',
    tiles: new Map(),
    n: { req: 0, ok: 0, err: 0 },
    vis: 0,
    lowered: 0,
  };
  if (!M || !M.xf || !window.RATSCHER || !RATSCHER.on || typeof DecompressionStream === 'undefined') return S;
  S.on = true;
  const A = M.xf.a,
    B = M.xf.b,
    EX = M.xf.ex,
    EY = M.xf.ey,
    S2 = A * A + B * B;
  // model metres (x east, y north) <-> UTM
  const toU = (x, y) => [A * x - B * y + EX, B * x + A * y + EY];
  const toM = (E, N) => {
    const dx = E - EX,
      dy = N - EY;
    return [(A * dx + B * dy) / S2, (-B * dx + A * dy) / S2];
  };
  S.toU = toU;
  S.toM = toM;
  const ROOT_E0 = 420700,
    ROOT_N0 = 5390800,
    ROOT = 409600,
    NS = 51, // vertices per tile side as drawn (every second height: 2 m at level 12)
    RING = { 10: 760, 11: 380, 12: 150 }, // a tile of level L is wanted within this distance (m) of the camera
    SKIRT = { 10: 6, 11: 3, 12: 1.5 };
  const tsize = L => ROOT / (1 << L);
  const key = (L, x, y) => L + '/' + x + '/' + y;
  S.base = (() => {
    const q = new URLSearchParams(location.search).get('welt');
    if (q) return q.endsWith('/') ? q : q + '/';
    const p = location.pathname,
      k = p.indexOf('/pavillon-ratscher/');
    if (k >= 0) return location.origin + p.slice(0, k) + '/pavillon-ratscher/welt-test/';
    return 'welt-test/'; // the local test server serves viz3/dist (the tests copy the tiles they need there)
  })();
  // ---- zones that need the tiles: { at: (x, y) => boolean } ----
  const needs = new Set();
  S.need = (id, on) => {
    if (on) needs.add(id);
    else needs.delete(id);
  };
  // ---- meta ----
  let metaP = null;
  function meta() {
    if (!metaP)
      metaP = fetch(S.base + 'meta.json')
        .then(r => (r.ok ? r.json() : Promise.reject(new Error('meta ' + r.status))))
        .then(j => (S.meta = j))
        .catch(e => {
          metaP = null;
          S.err = String(e);
          throw e;
        });
    return metaP;
  }
  const inRect = (L, x, y) => {
    const r = S.meta && S.meta.tiling.levels[L] && S.meta.tiling.levels[L].rect;
    return !!r && x >= r[0] && x <= r[2] && y >= r[1] && y <= r[3];
  };
  // ---- terrain decoding (tools/welt/tiles.py: Lorenzo residuals in cm, zlib) ----
  async function inflate(buf) {
    const ds = new DecompressionStream('deflate');
    return new Response(new Blob([buf]).stream().pipeThrough(ds)).arrayBuffer();
  }
  async function terrain(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const buf = await r.arrayBuffer(),
      dv = new DataView(buf);
    if (String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3)) !== 'WTH1')
      throw new Error('not WTH1');
    const n = dv.getUint16(4, true),
      flags = dv.getUint16(6, true),
      base = dv.getInt32(8, true),
      raw = await inflate(buf.slice(20)),
      res = new Int32Array(n * n);
    if (flags & 1) {
      const d2 = new DataView(raw);
      for (let i = 0; i < n * n; i++) res[i] = d2.getInt32(i * 4, true);
    } else {
      const u8 = new Uint8Array(raw);
      for (let i = 0; i < n * n; i++) {
        const z = u8[i] | (u8[n * n + i] << 8);
        res[i] = (z >>> 1) ^ -(z & 1);
      }
    }
    const q = new Int32Array(n * n);
    q[0] = base;
    for (let i = 1; i < n; i++) q[i] = q[i - 1] + res[i];
    for (let j = 1; j < n; j++) {
      const o = j * n;
      q[o] = q[o - n] + res[o];
      for (let i = 1; i < n; i++) q[o + i] = res[o + i] + q[o - n + i] + q[o + i - 1] - q[o - n + i - 1];
    }
    const h = new Float32Array(n * n);
    for (let i = 0; i < n * n; i++) h[i] = q[i] / 100;
    return { n, h };
  }
  // ---- the inner 10 m terrain of world/ratscher.js stays: tiles blend into its edge and step down beneath it ----
  const RB = () => RATSCHER.box; // [x0, y0, x1, y1] model
  function innerFix(x, y, z, cell) {
    const b = RB();
    if (!b || !RATSCHER.hMesh) return z;
    const dIn = Math.min(x - b[0], b[2] - x, y - b[1], b[3] - y);
    if (dIn > 0) return RATSCHER.hMesh(x, y) - 0.3 - (dIn > 2.5 * cell ? 30 : 0);
    const dx = Math.max(b[0] - x, 0, x - b[2]),
      dy = Math.max(b[1] - y, 0, y - b[3]),
      d = Math.hypot(dx, dy);
    if (d > 80) return z;
    const hb = RATSCHER.hMesh(Math.min(b[2], Math.max(b[0], x)), Math.min(b[3], Math.max(b[1], y))),
      t = d / 80,
      w = t * t * (3 - 2 * t);
    return hb + (z - hb) * w;
  }
  const insideBox = (x, y) => {
    const b = RB();
    return !!b && x > b[0] && x < b[2] && y > b[1] && y < b[3];
  };
  // ---- tiles ----
  // the ground of the tiles looks like the land of world/ratscher.js: the photo lifted from haze, bright land compressed, grain of grass
  // and soil up close (ROADS.shader: landDetail), and grey surfaces (streets, squares) get sett stones up close
  // a zone may lay its streets over the photo (WELT.setOverlay: a canvas over a square, r = cover, g/r = surface: asphalt with kerbs,
  // sett, paving slabs)
  const OVER = {
    tOver: { value: new THREE.DataTexture(new Uint8Array(4), 1, 1) },
    uOver: { value: new THREE.Vector4(0, 0, 0, 0) },
  };
  OVER.tOver.value.needsUpdate = true;
  S.setOverlay = (tex, x0, y0, size) => {
    const old = OVER.tOver.value;
    OVER.tOver.value = tex || new THREE.DataTexture(new Uint8Array(4), 1, 1);
    if (!tex) OVER.tOver.value.needsUpdate = true;
    OVER.uOver.value.set(x0 || 0, y0 || 0, size ? 1 / size : 0, tex ? 1 : 0);
    if (old && old !== tex) old.dispose();
    markDirty(true);
  };
  const TILE_GLSL = `uniform sampler2D tOver; uniform vec4 uOver;
    vec3 setts( vec2 p, vec3 c, float sc, float fwp ) {   // small stones in offset rows, each a little different, dark joints
      vec2 q = p * sc; q.x += 0.5 * mod( floor( q.y ), 2.0 );
      vec2 f = fract( q ); float fine = 1.0 - smoothstep( 0.15, 0.6, fwp * sc );
      float jt = ( 1.0 - smoothstep( 0.0, 0.14, min( min( f.x, 1.0 - f.x ), min( f.y, 1.0 - f.y ) ) ) ) * fine;
      return c * ( 0.84 + 0.32 * rdH( floor( q ) ) * fine ) * ( 1.0 - 0.45 * jt ); }
    vec3 weltGround( vec2 p, vec3 c, float dist ) {
      // derivatives and texture reads first, before any branch that differs per pixel
      float fwp = fwidth( p.x ) + fwidth( p.y );
      vec2 ou = ( p - uOver.xy ) * uOver.z;
      float ins = uOver.w * step( 0.0, ou.x ) * step( 0.0, ou.y ) * step( ou.x, 1.0 ) * step( ou.y, 1.0 );
      vec4 o = texture( tOver, clamp( ou, 0.0, 1.0 ) ) * ins;
      float mx = max( c.r, max( c.g, c.b ) ), mn = min( c.r, min( c.g, c.b ) ), chroma = ( mx - mn ) / max( mx, 0.02 ), lum = dot( c, vec3( 0.3, 0.59, 0.11 ) );
      float near = 1.0 - smoothstep( 40.0, 90.0, dist ), pave = ( 1.0 - smoothstep( 0.1, 0.24, chroma ) ) * smoothstep( 0.03, 0.07, mx ) * near;
      vec3 g = landDetail( p, c, dist );
      if ( o.r > 0.03 ) {
        float code = o.g / max( o.r, 0.01 ), cov = o.r, n1 = rdN( p * 0.6 ), n2 = rdN( p * 5.0 );
        vec3 r;
        if ( code < 0.3 ) r = vec3( 0.085, 0.088, 0.092 ) * clamp( lum / 0.14, 0.75, 1.3 ) * ( 0.86 + 0.24 * n1 ) * ( 0.92 + 0.16 * n2 );   // asphalt, patches after the photo
        else if ( code < 0.62 ) r = setts( p, vec3( 0.165, 0.152, 0.138 ) * clamp( lum / 0.26, 0.75, 1.12 ) * ( 0.85 + 0.3 * n1 ), 8.0, fwp );   // sett: grey-brown, worn patches
        else r = setts( p * vec2( 1.0, 0.5 ), vec3( 0.27, 0.26, 0.245 ), 3.3, fwp );   // paving slabs
        float kerb = code < 0.3 ? ( 1.0 - smoothstep( 0.08, 0.2, abs( cov - 0.42 ) ) ) * near : 0.0;   // a light kerb stone along the asphalt
        r = mix( r, vec3( 0.36, 0.355, 0.34 ) * ( 0.9 + 0.2 * n2 ), kerb );
        g = mix( g, r, clamp( smoothstep( 0.3, 0.55, cov ) + kerb, 0.0, 1.0 ) );
      } else if ( pave > 0.01 ) g = mix( g, setts( p, landHi( c ) * 0.78, 7.5, fwp ), pave );
      return g; }`;
  const STUB =
    'float rdH( vec2 p ) { return 0.5; } float rdN( vec2 p ) { return 0.5; } vec3 landDetail( vec2 p, vec3 c, float d ) { return c * 0.8; } vec3 landHi( vec3 c ) { return c; }';
  // one material per tile (its photo); all share one program
  function tileMat(tex) {
    const m = new THREE.MeshStandardMaterial({
      map: tex,
      roughness: 1,
      metalness: 0,
      envMapIntensity: 0.55,
      polygonOffset: true,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 2,
    });
    m.onBeforeCompile = sh => {
      const G = ROADS.shader ? ROADS.shader(sh) : STUB;
      Object.assign(sh.uniforms, OVER);
      sh.vertexShader =
        'varying vec2 vGeo;\n' +
        sh.vertexShader.replace(
          '#include <begin_vertex>',
          '#include <begin_vertex>\n vGeo = vec2( position.x, -position.z );'
        );
      sh.fragmentShader =
        'varying vec2 vGeo;\n' +
        G +
        '\n' +
        TILE_GLSL +
        '\n' +
        sh.fragmentShader.replace(
          '#include <map_fragment>',
          '#include <map_fragment>\n diffuseColor.rgb = weltGround( vGeo, diffuseColor.rgb, length( vViewPosition ) );'
        );
    };
    m.customProgramCacheKey = () => 'welt-tile' + (window.GLCHECK && GLCHECK.lite ? '-lite' : '');
    return m;
  }
  // ---- level pads: a zone may set the terrain flat inside a polygon (a courtyard, the floor of a hall) ----
  const pads = [];
  const inPoly = (P, x, y) => {
    let c = false;
    for (let p = 0, q = P.length - 2; p < P.length; q = p, p += 2) {
      const xi = P[p],
        yi = P[p + 1],
        xj = P[q],
        yj = P[q + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  };
  function padZ(x, y) {
    for (const p of pads)
      if (x > p.bb[0] && x < p.bb[2] && y > p.bb[1] && y < p.bb[3] && inPoly(p.poly, x, y)) return p.z;
    return undefined;
  }
  S.setPads = (id, list) => {
    for (let i = pads.length - 1; i >= 0; i--) if (pads[i].id === id) pads.splice(i, 1);
    for (const { poly, z } of list || []) {
      const xs = poly.filter((v, k) => k % 2 === 0),
        ys = poly.filter((v, k) => k % 2 === 1);
      pads.push({ id, poly, z, bb: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] });
    }
    for (const t of S.tiles.values())
      if (t.mesh && t.h) {
        const old = t.mesh.geometry;
        t.mesh.geometry = makeGeo(t);
        old.dispose();
      }
    markDirty(true);
  };
  function buildMesh(t) {
    const me = new THREE.Mesh(makeGeo(t), tileMat(t.tex));
    me.userData.noMerge = true;
    me.receiveShadow = false;
    me.castShadow = false;
    me.visible = false;
    me.name = 'welt ' + t.k;
    scene.add(me);
    t.mesh = me;
  }
  function makeGeo(t) {
    const n = t.n,
      st = (n - 1) / (NS - 1),
      s = tsize(t.L),
      cell = s / (NS - 1),
      pos = new Float32Array((NS * NS + 4 * NS) * 3),
      uv = new Float32Array((NS * NS + 4 * NS) * 2),
      hz = new Float32Array(NS * NS);
    for (let j = 0; j < NS; j++)
      for (let i = 0; i < NS; i++) {
        const E = t.e0 + (i / (NS - 1)) * s,
          N = t.n0 + (j / (NS - 1)) * s,
          [x, y] = toM(E, N),
          pz = pads.length ? padZ(x, y) : undefined,
          z = pz !== undefined ? pz : innerFix(x, y, t.h[j * st * n + i * st], cell),
          k = j * NS + i;
        hz[k] = z;
        pos[k * 3] = x;
        pos[k * 3 + 1] = z;
        pos[k * 3 + 2] = -y;
        uv[k * 2] = i / (NS - 1);
        uv[k * 2 + 1] = j / (NS - 1);
      }
    const idx = [];
    for (let j = 0; j < NS - 1; j++)
      for (let i = 0; i < NS - 1; i++) {
        const a = j * NS + i,
          b = a + 1,
          c = a + NS + 1,
          d = a + NS;
        idx.push(a, b, c, a, c, d);
      }
    // skirts: the border pulled down (no gaps to a coarser neighbour)
    let v = NS * NS;
    const sk = SKIRT[t.L],
      border = [];
    for (let i = 0; i < NS; i++) border.push(i); // south, west to east
    for (let j = 1; j < NS; j++) border.push(j * NS + NS - 1); // east, south to north
    for (let i = NS - 2; i >= 0; i--) border.push((NS - 1) * NS + i); // north, east to west
    for (let j = NS - 2; j >= 1; j--) border.push(j * NS); // west, north to south
    const first = v;
    for (const k of border) {
      pos[v * 3] = pos[k * 3];
      pos[v * 3 + 1] = pos[k * 3 + 1] - sk;
      pos[v * 3 + 2] = pos[k * 3 + 2];
      uv[v * 2] = uv[k * 2];
      uv[v * 2 + 1] = uv[k * 2 + 1];
      v++;
    }
    for (let q = 0; q < border.length; q++) {
      const a = border[q],
        b = border[(q + 1) % border.length],
        a2 = first + q,
        b2 = first + ((q + 1) % border.length);
      idx.push(a, a2, b2, a, b2, b); // the ring runs counter-clockwise: these face outwards
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, v * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv.subarray(0, v * 2), 2));
    g.setIndex(idx);
    g.computeVertexNormals();
    g.computeBoundingSphere();
    t.hz = hz; // the drawn heights (KERN), the raw ones stay for a rebuild with pads
    return g;
  }
  const queue = [];
  let busy = 0;
  function request(L, x, y) {
    const k = key(L, x, y);
    let t = S.tiles.get(k);
    if (t) return t;
    const s = tsize(L);
    t = { k, L, x, y, e0: ROOT_E0 + x * s, n0: ROOT_N0 + y * s, st: 'wait', mesh: null, used: 0 };
    S.tiles.set(k, t);
    queue.push(t);
    return t;
  }
  function pump() {
    while (busy < 4 && queue.length) {
      queue.sort((a, b) => a.L - b.L || a.d - b.d);
      const t = queue.shift();
      if (t.st !== 'wait') continue;
      t.st = 'load';
      busy++;
      S.n.req++;
      const tp = terrain(S.base + `t/${t.L}/${t.x}/${t.y}.bin`),
        ip = new Promise((res, rej) =>
          new THREE.TextureLoader().load(S.base + `i/${t.L}/${t.x}/${t.y}.webp`, res, undefined, rej)
        );
      Promise.all([tp, ip])
        .then(([tr, tex]) => {
          busy--;
          if (t.st === 'gone') {
            tex.dispose();
            return;
          }
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = ANISO;
          tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
          t.n = tr.n;
          t.h = tr.h;
          t.tex = tex;
          buildMesh(t);
          t.st = 'ok';
          S.n.ok++;
          dirty = true;
        })
        .catch(e => {
          busy--;
          t.st = 'err';
          S.n.err++;
          S.lastErr = String(e);
        });
    }
  }
  function drop(t) {
    if (t.mesh) {
      scene.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mesh.material.dispose();
    }
    if (t.tex) t.tex.dispose();
    t.mesh = null;
    t.tex = null;
    t.st = 'gone';
    S.tiles.delete(t.k);
  }
  // ---- which tiles: level-10 roots near the camera, refined where a finer ring reaches ----
  let refined = new Set(),
    roots = [],
    dirty = false;
  const distTo = (L, x, y, E, N) => {
    const s = tsize(L),
      e0 = ROOT_E0 + x * s,
      n0 = ROOT_N0 + y * s;
    return Math.hypot(Math.max(e0 - E, 0, E - e0 - s), Math.max(n0 - N, 0, N - n0 - s));
  };
  function plan(E, N) {
    const W = new Set(),
      R = new Set(),
      s10 = tsize(10),
      r = RING[10],
      x0 = Math.floor((E - r - ROOT_E0) / s10),
      x1 = Math.floor((E + r - ROOT_E0) / s10),
      y0 = Math.floor((N - r - ROOT_N0) / s10),
      y1 = Math.floor((N + r - ROOT_N0) / s10);
    roots = [];
    const refine = (L, x, y) => {
      const d = distTo(L, x, y, E, N);
      const kids = [
        [2 * x, 2 * y],
        [2 * x + 1, 2 * y],
        [2 * x, 2 * y + 1],
        [2 * x + 1, 2 * y + 1],
      ];
      if (L < 12 && d < RING[L + 1] && kids.every(([a, b]) => inRect(L + 1, a, b))) {
        R.add(key(L, x, y));
        for (const [a, b] of kids) refine(L + 1, a, b);
      } else W.add(key(L, x, y));
      const t = request(L, x, y);
      t.d = d;
      t.used = performance.now();
    };
    for (let x = x0; x <= x1; x++)
      for (let y = y0; y <= y1; y++)
        if (inRect(10, x, y) && distTo(10, x, y, E, N) < r) {
          roots.push([x, y]);
          refine(10, x, y);
        }
    S.want = W.size;
    refined = R;
  }
  // ---- what is drawn: a tile whose children are not all ready yet stands in for them ----
  const ready = (L, x, y) => {
    const t = S.tiles.get(key(L, x, y));
    if (t && t.st === 'ok') return true;
    if (!refined.has(key(L, x, y))) return false;
    return [
      [2 * x, 2 * y],
      [2 * x + 1, 2 * y],
      [2 * x, 2 * y + 1],
      [2 * x + 1, 2 * y + 1],
    ].every(([a, b]) => ready(L + 1, a, b));
  };
  let covered = new Set();
  function display() {
    const vis = new Set(),
      cov = new Set();
    const put = (L, x, y) => {
      const k = key(L, x, y);
      if (refined.has(k)) {
        const kids = [
          [2 * x, 2 * y],
          [2 * x + 1, 2 * y],
          [2 * x, 2 * y + 1],
          [2 * x + 1, 2 * y + 1],
        ];
        if (kids.every(([a, b]) => ready(L + 1, a, b))) {
          for (const [a, b] of kids) put(L + 1, a, b);
          return true;
        }
      }
      const t = S.tiles.get(k);
      if (t && t.st === 'ok') {
        vis.add(k);
        return true;
      }
      return false;
    };
    for (const [x, y] of roots) if (put(10, x, y)) cov.add(key(10, x, y));
    let ch = false;
    for (const t of S.tiles.values())
      if (t.mesh) {
        const v = vis.has(t.k);
        if (t.mesh.visible !== v) {
          t.mesh.visible = v;
          ch = true;
        }
      }
    S.vis = vis.size;
    S.visible = vis;
    const covKey = [...cov].sort().join(',');
    if (covKey !== S.covKey) {
      S.covKey = covKey;
      covered = cov;
      lowerOuter();
      ch = true;
    }
    if (ch) markDirty(true);
  }
  // ---- the outer 120 m terrain of world/ratscher.js sinks where the tiles are drawn (vertices whose neighbourhood is covered) ----
  let outer = null,
    saved = null;
  function lowerOuter() {
    if (!outer) {
      const tm = RATSCHER.meshes.filter(m => m.material === RATSCHER.terrainMat);
      outer = tm.find(m => m.geometry.attributes.position.count < 58000) || null; // the inner mesh has 241² vertices
      if (!outer) return;
      saved = Float32Array.from(outer.geometry.attributes.position.array);
    }
    const p = outer.geometry.attributes.position.array,
      s10 = tsize(10),
      cov = (E, N) => covered.has(key(10, Math.floor((E - ROOT_E0) / s10), Math.floor((N - ROOT_N0) / s10)));
    let n = 0;
    for (let i = 0; i < p.length; i += 3) {
      const x = saved[i],
        y = -saved[i + 2];
      let low = false;
      if (covered.size && !insideBox(x, y)) {
        const [E, N] = toU(x, y);
        low = cov(E - 130, N - 130) && cov(E + 130, N - 130) && cov(E - 130, N + 130) && cov(E + 130, N + 130);
      }
      p[i + 1] = saved[i + 1] - (low ? 40 : 0);
      if (low) n++;
    }
    S.lowered = n;
    outer.geometry.attributes.position.needsUpdate = true;
  }
  // ---- heights for KERN: the triangles of the finest drawn tile (as drawn) ----
  function heightAt(x, y) {
    if (!S.active || !S.visible || !S.visible.size || insideBox(x, y)) return undefined;
    const [E, N] = toU(x, y);
    for (let L = 12; L >= 10; L--) {
      const s = tsize(L),
        tx = Math.floor((E - ROOT_E0) / s),
        ty = Math.floor((N - ROOT_N0) / s),
        t = S.tiles.get(key(L, tx, ty));
      if (!t || !t.hz || !S.visible.has(t.k)) continue;
      const fu = ((E - t.e0) / s) * (NS - 1),
        fv = ((N - t.n0) / s) * (NS - 1),
        i = Math.min(NS - 2, Math.max(0, Math.floor(fu))),
        j = Math.min(NS - 2, Math.max(0, Math.floor(fv))),
        u = fu - i,
        v = fv - j,
        k = j * NS + i,
        za = t.hz[k],
        zb = t.hz[k + 1],
        zc = t.hz[k + NS + 1],
        zd = t.hz[k + NS];
      // the same diagonal as the mesh (a, b, c) and (a, c, d)
      return u >= v ? za + u * (zb - za) + v * (zc - zb) : za + v * (zd - za) + u * (zc - zd);
    }
    return undefined;
  }
  S.heightAt = heightAt;
  // raw heights of level L (12, else 11) over a model rectangle, for placing things (buildings stand on the same ground at every level)
  S.sampler = async (x0, y0, x1, y1) => {
    await meta();
    const cs = [toU(x0, y0), toU(x1, y0), toU(x0, y1), toU(x1, y1)],
      E0 = Math.min(...cs.map(c => c[0])),
      E1 = Math.max(...cs.map(c => c[0])),
      N0 = Math.min(...cs.map(c => c[1])),
      N1 = Math.max(...cs.map(c => c[1])),
      T = new Map(),
      jobs = [];
    for (const L of [12, 11]) {
      const s = tsize(L);
      for (let x = Math.floor((E0 - ROOT_E0) / s); x <= Math.floor((E1 - ROOT_E0) / s); x++)
        for (let y = Math.floor((N0 - ROOT_N0) / s); y <= Math.floor((N1 - ROOT_N0) / s); y++)
          if (inRect(L, x, y))
            jobs.push(
              terrain(S.base + `t/${L}/${x}/${y}.bin`)
                .then(t => T.set(key(L, x, y), t))
                .catch(() => {})
            );
    }
    for (let i = 0; i < jobs.length; i += 12) await Promise.all(jobs.slice(i, i + 12));
    return (x, y) => {
      const [E, N] = toU(x, y);
      for (const L of [12, 11]) {
        const s = tsize(L),
          tx = Math.floor((E - ROOT_E0) / s),
          ty = Math.floor((N - ROOT_N0) / s),
          t = T.get(key(L, tx, ty));
        if (!t) continue;
        const n = t.n,
          fu = ((E - ROOT_E0 - tx * s) / s) * (n - 1),
          fv = ((N - ROOT_N0 - ty * s) / s) * (n - 1),
          i = Math.min(n - 2, Math.floor(fu)),
          j = Math.min(n - 2, Math.floor(fv)),
          u = fu - i,
          v = fv - j,
          h = t.h,
          k = j * n + i,
          z = (h[k] * (1 - u) + h[k + 1] * u) * (1 - v) + (h[k + n] * (1 - u) + h[k + n + 1] * u) * v;
        return innerFix(x, y, z, s / (NS - 1));
      }
      return undefined;
    };
  };
  S.covers = (x, y) => {
    if (!S.active || !covered.size) return false;
    const [E, N] = toU(x, y),
      s10 = tsize(10);
    return covered.has(key(10, Math.floor((E - ROOT_E0) / s10), Math.floor((N - ROOT_N0) / s10)));
  };
  KERN.provide('terrain', heightAt, 5);
  KERN.provide('ground', heightAt, 5);
  KERN.provide('free', (x, y) => (S.covers(x, y) ? true : undefined), 5);
  // ---- the loop: plan twice a second, pump the queue, draw; free everything when no zone needs it for 20 s ----
  let acc = 1,
    idle = 0,
    lastE = 0,
    lastN = 0;
  function tick(dt) {
    acc += dt;
    const want = needs.size > 0;
    if (!want) {
      if (S.active) {
        idle += dt;
        if (idle > 20) S.release();
      }
      return;
    }
    idle = 0;
    if (!S.meta) {
      if (!metaP) meta().catch(() => {});
      return;
    }
    S.active = true;
    // where the tiles are needed: the walker (the camera follows it), else the camera
    const walk = P.mode === 'walk',
      cx = walk ? P.x : cam.position.x,
      cy = walk ? P.y : -cam.position.z,
      [E, N] = toU(cx, cy);
    if (acc > 0.5 || Math.hypot(E - lastE, N - lastN) > 25) {
      acc = 0;
      lastE = E;
      lastN = N;
      plan(E, N);
      // tiles nobody wants for 30 s are freed
      const now = performance.now();
      for (const t of [...S.tiles.values()]) if (now - t.used > 30000 && t.st !== 'load') drop(t);
      dirty = true;
    }
    pump();
    if (dirty) {
      dirty = false;
      display();
    }
  }
  S.release = () => {
    for (const t of [...S.tiles.values()]) drop(t);
    queue.length = 0;
    covered = new Set();
    S.covKey = '';
    S.visible = new Set();
    roots = [];
    if (outer && saved) {
      outer.geometry.attributes.position.array.set(saved);
      outer.geometry.attributes.position.needsUpdate = true;
    }
    S.lowered = 0;
    S.active = false;
    idle = 0;
    markDirty(true);
  };
  S.state = () => ({
    active: S.active,
    tiles: S.tiles.size,
    visible: S.vis,
    loading: busy + queue.length,
    req: S.n.req,
    ok: S.n.ok,
    err: S.n.err,
    lowered: S.lowered,
    base: S.base,
    lastErr: S.lastErr || '',
  });
  (window.TICKS || (window.TICKS = [])).push(tick);
  return S;
})();
window.WELT = WELT;
