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
