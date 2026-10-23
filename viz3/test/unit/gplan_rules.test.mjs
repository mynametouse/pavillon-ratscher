// Unit tests of the garden planner's adviser (gplan/gplan_rules.js) without a browser: every warning on a small made-up site with the
// test data (fixtures/gplan_mini.json): boundary, buildings, path, brook, late frost, neighbours, pollinator, crowns, light, protection,
// soil – and the tips for one plant. Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GPMODEL as M } from '../../src/gplan/gplan_model.js';
import { GPRULES as R } from '../../src/gplan/gplan_rules.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MINI = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/gplan_mini.json'), 'utf8'));
const clone = o => JSON.parse(JSON.stringify(o));
// a square garden of 40 × 40 m, a pavilion 4 × 4 m and 7 m high at the centre, a path along y = −10, the brook along y = 18
const SITE = {
  boundary: [
    [-20, -20],
    [20, -20],
    [20, 20],
    [-20, 20],
  ],
  buildings: [
    {
      key: 'pav',
      name: 'Pavillon',
      g: 'm',
      h: 7,
      foot: [
        [0, 0],
        [4, 0],
        [4, 4],
        [0, 4],
      ],
    },
  ],
  paths: [
    [
      [-20, -10],
      [20, -10],
    ],
  ],
  pathW: 0.6,
  bridge: null,
  brook: (x, y) => Math.abs(y - 18),
  ditch: 2.25,
  wet: 6,
  trees: [],
};
const plan = (...items) => ({ v: 1, items: items.map(([id, x, y]) => ({ id, x, y, jahr: 2026 })) });
const run = (db, p, opts = {}) => R.check(p, M.index(db), SITE, Object.assign({ year: 2026, age: 0 }, opts));
const keys = W => W.map(w => w.level + ':' + w.key);
const has = (W, level, key, re) =>
  assert.ok(
    W.some(w => w.level === level && w.key === key && (!re || re.test(w.text))),
    'missing ' +
      level +
      ':' +
      key +
      (re ? ' ' + re : '') +
      '\n' +
      W.map(w => w.level + ' ' + w.key + ' ' + w.text).join('\n')
  );
const hasNot = (W, key) => assert.ok(!W.some(w => w.key === key), 'unexpected ' + key + '\n' + keys(W).join(' '));

test('boundary distance after the legal category: 0,5 m is too close for a fruit tree, outside is outside', () => {
  const W = run(MINI, plan(['apfel-test', -19.5, -15]));
  has(W, 'warn', 'grenze', /0,50 m bis zur Grenze.*mindestens 1,5 m/);
  const w = W.find(x => x.key === 'grenze');
  assert.ok(w.why.includes('Testkategorie Obstbaum') && w.why.includes('Testparagraf') && w.why.includes('Stammmitte'));
  assert.deepEqual(w.items, [0]);
  hasNot(run(MINI, plan(['apfel-test', -17, -15])), 'grenze');
  has(run(MINI, plan(['apfel-test', -25, -15])), 'warn', 'grenze', /außerhalb/);
  // the perennial has no distance to keep
  hasNot(run(MINI, plan(['beinwell-test', -19.9, -15])), 'grenze');
});

test('buildings: in the pavilion, the grown crown over it, close to it', () => {
  has(run(MINI, plan(['apfel-test', 2, 2])), 'warn', 'bau', /steht im Pavillon/);
  has(run(MINI, plan(['apfel-test', 5, 2])), 'warn', 'bau', /Krone reicht ausgewachsen 1,3 m über den Pavillon/);
  has(run(MINI, plan(['apfel-test', 6, 2])), 'hint', 'bau', /bis an den Pavillon/);
  hasNot(run(MINI, plan(['apfel-test', 8, 2])), 'bau');
  // a perennial next to the wall is fine
  hasNot(run(MINI, plan(['beinwell-test', 4.6, 2])), 'bau');
});

test('the path: on it, the crown hanging into it', () => {
  has(run(MINI, plan(['goumi-test', 5, -10.3])), 'warn', 'weg', /auf dem Weg/);
  has(run(MINI, plan(['apfel-test', 5, -8])), 'hint', 'weg', /in den Weg/);
  hasNot(run(MINI, plan(['apfel-test', 5, -5])), 'weg');
});

test('the brook: in the ditch, wet ground for a plant without waterlogging', () => {
  has(run(MINI, plan(['apfel-test', -5, 17])), 'warn', 'nass', /Bachgraben/);
  has(run(MINI, plan(['apfel-test', -5, 14])), 'warn', 'nass', /keine Staunässe.*4,0 m vom Bach/);
  // goumi tolerates short wet spells but likes it fresh: a hint
  has(run(MINI, plan(['goumi-test', -5, 14])), 'hint', 'nass');
  // comfrey likes it moist: nothing
  hasNot(run(MINI, plan(['beinwell-test', -5, 14])), 'nass');
  hasNot(run(MINI, plan(['apfel-test', -5, 5])), 'nass');
});

test('late frost: early blossom with a high risk is a warning, a medium risk a hint – with the fact from regeln.json', () => {
  has(run(MINI, plan(['apfel-test', -5, 5])), 'hint', 'frost', /blüht ab April/);
  const d = clone(MINI);
  d.pflanzen.arten[0].bluete.spaetfrost = 'hoch';
  const W = run(d, plan(['apfel-test', -5, 5], ['apfel-test', 8, 8]));
  has(W, 'warn', 'frost', /spätfrostgefährdet/);
  const w = W.find(x => x.key === 'frost');
  assert.deepEqual(w.items, [0, 1], 'one warning for both apples');
  assert.ok(w.why.includes('Kaltluft'), 'reason from regeln.json fakten: ' + w.why);
  d.pflanzen.arten[0].bluete.spaetfrost = 'gering';
  hasNot(run(d, plan(['apfel-test', -5, 5])), 'frost');
});

test('neighbours that do not get on: by id within the radius, everything around with *', () => {
  const d = clone(MINI);
  d.pflanzen.arten[0].unvertraeglich = [{ mit: 'goumi-test', grund: 'Testgrund: Wurzeldruck', radius_m: 3 }];
  const W = run(d, plan(['apfel-test', -5, 5], ['goumi-test', -5, 7]));
  has(W, 'warn', 'nachbar', /vertragen sich nicht \(2,0 m, besser ab 3,0 m\)/);
  assert.equal(W.find(x => x.key === 'nachbar').why, 'Testgrund: Wurzeldruck');
  hasNot(run(d, plan(['apfel-test', -5, 5], ['goumi-test', -5, 8.5])), 'nachbar');
  d.pflanzen.arten[0].unvertraeglich = [{ mit: '*', grund: 'Testgrund: hemmt alles', radius_m: 6 }];
  has(run(d, plan(['apfel-test', -5, 5], ['beinwell-test', -5, 10])), 'warn', 'nachbar');
  d.pflanzen.arten[0].unvertraeglich = [{ mit: 'schicht:kraut', grund: 'Testgrund', radius_m: null }];
  has(run(d, plan(['apfel-test', -5, 5], ['beinwell-test', -5, 6])), 'warn', 'nachbar');
  hasNot(run(d, plan(['apfel-test', -5, 5], ['goumi-test', -5, 6])), 'nachbar');
});

test('pollination: a self-sterile apple alone needs a second cultivar within 30 m', () => {
  const W = run(MINI, plan(['apfel-test', -5, 5]));
  has(W, 'warn', 'befruchter', /zweite Sorte.*passend: Testsorte B/);
  // a second tree of the same cultivar does not help, another cultivar of the species does – if near enough
  const d = clone(MINI);
  const b = clone(d.pflanzen.arten[0]);
  b.id = 'apfel-b-test';
  b.sorte = 'Testsorte B';
  d.pflanzen.arten.push(b);
  has(run(d, plan(['apfel-test', -5, 5], ['apfel-test', 10, 5])), 'warn', 'befruchter');
  hasNot(run(d, plan(['apfel-test', -5, 5], ['apfel-b-test', 10, 5])), 'befruchter');
  has(run(d, plan(['apfel-test', -15, -15], ['apfel-b-test', 15, 15])), 'warn', 'befruchter');
  // one note for all lonely plants of a kind
  const two = run(MINI, plan(['apfel-test', -15, -15], ['apfel-test', 15, 15])).filter(w => w.key === 'befruchter');
  assert.equal(two.length, 1);
  assert.deepEqual(two[0].items, [0, 1]);
  assert.ok(two[0].text.includes('(2×)'));
  // a species without a cultivar name (seedlings): a second plant of the same kind pollinates
  const e = clone(MINI);
  e.pflanzen.arten[1].befruchtung = { selbstfruchtbar: 'nein', befruchter: ['goumi-test'] };
  has(run(e, plan(['goumi-test', -5, 5])), 'warn', 'befruchter', /zweite Pflanze/);
  hasNot(run(e, plan(['goumi-test', -5, 5], ['goumi-test', 5, 5])), 'befruchter');
  // the reason names the fact about this fruit when regeln.json has one (befruchtung-apfel for apfel-…)
  const f = clone(MINI);
  f.pflanzen.arten[0].id = 'apfel-x';
  f.gilden.gilden[0].mitte = 'apfel-x';
  f.regeln.fakten.push({ id: 'befruchtung-apfel', text: 'Testfakt Apfel.', quelle: 'test' });
  f.regeln.fakten.push({ id: 'befruchtung-kirsche', text: 'Testfakt Kirsche.', quelle: 'test' });
  const wf = run(f, plan(['apfel-x', -5, 5])).find(w => w.key === 'befruchter');
  assert.ok(wf.why.includes('Testfakt Apfel.') && !wf.why.includes('Kirsche'), wf.why);
});

test('crowns growing into each other: trees with trees, not a shrub under a tree', () => {
  has(run(MINI, plan(['apfel-test', -5, 5], ['apfel-test', -4, 5])), 'warn', 'krone');
  has(run(MINI, plan(['apfel-test', -5, 5], ['apfel-test', -1.8, 5])), 'hint', 'krone');
  hasNot(run(MINI, plan(['apfel-test', -5, 5], ['apfel-test', 0, 5])), 'krone');
  hasNot(run(MINI, plan(['apfel-test', -5, 5], ['goumi-test', -4, 5])), 'krone');
});

test('light: a sun plant north of a row of trees is in the shade on a June day; north of a building only half', () => {
  // three standing trees (r 4 m, 9 m high) in a row, the apple 1,5 m north of it
  const site = Object.assign({}, SITE, {
    trees: [
      [-16, -3, 4, 9],
      [-12, -3, 4, 9],
      [-8, -3, 4, 9],
    ],
  });
  const W = R.check(plan(['apfel-test', -12, -1.5]), M.index(MINI), site, { year: 2026, age: 0 });
  has(W, 'warn', 'licht', /braucht volle Sonne, steht aber im Juni \d+ % des Tages im Schatten/);
  hasNot(R.check(plan(['apfel-test', 2, -16]), M.index(MINI), site, { year: 2026, age: 0 }), 'licht');
  hasNot(R.check(plan(['apfel-test', -12, -1.5]), M.index(MINI), site, { year: 2026, age: 0, light: false }), 'licht');
  // north of the 7 m pavilion the morning and evening sun still come round in June: no warning
  hasNot(run(MINI, plan(['apfel-test', 2, 5.5])), 'licht');
});

test('protection at planting and soil: one hint per kind; tips for one plant', () => {
  const W = run(MINI, plan(['apfel-test', -5, 5], ['goumi-test', 8, -5]));
  has(W, 'hint', 'schutz', /Wühlmauskorb.*Apfel/);
  has(W, 'hint', 'schutz', /Pfahl/);
  has(W, 'hint', 'schutz', /Verbissschutz/);
  hasNot(W, 'boden');
  const d = clone(MINI);
  d.pflanzen.arten[1].boden.art = ['sand'];
  d.pflanzen.arten[1].boden.ph = [4, 5];
  has(run(d, plan(['goumi-test', 8, -5])), 'hint', 'boden', /sandigen Boden, pH 4,0–5,0/);
  // warnings before hints
  const lv = W.map(w => w.level);
  assert.deepEqual(
    lv,
    lv.slice().sort((a, b) => (a === b ? 0 : a === 'warn' ? -1 : 1))
  );
  const T = R.tips(M.index(MINI).byId.get('apfel-test'), M.index(MINI));
  for (const s of [
    'Wuchs:',
    'Boden: passt',
    'Licht: Sonne',
    'Verträgt sich gut mit: Beinwell',
    'Befruchtung:',
    'Ernte:',
    'Pflege:',
    'bei Kammbach',
  ])
    assert.ok(
      T.some(t => t.includes(s)),
      'tip ' + s + '\n' + T.join('\n')
    );
});
