// ===================== feat/laeden-leben 5: how busy a shop is, who works, where people walk – pure (LLPLAN) =====================
// The numbers and ways of laeden/leben.js without three.js (node tests: viz3/test/unit/laeden_leben.test.mjs):
//   andrang(typ, wd, min) → 0 … 1   how full the shop is by weekday (0 Sunday … 6 Saturday) and minute of the day – after the usual
//                                   curves of German retail: Saturday morning full, after work busy, Tuesday afternoon quiet
//   besetzung(typ, a, o) → { kunden, kassen, theke, auff, info, zuschnitt }   people for that much custom (o: { kassen: tills there,
//                                   theken, phone })
//   grid(vols, segs, o) → G         a raster of where a person can stand (inside the unit's outlines, away from walls and fixtures)
//   pfad(G, ax, ay, bx, by) → [[x, y] …] | null   the way on the raster (A*, then straightened where the view is free)
//   frei(G, x, y) · nahFrei(G, x, y, r) → [x, y] | null · regalPlaetze(G, goods, n, seed) → [{ x, y, hd, gi }]
export const LLPLAN = (() => {
  // ---- custom by the hour (0 … 1) ----
  // a weekday's shape: the morning's shoppers, a lunch peak, the quiet afternoon, the hours after work
  const DAY = [
    [6, 0.15],
    [7, 0.3],
    [8, 0.45],
    [9, 0.55],
    [10, 0.62],
    [11, 0.66],
    [12, 0.6],
    [13, 0.42],
    [14, 0.38],
    [15, 0.46],
    [16, 0.62],
    [17, 0.82],
    [18, 0.85],
    [19, 0.55],
    [20, 0.3],
    [21, 0.2],
    [22, 0.1],
  ];
  // Saturday: full from nine to one, then thinner
  const SAT = [
    [6, 0.2],
    [7, 0.4],
    [8, 0.7],
    [9, 0.92],
    [10, 1.0],
    [11, 1.0],
    [12, 0.9],
    [13, 0.72],
    [14, 0.6],
    [15, 0.55],
    [16, 0.52],
    [17, 0.5],
    [18, 0.42],
    [19, 0.3],
    [20, 0.15],
  ];
  const lerpT = (T, h) => {
    if (h <= T[0][0]) return T[0][1];
    for (let i = 1; i < T.length; i++)
      if (h <= T[i][0]) {
        const [h0, a] = T[i - 1],
          [h1, b] = T[i];
        return a + ((b - a) * (h - h0)) / (h1 - h0);
      }
    return T[T.length - 1][1];
  };
  // the weekdays a little apart: Monday and Friday busier, Tuesday and Wednesday quieter
  const WD = [0.7, 1.0, 0.84, 0.88, 0.95, 1.08, 1.0];
  function andrang(typ, wd, min) {
    const h = min / 60;
    let a = wd === 6 ? lerpT(SAT, h) : lerpT(DAY, h) * WD[wd];
    if (typ === 'baumarkt') {
      // the DIY store: Saturday is its day, weekday mornings the craftsmen, evenings thinner
      a = wd === 6 ? lerpT(SAT, h) * 1.05 : lerpT(DAY, h) * WD[wd] * (h < 10 ? 1.1 : h > 18 ? 0.7 : 0.85);
    } else if (typ === 'baecker') {
      // the bakery: the early rolls, Sunday's breakfast, the coffee in the afternoon
      const B = [
        [6, 0.7],
        [7, 0.95],
        [8, 0.9],
        [9, 0.75],
        [10, 0.5],
        [12, 0.45],
        [14, 0.55],
        [15, 0.6],
        [16, 0.4],
        [18, 0.2],
      ];
      a = lerpT(B, h) * (wd === 0 || wd === 6 ? 1.15 : 1);
    } else if (typ === 'tankstelle' || typ === 'restaurant' || typ === 'imbiss') a = lerpT(DAY, h) * 0.8;
    return Math.max(0, Math.min(1, a));
  }
  // ---- people for that much custom ----
  const MAXK = { supermarkt: 10, discounter: 9, baumarkt: 8, baecker: 3, getraenke: 3, tankstelle: 2, apotheke: 2 };
  function besetzung(typ, a, o = {}) {
    const ph = !!o.phone,
      nk = Math.max(0, o.kassen | 0),
      k0 = MAXK[typ] || 2,
      kmax = ph ? Math.max(1, Math.ceil(k0 * 0.45)) : k0;
    const kunden = a <= 0 ? 0 : Math.max(1, Math.round(kmax * a));
    // tills: one at least while open, more as the queue grows (about one till for every three customers in the shop)
    const kassen = a <= 0 || !nk ? 0 : Math.min(nk, Math.max(1, Math.round(kunden / 3)), ph ? 2 : nk);
    const theke = o.theken ? (a > 0.75 && !ph ? 2 : 1) : 0;
    // someone filling shelves in the quiet hours of a big shop
    const auff = (typ === 'supermarkt' || typ === 'discounter') && a < 0.7 && !ph ? 1 : 0;
    const info = typ === 'baumarkt' ? 1 : 0,
      zuschnitt = typ === 'baumarkt' && !ph ? 1 : 0;
    return { kunden, kassen, theke, auff, info, zuschnitt };
  }
  // ---- the raster of where people can stand ----
  function inPoly(poly, x, y) {
    let c = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const [xi, yi] = poly[i],
        [xj, yj] = poly[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  const segD = (s, x, y) => {
    const ex = s[2] - s[0],
      ey = s[3] - s[1],
      l2 = ex * ex + ey * ey || 1,
      t = Math.max(0, Math.min(1, ((x - s[0]) * ex + (y - s[1]) * ey) / l2));
    return Math.hypot(x - s[0] - ex * t, y - s[1] - ey * t);
  };
  const edgeD = (f, x, y) => {
    let e = 1e9;
    for (let k = 0; k < f.length; k++) {
      const p = f[k],
        q = f[(k + 1) % f.length];
      e = Math.min(e, segD([p[0], p[1], q[0], q[1]], x, y));
    }
    return e;
  };
  // vols: outlines [[x, y] …]; segs: [ax, ay, bx, by] that stop a person; o: { cell (m), rad (m, the clearance) }
  function grid(vols0, segs, o = {}) {
    // outlines as rings of points (laeden/innen_plan.js keeps them flat: x0, y0, x1, y1 …)
    const vols = vols0.map(f => {
      if (typeof f[0] !== 'number') return f;
      const r = [];
      for (let i = 0; i + 1 < f.length; i += 2) r.push([f[i], f[i + 1]]);
      return r;
    });
    const C = o.cell || 0.4,
      rad = o.rad || 0.32;
    let x0 = 1e9,
      y0 = 1e9,
      x1 = -1e9,
      y1 = -1e9;
    for (const f of vols)
      for (const [x, y] of f) {
        x0 = Math.min(x0, x);
        y0 = Math.min(y0, y);
        x1 = Math.max(x1, x);
        y1 = Math.max(y1, y);
      }
    const nx = Math.max(1, Math.ceil((x1 - x0) / C)),
      ny = Math.max(1, Math.ceil((y1 - y0) / C)),
      free = new Uint8Array(nx * ny);
    // the segments in 2 m buckets
    const B = new Map(),
      bk = (i, j) => i + ',' + j;
    for (const s of segs) {
      const i0 = Math.floor((Math.min(s[0], s[2]) - rad - x0) / 2),
        i1 = Math.floor((Math.max(s[0], s[2]) + rad - x0) / 2),
        j0 = Math.floor((Math.min(s[1], s[3]) - rad - y0) / 2),
        j1 = Math.floor((Math.max(s[1], s[3]) + rad - y0) / 2);
      for (let i = i0; i <= i1; i++)
        for (let j = j0; j <= j1; j++) {
          const k = bk(i, j);
          if (!B.has(k)) B.set(k, []);
          B.get(k).push(s);
        }
    }
    for (let j = 0; j < ny; j++)
      for (let i = 0; i < nx; i++) {
        const x = x0 + (i + 0.5) * C,
          y = y0 + (j + 0.5) * C;
        // inside an outline – or in the seam between two of them (the parts of one store are drawn a few decimetres apart; the
        // walls of laeden/innen.js leave the opening, as its unitAt counts the seam as inside)
        if (!vols.some(f => inPoly(f, x, y))) {
          let nearN = 0;
          for (const f of vols) if (edgeD(f, x, y) < 0.45) nearN++;
          if (nearN < 2) continue;
        }
        const a = B.get(bk(Math.floor((x - x0) / 2), Math.floor((y - y0) / 2))) || [];
        if (a.some(s => segD(s, x, y) < rad)) continue;
        free[j * nx + i] = 1;
      }
    return { x0, y0, nx, ny, C, free, n: free.reduce((a, b) => a + b, 0) };
  }
  const cellOf = (G, x, y) => [Math.floor((x - G.x0) / G.C), Math.floor((y - G.y0) / G.C)];
  const ok = (G, i, j) => i >= 0 && j >= 0 && i < G.nx && j < G.ny && G.free[j * G.nx + i] === 1;
  const frei = (G, x, y) => {
    const [i, j] = cellOf(G, x, y);
    return ok(G, i, j);
  };
  const mid = (G, i, j) => [G.x0 + (i + 0.5) * G.C, G.y0 + (j + 0.5) * G.C];
  function nahFrei(G, x, y, r = 2) {
    const [ci, cj] = cellOf(G, x, y),
      R = Math.ceil(r / G.C);
    let best = null,
      bd = 1e9;
    for (let dj = -R; dj <= R; dj++)
      for (let di = -R; di <= R; di++) {
        const i = ci + di,
          j = cj + dj;
        if (!ok(G, i, j)) continue;
        const [mx, my] = mid(G, i, j),
          d = Math.hypot(mx - x, my - y);
        if (d < bd && d <= r) {
          bd = d;
          best = [mx, my];
        }
      }
    return best;
  }
  // is the straight line from a to b free on the raster (sampled every half cell)?
  function sicht(G, ax, ay, bx, by) {
    const L = Math.hypot(bx - ax, by - ay),
      n = Math.max(1, Math.ceil(L / (G.C * 0.5)));
    for (let k = 1; k < n; k++) {
      const t = k / n;
      if (!frei(G, ax + (bx - ax) * t, ay + (by - ay) * t)) return false;
    }
    return true;
  }
  // A* over the 8 neighbours (no corner cutting), then the corners taken out where the view is free
  function pfad(G, ax, ay, bx, by) {
    let A = cellOf(G, ax, ay),
      Bc = cellOf(G, bx, by);
    if (!ok(G, A[0], A[1])) {
      const q = nahFrei(G, ax, ay, 1.6);
      if (!q) return null;
      A = cellOf(G, q[0], q[1]);
    }
    if (!ok(G, Bc[0], Bc[1])) {
      const q = nahFrei(G, bx, by, 1.6);
      if (!q) return null;
      Bc = cellOf(G, q[0], q[1]);
    }
    const N = G.nx * G.ny,
      g = new Float32Array(N).fill(Infinity),
      from = new Int32Array(N).fill(-1),
      closed = new Uint8Array(N),
      start = A[1] * G.nx + A[0],
      goal = Bc[1] * G.nx + Bc[0];
    // a small binary heap of [f, cell]
    const H = [];
    const push = (f, c) => {
      H.push([f, c]);
      let i = H.length - 1;
      while (i > 0) {
        const p = (i - 1) >> 1;
        if (H[p][0] <= H[i][0]) break;
        [H[p], H[i]] = [H[i], H[p]];
        i = p;
      }
    };
    const pop = () => {
      const top = H[0],
        last = H.pop();
      if (H.length) {
        H[0] = last;
        let i = 0;
        for (;;) {
          const l = 2 * i + 1,
            r = l + 1;
          let m = i;
          if (l < H.length && H[l][0] < H[m][0]) m = l;
          if (r < H.length && H[r][0] < H[m][0]) m = r;
          if (m === i) break;
          [H[m], H[i]] = [H[i], H[m]];
          i = m;
        }
      }
      return top;
    };
    const hx = c => {
      const i = c % G.nx,
        j = (c / G.nx) | 0;
      const dx = Math.abs(i - Bc[0]),
        dy = Math.abs(j - Bc[1]);
      return dx + dy + (Math.SQRT2 - 2) * Math.min(dx, dy);
    };
    g[start] = 0;
    push(hx(start), start);
    let found = false,
      it = 0;
    while (H.length && it++ < 60000) {
      const [, c] = pop();
      if (closed[c]) continue;
      if (c === goal) {
        found = true;
        break;
      }
      closed[c] = 1;
      const i = c % G.nx,
        j = (c / G.nx) | 0;
      for (let dj = -1; dj <= 1; dj++)
        for (let di = -1; di <= 1; di++) {
          if (!di && !dj) continue;
          const ni = i + di,
            nj = j + dj;
          if (!ok(G, ni, nj)) continue;
          if (di && dj && (!ok(G, i + di, j) || !ok(G, i, j + dj))) continue;
          const nc = nj * G.nx + ni,
            ng = g[c] + (di && dj ? Math.SQRT2 : 1);
          if (ng < g[nc]) {
            g[nc] = ng;
            from[nc] = c;
            push(ng + hx(nc), nc);
          }
        }
    }
    if (!found) return null;
    const cells = [];
    for (let c = goal; c >= 0; c = from[c]) {
      cells.push(c);
      if (c === start) break;
    }
    cells.reverse();
    const pts = cells.map(c => mid(G, c % G.nx, (c / G.nx) | 0));
    // the real end points where they are free
    if (frei(G, bx, by)) pts.push([bx, by]);
    const out = [[ax, ay]];
    let k = 0;
    while (k < pts.length - 1) {
      let m = pts.length - 1;
      const [cx, cy] = out[out.length - 1];
      while (m > k + 1 && !sicht(G, cx, cy, pts[m][0], pts[m][1])) m--;
      out.push(pts[m]);
      k = m;
    }
    if (out.length === 1 && pts.length) out.push(pts[pts.length - 1]);
    return out;
  }
  // places in front of shelves: for blocks of goods with a front (fx, fy), a free cell 0.55–0.9 m before it, facing the goods
  function regalPlaetze(G, goods, n = 40, seed = 1) {
    let s = seed >>> 0 || 1;
    const R = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296;
    const out = [],
      seen = new Set();
    const idx = goods.map((g, i) => i).filter(i => goods[i].front && goods[i].z < 1.7);
    for (let tries = 0; out.length < n && tries < n * 12 && idx.length; tries++) {
      const gi = idx[Math.floor(R() * idx.length)],
        gd = goods[gi];
      for (const d of [0.6, 0.75, 0.9]) {
        const x = gd.x + gd.fx * (gd.dep / 2 + d),
          y = gd.y + gd.fy * (gd.dep / 2 + d);
        if (!frei(G, x, y)) continue;
        const key = Math.round(x * 1.2) + ',' + Math.round(y * 1.2);
        if (seen.has(key)) break;
        seen.add(key);
        out.push({ x, y, hd: Math.atan2(-gd.fx, -gd.fy), gi, z: gd.z });
        break;
      }
    }
    return out;
  }
  return { andrang, besetzung, grid, pfad, frei, nahFrei, sicht, regalPlaetze, inPoly, MAXK };
})();
if (typeof window !== 'undefined') window.LLPLAN = LLPLAN;
