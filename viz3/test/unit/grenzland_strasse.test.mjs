// Unit tests of feat/grenzland-strasse without a browser: the timetables of the traffic with a purpose (GLLDATA), the new encounters on
// the way in the planner (GLLOGIK.EREIGNISSE / plan), the rest stop's prices and spots (GLRDATA).
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLLDATA as D } from '../../src/grenzland/gl_linien_data.js';
import { GLLOGIK as G } from '../../src/grenzland/gl_logik.js';

const MO = { wd: 0, hol: null, ferien: false },
  SA = { wd: 5, hol: null, ferien: false },
  SO = { wd: 6, hol: null, ferien: false },
  FEIER = { wd: 2, hol: 'Tag der Deutschen Einheit', ferien: false },
  FERIEN = { wd: 1, hol: null, ferien: true };
// every run 2 km in legs of equal length (the world measures them on its roads)
const len = f => f.weg.slice(1).map(() => 2000 / (f.weg.length - 1));
const at = (d, h, m = 0) => d * 1440 + h * 60 + m;

test('the kind of day: school day, holidays, Saturday, Sunday and public holidays', () => {
  assert.equal(D.tag(MO), 'schultag');
  assert.equal(D.tag(FERIEN), 'ferien');
  assert.equal(D.tag(SA), 'samstag');
  assert.equal(D.tag(SO), 'sonntag');
  assert.equal(D.tag(FEIER), 'sonntag', 'a public holiday counts as Sunday');
  const holz = D.FAHRTEN.find(f => f.fz === 'holz'),
    milch = D.FAHRTEN.find(f => f.fz === 'milch');
  assert.ok(D.faehrt(milch, SO) && D.faehrt(milch, FEIER), 'the cows are milked on Sundays too');
  assert.ok(D.faehrt(holz, MO) && D.faehrt(holz, FERIEN) && !D.faehrt(holz, SA) && !D.faehrt(holz, SO), 'timber: Monday to Friday');
  const k = D.FAHRTEN.find(f => f.fz === 'k1');
  assert.ok(D.faehrt(k, SA) && !D.faehrt(k, SO), 'the haulier: Monday to Saturday');
});

test('a run as numbers: drives its legs at its pace, waits at its stops, then it is done', () => {
  const f = D.FAHRTEN.find(q => q.id === 'milch'),
    P = D.plan([1000, 2000], f);
  assert.equal(P.L, 3000);
  assert.deepEqual(P.halte, [0, 14, 0]);
  assert.ok(Math.abs(P.dauer - (3000 / f.tempo + 14)) < 1e-9);
  let s = D.stand(P, 0);
  assert.deepEqual([s.s, s.i, s.halt, s.fertig], [0, 0, false, false]);
  s = D.stand(P, 1000 / f.tempo + 3);
  assert.ok(s.halt && s.i === 1 && s.s === 1000, 'at the farm: ' + JSON.stringify(s));
  s = D.stand(P, 1000 / f.tempo + 14 + 300 / f.tempo);
  assert.ok(!s.halt && s.i === 1 && Math.abs(s.s - 1300) < 1e-6, 'on from the farm: ' + JSON.stringify(s));
  s = D.stand(P, P.dauer + 1);
  assert.ok(s.fertig && s.s === 3000);
  // never backwards
  let last = -1;
  for (let el = 0; el < P.dauer; el += 0.5) {
    const q = D.stand(P, el);
    assert.ok(q.s >= last);
    last = q.s;
  }
});

test('who is on the road: the milk at dawn every day, timber on working days, the haulier, nobody at 3 in the morning', () => {
  const ids = (t, d) => D.unterwegs(t, d, len).map(r => r.f.id);
  assert.ok(ids(at(3, 6, 20), SO).includes('milch'), 'Sunday 6:20: the milk lorry');
  assert.ok(!ids(at(3, 9, 30), SO).includes('holz'), 'no timber on a Sunday');
  assert.ok(ids(at(3, 9, 30), MO).includes('holz'), 'Monday 9:30: timber');
  assert.ok(ids(at(3, 14, 10), FERIEN).includes('holz'), 'in the school holidays too');
  assert.deepEqual(ids(at(3, 3, 0), MO), [], 'nobody at 3 in the morning');
  assert.ok(ids(at(3, 6, 50), SA).includes('k1-frueh'), 'the haulier on a Saturday morning');
  assert.ok(!ids(at(3, 6, 50), SO).includes('k1-frueh'), 'not on a Sunday');
  // a run is on the road from its departure until it is done (2 km at its pace plus its stops)
  const f = D.FAHRTEN.find(q => q.id === 'k2-tag'),
    P = D.plan(len(f), f);
  assert.ok(ids(at(3, 13, 25), MO).includes('k2-tag'));
  assert.ok(!ids(at(3, 13, 25) + P.dauer + 0.5, MO).includes('k2-tag'));
  // a run of the evening before is still found after midnight
  const late = D.FAHRTEN.find(q => q.id === 'streife'),
    PL = D.plan(len(late), late),
    el = 1440 - (23 * 60 + 30) + 5;
  if (PL.dauer > el) assert.ok(D.unterwegs(at(4, 0, 5), MO, len, MO).some(r => r.f.id === 'streife'), 'the late round goes on after midnight');
  // a run the world cannot drive (no way on its roads) is not on the road
  assert.deepEqual(D.unterwegs(at(3, 6, 20), MO, () => null), []);
});

test('where vehicles stand: nothing parks at the moment (the haulier parks at its depot beyond the map)', () => {
  assert.deepEqual(D.parkt(at(3, 23, 0), MO), []);
});

test('a tour to follow: the haulier\'s lorry, in the order of the day, with places', () => {
  const T = D.tour('k1');
  assert.ok(T.length >= 2, JSON.stringify(T));
  assert.deepEqual(
    T.map(q => q.ab),
    T.map(q => q.ab).slice().sort()
  );
  assert.ok(T.some(q => /Außenlager/.test(q.was)), 'it goes to the yard');
  assert.ok(T.some(q => q.ab >= '22:00'), 'and once late at night');
  assert.ok(T.every(q => q.was && q.von && q.nach), 'every leg says what it does, where from, where to');
  assert.equal(D.hm(5 * 60 + 5), '05:05');
});

test('the pupils wait for the real school buses: on school days before 7:02 and 7:40, not on Saturdays or in the holidays', () => {
  assert.equal(D.schulbus(6 * 60 + 50, MO).linie, '268');
  assert.equal(D.schulbus(7 * 60 + 30, MO).linie, '214');
  assert.equal(D.schulbus(9 * 60, MO), null);
  assert.equal(D.schulbus(6 * 60 + 50, SA), null);
  assert.equal(D.schulbus(6 * 60 + 50, FERIEN), null);
  assert.equal(D.schulbus(6 * 60 + 50, FEIER), null);
  assert.equal(D.SCHULE.leute.length, D.SCHULE.plaetze.length);
});

test('the patrol drives its round only while nobody is wanted', () => {
  assert.equal(D.streife(0), true);
  assert.equal(D.streife(1), false);
  assert.equal(D.streife(5), false);
  assert.ok(D.FAHRTEN.find(f => f.fz === 'streife').streife);
});

test('nothing real: no real firm or brand, Hubert and Ronald never named', () => {
  const txt = JSON.stringify([D.FZ, D.FAHRTEN, D.PARKEN, D.SCHULE]);
  assert.ok(!/Hubert|Ronald/.test(txt));
  assert.ok(/Krähwinkel/.test(txt));
});

test('encounters on the way: the hitchhiker and the breakdown on the land by day, the hunter at dusk, each once in a quarter of an hour', () => {
  for (const k of ['anhalter', 'panne', 'jaeger']) assert.ok(G.EREIGNISSE[k], k + ' in the table');
  const ctx = (o = {}) => Object.assign({ t: 1000, dt: 1, frei: true, fahrt: true, ort: 'land', dunkel: false, laeuft: false }, o);
  const pick = (o, zul) => {
    const P = G.planNeu();
    P.fahrt = 999;
    P.zuletzt = zul || {};
    return G.plan(P, ctx(o), () => 0.999);
  };
  // the others of the land recently there: the new ones come by day on a country road
  const recent = { blitzer: 900, traktorstau: 900, wildunfall: 900 };
  const seen = new Set();
  for (let i = 0; i < 6; i++) {
    const k = pick({}, Object.assign({}, recent, Object.fromEntries([...seen].map(q => [q, 900]))));
    if (k) seen.add(k);
  }
  assert.ok(seen.has('anhalter') && seen.has('panne'), 'by day on the land: ' + [...seen]);
  assert.ok(!seen.has('jaeger'), 'no hunter on his high seat in broad daylight');
  // at dusk the hunter (and nothing that needs the day)
  const d = pick({ dunkel: true }, { blitzer: 900, traktorstau: 900, wildunfall: 900, panne: 900 });
  assert.ok(['jaeger', 'anhalter'].includes(d), 'at dusk: ' + d);
  assert.equal(pick({ dunkel: true }, { blitzer: 900, traktorstau: 900, wildunfall: 900, panne: 900, anhalter: 900 }), 'jaeger');
  // not in a village or the town, not in a mission
  for (const ort of ['dorf', 'stadt']) for (const k of ['anhalter', 'panne', 'jaeger']) assert.ok(!G.EREIGNISSE[k].wo.includes(ort), k + ' not in ' + ort);
  assert.equal(G.plan(G.planNeu(), ctx({ frei: false, t: 9999 }), () => 0), '');
});
