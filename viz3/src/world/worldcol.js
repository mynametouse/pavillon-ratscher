// ===================== V16b collisions with the real surroundings: walls of every building, tree trunks, bridge railings (WCOL) =====================
// (V16c: also the trunks of the forest at the Klinge, world/forest.js FOREST.trunks)
// A spatial hash (8 m cells) over the drivable square, built once the geodata are there (world/ratscher.js S.walls, S.treeXY; world/roads.js
// decks). The vehicles test their body box against it (vehicles/vehicle.js); walking far from the garden pushes the walker's circle out
// of walls and trunks (game/game.js collide). Trunk radius from the tree's height.
// Small trees giving way to vehicles (world/treehit.js): the forest's saplings (≤ 2.5 m, no obstacle before) are in the list as 'soft' trunks –
// walkers pass them, vehicles bend them; a trunk that fell is 'dead' (skipped by every query, no NaN, no splice while a query runs).
import { LATE } from '../core/late.js';
import { KERN } from '../core/kern.js';
import { whenLoaded } from '../core/assets.js';
import { RATSCHER } from './ratscher.js';
import { ROADS } from './roads.js';
import { FOREST } from './forest.js';
export const WCOL = (() => {
  const S = { ready: false, nSeg: 0, nTree: 0, nR: 0, src: [], soft: new Uint8Array(0), dead: new Uint8Array(0) },
    CS = 8,
    G = new Map();
  let SEG = new Float32Array(0),
    TREE = new Float32Array(0),
    stampS = new Uint32Array(0),
    stampT = new Uint32Array(0),
    qid = 1;
  const key = (i, j) => (i + 4096) * 8192 + (j + 4096);
  function cell(i, j) {
    const k = key(i, j);
    let c = G.get(k);
    if (!c) G.set(k, (c = { s: [], t: [] }));
    return c;
  }
  function build() {
    const segs = [],
      trees = [];
    const W = RATSCHER.walls;
    if (W) for (let i = 0; i + 3 < W.length; i += 4) segs.push(W[i], W[i + 1], W[i + 2], W[i + 3]);
    for (const d of (window.ROADS && ROADS.decks) || [])
      for (const r of d.rails || []) segs.push(r[0], r[1], r[2], r[3]); // bridge railings
    const T = RATSCHER.treeXY,
      src = [],
      soft = [];
    if (T)
      for (let i = 0; i + 2 < T.length; i += 3) {
        trees.push(T[i], T[i + 1], Math.min(0.5, Math.max(0.15, 0.12 + T[i + 2] * 0.012)));
        src.push(null); // a measured crown (world/treehit.js finds its record by position) or a post of the village (VPROPS)
        soft.push(0);
      }
    S.nR = src.length;
    // V16c the forest at the Klinge: the trunks as world/forest.js lists them (FOREST.trunks: taller than 2.5 m, radius dbh / 2 + 0.05) –
    // from the tree list itself, so that each trunk knows its tree; the saplings below as soft trunks (world/treehit.js bends them)
    if (window.FOREST && FOREST.ready && FOREST.list)
      for (const t of FOREST.list) {
        if (t.gone) continue;
        const sap = !(t.h > 2.5);
        trees.push(t.x, t.y, sap ? t.dbh / 2 + 0.15 : t.dbh / 2 + 0.05);
        src.push(t);
        soft.push(sap ? 1 : 0);
      }
    SEG = new Float32Array(segs);
    TREE = new Float32Array(trees);
    S.nSeg = SEG.length / 4;
    S.nTree = TREE.length / 3;
    S.src = src;
    S.soft = new Uint8Array(soft);
    S.dead = new Uint8Array(S.nTree);
    stampS = new Uint32Array(S.nSeg);
    stampT = new Uint32Array(S.nTree);
    for (let s = 0; s < S.nSeg; s++) {
      const x0 = Math.min(SEG[s * 4], SEG[s * 4 + 2]),
        x1 = Math.max(SEG[s * 4], SEG[s * 4 + 2]),
        y0 = Math.min(SEG[s * 4 + 1], SEG[s * 4 + 3]),
        y1 = Math.max(SEG[s * 4 + 1], SEG[s * 4 + 3]);
      for (let i = Math.floor(x0 / CS); i <= Math.floor(x1 / CS); i++)
        for (let j = Math.floor(y0 / CS); j <= Math.floor(y1 / CS); j++) cell(i, j).s.push(s);
    }
    for (let t = 0; t < S.nTree; t++) cell(Math.floor(TREE[t * 3] / CS), Math.floor(TREE[t * 3 + 1] / CS)).t.push(t);
    S.ready = true;
  }
  // every wall segment / trunk whose cell touches the box [x0, x1] × [y0, y1] (each once): fn(index, data array)
  S.each = (x0, y0, x1, y1, fnS, fnT) => {
    if (!S.ready) return;
    qid++;
    const i0 = Math.floor(x0 / CS) - (fnT ? 1 : 0),
      i1 = Math.floor(x1 / CS) + (fnT ? 1 : 0),
      j0 = Math.floor(y0 / CS) - (fnT ? 1 : 0),
      j1 = Math.floor(y1 / CS) + (fnT ? 1 : 0);
    for (let i = i0; i <= i1; i++)
      for (let j = j0; j <= j1; j++) {
        const c = G.get(key(i, j));
        if (!c) continue;
        if (fnS)
          for (const s of c.s) {
            if (stampS[s] === qid) continue;
            stampS[s] = qid;
            fnS(s, SEG);
          }
        if (fnT)
          for (const t of c.t) {
            if (stampT[t] === qid || S.dead[t]) continue;
            stampT[t] = qid;
            fnT(t, TREE);
          }
      }
  };
  // a walker's circle out of walls and trunks (p = [x, y], changed in place)
  S.pushCircle = (p, r) => {
    if (!S.ready) return false;
    let hit = false;
    S.each(
      p[0] - r,
      p[1] - r,
      p[0] + r,
      p[1] + r,
      (s, A) => {
        const ax = A[s * 4],
          ay = A[s * 4 + 1],
          bx = A[s * 4 + 2],
          by = A[s * 4 + 3],
          dx = bx - ax,
          dy = by - ay,
          L2 = dx * dx + dy * dy || 1;
        const t = Math.max(0, Math.min(1, ((p[0] - ax) * dx + (p[1] - ay) * dy) / L2)),
          qx = ax + dx * t,
          qy = ay + dy * t,
          ex = p[0] - qx,
          ey = p[1] - qy,
          d = Math.hypot(ex, ey);
        if (d < r && d > 1e-6) {
          p[0] = qx + (ex / d) * r;
          p[1] = qy + (ey / d) * r;
          hit = true;
        }
      },
      (t, A) => {
        if (S.soft[t]) return; // a sapling: walkers step past it
        const ex = p[0] - A[t * 3],
          ey = p[1] - A[t * 3 + 1],
          rr = r + A[t * 3 + 2],
          d = Math.hypot(ex, ey);
        if (d < rr && d > 1e-6) {
          p[0] = A[t * 3] + (ex / d) * rr;
          p[1] = A[t * 3 + 1] + (ey / d) * rr;
          hit = true;
        }
      }
    );
    return hit;
  };
  // V16c2: a felled tree no longer stands in the way (world/fell.js): its trunk leaves the list
  // V16b5: taken out of its cell – it was set to NaN before, which the vehicles' circle test (vehicles/vehicle.js circBox) took for a hit
  // with NaN depth: a vehicle near the stump got a NaN position, the sounds threw and the page stopped
  S.removeTree = (x, y) => {
    if (!S.ready) return false;
    let best = -1,
      bd = 0.6;
    S.each(x - 1, y - 1, x + 1, y + 1, null, (t, A) => {
      if (S.soft[t]) return; // a felled tree is never a sapling
      const d = Math.hypot(A[t * 3] - x, A[t * 3 + 1] - y);
      if (d < bd) {
        bd = d;
        best = t;
      }
    });
    if (best < 0) return false;
    const c = G.get(key(Math.floor(TREE[best * 3] / CS), Math.floor(TREE[best * 3 + 1] / CS))),
      k = c ? c.t.indexOf(best) : -1;
    if (k >= 0) c.t.splice(k, 1);
    TREE[best * 3 + 2] = 0;
    S.dead[best] = 1;
    return true;
  };
  // world/treehit.js: a trunk a vehicle knocked over leaves every query at once – flagged dead (may be called inside a query: no splice)
  S.removeIdx = t => {
    if (!S.ready || !(t >= 0 && t < S.nTree)) return false;
    S.dead[t] = 1;
    return true;
  };
  S.revive = t => {
    if (S.ready && t >= 0 && t < S.nTree && TREE[t * 3 + 2] > 0) S.dead[t] = 0; // stood up again (world/treehit.js standUp), not a felled one
  };
  // the trunk index nearest to (x, y) within r (dead ones not), or -1; soft (saplings) only if asked
  S.treeAt = (x, y, r = 0.3, soft = false) => {
    let best = -1,
      bd = r;
    S.each(x - r, y - r, x + r, y + r, null, (t, A) => {
      if (S.soft[t] && !soft) return;
      const d = Math.hypot(A[t * 3] - x, A[t * 3 + 1] - y);
      if (d < bd) {
        bd = d;
        best = t;
      }
    });
    return best;
  };
  // where trunk t stands and its radius (tests, world/treehit.js)
  S.trunk = t => (t >= 0 && t < S.nTree ? [TREE[t * 3], TREE[t * 3 + 1], TREE[t * 3 + 2]] : null);
  whenLoaded(() => {
    if (!window.RATSCHER || !RATSCHER.ready) return;
    try {
      build();
    } catch (e) {
      console.warn('wcol', e);
    }
  });
  return S;
})();
LATE.WCOL = WCOL;
window.WCOL = WCOL;
KERN.provide('pushOut', (p, r) => WCOL.pushCircle(p, r)); // core/kern.js
