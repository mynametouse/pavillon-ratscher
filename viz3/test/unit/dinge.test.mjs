// Unit tests of the parking places' clock (dinge/dinge_zeit.js, feat/welt-dinge) without a browser: the shares by kind, weekday and hour
// are sensible (night full, workday mornings emptier, works yards the other way round, Sundays at home), they join at midnight, and the
// places follow the share – the same ones leave every morning more or less, the rest changes from day to day.
// Run: node --test viz3/test/unit/   (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DZEIT } from '../../src/dinge/dinge_zeit.js';

const H = h => h * 60; // minutes of day 0 (a Monday in these tests: weekday given apart)
const MO = 1,
  SA = 6,
  SO = 0;

test('every curve stays within 0…1 and joins at midnight (no jump at 0:00)', () => {
  for (const kind of DZEIT.KINDS)
    for (const day of ['werktag', 'samstag', 'sonntag']) {
      const K = DZEIT.CURVES[kind][day];
      assert.equal(K[0][0], 0, `${kind} ${day} starts at 0 h`);
      assert.equal(K[K.length - 1][0], 24, `${kind} ${day} ends at 24 h`);
      for (let h = 0; h <= 24; h += 0.25) {
        const v = DZEIT.curve(K, h);
        assert.ok(v >= 0 && v <= 1, `${kind} ${day} ${h} h: ${v}`);
      }
      assert.ok(Math.abs(K[0][1] - K[K.length - 1][1]) < 0.05, `${kind} ${day} 0 h and 24 h close`);
    }
});

test('drives: full at night, half empty on a workday morning, most at home on Sunday late morning', () => {
  assert.ok(DZEIT.share('hof', H(3), MO) > 0.9);
  assert.ok(DZEIT.share('hof', H(10), MO) < 0.6);
  assert.ok(DZEIT.share('hof', H(19), MO) > 0.8);
  assert.ok(DZEIT.share('hof', H(11), SO) > 0.75);
  assert.ok(DZEIT.share('hof', H(10.5), SA) < DZEIT.share('hof', H(3), SA));
});

test('works yards fill on workdays and empty at night and on Sundays; town kerbs are hardly ever empty', () => {
  assert.ok(DZEIT.share('betrieb', H(10), MO) > 0.85);
  assert.ok(DZEIT.share('betrieb', H(3), MO) < 0.2);
  assert.ok(DZEIT.share('betrieb', H(10), SO) < 0.2);
  for (const h of [3, 8, 10, 14, 19, 23]) assert.ok(DZEIT.share('stadt', H(h), MO) >= 0.65, `stadt ${h} h`);
});

test('many places follow the share of their kind', () => {
  for (const [kind, t, wd] of [
    ['hof', H(3), MO],
    ['hof', H(10), MO],
    ['strasse', H(10), MO],
    ['betrieb', H(10), MO],
    ['hof', H(11), SO],
  ]) {
    let n = 0;
    const N = 2000;
    for (let i = 0; i < N; i++) if (DZEIT.want(i, DZEIT.hash(i + 1, 3.7), kind, t, wd)) n++;
    const s = DZEIT.share(kind, t, wd);
    assert.ok(Math.abs(n / N - s) < 0.08, `${kind} ${t / 60} h: ${n / N} against ${s}`);
  }
});

test('the same places tend to leave every morning, yet not all days alike', () => {
  const N = 400,
    days = [0, 1, 2, 3, 4].map(d => d * 7 * 1440 + H(10)); // five Mondays at 10:00
  let same = 0,
    differ = 0;
  for (let i = 0; i < N; i++) {
    const habit = DZEIT.hash(i + 1, 3.7),
      v = days.map(t => DZEIT.want(i, habit, 'hof', t, MO));
    if (v.every(x => x === v[0])) same++;
    else differ++;
  }
  assert.ok(same > N * 0.5, `${same} places the same on five Mondays`);
  assert.ok(differ > N * 0.1, `${differ} places differ between Mondays`);
});
