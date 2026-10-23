// Unit tests of the garden planner's sun and shade (gplan/gplan_sun.js) without a browser: the sun over Ratscher at known dates,
// summer time, shadows of a crown and of a box, the share of a day in shade. Run: node --test "viz3/test/unit/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GPSUN as S } from '../../src/gplan/gplan_sun.js';

const near = (a, b, tol, what) =>
  assert.ok(Math.abs(a - b) <= tol, what + ': ' + a + ' (expected ' + b + ' ± ' + tol + ')');

test('summer time: CEST from the last Sunday in March to the last Sunday in October', () => {
  assert.equal(S.tz(2026, 3, 28), 1);
  assert.equal(S.tz(2026, 3, 29), 2);
  assert.equal(S.tz(2026, 10, 24), 2);
  assert.equal(S.tz(2026, 10, 25), 1);
  assert.equal(S.tz(2026, 1, 15), 1);
});

test('the sun over Ratscher: highest at noon, as high as the latitude allows', () => {
  // 21 June: about 90 − 50.5 + 23.44 = 62.9° at local solar noon (≈ 13:19 CEST at 10.77° E)
  let best = { el: -90 };
  for (let h = 11; h <= 15; h += 1 / 60) {
    const s = S.sun(2026, 6, 21, h);
    if (s.el > best.el) best = { ...s, h };
  }
  near(best.el, 62.9, 0.3, 'June noon elevation');
  near(best.az, 180, 1.5, 'June noon azimuth');
  near(best.h, 13.32, 0.1, 'June solar noon (CEST)');
  // 21 December: about 16° at noon (CET)
  let wel = -90;
  for (let h = 11; h <= 13.5; h += 1 / 60) wel = Math.max(wel, S.sun(2026, 12, 21, h).el);
  near(wel, 16.1, 0.4, 'December noon elevation');
  // equinox: rises close to east
  const r = S.dayLight(2026, 3, 20);
  const sr = S.sun(2026, 3, 20, r.rise);
  near(sr.az, 90, 4, 'equinox sunrise azimuth');
  assert.ok(r.set - r.rise > 11.8 && r.set - r.rise < 12.5, 'equinox day length ' + (r.set - r.rise));
  // morning sun in the east, evening sun in the west
  assert.ok(S.sun(2026, 6, 21, 8).az < 110 && S.sun(2026, 6, 21, 19).az > 250);
});

test('the shadow of a crown: an ellipse away from the sun, longer when the sun is low', () => {
  const c = { zb: 1, zc: 3, a: 2, r: 2 };
  const e = S.crownShadow(0, 0, c, 180, 45);
  near(e.cx, 0, 1e-9, 'sun in the south: no sideways shift');
  near(e.cy, 3, 1e-9, 'centre moves north by zc · cot(45°)');
  near(e.A, Math.hypot(2, 2), 1e-9, 'along');
  near(e.B, 2, 1e-9, 'across');
  assert.ok(S.inEllipse(e, 0, 3) && S.inEllipse(e, 0, 5.5) && !S.inEllipse(e, 0, -1) && !S.inEllipse(e, 2.5, 3));
  const low = S.crownShadow(0, 0, c, 180, 15);
  assert.ok(low.A > e.A * 2 && low.cy > e.cy * 3);
  assert.equal(S.crownShadow(0, 0, c, 180, -2), null, 'no shadow at night');
  assert.equal(S.crownShadow(0, 0, c, 180, 45, 6), null, 'nothing above the crown');
  const poly = S.ellipsePoly(e, 20);
  assert.equal(poly.length, 20);
  for (const p of poly) near((p[0] / e.B) ** 2 + ((p[1] - e.cy) / e.A) ** 2, 1, 1e-9, 'on the ellipse');
  const t = S.trunkShadow(0, 0, 1, 0.1, 270, 45);
  assert.ok(t.every(p => p[0] >= -1e-9) && Math.max(...t.map(p => p[0])) > 0.99, 'sun in the west: trunk shadow east');
});

test('the shadow of a box (a building): hull of the foot and the moved roof', () => {
  const foot = [
    [0, 0],
    [3, 0],
    [3, 3],
    [0, 3],
  ];
  const p = S.boxShadow(foot, 3, 180, 45);
  assert.ok(S.inConvex(p, 1.5, 5), 'two metres north of the wall: shade');
  assert.ok(!S.inConvex(p, 1.5, 6.5), 'beyond the length of the shadow: sun');
  assert.ok(!S.inConvex(p, 1.5, -0.5), 'south of the box: sun');
  assert.ok(S.inConvex(S.hull([...foot, [1, 1]]), 1, 1));
  assert.equal(S.hull([...foot, [1, 1]]).length, 4);
});

test('share of a June day in shade: north of a tree yes, south of it no', () => {
  const tree = { x: 0, y: 0, c: { zb: 2, zc: 6, a: 4, r: 3 } };
  const north = S.shadeShare(0, 3, 0.5, [tree], 2026, 6, 21).share,
    south = S.shadeShare(0, -6, 0.5, [tree], 2026, 6, 21).share;
  assert.ok(north > 0.2, 'north ' + north);
  assert.equal(south, 0);
  // under a low, wide crown most of the day; under a high crown the low sun of morning and evening comes in from the side
  const low = { x: 0, y: 0, c: { zb: 0.5, zc: 3.5, a: 3, r: 3 } };
  const under = S.shadeShare(0, 0.5, 0.3, [low], 2026, 6, 21).share;
  assert.ok(under > 0.6, 'under the crown ' + under);
  assert.ok(S.shadeShare(0, 0.5, 0.3, [tree], 2026, 6, 21).share < under);
  // north of a building in June: the sun comes round in the morning and the evening
  const box = {
    foot: [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ],
    h: 7,
  };
  const nb = S.shadeShare(2, 4.5, 0.9, [box], 2026, 6, 21).share;
  assert.ok(nb > 0.3 && nb < 0.6, 'north of a building ' + nb);
  // in December the low sun throws the shadow far north
  const far = S.shadeShare(0, 14, 0.5, [tree], 2026, 12, 21).share;
  assert.ok(far > 0.2, 'December far north ' + far);
  assert.equal(S.shadeShare(0, 14, 0.5, [tree], 2026, 6, 21).share, 0);
});
