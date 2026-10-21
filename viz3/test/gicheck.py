# GI check: same views with and without the baked light. python3 gicheck.py PORT PREFIX MODE [variant]
import sys, os, time, base64
from playwright.sync_api import sync_playwright
port, prefix, MODE = sys.argv[1], sys.argv[2], sys.argv[3]; VAR = sys.argv[4] if len(sys.argv) > 4 else 'B'
OUT = '/tmp/claude-0/-home-claude/c5ba8437-b351-5b29-96e3-f852e8e82b48/scratchpad/real'
VIEWS = [('bib', "GAME.go('bibliothek')"), ('og', "GAME.go('arbeitsraum')"), ('lounge', "GAME.go('lounge')"), ('aussen', "GAME.view(9.5, -5.5, 1.62, -58, 6, 66)"), ('west', "GAME.view(-5.8, -5.2, 1.65, 40, 8, 66)")]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    for tag, q in (('gi', ''), ('nogi', '&nogi=1')):
        pg = b.new_page(viewport={'width': 960, 'height': 600}); errs = []
        pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
        pg.add_init_script("try{localStorage.setItem('pav-variant','%s')}catch(e){}" % VAR)
        pg.goto(f'http://localhost:{port}/index.html?offline=1&lowfig=1' + q, timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
        pg.evaluate("document.querySelectorAll('.ov,#doorbtn,#joy,header,#ppanel,#talkbtn,#npcsub,#toast').forEach(e=>e.style.visibility='hidden')")
        pg.evaluate(f"GAME.setMode('{MODE}'); GAME.setPhase(GAME.PHASES.length-1)"); time.sleep(4)
        print(tag, 'GI on', pg.evaluate("window.GI ? GI.on.value : 'n/a'"), flush=True)
        for name, js in VIEWS:
            pg.evaluate(js); time.sleep(0.5); pg.evaluate("GAME.shot()"); pg.evaluate("GAME.shot()")
            d = pg.evaluate("document.querySelector('#stage canvas').toDataURL('image/jpeg',0.88)"); open(os.path.join(OUT, f'{prefix}_{tag}_{name}.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', tag, name, flush=True)
        print('errors', errs[:5]); pg.close()
    b.close()
