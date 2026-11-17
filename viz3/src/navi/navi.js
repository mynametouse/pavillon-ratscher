// ===================== feat/navi: the autopilot – a destination in the car, and it drives there by itself (NAVI) =====================
// Falko, 17.11.2026 15:05: „… schnell herumzureisen. Auch sonst im Auto, auch im Autopiloten optional bei Zielangabe.“
// In a vehicle the button „Ziel“ (the pin in the vehicle panel) lists the places – the garden, Ratscher, Schleusingen, Kloster Veßra, Suhl
// (Markt, Bahnhof, Congress Centrum); a choice plans the way and drives it: the right-hand lane, the speed of the road (50 in a village or a
// town – STRDAT.ortAt –, 100 on the country roads, 120 on the A 73), slower into curves, braking before the end; it keeps its distance to
// cars, buses and walkers on its line and stops behind them. Any of W/A/S/D, the arrows, Space or the stick takes over again („Du fährst
// wieder selbst.“); getting out ends it too. The way on the small map and the navi's screen in orange, the distance left as its label.
// The roads: the village's (world/roads.js ROADS.ways) and those of the drive beyond the square (welt/fahrt.js FAHRT.data.ways: the region,
// and the sets that come later – Suhl's approach and streets), one graph of verkehr/verkehr_netz.js, rebuilt when the drive's data change;
// one-way streets (fl & 4) only forwards. Where the destination's roads are not loaded yet (Suhl's streets come with the town), it drives
// towards the reachable point nearest to it and plans again as more roads come in. The vehicle's own physics drive: VEH.auto (the hook
// for tests, vehicles/vehicle.js) gives throttle, brake and steering by pure pursuit of a point ahead on the line.
// Not yet: traffic lights and the right of way of verkehr/vk_regeln.js (the cars of the traffic wait for it, it waits for what stands on
// its line), the speed signs (VKREGELN.limits).
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { ROADS } from '../world/roads.js';
import { FAHRT } from '../welt/fahrt.js';
import { STRDAT } from '../strassen/strassen_daten.js';
import { VEH } from '../vehicles/vehicle.js';
import { MMAP } from '../vehicles/minimap.js';
import { VNETZ } from '../verkehr/verkehr_netz.js';
import { joy } from '../game/input.js';
import { toast } from '../audio/audio.js';

export const NAVI = (() => {
  const S = {
    on: false,
    dest: null, // { k, label, x, y }
    R: null, // the line (VNETZ.line): X, Y, S (speed per metre), L
    s: 0, // where along it
    partial: false,
    v: null, // the vehicle it drives
    G: null,
    gKey: '',
    planT: 0,
    plans: 0,
    hold: '', // why it waits: '' | 'vor' (something ahead) | 'lädt' (the ground ahead) | 'ende' (the roads known so far)
    nudge: 0, // m beside the line (+ right) while going round something
    nudgeS: 0,
    backN: 0,
    vt: 0,
    off: 0,
    why: '',
  };
  // m/s by kind: motorway, main, county, street, lane, service, track
  const VMAX = [33.3, 27.8, 27.8, 13.9, 8.3, 6.5, 5],
    TOWN = 13.9;
  const DEST = [
    ['garten', 'Garten'],
    ['dorf', 'Ratscher'],
    ['schleusingen', 'Schleusingen'],
    ['vessra', 'Kloster Veßra'],
    ['suhl', 'Suhl, Markt'],
    ['suhl_bahnhof', 'Suhl, Bahnhof'],
    ['suhl_ccs', 'Suhl, Congress Centrum'],
  ];

  // ---- the graph: the village's ways and the drive's, rebuilt when they change ----
  function graph() {
    const D = FAHRT && FAHRT.data,
      key = ((ROADS && ROADS.ways) || []).length + '/' + (D ? D.ways.length + ':' + (FAHRT.rev || 0) : '-');
    if (S.G && key === S.gKey) return S.G;
    const ways = [];
    for (const w of (ROADS && ROADS.ways) || []) if (w.kind <= 6) ways.push(w);
    if (D)
      for (const w of D.ways) {
        // not for cars: pedestrian zones, steps, private, through a house, into a building (the bits of fahrt/strassen.json)
        if (w.kind > 6 || w.fl & (64 | 128 | 1024 | 2048 | 32768)) continue;
        const p = new Array(w.n * 2),
          z = new Array(w.n);
        for (let i = 0; i < w.n; i++) {
          p[i * 2] = w.p[i * 3];
          p[i * 2 + 1] = w.p[i * 3 + 1];
          z[i] = w.p[i * 3 + 2];
        }
        // the width carries the one-way flag as its sign (only this module reads e.w); the heights keep a bridge and the road below apart
        ways.push({ kind: w.kind, w: (w.fl & 4 ? -1 : 1) * Math.max(3, w.hw * 2), p, z });
      }
    const t0 = performance.now();
    S.G = build(ways);
    S.gKey = key;
    S.gMs = Math.round(performance.now() - t0);
    // a grid of the edges (50 m) for the nearest road
    const C = 50,
      grid = new Map();
    for (const e of S.G.edges)
      for (const q of e.pts) {
        const k = Math.floor(q[0] / C) * 100003 + Math.floor(q[1] / C);
        let a = grid.get(k);
        if (!a) grid.set(k, (a = new Set()));
        a.add(e);
      }
    S.G.grid = grid;
    S.G.town = new Map();
    return S.G;
  }
  // ---- the graph of many ways (the region, a town): as VNETZ.graph – lines split where they meet, an end within 3.5 m of another
  // line is a junction, vertices of two lines within 0.6 m one node – but with a grid of the segments, so that tens of thousands of points
  // take a tenth of a second (VNETZ.graph looks at every line for every end: made for one village) ----
  function build(ways) {
    const SNAP = 3.5,
      CS = 16,
      lines = [];
    for (const w of ways) {
      const p = w.p,
        n = p.length >> 1;
      if (n < 2) continue;
      const pts = [];
      for (let i = 0; i < n; i++) {
        const x = p[i * 2],
          y = p[i * 2 + 1],
          l = pts[pts.length - 1];
        // a third value: the height where the way has one (the drive's ways), else null
        if (!l || Math.hypot(x - l[0], y - l[1]) > 0.05) pts.push([x, y, w.z ? w.z[i] : null]);
      }
      if (pts.length > 1) lines.push({ kind: w.kind, w: w.w || 4, pts });
    }
    const ck = (i, j) => i * 100003 + j;
    // the segments in a grid
    const SG = new Map();
    lines.forEach((L, li) => {
      for (let k = 0; k + 1 < L.pts.length; k++) {
        const [ax, ay] = L.pts[k],
          [bx, by] = L.pts[k + 1],
          i0 = Math.floor((Math.min(ax, bx) - SNAP) / CS),
          i1 = Math.floor((Math.max(ax, bx) + SNAP) / CS),
          j0 = Math.floor((Math.min(ay, by) - SNAP) / CS),
          j1 = Math.floor((Math.max(ay, by) + SNAP) / CS);
        for (let i = i0; i <= i1; i++)
          for (let j = j0; j <= j1; j++) {
            const kk = ck(i, j);
            let a = SG.get(kk);
            if (!a) SG.set(kk, (a = []));
            a.push(li, k);
          }
      }
    });
    // an end near another line's segment (no vertex there): a vertex is put into that line (collected first, then inserted)
    const ins = new Map();
    lines.forEach((L, li) => {
      for (const q of [L.pts[0], L.pts[L.pts.length - 1]]) {
        const a = SG.get(ck(Math.floor(q[0] / CS), Math.floor(q[1] / CS)));
        if (!a) continue;
        let best = null;
        for (let m = 0; m < a.length; m += 2) {
          const lj = a[m],
            k = a[m + 1];
          if (lj === li) continue;
          const P = lines[lj].pts,
            [ax, ay] = P[k],
            dx = P[k + 1][0] - ax,
            dy = P[k + 1][1] - ay,
            l2 = dx * dx + dy * dy;
          if (l2 < 1e-6) continue;
          const t = Math.max(0, Math.min(1, ((q[0] - ax) * dx + (q[1] - ay) * dy) / l2)),
            px = ax + dx * t,
            py = ay + dy * t,
            d = Math.hypot(q[0] - px, q[1] - py),
            za = P[k][2],
            zb = P[k + 1][2],
            pz = za != null && zb != null ? za + (zb - za) * t : null;
          if (pz != null && q[2] != null && Math.abs(pz - q[2]) > 2.5) continue; // over or under it: no junction
          if (d < SNAP && (!best || d < best.d)) best = { lj, k, t, px, py, pz, d };
        }
        if (!best) continue;
        const P = lines[best.lj].pts;
        if (
          Math.hypot(P[best.k][0] - best.px, P[best.k][1] - best.py) < 1 ||
          Math.hypot(P[best.k + 1][0] - best.px, P[best.k + 1][1] - best.py) < 1
        )
          continue;
        let a2 = ins.get(best.lj);
        if (!a2) ins.set(best.lj, (a2 = []));
        a2.push([best.k, best.t, best.px, best.py, best.pz]);
      }
    });
    for (const [lj, a] of ins) {
      a.sort((p, q) => q[0] - p[0] || q[1] - p[1]); // from the back, so that the indices before stay
      const P = lines[lj].pts;
      for (const [k, , px, py, pz] of a) P.splice(k + 1, 0, [px, py, pz]);
    }
    // the vertices in a grid; union of the ones that are one place
    const VG = new Map(),
      off = [],
      VC = 4;
    let nv = 0;
    lines.forEach(L => {
      off.push(nv);
      nv += L.pts.length;
    });
    const par = new Int32Array(nv);
    for (let i = 0; i < nv; i++) par[i] = i;
    const find = a => {
      while (par[a] !== a) a = par[a] = par[par[a]];
      return a;
    };
    const isNode = new Uint8Array(nv);
    lines.forEach((L, li) =>
      L.pts.forEach((q, vi) => {
        const kk = ck(Math.floor(q[0] / VC), Math.floor(q[1] / VC));
        let a = VG.get(kk);
        if (!a) VG.set(kk, (a = []));
        a.push(li, vi);
      })
    );
    lines.forEach((L, li) => {
      const m = L.pts.length;
      L.pts.forEach(([x, y, z], vi) => {
        const end = vi === 0 || vi === m - 1,
          r = end ? SNAP : 0.6,
          i0 = Math.floor((x - r) / VC),
          i1 = Math.floor((x + r) / VC),
          j0 = Math.floor((y - r) / VC),
          j1 = Math.floor((y + r) / VC);
        if (end) isNode[off[li] + vi] = 1;
        for (let i = i0; i <= i1; i++)
          for (let j = j0; j <= j1; j++) {
            const a = VG.get(ck(i, j));
            if (!a) continue;
            for (let t = 0; t < a.length; t += 2) {
              const lj = a[t],
                vj = a[t + 1];
              if (lj === li) continue;
              const Q = lines[lj].pts,
                d = Math.hypot(Q[vj][0] - x, Q[vj][1] - y),
                oend = vj === 0 || vj === Q.length - 1;
              if (z != null && Q[vj][2] != null && Math.abs(z - Q[vj][2]) > 2.5) continue;
              if (d < 0.6 || (end && d < SNAP) || (oend && d < SNAP)) {
                const ra = find(off[li] + vi),
                  rb = find(off[lj] + vj);
                if (ra !== rb) par[rb] = ra;
                isNode[off[li] + vi] = 1;
                isNode[off[lj] + vj] = 1;
              }
            }
          }
      });
    });
    // nodes (one per union) and edges (the lines split at their nodes)
    const nodes = [],
      byRoot = new Map(),
      edges = [];
    const nodeOf = (li, vi) => {
      const r = find(off[li] + vi);
      let n = byRoot.get(r);
      if (n === undefined) {
        n = nodes.length;
        byRoot.set(r, n);
        nodes.push({ x: 0, y: 0, c: 0, edges: [] });
      }
      const N = nodes[n],
        [x, y] = lines[li].pts[vi];
      N.x = (N.x * N.c + x) / (N.c + 1);
      N.y = (N.y * N.c + y) / (N.c + 1);
      N.c++;
      return n;
    };
    lines.forEach((L, li) => {
      let a = nodeOf(li, 0),
        pts = [L.pts[0]];
      for (let vi = 1; vi < L.pts.length; vi++) {
        pts.push(L.pts[vi]);
        if (!isNode[off[li] + vi]) continue;
        const b = nodeOf(li, vi);
        let len = 0;
        for (let k = 1; k < pts.length; k++) len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
        if (a !== b && len > 0.3) {
          const e = { i: edges.length, a, b, pts, len, kind: L.kind, w: L.w };
          edges.push(e);
          nodes[a].edges.push(e);
          nodes[b].edges.push(e);
        }
        a = b;
        pts = [L.pts[vi]];
      }
    });
    for (const e of edges) {
      e.pts = e.pts.map(q => q.slice());
      e.pts[0] = [nodes[e.a].x, nodes[e.a].y];
      e.pts[e.pts.length - 1] = [nodes[e.b].x, nodes[e.b].y];
    }
    return { nodes, edges };
  }
  // the nearest point of a road: { e, i (segment), t, d, x, y }
  function nearest(G, x, y, r, ok) {
    const C = 50,
      n = Math.ceil(r / C);
    let best = null;
    const cx = Math.floor(x / C),
      cy = Math.floor(y / C),
      seen = new Set();
    for (let i = -n; i <= n; i++)
      for (let j = -n; j <= n; j++) {
        const a = G.grid.get((cx + i) * 100003 + cy + j);
        if (!a) continue;
        for (const e of a) {
          if (seen.has(e) || (ok && !ok(e))) continue;
          seen.add(e);
          for (let k = 0; k + 1 < e.pts.length; k++) {
            const [ax, ay] = e.pts[k],
              [bx, by] = e.pts[k + 1],
              dx = bx - ax,
              dy = by - ay,
              l2 = dx * dx + dy * dy || 1e-9,
              t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2)),
              px = ax + dx * t,
              py = ay + dy * t,
              d = Math.hypot(x - px, y - py);
            if (d < r && (!best || d < best.d)) best = { e, i: k, t, d, x: px, y: py, dx, dy };
          }
        }
      }
    return best;
  }
  // the drive's route that leads to the destination (its end within 500 m), the one passing nearest to the vehicle
  function guide(A, x, y) {
    const D = FAHRT && FAHRT.data;
    if (!D || !D.routes) return null;
    let best = null;
    for (const k in D.routes) {
      if (D.dests && !(k in D.dests) && k !== 'markt' && k !== 'baumschule') continue;
      const r = D.routes[k],
        n = r.length;
      if (n < 4 || Math.hypot(r[n - 2] - A.x, r[n - 1] - A.y) > 500) continue;
      let dm = Infinity;
      for (let i = 0; i < n; i += 2) dm = Math.min(dm, Math.hypot(r[i] - x, r[i + 1] - y));
      if (dm < 3000 && (!best || dm < best.dm)) best = { r, dm, k };
    }
    if (!best) return null;
    const g = best.r;
    g.k = best.k;
    return g;
  }
  function nodeGrid(G) {
    if (G.ng) return G.ng;
    const NG = new Map(),
      C = 25;
    G.nodes.forEach((N, i) => {
      const kk = Math.floor(N.x / C) * 100003 + Math.floor(N.y / C);
      let a = NG.get(kk);
      if (!a) NG.set(kk, (a = []));
      a.push(i);
    });
    G.ng = NG;
    return NG;
  }
  function nodeNear(G, NG, x, y, r, dist) {
    const C = 25,
      cx = Math.floor(x / C),
      cy = Math.floor(y / C);
    let b = -1,
      bd = r;
    for (let i = -1; i <= 1; i++)
      for (let j = -1; j <= 1; j++)
        for (const n of NG.get((cx + i) * 100003 + cy + j) || []) {
          if (!(dist[n] < Infinity)) continue;
          const d = Math.hypot(G.nodes[n].x - x, G.nodes[n].y - y);
          if (d < bd) {
            bd = d;
            b = n;
          }
        }
    return b;
  }
  const inTown = (G, e) => {
    let v = G.town.get(e);
    if (v === undefined) {
      const q = e.pts[e.pts.length >> 1];
      v = !!(STRDAT && STRDAT.ortAt && STRDAT.ortAt(q[0], q[1]));
      G.town.set(e, v);
    }
    return v;
  };
  const vmax = (G, e) => {
    const v = VMAX[e.kind] || 5;
    return e.kind <= 2 && inTown(G, e) ? Math.min(v, TOWN) : v;
  };
  const cost = (G, e, fwd) => (e.w < 0 && !fwd ? Infinity : (e.len / vmax(G, e)) * (e.kind === 6 ? 2.5 : 1));

  // ---- a full Dijkstra from the start (one or two nodes with a cost to reach them) ----
  function dijkstra(G, starts) {
    const N = G.nodes.length,
      dist = new Float64Array(N).fill(Infinity),
      prev = new Array(N).fill(null),
      done = new Uint8Array(N),
      hp = [];
    const push = it => {
      hp.push(it);
      let i = hp.length - 1;
      while (i > 0) {
        const j = (i - 1) >> 1;
        if (hp[j][0] <= hp[i][0]) break;
        [hp[i], hp[j]] = [hp[j], hp[i]];
        i = j;
      }
    };
    const pop = () => {
      const top = hp[0],
        last = hp.pop();
      if (hp.length) {
        hp[0] = last;
        let i = 0;
        for (;;) {
          const l = i * 2 + 1,
            r = l + 1;
          let m = i;
          if (l < hp.length && hp[l][0] < hp[m][0]) m = l;
          if (r < hp.length && hp[r][0] < hp[m][0]) m = r;
          if (m === i) break;
          [hp[i], hp[m]] = [hp[m], hp[i]];
          i = m;
        }
      }
      return top;
    };
    for (const [n, c] of starts)
      if (c < dist[n]) {
        dist[n] = c;
        push([c, n]);
      }
    while (hp.length) {
      const [d, u] = pop();
      if (done[u]) continue;
      done[u] = 1;
      for (const e of G.nodes[u].edges) {
        const fwd = e.a === u,
          v = fwd ? e.b : e.a,
          c = cost(G, e, fwd);
        if (!(c < Infinity)) continue;
        if (d + c < dist[v]) {
          dist[v] = d + c;
          prev[v] = { e, u, fwd };
          push([d + c, v]);
        }
      }
    }
    return { dist, prev };
  }

  // where the drive's own route to that place ends (the Markt of Schleusingen, the edge of Suhl's pedestrian zone): the car stops there –
  // once the drive's data are in (they load when one drives out of the square)
  function refine() {
    const A = S.dest,
      D = FAHRT && FAHRT.data;
    if (!A || A.spot || !D || !D.routes) return;
    for (const rk in D.routes) {
      if (D.dests && !(rk in D.dests) && rk !== 'markt' && rk !== 'baumschule') continue;
      const r = D.routes[rk],
        n = r.length;
      if (n >= 4 && Math.hypot(r[n - 2] - A.x, r[n - 1] - A.y) < 300) {
        A.spot = [A.x, A.y];
        A.x = r[n - 2];
        A.y = r[n - 1];
        return;
      }
    }
  }
  // ---- plan: from where the vehicle stands to the destination (or as near as the loaded roads go) ----
  function plan() {
    const v = S.v,
      A = S.dest;
    if (!v || !A) return false;
    refine();
    S.planT = 0;
    S.plans++;
    const G = graph();
    if (!G.nodes.length) {
      S.why = 'keine Straßen';
      return false;
    }
    const st = v.st,
      hx = Math.sin(st.psi),
      hy = Math.cos(st.psi),
      here = nearest(G, st.x, st.y, 60);
    if (!here) {
      S.why = 'keine Straße in der Nähe';
      return false;
    }
    // the start: the two ends of the road it stands on – the one ahead free, the one behind with a turn (20 s)
    const e0 = here.e,
      along = (here.dx * hx + here.dy * hy) / (Math.hypot(here.dx, here.dy) || 1),
      ahead = along >= 0 ? e0.b : e0.a,
      behind = along >= 0 ? e0.a : e0.b,
      oneway = e0.w < 0;
    // the pieces of that road from where it stands to either end (the line begins under the vehicle, not at a junction far ahead)
    const toB = [[here.x, here.y], ...e0.pts.slice(here.i + 1)],
      toA = [[here.x, here.y], ...e0.pts.slice(0, here.i + 1).reverse()],
      plen = q => q.reduce((a, p, k) => (k ? a + Math.hypot(p[0] - q[k - 1][0], p[1] - q[k - 1][1]) : 0), 0),
      piece = { [e0.b]: toB, [e0.a]: toA },
      v0 = vmax(G, e0);
    const starts = [[ahead, plen(piece[ahead]) / v0]];
    if (!oneway || along < 0) starts.push([behind, plen(piece[behind]) / v0 + 20]);
    const { dist, prev } = dijkstra(G, starts);
    // the end: the nearest node of a drivable road (not a track) to the destination; else the reachable node nearest to it
    const end = nearest(G, A.x, A.y, 400, e => e.kind <= 5);
    let to = -1;
    if (end) {
      const ne = end.e,
        c = [ne.a, ne.b].filter(n => dist[n] < Infinity);
      if (c.length)
        to = c.reduce((b, n) =>
          Math.hypot(G.nodes[n].x - A.x, G.nodes[n].y - A.y) < Math.hypot(G.nodes[b].x - A.x, G.nodes[b].y - A.y)
            ? n
            : b
        );
    }
    // there when the road nearest to the destination is reached (its last piece runs to the point beside it); a destination without a
    // road near it (60 m from the end of the drive's route, else 160 m), or outside the square before the drive's roads are in, is only
    // approached – planned again as roads come in
    const D = FAHRT && FAHRT.data,
      out = Math.abs(A.x) > 1150 || Math.abs(A.y) > 1150,
      drive = !!(D && D.ways && D.ways.length);
    S.partial = to < 0 || !end || end.d > (A.spot ? 60 : 160) || (out && !drive);
    // not there yet: along the drive's own route to that place (fahrt: `routes` with a destination, e.g. Suhl's approach over the A 73),
    // as far as the loaded roads reach – else the reachable junction nearest to the destination
    S.mode = 'netz';
    if (S.partial) {
      const g = guide(A, st.x, st.y);
      if (g) {
        // where the vehicle is along that route, and how far along it the loaded roads reach
        let kc = 0,
          dc = Infinity,
          kf = -1;
        for (let k = 0; k < g.length; k += 2) {
          const d = Math.hypot(g[k] - st.x, g[k + 1] - st.y);
          if (d < dc) {
            dc = d;
            kc = k;
          }
        }
        const NG = nodeGrid(G);
        for (let k = g.length - 2; k >= kc; k -= 2 * 4) {
          const n = nodeNear(G, NG, g[k], g[k + 1], 25, dist);
          if (n >= 0) {
            to = n;
            kf = k;
            S.guide = g.k;
            break;
          }
        }
        let ahead = 0;
        for (let k = kc; k + 2 <= kf; k += 2) ahead += Math.hypot(g[k + 2] - g[k], g[k + 3] - g[k + 1]);
        if (ahead < 150 && dc < 60 && g.length - kc > 6) {
          // the roads end here (the next ones load later): along the route itself, as the drive draws it, until they come
          // in pieces of about 250 m, each with the speed of its place (a town or open country)
          const pts = [[st.x, st.y]],
            gp = [];
          for (let k = kc + 2; k < g.length; k += 2) pts.push([g[k], g[k + 1]]);
          let cur = { pts: [pts[0]], kind: 1, w: -7, len: 0 };
          for (let k = 1; k < pts.length; k++) {
            cur.pts.push(pts[k]);
            cur.len += Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]);
            if (cur.len > 250 && k < pts.length - 1) {
              gp.push({ e: cur, fwd: true });
              cur = { pts: [pts[k]], kind: 1, w: -7, len: 0 };
            }
          }
          if (cur.pts.length > 1) gp.push({ e: cur, fwd: true });
          const R = VNETZ.line(gp, {
            off: () => 0,
            vmax: e => vmax(G, e),
            cut: 6,
            aLat: 2.6,
            aBrk: 2.6,
            vMin: 3,
            vEnd: 0,
          });
          if (R) {
            S.R = R;
            S.s = 0;
            S.mode = 'route';
            S.guide = g.k;
            S.why = '';
            return true;
          }
        }
      }
    }
    if (to < 0) {
      let bd = Infinity;
      for (let n = 0; n < G.nodes.length; n++) {
        if (!(dist[n] < Infinity)) continue;
        const d = Math.hypot(G.nodes[n].x - A.x, G.nodes[n].y - A.y);
        if (d < bd) {
          bd = d;
          to = n;
        }
      }
    }
    if (to < 0) {
      S.R = null;
      return false;
    }
    const path = [];
    let n0 = to;
    for (let k = 0; prev[n0] && k < 1e5; k++) {
      const p = prev[n0];
      path.push({ e: p.e, fwd: p.fwd });
      n0 = p.u;
    }
    path.reverse();
    // the first piece: from under the vehicle to the junction the route starts at (its own road, the part towards that end)
    const pc = piece[n0];
    if (pc && pc.length > 1 && plen(pc) > 1)
      path.unshift({ e: { pts: pc, kind: e0.kind, w: e0.w, len: plen(pc) }, fwd: true });
    // the last piece: from the last junction along the destination's road to the point nearest to the destination
    if (!S.partial && end && (end.e.a === to || end.e.b === to)) {
      const ne = end.e,
        q =
          ne.a === to
            ? [...ne.pts.slice(0, end.i + 1), [end.x, end.y]]
            : [...ne.pts.slice(end.i + 1).reverse(), [end.x, end.y]];
      if (q.length > 1 && plen(q) > 2) path.push({ e: { pts: q, kind: ne.kind, w: ne.w, len: plen(q) }, fwd: true });
    }
    if (!path.length) {
      S.R = null;
      return true;
    }
    const R = VNETZ.line(path, {
      // the right-hand lane; in narrow streets (old towns) nearer the middle, so that the corners of the houses stay clear
      off: e => (e.w < 0 || e.kind > 4 ? 0 : Math.abs(e.w) < 6 ? 0.8 : Math.min(1.7, Math.max(1.1, Math.abs(e.w) / 4))),
      vmax: e => vmax(G, e),
      cut: 6,
      aLat: 2.6,
      aBrk: 2.6,
      vMin: 3,
      vEnd: 0,
    });
    if (!R) {
      S.why = 'kein Weg';
      return false;
    }
    S.R = R;
    S.nudge = 0;
    const pr = VNETZ.project(R, st.x, st.y, 0, 80);
    S.s = pr ? pr.s : 0;
    S.why = '';
    return true;
  }

  // ---- what stands on the line ahead: cars of the traffic, buses, other vehicles, walkers ----
  // returns { gap (m to the nearest thing on its lane), lat (its side offset, + right), still (it does not move) } or null
  const _ob = [];
  function ahead(st, look) {
    const R = S.R;
    let best = null;
    const test = (x, y, r, moving) => {
      const dx = x - st.x,
        dy = y - st.y;
      if (dx * dx + dy * dy > (look + 10) * (look + 10)) return;
      if (dx * Math.sin(st.psi) + dy * Math.cos(st.psi) < 1) return; // behind or beside
      const pr = VNETZ.project(R, x, y, S.s, S.s + look + 8);
      // its lane is the line moved sideways by the nudge (going round something): what is within its half width plus the other's
      if (!pr || Math.abs(pr.lat - S.nudge) > 1.3 + r) return;
      const gap = pr.s - S.s - r;
      if (!best || gap < best.gap) best = { gap, lat: pr.lat, r, still: !moving };
    };
    const V = window.VAUTO;
    if (V && V.cars)
      for (const c of V.cars) if (c.st !== 'weg' && Number.isFinite(c.x)) test(c.x, c.y, 1.0, (c.v || 0) > 0.5);
    if (window.BUS && window.BUS.obstacles) for (const o of window.BUS.obstacles()) test(o.x, o.y, o.r, o.moving);
    for (const o of VEH.list || [])
      if (o !== S.v && o.g && o.g.visible) test(o.st.x, o.st.y, 1.0, Math.hypot(o.st.u, o.st.v || 0) > 0.5);
    const T = window.VERKEHR && window.VERKEHR.S;
    if (T && T.peds) for (const d of T.peds) if (Number.isFinite(d.x)) test(d.x, d.y, 0.4, true);
    // the villagers' cars and the parked cars of the aerial photo (dinge/dinge.js) near the observer
    const DC = window.DCARS && window.DCARS.cars;
    if (DC)
      for (const d of Object.values(DC))
        if (d.g && d.g.visible && d.at) test(d.at[0], d.at[1], 1.0, d.st === 'leaving' || d.st === 'arriving');
    if (window.DINGE && window.DINGE.obstacles) {
      _ob.length = 0;
      window.DINGE.obstacles(_ob);
      for (const o of _ob) test(o.x, o.y, o.r, !!o.moving);
    }
    return best;
  }

  // ---- the driver: VEH.auto(v, dt) → { thr, brk, steer, hand } ----
  const _p = {};
  function drive(v, dt) {
    const st = v.st,
      sp = v.spec,
      R = S.R,
      u = st.u;
    S.planT += dt;
    // a line that ends short of the destination: planned again when new roads came in (at most every 8 s) or near its end
    if (S.partial && ((S.planT > 8 && S.gKey !== graphKey()) || (S.planT > 4 && R && R.L - S.s < 400))) plan();
    if (!S.R) {
      // nothing left to drive: brake to a stand first, then „Angekommen“
      if (!S.partial && S.dest) {
        if (Math.abs(u) > 0.5) return { thr: 0, brk: 1, steer: 0, hand: false };
        arrive();
      } else if (S.partial) {
        // nothing to drive yet: wait for roads, plan again every 4 s, give up after 40 s
        S.wait = (S.wait || 0) + dt;
        S.hold = 'ende';
        if (S.planT > 4) plan();
        if (S.wait > 40) stop(false, 'Bis hierher kenne ich den Weg – ab hier selbst fahren.');
      }
      return Math.abs(u) > 0.3 ? { thr: 0, brk: 1, steer: 0, hand: false } : { thr: 0, brk: 0, steer: 0, hand: true };
    }
    // stuck against something (a wall, a fence, a parked car): back off a little with the wheels the other way, then on
    if (S.back > 0) {
      S.back -= dt;
      if (S.back <= 0 && S.replan) {
        S.replan = false;
        plan();
      }
      return { thr: 0, brk: 1, steer: -S.bs, hand: false };
    }
    // held while the ground ahead loads (welt/fahrt.js FAHRT.cap): that is waiting, not being stuck
    const cap = FAHRT && Number.isFinite(FAHRT.cap) ? FAHRT.cap : Infinity;
    S.stuck = Math.abs(u) < 0.3 && S.thr > 0.3 && cap > 2 ? (S.stuck || 0) + dt : 0;
    if (S.stuck > 1.6) {
      S.stuck = 0;
      S.back = 1.8;
      S.bs = Math.sign(st.steer || 1);
      S.backs = (S.backs || 0) + 1;
      // again and again at the same place: try beside the line (left, then right); after seven tries the driver takes over
      if (S.backAt && Math.hypot(st.x - S.backAt[0], st.y - S.backAt[1]) < 6) S.backN++;
      else {
        S.backN = 1;
        S.backAt = [st.x, st.y];
      }
      // the second time: a new plan from where it stands (the line begins under it again); then beside the line, left and right
      if (S.backN === 2) S.replan = true;
      if (S.backN >= 3) {
        S.nudge = S.backN % 2 ? -1.8 : 1.4;
        S.nudgeS = S.s + 30;
      }
      if (S.backN >= 7) {
        stop(false, 'Hier komme ich nicht vorbei – fahr kurz selbst, dann wieder „Ziel“.');
        return { thr: 0, brk: 1, steer: 0, hand: false };
      }
    }
    const pr = VNETZ.project(S.R, st.x, st.y, Math.max(0, S.s - 6), S.s + 40 + Math.abs(u) * 2);
    if (pr) {
      S.s = Math.max(S.s - 1, pr.s);
      S.off = pr.d;
    }
    // far off its line (pushed, a wrong turn): a new plan, at most every 3 s
    if (S.off > 18 && S.planT > 3) {
      plan();
      if (!S.R) return { thr: 0, brk: 1, steer: 0, hand: false };
    }
    const L = S.R,
      look = Math.max(4.5, Math.min(30, 3.5 + Math.abs(u) * 0.75));
    VNETZ.at(L, S.s + look, _p);
    // going round something: the point ahead moved sideways (+ right), until 30 m past it
    if (S.nudge && S.s > S.nudgeS) S.nudge = 0;
    if (S.nudge) {
      _p.x += Math.cos(_p.hd) * S.nudge;
      _p.y -= Math.sin(_p.hd) * S.nudge;
    }
    const f0 = Math.sin(st.psi),
      f1 = Math.cos(st.psi),
      rx = st.x - f0 * sp.b,
      ry = st.y - f1 * sp.b,
      lx = (_p.x - rx) * f1 - (_p.y - ry) * f0,
      ly = (_p.x - rx) * f0 + (_p.y - ry) * f1,
      ld2 = Math.max(4, lx * lx + ly * ly),
      ang = Math.atan((2 * (sp.a + sp.b) * lx) / ld2),
      steer = Math.max(-1, Math.min(1, ang / Math.max(0.1, sp.steerMax / (1 + (Math.abs(u) / sp.steerV) ** 2))));
    // the speed: the line's own (road, curve, braking ahead), behind something on it a gap of 4 m
    const i = Math.min(L.n - 1, Math.max(0, Math.round(S.s / L.step)));
    let vt = L.S ? L.S[i] : 8;
    const ob = ahead(st, Math.max(25, (u * u) / 4 + 12));
    S.hold = '';
    if (ob) {
      const free = Math.max(0, ob.gap - 4);
      vt = Math.min(vt, Math.sqrt(2 * 3 * free));
      if (free < 0.5) S.hold = 'vor';
      // something standing on its lane (a parked car, a broken-down one): after 4 s round it on the left, slowly
      S.holdT = free < 2 && ob.still ? (S.holdT || 0) + dt : 0;
      if (S.holdT > 4) {
        S.holdT = 0;
        S.nudge = Math.min(-1.5, ob.lat - (1.3 + ob.r) - 0.3);
        S.nudgeS = S.s + ob.gap + 18;
      }
    } else S.holdT = 0;
    if (S.nudge) vt = Math.min(vt, 4);
    if (cap < vt) {
      vt = cap;
      if (cap < 1) S.hold = 'lädt';
    }
    const rest = L.L - S.s;
    vt = Math.min(vt, 0.8 + rest * 0.45);
    if (Math.abs(ang) > 0.5) vt = Math.min(vt, 6);
    S.vt = vt;
    if (rest < 3.5 && Math.abs(u) < 0.6) {
      S.thr = 0;
      if (!S.partial) {
        arrive();
        return { thr: 0, brk: 0, steer: 0, hand: true };
      }
      // the end of the roads known so far: wait for more (the drive loads them as one comes near), give up after 40 s
      S.wait = (S.wait || 0) + dt;
      S.hold = 'ende';
      if (S.wait > 40) stop(false, 'Bis hierher kenne ich den Weg – ab hier selbst fahren.');
      return { thr: 0, brk: 0, steer: 0, hand: true };
    }
    S.wait = 0;
    if (vt < 0.3) S.thr = 0;
    if (vt < 0.3)
      return Math.abs(u) > 0.3 ? { thr: 0, brk: 1, steer, hand: false } : { thr: 0, brk: 0, steer, hand: true };
    const ev = vt - u;
    S.thr = ev > 0 ? Math.min(1, ev * 0.35 + 0.08) : 0;
    return {
      thr: S.thr,
      brk: ev < -0.5 ? Math.min(1, -ev * 0.3) : 0,
      steer,
      hand: false,
    };
  }
  const graphKey = () => {
    const D = FAHRT && FAHRT.data;
    return ((ROADS && ROADS.ways) || []).length + '/' + (D ? D.ways.length + ':' + (FAHRT.rev || 0) : '-');
  };

  // ---- on and off ----
  function go(k, label) {
    const v = VEH.cur,
      s = KERN.spot(k);
    pick.hidden = true;
    if (!v) {
      toast('Erst in ein Fahrzeug steigen.');
      return false;
    }
    if (!s || !s.pos) {
      toast('Diesen Ort kenne ich nicht.');
      return false;
    }
    S.v = v;
    S.dest = { k, label: label || k, x: s.pos[0], y: s.pos[1] };
    refine();
    S.on = true;
    S.plans = 0;
    const ok = plan();
    if (!ok && !S.R) {
      if (Math.hypot(v.st.x - S.dest.x, v.st.y - S.dest.y) < 60) toast('Du bist schon da.');
      else toast('Dahin finde ich keinen Weg (' + (S.why || 'keine Straße') + ').');
      stop(true);
      return false;
    }
    VEH.auto = drive;
    toast('Autopilot: nach ' + S.dest.label + ' – W/A/S/D oder Lenken übernimmt.', 4200);
    ui();
    KERN.emit('navi', { on: true, dest: k });
    markDirty();
    return true;
  }
  function stop(quiet, msg) {
    S.ended = msg || (quiet ? 'still' : 'selbst');
    if (VEH.auto === drive) VEH.auto = null;
    const was = S.on;
    S.on = false;
    S.R = null;
    S.dest = null;
    S.v = null;
    if (was && !quiet) toast(msg || 'Du fährst wieder selbst.');
    ui();
    if (was) KERN.emit('navi', { on: false });
  }
  function arrive() {
    const A = S.dest,
      v = S.v,
      q = A && (A.spot || [A.x, A.y]),
      d = A && v ? Math.hypot(q[0] - v.st.x, q[1] - v.st.y) : 0;
    stop(true, 'angekommen');
    // where the place itself is no road (the Markt of Suhl, a pedestrian zone): the rest on foot
    if (A) toast('Angekommen: ' + A.label + (d > 50 ? ' – zu Fuß noch ' + Math.round(d / 10) * 10 + ' m.' : '.'), 4500);
  }
  // any of the driving keys or the stick takes over
  window.addEventListener('keydown', e => {
    if (!S.on || e.ctrlKey || e.metaKey || e.altKey) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement && document.activeElement.tagName)) return;
    const k = e.key.toLowerCase();
    if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) stop();
  });
  KERN.tick(() => {
    if (!S.on) return;
    if (VEH.cur !== S.v || VEH.auto !== drive) return stop(true);
    if (joy.active && (Math.abs(joy.x) > 0.35 || Math.abs(joy.y) > 0.35)) stop();
  }, 'navi');

  // ---- the button in the vehicle panel and the list of places ----
  const st = document.createElement('style');
  st.textContent = `
#navipick{position:absolute;right:max(14px,env(safe-area-inset-right,0px));bottom:calc(250px + env(safe-area-inset-bottom,0px));z-index:5;
  display:grid;gap:6px;grid-template-columns:repeat(2,minmax(118px,1fr));padding:10px;border-radius:14px;background:rgba(18,17,15,.66);
  backdrop-filter:blur(6px);color:var(--ov-ink,#fff);pointer-events:auto}
#navipick[hidden]{display:none}
#navipick h4{grid-column:1/-1;margin:0 0 2px;font:600 13px/1.2 var(--f-body,system-ui);opacity:.85}
#navipick button{font:500 13px/1.1 var(--f-body,system-ui);border:0;border-radius:999px;padding:9px 12px;cursor:pointer;
  background:rgba(255,255,255,.14);color:inherit}
#navipick button.off{grid-column:1/-1;background:#ff6a13;color:#fff}
#navibtn[aria-pressed="true"]{background:#ff6a13;color:#fff}`;
  document.head.appendChild(st);
  const pick = document.createElement('div');
  pick.id = 'navipick';
  pick.className = 'ov';
  pick.hidden = true;
  function fill() {
    pick.innerHTML = '';
    const h = document.createElement('h4');
    h.textContent = S.on ? 'Autopilot nach ' + S.dest.label : 'Ziel – der Autopilot fährt hin';
    pick.appendChild(h);
    if (S.on) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'off';
      b.textContent = 'Selbst fahren';
      b.addEventListener('click', () => {
        pick.hidden = true;
        stop();
      });
      pick.appendChild(b);
    }
    for (const [k, name] of DEST) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = name;
      b.addEventListener('click', () => go(k, name));
      pick.appendChild(b);
    }
  }
  function mount() {
    const host = document.getElementById('p-3d') || document.body;
    if (!pick.parentNode) host.appendChild(pick);
    const bar = document.querySelector('#vhud .vbtns');
    if (bar && !document.getElementById('navibtn')) {
      const b = document.createElement('button');
      b.type = 'button';
      b.id = 'navibtn';
      b.title = 'Ziel wählen – der Autopilot fährt hin';
      b.setAttribute('aria-label', 'Ziel und Autopilot');
      b.setAttribute('aria-pressed', 'false');
      b.innerHTML =
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0c0 4.8-6.5 11-6.5 11z"/>' +
        '<circle cx="12" cy="10" r="2.3"/></svg>';
      b.addEventListener('click', () => {
        if (pick.hidden) fill();
        pick.hidden = !pick.hidden;
      });
      bar.insertBefore(b, bar.firstChild);
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
  function ui() {
    const b = document.getElementById('navibtn');
    if (b) b.setAttribute('aria-pressed', S.on ? 'true' : 'false');
    if (!pick.hidden) fill();
  }
  // the list goes when one gets out
  KERN.tick(
    (() => {
      let t = 0;
      return dt => {
        if ((t -= dt) > 0) return;
        t = 0.4;
        if (!VEH.cur && !pick.hidden) pick.hidden = true;
      };
    })(),
    'navi-ui'
  );

  // ---- the way on the small map and the navi's screen; the distance left as its label ----
  if (MMAP) {
    const more0 = MMAP.more,
      dest0 = MMAP.dest;
    MMAP.more = (g, Pf, cx, cy, R2) => {
      if (more0) more0(g, Pf, cx, cy, R2);
      const R = S.on && S.R;
      if (!R) return;
      g.save();
      g.strokeStyle = 'rgba(255,106,19,0.95)';
      g.lineWidth = 4;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      g.beginPath();
      let first = true;
      for (let i = Math.max(0, Math.floor(S.s)); i < R.n; i += 4) {
        const x = R.X[i],
          y = R.Y[i];
        if (Math.abs(x - cx) > R2 * 1.4 || Math.abs(y - cy) > R2 * 1.4) {
          if (!first) break;
          continue;
        }
        const q = Pf(x, y);
        first ? g.moveTo(q[0], q[1]) : g.lineTo(q[0], q[1]);
        first = false;
      }
      g.stroke();
      g.restore();
    };
    MMAP.dest = (cx, cy, psi) => {
      if (S.on && S.dest) {
        const rest = S.R ? S.R.L - S.s : Math.hypot(S.dest.x - cx, S.dest.y - cy);
        return [
          S.dest.label + (S.partial ? ' (Luftlinie)' : ''),
          S.partial ? Math.hypot(S.dest.x - cx, S.dest.y - cy) : rest,
        ];
      }
      return dest0 ? dest0(cx, cy, psi) : null;
    };
  }

  return {
    S,
    DEST,
    go,
    stop,
    plan,
    graph,
    get on() {
      return S.on;
    },
    state: () => ({
      on: S.on,
      dest: S.dest && S.dest.k,
      L: S.R ? Math.round(S.R.L) : 0,
      s: Math.round(S.s),
      partial: S.partial,
      plans: S.plans,
      vt: +S.vt.toFixed(1),
      off: +S.off.toFixed(1),
      hold: S.hold,
      backs: S.backs || 0,
      guide: S.guide || '',
      mode: S.mode || '',
      ended: S.ended || '',
      to: S.dest ? [Math.round(S.dest.x), Math.round(S.dest.y), !!S.dest.spot] : null,
      why: S.why,
      nodes: S.G ? S.G.nodes.length : 0,
      ms: S.gMs || 0,
    }),
  };
})();
window.NAVI = NAVI;
