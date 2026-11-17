// Unit tests of the vegetation's species table (viz3/src/bewuchs/bw_arten.js, feat/bewuchs-pflanzen) and its flower atlas
// (viz3/extra/bewuchs-pflanzen/dist/bewuchs/blumen.png + blumen.json) without a browser: every field present with sane ranges and units,
// the calendars are day-of-year windows inside 1–366 in order, every atlas cell a species names exists and shows that species' frame,
// every class id 0–17 of the area maps has an entry, the grass shares sum to 1, the sources exist.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { BWARTEN as B } from '../../src/bewuchs/bw_arten.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.join(HERE, '../../extra/bewuchs-pflanzen/dist/bewuchs');
const ATLAS = JSON.parse(fs.readFileSync(path.join(DIST, 'blumen.json'), 'utf8'));
const CELL = new Map(ATLAS.zellen.map(e => [e.zelle.join(','), e]));
const HEX = /^#[0-9a-f]{6}$/;
const isNum = v => typeof v === 'number' && Number.isFinite(v);
const range = (v, lo, hi, what) => {
  assert.ok(Array.isArray(v) && v.length === 2 && isNum(v[0]) && isNum(v[1]), what + ': [von, bis] erwartet');
  assert.ok(v[0] <= v[1], what + ': von > bis');
  assert.ok(v[0] >= lo && v[1] <= hi, what + ': ' + v + ' außerhalb ' + lo + '…' + hi);
};
const num = (v, lo, hi, what) => assert.ok(isNum(v) && v >= lo && v <= hi, what + ': ' + v + ' außerhalb ' + lo + '…' + hi);
const doy = (v, what) => assert.ok(Number.isInteger(v) && v >= 1 && v <= 366, what + ': Tag des Jahres 1–366, nicht ' + v);
const months = (v, lo, hi, what) => {
  assert.ok(Array.isArray(v) && v.length === 12, what + ': 12 Monatswerte erwartet');
  v.forEach((x, i) => num(x, lo, hi, what + '[' + i + ']'));
};
const sources = (q, what) => {
  assert.ok(Array.isArray(q) && q.length >= 1, what + ': mindestens eine Quelle');
  for (const k of q) assert.ok(B.quellen[k], what + ': unbekannte Quelle ' + k);
};
// the class ids of the area maps (docs/plans/auftraege/bewuchs-daten.md)
const KLASSEN = [
  'nichts',
  'zierrasen',
  'oeffentlich',
  'bankett',
  'maehwiese',
  'weide',
  'streuobst',
  'saum',
  'ufer',
  'acker',
  'ackerrand',
  'waldboden',
  'gebuesch',
  'beet',
  'gemuese',
  'verkehrsgruen',
  'friedhof',
  'sportrasen',
];
const FRAMES = ['knospe', 'bluete', 'frucht', 'samen', 'blatt'];

test('the table: version, parts, sources', () => {
  assert.equal(B.v, 1);
  for (const k of ['gras', 'blumen', 'flaechen', 'atlas', 'farbjahr', 'quellen']) assert.ok(B[k] && typeof B[k] === 'object', k);
  assert.ok(Object.keys(B.gras).length >= 15, 'grasses ' + Object.keys(B.gras).length);
  assert.ok(Object.keys(B.blumen).length >= 25, 'flowers ' + Object.keys(B.blumen).length);
  for (const [k, q] of Object.entries(B.quellen)) {
    assert.ok(Array.isArray(q) && q.length === 2 && typeof q[0] === 'string' && q[0].length > 5, 'Quelle ' + k);
    assert.ok(q[1] === null || /^https:\/\/\S+$/.test(q[1]), 'Quelle ' + k + ': Link https://… oder null');
  }
  // every source is used somewhere
  const used = new Set();
  for (const part of [B.gras, B.blumen, B.flaechen]) for (const e of Object.values(part)) for (const k of e.quellen) used.add(k);
  for (const k of Object.keys(B.quellen)) assert.ok(used.has(k), 'Quelle nicht benutzt: ' + k);
});

test('grasses: blades, colours by season, seed heads with their atlas cells', () => {
  for (const [id, g] of Object.entries(B.gras)) {
    const at = 'gras.' + id;
    assert.match(id, /^[a-z_]+$/, at);
    assert.ok(typeof g.name === 'string' && g.name.length > 2 && typeof g.latein === 'string', at + ' name/latein');
    range(g.halm_m, 0.01, 3, at + '.halm_m');
    range(g.breite_mm, 0.2, 40, at + '.breite_mm');
    num(g.biegung, 0, 1, at + '.biegung');
    num(g.glanz, 0, 1, at + '.glanz');
    assert.ok(['horst', 'locker', 'rasen'].includes(g.wuchs), at + '.wuchs');
    for (const s of ['frisch', 'sommer', 'trocken', 'herbst', 'winter']) assert.match(g.farbe[s], HEX, at + '.farbe.' + s);
    const a = g.aehre;
    assert.ok(['rispe', 'aehre', 'aehrenrispe', 'knaeuel', 'busch', 'aehrchen'].includes(a.form), at + '.aehre.form');
    doy(a.von, at + '.aehre.von');
    doy(a.bis, at + '.aehre.bis');
    doy(a.reif_bis, at + '.aehre.reif_bis');
    assert.ok(a.von <= a.bis && a.bis <= a.reif_bis, at + '.aehre: von ≤ bis ≤ reif_bis');
    range(a.ueber_m, 0, 1.5, at + '.aehre.ueber_m');
    num(a.anteil, 0, 1, at + '.aehre.anteil');
    assert.match(a.farbe, HEX, at + '.aehre.farbe');
    assert.match(a.reif_farbe, HEX, at + '.aehre.reif_farbe');
    for (const k of ['zelle', 'reif_zelle']) {
      const c = CELL.get(String(a[k]));
      assert.ok(c, at + '.aehre.' + k + ' ' + a[k] + ' fehlt im Atlas');
      assert.ok(c.arten.includes(id), at + ': Zelle ' + c.id + ' nennt die Art nicht');
      assert.ok(k === 'zelle' ? c.bild === 'aehre' : ['aehre', 'reif'].includes(c.bild), at + '.aehre.' + k + ': Bild ' + c.bild);
      assert.ok(c.toenen, at + ': Grasähren sind zum Tönen gezeichnet');
    }
    sources(g.quellen, at);
  }
});

test('flowers: heights, frames in the atlas, the year as ordered day windows', () => {
  for (const [id, f] of Object.entries(B.blumen)) {
    const at = 'blumen.' + id;
    assert.match(id, /^[a-z_]+$/, at);
    assert.ok(typeof f.name === 'string' && f.name.length > 2 && typeof f.latein === 'string', at + ' name/latein');
    range(f.hoehe_m, 0.01, 3, at + '.hoehe_m');
    assert.match(f.farbe, HEX, at + '.farbe');
    if (f.farbe_samen !== undefined) assert.match(f.farbe_samen, HEX, at + '.farbe_samen');
    const frames = Object.keys(f.bilder);
    assert.ok(frames.length >= 1, at + ': mindestens ein Bild');
    for (const [fr, b] of Object.entries(f.bilder)) {
      assert.ok(FRAMES.includes(fr), at + '.bilder.' + fr + ': unbekanntes Bild');
      num(b.hoehe, 0.05, 1.5, at + '.bilder.' + fr + '.hoehe');
      const c = CELL.get(String(b.zelle));
      assert.ok(c, at + '.bilder.' + fr + ': Zelle ' + b.zelle + ' fehlt im Atlas');
      assert.ok(c.arten.includes(id), at + '.bilder.' + fr + ': Zelle ' + c.id + ' nennt die Art nicht');
      assert.equal(c.bild, fr, at + '.bilder.' + fr + ': die Zelle zeigt ' + c.bild);
    }
    assert.ok(Array.isArray(f.jahr) && f.jahr.length >= 1, at + '.jahr');
    let last = 0;
    const seen = new Set();
    for (const w of f.jahr) {
      assert.ok(Array.isArray(w) && (w.length === 3 || w.length === 4), at + '.jahr: [Bild, von, bis(, Anteil)]');
      const [fr, a, b, share = 1] = w;
      assert.ok(frames.includes(fr), at + '.jahr: Bild ' + fr + ' ohne Zelle');
      doy(a, at + '.jahr ' + fr);
      doy(b, at + '.jahr ' + fr);
      assert.ok(a <= b, at + '.jahr ' + fr + ': von > bis');
      assert.ok(a > last, at + '.jahr: Fenster ' + w + ' überlappt oder ist nicht in Reihenfolge');
      last = b;
      num(share, 0.01, 1, at + '.jahr ' + fr + ' Anteil');
      seen.add(fr);
    }
    for (const fr of frames) assert.ok(seen.has(fr), at + ': Bild ' + fr + ' kommt im Jahr nicht vor');
    num(f.streuung_tage, 0, 30, at + '.streuung_tage');
    months(f.wuchs, 0, 1, at + '.wuchs');
    for (const k of ['nach_schnitt_tage', 'blatt_tage'])
      assert.ok(f[k] === null || (Number.isInteger(f[k]) && f[k] >= 0 && f[k] <= 120), at + '.' + k);
    assert.ok(f.nachbluete_bis === null || (Number.isInteger(f.nachbluete_bis) && f.nachbluete_bis <= 366), at + '.nachbluete_bis');
    assert.ok((f.nach_schnitt_tage === null) === (f.nachbluete_bis === null), at + ': nach_schnitt_tage und nachbluete_bis');
    if (f.offen_h) range(f.offen_h, 0, 24, at + '.offen_h');
    for (const k of ['verfaerbung', 'beeren'])
      if (f[k]) {
        doy(f[k].von, at + '.' + k + '.von');
        doy(f[k].bis, at + '.' + k + '.bis');
        assert.ok(f[k].von <= f[k].bis, at + '.' + k);
        assert.match(f[k].farbe, HEX, at + '.' + k + '.farbe');
      }
    sources(f.quellen, at);
  }
});

test('kinds of area: one entry per class id 0–17 with mix, height, care, colour shifts', () => {
  assert.deepEqual(
    Object.keys(B.flaechen).map(Number),
    KLASSEN.map((_, i) => i)
  );
  for (const [k, e] of Object.entries(B.flaechen)) {
    const at = 'flaechen[' + k + ']';
    assert.equal(e.name, KLASSEN[+k], at + '.name');
    num(e.dichte, 0, 1, at + '.dichte');
    const shares = Object.entries(e.gras);
    for (const [g, s] of shares) {
      assert.ok(B.gras[g], at + '.gras: unbekanntes Gras ' + g);
      num(s, 0.001, 1, at + '.gras.' + g);
    }
    if (shares.length) {
      const sum = shares.reduce((a, [, s]) => a + s, 0);
      assert.ok(Math.abs(sum - 1) < 1e-6, at + '.gras: Anteile summieren sich zu ' + sum);
    }
    for (const [f, n] of Object.entries(e.blumen)) {
      assert.ok(B.blumen[f], at + '.blumen: unbekannte Blume ' + f);
      num(n, 0.01, 50, at + '.blumen.' + f + ' (Pflanzen je m²)');
    }
    sources(e.quellen, at);
    if (e.dichte === 0) {
      assert.equal(shares.length, 0, at + ': ohne Dichte keine Gräser');
      continue;
    }
    assert.ok(shares.length >= 2, at + ': mindestens zwei Gräser');
    const h = e.hoehe;
    num(h.gemaeht_m, 0.01, 0.5, at + '.hoehe.gemaeht_m');
    num(h.max_m, 0.05, 2, at + '.hoehe.max_m');
    assert.ok(h.gemaeht_m <= h.max_m, at + '.hoehe: gemäht > max');
    months(h.wachstum_cm_tag, 0, 5, at + '.hoehe.wachstum_cm_tag');
    num(h.winter, 0, 1, at + '.hoehe.winter');
    const p = e.pflege;
    assert.ok(['rasen', 'schnitt', 'weide', 'keine'].includes(p.art), at + '.pflege.art');
    if (p.art === 'rasen') {
      doy(p.von, at + '.pflege.von');
      doy(p.bis, at + '.pflege.bis');
      assert.ok(p.von < p.bis, at + '.pflege von/bis');
      months(p.alle_tage, 0, 60, at + '.pflege.alle_tage');
      num(p.streuung_tage, 0, 14, at + '.pflege.streuung_tage');
    }
    const cuts = list => {
      let d = 0;
      for (const s of list) {
        doy(s.doy, at + '.pflege.schnitte');
        assert.ok(s.doy > d, at + '.pflege.schnitte in Reihenfolge');
        d = s.doy;
        num(s.streuung_tage, 0, 40, at + '.pflege.schnitte.streuung_tage');
        num(s.anteil, 0.01, 1, at + '.pflege.schnitte.anteil');
      }
    };
    if (p.art === 'schnitt') {
      assert.ok(p.schnitte.length >= 1, at + '.pflege.schnitte');
      cuts(p.schnitte);
      if (p.rand) {
        num(p.rand.breite_m, 0.2, 3, at + '.pflege.rand.breite_m');
        cuts(p.rand.schnitte);
      }
    }
    if (p.art === 'weide') {
      doy(p.von, at + '.pflege.von');
      doy(p.bis, at + '.pflege.bis');
      range(p.hoehe_m, 0.01, 1, at + '.pflege.hoehe_m');
      num(p.geil.anteil, 0, 1, at + '.pflege.geil.anteil');
      range(p.geil.hoehe_m, 0.01, 1, at + '.pflege.geil.hoehe_m');
      num(p.tritt, 0, 1, at + '.pflege.tritt');
    }
    for (const s of ['duerre', 'schatten']) {
      assert.match(e.farbe[s].ziel, HEX, at + '.farbe.' + s + '.ziel');
      num(e.farbe[s].staerke, 0, 1, at + '.farbe.' + s + '.staerke');
    }
    num(e.kahl.anteil, 0, 1, at + '.kahl.anteil');
    range(e.kahl.flecken_m, 0.01, 10, at + '.kahl.flecken_m');
    assert.match(e.kahl.boden, HEX, at + '.kahl.boden');
    num(e.kahl.moos, 0, 1, at + '.kahl.moos');
    // [factor at vigour 0, factor at vigour 7] – not a range: a rich meadow has fewer flowers than a poor one
    for (const s of ['dichte', 'hoehe', 'blumen']) {
      assert.ok(Array.isArray(e.kraft[s]) && e.kraft[s].length === 2, at + '.kraft.' + s);
      e.kraft[s].forEach(x => num(x, 0, 2, at + '.kraft.' + s));
    }
  }
});

test('the atlas: 64 cells, each used, each named species exists; the picture is 1024² RGBA under 3 MB', () => {
  assert.equal(ATLAS.v, 1);
  assert.equal(ATLAS.groesse_px, 1024);
  assert.equal(ATLAS.zelle_px, 128);
  assert.equal(ATLAS.zellen.length, 64);
  assert.equal(CELL.size, 64, 'Zellen doppelt');
  const used = new Set();
  for (const f of Object.values(B.blumen)) for (const b of Object.values(f.bilder)) used.add(String(b.zelle));
  for (const g of Object.values(B.gras)) used.add(String(g.aehre.zelle)).add(String(g.aehre.reif_zelle));
  for (const e of ATLAS.zellen) {
    const [c, r] = e.zelle;
    assert.ok(c >= 0 && c < 8 && r >= 0 && r < 8, e.id);
    assert.ok(used.has(String(e.zelle)), 'Zelle ' + e.id + ' wird von keiner Art benutzt');
    for (const a of e.arten) assert.ok(B.blumen[a] || B.gras[a], e.id + ': unbekannte Art ' + a);
    num(e.breite, 0.05, 1, e.id + '.breite');
    num(e.oben, 0.5, 1, e.id + '.oben');
    num(e.deckung, 0.01, 1, e.id + '.deckung');
    assert.match(e.farbe, HEX, e.id + '.farbe');
  }
  // most plants fill their cell's height (wide leaf rosettes may stop lower: their width fills the cell)
  assert.ok(ATLAS.zellen.filter(e => e.oben >= 0.93).length >= 56, 'zu viele Zellen füllen ihre Höhe nicht');
  // the PNG header: IHDR width, height, bit depth 8, colour type 6 (RGBA)
  const png = fs.readFileSync(path.join(DIST, 'blumen.png'));
  assert.equal(png.toString('latin1', 12, 16), 'IHDR');
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
  assert.equal(png[24], 8);
  assert.equal(png[25], 6);
  assert.ok(png.length < 3 * 1024 * 1024, 'atlas ' + png.length + ' bytes');
  assert.equal(B.atlas.groesse_px, ATLAS.groesse_px);
  assert.equal(B.atlas.zelle_px, ATLAS.zelle_px);
});

test('the year is plausible: meadow and verge flower from April to October, the colour seasons are ordered', () => {
  const inBloom = (id, d) => B.blumen[id].jahr.some(([fr, a, b]) => fr === 'bluete' && d >= a && d <= b);
  for (const [name, d] of [
    ['April', 115],
    ['Mai', 135],
    ['Juni', 166],
    ['Juli', 196],
    ['August', 227],
    ['September', 258],
    ['Oktober', 278],
  ]) {
    const mix = new Set([...Object.keys(B.flaechen[4].blumen), ...Object.keys(B.flaechen[3].blumen)]);
    const n = [...mix].filter(id => inBloom(id, d)).length;
    assert.ok(n >= 2, name + ': nur ' + n + ' Arten der Wiese und des Banketts blühen');
  }
  // Löwenzahn becomes a Pusteblume in May, Wiesenkerbel whitens the verges in May, Herbstzeitlose in September
  const frameAt = (id, d) => (B.blumen[id].jahr.find(([, a, b]) => d >= a && d <= b) || [null])[0];
  assert.equal(frameAt('loewenzahn', 140), 'samen');
  assert.equal(frameAt('wiesenkerbel', 140), 'bluete');
  assert.equal(frameAt('herbstzeitlose', 260), 'bluete');
  assert.equal(frameAt('margerite', 170), 'bluete');
  let last = 0;
  for (const [d, s] of B.farbjahr) {
    doy(d, 'farbjahr');
    assert.ok(d > last, 'farbjahr in Reihenfolge');
    last = d;
    assert.ok(['frisch', 'sommer', 'herbst', 'winter'].includes(s), 'farbjahr ' + s);
  }
  assert.equal(B.farbjahr[0][0], 1);
  assert.equal(B.farbjahr[B.farbjahr.length - 1][0], 366);
});
