// Unit tests of Schleusingen after views from the street (schleusingen-ansicht/sa_look.js) without a browser: every record of
// fassaden.json turns into a valid look of the town (style codes, linear colours, timber, slate tone, type, roof), the materials map to
// the right facade styles, a record only fits the building whose centroid it names. Run: node --test "viz3/test/unit/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SALOOK } from '../../src/schleusingen-ansicht/sa_look.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const read = p => JSON.parse(fs.readFileSync(path.join(HERE, '..', '..', p), 'utf8'));
const DOC = read('extra/schleusingen-ansicht/dist/schleusingen-ansicht/fassaden.json');
const STADT = read('extra/schleusingen/dist/schleusingen/stadt.json');
const BASE = {
  style: 0,
  col: [0.5, 0.5, 0.5],
  timber: 1,
  frame: 1,
  door: 2,
  shut: 1,
  shutters: true,
  orn: true,
  raised: true,
  sp: 2.7,
  typ: 1,
};
const centroid = f => {
  const n = f.length / 2;
  let x = 0,
    y = 0;
  for (let k = 0; k < f.length; k += 2) {
    x += f[k] / n;
    y += f[k + 1] / n;
  }
  return [x, y];
};
const rec = i => DOC.gebaeude.find(r => r.i === i);

test('colours: sRGB hex to the town palette (linear × 0.82)', () => {
  assert.deepEqual(
    SALOOK.hexSrgb('#ff0080').map(v => +v.toFixed(3)),
    [1, 0, 0.502]
  );
  assert.deepEqual(SALOOK.hexLin('#ffffff'), [0.82, 0.82, 0.82]);
  assert.equal(SALOOK.hexLin('#000000')[0], 0);
  assert.equal(SALOOK.hexSrgb('white'), null);
  assert.ok(Math.abs(SALOOK.hexLin('#808080', 1)[0] - 0.2159) < 1e-3);
});

test('every record of fassaden.json turns into a valid look and roof', () => {
  assert.ok(DOC.gebaeude.length >= 100, `${DOC.gebaeude.length} records`);
  for (const r of DOC.gebaeude) {
    const o = SALOOK.look(r, BASE),
      tag = `building ${r.i} (${r.material})`;
    assert.ok([0, 1, 2, 3, 4, 5, 6, 8, 9, 10, 11].includes(o.style), `${tag}: style ${o.style}`);
    assert.equal(o.col.length, 3, tag);
    for (const c of o.col) assert.ok(Number.isFinite(c) && c >= 0 && c <= 0.82 + 1e-9, `${tag}: colour ${o.col}`);
    assert.ok([0, 1, 2].includes(o.timber), `${tag}: timber ${o.timber}`);
    assert.ok([0, 1, 2, 3].includes(o.frame), `${tag}: frame ${o.frame}`);
    assert.ok([0, 1, 2, 3].includes(o.slate), `${tag}: slate tone ${o.slate}`);
    assert.ok([0, 1, 2].includes(o.typ), `${tag}: type ${o.typ}`);
    assert.equal(o.orn, false, tag);
    assert.equal(o.shutters, !!r.laeden, `${tag}: shutters as read`);
    assert.ok(o.sp >= 2.4 && o.sp <= 4.5, `${tag}: bay ${o.sp}`);
    assert.equal(o.door, BASE.door, `${tag}: the door stays the town's`);
    const rf = SALOOK.roof(r, false);
    assert.ok(
      rf && [0, 1, 2, 3].includes(rf.rk),
      `${tag}: roof ${JSON.stringify(rf)} (a pitched roof is never drawn flat)`
    );
    assert.ok(
      rf.rc.every(c => c >= 0 && c <= 1),
      tag
    );
  }
});

test('the materials map to the facade styles of world/village.js', () => {
  const st = i => SALOOK.look(rec(i), BASE);
  assert.equal(st(235).style, SALOOK.ST.SLATE, 'Hildburghäuser Straße 20: all slate');
  assert.equal(st(235).slate, 3, 'shingles in the colour read off the view');
  assert.equal(st(349).style, SALOOK.ST.FW_UP, 'the long half-timbered house');
  assert.equal(st(349).timber, SALOOK.TIMBER.schwarz);
  assert.deepEqual(st(349).col, SALOOK.hexLin(rec(349).eg.farbe), 'its ground floor in the colour of the ground floor');
  assert.equal(st(308).style, SALOOK.ST.PLASTER, 'Hildburghäuser Straße 5: a house, not a hall');
  assert.equal(st(308).typ, 0);
  assert.equal(st(400).timber, SALOOK.TIMBER.rot, 'ox-blood half-timbering');
  assert.equal(st(80).style, SALOOK.ST.MODERN, 'the modern school');
  assert.equal(st(552).style, SALOOK.ST.HALL, 'the sheet-metal hall');
  assert.equal(st(552).typ, 1);
  assert.equal(st(580).typ, 1, 'garages get a garage door');
  assert.equal(st(32).style, SALOOK.ST.SLATE, 'turquoise shingles');
  assert.equal(st(32).slate, 3);
  assert.equal(st(712).style, SALOOK.ST.SLATE_UP, 'slate above a brick ground floor');
  assert.deepEqual(st(712).col, SALOOK.hexLin(rec(712).eg.farbe));
  for (const r of DOC.gebaeude.filter(q => q.art === 'block'))
    assert.equal(SALOOK.look(r, BASE).shutters, false, `block ${r.i}: no shutters (the model had some)`);
});

test('roofs: kind and colour, flat only where the town’s roof is flat', () => {
  assert.equal(SALOOK.roof(rec(308), false).rk, SALOOK.ROOF.schiefer);
  assert.equal(SALOOK.roof(rec(80), true).rk, SALOOK.ROOF.flach);
  assert.equal(SALOOK.roof(rec(80), false).rk, SALOOK.ROOF.faserzement);
  assert.equal(SALOOK.roof({ dach: { material: 'stroh', farbe: '#ffffff' } }, false), null);
});

test('a record fits only the building whose centroid it names, and all records fit the town data', () => {
  const B = new Map(STADT.b.map(b => [b.i, b]));
  const M = SALOOK.index(DOC);
  assert.equal(M.size, DOC.gebaeude.length, 'one record per building');
  for (const [i, r] of M) {
    assert.ok(B.has(i), `building ${i} in stadt.json`);
    const [cx, cy] = centroid(B.get(i).f);
    assert.ok(
      SALOOK.matches(r, cx, cy),
      `building ${i}: centroid ${cx.toFixed(1)}, ${cy.toFixed(1)} vs ${r.x}, ${r.y}`
    );
    assert.ok(!SALOOK.matches(r, cx + 3, cy), `building ${i}: 3 m off is another building`);
    assert.ok(!B.get(i).lm, `building ${i}: no landmark (the town draws those itself)`);
  }
});
