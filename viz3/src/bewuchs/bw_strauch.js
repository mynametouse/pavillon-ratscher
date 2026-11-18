// ===================== feat/bewuchs stage 3: shrubs with flowers and berries (BWSTRAUCH) =====================
// Where: each kind of area of BWKARTE's maps says how many shrubs stand on 100 m² and how (the helper's table BWARTEN.flaechen[k].straeucher:
// je_100m2, verteilung flaeche / gruppen / einzeln / rand, the species' shares) – thickets dense, hedgerows in groups along field edges and
// banks, garden shrubs along the edges of the lawns. Placed once per loaded map cell from a hash of the place (the same on every visit),
// never on the modelled site (the garden has its planner's plants) nor where the map has nothing (roads, buildings, water).
// What: the helper's species (BWARTEN.straeucher: height, width, ez-tree preset with seed and option paths, leaves through the year,
// flowers, fruit) as ez-tree kinds (garden/trees.js buildTreeKind), built one at a time as they come into view, instanced per kind in two
// bands – near the full bark and crown, beyond the thinned bark and leaf cards; the month by the leaves' instance colour (budding, green,
// autumn, falling, bare: the crown hidden), flowers and berries as dots on the leaf cards (flowers before the leaves: on the twigs).
//   BWSTRAUCH.fromArten(A)      the species and the plans of the areas
//   BWSTRAUCH.tick(x, y, doy)   the shrubs round the camera (again when it moved > 20 m, the day changed, a cell or a kind came)
//   BWSTRAUCH.set({ on, r, cap }) on/off, radius (m), most shrubs drawn
//   BWSTRAUCH.state()           { on, sp, cells, near, drawn, kinds, queue, dots, err }
import * as THREE from 'three';
import { scene, V } from '../core/head.js';
import { markDirty, plain } from '../core/assets.js';
import { KERN } from '../core/kern.js';
import { buildTreeKind, treeLeafLevels } from '../garden/trees.js';
import { BWKARTE } from './bw_karte.js';
export const BWSTRAUCH = (() => {
  const S = {
    on: true,
    sp: [],
    idx: {},
    plans: {},
    kinds: {},
    queue: [],
    meshes: {},
    R: 140,
    NEAR: 32,
    cap: 1500,
    drawn: 0,
    near: 0,
    nDots: 0,
    err: '',
    doy: NaN,
    cx: NaN,
    cy: NaN,
    dirty: true,
    G: null,
    dotMesh: null,
  };
  const CELL = 400,
    MAXDOTS = 9000;
  const hash = (a, b, c = 0) => {
    const s = Math.sin(a * 127.1 + b * 311.7 + c * 74.7) * 43758.5453;
    return s - Math.floor(s);
  };
  const lin = v => (v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
  const hexLin = h =>
    typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h)
      ? [1, 3, 5].map(i => lin(parseInt(h.slice(i, i + 2), 16) / 255))
      : null;
  // ---------- the species and the plans of the areas ----------
  // an option path of ez-tree ('branch.angle.1') set on its options
  function setPath(o, path, v) {
    const k = String(path).split('.');
    let t = o;
    for (let i = 0; i < k.length - 1; i++) {
      if (t[k[i]] == null || typeof t[k[i]] !== 'object') t[k[i]] = {};
      t = t[k[i]];
    }
    t[k[k.length - 1]] = v;
  }
  function fromArten(A) {
    if (!A || !A.straeucher) return 0;
    S.sp = [];
    S.idx = {};
    for (const [id, e] of Object.entries(A.straeucher)) {
      if (!e || !e.eztree || !Array.isArray(e.hoehe_m)) continue;
      S.idx[id] = S.sp.length;
      S.sp.push({
        id,
        e,
        h: e.hoehe_m,
        w: Array.isArray(e.breite_m) ? e.breite_m : e.hoehe_m,
        streu: e.streuung_tage || 4,
      });
    }
    S.plans = {};
    for (const [c, f] of Object.entries(A.flaechen || {})) {
      const p = f && f.straeucher;
      if (!p || !(p.je_100m2 > 0) || !p.arten) continue;
      const L = Object.entries(p.arten).filter(([id, w]) => S.idx[id] !== undefined && w > 0),
        sum = L.reduce((a, [, w]) => a + w, 0);
      if (!L.length) continue;
      let acc = 0;
      S.plans[c] = {
        dens: p.je_100m2 / 100,
        how: p.verteilung || 'einzeln',
        list: L.map(([id, w]) => [(acc += w / sum), S.idx[id]]),
      };
    }
    // placed again with the new plans
    for (const c of BWKARTE.cells.values()) c.shrubs = undefined;
    S.dirty = true;
    return S.sp.length;
  }
  // ---------- placing: once per map cell ----------
  function codeIn(c, x, y) {
    const u = Math.floor((x - c.i * CELL) / c.res),
      v = c.n - 1 - Math.floor((y - c.j * CELL) / c.res);
    if (u < 0 || v < 0 || u >= c.n || v >= c.n) return 0;
    return c.px[v * c.n + u];
  }
  // at the edge of its area (within 1.5 m another kind): where garden shrubs stand – along fences, walls, beds and paths
  const edge = (c, x, y, k) =>
    [
      [1.5, 0],
      [-1.5, 0],
      [0, 1.5],
      [0, -1.5],
    ].some(([dx, dy]) => (codeIn(c, x + dx, y + dy) & 31) !== k);
  function place(c) {
    const out = [],
      x0 = c.i * CELL,
      y0 = c.j * CELL,
      SITE = BWKARTE.SITE;
    for (const [k, P] of Object.entries(S.plans)) {
      const cls = +k,
        grp = P.how === 'gruppen',
        // one candidate per g² (groups: a centre per 3.5 / dens m² with 2–5 shrubs round it)
        g = Math.sqrt((grp ? 3.5 : 1) / P.dens);
      if (!(g >= 1)) continue;
      for (let gx = x0; gx < x0 + CELL; gx += g)
        for (let gy = y0; gy < y0 + CELL; gy += g) {
          const x = gx + hash(gx, gy, cls) * g,
            y = gy + hash(gy, gx, cls + 3.1) * g,
            code = codeIn(c, x, y);
          if ((code & 31) !== cls) continue;
          if (x > SITE.x0 - 2 && x < SITE.x1 + 2 && y > SITE.y0 - 2 && y < SITE.y1 + 2) continue;
          if (P.how === 'rand' && !edge(c, x, y, cls)) continue;
          const vig = (code >> 5) / 7,
            n = grp ? 2 + Math.floor(hash(x, y, 9.1) * 4) : 1;
          for (let m = 0; m < n; m++) {
            const a = hash(x, y, m + 2.2) * 6.2832,
              rr = m ? 1.2 + hash(y, x, m + 5.5) * 2.4 : 0,
              px = x + Math.cos(a) * rr,
              py = y + Math.sin(a) * rr;
            if (m && (codeIn(c, px, py) & 31) !== cls) continue;
            const r = hash(px, py, 4.4);
            let si = P.list[P.list.length - 1][1];
            for (const [cw, s] of P.list)
              if (r <= cw) {
                si = s;
                break;
              }
            const s = S.sp[si],
              f = hash(py, px, 7.7),
              kv = 0.75 + 0.25 * vig;
            out.push(
              px,
              py,
              si,
              (s.h[0] + (s.h[1] - s.h[0]) * f) * kv,
              (s.w[0] + (s.w[1] - s.w[0]) * f) * kv,
              hash(px, py, 8.8)
            );
          }
        }
    }
    c.shrubs = new Float32Array(out);
    S.dirty = true;
  }
  // ---------- the kinds: ez-tree, one built per call ----------
  function cardCentres(geo, n) {
    const idx = geo.index ? geo.index.array : null,
      P = geo.attributes.position,
      quads = Math.floor((idx ? idx.length : P.count * 1.5) / 6),
      step = Math.max(1, Math.floor(quads / n)),
      out = [];
    for (let q = 0; q < quads; q += step) {
      const i0 = idx ? idx[q * 6] : q * 4;
      let x = 0,
        y = 0,
        z = 0;
      for (let j = 0; j < 4 && i0 + j < P.count; j++) {
        x += P.getX(i0 + j);
        y += P.getY(i0 + j);
        z += P.getZ(i0 + j);
      }
      out.push(x / 4, y / 4, z / 4);
    }
    return new Float32Array(out);
  }
  // the outer twigs (flowers before the leaves): the bark's vertices in the crown's upper and outer part
  function twigPoints(geo, H, n) {
    const P = geo.attributes.position,
      out = [];
    for (let i = 0; i < P.count && out.length < n * 3 * 6; i += 7) {
      const x = P.getX(i),
        y = P.getY(i),
        z = P.getZ(i);
      if (y > H * 0.35 && Math.hypot(x, z) > H * 0.12) out.push(x, y, z);
    }
    return new Float32Array(out);
  }
  // the mean colour of a kind's leaf picture × its material colour (linear): what the instance colour multiplies
  function leafAvg(K) {
    const ref = [0.16, 0.24, 0.07],
      img = K.leaf.map && K.leaf.map.image;
    if (!img || !img.width) return ref;
    try {
      const cv = document.createElement('canvas');
      cv.width = cv.height = 32;
      const g = cv.getContext('2d', { willReadFrequently: true });
      g.drawImage(img, 0, 0, 32, 32);
      const d = g.getImageData(0, 0, 32, 32).data;
      let r = 0,
        gg = 0,
        b = 0,
        n = 0;
      for (let i = 0; i < d.length; i += 4)
        if (d[i + 3] > 128) {
          r += lin(d[i] / 255);
          gg += lin(d[i + 1] / 255);
          b += lin(d[i + 2] / 255);
          n++;
        }
      if (!n) return ref;
      const c = K.leaf.color;
      return [(r / n) * c.r, (gg / n) * c.g, (b / n) * c.b];
    } catch (e) {
      return ref;
    }
  }
  function buildOne() {
    const si = S.queue.shift();
    if (si === undefined) return;
    const s = S.sp[si],
      ez = s.e.eztree;
    try {
      const K = buildTreeKind({
        preset: ez.preset,
        seed: ez.seed,
        tint: 0xffffff,
        mod: o => {
          for (const [p, v] of Object.entries(ez.mod || {})) setPath(o, p, v);
        },
      });
      K.lv = treeLeafLevels(K);
      K.avg = leafAvg(K);
      K.cards = cardCentres(K.lg, 220);
      K.twigs = twigPoints(K.bg, K.H, 120);
      S.kinds[s.id] = K;
    } catch (e) {
      S.kinds[s.id] = 'fail';
      S.err = s.id + ': ' + String((e && e.message) || e);
    }
    S.dirty = true;
  }
  function kindOf(si) {
    const s = S.sp[si],
      K = S.kinds[s.id];
    if (K) return K === 'fail' ? null : K;
    if (!S.queue.includes(si)) S.queue.push(si);
    return null;
  }
  // ---------- the year of a shrub ----------
  const mixC = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const sm = (a, b, d) => Math.max(0, Math.min(1, (d - a) / Math.max(1, b - a)));
  // its leaves on day d: their colour (linear) and how full the crown is (0: bare)
  function leaves(s, d) {
    const L = s.e.laub || {},
      green = hexLin(L.farbe) || [0.05, 0.12, 0.03],
      bud = hexLin(L.austrieb_farbe) || green,
      autumn = hexLin(L.herbst_farbe) || [0.3, 0.2, 0.04],
      a = L.austrieb || [100, 120],
      h = L.herbst || [280, 300],
      f = L.fall || [295, 315];
    if (L.typ === 'immergruen') {
      const w = hexLin(L.winter_farbe);
      if (d >= a[0] && d <= a[1]) return [mixC(green, bud, 0.5), 1];
      return [w && (d < 75 || d > 320) ? w : green, 1];
    }
    if (d < a[0] || d > f[1]) {
      if (L.typ === 'trockenlaub') return [autumn, 0.85]; // the hornbeam hedge keeps its dry leaves
      if (L.typ === 'halbimmergruen') return [mixC(green, autumn, 0.35), 0.55];
      return [green, 0];
    }
    if (d < a[1]) return [mixC(bud, green, sm(a[0], a[1], d) * 0.6), 0.3 + 0.7 * sm(a[0], a[1], d)];
    if (d < h[0]) return [d < a[1] + 20 ? mixC(bud, green, 0.6 + 0.4 * sm(a[1], a[1] + 20, d)) : green, 1];
    if (d < f[0]) return [mixC(green, autumn, sm(h[0], h[1], d)), 1];
    return [autumn, L.typ === 'trockenlaub' ? 0.9 : 1 - 0.8 * sm(f[0], f[1], d)];
  }
  // its dots on day d: [colour (linear), how many (0–1 of its most), size (m), on the twigs] or null
  function dots(s, d) {
    const B = s.e.bluete,
      F = s.e.frucht;
    if (B && d >= B.von && d <= B.bis) {
      const t = (d - B.von) / Math.max(1, B.bis - B.von),
        k = Math.min(1, t * 4, (1 - t) * 4);
      return [
        hexLin(B.farbe) || [0.9, 0.9, 0.85],
        (B.menge || 0.5) * (0.35 + 0.65 * k),
        B.groesse_m || 0.06,
        !!B.vor_laub,
      ];
    }
    if (F) {
      for (const [a, b] of F.reif || [])
        if (d >= a && d <= b) return [hexLin(F.farbe) || [0.4, 0.02, 0.02], F.menge || 0.5, F.groesse_m || 0.04, false];
      if (Array.isArray(F.gruen) && d >= F.gruen[0] && d <= F.gruen[1])
        return [
          hexLin(F.farbe_gruen) || [0.08, 0.14, 0.03],
          (F.menge || 0.5) * 0.6,
          (F.groesse_m || 0.04) * 0.8,
          false,
        ];
      if (F.winter && (d < 75 || d > ((F.reif && F.reif.length && F.reif[F.reif.length - 1][1]) || 330)))
        return [hexLin(F.farbe) || [0.4, 0.02, 0.02], (F.menge || 0.5) * 0.7, F.groesse_m || 0.04, true];
    }
    return null;
  }
  // ---------- the meshes ----------
  function group() {
    if (S.G) return S.G;
    S.G = new THREE.Group();
    S.G.name = 'bwstrauch';
    S.G.userData.noMerge = true;
    scene.add(S.G);
    S.dotMat = plain({ roughness: 0.6 });
    S.dotGeo = new THREE.IcosahedronGeometry(1, 0);
    return S.G;
  }
  function im(geo, mat, cap, colour) {
    const m = new THREE.InstancedMesh(geo, mat, cap);
    m.count = 0;
    if (colour) m.setColorAt(0, new THREE.Color(1, 1, 1));
    m.castShadow = false;
    m.receiveShadow = true;
    m.frustumCulled = false;
    m.userData.noMerge = true;
    group().add(m);
    return m;
  }
  // a kind's four meshes (bark and crown, near and far), made anew with room to spare when more are needed
  function meshesOf(id, K, nN, nF) {
    let M = S.meshes[id];
    if (!M || M.capN < nN || M.capF < nF) {
      if (M) for (const m of M.all) (S.G.remove(m), m.dispose());
      const cN = Math.max(16, nN * 2),
        cF = Math.max(32, nF * 2);
      M = { capN: cN, capF: cF };
      M.bN = im(K.bg, K.bark, cN);
      M.lN = im(K.lv[0], K.leaf, cN, true);
      M.bF = im(K.bgFar, K.bark, cF);
      M.lF = im(K.lv[2], K.leaf, cF, true);
      M.all = [M.bN, M.lN, M.bF, M.lF];
      S.meshes[id] = M;
    }
    return M;
  }
  const m4 = new THREE.Matrix4(),
    q = new THREE.Quaternion(),
    up = new THREE.Vector3(0, 1, 0),
    sv = new THREE.Vector3(),
    v3 = new THREE.Vector3(),
    col = new THREE.Color();
  function rebuild(x, y, d) {
    S.dirty = false;
    S.cx = x;
    S.cy = y;
    // the shrubs within R, nearest first
    const list = [];
    for (const c of BWKARTE.cells.values()) {
      if (!c.shrubs) continue;
      if (Math.max(Math.abs((c.i + 0.5) * CELL - x), Math.abs((c.j + 0.5) * CELL - y)) > CELL / 2 + S.R) continue;
      const A = c.shrubs;
      for (let o = 0; o < A.length; o += 6) {
        const dd = Math.hypot(A[o] - x, A[o + 1] - y);
        if (dd < S.R) list.push([dd, A, o]);
      }
    }
    list.sort((a, b) => a[0] - b[0]);
    if (list.length > S.cap) list.length = S.cap;
    // per kind, near and far
    const by = new Map();
    for (const e of list) {
      const si = e[1][e[2] + 2],
        K = kindOf(si);
      if (!K) continue;
      let b = by.get(si);
      if (!b) by.set(si, (b = { K, n: [], f: [] }));
      (e[0] < S.NEAR ? b.n : b.f).push(e);
    }
    for (const M of Object.values(S.meshes)) for (const m of M.all) m.count = 0;
    const dl = [];
    let nNear = 0,
      nAll = 0;
    for (const [si, b] of by) {
      const s = S.sp[si],
        K = b.K,
        M = meshesOf(s.id, K, b.n.length, b.f.length);
      for (const [band, bm, lm] of [
        [b.n, M.bN, M.lN],
        [b.f, M.bF, M.lF],
      ]) {
        let i = 0;
        for (const [, A, o] of band) {
          const px = A[o],
            py = A[o + 1],
            hh = A[o + 3],
            ww = A[o + 4],
            rr = A[o + 5],
            z = KERN.ground(px, py, -100),
            shift = (rr - 0.5) * 2 * s.streu,
            [lc, full] = leaves(s, d - shift),
            sy = hh / Math.max(0.3, K.H),
            sx = THREE.MathUtils.clamp(ww / 2 / Math.max(0.2, K.R), sy * 0.7, sy * 1.45);
          q.setFromAxisAngle(up, rr * 6.2832);
          m4.compose(V(px, py, z - 0.05), q, sv.set(sx, sy, sx));
          bm.setMatrixAt(i, m4);
          // the crown: hidden when bare, a little smaller while budding or falling
          const kf = full > 0.02 ? 0.55 + 0.45 * full : 0;
          m4.compose(V(px, py, z - 0.05), q, sv.set(sx * kf, sy * (kf ? 0.6 + 0.4 * kf : 0), sx * kf));
          lm.setMatrixAt(i, m4);
          const av = K.avg,
            k = 0.9 + 0.2 * rr;
          col.setRGB(
            THREE.MathUtils.clamp((lc[0] / Math.max(0.01, av[0])) * k, 0.25, 2.8),
            THREE.MathUtils.clamp((lc[1] / Math.max(0.01, av[1])) * k, 0.25, 2.8),
            THREE.MathUtils.clamp((lc[2] / Math.max(0.01, av[2])) * k, 0.25, 2.8)
          );
          lm.setColorAt(i, col);
          // flowers and berries: on its leaf cards (before the leaves and in winter: on the twigs)
          const D = dots(s, d - shift);
          if (D && dl.length < MAXDOTS * 5) {
            const [dc, amount, size, twigs] = D,
              pts = twigs || !(full > 0.3) ? K.twigs : K.cards,
              np = pts.length / 3,
              nd = Math.min(70, Math.round(amount * 26 * Math.max(0.6, ww * hh)));
            if (np && nd > 0) {
              m4.compose(V(px, py, z - 0.05), q, sv.set(sx, sy, sx));
              for (let j = 0; j < nd && dl.length < MAXDOTS * 5; j++) {
                const pi = Math.floor(hash(px + j, py, 11.3) * np);
                v3.set(pts[pi * 3], pts[pi * 3 + 1], pts[pi * 3 + 2]).applyMatrix4(m4);
                dl.push(v3.x, v3.y, v3.z, size * 0.35 * (0.75 + 0.5 * hash(py, px + j, 12.1)), dc);
              }
            }
          }
          i++;
        }
        bm.count = lm.count = i;
        for (const m of [bm, lm]) {
          m.instanceMatrix.needsUpdate = true;
          if (m.instanceColor) m.instanceColor.needsUpdate = true;
        }
      }
      nNear += b.n.length;
      nAll += b.n.length + b.f.length;
    }
    // the dots
    const nd = dl.length / 5;
    if (!S.dotMesh || S.dotMesh.instanceMatrix.count < nd) {
      if (S.dotMesh) (S.G.remove(S.dotMesh), S.dotMesh.dispose());
      group();
      S.dotMesh = im(S.dotGeo, S.dotMat, Math.max(256, Math.min(MAXDOTS, nd * 2)), true);
    }
    for (let j = 0; j < nd && j < S.dotMesh.instanceMatrix.count; j++) {
      const o = j * 5,
        r = dl[o + 3];
      m4.makeScale(r, r, r).setPosition(dl[o], dl[o + 1], dl[o + 2]);
      S.dotMesh.setMatrixAt(j, m4);
      const c = dl[o + 4];
      S.dotMesh.setColorAt(j, col.setRGB(c[0], c[1], c[2]));
    }
    S.dotMesh.count = Math.min(nd, S.dotMesh.instanceMatrix.count);
    S.dotMesh.instanceMatrix.needsUpdate = true;
    if (S.dotMesh.instanceColor) S.dotMesh.instanceColor.needsUpdate = true;
    S.near = nNear;
    S.drawn = nAll;
    S.nDots = S.dotMesh.count;
    markDirty();
  }
  // ---------- each frame ----------
  function tick(x, y, doy) {
    if (!S.on || !S.sp.length) {
      if (S.G) S.G.visible = false;
      return;
    }
    if (S.G) S.G.visible = true;
    // a cell placed per frame (its map just came)
    for (const c of BWKARTE.cells.values())
      if (c.state === 'ok' && c.shrubs === undefined) {
        place(c);
        break;
      }
    // a kind built per frame (the nearest needed first – the queue is filled nearest first)
    if (S.queue.length) buildOne();
    if (Math.floor(doy) !== Math.floor(S.doy)) {
      S.doy = doy;
      S.dirty = true;
    }
    if (S.dirty || !(Math.hypot(x - S.cx, y - S.cy) < 20)) rebuild(x, y, Math.floor(S.doy));
  }
  function set(o = {}) {
    if (o.on !== undefined) S.on = !!o.on;
    if (Number.isFinite(o.r)) S.R = o.r;
    if (Number.isFinite(o.cap)) S.cap = o.cap;
    if (Number.isFinite(o.near)) S.NEAR = o.near;
    S.dirty = true;
  }
  const state = () => {
    let cells = 0,
      placed = 0;
    for (const c of BWKARTE.cells.values())
      if (c.shrubs) {
        cells++;
        placed += c.shrubs.length / 6;
      }
    return {
      on: S.on,
      sp: S.sp.length,
      cells,
      placed,
      near: S.near,
      drawn: S.drawn,
      kinds: Object.keys(S.kinds).filter(k => S.kinds[k] !== 'fail').length,
      failed: Object.keys(S.kinds).filter(k => S.kinds[k] === 'fail'),
      queue: S.queue.length,
      dots: S.nDots,
      R: S.R,
      err: S.err,
    };
  };
  Object.assign(S, { fromArten, tick, set, state, leaves, dots });
  return S;
})();
if (typeof window !== 'undefined') window.BWSTRAUCH = BWSTRAUCH;
