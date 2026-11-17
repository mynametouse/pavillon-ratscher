// ===================== feat/gebaeude 1: is every building plausible from outside? – pure (FAUDIT) =====================
// Falko (17.11.2026 13:27): „ein Haus ohne Tür macht keinen Sinn … die Hofeingänge, die teilweise durch Tunnel eben funktionieren … der
// Innenhof ist einfach nicht betretbar … große Gebäude komplett ohne Fenster“. Pure logic on plain records (no three.js, no DOM – node tests:
// viz3/test/unit/fassade.test.mjs), so the same tools serve Ratscher, Schleusingen and later Suhl's Aue:
// - windows(): the windows a facade gets, exactly as the facade shader of world/village.js paints them (bays, storeys, the top line, the
//   door's bay, the barns' gaps) – so the audit counts what one sees;
// - cover(): which parts of a facade stand against a neighbour (a party wall is blank where it is covered, not along its whole length);
// - hoefe(): open spaces enclosed by footprints (gaps under ~1 m closed), with the buildings round them – the yards one cannot walk into;
// - tor(): the most plausible gateway into such a yard (through the building between the yard and a street, the shortest way, a house
//   rather than a landmark), passLine(): a passage along a mapped line (OSM tunnel=building_passage, a footway through a building);
// - hofTuer(): a door for a building without a street door (on the side with room in front, a yard or a garden);
// - audit(): what is still implausible – [{ id, ort, art: 'tuer' | 'fenster' | 'durchgang' | 'hof', x, y, text, rest? }] (rest: why it may
//   stay, e.g. a light well that needs no door).
// A record: { id, ort, kind: 'haus' | 'scheune' | 'halle' | 'schuppen' | 'kirche' | 'wahrzeichen', f: [x, y, …] footprint (outer ring),
// h: [[x, y, …]] inner rings, cx, cy, area, eave, ext (its door is drawn elsewhere: a portal, a real opening), fac: [facade pieces as drawn:
// { ax, ay, bx, by, L, nx, ny (outward), LF (length as the shader gets it – 0.5 on a party wall), t0, tA, uA, t1 (top line), gable, du, dw
// (door: u and width along the piece, dw 0 = none), st (style code of world/village.js), sp, raised, eave, bid (the hash id), extra
// (windows drawn by other means) }] } – a piece starts at (ax, ay); a wall drawn in parts (a party wall with open runs) gives several.
export const FAUDIT = (() => {
  const hh = n => {
    const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const ST = {
    PLASTER: 0,
    MODERN: 1,
    SLATE: 2,
    SLATE_UP: 3,
    SLATE_GABLE: 4,
    FW: 5,
    FW_UP: 6,
    BARN: 7,
    BARN_FULL: 8,
    BRICK: 9,
  };
  Object.assign(ST, { HALL: 10, SHED: 11, SCHOOL: 12 });
  // ---- small geometry ----
  function inRing(f, x, y) {
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
  // inside the footprint (outer ring, not in an inner ring – a courtyard)
  function inside(r, x, y) {
    if (x < r.bb[0] || x > r.bb[2] || y < r.bb[1] || y > r.bb[3] || !inRing(r.f, x, y)) return false;
    for (const h of r.h || []) if (inRing(h, x, y)) return false;
    return true;
  }
  function area(f) {
    let a = 0;
    for (let i = 0; i < f.length; i += 2) {
      const j = (i + 2) % f.length;
      a += f[i] * f[j + 1] - f[j] * f[i + 1];
    }
    return a / 2;
  }
  function bbOf(f) {
    const b = [1e9, 1e9, -1e9, -1e9];
    for (let k = 0; k < f.length; k += 2) {
      b[0] = Math.min(b[0], f[k]);
      b[1] = Math.min(b[1], f[k + 1]);
      b[2] = Math.max(b[2], f[k]);
      b[3] = Math.max(b[3], f[k + 1]);
    }
    return b;
  }
  // fills the derived fields of a record (bounding box, centre, area) once
  function prep(r) {
    if (!r.bb) r.bb = bbOf(r.f);
    if (r.cx === undefined) {
      let cx = 0,
        cy = 0;
      const n = r.f.length / 2;
      for (let k = 0; k < r.f.length; k += 2) {
        cx += r.f[k] / n;
        cy += r.f[k + 1] / n;
      }
      r.cx = cx;
      r.cy = cy;
    }
    if (r.area === undefined) r.area = Math.abs(area(r.f)) - (r.h || []).reduce((s, h) => s + Math.abs(area(h)), 0);
    return r;
  }
  // ---- a grid over the footprints: who stands at a point ----
  function index(recs, cs = 16) {
    const G = new Map(),
      key = (i, j) => i * 100003 + j;
    for (const r of recs) {
      prep(r);
      const b = r.bb;
      for (let i = Math.floor(b[0] / cs); i <= Math.floor(b[2] / cs); i++)
        for (let j = Math.floor(b[1] / cs); j <= Math.floor(b[3] / cs); j++) {
          const k = key(i, j);
          let a = G.get(k);
          if (!a) G.set(k, (a = []));
          a.push(r);
        }
    }
    return {
      recs,
      at(x, y, skip) {
        const a = G.get(key(Math.floor(x / cs), Math.floor(y / cs)));
        if (a) for (const r of a) if (r !== skip && inside(r, x, y)) return r;
        return null;
      },
      near(x, y, d) {
        const out = new Set();
        for (let i = Math.floor((x - d) / cs); i <= Math.floor((x + d) / cs); i++)
          for (let j = Math.floor((y - d) / cs); j <= Math.floor((y + d) / cs); j++) {
            const a = G.get(key(i, j));
            if (a) for (const r of a) out.add(r);
          }
        return [...out];
      },
    };
  }
  // ---- the windows of one facade piece as the facade shader paints them (world/village.js wallMat, same rules and constants) ----
  function windows(p) {
    const st = p.st,
      school = st === 12,
      house = st < 6.5 || school || st > 12.5,
      barn = st > 6.5 && st < 9.5,
      hall = st === 10,
      shed = st === 11,
      LF = p.LF,
      sp = p.sp || 3,
      eave = p.eave,
      plH = house ? (p.raised ? 0.6 : 0.35) : 0;
    let stH = school ? 3.4 : 2.75,
      ww = school ? 1.0 : st === 1 ? 1.25 : 0.95,
      wh0 = school ? 1.5 : st === 1 ? 1.4 : 1.3,
      sill0 = school ? 0.95 : 0.85;
    if (barn) [ww, wh0, sill0, stH] = [0.75, 0.6, 1.6, 99];
    if (hall) [ww, wh0, sill0, stH] = [sp * 0.7, 0.8, 3.2, 99];
    if (shed) [ww, wh0, sill0, stH] = [0.6, 0.5, 1.4, 99];
    let nb = Math.max(1, Math.floor((LF - 0.6) / sp));
    const bw = LF / nb;
    if (LF < ww + 0.7) nb = 0;
    const out = [];
    if (!nb) return out;
    const uA = p.gable ? p.uA : LF / 2,
      tA = p.gable ? p.tA : (p.t0 + p.t1) / 2,
      topAt = u =>
        u < uA
          ? p.t0 + (tA - p.t0) * Math.min(1, Math.max(0, u / Math.max(uA, 0.01)))
          : tA + (p.t1 - tA) * Math.min(1, Math.max(0, (u - uA) / Math.max(LF - uA, 0.01))),
      top = Math.max(p.t0, p.t1, tA);
    for (let fi = 0; fi < 8; fi++) {
      const fb = plH + fi * stH;
      if (fb > top) break;
      for (let bi = 0; bi < nb; bi++) {
        const bc = (bi + 0.5) * bw;
        let sill = sill0,
          wh = wh0;
        if (fi === 0 && house) {
          const fit = eave - 0.25 - fb - sill;
          if (fit < wh && fit > 0.75) wh = fit;
          else if (fit <= 0.75) {
            sill = Math.max(0.5, eave - 0.25 - fb - 0.9);
            wh = 0.9;
          }
        }
        let lo = [bc - ww / 2, fb + sill],
          hi = [bc + ww / 2, fb + sill + wh];
        const attic = fb + sill > eave - 0.2;
        if (attic) {
          lo = [bc - 0.4, lo[1]];
          hi = [bc + 0.4, lo[1] + 1.0];
        }
        const room = Math.min(topAt(lo[0]), topAt(hi[0])) - hi[1];
        if (!(room > (attic ? 0.4 : 0.18) && (!attic || p.gable))) continue;
        if ((barn || shed) && hh(p.bid * 3.1 + bi * 1.7) < 0.45) continue;
        if (p.dw > 0 && Math.abs(bc - p.du) < Math.max(bw * 0.5, p.dw * 0.5 + ww * 0.5 + 0.1) && fi < 1) continue;
        out.push({ u0: lo[0], u1: hi[0], z0: lo[1], z1: hi[1], fi });
      }
    }
    return out;
  }
  // ---- which parts of a wall stand against a neighbour: samples every `step` metres, `out` metres outside the wall ----
  function cover(r, w, idx, step = 0.5, out = 0.4) {
    const L = Math.hypot(w.bx - w.ax, w.by - w.ay);
    if (L < 0.05) return { L, spans: [], covered: 0 };
    const dx = (w.bx - w.ax) / L,
      dy = (w.by - w.ay) / L,
      nx = w.nx !== undefined ? w.nx : dy,
      ny = w.ny !== undefined ? w.ny : -dx,
      n = Math.max(2, Math.round(L / step)),
      hit = [];
    for (let s = 0; s < n; s++) {
      const u = ((s + 0.5) / n) * L;
      hit.push(!!idx.at(w.ax + dx * u + nx * out, w.ay + dy * u + ny * out, r));
    }
    // covered runs as [u0, u1]
    const spans = [];
    let covered = 0;
    for (let s = 0; s < n; s++) {
      if (!hit[s]) continue;
      let e = s;
      while (e + 1 < n && hit[e + 1]) e++;
      spans.push([(s / n) * L, ((e + 1) / n) * L]);
      covered += ((e + 1 - s) / n) * L;
      s = e;
    }
    return { L, spans, covered };
  }
  // the open runs of [0, L] between covered spans
  function openRuns(L, spans) {
    const out = [];
    let u = 0;
    for (const [a, b] of spans) {
      if (a > u) out.push([u, a]);
      u = Math.max(u, b);
    }
    if (u < L) out.push([u, L]);
    return out;
  }
  // ---- yards: open space enclosed by footprints (gaps up to ~1 m closed: no one passes), per cluster of buildings ----
  // opts: cell (m), close (cells of dilation), min (m² – smaller pockets are ignored). Returns [{ k, area, cx, cy, bb, around: [recs],
  // cells: [x, y, …] (centres, for painting), hull: [x, y, …] }] and, for each, at(x, y) → whether a point lies in it.
  function hoefe(recs, opts = {}) {
    const cell = opts.cell || 0.5,
      close = opts.close === undefined ? 1 : opts.close,
      minA = opts.min || 12;
    for (const r of recs) prep(r);
    // clusters: footprints whose boxes come within 1.2 m of each other (union-find)
    const par = recs.map((r, i) => i),
      find = i => (par[i] === i ? i : (par[i] = find(par[i]))),
      gs = 24,
      G = new Map();
    recs.forEach((r, i) => {
      const b = r.bb;
      for (let x = Math.floor((b[0] - 1.2) / gs); x <= Math.floor((b[2] + 1.2) / gs); x++)
        for (let y = Math.floor((b[1] - 1.2) / gs); y <= Math.floor((b[3] + 1.2) / gs); y++) {
          const k = x * 100003 + y;
          let a = G.get(k);
          if (!a) G.set(k, (a = []));
          for (const j of a) {
            const c = recs[j].bb;
            if (b[0] - 1.2 < c[2] && c[0] - 1.2 < b[2] && b[1] - 1.2 < c[3] && c[1] - 1.2 < b[3])
              par[find(i)] = find(j);
          }
          a.push(i);
        }
    });
    const CL = new Map();
    recs.forEach((r, i) => {
      const k = find(i);
      if (!CL.has(k)) CL.set(k, []);
      CL.get(k).push(r);
    });
    const yards = [];
    // one set of buffers for all clusters (a typed array per cluster would be garbage for the collector)
    let cap = 0,
      OWN = null,
      BLK = null,
      LAB = null,
      QQ = null;
    for (const list of CL.values()) {
      if (list.length < 2 && !(list[0].h && list[0].h.length)) continue;
      const bb = [1e9, 1e9, -1e9, -1e9];
      for (const r of list) {
        bb[0] = Math.min(bb[0], r.bb[0]);
        bb[1] = Math.min(bb[1], r.bb[1]);
        bb[2] = Math.max(bb[2], r.bb[2]);
        bb[3] = Math.max(bb[3], r.bb[3]);
      }
      const x0 = bb[0] - 3 * cell,
        y0 = bb[1] - 3 * cell,
        W = Math.ceil((bb[2] - bb[0]) / cell) + 6,
        H = Math.ceil((bb[3] - bb[1]) / cell) + 6;
      if (W * H > 4e6) continue; // a cluster too big to raster (never in a town block)
      if (W * H > cap) {
        cap = Math.max(W * H, cap * 2, 65536);
        OWN = new Int32Array(cap);
        BLK = new Int32Array(cap);
        LAB = new Int32Array(cap);
        QQ = new Int32Array(cap);
      }
      const own = OWN.subarray(0, W * H).fill(-1);
      // scanline per footprint (even-odd over all its rings: courtyards stay open)
      list.forEach((r, li) => {
        const rings = [r.f].concat(r.h || []),
          j0 = Math.max(0, Math.floor((r.bb[1] - y0) / cell)),
          j1 = Math.min(H - 1, Math.ceil((r.bb[3] - y0) / cell));
        for (let j = j0; j <= j1; j++) {
          const y = y0 + (j + 0.5) * cell,
            xs = [];
          for (const f of rings)
            for (let p = 0, q = f.length - 2; p < f.length; q = p, p += 2) {
              const yi = f[p + 1],
                yj = f[q + 1];
              if (yi > y !== yj > y) xs.push(f[p] + ((f[q] - f[p]) * (y - yi)) / (yj - yi));
            }
          xs.sort((a, b) => a - b);
          for (let k = 0; k + 1 < xs.length; k += 2) {
            const i0 = Math.max(0, Math.ceil((xs[k] - x0) / cell - 0.5)),
              i1 = Math.min(W - 1, Math.floor((xs[k + 1] - x0) / cell - 0.5));
            for (let i = i0; i <= i1; i++) own[j * W + i] = li;
          }
        }
      });
      // close the narrow gaps: dilate the blocked cells (the owner spreads)
      let blk = own,
        tmp = BLK.subarray(0, W * H);
      for (let c = 0; c < close; c++) {
        tmp.set(blk);
        for (let j = 1; j < H - 1; j++)
          for (let i = 1, k = j * W + 1; i < W - 1; i++, k++) {
            if (blk[k] >= 0) continue;
            const o =
              blk[k - 1] >= 0 ? blk[k - 1] : blk[k + 1] >= 0 ? blk[k + 1] : blk[k - W] >= 0 ? blk[k - W] : blk[k + W];
            if (o >= 0) tmp[k] = o;
          }
        [blk, tmp] = [tmp, blk];
      }
      // flood the outside from the border
      const lab = LAB.subarray(0, W * H).fill(0),
        Q = QQ.subarray(0, W * H);
      let qh = 0,
        qt = 0;
      const push = k => {
        if (blk[k] < 0 && lab[k] === 0) {
          lab[k] = -1;
          Q[qt++] = k;
        }
      };
      for (let i = 0; i < W; i++) {
        push(i);
        push((H - 1) * W + i);
      }
      for (let j = 0; j < H; j++) {
        push(j * W);
        push(j * W + W - 1);
      }
      const step = (n, mark) => {
        if (blk[n] < 0 && lab[n] === 0) {
          lab[n] = mark;
          Q[qt++] = n;
        }
      };
      const flood = mark => {
        while (qh < qt) {
          const k = Q[qh++],
            i = k % W;
          if (i > 0) step(k - 1, mark);
          if (i < W - 1) step(k + 1, mark);
          if (k >= W) step(k - W, mark);
          if (k < W * (H - 1)) step(k + W, mark);
        }
      };
      flood(-1);
      // what is left open: the enclosed pockets, each a yard
      const first = yards.length;
      for (let k0 = 0; k0 < W * H; k0++) {
        if (blk[k0] >= 0 || lab[k0] !== 0) continue;
        const id = yards.length + 1;
        qh = qt = 0;
        lab[k0] = id;
        Q[qt++] = k0;
        flood(id);
        // grow back over the cells only the dilation closed (the yard reaches the walls)
        for (let c = 0, q0 = 0; c < close; c++) {
          const q1 = qt;
          for (let q = q0; q < q1; q++) {
            const k = Q[q];
            for (const m of [k - 1, k + 1, k - W, k + W])
              if (own[m] < 0 && lab[m] === 0) {
                lab[m] = id;
                Q[qt++] = m;
              }
          }
          q0 = q1;
        }
        const n = qt;
        if (n * cell * cell < minA) continue;
        let sx = 0,
          sy = 0;
        const around = new Set(),
          pts = [],
          yb = [1e9, 1e9, -1e9, -1e9];
        for (let q = 0; q < n; q++) {
          const k = Q[q],
            i = k % W,
            j = (k - i) / W,
            x = x0 + (i + 0.5) * cell,
            y = y0 + (j + 0.5) * cell;
          sx += x;
          sy += y;
          pts.push(x, y);
          yb[0] = Math.min(yb[0], x);
          yb[1] = Math.min(yb[1], y);
          yb[2] = Math.max(yb[2], x);
          yb[3] = Math.max(yb[3], y);
          if (blk[k - 1] >= 0) around.add(list[blk[k - 1]]);
          if (blk[k + 1] >= 0) around.add(list[blk[k + 1]]);
          if (blk[k - W] >= 0) around.add(list[blk[k - W]]);
          if (blk[k + W] >= 0) around.add(list[blk[k + W]]);
        }
        yards.push({
          k: id,
          area: n * cell * cell,
          cx: sx / n,
          cy: sy / n,
          bb: yb,
          around: [...around],
          cells: pts,
          hull: hull(pts, cell / 2),
          id,
        });
      }
      if (yards.length > first) {
        // the labels of this cluster kept for the yards' point test (the buffers go on to the next cluster)
        const LK = lab.slice();
        for (let q = first; q < yards.length; q++) {
          const id = yards[q].id;
          yards[q].at = (x, y) => {
            const i = Math.floor((x - x0) / cell),
              j = Math.floor((y - y0) / cell);
            return i >= 0 && j >= 0 && i < W && j < H && LK[j * W + i] === id;
          };
        }
      }
    }
    return yards;
  }
  // convex hull of points [x, y, …], grown by g (for a pad under a yard)
  function hull(pts, g = 0) {
    const P = [];
    for (let k = 0; k < pts.length; k += 2) P.push([pts[k], pts[k + 1]]);
    P.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    if (P.length < 3) return pts.slice();
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]),
      lo = [],
      up = [];
    for (const p of P) {
      while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop();
      lo.push(p);
    }
    for (let i = P.length - 1; i >= 0; i--) {
      const p = P[i];
      while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop();
      up.push(p);
    }
    const H = lo.slice(0, -1).concat(up.slice(0, -1));
    let cx = 0,
      cy = 0;
    for (const p of H) {
      cx += p[0] / H.length;
      cy += p[1] / H.length;
    }
    const out = [];
    for (const p of H) {
      const d = Math.hypot(p[0] - cx, p[1] - cy) || 1;
      out.push(p[0] + ((p[0] - cx) / d) * g, p[1] + ((p[1] - cy) / d) * g);
    }
    return out;
  }
  // ---- the walls of a record: its rings as segments a → b with the outward normal (outer ring CCW or CW, inner rings the other way) ----
  function walls(r) {
    const out = [];
    const ring = (f, outer) => {
      const s = area(f) > 0 ? 1 : -1;
      for (let k = 0; k < f.length; k += 2) {
        const j = (k + 2) % f.length,
          ax = f[k],
          ay = f[k + 1],
          bx = f[j],
          by = f[j + 1],
          L = Math.hypot(bx - ax, by - ay);
        if (L < 0.05) continue;
        const dx = (bx - ax) / L,
          dy = (by - ay) / L,
          g = outer ? s : -s;
        out.push({ ax, ay, bx, by, L, dx, dy, nx: dy * g, ny: -dx * g });
      }
    };
    ring(r.f, true);
    for (const h of r.h || []) ring(h, false);
    return out;
  }
  // the first wall a ray (x, y) + t·(dx, dy), t > t0, meets: { t, w (wall), u (along the wall) } or null
  function rayHit(ws, x, y, dx, dy, t0 = 0.05) {
    let best = null;
    for (const w of ws) {
      const ex = w.bx - w.ax,
        ey = w.by - w.ay,
        den = dx * ey - dy * ex;
      if (Math.abs(den) < 1e-9) continue;
      const t = ((w.ax - x) * ey - (w.ay - y) * ex) / den,
        s = ((w.ax - x) * dy - (w.ay - y) * dx) / den;
      if (t > t0 && s >= 0 && s <= 1 && (!best || t < best.t)) best = { t, w, u: s * w.L };
    }
    return best;
  }
  // a straight passage through r from point A on wall wA (the street side) to the wall it meets inward; the corridor of width w must
  // stay inside the footprint; null if not. → { A, B, wA, wB, uA, uB, d: [dx, dy], depth, w, h }
  function corridor(r, ws, wA, uA, w, dir) {
    const ax = wA.ax + wA.dx * uA,
      ay = wA.ay + wA.dy * uA,
      dx = dir ? dir[0] : -wA.nx,
      dy = dir ? dir[1] : -wA.ny,
      hit = rayHit(ws, ax, ay, dx, dy);
    if (!hit || hit.t < 1.5 || hit.t > 24) return null;
    const ex = -dy,
      ey = dx;
    // both side lines inside the footprint all the way (a little inside of both walls)
    for (const s of [-0.5, 0.5])
      for (let q = 1; q < 8; q++) {
        const t = 0.3 + ((hit.t - 0.6) * q) / 8,
          x = ax + dx * t + ex * w * s,
          y = ay + dy * t + ey * w * s;
        if (!inside(r, x, y)) return null;
      }
    // both ends of each side line on the two walls (no corner in between)
    for (const s of [-0.5, 0.5]) {
      const x = ax + ex * w * s + dx * 0.3,
        y = ay + ey * w * s + dy * 0.3,
        h2 = rayHit(ws, x, y, dx, dy, 0.05);
      if (!h2 || h2.w !== hit.w) return null;
    }
    const cosA = Math.abs(dx * wA.nx + dy * wA.ny),
      cosB = Math.abs(dx * hit.w.nx + dy * hit.w.ny);
    if (cosA < 0.85 || cosB < 0.85) return null;
    return {
      A: [ax, ay],
      B: [ax + dx * hit.t, ay + dy * hit.t],
      wA,
      wB: hit.w,
      uA,
      uB: hit.u,
      d: [dx, dy],
      depth: hit.t,
      w,
    };
  }
  // ---- a gateway into a yard: through one of the buildings round it, from a wall facing the outside to the wall facing the yard ----
  // outside(x, y): a point open to the streets (not in a yard, not in a building); street(x, y): metres to the nearest street (or 99).
  function tor(yard, opts = {}) {
    const w = opts.w || 2.8,
      outside = opts.outside || (() => true),
      street = opts.street || (() => 20);
    let best = null;
    for (const r of yard.around) {
      if (r.kind === 'kirche' || r.kind === 'wahrzeichen' || r.area < 30 || r.noPass) continue;
      const ws = walls(r);
      for (const wA of ws) {
        if (wA.L < w + 1.2) continue;
        const mx = (wA.ax + wA.bx) / 2,
          my = (wA.ay + wA.by) / 2;
        if (!outside(mx + wA.nx * 1.2, my + wA.ny * 1.2) || !outside(mx + wA.nx * 3, my + wA.ny * 3)) continue;
        const sd = street(mx + wA.nx * 2, my + wA.ny * 2);
        if (sd > (opts.maxStreet || 99)) continue;
        for (let q = 0; q < 9; q++) {
          const uA = w / 2 + 0.6 + ((wA.L - w - 1.2) * q) / 8,
            c = corridor(r, ws, wA, uA, w);
          if (!c) continue;
          const bx = c.B[0] + c.d[0] * 1.0,
            by = c.B[1] + c.d[1] * 1.0;
          if (!yard.at(bx, by)) continue;
          // short, from a street, through a house; the middle of a wall rather than near a corner
          const sc =
            c.depth +
            Math.min(sd, 30) * 0.4 +
            (r.kind === 'haus' ? 0 : 3) +
            Math.abs(uA - wA.L / 2) * 0.05 +
            (r.ext ? 6 : 0);
          if (!best || sc < best.sc) best = Object.assign(c, { r, sc, street: sd });
        }
      }
    }
    if (best) best.h = Math.min(opts.h || 3.4, (best.r.eave || 6) - 0.6);
    return best && best.h > 2.6 ? best : null;
  }
  // ---- a passage along a mapped line (x0, y0) → (x1, y1) through r: the two walls it crosses, the corridor between them ----
  function passLine(r, line, w = 3.0) {
    const ws = walls(r),
      [x0, y0, x1, y1] = line,
      L = Math.hypot(x1 - x0, y1 - y0) || 1,
      dx = (x1 - x0) / L,
      dy = (y1 - y0) / L,
      hits = [];
    let t = -0.01;
    for (let k = 0; k < 6; k++) {
      const h = rayHit(ws, x0, y0, dx, dy, t + 0.02);
      if (!h || h.t > L + 0.5) break;
      hits.push(h);
      t = h.t;
    }
    if (hits.length < 2) return null;
    // the pair entering and leaving the footprint (the walls face away from each other)
    for (let k = 0; k + 1 < hits.length; k++) {
      const a = hits[k],
        b = hits[k + 1],
        mx = x0 + dx * (a.t + b.t) * 0.5,
        my = y0 + dy * (a.t + b.t) * 0.5;
      if (!inside(r, mx, my)) continue;
      // the corridor from the first wall along the line (its own direction, not the wall's normal)
      const c = corridor(r, ws, a.w, a.u, w, [dx, dy]);
      if (c && c.wB === b.w) return Object.assign(c, { r, src: 'osm' });
      // a skewed wall: keep the line, no width check (the mapped passage is real)
      return {
        r,
        A: [x0 + dx * a.t, y0 + dy * a.t],
        B: [x0 + dx * b.t, y0 + dy * b.t],
        wA: a.w,
        wB: b.w,
        uA: a.u,
        uB: b.u,
        d: [dx, dy],
        depth: b.t - a.t,
        w,
        src: 'osm',
      };
    }
    return null;
  }
  // ---- a door for a building without one towards a street: the wall with room in front (a yard, a garden), not a party wall ----
  // pieces: the record's walls with { blind, L, nx, ny, ax, ay, dx, dy }; free(x, y): nobody's footprint there. → { k, u, w } or null
  function hofTuer(r, pieces, free, opts = {}) {
    const minL = r.kind === 'haus' ? 2.4 : 1.8;
    let best = null;
    pieces.forEach((p, k) => {
      if (p.blind || p.L < minL) return;
      // room in front along the middle third (a door needs about 1.5 m clear)
      let ok = 0;
      for (const s of [0.35, 0.5, 0.65])
        for (const d of [0.8, 1.6]) {
          const u = p.L * s;
          if (free(p.ax + p.dx * u + p.nx * d, p.ay + p.dy * u + p.ny * d)) ok++;
        }
      if (ok < 5) return;
      const sc = ok + Math.min(p.L, 12) * 0.25 + (p.gable ? -0.8 : 0) + (opts.yard && opts.yard(p) ? 1.5 : 0);
      if (!best || sc > best.sc) best = { k, sc, p };
    });
    if (!best) return null;
    const p = best.p,
      clear = u =>
        free(p.ax + p.dx * u + p.nx * 0.8, p.ay + p.dy * u + p.ny * 0.8) &&
        free(p.ax + p.dx * u + p.nx * 1.6, p.ay + p.dy * u + p.ny * 1.6);
    if (r.kind === 'haus') {
      // in a bay like world/village.js (the second or the last but one), else the free bay nearest the middle
      const sp = r.sp || 2.8,
        nb = Math.max(1, Math.floor((p.L - 0.6) / sp)),
        bw = p.L / nb,
        bi0 = nb >= 3 ? (hh(r.bid + 23) < 0.5 ? 1 : nb - 2) : 0,
        order = [bi0].concat(
          [...Array(nb).keys()].sort((a, b) => Math.abs(a + 0.5 - nb / 2) - Math.abs(b + 0.5 - nb / 2))
        ),
        bi = order.find(q => clear((q + 0.5) * bw));
      return bi === undefined
        ? null
        : { k: best.p.k !== undefined ? best.p.k : best.k, u: (bi + 0.5) * bw, w: 1.05, kind: 'tuer' };
    }
    best.k = best.p.k !== undefined ? best.p.k : best.k;
    if (r.kind === 'halle') return { k: best.k, u: p.L / 2, w: Math.min(5, p.L * 0.4), kind: 'tor' };
    if (p.L > 3.2) return { k: best.k, u: p.L / 2, w: Math.min(2.5, p.L * 0.6), kind: 'tor' };
    return { k: best.k, u: p.L / 2, w: Math.min(0.95, p.L * 0.5), kind: 'tuer' };
  }
  // ---- a record from the town data's format (welt/schleusingen.js, gebaeude/gebaeude.js: footprint f, rings h, facades F as [ax, ay, bx,
  // by, t0, uA, tA, t1, flags (1 = party wall), metres to a street]) – each facade one piece as the town draws it before any fix ----
  const KIND_F = b =>
    b.lm ? 'wahrzeichen' : b.k === 3 ? 'kirche' : b.k === 2 ? 'schuppen' : b.k === 1 ? 'halle' : 'haus';
  function fromF(b, o = {}) {
    const st = b.st || {},
      door = o.door || null,
      fac = [];
    b.F.forEach((f, k) => {
      const [ax, ay, bx, by, t0, uA0, tA0, t1, fl] = f,
        L = Math.hypot(bx - ax, by - ay);
      if (L < 0.05) return;
      const dx = (bx - ax) / L,
        dy = (by - ay) / L,
        gable = tA0 > Math.max(t0, t1) + 0.6 && uA0 > 0.3 && uA0 < L - 0.3,
        blind = !!(fl & 1);
      fac.push({
        k,
        ax,
        ay,
        bx,
        by,
        L,
        dx,
        dy,
        nx: dy,
        ny: -dx,
        LF: blind ? 0.5 : L,
        blind,
        t0,
        tA: gable ? tA0 : (t0 + t1) / 2,
        uA: gable ? uA0 : L / 2,
        t1,
        gable,
        du: door && door.k === k ? door.u : -1,
        dw: door && door.k === k ? door.w : 0,
        st: o.stOf ? o.stOf(f, k) : st.style || 0,
        sp: st.sp || 2.8,
        raised: !!st.raised,
        eave: b.e,
        bid: o.bid !== undefined ? o.bid : b.i,
        street: f[9],
      });
    });
    return prep({
      id: o.id !== undefined ? o.id : b.i,
      ort: o.ort || '',
      kind: o.kind || KIND_F(b),
      f: b.f,
      h: Array.isArray(b.h) && Array.isArray(b.h[0]) ? b.h : undefined, // inner rings (another format's h may be a height)
      eave: b.e,
      sp: st.sp || 2.8,
      bid: o.bid !== undefined ? o.bid : b.i,
      ext: !!o.ext,
      fac,
      name: b.n || b.a || '',
    });
  }
  // ---- the audit: what is still implausible ----
  // ctx: { idx (index over all footprints of the place), yards (hoefe() + reach), passes ([{ x, y, open, text }]), minRun (m) }
  // (a hall or a barn with an eave under 2.6 m is a shelter for machines or a shed: open or blank, no windows needed)
  const NEEDS_WIN = r =>
    r.kind === 'haus' ||
    (r.kind === 'halle' && r.area >= 150 && !(r.eave < 2.6)) ||
    (r.kind === 'scheune' && r.area >= 250 && !(r.eave < 2.6)) ||
    r.kind === 'schule';
  function audit(recs, ctx = {}) {
    const idx = ctx.idx || index(recs),
      out = [],
      minRun = ctx.minRun || 3.0;
    for (const r of recs) {
      prep(r);
      const pieces = r.fac || [];
      // doors
      const doors = pieces.filter(p => p.dw > 0 && p.du >= 0);
      if (!doors.length && !r.ext && r.area >= 6 && r.kind !== 'turm')
        out.push({ id: r.id, ort: r.ort, art: 'tuer', x: r.cx, y: r.cy, text: 'kein Eingang' });
      for (const p of doors) {
        const u = p.du,
          dx = (p.bx - p.ax) / (p.L || 1),
          dy = (p.by - p.ay) / (p.L || 1),
          x = p.ax + dx * u,
          y = p.ay + dy * u;
        if (idx.at(x + p.nx * 0.7, y + p.ny * 0.7, r))
          out.push({
            id: r.id,
            ort: r.ort,
            art: 'tuer',
            x,
            y,
            text: 'Tür vor der Wand eines Nachbarn',
            rest: r.keepDoor,
          });
      }
      // windows: what shows on the parts of the walls not standing against a neighbour
      let seen = 0;
      const bare = [];
      for (const p of pieces) {
        const W = windows(p),
          cv = cover(r, p, idx),
          runs = openRuns(cv.L, cv.spans),
          inRun = (a, b) => W.filter(q => q.u1 > a && q.u0 < b).length;
        seen += W.filter(q => !cv.spans.some(([a, b]) => (q.u0 + q.u1) / 2 > a && (q.u0 + q.u1) / 2 < b)).length;
        seen += p.extra || 0;
        if (r.kind !== 'haus' && r.kind !== 'halle' && r.kind !== 'schule') continue;
        const need = r.kind === 'halle' ? 25 : minRun;
        for (const [a, b] of runs)
          if (b - a >= need && !inRun(a, b) && !(p.extra > 0)) {
            const um = (a + b) / 2,
              dx = (p.bx - p.ax) / (p.L || 1),
              dy = (p.by - p.ay) / (p.L || 1);
            bare.push({ x: p.ax + dx * um, y: p.ay + dy * um, len: b - a });
          }
      }
      if (NEEDS_WIN(r) && seen === 0)
        out.push({ id: r.id, ort: r.ort, art: 'fenster', x: r.cx, y: r.cy, text: 'ganz ohne Fenster' });
      else
        for (const q of bare)
          out.push({
            id: r.id,
            ort: r.ort,
            art: 'fenster',
            x: q.x,
            y: q.y,
            text: `${q.len.toFixed(1)} m Wand ohne Fenster`,
          });
    }
    for (const y of ctx.yards || [])
      if (!y.reach)
        out.push({
          id: 'hof:' + Math.round(y.cx) + ',' + Math.round(y.cy),
          ort: ctx.ort,
          art: 'hof',
          x: y.cx,
          y: y.cy,
          text: `Hof ${Math.round(y.area)} m² ohne Zugang`,
          rest: y.rest,
        });
    for (const p of ctx.passes || [])
      if (!p.open)
        out.push({
          id: p.id,
          ort: ctx.ort,
          art: 'durchgang',
          x: p.x,
          y: p.y,
          text: p.text || 'Durchgang nicht offen',
          rest: p.rest,
        });
    return out;
  }
  // counts per kind: { tuer, fenster, durchgang, hof, rest, n }
  function count(list) {
    const c = { tuer: 0, fenster: 0, durchgang: 0, hof: 0, rest: 0, n: list.length };
    for (const q of list) {
      if (q.rest) c.rest++;
      else c[q.art]++;
    }
    return c;
  }
  return {
    ST,
    hh,
    inRing,
    inside,
    area,
    prep,
    index,
    windows,
    cover,
    openRuns,
    hoefe,
    hull,
    walls,
    rayHit,
    corridor,
    tor,
    passLine,
    hofTuer,
    KIND_F,
    fromF,
    audit,
    count,
  };
})();
