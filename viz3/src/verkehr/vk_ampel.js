// ===================== feat/verkehr-real stage 2b: traffic lights (VKAMPEL) =====================
// Falko, 13.11.2026 12:14: „Sie sollen sich natürlich an Ampeln und Verkehrsregeln halten.“ The lights of OpenStreetMap in the region
// (highway=traffic_signals at a junction, crossing=traffic_signals for walkers; © OpenStreetMap contributors, ODbL 1.0) and those a set of
// strassen/ brings (STRDAT.add with `ampeln`: [kind 'k' | 'f', x dm, y dm], e.g. Suhl's): poles with their heads on every approach, the
// lamps switching by phase (verkehr/vk_regeln.js: a junction's two groups in a cycle of 50 s, a crossing green for the cars until a
// walker presses), and for the traffic the light of each approach (VKAMPEL.attach: the junction or crossing events of a route get the
// light; verkehr/verkehr_auto.js stops at red and red-yellow, at yellow when it can). Built when the observer comes within 400 m; the
// poles, heads and housings of a light one mesh, its lamps one mesh per group and colour (a light at a junction 7 draws, a crossing 6).
import * as THREE from 'three';
import { scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { ROADS } from '../world/roads.js';
import { FAHRT } from '../welt/fahrt.js';
import { STRDAT } from '../strassen/strassen_daten.js';
import { VNETZ } from './verkehr_netz.js';
import { VKREGELN } from './vk_regeln.js';
export const VKAMPEL = (() => {
  // OpenStreetMap, 13.11.2026: node, kind, site metres (the crossing 9423643896 belongs to the junction 10789356, 19 m from it)
  const OSM = [
    [10789356, 'k', -1033.9, 1676.8],
    [393862429, 'f', -702.6, 1419.3],
  ];
  const S = { lights: [], t: 0, rev: -1, built: 0, reqs: 0 };
  const hyp = Math.hypot,
    PI = Math.PI;
  // ---- the lights ----
  function make(id, kind, x, y, set) {
    const L = {
      id,
      kind,
      x,
      y,
      set: set || '',
      off: (Math.abs(id) % 97) * 0.37, // each junction its own moment in the cycle
      axis: null, // the main road's heading (a junction): group A along it
      st: { ph: 'gruen', t: 20 + (Math.abs(id) % 17), req: false }, // a crossing's state
      g: null, // the meshes, once built
      mat: null,
    };
    L.shows = grp => state(L, grp); // for verkehr/verkehr_auto.js (it loads before this module)
    return L;
  }
  function sync() {
    const rev = STRDAT.ready ? STRDAT.rev : -2;
    if (rev === S.rev) return;
    S.rev = rev;
    const keep = new Map(S.lights.map(L => [L.id, L]));
    const list = OSM.map(([id, k, x, y]) => keep.get(id) || make(id, k, x, y));
    if (STRDAT.sets)
      for (const [name, st] of STRDAT.sets) {
        const A = st.data && st.data.ampeln;
        if (!A) continue;
        A.forEach((a, i) => {
          const id = 'set:' + name + ':' + i;
          list.push(keep.get(id) || make(id, a[0], a[1] / 10, a[2] / 10, name));
        });
      }
    for (const L of S.lights) if (!list.includes(L)) free(L);
    S.lights = list;
  }
  // the state a group of the light shows the cars now
  function state(L, grp) {
    if (L.kind === 'f') return L.st.ph;
    const p = VKREGELN.phaseK(S.t + L.off);
    return grp === 'B' ? p.B : p.A;
  }
  // the group of an approach heading into the junction (A: along the main road, either way)
  const grpOf = (L, h) => (L.axis === null || Math.abs(Math.cos(h - L.axis)) > 0.7 ? 'A' : 'B');
  // ---- the ways round a light (as the flow takes them: the square's roads, the region's beyond) ----
  function waysNear(x, y, r) {
    const out = [];
    const take = w => {
      const p = w.p;
      for (let i = 0; i + 1 < p.length; i += 2) if (hyp(p[i] - x, p[i + 1] - y) < r + 60) return out.push(w);
    };
    if (ROADS.ready) for (const w of ROADS.ways) if (w.kind <= 5) take(w);
    const F = FAHRT && FAHRT.data && FAHRT.data.ways;
    if (F)
      for (const w of F) {
        if (w.kind > 5 || (w.bb && (w.bb[2] < x - r || w.bb[0] > x + r || w.bb[3] < y - r || w.bb[1] > y + r)))
          continue;
        const p = [];
        for (let i = 0; i < w.n; i++) p.push(w.p[i * 3], w.p[i * 3 + 1]);
        take({ kind: w.kind, w: w.hw * 2, p });
      }
    return out;
  }
  // ---- the meshes ----
  const DARK = new THREE.MeshStandardMaterial({ color: 0x2b2e30, roughness: 0.55, metalness: 0.4 });
  DARK.name = 'verkehr ampel';
  const LAMP = {
    r: [new THREE.Color(1.0, 0.08, 0.04), new THREE.Color(0.12, 0.02, 0.02)],
    y: [new THREE.Color(1.0, 0.62, 0.05), new THREE.Color(0.13, 0.09, 0.02)],
    g: [new THREE.Color(0.15, 1.0, 0.45), new THREE.Color(0.02, 0.11, 0.05)],
  };
  const lampMat = () => {
    const m = new THREE.MeshBasicMaterial({ color: 0x111111, toneMapped: false });
    m.name = 'verkehr ampel licht';
    return m;
  };
  // their programs made while the loading screen is up (render/render.js compileShown), none when a light is built in play
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0, 0, 0, 0], 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
    for (const m of [DARK, lampMat()]) {
      const c = new THREE.Mesh(g, m);
      c.visible = false;
      c.castShadow = m === DARK;
      c.receiveShadow = m === DARK;
      c.name = 'verkehr carrier ampel';
      scene.add(c);
    }
  }
  // a box into arrays (centre c, half sizes, heading h about z): positions and normals of its 12 triangles
  function box(P, N, c, hx, hy, hz, h) {
    const cs = Math.cos(h),
      sn = Math.sin(h),
      V = (x, y, z) => [c[0] + x * cs + y * sn, c[1] - x * sn + y * cs, c[2] + z],
      R = (x, y) => [x * cs + y * sn, -x * sn + y * cs];
    const faces = [
      [
        [1, 0, 0],
        [hx, -hy, -hz],
        [hx, hy, -hz],
        [hx, hy, hz],
        [hx, -hy, hz],
      ],
      [
        [-1, 0, 0],
        [-hx, hy, -hz],
        [-hx, -hy, -hz],
        [-hx, -hy, hz],
        [-hx, hy, hz],
      ],
      [
        [0, 1, 0],
        [hx, hy, -hz],
        [-hx, hy, -hz],
        [-hx, hy, hz],
        [hx, hy, hz],
      ],
      [
        [0, -1, 0],
        [-hx, -hy, -hz],
        [hx, -hy, -hz],
        [hx, -hy, hz],
        [-hx, -hy, hz],
      ],
      [
        [0, 0, 1],
        [-hx, -hy, hz],
        [hx, -hy, hz],
        [hx, hy, hz],
        [-hx, hy, hz],
      ],
      [
        [0, 0, -1],
        [-hx, hy, -hz],
        [hx, hy, -hz],
        [hx, -hy, -hz],
        [-hx, -hy, -hz],
      ],
    ];
    for (const [n, a, b, cc, d] of faces) {
      const q = [a, b, cc, d].map(v => V(...v)),
        nn = n[2] ? [0, 0, n[2]] : [...R(n[0], n[1]), 0];
      for (const k of [0, 1, 2, 0, 2, 3]) {
        // three's frame: x, z up, −y
        P.push(q[k][0], q[k][2], -q[k][1]);
        N.push(nn[0], nn[2], -nn[1]);
      }
    }
  }
  // a lamp: a disc facing heading h (the side the traffic comes from), at c
  function disc(P, N, c, r, h) {
    const fx = Math.sin(h),
      fy = Math.cos(h),
      rx = Math.cos(h),
      ry = -Math.sin(h),
      n = 12;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * 2 * PI,
        a1 = ((i + 1) / n) * 2 * PI;
      const pt = a => [c[0] + rx * Math.cos(a) * r, c[1] + ry * Math.cos(a) * r, c[2] + Math.sin(a) * r];
      for (const q of [c, pt(a0), pt(a1)]) {
        P.push(q[0] + fx * 0.01, q[2], -(q[1] + fy * 0.01));
        N.push(fx, 0, -fy);
      }
    }
  }
  const geo = (P, N) => {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
    g.computeBoundingSphere();
    return g;
  };
  // a pole at (x, y) with a head facing h (towards the traffic it shows to), lamps into the arrays of its group
  function pole(D, x, y, h, grp, walk) {
    const z = KERN.ground(x, y);
    box(D.P, D.N, [x, y, z + 1.5], 0.05, 0.05, 1.5, h);
    const hc = [x + Math.sin(h) * 0.12, y + Math.cos(h) * 0.12, z + 3.05];
    box(D.P, D.N, hc, 0.16, 0.11, 0.48, h);
    const lz = { r: 0.31, y: 0, g: -0.31 };
    for (const c of ['r', 'y', 'g']) {
      const L = D.L[grp + c] || (D.L[grp + c] = { P: [], N: [] });
      disc(L.P, L.N, [hc[0] + Math.sin(h) * 0.115, hc[1] + Math.cos(h) * 0.115, hc[2] + lz[c]], 0.1, h);
      // the visor above each lamp
      box(D.P, D.N, [hc[0] + Math.sin(h) * 0.2, hc[1] + Math.cos(h) * 0.2, hc[2] + lz[c] + 0.12], 0.12, 0.09, 0.008, h);
    }
    if (walk) {
      // the walkers' head: red and green figure lamps, facing across the road (the side), lower on the same pole
      const hw = h + walk,
        wc = [x + Math.sin(hw) * 0.1, y + Math.cos(hw) * 0.1, z + 2.2];
      box(D.P, D.N, wc, 0.14, 0.09, 0.28, hw);
      for (const [c, dz] of [
        ['wr', 0.13],
        ['wg', -0.13],
      ]) {
        const L = D.L[c] || (D.L[c] = { P: [], N: [] });
        disc(L.P, L.N, [wc[0] + Math.sin(hw) * 0.095, wc[1] + Math.cos(hw) * 0.095, wc[2] + dz], 0.09, hw);
      }
    }
  }
  function build(L) {
    const ways = waysNear(L.x, L.y, 60),
      G = VNETZ.graph(ways, { kinds: new Set([0, 1, 2, 3, 4, 5]), clip: [L.x, L.y, 45] });
    const D = { P: [], N: [], L: {} };
    if (L.kind === 'k') {
      // the junction: its node; a pole on the right of every approach before the junction, the head facing the approaching traffic
      let ni = -1,
        bd = 14;
      G.nodes.forEach((N, i) => {
        const d = hyp(N.x - L.x, N.y - L.y);
        if (N.edges.length >= 3 && d < bd) ((bd = d), (ni = i));
      });
      if (ni < 0) return false;
      const N = G.nodes[ni],
        app = N.edges.map(e => ({ e, h: VKREGELN.inHead(G, e, ni) }));
      const top = app.slice().sort((a, b) => a.e.kind - b.e.kind)[0];
      L.axis = top.h;
      L.nx = N.x;
      L.ny = N.y;
      for (const a of app) {
        const back = Math.max(4, Math.max(...app.filter(b => b !== a).map(b => (b.e.w || 6) / 2)) + 1.5),
          hw = (a.e.w || 6) / 2 + 0.9,
          x = N.x - Math.sin(a.h) * back + Math.cos(a.h) * hw,
          y = N.y - Math.cos(a.h) * back - Math.sin(a.h) * hw;
        pole(D, x, y, a.h + PI, grpOf(L, a.h), PI / 2);
      }
    } else {
      // a crossing on a way: the way's direction there; a pole each side, a head each way, the walkers' heads across
      let best = null;
      for (const e of G.edges)
        for (let k = 0; k + 1 < e.pts.length; k++) {
          const [a, b] = [e.pts[k], e.pts[k + 1]],
            dx = b[0] - a[0],
            dy = b[1] - a[1],
            l2 = dx * dx + dy * dy || 1,
            t = Math.max(0, Math.min(1, ((L.x - a[0]) * dx + (L.y - a[1]) * dy) / l2)),
            d = hyp(L.x - a[0] - dx * t, L.y - a[1] - dy * t);
          if (d < 12 && (!best || d < best.d))
            best = { e, d, h: Math.atan2(dx, dy), x: a[0] + dx * t, y: a[1] + dy * t };
        }
      if (!best) return false;
      L.axis = best.h;
      L.nx = best.x;
      L.ny = best.y;
      const hw = (best.e.w || 6) / 2 + 0.9;
      for (const s of [1, -1]) {
        const h = best.h + (s > 0 ? 0 : PI),
          // before the crossing for traffic heading h: 3 m back, on its right
          x = best.x - Math.sin(h) * 3 + Math.cos(h) * hw,
          y = best.y - Math.cos(h) * 3 - Math.sin(h) * hw;
        pole(D, x, y, h + PI, 'A', s > 0 ? -PI / 2 : PI / 2);
      }
    }
    const g = new THREE.Group();
    g.name = 'verkehr ampel';
    const body = new THREE.Mesh(geo(D.P, D.N), DARK);
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);
    L.mat = {};
    for (const [k, A] of Object.entries(D.L)) {
      const m = lampMat(),
        mesh = new THREE.Mesh(geo(A.P, A.N), m);
      mesh.name = 'verkehr ampel licht';
      L.mat[k] = m;
      g.add(mesh);
    }
    scene.add(g);
    L.g = g;
    S.built++;
    paint(L, true);
    return true;
  }
  function free(L) {
    if (!L.g) return;
    scene.remove(L.g);
    L.g.traverse(o => o.geometry && o.geometry.dispose());
    for (const m of Object.values(L.mat || {})) m.dispose();
    L.g = null;
    L.mat = null;
  }
  // the lamps of a light as its phase shows now (only what changed: a new frame then)
  function paint(L, force) {
    if (!L.mat) return;
    let changed = false;
    const set = (k, on, col) => {
      const m = L.mat[k];
      if (!m) return;
      const c = col[on ? 0 : 1];
      if (force || !m.color.equals(c)) {
        m.color.copy(c);
        changed = true;
      }
    };
    for (const grp of ['A', 'B']) {
      const s = state(L, grp);
      set(grp + 'r', s === 'rot' || s === 'rotgelb', LAMP.r);
      set(grp + 'y', s === 'gelb' || s === 'rotgelb', LAMP.y);
      set(grp + 'g', s === 'gruen', LAMP.g);
    }
    // the walkers: green while the cars of the road they cross have red (a junction: the cars of group A)
    const wg = L.kind === 'f' ? VKREGELN.walkGreen(L.st) : state(L, 'A') === 'rot' && state(L, 'B') !== 'gruen';
    set('wr', !wg, LAMP.r);
    set('wg', wg, LAMP.g);
    if (changed) markDirty();
  }
  // ---- per frame ----
  // o: the observer [x, y]; player: the player's position (a walker at a crossing presses)
  function tick(dt, o, player) {
    sync();
    S.t += dt;
    for (const L of S.lights) {
      if (L.kind === 'f') {
        // someone presses now and then by day (about every 70 s), or the player standing at the crossing
        const near = player && hyp(player[0] - (L.nx ?? L.x), player[1] - (L.ny ?? L.y)) < 5;
        const req = near || Math.random() < dt / 70;
        if (req && !L.st.req && L.st.ph === 'gruen') S.reqs++;
        VKREGELN.crossStep(L.st, dt, req);
      }
      const d = hyp(o[0] - L.x, o[1] - L.y);
      if (!L.g && d < 400 && !L.failed) {
        try {
          if (!build(L)) L.failed = true;
        } catch (e) {
          L.failed = true;
          console.warn('ampel', e);
        }
      } else if (L.g && d > 650) free(L);
      if (L.g) paint(L, false);
    }
  }
  // ---- for the traffic: the lights of a route's events ----
  // a junction event within 15 m of a junction light gets the light of its approach (and every approach there counts as equal: the light
  // decides, left turns still wait for the oncoming); a crossing light near the route becomes an event of its own
  function attach(events, line, project) {
    if (!events) return events;
    sync();
    for (const L of S.lights) {
      if (L.kind === 'k') {
        for (const ev of events)
          if (hyp(ev.x - L.x, ev.y - L.y) < 15) {
            ev.lt = { L, g: grpOf(L, ev.h) };
            ev.role = 'prio';
          }
      } else {
        const cx = L.nx ?? L.x,
          cy = L.ny ?? L.y;
        if (cx < line.X[0] - 2000 || cx > line.X[0] + 2000) continue;
        const pr = project(line, cx, cy);
        if (!pr || pr.d > 7 || pr.s < 5 || pr.s > line.L - 3) continue;
        const i = Math.min(line.n - 2, Math.max(0, Math.floor(pr.s / line.step))),
          h = Math.atan2(line.X[i + 1] - line.X[i], line.Y[i + 1] - line.Y[i]);
        events.push({
          ni: -1,
          x: cx,
          y: cy,
          sN: pr.s,
          sStop: pr.s - 3.2,
          role: 'prio',
          h,
          turn: 0,
          line: 'halt',
          rule: null,
          passed: false,
          go: false,
          halted: 0,
          wait: 0,
          lt: { L, g: 'A' },
          crossing: true,
        });
      }
    }
    events.sort((a, b) => a.sN - b.sN);
    return events;
  }
  // the state an event's light shows its approach now (null: no light)
  const show = ev => (ev && ev.lt ? state(ev.lt.L, ev.lt.g) : null);
  // the top view: every light, its colour for group A
  const dots = () =>
    S.lights.map(L => ({ x: L.nx ?? L.x, y: L.ny ?? L.y, kind: L.kind, a: state(L, 'A'), b: state(L, 'B') }));
  Object.assign(S, { tick, attach, show, state, dots, sync, grpOf });
  return S;
})();
window.VKAMPEL = VKAMPEL;
