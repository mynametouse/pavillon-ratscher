// ===================== feat/verkehr-real 1: today's vehicles of the region as geometry – cars, vans, lorries, the tractor (VKTYPEN) =====================
// Falko, 13.11.2026 12:14: „die Autos sehen noch sehr künstlich bzw. eckig und schemenartig aus. Bitte möglichst realistische Modelle
// wählen“; 12:45 chosen: built after the real measures, without makers' marks (docs/plans/plan_verkehr.md). The types of today in Südthüringen,
// each after one real model's measures (length, width, height, wheelbase, overhangs, tyres – the model named in the comment, never in the
// game), shaped by the body builder of the Grenzland mode (grenzland/gl_karosse.js, read only; okayed by the Grenzland chat 13.11. 12:55)
// and its small parts (GLTYPEN.parts). No badges, no lettering, plates without numbers. Pure: no scene, no DOM (unit tests
// viz3/test/unit/verkehr_real.test.mjs, pictures without a browser viz3/extra/verkehr-real/werkzeug/bild.mjs).
//   VKTYPEN.TYP[typ]   measures in the vehicle frame (x right, y forward, z up, metres; origin on the ground under the centre of mass):
//                      yf, yr (the ends), hw (half width), h, a, b (front and rear axle), rw (wheel radius), tw (tyre width), track,
//                      trackR, mass (kg, as it drives), cls: 'pkw' | 'lfz' (van) | 'lkw' | 'trak', vmax (km/h), name (what it is, in German),
//                      p (the shape's parameters), zug (a trailer: its type)
//   VKTYPEN.bau(typ, o) → { typ, T, body: parts, axF, axR, tris }   o: { col (the paint), col2 (a second paint: roof, box), rim }
//                      parts: { name: { pos, nor, col } } in three's frame – 'lack0' … paint, 'matt' (vertex colours), 'chrom', 'glas',
//                      'head', 'tail', 'blink' (lamps), 'innen' (what one sees through the glass)
import { GLKAROSSE as K } from '../grenzland/gl_karosse.js';
import { GLTYPEN } from '../grenzland/gl_typen.js';
export const VKTYPEN = (() => {
  const { rgb, hex, fillet } = K,
    mix = (a, b, t) => a + (b - a) * t;
  const { schild, wischer, innen } = GLTYPEN.parts;
  const C = {
    black: rgb(14, 14, 15),
    rubber: rgb(22, 22, 23),
    dark: rgb(36, 37, 39),
    plastic: rgb(28, 29, 31),
    grey: rgb(70, 72, 75),
    steel: rgb(120, 122, 125),
    silver: rgb(172, 175, 178),
    alu: rgb(196, 198, 200),
    white: rgb(236, 236, 232),
    plate: rgb(236, 236, 228),
    plateBlue: rgb(26, 58, 160),
    amber: rgb(232, 130, 20),
    red: rgb(150, 14, 12),
    lens: rgb(214, 220, 226),
    cloth: rgb(46, 47, 50),
    liner: rgb(170, 168, 162),
    dash: rgb(26, 27, 29),
    frame: rgb(24, 24, 26),
    tank: rgb(150, 152, 155),
    tyre: rgb(18, 18, 19),
  };
  // ---- the measures: L × W × H, wheelbase, front overhang, tyres → the frame (origin at the centre of mass) ----
  // m: { L, W, H, WB, OF (front overhang), tr (front track), trR, tyre: [width mm, ratio %, rim inch], front (share of the weight on the
  // front axle), mass, cls, vmax, name, p }
  function mass(m) {
    const a = (1 - m.front) * m.WB, // the centre of mass lies nearer the heavier axle
      b = a - m.WB,
      yf = a + m.OF,
      yr = yf - m.L,
      [tw, ra, rim] = m.tyre,
      rw = (rim * 25.4) / 2000 + (tw * ra) / 100000;
    return {
      yf,
      yr,
      hw: m.W / 2,
      h: m.H,
      a,
      b,
      rw: Math.round(rw * 1000) / 1000,
      tw: tw / 1000,
      rimR: (rim * 25.4) / 2000,
      track: m.tr,
      trackR: m.trR || m.tr,
      mass: m.mass,
      cls: m.cls,
      vmax: m.vmax,
      name: m.name,
      p: m.p || {},
    };
  }
  const TYP = {
    // ---- cars (sources: the makers' data sheets as given on de.wikipedia.org for each model, checked 13.11.2026 from memory of
    // them – measures within a centimetre or two) ----
    // after the VW Golf 8: 4284 × 1789 × 1456 mm, wheelbase 2636, 205/55 R 16
    kompakt: mass({
      L: 4.284,
      W: 1.789,
      H: 1.456,
      WB: 2.636,
      OF: 0.873,
      tr: 1.543,
      trR: 1.513,
      tyre: [205, 55, 16],
      front: 0.61,
      mass: 1350,
      cls: 'pkw',
      vmax: 210,
      name: 'Kompaktwagen',
      p: { heck: 'schraeg', belt: 0.675, ws: 0.36, run: 0.86, tail: 0.36, nose: 0.53, grille: 'schmal', lamp: 'schmal', spokes: 5 },
    }),
    // after the Ford Focus IV: 4378 × 1825 × 1454, 2700, 215/55 R 17
    kompakt2: mass({
      L: 4.378,
      W: 1.825,
      H: 1.454,
      WB: 2.7,
      OF: 0.86,
      tr: 1.567,
      trR: 1.556,
      tyre: [215, 55, 17],
      front: 0.6,
      mass: 1400,
      cls: 'pkw',
      vmax: 205,
      name: 'Kompaktwagen',
      p: { heck: 'schraeg', belt: 0.65, ws: 0.3, run: 0.92, tail: 0.38, nose: 0.52, grille: 'trapez', lamp: 'keil', spokes: 10 },
    }),
    // after the VW Polo VI: 4053 × 1751 × 1461, 2552, 185/65 R 15
    klein: mass({
      L: 4.053,
      W: 1.751,
      H: 1.461,
      WB: 2.552,
      OF: 0.8,
      tr: 1.525,
      trR: 1.505,
      tyre: [185, 65, 15],
      front: 0.62,
      mass: 1180,
      cls: 'pkw',
      vmax: 190,
      name: 'Kleinwagen',
      p: { heck: 'schraeg', belt: 0.66, ws: 0.32, run: 0.82, tail: 0.28, nose: 0.54, grille: 'schmal', lamp: 'schmal', spokes: 0 },
    }),
    // after the Opel Corsa F: 4060 × 1765 × 1435, 2538, 195/55 R 16
    klein2: mass({
      L: 4.06,
      W: 1.765,
      H: 1.435,
      WB: 2.538,
      OF: 0.82,
      tr: 1.53,
      trR: 1.51,
      tyre: [195, 55, 16],
      front: 0.62,
      mass: 1170,
      cls: 'pkw',
      vmax: 195,
      name: 'Kleinwagen',
      p: { heck: 'schraeg', belt: 0.655, ws: 0.28, run: 0.88, tail: 0.36, nose: 0.53, grille: 'wabe', lamp: 'keil', spokes: 5 },
    }),
    // after the VW up!: 3600 × 1641 × 1489, 2420, 165/70 R 14
    mini: mass({
      L: 3.6,
      W: 1.641,
      H: 1.489,
      WB: 2.42,
      OF: 0.66,
      tr: 1.428,
      trR: 1.424,
      tyre: [165, 70, 14],
      front: 0.6,
      mass: 1000,
      cls: 'pkw',
      vmax: 170,
      name: 'Kleinstwagen',
      p: { heck: 'steil', belt: 0.62, ws: 0.2, run: 0.78, tail: 0.1, nose: 0.55, grille: 'schmal', lamp: 'rund', spokes: 0 },
    }),
    // after the Škoda Octavia IV Combi: 4689 × 1829 × 1468, 2686, 205/55 R 16
    kombi: mass({
      L: 4.689,
      W: 1.829,
      H: 1.468,
      WB: 2.686,
      OF: 0.904,
      tr: 1.543,
      trR: 1.524,
      tyre: [205, 55, 16],
      front: 0.6,
      mass: 1450,
      cls: 'pkw',
      vmax: 220,
      name: 'Kombi',
      p: { heck: 'kombi', belt: 0.645, ws: 0.4, run: 0.88, tail: 0.15, nose: 0.53, grille: 'breit', lamp: 'keil', spokes: 5, rails: true },
    }),
    // after the VW Passat Variant B8: 4767 × 1832 × 1477, 2786, 215/60 R 16
    kombi2: mass({
      L: 4.767,
      W: 1.832,
      H: 1.477,
      WB: 2.786,
      OF: 0.904,
      tr: 1.584,
      trR: 1.568,
      tyre: [215, 60, 16],
      front: 0.6,
      mass: 1550,
      cls: 'pkw',
      vmax: 220,
      name: 'Kombi',
      p: {
        heck: 'kombi',
        belt: 0.645,
        ws: 0.42,
        run: 0.86,
        tail: 0.17,
        nose: 0.54,
        grille: 'leisten',
        lamp: 'schmal',
        spokes: 10,
        rails: true,
        chromeSims: true,
      },
    }),
    // after the BMW 3 Series G20: 4709 × 1827 × 1442, 2851, 225/50 R 17 (no kidneys: a plain grille)
    limo: mass({
      L: 4.709,
      W: 1.827,
      H: 1.442,
      WB: 2.851,
      OF: 0.79,
      tr: 1.575,
      trR: 1.587,
      tyre: [225, 50, 17],
      front: 0.51,
      mass: 1550,
      cls: 'pkw',
      vmax: 235,
      name: 'Mittelklasse-Limousine',
      p: { heck: 'stufe', belt: 0.64, ws: 0.62, run: 0.98, tail: 0.5, boot: 0.5, nose: 0.5, grille: 'breit', lamp: 'keil', spokes: 5 },
    }),
    // after the VW Tiguan II: 4486 × 1839 × 1673, 2681, 215/65 R 17
    suv: mass({
      L: 4.486,
      W: 1.839,
      H: 1.673,
      WB: 2.681,
      OF: 0.91,
      tr: 1.585,
      trR: 1.575,
      tyre: [215, 65, 17],
      front: 0.58,
      mass: 1650,
      cls: 'pkw',
      vmax: 200,
      name: 'SUV',
      p: { heck: 'suv', belt: 0.67, ws: 0.4, run: 0.84, tail: 0.2, nose: 0.56, grille: 'leisten', lamp: 'schmal', spokes: 10, rails: true, clad: true, zb: 0.19 },
    }),
    // after the Dacia Duster II: 4341 × 1804 × 1693, 2676, 215/65 R 16
    suv2: mass({
      L: 4.341,
      W: 1.804,
      H: 1.693,
      WB: 2.676,
      OF: 0.822,
      tr: 1.56,
      trR: 1.567,
      tyre: [215, 65, 16],
      front: 0.6,
      mass: 1350,
      cls: 'pkw',
      vmax: 180,
      name: 'SUV',
      p: { heck: 'suv', belt: 0.655, ws: 0.36, run: 0.8, tail: 0.18, nose: 0.57, grille: 'wabe', lamp: 'keil', spokes: 5, rails: true, clad: 2, zb: 0.21 },
    }),
    // after the VW ID.3: 4261 × 1809 × 1568, 2771, 215/55 R 18 (short bonnet, closed nose, the roof dark)
    elektro: mass({
      L: 4.261,
      W: 1.809,
      H: 1.568,
      WB: 2.771,
      OF: 0.73,
      tr: 1.536,
      trR: 1.548,
      tyre: [215, 55, 18],
      front: 0.47,
      mass: 1800,
      cls: 'pkw',
      vmax: 160,
      name: 'Elektroauto',
      p: { heck: 'schraeg', belt: 0.6, ws: -0.02, run: 1.02, tail: 0.24, nose: 0.5, grille: 'zu', lamp: 'schmal', spokes: 10, roof2: true },
    }),
    // ---- vans ----
    // after the VW Caddy V: 4500 × 1855 × 1797, 2755, 205/60 R 16
    hochdach: mass({
      L: 4.5,
      W: 1.855,
      H: 1.797,
      WB: 2.755,
      OF: 0.88,
      tr: 1.586,
      trR: 1.56,
      tyre: [205, 60, 16],
      front: 0.58,
      mass: 1600,
      cls: 'lfz',
      vmax: 180,
      name: 'Hochdachkombi',
      p: { van: 'hochdach', belt: 0.56, ws: 0.18, run: 0.78, glas: 'rundum', spokes: 0 },
    }),
    // after the VW Transporter T6.1 (short): 4904 × 1904 × 1990, 3000, 215/65 R 16 C
    transporter: mass({
      L: 4.904,
      W: 1.904,
      H: 1.99,
      WB: 3.0,
      OF: 0.95,
      tr: 1.628,
      trR: 1.628,
      tyre: [215, 65, 16],
      front: 0.55,
      mass: 2200,
      cls: 'lfz',
      vmax: 170,
      name: 'Transporter',
      p: { van: 'transporter', belt: 0.6, ws: 0.0, run: 0.7, glas: 'vorn', spokes: 0 },
    }),
    // after the Mercedes-Benz Sprinter (W907), L2H2: 5932 × 2020 × 2720, 3665, 235/65 R 16 C
    sprinter: mass({
      L: 5.932,
      W: 2.02,
      H: 2.72,
      WB: 3.665,
      OF: 0.97,
      tr: 1.73,
      trR: 1.72,
      tyre: [235, 65, 16],
      front: 0.48,
      mass: 2900,
      cls: 'lfz',
      vmax: 160,
      name: 'Kastenwagen',
      p: { van: 'sprinter', belt: 0.5, ws: 0.1, run: 0.72, glas: 'vorn', spokes: 0 },
    }),
    // ---- lorries: cab over the front axle (sources: the makers' brochures as summarised on de.wikipedia.org) ----
    // after a MAN TGM 18-tonne box lorry: 9600 × 2550 × 3750, wheelbase 5000, 295/80 R 22.5
    lkw: mass({
      L: 9.6,
      W: 2.55,
      H: 3.75,
      WB: 5.0,
      OF: 1.42,
      tr: 2.04,
      trR: 1.83,
      tyre: [295, 80, 22.5],
      front: 0.45,
      mass: 13000,
      cls: 'lkw',
      vmax: 89,
      name: 'Lkw',
      p: { cab: 'mittel', aufbau: 'koffer' },
    }),
    // after a MAN TGX 4×2 tractor unit: 6000 × 2550 × 3900 (high cab), wheelbase 3600, 315/70 R 22.5; the semi-trailer: zug
    sattel: mass({
      L: 6.0,
      W: 2.55,
      H: 3.9,
      WB: 3.6,
      OF: 1.42,
      tr: 2.05,
      trR: 1.83,
      tyre: [315, 70, 22.5],
      front: 0.55,
      mass: 9000,
      cls: 'lkw',
      vmax: 89,
      name: 'Sattelzug',
      p: { cab: 'hoch', aufbau: 'sattel' },
    }),
    // a box semi-trailer: 13 600 mm box, three axles 1310 mm apart, 385/65 R 22.5; the axles' middle 2.6 m ahead of the rear end, the
    // king pin 1.6 m behind the front (the trailer's frame: origin at the axles' middle)
    auflieger: {
      yf: 11.0,
      yr: -2.6,
      hw: 1.275,
      h: 4.0,
      a: 0,
      b: 0,
      rw: 0.538,
      tw: 0.385,
      rimR: 0.286,
      track: 2.04,
      trackR: 2.04,
      mass: 22000,
      cls: 'zug',
      vmax: 89,
      name: 'Sattelauflieger',
      p: { aufbau: 'auflieger' },
    },
    // after a three-axle refuse truck with a low cab (Mercedes-Benz Econic 2630): 10 000 × 2550 × 3600, 3900 + 1350
    muell: mass({
      L: 10.0,
      W: 2.55,
      H: 3.6,
      WB: 4.575,
      OF: 1.4,
      tr: 2.05,
      trR: 1.83,
      tyre: [315, 80, 22.5],
      front: 0.4,
      mass: 20000,
      cls: 'lkw',
      vmax: 85,
      name: 'Müllwagen',
      p: { cab: 'niedrig', aufbau: 'muell' },
    }),
    // ---- the tractor of the farms: after a Fendt 724 Vario (4970 × 2550 × 3030, 2783, 600/70 R 30 · 710/70 R 42), a tipping trailer ----
    traktor: mass({
      L: 4.97,
      W: 2.55,
      H: 3.03,
      WB: 2.783,
      OF: 1.25,
      tr: 2.0,
      trR: 2.0,
      tyre: [600, 70, 30],
      front: 0.4,
      mass: 8500,
      cls: 'trak',
      vmax: 50,
      name: 'Traktor',
      p: { rear: [710, 70, 42] },
    }),
    // a tandem tipping trailer for the tractor (a centre-axle trailer, 14 t): 6 600 × 2 500 × 2 600, the axles 1 300 apart at the box's
    // middle, 560/60 R 22.5, the drawbar's eye 1.7 m ahead of the box
    kipper: {
      yf: 3.4,
      yr: -3.2,
      hw: 1.25,
      h: 2.75,
      a: 0,
      b: 0,
      rw: 0.55,
      tw: 0.56,
      rimR: 0.286,
      track: 1.95,
      trackR: 1.95,
      mass: 9000,
      cls: 'zug',
      vmax: 40,
      name: 'Kipper',
      p: { aufbau: 'kipper' },
    },
  };
  // the rear axle of the big tyres of the tractor
  {
    const T = TYP.traktor,
      [w, r, rim] = T.p.rear;
    T.rwR = (rim * 25.4) / 2000 + (w * r) / 100000;
    T.twR = w / 1000;
    T.rimRR = (rim * 25.4) / 2000;
  }
  // a semi-trailer behind: the hitch on the tractor (y in its frame), the king pin on the trailer (y in the trailer's frame)
  TYP.sattel.zug = 'auflieger';
  TYP.sattel.hitch = TYP.sattel.b + 0.45;
  TYP.auflieger.kp = TYP.auflieger.yf - 1.6;
  TYP.traktor.zug = 'kipper';
  TYP.traktor.hitch = TYP.traktor.yr - 0.35;
  TYP.kipper.kp = TYP.kipper.yf + 1.7; // the drawbar's eye ahead of the box
  for (const T of Object.values(TYP)) {
    T.hl = (T.yf - T.yr) / 2;
    T.cy = (T.yf + T.yr) / 2;
    T.wb = T.a - T.b;
  }

  // ======================= small parts =======================
  // a door mirror of today: a black foot on the door's top corner, the housing in the paint (or black), its glass facing back
  function spiegel(k, B, s, y, z, part = 'lack0', col = [1, 1, 1], big = 1) {
    const x = B.x(y, z);
    k.pad('matt', [s * (x + 0.03), y + 0.02, z], [0.07, 0.07, 0.04], 0.012, C.plastic);
    k.at({ p: [s * (x + 0.13 * big), y, z + 0.04 * big], rz: s * 0.08 }, () => {
      k.pad(part, [0, 0, 0], [0.2 * big, 0.085, 0.12 * big], 0.035, col);
      k.box('chrom', [0, -0.044, 0], [0.17 * big, 0.004, 0.095 * big], C.alu, 'f');
    });
  }
  // a flush door handle on the side at (y, z)
  function griff(k, B, s, y, z, col = C.dark, part = 'matt') {
    k.pad(part, B.side(s, y, z, 0.006), [0.02, 0.17, 0.03], 0.01, col);
  }
  // a plate without numbers: white field, the blue EU strip on its left
  function kennzeichen(k, x, y, z, dir, w = 0.52, h = 0.11) {
    schild(k, x, y, z, dir, w, h);
    k.box('matt', [x - dir * (w / 2 - 0.022), y + dir * 0.006, z], [0.04, 0.006, h - 0.004], C.plateBlue);
  }
  // roof rails along the roof's edges between ya and yb (j: the ring point of the edge)
  function reling(k, B, ya, yb, col) {
    for (const s of [-1, 1]) {
      const rail = [];
      for (let i = 0; i < B.Y.length; i++) {
        const y = B.Y[i];
        if (y < ya || y > yb) continue;
        const p = B.R[i][19];
        rail.push([s * (p[0] - 0.02), p[1], p[2] + 0.045]);
      }
      if (rail.length > 1) {
        k.tube('matt', rail, 0.014, 6, col, { caps: 1, flat: [0.8, 1.2] });
        for (const t of [0.06, 0.94]) {
          const q = rail[Math.round(t * (rail.length - 1))];
          k.pad('matt', [q[0], q[1], q[2] - 0.03], [0.03, 0.08, 0.05], 0.01, col);
        }
      }
    }
  }
  // the front (dir +1) or rear (−1) of a body as a map over (x, z): the foremost (rearmost) y of the faces built so far – one pass over
  // the triangles (a ray per lamp corner through ten thousand faces would take seconds per type); lookups bilinear
  // raw: k.done() right after the body (three's frame: x, z, −y)
  function endMap(raw, dir, hw, H, re = /^(lack0|matt)$/) {
    const ST = 0.01,
      nx = Math.ceil((2 * hw + 0.2) / ST) + 1,
      nz = Math.ceil((H + 0.1) / ST) + 1,
      x0 = -hw - 0.1,
      M = new Float32Array(nx * nz).fill(NaN);
    for (const [name, q] of Object.entries(raw)) {
      if (!re.test(name)) continue;
      const p = q.pos;
      for (let i = 0; i < p.length; i += 9) {
        const ax = p[i],
          ay = -p[i + 2],
          az = p[i + 1],
          bx = p[i + 3],
          by = -p[i + 5],
          bz = p[i + 4],
          cx = p[i + 6],
          cy = -p[i + 8],
          cz = p[i + 7],
          det = (bx - ax) * (cz - az) - (cx - ax) * (bz - az);
        if (Math.abs(det) < 1e-12) continue;
        // only faces looking out of this end (not the inner shell seen through the glass, not the far side)
        {
          const ux = bx - ax,
            uy = by - ay,
            uz = bz - az,
            vx = cx - ax,
            vy = cy - ay,
            vz = cz - az,
            ny = uz * vx - ux * vz,
            nl = Math.hypot(uy * vz - uz * vy, ny, ux * vy - uy * vx) || 1;
          if ((ny / nl) * dir < 0.08) continue;
        }
        const i0 = Math.max(0, Math.ceil((Math.min(ax, bx, cx) - x0) / ST)),
          i1 = Math.min(nx - 1, Math.floor((Math.max(ax, bx, cx) - x0) / ST)),
          j0 = Math.max(0, Math.ceil(Math.min(az, bz, cz) / ST)),
          j1 = Math.min(nz - 1, Math.floor(Math.max(az, bz, cz) / ST));
        for (let j = j0; j <= j1; j++) {
          const z = j * ST;
          for (let ii = i0; ii <= i1; ii++) {
            const x = x0 + ii * ST,
              u = ((x - ax) * (cz - az) - (cx - ax) * (z - az)) / det,
              v = ((bx - ax) * (z - az) - (x - ax) * (bz - az)) / det;
            if (u < -1e-6 || v < -1e-6 || u + v > 1 + 1e-6) continue;
            const y = ay + u * (by - ay) + v * (cy - ay),
              q2 = j * nx + ii,
              o = M[q2];
            if (o !== o || (dir > 0 ? y > o : y < o)) M[q2] = y;
          }
        }
      }
    }
    const at = (ii, j) => M[Math.max(0, Math.min(nz - 1, j)) * nx + Math.max(0, Math.min(nx - 1, ii))];
    return (x, z) => {
      const fx = (x - x0) / ST,
        fz = z / ST,
        ii = Math.floor(fx),
        j = Math.floor(fz),
        tx = fx - ii,
        tz = fz - j;
      let s = 0,
        w = 0;
      for (const [di, dj, ww] of [
        [0, 0, (1 - tx) * (1 - tz)],
        [1, 0, tx * (1 - tz)],
        [0, 1, (1 - tx) * tz],
        [1, 1, tx * tz],
      ]) {
        const v = at(ii + di, j + dj);
        if (v === v && ww > 0) {
          s += v * ww;
          w += ww;
        }
      }
      return w > 0 ? s / w : NaN;
    };
  }
  // a patch lying on an end face (map from endMap): x from xa to xb, its lower and upper edge at u ∈ [0, 1] from edge(u) → [z0, z1],
  // pushed out by d; dir +1 the front, −1 the rear (outside facing ±y)
  function patch(k, part, col, map, dir, xa, xb, edge, d = 0.005, nu = 8, nv = 2) {
    const R = [];
    for (let i = 0; i <= nv; i++) {
      const row = [];
      for (let j = 0; j <= nu; j++) {
        const u = j / nu,
          [z0, z1] = typeof edge === 'function' ? edge(u) : edge,
          z = mix(z0, z1, i / nv);
        // beyond the face's edge (the shoulder's round, the plan's corner) the point moves in until it lies on the face
        let x = mix(xa, xb, u),
          y = map(x, z);
        for (let t = 0; y !== y && t < 60; t++) {
          x -= Math.sign(x) * 0.005;
          y = map(x, z);
        }
        row.push([x, (y === y ? y : 0) + dir * d, z]);
      }
      R.push(row);
    }
    // rows go up, columns along x: outside is +y when x grows; the rear's patches run the other way
    const flip = (xb > xa) !== dir > 0;
    k.grid(R, () => [part, col], { flip });
  }
  // the plan of an end: [y, half width] keys from the full width (y0) to the cap (y1), rounded by the exponent e
  function ende(y0, y1, hw, cut, e = 2.4, n = 7) {
    const out = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      out.push([mix(y0, y1, u), hw * (1 - cut * Math.pow(u, e))]);
    }
    return out;
  }

  // ======================= cars of today: one body, shaped by the type's parameters =======================
  // p: heck ('schraeg' hatch, 'steil' upright hatch, 'kombi' estate, 'stufe' saloon, 'suv'), belt (the waist at the B pillar, share of
  // the height), ws (the windscreen's foot behind the front axle, m), run (the screen's run back to the roof, m), tail (from the rear end
  // to the roof's rear edge, m), boot (a saloon's boot lid, m), nose (the bonnet's front edge, share of the height), grille, lamp,
  // spokes (0: a plain steel wheel with a cover), rails (roof rails), clad (black plastic round the arches and along the sills: 1 or 2),
  // zb (the ground clearance), chromeSims (a chrome line under the windows), roof2 (the roof and pillars dark)
  function pkw(k, T, o) {
    const P = T.p,
      { yf, yr, hw, a, b } = T,
      H = T.h,
      roofZ = H - 0.015,
      belt = P.belt * H,
      yF = yf - 0.04,
      yR = yr + 0.04,
      suv = P.heck === 'suv',
      y3 = a - P.ws,
      y2 = y3 - P.run,
      noseZ = P.nose * H,
      zb0 = P.zb || 0.15;
    let y1, y0;
    if (P.heck === 'stufe') {
      y0 = yR + P.boot;
      y1 = y0 + 0.62;
    } else {
      y1 = yR + P.tail;
      y0 = yR + (P.heck === 'kombi' || suv ? 0.05 : P.heck === 'steil' ? 0.04 : 0.09);
    }
    const yB = y3 - 1.04, // the B pillar
      yC = b + T.rw + 0.16, // the rear door's end (over the arch)
      yD = Math.max(y1 + 0.22, yC - 0.02), // the estate's third window ends at the D pillar
      pr = T.rw + 0.06; // the arches' radius
    // the plan: the nose rounder than the tail
    const D = {
      y0: yR,
      y1: yF,
      hw: [...ende(yR + 0.6, yR, hw, 0.17, 2.3).reverse(), [b, hw], [a - 0.5, hw], ...ende(yF - 0.9, yF, hw, 0.3, 2.0)],
      zb: [
        [yR, zb0 + 0.21],
        [yR + 0.25, zb0 + 0.1],
        [b - pr - 0.05, zb0 + 0.03],
        [b + pr + 0.05, zb0],
        [a - pr - 0.05, zb0],
        [a + pr + 0.08, zb0 + 0.05],
        [yF - 0.22, zb0 + 0.09],
        [yF, zb0 + 0.16],
      ],
      // the shoulder: rising to the rear (the wedge of today), down over the front wing to the lamps
      sh: [
        [yR, belt - 0.05],
        [yR + 0.12, belt + 0.03],
        [b, belt + 0.045],
        [yB, belt + 0.01],
        [y3, belt - 0.015],
        [a, belt - 0.075],
        [yF - 0.35, noseZ + 0.025],
        [yF - 0.12, noseZ - 0.03],
        [yF - 0.04, noseZ - 0.08],
        [yF, noseZ - 0.15],
      ],
      deck: [
        [yR, belt - 0.04],
        [yR + 0.12, belt + 0.04],
        [y0, belt + 0.05],
        [y3, belt + 0.025],
        [a, belt - 0.04],
        [yF - 0.35, noseZ + 0.045],
        [yF - 0.12, noseZ - 0.005],
        [yF - 0.04, noseZ - 0.06],
        [yF, noseZ - 0.14],
      ],
      dp: 2,
      rs: [
        [yR, 0.05],
        [y3, 0.06],
        [yF, 0.1],
      ],
      rl: 0.08,
      tuck: 0.06,
      sl: 0.025,
      zw: zb0 + 0.38,
      ztrim: belt - 0.26,
      gin: 0.1,
      pw: 0.075,
      cab: {
        y0,
        y1,
        y2,
        y3,
        roof:
          P.heck === 'stufe'
            ? [
                [y1, roofZ - 0.06],
                [yB - 0.15, roofZ],
                [y2, roofZ - 0.05],
              ]
            : [
                [y1, roofZ - (P.heck === 'schraeg' ? 0.1 : P.heck === 'steil' ? 0.035 : 0.04)],
                [yC, roofZ - (P.heck === 'schraeg' ? 0.035 : 0.012)],
                [yB - 0.1, roofZ],
                [y2, roofZ - 0.045],
              ],
        crown: 0.035,
        wr: [
          [y1, hw * 0.64],
          [yB, hw * 0.71],
          [y2, hw * 0.67],
        ],
        rr: 0.085,
        bowF: [0.14, 0.07],
        bowR: P.heck === 'stufe' ? [0.12, 0.06] : [0.06, 0.03],
        sideGlass:
          P.heck === 'kombi' || suv
            ? [
                [y1 + 0.08, yD - 0.06],
                [yD + 0.035, yB - 0.05],
                [yB + 0.05, y3 - 0.02],
              ]
            : [
                [P.heck === 'stufe' ? y1 + 0.1 : Math.max(y1 + 0.06, b + 0.2), yB - 0.05],
                [yB + 0.05, y3 - 0.02],
              ],
      },
      arches: [
        { y: a, r: pr, zc: T.rw + 0.02 },
        { y: b, r: pr, zc: T.rw + 0.02 },
      ],
      seams: [a - pr - 0.06, yB, yC],
      zone: {
        sims: P.chromeSims ? ['chrom', C.alu] : ['matt', C.plastic],
        schweller: P.clad ? ['matt', C.plastic] : ['lack0'],
        naht: ['matt', C.black],
      },
      farbe: (zn, y, j) => {
        // the dark roof and pillars of the electric car; the black plastic round the arches of the SUVs
        if (P.roof2 && (zn === 'dach' || zn === 'dachkante' || zn === 'saeule')) return ['matt', C.black];
        if (P.clad && j >= 3 && j <= (P.clad === 2 ? 7 : 6)) {
          const r = pr + (P.clad === 2 ? 0.07 : 0.05);
          if (Math.abs(y - a) < r || Math.abs(y - b) < r) return ['matt', C.plastic];
          if (j <= 4) return ['matt', C.plastic];
        }
        return undefined;
      },
      inner: o.lod ? false : { trim: C.dash, liner: C.liner },
    };
    const B = K.body(k, D),
      raw = k.done(),
      EF = endMap(raw, 1, hw, H),
      ER = endMap(raw, -1, hw, H);
    // ---- front: everything lies on the face (flush patches), mirrored ----
    const zl = noseZ - 0.075, // the lamps' line
      ga = P.grille;
    for (const s of [-1, 1]) {
      // the headlamp: a band from beside the grille out round the corner – a wedge rising outward, a slim strip, or the small car's
      // tall lamp; its day light along the lower edge, the indicator at the outer end
      const xi = s * hw * (P.lamp === 'rund' ? 0.5 : 0.4),
        xo = s * hw * (P.lamp === 'rund' ? 0.86 : 0.9),
        band =
          P.lamp === 'keil'
            ? u => [zl - 0.045 + 0.02 * u, zl + 0.03 + 0.03 * u]
            : P.lamp === 'rund'
              ? u => [zl - 0.07 + 0.02 * Math.sin(u * Math.PI), zl + 0.06 - 0.02 * Math.sin(u * Math.PI)]
              : u => [zl - 0.03 + 0.012 * u, zl + 0.03 + 0.012 * u];
      patch(k, 'head', C.lens, EF, 1, xi, xo, band, 0.006, 10, 2);
      patch(k, 'chrom', C.silver, EF, 1, mix(xi, xo, 0.1), mix(xi, xo, 0.92), u => {
        const [z0, z1] = band(mix(0.1, 0.92, u));
        return [mix(z0, z1, 0.3), mix(z0, z1, 0.85)];
      }, 0.009, 8, 1);
      patch(k, 'head', [1, 1, 1], EF, 1, mix(xi, xo, 0.06), mix(xi, xo, 0.8), u => {
        const z0 = band(mix(0.06, 0.8, u))[0];
        return [z0 + 0.006, z0 + 0.018];
      }, 0.012, 8, 1);
      patch(k, 'blink', C.amber, EF, 1, mix(xi, xo, 0.82), mix(xi, xo, 0.97), u => {
        const [z0, z1] = band(mix(0.82, 0.97, u));
        return [mix(z0, z1, 0.25), mix(z0, z1, 0.75)];
      }, 0.011, 2, 1);
      // the fog lamps' recesses at the bumper's corners
      patch(k, 'matt', C.black, EF, 1, s * hw * 0.62, s * hw * 0.8, u => [zb0 + 0.12 + 0.02 * u, zb0 + 0.21 + 0.01 * u], 0.005, 4, 1);
    }
    // the grille between the lamps (none on the electric car: a dark band joins its lamps)
    if (ga === 'zu') patch(k, 'matt', C.black, EF, 1, -hw * 0.42, hw * 0.42, [zl - 0.015, zl + 0.03], 0.005, 8, 1);
    else {
      const gw = ga === 'trapez' ? 0.5 : ga === 'schmal' ? 0.42 : 0.44,
        gz = ga === 'schmal' ? [zl - 0.03, zl + 0.028] : ga === 'breit' ? [zl - 0.09, zl + 0.03] : [zl - 0.075, zl + 0.03];
      patch(
        k,
        'matt',
        C.black,
        EF,
        1,
        -hw * gw,
        hw * gw,
        ga === 'trapez' ? u => [gz[0] + 0.03 * Math.abs(u * 2 - 1), gz[1]] : gz,
        0.006,
        10,
        2
      );
      // its bars: chrome lines (leisten), a fine grey mesh (wabe, trapez), one bright line (schmal)
      const bars = ga === 'leisten' ? 3 : ga === 'schmal' ? 1 : 2;
      for (let i = 0; i < bars; i++) {
        const t = (i + 1) / (bars + 1),
          z = mix(gz[0], gz[1], t);
        patch(k, ga === 'leisten' || ga === 'schmal' ? 'chrom' : 'matt', ga === 'leisten' || ga === 'schmal' ? C.alu : C.grey, EF, 1, -hw * (gw - 0.03), hw * (gw - 0.03), [z - 0.004, z + 0.004], 0.009, 10, 1);
      }
    }
    // the lower intake across the bumper with two bars, the black lip under it
    {
      const z0 = zb0 + 0.06,
        z1 = zb0 + (ga === 'zu' ? 0.14 : 0.2);
      patch(k, 'matt', C.black, EF, 1, -hw * 0.58, hw * 0.58, u => [z0 + 0.015 * Math.abs(u * 2 - 1), z1 - 0.01 * Math.abs(u * 2 - 1)], 0.005, 10, 2);
      for (const t of [0.35, 0.68]) patch(k, 'matt', C.grey, EF, 1, -hw * 0.54, hw * 0.54, [mix(z0, z1, t) - 0.004, mix(z0, z1, t) + 0.004], 0.008, 10, 1);
      patch(k, 'matt', C.plastic, EF, 1, -hw * 0.86, hw * 0.86, [zb0 + 0.005, zb0 + 0.045], 0.004, 12, 1);
      if (suv) patch(k, 'chrom', C.silver, EF, 1, -hw * 0.4, hw * 0.4, [zb0 + 0.02, zb0 + 0.05], 0.008, 6, 1);
    }
    kennzeichen(k, 0, EF(0, zb0 + 0.27) + 0.008, zb0 + 0.27, 1, 0.52, 0.11);
    // ---- rear ----
    const kombiLike = P.heck === 'kombi' || suv,
      zt = belt - 0.035;
    for (const s of [-1, 1]) {
      // the tail lamp: a band from the boot or tailgate out round the corner, deeper on the estates and SUVs
      const xi = s * hw * (P.heck === 'stufe' ? 0.36 : 0.48),
        xo = s * hw * 0.97,
        band = u => (kombiLike ? [zt - 0.08 + 0.03 * u, zt + 0.045 + 0.015 * u] : [zt - 0.045 + 0.02 * u, zt + 0.04 + 0.01 * u]);
      patch(k, 'tail', C.red, ER, -1, xi, xo, band, 0.006, 10, 2);
      patch(k, 'blink', C.amber, ER, -1, mix(xi, xo, 0.55), mix(xi, xo, 0.75), u => {
        const [z0, z1] = band(mix(0.55, 0.75, u));
        return [z0 + 0.012, mix(z0, z1, 0.4)];
      }, 0.009, 2, 1);
      patch(k, 'head', [0.85, 0.85, 0.85], ER, -1, mix(xi, xo, 0.3), mix(xi, xo, 0.48), u => {
        const [z0, z1] = band(mix(0.3, 0.48, u));
        return [z0 + 0.012, mix(z0, z1, 0.4)];
      }, 0.009, 2, 1);
      // the reflectors low in the bumper
      patch(k, 'tail', C.red, ER, -1, s * hw * 0.72, s * hw * 0.9, [zb0 + 0.2, zb0 + 0.23], 0.006, 3, 1);
    }
    {
      const zp = P.heck === 'stufe' ? belt - 0.24 : belt - 0.27;
      kennzeichen(k, 0, ER(0, zp) - 0.008, zp, -1, 0.52, 0.11);
      patch(k, 'matt', C.black, ER, -1, hw * 0.8, -hw * 0.8, [zb0 + 0.03, zb0 + 0.15], 0.005, 12, 2);
      if (suv) patch(k, 'chrom', C.silver, ER, -1, hw * 0.45, -hw * 0.45, [zb0 + 0.07, zb0 + 0.1], 0.008, 6, 1);
    }
    if (P.heck !== 'stufe') {
      // the third brake light at the roof's end, the rear wiper on the glass
      const yb = y1 + 0.03,
        zr = B.top(yb, 0);
      k.box('tail', [0, yb, zr + 0.004], [0.26, 0.04, 0.012], C.red);
      const gl = (x, t) => {
        const y = mix(y0, y1, t);
        return [x, y, B.top(y, x) + 0.012];
      };
      k.tube('matt', [gl(0, 0.12), gl(hw * 0.25, 0.45), gl(hw * 0.5, 0.6)], 0.007, 5, C.black);
    }
    // ---- the shut lines of the bonnet (and of the tailgate): thin dark lines on the paint ----
    for (const s of o.lod ? [] : [-1, 1]) {
      const line = [];
      for (let i = 0; i <= 8; i++) {
        const y = mix(y3 + 0.03, yF - 0.16, i / 8),
          x = s * hw * mix(0.7, 0.6, i / 8);
        line.push([x, y, B.top(y, x) + 0.002]);
      }
      k.tube('matt', line, 0.0035, 3, C.black);
      if (P.heck !== 'stufe')
        patch(k, 'matt', C.black, ER, -1, s * hw * 0.66, s * hw * 0.665, [zb0 + 0.33, belt - 0.07], 0.003, 1, 4);
    }
    // ---- sides: mirrors, handles, rails, the aerial ----
    for (const s of [-1, 1]) {
      spiegel(k, B, s, y3 - 0.14, belt + 0.05, P.roof2 ? 'matt' : 'lack0', P.roof2 ? C.black : [1, 1, 1]);
      if (o.lod) continue;
      griff(k, B, s, yB - 0.1, belt - 0.07, P.chromeSims ? C.alu : C.dark, P.chromeSims ? 'chrom' : 'matt');
      griff(k, B, s, yC + 0.12, belt - 0.06, P.chromeSims ? C.alu : C.dark, P.chromeSims ? 'chrom' : 'matt');
      // the side indicator on the wing
      k.pad('blink', B.side(s, a - pr - 0.16, belt - 0.11, 0.003), [0.01, 0.06, 0.018], 0.004, C.amber);
    }
    if (P.rails) reling(k, B, y1 + 0.12, y2 - 0.2, suv || P.chromeSims ? C.alu : C.black);
    if (o.lod) return { B };
    k.pad('matt', [0, y1 + 0.18, B.top(y1 + 0.18, 0) + 0.025], [0.05, 0.15, 0.05], 0.02, C.black);
    wischer(k, B, -hw * 0.66, -hw * 0.06, y3 - 0.02, y3 - 0.32);
    wischer(k, B, hw * 0.02, hw * 0.6, y3 - 0.02, y3 - 0.32);
    innen(k, B, D, T, o, {
      floor: zb0 + 0.18,
      seat: C.cloth,
      seatZ: zb0 + 0.42,
      seatY: yB + 0.32,
      seatX: hw * 0.4,
      seatW: 0.5,
      bench: yC + 0.32,
      dash: C.dash,
      wheel: C.dash,
      wheelR: 0.185,
      head: true,
      rearWall: y0 + 0.1,
    });
    return { B };
  }

  // ======================= vans: one box over a short bonnet =======================
  // p.van: 'hochdach' (the tall estate: glass all round, a tailgate), 'transporter' (the panel van: glass in the cab only, a tailgate),
  // 'sprinter' (the big panel van: high roof, wing doors)
  function van(k, T, o) {
    const P = T.p,
      { yf, yr, hw, a, b } = T,
      H = T.h,
      roofZ = H - 0.02,
      belt = P.belt * H + (P.van === 'sprinter' ? 0.12 : 0),
      yF = yf - 0.04,
      yR = yr + 0.04,
      y3 = a - P.ws,
      y2 = y3 - P.run,
      y1 = yR + 0.04,
      y0 = yR + 0.03,
      yB = y3 - (P.van === 'hochdach' ? 1.06 : 1.0),
      big = P.van === 'sprinter',
      zb0 = big ? 0.24 : P.van === 'transporter' ? 0.2 : 0.17,
      pr = T.rw + 0.07,
      noseZ = belt - (big ? 0.34 : P.van === 'transporter' ? 0.36 : 0.32),
      glasAll = P.glas === 'rundum';
    const D = {
      y0: yR,
      y1: yF,
      hw: [...ende(yR + 0.3, yR, hw, 0.05, 3).reverse(), [b, hw], [a - 0.6, hw], ...ende(yF - 0.7, yF, hw, 0.19, 2.4)],
      zb: [
        [yR, zb0 + 0.18],
        [yR + 0.2, zb0 + 0.06],
        [b - pr, zb0],
        [a + pr, zb0 + 0.04],
        [yF - 0.2, zb0 + 0.1],
        [yF, zb0 + 0.17],
      ],
      sh: [
        [yR, belt + 0.02],
        [y3, belt],
        [a, belt - 0.12],
        [yF - 0.25, noseZ + 0.06],
        [yF - 0.06, noseZ - 0.02],
        [yF, noseZ - 0.09],
      ],
      deck: [
        [yR, belt + 0.02],
        [y3, belt + 0.03],
        [a, belt - 0.09],
        [yF - 0.25, noseZ + 0.09],
        [yF - 0.06, noseZ + 0.01],
        [yF, noseZ - 0.08],
      ],
      rs: [
        [yR, 0.05],
        [y3, 0.05],
        [yF, 0.1],
      ],
      rl: 0.07,
      tuck: 0.04,
      sl: 0.02,
      zw: zb0 + 0.42,
      ztrim: zb0 + 0.42,
      gin: 0.06,
      pw: 0.085,
      cab: {
        y0,
        y1,
        y2,
        y3,
        roof: [
          [y1, roofZ - 0.02],
          [yB, roofZ],
          [y2, roofZ - (big ? 0.12 : 0.06)],
        ],
        crown: big ? 0.05 : 0.04,
        wr: [
          [y1, hw - 0.1],
          [y2, hw - (big ? 0.16 : 0.13)],
        ],
        rr: 0.09,
        bowF: [0.1, 0.05],
        bowR: [0.02, 0.01],
        sideGlass: glasAll
          ? [
              [y1 + 0.35, b + pr + 0.05],
              [b + pr + 0.12, yB - 0.05],
              [yB + 0.05, y3 - 0.02],
            ]
          : [[yB + 0.05, y3 - 0.02]],
        rearGlass: P.van !== 'sprinter' ? true : false,
      },
      arches: [
        { y: a, r: pr, zc: T.rw + 0.02 },
        { y: b, r: pr, zc: T.rw + 0.02 },
      ],
      seams: glasAll ? [a - pr - 0.05, yB, b + pr + 0.08] : [a - pr - 0.05, yB, yB - (big ? 1.25 : 1.05)],
      zone: { schweller: ['matt', C.plastic], naht: ['matt', C.black], sims: ['matt', C.plastic] },
      inner: o.lod ? false : { trim: C.dash, liner: C.liner, y0: glasAll ? undefined : yB - 0.1 },
    };
    const B = K.body(k, D);
    // front: a black grille between the lamps, the bumper in black plastic
    const zl = noseZ - 0.06;
    k.pad('matt', [0, B.end(0, zl - 0.1, 1) - 0.01, zl - 0.08], [hw * 1.2, 0.04, 0.16], 0.02, C.black);
    for (let i = 0; i < 3; i++)
      k.box('chrom', [0, B.end(0, zl - 0.1, 1) + 0.012, zl - 0.12 + i * 0.045], [hw * 1.1, 0.01, 0.01], C.silver);
    k.pad('matt', [0, B.end(0, zb0 + 0.2, 1) - 0.04, zb0 + 0.2], [hw * 1.9, 0.12, 0.28], 0.04, C.plastic);
    for (const s of [-1, 1]) {
      const x = hw * 0.72,
        y = B.end(s * x, zl, 1);
      k.at({ p: [s * x, y - 0.03, zl], rz: -s * 0.42 }, () => {
        k.pad('head', [0, 0, 0], [hw * 0.42, 0.08, big ? 0.16 : 0.12], 0.025, C.lens);
        k.box('chrom', [0, 0.012, 0], [hw * 0.38, 0.05, big ? 0.13 : 0.09], C.silver);
        k.box('blink', [s * hw * 0.15, 0.03, 0.02], [0.06, 0.02, 0.05], C.amber);
      });
      spiegel(k, B, s, y3 - 0.16, belt + 0.1, 'matt', C.black, 1.35);
      griff(k, B, s, yB + 0.18, belt - 0.08, C.dark);
      // the rear lamps up the corners
      const yr2 = B.end(s * (hw - 0.08), belt, -1);
      k.pad('tail', [s * (hw - 0.08), yr2 + 0.02, belt - 0.1], [0.13, 0.05, big ? 0.6 : 0.42], 0.02, C.red);
      k.box('blink', [s * (hw - 0.08), yr2 - 0.006, belt + 0.16], [0.1, 0.012, 0.06], C.amber);
      // a rub strip along the side
      const strip = [];
      for (let y = b - 0.5; y <= a - 0.5; y += 0.3) strip.push(B.side(s, y, zb0 + 0.45, 0.006));
      if (strip.length > 1) k.tube('matt', strip, 0.03, 5, C.plastic, { flat: [0.5, 1] });
      // the sliding door's rail on the right
      if (s > 0 && !glasAll) {
        const rail = [];
        for (let y = b + 0.1; y <= yB - 0.1; y += 0.3) rail.push(B.side(s, y, belt + 0.02, 0.006));
        if (rail.length > 1) k.tube('matt', rail, 0.012, 4, C.black, { flat: [0.6, 1] });
      }
    }
    kennzeichen(k, 0, B.end(0, zb0 + 0.24, 1) - 0.06, zb0 + 0.24, 1, 0.52, 0.11);
    // rear: the doors' gap, the handle, the plate, the bumper with its step
    if (big) k.box('matt', [0, yR - 0.004, (zb0 + roofZ) / 2], [0.014, 0.01, roofZ - zb0 - 0.4], C.black);
    k.box('matt', [0.08, yR - 0.012, belt - 0.15], [0.05, 0.02, 0.14], C.dark);
    kennzeichen(k, 0, yR - 0.04, zb0 + 0.38, -1, 0.52, 0.11);
    k.pad('matt', [0, yR + 0.02, zb0 + 0.16], [hw * 1.92, 0.12, 0.2], 0.04, C.plastic);
    if (o.lod) return { B };
    wischer(k, B, -hw * 0.6, -hw * 0.06, y3 - 0.03, y3 - 0.33);
    wischer(k, B, hw * 0.02, hw * 0.56, y3 - 0.03, y3 - 0.33);
    innen(k, B, D, T, o, {
      floor: zb0 + 0.3,
      seat: C.cloth,
      seatZ: zb0 + 0.62,
      seatY: yB + 0.4,
      seatX: hw * 0.45,
      seatW: 0.5,
      bench: glasAll ? b + pr + 0.45 : null,
      dash: C.dash,
      wheel: C.dash,
      wheelR: 0.2,
      head: true,
      rearWall: glasAll ? y0 + 0.2 : yB + 0.06,
    });
    if (!glasAll)
      k.quad2(
        'matt',
        [-(hw - 0.08), yB + 0.05, zb0 + 0.3],
        [hw - 0.08, yB + 0.05, zb0 + 0.3],
        [hw - 0.16, yB + 0.05, roofZ - 0.1],
        [-(hw - 0.16), yB + 0.05, roofZ - 0.1],
        C.grey
      );
    return { B };
  }

  // ======================= lorries: a cab over the front axle, a chassis, the body =======================
  // the cab: a tall box with rounded edges, the windscreen nearly upright, the grille between the lamps, steps, mirrors on arms
  function kabine(k, T, o, cab) {
    const { yf, hw, a } = T,
      high = cab === 'hoch',
      low = cab === 'niedrig',
      L = high ? 2.3 : low ? 1.9 : 1.75, // the cab's length
      zf = low ? 0.55 : 1.05, // the cab's floor
      zt = high ? T.h - 0.05 : low ? 3.0 : 2.95, // its roof
      yF = yf - 0.02,
      y3 = yF - 0.18,
      y2 = y3 - 0.32,
      yR = yF - L,
      w = hw - 0.02,
      belt = zf + (low ? 1.1 : 0.85),
      pr = T.rw + 0.09;
    const D = {
      y0: yR,
      y1: yF,
      hw: [
        [yR, w - 0.02],
        [yR + 0.1, w],
        [yF - 0.3, w],
        [yF - 0.08, w - 0.04],
        [yF, w - 0.12],
      ],
      zb: [
        [yR, zf],
        [yF - 0.5, zf],
        [yF, zf + 0.06],
      ],
      sh: [
        [yR, belt + 0.05],
        [y3, belt],
        [yF - 0.04, belt - 0.02],
        [yF, belt - 0.06],
      ],
      deck: [
        [yR, belt + 0.05],
        [y3, belt + 0.02],
        [yF, belt - 0.04],
      ],
      rs: 0.07,
      rl: 0.05,
      tuck: 0.02,
      sl: 0.01,
      zw: zf + 0.3,
      ztrim: zf + 0.3,
      gin: 0.05,
      pw: 0.1,
      cab: {
        y0: yR + 0.01,
        y1: yR + 0.06,
        y2,
        y3,
        roof: [
          [yR + 0.06, zt],
          [y2, zt - 0.03],
        ],
        crown: 0.05,
        wr: [
          [yR + 0.06, w - 0.12],
          [y2, w - 0.1],
        ],
        rr: 0.14,
        bowF: [0.08, 0.04],
        bowR: [0.0, 0.0],
        sideGlass: [[y3 - 0.95, y3 - 0.04]],
        rearGlass: false,
      },
      arches: low ? [] : [{ y: a, r: pr, zc: T.rw + 0.02 }],
      seams: [y3 - 1.0],
      zone: { schweller: ['lack0'], naht: ['matt', C.black], sims: ['matt', C.black] },
      inner: o.lod ? false : { trim: C.dash, liner: C.liner, y0: yR + 0.1 },
    };
    const B = K.body(k, D);
    // the grille, the lamps in the bumper, the bumper and its step
    k.pad('matt', [0, yF - 0.02, belt - 0.4], [w * 1.5, 0.05, 0.62], 0.04, C.black);
    for (let i = 0; i < 5; i++) k.box('chrom', [0, yF + 0.01, belt - 0.62 + i * 0.11], [w * 1.42, 0.012, 0.02], C.grey);
    const zbm = low ? 0.42 : 0.72;
    k.pad('matt', [0, yF - 0.06, zbm], [2 * w, 0.2, 0.42], 0.05, C.grey);
    for (const s of [-1, 1]) {
      k.pad('head', [s * (w - 0.3), yF + 0.02, zbm + 0.06], [0.42, 0.06, 0.16], 0.03, C.lens);
      k.box('blink', [s * (w - 0.08), yF + 0.03, zbm + 0.06], [0.1, 0.03, 0.12], C.amber);
      // the steps up to the door, the door's handle, the mirror on its arm
      for (let i = 0; i < (low ? 1 : 2); i++)
        k.box('matt', [s * (w - 0.05), y3 - 0.55, zf - 0.25 - i * 0.32], [0.16, 0.4, 0.03], C.dark);
      k.box('matt', [s * (w + 0.008), y3 - 0.9, belt - 0.12], [0.02, 0.18, 0.04], C.dark);
      k.tube(
        'matt',
        [
          [s * w, y3 - 0.06, belt + 0.25],
          [s * (w + 0.22), y3 + 0.02, belt + 0.3],
        ],
        0.02,
        5,
        C.black
      );
      k.pad('matt', [s * (w + 0.26), y3 + 0.02, belt + 0.12], [0.05, 0.2, 0.52], 0.02, C.black);
      k.box('chrom', [s * (w + 0.26), y3 - 0.065, belt + 0.12], [0.04, 0.004, 0.46], C.alu, 'f');
      // the marker lamps on the roof's corners
      k.box('blink', [s * (w - 0.12), yF - 0.12, zt + 0.02], [0.06, 0.06, 0.04], C.amber);
    }
    // the sun visor over the screen, the roof's spoiler on a tall cab
    k.pad('lack0', [0, yF - 0.05, zt - 0.02], [w * 1.9, 0.12, 0.06], 0.02, [1, 1, 1]);
    if (high) k.pad('lack0', [0, yR + 0.6, zt + 0.25], [w * 1.8, 1.1, 0.45], 0.12, [1, 1, 1]);
    kennzeichen(k, 0, yF + 0.05, zbm - 0.05, 1, 0.52, 0.11);
    if (o.lod) return { B, yR, zf, zt, w };
    wischer(k, B, -w * 0.7, -w * 0.05, y3 + 0.02, y3 - 0.1);
    wischer(k, B, w * 0.05, w * 0.7, y3 + 0.02, y3 - 0.1);
    innen(k, B, D, T, o, {
      floor: zf + 0.1,
      seat: C.cloth,
      seatZ: zf + 0.55,
      seatY: y3 - 0.85,
      seatX: w * 0.45,
      seatW: 0.55,
      bench: null,
      dash: C.dash,
      wheel: C.dash,
      wheelR: 0.24,
      head: true,
      rearWall: yR + 0.1,
    });
    return { B, yR, zf, zt, w };
  }
  // the chassis under it all: two frame rails, the fuel tank, mud flaps, the side guards; y from y0 to y1
  function rahmen(k, T, y0, y1, z) {
    for (const s of [-1, 1]) k.box('matt', [s * 0.45, (y0 + y1) / 2, z], [0.08, y1 - y0, 0.28], C.frame);
    k.box('matt', [0, (y0 + y1) / 2, z + 0.1], [0.95, y1 - y0, 0.04], C.frame);
  }
  function seitenschutz(k, s, y0, y1, z, hw) {
    for (const zz of [z, z + 0.25]) k.box('matt', [s * (hw - 0.08), (y0 + y1) / 2, zz], [0.03, y1 - y0, 0.08], C.grey);
  }
  // a box body (the Koffer): white walls, a dark frame round the rear doors, the lamps low behind
  function koffer(k, y0, y1, z0, z1, hw, col = [1, 1, 1], part = 'lack1') {
    k.pad(part, [0, (y0 + y1) / 2, (z0 + z1) / 2], [2 * hw, y1 - y0, z1 - z0], 0.03, col);
    // the rails at the bottom and the top, the doors' frame and hinges
    for (const zz of [z0 + 0.04, z1 - 0.03]) k.box('matt', [0, (y0 + y1) / 2, zz], [2 * hw + 0.02, y1 - y0 + 0.02, 0.06], C.grey);
    k.box('matt', [0, y0 - 0.008, (z0 + z1) / 2], [2 * hw - 0.02, 0.016, z1 - z0 - 0.06], C.grey);
    k.box(part, [0, y0 - 0.018, (z0 + z1) / 2], [2 * hw - 0.16, 0.012, z1 - z0 - 0.2], col);
    k.box('matt', [0, y0 - 0.026, (z0 + z1) / 2], [0.025, 0.01, z1 - z0 - 0.2], C.black);
    for (const s of [-1, 1]) {
      for (const t of [0.15, 0.5, 0.85]) k.box('matt', [s * (hw - 0.06), y0 - 0.03, mix(z0, z1, t)], [0.08, 0.03, 0.06], C.dark);
      for (const t of [0.35, 0.7]) k.box('matt', [s * 0.32, y0 - 0.035, mix(z0, z1, t)], [0.03, 0.02, 0.5], C.alu);
    }
  }
  // the rear end of a lorry: the under-run guard, the lamps, the plate
  function heckLkw(k, y, z, hw) {
    k.box('matt', [0, y + 0.1, z], [2 * hw - 0.2, 0.12, 0.12], C.grey);
    for (const s of [-1, 1]) {
      k.pad('tail', [s * (hw - 0.3), y - 0.02, z + 0.18], [0.36, 0.06, 0.12], 0.02, C.red);
      k.box('blink', [s * (hw - 0.14), y - 0.03, z + 0.18], [0.08, 0.03, 0.1], C.amber);
    }
    kennzeichen(k, 0, y - 0.02, z + 0.24, -1, 0.52, 0.11);
  }
  function lkw(k, T, o) {
    const P = T.p,
      Cb = kabine(k, T, o, P.cab),
      zf = P.cab === 'niedrig' ? 0.5 : 0.95,
      zr = T.rw + 0.42; // the frame rails' height
    if (P.aufbau === 'koffer') {
      const y1 = Cb.yR - 0.12,
        y0 = T.yr + 0.04;
      rahmen(k, T, y0 + 0.2, Cb.yR + 0.4, zr);
      koffer(k, y0, y1, zr + 0.2, T.h, T.hw, [1, 1, 1], 'lack1');
      heckLkw(k, y0, zr - 0.25, T.hw);
      for (const s of [-1, 1]) {
        seitenschutz(k, s, T.b + T.rw + 0.25, T.a - T.rw - 0.25, zr - 0.15, T.hw);
        k.pad('matt', [s * (T.hw - 0.3), (T.a + T.b) / 2 + 0.6, zr - 0.1], [0.5, 0.9, 0.5], 0.08, C.tank);
        k.box('matt', [s * (T.hw - 0.2), T.b, T.rw * 2 + 0.06], [0.5, T.rw * 2.2, 0.02], C.black);
      }
    } else if (P.aufbau === 'sattel') {
      rahmen(k, T, T.yr + 0.1, Cb.yR + 0.4, zr);
      // the fifth wheel at the hitch, the air lines, the mudguards over the drive axle
      k.lathe('matt', [0, T.hitch, zr + 0.22], [0, 0, 1], [
        [0.42, 0],
        [0.42, 0.06],
        [0.001, 0.08],
      ], 18, C.dark);
      for (const s of [-1, 1]) {
        k.pad('matt', [s * (T.hw - 0.32), T.b, T.rw * 2 + 0.08], [0.6, T.rw * 2.3, 0.05], 0.02, C.black);
        k.pad('matt', [s * (T.hw - 0.3), (T.a + T.b) / 2 + 0.3, zr - 0.1], [0.55, 1.1, 0.55], 0.08, C.tank);
        seitenschutz(k, s, T.b + T.rw + 0.2, T.a - T.rw - 0.25, zr - 0.15, T.hw);
      }
      heckLkw(k, T.yr + 0.08, zr - 0.2, T.hw - 0.2);
    } else if (P.aufbau === 'muell') {
      // the refuse body: a tall rounded box, the rear loader with its hopper and the bins' lifter
      const y1 = Cb.yR - 0.1,
        y0 = T.yr + 1.1;
      rahmen(k, T, T.yr + 0.3, Cb.yR + 0.4, zr);
      k.pad('lack1', [0, (y0 + y1) / 2, (zr + 0.25 + T.h) / 2], [2 * T.hw - 0.06, y1 - y0, T.h - zr - 0.25], 0.18, [1, 1, 1]);
      k.pad('lack1', [0, y0 - 0.5, (zr + T.h) / 2 - 0.1], [2 * T.hw - 0.1, 1.0, T.h - zr - 0.5], 0.12, [1, 1, 1]);
      k.box('matt', [0, y0 - 1.0, zr + 0.1], [2 * T.hw - 0.3, 0.2, 0.5], C.dark);
      for (const s of [-1, 1]) {
        k.box('tail', [s * (T.hw - 0.15), y0 - 1.02, zr + 0.45], [0.2, 0.04, 0.1], C.red);
        k.box('blink', [s * (T.hw - 0.15), y0 - 1.02, T.h - 0.4], [0.12, 0.04, 0.12], C.amber);
        k.box('matt', [s * (T.hw - 0.05), (y0 + y1) / 2, zr + 0.4], [0.02, y1 - y0, 0.18], C.white);
        seitenschutz(k, s, T.b + T.rw + 0.15, T.a - T.rw - 0.2, zr - 0.15, T.hw);
      }
      kennzeichen(k, 0, y0 - 1.03, zr + 0.25, -1, 0.52, 0.11);
    }
    return { B: Cb.B };
  }
  // the semi-trailer: a long box on three axles, the king pin under its front, the landing legs
  function auflieger(k, T, o) {
    const z0 = 1.28,
      y0 = T.yr + 0.02,
      y1 = T.yf - 0.02;
    koffer(k, y0, y1, z0, T.h, T.hw, [1, 1, 1], 'lack1');
    for (const s of [-1, 1]) {
      k.box('matt', [s * 0.45, (y0 + y1) / 2, z0 - 0.15], [0.08, y1 - y0, 0.3], C.frame);
      // the landing legs, the side guards, the mudguards over the axles
      k.box('matt', [s * 0.75, T.kp - 1.9, (z0 - 0.15) / 2 + 0.2], [0.1, 0.1, z0 - 0.5], C.grey);
      k.box('matt', [s * 0.75, T.kp - 1.9, 0.12], [0.24, 0.24, 0.04], C.grey);
      seitenschutz(k, s, T.b + 2.0, T.kp - 2.2, z0 - 0.55, T.hw);
      k.pad('matt', [s * (T.hw - 0.25), T.b, T.rw * 2 + 0.06], [0.45, 3.4, 0.04], 0.02, C.black);
      // the marker lamps along the side
      for (let y = y0 + 1; y < y1 - 1; y += 2.5) k.box('blink', [s * (T.hw + 0.005), y, z0 + 0.05], [0.012, 0.06, 0.04], C.amber);
    }
    k.box('matt', [0, (y0 + y1) / 2, z0 - 0.08], [1.0, y1 - y0, 0.05], C.frame);
    k.lathe('matt', [0, T.kp, z0 - 0.15], [0, 0, -1], [
      [0.05, 0],
      [0.05, 0.08],
      [0.001, 0.09],
    ], 8, C.steel);
    heckLkw(k, y0, z0 - 0.45, T.hw);
    return {};
  }
  // ======================= the tractor and its tipping trailer =======================
  function traktor(k, T, o) {
    const { yf, yr, hw, a, b } = T,
      zR = T.rwR, // the rear axle's height
      bonW = 0.52, // the bonnet's half width
      zc = 1.15, // the cab's floor
      yc0 = b - 0.55,
      yc1 = b + 1.05,
      zt = T.h - 0.05;
    // the bonnet: a long rounded box falling to the front, the grille, the lamps in it; the front weight and the hitch
    k.blob(
      'lack0',
      [
        { y: yc1 - 0.1, w: bonW, z0: 0.72, z1: 1.62, e: 5 },
        { y: a - 0.2, w: bonW - 0.02, z0: 0.7, z1: 1.5, e: 5 },
        { y: yf - 0.55, w: bonW - 0.05, z0: 0.68, z1: 1.38, e: 4.5 },
        { y: yf - 0.32, w: bonW - 0.08, z0: 0.7, z1: 1.3, e: 4 },
      ],
      [1, 1, 1],
      16
    );
    k.pad('matt', [0, yf - 0.33, 1.02], [bonW * 1.6, 0.04, 0.5], 0.03, C.black);
    for (const s of [-1, 1]) k.pad('head', [s * 0.3, yf - 0.32, 1.25], [0.2, 0.05, 0.09], 0.02, C.lens);
    k.pad('matt', [0, yf - 0.12, 0.72], [0.9, 0.45, 0.5], 0.06, C.dark);
    k.box('matt', [0, a, 0.8], [0.5, 1.8, 0.35], C.frame);
    // the cab: four slim posts, glass all round, a white roof, the steps, the mirrors on long arms
    const posts = [
      [-1, yc0],
      [1, yc0],
      [-1, yc1],
      [1, yc1],
    ];
    for (const [s, y] of posts)
      k.tube(
        'matt',
        [
          [s * 0.68, y, zc],
          [s * 0.66, y + (y > b ? -0.08 : 0.04), zt - 0.12],
        ],
        0.035,
        6,
        C.black
      );
    k.box('glas', [0, (yc0 + yc1) / 2, (zc + zt) / 2 + 0.02], [1.34, yc1 - yc0 - 0.04, zt - zc - 0.18], K.COL.GLASS);
    k.pad('lack1', [0, (yc0 + yc1) / 2, zt], [1.5, yc1 - yc0 + 0.25, 0.16], 0.05, [1, 1, 1]);
    for (const s of [-1, 1]) {
      k.pad('head', [s * 0.45, yc1 + 0.08, zt - 0.08], [0.16, 0.05, 0.07], 0.015, C.lens);
      k.box('blink', [s * 0.7, yc1 + 0.1, zt - 0.06], [0.06, 0.04, 0.05], C.amber);
      k.tube(
        'matt',
        [
          [s * 0.7, yc1 - 0.05, zt - 0.3],
          [s * 1.05, yc1 + 0.05, zt - 0.35],
        ],
        0.015,
        5,
        C.black
      );
      k.pad('matt', [s * 1.08, yc1 + 0.05, zt - 0.5], [0.04, 0.16, 0.3], 0.01, C.black);
      for (let i = 0; i < 3; i++) k.box('matt', [s * 0.82, yc1 - 0.35, zc - 0.25 - i * 0.28], [0.22, 0.32, 0.03], C.dark);
      // the mudguards over the big wheels, the fenders over the front wheels
      const r = zR + 0.06,
        arc = [];
      for (let i = 0; i <= 10; i++) {
        const t = Math.PI * (0.05 + 0.9 * (i / 10));
        arc.push([s * (T.trackR / 2), b + Math.cos(t) * r, zR + Math.sin(t) * r]);
      }
      k.sweep('lack0', arc, [
        [-T.twR / 2 - 0.03, 0],
        [T.twR / 2 + 0.03, 0],
        [T.twR / 2 + 0.03, 0.012],
        [-T.twR / 2 - 0.03, 0.012],
      ], [1, 1, 1], { out: () => [0, 0, 1] });
      k.pad('lack0', [s * (T.track / 2), a, T.rw * 2 + 0.06], [T.tw + 0.08, T.rw * 1.5, 0.04], 0.02, [1, 1, 1]);
    }
    // the seat and the wheel inside
    k.pad('matt', [0, b + 0.1, zc + 0.45], [0.5, 0.45, 0.12], 0.04, C.cloth);
    k.pad('matt', [0, b - 0.15, zc + 0.75], [0.5, 0.1, 0.55], 0.04, C.cloth);
    k.tube('matt', [[0, b + 0.55, zc + 0.75], [0, b + 0.75, zc + 0.35]], 0.025, 6, C.dark);
    // the back: the three-point hitch, the lamps, the plate
    k.box('matt', [0, yr + 0.25, 0.75], [0.9, 0.3, 0.25], C.dark);
    for (const s of [-1, 1]) {
      k.box('matt', [s * 0.35, yr + 0.1, 0.62], [0.06, 0.5, 0.08], C.dark);
      k.pad('tail', [s * 0.9, yc0 - 0.1, zc + 0.3], [0.12, 0.04, 0.12], 0.02, C.red);
    }
    kennzeichen(k, 0, yc0 - 0.15, zc + 0.05, -1, 0.34, 0.2);
    return {};
  }
  // the tipping trailer: a deep steel box on two axles, the drawbar to the tractor's hitch
  function kipper(k, T, o) {
    const z0 = 1.25,
      y0 = T.yr + 0.05,
      y1 = T.yf - 0.05;
    // the steel box with its ribs and the top rail, the frame, the drawbar to the tractor's hitch, the mudguards over the tandem
    k.pad('lack1', [0, (y0 + y1) / 2, (z0 + T.h) / 2], [2 * T.hw - 0.04, y1 - y0, T.h - z0], 0.03, [1, 1, 1]);
    k.box('lack1', [0, (y0 + y1) / 2, T.h - 0.04], [2 * T.hw, y1 - y0 + 0.04, 0.08], [0.8, 0.8, 0.8]);
    for (let y = y0 + 0.5; y < y1 - 0.2; y += 0.9)
      for (const s of [-1, 1]) k.box('lack1', [s * (T.hw - 0.005), y, (z0 + T.h) / 2], [0.03, 0.07, T.h - z0 - 0.12], [0.82, 0.82, 0.82]);
    k.box('matt', [0, (y0 + y1) / 2, z0 - 0.14], [1.0, y1 - y0 - 0.2, 0.24], C.frame);
    k.tube('matt', [[-0.45, y1 - 0.3, z0 - 0.2], [0, T.kp, 0.78]], 0.05, 6, C.frame);
    k.tube('matt', [[0.45, y1 - 0.3, z0 - 0.2], [0, T.kp, 0.78]], 0.05, 6, C.frame);
    k.lathe('matt', [0, T.kp, 0.78], [0, 1, 0], [[0.06, -0.05], [0.06, 0.05], [0.001, 0.06]], 8, C.steel);
    for (const s of [-1, 1]) {
      k.pad('tail', [s * (T.hw - 0.2), y0 - 0.02, z0 - 0.08], [0.25, 0.05, 0.1], 0.02, C.red);
      k.box('blink', [s * (T.hw - 0.05), y0 - 0.02, z0 - 0.08], [0.08, 0.04, 0.08], C.amber);
      k.pad('matt', [s * (T.track / 2), T.b, T.rw * 2 + 0.08], [T.tw + 0.1, 2.9, 0.04], 0.02, C.black);
    }
    kennzeichen(k, 0, y0 - 0.03, z0 - 0.25, -1, 0.52, 0.11);
    return {};
  }
  // ======================= wheels and axles =======================
  // the wheel's look by class: alloys with spokes, steel wheels with a cover, the lorries' steel rims, the tractor's yellow ones
  function radOpts(T, o, rear) {
    const P = T.p;
    if (T.cls === 'lkw' || T.cls === 'zug') return { rim: T.rimR * 0.98, col: C.silver, cap: C.dark, capR: 0.12, dish: 0.07, seg: 24 };
    if (T.cls === 'trak')
      return rear
        ? { r: T.rwR, w: T.twR, rim: T.rimRR, col: C.steel, cap: C.dark, capR: 0.18, dish: 0.12, seg: 28 }
        : { rim: T.rimR, col: C.steel, cap: C.dark, capR: 0.12, dish: 0.1, seg: 24 };
    if (P.spokes) return { rim: T.rimR + 0.012, col: C.dark, spokes: P.spokes, spokeCol: o.rim === 'dark' ? C.grey : C.silver, dish: 0.02 };
    return { rim: T.rimR + 0.01, col: C.silver, cap: C.grey, capR: T.rimR * 0.85, dish: 0.025 };
  }
  // an axle: two wheels at the track's ends (twin tyres on a lorry's drive axle, the trailer's axles), tread between them for the far views
  function achse(T, o, rear) {
    const k = K.kit(),
      tr = (rear ? T.trackR || T.track : T.track) / 2,
      R = radOpts(T, o, rear),
      r = R.r || T.rw,
      w = R.w || T.tw,
      twin = rear && (T.cls === 'lkw' || T.cls === 'zug') && T.p.aufbau !== 'auflieger';
    for (const s of [-1, 1])
      k.at({ p: [s * tr, 0, 0] }, () => {
        K.wheel(k, Object.assign({ r, w, s }, R));
        if (twin) k.at({ p: [-s * (w + 0.03), 0, 0] }, () => K.wheel(k, Object.assign({ r, w, s }, R, { cap: null })));
      });
    return k.done();
  }
  // the axles of a vehicle: [{ y, parts, r }] – the axle positions y in the vehicle's frame, their wheels
  function achsen(T, o) {
    if (T.p.aufbau === 'auflieger') {
      const p = achse(T, o, true);
      return [-1.31, 0, 1.31].map(d => ({ y: T.b + d, r: T.rw, parts: p }));
    }
    if (T.p.aufbau === 'kipper') {
      const p = achse(T, o, true);
      return [-0.65, 0.65].map(d => ({ y: T.b + d, r: T.rw, parts: p }));
    }
    const out = [
      { y: T.a, r: T.rw, parts: achse(T, o, false), steer: true },
      { y: T.b, r: T.cls === 'trak' ? T.rwR : T.rw, parts: achse(T, o, true) },
    ];
    // the refuse truck's trailing third axle
    if (T.p.aufbau === 'muell') out.push({ y: T.b - 1.35, r: T.rw, parts: achse(T, o, true) });
    return out;
  }

  // ======================= building a type =======================
  const BUILD = { pkw, van, lkw, auflieger, traktor, kipper };
  const builder = T =>
    T.cls === 'pkw'
      ? pkw
      : T.cls === 'lfz'
        ? van
        : T.cls === 'lkw'
          ? lkw
          : T.cls === 'trak'
            ? traktor
            : T.p.aufbau === 'auflieger'
              ? auflieger
              : kipper;
  const cache = new Map();
  function bau(typ, o = {}) {
    const T = TYP[typ];
    if (!T) return null;
    const key = typ + '|' + (o.rim || '') + '|' + (o.lod || 0);
    if (cache.has(key)) return cache.get(key);
    const k = K.kit();
    builder(T)(k, T, o);
    const M = { typ, T, body: k.done(), axles: achsen(T, o), tris: k.count() };
    cache.set(key, M);
    return M;
  }

  // ======================= the fleet: which types drive where, and their colours =======================
  // the paints of today by share (Kraftfahrt-Bundesamt, new cars 2024 by colour: grey and black and white make two thirds)
  const FARBEN = [
    ['#5f6366', 15], // dark grey metallic
    ['#8c9094', 12], // grey
    ['#1b1c1e', 22], // black
    ['#e9eae6', 17], // white
    ['#b4b8bb', 11], // silver
    ['#24406b', 7], // dark blue
    ['#3f72a8', 3], // blue
    ['#8e1a1a', 5], // red
    ['#2e4a37', 2], // green
    ['#7a6650', 2], // brown, beige
    ['#c9a227', 0.5], // yellow
    ['#c8561f', 0.5], // orange
  ];
  // the cars by share of the stock (after the Kraftfahrt-Bundesamt's stock by model and segment, 1.1.2025, rounded)
  const PKW = [
    ['kompakt', 14],
    ['kompakt2', 7],
    ['klein', 10],
    ['klein2', 8],
    ['mini', 5],
    ['kombi', 10],
    ['kombi2', 7],
    ['limo', 8],
    ['suv', 12],
    ['suv2', 7],
    ['elektro', 4],
    ['hochdach', 4],
  ];
  // one wheel at the origin (the car a player borrows turns and steers each wheel): s +1 its outside to the right
  function rad(typ, s = 1, rear = false) {
    const T = TYP[typ],
      k = K.kit(),
      R = radOpts(T, {}, rear);
    K.wheel(k, Object.assign({ r: R.r || T.rw, w: R.w || T.tw, s }, R));
    return k.done();
  }
  return { TYP, C, FARBEN, PKW, bau, BUILD, achsen, rad };
})();
