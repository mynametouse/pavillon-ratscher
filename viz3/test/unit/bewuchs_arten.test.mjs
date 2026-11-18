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
const num = (v, lo, hi, what) =>
  assert.ok(isNum(v) && v >= lo && v <= hi, what + ': ' + v + ' außerhalb ' + lo + '…' + hi);
const doy = (v, what) =>
  assert.ok(Number.isInteger(v) && v >= 1 && v <= 366, what + ': Tag des Jahres 1–366, nicht ' + v);
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
  for (const k of ['gras', 'blumen', 'flaechen', 'atlas', 'farbjahr', 'quellen'])
    assert.ok(B[k] && typeof B[k] === 'object', k);
  assert.ok(Object.keys(B.gras).length >= 15, 'grasses ' + Object.keys(B.gras).length);
  assert.ok(Object.keys(B.blumen).length >= 25, 'flowers ' + Object.keys(B.blumen).length);
  for (const [k, q] of Object.entries(B.quellen)) {
    assert.ok(Array.isArray(q) && q.length === 2 && typeof q[0] === 'string' && q[0].length > 5, 'Quelle ' + k);
    assert.ok(q[1] === null || /^https:\/\/\S+$/.test(q[1]), 'Quelle ' + k + ': Link https://… oder null');
  }
  // every source is used somewhere
  const used = new Set();
  for (const part of [
    B.gras,
    B.blumen,
    B.flaechen,
    B.straeucher,
    B.beet,
    B.beetvorlagen,
    B.feldfruechte,
    { z: B.zwischenfrucht },
  ])
    for (const e of Object.values(part)) for (const k of e.quellen) used.add(k);
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
    for (const s of ['frisch', 'sommer', 'trocken', 'herbst', 'winter'])
      assert.match(g.farbe[s], HEX, at + '.farbe.' + s);
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
      assert.ok(
        k === 'zelle' ? c.bild === 'aehre' : ['aehre', 'reif'].includes(c.bild),
        at + '.aehre.' + k + ': Bild ' + c.bild
      );
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
    assert.ok(
      f.nachbluete_bis === null || (Number.isInteger(f.nachbluete_bis) && f.nachbluete_bis <= 366),
      at + '.nachbluete_bis'
    );
    assert.ok(
      (f.nach_schnitt_tage === null) === (f.nachbluete_bis === null),
      at + ': nach_schnitt_tage und nachbluete_bis'
    );
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

// the EZ-Tree presets the app has (viz3/src/eztree/presets/index.js) and the option paths a bush may change
const PRESETS = [
  ...fs.readFileSync(path.join(HERE, '../../src/eztree/presets/index.js'), 'utf8').matchAll(/^\s+'([^']+)': \w+,$/gm),
].map(m => m[1]);
const MOD_PATH =
  /^(branch\.(levels|force\.strength|(angle|children|gnarliness|length|radius|sections|segments|start|taper|twist)\.[0-3])|leaves\.(type|count|size|angle|start|sizeVariance|billboard|tint)|bark\.(type|tint|textured))$/;
const LEAF_TYPES = ['ash', 'aspen', 'oak', 'pine'];
const BARK_TYPES = ['oak', 'birch', 'pine', 'willow'];
const win = (v, what) => {
  assert.ok(Array.isArray(v) && v.length === 2, what + ': [von, bis] erwartet');
  doy(v[0], what);
  doy(v[1], what);
  assert.ok(v[0] <= v[1], what + ': von > bis');
};

test('bushes: size, form, places, EZ-Tree preset and changes, leaves, bloom and fruit as day windows, care', () => {
  assert.ok(B.straeucher && Object.keys(B.straeucher).length >= 30, 'mindestens 30 Sträucher');
  assert.ok(PRESETS.includes('Bush 1') && PRESETS.length >= 10, 'presets ' + PRESETS);
  assert.ok(Array.isArray(B.lagen) && B.lagen.length >= 10, 'lagen');
  const n = { wild: 0, garten: 0 };
  for (const [id, b] of Object.entries(B.straeucher)) {
    const at = 'straeucher.' + id;
    assert.match(id, /^[a-z_]+$/, at);
    assert.ok(typeof b.name === 'string' && b.name.length > 2 && typeof b.latein === 'string', at + ' name/latein');
    assert.ok(['wild', 'garten'].includes(b.gruppe), at + '.gruppe');
    n[b.gruppe]++;
    assert.ok(Array.isArray(b.wo) && b.wo.length >= 1, at + '.wo');
    for (const w of b.wo) assert.ok(KLASSEN.includes(w) && w !== 'nichts', at + '.wo ' + w);
    assert.ok(Array.isArray(b.lage) && b.lage.length >= 1, at + '.lage');
    for (const l of b.lage) assert.ok(B.lagen.includes(l), at + '.lage ' + l);
    range(b.hoehe_m, 0.1, 10, at + '.hoehe_m');
    range(b.breite_m, 0.1, 8, at + '.breite_m');
    const FORMS = [
      'aufrecht',
      'rund',
      'breit',
      'ueberhaengend',
      'dickicht',
      'ranken',
      'ruten',
      'kugel',
      'saeule',
      'hecke',
    ];
    assert.ok(FORMS.includes(b.form), at + '.form');
    num(b.dichte, 0, 1, at + '.dichte');
    assert.equal(typeof b.dornen, 'boolean', at + '.dornen');
    num(b.fest_ab_m, 0, 2, at + '.fest_ab_m');
    assert.equal(typeof b.geschnitten, 'boolean', at + '.geschnitten');
    assert.ok(
      Number.isInteger(b.streuung_tage) && b.streuung_tage >= 0 && b.streuung_tage <= 20,
      at + '.streuung_tage'
    );
    if (b.geschnitten) {
      assert.ok(['kugel', 'saeule', 'hecke'].includes(b.form), at + ': geschnitten, aber form ' + b.form);
      assert.ok(
        b.schnitt && ['kugel', 'hecke'].includes(b.schnitt.art),
        at + ': geschnitten braucht schnitt kugel/hecke'
      );
    }
    assert.ok(PRESETS.includes(b.eztree.preset), at + '.eztree.preset ' + b.eztree.preset);
    assert.ok(Number.isInteger(b.eztree.seed), at + '.eztree.seed');
    for (const [k, v] of Object.entries(b.eztree.mod)) {
      assert.match(k, MOD_PATH, at + '.eztree.mod ' + k);
      if (k === 'leaves.type') assert.ok(LEAF_TYPES.includes(v), at + '.eztree.mod ' + k + ' = ' + v);
      else if (k === 'bark.type') assert.ok(BARK_TYPES.includes(v), at + '.eztree.mod ' + k + ' = ' + v);
      else assert.ok(isNum(v), at + '.eztree.mod ' + k + ' = ' + v);
    }
    const seeds = Object.values(B.straeucher).filter(o => o.eztree.seed === b.eztree.seed);
    assert.equal(seeds.length, 1, at + ': Samen ' + b.eztree.seed + ' doppelt');
    const L = b.laub;
    assert.ok(['sommergruen', 'halbimmergruen', 'immergruen', 'trockenlaub'].includes(L.typ), at + '.laub.typ');
    for (const k of ['farbe', 'austrieb_farbe']) assert.match(L[k], HEX, at + '.laub.' + k);
    win(L.austrieb, at + '.laub.austrieb');
    if (L.typ !== 'sommergruen') assert.match(L.winter_farbe, HEX, at + '.laub.winter_farbe');
    if (L.typ !== 'immergruen') {
      assert.match(L.herbst_farbe, HEX, at + '.laub.herbst_farbe');
      win(L.herbst, at + '.laub.herbst');
      win(L.fall, at + '.laub.fall');
      assert.ok(L.austrieb[1] < L.herbst[0], at + '.laub: Herbst nach dem Austrieb');
      if (L.typ === 'trockenlaub')
        assert.ok(L.fall[1] <= L.austrieb[1] + 10, at + '.laub: das trockene Laub fällt beim Austrieb');
      else assert.ok(L.herbst[0] <= L.fall[0] && L.herbst[1] <= L.fall[1], at + '.laub: Herbst, dann Fall');
    }
    if (b.bluete) {
      const f = b.bluete;
      win([f.von, f.bis], at + '.bluete');
      assert.match(f.farbe, HEX, at + '.bluete.farbe');
      if (f.farben) f.farben.forEach(c => assert.match(c, HEX, at + '.bluete.farben'));
      if (f.farben) assert.equal(f.farben[0], f.farbe, at + ': farben[0] ist farbe');
      assert.ok(['dolde', 'rispe', 'traube', 'einzeln', 'kaetzchen', 'ball'].includes(f.form), at + '.bluete.form');
      num(f.groesse_m, 0.005, 0.5, at + '.bluete.groesse_m');
      num(f.menge, 0.05, 1, at + '.bluete.menge');
      assert.equal(typeof f.vor_laub, 'boolean', at + '.bluete.vor_laub');
      if (f.vor_laub) assert.ok(f.von < L.austrieb[1], at + ': blüht vor dem Laub, aber erst nach dem Austrieb');
    } else assert.equal(b.bluete, null, at + '.bluete');
    if (b.frucht) {
      const f = b.frucht;
      if (f.gruen !== null) win(f.gruen, at + '.frucht.gruen');
      assert.ok(Array.isArray(f.reif) && f.reif.length >= 1 && f.reif.length <= 2, at + '.frucht.reif');
      f.reif.forEach(r => win(r, at + '.frucht.reif'));
      if (f.reif.length === 2)
        assert.ok(f.reif[0][1] === 366 && f.reif[1][0] === 1, at + ': über Neujahr [a, 366], [1, b]');
      assert.equal(
        f.winter,
        f.reif.some(r => r[0] === 1),
        at + '.frucht.winter: hängt am 1. Januar'
      );
      for (const k of ['farbe', 'farbe_gruen']) assert.match(f[k], HEX, at + '.frucht.' + k);
      assert.ok(['dolde', 'rispe', 'traube', 'einzeln', 'sammel', 'ball'].includes(f.form), at + '.frucht.form');
      num(f.groesse_m, 0.005, 0.5, at + '.frucht.groesse_m');
      num(f.menge, 0.05, 1, at + '.frucht.menge');
      assert.ok(['ja', 'gekocht', 'nein'].includes(f.essbar), at + '.frucht.essbar');
      if (b.bluete && f.gruen) assert.ok(b.bluete.von < f.gruen[0], at + ': die Frucht folgt der Blüte');
      if (f.gruen) assert.ok(f.gruen[1] < f.reif[0][0], at + ': grün vor reif');
    } else assert.equal(b.frucht, null, at + '.frucht');
    if (b.schnitt) {
      assert.ok(['kugel', 'hecke', 'auslichten', 'rueckschnitt'].includes(b.schnitt.art), at + '.schnitt.art');
      assert.ok(Array.isArray(b.schnitt.doy) && b.schnitt.doy.length >= 1, at + '.schnitt.doy');
      b.schnitt.doy.forEach(d => doy(d, at + '.schnitt.doy'));
    } else assert.equal(b.schnitt, null, at + '.schnitt');
    if (b.rinde_winter !== undefined) assert.match(b.rinde_winter, HEX, at + '.rinde_winter');
    if (b.zuensler !== undefined) num(b.zuensler, 0, 1, at + '.zuensler');
    sources(b.quellen, at);
  }
  assert.ok(n.wild >= 12 && n.garten >= 15, 'wild ' + n.wild + ', Garten ' + n.garten);
  // the plan's list is there
  for (const id of ['holunder', 'weissdorn', 'schlehe', 'hundsrose', 'hasel', 'brombeere', 'himbeere', 'hartriegel'])
    assert.ok(B.straeucher[id], 'fehlt: ' + id);
  for (const id of [
    'pfaffenhuetchen',
    'salweide',
    'johannisbeere',
    'stachelbeere',
    'flieder',
    'forsythie',
    'hortensie',
  ])
    assert.ok(B.straeucher[id], 'fehlt: ' + id);
  for (const id of ['sommerflieder', 'buchs', 'thuja']) assert.ok(B.straeucher[id], 'fehlt: ' + id);
  // what the plan's season table promises
  const inWin = (w, d) => w && d >= w[0] && d <= w[1];
  const S = B.straeucher;
  const blooms = (id, d) => S[id].bluete && inWin([S[id].bluete.von, S[id].bluete.bis], d);
  const ripe = (id, d) => S[id].frucht && S[id].frucht.reif.some(r => inWin(r, d));
  assert.ok(
    blooms('hasel', 70) && blooms('salweide', 90) && blooms('kornelkirsche', 90),
    'März: Hasel, Salweide, Kornelkirsche'
  );
  assert.ok(blooms('schlehe', 118) && blooms('forsythie', 105), 'April: Schlehe und Forsythie');
  assert.ok(blooms('weissdorn', 145) && blooms('flieder', 145), 'Mai: Weißdorn, Flieder');
  assert.ok(blooms('holunder', 160) && blooms('hundsrose', 170), 'Juni: Holunder, Hundsrose');
  assert.ok(ripe('johannisbeere', 195) && ripe('stachelbeere', 195) && ripe('himbeere', 195), 'Juli: Beeren');
  assert.ok(ripe('brombeere', 230), 'August: Brombeeren');
  assert.ok(
    ripe('holunder', 260) && ripe('hundsrose', 270) && ripe('weissdorn', 270),
    'September: Holunder, Hagebutten'
  );
  assert.ok(ripe('hundsrose', 20) && ripe('schlehe', 20), 'Winter: Hagebutten und Schlehen hängen');
  // in January the deciduous are bare, the evergreen green, the hornbeam hedge brown
  for (const [id, b] of Object.entries(S)) {
    const L = b.laub;
    if (L.typ === 'sommergruen') assert.ok(L.fall[1] < 366 && L.austrieb[0] > 15, id + ': im Januar kahl');
  }
  assert.equal(S.hainbuche.laub.typ, 'trockenlaub');
});

test('bushes on the kinds of area: mixes of existing bushes that grow there, shares sum to 1', () => {
  const seen = new Set();
  for (const [k, f] of Object.entries(B.flaechen)) {
    if (!f.straeucher) continue;
    const at = 'flaechen.' + k + '.straeucher';
    const s = f.straeucher;
    num(s.je_100m2, 0.01, 30, at + '.je_100m2');
    assert.ok(['flaeche', 'gruppen', 'einzeln', 'rand'].includes(s.verteilung), at + '.verteilung');
    let sum = 0;
    for (const [id, x] of Object.entries(s.arten)) {
      const b = B.straeucher[id];
      assert.ok(b, at + ': unbekannter Strauch ' + id);
      assert.ok(b.wo.includes(f.name), at + ': ' + id + ' wächst laut wo nicht auf ' + f.name);
      num(x, 0.005, 1, at + '.' + id);
      sum += x;
      seen.add(id);
    }
    assert.ok(Math.abs(sum - 1) < 0.005, at + ': Summe ' + sum);
  }
  for (const id of Object.keys(B.straeucher)) assert.ok(seen.has(id), 'Strauch ' + id + ' steht auf keiner Fläche');
  // where bushes must be and must not be
  assert.ok(B.flaechen[12].straeucher.je_100m2 >= 5, 'Gebüsch ist dicht');
  for (const k of [0, 3, 4, 9, 10, 17])
    assert.ok(!B.flaechen[k].straeucher, 'keine Sträucher auf ' + B.flaechen[k].name);
});

// the second atlas (bed plants)
const ATLAS2 = JSON.parse(fs.readFileSync(path.join(DIST, 'beete.json'), 'utf8'));
const CELL2 = new Map(ATLAS2.zellen.map(e => [e.zelle.join(','), e]));
const BEET_FRAMES = ['knospe', 'bluete', 'frucht', 'samen', 'blatt', 'jung', 'reif', 'welk'];

test('bed plants: groups, heights, colours, frames in the second atlas, the year as ordered day windows', () => {
  assert.ok(B.beet && Object.keys(B.beet).length >= 40, 'mindestens 40 Beetpflanzen');
  const groups = {};
  for (const [id, f] of Object.entries(B.beet)) {
    const at = 'beet.' + id;
    assert.match(id, /^[a-z_]+$/, at);
    assert.ok(!B.blumen[id] && !B.straeucher[id], at + ': Name schon vergeben');
    assert.ok(typeof f.name === 'string' && f.name.length > 2 && typeof f.latein === 'string', at + ' name/latein');
    const G = ['wechselflor', 'staude', 'ziergras', 'rose', 'bodendecker', 'grab', 'gemuese'];
    assert.ok(G.includes(f.gruppe), at + '.gruppe ' + f.gruppe);
    groups[f.gruppe] = (groups[f.gruppe] || 0) + 1;
    if (f.gruppe === 'wechselflor') assert.ok(['fruehjahr', 'sommer', 'herbst'].includes(f.saison), at + '.saison');
    range(f.hoehe_m, 0.02, 3, at + '.hoehe_m');
    num(f.abstand_m, 0.03, 1.5, at + '.abstand_m');
    assert.match(f.farbe, HEX, at + '.farbe');
    if (f.farben) {
      f.farben.forEach(c => assert.match(c, HEX, at + '.farben'));
      assert.equal(f.farben[0], f.farbe, at + ': farben[0] ist farbe');
    }
    if (f.farbe_samen) assert.match(f.farbe_samen, HEX, at + '.farbe_samen');
    if (f.farbe_bluete) assert.match(f.farbe_bluete, HEX, at + '.farbe_bluete');
    const frames = Object.keys(f.bilder);
    assert.ok(frames.length >= 1, at + '.bilder');
    const shows = (c, fr) => c.bild === fr || (c.auch || []).includes(fr);
    for (const [fr, b] of Object.entries(f.bilder)) {
      assert.ok(BEET_FRAMES.includes(fr), at + '.bilder.' + fr);
      num(b.hoehe, 0.2, 1, at + '.bilder.' + fr + '.hoehe');
      const c = CELL2.get(String(b.zelle));
      assert.ok(c, at + '.bilder.' + fr + ': Zelle ' + b.zelle + ' fehlt in beete.json');
      assert.ok(c.arten.includes(id), at + ': Zelle ' + c.id + ' nennt die Art nicht');
      assert.ok(
        shows(c, fr) || (fr === 'blatt' && c.bild !== 'blatt' && f.bilder.bluete),
        at + ': Zelle ' + c.id + ' zeigt nicht ' + fr
      );
    }
    for (const [fr, cells] of Object.entries(f.bilder_varianten || {})) {
      assert.ok(f.bilder[fr], at + '.bilder_varianten.' + fr);
      for (const z of cells) {
        const c = CELL2.get(String(z));
        assert.ok(c && c.arten.includes(id) && shows(c, fr), at + '.bilder_varianten ' + z);
      }
    }
    assert.ok(Array.isArray(f.jahr) && f.jahr.length >= 1, at + '.jahr');
    let last = 0;
    for (const ph of f.jahr) {
      const [fr, a, e, share] = ph;
      assert.ok(f.bilder[fr], at + '.jahr: Bild ' + fr + ' fehlt in bilder');
      doy(a, at + '.jahr ' + fr);
      doy(e, at + '.jahr ' + fr);
      assert.ok(
        a <= e && a > last,
        at + '.jahr: Fenster in Reihenfolge, ohne Überlappung (' + fr + ' ' + a + '–' + e + ')'
      );
      last = e;
      if (share !== undefined) num(share, 0.05, 1, at + '.jahr Anteil');
    }
    assert.ok(
      Number.isInteger(f.streuung_tage) && f.streuung_tage >= 0 && f.streuung_tage <= 20,
      at + '.streuung_tage'
    );
    months(f.wuchs, 0, 1, at + '.wuchs');
    sources(f.quellen, at);
  }
  for (const g of ['wechselflor', 'staude', 'ziergras', 'rose', 'bodendecker', 'grab', 'gemuese'])
    assert.ok(groups[g] >= 2, 'Gruppe ' + g + ': ' + (groups[g] || 0));
  for (const s of ['fruehjahr', 'sommer', 'herbst'])
    assert.ok(Object.values(B.beet).filter(f => f.saison === s).length >= 2, 'Wechselflor ' + s);
});

test('the second atlas: 64 cells, each used by a bed plant that names it; the picture is 1024² RGBA under 3 MB', () => {
  assert.equal(ATLAS2.v, 1);
  assert.equal(ATLAS2.bild, 'beete.png');
  assert.equal(ATLAS2.groesse_px, 1024);
  assert.equal(ATLAS2.zelle_px, 128);
  assert.equal(ATLAS2.zellen.length, 64);
  assert.equal(CELL2.size, 64, 'Zellen doppelt');
  const used = new Map();
  for (const [id, f] of Object.entries(B.beet)) {
    for (const b of Object.values(f.bilder))
      used.set(String(b.zelle), (used.get(String(b.zelle)) || new Set()).add(id));
    for (const cells of Object.values(f.bilder_varianten || {}))
      for (const z of cells) used.set(String(z), (used.get(String(z)) || new Set()).add(id));
  }
  for (const e of ATLAS2.zellen) {
    const [c, r] = e.zelle;
    assert.ok(c >= 0 && c < 8 && r >= 0 && r < 8, e.id);
    assert.ok(used.has(String(e.zelle)), 'Zelle ' + e.id + ' wird von keiner Beetpflanze benutzt');
    for (const a of e.arten) {
      assert.ok(B.beet[a], e.id + ': unbekannte Art ' + a);
      assert.ok(used.get(String(e.zelle)).has(a), e.id + ': ' + a + ' benutzt die Zelle nicht');
    }
    assert.ok(BEET_FRAMES.includes(e.bild), e.id + '.bild');
    num(e.breite, 0.05, 1, e.id + '.breite');
    num(e.oben, 0.4, 1, e.id + '.oben');
    num(e.deckung, 0.01, 1, e.id + '.deckung');
    assert.match(e.farbe, HEX, e.id + '.farbe');
  }
  const png = fs.readFileSync(path.join(DIST, 'beete.png'));
  assert.equal(png.toString('latin1', 12, 16), 'IHDR');
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
  assert.equal(png[24], 8);
  assert.equal(png[25], 6);
  assert.ok(png.length < 3 * 1024 * 1024, 'atlas ' + png.length + ' bytes');
  assert.equal(B.atlas_beete.bild, 'bewuchs/beete.png');
  assert.equal(B.atlas_beete.groesse_px, ATLAS2.groesse_px);
  assert.equal(B.atlas_beete.zelle_px, ATLAS2.zelle_px);
});

test('bed templates: edge, soil, ordered phases of existing plants that live in them; beds on the kinds of area', () => {
  assert.ok(Object.keys(B.beetvorlagen).length >= 10, 'mindestens 10 Beetvorlagen');
  for (const [k, c] of Object.entries(B.boden)) assert.match(c, HEX, 'boden.' + k);
  for (const k of ['erde', 'rindenmulch', 'kies']) assert.ok(B.boden[k], 'boden.' + k);
  const alive = (id, a, e) => B.beet[id].jahr.some(([, x, y]) => x <= e && y >= a);
  for (const [id, v] of Object.entries(B.beetvorlagen)) {
    const at = 'beetvorlagen.' + id;
    assert.ok(typeof v.name === 'string' && v.name.length > 3, at + '.name');
    for (const w of v.wo) assert.ok(KLASSEN.includes(w), at + '.wo ' + w);
    for (const l of v.lage) assert.ok(B.lagen.includes(l), at + '.lage ' + l);
    assert.ok(['bordstein', 'rasenkante', 'brett', 'pflaster', 'buchs', 'grabstein'].includes(v.rand), at + '.rand');
    assert.ok(B.boden[v.boden], at + '.boden ' + v.boden);
    assert.ok(['reihen', 'gitter', 'frei'].includes(v.raster), at + '.raster');
    if (v.raster === 'reihen') num(v.reihe_m, 0.1, 1.5, at + '.reihe_m');
    num(v.dichte_m2, 0.5, 40, at + '.dichte_m2');
    let last = 0;
    for (const ph of v.phasen) {
      doy(ph.von, at + '.phasen.von');
      doy(ph.bis, at + '.phasen.bis');
      assert.ok(ph.von <= ph.bis && ph.von > last, at + ': Phasen in Reihenfolge (' + ph.von + '–' + ph.bis + ')');
      last = ph.bis;
      if (ph.decke) assert.equal(ph.decke, 'tannengruen', at + '.decke');
      let sum = 0;
      for (const [pid, x] of Object.entries(ph.pflanzen)) {
        assert.ok(B.beet[pid], at + ': unbekannte Pflanze ' + pid);
        num(x, 0.01, 1, at + '.' + pid);
        sum += x;
        assert.ok(alive(pid, ph.von, ph.bis), at + ': ' + pid + ' zeigt sich in ' + ph.von + '–' + ph.bis + ' nie');
      }
      if (ph.decke) assert.ok(sum <= 1.005, at + ': Summe ' + sum);
      else assert.ok(Math.abs(sum - 1) < 0.005, at + ': Summe ' + sum + ' (ohne Decke = 1)');
    }
    sources(v.quellen, at);
  }
  // every bed plant is in some template
  const inTpl = new Set();
  for (const v of Object.values(B.beetvorlagen))
    for (const ph of v.phasen) for (const k of Object.keys(ph.pflanzen)) inTpl.add(k);
  for (const k of Object.keys(B.beet))
    assert.ok(inTpl.has(k) || k === 'tannengruen', 'Beetpflanze ' + k + ' in keiner Vorlage');
  // the beds of the kinds of area
  for (const k of [13, 14, 15, 16]) {
    const m = B.flaechen[k].beete;
    assert.ok(m, 'flaechen.' + k + '.beete');
    let sum = 0;
    for (const [id, x] of Object.entries(m)) {
      assert.ok(B.beetvorlagen[id], 'flaechen.' + k + '.beete: unbekannte Vorlage ' + id);
      assert.ok(B.beetvorlagen[id].wo.includes(B.flaechen[k].name), id + ' gehört nicht auf ' + B.flaechen[k].name);
      sum += x;
    }
    assert.ok(Math.abs(sum - 1) < 0.005, 'flaechen.' + k + '.beete: Summe ' + sum);
  }
  // the year of a public bed: tulips in May, geraniums in July, heather in October, fir branches in January
  const W = B.beetvorlagen.wechselflor;
  const phase = d => W.phasen.find(ph => d >= ph.von && d <= ph.bis);
  const frame = (id, d) => (B.beet[id].jahr.find(([, a, b]) => d >= a && d <= b) || [null])[0];
  assert.ok(phase(120).pflanzen.tulpe && frame('tulpe', 120) === 'bluete', 'Mai: Tulpen');
  assert.ok(phase(195).pflanzen.geranie && frame('geranie', 195) === 'bluete', 'Juli: Geranien');
  assert.ok(phase(295).pflanzen.heide && frame('heide', 295) === 'bluete', 'Oktober: Heide');
  assert.equal(phase(15).decke, 'tannengruen', 'Januar: Tannengrün');
  assert.equal(frame('kartoffel', 190), 'bluete', 'Juli: Kartoffeln blühen');
  assert.equal(frame('salat', 150), 'reif');
});

// the third atlas (field crops)
const ATLAS3 = JSON.parse(fs.readFileSync(path.join(DIST, 'acker.json'), 'utf8'));
const CELL3 = new Map(ATLAS3.zellen.map(e => [e.zelle.join(','), e]));
const PHASE_NAMES = [
  'pflugacker',
  'saatbett',
  'saat',
  'auflaufen',
  'bestockung',
  'rosette',
  'winter',
  'schossen',
  'streckung',
  'jugend',
  'knospe',
  'aehre',
  'fahne',
  'bluete',
  'kolben',
  'schoten',
  'milchreife',
  'gelbreife',
  'reife',
  'trocken',
  'bestand',
  'kraut',
  'abreife',
  'krautfrei',
  'herbst',
  'aufwuchs',
  'schnitt',
  'wuchs',
  'frost',
  'mulch',
  'ernte',
  'stoppel',
  'umbruch',
];
// phases: contiguous day windows from 'from' to 'to', each with height, colour and soil
const phases = (list, from, to, what, crop) => {
  assert.ok(Array.isArray(list) && list.length >= 1, what);
  let next = from;
  for (const ph of list) {
    const at = what + ' ' + ph.name;
    assert.ok(PHASE_NAMES.includes(ph.name), at + ': unbekannte Phase');
    doy(ph.von, at);
    doy(ph.bis, at);
    assert.equal(ph.von, next, at + ': Phasen lückenlos (' + ph.von + ' statt ' + next + ')');
    assert.ok(ph.von <= ph.bis, at + ': von > bis');
    next = ph.bis + 1;
    assert.ok(Array.isArray(ph.hoehe_m) && ph.hoehe_m.length === 2, at + '.hoehe_m: [Anfang, Ende]');
    ph.hoehe_m.forEach(h => num(h, 0, 3.5, at + '.hoehe_m')); // may fall within a phase (ripening, frost)
    assert.match(ph.farbe, HEX, at + '.farbe');
    num(ph.boden, 0, 1, at + '.boden');
    if (ph.boden_art !== undefined) assert.ok(B.ackerboden[ph.boden_art], at + '.boden_art ' + ph.boden_art);
    if (ph.bild !== undefined)
      assert.ok(crop.bilder && crop.bilder[ph.bild], at + ': Bild ' + ph.bild + ' fehlt in bilder');
    if (ph.kopf !== undefined) assert.ok(crop.kopf && crop.kopf.zellen[ph.kopf], at + ': Ähre ' + ph.kopf + ' fehlt');
  }
  assert.equal(next - 1, to, what + ': endet am Tag ' + to);
};
const cellOf = (z, id, frame, what) => {
  const c = CELL3.get(String(z));
  assert.ok(c, what + ': Zelle ' + z + ' fehlt in acker.json');
  assert.ok(c.arten.includes(id), what + ': Zelle ' + c.id + ' nennt ' + id + ' nicht');
  assert.ok(c.bild === frame || (c.auch || []).includes(frame), what + ': Zelle ' + c.id + ' zeigt nicht ' + frame);
};

test('field crops: shares, sowing and harvest, contiguous phases with height, colour and soil, stand, ears and cells, rotation', () => {
  const F = B.feldfruechte;
  assert.ok(F && Object.keys(F).length >= 10, 'mindestens 10 Feldfrüchte');
  for (const id of [
    'winterweizen',
    'wintergerste',
    'winterroggen',
    'triticale',
    'winterraps',
    'silomais',
    'sommergerste',
  ])
    assert.ok(F[id], 'fehlt: ' + id);
  for (const id of ['zuckerruebe', 'kartoffel', 'kleegras', 'sonnenblume']) assert.ok(F[id], 'fehlt: ' + id);
  for (const [k, c] of Object.entries(B.ackerboden)) assert.match(c, HEX, 'ackerboden.' + k);
  let sumTh = 0,
    sumHbn = 0;
  for (const [id, f] of Object.entries(F)) {
    const at = 'feldfruechte.' + id;
    assert.match(id, /^[a-z]+$/, at);
    assert.ok(typeof f.name === 'string' && f.name.length > 3 && typeof f.latein === 'string', at + ' name/latein');
    const G = ['wintergetreide', 'sommergetreide', 'raps', 'mais', 'hackfrucht', 'oelfrucht', 'futter'];
    assert.ok(G.includes(f.gruppe), at + '.gruppe');
    num(f.anteil.thueringen, 0, 0.5, at + '.anteil.thueringen');
    num(f.anteil.hildburghausen, 0, 0.5, at + '.anteil.hildburghausen');
    sumTh += f.anteil.thueringen;
    sumHbn += f.anteil.hildburghausen;
    assert.equal(typeof f.winterung, 'boolean', at + '.winterung');
    doy(f.saat.doy, at + '.saat.doy');
    num(f.saat.streuung_tage, 0, 30, at + '.saat.streuung_tage');
    if (f.schnitte) {
      assert.ok(f.schnitte.length >= 2, at + '.schnitte');
      for (const s of f.schnitte) {
        doy(s.doy, at + '.schnitte');
        assert.ok(
          f.jahr.some(ph => ph.name === 'schnitt' && ph.von === s.doy),
          at + ': Schnitt am Tag ' + s.doy + ' ohne Phase'
        );
      }
      for (const [g, x] of Object.entries(f.gras)) assert.ok(B.gras[g] && x > 0, at + '.gras ' + g);
      for (const [b, x] of Object.entries(f.blumen)) assert.ok(B.blumen[b] && x > 0, at + '.blumen ' + b);
    } else {
      doy(f.ernte.doy, at + '.ernte.doy');
      num(f.ernte.streuung_tage, 0, 30, at + '.ernte.streuung_tage');
      assert.ok(['maehdrusch', 'haeckseln', 'roden', 'schnitt'].includes(f.ernte.art), at + '.ernte.art');
      assert.ok(
        f.jahr.some(ph => ph.name === 'ernte' && ph.von === f.ernte.doy),
        at + ': die Phase ernte beginnt am Erntetag'
      );
    }
    if (f.winterung) {
      phases(f.herbst, f.saat.doy, 366, at + '.herbst', f);
      assert.equal(f.herbst[0].name, 'saat', at + ': der Herbst beginnt mit der Saat');
      assert.ok(f.saat.doy > 200, at + ': Winterung im Spätsommer oder Herbst gesät');
    } else {
      assert.equal(f.herbst, undefined, at + ': nur Winterungen haben herbst');
      if (!f.schnitte)
        assert.ok(
          f.jahr.some(ph => ph.name === 'saat' && ph.von === f.saat.doy),
          at + ': Saat im Jahr'
        );
    }
    phases(f.jahr, 1, 366, at + '.jahr', f);
    const b = f.bestand;
    assert.ok(b.pflanzen_m2 === null || (b.pflanzen_m2 >= 1 && b.pflanzen_m2 <= 500), at + '.bestand.pflanzen_m2');
    assert.ok(b.halme_m2 === null || (b.halme_m2 >= 100 && b.halme_m2 <= 3000), at + '.bestand.halme_m2');
    num(b.reihe_cm, 10, 80, at + '.bestand.reihe_cm');
    if (f.gruppe === 'wintergetreide' || f.gruppe === 'sommergetreide') {
      const k = f.kopf;
      assert.ok(['aehre', 'grannen', 'roggen', 'triticale'].includes(k.form), at + '.kopf.form');
      num(k.laenge_m, 0.05, 0.3, at + '.kopf.laenge_m');
      num(k.nickt, 0, 1, at + '.kopf.nickt');
      for (const [fr, z] of Object.entries(k.zellen)) cellOf(z, id, fr, at + '.kopf.zellen.' + fr);
      assert.ok(k.zellen.gruen && k.zellen.reif, at + ': Ähre grün und reif');
      assert.ok(b.halme_m2 >= 300, at + ': Ähren je m²');
    } else {
      assert.ok(f.bilder && Object.keys(f.bilder).length >= 1, at + '.bilder');
      for (const [fr, e] of Object.entries(f.bilder)) {
        cellOf(e.zelle, id, fr, at + '.bilder.' + fr);
        num(e.hoehe, 0.2, 1, at + '.bilder.' + fr + '.hoehe');
      }
    }
    let w = 0;
    for (const [n, x] of Object.entries(f.nachfolger)) {
      assert.ok(F[n], at + '.nachfolger: unbekannt ' + n);
      num(x, 0.005, 1, at + '.nachfolger.' + n);
      w += x;
    }
    assert.ok(Math.abs(w - 1) < 0.005, at + '.nachfolger: Summe ' + w);
    sources(f.quellen, at);
  }
  assert.ok(sumTh <= 1 && sumTh > 0.8, 'Anteile Thüringen ' + sumTh);
  assert.ok(sumHbn <= 1 && sumHbn > 0.8, 'Anteile Hildburghausen ' + sumHbn);
  // class 9 draws from the local shares
  let s9 = 0;
  for (const [id, x] of Object.entries(B.flaechen[9].feldfruechte)) {
    assert.ok(F[id], 'flaechen[9].feldfruechte: unbekannt ' + id);
    num(x, 0.001, 0.6, 'flaechen[9].feldfruechte.' + id);
    s9 += x;
  }
  assert.ok(Math.abs(s9 - 1) < 0.005, 'flaechen[9].feldfruechte: Summe ' + s9);
  // the catch crop
  const Z = B.zwischenfrucht;
  num(Z.anteil, 0, 1, 'zwischenfrucht.anteil');
  phases(Z.herbst, Z.saat.doy, 366, 'zwischenfrucht.herbst', Z);
  phases(Z.fruehjahr, 1, Z.fruehjahr[Z.fruehjahr.length - 1].bis, 'zwischenfrucht.fruehjahr', Z);
  for (const [fr, e] of Object.entries(Z.bilder)) cellOf(e.zelle, 'zwischenfrucht', fr, 'zwischenfrucht.bilder.' + fr);
  sources(Z.quellen, 'zwischenfrucht');
});

test('the third atlas: the cells the crops name, each used; the picture is 1024² RGBA under 3 MB', () => {
  assert.equal(ATLAS3.v, 1);
  assert.equal(ATLAS3.bild, 'acker.png');
  assert.equal(ATLAS3.groesse_px, 1024);
  assert.equal(ATLAS3.zelle_px, 128);
  assert.ok(ATLAS3.zellen.length >= 30 && ATLAS3.zellen.length <= 64, 'Zellen ' + ATLAS3.zellen.length);
  assert.equal(CELL3.size, ATLAS3.zellen.length, 'Zellen doppelt');
  const used = new Set();
  for (const f of Object.values(B.feldfruechte)) {
    for (const e of Object.values(f.bilder || {})) used.add(String(e.zelle));
    for (const z of Object.values((f.kopf || {}).zellen || {})) used.add(String(z));
  }
  for (const e of Object.values(B.zwischenfrucht.bilder)) used.add(String(e.zelle));
  for (const e of ATLAS3.zellen) {
    assert.ok(used.has(String(e.zelle)), 'Zelle ' + e.id + ' wird nicht benutzt');
    for (const a of e.arten) assert.ok(B.feldfruechte[a] || a === 'zwischenfrucht', e.id + ': unbekannte Art ' + a);
    num(e.breite, 0.05, 1, e.id + '.breite');
    num(e.oben, 0.4, 1, e.id + '.oben');
    assert.match(e.farbe, HEX, e.id + '.farbe');
  }
  const png = fs.readFileSync(path.join(DIST, 'acker.png'));
  assert.equal(png.toString('latin1', 12, 16), 'IHDR');
  assert.equal(png.readUInt32BE(16), 1024);
  assert.equal(png.readUInt32BE(20), 1024);
  assert.equal(png[24], 8);
  assert.equal(png[25], 6);
  assert.ok(png.length < 3 * 1024 * 1024, 'atlas ' + png.length + ' bytes');
  assert.equal(B.atlas_acker.bild, 'bewuchs/acker.png');
});

test('the farm year is plausible: rape yellow in May, barley first in July, wheat in August, maize tall, beets late', () => {
  const F = B.feldfruechte;
  const ph = (id, d) => F[id].jahr.find(p => d >= p.von && d <= p.bis);
  assert.equal(ph('winterraps', 135).name, 'bluete');
  assert.ok(F.winterraps.jahr.find(p => p.name === 'bluete').farbe.match(/^#e|^#f/), 'Raps blüht gelb');
  assert.ok(F.wintergerste.ernte.doy < F.winterraps.ernte.doy, 'Gerste vor Raps');
  assert.ok(F.winterraps.ernte.doy < F.winterweizen.ernte.doy, 'Raps vor Weizen');
  assert.ok(F.winterweizen.ernte.doy >= 213 && F.winterweizen.ernte.doy <= 243, 'Weizen im August');
  assert.ok(F.silomais.ernte.doy >= 244 && F.silomais.ernte.doy <= 290, 'Silomais im September');
  assert.ok(F.zuckerruebe.ernte.doy >= 265, 'Rüben ab Ende September');
  assert.ok(ph('silomais', 225).hoehe_m[1] >= 2.5, 'Mais im August über 2,5 m');
  assert.equal(ph('winterweizen', 20).name, 'winter');
  assert.equal(ph('winterweizen', 215).kopf, 'reif');
  assert.equal(ph('sommergerste', 30).name, 'pflugacker');
  // the rotation: after barley comes rape, after rape wheat
  const top = id => Object.entries(F[id].nachfolger).sort((a, b) => b[1] - a[1])[0][0];
  assert.equal(top('wintergerste'), 'winterraps');
  assert.equal(top('winterraps'), 'winterweizen');
  // a winter crop's sowing comes after the harvest of the crop before it (barley → rape in August)
  assert.ok(F.wintergerste.ernte.doy + 21 < F.winterraps.saat.doy, 'Raps nach der Gerste gesät');
});
