// ===================== feat/grenzland-zone: the border zone at the Grünes Band south of Eisfeld – data and pure helpers (GLZDATA) =====================
// Grenzland, Kapitel 2, Etappe 2. The zone: the Kolonnenweg from the old crossing point Eisfeld/Rottenbach (today the Grenzturm, a memorial
// with an exhibition) east and south-east into the Görsdorfer Heide, the strip between the way and the old border, the invented bunker's
// outside. Its ground and its data come from tools/grenzland/zone_gruenes_band.py (viz3/extra/grenzland-zone/dist/grenzland-zone/):
// zone.json (the Kolonnenweg's centre line with its profile, the old border, roads and tracks, places, the land cover, trees, the drive
// from Schleusingen) and welt/ (a tile set of welt/welt.js). This file has no scene and no imports – the texts, the names and the
// geometry that tests can check (viz3/test/unit/grenzland_zone.test.mjs); grenzland/gl_zone.js builds the zone from it.
// The Kolonnenweg as it was built (Wikipedia, „Fortifications of the inner German border“): two parallel lines of perforated concrete
// slabs, each about 0.75 m wide and 2.5 m long, with four rows of rectangular drainage holes.
export const GLZDATA = (() => {
  const D = {
    SUB: 'zonen/grenzland-zone/', // the tile set's name in welt/welt.js
    PFAD: 'grenzland-zone/', // below the site's base: zone.json, welt/
    NEAR: 2600, // m from the zone's middle: loaded nearer
    FAR: 3600, // … dropped farther (and not needed by a mission for KEEP s)
    KEEP: 15,
    // the slabs: 0.75 × 2.5 m, the two lanes' middles 1.5 m apart (0.75 m of grass between them), joints of a few centimetres
    PLATTE: { b: 0.75, l: 2.5, d: 0.12, spur: 0.75, fuge: 0.035, loch: [4, 12], lb: 0.12, ll: 0.15, tief: 0.075 },
  };
  // ---- names of the places (KERN.place, the radar, GLZONE.ort) ----
  D.ORTE = {
    kolonnenweg_a: 'Kolonnenweg am Grenzturm',
    kolonnenweg_b: 'Kolonnenweg Richtung Görsdorf',
    bunker: 'Altes Fundament in der Heide',
    museum: 'Grenzturm Eisfeld – Gedenkstätte',
    heide: 'Görsdorfer Heide',
    parkplatz: 'Parkplatz am Grenzturm',
    hide: 'Beobachtungsstand in der Heide',
    ankunft: 'Coburger Straße, von Eisfeld-Süd',
    ankunft_nord: 'Coburger Straße, aus Eisfeld',
  };
  D.PLATZ = {
    zone: 'Grünes Band bei Eisfeld',
    weg: 'Kolonnenweg',
    heide: 'Görsdorfer Heide (Naturschutzgebiet)',
    turm: 'Grenzturm Eisfeld',
  };
  // ---- the texts of the boards, in our words, with their sources ----
  D.TAFEL = {
    titel: 'KOLONNENWEG UND GRÜNES BAND',
    zeilen: [
      'LOCHBETONPLATTEN, ZWEI SPUREN',
      'STREIFENWEG DER GRENZTRUPPEN',
      'BIS 1989',
      'HEUTE NATIONALES NATURMONUMENT',
    ],
    lesen: [
      'Kolonnenweg: Auf zwei Spuren aus gelochten Betonplatten fuhren die Grenztruppen der DDR bis 1989 ihre Streifen entlang der Grenze.',
      'Zwischen diesem Weg und der Grenzlinie lagen der Kontrollstreifen und der Grenzzaun. Seit 1990 wachsen hier Heide, Birken und Kiefern.',
      'Das Grüne Band ist in Thüringen seit 2018 Nationales Naturmonument. Quellen: Wikipedia „Fortifications of the inner German border“, Wikivoyage „Grünes Band“.',
    ],
  };
  D.MUSEUM = {
    titel: 'GEDENKSTÄTTE GRENZTURM',
    zeilen: ['GRENZÜBERGANGSSTELLE', 'EISFELD - ROTTENBACH', 'ERÖFFNET 21.6.1973', 'TÄGLICH 8 - 18 UHR'],
    lesen: [
      'Gedenkstätte Innerdeutsche Grenze: der Grenzturm der früheren Grenzübergangsstelle Eisfeld/Rottenbach, eröffnet am 21. Juni 1973, heute mit einer Ausstellung.',
      'Geöffnet täglich 8 bis 18 Uhr (ohne Gewähr). Quellen: Bundesarchiv, „Grenzübergangsstellen für den Bezirk Suhl“; whichmuseum.com.',
    ],
    oh: 'Mo-Su 08:00-18:00',
    quelle: 'whichmuseum.com (11/2026, ohne Gewähr)',
  };
  D.NSG = { titel: 'NATURSCHUTZGEBIET', zeilen: ['GÖRSDORFER HEIDE'] };
  D.BAND = { titel: 'GRÜNES BAND', zeilen: ['NATIONALES NATURMONUMENT'] };
  D.QUELLEN = [
    'Bundesarchiv: Grenzübergangsstellen für den Bezirk Suhl (Eisfeld/Rottenbach, 21.6.1973) – https://www.bundesarchiv.de/themen-entdecken/online-entdecken/themenbeitraege/grenzuebergangsstellen-fuer-den-bezirk-suhl/',
    'Wikipedia: Fortifications of the inner German border (Kolonnenweg: 0,75 × 2,5 m, zwei Spuren) – https://en.wikipedia.org/wiki/Fortifications_of_the_inner_German_border',
    'Wikivoyage: Grünes Band (Deutschland) – https://de.wikivoyage.org/wiki/Gr%C3%BCnes_Band_(Deutschland)',
    'OpenStreetMap: Kolonnenweg (surface=grass_paver), Innerdeutsche Grenze, NSG Görsdorfer Heide – © OpenStreetMap-Mitwirkende, ODbL',
  ];
  // ---- the drive between the square's world and the zone: where the A 73 ends in the region's road data (welt/fahrt.js) ----
  // southbound end of the A 73 in the data (model metres) and its heading; the way back starts on the northbound carriageway
  D.A73 = {
    ende: [2619, -1058],
    hd: 137.6, // degrees, compass
    zurueck: [2558, -974, 317.6], // where one comes back: on the northbound carriageway, towards Schleusingen
    r: 90, // m around the end: a vehicle heading on there goes to the zone
    titel: 'A 73 · Richtung Coburg',
    unter: 'Ausfahrt Eisfeld-Süd',
    ort: 'ankunft',
    heim: ['A 73 · Richtung Suhl', 'Schleusingen'],
  };
  // the way over the Landstraße (the Simson may not take the motorway): the L 3004 leaves the region's road data east of the square,
  // south-east towards Eisfeld (zone.json anfahrt_land); one comes in through Eisfeld town on the Coburger Straße
  D.LAND = {
    ende: [1637, -2526],
    hd: 97,
    zurueck: [1600, -2522, 277], // back on the L 3004, westbound towards Ratscher
    r: 90,
    titel: 'L 3004 · Richtung Eisfeld',
    unter: 'über die Landstraße nach Eisfeld',
    ort: 'ankunft_nord',
    heim: ['L 3004 · Richtung Schleusingen', 'Ratscher'],
  };
  // which way a vehicle takes: the Simson the Landstraße, everything else the motorway
  D.strecke = id => (id === 'gl-moped' ? D.LAND : D.A73);
  // ---------------------------------------------------------------- pure helpers ----------------------------------------------------------------
  // a fixed random from a seed
  D.zufall = seed => {
    let s = seed >>> 0 || 1;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  };
  D.inRect = (r, x, y, m = 0) => !!r && x >= r[0] - m && x <= r[2] + m && y >= r[1] - m && y <= r[3] + m;
  // base64 → bytes (browser and node)
  D.bytes = b64 => {
    const s =
        typeof atob === 'function'
          ? atob(b64)
          : /** @type {any} */ (globalThis).Buffer.from(b64, 'base64').toString('binary'),
      u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i);
    return u;
  };
  // a line of zone.json (x, y in dm, z in cm – the Kolonnenweg; or x, y in dm – stride 2) → { x, y, z, s } in metres
  D.linie = (p, stride = 3) => {
    const n = Math.floor(p.length / stride),
      L = { n, x: new Float64Array(n), y: new Float64Array(n), z: new Float64Array(n), s: new Float64Array(n) };
    for (let i = 0; i < n; i++) {
      L.x[i] = p[i * stride] / 10;
      L.y[i] = p[i * stride + 1] / 10;
      L.z[i] = stride > 2 ? p[i * stride + 2] / 100 : 0;
      if (i) L.s[i] = L.s[i - 1] + Math.hypot(L.x[i] - L.x[i - 1], L.y[i] - L.y[i - 1]);
    }
    L.len = n ? L.s[n - 1] : 0;
    return L;
  };
  // the point at s metres along a line: { x, y, z, hd (compass, radians) }
  D.bei = (L, s) => {
    const n = L.n;
    if (n < 2) return { x: L.x[0] || 0, y: L.y[0] || 0, z: L.z[0] || 0, hd: 0 };
    s = Math.max(0, Math.min(L.len, s));
    let lo = 0,
      hi = n - 1;
    while (hi - lo > 1) {
      const m = (lo + hi) >> 1;
      if (L.s[m] <= s) lo = m;
      else hi = m;
    }
    const ds = L.s[hi] - L.s[lo] || 1,
      t = (s - L.s[lo]) / ds,
      dx = L.x[hi] - L.x[lo],
      dy = L.y[hi] - L.y[lo];
    return { x: L.x[lo] + dx * t, y: L.y[lo] + dy * t, z: L.z[lo] + (L.z[hi] - L.z[lo]) * t, hd: Math.atan2(dx, dy) };
  };
  // the nearest point of a line to (x, y): { s, d (m), lat (m, + to the right of the direction of travel), z, i (segment) }
  D.naechst = (L, x, y) => {
    let best = { s: 0, d: Infinity, lat: 0, z: 0, i: 0 };
    for (let i = 0; i < L.n - 1; i++) {
      const ax = L.x[i],
        ay = L.y[i],
        dx = L.x[i + 1] - ax,
        dy = L.y[i + 1] - ay,
        l2 = dx * dx + dy * dy || 1e-9,
        t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)),
        px = ax + dx * t,
        py = ay + dy * t,
        d = Math.hypot(x - px, y - py);
      if (d < best.d) {
        const l = Math.sqrt(l2);
        best = {
          s: L.s[i] + t * l,
          d,
          lat: ((x - ax) * dy - (y - ay) * dx) / l,
          z: L.z[i] + (L.z[i + 1] - L.z[i]) * t,
          i,
        };
      }
    }
    return best;
  };
  // the slabs along a line: for each lane (−1 left, +1 right) one slab every length + joint – { x, y, z, hd, spur, k, kipp, quer, roh }
  // k: 0 whole, 1 cracked, 2 sunk at one end, 3 missing (a gap of earth and grass, as along the real way); a little play in heading and
  // height so the joints show, the same every time (seed)
  D.platten = (L, o = {}) => {
    const PL = Object.assign({}, D.PLATTE, o),
      R = D.zufall(o.seed || 1973),
      out = [],
      step = PL.l + PL.fuge,
      n = Math.floor(L.len / step);
    for (let i = 0; i < n; i++) {
      const s = (i + 0.5) * step,
        q = D.bei(L, s),
        a = D.bei(L, s - PL.l / 2),
        b = D.bei(L, s + PL.l / 2),
        nx = Math.cos(q.hd),
        ny = -Math.sin(q.hd);
      for (const spur of [-1, 1]) {
        const r = R(),
          k = r < 0.012 ? 3 : r < 0.07 ? 1 : r < 0.1 ? 2 : 0,
          off = spur * (PL.spur / 2 + PL.b / 2) + (R() - 0.5) * 0.05;
        out.push({
          x: q.x + nx * off,
          y: q.y + ny * off,
          z: q.z + (R() - 0.5) * 0.02,
          hd: q.hd + (R() - 0.5) * 0.012,
          spur,
          k,
          kipp: Math.atan2(b.z - a.z, PL.l), // pitch along the way
          quer: (R() - 0.5) * 0.02, // a little roll
          roh: R(),
          s,
        });
      }
    }
    return out;
  };
  // the land cover grid of zone.json (its bytes inflated: zlib) → { at(E, N) → class } (0 open, 1 conifers, 2 heath, 3 bare,
  // 4 broadleaves; −1 outside); E, N in UTM (welt/welt.js WELT.toU)
  D.bewuchs = (b, px) => {
    return {
      px,
      at(E, N) {
        const i = Math.floor((E - b.E0) / b.step),
          j = Math.floor((N - b.N0) / b.step);
        if (i < 0 || j < 0 || i >= b.nx || j >= b.ny) return -1;
        return px[j * b.nx + i];
      },
    };
  };
  // the trees of zone.json → Float32Array [x, y, z, h, kind] × n (model metres)
  D.baeume = t => {
    const u = D.bytes(t.b64),
      a = new Int16Array(u.buffer, u.byteOffset, Math.floor(u.length / 2)),
      n = Math.floor(a.length / 5),
      f = new Float32Array(n * 5);
    for (let i = 0; i < n; i++) {
      f[i * 5] = a[i * 5] / 10 + t.o[0];
      f[i * 5 + 1] = a[i * 5 + 1] / 10 + t.o[1];
      f[i * 5 + 2] = a[i * 5 + 2] / 10;
      f[i * 5 + 3] = a[i * 5 + 3] / 10;
      f[i * 5 + 4] = a[i * 5 + 4];
    }
    return f;
  };
  // the drive there (zone.json anfahrt: x, y in dm) → [[x, y], …]; thinned to step metres for the radar
  D.anfahrt = (af, step = 0) => {
    if (!af || !af.p) return [];
    const out = [];
    let lx = 1e9,
      ly = 1e9;
    for (let i = 0; i + 1 < af.p.length; i += 2) {
      const x = af.p[i] / 10,
        y = af.p[i + 1] / 10,
        last = i + 2 >= af.p.length;
      if (!step || last || Math.hypot(x - lx, y - ly) >= step) {
        out.push([x, y]);
        lx = x;
        ly = y;
      }
    }
    return out;
  };
  // which leg of the drive one is on (A 73, K 530 …) at s metres from Schleusingen
  D.abschnitt = (af, s) => {
    let nm = '';
    for (const [n, at] of (af && af.abschnitte) || []) if (s >= at) nm = n;
    return nm;
  };
  // heading difference in degrees (−180 … 180)
  D.dWinkel = (a, b) => ((((a - b) % 360) + 540) % 360) - 180;
  return D;
})();
if (typeof window !== 'undefined') window.GLZDATA = GLZDATA;
