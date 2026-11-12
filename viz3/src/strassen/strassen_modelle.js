// ===================== feat/strassen 4: what stands beside a road – the models (STRMOD) =====================
// Delineators (Leitpfosten: white, the black band with the reflectors – one upright on the right, two dots on the left), guard rails
// (the double wave of a steel beam on posts, its ends sunk into the ground), traffic signs (the official shapes, drawn once into one
// picture; discs, triangles and the octagon as real outlines – no cut-out), street lamps (a mast with an arm and a flat head), wooden
// power poles and lattice towers with their lines. All of it lands in merged meshes with vertex colours on the material of the parked
// cars (dinge/dinge_modelle.js DMOD.mat) – so no new shader program; the sign faces take one material of their own (like the place-name
// signs of welt/fahrt.js), the lamp heads glow with the village's (world/village_props.js). Own models, no brands; the signs follow
// the official catalogue of the StVO (public domain).
// Coordinates: site metres (x east, y north, z up); a heading az clockwise from north, in radians.
// Pure geometry (plain arrays; strassen/strassen.js makes the meshes) and the drawing of the signs on a canvas it is given:
// unit tests in viz3/test/unit/strassen.test.mjs.
export const STRMOD = (() => {
  const S = {};
  const lin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)),
    L = (r, g, b) => [lin(r), lin(g), lin(b)];
  // vertex colours never reach pure white: DMOD.mat tints white vertices with the instance colour
  const C = {
    WHITE: L(0.93, 0.93, 0.91),
    PAINT: L(0.8, 0.8, 0.78),
    BLACK: L(0.07, 0.07, 0.075),
    REFL: L(0.82, 0.84, 0.86),
    AMBER: L(0.85, 0.5, 0.1),
    STEEL: L(0.62, 0.64, 0.66),
    STEEL_D: L(0.45, 0.47, 0.49),
    ZINC: L(0.55, 0.57, 0.58),
    MAST: L(0.5, 0.52, 0.53),
    HEAD: L(0.3, 0.31, 0.33),
    WOOD: L(0.3, 0.23, 0.17),
    WOOD_D: L(0.2, 0.15, 0.11),
    INSUL: L(0.36, 0.2, 0.13),
    WIRE: L(0.16, 0.16, 0.17),
    TOWER: L(0.5, 0.53, 0.54),
    CONC: L(0.55, 0.54, 0.51),
  };
  S.C = C;
  // ---- a geometry kit: quads, boxes, beams and tapered cylinders in site coordinates, with vertex colours ----
  function kit() {
    const pos = [],
      nrm = [],
      col = [],
      idx = [];
    // a quad of four site points, counter-clockwise seen from its front
    const quad = (A, B, Cc, D, c, n) => {
      const n0 = pos.length / 3;
      if (!n) {
        const ux = B[0] - A[0],
          uy = B[1] - A[1],
          uz = B[2] - A[2],
          vx = D[0] - A[0],
          vy = D[1] - A[1],
          vz = D[2] - A[2];
        n = [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
        const l = Math.hypot(n[0], n[1], n[2]) || 1;
        n = [n[0] / l, n[1] / l, n[2] / l];
      }
      for (const q of [A, B, Cc, D]) {
        pos.push(q[0], q[2], -q[1]);
        nrm.push(n[0], n[2], -n[1]);
        col.push(c[0], c[1], c[2]);
      }
      idx.push(n0, n0 + 1, n0 + 2, n0, n0 + 2, n0 + 3);
    };
    // a box standing on z0: sx across, sy along the heading az, sz high
    const box = (cx, cy, z0, sx, sy, sz, az, c) => {
      const ca = Math.cos(az),
        sa = Math.sin(az),
        P = (i, j, k) => [
          cx + (ca * i * sx) / 2 + (sa * j * sy) / 2,
          cy - (sa * i * sx) / 2 + (ca * j * sy) / 2,
          z0 + k * sz,
        ];
      quad(P(-1, -1, 1), P(1, -1, 1), P(1, 1, 1), P(-1, 1, 1), c); // top
      quad(P(-1, 1, 0), P(1, 1, 0), P(1, -1, 0), P(-1, -1, 0), c); // bottom
      quad(P(1, 1, 0), P(-1, 1, 0), P(-1, 1, 1), P(1, 1, 1), c); // front (+ along)
      quad(P(-1, -1, 0), P(1, -1, 0), P(1, -1, 1), P(-1, -1, 1), c); // back
      quad(P(1, -1, 0), P(1, 1, 0), P(1, 1, 1), P(1, -1, 1), c); // right
      quad(P(-1, 1, 0), P(-1, -1, 0), P(-1, -1, 1), P(-1, 1, 1), c); // left
    };
    // a beam from A to B (site points), w wide (level, across it) and h high; caps: close the ends
    const beam = (A, B, w, h, c, caps = true) => {
      let dx = B[0] - A[0],
        dy = B[1] - A[1],
        dz = B[2] - A[2];
      const l = Math.hypot(dx, dy, dz);
      if (l < 1e-4) return;
      dx /= l;
      dy /= l;
      dz /= l;
      // side: level, across the beam; for an upright beam east
      let sx = dy,
        sy = -dx,
        sz = 0;
      const sl = Math.hypot(sx, sy);
      if (sl < 1e-3) {
        sx = 1;
        sy = 0;
      } else {
        sx /= sl;
        sy /= sl;
      }
      // up = side × d … turned so that it points up (or north for an upright beam)
      const ux = sy * dz - sz * dy,
        uy = sz * dx - sx * dz,
        uz = sx * dy - sy * dx;
      const P = (E, i, k) => [
        E[0] + (sx * i * w) / 2 + (ux * k * h) / 2,
        E[1] + (sy * i * w) / 2 + (uy * k * h) / 2,
        E[2] + (uz * k * h) / 2,
      ];
      // (side, up, d): side × up = … the faces are wound by their computed normals, checked in the unit test
      const F = (p0, p1, p2, p3) => {
        // make the quad face away from the beam's axis
        const mx = (p0[0] + p2[0]) / 2 - (A[0] + B[0]) / 2,
          my = (p0[1] + p2[1]) / 2 - (A[1] + B[1]) / 2,
          mz = (p0[2] + p2[2]) / 2 - (A[2] + B[2]) / 2,
          ax = p1[0] - p0[0],
          ay = p1[1] - p0[1],
          az = p1[2] - p0[2],
          bx = p3[0] - p0[0],
          by = p3[1] - p0[1],
          bz = p3[2] - p0[2],
          nx = ay * bz - az * by,
          ny = az * bx - ax * bz,
          nz = ax * by - ay * bx;
        if (nx * mx + ny * my + nz * mz >= 0) quad(p0, p1, p2, p3, c);
        else quad(p3, p2, p1, p0, c);
      };
      F(P(A, -1, 1), P(A, 1, 1), P(B, 1, 1), P(B, -1, 1)); // top
      F(P(A, -1, -1), P(A, 1, -1), P(B, 1, -1), P(B, -1, -1)); // bottom
      F(P(A, 1, -1), P(A, 1, 1), P(B, 1, 1), P(B, 1, -1));
      F(P(A, -1, -1), P(A, -1, 1), P(B, -1, 1), P(B, -1, -1));
      if (caps) {
        const cap = (E, sgn) => {
          const q = [P(E, -1, -1), P(E, 1, -1), P(E, 1, 1), P(E, -1, 1)],
            n = [dx * sgn, dy * sgn, dz * sgn];
          // wound so that the computed normal is n
          const ax = q[1][0] - q[0][0],
            ay = q[1][1] - q[0][1],
            az = q[1][2] - q[0][2],
            bx = q[3][0] - q[0][0],
            by = q[3][1] - q[0][1],
            bz = q[3][2] - q[0][2],
            d = (ay * bz - az * by) * n[0] + (az * bx - ax * bz) * n[1] + (ax * by - ay * bx) * n[2];
          if (d >= 0) quad(q[0], q[1], q[2], q[3], c);
          else quad(q[3], q[2], q[1], q[0], c);
        };
        cap(A, -1);
        cap(B, 1);
      }
    };
    // an upright cylinder (tapered): n sides, smooth; top closed
    const cyl = (cx, cy, z0, h, r0, r1, n, c, top = true) => {
      const n0 = pos.length / 3,
        sl = (r0 - r1) / h;
      for (let i = 0; i <= n; i++) {
        const a = (i / n) * Math.PI * 2,
          ca = Math.cos(a),
          sa = Math.sin(a),
          nl = Math.hypot(1, sl);
        for (const [r, z] of [
          [r0, z0],
          [r1, z0 + h],
        ]) {
          pos.push(cx + ca * r, z, -(cy + sa * r));
          nrm.push(ca / nl, sl / nl, -sa / nl);
          col.push(c[0], c[1], c[2]);
        }
      }
      for (let i = 0; i < n; i++) {
        const a = n0 + i * 2;
        idx.push(a, a + 2, a + 3, a, a + 3, a + 1);
      }
      if (top) {
        const t0 = pos.length / 3;
        pos.push(cx, z0 + h, -cy);
        nrm.push(0, 1, 0);
        col.push(c[0], c[1], c[2]);
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          pos.push(cx + Math.cos(a) * r1, z0 + h, -(cy + Math.sin(a) * r1));
          nrm.push(0, 1, 0);
          col.push(c[0], c[1], c[2]);
        }
        for (let i = 0; i < n; i++) idx.push(t0, t0 + 1 + i, t0 + 1 + ((i + 1) % n));
      }
    };
    return { quad, box, beam, cyl, raw: { pos, nrm, col, idx }, count: () => idx.length / 3 };
  }
  S.kit = kit;
  const fwd = az => [Math.sin(az), Math.cos(az)],
    rgt = az => [Math.cos(az), -Math.sin(az)];
  // ---- a delineator at (x, y, z): az = the heading of the traffic that has it on its right. That traffic sees the upright reflector,
  // the traffic of the other direction (the post on its left) the two dots ----
  S.post = (K, x, y, z, az) => {
    const f = fwd(az);
    K.box(x, y, z - 0.25, 0.12, 0.085, 1.07, az, C.WHITE);
    K.box(x, y, z + 0.82, 0.106, 0.07, 0.07, az, C.WHITE); // the slanted head, simplified: a smaller cap
    K.box(x, y, z + 0.5, 0.124, 0.089, 0.25, az, C.BLACK);
    // the face towards the oncoming traffic of this side looks against the heading
    K.box(x - f[0] * 0.046, y - f[1] * 0.046, z + 0.535, 0.04, 0.006, 0.18, az, C.REFL);
    for (const dz of [0.55, 0.67]) K.box(x + f[0] * 0.046, y + f[1] * 0.046, z + dz, 0.05, 0.006, 0.05, az, C.REFL);
  };
  // ---- a guard rail along site points P ([x, y, z] about every 2 m, the ground): towards = +1 when the road lies to the left of the
  // run's direction, −1 to the right (the wave faces the road). Posts every 2 m; the first and last 4 m sink into the ground (sink0,
  // sink1: false for a piece that goes on in the next one). Returns the colliders: [[ax, ay, bx, by, z0, z1], …] ----
  const PROF = [
    [0.0, 0.44],
    [0.075, 0.505],
    [0.01, 0.595],
    [0.075, 0.685],
    [0.0, 0.75],
  ];
  S.rail = (K, P, towards, sink0 = true, sink1 = true) => {
    const n = P.length;
    if (n < 2) return [];
    const cum = [0];
    for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const Lt = cum[n - 1],
      SINK = Math.min(4, Lt * 0.3);
    // per point: the normal towards the road and how far the rail is up (0 at the ends, 1 after SINK metres)
    const N = [],
      UP = [];
    for (let i = 0; i < n; i++) {
      const a = P[Math.max(0, i - 1)],
        b = P[Math.min(n - 1, i + 1)],
        dx = b[0] - a[0],
        dy = b[1] - a[1],
        l = Math.hypot(dx, dy) || 1;
      N.push([(-dy / l) * towards, (dx / l) * towards]);
      // a piece of a longer run (sink0 / sink1 false) stays up at that end
      const e = Math.min(sink0 ? cum[i] : 1e9, sink1 ? Lt - cum[i] : 1e9);
      UP.push(SINK > 0.1 ? Math.min(1, 0.08 + (0.92 * e) / SINK) : 1);
    }
    const at = (i, k) => [P[i][0] + N[i][0] * PROF[k][0], P[i][1] + N[i][1] * PROF[k][0], P[i][2] + PROF[k][1] * UP[i]];
    const col = [];
    for (let i = 0; i < n - 1; i++) {
      for (let k = 0; k < PROF.length - 1; k++) {
        const a0 = at(i, k),
          a1 = at(i, k + 1),
          b0 = at(i + 1, k),
          b1 = at(i + 1, k + 1);
        // the face towards the road, and its back (a thin sheet: both sides show)
        if (towards > 0) {
          K.quad(b0, a0, a1, b1, C.STEEL);
          K.quad(a0, b0, b1, a1, C.STEEL_D);
        } else {
          K.quad(a0, b0, b1, a1, C.STEEL);
          K.quad(b0, a0, a1, b1, C.STEEL_D);
        }
      }
      col.push([
        P[i][0],
        P[i][1],
        P[i + 1][0],
        P[i + 1][1],
        Math.min(P[i][2], P[i + 1][2]),
        Math.max(P[i][2], P[i + 1][2]) + 0.8,
      ]);
    }
    // posts behind the beam
    for (let i = 0; i < n; i++) {
      if (UP[i] < 0.5) continue;
      const az = Math.atan2(N[i][0], N[i][1]);
      K.box(
        P[i][0] - N[i][0] * 0.05,
        P[i][1] - N[i][1] * 0.05,
        P[i][2] - 0.3,
        0.06,
        0.1,
        0.3 + 0.7 * UP[i],
        az,
        C.ZINC
      );
    }
    return col;
  };
  // ---- a street lamp: the mast at (x, y, z), its arm reaching az (towards the road); kind 0 at a street (6 m, arm), 1 on a path or
  // square (4 m, the head on top). Returns the head's place [x, y, z] (the glass, the light on the ground) ----
  S.lamp = (K, x, y, z, az, kind) => {
    const f = fwd(az);
    if (kind === 1) {
      K.cyl(x, y, z - 0.2, 4.2, 0.06, 0.045, 8, C.MAST, false);
      K.cyl(x, y, z + 4.0, 0.1, 0.05, 0.2, 10, C.HEAD, false);
      K.cyl(x, y, z + 4.1, 0.16, 0.24, 0.16, 10, C.HEAD);
      return [x, y, z + 4.02];
    }
    const H = 6.0,
      A = 0.95;
    K.cyl(x, y, z - 0.3, 0.75, 0.085, 0.075, 8, C.MAST, false); // the foot with its door
    K.cyl(x, y, z + 0.45, H - 0.45, 0.075, 0.042, 8, C.MAST);
    // the arm rises a little towards the road, the head lies at its end
    K.beam([x, y, z + H - 0.05], [x + f[0] * A, y + f[1] * A, z + H + 0.12], 0.05, 0.05, C.MAST);
    const hx = x + f[0] * (A + 0.22),
      hy = y + f[1] * (A + 0.22);
    K.box(hx, hy, z + H + 0.07, 0.24, 0.56, 0.09, az, C.HEAD);
    return [hx, hy, z + H + 0.065];
  };
  // ---- power: a wooden pole with a cross-arm and three insulators (the arm across the line: az along the line), a lattice tower with
  // three cross-arms. Both return where the conductors hang: [[x, y, z], …] ----
  // where the conductors hang on a mast (type 0 pole, 1 tower) – the same points S.pole / S.tower return, without building it
  const NOKIT = { box() {}, beam() {}, cyl() {}, quad() {} };
  S.hang = (type, x, y, z, az) => (type ? S.tower : S.pole)(NOKIT, x, y, z, az);
  S.pole = (K, x, y, z, az) => {
    const r = rgt(az),
      H = 9.5;
    K.cyl(x, y, z - 0.3, H + 0.3, 0.13, 0.085, 7, C.WOOD);
    K.beam(
      [x - r[0] * 0.85, y - r[1] * 0.85, z + H - 0.55],
      [x + r[0] * 0.85, y + r[1] * 0.85, z + H - 0.55],
      0.09,
      0.11,
      C.WOOD_D
    );
    const out = [];
    for (const o of [-0.78, 0, 0.78]) {
      const px = x + r[0] * o,
        py = y + r[1] * o,
        pz = z + H - 0.5 + (o === 0 ? 0.5 : 0);
      K.cyl(px, py, pz, 0.24, 0.05, 0.035, 6, C.INSUL);
      out.push([px, py, pz + 0.24]);
    }
    return out;
  };
  S.tower = (K, x, y, z, az) => {
    const r = rgt(az),
      f = fwd(az),
      H = 31,
      B = 3.1, // half width of the foot
      T = 0.55, // … of the head
      hw = h => B + ((T - B) * Math.min(h, 22)) / 22,
      leg = 0.14,
      P = (i, j, h) => [x + r[0] * i * hw(h) + f[0] * j * hw(h), y + r[1] * i * hw(h) + f[1] * j * hw(h), z + h];
    const LV = [0, 5.5, 10.5, 15, 19, 22, 25.5, 29, H];
    for (const [i, j] of [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ])
      for (let k = 0; k < LV.length - 1; k++) K.beam(P(i, j, LV[k]), P(i, j, LV[k + 1]), leg, leg, C.TOWER, false);
    // the lattice: a ring at every level, one diagonal per face and level (alternating)
    const ring = [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ];
    for (let k = 1; k < LV.length; k++)
      for (let q = 0; q < 4; q++) {
        const a = ring[q],
          b = ring[(q + 1) % 4];
        K.beam(P(a[0], a[1], LV[k]), P(b[0], b[1], LV[k]), 0.07, 0.07, C.TOWER, false);
        const up = (k + q) % 2 === 0;
        K.beam(P(a[0], a[1], LV[up ? k - 1 : k]), P(b[0], b[1], LV[up ? k : k - 1]), 0.06, 0.06, C.TOWER, false);
      }
    // three cross-arms across the line (the lowest the widest), an earth wire on the tip
    const out = [];
    for (const [h, w] of [
      [22, 6.2],
      [25.5, 4.6],
      [29, 3.4],
    ]) {
      K.beam([x - r[0] * w, y - r[1] * w, z + h], [x + r[0] * w, y + r[1] * w, z + h], 0.16, 0.2, C.TOWER);
      for (const sd of [-1, 1]) {
        const px = x + r[0] * w * sd * 0.94,
          py = y + r[1] * w * sd * 0.94;
        K.cyl(px, py, z + h - 1.5, 1.45, 0.06, 0.06, 6, C.INSUL, false);
        out.push([px, py, z + h - 1.5]);
      }
    }
    out.push([x, y, z + H]);
    return out;
  };
  // a conductor between two points, hanging (sag in metres at the middle): the points of its line, three numbers each in the
  // renderer's order (x, z up, −y) – pairs of them are the segments of a thin line (strassen/strassen.js)
  S.wire = (out, A, B, sag, seg = 8) => {
    let px = A[0],
      py = A[1],
      pz = A[2];
    for (let i = 1; i <= seg; i++) {
      const t = i / seg,
        x = A[0] + (B[0] - A[0]) * t,
        y = A[1] + (B[1] - A[1]) * t,
        z = A[2] + (B[2] - A[2]) * t - sag * 4 * t * (1 - t);
      out.push(px, pz, -py, x, z, -y);
      px = x;
      py = y;
      pz = z;
    }
  };
  // ---- paint across a lane, lying on the ground (gz(x, y) → its height): 'halt' a stop line (solid, 0.5 m), 'warte' a give-way line
  // (blocks of 0.5 m, gaps of 0.25 m) across the half of the road at (x, y) with half width hw, the traffic heading az; 'zebra' the
  // stripes of a crossing over the whole road (hw its half width, az the road's direction): 0.5 m stripes, 0.5 m gaps, 4 m long ----
  S.paint = (K, type, x, y, az, hw, gz) => {
    const f = fwd(az),
      r = rgt(az),
      LIFT = 0.022,
      P = (a, b) => {
        const px = x + r[0] * a + f[0] * b,
          py = y + r[1] * a + f[1] * b;
        return [px, py, gz(px, py) + LIFT];
      },
      rect = (a0, a1, b0, b1) => K.quad(P(a0, b0), P(a1, b0), P(a1, b1), P(a0, b1), C.PAINT);
    if (type === 'halt') {
      for (let a = -hw; a < hw - 0.01; a += 1) rect(a, Math.min(hw, a + 1), -0.25, 0.25);
    } else if (type === 'warte') {
      const n = Math.max(1, Math.floor((2 * hw + 0.25) / 0.75)),
        a0 = -(n * 0.75 - 0.25) / 2;
      for (let i = 0; i < n; i++) rect(a0 + i * 0.75, a0 + i * 0.75 + 0.5, -0.2, 0.2);
    } else if (type === 'zebra') {
      const n = Math.max(2, Math.floor(2 * hw + 0.5)),
        a0 = -(n - 0.5) / 2;
      for (let i = 0; i < n; i++) for (const b of [-2, 0]) rect(a0 + i, a0 + i + 0.5, b, b + 2);
    }
  };
  // ================= traffic signs =================
  // One picture for all faces: cells of CELL pixels; a sign is drawn at its true proportions, its longer side filling the cell.
  const CELL = 128,
    PAD = 5,
    RED = '#c4161c',
    BLUE = '#0d4f9e',
    WHT = '#f4f4f0',
    BLK = '#111';
  // kind → { shape: 'disc' | 'up' | 'down' | 'oct' | 'rect', w, h (metres), zc: height of its middle above the ground }
  const DEF = code => {
    const k = code.split('-')[0];
    if (k === '274' || k === '278') return { shape: 'disc', w: 0.62, h: 0.62, zc: 2.15 };
    if (k === '274.1') return { shape: 'rect', w: 0.62, h: 0.82, zc: 2.2 };
    if (k === '205') return { shape: 'down', w: 0.92, h: 0.8, zc: 2.15 };
    if (k === '206') return { shape: 'oct', w: 0.9, h: 0.9, zc: 2.2 };
    if (k === '301' || k === '142') return { shape: 'up', w: 0.92, h: 0.8, zc: 2.15 };
    if (k === '215') return { shape: 'disc', w: 0.62, h: 0.62, zc: 1.5 };
    if (k === '350') return { shape: 'rect', w: 0.62, h: 0.62, zc: 2.2 };
    if (k === '625') return { shape: 'rect', w: 0.52, h: 0.52, zc: 1.25 };
    if (k === 'km') return { shape: 'rect', w: 0.42, h: 0.3, zc: 0.95 };
    if (k === '201') return { shape: 'rect', w: 1.22, h: 0.2, zc: 2.0 }; // one arm of the cross
    return { shape: 'rect', w: 0.6, h: 0.6, zc: 2.1 };
  };
  S.signDef = DEF;
  // outline of a shape in the unit square (u right, v up, the middle at 0): points counter-clockwise
  const OUT = {
    disc: () => {
      const p = [];
      for (let i = 0; i < 20; i++)
        p.push([0.5 * Math.cos((i / 20) * 2 * Math.PI), 0.5 * Math.sin((i / 20) * 2 * Math.PI)]);
      return p;
    },
    oct: () => {
      const p = [],
        r = 0.5 / Math.cos(Math.PI / 8);
      for (let i = 0; i < 8; i++)
        p.push([r * Math.cos(Math.PI / 8 + (i / 8) * 2 * Math.PI), r * Math.sin(Math.PI / 8 + (i / 8) * 2 * Math.PI)]);
      return p;
    },
    // the triangles a little rounded at their corners
    up: () => [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.06, 0.5],
      [-0.06, 0.5],
    ],
    down: () => [
      [0.5, 0.5],
      [-0.5, 0.5],
      [-0.06, -0.5],
      [0.06, -0.5],
    ],
    rect: () => [
      [-0.5, -0.5],
      [0.5, -0.5],
      [0.5, 0.5],
      [-0.5, 0.5],
    ],
  };
  S.outline = sh => OUT[sh]();
  // ---- drawing one sign into its cell: g a 2D context moved to the cell's middle, s = the pixels of the sign's longer side ----
  function path(g, pts, s, w, h) {
    // the outline scaled to the sign's own proportions (w, h relative to the longer side)
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo : g.moveTo).call(g, p[0] * s * w, -p[1] * s * h));
    g.closePath();
  }
  function text(g, t, px, y = 0, col = BLK, weight = 700) {
    g.fillStyle = col;
    g.font = weight + ' ' + px + 'px "DIN Alternate", "Arial Narrow", "Helvetica Neue", Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(t, 0, y);
  }
  function draw(g, code, txt, s) {
    const [k, v] = code.split('-'),
      d = DEF(code),
      m = Math.max(d.w, d.h),
      w = d.w / m,
      h = d.h / m,
      pts = OUT[d.shape]();
    if (k === '274') {
      path(g, pts, s, w, h);
      g.fillStyle = RED;
      g.fill();
      g.beginPath();
      g.arc(0, 0, s * 0.37, 0, Math.PI * 2);
      g.fillStyle = WHT;
      g.fill();
      text(g, v, s * (v.length > 2 ? 0.36 : 0.46), s * 0.02);
    } else if (k === '278') {
      path(g, pts, s, w, h);
      g.fillStyle = WHT;
      g.fill();
      g.lineWidth = s * 0.03;
      g.strokeStyle = BLK;
      g.beginPath();
      g.arc(0, 0, s * 0.47, 0, Math.PI * 2);
      g.stroke();
      text(g, v, s * (v.length > 2 ? 0.34 : 0.44), s * 0.02, '#8a8a88');
      g.save();
      g.beginPath();
      g.arc(0, 0, s * 0.45, 0, Math.PI * 2);
      g.clip();
      g.rotate(-Math.PI / 4);
      g.fillStyle = BLK;
      for (let i = -2; i <= 2; i++) g.fillRect(-s * 0.5, i * s * 0.045 - s * 0.009, s, s * 0.018);
      g.restore();
    } else if (k === '274.1') {
      g.fillStyle = WHT;
      g.fillRect((-s * w) / 2, (-s * h) / 2, s * w, s * h);
      g.lineWidth = s * 0.02;
      g.strokeStyle = BLK;
      g.strokeRect((-s * w) / 2 + s * 0.02, (-s * h) / 2 + s * 0.02, s * w - s * 0.04, s * h - s * 0.04);
      g.beginPath();
      g.arc(0, -s * 0.14, s * 0.29, 0, Math.PI * 2);
      g.fillStyle = RED;
      g.fill();
      g.beginPath();
      g.arc(0, -s * 0.14, s * 0.215, 0, Math.PI * 2);
      g.fillStyle = WHT;
      g.fill();
      text(g, v, s * 0.27, -s * 0.13);
      text(g, 'ZONE', s * 0.19, s * 0.33);
    } else if (k === '205' || k === '301' || k === '142') {
      path(g, pts, s, w, h);
      g.fillStyle = RED;
      g.fill();
      // the white field: the same triangle, smaller
      const up = d.shape === 'up',
        q = up
          ? [
              [-0.33, -0.39],
              [0.33, -0.39],
              [0, 0.27],
            ]
          : [
              [0.33, 0.39],
              [-0.33, 0.39],
              [0, -0.27],
            ];
      path(g, q, s, w, h);
      g.fillStyle = WHT;
      g.fill();
      g.fillStyle = BLK;
      if (k === '301') {
        // priority at the next junction: a thick arrow up, a thin bar across
        g.fillRect(-s * 0.035, -s * 0.08, s * 0.07, s * 0.33);
        g.beginPath();
        g.moveTo(0, -s * 0.2);
        g.lineTo(s * 0.1, -s * 0.05);
        g.lineTo(-s * 0.1, -s * 0.05);
        g.closePath();
        g.fill();
        g.fillRect(-s * 0.15, s * 0.07, s * 0.3, s * 0.035);
      } else if (k === '142') {
        // a leaping deer, plain: body, neck and head, legs, antlers
        g.save();
        g.translate(0, s * 0.09);
        g.scale(s / 100, s / 100);
        g.beginPath();
        g.moveTo(-20, 2);
        g.quadraticCurveTo(-6, -9, 8, -6);
        g.lineTo(14, -16);
        g.lineTo(20, -17);
        g.lineTo(23, -13);
        g.lineTo(16, -9);
        g.lineTo(13, 0);
        g.quadraticCurveTo(0, 7, -16, 7);
        g.closePath();
        g.fill();
        g.lineWidth = 2.6;
        g.strokeStyle = BLK;
        g.lineCap = 'round';
        for (const [x0, y0, x1, y1] of [
          [9, 1, 19, 12],
          [5, 3, 12, 15],
          [-14, 5, -25, 14],
          [-17, 3, -27, 9],
          [16, -17, 13, -25],
          [16, -21, 20, -25],
        ]) {
          g.beginPath();
          g.moveTo(x0, y0);
          g.lineTo(x1, y1);
          g.stroke();
        }
        g.restore();
      }
    } else if (k === '206') {
      path(g, pts, s, w, h);
      g.fillStyle = WHT;
      g.fill();
      path(
        g,
        pts.map(p => [p[0] * 0.93, p[1] * 0.93]),
        s,
        w,
        h
      );
      g.fillStyle = RED;
      g.fill();
      text(g, 'STOP', s * 0.3, s * 0.01, WHT);
    } else if (k === '215') {
      path(g, pts, s, w, h);
      g.fillStyle = BLUE;
      g.fill();
      g.strokeStyle = WHT;
      g.fillStyle = WHT;
      g.lineWidth = s * 0.07;
      for (let i = 0; i < 3; i++) {
        const a0 = (i * 2 * Math.PI) / 3 + 0.35,
          a1 = a0 + 1.35,
          r = s * 0.26;
        g.beginPath();
        g.arc(0, 0, r, a0, a1);
        g.stroke();
        // the arrow head at the arc's end, along the tangent
        const hx = Math.cos(a1) * r,
          hy = Math.sin(a1) * r,
          tx = -Math.sin(a1),
          ty = Math.cos(a1),
          nx = Math.cos(a1),
          ny = Math.sin(a1),
          q = s * 0.085;
        g.beginPath();
        g.moveTo(hx + tx * q * 1.5, hy + ty * q * 1.5);
        g.lineTo(hx + nx * q, hy + ny * q);
        g.lineTo(hx - nx * q, hy - ny * q);
        g.closePath();
        g.fill();
      }
    } else if (k === '350') {
      g.fillStyle = BLUE;
      g.fillRect(-s / 2, -s / 2, s, s);
      g.fillStyle = WHT;
      g.beginPath();
      g.moveTo(0, -s * 0.36);
      g.lineTo(s * 0.4, s * 0.34);
      g.lineTo(-s * 0.4, s * 0.34);
      g.closePath();
      g.fill();
      // a walker on the stripes
      g.fillStyle = BLK;
      g.beginPath();
      g.arc(s * 0.02, -s * 0.1, s * 0.04, 0, Math.PI * 2);
      g.fill();
      g.lineWidth = s * 0.045;
      g.strokeStyle = BLK;
      g.lineCap = 'round';
      for (const [x0, y0, x1, y1] of [
        [0.01, -0.04, -0.01, 0.1],
        [-0.01, 0.1, -0.09, 0.22],
        [-0.01, 0.1, 0.08, 0.22],
        [0.01, -0.02, -0.08, 0.05],
        [0.01, -0.02, 0.09, 0.04],
      ]) {
        g.beginPath();
        g.moveTo(x0 * s, y0 * s);
        g.lineTo(x1 * s, y1 * s);
        g.stroke();
      }
      for (let i = -2; i <= 2; i++) g.fillRect(i * s * 0.09 - s * 0.025, s * 0.25, s * 0.05, s * 0.06);
    } else if (k === '625') {
      g.fillStyle = WHT;
      g.fillRect(-s / 2, -s / 2, s, s);
      g.fillStyle = RED;
      const dir = txt === 'L' ? -1 : 1;
      for (const o of [-0.26, 0.1]) {
        g.beginPath();
        g.moveTo(dir * (o - 0.1) * s, -s * 0.5);
        g.lineTo(dir * (o + 0.12) * s, -s * 0.5);
        g.lineTo(dir * (o + 0.38) * s, 0);
        g.lineTo(dir * (o + 0.12) * s, s * 0.5);
        g.lineTo(dir * (o - 0.1) * s, s * 0.5);
        g.lineTo(dir * (o + 0.16) * s, 0);
        g.closePath();
        g.fill();
      }
    } else if (k === 'km') {
      g.fillStyle = WHT;
      g.fillRect((-s * w) / 2, (-s * h) / 2, s * w, s * h);
      g.lineWidth = s * 0.025;
      g.strokeStyle = BLK;
      g.strokeRect((-s * w) / 2 + s * 0.025, (-s * h) / 2 + s * 0.025, s * w - s * 0.05, s * h - s * 0.05);
      text(g, txt || 'km', s * (txt && txt.length > 4 ? 0.2 : 0.27), s * 0.01);
    } else if (k === '201') {
      // one arm of St Andrew's cross: white, red at both ends
      g.fillStyle = WHT;
      g.fillRect((-s * w) / 2, (-s * h) / 2, s * w, s * h);
      g.fillStyle = RED;
      g.fillRect((-s * w) / 2, (-s * h) / 2, s * w * 0.27, s * h);
      g.fillRect((s * w) / 2 - s * w * 0.27, (-s * h) / 2, s * w * 0.27, s * h);
    } else {
      g.fillStyle = WHT;
      g.fillRect((-s * w) / 2, (-s * h) / 2, s * w, s * h);
    }
  }
  S.draw = draw;
  // ---- the atlas: one cell per sign face that occurs (code + text), plus the grey of the backs ----
  S.atlas = (list, makeCanvas) => {
    const keys = ['back'];
    for (const s of list) {
      for (const c of s.c.split('+')) {
        const k = c + (c.startsWith('625') || c === 'km' ? '|' + (s.t || '') : '');
        if (!keys.includes(k)) keys.push(k);
      }
    }
    const cols = 8,
      rows = Math.max(1, Math.ceil(keys.length / cols)),
      W = cols * CELL,
      H = Math.pow(2, Math.ceil(Math.log2(rows * CELL))),
      cv = makeCanvas ? makeCanvas(W, H) : null,
      g = cv ? cv.getContext('2d') : null;
    if (g) {
      g.fillStyle = '#7d8083';
      g.fillRect(0, 0, W, H);
    }
    const cell = {};
    keys.forEach((k, i) => {
      const cx = (i % cols) * CELL + CELL / 2,
        cy = Math.floor(i / cols) * CELL + CELL / 2;
      cell[k] = [cx / W, 1 - cy / H, (CELL - 2 * PAD) / W, (CELL - 2 * PAD) / H];
      if (k === 'back' || !g) return;
      const [code, t] = k.split('|');
      g.save();
      g.translate(cx, cy);
      try {
        draw(g, code, t, CELL - 2 * PAD);
      } catch (e) {
        console.warn('strassen sign', code, e);
      }
      g.restore();
    });
    return { cell, keys, cv, W, H };
  };
  // ---- a sign at (x, y, z): read by the traffic heading az (it faces against az). K takes the post and the frame, F the faces
  // (F: { pos, nrm, uv, idx }, the atlas' cells in AT). Returns the collider of the post ----
  S.sign = (K, F, AT, s, x, y, z) => {
    const az = s.h,
      f = fwd(az),
      r = rgt(az),
      parts = s.c.split('+'),
      // the face looks against the traffic: its normal −f; seen from the front its left is the traffic's right … +r of the heading
      face = (code, zc, tilt = 0) => {
        const d = DEF(code),
          key = code + (code.startsWith('625') || code === 'km' ? '|' + (s.t || '') : ''),
          cu = AT.cell[key] || AT.cell.back,
          cb = AT.cell.back,
          m = Math.max(d.w, d.h),
          pts = OUT[d.shape](),
          ct = Math.cos(tilt),
          st = Math.sin(tilt);
        // the front looks against the traffic (normal −f): the picture's right is the traffic's right (+r); the back is plain grey
        for (const [sgn, off, cl] of [
          [1, -0.035, cu],
          [-1, -0.005, cb],
        ]) {
          const n0 = F.pos.length / 3,
            P = [[0, 0], ...pts];
          for (const p of P) {
            const u = p[0] * d.w * ct - p[1] * d.h * st,
              v = p[0] * d.w * st + p[1] * d.h * ct;
            F.pos.push(x + f[0] * off + r[0] * u, z + zc + v, -(y + f[1] * off + r[1] * u));
            F.nrm.push(-f[0] * sgn, 0, f[1] * sgn);
            if (sgn > 0) F.uv.push(cl[0] + ((p[0] * d.w) / m) * cl[2], cl[1] + ((p[1] * d.h) / m) * cl[3]);
            else F.uv.push(cl[0], cl[1]);
          }
          for (let i = 1; i <= pts.length; i++) {
            const a = n0 + i,
              b = n0 + 1 + (i % pts.length);
            if (sgn > 0) F.idx.push(n0, a, b);
            else F.idx.push(n0, b, a);
          }
        }
        return d;
      };
    let top = 0;
    if (parts[0] === '201') {
      // St Andrew's cross: two arms crossed, upright
      face('201', 2.05, 0.62);
      face('201', 2.05, -0.62);
      top = 2.6;
    } else if (parts.length > 1) {
      const d0 = face(parts[0], 2.45);
      face(parts[1], 2.45 - d0.h / 2 - DEF(parts[1]).h / 2 - 0.06);
      top = 2.45 + d0.h / 2;
    } else {
      const d = face(parts[0], DEF(parts[0]).zc);
      top = d.zc + d.h / 2;
    }
    const pz = Math.max(0.9, top - 0.04);
    K.cyl(x, y, z - 0.3, pz + 0.3, 0.032, 0.032, 6, C.ZINC);
    return [x, y, 0.05, z, z + pz];
  };
  return S;
})();
if (typeof window !== 'undefined') window.STRMOD = STRMOD;
