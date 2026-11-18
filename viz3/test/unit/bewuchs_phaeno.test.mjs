// Unit tests of feat/bewuchs's pure year of the vegetation (bewuchs/bw_phaeno.js): heights of lawns and meadows through the year, the cuts,
// the colours, the shader's table. Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { BWPHAENO as P } from '../../src/bewuchs/bw_phaeno.js';

const K = P.K;
const near = (a, b, tol) => Math.abs(a - b) <= tol;

test('classes: ids 0–17 named (and 18, the own lawn of the garden), every one in the table', () => {
  assert.equal(P.CLASSES.length, 23);
  assert.deepEqual(P.CLASSES.slice(19), ['wintergetreide', 'raps', 'hackfrucht', 'kleegras']);
  for (let c = 0; c < 19; c++) assert.ok(K[c], 'class ' + c);
  assert.ok(!K[18].mow, 'only the player mows the garden');
  assert.equal(P.CLASSES[1], 'zierrasen');
  assert.equal(P.CLASSES[4], 'maehwiese');
});

test('a lawn mown weekly stays between ~3.5 and ~7 cm in May, never above its uncut height', () => {
  const k = K[1];
  let lo = 9,
    hi = 0;
  for (let d = 130; d < 145; d += 0.25)
    for (const off of [0, 1.5, 3.2, 5.9]) {
      const h = P.heightAt(k, d, off);
      lo = Math.min(lo, h);
      hi = Math.max(hi, h);
      assert.ok(h <= P.seasonH(k, d) + 1e-9);
    }
  assert.ok(lo >= 0.034 && lo < 0.045, 'just mown ' + lo);
  assert.ok(hi > 0.05 && hi < 0.075, 'a week after ' + hi);
});

test('a hay meadow: knee to hip high before the first cut (early June), short after it, grown again by late July', () => {
  const k = K[4];
  const before = P.heightAt(k, 155, 0),
    after = P.heightAt(k, 160, 0),
    july = P.heightAt(k, 205, 0);
  assert.ok(before > 0.75 && before <= k.hMax, 'before ' + before);
  assert.ok(after < 0.12, 'after ' + after);
  assert.ok(july > 0.3 && july < 0.8, 'regrown ' + july);
  // each field on its own day: one cut a week later is still high when the other is short
  assert.ok(P.heightAt(k, 160, 7) > 0.75);
});

test('winter: low and lodged; spring: it starts again', () => {
  for (const c of [1, 4, 7]) {
    const w = P.heightAt(K[c], 20, 0),
      s = P.seasonH(K[c], 120);
    assert.ok(w < s + 1e-9, 'class ' + c);
  }
  assert.equal(P.rate(K[4], 15), 0);
  assert.ok(P.rate(K[4], 140) > P.rate(K[4], 100));
});

test('colours: sRGB in 0–1, greener in May than in January, yellower in August', () => {
  for (let c = 0; c < 19; c++)
    for (const d of [1, 60, 120, 180, 230, 290, 350]) {
      const col = P.colour(K[c], d);
      assert.equal(col.length, 3);
      for (const v of col) assert.ok(v >= 0 && v <= 1);
    }
  const may = P.colour(K[4], 135),
    jan = P.colour(K[4], 15),
    aug = P.colour(K[4], 228);
  assert.ok(may[1] - may[0] > jan[1] - jan[0]);
  assert.ok(aug[0] > may[0]);
});

test('the shader table: 5 texels × 32 classes, the lawn row as given', () => {
  const T = P.table(140),
    W = P.TW * 4;
  assert.equal(T.length, P.TW * 32 * 4);
  const o = 1 * W;
  assert.ok(near(T[o], K[1].h0, 1e-6));
  assert.ok(T[o + 1] > 0.05);
  assert.equal(T[o + 4], 7);
  assert.ok(T[o + 11] > 0.9);
  // after the mowing season: a last cut on its last day (the sward stays short through the winter)
  const N = P.table(320);
  assert.equal(N[o + 4], 0);
  assert.equal(N[o + 5], K[1].mow.to);
  // nothing grows on class 0, the fields and beds are empty until their stages
  for (const c of [0, 9, 13, 14]) assert.equal(T[c * W + 11], 0, 'class ' + c);
  // seed heads only in summer
  assert.ok(T[4 * W + 15] === 0);
  assert.ok(P.table(165)[4 * W + 15] > 0.5);
  // a hay meadow: two cuts, all fields
  assert.ok(T[4 * W + 5] > 150 && T[4 * W + 6] > 200 && T[4 * W + 17] === 1);
});

test('the species table (BWARTEN shape): areas become the class table', () => {
  const save = {};
  for (const c of [1, 4, 5, 18]) save[c] = K[c];
  const A = {
    gras: {
      a: {
        breite_mm: [2, 4],
        biegung: 0.4,
        farbe: { frisch: '#5a8a30', sommer: '#608238', trocken: '#8a864a', herbst: '#6a7840', winter: '#807c58' },
        aehre: { anteil: 0.5 },
      },
    },
    flaechen: {
      1: {
        dichte: 1,
        gras: { a: 1 },
        blumen: { x: 2, y: 1 },
        hoehe: {
          gemaeht_m: 0.04,
          max_m: 0.2,
          wachstum_cm_tag: [0, 0, 0.05, 0.3, 0.7, 0.6, 0.35, 0.35, 0.4, 0.2, 0.05, 0],
          winter: 0.7,
        },
        pflege: { art: 'rasen', von: 100, bis: 295, alle_tage: [0, 0, 0, 14, 7, 7, 10, 10, 10, 14, 0, 0] },
      },
      4: {
        dichte: 0.9,
        gras: { a: 1 },
        blumen: { x: 3 },
        hoehe: {
          gemaeht_m: 0.07,
          max_m: 0.7,
          wachstum_cm_tag: [0, 0, 0.1, 0.6, 1.8, 1.0, 0.55, 0.5, 0.4, 0.2, 0.05, 0],
          winter: 0.5,
        },
        pflege: {
          art: 'schnitt',
          schnitte: [
            { doy: 162, streuung_tage: 12, anteil: 1 },
            { doy: 228, streuung_tage: 12, anteil: 1 },
            { doy: 275, streuung_tage: 10, anteil: 0.3 },
          ],
        },
      },
      5: {
        dichte: 0.85,
        gras: { a: 1 },
        hoehe: { gemaeht_m: 0.05, max_m: 0.3, wachstum_cm_tag: [0, 0, 0.1, 0.5, 1, 0.8, 0.5, 0.5, 0.4, 0.2, 0, 0] },
        pflege: { art: 'weide', von: 121, bis: 304, hoehe_m: [0.05, 0.2] },
      },
    },
    farbjahr: [
      [20, 'winter'],
      [110, 'frisch'],
      [180, 'sommer'],
      [230, 'trocken'],
      [290, 'herbst'],
      [340, 'winter'],
    ],
  };
  assert.equal(P.fromArten(A), 3);
  assert.equal(K[1].h0, 0.04);
  assert.equal(K[1].flowers, 3);
  assert.equal(K[1].mow.every[4], 7);
  assert.ok(K[1].w >= 0.0055 && K[1].w <= 0.012);
  // a lawn in May: mown every week (a field is between its mown height and a week's growth)
  const h = P.heightAt(K[1], 140, 0);
  assert.ok(h >= 0.04 && h < 0.1, 'lawn ' + h);
  // the meadow: three cuts, the third on 30 % of the fields
  assert.deepEqual(K[4].mow.cuts, [162, 228, 275]);
  assert.ok(P.heightAt(K[4], 280, 0, 0.1) < P.heightAt(K[4], 280, 0, 0.9), 'the third cut only on some fields');
  // pasture: between its grazed heights
  assert.ok(K[5].hMax <= 0.2 && K[5].mow.every > 0);
  // the garden's own lawn: the lawn's look, only the player mows
  assert.ok(!K[18].mow && K[18].h0 === 0.04);
  // colours from the grasses, sRGB
  const col = P.colour(K[4], 120);
  for (const v of col) assert.ok(v >= 0 && v <= 1);
  for (const c of [1, 4, 5, 18]) K[c] = save[c];
});

test('merge: entries of the species table replace the estimates field by field', () => {
  const k0 = Object.assign({}, K[2]);
  const n = P.merge({ 2: { hMax: 0.33, mow: { every: 21, from: 100, to: 290 }, unknown: 5 }, 99: { hMax: 1 } });
  assert.equal(n, 1);
  assert.equal(K[2].hMax, 0.33);
  assert.equal(K[2].mow.every, 21);
  assert.equal(K[2].g, k0.g);
  K[2] = k0;
});

test('bare spots: the share of the area → the threshold of the value noise (symmetric, rising)', () => {
  assert.equal(P.kahlT(0), 0);
  assert.ok(near(P.kahlT(0.5), 0.5, 1e-9));
  assert.ok(near(P.kahlT(0.05), 0.149, 1e-3));
  assert.ok(near(P.kahlT(0.6), 1 - P.kahlT(0.4), 1e-9));
  let last = -1;
  for (let p = 0; p <= 0.9; p += 0.01) {
    const t = P.kahlT(p);
    assert.ok(t > last - 1e-12 && t >= 0 && t <= 1, 'p ' + p);
    last = t;
  }
});

// last: it replaces the class table with the helper's (the tests above use the lead's estimates)
test('the helper’s species table (bw_arten.js) as the class table: heights, care, vigour, bare spots', async () => {
  const { BWARTEN } = await import('../../src/bewuchs/bw_arten.js');
  assert.ok(P.fromArten(BWARTEN) >= 18);
  // a lawn in May between its mown height and a week's growth; a hay meadow knee high before its first cut, short after it
  for (const off of [0, 2.5, 5]) {
    const h = P.heightAt(K[1], 140, off);
    assert.ok(h >= 0.035 && h < 0.11, 'lawn ' + h);
  }
  assert.ok(P.heightAt(K[4], 150, 0) > 0.5);
  assert.ok(P.heightAt(K[4], 175, 0) < 0.25);
  // regular mowing by month (a number or twelve) – the table gives the days for each month
  const T = P.table(140),
    W = P.TW * 4;
  assert.equal(P.TW, 7);
  assert.ok(T[1 * W + 4] >= 5 && T[1 * W + 4] <= 10, 'lawn mown every ' + T[1 * W + 4] + ' days in May');
  // vigour and bare spots from the table of the areas
  const f4 = BWARTEN.flaechen[4];
  assert.deepEqual(
    [...T.slice(4 * W + 20, 4 * W + 24)],
    [...f4.kraft.dichte, ...f4.kraft.hoehe].map(v => Math.fround(v))
  );
  assert.equal(T[4 * W + 24], Math.fround(f4.kraft.blumen[0]));
  assert.ok(near(T[4 * W + 26], P.kahlT(f4.kahl.anteil), 1e-6));
  assert.ok(T[11 * W + 26] > T[4 * W + 26], 'the forest floor is barer than a meadow');
  // the garden's own lawn: nobody but the player mows it
  assert.ok(!K[18].mow);
  for (let c = 0; c < 19; c++) {
    const k = K[c];
    for (const d of [20, 140, 200, 300]) {
      const h = P.heightAt(k, d, 0);
      assert.ok(Number.isFinite(h) && h >= 0 && h <= (k.hMax || 0) + 1e-9, 'class ' + c + ' day ' + d + ': ' + h);
    }
  }
});

test('the field crops (stage 5a): rows 23–30, wheat green in May, ripe in July, cut field by field in August, ploughed in autumn', async () => {
  const { BWARTEN } = await import('../../src/bewuchs/bw_arten.js');
  assert.ok(P.fromCrops(BWARTEN) >= 6);
  const r = P.CROP0 + P.CROPS.indexOf('winterweizen'),
    W = P.TW * 4,
    at = d => P.table(d).slice(r * W, r * W + W);
  const may = at(140),
    jul = at(205),
    aug = at(227),
    oct = at(270);
  assert.ok(may[1] > 0.3 && may[1] < 0.9, 'May ' + may[1]);
  assert.ok(jul[1] > 0.7, 'July ' + jul[1]);
  // the harvest days: standing height with the stubble as the cut height, each field on its day
  assert.ok(aug[5] > 200 && aug[7] > 0 && aug[0] < 0.3 && aug[1] > 0.5, 'harvest ' + Array.from(aug.slice(0, 8)));
  // ripe: yellower than in May
  assert.ok(jul[8] / jul[9] > may[8] / may[9], 'colour');
  assert.ok(oct[1] < 0.3, 'autumn ' + oct[1]);
  // the choices: every map class of the fields has crops, cumulative to 1
  const ch = P.cropChoice(BWARTEN);
  for (const c of [9, 19, 20, 21, 22]) {
    assert.ok(ch[c].length >= 1, 'class ' + c);
    assert.ok(Math.abs(ch[c][ch[c].length - 1][1] - 1) < 1e-9);
    for (const [row] of ch[c]) assert.ok(row >= P.CROP0 && row < 32);
  }
});
