// feat/wetter: the real Open-Meteo answers through the module's own parser – run on GitHub Actions (.github/workflows/wetter-ton.yml;
// the chat machine gets HTTP 429 from Open-Meteo, the tests in the browser only see mocked answers). For each kind of request the game
// makes (the current values with the hours around now, the hours of a recent day from the forecast API, an old day from the archive)
// it fetches, parses, interpolates at a few moments and checks what the picture would need; the raw answers are kept (out/echt/*.json)
// to look at. Exit code 1 when an answer cannot be read.
//   node viz3/extra/wetter/quellen/echt.mjs out/echt
import fs from 'node:fs';
import path from 'node:path';
import { WXDATA } from '../../../src/wetter/wx_data.js';

const OUT = process.argv[2] || 'out/echt';
fs.mkdirSync(OUT, { recursive: true });
const now = Date.now() / 1000;
const day = 86400;
const ymd = u => new Date(u * 1000).toISOString().slice(0, 10);
const jobs = [
  { name: 'jetzt', url: WXDATA.url('now'), at: [now, now - 6 * 3600, now + 30 * 3600] },
  {
    name: 'vor-5-tagen',
    url: WXDATA.url('range', ymd(now - 6 * day), ymd(now - 4 * day)),
    at: [now - 5 * day, now - 5 * day + 7 * 3600],
  },
  {
    name: 'vorhersage-10-tage',
    url: WXDATA.url('range', ymd(now + 9 * day), ymd(now + 11 * day)),
    at: [now + 10 * day],
  },
  {
    name: 'archiv-1-6-2026',
    url: WXDATA.url('archive', '2026-05-31', '2026-06-02'),
    at: [Date.UTC(2026, 5, 1, 5, 30) / 1000, Date.UTC(2026, 5, 1, 14, 0) / 1000],
  },
];
let bad = 0;
for (const j of jobs) {
  let json = null;
  try {
    const r = await fetch(j.url);
    const txt = await r.text();
    fs.writeFileSync(path.join(OUT, j.name + '.json'), txt);
    json = JSON.parse(txt);
    if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + txt.slice(0, 200));
  } catch (e) {
    console.log('FAIL', j.name, String(e.message || e).slice(0, 300));
    bad++;
    continue;
  }
  const st = { hours: new Map(), current: null };
  const n = WXDATA.parse(json, st);
  const keys = new Set();
  for (const rec of st.hours.values()) for (const k of Object.keys(rec)) keys.add(k);
  console.log('OK  ', j.name, n, 'records, keys', [...keys].sort().join(','), st.current ? 'current ' + JSON.stringify(st.current) : '');
  for (const u of j.at) {
    const rec = WXDATA.at(st, u),
      w = WXDATA.norm(rec);
    if (!rec || !w || !['cover', 'rain', 'snow', 'vis', 'wind', 'gust', 'dir'].every(k => Number.isFinite(w[k]))) {
      console.log('FAIL', j.name, new Date(u * 1000).toISOString(), 'no usable record', JSON.stringify(rec));
      bad++;
      continue;
    }
    console.log(
      '    ',
      new Date(u * 1000).toISOString().slice(0, 16),
      WXDATA.text(rec),
      (rec.T ?? NaN).toFixed(1) + ' °C',
      'cover ' + w.cover.toFixed(2),
      'rain ' + w.rain.toFixed(2),
      'snow ' + w.snow.toFixed(2),
      'vis ' + Math.round(w.vis),
      'wind ' + (w.wind * 3.6).toFixed(0) + '/' + (w.gust * 3.6).toFixed(0) + ' km/h from ' + Math.round(w.dir),
      'depth ' + w.depth
    );
  }
}
console.log(bad ? 'RESULT echt: ' + bad + ' problems' : 'RESULT echt: all answers read');
process.exit(bad ? 1 : 0);
