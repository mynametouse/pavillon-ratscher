# V16a day and night: the light at several hours of 1 June (game day 1), the moonlit fixed night, the workshop at night, the clock window
import sys, os, time, base64, json
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
from playwright.sync_api import sync_playwright
port = sys.argv[1]; OUT = lib.out('v16a'); os.makedirs(OUT, exist_ok=True)
ONLY = sys.argv[2].split(',') if len(sys.argv) > 2 else None
def shot(pg, name):
    d = pg.evaluate("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.88); })()"); open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'])
    pg = b.new_page(viewport={'width': 1000, 'height': 600}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.type + ' ' + m.text) if m.type in ('error', 'warning') else None)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); print('loaded', round(time.time() - t0), 's', flush=True)
    time.sleep(3); pg.evaluate("window.FREEZE = true"); E = lambda js: pg.evaluate(js)
    print("warnings at load", len([e for e in errs if "Texture marked" in e]), flush=True); E("GAME.setView3(false, true)")
    print('mode', E("JSON.stringify({ mode: MODE_NOW, dn: DN.active, e0: DN.e0, date: DN.dateStr(CLOCK.t, true) })"), flush=True)
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden')")
    def at(day, h, m, view):
        E(f"CLOCK.t = {(day - 1) * 1440 + h * 60 + m}; GAME.view({','.join(map(str, view))}); DN.update(true)")
        for i in range(60):
            E("GAME.step(0.1)")
            if E("DN.ready()"): break
            time.sleep(0.5)
        E("GAME.step(0.3); DN.update(true); GAME.step(0.1)")
        st = E("JSON.stringify(Object.assign((s => ({ t: CLOCK.hm(), sunAz: +s.sunAz.toFixed(1), sunEl: +s.sunEl.toFixed(2), moonAz: +s.moonAz.toFixed(1), moonEl: +s.moonEl.toFixed(1), il: +s.illum.toFixed(2) }))(DN.state), DN.dbg()))")
        print(st, flush=True)
    VSE = [9.9, -1.0, 1.65, -55, 10, 72]     # from the south-east towards the pavilion and the north-west sky (sunset in June)
    VSW = [-6.4, -3.8, 1.65, 55, 8, 64]      # from the south-west (b04)
    TIMES = [('t0415', 4, 15), ('t0500', 5, 0), ('t0600', 6, 0), ('t0800', 8, 0), ('t1300', 13, 0), ('t1930', 19, 30), ('t2045', 20, 45), ('t2120', 21, 20), ('t2145', 21, 45), ('t2215', 22, 15), ('t2300', 23, 0)]
    for name, h, m in TIMES:
        if ONLY and name not in ONLY: continue
        at(1, h, m, VSE); shot(pg, name + '_se')
        if name in ('t0800', 't1930', 't2145', 't2300'): E(f"GAME.view({','.join(map(str, VSW))})"); E("GAME.step(0.1)"); shot(pg, name + '_sw')
    if not ONLY or 'dark' in ONLY:   # moonless: 15 June (new moon), 00:30 and 01:30
        at(15, 0, 30, [2.5, 12.0, 1.65, 180, 40, 90]); shot(pg, 'd_south_0030')
        at(15, 1, 30, [2.5, 12.0, 1.65, 200, 70, 100]); shot(pg, 'd_zenith_0130')
        at(15, 1, 30, [-6.4, -3.8, 1.65, 55, 8, 64]); shot(pg, 'd_house_0130')
    if not ONLY or 'sky' in ONLY:
        at(2, 0, 45, [2.5, 12.0, 1.65, 160, 12, 70]); shot(pg, 'n_moon_sse')      # June 2, 00:45: the full moon low in the SSE
        at(2, 1, 30, [2.5, 12.0, 1.65, 200, 62, 90]); shot(pg, 'n_zenith')
        at(1, 21, 50, [2.5, 12.0, 1.65, 315, 6, 80]); shot(pg, 'n_afterglow_nw')
    if not ONLY or 'night' in ONLY:
        E("document.querySelector('[data-light=\"night\"]').click()"); E("GAME.step(0.3)")
        for i in range(40):
            E("GAME.step(0.1)")
            if E("DN.ready()"): break
            time.sleep(0.5)
        E(f"GAME.view({','.join(map(str, VSW))})"); E("GAME.step(0.2)"); shot(pg, 'fix_night_sw')
        E("GAME.view(2.5, 14.0, 1.65, 154, 18, 70)"); E("GAME.step(0.2)"); shot(pg, 'fix_night_moon')
        E("document.querySelector('[data-light=\"auto\"]').click()"); E("GAME.step(0.3)")
    if not ONLY or 'werk' in ONLY:
        at(1, 23, 10, [-2.2, -37.0, 1.65, 190, -14, 74]); E("GAME.step(0.6)"); shot(pg, 'w_inside_night')
        E("GAME.view(2.5, -30.0, 1.65, -155.3, -2, 64)"); E("GAME.step(0.4)"); shot(pg, 'w_from_garden_night')
        print('wlamp', E("JSON.stringify({ on: WLAMP.S.on, k: WLAMP.S.k, I: WLAMP.light.intensity })"))
    if not ONLY or 'ui' in ONLY:
        E("GAME.go('werkstatt'); GAME.step(0.3); CLOCK.setWin(true)"); time.sleep(0.5)
        print('win', E("document.querySelector('#clockwin').innerText.slice(0, 400)"))
        pg.screenshot(path=os.path.join(OUT, 'ui_clockwin.png'))
    print('warnings total', len([e for e in errs if 'Texture marked' in e])); errs = [e for e in errs if 'Texture marked' not in e]
    print('\n'.join(errs[:40]) or 'no errors', flush=True)
    b.close()
