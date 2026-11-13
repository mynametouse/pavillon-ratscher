// ===================== feat/zeitreise-welt: what the futures build – heating house, trench, oil truck, wind turbine, logging, signs (ZKDINGE) =====================
// Sites are assumptions (Annahme), chosen on the real map (docs/features/zeitreise-welt.md): the heating house at the south-east edge of the
// village by the lane to the bypass (a free spot next to the farmyards, nearest to (392, −262)); the heat network's trench from there along
// the village street to the Anger; the wind turbine on the forested ridge south of the village (230, −1290), ~1 km from the last houses,
// on a beetle clearing; the first big clearing with the planting at (120, −980) on the slope south of the village (both seeded as early
// beetle nests in the slope field, zk_zeitwelt_hang.js). Sizes: a small village heating plant (wood chips, ~500 kW) in a timber hall
// 14 × 9 m with a chip bunker and a 14 m steel chimney; a modern turbine with hub ~160 m and rotor ~160 m (5–7 MW class), tower with the
// red band, blades with red tips (German marking rules for turbines over 150 m); harvester, forwarder, log piles (Polter) by the forest
// road, a timber truck through the village.
// Built from the kit (zk_zeitwelt_kit.js): one geometry per part, instanced, per world on layer 0 / 21 / 22.
import * as THREE from 'three';
import { cam, scene } from '../core/head.js';
import { warmUp } from '../render/render.js';
import { ZKKIT as K } from './zk_zeitwelt_kit.js';
import { ZKHANG } from './zk_zeitwelt_hang.js';
import { TREES, treeLeafLevels } from '../garden/trees.js';

export const ZKDINGE = (() => {
  const G = w => window[w];
  const C = K.col;
  const PAL = {
    larch: C(0x7a6650),
    larchDk: C(0x5e4e3d),
    roof: C(0x3b3e42),
    concrete: C(0x8f8c86),
    steel: C(0xa4a7aa),
    steelDk: C(0x55585b),
    chips: C(0xb59a68),
    soil: C(0x5e4a38),
    soilDk: C(0x2e241b),
    red: C(0xb3261e),
    white: C(0xe9e9e6),
    yellow: C(0xd9a521),
    tyre: C(0x1e1e1f),
    glass: C(0x20262b),
    pipe: C(0x2b2d2f),
    asphalt: C(0x2c2e31),
    gravel: C(0xa39a8a),
    tower: C(0xe4e6e6),
    olive: C(0x5b6b45),
    bark: C(0x5b4636),
    wood: C(0xc8a46e),
    grey: C(0x8d8a84),
    rust: C(0x8b4a2b),
    kite: C(0x9a4e2c),
    dark: C(0x2a2a2a),
    silver: C(0xb8bcc0),
    guard: C(0xb9c4b0),
    young: C(0x4f7a32),
    birch: C(0x7d9a45),
    fir: C(0x2f4f2a),
  };
  const S = { sites: null, err: null };
  // ---------- the sites (computed once from the village data; assumptions, see the top) ----------
  function sites() {
    if (S.sites) return S.sites;
    const st = {};
    // heating house: a free spot near the nominal site, its long side along the nearest village way
    const lanes = K.ways(['street', 'lane']);
    const [hx, hy] = K.freeSpot(392, -262, 11, 70);
    const nw = K.nearestOn(lanes, hx, hy);
    let ha = 0;
    if (nw) {
      const p = nw.w.p,
        i = nw.i * 2;
      ha = Math.atan2(p[i + 3] - p[i + 1], p[i + 2] - p[i]);
    }
    st.heiz = { x: hx, y: hy, a: ha, road: nw ? [nw.x, nw.y] : [hx, hy - 12] };
    // the camera before the heating house: 24 m from it towards the lane, a little to the side (zk_zeitwelt.js place 'heizhaus')
    {
      const dx = st.heiz.road[0] - hx,
        dy = st.heiz.road[1] - hy,
        l = Math.hypot(dx, dy) || 1;
      st.heizCam = [
        hx + (dx / l) * 24 + (hy - st.heiz.road[1]) * 0.25,
        hy + (dy / l) * 24 - (hx - st.heiz.road[0]) * 0.25,
      ];
    }
    // the trench: from the way by the heating house along the village streets to the school by the Anger
    const streets = K.ways(['street', 'lane']);
    const A = K.nearestOn(streets, st.heiz.road[0], st.heiz.road[1]);
    const pts = [];
    if (A) {
      // walk: the way at the heating house to its end nearest the Anger, then the street that reaches the Anger
      const w1 = A.w,
        e0 = [w1.p[0], w1.p[1]],
        e1 = [w1.p[w1.p.length - 2], w1.p[w1.p.length - 1]],
        tgt = Math.hypot(e0[0] - 236, e0[1] + 121) < Math.hypot(e1[0] - 236, e1[1] + 121) ? e0 : e1;
      pts.push(...K.wayPath(w1, A.x, A.y, tgt[0], tgt[1]));
      const B = K.nearestOn(
        streets.filter(w => w !== w1),
        tgt[0],
        tgt[1]
      );
      if (B && B.d < 12) pts.push(...K.wayPath(B.w, B.x, B.y, 236, -121).slice(1));
    }
    st.trench = pts.length > 1 ? K.resample(pts, 2) : [];
    // the wind turbine and the clearing (seeded beetle nests in the slope field)
    st.wind = { x: 230, y: -1290, yaw: (240 * Math.PI) / 180 };
    // the camera on the clearing below it, 255 m to the north: no broadleaf crown of the canopy model between it and the rotor
    st.windCam = [230, -1035];
    const tr = K.nearestOn(K.ways(['track']), st.wind.x, st.wind.y);
    st.windRoad = tr ? [tr.x, tr.y] : [st.wind.x - 80, st.wind.y + 10];
    st.kahl = { x: 120, y: -980 };
    const tk = K.nearestOn(K.ways(['track']), st.kahl.x, st.kahl.y);
    st.polter = tk ? [tk.x, tk.y, tk.w] : [st.kahl.x + 60, st.kahl.y - 30, null];
    // the oil truck: on the street by a house near the Anger (seen from the Anger and the street)
    const oz = K.nearestOn(streets, 205, -102);
    st.oil = oz ? { x: oz.x, y: oz.y, a: wayAngle(oz) } : { x: 205, y: -102, a: 0 };
    // the timber truck's way through the village: the trench's streets, then on to the west (the street to the garden)
    st.truck = st.trench.length ? st.trench.map(p => [p[0], p[1]]) : [];
    S.sites = st;
    return st;
  }
  const wayAngle = n => {
    const p = n.w.p,
      i = n.i * 2;
    return Math.atan2(p[i + 3] - p[i + 1], p[i + 2] - p[i]);
  };
  // ---------- builders ----------
  function heizhaus(d) {
    const s = sites().heiz,
      g = new THREE.Group(),
      z = K.gnd(s.x, s.y) - 0.15,
      a = s.a,
      c = Math.cos(a),
      sn = Math.sin(a),
      at = (u, v) => [s.x + u * c - v * sn, s.y + u * sn + v * c];
    const B = K.GB();
    // plinth, the timber hall, its roof, a sectional gate and a window band on the side to the lane
    B.box(s.x, s.y, z, 14.4, 9.4, 0.5, a, PAL.concrete);
    B.gable(s.x, s.y, z + 0.5, 14, 9, 4.9, 7.4, a, PAL.larch, PAL.roof, 0.45);
    const [gx, gy] = at(-3, -4.53);
    B.panel(gx, gy, z + 2.4, 3.8, 3.8, a, PAL.steelDk);
    for (let i = 0; i < 4; i++) {
      const [wx, wy] = at(1.5 + i * 1.6, -4.53);
      B.panel(wx, wy, z + 3.9, 1.2, 0.7, a, PAL.glass);
    }
    // vertical board joints (darker lines) on the long walls
    for (let u = -6.5; u <= 6.5; u += 0.9) {
      for (const v of [-4.52, 4.52]) {
        const [bx, by] = at(u, v);
        B.box(bx, by, z + 0.5, 0.06, 0.04, 4.9, a, PAL.larchDk);
      }
    }
    // the chip bunker: concrete walls (U), open towards the yard, under a lean-to on steel posts
    const [kx, ky] = at(11.2, 0.5);
    B.box(...at(11.2, 4.4), z, 8, 0.4, 3.2, a, PAL.concrete);
    B.box(...at(11.2, -3.4), z, 8, 0.4, 3.2, a, PAL.concrete);
    B.box(...at(15, 0.5), z, 0.4, 7.8, 3.2, a, PAL.concrete);
    for (const [u, v] of [
      [7.4, 4.4],
      [15, 4.4],
      [7.4, -3.4],
      [15, -3.4],
    ])
      B.box(...at(u, v), z, 0.2, 0.2, 6.2, a, PAL.steel);
    B.box(kx, ky, z + 6.2, 8.6, 8.6, 0.25, a, PAL.roof);
    // the chimney: steel, guyed to the wall, 14 m
    const [cx, cy] = at(-8.2, 2);
    B.cyl(cx, cy, z, 0.42, 0.34, 14.2, 12, PAL.steel, PAL.dark);
    B.cyl(cx, cy, z + 13.6, 0.4, 0.4, 0.6, 12, PAL.dark);
    g.add(K.mesh(B, K.mats().kit, 'zeitreise heizhaus'));
    // the chip pile in the bunker and spilling out (scaled by d.chips in update)
    const P = K.GB();
    const N = 9;
    for (let i = 0; i < N; i++) {
      const u = (i / (N - 1) - 0.5) * 6,
        r = 2.4 + 0.6 * Math.cos(i),
        h = 2.6 - Math.abs(u) * 0.12;
      const [px, py] = at(11.4 + u * 0.15, 0.4 + u * 0.55);
      P.cyl(px, py, 0, r, 0.25, h, 10, PAL.chips);
    }
    const pile = K.mesh(P, K.mats().kit, 'zeitreise hackschnitzel');
    pile.position.set(0, z, 0);
    pile.userData.pile = true;
    g.add(pile);
    update(g, d);
    return g;
    function update(o, dd) {
      const k = Math.max(0.05, Math.min(1, dd.chips || 0));
      o.traverse(m => {
        if (m.userData.pile) {
          m.scale.set(1, Math.max(0.08, k), 1);
          m.visible = (dd.chips || 0) > 0.02;
        }
      });
    }
  }
  function heizUpdate(o, d) {
    let done = false;
    o.traverse(m => {
      if (m.userData.pile) {
        m.scale.set(1, Math.max(0.08, Math.min(1, d.chips || 0)), 1);
        m.visible = (d.chips || 0) > 0.02;
        done = true;
      }
    });
    return done;
  }
  // the trench (heatNet 1: open in the stretch before the Anger, an excavator at its head; behind it the patched strip) or the patched
  // strip along the whole way (heatNet 2) with the house connections
  function trench(d) {
    const g = new THREE.Group(),
      P = sites().trench;
    if (P.length < 2) return g;
    const L = P[P.length - 1][2],
      z = (x, y) => K.gnd(x, y);
    // the construction: the last ~150 m before the Anger lie open (seen from the street, zk_zeitwelt.js place-free: the test looks from
    // 10 m before it), the excavator 40 m in, the pipe sections at the start; behind it the trench is closed again (patched)
    const open0 = d.stage === 1 ? Math.max(0, L - 170) : L + 1,
      open1 = d.stage === 1 ? L - 20 : L + 1;
    const D = K.GB(true);
    // the patched strip (fresh asphalt, a shade darker and bluer) where the trench is closed again
    const closed = P.filter(p => p[2] <= open0 + 0.5);
    if (closed.length > 1)
      K.strip(
        D,
        closed,
        0.62,
        0.62,
        (x, y) => z(x, y) + 0.015,
        () => [0.05, 0.052, 0.056, 0.97]
      );
    if (d.stage === 2)
      for (let i = 6; i < P.length - 2; i += 13) {
        // a house connection every ~26 m: a short patched cross strip to the side
        const [ax, ay] = P[i],
          [bx, by] = P[i + 1],
          l = Math.hypot(bx - ax, by - ay) || 1,
          nx = -(by - ay) / l,
          ny = (bx - ax) / l,
          sd = K.hash(i * 31) < 0.5 ? 1 : -1;
        K.strip(
          D,
          [
            [ax, ay, 0],
            [ax + nx * 4.2 * sd, ay + ny * 4.2 * sd, 4.2],
          ],
          0.45,
          0.45,
          (x, y) => z(x, y) + 0.016,
          () => [0.052, 0.054, 0.058, 0.97]
        );
      }
    g.add(K.inst(D.geo(), K.mats().decal, 1, 'zeitreise flicken'));
    if (d.stage === 1) {
      const B = K.GB(),
        open = P.filter(p => p[2] >= open0 && p[2] <= open1);
      // the open trench: dark depth inside soil edges, a heap of the dug soil on one side, barriers on the other
      K.strip(
        B,
        open,
        0.55,
        0.55,
        (x, y) => z(x, y) + 0.02,
        () => PAL.soil
      );
      K.strip(
        B,
        open,
        0.38,
        0.38,
        (x, y) => z(x, y) + 0.03,
        () => PAL.soilDk
      );
      // the bedding sand and the two pipes (flow and return) lying in the trench, seen from the street as a pair of black lines
      K.strip(
        B,
        open,
        0.3,
        0.3,
        (x, y) => z(x, y) + 0.035,
        () => C(0xc9b47a)
      );
      for (const v of [-0.13, 0.13]) {
        for (let i = 0; i + 4 < open.length; i += 4) {
          const [ax, ay] = open[i],
            [bx, by] = open[i + 4],
            l = Math.hypot(bx - ax, by - ay) || 1,
            nx = -(by - ay) / l,
            ny = (bx - ax) / l;
          B.tube(
            [ax + nx * v, ay + ny * v, z(ax, ay) + 0.1],
            [bx + nx * v, by + ny * v, z(bx, by) + 0.1],
            0.09,
            6,
            PAL.pipe
          );
        }
      }
      for (let i = 0; i + 1 < open.length; i += 2) {
        const [ax, ay] = open[i],
          [bx, by] = open[Math.min(open.length - 1, i + 2)],
          l = Math.hypot(bx - ax, by - ay) || 1,
          nx = -(by - ay) / l,
          ny = (bx - ax) / l,
          an = Math.atan2(by - ay, bx - ax);
        // the heap: a long low ridge 1.3 m beside the trench
        B.box(
          ax + nx * 1.3,
          ay + ny * 1.3,
          z(ax, ay) - 0.1,
          l + 0.3,
          1.1,
          0.55 + 0.15 * K.hash(i),
          an,
          PAL.soil,
          PAL.soil
        );
        B.box(ax + nx * 1.3, ay + ny * 1.3, z(ax, ay) + 0.4, l * 0.9, 0.55, 0.3, an, PAL.soil, PAL.soil);
        // barrier boards on feet, red and white, every 4 m on the other side
        if (i % 2 === 0) {
          const bx0 = ax - nx * 0.95,
            by0 = ay - ny * 0.95,
            zz = z(bx0, by0);
          for (const o of [-0.85, 0.85]) {
            B.box(bx0 + Math.cos(an) * o, by0 + Math.sin(an) * o, zz, 0.06, 0.06, 1.0, an, PAL.steel);
            B.box(bx0 + Math.cos(an) * o, by0 + Math.sin(an) * o, zz, 0.5, 0.25, 0.08, an, PAL.dark);
          }
          for (let k = 0; k < 5; k++) {
            const u = -0.8 + 0.32 * k + 0.16;
            B.box(
              bx0 + Math.cos(an) * u,
              by0 + Math.sin(an) * u,
              zz + 0.72,
              0.32,
              0.04,
              0.22,
              an,
              k % 2 ? PAL.white : PAL.red
            );
          }
        }
      }
      // pre-insulated pipes (black jacket) stacked on timbers near the open stretch, an excavator at its head
      if (open.length > 4) {
        const [px, py] = open[2],
          [qx, qy] = open[4],
          an = Math.atan2(qy - py, qx - px),
          nx = -Math.sin(an),
          ny = Math.cos(an),
          ox = px - nx * 3.2,
          oy = py - ny * 3.2,
          zz = z(ox, oy);
        for (const u of [-4, 4]) B.box(ox + Math.cos(an) * u, oy + Math.sin(an) * u, zz, 0.15, 1.6, 0.12, an, PAL.wood);
        for (let k = 0; k < 4; k++) {
          const v = -0.36 + 0.24 * (k % 3),
            h = zz + 0.24 + (k === 3 ? 0.22 : 0);
          const c0 = [ox + Math.cos(an) * -6 + nx * v, oy + Math.sin(an) * -6 + ny * v, h],
            c1 = [ox + Math.cos(an) * 6 + nx * v, oy + Math.sin(an) * 6 + ny * v, h];
          B.tube(c0, c1, 0.12, 10, PAL.pipe, 0.12, PAL.steel);
        }
        // the excavator 40 m along the open stretch, beside the trench, its bucket in it
        const ie = Math.min(open.length - 2, 20),
          [ex, ey] = open[ie],
          [fx, fy] = open[ie + 1],
          ea = Math.atan2(fy - ey, fx - ex),
          enx = -Math.sin(ea),
          eny = Math.cos(ea);
        excavator(B, ex - enx * 3.4, ey - eny * 3.4, z(ex, ey), ea + Math.PI / 2);
      }
      g.add(K.mesh(B, K.mats().kit, 'zeitreise graben'));
    }
    return g;
  }
  function excavator(B, x, y, z, a) {
    const c = Math.cos(a),
      s = Math.sin(a),
      at = (u, v) => [x + u * c - v * s, y + u * s + v * c];
    for (const v of [-1.1, 1.1]) B.box(...at(0, v), z, 3.6, 0.6, 0.75, a, PAL.tyre);
    B.box(x, y, z + 0.75, 3.0, 2.5, 0.95, a, PAL.yellow);
    B.box(...at(-1.35, 0), z + 0.75, 0.7, 2.4, 1.0, a, PAL.dark);
    B.box(...at(0.35, 0.6), z + 1.7, 1.2, 1.0, 1.55, a, PAL.glass, PAL.yellow);
    // boom and stick reaching into the trench, the bucket
    B.tube([...at(0.9, -0.4), z + 1.6], [...at(3.6, -0.4), z + 3.1], 0.2, 6, PAL.yellow);
    B.tube([...at(3.6, -0.4), z + 3.1], [...at(5.0, -0.4), z + 0.4], 0.16, 6, PAL.yellow);
    B.box(...at(5.1, -0.4), z - 0.2, 0.7, 0.9, 0.6, a, PAL.dark);
  }
  function oiltruck() {
    const s = sites().oil,
      B = K.GB(),
      a = s.a,
      c = Math.cos(a),
      sn = Math.sin(a),
      // on the right side of the street, 1.8 m from its centre
      x = s.x + sn * 1.8,
      y = s.y - c * 1.8,
      z = K.gnd(x, y),
      at = (u, v) => [x + u * c - v * sn, y + u * sn + v * c];
    for (const u of [-2.4, -1.2, 2.6])
      for (const v of [-0.95, 0.95])
        B.tube([...at(u, v - 0.15), z + 0.5], [...at(u, v + 0.15), z + 0.5], 0.5, 10, PAL.tyre);
    B.box(...at(0, 0), z + 0.55, 7.6, 2.3, 0.45, a, PAL.dark);
    B.box(...at(2.9, 0), z + 0.9, 1.9, 2.35, 2.0, a, PAL.white);
    B.box(...at(3.55, 0), z + 1.85, 0.6, 2.2, 0.9, a, PAL.glass, PAL.white);
    B.tube([...at(-2.6, 0), z + 2.0], [...at(1.6, 0), z + 2.0], 1.05, 16, PAL.silver, 1.05, PAL.steel);
    B.box(...at(-3.5, 0), z + 1.0, 0.6, 2.2, 1.4, a, PAL.steelDk);
    // the hose to the house's filler pipe, lying on the pavement
    const hx = x + sn * 3.6,
      hy = y - c * 3.6;
    B.tube([...at(-3.4, -1.0), z + 1.1], [hx, hy, K.gnd(hx, hy) + 0.06], 0.05, 6, PAL.red);
    const g = new THREE.Group();
    g.add(K.mesh(B, K.mats().kit, 'zeitreise heizoel'));
    return g;
  }
  // ---- the wind turbine: construction (1) or turning (2) ----
  const HUB = 160,
    ROT = 80;
  function windrad(d) {
    const s = sites().wind,
      g = new THREE.Group(),
      z = K.ter(s.x, s.y);
    const B = K.GB();
    // the pad, its access road from the forest track, the foundation
    const [rx, ry] = sites().windRoad;
    K.strip(
      B,
      K.resample(
        [
          [rx, ry],
          [s.x - 30, s.y + 22],
        ],
        4
      ),
      2.6,
      2.6,
      (x, y) => K.ter(x, y) + 0.06,
      () => PAL.gravel
    );
    B.box(s.x - 14, s.y + 16, z - 0.4, 44, 28, 0.5, 0.35, PAL.gravel, PAL.gravel);
    B.cyl(s.x, s.y, z - 0.6, 12, 11.5, 1.0, 24, PAL.concrete);
    if (d.stage === 1) {
      // the first tower sections stand, two more lie on the pad, three blades on their racks; the big crawler crane beside
      B.cyl(s.x, s.y, z + 0.4, 4.3, 4.0, 32, 24, PAL.tower);
      for (const [u, v] of [
        [-18, 8],
        [-18, 18],
      ])
        B.tube([s.x + u - 9, s.y + v, z + 2.4], [s.x + u + 9, s.y + v, z + 2.4], 2.2, 16, PAL.tower);
      for (let k = 0; k < 3; k++) {
        const v = 30 + k * 4;
        B.box(s.x + 10 - 39, s.y + v, z + 1.0 + k * 0.2, 78, 3.2, 0.7, 0.05, PAL.white);
        B.box(s.x + 10 - 76, s.y + v, z + 1.02 + k * 0.2, 5, 3.0, 0.72, 0.05, PAL.red);
      }
      const cx = s.x - 26,
        cy = s.y - 6;
      B.box(cx, cy, z, 10, 9, 1.4, 0, PAL.dark);
      B.box(cx, cy, z + 1.4, 8, 6, 3.4, 0, PAL.yellow);
      B.box(cx - 5, cy, z + 1.4, 3, 6, 3.6, 0, PAL.steelDk);
      // lattice boom as a slim mast leaning towards the tower, with its luffing jib
      B.tube([cx + 2, cy, z + 4], [s.x - 6, s.y - 2, z + 168], 1.1, 4, PAL.yellow, 0.8);
      B.tube([s.x - 6, s.y - 2, z + 168], [s.x + 4, s.y + 1, z + 150], 0.5, 4, PAL.yellow);
      B.tube([s.x + 4, s.y + 1, z + 150], [s.x + 4, s.y + 1, z + 40], 0.05, 3, PAL.dark);
      g.add(K.mesh(B, K.mats().kit, 'zeitreise windrad bau'));
      return g;
    }
    // tower: tapered, light grey, a red band at 40 m; nacelle, hub; the rotor turns (anim)
    B.cyl(s.x, s.y, z + 0.4, 4.3, 2.2, 38.5, 28, PAL.tower, false);
    B.cyl(s.x, s.y, z + 38.9, 3.8, 3.68, 3, 28, PAL.red, false);
    B.cyl(s.x, s.y, z + 41.9, 3.68, 2.1, HUB - 43.5, 28, PAL.tower);
    const c = Math.cos(s.yaw),
      sn = Math.sin(s.yaw);
    B.box(s.x - c * 2.5, s.y - sn * 2.5, z + HUB - 2.4, 14, 4.8, 4.8, s.yaw, PAL.tower);
    g.add(K.mesh(B, K.mats().kit, 'zeitreise windrad'));
    const R = K.GB();
    R.tube([0, 0, 0], [3.6, 0, 0], 2.0, 16, PAL.tower, 0.4);
    for (let k = 0; k < 3; k++) {
      const t = (k / 3) * Math.PI * 2,
        cs = Math.cos(t),
        ss = Math.sin(t);
      // a blade along (0, cs, ss): chord 4.2 m at the root to 0.6 m at the tip, the outer 18 m red–white–red
      const segs = [
        [2, 62, PAL.tower],
        [62, 68, PAL.red],
        [68, 74, PAL.tower],
        [74, ROT - 1.5, PAL.red],
      ];
      for (const [r0, r1, cl] of segs) {
        const w0 = 4.2 - (3.6 * r0) / ROT,
          w1 = 4.2 - (3.6 * r1) / ROT,
          p = (r, w, e) => [0.6 + e, cs * r - ss * w, ss * r + cs * w];
        R.quad(p(r0, -w0 / 2, 0), p(r1, -w1 / 2, 0), p(r1, w1 / 2, 0), p(r0, w0 / 2, 0), cl);
        R.quad(p(r0, w0 / 2, 0.5), p(r1, w1 / 2, 0.5), p(r1, -w1 / 2, 0.5), p(r0, -w0 / 2, 0.5), cl);
        R.quad(p(r0, -w0 / 2, 0.5), p(r1, -w1 / 2, 0.5), p(r1, -w1 / 2, 0), p(r0, -w0 / 2, 0), cl);
        R.quad(p(r0, w0 / 2, 0), p(r1, w1 / 2, 0), p(r1, w1 / 2, 0.5), p(r0, w0 / 2, 0.5), cl);
      }
    }
    // the rotor: built along +x (its axis), placed at the hub in front of the nacelle, turned to face the wind (yaw)
    const rotor = K.mesh(R, K.mats().kit, 'zeitreise rotor');
    const hub = new THREE.Group();
    hub.position.set(s.x + c * 5, z + HUB, -(s.y + sn * 5));
    hub.rotation.y = s.yaw; // three: rotating about y by the compass-free heading (site +x towards the wind side)
    hub.add(rotor);
    hub.userData.rotor = rotor;
    g.add(hub);
    g.userData.rotor = rotor;
    return g;
  }
  // a red kite circling over the clearing below the turbine (the classic conflict at turbines in forest)
  function milan() {
    const B = K.GB();
    B.tri([0.35, 0, 0], [-0.2, 0.85, 0.05], [-0.25, 0, 0], PAL.kite);
    B.tri([0.35, 0, 0], [-0.25, 0, 0], [-0.2, -0.85, 0.05], PAL.kite);
    B.tri([-0.2, 0.85, 0.05], [-0.32, 0.7, 0.04], [-0.25, 0.2, 0], PAL.dark);
    B.tri([-0.2, -0.85, 0.05], [-0.25, -0.2, 0], [-0.32, -0.7, 0.04], PAL.dark);
    B.tri([-0.25, 0.1, 0], [-0.75, 0.2, 0], [-0.62, 0, 0], PAL.rust);
    B.tri([-0.25, -0.1, 0], [-0.62, 0, 0], [-0.75, -0.2, 0], PAL.rust);
    B.tube([0.4, 0, 0], [-0.3, 0, 0], 0.07, 6, PAL.kite);
    // seen from below as well: every triangle twice, the second turned over
    const geo = B.geo(),
      pos = geo.attributes.position.array,
      nn = geo.attributes.normal.array,
      cc = geo.attributes.color.array,
      n = pos.length / 9,
      P2 = new Float32Array(pos.length * 2),
      N2 = new Float32Array(pos.length * 2),
      C2 = new Float32Array(cc.length * 2);
    P2.set(pos);
    N2.set(nn);
    C2.set(cc);
    for (let t = 0; t < n; t++)
      for (let v = 0; v < 3; v++) {
        const src = t * 3 + (2 - v),
          dst = n * 3 + t * 3 + v;
        for (let e = 0; e < 3; e++) {
          P2[dst * 3 + e] = pos[src * 3 + e];
          N2[dst * 3 + e] = -nn[src * 3 + e];
          C2[dst * 3 + e] = cc[src * 3 + e];
        }
      }
    geo.setAttribute('position', new THREE.BufferAttribute(P2, 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(N2, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(C2, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array((P2.length / 3) * 2), 2));
    geo.setAttribute('aFlow', new THREE.BufferAttribute(new Float32Array(P2.length / 3), 1));
    const g = new THREE.Group(),
      m = K.inst(geo, K.mats().kit, 1, 'zeitreise milan');
    g.add(m);
    g.userData.bird = m;
    return g;
  }
  // ---- logging: harvester at the clearing's edge, forwarder with a load, log piles by the forest road; the timber truck ----
  function logs(B, x, y, z, a, n, len) {
    const c = Math.cos(a),
      s = Math.sin(a);
    let k = 0;
    for (let row = 0; k < n; row++) {
      const m = Math.max(1, 7 - row);
      for (let i = 0; i < m && k < n; i++, k++) {
        const v = (i - (m - 1) / 2) * 0.46,
          h = z + 0.23 + row * 0.4;
        const jit = (K.hash(k * 7 + n) - 0.5) * 0.4;
        B.tube(
          [x - (c * len) / 2 - s * v + c * jit, y - (s * len) / 2 + c * v + s * jit, h],
          [x + (c * len) / 2 - s * v + c * jit, y + (s * len) / 2 + c * v + s * jit, h],
          0.21 + 0.04 * K.hash(k),
          7,
          PAL.bark,
          undefined,
          PAL.wood
        );
      }
    }
  }
  function machine(B, x, y, z, a, kind) {
    const c = Math.cos(a),
      s = Math.sin(a),
      at = (u, v) => [x + u * c - v * s, y + u * s + v * c];
    for (const u of kind === 'h' ? [-2.2, -1.0, 1.6, 2.8] : [-3.0, -1.8, 1.8, 3.0])
      for (const v of [-1.25, 1.25])
        B.tube([...at(u, v - 0.3), z + 0.7], [...at(u, v + 0.3), z + 0.7], 0.68, 10, PAL.tyre);
    B.box(...at(0, 0), z + 0.9, kind === 'h' ? 6.4 : 8.4, 2.3, 1.1, a, PAL.olive);
    if (kind === 'h') {
      B.box(...at(1.6, 0), z + 2.0, 2.2, 2.1, 2.1, a, PAL.glass, PAL.olive);
      B.box(...at(-1.8, 0), z + 2.0, 2.4, 2.2, 1.2, a, PAL.olive);
      B.tube([...at(0.6, 0), z + 3.0], [...at(5.5, 2.5), z + 4.5], 0.22, 6, PAL.olive);
      B.tube([...at(5.5, 2.5), z + 4.5], [...at(8.5, 4.0), z + 1.6], 0.17, 6, PAL.olive);
      B.box(...at(8.6, 4.0), z + 0.5, 0.9, 0.9, 1.2, a, PAL.yellow);
      B.tube([...at(8.6, 2.0), z + 0.9], [...at(8.6, 6.5), z + 1.1], 0.25, 8, PAL.bark, 0.2, PAL.wood);
    } else {
      B.box(...at(3.2, 0), z + 2.0, 1.9, 2.1, 1.9, a, PAL.glass, PAL.olive);
      for (const u of [-3.6, -1.4, 0.8])
        for (const v of [-1.1, 1.1]) B.box(...at(u, v), z + 2.0, 0.12, 0.12, 2.1, a, PAL.steelDk);
      logs(B, ...at(-1.4, 0), z + 1.9, a, 18, 4.2);
      B.tube([...at(2.0, 0), z + 2.4], [...at(-1.0, 1.6), z + 5.2], 0.17, 6, PAL.olive);
    }
  }
  function ernte(d) {
    const st = sites(),
      g = new THREE.Group(),
      B = K.GB(),
      k = st.kahl;
    if (d.machines) {
      machine(B, k.x - 52, k.y - 18, K.ter(k.x - 52, k.y - 18), 0.6, 'h');
      machine(B, k.x - 20, k.y + 28, K.ter(k.x - 20, k.y + 28), -0.4, 'f');
    }
    // log piles (Polter) along the forest track: up to five, 4 m logs
    const [px, py, w] = st.polter;
    let a = 0.3;
    if (w) {
      const n = K.nearestOn([w], px, py);
      a = wayAngle(n);
    }
    for (let i = 0; i < d.piles; i++) {
      const u = (i - (d.piles - 1) / 2) * 16,
        x = px + Math.cos(a) * u + Math.sin(a) * 4.5,
        y = py + Math.sin(a) * u - Math.cos(a) * 4.5;
      logs(B, x, y, K.ter(x, y), a + Math.PI / 2, 20 + 6 * (i % 2), 4.2);
    }
    g.add(K.mesh(B, K.mats().kit, 'zeitreise ernte'));
    return g;
  }
  function holzlaster() {
    const B = K.GB(),
      z = 0;
    for (const u of [-6.5, -5.2, -1.0, 2.4, 3.6])
      for (const v of [-1.0, 1.0]) B.tube([u, v - 0.2, z + 0.52], [u, v + 0.2, z + 0.52], 0.52, 10, PAL.tyre);
    B.box(-1.5, 0, z + 0.6, 11.5, 1.2, 0.5, 0, PAL.dark);
    B.box(3.4, 0, z + 1.0, 2.2, 2.45, 2.2, 0, C(0x4d5e54));
    B.box(4.2, 0, z + 2.1, 0.5, 2.3, 0.9, 0, PAL.glass);
    for (const u of [-6.8, -4.6, -2.4, 0.2])
      for (const v of [-1.15, 1.15]) B.box(u, v, z + 1.0, 0.12, 0.12, 2.2, 0, PAL.steelDk);
    logs(B, -3.3, 0, z + 0.95, Math.PI / 2, 22, 7.6);
    const g = new THREE.Group();
    const m = K.mesh(B, K.mats().kit, 'zeitreise holzlaster');
    g.add(m);
    g.userData.truck = m;
    return g;
  }
  // ---- the clearing near the camera: stumps and slash where cleared, lying grey trunks where fallen, young trees (in guards where
  // planted and small) – the same stages as the slope field there ----
  // young trees of the garden's generated kinds (garden/trees.js, as the first version's young stand: the far bark and the thinnest leaf
  // level, leaves with an instance colour): pine for spruce and fir, aspen for birch, ash for rowan and maple, oakB for beech, oakA for oak
  const EZ = {
    fichte: 'pine',
    tanne: 'pine',
    birke: 'aspen',
    eberesche: 'ash',
    ahorn: 'ash',
    buche: 'oakB',
    eiche: 'oakA',
  };
  const TINTS = { tanne: [0.78, 0.92, 0.86], fichte: [0.95, 1.06, 0.95], birke: [1.08, 1.12, 0.9] };
  const CONIF = { fichte: true, tanne: true };
  const _m4 = new THREE.Matrix4(),
    _q = new THREE.Quaternion(),
    _sv = new THREE.Vector3(),
    _up = new THREE.Vector3(0, 1, 0),
    _col = new THREE.Color();
  function ezTrees(list, g) {
    const by = {};
    for (const t of list) (by[EZ[t.kind]] = by[EZ[t.kind]] || []).push(t);
    for (const [key, L] of Object.entries(by)) {
      const Kt = TREES[key];
      if (!Kt || !Kt.bark || !Kt.leaf) continue;
      const LV = treeLeafLevels(Kt),
        bark = new THREE.InstancedMesh(Kt.bgFar || Kt.bgMid || Kt.bg, Kt.bark, L.length),
        leaf = new THREE.InstancedMesh(LV[2] || LV[1] || Kt.lg, Kt.leaf, L.length),
        H = Kt.H || 10;
      L.forEach((t, i) => {
        const sc = t.h / H,
          w = sc * (CONIF[t.kind] ? 0.62 : 0.78);
        _q.setFromAxisAngle(_up, t.rot);
        _m4.compose(_sv.set(t.x, t.z - 0.05, -t.y), _q, new THREE.Vector3(w, sc, w));
        bark.setMatrixAt(i, _m4);
        leaf.setMatrixAt(i, _m4);
        const f = TINTS[t.kind] || [1, 1, 1],
          v = 0.85 + 0.3 * K.hash((t.x * 31 + t.y * 17) | 0);
        leaf.setColorAt(i, _col.setRGB(f[0] * v, f[1] * v, f[2] * v));
      });
      for (const im of [bark, leaf]) {
        im.castShadow = false;
        im.receiveShadow = true;
        im.userData.noMerge = true;
        im.userData.sharedGeo = true; // the garden's geometry: never disposed with the clearing
        im.name = 'zeitreise jung-' + key;
        im.computeBoundingSphere();
        g.add(im);
      }
    }
  }
  // the clearing near the camera: stumps with their light cut, brush, lying grey trunks where fallen, bramble on the bare ground, young
  // trees – the pioneers where the stand was left (birch, rowan, spruce), the planted mix in rows with pale tree guards (beech, oak,
  // maple, fir) – the same stages as the slope field there; the young within 50 m of the camera, the far cards show the rest
  function lichtung(d, slot) {
    const st = sites(),
      k = st.kahl,
      cx = k.x + 4,
      cy = k.y + 44,
      g = new THREE.Group(),
      H = ZKHANG,
      state = slot === 'B' ? S.lastR : S.lastL,
      phone = !!(window.matchMedia && matchMedia('(pointer:coarse)').matches),
      cap = phone ? 90 : 240;
    const stumps = K.GB(),
      brush = K.GB(),
      bramble = K.GB(),
      seed = K.GB(),
      guards = K.GB(),
      trees = [];
    const stage = (x, y) => (H && state ? H.stageAt(x, y, state) : 0);
    const near = (x, y) => Math.hypot(x - cx, y - cy);
    for (let gy = -70; gy <= 70; gy += 3.4)
      for (let gx = -70; gx <= 70; gx += 3.4) {
        if (Math.hypot(gx, gy) > 72) continue;
        const h = K.hash((gx * 131 + gy * 7919) | 0),
          h2 = K.hash(((gx + 3) * 97 + gy * 31) | 0),
          x = k.x + gx + (h - 0.5) * 2.4,
          y = k.y + gy + (h2 - 0.5) * 2.4;
        const sg = stage(x, y),
          z = K.ter(x, y);
        if (sg === 3 || sg === 4 || sg === 5) {
          // the stump of the spruce that stood here: cut ~35 cm high, the root flare below, the light cut face on top
          const r = 0.22 + 0.12 * h;
          stumps.cyl(x, y, z - 0.12, r * 1.25, r, 0.22, 12, PAL.bark, false);
          stumps.cyl(x, y, z + 0.1, r, r * 0.97, 0.24 + 0.12 * h2, 12, PAL.bark, C(0xcfae7c));
        }
        if (sg === 4 && h < 0.55) {
          // brush: the crown's branches lying criss-cross, grey-brown, some still with rusty needles
          for (let b = 0; b < 6; b++) {
            const a = (h * 7 + b * 1.1) % 6.283,
              l = 1.4 + 1.8 * K.hash((gx * 7 + gy * 3 + b) | 0),
              ox = x + 1.2 + Math.cos(a * 2.3) * 0.6,
              oy = y - 0.6 + Math.sin(a * 1.7) * 0.6;
            brush.tube(
              [ox, oy, z + 0.08 + 0.06 * b],
              [ox + Math.cos(a) * l, oy + Math.sin(a) * l, z + 0.05 + 0.04 * (b % 3)],
              0.035 + 0.02 * (b % 2),
              4,
              b % 3 ? C(0x6e5a46) : C(0x7a4a2c)
            );
          }
        }
        if (sg === 3 && h < 0.6) {
          const a = h * 12.56,
            ex = x + Math.cos(a) * 14,
            ey = y + Math.sin(a) * 14;
          stumps.tube([x, y, z + 0.3], [ex, ey, K.ter(ex, ey) + 0.25], 0.22, 8, PAL.grey, 0.12, C(0xb9a785));
        }
        // bramble and raspberry on the bare ground (more where nobody planted)
        if ((sg === 4 || sg === 3 || (sg === 5 && d.h < 1.5)) && h2 < (d.mix ? 0.12 : 0.32)) {
          const bx = x - 1.1,
            by = y + 0.9,
            bz = K.ter(bx, by);
          // a clump of arching canes and leaves: many small dented blobs, 0.5–1.1 m high
          for (let b = 0; b < 8; b++) {
            const hb = K.hash((gx * 5 + gy * 3 + b * 17) | 0);
            bramble.blob(
              bx + (K.hash((gx + b) * 13) - 0.5) * 2.0,
              by + (K.hash((gy + b) * 17) - 0.5) * 2.0,
              bz - 0.05,
              0.22 + 0.22 * hb,
              0.35 + 0.65 * K.hash(b * 11 + gy),
              hb < 0.33 ? C(0x2e4420) : hb < 0.66 ? C(0x3a5228) : C(0x45582c),
              (gx * 7 + gy * 13 + b) | 0
            );
          }
        }
        // pioneers where the stand was left: birch, rowan and spruce come by themselves, irregular
        if (sg === 5 && !d.mix && d.h > 0.15 && near(x, y) < 52) {
          const kind = h < 0.5 ? 'birke' : h < 0.75 ? 'fichte' : 'eberesche',
            th = d.h * (0.55 + 0.7 * K.hash((gx * 17 + gy * 13) | 0)),
            xx = x + 1.3,
            yy = y + 0.7;
          trees.push({ x: xx, y: yy, z: K.ter(xx, yy), h: th, kind, rot: h * 6.28, d: near(xx, yy) });
        }
      }
    // the planted mix: rows 3 m apart, 2 m in the row, along the contour, where the field says young
    if (d.mix && d.h > 0.15)
      for (let ry = -50; ry <= 10; ry += 3)
        for (let rx = -48; rx <= 48; rx += 2) {
          const x = cx + rx + (ry % 2 ? 1 : 0),
            y = cy + ry - 6;
          if (stage(x, y) !== 5 || near(x, y) > 52) continue;
          const hh = K.hash((rx * 29 + ry * 53) | 0),
            kind = hh < 0.38 ? 'buche' : hh < 0.52 ? 'eiche' : hh < 0.66 ? 'ahorn' : 'tanne',
            th = d.h * (0.7 + 0.5 * K.hash((rx * 7 + ry * 11) | 0)),
            z = K.ter(x, y);
          trees.push({ x, y, z, h: th, kind, rot: hh * 6.28, d: near(x, y) });
          // tree guards while the saplings are small: pale grey-green tubes, 1.2 m, 12 cm across
          if (d.guards && th < 2.5 && kind !== 'tanne')
            guards.cyl(x, y, z - 0.05, 0.06, 0.06, 1.25, 8, PAL.guard, false);
        }
    // the nearest young trees as the garden's trees, the smallest (seedlings, under 0.7 m) as simple shoots
    trees.sort((a, b) => a.d - b.d);
    const big = [];
    for (const t of trees.slice(0, cap))
      if (t.h >= 0.7) big.push(t);
      else {
        const green = t.kind === 'tanne' ? PAL.fir : CONIF[t.kind] ? C(0x35522c) : PAL.young;
        seed.cyl(t.x, t.y, t.z, 0.02, 0.01, t.h * 0.4, 5, PAL.bark);
        seed.cyl(t.x, t.y, t.z + t.h * 0.2, t.h * 0.25, 0.02, t.h * 0.8, 6, green);
      }
    ezTrees(big, g);
    for (const [B, name] of [
      [stumps, 'stubben'],
      [brush, 'reisig'],
      [bramble, 'brombeere'],
      [seed, 'saemlinge'],
      [guards, 'wuchshuellen'],
    ])
      if (B.n()) g.add(K.mesh(B, K.mats().kit, 'zeitreise ' + name));
    g.userData.young = trees.length;
    return g;
  }
  // ---------- the things and what each state wants ----------
  const q = (v, s = 0.1) => Math.round((+v || 0) / s) * s;
  K.thing({
    id: 'heizhaus',
    want: st => (st.energy && st.energy.heatNet >= 1 ? { chips: q(st.energy.chips, 0.05) } : null),
    build: d => heizhaus(d),
    update: (o, d) => heizUpdate(o, d),
  });
  K.thing({
    id: 'graben',
    want: st => (st.energy && st.energy.heatNet >= 1 ? { stage: st.energy.heatNet } : null),
    build: d => trench(d),
  });
  K.thing({
    id: 'heizoel',
    want: st => (st.energy && st.energy.oilTruck ? { on: 1 } : null),
    build: () => oiltruck(),
  });
  K.thing({
    id: 'windrad',
    want: st => (st.energy && st.energy.windrad >= 1 ? { stage: st.energy.windrad } : null),
    build: d => windrad(d),
    anim: (o, d, t) => {
      if (d.stage !== 2 || !o.userData.rotor) return false;
      o.userData.rotor.rotation.x = -t * 0.95; // ~9 turns a minute (tip ~76 m/s)
    },
  });
  K.thing({
    id: 'milan',
    want: st => (st.energy && st.energy.windrad === 2 ? { on: 1 } : null),
    build: () => milan(),
    anim: (o, d, t) => {
      const s = sites().kahl,
        w = sites().wind,
        cx = (s.x + w.x) / 2,
        cy = (s.y + w.y) / 2 + 60,
        a = t * 0.24,
        r = 55,
        x = cx + Math.cos(a) * r,
        y = cy + Math.sin(a) * r,
        z = K.ter(cx, cy) + 48 + 4 * Math.sin(t * 0.5);
      const b = o.userData.bird;
      b.position.set(x, z, -y);
      b.rotation.set(0, a + Math.PI / 2, 0);
      b.rotation.order = 'YXZ';
      b.rotation.x = 0.35;
      b.scale.setScalar(1.0);
    },
  });
  K.thing({
    id: 'ernte',
    want: st => {
      const h = st.forest ? +st.forest.harvest || 0 : 0;
      return h > 0.04 ? { machines: h > 0.12, piles: Math.max(1, Math.min(5, Math.round(h * 6))) } : null;
    },
    build: d => ernte(d),
  });
  K.thing({
    id: 'holzlaster',
    want: st => (st.forest && +st.forest.harvest > 0.25 && sites().truck.length > 2 ? { on: 1 } : null),
    build: () => holzlaster(),
    anim: (o, d, t) => {
      const P = sites().truck,
        L = P[P.length - 1][2] || 1,
        v = 9, // m/s through the village (~32 km/h), a pass every ~70 s
        s = (t * v) % (L + 300);
      const m = o.userData.truck;
      if (s > L) {
        m.visible = false;
        return;
      }
      m.visible = true;
      let i = 1;
      while (i < P.length - 1 && P[i][2] < s) i++;
      const [ax, ay, sa] = P[i - 1],
        [bx, by, sb] = P[i],
        k = (s - sa) / Math.max(0.01, sb - sa),
        x = ax + (bx - ax) * k,
        y = ay + (by - ay) * k,
        a = Math.atan2(by - ay, bx - ax); // heading along the way (the cab at +x leads)
      m.position.set(x, K.gnd(x, y), -y);
      m.rotation.set(0, a, 0);
    },
  });
  K.thing({
    id: 'lichtung',
    want: (st, side) => {
      const F = st.forest;
      if (!F || +F.green > 0.985) return null;
      // far from the clearing (its stumps and saplings are not seen beyond ~200 m) keep what stands: no rebuilds in the time-lapse
      if (!nearKahl() && S.lichtD && S.lichtD[side]) {
        S.lichtStale = true; // zk_zeitwelt.js tick: rebuilt as soon as the camera comes near
        return S.lichtD[side];
      }
      if (side === 'R') S.lastR = st;
      else S.lastL = st;
      // rebuild in steps: the young stand's height by 0.5 m, the stage shares by 0.04
      const d = {
        h: q(F.regrowH, 0.5),
        mix: F.regrow === 'mischwald',
        guards: +F.planted > 0.3,
        s: ['young', 'cleared', 'fallen', 'grey'].map(k => q(F[k], 0.04)),
      };
      (S.lichtD || (S.lichtD = {}))[side] = d;
      return d;
    },
    build: (d, slot) => lichtung(d, slot),
  });
  // the young trees' programs (the garden's kinds, instanced, leaves with an instance colour) once with the others
  function warm() {
    const g = new THREE.Group(),
      kinds = ['fichte', 'birke', 'eberesche', 'buche', 'eiche'];
    ezTrees(
      kinds.map((kind, i) => ({ x: i, y: 0, z: -500, h: 1.5, kind, rot: 0 })),
      g
    );
    g.traverse(o => (o.frustumCulled = false));
    scene.add(g);
    warmUp(g);
    scene.remove(g);
    g.traverse(o => o.isInstancedMesh && o.dispose && o.dispose());
  }
  function nearKahl() {
    const k = sites().kahl;
    return Math.hypot(cam.position.x - k.x, -cam.position.z - k.y) < 600;
  }
  return { S, sites, nearKahl, warm, HUB, ROT };
})();
