// feat/strategie-dorf: unit tests of the village's data in „Ratscher von oben“ (viz3/src/strategie/st_dorf_data.js) without a browser –
// every project step can be done (a place, people, a skill, a time), every rule and project says why and where it comes from (Falko: one
// should learn something real), land prices and areas add up, the funding call and the crisis numbers make sense (who helps decides).
// Run: node --test "viz3/test/unit/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { STDDATA as D } from '../../src/strategie/st_dorf_data.js';
import { STDATA } from '../../src/strategie/st_data.js';
import { AMTDATA } from '../../src/amt/amt_data.js';

const PLACES = new Set([...Object.keys(D.PLACES), ...Object.keys(STDATA.PLACES), 'schleusingen', 'einsatz']);
const SKILLS = new Set(Object.keys(STDATA.SKILL));
const KINDS = new Set(['job', 'deal', 'rat', 'stadt', 'bauhof', 'warten', 'foerder', 'quote']);

test('every project has its steps, its reason and its source', () => {
  for (const [id, P] of Object.entries(D.PROJ)) {
    assert.ok(P.title && P.text && P.learn && P.src, id + ': title, text, learn, src');
    assert.ok(['ortsteil', 'stadt', 'privat'].includes(P.by), id + ': who decides');
    assert.ok(D.PEOPLE[P.from] || AMTDATA.P[P.from], id + ': whose wish');
    assert.ok(PLACES.has(P.place), id + ': place ' + P.place);
    assert.ok(P.steps.length >= 1);
    for (const s of P.steps) {
      assert.ok(KINDS.has(s.k), id + ': step kind ' + s.k);
      if (s.k === 'job' || s.k === 'deal') {
        assert.ok(s.label && s.text, id + ': job label and text');
        assert.ok(PLACES.has(s.place || P.place), id + ': job place ' + s.place);
        assert.ok(SKILLS.has(s.skill || 'reden'), id + ': skill ' + s.skill);
        assert.ok(s.dur > 0 && s.dur < 2000, id + ': duration');
        const pp = s.people || [1, 2];
        assert.ok(pp[0] >= 1 && pp[1] >= pp[0] && pp[1] <= 3, id + ': people');
      }
      if (s.k === 'deal') assert.ok(P.land && D.LAND[P.land], id + ': a deal is about land');
      if (s.k === 'foerder') assert.ok(D.FOERDER[P.foerder], id + ': its funding programme');
      if (s.k === 'rat' && P.by === 'ortsteil') assert.ok(P.cost <= AMTDATA.BUDGET, id + ': fits the Ortsteil money of a year');
    }
    // a project of the Ortsvorsteher system is the same concern there (its built thing, its fans)
    if (P.anl) assert.ok(AMTDATA.ANLIEGEN[P.anl], id + ': concern ' + P.anl);
  }
});

test('every rule says why, with a source', () => {
  for (const [k, R] of Object.entries(D.RULES)) {
    assert.ok(R.text && R.why && R.src, k);
    assert.ok(!STDATA.RULES[k] || STDATA.RULES[k] === R, k + ': no clash with the core\'s rules');
  }
});

test('land: areas, prices and the purchase costs of Thuringia', () => {
  for (const [k, L] of Object.entries(D.LAND)) {
    const ha = (L.w * L.h) / 1e4;
    assert.ok(Math.abs(ha - L.ha) / L.ha < 0.12, k + ': area of the rectangle ' + ha.toFixed(3) + ' ha');
    assert.ok(L.kauf > 0.2 && L.kauf < 5, k + ': price per m² plausible');
    if (L.pacht) assert.ok(L.pacht >= 50 && L.pacht <= 600, k + ': rent per ha plausible');
    assert.ok(L.owner === null ? !!L.ownerName : !!(D.PEOPLE[L.owner] || AMTDATA.P[L.owner]), k + ': owner');
  }
  assert.equal(D.KAUF.grest, 0.05, 'Grunderwerbsteuer Thüringen 5 % since 1.1.2024');
  // a year's rent of the slope meadow: 0,35 ha × 120 €/ha = 42 €
  assert.equal(Math.round(D.LAND.hangwiese.pacht * D.LAND.hangwiese.ha * 100) / 100, 42);
  // every land deal and the orchard are projects at the Flur
  for (const P of Object.values(D.PROJ)) if (P.land) assert.ok(['pacht', 'kauf'].includes(P.deal));
  assert.equal(D.PROJ.streuobst.needLand, 'hangwiese');
});

test('the LEADER call: two deadlines a year, selection and approval after it, a share of the cost', () => {
  const F = D.FOERDER.leader;
  assert.ok(F.calls.length >= 1 && F.calls.every(([m, d]) => m >= 1 && m <= 12 && d >= 1 && d <= 31));
  assert.ok(F.rate > 0 && F.rate < 1 && F.min > 0 && F.select > 0 && F.approve > 0);
  assert.ok(F.learn.includes('Bewilligungsbescheid'), 'the rule: no start before the approval');
  const P = D.PROJ.treffpunkt;
  const own = P.cost * (1 - F.rate);
  assert.ok(own <= D.CITY, 'the own share fits the town money for small matters of a year');
  // the steps in their real order: advice, quotes, Ortsteilrat, town council, funding, building, proof of use
  assert.deepEqual(
    P.steps.map(s => s.k),
    ['job', 'job', 'rat', 'stadt', 'foerder', 'bauhof', 'job', 'warten']
  );
});

test('crises: who helps decides – a working-day crew alone is too late, with two helpers in time', () => {
  for (const [id, K] of Object.entries(D.KRISEN)) {
    assert.ok(K.title && K.text && K.safety && K.safetySrc && K.damage && K.ok, id);
    assert.ok(K.phases.every((p, i) => i === 0 || p[0] > K.phases[i - 1][0]), id + ': phases in order');
    const arrive = D.FW.alarm + D.FW.drive;
    assert.equal(arrive, D.FW.hilfsfrist, 'Einsatzgrundzeit 10 minutes (§ 1 ThürFwOrgVO)');
    if (id === 'waldbrand') continue; // the town's tank engine joins after 20 minutes
    const need = K.need; // severity 2
    const weekend = arrive + need / D.FW.crew,
      dayAlone = arrive + need / D.FW.crewDay,
      dayHelped = arrive + need / (D.FW.crewDay + 2 * 0.9);
    assert.ok(weekend < K.limit, id + ': most of the brigade is in time');
    assert.ok(dayAlone > K.limit, id + ': three alone are too late');
    assert.ok(dayHelped < K.limit, id + ': with two helpers in time');
  }
});

test('neighbourly help and the basic training are real things with their lesson', () => {
  for (const [k, H] of Object.entries(D.HILFE)) {
    assert.ok(H.label && H.text && H.learn && H.dur > 0, k);
    assert.ok(SKILLS.has(H.skill), k);
    assert.ok(Object.keys(H.eff).includes(k), k + ': the one helped thinks better of you');
  }
  assert.ok(D.KURS_FW.title && D.KURS_FW.src && D.KURS_FW.days >= 1);
});
