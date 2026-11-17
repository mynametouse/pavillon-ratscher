// Unit tests of feat/stadtgruen's pure part without a browser (stadtgruen/sg_regeln.js): the species' year, the autumn tint, the
// records of baeume.json, where a tree must not stand, the levels within their budget, the trunks as colliders.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SGREGELN as G } from '../../src/stadtgruen/sg_regeln.js';

const LINDE = G.BY_ID.linde,
  EICHE = G.BY_ID.eiche,
  NADEL = G.BY_ID.nadel,
  HECKE = G.BY_ID.hecke;

test('the year of a lime: bare in winter, fresh in May, green in July, golden in October, bare again in late November', () => {
  assert.equal(G.season(LINDE, 15).leaf, 0, 'January: bare');
  assert.equal(G.season(LINDE, 15).st, 'kahl');
  const may = G.season(LINDE, 125);
  assert.ok(may.leaf > 0.3 && may.leaf < 1, 'budburst: the leaves coming ' + may.leaf);
  assert.equal(may.st, 'Austrieb');
  const july = G.season(LINDE, 195);
  assert.equal(july.leaf, 1);
  assert.equal(july.k, 0, 'July: its own green');
  const oct = G.season(LINDE, 292);
  assert.equal(oct.st, 'Herbstfarben');
  assert.ok(oct.k > 0.5 && oct.leaf === 1, 'mid October: coloured, still full ' + JSON.stringify(oct));
  const nov = G.season(LINDE, 308);
  assert.equal(nov.st, 'Laubfall');
  assert.ok(nov.leaf > 0 && nov.leaf < 1);
  assert.equal(G.season(LINDE, 330).leaf, 0, 'late November: bare');
});

test('oak and hornbeam hedges keep dry leaves over the winter, conifers stay green, the year wraps', () => {
  const jan = G.season(EICHE, 10);
  assert.ok(jan.leaf > 0 && jan.leaf < 0.3 && jan.col, 'an oak keeps some brown leaves ' + JSON.stringify(jan));
  assert.ok(G.season(HECKE, 10).leaf >= 0.5, 'a hornbeam hedge stays dense');
  for (const d of [0, 100, 200, 300, 364])
    assert.deepEqual(G.season(NADEL, d), { leaf: 1, col: null, k: 0, st: 'immergrün' });
  assert.deepEqual(G.season(LINDE, 365 + 195), G.season(LINDE, 195));
  assert.deepEqual(G.season('linde', 195), G.season(LINDE, 195), 'by id or index');
});

test('the autumn tint turns a green leaf picture yellow, not just brighter (the hue is kept, the strength bounded)', () => {
  const green = [0.05, 0.12, 0.02],
    m = G.tint([0.86, 0.66, 0.16], 1, green, 1),
    out = m.map((v, i) => v * green[i]);
  assert.ok(out[0] > out[1] * 0.9 && out[1] > out[2] * 3, 'red ≈ green ≫ blue: yellow ' + out.map(v => v.toFixed(3)));
  assert.ok(Math.max(...m) <= 8 + 1e-9, 'no channel over 8× ' + m);
  assert.deepEqual(G.tint(null, 1, green, 0.9), [0.9, 0.9, 0.9], 'no colour: only the brightness');
  const half = G.tint([0.86, 0.66, 0.16], 0.5, green, 1);
  assert.ok(half[0] > 1 && half[0] < m[0], 'half way');
});

test('the records of baeume.json: 6 integers per tree, the trunk from the height, unknown species left out', () => {
  const T = G.decode({ b: [100, -200, LINDE, 140, 42, 3, 5, 5, 99, 10, 10, 0, -11, 22, HECKE, 18, 9, 64] });
  assert.equal(T.length, 2);
  assert.deepEqual([T[0].x, T[0].y, T[0].h, T[0].r, T[0].f], [10, -20, 14, 4.2, 3]);
  assert.ok(T[0].tr > 0.15 && T[0].tr <= 0.42, 'a lime of 14 m: trunk ' + T[0].tr);
  assert.equal(T[1].tr, 0, 'a hedge has no trunk');
  assert.ok(T[0].hs >= 0 && T[0].hs < 1);
  assert.deepEqual(G.decode(null), []);
});

test('where a tree must not stand: building, door, shop pad, lamp, bus stop, bay, the Markt and its trees', () => {
  const house = [0, 0, 10, 0, 10, 8, 0, 8];
  const C = {
    blds: [{ f: house, cx: 5, cy: 4, R: 7, door: [5, 0] }],
    pads: [[30, 0, 40, 0, 40, 10, 30, 10]],
    lamps: [[20, 20]],
    stops: [[50, 50]],
    bays: [[60, 0, 0]],
    keep: [[80, 80]],
    markt: [100, 100, 120, 100, 120, 120, 100, 120],
  };
  const tree = (x, y, f = 3) => ({ x, y, f, tr: 0.25 });
  assert.equal(G.blocked(tree(5, 4), C), 'Gebäude');
  assert.equal(G.blocked(tree(5, 8.4), C), 'Gebäude', 'trunk at a wall');
  assert.equal(G.blocked(tree(5, -2), C), 'Tür');
  assert.equal(G.blocked(tree(35, 5), C), 'Ladenfläche');
  assert.equal(G.blocked(tree(21, 20.5), C), 'Laterne');
  assert.equal(G.blocked(tree(52, 52), C), 'Haltestelle');
  assert.equal(G.blocked(tree(60, 2), C), 'Parkplatz', 'in the bay (along its heading)');
  assert.equal(G.blocked(tree(62, 0), C), '', 'beside the bay');
  assert.equal(G.blocked(tree(81, 81), C), 'Marktbaum');
  assert.equal(G.blocked(tree(110, 110), C), 'Markt');
  assert.equal(G.blocked(tree(5, -7), C), '', 'in front of the house beyond the door');
  assert.equal(G.blocked(tree(81, 81, G.F.HEDGE), C), '', 'a hedge may stand by a Markt tree');
});

test('levels: the nearest in view first, each level within its cap and the triangles left, behind beyond the near ring not drawn', () => {
  const R = [16, 70, 160],
    N = { tree: [2, 3, 4], hedge: [1, 1, 1] },
    cone = Math.cos((45 * Math.PI) / 180);
  const T = [];
  for (let i = 1; i <= 12; i++) T.push({ x: 0, y: i * 6, r: 3 }); // ahead (+y) every 6 m
  T.push({ x: 0, y: -30, r: 3 }); // behind, beyond the near ring
  T.push({ x: 0, y: -8, r: 3 }); // behind, inside the near ring
  T.push({ x: 0, y: 400, r: 3 }); // far ahead: a card
  const n = G.assign(T, 0, 0, 0, 1, R, N, cone, false, null, null);
  const lv = T.map(t => t.lv);
  assert.equal(T[12].lv, -1, 'behind beyond the near ring');
  assert.equal(T[14].lv, 3, 'far: card');
  assert.equal(lv.filter(v => v === 0).length, 2, 'full level: its cap');
  assert.equal(lv.filter(v => v === 1).length, 3);
  assert.equal(lv.filter(v => v === 2).length, 4);
  assert.equal(T[13].lv, 0, 'the nearest (behind, within the near ring) gets the full level');
  assert.equal(T[0].lv, 0, 'the nearest ahead too');
  assert.ok(T[11].lv === 3, 'beyond the caps: card');
  assert.deepEqual([...n], [2, 3, 4, lv.filter(v => v === 3).length]);
  // from high above: no full level
  G.assign(T, 0, 0, 0, 1, R, N, cone, true, null, null);
  assert.ok(T.every(t => t.lv !== 0));
  // the triangles: full 10 000, mid 3000, far 1000 – of 15 000 the nearest takes the full level, the next the mid one, two far ones
  const cost = (t, l) => [10000, 3000, 1000][l];
  const U = [];
  for (let i = 0; i < 6; i++) U.push({ x: 0, y: 2 + i, r: 3 });
  const m = G.assign(U, 0, 0, 0, 1, R, { tris: 15000, tree: [9, 9, 9], hedge: [1, 1, 1] }, cone, false, cost, null);
  assert.deepEqual(
    U.map(t => t.lv),
    [0, 1, 2, 2, 3, 3]
  );
  assert.equal(m.tris, 15000, 'every triangle used: 10 000 + 3000 + 1000 + 1000');
  // hedges have their own caps
  const H = [
    { x: 0, y: 3, r: 1, h: 1 },
    { x: 0, y: 4, r: 1, h: 1 },
    { x: 0, y: 5, r: 1 },
  ];
  G.assign(H, 0, 0, 0, 1, R, N, cone, false, null, t => t.h === 1);
  assert.deepEqual(
    H.map(t => t.lv),
    [0, 1, 0]
  );
});

test('the budgets: a phone draws fewer trees in detail than a computer, the lower tiers fewer than the highest', () => {
  const pc = G.budget(false, 'hoch'),
    ph = G.budget(true, 'hoch'),
    lo = G.budget(false, 'schnell');
  for (let i = 0; i < 3; i++) {
    assert.ok(ph.tree[i] < pc.tree[i]);
    assert.ok(lo.tree[i] <= pc.tree[i]);
  }
  assert.ok(G.radii(true, 'hoch')[2] < G.radii(false, 'hoch')[2]);
});

test('leaf fall thins the crown by a level, bare trees have none', () => {
  assert.equal(G.leafLevel(0, 1), 0);
  assert.equal(G.leafLevel(0, 0.5), 1);
  assert.equal(G.leafLevel(1, 0.2), 2);
  assert.equal(G.leafLevel(2, 0.5), 2);
  assert.equal(G.leafLevel(0, 0.05), null);
});

test('the trunks stop the walker: out of a trunk, nothing when none is near, a tree left out does not count', () => {
  const T = [
    { x: 0, y: 0, tr: 0.3, off: '' },
    { x: 10, y: 0, tr: 0.3, off: 'Gebäude' },
  ];
  const Gr = G.grid(T, 16),
    p = [0.2, 0];
  assert.equal(G.pushOut(Gr, p, 0.3), true);
  assert.ok(Math.abs(Math.hypot(p[0], p[1]) - 0.6) < 1e-9, 'pushed to the trunk plus the radius');
  assert.equal(G.pushOut(Gr, [5, 5], 0.3), undefined);
  assert.equal(G.pushOut(Gr, [10.1, 0], 0.3), undefined, 'a tree left out is no collider');
  assert.equal(G.pushOut(null, [0, 0], 0.3), undefined);
});

test('geometry: the grid finds what is within reach, the spacing of a row', () => {
  const T = [];
  for (let i = 0; i < 10; i++) T.push({ x: i * 9.5, y: 0 });
  const Gr = G.grid(T, 16);
  assert.equal(Gr.near(20, 0, 11).length, 3, '9.5, 19 and 28.5 within 11 m of 20');
  assert.equal(G.rowSpacing(T), 9.5);
  assert.ok(G.inPoly([0, 0, 4, 0, 4, 4, 0, 4], 2, 2) && !G.inPoly([0, 0, 4, 0, 4, 4, 0, 4], 5, 2));
  assert.ok(Math.abs(G.distPoly([0, 0, 4, 0, 4, 4, 0, 4], 6, 2) - 2) < 1e-9);
});
