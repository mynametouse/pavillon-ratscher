// Suhl runtime: the buildings and trees of the city, streamed in level-10 tiles (400 m) around the observer.
// Level 1 (to 700 m, phones 500 m): every building with facades and roof, drawn by the village's own wall and roof programs
// (world/village.js) – the geometry comes from the worker (lazy/suhl/bau/), each mesh with its tile's centre as origin.
// Level 2 (to 3 500 m, phones 2 000 m): walls and roof faces with one colour each, one lean program for the whole city.
// From above the level follows the height of the picture (to 600 m level 1, beyond level 2).
// Trees (to 600 m): crossed cards from the atlas of the garden's tree models (world/ratscher.js far trees: its material and
// geometry, no new program), instanced per tile; the nearest ones (to 60 m, phones 40 m) as the garden's generated 3D trees instead.
// Nothing is built in a long frame: the worker makes the buffers, the main thread takes one finished tile per frame.
// Collisions: the wall feet of the level-1 tiles and the trunks in an 8 m hash (KERN.pushOut).
import { tsize, hh, inRing, own, ROOT_E0, ROOT_N0 } from './geo.js';
export function stadt(ctx, G, IX, worker, opt) {
  const { THREE, scene, markDirty, RATSCHER, VILLAGE, TREES, COARSE } = ctx,
    gp = IX.prod.g || IX.prod.gebaeude,
    bp = IX.prod.b || IX.prod.gruen,
    bodenPath = IX.prod.boden && IX.prod.boden.index ? IX.prod.boden.path : null,
    R1 = COARSE ? 500 : 700,
    R2 = COARSE ? 2000 : 3500,
    RT = COARSE ? 420 : 600,
    S = {
      on: !!(gp && gp.index) || !!(bp && bp.index),
      tiles: new Map(),
      n: { built: 0, freed: 0, err: 0, req: 0 },
      ms: [],
      patch: {},
      extra: new Map(),
      R: [R1, R2, RT],
      lastErr: '',
    },
    gSet = gp && gp.sets[10],
    bSet = bp && bp.sets[10],
    // the frame of the records' positions: tile-local model metres (the worker reads it from each tile: its field o)
    gFrame = gp && gp.index && (gp.index.frame === 'utm' || gp.index.frame === 'abs') ? gp.index.frame : 'modell';
  // ---- materials: the village's (level 1), one of our own (level 2) ----
  const wallM = () => RATSCHER.bld && RATSCHER.bld[0] && RATSCHER.bld[0].material,
    roofM = () => VILLAGE.meshes && VILLAGE.meshes[0] && VILLAGE.meshes[0].material;
  let farM = null;
  const farMat = () => {
    if (farM) return farM;
    farM = own(
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0, envMapIntensity: 0.6 }),
      'mat'
    );
    farM.customProgramCacheKey = () => 'suhl-fern';
    return farM;
  };
  S.matsReady = () => !!(VILLAGE.ready && wallM() && roofM());
  // compiled before the first mesh is seen (render/render.js warmUp): one triangle with the far material
  S.warm = () => {
    if (S.warmed) return;
    S.warmed = true;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 1, 0, 0, 0, 1, 0], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute([1, 1, 1, 1, 1, 1, 1, 1, 1], 3));
    const m = new THREE.Mesh(g, farMat());
    m.position.set(0, -500, 0);
    scene.add(m);
    try {
      ctx.warmUp(m);
    } finally {
      scene.remove(m);
      g.dispose();
    }
  };
  // ---- tiles ----
  const tileOf = (x, y) => {
    const k = x + '/' + y;
    let t = S.tiles.get(k);
    if (!t) {
      const T = G.tile(10, x, y);
      S.tiles.set(
        k,
        (t = {
          k,
          x,
          y,
          T,
          lvl: 0,
          want: 0,
          busy: false,
          meshes: [],
          segs: null,
          recs: null,
          foot: null,
          ids: null,
          tr: null,
          trBusy: false,
          trWant: false,
          d: 1e9,
          gen: 0,
        })
      );
    }
    return t;
  };
  if (gSet) gSet.each((x, y) => (tileOf(x, y).g = true));
  if (bSet) bSet.each((x, y) => (tileOf(x, y).b = true));
  const urlG = t => gp.path + '10/' + t.x + '/' + t.y + '.json',
    urlB = t => bp.path + '10/' + t.x + '/' + t.y + '.bin',
    urlT = t => (bodenPath ? bodenPath + 't/10/' + t.x + '/' + t.y + '.bin' : null);
  const mesh = (geo, mat, t, name) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(t.T.cx, 0, -t.T.cy);
    m.name = 'suhl ' + name + ' ' + t.k;
    m.userData.noMerge = true;
    m.castShadow = m.receiveShadow = false;
    m.updateMatrixWorld();
    scene.add(m);
    return m;
  };
  const geoOf = (A, sizes) => {
    const g = new THREE.BufferGeometry();
    for (const [k, a] of Object.entries(A)) {
      if (k === 'index') g.setIndex(new THREE.BufferAttribute(a, 1));
      else g.setAttribute(k, new THREE.BufferAttribute(a, sizes[k] || 4));
    }
    g.computeBoundingSphere();
    return own(g, 'geo');
  };
  const SZ = { position: 3, normal: 3, aTan: 3, uv: 2, color: 3 };
  function dropMeshes(t) {
    for (const m of t.meshes) {
      scene.remove(m);
      m.geometry.dispose();
    }
    t.meshes = [];
  }
  // a finished answer of the worker becomes the tile's meshes (the old level goes at the same moment: no hole)
  function install(t, r, level) {
    const t0 = performance.now();
    dropMeshes(t);
    if (level === 1) {
      if (r.walls.position.length) t.meshes.push(mesh(geoOf(r.walls, SZ), wallM(), t, 'walls'));
      if (r.roofs.position.length) t.meshes.push(mesh(geoOf(r.roofs, SZ), roofM(), t, 'roofs'));
    } else if (r.far.position.length) t.meshes.push(mesh(geoOf(r.far, SZ), farMat(), t, 'fern'));
    t.lvl = level;
    t.segs = level === 1 ? r.segs : null;
    t.foot = r.foot;
    if (r.recs) {
      t.recs = r.recs;
      t.head = r.head || null;
      t.ids = new Map(r.recs.map((b, i) => [String(b.id), i]));
    }
    t.frame = r.frame || gFrame;
    t.off = r.off || 0;
    t.nb = r.n;
    t.bad = r.bad;
    t.gone = r.gone || 0;
    S.n.built++;
    S.ms.push(Math.round((performance.now() - t0) * 10) / 10);
    if (S.ms.length > 40) S.ms.shift();
    gridDirty = true;
    markDirty(true);
    ctx.KERN.emit('suhl:tile', { key: '10/' + t.k, level, on: true });
  }
  function free(t) {
    if (!t.lvl && !t.meshes.length) return;
    dropMeshes(t);
    const was = t.lvl;
    t.lvl = 0;
    t.segs = null;
    t.gen++;
    S.n.freed++;
    gridDirty = true;
    markDirty(true);
    ctx.KERN.emit('suhl:tile', { key: '10/' + t.k, level: was, on: false });
  }
  const READY = []; // answers waiting for their frame
  function ask(t, level) {
    t.busy = true;
    t.dirty = false;
    const gen = t.gen;
    S.n.req++;
    worker
      .ask({
        op: 'bau',
        url: urlG(t),
        turl: urlT(t),
        frame: gFrame,
        tile: { e0: t.T.e0, n0: t.T.n0, s: t.T.s, cx: t.T.cx, cy: t.T.cy },
        level,
        z0ok: opt.z0ok(),
        old: opt.old,
        patch: S.patch,
        extra: S.extra.get(t.k) || null,
        recs: !t.recs || t.recsDirty,
      })
      .then(r => {
        t.busy = false;
        t.recsDirty = false;
        if (gen !== t.gen) return;
        READY.push([t, r, level]);
      })
      .catch(e => {
        t.busy = false;
        t.err = String((e && e.message) || e);
        if (/worker stopped/.test(t.err)) return;
        S.lastErr = t.err;
        S.n.err++;
      });
  }
  // ---- trees: crossed cards of the tree atlas (the far trees of world/ratscher.js), one instanced mesh per tile ----
  let treeRev = 0; // counts the tiles whose trees came or went (the near trees are chosen again then)
  const TK = ['oakA', 'ash', 'oakB', 'aspen', 'pine'];
  let atlas = null;
  function treeKit() {
    if (atlas !== null) return atlas;
    const src = RATSCHER.trees && RATSCHER.trees[0];
    if (!src || !src.geometry || !src.material || TK.some(k => !TREES[k] || !TREES[k].bg || !TREES[k].lg)) return null;
    // the share of the atlas cell a tree fills (as treeAtlas() of world/ratscher.js measures it)
    const info = TK.map(k => {
      const K = TREES[k],
        bb = new THREE.Box3();
      for (const g of [K.bg, K.lg]) {
        if (!g.boundingBox) g.computeBoundingBox();
        bb.union(g.boundingBox);
      }
      const sz = bb.getSize(new THREE.Vector3()),
        hw = (Math.max(sz.x, sz.z) / 2) * 1.02,
        H = sz.y * 1.02,
        s = Math.max(hw * 2, H);
      return { w: (hw * 2) / s, h: H / s };
    });
    atlas = { geo: src.geometry, mat: src.material, info };
    return atlas;
  }
  function installTrees(t, r) {
    const K = treeKit();
    t.trBusy = false;
    if (!K || !r.n) {
      t.tr = { mesh: null, n: 0, xy: null };
      return;
    }
    const a = r.trees,
      n = r.n,
      g = own(K.geo.clone(), 'geo'),
      kk = new Float32Array(n);
    g.setAttribute('aKind', new THREE.InstancedBufferAttribute(kk, 1));
    const im = new THREE.InstancedMesh(g, K.mat, n),
      m4 = new THREE.Matrix4(),
      q = new THREE.Quaternion(),
      up = new THREE.Vector3(0, 1, 0),
      sv = new THREE.Vector3(),
      pv = new THREE.Vector3(),
      c = new THREE.Color(),
      xy = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const x = a[i * 7],
        y = a[i * 7 + 1],
        z = a[i * 7 + 2],
        h = a[i * 7 + 3],
        rr = a[i * 7 + 4],
        art = a[i * 7 + 5],
        hs = a[i * 7 + 6],
        kind = art >= 1 && art <= 5 ? 4 : Math.floor(hs * 3.999),
        I = K.info[kind],
        asp = I.w / I.h,
        sy = h / I.h,
        wv = Math.min(Math.max(rr * 2, h * asp * 0.75), h * asp * 1.35),
        sx = wv / I.w;
      q.setFromAxisAngle(up, hs * 6.283);
      m4.compose(pv.set(x, z - 0.3, -y), q, sv.set(sx, sy, sx));
      im.setMatrixAt(i, m4);
      kk[i] = kind;
      im.setColorAt(
        i,
        c
          .setRGB(1, 1, 1)
          .offsetHSL((hs - 0.5) * 0.04, 0, (hs - 0.5) * 0.1)
          .multiplyScalar(kind === 4 ? 0.82 : 1)
      );
      xy[i * 3] = t.T.cx + x;
      xy[i * 3 + 1] = t.T.cy + y;
      xy[i * 3 + 2] = art === 30 ? 0 : Math.min(0.45, 0.12 + h * 0.012); // trunk radius for the collisions (a shrub has none)
    }
    im.position.set(t.T.cx, 0, -t.T.cy);
    im.name = 'suhl baeume ' + t.k;
    im.userData.noMerge = true;
    im.castShadow = im.receiveShadow = false;
    im.updateMatrixWorld();
    im.computeBoundingSphere();
    scene.add(im);
    t.tr = { mesh: im, n, xy, a };
    treeRev++;
    gridDirty = true;
    markDirty(true);
  }
  function askTrees(t) {
    t.trBusy = true;
    worker
      .ask({
        op: 'baum',
        url: urlB(t),
        turl: urlT(t),
        tile: { e0: t.T.e0, n0: t.T.n0, s: t.T.s, cx: t.T.cx, cy: t.T.cy },
      })
      .then(r => {
        if (!t.trWant) t.trBusy = false;
        else READY.push([t, r, 'tr']);
      })
      .catch(e => {
        t.trBusy = false;
        t.tr = { mesh: null, n: 0, xy: null, err: String((e && e.message) || e) };
        S.lastErr = t.tr.err;
      });
  }
  function freeTrees(t) {
    if (!t.tr) return;
    for (const k of [...NEAR.hidden.keys()]) if (NEAR.hidden.get(k).t === t) NEAR.hidden.delete(k);
    treeRev++;
    if (t.tr.mesh) {
      scene.remove(t.tr.mesh);
      t.tr.mesh.geometry.dispose();
      t.tr.mesh.dispose();
    }
    t.tr = null;
    gridDirty = true;
    markDirty(true);
  }
  // ---- near trees in 3D: within NEAR_R of the observer the nearest NEAR_N trees as the garden's generated trees (TREES[k]: the mid
  // bark and the thinned crown the village draws near its houses – their materials, no new program); their cards are folded away. One
  // instanced pair per kind (bark and crown share the matrices), filled again when the observer moved; not from above. ----
  const NEAR_R = COARSE ? 40 : 60,
    NEAR_N = COARSE ? 24 : 48,
    NEAR = { by: new Map(), hidden: new Map(), key: '', n: 0, at: [1e9, 1e9] },
    ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
  function nearKind(k) {
    let m = NEAR.by.get(k);
    if (m) return m;
    const K = TREES[TK[k]];
    if (!K || !K.bark || !K.leaf) return null;
    const ib = new THREE.InstancedMesh(K.bgMid || K.bg, K.bark, NEAR_N),
      il = new THREE.InstancedMesh(K.lgFar || K.lg, K.leaf, NEAR_N);
    il.instanceMatrix = ib.instanceMatrix;
    for (const im of [ib, il]) {
      im.count = 0;
      im.visible = false;
      im.frustumCulled = false; // the pair moves with the observer; a few dozen trees around it are in view anyway
      im.castShadow = im.receiveShadow = false;
      im.userData.noMerge = true;
      im.name = 'suhl baeume nah ' + TK[k];
      scene.add(im);
    }
    il.setColorAt(0, new THREE.Color(1, 1, 1));
    m = { K, ib, il };
    NEAR.by.set(k, m);
    return m;
  }
  function nearTrees(o, off) {
    const [ox, oy] = o;
    if (off ? !NEAR.n && !NEAR.hidden.size : Math.hypot(ox - NEAR.at[0], oy - NEAR.at[1]) < 3 && NEAR.key === treeRev) return;
    NEAR.at = [ox, oy];
    NEAR.key = treeRev;
    const pick = [];
    if (!off)
      for (const t of S.tiles.values()) {
        if (!t.tr || !t.tr.mesh || t.d > NEAR_R + 300) continue;
        const a = t.tr.a;
        for (let i = 0; i < t.tr.n; i++) {
          if (a[i * 7 + 5] === 30) continue; // shrubs stay cards
          const d = Math.hypot(t.T.cx + a[i * 7] - ox, t.T.cy + a[i * 7 + 1] - oy);
          if (d < NEAR_R) pick.push([d, t, i]);
        }
      }
    pick.sort((p, q) => p[0] - q[0]);
    if (pick.length > NEAR_N) pick.length = NEAR_N;
    const want = new Map(pick.map(([, t, i]) => [t.k + ':' + i, [t, i]])),
      dirty = new Set();
    // the cards: back where a tree left the near ring, folded away where one came
    for (const [key, h] of NEAR.hidden)
      if (!want.has(key)) {
        if (h.t.tr && h.t.tr.mesh) {
          h.t.tr.mesh.setMatrixAt(h.i, h.m);
          dirty.add(h.t.tr.mesh);
        }
        NEAR.hidden.delete(key);
      }
    const m4 = new THREE.Matrix4();
    for (const [key, [t, i]] of want)
      if (!NEAR.hidden.has(key)) {
        t.tr.mesh.getMatrixAt(i, m4);
        NEAR.hidden.set(key, { t, i, m: m4.clone() });
        t.tr.mesh.setMatrixAt(i, ZERO);
        dirty.add(t.tr.mesh);
      }
    for (const im of dirty) im.instanceMatrix.needsUpdate = true;
    // the 3D trees, kind by kind
    const cnt = new Map(),
      q = new THREE.Quaternion(),
      up = new THREE.Vector3(0, 1, 0),
      sv = new THREE.Vector3(),
      pv = new THREE.Vector3(),
      c = new THREE.Color();
    for (const [, t, i] of pick) {
      const a = t.tr.a,
        art = a[i * 7 + 5],
        hs = a[i * 7 + 6],
        kind = art >= 1 && art <= 5 ? 4 : Math.floor(hs * 3.999),
        M = nearKind(kind);
      if (!M) continue;
      const j = cnt.get(kind) || 0;
      if (j >= NEAR_N) continue;
      const h = a[i * 7 + 3],
        rr = a[i * 7 + 4],
        sy = h / M.K.H,
        sx = THREE.MathUtils.clamp(rr / M.K.R, sy * 0.75, sy * 1.3);
      q.setFromAxisAngle(up, hs * 6.283);
      m4.compose(pv.set(t.T.cx + a[i * 7], a[i * 7 + 2] - 0.1, -(t.T.cy + a[i * 7 + 1])), q, sv.set(sx, sy, sx));
      M.ib.setMatrixAt(j, m4);
      M.il.setColorAt(j, c.setRGB(1, 1, 1).multiplyScalar(0.84 + hs * 0.2));
      cnt.set(kind, j + 1);
    }
    let n = 0;
    for (const [k, M] of NEAR.by) {
      M.ib.count = M.il.count = cnt.get(k) || 0;
      M.ib.visible = M.il.visible = M.ib.count > 0; // an empty pair costs no draw call
      n += M.ib.count;
      M.ib.instanceMatrix.needsUpdate = true;
      if (M.il.instanceColor) M.il.instanceColor.needsUpdate = true;
    }
    NEAR.n = n;
    markDirty(true);
  }
  function freeNear() {
    for (const h of NEAR.hidden.values()) if (h.t.tr && h.t.tr.mesh) h.t.tr.mesh.setMatrixAt(h.i, h.m);
    NEAR.hidden.clear();
    for (const M of NEAR.by.values()) {
      scene.remove(M.ib);
      scene.remove(M.il);
      M.ib.dispose();
      M.il.dispose(); // (the geometries and materials are the garden's: not disposed)
    }
    NEAR.by.clear();
    NEAR.key = '';
    NEAR.n = 0;
    NEAR.at = [1e9, 1e9];
  }
  // ---- collisions: wall feet (level 1) and trunks in an 8 m hash, rebuilt when a tile came or went ----
  let gridDirty = false;
  const GRID = new Map(),
    SEG = [],
    TRUNK = [];
  function grid() {
    gridDirty = false;
    GRID.clear();
    SEG.length = 0;
    TRUNK.length = 0;
    const put = (i, j, v) => {
      const k = i + ',' + j;
      let a = GRID.get(k);
      if (!a) GRID.set(k, (a = []));
      a.push(v);
    };
    for (const t of S.tiles.values()) {
      if (t.segs)
        for (let k = 0; k + 3 < t.segs.length; k += 4) {
          const s = [t.T.cx + t.segs[k], t.T.cy + t.segs[k + 1], t.T.cx + t.segs[k + 2], t.T.cy + t.segs[k + 3]],
            n = SEG.push(s) - 1;
          for (let i = Math.floor(Math.min(s[0], s[2]) / 8); i <= Math.floor(Math.max(s[0], s[2]) / 8); i++)
            for (let j = Math.floor(Math.min(s[1], s[3]) / 8); j <= Math.floor(Math.max(s[1], s[3]) / 8); j++)
              put(i, j, n);
        }
      if (t.tr && t.tr.xy)
        for (let k = 0; k + 2 < t.tr.xy.length; k += 3) {
          if (!t.tr.xy[k + 2]) continue;
          const n = TRUNK.push([t.tr.xy[k], t.tr.xy[k + 1], t.tr.xy[k + 2]]) - 1;
          put(Math.floor(t.tr.xy[k] / 8), Math.floor(t.tr.xy[k + 1] / 8), -1 - n);
        }
    }
  }
  S.pushOut = (p, r) => {
    if (gridDirty) grid();
    if (!SEG.length && !TRUNK.length) return undefined;
    let moved = false;
    const ci = Math.floor(p[0] / 8),
      cj = Math.floor(p[1] / 8);
    for (let i = ci - 1; i <= ci + 1; i++)
      for (let j = cj - 1; j <= cj + 1; j++) {
        const a = GRID.get(i + ',' + j);
        if (!a) continue;
        for (const k of a) {
          let qx,
            qy,
            rr = r;
          if (k < 0) {
            const tk = TRUNK[-1 - k];
            qx = tk[0];
            qy = tk[1];
            rr = r + tk[2];
          } else {
            const s = SEG[k],
              ex = s[2] - s[0],
              ey = s[3] - s[1],
              l2 = ex * ex + ey * ey || 1,
              u = Math.max(0, Math.min(1, ((p[0] - s[0]) * ex + (p[1] - s[1]) * ey) / l2));
            qx = s[0] + ex * u;
            qy = s[1] + ey * u;
          }
          const dx = p[0] - qx,
            dy = p[1] - qy,
            d = Math.hypot(dx, dy);
          if (d < rr && d > 1e-6) {
            p[0] = qx + (dx / d) * rr;
            p[1] = qy + (dy / d) * rr;
            moved = true;
          }
        }
      }
    return moved ? true : undefined;
  };
  // ---- the loop ----
  let acc = 1;
  const WAIT = [];
  S.tick = (dt, o, top) => {
    acc += dt;
    // one finished tile per frame (the worker made the buffers; here only the meshes are put together)
    if (READY.length && S.matsReady()) {
      const [t, r, level] = READY.shift();
      if (level === 'tr') {
        if (t.trWant) installTrees(t, r);
        else t.trBusy = false;
      } else if (t.want === level || (!t.lvl && t.want)) install(t, r, level);
      return;
    }
    if (acc < 0.25) return;
    acc = 0;
    const [E, N] = G.toU(o[0], o[1]),
      k = 1 / G.k,
      // from above: the picture's height decides (to 600 m the houses in full, beyond that the lean ones over everything in view)
      r1 = top ? (top <= 600 ? top * 0.9 + 250 : 0) : R1,
      r2 = top ? Math.max(R2, top * 1.3) : R2,
      rt = top ? (top <= 600 ? top * 0.9 + 250 : 0) : RT;
    let jobs = worker.busy();
    const cand = [];
    for (const t of S.tiles.values()) {
      const d = G.dist(10, t.x, t.y, E, N) / k;
      t.d = d;
      if (t.g) {
        // hysteresis: a level stays until the observer is a quarter further away than where it came
        const w = d < (t.lvl === 1 ? r1 * 1.25 : r1) ? 1 : d < (t.lvl ? r2 * 1.15 : r2) ? 2 : 0;
        t.want = w;
        if (!w) {
          if (t.busy) t.gen++;
          free(t);
        } else if ((w !== t.lvl || t.dirty) && !t.busy) cand.push([d + (w === 1 ? 0 : 5000), t, w]);
      }
      if (t.b) {
        const w = d < (t.tr ? rt * 1.25 : rt);
        t.trWant = w;
        if (!w && t.tr) freeTrees(t);
        else if (w && !t.tr && !t.trBusy) cand.push([d + 2500, t, 'tr']);
      }
    }
    nearTrees(o, !!top);
    cand.sort((a, b) => a[0] - b[0]);
    for (const [, t, w] of cand) {
      if (jobs >= 3 || READY.length > 4) break;
      if (w === 'tr') askTrees(t);
      else ask(t, w);
      jobs++;
    }
    // waits of SUHL.whenLevel
    for (let i = WAIT.length - 1; i >= 0; i--) {
      const w = WAIT[i],
        lv = S.levelAt(w.x, w.y);
      if (lv > 0 && lv <= w.n) {
        WAIT.splice(i, 1);
        w.res(lv);
      }
    }
  };
  S.levelAt = (x, y) => {
    const [tx, ty] = G.at(10, x, y),
      t = S.tiles.get(tx + '/' + ty);
    return t && t.lvl ? t.lvl : -1;
  };
  S.whenLevel = (x, y, n) =>
    new Promise(res => {
      const lv = S.levelAt(x, y);
      if (lv > 0 && lv <= n) res(lv);
      else WAIT.push({ x, y, n, res });
    });
  // ---- records ----
  // the view of a record the contract SUHL.* promises (docs/plans/plan_suhl.md 6.1), from the fields of the data contract
  // (docs/features/suhl-daten.md section 5); positions in model metres, heights as model z or metres above the foot as named
  const COVERS = [
    'ziegel_rot',
    'faserzement',
    'blech',
    'schiefer',
    'flach',
    'ziegel_dunkel',
    'betonstein',
    'gruendach',
    'glas',
  ];
  // what stands in the world: not the records of buildings no longer standing (fg 32), not what a scenario took away
  const stands = b => !(b.fg & 32) && !(S.patch[b.id] && S.patch[b.id].hidden);
  function view(t, i) {
    const b = t.recs[i],
      ox = b._abs ? 0 : t.T.cx,
      oy = b._abs ? 0 : t.T.cy,
      map = (x, y) => [ox + x, oy + y],
      ring = f => {
        const o = [];
        for (let k = 0; k + 1 < f.length; k += 2) o.push(map(f[k], f[k + 1]));
        return o;
      },
      pts = ring(b.f),
      z0 = t.foot && stands(b) ? t.foot[i * 4 + 2] : (b.z0 ?? 0),
      fat = (t.head && t.head.fat) || [],
      fas = b.fas || b.x_fa || null,
      fa = fas ? Object.assign({}, fat[fas.t] || {}, fas) : null,
      fg = b.fg | 0,
      d = b.d || {};
    // sides: one per wall of F with what S says of it; a record without walls: the edges of its footprint
    const sides = [];
    if (Array.isArray(b.F))
      b.F.forEach((q, n) => {
        const A = map(q[0], q[1]),
          B = map(q[2], q[3]),
          own = (Array.isArray(b.S) && b.S[n]) || null;
        sides.push({
          a: A,
          b: B,
          len: Math.hypot(B[0] - A[0], B[1] - A[1]),
          top: [q[4], q[7]],
          apex: [q[5], q[6]],
          party: !!(q[8] & 1),
          gable: q[6] > Math.max(q[4], q[7]) + 0.3,
          court: !!(own && own.hof),
          street: own && own.st ? own.st : null,
          streetDist: own && own.sd !== undefined ? own.sd : q[9] < 99 ? q[9] : null,
          eg: own && own.eg ? own.eg : null,
          signs: own && own.sign ? own.sign : [],
          params: fa ? (own ? Object.assign({}, fa, own) : fa) : null,
          q: own && own.q !== undefined ? own.q : fa && fa.q !== undefined ? fa.q : 0,
        });
      });
    else
      for (let k = 0; k < pts.length; k++) {
        const A = pts[k],
          B = pts[(k + 1) % pts.length];
        sides.push({
          a: A,
          b: B,
          len: Math.hypot(B[0] - A[0], B[1] - A[1]),
          top: [b.e, b.e],
          apex: [0.5, b.e],
          party: false,
          gable: false,
          court: false,
          street: null,
          streetDist: null,
          eg: null,
          signs: [],
          params: fa,
          q: 0,
        });
      }
    // roof faces: the outline of each (model x, y and model z), with the numbers the pipeline computed in UTM (true m², true north)
    const rv = b.rv || [],
      corner = k => [...map(rv[k * 3], rv[k * 3 + 1]), z0 + rv[k * 3 + 2]],
      roof = (Array.isArray(b.R) && b.R.length ? b.R : [{}]).map(r => {
        const P = [];
        if (r.vi) for (let k = r.vi[0]; k < r.vi[0] + r.vi[1]; k++) P.push(corner(k));
        else if (rv.length && !b.R) for (let k = 0; k < rv.length / 3; k++) P.push(corner(k));
        else for (const q of pts) P.push([q[0], q[1], z0 + (b.e || 0)]);
        const c = r.c === undefined ? b.rk : r.c;
        return {
          pts: P,
          tris: r.ti ? (b.rt || []).slice(r.ti[0] * 3, (r.ti[0] + r.ti[1]) * 3) : null,
          area: r.a ?? null,
          areaPlan: r.ap ?? null,
          az: r.az ?? null,
          slope: r.sl ?? (b.r === 0 ? 0 : (b.p ?? null)),
          cls: COVERS[c] || null,
          col: r.col || b.rc || null,
        };
      });
    return {
      id: String(b.id),
      osm: b.osm || null,
      name: b.n || null,
      adr: b.adr || null,
      use: b.use ?? null,
      groundUse: b.eg ?? null,
      fn: b.fkt ?? null,
      typ: b.bt ?? null,
      era: b.era ?? null,
      year: b.yr ?? null,
      kind: b.k ?? null,
      quarter: b.vt || null,
      part: b.teil || b.x_teil || null,
      landmark: b.lm || b.x_lm || null,
      pts,
      holes: (Array.isArray(b.fh) ? b.fh : []).map(ring),
      z0,
      eave: b.e ?? null,
      h: b.h ?? null,
      levels: b.lv ?? (fa && fa.lv) ?? d.lv ?? (Number.isFinite(b.e) ? Math.max(1, Math.round(b.e / 2.9)) : null),
      roofForm: b.r ?? null,
      roof,
      sides,
      flags: {
        landmark: !!(fg & 1),
        listed: !!(fg & 2),
        enter: !!(fg & 4),
        vacant: !!(fg & 8),
        demolition: !!(fg & 16),
        gone: !!(fg & 32),
        cadastreOnly: !!(fg & 64),
        isNew: !!(fg & 128),
      },
      q: b.q || {},
      tile: '10/' + t.k,
      raw: b,
    };
  }
  const find = id => {
    id = String(id);
    for (const t of S.tiles.values())
      if (t.ids) {
        let i = t.ids.get(id);
        if (i === undefined && /^(way|relation)\//.test(id)) i = t.recs.findIndex(b => b.osm === id);
        if (i !== undefined && i >= 0) return [t, i];
      }
    return null;
  };
  S.building = id => {
    const f = find(id);
    return f ? view(f[0], f[1]) : null;
  };
  S.buildingAt = (x, y) => {
    const [tx, ty] = G.at(10, x, y);
    // a building lies in one tile, but a point of it may lie in the neighbour's square
    for (let i = tx - 1; i <= tx + 1; i++)
      for (let j = ty - 1; j <= ty + 1; j++) {
        const t = S.tiles.get(i + '/' + j);
        if (!t || !t.recs) continue;
        for (let n = 0; n < t.recs.length; n++) {
          if (!stands(t.recs[n])) continue;
          const v = view(t, n),
            f = [];
          for (const p of v.pts) f.push(p[0], p[1]);
          if (inRing(f, x, y)) return v;
        }
      }
    return null;
  };
  S.buildingsIn = area => {
    const A = typeof area === 'string' ? opt.areas()[area] : area,
      out = [];
    if (!A) return out;
    const c = A.center || [A.x, A.y],
      r = A.r || 0;
    for (const t of S.tiles.values())
      if (t.recs && t.foot)
        t.recs.forEach((b, i) => {
          if (!stands(b)) return;
          const x = t.T.cx + t.foot[i * 4],
            y = t.T.cy + t.foot[i * 4 + 1];
          if (A.poly ? inRing(A.poly.flat(), x, y) : Math.hypot(x - c[0], y - c[1]) <= r) out.push(String(b.id));
        });
    return out;
  };
  // a scenario changes a building: the tile is made again (the old meshes stay until the new ones are in)
  const again = id => {
    const f = find(id);
    if (f) f[0].dirty = true;
    ctx.KERN.emit('suhl:changed', { id: String(id) });
  };
  S.override = (id, patch) => {
    S.patch[id] = Object.assign({}, S.patch[id], patch);
    again(id);
  };
  S.reset = id => {
    const ids = id === undefined ? Object.keys(S.patch) : [id];
    for (const k of ids) {
      delete S.patch[k];
      again(k);
    }
  };
  // a new building of a scenario: a record in absolute model metres (f, e, h, optional F, rv, rt …), id 'neu-…'
  S.add = rec => {
    let cx = 0,
      cy = 0;
    for (let k = 0; k + 1 < rec.f.length; k += 2) {
      cx += (rec.f[k] * 2) / rec.f.length;
      cy += (rec.f[k + 1] * 2) / rec.f.length;
    }
    const [tx, ty] = G.at(10, cx, cy),
      t = tileOf(tx, ty),
      L = S.extra.get(t.k) || [];
    L.push(Object.assign({}, rec, { _abs: true }));
    S.extra.set(t.k, L);
    t.g = true;
    t.recsDirty = t.dirty = true;
    ctx.KERN.emit('suhl:changed', { id: String(rec.id) });
    return String(rec.id);
  };
  S.remove = id => {
    for (const [k, L] of S.extra) {
      const i = L.findIndex(b => String(b.id) === String(id));
      if (i < 0) continue;
      L.splice(i, 1);
      const t = S.tiles.get(k);
      t.recsDirty = t.dirty = true;
      ctx.KERN.emit('suhl:changed', { id: String(id) });
    }
  };
  S.leave = () => {
    freeNear();
    for (const t of S.tiles.values()) {
      t.gen++;
      free(t);
      freeTrees(t);
      t.trBusy = false;
      t.busy = false;
      t.want = 0;
      t.trWant = false;
      t.recs = t.ids = t.foot = null;
    }
    READY.length = 0;
    if (farM) farM.dispose();
    farM = null;
    S.warmed = false;
    grid();
  };
  S.state = () => {
    if (gridDirty) grid(); // (the counts of wall feet and trunks below are those of the collision grid)
    const L = [...S.tiles.values()],
      lv = n => L.filter(t => t.lvl === n).length,
      // wanted and not there yet (the planning asks for at most three at a time): it counts as work in progress
      pending = t => (t.g && t.want && (t.want !== t.lvl || t.dirty)) || (t.b && t.trWant && !t.tr);
    return {
      tiles: L.length,
      l1: lv(1),
      l2: lv(2),
      trees: L.filter(t => t.tr && t.tr.mesh).length,
      nTrees: L.reduce((n, t) => n + (t.tr ? t.tr.n : 0), 0),
      near3d: NEAR.n,
      buildings: L.reduce((n, t) => n + (t.lvl ? t.nb || 0 : 0), 0),
      bad: L.reduce((n, t) => n + (t.lvl ? t.bad || 0 : 0), 0),
      gone: L.reduce((n, t) => n + (t.lvl ? t.gone || 0 : 0), 0),
      offGround: L.reduce((n, t) => n + (t.lvl ? t.off || 0 : 0), 0),
      z0: opt.z0ok(),
      segs: SEG.length,
      trunks: TRUNK.length,
      queue: READY.length + L.filter(t => t.busy || t.trBusy || pending(t)).length,
      built: S.n.built,
      freed: S.n.freed,
      req: S.n.req,
      err: S.n.err,
      lastErr: S.lastErr,
      installMs: S.ms.length ? Math.max(...S.ms) : 0,
      atlas: !!treeKit(),
      mats: S.matsReady(),
      frame: gFrame,
      R: S.R,
    };
  };
  // the centre of a tile near a point, for tests
  S.tileAt = (x, y) => {
    const [tx, ty] = G.at(10, x, y),
      s = tsize(10);
    return {
      k: tx + '/' + ty,
      has: S.tiles.has(tx + '/' + ty),
      c: G.toM(ROOT_E0 + (tx + 0.5) * s, ROOT_N0 + (ty + 0.5) * s),
      hh: hh(tx + ty),
    };
  };
  return S;
}
