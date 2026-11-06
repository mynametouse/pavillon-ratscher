// feat/strategie-bau: unit tests of the pavilion's project data (viz3/src/strategie/st_bau_data.js) without a browser – person-hours of a
// phase, the own timber of an item (sections in cm, battens in mm, boards by m², no oak from the Klinge), the costs with VAT, the own
// variant (timber or self-built), the weather windows with their reasons, the slab's verdict, the climate's temperature, the garden's prices.
// Run: node --test "viz3/test/unit/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STBAUDATA as B } from '../../src/strategie/st_bau_data.js';

test('person-hours from the phases’ „Aufwand zu zweit“', () => {
  assert.equal(B.personHours('2 Tage'), 32);
  assert.equal(B.personHours('½ Tag'), 8);
  assert.equal(B.personHours('1 Tag'), 16);
  assert.equal(B.personHours('–'), 6);
  // four people need less than half of what two need, but not a quarter (coordination)
  const two = B.crewMinutes(32, 2),
    four = B.crewMinutes(32, 4);
  assert.ok(four < two && four > two / 2.2, `${two} ${four}`);
});

test('own timber of an item: sections in cm, battens in mm, boards by area; oak and bought goods are not from the Klinge', () => {
  const stud = B.woodOf(['Ständer, Riegel, Rähm KVH 6/14', 'lfm', 135, 'm', 6.2, 1.6]);
  assert.ok(stud && stud.kant, 'a 6/14 stud is structural');
  assert.ok(Math.abs(stud.m3 - 0.06 * 0.14 * 135 * 1.12) < 1e-9);
  const batten = B.woodOf(['Konter- und Traglattung 30/50', 'lfm', 300, 'm', 0.95, 0.3]);
  assert.ok(batten && !batten.kant && Math.abs(batten.m3 - 0.03 * 0.05 * 300 * 1.12) < 1e-9, 'battens are written in mm');
  const cladding = B.woodOf(['Lärchenbretter 22 × 160 sägerau', 'm²', 130, 'm²', 36, 8]);
  assert.ok(cladding && !cladding.kant && Math.abs(cladding.m3 - 0.022 * 130 * 1.12) < 1e-9);
  assert.equal(B.woodOf(['Stufen Eiche 45 mm, Kreissegment', 'Stück', 14, 'Stk', 85, 25]), null, 'no oak in the Klinge');
  assert.equal(B.woodOf(['OSB/3 22 mm', 'm²', 30, 'm²', 14.5, null]), null, 'OSB is bought');
  assert.equal(B.woodOf(['Holzfaser-Dämmplatte 40 mm', 'm²', 36, 'm²', 16, null]), null);
});

test('costs of a phase: net prices plus 19 % VAT; the own variant only where the phase has one', () => {
  const p = {
    items: [
      ['Ständer KVH 6/14', 'lfm', 100, 'm', 6, 1.5],
      ['Nägel, Winkel', '', 1, 'psch', 100, null],
    ],
  };
  assert.equal(B.eigenKind(p), 'holz');
  const k = B.phaseCost(p, false),
    e = B.phaseCost(p, true);
  assert.equal(k.net, 700);
  assert.equal(k.eur, Math.round(700 * 1.19));
  assert.equal(e.net, 250);
  assert.ok(e.kant > 0.9 && e.brett === 0, JSON.stringify(e));
  const glass = { items: [['Kaufvariante: Holzfenster 3-fach', 'm²', 20, 'm²', 420, 0], ['Eigenbau: Isolierglas', 'm²', 20, 'm²', 0, 115]] };
  assert.equal(B.eigenKind(glass), 'bau');
  assert.equal(B.phaseCost(glass, false).net, 8400);
  assert.equal(B.phaseCost(glass, true).net, 2300);
  const stone = { items: [['Sandstein-Trittstufe', 'Stück', 1, 'Stk', 120, 0]] };
  assert.equal(B.eigenKind(stone), null, 'no own variant: bought');
  assert.equal(B.phaseCost(stone, true).net, 120);
});

test('weather windows say why not', () => {
  const seal = B.PH[2].wx;
  assert.equal(B.wxFail(seal, { rain: 0, wind: 10, temp: 9, storm: false }), null);
  assert.equal(B.wxFail(seal, { rain: 0.6, wind: 10, temp: 9, storm: false }).k, 'dry');
  assert.equal(B.wxFail(seal, { rain: 0, wind: 10, temp: 2, storm: false }).k, 'tMin');
  assert.equal(B.wxFail(B.PH[1].wx, { rain: 0, wind: 45, temp: 9, storm: false }).k, 'wind');
  assert.equal(B.wxFail(B.PH[0].wx, { rain: 0, wind: 5, temp: -4, storm: false }).k, 'soil');
  assert.equal(B.wxFail(B.PH[26].wx, { rain: 3, wind: 60, temp: -5, storm: true }, B.PH[26].inside), null, 'inside');
  assert.ok(B.wxText(seal).includes('trocken') && B.wxText(seal).includes('5 °C'));
  for (const [n, M] of Object.entries(B.PH)) {
    assert.ok(M.crew[0] >= 1 && M.crew[1] >= M.crew[0], 'crew of phase ' + n);
    if (+n > 0) assert.ok(M.learn && M.src, 'learn and source of phase ' + n);
  }
});

test('the slab: reinforced from 15 cm with a frost apron of 80 cm', () => {
  assert.equal(B.slabOk({ thick: 15, rebar: true, apron: 80 }), true);
  assert.equal(B.slabOk({ thick: 12, rebar: true, apron: 80 }), false);
  assert.equal(B.slabOk({ thick: 18, rebar: false, apron: 100 }), false);
  assert.equal(B.slabOk({ thick: 18, rebar: true, apron: 50 }), false);
  for (const L of [B.SLAB.thick, B.SLAB.apron]) assert.ok(Math.abs(L.reduce((s, x) => s + x[1], 0) - 1) < 1e-9);
});

test('the climate’s temperature near Ratscher: cold in January, warm in July, warmer in the afternoon', () => {
  assert.ok(B.tempAt(0, 15 * 60, 0) < 4);
  assert.ok(B.tempAt(6, 15 * 60, 0) > 20);
  assert.ok(B.tempAt(6, 15 * 60, 0) > B.tempAt(6, 4 * 60, 0));
  assert.equal(B.TEMP.length, 12);
});

test('the garden’s prices and sentences name their source or say „Annahme“', () => {
  for (const k of ['tree', 'bush', 'korb', 'pfahl', 'schutz', 'kg', 'stand']) assert.ok(B.GARDEN[k].eur > 0 && B.GARDEN[k].src);
  for (const k of ['pflanzen', 'giessen', 'schutz', 'schneiden', 'ernten', 'paar']) assert.ok(B.GARDEN.learn[k].length > 40);
  assert.deepEqual(B.GARDEN.pair, ['apfel-rebella', 'apfel-rewena']);
  for (const [k, P] of Object.entries(B.PREP)) assert.ok(P.label && P.learn && P.src, k);
});

test('the book’s rules name the exact paragraph with a link; its entries have a chapter, a text, a source and a hint', () => {
  const W = B.BOOK.why;
  for (const [id, w] of Object.entries(W)) {
    assert.ok(w.title && w.text.length > 30 && w.src.length >= 1, id);
    for (const q of w.src) assert.ok(typeof q[0] === 'string' && (q[1] === null || /^https:\/\/\S+$/.test(q[1])), id + ': ' + q);
  }
  // the building law: paragraph, Absatz and Nummer in the source, each with a link
  const src = id => W[id].src.map(q => q[0] + ' ' + q[1]).join(' | ');
  assert.match(src('bau_genehmigung'), /§ 63 Abs\. 1 Nr\. 1 Buchst\. a und b ThürBO.* https:\/\//);
  assert.match(src('bau_genehmigung'), /§ 35 Abs\. 1–3 Baugesetzbuch.* https:\/\/www\.gesetze-im-internet\.de\/bbaug\/__35\.html/);
  assert.match(src('bau_treppe'), /§ 37 Abs\. 1 und Abs\. 2 Satz 2 ThürBO/);
  assert.match(src('bau_statik'), /§ 2 Abs\. 3 Satz 1 Nr\. 1 ThürBO/);
  assert.match(src('bau_antrag'), /§ 65 ThürBO/);
  // no old numbering of the Bauordnung of 2014 (§ 60 procedure-free, § 34 stairs as the current paragraph)
  for (const id of Object.keys(W)) assert.doesNotMatch(src(id), /§ 60 ThürBO|^§ 34 ThürBO/, id);
  for (const e of B.BOOK.entries) {
    assert.ok(['natur', 'handwerk', 'geschichte', 'politik', 'orte'].includes(e.ch), e.id);
    assert.ok(e.title && e.text.length > 40 && e.here && e.hint && e.src.length >= 1, e.id);
  }
});
