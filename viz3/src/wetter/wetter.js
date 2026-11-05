// ===================== feat/wetter: the weather of the real place (WETTER) – live as the default, switchable to the calendar's =====================
// Falko, 5.11.2026 23:02 (clicked): „Wetter live als Standard“ – the world shows the weather it has in Ratscher right now; „nach Kalender“
// keeps the sky as it was (the photographed skies of the day, no rain). 23:17: „Wichtig ist natürlich trotzdem immer der Realismus.“
// The data: Open-Meteo (wetter/wx_data.js), fetched by the browser for the garden's place, the current values refreshed every 15 minutes
// while the page is shown, kept for the visit. The game's clock is mostly not „now“ (its own pace, a scene, the time-lapse, sleeping, the
// zombie night on the 31st of October): then the real weather of the game's date and hour where Open-Meteo has it – the forecast for up
// to 16 days ahead, the forecast API's memory and the archive for the past –, else the calendar's. The clock window says which („Wetter wie
// draußen“, „Wetter vom 31.10.“, „Vorhersage für 7.11.“, „Wetter nach Kalender“) and how it is („Leichter Regen · 6 °C · Wind 20 km/h –
// Open-Meteo“); there one switches (also Menü → Einstellungen), sets the clock to now, or tries a weather (Regen, Schnee, Nebel …).
// Shown by wetter/wx_sky.js (clouds, light, haze), wetter/wx_fall.js (rain, snow) and wetter/wx_ton.js (rain, roof, wind, thunder), eased
// over a few seconds; only with the light of the day's course (Menü → Erleben → Tageslauf), not in the plan view. Saved: pav-wetter-v1
// { v: 1, m: 'live' | 'kalender' }. Tests: navigator.webdriver – no request ever leaves a test browser; WETTER.mock(fn | json | 'fail')
// answers instead (viz3/test/wetter.py). URL: ?wetter=kalender | live | regen | schnee | nebel | … (a weather to try).
import { SAVE } from '../core/save.js';
import { $, OFFLINE, QS, scene } from '../core/head.js';
import { KERN } from '../core/kern.js';
import { markDirty } from '../core/assets.js';
import { hemi, sun } from '../garden/env.js';
import { P } from '../game/walkable.js';
import { PLAY } from '../game/play.js';
import { audio, toast } from '../audio/audio.js';
import { CLOCK } from '../time/clock.js';
import { DN } from '../time/daynight.js';
import { VEH } from '../vehicles/vehicle.js';
import { WXDATA } from './wx_data.js';
import { WXSKY } from './wx_sky.js';
import { WXFALL } from './wx_fall.js';
import { WXTON } from './wx_ton.js';
import { WXBODEN } from './wx_boden.js';
export const WETTER = (() => {
  const KEY = 'pav-wetter-v1';
  const saved = SAVE.get(KEY);
  const S = {
    mode: saved && saved.m === 'kalender' ? 'kalender' : 'live',
    store: { hours: new Map(), current: null },
    req: new Map(),
    now: { st: '', at: 0, failT: 0, fails: 0, err: '' },
    src: 'kalender',
    label: 'Wetter nach Kalender',
    why: '',
    rec: null,
    w: null,
    want: null,
    cur: { cover: 0, rain: 0, snow: 0, vis: 60000, wind: 0, gust: 0, dir: 250 },
    snapNext: true,
    preset: null,
    mock: null,
    calls: [],
    flash: { t: 0, next: 8, k: 0, n: 0, base: 0, on: false, near: 1, third: false },
    acc: 0,
    wet: 0,
    wetWant: 0,
    snowC: 0,
    snowWant: 0,
  };
  const AUTOMATED = typeof navigator !== 'undefined' && !!navigator.webdriver;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  // ---- requests: the browser's fetch (15 s at most), a test's answer, or nothing at all in an automated browser ----
  function get(url) {
    S.calls.push(url);
    if (S.calls.length > 40) S.calls.shift();
    if (S.mock)
      return Promise.resolve()
        .then(() => S.mock(url))
        .then(j => {
          if (!j) throw new Error('keine Antwort');
          return j;
        });
    if (AUTOMATED || OFFLINE || typeof fetch !== 'function') return Promise.reject(new Error('keine Abfrage (Test)'));
    const ac = typeof AbortController === 'function' ? new AbortController() : null,
      tm = ac ? setTimeout(() => ac.abort(), 15000) : 0;
    return fetch(url, ac ? { signal: ac.signal } : undefined)
      .then(r => {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .finally(() => clearTimeout(tm));
  }
  // the current values and the hours around now: every 15 minutes while the page is shown; after a failure 2, 4, 8 … up to 30 minutes
  function fetchNow(force) {
    const N = S.now,
      t = Date.now();
    if (N.st === 'loading' || (typeof document !== 'undefined' && document.hidden && !force)) return;
    if (!force && N.st === 'ok' && t - N.at < 15 * 60e3) return;
    if (!force && N.st === 'fail' && t - N.failT < Math.min(30, 2 * 2 ** Math.min(4, N.fails - 1)) * 60e3) return;
    N.st = 'loading';
    get(WXDATA.url('now')).then(
      j => {
        WXDATA.parse(j, S.store);
        N.st = 'ok';
        N.at = Date.now();
        N.fails = 0;
        N.err = '';
        pick(true);
      },
      e => {
        N.st = 'fail';
        N.failT = Date.now();
        N.fails++;
        N.err = String((e && e.message) || e);
        pick(true);
      }
    );
  }
  // the hours of another day (the game's): the forecast API, else the archive; 'ok' | 'loading' | 'fail' | 'none' (nobody has it)
  function need(u) {
    const plans = WXDATA.plan(u, Date.now() / 1000);
    for (const p of plans) {
      const r = S.req.get(p.key);
      if (r && r.st === 'ok') continue;
      if (r && r.st === 'loading') return 'loading';
      if (r && r.st === 'fail' && Date.now() - r.t < 10 * 60e3) continue;
      S.req.set(p.key, { st: 'loading', t: Date.now() });
      get(WXDATA.url(p.kind, p.d0, p.d1)).then(
        j => {
          WXDATA.parse(j, S.store);
          S.req.set(p.key, { st: 'ok', t: Date.now() });
          pick(true);
        },
        e => {
          S.req.set(p.key, { st: 'fail', t: Date.now(), err: String((e && e.message) || e) });
          pick(true);
        }
      );
      return 'loading';
    }
    return plans.length ? 'fail' : 'none';
  }
  // ---- the game's moment as a UTC instant (s), the real one, and how to name a day ----
  const gameU = () => (DN.jdOf(CLOCK.t) - 2440587.5) * 86400;
  // the day as it is in Ratscher (summer time included)
  let DMF = null;
  const dm = u => {
    try {
      DMF = DMF || new Intl.DateTimeFormat('de-DE', { timeZone: 'Europe/Berlin', day: 'numeric', month: 'numeric' });
      const q = Object.fromEntries(DMF.formatToParts(new Date(u * 1000)).map(p => [p.type, p.value]));
      return +q.day + '.' + +q.month + '.';
    } catch (e) {
      const d = new Date(u * 1000 + 3600e3);
      return d.getUTCDate() + '.' + (d.getUTCMonth() + 1) + '.';
    }
  };
  // ---- which weather now: a try, the calendar's, the current values, an hour of the game's day ----
  function pick(fresh) {
    const was = S.src + S.label;
    let rec = null,
      src = 'kalender',
      label = 'Wetter nach Kalender',
      why = '';
    if (S.preset) {
      rec = WXDATA.PRESETS[S.preset];
      src = 'probe';
      label = 'Ausprobiert: ' + (PNAME[S.preset] || S.preset);
    } else if (S.mode === 'live') {
      const now = Date.now() / 1000,
        u = gameU(),
        near = Math.abs(u - now) < 45 * 60;
      fetchNow(false);
      const c = S.store.current;
      if (near && c && S.now.st !== 'fail' && Date.now() - S.now.at < 25 * 60e3 && Math.abs(c.t - now) < 40 * 60) {
        rec = c;
        src = 'jetzt';
        label = 'Wetter wie draußen';
      } else {
        rec = WXDATA.at(S.store, u);
        if (rec) {
          src = 'stunde';
          label = near ? 'Wetter wie draußen' : u < now ? 'Wetter vom ' + dm(u) : 'Vorhersage für ' + dm(u);
        } else {
          const st = near && S.now.st === 'loading' ? 'loading' : need(u);
          why =
            st === 'loading'
              ? 'Open-Meteo wird gefragt …'
              : st === 'none'
                ? 'für den ' + dm(u) + ' gibt es noch keine Vorhersage'
                : 'Open-Meteo ist gerade nicht erreichbar';
          // while the answer is on its way the last weather stays (no flicker to the calendar and back)
          if (st === 'loading' && S.rec && S.src !== 'kalender' && S.src !== 'probe') {
            rec = S.rec;
            src = S.src;
            label = S.label;
          }
        }
      }
    }
    S.rec = rec;
    S.src = src;
    S.label = label;
    S.why = rec ? '' : why;
    S.w = WXDATA.norm(rec);
    // the first real weather of this browser: one short word on where it comes from and where to switch it
    if (S.w && (src === 'jetzt' || src === 'stunde') && !S.told && P.mode === 'walk') {
      S.told = true;
      if (SAVE.once('pav-wetter-neu'))
        toast(
          'Neu: Das Wetter ist wie in Ratscher – ' +
            (src === 'jetzt' ? 'gerade draußen' : 'zur Spielzeit') +
            ' (Open-Meteo). Umstellen an der Uhr oben rechts oder unter Menü → Einstellungen.',
          8000
        );
    }
    if (fresh && was !== S.src + S.label && CLOCK.winOpen) CLOCK.redraw && CLOCK.redraw();
    return S.w;
  }
  const PNAME = {
    klar: 'Sonne',
    heiter: 'Heiter',
    wolkig: 'Wolken',
    bedeckt: 'Bedeckt',
    niesel: 'Niesel',
    regen: 'Regen',
    starkregen: 'Starkregen',
    schauer: 'Schauer',
    gewitter: 'Gewitter',
    schnee: 'Schnee',
    graupel: 'Graupel',
    nebel: 'Nebel',
    sturm: 'Sturm',
  };
  // ---- the effects: eased towards the chosen weather (a few seconds; quick in the time-lapse; at once after loading or for a test) ----
  const ZERO = { cover: 0, rain: 0, snow: 0, vis: 60000, wind: 0, gust: 0, dir: 250 };
  function ease(dt) {
    const w = S.w || ZERO,
      c = S.cur;
    const k = S.snapNext ? 1 : 1 - Math.exp(-dt / (CLOCK.warp ? 0.7 : 4));
    S.snapNext = false;
    c.cover += (w.cover - c.cover) * k;
    c.rain += (w.rain - c.rain) * k;
    c.snow += (w.snow - c.snow) * k;
    // the visibility on a log scale (fog comes and goes evenly)
    c.vis = Math.exp(Math.log(c.vis) + (Math.log(w.vis) - Math.log(c.vis)) * k);
    c.wind += (w.wind - c.wind) * k;
    c.gust += (w.gust - c.gust) * k;
    const dd = ((((w.dir - c.dir) % 360) + 540) % 360) - 180;
    c.dir = (c.dir + dd * k + 360) % 360;
    for (const key of ['rain', 'snow']) if (c[key] < 0.002) c[key] = 0;
  }
  const shown = () => DN.active && DN.mode === 'auto' && P.mode !== 'top';
  function tick(dt) {
    dt = Math.min(dt, 0.25);
    const snap = S.snapNext;
    // the choice once a second (and at once after a change); the effects every frame
    if ((S.acc += dt) > 1 || !S.picked || snap) {
      S.acc = 0;
      S.picked = true;
      pick(false);
      S.wetWant = wetness();
      S.snowWant = snowCover();
      badge();
    }
    ease(dt);
    const on = shown(),
      c = S.cur,
      wx = S.w || {},
      any = c.cover > 0.003 || c.rain > 0 || c.snow > 0 || c.vis < 20000 || c.wind > 3;
    WXSKY.set({ on: on && any, cover: c.cover, rain: c.rain, snow: c.snow, vis: c.vis, wind: c.wind, dir: c.dir });
    WXSKY.tick(dt, !window.FREEZE);
    const inside = !!(audio.inside && audio.inside()),
      // inside the pavilion the rain stays beyond its walls – seen through the big windows; in other buildings none is drawn
      pav = inside && !!(window.inHouseNow && window.inHouseNow());
    const fall = WXFALL.set(
      {
        on,
        rain: c.rain,
        snow: c.snow,
        drizzle: !!wx.drizzle,
        graupel: wx.code === 77,
        hail: !!wx.hail,
        wind: c.wind,
        gust: c.gust,
        dir: c.dir,
        col: WXSKY.U.wxHor.value,
        hole: VEH && VEH.cur ? 2.4 : pav ? 5.5 : 0.35,
        ground: P.mode === 'walk' && !(VEH && VEH.cur) && !inside ? P.feet : null,
        hide: (inside && !pav) || !on,
      },
      dt
    );
    if (fall) {
      WXFALL.tick(dt);
      markDirty();
    }
    WXTON.update(
      {
        on,
        rain: c.rain,
        drizzle: !!wx.drizzle,
        wind: c.wind,
        gust: c.gust,
        gustK: WXFALL.S.gustK,
        inside: inside || !!(VEH && VEH.cur),
        storm: on && !!wx.thunder,
      },
      dt
    );
    // wet ground: eased over a few seconds (an hour of game time passes in a minute: the data's own slope is gentle enough)
    const kk = snap ? 1 : 1 - Math.exp(-dt / 6);
    S.wet += ((on ? S.wetWant : 0) - S.wet) * kk;
    if (S.wet < 0.005) S.wet = 0;
    S.snowC += ((on ? S.snowWant : 0) - S.snowC) * kk;
    if (S.snowC < 0.005) S.snowC = 0;
    // the white of lying snow follows the light that falls on it (sky, sun, image light)
    const light = clamp(0.5 * scene.environmentIntensity + 0.1 * sun.intensity + 0.6 * hemi.intensity, 0, 1.6);
    WXBODEN.set(S.wet, dt, S.snowC, light);
    lightning(dt, on && !!wx.thunder);
  }
  KERN.tick(tick, 'wetter');
  // ---- snow lying: the data's snow depth (a few centimetres cover the ground; the current values lack it – then the hour's) ----
  function snowCover() {
    const w = S.w;
    if (!w || S.src === 'kalender') return 0;
    let d = w.depth;
    if (!(d > 0) && S.src === 'jetzt') {
      const r = WXDATA.at(S.store, gameU());
      d = r && r.SD;
    }
    return clamp((d || 0) / 0.04, 0, 1);
  }
  // ---- how wet the ground is: the rain now and in the last hours (fading with an e-time of about 1.6 h; snow only when it melts) ----
  function wetness() {
    const w = S.w;
    if (!w || S.src === 'kalender') return 0;
    let r = w.rain + (Number.isFinite(w.temp) && w.temp > 0.5 ? w.snow * 0.7 : 0);
    if (S.src !== 'probe') {
      const u = gameU();
      for (let k = 1; k <= 5; k++) {
        const rec = WXDATA.at(S.store, u - k * 3600);
        if (rec && (rec.T === undefined || rec.T > 0.5)) r += (rec.P ?? 0) * Math.exp(-k / 1.6);
      }
    }
    return clamp(r / 0.8, 0, 1);
  }
  // ---- lightning in a thunderstorm: a flash in the sky and on the land (the sky light for a moment), thunder after it by the distance ----
  // a flash flickers: a first stroke, a dimmer pause, one or two return strokes, then it fades (some 0.4 s); near ones are brighter
  function lightning(dt, storm) {
    const F = S.flash;
    if (storm && (F.next -= dt) <= 0) {
      F.next = 6 + Math.random() * 26;
      const d = 600 + Math.random() * 7000;
      if (!F.on) {
        F.base = hemi.intensity;
        F.envBase = scene.environmentIntensity;
      }
      F.on = true;
      F.t = -dt;
      F.third = Math.random() < 0.5;
      F.near = Math.max(0.35, Math.min(1, 2500 / d));
      F.n++;
      WXTON.thunder(d);
    }
    if (F.on) {
      F.t += dt;
      const t = F.t,
        k =
          t < 0.07
            ? 1
            : t < 0.11
              ? 0.25
              : t < 0.17
                ? 0.85
                : t < 0.21
                  ? 0.3
                  : t < 0.26 && F.third
                    ? 0.6
                    : Math.max(0, 0.45 * (1 - (t - 0.21) / 0.3));
      F.k = k * F.near;
      WXSKY.U.wxFlash.value = F.k * F.k * 2.4;
      // the flash lights the land from the whole sky: the hemisphere and the image light (the day's light restores both after it)
      hemi.intensity = F.base + F.k * 2.2;
      scene.environmentIntensity = F.envBase * (1 + 3 * F.k * F.k);
      markDirty();
      if (t > 0.5) {
        F.on = false;
        F.k = 0;
        WXSKY.U.wxFlash.value = 0;
        if (DN.hook) DN.hook.v++;
      }
    }
  }
  // ---- the mode (saved), a weather to try (this visit only), tests ----
  function setMode(m) {
    if (m !== 'live' && m !== 'kalender') return;
    S.mode = m;
    S.preset = null;
    SAVE.set(KEY, { v: 1, m });
    pick(true);
    if (m === 'live') fetchNow(true);
    ui();
  }
  function preset(name) {
    S.preset = name && WXDATA.PRESETS[name] ? name : null;
    pick(true);
    ui();
  }
  // ---- the clock window: what it is, where it comes from, the switch, the clock to now, a weather to try ----
  function line() {
    const w = S.w;
    if (!w)
      return S.mode === 'live' && S.why ? S.why + ' – Himmel nach dem Kalender' : 'Himmel und Licht nach dem Kalender';
    const day = DN.state ? DN.state.sunEl > -2 : true,
      parts = [WXDATA.text(S.rec, day) || w.text];
    if (Number.isFinite(w.temp)) parts.push(Math.round(w.temp) + ' °C');
    const kmh = Math.round(w.wind * 3.6),
      gk = Math.round(w.gust * 3.6);
    parts.push(kmh < 2 ? 'windstill' : 'Wind ' + kmh + ' km/h' + (gk >= kmh + 15 ? ', Böen ' + gk : ''));
    if (w.vis < 5000)
      parts.push('Sicht ' + (w.vis < 1000 ? Math.round(w.vis / 10) * 10 + ' m' : (w.vis / 1000).toFixed(1) + ' km'));
    return parts.filter(Boolean).join(' · ') + (S.src === 'probe' ? '' : ' – Open-Meteo');
  }
  const ZON = () => !!(window.ZSTATE && window.ZSTATE.on);
  function winHTML() {
    const near = S.src === 'jetzt' || S.label === 'Wetter wie draußen',
      b = (k, t) => `<button type="button" data-wxp="${k}" aria-pressed="${S.preset === k}">${t}</button>`;
    return `<h4>Wetter</h4><div class="ckdate wxline"><b>${S.label}</b><span>${line()}</span></div>
      <div class="mrow"><span>Wetter</span><div class="mseg"><button type="button" data-wx="live" aria-pressed="${S.mode === 'live' && !S.preset}">wie draußen</button><button type="button" data-wx="kalender" aria-pressed="${S.mode === 'kalender' && !S.preset}">nach Kalender</button></div></div>
      ${S.mode === 'live' && !near && !ZON() ? '<div class="ckw" style="margin-top:8px"><button type="button" data-wxnow>Uhr und Datum auf jetzt</button></div>' : ''}
      <details class="wxtry"><summary class="mnote">Wetter ausprobieren</summary><div class="ckw" style="margin-top:6px">${Object.keys(
        PNAME
      )
        .map(k => b(k, PNAME[k]))
        .join('')}</div></details>`;
  }
  function winBind(win) {
    win.querySelectorAll('[data-wx]').forEach(x => x.addEventListener('click', () => setMode(x.dataset.wx)));
    win.querySelectorAll('[data-wxp]').forEach(x =>
      x.addEventListener('click', () => {
        preset(S.preset === x.dataset.wxp ? null : x.dataset.wxp);
        const d = win.querySelector('details.wxtry');
        if (d) d.open = true;
      })
    );
    const n = win.querySelector('[data-wxnow]');
    if (n) n.addEventListener('click', clockToNow);
    if (S.tryOpen) {
      const d = win.querySelector('details.wxtry');
      if (d) d.open = true;
    }
    const d = win.querySelector('details.wxtry');
    if (d) d.addEventListener('toggle', () => (S.tryOpen = d.open));
  }
  if (CLOCK.section) CLOCK.section({ html: winHTML, bind: winBind });
  // the game's date and time as outside in Ratscher (local time, Europe/Berlin), the clock in real time – then the weather is today's
  function clockToNow() {
    try {
      const f = new Intl.DateTimeFormat('de-DE', {
          timeZone: 'Europe/Berlin',
          year: 'numeric',
          month: 'numeric',
          day: 'numeric',
          hour: 'numeric',
          minute: 'numeric',
          hourCycle: 'h23',
        }),
        q = Object.fromEntries(f.formatToParts(new Date()).map(p => [p.type, p.value])),
        d = Math.floor(CLOCK.t / 1440);
      DN.e0 = Date.UTC(+q.year, +q.month - 1, +q.day) / 864e5 - d;
      CLOCK.t = d * 1440 + +q.hour * 60 + +q.minute;
      CLOCK.setRate('real');
      if (DN.active) DN.update(true);
      S.snapNext = true;
      pick(true);
      PLAY.think('Datum und Uhrzeit wie draußen – die Spielzeit läuft jetzt in Echtzeit.', 3500);
      ui();
    } catch (e) {
      console.warn('wetter: Uhr', e);
    }
  }
  // ---- Menü → Einstellungen → Spiel: one more row „Wetter“ (put in by this module, beside „Spielzeit“) ----
  function menuRow() {
    const page = document.querySelector('.mpage[data-page="einstellungen"]');
    if (!page || $('wxseg')) return;
    const row = document.createElement('div');
    row.className = 'mrow';
    row.innerHTML =
      '<span>Wetter</span><div class="mseg" id="wxseg"><button type="button" data-wxm="live" title="Wie gerade draußen in Ratscher (Open-Meteo) – bei einer anderen Spielzeit das Wetter dieser Stunde">wie draußen</button><button type="button" data-wxm="kalender" title="Himmel und Licht wie bisher, ohne Niederschlag">nach Kalender</button></div>';
    const after = $('crateseg') && $('crateseg').closest('.mrow');
    if (after) after.after(row);
    else page.appendChild(row);
    row.querySelectorAll('[data-wxm]').forEach(x => x.addEventListener('click', () => setMode(x.dataset.wxm)));
  }
  function ui() {
    document
      .querySelectorAll('#wxseg [data-wxm]')
      .forEach(x => x.setAttribute('aria-pressed', String(x.dataset.wxm === S.mode)));
    if (CLOCK.winOpen && CLOCK.redraw) CLOCK.redraw();
  }
  menuRow();
  ui();
  // ---- the clock button: a small sign of the weather beside the time (clouds, rain, snow, fog, thunder; nothing when it is fair) ----
  const GLYPH = {
    wolke: '<path d="M7 17.5h10a3.6 3.6 0 0 0 .4-7.2A5.2 5.2 0 0 0 7.4 9.6 4 4 0 0 0 7 17.5z"/>',
    regen:
      '<path d="M7 14h10a3.3 3.3 0 0 0 .4-6.6A4.8 4.8 0 0 0 7.4 6.9 3.6 3.6 0 0 0 7 14z"/><path d="M8.5 16.5l-1 3M12.5 16.5l-1 3M16.5 16.5l-1 3"/>',
    schnee:
      '<path d="M7 13.5h10a3.3 3.3 0 0 0 .4-6.6A4.8 4.8 0 0 0 7.4 6.4 3.6 3.6 0 0 0 7 13.5z"/><path d="M8 17.5h.01M12 19.5h.01M16 17.5h.01M10 21h.01M14 21h.01"/>',
    nebel: '<path d="M4 9h16M6 13h12M4 17h16"/>',
    gewitter:
      '<path d="M7 13.5h10a3.3 3.3 0 0 0 .4-6.6A4.8 4.8 0 0 0 7.4 6.4 3.6 3.6 0 0 0 7 13.5z"/><path d="M12.5 15l-2 3.5h3l-2 3.5"/>',
  };
  const glyphOf = w =>
    !w
      ? null
      : w.thunder
        ? 'gewitter'
        : w.snow > 0.05
          ? 'schnee'
          : w.rain > 0.05
            ? 'regen'
            : w.vis < 1000
              ? 'nebel'
              : w.cover > 0.6
                ? 'wolke'
                : null;
  function badge() {
    const b = $('clockbtn');
    if (!b) return;
    let e = b.querySelector('.wxi');
    const k = shown() ? glyphOf(S.w) : null;
    if (!e) {
      e = document.createElement('span');
      e.className = 'hbi wxi';
      e.style.display = 'none';
      b.appendChild(e);
    }
    e.title = k ? S.label + ': ' + line() : '';
    if (e.dataset.k === (k || '')) return;
    e.dataset.k = k || '';
    e.style.display = k ? '' : 'none';
    e.style.color = 'var(--ov-ink)';
    e.innerHTML = k ? '<svg viewBox="0 0 24 24" aria-hidden="true">' + GLYPH[k] + '</svg>' : '';
  }
  // ?wetter=kalender | live (the mode, saved) or a weather to try
  {
    const q = QS.get('wetter');
    if (q === 'kalender' || q === 'live') setMode(q);
    else if (q && WXDATA.PRESETS[q]) S.preset = q;
  }
  // back in the tab after a while: fresh values
  if (typeof document !== 'undefined')
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && S.mode === 'live') fetchNow(false);
    });
  return {
    get mode() {
      return S.mode;
    },
    setMode,
    preset,
    get label() {
      return S.label;
    },
    line,
    get src() {
      return S.src;
    },
    // tests: answers instead of Open-Meteo – a function (url) → JSON (or a promise of it), one JSON for every request, 'fail', or null
    mock(m) {
      S.mock =
        m === 'fail' ? () => Promise.reject(new Error('Testfehler')) : typeof m === 'function' ? m : m ? () => m : null;
      S.store = { hours: new Map(), current: null };
      S.req.clear();
      Object.assign(S.now, { st: '', at: 0, failT: 0, fails: 0, err: '' });
      S.rec = null;
      S.src = 'kalender';
      pick(true);
    },
    snap() {
      S.snapNext = true;
      pick(true);
      tick(0.016);
    },
    refresh: () => fetchNow(true),
    clockToNow,
    state: () => ({
      mode: S.mode,
      src: S.src,
      label: S.label,
      line: line(),
      why: S.why,
      preset: S.preset,
      w: S.w,
      cur: { ...S.cur },
      now: { ...S.now },
      calls: S.calls.slice(),
      hours: S.store.hours.size,
      fall: { n: WXFALL.S.n, on: WXFALL.S.on, kR: WXFALL.S.kR, kS: WXFALL.S.kS, splash: WXFALL.S.splash },
      sky: { cov: WXSKY.U.wxCov.value, fog: WXSKY.U.wxFog.value, mask: WXSKY.S.mask, patched: WXSKY.patched },
      ton: WXTON.levels(),
      rec: WXTON.recorded(),
      fallU: {
        wind: [WXFALL.U.uWind.value.x, WXFALL.U.uWind.value.y],
        rain: WXFALL.U.uRain.value.toArray(),
        snow: WXFALL.U.uSnow.value.toArray(),
        hole: WXFALL.U.uHole.value,
      },
      flash: S.flash.k,
      wet: S.wet,
      snowCover: S.snowC,
      boden: WXBODEN.count(),
      flashes: S.flash.n,
      automated: AUTOMATED,
    }),
    data: WXDATA,
    fall: WXFALL,
    S,
  };
})();
window.WETTER = WETTER;
