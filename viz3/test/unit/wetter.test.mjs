// Unit test of feat/wetter (viz3/src/wetter/wx_data.js) without a browser: Open-Meteo answers into records (sums of the preceding hour or
// quarter as rates, centred in their interval), interpolation at the game's moment (angles the short way round, codes not mixed), the
// requests for a day (forecast API, archive, none too far ahead), sensible guesses where the archive has no visibility, the German texts.
// Run: node --test "viz3/test/unit/*.test.mjs" (tools/check.sh does it)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { WXDATA } from '../../src/wetter/wx_data.js';

const H = 3600,
  t0 = Math.floor(Date.UTC(2026, 10, 5, 10) / 1000);
const answer = {
  utc_offset_seconds: 0,
  current: {
    time: t0 + 1800,
    interval: 900,
    temperature_2m: 6.2,
    precipitation: 0.5,
    rain: 0.5,
    showers: 0,
    snowfall: 0,
    cloud_cover: 100,
    visibility: 7000,
    wind_speed_10m: 20,
    wind_gusts_10m: 41,
    wind_direction_10m: 250,
    weather_code: 61,
  },
  hourly: {
    time: [t0, t0 + H, t0 + 2 * H],
    temperature_2m: [5, 7, 9],
    precipitation: [0, 2, 4],
    rain: [0, 2, 4],
    showers: [0, 0, 0],
    snowfall: [0, 0, 0],
    cloud_cover: [40, 100, 100],
    visibility: [24000, 8000, 5000],
    wind_speed_10m: [10, 20, 30],
    wind_gusts_10m: [20, 40, 60],
    wind_direction_10m: [350, 10, 30],
    weather_code: [2, 63, 65],
  },
};

test('an answer becomes hours and current values (rates per hour)', () => {
  const st = { hours: new Map(), current: null };
  const n = WXDATA.parse(answer, st);
  assert.equal(st.hours.size, 3);
  assert.ok(n >= 4);
  // 0.5 mm in the last quarter of an hour is 2 mm/h
  assert.equal(st.current.P, 2);
  assert.equal(st.current.WC, 61);
  assert.throws(() => WXDATA.parse({ error: true, reason: 'nope' }, st), /nope/);
});

test('interpolation at a moment: values between the hours, sums centred, angles the short way, codes from the nearer hour', () => {
  const st = { hours: new Map(), current: null };
  WXDATA.parse(answer, st);
  const r = WXDATA.at(st, t0 + 0.5 * H);
  assert.ok(Math.abs(r.T - 6) < 1e-9, 'temperature halfway');
  // the 2 mm of hour 10–11 (stamped 11:00) are centred at 10:30
  assert.ok(Math.abs(r.P - 2) < 1e-9, 'precipitation centred: ' + r.P);
  assert.ok(Math.abs(r.D - 0) < 1e-9 || Math.abs(r.D - 360) < 1e-9, 'wind direction across north: ' + r.D);
  assert.equal(WXDATA.at(st, t0 + 0.3 * H).WC, 2);
  assert.equal(WXDATA.at(st, t0 + 0.7 * H).WC, 63);
  assert.equal(WXDATA.at(st, t0 + 30 * H), null, 'nothing far from the data');
});

test('the requests for a day: forecast API near, archive long ago, none too far ahead', () => {
  const now = t0;
  const near = WXDATA.plan(now - 5 * 86400, now);
  assert.deepEqual(
    near.map(p => p.kind),
    ['range']
  );
  assert.deepEqual(
    WXDATA.plan(now - 40 * 86400, now).map(p => p.kind),
    ['range', 'archive']
  );
  assert.deepEqual(
    WXDATA.plan(now - 200 * 86400, now).map(p => p.kind),
    ['archive']
  );
  assert.deepEqual(WXDATA.plan(now + 20 * 86400, now), []);
  const u = WXDATA.url('range', near[0].d0, near[0].d1);
  assert.match(u, /^https:\/\/api\.open-meteo\.com\/v1\/forecast\?latitude=50\.4705&longitude=10\.7801/);
  assert.match(u, /start_date=2026-10-30&end_date=2026-11-01/);
  assert.match(u, /timeformat=unixtime/);
  const a = WXDATA.url('archive', '2025-06-01', '2025-06-02');
  assert.match(a, /^https:\/\/archive-api\.open-meteo\.com\/v1\/archive\?/);
  assert.ok(!/showers|visibility/.test(a), 'the archive has no showers and no visibility');
  assert.match(WXDATA.url('now'), /current=temperature_2m,precipitation/);
});

test('what the picture needs: kinds, amounts and guesses', () => {
  const rain = WXDATA.norm(WXDATA.PRESETS.regen);
  assert.ok(rain.rain > 3 && rain.snow === 0 && rain.cover >= 0.99 && !rain.drizzle);
  const snow = WXDATA.norm(WXDATA.PRESETS.schnee);
  assert.ok(snow.snow > 1 && snow.rain === 0);
  const fog = WXDATA.norm(WXDATA.PRESETS.nebel);
  assert.ok(fog.fog && fog.vis < 300);
  // the archive: no visibility – rain makes it shorter, a code 45 is fog
  assert.ok(WXDATA.norm({ WC: 63, R: 4, C: 100 }).vis < 10000);
  assert.ok(WXDATA.norm({ WC: 45, C: 100 }).vis < 400);
  // a drizzle code without amount: a trace that shows
  const tr = WXDATA.norm({ WC: 51, P: 0, R: 0, C: 100 });
  assert.ok(tr.rain > 0 && tr.drizzle);
  assert.equal(WXDATA.text({ WC: 0 }, true), 'Sonnig');
  assert.equal(WXDATA.text({ WC: 0 }, false), 'Klar');
  assert.equal(WXDATA.text({ WC: 61 }), 'Leichter Regen');
  assert.equal(WXDATA.norm(null), null);
  for (const [k, p] of Object.entries(WXDATA.PRESETS)) {
    const w = WXDATA.norm(p);
    for (const f of ['cover', 'rain', 'snow', 'vis', 'wind', 'gust', 'dir'])
      assert.ok(Number.isFinite(w[f]), k + ' ' + f + ' = ' + w[f]);
  }
});
