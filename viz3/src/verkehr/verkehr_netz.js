// ===================== feat/verkehr 2: the street network – who may go where, lanes, routes, speeds (VNETZ) =====================
// Pure geometry, no scene: tests in viz3/test/unit/verkehr.test.mjs. From the OSM ways of a place (world/roads.js ROADS.ways in Ratscher,
// the streets of welt/schleusingen.js in Schleusingen: { kind, w, p: [x0, y0, x1, y1, …] } in site metres, kinds as in GEOMAN.roads.kinds:
// 0 motorway, 1 main, 2 county, 3 street, 4 lane, 5 service, 6 track, 7 path, 8 foot) a graph is built: the ways cut to a circle around
// the place (where a way leaves the circle is an exit), split where they meet (an end of a way within a few metres of another way is a
// junction – OSM ways end at every crossing, and the ends do not always sit on a node of the other way). Routes are shortest in time.
// A route becomes a line to drive or walk: the centre line offset to one side (cars: the right-hand lane; walkers: the edge of the road
// on their left, facing the traffic), its corners rounded, resampled every metre, for cars with a speed limit per metre (the way's
// limit, the curve, braking ahead of both).
export const VNETZ = (() => {
  const hyp = Math.hypot;
  // ---- the graph ----
  // opt: { kinds: Set of kinds, clip: [cx, cy, r] (optional), snap (m, default 3.5) }
  function graph(ways, opt = {}) {
    const kinds = opt.kinds || null,
      snap = opt.snap || 3.5,
      clip = opt.clip || null;
    // 1. the lines: ways of the wanted kinds, cut to the circle (each run inside is a line; an end cut by the circle is an exit)
    const lines = [];
    for (const w of ways) {
      if (kinds && !kinds.has(w.kind)) continue;
      const p = w.p,
        n = p.length >> 1;
      if (n < 2) continue;
      let run = null;
      const inside = i => !clip || hyp(p[i * 2] - clip[0], p[i * 2 + 1] - clip[1]) <= clip[2];
      const cut = (i, j) => {
        // the point where the segment i → j crosses the circle
        const ax = p[i * 2],
          ay = p[i * 2 + 1],
          dx = p[j * 2] - ax,
          dy = p[j * 2 + 1] - ay,
          fx = ax - clip[0],
          fy = ay - clip[1],
          a = dx * dx + dy * dy,
          b = 2 * (fx * dx + fy * dy),
          c = fx * fx + fy * fy - clip[2] * clip[2],
          D = Math.max(0, b * b - 4 * a * c),
          t1 = (-b - Math.sqrt(D)) / (2 * a),
          t2 = (-b + Math.sqrt(D)) / (2 * a),
          t = t1 >= 0 && t1 <= 1 ? t1 : Math.min(1, Math.max(0, t2));
        return [ax + dx * t, ay + dy * t];
      };
      for (let i = 0; i < n; i++) {
        const inn = inside(i);
        if (inn) {
          if (!run) {
            run = { kind: w.kind, w: w.w || 4, pts: [], exit0: false, exit1: false };
            if (i > 0) {
              run.pts.push(cut(i - 1, i));
              run.exit0 = true;
            }
          }
          run.pts.push([p[i * 2], p[i * 2 + 1]]);
        } else if (run) {
          run.pts.push(cut(i - 1, i));
          run.exit1 = true;
          if (run.pts.length > 1) lines.push(run);
          run = null;
        }
      }
      if (run && run.pts.length > 1) lines.push(run);
    }
    // 2. a spatial hash of the vertices
    const CS = 8,
      H = new Map(),
      key = (x, y) => Math.floor(x / CS) + ',' + Math.floor(y / CS);
    const addV = (li, vi) => {
      const [x, y] = lines[li].pts[vi],
        k = key(x, y);
      let a = H.get(k);
      if (!a) H.set(k, (a = []));
      a.push([li, vi]);
    };
    const near = (x, y, r, fn) => {
      const i0 = Math.floor((x - r) / CS),
        i1 = Math.floor((x + r) / CS),
        j0 = Math.floor((y - r) / CS),
        j1 = Math.floor((y + r) / CS);
      for (let i = i0; i <= i1; i++) for (let j = j0; j <= j1; j++) for (const v of H.get(i + ',' + j) || []) fn(v);
    };
    // 3. an end of a line within snap of another line's segment (no vertex there): a vertex is put into that line
    const segNear = (li, x, y) => {
      let best = null;
      lines.forEach((L, lj) => {
        if (lj === li) return;
        const q = L.pts;
        for (let k = 0; k + 1 < q.length; k++) {
          const ax = q[k][0],
            ay = q[k][1],
            dx = q[k + 1][0] - ax,
            dy = q[k + 1][1] - ay,
            l2 = dx * dx + dy * dy;
          if (l2 < 1e-6) continue;
          const t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)),
            px = ax + dx * t,
            py = ay + dy * t,
            d = hyp(x - px, y - py);
          if (d < snap && (!best || d < best.d)) best = { lj, k, t, px, py, d };
        }
      });
      return best;
    };
    for (let li = 0; li < lines.length; li++)
      for (const end of [0, 1]) {
        const L = lines[li],
          e = end ? L.pts[L.pts.length - 1] : L.pts[0];
        const s = segNear(li, e[0], e[1]);
        if (!s) continue;
        const q = lines[s.lj].pts,
          a = q[s.k],
          b = q[s.k + 1];
        // a vertex of that line close enough already: nothing to insert
        if (hyp(a[0] - s.px, a[1] - s.py) < 1.0 || hyp(b[0] - s.px, b[1] - s.py) < 1.0) continue;
        q.splice(s.k + 1, 0, [s.px, s.py]);
      }
    lines.forEach((L, li) => L.pts.forEach((_, vi) => addV(li, vi)));
    // 4. union of vertices that are one place: an end and any vertex of another line within snap, and vertices of two lines within 0.6 m
    const id = new Map(),
      par = [],
      vid = (li, vi) => {
        const k = li * 100000 + vi;
        let v = id.get(k);
        if (v === undefined) {
          v = par.length;
          par.push(v);
          id.set(k, v);
        }
        return v;
      },
      find = a => {
        while (par[a] !== a) a = par[a] = par[par[a]];
        return a;
      },
      join = (a, b) => {
        a = find(a);
        b = find(b);
        if (a !== b) par[b] = a;
      };
    const isNode = new Set();
    lines.forEach((L, li) => {
      const m = L.pts.length;
      L.pts.forEach(([x, y], vi) => {
        const end = vi === 0 || vi === m - 1;
        near(x, y, end ? snap : 0.6, ([lj, vj]) => {
          if (lj === li) return;
          const [qx, qy] = lines[lj].pts[vj],
            d = hyp(qx - x, qy - y),
            oend = vj === 0 || vj === lines[lj].pts.length - 1;
          if (d < 0.6 || (end && d < snap) || (oend && d < snap)) {
            join(vid(li, vi), vid(lj, vj));
            isNode.add(li * 100000 + vi);
            isNode.add(lj * 100000 + vj);
          }
        });
        if (end) isNode.add(li * 100000 + vi);
      });
    });
    // 5. nodes (one per union) and edges (the lines split at their nodes)
    const nodes = [],
      byRoot = new Map(),
      edges = [];
    const nodeOf = (li, vi) => {
      const r = find(vid(li, vi));
      let n = byRoot.get(r);
      if (n === undefined) {
        n = nodes.length;
        byRoot.set(r, n);
        nodes.push({ x: 0, y: 0, c: 0, edges: [], exit: false });
      }
      const N = nodes[n],
        [x, y] = lines[li].pts[vi];
      N.x = (N.x * N.c + x) / (N.c + 1);
      N.y = (N.y * N.c + y) / (N.c + 1);
      N.c++;
      return n;
    };
    lines.forEach((L, li) => {
      let a = nodeOf(li, 0),
        pts = [L.pts[0]];
      if (L.exit0) nodes[a].exit = true;
      for (let vi = 1; vi < L.pts.length; vi++) {
        pts.push(L.pts[vi]);
        if (!isNode.has(li * 100000 + vi)) continue;
        const b = nodeOf(li, vi);
        let len = 0;
        for (let k = 1; k < pts.length; k++) len += hyp(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
        if (a !== b && len > 0.3) {
          const e = { i: edges.length, a, b, pts, len, kind: L.kind, w: L.w };
          edges.push(e);
          nodes[a].edges.push(e);
          nodes[b].edges.push(e);
        }
        a = b;
        pts = [L.pts[vi]];
      }
      if (L.exit1) nodes[a].exit = true;
    });
    // the first and last point of an edge on its node (the union's middle): the lines join without gaps
    for (const e of edges) {
      e.pts = e.pts.map(q => q.slice());
      e.pts[0] = [nodes[e.a].x, nodes[e.a].y];
      e.pts[e.pts.length - 1] = [nodes[e.b].x, nodes[e.b].y];
    }
    return { nodes, edges };
  }
  // ---- routes: Dijkstra; cost(e) per metre (default 1); returns [{ e, fwd }] or null ----
  function route(G, from, to, cost) {
    const N = G.nodes.length,
      dist = new Float64Array(N).fill(Infinity),
      prev = new Array(N).fill(null),
      done = new Uint8Array(N);
    dist[from] = 0;
    // a small binary heap
    const hp = [[0, from]];
    const push = it => {
      hp.push(it);
      let i = hp.length - 1;
      while (i > 0) {
        const j = (i - 1) >> 1;
        if (hp[j][0] <= hp[i][0]) break;
        [hp[i], hp[j]] = [hp[j], hp[i]];
        i = j;
      }
    };
    const pop = () => {
      const top = hp[0],
        last = hp.pop();
      if (hp.length) {
        hp[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1,
            r = l + 1;
          let m = i;
          if (l < hp.length && hp[l][0] < hp[m][0]) m = l;
          if (r < hp.length && hp[r][0] < hp[m][0]) m = r;
          if (m === i) break;
          [hp[i], hp[m]] = [hp[m], hp[i]];
          i = m;
        }
      }
      return top;
    };
    while (hp.length) {
      const [d, u] = pop();
      if (done[u]) continue;
      done[u] = 1;
      if (u === to) break;
      for (const e of G.nodes[u].edges) {
        const v = e.a === u ? e.b : e.a,
          c = cost ? cost(e, e.a === u) : e.len;
        if (!(c < Infinity)) continue;
        const nd = d + c;
        if (nd < dist[v]) {
          dist[v] = nd;
          prev[v] = { e, u };
          push([nd, v]);
        }
      }
    }
    if (!(dist[to] < Infinity)) return null;
    const out = [];
    for (let v = to; v !== from;) {
      const p = prev[v];
      out.push({ e: p.e, fwd: p.e.a === p.u });
      v = p.u;
    }
    return out.reverse();
  }
  // all costs from one node (for picking far destinations)
  function reach(G, from, cost) {
    const N = G.nodes.length,
      dist = new Float64Array(N).fill(Infinity);
    dist[from] = 0;
    const open = [from];
    while (open.length) {
      // small graphs (a few hundred nodes): a plain scan is enough
      let bi = 0;
      for (let i = 1; i < open.length; i++) if (dist[open[i]] < dist[open[bi]]) bi = i;
      const u = open.splice(bi, 1)[0];
      for (const e of G.nodes[u].edges) {
        const v = e.a === u ? e.b : e.a,
          c = cost ? cost(e, e.a === u) : e.len;
        if (!(c < Infinity)) continue;
        if (dist[u] + c < dist[v]) {
          if (dist[v] === Infinity) open.push(v);
          dist[v] = dist[u] + c;
        }
      }
    }
    return dist;
  }
  // ---- a route as a line: the centre points with a side offset and an attribute per point ----
  // off(e, fwd) → signed offset (m, + right of the direction of travel); val(e, fwd) → a number per point (the speed limit)
  function centre(path, off, val) {
    const P = [];
    for (const { e, fwd } of path) {
      const q = fwd ? e.pts : e.pts.slice().reverse(),
        o = off(e, fwd),
        v = val ? val(e, fwd) : 0;
      for (let k = 0; k < q.length; k++) {
        const last = P[P.length - 1];
        if (last && hyp(last.x - q[k][0], last.y - q[k][1]) < 0.05) {
          last.o = Math.abs(o) < Math.abs(last.o) ? o : last.o; // a junction: the narrower lane
          last.v = Math.min(last.v, v);
          continue;
        }
        P.push({ x: q[k][0], y: q[k][1], o, v });
      }
    }
    return P;
  }
  // offset each point to the side by its own amount (miter at the corners, at most twice the offset)
  function offset(P) {
    const n = P.length,
      out = [];
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)],
        b = P[i],
        c = P[Math.min(n - 1, i + 1)];
      let d1x = b.x - a.x,
        d1y = b.y - a.y,
        d2x = c.x - b.x,
        d2y = c.y - b.y;
      const l1 = hyp(d1x, d1y),
        l2 = hyp(d2x, d2y);
      if (l1 < 1e-6) {
        d1x = d2x;
        d1y = d2y;
      }
      if (l2 < 1e-6) {
        d2x = d1x;
        d2y = d1y;
      }
      const L1 = hyp(d1x, d1y) || 1,
        L2 = hyp(d2x, d2y) || 1;
      // right normals of both segments, their mean; the miter length 1 / cos(half the turn)
      const r1x = d1y / L1,
        r1y = -d1x / L1,
        r2x = d2y / L2,
        r2y = -d2x / L2;
      let mx = r1x + r2x,
        my = r1y + r2y;
      const ml = hyp(mx, my);
      if (ml < 1e-3) {
        mx = r2x;
        my = r2y;
      } else {
        const cosH = ml / 2,
          k = Math.min(2, 1 / Math.max(0.5, cosH)) / ml;
        mx *= k;
        my *= k;
      }
      out.push({ x: b.x + mx * b.o, y: b.y + my * b.o, v: b.v });
    }
    return out;
  }
  // round the corners: each corner becomes a quadratic curve that starts and ends at most cut metres away (and before half of a segment)
  function fillet(P, cut) {
    if (P.length < 3) return P.slice();
    const out = [P[0]];
    for (let i = 1; i + 1 < P.length; i++) {
      const a = P[i - 1],
        b = P[i],
        c = P[i + 1],
        l1 = hyp(b.x - a.x, b.y - a.y),
        l2 = hyp(c.x - b.x, c.y - b.y);
      if (l1 < 1e-6 || l2 < 1e-6) continue;
      const u1x = (b.x - a.x) / l1,
        u1y = (b.y - a.y) / l1,
        u2x = (c.x - b.x) / l2,
        u2y = (c.y - b.y) / l2,
        turn = Math.acos(Math.max(-1, Math.min(1, u1x * u2x + u1y * u2y)));
      if (turn < 0.03) {
        out.push(b);
        continue;
      }
      const d = Math.min(cut, l1 * 0.45, l2 * 0.45),
        s = { x: b.x - u1x * d, y: b.y - u1y * d },
        e = { x: b.x + u2x * d, y: b.y + u2y * d },
        m = Math.max(2, Math.ceil(turn / 0.12));
      for (let k = 0; k <= m; k++) {
        const t = k / m,
          w0 = (1 - t) * (1 - t),
          w1 = 2 * t * (1 - t),
          w2 = t * t;
        out.push({ x: w0 * s.x + w1 * b.x + w2 * e.x, y: w0 * s.y + w1 * b.y + w2 * e.y, v: b.v });
      }
    }
    out.push(P[P.length - 1]);
    return out;
  }
  // resample every step metres: X, Y, V (attribute), L (length), n
  function resample(P, step = 1) {
    const X = [],
      Y = [],
      V = [];
    let acc = 0,
      next = 0;
    X.push(P[0].x);
    Y.push(P[0].y);
    V.push(P[0].v);
    next = step;
    for (let i = 1; i < P.length; i++) {
      const a = P[i - 1],
        b = P[i],
        l = hyp(b.x - a.x, b.y - a.y);
      while (acc + l >= next && l > 1e-9) {
        const t = (next - acc) / l;
        X.push(a.x + (b.x - a.x) * t);
        Y.push(a.y + (b.y - a.y) * t);
        V.push(Math.min(a.v ?? 0, b.v ?? 0));
        next += step;
      }
      acc += l;
    }
    const last = P[P.length - 1];
    if (hyp(last.x - X[X.length - 1], last.y - Y[Y.length - 1]) > 0.05) {
      X.push(last.x);
      Y.push(last.y);
      V.push(last.v);
    }
    // a light smoothing (±2 points) against kinks between the rounded corners; the ends stay
    const n = X.length,
      SX = X.slice(),
      SY = Y.slice();
    for (let i = 2; i < n - 2; i++) {
      SX[i] = (X[i - 2] + X[i - 1] + X[i] + X[i + 1] + X[i + 2]) / 5;
      SY[i] = (Y[i - 2] + Y[i - 1] + Y[i] + Y[i + 1] + Y[i + 2]) / 5;
    }
    return { X: Float32Array.from(SX), Y: Float32Array.from(SY), V: Float32Array.from(V), n, step, L: (n - 1) * step };
  }
  // the speed limit per metre: the way's own (V), the curve (lateral acceleration aLat), braking (aBrk) ahead of each limit;
  // vEnd: the speed at the end (0: it stops there)
  function speeds(R, aLat = 2.2, aBrk = 2.2, vMin = 2.5, vEnd = null) {
    const n = R.n,
      V = R.V,
      out = new Float32Array(n),
      st = R.step;
    for (let i = 0; i < n; i++) {
      const a = Math.max(0, i - 3),
        c = Math.min(n - 1, i + 3);
      let lim = V[i] || 8;
      if (c - a >= 4) {
        const h1 = Math.atan2(R.X[i] - R.X[a], R.Y[i] - R.Y[a]),
          h2 = Math.atan2(R.X[c] - R.X[i], R.Y[c] - R.Y[i]);
        let d = h2 - h1;
        while (d > Math.PI) d -= 2 * Math.PI;
        while (d < -Math.PI) d += 2 * Math.PI;
        const k = Math.abs(d) / Math.max(1, ((c - a) / 2) * st);
        if (k > 1e-4) lim = Math.min(lim, Math.max(vMin, Math.sqrt(aLat / k)));
      }
      out[i] = lim;
    }
    if (vEnd !== null) out[n - 1] = Math.min(out[n - 1], vEnd);
    for (let i = n - 2; i >= 0; i--) out[i] = Math.min(out[i], Math.sqrt(out[i + 1] * out[i + 1] + 2 * aBrk * st));
    return out;
  }
  // a whole line from a route: offset by side, corners rounded (cut m), resampled every metre, speeds (cars)
  function line(path, o) {
    const C = centre(path, o.off, o.vmax);
    if (C.length < 2) return null;
    const R = resample(fillet(offset(C), o.cut || 4), 1);
    if (o.vmax) R.S = speeds(R, o.aLat, o.aBrk, o.vMin, o.vEnd ?? null);
    return R;
  }
  // position and heading (compass rad, 0 = north) at s along a line
  function at(R, s, out = {}) {
    const f = Math.max(0, Math.min(R.L, s)) / R.step,
      i = Math.min(R.n - 2, Math.floor(f)),
      t = f - i,
      dx = R.X[i + 1] - R.X[i],
      dy = R.Y[i + 1] - R.Y[i];
    out.x = R.X[i] + dx * t;
    out.y = R.Y[i] + dy * t;
    out.hd = Math.atan2(dx, dy);
    out.i = i;
    return out;
  }
  // the nearest point of the line to (x, y) between s0 and s1: { s, d (distance), lat (+ right of the direction) }
  function project(R, x, y, s0 = 0, s1 = Infinity) {
    const i0 = Math.max(0, Math.floor(s0 / R.step)),
      i1 = Math.min(R.n - 2, Math.ceil(Math.min(s1, R.L) / R.step));
    let best = null;
    for (let i = i0; i <= i1; i++) {
      const ax = R.X[i],
        ay = R.Y[i],
        dx = R.X[i + 1] - ax,
        dy = R.Y[i + 1] - ay,
        l2 = dx * dx + dy * dy || 1e-9,
        t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)),
        px = ax + dx * t,
        py = ay + dy * t,
        d = hyp(x - px, y - py);
      if (!best || d < best.d) {
        const l = Math.sqrt(l2);
        best = { s: (i + t) * R.step, d, lat: ((x - ax) * dy - (y - ay) * dx) / l };
      }
    }
    return best;
  }
  return { graph, route, reach, centre, offset, fillet, resample, speeds, line, at, project };
})();
