// ===================== feat/wetter: the weather of Ratscher as data (WXDATA) – Open-Meteo, the game's moment, the codes in German =====================
// Falko, 5.11.2026 23:02: weather live as the default – the world shows the weather it has in Ratscher right now, switchable to the calendar's.
// Source: Open-Meteo (https://open-meteo.com, free, no key, CC BY 4.0 – „Wetterdaten: Open-Meteo.com“): the forecast API for the current
// values (15-minutely model data) and the hours from 92 days back to 16 days ahead, the archive API (ERA5 reanalysis) for anything older.
// Times as unix seconds in UTC (timeformat=unixtime, timezone=GMT): the game's moment is a UTC instant (time/daynight.js jdOf), no daylight
// saving to untangle. Precipitation in the hourly data is the sum of the preceding hour (mm, snow in cm), in the current values the sum of
// the preceding interval (900 s): both become rates per hour, centred in their interval. Pure – no three.js, no DOM (unit tests in node:
// viz3/test/unit/wetter.test.mjs); the fetch function is passed in (tests mock it, the page passes window.fetch).
export const WXDATA = (() => {
  // the garden (time/daynight.js LAT, LON)
  const LAT = 50.4705,
    LON = 10.7801;
  // Open-Meteo name → short key of a record
  const VAR = {
    temperature_2m: 'T',
    precipitation: 'P',
    rain: 'R',
    showers: 'SH',
    snowfall: 'SN',
    cloud_cover: 'C',
    visibility: 'V',
    wind_speed_10m: 'W',
    wind_gusts_10m: 'G',
    wind_direction_10m: 'D',
    weather_code: 'WC',
    relative_humidity_2m: 'H',
    snow_depth: 'SD',
  };
  // what the archive (ERA5) has: no showers, no visibility
  const ARCHIVE = Object.keys(VAR).filter(k => k !== 'showers' && k !== 'visibility');
  const SUMS = new Set(['P', 'R', 'SH', 'SN']);
  const NOW_VARS = Object.keys(VAR).filter(k => k !== 'snow_depth');
  const HOST = 'https://api.open-meteo.com/v1/forecast',
    ARCH = 'https://archive-api.open-meteo.com/v1/archive';
  const q = o =>
    Object.entries(o)
      .map(([k, v]) => k + '=' + encodeURIComponent(v).replace(/%2C/g, ','))
      .join('&');
  const base = { latitude: LAT, longitude: LON, timeformat: 'unixtime', timezone: 'GMT', wind_speed_unit: 'kmh' };
  const ymdOf = u => new Date(u * 1000).toISOString().slice(0, 10);
  // the URLs: 'now' (current values and the hours around now), 'range' (hours of the days d0…d1 from the forecast API, 92 days back to
  // 16 ahead), 'archive' (older days)
  function url(kind, d0, d1) {
    if (kind === 'now')
      return (
        HOST +
        '?' +
        q(
          Object.assign({}, base, {
            current: NOW_VARS.join(','),
            hourly: Object.keys(VAR).join(','),
            past_days: 1,
            forecast_days: 3,
          })
        )
      );
    if (kind === 'range')
      return (
        HOST + '?' + q(Object.assign({}, base, { hourly: Object.keys(VAR).join(','), start_date: d0, end_date: d1 }))
      );
    return ARCH + '?' + q(Object.assign({}, base, { hourly: ARCHIVE.join(','), start_date: d0, end_date: d1 }));
  }
  // which requests may hold the hour of the unix time u (now: the real time, seconds), in the order to try: [] if none can (too far
  // ahead). The forecast API keeps about three months back; the archive (ERA5) lags about five days behind the present.
  function plan(u, now) {
    const day = 86400,
      d0 = ymdOf(u - day),
      d1 = ymdOf(u + day),
      key = ymdOf(u),
      range = { kind: 'range', d0, d1: ymdOf(Math.min(u + day, now + 15 * day)), key: 'r:' + key },
      arch = { kind: 'archive', d0, d1: ymdOf(Math.min(u + day, now - 2 * day)), key: 'a:' + key };
    if (u > now + 15.5 * day) return [];
    if (u > now - 6 * day) return [range];
    if (u > now - 80 * day) return [range, arch];
    return [arch];
  }
  const num = v => (typeof v === 'number' && Number.isFinite(v) ? v : undefined);
  // one Open-Meteo answer into the store: hours (key = unix hour) and the current record; returns what came in
  function parse(json, store = { hours: new Map(), current: null }) {
    if (!json || typeof json !== 'object' || json.error) throw new Error((json && json.reason) || 'keine Wetterdaten');
    let n = 0;
    const h = json.hourly;
    if (h && Array.isArray(h.time)) {
      for (let i = 0; i < h.time.length; i++) {
        const t = num(h.time[i]);
        if (t === undefined) continue;
        const k = Math.round(t / 3600),
          rec = store.hours.get(k) || {};
        let any = false;
        for (const [name, key] of Object.entries(VAR)) {
          const a = h[name];
          if (!Array.isArray(a)) continue;
          const v = num(a[i]);
          if (v === undefined) continue;
          rec[key] = v;
          any = true;
        }
        if (any) {
          store.hours.set(k, rec);
          n++;
        }
      }
    }
    const c = json.current;
    if (c && num(c.time) !== undefined) {
      const iv = num(c.interval) || 900,
        rec = { t: c.time, iv };
      for (const [name, key] of Object.entries(VAR)) {
        const v = num(c[name]);
        if (v === undefined) continue;
        rec[key] = SUMS.has(key) ? (v * 3600) / iv : v;
      }
      store.current = rec;
      n++;
    }
    return n;
  }
  // a record at the unix time u, interpolated between the hours (sums centred half an hour before their stamp); null when the store has
  // nothing within 90 minutes. The weather code comes from the nearer hour (codes are classes, not amounts).
  const ANG = new Set(['D']);
  function at(store, u) {
    if (!store || !store.hours.size) return null;
    const x = u / 3600,
      k0 = Math.floor(x),
      out = {};
    let got = 0;
    for (const key of new Set(Object.values(VAR))) {
      const sum = SUMS.has(key),
        xs = sum ? x + 0.5 : x,
        a = Math.floor(xs),
        f = xs - a,
        ra = store.hours.get(a),
        rb = store.hours.get(a + 1);
      const va = ra && ra[key],
        vb = rb && rb[key];
      if (va === undefined && vb === undefined) continue;
      if (va === undefined || vb === undefined) {
        // one side only: within its hour
        if ((va === undefined && f < 0.5) || (vb === undefined && f > 0.5)) continue;
        out[key] = va === undefined ? vb : va;
      } else if (key === 'WC') out[key] = f < 0.5 ? va : vb;
      else if (ANG.has(key)) {
        const d = ((((vb - va) % 360) + 540) % 360) - 180;
        out[key] = (va + d * f + 360) % 360;
      } else out[key] = va + (vb - va) * f;
      got++;
    }
    if (!got) return null;
    out.t = k0 * 3600;
    return out;
  }
  // ---- the codes of the World Meteorological Organization (WMO 4677, as Open-Meteo gives them) in German ----
  const CODE = {
    0: 'Klar',
    1: 'Überwiegend klar',
    2: 'Teils bewölkt',
    3: 'Bedeckt',
    45: 'Nebel',
    48: 'Nebel mit Reif',
    51: 'Leichter Nieselregen',
    53: 'Nieselregen',
    55: 'Starker Nieselregen',
    56: 'Gefrierender Nieselregen',
    57: 'Gefrierender Nieselregen',
    61: 'Leichter Regen',
    63: 'Regen',
    65: 'Starker Regen',
    66: 'Gefrierender Regen',
    67: 'Gefrierender Regen',
    71: 'Leichter Schneefall',
    73: 'Schneefall',
    75: 'Starker Schneefall',
    77: 'Schneegriesel',
    80: 'Leichte Regenschauer',
    81: 'Regenschauer',
    82: 'Heftige Regenschauer',
    85: 'Leichte Schneeschauer',
    86: 'Starke Schneeschauer',
    95: 'Gewitter',
    96: 'Gewitter mit Hagel',
    99: 'Gewitter mit Hagel',
  };
  function text(rec, day = true) {
    if (!rec) return '';
    const c = Math.round(rec.WC ?? -1);
    if (c === 0) return day ? 'Sonnig' : 'Klar';
    if (c === 1) return day ? 'Heiter' : 'Überwiegend klar';
    return CODE[c] || (rec.C !== undefined ? (rec.C > 85 ? 'Bedeckt' : rec.C > 40 ? 'Wolkig' : 'Heiter') : '');
  }
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // ---- what the picture and the sound need, from a record: kinds and amounts with sensible guesses where a value is missing ----
  //   cover 0–1, rain (mm/h, showers included), snow (cm/h), drizzle (bool: small slow drops), vis (m), wind and gust (m/s), dir (° from
  //   where it blows), temp (°C), thunder, fog, hail, code, text
  function norm(rec) {
    if (!rec) return null;
    const c = Math.round(rec.WC ?? -1);
    const snowCode = (c >= 71 && c <= 77) || c === 85 || c === 86,
      drizzle = c >= 51 && c <= 57,
      thunder = c >= 95,
      fogCode = c === 45 || c === 48;
    let rain = (rec.R ?? 0) + (rec.SH ?? 0),
      snow = rec.SN ?? 0;
    const P = rec.P ?? rain + snow * 0.7;
    if (rec.R === undefined && rec.SH === undefined && rec.SN === undefined && P > 0) {
      if (snowCode) snow = P / 0.7;
      else rain = P;
    }
    // a code that says it falls, with amounts of nothing (light drizzle rounds to 0.0 mm): a trace
    if (rain + snow < 0.02 && c >= 51 && c <= 99 && !fogCode)
      if (snowCode) snow = 0.1;
      else rain = drizzle ? 0.1 : 0.2;
    let cover = rec.C !== undefined ? clamp(rec.C / 100, 0, 1) : ({ 0: 0.05, 1: 0.25, 2: 0.55, 3: 0.95 }[c] ?? 0.9);
    if (rain + snow > 0.05) cover = Math.max(cover, 0.85);
    let vis = rec.V;
    if (vis === undefined) {
      // no visibility in the archive: from the code, the amounts and the humidity
      vis = 30000;
      if (fogCode) vis = 250;
      else if (rec.H !== undefined && rec.H >= 98 && (rec.W ?? 10) < 8) vis = 2500;
      vis = Math.min(vis, 30000 / (1 + rain * 0.9 + snow * 9));
    }
    const wind = (rec.W ?? 0) / 3.6,
      gust = Math.max(wind, (rec.G ?? (rec.W ?? 0) * 1.5) / 3.6);
    return {
      code: c,
      text: text(rec),
      temp: rec.T,
      cover,
      rain,
      snow,
      drizzle: drizzle && rain < 1.2,
      thunder,
      // showers of rain or snow: cells that pass (wetter/wetter.js lets them come and go)
      showers: (c >= 80 && c <= 82) || c === 85 || c === 86,
      hail: c === 96 || c === 99,
      fog: fogCode || vis < 1000,
      vis: clamp(vis, 30, 60000),
      wind,
      gust,
      dir: rec.D ?? 250,
      depth: rec.SD ?? 0,
      hum: rec.H,
    };
  }
  // ---- presets to try (Menü → Uhr: „ausprobieren“, ?wetter=regen …) and for tests, as Open-Meteo records ----
  const PRESETS = {
    klar: { WC: 0, C: 2, V: 45000, W: 7, G: 14, D: 250, T: 14 },
    heiter: { WC: 1, C: 28, V: 40000, W: 10, G: 20, D: 260, T: 15 },
    wolkig: { WC: 2, C: 62, V: 32000, W: 14, G: 28, D: 250, T: 12 },
    bedeckt: { WC: 3, C: 100, V: 22000, W: 14, G: 26, D: 240, T: 9 },
    nebel: { WC: 45, C: 100, V: 160, W: 3, G: 5, D: 200, T: 4, H: 100 },
    niesel: { WC: 53, C: 100, P: 0.4, R: 0.4, V: 5000, W: 11, G: 20, D: 240, T: 7 },
    regen: { WC: 63, C: 100, P: 3.5, R: 3.5, V: 6000, W: 20, G: 38, D: 250, T: 7 },
    starkregen: { WC: 65, C: 100, P: 11, R: 11, V: 2200, W: 28, G: 55, D: 250, T: 9 },
    schauer: { WC: 81, C: 78, P: 5, SH: 5, R: 0, V: 6000, W: 22, G: 48, D: 270, T: 10 },
    schnee: { WC: 73, C: 100, P: 1.1, SN: 1.6, V: 1400, W: 11, G: 22, D: 60, T: -2, SD: 0.08 },
    graupel: { WC: 77, C: 100, P: 0.8, SN: 0.6, R: 0.4, V: 3000, W: 16, G: 30, D: 300, T: 1 },
    sturm: { WC: 3, C: 92, V: 18000, W: 62, G: 98, D: 255, T: 8 },
    reif: { WC: 0, C: 3, V: 14000, W: 4, G: 7, D: 100, T: -3, H: 94 },
    gewitter: { WC: 95, C: 100, P: 9, R: 3, SH: 6, V: 3000, W: 30, G: 72, D: 245, T: 18 },
  };
  return { LAT, LON, VAR, url, plan, parse, at, text, norm, PRESETS, CODE, ymdOf };
})();
