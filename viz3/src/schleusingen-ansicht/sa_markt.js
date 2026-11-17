// ===================== feat/schleusingen-ansicht: the Markt of Schleusingen as it is (SAMARKT) =====================
// Falko (17.11.2026 ~17:30): „Markt fertig machen“. Checked against private views from the street (a 360° photo on the Markt, May 2016)
// and the orthophoto (GDI-Th DOP 20 cm, flown 07.04.2024): the town (welt/schleusingen.js) has the fountain, the Rathaus, lamps, one
// bench from OSM and young trees; missing were the cobbles beyond a few metres (the tiles draw setts only up close – from 8 m on the
// Markt was flat grey), the long benches south and east of the fountain, four planters on its diagonals, the seated bronze figure at
// the south-west rim of the basin (a generic seated man, no likeness of anyone) and a litter bin. All in two meshes: the paving – a
// ground piece over the Markt's outline with a canvas texture of irregular natural cobbles in the mixed colours of the photo (grey,
// beige, a few rose and blue-grey stones, dark joints; 4 m repeat, anisotropic, a little above the ground, polygon offset) in the
// material of the town's signs (the same shader program) – and the props in the town's props material. Collisions: KERN.pushOut
// (priority 11, passes on). Built when the town stands, gone with it. ?nosamarkt: as before.
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, ANISO } from '../core/assets.js';
import { VPROPS } from '../world/village_props.js';
import { SCHL } from '../welt/schleusingen.js';
export const SAMARKT = (() => {
  const S = { on: false, state: 'idle', meshes: [], props: [], tris: 0, ms: 0, err: '' };
  S.on = !!SCHL.on && !new URLSearchParams(location.search).has('nosamarkt');
  if (!S.on) return S;
  const lin = c => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)),
    L = (r, g, b) => [lin(r), lin(g), lin(b)];
  // ---- what stands on the Markt (model metres; the orthophoto 2024 at 3 cm, the 360° photo 2016) ----
  const FOUNTAIN = [-1084.7, 1241.9];
  const BENCHES = [
    { a: [-1086.67, 1233.67], b: [-1081.67, 1235.67], n: 3 }, // south of the fountain: three in a row, backs to the basin
    { a: [-1078.0, 1243.5], b: [-1076.33, 1240.17], n: 2 }, // east
  ];
  const PLANTERS = [
    [-1079.83, 1248.83],
    [-1092.83, 1244.17],
    [-1076.0, 1237.73],
    [-1089.17, 1233.17],
  ];
  const FIGURE = { x: -1086.3, y: 1238.2 }; // on the platform at the basin's south-west side, looking away from it
  const BIN = [-1082.0, 1231.2];
  S.spots = { FOUNTAIN, BENCHES, PLANTERS, FIGURE, BIN };
  const solids = []; // collision: { kind: 'c', x, y, r } or { kind: 'b', x, y, hx, hy, c, s }
  // ---- the cobbles: a seamless texture of irregular stones (Voronoi on a jittered grid, wrapped) ----
  function settCanvas(N = 1024, METRES = 4, seed = 7) {
    let st = seed >>> 0;
    const rnd = () => {
      st = (st + 0x6d2b79f5) >>> 0;
      let t = st;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    const G = Math.round(METRES / 0.13), // stones of about 13 cm
      cs = N / G,
      cx = new Float32Array(G * G),
      cy = new Float32Array(G * G),
      cr = new Float32Array(G * G),
      cg = new Float32Array(G * G),
      cb = new Float32Array(G * G);
    // the Markt's stones (photo 2016): grey-brown, beige, light beige, a few rose, blue-grey and dark ones
    const PALETTE = [
      [0.56, 0.53, 0.49, 0.22],
      [0.64, 0.6, 0.55, 0.2],
      [0.72, 0.67, 0.6, 0.14],
      [0.6, 0.53, 0.5, 0.12],
      [0.5, 0.48, 0.47, 0.12],
      [0.55, 0.57, 0.6, 0.08],
      [0.43, 0.41, 0.39, 0.07],
      [0.68, 0.58, 0.52, 0.05],
    ];
    // patches over a metre or so (periodic): worn lighter paths, darker damp spots – detail that survives the mipmaps far off
    const P = [];
    for (let k = 0; k < 5; k++)
      P.push([1 + Math.floor(rnd() * 3), 1 + Math.floor(rnd() * 3), rnd() * 6.28, rnd() * 6.28]);
    const patch = (u, v) => {
      let s = 0;
      for (const [fu, fv, pu, pv] of P) s += Math.sin(u * fu * 6.2832 + pu) * Math.sin(v * fv * 6.2832 + pv);
      return s / P.length;
    };
    for (let j = 0; j < G; j++)
      for (let i = 0; i < G; i++) {
        const k = j * G + i;
        cx[k] = (i + 0.18 + 0.64 * rnd()) * cs;
        cy[k] = (j + 0.18 + 0.64 * rnd()) * cs;
        let q = rnd(),
          c = PALETTE[0];
        for (const p of PALETTE) {
          if (q < p[3]) {
            c = p;
            break;
          }
          q -= p[3];
        }
        const f = (0.86 + 0.28 * rnd()) * (1 + 0.16 * patch(cx[k] / N, cy[k] / N));
        cr[k] = c[0] * f;
        cg[k] = c[1] * f;
        cb[k] = c[2] * f;
      }
    const cv = document.createElement('canvas');
    cv.width = cv.height = N;
    const g = cv.getContext('2d'),
      img = g.createImageData(N, N),
      D = img.data,
      jw = cs * 0.11;
    for (let y = 0; y < N; y++) {
      const gj = Math.floor(y / cs);
      for (let x = 0; x < N; x++) {
        const gi = Math.floor(x / cs);
        let d1 = 1e9,
          d2 = 1e9,
          k1 = 0;
        for (let dj = -1; dj <= 1; dj++)
          for (let di = -1; di <= 1; di++) {
            let ii = gi + di,
              jj = gj + dj,
              ox = 0,
              oy = 0;
            if (ii < 0) {
              ii += G;
              ox = -N;
            } else if (ii >= G) {
              ii -= G;
              ox = N;
            }
            if (jj < 0) {
              jj += G;
              oy = -N;
            } else if (jj >= G) {
              jj -= G;
              oy = N;
            }
            const k = jj * G + ii,
              dx = x - (cx[k] + ox),
              dy = y - (cy[k] + oy),
              d = dx * dx + dy * dy;
            if (d < d1) {
              d2 = d1;
              d1 = d;
              k1 = k;
            } else if (d < d2) d2 = d;
          }
        const e = Math.sqrt(d2) - Math.sqrt(d1), // distance to the joint (×2)
          r1 = Math.sqrt(d1) / (cs * 0.62),
          dome = 1.06 - 0.22 * r1 * r1, // the rounded top catches the light
          grain = 0.93 + (0.14 * ((((x * 73856093) ^ (y * 19349663)) >>> 0) % 1000)) / 1000;
        let r = cr[k1] * dome * grain,
          gg = cg[k1] * dome * grain,
          b = cb[k1] * dome * grain;
        const jt = Math.max(0, Math.min(1, (jw - e) / (jw * 0.6))); // the joint: sand and dirt, darker
        r = r * (1 - jt) + 0.36 * jt;
        gg = gg * (1 - jt) + 0.33 * jt;
        b = b * (1 - jt) + 0.29 * jt;
        const o = (y * N + x) * 4;
        D[o] = Math.min(255, r * 255);
        D[o + 1] = Math.min(255, gg * 255);
        D[o + 2] = Math.min(255, b * 255);
        D[o + 3] = 255;
      }
    }
    g.putImageData(img, 0, 0);
    return cv;
  }
  S.settCanvas = settCanvas;
  // ---- the paving: a ground piece over the Markt's outline, 3 cm above the ground, triangles of at most 1.6 m ----
  function paving(poly) {
    const pts = [];
    for (let k = 0; k < poly.length; k += 2) pts.push(new THREE.Vector2(poly[k], poly[k + 1]));
    if (THREE.ShapeUtils.isClockWise(pts)) pts.reverse();
    const faces = THREE.ShapeUtils.triangulateShape(pts, []),
      pos = [],
      uv = [],
      nrm = [];
    const z = (x, y) => KERN.ground(x, y) + 0.03;
    const emit = (a, b, c) => {
      for (const p of [a, b, c]) {
        pos.push(p[0], z(p[0], p[1]), -p[1]);
        uv.push(p[0] / 4, p[1] / 4);
        nrm.push(0, 1, 0);
      }
    };
    const split = (a, b, c, depth) => {
      const l = Math.max(
        Math.hypot(a[0] - b[0], a[1] - b[1]),
        Math.hypot(b[0] - c[0], b[1] - c[1]),
        Math.hypot(c[0] - a[0], c[1] - a[1])
      );
      if (l <= 1.6 || depth > 9) return emit(a, b, c);
      const m = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2],
        ab = m(a, b),
        bc = m(b, c),
        ca = m(c, a);
      split(a, ab, ca, depth + 1);
      split(ab, b, bc, depth + 1);
      split(ca, bc, c, depth + 1);
      split(ab, bc, ca, depth + 1);
    };
    for (const [i, j, k] of faces) split([pts[i].x, pts[i].y], [pts[j].x, pts[j].y], [pts[k].x, pts[k].y], 0);
    const gg = new THREE.BufferGeometry();
    gg.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    gg.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
    gg.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    gg.computeBoundingSphere();
    const tex = new THREE.CanvasTexture(settCanvas());
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.anisotropy = ANISO;
    // the parameters of the town's signs (welt/schleusingen.js signs()): the same shader program; polygon offset is render state
    const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.7, metalness: 0 });
    mat.polygonOffset = true;
    mat.polygonOffsetFactor = -2;
    mat.polygonOffsetUnits = -2;
    const m = add(new THREE.Mesh(gg, mat), 'pflaster');
    m.userData.own = true;
    m.userData.tex = tex;
    return m;
  }
  // ---- the props ----
  const WOOD = L(0.47, 0.33, 0.24),
    WOOD2 = L(0.4, 0.28, 0.2),
    STEEL = L(0.16, 0.17, 0.18),
    CONCRETE = L(0.6, 0.6, 0.58),
    SOIL = L(0.2, 0.15, 0.11),
    LEAF = L(0.22, 0.36, 0.16),
    FLOWERS = [L(0.78, 0.12, 0.14), L(0.86, 0.45, 0.62), L(0.9, 0.78, 0.2), L(0.5, 0.3, 0.72), L(0.95, 0.95, 0.9)],
    BRONZE = L(0.33, 0.29, 0.22),
    BRONZE2 = L(0.27, 0.25, 0.19),
    SAND = L(0.7, 0.64, 0.55),
    BIN_C = L(0.22, 0.23, 0.24);
  const gz = (x, y) => KERN.ground(x, y);
  const boxSolid = (x, y, sx, sy, rot) =>
    solids.push({ kind: 'b', x, y, hx: sx / 2, hy: sy / 2, c: Math.cos(rot), s: Math.sin(rot) });
  // a bench: steel frames, a seat of five slats, a back of three – its back towards `back` (the fountain)
  function bench(K, cx, cy, ux, uy, len, back) {
    let nx = -uy,
      ny = ux; // the front: away from the fountain
    if (nx * (back[0] - cx) + ny * (back[1] - cy) > 0) {
      nx = -nx;
      ny = -ny;
    }
    const rot = Math.atan2(uy, ux),
      z = gz(cx, cy);
    for (let k = 0; k < 5; k++) {
      const w = -0.18 + k * 0.09;
      K.box(cx + nx * w, cy + ny * w, z + 0.42, len, 0.075, 0.035, rot, k % 2 ? WOOD2 : WOOD);
    }
    for (let k = 0; k < 3; k++) {
      const w = -0.27,
        zz = z + 0.56 + k * 0.11;
      K.box(cx + nx * w, cy + ny * w, zz, len, 0.03, 0.08, rot, k % 2 ? WOOD2 : WOOD);
    }
    for (const t of [-len / 2 + 0.18, len / 2 - 0.18]) {
      const px = cx + ux * t,
        py = cy + uy * t;
      K.box(px, py, z, 0.05, 0.05, 0.42, rot, STEEL);
      K.box(px + nx * -0.02, py + ny * -0.02, z + 0.38, 0.05, 0.48, 0.04, rot, STEEL);
      K.box(px + nx * -0.27, py + ny * -0.27, z + 0.42, 0.04, 0.04, 0.48, rot, STEEL);
    }
    boxSolid(cx + nx * -0.04, cy + ny * -0.04, len, 0.55, rot);
  }
  function planter(K, x, y, rot) {
    const z = gz(x, y),
      s = 1.3;
    K.box(x, y, z, s, s, 0.5, rot, CONCRETE);
    K.box(x, y, z + 0.5, s - 0.12, s - 0.12, 0.015, rot, SOIL);
    const c = Math.cos(rot),
      sn = Math.sin(rot);
    let h = Math.abs(Math.sin(x * 12.9898 + y * 78.233)) * 43758.5453;
    const rnd = () => {
      h = (h * 9301 + 49297) % 233280;
      return h / 233280; // 0 … 1
    };
    for (let k = 0; k < 22; k++) {
      const u = (rnd() - 0.5) * (s - 0.25),
        v = (rnd() - 0.5) * (s - 0.25),
        px = x + u * c - v * sn,
        py = y + u * sn + v * c;
      if (k % 3 === 0) K.box(px, py, z + 0.5, 0.16, 0.16, 0.14 + rnd() * 0.08, rot + rnd(), LEAF);
      else K.ball(px, py, z + 0.6 + rnd() * 0.08, 0.06 + rnd() * 0.04, FLOWERS[Math.floor(rnd() * FLOWERS.length)], 5);
    }
    boxSolid(x, y, s, s, rot);
  }
  // a generic seated figure in bronze on a sandstone block, looking along bearing az (degrees, clockwise from north)
  function figure(K, x, y, az) {
    const a = (az * Math.PI) / 180,
      fx = Math.sin(a),
      fy = Math.cos(a),
      lx = -Math.cos(a),
      ly = Math.sin(a),
      rot = Math.PI / 2 - a,
      z = gz(x, y),
      P = (u, v) => [x + fx * u + lx * v, y + fy * u + ly * v];
    let p = P(-0.12, 0);
    K.box(p[0], p[1], z, 0.5, 0.95, 0.44, rot, SAND, true); // the block he sits on
    for (const v of [-0.1, 0.1]) {
      p = P(0.12, v);
      K.box(p[0], p[1], z + 0.44, 0.44, 0.15, 0.15, rot, BRONZE); // thighs
      p = P(0.36, v);
      K.box(p[0], p[1], z + 0.06, 0.13, 0.13, 0.52, rot, BRONZE2); // shins
      p = P(0.42, v);
      K.box(p[0], p[1], z, 0.27, 0.11, 0.08, rot, BRONZE2); // shoes
    }
    p = P(-0.1, 0);
    K.box(p[0], p[1], z + 0.44, 0.24, 0.36, 0.3, rot, BRONZE); // hips and the coat
    p = P(-0.07, 0);
    K.box(p[0], p[1], z + 0.74, 0.22, 0.38, 0.32, rot, BRONZE); // the chest, a little forward
    p = P(-0.05, 0);
    K.cyl(p[0], p[1], z + 1.06, z + 1.13, 0.06, 0.055, 6, BRONZE2); // neck
    p = P(-0.03, 0);
    K.ball(p[0], p[1], z + 1.23, 0.11, BRONZE, 8); // head
    K.cyl(p[0], p[1], z + 1.3, z + 1.36, 0.135, 0.12, 10, BRONZE2, true); // a cap
    for (const v of [-0.23, 0.23]) {
      p = P(-0.06, v);
      K.box(p[0], p[1], z + 0.8, 0.1, 0.09, 0.28, rot, BRONZE); // upper arms
      p = P(0.12, v * 0.75);
      K.box(p[0], p[1], z + 0.74, 0.34, 0.08, 0.08, rot, BRONZE); // forearms on the thighs
      p = P(0.31, v * 0.55);
      K.ball(p[0], p[1], z + 0.78, 0.05, BRONZE2, 5); // hands at the knees
    }
    solids.push({ kind: 'c', x: P(0.05, 0)[0], y: P(0.05, 0)[1], r: 0.55 });
  }
  function bin(K, x, y) {
    const z = gz(x, y);
    K.cyl(x, y, z, z + 0.88, 0.24, 0.24, 12, BIN_C, false);
    K.lathe(
      x,
      y,
      z + 0.88,
      [
        [0.26, 0],
        [0.26, 0.04],
        [0.18, 0.12],
        [0, 0.15],
      ],
      12,
      BIN_C
    );
    solids.push({ kind: 'c', x, y, r: 0.28 });
  }
  function props() {
    const K = VPROPS.kit && VPROPS.kit();
    if (!K) return null;
    for (const B of BENCHES) {
      const dx = B.b[0] - B.a[0],
        dy = B.b[1] - B.a[1],
        Lb = Math.hypot(dx, dy),
        ux = dx / Lb,
        uy = dy / Lb,
        seg = Lb / B.n;
      for (let k = 0; k < B.n; k++) {
        const t = (k + 0.5) * seg;
        bench(K, B.a[0] + ux * t, B.a[1] + uy * t, ux, uy, seg - 0.12, FOUNTAIN);
      }
    }
    const rotP = Math.atan2(BENCHES[0].b[1] - BENCHES[0].a[1], BENCHES[0].b[0] - BENCHES[0].a[0]);
    for (const [x, y] of PLANTERS) planter(K, x, y, rotP);
    const az = (Math.atan2(FIGURE.x - FOUNTAIN[0], FIGURE.y - FOUNTAIN[1]) * 180) / Math.PI;
    figure(K, FIGURE.x, FIGURE.y, az);
    bin(K, BIN[0], BIN[1]);
    const town = SCHL.meshes.find(m => m.name === 'schleusingen props');
    const mat =
      (town && town.material) ||
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, envMapIntensity: 0.7 });
    const m = add(new THREE.Mesh(K.geo(), mat), 'ausstattung');
    if (!town) m.userData.own = true;
    return m;
  }
  function add(m, name) {
    m.name = 'markt ' + name;
    m.userData.noMerge = true;
    m.castShadow = false;
    m.receiveShadow = false;
    scene.add(m);
    S.meshes.push(m);
    return m;
  }
  // ---- collisions: out of the props (priority 11 – then the town's walls still answer) ----
  KERN.provide(
    'pushOut',
    (p, r) => {
      if (S.state !== 'ready' || Math.abs(p[0] - FOUNTAIN[0]) > 25 || Math.abs(p[1] - FOUNTAIN[1]) > 25)
        return undefined;
      for (const o of solids) {
        if (o.kind === 'c') {
          const dx = p[0] - o.x,
            dy = p[1] - o.y,
            d = Math.hypot(dx, dy),
            R = o.r + r;
          if (d < R && d > 1e-6) {
            p[0] = o.x + (dx / d) * R;
            p[1] = o.y + (dy / d) * R;
          }
        } else {
          // into the box's frame: outside – out along the way from the nearest point of the box; inside – out over the nearest side
          const dx = p[0] - o.x,
            dy = p[1] - o.y,
            u = dx * o.c + dy * o.s,
            v = -dx * o.s + dy * o.c;
          if (Math.abs(u) >= o.hx + r || Math.abs(v) >= o.hy + r) continue;
          const qu = Math.max(-o.hx, Math.min(o.hx, u)),
            qv = Math.max(-o.hy, Math.min(o.hy, v)),
            d = Math.hypot(u - qu, v - qv);
          let nu = u,
            nv = v;
          if (d > 1e-6) {
            if (d >= r) continue;
            nu = qu + ((u - qu) / d) * r;
            nv = qv + ((v - qv) / d) * r;
          } else if (o.hx - Math.abs(u) < o.hy - Math.abs(v)) nu = (Math.sign(u) || 1) * (o.hx + r);
          else nv = (Math.sign(v) || 1) * (o.hy + r);
          p[0] = o.x + nu * o.c - nv * o.s;
          p[1] = o.y + nu * o.s + nv * o.c;
        }
      }
      return undefined;
    },
    11
  );
  function build() {
    const t0 = performance.now();
    solids.length = 0;
    const poly = SCHL.data && SCHL.data.marktplatz;
    try {
      if (poly && poly.length >= 6) paving(poly);
      props();
    } catch (e) {
      S.err = String(e);
      console.warn('samarkt', e);
    }
    S.tris = S.meshes.reduce((n, m) => n + m.geometry.attributes.position.count / 3, 0);
    S.ms = Math.round(performance.now() - t0);
    S.state = 'ready';
    markDirty(true);
  }
  function dispose() {
    for (const m of S.meshes) {
      scene.remove(m);
      m.geometry.dispose();
      if (m.userData.own) m.material.dispose();
      if (m.userData.tex) m.userData.tex.dispose();
    }
    S.meshes.length = 0;
    solids.length = 0;
    S.state = 'idle';
    markDirty(true);
  }
  S.dispose = dispose;
  // built when the town stands (it builds within 950 m), gone with it
  KERN.zone({
    id: 'samarkt',
    x: FOUNTAIN[0],
    y: FOUNTAIN[1],
    near: 900,
    far: 1350,
    build: async () => {
      S.state = 'waiting';
      await KERN.until(() => SCHL.state === 'ready' || SCHL.state === 'error', 900);
      if (SCHL.state !== 'ready') throw new Error('the town did not stand');
      if (!S.meshes.length) build();
    },
    drop: () => {
      if (S.meshes.length) dispose();
    },
    tick: () => {
      if (S.meshes.length && SCHL.state !== 'ready') dispose(); // the town went: so do the Markt's things
    },
  });
  S.status = () => ({
    on: S.on,
    state: S.state,
    meshes: S.meshes.map(m => m.name),
    tris: S.tris,
    solids: solids.length,
    ms: S.ms,
    err: S.err,
  });
  return S;
})();
window.SAMARKT = SAMARKT;
