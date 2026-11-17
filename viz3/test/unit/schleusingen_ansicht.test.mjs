// Unit tests of Schleusingen after views from the street without a browser: the facade records (fassaden.json) and the looks made from
// them for FASSADE (fassade/ansicht.json, tools/schleusingen-ansicht/ansicht.py) – every record has its look, in the words FASSADE
// knows (read from viz3/src/fassade/fassade.js), the choices of the converter hold (brick as plaster, the ground floor's colour under
// slate or half-timbering, slate in the colour read, flat roofs flat), gebaeude's own fields survive, and every record fits the town's
// building whose centroid it names. Run: node --test "viz3/test/unit/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const V = p => path.join(HERE, '..', '..', p);
const read = p => JSON.parse(fs.readFileSync(V(p), 'utf8'));
const DOC = read('extra/schleusingen-ansicht/dist/schleusingen-ansicht/fassaden.json');
const LOOKS = read('extra/schleusingen-ansicht/dist/fassade/ansicht.json').b;
const OWN = read('extra/gebaeude/dist/gebaeude/ansicht.json').b;
const STADT = read('extra/schleusingen/dist/schleusingen/stadt.json');
const SRC = fs.readFileSync(V('src/fassade/fassade.js'), 'utf8');
// the keys of an object literal in fassade.js: const NAME = { a: 0, 'b-c': 1, … }
const keysOf = name => {
  const m = new RegExp(`${name} = \\{([^}]*)\\}`).exec(SRC);
  assert.ok(m, `fassade.js: ${name} not found`);
  return new Set([...m[1].matchAll(/['"]?([\wäöüß-]+)['"]?\s*:/g)].map(k => k[1]));
};
const MAT = keysOf('MAT'),
  ART = keysOf('ART'),
  DACH = keysOf('DACH'),
  RAHMEN = keysOf('RAHMEN'),
  LAEDEN = keysOf('LAEDEN');
const HEX = /^#[0-9a-f]{6}$/;
const rec = i => DOC.gebaeude.find(r => r.i === i);
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

test('every record has its look, in the words FASSADE knows', () => {
  assert.ok(DOC.gebaeude.length >= 140, `${DOC.gebaeude.length} records`);
  for (const r of DOC.gebaeude) {
    const L = LOOKS['#' + r.i],
      tag = `#${r.i} (${r.material})`;
    assert.ok(L, `${tag}: no look`);
    assert.ok(MAT.has(L.material), `${tag}: material ${L.material}`);
    assert.ok(ART.has(L.art) || L.art === 'schule', `${tag}: art ${L.art}`);
    assert.match(L.farbe, HEX, tag);
    if (L.rahmen !== undefined) assert.ok(RAHMEN.has(L.rahmen), `${tag}: rahmen ${L.rahmen}`);
    assert.ok(typeof L.laeden === 'boolean' || LAEDEN.has(L.laeden), `${tag}: laeden ${L.laeden}`);
    assert.equal(!!L.laeden, !!r.laeden, `${tag}: shutters as read`);
    if (L.schieferTon !== undefined) assert.ok([0, 1, 2, 3].includes(L.schieferTon), tag);
    if (L.fachwerkTon !== undefined) assert.ok([0, 1, 2].includes(L.fachwerkTon), tag);
    if (L.achse !== undefined) assert.ok(L.achse >= 2 && L.achse <= 6, tag);
    assert.ok(L.dach && DACH.has(L.dach.material) && HEX.test(L.dach.farbe), `${tag}: dach ${JSON.stringify(L.dach)}`);
  }
  assert.equal(Object.keys(LOOKS).length, DOC.gebaeude.length, 'one look per record, nothing else');
});

test('the choices of the converter', () => {
  for (const r of DOC.gebaeude) {
    const L = LOOKS['#' + r.i],
      tag = `#${r.i} (${r.material})`;
    if (r.material === 'klinker')
      assert.deepEqual([L.material, L.farbe], ['putz', r.wand], `${tag}: brick as plaster (style 9 is boards)`);
    if (r.material.endsWith('_og')) assert.equal(L.farbe, r.eg.farbe, `${tag}: the ground floor's colour`);
    if (r.material === 'schiefer' || r.material === 'verkleidung')
      assert.deepEqual(
        [L.material, L.schieferTon, L.farbe],
        ['schiefer', 3, r.wand],
        `${tag}: slate in the colour read`
      );
    if (r.material.startsWith('fachwerk'))
      assert.equal(L.fachwerkTon, { braun: 0, rot: 1, schwarz: 2 }[r.fachwerk], `${tag}: the timber's tone`);
    if (r.dach.material === 'flach' || r.dachform === 'flach')
      assert.equal(L.dach.form, 'flach', `${tag}: a flat roof is built flat`);
    if (r.geschosse) assert.equal(L.geschosse, r.geschosse, `${tag}: the storeys read`);
    assert.equal(L.dach.farbe, r.dach.farbe, tag);
  }
  assert.equal(LOOKS['#308'].art, 'haus', 'Hildburghäuser Straße 5: a house, not a hall');
  assert.equal(LOOKS['#349'].material, 'fachwerk-og');
  assert.equal(LOOKS['#337'].material, 'schiefer-og', 'Bertholdstraße 21: slate above a plaster ground floor');
  assert.equal(LOOKS['#337'].schieferTon, 0, 'dark slate');
  assert.equal(
    LOOKS['#72'].dach.material,
    'ziegel',
    'the church at the Ilmenauer Straße: red-brown tiles as the view shows'
  );
});

test("gebaeude's own looks: their fields stay where ours say nothing", () => {
  for (const [k, L0] of Object.entries(OWN)) {
    const L = LOOKS[k];
    if (!L) continue; // a house we did not read: their look stands alone
    for (const f of ['geschosse']) if (L0[f] !== undefined) assert.equal(L[f], L0[f], `${k}: ${f}`);
    if (L0.dach && L0.dach.form) assert.equal(L.dach.form, L0.dach.form, `${k}: dach.form`);
  }
});

test('a record fits only the building whose centroid it names, and no landmark', () => {
  const B = new Map(STADT.b.map(b => [b.i, b]));
  for (const r of DOC.gebaeude) {
    assert.ok(B.has(r.i), `building ${r.i} in stadt.json`);
    const [cx, cy] = centroid(B.get(r.i).f);
    assert.ok(
      Math.hypot(r.x - cx, r.y - cy) <= 0.5,
      `building ${r.i}: centroid ${cx.toFixed(1)}, ${cy.toFixed(1)} vs ${r.x}, ${r.y}`
    );
    assert.ok(!B.get(r.i).lm, `building ${r.i}: no landmark (the town draws those itself)`);
  }
});
