// feat/strategie: unit tests of the pure logic of „Ratscher von oben“ (viz3/src/strategie/st_core.js, st_data.js) without a browser –
// the holidays of Thuringia, who is there when (weekends, holidays, a vacation), the neighbours' hours, quiet hours and their reasons,
// PV yield by season and clouds, the power station, levels, needs and how they change the work. Run: node --test "viz3/test/unit/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STCORE as C } from '../../src/strategie/st_core.js';
import { STDATA as D } from '../../src/strategie/st_data.js';

const day = (y, m, d) => new Date(Date.UTC(y, m - 1, d));

test('Easter and the holidays of Thuringia', () => {
  assert.equal(C.iso(C.easter(2026)), '2026-04-05');
  assert.equal(C.iso(C.easter(2027)), '2027-03-28');
  const H = C.holidays(2026);
  assert.equal(H['2026-04-03'], 'Karfreitag');
  assert.equal(H['2026-05-14'], 'Christi Himmelfahrt');
  assert.equal(H['2026-05-25'], 'Pfingstmontag');
  assert.equal(H['2026-09-20'], 'Weltkindertag', 'Thuringia since 2019');
  assert.equal(H['2026-10-31'], 'Reformationstag');
  assert.equal(Object.keys(H).length, 11);
  assert.equal(C.day(day(2026, 11, 8)).wdName, 'Sonntag');
});

test('your people are there from Friday evening to Sunday afternoon', () => {
  const fr = day(2026, 11, 6),
    sa = day(2026, 11, 7),
    so = day(2026, 11, 8),
    mo = day(2026, 11, 9);
  assert.equal(C.ownPresent(fr, 12 * 60), false, 'Friday noon: still at work');
  assert.equal(C.ownPresent(fr, 20 * 60), true, 'Friday evening: arrived');
  assert.equal(C.ownPresent(sa, 3 * 60), true, 'the night to Saturday on site');
  assert.equal(C.ownPresent(so, 15 * 60), true, 'Sunday 15:00');
  assert.equal(C.ownPresent(so, 16 * 60 + 30), false, 'Sunday after 16:00: gone');
  assert.equal(C.ownPresent(mo, 10 * 60), false, 'Monday: the week');
  // a holiday on Monday (Pfingstmontag 2026): they stay until Monday afternoon
  assert.equal(C.ownPresent(day(2026, 5, 24), 18 * 60), true, 'Pfingstsonntag evening');
  assert.equal(C.ownPresent(day(2026, 5, 25), 12 * 60), true, 'Pfingstmontag noon');
  assert.equal(C.ownPresent(day(2026, 5, 25), 17 * 60), false, 'Pfingstmontag after 16:00');
  // Ascension Thursday: they come on Wednesday evening
  assert.equal(C.ownPresent(day(2026, 5, 13), 20 * 60), true, 'the evening before Himmelfahrt');
  // a vacation week
  const plan = { urlaub: [{ from: '2026-11-09', to: '2026-11-13' }] };
  assert.equal(C.ownPresent(mo, 10 * 60, plan), true, 'vacation: Monday on site');
  assert.equal(C.ownPresent(day(2026, 11, 13), 10 * 60, plan), true, 'vacation: Friday');
  // when they come next
  const m = C.nextArrival(mo, 8 * 60);
  assert.equal(m, 4 * 1440 + 19 * 60 + 30 - 8 * 60, 'next Friday 19:30');
});

test('the neighbours help by day, Monday to Saturday', () => {
  assert.equal(C.npcPresent(day(2026, 11, 9), 10 * 60).ok, true);
  assert.equal(C.npcPresent(day(2026, 11, 7), 10 * 60).ok, true, 'Saturday');
  assert.equal(C.npcPresent(day(2026, 11, 8), 10 * 60).why, 'ruhe_sonntag');
  assert.equal(C.npcPresent(day(2026, 11, 9), 23 * 60).why, 'nachts_daheim');
  assert.equal(C.npcPresent(day(2026, 10, 3), 10 * 60).ok, false, 'a holiday');
});

test('quiet hours: Sundays, holidays, nights – each with its reason and source', () => {
  const so = day(2026, 11, 8),
    mo = day(2026, 11, 9);
  assert.equal(C.rule(so, 10 * 60, { loud: true, where: 'dorf' }), 'ruhe_sonntag');
  assert.equal(C.rule(mo, 10 * 60, { loud: true, where: 'dorf' }), null);
  assert.equal(C.rule(mo, 6 * 60 + 30, { loud: true, where: 'dorf' }), 'ruhe_nacht');
  assert.equal(C.rule(mo, 20 * 60 + 5, { loud: true, where: 'dorf' }), 'ruhe_nacht');
  assert.equal(C.rule(mo, 19 * 60 + 55, { loud: false, where: 'dorf' }), null, 'quiet work is fine');
  assert.equal(C.rule(mo, 16 * 60 + 50, { where: 'wald', sun: { up: 7 * 60, down: 17 * 60 } }), 'tageslicht');
  assert.equal(C.rule(day(2026, 12, 25), 11 * 60, { loud: true, where: 'dorf' }), 'ruhe_sonntag');
  for (const k of Object.keys(D.RULES)) {
    const R = C.why(k);
    assert.ok(R.text && R.why && R.src, 'rule ' + k + ' explains itself with a source');
  }
});

test('PV: a sunny June day gives far more than a grey December day', () => {
  const jun = C.pvDayKWh(5, 0.1),
    dec = C.pvDayKWh(11, 0.9);
  assert.ok(jun > 4 && jun < 5.5, 'June, clear: ' + jun);
  assert.ok(dec < 0.4, 'December, overcast: ' + dec);
  // the power over the day integrates to the day's yield
  const sun = { up: 5 * 60, down: 21 * 60 + 30 };
  let e = 0;
  for (let m = 0; m < 1440; m++) e += C.pvW(5, m + 0.5, sun, 0.1) / 60;
  assert.ok(Math.abs(e / 1000 - jun) / jun < 0.02, 'integral ' + e);
  assert.equal(C.pvW(5, 3 * 60, sun, 0), 0, 'no sun at night');
  // the station: a 2-kW saw for an hour empties 2 kWh, a sunny noon refills it
  let b = C.battery(2, 2, 0, 2000, 60);
  assert.ok(b.soc < 0.05 && b.short > 0, 'empty after an hour of sawing: ' + JSON.stringify(b));
  b = C.battery(0.5, 2, 600, 0, 120);
  assert.ok(b.soc > 1.5 && b.soc <= 2, 'charged by PV: ' + b.soc);
});

test('levels, needs and the stars of delegated work', () => {
  assert.equal(C.level(0), 1);
  assert.equal(C.level(D.XP_LEVEL(2)), 2);
  assert.equal(C.level(D.XP_LEVEL(5) + 1), 5);
  const rested = { energy: 90, food: 85, mood: 80 },
    tired = { energy: 15, food: 30, mood: 30 };
  assert.ok(C.eff(rested) > 0.95 && C.eff(tired) < 0.6, C.eff(rested) + ' ' + C.eff(tired));
  const nd = { energy: 80, food: 80, mood: 70 };
  C.needs(nd, 240, 'arbeit', 1);
  assert.ok(nd.energy < 45, 'four hours of hard work tire: ' + nd.energy);
  C.needs(nd, 480, 'schlaf');
  assert.ok(nd.energy > 95, 'a night restores: ' + nd.energy);
  assert.equal(C.stars(5, 1, 0.5, 0), 5);
  assert.ok(C.stars(1, 0.6, 0.5, 0) <= 2);
  assert.ok(C.stars(3, 1, 0.5, 1) > C.stars(3, 1, 0.5, 0), 'the master piece is one star better');
});

test('paths: length and the point along it', () => {
  const pts = [
    [0, 0],
    [30, 0],
    [30, 40],
  ];
  assert.equal(C.pathLen(pts), 70);
  const q = C.pathAt(pts, 50);
  assert.ok(Math.abs(q[0] - 30) < 1e-9 && Math.abs(q[1] - 20) < 1e-9);
  assert.deepEqual(C.pathAt(pts, 999).slice(0, 2), [30, 40]);
});

test('every price names its source or assumption', () => {
  for (const [k, p] of Object.entries(D.PRICES)) assert.ok(p.eur > 0 && p.src && p.label, 'price ' + k);
});
