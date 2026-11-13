// ===================== feat/cockpit: Falko's estate – the body, outside and inside in one piece (KOMBI) =====================
// Falko 13.11.2026 18:00 („Sofort selbst bauen“): the body of the player's estate comes from here too, so that the inside (vehicles/cockpit*.js)
// and the outside fit. A generic estate in the size and class of a 2012 Logan MCV – 4.47 × 1.74 × 1.64 m with the roof rails, wheelbase
// 2.905 m – in its own design: no maker's mark or badge, no copy of a brand's grille or lamps. Lofted from cross-sections with the Grenzland
// chat's body kit (grenzland/gl_karosse.js, read only): rounded panels with a soft shoulder line, wheel arches with their wells, door seams,
// three side windows, a long roof with rails, split rear doors (the wider one on the left, the hinge seams visible), vertical rear lamps,
// headlamps with lenses, indicators front, side and rear (lit by the cockpit's blink state through model.lamps.blinkL / blinkR),
// bumpers in the body colour with a black lower part, a dark underside, tinted glass that mirrors the sky, number plates with a made-up
// HBN number. The inner shell shows the trims (the A pillars dark) and the headliner from inside; the cockpit hangs the real
// headliner, the visors and the roof's side rails under it (spec.cockpit, vehicles/cockpit_build.js). Two levels of detail (the far
// one without the inside and the small parts). It replaces the body of vehicles/car.js when this module loads (before the first frame,
// so its materials are compiled with the rest); physics, collision box, wheels' places and the load space stay as car.js has them.
//   KOMBI.D (the body's sections) · KOMBI.info() · KOMBI.lod
import * as THREE from 'three';
import { QS, V } from '../core/head.js';
import { GLKAROSSE as K } from '../grenzland/gl_karosse.js';
import { VEH } from './vehicle.js';
export const KOMBI = (() => {
  const { rgb } = K;
  // the measures of vehicles/car.js (model frame: x right, y forward, z up; origin on the ground under the centre of mass)
  const A = 1.25,
    B = -1.655,
    TR = 1.468,
    RW = 0.31,
    HW = 0.87,
    YF = 2.047,
    YR = -2.426;
  // round 2 (Falko 13.11. evening: „moderner, runder“): a short bonnet, the windscreen about 60° from upright, the belt rising to the rear,
  // a roof that drops a little at the back, a slightly raked D pillar over a near-vertical tailgate
  const y3 = 1.02, // the windscreen's foot
    y2 = 0.13, // the roof's front edge (the windscreen 60° from upright: 0.89 m back over 0.52 m up)
    y1 = YR + 0.21, // the roof's rear edge
    y0 = YR + 0.07, // the rear window's foot
    yB = -0.4, // B pillar (front door's end)
    yC = -1.37, // C pillar (rear door's end)
    split = 0.12; // the rear doors' split (x): the left one wider
  const C = {
    black: rgb(16, 16, 17),
    rubber: rgb(22, 22, 23),
    dark: rgb(40, 41, 43),
    grey: rgb(70, 72, 75),
    steel: rgb(132, 135, 138),
    silver: rgb(176, 179, 182),
    trim: rgb(38, 39, 42), // the inner shell: door frames and pillars from inside, dark plastic
    liner: rgb(188, 184, 176),
    carpet: rgb(30, 31, 33),
    cloth: rgb(60, 63, 68),
    plastic: rgb(46, 47, 50), // the sills, the arch lips and the lower bumpers: dark grained plastic
  };
  // ---- the body's sections (K.body) ----
  const Yf = YF - 0.005,
    Yr = YR + 0.005;
  // keys of a smooth curve: f(t) at n + 1 stations from ya (t 0) to yb (t 1)
  const keys = (ya, yb, n, f) => Array.from({ length: n + 1 }, (_, i) => [ya + ((yb - ya) * i) / n, f(i / n)]);
  // the corners in plan: an elliptic quarter (a: how far the end face lies inside the side, over the length L)
  const corner = (a, t) => a * (1 - Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t))));
  const D = {
    y0: Yr,
    y1: Yf,
    hw: [
      ...keys(Yr, Yr + 0.3, 6, t => HW - corner(0.13, t)),
      [B, HW],
      [A, HW],
      ...keys(Yf - 0.5, Yf, 8, t => HW - corner(0.27, 1 - t)),
    ],
    zb: [
      [Yr, 0.36],
      [Yr + 0.08, 0.32],
      [Yr + 0.25, 0.29],
      [B - 0.4, 0.24],
      [B + 0.4, 0.215],
      [A - 0.4, 0.215],
      [A + 0.4, 0.24],
      [1.85, 0.28],
      [1.97, 0.31],
      [Yf, 0.34],
    ],
    // the belt: rising a little towards the rear (the side glass about 0.42 m high), falling over the wings to the nose
    sh: [
      [Yr, 1.0],
      [Yr + 0.04, 1.05],
      [Yr + 0.12, 1.075],
      [B, 1.07],
      [yC, 1.055],
      [yB, 1.03],
      [y3, 0.995],
      ...keys(1.4, Yf, 8, t => 0.93 - 0.28 * Math.pow(t, 1.6)),
    ],
    // the short bonnet sloping down into the nose; the tailgate's top under the rear window
    deck: [
      [Yr, 1.02],
      [Yr + 0.03, 1.065],
      [y0, 1.085],
      [y3, 1.0],
      ...keys(1.4, Yf, 8, t => 0.955 - 0.285 * Math.pow(t, 1.6)),
    ],
    dp: 2.2,
    rs: [
      [Yr, 0.07],
      [Yr + 0.2, 0.085],
      [y3, 0.085],
      [1.8, 0.1],
      [Yf, 0.12],
    ],
    rl: 0.085,
    tuck: 0.05,
    sl: 0.045, // the sides lean in about 7° above the waist
    zw: [
      [Yr, 0.52],
      [Yr + 0.2, 0.57],
      [A + 0.4, 0.57],
      [Yf, 0.47],
    ],
    // the trim line between waist and shoulder (GLK keeps it between them)
    ztrim: [
      [Yr, 0.86],
      [Yr + 0.12, 0.93],
      [B, 0.93],
      [yB, 0.9],
      [y3, 0.86],
      [1.4, 0.8],
      [1.8, 0.7],
      [Yf, 0.58],
    ],
    gin: 0.1,
    pw: 0.058, // slim pillars (the A pillar about 7 cm from the driver's seat)
    cab: {
      y0,
      y1,
      y2,
      y3,
      roof: [
        [y1, 1.5],
        [-1.9, 1.528],
        [-1.4, 1.548],
        [-0.8, 1.56],
        [-0.3, 1.565],
        [y2, 1.525],
      ],
      crown: 0.04,
      wr: [
        [y1, 0.62],
        [-1.8, 0.655],
        [-0.6, 0.67],
        [y2, 0.645],
      ],
      rr: 0.07,
      bowF: [0.12, 0.06],
      bowR: [0.04, 0.02],
      sideGlass: [
        [y1 + 0.13, yC - 0.05],
        [yC + 0.045, yB - 0.045],
        [yB + 0.045, y3 - 0.02],
      ],
    },
    // the wheels fill their arches (5 cm over the tyre)
    arches: [
      { y: A, r: RW + 0.04, zc: RW + 0.015 },
      { y: B, r: RW + 0.04, zc: RW + 0.015 },
    ],
    seams: [A - RW - 0.07, yB, yC],
    zone: {
      sims: ['matt', C.black],
      schweller: ['matt', C.plastic],
    },
    // B and C pillars black between the windows; the A and D pillars in the body's colour
    farbe: (zn, y) => (zn === 'saeule' && y < y2 - 0.05 && y > y1 + 0.2 ? ['matt', C.black] : undefined),
    inner: { trim: C.trim, liner: C.liner },
  };
  // ---- the add-ons of the near detail level ----
  // a lens (or its backing) as a pad between two points on a surface in plan, facing out
  function strip(k, part, a, b, z, h, d, col, r = 0.015) {
    const L = Math.hypot(b[0] - a[0], b[1] - a[1]);
    k.at({ p: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2, z], rz: Math.atan2(b[1] - a[1], b[0] - a[0]) }, () =>
      k.pad(part, [0, 0, 0], [L + 0.01, d, h], r, col)
    );
  }
  function details(k, Bd) {
    // the front's surface in plan at a height: points (x, y) along the nose, set out by d (dir +1 front, −1 rear)
    const along = (xs, z, dir, d = 0) =>
      xs.map(x => {
        const y0 = Bd.end(x, z, dir),
          y1 = Bd.end(x + 0.01, z, dir),
          n = [-(y1 - y0), 0.01],
          l = Math.hypot(n[0], n[1]);
        return [x + (dir * n[0] * d) / l, y0 + (dir * n[1] * d) / l];
      });
    // front: the headlamps, large and swept back round the corners into the wings (the indicator at the outer end), the grille between
    // them (a trapezoid of horizontal bars, no badge), the plate, the lower intake, fog lamps in the bumper's corners
    for (const s of [-1, 1]) {
      const xs = [0.4, 0.52, 0.63, 0.72, 0.79].map(x => s * x),
        P = along(xs, 0.63, 1, -0.006),
        Q = along(xs, 0.63, 1, -0.012);
      for (let i = 0; i < 4; i++) {
        const a = s < 0 ? P[i + 1] : P[i],
          b = s < 0 ? P[i] : P[i + 1],
          qa = s < 0 ? Q[i + 1] : Q[i],
          qb = s < 0 ? Q[i] : Q[i + 1];
        strip(k, 'matt', qa, qb, 0.63, 0.14 - i * 0.012, 0.03, C.black, 0.025);
        strip(
          k,
          i === 3 ? (s < 0 ? 'blinkL' : 'blinkR') : 'head',
          a,
          b,
          0.635,
          0.115 - i * 0.012,
          0.03,
          C.silver,
          0.02
        );
      }
      // the fog lamp in the bumper's corner
      const F = along([s * 0.56, s * 0.66], 0.42, 1, -0.008),
        Fb = along([s * 0.55, s * 0.67], 0.42, 1, -0.016);
      strip(k, 'matt', s < 0 ? Fb[1] : Fb[0], s < 0 ? Fb[0] : Fb[1], 0.42, 0.075, 0.03, C.black, 0.02);
      strip(k, 'head', s < 0 ? F[1] : F[0], s < 0 ? F[0] : F[1], 0.42, 0.045, 0.03, C.silver, 0.015);
    }
    const yg = Bd.end(0, 0.62, 1);
    for (let i = 0; i < 4; i++) {
      const w = 0.74 - i * 0.05,
        z = 0.665 - i * 0.03;
      k.pad('matt', [0, yg - 0.012, z], [w, 0.03, 0.034], 0.012, C.black);
      k.pad('matt', [0, yg - 0.004, z + 0.004], [w - 0.03, 0.02, 0.011], 0.004, C.grey);
    }
    // the lower intake across the bumper (dark, as its lower part round the corners)
    k.pad('matt', [0, Bd.end(0, 0.4, 1) - 0.014, 0.4], [1.16, 0.035, 0.12], 0.03, C.plastic);
    // sides: door handles (body colour with a black insert), mirror housings on black bases, the indicator repeaters on the wings,
    // a character line along the doors, the arch lips (dark plastic)
    for (const s of [-1, 1]) {
      for (const y of [yB + 0.2, yC + 0.18]) {
        k.pad('lack0', Bd.side(s, y, 0.9, 0.006), [0.03, 0.17, 0.04], 0.012, [1, 1, 1]);
        k.pad('matt', Bd.side(s, y - 0.02, 0.9, 0.012), [0.012, 0.11, 0.012], 0.004, C.black);
      }
      const mp = Bd.side(s, y3 - 0.22, 1.035, 0.02);
      k.pad('matt', [mp[0] - s * 0.03, mp[1], mp[2]], [0.09, 0.09, 0.05], 0.02, C.black);
      k.pad('lack0', [mp[0] + s * 0.095, mp[1], mp[2] + 0.035], [0.19, 0.11, 0.14], 0.045, [1, 1, 1]);
      k.pad(s < 0 ? 'blinkL' : 'blinkR', Bd.side(s, A + 0.42, 0.8, 0.004), [0.012, 0.06, 0.025], 0.008, C.silver);
      const line = [];
      for (let y = A - 0.3; y >= B + 0.32; y -= 0.25)
        line.push(Bd.side(s, y, 0.84 + ((A - y) / (A - B)) * 0.07, -0.002));
      k.tube('lack0', line, 0.007, 8, [1, 1, 1], { caps: 1 });
      for (const ya of [A, B]) {
        const lip = [];
        for (let i = 0; i <= 14; i++) {
          const a = (-8 + (i / 14) * 196) * (Math.PI / 180),
            y = ya + Math.cos(a) * (RW + 0.052),
            z = RW + 0.015 + Math.sin(a) * (RW + 0.052);
          lip.push(Bd.side(s, y, Math.max(z, 0.22), 0.006));
        }
        k.tube('matt', lip, 0.02, 8, C.plastic, { caps: 1 });
      }
      // the roof rail on three feet
      const rail = [];
      for (let i = 0; i < Bd.Y.length; i++) {
        const y = Bd.Y[i];
        if (y < y1 + 0.1 || y > y2 - 0.2) continue;
        const p = Bd.R[i][19];
        rail.push([s * p[0], p[1], p[2] + 0.05]);
      }
      if (rail.length > 1) {
        k.tube('matt', rail, 0.014, 8, C.dark, { caps: 1 });
        for (const f of [0, 0.5, 1]) {
          const p = rail[Math.round(f * (rail.length - 1))];
          k.pad('matt', [p[0], p[1], p[2] - 0.028], [0.04, 0.12, 0.05], 0.012, C.dark);
        }
      }
    }
    // rear: L-shaped lamps at the D pillars (the tail across the top and round into the side, brake, indicator and reversing light
    // down the edge), the hinges and seams of the split doors, the handle, the third brake light, the plate's recess, the dark lower
    // part, the exhaust
    for (const s of [-1, 1]) {
      const x = 0.665,
        y = z => Bd.end(s * x, z, -1) + 0.012;
      k.pad('matt', [s * x, y(0.91) + 0.008, 0.91], [0.12, 0.04, 0.22], 0.03, C.black);
      k.pad('matt', [s * x, y(1.13) + 0.008, 1.13], [0.12, 0.04, 0.22], 0.03, C.black);
      k.pad('tail', [s * (x - 0.035), y(1.2), 1.2], [0.17, 0.04, 0.045], 0.018, C.silver);
      k.pad('tail', [s * x, y(1.125), 1.125], [0.1, 0.04, 0.09], 0.02, C.silver);
      k.pad('brems', [s * x, y(1.02), 1.02], [0.1, 0.04, 0.11], 0.02, C.silver);
      k.pad(s < 0 ? 'blinkL' : 'blinkR', [s * x, y(0.92), 0.92], [0.1, 0.04, 0.08], 0.02, C.silver);
      k.pad('rev', [s * x, y(0.845), 0.845], [0.1, 0.04, 0.06], 0.02, C.silver);
      // round the corner into the side
      k.pad('tail', Bd.side(s, Yr + 0.09, 1.18, 0.002), [0.03, 0.13, 0.05], 0.015, C.silver);
      // the hinges and the doors' outer seams beside the lamps
      for (const z of [0.6, 0.95])
        k.pad('matt', [s * 0.585, Bd.end(s * 0.585, z, -1) - 0.004, z], [0.04, 0.03, 0.07], 0.01, C.black);
      k.pad('matt', [s * 0.6, Bd.end(s * 0.6, 0.76, -1) - 0.002, 0.76], [0.006, 0.01, 0.52], 0.002, C.black);
    }
    const ys = Bd.end(split, 0.76, -1);
    k.pad('matt', [split, ys - 0.002, 0.76], [0.008, 0.012, 0.52], 0.003, C.black);
    k.pad('matt', [split - 0.05, ys - 0.012, 0.93], [0.06, 0.03, 0.035], 0.012, C.dark);
    // the third brake light under a slim lip at the roof's rear edge
    k.pad('lack0', [0, y1 - 0.012, 1.497], [1.1, 0.07, 0.02], 0.009, [1, 1, 1]);
    k.pad('brems', [0, y1 - 0.03, 1.478], [0.3, 0.025, 0.02], 0.008, C.silver);
    k.pad('matt', [-0.25, Bd.end(-0.25, 0.7, -1) - 0.004, 0.7], [0.56, 0.016, 0.14], 0.01, C.black);
    k.pad('matt', [0, Bd.end(0, 0.41, -1) + 0.014, 0.41], [1.3, 0.035, 0.1], 0.03, C.plastic);
    k.tube(
      'matt',
      [
        [-0.45, Yr + 0.24, 0.27],
        [-0.45, Yr + 0.02, 0.27],
      ],
      0.03,
      10,
      C.grey,
      { caps: 1 }
    );
    // the cabin's floor, the firewall, the rear bench and the boot's floor (what one sees through the glass and in the mirror)
    k.box('matt', [0, -0.25, 0.3], [1.6, 2.34, 0.03], C.carpet, 'b');
    k.box('matt', [0, y3 + 0.04, 0.6], [1.6, 0.03, 0.62], C.black);
    k.pad('matt', [0, -1.0, 0.52], [1.36, 0.5, 0.13], 0.05, C.cloth);
    k.pad('matt', [0, -1.26, 0.86], [1.36, 0.12, 0.58], 0.05, C.cloth);
    k.box('matt', [0, -1.88, 0.62], [1.5, 0.92, 0.025], C.carpet);
  }
  // ---- the number plates (a made-up number, as car.js had it) ----
  function plateMat() {
    const c = document.createElement('canvas');
    c.width = 520;
    c.height = 112;
    const x = c.getContext('2d');
    x.fillStyle = '#f4f4f0';
    x.fillRect(0, 0, 520, 112);
    x.strokeStyle = '#111';
    x.lineWidth = 5;
    x.strokeRect(3, 3, 514, 106);
    x.fillStyle = '#1d3f9a';
    x.fillRect(6, 6, 46, 100);
    x.fillStyle = '#f2d21e';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      x.beginPath();
      x.arc(29 + Math.cos(a) * 13, 34 + Math.sin(a) * 13, 2.2, 0, 7);
      x.fill();
    }
    x.fillStyle = '#fff';
    x.font = 'bold 26px sans-serif';
    x.textAlign = 'center';
    x.fillText('D', 29, 92);
    x.fillStyle = '#111';
    x.font = 'bold 74px "DIN Alternate", "Arial Narrow", Arial, sans-serif';
    x.textAlign = 'left';
    x.fillText('HBN PR 216', 64, 84);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return new THREE.MeshStandardMaterial({ map: t, roughness: 0.4, metalness: 0.2 });
  }
  // ---- materials: the paint and the glass as the old body's (same programs), the rest by vertex colours ----
  function lens(m, col, em) {
    const q = m ? m.clone() : new THREE.MeshStandardMaterial({ roughness: 0.25, emissive: em });
    q.color.set(col);
    q.metalness = 0.15;
    return q;
  }
  function materials(old) {
    const M = {
      lack0: new THREE.MeshPhysicalMaterial({
        color: new THREE.Color('#AA9C82'),
        metalness: 0.55,
        roughness: 0.34,
        clearcoat: 1,
        clearcoatRoughness: 0.07,
        envMapIntensity: 1.0,
      }),
      glas: new THREE.MeshPhysicalMaterial({
        color: 0x161c1f,
        metalness: 0,
        roughness: 0.04,
        transparent: true,
        opacity: 0.58,
        envMapIntensity: 1.4,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      matt: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72 }),
      chrom: new THREE.MeshStandardMaterial({ color: 0xc9ccce, metalness: 1, roughness: 0.16 }),
      // the lamps: the old body's materials where it had them (vehicles/vehicle.js lights them), else like them; the red lenses a
      // brighter red than the old body's, so that they read as red glass by day too (a copy of the same kind: the same program)
      head: old.head || new THREE.MeshStandardMaterial({ color: 0xd9dee2, roughness: 0.12, emissive: 0xfff2d6 }),
      tail: lens(old.tail, 0xb0201a, 0xff1a0c),
      brems: lens(old.brake, 0xbd2219, 0xff1608),
      rev: old.rev || new THREE.MeshStandardMaterial({ color: 0xd8d8d8, roughness: 0.2, emissive: 0xffffff }),
      blinkL: old.blinkL || new THREE.MeshStandardMaterial({ color: 0xc8701a, roughness: 0.3, emissive: 0xff8a1c }),
      blinkR: old.blinkR || new THREE.MeshStandardMaterial({ color: 0xc8701a, roughness: 0.3, emissive: 0xff8a1c }),
      plate: plateMat(),
    };
    return M;
  }
  // the inner shell colours the A pillars' upper half like the headliner: from the roof's front edge forward they are dark plastic, as the
  // rest of the pillar (the parts are in three's frame: the model's y is −z)
  function pillarsDark(q) {
    if (!q) return;
    const L = C.liner.map(Math.fround),
      T = C.trim;
    const liner = i => Math.abs(q.col[i] - L[0]) + Math.abs(q.col[i + 1] - L[1]) + Math.abs(q.col[i + 2] - L[2]) < 1e-5;
    // per triangle (its middle ahead of the edge, all three corners in the liner's colour)
    for (let t = 0; t + 9 <= q.col.length; t += 9) {
      if (-(q.pos[t + 2] + q.pos[t + 5] + q.pos[t + 8]) / 3 <= y2 + 0.005) continue;
      if (!liner(t) || !liner(t + 3) || !liner(t + 6)) continue;
      for (let i = t; i < t + 9; i += 3) {
        q.col[i] = T[0];
        q.col[i + 1] = T[1];
        q.col[i + 2] = T[2];
      }
    }
  }
  // a kit's parts as meshes under a group
  function meshes(out, M, shadows) {
    const g = new THREE.Group();
    for (const [name, q] of Object.entries(out)) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(q.pos, 3));
      geo.setAttribute('normal', new THREE.BufferAttribute(q.nor, 3));
      if (name === 'matt') geo.setAttribute('color', new THREE.BufferAttribute(q.col, 3));
      geo.computeBoundingSphere();
      const me = new THREE.Mesh(geo, M[name] || M.matt);
      me.name = 'kombi:' + name;
      me.castShadow = shadows && name !== 'glas';
      me.receiveShadow = true;
      me.userData.noMerge = true;
      if (name === 'glas') me.renderOrder = 2;
      g.add(me);
    }
    return g;
  }
  // the plates: two textured quads in one mesh (front, rear on the left door)
  function plates(Bd, M) {
    const w = 0.52,
      h = 0.112,
      P = [],
      U = [];
    const quad = (cx, y, cz, dir) => {
      const x0 = cx - w / 2,
        x1 = cx + w / 2,
        z0 = cz - h / 2,
        z1 = cz + h / 2;
      const a = dir > 0 ? [x1, x0] : [x0, x1];
      const pts = [
        [a[0], y, z0],
        [a[1], y, z0],
        [a[1], y, z1],
        [a[0], y, z1],
      ].map(p => V(p[0], p[1], p[2]).toArray());
      for (const i of [0, 1, 2, 0, 2, 3]) P.push(...pts[i]);
      U.push(0, 0, 1, 0, 1, 1, 0, 0, 1, 1, 0, 1);
    };
    quad(0, Bd.end(0, 0.5, 1) + 0.004, 0.5, 1);
    quad(-0.25, Bd.end(-0.25, 0.7, -1) - 0.014, 0.7, -1);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
    geo.computeVertexNormals();
    const me = new THREE.Mesh(geo, M.plate);
    me.name = 'kombi:plate';
    me.receiveShadow = true;
    me.userData.noMerge = true;
    return me;
  }
  // a wheel's meshes: tyre with its shoulders and sidewall, a steel rim behind a plastic cover with eight slots, the hub's cap
  function wheelMesh(s, M) {
    const k = K.kit();
    K.wheel(k, {
      r: RW,
      w: 0.185,
      rim: 0.19,
      s,
      seg: 28,
      col: rgb(58, 60, 64),
      spokes: 10,
      spokeCol: rgb(196, 198, 202),
      cap: rgb(52, 54, 58),
      capR: 0.042,
    });
    const g = meshes(k.done(), M, true);
    g.position.x = s * 0.016; // the tyres flush with the body's side: a track of about 1.50 m to the eye (car.js keeps 1.468 for the physics)
    return g;
  }
  // ---- swap the body of vehicles/car.js ----
  const S = { lod: null, near: 0, far: 0, ms: 0, tris: [0, 0], swapped: false };
  function swap(v) {
    const t0 = performance.now(),
      m = v.model,
      body = m.body;
    const old = {};
    for (const k of ['head', 'tail', 'brake', 'rev', 'blinkL', 'blinkR'])
      old[k] = m.lamps && m.lamps[k] && m.lamps[k][0];
    const M = materials(old);
    // the near level: the whole body with its inside and the small parts
    const kn = K.kit(),
      Bn = K.body(kn, D);
    details(kn, Bn);
    const parts = kn.done();
    pillarsDark(parts.matt);
    const near = meshes(parts, M, true);
    near.add(plates(Bn, M));
    // the far level: the shell without the inside and the small parts (the lamps stay: they glow at night)
    const kf = K.kit(),
      Df = Object.assign({}, D, { inner: false }),
      Bf = K.body(kf, Df);
    for (const s of [-1, 1]) {
      const x = 0.665,
        y = Bf.end(s * x, 1.0, -1) + 0.012;
      kf.box('tail', [s * x, y, 1.05], [0.1, 0.03, 0.34], C.silver);
      kf.box('head', [s * 0.55, Bf.end(s * 0.55, 0.69, 1) - 0.012, 0.69], [0.26, 0.03, 0.09], C.silver);
    }
    const far = meshes(kf.done(), M, true);
    const lod = new THREE.LOD();
    lod.name = 'kombi';
    lod.addLevel(near, 0);
    lod.addLevel(far, 45);
    // out with the old body (its inside group stays until the cockpit is built: vehicles/cockpit.js hides it)
    for (const o of body.children.slice()) {
      if (o === m.inside || o.name === 'cockpit') continue;
      body.remove(o);
      o.traverse(q => q.isMesh && q.geometry && q.geometry.dispose());
    }
    body.add(lod);
    // the wheels: the same pivots and rolling nodes, new tyres and rims
    for (const w of m.wheels) {
      for (const o of w.node.children.slice()) {
        w.node.remove(o);
        o.traverse(q => q.isMesh && q.geometry && q.geometry.dispose());
      }
      w.node.add(wheelMesh(Math.sign(w.x) || 1, M));
    }
    // the lamps vehicle.js and the cockpit light
    m.lamps = {
      head: [M.head],
      tail: [M.tail],
      brake: [M.brems],
      rev: [M.rev],
      blinkL: [M.blinkL],
      blinkR: [M.blinkR],
    };
    m.beam = [0, YF - 0.15, 0.74];
    // the cockpit's anchor points in this body (vehicles/cockpit_build.js reads spec.cockpit): the windscreen as built here (its foot and
    // its top edge in the middle, half widths a little above and below them), the mirror heads' glass, the floor
    const z0 = Bn.top(y3, 0),
      z1 = Bn.top(y2 + 0.01, 0),
      ws = { y0: y3, z0, w0: Bn.x(y3, z0 + 0.02), y1: y2 + 0.01, z1, w1: Bn.x(y2 + 0.01, z1 - 0.03) };
    const mh = sx => {
      const p = Bn.side(sx, y3 - 0.22, 1.035, 0.02);
      return [p[0] + sx * 0.095, p[1], p[2] + 0.035];
    };
    // the roof inside: the shell's liner lies in the roof's skin, a real headliner hangs about 6 cm lower – the cockpit's band on the
    // windscreen (its frit, 3.5 cm high), the headliner from there back over the rear seats, the visors folded against it and the top
    // frames of the door windows (the roof's side rails inside)
    const hz = z1 - 0.06;
    // the eye: about 0.43 m behind the roof's front edge and 0.33 m behind the rim's top (the header and the visors at the top of the view)
    v.spec.eye = [-0.36, -0.3, 1.17];
    v.spec.cockpit = {
      body: 'kombi', // the anchors of this body only (a copy of the spec on another body keeps today's)
      hp: [-0.36, -0.19, 0.6],
      wheel: { c: [-0.36, 0.11, 0.875], tilt: 0.44, r: 0.185 },
      dash: { face: 0.47, top: 0.97, ws: y3 + 0.02, x: 0.77 },
      ws,
      floor: 0.315,
      door: 0.78,
      mirL: mh(-1),
      mirR: mh(1),
      mirI: [0, 0.3, 1.31],
      roof: 1.5,
      head: {
        z0: hz - 0.035,
        z1: hz,
        back: [y1 + 0.3, Bn.top(y1 + 0.3, 0) - 0.07],
        w: 0.6,
        inset: 0.07,
        fh: 0.1, // the side rails inside: 10 cm over the top of the door windows (their daylight ends about 0.2 m above the eye)
        fw: 0.065,
        fx: 0.03,
      },
      heads: false, // no mirror heads of the cockpit's own: the body has its housings
      apil: false, // no A-pillar trims: the inner shell is dark there
      mirBack: 0.058,
    };
    S.lod = lod;
    S.ms = performance.now() - t0;
    S.near = near.children.length;
    S.far = far.children.length;
    const tri = g => {
      let n = 0;
      g.traverse(o => o.isMesh && (n += o.geometry.attributes.position.count / 3));
      return Math.round(n);
    };
    S.tris = [tri(near), tri(far)];
    S.swapped = true;
  }
  // ?altkombi: today's old body (to compare)
  const v = !QS.has('altkombi') && VEH.by && VEH.by.car;
  if (v) {
    try {
      swap(v);
    } catch (e) {
      S.err = String((e && e.stack) || e).slice(0, 400);
      console.warn('kombi', e);
    }
  }
  const info = () => ({
    swapped: S.swapped,
    ms: Math.round(S.ms),
    near: S.near,
    far: S.far,
    tris: S.tris,
    err: S.err || null,
  });
  return { D, info, S };
})();
