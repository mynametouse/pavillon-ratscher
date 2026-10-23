// Unit tests of the garden planner's model (gplan/gplan_model.js) without a browser: growth, seasons, the saved plan, guilds, the lists.
// Test data: fixtures/gplan_mini.json (not real values). Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GPMODEL as M } from '../../src/gplan/gplan_model.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MINI = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/gplan_mini.json'), 'utf8'));
const db = M.index(MINI);
const apple = db.byId.get('apfel-test'),
  goumi = db.byId.get('goumi-test'),
  comfrey = db.byId.get('beinwell-test');

test('the database is indexed: plants by id, legal categories, guilds', () => {
  assert.equal(db.list.length, 3);
  assert.equal(db.legal.get('test-obst').abstand_m, 1.5);
  assert.equal(db.guilds.length, 1);
  assert.equal(M.index(null).list.length, 0);
});

test('growth: planting size at 0, saturating to the final size, deterministic', () => {
  const s0 = M.sizeAt(apple, 0);
  assert.equal(s0.h, apple.pflanzhoehe_m);
  assert.ok(s0.w > 0 && s0.w < 1, 'a young tree is narrow: ' + s0.w);
  let last = 0;
  for (const a of [0, 1, 3, 5, 10, 15, 20, 40]) {
    const s = M.sizeAt(apple, a);
    assert.ok(s.h >= last - 1e-9, 'grows: ' + a);
    last = s.h;
  }
  const F = M.finalSize(apple);
  assert.equal(F.h, 4.5);
  assert.equal(F.w, 4.5);
  assert.ok(Math.abs(M.sizeAt(apple, 15).h - 4.5) < 1e-9, 'final size after jahre_bis_endgroesse');
  assert.ok(Math.abs(M.sizeAt(apple, 50).h - 4.5) < 1e-9, 'no more growth after that');
  // after 5 years of 15 more than half of the way
  const s5 = M.sizeAt(apple, 5);
  assert.ok(s5.h > 3 && s5.h < 4, 'apple at 5: ' + s5.h);
  // the perennial is grown after two years
  assert.ok(Math.abs(M.sizeAt(comfrey, 2).h - 0.9) < 1e-9);
  // a seed varies the final size inside the range, the same seed gives the same size
  const a = M.sizeAt(apple, 20, 'x1'),
    b = M.sizeAt(apple, 20, 'x1'),
    c = M.sizeAt(apple, 20, 'x2');
  assert.deepEqual(a, b);
  assert.ok(a.h >= 4 && a.h <= 5 && c.h >= 4 && c.h <= 5);
});

test('crown: a half-standard has a stem, a shrub is leafy from the ground', () => {
  const t = M.crown(apple, M.sizeAt(apple, 20));
  assert.ok(t.zb > 1 && t.zb <= 1.2 + 1e-9, 'stem ' + t.zb);
  assert.ok(Math.abs(t.zc + t.a - 4.5) < 1e-9, 'top = height');
  assert.equal(t.r, 2.25);
  const s = M.crown(goumi, M.sizeAt(goumi, 8));
  assert.ok(s.zb < 0.3);
  assert.equal(s.tr, 0);
});

test('season: leaves, blossom and fruit by month', () => {
  assert.equal(M.season(apple, 1).leaf, 'kahl');
  assert.equal(M.season(apple, 4).leaf, 'austrieb');
  assert.equal(M.season(apple, 7).leaf, 'voll');
  assert.equal(M.season(apple, 10).leaf, 'herbst');
  assert.equal(M.season(comfrey, 2).leaf, 'kahl');
  assert.equal(M.season(apple, 4).bloom, true);
  assert.equal(M.season(apple, 6).bloom, false);
  assert.equal(M.season(apple, 9).fruit, true);
  assert.equal(M.season(apple, 7).fruit, false);
  // a range over the turn of the year
  assert.ok(M.inMonths(1, [10, 4]) && M.inMonths(11, [10, 4]) && !M.inMonths(6, [10, 4]));
  const c = M.colours(apple, 10);
  assert.equal(c.leaf, apple.darstellung.herbst);
  assert.equal(M.colours(apple, 4).bloom, apple.darstellung.bluete);
  assert.equal(M.colours(apple, 9).fruit, apple.darstellung.frucht);
});

test('the saved plan: broken values fall back, broken items are dropped one by one', () => {
  for (const bad of [null, 3, 'x', [], { v: 2 }, { items: 'no' }]) {
    const s = M.sanitize(bad);
    assert.equal(s.v, 1);
    assert.deepEqual(s.items, []);
    assert.equal(s.show, true);
    assert.equal(s.age, 0);
  }
  const s = M.sanitize(
    {
      v: 1,
      show: false,
      age: 10,
      month: 4,
      hour: 9.5,
      items: [
        { id: 'apfel-test', x: 1.234, y: -5, jahr: 2027 },
        { id: 'apfel-test', x: NaN, y: 0 },
        { id: '__proto__', x: 0, y: 0 },
        { id: 'goumi-test', x: 2, y: 3 },
        { id: 'unbekannt', x: 2, y: 3 },
        null,
        { id: 'beinwell-test', x: 1e9, y: 0 },
      ],
    },
    new Set(db.byId.keys()),
    2026
  );
  assert.equal(s.show, false);
  assert.equal(s.age, 10);
  assert.equal(s.month, 4);
  assert.equal(s.hour, 9.5);
  assert.deepEqual(s.items, [
    { id: 'apfel-test', x: 1.23, y: -5, jahr: 2027 },
    { id: 'goumi-test', x: 2, y: 3, jahr: 2026 },
  ]);
  assert.equal(M.sanitize({ age: 7 }).age, 0, 'only the four ages');
  assert.equal(M.ageOf({ jahr: 2027 }, 2026), null, 'not planted yet');
  assert.equal(M.ageOf({ jahr: 2026 }, 2036), 10);
});

test('a guild: the middle tree, the comfrey ring at the drip line, the goumi in the south', () => {
  const g = db.guilds[0],
    P = M.guildPlace(g, db, 10, 20);
  assert.equal(P.length, 8);
  assert.deepEqual(P[0], { id: 'apfel-test', x: 10, y: 20, ring: -1 });
  const R = M.finalSize(apple).w / 2;
  for (const q of P.filter(q => q.id === 'beinwell-test'))
    assert.ok(Math.abs(Math.hypot(q.x - 10, q.y - 20) - R) < 0.02);
  const go = P.find(q => q.id === 'goumi-test');
  assert.ok(Math.abs(go.x - 10) < 0.02 && go.y < 20 - R, 'south: ' + JSON.stringify(go));
  // all round: the six comfrey plants are spread (no two closer than a third of the ring)
  const cs = P.filter(q => q.id === 'beinwell-test');
  for (let i = 0; i < cs.length; i++)
    for (let j = i + 1; j < cs.length; j++) assert.ok(Math.hypot(cs[i].x - cs[j].x, cs[i].y - cs[j].y) > R * 0.9);
});

test('the lists: count per cultivar, form, rootstock, Kammbach, planting time, accessories', () => {
  const items = M.guildPlace(db.guilds[0], db, 0, 0).map(q => ({ id: q.id, x: q.x, y: q.y, jahr: 2026 }));
  const shop = M.shopList(items, db, { date: '23.10.2026', test: true });
  for (const s of [
    'Einkaufsliste',
    'Kammbach',
    'Testdaten',
    '1 × Apfel ‚Testsorte‘ – Halbstamm, Unterlage MM 106',
    'bei Kammbach: Art im Sortiment',
    '(Stand 22.10.2026)',
    'pflanzen Oktober–April',
    '6 × Beinwell',
    '1 × Goumi',
    'Zubehör',
    'Wühlmauskorb',
    'Baumpfahl',
  ])
    assert.ok(shop.includes(s), 'shopping list: ' + s + '\n' + shop);
  // order: trees, then shrubs, then perennials
  assert.ok(shop.indexOf('Apfel') < shop.indexOf('Goumi') && shop.indexOf('Goumi') < shop.indexOf('Beinwell'));
  const plan = M.plantList(items, db, { date: '23.10.2026', where: () => ' (Test)' });
  for (const s of ['Pflanzplan', 'Bäume (1)', 'Kräuter und Stauden (6)', 'bei x 0,0 / y 0,0 m, Pflanzjahr 2026 (Test)'])
    assert.ok(plan.includes(s), 'plant list: ' + s + '\n' + plan);
  assert.ok(M.shopList([], db).includes('Noch nichts geplant'));
});
