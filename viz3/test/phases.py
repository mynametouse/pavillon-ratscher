import sys, time, base64, json, os
from playwright.sync_api import sync_playwright
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out'); os.makedirs(OUT, exist_ok=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 720, 'height': 405}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append(m.type + ': ' + m.text) if m.type == 'error' and '404' not in m.text else None)
    pg.goto('http://localhost:8765/index.html?offline=1', timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded()", timeout=600000, polling=2000)
    print('loaded', pg.evaluate("JSON.stringify(GAME.MERGED)"), 'col', pg.evaluate("GAME.COL.length"), 'walk', pg.evaluate("GAME.WALK.length"))
    pg.evaluate("document.querySelectorAll('.ov,#doorbtn,#joy,header,#ppanel').forEach(e=>e.style.visibility='hidden')")
    pg.evaluate("GAME.setMode('day')")
    phases = json.loads(sys.argv[1]) if len(sys.argv) > 1 else list(range(31))
    for ph in phases:
        pg.evaluate(f"GAME.setPhase({ph})"); pg.evaluate("GAME.orbit(215, 22, 13, [2,2,3.0])"); time.sleep(0.3); t1 = time.time()
        pg.evaluate("GAME.shot()"); pg.evaluate("GAME.shot()")
        d = pg.evaluate("document.querySelector('#stage canvas').toDataURL('image/jpeg',0.88)")
        fn = os.path.join(OUT, f'ph{ph:02d}.jpg'); open(fn, 'wb').write(base64.b64decode(d.split(',')[1])); print('phase', ph, round(time.time() - t1, 1), 's', pg.evaluate("GAME.phase()"))
    print('errors', errs[:10])
    b.close()
