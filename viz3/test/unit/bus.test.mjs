// Unit tests of feat/bus (bus/bus_fahrplan.js) without a browser: the Thuringian calendar (holidays, school holidays, service days), the real
// timetable cut to the world (viz3/extra/bus/dist/bus/fahrplan.json from gtfs.de): stops on the roads, departures at Ratscher on a workday,
// a run Ratscher → Schleusingen keeping to its minutes with a bus's speeds.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BUSPLAN as B } from '../../src/bus/bus_fahrplan.js';

const J = JSON.parse(readFileSync(new URL('../../extra/bus/dist/bus/fahrplan.json', import.meta.url), 'utf8'));
B.parse(J);
const st = name => B.S.stations.findIndex(s => s.n === name);

test('Thuringian holidays and service days', () => {
  assert.equal(B.easter(2026), B.eOf(2026, 4, 5), 'Easter Sunday 2026: 5 April');
  const h = B.holidays(2026);
  assert.ok(h.has(B.eOf(2026, 10, 31)), 'Reformationstag');
  assert.ok(h.has(B.eOf(2026, 9, 20)), 'Weltkindertag (Thuringia)');
  assert.ok(!h.has(B.eOf(2026, 11, 1)), 'Allerheiligen is no holiday in Thuringia');
  assert.equal(B.day(B.eOf(2026, 11, 17)).bit, 1, 'Tuesday 17.11.2026');
  assert.equal(B.day(B.eOf(2026, 12, 25)).bit, 6, 'Christmas runs as Sunday');
  assert.ok(B.day(B.eOf(2026, 7, 15)).ferien, 'summer holidays in Thuringia');
  assert.ok(!B.day(B.eOf(2026, 6, 2)).ferien, 'school on 2 June 2026');
});

test('the stops of the world lie on its roads, Ratscher among them', () => {
  for (const name of ['Ratscher, Schleusebrücke', 'Ratscher, Schulbushaltestelle', 'Schleusingen, Zentralhaltestelle'])
    assert.ok(st(name) >= 0, name);
  const r = B.S.stations[st('Ratscher, Schleusebrücke')];
  assert.ok(Math.hypot(r.x - 240, r.y - 10) < 30, 'Schleusebrücke north of the Anger');
  for (const s of B.S.stations)
    for (const p of s.pl) assert.ok(Math.hypot(p.x - p.gx, p.y - p.gy) < 46, s.n + ' on a road');
});

test('a workday at Ratscher: the 203 and 205 to Schleusingen, the morning school bus', () => {
  // game day 1 = Monday 1 June 2026 (time/daynight.js): day 3 = Wednesday 3 June 2026, a school day
  const e0 = B.eOf(2026, 6, 1),
    T = 2 * 1440 + 5 * 60;
  const dep = B.departures(st('Ratscher, Schleusebrücke'), T, e0, 60);
  assert.ok(dep.length >= 20, 'many departures from 5:00 on: ' + dep.length);
  const lines = new Set(dep.map(d => d.trip.line));
  assert.ok(lines.has('203') && lines.has('205'), [...lines].join(' '));
  const toZH = dep.filter(
    d =>
      d.trip.pat !== undefined &&
      B.S.pats[d.trip.pat].st.some(
        (o, k) => k > d.k && o.s >= 0 && B.S.stations[o.s].n === 'Schleusingen, Zentralhaltestelle'
      )
  );
  assert.ok(toZH.length >= 8, 'buses on to the Zentralhaltestelle: ' + toZH.length);
  const sch = B.departures(st('Ratscher, Schulbushaltestelle'), T, e0, 10);
  assert.ok(
    sch.some(d => B.hm(d.t) === '7:02'),
    'the 268 at 7:02: ' + sch.map(d => d.trip.line + ' ' + B.hm(d.t)).join(', ')
  );
  // Sunday: fewer, no school bus
  const sun = B.departures(st('Ratscher, Schulbushaltestelle'), 6 * 1440 + 5 * 60, e0, 10).filter(
    d => d.t < 6 * 1440 + 23 * 60
  );
  assert.equal(sun.length, 0, 'no school bus on Sunday');
});

test('a run Ratscher → Schleusingen keeps to the timetable at a bus pace', () => {
  const e0 = B.eOf(2026, 6, 1),
    T = 2 * 1440 + 7 * 60;
  const d = B.departures(st('Ratscher, Schleusebrücke'), T, e0, 30).find(q =>
    B.S.pats[q.trip.pat].st.some(
      (o, k) => k > q.k && o.s >= 0 && B.S.stations[o.s].n === 'Schleusingen, Zentralhaltestelle'
    )
  );
  assert.ok(d, 'a bus to the Zentralhaltestelle');
  const R = B.run(d.trip, d.di),
    kz = R.P.st.findIndex(o => o.s >= 0 && B.S.stations[o.s].n === 'Schleusingen, Zentralhaltestelle');
  const late = R.A[kz] - (d.di * 1440 + d.trip.t0 + d.trip.a[kz]);
  assert.ok(late < 3, 'at most 3 minutes late at the Zentralhaltestelle: ' + late.toFixed(2));
  // along the way: speeds of a bus, standing at the stops
  const o = {};
  let vmax = 0,
    s0 = -1;
  for (let t = R.D[d.k]; t < R.A[kz]; t += 0.05) {
    B.at(R, t, o);
    vmax = Math.max(vmax, o.v);
    assert.ok(o.s >= s0 - 1e-3, 'forward only');
    s0 = o.s;
  }
  assert.ok(vmax > 12 && vmax < 23, 'top speed ' + vmax.toFixed(1) + ' m/s');
  B.at(R, R.A[kz] + 0.05, o);
  assert.equal(o.st, 'halt', 'standing at the Zentralhaltestelle');
});

test('a bus from beyond the world comes from its edge and is at its first stop on time', () => {
  // the 205 from Coburg enters at the edge south-east of Ratscher and is at the Schleusebrücke at its minute
  const e0 = B.eOf(2026, 6, 1),
    T = 2 * 1440 + 7 * 60 + 40;
  const d = B.departures(st('Ratscher, Schleusebrücke'), T, e0, 30).find(q => q.trip.line === '205' && q.trip.vor);
  assert.ok(d, 'a 205 coming from beyond');
  const R = B.run(d.trip, d.di);
  assert.equal(R.P.st[0].s, -1, 'its way begins at the edge of the world');
  assert.ok(R.P.s[d.k] > 500, 'some way before the stop: ' + R.P.s[d.k].toFixed(0) + ' m');
  const sched = d.di * 1440 + d.trip.t0 + d.trip.a[d.k];
  assert.ok(R.A[d.k] - sched < 0.6, 'at the stop at its minute (late ' + (R.A[d.k] - sched).toFixed(2) + ' min)');
  const o = {};
  B.at(R, R.A[0] + 0.01, o);
  assert.equal(o.st, 'fahrt', 'from the edge it drives (no halt there)');
});

test('a trip counts as on the road from the edge of the world on', () => {
  const e0 = B.eOf(2026, 6, 1),
    d = B.departures(st('Ratscher, Schleusebrücke'), 2 * 1440 + 7 * 60 + 40, e0, 30).find(
      q => q.trip.line === '205' && q.trip.vor
    );
  const T = d.di * 1440 + d.trip.t0 + d.trip.a[0] + 0.2;
  assert.ok(d.trip.a[0] < 0, 'it comes from the edge');
  assert.ok(
    B.active(T, e0).some(a => a.trip === d.trip),
    'on the road between the edge and its first stop'
  );
});

test('the five bays of the Zentralhaltestelle stand apart (OpenStreetMap), not on the one point of the feed', () => {
  const zh = B.S.stations[st('Schleusingen, Zentralhaltestelle')];
  assert.equal(zh.pl.length, 5, 'five platforms');
  for (let i = 0; i < 5; i++)
    for (let j = i + 1; j < 5; j++)
      assert.ok(Math.hypot(zh.pl[i].x - zh.pl[j].x, zh.pl[i].y - zh.pl[j].y) > 8, 'bays ' + i + ' and ' + j + ' apart');
});

test('destinations carry the station names (not the short platform names of the feed)', () => {
  const heads = new Set(B.S.trips.map(t => t.head));
  assert.ok(heads.has('Schleusingen, Zentralhaltestelle'), 'Schleusingen, Zentralhaltestelle');
  assert.ok(!heads.has('Schleusingen, ZH') && !heads.has('Themar, Bahnof'), [...heads].join(' | '));
});

test('request stops: a bus drives through a stop nobody wants, stops there when asked in time, never jumps', () => {
  const e0 = B.eOf(2026, 6, 1),
    T = 2 * 1440 + 7 * 60;
  const d = B.departures(st('Ratscher, Schleusebrücke'), T, e0, 30).find(q =>
    B.S.pats[q.trip.pat].st.some(
      (o, k) => k > q.k && o.s >= 0 && B.S.stations[o.s].n === 'Schleusingen, Zentralhaltestelle'
    )
  );
  const P = B.S.pats[d.trip.pat],
    kk = P.st.findIndex(o => o.s >= 0 && B.S.stations[o.s].n === 'Schleusingen, Krankenhaus');
  assert.ok(kk > P.first && kk < P.last, 'the Krankenhaus lies between its first and last stop');
  const pass = k => k === kk,
    R = B.run(d.trip, d.di, pass),
    R0 = B.run(d.trip, d.di),
    o = {};
  assert.equal(R.pass[kk], 1, 'planned to drive through');
  // through it: never standing there, still moving at the stop
  for (let t = R.D[kk - 1]; t < R.A[kk + 1]; t += 0.01) {
    B.at(R, t, o);
    assert.ok(!(o.st === 'halt' && o.k === kk), 'no halt at the Krankenhaus');
  }
  B.at(R, R.A[kk], o);
  assert.ok(o.v > 3, 'through the stop at ' + o.v.toFixed(1) + ' m/s');
  assert.ok(R.A[kk + 1] <= R0.A[kk + 1] + 1e-6, 'not later at the next stop');
  // asked before the leg: it stops
  const R1 = B.run(d.trip, d.di, pass);
  assert.ok(B.serve(R1, kk, R1.D[kk - 1] - 0.1), 'served when asked at the stop before');
  B.at(R1, R1.A[kk] + 0.05, o);
  assert.equal(o.st, 'halt', 'standing at the Krankenhaus');
  assert.equal(o.k, kk);
  // asked on the leg, early: from where it is, without a jump; then standing there
  const R2 = B.run(d.trip, d.di, pass),
    tm = R2.D[kk - 1] + (R2.A[kk] - R2.D[kk - 1]) * 0.3;
  B.at(R2, tm, o);
  const s1 = o.s;
  assert.ok(B.serve(R2, kk, tm), 'served when asked on the way');
  B.at(R2, tm, o);
  assert.ok(Math.abs(o.s - s1) < 1.01, 'no jump: ' + s1.toFixed(2) + ' → ' + o.s.toFixed(2));
  let sPrev = o.s;
  for (let t = tm; t < R2.A[kk]; t += 0.005) {
    B.at(R2, t, o);
    assert.ok(o.s >= sPrev - 1e-3, 'forward only');
    sPrev = o.s;
  }
  B.at(R2, R2.A[kk] + 0.05, o);
  assert.equal(o.st, 'halt', 'standing at the Krankenhaus after a request on the way');
  // asked right before the stop at speed: too late
  const R3 = B.run(d.trip, d.di, pass);
  let tl = R3.A[kk] - 0.002;
  B.at(R3, tl, o);
  if (o.v > 4) assert.ok(!B.serve(R3, kk, tl), 'too late to stop');
});
