// Unit tests of feat/grenzland-welt without a browser: what the police know (GLLOGIK.sicht / wissen – face, clothes, vehicle from
// sightings; change the facts and the knowledge goes), the rules' use of it (a mask: nobody is recognised by sight).
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLLOGIK as G } from '../../src/grenzland/gl_logik.js';

const falko = (o = {}) => Object.assign({ wer: 'm', kleid: 'karo', kopf: '', fz: '' }, o);
const wanted = () => {
  const W = G.fresh();
  G.crime(W, 'rempeln', { seen: 1 });
  return W;
};

test('nothing is known before anybody saw him', () => {
  const W = G.fresh();
  assert.deepEqual(G.wissen(W, falko()), { gesicht: false, kleidung: false, fahrzeug: false });
  assert.deepEqual(W.bild, G.bildLeer());
});

test('the face only close and in light, the clothes at a medium distance, the vehicle when seen in it', () => {
  const W = wanted();
  assert.deepEqual(G.sicht(W, falko(), { d: 60 }), [], 'from 60 m: nothing to make out');
  assert.deepEqual(G.sicht(W, falko(), { d: 25 }), ['kleidung', 'fuss'], 'from 25 m: the clothes (on foot)');
  assert.deepEqual(G.wissen(W, falko()), { gesicht: false, kleidung: true, fahrzeug: false });
  assert.equal(W.bild.wer, 'm', 'a man, they can tell');
  assert.deepEqual(G.sicht(W, falko(), { d: 6, dark: true }), [], 'at night 6 m is too far for a face');
  assert.deepEqual(G.sicht(W, falko(), { d: 3, dark: true }), ['gesicht'], 'a torch in the face from 3 m');
  assert.equal(G.wissen(W, falko()).gesicht, true);
  const V = wanted();
  assert.deepEqual(G.sicht(V, falko({ fz: 'moped' }), { d: 50 }), ['fahrzeug'], 'a vehicle from 50 m');
  assert.equal(V.fz, true, 'the vehicle is on record');
  assert.deepEqual(G.wissen(V, falko({ fz: 'moped' })), { gesicht: false, kleidung: false, fahrzeug: true });
  assert.deepEqual(G.sicht(V, falko({ fz: 'moped' }), { d: 50 }), [], 'the same again: nothing new');
});

test('a witness who knows the two names them: the face; a report without distance gives clothes and vehicle, never a face', () => {
  const W = wanted();
  assert.deepEqual(G.sicht(W, falko(), { d: 80, knows: true }), ['gesicht', 'kleidung'], 'Gerhard knows him from afar');
  const V = wanted();
  assert.deepEqual(G.sicht(V, falko({ fz: 'moped' }), {}), ['kleidung', 'fahrzeug']);
  assert.equal(V.bild.gesicht, false);
});

test('a helmet hides the face while worn and is clothing: the description does not fit any more', () => {
  const W = wanted();
  G.sicht(W, falko(), { d: 5 });
  assert.deepEqual(G.wissen(W, falko()), { gesicht: true, kleidung: true, fahrzeug: false });
  const helm = falko({ kopf: 'helm', fz: 'moped' });
  assert.deepEqual(G.wissen(W, helm), { gesicht: false, kleidung: false, fahrzeug: false }, 'helmet on, on the moped');
  assert.deepEqual(G.wissen(W, falko()), { gesicht: true, kleidung: true, fahrzeug: false }, 'off again: he is the one described');
  assert.deepEqual(G.sicht(W, helm, { d: 5 }), ['kleidung', 'fahrzeug'], 'seen with the helmet close by: no new face, new clothes');
  assert.equal(W.bild.kopf, 'helm');
  assert.deepEqual(G.wissen(W, helm), { gesicht: false, kleidung: true, fahrzeug: true });
});

test('another jacket resets the clothes; leaving the vehicle unseen resets the vehicle; the old description stays theirs', () => {
  const W = wanted();
  G.sicht(W, falko({ fz: 'moped' }), { d: 20 });
  assert.deepEqual(G.wissen(W, falko({ fz: 'moped' })), { gesicht: false, kleidung: true, fahrzeug: true });
  assert.deepEqual(G.wissen(W, falko({ kleid: 'warn' })), { gesicht: false, kleidung: false, fahrzeug: false });
  assert.equal(W.bild.kleid, 'karo', 'they still look for the red checked shirt');
  assert.equal(W.bild.fz, 'moped', 'and for the moped');
  // seen on foot now, from close by: the new description
  assert.deepEqual(G.sicht(W, falko({ kleid: 'warn' }), { d: 12 }), ['kleidung', 'fuss']);
  assert.equal(W.bild.fuss, true);
  assert.deepEqual(G.wissen(W, falko({ kleid: 'warn', fz: 'moped' })), { gesicht: false, kleidung: true, fahrzeug: true });
});

test('a new plate: the vehicle is unknown again; the search over: the description goes, the vehicle on record stays', () => {
  const W = wanted();
  G.sicht(W, falko({ fz: 'moped' }), { d: 20 });
  G.umkennzeichnen(W);
  assert.equal(G.wissen(W, falko({ fz: 'moped' })).fahrzeug, false);
  const V = wanted();
  G.sicht(V, falko({ fz: 'moped' }), { d: 5 });
  G.clear(V);
  assert.equal(V.bild.kleid, '');
  assert.equal(V.bild.gesicht, false);
  assert.equal(V.bild.fz, 'moped', 'the moped is on record');
  assert.equal(G.wissen(V, falko({ fz: 'moped' })).fahrzeug, true);
  const U = wanted();
  G.sicht(U, falko(), { d: 20 });
  assert.equal(G.umziehen(U), 'frei');
  assert.equal(U.bild.kleid, '', 'new clothes at the bungalow: no description');
});

test('the stars: a mask keeps them hollow (nobody is recognised by sight), a description that fits nothing runs out sooner', () => {
  const W = wanted(),
    V = wanted();
  for (let i = 0; i < 40; i++) {
    G.tick(W, 0.1, { seen: true, close: true, maske: true });
    G.tick(V, 0.1, { seen: true, close: true });
  }
  assert.equal(W.known, false, 'helmet on: hollow stars');
  assert.equal(V.known, true, 'without: they know him after a second and a half from close by');
  const A = wanted(),
    B = wanted();
  let ta = 0,
    tb = 0;
  while (G.stars(A) > 0 && ta < 200) (G.tick(A, 0.5, {}), (ta += 0.5));
  while (G.stars(B) > 0 && tb < 200) (G.tick(B, 0.5, { fremd: true }), (tb += 0.5));
  assert.ok(tb < ta * 0.8, 'nothing fits: sooner (' + tb + ' s against ' + ta + ' s)');
});

test('random events: only in free play, after minutes of driving, where they fit, one at a time, not twice within 15 minutes', () => {
  const P = G.planNeu(),
    r = () => 0;
  const ctx = (o = {}) => Object.assign({ t: 0, dt: 10, frei: true, fahrt: true, ort: 'land', dunkel: false, laeuft: false }, o);
  for (let i = 0; i < 14; i++) assert.equal(G.plan(P, ctx({ t: i * 10 }), r), '', 'not before two and a half minutes of driving');
  assert.equal(G.plan(P, ctx({ t: 150, frei: false }), r), '', 'never in a mission (nor in 1989)');
  assert.equal(G.plan(P, ctx({ t: 150, laeuft: true }), r), '', 'one at a time');
  assert.equal(G.plan(P, ctx({ t: 150, fahrt: false, dt: 1000 }), r), '', 'standing about does not count');
  const k = G.plan(P, ctx({ t: 160 }), r);
  assert.ok(['blitzer', 'traktorstau'].includes(k), 'on a country road by day: the speed camera or the harvest lorry – ' + k);
  assert.equal(P.fahrt, 0);
  assert.ok(P.next >= 150 && P.next <= 300);
  // the same again only after a quarter of an hour
  const Q = G.planNeu();
  Q.zuletzt = { blitzer: 100, traktorstau: 100 };
  Q.fahrt = 999;
  assert.equal(G.plan(Q, ctx({ t: 500 }), r), '', 'both were there a few minutes ago');
  assert.equal(G.plan(Q, ctx({ t: 1100 }), r), 'blitzer');
  // where they fit
  const town = G.planNeu();
  town.fahrt = 999;
  assert.ok(['korso', 'boeller'].includes(G.plan(town, ctx({ ort: 'stadt' }), r)));
  const dusk = G.planNeu();
  dusk.fahrt = 999;
  dusk.zuletzt = { blitzer: 0, traktorstau: 0 };
  assert.equal(G.plan(dusk, ctx({ t: 300, dunkel: true }), r), 'wildunfall', 'a deer at dusk');
  const vil = G.planNeu();
  vil.fahrt = 999;
  vil.zuletzt = { blitzer: 0, boeller: 0 };
  assert.equal(G.plan(vil, ctx({ t: 300, ort: 'dorf' }), r), 'kirmes');
  vil.fahrt = 999;
  assert.equal(G.plan(vil, ctx({ t: 400, ort: 'dorf', dunkel: true }), r), '', 'no fair at night');
});
