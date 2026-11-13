// ===================== feat/verkehr-real 5: the traffic on every road round the observer – as much as is counted there now (VKSTROM) =====================
// Falko, 13.11.2026: „Aktuell fahren noch sehr wenig und sehr wenige Autos auf den Straßen … die Verkehrsdichte typisch gestalten“.
// Until now cars drove only in two places (verkehr/verkehr.js: the cast's cars round the Anger and the Markt) and, while one drove,
// one oncoming car now and then. Now:
// - the roads within a ring round the observer (world/roads.js in the village's square, welt/fahrt.js beyond it, cut at the square's
//   edge so no road is there twice) become a graph (verkehr/verkehr_netz.js), rebuilt when the observer has moved on;
// - each road's count now (verkehr/vk_dichte.js: its daily traffic by class or number – A, B, L, K –, the weekday, holiday, month and
//   hour) gives how many vehicles are on it at a time: per direction vehicles an hour × length ÷ speed; together the ring's target,
//   at most the device's budget (computer 36, phone 14; the cast's cars of the places count in);
// - a vehicle comes where it is wanted most, out of sight (never appearing before one's eyes), of the type the road and the hour make
//   likely (lorries on weekdays, none on Sundays; tractors by day, more in harvest; vans; cars by the stock's mix), and drives a route
//   of its own: on at each junction rather straight on and onto the bigger road, out of the ring – or to a dead end, where it parks;
// - out of the ring, arrived and unseen, or too many for the hour: it goes (the farthest unseen first).
// The vehicles are VAUTO's (verkehr/verkehr_auto.js: following, braking, the player in the way, lending): place 'strom'.
//   VKSTROM.tick(dt, o, on)   from VERKEHR's tick (o the observer [x, y]; on: VERKEHR.S.auto); VKSTROM.state() for tests
//   VKSTROM.force = { n } a fixed count, { mult } a factor, null as counted
import { cam, COARSE } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { ROADS } from '../world/roads.js';
import { FAHRT } from '../welt/fahrt.js';
import { CLOCK } from '../time/clock.js';
import { VNETZ } from './verkehr_netz.js';
import { VAUTO } from './verkehr_auto.js';
import { VKTYPEN } from './vk_typen.js';
import { VKMOD } from './vk_modelle.js';
import { VKDICHTE } from './vk_dichte.js';
export const VKSTROM = (() => {
  const S = {
    R: COARSE ? 380 : 520, // the ring (m)
    max: COARSE ? 14 : 36, // at most at once
    G: null,
    at: null,
    src: '',
    cars: [],
    want: 0,
    nWant: 0,
    next: 0,
    prime: true,
    force: null,
    W: null,
    stats: { spawned: 0, removed: 0, parked: 0, noType: 0, graphMs: 0, graphs: 0 },
  };
  const hyp = Math.hypot,
    wrap = a => Math.atan2(Math.sin(a), Math.cos(a)),
    rnd = Math.random;
  // ---- the moment: the calendar day of the game and its minute ----
  function moment() {
    const t = CLOCK.t,
      e0 = window.DN && Number.isFinite(window.DN.e0) ? window.DN.e0 : Date.UTC(2026, 9, 1) / 864e5;
    return VKDICHTE.when(e0 + Math.floor(t / 1440), t - Math.floor(t / 1440) * 1440);
  }
  // ---- the ways round the observer: the village's inside its box, the region's outside it (cut at the box's edge) ----
  const box = () => (window.GEOMAN && GEOMAN.roads && GEOMAN.roads.box) || null;
  function clipOut(p, stride, n, B) {
    const runs = [],
      inB = (x, y) => x > B[0] && x < B[2] && y > B[1] && y < B[3];
    let run = null;
    const cross = (ax, ay, bx, by) => {
      // the point where the segment passes the box's edge (bisection: a is outside, b inside or the other way)
      const ia = inB(ax, ay);
      let lo = 0,
        hi = 1;
      for (let k = 0; k < 22; k++) {
        const m = (lo + hi) / 2;
        if (inB(ax + (bx - ax) * m, ay + (by - ay) * m) === ia) lo = m;
        else hi = m;
      }
      const m = (lo + hi) / 2;
      return [ax + (bx - ax) * m, ay + (by - ay) * m];
    };
    for (let i = 0; i < n; i++) {
      const x = p[i * stride],
        y = p[i * stride + 1],
        out = !inB(x, y);
      if (i > 0) {
        const px = p[(i - 1) * stride],
          py = p[(i - 1) * stride + 1],
          pout = !inB(px, py);
        if (pout !== out) {
          const q = cross(px, py, x, y);
          if (out) run = [q[0], q[1]];
          else if (run) {
            run.push(q[0], q[1]);
            runs.push(run);
            run = null;
          }
        }
      }
      if (out) (run || (run = [])).push(x, y);
    }
    if (run && run.length >= 4) runs.push(run);
    return runs.filter(r => r.length >= 4);
  }
  // the daily traffic of a way by its number (A, B, L, K) where the region's data has it
  const byRef = ref => {
    const m = /^([ABLK])\s?\d/.exec(ref || '');
    return m ? { A: 16000, B: 6000, L: 2500, K: 1000 }[m[1]] : 0;
  };
  function waysNear(ox, oy, R) {
    const out = [],
      B = box(),
      near = (bb, pad) =>
        bb[2] >= ox - R - pad && bb[0] <= ox + R + pad && bb[3] >= oy - R - pad && bb[1] <= oy + R + pad;
    let src = '';
    if (ROADS.ready && B && near(B, 0)) {
      for (const w of ROADS.ways) if (w.kind <= 5) out.push(w);
      src += 'r';
    }
    const F = FAHRT && FAHRT.data && FAHRT.data.ways;
    if (F && F.length) {
      for (const w of F) {
        if (w.kind > 5 || !w.bb || !near(w.bb, 20)) continue;
        const runs = B
          ? clipOut(w.p, 3, w.n, B)
          : [Array.from({ length: w.n * 2 }, (_, i) => w.p[(i >> 1) * 3 + (i & 1)])];
        for (const p of runs) out.push({ kind: w.kind, w: w.hw * 2, p, ref: w.ref, name: w.name });
      }
      src += 'f' + F.length;
    }
    return { ways: out, src };
  }
  // ---- the graph and what each road carries ----
  // the speed one drives (m/s): in a place 50 km/h (lanes 30), outside by class; the lane's offset as the cast's cars
  const vOf = e =>
    e.style === 2 || e.style === 3
      ? [13.9, 13.9, 13.9, 13.9, 8.3, 5.6][e.kind] || 8.3
      : [33, 25, 22, 16.7, 11, 6][e.kind] || 8.3;
  const laneOf = e => Math.max(0.75, Math.min(1.75, e.w / 4));
  function build(o) {
    const t0 = performance.now(),
      { ways, src } = waysNear(o[0], o[1], S.R + 60);
    S.src = src;
    S.at = [o[0], o[1]];
    if (!ways.length) {
      S.G = null;
      return;
    }
    const G = VNETZ.graph(ways, { kinds: new Set([0, 1, 2, 3, 4, 5]), clip: [o[0], o[1], S.R] });
    for (const e of G.edges) {
      const m = e.pts[e.pts.length >> 1],
        sf = KERN.surface ? KERN.surface(m[0], m[1]) : null;
      e.style = sf && sf.style != null ? sf.style : e.kind === 3 ? 3 : 0;
      e.v = vOf(e);
      e.lane = laneOf(e);
      e.dtv = 0;
    }
    // the daily traffic: by number where known (the region's ways carry it on the source way: find it by the edge's middle)
    for (const w of ways) w._dtv = byRef(w.ref);
    for (const e of G.edges) e.dtv = VKDICHTE.dtv(e.kind, e.style);
    if (ways.some(w => w._dtv)) {
      const refs = ways.filter(w => w._dtv);
      for (const e of G.edges) {
        const m = e.pts[e.pts.length >> 1];
        for (const w of refs) {
          const p = w.p;
          let hit = false;
          for (let i = 0; i + 3 < p.length; i += 2) {
            const ax = p[i],
              ay = p[i + 1],
              dx = p[i + 2] - ax,
              dy = p[i + 3] - ay,
              l2 = dx * dx + dy * dy || 1e-9,
              t = Math.max(0, Math.min(1, ((m[0] - ax) * dx + (m[1] - ay) * dy) / l2));
            if (hyp(m[0] - ax - dx * t, m[1] - ay - dy * t) < 1.5) {
              hit = true;
              break;
            }
          }
          if (hit) {
            // through a place a little less than out in the country, never below the class's own
            e.dtv = Math.max(e.dtv, w._dtv * (e.style === 2 || e.style === 3 ? 0.85 : 1));
            break;
          }
        }
      }
    }
    for (const n of G.nodes) n.deg = n.edges.length;
    S.G = G;
    S.stats.graphMs = Math.round(performance.now() - t0);
    S.stats.graphs++;
  }
  // ---- how many now: per edge and direction vehicles an hour × length ÷ speed ----
  function wanted(W) {
    const G = S.G;
    let sum = 0;
    if (!G) return 0;
    for (const e of G.edges) {
      const q = (e.dtv * W.f * W.hs) / 2 / 3600; // per second, one direction
      e.n = (q * e.len) / e.v; // vehicles on it, one direction
      sum += 2 * e.n;
    }
    S.nWant = sum;
    if (S.force && S.force.n != null) return S.force.n;
    return Math.min(S.max, sum * (S.force && S.force.mult ? S.force.mult : 1));
  }
  // ---- seen: near, or in front of the camera (a little stricter than the walkers': a vehicle is seen farther) ----
  const _f = { x: 0, z: -1 };
  function seen(x, y) {
    const dx = x - cam.position.x,
      dy = y + cam.position.z,
      d = hyp(dx, dy);
    if (d < 40) return true;
    if (d > 340) return false;
    return (dx * _f.x - dy * _f.z) / d > 0.25;
  }
  // ---- a route from an edge on: at each junction rather straight on and onto the bigger road; out of the ring, or into a dead end ----
  const dirAt = (e, fwd, end) => {
    const q = e.pts,
      n = q.length,
      a = fwd ? (end ? q[n - 2] : q[0]) : end ? q[1] : q[n - 1],
      b = fwd ? (end ? q[n - 1] : q[1]) : end ? q[0] : q[n - 2];
    return Math.atan2(b[0] - a[0], b[1] - a[1]);
  };
  function walk(e, fwd, len) {
    const G = S.G,
      path = [{ e, fwd }];
    let acc = e.len,
      cur = e,
      f = fwd,
      end = 'exit';
    for (let hop = 0; hop < 60 && acc < len; hop++) {
      const node = f ? cur.b : cur.a,
        N = G.nodes[node];
      if (N.exit) break;
      const h0 = dirAt(cur, f, true),
        cand = [];
      let sum = 0;
      for (const n of N.edges) {
        if (n === cur) continue;
        const nf = n.a === node,
          tu = Math.abs(wrap(dirAt(n, nf, false) - h0));
        if (tu > 2.6) continue;
        const far = G.nodes[nf ? n.b : n.a],
          sack = far.deg === 1 && !far.exit,
          w = Math.pow(n.dtv + 20, 0.7) * (tu < 0.45 ? 1.8 : tu < 1.2 ? 1 : 0.55) * (sack ? 0.12 : 1);
        cand.push([n, nf, w]);
        sum += w;
      }
      if (!cand.length) {
        end = 'sack';
        break;
      }
      let r = rnd() * sum,
        ch = cand[0];
      for (const c of cand)
        if ((r -= c[2]) <= 0) {
          ch = c;
          break;
        }
      path.push({ e: ch[0], fwd: ch[1] });
      acc += ch[0].len;
      cur = ch[0];
      f = ch[1];
      const nn = G.nodes[f ? cur.b : cur.a];
      if (nn.deg === 1 && !nn.exit) {
        end = 'sack';
        break;
      }
    }
    return { path, end };
  }
  // ---- which vehicle: the road and the hour's heavy share, else a car of the stock's mix – one whose model is built ----
  function typOf(e, W) {
    let t = VKDICHTE.typ(e.kind, e.style, W, rnd(), rnd());
    const zug = t && VKTYPEN.TYP[t].zug;
    if (t && VKMOD.ready(t) && (!zug || VKMOD.ready(zug))) return t;
    if (t) {
      VKMOD.need(t, 1);
      if (zug) VKMOD.need(zug, 1);
    }
    const L = VKTYPEN.PKW;
    let sum = 0;
    for (const [k, w] of L) if (VKMOD.ready(k)) sum += w;
    if (!sum) return null;
    let r = rnd() * sum;
    for (const [k, w] of L) if (VKMOD.ready(k) && (r -= w) <= 0) return k;
    return null;
  }
  // ---- a vehicle: where it is wanted most, out of sight ----
  const _a = {};
  function spawn(o, W, prime) {
    const G = S.G;
    let sum = 0;
    for (const e of G.edges) sum += e.n;
    if (sum <= 0) return null;
    for (let tries = 0; tries < 12; tries++) {
      let r = rnd() * sum,
        e = G.edges[0];
      for (const q of G.edges)
        if ((r -= q.n) <= 0) {
          e = q;
          break;
        }
      const fwd = rnd() < 0.5,
        u = rnd(),
        q = e.pts,
        // a point along the edge (by length)
        at = (() => {
          let tot = 0;
          const L = [];
          for (let i = 1; i < q.length; i++) L.push((tot += hyp(q[i][0] - q[i - 1][0], q[i][1] - q[i - 1][1])));
          const want = u * tot;
          for (let i = 0; i < L.length; i++)
            if (L[i] >= want) {
              const l0 = i ? L[i - 1] : 0,
                t = (want - l0) / Math.max(1e-6, L[i] - l0);
              return [
                q[i][0] + (q[i + 1][0] - q[i][0]) * t,
                q[i][1] + (q[i + 1][1] - q[i][1]) * t,
                fwd ? want : tot - want,
              ];
            }
          return [q[q.length - 1][0], q[q.length - 1][1], fwd ? tot : 0];
        })(),
        d = hyp(at[0] - o[0], at[1] - o[1]);
      if (!prime && (seen(at[0], at[1]) || d < 70)) continue;
      if (prime && d < 25) continue;
      const typ = typOf(e, W);
      if (!typ) {
        S.stats.noType++;
        return null;
      }
      const { path, end } = walk(e, fwd, S.R * 2.2),
        line = VNETZ.line(path, {
          off: x => x.lane,
          vmax: x => x.v,
          cut: 6,
          aLat: 2.0,
          aBrk: 2.0,
          vMin: 2.6,
          vEnd: end === 'sack' ? 0 : null,
        });
      if (!line || line.L < 30) continue;
      const T = VKTYPEN.TYP[typ],
        s0 = Math.max(T.b < 0 ? -T.b : 2, Math.min(line.L - 10, at[2]));
      // not onto another vehicle
      VNETZ.at(line, s0, _a);
      if (VAUTO.cars.some(c => hyp(c.x - _a.x, c.y - _a.y) < 14 + (c.D ? c.D.HL : 3))) continue;
      line.lane = new Float32Array(line.n);
      {
        let s = 0;
        for (const { e: pe } of path) {
          const n = Math.ceil(pe.len);
          for (let i = 0; i < n && s < line.n; i++, s++) line.lane[s] = pe.lane;
        }
      }
      const c = VAUTO.spawn({
        place: 'strom',
        typ,
        line,
        s: s0,
        v: Math.min(line.S[Math.round(s0)] || 8, T.vmax / 3.6) * 0.9,
      });
      if (!c.vm) {
        VAUTO.remove(c);
        return null;
      }
      c.vk = 0.9 + rnd() * 0.16;
      c.laneOff = e.lane;
      c.vcap = T.cls === 'trak' ? 11.1 : T.cls === 'lkw' ? (e.kind === 0 ? 24.7 : 22.2) : T.cls === 'lfz' ? 36 : 50;
      c.strom = { end, born: performance.now(), stuck: 0 };
      S.cars.push(c);
      S.stats.spawned++;
      return c;
    }
    return null;
  }
  function drop(c) {
    VAUTO.remove(c);
    S.stats.removed++;
  }
  // ---- per frame (from VERKEHR's tick) ----
  function tick(dt, o, on) {
    if (cam) {
      const e = cam.matrixWorld.elements,
        fx = -e[8],
        fz = -e[10],
        l = hyp(fx, fz) || 1;
      _f.x = fx / l;
      _f.z = fz / l;
    }
    S.cars = S.cars.filter(c => c.st !== 'weg');
    if (!on) {
      // switched off (a mode of its own, the zombie night): the unseen go at once
      for (const c of S.cars.slice()) if (!seen(c.x, c.y) && c.st !== 'geliehen') drop(c);
      return;
    }
    // the graph: first, when the observer has moved on, when more road data has come (a jump: prime again)
    const moved = S.at ? hyp(o[0] - S.at[0], o[1] - S.at[1]) : Infinity,
      F = FAHRT && FAHRT.data && FAHRT.data.ways,
      sig = (ROADS.ready ? 'r' : '') + (F && F.length ? F.length : 0);
    if (sig !== '0' && (!S.G || moved > S.R * 0.35 || sig !== S.sig)) {
      S.sig = sig;
      build(o);
      if (moved > S.R) S.prime = true;
    }
    if (!S.G) return;
    const W = (S.W = moment());
    // the cast's cars of the places near by count in
    let others = 0;
    for (const c of VAUTO.cars)
      if (c.place !== 'strom' && c.st !== 'weg' && hyp(c.x - o[0], c.y - o[1]) < S.R) others++;
    const want = (S.want = Math.max(0, wanted(W) - others));
    // the vehicles: arrived, out of the ring, stuck – they go when unseen
    for (const c of S.cars.slice()) {
      if (c.st === 'geliehen') continue;
      const d = hyp(c.x - o[0], c.y - o[1]),
        vis = seen(c.x, c.y),
        st = c.strom;
      if (c.st === 'fahren' && c.v < 0.1 && c.s > c.line.L - 9) {
        c.st = 'parkt';
        S.stats.parked++;
      }
      st.stuck = c.st === 'fahren' && c.v < 0.2 ? st.stuck + dt : 0;
      if (
        c.st === 'ende' ||
        d > S.R + 140 ||
        (!vis && (c.st === 'parkt' || st.stuck > 40 || d > S.R + 20)) ||
        (c.st === 'ende' && d > 260)
      )
        drop(c);
    }
    // too many for the hour (or the budget fell): the farthest unseen first
    if (S.cars.length > Math.ceil(want * 1.25) + 1) {
      const cand = S.cars
        .filter(c => c.st !== 'geliehen' && !seen(c.x, c.y))
        .sort((a, b) => hyp(b.x - o[0], b.y - o[1]) - hyp(a.x - o[0], a.y - o[1]));
      if (cand.length) drop(cand[0]);
    }
    // too few: one more (a few at once when priming: at the start or after a jump)
    if ((S.next -= dt) <= 0 && S.cars.length < Math.floor(want + rnd())) {
      const n = S.prime ? Math.min(8, Math.ceil(want - S.cars.length)) : 1;
      for (let i = 0; i < n; i++) spawn(o, W, S.prime);
      S.next = S.prime ? 0.2 : 0.6 + rnd() * 0.8;
      if (S.cars.length >= Math.floor(want)) S.prime = false;
    }
  }
  function state() {
    return {
      R: S.R,
      max: S.max,
      src: S.src,
      edges: S.G ? S.G.edges.length : 0,
      want: +S.want.toFixed(2),
      counted: +S.nWant.toFixed(2),
      n: S.cars.filter(c => c.st !== 'weg').length,
      types: S.cars.reduce((m, c) => ((m[c.typ] = (m[c.typ] || 0) + 1), m), {}),
      when: S.W
        ? { day: S.W.day, fei: S.W.fei, h: +S.W.h.toFixed(2), f: +S.W.f.toFixed(3), hs: +S.W.hs.toFixed(4) }
        : null,
      stats: S.stats,
    };
  }
  Object.assign(S, { tick, state, build, spawn, drop, seen, moment, clipOut, walk });
  return S;
})();
window.VKSTROM = VKSTROM;
