// Unit tests of feat/grenzland-kapitel2 without a browser: the runner with chapters (a later chapter's missions count only once the story
// has reached it), the data of chapter 2 (talks, titles, sources, nobody real), when the chapter begins in free play, the story's December
// (the Christmas market is open), the lines along the Kolonnenweg, and the rules of cracking cars (GLKNLOGIK).
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLMDATA, GLMLOGIK } from '../../src/grenzland/gl_mission_data.js';
import { GLDATA } from '../../src/grenzland/gl_data.js';
import { GLK2DATA as D, GLK2LOGIK as L, GLKNLOGIK as N } from '../../src/grenzland/gl_kapitel2_data.js';
import { GLFDATA } from '../../src/grenzland/gl_feste_data.js';

// ---------------- the runner with chapters ----------------
const MIS = () => [
  { id: 'a', steps: [{ id: 'a0' }] },
  { id: 'b', steps: [{ id: 'b0' }, { id: 'b1' }] },
  { id: 'k1', kap: 2, steps: [{ id: 'x0' }, { id: 'x1' }] },
  { id: 'k2', kap: 2, steps: [{ id: 'y0' }] },
];
function world(kap = 1) {
  const G = { m: {}, cur: '', kap },
    log = [];
  const io = {
    enter: (m, i, why) => log.push('enter ' + m.steps[i].id + ' ' + why),
    leave: (m, i, why) => log.push('leave ' + m.steps[i].id + ' ' + why),
    emit: (n, d) => log.push(n + ' ' + d.id + ' ' + (d.st ?? d.i)),
    save: () => {},
    done: m => log.push('done ' + m.id),
    gabe: m => log.push('gabe ' + m.id),
  };
  return { G, log, R: GLMLOGIK.runner(MIS(), G, io) };
}
test('a later chapter stays a secret until the story reaches it: next, journal, all done', () => {
  const { G, R } = world(1);
  R.start('a');
  R.next();
  R.start('b');
  R.next();
  R.next();
  assert.equal(R.nextOpen(), null, 'chapter 1 is through – chapter 2 does not start by itself');
  assert.equal(R.allDone(), true, 'all done of the chapters begun (no closing screen again after a reload)');
  assert.deepEqual(
    R.list().map(e => [e.id, e.status]),
    [
      ['a', 'erledigt'],
      ['b', 'erledigt'],
    ]
  );
  // the chapter begins: its first mission starts and the story stands in chapter 2
  R.start('k1');
  assert.equal(G.kap, 2);
  assert.deepEqual(
    R.list().map(e => [e.id, e.status]),
    [
      ['a', 'erledigt'],
      ['b', 'erledigt'],
      ['k1', 'läuft'],
    ]
  );
  R.next();
  R.next();
  assert.equal(R.nextOpen().id, 'k2');
  assert.equal(R.allDone(), false);
});
test('without a chapter in the state (chapter 1 alone) every mission counts as before', () => {
  const { G, R } = world(undefined);
  delete G.kap;
  assert.equal(R.nextOpen().id, 'a');
  for (const id of ['a', 'b']) G.m[id] = { st: 'erledigt', i: 0, n: 0 };
  assert.equal(R.nextOpen().id, 'k1');
  assert.equal(R.list().length, 3);
});
test('the debug jump puts the story into the chapter of the mission – and back', () => {
  const { G, R, log } = world(1);
  R.jump('k1', 1);
  assert.equal(G.kap, 2);
  assert.equal(G.m.a.st, 'erledigt');
  assert.equal(G.m.b.st, 'erledigt');
  assert.ok(log.includes('enter x1 debug'));
  R.jump('b');
  assert.equal(G.kap, 1, 'a jump back into chapter 1 leaves chapter 2 again');
  assert.equal(G.m.k1, undefined);
  assert.equal(
    R.list().some(e => e.id === 'k1'),
    false
  );
});
// ---------------- the data of chapter 2 ----------------
test('chapter 2 is in the runner’s data: titles with the line over them, the order after chapter 1, talks, music', () => {
  for (const id of ['k2m1', 'k2m2']) {
    const M = GLMDATA.M[id];
    assert.ok(M && M.title && M.ueber.startsWith('Kapitel 2 · Mission') && M.kap === 2, id);
    assert.ok(M.teaser && M.done && M.who && M.unter, id);
  }
  const o = GLMDATA.ORDER;
  assert.ok(o.indexOf('coup') < o.indexOf('k2m1') && o.indexOf('k2m1') < o.indexOf('k2m2'));
  for (const k of Object.keys(D.R)) assert.equal(GLMDATA.R[k], D.R[k], 'talk ' + k + ' registered');
  for (const [k, v] of Object.entries(D.LAGE)) assert.equal(GLMDATA.LAGE[k], v);
  assert.ok(GLDATA.CAST.fiedler && GLDATA.KLEID[GLDATA.CAST.fiedler.kleid], 'the owner of the Wartburg is in the cast');
});
test('every speaker is in the cast; nobody real; fixed lines; every spoken line is in linien()', () => {
  const alle = [];
  for (const [k, L0] of Object.entries(D.R)) {
    assert.ok(Array.isArray(L0) && L0.length, k);
    for (const [who, text] of L0) {
      assert.ok(who === '' || GLDATA.CAST[who], k + ': unknown speaker ' + who);
      assert.equal(typeof text, 'string');
      assert.ok(text.length > 1 && !text.includes('{'), k + ': ' + text);
      alle.push(text);
    }
  }
  const S = Object.values(D.S).flatMap(o =>
    Object.values(o).map(v => (typeof v === 'function' ? v(1) + v('markt') : v))
  );
  const T = Object.values(D.T).map(v => (typeof v === 'function' ? v(1) : v));
  const sms = Object.values(D.SMS).flat(),
    chat = Object.values(D.CHAT).flat(2),
    feed = Object.values(D.FEED).flat();
  for (const t of [...alle, ...S, ...T, ...sms, ...chat, ...feed, D.KAP.blendeB, D.KAP.angebot])
    assert.ok(!/hubert|ronald/i.test(String(t)), 'never Hubert or Ronald: ' + t);
  const lin = D.linien(),
    keys = new Set(lin.map(([w, t]) => w + ':' + t));
  assert.equal(keys.size, lin.length, 'no line twice');
  for (const L0 of Object.values(D.R))
    for (const [who, text] of L0) if (who) assert.ok(keys.has('gl_' + who + ':' + text), text);
  assert.ok(lin.length >= 60, lin.length + ' lines');
});
test('history with sources: the crossing point of 1973, the Grünes Band of 9 December 1989', () => {
  const t = D.R.k2museum.map(l => l[1]).join(' ');
  assert.ok(t.includes('21. Juni 1973') && t.includes('9. Dezember 1989') && t.includes('Hof'));
  assert.ok(D.QUELLEN.length >= 3 && D.QUELLEN.every(([s, u]) => s.length > 20 && /^https:\/\//.test(u)));
});
// ---------------- when chapter 2 begins; the story's December ----------------
test('the chapter begins in calm free play after chapter 1 – by the button, at the barn, or after a while', () => {
  const o = { on: true, era: 'heute', kap1: true, k2: false, mission: false, frei: 10 };
  assert.equal(L.beginnt(o), '');
  assert.equal(L.beginnt({ ...o, knopf: true }), 'knopf');
  assert.equal(L.beginnt({ ...o, scheune: true }), 'scheune');
  assert.equal(L.beginnt({ ...o, scheune: true, fahrt: true }), '', 'not while driving past');
  assert.equal(L.beginnt({ ...o, frei: L.FREI_T }), 'zeit');
  for (const k of ['mission', 'ende', 'job', 'handy', 'blende', 'k2'])
    assert.equal(L.beginnt({ ...o, knopf: true, [k]: true }), '', 'never with ' + k);
  assert.equal(L.beginnt({ ...o, knopf: true, sterne: 1 }), '', 'never while wanted');
  assert.equal(L.beginnt({ ...o, knopf: true, kap1: false }), '', 'only after chapter 1');
  assert.equal(L.beginnt({ ...o, knopf: true, era: '1989' }), '');
});
test('the direct way in (?kapitel=2): chapter 1 marked done if it is not, chapter 2 opens – once it has begun, nothing', () => {
  const k1 = s => Array(5).fill(s);
  // a fresh start has begun chapter 1's first mission
  assert.equal(L.direkt({ kap: 1, kap1: ['läuft', ...k1('offen').slice(1)], k2: ['offen', 'offen'] }), 'kap1');
  assert.equal(L.direkt({ kap: 1, kap1: k1('erledigt'), k2: ['offen', 'offen'] }), 'beginnen');
  assert.equal(L.direkt({ kap: 2, kap1: k1('erledigt'), k2: ['offen', 'offen'] }), 'nichts');
  assert.equal(L.direkt({ kap: 1, kap1: k1('erledigt'), k2: ['offen', 'erledigt'] }), 'nichts', 'a save of the preview');
  assert.equal(L.direkt({ kap: 1, kap1: k1('erledigt'), k2: ['läuft', 'offen'] }), 'nichts');
  assert.equal(L.direkt({ kap: 1, kap1: [], k2: [] }), 'kap1');
});
test('December: Friday, 4 December 2026 – the Christmas market of Schleusingen is open on its evenings', () => {
  const d = new Date(L.DEZ * 864e5);
  assert.deepEqual([d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCDay()], [2026, 11, 4, 5]);
  assert.equal(L.e0(37) + 37, L.DEZ, 'game day 37 is the 4th');
  const fr = GLFDATA.offen(L.DEZ, 16 * 60 + 40),
    sa = GLFDATA.offen(L.DEZ + 1, 18 * 60 + 15);
  assert.equal(fr && fr.id, 'weihnachtsmarkt', 'Friday evening at the opening');
  assert.equal(sa && sa.id, 'weihnachtsmarkt', 'Saturday evening, mission 2');
  assert.equal(GLFDATA.offen(L.DEZ + 1, 22 * 60), null, 'closed at ten');
});
test('along the Kolonnenweg: a point at s, the nearest point, lines from any form', () => {
  const W = [
    [0, 0],
    [100, 0],
    [100, 50],
  ];
  assert.equal(L.laenge(W), 150);
  const a = L.entlang(W, 120);
  assert.ok(Math.abs(a.x - 100) < 1e-9 && Math.abs(a.y - 20) < 1e-9 && Math.abs(a.hd) < 1e-9);
  assert.equal(L.entlang(W, -5).x, 0);
  assert.equal(L.entlang(W, 999).y, 50);
  const n = L.abstand(W, 40, 12);
  assert.ok(Math.abs(n.d - 12) < 1e-9 && Math.abs(n.s - 40) < 1e-9);
  assert.deepEqual(
    L.punkte([
      { x: 1, y: 2 },
      { x: 3, y: 4 },
    ]),
    [
      [1, 2],
      [3, 4],
    ]
  );
  assert.deepEqual(L.punkte({ pts: W }), W);
  assert.equal(L.punkte([[1, 2]]), null);
  assert.equal(L.punkte(null), null);
  // the stand-in's way is the gravel track west of Ratscher, long enough for the van and the approach
  assert.ok(L.laenge(D.ERSATZ.weg) > 650);
  for (const k of ['parkplatz', 'museum', 'kolonnenweg_a', 'kolonnenweg_b', 'heide', 'bunker'])
    assert.ok(D.ERSATZ.orte[k], k);
  const b = D.ERSATZ.orte.bunker,
    nb = L.abstand(D.ERSATZ.weg, b[0], b[1]);
  assert.ok(nb.d > 25 && nb.d < 90 && nb.s > 150, 'the bunker lies off the way, far enough in: ' + JSON.stringify(nb));
});
// ---------------- cracking cars (GLKNLOGIK) ----------------
test('an old car opens with the wire (quiet, slow) or the window (quick, loud, glass, then the wires)', () => {
  const c = N.neu({ id: 'f', typ: 'wartburg', kz: 'HBN-RF 53' });
  assert.equal(c.farbe, 'pastellweiss');
  const d = N.versuch(c, 'draht'),
    s = N.versuch(c, 'scheibe');
  assert.ok(d.ok && !d.alarm && d.t >= 6 && d.laut <= 8 && !d.bruch && d.kurz === 0);
  assert.ok(s.ok && s.bruch && s.t < 2 && s.laut >= 25 && s.kurz > 2);
  assert.ok(s.t + s.kurz < d.t, 'the window is quicker');
  assert.equal(N.versuch(c, 'brecheisen').ok, false);
  N.oeffnen(c, 'scheibe');
  assert.ok(c.offen && c.scheibe);
  assert.equal(N.versuch(c, 'draht').grund, 'offen');
});
test('a car of today refuses: immobiliser and alarm, heard far', () => {
  const c = N.neu({ id: 'n', typ: 'kombi', alt: false });
  for (const w of ['draht', 'scheibe']) {
    const v = N.versuch(c, w);
    assert.ok(!v.ok && v.alarm && v.laut >= 50 && v.grund === 'wegfahrsperre', w);
  }
  N.oeffnen(c, 'draht');
  assert.equal(c.offen, false);
});
test('the owner’s report: the police know colour and plate – paint and other plates make the car a stranger', () => {
  const c = N.neu({ id: 'f', typ: 'wartburg', kz: 'HBN-RF 53' });
  assert.ok(N.sauber(c), 'nothing reported yet');
  assert.equal(N.erkennt(c, 5), false);
  N.anzeige(c);
  assert.ok(c.gestohlen && !N.sauber(c));
  assert.ok(N.erkennt(c, 60) && !N.erkennt(c, 80), 'the colour from afar by day');
  assert.ok(N.erkennt(c, 25, true) && !N.erkennt(c, 40, true), 'closer at night');
  assert.ok(N.lackieren(c, 'dunkelblau'));
  assert.equal(N.lackieren(c, 'dunkelblau'), false, 'the same paint again changes nothing');
  assert.equal(N.lackieren(c, 'lila'), false, 'only the paints there are');
  assert.ok(!N.sauber(c), 'the plate is still in the report');
  assert.ok(N.erkennt(c, 10) && !N.erkennt(c, 30), 'only the plate now: close by');
  assert.ok(N.schildern(c, 'HBN-BM 47'));
  assert.ok(N.sauber(c) && !N.erkennt(c, 3));
  assert.equal(c.lackiert, 1);
  assert.ok(N.LACK.every(k => N.FARBEN[k]) && N.LACK.length >= 4);
  assert.ok(N.kzOk('HBN-RF 53') && N.kzOk(D.AUTO.kzNeu) && N.kzOk(D.AUTO.neu.kz) && !N.kzOk('hbn 53'));
});
test('the saved state of the cars is checked strictly', () => {
  const c = N.neu({ id: 'f', kz: 'HBN-RF 53' });
  assert.ok(N.check(null));
  assert.ok(N.check({ v: 1, autos: {} }));
  assert.ok(N.check({ v: 1, autos: { f: c } }));
  c.pos = [10, 20, 1.5];
  N.anzeige(c);
  assert.ok(N.check({ v: 1, autos: { f: c } }));
  assert.equal(N.check({ v: 2, autos: {} }), false);
  assert.equal(N.check({ v: 1, autos: { f: Object.assign({}, c, { farbe: 'lila' }) } }), false);
  assert.equal(N.check({ v: 1, autos: { f: Object.assign({}, c, { pos: [1, 2] }) } }), false);
  assert.equal(N.check({ v: 1, autos: { f: Object.assign({}, c, { pos: [1, 2, NaN] }) } }), false);
  assert.equal(N.check({ v: 1, autos: { f: Object.assign({}, c, { bekannt: { farbe: 1 } }) } }), false);
  assert.equal(N.check({ v: 1, autos: [] }), false);
});
