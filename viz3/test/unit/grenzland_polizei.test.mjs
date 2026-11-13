// Unit tests of feat/grenzland-polizei: the police of „Grenzland“ without a browser – the decisions of the game (grenzland/gl_logik.js:
// GLLOGIK.netz, GLLOGIK.einsatz) on the real road graph and between the real walls of the square (viz3/extra/grenzland-polizei/fixtures),
// the cars driven as grenzland/gl_auto.js drives them (viz3/extra/grenzland-polizei/sim/welt.mjs). What a browser must show is in
// viz3/test/grenzland_polizei.py.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it); a scene step by step: node viz3/extra/grenzland-polizei/sim/lauf.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GLLOGIK as G } from '../../src/grenzland/gl_logik.js';
import { VNETZ } from '../../src/verkehr/verkehr_netz.js';
import { welt, steht, geht, faehrt, zufall, BOX } from '../../extra/grenzland-polizei/sim/welt.mjs';

const hyp = Math.hypot;
const names = w => w.log.map(e => e[1]);
const when = (w, name) => (w.log.find(e => e[1] === name) || [Infinity])[0];

test('roads: the square is one network with five road ends; a line can be driven from every road end to every junction', () => {
  const w = welt(),
    N = w.N;
  assert.equal(N.exits.length, 5);
  let n = 0,
    worst = 0;
  for (const x of N.exits)
    for (let i = 0; i < N.G.nodes.length; i += 5) {
      const nd = N.G.nodes[i];
      if (N.comp[i] !== N.main || hyp(nd.x - x.x, nd.y - x.y) < 30) continue;
      const R = N.linie({ x: x.x, y: x.y, hd: null }, [nd.x, nd.y], { k: 1.3 });
      assert.ok(R && R.line.L > 10, 'a way from the road end ' + [x.x, x.y].map(Math.round) + ' to ' + [nd.x, nd.y].map(Math.round));
      // it ends at the junction and never leaves the road (the lane beside the middle, corners cut a little)
      const e = VNETZ.at(R.line, R.line.L, {});
      assert.ok(hyp(e.x - nd.x, e.y - nd.y) < 4, 'ends at the place');
      for (let s = 0; s < R.line.L; s += 7) {
        const q = VNETZ.at(R.line, s, {});
        worst = Math.max(worst, N.abstand(q.x, q.y));
      }
      assert.ok(R.line.S.every(v => v >= 0 && v < 40), 'speeds per metre');
      n++;
    }
  assert.ok(n > 250, n + ' ways');
  assert.ok(worst < 3.6, 'never more than a lane off the middle of a road: ' + worst.toFixed(2));
});

test('roads: a line starts where the car stands and the way it faces; the other way round it turns on the road', () => {
  const N = welt().N,
    A = N.nah(440, -600); // on the county road south of the village
  assert.ok(A && A.d < 8 && A.e.kind <= 2);
  const hd = Math.atan2(A.dx, A.dy); // facing along the edge
  for (const [h, turn] of [
    [hd, false],
    [hd + Math.PI, true],
  ]) {
    const to = N.punkt(A.e, Math.min(N.lenOf(A.e), A.t + 150)),
      R = N.linie({ x: A.x, y: A.y, hd: h }, [to[0], to[1]], { k: 1 });
    assert.ok(R);
    // (facing the other way it turns: on the spot, or at the junction a few metres ahead – both on the road)
    const e = VNETZ.at(R.line, R.line.L, {});
    assert.ok(hyp(e.x - to[0], e.y - to[1]) < 3, 'the line ends at the place' + (turn ? ' after the turn' : ''));
    assert.ok(R.zeit > 5 && R.zeit < (turn ? 20 : 9), 'seconds: ' + R.zeit.toFixed(1));
    const pr = VNETZ.project(R.line, A.x, A.y, 0, 14),
      at = VNETZ.at(R.line, pr.s, {});
    assert.ok(pr.d < 2.2, 'the car is on the line (its lane): ' + pr.d.toFixed(2));
    assert.ok(Math.cos(at.hd - h) > 0.9, 'and faces along it');
    // the whole turn stays on the road
    for (let s = 0; s < Math.min(40, R.line.L); s += 0.5) {
      const q = VNETZ.at(R.line, s, {});
      assert.ok(N.abstand(q.x, q.y) < 3.2, 'on the road at ' + s);
    }
  }
});

test('walls: a sight line is cut by a wall, free beside it', () => {
  const Wd = G.waende([
    [0, 0, 10, 0],
    [10, 0, 10, 10],
  ]);
  assert.equal(Wd.frei(5, -5, 5, 5), false);
  assert.equal(Wd.frei(-5, -5, -5, 5), true);
  assert.equal(Wd.frei(5, 5, 15, 5), false);
  assert.equal(Wd.frei(5, 5, 5, 0.01), true, 'standing at a wall, looking along it');
  const w = welt();
  // the old school at the Anger: from the street one does not see behind it
  assert.equal(w.los(222, -108, 226, -100), true);
  let blocked = 0;
  for (let a = 0; a < 6.28; a += 0.2) if (!w.los(222, -108, 222 + Math.sin(a) * 60, -108 + Math.cos(a) * 60)) blocked++;
  assert.ok(blocked > 8, 'houses round the Anger block most directions: ' + blocked);
});

test('a reported deed: the car comes from a road end, goes to the place first, looks around, cruises near it, the stars go, it leaves', () => {
  const w = welt({ seed: 3 });
  w.deed('einbruch', 222, -108);
  assert.equal(G.stars(w.W), 2);
  let arrived = Infinity,
    nearest = Infinity,
    far = 0,
    held = true;
  w.spiel(steht(60, -420), 400, t => {
    const u = w.E.units[0];
    if (u && u.st === 'anfahrt') held = held && G.stars(w.W) === 2;
    if (u && u.st !== 'abzug') {
      const d = hyp(u.x - 222, u.y + 108);
      nearest = Math.min(nearest, d);
      if (u.st === 'suche') {
        arrived = Math.min(arrived, t);
        far = Math.max(far, d);
      }
    }
  });
  const t0 = when(w, 'streife');
  assert.ok(t0 > 25 && t0 < 35, 'the first car after the delay of two stars: ' + t0);
  assert.ok(held, 'the stars hold while the car is on its way');
  assert.ok(arrived < 200, 'it arrives: ' + arrived);
  assert.ok(nearest < 15, 'it comes to the place itself first: ' + nearest.toFixed(1));
  assert.ok(far > 20 && far < 400, 'then it cruises the roads near it: ' + far.toFixed(0));
  assert.ok(names(w).includes('entkommen'), 'out of sight the stars go');
  assert.equal(w.E.units.length, 0, 'and the cars have left');
  assert.equal(w.stats.spawn, w.stats.remove);
  assert.ok(w.stats.maxOff < 3.6, 'no car left the road: ' + w.stats.maxOff.toFixed(2));
  assert.ok(!names(w).includes('fest'), 'no car stood for ever');
});

test('seeing: by day from far, at night only from close by, never through a wall, not a sneaker in the dark', () => {
  // the player stands beside the county road south of the village, in the open
  const spot = [446, -600];
  const run = (o, q) => {
    const w = welt(Object.assign({ seed: 4 }, o));
    w.deed('einbruch', spot[0], spot[1]);
    let dSeen = null;
    w.spiel(steht(spot[0], spot[1], q), 200, () => {
      if (dSeen == null && w.E.seen) dSeen = Math.min(...w.E.units.map(u => hyp(u.x - spot[0], u.y - spot[1])));
      return dSeen != null;
    });
    return dSeen;
  };
  const day = run({}, {}),
    night = run({ dark: true }, {}),
    sneak = run({ dark: true }, { sneak: true }),
    indoors = run({}, { hidden: true });
  assert.ok(day > 60 && day <= 80, 'by day from ' + day);
  assert.ok(night > 25 && night <= 42, 'at night from ' + night);
  assert.ok(sneak < night, 'crouching in the dark they come much closer: ' + sneak);
  assert.equal(indoors, null, 'indoors nobody sees him');
  // in the yard behind the old school: a car that is near but has a wall between itself and him does not see him
  const w = welt({ seed: 4 });
  w.deed('einbruch', 222, -108, { knows: true });
  let blocked = 0,
    wrong = 0;
  w.spiel(steht(213, -70), 220, () => {
    let free = false,
      near = false;
    for (const u of w.E.units) {
      const d = hyp(u.x - 213, u.y + 70);
      if (d < 75 && u.st !== 'abzug') {
        near = true;
        if (w.los(u.x, u.y, 213, -70)) free = true;
      }
    }
    if (near && !free) {
      blocked++;
      if (w.E.seen && !w.E.cops.length) wrong++;
    }
  });
  assert.ok(blocked > 20, 'cars came near with walls in between: ' + blocked);
  assert.equal(wrong, 0, 'and did not see him through them');
});

test('on foot: the car stops near him, two officers get out and walk over; whoever stands is caught', () => {
  const w = welt({ seed: 3 });
  w.deed('einbruch', 222, -108);
  let stop = null,
    cops = 0;
  const end = w.spiel(steht(226, -100), 240, (t, p, evs) => {
    cops = Math.max(cops, w.E.cops.length);
    const u = w.E.units.find(v => v.st === 'steht');
    if (u && stop == null && u.v < 0.1) stop = hyp(u.x - p.x, u.y - p.y);
    return evs.some(e => e[0] === 'erwischt');
  });
  assert.ok(end, 'caught');
  assert.ok(stop > 5 && stop < 26, 'the car stopped near him, not on him: ' + stop);
  assert.equal(cops, 2);
  assert.ok(when(w, 'aussteigen') < when(w, 'erwischt'));
  assert.ok(when(w, 'erwischt') - when(w, 'aussteigen') > 4, 'they walk over (it takes a moment)');
  assert.equal(w.E.units.length + w.E.cops.length, 0, 'after the arrest nothing is left');
  assert.equal(G.stars(w.W), 0);
});

test('on foot: whoever runs gets away – they go to where he was last seen, look around, get in again, search on', () => {
  const w = welt({ seed: 5 });
  w.deed('einbruch', 222, -108);
  let run = 0,
    back = 0,
    maxCop = 0;
  const pl = t => {
    if (!run && w.E.cops.length) run = t;
    const s = run ? Math.min(380, (t - run) * 4.75) : 0;
    return { x: 226 - s * 0.3, y: -100 + s * 0.95, v: run && s < 380 ? 4.75 : 0, hd: Math.atan2(-0.3, 0.95), veh: false, hidden: false, cover: false, sneak: false };
  };
  w.spiel(pl, 420, (t, p) => {
    for (const c of w.E.cops) {
      maxCop = Math.max(maxCop, hyp(c.x - 240, c.y + 100));
      if (c.st === 'zurück') back = back || t;
    }
  });
  assert.ok(run > 0, 'the officers got out');
  assert.ok(!names(w).includes('erwischt'), 'not caught');
  assert.ok(back > run, 'they walk back to the car');
  assert.ok(maxCop > 15 && maxCop < 120, 'after having gone after him a good way: ' + maxCop.toFixed(0));
  assert.ok(when(w, 'einsteigen') > back, 'and get in again');
  assert.ok(names(w).includes('entkommen'));
  assert.equal(w.E.units.length + w.E.cops.length, 0);
  assert.equal(w.stats.cops, w.stats.copsGone);
});

test('a moped on the road is followed closely; off the road the car stays on it, they walk over and take him when he stands', () => {
  const w = welt({ seed: 5 });
  const f = faehrt(w.N, [222, -108], [600, -1030], 13);
  w.deed('rempeln', 222, -108, { police: true });
  w.E.wait = 1;
  let off = 0,
    q = null,
    close = Infinity,
    carOff = 0,
    chase = 0;
  const pl = t => {
    const a = f(t);
    if (a.s < a.L) return a;
    if (!off) {
      off = t;
      q = a;
    }
    const s = Math.min(90, (t - off) * 9);
    return { x: q.x - s, y: q.y - s * 0.2, v: s < 90 ? 9 : 0, hd: Math.atan2(-1, -0.2), veh: true, hidden: false, cover: false, sneak: false };
  };
  const end = w.spiel(pl, 260, (t, p, evs) => {
    for (const u of w.E.units) {
      carOff = Math.max(carOff, w.N.abstand(u.x, u.y));
      if (u.st === 'verfolgt' && !off) {
        chase += 0.05;
        if (chase > 8) close = Math.min(close, hyp(u.x - p.x, u.y - p.y));
      }
    }
    return evs.some(e => e[0] === 'erwischt');
  });
  assert.ok(chase > 8, 'it follows him along the road: ' + chase.toFixed(0) + ' s');
  assert.ok(close < 16, 'and closes up: ' + close.toFixed(1));
  assert.ok(w.W.fz || end, 'they know the moped now');
  assert.ok(carOff < 3.6, 'the car stays on the road while he rides into the field: ' + carOff.toFixed(2));
  assert.ok(end, 'standing in the field with the moped he is caught by the officers on foot');
  assert.ok(names(w).includes('aussteigen'));
});

test('a long chase is a deed of its own; three stars put a road block ahead on his road; driving past it is another deed', () => {
  const w = welt({ seed: 3 });
  const f = faehrt(w.N, [222, -108], [860, -1300], 13);
  w.deed('einbruch', 222, -108, { police: true });
  w.E.wait = 1;
  let B = null,
    ahead = null;
  w.spiel(f, 130, (t, p, evs) => {
    if (w.E.block && !B) {
      B = Object.assign({}, w.E.block);
      ahead = hyp(B.x - p.x, B.y - p.y);
      // it stands on a road, across the way he comes
      assert.ok(w.N.abstand(B.x, B.y) < 0.5);
      const A = w.N.nah(B.x, B.y);
      assert.ok(A.e.kind <= 3, 'on a real road, not a track');
      assert.ok((p.x - B.x) * Math.sin(B.hd) + (p.y - B.y) * Math.cos(B.hd) > 100, 'ahead of him, facing him');
    }
    return evs.some(e => e[0] === 'erwischt');
  });
  assert.ok(w.stats.tat.includes('flucht'), 'the chase itself counts');
  assert.ok(B, 'a road block went up');
  assert.ok(ahead > 150 && ahead < 420, 'some hundred metres ahead: ' + Math.round(ahead));
  assert.ok(w.stats.tat.includes('sperre'), 'passing it is a deed');
  assert.ok(names(w).includes('durchbruch'));
  assert.ok(w.stats.maxOff < 3.6, 'no car left the road: ' + w.stats.maxOff.toFixed(2));
});

test('clear() leaves nothing behind, whatever was going on', () => {
  const w = welt({ seed: 9 });
  w.deed('einbruch', 222, -108, { police: true });
  w.deed('widerstand', 222, -108, { police: true });
  w.deed('sperre', 222, -108, { police: true });
  w.E.wait = 1;
  const f = faehrt(w.N, [222, -108], [860, -1300], 11);
  w.spiel(f, 75);
  assert.ok(w.E.units.length >= 2, 'several cars');
  w.E.clear();
  G.clear(w.W);
  assert.equal(w.E.units.length, 0);
  assert.equal(w.E.cops.length, 0);
  assert.equal(w.E.block, null);
  assert.equal(w.E.last, null);
  assert.equal(w.stats.spawn, w.stats.remove);
  assert.equal(w.stats.cops, w.stats.copsGone);
  assert.equal(w.stats.blocks, w.stats.unblocks);
  // and it can start again
  w.deed('rempeln', 222, -108);
  w.spiel(steht(60, -420), 300);
  assert.ok(w.stats.spawn > 2 && w.E.units.length === 0);
});

test('a quarter of an hour of trouble all over the square: no car leaves the road, none stands for ever, the numbers stay sane', () => {
  for (const seed of [11]) {
    const w = welt({ seed }),
      rnd = zufall(seed * 7 + 1),
      N = w.N;
    // he rides from junction to junction, now and then across the fields, now and then he stops; deeds keep the level up
    let cur = [222, -108],
      f = null,
      t0 = 0,
      mode = 'ride',
      maxUnits = 0,
      maxCops = 0;
    const next = t => {
      const i = Math.floor(rnd() * N.G.nodes.length),
        nd = N.G.nodes[i];
      t0 = t;
      if (N.comp[i] !== N.main || hyp(nd.x - cur[0], nd.y - cur[1]) < 60 || rnd() < 0.25) {
        // across the fields, or standing for a while
        mode = rnd() < 0.5 ? 'stand' : 'field';
        const to = [BOX[0] + 80 + rnd() * (BOX[2] - BOX[0] - 160), BOX[1] + 80 + rnd() * (BOX[3] - BOX[1] - 160)];
        f = mode === 'stand' ? steht(cur[0], cur[1], { veh: rnd() < 0.5, T: 20 + rnd() * 30 }) : geht(cur, to, 8, { veh: true }, t);
        f.to = mode === 'stand' ? cur : to;
        f.T = mode === 'stand' ? 20 + rnd() * 30 : hyp(to[0] - cur[0], to[1] - cur[1]) / 8;
      } else {
        mode = 'ride';
        f = faehrt(N, cur, [nd.x, nd.y], 9 + rnd() * 6, {}, t);
        f.to = null;
      }
    };
    next(0);
    w.deed('einbruch', cur[0], cur[1], { police: true });
    w.E.wait = 1;
    w.spiel(
      t => {
        let p = f(t);
        const over = mode === 'ride' ? p.s >= p.L : t - t0 > f.T;
        if (over) {
          cur = [p.x, p.y];
          next(t);
          p = f(t);
        }
        return p;
      },
      900,
      (t, p, evs) => {
        maxUnits = Math.max(maxUnits, w.E.units.filter(u => u.st !== 'riegel' && u.st !== 'abzug').length);
        maxCops = Math.max(maxCops, w.E.cops.length);
        // (after an arrest, or when the level has gone: a new deed, seen by somebody)
        if (G.stars(w.W) === 0 && Math.floor(t * 20) % 400 === 0) w.deed(rnd() < 0.5 ? 'einbruch' : 'schlag', p.x, p.y, { police: rnd() < 0.5 });
        for (const u of w.E.units) assert.ok(Number.isFinite(u.x + u.y + u.v + u.hd), 'finite');
      },
      0.1
    );
    assert.ok(w.stats.spawn >= 4, 'seed ' + seed + ': cars were sent: ' + w.stats.spawn);
    assert.ok(w.stats.maxOff < 3.8, 'seed ' + seed + ': no car left the road: ' + w.stats.maxOff.toFixed(2));
    const fest = w.log.filter(e => e[1] === 'fest');
    assert.ok(fest.length === 0, 'seed ' + seed + ': no car stood for ever: ' + JSON.stringify(fest.slice(0, 3)));
    assert.ok(maxUnits <= 5, 'seed ' + seed + ': at most five vehicles on the hunt: ' + maxUnits);
    assert.ok(maxCops <= 4, 'seed ' + seed + ': at most four officers on foot: ' + maxCops);
  }
});

test('what is sent grows with the stars; 1989 the Volkspolizei comes alone and the ABV on foot knows everybody', () => {
  assert.deepEqual(
    [1, 2, 3, 4, 5].map(n => G.kraefte(n).cars + G.kraefte(n).vans),
    [1, 2, 3, 3, 5]
  );
  assert.equal(G.kraefte(2).sperre, false);
  assert.equal(G.kraefte(3).sperre, true);
  assert.equal(G.kraefte(3).heli, false);
  assert.equal(G.kraefte(4).heli, true);
  assert.equal(G.kraefte(5).riegel, true);
  assert.ok(G.kraefte(1).schritt < 2.5 && G.kraefte(5).schritt > 2.5 && G.kraefte(5).schritt < 4.75, 'one star: he walks away; five: he must run');
  const K = G.kraefte(5, '1989');
  assert.deepEqual([K.cars, K.vans, K.sperre, K.heli, K.riegel, K.abv], [1, 0, false, false, false, true]);
  assert.ok(G.kraefte(1, '1989').delay < G.kraefte(1).delay);
  // 1989: a deed a stranger saw – hollow stars; the ABV comes on foot, sees him and knows him at once
  const w = welt({ seed: 2, era: '1989' });
  w.deed('kiste', 236, -93);
  assert.equal(w.W.known, false);
  let abv = false;
  w.spiel(steht(232, -99), 60, (t, p, evs) => {
    abv = abv || w.E.cops.some(c => c.kind === 'abv');
    return w.W.known;
  });
  assert.ok(abv, 'the ABV is on his way on foot');
  assert.equal(w.W.known, true, 'he knows everybody');
  assert.ok(w.E.units.every(u => u.kind === 'vopo') && w.E.units.length <= 1);
  const end = w.spiel(steht(232, -99), 120, (t, p, evs) => evs.some(e => e[0] === 'erwischt'));
  assert.ok(end, 'and takes him if he stands');
  assert.equal(w.E.block, null);
});

test('where there are no roads two officers come on foot from round a corner', () => {
  const w = welt({ seed: 6, roads: false });
  w.deed('rempeln', 222, -108);
  let n = 0,
    d0 = null;
  const end = w.spiel(steht(222, -108), 120, (t, p, evs) => {
    if (w.E.cops.length && d0 == null) d0 = hyp(w.E.cops[0].x - p.x, w.E.cops[0].y - p.y);
    n = Math.max(n, w.E.cops.length);
    return evs.some(e => e[0] === 'erwischt');
  });
  assert.equal(w.stats.spawn, 0, 'no car');
  assert.equal(n, 2);
  assert.ok(d0 > 30 && d0 < 45, 'from some distance: ' + d0);
  assert.ok(end);
});

test('the helicopter: flies in after a while, circles over where he was last seen, sees in the open, not under trees or a roof', () => {
  const H = G.heli(),
    rnd = zufall(4),
    P0 = { x: 100, y: -300, veh: false, hidden: false, cover: false };
  const run = (secs, p, env, each) => {
    const all = [];
    for (let t = 0; t < secs; t += 0.05) {
      for (const e of H.tick(0.05, p, Object.assign({ rnd, delay: 10 }, env))) all.push(e);
      if (each) each();
    }
    return all;
  };
  assert.deepEqual(run(30, P0, { want: false, last: [100, -300] }), [], 'not below four stars');
  assert.equal(H.on, false);
  let ev = run(9, P0, { want: true, last: [100, -300] });
  assert.equal(H.on, false, 'it takes a while to come');
  ev = run(40, P0, { want: true, last: [100, -300] });
  assert.ok(ev.includes('anflug') && ev.includes('da'), ev.join(' '));
  assert.equal(H.st, 'kreist');
  assert.ok(Math.abs(hyp(H.x - 100, H.y + 300) - H.r) < 12, 'on its circle over him');
  assert.ok(H.h > 35 && H.h < 60);
  assert.ok(ev.includes('sicht') && H.sieht, 'it sees him standing in the open');
  // under the trees: lost; it keeps circling over where he was last seen
  ev = run(20, Object.assign({}, P0, { cover: true }), { want: true, last: [100, -300] });
  assert.ok(ev.includes('verloren') && !H.sieht);
  ev = run(20, Object.assign({}, P0, { hidden: true }), { want: true, last: [100, -300] });
  assert.ok(!H.sieht, 'nor under a roof');
  // at night: only what the search light falls on – standing in the open near the middle it finds him, far off it does not
  let found = 0;
  run(60, P0, { want: true, last: [100, -300], dark: true }, () => {
    if (H.sieht) found++;
  });
  assert.ok(found > 0, 'the light finds him');
  assert.ok(hyp(H.lx - 100, H.ly + 300) < H.KEGEL + 1, 'and stays on him');
  const far = { x: 100 + 75, y: -300, veh: false, hidden: false, cover: false };
  H.sieht = false;
  found = 0;
  run(40, far, { want: true, last: [100, -300], dark: true }, () => {
    if (H.sieht) found++;
  });
  assert.equal(found, 0, 'seventy-five metres from where they look, in the dark, he is not seen');
  found = 0;
  run(10, far, { want: true, last: [100, -300] }, () => {
    if (H.sieht) found++;
  });
  assert.ok(found > 0, 'by day he is');
  // it follows him while it sees him
  const walk = { x: 175, y: -300, veh: false, hidden: false, cover: false };
  run(30, walk, { want: true, last: [100, -300] }, () => {
    walk.x += 4.75 * 0.05;
  });
  assert.ok(H.sieht && hyp(H.cx - walk.x, H.cy - walk.y) < 25, 'the circle moves with him');
  // the level falls: it flies off and is gone
  ev = run(40, walk, { want: false, last: null });
  assert.ok(ev.includes('abflug') && ev.includes('weg'), ev.join(' '));
  assert.equal(H.on, false);
  assert.equal(H.sieht, false);
});

test('five stars: a van of the special forces stands across the road at every road end, two more hunt; they go when the level falls', () => {
  const w = welt({ seed: 8 });
  for (const id of ['einbruch', 'widerstand', 'sperre', 'einbruch']) w.deed(id, 222, -108, { police: true });
  assert.equal(G.stars(w.W), 5);
  w.E.wait = 1;
  let vans = 0;
  w.spiel(steht(60, -420, { cover: true }), 60, () => {
    vans = Math.max(vans, w.E.units.filter(u => u.kind === 'sek' && u.st !== 'riegel' && u.st !== 'abzug').length);
  });
  const R = w.E.units.filter(u => u.st === 'riegel');
  assert.equal(R.length, 5, 'one at every road end');
  for (const u of R) {
    assert.ok(w.N.abstand(u.x, u.y) < 2.6, 'on the road (on the lane that leads out)');
    assert.ok(w.N.exits.some(x => hyp(x.x - u.x, x.y - u.y) < 60), 'near a road end');
    const A = w.N.nah(u.x, u.y);
    assert.ok(Math.abs(Math.sin(u.hd) * A.dx + Math.cos(u.hd) * A.dy) < 0.2, 'across it');
  }
  assert.ok(vans >= 1, 'vans hunt too: ' + vans);
  assert.ok(w.E.units.filter(u => u.kind !== 'sek').length <= 3);
  // hidden under the trees the level falls star by star; below five the vans at the road ends drive off
  w.spiel(steht(60, -420, { cover: true }), 600, () => G.stars(w.W) < 5 && w.E.units.every(u => u.st !== 'riegel'), 0.1);
  assert.ok(G.stars(w.W) < 5);
  assert.ok(w.E.units.every(u => u.st !== 'riegel'), 'the road ends are open again');
  w.spiel(steht(60, -420, { cover: true }), 900, () => G.stars(w.W) === 0 && !w.E.units.length, 0.1);
  assert.equal(G.stars(w.W), 0, 'five stars are not hopeless: hidden long enough, he gets away');
  assert.equal(w.E.units.length, 0);
  assert.equal(w.stats.spawn, w.stats.remove);
});

test('into a house in front of their eyes is no hiding place: they wait outside for a while before the search runs out', () => {
  const run = sawIn => {
    const w = welt({ seed: 3 });
    w.deed('rempeln', 222, -108, { police: true });
    w.E.wait = 1;
    let t0 = 0,
      gone = null;
    // he stands by the road; once the officers are out he is indoors – right away (they saw it), or after having got out of sight first
    const pl = t => {
      if (!t0 && w.E.cops.length) t0 = t;
      const far = !sawIn && t0 && t - t0 < 30;
      return { x: far ? 226 : 226, y: far ? -40 : -100, v: 0, hd: 0, veh: false, hidden: !!t0 && !far, cover: false, sneak: false };
    };
    w.spiel(pl, 400, t => {
      if (t0 && gone == null && G.stars(w.W) === 0) gone = t - t0;
      return gone != null;
    });
    return { gone, saw: w.E.sawHide };
  };
  const a = run(true),
    b = run(false);
  assert.ok(a.gone != null && b.gone != null, JSON.stringify([a, b]));
  assert.ok(a.gone > b.gone - 30 + 25, 'seen going in, it takes longer: ' + a.gone.toFixed(0) + ' s against ' + (b.gone - 30).toFixed(0) + ' s');
});

test('witnesses: a report takes a few seconds; talked out of it, it is not made; serious deeds cannot be talked away', () => {
  const W = G.fresh();
  assert.ok(G.meldeZeit('einbruch', false) < G.meldeZeit('boeller', false), 'a serious deed is reported sooner');
  assert.ok(G.meldeZeit('boeller', true) < G.meldeZeit('boeller', false), 'who knows him is sure sooner');
  for (const id of Object.keys(G.CRIMES)) assert.ok(G.meldeZeit(id, true) >= 3.5 && G.meldeZeit(id, false) <= 7.5, id);
  assert.deepEqual(
    Object.keys(G.CRIMES).filter(id => G.beredbar(id)).sort(),
    ['angeln', 'ausweis', 'boeller', 'flucht', 'hausfrieden', 'helm', 'raserei', 'rempeln'],
    'small things can be talked away'
  );
  assert.equal(G.beredbar('nonsense'), false);
  // a report on its way: nothing counts yet
  const q = G.melden(W, 'boeller', { seen: 1, key: 'fig:erna' });
  assert.ok(q && q.t > 3 && W.offen.length === 1);
  assert.equal(G.stars(W), 0);
  assert.deepEqual(G.reif(W, 2), []);
  assert.equal(G.still(W, 'fig:horst'), 0, 'somebody else\'s call is not hers');
  assert.equal(G.still(W, 'fig:erna'), 1);
  assert.deepEqual(G.reif(W, 20), [], 'talked out of it: nothing is reported');
  // one that goes through
  G.melden(W, 'einbruch', { seen: 2, knows: true, key: 'dorf:ingrid', fz: true });
  G.melden(W, 'boeller', { seen: 1, key: 'ped:x', sec: 9 });
  let due = G.reif(W, 5);
  assert.equal(due.length, 1);
  assert.equal(due[0].id, 'einbruch');
  assert.equal(G.crime(W, due[0].id, due[0].o), 2);
  assert.equal(W.known, true, 'a villager knows him');
  assert.equal(W.fz, true, 'and saw the moped');
  due = G.reif(W, 5);
  assert.equal(due.length, 1);
  assert.equal(W.offen.length, 0);
  assert.equal(G.melden(W, 'nonsense', {}), null);
  // clear() ends what is on its way too – but the moped stays known
  G.melden(W, 'boeller', { seen: 1, key: 'a' });
  G.clear(W);
  assert.equal(W.offen.length, 0);
  assert.equal(W.fz, true);
  assert.equal(G.umkennzeichnen(W), true);
  assert.equal(W.fz, false);
  assert.equal(G.umkennzeichnen(W), false);
});

test('new clothes end a description at once – a name stays a name, and not while somebody watches', () => {
  const W = G.fresh();
  assert.equal(G.umziehen(W), 'ruhe');
  G.crime(W, 'einbruch', { seen: 1 });
  assert.equal(W.look, true);
  assert.equal(G.umziehen(W, { seen: true }), 'gesehen');
  assert.equal(G.stars(W), 2);
  assert.equal(G.umziehen(W), 'frei');
  assert.equal(G.stars(W), 0);
  assert.equal(W.state, 'ruhe');
  assert.equal(W.log.length, 1, 'what happened is still remembered (the radio)');
  G.crime(W, 'einbruch', { seen: 1, knows: true });
  assert.equal(G.umziehen(W), 'bekannt');
  assert.equal(G.stars(W), 2);
  const V = G.fresh();
  G.crime(V, 'rempeln', { police: true });
  assert.equal(G.umziehen(V), 'bekannt', 'seen by the police themselves');
});

test('where a road block goes: ahead on the road he rides, never on a track, never outside the square', () => {
  const N = welt().N;
  let n = 0;
  for (let i = 0; i < N.G.edges.length; i += 7) {
    const e = N.G.edges[i];
    if (N.comp[e.a] !== N.main || e.kind > 3 || N.lenOf(e) < 30) continue;
    for (const dir of [1, -1]) {
      const q = N.punkt(e, N.lenOf(e) / 2),
        hd = Math.atan2(dir * q[2], dir * q[3]),
        B = N.sperrstelle({ x: q[0], y: q[1], hd });
      if (!B) continue;
      n++;
      assert.ok(B.d >= 150 && B.d <= 321, 'distance along the road: ' + B.d);
      assert.ok(B.e.kind <= 3, 'on a road');
      assert.ok(N.abstand(B.x, B.y) < 0.5);
      assert.ok(B.x > BOX[0] + 60 && B.x < BOX[2] - 60 && B.y > BOX[1] + 60 && B.y < BOX[3] - 60, 'inside the square');
      // it faces the way he comes along the road
      const A = N.nah(B.x, B.y);
      assert.ok(Math.abs(Math.sin(B.hd) * A.dx + Math.cos(B.hd) * A.dy) > 0.95, 'along the road');
    }
  }
  assert.ok(n > 15, n + ' places');
  assert.equal(N.sperrstelle({ x: 60, y: -420, hd: 0 }), null, 'in the fields there is no road to block');
});

test('new clothes while they search: the cars drive home by themselves', () => {
  const w = welt({ seed: 3 });
  w.deed('einbruch', 222, -108);
  w.spiel(steht(60, -420), 125, () => w.E.units.some(u => u.st === 'suche'));
  assert.ok(w.E.units.some(u => u.st === 'suche'), 'a car searches');
  assert.equal(G.umziehen(w.W), 'frei');
  w.spiel(steht(60, -420), 2);
  assert.ok(w.E.units.length > 0 && w.E.units.every(u => u.st === 'abzug' && !u.blau && !u.horn), 'they turn for home, lights out');
  assert.equal(w.E.last, null);
  w.spiel(steht(60, -420), 200, () => !w.E.units.length);
  assert.equal(w.E.units.length, 0);
  assert.equal(w.stats.spawn, w.stats.remove);
});
