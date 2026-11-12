// Unit tests of the what-if mode's numbers (zukunft/zk_data.js, feat/zukunft) without a browser: every variant gives five indicators with a
// „Warum?“, assumptions are marked, the numbers move plausibly with the variant and the year, the dying stand follows its curve.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ZKDATA as Z } from '../../src/zukunft/zk_data.js';

test('four topics with Heute and at least two variants each', () => {
  assert.deepEqual(
    Z.TOPICS.map(t => t.id),
    ['mobil', 'energie', 'klima', 'wald']
  );
  for (const t of Z.TOPICS) {
    assert.equal(t.variants[0].id, 'heute');
    assert.ok(t.variants.length >= 3, t.id);
  }
});

test('every topic, variant and year: five indicators, each with a reason and (if not Heute) a marked assumption or a source', () => {
  for (const t of Z.TOPICS)
    for (const v of t.variants)
      for (const y of Z.YEARS) {
        const r = Z.calc(t.id, v.id, y);
        assert.ok(r, `${t.id}/${v.id}/${y}`);
        assert.deepEqual(Object.keys(r.ind), Z.ORDER);
        for (const k of Z.ORDER) {
          const x = r.ind[k];
          assert.ok(x.main && x.label, `${t.id}/${v.id}/${k}: text`);
          assert.ok(x.why && x.why.text.length > 20, `${t.id}/${v.id}/${k}: why`);
          if (v.id !== 'heute' && k !== 'stimmung' && !(k === 'co2' && r.raw.co2 == null))
            assert.ok(x.why.annahme || x.why.src.length, `${t.id}/${v.id}/${k}: assumption or source`);
        }
        for (const x of Object.values(r.ind)) for (const s of x.why.src) assert.ok(s[0], 'source title');
      }
});

test('no false precision: money has two significant figures', () => {
  assert.equal(Z.sig2(123456), 120000);
  assert.equal(Z.eur(1234567), '1,2 Mio. €');
  assert.equal(Z.eur(47321), '47.000 €');
});

test('Mobilität: a bank is cheap, a Rufbus costs tens of thousands a year, more trips more; empty buses add CO2 until they are electric', () => {
  const bank = Z.calc('mobil', 'bank', 2030).raw,
    ruf = Z.calc('mobil', 'ruf', 2030).raw,
    takt = Z.calc('mobil', 'takt', 2030).raw;
  assert.ok(bank.kosten.inv[1] < 1000);
  assert.ok(ruf.kosten.yr[1] > 40000 && ruf.kosten.yr[1] < 120000);
  assert.ok(takt.kosten.yr[1] > ruf.kosten.yr[1]);
  assert.ok(takt.co2[1] > 0 && Z.calc('mobil', 'takt', 2060).raw.co2[1] < takt.co2[1]);
  assert.ok(bank.co2[1] < 0);
});

test('Energie: PV grows with the years, saves less CO2 per kWh as the grid gets cleaner; the park costs more than the roofs', () => {
  const a = Z.calc('energie', 'dach', 2026).raw,
    b = Z.calc('energie', 'dach', 2045).raw;
  assert.equal(a.kwp, 0);
  assert.ok(b.kwp > 0);
  assert.equal(Z.calc('energie', 'dach', 2045).world.pvRoof, 0.8);
  assert.equal(Z.calc('energie', 'park', 2026).world.pvField, 0);
  assert.equal(Z.calc('energie', 'park', 2030).world.pvField, 1);
  assert.ok(Z.calc('energie', 'park', 2030).raw.kosten.inv[1] > Z.calc('energie', 'dach', 2030).raw.kosten.inv[1]);
  const perKwh = y => Z.calc('energie', 'dach', y).raw.co2[1] / Z.calc('energie', 'dach', y).raw.kwh;
  assert.ok(Math.abs(perKwh(2030)) > Math.abs(perKwh(2045)));
  assert.ok(Z.calc('energie', 'waerme', 2045).world.wp > Z.calc('energie', 'waerme', 2030).world.wp);
});

test('Klimaanpassung: precaution lowers the expected damage; the flood level and the dry ground are in the world', () => {
  const a = Z.calc('klima', 'regen', 2035).raw,
    b = Z.calc('klima', 'vorsorge', 2035).raw;
  assert.ok(b.ead < a.ead * 0.5 && b.kosten.inv[1] > 50000);
  assert.ok(Z.calc('klima', 'hoch', 2045).world.flood > 1.5);
  assert.ok(Z.calc('klima', 'duerre', 2060).world.dry > Z.calc('klima', 'duerre', 2026).world.dry);
  assert.equal(Z.calc('klima', 'regen', 2030).world.rain, 'starkregen');
});

test('Wald: the stand dies along its curve, clearing follows 2.5 years later, young trees grow', () => {
  assert.equal(Z.affected(2026), 0);
  assert.equal(Z.affected(2060), 1);
  assert.ok(Z.cleared(2035) < Z.affected(2035));
  assert.ok(Math.abs(Z.strikeYear(0.3) - 2030) < 1e-6 && Z.strikeYear(0.95) === 2045);
  assert.ok(Z.regrow.natur(20) > 10 && Z.regrow.natur(0) === 0 && Z.regrow.umbau(40) > Z.regrow.umbau(10));
  const n = Z.calc('wald', 'natur', 2035).raw,
    u = Z.calc('wald', 'umbau', 2035).raw;
  assert.ok(u.kosten.inv[1] > n.kosten.inv[1] * 5);
  assert.equal(Z.calc('wald', 'heute', 2060).world.forest, null);
  assert.equal(Z.calc('wald', 'umbau', 2045).world.forest.mode, 'umbau');
  // the clearing hits the climate first (emission), the young stand binds later
  assert.ok(
    Z.calc('wald', 'natur', 2035).raw.co2[1] > 0 &&
      Z.calc('wald', 'umbau', 2060).raw.co2[1] < Z.calc('wald', 'umbau', 2035).raw.co2[1]
  );
});

test('Stimmung: voices are the game villagers, with a lean and a reason; the mood follows them', () => {
  for (const [k, list] of Object.entries(Z.VOICES)) {
    assert.ok(list.length >= 3, k);
    for (const [who, lean, say] of list) {
      assert.ok(Z.WHO[who], who);
      assert.ok(lean >= -2 && lean <= 2 && say.length > 20, k);
    }
  }
  assert.ok(Z.calc('mobil', 'bank', 2030).ind.stimmung.raw.v > 55);
  assert.ok(Z.calc('klima', 'duerre', 2030).ind.stimmung.raw.v < 40);
});

test('the world part is empty for Heute', () => {
  for (const t of Z.TOPICS) {
    const w = Z.calc(t.id, 'heute', 2045).world;
    assert.equal(w.pvRoof + w.pvField + w.wp + w.bank + w.rufbus + w.flood + w.dry + w.wet, 0);
    assert.equal(w.forest, null);
  }
});
