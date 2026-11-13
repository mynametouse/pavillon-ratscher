// ===================== feat/grenzland-auto: vehicle bodies as geometry – the kit and the body builder (GLKAROSSE) =====================
// Pure (no imports, no scene; unit tests viz3/test/unit/grenzland_auto.test.mjs, pictures without a browser
// viz3/extra/grenzland-auto/werkzeug/bild.mjs). Everything in the vehicle frame: x right, y forward, z up, metres, origin on the ground
// under the middle between the axles' weights (as vehicles/vehicle.js wants it).
//   kit()                 a triangle soup per part ('lack0' … paint slots, 'matt' vertex colours, 'chrom', 'glas', lamps …):
//                         tri, quad, box, grid, tube, lathe, sweep, fan, at(transform, fn); done() → { part: { pos, nor, col, uv? } } in
//                         three's frame (x, z, −y) with creased smooth normals
//   body(k, D)            a body lofted from cross-sections along its length: a lower body with rocker, waist and shoulder, a deck (bonnet,
//                         boot) or a glasshouse above it (ledge, glass between seals, the roof's edge, a crowned roof), the windscreens as
//                         the planes between deck and roof, pillars, door seams, wheel arches cut in with their wells, an inner shell
//   F(list)               a function of y from keys [[y, v], …] (linear between them); fillet(pts, r, n) rounds a polyline's corners
export const GLKAROSSE = (() => {
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  const rgb = (r, g, b) => [lin(r / 255), lin(g / 255), lin(b / 255)];
  const hex = h => {
    const s = String(h || '').replace('#', ''),
      n = parseInt(s.length === 3 ? s.replace(/(.)/g, '$1$1') : s, 16);
    return Number.isFinite(n) ? rgb((n >> 16) & 255, (n >> 8) & 255, n & 255) : rgb(128, 128, 128);
  };
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
    add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
    mul = (a, s) => [a[0] * s, a[1] * s, a[2] * s],
    dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
    crs = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
    len = a => Math.hypot(a[0], a[1], a[2]),
    nrm = a => {
      const l = len(a) || 1;
      return [a[0] / l, a[1] / l, a[2] / l];
    },
    mix = (a, b, t) => a + (b - a) * t,
    mix3 = (a, b, t) => [mix(a[0], b[0], t), mix(a[1], b[1], t), mix(a[2], b[2], t)],
    clamp = (v, a, b) => Math.max(a, Math.min(b, v)),
    smooth = t => {
      t = clamp(t, 0, 1);
      return t * t * (3 - 2 * t);
    };
  // a function of y from keys [[y, v], …] (sorted by y), linear between, constant outside; a number stays a number
  function F(keys) {
    if (typeof keys === 'function') return keys;
    if (typeof keys === 'number') return () => keys;
    const K = keys.slice().sort((a, b) => a[0] - b[0]);
    const f = y => {
      if (y <= K[0][0]) return K[0][1];
      for (let i = 1; i < K.length; i++)
        if (y <= K[i][0]) {
          const [a, va] = K[i - 1],
            [b, vb] = K[i];
          return b - a < 1e-9 ? vb : va + ((vb - va) * (y - a)) / (b - a);
        }
      return K[K.length - 1][1];
    };
    f.keys = K;
    return f;
  }
  // the corners of a 2D polyline rounded with radius r (n segments each); r may be a list per inner corner
  function fillet(pts, r, n = 4) {
    const out = [pts[0]];
    for (let i = 1; i + 1 < pts.length; i++) {
      const p = pts[i],
        a = pts[i - 1],
        b = pts[i + 1],
        ri = Array.isArray(r) ? r[i - 1] || 0 : r,
        da = [a[0] - p[0], a[1] - p[1]],
        db = [b[0] - p[0], b[1] - p[1]],
        la = Math.hypot(da[0], da[1]),
        lb = Math.hypot(db[0], db[1]);
      if (!(ri > 0) || la < 1e-6 || lb < 1e-6) {
        out.push(p);
        continue;
      }
      const ua = [da[0] / la, da[1] / la],
        ub = [db[0] / lb, db[1] / lb],
        cosA = clamp(ua[0] * ub[0] + ua[1] * ub[1], -1, 1),
        half = Math.acos(cosA) / 2;
      if (half > Math.PI / 2 - 0.02) {
        out.push(p);
        continue;
      }
      const d = Math.min(ri / Math.tan(half), la * 0.49, lb * 0.49), // how far the arc starts from the corner
        rr = d * Math.tan(half),
        bis = nrm([ua[0] + ub[0], ua[1] + ub[1], 0]),
        c = [p[0] + (bis[0] * rr) / Math.sin(half), p[1] + (bis[1] * rr) / Math.sin(half)],
        s = [p[0] + ua[0] * d, p[1] + ua[1] * d],
        e = [p[0] + ub[0] * d, p[1] + ub[1] * d];
      let a0 = Math.atan2(s[1] - c[1], s[0] - c[0]),
        a1 = Math.atan2(e[1] - c[1], e[0] - c[0]);
      while (a1 - a0 > Math.PI) a1 -= 2 * Math.PI;
      while (a1 - a0 < -Math.PI) a1 += 2 * Math.PI;
      for (let k = 0; k <= n; k++) {
        const t = a0 + ((a1 - a0) * k) / n;
        out.push([c[0] + Math.cos(t) * rr, c[1] + Math.sin(t) * rr]);
      }
    }
    out.push(pts[pts.length - 1]);
    return out;
  }
  // ---------------- the kit ----------------
  function kit() {
    const parts = {};
    const part = n => parts[n] || (parts[n] = { p: [], c: [], g: [], u: null });
    let T = null, // the current transform: 3 × 3 rows and a translation
      grp = 0,
      gid = 0;
    const ap = q =>
      T
        ? [
            T[0] * q[0] + T[1] * q[1] + T[2] * q[2] + T[9],
            T[3] * q[0] + T[4] * q[1] + T[5] * q[2] + T[10],
            T[6] * q[0] + T[7] * q[1] + T[8] * q[2] + T[11],
          ]
        : q;
    // a transform from { p: [x, y, z], rx, ry, rz (radians, applied z, then x, then y – heading, pitch, roll of a part), s }
    function xf(o) {
      const cz = Math.cos(o.rz || 0),
        sz = Math.sin(o.rz || 0),
        cx = Math.cos(o.rx || 0),
        sx = Math.sin(o.rx || 0),
        cy = Math.cos(o.ry || 0),
        sy = Math.sin(o.ry || 0),
        s = o.s || 1;
      // R = Rz · Rx · Ry
      const a = [cz * cy - sz * sx * sy, -sz * cx, cz * sy + sz * sx * cy],
        b = [sz * cy + cz * sx * sy, cz * cx, sz * sy - cz * sx * cy],
        c = [-cx * sy, sx, cx * cy],
        p = o.p || [0, 0, 0];
      return [
        a[0] * s,
        a[1] * s,
        a[2] * s,
        b[0] * s,
        b[1] * s,
        b[2] * s,
        c[0] * s,
        c[1] * s,
        c[2] * s,
        p[0],
        p[1],
        p[2],
      ];
    }
    const compose = (A, B) => {
      // A after B: x → A(B(x))
      const r = new Array(12);
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) r[i * 3 + j] = A[i * 3] * B[j] + A[i * 3 + 1] * B[3 + j] + A[i * 3 + 2] * B[6 + j];
        r[9 + i] = A[i * 3] * B[9] + A[i * 3 + 1] * B[10] + A[i * 3 + 2] * B[11] + A[9 + i];
      }
      return r;
    };
    const K = {
      parts,
      // everything made inside fn is placed by the transform o (nesting composes)
      at(o, fn) {
        const prev = T,
          m = xf(o);
        T = prev ? compose(prev, m) : m;
        try {
          fn();
        } finally {
          T = prev;
        }
        return K;
      },
      // faces made inside fn shade as one smooth surface (up to 75° between neighbours); outside: creases from 38°
      smooth(fn) {
        const prev = grp;
        grp = ++gid;
        try {
          fn();
        } finally {
          grp = prev;
        }
        return K;
      },
      flat(fn) {
        const prev = grp;
        grp = -1;
        try {
          fn();
        } finally {
          grp = prev;
        }
        return K;
      },
      tri(n, a, b, c, col, uv) {
        a = ap(a);
        b = ap(b);
        c = ap(c);
        const ux = b[0] - a[0],
          uy = b[1] - a[1],
          uz = b[2] - a[2],
          vx = c[0] - a[0],
          vy = c[1] - a[1],
          vz = c[2] - a[2],
          nx = uy * vz - uz * vy,
          ny = uz * vx - ux * vz,
          nz = ux * vy - uy * vx;
        if (!(nx * nx + ny * ny + nz * nz > 1e-16)) return; // a collapsed face (also NaN)
        const q = part(n);
        q.p.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
        for (let i = 0; i < 3; i++) q.c.push(col[0], col[1], col[2]);
        q.g.push(grp);
        if (uv) {
          q.u = q.u || new Array((q.p.length / 9 - 1) * 6).fill(0);
          q.u.push(uv[0][0], uv[0][1], uv[1][0], uv[1][1], uv[2][0], uv[2][1]);
        } else if (q.u) q.u.push(0, 0, 0, 0, 0, 0);
      },
      // a b c d counter-clockwise seen from outside
      quad(n, a, b, c, d, col, uv) {
        K.tri(n, a, b, c, col, uv && [uv[0], uv[1], uv[2]]);
        K.tri(n, a, c, d, col, uv && [uv[0], uv[2], uv[3]]);
      },
      // both sides
      quad2(n, a, b, c, d, col) {
        K.quad(n, a, b, c, d, col);
        K.quad(n, d, c, b, a, col);
      },
      // a box: centre c, sizes s (x, y, z); skip: a string of faces to leave out ('b' bottom, 't' top, 'f' front +y, 'r' rear, 'l' −x, 'o' +x)
      box(n, c, s, col, skip = '') {
        const [x0, x1] = [c[0] - s[0] / 2, c[0] + s[0] / 2],
          [y0, y1] = [c[1] - s[1] / 2, c[1] + s[1] / 2],
          [z0, z1] = [c[2] - s[2] / 2, c[2] + s[2] / 2];
        K.flat(() => {
          if (!skip.includes('o')) K.quad(n, [x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1], col);
          if (!skip.includes('l')) K.quad(n, [x0, y1, z0], [x0, y0, z0], [x0, y0, z1], [x0, y1, z1], col);
          if (!skip.includes('f')) K.quad(n, [x1, y1, z0], [x0, y1, z0], [x0, y1, z1], [x1, y1, z1], col);
          if (!skip.includes('r')) K.quad(n, [x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], col);
          if (!skip.includes('t')) K.quad(n, [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1], col);
          if (!skip.includes('b')) K.quad(n, [x0, y1, z0], [x1, y1, z0], [x1, y0, z0], [x0, y0, z0], col);
        });
      },
      // a box with rounded edges along one axis is a sweep; a soft box (all edges rounded a little): a lofted lozenge
      // (used for seats, tanks, cushions): centre c, sizes s, edge radius r
      pad(n, c, s, r, col, seg = 3) {
        const hx = s[0] / 2,
          hy = s[1] / 2,
          hz = s[2] / 2;
        r = Math.min(r, hx, hy, hz);
        // rings around z: a rounded rectangle in plan, shrinking over the top and bottom arcs
        const ring = (ins, z) => {
          const pts = [],
            rx = hx - ins,
            ry = hy - ins,
            cr = Math.max(0.001, r - ins);
          for (const [sx, sy, a0] of [
            [1, 1, 0],
            [-1, 1, 90],
            [-1, -1, 180],
            [1, -1, 270],
          ])
            for (let k = 0; k <= seg; k++) {
              const a = ((a0 + (90 * k) / seg) * Math.PI) / 180;
              pts.push([c[0] + sx * (rx - cr) + Math.cos(a) * cr, c[1] + sy * (ry - cr) + Math.sin(a) * cr, c[2] + z]);
            }
          return pts;
        };
        const rows = [];
        for (let k = 0; k <= seg; k++) {
          const a = (Math.PI / 2) * (k / seg);
          rows.push(ring(r * (1 - Math.sin(a)), -hz + r * (1 - Math.cos(a))));
        }
        for (let k = seg; k >= 0; k--) {
          const a = (Math.PI / 2) * (k / seg);
          rows.push(ring(r * (1 - Math.sin(a)), hz - r * (1 - Math.cos(a))));
        }
        K.smooth(() => {
          K.grid(rows, () => [n, col], { wrap: true, flip: true });
          K.fan(n, rows[0], col, false);
          K.fan(n, rows[rows.length - 1], col, true);
        });
      },
      // a rounded solid lofted along y: sections [{ y, w (half width), z0, z1, e (2: ellipse … 6: nearly a box), x (middle, default 0) }],
      // flat ends (make the first and last sections small for round ends)
      blob(n, secs, col, seg = 16) {
        const rows = secs.map(s => {
          const row = [],
            e = 2 / (s.e || 2.5),
            zc = (s.z0 + s.z1) / 2,
            hz = (s.z1 - s.z0) / 2;
          for (let i = 0; i < seg; i++) {
            const a = (i / seg) * Math.PI * 2,
              c = Math.cos(a),
              si = Math.sin(a);
            row.push([
              (s.x || 0) + s.w * Math.sign(c) * Math.pow(Math.abs(c), e),
              s.y,
              zc + hz * Math.sign(si) * Math.pow(Math.abs(si), e),
            ]);
          }
          return row;
        });
        K.smooth(() => {
          K.grid(rows, () => [n, col], { wrap: true });
          K.fan(n, rows[0], col, true);
          K.fan(n, rows[rows.length - 1], col, false);
        });
      },
      // a surface through the points R[i][j]; fn(i, j) → [part, colour] | null for the face between (i, j) and (i + 1, j + 1);
      // outside is rows × columns (R[i+1][j] − R[i][j]) × (R[i][j+1] − R[i][j]); o: { wrap (close the columns), flip, both }
      grid(R, fn, o = {}) {
        const nj = R[0].length,
          mj = o.wrap ? nj : nj - 1;
        for (let i = 0; i + 1 < R.length; i++)
          for (let j = 0; j < mj; j++) {
            const f = fn(i, j);
            if (!f) continue;
            const a = R[i][j],
              b = R[i + 1][j],
              c = R[i + 1][(j + 1) % nj],
              d = R[i][(j + 1) % nj];
            if (o.flip) K.quad(f[0], a, d, c, b, f[1]);
            else K.quad(f[0], a, b, c, d, f[1]);
            if (o.both) {
              if (o.flip) K.quad(f[0], a, b, c, d, f[1]);
              else K.quad(f[0], a, d, c, b, f[1]);
            }
          }
      },
      // a closed polygon filled from its middle; ccw: counter-clockwise seen from outside
      fan(n, pts, col, ccw = true, mid) {
        const m = mid || mul(pts.reduce(add, [0, 0, 0]), 1 / pts.length);
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i],
            b = pts[(i + 1) % pts.length];
          if (ccw) K.tri(n, m, a, b, col);
          else K.tri(n, m, b, a, col);
        }
      },
      // a tube along the points pts; r: a number, or a function of t ∈ [0, 1]; o: { caps: 0 none | 1 both | 'a' | 'b', flat: [sx, sz] squash }
      tube(n, pts, r, seg, col, o = {}) {
        const m = pts.length;
        if (m < 2) return;
        const rows = [];
        let up = null,
          prevT = null;
        const tot = [];
        let L = 0;
        for (let i = 0; i < m; i++) {
          if (i) L += len(sub(pts[i], pts[i - 1]));
          tot.push(L);
        }
        for (let i = 0; i < m; i++) {
          const t = nrm(sub(pts[Math.min(m - 1, i + 1)], pts[Math.max(0, i - 1)]));
          if (!up) {
            const ref = Math.abs(t[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1];
            up = nrm(crs(crs(t, ref), t));
          } else {
            // parallel transport of the frame
            const ax = crs(prevT, t),
              s = len(ax);
            if (s > 1e-6) {
              const a = Math.asin(clamp(s, -1, 1)) * (dot(prevT, t) < 0 ? -1 : 1),
                u = nrm(ax),
                c = Math.cos(a),
                si = Math.sin(a);
              up = nrm(add(add(mul(up, c), mul(crs(u, up), si)), mul(u, dot(u, up) * (1 - c))));
            }
            up = nrm(sub(up, mul(t, dot(up, t))));
          }
          prevT = t;
          const side = crs(t, up),
            rr = typeof r === 'function' ? r(L > 0 ? tot[i] / L : 0) : r,
            row = [];
          for (let k = 0; k < seg; k++) {
            const a = (k / seg) * Math.PI * 2 + (o.a0 || 0),
              cu = Math.cos(a) * rr * (o.flat ? o.flat[0] : 1),
              cv = Math.sin(a) * rr * (o.flat ? o.flat[1] : 1);
            row.push(add(pts[i], add(mul(side, cu), mul(up, cv))));
          }
          rows.push(row);
        }
        K.smooth(() => {
          K.grid(rows, () => [n, col], { wrap: true });
          if (o.caps === 1 || o.caps === 'a') K.fan(n, rows[0], col, true, pts[0]);
          if (o.caps === 1 || o.caps === 'b') K.fan(n, rows[m - 1], col, false, pts[m - 1]);
        });
      },
      // a surface of revolution about the axis through o along ax: prof [[r, t], …] (radius, distance along the axis), running
      // counter-clockwise around the solid's half section (up the outside, in over the top); a0 … a1 for a part of the turn
      lathe(n, o, ax, prof, seg, col, a0 = 0, a1 = Math.PI * 2) {
        const w = nrm(ax),
          ref = Math.abs(w[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1],
          u = nrm(crs(ref, w)),
          v = crs(w, u),
          full = Math.abs(a1 - a0 - Math.PI * 2) < 1e-6,
          rows = [];
        for (let k = 0; k <= seg; k++) {
          const a = a0 + ((a1 - a0) * k) / seg,
            cu = Math.cos(a),
            cv = Math.sin(a);
          rows.push(prof.map(([r, t]) => add(o, add(mul(w, t), add(mul(u, cu * r), mul(v, cv * r))))));
        }
        if (full) rows[seg] = rows[0];
        const colOf = typeof col === 'function' ? col : () => col;
        K.smooth(() =>
          K.grid(
            rows,
            (i, j) => {
              const c = colOf(j, i);
              return c ? (Array.isArray(c[0]) || typeof c[0] === 'string' ? c : [n, c]) : null;
            },
            {}
          )
        );
      },
      // a profile [[u, v], …] (u outward, v up; closed, counter-clockwise with u to the right and v up) swept along a path of points;
      // out(i) → the outward unit vector at point i (default: horizontal, to the right of the direction of travel)
      sweep(n, path, prof, col, o = {}) {
        const m = path.length,
          rows = [],
          left = !!o.left;
        for (let i = 0; i < m; i++) {
          const a = path[Math.max(0, i - 1)],
            b = path[Math.min(m - 1, i + 1)];
          let t = nrm(sub(b, a));
          if (o.closed) t = nrm(sub(path[(i + 1) % m], path[(i - 1 + m) % m]));
          const out = o.out ? o.out(i, t) : nrm(left ? crs([0, 0, 1], t) : crs(t, [0, 0, 1])),
            upv = o.up ? o.up(i, t) : nrm(left ? crs(t, out) : crs(out, t));
          rows.push(prof.map(([pu, pv]) => add(path[i], add(mul(out, pu), mul(upv, pv)))));
        }
        if (o.closed) rows.push(rows[0]);
        const flip = left !== !!o.flip;
        const body = () => {
          K.grid(rows, () => [n, col], { wrap: true, flip });
          if (!o.closed && o.caps !== 0) {
            K.fan(n, rows[0], col, !flip);
            K.fan(n, rows[rows.length - 1], col, flip);
          }
        };
        if (o.smooth) K.smooth(body);
        else body();
      },
      // where a ray from o along d first meets the faces of the parts whose names match re: the distance, or null
      ray(o, d, re = /^lack/) {
        let best = null;
        for (const [name, q] of Object.entries(parts)) {
          if (!re.test(name)) continue;
          const p = q.p;
          for (let i = 0; i < p.length; i += 9) {
            const a = [p[i], p[i + 1], p[i + 2]],
              e1 = [p[i + 3] - a[0], p[i + 4] - a[1], p[i + 5] - a[2]],
              e2 = [p[i + 6] - a[0], p[i + 7] - a[1], p[i + 8] - a[2]],
              h = crs(d, e2),
              det = dot(e1, h);
            if (Math.abs(det) < 1e-12) continue;
            const s = sub(o, a),
              uu = dot(s, h) / det;
            if (uu < -1e-6 || uu > 1 + 1e-6) continue;
            const q2 = crs(s, e1),
              vv = dot(d, q2) / det;
            if (vv < -1e-6 || uu + vv > 1 + 1e-6) continue;
            const t = dot(e2, q2) / det;
            if (t > 1e-6 && (best == null || t < best)) best = t;
          }
        }
        return best;
      },
      count() {
        let n = 0;
        for (const q of Object.values(parts)) n += q.p.length / 9;
        return n;
      },
      // the parts as flat arrays in three's frame (x, z, −y), normals smooth where faces meet at less than `crease` degrees
      done(crease = 38) {
        const out = {};
        for (const [name, q] of Object.entries(parts)) {
          const nt = q.p.length / 9;
          if (!nt) continue;
          const fn = new Float32Array(nt * 3),
            fa = new Float32Array(nt);
          for (let t = 0; t < nt; t++) {
            const i = t * 9,
              ux = q.p[i + 3] - q.p[i],
              uy = q.p[i + 4] - q.p[i + 1],
              uz = q.p[i + 5] - q.p[i + 2],
              vx = q.p[i + 6] - q.p[i],
              vy = q.p[i + 7] - q.p[i + 1],
              vz = q.p[i + 8] - q.p[i + 2],
              nx = uy * vz - uz * vy,
              ny = uz * vx - ux * vz,
              nz = ux * vy - uy * vx,
              l = Math.hypot(nx, ny, nz) || 1;
            fn[t * 3] = nx / l;
            fn[t * 3 + 1] = ny / l;
            fn[t * 3 + 2] = nz / l;
            fa[t] = l;
          }
          // the corners at one place (to a tenth of a millimetre)
          const at = new Map(),
            keyOf = i =>
              Math.round(q.p[i] * 10000) + ',' + Math.round(q.p[i + 1] * 10000) + ',' + Math.round(q.p[i + 2] * 10000);
          for (let v = 0; v < nt * 3; v++) {
            const k = keyOf(v * 3);
            let L = at.get(k);
            if (!L) at.set(k, (L = []));
            L.push(v);
          }
          const pos = new Float32Array(nt * 9),
            nor = new Float32Array(nt * 9),
            col = new Float32Array(nt * 9),
            c0 = Math.cos((crease * Math.PI) / 180),
            c1 = Math.cos((75 * Math.PI) / 180);
          for (const L of at.values())
            for (const v of L) {
              const t = (v / 3) | 0,
                g = q.g[t];
              let nx = fn[t * 3],
                ny = fn[t * 3 + 1],
                nz = fn[t * 3 + 2];
              if (g >= 0 && L.length > 1) {
                const lim = g > 0 ? c1 : c0,
                  ax = nx,
                  ay = ny,
                  az = nz;
                nx = ny = nz = 0;
                for (const w of L) {
                  const s = (w / 3) | 0;
                  if (q.g[s] !== g) continue;
                  const d = ax * fn[s * 3] + ay * fn[s * 3 + 1] + az * fn[s * 3 + 2];
                  if (d < lim) continue;
                  nx += fn[s * 3] * fa[s];
                  ny += fn[s * 3 + 1] * fa[s];
                  nz += fn[s * 3 + 2] * fa[s];
                }
                const l = Math.hypot(nx, ny, nz) || 1;
                nx /= l;
                ny /= l;
                nz /= l;
              }
              const i = v * 3;
              pos[i] = q.p[i];
              pos[i + 1] = q.p[i + 2];
              pos[i + 2] = -q.p[i + 1];
              nor[i] = nx;
              nor[i + 1] = nz;
              nor[i + 2] = -ny;
              col[i] = q.c[i];
              col[i + 1] = q.c[i + 1];
              col[i + 2] = q.c[i + 2];
            }
          out[name] = { pos, nor, col, n: nt };
          if (q.u) out[name].uv = new Float32Array(q.u);
        }
        return out;
      },
    };
    return K;
  }
  // ---------------- the body ----------------
  const BLACK = rgb(14, 14, 15),
    RUBBER = rgb(20, 20, 21),
    UNDER = rgb(22, 22, 23),
    LINER = rgb(150, 146, 136),
    INNER = rgb(52, 50, 48),
    GLASS = rgb(30, 38, 42);
  const JL = 13, // the shoulder's top: the last point of the lower body
    JN = 23; // the roof's middle
  // the lower body's half section at a station: [x, z] from the bottom's middle (0) over the well (1, 2), the rocker (3 … 6), the
  // side (7 waist-under, 8 waist, 9 trim line, 10) and the shoulder's arc (11, 12) up to its top (13)
  function lower(S) {
    const { zb, hw, sh, rs, rl, tuck, sl, zw, wd } = S,
      xb = hw - tuck,
      P = [
        [0, zb],
        [hw - wd, zb],
        [hw - wd, zb],
        [xb - rl, zb],
      ];
    for (const a of [-60, -30, 0]) {
      const t = (a * Math.PI) / 180;
      P.push([xb - rl + Math.cos(t) * rl, zb + rl + Math.sin(t) * rl]);
    }
    const z6 = zb + rl,
      zs = sh - rs,
      up = z => hw - sl * Math.pow(clamp((z - zw) / Math.max(1e-4, zs - zw), 0, 1), 1.6);
    P.push([xb + tuck * 0.72, mix(z6, zw, 0.5)]);
    P.push([hw, zw]);
    const zt = clamp(S.ztrim, zw + 0.01, zs - 0.01);
    P.push([up(zt), zt]);
    P.push([hw - sl, zs]);
    for (const a of [30, 60, 90]) {
      const t = (a * Math.PI) / 180;
      P.push([hw - sl - rs + Math.cos(t) * rs, zs + Math.sin(t) * rs]);
    }
    return P;
  }
  // the body's half width at height z of a section (below the shoulder)
  function sideX(S, z) {
    const P = lower(S);
    for (let j = 6; j < JL; j++)
      if (z <= P[j + 1][1])
        return mix(P[j][0], P[j + 1][0], clamp((z - P[j][1]) / Math.max(1e-6, P[j + 1][1] - P[j][1]), 0, 1));
    return P[JL][0];
  }
  // the upper half section as a deck (bonnet, boot: t = 0) or as a glasshouse (t = 1): points 14 … 23 as [x, z]
  function upperDeck(S) {
    const xd = S.hw - S.sl - S.rs,
      xg = Math.min(xd, S.hw - S.gin),
      zOf = x => S.sh + (S.deck - S.sh) * (1 - Math.pow(clamp(x / xd, 0, 1), S.dp)),
      P = [];
    for (let j = 14; j <= 17; j++) P.push([xg, zOf(xg)]);
    const x20 = xg - S.pw;
    P.push(
      [mix(xg, x20, 1 / 3), zOf(mix(xg, x20, 1 / 3))],
      [mix(xg, x20, 2 / 3), zOf(mix(xg, x20, 2 / 3))],
      [x20, zOf(x20)]
    );
    P.push([x20 * 0.64, zOf(x20 * 0.64)], [x20 * 0.32, zOf(x20 * 0.32)], [0, zOf(0)]);
    return P;
  }
  function upperCab(S) {
    const xg = S.hw - S.gin,
      zre = S.roof - S.crown,
      rr = S.rr,
      cx = S.wr - rr,
      cz = zre - rr,
      phi = Math.atan2(xg - S.wr, Math.max(0.05, cz - S.sh)), // how far the glass leans in
      g1 = [cx + Math.cos(phi) * rr, cz + Math.sin(phi) * rr],
      g0 = [xg, S.sh],
      P = [
        g0,
        [mix(g0[0], g1[0], 0.04), mix(g0[1], g1[1], 0.04)],
        [mix(g0[0], g1[0], 0.965), mix(g0[1], g1[1], 0.965)],
        g1,
      ];
    for (const k of [1 / 3, 2 / 3, 1]) {
      const a = mix(phi, Math.PI / 2, k);
      P.push([cx + Math.cos(a) * rr, cz + Math.sin(a) * rr]);
    }
    const zOf = x => zre + S.crown * (1 - (x / cx) * (x / cx));
    P.push([cx * 0.64, zOf(cx * 0.64)], [cx * 0.32, zOf(cx * 0.32)], [0, S.roof]);
    return P;
  }
  // D: {
  //   hw, zb, sh, deck: keys or functions of y; rs, rl, tuck, sl, zw, ztrim, wd, dp: numbers or keys
  //   y0, y1: the rear and front ends (the caps)
  //   cab: { y0 (base of the rear window), y1 (roof's rear edge), y2 (roof's front edge), y3 (base of the windscreen); roof (keys: its
  //          middle's height), crown, wr (the roof's half width), rr (its edge's radius), gin (the glass's foot from the widest line),
  //          pw (the pillars' width at their feet), bowF, bowR ([deck, roof]: how far the screens bow), pillars: [[ya, yb], …],
  //          rearGlass: false for a closed rear, frontGlass, sideGlass: [[ya, yb], …] (default: all between the pillars) }
  //   arches: [{ y, r, zc }], seams: [y, …] (door gaps), ys: more stations
  //   zone: { name: [part, colour] }, farbe(zone, y, j, i) → [part, colour] | undefined
  //   inner: false | { liner, trim } (the inner shell's colours) }
  function body(k, D) {
    const f = {};
    for (const n of ['hw', 'zb', 'sh', 'deck', 'rs', 'rl', 'tuck', 'sl', 'zw', 'ztrim', 'wd', 'dp', 'gin', 'pw'])
      f[n] = F(
        D[n] != null
          ? D[n]
          : ({ rs: 0.04, rl: 0.06, tuck: 0.03, sl: 0.012, wd: 0.27, dp: 2, gin: 0.07, pw: 0.06 }[n] ?? null)
      );
    const C = D.cab || null,
      roofF = C ? F(C.roof) : null,
      wrF = C ? F(C.wr) : null,
      crownF = C ? F(C.crown ?? 0.035) : null;
    // the parameters of the section at y
    const sect = y => {
      const zb = f.zb(y),
        sh = f.sh(y),
        S = {
          y,
          zb,
          hw: f.hw(y),
          sh,
          deck: D.deck != null ? f.deck(y) : sh,
          rs: f.rs(y),
          rl: f.rl(y),
          tuck: f.tuck(y),
          sl: f.sl(y),
          wd: f.wd(y),
          dp: f.dp(y),
          gin: f.gin(y),
          pw: f.pw(y),
        };
      S.zw = D.zw != null ? f.zw(y) : mix(zb, sh, 0.52);
      S.ztrim = D.ztrim != null ? f.ztrim(y) : sh - 0.13;
      S.rs = Math.min(S.rs, (sh - S.zw) * 0.8);
      S.rl = Math.min(S.rl, (S.zw - zb) * 0.8);
      if (C) {
        S.roof = roofF(y);
        S.wr = Math.min(wrF(y), S.hw - S.gin - 0.01);
        S.crown = crownF(y);
        S.rr = C.rr ?? 0.06;
      }
      return S;
    };
    // how much glasshouse there is at y: 0 on the decks, 1 under the roof, a ramp across the screens
    const cabT = y => {
      if (!C) return 0;
      if (y >= C.y1 && y <= C.y2) return 1;
      if (y > C.y2) return C.y3 - C.y2 < 1e-6 ? (y > C.y2 ? 0 : 1) : clamp((C.y3 - y) / (C.y3 - C.y2), 0, 1);
      return C.y1 - C.y0 < 1e-6 ? 0 : clamp((y - C.y0) / (C.y1 - C.y0), 0, 1);
    };
    const archZ = y => {
      let z = -1;
      for (const a of D.arches || []) {
        const d = y - a.y;
        if (Math.abs(d) <= a.r + 1e-9) z = Math.max(z, a.zc + Math.sqrt(Math.max(0, a.r * a.r - d * d)));
      }
      return z;
    };
    // ---- the stations ----
    const ys = new Set();
    const addY = y => {
      if (y >= D.y0 - 1e-9 && y <= D.y1 + 1e-9) ys.add(Math.round(y * 1e5) / 1e5);
    };
    for (const n of Object.keys(f)) for (const kk of f[n].keys || []) addY(kk[0]);
    for (const fn of [roofF, wrF, crownF]) for (const kk of (fn && fn.keys) || []) addY(kk[0]);
    for (const y of D.ys || []) addY(y);
    addY(D.y0);
    addY(D.y1);
    for (const a of D.arches || []) {
      for (let i = -6; i <= 6; i++) addY(a.y + a.r * Math.sin((i / 6) * (Math.PI / 2)));
      addY(a.y - a.r - 0.004);
      addY(a.y + a.r + 0.004);
    }
    const SEAM = 0.007;
    for (const y of D.seams || []) {
      addY(y - SEAM / 2);
      addY(y + SEAM / 2);
    }
    if (C) {
      for (const y of [C.y0, C.y1, C.y2, C.y3]) addY(y);
      // the seals of the screens: a little way up from the deck and down from the roof
      if (C.y3 - C.y2 > 0.02) {
        addY(mix(C.y3, C.y2, 0.045));
        addY(mix(C.y3, C.y2, 0.955));
      }
      if (C.y1 - C.y0 > 0.02) {
        addY(mix(C.y0, C.y1, 0.045));
        addY(mix(C.y0, C.y1, 0.955));
      }
      for (const [a, b] of C.pillars || []) {
        addY(a);
        addY(b);
      }
      for (const [a, b] of C.sideGlass || []) {
        addY(a);
        addY(b);
      }
      // long stretches of roof and deck: a station every 0.3 m keeps the crown round
      for (let y = C.y1 + 0.3; y < C.y2 - 0.1; y += 0.3) addY(y);
    }
    let Y = [...ys].sort((a, b) => a - b);
    // stations closer than a millimetre fall together
    Y = Y.filter((y, i) => !i || y - Y[i - 1] > 0.0009);
    // ---- the rings ----
    const R = [],
      SS = [],
      TT = [];
    for (const y of Y) {
      const S = sect(y),
        t = cabT(y),
        lo = lower(S),
        za = archZ(y);
      if (za > S.zb) {
        // inside a wheel arch: what lies under the arch's line moves up onto it; the well's roof (2) with it
        const xa = sideX(S, za);
        lo[2] = [lo[2][0], za];
        for (let j = 3; j <= 12; j++) if (lo[j][1] < za) lo[j] = [xa, za];
      }
      const ud = upperDeck(S),
        uc = C ? upperCab(S) : ud,
        up = ud.map((p, i) => [mix(p[0], uc[i][0], t), mix(p[1], uc[i][1], t)]),
        half = lo.concat(up);
      // the screens bow forward (front) or back (rear) towards the middle
      let bow = 0,
        xk = 1;
      if (C && y >= C.y2 - 1e-9 && y <= C.y3 + 1e-9 && C.bowF) {
        bow = mix(C.bowF[0], C.bowF[1], t);
        xk = half[20][0];
      } else if (C && y >= C.y0 - 1e-9 && y <= C.y1 + 1e-9 && C.bowR) {
        bow = -mix(C.bowR[0], C.bowR[1], t);
        xk = half[20][0];
      }
      const ring = [];
      for (let j = 0; j <= JN; j++) {
        const [x, z] = half[j],
          dy = bow && j >= 20 ? bow * (1 - (x / xk) * (x / xk)) : 0;
        ring.push([x, y + dy, z]);
      }
      for (let j = JN - 1; j >= 1; j--) ring.push([-ring[j][0], ring[j][1], ring[j][2]]);
      R.push(ring);
      SS.push(S);
      TT.push(t);
    }
    // ---- which face is what ----
    const Z = Object.assign(
      {
        boden: ['matt', UNDER],
        kasten: ['matt', BLACK],
        schweller: ['lack0'],
        seite: ['lack0'],
        seite2: ['lack0'],
        schulter: ['lack0'],
        sims: ['lack0'],
        dichtung: ['matt', RUBBER],
        glas: ['glas', GLASS],
        scheibe: ['glas', GLASS],
        heckscheibe: ['glas', GLASS],
        saeule: ['lack0'],
        dachkante: ['lack0'],
        dach: ['lack0'],
        haube: ['lack0'],
        heck: ['lack0'],
        naht: ['matt', BLACK],
        kappeV: ['lack0'],
        kappeH: ['lack0'],
        innen: ['matt', INNER],
        himmel: ['matt', LINER],
      },
      D.zone || {}
    );
    const WHITE = [1, 1, 1];
    const inY = (list, a, b) => (list || []).some(([p, q]) => a >= p - 1e-6 && b <= q + 1e-6);
    const zoneOf = (i, jj) => {
      const j = jj <= JN - 1 ? jj : 2 * JN - 1 - jj, // the mirrored half: the face between ring points jj and jj + 1
        ya = Y[i],
        yb = Y[i + 1],
        ym = (ya + yb) / 2,
        ta = TT[i],
        tb = TT[i + 1],
        tm = (ta + tb) / 2;
      if (j === 0) return 'boden';
      if (j <= 2) return 'kasten';
      const seam = (D.seams || []).some(s => Math.abs(ym - s) < SEAM / 2 + 1e-6);
      if (j <= 6) return seam && j >= 4 ? 'naht' : 'schweller';
      if (j <= 9) return seam ? 'naht' : j <= 8 ? 'seite' : 'seite2';
      if (j <= 12) return seam ? 'naht' : 'schulter';
      if (!C || tm <= 0) return ym > (C ? (C.y1 + C.y2) / 2 : 0) ? 'haube' : 'heck';
      const front = ym > C.y2,
        rear = ym < C.y1,
        pillar = inY(C.pillars, ya, yb),
        side = C.sideGlass ? inY(C.sideGlass, ya, yb) : !pillar;
      if (j === 13) return 'sims';
      if (j >= 14 && j <= 16) {
        if (!side || pillar) return 'saeule';
        if ((front || rear) && Math.min(ta, tb) < 0.03) return 'saeule';
        return j === 15 ? 'glas' : 'dichtung';
      }
      if (j <= 19) return tm >= 1 ? 'dachkante' : 'saeule';
      // across the top: the roof, or a screen with its seals at the deck and at the roof
      if (tm >= 1) return 'dach';
      const glass = front ? C.frontGlass !== false : C.rearGlass !== false;
      if (!glass) return front ? 'saeule' : 'heckwand';
      if (Math.min(ta, tb) < 0.03 || Math.max(ta, tb) > 0.97) return 'dichtung';
      return front ? 'scheibe' : 'heckscheibe';
    };
    Z.heckwand = Z.heckwand || Z.saeule;
    const face = (i, jj) => {
      const zn = zoneOf(i, jj);
      let r = D.farbe ? D.farbe(zn, (Y[i] + Y[i + 1]) / 2, jj <= JN - 1 ? jj : 2 * JN - 1 - jj, i) : undefined;
      if (r === null) return null;
      r = r || Z[zn];
      return r ? [r[0], r[1] || WHITE] : null;
    };
    k.grid(R, face, { wrap: true });
    // ---- the caps: the front and the rear face ----
    const capOf = (ring, zn, ccw) => {
      const r = Z[zn];
      // the lower body's outline only (a deck's ring: the top points lie on the deck)
      k.fan(r[0], ring, r[1] || WHITE, ccw);
    };
    capOf(R[R.length - 1], 'kappeV', false);
    capOf(R[0], 'kappeH', true);
    // ---- the inner shell: what one sees through the glass ----
    if (D.inner !== false && C) {
      const I = D.inner || {},
        cTrim = I.trim || Z.innen[1],
        cLiner = I.liner || Z.himmel[1],
        ya = (I.y0 ?? C.y0) - 0.02,
        yb = (I.y1 ?? C.y3) + 0.02;
      k.grid(
        R,
        (i, jj) => {
          if (Y[i] < ya || Y[i + 1] > yb) return null;
          const j = jj <= JN - 1 ? jj : 2 * JN - 1 - jj;
          if (j < 3) return null;
          const zn = zoneOf(i, jj);
          if (zn === 'glas' || zn === 'scheibe' || zn === 'heckscheibe') return null;
          if (zn === 'haube' || zn === 'heck') return null;
          return ['matt', j >= 17 && TT[i] + TT[i + 1] > 1 ? cLiner : zn === 'dichtung' ? RUBBER : cTrim];
        },
        { wrap: true, flip: true }
      );
    }
    // ---- helpers for the add-ons ----
    const B = {
      Y,
      R,
      S: sect,
      t: cabT,
      // the half width of the side at (y, z): below the shoulder the lower body, above it the glass
      x(y, z) {
        const S = sect(y);
        if (z <= S.sh || !C) return sideX(S, Math.min(z, S.sh));
        const t = cabT(y),
          ud = upperDeck(S),
          uc = upperCab(S),
          a = [mix(ud[0][0], uc[0][0], t), mix(ud[0][1], uc[0][1], t)],
          b = [mix(ud[3][0], uc[3][0], t), mix(ud[3][1], uc[3][1], t)];
        return mix(a[0], b[0], clamp((z - a[1]) / Math.max(1e-6, b[1] - a[1]), 0, 1));
      },
      // the height of the top (deck, screen or roof) at (y, x)
      top(y, x = 0) {
        const S = sect(y),
          t = cabT(y),
          ud = upperDeck(S),
          uc = C ? upperCab(S) : ud,
          P = ud.map((p, i) => [mix(p[0], uc[i][0], t), mix(p[1], uc[i][1], t)]);
        x = Math.abs(x);
        for (let j = P.length - 1; j > 0; j--)
          if (x <= P[j - 1][0] + 1e-9)
            return mix(P[j][1], P[j - 1][1], clamp((x - P[j][0]) / Math.max(1e-6, P[j - 1][0] - P[j][0]), 0, 1));
        return S.sh;
      },
      // a point on the side skin, pushed out by d
      side(sx, y, z, d = 0) {
        return [sx * (B.x(y, z) + d), y, z];
      },
      // the foremost (dir +1) or rearmost (−1) y of the painted body on the line through (x, z)
      end(x, z, dir = 1) {
        const t = k.ray([x, dir * 20, z], [0, -dir, 0], /^(lack|matt)/);
        return t == null ? (dir > 0 ? D.y1 : D.y0) : dir * (20 - t);
      },
    };
    return B;
  }
  // ---------------- wheels ----------------
  // a wheel about the x axis at the origin: tyre (rounded shoulders), a rim dished to the outside; o: { r, w, rim (radius), s (+1: the
  // outside is +x), tyre, col (rim colour), cap: 'chrom' | colour | null, holes, part }
  function wheel(k, o) {
    const r = o.r,
      w = o.w || 0.16,
      ri = o.rim || r * 0.62,
      s = o.s || 1,
      n = o.part || 'matt',
      tyre = o.tyre || rgb(17, 17, 18),
      rimC = o.col || rgb(150, 152, 155),
      sh = Math.min(w * 0.32, (r - ri) * 0.6),
      seg = o.seg || 20,
      // the half section from the inner bead over the tread to the outer bead (t along the axis, the outside at +w/2)
      prof = [
        [ri, -w / 2 + 0.006],
        [r - sh, -w / 2],
        [r - sh * 0.3, -w / 2 + sh * 0.3],
        [r, -w / 2 + sh],
        [r, w / 2 - sh],
        [r - sh * 0.3, w / 2 - sh * 0.3],
        [r - sh, w / 2],
        [ri, w / 2 - 0.006],
      ];
    k.lathe(n, [0, 0, 0], [s, 0, 0], prof, seg, tyre);
    // the rim: a well, the dish, the hub
    const d = w / 2 - 0.006,
      dish = o.dish ?? 0.035,
      rp = [
        [ri, d],
        [ri * 0.9, d - 0.012],
        [ri * 0.82, d - dish],
        [ri * 0.42, d - dish - 0.004],
        [ri * 0.36, d - dish + 0.012],
        [0.001, d - dish + 0.014],
      ];
    k.lathe(n, [0, 0, 0], [s, 0, 0], rp, seg, j => (j === 1 && o.holes ? o.holes : rimC));
    // the inside: a dark disc (brake drum and back of the rim)
    k.lathe(
      n,
      [0, 0, 0],
      [-s, 0, 0],
      [
        [ri, d],
        [ri * 0.5, d - 0.03],
        [0.001, d - 0.03],
      ],
      Math.max(10, seg / 2),
      rgb(40, 40, 42)
    );
    if (o.cap) {
      const cr = o.capR || ri * 0.3,
        t0 = d - dish + 0.014;
      k.lathe(
        typeof o.cap === 'string' ? o.cap : n,
        [0, 0, 0],
        [s, 0, 0],
        [
          [cr, t0 - 0.004],
          [cr * 0.92, t0 + 0.012],
          [cr * 0.55, t0 + 0.022],
          [0.001, t0 + 0.025],
        ],
        14,
        typeof o.cap === 'string' ? rgb(200, 203, 206) : o.cap
      );
    }
  }
  return {
    kit,
    body,
    wheel,
    F,
    fillet,
    lower,
    sideX,
    rgb,
    hex,
    lin,
    V: { sub, add, mul, dot, crs, len, nrm, mix, mix3, clamp, smooth },
    COL: { BLACK, RUBBER, UNDER, LINER, INNER, GLASS },
    JL,
    JN,
  };
})();
