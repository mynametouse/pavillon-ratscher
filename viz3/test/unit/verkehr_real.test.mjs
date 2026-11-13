// Unit tests of feat/verkehr-real's pure parts without a browser: the vehicle types in their real measures (verkehr/vk_typen.js), the
// merged meshes and their levels (verkehr/vk_bau.js), the density by road, weekday, holiday and hour (verkehr/vk_dichte.js).
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VKTYPEN } from '../../src/verkehr/vk_typen.js';
import { VKBAU } from '../../src/verkehr/vk_bau.js';
import { VKDICHTE } from '../../src/verkehr/vk_dichte.js';

// the extent of a merged mesh in the vehicle's frame (x right, y forward, z up; three's frame is x, z, −y)
function extent(op, axle = null) {
  const b = { x0: 1e9, x1: -1e9, y0: 1e9, y1: -1e9, z0: 1e9, z1: -1e9 };
  for (let v = 0; v < op.n; v++) {
    if (axle !== null && op.vk[v * 4 + 2] !== axle) continue;
    const x = op.pos[v * 3],
      y = -op.pos[v * 3 + 2],
      z = op.pos[v * 3 + 1];
    b.x0 = Math.min(b.x0, x);
    b.x1 = Math.max(b.x1, x);
    b.y0 = Math.min(b.y0, y);
    b.y1 = Math.max(b.y1, y);
    b.z0 = Math.min(b.z0, z);
    b.z1 = Math.max(b.z1, z);
  }
  return b;
}

test('every type has its real measures: length, width, height, wheels on the ground', () => {
  for (const [typ, T] of Object.entries(VKTYPEN.TYP)) {
    const g = VKBAU.geo(typ, 1),
      b = extent(g.op);
    const L = T.yf - T.yr;
    // the length within 6 cm of the model's (hitches, drawbars and weights may stick out at the ends)
    assert.ok(Math.abs(b.y1 - b.y0 - L) < 0.06 + (T.cls === 'zug' || T.cls === 'trak' ? 1.9 : 0), `${typ}: length ${(b.y1 - b.y0).toFixed(2)} vs ${L}`);
    // the width: the body within its half width, the mirrors at most 0.4 m beyond (lorries' mirrors on their arms)
    assert.ok(b.x1 - b.x0 <= 2 * T.hw + 0.8, `${typ}: width ${(b.x1 - b.x0).toFixed(2)} vs ${2 * T.hw}`);
    assert.ok(b.x1 - b.x0 >= 2 * T.hw - 0.12, `${typ}: too narrow ${(b.x1 - b.x0).toFixed(2)}`);
    // the height within 12 cm (aerials, beacons, the exhaust stick out a little)
    assert.ok(b.z1 <= T.h + 0.2 && b.z1 >= T.h - 0.15, `${typ}: height ${b.z1.toFixed(2)} vs ${T.h}`);
    // the wheels stand on the ground: their lowest point at 0 (± 1 cm)
    assert.ok(Math.abs(b.z0) < 0.012, `${typ}: lowest point ${b.z0.toFixed(3)}`);
  }
});

test('the axles sit where the type says, the steering one in front', () => {
  for (const [typ, T] of Object.entries(VKTYPEN.TYP)) {
    const L = VKTYPEN.lage(T);
    assert.ok(L.length >= 2 && L.length <= 4, typ);
    const st = L.filter(a => a.steer);
    if (T.cls === 'zug') assert.equal(st.length, 0, typ);
    else {
      assert.equal(st.length, 1, typ);
      assert.ok(Math.abs(st[0].y - T.a) < 1e-9, typ);
    }
    const g = VKBAU.geo(typ, 1);
    L.forEach((a, i) => {
      const b = extent(g.op, i + 1);
      assert.ok(b.z0 < 0.05 && Math.abs((b.y0 + b.y1) / 2 - a.y) < 0.12, `${typ} axle ${i + 1}: middle ${((b.y0 + b.y1) / 2).toFixed(2)} vs ${a.y.toFixed(2)}`);
    });
  }
});

test('the merged mesh: indices in range, the lamps and their kinds, the glass apart near by', () => {
  const g0 = VKBAU.geo('kompakt', 0),
    g1 = VKBAU.geo('kompakt', 1),
    g2 = VKBAU.geo('kompakt', 2);
  for (const g of [g0, g1, g2]) {
    let max = 0;
    for (const i of g.op.idx) max = Math.max(max, i);
    assert.ok(max < g.op.n, 'index in range');
    assert.equal(g.op.idx.length % 3, 0);
  }
  assert.ok(g0.gl && g0.gl.tris > 50, 'the glass apart on the near level');
  assert.equal(g1.gl, null);
  const lamps = new Set(),
    kinds = new Set();
  for (let v = 0; v < g1.op.n; v++) {
    kinds.add(g1.op.vk[v * 4]);
    lamps.add(g1.op.vk[v * 4 + 1]);
  }
  for (const l of [1, 2, 3, 4, 5, 6]) assert.ok(lamps.has(l), 'lamp kind ' + l);
  for (const k of [0, 1, 3, 4, 6, 7, 8, 9, 10]) assert.ok(kinds.has(k), 'corner kind ' + k);
  // the head lamps at the front, the tail lamps at the back
  for (let v = 0; v < g1.op.n; v++) {
    const l = g1.op.vk[v * 4 + 1],
      y = -g1.op.pos[v * 3 + 2];
    if (l === 1 || l === 6) assert.ok(y > 1, 'head lamp in front');
    if (l === 2) assert.ok(y < -1.2, 'tail lamp at the back');
  }
  // the levels thin out
  assert.ok(g2.op.tris < g1.op.tris / 3 && g1.op.tris < g0.op.tris, `${g0.op.tris} > ${g1.op.tris} > ${g2.op.tris}`);
});

test('every type far away within 3000 triangles', () => {
  for (const typ of Object.keys(VKTYPEN.TYP)) {
    const g = VKBAU.geo(typ, 2);
    assert.ok(g.op.tris <= 3000 && g.op.tris > 300, `${typ}: ${g.op.tris}`);
  }
});

test('the fleet: shares and paints add up', () => {
  const s = VKTYPEN.PKW.reduce((a, e) => a + e[1], 0);
  assert.ok(s > 90 && s < 110);
  for (const [t] of VKTYPEN.PKW) assert.ok(VKTYPEN.TYP[t] && (VKTYPEN.TYP[t].cls === 'pkw' || t === 'hochdach'), t);
});

const ed = (y, m, d) => Date.UTC(y, m - 1, d) / 864e5;
test('the day lines: each sums to the day, quiet at night, peaks where counted', () => {
  for (const [k, L] of Object.entries(VKDICHTE.LINE)) {
    const s = L.reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(s - 1) < 1e-9, k);
    assert.ok(L[3] < 0.006, k + ' quiet at 3 o’clock');
  }
  const mo = VKDICHTE.LINE.mo;
  assert.ok(mo[7] > mo[10] && mo[16] > mo[13], 'weekday peaks 7–8 and 16–17');
  const so = VKDICHTE.LINE.so;
  assert.ok(so[7] < 0.02 && so[15] > so[9], 'Sunday: a quiet morning, the afternoon busier');
  // the smooth share integrates to the day as well
  let sum = 0;
  for (let m = 0; m < 1440; m += 5) sum += VKDICHTE.when(ed(2026, 11, 13), m).hs * (5 / 60);
  assert.ok(Math.abs(sum - 1) < 0.01, sum.toFixed(3));
});

test('the calendar of Thüringen: Easter and the holidays run as Sundays', () => {
  const iso = e => new Date(e * 864e5).toISOString().slice(0, 10);
  assert.equal(iso(VKDICHTE.easter(2025)), '2025-04-20');
  assert.equal(iso(VKDICHTE.easter(2026)), '2026-04-05');
  assert.equal(iso(VKDICHTE.easter(2027)), '2027-03-28');
  assert.equal(iso(VKDICHTE.easter(2028)), '2028-04-16');
  for (const [d, name] of [
    [ed(2026, 4, 3), 'Karfreitag'],
    [ed(2026, 5, 14), 'Christi Himmelfahrt'],
    [ed(2026, 5, 25), 'Pfingstmontag'],
    [ed(2026, 9, 20), 'Weltkindertag'],
    [ed(2026, 10, 31), 'Reformationstag'],
    [ed(2026, 12, 26), '2. Weihnachtstag'],
  ]) {
    const W = VKDICHTE.when(d, 600);
    assert.equal(W.fei, name);
    assert.equal(W.day, 'so');
  }
  assert.equal(VKDICHTE.when(ed(2026, 11, 13), 600).day, 'fr');
  assert.equal(VKDICHTE.when(ed(2026, 11, 14), 600).day, 'sa');
  assert.equal(VKDICHTE.when(ed(2026, 11, 11), 600).day, 'mo');
});

test('the rates: the motorway busiest, a village street at night nearly empty, Sunday quieter, no lorries on Sundays', () => {
  const fr8 = VKDICHTE.when(ed(2026, 11, 13), 8 * 60),
    fr3 = VKDICHTE.when(ed(2026, 11, 13), 3 * 60),
    so8 = VKDICHTE.when(ed(2026, 11, 15), 8 * 60);
  const r = (k, st, W) => VKDICHTE.rate(k, st, W);
  assert.ok(r(0, 0, fr8) > r(1, 0, fr8) && r(1, 0, fr8) > r(2, 0, fr8) && r(2, 0, fr8) > r(3, 3, fr8));
  assert.ok(r(3, 3, fr3) < 2, 'a village street at 3 o’clock: ' + r(3, 3, fr3).toFixed(2) + ' an hour');
  assert.ok(r(1, 0, so8) < r(1, 0, fr8) / 2, 'Sunday morning');
  let heavy = 0;
  for (let i = 0; i < 4000; i++) {
    const t = VKDICHTE.typ(0, 0, so8, Math.random(), Math.random());
    if (t === 'lkw' || t === 'sattel' || t === 'traktor' || t === 'muell') heavy++;
  }
  assert.equal(heavy, 0, 'the ban on lorries on Sundays');
  let lkw = 0;
  for (let i = 0; i < 4000; i++) {
    const t = VKDICHTE.typ(0, 0, VKDICHTE.when(ed(2026, 11, 11), 10 * 60), Math.random(), Math.random());
    if (t === 'lkw' || t === 'sattel') lkw++;
  }
  assert.ok(lkw > 4000 * 0.12 && lkw < 4000 * 0.3, 'the motorway on a weekday morning: ' + lkw / 40 + ' % heavy');
});

// ---- stage 2: the rules of the road (verkehr/vk_regeln.js) ----
import { VKREGELN } from '../../src/verkehr/vk_regeln.js';
import { VNETZ } from '../../src/verkehr/verkehr_netz.js';
const R2 = VKREGELN;
// a junction at (0, 0): ways given as [kind, [x0, y0, x1, y1, …]]
const junction = ways => VNETZ.graph(ways.map(([kind, p, w]) => ({ kind, w: w || 6, p })), { kinds: new Set([0, 1, 2, 3, 4, 5]) });
const nodeAt = (G, x, y) => G.nodes.findIndex(n => Math.hypot(n.x - x, n.y - y) < 0.5);
const appFrom = (G, r, x, y) => r.app.find(a => { const e = G.edges[a.e], p = e.pts, far = e.a === nodeAt(G, 0, 0) ? p[p.length - 1] : p[0]; return Math.hypot(far[0] - x, far[1] - y) < 1; });

test('stage 2: who has the way at a junction – the bigger road, signs, right before left, roundabouts', () => {
  // a main road west–east, a street joining from the south (T)
  let G = junction([[1, [-100, 0, 0, 0, 100, 0]], [3, [0, -100, 0, 0]]]),
    ni = nodeAt(G, 0, 0),
    r = R2.rule(G, ni, null, null);
  assert.equal(r.app.length, 3);
  assert.equal(appFrom(G, r, -100, 0).role, 'prio');
  assert.equal(appFrom(G, r, 100, 0).role, 'prio');
  assert.equal(appFrom(G, r, 0, -100).role, 'yield');
  // four streets of one rank: right before left
  G = junction([[3, [-100, 0, 0, 0, 100, 0]], [3, [0, -100, 0, 0, 0, 100]]]);
  r = R2.rule(G, nodeAt(G, 0, 0), null, null);
  assert.ok(r.app.every(a => a.role === 'rvl'), r.app.map(a => a.role).join());
  // a drive (service) joining a street: it gives way, the street keeps right before left among its own
  G = junction([[3, [-100, 0, 0, 0, 100, 0]], [5, [0, -60, 0, 0]]]);
  r = R2.rule(G, nodeAt(G, 0, 0), null, null);
  assert.equal(appFrom(G, r, 0, -60).role, 'yield');
  // a stop sign on the street from the south (read northwards, 10 m before the node, beside the lane), a stop line 6 m before
  G = junction([[3, [-100, 0, 0, 0, 100, 0]], [3, [0, -100, 0, 0]]]);
  const S = R2.index(R2.signs([['206', 25, -100, 0]])),
    L = R2.index(R2.lines([['halt', 15, -60, 0, 15]]));
  r = R2.rule(G, nodeAt(G, 0, 0), S, L);
  const south = appFrom(G, r, 0, -100);
  assert.equal(south.role, 'stop');
  assert.equal(appFrom(G, r, -100, 0).role, 'prio');
  assert.ok(Math.abs(south.stopD - 6.2) < 0.3, 'stops at its line: ' + south.stopD);
  assert.ok(appFrom(G, r, -100, 0).stopD >= 3.5);
  // a roundabout entry: 205 + 215 on the approach from the south, the ring has the way
  const S2 = R2.index(R2.signs([['205+215', 25, -80, 0]]));
  r = R2.rule(G, nodeAt(G, 0, 0), S2, null);
  assert.equal(appFrom(G, r, 0, -100).role, 'rb');
  assert.equal(appFrom(G, r, 100, 0).role, 'rbc');
});

test('stage 2: whom one waits for – the window, the right, the left turn, the junction occupied, four waiting', () => {
  const N = 0, E = Math.PI / 2, S_ = Math.PI, W = -Math.PI / 2;
  // heading north on a street that gives way; one on the main road eastwards (coming from the west) in 3 s: wait; in 8 s: go
  const me = { role: 'yield', h: N, turn: 0, wait: 0, id: 1, v: 0 };
  assert.ok(R2.waitFor(me, [{ role: 'prio', h: E, turn: 0, eta: 3, inBox: false, wait: 0, v: 10, id: 2 }], 4.5));
  assert.equal(R2.waitFor(me, [{ role: 'prio', h: E, turn: 0, eta: 8, inBox: false, wait: 0, v: 10, id: 2 }], 4.5), null);
  // right before left: heading north, one heading west comes from my right (from the east) – wait; one heading east comes from my left – go
  const rv = { role: 'rvl', h: N, turn: 0, wait: 0, id: 1, v: 3 };
  assert.ok(R2.waitFor(rv, [{ role: 'rvl', h: W, turn: 0, eta: 2, inBox: false, wait: 0, v: 5, id: 2 }], 3.5));
  assert.equal(R2.waitFor(rv, [{ role: 'rvl', h: E, turn: 0, eta: 2, inBox: false, wait: 0, v: 5, id: 2 }], 3.5), null);
  // the one from the left must wait for me
  assert.ok(R2.waitFor({ role: 'rvl', h: E, turn: 0, wait: 0, id: 2, v: 5 }, [{ role: 'rvl', h: N, turn: 0, eta: 2, inBox: false, wait: 0, v: 3, id: 1 }], 3.5));
  // turning left on the priority road: wait for the oncoming that goes straight, not for one that turns left too
  const lt = { role: 'prio', h: N, turn: -1.5, wait: 0, id: 1, v: 5 };
  assert.ok(R2.waitFor(lt, [{ role: 'prio', h: S_, turn: 0, eta: 3, inBox: false, wait: 0, v: 10, id: 2 }], 4));
  assert.equal(R2.waitFor(lt, [{ role: 'prio', h: S_, turn: -1.5, eta: 3, inBox: false, wait: 0, v: 10, id: 2 }], 4), null);
  // on the priority road going straight: nobody, unless one is in the junction
  const st = { role: 'prio', h: N, turn: 0, wait: 0, id: 1, v: 10 };
  assert.equal(R2.waitFor(st, [{ role: 'yield', h: E, turn: 0, eta: 1, inBox: false, wait: 0, v: 3, id: 2 }], 4), null);
  assert.ok(R2.waitFor(st, [{ role: 'yield', h: E, turn: 0, eta: 0, inBox: true, wait: 0, v: 3, id: 2 }], 4));
  // four at a crossing of equals, all standing: the one waiting longest goes; equal waits – the lowest id
  const a = { wait: 3, id: 5, v: 0 },
    others = [{ wait: 1, id: 2, v: 0, inBox: false }, { wait: 2, id: 3, v: 0, inBox: false }];
  assert.ok(R2.goFirst(a, others));
  assert.ok(!R2.goFirst({ wait: 1, id: 2, v: 0 }, [{ wait: 3, id: 5, v: 0, inBox: false }]));
  assert.ok(R2.goFirst({ wait: 2, id: 1, v: 0 }, [{ wait: 2.2, id: 4, v: 0, inBox: false }]));
  assert.ok(!R2.goFirst({ wait: 2, id: 1, v: 0 }, [{ wait: 2, id: 4, v: 2, inBox: false }]), 'not while the other moves');
});

test('stage 2: the junctions of a route, the indicator, limits by sign', () => {
  // west → east along the main road, at (0, 0) left into the street northwards
  // (points every 50 m: a segment of the line takes the lower limit of its two ends)
  const G = junction([[1, [-200, 0, -150, 0, -100, 0, -50, 0, 0, 0, 50, 0, 100, 0, 150, 0, 200, 0]], [3, [0, 0, 0, 50, 0, 100, 0, 150]]]),
    ni = nodeAt(G, 0, 0),
    ew = G.edges.find(e => e.kind === 1 && Math.min(e.pts[0][0], e.pts[e.pts.length - 1][0]) < -100),
    north = G.edges.find(e => e.kind === 3),
    path = [{ e: ew, fwd: ew.b === ni }, { e: north, fwd: north.a === ni }],
    line = VNETZ.line(path, { off: () => 1.5, vmax: e => (e.kind === 1 ? 27 : 13.9), cut: 6, aLat: 2, aBrk: 2, vMin: 2.6 }),
    rules = new Map(),
    ruleOf = n => rules.get(n) || (rules.set(n, R2.rule(G, n, null, null)), rules.get(n));
  const ev = R2.events(G, path, line, ruleOf, VNETZ.project);
  assert.equal(ev.length, 1);
  assert.equal(ev[0].role, 'prio');
  assert.ok(ev[0].turn < -1.2 && ev[0].turn > -1.9, 'a left turn: ' + ev[0].turn.toFixed(2));
  assert.ok(Math.abs(ev[0].sN - 200) < 8, 'the node about 200 m along: ' + ev[0].sN.toFixed(1));
  assert.ok(ev[0].sStop < ev[0].sN);
  assert.equal(R2.blink(ev[0], ev[0].sN - 30), -1);
  assert.equal(R2.blink(ev[0], ev[0].sN - 80), 0);
  // the other way round: from the street southwards, right turn onto the main road westwards? (south, then west: a right turn)
  const p2 = [{ e: north, fwd: north.b === ni }, { e: ew, fwd: ew.a === ni }],
    l2 = VNETZ.line(p2, { off: () => 1.5, vmax: () => 13.9, cut: 6, aLat: 2, aBrk: 2, vMin: 2.6 }),
    e2 = R2.events(G, p2, l2, ruleOf, VNETZ.project);
  assert.equal(e2[0].role, 'yield');
  assert.ok(e2[0].turn > 1.2, 'a right turn: ' + e2[0].turn.toFixed(2));
  // a 30 limit 100 m along the main road (read eastwards, beside the right lane) – the speeds after it at most 30 km/h, before it more
  const SI = R2.index(R2.signs([['274-30', -1000, -40, 90]])),
    used = R2.limits(G, path, line, SI, VNETZ.project);
  assert.equal(used, 1);
  assert.ok(line.V[50] > 20 && line.V[130] <= 30 / 3.6 + 1e-6, `${line.V[50]} ${line.V[130]}`);
  // read the other way (westwards) it is not ours
  const line3 = VNETZ.line(path, { off: () => 1.5, vmax: e => (e.kind === 1 ? 27 : 13.9), cut: 6, aLat: 2, aBrk: 2, vMin: 2.6 });
  assert.equal(R2.limits(G, path, line3, R2.index(R2.signs([['274-30', -1000, -40, 270]])), VNETZ.project), 0);
  // the limit ends with the turn into the street
  const after = Math.round(ev[0].sN + 30);
  assert.ok(line.V[after] > 30 / 3.6 + 0.5 || line.V[after] === 13.9, 'after the turn the street’s own limit: ' + line.V[after]);
});

test('stage 2b: the lights – a junction cycle of two groups, a crossing on request, who stops at yellow', () => {
  // the junction: group A green 1–25 s, B green 30–44 s; never both green, red-yellow before green, all red between
  const seen = new Set();
  for (let t = 0; t < 50; t += 0.25) {
    const p = R2.phaseK(t);
    assert.ok(!(p.A === 'gruen' && p.B !== 'rot') && !(p.B === 'gruen' && p.A !== 'rot'), `t ${t}: ${p.A} ${p.B}`);
    seen.add(p.A + '/' + p.B);
  }
  assert.equal(R2.phaseK(10).A, 'gruen');
  assert.equal(R2.phaseK(10).B, 'rot');
  assert.equal(R2.phaseK(35).B, 'gruen');
  assert.equal(R2.phaseK(26).A, 'gelb');
  assert.equal(R2.phaseK(0.5).A, 'rotgelb');
  assert.equal(R2.phaseK(29.5).B, 'rotgelb');
  assert.ok(seen.has('rot/rot'), 'all red between the groups');
  assert.equal(R2.phaseK(60).A, R2.phaseK(10).A, 'the cycle repeats');
  // the crossing: green until pressed (and at least 20 s), then yellow 3, red 12 (walkers green inside), red-yellow 1, green
  const st = { ph: 'gruen', t: 0, req: false },
    log = [];
  for (let t = 0; t < 60; t += 0.5) {
    R2.crossStep(st, 0.5, t === 5);
    log.push([t, st.ph, R2.walkGreen(st)]);
  }
  const at = ph => log.find(q => q[1] === ph);
  assert.ok(at('gelb')[0] >= 19 && at('gelb')[0] <= 21, 'yellow after 20 s of green: ' + at('gelb')[0]);
  assert.ok(at('rot')[0] - at('gelb')[0] >= 2.9 && at('rot')[0] - at('gelb')[0] <= 3.6);
  assert.ok(log.some(q => q[2]) && log.filter(q => q[2]).every(q => q[1] === 'rot'), 'walkers green only while the cars have red');
  assert.equal(log[log.length - 1][1], 'gruen', 'back to green');
  // at the line: red stops, yellow stops whoever can (36 km/h: 10 m/s needs ~17 m), too close goes on
  assert.ok(R2.atLight('rot', 20, 10));
  assert.ok(R2.atLight('rotgelb', 5, 0));
  assert.ok(R2.atLight('gelb', 40, 10));
  assert.ok(!R2.atLight('gelb', 8, 10));
  assert.ok(!R2.atLight('gruen', 5, 10));
});
