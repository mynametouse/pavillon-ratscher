// Unit tests of feat/grenzland-alltag without a browser: the day plans of the village people (grenzland/gl_alltag_data.js) and the
// festivals by the calendar (grenzland/gl_feste_data.js) – who is where when, school days, winter, night, the base game's village first,
// festivals taking the village, the dates of Kirmes, Christmas market and Feuerwehrfest, the tombola, the lines.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLALDATA as A } from '../../src/grenzland/gl_alltag_data.js';
import { GLFDATA as F } from '../../src/grenzland/gl_feste_data.js';
import { GLDATA } from '../../src/grenzland/gl_data.js';

const E = (y, m, d) => Date.UTC(y, m - 1, d) / 864e5;
const at = (id, eday, h, mi = 0, more = {}) => A.jetzt(id, Object.assign({ eday, min: h * 60 + mi }, more));
// a Tuesday, a Saturday and a Sunday in September 2026 (the story starts on Friday, 4 September 2026)
const DI = E(2026, 9, 8),
  SA = E(2026, 9, 12),
  SO = E(2026, 9, 13);

test('the people: 10–14 of Ratscher, 4–6 of Schleusingen, unique, nobody of the cast, not Hubert, Ronald or Gerhard', () => {
  const r = A.LEUTE.filter(p => p.ort === 'ratscher'),
    s = A.LEUTE.filter(p => p.ort === 'schleusingen');
  assert.ok(r.length >= 10 && r.length <= 14, 'Ratscher ' + r.length);
  assert.ok(s.length >= 4 && s.length <= 6, 'Schleusingen ' + s.length);
  const ids = new Set(A.LEUTE.map(p => p.id)),
    names = new Set(A.LEUTE.map(p => p.name));
  assert.equal(ids.size, A.LEUTE.length);
  assert.equal(names.size, A.LEUTE.length);
  const cast = new Set(Object.values(GLDATA.CAST).map(c => c.name));
  for (const p of A.LEUTE) {
    assert.ok(!/hubert|ronald|gerhard/i.test(p.id + p.name), p.id);
    assert.ok(!cast.has(p.name), 'in the cast already: ' + p.name);
    assert.ok(!GLDATA.CAST[p.id], 'cast key ' + p.id);
    assert.ok(p.fig && p.clips && p.h > 1.5 && p.voice && p.voice.g, p.id);
    if (p.kleid) assert.ok(A.KLEID[p.kleid], 'clothes ' + p.kleid);
    for (const e of p.plan) {
      assert.ok(A.ORTE[e[3]], p.id + ': place ' + e[3]);
      assert.ok(A.hm(e[2]) > A.hm(e[1]), p.id + ': ' + e[1] + '–' + e[2]);
      assert.ok(/^[0-6]+$/.test(e[0]), p.id + ': days ' + e[0]);
    }
  }
  // the people of the village chat walk the street
  const chat = new Set(GLDATA.CHAT.map(c => c[0]));
  for (const n of ['Ingrid', 'Uwe', 'Manfred', 'Heike', 'Wolfgang', 'Katrin', 'Jens'])
    assert.ok(chat.has(n) && names.has(n), n);
});

test('the school bus: Lea and Max wait at the Anger around 7:00 and come back about 13:30 on school days, not on Saturday', () => {
  for (const id of ['lea', 'max']) {
    assert.equal(at(id, DI, 7, 0).platz, 'haltestelle', id);
    assert.equal(at(id, DI, 7, 0).tun, 'warten');
    assert.equal(at(id, DI, 10, 0).platz, 'schulweg');
    assert.ok(at(id, DI, 10, 0).innen);
    assert.equal(at(id, DI, 13, 35).platz, 'haltestelle');
    assert.notEqual(at(id, SA, 7, 0).platz, 'haltestelle');
  }
  // the Christmas holidays: no school
  assert.ok(!A.schultag(E(2026, 12, 28)) && A.schultag(E(2026, 12, 8)) && !A.schultag(SA));
});

test('mornings at the shop on wheels, the farm at dawn, the fire brigade on Saturday, Sunday the church in Schleusingen', () => {
  // somebody of Ratscher is at the van every working morning of a fortnight (it opens 8:00–11:30), mostly two or more
  let zwei = 0,
    tage = 0;
  for (let d = 0; d < 14; d++) {
    const e = DI + d;
    if (A.ymd(e).wd === 0) continue;
    const n = A.LEUTE.filter(p => {
      for (let m = 8 * 60; m < 9 * 60 + 15; m += 5) if (A.jetzt(p, { eday: e, min: m }).platz === 'wagen') return true;
      return false;
    }).length;
    assert.ok(n >= 1, 'day ' + d + ': ' + n);
    tage++;
    if (n >= 2) zwei++;
  }
  assert.ok(zwei >= tage * 0.6, zwei + ' of ' + tage);
  assert.equal(at('uwe', DI, 7, 0).tun, 'stall');
  assert.equal(at('uwe', DI, 10, 0).platz, 'feld');
  assert.equal(at('manfred', SA, 10, 0).tun, 'uebung');
  assert.equal(at('jens', SA, 10, 0).tun, 'uebung');
  // a Sunday morning: some of both places at St. Johannis
  let alle = 0;
  for (let w = 0; w < 4; w++) {
    const kirche = A.LEUTE.filter(p => at(p, SO + w * 7, 10, 30).platz === 'kirche').map(p => p.id);
    alle += kirche.length;
    assert.ok(
      kirche.some(id => A.BY[id].ort === 'schleusingen'),
      kirche.join()
    );
  }
  assert.ok(alle >= 7, 'at church on four Sundays: ' + alle);
});

test('evenings: skittles at the Feldscheune in summer, the Stammtisch, the dog walk; night: almost nobody outside', () => {
  // a fortnight of Wednesday and Saturday evenings: skittles at least once
  let kegeln = 0;
  for (let w = 0; w < 4; w++)
    for (const e of [E(2026, 9, 9) + w * 7, SA + w * 7])
      kegeln += A.LEUTE.filter(p => at(p, e, 20, 0).tun === 'kegeln').length;
  assert.ok(kegeln >= 4, 'kegeln ' + kegeln);
  // at 2:00 nobody is out of doors
  for (let d = 0; d < 7; d++)
    for (const p of A.LEUTE) {
      const r = at(p, DI + d, 2, 0);
      assert.ok(r.innen || r.platz === 'daheim' || r.platz === 'stadtheim', p.id + ' ' + r.platz);
    }
  // Anja's round: most evenings
  let runden = 0;
  for (let d = 0; d < 20; d++) if (at('anja', DI + d, 21, 30).tun === 'abendrunde') runden++;
  assert.ok(runden >= 12, 'runden ' + runden);
});

test('winter: indoors earlier and fewer outside (November–February)', () => {
  const draussen = (e, m) =>
    A.LEUTE.filter(p => {
      const r = A.jetzt(p, { eday: e, min: m });
      return !r.innen && r.platz !== 'daheim' && r.platz !== 'stadtheim';
    }).length;
  let s = 0,
    w = 0;
  for (let d = 0; d < 14; d++) {
    s += draussen(E(2026, 9, 7) + d, 16 * 60 + 20) + draussen(E(2026, 9, 7) + d, 18 * 60 + 15);
    w += draussen(E(2026, 12, 7) + d, 16 * 60 + 20) + draussen(E(2026, 12, 7) + d, 18 * 60 + 15);
  }
  assert.ok(w < s * 0.75, 'winter ' + w + ' summer ' + s);
  // no leisure outside after 17:30 in December
  for (let d = 0; d < 14; d++)
    for (const p of A.LEUTE) {
      const r = A.jetzt(p, { eday: E(2026, 12, 7) + d, min: 18 * 60 + 30 });
      assert.ok(!['plaudern', 'bank', 'handy', 'kegeln', 'angeln', 'moped'].includes(r.tun), p.id + ' ' + r.tun);
    }
});

test('the base game first: out with the car, the Friday evening, the fire, the garden – never shown twice', () => {
  const r = at('katrin', DI, 16, 50, { basis: { weg: true } });
  assert.ok(r.basis && r.innen && r.platz === 'stadt');
  const s = at('ingrid', E(2026, 9, 11), 20, 0, { basis: { skat: true } });
  assert.ok(s.basis && s.tun === 'skat' && s.innen);
  const g = at('heike', DI, 8, 10, { basis: { garten: true } });
  assert.ok(g.basis && g.tun === 'garten' && g.innen);
  // without it the plan: Heike at the van or with her hens
  assert.ok(!at('heike', DI, 7, 30).basis);
});

test('the plans vary from day to day, deterministically', () => {
  const a = A.tag('ingrid', DI),
    b = A.tag('ingrid', DI);
  assert.deepEqual(a, b);
  const days = new Set();
  for (let d = 0; d < 10; d++) days.add(JSON.stringify(A.tag('ingrid', DI + d * 7).map(z => z.von)));
  assert.ok(days.size > 1);
});

test('festival days: Kirmes on the second weekend of October, Christmas market on the four Advent weekends, Feuerwehrfest in July', () => {
  const k = F.tage('kirmes', 2026).map(d => d.eday);
  assert.deepEqual(k, [E(2026, 10, 10), E(2026, 10, 11)]);
  assert.equal(F.advent1(2026), E(2026, 11, 29));
  assert.equal(F.advent1(2025), E(2025, 11, 30));
  assert.equal(F.advent1(2027), E(2027, 11, 28));
  const w = F.tage('weihnachtsmarkt', 2026).map(d => d.eday);
  assert.equal(w.length, 12);
  assert.deepEqual(w.slice(0, 3), [E(2026, 11, 27), E(2026, 11, 28), E(2026, 11, 29)]);
  assert.equal(w[11], E(2026, 12, 20));
  for (const e of w) assert.ok([5, 6, 0].includes(F.ymd(e).wd));
  const f = F.tage('feuerwehrfest', 2026).map(d => d.eday);
  assert.deepEqual(f, [E(2026, 7, 11), E(2026, 7, 12)]);
  // open and closed
  assert.equal(F.offen(E(2026, 10, 10), 20 * 60).id, 'kirmes');
  assert.equal(F.offen(E(2026, 10, 10), 12 * 60), null);
  assert.equal(F.offen(E(2026, 12, 5), 18 * 60).id, 'weihnachtsmarkt');
  assert.equal(F.offen(E(2026, 12, 5), 22 * 60), null);
  assert.equal(F.offen(E(2026, 12, 8), 18 * 60), null);
  assert.equal(F.offen(E(2026, 7, 11), 23 * 60 + 59).id, 'feuerwehrfest');
});

test('the calendar: the next festivals in order, the one open now first; the next opening of one', () => {
  const c = F.kalender(E(2026, 9, 4), 17 * 60 + 20, 4);
  assert.equal(c.length, 4);
  assert.deepEqual(
    c.map(x => x.id),
    ['kirmes', 'kirmes', 'weihnachtsmarkt', 'weihnachtsmarkt']
  );
  assert.ok(/Sa\. 10\. Oktober, 14:00–24:00 Uhr/.test(c[0].text), c[0].text);
  const n = F.kalender(E(2026, 12, 5), 18 * 60, 2);
  assert.ok(n[0].jetzt && n[0].id === 'weihnachtsmarkt');
  const nx = F.naechster('feuerwehrfest', E(2026, 9, 4), 0);
  assert.equal(nx.eday, E(2027, 7, 10));
  assert.equal(F.naechster('kirmes', E(2026, 10, 11), 19 * 60).eday, E(2026, 10, 11));
});

test('a festival takes its village: most of Ratscher at the Kirmes some time, the stall keepers all the time', () => {
  const e = E(2026, 10, 10),
    o = F.offen(e, 20 * 60),
    fest = Object.assign({}, o, { dienst: F.FESTE.kirmes.dienst });
  const seen = new Set();
  for (let m = o.von; m < o.bis; m += 15)
    for (const p of A.LEUTE) if (A.jetzt(p, { eday: e, min: m, fest }).platz === 'fest') seen.add(p.id);
  const ratscher = A.LEUTE.filter(p => p.ort === 'ratscher').length;
  assert.ok([...seen].filter(id => A.BY[id].ort === 'ratscher').length >= ratscher * 0.6, [...seen].join());
  for (const [stand, id] of Object.entries(F.FESTE.kirmes.dienst)) {
    const r = A.jetzt(id, { eday: e, min: o.von + 5, fest });
    assert.ok(r.tun === 'dienst' && r.stand === stand && r.platz === 'fest', id);
  }
  // every stall keeper is one of the village people, every sale has its stall
  for (const [fid, f] of Object.entries(F.FESTE)) {
    for (const id of Object.values(f.dienst)) assert.ok(A.BY[id], fid + ': ' + id);
    for (const v of f.verkauf)
      assert.ok(
        f.staende.some(s => s.id === v.stand),
        fid + ': ' + v.stand
      );
  }
});

test('the tombola: mostly blanks, sometimes a prize, rarely the main prize', () => {
  const n = {};
  for (let i = 0; i < 1000; i++) {
    const l = F.los((i + 0.5) / 1000);
    n[l.k] = (n[l.k] || 0) + 1;
  }
  assert.ok(n.niete > 450 && n.niete < 650, JSON.stringify(n));
  assert.ok(n.korb > 20 && n.korb < 80, JSON.stringify(n));
});

test('what they say: a line for every situation, shorter for a village that distrusts the two, fixed lines for the recordings', () => {
  for (const p of A.LEUTE) {
    for (const lage of ['einkauf', 'bus', 'pause', 'arbeit', 'abend', 'kirche', 'runde', 'fest', 'feuerwehr', 'x'])
      assert.ok(typeof A.ansage(p, lage, 'neutral') === 'string', p.id + ' ' + lage);
    assert.equal(A.ansage(p, 'pause', 'verhasst'), A.KURZ.verhasst);
  }
  for (const st of ['beliebt', 'neutral', 'misstrauisch', 'verhasst'])
    for (const z of ['morgen', 'tag', 'abend']) {
      const g = A.gruss(st, z);
      assert.ok(g.text && g.geste, st + ' ' + z);
    }
  assert.equal(A.gruss('nix', 'tag').text, 'Tach.');
  assert.ok(A.gruss('verhasst', 'tag').weg && A.gruss('misstrauisch', 'tag').tuschel);
  assert.equal(A.tz(8 * 60), 'morgen');
  assert.equal(A.tz(19 * 60), 'abend');
  const L = A.linien().concat(F.linien());
  assert.ok(L.length > 150);
  for (const [who, text] of L) {
    assert.ok(/^al_[a-z]+$/.test(who), who);
    assert.ok(typeof text === 'string' && text.length > 1 && !/[{}]/.test(text), text);
    assert.ok(!/hubert|ronald/i.test(text), text);
  }
  // every line of a person is said by that person only once
  const keys = new Set(L.map(l => l[0] + '|' + l[1]));
  assert.ok(keys.size >= L.length - 6);
});
