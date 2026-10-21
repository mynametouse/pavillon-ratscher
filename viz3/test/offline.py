import os, sys, base64, time
from playwright.sync_api import sync_playwright
H = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(H, 'out')
target = sys.argv[1] if len(sys.argv) > 1 else 'file://' + os.path.abspath(os.path.join(H, '..', 'dist_standalone', 'pavillon-ratscher-offline.html'))
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1000, 'height': 620}); errs = []; reqs = []; fails = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.on('console', lambda m: errs.append(m.type + ' ' + m.text) if m.type == 'error' else None)
    pg.on('request', lambda r: reqs.append(r.url) if not r.url.startswith(('blob:', 'data:')) else None)
    pg.on('requestfailed', lambda r: fails.append(r.url[:120]))
    t0 = time.time(); pg.goto(target, timeout=300000, wait_until='domcontentloaded'); print('dom', round(time.time() - t0, 1), 's')
    pg.wait_for_function("window.GAME && GAME.loaded()", timeout=600000, polling=2000); print('loaded', round(time.time() - t0, 1), 's')
    pg.wait_for_timeout(4000)
    print('doctype', pg.evaluate("document.compatMode"), 'title', pg.evaluate("document.title"))
    print('non-blob requests', len(reqs), [u[:90] for u in reqs[:8]]); print('failed', fails[:8])
    print('sv on', pg.evaluate("typeof SV!=='undefined' ? SV.on.value : 'n/a'"))
    pg.evaluate("document.querySelectorAll('.ov,#doorbtn,#joy,#ppanel').forEach(e=>e.style.visibility='hidden')")
    pg.evaluate("GAME.setMode('gold')"); pg.evaluate("GAME.view(10.0,-4.0,1.7,-52,10,72)"); pg.evaluate("GAME.shot(); GAME.shot()")
    pg.screenshot(path=os.path.join(OUT, 'offline_page.jpg'), quality=80, type='jpeg', timeout=240000)
    pg.click('#tab-bilder'); pg.wait_for_timeout(800); pg.evaluate("GAME.pause && GAME.pause(true)"); pg.screenshot(path=os.path.join(OUT, 'offline_bilder.jpg'), quality=80, type='jpeg', timeout=240000)
    print('imgs ok', pg.evaluate("[...document.querySelectorAll('.shot img')].filter(i=>i.naturalWidth>0).length"), 'of', pg.evaluate("document.querySelectorAll('.shot img').length"))
    pg.click('#tab-film'); pg.wait_for_timeout(300); print('film panel', pg.evaluate("document.querySelector('#p-film .page').innerText.slice(0,200)"))
    print('errors', errs[:6]); b.close()
