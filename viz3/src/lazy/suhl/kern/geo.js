// Suhl runtime, shared by the package and its worker (pure, no three.js, no app modules): the quadtree of tools/welt/wlib.py
// (ETRS89 / UTM 32N; level 10 = 400 m, 12 = 100 m), model metres <-> UTM through the app's xf, the WTH1 height tiles, small helpers.
export const ROOT_E0 = 420700,
  ROOT_N0 = 5390800,
  ROOT = 409600;
export const tsize = L => ROOT / (1 << L);
export const tkey = (L, x, y) => L + '/' + x + '/' + y;
// model metres (x east, y north) <-> UTM for one xf { a, b, ex, ey } (viz3/manifests.json geoman.xf)
export function frame(xf) {
  const { a, b, ex, ey } = xf,
    s2 = a * a + b * b;
  const F = {
    toU: (x, y) => [a * x - b * y + ex, b * x + a * y + ey],
    toM: (E, N) => [(a * (E - ex) + b * (N - ey)) / s2, (-b * (E - ex) + a * (N - ey)) / s2],
    // a UTM offset (dE, dN) as a model offset – for records kept in UTM metres relative to their tile's centre
    dM: (dE, dN) => [(a * dE + b * dN) / s2, (-b * dE + a * dN) / s2],
    k: 1 / Math.sqrt(s2), // model metres per UTM metre (0.9845)
    // the tile (L, x, y): its UTM square and its centre in model metres
    tile(L, x, y) {
      const s = tsize(L),
        e0 = ROOT_E0 + x * s,
        n0 = ROOT_N0 + y * s,
        c = F.toM(e0 + s / 2, n0 + s / 2);
      return { L, x, y, k: tkey(L, x, y), s, e0, n0, cx: c[0], cy: c[1] };
    },
    // the tile of level L under a model point
    at(L, x, y) {
      const [E, N] = F.toU(x, y),
        s = tsize(L);
      return [Math.floor((E - ROOT_E0) / s), Math.floor((N - ROOT_N0) / s)];
    },
    // distance (UTM metres, 0 inside) from a UTM point to the square of tile (L, x, y)
    dist(L, x, y, E, N) {
      const s = tsize(L),
        e0 = ROOT_E0 + x * s,
        n0 = ROOT_N0 + y * s;
      return Math.hypot(Math.max(e0 - E, 0, E - e0 - s), Math.max(n0 - N, 0, N - n0 - s));
    },
  };
  return F;
}
// ---- WTH1 (tools/welt/tiles.py encode_heights): n × n heights in cm as Lorenzo residuals, zlib; row 0 = south, heights above H0 ----
export async function inflate(buf) {
  const ds = new DecompressionStream('deflate');
  return new Response(new Blob([buf]).stream().pipeThrough(ds)).arrayBuffer();
}
export async function wth1(buf) {
  const dv = new DataView(buf);
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
// the height at fractions (u east, v north) of a tile's n × n grid, bilinear
export function hGrid(h, n, u, v) {
  const fu = Math.min(n - 1.001, Math.max(0, u * (n - 1))),
    fv = Math.min(n - 1.001, Math.max(0, v * (n - 1))),
    i = Math.floor(fu),
    j = Math.floor(fv),
    a = fu - i,
    b = fv - j,
    k = j * n + i;
  return (h[k] * (1 - a) + h[k + 1] * a) * (1 - b) + (h[k + n] * (1 - a) + h[k + n + 1] * a) * b;
}
// a number in 0..1 from a number (the hash of world/village.js and gebaeude/gebaeude.js: the same looks from the same ids)
export const hh = n => {
  const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
  return s - Math.floor(s);
};
// a number from a text (building ids such as DETHL51P000004BA)
export function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) % 1000003;
}
export const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
export const linC = (c, k = 1) => c.map(v => lin(v) * k);
// point in a ring given as a flat list [x0, y0, x1, y1, …]
export function inRing(f, x, y) {
  let c = false;
  for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) {
    const xi = f[p],
      yi = f[p + 1],
      xj = f[q],
      yj = f[q + 1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
  }
  return c;
}
// what the package holds on the graphics card: every geometry, texture and material it makes is counted here until its dispose event –
// after leaving Suhl all three must be 0 (SUHL.status().live; three.js itself counts an object only from its first draw)
export const LIVE = { geo: 0, tex: 0, mat: 0 };
export function own(o, k) {
  LIVE[k]++;
  const gone = () => {
    LIVE[k]--;
    o.removeEventListener('dispose', gone);
  };
  o.addEventListener('dispose', gone);
  return o;
}
