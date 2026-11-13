// ===================== feat/grenzland-auto: the vehicle types as geometry – cars, vans, the lorry (GLTYPEN) =====================
// Pure (grenzland/gl_karosse.js only): measures and shapes of the real types, without makers' marks. grenzland/gl_modelle.js turns the
// parts into meshes. Sources of the measures: docs/features/grenzland-auto.md.
//   GLTYPEN.TYP[typ]      measures: yf, yr (ends), hw, a, b (axles, y), rw, track, h, form, …
//   GLTYPEN.bau(typ, o)   → { T, pieces: [{ name, parts, at, paint }] }   o: { col, col2, band, band2, bar: 'balken' | 'rundum', plane,
//                           innen: 'cockpit' (leave dashboard and steering wheel to grenzland/gl_cockpit.js) }
import { GLKAROSSE as K } from './gl_karosse.js';
export const GLTYPEN = (() => {
  const { rgb, hex, fillet } = K,
    { mix } = K.V;
  const C = {
    black: rgb(14, 14, 15),
    rubber: rgb(22, 22, 23),
    dark: rgb(38, 38, 40),
    steel: rgb(120, 122, 125),
    silver: rgb(168, 170, 172),
    alu: rgb(190, 192, 194),
    white: rgb(232, 232, 226),
    plate: rgb(236, 236, 230),
    amber: rgb(232, 130, 20),
    red: rgb(170, 20, 16),
    lens: rgb(225, 228, 230),
    vinylBrown: rgb(92, 66, 48),
    vinylGrey: rgb(88, 88, 92),
    vinylBlack: rgb(30, 30, 32),
    cloth: rgb(70, 74, 82),
    ivory: rgb(226, 218, 196),
    wood: rgb(128, 98, 66),
    woodDark: rgb(92, 70, 48),
    tarp: rgb(96, 104, 84),
    frame: rgb(30, 31, 33),
    neon: rgb(214, 232, 40),
    bakelite: rgb(40, 34, 30),
  };
  // ---- measures (m). a, b: the axles' y; yf, yr: the ends over the bumpers; hw: half the width; h: height; rw: wheel radius ----
  const TYP = {
    // Trabant 601: 3555 × 1505 × 1437 mm, wheelbase 2020, track 1206/1255, 145 SR 13
    trabant: {
      yf: 1.64,
      yr: -1.915,
      hw: 0.752,
      a: 0.95,
      b: -1.07,
      rw: 0.283,
      tw: 0.145,
      track: 1.21,
      trackR: 1.255,
      h: 1.44,
      form: 'pkw',
      name: 'Trabant 601',
    },
    // Trabant 601 Universal: 3560 × 1510 × 1467 mm
    trabant_kombi: {
      yf: 1.64,
      yr: -1.92,
      hw: 0.755,
      a: 0.95,
      b: -1.07,
      rw: 0.283,
      tw: 0.145,
      track: 1.21,
      trackR: 1.255,
      h: 1.467,
      form: 'pkw',
      name: 'Trabant 601 Universal',
    },
    // Wartburg 353: 4220 × 1640 × 1495 mm, wheelbase 2450, track 1260/1300, 165 SR 13
    wartburg: {
      yf: 2.02,
      yr: -2.2,
      hw: 0.82,
      a: 1.2,
      b: -1.25,
      rw: 0.298,
      tw: 0.165,
      track: 1.26,
      trackR: 1.3,
      h: 1.495,
      form: 'pkw',
      name: 'Wartburg 353',
    },
    // Barkas B 1000: 4520 × 1860 × 1910 mm, wheelbase 2400
    barkas: {
      yf: 2.13,
      yr: -2.39,
      hw: 0.93,
      a: 1.15,
      b: -1.25,
      rw: 0.325,
      tw: 0.175,
      track: 1.47,
      trackR: 1.44,
      h: 1.91,
      form: 'bus',
      name: 'Barkas B 1000',
    },
    // W 50 L (flatbed): 6535 × 2500 × 2600 mm, wheelbase 3200, 8.25-20, twin rear tyres
    w50: {
      yf: 2.72,
      yr: -3.815,
      hw: 1.25,
      a: 1.42,
      b: -1.78,
      rw: 0.48,
      tw: 0.23,
      track: 1.7,
      trackR: 1.78,
      h: 2.6,
      form: 'lkw',
      name: 'W 50',
    },
    // Lada 2105: 4130 × 1620 × 1446 mm, wheelbase 2424
    lada: {
      yf: 2.0,
      yr: -2.13,
      hw: 0.81,
      a: 1.2,
      b: -1.224,
      rw: 0.287,
      tw: 0.165,
      track: 1.365,
      trackR: 1.321,
      h: 1.446,
      form: 'pkw',
      name: 'Lada 2105',
    },
    // today: an estate of the upper middle class (4.77 × 1.83 × 1.5 m, wheelbase 2.79), a small estate in the size of the player's car,
    // a panel van (5.41 × 1.99 × 2.5 m, wheelbase 3.3)
    streife: {
      yf: 2.33,
      yr: -2.44,
      hw: 0.915,
      a: 1.38,
      b: -1.41,
      rw: 0.335,
      tw: 0.215,
      track: 1.58,
      trackR: 1.57,
      h: 1.5,
      form: 'pkw',
      name: 'Streifenwagen',
    },
    kombi: {
      yf: 2.047,
      yr: -2.426,
      hw: 0.87,
      a: 1.25,
      b: -1.655,
      rw: 0.31,
      tw: 0.185,
      track: 1.47,
      trackR: 1.47,
      h: 1.55,
      form: 'pkw',
      name: 'Kombi',
    },
    kasten: {
      yf: 2.45,
      yr: -2.96,
      hw: 0.995,
      a: 1.52,
      b: -1.78,
      rw: 0.345,
      tw: 0.215,
      track: 1.71,
      trackR: 1.72,
      h: 2.5,
      form: 'bus',
      name: 'Kastenwagen',
    },
  };
  for (const T of Object.values(TYP)) {
    T.hl = (T.yf - T.yr) / 2;
    T.cy = (T.yf + T.yr) / 2;
    T.wb = T.a - T.b;
  }
  // ---- small parts used by several types ----
  // a round lamp facing dir (+1 front, −1 rear) at (x, y, z): a chrome ring and a domed lens
  function rundLampe(k, x, y, z, r, dir, o = {}) {
    const ax = [0, dir, 0],
      p = [x, y, z],
      d = o.deep ?? 0.03;
    if (o.ring !== false)
      k.lathe(
        o.ringPart || 'chrom',
        p,
        ax,
        [
          [r * 1.2, -d],
          [r * 1.22, 0.004],
          [r * 1.14, 0.014],
          [r * 1.02, 0.012],
        ],
        20,
        o.ringCol || C.alu
      );
    k.lathe(
      o.part || 'head',
      p,
      ax,
      [
        [r * 1.02, 0.008],
        [r * 0.9, 0.02],
        [r * 0.6, 0.032],
        [r * 0.3, 0.038],
        [0.0005, 0.04],
      ],
      20,
      o.col || C.lens
    );
  }
  // a bumper: a blade swept round the end; path in plan [[x, y], …] at height z
  function stossstange(k, part, col, pts, z, h = 0.09, t = 0.03, o = {}) {
    const path = fillet(pts, o.r ?? 0.1, 5).map(p => [p[0], p[1], z]),
      prof = [
        [0, -h / 2],
        [t * 0.7, -h / 2 + 0.008],
        [t, -h * 0.2],
        [t, h * 0.2],
        [t * 0.7, h / 2 - 0.008],
        [0, h / 2],
      ];
    k.sweep(part, path, prof, col, { smooth: true, left: o.left });
    if (o.rubber)
      k.sweep(
        'matt',
        path.map(p => p.slice()),
        [
          [t - 0.002, -0.014],
          [t + 0.008, -0.01],
          [t + 0.008, 0.01],
          [t - 0.002, 0.014],
        ],
        C.rubber,
        { smooth: true, left: o.left }
      );
  }
  // a number plate without characters: white with a dark edge
  function schild(k, x, y, z, dir, w = 0.46, h = 0.11) {
    k.box('matt', [x, y, z], [w + 0.012, 0.006, h + 0.012], C.black);
    k.box('matt', [x, y + dir * 0.004, z], [w, 0.006, h], C.plate);
  }
  // a wiper lying on the screen: from its pivot (x0) at the screen's foot up along the glass
  function wischer(k, B, x0, x1, y0, y1) {
    const pts = [];
    for (let i = 0; i <= 4; i++) {
      const t = i / 4,
        x = mix(x0, x1, t),
        y = mix(y0, y1, t);
      pts.push([x, y, B.top(y, x) + 0.016]);
    }
    k.tube('matt', pts, 0.006, 5, C.black);
    // the blade across the arm's end
    const e = pts[4],
      s = Math.sign(x1 - x0) || 1;
    k.tube(
      'matt',
      [
        [e[0] - s * 0.02, e[1] + 0.16, B.top(e[1] + 0.16, e[0] - s * 0.02) + 0.012],
        [e[0] + s * 0.03, e[1] - 0.2, B.top(e[1] - 0.2, e[0] + s * 0.03) + 0.012],
      ],
      0.007,
      4,
      C.rubber
    );
  }
  // a seat: cushion and back as soft pads; y: the cushion's middle, z: its top
  function sitz(k, x, y, z, w, col, o = {}) {
    const d = o.d || 0.46,
      hb = o.hb || 0.52,
      lean = o.lean ?? 0.3;
    k.pad('matt', [x, y, z - 0.06], [w, d, 0.12], 0.04, col);
    k.at({ p: [x, y - d / 2 + 0.02, z - 0.02], rx: -lean }, () =>
      k.pad('matt', [0, 0, hb / 2], [w, 0.1, hb], 0.04, col)
    );
    if (o.head)
      k.at({ p: [x, y - d / 2 + 0.02, z - 0.02], rx: -lean }, () =>
        k.pad('matt', [0, 0.01, hb + 0.1], [w * 0.5, 0.08, 0.15], 0.03, col)
      );
  }
  // a simple steering wheel in its own plane (the rim about the local y axis): o = { r, spokes }
  function lenkrad(k, part, r, col, o = {}) {
    const pts = [];
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      pts.push([Math.cos(a) * r, 0, Math.sin(a) * r]);
    }
    k.tube(part, pts, o.t || 0.011, 6, col);
    for (const a of o.spokes || [0, Math.PI])
      k.tube(
        part,
        [
          [Math.cos(a) * 0.03, 0.03, Math.sin(a) * 0.03],
          [Math.cos(a) * r, 0, Math.sin(a) * r],
        ],
        o.ts || 0.009,
        5,
        col
      );
    k.lathe(
      part,
      [0, 0.02, 0],
      [0, -1, 0],
      [
        [0.045, -0.02],
        [0.05, 0.0],
        [0.04, 0.016],
        [0.0005, 0.02],
      ],
      12,
      col
    );
  }
  // the wheels of an axle (both), about the x axis at the origin
  function achse(T, o, rear) {
    const k = K.kit(),
      tr = (rear ? T.trackR || T.track : T.track) / 2;
    for (const s of [-1, 1])
      k.at({ p: [s * tr, 0, 0] }, () => {
        K.wheel(k, Object.assign({ r: T.rw, w: T.tw, s }, o));
        if (o.twin)
          k.at({ p: [-s * (T.tw + 0.03), 0, 0] }, () =>
            K.wheel(k, Object.assign({ r: T.rw, w: T.tw, s }, o, { cap: null }))
          );
      });
    return k.done();
  }
  function rad(T, o, s) {
    const k = K.kit();
    K.wheel(k, Object.assign({ r: T.rw, w: T.tw, s }, o));
    return k.done();
  }
  // ======================= Trabant 601 (limousine and Universal) =======================
  function trabant(k, T, o, kombi) {
    const col2 = o.col2 ? 'lack1' : 'lack0';
    const D = {
      y0: -1.875,
      y1: 1.6,
      hw: [
        [-1.875, 0.63],
        [-1.862, 0.672],
        [-1.835, 0.702],
        [-1.78, 0.722],
        [-1.55, 0.737],
        [-1.0, 0.748],
        [-0.4, T.hw],
        [0.4, T.hw],
        [1.0, 0.743],
        [1.4, 0.728],
        [1.52, 0.714],
        [1.565, 0.694],
        [1.59, 0.662],
        [1.6, 0.625],
      ],
      zb: [
        [-1.875, 0.345],
        [-1.8, 0.31],
        [-1.45, 0.27],
        [-0.72, 0.215],
        [0.6, 0.215],
        [1.32, 0.27],
        [1.56, 0.31],
        [1.6, 0.35],
      ],
      sh: [
        [-1.875, 0.835],
        [-1.86, 0.868],
        [-1.8, 0.886],
        [-1.4, 0.905],
        [-0.45, 0.915],
        [0.53, 0.91],
        [1.45, 0.865],
        [1.57, 0.84],
        [1.6, 0.8],
      ],
      deck: kombi
        ? [
            [-1.875, 0.83],
            [-1.84, 0.9],
            [0.53, 0.9],
            [1.45, 0.848],
            [1.57, 0.818],
            [1.6, 0.775],
          ]
        : [
            [-1.875, 0.755],
            [-1.82, 0.8],
            [-1.4, 0.915],
            [0.53, 0.9],
            [1.45, 0.848],
            [1.57, 0.818],
            [1.6, 0.775],
          ],
      dp: [
        [-1.4, 9],
        [0.5, 6],
      ],
      rs: 0.032,
      rl: 0.05,
      tuck: [
        [-1.875, 0.008],
        [-1.6, 0.035],
        [1.3, 0.035],
        [1.6, 0.008],
      ],
      sl: 0.018,
      zw: 0.56,
      ztrim: 0.7,
      gin: 0.078,
      pw: 0.055,
      cab: kombi
        ? {
            y0: -1.84,
            y1: -1.6,
            y2: 0.14,
            y3: 0.53,
            roof: [
              [-1.6, 1.4],
              [-1.2, 1.445],
              [-0.35, 1.467],
              [0.0, 1.455],
              [0.14, 1.435],
            ],
            crown: 0.035,
            wr: [
              [-1.6, 0.575],
              [-0.4, 0.605],
              [0.14, 0.585],
            ],
            rr: 0.06,
            bowF: [0.07, 0.04],
            bowR: [0.03, 0.02],
            sideGlass: [
              [-1.52, -0.47],
              [-0.41, 0.53],
            ],
          }
        : {
            y0: -1.4,
            y1: -1.04,
            y2: 0.14,
            y3: 0.53,
            roof: [
              [-1.04, 1.385],
              [-0.75, 1.425],
              [-0.35, 1.44],
              [0.0, 1.43],
              [0.14, 1.41],
            ],
            crown: 0.035,
            wr: [
              [-1.04, 0.575],
              [-0.4, 0.605],
              [0.14, 0.585],
            ],
            rr: 0.06,
            bowF: [0.07, 0.04],
            bowR: [0.06, 0.03],
            sideGlass: [
              [-1.0, -0.47],
              [-0.41, 0.53],
            ],
          },
      arches: [
        { y: T.a, r: 0.345, zc: 0.29 },
        { y: T.b, r: 0.335, zc: 0.285 },
      ],
      seams: [0.47, -0.44],
      zone: { dach: [col2], dachkante: [col2] },
      inner: { trim: C.vinylBrown, liner: C.ivory },
    };
    const B = K.body(k, D);
    // ---- front: round lamps in chrome rings, the grille between them, indicators, bumper, plate ----
    const yF = 1.6;
    for (const s of [-1, 1]) {
      rundLampe(k, s * 0.535, yF + 0.012, 0.665, 0.085, 1);
      k.box('blink', [s * 0.555, yF + 0.012, 0.5], [0.11, 0.024, 0.045], C.amber);
      k.box('matt', [s * 0.555, yF + 0.004, 0.5], [0.125, 0.012, 0.06], C.alu);
    }
    // the grille: a bright frame, dark behind, five slats
    k.box('matt', [0, yF + 0.004, 0.655], [0.66, 0.012, 0.2], C.silver);
    k.box('matt', [0, yF + 0.012, 0.655], [0.6, 0.012, 0.15], C.black);
    for (let i = 0; i < 5; i++) k.box('matt', [0, yF + 0.02, 0.6 + i * 0.0275], [0.6, 0.012, 0.011], C.silver);
    stossstange(
      k,
      'chrom',
      C.alu,
      [
        [-0.772, 1.3],
        [-0.772, 1.615],
        [0.772, 1.615],
        [0.772, 1.3],
      ],
      0.415,
      0.085,
      0.028,
      { rubber: true, left: true }
    );
    schild(k, 0, 1.652, 0.415, 1, 0.42, 0.105);
    // ---- rear: upright lamps at the ends of the fins, the lid's handle, plate, bumper, exhaust ----
    for (const s of [-1, 1]) {
      const yR = B.end(s * 0.665, 0.72, -1);
      k.box('matt', [s * 0.665, yR - 0.006, 0.735], [0.092, 0.03, 0.27], C.alu);
      k.box('tail', [s * 0.665, yR - 0.014, 0.7], [0.078, 0.03, 0.17], C.red);
      k.box('blink', [s * 0.665, yR - 0.014, 0.83], [0.078, 0.03, 0.07], C.amber);
    }
    const yRm = B.end(0, 0.6, -1);
    schild(k, 0, yRm - 0.008, 0.62, -1, 0.42, 0.105);
    k.box('chrom', [0, yRm - 0.014, 0.705], [0.13, 0.024, 0.03], C.alu);
    stossstange(
      k,
      'chrom',
      C.alu,
      [
        [-0.772, -1.6],
        [-0.772, -1.895],
        [0.772, -1.895],
        [0.772, -1.6],
      ],
      0.43,
      0.085,
      0.028,
      { rubber: true }
    );
    k.tube(
      'matt',
      [
        [-0.34, -1.5, 0.25],
        [-0.34, -1.93, 0.245],
      ],
      0.021,
      8,
      C.steel,
      { caps: 'b' }
    );
    // ---- sides: door handles, the vent on the rear pillar, the roof's gutter, the mirror on the driver's door ----
    for (const s of [-1, 1]) {
      const h = B.side(s, -0.345, 0.79, 0.012);
      k.box('chrom', h, [0.014, 0.115, 0.024], C.alu);
      if (!kombi) {
        // the cabin's vent: a dark slot with slats on the rear pillar
        const vy = -1.2,
          vz = 1.12,
          vx = B.x(vy, vz) + 0.004;
        k.box('matt', [s * vx, vy, vz], [0.008, 0.1, 0.07], C.black);
        for (let i = 0; i < 3; i++)
          k.box('matt', [s * (vx + 0.003), vy, vz - 0.022 + i * 0.022], [0.008, 0.1, 0.008], C.silver);
      }
      // gutter along the roof's edge
      const gut = [];
      for (let i = 0; i < B.Y.length; i++) {
        const y = B.Y[i];
        if (y < D.cab.y1 - 0.02 || y > D.cab.y2 + 0.02) continue;
        const p = B.R[i][17];
        gut.push([s * (p[0] + 0.006), p[1], p[2] + 0.004]);
      }
      if (gut.length > 1) k.tube(col2, gut, 0.008, 5, [1, 1, 1]);
    }
    // mirror: a round head on a short arm at the driver's door
    k.tube(
      'chrom',
      [
        [-(B.x(0.4, 0.93) + 0.0), 0.4, 0.93],
        [-(B.x(0.4, 0.93) + 0.07), 0.41, 0.99],
      ],
      0.007,
      5,
      C.alu
    );
    k.lathe(
      'chrom',
      [-(B.x(0.4, 0.93) + 0.075), 0.415, 1.0],
      [0, 1, 0],
      [
        [0.001, -0.02],
        [0.05, -0.012],
        [0.058, 0.0],
        [0.001, 0.002],
      ],
      14,
      C.alu
    );
    wischer(k, B, -0.36, -0.2, 0.5, 0.3);
    wischer(k, B, 0.12, 0.28, 0.5, 0.3);
    // ---- inside (as far as one sees it through the glass) ----
    innen(k, B, D, T, o, {
      floor: 0.27,
      seat: C.vinylBrown,
      seatZ: 0.52,
      seatY: -0.2,
      seatX: 0.33,
      seatW: 0.5,
      bench: kombi ? -1.02 : -0.98,
      dash: C.bakelite,
      wheel: C.ivory,
      wheelR: 0.19,
      shelf: !kombi,
    });
    return B;
  }
  // what is inside every car: a floor, the dashboard with a hood over the instruments, the steering wheel (left), two seats, a bench,
  // the shelf under the rear window. I: { floor (z), seat (colour), seatZ, seatY, seatX, seatW, bench (y) | null, dash, wheel, wheelR }
  function innen(k, B, D, T, o, I) {
    const Cb = D.cab,
      yA = Cb.y3,
      hwF = y => B.x(y, I.floor + 0.2) - 0.03;
    // floor (facing up) from the foot well to the rear seat, a little raised behind
    const fy0 = I.rearWall ?? Cb.y0 + 0.02,
      fy1 = yA + (I.foot ?? 0.32);
    k.quad(
      'matt',
      [-hwF(fy0), fy0, I.floor],
      [hwF(fy0), fy0, I.floor],
      [hwF(fy1), fy1, I.floor],
      [-hwF(fy1), fy1, I.floor],
      C.dark
    );
    // the fire wall
    const sh = B.S(yA).sh;
    k.quad(
      'matt',
      [-hwF(fy1), fy1, I.floor],
      [hwF(fy1), fy1, I.floor],
      [hwF(fy1), yA + 0.02, sh - 0.02],
      [-hwF(fy1), yA + 0.02, sh - 0.02],
      C.dark
    );
    // the shelf under the windscreen, the dashboard below it
    const xd = B.x(yA, sh) - 0.05;
    k.quad(
      'matt',
      [-xd, yA - 0.3, sh - 0.035],
      [xd, yA - 0.3, sh - 0.035],
      [xd, yA + 0.03, sh - 0.012],
      [-xd, yA + 0.03, sh - 0.012],
      I.dash
    );
    if (o.innen !== 'cockpit') {
      k.box('matt', [0, yA - 0.33, sh - 0.14], [2 * xd, 0.07, 0.2], I.dash, 'f');
      k.pad('matt', [-(I.seatX + 0.02), yA - 0.32, sh - 0.0], [0.3, 0.12, 0.08], 0.03, I.dash);
      k.at({ p: [-I.seatX, yA - 0.44, sh - 0.06], rx: -1.05 }, () => lenkrad(k, 'matt', I.wheelR, I.wheel));
      k.tube(
        'matt',
        [
          [-I.seatX, yA - 0.43, sh - 0.07],
          [-I.seatX, yA - 0.2, sh - 0.2],
        ],
        0.018,
        6,
        I.dash
      );
    }
    for (const s of [-1, 1]) sitz(k, s * I.seatX, I.seatY, I.seatZ, I.seatW, I.seat, { head: I.head });
    if (I.bench != null) {
      sitz(k, 0, I.bench, I.seatZ + 0.01, 2 * I.seatX + I.seatW - 0.06, I.seat, { d: 0.44, hb: 0.5, lean: 0.36 });
      if (I.shelf) {
        const y0 = Cb.y0 + 0.02,
          y1 = I.bench - 0.3,
          zs = B.S(y0).sh - 0.02,
          xs = B.x(y0, zs) - 0.06;
        k.quad('matt', [-xs, y0, zs], [xs, y0, zs], [xs, y1, zs - 0.02], [-xs, y1, zs - 0.02], I.dash);
      }
    }
  }
  // ---- the paint of a vehicle's slots ----
  const DEF = {
    trabant: '#d9d3bd',
    trabant_kombi: '#9fc1d2',
    wartburg: '#e9e6da',
    barkas: '#c9c7b4',
    w50: '#3f6f9a',
    lada: '#b33a2c',
    streife: '#c9cdd2',
    kombi: '#7d8791',
    kasten: '#f1f1ee',
  };
  const BUILD = {
    trabant: (k, T, o) => trabant(k, T, o, false),
    trabant_kombi: (k, T, o) => trabant(k, T, o, true),
  };
  const RAD = {
    trabant: { rim: 0.178, col: C.silver, cap: 'chrom', capR: 0.062, dish: 0.03 },
  };
  RAD.trabant_kombi = RAD.trabant;
  const ALIAS = { limo89: 'wartburg', klein89: 'trabant', lkw89: 'w50' };
  const cache = new Map();
  function bau(typ0, o = {}) {
    const typ = ALIAS[typ0] || typ0,
      T = TYP[typ],
      fn = BUILD[typ];
    if (!T || !fn) return null;
    const key = typ + '|' + JSON.stringify([o.col, o.col2, o.band, o.band2, o.bar, o.plane, o.innen, o.einzel]);
    if (cache.has(key)) return cache.get(key);
    const k = K.kit();
    fn(k, T, o);
    const paint = [
        hex(o.col || DEF[typ]),
        hex(o.col2 || o.col || DEF[typ]),
        hex(o.band || '#888888'),
        hex(o.band2 || '#888888'),
      ],
      R = RAD[typ] || {},
      pieces = [{ name: 'body', parts: k.done(), at: [0, 0, 0], paint }];
    if (o.einzel) {
      // each wheel on its own (the player's vehicles: vehicles/vehicle.js turns and steers them)
      pieces.push({ name: 'radL', parts: rad(T, R, -1), at: [0, 0, 0], paint });
      pieces.push({ name: 'radR', parts: rad(T, R, 1), at: [0, 0, 0], paint });
    } else {
      pieces.push({ name: 'axF', parts: achse(T, R, false), at: [0, T.a, T.rw], paint });
      pieces.push({
        name: 'axR',
        parts: achse(T, Object.assign({}, R, RAD[typ + ':h'] || {}), true),
        at: [0, T.b, T.rw],
        paint,
      });
    }
    const M = { typ, T, pieces, tris: k.count() };
    cache.set(key, M);
    return M;
  }
  const has = typ => !!BUILD[ALIAS[typ] || typ];
  return { TYP, ALIAS, DEF, C, bau, has, parts: { rundLampe, stossstange, schild, wischer, sitz, lenkrad, innen } };
})();
