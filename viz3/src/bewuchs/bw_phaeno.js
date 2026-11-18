// @ts-check
// ===================== feat/bewuchs: the year of the vegetation – heights, mowing, colours per kind of area (BWPHAENO, pure) =====================
// Falko, 17.11.2026 20:19: the grass is „noch 2D, komplett flach“ – the template of viz3/src/bewuchs/ draws blades and flowers wherever the
// map of area kinds (bw_karte.js) says something grows. This module says how they look on a day of the year: for each area class the
// height of a stand that was not cut (it grows from March, fastest in May), how it is cut (a lawn every week from April to October, a hay
// meadow at the beginning of June and in August, a verge in June and September – each field on a day of its own around that), how fast it
// grows back, how dense it is, its colours through the year and how many flowers it carries. The numbers are first estimates of the lead;
// the species table of the helper `bewuchs-pflanzen` (bw_arten.js, BWARTEN.flaechen) replaces them per class once it is merged (merge()).
// Pure: no three.js, no window – unit-tested (viz3/test/unit/bewuchs_phaeno.test.mjs).
//   BWPHAENO.CLASSES                names of the class ids 0–17 (docs/plans/auftraege/bewuchs-daten.md) and 18, the garden's own lawn
//   BWPHAENO.K                      the class table in use (id → entry)
//   BWPHAENO.seasonH(k, doy)        height (m) of a stand of class entry k not cut this year, on day of year doy
//   BWPHAENO.rate(k, doy)           its growth (m/day) on that day
//   BWPHAENO.colour(k, doy)         [r, g, b] (sRGB 0–1) of its blades
//   BWPHAENO.heightAt(k, doy, off)  height of a field of that class whose cut days are shifted by off (days) – what the shader does per blade
//   BWPHAENO.table(doy, out?)       Float32Array 4 × 32 texels × RGBA for the shader (layout below)
//   BWPHAENO.merge(flaechen)        take entries from BWARTEN.flaechen (only the fields given; returns the number of classes taken)
export const BWPHAENO = (() => {
  const CLASSES = [
    'nichts',
    'zierrasen',
    'oeffentlich',
    'bankett',
    'maehwiese',
    'weide',
    'streuobst',
    'saum',
    'ufer',
    'acker',
    'ackerrand',
    'waldboden',
    'gebuesch',
    'beet',
    'gemuese',
    'verkehrsgruen',
    'friedhof',
    'sportrasen',
    'gartenrasen',
    // the field crops of the maps (bewuchs-daten part d), each field one; a field of 9 (unclear) takes one by the shares of the district
    'wintergetreide',
    'raps',
    'hackfrucht',
    'kleegras',
  ];
  // stage 5a: the rows 23–30 of the table are the crops themselves (never in the maps – the shaders pick one per field)
  const CROPS = [
    'winterweizen',
    'wintergerste',
    'triticale',
    'sommergerste',
    'winterraps',
    'silomais',
    'kleegras',
    'kartoffel',
  ];
  const CROP0 = 23;
  // growth through the year: share of the peak rate in each month (southern Thuringia, ~450 m: starts in March, peak in May, a summer dip,
  // a little in autumn) – grassland growth curves (e.g. the Bavarian and Thuringian grassland guides) rounded
  const SHAPE = [0, 0, 0.12, 0.55, 1.0, 0.85, 0.55, 0.5, 0.45, 0.22, 0.05, 0];
  const MD = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  const M0 = [];
  {
    let a = 0;
    for (const d of MD) {
      M0.push(a);
      a += d;
    }
  }
  const monthOf = doy => {
    const d = Math.max(0, Math.min(364.99, doy - 1));
    let m = 11;
    while (m > 0 && d < M0[m]) m--;
    return m;
  };
  const shapeAt = doy => SHAPE[monthOf(doy)];
  // ∫ shape dd from day 1 to doy (shape-days), from a table per day (built once)
  const CUM = new Float32Array(367);
  for (let d = 1; d <= 366; d++) CUM[d] = CUM[d - 1] + shapeAt(d);
  const cum = doy => {
    const d = Math.max(0, Math.min(366, doy)),
      i = Math.floor(d);
    return CUM[i] + (i < 366 ? (CUM[i + 1] - CUM[i]) * (d - i) : 0);
  };
  // sRGB hex → [r, g, b] 0–1
  const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255);
  // the class table: h0 height after a cut or of the grazed sward (m), hMax the most it reaches uncut (m), g peak growth (m/day, May),
  // mow: { every: days, from, to } (regular mowing between two days of the year) or { cuts: [doy …], spread: ±days per field },
  // dens share of the blade slots used (0–1), w blade width (m – drawn a little wider than real: a 3 mm blade is less than a pixel a few
  // metres away), bend (0–1), flowers per m² at peak, seeds: seed heads in June (0–1),
  // col: blade colours fresh (April–May), summer (June–July), dry (August), autumn (October), winter (December–February), sRGB
  const lawnCol = { fresh: '#5f8f33', summer: '#5d8434', dry: '#83864a', autumn: '#5f7a3c', winter: '#77805a' },
    meadowCol = { fresh: '#5c8a2f', summer: '#62833a', dry: '#8c874b', autumn: '#6a7840', winter: '#827d5a' };
  const K = {
    0: { h0: 0, hMax: 0, g: 0, dens: 0, w: 0.0065, bend: 0.3, flowers: 0, seeds: 0, col: lawnCol },
    1: {
      h0: 0.035,
      hMax: 0.22,
      g: 0.0045,
      mow: { every: 7, from: 95, to: 300 },
      dens: 1,
      w: 0.006,
      bend: 0.25,
      flowers: 5,
      seeds: 0,
      col: lawnCol,
    },
    2: {
      h0: 0.05,
      hMax: 0.4,
      g: 0.007,
      mow: { every: 24, from: 100, to: 290 },
      dens: 0.92,
      w: 0.0065,
      bend: 0.35,
      flowers: 9,
      seeds: 0.2,
      col: lawnCol,
    },
    3: {
      h0: 0.07,
      hMax: 0.7,
      g: 0.012,
      mow: { cuts: [168, 258], spread: 12 },
      dens: 0.85,
      w: 0.0075,
      bend: 0.45,
      flowers: 14,
      seeds: 0.6,
      col: meadowCol,
    },
    4: {
      h0: 0.07,
      hMax: 0.95,
      g: 0.018,
      mow: { cuts: [158, 224], spread: 9 },
      dens: 0.9,
      w: 0.0075,
      bend: 0.5,
      flowers: 22,
      seeds: 1,
      col: meadowCol,
    },
    5: {
      h0: 0.05,
      hMax: 0.25,
      g: 0.006,
      mow: { every: 16, from: 120, to: 290 },
      dens: 0.85,
      w: 0.0065,
      bend: 0.4,
      flowers: 4,
      seeds: 0.3,
      col: lawnCol,
    },
    6: {
      h0: 0.08,
      hMax: 0.85,
      g: 0.016,
      mow: { cuts: [172, 245], spread: 10 },
      dens: 0.88,
      w: 0.0075,
      bend: 0.5,
      flowers: 18,
      seeds: 1,
      col: meadowCol,
    },
    7: { h0: 0.3, hMax: 1.2, g: 0.02, dens: 0.75, w: 0.009, bend: 0.55, flowers: 10, seeds: 1, col: meadowCol },
    8: { h0: 0.3, hMax: 1.3, g: 0.022, dens: 0.8, w: 0.01, bend: 0.5, flowers: 8, seeds: 0.8, col: meadowCol },
    9: { h0: 0, hMax: 0, g: 0, dens: 0, w: 0.0075, bend: 0.3, flowers: 0, seeds: 0, col: meadowCol },
    10: { h0: 0.2, hMax: 0.7, g: 0.012, dens: 0.5, w: 0.0075, bend: 0.45, flowers: 16, seeds: 0.8, col: meadowCol },
    11: { h0: 0, hMax: 0, g: 0, dens: 0, w: 0.0075, bend: 0.3, flowers: 0, seeds: 0, col: meadowCol },
    12: { h0: 0.15, hMax: 0.5, g: 0.01, dens: 0.3, w: 0.0075, bend: 0.4, flowers: 3, seeds: 0.5, col: meadowCol },
    13: { h0: 0, hMax: 0, g: 0, dens: 0, w: 0.0065, bend: 0.3, flowers: 0, seeds: 0, col: lawnCol },
    14: { h0: 0, hMax: 0, g: 0, dens: 0, w: 0.0065, bend: 0.3, flowers: 0, seeds: 0, col: lawnCol },
    15: {
      h0: 0.05,
      hMax: 0.3,
      g: 0.006,
      mow: { every: 30, from: 110, to: 285 },
      dens: 0.6,
      w: 0.0065,
      bend: 0.35,
      flowers: 4,
      seeds: 0.2,
      col: lawnCol,
    },
    16: {
      h0: 0.04,
      hMax: 0.2,
      g: 0.0045,
      mow: { every: 10, from: 100, to: 300 },
      dens: 0.9,
      w: 0.006,
      bend: 0.3,
      flowers: 3,
      seeds: 0,
      col: lawnCol,
    },
    17: {
      h0: 0.03,
      hMax: 0.15,
      g: 0.0045,
      mow: { every: 5, from: 90, to: 305 },
      dens: 1,
      w: 0.006,
      bend: 0.2,
      flowers: 1,
      seeds: 0,
      col: lawnCol,
    },
    // Falko's own lawn (the modelled garden): nobody mows it but the player (garden/garage_play.js, GRASS.cut) – it grows to ankle height
    18: {
      h0: 0.04,
      hMax: 0.18,
      g: 0.0045,
      dens: 1,
      w: 0.006,
      bend: 0.3,
      flowers: 6,
      seeds: 0.25,
      col: lawnCol,
    },
  };
  const NC = 32;
  // growth per class: its own monthly rates (m/day; the species table's wachstum_cm_tag) or the common curve × its peak rate g
  const CK = new WeakMap();
  function cumK(k, doy) {
    if (!k.rates) return k.g * cum(doy);
    let T = CK.get(k);
    if (!T) {
      T = new Float32Array(367);
      for (let d = 1; d <= 366; d++) T[d] = T[d - 1] + (k.rates[monthOf(d)] || 0);
      CK.set(k, T);
    }
    const d = Math.max(0, Math.min(366, doy)),
      i = Math.floor(d);
    return T[i] + (i < 366 ? (T[i + 1] - T[i]) * (d - i) : 0);
  }
  const rate = (k, doy) => (!k ? 0 : k.rates ? k.rates[monthOf(doy)] || 0 : k.g * shapeAt(doy));
  // in winter (mid-November to March) the stand lies down: its share k.winter (default 60 %) stays standing
  const lodge = (k, doy) => {
    const w = k && Number.isFinite(k.winter) ? k.winter : 0.6;
    return doy > 320
      ? 1 - (1 - w) * Math.min(1, (doy - 320) / 30)
      : doy < 70
        ? w
        : doy < 90
          ? w + ((1 - w) * (doy - 70)) / 20
          : 1;
  };
  // the stand left alone this year: grows from what the winter left with the year's growth, up to hMax
  function seasonH(k, doy) {
    if (!k || !(k.hMax > 0)) return 0;
    const base = Math.max(0.02, k.h0 * 0.7);
    return Math.min(k.hMax, base + cumK(k, doy)) * lodge(k, doy);
  }
  // regular mowing: every n days this month (a number, or 12 numbers by month – 0: not mowed that month)
  const everyNow = (m, doy) => (Array.isArray(m.every) ? m.every[monthOf(doy)] || 0 : m.every || 0);
  // a field whose cut days are shifted by off days and whose share draw is fs (0–1): its height on doy – the shader does the same per
  // blade, off and fs from the field's hash
  function heightAt(k, doy, off = 0, fs = 0) {
    if (!k || !(k.hMax > 0)) return 0;
    const hs = seasonH(k, doy),
      m = k.mow;
    if (!m) return hs;
    const grown = since => Math.min(hs, (k.h0 + Math.max(0, cumK(k, doy) - cumK(k, since))) * lodge(k, doy));
    if (m.every) {
      const a = m.from + off * 0.2,
        b = m.to + off * 0.2,
        n = everyNow(m, doy);
      if (doy > b) return grown(b);
      if (doy < a || !n) return doy < a ? grown(1) : hs;
      const ph = (((doy - a + off) % n) + n) % n;
      return grown(doy - Math.max(0.05, ph));
    }
    if (m.cuts) {
      let last = -1;
      m.cuts.forEach((c, i) => {
        if (c + off <= doy && fs < (m.share ? (m.share[i] ?? 1) : 1)) last = c + off;
      });
      return last < 0 ? hs : grown(last);
    }
    return hs;
  }
  // colour on doy: winter → fresh (April) → summer (late June) → dry (mid-August) → autumn (October) → winter (December)
  /** @type {Array<[number, string]>} */
  let KEYS = [
    [15, 'winter'],
    [75, 'winter'],
    [115, 'fresh'],
    [150, 'fresh'],
    [185, 'summer'],
    [228, 'dry'],
    [280, 'autumn'],
    [335, 'winter'],
    [380, 'winter'],
  ];
  function colour(k, doy) {
    const c = (k && k.col) || lawnCol;
    let d = doy < KEYS[0][0] ? doy + 365 : doy;
    for (let i = 0; i < KEYS.length - 1; i++) {
      const [d0, a] = KEYS[i],
        [d1, b] = KEYS[i + 1];
      if (d >= d0 && d <= d1) {
        const t = (d - d0) / Math.max(1, d1 - d0),
          A = hex(c[a] || c.summer),
          B = hex(c[b] || c.summer);
        return [0, 1, 2].map(j => A[j] + (B[j] - A[j]) * t);
      }
    }
    return hex(c.summer);
  }
  // seed heads: from late May until the field is cut, strongest mid-June; nothing in winter
  const seedK = (k, doy) =>
    !k || !(k.seeds > 0)
      ? 0
      : k.seeds * Math.max(0, Math.min(1, (doy - 140) / 18)) * Math.max(0, Math.min(1, (250 - doy) / 40));
  const lin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  // the shader's table: TW texels per class, texel (k, class) RGBA –
  //   k 0: h0, the uncut height now, the growth now (m/day), 0
  //   k 1: every (days, mown regularly now) – or 0 and the cuts: cut 1, cut 2 (day of year), spread (± days per field); regular mowing:
  //        every, from, to, 0; after the season: 0, to, 0, 2 (a last cut, ± 2 days); before it: 0, 1, 0, 0 (day 1: no cut this year)
  //   k 2: colour (linear), density
  //   k 3: width (m), bend, flowers per m², seed heads (0–1)
  //   k 4: cut 3, the shares of the fields cut on 1, 2, 3
  //   k 5: the vigour's factors (bits 5–7 of the map: 0 poor … 7 rich): density at 0 and at 7, height at 0 and at 7
  //   k 6: flowers at vigour 0 and 7; bare spots: the threshold of the shaders' value noise for their share, their size (m)
  //   k 7: feat/fotorealismus (foto-wald) – under trees (a wood's floor, BWARTEN flaechen[k].schirm and .flecken): the share of the
  //        direct sun and of the open sky that reach its plants (1, 1: open ground); its herb layer in patches: the size (m) of the
  //        shaders' soft field (0: evenly), the field's value above which its grasses stand (below it: bare litter)
  const TW = 8;
  const KRAFT = { d: [0.4, 1], h: [1, 1], f: [1, 1] };
  // the share of the area bare → the threshold of the value noise (hash on a lattice, smoothstep between) under which it is that share
  const NQ = [
    [0, 0],
    [0.01, 0.067],
    [0.02, 0.095],
    [0.05, 0.149],
    [0.1, 0.211],
    [0.15, 0.259],
    [0.2, 0.3],
    [0.3, 0.372],
    [0.4, 0.437],
    [0.5, 0.5],
  ];
  function kahlT(p) {
    if (!(p > 0)) return 0;
    if (p > 0.5) return 1 - kahlT(1 - Math.min(1, p)); // the noise is symmetric about 0.5
    for (let i = 1; i < NQ.length; i++)
      if (p <= NQ[i][0]) {
        const [a, ta] = NQ[i - 1],
          [b, tb] = NQ[i];
        return ta + ((p - a) / (b - a)) * (tb - ta);
      }
    return 0.5;
  }
  // feat/fotorealismus (foto-wald): the soft field a wood's herbs stand in patches by (the shaders' bwField, bw_halm.js: 0.7 of the
  // value noise at the patches' size and 0.3 of it at about a third of that) – the value under which it lies on the share p of the
  // area. From 40 000 draws of the same mix (a fixed seed), once.
  let FQ = null;
  function fieldT(p) {
    if (!FQ) {
      let a = 20261118;
      const R = () => {
          a = (a * 16807) % 2147483647;
          return (a - 1) / 2147483646;
        },
        sm = t => t * t * (3 - 2 * t),
        vn = () => {
          const u = sm(R()),
            v = sm(R());
          return (R() * (1 - u) + R() * u) * (1 - v) + (R() * (1 - u) + R() * u) * v;
        },
        n = 40000;
      FQ = new Float32Array(n);
      for (let i = 0; i < n; i++) FQ[i] = 0.7 * vn() + 0.3 * vn();
      FQ.sort();
    }
    const q = Math.max(0, Math.min(1, p)) * (FQ.length - 1),
      i = Math.floor(q);
    return p <= 0 ? -1 : p >= 1 ? 2 : FQ[i] + (FQ[Math.min(FQ.length - 1, i + 1)] - FQ[i]) * (q - i);
  }
  function table(doy, out) {
    const T = out || new Float32Array(TW * NC * 4);
    T.fill(0);
    for (let c = 0; c < NC; c++) {
      // (open ground until the class says otherwise)
      T.set([1, 1, 0, 0], c * TW * 4 + 28);
      const k = K[c];
      if (!k) continue;
      if (k.crop) {
        cropRow(k, doy, T, c * TW * 4);
        continue;
      }
      const o = c * TW * 4,
        m = k.mow || {},
        col = colour(k, doy);
      T[o] = k.h0;
      T[o + 1] = seasonH(k, doy);
      T[o + 2] = rate(k, doy) * lodge(k, doy);
      if (m.every) {
        const n = everyNow(m, doy);
        if (doy >= m.from && doy <= m.to && n) T.set([n, m.from, m.to, 0], o + 4);
        else if (doy > m.to) T.set([0, m.to, 0, 2], o + 4);
        else T.set([0, 1, 0, 0], o + 4);
        T.set([0, 1, 1, 1], o + 16);
      } else if (m.cuts) {
        T.set([0, m.cuts[0] || 0, m.cuts[1] || 0, m.spread || 0], o + 4);
        const sh = i => (m.share && Number.isFinite(m.share[i]) ? m.share[i] : 1);
        T.set([m.cuts[2] || 0, sh(0), sh(1), sh(2)], o + 16);
      }
      T[o + 8] = lin(col[0]);
      T[o + 9] = lin(col[1]);
      T[o + 10] = lin(col[2]);
      T[o + 11] = k.dens;
      T[o + 12] = k.w;
      T[o + 13] = k.bend;
      T[o + 14] = k.flowers;
      T[o + 15] = seedK(k, doy);
      const kr = k.kraft || KRAFT;
      T.set([kr.d[0], kr.d[1], kr.h[0], kr.h[1]], o + 20);
      T.set([kr.f[0], kr.f[1], kahlT(k.kahl || 0), k.fleck || 0.5], o + 24);
      // feat/fotorealismus (foto-wald): the light under its trees, its herb layer's patches
      const sc = k.schirm,
        pt = k.patch;
      T.set([sc ? sc.sun : 1, sc ? sc.sky : 1, pt ? pt.size : 0, pt ? fieldT(1 - pt.grass) : 0], o + 28);
    }
    return T;
  }
  // entries in the lead's own shape (tests, overrides): id → { …fields of K… }; unknown fields are ignored
  function merge(F) {
    if (!F || typeof F !== 'object') return 0;
    let n = 0;
    for (const [id, e] of Object.entries(F)) {
      const c = +id;
      if (!(c >= 0 && c < NC) || !e || typeof e !== 'object') continue;
      const k = (K[c] = Object.assign({}, K[c] || K[0]));
      for (const f of ['h0', 'hMax', 'g', 'dens', 'w', 'bend', 'flowers', 'seeds', 'winter'])
        if (Number.isFinite(e[f])) k[f] = e[f];
      if (Array.isArray(e.rates) && e.rates.length === 12) k.rates = e.rates.slice();
      if (e.mow && typeof e.mow === 'object') k.mow = e.mow;
      if (e.mow === null) delete k.mow;
      if (e.col && typeof e.col === 'object') k.col = Object.assign({}, k.col, e.col);
      // feat/fotorealismus (foto-wald)
      if (e.schirm !== undefined) k.schirm = e.schirm || undefined;
      if (e.patch !== undefined) k.patch = e.patch || undefined;
      n++;
    }
    return n;
  }
  // the helper's species table (BWARTEN, bewuchs/bw_arten.js): its areas (flaechen) become the class table – heights, monthly growth,
  // care, density; the blades' width, bend, colours and seed heads from the mix of its grasses; the flowers per m² summed. The lead's
  // class 18 (the garden's own lawn) takes the zierrasen's grasses and flowers but keeps its own care (only the player mows).
  const SEASONS = { frisch: 'fresh', sommer: 'summer', trocken: 'dry', herbst: 'autumn', winter: 'winter' };
  // ---------- stage 5a: the crops ----------
  const hexL = h =>
    typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h)
      ? [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16) / 255))
      : null;
  // a crop's phase on day d (its own year; a winter crop after its stubble: sown again in autumn, as if the same crop)
  function cropPhase(F, d) {
    const H = F.herbst || [];
    if (H.length && d >= H[0].von) for (const p of H) if (d >= p.von && d < p.bis + 1) return p;
    for (const p of F.jahr || []) if (d >= p.von && d < p.bis + 1) return p;
    return null;
  }
  // the crop's row of the table: its height today (grown within the phase), colour, how much of the ground it covers, its blade, its
  // ears; the harvest as a cut on each field's own day (± spread), the stubble standing until the plough
  // a crop on day d: its phase, the height it stands (within the harvest days each field is cut on its own day: until then it stands as
  // at the end of its last phase), its stubble's height, whether it is in its harvest days – null before its year (bw_blume.js: its plants)
  function cropNow(F, d) {
    const E = F.ernte || {},
      sp = E.streuung_tage || 0,
      L = F.jahr || [],
      ie = L.findIndex(q => q.name === 'ernte'),
      inH = Number.isFinite(E.doy) && ie > 0 && Math.abs(d - E.doy) <= sp;
    const p = inH ? L[ie - 1] : cropPhase(F, d);
    if (!p) return null;
    const t = inH ? 1 : Math.max(0, Math.min(1, (d - p.von) / Math.max(1, p.bis - p.von + 1))),
      st = L.find(q => q.name === 'stoppel');
    return {
      p,
      inH,
      sp,
      h: Array.isArray(p.hoehe_m) ? p.hoehe_m[0] + (p.hoehe_m[1] - p.hoehe_m[0]) * t : 0.1,
      stub: st && Array.isArray(st.hoehe_m) ? st.hoehe_m[0] : 0.15,
    };
  }
  function cropRow(k, d, T, o) {
    const F = k.crop,
      E = F.ernte || {},
      N = cropNow(F, d);
    if (!N) return;
    const { p, inH, sp } = N,
      hh = N.h,
      col = hexL(p.farbe) || [0.1, 0.18, 0.05],
      cover = 1 - Math.max(0, Math.min(1, Number.isFinite(p.boden) ? p.boden : 0.3)),
      stubble = N.stub;
    T[o] = inH ? stubble : hh;
    T[o + 1] = hh;
    T[o + 2] = 0;
    if (inH) {
      T[o + 5] = E.doy;
      T[o + 7] = sp;
      T[o + 17] = 1;
    }
    T.set([col[0], col[1], col[2], hh > 0.01 ? Math.max(0.05, cover) * k.dens : 0], o + 8);
    // the ears and panicles: seed heads on the blades while they stand
    const ears = !!(p.kopf || /aehre|rispe|bluete|reife|fahne/.test(p.name));
    // k3.z: the crop's plants from the acker atlas per m² (bw_blume.js; only in phases with a picture); k6.w: its rows' spacing (m, 0: none)
    T.set([k.w, k.bend, k.cards || 0, ears ? 0.85 : 0], o + 12);
    T.set([1, 1, 1, 1], o + 20);
    T.set([1, 1, 0, k.row || 0], o + 24);
  }
  function fromCrops(A) {
    const FF = (A && A.feldfruechte) || {};
    let n = 0;
    CROPS.forEach((id, i) => {
      const F = FF[id];
      if (!F || !Array.isArray(F.jahr)) return;
      const B = F.bestand || {},
        row = (B.reihe_cm || 12) / 100;
      // the blade: maize and potatoes broad and few, the cereals narrow and dense, rape between
      const w = id.includes('mais')
        ? 0.03
        : id === 'kartoffel'
          ? 0.02
          : id === 'winterraps'
            ? 0.012
            : id === 'kleegras'
              ? 0.008
              : 0.0055;
      const dens = id.includes('mais') ? 0.25 : id === 'kartoffel' ? 0.45 : id === 'winterraps' ? 0.8 : 1;
      K[CROP0 + i] = {
        crop: F,
        id,
        w,
        bend: id.includes('mais') ? 0.15 : 0.35,
        dens,
        // the plants drawn from the acker atlas per m² (bw_blume.js caps them by its slots): maize and potatoes as they stand, rape
        // thinner (its blades are the rest), the cereals a few ears over the blades' tips, clover grass its flowers
        cards: id.includes('mais') ? 9 : id === 'kartoffel' ? 4 : id === 'winterraps' ? 12 : id === 'kleegras' ? 6 : 4,
        row: row > 0.3 ? row : 0,
        h0: 0.15,
        hMax: 3,
        flowers: 0,
      };
      n++;
    });
    return n;
  }
  // the crops to choose for a field of each map class: [[row, cumulative share] …] (class 9: the district's shares)
  function cropChoice(A) {
    const sh = (A && A.flaechen && A.flaechen[9] && A.flaechen[9].feldfruechte) || {},
      pick = ids => {
        const L = ids.map(id => [id, sh[id] || 0.01]).filter(([id]) => CROPS.includes(id)),
          sum = L.reduce((a, [, w]) => a + w, 0) || 1;
        let acc = 0;
        return L.map(([id, w]) => [CROP0 + CROPS.indexOf(id), (acc += w / sum)]);
      };
    return {
      // (the shader takes four: the district's most frequent)
      9: pick(
        ['winterweizen', 'silomais', 'winterraps', 'wintergerste', 'kleegras', 'triticale', 'sommergerste', 'kartoffel']
          .sort((a, b) => (sh[b] || 0) - (sh[a] || 0))
          .slice(0, 4)
      ),
      19: pick(['winterweizen', 'wintergerste', 'triticale']),
      20: pick(['winterraps']),
      21: pick(['silomais', 'sommergerste', 'kartoffel']),
      22: pick(['kleegras']),
    };
  }
  function fromArten(A) {
    if (!A || !A.flaechen) return 0;
    const G = A.gras || {};
    let n = 0;
    for (const [id, e] of Object.entries(A.flaechen)) {
      const c = +id;
      if (!(c >= 0 && c < NC) || !e) continue;
      const k = Object.assign({}, K[c] || K[0]);
      if (!e.hoehe || !(e.dichte > 0)) {
        k.dens = 0;
        k.hMax = 0;
        K[c] = k;
        n++;
        continue;
      }
      const H = e.hoehe;
      if (Number.isFinite(H.gemaeht_m)) k.h0 = H.gemaeht_m;
      if (Number.isFinite(H.max_m)) k.hMax = H.max_m;
      if (Array.isArray(H.wachstum_cm_tag) && H.wachstum_cm_tag.length === 12)
        k.rates = H.wachstum_cm_tag.map(v => (+v || 0) / 100);
      if (Number.isFinite(H.winter)) k.winter = H.winter;
      k.dens = e.dichte;
      const P = e.pflege || {};
      if (P.art === 'rasen') k.mow = { every: P.alle_tage, from: P.von, to: P.bis, spread: P.streuung_tage || 0 };
      else if (P.art === 'schnitt' && Array.isArray(P.schnitte) && P.schnitte.length > 3) {
        // more than three cuts (public greens): drawn as regular mowing at their mean interval
        const d = P.schnitte.map(q => q.doy).sort((x, y) => x - y);
        k.mow = {
          every: Math.round((d[d.length - 1] - d[0]) / (d.length - 1)),
          from: d[0],
          to: d[d.length - 1],
          spread: Math.max(...P.schnitte.map(q => q.streuung_tage || 0)),
        };
      } else if (P.art === 'schnitt' && Array.isArray(P.schnitte) && P.schnitte.length) {
        const S3 = P.schnitte.slice(0, 3);
        k.mow = {
          cuts: S3.map(q => q.doy),
          spread: Math.max(...S3.map(q => q.streuung_tage || 0)),
          share: S3.map(q => (Number.isFinite(q.anteil) ? q.anteil : 1)),
        };
      } else if (P.art === 'weide') {
        // grazed: kept between its two heights – drawn like a sward cut every two to three weeks
        const hm = P.hoehe_m || [0.05, 0.2];
        k.h0 = hm[0];
        k.hMax = Math.min(k.hMax || hm[1], hm[1]);
        k.mow = { every: 18, from: P.von || 120, to: P.bis || 300, spread: 9 };
      } else delete k.mow;
      // the blades: a weighted mean of the grasses
      let wSum = 0,
        wid = 0,
        bend = 0,
        seeds = 0;
      const col = {};
      for (const [gid, share] of Object.entries(e.gras || {})) {
        const g = G[gid];
        if (!g || !(share > 0)) continue;
        wSum += share;
        const b = g.breite_mm || [3, 5];
        wid += share * ((b[0] + b[1]) / 2);
        bend += share * (Number.isFinite(g.biegung) ? g.biegung : 0.4);
        seeds += share * (g.aehre && Number.isFinite(g.aehre.anteil) ? g.aehre.anteil : 0);
        for (const [sk, en] of Object.entries(SEASONS)) {
          const h = g.farbe && g.farbe[sk];
          if (!h) continue;
          const v = hex(h);
          col[en] = (col[en] || [0, 0, 0]).map((x, i) => x + share * v[i]);
          col[en + 'W'] = (col[en + 'W'] || 0) + share;
        }
      }
      if (wSum > 0) {
        // drawn a little wider than real (a 3 mm blade is less than a pixel a few metres away)
        k.w = Math.max(0.0055, Math.min(0.012, ((wid / wSum) * 1.6) / 1000));
        k.bend = bend / wSum;
        k.seeds = Math.min(1, (seeds / wSum) * 1.5);
        const out = {};
        for (const en of Object.values(SEASONS))
          if (col[en])
            out[en] =
              '#' +
              col[en]
                .map(x => Math.round(Math.max(0, Math.min(1, x / col[en + 'W'])) * 255))
                .map(x => x.toString(16).padStart(2, '0'))
                .join('');
        k.col = Object.assign({}, k.col, out);
      }
      k.flowers = Object.values(e.blumen || {}).reduce((a, v) => a + (+v || 0), 0);
      // a bed class (stage 4): the plants per m² of its templates
      if (e.beete && A.beetvorlagen)
        k.flowers = Object.entries(e.beete).reduce(
          (a, [t, sh]) => a + (+sh || 0) * ((A.beetvorlagen[t] && A.beetvorlagen[t].dichte_m2) || 8),
          0
        );
      // the vigour of the place (the map's bits 5–7): a thin, poor sward or a rich one – a rich meadow has fewer flowers
      const pair = (v, d) => (Array.isArray(v) && v.length === 2 && v.every(Number.isFinite) ? v.slice() : d);
      if (e.kraft)
        k.kraft = {
          d: pair(e.kraft.dichte, KRAFT.d),
          h: pair(e.kraft.hoehe, KRAFT.h),
          f: pair(e.kraft.blumen, KRAFT.f),
        };
      // feat/fotorealismus (foto-wald): under trees – what of the sun and of the sky reaches the plants; the herb layer in patches
      const unit = (v, d) => (Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : d);
      delete k.schirm;
      delete k.patch;
      if (e.schirm) k.schirm = { sun: unit(e.schirm.sonne, 1), sky: unit(e.schirm.himmel, 1) };
      if (e.flecken && e.flecken.groesse_m > 0)
        k.patch = { size: Math.max(2, e.flecken.groesse_m), grass: Math.max(0.05, unit(e.flecken.gras, 1)) };
      // bare spots of their share and size
      if (e.kahl && Number.isFinite(e.kahl.anteil)) {
        k.kahl = Math.max(0, Math.min(0.9, e.kahl.anteil));
        const fm = e.kahl.flecken_m;
        k.fleck = Array.isArray(fm) && fm.length === 2 ? Math.max(0.15, (fm[0] + fm[1]) / 2) : 0.5;
      }
      K[c] = k;
      n++;
    }
    // the garden's own lawn: the zierrasen's look, its own care
    if (K[1] && K[18]) K[18] = Object.assign({}, K[1], { mow: undefined, hMax: Math.max(0.16, K[18].hMax || 0.18) });
    if (K[18]) delete K[18].mow;
    if (Array.isArray(A.farbjahr) && A.farbjahr.length > 2) {
      const fj = A.farbjahr
        .filter(q => Array.isArray(q) && SEASONS[q[1]])
        .map(q => /** @type {[number, string]} */ ([+q[0], SEASONS[q[1]]]));
      if (fj.length > 2) {
        fj.sort((a, b) => a[0] - b[0]);
        // wrap round the year: the last anchor before day 1 and the first after day 365
        KEYS = [[fj[fj.length - 1][0] - 365, fj[fj.length - 1][1]], ...fj, [fj[0][0] + 365, fj[0][1]]];
      }
    }
    return n;
  }
  return {
    CLASSES,
    K,
    NC,
    TW,
    SHAPE,
    seasonH,
    rate,
    colour,
    heightAt,
    cum,
    cumK,
    shapeAt,
    seedK,
    kahlT,
    fieldT,
    CROPS,
    CROP0,
    cropPhase,
    cropNow,
    fromCrops,
    cropChoice,
    everyNow,
    table,
    merge,
    fromArten,
  };
})();
