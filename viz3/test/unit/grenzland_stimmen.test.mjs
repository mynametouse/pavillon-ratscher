// Unit tests of feat/grenzland-stimmen without a browser: the id of a recording (who + FNV-1a of the words, as the village's
// tools/voices/linien.mjs), the collector's rules (GLSTIMMEN.sammeln: the talks, every module's linien(), the street of 1989, the radio;
// prio; what cannot be recorded), and the list of lines for the recordings (tools/voices/grenzland_linien.json).
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GLSTIMMEN as V } from '../../src/grenzland/gl_stimmen.js';
import { GLDATA } from '../../src/grenzland/gl_data.js';
import { GLMDATA } from '../../src/grenzland/gl_mission_data.js';
import { GL89DATA } from '../../src/grenzland/gl_1989_data.js';
import { GLRDATA } from '../../src/grenzland/gl_radio_data.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const Q = (mods = [], extra = []) => ({ GLDATA, GLMDATA, GL89DATA, GLRDATA, mods, extra });

test('the id is who + FNV-1a of the words, as the village recordings have it', () => {
  // viz3/extra/saetze: „x_gerhard_1gxnwae“ for Gerhard's greeting (tools/voices/linien.mjs)
  assert.equal(V.fnv('Guten Abend! Setz dich ruhig dazu – zum Zuhören braucht man keine Karten.'), '1gxnwae');
  assert.equal(V.id('jule', 'Stimmt.'), 'gl_jule_' + V.fnv('Stimmt.'));
  assert.equal(V.id('gl_jule', 'Stimmt.'), V.id('jule', 'Stimmt.'));
  assert.notEqual(V.id('gl_basti', 'Stimmt.'), V.id('gl_jule', 'Stimmt.'));
  assert.match(V.id('gl_r_grenzland', 'Radio Grenzland – wir senden, bis einer kommt.'), /^gl_r_grenzland_[0-9a-z]+$/);
});

test('the mission talks are the story: every spoken line, not the narrator', () => {
  const L = V.sammeln(Q());
  const R = Object.values(GLMDATA.R).flat();
  for (const [who, text] of R) {
    const l = L.find(x => x.text === text && x.who === 'gl_' + who);
    if (who) assert.ok(l && l.prio === 1, 'missing ' + who + ': ' + text);
    else assert.ok(!L.some(x => x.text === text), 'the narrator is not spoken: ' + text);
  }
  // in the talks' order, the story first
  assert.equal(L[0].src, 'R.' + Object.keys(GLMDATA.R)[0]);
});

test('the street of 1989 and the radio are collected, each line once', () => {
  const L = V.sammeln(Q());
  const k = new Set(L.map(l => l.who + ':' + l.text));
  assert.equal(k.size, L.length, 'no line twice');
  assert.ok(L.some(l => l.who === 'gl_erna' && l.prio === 2));
  // Lutz says the same words in the talk and in the street: once, as the story
  const lutz = L.filter(l => l.who === 'gl_lutz');
  assert.ok(lutz.length >= 3 && lutz.every(l => l.prio === 1));
  // the talk station today and the GDR's in 1989 first (3), the other stations after (4)
  const by = id => L.filter(l => l.who === 'gl_r_' + id);
  assert.ok(by('grenzland').length > 30 && by('grenzland').every(l => l.prio === 3));
  assert.ok(by('republik').length > 5 && by('republik').every(l => l.prio === 3));
  assert.ok(by('kirmes').length > 5 && by('kirmes').every(l => l.prio === 4));
  // the police report of the player's deeds on the talk station, both variants of the search
  assert.ok(by('grenzland').some(l => l.text === GLDATA.RADIO.polizei.einbruch));
  assert.ok(by('grenzland').some(l => l.text === GLDATA.RADIO.gesucht(3)));
  assert.ok(by('grenzland').some(l => l.text === GLDATA.RADIO.gesucht(1)));
  // 1989's reports only in 1989
  assert.ok(!by('grenzland').some(l => GLRDATA.POLIZEI.kiste.includes(l.text)));
  assert.ok(by('republik').some(l => GLRDATA.POLIZEI.kiste.includes(l.text)));
});

test('every module’s own linien() joins – both forms, with the prefix or without; a broken one is skipped', () => {
  const welt = { linien: () => [['funk', 'Rennsteig für Schleuse 12: kommen.'], { who: 'gl_ingrid', text: 'Die schon wieder.' }] };
  const reakt = { linien: () => [['gerhard', 'Ist was?'], ['haendler', 'Ist was?'], ['falko', 'Nichts.']] };
  const kino = { linien: () => [['falko', 'Und jetzt?']] };
  const kaputt = {
    linien: () => {
      throw new Error('x');
    },
  };
  const radio = { linien: () => [['r_neon', 'Neon. Nachts.', 2]] };
  const L = V.sammeln(Q([['GLFAHNDUNG', welt], ['GLKAMERA', kino], ['GLKAPUTT', kaputt], ['GLX', radio], ['GLREAKTION', reakt]]));
  const f = (who, t) => L.find(l => l.who === who && l.text === t);
  assert.equal(f('gl_funk', 'Rennsteig für Schleuse 12: kommen.').prio, 2);
  assert.equal(f('gl_ingrid', 'Die schon wieder.').prio, 2);
  assert.equal(f('gl_falko', 'Und jetzt?').prio, 1, 'kino’s lines are the story');
  assert.equal(f('gl_r_neon', 'Neon. Nachts.').prio, 2, 'a line may bring its own prio');
  assert.equal(f('gl_funk', 'Rennsteig für Schleuse 12: kommen.').src, 'GLFAHNDUNG.linien');
  // the many small reactions: of a person who speaks in the story 2.5, of anybody else 3.5 (person by person), the player's own 2
  assert.equal(f('gl_gerhard', 'Ist was?').prio, 2.5);
  assert.equal(f('gl_haendler', 'Ist was?').prio, 3.5);
  assert.equal(f('gl_falko', 'Nichts.').prio, 2);
});

test('the radio: today’s talk station first, its feature last', () => {
  const L = V.sammeln(Q()).filter(l => l.who.startsWith('gl_r_'));
  assert.equal(L[0].who, 'gl_r_grenzland');
  const g = L.filter(l => l.who === 'gl_r_grenzland');
  assert.deepEqual(
    g.slice(-GLDATA.RADIO.sushi.length).map(l => l.text),
    GLDATA.RADIO.sushi
  );
});

test('what cannot be recorded is left out: variable parts, empty lines, no speaker', () => {
  const m = { linien: () => [['falko', 'Hallo {name}.'], ['falko', '   '], ['', 'Niemand.'], [null, 'x'], ['falko', 42]] };
  const L = V.sammeln({ mods: [['GLM', m]] });
  assert.equal(L.length, 0);
  // the narrator's lines of the fallback list too
  assert.equal(V.sammeln({ extra: [['', 'Erzählt.']] }).length, 0);
});

test('the list for the recordings matches the rules (tools/voices/grenzland_linien.json)', () => {
  const f = path.join(ROOT, 'tools', 'voices', 'grenzland_linien.json');
  const doc = JSON.parse(fs.readFileSync(f, 'utf8'));
  assert.ok(doc.lines.length > 200);
  for (const l of doc.lines) {
    assert.equal(l.id, V.id(l.who, l.text), 'id of ' + l.who + ': ' + l.text);
    assert.ok(/^gl_/.test(l.who) && l.prio >= 1 && l.prio <= 4);
    assert.ok(doc.cast[l.who], 'cast entry for ' + l.who);
  }
  // every talk of the missions is in it (the collector ran after the last change of the talks)
  const ids = new Set(doc.lines.map(l => l.id));
  for (const [who, text] of Object.values(GLMDATA.R).flat())
    if (who) assert.ok(ids.has(V.id(who, text)), 'run node tools/voices/grenzland_linien.mjs – missing: ' + text);
});
