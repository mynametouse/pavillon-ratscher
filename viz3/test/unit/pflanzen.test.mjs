// Unit tests of the plant database of the garden planner (viz3/extra/pflanzen/dist/gartenplaner/*.json) without a browser: the three
// files pass the contract (gplan/gplan_schema.js) without drafts, the database covers every layer with 30–50 plants, every source is
// used, the neighbour-law categories, pollinators and guild plants exist. Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GPSCHEMA as S } from '../../src/gplan/gplan_schema.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIR = path.join(HERE, '../../extra/pflanzen/dist/gartenplaner');
const read = name => JSON.parse(fs.readFileSync(path.join(DIR, name), 'utf8'));
const P = read('pflanzen.json');
const R = read('regeln.json');
const G = read('gilden.json');
const byId = new Map(P.arten.map(p => [p.id, p]));
const ID_LIKE = /^[a-z0-9]+(-[a-z0-9]+)+$/;

test('the three files pass the contract: no errors, no warnings, no drafts', () => {
  const r = S.validateAll({ pflanzen: P, regeln: R, gilden: G });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.warnings, []);
  assert.ok(P.arten.every(p => !p.entwurf));
  for (const f of [P, R, G]) assert.equal(f.version, 1);
});

test('30–50 plants covering every layer, each with at least one source', () => {
  assert.ok(P.arten.length >= 30 && P.arten.length <= 50, 'plants ' + P.arten.length);
  for (const layer of S.ENUM.SCHICHT)
    assert.ok(
      P.arten.some(p => p.schicht === layer),
      'no plant in layer ' + layer
    );
  for (const p of P.arten) {
    assert.ok(p.quellen.length >= 1, p.id + ' has no source');
    assert.equal(p.bezug.stand, '2026-10-22', p.id + ' bezug.stand');
  }
});

test('every source of each file is used at least once', () => {
  const check = (file, name, used) => {
    for (const k of Object.keys(file.quellen)) assert.ok(used.has(k), name + ': source ' + k + ' is never used');
  };
  check(P, 'pflanzen.json', new Set(P.arten.flatMap(p => p.quellen)));
  check(R, 'regeln.json', new Set([...R.grenzabstand, ...R.fakten].map(x => x.quelle)));
  check(G, 'gilden.json', new Set(G.gilden.flatMap(g => g.quellen)));
});

test('every plant names an existing neighbour-law category; the categories cite the ThürNRG', () => {
  const cats = new Map(R.grenzabstand.map(g => [g.id, g]));
  for (const p of P.arten) assert.ok(cats.has(p.nachbarrecht), p.id + ': ' + p.nachbarrecht);
  for (const g of R.grenzabstand) assert.match(g.paragraf, /ThürNRG/, g.id);
  // fruit trees by rootstock vigour, walnut seedlings and hedges by height are all there
  for (const id of [
    'obst-stark',
    'obst-schwach',
    'walnuss-saemling',
    'hecke-bis-1m',
    'hecke-ueber-2m',
    'beerenobst',
    'rebstock',
  ])
    assert.ok(cats.has(id), 'category ' + id);
});

test('pollinators: apple cultivars that need one have one in the database; id-like pollinators exist', () => {
  const apples = P.arten.filter(p => p.art === 'Malus domestica');
  assert.ok(apples.length >= 2 && apples.length <= 4, 'apples ' + apples.length);
  for (const a of apples) {
    const b = a.befruchtung;
    if (!b || b.selbstfruchtbar === 'ja') continue;
    const others = apples.filter(o => o !== a);
    const ok = b.befruchter.some(x => others.some(o => o.id === x || o.sorte === x));
    assert.ok(ok, a.id + ' has no pollinator among the database apples');
  }
  for (const p of P.arten)
    for (const x of (p.befruchtung && p.befruchtung.befruchter) || [])
      if (ID_LIKE.test(x)) assert.ok(byId.has(x), p.id + ': unknown pollinator id ' + x);
});

test('the walnut keeps its neighbours at a distance (juglone)', () => {
  const w = P.arten.find(p => p.art === 'Juglans regia');
  assert.ok(w, 'walnut');
  const u = (w.unvertraeglich || []).find(n => n.mit === '*');
  assert.ok(u && u.radius_m > 0, 'walnut needs an unvertraeglich entry with * and a radius');
});

test('guilds use known plants around a tree or small tree', () => {
  assert.ok(G.gilden.length >= 3 && G.gilden.length <= 6, 'guilds ' + G.gilden.length);
  for (const g of G.gilden) {
    const m = byId.get(g.mitte);
    assert.ok(m && ['baum', 'kleinbaum'].includes(m.schicht), g.id + ': middle ' + g.mitte);
    for (const r of g.ringe) for (const e of r.pflanzen) assert.ok(byId.has(e.id), g.id + ': unknown plant ' + e.id);
  }
  assert.ok(
    G.gilden.some(g => byId.get(g.mitte).art === 'Malus domestica'),
    'an apple guild'
  );
});
