// ===================== Trusetal (Brotterode-Trusetal): the town on the original data and its known places (TRUSETAL) =====================
// ~40 km north-west of the garden, beyond the region's detail. A zone of core/kern.js (KERN.zone) like Kloster Veßra: its own tile set
// welt-test/zonen/trusetal/ (tools/welt/build.py --plan TS: ground DGM1 Thüringen 1 m, the 2024 aerial image of GDI-Th, the OSM roads cut
// in) is loaded when the walker or the camera comes within 2.5 km of the town and freed beyond 3.2 km; the houses are the ETHOS.BUILDA
// buildings of the state's LoD2 in the cells of gebaeude/gebaeude.js (tools/welt-gebaeude/orte.py), the trees those of weltwald/.
// Falko 19.11. 18:15: „Trusetal und Umgebung verfeinern inkl. bekannter Gebäude und Sehenswürdigkeiten“ – the known places as models of
// their own, after photos (Wikimedia Commons) and OpenStreetMap (tools/welt/zone_trusetal.py → trusetal/ort.json):
//   - the Dorfkirche: a white hall church with tall round-arched windows in red sandstone frames, a hipped roof of red tiles with small
//     dormers, the three-sided east end; at the west end the slate tower – square shaft over the roof, the bell storey, the curved hood,
//     the lantern and the spire with its cross;
//   - the Wallenburger Turm on the Hühnberg: the round keep of the Wallenburg (27.5 m), grey sandstone ashlar, the round-arched door with
//     its steps, small windows, the platform with its railing;
//   - the Trusetaler Wasserfall: the Wasserfallgraben's water down the dark rock to the Truse (in the DGM1 a drop of about 48 m), strands
//     of moving water, the rock pyramid, boulders and the pool;
//   - the Zwergen-Park: garden gnomes along its path, the sign;
//   - the Besucherbergwerk Hühn: the portal in the hillside, rails, a mine cart, the sign;
// the named streets for the place display (karte/karte.js) and the HUD, names for the places. Reach it through the map (search
// „Trusetal“ → Hinfliegen), the jetpack's list or ?szenario=trusetal / trusetal_wasserfall.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { BASE, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty, pbrMat } from '../core/assets.js';
import { go } from '../game/player.js';
import { WELT } from './welt.js';
export const TRUSETAL = (() => {
  const S = { on: false, state: 'idle', meshes: [], segs: [], ways: [], data: null, err: '', ms: 0, rev: 0 };
  if (!WELT.on) return S;
  S.on = true;
  // the core of the town (the densest houses, ~500 m west of the Wikidata point on the valley's eastern slope); the place one lands: on the
  // Rathausstraße in front of the town hall; the view of the waterfall from the path below it
  const ORT = [-23310, 32709],
    START = [-23506, 32729],
    FALLS_VIEW = [-22652, 33676],
    SUB = 'zonen/trusetal/',
    ZONE_R = 2600;
  S.ORT = ORT;
  S.SUB = SUB;
  WELT.addSet(SUB);
  const yawTo = (x, y, tx, ty) => (Math.atan2(tx - x, ty - y) * 180) / Math.PI;
  KERN.spot('trusetal', {
    mode: 'walk',
    pos: START,
    z: 0,
    yaw: yawTo(...START, -23504, 32709),
    pitch: 6,
    label: 'Trusetal, Rathaus',
  });
  KERN.spot('trusetal_wasserfall', {
    mode: 'walk',
    pos: FALLS_VIEW,
    z: 0,
    yaw: yawTo(...FALLS_VIEW, -22672, 33730),
    pitch: 22,
    label: 'Trusetaler Wasserfall',
  });
  KERN.scenario('trusetal', { label: 'Trusetal', order: 33, run: () => go('trusetal') });
  KERN.scenario('trusetal_wasserfall', {
    label: 'Trusetaler Wasserfall',
    order: 34,
    run: () => go('trusetal_wasserfall'),
  });
  const hh = n => {
    const s = Math.sin(n * 12.9898 + 4.1) * 43758.5453;
    return s - Math.floor(s);
  };
  const pairs = a => {
    const o = [];
    for (let i = 0; i + 1 < a.length; i += 2) o.push([a[i], a[i + 1]]);
    return o;
  };

  // ---------------- geometry: faces collected per material, in model metres (x east, y north, z up) ----------------
  let G = {};
  const bucket = k => G[k] || (G[k] = { p: [], n: [], u: [], i: [] });
  function put(k, pts, nr, uv) {
    const b = bucket(k),
      o = b.p.length / 3;
    pts.forEach((q, j) => {
      b.p.push(q[0], q[2], -q[1]);
      const m = Array.isArray(nr[0]) ? nr[j] : nr;
      b.n.push(m[0], m[2], -m[1]);
      b.u.push(uv[j][0], uv[j][1]);
    });
    for (let j = 1; j + 1 < pts.length; j++) b.i.push(o, o + j, o + j + 1);
  }
  function normalOf(pts) {
    let x = 0,
      y = 0,
      z = 0;
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i],
        b = pts[(i + 1) % pts.length];
      x += (a[1] - b[1]) * (a[2] + b[2]);
      y += (a[2] - b[2]) * (a[0] + b[0]);
      z += (a[0] - b[0]) * (a[1] + b[1]);
    }
    const l = Math.hypot(x, y, z) || 1;
    return [x / l, y / l, z / l];
  }
  // a planar convex face, counter-clockwise seen from outside; uv in metres: walls (along, up), slopes (along the eave, up the slope)
  function face(k, pts) {
    const n = normalOf(pts);
    let uv;
    if (Math.abs(n[2]) > 0.95) uv = pts.map(p => [p[0], p[1]]);
    else {
      const hl = Math.hypot(n[0], n[1]),
        t = [-n[1] / hl, n[0] / hl, 0],
        w = [n[1] * t[2] - n[2] * t[1], n[2] * t[0] - n[0] * t[2], n[0] * t[1] - n[1] * t[0]];
      uv = pts.map(p => [p[0] * t[0] + p[1] * t[1], p[0] * w[0] + p[1] * w[1] + p[2] * w[2]]);
    }
    put(k, pts, n, uv);
  }
  // a box turned by ang (rad, its width along ang), open at the bottom
  function box(k, cx, cy, z0, w, d, h, ang = 0) {
    const c = Math.cos(ang),
      s = Math.sin(ang),
      P = (u, v, z) => [cx + u * c - v * s, cy + u * s + v * c, z],
      q = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)],
      z1 = z0 + h;
    for (let i = 0; i < 4; i++) {
      const a = q[i],
        b = q[(i + 1) % 4];
      face(k, [
        [a[0], a[1], z0],
        [b[0], b[1], z0],
        [b[0], b[1], z1],
        [a[0], a[1], z1],
      ]);
    }
    face(
      k,
      q.map(p => [p[0], p[1], z1])
    );
  }
  // a body of revolution: prof [[r, z], …] (bottom → top faces outward, top → bottom inward), seg sides (8: an octagon), turned by a0
  function lathe(k, cx, cy, prof, seg, a0 = 0, smooth = true) {
    for (let j = 0; j + 1 < prof.length; j++) {
      const [r0, z0] = prof[j],
        [r1, z1] = prof[j + 1],
        sl = Math.atan2(r0 - r1, z1 - z0),
        ra = (r0 + r1) / 2 || 1;
      for (let i = 0; i < seg; i++) {
        const t0 = a0 + (i / seg) * Math.PI * 2,
          t1 = a0 + ((i + 1) / seg) * Math.PI * 2,
          V = (r, z, t) => [cx + r * Math.cos(t), cy + r * Math.sin(t), z],
          N = t => [Math.cos(t) * Math.cos(sl), Math.sin(t) * Math.cos(sl), Math.sin(sl)],
          us = (t, z) => [t * ra, z];
        let pts = [V(r0, z0, t0), V(r0, z0, t1), V(r1, z1, t1), V(r1, z1, t0)],
          ns = [N(t0), N(t1), N(t1), N(t0)],
          uv = [us(t0, z0), us(t1, z0), us(t1, z1), us(t0, z1)];
        const drop = r0 < 1e-3 ? 0 : r1 < 1e-3 ? 3 : -1;
        if (drop >= 0) [pts, ns, uv] = [pts, ns, uv].map(a => a.filter((_, q) => q !== drop));
        if (smooth) put(k, pts, ns, uv);
        else face(k, pts);
      }
    }
  }
  function walls(k, f, z0, z1) {
    for (let i = 0; i < f.length; i++) {
      const a = f[i],
        b = f[(i + 1) % f.length];
      face(k, [
        [a[0], a[1], z0],
        [b[0], b[1], z0],
        [b[0], b[1], z1],
        [a[0], a[1], z1],
      ]);
    }
  }
  const ccw = f => {
    let s = 0;
    for (let i = 0; i < f.length; i++) s += f[i][0] * f[(i + 1) % f.length][1] - f[(i + 1) % f.length][0] * f[i][1];
    return s > 0 ? f : f.slice().reverse();
  };
  // a convex counter-clockwise outline moved out by d (mitred corners)
  const grow = (f, d) =>
    f.map((p, i) => {
      const a = f[(i + f.length - 1) % f.length],
        b = f[(i + 1) % f.length],
        n1 = [p[1] - a[1], a[0] - p[0]],
        n2 = [b[1] - p[1], p[0] - b[0]],
        l1 = Math.hypot(...n1) || 1,
        l2 = Math.hypot(...n2) || 1,
        m = [n1[0] / l1 + n2[0] / l2, n1[1] / l1 + n2[1] / l2],
        k = d / (1 + (n1[0] * n2[0] + n1[1] * n2[1]) / (l1 * l2));
      return [p[0] + m[0] * k, p[1] + m[1] * k];
    });
  const segsOfPoly = f => f.map((a, i) => [a[0], a[1], f[(i + 1) % f.length][0], f[(i + 1) % f.length][1]]);
  const circleSegs = (x, y, r, n) =>
    Array.from({ length: n }, (_, i) => {
      const t0 = (i / n) * Math.PI * 2,
        t1 = ((i + 1) / n) * Math.PI * 2;
      return [x + r * Math.cos(t0), y + r * Math.sin(t0), x + r * Math.cos(t1), y + r * Math.sin(t1)];
    });

  // ---------------- textures drawn once (canvas): ashlar, leaded glass, rock, falling water ----------------
  function canvasTex(w, h, draw, rep) {
    const cv = document.createElement('canvas');
    cv.width = w;
    cv.height = h;
    draw(cv.getContext('2d'), w, h);
    const t = new THREE.CanvasTexture(cv);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    if (rep) t.repeat.set(rep[0], rep[1]);
    return t;
  }
  function grain(g, w, h, a, n) {
    for (let k = 0; k < n; k++) {
      const v = Math.floor(hh(k * 1.7) * 255);
      g.fillStyle = `rgba(${v},${v},${v},${a})`;
      g.fillRect(hh(k * 3.1) * w, hh(k * 5.3) * h, 1 + hh(k) * 3, 1 + hh(k * 7) * 3);
    }
  }
  // sandstone ashlar, courses of ~45 cm (512 px = 4 m)
  const ashlar = (base, k0) => (g, w, h) => {
    g.fillStyle = '#6f6a62';
    g.fillRect(0, 0, w, h);
    for (let r = 0, y = 0; y < h; r++, y += 58) {
      let x = -hh(r + k0) * 80;
      for (let q = 0; x < w; q++) {
        const L = 70 + hh(r * 31 + q * 7 + k0) * 70,
          c = base.map(v => Math.round(v * (0.82 + 0.3 * hh(r * 13 + q * 3 + k0))));
        g.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
        g.fillRect(x + 2, y + 2, L - 4, 54);
        g.fillStyle = 'rgba(0,0,0,0.10)';
        g.fillRect(x + 2, y + 49, L - 4, 7);
        x += L;
      }
    }
    grain(g, w, h, 0.18, 9000);
  };
  // rock: dark porphyry with lighter veins and moss
  const rockTex = (g, w, h) => {
    g.fillStyle = '#3e3935';
    g.fillRect(0, 0, w, h);
    for (let k = 0; k < 260; k++) {
      g.fillStyle =
        hh(k * 2.3) < 0.15
          ? 'rgba(70,90,45,0.35)'
          : `rgba(${90 + hh(k) * 50},${80 + hh(k) * 40},${70 + hh(k) * 35},0.25)`;
      g.beginPath();
      g.ellipse(
        hh(k * 1.1) * w,
        hh(k * 1.9) * h,
        4 + hh(k * 4) * 30,
        2 + hh(k * 6) * 12,
        hh(k * 8) * 3,
        0,
        Math.PI * 2
      );
      g.fill();
    }
    grain(g, w, h, 0.25, 12000);
  };
  // leaded glass: small panes, light and a little uneven
  const glassTex = (g, w, h) => {
    g.fillStyle = '#5d6669';
    g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 16)
      for (let x = 0; x < w; x += 12) {
        const v = 150 + hh(x * 0.37 + y * 1.3) * 60;
        g.fillStyle = `rgb(${v - 10},${v},${v + 6})`;
        g.fillRect(x + 1, y + 1, 10, 14);
      }
  };
  // falling water: white streaks of different width and strength, seamless along v
  const waterTex = (g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let k = 0; k < 140; k++) {
      const x = hh(k * 4.7) * w,
        bw = 1 + hh(k * 2.2) * 6,
        a = 0.25 + hh(k * 9.1) * 0.6,
        y0 = hh(k * 5.5) * h,
        L = h * (0.3 + hh(k * 1.3) * 0.7);
      for (const dy of [0, -h]) {
        const gr = g.createLinearGradient(0, y0 + dy, 0, y0 + dy + L);
        gr.addColorStop(0, 'rgba(255,255,255,0)');
        gr.addColorStop(0.5, `rgba(250,253,255,${a})`);
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr;
        g.fillRect(x, y0 + dy, bw, L);
      }
    }
  };
  let MATS = null;
  function mats() {
    if (MATS) return MATS;
    const std = (o, t) =>
      new THREE.MeshStandardMaterial(Object.assign({ roughness: 0.9, metalness: 0 }, o, t ? { map: t } : {}));
    const wt = canvasTex(256, 512, waterTex),
      wt2 = canvasTex(256, 512, waterTex, [1.7, 1]);
    wt2.offset.x = 0.37;
    S.waterTex = [wt, wt2];
    MATS = {
      plaster: pbrMat('plaster_ext', { color: 0xf3f0e9 }),
      roof: pbrMat('rooftiles', { wash: ['#c45a32', 0.3] }),
      slate: pbrMat('slate', { color: 0x8f959c }),
      sand: std({ color: 0xa8604d }),
      glass: std({ roughness: 0.35, metalness: 0.15 }, canvasTex(48, 64, glassTex, [0.6, 0.6])),
      dark: std({ color: 0x15120f, roughness: 1 }),
      stone: std({ roughness: 0.95 }, canvasTex(512, 512, ashlar([176, 166, 148], 1), [0.25, 0.25])),
      wallstone: std({ roughness: 0.95 }, canvasTex(512, 512, ashlar([128, 120, 110], 5), [0.3, 0.3])),
      rock: std({ roughness: 0.95, flatShading: true }, canvasTex(256, 256, rockTex, [0.2, 0.2])),
      water: std(
        { color: 0xf2f7fa, transparent: true, opacity: 0.9, depthWrite: false, roughness: 0.2, side: THREE.DoubleSide },
        wt
      ),
      water2: std(
        { color: 0xe6eef2, transparent: true, opacity: 0.6, depthWrite: false, roughness: 0.2, side: THREE.DoubleSide },
        wt2
      ),
      pool: std({ color: 0x2c3a3a, roughness: 0.08, metalness: 0.3, transparent: true, opacity: 0.85 }),
      metal: std({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.6 }),
      gold: std({ color: 0xc9a44a, roughness: 0.35, metalness: 0.85 }),
      wood: pbrMat('weatherwood'),
      rust: std({ color: 0x6e4429, roughness: 0.8, metalness: 0.3 }),
      gnome: std({ roughness: 0.5, vertexColors: true }),
    };
    return MATS;
  }

  // ---------------- the church ----------------
  function church(c, Z) {
    const f = ccw(pairs(c.f)),
      zs = f.map(p => Z(p[0], p[1])),
      z0 = Math.min(...zs) - 0.4,
      zg = Math.max(...zs),
      E = zg + 7.6; // the eaves (two tiers of tall windows)
    // the main axis along the longest edge, pointing east (the three-sided end)
    let L = 0,
      ax = [1, 0];
    f.forEach((a, i) => {
      const b = f[(i + 1) % f.length],
        l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (l > L) [L, ax] = [l, [(b[0] - a[0]) / l, (b[1] - a[1]) / l]];
    });
    if (ax[0] < 0) ax = [-ax[0], -ax[1]];
    const cx = f.reduce((s, p) => s + p[0], 0) / f.length,
      cy = f.reduce((s, p) => s + p[1], 0) / f.length,
      U = p => (p[0] - cx) * ax[0] + (p[1] - cy) * ax[1],
      Vv = p => -(p[0] - cx) * ax[1] + (p[1] - cy) * ax[0],
      us = f.map(U),
      vs = f.map(Vv),
      u0 = Math.min(...us),
      u1 = Math.max(...us),
      half = (Math.max(...vs) - Math.min(...vs)) / 2,
      vm = (Math.max(...vs) + Math.min(...vs)) / 2,
      W = (u, v, z) => [cx + ax[0] * u - ax[1] * v, cy + ax[1] * u + ax[0] * v, z],
      ang = Math.atan2(ax[1], ax[0]),
      T = 5.2;
    walls('plaster', f, z0, E);
    walls('sand', grow(f, 0.06), z0, zg + 0.55); // the plinth
    S.segs.push(...segsOfPoly(f));
    const edges = f.map((a, i) => {
      const b = f[(i + 1) % f.length],
        l = Math.hypot(b[0] - a[0], b[1] - a[1]);
      return { a, b, l, d: [(b[0] - a[0]) / l, (b[1] - a[1]) / l], mid: [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] };
    });
    // the south long side has the door in its middle
    const south = edges.filter(e => e.l > 12).sort((p, q) => p.mid[1] - q.mid[1])[0];
    for (const e of edges) {
      const n = [e.d[1], -e.d[0]],
        cnt = e.l > 12 ? Math.floor((e.l - 4) / 4.6) : e.l > 3.5 ? 1 : 0;
      if (Math.abs(U(e.mid) - u0) < 1) continue; // the west end: the tower stands there
      for (let q = 0; q < cnt; q++) {
        const s = cnt === 1 ? e.l / 2 : 2.6 + ((e.l - 5.2) * q) / (cnt - 1);
        if (e === south && q === Math.floor(cnt / 2)) {
          arch('sand', e.a, e.d, n, s, zg, 1.6, 2.9, 0.22, 0.08);
          const P = (t, z) => [e.a[0] + e.d[0] * t + n[0] * 0.03, e.a[1] + e.d[1] * t + n[1] * 0.03, z];
          face('wood', [P(s - 0.8, zg), P(s + 0.8, zg), P(s + 0.8, zg + 2.5), P(s - 0.8, zg + 2.5)]);
          continue;
        }
        win(e.a, e.d, n, s, zg + 1.7, 1.45, 4.3);
      }
    }
    function win(a, d, n, s, zb, w, h) {
      const P = (t, z, o) => [a[0] + d[0] * t + n[0] * o, a[1] + d[1] * t + n[1] * o, z],
        hw = w / 2,
        zr = zb + h - hw,
        ring = [P(s - hw, zb, 0.025), P(s + hw, zb, 0.025), P(s + hw, zr, 0.025)];
      for (let k = 1; k < 8; k++)
        ring.push(P(s + Math.cos((k / 8) * Math.PI) * hw, zr + Math.sin((k / 8) * Math.PI) * hw, 0.025));
      ring.push(P(s - hw, zr, 0.025));
      face('glass', ring);
      arch('sand', a, d, n, s, zb, w, h, 0.2, 0.06);
      const sp = P(s, zb, 0.08);
      box('sand', sp[0], sp[1], zb - 0.18, w + 0.5, 0.16, 0.16, Math.atan2(d[1], d[0])); // the sill
    }
    // a frame round an opening: two jambs and a round head of segments, standing out by o
    function arch(k, a, d, n, s, zb, w, h, fw, o) {
      const P = (t, z) => [a[0] + d[0] * t + n[0] * o, a[1] + d[1] * t + n[1] * o, z],
        hw = w / 2,
        zr = zb + h - hw;
      face(k, [P(s - hw - fw, zb), P(s - hw, zb), P(s - hw, zr), P(s - hw - fw, zr)]);
      face(k, [P(s + hw, zb), P(s + hw + fw, zb), P(s + hw + fw, zr), P(s + hw, zr)]);
      for (let i = 0; i < 8; i++) {
        const t0 = (i / 8) * Math.PI,
          t1 = ((i + 1) / 8) * Math.PI,
          A = (t, r) => P(s + Math.cos(t) * r, zr + Math.sin(t) * r);
        face(k, [A(t1, hw), A(t0, hw), A(t0, hw + fw), A(t1, hw + fw)]);
      }
    }
    // the hipped roof: every eave edge rises to the ridge (half the width in from either end), red tiles, eaves 0.45 m out
    const rf = grow(f, 0.45),
      RH = half * 1.15,
      onRidge = p => W(Math.max(u0 + half, Math.min(u1 - half, U(p))), vm, E + RH);
    for (let i = 0; i < rf.length; i++) {
      const a = [rf[i][0], rf[i][1], E - 0.3],
        b = [rf[(i + 1) % rf.length][0], rf[(i + 1) % rf.length][1], E - 0.3],
        pa = onRidge(a),
        pb = onRidge(b);
      face('roof', Math.hypot(pa[0] - pb[0], pa[1] - pb[1]) < 0.05 ? [a, b, pb] : [a, b, pb, pa]);
    }
    face('plaster', rf.map(p => [p[0], p[1], E - 0.32]).reverse()); // the eaves' underside
    // dormers: small, two rows on each long side (as in the photo)
    for (const side of [-1, 1])
      for (const [row, cnt] of [
        [0.3, 4],
        [0.62, 3],
      ])
        for (let q = 0; q < cnt; q++) {
          const ua = u0 + T + 1.2,
            ub = u1 - half - 0.5,
            u = ua + ((ub - ua) * (q + 0.5)) / cnt,
            v = vm + side * half * (1 - row) * 0.98,
            z = E + RH * row,
            p = W(u, v, 0),
            fp = W(u, v + side * 0.47, 0),
            fr = [
              [fp[0] - ax[0] * 0.38, fp[1] - ax[1] * 0.38, z + 0.05],
              [fp[0] + ax[0] * 0.38, fp[1] + ax[1] * 0.38, z + 0.05],
              [fp[0] + ax[0] * 0.38, fp[1] + ax[1] * 0.38, z + 0.6],
              [fp[0] - ax[0] * 0.38, fp[1] - ax[1] * 0.38, z + 0.6],
            ];
          box('slate', p[0], p[1], z - 0.25, 1.1, 0.9, 0.95, ang);
          face('dark', side > 0 ? fr.reverse() : fr);
          box('roof', p[0], p[1], z + 0.7, 1.3, 1.1, 0.12, ang);
        }
    // the tower at the west end: square slate shaft over the roof, bell storey, hood, lantern, spire with the cross
    const tc = W(u0 + T / 2 - 0.2, vm, 0),
      zt1 = zg + 14.2,
      o8 = ang + Math.PI / 8;
    box('plaster', tc[0], tc[1], z0, T, T, E - z0, ang);
    box('slate', tc[0], tc[1], E, T, T, zt1 - E, ang);
    box('slate', tc[0], tc[1], zt1, T + 0.35, T + 0.35, 0.35, ang); // the cornice
    lathe(
      'slate',
      tc[0],
      tc[1],
      [
        [2.25, zt1 + 0.35],
        [2.25, zt1 + 3.2],
      ],
      8,
      o8,
      false
    );
    for (let q = 0; q < 4; q++) {
      const t = ang + (q * Math.PI) / 2,
        n = [Math.cos(t), Math.sin(t)],
        d = [-n[1], n[0]],
        at = (r, s, z) => [tc[0] + n[0] * r + d[0] * s, tc[1] + n[1] * r + d[1] * s, z],
        r8 = 2.25 * Math.cos(Math.PI / 8) + 0.02,
        rq = T / 2 + 0.02;
      face('dark', [
        at(r8, -0.42, zt1 + 1.0),
        at(r8, 0.42, zt1 + 1.0),
        at(r8, 0.42, zt1 + 2.6),
        at(r8, -0.42, zt1 + 2.6),
      ]); // louvres
      face('dark', [
        at(rq, -0.35, zt1 - 3.6),
        at(rq, 0.35, zt1 - 3.6),
        at(rq, 0.35, zt1 - 2.6),
        at(rq, -0.35, zt1 - 2.6),
      ]);
    }
    lathe(
      'slate',
      tc[0],
      tc[1],
      [
        [2.45, zt1 + 3.2],
        [2.55, zt1 + 3.5],
        [2.3, zt1 + 4.2],
        [1.6, zt1 + 4.9],
        [0.85, zt1 + 5.3],
        [0.8, zt1 + 5.45],
      ],
      8,
      o8
    ); // the hood (welsche Haube): bulging, then drawn in
    lathe(
      'slate',
      tc[0],
      tc[1],
      [
        [0.8, zt1 + 5.45],
        [0.8, zt1 + 6.6],
      ],
      8,
      o8,
      false
    ); // the lantern
    for (let q = 0; q < 8; q += 2) {
      const t = ang + Math.PI / 4 + (q * Math.PI) / 4,
        n = [Math.cos(t), Math.sin(t)],
        d = [-n[1], n[0]],
        r = 0.8 * Math.cos(Math.PI / 8) + 0.01,
        P = (s, z) => [tc[0] + n[0] * r + d[0] * s, tc[1] + n[1] * r + d[1] * s, z];
      face('dark', [P(-0.18, zt1 + 5.75), P(0.18, zt1 + 5.75), P(0.18, zt1 + 6.35), P(-0.18, zt1 + 6.35)]);
    }
    lathe(
      'slate',
      tc[0],
      tc[1],
      [
        [0.95, zt1 + 6.6],
        [0.75, zt1 + 7.0],
        [0.35, zt1 + 7.4],
        [0.12, zt1 + 7.6],
        [0.0, zt1 + 9.6],
      ],
      8,
      o8
    );
    lathe(
      'gold',
      tc[0],
      tc[1],
      [
        [0.03, zt1 + 9.5],
        [0.03, zt1 + 10.9],
      ],
      6
    );
    lathe(
      'gold',
      tc[0],
      tc[1],
      [
        [0.0, zt1 + 9.9],
        [0.16, zt1 + 10.05],
        [0.0, zt1 + 10.2],
      ],
      8
    ); // the knob
    box('gold', tc[0], tc[1], zt1 + 10.45, 0.55, 0.05, 0.05, ang + Math.PI / 2); // the cross bar
    S.landmarks.church = { x: tc[0], y: tc[1], ground: zg, top: zt1 + 10.9, length: u1 - u0, width: half * 2 };
  }

  // ---------------- the Wallenburger Turm ----------------
  function tower(t, Z) {
    const [x, y] = t.c,
      r = t.r,
      zg = Math.min(...[0, 1, 2, 3, 4, 5].map(k => Z(x + Math.cos(k) * r, y + Math.sin(k) * r))),
      top = zg + 0.6 + t.h;
    lathe(
      'stone',
      x,
      y,
      [
        [r + 0.08, zg - 0.6],
        [r, zg + 3],
        [r - 0.12, top - 0.6],
        [r - 0.1, top],
      ],
      28
    );
    lathe(
      'stone',
      x,
      y,
      [
        [r - 0.1, top],
        [r - 0.45, top],
        [r - 0.45, top - 1.1],
      ],
      28,
      0,
      false
    ); // the parapet's top and inside
    face(
      'wallstone',
      Array.from({ length: 28 }, (_, i) => [
        x + (r - 0.45) * Math.cos((i / 28) * Math.PI * 2),
        y + (r - 0.45) * Math.sin((i / 28) * Math.PI * 2),
        top - 1.1,
      ])
    ); // the platform
    for (let i = 0; i < 24; i++) {
      const tt = (i / 24) * Math.PI * 2;
      lathe(
        'metal',
        x + (r - 0.2) * Math.cos(tt),
        y + (r - 0.2) * Math.sin(tt),
        [
          [0.025, top],
          [0.025, top + 1.05],
        ],
        5
      );
    }
    lathe(
      'metal',
      x,
      y,
      [
        [r - 0.17, top + 1.0],
        [r - 0.17, top + 1.06],
        [r - 0.23, top + 1.06],
        [r - 0.23, top + 1.0],
      ],
      28,
      0,
      false
    ); // the hand rail
    // the door (round-arched, dark wood) towards the restaurant in the west, its steps; the small windows of the stair
    const dir = Math.PI,
      n = [Math.cos(dir), Math.sin(dir)],
      d = [-n[1], n[0]],
      P = (s, z, o) => [x + n[0] * (r + o) + d[0] * s, y + n[1] * (r + o) + d[1] * s, z],
      ring = [P(-0.55, zg, 0.06), P(0.55, zg, 0.06), P(0.55, zg + 1.65, 0.06)];
    for (let k = 1; k < 8; k++)
      ring.push(P(Math.cos((k / 8) * Math.PI) * 0.55, zg + 1.65 + Math.sin((k / 8) * Math.PI) * 0.55, 0.06));
    ring.push(P(-0.55, zg + 1.65, 0.06));
    face('wood', ring);
    for (let k = 0; k < 4; k++) {
      const p = P(0, 0, 0.55 + k * 0.32);
      box('wallstone', p[0], p[1], zg - 0.5 - k * 0.17, 2.2, 0.34, 0.5, dir + Math.PI / 2);
    }
    for (const [a, zz] of [
      [0.9, 7],
      [2.5, 12.5],
      [4.0, 18],
      [5.6, 23.5],
    ]) {
      const m = [Math.cos(dir + a), Math.sin(dir + a)],
        e = [-m[1], m[0]],
        Q = (s, z) => [x + m[0] * (r - 0.02) + e[0] * s, y + m[1] * (r - 0.02) + e[1] * s, zg + z];
      face('dark', [Q(-0.22, 0), Q(0.22, 0), Q(0.22, 0.75), Q(-0.22, 0.75)]);
    }
    S.segs.push(...circleSegs(x, y, r + 0.05, 16));
    S.landmarks.tower = { x, y, ground: zg, top };
  }

  // ---------------- the waterfall ----------------
  function falls(w, Z) {
    const L = pairs(w.p),
      P = [];
    // the line every 1.5 m with the ground under it; the fall begins where the ground first drops steeply
    for (let k = 0; k + 1 < L.length; k++) {
      const a = L[k],
        b = L[k + 1],
        n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / 1.5));
      for (let j = 0; j < n; j++) {
        const x = a[0] + ((b[0] - a[0]) * j) / n,
          y = a[1] + ((b[1] - a[1]) * j) / n;
        P.push({ x, y, z: Z(x, y) });
      }
    }
    const last = L[L.length - 1];
    P.push({ x: last[0], y: last[1], z: Z(last[0], last[1]) });
    let k0 = P.findIndex((p, i) => i + 2 < P.length && p.z - P[i + 2].z > 1.2);
    if (k0 < 0) k0 = Math.floor(P.length / 2);
    let acc = 0;
    P.forEach((p, i) => {
      if (i) acc += Math.hypot(p.x - P[i - 1].x, p.y - P[i - 1].y, p.z - P[i - 1].z);
      p.s = acc;
      p.fall = i >= k0;
      const q = P[Math.min(P.length - 1, i + 1)],
        o = P[Math.max(0, i - 1)],
        l = Math.hypot(q.x - o.x, q.y - o.y) || 1;
      p.n = [(q.y - o.y) / l, -(q.x - o.x) / l];
    });
    const sTop = P[k0].s,
      sEnd = acc;
    // a ribbon of water along the points: lateral offset, width at the top and the foot of the fall, lifted off the rock in the middle
    function ribbon(k, off, w0, w1, lift, from) {
      const b = bucket(k),
        o0 = b.p.length / 3;
      let rows = 0;
      for (const p of P) {
        if (p.s < from) continue;
        const f = Math.max(0, Math.min(1, (p.s - sTop) / Math.max(1, sEnd - sTop))),
          wv = p.fall ? w0 + (w1 - w0) * f : 1.0,
          ov = p.fall ? off * (0.4 + f) : 0,
          lf = p.fall ? lift * Math.sin(Math.PI * Math.min(1, f * 1.4)) + 0.12 : 0.08;
        for (const sd of [-1, 1]) {
          const x = p.x + p.n[0] * (ov + (sd * wv) / 2),
            y = p.y + p.n[1] * (ov + (sd * wv) / 2);
          b.p.push(x, p.z + lf, -y);
          b.n.push(0, 1, 0);
          b.u.push((sd + 1) / 2 + off * 0.31, p.s / 9);
        }
        rows++;
      }
      for (let r = 0; r + 1 < rows; r++) {
        const a = o0 + r * 2;
        b.i.push(a, a + 1, a + 3, a, a + 3, a + 2);
      }
    }
    ribbon('water', 0, 1.6, 3.0, 0.5, 0);
    ribbon('water', -1.6, 0.9, 1.8, 0.8, sTop);
    ribbon('water', 1.5, 0.8, 1.6, 0.6, sTop + 3);
    ribbon('water2', 0.3, 2.6, 5.0, 1.2, sTop);
    // the rock: a pyramid of dark blocks in the fall, blocks along both sides, a boulder field at the foot
    const ROCKS = [],
      rock = (x, y, z, s, k) => {
        const g = new THREE.IcosahedronGeometry(1, 0),
          p = g.attributes.position;
        for (let i = 0; i < p.count; i++) {
          const f =
            0.75 +
            hh(k * 17 + Math.round(p.getX(i) * 7) + Math.round(p.getY(i) * 13) * 3 + Math.round(p.getZ(i) * 5) * 7) *
              0.5;
          p.setXYZ(i, p.getX(i) * s * f, p.getY(i) * s * 0.7 * f, p.getZ(i) * s * f);
        }
        g.rotateY(hh(k * 3) * 6.28);
        g.translate(x, z + s * 0.25, -y);
        g.computeVertexNormals();
        ROCKS.push(g);
      };
    P.forEach((p, i) => {
      if (!p.fall || i % 2) return;
      const f = (p.s - sTop) / Math.max(1, sEnd - sTop);
      rock(p.x + p.n[0] * 0.2, p.y + p.n[1] * 0.2, p.z - 0.8, 1.3 + 1.2 * Math.sin(Math.PI * f), i); // the pyramid under the water
      for (const sd of [-1, 1]) {
        const o = sd * (2.6 + f * 2.5 + hh(i * 7 + sd) * 1.5),
          x = p.x + p.n[0] * o,
          y = p.y + p.n[1] * o;
        rock(x, y, Z(x, y) - 0.6, 1.2 + hh(i + sd * 5) * 1.8, i * 3 + sd);
      }
    });
    const foot = P[P.length - 1];
    for (let k = 0; k < 26; k++) {
      const t = hh(k * 2.9) * 6.28,
        rr = 2 + hh(k * 5.7) * 9,
        x = foot.x + Math.cos(t) * rr,
        y = foot.y + Math.sin(t) * rr;
      rock(x, y, Z(x, y) - 0.3, 0.35 + hh(k * 1.1) * 0.9, 100 + k);
    }
    S.extra.push(new THREE.Mesh(mergeGeometries(ROCKS), mats().rock));
    const pool = new THREE.CircleGeometry(5.5, 24);
    pool.rotateX(-Math.PI / 2);
    pool.translate(foot.x, foot.z + 0.15, -foot.y);
    S.extra.push(new THREE.Mesh(pool, mats().pool));
    S.landmarks.falls = {
      x: P[k0].x,
      y: P[k0].y,
      top: P[0].z,
      edge: P[k0].z,
      foot: foot.z,
      drop: P[0].z - foot.z,
      rocks: ROCKS.length,
    };
  }

  // ---------------- the Zwergen-Park: garden gnomes along its path ----------------
  function gnomes(pk, Z) {
    const F = pairs(pk.f),
      path = pairs(pk.path),
      blds = (pk.bld || []).map(pairs),
      // inside a footprint or within m of it
      inPoly = (x, y, f, m) => {
        let c = false;
        for (let i = 0, j = f.length - 1; i < f.length; j = i++) {
          const a = f[i],
            q = f[j];
          if (a[1] > y !== q[1] > y && x < ((q[0] - a[0]) * (y - a[1])) / (q[1] - a[1]) + a[0]) c = !c;
          const ex = a[0] - q[0],
            ey = a[1] - q[1],
            t = Math.max(0, Math.min(1, ((x - q[0]) * ex + (y - q[1]) * ey) / (ex * ex + ey * ey || 1)));
          if (Math.hypot(x - q[0] - ex * t, y - q[1] - ey * t) < m) return true;
        }
        return c;
      },
      inside = (x, y) => {
        let c = false;
        for (let i = 0, j = F.length - 1; i < F.length; j = i++) {
          const a = F[i],
            q = F[j];
          if (a[1] > y !== q[1] > y && x < ((q[0] - a[0]) * (y - a[1])) / (q[1] - a[1]) + a[0]) c = !c;
        }
        return c;
      },
      xs = F.map(p => p[0]),
      ys = F.map(p => p[1]),
      GE = [],
      C = hex => new THREE.Color(hex).toArray(),
      HATS = ['#b8231c', '#b8231c', '#b8231c', '#2f6b2a', '#1f4f8f', '#c9a227'],
      COATS = ['#2a5aa0', '#3d7a2e', '#7a4a22', '#a32b22', '#5a3f8a', '#c08a1e'],
      add = (g, col) => {
        g = g.index ? g.toNonIndexed() : g;
        const n = g.attributes.position.count,
          cs = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) cs.set(col, i * 3);
        g.setAttribute('color', new THREE.BufferAttribute(cs, 3));
        GE.push(g);
      };
    function gnome(x, y, s, k) {
      const z = Z(x, y),
        rot = hh(k * 5) * 6.28,
        T = (g, dz, fwd = 0) => {
          g.translate(0, 0, fwd);
          g.scale(s, s, s);
          g.rotateY(rot);
          g.translate(x, z + dz * s, -y);
          return g;
        };
      add(T(new THREE.CylinderGeometry(0.17, 0.2, 0.08, 10), 0.04), C('#2b2420')); // boots
      add(T(new THREE.CylinderGeometry(0.15, 0.2, 0.4, 10), 0.28), C(COATS[k % COATS.length])); // the coat
      add(T(new THREE.SphereGeometry(0.12, 10, 8), 0.6, 0.02), C('#e8b49a')); // the face
      add(T(new THREE.ConeGeometry(0.11, 0.26, 10).rotateX(Math.PI), 0.45, 0.07), C('#f2f2ee')); // the beard
      add(T(new THREE.ConeGeometry(0.14, 0.42, 10), 0.86), C(HATS[(k * 7) % HATS.length])); // the hat
    }
    let k = 0;
    for (let tries = 1; k < 70 && tries < 3000; tries++) {
      let x, y;
      if (tries % 3) {
        // along the path, a little to its side
        const sg = Math.floor(hh(tries * 1.3) * (path.length - 1)),
          a = path[sg],
          b = path[sg + 1],
          l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1,
          t = hh(tries * 2.1),
          side = (hh(tries * 3.7) < 0.5 ? -1 : 1) * (1.4 + hh(tries * 4.4) * 3);
        x = a[0] + (b[0] - a[0]) * t + ((b[1] - a[1]) / l) * side;
        y = a[1] + (b[1] - a[1]) * t - ((b[0] - a[0]) / l) * side;
      } else {
        x = Math.min(...xs) + (Math.max(...xs) - Math.min(...xs)) * hh(tries * 0.71);
        y = Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * hh(tries * 0.93);
      }
      if (!inside(x, y) || blds.some(b => inPoly(x, y, b, 1.2))) continue;
      gnome(x, y, k % 17 === 0 ? 2.6 : 0.9 + hh(k * 11) * 0.9, k);
      k++;
    }
    S.extra.push(new THREE.Mesh(mergeGeometries(GE), mats().gnome));
    // the sign at the path's start: a board on two posts
    const p0 = path[0],
      p1 = path[1],
      dir = Math.atan2(p1[1] - p0[1], p1[0] - p0[0]);
    sign(p0[0] - Math.cos(dir) * 2, p0[1] - Math.sin(dir) * 2, Z, dir + Math.PI / 2, ['Zwergen-Park', 'Trusetal'], 2.4);
    S.landmarks.park = { gnomes: k };
  }
  function sign(x, y, Z, ang, lines, w) {
    const z = Z(x, y),
      c = Math.cos(ang),
      s = Math.sin(ang);
    for (const sd of [-1, 1])
      box('wood', x + c * sd * (w / 2 - 0.1), y + s * sd * (w / 2 - 0.1), z - 0.3, 0.12, 0.12, 2.6, ang);
    const cv = document.createElement('canvas');
    cv.width = 512;
    cv.height = 160;
    const g = cv.getContext('2d');
    g.fillStyle = '#5a3d22';
    g.fillRect(0, 0, 512, 160);
    g.fillStyle = '#f0e6c8';
    g.font = 'bold 50px serif';
    g.textAlign = 'center';
    lines.forEach((t, i) => g.fillText(t, 256, 68 + i * 60 - (lines.length - 1) * 4, 490));
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(w, w * 0.31),
      new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8, side: THREE.DoubleSide })
    );
    m.position.set(x, z + 1.75, -y);
    m.rotation.y = ang;
    S.extra.push(m);
  }

  // ---------------- the Besucherbergwerk Hühn: the portal, rails, a mine cart ----------------
  function mine(m, Z) {
    const [x, y] = m.adit,
      gx = Z(x + 3, y) - Z(x - 3, y),
      gy = Z(x, y + 3) - Z(x, y - 3),
      out = Math.atan2(-gy, -gx), // the portal faces downhill
      n = [Math.cos(out), Math.sin(out)],
      d = [-n[1], n[0]],
      z = Z(x + n[0] * 2, y + n[1] * 2),
      P = (s, zz, o) => [x + n[0] * o + d[0] * s, y + n[1] * o + d[1] * s, zz],
      hw = 0.95,
      zr = z + 1.5;
    // the headwall with its arched opening, the dark gallery behind
    face('wallstone', [P(-2.8, z - 0.5, 0.4), P(-hw, z - 0.5, 0.4), P(-hw, z + 3.6, 0.4), P(-2.8, z + 3.6, 0.4)]);
    face('wallstone', [P(hw, z - 0.5, 0.4), P(2.8, z - 0.5, 0.4), P(2.8, z + 3.6, 0.4), P(hw, z + 3.6, 0.4)]);
    for (let i = 0; i < 8; i++) {
      const c0 = Math.cos((i / 8) * Math.PI) * hw,
        c1 = Math.cos(((i + 1) / 8) * Math.PI) * hw,
        s0 = Math.sin((i / 8) * Math.PI) * hw,
        s1 = Math.sin(((i + 1) / 8) * Math.PI) * hw;
      face('wallstone', [P(c1, zr + s1, 0.4), P(c0, zr + s0, 0.4), P(c0, z + 3.6, 0.4), P(c1, z + 3.6, 0.4)]);
    }
    const cp = P(0, 0, 0);
    box('wallstone', cp[0], cp[1], z + 3.6, 6.0, 0.9, 0.35, out + Math.PI / 2); // the coping
    face('dark', [P(-hw, z - 0.2, -0.6), P(hw, z - 0.2, -0.6), P(hw, z + 2.6, -0.6), P(-hw, z + 2.6, -0.6)]);
    face('dark', [P(-hw, z - 0.02, 0.4), P(hw, z - 0.02, 0.4), P(hw, z - 0.02, -0.6), P(-hw, z - 0.02, -0.6)]);
    face('dark', [P(-hw, z, 0.4), P(-hw, z, -0.6), P(-hw, zr + 0.6, -0.6), P(-hw, zr + 0.6, 0.4)]);
    face('dark', [P(hw, z, -0.6), P(hw, z, 0.4), P(hw, zr + 0.6, 0.4), P(hw, zr + 0.6, -0.6)]);
    for (const sd of [-0.3, 0.3])
      for (let k = 0; k < 6; k++) {
        const a = P(sd, 0, 1.15 + k * 1.5);
        box('rust', a[0], a[1], Z(a[0], a[1]) + 0.02, 0.06, 1.5, 0.08, out + Math.PI / 2); // the rails
      }
    const l0 = P(-2.8, 0, 0.4),
      l1 = P(-hw, 0, 0.4),
      r0 = P(hw, 0, 0.4),
      r1 = P(2.8, 0, 0.4);
    S.segs.push([l0[0], l0[1], l1[0], l1[1]], [r0[0], r0[1], r1[0], r1[1]]);
    // the mine cart (Hunt) on its sleeper
    const [cx, cy] = m.cart,
      cz = Z(cx, cy);
    box('rust', cx, cy, cz + 0.32, 1.25, 0.75, 0.6, out);
    for (const a of [-0.4, 0.4])
      for (const b of [-0.3, 0.3])
        box(
          'metal',
          cx + Math.cos(out) * a - Math.sin(out) * b,
          cy + Math.sin(out) * a + Math.cos(out) * b,
          cz + 0.05,
          0.3,
          0.06,
          0.3,
          out
        );
    box('wood', cx, cy, cz, 2.6, 0.18, 0.06, out);
    S.segs.push(...circleSegs(cx, cy, 0.7, 6));
    const sp = P(3.6, 0, 1.2);
    sign(sp[0], sp[1], Z, out + Math.PI / 2, ['Besucherbergwerk', 'Hühn · Glück auf!'], 2.6);
    S.landmarks.mine = { x, y, out: Math.round((out * 180) / Math.PI) };
  }

  // ---------------- load, build, free ----------------
  async function load() {
    if (S.data) return S.data;
    const r = await fetch(BASE + 'trusetal/ort.json');
    if (!r.ok) throw new Error('ort.json ' + r.status);
    S.data = await r.json();
    // the named streets for the map's place display (karte/karte.js: { name, ref, kind, n, p: [x, y, z, …] })
    S.ways = S.data.streets.map(s => {
      const n = s.p.length / 2,
        p = new Array(n * 3).fill(0);
      for (let i = 0; i < n; i++) [p[i * 3], p[i * 3 + 1]] = [s.p[i * 2], s.p[i * 2 + 1]];
      return { name: s.name, ref: s.ref, kind: s.kind, n, p };
    });
    S.rev++;
    return S.data;
  }
  async function build() {
    const t0 = performance.now(),
      D = await load(),
      M = mats();
    G = {};
    S.extra = [];
    S.segs = [];
    S.landmarks = {};
    const ext = (pts, m) => {
      const q = pairs(pts),
        xs = q.map(p => p[0]),
        ys = q.map(p => p[1]);
      return [Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) + m, Math.max(...ys) + m];
    };
    // each place on the ground of the finest tiles under it (WELT.sampler: the same heights at every level of detail)
    const one = async (name, rect, fn) => {
      try {
        const f = await WELT.sampler(...rect);
        fn((x, y) => {
          const z = f(x, y);
          return z === undefined ? WELT.heightAt(x, y) || 0 : z;
        });
      } catch (e) {
        S.err += name + ': ' + e + '; ';
        console.warn('TRUSETAL', name, e);
      }
    };
    await one('church', ext(D.church.f, 8), Z => church(D.church, Z));
    await one('tower', ext(D.tower.c, 12), Z => tower(D.tower, Z));
    await one('falls', ext(D.falls.p, 16), Z => falls(D.falls, Z));
    await one('park', ext(D.park.f, 6), Z => gnomes(D.park, Z));
    await one('mine', ext([...D.mine.adit, ...D.mine.cart], 12), Z => mine(D.mine, Z));
    const grp = new THREE.Group();
    grp.name = 'trusetal';
    for (const [k, b] of Object.entries(G)) {
      if (!b.i.length) continue;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(b.p, 3));
      g.setAttribute('normal', new THREE.Float32BufferAttribute(b.n, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(b.u, 2));
      g.setIndex(b.i);
      const m = new THREE.Mesh(g, M[k]);
      m.name = 'trusetal_' + k;
      m.castShadow = !k.startsWith('water');
      m.receiveShadow = true;
      if (k.startsWith('water')) m.renderOrder = 2;
      grp.add(m);
    }
    for (const m of S.extra) {
      m.castShadow = m.receiveShadow = true;
      grp.add(m);
    }
    scene.add(grp);
    S.group = grp;
    S.meshes = grp.children.slice();
    G = {};
    grid();
    S.ms = Math.round(performance.now() - t0);
    S.state = 'ready';
    markDirty(true);
  }
  function dispose() {
    if (S.group) {
      scene.remove(S.group);
      S.group.traverse(o => o.geometry && o.geometry.dispose());
    }
    S.group = null;
    S.meshes = [];
    S.segs = [];
    S.cells = null;
    S.state = 'idle';
    markDirty(true);
  }
  // ---- collisions: wall segments in a 16 m grid (as welt/vessra.js) ----
  function grid() {
    const C = new Map();
    S.segs.forEach((s, k) => {
      for (let i = Math.floor(Math.min(s[0], s[2]) / 16); i <= Math.floor(Math.max(s[0], s[2]) / 16); i++)
        for (let j = Math.floor(Math.min(s[1], s[3]) / 16); j <= Math.floor(Math.max(s[1], s[3]) / 16); j++) {
          const key = i + ',' + j;
          if (!C.has(key)) C.set(key, []);
          C.get(key).push(k);
        }
    });
    S.cells = C;
  }
  const near = (x, y) => Math.hypot(x - ORT[0], y - ORT[1]) < ZONE_R;
  KERN.provide(
    'pushOut',
    (p, r) => {
      if (S.state !== 'ready' || !S.cells || !near(p[0], p[1])) return undefined;
      let moved = false;
      const ci = Math.floor(p[0] / 16),
        cj = Math.floor(p[1] / 16);
      for (let i = ci - 1; i <= ci + 1; i++)
        for (let j = cj - 1; j <= cj + 1; j++)
          for (const k of S.cells.get(i + ',' + j) || []) {
            const s = S.segs[k],
              ex = s[2] - s[0],
              ey = s[3] - s[1],
              t = Math.max(0, Math.min(1, ((p[0] - s[0]) * ex + (p[1] - s[1]) * ey) / (ex * ex + ey * ey || 1))),
              qx = s[0] + ex * t,
              qy = s[1] + ey * t,
              d = Math.hypot(p[0] - qx, p[1] - qy);
            if (d < r && d > 1e-6) {
              p[0] = qx + ((p[0] - qx) / d) * r;
              p[1] = qy + ((p[1] - qy) / d) * r;
              moved = true;
            }
          }
      return moved;
    },
    10
  );
  // ---- names: the known places, else the nearest named street (within 20 m) ----
  const NAMED = [
    ['Wallenburger Turm', d => d.tower.c, 25],
    ['Trusetaler Wasserfall', d => d.falls.top, 45],
    ['Besucherbergwerk Hühn', d => d.mine.adit, 30],
  ];
  let pc = [1e9, 0, null];
  KERN.provide(
    'place',
    (x, y) => {
      if (!S.data || !near(x, y)) return undefined;
      if (Math.abs(x - pc[0]) < 1 && Math.abs(y - pc[1]) < 1) return pc[2] || undefined;
      let nm = null;
      for (const [name, at, r] of NAMED) {
        const c = at(S.data);
        if (Math.hypot(x - c[0], y - c[1]) < r) nm = name;
      }
      if (!nm) {
        let best = 20;
        for (const w of S.ways) {
          if (!w.name) continue;
          for (let i = 0; i + 1 < w.n; i++) {
            const ax = w.p[i * 3],
              ay = w.p[i * 3 + 1];
            if (Math.abs(x - ax) > 250 || Math.abs(y - ay) > 250) continue;
            const ex = w.p[i * 3 + 3] - ax,
              ey = w.p[i * 3 + 4] - ay,
              t = Math.max(0, Math.min(1, ((x - ax) * ex + (y - ay) * ey) / (ex * ex + ey * ey || 1))),
              d = Math.hypot(x - ax - ex * t, y - ay - ey * t);
            if (d < best) [best, nm] = [d, w.name];
          }
        }
      }
      pc = [x, y, nm];
      return nm || undefined;
    },
    15
  );
  // the church, the town hall and the gnome park as named areas (once the data is there)
  function areas() {
    const D = S.data;
    if (!D || S.areasMade) return;
    S.areasMade = true;
    KERN.area({ name: 'Dorfkirche Trusetal', poly: pairs(D.church.f), prio: 25 });
    KERN.area({ name: 'Rathaus Trusetal', poly: pairs(D.townhall.f), prio: 25 });
    KERN.area({ name: 'Zwergen-Park Trusetal', poly: pairs(D.park.f), prio: 25 });
  }
  KERN.zone({
    id: 'trusetal',
    x: ORT[0],
    y: ORT[1],
    near: 2500,
    far: 3200,
    build: async () => {
      S.state = 'loading';
      S.err = '';
      WELT.need('trusetal', true, SUB);
      await KERN.until(() => WELT.heightAt(START[0], START[1]) !== undefined, 900);
      for (const [k, p] of [
        ['trusetal', START],
        ['trusetal_wasserfall', FALLS_VIEW],
      ]) {
        const z = WELT.heightAt(p[0], p[1]);
        if (z !== undefined) KERN.spot(k, { z });
      }
      try {
        await build();
        areas();
      } catch (e) {
        S.state = 'error';
        S.err += String(e);
        throw e;
      }
    },
    drop: () => {
      WELT.need('trusetal', false);
      dispose();
    },
    // the water runs down; near the fall the picture is drawn every frame
    tick: dt => {
      if (!S.waterTex || S.state !== 'ready') return;
      S.waterTex[0].offset.y -= dt * 1.9;
      S.waterTex[1].offset.y -= dt * 1.25;
      const w = KERN.where(),
        f = S.landmarks && S.landmarks.falls;
      if (w && f && Math.hypot(w[0] - f.x, w[1] - f.y) < 450) markDirty();
    },
  });
  S.status = () => ({
    state: S.state,
    err: S.err,
    ms: S.ms,
    meshes: S.meshes.length,
    segs: S.segs.length,
    ways: S.ways.length,
    landmarks: S.landmarks || null,
    zone: (KERN.zones().find(z => z.id === 'trusetal') || { state: '' }).state,
  });
  return S;
})();
window.TRUSETAL = TRUSETAL;
