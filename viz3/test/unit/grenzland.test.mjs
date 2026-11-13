// Unit tests of feat/grenzland's rules (grenzland/gl_logik.js) without a browser: the wanted level counts only what was seen, hollow and
// filled stars, losing the police, the answer per star, the fine; witnesses.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLLOGIK as G } from '../../src/grenzland/gl_logik.js';

test('a deed nobody saw is no deed; one witness starts the search with hollow stars', () => {
  const W = G.fresh();
  assert.equal(G.crime(W, 'autoklau', { seen: 0 }), 0);
  assert.equal(G.stars(W), 0);
  assert.equal(W.state, 'ruhe');
  assert.equal(W.log.length, 1, 'it is still remembered (the radio may tell of it)');
  assert.equal(G.crime(W, 'autoklau', { seen: 1 }), 1);
  assert.equal(G.stars(W), 1);
  assert.equal(W.state, 'gesucht');
  assert.equal(W.known, false, 'a stranger saw it: they look for a description');
  assert.equal(G.crime(W, 'nonsense', { seen: 3 }), 0, 'unknown deeds count nothing');
});

test('a witness who knows the two, or an officer, fills the stars; heat is capped at five stars', () => {
  const W = G.fresh();
  G.crime(W, 'rempeln', { seen: 1, knows: true });
  assert.equal(W.known, true);
  const V = G.fresh();
  G.crime(V, 'schlag', { police: true });
  assert.equal(V.known, true);
  assert.ok(V.heat > G.CRIMES.schlag.h, 'seen by the police weighs more');
  for (let i = 0; i < 20; i++) G.crime(V, 'einbruch', { seen: 2 });
  assert.equal(G.stars(V), 5);
  assert.ok(V.heat <= G.MAX);
});

test('seen from close by the police know who it is; out of sight the stars go one by one, sooner in hiding', () => {
  const W = G.fresh();
  G.crime(W, 'einbruch', { seen: 1 }); // two stars
  assert.equal(G.stars(W), 2);
  assert.equal(G.tick(W, 0.5, { seen: true, close: true }), 'gesehen');
  assert.equal(W.state, 'verfolgt');
  let ev = null;
  for (let i = 0; i < 4 && ev !== 'erkannt'; i++) ev = G.tick(W, 0.5, { seen: true, close: true });
  assert.equal(ev, 'erkannt');
  assert.equal(W.known, true);
  assert.equal(G.tick(W, 0.5, {}), 'verloren');
  // out of sight in the open
  let t = 0,
    got = null;
  while (t < 200 && got !== 'stern') {
    got = G.tick(W, 0.5, {});
    t += 0.5;
  }
  assert.equal(got, 'stern');
  assert.equal(G.stars(W), 1);
  const open = t;
  // the last star in a hiding place: sooner
  t = 0;
  got = null;
  while (t < 200 && got !== 'entkommen') {
    got = G.tick(W, 0.5, { hidden: true });
    t += 0.5;
  }
  assert.equal(got, 'entkommen');
  assert.equal(W.state, 'ruhe');
  assert.equal(W.known, false);
  assert.ok(t < open, 'hiding is quicker than waiting in the open (' + t + ' < ' + open + ')');
  assert.equal(G.tick(W, 1, { seen: true }), null, 'nobody looks for someone who is not wanted');
});

test('hollow stars go sooner than filled ones; apart, one star less is shown', () => {
  const A = G.fresh(),
    B = G.fresh();
  G.crime(A, 'einbruch', { seen: 1 });
  G.crime(B, 'einbruch', { seen: 1, knows: true });
  assert.ok(G.loseT(A) < G.loseT(B));
  assert.equal(G.stars(B), 2);
  G.tick(B, 0.1, { split: true });
  assert.equal(G.stars(B), 1);
  G.tick(B, 0.1, { split: false });
  assert.equal(G.stars(B), 2);
  const C = G.fresh();
  G.crime(C, 'rempeln', { seen: 1 });
  G.tick(C, 0.1, { split: true });
  assert.equal(G.stars(C), 1, 'never below one while wanted');
});

test('the answer grows with the stars; the fine never takes more than one has', () => {
  assert.deepEqual(G.antwort(0), { cars: 0, sperre: false, heli: false, sek: false, delay: 0 });
  assert.equal(G.antwort(1).cars, 1);
  assert.ok(G.antwort(1).delay > G.antwort(3).delay, 'the first patrol takes its time – it is the countryside');
  assert.equal(G.antwort(3).sperre, true);
  assert.equal(G.antwort(4).heli, true);
  assert.equal(G.antwort(5).sek, true);
  const W = G.fresh();
  G.crime(W, 'einbruch', { police: true });
  assert.equal(G.busse(W, 20), 20);
  assert.ok(G.busse(W, 5000) > 100 && G.busse(W, 5000) < 500);
  G.clear(W);
  assert.equal(G.stars(W), 0);
  assert.equal(W.log.length, 1);
});

test('witnesses: reach, the half circle ahead, the dark, sneaking, cover', () => {
  const w = { x: 0, y: 0, hd: 0, r: 30 }; // looks north
  assert.equal(G.sieht(w, 0, 20), true);
  assert.equal(G.sieht(w, 0, 40), false, 'too far');
  assert.equal(G.sieht(w, 0, -20), false, 'behind his back');
  assert.equal(G.sieht(w, 0, -3), true, 'right behind him he notices');
  assert.equal(G.sieht(w, 0, 20, { dark: true }), false);
  assert.equal(G.sieht(w, 0, 12, { dark: true }), true);
  assert.equal(G.sieht(w, 0, 20, { sneak: true }), false);
  assert.equal(G.sieht({ x: 0, y: 0, hd: null, r: 30 }, 0, -20), true, 'somebody looking around sees all round');
});

test('while the police are still on their way the search cannot run out', () => {
  const W = G.fresh();
  G.crime(W, 'einbruch', { seen: 1 });
  for (let i = 0; i < 400; i++) assert.equal(G.tick(W, 0.5, { hold: true }), null);
  assert.equal(G.stars(W), 2);
  let ev = null;
  for (let i = 0; i < 400 && !ev; i++) ev = G.tick(W, 0.5, {});
  assert.equal(ev, 'stern');
});
