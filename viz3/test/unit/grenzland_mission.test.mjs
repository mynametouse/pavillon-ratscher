// Unit tests of feat/grenzland-mission without a browser: the missions' step machine (start, steps, checkpoints, a reload, the journal, the
// debug jump), the race's rubber band, the night, a guard's attention, the closing screen, and the plan of the haulier's yard.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLMDATA as D, GLMLOGIK as L } from '../../src/grenzland/gl_mission_data.js';
import { GLLOGIK } from '../../src/grenzland/gl_logik.js';
import { GLDATA } from '../../src/grenzland/gl_data.js';

const MIS = () => [
  { id: 'a', steps: [{ id: 'a0' }, { id: 'a1' }, { id: 'a2', cp: 'a1' }] },
  { id: 'b', steps: [{ id: 'b0' }, { id: 'b1', cp: 'b0' }, { id: 'b2', cp: 'b0' }, { id: 'b3' }] },
  { id: 'c', steps: [{ id: 'c0' }] },
];
function world() {
  const G = { m: {}, cur: '' },
    log = [];
  const io = {
    enter: (m, i, why) => log.push('enter ' + m.steps[i].id + ' ' + why),
    leave: (m, i, why) => log.push('leave ' + m.steps[i].id + ' ' + why),
    emit: (n, d) => log.push(n + ' ' + d.id + ' ' + (d.st ?? d.i)),
    save: () => {},
    done: m => log.push('done ' + m.id),
    gabe: m => log.push('gabe ' + m.id),
  };
  return { G, log, R: L.runner(MIS(), G, io) };
}

test('a mission starts at its first step, steps advance, the last step finishes it', () => {
  const { G, log, R } = world();
  assert.equal(R.start('a'), true);
  assert.deepEqual(G.m.a, { st: 'läuft', i: 0, n: 0 });
  assert.equal(G.cur, 'a');
  assert.equal(R.step().id, 'a0');
  R.next();
  R.next();
  assert.equal(R.step().id, 'a2');
  R.next();
  assert.equal(G.m.a.st, 'erledigt');
  assert.equal(G.cur, '');
  assert.equal(R.cur(), null);
  assert.deepEqual(log.slice(0, 4), ['mission a läuft', 'schritt a 0', 'enter a0 start', 'leave a0 fertig']);
  assert.deepEqual(log.slice(-3), ['leave a2 fertig', 'mission a erledigt', 'done a']);
  assert.equal(R.nextOpen().id, 'b');
  assert.equal(R.start('nonsense'), false);
});

test('a failure goes back to the checkpoint and counts the tries – never further', () => {
  const { G, log, R } = world();
  R.start('b');
  R.next();
  R.next();
  assert.equal(R.step().id, 'b2');
  R.fail('erwischt');
  assert.equal(R.step().id, 'b0', 'b2 names b0 as its checkpoint');
  assert.equal(G.m.b.n, 1);
  assert.equal(G.m.b.st, 'läuft');
  assert.deepEqual(log.slice(-4), ['leave b2 fehl', 'mission b nochmal', 'schritt b 0', 'enter b0 nochmal']);
  R.next();
  R.next();
  R.next();
  assert.equal(R.step().id, 'b3');
  R.fail();
  assert.equal(R.step().id, 'b3', 'a step without a checkpoint starts itself again');
  assert.equal(G.m.b.n, 2);
});

test('a reload goes on at the checkpoint of the saved step; nothing running: nothing to resume', () => {
  const { G, log, R } = world();
  assert.equal(R.resume(), false);
  G.m.b = { st: 'läuft', i: 2, n: 0 };
  G.cur = 'b';
  assert.equal(R.resume(), true);
  assert.equal(G.m.b.i, 0);
  assert.equal(log.at(-1), 'enter b0 reload');
  G.m.b.i = 99;
  R.resume();
  assert.equal(R.step().id, 'b3', 'a step number beyond the mission is clamped');
  G.cur = 'gone';
  assert.equal(R.resume(), false);
  assert.equal(G.cur, '');
});

test('the journal lists what is done, what runs and the next one – later missions stay a secret', () => {
  const { R } = world();
  assert.deepEqual(R.list(), [{ id: 'a', status: 'offen', i: 0 }]);
  R.start('a');
  assert.deepEqual(R.list(), [{ id: 'a', status: 'läuft', i: 0 }]);
  R.next();
  R.next();
  R.next();
  assert.deepEqual(R.list(), [
    { id: 'a', status: 'erledigt', i: 2 },
    { id: 'b', status: 'offen', i: 0 },
  ]);
  assert.equal(R.allDone(), false);
});

test('the debug jump: everything before is done (with what it gave), the target runs at the named step', () => {
  const { G, log, R } = world();
  R.start('a');
  assert.equal(R.jump('b', 'b2'), true);
  assert.equal(G.m.a.st, 'erledigt');
  assert.equal(G.cur, 'b');
  assert.equal(R.step().id, 'b2');
  assert.ok(log.includes('leave a0 abbruch'));
  assert.ok(log.includes('gabe a'));
  assert.equal(log.at(-1), 'enter b2 debug');
  R.jump('a', 1);
  assert.equal(R.step().id, 'a1');
  assert.equal(G.m.b, undefined, 'what comes after is open again');
  assert.equal(R.jump('zzz'), false);
  R.jump('c');
  R.next();
  assert.equal(R.allDone(), true);
  assert.equal(R.nextOpen(), null);
});

test('starting another mission while one runs leaves that one open', () => {
  const { G, R } = world();
  R.start('a');
  R.next();
  R.start('b');
  assert.equal(G.m.a.st, 'offen');
  assert.equal(G.cur, 'b');
});

test('the rubber band of the race is fair: a rival far ahead eases off, far behind he pushes, within bounds', () => {
  assert.equal(L.gummi(0), 12.8);
  assert.ok(L.gummi(80) < L.gummi(0));
  assert.ok(L.gummi(-90) > L.gummi(0));
  assert.ok(L.gummi(1e6) >= 12.8 - 3.6 - 1e-9);
  assert.ok(L.gummi(-1e6) <= 12.8 + 2.2 + 1e-9);
  assert.equal(L.gummi(NaN), 12.8);
  for (let g = -300; g < 300; g += 7) assert.ok(L.gummi(g) >= L.gummi(g + 7) - 1e-9, 'monotonic');
  assert.equal(L.platz(100, [120, 80]), 2);
  assert.equal(L.platz(130, [120, 80]), 1);
  assert.equal(L.platz(10, [120, 80]), 3);
});

test('night and waiting: 21:30 to 4:30 is night; minutes until the next hour of the day', () => {
  assert.equal(L.nacht(23 * 60), true);
  assert.equal(L.nacht(3 * 60), true);
  assert.equal(L.nacht(12 * 60), false);
  assert.equal(L.nacht(5 * 1440 + 21 * 60 + 29), false);
  assert.equal(L.nacht(-60), true);
  assert.equal(L.bis(17 * 60 + 20, 22, 30), 310);
  assert.equal(L.bis(23 * 60, 22, 30), 1410);
  assert.equal(L.bis(22 * 60 + 30, 22, 30), 1440);
});

test('a guard: a glance is no alarm, a good look is; out of sight he gives up after a while', () => {
  const W = L.wache();
  assert.equal(L.wachsam(W, 0.2, { sees: true, d: 30 }), null);
  for (let i = 0; i < 20; i++) L.wachsam(W, 0.2, { sees: false, d: 30 });
  assert.equal(W.see, 0);
  let ev = null,
    t = 0;
  while (!ev && t < 5) {
    ev = L.wachsam(W, 0.1, { sees: true, d: 30 });
    t += 0.1;
  }
  assert.equal(ev, 'alarm');
  assert.ok(t > 1 && t < 2, 'far away it takes more than a second: ' + t);
  const V = L.wache();
  assert.equal(L.wachsam(V, 0.3, { sees: true, d: 3 }), 'alarm', 'close by at once');
  ev = null;
  for (let i = 0; i < 50 && !ev; i++) ev = L.wachsam(V, 0.1, { sees: true, d: 3 });
  assert.equal(ev, null, 'while he sees he does not give up');
  for (let i = 0; i < 100 && !ev; i++) ev = L.wachsam(V, 0.1, { sees: false, d: 40 });
  assert.equal(ev, 'weg');
  assert.equal(V.st, 'ruhig');
});

test('lines stay long enough to read; the closing screen has its rows', () => {
  assert.equal(L.dauer('Stimmt.'), 2000);
  assert.ok(L.dauer('x'.repeat(100)) > 6000);
  assert.ok(L.dauer('x'.repeat(1000)) <= 9000);
  const rows = L.bilanz({ taten: 7, entkommen: 2, erwischt: 1, km: 12.34, kegel: 9, fische: 3, best: 4.25 });
  assert.equal(rows.length, 6);
  assert.deepEqual(rows[3], ['Mit dem Moped gefahren', '12,3 km']);
  assert.match(rows[5][1], /^3 \(der schwerste 4,3 kg\)$/);
  assert.deepEqual(L.bilanz({})[4], ['Beste Kegelrunde', '–']);
  assert.equal(L.bilanz().length, 6);
});

test('the texts: five missions in order, every talk has speakers of the cast, the phone has its messages', () => {
  assert.deepEqual(D.ORDER, ['gefallen', 'clique', 'gerhard', 'klinge', 'coup']);
  for (const id of D.ORDER) {
    assert.ok(D.M[id].title && D.M[id].done && D.M[id].teaser, id);
    assert.ok(Object.keys(D.S[id]).length >= 5, id + ' has steps');
  }
  for (const [k, lines] of Object.entries(D.R))
    for (const [who, text] of lines) {
      assert.ok(who === '' || GLDATA.CAST[who], k + ': ' + who + ' is in the cast');
      assert.ok(text.length > 3 && text.length < 190, k + ': a line fits the subtitle (' + text.length + ')');
    }
  assert.ok(GLDATA.CAST.wache3, 'the third man of the night at the Klinge');
  for (const v of Object.values(D.SMS)) assert.equal(v.length, 2);
  // nobody real is a culprit or a target: the neighbours never appear
  const all = JSON.stringify([D.R, D.S, D.SMS, D.CHAT, D.M, D.T]);
  assert.equal(/Hubert|Ronald/.test(all), false);
});

test('three hollow stars for the flare at the Klinge with the weight the mission uses', () => {
  const W = GLLOGIK.fresh(),
    k = (GLLOGIK.STEPS[2] + 0.05) / GLLOGIK.CRIMES.hausfrieden.h;
  GLLOGIK.crime(W, 'hausfrieden', { seen: 1, k });
  assert.equal(GLLOGIK.stars(W), 3);
  assert.equal(W.known, false);
});

test('the yard: the plan turns with the track, the gap is at the back, the gate in front, nothing overlaps, the rounds are inside', () => {
  for (const [az, side] of [
    [81, 1],
    [81, -1],
    [0, 1],
    [200, -1],
  ]) {
    const Y = D.lager([523, 549], az, side),
      H = Y.H;
    // there and back
    const p = Y.w(5, -3),
      q = Y.l(p[0], p[1]);
    assert.ok(Math.abs(q[0] - 5) < 1e-9 && Math.abs(q[1] + 3) < 1e-9);
    // the gate lies across the yard from the gap
    assert.ok(Y.l(Y.tor[0], Y.tor[1])[1] > 0);
    assert.ok(Y.l(Y.hinten[0], Y.hinten[1])[1] < H.b0);
    assert.equal(Y.innen(Y.hinten[0], Y.hinten[1]), false);
    assert.equal(Y.innen(Y.drin[0], Y.drin[1]), true);
    assert.equal(Y.innen(Y.vorTor[0], Y.vorTor[1]), false);
    assert.equal(Y.innen(Y.vorTuer[0], Y.vorTuer[1]), true);
    assert.equal(Y.innen(Y.karte[0], Y.karte[1]), true);
    // the camera looks out of the gate
    const k = Y.kamera,
      vor = Y.w(H.kamera.a, H.kamera.b + 10);
    assert.ok(GLLOGIK.sieht({ x: k[0], y: k[1], hd: k.hd, r: 28 }, vor[0], vor[1]));
    assert.equal(GLLOGIK.sieht({ x: k[0], y: k[1], hd: k.hd, r: 28 }, Y.drin[0], Y.drin[1]), false);
    // free: the guards' rounds, the way from the gap to the office door, the lorry – nothing stands in a box
    const free = (a, b, m = 0.3) => Y.boxen.every(B => Math.abs(a - B.a) > B.la + m || Math.abs(b - B.b) > B.lb + m);
    for (const pt of H.runde.concat(H.posten)) assert.ok(free(pt[0], pt[1]), 'round ' + pt);
    for (let i = 0; i < H.runde.length; i++) {
      const a = H.runde[i],
        b = H.runde[(i + 1) % H.runde.length];
      for (let t = 0; t <= 1; t += 0.05)
        assert.ok(free(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t), 'the round is free at ' + i + ' ' + t);
    }
    assert.ok(free(...Y.l(Y.drin[0], Y.drin[1])), 'inside the gap');
    assert.ok(free(...Y.l(Y.vorTuer[0], Y.vorTuer[1])), 'in front of the door');
    assert.ok(free(...Y.l(Y.imBuero[0], Y.imBuero[1]), 0.2), 'inside the office');
    assert.ok(free(H.lkw.a, H.lkw.b, 1.3), 'the lorry');
    // the containers do not overlap each other or the fence
    const C = Y.boxen.filter(B => B.k === 'container');
    assert.equal(C.length, 4);
    for (const A of C) {
      assert.ok(A.a - A.la > H.a0 + 0.5 && A.a + A.la < H.a1 - 0.5 && A.b - A.lb > H.b0 + 0.5 && A.b + A.lb < H.b1 - 0.5);
      for (const B of C) if (A !== B) assert.ok(Math.abs(A.a - B.a) >= A.la + B.la || Math.abs(A.b - B.b) >= A.lb + B.lb);
    }
    // sight: a container hides, the closed office door hides the room, open ground does not; the guards are pushed out of boxes
    const c0 = C[0],
      pA = Y.w(c0.a, c0.b - c0.lb - 2),
      pB = Y.w(c0.a, c0.b + c0.lb + 6);
    assert.equal(Y.sicht(pA[0], pA[1], pB[0], pB[1]), false, 'through two containers');
    assert.equal(Y.sicht(Y.drin[0], Y.drin[1], Y.hinten[0], Y.hinten[1]), true, 'through the gap');
    assert.equal(Y.sicht(Y.vorTuer[0], Y.vorTuer[1], Y.imBuero[0], Y.imBuero[1], true), false, 'the door is closed');
    assert.equal(Y.sicht(Y.vorTuer[0], Y.vorTuer[1], Y.imBuero[0], Y.imBuero[1], false), true, 'the door is open');
    const mid = Y.w(c0.a + 1, c0.b + 0.2),
      out = Y.raus(mid[0], mid[1]),
      lo = Y.l(out[0], out[1]);
    assert.ok(C.every(B => Math.abs(lo[0] - B.a) >= B.la + 0.34 || Math.abs(lo[1] - B.b) >= B.lb + 0.34), 'pushed out of the containers');
    const far = Y.w(60, -40),
      hin = Y.hinein(far[0], far[1]);
    assert.equal(Y.innen(hin[0], hin[1]), true);
    // the fence is closed except for gate and gap
    let len = 0;
    for (const [s, e] of Y.zaun) len += Math.hypot(e[0] - s[0], e[1] - s[1]);
    const per = 2 * (H.a1 - H.a0 + H.b1 - H.b0);
    assert.ok(Math.abs(per - len - (H.tor[1] - H.tor[0]) - (H.luecke[1] - H.luecke[0])) < 1e-9);
  }
});
