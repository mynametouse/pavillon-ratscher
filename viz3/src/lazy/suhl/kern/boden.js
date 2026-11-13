// Suhl runtime: the ground. Near the observer (levels 10–12, to 760 m) the tiled world of the app draws it (welt/welt.js): Suhl's
// ground product is registered there as one more tile set (hooks W1: a set with its own base address, W2: tile lists instead of
// rectangles). Beyond that Suhl draws the far ground itself from the same product: levels 9, 8, 7, 6 in rings, a tile standing in
// until its four children are there, each quarter of a tile hidden where a finer tile draws (at level 9: where WELT covers) – with the
// material of the near tiles (hook W4: WELT.tileMat), so no new shader program and the same look. The old 120 m terrain of
// world/ratscher.js (it ends at model y = 11 864, in the south of the Kernstadt) sinks where Suhl's ground is drawn (hook W3).
// Far tiles keep absolute model coordinates like WELT's (their shader reads the world position for the road map and the grain).
import { tkey, tsize, ROOT_E0, ROOT_N0 } from './geo.js';
import { bodenSets } from './index.js';
const NS = 51, // vertices per side as drawn
  RING = { 9: 1700, 8: 3400, 7: 6800, 6: 1e9 }, // a tile of level L is wanted within this distance (m, UTM) of the observer
  SKIRT = { 9: 14, 8: 28, 7: 50, 6: 90 },
  FAR_MAX = 9;
export function boden(ctx, G, IX, worker) {
  const { THREE, WELT, scene, markDirty } = ctx,
    pr = IX.prod.boden,
    B = { on: false, sets: {}, far: new Map(), n: { req: 0, ok: 0, err: 0 }, drawn: 0, need: false, lowered: false };
  if (!pr || !pr.index) return B;
  B.on = true;
  B.sets = bodenSets(pr.index);
  B.levels = Object.keys(B.sets)
    .map(Number)
    .sort((a, b) => a - b);
  const farLv = B.levels.filter(L => L <= FAR_MAX),
    Lmin = farLv.length ? farLv[0] : -1,
    Lmax = farLv.length ? farLv[farLv.length - 1] : -1,
    has = (L, x, y) => !!B.sets[L] && B.sets[L].has(x, y);
  B.has = has;
  // the frame of everything the product holds at level 10 (model metres) – how far the observer is from Suhl's ground
  const bb = [1e9, 1e9, -1e9, -1e9];
  if (B.sets[10])
    B.sets[10].each((x, y) => {
      const s = tsize(10);
      for (const [dx, dy] of [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ]) {
        const p = G.toM(ROOT_E0 + (x + dx) * s, ROOT_N0 + (y + dy) * s);
        bb[0] = Math.min(bb[0], p[0]);
        bb[1] = Math.min(bb[1], p[1]);
        bb[2] = Math.max(bb[2], p[0]);
        bb[3] = Math.max(bb[3], p[1]);
      }
    });
  B.bb = bb;
  B.distBox = (x, y) => Math.hypot(Math.max(bb[0] - x, 0, x - bb[2]), Math.max(bb[1] - y, 0, y - bb[3]));
  // one may walk and drive where the ground product has a level-10 tile
  B.covers = (x, y) => {
    const [tx, ty] = G.at(10, x, y);
    return has(10, tx, ty);
  };
  // 0 on Suhl's own ground, 1 from 100 m outside it (welt/fahrt.js must not carve there: hook F1)
  B.ownFade = (x, y) => {
    const [E, N] = G.toU(x, y),
      [tx, ty] = G.at(10, x, y);
    let d = 1e9;
    for (let i = tx - 1; i <= tx + 1; i++)
      for (let j = ty - 1; j <= ty + 1; j++) if (has(10, i, j)) d = Math.min(d, G.dist(10, i, j, E, N));
    const t = Math.min(1, d / 100);
    return t * t * (3 - 2 * t);
  };
  // ---- near: the set in WELT ----
  const SUB = 'suhl/';
  B.sub = SUB;
  let weltSet = null;
  B.register = () => {
    if (weltSet || !WELT.addSet) return;
    weltSet = WELT.addSet(SUB, pr.path);
    if (weltSet) weltSet.base = pr.path; // without hook W1 the set would look below WELT's own base
    if (WELT.lowerAlso === undefined || WELT.lowerAlso === null) WELT.lowerAlso = lowerAlso;
  };
  B.setNeed = on => {
    if (on === B.need) return;
    B.need = on;
    WELT.need('suhl', on, SUB);
  };
  // ---- far tiles ----
  const kids = (x, y) => [
    [2 * x, 2 * y],
    [2 * x + 1, 2 * y],
    [2 * x, 2 * y + 1],
    [2 * x + 1, 2 * y + 1],
  ];
  const mat = tex =>
    WELT.tileMat
      ? WELT.tileMat(tex)
      : new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 1,
          metalness: 0,
          envMapIntensity: 0.55,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 2,
        });
  function geo(t) {
    const n = t.n,
      st = (n - 1) / (NS - 1),
      s = tsize(t.L),
      nv = NS * NS + 4 * NS + 4 * NS,
      pos = new Float32Array(nv * 3),
      uv = new Float32Array(nv * 2);
    for (let j = 0; j < NS; j++)
      for (let i = 0; i < NS; i++) {
        const [x, y] = G.toM(t.e0 + (i / (NS - 1)) * s, t.n0 + (j / (NS - 1)) * s),
          k = j * NS + i;
        pos[k * 3] = x;
        pos[k * 3 + 1] = t.h[Math.round(j * st) * n + Math.round(i * st)];
        pos[k * 3 + 2] = -y;
        uv[k * 2] = i / (NS - 1);
        uv[k * 2 + 1] = j / (NS - 1);
      }
    // skirts: the border and the two middle lines pulled down (a quarter that is hidden leaves no gap to the finer tile there)
    let v = NS * NS;
    const sk = SKIRT[t.L] || 20,
      lines = [],
      line = ks => {
        const first = v;
        for (const k of ks) {
          pos[v * 3] = pos[k * 3];
          pos[v * 3 + 1] = pos[k * 3 + 1] - sk;
          pos[v * 3 + 2] = pos[k * 3 + 2];
          uv[v * 2] = uv[k * 2];
          uv[v * 2 + 1] = uv[k * 2 + 1];
          v++;
        }
        lines.push([ks, first]);
      },
      H = (NS - 1) / 2,
      row = j => Array.from({ length: NS }, (q, i) => j * NS + i),
      col = i => Array.from({ length: NS }, (q, j) => j * NS + i);
    line(row(0));
    line(col(NS - 1));
    line(row(NS - 1));
    line(col(0));
    line(row(H));
    line(col(H));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos.subarray(0, v * 3), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(uv.subarray(0, v * 2), 2));
    t.lines = lines;
    g.setIndex(indexOf(t, 15));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    return g;
  }
  // the triangles of the visible quarters (mask bit q = kid q of kids(): 0 SW, 1 SE, 2 NW, 3 NE) and the skirts along them
  function indexOf(t, mask) {
    const idx = [],
      H = (NS - 1) / 2,
      vis = (i, j) => (mask >> ((j >= H ? 2 : 0) + (i >= H ? 1 : 0))) & 1;
    for (let j = 0; j < NS - 1; j++)
      for (let i = 0; i < NS - 1; i++) {
        if (!vis(i, j)) continue;
        const a = j * NS + i,
          b = a + 1,
          c = a + NS + 1,
          d = a + NS;
        idx.push(a, b, c, a, c, d);
      }
    t.lines.forEach(([ks, first], li) => {
      const inner = li >= 4;
      if (inner && mask === 15) return;
      for (let q = 0; q + 1 < ks.length; q++) {
        // the cell(s) beside this piece of the line: drawn when one of them is visible
        const k = ks[q],
          i = k % NS,
          j = Math.floor(k / NS),
          horiz = li === 0 || li === 2 || li === 4,
          c1 = horiz ? [i, Math.min(NS - 2, j)] : [Math.min(NS - 2, i), j],
          c0 = horiz ? [i, Math.max(0, j - 1)] : [Math.max(0, i - 1), j];
        if (!vis(c0[0], c0[1]) && !vis(c1[0], c1[1])) continue;
        const a = ks[q],
          b = ks[q + 1],
          a2 = first + q,
          b2 = first + q + 1;
        idx.push(a, a2, b2, a, b2, b, a, b2, a2, a, b, b2); // both sides: seen from either quarter
      }
    });
    return idx;
  }
  function request(L, x, y) {
    const k = tkey(L, x, y);
    let t = B.far.get(k);
    if (t) return t;
    const s = tsize(L);
    t = {
      k,
      L,
      x,
      y,
      e0: ROOT_E0 + x * s,
      n0: ROOT_N0 + y * s,
      st: 'wait',
      mesh: null,
      tex: null,
      mask: 15,
      used: 0,
      d: 0,
    };
    B.far.set(k, t);
    return t;
  }
  let busy = 0;
  function pump() {
    if (busy >= 3) return;
    const W = [...B.far.values()].filter(t => t.st === 'wait').sort((a, b) => a.L - b.L || a.d - b.d);
    for (const t of W) {
      if (busy >= 3) break;
      t.st = 'load';
      busy++;
      B.n.req++;
      const hp = worker.ask({ op: 'hoehen', url: pr.path + 't/' + t.k + '.bin' }),
        ip = new Promise((res, rej) =>
          new THREE.TextureLoader().load(pr.path + 'i/' + t.k + '.webp', res, undefined, rej)
        );
      Promise.all([hp, ip])
        .then(([hr, tex]) => {
          busy--;
          if (t.st === 'gone') return tex.dispose();
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.anisotropy = ctx.ANISO || 1;
          tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
          t.n = hr.n;
          t.h = hr.h;
          t.tex = tex;
          const me = new THREE.Mesh(geo(t), mat(tex));
          me.userData.noMerge = true;
          me.castShadow = me.receiveShadow = false;
          me.visible = false;
          me.name = 'suhl fern ' + t.k;
          scene.add(me);
          t.mesh = me;
          t.st = 'ok';
          B.n.ok++;
          dirty = true;
        })
        .catch(e => {
          busy--;
          t.st = t.st === 'gone' ? 'gone' : 'err';
          B.n.err++;
          B.lastErr = String((e && e.message) || e);
        });
    }
  }
  function drop(t) {
    if (t.mesh) {
      scene.remove(t.mesh);
      t.mesh.geometry.dispose();
      t.mesh.material.dispose();
    }
    if (t.tex) t.tex.dispose();
    t.mesh = t.tex = t.h = null;
    t.st = 'gone';
    B.far.delete(t.k);
  }
  // which tiles: the coarsest level around the observer, each refined into those of its children that exist (the municipality is a
  // list of tiles, not a rectangle) and lie within their ring; a quarter without a child stays with the parent
  let wanted = new Set(),
    dirty = false,
    lastKey = '';
  function plan(E, N, range) {
    const W = new Set(),
      now = performance.now();
    if (Lmin < 0) return;
    const refine = (L, x, y) => {
      const t = request(L, x, y);
      t.d = G.dist(L, x, y, E, N);
      t.used = now;
      W.add(t.k);
      if (L >= Lmax) return;
      for (const [a, b] of kids(x, y))
        if (has(L + 1, a, b) && G.dist(L + 1, a, b, E, N) < RING[L + 1]) refine(L + 1, a, b);
    };
    B.sets[Lmin].each((x, y) => {
      if (G.dist(Lmin, x, y, E, N) < range) refine(Lmin, x, y);
    });
    wanted = W;
    for (const t of [...B.far.values()]) if (now - t.used > 20000 && t.st !== 'load') drop(t);
    dirty = true;
  }
  const ok = (L, x, y) => {
    const t = B.far.get(tkey(L, x, y));
    return !!t && t.st === 'ok';
  };
  // WELT draws the whole square of tile (L, x, y) (all its level-10 tiles are covered there)
  function weltOver(L, x, y) {
    if (!WELT.covers) return false;
    const n = 1 << (10 - L),
      s = tsize(10);
    for (let i = 0; i < n; i++)
      for (let j = 0; j < n; j++) {
        const c = G.toM(ROOT_E0 + (x * n + i + 0.5) * s, ROOT_N0 + (y * n + j + 0.5) * s);
        if (!WELT.covers(c[0], c[1])) return false;
      }
    return true;
  }
  function display() {
    let n = 0,
      ch = false;
    const keys = [];
    for (const t of B.far.values()) {
      if (!t.mesh) continue;
      let mask = 15;
      // a quarter is hidden where something finer draws: a wanted child that is there, or the near tiles of WELT
      kids(t.x, t.y).forEach(([a, b], q) => {
        if ((wanted.has(tkey(t.L + 1, a, b)) && ok(t.L + 1, a, b)) || (t.L + 1 <= 10 && weltOver(t.L + 1, a, b)))
          mask &= ~(1 << q);
      });
      // a tile nobody wants any more goes at once when its parent can stand in
      if (!wanted.has(t.k) && (t.L <= Lmin || ok(t.L - 1, t.x >> 1, t.y >> 1))) mask = 0;
      if (mask !== t.mask) {
        t.mask = mask;
        if (mask) t.mesh.geometry.setIndex(indexOf(t, mask));
        ch = true;
      }
      const v = mask !== 0;
      if (t.mesh.visible !== v) {
        t.mesh.visible = v;
        ch = true;
      }
      if (v) {
        n++;
        keys.push(t.k + ':' + mask);
      }
    }
    B.drawn = n;
    const key = keys.sort().join(',');
    if (key !== lastKey) {
      lastKey = key;
      if (WELT.lowerOuter) WELT.lowerOuter();
      ch = true;
    }
    if (ch) markDirty(true);
  }
  // a far tile is drawn at (x, y) – or WELT covers it: the old terrain may sink there
  const drawnAt = (x, y) => {
    if (WELT.covers && WELT.covers(x, y)) return true;
    const [E, N] = G.toU(x, y);
    for (let L = Lmax; L >= Lmin && L >= 0; L--) {
      const s = tsize(L),
        t = B.far.get(tkey(L, Math.floor((E - ROOT_E0) / s), Math.floor((N - ROOT_N0) / s)));
      if (t && t.st === 'ok') return true;
    }
    return false;
  };
  function lowerAlso(x, y) {
    if (!B.far.size) return false;
    return (
      drawnAt(x - 130, y - 130) && drawnAt(x + 130, y - 130) && drawnAt(x - 130, y + 130) && drawnAt(x + 130, y + 130)
    );
  }
  // the height of the far ground at a point (the finest far tile loaded there) – a ground before the near tiles are in
  B.heightFar = (x, y) => {
    const [E, N] = G.toU(x, y);
    for (let L = Lmax; L >= Lmin && L >= 0; L--) {
      const s = tsize(L),
        t = B.far.get(tkey(L, Math.floor((E - ROOT_E0) / s), Math.floor((N - ROOT_N0) / s)));
      if (!t || !t.h) continue;
      const n = t.n,
        fu = Math.min(n - 1.001, Math.max(0, ((E - t.e0) / s) * (n - 1))),
        fv = Math.min(n - 1.001, Math.max(0, ((N - t.n0) / s) * (n - 1))),
        i = Math.floor(fu),
        j = Math.floor(fv),
        u = fu - i,
        w = fv - j,
        k = j * n + i,
        h = t.h;
      return (h[k] * (1 - u) + h[k + 1] * u) * (1 - w) + (h[k + n] * (1 - u) + h[k + n + 1] * u) * w;
    }
    return undefined;
  };
  let acc = 1,
    lastE = 0,
    lastN = 0,
    covKey = '';
  // far: true while the observer is near enough for the far ground (2.5 km from Suhl's ground)
  B.tick = (dt, o, far) => {
    acc += dt;
    if (!far || Lmin < 0) {
      if (B.far.size) B.clearFar();
      return;
    }
    const [E, N] = G.toU(o[0], o[1]);
    if (acc > 0.5 || Math.hypot(E - lastE, N - lastN) > 60) {
      acc = 0;
      lastE = E;
      lastN = N;
      plan(E, N, 14000);
    }
    pump();
    // WELT's cover changes without telling: looked at here
    const ck = WELT.covKey || '';
    if (ck !== covKey) {
      covKey = ck;
      dirty = true;
    }
    if (dirty) {
      dirty = false;
      display();
    }
  };
  B.clearFar = () => {
    for (const t of [...B.far.values()]) drop(t);
    wanted = new Set();
    lastKey = '';
    B.drawn = 0;
    if (WELT.lowerOuter) WELT.lowerOuter();
    markDirty(true);
  };
  B.leave = () => {
    B.setNeed(false);
    B.clearFar();
  };
  B.state = () => ({
    levels: B.levels,
    far: B.far.size,
    farDrawn: B.drawn,
    farLoading: busy + [...B.far.values()].filter(t => t.st === 'wait').length,
    need: B.need,
    req: B.n.req,
    ok: B.n.ok,
    err: B.n.err,
    lastErr: B.lastErr || '',
    tileMat: !!WELT.tileMat,
  });
  return B;
}
