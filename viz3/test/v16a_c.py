# V16a: the night with the lamp spill masked, the moon phases zoomed in (FOVX), the night gallery view
import sys, os, time, base64, json
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
from playwright.sync_api import sync_playwright
port = sys.argv[1]; OUT = lib.out('v16a'); os.makedirs(OUT, exist_ok=True)
def shot(pg, name):
    d = pg.evaluate("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.9); })()"); open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 900, 'height': 560}); lib.preset(pg, 'hoch'); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
    time.sleep(3); pg.evaluate("window.FREEZE = true"); E = lambda js: pg.evaluate(js)
    E("document.querySelectorAll('#toast').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false, true)")
    def at(day, h, m, view):
        E(f"CLOCK.t = {(day - 1) * 1440 + h * 60 + m}; GAME.view({','.join(map(str, view))}); DN.update(true)")
        for i in range(80):
            E("GAME.step(0.05)")
            if E("DN.ready()"): break
            time.sleep(0.3)
        E("DN.update(true); GAME.step(0.05)")
    at(15, 1, 30, [-6.4, -3.8, 1.65, 55, 8, 64]); shot(pg, 'c_house_0130_newmoon')
    at(2, 0, 45, [9.9, -1.0, 1.65, -55, 10, 72]); shot(pg, 'c_house_0045_fullmoon')
    E("window.FOVX = 2.2")
    for d, h, m, az, el, n in [(22, 22, 0, 215.3, 24.7, 'z_firstq'), (8, 6, 0, 159.0, 31.5, 'z_lastq'), (2, 0, 45, 156.9, 7.5, 'z_full'), (19, 21, 45, 0, 0, 'z_crescent')]:
        if n == 'z_crescent':
            at(d, h, m, [2.5, 12.0, 1.65, 0, 0, 60]); s = E("JSON.stringify(DN.state)"); st = json.loads(s); az, el = st['moonAz'], st['moonEl']; print('crescent', az, el, st['illum'])
        at(d, h, m, [2.5, 12.0, 30.0, az, el, 3]); shot(pg, n)
    E("window.FOVX = 0")
    E("document.querySelector('[data-light=\"night\"]').click()")
    for i in range(60):
        E("GAME.step(0.05)")
        if E("DN.ready()"): break
        time.sleep(0.3)
    E("GAME.view(-6.4, -3.8, 1.65, 55, 8, 64); GAME.step(0.2)"); shot(pg, 'c_b21')
    E("document.querySelector('[data-light=\"auto\"]').click()"); E("GAME.step(0.2)")
    print('\n'.join(errs[:20]) or 'no errors'); b.close()
