// Unit tests of the election and the office (amt/amt_model.js, amt/amt_data.js) without a browser: opinions, promises, signatures,
// the count, the Ortsteilrat and the town council. Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AMTDATA as D } from '../../src/amt/amt_data.js';
import { AMTMODEL as M } from '../../src/amt/amt_model.js';

test('the data hangs together: issues name known people, concerns name known issues and deciders', () => {
  for (const [id, I] of Object.entries(D.ISSUES)) {
    for (const o of Object.values(I.opts)) for (const k of Object.keys(o.eff)) assert.ok(D.P[k], id + ': ' + k);
    for (const k of I.care) assert.ok(D.P[k], id + ' care ' + k);
  }
  for (const [id, A] of Object.entries(D.ANLIEGEN)) {
    assert.ok(['ortsteil', 'stadt', 'kreis', 'privat'].includes(A.by), id);
    assert.ok(D.P[A.from], id + ' from');
    if (A.issue) assert.ok(D.ISSUES[A.issue], id + ' issue');
    for (const k of Object.keys({ ...A.fans, ...A.foes })) assert.ok(D.P[k], id + ' fan ' + k);
  }
  for (const k of D.ORTSRAT) assert.ok(D.P[k], 'ortsrat ' + k);
  for (const [, , right] of D.QUIZ) assert.ok(right >= 0 && right < 3);
  // about 100 voters (Ratscher has about 120 inhabitants)
  const n = D.KEYS.reduce((s, k) => s + D.P[k].hh + D.P[k].circle, D.REST);
  assert.ok(n > 85 && n < 115, 'voters ' + n);
});

test('a broken saved state falls back field by field', () => {
  for (const bad of [
    null,
    3,
    'x',
    [],
    { phase: 'kaiser', rep: { gerhard: 'NaN' }, sig: 'a', anl: { x: 1 }, log: [1, 2] },
  ]) {
    const s = M.sanitize(bad);
    assert.equal(s.phase, 'none');
    assert.equal(s.rep.gerhard, D.P.gerhard.rep0);
    assert.deepEqual(s.sig, []);
  }
  const s = M.sanitize({
    phase: 'nominated',
    rep: { gerhard: 140, katrin: -3 },
    sig: ['gerhard', 'gerhard', 'nobody'],
    pos: { laterne: { o: 'mitte', told: ['katrin', 'x'] }, foo: { o: 'ja' } },
    anl: { laterne: { st: 'stadt', t: 5 }, kirmes: { st: 'party' } },
    vote: { me: 40, opp: 30, inv: 1, eligible: 100, turnout: 71, won: true },
  });
  assert.equal(s.phase, 'nominated');
  assert.equal(s.rep.gerhard, 100);
  assert.equal(s.rep.katrin, 0);
  assert.deepEqual(s.sig, ['gerhard']);
  assert.deepEqual(s.pos, { laterne: { o: 'mitte', told: ['katrin'] } });
  assert.deepEqual(Object.keys(s.anl), ['laterne']);
  assert.equal(s.vote.won, true);
});

test('a saved state with prototype keys or odd shapes does not throw', () => {
  const evil = JSON.parse(
    '{"phase":"office","pos":{"__proto__":{"o":"ja"},"constructor":{"o":"x"}},"anl":{"__proto__":{"st":"open"},"toString":{"st":"yes"}},"tasks":{"__proto__":1,"hasOwnProperty":2},"met":{"__proto__":3},"built":{"__proto__":5,"laterne":7},"sig":["__proto__","gerhard"],"log":[[1,"x",2,"y"],"z"]}'
  );
  const s = M.sanitize(evil);
  assert.equal(s.phase, 'office');
  assert.deepEqual(Object.keys(s.pos), []);
  assert.deepEqual(Object.keys(s.anl), []);
  assert.deepEqual(Object.keys(s.tasks), []);
  assert.deepEqual(s.built, { laterne: 7 });
  assert.deepEqual(s.sig, ['gerhard']);
  assert.equal(s.log.length, 1);
});

test('promises: the first word counts, the same word again adds a listener, another word costs trust', () => {
  const S = M.fresh();
  const k0 = S.rep.katrin,
    g0 = S.rep.gerhard;
  assert.equal(M.promise(S, 'laterne', 'ja', 'katrin', 10), 'new');
  assert.equal(S.rep.katrin, k0 + 6);
  assert.equal(S.rep.gerhard, g0 - 6);
  assert.equal(M.promise(S, 'laterne', 'ja', 'heike', 20), 'same');
  assert.deepEqual(S.pos.laterne.told, ['katrin', 'heike']);
  assert.equal(M.promise(S, 'laterne', 'nein', 'gerhard', 30), 'flip');
  assert.equal(S.flips, 1);
  // Katrin heard „ja“: the flip costs her trust, her +6 is taken back and „nein“ costs her 6 more
  assert.equal(S.rep.katrin, k0 + D.FLIP - 6);
  assert.equal(S.rep.gerhard, g0 + 5);
  assert.equal(M.promise(S, 'laterne', 'vielleicht', 'katrin'), null);
});

test('signatures: people who know you sign with their household; good friends gather more; the rival does not sign', () => {
  const S = M.fresh();
  S.rep.gerhard = 35;
  assert.equal(M.trySign(S, 'gerhard'), 'no');
  S.rep.gerhard = 55;
  assert.equal(M.trySign(S, 'gerhard'), 'yes');
  assert.equal(M.trySign(S, 'gerhard'), 'done');
  assert.equal(M.sigCount(S), D.P.gerhard.hh);
  S.rep.manfred = 70;
  assert.equal(M.trySign(S, 'manfred'), 'more');
  assert.equal(M.sigCount(S), D.P.gerhard.hh + D.P.manfred.hh + Math.min(5, (D.P.manfred.circle >> 2) + 1));
  S.rep.uwe = 100;
  assert.equal(M.trySign(S, 'uwe'), 'no');
});

test('the count: the same seed gives the same result; the numbers add up; liked candidates win, disliked ones lose', () => {
  const S = M.fresh();
  const a = M.simulate(S, 42),
    b = M.simulate(S, 42);
  assert.deepEqual(a, b);
  assert.equal(a.me + a.opp + a.inv, a.turnout);
  assert.equal(a.ballots.length, a.turnout);
  assert.ok(a.turnout > 30 && a.turnout <= a.eligible, 'turnout ' + a.turnout);
  const hi = M.fresh();
  for (const k of D.KEYS) hi.rep[k] = 90;
  const lo = M.fresh();
  for (const k of D.KEYS) lo.rep[k] = 15;
  let wins = 0,
    losses = 0;
  for (let s = 1; s <= 20; s++) {
    if (M.simulate(hi, s).won) wins++;
    if (!M.simulate(lo, s).won) losses++;
  }
  assert.equal(wins, 20);
  assert.equal(losses, 20);
  assert.ok(M.expect(hi) > 0.7 && M.expect(lo) < 0.3);
  // the player's own vote counts
  hi.voted = true;
  assert.equal(M.simulate(hi, 3).turnout, M.simulate({ ...hi, voted: false }, 3).turnout + 1);
});

test('Hubert is away on election day: his vote counts only by post', () => {
  const S = M.fresh();
  const hh = s => M.groups(s).find(g => g.k === 'hubert' && g.hh);
  assert.equal(hh(S).n, 0);
  S.tasks.briefwahl = 'done';
  assert.equal(hh(S).n, D.P.hubert.hh);
  assert.ok(hh(S).sure);
});

test('a person missing in this build votes with the rest', () => {
  const S = M.fresh();
  const all = M.groups(S).reduce((n, g) => n + g.n, 0),
    some = M.groups(S, k => k !== 'heike' && k !== 'jens').reduce((n, g) => n + g.n, 0);
  assert.equal(all, some);
  assert.ok(!M.groups(S, k => k !== 'heike').some(g => g.k === 'heike'));
});

test('the Ortsteilrat: four members and the chair; a tie rejects', () => {
  const S = M.fresh();
  const r = M.ortsrat(S, 'kirmes', true);
  assert.equal(r.votes.length, 5);
  assert.equal(r.yes + r.no, 5);
  assert.equal(r.pass, r.yes > r.no);
  for (const k of D.ORTSRAT) S.rep[k] = 5;
  const n = M.ortsrat(S, 'tafel', true);
  assert.equal(n.pass, false);
});

test('the town council: who decides, the money, the reasons', () => {
  const S = M.fresh();
  const rat = { pass: true, unanimous: true };
  assert.equal(M.council(S, 'ziegenzaun', {}).d, 'privat');
  assert.equal(M.council(S, 'kirmes', {}).d, 'ortsteil');
  assert.equal(M.council(S, 'tempo30', { rat, budget: 10000 }).d, 'kreis');
  assert.equal(M.council(S, 'tempo30', { rat, budget: 100 }).d, 'later');
  assert.equal(M.council(S, 'feldweg', { rat, budget: 10000 }).d, 'later');
  assert.match(M.council(S, 'feldweg', { rat, budget: 10000 }).why, /Schotter/);
  assert.equal(M.council(S, 'laterne', { rat, prepared: true, pos: 'mitte', budget: 10000 }).d, 'yes');
  assert.equal(M.council(S, 'laterne', { rat: { pass: false }, budget: 10000 }).d, 'no');
  const later = M.council(S, 'laterne', { rat: { pass: true }, budget: 10000 });
  assert.equal(later.d, 'later');
  assert.match(later.why, /Kostenschätzung/);
});
