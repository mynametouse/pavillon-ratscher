# feat/wetter (Falko 5.11.2026 23:02: „Wetter live als Standard“, 23:17: „Wichtig ist … immer der Realismus“): the weather of Ratscher from
# Open-Meteo – here never asked (a test browser sends no request: navigator.webdriver), the answers come from WETTER.mock in the shape Open-Meteo
# gives them. Checks: nothing requested on its own; „wie draußen“ with the clock set to now (the current values, the label, the clock line);
# at midday in the garden clear → overcast (sun dimmed, deck closed, grey haze) → rain (drops drawn, the sun lower still, haze) → heavy rain
# → snow (flakes, their share) → fog (dense haze, the sky in it) → storm (wind and gusts carry the drops) → thunderstorm (flashes) → evening
# rain; no new shader program while the weather changes; no drops indoors (the pavilion) while it rains outside, the roof heard; the switch to
# the calendar and back (the menu row, saved as pav-wetter-v1); a failing API → the calendar's sky; the zombie night on 31 October: „Wetter vom
# 31.10.“, its night fog stays (the larger wins), rain falls; a reload keeps the choice. Pictures in out/wetter/ (look at them).
#   python3 viz3/test/wetter.py 9001 [sections]      sections: start,jetzt,wetter,innen,kalender,fehler,zombie,neu (default all)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'start,jetzt,wetter,innen,kalender,fehler,zombie,neu').split(','))
ck = lib.Checks('wetter')
OUT = lib.out('wetter')
# an Open-Meteo answer with the same weather in every hour of the asked days (and the current values for 'now'), from a record of WXDATA
MOCK = r"""window.__wxAnswer = rec => url => {
  const names = { T: 'temperature_2m', P: 'precipitation', R: 'rain', SH: 'showers', SN: 'snowfall', C: 'cloud_cover', V: 'visibility', W: 'wind_speed_10m',
    G: 'wind_gusts_10m', D: 'wind_direction_10m', WC: 'weather_code', H: 'relative_humidity_2m', SD: 'snow_depth' };
  const q = new URL(url).searchParams, now = Math.floor(Date.now() / 1000), hourly = { time: [] };
  let t0, t1;
  if (q.get('start_date')) { t0 = Date.parse(q.get('start_date') + 'T00:00:00Z') / 1000; t1 = Date.parse(q.get('end_date') + 'T23:00:00Z') / 1000; }
  else { t0 = Math.floor(now / 86400) * 86400 - 86400; t1 = t0 + 4 * 86400 - 3600; }
  for (const n of Object.values(names)) hourly[n] = [];
  for (let t = t0; t <= t1; t += 3600) { hourly.time.push(t); for (const [k, n] of Object.entries(names)) hourly[n].push(rec[k] ?? null); }
  const out = { latitude: 50.47, longitude: 10.78, utc_offset_seconds: 0, hourly };
  if (!q.get('start_date')) { const c = { time: Math.floor(now / 900) * 900, interval: 900 };
    for (const [k, n] of Object.entries(names)) if (rec[k] !== undefined) c[n] = ['P', 'R', 'SH', 'SN'].includes(k) ? rec[k] / 4 : rec[k]; out.current = c; }
  (window.__wxUrls = window.__wxUrls || []).push(url);
  return out;
};"""
with lib.browser() as b:
    errs, reqs = [], []
    pg = lib.page(b, 1100, 680, errs)
    pg.on('request', lambda r: reqs.append(r.url) if 'open-meteo' in r.url else None)
    lib.boot(pg, port)
    E = pg.evaluate
    J = lambda js: json.loads(E("JSON.stringify(" + js + ")"))
    steps = lambda secs, dt=0.05: E(f"for (let i = 0; i < {max(1, int(secs / dt))}; i++) GAME.step({dt})")
    E(MOCK)
    E("document.head.insertAdjacentHTML('beforeend', '<style>*{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>')")
    def pic(name):
        try: lib.shot(pg, OUT, name)
        except Exception as e: print('shot failed', name, e, flush=True)
    progs = lambda: E("GAME.R.info.programs.length")
    st = lambda: J("WETTER.state()")
    dn = lambda: J("DN.dbg()")
    fog = lambda: E("GAME.scene.fog.density")
    def weather(name, secs=1.0):
        E(f"WETTER.mock(__wxAnswer(WETTER.data.PRESETS['{name}']))")
        time.sleep(0.2)
        E("WETTER.snap()")
        steps(secs)
        E("DN.update(true)")
        steps(0.3)
        return st()
    def view(spot='garten', yaw=None, pitch=4):
        E(f"GAME.go('{spot}')")
        steps(0.5)
        if yaw is not None: E(f"GAME.P.yaw = GAME.P.body = {yaw}")
        E(f"GAME.P.pitch = {pitch}")
        steps(0.3)
    def midday(h=12.0):
        E(f"CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + {round(h * 60)}; DN.update(true)")
        lib.settle_light(pg)
    s0 = st()
    if 'start' in want:
        ck('the weather module is there, its clouds are in the sky\'s program', s0['sky']['patched'], str(s0['sky']))
        ck('a test browser is recognised (no request leaves it)', s0['automated'], str(s0['automated']))
        ck('the default is „wie draußen“ (live)', s0['mode'] == 'live', s0['mode'])
        ck('without an answer: the calendar\'s sky, said so', s0['src'] == 'kalender' and 'Kalender' in s0['line'], s0['line'])
        ck('no request to Open-Meteo from the test browser', not reqs, str(reqs[:3]))
        ck('the menu has the row „Wetter: wie draußen | nach Kalender“',
           E("!!document.querySelector('#wxseg [data-wxm=\"live\"]') && !!document.querySelector('#wxseg [data-wxm=\"kalender\"]')"), '')
    # ---- „wie draußen“: the clock to now, the current values ----
    if 'jetzt' in want:
        E("WETTER.clockToNow()")
        steps(0.3)
        s = weather('regen', 0.5)
        ck('clock set to now: the current values, „Wetter wie draußen“', s['src'] == 'jetzt' and s['label'] == 'Wetter wie draußen', f"{s['src']} {s['label']}")
        ck('the line: „Regen · 7 °C · Wind 20 km/h, Böen 38 – Open-Meteo“', s['line'].startswith('Regen · 7 °C · Wind 20 km/h') and 'Open-Meteo' in s['line'], s['line'])
        ck('the „now“ request was answered (current values + hours)', any('current=' in u for u in s['calls']) and s['hours'] > 48, f"{s['hours']} hours, calls {s['calls'][-2:]}")
        E("CLOCK.setWin(true)")
        time.sleep(0.5)
        txt = E("document.getElementById('clockwin').innerText")
        ck('the clock window says it: „Wetter wie draußen“ and the line', 'Wetter wie draußen' in txt and 'Regen · 7 °C' in txt and 'nach Kalender' in txt, txt[txt.find('Wetter'):][:160].replace('\n', ' | '))
        try: E("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, '00_uhrfenster.png'), timeout=120000)
        except Exception as e: print('note: page shot failed', e)
        E("CLOCK.setWin(false)")
        E("CLOCK.setRate('min')")
    # ---- the weather in the garden at midday, pictures; no new programs ----
    if 'wetter' in want:
        midday(12.0)
        s = weather('klar')
        # both views once under a clear sky first: what they show compiles there (not counted as the weather's)
        view('garten', 160, -2)
        pic('01b_klar_nah')
        view('garten', 200, 7)
        pic('01_klar')
        p0 = progs()
        d_clear = dn()
        f_clear = fog()
        ck('clear: no cloud deck, nothing falls', s['sky']['cov'] < 0.05 and s['fall']['n'] == 0, str(s['sky']) + str(s['fall']))
        s = weather('bedeckt')
        d = dn()
        pic('02_bedeckt')
        ck('overcast: a closed deck, the sun dimmed to a tenth or less', s['sky']['cov'] > 0.95 and d['sun'] < 0.15 * max(0.01, d_clear['sun']), f"cov {s['sky']['cov']:.2f} sun {d['sun']} vs {d_clear['sun']}")
        ck('overcast: the eye adapts (exposure up), nothing falls', d['exp'] > d_clear['exp'] and s['fall']['n'] == 0, f"exp {d['exp']} vs {d_clear['exp']}")
        s = weather('regen')
        pic('03_regen')
        ck('rain: drops drawn (a good part of them), the deck closed', s['fall']['n'] > 1500 and s['fall']['kR'] > 0.4 and s['sky']['cov'] > 0.95, str(s['fall']))
        ck('rain: haze over the land from the visibility (6 km)', fog() > 2 * f_clear and fog() > 1e-4, f"fog {fog():.2e} vs {f_clear:.2e}")
        ck('rain: the sound levels (rain outside, no roof outdoors)', s['ton']['rain'] > 0.4 and s['ton']['roof'] == 0, str(s['ton']))
        view('garten', 160, -2)
        pic('04_regen_nah')
        s = weather('starkregen')
        pic('05_starkregen')
        ck('heavy rain: all drops, faster', s['fall']['kR'] >= 0.95 and s['fallU']['rain'][0] > 8, str(s['fall']) + str(s['fallU']['rain']))
        s = weather('schnee', 2.0)
        pic('07_schnee_nah')
        ck('snow: flakes (the snow share), slow', s['fall']['kS'] > 0.5 and s['fallU']['rain'][3] > 0.95 and s['fallU']['snow'][0] < 1.6, str(s['fall']) + str(s['fallU']))
        view('garten', 200, 7)
        pic('06_schnee')
        s = weather('nebel')
        pic('08_nebel')
        ck('fog: dense haze (visibility 160 m) and the sky in it', fog() > 5e-3 and s['sky']['fog'] > 0.9, f"fog {fog():.2e} sky {s['sky']['fog']:.2f}")
        s = weather('sturm')
        ck('storm: wind 62 km/h, gusts 98 – the wind level of the sound', s['cur']['wind'] > 15 and s['ton']['wind'] > 0.7, f"wind {s['cur']['wind']:.1f} m/s, ton {s['ton']}")
        pic('09_sturm')
        s = weather('gewitter', 0.5)
        n0 = J("WETTER.state().flashes")
        steps(30, 0.1)
        n1 = J("WETTER.state().flashes")
        w = math.hypot(*J("WETTER.state().fallU.wind"))
        ck('thunderstorm: lightning flashes within 30 s, rain driven by the wind', n1 > n0 and w > 4, f"{n1 - n0} flashes, wind on the drops {w:.1f} m/s")
        E("WETTER.S.flash.next = 0")
        steps(0.1)
        pic('10_blitz')
        steps(1)
        ck('no new shader program while the weather changed (clear → overcast → rain → snow → fog → storm → thunderstorm)', progs() == p0, f"{p0} → {progs()}")
        midday(17.2)
        view('garten', 250, 5)
        weather('regen')
        pic('11_abendregen')
        midday(12.0)
    # ---- indoors: no drops, the roof heard ----
    if 'innen' in want:
        weather('regen')
        view('bibliothek', None, -4)
        steps(0.5)
        s = st()
        ins = E("GAME.audio && GAME.audio.inside ? GAME.audio.inside() : null")
        pic('12_innen_regen')
        ck('indoors (the pavilion\'s library) while it rains: no drops drawn', ins and s['fall']['n'] == 0 and not s['fall']['on'], f"inside {ins} fall {s['fall']}")
        ck('indoors: the rain on the roof is heard, the open rain muffled', s['ton']['roof'] > 0.4, str(s['ton']))
        view('garten', 200, 7)
        s = st()
        ck('outdoors again: the drops are back', s['fall']['n'] > 1500, str(s['fall']))
    # ---- the switch to the calendar and back, saved ----
    if 'kalender' in want:
        weather('regen')
        E("document.querySelector('#wxseg [data-wxm=\"kalender\"]').click()")
        E("WETTER.snap()")
        steps(0.5)
        s = st()
        sv = E("localStorage.getItem('pav-wetter-v1')")
        ck('„nach Kalender“ in the menu: the calendar\'s sky, nothing falls', s['mode'] == 'kalender' and s['src'] == 'kalender' and s['fall']['n'] == 0 and s['sky']['cov'] < 0.01, f"{s['mode']} {s['src']} {s['fall']} {s['sky']}")
        ck('saved through SAVE (pav-wetter-v1)', sv and json.loads(sv).get('m') == 'kalender', str(sv))
        ck('the menu row shows it', E("document.querySelector('#wxseg [data-wxm=\"kalender\"]').getAttribute('aria-pressed')") == 'true', '')
        pic('13_kalender')
        E("document.querySelector('#wxseg [data-wxm=\"live\"]').click()")
        time.sleep(0.2)
        E("WETTER.snap()")
        steps(0.5)
        s = st()
        ck('back to „wie draußen“: the rain again', s['mode'] == 'live' and s['fall']['n'] > 1500, f"{s['mode']} {s['src']} {s['fall']}")
        ck('saved again', json.loads(E("localStorage.getItem('pav-wetter-v1')")).get('m') == 'live', '')
    # ---- a failing API → the calendar ----
    if 'fehler' in want:
        E("WETTER.mock('fail')")
        time.sleep(0.3)
        E("WETTER.snap()")
        steps(0.5)
        time.sleep(0.2)
        E("WETTER.snap()")
        s = st()
        ck('Open-Meteo fails: the calendar\'s sky, nothing falls, the line says why', s['src'] == 'kalender' and s['fall']['n'] == 0 and 'nicht erreichbar' in s['line'], f"{s['src']} {s['line']}")
        ck('… and the sky clears (the deck goes)', s['sky']['cov'] < 0.01 and s['cur']['rain'] == 0, str(s['sky']) + str(s['cur']))
    # ---- the zombie night on 31 October: its date's weather, its fog stays on top ----
    if 'zombie' in want:
        E("WETTER.mock(__wxAnswer(WETTER.data.PRESETS['regen']))")
        E("KERN.scenario('zombie').run()")
        steps(3)
        time.sleep(0.3)
        E("WETTER.snap()")
        steps(0.5)
        s = st()
        ck('the zombie night: „Wetter vom 31.10.“ (the hours of its day asked)', s['label'] == 'Wetter vom 31.10.' and any('start_date=2026-10-30' in u or 'start_date=2025-10-30' in u for u in s['calls']), f"{s['label']} {s['calls'][-2:]}")
        E("(() => { const T = ZSTATE.times(); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + T.siren + 40; DN.update(true); })()")
        lib.settle_light(pg)
        steps(14)
        s = st()
        zf = fog()
        ck('the night: the zombie fog stays (the larger wins), rain falls', zf > 0.012 and s['fall']['n'] > 1500, f"fog {zf:.4f} fall {s['fall']}")
        pic('14_zombie_regen')
        E("ZOMBIE.stop(true)")
        steps(1)
    ck.errors(errs)
    # ---- a reload keeps the choice ----
    if 'neu' in want:
        E("WETTER.setMode('kalender')")
        pg.reload(wait_until='domcontentloaded')
        pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
        time.sleep(2)
        ck('after a reload: still „nach Kalender“', E("WETTER.mode") == 'kalender', E("WETTER.mode"))
        E("WETTER.setMode('live')")
    ck('no request to Open-Meteo in the whole test', not reqs, str(reqs[:3]))
ck.done()
