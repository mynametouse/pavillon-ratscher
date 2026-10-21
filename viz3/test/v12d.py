# V12b: interior style presets and new facade claddings – screenshots, errors, persistence, plan state
import sys, os, time, base64
from playwright.sync_api import sync_playwright
port = sys.argv[1] if len(sys.argv) > 1 else '8765'
OUT = '/tmp/claude-0/-home-claude/c5ba8437-b351-5b29-96e3-f852e8e82b48/scratchpad/v12'
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 960, 'height': 600}); pg.set_default_timeout(180000); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.goto(f'http://localhost:{port}/index.html?offline=1', timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=900000, polling=1000); pg.evaluate("window.NPC && (NPC.update = () => {})"); time.sleep(4)
    pg.click('#intbtn'); time.sleep(0.5); print('panel rows', pg.evaluate("[...document.querySelectorAll('#interior [data-st]')].map(r => r.dataset.st + ':' + r.children.length).join(' ')"))
    pg.click('#interior .x'); time.sleep(0.3)
    pg.evaluate("document.querySelectorAll('.ov,#doorbtn,#joy,header,#ppanel,#talkbtn,#npcsub,#toast').forEach(e=>e.style.visibility='hidden')")
    def shot(name):
        pg.evaluate("GAME.shot()"); pg.evaluate("GAME.shot()"); d = pg.evaluate("document.querySelector('#stage canvas').toDataURL('image/jpeg',0.86)")
        open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1]))
    pg.evaluate("GAME.view(3.4, 0.6, 1.62, -50, -12)"); time.sleep(1)
    for k in ['natur', 'nord', 'japan', 'club', 'loft']:
        pg.evaluate(f"STYLE.setStyle('{k}')"); shot('style_' + k); print('style', k, pg.evaluate("JSON.stringify(STYLE.state())"), flush=True)
    pg.evaluate("GAME.view(12.5, -6.5, 1.65, -55, 4)"); time.sleep(1)
    for k in ['shingle', 'lap', 'fibre', 'copper', 'lime', 'yakisugi']:
        pg.evaluate(f"FACADE.apply('house', '{k}')"); shot('fac_' + k); print('facade', k, flush=True)
    print('plan style', pg.evaluate("JSON.stringify(SITEPLAN.fullState().style)"), '| stored', pg.evaluate("localStorage.getItem('pav-style')"))
    print('errors', errs[:8]); b.close()
