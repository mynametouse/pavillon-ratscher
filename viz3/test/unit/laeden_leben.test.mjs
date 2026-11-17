// Unit tests of the living shops (feat/laeden-leben) without a browser: opening hours (einkauf/oeffnung.js), goods and prices
// (einkauf/waren.js: every block of goods on the shops' shelves is a product), how busy a shop is and who works (laeden/leben_plan.js),
// the ways of the customers through EDEKA (raster, A*), the wallet in free play and in the Grenzland mode (einkauf/geld.js with a fake
// localStorage and a fake GLSTATE). Run: node --test viz3/test/unit/   (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { OEFFNUNG } from '../../src/einkauf/oeffnung.js';
import { WAREN } from '../../src/einkauf/waren.js';
import { LLPLAN } from '../../src/laeden/leben_plan.js';
import { LIPLAN } from '../../src/laeden/innen_plan.js';
import { LIMARKT } from '../../src/laeden/innen_markt.js';
import { LIBAU } from '../../src/laeden/innen_bau.js';
import { LIHAUS } from '../../src/laeden/innen_haus.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DATA = JSON.parse(
  fs.readFileSync(path.join(HERE, '..', '..', 'extra', 'laeden', 'dist', 'laeden', 'laeden.json'), 'utf8')
);
const LAY = { supermarkt: LIMARKT.markt, discounter: LIMARKT.markt, baumarkt: LIBAU.baumarkt, ...LIHAUS.LAY };
const UNITS = LIPLAN.units(DATA);
const PLANS = new Map(UNITS.map(u => [u.id, LAY[u.type](LIPLAN.newPlan(u), u)]));
// a calendar for the tests: t in minutes, day 0 = a Sunday
const CAL = { wd: t => Math.floor(t / 1440) % 7, min: t => t % 1440 };
const at = (wd, h, m = 0) => wd * 1440 + h * 60 + m;

test('opening hours: the forms of OSM, the weekdays, closed days, past midnight, the short text', () => {
  const w = OEFFNUNG.parse('Mo-Fr 08:30-19:00; Sa 08:30-18:00; Su,PH off');
  assert.deepEqual(w[1], [[510, 1140]]);
  assert.deepEqual(w[6], [[510, 1080]]);
  assert.deepEqual(w[0], []);
  const t = OEFFNUNG.parse('Mo,Tu 09:00-11:30,14:00-16:00; Th 09:00-11:30,14:00-17:30; Fr 09:00-11:45');
  assert.equal(t[2].length, 2);
  assert.equal(t[3].length, 0);
  assert.equal(OEFFNUNG.am(t, 2, 15 * 60), true);
  assert.equal(OEFFNUNG.am(t, 2, 12 * 60), false);
  const n = OEFFNUNG.parse('Fr 22:00-02:00');
  assert.equal(OEFFNUNG.am(n, 5, 23 * 60), true);
  assert.equal(OEFFNUNG.am(n, 6, 60), true);
  assert.equal(OEFFNUNG.am(n, 6, 3 * 60), false);
  assert.equal(OEFFNUNG.short(OEFFNUNG.parse('Mo-Fr 08:30-19:00; Sa 08:30-18:00')), 'Mo–Fr 8:30–19, Sa 8:30–18');
  assert.equal(OEFFNUNG.short(OEFFNUNG.parse('24/7')), 'Mo–So 0–24');
});

test('the registry: shops and public buildings open by the game clock, the next change, the text at the door', () => {
  OEFFNUNG.uhr(CAL, () => at(2, 10));
  OEFFNUNG.add('edeka', { name: 'EDEKA', oh: 'Mo-Sa 07:00-20:00', quelle: 'OpenStreetMap' });
  assert.equal(OEFFNUNG.offen('edeka'), true);
  assert.equal(OEFFNUNG.offen('edeka', at(0, 10)), false);
  assert.equal(OEFFNUNG.offen('edeka', at(6, 6, 59)), false);
  assert.equal(OEFFNUNG.offen('edeka', at(6, 7)), true);
  assert.equal(OEFFNUNG.offen('gibtsnicht'), null);
  assert.match(OEFFNUNG.text('edeka', at(2, 10)), /^geöffnet bis 20 Uhr$/);
  assert.match(OEFFNUNG.text('edeka', at(6, 21)), /^geschlossen – öffnet Montag 7 Uhr$/);
  assert.match(OEFFNUNG.text('edeka', at(2, 5)), /^geschlossen – öffnet 7 Uhr$/);
  // the public buildings with their sources
  for (const id of ['rathaus', 'museum', 'johannis', 'bibliothek', 'post', 'feuerwehr', 'alteschule']) {
    const i = OEFFNUNG.info(id);
    assert.ok(i && i.name && i.quelle && i.zeiten, id);
  }
  assert.equal(OEFFNUNG.offen('museum', at(1, 11)), false, 'the museum is closed on Mondays');
  assert.equal(OEFFNUNG.offen('museum', at(0, 11)), true, 'and open on Sundays');
  assert.equal(OEFFNUNG.offen('rathaus', at(3, 10)), false, 'the town hall is closed on Wednesdays');
  assert.equal(OEFFNUNG.offen('rathaus', at(4, 16)), true);
});

test('goods: every block on the shelves of the supermarkets, the discounters, the bakery and OBI is a product with a price', () => {
  const CAT = WAREN.farbenKarte(LIMARKT, LIBAU);
  for (const id of ['edeka', 'rewe', 'lidl', 'aldi', 'obi', 'lidlbaecker']) {
    const Pl = PLANS.get(id);
    let n = 0,
      ok = 0;
    const seen = new Set();
    Pl.goods.forEach((g, i) => {
      if (!g.front && g.k !== 'heap') return;
      n++;
      const w = WAREN.get(WAREN.fuer(CAT.get(g.col), g.k, i));
      if (w) {
        ok++;
        seen.add(w.id);
      }
    });
    assert.ok(n > 30, id + ' has goods');
    assert.ok(ok / n > 0.97, id + ': ' + ok + ' of ' + n + ' blocks are products');
    assert.ok(seen.size >= (id === 'lidlbaecker' ? 2 : 12), id + ': ' + seen.size + ' different products');
  }
  for (const w of WAREN.list()) {
    assert.ok(Number.isInteger(w.preis) && w.preis > 0 && w.preis < 100000, w.id + ' price');
    assert.ok(w.kg > 0 && w.kg < 40, w.id + ' weight');
    assert.ok(WAREN.CAT[w.cat], w.id + ' department');
  }
  // useful things are there: timber, screws, paint and tools for the workshop and the garden, a torch and a crowbar for the mode
  for (const id of ['latte', 'brett', 'schrauben', 'lasur', 'hammer', 'blumenerde', 'lampe', 'brecheisen', 'broetchen', 'milch'])
    assert.ok(WAREN.get(id), id);
  assert.equal(WAREN.euro(119), '1,19 €');
  assert.equal(WAREN.euro(5), '0,05 €');
  assert.equal(WAREN.euro(123456), '1.234,56 €');
});

test('how busy: Saturday morning full, Tuesday afternoon quiet; the staff grows with the custom', () => {
  const sat = LLPLAN.andrang('supermarkt', 6, 10 * 60),
    tue = LLPLAN.andrang('supermarkt', 2, 14 * 60 + 30),
    eve = LLPLAN.andrang('supermarkt', 4, 17 * 60 + 30);
  assert.ok(sat > 0.9, 'Saturday ' + sat);
  assert.ok(tue < 0.4, 'Tuesday afternoon ' + tue);
  assert.ok(eve > tue + 0.3, 'after work ' + eve);
  assert.ok(LLPLAN.andrang('baecker', 1, 7 * 60) > LLPLAN.andrang('baecker', 1, 17 * 60));
  const B1 = LLPLAN.besetzung('supermarkt', sat, { kassen: 6, theken: 1 }),
    B2 = LLPLAN.besetzung('supermarkt', tue, { kassen: 6, theken: 1 });
  assert.ok(B1.kunden >= 9 && B1.kassen >= 3, JSON.stringify(B1));
  assert.ok(B2.kunden <= 4 && B2.kassen >= 1 && B2.kassen <= 2, JSON.stringify(B2));
  assert.equal(B2.auff, 1);
  assert.equal(LLPLAN.besetzung('supermarkt', 0, { kassen: 6 }).kunden, 0);
  const Bp = LLPLAN.besetzung('supermarkt', sat, { kassen: 6, theken: 1, phone: true });
  assert.ok(Bp.kunden <= 5 && Bp.kassen <= 2, 'a phone: fewer');
  const Bo = LLPLAN.besetzung('baumarkt', 0.8, { kassen: 5 });
  assert.equal(Bo.info, 1);
  assert.equal(Bo.zuschnitt, 1);
});

test('ways through EDEKA: from the door to the shelves, to every till, to the bakery counter – on the free raster', () => {
  const U = UNITS.find(u => u.id === 'edeka'),
    Pl = PLANS.get('edeka'),
    d = U.doors[0];
  const G = LLPLAN.grid(
    U.vols.map(v => v.f),
    Pl.segs,
    { cell: 0.4, rad: 0.3, doors: [[d.x - d.nx * 0.6, d.y - d.ny * 0.6]] }
  );
  assert.ok(G.n > 1500, 'free cells ' + G.n);
  const shelves = LLPLAN.regalPlaetze(G, Pl.goods, 60, 7);
  assert.ok(shelves.length >= 40, 'places at shelves ' + shelves.length);
  const ix = d.x - d.nx * 1.4,
    iy = d.y - d.ny * 1.4;
  let reached = 0;
  for (const s of shelves) {
    const p = LLPLAN.pfad(G, ix, iy, s.x, s.y);
    if (p) {
      reached++;
      for (let k = 1; k < p.length; k++) assert.ok(LLPLAN.sicht(G, p[k - 1][0], p[k - 1][1], p[k][0], p[k][1]) || k === 1);
    }
  }
  assert.ok(reached / shelves.length > 0.9, 'shelves reached ' + reached + ' of ' + shelves.length);
  const kassen = Pl.spots.filter(s => s.k === 'kasse'),
    zahlen = Pl.spots.filter(s => s.k === 'zahlen'),
    an = Pl.spots.filter(s => s.k === 'anstellen');
  assert.equal(zahlen.length, kassen.length);
  assert.equal(an.length, kassen.length);
  for (const z of zahlen) {
    assert.ok(LLPLAN.frei(G, z.x, z.y) || LLPLAN.nahFrei(G, z.x, z.y, 0.45), 'pay place free');
    assert.ok(LLPLAN.pfad(G, ix, iy, z.x, z.y), 'a way to the pay place');
  }
  // the queue starts on the store's side: farther from the door than the pay place
  for (let i = 0; i < an.length; i++) {
    const z = zahlen[i],
      a = an[i];
    assert.ok(Math.hypot(a.x - d.x, a.y - d.y) > Math.hypot(z.x - d.x, z.y - d.y) - 0.5, 'queue on the store side');
  }
});

test('the wallet: free play keeps its own cents; the Grenzland mode pays in whole euros and keeps the change', async () => {
  const m = new Map();
  globalThis.window = {
    localStorage: { getItem: k => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: k => m.delete(k) },
  };
  const { GELD } = await import('../../src/einkauf/geld.js?t=' + Date.now());
  assert.equal(GELD.stand(), 15000);
  assert.equal(GELD.zahlen(347, 'Test'), true);
  assert.equal(GELD.stand(), 14653);
  assert.equal(GELD.zahlen(999999, 'zu viel'), false);
  assert.equal(GELD.verdienen(1250, 'Bretter'), 1250);
  assert.equal(GELD.text(), '159,03 €');
  assert.ok(JSON.parse(m.get('pav-geld-v1')).cent === 15903, 'saved');
  // the mode: GL.geld in euros
  const G = {
    on: true,
    geld: 10,
    pay(n) {
      if (n > this.geld) return false;
      this.geld -= n;
      return true;
    },
    earn(n) {
      this.geld += n;
      return n;
    },
  };
  globalThis.window.GLSTATE = G;
  assert.equal(GELD.modus(), 'grenzland');
  assert.equal(GELD.stand(), 1000);
  assert.equal(GELD.zahlen(347), true);
  assert.equal(G.geld, 6);
  assert.equal(GELD.klein, 53);
  assert.equal(GELD.stand(), 653);
  assert.equal(GELD.zahlen(53), true);
  assert.equal(G.geld, 6);
  assert.equal(GELD.klein, 0);
  GELD.verdienen(250);
  assert.equal(G.geld, 8);
  assert.equal(GELD.klein, 50);
  assert.equal(GELD.zahlen(5000), false);
  G.on = false;
  assert.equal(GELD.stand(), 15903, 'free play keeps its own wallet');
});
