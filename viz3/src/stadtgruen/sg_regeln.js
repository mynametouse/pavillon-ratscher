// ===================== feat/stadtgruen: Schleusingen's street trees and green – the pure part (SGREGELN) =====================
// No three.js, no app imports: the tree records of dist/stadtgruen/baeume.json (tools/stadtgruen/build.py), the species and their
// year (budburst, autumn colour, leaf fall – Thuringia at about 400 m), where a tree must not stand (a building, a door, a lamp, a bay of
// a car park, a shop's pad, a bus stop, the Markt's own trees), which level of detail each tree gets for a camera, the trunks as
// colliders. Unit tests: viz3/test/unit/stadtgruen.test.mjs. Used by stadtgruen/stadtgruen.js (STADTGRUEN).
export const SGREGELN = (() => {
  // ---- the species: German name, the 3D kind the module draws them with, the far card of the atlas of world/ratscher.js (0 oakA,
  // 1 ash, 2 oakB, 3 aspen, 4 pine), trunk radius per metre of height, their year (day of the year: budburst, full leaf, autumn colour
  // begins, at its peak, leaves gone; held: share of dry leaves kept over the winter), the autumn colour (sRGB) and fresh green ----
  const ARTEN = [
    // small- and large-leaved lime: the avenues of Hildburghäuser Straße, Markt edges, the castle (golden yellow in October)
    {
      id: 'linde',
      name: 'Linde',
      card: 2,
      trunk: 0.014,
      year: [112, 135, 280, 296, 318],
      held: 0,
      autumn: [0.86, 0.66, 0.16],
    },
    // Norway and sycamore maple: yellow to orange
    {
      id: 'ahorn',
      name: 'Ahorn',
      card: 0,
      trunk: 0.013,
      year: [106, 128, 278, 292, 312],
      held: 0,
      autumn: [0.93, 0.55, 0.13],
    },
    // horse chestnut: early leaves, brown edges from late summer (leaf miner), early fall
    {
      id: 'kastanie',
      name: 'Kastanie',
      card: 2,
      trunk: 0.016,
      year: [100, 122, 262, 282, 304],
      held: 0,
      autumn: [0.62, 0.4, 0.15],
    },
    // birch: light, bright yellow
    {
      id: 'birke',
      name: 'Birke',
      card: 3,
      trunk: 0.009,
      year: [104, 124, 276, 292, 312],
      held: 0,
      autumn: [0.93, 0.8, 0.22],
    },
    // ash: late leaves, falls green-yellow
    {
      id: 'esche',
      name: 'Esche',
      card: 1,
      trunk: 0.012,
      year: [124, 142, 284, 296, 306],
      held: 0,
      autumn: [0.72, 0.7, 0.28],
    },
    // oak: late, brown, keeps some leaves into the winter
    {
      id: 'eiche',
      name: 'Eiche',
      card: 0,
      trunk: 0.016,
      year: [120, 140, 290, 306, 326],
      held: 0.12,
      autumn: [0.56, 0.38, 0.15],
    },
    // conifers in yards and by the castle (spruce, pine, thuja): evergreen
    { id: 'nadel', name: 'Nadelbaum', card: 4, trunk: 0.012, year: null, held: 1, autumn: null },
    // fruit trees in the gardens: apple, pear, cherry, plum
    {
      id: 'obst',
      name: 'Obstbaum',
      card: 0,
      trunk: 0.018,
      year: [100, 122, 284, 298, 316],
      held: 0,
      autumn: [0.76, 0.56, 0.2],
    },
    // hedges and shrubs (hornbeam, privet, hazel): hornbeam keeps its brown leaves over the winter
    {
      id: 'hecke',
      name: 'Hecke',
      card: -1,
      trunk: 0,
      year: [104, 126, 288, 302, 322],
      held: 0.55,
      autumn: [0.56, 0.42, 0.2],
    },
  ];
  const BY_ID = Object.fromEntries(ARTEN.map((a, i) => [a.id, i]));
  const FRESH = [0.6, 0.78, 0.36];
  const ss = (a, b, x) => {
    const t = Math.max(0, Math.min(1, (x - a) / (b - a || 1)));
    return t * t * (3 - 2 * t);
  };
  // ---- the year of a species: leaf = share of the leaves on the tree (0 bare … 1 full), col = the colour the leaves turn towards
  // (null: their own green), k = how far towards it (0 … 1), st = German word for the state ----
  function season(art, doy) {
    const A = typeof art === 'number' ? ARTEN[art] : ARTEN[BY_ID[art]];
    if (!A || !A.year) return { leaf: 1, col: null, k: 0, st: 'immergrün' };
    const [bud, full, c0, c1, gone] = A.year,
      d = ((doy % 365) + 365) % 365;
    // spring: the leaves come between budburst and full leaf, fresh light green until a few weeks after
    if (d < bud) return winter(A);
    if (d < full) {
      const k = ss(bud, full, d);
      return { leaf: Math.max(A.held, 0.15 + 0.85 * k), col: FRESH, k: 1 - 0.4 * k, st: 'Austrieb' };
    }
    if (d < full + 25) return { leaf: 1, col: FRESH, k: 0.6 * (1 - ss(full, full + 25, d)), st: 'grün' };
    if (d < c0) return { leaf: 1, col: null, k: 0, st: 'grün' };
    // autumn: the colour comes from c0 to c1, the leaves fall from c1 to gone (held ones stay, dry)
    if (d < c1) return { leaf: 1, col: A.autumn, k: ss(c0, c1, d), st: 'Herbstfarben' };
    if (d < gone) {
      const f = ss(c1, gone, d);
      return { leaf: Math.max(A.held, 1 - f), col: A.autumn, k: 1, st: 'Laubfall' };
    }
    return winter(A);
  }
  const winter = A =>
    A.held > 0
      ? {
          leaf: A.held,
          col: [A.autumn[0] * 0.75, A.autumn[1] * 0.68, A.autumn[2] * 0.6],
          k: 1,
          st: 'Winter (trockenes Laub)',
        }
      : { leaf: 0, col: null, k: 0, st: 'kahl' };
  // ---- the instance colour of a crown: the leaf picture's mean colour avg (linear) turned towards col (sRGB) by k, brightness v. The
  // multiplier keeps the target's hue: if one channel would need more than 8 times, all are scaled down together (a darker but true
  // yellow, not a brighter green – the leaf pictures are dark green, their red is a tenth of the target's) ----
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  function tint(col, k, avg, v = 1) {
    k = Math.max(0, Math.min(1, k || 0));
    if (!col || k <= 0.001) return [v, v, v];
    const m = [0, 1, 2].map(i => lin(col[i]) / Math.max(0.01, avg[i])),
      top = Math.max(...m),
      s = top > 8 ? 8 / top : 1;
    return m.map(x => (1 - k + k * Math.max(0.15, x * s)) * v);
  }
  // day of the year (0 = 1 January) of a Julian date
  const doyOf = jd => {
    const d = new Date((jd - 2440587.5) * 864e5);
    return Math.floor((d.getTime() - Date.UTC(d.getUTCFullYear(), 0, 1)) / 864e5);
  };
  // ---- the records: baeume.json `b` holds 6 integers per tree: x, y (dm, model metres × 10), species, height (dm), crown radius (dm),
  // flags (1 row/avenue, 2 street tree, 4 yard or garden, 8 park or castle, 16 from the aerial images, 32 from OSM, 64 hedge) ----
  const F = { ROW: 1, STREET: 2, YARD: 4, PARK: 8, IMG: 16, OSM: 32, HEDGE: 64 };
  function decode(J) {
    const b = (J && J.b) || [],
      out = [];
    for (let i = 0; i + 5 < b.length; i += 6) {
      const art = b[i + 2];
      if (!ARTEN[art]) continue;
      const h = b[i + 3] / 10,
        r = b[i + 4] / 10;
      out.push({
        i: out.length,
        x: b[i] / 10,
        y: b[i + 1] / 10,
        art,
        h,
        r,
        f: b[i + 5],
        // the trunk for the colliders: thicker with the height, none for a hedge
        tr: ARTEN[art].trunk ? Math.min(0.42, Math.max(0.09, ARTEN[art].trunk * h)) : 0,
        hs: hash2(b[i], b[i + 1]),
        z: 0,
        off: '',
      });
    }
    return out;
  }
  const hash2 = (a, b) => {
    const s = Math.sin(a * 0.0129898 + b * 0.0078233) * 43758.5453;
    return s - Math.floor(s);
  };
  // ---- geometry ----
  function inPoly(P, x, y) {
    let c = false;
    for (let p = 0, q = P.length - 2; p < P.length; q = p, p += 2) {
      const xi = P[p],
        yi = P[p + 1],
        xj = P[q],
        yj = P[q + 1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) c = !c;
    }
    return c;
  }
  function distSeg(x, y, ax, ay, bx, by) {
    const dx = bx - ax,
      dy = by - ay,
      t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy || 1)));
    return Math.hypot(x - ax - dx * t, y - ay - dy * t);
  }
  function distPoly(P, x, y) {
    let d = 1e9;
    for (let p = 0, q = P.length - 2; p < P.length; q = p, p += 2)
      d = Math.min(d, distSeg(x, y, P[q], P[q + 1], P[p], P[p + 1]));
    return d;
  }
  // ---- a spatial hash of points (cell metres): get(x, y, r) → the items within r ----
  function grid(items, cell = 16) {
    const M = new Map(),
      key = (i, j) => i * 65536 + j;
    for (const it of items) {
      const k = key(Math.floor(it.x / cell), Math.floor(it.y / cell));
      let a = M.get(k);
      if (!a) M.set(k, (a = []));
      a.push(it);
    }
    return {
      cell,
      near(x, y, r, out = []) {
        out.length = 0;
        const i0 = Math.floor((x - r) / cell),
          i1 = Math.floor((x + r) / cell),
          j0 = Math.floor((y - r) / cell),
          j1 = Math.floor((y + r) / cell);
        for (let i = i0; i <= i1; i++)
          for (let j = j0; j <= j1; j++) {
            const a = M.get(key(i, j));
            if (a) for (const it of a) if (Math.hypot(it.x - x, it.y - y) <= r) out.push(it);
          }
        return out;
      },
    };
  }
  // ---- where a tree must not stand, checked when the town is there (the data's own checks are in tools/stadtgruen/build.py): the
  // world as it is then – C: { blds: [{ f: footprint, cx, cy, R, door: [x, y] | null, n: the door's outward normal, sign: a shop's
  // sign over the door }], lamps: [[x, y]], bays: [[x, y, az]], pads: [footprint],
  // stops: [[x, y]], keep: [[x, y]] (the Markt trees of welt/schleusingen.js), markt: footprint; in the village: road(x, y) the signed
  // distance to the nearest road's edge (positive on it), trees: a grid of the world's own trees (no duplicate within 4 m, a bush 2 m) }
  // → '' (fine) or the reason ----
  const nearBuf = [];
  function blocked(t, C) {
    const x = t.x,
      y = t.y,
      hedge = (t.f & F.HEDGE) !== 0,
      rT = hedge ? 0.35 : Math.max(0.5, t.tr + 0.25);
    if (C.road && C.road(x, y) > -(hedge ? 0.8 : 1.5)) return 'Fahrbahn';
    if (C.trees && C.trees.near(x, y, hedge ? 2 : 4, nearBuf).length) return 'Baum der Welt';
    for (const b of C.blds || []) {
      if (Math.abs(b.cx - x) > b.R + 12 || Math.abs(b.cy - y) > b.R + 12) continue;
      if (inPoly(b.f, x, y) || distPoly(b.f, x, y) < rT) return 'Gebäude';
      if (!b.door) continue;
      if (Math.hypot(b.door[0] - x, b.door[1] - y) < (hedge ? 1.6 : 3.0)) return 'Tür';
      // the way to the door and, where the house has a shop's sign over it, the view of the sign from the street stay clear: a
      // corridor out along the facade's normal n (4 m × ±1.3 m; a sign 9 m × ±2.6 m)
      if (b.n && !hedge) {
        const dx = x - b.door[0],
          dy = y - b.door[1],
          a = dx * b.n[0] + dy * b.n[1],
          c = Math.abs(dx * b.n[1] - dy * b.n[0]);
        if (a > -0.5 && a < (b.sign ? 9 : 4) && c < (b.sign ? 2.6 : 1.3) + t.tr) return b.sign ? 'Schild' : 'Tür';
      }
    }
    for (const p of C.pads || []) if (inPoly(p, x, y) || distPoly(p, x, y) < rT) return 'Ladenfläche';
    for (const l of C.lamps || []) if (Math.hypot(l[0] - x, l[1] - y) < (hedge ? 0.8 : 2.2)) return 'Laterne';
    for (const s of C.stops || []) if (Math.hypot(s[0] - x, s[1] - y) < 4.5) return 'Haltestelle';
    // a bay: 2.5 × 5 m round its centre, along its heading (az: the car's heading, degrees clockwise from north)
    for (const q of C.bays || []) {
      const dx = x - q[0],
        dy = y - q[1];
      if (dx * dx + dy * dy > 16) continue;
      const a = ((q[2] || 0) * Math.PI) / 180,
        along = dx * Math.sin(a) + dy * Math.cos(a),
        across = dx * Math.cos(a) - dy * Math.sin(a);
      if (Math.abs(along) < 2.5 + rT && Math.abs(across) < 1.25 + rT) return 'Parkplatz';
    }
    if (!hedge) for (const k of C.keep || []) if (Math.hypot(k[0] - x, k[1] - y) < 3) return 'Marktbaum';
    // anything solid within reach (a wall, a trunk – the village asks its colliders)
    if (C.solid && C.solid(x, y, hedge ? 0.4 : rT + 0.6)) return 'Wand oder Stamm';
    if (C.markt && inPoly(C.markt, x, y)) return 'Markt';
    return '';
  }
  // ---- levels of detail for a camera at (cx, cy) looking along (dx, dy) (normalised, ground plane): 0 full, 1 mid, 2 far, 3 card,
  // -1 not drawn this time (behind the camera beyond the near ring). R = [near, mid, far] radii; cone = cos of the half angle that
  // counts as in view (with the crown's margin) ----
  function level(t, cx, cy, dx, dy, R, cone) {
    const ex = t.x - cx,
      ey = t.y - cy,
      d = Math.hypot(ex, ey);
    if (d > R[2]) return 3;
    // within the near ring always (shadows, turning round), beyond it only what is in front
    if (d > R[0] && d > 0.01) {
      const m = Math.min(1, (t.r + 2) / d),
        c = (ex * dx + ey * dy) / d;
      if (c < cone - m) return -1;
    }
    return d <= R[0] ? 0 : d <= R[1] ? 1 : 2;
  }
  // the radii (metres) and the budget for a render tier and the phone flag: the triangles of all trees in 3D within view (the cards come
  // on top: 4 triangles a tree) and the most trees per level – full detail only for the nearest few, the mid level for a dozen, the far
  // one for a few dozen, cards beyond; hedges (bushes) count against the same triangles with their own caps. Computer ≤ 150 000 and
  // phone ≤ 60 000 triangles in view with the cards (docs/features/stadtgruen.md); on a phone every level is a step coarser
  // (stadtgruen.js)
  function radii(phone, tier) {
    const k = tier === 'hoch' ? 1 : tier === 'mittel' ? 0.85 : 0.7;
    return phone ? [10 * k, 40 * k, 95 * k] : [16 * k, 55 * k, 130 * k];
  }
  function budget(phone, tier) {
    const k = tier === 'hoch' ? 1 : tier === 'mittel' ? 0.8 : 0.65;
    const n = a => a.map(v => Math.max(1, Math.round(v * k)));
    return phone
      ? { tris: Math.round(32000 * k), tree: n([2, 9, 18]), hedge: n([8, 14, 18]) }
      : { tris: Math.round(118000 * k), tree: n([3, 12, 32]), hedge: n([12, 28, 36]) };
  }
  // ---- the levels of all trees for a camera at (cx, cy) looking along (dx, dy): the nearest in view first, each with the finest
  // level its distance allows while that level's cap and the triangles left allow it, else a coarser one; t.lv = 0 / 1 / 2 (3D),
  // 3 (card), −1 (not drawn: behind the camera beyond the near ring). N: budget(); cost(t, lv): a tree's triangles at a level; hedge(t):
  // a hedge's bush; top: seen from high above (no full level). Returns the counts per level [0, 1, 2, 3] and the triangles used ----
  function assign(list, cx, cy, dx, dy, R, N, cone, top, cost, hedge) {
    const cand = [],
      n = [0, 0, 0, 0];
    for (const t of list) {
      const lv = level(t, cx, cy, dx, dy, R, cone);
      t.d = Math.hypot(t.x - cx, t.y - cy);
      if (lv === 3 || lv < 0) {
        t.lv = lv;
        if (lv === 3) n[3]++;
        continue;
      }
      cand.push(t);
    }
    cand.sort((a, b) => a.d - b.d);
    const used = { tree: [0, 0, 0], hedge: [0, 0, 0] };
    let left = N.tris === undefined ? Infinity : N.tris;
    for (const t of cand) {
      const kind = hedge && hedge(t) ? 'hedge' : 'tree',
        cap = N[kind],
        u = used[kind];
      let lv = t.d <= R[0] ? 0 : t.d <= R[1] ? 1 : 2;
      if (top && lv === 0) lv = 1;
      while (lv < 3 && (u[lv] >= cap[lv] || (cost ? cost(t, lv) : 0) > left)) lv++;
      if (lv < 3) {
        u[lv]++;
        left -= cost ? cost(t, lv) : 0;
      }
      t.lv = lv;
      n[lv]++;
    }
    n.tris = N.tris === undefined ? 0 : N.tris - left;
    return n;
  }
  // leaf fall thins the crown: the leaf level a share of leaves gets at distance level lv (null: no crown)
  function leafLevel(lv, leaf) {
    if (leaf < 0.08) return null;
    const thin = leaf >= 0.72 ? 0 : leaf >= 0.38 ? 1 : 2;
    return Math.min(2, lv + thin);
  }
  // ---- the trunks: p = [x, y] out of every trunk within r (in place); true if it moved, undefined if none was near ----
  function pushOut(G, p, r, tmp = []) {
    if (!G) return undefined;
    let moved = false;
    for (const t of G.near(p[0], p[1], r + 0.5, tmp)) {
      if (!t.tr || t.off) continue;
      const dx = p[0] - t.x,
        dy = p[1] - t.y,
        d = Math.hypot(dx, dy),
        rr = r + t.tr;
      if (d < rr && d > 1e-6) {
        p[0] = t.x + (dx / d) * rr;
        p[1] = t.y + (dy / d) * rr;
        moved = true;
      }
    }
    return moved ? true : undefined;
  }
  // ---- counts for the status and the tests: per species, per street (rows), the spacing of a row (median of neighbours) ----
  function rowSpacing(list) {
    if (list.length < 2) return 0;
    const gaps = [];
    for (const t of list) {
      let best = 1e9;
      for (const q of list) if (q !== t) best = Math.min(best, Math.hypot(q.x - t.x, q.y - t.y));
      gaps.push(best);
    }
    gaps.sort((a, b) => a - b);
    return gaps[gaps.length >> 1];
  }
  return {
    ARTEN,
    BY_ID,
    F,
    season,
    tint,
    doyOf,
    decode,
    inPoly,
    distSeg,
    distPoly,
    grid,
    blocked,
    level,
    radii,
    budget,
    assign,
    leafLevel,
    pushOut,
    rowSpacing,
  };
})();
