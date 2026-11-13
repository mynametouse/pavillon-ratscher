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
      a: 1.57,
      b: -1.63,
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
  // a wiper parked along the screen's foot: the arm from its pivot (x0, y0) to (x1, y1), the blade along it
  function wischer(k, B, x0, x1, y0, y1) {
    const dy = Math.min(0.07, Math.abs(y1 - y0)) * Math.sign(y1 - y0 || -1),
      P = t => {
        const x = mix(x0, x1, t),
          y = y0 + dy * (0.25 + 0.75 * t);
        return [x, y, B.top(y, x) + 0.014];
      };
    k.tube('matt', [P(0), P(0.5), P(1)], 0.005, 5, C.black);
    const a = P(0.35),
      b = P(1.25);
    k.tube('matt', [a, b], 0.006, 4, C.rubber, { flat: [1, 1.6] });
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
      inner: { trim: C.vinylBrown, liner: C.ivory, y1: 0.86 },
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
    wischer(k, B, -0.47, -0.1, 0.515, 0.3);
    wischer(k, B, 0.03, 0.4, 0.515, 0.3);
    // ---- inside (as far as one sees it through the glass) ----
    innen(k, B, D, T, o, {
      floor: 0.27,
      seat: C.vinylBrown,
      seatZ: o.innen === 'cockpit' ? 0.46 : 0.52,
      seatY: -0.2,
      seatX: 0.33,
      seatW: 0.5,
      bench: kombi ? -1.02 : -0.98,
      dash: C.bakelite,
      wheel: C.ivory,
      wheelR: 0.19,
      shelf: !kombi,
    });
    if (o.innen === 'cockpit') trabantCockpit(k, B, B.S(D.cab.y3).sh);
    return { B };
  }
  // lettering on a door: a quad on the side skin with texture coordinates (grenzland/gl_modelle.js draws the word); it reads from
  // left to right on both sides
  function schriftzug(k, B, s, y0, y1, z0, z1) {
    const P = (y, z) => B.side(s, y, z, 0.004),
      a = s < 0 ? y1 : y0, // the reader's left: the front on the left side, the rear on the right
      b = s < 0 ? y0 : y1,
      n = 6;
    for (let i = 0; i < n; i++) {
      const u0 = i / n,
        u1 = (i + 1) / n,
        ya = mix(a, b, u0),
        yb = mix(a, b, u1),
        q = [P(ya, z0), P(yb, z0), P(yb, z1), P(ya, z1)],
        uv = [
          [u0, 0],
          [u1, 0],
          [u1, 1],
          [u0, 1],
        ];
      // counter-clockwise seen from outside: on the right side a → b runs forward
      if (s > 0) k.quad('schrift', q[0], q[1], q[2], q[3], C.white, uv);
      else k.quad('schrift', q[1], q[0], q[3], q[2], C.white, [uv[1], uv[0], uv[3], uv[2]]);
    }
  }
  // a mirror on a door: a housing on a foot, the glass facing back
  function spiegel(k, B, s, y, z, part = 'lack0', col = [1, 1, 1]) {
    const x = B.x(y, z);
    k.pad('matt', [s * (x + 0.035), y, z], [0.07, 0.05, 0.03], 0.01, C.black);
    k.pad(part, [s * (x + 0.115), y - 0.01, z + 0.035], [0.11, 0.075, 0.105], 0.03, col);
    k.box('chrom', [s * (x + 0.115), y - 0.05, z + 0.035], [0.09, 0.004, 0.085], C.alu, 'f');
  }
  // ======================= Wartburg 353 (also as the Volkspolizei's Funkstreifenwagen) =======================
  function wartburg(k, T, o) {
    const vp = o.bar === 'rundum',
      low = o.band ? 'lack2' : 'lack0', // the lower part of the body in a second colour (the Volkspolizei's olive green)
      D = {
        y0: -2.165,
        y1: 1.985,
        hw: [
          [-2.165, 0.71],
          [-2.15, 0.755],
          [-2.12, 0.785],
          [-2.06, 0.802],
          [-1.7, 0.812],
          [-0.9, T.hw],
          [0.5, T.hw],
          [1.4, 0.812],
          [1.86, 0.803],
          [1.93, 0.787],
          [1.965, 0.757],
          [1.985, 0.71],
        ],
        zb: [
          [-2.165, 0.36],
          [-2.05, 0.31],
          [-1.62, 0.25],
          [-0.86, 0.225],
          [0.8, 0.225],
          [1.6, 0.27],
          [1.93, 0.31],
          [1.985, 0.36],
        ],
        sh: [
          [-2.165, 0.855],
          [-2.14, 0.895],
          [-2.05, 0.91],
          [-1.5, 0.935],
          [0.62, 0.935],
          [1.85, 0.9],
          [1.95, 0.885],
          [1.985, 0.845],
        ],
        deck: [
          [-2.165, 0.85],
          [-2.14, 0.9],
          [-2.05, 0.92],
          [-1.5, 0.95],
          [0.62, 0.95],
          [1.85, 0.915],
          [1.95, 0.895],
          [1.985, 0.85],
        ],
        dp: 3,
        rs: 0.022,
        rl: 0.045,
        tuck: [
          [-2.165, 0.01],
          [-1.9, 0.04],
          [1.7, 0.04],
          [1.985, 0.01],
        ],
        sl: 0.02,
        zw: 0.6,
        ztrim: 0.62,
        gin: 0.07,
        pw: 0.055,
        cab: {
          y0: -1.5,
          y1: -1.07,
          y2: 0.2,
          y3: 0.62,
          roof: [
            [-1.07, 1.44],
            [-0.7, 1.475],
            [-0.2, 1.485],
            [0.2, 1.455],
          ],
          crown: 0.03,
          wr: [
            [-1.07, 0.645],
            [-0.3, 0.665],
            [0.2, 0.65],
          ],
          rr: 0.055,
          bowF: [0.08, 0.045],
          bowR: [0.07, 0.035],
          sideGlass: [
            [-1.04, -0.33],
            [-0.27, 0.62],
          ],
        },
        arches: [
          { y: T.a, r: 0.37, zc: 0.3 },
          { y: T.b, r: 0.36, zc: 0.3 },
        ],
        seams: [0.57, -0.3, -1.1],
        zone: {
          schweller: [low],
          seite: [low],
          inner: null,
        },
        inner: { trim: C.vinylGrey, liner: C.ivory },
      };
    const B = K.body(k, D),
      yF = 1.985;
    // ---- front: the grille's band of bars between round lamps in square bezels, indicators at the corners, the bumper ----
    k.box('matt', [0, yF + 0.006, 0.675], [1.34, 0.014, 0.21], C.black);
    for (let i = 0; i < 6; i++) k.box('matt', [0, yF + 0.016, 0.6 + i * 0.03], [0.92, 0.012, 0.012], C.dark);
    for (const s of [-1, 1]) {
      k.box('chrom', [s * 0.555, yF + 0.012, 0.675], [0.25, 0.014, 0.22], C.alu);
      rundLampe(k, s * 0.555, yF + 0.02, 0.675, 0.088, 1);
      k.box('blink', [s * 0.7, yF - 0.004, 0.52], [0.1, 0.03, 0.05], C.amber);
    }
    stossstange(
      k,
      'chrom',
      C.alu,
      [
        [-0.84, 1.62],
        [-0.84, 2.0],
        [0.84, 2.0],
        [0.84, 1.62],
      ],
      0.43,
      0.095,
      0.03,
      { rubber: true, left: true, r: 0.09 }
    );
    schild(k, 0, 2.036, 0.43, 1, 0.46, 0.105);
    // ---- rear: wide lamps at the corners, the lid's lock, plate, bumper, exhaust ----
    for (const s of [-1, 1]) {
      const yR = B.end(s * 0.6, 0.76, -1);
      k.box('matt', [s * 0.61, yR - 0.006, 0.76], [0.36, 0.024, 0.13], C.alu);
      k.box('tail', [s * 0.56, yR - 0.014, 0.76], [0.2, 0.026, 0.105], C.red);
      k.box('blink', [s * 0.72, yR - 0.014, 0.76], [0.11, 0.026, 0.105], C.amber);
    }
    const yRm = B.end(0, 0.7, -1);
    schild(k, 0, yRm - 0.008, 0.7, -1, 0.46, 0.105);
    k.box('chrom', [0, yRm - 0.012, 0.8], [0.1, 0.02, 0.03], C.alu);
    stossstange(
      k,
      'chrom',
      C.alu,
      [
        [-0.84, -1.8],
        [-0.84, -2.18],
        [0.84, -2.18],
        [0.84, -1.8],
      ],
      0.45,
      0.095,
      0.03,
      { rubber: true, r: 0.09 }
    );
    k.tube(
      'matt',
      [
        [0.4, -1.7, 0.26],
        [0.4, -2.2, 0.255],
      ],
      0.024,
      8,
      C.steel,
      { caps: 'b' }
    );
    // ---- sides: handles, a bright strip along the crease, gutters, the mirror ----
    for (const s of [-1, 1]) {
      for (const y of [0.0, -0.82]) k.box('chrom', B.side(s, y, 0.82, 0.012), [0.014, 0.12, 0.024], C.alu);
      const strip = [];
      for (let y = -1.95; y <= 1.8; y += 0.25) strip.push(B.side(s, y, 0.62, 0.006));
      k.tube('chrom', strip, 0.008, 5, C.alu);
      const gut = [];
      for (let i = 0; i < B.Y.length; i++) {
        const y = B.Y[i];
        if (y < D.cab.y1 - 0.02 || y > D.cab.y2 + 0.02) continue;
        const p = B.R[i][17];
        gut.push([s * (p[0] + 0.006), p[1], p[2] + 0.004]);
      }
      if (gut.length > 1) k.tube('lack0', gut, 0.008, 5, [1, 1, 1]);
      // the cabin's vent on the rear pillar
      const vx = B.x(-1.27, 1.13) + 0.004;
      k.box('matt', [s * vx, -1.27, 1.13], [0.008, 0.12, 0.05], C.black);
      if (vp) schriftzug(k, B, s, -0.25, 0.52, 0.415, 0.525);
    }
    spiegel(k, B, -1, 0.5, 0.97, 'chrom', C.alu);
    wischer(k, B, -0.52, -0.1, 0.605, 0.38);
    wischer(k, B, 0.03, 0.45, 0.605, 0.38);
    if (vp) {
      // the signal bridge: a bar across the roof on feet, one blue beacon in the middle, a horn loudspeaker on each side; the aerial
      const yb = -0.12,
        zr = B.top(yb, 0.4);
      for (const s of [-1, 1]) k.box('matt', [s * 0.52, yb, zr + 0.02], [0.05, 0.08, 0.07], C.dark);
      k.box('matt', [0, yb, zr + 0.065], [1.16, 0.07, 0.03], C.dark);
      k.lathe(
        'matt',
        [0, yb, zr + 0.08],
        [0, 0, 1],
        [
          [0.075, 0],
          [0.075, 0.03],
          [0.06, 0.034],
        ],
        14,
        C.silver
      );
      k.lathe(
        'blau',
        [0, yb, zr + 0.112],
        [0, 0, 1],
        [
          [0.062, 0],
          [0.064, 0.07],
          [0.055, 0.115],
          [0.03, 0.14],
          [0.0005, 0.146],
        ],
        14,
        [1, 1, 1]
      );
      for (const s of [-1, 1])
        k.lathe(
          'matt',
          [s * 0.36, yb - 0.1, zr + 0.14],
          [0, 1, 0],
          [
            [0.0005, 0],
            [0.03, 0.01],
            [0.036, 0.09],
            [0.06, 0.17],
            [0.088, 0.215],
            [0.092, 0.225],
            [0.085, 0.222],
            [0.03, 0.12],
          ],
          14,
          C.silver
        );
      k.tube(
        'matt',
        [
          [0.3, -0.75, B.top(-0.75, 0.3)],
          [0.3, -0.83, B.top(-0.75, 0.3) + 0.95],
        ],
        0.004,
        4,
        C.steel
      );
    }
    innen(k, B, D, T, o, {
      floor: 0.28,
      seat: C.vinylGrey,
      seatZ: 0.54,
      seatY: -0.02,
      seatX: 0.36,
      seatW: 0.54,
      bench: -0.98,
      dash: C.vinylBlack,
      wheel: C.vinylBlack,
      wheelR: 0.2,
      shelf: true,
    });
    return { B, schrift: vp ? { text: 'VOLKSPOLIZEI', fg: '#f3f1e6', bg: o.band || '#2f6b3a' } : null };
  }
  // ======================= an estate of today (the patrol car, the ordinary small estate) =======================
  function kombi(k, T, o, polizei) {
    const { yf, yr, hw, a, b } = T,
      roofZ = T.h - 0.03,
      belt = 0.66 * roofZ,
      y3 = a - 0.5, // the windscreen's foot
      y2 = a - 1.3, // the roof's front edge
      y1 = yr + 0.5,
      y0 = yr + 0.13,
      yB = a - 1.56,
      yC = b + 0.33,
      nose = [],
      n = 7;
    // the plan: round at both ends
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      nose.push([yf - 0.045 - 0.6 * (1 - u), hw * (1 - 0.2 * Math.pow(u, 2.4))]);
    }
    const tail = [];
    for (let i = 0; i <= n; i++) {
      const u = i / n;
      tail.push([yr + 0.045 + 0.4 * (1 - u), hw * (1 - 0.13 * Math.pow(u, 2.6))]);
    }
    const band = polizei && o.band ? 'lack2' : 'lack0',
      D = {
        y0: yr + 0.045,
        y1: yf - 0.045,
        hw: [...tail.reverse(), [b, hw], [a - 0.6, hw], ...nose],
        zb: [
          [yr + 0.045, 0.36],
          [yr + 0.3, 0.3],
          [b - 0.45, 0.24],
          [b + 0.5, 0.2],
          [a - 0.5, 0.2],
          [a + 0.45, 0.23],
          [yf - 0.2, 0.27],
          [yf - 0.045, 0.33],
        ],
        sh: [
          [yr + 0.045, belt + 0.0],
          [yr + 0.1, belt + 0.055],
          [b, belt + 0.06],
          [y3, belt],
          [a, belt - 0.07],
          [yf - 0.3, belt - 0.15],
          [yf - 0.1, belt - 0.195],
          [yf - 0.045, belt - 0.24],
        ],
        deck: [
          [yr + 0.045, belt + 0.0],
          [yr + 0.1, belt + 0.06],
          [y3, belt + 0.035],
          [a, belt - 0.03],
          [yf - 0.3, belt - 0.115],
          [yf - 0.1, belt - 0.17],
          [yf - 0.045, belt - 0.23],
        ],
        dp: 2,
        rs: [
          [y3, 0.055],
          [yf - 0.05, 0.09],
        ],
        rl: 0.07,
        tuck: 0.05,
        sl: 0.03,
        zw: 0.58,
        ztrim: belt - 0.3,
        gin: 0.095,
        pw: 0.07,
        cab: {
          y0,
          y1,
          y2,
          y3,
          roof: [
            [y1, roofZ - 0.07],
            [b + 0.2, roofZ - 0.025],
            [yB, roofZ],
            [y2, roofZ - 0.055],
          ],
          crown: 0.035,
          wr: [
            [y1, hw * 0.66],
            [yB, hw * 0.7],
            [y2, hw * 0.67],
          ],
          rr: 0.08,
          bowF: [0.13, 0.07],
          bowR: [0.07, 0.035],
          sideGlass: [
            [y1 + 0.05, yC - 0.05],
            [yC + 0.045, yB - 0.05],
            [yB + 0.05, y3],
          ],
        },
        arches: [
          { y: a, r: T.rw + 0.075, zc: T.rw + 0.01 },
          { y: b, r: T.rw + 0.075, zc: T.rw + 0.01 },
        ],
        seams: [a - 0.5, yB, yC],
        zone: {
          seite2: [band],
          schulter: [band],
          haube: [band],
          sims: polizei && o.band2 ? ['lack3'] : ['matt', C.black],
          schweller: ['matt', C.dark],
        },
        // the foil: blue along the doors and the wings between the wheels' ends, a bright yellow line along the shoulder
        farbe: polizei
          ? (zn, y) =>
              y > a + T.rw + 0.2 || y < b - T.rw - 0.15
                ? zn === 'seite2' || zn === 'schulter'
                  ? ['lack0']
                  : undefined
                : zn === 'schulter' && o.band2
                  ? ['lack3']
                  : undefined
          : undefined,
        inner: { trim: C.vinylBlack, liner: rgb(196, 194, 188) },
      };
    const B = K.body(k, D),
      yF = yf - 0.045,
      yR = yr + 0.045;
    // ---- front: the grille between slim lamps, the lower intake, the plate ----
    const zg = belt - 0.3;
    k.box('matt', [0, yF + 0.004, zg], [hw * 0.92, 0.012, 0.14], C.black);
    for (let i = 0; i < 3; i++) k.box('chrom', [0, yF + 0.012, zg - 0.04 + i * 0.04], [hw * 0.86, 0.008, 0.008], C.alu);
    k.box('matt', [0, yF + 0.002, 0.4], [hw * 1.25, 0.012, 0.13], C.black);
    for (const s of [-1, 1]) {
      const x = hw * 0.62,
        y = B.end(s * x, zg + 0.01, 1);
      k.at({ p: [s * x, y - 0.01, zg + 0.012], rz: -s * 0.32 }, () => {
        k.pad('head', [0, 0, 0], [hw * 0.46, 0.07, 0.115], 0.03, C.lens);
        k.box('blink', [s * hw * 0.16, 0.012, -0.03], [hw * 0.09, 0.05, 0.03], C.amber);
      });
      k.pad('matt', [s * hw * 0.72, B.end(s * hw * 0.72, 0.4, 1) - 0.02, 0.4], [0.16, 0.05, 0.09], 0.02, C.black);
    }
    schild(k, 0, yF + 0.014, 0.52, 1, 0.52, 0.11);
    // ---- rear: wide lamps round the corners, the plate in the lid, a dark apron, the wiper, the third brake light ----
    for (const s of [-1, 1]) {
      const x = hw * 0.74,
        y = B.end(s * x, belt - 0.07, -1);
      k.at({ p: [s * x, y + 0.012, belt - 0.07], rz: s * 0.22 }, () =>
        k.pad('tail', [0, 0, 0], [hw * 0.42, 0.06, 0.13], 0.03, C.red)
      );
    }
    schild(k, 0, B.end(0, belt - 0.2, -1) - 0.008, belt - 0.2, -1, 0.52, 0.11);
    k.box('matt', [0, yR - 0.002, 0.42], [hw * 1.5, 0.014, 0.16], C.black);
    k.box('tail', [0, y1 - 0.045, B.top(y1 - 0.045, 0) + 0.004], [0.3, 0.02, 0.012], C.red);
    // ---- sides: mirrors, handles, roof rails, the aerial's fin ----
    for (const s of [-1, 1]) {
      spiegel(k, B, s, y3 - 0.16, belt + 0.04, band === 'lack2' ? 'lack0' : 'lack0');
      for (const y of [(yB + y3) / 2 - 0.42, (yC + yB) / 2 - 0.33])
        k.pad('matt', B.side(s, y, belt - 0.09, 0.012), [0.022, 0.16, 0.028], 0.008, C.dark);
      const rail = [];
      for (let i = 0; i < B.Y.length; i++) {
        const y = B.Y[i];
        if (y < y1 + 0.12 || y > y2 - 0.25) continue;
        const p = B.R[i][19];
        rail.push([s * p[0], p[1], p[2] + 0.035]);
      }
      if (rail.length > 1) k.tube('matt', rail, 0.013, 6, polizei ? C.dark : C.silver, { caps: 1 });
      if (polizei) schriftzug(k, B, s, yB + 0.1, y3 - 0.22, belt - 0.235, belt - 0.085);
    }
    k.pad('matt', [0, y1 + 0.2, B.top(y1 + 0.2, 0) + 0.02], [0.05, 0.14, 0.05], 0.02, C.black);
    wischer(k, B, -hw * 0.6, -hw * 0.1, y3 - 0.02, y3 - 0.3);
    wischer(k, B, hw * 0.02, hw * 0.52, y3 - 0.02, y3 - 0.3);
    if (o.bar === 'balken') {
      // the light bar: a low base across the roof, two blue halves, a clear middle
      const yb = yB + 0.25,
        zr = B.top(yb, 0.3);
      k.pad('matt', [0, yb, zr + 0.035], [1.12, 0.3, 0.05], 0.02, C.black);
      k.pad('blau', [-0.31, yb, zr + 0.095], [0.5, 0.27, 0.085], 0.03, [1, 1, 1]);
      k.pad('blau2', [0.31, yb, zr + 0.095], [0.5, 0.27, 0.085], 0.03, [1, 1, 1]);
      k.pad('matt', [0, yb, zr + 0.09], [0.13, 0.26, 0.075], 0.02, C.silver);
    }
    innen(k, B, D, T, o, {
      floor: 0.3,
      seat: C.cloth,
      seatZ: 0.58,
      seatY: yB + 0.42,
      seatX: hw * 0.42,
      seatW: 0.52,
      bench: yC + 0.42,
      dash: C.vinylBlack,
      wheel: C.vinylBlack,
      wheelR: 0.185,
      head: true,
      rearWall: yr + 0.3,
    });
    return { B, schrift: polizei ? { text: 'POLIZEI', fg: '#ffffff', bg: o.band || '#1f4fa8' } : null };
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
  // the gutter along a roof's edge (a thin tube in a paint slot), between ya and yb
  function rinne(k, B, part, ya, yb, j = 17, r = 0.008) {
    for (const s of [-1, 1]) {
      const g = [];
      for (let i = 0; i < B.Y.length; i++) {
        if (B.Y[i] < ya || B.Y[i] > yb) continue;
        const p = B.R[i][j];
        g.push([s * (p[0] + 0.006), p[1], p[2] + 0.004]);
      }
      if (g.length > 1) k.tube(part, g, r, 5, [1, 1, 1]);
    }
  }
  // ======================= a panel van of today (white: the haulier's) =======================
  function transporter(k, T, o) {
    const { yf, yr, hw, a, b } = T,
      roofZ = T.h - 0.04,
      belt = 1.24,
      y3 = a - 0.1,
      y2 = a - 0.8,
      y1 = yr + 0.1,
      y0 = yr + 0.06,
      yB = a - 1.5,
      D = {
        y0: yr + 0.04,
        y1: yf - 0.04,
        hw: [
          ...ende(yr + 0.3, yr + 0.04, hw, 0.06, 3).reverse(),
          [a - 0.9, hw],
          ...ende(yf - 0.6, yf - 0.04, hw, 0.17, 2.6),
        ],
        zb: [
          [yr + 0.04, 0.42],
          [b - 0.6, 0.34],
          [b + 0.6, 0.3],
          [a - 0.6, 0.3],
          [a + 0.5, 0.32],
          [yf - 0.04, 0.4],
        ],
        sh: [
          [yr + 0.04, belt],
          [y3, belt],
          [a + 0.35, belt - 0.2],
          [yf - 0.12, belt - 0.33],
          [yf - 0.04, belt - 0.4],
        ],
        deck: [
          [yr + 0.04, belt],
          [y3, belt + 0.03],
          [a + 0.35, belt - 0.16],
          [yf - 0.12, belt - 0.3],
          [yf - 0.04, belt - 0.39],
        ],
        rs: [
          [y3, 0.03],
          [yf - 0.04, 0.09],
        ],
        rl: 0.06,
        tuck: 0.04,
        sl: 0.015,
        zw: 0.75,
        ztrim: 0.62,
        gin: 0.05,
        pw: 0.08,
        cab: {
          y0,
          y1,
          y2,
          y3,
          roof: [
            [y1, roofZ - 0.02],
            [yB, roofZ],
            [y2, roofZ - 0.08],
          ],
          crown: 0.04,
          wr: [
            [y1, hw - 0.1],
            [y2, hw - 0.13],
          ],
          rr: 0.09,
          bowF: [0.1, 0.06],
          sideGlass: [[yB + 0.06, y3]],
          rearGlass: false,
        },
        arches: [
          { y: a, r: T.rw + 0.08, zc: T.rw + 0.01 },
          { y: b, r: T.rw + 0.08, zc: T.rw + 0.01 },
        ],
        seams: [a - 0.38, yB, yB - 1.3],
        zone: { schweller: ['matt', C.dark], seite: ['lack0'], sims: ['lack0'] },
        inner: { trim: C.vinylGrey, liner: rgb(196, 194, 188), y0: yB - 0.1 },
      };
    const B = K.body(k, D),
      yF = yf - 0.04,
      yR = yr + 0.04;
    // front: a dark grille over a dark bumper, tall lamps at the corners
    k.box('matt', [0, yF + 0.004, belt - 0.5], [hw * 1.0, 0.012, 0.2], C.black);
    for (let i = 0; i < 3; i++)
      k.box('matt', [0, yF + 0.012, belt - 0.56 + i * 0.06], [hw * 0.94, 0.008, 0.012], C.dark);
    k.box('matt', [0, yF - 0.02, 0.5], [hw * 1.66, 0.1, 0.22], C.dark);
    for (const s of [-1, 1]) {
      const x = hw * 0.66,
        y = B.end(s * x, belt - 0.46, 1);
      k.at({ p: [s * x, y - 0.012, belt - 0.46], rz: -s * 0.3 }, () => {
        k.pad('head', [0, 0, 0.03], [hw * 0.34, 0.07, 0.2], 0.03, C.lens);
        k.box('blink', [s * hw * 0.1, 0.014, -0.085], [hw * 0.12, 0.05, 0.04], C.amber);
      });
      spiegel(k, B, s, y3 - 0.2, belt + 0.12, 'matt', C.black);
      k.pad('matt', B.side(s, a - 1.3, belt - 0.14, 0.012), [0.022, 0.16, 0.03], 0.008, C.dark);
      // the rub strip along the side
      const strip = [];
      for (let y = b - 0.55; y <= a - 0.45; y += 0.3) strip.push(B.side(s, y, 0.66, 0.008));
      k.tube('matt', strip, 0.022, 5, C.dark, { flat: [0.5, 1] });
      // rear lamps up the corners
      k.pad('tail', [s * (hw - 0.07), yR - 0.004, 1.25], [0.11, 0.05, 0.5], 0.02, C.red);
      k.box('blink', [s * (hw - 0.07), yR - 0.03, 1.56], [0.09, 0.02, 0.1], C.amber);
    }
    schild(k, 0, yF + 0.034, 0.5, 1, 0.52, 0.11);
    // rear: two doors, their handle, the plate, the bumper's step
    k.box('matt', [0, yR - 0.004, 1.3], [0.012, 0.01, 1.75], C.black);
    k.box('matt', [0.07, yR - 0.012, 1.15], [0.04, 0.02, 0.16], C.dark);
    schild(k, -0.45, yR - 0.008, 0.8, -1, 0.52, 0.11);
    k.box('matt', [0, yR - 0.03, 0.47], [hw * 1.9, 0.12, 0.14], C.dark);
    wischer(k, B, -hw * 0.6, -hw * 0.1, y3 - 0.03, y3 - 0.33);
    wischer(k, B, hw * 0.02, hw * 0.52, y3 - 0.03, y3 - 0.33);
    if (o.text) for (const s of [-1, 1]) schriftzug(k, B, s, b + 0.25, yB - 0.25, belt + 0.28, belt + 0.56);
    innen(k, B, D, T, o, {
      floor: 0.5,
      seat: C.cloth,
      seatZ: 0.86,
      seatY: yB + 0.42,
      seatX: hw * 0.45,
      seatW: 0.5,
      bench: null,
      dash: C.vinylBlack,
      wheel: C.vinylBlack,
      wheelR: 0.2,
      head: true,
      rearWall: yB + 0.06,
    });
    // the wall behind the seats
    k.quad2(
      'matt',
      [-(hw - 0.08), yB + 0.05, 0.5],
      [hw - 0.08, yB + 0.05, 0.5],
      [hw - 0.16, yB + 0.05, roofZ - 0.1],
      [-(hw - 0.16), yB + 0.05, roofZ - 0.1],
      C.vinylGrey
    );
    return {
      B,
      schrift: o.text
        ? { text: String(o.text).toUpperCase(), fg: o.textCol || '#1d2a44', bg: o.col || DEF.kasten }
        : null,
    };
  }
  // ======================= Barkas B 1000 (the small bus; o.kasten: the panel van) =======================
  function barkas(k, T, o) {
    const { yf, yr, hw, a, b } = T,
      roofZ = T.h - 0.02,
      belt = 1.0,
      y3 = yf - 0.26,
      y2 = yf - 0.78,
      y1 = yr + 0.34,
      y0 = yr + 0.09,
      yB = a - 0.62, // behind the cab's doors
      yC = b + 0.1,
      top = o.col2 ? 'lack1' : 'lack0',
      D = {
        y0: yr + 0.04,
        y1: yf - 0.035,
        hw: [
          ...ende(yr + 0.5, yr + 0.04, hw, 0.16, 2.6).reverse(),
          [a - 0.3, hw],
          ...ende(yf - 0.6, yf - 0.035, hw, 0.3, 2.3),
        ],
        zb: [
          [yr + 0.04, 0.44],
          [b - 0.5, 0.36],
          [b + 0.5, 0.31],
          [a - 0.5, 0.31],
          [a + 0.5, 0.36],
          [yf - 0.035, 0.46],
        ],
        sh: [
          [yr + 0.04, belt - 0.06],
          [yr + 0.12, belt],
          [y3, belt],
          [yf - 0.12, belt - 0.08],
          [yf - 0.035, belt - 0.2],
        ],
        deck: [
          [yr + 0.04, belt - 0.06],
          [yr + 0.12, belt],
          [y3, belt + 0.02],
          [yf - 0.12, belt - 0.07],
          [yf - 0.035, belt - 0.2],
        ],
        rs: [
          [y3, 0.03],
          [yf - 0.035, 0.12],
        ],
        rl: 0.07,
        tuck: 0.05,
        sl: 0.02,
        zw: 0.7,
        ztrim: 0.62,
        gin: 0.06,
        pw: 0.07,
        cab: {
          y0,
          y1,
          y2,
          y3,
          roof: [
            [y1, roofZ - 0.07],
            [b, roofZ - 0.01],
            [a - 0.4, roofZ],
            [y2, roofZ - 0.09],
          ],
          crown: 0.06,
          wr: [
            [y1, hw - 0.17],
            [a - 0.4, hw - 0.13],
            [y2, hw - 0.18],
          ],
          rr: 0.11,
          bowF: [0.2, 0.1],
          bowR: [0.08, 0.04],
          sideGlass: o.kasten
            ? [[yB + 0.05, y3]]
            : [
                [y1 + 0.03, yC - 0.05],
                [yC + 0.05, yB - 0.05],
                [yB + 0.05, y3],
              ],
        },
        arches: [
          { y: a, r: T.rw + 0.075, zc: T.rw + 0.02 },
          { y: b, r: T.rw + 0.075, zc: T.rw + 0.02 },
        ],
        seams: [a + 0.42, yB, yB - 1.05],
        zone: { saeule: [top], dachkante: [top], dach: [top], heckwand: [top], sims: ['chrom', C.alu] },
        inner: { trim: C.vinylGrey, liner: C.ivory },
      };
    const B = K.body(k, D),
      yF = yf - 0.035;
    // front: round lamps low at the corners, a small slotted grille between, indicators above the lamps, a chrome blade
    for (const s of [-1, 1]) {
      const x = hw * 0.62,
        y = B.end(s * x, 0.68, 1);
      rundLampe(k, s * x, y + 0.004, 0.68, 0.085, 1);
      k.box('blink', [s * x, B.end(s * x, 0.84, 1) + 0.002, 0.84], [0.1, 0.03, 0.045], C.amber);
      spiegel(k, B, s, y3 - 0.1, belt + 0.16, 'matt', C.black);
      k.box('chrom', B.side(s, a - 0.2, belt - 0.14, 0.012), [0.014, 0.12, 0.024], C.alu);
      // rear lamps low at the corners
      const yt = B.end(s * (hw * 0.78), 0.74, -1);
      k.box('tail', [s * hw * 0.78, yt - 0.012, 0.74], [0.11, 0.03, 0.16], C.red);
      k.box('blink', [s * hw * 0.78, yt - 0.012, 0.87], [0.11, 0.03, 0.07], C.amber);
    }
    k.box('matt', [0, yF + 0.004, 0.7], [0.5, 0.012, 0.12], C.black);
    for (let i = 0; i < 4; i++) k.box('chrom', [0, yF + 0.012, 0.655 + i * 0.03], [0.5, 0.008, 0.01], C.alu);
    stossstange(
      k,
      'chrom',
      C.alu,
      [
        [-(hw + 0.01), yf - 0.75],
        [-(hw + 0.01), yf - 0.02],
        [hw + 0.01, yf - 0.02],
        [hw + 0.01, yf - 0.75],
      ],
      0.47,
      0.1,
      0.03,
      { left: true, r: 0.3 }
    );
    schild(k, 0, yf + 0.016, 0.47, 1, 0.46, 0.105);
    stossstange(
      k,
      'chrom',
      C.alu,
      [
        [-(hw + 0.01), yr + 0.6],
        [-(hw + 0.01), yr + 0.02],
        [hw + 0.01, yr + 0.02],
        [hw + 0.01, yr + 0.6],
      ],
      0.47,
      0.1,
      0.03,
      { r: 0.18 }
    );
    schild(k, 0, B.end(0, 0.78, -1) - 0.008, 0.78, -1, 0.46, 0.105);
    k.box('chrom', [0, B.end(0, 0.92, -1) - 0.012, 0.92], [0.12, 0.02, 0.03], C.alu);
    rinne(k, B, top, y1, y2, 17, 0.01);
    wischer(k, B, -hw * 0.55, -hw * 0.08, y3 - 0.03, y3 - 0.3);
    wischer(k, B, hw * 0.04, hw * 0.5, y3 - 0.03, y3 - 0.3);
    innen(k, B, D, T, o, {
      floor: 0.52,
      seat: C.vinylGrey,
      seatZ: 0.86,
      seatY: a - 0.22,
      seatX: hw * 0.45,
      seatW: 0.5,
      bench: o.kasten ? null : b + 0.75,
      dash: C.vinylBlack,
      wheel: C.vinylBlack,
      wheelR: 0.21,
      foot: 0.1,
    });
    if (!o.kasten) sitz(k, 0, b - 0.15, 0.87, hw * 1.5, C.vinylGrey, { d: 0.44, hb: 0.5, lean: 0.3 });
    return { B };
  }
  // ======================= W 50 L: the cab, the frame, the flatbed with its drop sides =======================
  function w50(k, T, o) {
    const { yf, yr, a, b } = T,
      hw = 1.15, // the cab (the bed is 2.5 m wide)
      roofZ = 2.5,
      belt = 1.6,
      yc0 = yf - 1.72, // the cab's back
      y3 = yf - 0.16,
      y2 = yf - 0.5,
      D = {
        y0: yc0,
        y1: yf - 0.04,
        hw: [[yc0, hw - 0.03], [yc0 + 0.1, hw], [yf - 0.5, hw], ...ende(yf - 0.4, yf - 0.04, hw, 0.09, 2.6)],
        zb: [
          [yc0, 0.95],
          [a - 0.7, 0.95],
          [a - 0.68, 0.8],
          [yf - 0.04, 0.8],
        ],
        sh: [
          [yc0, belt],
          [y3, belt],
          [yf - 0.04, belt - 0.06],
        ],
        deck: [
          [yc0, belt],
          [y3, belt + 0.01],
          [yf - 0.04, belt - 0.06],
        ],
        rs: 0.03,
        rl: 0.05,
        tuck: 0.02,
        sl: 0.012,
        zw: 1.2,
        ztrim: 1.3,
        gin: 0.05,
        pw: 0.07,
        cab: {
          y0: yc0 + 0.02,
          y1: yc0 + 0.06,
          y2,
          y3,
          roof: [
            [yc0 + 0.06, roofZ - 0.03],
            [yc0 + 0.7, roofZ],
            [y2, roofZ - 0.06],
          ],
          crown: 0.07,
          wr: hw - 0.12,
          rr: 0.12,
          bowF: [0.05, 0.03],
          sideGlass: [[yc0 + 0.45, y3 - 0.02]],
          rearGlass: false,
        },
        arches: [{ y: a, r: 0.62, zc: 0.5 }],
        seams: [yc0 + 0.38, yf - 0.42],
        zone: { boden: ['matt', C.frame] },
        inner: { trim: C.vinylGrey, liner: C.ivory },
      };
    const B = K.body(k, D),
      yF = yf - 0.04;
    // front: the grille's slats in the middle, round lamps low beside it, indicators at the corners, the bumper
    k.box('matt', [0, yF + 0.004, 1.22], [0.98, 0.014, 0.5], C.black);
    for (let i = 0; i < 7; i++) k.box('lack0', [0, yF + 0.014, 1.02 + i * 0.066], [0.94, 0.012, 0.03], [1, 1, 1]);
    for (const s of [-1, 1]) {
      rundLampe(k, s * 0.8, B.end(s * 0.8, 1.02, 1) + 0.006, 1.02, 0.095, 1);
      k.box('blink', [s * 0.8, B.end(s * 0.8, 1.2, 1) + 0.004, 1.2], [0.13, 0.03, 0.06], C.amber);
      // mirrors on long arms, the step under the door, the door's handle
      const xm = B.x(y3 - 0.1, belt + 0.2);
      k.tube(
        'matt',
        [
          [s * xm, y3 - 0.1, belt + 0.1],
          [s * (xm + 0.2), y3 - 0.05, belt + 0.25],
          [s * (xm + 0.2), y3 - 0.05, belt + 0.55],
          [s * xm, y3 - 0.12, belt + 0.62],
        ],
        0.009,
        5,
        C.dark
      );
      k.box('matt', [s * (xm + 0.2), y3 - 0.06, belt + 0.4], [0.13, 0.02, 0.24], C.dark);
      k.box('chrom', [s * (xm + 0.2), y3 - 0.073, belt + 0.4], [0.115, 0.004, 0.22], C.alu, 'f');
      k.box('matt', [s * (hw - 0.04), yc0 + 0.75, 0.72], [0.12, 0.4, 0.03], C.frame);
      k.box('chrom', B.side(s, yc0 + 0.5, belt - 0.14, 0.012), [0.014, 0.12, 0.024], C.alu);
    }
    k.box('matt', [0, yf - 0.02, 0.78], [2.36, 0.12, 0.2], C.white);
    schild(k, 0, yf + 0.046, 0.78, 1, 0.46, 0.105);
    // the screen's middle bar, the wipers, the roof hatch
    k.tube(
      'matt',
      [
        [0, y3 + 0.03, belt + 0.02],
        [0, y2 + 0.02, roofZ - 0.1],
      ],
      0.018,
      5,
      C.dark
    );
    wischer(k, B, -0.9, -0.3, y3 - 0.02, y3 - 0.2);
    wischer(k, B, 0.12, 0.72, y3 - 0.02, y3 - 0.2);
    k.pad('lack0', [0, yc0 + 0.75, roofZ + 0.03], [0.6, 0.6, 0.05], 0.02, [1, 1, 1]);
    // the cab's back wall has a window
    k.box('matt', [0, yc0 - 0.004, belt + 0.38], [0.9, 0.006, 0.36], C.black);
    innen(k, B, D, T, o, {
      floor: 1.0,
      seat: C.vinylBrown,
      seatZ: 1.38,
      seatY: yc0 + 0.55,
      seatX: 0.52,
      seatW: 0.56,
      bench: null,
      dash: C.vinylBlack,
      wheel: C.vinylBlack,
      wheelR: 0.24,
      foot: 0.0,
      rearWall: yc0 + 0.05,
    });
    // ---- the frame: two rails, cross members, the tank, the battery box ----
    const board = hex(o.plane || '#6f7460'),
      bz = 1.3, // the bed's floor
      by0 = yr + 0.02,
      by1 = yc0 - 0.12,
      bw = 1.25;
    for (const s of [-1, 1]) {
      k.box('matt', [s * 0.42, (yr + 0.1 + yf - 0.6) / 2, 0.9], [0.08, yf - 0.6 - yr - 0.1, 0.22], C.frame);
      // rear mudguards over the twin wheels
      const rows = [];
      for (let i = 0; i <= 10; i++) {
        const f = ((20 + (140 * i) / 10) * Math.PI) / 180;
        rows.push([
          [s * 0.72, b + Math.cos(f) * 0.6, T.rw + Math.sin(f) * 0.6],
          [s * 1.22, b + Math.cos(f) * 0.6, T.rw + Math.sin(f) * 0.6],
        ]);
      }
      k.smooth(() => k.grid(rows, () => ['matt', C.frame], { both: true }));
      // side boards: three planks between posts
      for (let i = 0; i < 3; i++)
        k.box('matt', [s * (bw - 0.025), (by0 + by1) / 2, bz + 0.1 + i * 0.17], [0.05, by1 - by0, 0.16], board);
      for (let y = by0 + 0.05; y <= by1; y += (by1 - by0 - 0.1) / 3)
        k.box('matt', [s * (bw + 0.005), y, bz + 0.26], [0.03, 0.08, 0.56], C.frame);
    }
    for (const y of [yr + 0.3, b, b + 1.0, yc0 - 0.3]) k.box('matt', [0, y, 0.9], [0.9, 0.08, 0.16], C.frame);
    k.lathe(
      'matt',
      [0.62, yc0 - 0.95, 0.72],
      [0, 1, 0],
      [
        [0.0005, 0],
        [0.24, 0],
        [0.24, 0.7],
        [0.0005, 0.7],
      ],
      14,
      C.steel
    );
    k.box('matt', [-0.7, yc0 - 0.6, 0.75], [0.36, 0.5, 0.36], C.frame);
    // the bed: floor, front wall, tail board
    k.box('matt', [0, (by0 + by1) / 2, bz], [2 * bw, by1 - by0, 0.1], C.wood);
    k.box('matt', [0, (by0 + by1) / 2, bz - 0.11], [2 * bw - 0.2, by1 - by0, 0.12], C.frame);
    for (let i = 0; i < 5; i++) k.box('matt', [0, by1 - 0.025, bz + 0.1 + i * 0.17], [2 * bw, 0.05, 0.16], board);
    for (let i = 0; i < 3; i++) k.box('matt', [0, by0 + 0.025, bz + 0.1 + i * 0.17], [2 * bw, 0.05, 0.16], board);
    // rear: lamps on the frame's end, the plate, the underrun bar
    for (const s of [-1, 1]) {
      k.box('tail', [s * 0.85, yr + 0.03, 0.95], [0.2, 0.04, 0.12], C.red);
      k.box('blink', [s * 1.03, yr + 0.03, 0.95], [0.12, 0.04, 0.12], C.amber);
    }
    k.box('matt', [0, yr + 0.06, 0.62], [2.2, 0.08, 0.1], C.white);
    schild(k, -0.35, yr + 0.016, 0.95, -1, 0.46, 0.105);
    return { B };
  }
  // ======================= the Trabant's cockpit (the car the player drives in 1989) =======================
  // What one sees from the driver's seat: the painted dash with its padded roll, the round speedometer behind the thin two-spoke
  // wheel, pull knobs and switches, the ignition lock, the gear lever out of the dash (the „Krückstock“), the open shelf on the
  // passenger's side, the heater's slider, the radio with its dial, the mirror, sun visors, door cranks, hand brake, pedals.
  // The wheel and the needle are pieces of their own (they turn); the dial's and the radio's faces carry texture coordinates.
  const TC = (() => {
    const hub = [-0.33, 0.07, 0.775],
      col = K.V.nrm([0, -0.43, 0.175]), // the column, towards the driver
      d = K.V.nrm([0, -0.98, 0.2]); // the way the instruments face
    return {
      hub,
      col,
      dial: { c: [-0.33, 0.236, 0.805], d, r: [1, 0, 0], up: K.V.crs(d, [1, 0, 0]), R: 0.052, max: 120 },
      radio: { c: [0.13, 0.236, 0.765], d, r: [1, 0, 0], up: K.V.crs(d, [1, 0, 0]), w: 0.062, h: 0.016 },
      eye1: [-0.33, -0.36, 1.06],
      eye3: [-0.33, -0.2, 1.2],
    };
  })();
  function trabantCockpit(k, B, sh) {
    const yD = 0.25, // the dash's face
      xd = B.x(yD, sh) - 0.05,
      face = TC.dial.d,
      on = (c, u, v, w = 0) =>
        K.V.add(c, K.V.add(K.V.mul(TC.dial.r, u), K.V.add(K.V.mul(TC.dial.up, v), K.V.mul(face, w))));
    // the panel in the body's colour, a black padded roll along its top, a dark lower edge
    k.box('lack0', [0, yD + 0.012, 0.775], [2 * xd, 0.024, 0.19], [1, 1, 1], 'f');
    k.tube(
      'matt',
      [
        [-xd, yD + 0.01, 0.872],
        [xd, yD + 0.01, 0.872],
      ],
      0.026,
      8,
      C.vinylBlack,
      { caps: 1 }
    );
    k.box('matt', [0, yD + 0.015, 0.672], [2 * xd, 0.03, 0.02], C.vinylBlack);
    // the demister's two slots in the dash's top, the loudspeaker's grille between them
    for (const x of [-0.36, 0.36]) k.box('matt', [x, yD + 0.2, sh - 0.016], [0.3, 0.02, 0.004], C.black, 'b');
    for (let i = 0; i < 6; i++)
      k.box('matt', [0, yD + 0.1 + i * 0.016, sh - 0.024], [0.16, 0.006, 0.004], C.black, 'b');
    // ---- the speedometer: a chrome bezel, the face (textured), three control lamps under it ----
    const dc = TC.dial.c,
      R = TC.dial.R;
    k.lathe(
      'chrom',
      dc,
      face,
      [
        [R + 0.008, -0.004],
        [R + 0.009, 0.006],
        [R + 0.004, 0.01],
        [R, 0.006],
      ],
      24,
      C.alu
    );
    k.scheibe('tacho', on(dc, 0, 0, 0.003), TC.dial.r, TC.dial.up, R, C.white, 24);
    // three control lamps beside the dial: charge (red), indicator (green), high beam (blue) – their own parts, lit by
    // grenzland/gl_cockpit.js
    [
      ['k_rot', rgb(190, 30, 24), -0.255],
      ['k_gruen', rgb(40, 150, 60), -0.235],
      ['k_blau', rgb(40, 80, 190), -0.215],
    ].forEach(([part, c, x]) => {
      k.lathe(
        'chrom',
        [x, yD - 0.001, 0.855],
        [0, -1, 0],
        [
          [0.0085, 0],
          [0.0085, 0.003],
          [0.007, 0.004],
        ],
        10,
        C.alu
      );
      k.lathe(
        part,
        [x, yD - 0.001, 0.855],
        [0, -1, 0],
        [
          [0.007, 0.003],
          [0.005, 0.007],
          [0.0005, 0.0085],
        ],
        10,
        c
      );
    });
    // ---- knobs and switches in a row right of the wheel: light (pull), wiper, fan, choke; the ignition lock ----
    const knob = (x, z, r, l, c) =>
      k.lathe(
        'matt',
        [x, yD, z],
        [0, -1, 0],
        [
          [r * 0.5, 0],
          [r * 0.5, l * 0.6],
          [r, l * 0.62],
          [r, l],
          [r * 0.6, l + 0.004],
          [0.0005, l + 0.005],
        ],
        10,
        c
      );
    knob(-0.2, 0.745, 0.013, 0.028, C.vinylBlack);
    knob(-0.155, 0.745, 0.011, 0.022, C.vinylBlack);
    knob(-0.115, 0.745, 0.011, 0.022, C.vinylBlack);
    knob(-0.07, 0.745, 0.012, 0.034, C.ivory);
    k.lathe(
      'chrom',
      [-0.2, yD, 0.8],
      [0, -1, 0],
      [
        [0.016, 0],
        [0.016, 0.008],
        [0.006, 0.01],
        [0.0005, 0.01],
      ],
      12,
      C.alu
    );
    // toggle switches
    for (const x of [-0.15, -0.115])
      k.tube(
        'chrom',
        [
          [x, yD, 0.8],
          [x, yD - 0.022, 0.808],
        ],
        0.004,
        5,
        C.alu,
        { caps: 'b' }
      );
    // the ashtray's lid
    k.box('chrom', [0.0, yD - 0.002, 0.72], [0.1, 0.004, 0.035], C.alu, 'f');
    // ---- the radio in the dash: a bright frame, the dial (textured), two knobs ----
    const rc = TC.radio.c;
    k.box('matt', [rc[0], yD - 0.001, rc[2]], [0.2, 0.006, 0.062], C.silver, 'f');
    k.quad(
      'radio',
      on(rc, -TC.radio.w, -TC.radio.h, 0.004),
      on(rc, TC.radio.w, -TC.radio.h, 0.004),
      on(rc, TC.radio.w, TC.radio.h, 0.004),
      on(rc, -TC.radio.w, TC.radio.h, 0.004),
      C.white,
      [
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]
    );
    knob(rc[0] - 0.082, rc[2], 0.011, 0.016, C.vinylBlack);
    knob(rc[0] + 0.082, rc[2], 0.011, 0.016, C.vinylBlack);
    for (let i = 0; i < 5; i++)
      k.box('matt', [rc[0] - 0.048 + i * 0.024, yD - 0.008, rc[2] - 0.023], [0.018, 0.012, 0.008], C.ivory);
    // ---- the heater's slider under the dash's middle ----
    k.box('matt', [0.0, yD - 0.004, 0.655], [0.13, 0.008, 0.03], C.vinylBlack, 'f');
    k.box('matt', [0.0, yD - 0.009, 0.655], [0.1, 0.004, 0.005], C.silver, 'f');
    k.lathe(
      'matt',
      [0.022, yD - 0.01, 0.655],
      [0, -1, 0],
      [
        [0.008, 0],
        [0.009, 0.014],
        [0.0005, 0.016],
      ],
      8,
      rgb(180, 30, 24)
    );
    // ---- the open shelf on the passenger's side ----
    k.box('matt', [0.4, yD - 0.09, 0.61], [0.56, 0.2, 0.012], C.vinylBlack);
    k.box('matt', [0.4, yD - 0.19, 0.625], [0.56, 0.012, 0.04], C.vinylBlack);
    // ---- the gear lever out of the dash: the rod, the crook, the knob ----
    k.tube(
      'chrom',
      [
        [-0.25, yD + 0.01, 0.775],
        [-0.225, yD - 0.14, 0.805],
        [-0.22, yD - 0.17, 0.798],
        [-0.218, yD - 0.185, 0.775],
      ],
      0.007,
      6,
      C.alu
    );
    k.lathe(
      'matt',
      [-0.218, yD - 0.187, 0.755],
      [0, 0, 1],
      [
        [0.0005, -0.022],
        [0.016, -0.016],
        [0.022, 0],
        [0.016, 0.016],
        [0.0005, 0.022],
      ],
      10,
      C.vinylBlack
    );
    // ---- the steering column with the indicator's stalk ----
    k.tube('matt', [[-0.33, 0.5, 0.6], K.V.add(TC.hub, K.V.mul(TC.col, -0.03))], 0.02, 8, C.vinylBlack);
    k.tube(
      'matt',
      [
        [-0.35, 0.15, 0.745],
        [-0.47, 0.13, 0.765],
      ],
      0.005,
      5,
      C.vinylBlack,
      { caps: 'b' }
    );
    // ---- mirror, sun visors ----
    const zr = B.top(0.2, 0) - 0.03;
    k.pad('matt', [0, 0.26, zr - 0.05], [0.2, 0.02, 0.06], 0.008, C.vinylBlack);
    k.box('chrom', [0, 0.248, zr - 0.05], [0.185, 0.003, 0.05], C.alu, 'f');
    for (const s of [-1, 1])
      k.pad('matt', [s * 0.3, 0.14, B.top(0.14, 0.3) - 0.022], [0.34, 0.1, 0.012], 0.005, C.ivory);
    // ---- doors: arm rest, window crank, the inner handle ----
    for (const s of [-1, 1]) {
      const x = B.x(-0.1, 0.72) - 0.04;
      k.pad('matt', [s * x, -0.12, 0.72], [0.05, 0.3, 0.04], 0.015, C.vinylBrown);
      k.tube(
        'chrom',
        [
          [s * (x + 0.02), 0.2, 0.7],
          [s * (x - 0.01), 0.2, 0.7],
          [s * (x - 0.012), 0.15, 0.67],
        ],
        0.005,
        5,
        C.alu
      );
      k.lathe(
        'matt',
        [s * (x - 0.012), 0.15, 0.67],
        [-s, 0, 0],
        [
          [0.009, 0],
          [0.009, 0.02],
          [0.0005, 0.022],
        ],
        8,
        C.vinylBlack
      );
      k.box('chrom', [s * (x + 0.012), 0.02, 0.8], [0.01, 0.09, 0.018], C.alu);
    }
    // ---- between the seats: the hand brake; at the fire wall: three pedals ----
    k.tube(
      'matt',
      [
        [0, -0.36, 0.3],
        [0, -0.12, 0.4],
        [0, -0.05, 0.415],
      ],
      0.011,
      6,
      C.vinylBlack,
      { caps: 'b' }
    );
    [-0.43, -0.34, -0.24].forEach((x, i) => {
      k.pad(
        'matt',
        [x, 0.63, 0.4 - (i === 2 ? 0.02 : 0)],
        [i === 2 ? 0.05 : 0.06, 0.02, i === 2 ? 0.09 : 0.06],
        0.008,
        C.rubber
      );
      k.tube(
        'matt',
        [
          [x, 0.63, 0.4],
          [x, 0.72, 0.55],
        ],
        0.006,
        4,
        C.dark
      );
    });
  }
  // the pieces that turn: the wheel in its own frame (x right, y along the column away from the driver, z up in the wheel's
  // plane), the needle in the dial's frame (x right, y up on the face, z towards the driver)
  function trabantLenkrad() {
    const k = K.kit();
    lenkrad(k, 'matt', 0.19, C.ivory, { t: 0.0105, ts: 0.0085, spokes: [0, Math.PI] });
    return k.done();
  }
  function tachoNadel(len = 0.04, col = rgb(214, 60, 24)) {
    const k = K.kit();
    k.quad('matt', [-len * 0.25, -0.002, 0], [len, -0.0009, 0], [len, 0.0009, 0], [-len * 0.25, 0.002, 0], col);
    k.lathe(
      'matt',
      [0, 0, 0],
      [0, 0, 1],
      [
        [0.007, -0.001],
        [0.007, 0.003],
        [0.0005, 0.004],
      ],
      10,
      C.black
    );
    return k.done();
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
    k.quad2(
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
    wartburg,
    streife: (k, T, o) => kombi(k, T, o, true),
    kombi: (k, T, o) => kombi(k, T, o, false),
    kasten: transporter,
    barkas,
    w50,
  };
  const RAD = {
    trabant: { rim: 0.178, col: C.silver, cap: 'chrom', capR: 0.062, dish: 0.03 },
    wartburg: { rim: 0.182, col: C.silver, cap: 'chrom', capR: 0.085, dish: 0.03 },
    streife: { rim: 0.225, col: C.dark, spokes: 5, spokeCol: C.silver, dish: 0.02 },
    kombi: { rim: 0.2, col: C.dark, spokes: 5, spokeCol: C.silver, dish: 0.02 },
  };
  RAD.trabant_kombi = RAD.trabant;
  RAD.kasten = { rim: 0.215, col: C.silver, cap: C.dark, capR: 0.09, dish: 0.035 };
  RAD.barkas = { rim: 0.2, col: C.silver, cap: 'chrom', capR: 0.085, dish: 0.03 };
  RAD.w50 = { rim: 0.29, col: rgb(120, 60, 50), cap: C.dark, capR: 0.12, dish: 0.06, seg: 24 };
  RAD['w50:h'] = { twin: true, dish: -0.02 };
  // paint: how metallic (the plain paints of 1989: 0)
  TYP.streife.metal = 0.55;
  TYP.kombi.metal = 0.55;
  const ALIAS = { limo89: 'wartburg', klein89: 'trabant', lkw89: 'w50' };
  const cache = new Map();
  function bau(typ0, o = {}) {
    const typ = ALIAS[typ0] || typ0,
      T = TYP[typ],
      fn = BUILD[typ];
    if (!T || !fn) return null;
    const key =
      typ +
      '|' +
      JSON.stringify([o.col, o.col2, o.band, o.band2, o.bar, o.plane, o.innen, o.einzel, o.text, o.textCol, o.kasten]);
    if (cache.has(key)) return cache.get(key);
    const k = K.kit(),
      res = fn(k, T, o);
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
    const M = { typ, T, pieces, tris: k.count(), schrift: (res && res.schrift) || null, cockpit: null };
    if (o.innen === 'cockpit' && (typ === 'trabant' || typ === 'trabant_kombi')) {
      pieces.push({ name: 'lenkrad', parts: trabantLenkrad(), at: TC.hub, paint });
      pieces.push({ name: 'nadel', parts: tachoNadel(0.04), at: TC.dial.c, paint });
      M.cockpit = TC;
    }
    cache.set(key, M);
    return M;
  }
  const has = typ => !!BUILD[ALIAS[typ] || typ];
  return { TYP, ALIAS, DEF, C, TC, bau, has, parts: { rundLampe, stossstange, schild, wischer, sitz, lenkrad, innen } };
})();
