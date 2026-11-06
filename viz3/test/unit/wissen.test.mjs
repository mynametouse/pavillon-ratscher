// Unit tests of the discovery book's data (wissen/wissen_data.js, feat/wissen) without a browser: every entry has a chapter, a text, a way
// to be found and at least one real source; every „Warum?“ has a sentence and a source; the teachers' topics point at entries that exist;
// the boards and the links between entries are whole. Run: node --test "viz3/test/unit/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WDATA as D } from '../../src/wissen/wissen_data.js';

const CH = D.CH.map(c => c.id);

test('five chapters as Falko chose them: Natur, Handwerk, Geschichte, Politik & Soziales, Orte', () => {
  assert.deepEqual(CH, ['natur', 'handwerk', 'geschichte', 'politik', 'orte']);
  for (const c of D.CH) assert.ok(c.label && c.icon && c.text, c.id);
});

test('every entry: unique id, a chapter, title, text, a way to be found and a source', () => {
  const seen = new Set();
  for (const e of D.E) {
    assert.ok(!seen.has(e.id), 'duplicate ' + e.id);
    seen.add(e.id);
    assert.ok(CH.includes(e.ch), e.id + ': chapter ' + e.ch);
    assert.ok(e.title && e.text && e.text.length > 60, e.id + ': title and text');
    assert.ok(e.icon, e.id + ': symbol');
    const f = e.find || {};
    assert.ok((f.place || []).length + (f.ev || []).length + (f.talk || []).length + (f.look || []).length > 0, e.id + ': how to find it');
    assert.ok(Array.isArray(e.src) && e.src.length > 0, e.id + ': a source');
    for (const s of e.src) {
      assert.ok(Array.isArray(s) && typeof s[0] === 'string' && s[0].length > 3, e.id + ': source title');
      assert.ok(s[1] === null || /^https:\/\//.test(s[1]), e.id + ': source link ' + s[1]);
    }
    for (const p of f.place || []) assert.doesNotThrow(() => new RegExp(p, 'i'), e.id + ': place pattern ' + p);
    for (const m of e.more || []) assert.ok(D.ids.has(m), e.id + ': more → ' + m);
  }
  for (const c of CH) assert.ok(D.E.filter(e => e.ch === c).length >= 5, 'at least five entries in ' + c);
});

test('every „Warum?“: title, one sentence or two, a linked source', () => {
  for (const [id, w] of Object.entries(D.WHY)) {
    assert.ok(w.title && w.text && w.text.length > 40 && w.text.length < 400, id);
    assert.ok(w.src.length && w.src.every(s => s[0] && (s[1] === null || /^https:\/\//.test(s[1]))), id + ': source');
  }
  // the strategy mode's rules (strategie/st_data.js) that the book explains under the same ids
  for (const id of ['ruhe_sonntag', 'ruhe_nacht', 'tageslicht', 'lehrgang', 'allein', 'psa_forst', 'psa_werk', 'sturm', 'saftruhe'])
    assert.ok(D.WHY[id], 'why ' + id);
  for (const [re, id] of D.THINK) {
    assert.ok(re instanceof RegExp && D.WHY[id], 'thought pattern → ' + id);
  }
  assert.ok(D.THINK.some(([re]) => re.test('Heute ist Sonntag – Sonn- und Feiertagsruhe.')), 'a Sunday refusal gets its „?“');
  // the refusals of werk/gear.js as the game words them: the first pattern that matches names the rule
  const first = t => (D.THINK.find(([re]) => re.test(t)) || [])[1];
  assert.equal(first('Erst die Forstausrüstung aus der Forstkiste am Traktor holen: Helm, Schnittschutzhose'), 'psa_forst');
  assert.equal(first('Erst die Schutzausrüstung vom PSA-Brett holen: Gehörschutz, Schutzbrille'), 'psa_werk');
  assert.equal(first('Handschuhe aus! An der Maschine können sie vom Werkzeug eingezogen werden.'), 'handschuhe');
  assert.equal(first('Ein schöner Tag im Garten.'), undefined);
});

test('teachers: Gerhard, Wolfgang, Ingrid, Hubert, Ronald – every topic opens entries that exist and are found by that talk', () => {
  for (const who of ['gerhard', 'wolfgang', 'ingrid', 'hubert', 'ronald']) assert.ok((D.TEACH[who] || []).length >= 3, who);
  for (const [who, list] of Object.entries(D.TEACH))
    for (const t of list) {
      const ids = t.entry ? [t.entry] : t.entries;
      assert.ok(t.label && t.lines.length && ids && ids.length, who + ':' + t.id);
      for (const id of ids) assert.ok(D.ids.has(id), who + ':' + t.id + ' → ' + id);
    }
  for (const [k, id] of Object.entries(D.TOPICS)) assert.ok(D.ids.has(id), k + ' → ' + id);
});

test('boards at the real places point at entries; the dam lies south-east of the village in the 2.4 km square', () => {
  for (const b of D.BOARDS) {
    assert.ok(D.ids.has(b.entry), b.id);
    for (const a of b.also || []) assert.ok(D.ids.has(a), b.id + ' also ' + a);
  }
  // GEOMAN.xf of the build (viz3/manifests.json): the dam about 0.85 km east and 0.8 km south of the garden
  const xf = { a: 1.0127906473420232, b: 0.07715765993901931, ex: 625469.0070213208, ey: 5595624.323524626 };
  const [E, N] = D.DAM_UTM,
    dE = E - xf.ex,
    dN = N - xf.ey,
    d = xf.a * xf.a + xf.b * xf.b,
    x = (xf.a * dE + xf.b * dN) / d,
    y = (-xf.b * dE + xf.a * dN) / d;
  assert.ok(x > 700 && x < 1000 && y < -650 && y > -950, `dam at ${x.toFixed(0)}, ${y.toFixed(0)}`);
});

test('facts that must stay right (checked 6.11.2026 with the sources named)', () => {
  const t = id => D.E.find(e => e.id === id);
  assert.match(t('g_talsperre').text, /1975 bis 1983/);
  assert.match(t('g_talsperre').text, /16 m hoch und 630 m lang/);
  assert.match(t('g_burg').text, /1226–1232/);
  assert.match(t('g_vessra').here, /seit 1990/);
  assert.match(t('p_ortsteil').text, /22\. Februar 1994/);
  assert.match(t('tier:rotmilan').here, /14\.000 bis 16\.000/);
});
