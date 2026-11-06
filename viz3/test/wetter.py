# feat/wetter (Falko 5.11.2026 23:02: „Wetter live als Standard“, 23:17: „Wichtig ist … immer der Realismus“): the weather of Ratscher from
# Open-Meteo – here never asked (a test browser sends no request: navigator.webdriver), the answers come from WETTER.mock in the shape Open-Meteo
# gives them. Checks: nothing requested on its own; „wie draußen“ with the clock set to now (the current values, the label, the clock line);
# at midday in the garden clear → overcast (sun dimmed, deck closed, grey haze) → rain (drops drawn, the sun lower still, haze) → heavy rain
# → snow (flakes, their share) → fog (dense haze, the sky in it) → storm (wind and gusts carry the drops) → thunderstorm (flashes) → evening
# rain; no new shader program while the weather changes; no drops indoors (the pavilion) while it rains outside, the roof heard; the switch to
# the calendar and back (the menu row, saved as pav-wetter-v1); a failing API → the calendar's sky; the zombie night on 31 October: „Wetter vom
# 31.10.“, its night fog stays (the larger wins), rain falls; a reload keeps the choice. Pictures in out/wetter/ (look at them).
#   python3 viz3/test/wetter.py 9001 [sections]      sections: start,jetzt,wetter,innen,ton,kalender,fehler,zombie,neu (default all)
import sys, os, json, time, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1] if len(sys.argv) > 1 else '8951'
want = set((sys.argv[2] if len(sys.argv) > 2 else 'start,jetzt,wetter,innen,ton,kalender,fehler,zombie,neu').split(','))
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
# the roofs' depth map read back (a float target through a small pass of its own – a program for the test only, so after the count):
# the height of the topmost surface at a few garden points, with the ground there
ROOFPROBE = r"""(() => { const F = WETTER.fall, U = F.U, R = GAME.R; F.roofs(true);
  const C = U.uRoofC.value.clone(), N = U.uRoofN.value, n = 64;
  const rt = new THREE.WebGLRenderTarget(n, n, { type: THREE.FloatType }), sc = new THREE.Scene(), cm = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const m = new THREE.ShaderMaterial({ uniforms: { t: { value: U.uRoof.value } }, depthTest: false, depthWrite: false,
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
    fragmentShader: 'uniform sampler2D t; varying vec2 vUv; void main(){ gl_FragColor = vec4(texture2D(t, vUv).r, 0.0, 0.0, 1.0); }' });
  const q = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), m); q.frustumCulled = false; sc.add(q);
  const prev = R.getRenderTarget(); R.setRenderTarget(rt); R.render(sc, cm); const px = new Float32Array(n * n * 4); R.readRenderTargetPixels(rt, 0, 0, n, n, px); R.setRenderTarget(prev);
  const H = (sx, sy) => { const u = (sx - C.x) / 32 + 0.5, v = (C.y + sy) / 32 + 0.5; if (u <= 0 || u >= 1 || v <= 0 || v >= 1) return null;
    const d = px[(Math.floor(v * n) * n + Math.floor(u * n)) * 4]; return d > 0.9999 ? null : +(C.z - (N.x + d * (N.y - N.x))).toFixed(2); };
  const out = { C: C.toArray().map(v => +v.toFixed(2)) };
  for (const [k, x, y] of [['carport', -1.76, 14.43], ['open1', 3.6, 11.0], ['open2', 6.0, 12.5], ['open3', 1.5, 10.0], ['open4', 4.5, 18.0]])
    out[k] = { top: H(x, y), ground: +GAME.floorAt(x, y, 0.5).toFixed(2) };
  rt.dispose(); m.dispose(); q.geometry.dispose(); return out; })()"""
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
    # the drops' mesh as it is drawn: visible, its draw range, every uniform finite
    UNI = """(() => { const m = GAME.scene.getObjectByName('wetter:niederschlag'), U = m.material.uniforms, o = {};
      for (const [k, u] of Object.entries(U)) { const v = u.value; o[k] = typeof v === 'number' ? v : v && v.toArray ? v.toArray().map(x => +x.toFixed(4)) : v; }
      const fin = Object.values(o).flat().every(x => typeof x !== 'number' || Number.isFinite(x));
      return { vis: m.visible, n: m.geometry.drawRange.count / 6, fin, u: o }; })()"""
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
        pa = progs()
        E("WETTER.fall.roofs(true)")
        pb = progs()
        ck('the roofs\' map (the scene from above into a small target) draws with the programs of the load – none new', pb == pa and J("WETTER.fall.S.roofs") >= 1, f"{pa} → {pb}")
        E("WETTER.fall.U.uRoofC.value.w = 0")
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
        nx = J("[...document.querySelectorAll('#clockwin .wxnext li')].map(li => li.textContent)")
        ck('the clock window lists the coming hours („… Uhr Regen · 7 °C“)', len(nx) >= 3 and all('Uhr' in x and '°C' in x for x in nx), str(nx))
        try: E("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, '00_uhrfenster.png'), timeout=120000)
        except Exception as e: print('note: page shot failed', e)
        E("CLOCK.setWin(false)")
        E("CLOCK.setRate('min')")
    # ---- the weather in the garden at midday, pictures; no new programs ----
    if 'wetter' in want:
        midday(12.0)
        s = weather('klar')
        ck('clear and dry: the ground as it was', s['wet'] == 0, str(s['wet']))
        ck('clear: the birds sing, a light breeze in the ambience', s['amb'] and s['amb']['birds'] > 0.99 and 0.3 < s['amb']['wind'] < 0.9, str(s['amb']))
        ck('clear: the crowns barely move (a light breeze)', s['trees']['sway'][0] < 0.06, str(s['trees']))
        ck('clear: no white on the crowns', s['trees']['white'] == 0, str(s['trees']))
        ck('clear (2 %): the photographs\' clouds give way to the day\'s gradient and the sun\'s glow', s['sky']['clear'] > 0.9, str(s['sky']))
        # no cloud at all (0 %, as in Ratscher on 6.11.2026): no wisp of the cloud noise, the sun undimmed
        E("WETTER.mock(__wxAnswer(Object.assign({}, WETTER.data.PRESETS.klar, { C: 0 })))"); time.sleep(0.2); E("WETTER.snap()"); steps(1.0); E("DN.update(true)"); steps(0.3)
        s0c = st()
        ck('cloudless (0 %): a clear sky, the sun undimmed by any cloud', s0c['sky']['clear'] > 0.9 and s0c['sky']['mask'] == 0 and s0c['sky']['cov'] < 0.003, str(s0c['sky']))
        s = weather('klar')
        ck('clear: the lawn hardly bends (a breeze of 7–14 km/h: a few per cent of the blades\' height)', s['trees']['bend'][0] < 0.08, str(s['trees']))
        # both views once under a clear sky first: what they show compiles there (not counted as the weather's)
        view('garten', 160, -2)
        pic('01b_klar_nah')
        view('garten', 200, 7)
        pic('01_klar')
        p0 = progs()
        d_clear = dn()
        f_clear = fog()
        ck('clear: no cloud deck, nothing falls', s['sky']['cov'] < 0.05 and s['fall']['n'] == 0, str(s['sky']) + str(s['fall']))
        s = weather('heiter')
        pic('01c_heiter')
        ck('fair: a few clouds, the sun still out (unless a cloud covers it)', 0.2 < s['sky']['cov'] < 0.4, str(s['sky']))
        s = weather('wolkig')
        pic('01d_wolkig')
        ck('cloudy: broken clouds drifting, cloud shadows possible, nothing falls', 0.5 < s['sky']['cov'] < 0.75 and s['fall']['n'] == 0, str(s['sky']))
        s = weather('bedeckt')
        d = dn()
        pic('02_bedeckt')
        ck('overcast: a closed deck, the sun dimmed to a tenth or less', s['sky']['cov'] > 0.95 and d['sun'] < 0.15 * max(0.01, d_clear['sun']), f"cov {s['sky']['cov']:.2f} sun {d['sun']} vs {d_clear['sun']}")
        ck('overcast: the eye adapts (exposure up), nothing falls', d['exp'] > d_clear['exp'] and s['fall']['n'] == 0, f"exp {d['exp']} vs {d_clear['exp']}")
        s = weather('regen')
        pic('03_regen')
        ck('rain: drops drawn (a good part of them), the deck closed', s['fall']['n'] > 1500 and s['fall']['kR'] > 0.4 and s['sky']['cov'] > 0.95, str(s['fall']))
        ck('rain: splashes on the ground around the walker', s['fall']['splash'] > 100, str(s['fall']))
        ck('rain: haze over the land from the visibility (6 km)', fog() > 2 * f_clear and fog() > 1e-4, f"fog {fog():.2e} vs {f_clear:.2e}")
        ck('rain: the sound levels (rain outside, no roof outdoors)', s['ton']['rain'] > 0.4 and s['ton']['roof'] == 0, str(s['ton']))
        ck('rain: the birds fall silent, the light wind of the ambience follows the real wind', s['amb'] and s['amb']['birds'] < 0.15 and s['amb']['wind'] > 0.9, str(s['amb']))
        ck('rain: the ground is wet (darker, glossier: terrain, garden ground, roofs)', s['wet'] > 0.6 and s['boden'] >= 2, f"wet {s['wet']:.2f}, {s['boden']} materials")
        view('garten', 160, -2)
        pic('04_regen_nah')
        s = weather('starkregen')
        m = J(UNI)
        print('mesh (heavy rain)', json.dumps(m), flush=True)
        pic('05_starkregen')
        m2 = J(UNI)
        ck('heavy rain: the drops\' mesh drawn, its uniforms finite (before and after the picture)', m['vis'] and m['fin'] and m2['vis'] and m2['fin'] and m['n'] > 3000, json.dumps(m2)[:400])
        ck('heavy rain: all drops, faster', s['fall']['kR'] >= 0.95 and s['fallU']['rain'][0] > 8, str(s['fall']) + str(s['fallU']['rain']))
        # the drops alone on black, at several moments: they must fill the view evenly (they once gathered in sheets – their speed came
        # from the same random number as their height)
        spread = J("""(() => { const F = WETTER.fall, m = F.mesh, r2 = new THREE.WebGLRenderer({ preserveDrawingBuffer: true }), sc = new THREE.Scene();
          r2.setSize(240, 150, false); const cam = GAME.cam, q = m.clone(); q.onBeforeRender = m.onBeforeRender; sc.add(q); const out = [];
          for (const t of [3.0, 4.248, 17.5, 61.0, 133.3]) { F.U.uT.value = t; r2.render(sc, cam); const gl = r2.getContext(), px = new Uint8Array(240 * 150 * 4);
            gl.readPixels(0, 0, 240, 150, gl.RGBA, gl.UNSIGNED_BYTE, px); const th = [0, 0, 0];
            for (let y = 0; y < 150; y++) for (let x = 0; x < 240; x++) { const i = (y * 240 + x) * 4; if (px[i] + px[i + 1] + px[i + 2] > 60) th[Math.min(2, Math.floor(y / 50))]++; }
            const n = th[0] + th[1] + th[2]; out.push(n ? th.map(v => +(v / n).toFixed(2)) : [0, 0, 0]); }
          r2.dispose(); return out; })()""")
        ck('heavy rain: the drops fill the view evenly at every moment (no sheets)', all(min(t) > 0.12 for t in spread), str(spread))
        s = weather('schnee', 2.0)
        pic('07_schnee_nah')
        ck('snow: no splashes', s['fall']['splash'] == 0, str(s['fall']))
        ck('snow: flakes (the snow share), slow', s['fall']['kS'] > 0.5 and s['fallU']['rain'][3] > 0.95 and s['fallU']['snow'][0] < 1.6, str(s['fall']) + str(s['fallU']))
        ck('snow: 8 cm lying – the ground and the roofs white', s['snowCover'] > 0.9 and s['boden'] >= 2, f"cover {s['snowCover']:.2f}, {s['boden']} materials")
        ck('snow: white on the crowns and hedges (their leaf shader has it, compiled at load)', s['trees']['white'] > 0.7 and s['trees']['whiteP'] >= 1, str(s['trees']))
        view('garten', 200, 7)
        pic('06_schnee')
        s = weather('nebel')
        pic('08_nebel')
        ck('fog: no snow lying any more (the data says none)', s['snowCover'] == 0, str(s['snowCover']))
        ck('fog: dense haze (visibility 160 m) and the sky in it', fog() > 5e-3 and s['sky']['fog'] > 0.9, f"fog {fog():.2e} sky {s['sky']['fog']:.2f}")
        s = weather('sturm')
        ck('storm: wind 62 km/h, gusts 98 – the wind level of the sound', s['cur']['wind'] > 15 and s['ton']['wind'] > 0.7, f"wind {s['cur']['wind']:.1f} m/s, ton {s['ton']}")
        ck('storm: the garden\'s trees sway with the wind (their leaf shader has the sway, patched at load)', s['trees']['n'] >= 3 and s['trees']['sway'][0] > 0.3, str(s['trees']))
        ck('storm: the lawn and the flowers bend (their materials patched before the first compile)', s['trees']['grass'] >= 2 and s['trees']['bend'][0] > 0.2, str(s['trees']))
        pic('09_sturm')
        s = weather('gewitter', 0.5)
        n0 = J("WETTER.state().flashes")
        steps(30, 0.1)
        n1 = J("WETTER.state().flashes")
        w = math.hypot(*J("WETTER.state().fallU.wind"))
        ck('thunderstorm: lightning flashes within 30 s, rain driven by the wind', n1 > n0 and w > 4, f"{n1 - n0} flashes, wind on the drops {w:.1f} m/s")
        # a near strike (900 m) with its bolt in view: one small step starts it, the first stroke is at full strength
        E("WETTER.strike({ d: 900, az: 176 })")
        steps(0.02, 0.02)
        ck('a flash lights the sky and the land for a moment (its first stroke)', J("WETTER.state().flash") > 0.3, str(J("WETTER.state().flash")))
        sky_flash_day = J("WETTER.state().skyFlash")
        pic('10_blitz')
        steps(1)
        # showers: cells pass – under one it pours and the sky closes; between them dry, broken clouds and the sun, a rainbow opposite it
        # (an hour with the sun 12–32° high, whatever the game's date: the afternoon in November, the evening in June)
        for h in (14.0, 18.0, 15.0, 17.5, 10.0, 9.0):
            midday(h)
            if 12 < J("DN.state.sunEl") < 32: break
        weather('schauer')
        E("WETTER.shower(1); WETTER.snap()"); steps(1, 0.1)
        s = st()
        ck('showers: under a cell it pours (some three times the hour\'s mean) and the sky closes', s['cur']['rain'] > 8 and s['cur']['cover'] > 0.9 and s['shower']['bow'] == 0, f"rain {s['cur']['rain']:.1f} cover {s['cur']['cover']:.2f} {s['shower']}")
        E("WETTER.shower(0); WETTER.snap()"); steps(1, 0.1)
        # wait for a gap in front of the sun: the deck moved on by hand (the wind would bring one in a while)
        for i in range(30):
            if J("WETTER.state().sky.mask") < 0.2: break
            E("DN.SU.wxT.value.x += 0.29; DN.SU.wxT.value.y += 0.17"); steps(0.3, 0.1)
        az = J("DN.state.sunAz"); el = J("DN.state.sunEl")
        view('garten', round((az + 180) % 360), 12)
        steps(0.5, 0.1)
        s = st()
        ck('showers: between them dry, broken clouds, the sun out – a rainbow opposite it (in the sky\'s program, no new one)', s['cur']['rain'] < 0.05 and s['cur']['cover'] < 0.75 and s['shower']['bow'] > 0.9 and (s['shower']['u'] > 0.1 or s['sky']['mask'] >= 0.2), f"sun {el:.0f}° az {az:.0f}°, rain {s['cur']['rain']:.2f} cover {s['cur']['cover']:.2f} mask {s['sky']['mask']} {s['shower']}")
        pic('10b_regenbogen')
        E("WETTER.shower(null)")
        midday(12.0)
        ck('no new shader program while the weather changed (clear → overcast → rain → snow → fog → storm → thunderstorm → showers)', progs() == p0, f"{p0} → {progs()}")
        ok, r = lib.check_gl(pg, 16)
        ck('every shader program links and stays within 16 textures (the sky with its clouds, the drops)', ok, json.dumps({k: r[k] for k in ('programs', 'maxFrag', 'maxVert', 'broken')})[:300] + json.dumps(r['bad'])[:200])
        # roofs over the rain: the scene from above as a depth map – no drop under the carport's roof, the open garden rained on
        view('garten', 200, 7)
        s = weather('regen')
        ck('rain in the garden: the roofs\' map is drawn', s['fall']['roofMap'] and s['fall']['roofs'] >= 1, str(s['fall']))
        rp = J(ROOFPROBE)
        print('roofs', json.dumps(rp), flush=True)
        cp = rp['carport']
        opens = [k for k in ('open1', 'open2', 'open3', 'open4') if rp[k]['top'] is not None and abs(rp[k]['top'] - rp[k]['ground']) < 0.6]
        ck('roofs\' map: the carport\'s roof 1.8–4.5 m over its floor, open garden open (≥ 2 of 4 points)', cp['top'] is not None and 1.8 < cp['top'] - cp['ground'] < 4.5 and len(opens) >= 2, json.dumps(rp))
        E("GAME.go('wohnwagen')")
        steps(0.6)
        pic('04b_carport_regen')
        view('garten', 200, 7)
        midday(16.45)
        view('garten', 245, 8)
        weather('wolkig')
        pic('11a_abend_wolkig')
        midday(17.2)
        view('garten', 250, 5)
        weather('regen')
        pic('11_abendregen')
        # an overcast night: no stars, no moon, the underside of the deck faintly lit by the towns around
        midday(22.5)
        view('garten', 200, 12)
        s = weather('bedeckt')
        pic('11b_nacht_bedeckt')
        g = J("WETTER.S && window.DN ? DN.SU.wxGlow.value.toArray() : null")
        ck('an overcast night: the stars hidden, the towns\' glow on the deck', J("DN.dbg().stars") < 0.05 and g and g[0] > 0.004, f"stars {J('DN.dbg().stars')} glow {g}")
        # a night of broken clouds: the stars shine between the clouds and go out behind them
        s = weather('wolkig')
        pic('11e_nacht_wolkig')
        ck('a night of broken clouds: the stars on, each one out behind a cloud (their shader has the deck)', s['sky']['stars'] and J("DN.dbg().stars") > 0.3, f"stars {J('DN.dbg().stars')} {s['sky']}")
        # a thunderstorm at night: a near strike lights everything for a moment, its bolt in view
        weather('gewitter', 0.5)
        E("WETTER.strike({ d: 800, az: 176 })")
        steps(0.02, 0.02)
        pic('11d_nacht_blitz')
        sf = J("WETTER.state().skyFlash")
        ck('a flash at night lights the sky more than by day (the daylight is far stronger)', sf > 1.8 * sky_flash_day > 0, f"night {sf:.2f} day {sky_flash_day:.2f}")
        steps(1)
        # hoarfrost: a clear, calm, cold and humid morning – the ground and the roofs white-grey; gone by noon in the sun
        midday(7.75)
        view('garten', 160, -2)
        s = weather('reif')
        pic('11c_reif_morgen')
        ck('hoarfrost on a clear cold calm morning: grass, roofs and ground frosted (no snow lying)', s['frost'] > 0.8 and s['snowCover'] == 0 and s['fall']['n'] == 0, f"frost {s['frost']:.2f} cover {s['snowCover']:.2f}")
        ck('… and rime on the crowns, thinner than snow', 0.25 < s['trees']['white'] < 0.5, str(s['trees']))
        midday(12.0)
        s = weather('reif')
        ck('… and gone by noon in the sun', s['frost'] < 0.05, f"frost {s['frost']:.3f}")
    # ---- the clear sky judged by pictures (only when asked: wetter.py <port> himmel): the same moment before (the photographs as they
    #      are, WETTER.S.noClear) and after (the clear gradient) – noon, a morning sun at ~12°, the golden hour; the garden and the Anger,
    #      towards the sun and away; today's date (a cloudless November day as in Ratscher on 6.11.2026) ----
    if 'himmel' in want:
        E("WETTER.clockToNow(); CLOCK.setRate('min')")
        E("WETTER.mock(__wxAnswer(Object.assign({}, WETTER.data.PRESETS.klar, { C: 0, V: 38000, T: 8, H: 60, W: 6, G: 12 })))")
        time.sleep(0.2); E("WETTER.snap()"); steps(0.5)
        el_at = lambda h: J(f"(() => {{ CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + {round(h * 60)}; DN.update(true); return DN.state.sunEl; }})()")
        hours = [('mittag', 12.0)]
        hm = next((h / 4 for h in range(16, 48) if el_at(h / 4) >= 12), None)
        if hm: hours.append(('morgen12', hm))
        hg = next((h / 4 for h in range(56, 90) if el_at(h / 4) <= 5), None)
        if hg: hours.append(('gold5', hg))
        print('hours', hours, flush=True)
        seen = set()
        for tag, h in hours:
            midday(h)
            az, el = J("DN.state.sunAz"), J("DN.state.sunEl")
            for spot, yaw, side in (('garten', az, 'sonne'), ('garten', az + 180, 'gegen'), ('dorf', az, 'sonne'), ('dorf', az + 180, 'gegen')):
                view(spot, round(yaw % 360), 9)
                if spot not in seen:
                    seen.add(spot)
                    # the first time there: the near detail of the place builds
                    E("for (let i = 0; i < 30; i++) GAME.step(0.4)")
                for nc, name in ((True, 'vorher'), (False, 'nachher')):
                    E(f"WETTER.S.noClear = {'true' if nc else 'false'}; WETTER.snap()"); steps(0.4); E("DN.update(true)"); steps(0.3)
                    pic(f'h_{tag}_{spot}_{side}_{name}')
            s = st()
            print(f'sky {tag} {h} h: sun {el:.1f}° az {az:.0f}°', s['sky'], flush=True)
            ck(f'the clear sky ({tag}, sun {el:.0f}°): drawn by day above ~10°, the photographs below', (s['sky']['clear'] > 0.9) == (el > 10.5) or 3 < el < 10.5, str(s['sky']))
        E("WETTER.S.noClear = false")
    # ---- indoors: in the pavilion the rain stays beyond its walls (through the windows), in a garden building none falls; the roof heard ----
    if 'innen' in want:
        weather('regen')
        view('bibliothek', None, -4)
        steps(0.5)
        s = st()
        ins = E("GAME.audio && GAME.audio.inside ? GAME.audio.inside() : null")
        pic('12_innen_regen')
        ck('in the pavilion (the library) while it rains: drops only beyond its walls (5.5 m), seen through the windows', ins and s['fall']['on'] and s['fallU']['hole'] >= 5, f"inside {ins} fall {s['fall']} hole {s['fallU']['hole']}")
        ck('indoors: the rain on the roof is heard, the open rain muffled', s['ton']['roof'] > 0.4, str(s['ton']))
        # a garden building: the first point inside one (KERN.inside of the garden, not the pavilion) – there none is drawn
        pt = J("""(() => { for (let y = -12; y < 32; y += 0.5) for (let x = -20; x < 24; x += 0.5) { const z = GAME.floorAt(x, y, 1.5);
          if (window.insideSite && insideSite(x, y, z + 0.1) && !(Math.hypot(x - 2, y - 2) < 8)) return [x, y, z]; } return null; })()""")
        if pt:
            E(f"(() => {{ const P = GAME.P; P.x = {pt[0]}; P.y = {pt[1]}; P.feet = {pt[2]}; }})()")
            steps(0.4)
            s = st()
            ck('in a garden building while it rains: no drops drawn', s['fall']['n'] == 0 and not s['fall']['on'], f"at {pt} fall {s['fall']}")
        else:
            ck('a garden building to stand in was found', False, 'none on the grid')
        view('garten', 200, 7)
        s = st()
        ck('outdoors again: the drops are back', s['fall']['n'] > 1500 and s['fallU']['hole'] < 1, str(s['fall']))
        # riding along (a car, the bus: PLAY.sit with kind 'ride'): no drop in the cabin, the rain drums on its roof, no splashes
        E("(() => { const P = GAME.P; PLAY.sit({ kind: 'ride', fp: true, follow: () => ({ x: P.x, y: P.y, z: P.feet + 1.3 }), yaw: 200, pitch: -2 }); })()")
        steps(0.5)
        s = st()
        ck('riding along in the rain: drops only outside the cabin (2.4 m), the roof heard, no splashes',
           s['fall']['on'] and abs(s['fallU']['hole'] - 2.4) < 0.01 and s['ton']['roof'] > 0.4 and s['fall']['splash'] == 0, f"fall {s['fall']} hole {s['fallU']['hole']} ton {s['ton']}")
        E("PLAY.stand(true)")
        steps(0.5)
    # ---- the recordings: each kind loaded and decoded when its weather first comes (rain, downpour, roof, wind, thunder) ----
    if 'ton' in want:
        E("GAME.setSound && GAME.setSound(true)")
        time.sleep(1.5)
        st0 = E("GAME.audio.state()")
        weather('regen', 0.5)
        r1 = []
        for i in range(20):
            steps(0.2); time.sleep(0.3)
            r1 = J("WETTER.state().rec")
            if 'regen' in r1 and 'dach' in r1: break
        ck('rain: the rain and roof recordings are loaded and decoded (no thunder without a thunderstorm)', st0 != 'running' or ('regen' in r1 and 'dach' in r1 and 'donner' not in r1), f"audio {st0}, recorded {r1}")
        weather('gewitter', 0.5)
        r2 = []
        for i in range(30):
            steps(0.2); time.sleep(0.3)
            r2 = J("WETTER.state().rec")
            if all(k in r2 for k in ('starkregen', 'wind', 'donner')): break
        ck('thunderstorm: the downpour, the storm wind and the thunder recordings come too', st0 != 'running' or all(k in r2 for k in ('starkregen', 'wind', 'donner')), f"audio {st0}, recorded {r2}")
        E("GAME.setSound && GAME.setSound(false)")
    # ---- the switch to the calendar and back, saved ----
    if 'kalender' in want:
        weather('regen')
        E("document.querySelector('#wxseg [data-wxm=\"kalender\"]').click()")
        E("WETTER.snap()")
        steps(0.5)
        s = st()
        sv = E("localStorage.getItem('pav-wetter-v1')")
        ck('„nach Kalender“ in the menu: the calendar\'s sky, nothing falls, the ground dry (no frost, no snow)', s['mode'] == 'kalender' and s['src'] == 'kalender' and s['fall']['n'] == 0 and s['sky']['cov'] < 0.01 and s['wet'] == 0 and s['frost'] == 0 and s['snowCover'] == 0, f"{s['mode']} {s['src']} {s['fall']} {s['sky']} wet {s['wet']} frost {s['frost']} snow {s['snowCover']}")
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
