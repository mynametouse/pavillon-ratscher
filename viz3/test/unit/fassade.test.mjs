// Unit tests of the facade audit (fassade/fassade_audit.js, FAUDIT) without a browser: windows exactly as the facade shader paints them,
// party walls covered only where a neighbour stands, yards enclosed by houses found (and not where a gap leads in), the gateway through
// the house between yard and street, a mapped passage along its line, a door on the free side of a back house, the audit's counts – on
// small made-up blocks and on the real data of Schleusingen's old town (stadt.json, the castle's two gates from OSM).
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FAUDIT } from '../../src/fassade/fassade_audit.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(
  fs.readFileSync(path.join(HERE, '..', '..', 'extra', 'schleusingen', 'dist', 'schleusingen', 'stadt.json'), 'utf8')
);
const OSM = JSON.parse(
  fs.readFileSync(path.join(HERE, '..', '..', 'extra', 'gebaeude', 'dist', 'gebaeude', 'osm.json'), 'utf8')
);

// a box building in the town data's format (CCW footprint, one facade per side, eave e, flat top line)
function box(i, x0, y0, x1, y1, o = {}) {
  const f = [x0, y0, x1, y0, x1, y1, x0, y1],
    e = o.e || 5.9,
    F = [];
  for (let k = 0; k < 4; k++) {
    const a = k * 2,
      b = ((k + 1) % 4) * 2;
    F.push([
      f[a],
      f[a + 1],
      f[b],
      f[b + 1],
      e,
      0,
      e,
      e,
      (o.blind || []).includes(k) ? 1 : 0,
      (o.street || {})[k] ?? 99,
    ]);
  }
  return { i, k: o.k || 0, f, e, F, st: { style: o.style || 0, sp: 2.8, raised: false } };
}
const facade = (L, o = {}) =>
  Object.assign(
    { ax: 0, ay: 0, bx: L, by: 0, L, nx: 0, ny: -1, LF: L, t0: 5.9, tA: 5.9, uA: L / 2, t1: 5.9, gable: false },
    { du: -1, dw: 0, st: 0, sp: 2.8, raised: false, eave: 5.9, bid: 7 },
    o
  );

test('windows: a house wall of 10 m, two storeys, three bays – six windows, five beside the door', () => {
  assert.equal(FAUDIT.windows(facade(10)).length, 6);
  assert.equal(FAUDIT.windows(facade(10, { du: 5, dw: 1.05 })).length, 5);
  // a party wall as the town draws it (LF 0.5): none
  assert.equal(FAUDIT.windows(facade(10, { LF: 0.5 })).length, 0);
  // a gable: attic windows up to the apex
  const g = FAUDIT.windows(facade(9, { tA: 11, uA: 4.5, gable: true }));
  assert.ok(
    g.some(w => w.fi >= 2),
    JSON.stringify(g)
  );
});

test('windows: a hall of 3.45 m eave gets none from the shader, one of 4.5 m a ribbon', () => {
  const low = facade(70, { st: 10, sp: 4.5, eave: 3.45, t0: 3.45, tA: 3.45, t1: 3.45 }),
    high = facade(70, { st: 10, sp: 4.5, eave: 4.5, t0: 4.5, tA: 4.5, t1: 4.5 });
  assert.equal(FAUDIT.windows(low).length, 0);
  assert.ok(FAUDIT.windows(high).length >= 14);
});

test('cover: a wall covered only along the neighbour, the free run left', () => {
  const A = FAUDIT.fromF(box(0, 0, 0, 12, 10)),
    B = FAUDIT.fromF(box(1, 12, 0, 20, 4)), // against the east wall of A, its first 4 m
    idx = FAUDIT.index([A, B]),
    east = A.fac.find(p => p.nx > 0.9),
    cv = FAUDIT.cover(A, east, idx),
    runs = FAUDIT.openRuns(cv.L, cv.spans);
  assert.ok(Math.abs(cv.covered - 4) < 0.6, JSON.stringify(cv));
  assert.equal(runs.length, 1);
  assert.ok(Math.abs(runs[0][1] - runs[0][0] - 6) < 0.6, JSON.stringify(runs));
});

// a block: four houses round a yard of 10 × 10 m; the north house on the street (y = 26)
function block(gap) {
  return [
    box(0, 0, 0, 24, 6, { street: { 0: 3 } }), // south
    box(1, 0, 16, 24, 22, { street: { 2: 3 } }), // north, its north wall on the street
    box(2, 0, 6, 7, 16),
    box(3, 17, 6, 24, 16 - gap), // a gap between it and the north house leads into the yard
  ];
}

test('hoefe: an enclosed yard is found, a gap of 2 m leads in, a slit of 0.4 m does not', () => {
  const Y0 = FAUDIT.hoefe(block(0).map(b => FAUDIT.fromF(b)));
  assert.equal(Y0.length, 1);
  assert.ok(Math.abs(Y0[0].area - 100) < 12, String(Y0[0].area));
  assert.equal(Y0[0].around.length, 4);
  assert.ok(Y0[0].at(12, 11) && !Y0[0].at(12, 3));
  assert.equal(FAUDIT.hoefe(block(2).map(b => FAUDIT.fromF(b))).length, 0);
  assert.equal(FAUDIT.hoefe(block(0.4).map(b => FAUDIT.fromF(b))).length, 1);
});

test('tor: the gateway goes through a house from the street to the yard, straight and short', () => {
  const recs = block(0).map(b => FAUDIT.fromF(b)),
    idx = FAUDIT.index(recs),
    Y = FAUDIT.hoefe(recs),
    outside = (x, y) => !idx.at(x, y) && !Y[0].at(x, y),
    street = (x, y) => Math.abs(y - 25) + (x < 0 || x > 24 ? 9 : 0),
    g = FAUDIT.tor(Y[0], { outside, street });
  assert.ok(g, 'a gateway');
  assert.equal(g.r.id, 1); // the north house, on the street
  assert.ok(Math.abs(g.depth - 6) < 0.05, String(g.depth));
  assert.ok(g.A[1] > 21.9 && g.B[1] < 16.1, JSON.stringify(g));
  assert.ok(g.h > 2.6 && g.h <= 3.4);
});

test('passLine: a mapped passage through a building meets its two walls', () => {
  const r = FAUDIT.fromF(box(0, 0, 0, 10, 8)),
    p = FAUDIT.passLine(r, [5, -3, 5, 11], 3);
  assert.ok(p);
  assert.ok(Math.abs(p.A[1]) < 0.01 && Math.abs(p.B[1] - 8) < 0.01 && Math.abs(p.depth - 8) < 0.01);
});

test('hofTuer: a back house gets its door on the side with room in front, not on the party wall', () => {
  const A = FAUDIT.fromF(box(0, 0, 0, 10, 8, { blind: [1] })),
    B = FAUDIT.fromF(box(1, 10, 0, 18, 8)),
    C = FAUDIT.fromF(box(2, 0, 8.4, 10, 14)), // 0.4 m north: no room for a door there
    idx = FAUDIT.index([A, B, C]),
    d = FAUDIT.hofTuer(A, A.fac, (x, y) => !idx.at(x, y));
  assert.ok(d);
  const p = A.fac.find(q => q.k === d.k);
  assert.ok(p.ny < -0.9 || p.nx < -0.9, 'south or west: ' + JSON.stringify(p));
  assert.ok(d.w > 0.9 && d.w < 1.2 && d.u > 0 && d.u < p.L);
});

test('hofTuer: a shed built in all round but for a short free stretch (1.5 m) gets a narrow door there', () => {
  // 5 × 5 m, the east side split: 1.5 m free, the rest and the other sides party walls
  const f = [0, 0, 5, 0, 5, 1.5, 5, 5, 0, 5],
    e = 4,
    F = [];
  for (let k = 0; k < 5; k++) {
    const a = k * 2,
      b = ((k + 1) % 5) * 2;
    F.push([f[a], f[a + 1], f[b], f[b + 1], e, 0, e, e, k === 1 ? 0 : 1, 99]);
  }
  const A = FAUDIT.fromF({ i: 0, k: 2, f, e, F, st: { style: 0, sp: 2.8 } }),
    idx = FAUDIT.index([A]),
    d = FAUDIT.hofTuer(A, A.fac, (x, y) => !idx.at(x, y));
  assert.ok(d, 'a door');
  const p = A.fac.find(q => q.k === d.k);
  assert.ok(Math.abs(p.L - 1.5) < 0.01 && p.nx > 0.9, JSON.stringify(p));
  assert.ok(d.w >= 0.9 && d.w <= 1.0 && Math.abs(d.u - 0.75) < 0.01, JSON.stringify(d));
});

test('audit: a house without a door and a blank free wall are reported, the yard too; with a gateway it is reached', () => {
  const recs = block(0).map(b => FAUDIT.fromF(b));
  // the west house: no door, its east wall (to the yard) a party wall in the data – but free
  recs[2].fac.forEach(p => {
    if (p.nx > 0.9) {
      p.blind = true;
      p.LF = 0.5;
    }
  });
  const idx = FAUDIT.index(recs),
    Y = FAUDIT.hoefe(recs),
    c0 = FAUDIT.count(FAUDIT.audit(recs, { idx, yards: Y }));
  assert.equal(c0.hof, 1);
  assert.ok(c0.tuer >= 4, JSON.stringify(c0)); // nobody has a door yet
  assert.ok(c0.fenster >= 1, JSON.stringify(c0));
  Y[0].reach = true;
  for (const r of recs) {
    const d = FAUDIT.hofTuer(r, r.fac, (x, y) => !idx.at(x, y)),
      p = r.fac.find(q => q.k === d.k);
    p.du = d.u;
    p.dw = d.w;
  }
  recs[2].fac.forEach(p => {
    if (p.nx > 0.9) p.LF = p.L;
  });
  const c1 = FAUDIT.count(FAUDIT.audit(recs, { idx, yards: Y }));
  assert.equal(c1.hof + c1.tuer + c1.fenster, 0, JSON.stringify(c1));
});

test('Schleusingen: the yards of the old town, a gateway into the big one, the castle courtyard through its two mapped gates', () => {
  const recs = DATA.b.map((b, i) => FAUDIT.fromF(Object.assign(b, { i }))),
    idx = FAUDIT.index(recs),
    Y = FAUDIT.hoefe(recs),
    big = Y.filter(y => y.area > 700),
    castle = Y.find(y => y.around.length === 1 && y.around[0].kind === 'wahrzeichen');
  assert.equal(big.length, 1, Y.map(y => Math.round(y.area)).join(' '));
  assert.ok(castle && castle.area > 300, 'the courtyard of the Bertholdsburg');
  const outside = (x, y) => !idx.at(x, y) && !Y.some(q => q.at(x, y)),
    g = FAUDIT.tor(big[0], { outside, street: () => 5 });
  assert.ok(g && g.depth < 14 && g.r.kind === 'haus', JSON.stringify(g && { d: g.depth, k: g.r.kind }));
  const burg = recs.find(r => r.kind === 'wahrzeichen' && r.h && r.h.length),
    pass = OSM.schleusingen.pass;
  assert.equal(pass.length, 2);
  for (const m of pass) {
    const p = m.p,
      n = p.length,
      L = Math.hypot(p[n - 2] - p[0], p[n - 1] - p[1]),
      dx = (p[n - 2] - p[0]) / L,
      dy = (p[n - 1] - p[1]) / L,
      P = FAUDIT.passLine(burg, [p[0] - dx * 3, p[1] - dy * 3, p[n - 2] + dx * 3, p[n - 1] + dy * 3], 3);
    assert.ok(P && P.depth > 6 && P.depth < 14, m.osm + ' ' + JSON.stringify(P && P.depth));
    assert.ok(
      castle.at(P.B[0] + P.d[0] * 1.2, P.B[1] + P.d[1] * 1.2) || castle.at(P.A[0] - P.d[0] * 1.2, P.A[1] - P.d[1] * 1.2)
    );
  }
});

test('stufen: steps from a door on its plinth down to the ground, none where the door is at the ground', () => {
  const s = FAUDIT.stufen(10.6, 10.0);
  assert.ok(s.length >= 3 && s.length <= 4, String(s.length));
  assert.ok(Math.abs(s[0].top - 10.6) < 1e-9 && s[0].d === 0.5);
  for (let i = 1; i < s.length; i++) assert.ok(s[i].top < s[i - 1].top && s[i].d > s[i - 1].d);
  assert.ok(s[s.length - 1].top - 10.0 < 0.2);
  assert.equal(FAUDIT.stufen(10.05, 10.0).length, 0);
  assert.equal(FAUDIT.stufen(13, 10.0).length, 0); // a wall over a slope, not a door to climb to
});
