// Unit tests of feat/grenzland's side games (grenzland/gl_neben_logik.js) without a browser: skittles and fishing.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLNLOGIK as G } from '../../src/grenzland/gl_neben_logik.js';

test('skittles: nine pins in a diamond; a throw down the middle fells some, a wild one runs off the lane, same seed same throw', () => {
  assert.equal(G.PINS.length, 9);
  const a = G.wurf(0, 0, 0, 0.8, null, 7);
  assert.equal(a.rinne, false);
  assert.ok(a.fallen.includes(0), 'the front pin');
  assert.ok(a.fallen.length >= 2 && a.fallen.length <= 9);
  assert.equal(new Set(a.fallen).size, a.fallen.length, 'no pin falls twice');
  assert.deepEqual(G.wurf(0, 0, 0, 0.8, null, 7), a);
  assert.equal(G.wurf(0.5, 0.05, 0, 0.8, null, 7).rinne, true);
  // what lies does not fall again
  const st = G.PINS.map((_, i) => !a.fallen.includes(i)),
    b = G.wurf(0, 0, 0, 0.8, st, 8);
  for (const i of b.fallen) assert.ok(st[i]);
  // over many throws the middle is better than the edge
  let mid = 0,
    edge = 0;
  for (let s = 1; s <= 200; s++) {
    mid += G.wurf(0, 0, 0, 0.8, null, s).fallen.length;
    edge += G.wurf(0.45, 0, 0, 0.8, null, s).fallen.length;
  }
  assert.ok(mid > edge * 1.5, mid + ' > ' + edge);
});

test('fishing: carp bite on corn on a summer evening, pike on the lure in autumn; weights within the species', () => {
  const s = G.biss(7, 20, 'mais'),
    a = G.biss(10, 8, 'blinker');
  assert.ok(s.karpfen > s.hecht && s.karpfen > s.rotauge);
  assert.ok(a.hecht > a.karpfen);
  let n = 0,
    carp = 0;
  for (let i = 1; i <= 300; i++) {
    const f = G.fang(7, 20, 'mais', i);
    if (!f) continue;
    n++;
    if (f.art === 'karpfen') carp++;
    const F = G.FISCH[f.art];
    assert.ok(f.kg >= F.kg[0] - 0.01 && f.kg <= F.kg[1] + 0.01);
    assert.ok(f.eur > 0 && f.zug > 0);
  }
  assert.ok(n > 100 && n < 300, 'sometimes nothing bites (' + n + ')');
  assert.ok(carp > n * 0.5, 'mostly carp (' + carp + ' of ' + n + ')');
  assert.deepEqual(G.fang(7, 20, 'mais', 42), G.fang(7, 20, 'mais', 42));
});
