"""Shared helpers for the browser tests (Playwright + Chromium/SwiftShader, see docs/WORKFLOW.md).

    import lib; out = lib.out('v16a')                 # <repo>/out/v16a, created
    with lib.browser() as b: pg = lib.page(b, 1000, 600); lib.boot(pg, port)
    lib.shot(pg, out, 'name')                          # renders one full frame (GAME.shot) → out/name.jpg
Port: first CLI argument of every test (test server: bash tools/csp/start8951.sh → 8951).
"""
import os, time, base64, contextlib
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
ARGS = ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required']

def out(name):
    d = os.path.join(ROOT, 'out', name); os.makedirs(d, exist_ok=True); return d

@contextlib.contextmanager
def browser():
    from playwright.sync_api import sync_playwright
    with sync_playwright() as p:
        b = p.chromium.launch(args=ARGS)
        try: yield b
        finally: b.close()

def page(b, w=1000, h=640, errs=None, **kw):
    pg = b.new_page(viewport={'width': w, 'height': h}, **kw)
    if errs is not None:
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    return pg

def boot(pg, port, query='', freeze=True, figures=False):
    """Load the page and wait until the model is ready (SwiftShader: several minutes). freeze: stop the frame loop (tests step with GAME.step)."""
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html{query}', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
    if figures: pg.wait_for_function("!window.AVATAR || AVATAR.ready || AVATAR.failed", timeout=900000, polling=1000)
    time.sleep(3)
    if freeze: pg.evaluate("window.FREEZE = true")
    print('loaded', round(time.time() - t0), 's', flush=True)

def shot(pg, d, name, q=0.88):
    data = pg.evaluate(f"(() => {{ GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', {q}); }})()")
    open(os.path.join(d, name + '.jpg'), 'wb').write(base64.b64decode(data.split(',')[1])); print('shot', name, flush=True)

def settle_light(pg, tries=80):
    """After changing the clock or the light mode: wait until the day/night textures (sky, image light, baked GI mix) are there."""
    for i in range(tries):
        pg.evaluate("GAME.step(0.05)")
        if pg.evaluate("!window.DN || !DN.active || DN.ready()"): break
        time.sleep(0.3)
    pg.evaluate("window.DN && DN.active && DN.update(true); GAME.step(0.05)")
