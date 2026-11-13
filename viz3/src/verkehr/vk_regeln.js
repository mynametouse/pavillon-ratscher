// ===================== feat/verkehr-real, stage 2: the rules of the road (VKREGELN) =====================
// Falko, 13.11.2026 12:14: „Sie sollen sich natürlich an Ampeln und Verkehrsregeln halten.“ Pure (no scene, no DOM; unit tests in
// viz3/test/unit/verkehr_real.test.mjs): the app hands in the graphs of verkehr/verkehr_netz.js and the signs and lines of
// strassen/strassen_daten.js (OpenStreetMap, by rule where a street joins a classified road).
// - At a junction every approach gets a role: 'prio' (has the right of way), 'yield' (sign 205, or the smaller road: a lane or a drive
//   gives way to a street, a street to a main or county road – StVO § 8, § 10), 'stop' (sign 206: halt at the line first), 'rb' (into a
//   roundabout, 205 + 215; the ring has the way), 'rvl' (roads of one rank without a sign: right before left, § 8 (1)).
// - Whom a vehicle waits for: whoever is in the junction already; a higher role; of the same role the one from the right (not on the
//   priority road), and a left turn waits for the oncoming that goes straight or right (§ 9 (3)). Within a time window (the other one
//   arrives in less than ~4 s); four at a crossing of equals, all waiting: the one waiting longest goes (the lowest number if equal).
// - Speed limits by sign along a route (274, 274.1 zone, 278 end): from the sign on, until the end sign, a new limit or a turn.
// - Indicators: before a turn of more than ~25° (−1 left, +1 right).
// Headings are compass radians (0 north, clockwise), positions site metres (x east, y north) as everywhere in verkehr/.
export const VKREGELN = (() => {
  const hyp = Math.hypot,
    PI = Math.PI;
  const wrap = a => {
    while (a > PI) a -= 2 * PI;
    while (a < -PI) a += 2 * PI;
    return a;
  };
  const head = (ax, ay, bx, by) => Math.atan2(bx - ax, by - ay);
  // ---- an index of points (signs, lines): a grid of 50 m ----
  function index(items) {
    const G = new Map(),
      C = 50,
      key = (i, j) => i * 100003 + j;
    for (const it of items) {
      const k = key(Math.floor(it.x / C), Math.floor(it.y / C));
      let a = G.get(k);
      if (!a) G.set(k, (a = []));
      a.push(it);
    }
    return {
      n: items.length,
      near(x, y, r) {
        const out = [],
          i0 = Math.floor((x - r) / C),
          i1 = Math.floor((x + r) / C),
          j0 = Math.floor((y - r) / C),
          j1 = Math.floor((y + r) / C);
        for (let i = i0; i <= i1; i++)
          for (let j = j0; j <= j1; j++) {
            const a = G.get(key(i, j));
            if (a) for (const it of a) if (hyp(it.x - x, it.y - y) <= r) out.push(it);
          }
        return out;
      },
    };
  }
  // the file's signs [code, x dm, y dm, heading °, text] and lines [type, x dm, y dm, heading °, half width] → items in metres and radians
  const signs = arr => (arr || []).map(s => ({ code: String(s[0]), x: s[1] / 10, y: s[2] / 10, h: (s[3] * PI) / 180 }));
  const lines = arr =>
    (arr || []).map(l => ({ type: l[0], x: l[1] / 10, y: l[2] / 10, h: (l[3] * PI) / 180, hw: l[4] / 10 }));
  // ---- headings at a node ----
  // the point d metres along edge e from node ni (or its far end)
  function along(e, ni, d) {
    const p = e.b === ni ? e.pts.slice().reverse() : e.pts;
    let acc = 0;
    for (let k = 1; k < p.length; k++) {
      const l = hyp(p[k][0] - p[k - 1][0], p[k][1] - p[k - 1][1]);
      if (acc + l >= d) {
        const t = (d - acc) / (l || 1e-9);
        return [p[k - 1][0] + (p[k][0] - p[k - 1][0]) * t, p[k - 1][1] + (p[k][1] - p[k - 1][1]) * t];
      }
      acc += l;
    }
    return p[p.length - 1];
  }
  // travelling into node ni along e, and out of it along e (measured over 8 m – the first vertex may sit very close)
  function inHead(G, e, ni) {
    const N = G.nodes[ni],
      q = along(e, ni, Math.min(8, e.len * 0.5));
    return head(q[0], q[1], N.x, N.y);
  }
  function outHead(G, e, ni) {
    const N = G.nodes[ni],
      q = along(e, ni, Math.min(8, e.len * 0.5));
    return head(N.x, N.y, q[0], q[1]);
  }
  // the distance of (x, y) to the first `reach` metres of edge e from node ni
  function nearEdge(e, ni, x, y, reach) {
    const p = e.b === ni ? e.pts.slice().reverse() : e.pts;
    let acc = 0,
      best = Infinity;
    for (let k = 1; k < p.length && acc < reach; k++) {
      const ax = p[k - 1][0],
        ay = p[k - 1][1],
        dx = p[k][0] - ax,
        dy = p[k][1] - ay,
        l2 = dx * dx + dy * dy || 1e-9,
        t = Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / l2));
      best = Math.min(best, hyp(x - ax - dx * t, y - ay - dy * t));
      acc += Math.sqrt(l2);
    }
    return best;
  }
  // ---- the rule at a node ----
  const RANK = { prio: 0, rbc: 0, rvl: 1, yield: 2, stop: 2, rb: 2 };
  const SIGN = { 205: 'yield', 206: 'stop', '205+215': 'rb' };
  // G: a graph of VNETZ; ni: the node; S, L: the indices of signs and lines (may be null). → { x, y, app: [{ e, kind, h, role, stopD }] }
  function rule(G, ni, S, L) {
    const N = G.nodes[ni],
      app = [];
    for (const e of N.edges) {
      if (e.a === e.b) continue;
      app.push({
        e: e.i,
        kind: e.kind,
        w: e.w || 4,
        h: inHead(G, e, ni),
        role: null,
        sign: null,
        stopD: null,
        line: null,
      });
    }
    if (app.length < 3) {
      for (const a of app) a.role = 'prio';
      return { x: N.x, y: N.y, app, deg: app.length };
    }
    // 1. the signs of the approaches: within 40 m of the node, beside the approach (≤ 9 m from it), read in its direction of travel
    if (S)
      for (const s of S.near(N.x, N.y, 40)) {
        const role = SIGN[s.code];
        if (!role) continue;
        let best = null,
          bd = 9;
        for (const a of app) {
          const e = G.edges[a.e],
            d = nearEdge(e, ni, s.x, s.y, 45);
          if (d < bd && Math.abs(wrap(s.h - a.h)) < 0.9) {
            bd = d;
            best = a;
          }
        }
        if (best && (!best.sign || role === 'stop')) best.sign = role;
      }
    const signed = app.some(a => a.sign),
      ring = app.some(a => a.sign === 'rb');
    if (signed) for (const a of app) a.role = a.sign || (ring ? 'rbc' : 'prio');
    else {
      // 2. no sign: the bigger road goes first (main and county roads before streets; streets before lanes and drives)
      const top = Math.min(...app.map(a => a.kind));
      if (top <= 2 && app.some(a => a.kind > top)) for (const a of app) a.role = a.kind <= 2 ? 'prio' : 'yield';
      else if (app.some(a => a.kind >= 4) && app.some(a => a.kind <= 3))
        for (const a of app) a.role = a.kind >= 4 ? 'yield' : 'rvl';
      else for (const a of app) a.role = 'rvl';
    }
    // 3. where an approach stops: its painted line (≤ 25 m, beside its way, the same direction), else before the widest other road
    const others = a => Math.max(...app.filter(b => b !== a).map(b => b.w)) / 2;
    for (const a of app) {
      let d = Math.max(3.5, others(a) + 1.5);
      if (L)
        for (const l of L.near(N.x, N.y, 25)) {
          if (Math.abs(wrap(l.h - a.h)) > 0.6) continue;
          const e = G.edges[a.e];
          if (nearEdge(e, ni, l.x, l.y, 30) > 4) continue;
          const dl = hyp(l.x - N.x, l.y - N.y);
          if (dl > 2 && dl < 25) {
            d = dl;
            a.line = l.type;
          }
        }
      a.stopD = d;
    }
    return { x: N.x, y: N.y, app, deg: app.length };
  }
  // ---- must I wait? ----
  // me and each other: { role, h (heading into the junction), turn (rad, + right, − left), eta (s to the junction), inBox, wait (s),
  // id }. T: the window (s). → the other one I wait for, or null
  function waitFor(me, others, T = 4) {
    for (const o of others) {
      if (o === me) continue;
      if (o.inBox) return o;
      if (!(o.eta < T)) continue;
      const rA = RANK[me.role] ?? 1,
        rB = RANK[o.role] ?? 1;
      if (rA > rB) return o;
      if (rA < rB) continue;
      const rel = wrap(o.h - me.h),
        fromRight = rel < -PI / 4 && rel > (-3 * PI) / 4,
        opposite = Math.abs(rel) > (3 * PI) / 4;
      // one of the same rank: from the right (not on the priority road, nor on the ring)
      if (fromRight && me.role !== 'prio' && me.role !== 'rbc') return o;
      // turning left across the oncoming that goes straight or right
      if (opposite && me.turn < -0.45 && !(o.turn < -0.45)) return o;
    }
    return null;
  }
  // all waiting for one another (none moving, none in the junction): the one waiting longest goes, else the lowest id
  function goFirst(me, blockers) {
    if (!blockers.length) return true;
    for (const o of blockers) {
      if (o.inBox || o.v > 0.3) return false;
      if (o.wait > me.wait + 0.5) return false;
      if (Math.abs(o.wait - me.wait) <= 0.5 && o.id < me.id) return false;
    }
    return true;
  }
  // ---- the junctions of a route ----
  // G, path [{ e, fwd }], the line made of it (VNETZ.line), rules: ni → rule (cached by the caller). → events along the line, in order:
  // { ni, x, y, sN (s of the node on the line), sStop (where the front stops), role, h, turn, line }
  function events(G, path, line, ruleOf, project) {
    const out = [];
    let acc = 0;
    for (let k = 0; k + 1 < path.length; k++) {
      const { e, fwd } = path[k];
      acc += e.len;
      const ni = fwd ? e.b : e.a,
        N = G.nodes[ni];
      if (!N || N.edges.length < 3) continue;
      const r = ruleOf(ni);
      if (!r) continue;
      const a = r.app.find(q => q.e === e.i);
      if (!a) continue;
      const nx = path[k + 1].e,
        hOut = outHead(G, nx, ni),
        pr = project(line, N.x, N.y, Math.max(0, acc - 25), acc + 25);
      if (!pr) continue;
      out.push({
        ni,
        x: N.x,
        y: N.y,
        sN: pr.s,
        sStop: pr.s - a.stopD,
        role: a.role,
        h: a.h,
        turn: wrap(hOut - a.h),
        line: a.line,
        rule: r,
        passed: false,
        go: false,
        halted: 0,
        wait: 0,
      });
    }
    return out;
  }
  // ---- speed limits by sign along a line ----
  // S: the sign index; path and line as above; the line's V (m/s per metre) is changed in place. Returns the number of signs used.
  function limits(G, path, line, S, project) {
    if (!S) return 0;
    const marks = [];
    let acc = 0;
    for (let k = 0; k < path.length; k++) {
      const { e } = path[k],
        a0 = acc;
      acc += e.len;
      // a turn at the node before this edge ends a limit (it belongs to the road one came along)
      if (k > 0) {
        const pe = path[k - 1],
          ni = pe.fwd ? pe.e.b : pe.e.a,
          t = wrap(outHead(G, e, ni) - inHead(G, pe.e, ni));
        if (Math.abs(t) > 0.8 || pe.e.kind !== e.kind) marks.push({ s: a0, v: null });
      }
      const m = e.pts[e.pts.length >> 1],
        r = e.len / 2 + 15;
      for (const s of S.near(m[0], m[1], r)) {
        const c = s.code;
        if (!(c.startsWith('274') || c.startsWith('278'))) continue;
        const pr = project(line, s.x, s.y, Math.max(0, a0 - 10), acc + 10);
        if (!pr || pr.d > 9) continue;
        // read in the direction of travel at that spot
        const i = Math.min(line.n - 2, Math.max(0, Math.floor(pr.s / line.step))),
          hl = head(line.X[i], line.Y[i], line.X[i + 1], line.Y[i + 1]);
        if (Math.abs(wrap(s.h - hl)) > 0.9) continue;
        const v = c.startsWith('278') ? null : +c.split('-')[1];
        if (v === null || (v >= 10 && v <= 130)) marks.push({ s: pr.s, v: v === null ? null : v / 3.6 });
      }
    }
    if (!marks.some(m => m.v !== null)) return 0;
    marks.sort((p, q) => p.s - q.s);
    let used = 0,
      cur = null,
      mi = 0;
    for (let i = 0; i < line.n; i++) {
      const s = i * line.step;
      while (mi < marks.length && marks[mi].s <= s) {
        cur = marks[mi].v;
        if (cur !== null) used++;
        mi++;
      }
      if (cur !== null) line.V[i] = Math.min(line.V[i], cur);
    }
    return used;
  }
  // the indicator for a car at s before an event: −1 left, +1 right, 0 none (from 45 m before the node to 6 m after it)
  const blink = (ev, s) =>
    !ev || Math.abs(ev.turn) < 0.45 || s < ev.sN - 45 || s > ev.sN + 6 ? 0 : ev.turn < 0 ? -1 : 1;
  return { index, signs, lines, rule, waitFor, goFirst, events, limits, blink, inHead, outHead, wrap, RANK };
})();
if (typeof window !== 'undefined') window.VKREGELN = VKREGELN; // tests and the console
