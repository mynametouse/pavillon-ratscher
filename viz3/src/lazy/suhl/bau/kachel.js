// Suhl runtime, in the worker: one level-10 tile of building records → the buffers of its meshes.
// A record is what tools/suhl/gebaeude writes (docs/features/suhl-daten.md), built on the format of tools/welt-gebaeude/prep.py:
//   id, k (kind: 0 house, 1 barn/hall, 2 shed/garage, 4 tank, 5 tower), f (footprint ring), e (eave above the foot), h (highest point),
//   F (facades [ax, ay, bx, by, top a, u of the apex, top at the apex, top b, flags (1 = party wall), distance to the street]),
//   rv/rt (roof vertices x, y, z above the foot / triangles), r (roof form, 0 = flat), rk (roof cover for the shader), rc (roof colour).
// What a record lacks is derived here: facades from the footprint, a flat roof from the footprint.
// frame: 'abs' absolute model metres · 'modell' model metres from the tile's centre · 'utm' UTM metres from the tile's centre.
import { hGrid, hashStr, hh, linC } from '../kern/geo.js';
import { building, buildingFar, farBuf, hex, roofBuf, styleFa, styleOf, wallBuf } from './haus.js';
// ear clipping of a simple ring [[x, y], …] (counter-clockwise) → triangle indices
export function ears(P) {
  const n = P.length,
    idx = [],
    V = P.map((p, i) => i);
  const area = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inTri = (p, a, b, c) => area(a, b, p) >= 0 && area(b, c, p) >= 0 && area(c, a, p) >= 0;
  let guard = n * n + 8;
  while (V.length > 3 && guard-- > 0) {
    let cut = false;
    for (let i = 0; i < V.length; i++) {
      const ia = V[(i + V.length - 1) % V.length],
        ib = V[i],
        ic = V[(i + 1) % V.length],
        a = P[ia],
        b = P[ib],
        c = P[ic];
      if (area(a, b, c) <= 1e-9) continue;
      let ok = true;
      const same = (p, q) => p[0] === q[0] && p[1] === q[1];
      for (const j of V) {
        // a corner that lies on a corner of the ear (the two ends of a slit to a courtyard) does not block it
        if (j === ia || j === ib || j === ic || same(P[j], a) || same(P[j], b) || same(P[j], c)) continue;
        if (inTri(P[j], a, b, c)) {
          ok = false;
          break;
        }
      }
      if (!ok) continue;
      idx.push(ia, ib, ic);
      V.splice(i, 1);
      cut = true;
      break;
    }
    if (!cut) V.splice(0, 1); // a degenerate corner: drop it and go on
  }
  if (V.length === 3) idx.push(V[0], V[1], V[2]);
  return idx;
}
// roof classes of tools/suhl/gebaeude (luftbild.py CLASSES: ziegel_rot, ziegel_dunkel, betonstein, schiefer, bitumen_kies, blech,
// gruendach, glas) → the covers the village's roof program draws (0 clay tiles, 1 fibre cement, 2 sheet metal, 3 slate, 4 flat)
const COVER = [0, 0, 0, 3, 4, 2, 4, 2];
const GREY = [0.36, 0.35, 0.33];
const rgb = c => (typeof c === 'string' && c.length === 7 ? hex(c) : Array.isArray(c) && c.length >= 3 ? c : GREY);
const ringOf = (flat, map) => {
  const f = [];
  for (let k = 0; k + 1 < flat.length; k += 2) {
    const p = map(flat[k], flat[k + 1]);
    f.push(p[0], p[1]);
  }
  return f;
};
const area2 = f => {
  let a = 0;
  for (let k = 0; k < f.length; k += 2) {
    const j = (k + 2) % f.length;
    a += f[k] * f[j + 1] - f[j] * f[k + 1];
  }
  return a;
};
// ---- one record into the tile's frame, with everything the generator needs. Two kinds of records are read:
//   Suhl (tools/suhl/gebaeude): f, h (holes), e, hr, z0, k, typ, r, R (roof faces { c, col, v, t }), S (one side per ring edge:
//     [top a, top b, flags, street distance, street index (, apex u, apex top)]; flags 1 party wall, 2 gable), Sx, fa (facade parameters)
//   cells of gebaeude/z (tools/welt-gebaeude/prep.py): f, e, h (height), F (facades with their ends), rv/rt, rk, rc – also what a
//     scenario adds (SUHL.add) ----
export function norm(rec, T, map) {
  let f = ringOf(rec.f, map);
  if (f.length < 6 || rec.k === 8) return null; // k 8: underground, nothing to draw
  let A2 = area2(f);
  const turned = A2 < 0;
  if (turned) {
    // clockwise: turn it (the facades run with the outside to their right)
    const g = [];
    for (let k = f.length - 2; k >= 0; k -= 2) g.push(f[k], f[k + 1]);
    f = g;
    A2 = -A2;
  }
  const n = f.length / 2;
  let cx = 0,
    cy = 0;
  for (let k = 0; k < f.length; k += 2) {
    cx += f[k] / n;
    cy += f[k + 1] / n;
  }
  const holes = Array.isArray(rec.h) ? rec.h.map(h => ringOf(h, map)) : [],
    e = Number.isFinite(rec.e) ? rec.e : Number.isFinite(rec.h) ? rec.h : 6,
    b = {
      id: String(rec.id || ''),
      k: rec.k | 0,
      r: rec.r === undefined ? (rec.rv ? 2 : 0) : rec.r | 0,
      e,
      h: Number.isFinite(rec.hr) ? rec.hr : Number.isFinite(rec.h) ? rec.h : e,
      f,
      A: A2 / 2,
      cx,
      cy,
      open: rec.k === 3, // an open roof (carport, canopy): no walls
      z0rec: Number.isFinite(rec.z0) ? rec.z0 : undefined,
      typ: rec.typ || '',
      fa: rec.fa || null,
    };
  b.hid = hashStr(b.id || cx.toFixed(1) + ',' + cy.toFixed(1));
  // ---- sides ----
  b.F = [];
  const rings = [f].concat(holes);
  if (Array.isArray(rec.F) && rec.F.length && !turned) {
    for (const q of rec.F) {
      const a = map(q[0], q[1]),
        c = map(q[2], q[3]);
      b.F.push([a[0], a[1], c[0], c[1], q[4], q[5] * T.k, q[6], q[7], q[8] | 0, q[9] === undefined ? 99 : q[9]]);
    }
  } else if (Array.isArray(rec.Sx) && Array.isArray(rec.S) && rec.Sx.length === rec.S.length) {
    rec.S.forEach((s, i) => {
      const a = map(rec.Sx[i][0], rec.Sx[i][1]),
        c = map(rec.Sx[i][2], rec.Sx[i][3]);
      b.F.push(side(a[0], a[1], c[0], c[1], s));
    });
  } else {
    const S =
      Array.isArray(rec.S) && !turned && rec.S.length === rings.reduce((m, r) => m + r.length / 2, 0) ? rec.S : null;
    let i = 0;
    for (const r of rings)
      for (let k = 0; k < r.length; k += 2) {
        const j = (k + 2) % r.length;
        b.F.push(side(r[k], r[k + 1], r[j], r[j + 1], S ? S[i] : [e, e, 0, -1, -1]));
        i++;
      }
  }
  // ---- roof: triangles with their cover and colour ----
  b.tris = [];
  const tri = (v, kc) => b.tris.push({ v, kc });
  if (Array.isArray(rec.R) && rec.R.some(q => q.v && q.t)) {
    for (const q of rec.R) {
      if (!q.v || !q.t) continue;
      const kc = [COVER[q.c] ?? 0, ...linC(rgb(q.col))],
        P = [];
      for (let k = 0; k + 2 < q.v.length; k += 3) {
        const p = map(q.v[k], q.v[k + 1]);
        P.push([p[0], p[1], q.v[k + 2]]);
      }
      for (let k = 0; k + 2 < q.t.length; k += 3) tri([P[q.t[k]], P[q.t[k + 1]], P[q.t[k + 2]]], kc);
    }
  } else if (Array.isArray(rec.rv) && Array.isArray(rec.rt) && rec.rt.length >= 3) {
    const kc = [Number.isFinite(rec.rk) ? rec.rk : 4, ...linC(rgb(rec.rc))],
      P = [];
    for (let k = 0; k + 2 < rec.rv.length; k += 3) {
      const p = map(rec.rv[k], rec.rv[k + 1]);
      P.push([p[0], p[1], rec.rv[k + 2]]);
    }
    for (let k = 0; k + 2 < rec.rt.length; k += 3) tri([P[rec.rt[k]], P[rec.rt[k + 1]], P[rec.rt[k + 2]]], kc);
  } else {
    // a flat roof: the footprint at the eave (courtyards cut out)
    const q = (Array.isArray(rec.R) && rec.R[0]) || {},
      kc = [
        q.c === undefined ? (Number.isFinite(rec.rk) ? rec.rk : 4) : (COVER[q.c] ?? 4),
        ...linC(rgb(q.col || rec.rc)),
      ],
      P = bridge(f, holes),
      idx = ears(P);
    for (let k = 0; k + 2 < idx.length; k += 3)
      tri(
        [
          [...P[idx[k]], e],
          [...P[idx[k + 1]], e],
          [...P[idx[k + 2]], e],
        ],
        kc
      );
    b.r = 0;
  }
  if (!b.tris.length) return null;
  b.trim = b.tris[0].kc.slice(1);
  return b;
}
// a side of the Suhl records → the generator's facade [ax, ay, bx, by, top a, u of the apex, top at the apex, top b, flags, street distance]
function side(ax, ay, bx, by, s) {
  const L = Math.hypot(bx - ax, by - ay),
    gable = s[2] & 2 && s.length > 6;
  return [
    ax,
    ay,
    bx,
    by,
    s[0],
    gable ? s[5] : L / 2,
    gable ? s[6] : (s[0] + s[1]) / 2,
    s[1],
    s[2] & 1,
    s[3] === undefined || s[3] < 0 ? 99 : s[3],
  ];
}
// the outer ring with its holes as one ring (each hole joined by a slit to the nearest corner of the ring so far) – for the ear clipping
export function bridge(f, holes) {
  let P = [];
  for (let k = 0; k < f.length; k += 2) P.push([f[k], f[k + 1]]);
  for (const h of holes) {
    const H = [];
    for (let k = 0; k < h.length; k += 2) H.push([h[k], h[k + 1]]);
    if (H.length < 3) continue;
    if (area2(h) > 0) H.reverse(); // a hole runs clockwise
    let bi = 0,
      bj = 0,
      bd = 1e18;
    for (let i = 0; i < P.length; i++)
      for (let j = 0; j < H.length; j++) {
        const d = (P[i][0] - H[j][0]) ** 2 + (P[i][1] - H[j][1]) ** 2;
        if (d < bd) {
          bd = d;
          bi = i;
          bj = j;
        }
      }
    P = [...P.slice(0, bi + 1), ...H.slice(bj), ...H.slice(0, bj + 1), ...P.slice(bi)];
  }
  return P;
}
// ---- the tile: records → buffers. m: { recs, frame, tile: { e0, n0, s, cx, cy }, level, terrain: { n, h } | null, old: [x, y, r], patch, extra } ----
export function kachel(m, F) {
  const T = m.tile,
    k = F.k,
    map =
      m.frame === 'utm'
        ? (x, y) => F.dM(x, y)
        : m.frame === 'modell'
          ? (x, y) => [x, y]
          : (x, y) => [x - T.cx, y - T.cy],
    TT = { k: m.frame === 'utm' ? k : 1 },
    ter = m.terrain,
    ground = ter
      ? (x, y) => {
          const [E, N] = F.toU(T.cx + x, T.cy + y);
          return hGrid(ter.h, ter.n, (E - T.e0) / T.s, (N - T.n0) / T.s);
        }
      : null,
    patch = m.patch || {},
    mapAbs = (x, y) => [x - T.cx, y - T.cy],
    nOwn = (m.recs || []).length,
    WB = m.level === 1 ? wallBuf() : null,
    RB = m.level === 1 ? roofBuf() : null,
    FB = m.level === 2 ? farBuf() : null,
    segs = [],
    foot = [];
  let nb = 0,
    bad = 0,
    off = 0;
  const recs = (m.recs || []).concat(m.extra || []);
  for (let i = 0; i < recs.length; i++) {
    let rec = recs[i];
    const pt = rec && patch[rec.id];
    if (pt) {
      if (pt.hidden) {
        foot.push(0, 0, 0, 0);
        continue;
      }
      rec = Object.assign(
        {},
        rec,
        pt.replace || {},
        pt.levels ? { e: pt.levels * 2.9, h: pt.levels * 2.9, rv: null } : {}
      );
    }
    let b = null;
    try {
      b = i < nOwn ? norm(rec, TT, map) : norm(rec, { k: 1 }, mapAbs);
    } catch (e) {
      b = null;
    }
    if (!b) {
      bad++;
      foot.push(0, 0, 0, 0);
      continue;
    }
    // the foot: the record's z0 (the lowest ground under its outline, all its heights count from there) – where the ground drawn here
    // lies elsewhere (the record's ground and the terrain tiles are not from the same run yet) the building follows the tiles; a
    // record without a foot stands on the tiles as gebaeude/gebaeude.js sets it (on a slope the ground floor keeps to the upper side)
    let zmin, z0;
    const zs = [];
    if (ground) for (const f of b.F) zs.push(ground(f[0], f[1]), ground((f[0] + f[2]) / 2, (f[1] + f[3]) / 2));
    zs.sort((p, q) => p - q);
    if (b.z0rec !== undefined) {
      z0 = b.z0rec;
      zmin = zs.length ? Math.min(z0, zs[0]) : z0;
      if (zs.length && Math.abs(zs[0] - z0) > 2.5) {
        z0 = zs[0];
        zmin = z0;
        off++;
      }
    } else if (zs.length) {
      zmin = zs[0];
      const z70 = zs[Math.floor(zs.length * 0.7)];
      z0 = z70 - zmin < 1.0 ? zmin - 0.05 : z70 - 0.4;
    } else {
      z0 = 0;
      zmin = 0;
    }
    b.zmin = zmin;
    if (b.fa) b.st = styleFa(b, b.hid, b.fa, b.typ);
    else {
      const d = m.old ? Math.hypot(T.cx + b.cx - m.old[0], T.cy + b.cy - m.old[1]) : 1e9;
      b.st = styleOf(b, b.hid, m.old && d < m.old[2] ? 1 - d / m.old[2] : 0);
    }
    if (pt && pt.col) b.st.col = typeof pt.col === 'string' ? linC(hex(pt.col), 0.82) : pt.col;
    try {
      if (m.level === 1) building(b, b.hid, z0, WB, RB, segs);
      else {
        buildingFar(b, z0, FB);
        if (!b.open) for (const f of b.F) segs.push(f[0], f[1], f[2], f[3]);
      }
      nb++;
    } catch (e) {
      bad++;
    }
    foot.push(b.cx, b.cy, z0, b.e);
  }
  const out = { n: nb, bad, off, segs: new Float32Array(segs), foot: new Float32Array(foot) },
    tr = [out.segs.buffer, out.foot.buffer];
  if (m.level === 1) {
    out.walls = WB.out();
    out.roofs = RB.out();
    for (const o of [out.walls, out.roofs]) for (const a of Object.values(o)) tr.push(a.buffer);
  } else {
    out.far = FB.out();
    for (const a of Object.values(out.far)) tr.push(a.buffer);
  }
  return [out, tr];
}
// ---- trees of a tile (tools/suhl/gruen, product b): 8 bytes per tree, little endian – uint16 x (cm east of the tile's west edge),
// uint16 y (cm north of its south edge, both UTM), uint8 height in 0.25 m, uint8 crown radius in 0.1 m, uint8 kind, uint8 flags.
// → Float32 [x, y, z, height, radius, kind, chance] per tree, x and y in model metres from the tile's centre, z from the terrain tile ----
export function baeume(m, F) {
  const T = m.tile,
    ter = m.terrain,
    dv = new DataView(m.buf),
    n = Math.floor(m.buf.byteLength / 8),
    o = new Float32Array(n * 7);
  for (let i = 0; i < n; i++) {
    const u = dv.getUint16(i * 8, true) / 100,
      v = dv.getUint16(i * 8 + 2, true) / 100,
      p = F.toM(T.e0 + u, T.n0 + v),
      z = ter ? hGrid(ter.h, ter.n, u / T.s, v / T.s) : 0;
    o.set(
      [
        p[0] - T.cx,
        p[1] - T.cy,
        z,
        dv.getUint8(i * 8 + 4) * 0.25,
        dv.getUint8(i * 8 + 5) * 0.1,
        dv.getUint8(i * 8 + 6),
        hh(u * 3.1 + v * 7.7 + T.e0 * 0.01),
      ],
      i * 7
    );
  }
  return [{ trees: o, n }, [o.buffer]];
}
