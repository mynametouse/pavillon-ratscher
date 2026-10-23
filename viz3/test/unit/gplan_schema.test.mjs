// Unit tests of the plant data contract (gplan/gplan_schema.js) without a browser: the test data passes, broken data is named field by
// field, and the real files (pflanzen.json, regeln.json, gilden.json from viz3/extra/*/dist/gartenplaner/) pass whenever they exist.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GPSCHEMA as S } from '../../src/gplan/gplan_schema.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MINI = JSON.parse(fs.readFileSync(path.join(HERE, 'fixtures/gplan_mini.json'), 'utf8'));
const clone = o => JSON.parse(JSON.stringify(o));

test('the test data passes; its plants are drafts', () => {
  const r = S.validateAll(MINI);
  assert.deepEqual(r.errors, []);
  assert.equal(r.warnings.filter(w => w.includes('Entwurf')).length, MINI.pflanzen.arten.length);
});

test('broken plants are named field by field', () => {
  const m = clone(MINI);
  const a = m.pflanzen.arten[0];
  a.schicht = 'riese';
  a.hoehe_m = [6, 4];
  a.boden.ph = [2, 7];
  a.bluete.monate = [0, 13];
  a.darstellung.laub = 'grün';
  a.entwurf = false;
  a.nachbarrecht = 'gibt-es-nicht';
  a.hoehe = 5;
  delete a.text;
  m.pflanzen.arten[1].id = 'apfel-test';
  m.pflanzen.arten[1].partner = [{ mit: 'niemand', grund: 'x' }];
  const r = S.validateAll(m);
  const has = s =>
    assert.ok(
      r.errors.some(e => e.includes(s)),
      'missing error about ' + s + '\n' + r.errors.join('\n')
    );
  has('.schicht');
  has('.hoehe_m');
  has('.boden.ph');
  has('.bluete.monate');
  has('.darstellung.laub');
  has('.quellen');
  has('.nachbarrecht');
  has('.text');
  has('.id: doppelt');
  has('.partner[0].mit');
  assert.ok(r.warnings.some(w => w.includes('.hoehe: unbekanntes Feld')));
});

test('rules and guilds: unknown sources, plants and sides are errors', () => {
  const m = clone(MINI);
  m.regeln.grenzabstand[0].quelle = 'nirgends';
  m.regeln.grenzabstand[1].abstand_m = -1;
  m.gilden.gilden[0].mitte = 'beinwell-test';
  m.gilden.gilden[0].ringe[1].seite = 'oben';
  m.gilden.gilden[0].ringe[0].pflanzen[0].id = 'unbekannt';
  const r = S.validateAll(m);
  const has = s =>
    assert.ok(
      r.errors.some(e => e.includes(s)),
      'missing error about ' + s + '\n' + r.errors.join('\n')
    );
  has('grenzabstand[0 test-obst].quelle');
  has('grenzabstand[1 test-strauch].abstand_m');
  has('.mitte: Baum oder Kleinbaum');
  has('.seite');
  has('.pflanzen[0].id');
});

test('the real files pass when they exist', t => {
  const root = path.join(HERE, '../../extra');
  const find = name => {
    for (const d of fs.existsSync(root) ? fs.readdirSync(root) : []) {
      const f = path.join(root, d, 'dist/gartenplaner', name);
      if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
    }
    return null;
  };
  const files = { pflanzen: find('pflanzen.json'), regeln: find('regeln.json'), gilden: find('gilden.json') };
  if (!files.pflanzen && !files.regeln && !files.gilden) return t.skip('no data files yet');
  const r = S.validateAll(files);
  assert.deepEqual(r.errors, []);
});
