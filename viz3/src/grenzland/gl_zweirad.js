// ===================== feat/grenzland-auto: the mopeds as geometry – Simson S 51 and Schwalbe KR 51 (GLZWEIRAD) =====================
// Pure (grenzland/gl_karosse.js only). The S 51 in its real measures (wheelbase 1210 mm, length 1890 mm, tyres 2.75-16, handlebar
// 0.62 m wide): the pressed frame, the tank with its filler cap, side covers, the long seat, the forward-leaning cylinder with fins,
// the chrome exhaust, rubber gaiters on the fork and round the chain, spoked wheels, twin shocks, carrier, round lamp, the round
// speedometer on the fork's head, mirror, indicators. No lettering, no badges. What turns with the handlebar is its own piece
// ('lenkung', about the steering axis through `pivot`), the wheel is one piece used twice, the speedometer's needle another.
//   GLZWEIRAD.TYP.s51 | schwalbe     measures (yf, yr, a, b, rw, …), pivot, axis, dial: { c, d, r, up, R }, eye1, eye3, seat
//   GLZWEIRAD.bau(typ, o)            → { T, pieces: [{ name: 'rahmen' | 'lenkung' | 'rad' | 'nadel', parts, at, paint }] }   o: { col }
import { GLKAROSSE as K } from './gl_karosse.js';
export const GLZWEIRAD = (() => {
  const { rgb, hex } = K,
    { nrm, crs, add, mul } = K.V;
  const C = {
    black: rgb(16, 16, 17),
    rubber: rgb(24, 24, 25),
    frame: rgb(22, 23, 25),
    alu: rgb(176, 178, 180),
    aluDark: rgb(120, 122, 124),
    steel: rgb(150, 152, 155),
    chrome: rgb(205, 207, 210),
    seat: rgb(26, 26, 28),
    amber: rgb(232, 130, 20),
    red: rgb(170, 20, 16),
    lens: rgb(225, 228, 230),
    plate: rgb(236, 236, 230),
    white: rgb(232, 230, 222),
    needle: rgb(214, 60, 24),
  };
  const RW = 0.277,
    A = 0.63,
    B = -0.58;
  const AX = nrm([0, -0.454, 0.891]), // the steering axis (27° back from the vertical)
    PIV = [0, A - 0.654 * 0.454, RW + 0.654 * 0.891]; // its upper end: the fork's head (the axle lies on the axis)
  // the speedometer: its middle, the way it faces (towards the rider), its right and up
  const DIAL_D = nrm([0, -0.5, 0.866]),
    DIAL = {
      c: [0, PIV[1] + 0.078, PIV[2] + 0.05],
      d: DIAL_D,
      r: [1, 0, 0],
      up: crs(DIAL_D, [1, 0, 0]),
      R: 0.04,
    },
    HAHN = [-0.118, -0.02, 0.652]; // the fuel tap under the tank on the left
  const TYP = {
    // Simson S 51: 1890 × 635 × 1200 mm, wheelbase 1210, 2.75-16, 8.7 l, 3.7 PS, 60 km/h
    s51: {
      yf: A + RW,
      yr: -0.98,
      hw: 0.32,
      a: A,
      b: B,
      rw: RW,
      h: 1.13,
      form: 'moped',
      name: 'Simson S 51',
      pivot: PIV,
      axis: AX,
      dial: DIAL,
      hahn: HAHN,
      seat: [0, -0.42, 0.79],
      eye1: [0, -0.32, 1.22],
      eye3: [0, -0.38, 1.55],
      beam: [0, 0.6, 0.8],
    },
    // Simson Schwalbe KR 51: 1815 × 745 × 1125 mm, wheelbase 1190, 2.75-16
    schwalbe: {
      yf: 0.61 + RW,
      yr: -0.93,
      hw: 0.36,
      a: 0.61,
      b: -0.58,
      rw: RW,
      h: 1.1,
      form: 'moped',
      name: 'Simson Schwalbe',
      pivot: [0, 0.61 - 0.62 * 0.44, RW + 0.62 * 0.898],
      axis: nrm([0, -0.44, 0.898]),
      dial: null,
      seat: [0, -0.4, 0.78],
      eye1: [0, -0.48, 1.34],
      eye3: [0, -0.36, 1.53],
      beam: [0, 0.5, 0.86],
    },
  };
  for (const T of Object.values(TYP)) {
    T.hl = (T.yf - T.yr) / 2;
    T.cy = (T.yf + T.yr) / 2;
    T.wb = T.a - T.b;
  }
  const sub3 = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
  // ---- a spoked wheel about the x axis at the origin ----
  function rad() {
    const k = K.kit(),
      r = RW,
      w = 0.072;
    // the tyre: round shoulders, a narrow tread
    k.lathe(
      'matt',
      [0, 0, 0],
      [1, 0, 0],
      [
        [0.218, -0.02],
        [0.24, -0.033],
        [0.262, -0.034],
        [r - 0.006, -0.022],
        [r, -0.008],
        [r, 0.008],
        [r - 0.006, 0.022],
        [0.262, 0.034],
        [0.24, 0.033],
        [0.218, 0.02],
      ],
      24,
      C.black
    );
    // the rim: an alloy ring
    k.lathe(
      'matt',
      [0, 0, 0],
      [1, 0, 0],
      [
        [0.206, -0.012],
        [0.212, -0.024],
        [0.222, -0.024],
        [0.222, -0.019],
        [0.218, -0.016],
        [0.218, 0.016],
        [0.222, 0.019],
        [0.222, 0.024],
        [0.212, 0.024],
        [0.206, 0.012],
        [0.206, -0.012],
      ],
      24,
      C.alu
    );
    // the hub with its brake drum
    k.lathe(
      'matt',
      [0, 0, 0],
      [1, 0, 0],
      [
        [0.0005, -0.05],
        [0.028, -0.05],
        [0.03, -0.04],
        [0.062, -0.036],
        [0.064, 0.0],
        [0.05, 0.03],
        [0.03, 0.04],
        [0.028, 0.05],
        [0.0005, 0.05],
      ],
      16,
      C.aluDark
    );
    // 36 spokes, crossed: thin strips from the hub's flanges to the rim
    for (let i = 0; i < 36; i++) {
      const s = i % 2 ? 1 : -1,
        a0 = (i / 36) * Math.PI * 2,
        a1 = a0 + (((i >> 1) % 2 ? 1 : -1) * 34 * Math.PI) / 180,
        p = [s * 0.036, Math.cos(a0) * 0.05, Math.sin(a0) * 0.05],
        q = [s * 0.006, Math.cos(a1) * 0.207, Math.sin(a1) * 0.207],
        t = nrm(sub3(q, p)),
        n = mul(nrm(crs(t, [1, 0, 0])), 0.0016);
      k.quad2('matt', add(p, n), add(q, n), sub3(q, n), sub3(p, n), C.steel);
    }
    return k.done();
  }
  // a mudguard: a strip of sheet round an axle from angle f0 to f1 (0 = forward, 90 = up), both faces
  function schutzblech(k, part, col, ax, R, f0, f1, w = 0.108, deep = 0.022) {
    const rows = [];
    for (let i = 0; i <= 14; i++) {
      const f = ((f0 + ((f1 - f0) * i) / 14) * Math.PI) / 180,
        row = [];
      for (let j = 0; j <= 6; j++) {
        const u = j / 6 - 0.5,
          rr = R - deep * 4 * u * u;
        row.push([ax[0] + u * w, ax[1] + Math.cos(f) * rr, ax[2] + Math.sin(f) * rr]);
      }
      rows.push(row);
    }
    k.smooth(() => k.grid(rows, () => [part, col], { both: true }));
  }
  // a shock absorber or fork gaiter: a ribbed tube
  const ribs = (r, a, n) => t => r + a * Math.sin(t * n * Math.PI * 2);
  const seg = (p, q, n) => {
    const out = [];
    for (let i = 0; i <= n; i++)
      out.push([p[0] + ((q[0] - p[0]) * i) / n, p[1] + ((q[1] - p[1]) * i) / n, p[2] + ((q[2] - p[2]) * i) / n]);
    return out;
  };
  const along = (p, q, t) => [p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t, p[2] + (q[2] - p[2]) * t];
  // an indicator: an amber lens in a black cup on a stalk; dir: the way the lens faces (+1 forward, −1 back)
  function blinker(k, from, at, dir) {
    k.tube('matt', [from, at], 0.006, 5, C.black);
    k.lathe(
      'matt',
      at,
      [0, dir, 0],
      [
        [0.0005, -0.03],
        [0.022, -0.026],
        [0.031, -0.008],
        [0.032, 0.004],
      ],
      12,
      C.black
    );
    k.lathe(
      'blink',
      at,
      [0, dir, 0],
      [
        [0.031, 0.002],
        [0.024, 0.012],
        [0.0005, 0.016],
      ],
      12,
      C.amber
    );
  }
  // ======================= Simson S 51 =======================
  // the frame with everything that does not steer
  function s51Rahmen(k) {
    const axR = [0, B, RW];
    // ---- frame: the pressed backbone from the head down to the engine, the seat rails, the rear loop ----
    k.tube(
      'matt',
      [
        [0, PIV[1] + 0.035, PIV[2] - 0.075],
        [0, 0.12, 0.66],
        [0, -0.06, 0.5],
        [0, -0.14, 0.4],
      ],
      0.03,
      8,
      C.frame,
      { flat: [0.75, 1.25] }
    );
    k.tube(
      'matt',
      [
        [0, PIV[1] + 0.02, PIV[2] - 0.05],
        [0, -0.05, 0.71],
        [0, -0.2, 0.69],
      ],
      0.02,
      6,
      C.frame
    );
    for (const s of [-1, 1]) {
      k.tube(
        'matt',
        [
          [s * 0.03, -0.18, 0.69],
          [s * 0.1, -0.5, 0.685],
          [s * 0.1, -0.8, 0.72],
        ],
        0.012,
        6,
        C.frame
      );
      k.tube(
        'matt',
        [
          [s * 0.1, -0.5, 0.685],
          [s * 0.09, -0.19, 0.39],
        ],
        0.012,
        6,
        C.frame
      );
      // swing arm
      k.tube(
        'matt',
        [
          [s * 0.085, -0.15, 0.35],
          [s * 0.085, B, RW],
        ],
        0.015,
        6,
        C.frame,
        { flat: [0.8, 1.3] }
      );
      // shock: a chrome spring below, a black sleeve above
      const p = [s * 0.117, B + 0.025, RW + 0.02],
        q = [s * 0.117, -0.5, 0.675];
      k.tube('chrom', seg(p, along(p, q, 0.62), 22), ribs(0.02, 0.0045, 9), 8, C.chrome);
      k.tube('matt', [along(p, q, 0.6), q], 0.024, 8, C.black, { caps: 1 });
      // side cover under the seat, in the tank's colour
      k.pad('lack0', [s * 0.107, -0.185, 0.555], [0.034, 0.37, 0.225], 0.016, [1, 1, 1]);
      // foot rest
      k.tube(
        'matt',
        [
          [s * 0.14, -0.07, 0.3],
          [s * 0.26, -0.07, 0.3],
        ],
        0.017,
        8,
        C.rubber,
        { caps: 1 }
      );
      blinker(k, [s * 0.08, -0.8, 0.69], [s * 0.155, -0.83, 0.67], -1);
    }
    k.tube(
      'matt',
      [
        [-0.15, -0.07, 0.3],
        [0.15, -0.07, 0.3],
      ],
      0.011,
      6,
      C.frame
    );
    // the ignition lock in the left cover
    k.lathe(
      'chrom',
      [-0.125, -0.06, 0.6],
      [-1, 0, 0],
      [
        [0.016, -0.004],
        [0.016, 0.006],
        [0.0005, 0.008],
      ],
      10,
      C.chrome
    );
    // ---- tank: flat-topped, round-shouldered, the filler cap on top ----
    k.blob(
      'lack0',
      [
        { y: -0.175, w: 0.075, z0: 0.705, z1: 0.8, e: 2.4 },
        { y: -0.15, w: 0.108, z0: 0.672, z1: 0.83, e: 2.8 },
        { y: -0.06, w: 0.128, z0: 0.648, z1: 0.853, e: 3 },
        { y: 0.09, w: 0.136, z0: 0.64, z1: 0.864, e: 3 },
        { y: 0.2, w: 0.128, z0: 0.652, z1: 0.86, e: 3 },
        { y: 0.265, w: 0.1, z0: 0.685, z1: 0.842, e: 2.6 },
        { y: 0.292, w: 0.058, z0: 0.725, z1: 0.812, e: 2.2 },
      ],
      [1, 1, 1],
      20
    );
    k.lathe(
      'chrom',
      [0, 0.15, 0.862],
      [0, 0, 1],
      [
        [0.03, -0.004],
        [0.031, 0.008],
        [0.026, 0.016],
        [0.012, 0.019],
        [0.0005, 0.02],
      ],
      16,
      C.chrome
    );
    // the fuel tap under the tank on the left: its body, the bowl, the hose to the carburettor (the lever is a piece of its own)
    k.lathe(
      'matt',
      HAHN,
      [0, 0, -1],
      [
        [0.009, -0.014],
        [0.009, 0.012],
        [0.012, 0.016],
        [0.012, 0.034],
        [0.006, 0.04],
        [0.0005, 0.04],
      ],
      8,
      C.alu
    );
    k.tube(
      'matt',
      [
        [HAHN[0] + 0.01, HAHN[1] - 0.004, HAHN[2] - 0.03],
        [-0.06, 0.0, 0.56],
        [-0.02, 0.04, 0.5],
      ],
      0.005,
      5,
      C.rubber
    );
    // ---- the long seat with its strap ----
    k.blob(
      'matt',
      [
        { y: -0.815, w: 0.085, z0: 0.725, z1: 0.778, e: 2.6 },
        { y: -0.79, w: 0.122, z0: 0.705, z1: 0.796, e: 3.4 },
        { y: -0.5, w: 0.135, z0: 0.695, z1: 0.798, e: 3.6 },
        { y: -0.27, w: 0.127, z0: 0.695, z1: 0.792, e: 3.6 },
        { y: -0.185, w: 0.11, z0: 0.7, z1: 0.786, e: 3.2 },
        { y: -0.165, w: 0.08, z0: 0.715, z1: 0.775, e: 2.6 },
      ],
      C.seat,
      16
    );
    k.tube(
      'matt',
      [
        [-0.137, -0.47, 0.72],
        [-0.13, -0.47, 0.8],
        [0, -0.47, 0.806],
        [0.13, -0.47, 0.8],
        [0.137, -0.47, 0.72],
      ],
      0.009,
      5,
      C.rubber,
      { flat: [1.6, 0.5] }
    );
    // ---- engine: the case, the covers, the finned cylinder leaning forward, the plug, the carburettor ----
    k.pad('matt', [0, -0.005, 0.335], [0.2, 0.36, 0.19], 0.05, C.alu);
    k.lathe(
      'matt',
      [0.1, -0.06, 0.335],
      [1, 0, 0],
      [
        [0.088, -0.005],
        [0.086, 0.016],
        [0.06, 0.034],
        [0.0005, 0.038],
      ],
      16,
      C.alu
    );
    k.lathe(
      'matt',
      [-0.1, 0.05, 0.345],
      [-1, 0, 0],
      [
        [0.072, -0.005],
        [0.07, 0.018],
        [0.045, 0.034],
        [0.0005, 0.037],
      ],
      16,
      C.alu
    );
    const cy0 = [0, 0.14, 0.39],
      cd = nrm([0, 0.93, 0.37]),
      fins = [];
    for (let i = 0; i < 9; i++) {
      const t = 0.012 + i * 0.021,
        r = i >= 6 ? 0.07 : 0.064;
      fins.push([0.04, t], [r, t], [r, t + 0.007], [0.04, t + 0.007]);
    }
    k.flat(() => k.lathe('matt', cy0, cd, [[0.04, 0], ...fins, [0.04, 0.205], [0.0005, 0.205]], 14, C.aluDark));
    const head = add(cy0, mul(cd, 0.2));
    k.tube('matt', [head, add(head, [0, 0.02, 0.05])], 0.008, 6, C.white, { caps: 'b' });
    k.pad('matt', [0, 0.05, 0.475], [0.07, 0.1, 0.07], 0.02, C.aluDark);
    k.tube(
      'matt',
      [
        [0, 0.0, 0.48],
        [0, -0.09, 0.53],
      ],
      0.022,
      8,
      C.rubber
    );
    // ---- exhaust: the header out of the cylinder, down and back along the right side into the long silencer ----
    const ex = [
        [0.02, 0.27, 0.415],
        [0.05, 0.32, 0.37],
        [0.095, 0.3, 0.29],
        [0.125, 0.2, 0.245],
        [0.14, 0.05, 0.235],
        [0.145, -0.08, 0.238],
        [0.148, -0.16, 0.245],
        [0.15, -0.5, 0.275],
        [0.152, -0.68, 0.292],
        [0.153, -0.74, 0.297],
      ],
      exR = t =>
        t < 0.42
          ? 0.0155
          : t < 0.5
            ? 0.0155 + ((t - 0.42) / 0.08) * 0.0225
            : t < 0.93
              ? 0.038
              : 0.038 - ((t - 0.93) / 0.07) * 0.02;
    k.tube('chrom', ex, exR, 10, C.chrome, { caps: 'b' });
    // ---- left: the kick starter, the gear lever, the chain in its rubber gaiters, the chain case at the hub ----
    k.tube(
      'matt',
      [
        [-0.118, -0.1, 0.345],
        [-0.14, -0.22, 0.4],
        [-0.15, -0.31, 0.43],
        [-0.2, -0.31, 0.43],
      ],
      0.008,
      6,
      C.steel
    );
    k.tube(
      'matt',
      [
        [-0.118, 0.03, 0.315],
        [-0.15, 0.16, 0.305],
        [-0.19, 0.16, 0.305],
      ],
      0.007,
      6,
      C.steel
    );
    for (const dz of [-0.036, 0.036])
      k.tube(
        'matt',
        seg([-0.088, -0.13, 0.335 + dz * 0.7], [-0.088, B + 0.07, RW + dz], 14),
        ribs(0.0135, 0.002, 10),
        8,
        C.rubber
      );
    k.lathe(
      'matt',
      [-0.07, B, RW],
      [-1, 0, 0],
      [
        [0.086, -0.012],
        [0.086, 0.02],
        [0.06, 0.03],
        [0.0005, 0.032],
      ],
      16,
      C.black
    );
    // right: the brake pedal
    k.tube(
      'matt',
      [
        [0.118, -0.04, 0.3],
        [0.16, 0.12, 0.285],
        [0.2, 0.12, 0.285],
      ],
      0.007,
      6,
      C.steel
    );
    // ---- rear: mudguard, carrier, lamp, plate ----
    const RM = RW + 0.062;
    schutzblech(k, 'matt', C.alu, axR, RM, 62, 172);
    const car = [
      [-0.085, -0.8, 0.748],
      [-0.085, -0.965, 0.748],
      [0.085, -0.965, 0.748],
      [0.085, -0.8, 0.748],
    ];
    k.tube(
      'chrom',
      K.fillet(
        car.map(p => [p[0], p[1]]),
        0.03,
        4
      ).map(p => [p[0], p[1], 0.748]),
      0.006,
      6,
      C.chrome
    );
    for (const y of [-0.86, -0.915])
      k.tube(
        'chrom',
        [
          [-0.085, y, 0.748],
          [0.085, y, 0.748],
        ],
        0.005,
        5,
        C.chrome
      );
    for (const s of [-1, 1])
      k.tube(
        'chrom',
        [
          [s * 0.085, -0.94, 0.748],
          [s * 0.117, -0.52, 0.675],
        ],
        0.005,
        5,
        C.chrome
      );
    const fl = (140 * Math.PI) / 180,
      lp = [0, B + Math.cos(fl) * (RM + 0.03), RW + Math.sin(fl) * (RM + 0.03)];
    k.pad('matt', lp, [0.085, 0.06, 0.07], 0.015, C.black);
    k.box('tail', [0, lp[1] - 0.034, lp[2]], [0.07, 0.014, 0.055], C.red);
    const fp = (166 * Math.PI) / 180,
      pp = [0, B + Math.cos(fp) * (RM + 0.012), RW + Math.sin(fp) * (RM + 0.012)];
    k.box('matt', [0, pp[1] - 0.004, pp[2]], [0.135, 0.004, 0.105], C.plate);
    k.box('matt', [0, pp[1], pp[2]], [0.145, 0.004, 0.115], C.black);
  }
  // what turns with the handlebar (relative to the pivot): fork with gaiters, mudguard, lamp, handlebar with grips, levers and
  // mirror, the speedometer's housing and face, the front indicators
  function s51Lenkung(k) {
    const P = PIV,
      rel = p => sub3(p, P),
      axF = rel([0, A, RW]);
    for (const s of [-1, 1]) {
      const a = [s * 0.086, axF[1], axF[2]],
        b = [s * 0.086, 0, 0.012];
      k.tube('matt', [a, along(a, b, 0.44)], 0.02, 8, C.alu, { caps: 'a' });
      k.tube('matt', seg(along(a, b, 0.43), along(a, b, 0.73), 20), ribs(0.0255, 0.0035, 10), 8, C.rubber);
      k.tube('chrom', [along(a, b, 0.72), b], 0.0155, 8, C.chrome, { caps: 'b' });
      // the lamp's ears
      const e = along(a, b, 0.93);
      k.quad2(
        'matt',
        [s * 0.088, e[1], e[2] - 0.03],
        [s * 0.078, e[1] + 0.12, e[2] - 0.045],
        [s * 0.078, e[1] + 0.12, e[2] - 0.005],
        [s * 0.088, e[1], e[2] + 0.03],
        C.black
      );
      blinker(k, [s * 0.086, e[1] + 0.05, e[2] - 0.02], [s * 0.165, e[1] + 0.085, e[2] - 0.03], 1);
    }
    // the yokes
    const lowY = along([0, axF[1], axF[2]], [0, 0, 0.012], 0.74);
    k.pad('matt', lowY, [0.215, 0.05, 0.03], 0.012, C.black);
    k.pad('matt', [0, 0, 0.012], [0.215, 0.055, 0.028], 0.012, C.aluDark);
    k.tube(
      'matt',
      [
        [0, 0.008, -0.14],
        [0, -0.004, 0.03],
      ],
      0.022,
      8,
      C.black
    );
    // front mudguard and its stays
    const RM = RW + 0.03;
    schutzblech(k, 'matt', C.alu, axF, RM, 18, 152, 0.1, 0.02);
    for (const s of [-1, 1])
      for (const f of [38, 128]) {
        const a = (f * Math.PI) / 180;
        k.tube(
          'matt',
          [
            [s * 0.07, axF[1], axF[2]],
            [s * 0.05, axF[1] + Math.cos(a) * RM, axF[2] + Math.sin(a) * RM],
          ],
          0.004,
          4,
          C.steel
        );
      }
    // the lamp: a black bowl, a chrome ring, the lens
    const L = [0, 0.135, -0.055];
    k.lathe(
      'matt',
      L,
      [0, 1, 0],
      [
        [0.0005, -0.115],
        [0.035, -0.108],
        [0.06, -0.075],
        [0.073, -0.03],
        [0.075, 0.0],
      ],
      18,
      C.black
    );
    k.lathe(
      'chrom',
      L,
      [0, 1, 0],
      [
        [0.075, -0.004],
        [0.08, 0.004],
        [0.077, 0.013],
        [0.069, 0.013],
      ],
      18,
      C.chrome
    );
    k.lathe(
      'head',
      L,
      [0, 1, 0],
      [
        [0.069, 0.011],
        [0.052, 0.019],
        [0.026, 0.024],
        [0.0005, 0.025],
      ],
      18,
      C.lens
    );
    // ---- handlebar: clamped on the head, rising and coming back to the grips ----
    const hb = [
      [-0.31, -0.085, 0.118],
      [-0.2, -0.07, 0.118],
      [-0.15, -0.045, 0.105],
      [-0.1, -0.012, 0.06],
      [-0.06, 0.0, 0.035],
      [0.06, 0.0, 0.035],
      [0.1, -0.012, 0.06],
      [0.15, -0.045, 0.105],
      [0.2, -0.07, 0.118],
      [0.31, -0.085, 0.118],
    ];
    k.tube('chrom', hb, 0.011, 8, C.chrome);
    for (const s of [-1, 1]) {
      // the clamp, the grip, the lever with its perch
      k.pad('matt', [s * 0.04, 0.0, 0.03], [0.03, 0.04, 0.035], 0.008, C.aluDark);
      k.tube(
        'matt',
        [
          [s * 0.196, -0.07, 0.118],
          [s * 0.205, -0.071, 0.118],
          [s * 0.3, -0.084, 0.118],
          [s * 0.318, -0.086, 0.118],
        ],
        t => (t < 0.06 || t > 0.9 ? 0.02 : 0.0168),
        10,
        C.rubber,
        { caps: 1 }
      );
      k.pad('matt', [s * 0.178, -0.06, 0.118], [0.03, 0.035, 0.03], 0.008, C.aluDark);
      k.tube(
        'matt',
        [
          [s * 0.178, -0.04, 0.116],
          [s * 0.21, -0.018, 0.114],
          [s * 0.27, -0.022, 0.112],
          [s * 0.325, -0.04, 0.11],
        ],
        t => (t > 0.93 ? 0.008 : 0.0052),
        6,
        C.alu,
        { caps: 'b' }
      );
    }
    // the switch on the left, the twist grip's drum on the right
    k.pad('matt', [-0.15, -0.045, 0.118], [0.04, 0.045, 0.04], 0.01, C.black);
    k.tube(
      'matt',
      [
        [0.19, -0.069, 0.118],
        [0.203, -0.071, 0.118],
      ],
      0.021,
      10,
      C.black,
      { caps: 1 }
    );
    // the mirror on the left: a stalk, a round head facing the rider
    const m0 = [-0.165, -0.05, 0.125],
      m1 = [-0.2, -0.05, 0.2],
      m2 = [-0.27, -0.06, 0.27];
    k.tube('chrom', [m0, m1, m2], 0.005, 6, C.chrome);
    const md = nrm([0.12, -1, 0.1]);
    k.lathe(
      'matt',
      m2,
      md,
      [
        [0.0005, -0.016],
        [0.04, -0.012],
        [0.053, -0.002],
        [0.054, 0.003],
      ],
      16,
      C.black
    );
    k.lathe(
      'chrom',
      m2,
      md,
      [
        [0.052, 0.003],
        [0.0005, 0.004],
      ],
      16,
      C.chrome
    );
    // ---- the speedometer: a black cup, a chrome bezel; its face is its own part with texture coordinates ----
    const dc = rel(DIAL.c),
      d = DIAL.d;
    k.lathe(
      'matt',
      dc,
      d,
      [
        [0.0005, -0.056],
        [0.03, -0.052],
        [0.043, -0.022],
        [0.045, 0.0],
      ],
      18,
      C.black
    );
    k.lathe(
      'chrom',
      dc,
      d,
      [
        [0.045, -0.003],
        [0.0465, 0.004],
        [0.044, 0.007],
        [0.0405, 0.005],
      ],
      18,
      C.chrome
    );
    k.scheibe('tacho', add(dc, mul(d, 0.0035)), DIAL.r, DIAL.up, DIAL.R, C.white);
    // its bracket over the lamp's bowl
    k.box('matt', [0, 0.06, 0.012], [0.05, 0.07, 0.012], C.black);
    // the ignition and light switch in the lamp's bowl, the key in it with its tag
    const zs = [0.062, 0.085, 0.006];
    k.lathe(
      'chrom',
      zs,
      [0, 0, 1],
      [
        [0.014, -0.004],
        [0.014, 0.008],
        [0.005, 0.01],
        [0.0005, 0.01],
      ],
      12,
      C.chrome
    );
    k.box('chrom', [zs[0], zs[1], zs[2] + 0.02], [0.003, 0.014, 0.022], C.chrome);
    k.box('matt', [zs[0] + 0.012, zs[1] - 0.01, zs[2] + 0.02], [0.004, 0.026, 0.016], C.red);
    // two control lamps on the bowl: indicator (green) and high beam (blue) – their own parts, lit by grenzland/gl_cockpit.js
    [
      ['k_gruen', [-0.058, 0.075, 0.006], rgb(40, 150, 60)],
      ['k_blau', [-0.058, 0.103, 0.0], rgb(40, 80, 190)],
    ].forEach(([part, at, c]) => {
      k.lathe(
        'chrom',
        at,
        [0, -0.25, 0.97],
        [
          [0.0085, -0.002],
          [0.0085, 0.004],
          [0.007, 0.005],
        ],
        10,
        C.chrome
      );
      k.lathe(
        part,
        at,
        [0, -0.25, 0.97],
        [
          [0.007, 0.004],
          [0.005, 0.008],
          [0.0005, 0.0095],
        ],
        10,
        c
      );
    });
  }
  // the rider's hands on the grips as one sees them from the saddle: black gloves, the jacket's sleeves coming from the elbows
  // (relative to the pivot – they turn with the handlebar)
  function s51Haende(k) {
    const sleeve = rgb(46, 52, 62),
      glove = rgb(20, 20, 22);
    for (const s of [-1, 1]) {
      const w = [s * 0.268, -0.118, 0.128], // the wrist
        e = [s * 0.4, -0.46, 0.03]; // the elbow
      k.tube('matt', [e, [s * 0.335, -0.29, 0.085], w], t => 0.043 - 0.009 * t, 10, sleeve, { caps: 'a' });
      k.tube(
        'matt',
        [
          [w[0], w[1] - 0.012, w[2]],
          [w[0], w[1] + 0.012, w[2]],
        ],
        0.043,
        10,
        glove
      );
      // the hand over the grip: the back of the hand, the fingers round the grip, the thumb under it
      k.pad('matt', [s * 0.262, -0.092, 0.132], [0.095, 0.075, 0.045], 0.02, glove);
      k.pad('matt', [s * 0.258, -0.062, 0.113], [0.1, 0.05, 0.05], 0.022, glove);
      k.tube(
        'matt',
        [
          [s * 0.215, -0.1, 0.118],
          [s * 0.2, -0.075, 0.105],
          [s * 0.205, -0.055, 0.1],
        ],
        0.014,
        6,
        glove,
        { caps: 'b' }
      );
    }
  }
  // the fuel tap's lever in its own frame (x: the tap's axis, pointing left out of the tap; the lever hangs down along −z)
  function hahnHebel() {
    const k = K.kit();
    k.tube(
      'matt',
      [
        [0.004, 0, 0],
        [0.004, 0, -0.03],
      ],
      0.0045,
      6,
      C.black,
      { caps: 'b', flat: [0.6, 1.4] }
    );
    return k.done();
  }
  // the needle in the dial's own frame: x right, y up on the face, z towards the rider; it points along +x
  function nadel() {
    const k = K.kit();
    k.quad('matt', [-0.007, -0.0016, 0], [0.027, -0.0008, 0], [0.027, 0.0008, 0], [-0.007, 0.0016, 0], C.needle);
    k.lathe(
      'matt',
      [0, 0, 0],
      [0, 0, 1],
      [
        [0.005, -0.001],
        [0.005, 0.002],
        [0.0005, 0.003],
      ],
      10,
      C.black
    );
    // the kit's frame is the vehicle's (x, y, z); here used as the dial's (x right, y up, z out): done() swaps to three's (x, z, −y),
    // grenzland/gl_modelle.js turns it back
    return k.done();
  }
  const DEF = { s51: '#3d6b4a', schwalbe: '#3f6f9e' };
  const cache = new Map();
  function bau(typ, o = {}) {
    const T = TYP[typ];
    if (!T) return null;
    const key = typ + '|' + (o.col || '') + (o.fahrer ? '|f' : '');
    if (cache.has(key)) return cache.get(key);
    const paint = [hex(o.col || DEF[typ]), hex(o.col || DEF[typ]), hex('#888888'), hex('#888888')],
      pieces = [];
    if (typ === 's51') {
      let k = K.kit();
      s51Rahmen(k);
      pieces.push({ name: 'rahmen', parts: k.done(), at: [0, 0, 0], paint });
      k = K.kit();
      s51Lenkung(k);
      pieces.push({ name: 'lenkung', parts: k.done(), at: T.pivot, paint });
      pieces.push({ name: 'rad', parts: rad(), at: [0, T.a, T.rw], paint });
      pieces.push({ name: 'rad', parts: pieces[2].parts, at: [0, T.b, T.rw], paint });
      pieces.push({ name: 'nadel', parts: nadel(), at: T.dial.c, paint, dial: true });
      if (o.fahrer) {
        k = K.kit();
        s51Haende(k);
        pieces.push({ name: 'haende', parts: k.done(), at: T.pivot, paint, dial: true });
        pieces.push({ name: 'hahn', parts: hahnHebel(), at: T.hahn, paint, dial: true });
      }
    } else return null;
    const M = { typ, T, pieces };
    cache.set(key, M);
    return M;
  }
  // the needle's angle on the dial (radians, counter-clockwise from the dial's right as the rider sees it) for a speed in km/h:
  // 0 at the lower left, the scale's end (100 km/h on the S 51, 120 in the Trabant) at the lower right, over the top
  const nadelWinkel = (kmh, max = 100) => ((225 - 270 * Math.max(0, Math.min(1.04, kmh / max))) * Math.PI) / 180;
  const has = typ => typ === 's51';
  return { TYP, DEF, C, bau, has, nadelWinkel, rad };
})();
