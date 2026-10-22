# smoke test of a build: loads, no page errors, the game layers exist
import sys, time
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
from playwright.sync_api import sync_playwright
port = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1000, 'height': 640}); lib.preset(pg); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); print('loaded', round(time.time() - t0), 's', flush=True)
    time.sleep(3)
    print(pg.evaluate("JSON.stringify({werk: !!(window.WERK && WERK.on), rack: WERK.RACK.items.length, clock: CLOCK.fmt(CLOCK.t), gear: !!window.GEAR, wui: !!window.WUI, acts: PLAY.acts().filter(a => a.id.startsWith('werk:')).length, things: Object.keys(PLAY.things).length})"), flush=True)
    pg.evaluate("GAME.go('werkstatt'); GAME.step(0.5)")
    print('labels', pg.evaluate("PLAY.acts().filter(a => a.id.startsWith('werk:')).map(a => { try { return a.id + '=' + a.label(); } catch (e) { return a.id + ' ERR ' + e.message; } }).join(' | ')"), flush=True)
    ok, r = lib.check_gl(pg); print(('OK   ' if ok else 'FAIL ') + 'textures per shader ≤ 16', f"max fragment {r['maxFrag']}, vertex {r['maxVert']}, programs {r['programs']}", r['bad'][:5], r['broken'][:5], flush=True)
    print('\n'.join(errs[:20]) or 'no errors', flush=True); b.close()
