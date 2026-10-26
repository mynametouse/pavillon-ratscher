// Unit tests of the street network of feat/verkehr (verkehr/verkehr_netz.js) and the people's data (verkehr/verkehr_leute.js) without a
// browser: junctions where ways meet, exits where the circle cuts, routes, lanes on the right, walkers on the left, speeds in curves.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VNETZ as N } from '../../src/verkehr/verkehr_netz.js';
import { VLEUTE as L } from '../../src/verkehr/verkehr_leute.js';

// a crossing: a street west–east, a lane south–north that ends 2 m short of the street (OSM ends do not always meet), a footway
const WAYS = [
  { kind: 3, w: 5, p: [-100, 0, 0, 0, 100, 0] },
  { kind: 4, w: 3.2, p: [20, -100, 20, -2] },
  { kind: 8, w: 1.8, p: [-50, 50, -50, 100] },
];

test('ways meeting become one junction; the circle makes exits', () => {
  const G = N.graph(WAYS, { kinds: new Set([3, 4]), clip: [0, 0, 80] });
  // the lane's end 2 m from the street: a node at (20, 0) on the street
  const j = G.nodes.find(n => Math.hypot(n.x - 20, n.y) < 1.5);
  assert.ok(j, 'junction at the lane end');
  assert.equal(j.edges.length, 3, 'street west, street east, the lane');
  const ex = G.nodes.filter(n => n.exit);
  assert.equal(ex.length, 3, 'west, east, south');
  for (const n of ex) assert.ok(Math.abs(Math.hypot(n.x, n.y) - 80) < 0.5, 'on the circle');
  assert.ok(!G.edges.some(e => e.kind === 8), 'the footway is not for cars');
});

test('a route from west to south turns at the junction; the lane is on the right, the walker on the left', () => {
  const G = N.graph(WAYS, { kinds: new Set([3, 4]), clip: [0, 0, 80] });
  const W = G.nodes.findIndex(n => n.exit && n.x < -70),
    Sx = G.nodes.findIndex(n => n.exit && n.y < -70);
  const r = N.route(G, W, Sx);
  assert.ok(r && r.length === 2, 'two edges');
  const car = N.line(r, { off: e => e.w / 4, vmax: () => 10, cut: 5 });
  // driving east on the street: the right-hand lane is south of the centre line (y < 0)
  const p = N.at(car, 30);
  assert.ok(p.y < -0.8 && p.y > -1.6, 'right-hand lane ' + p.y.toFixed(2));
  assert.ok(Math.abs(p.hd - Math.PI / 2) < 0.05, 'heading east');
  // the turn to the south slows the car; the straight does not
  assert.ok(car.S[10] > 9, 'straight: the limit ' + car.S[10]);
  const turn = N.project(car, 20, -1, 0, 200);
  assert.ok(car.S[Math.round(turn.s)] < 7, 'in the turn slower ' + car.S[Math.round(turn.s)]);
  const walk = N.line(r, { off: e => -(e.w / 2 - 0.45), cut: 1.5 });
  const q = N.at(walk, 30);
  assert.ok(q.y > 1.8 && q.y < 2.2, 'the walker at the left edge ' + q.y.toFixed(2));
  // project: lateral offset + to the right of the direction of travel
  const pr = N.project(car, 30, -5, 0, 60);
  assert.ok(pr.lat > 3 && pr.lat < 4.5 && Math.abs(pr.s - 130) > 50, 'right of the lane ' + JSON.stringify(pr));
});

test('reach gives every node a cost; no route into another component', () => {
  const G = N.graph(WAYS, { kinds: new Set([3, 4, 8]) });
  const d = N.reach(G, 0);
  assert.ok(
    d.some(v => v === Infinity),
    'the footway is apart'
  );
  const iso = G.nodes.findIndex(n => Math.hypot(n.x + 50, n.y - 50) < 0.5);
  assert.equal(N.route(G, 0, iso), null);
});

test('the people: every one complete, du to the player, drivers with a car', () => {
  for (const k of L.KEYS) {
    const p = L.P[k];
    assert.ok(p.name && p.full && (p.g === 'm' || p.g === 'f') && p.age > 15 && p.role, k);
    assert.ok(p.sheet.split('. ').length >= 2, k + ': two sentences');
    assert.ok(/^vk_[mf]\d\d$/.test(p.fig) && p.clips === p.g, k + ': figure');
    assert.ok(
      p.where.every(w => w === 'dorf' || w === 'stadt'),
      k
    );
    assert.ok(p.greet.length && p.pass.length && Object.keys(p.topics).length >= 2, k + ': lines');
    const all = [...p.greet, ...p.pass, ...Object.values(p.topics).flatMap(t => t.slice(1))].join(' ');
    assert.ok(!/\b(Sie|Ihnen|Ihr|Ihre)\b/.test(all), k + ': du, not Sie');
  }
  assert.ok(L.KEYS.filter(k => L.P[k].car).length >= 4, 'drivers');
  assert.ok(new Set(L.KEYS.map(k => L.P[k].fig)).size === L.KEYS.length, 'one figure each');
  assert.ok(L.line('sabine', 'halt', 'zum Anger').includes('zum Anger'));
  assert.ok(L.line('bettina', 'mit').length > 3, 'a driver line for everyone');
});
