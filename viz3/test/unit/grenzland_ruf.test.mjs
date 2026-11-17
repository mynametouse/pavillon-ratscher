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

// ---------------------------------------------------------------- the side jobs (GLJOBSDATA) ----------------------------------------------------------------
import { GLJOBSDATA as J } from '../../src/grenzland/gl_jobs_data.js';
const DAY = (y, m, d) => Date.UTC(y, m - 1, d) / 864e5;

test('jobs: the weekday of the story\'s first day, when each job may begin', () => {
  const fr = DAY(2026, 9, 4);
  assert.equal(J.wochentag(fr), 5, 'Friday, 4 September 2026');
  assert.equal(J.wochentag(fr + 1), 6);
  assert.equal(J.wochentag(fr + 2), 0);
  const t = (h, m = 0) => h * 60 + m; // within the day (CLOCK.t of day 0)
  // Friday 17:20: the rolls tomorrow 5:30, the exercise tomorrow 8:40, the wood tomorrow 8:00
  assert.equal(J.bis(J.JOBS.broetchen, t(17, 20), fr), 24 * 60 - t(17, 20) + t(5, 30));
  assert.equal(J.bis(J.JOBS.feuerwehr, t(17, 20), fr), 24 * 60 - t(17, 20) + t(8, 40));
  assert.equal(J.wann(J.JOBS.broetchen, t(17, 20), fr), 'morgen ab 5:30');
  assert.equal(J.bis(J.JOBS.feuerwehr, t(9), fr + 1), 0, 'Saturday 9:00: now');
  assert.equal(J.wann(J.JOBS.feuerwehr, t(9), fr + 1), 'jetzt bis 9:30');
  assert.equal(J.bis(J.JOBS.feuerwehr, t(9, 30), fr + 1), 7 * 1440 - 50, 'missed: next Saturday');
  assert.equal(J.wann(J.JOBS.feuerwehr, t(9, 30), fr + 1), 'Samstag ab 8:40');
  assert.equal(J.bis(J.JOBS.broetchen, t(6), fr + 2), 1440 - 30, 'no rolls on Sunday: Monday 5:30');
  assert.ok(J.offenAm(J.JOBS.broetchen, 1, t(6)) && !J.offenAm(J.JOBS.broetchen, 0, t(6)) && !J.offenAm(J.JOBS.broetchen, 1, t(7, 5)));
  assert.ok(J.offenAm(J.JOBS.holz, 3, t(10)) && !J.offenAm(J.JOBS.holz, 3, t(18)));
});

test('jobs: what the rolls pay – the tip for being quick, a deduction for each squashed bag, never below nothing', () => {
  const B = J.JOBS.broetchen;
  assert.deepEqual(J.lohnBroetchen({ sek: 200 }), { lohn: B.lohn, trinkgeld: B.trinkgeld, abzug: 0, summe: B.lohn + B.trinkgeld, ruf: B.ruf + 1 });
  assert.equal(J.lohnBroetchen({ sek: (B.par + B.spaet) / 2 }).trinkgeld, B.trinkgeld / 2);
  assert.equal(J.lohnBroetchen({ sek: B.spaet + 100 }).trinkgeld, 0);
  const p = J.lohnBroetchen({ sek: 200, platt: 2 });
  assert.equal(p.abzug, 2 * B.platt);
  assert.equal(p.summe, B.lohn + B.trinkgeld - 2 * B.platt);
  assert.ok(p.ruf < B.ruf + 1, 'squashed rolls cost a little of the reputation gain');
  const s = J.lohnBroetchen({ sek: 200, zuSpaet: true });
  assert.equal(s.trinkgeld, 0, 'after half past seven: no tip');
  assert.ok(s.ruf >= 1 && s.ruf < B.ruf);
  assert.equal(J.lohnBroetchen({ sek: 900, platt: 20 }).summe, 0, 'never below nothing');
  assert.deepEqual(J.lohnHolz(2), { summe: 2 * J.JOBS.holz.lohn, ruf: 2 * J.JOBS.holz.ruf });
  assert.equal(J.lohnHolz(9).summe, J.JOBS.holz.fuhren * J.JOBS.holz.lohn, 'no more loads than there are');
  assert.equal(J.urteil(J.JOBS.feuerwehr.par - 1), 'schnell');
  assert.equal(J.urteil(J.JOBS.feuerwehr.par * 1.3), 'gut');
  assert.equal(J.urteil(J.JOBS.feuerwehr.par * 3), 'langsam');
  assert.equal(J.mmss(125), '2:05');
});

test('jobs: the town hall\'s hours; every job and quest with its words, a hint field for chapter 2, nobody real', () => {
  const Z = J.AUFGABEN.chronik.zeiten;
  assert.ok(J.zeitOffen(Z, 2, 14 * 60), 'Tuesday afternoon open');
  assert.ok(!J.zeitOffen(Z, 6, 10 * 60), 'Saturday shut');
  assert.ok(!J.zeitOffen(Z, 1, 12 * 60), 'Monday at noon shut');
  assert.match(J.zeitenText(Z), /Di 9:00–12:00, 13:00–18:00/);
  for (const X of Object.values(J.alle())) {
    assert.equal(typeof X.hinweis, 'string', X.id + ': hint field');
    assert.ok(X.titel && X.von && X.angebot && X.kurz && X.tage.length && X.ab < X.bis, X.id);
    assert.ok(!/Hubert|Ronald/.test(JSON.stringify(X)), X.id + ': never Hubert or Ronald');
  }
  const L = J.linien();
  assert.ok(L.length >= 10 && L.every(([w, t]) => (w === 'fw_steffen' || w === 'fw_anja') && typeof t === 'string' && t.length > 3));
  assert.ok(!/Hubert|Ronald/.test(JSON.stringify(J.T) + JSON.stringify(J.FW)));
});
