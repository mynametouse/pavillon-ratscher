// Suhl runtime, in the worker: one level-10 tile of building records → the buffers of its meshes; the trees of a tile.
// The records are those of the data contract (docs/features/suhl-daten.md on suhl/daten, schema 1 rev 1.1; written by
// tools/suhl/gebaeude): positions in model metres from the tile's centre o, heights in true metres above the foot z0.
// frame: 'modell' model metres from the tile's centre (the contract) · 'abs' absolute model metres (what a scenario adds)
// · 'utm' UTM metres from the tile's centre.
import { hGrid, hashStr, hh, linC } from '../kern/geo.js';
import { building, buildingFar, farBuf, hex, roofBuf, styleFa, styleOf, wallBuf } from './haus.js';
import { MARKEN, MARK_ST } from './marken.js';
// ear clipping of a simple ring [[x, y], …] (counter-clockwise) → triangle indices
export function ears(P) {
  const n = P.length,
    idx = [],
    V = P.map((p, i) => i);
  const area = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const inTri = (p, a, b, c) => area(a, b, p) >= 0 && area(b, c, p) >= 0 && area(c, a, p) >= 0;
  const same = (p, q) => p[0] === q[0] && p[1] === q[1];
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
// roof covers of the data contract (rk, R[].c: 0 clay tiles red, 1 fibre cement, 2 sheet metal, 3 slate, 4 flat bitumen/gravel,
// 5 clay tiles dark, 6 concrete tiles, 7 green roof, 8 glass) → what the village's roof program draws (0 clay tiles in the roof's
// colour, 1 fibre cement, 2 sheet metal, 3 slate, 4 flat)
const COVER = [0, 1, 2, 3, 4, 0, 0, 4, 2];
const GREY = [0.36, 0.35, 0.33];
export const rgb = c =>
  typeof c === 'string' && c.length === 7 ? hex(c) : Array.isArray(c) && c.length >= 3 ? c : GREY;
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
// ---- one record of product g (docs/features/suhl-daten.md section 5) into the generator's form:
//   f (outer ring, counter-clockwise), fh (courtyards), k (0 house, 1 hall, 2 outbuilding, 3 church, 4 tank, 5 tower), h, e, z0,
//   r (roof form, 0 flat), rk, rc, rv/rt (roof mesh above the foot), R (faces: ranges vi/ti in rv/rt with their own cover c and colour),
//   F (walls [ax, ay, bx, by, top a, apex as a FRACTION of the wall's length, top at the apex, top b, flags (1 party wall), metres to
//   the street]), S (per wall: what it has of its own), fas + the tile's table fat (facade parameters), bt, fg (bit 32: gone).
//   What suhl-gebaeude still writes with x_ (x_fa, x_fat) is read under both names. A record without walls or roof (a scenario's new
//   building) gets plain walls and a flat roof from its footprint. T: { k, fat, z0ok }. Returns null for what is not drawn. ----
export function norm(rec, T, map) {
  let f = ringOf(rec.f, map);
  if (f.length < 6 || rec.fg & 32) return null;
  let A2 = area2(f);
  const turned = A2 < 0;
  if (turned) {
    // clockwise: turn it (the walls run with the outside to their right)
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
  const holes = Array.isArray(rec.fh) ? rec.fh.map(h => ringOf(h, map)) : [],
    h = Number.isFinite(rec.h) ? rec.h : Number.isFinite(rec.e) ? rec.e : 6,
    e = Number.isFinite(rec.e) ? Math.min(rec.e, h) : h,
    fas = rec.fas || rec.x_fa || null,
    b = {
      id: String(rec.id || ''),
      k: rec.k | 0,
      r: rec.r === undefined ? (rec.rv ? 2 : 0) : rec.r | 0,
      e,
      h,
      f,
      A: A2 / 2,
      cx,
      cy,
      church: rec.k === 3,
      open: rec.bt === 'ueberdachung', // an open roof (carport, canopy): no walls
      z0rec: Number.isFinite(rec.z0) && T.z0ok ? rec.z0 : undefined,
      typ: rec.bt || '',
      era: rec.era | 0, // 0 unknown, 1 up to 1918, 2 1919–1948, 3 1949–1990, 4 from 1991
      use: rec.use || '',
      // the facade parameters of the house: its own over the row of the tile's table
      fa: fas ? Object.assign({}, (T.fat && T.fat[fas.t]) || {}, fas) : null,
    };
  b.hid = hashStr(b.id || cx.toFixed(1) + ',' + cy.toFixed(1));
  // ---- walls ----
  b.F = [];
  if (Array.isArray(rec.F) && rec.F.length && !turned) {
    rec.F.forEach((q, i) => {
      const a = map(q[0], q[1]),
        c = map(q[2], q[3]),
        L = Math.hypot(c[0] - a[0], c[1] - a[1]),
        own = Array.isArray(rec.S) && rec.S[i] && (rec.S[i].mat || rec.S[i].col) ? rec.S[i] : null;
      b.F.push([a[0], a[1], c[0], c[1], q[4], q[5] * L, q[6], q[7], q[8] | 0, q[9] === undefined ? 99 : q[9], own]);
    });
  } else
    for (const r of [f].concat(holes))
      for (let k = 0; k < r.length; k += 2) {
        const j = (k + 2) % r.length,
          L = Math.hypot(r[j] - r[k], r[j + 1] - r[k + 1]);
        b.F.push([r[k], r[k + 1], r[j], r[j + 1], e, L / 2, e, e, 0, 99, null]);
      }
  // ---- roof: triangles with their cover and colour ----
  b.tris = [];
  const tri = (v, kc) => b.tris.push({ v, kc }),
    kc0 = [COVER[rec.rk] ?? 4, ...linC(rgb(rec.rc))];
  if (Array.isArray(rec.rv) && Array.isArray(rec.rt) && rec.rt.length >= 3) {
    const P = [],
      nt = Math.floor(rec.rt.length / 3),
      KC = new Array(nt).fill(kc0);
    for (let k = 0; k + 2 < rec.rv.length; k += 3) {
      const p = map(rec.rv[k], rec.rv[k + 1]);
      P.push([p[0], p[1], rec.rv[k + 2]]);
    }
    // a face may have its own cover and colour: its triangles are rt[ti[0] … ti[0] + ti[1])
    for (const q of Array.isArray(rec.R) ? rec.R : []) {
      if (!q.ti || (q.c === undefined && !q.col)) continue;
      const kc = [COVER[q.c === undefined ? rec.rk : q.c] ?? 4, ...linC(rgb(q.col || rec.rc))];
      for (let k = q.ti[0]; k < q.ti[0] + q.ti[1] && k < nt; k++) KC[k] = kc;
    }
    for (let k = 0; k < nt; k++) {
      const A = P[rec.rt[k * 3]],
        B = P[rec.rt[k * 3 + 1]],
        C = P[rec.rt[k * 3 + 2]];
      if (A && B && C) tri([A, B, C], KC[k]);
    }
  } else {
    // no roof in the record: flat on the footprint at the eave (courtyards cut out)
    const P = bridge(f, holes),
      idx = ears(P);
    for (let k = 0; k + 2 < idx.length; k += 3)
      tri(
        [
          [...P[idx[k]], e],
          [...P[idx[k + 1]], e],
          [...P[idx[k + 2]], e],
        ],
        kc0
      );
    b.r = 0;
  }
  if (!b.tris.length) return null;
  b.trim = b.tris[0].kc.slice(1);
  return b;
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
// ---- the tile: records → buffers.
// m: { recs, fat, frame, tile: { e0, n0, s, cx, cy }, level, terrain: { n, h } | null, z0ok, old: [x, y, r], patch, extra } ----
export function kachel(m, F) {
  const T = m.tile,
    map =
      m.frame === 'utm' ? (x, y) => F.dM(x, y) : m.frame === 'abs' ? (x, y) => [x - T.cx, y - T.cy] : (x, y) => [x, y],
    mapAbs = (x, y) => [x - T.cx, y - T.cy],
    TT = { k: m.frame === 'utm' ? F.k : 1, fat: m.fat || null, z0ok: m.z0ok !== false },
    TA = { k: 1, fat: m.fat || null, z0ok: true },
    nOwn = (m.recs || []).length,
    ter = m.terrain,
    ground = ter
      ? (x, y) => {
          const [E, N] = F.toU(T.cx + x, T.cy + y);
          return hGrid(ter.h, ter.n, (E - T.e0) / T.s, (N - T.n0) / T.s);
        }
      : null,
    patch = m.patch || {},
    WB = m.level === 1 ? wallBuf() : null,
    RB = m.level === 1 ? roofBuf() : null,
    FB = m.level === 2 ? farBuf() : null,
    segs = [],
    foot = [];
  let nb = 0,
    bad = 0,
    gone = 0,
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
      // a scenario's change: other floors make a plain body of that height (the record's roof and walls no longer fit), replace
      // swaps fields of the record
      const lv = pt.levels
        ? {
            e: pt.levels * 2.9 + 0.5,
            h: pt.levels * 2.9 + 0.5,
            lv: pt.levels,
            rv: null,
            rt: null,
            R: null,
            F: null,
            S: null,
            r: 0,
          }
        : {};
      rec = Object.assign({}, rec, pt.replace || {}, lv);
    }
    let b = null;
    try {
      b = i < nOwn ? norm(rec, TT, map) : norm(rec, TA, mapAbs);
    } catch (e) {
      b = null;
    }
    if (!b) {
      // not drawn: no longer standing (fg 32), or a record that cannot be read
      if (rec && rec.fg & 32) gone++;
      else bad++;
      foot.push(0, 0, 0, 0);
      continue;
    }
    // the foot: the record's z0 (the lowest ground under its outline, read from Suhl's ground; all its heights count from there).
    // Where the ground drawn here lies elsewhere (the record was not made on this ground) the building follows the tiles; a record
    // without a foot stands on the tiles as gebaeude/gebaeude.js sets it (on a slope the ground floor keeps to the upper side).
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
    // the look after photos (bau/marken.js) – a scenario's own colour still goes over it
    const mk = MARKEN[rec.id];
    if (mk) {
      if (mk.mat && MARK_ST[mk.mat] !== undefined) b.st.style = MARK_ST[mk.mat];
      if (mk.col) b.st.col = linC(rgb(mk.col), 0.82);
      if (mk.surr !== undefined) b.st.surr = mk.surr;
      if (mk.frame !== undefined) b.st.frame = mk.frame;
      if (mk.roof) {
        const rc = linC(rgb(mk.roof));
        for (const t of b.tris) t.kc = [t.kc[0], ...rc];
        b.trim = rc;
      }
      if (mk.rise > 0 && b.r !== 0) {
        const done = new Set();
        for (const t of b.tris)
          for (const v of t.v)
            if (!done.has(v) && v[2] > b.e + 0.05) {
              v[2] = b.e + (v[2] - b.e) * mk.rise;
              done.add(v);
            }
      }
      b.mark = mk;
    }
    if (pt && pt.col) b.st.col = linC(rgb(pt.col), 0.82);
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
  const out = { n: nb, bad, gone, off, segs: new Float32Array(segs), foot: new Float32Array(foot) },
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
// ---- trees of a tile (product b, tools/suhl/gruen): 8 bytes per tree, little endian – uint16 x (cm east of the tile's west edge),
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
