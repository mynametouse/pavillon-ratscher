// Unit tests of feat/grenzland-ruf without a browser: the village's opinion of the two (GLRUFDATA – steps with a margin, what a deed costs,
// forgetting, where a deed counts, gossip in fixed fragments, the chat's words) and the side jobs (GLJOBSDATA – when each is offered, what
// it pays, the tip and the complaints).
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLRUFDATA as R } from '../../src/grenzland/gl_ruf_data.js';

test('four steps with clear lines, and a margin against flicker', () => {
  assert.equal(R.stufe(0), 'neutral');
  assert.equal(R.stufe(30), 'beliebt');
  assert.equal(R.stufe(29.9), 'neutral');
  assert.equal(R.stufe(-20), 'neutral');
  assert.equal(R.stufe(-21), 'misstrauisch');
  assert.equal(R.stufe(-55), 'misstrauisch');
  assert.equal(R.stufe(-56), 'verhasst');
  assert.equal(R.stufe(-100), 'verhasst');
  // from neutral up: only past the line by the margin
  assert.equal(R.stufe(31, 'neutral'), 'neutral', 'just over the line is not enough');
  assert.equal(R.stufe(34, 'neutral'), 'beliebt');
  // and back down: beliebt holds until the value is the margin below the line
  assert.equal(R.stufe(28, 'beliebt'), 'beliebt');
  assert.equal(R.stufe(25, 'beliebt'), 'neutral');
  assert.equal(R.stufe(-23, 'neutral'), 'neutral');
  assert.equal(R.stufe(-25, 'neutral'), 'misstrauisch');
  // a big jump crosses several steps at once
  assert.equal(R.stufe(-80, 'beliebt'), 'verhasst');
  assert.equal(R.stufe(60, 'verhasst'), 'beliebt');
  assert.equal(R.stufe(NaN), 'neutral');
  assert.equal(R.clamp(140), 100);
  assert.equal(R.clamp(-140), -100);
});

test('a deed costs only when somebody saw it – all of it when they know who it was', () => {
  assert.deepEqual(R.tat('einbruch', { zeugen: 0 }).n, 0, 'nobody saw it');
  const k = R.tat('einbruch', { zeugen: 2, bekannt: true }),
    a = R.tat('einbruch', { zeugen: 2 });
  assert.equal(k.n, -18);
  assert.equal(a.n, -9, 'a description only: half');
  assert.equal(k.nachbar, -5.4, 'the other place hears a third of it');
  assert.equal(R.tat('helm', { zeugen: 3, bekannt: true }).n, 0, "no helmet is nobody's business");
  assert.equal(R.tat('unbekannt', { zeugen: 3 }).n, 0);
  // heavier deeds cost more than lighter ones
  const c = id => -R.tat(id, { zeugen: 1, bekannt: true }).n;
  assert.ok(
    c('einbruch') > c('schlag') &&
      c('schlag') > c('rempeln') &&
      c('rempeln') > c('raserei') &&
      c('raserei') > c('angeln')
  );
  for (const id of Object.keys(R.TAT)) {
    const T = R.TAT[id];
    if (T.n) assert.ok(R.SPRUCH.was[T.g], 'words for the group of ' + id);
  }
});

test('forgetting: a few points a game day back towards 0, never past it', () => {
  assert.equal(R.vergessen(-30, 1), -30 + R.VERGISST);
  assert.equal(R.vergessen(30, 1), 30 - R.VERGISST);
  assert.equal(R.vergessen(4, 2), 0);
  assert.equal(R.vergessen(-4, 2), 0);
  assert.equal(R.vergessen(0, 5), 0);
  assert.equal(R.vergessen(-50, 0), -50);
  assert.ok(R.VERGISST >= 3 && R.VERGISST <= 10, 'a few points');
});

test('where a deed counts: the town around its market, everything else is the village', () => {
  assert.equal(R.ortVon(-1100, 1214), 'schleusingen');
  assert.equal(R.ortVon(-1340, 1243), 'schleusingen', 'the central bus stop');
  assert.equal(R.ortVon(222, -108), 'ratscher', 'the Anger');
  assert.equal(R.ortVon(853, -817), 'ratscher', 'the dam');
  assert.equal(R.ortVon(117, -304), 'ratscher', 'the barn');
  assert.equal(R.woVon('Ratscher, Anger', 'ratscher'), 'am Anger');
  assert.equal(R.woVon('Dorflinde', 'ratscher'), 'an der Linde');
  assert.equal(R.woVon('Schleusingen, Markt', 'schleusingen'), 'auf dem Markt');
  assert.equal(R.woVon('', 'schleusingen'), 'in Schleusingen');
  assert.equal(R.woVon('Irgendwo', 'ratscher'), 'im Dorf');
});

test('spoken gossip: fixed fragments – who, where, what – every one of them a line to record', () => {
  const r = () => 0;
  const t = R.spruch('boeller', 'm', 'am Anger', { r });
  assert.deepEqual(t, ['Hast du schon gehört?', 'Der Falko hat', 'am Anger', 'Böller geworfen.', 'Ich sag ja nichts.']);
  assert.equal(R.satz(t), 'Hast du schon gehört? Der Falko hat am Anger Böller geworfen. Ich sag ja nichts.');
  // told to the one it is about: the last word gives it away
  const ich = R.spruch('einbruch', 'f', 'im Dorf', { r, ich: 'f' });
  assert.equal(ich[4], 'Ach, du bist ja eine von denen.');
  assert.equal(R.spruch('einbruch', 'f', 'im Dorf', { r, ich: 'm' })[4], 'Ich sag ja nichts.', 'about the other one');
  assert.equal(R.spruch('holz', 'm', 'im Dorf', { r })[4], 'Ordentliche Leute.', 'a good deed');
  assert.equal(R.spruch('boeller', '', 'nirgendwo', { r })[1], 'Da hat einer');
  assert.equal(R.spruch('boeller', '', 'nirgendwo', { r })[2], 'im Dorf', 'an unknown place falls back');
  assert.equal(R.spruch('gibtsnicht', 'm', 'im Dorf'), null);
  // every fragment that can be said is in linien() for every speaker
  const L = R.linien(['haendler', 'gerhard']),
    has = (w, x) => L.some(q => q[0] === w && q[1] === x);
  for (let i = 0; i < 20; i++) {
    const g = Object.keys(R.SPRUCH.was)[i % Object.keys(R.SPRUCH.was).length];
    for (const x of R.spruch(g, ['m', 'f', ''][i % 3], R.SPRUCH.wo[i % R.SPRUCH.wo.length], { ich: i % 2 ? 'm' : 'f' }))
      assert.ok(has('haendler', x) && has('gerhard', x), 'recorded: ' + x);
  }
  for (const k of ['beliebt', 'misstrauisch', 'verhasst']) for (const x of R.SAGT[k]) assert.ok(has('gerhard', x), x);
  assert.deepEqual(R.linien(), [], 'nobody given: nothing');
});

test('the chat: every gossip line reads with a name or a description; nobody real, nothing mean', () => {
  const alle = [];
  for (const L of Object.values(R.GEREDE)) for (const [w, t] of L) alle.push([w, t]);
  for (const L of Object.values(R.FEED)) for (const [w, t] of L) alle.push([w, t]);
  assert.ok(alle.length >= 30, 'enough lines: ' + alle.length);
  for (const [w, t] of alle) {
    assert.ok(!/Hubert|Ronald/.test(w + t), 'never Hubert or Ronald: ' + t);
    for (const name of ['Falko', R.aussehen({ kleid: 'karo' })]) {
      const s = R.fuell(t, { name, wo: 'am Anger', ort: 'Ratscher' });
      assert.ok(!/[{}]/.test(s), 'all words filled in: ' + s);
      assert.ok(/^[A-ZÄÖÜ0-9„🚨]/.test(s), 'begins with a capital: ' + s);
    }
  }
  assert.equal(R.fuell('{Wo} war {name}.', { name: 'Sarah', wo: 'am Anger' }), 'Am Anger war Sarah.');
  assert.equal(R.aussehen({ kleid: 'karo', kopf: 'haube' }), 'jemand mit Sturmhaube');
  assert.equal(R.aussehen({}), 'irgendeiner');
  // the HUD has a line for every step, the steps' chat lines exist
  for (const s of R.STUFEN) assert.ok(R.HUD[s.id] && R.GEREDE[s.id], s.id);
});
