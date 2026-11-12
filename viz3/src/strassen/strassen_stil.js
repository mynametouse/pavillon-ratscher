// ===================== feat/strassen 1: how a road is marked and edged, and its raster for the ground shaders – pure (STRSTIL) =====================
// Falko, 12.11.2026: the region „aus der 3D-Perspektive noch realistischer … Gebäude, aber auch Straßen“ – package 1, the roads.
// A road gets one of four styles per stretch (segment of its polyline), from where it runs and how it bends:
//   0 open country: dashed centre line 4 m / 8 m, edge lines on the wider roads, a gravel shoulder
//   1 open country, no overtaking: the centre line solid (tight curves – by rule, nobody surveyed them)
//   2 in a town: kerbs, a gutter of setts, pavements on both sides, a short-dashed centre line 3 m / 6 m on the through roads
//   3 in a village: kerb and gutter along the through roads only; the lanes stay as they are (asphalt against grass)
// The raster (world/roads.js for the 2.4 km square, strassen/strassen_karte.js for a window around the vehicle beyond it) keeps per pixel
// R = distance to the nearest road edge (+ inside), G = style × 60 + kind × 6 + surface, B = the signed lateral offset from the centre line,
// A = the metres along the way modulo DASH. No scene, no DOM: unit tests in viz3/test/unit/strassen.test.mjs.
export const STRSTIL = (() => {
  const S = {
    EMIN: -4, // edge distance −4 … +8 m
    ERNG: 12,
    LRNG: 8, // lateral offset ±8 m
    DASH: 36, // the along-coordinate wraps every 36 m: 3 dashes of 12 m, 4 of 9 m, 2 of 18 m
    NCODE: 60,
    RURAL: 0,
    SOLID: 1,
    TOWN: 2,
    VILLAGE: 3,
  };
  S.code = (kind, surf, style = 0) => style * 60 + kind * 6 + surf;
  S.decode = c => {
    const style = (c / 60) | 0,
      r = c - style * 60;
    return { style, kind: (r / 6) | 0, surf: r % 6 };
  };
  // cumulative lengths of a polyline p (stride 2 or 3: x, y[, z]) with n points
  S.cum = (p, stride, n) => {
    const c = new Float32Array(n);
    for (let i = 1; i < n; i++)
      c[i] = c[i - 1] + Math.hypot(p[i * stride] - p[(i - 1) * stride], p[i * stride + 1] - p[(i - 1) * stride + 1]);
    return c;
  };
  // the point at s metres along (clamped): [x, y]
  S.along = (p, stride, n, cum, s, out = [0, 0]) => {
    const L = cum[n - 1];
    s = s < 0 ? 0 : s > L ? L : s;
    let lo = 0,
      hi = n - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (cum[m] <= s) lo = m;
      else hi = m;
    }
    const d = cum[hi] - cum[lo] || 1,
      f = (s - cum[lo]) / d;
    out[0] = p[lo * stride] + (p[hi * stride] - p[lo * stride]) * f;
    out[1] = p[lo * stride + 1] + (p[hi * stride + 1] - p[lo * stride + 1]) * f;
    return out;
  };
  // the radius (m) of the way at s: from the turn between the chord before and the chord after, each `arm` metres long
  const _a = [0, 0],
    _b = [0, 0],
    _c = [0, 0];
  S.radius = (p, stride, n, cum, s, arm = 14) => {
    const L = cum[n - 1];
    if (L < arm) return Infinity;
    // near an end the window is moved in: the chords stay `arm` long (the turn of a bend that ends at the way's end still counts)
    const sm = Math.max(arm, Math.min(L - arm, s));
    if (sm - arm < 0 || sm + arm > L) return Infinity;
    S.along(p, stride, n, cum, sm - arm, _a);
    S.along(p, stride, n, cum, sm, _b);
    S.along(p, stride, n, cum, sm + arm, _c);
    const ux = _b[0] - _a[0],
      uy = _b[1] - _a[1],
      vx = _c[0] - _b[0],
      vy = _c[1] - _b[1],
      lu = Math.hypot(ux, uy),
      lv = Math.hypot(vx, vy);
    if (lu < 1e-3 || lv < 1e-3) return Infinity;
    const th = Math.abs(Math.atan2(ux * vy - uy * vx, ux * vx + uy * vy));
    return th < 1e-4 ? Infinity : (lu + lv) / 2 / th;
  };
  // stretches without overtaking on a road in open country: where the radius falls below RSOLID, widened by LEAD metres before and
  // after, gaps shorter than GAP closed, stretches shorter than MINLEN dropped → [[s0, s1], …] in metres along
  const RSOLID = 115,
    LEAD = 30,
    GAP = 45,
    MINLEN = 40;
  S.solids = (p, stride, n, cum) => {
    const L = cum[n - 1],
      out = [];
    if (L < 60) return out;
    let run = null;
    for (let s = 0; s <= L; s += 4) {
      const tight = S.radius(p, stride, n, cum, s) < RSOLID;
      if (tight) {
        if (!run) run = [s, s];
        run[1] = s;
      } else if (run) {
        out.push(run);
        run = null;
      }
    }
    if (run) out.push(run);
    for (const r of out) {
      r[0] = Math.max(0, r[0] - LEAD);
      r[1] = Math.min(L, r[1] + LEAD);
    }
    const m = [];
    for (const r of out) {
      const l = m[m.length - 1];
      if (l && r[0] - l[1] < GAP) l[1] = Math.max(l[1], r[1]);
      else m.push(r);
    }
    return m.filter(r => r[1] - r[0] >= MINLEN);
  };
  // the style of every segment of a way: placeAt(x, y) → 0 open country, 1 village, 2 town (strassen/strassen_daten.js); kinds as in
  // GEOMAN.roads.kinds (0 motorway, 1 main, 2 county, 3 street, 4 lane, 5 service, 6 track, 7 path, 8 foot)
  S.styles = (p, stride, n, kind, placeAt, cum = S.cum(p, stride, n)) => {
    const st = new Uint8Array(Math.max(0, n - 1)),
      sol = kind === 1 || kind === 2 ? S.solids(p, stride, n, cum) : [];
    for (let k = 0; k < n - 1; k++) {
      const mx = (p[k * stride] + p[(k + 1) * stride]) / 2,
        my = (p[k * stride + 1] + p[(k + 1) * stride + 1]) / 2,
        pl = placeAt ? placeAt(mx, my) : 0;
      if (pl === 2) st[k] = S.TOWN;
      else if (pl === 1) st[k] = S.VILLAGE;
      else {
        const sm = (cum[k] + cum[k + 1]) / 2;
        st[k] = sol.some(r => sm >= r[0] && sm <= r[1]) ? S.SOLID : S.RURAL;
      }
    }
    return st;
  };
  // what a road of this kind, half width and style carries (the shader does the same per pixel – this is for tests, the furniture and the
  // decals): centre line 'dash' | 'solid' | null, its dash and period (m), edge lines, kerb, pavement width (m)
  S.marks = (kind, hw, style, hard = true) => {
    const W = 2 * hw,
      m = { centre: null, dash: 0, period: 0, edge: false, kerb: false, walk: 0 };
    if (!hard) return m;
    const town = style === S.TOWN,
      vill = style === S.VILLAGE;
    if (kind === 0) {
      m.centre = hw >= 3.2 ? 'dash' : null;
      m.dash = 6;
      m.period = 18;
      m.edge = true;
    } else if (kind <= 2) {
      if (W >= 5.5) {
        m.centre = style === S.SOLID ? 'solid' : 'dash';
        m.dash = town || vill ? 3 : 4;
        m.period = town || vill ? 9 : 12;
      }
      m.edge = !town && !vill && (kind === 1 || W >= 5.0);
    }
    m.kerb = (town && kind <= 3) || (vill && kind <= 2);
    m.walk = town && kind <= 3 ? (kind <= 2 ? 1.7 : 1.3) : 0;
    return m;
  };
  // ---- the raster: one way into the map D (RGBA bytes, W × H pixels of RES metres from (X0, Y0)); the pixel keeps the road whose
  // edge is furthest (+ inside). way: { p, stride, n, hw, kind, surf, st (styles per segment, optional) } ----
  const BAND = 4;
  S.clear = D => {
    D.fill(0);
    for (let i = 2; i < D.length; i += 4) D[i] = 128; // R 0 = far from every road, B = centre
  };
  S.raster = (D, W, H, X0, Y0, RES, way) => {
    const enc = v => (v < 0 ? 0 : v > 255 ? 255 : Math.round(v)),
      eK = 255 / S.ERNG,
      lK = 255 / (2 * S.LRNG),
      { p, stride, n, hw, kind, surf, st } = way,
      R2 = hw + BAND;
    let s0 = 0;
    for (let k = 0; k < n - 1; k++) {
      const ax = p[k * stride],
        ay = p[k * stride + 1],
        bx = p[(k + 1) * stride],
        by = p[(k + 1) * stride + 1],
        L = Math.hypot(bx - ax, by - ay);
      if (L < 1e-3) continue;
      const i0 = Math.max(0, Math.floor((Math.min(ax, bx) - R2 - X0) / RES)),
        i1 = Math.min(W - 1, Math.ceil((Math.max(ax, bx) + R2 - X0) / RES)),
        j0 = Math.max(0, Math.floor((Math.min(ay, by) - R2 - Y0) / RES)),
        j1 = Math.min(H - 1, Math.ceil((Math.max(ay, by) + R2 - Y0) / RES));
      if (i0 > i1 || j0 > j1) {
        s0 += L;
        continue;
      }
      const ux = (bx - ax) / L,
        uy = (by - ay) / L,
        code = S.code(kind, surf, st ? st[k] : 0);
      for (let j = j0; j <= j1; j++) {
        const py = Y0 + (j + 0.5) * RES - ay;
        for (let i = i0; i <= i1; i++) {
          const px = X0 + (i + 0.5) * RES - ax,
            t = px * ux + py * uy,
            tc = t < 0 ? 0 : t > L ? L : t,
            d = Math.hypot(px - tc * ux, py - tc * uy),
            e = hw - d;
          if (e < -BAND) continue;
          const r8 = enc((e - S.EMIN) * eK),
            q = (j * W + i) * 4;
          if (r8 <= D[q]) continue;
          const lat = ux * py - uy * px;
          D[q] = r8;
          D[q + 1] = code;
          D[q + 2] = enc(((lat < -S.LRNG ? -S.LRNG : lat > S.LRNG ? S.LRNG : lat) + S.LRNG) * lK);
          D[q + 3] = enc((((s0 + tc) / S.DASH) % 1) * 255) & 255;
        }
      }
      s0 += L;
    }
  };
  // what the map says at (x, y): { e, kind, surf, style, lat } or null beyond 3.9 m of every road
  S.read = (D, W, H, X0, Y0, RES, x, y) => {
    const i = Math.floor((x - X0) / RES),
      j = Math.floor((y - Y0) / RES);
    if (i < 0 || j < 0 || i >= W || j >= H) return null;
    const q = (j * W + i) * 4,
      e = (D[q] / 255) * S.ERNG + S.EMIN;
    if (e < -3.9) return null;
    const c = S.decode(D[q + 1]);
    return { e, kind: c.kind, surf: c.surf, style: c.style, lat: (D[q + 2] / 255) * 2 * S.LRNG - S.LRNG };
  };
  return S;
})();
if (typeof window !== 'undefined') window.STRSTIL = STRSTIL;
