"""Safari engine (WebKit, as on iPhone and Mac): the page loads in Playwright's WebKit with the iPhone 13 profile (screen, touch, user agent),
without uncaught errors; prints the WebGL renderer and the load time. Catches Safari-only breakage before Falko's iPhone does.
    python3 viz3/test/webkit.py 8951        (needs: python -m playwright install webkit)"""
import sys, os, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import lib
from playwright.sync_api import sync_playwright

port = sys.argv[1]
ck = lib.Checks('webkit')
with sync_playwright() as p:
    b = p.webkit.launch()
    try:
        ctx = b.new_context(**p.devices['iPhone 13'])
        pg = ctx.new_page()
        errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
        lib.preset(pg, 'schnell')
        t0 = time.time()
        ok = True
        try:
            pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
            pg.wait_for_function('window.GAME && GAME.loaded && GAME.loaded()', timeout=1500000, polling=2000)
        except Exception as e:
            ok = False
            print('load failed', str(e)[:300], flush=True)
        info = pg.evaluate("JSON.stringify({ gl: window.GLINFO ? GLINFO.renderer : null, tex: window.TEXHALF ? TEXHALF.level : null, save: window.SAVE ? SAVE.persistent() : null })") if ok else '{}'
        ck('loads in WebKit (iPhone 13 profile)', ok, f'{round(time.time() - t0)} s {info}')
        if ok:
            ck('runs a few steps', pg.evaluate('(() => { for (let i = 0; i < 20; i++) GAME.step(0.05); return true; })()'))
        ck.errors(errs)
    finally:
        b.close()
ck.done()
