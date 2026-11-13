// Unit tests of ton-radio without a browser: the sound repository's list and the buffer cache (grenzland/gl_medien.js – GLMEDIEN.norm,
// GLMEDIEN.LRU), and the radio's pure rules for real songs (grenzland/gl_radio_data.js): songs shuffled per station without a repeat,
// the mid-song start when tuning in, where the presenter may talk (intro before the first sung second, outro after the last, else between
// the songs over a bed), the bed itself, the reception by place, terrain and transmitter, the display line, the credits, the new
// station Funkloch FM and its callers, the fixed lines for the recordings.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLMEDIEN as GM } from '../../src/grenzland/gl_medien.js';
import { GLRDATA as D } from '../../src/grenzland/gl_radio_data.js';

const SONG = (id, sender, o = {}) =>
  Object.assign(
    {
      id,
      kind: 'musik',
      sender,
      file: 'musik/' + sender + '/' + id + '.mp3',
      title: 'Titel ' + id,
      author: 'Band ' + id,
      licence: 'CC BY 4.0',
      licence_url: 'https://creativecommons.org/licenses/by/4.0/',
      source: 'https://example.org/' + id,
      sec: 200,
    },
    o
  );

test('GLMEDIEN.norm reads index.json in any shape, with the shared or the German field names', () => {
  const a = GM.norm([SONG('z1', 'zweitakt'), { id: 'x' }, SONG('z1', 'zweitakt')]);
  assert.equal(a.length, 1, 'entries without a file and doubles are dropped');
  assert.equal(a[0].title, 'Titel z1');
  assert.equal(a[0].licence, 'CC BY 4.0');
  const b = GM.norm({
    eintraege: [
      {
        id: 'k1',
        art: 'musik',
        sender: 'kirmes',
        datei: 'musik/kirmes/k1.mp3',
        titel: 'Polka',
        interpret: 'Kapelle',
        lizenz: 'CC0 1.0',
        lizenz_url: 'https://creativecommons.org/publicdomain/zero/1.0/',
        quelle: 'https://example.org/k1',
        sek: '183.5',
        gesang_ab: 12.25,
        gesang_bis: 170,
      },
    ],
  });
  assert.equal(b.length, 1);
  assert.deepEqual(
    [b[0].kind, b[0].file, b[0].title, b[0].author, b[0].licence, b[0].source, b[0].sec, b[0].gesang_ab],
    ['musik', 'musik/kirmes/k1.mp3', 'Polka', 'Kapelle', 'CC0', 'https://example.org/k1', 183.5, 12.25]
  );
  const c = GM.norm({ 'score-flucht-1': { kind: 'score', schicht: 'flucht', file: 'score/f1.mp3', loop: true } });
  assert.equal(c[0].id, 'score-flucht-1');
  assert.equal(c[0].schicht, 'flucht');
  assert.equal(c[0].loop, true);
  assert.equal(GM.lizenz('Creative Commons Attribution 3.0', ''), 'CC BY 3.0');
  assert.equal(GM.lizenz('', 'https://creativecommons.org/licenses/by/4.0/'), 'CC BY 4.0');
  assert.equal(GM.lizenz('Public Domain Mark 1.0', ''), 'Public Domain');
  assert.deepEqual(GM.norm(null), []);
  assert.deepEqual(GM.norm('kaputt'), []);
});

test("GLMEDIEN's buffer cache keeps at most six buffers and 40 MB, the least recently used go first", () => {
  const L = GM.LRU(6, 40 * 1024 * 1024),
    MB = 1024 * 1024;
  for (let i = 0; i < 6; i++) L.set('b' + i, { i }, 2 * MB);
  assert.equal(L.size, 6);
  L.get('b0'); // b0 is used again: b1 is the oldest now
  L.set('b6', { i: 6 }, 2 * MB);
  assert.equal(L.size, 6);
  assert.ok(L.has('b0') && !L.has('b1') && L.has('b6'), L.keys().join(' '));
  // bytes: two big ones push the others out
  L.set('gross1', {}, 18 * MB);
  L.set('gross2', {}, 18 * MB);
  assert.ok(L.bytes <= 40 * MB, 'bytes ' + L.bytes / MB);
  assert.ok(L.has('gross1') && L.has('gross2'));
  assert.ok(L.size <= 6);
  // one alone above the limit stays (the newest is never thrown out by itself)
  L.set('riesig', {}, 60 * MB);
  assert.deepEqual(L.keys(), ['riesig']);
  assert.equal(L.bytes, 60 * MB);
  L.del('riesig');
  assert.equal(L.size, 0);
  assert.equal(L.bytes, 0);
  // the base URL can be set (tests), with a slash added
  const o = GM.BASE;
  GM.BASE = 'http://localhost:1/ton';
  assert.equal(GM.BASE, 'http://localhost:1/ton/');
  GM.basis(o);
  assert.equal(GM.BASE, o);
});

test('songs are shuffled per station: none again before all were played, not twice in a row over the refill', () => {
  for (const id of ['zweitakt', 'funkloch', 'neon', 'kirmes']) {
    const st = D.PROG.neu(id, 3 + id.length),
      order = [];
    for (let i = 0; i < 400 && order.length < 36; i++) {
      const it = D.PROG.next(st, { songs: 9, misch: true });
      if (it.k === 'musik') order.push(it.i);
    }
    assert.equal(order.length, 36, id);
    for (let r = 0; r < 4; r++)
      assert.deepEqual(
        [...order.slice(r * 9, r * 9 + 9)].sort((a, b) => a - b),
        [0, 1, 2, 3, 4, 5, 6, 7, 8],
        id + ': round ' + r + ' plays every song once: ' + order.slice(r * 9, r * 9 + 9)
      );
    for (let i = 1; i < order.length; i++) assert.notEqual(order[i], order[i - 1], id + ' twice in a row at ' + i);
    assert.notDeepEqual(order.slice(0, 9), [0, 1, 2, 3, 4, 5, 6, 7, 8], id + ' is shuffled');
  }
  // two stations do not play in the same order
  const a = D.PROG.neu('zweitakt', 11),
    b = D.PROG.neu('neon', 12),
    oa = [],
    ob = [];
  for (let i = 0; i < 9; i++) {
    oa.push(D.PROG.mische(a, 9));
    ob.push(D.PROG.mische(b, 9));
  }
  assert.notDeepEqual(oa, ob);
  // the synthesised pieces stay in turn
  const s = D.PROG.neu('neon', 2),
    q = [];
  for (let i = 0; i < 30 && q.length < 7; i++) {
    const it = D.PROG.next(s, { songs: 6 });
    if (it.k === 'musik') q.push(it.i);
  }
  assert.deepEqual(q, [0, 1, 2, 3, 4, 5, 0]);
});

test('tuning in lands in the middle of a song – by the game clock, at least 25 s before its end', () => {
  const seen = new Set();
  for (let t = 0; t < 86400; t += 977) {
    const off = D.mitte(200, t, 77);
    assert.ok(off >= 30 && off <= 140 && off <= 200 - 25, 'offset ' + off + ' at ' + t);
    seen.add(Math.round(off / 10));
  }
  assert.ok(seen.size > 6, 'spread over the song: ' + seen.size);
  assert.equal(D.mitte(200, 5000, 3), D.mitte(200, 5000, 3), 'the same moment, the same place');
  assert.notEqual(D.mitte(200, 5000, 3), D.mitte(200, 5000, 4), 'another station, another place');
  const k = D.mitte(40, 1234, 5);
  assert.ok(k >= 6 && k <= 40 * 0.7, 'a short song: ' + k);
  assert.equal(D.mitte(undefined, 1, 1), 0);
});

test('the presenter talks over the intro (ending ≥ 1 s before the singing), over the outro (after it), else between the songs', () => {
  const e = SONG('s', 'zweitakt', { sec: 210, gesang_ab: 14, gesang_bis: 190 });
  let f = D.fenster(e, 9);
  assert.deepEqual(f.intro, [0.4, 13]);
  assert.equal(f.passt, 'intro', '9 s fit into 12.6 s of intro');
  assert.ok(f.intro[1] <= e.gesang_ab - 1);
  f = D.fenster(e, 14);
  assert.equal(f.passt, '', 'too long for the intro: between the songs');
  f = D.fenster(e, 12, 'outro');
  assert.deepEqual(f.outro, [190.5, 208.5]);
  assert.equal(f.passt, 'outro');
  assert.ok(f.outro[0] > e.gesang_bis);
  assert.equal(D.fenster(e, 19, 'outro').passt, '', 'too long for the outro');
  // singing from the first second: no intro at all
  const v = SONG('v', 'neon', { sec: 180, gesang_ab: 1.5, gesang_bis: 179 });
  assert.equal(D.fenster(v, 2).intro, null);
  assert.equal(D.fenster(v, 2).passt, '');
  assert.equal(D.fenster(v, 2, 'outro').outro, null);
  // an instrumental: the first 40 %, at most 30 s; the last 30 s
  const i = SONG('i', 'funkloch', { sec: 240 });
  assert.deepEqual(D.fenster(i, 5).intro, [0.4, 30]);
  assert.deepEqual(D.fenster(i, 5, 'outro').outro, [210, 238.5]);
  assert.equal(D.fenster({}, 3).passt, '');
});

test('the bed under an ident or a long talk is a few seconds of a song without singing', () => {
  const e = SONG('s', 'zweitakt', { sec: 210, gesang_ab: 14, gesang_bis: 190 });
  let b = D.bett(e, 3);
  assert.ok(b.sek >= 4 && b.sek <= 6, 'length ' + b.sek);
  assert.ok(b.ab >= 0 && b.ab + b.sek <= e.gesang_ab, 'in the intro before the singing: ' + JSON.stringify(b));
  // a short intro: after the singing
  b = D.bett(SONG('t', 'neon', { sec: 200, gesang_ab: 3, gesang_bis: 170 }), 3);
  assert.ok(b.ab > 170 && b.ab + b.sek < 200, 'the outro: ' + JSON.stringify(b));
  // the pipeline's own choice wins
  assert.equal(D.bett(SONG('u', 'kirmes', { sec: 200, bett: 61 }), 3).ab, 61);
  // a long talk: the bed lasts as long as the talk needs (the radio holds it), the cut stays inside the song
  b = D.bett(SONG('w', 'kirmes', { sec: 120 }), 12);
  assert.ok(b.ab >= 0 && b.ab + 13 <= 120);
});

test('reception: the Klinge and the forest hiss, a hollow is worse than a hill, far from the transmitter it fades', () => {
  const S = D.byId.funkloch;
  const dorf = D.empfang(S, { x: 220, y: -110, ort: 'Anger', h: 470, um: 468 });
  const klinge = D.empfang(S, { x: -548, y: -566, ort: 'Die Klinge – Familienwald', h: 420, um: 445 });
  const schleusingen = D.empfang(S, { x: -1340, y: 1243, ort: 'Schleusingen', h: 400, um: 401 });
  const fern = D.empfang(S, { x: 9000, y: -9000, ort: '', h: 400, um: 400 });
  assert.ok(dorf > 0.8, 'the village: ' + dorf);
  assert.ok(schleusingen > 0.95, 'Schleusingen is clear: ' + schleusingen);
  assert.ok(klinge < 0.35, 'the Klinge hisses: ' + klinge);
  assert.ok(fern < 0.5, 'far away: ' + fern);
  const senke = D.empfang(S, { x: 0, y: 0, ort: '', h: 400, um: 430 }),
    huegel = D.empfang(S, { x: 0, y: 0, ort: '', h: 430, um: 400 });
  assert.ok(senke < huegel, senke + ' < ' + huegel);
  // the station from across the border: only in the south (as before)
  const B = D.byId.blasius;
  assert.ok(D.empfang(B, { x: 4, y: 15 }) < 0.3 && D.empfang(B, { x: 300, y: -900 }) > 0.95);
  // the Western station of 1989 wavers
  const w = [0, 1, 2, 3, 4].map(t => D.empfang(D.byId.west, { t }));
  assert.ok(Math.max(...w) - Math.min(...w) > 0.05 && Math.max(...w) < 0.95);
  assert.equal(D.empfang(null, {}), 1);
});

test('the display line, the credits „Musik im Radio“ and the fixed lines of the songs', () => {
  const L = [
    SONG('z1', 'zweitakt'),
    SONG('z2', 'zweitakt', { author: '', licence: 'CC0', licence_url: '' }),
    SONG('f1', 'funkloch'),
    SONG('n1', 'neon', { aus: true }),
    SONG('x1', 'grenzland'),
    { id: 's1', kind: 'score', schicht: 'flucht', file: 'score/s1.mp3', title: 'Flucht' },
  ];
  assert.equal(D.anzeige(L[0]), 'Titel z1 – Band z1 · CC BY 4.0');
  assert.equal(D.anzeige(L[1]), 'Titel z2 · CC0');
  const C = D.credits(L);
  assert.deepEqual(
    C.map(g => g.sender),
    ['Radio Zweitakt 97,6', 'Funkloch FM 101,3'],
    'only the stations with songs, a song switched off (aus) is not credited'
  );
  assert.equal(C[0].zeilen[0].text, '„Titel z1“ – Band z1 · CC BY 4.0');
  assert.equal(C[0].zeilen[0].lizenz, 'https://creativecommons.org/licenses/by/4.0/');
  assert.equal(C[0].zeilen[0].quelle, 'https://example.org/z1');
  assert.equal(C[0].zeilen[1].text, '„Titel z2“ · CC0');
  // the back-announcement is a fixed sentence per song, the presenter's
  const lin = D.linien(L);
  assert.ok(lin.some(([w, t]) => w === 'r_zweitakt' && t === 'Das war „Titel z1“ von Band z1.'));
  assert.ok(!lin.some(([, t]) => t.includes('Titel x1')), 'not for a station without songs');
  const st = D.PROG.neu('zweitakt', 1);
  let mod = null;
  for (let i = 0; i < 20 && !mod; i++) {
    const it = D.PROG.next(st, { songs: 3, misch: true, last: { titel: 'Titel z1', von: 'Band z1' } });
    if (it.art === 'mod') mod = it;
  }
  assert.equal(mod.zeilen[0], 'Das war „Titel z1“ von Band z1.');
});

test('Funkloch FM 101,3: a new station of its own between Radio Blasius and Neonfunk, with listeners on the phone', () => {
  const ids = D.SENDER.heute.map(s => s.id);
  assert.deepEqual(ids, ['grenzland', 'kirmes', 'klassik', 'zweitakt', 'blasius', 'funkloch', 'neon']);
  const F = D.byId.funkloch;
  assert.equal(F.freq, '101,3');
  assert.ok(F.wer.name && F.claims.length >= 3 && F.mod.length >= 5 && F.werb.length >= 3 && F.news.length >= 2);
  assert.ok(F.verkehr.length && F.gruss.length && D.VOR.funkloch);
  for (const id of D.DATEI_SENDER) assert.ok(D.byId[id] && D.byId[id].mast, id + ' has a transmitter');
  // calls on three stations, every caller with a voice, the lines in turn
  for (const id of ['grenzland', 'kirmes', 'funkloch']) {
    const s = D.byId[id];
    assert.ok(s.anrufe.length >= 2 && s.uhr.includes('anruf'), id);
    const st = D.PROG.neu(id, 4);
    let a = null;
    for (let i = 0; i < 40 && !a; i++) {
      const it = D.PROG.next(st, { songs: 6 });
      if (it.art === 'anruf') a = it;
    }
    assert.ok(a && a.zeilen.length === a.wer.length && a.zeilen.length >= 4, id);
    assert.ok(a.wer.some(w => w && D.ANRUFER[w]) && a.wer.some(w => !w), id + ': presenter and caller');
    for (const w of a.wer) assert.ok(!w || D.ANRUFER[w], w);
  }
  // the fixed lines: every call line with its speaker key
  const lin = D.linien([]);
  assert.ok(lin.some(([w]) => w === 'r_anruf_jonas'));
  assert.ok(lin.some(([w, t]) => w === 'r_funkloch' && t.startsWith('Wir haben einen Anrufer')));
  assert.ok(lin.every(([w, t]) => /^r_[a-z_]+$/.test(w) && typeof t === 'string' && t.length > 8 && !t.includes('{')));
  const text = JSON.stringify([D.SENDER, D.ANRUFER, D.VOR]);
  assert.ok(!/Hubert|Ronald/.test(text), 'the real neighbours never appear');
});
