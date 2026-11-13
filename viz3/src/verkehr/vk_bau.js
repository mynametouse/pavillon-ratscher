// ===================== feat/verkehr-real 2: a vehicle type as compact arrays for the GPU – merged, welded, three levels (VKBAU) =====================
// The parts of a type (verkehr/vk_typen.js: paint, plastic, chrome, glass, lamps, the axles' wheels) become ONE indexed mesh per level of
// detail, drawn with one material (verkehr/vk_modelle.js): what each corner is made of rides along as an attribute, so a vehicle is one
// draw call (and its glass a second one when it is near). Pure: no scene, no DOM – it runs in the worker lazy/verkehr-bau.js (nothing
// of this on the main thread while one plays) and, where no worker can start, on the main thread in small steps.
//   VKBAU.geo(typ, lod) → { typ, lod, op, gl, ms }
//     lod 0: the full build (the cab inside, wipers, handles) – op without the glass, gl the glass apart (it is see-through near by)
//     lod 1: the lighter build, the glass dark and solid in op (gl null); lod 2: lod 1 thinned by clustering its corners (far away)
//     op: { n, pos: Float32Array (three's frame), nor: Int16Array (normalized), col: Uint8Array (sRGB), vk: Uint8Array (4 per corner:
//          kind, lamp, axle, side), idx: Uint16Array | Uint32Array, tris }
//       kind: 0 plastic and the like (vertex colour), 1 paint, 2 second paint, 3 chrome, 4 glass (dark, solid), 6 lamp glass,
//             7 tail lamp glass, 8 indicator glass, 9 rim (metal), 10 tyre
//       lamp: 0 none, 1 head lamp, 2 tail and brake lamp, 3 indicator left, 4 indicator right, 5 reversing lamp, 6 day light
//       axle: 0 the body, 1 … 4 the axles in the order of VKTYPEN.achsen (they turn: the shader spins them; axle 1 steers if it may)
//       side: 1 for a wheel on the right (the steering pivot's side)
//     gl: { n, pos, nor, idx } or null
import { VKTYPEN } from './vk_typen.js';
export const VKBAU = (() => {
  const KIND = { matt: 0, lack0: 1, lack1: 2, chrom: 3, glas: 4, head: 6, tail: 7, blink: 8 };
  // linear → an sRGB byte (the shader turns it back: 8 bits in sRGB keep the dark plastics apart, 8 linear bits would not)
  const s8 = v => {
    v = v <= 0 ? 0 : v >= 1 ? 1 : v;
    return Math.round(255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055));
  };
  // ---- welding: corners equal in place, normal, colour and kind become one vertex (an open-addressed table of ints) ----
  function welder(maxN, plain) {
    const pos = new Float32Array(maxN * 3),
      nor = new Int16Array(maxN * 3),
      col = plain ? null : new Uint8Array(maxN * 3),
      vk = plain ? null : new Uint8Array(maxN * 4),
      q = new Int32Array(maxN * 3),
      idx = new Uint32Array(maxN);
    let size = 1024;
    while (size < maxN * 2) size <<= 1;
    const tab = new Int32Array(size).fill(-1),
      mask = size - 1;
    let nv = 0,
      ni = 0;
    function add(x, y, z, nx, ny, nz, r, g, b, k0, k1, k2, k3) {
      const qx = Math.round(x * 1e4),
        qy = Math.round(y * 1e4),
        qz = Math.round(z * 1e4),
        sx = Math.round(nx * 32767),
        sy = Math.round(ny * 32767),
        sz = Math.round(nz * 32767);
      let h =
        (Math.imul(qx, 73856093) ^
          Math.imul(qy, 19349663) ^
          Math.imul(qz, 83492791) ^
          Math.imul(sx + 3 * sy + 7 * sz, 40503) ^
          ((r << 16) | (g << 8) | b) ^
          ((k0 << 24) | (k1 << 20) | (k2 << 17) | (k3 << 15))) &
        mask;
      for (;;) {
        const v = tab[h];
        if (v < 0) {
          tab[h] = nv;
          const v3 = nv * 3;
          pos[v3] = x;
          pos[v3 + 1] = y;
          pos[v3 + 2] = z;
          q[v3] = qx;
          q[v3 + 1] = qy;
          q[v3 + 2] = qz;
          nor[v3] = sx;
          nor[v3 + 1] = sy;
          nor[v3 + 2] = sz;
          if (col) {
            col[v3] = r;
            col[v3 + 1] = g;
            col[v3 + 2] = b;
            const v4 = nv * 4;
            vk[v4] = k0;
            vk[v4 + 1] = k1;
            vk[v4 + 2] = k2;
            vk[v4 + 3] = k3;
          }
          idx[ni++] = nv++;
          return;
        }
        const v3 = v * 3;
        if (
          q[v3] === qx &&
          q[v3 + 1] === qy &&
          q[v3 + 2] === qz &&
          nor[v3] === sx &&
          nor[v3 + 1] === sy &&
          nor[v3 + 2] === sz &&
          (!col ||
            (col[v3] === r &&
              col[v3 + 1] === g &&
              col[v3 + 2] === b &&
              vk[v * 4] === k0 &&
              vk[v * 4 + 1] === k1 &&
              vk[v * 4 + 2] === k2 &&
              vk[v * 4 + 3] === k3))
        ) {
          idx[ni++] = v;
          return;
        }
        h = (h + 1) & mask;
      }
    }
    function out() {
      const I = nv < 65536 ? new Uint16Array(ni) : new Uint32Array(ni);
      I.set(idx.subarray(0, ni));
      return {
        n: nv,
        pos: pos.slice(0, nv * 3),
        nor: nor.slice(0, nv * 3),
        col: col ? col.slice(0, nv * 3) : null,
        vk: vk ? vk.slice(0, nv * 4) : null,
        idx: I,
        tris: ni / 3,
      };
    }
    return { add, out };
  }
  // ---- the parts of a build (VKTYPEN.bau) into one mesh (and the glass apart) ----
  function merge(M, apart) {
    const T = M.T,
      src = [[M.body, 0, 0, 0]];
    M.axles.forEach((a, i) => src.push([a.parts, -a.y, a.r, Math.min(4, i + 1)]));
    let nc = 0,
      ng = 0;
    for (const [parts] of src)
      for (const [name, q] of Object.entries(parts)) {
        const n = q.pos.length / 3;
        if (apart && name === 'glas') ng += n;
        else nc += n;
      }
    const W = welder(Math.max(3, nc)),
      G = apart && ng ? welder(ng, true) : null;
    for (const [parts, dz, dy, ax] of src)
      for (const [name, q] of Object.entries(parts)) {
        const P = q.pos,
          N = q.nor,
          Cc = q.col,
          k0 = KIND[name] ?? 0;
        if (apart && name === 'glas') {
          for (let i = 0; i < P.length; i += 3)
            G.add(P[i], P[i + 1] + dy, P[i + 2] + dz, N[i], N[i + 1], N[i + 2], 0, 0, 0, 0, 0, 0, 0);
          continue;
        }
        for (let i = 0; i < P.length; i += 3) {
          const x = P[i],
            y = P[i + 1] + dy,
            z = P[i + 2] + dz,
            r = Cc ? Cc[i] : 1,
            g = Cc ? Cc[i + 1] : 1,
            b = Cc ? Cc[i + 2] : 1;
          let kind = k0,
            lamp = 0;
          if (ax) {
            // the wheels: bright metal of the rims, the rubber of the tyres
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            kind = lum > 0.06 ? 9 : lum < 0.012 ? 10 : 0;
          } else if (k0 === 6) {
            // a clear lamp glass: at the front the head lamp (its white strip the day light), at the back the reversing lamp
            const front = -z > T.cy;
            lamp = front ? (r > 0.97 && g > 0.97 && b > 0.97 ? 6 : 1) : 5;
          } else if (k0 === 7) lamp = 2;
          else if (k0 === 8) lamp = x < 0 ? 3 : 4;
          W.add(x, y, z, N[i], N[i + 1], N[i + 2], s8(r), s8(g), s8(b), kind, lamp, ax, ax && x > 0 ? 1 : 0);
        }
      }
    return { op: W.out(), gl: G ? G.out() : null };
  }
  // ---- far away: the corners clustered in a grid (each cluster one vertex where its corners lie on average); kind, lamp, axle, side
  //      and a coarse colour keep clusters apart, so a lamp stays a lamp and a plate stays white ----
  function cluster(op, cell) {
    const n = op.n,
      map = new Int32Array(n),
      keys = new Map(),
      sp = new Float64Array(n * 3),
      sn = new Float64Array(n * 3),
      cnt = new Int32Array(n),
      first = new Int32Array(n);
    let nc = 0;
    for (let v = 0; v < n; v++) {
      const v3 = v * 3,
        v4 = v * 4,
        k =
          op.vk[v4] +
          '|' +
          op.vk[v4 + 1] +
          '|' +
          op.vk[v4 + 2] +
          '|' +
          op.vk[v4 + 3] +
          '|' +
          (op.col[v3] >> 5) +
          (op.col[v3 + 1] >> 5) * 8 +
          (op.col[v3 + 2] >> 5) * 64 +
          '|' +
          Math.floor(op.pos[v3] / cell) +
          '|' +
          Math.floor(op.pos[v3 + 1] / cell) +
          '|' +
          Math.floor(op.pos[v3 + 2] / cell);
      let c = keys.get(k);
      if (c === undefined) {
        c = nc++;
        keys.set(k, c);
        first[c] = v;
      }
      map[v] = c;
      const c3 = c * 3;
      sp[c3] += op.pos[v3];
      sp[c3 + 1] += op.pos[v3 + 1];
      sp[c3 + 2] += op.pos[v3 + 2];
      sn[c3] += op.nor[v3];
      sn[c3 + 1] += op.nor[v3 + 1];
      sn[c3 + 2] += op.nor[v3 + 2];
      cnt[c]++;
    }
    const tri = [],
      seen = new Set(),
      I = op.idx;
    for (let t = 0; t < I.length; t += 3) {
      const a = map[I[t]],
        b = map[I[t + 1]],
        c = map[I[t + 2]];
      if (a === b || b === c || a === c) continue;
      // the same three clusters in the same turn once (the other turn is the other side: kept)
      const m = Math.min(a, b, c),
        key = m === a ? a + ',' + b + ',' + c : m === b ? b + ',' + c + ',' + a : c + ',' + a + ',' + b;
      if (seen.has(key)) continue;
      seen.add(key);
      tri.push(a, b, c);
    }
    // only the clusters a triangle uses
    const used = new Int32Array(nc).fill(-1);
    let nv = 0;
    for (const c of tri) if (used[c] < 0) used[c] = nv++;
    const pos = new Float32Array(nv * 3),
      nor = new Int16Array(nv * 3),
      col = new Uint8Array(nv * 3),
      vk = new Uint8Array(nv * 4);
    for (let c = 0; c < nc; c++) {
      const v = used[c];
      if (v < 0) continue;
      const c3 = c * 3,
        k = cnt[c],
        f = first[c],
        l = Math.hypot(sn[c3], sn[c3 + 1], sn[c3 + 2]) || 1;
      for (let j = 0; j < 3; j++) {
        pos[v * 3 + j] = sp[c3 + j] / k;
        nor[v * 3 + j] = Math.round((sn[c3 + j] / l) * 32767);
        col[v * 3 + j] = op.col[f * 3 + j];
      }
      for (let j = 0; j < 4; j++) vk[v * 4 + j] = op.vk[f * 4 + j];
    }
    const idx = nv < 65536 ? new Uint16Array(tri.length) : new Uint32Array(tri.length);
    for (let i = 0; i < tri.length; i++) idx[i] = used[tri[i]];
    return { n: nv, pos, nor, col, vk, idx, tris: tri.length / 3 };
  }
  // the grid of the far level by class: finer for cars, coarser for the long ones
  const cellOf = T => (T.cls === 'pkw' ? 0.13 : T.cls === 'lfz' ? 0.15 : 0.22);
  function geo(typ, lod) {
    const t0 = Date.now(),
      T = VKTYPEN.TYP[typ];
    if (!T) throw new Error('unknown vehicle type ' + typ);
    if (lod === 0) {
      const R = merge(VKTYPEN.bau(typ, {}), true);
      return { typ, lod, op: R.op, gl: R.gl, ms: Date.now() - t0 };
    }
    const R = merge(VKTYPEN.bau(typ, { lod: 1 }), false);
    if (lod === 1) return { typ, lod, op: R.op, gl: null, ms: Date.now() - t0 };
    return { typ, lod, op: cluster(R.op, cellOf(T)), gl: null, ms: Date.now() - t0 };
  }
  // both far levels at once (the worker's usual order: what a vehicle needs before it may drive)
  function geo12(typ) {
    const t0 = Date.now(),
      T = VKTYPEN.TYP[typ];
    if (!T) throw new Error('unknown vehicle type ' + typ);
    const R = merge(VKTYPEN.bau(typ, { lod: 1 }), false),
      far = cluster(R.op, cellOf(T)),
      ms = Date.now() - t0;
    return [
      { typ, lod: 1, op: R.op, gl: null, ms },
      { typ, lod: 2, op: far, gl: null, ms },
    ];
  }
  // what to hand over without copying
  const buffers = g => {
    const out = [];
    for (const o of [g.op, g.gl]) if (o) for (const k of ['pos', 'nor', 'col', 'vk', 'idx']) if (o[k]) out.push(o[k].buffer);
    return out;
  };
  return { geo, geo12, merge, cluster, buffers, KIND };
})();
