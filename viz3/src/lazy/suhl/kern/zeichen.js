// Suhl runtime: the signs of Suhl's own furniture lists that the roads system does not draw (STRDAT reads only its own lists):
// street-name signs at the corners (lists `namen` of product m: one post, two plates along the two streets, the first on top) and
// bus stops (lists `halte`: the H sign facing the buses, the stop's name on a plate below it, a small timetable case, a shelter of
// glass with a bench or a bench alone where OpenStreetMap says so; a sign mapped on the carriageway is set onto the pavement on the
// side the buses stop at). Built near the observer (within R) from the tiles the street module holds, again when the observer moved
// MOVE, a tile's lists came or went, or the ground under them changed (finer tiles). Two merged meshes: all solid parts on one canvas
// (a cell per name while it is near, the H sign, patches of plain colours) – the standard program with a map, as the app's models
// have it; the glass of the shelters transparent with the same program without a map.
const RAD = Math.PI / 180,
  MOVE = 50,
  A = 1024, // the canvas (px)
  CW = 512,
  CH = 64, // a name's cell
  Y0 = 128, // the cells start below the H sign and the colour patches
  CELLS = 2 * Math.floor((A - Y0) / CH),
  PH = 0.24, // a plate's height (m); its length follows the name
  LMAX = 1.6; // a plate's length at most (m) – longer names are set narrower
// colour patches: centre of a 12 px square in the first rows right of the H sign
const PATCH = {
  white: [136, 8, '#f2f2ee'],
  metal: [152, 8, '#9aa1a6'],
  dark: [168, 8, '#2c3034'],
  wood: [184, 8, '#7a5838'],
  green: [200, 8, '#0b7a3e'],
  pane: [216, 8, '#e3e5e1'],
};
export function zeichen(ctx, ST) {
  const { THREE, scene, markDirty, KERN, COARSE } = ctx,
    R = COARSE ? 180 : 260,
    S = {
      on: true,
      rev: -1,
      at: [1e9, 1e9],
      tz: 0,
      ref: [],
      retry: 0,
      near: {},
      n: { posts: 0, plates: 0, stops: 0, shelters: 0, benches: 0 },
    };
  let K = null;
  // ---- the canvas ----
  function kit() {
    if (K) return K;
    const cv = document.createElement('canvas');
    cv.width = cv.height = A;
    const g = cv.getContext('2d');
    g.fillStyle = '#f2f2ee';
    g.fillRect(0, 0, A, A);
    for (const [x, y, c] of Object.values(PATCH)) {
      g.fillStyle = c;
      g.fillRect(x - 6, y - 6, 12, 12);
    }
    // the H sign (sign 224): a yellow disc in a green ring, a green H
    g.fillStyle = '#0b7a3e';
    g.fillRect(0, 0, 128, 128);
    g.beginPath();
    g.arc(64, 64, 52, 0, 2 * Math.PI);
    g.fillStyle = '#f3c614';
    g.fill();
    g.fillStyle = '#0b7a3e';
    g.font = 'bold 74px Arial, "Liberation Sans", "DejaVu Sans", sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('H', 64, 68);
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    const mats = {
      face: new THREE.MeshStandardMaterial({ map: tex, roughness: 0.62, metalness: 0.08 }),
      glass: new THREE.MeshStandardMaterial({
        color: 0xb4c8ce,
        roughness: 0.08,
        metalness: 0.1,
        transparent: true,
        opacity: 0.26,
        depthWrite: false,
      }),
    };
    const mk = (m, name) => {
      const me = new THREE.Mesh(new THREE.BufferGeometry(), m);
      me.name = name;
      me.visible = false;
      me.frustumCulled = false; // rebuilt around the observer
      me.castShadow = me.receiveShadow = false;
      me.userData.noMerge = true;
      scene.add(me);
      return me;
    };
    K = {
      cv,
      g,
      tex,
      mats,
      solid: mk(mats.face, 'suhl zeichen'),
      glass: mk(mats.glass, 'suhl wartehallen glas'),
      cells: new Map(), // key → { i, pw }
      free: Array.from({ length: CELLS }, (q, i) => CELLS - 1 - i),
    };
    K.glass.renderOrder = 2;
    return K;
  }
  // a name in cell i: a white plate with a dark rim (street) or a green one (bus stop), the text set narrower when it is long
  function draw(i, text, stop) {
    const g = K.g,
      x0 = (i % 2) * CW,
      y0 = Y0 + Math.floor(i / 2) * CH;
    g.save();
    g.fillStyle = '#f2f2ee';
    g.fillRect(x0, y0, CW, CH);
    g.font = 'bold 36px Arial, "Liberation Sans", "DejaVu Sans", sans-serif';
    const w = g.measureText(text).width,
      maxW = Math.floor((LMAX / PH) * CH) - 28,
      sx = w > maxW ? maxW / w : 1,
      pw = Math.min(CW, Math.ceil(w * sx) + 28);
    g.strokeStyle = stop ? '#0b7a3e' : '#1d1d1b';
    g.lineWidth = 3;
    g.strokeRect(x0 + 5.5, y0 + 5.5, pw - 11, CH - 11);
    g.fillStyle = '#1d1d1b';
    g.textBaseline = 'middle';
    g.translate(x0 + 14, y0 + CH / 2 + 2);
    g.scale(sx, 1);
    g.fillText(text, 0, 0);
    g.restore();
    return pw;
  }
  // the cells for the names in order of nearness: names no longer near give their cells back, new ones are drawn while cells are free
  function cellsFor(keys) {
    const want = new Set(keys.slice(0, CELLS));
    for (const [k, c] of K.cells)
      if (!want.has(k)) {
        K.free.push(c.i);
        K.cells.delete(k);
      }
    let drawn = 0;
    for (const k of want) {
      if (K.cells.has(k)) continue;
      const i = K.free.pop();
      if (i === undefined) break;
      K.cells.set(k, { i, pw: draw(i, k.slice(2), k[0] === 'H') });
      drawn++;
    }
    if (drawn) K.tex.needsUpdate = true;
  }
  const uvP = p => [p[0] / A, 1 - p[1] / A];
  const uvCell = c => {
    const x0 = (c.i % 2) * CW,
      y0 = Y0 + Math.floor(c.i / 2) * CH;
    return [(x0 + 0.5) / A, 1 - (y0 + CH - 0.5) / A, (x0 + c.pw - 0.5) / A, 1 - (y0 + 0.5) / A];
  };
  // ---- geometry: model coordinates (x east, y north, z up) → three.js (x, z, −y) ----
  const buf = () => ({ p: [], n: [], uv: [] });
  function face(B, P, nm, uv) {
    // four corners counter-clockwise seen from outside (fixed if not), one outward normal (or one per corner), their uvs
    const T = P.map(q => [q[0], q[2], -q[1]]),
      N = (Array.isArray(nm[0]) ? nm : [nm, nm, nm, nm]).map(q => [q[0], q[2], -q[1]]),
      ux = T[1][0] - T[0][0],
      uy = T[1][1] - T[0][1],
      uz = T[1][2] - T[0][2],
      vx = T[2][0] - T[0][0],
      vy = T[2][1] - T[0][1],
      vz = T[2][2] - T[0][2],
      flip = (uy * vz - uz * vy) * N[0][0] + (uz * vx - ux * vz) * N[0][1] + (ux * vy - uy * vx) * N[0][2] < 0,
      ord = flip ? [0, 3, 2, 0, 2, 1] : [0, 1, 2, 0, 2, 3];
    for (const k of ord) {
      B.p.push(T[k][0], T[k][1], T[k][2]);
      B.n.push(N[k][0], N[k][1], N[k][2]);
      B.uv.push(uv[k][0], uv[k][1]);
    }
  }
  // one triangle, the same way
  function tri(B, P, nm, uv) {
    const T = P.map(q => [q[0], q[2], -q[1]]),
      N = [nm[0], nm[2], -nm[1]],
      ux = T[1][0] - T[0][0],
      uy = T[1][1] - T[0][1],
      uz = T[1][2] - T[0][2],
      vx = T[2][0] - T[0][0],
      vy = T[2][1] - T[0][1],
      vz = T[2][2] - T[0][2],
      ord =
        (uy * vz - uz * vy) * N[0] + (uz * vx - ux * vz) * N[1] + (ux * vy - uy * vx) * N[2] < 0
          ? [0, 2, 1]
          : [0, 1, 2];
    for (const k of ord) {
      B.p.push(T[k][0], T[k][1], T[k][2]);
      B.n.push(N[0], N[1], N[2]);
      B.uv.push(uv[k][0], uv[k][1]);
    }
  }
  const quadUv = r =>
    r.length === 2
      ? [r, r, r, r]
      : [
          [r[0], r[1]],
          [r[2], r[1]],
          [r[2], r[3]],
          [r[0], r[3]],
        ];
  // a box: centre c [x, y, z], e1 a horizontal unit vector, half sizes along e1, e2 (e1 turned clockwise) and up; f / b: uv rect of
  // the face towards +e2 / −e2 (seen from outside its u runs to the right), s: the patch of the other four faces
  function box(B, c, e1, hl, hd, hh, f, b, s) {
    const e2 = [e1[1], -e1[0]],
      P = (s1, s2, s3) => [
        c[0] + e1[0] * hl * s1 + e2[0] * hd * s2,
        c[1] + e1[1] * hl * s1 + e2[1] * hd * s2,
        c[2] + hh * s3,
      ],
      side = quadUv(s);
    face(B, [P(-1, 1, -1), P(1, 1, -1), P(1, 1, 1), P(-1, 1, 1)], [e2[0], e2[1], 0], quadUv(f));
    face(B, [P(1, -1, -1), P(-1, -1, -1), P(-1, -1, 1), P(1, -1, 1)], [-e2[0], -e2[1], 0], quadUv(b));
    face(B, [P(1, 1, -1), P(1, -1, -1), P(1, -1, 1), P(1, 1, 1)], [e1[0], e1[1], 0], side);
    face(B, [P(-1, -1, -1), P(-1, 1, -1), P(-1, 1, 1), P(-1, -1, 1)], [-e1[0], -e1[1], 0], side);
    face(B, [P(-1, 1, 1), P(1, 1, 1), P(1, -1, 1), P(-1, -1, 1)], [0, 0, 1], side);
    face(B, [P(-1, -1, -1), P(1, -1, -1), P(1, 1, -1), P(-1, 1, -1)], [0, 0, -1], side);
  }
  // a round post from z0 to z1 with a flat cap
  function post(B, x, y, z0, z1, r, s) {
    const n = 8,
      uv = quadUv(s);
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI,
        a1 = ((i + 1) / n) * 2 * Math.PI,
        c0 = Math.cos(a0),
        s0 = Math.sin(a0),
        c1 = Math.cos(a1),
        s1 = Math.sin(a1);
      face(
        B,
        [
          [x + r * c0, y + r * s0, z0],
          [x + r * c1, y + r * s1, z0],
          [x + r * c1, y + r * s1, z1],
          [x + r * c0, y + r * s0, z1],
        ],
        [
          [c0, s0, 0],
          [c1, s1, 0],
          [c1, s1, 0],
          [c0, s0, 0],
        ],
        uv
      );
      tri(
        B,
        [
          [x, y, z1 + 0.01],
          [x + r * c0, y + r * s0, z1],
          [x + r * c1, y + r * s1, z1],
        ],
        [0, 0, 1],
        uv
      );
    }
  }
  // a disc in the vertical plane of e1 (its face towards e1 turned clockwise), the H of the canvas on both faces, a green rim
  function disc(B, c, e1, r, hd) {
    const n = 20,
      e2 = [e1[1], -e1[0]],
      uc = 64 / A,
      vc = 1 - 64 / A,
      du = 60 / A,
      rim = quadUv(uvP(PATCH.green)),
      at = (a, s2) => [
        c[0] + e1[0] * r * Math.cos(a) + e2[0] * hd * s2,
        c[1] + e1[1] * r * Math.cos(a) + e2[1] * hd * s2,
        c[2] + r * Math.sin(a),
      ];
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * Math.PI,
        a1 = ((i + 1) / n) * 2 * Math.PI,
        m = [c[0] + e2[0] * hd, c[1] + e2[1] * hd, c[2]],
        mb = [c[0] - e2[0] * hd, c[1] - e2[1] * hd, c[2]];
      // front: u along +e1; back: u along −e1 (seen from behind the H is not mirrored)
      tri(
        B,
        [m, at(a0, 1), at(a1, 1)],
        [e2[0], e2[1], 0],
        [
          [uc, vc],
          [uc + du * Math.cos(a0), vc + du * Math.sin(a0)],
          [uc + du * Math.cos(a1), vc + du * Math.sin(a1)],
        ]
      );
      tri(
        B,
        [mb, at(a1, -1), at(a0, -1)],
        [-e2[0], -e2[1], 0],
        [
          [uc, vc],
          [uc - du * Math.cos(a1), vc + du * Math.sin(a1)],
          [uc - du * Math.cos(a0), vc + du * Math.sin(a0)],
        ]
      );
      const am = (a0 + a1) / 2;
      face(
        B,
        [at(a0, -1), at(a1, -1), at(a1, 1), at(a0, 1)],
        [e1[0] * Math.cos(am), e1[1] * Math.cos(am), Math.sin(am)],
        rim
      );
    }
  }
  const gz = (x, y) => {
    const z = KERN.ground(x, y);
    return z === undefined || z === null || !Number.isFinite(z) ? null : z;
  };
  // a bus stop's sign on the carriageway (mapped on the road): onto the pavement, on the side the buses of its direction stop at
  function kerbside(x, y, h) {
    const F = window.FAHRT;
    if (!F || !F.roadAt) return [x, y];
    const r = F.roadAt(x, y, 6);
    if (!r || !r.w || r.w.kind > 5 || r.e < -0.4) return [x, y];
    const side = h[0] * r.dx + h[1] * r.dy >= 0 ? 1 : -1,
      nx = r.dy,
      ny = -r.dx, // right of the road's direction
      qx = x - r.lat * nx,
      qy = y - r.lat * ny,
      d = r.w.hw + 0.6;
    return [qx + side * d * nx, qy + side * d * ny];
  }
  // ---- one round: what is near, the cells for its names, the meshes ----
  function build(o) {
    kit();
    const items = [];
    for (const t of ST.tiles.values()) {
      if (!t.own) continue;
      const [ox, oy] = t.own.o;
      for (const q of t.own.namen || []) {
        const x = ox + q[0] / 10,
          y = oy + q[1] / 10,
          d = Math.hypot(x - o[0], y - o[1]);
        if (d <= R) items.push({ d, x, y, names: [q[2], q[4]], az: [q[3], q[5]] });
      }
      for (const q of t.own.halte || []) {
        const x = ox + q[0] / 10,
          y = oy + q[1] / 10,
          d = Math.hypot(x - o[0], y - o[1]);
        if (d <= R)
          items.push({
            d,
            x,
            y,
            stop: true,
            az: q[2],
            name: String(q[3] || '').replace(/^Suhl,\s*/, ''),
            sh: q[4],
            be: q[5],
          });
      }
    }
    items.sort((a, b) => a.d - b.d);
    const keys = [];
    for (const it of items)
      if (it.stop) {
        if (it.name) keys.push('H|' + it.name);
      } else for (const nm of it.names) if (nm) keys.push('S|' + nm);
    cellsFor([...new Set(keys)]);
    S.near = { stop: null, post: null }; // the nearest of each (for the tests)
    const Bs = buf(),
      Bg = buf(),
      metal = uvP(PATCH.metal),
      white = uvP(PATCH.white),
      dark = uvP(PATCH.dark),
      wood = uvP(PATCH.wood),
      pane = uvP(PATCH.pane),
      n = { posts: 0, plates: 0, stops: 0, shelters: 0, benches: 0 },
      ref = [];
    let missed = 0;
    for (const it of items) {
      if (!it.stop) {
        const z = gz(it.x, it.y);
        if (z === null) {
          missed++;
          continue;
        }
        post(Bs, it.x, it.y, z - 0.25, z + 2.88, 0.03, metal);
        if (!n.posts++) S.near.post = [it.x, it.y, z];
        if (ref.length < 24) ref.push([it.x, it.y, z]);
        // the plates beside the post, the first street on top
        it.names.forEach((nm, j) => {
          const c = nm && K.cells.get('S|' + nm);
          if (!c) return;
          const a = it.az[j] * RAD,
            e1 = [Math.sin(a), Math.cos(a)],
            e2 = [e1[1], -e1[0]],
            L = (PH * c.pw) / CH,
            off = 0.03 + 0.012 + 0.004,
            r = uvCell(c);
          box(
            Bs,
            [it.x + e2[0] * off, it.y + e2[1] * off, z + (j ? 2.47 : 2.73)],
            e1,
            L / 2,
            0.012,
            PH / 2,
            r,
            r,
            white
          );
          n.plates++;
        });
        continue;
      }
      // a bus stop: h the buses' heading, rv its right (away from the road)
      const a = it.az * RAD,
        h = [Math.sin(a), Math.cos(a)],
        rv = [h[1], -h[0]],
        [x, y] = kerbside(it.x, it.y, h),
        z = gz(x, y);
      if (z === null) {
        missed++;
        continue;
      }
      if (!n.stops++) S.near.stop = [x, y, z, it.az, it.name, it.sh];
      if (ref.length < 24) ref.push([x, y, z]);
      post(Bs, x, y, z - 0.25, z + 2.95, 0.035, metal);
      // the H facing the buses that come (its face towards −h), the name below it, reaching away from the road
      disc(Bs, [x - h[0] * 0.047, y - h[1] * 0.047, z + 2.72], rv, 0.21, 0.008);
      const c = it.name && K.cells.get('H|' + it.name);
      if (c) {
        const L = (0.2 * c.pw) / CH,
          r = uvCell(c),
          s = L / 2 - 0.05;
        box(
          Bs,
          [x - h[0] * 0.047 + rv[0] * s, y - h[1] * 0.047 + rv[1] * s, z + 2.38],
          rv,
          L / 2,
          0.008,
          0.1,
          r,
          r,
          white
        );
        n.plates++;
      }
      // the timetable case on the post
      box(
        Bs,
        [x - h[0] * 0.07 + rv[0] * 0.05, y - h[1] * 0.07 + rv[1] * 0.05, z + 1.55],
        rv,
        0.18,
        0.03,
        0.25,
        pane,
        pane,
        metal
      );
      if (it.sh) {
        // the shelter behind the sign, open to the road: four posts, the roof, glass at the back and the ends, a bench inside
        const cx = x + rv[0] * 1.55 - h[0] * 2.4,
          cy = y + rv[1] * 1.55 - h[1] * 2.4,
          zc = gz(cx, cy);
        if (zc !== null) {
          for (const [s1, s2] of [
            [-1, -1],
            [1, -1],
            [-1, 1],
            [1, 1],
          ])
            box(
              Bs,
              [cx + h[0] * 1.55 * s1 + rv[0] * 0.62 * s2, cy + h[1] * 1.55 * s1 + rv[1] * 0.62 * s2, zc + 1.03],
              h,
              0.03,
              0.03,
              1.28,
              dark,
              dark,
              dark
            );
          box(Bs, [cx - rv[0] * 0.05, cy - rv[1] * 0.05, zc + 2.36], h, 1.72, 0.84, 0.05, dark, dark, dark);
          box(Bg, [cx + rv[0] * 0.62, cy + rv[1] * 0.62, zc + 1.2], h, 1.52, 0.006, 0.95, pane, pane, pane);
          for (const s1 of [-1, 1])
            box(
              Bg,
              [cx + h[0] * 1.55 * s1 + rv[0] * 0.15, cy + h[1] * 1.55 * s1 + rv[1] * 0.15, zc + 1.2],
              rv,
              0.47,
              0.006,
              0.95,
              pane,
              pane,
              pane
            );
          box(Bs, [cx + rv[0] * 0.38, cy + rv[1] * 0.38, zc + 0.44], h, 0.9, 0.19, 0.03, wood, wood, wood);
          for (const s1 of [-1, 1])
            box(
              Bs,
              [cx + h[0] * 0.75 * s1 + rv[0] * 0.38, cy + h[1] * 0.75 * s1 + rv[1] * 0.38, zc + 0.08],
              h,
              0.03,
              0.15,
              0.33,
              metal,
              metal,
              metal
            );
          n.shelters++;
        }
      } else if (it.be) {
        // a bench alone beside the sign, its back to the houses
        const cx = x + rv[0] * 1.3 - h[0] * 1.6,
          cy = y + rv[1] * 1.3 - h[1] * 1.6,
          zc = gz(cx, cy);
        if (zc !== null) {
          box(Bs, [cx, cy, zc + 0.44], h, 0.8, 0.2, 0.03, wood, wood, wood);
          box(Bs, [cx + rv[0] * 0.2, cy + rv[1] * 0.2, zc + 0.72], h, 0.8, 0.02, 0.17, wood, wood, wood);
          for (const s1 of [-1, 1])
            box(
              Bs,
              [cx + h[0] * 0.65 * s1, cy + h[1] * 0.65 * s1, zc + 0.08],
              h,
              0.03,
              0.16,
              0.33,
              metal,
              metal,
              metal
            );
          n.benches++;
        }
      }
    }
    const put = (me, B) => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(B.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(B.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(B.uv, 2));
      me.geometry.dispose();
      me.geometry = g;
      me.visible = B.p.length > 0;
    };
    put(K.solid, Bs);
    put(K.glass, Bg);
    S.n = n;
    S.ref = ref;
    S.retry = missed ? 2 : 0; // some ground was not there yet: once more soon
    markDirty(true);
  }
  // the ground under the reference points changed (finer tiles came) → build again
  const late = () =>
    S.ref.some(r => {
      const z = gz(r[0], r[1]);
      return z !== null && Math.abs(z - r[2]) > 0.1;
    });
  S.tick = (dt, o) => {
    const rev = ST.rev();
    S.tz += dt;
    let again = rev !== S.rev || Math.hypot(o[0] - S.at[0], o[1] - S.at[1]) > MOVE;
    if (!again && S.retry > 0 && (S.retry -= dt) <= 0) again = true;
    if (!again && S.tz > 3) {
      S.tz = 0;
      again = late();
    }
    if (!again) return;
    S.rev = rev;
    S.at = [o[0], o[1]];
    S.tz = 0;
    build(o);
  };
  S.leave = () => {
    if (!K) return;
    for (const me of [K.solid, K.glass]) {
      scene.remove(me);
      me.geometry.dispose();
    }
    for (const m of Object.values(K.mats)) m.dispose();
    K.tex.dispose();
    K = null;
    S.rev = -1;
    S.at = [1e9, 1e9];
    S.ref = [];
    S.n = { posts: 0, plates: 0, stops: 0, shelters: 0, benches: 0 };
  };
  S.state = () => Object.assign({ names: K ? K.cells.size : 0, near: S.near }, S.n);
  return S;
}
