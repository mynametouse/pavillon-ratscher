// Unit tests of feat/grenzland's side games (grenzland/gl_neben_logik.js) without a browser: skittles, fishing, the shop on wheels.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLNLOGIK as G } from '../../src/grenzland/gl_neben_logik.js';

const mean = (n, f) => {
  let s = 0;
  for (let i = 1; i <= n; i++) s += f(i);
  return s / n;
};

test('skittles: nine pins in a diamond; a throw down the middle fells the middle row, a wild one runs off the lane, same seed same throw', () => {
  assert.equal(G.PINS.length, 9);
  const a = G.wurf(0, 0, 0, 0.8, null, 7);
  assert.equal(a.rinne, false);
  assert.ok(a.fallen.includes(0), 'the front pin');
  assert.ok(a.fallen.length >= 2 && a.fallen.length <= 9);
  assert.equal(new Set(a.fallen).size, a.fallen.length, 'no pin falls twice');
  assert.deepEqual(G.wurf(0, 0, 0, 0.8, null, 7), a);
  // what the picture needs: when and where each pin falls, the ball's way over the deck, the seconds it rolls
  assert.equal(a.falls.length, a.fallen.length);
  for (const f of a.falls) {
    assert.ok(f.t >= 0 && f.t < 2 && Math.abs(Math.hypot(f.dx, f.dy) - 1) < 1e-6, JSON.stringify(f));
    assert.ok(Math.abs(f.x) <= 0.96 && f.y > -0.6 && f.y < 1.4, 'a fallen pin stays on the deck ' + JSON.stringify(f));
  }
  assert.ok(a.kugel.length > 3 && a.kugel[0][2] < 0 && a.kugel[a.kugel.length - 1][2] > 0.5);
  assert.ok(a.sek > 1.5 && a.sek < 3, 'a throw of middle strength rolls about two seconds (' + a.sek + ')');
  assert.ok(G.wurf(0, 0, 0, 0.3, null, 7).sek > G.wurf(0, 0, 0, 1, null, 7).sek);
  assert.equal(a.stand.filter(Boolean).length, 9 - a.fallen.length);
  // off the lane before the pins: „Pudel“
  const p = G.wurf(0.5, 0.05, 0, 0.8, null, 7);
  assert.equal(p.rinne, true);
  assert.equal(p.fallen.length, 0);
  assert.ok(p.aus > 0 && p.aus < G.BAHN.L);
  assert.equal(G.ruf(0, true), 'Pudel!');
  assert.equal(G.ruf(9, false), 'Alle Neune!');
  // what lies does not fall again
  const b = G.wurf(0.1, 0, 0, 0.8, a.stand, 8);
  for (const i of b.fallen) assert.ok(a.stand[i]);
});

test('skittles: the best throw goes a little beside the front pin; the edge and the dead middle clear less; all nine is rare but real', () => {
  const avg = aim => mean(400, s => G.wurf(aim, 0, 0, 0.8, null, s).fallen.length);
  const mid = avg(0),
    gasse = avg(0.09),
    left = avg(-0.09),
    edge = avg(0.45);
  assert.ok(gasse > mid + 1.5 && left > mid + 1.5, 'beside the front pin ' + gasse + ' / ' + left + ' > the middle ' + mid);
  assert.ok(mid > edge + 0.8, 'the middle ' + mid + ' > the edge ' + edge);
  let neun = 0;
  for (let s = 1; s <= 600; s++) if (G.wurf(0.08, 0, 0, 0.85, null, s).fallen.length === 9) neun++;
  assert.ok(neun > 20 && neun < 300, 'all nine: ' + neun + ' of 600');
  // spin bends the ball's way, more at a slow throw; the direction moves it across
  assert.ok(G.bahn(0, 0, 1, 0.4)(19.5) > G.bahn(0, 0, 1, 1)(19.5) && G.bahn(0, 0, 1, 1)(19.5) > 0);
  assert.ok(Math.abs(G.bahn(0, 0.01, 0, 0.8)(19.5) - 0.195) < 0.002);
  // the one of the clique: a steadier arm scores more over many games, and a game stays within 0 … 45
  const game = (st, g) => {
    let n = 0;
    for (let w = 0; w < G.WUERFE; w++) {
      const q = G.gegner(st, g * 7 + w + 1);
      n += G.wurf(q.aim, q.dir, q.drall, q.kraft, null, g * 31 + w).fallen.length;
    }
    return n;
  };
  const lo = mean(300, g => game(0.1, g)),
    hi = mean(300, g => game(0.95, g));
  assert.ok(hi > lo && lo > 15 && hi < 42, lo + ' … ' + hi);
  assert.equal(G.summe([9, 7, 0, 5, 8]), 29);
});

test('fishing: carp bite on corn on a summer evening, pike on the lure in autumn; no pike on corn; weights within the species', () => {
  const s = G.biss(7, 20, 'mais'),
    a = G.biss(10, 8, 'blinker');
  assert.ok(s.karpfen > s.hecht * 20 && s.karpfen > s.rotauge);
  assert.ok(a.hecht > a.karpfen * 20);
  assert.ok(G.FISCH.karpfen.belegt && G.FISCH.silberkarpfen.belegt, 'the two species named for the Talsperre Ratscher');
  let n = 0,
    carp = 0,
    gross = 0;
  for (let i = 1; i <= 300; i++) {
    const f = G.fang(7, 20, 'mais', i);
    if (!f) continue;
    n++;
    if (f.art === 'karpfen') carp++;
    if (f.ding === 'karpfen_gross') {
      gross++;
      assert.ok(f.art === 'karpfen' && f.kg >= 2);
    } else assert.ok(f.art !== 'karpfen' || f.kg < 2);
    const F = G.FISCH[f.art];
    assert.ok(f.kg >= F.kg[0] - 0.01 && f.kg <= F.kg[1] + 0.01);
    assert.ok(f.eur > 0 && f.zug > 0);
    assert.ok(G.ANKAUF[f.ding] > 0, 'the shop buys it: ' + f.ding);
  }
  assert.ok(n > 100 && n < 300, 'sometimes nothing bites (' + n + ')');
  assert.ok(carp > n * 0.5, 'mostly carp (' + carp + ' of ' + n + ')');
  assert.ok(gross > 40, 'carp of two kilos and more are common enough for the cook in Suhl (' + gross + ')');
  assert.deepEqual(G.fang(7, 20, 'mais', 42), G.fang(7, 20, 'mais', 42));
  // also on a November evening (the mode begins on one) a carp can be had
  let nov = 0;
  for (let i = 1; i <= 300; i++) {
    const f = G.fang(11, 19, 'mais', i);
    if (f && f.ding === 'karpfen_gross') nov++;
  }
  assert.ok(nov > 30, 'November evening: ' + nov + ' big carp in 300 casts');
  // the wait: seconds within bounds, nibbles before the bite, shorter when more fish are about
  for (let i = 1; i <= 50; i++) {
    const w = G.warte(7, 20, 'mais', i);
    assert.ok(w.sek >= 5 && w.sek <= 48);
    for (const z of w.zupfer) assert.ok(z > 0 && z < w.sek);
  }
  assert.ok(mean(200, i => G.warte(7, 20, 'mais', i).sek) < mean(200, i => G.warte(1, 13, 'blinker', i).sek));
});

test('fishing: the fight – the line breaks when one only reels in a heavy fish, the fish gets off a slack line, a feeling hand lands it', () => {
  const run = (zug, seed, ctl) => {
    const D = G.drillNeu({ zug }, seed);
    let st = 'läuft',
      n = 0;
    while (st === 'läuft' && n++ < 9000) st = G.drill(D, 1 / 30, ctl(D));
    return [st, D];
  };
  const count = (zug, ctl) => {
    const c = { gelandet: 0, riss: 0, ab: 0, läuft: 0 };
    for (let s = 1; s <= 120; s++) c[run(zug, s, ctl)[0]]++;
    return c;
  };
  const hand = D => D.sp < 0.6;
  assert.equal(count(1.1, hand).gelandet, 120);
  assert.equal(count(0.3, hand).gelandet, 120);
  assert.ok(count(1.1, () => true).riss > 100, 'only reeling breaks the line of a heavy fish');
  assert.equal(count(0.3, () => true).gelandet, 120, 'a small fish is simply reeled in');
  assert.equal(count(0.8, () => false).ab, 120, 'never reeling: the fish gets off');
  const [st, D] = run(0.9, 5, hand);
  assert.equal(st, 'gelandet');
  assert.ok(D.t > 4 && D.t < 60 && D.dist <= 0.6, 'landed after ' + D.t + ' s');
  assert.equal(G.drill(D, 1, true), 'gelandet', 'over is over');
  assert.ok(G.BAND[0] < G.BAND[1] && G.ANHIEB > 0.5);
});

test('the shop on wheels: open in the morning and the late afternoon, a basket is rounded up to whole euros, fish are bought per piece', () => {
  assert.ok(G.offen(9 * 60) && G.offen(17 * 60 + 20) && !G.offen(13 * 60) && !G.offen(23 * 60) && !G.offen(3 * 60));
  assert.ok(G.offen(3 * 1440 + 9 * 60), 'the clock counts on over the days');
  assert.equal(G.bisOffen(9 * 60), 0);
  assert.equal(G.bisOffen(12 * 60), 210);
  assert.equal(G.bisOffen(19 * 60), 13 * 60);
  assert.match(G.zeitenText(), /8:00–11:30 und 15:30–18:30 Uhr/);
  const k = G.korb({ bratwurst: 1, mais: 2 });
  assert.equal(k.sum, 4.48);
  assert.equal(k.zahlen, 5);
  assert.equal(G.korb({ boeller: 1 }).zahlen, 6);
  assert.equal(G.korb({}).zahlen, 0);
  assert.equal(G.euro(2.5), '2,50 €');
  // every good has a key, a name and a price; what the side mission needs is on the shelf
  const keys = G.WAREN.map(w => w.k);
  assert.equal(new Set(keys).size, keys.length);
  for (const w of G.WAREN) assert.ok(w.name && w.eur > 0, w.k);
  for (const need of ['milchreis', 'worcester', 'mais', 'wurm', 'blinker', 'angelkarte', 'bratwurst', 'boeller'])
    assert.ok(keys.includes(need), need);
  // selling fish: everything, or everything but the big carp for Suhl
  const inv = { karpfen: 2, karpfen_gross: 1, hecht: 1, mais: 3 };
  const all = G.ankauf(inv),
    keep = G.ankauf(inv, { karpfen_gross: 1 });
  assert.equal(all.n, 4);
  assert.equal(all.eur, 2 * G.ANKAUF.karpfen + G.ANKAUF.karpfen_gross + G.ANKAUF.hecht);
  assert.equal(keep.n, 3);
  assert.equal(all.eur - keep.eur, G.ANKAUF.karpfen_gross);
  assert.equal(G.ankauf({ mais: 5 }).n, 0);
  for (const k2 of Object.keys(G.ANKAUF)) assert.ok(G.FISCHNAME[k2], k2);
});
