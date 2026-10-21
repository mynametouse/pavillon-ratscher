import os, base64
from playwright.sync_api import sync_playwright
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    ctx = b.new_context(viewport={'width': 390, 'height': 760}, is_mobile=True, has_touch=True, device_scale_factor=1)
    pg = ctx.new_page(); errs = []; pg.set_default_timeout(180000); pg.add_init_script("try{localStorage.setItem('pav-tier','schnell')}catch(e){}")
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.goto('http://localhost:8765/index.html?offline=1', timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded()", timeout=600000, polling=2000)
    pg.evaluate("try{localStorage.removeItem('pav-facade')}catch(e){}")
    print('facbtn visible', pg.is_visible('#facbtn'))
    pg.tap('#facbtn'); pg.wait_for_timeout(400)
    bb = pg.evaluate("(()=>{const r=document.getElementById('facade').getBoundingClientRect(); return [r.left,r.top,r.right,r.bottom, innerWidth, innerHeight, document.getElementById('facade').scrollHeight]})()")
    print('panel box', bb, 'buttons', pg.evaluate("document.querySelectorAll('#facade [data-fk]').length"))
    pg.screenshot(path=os.path.join(OUT, 'f_panel_phone.png'))
    pg.tap('#facade [data-ft="tower"][data-fk="red"]'); pg.tap('#facade [data-ft="house"][data-fk="silver"]'); pg.tap('#facade [data-ft="frame"][data-fk="black"]')
    print('state', pg.evaluate("FACADE.state()"), 'stored', pg.evaluate("localStorage.getItem('pav-facade')"))
    pg.tap('#facade .x'); pg.wait_for_timeout(300); print('closed', pg.evaluate("document.getElementById('facade').hidden"))
    pg.evaluate("document.querySelectorAll('.ov,#doorbtn,#joy,header,#ppanel,#talkbtn,#npcsub').forEach(e=>e.style.visibility='hidden')")
    for name, st, v in [('f_red_silver', None, [10.0, -4.0, 1.7, -52, 10, 72]), ('f_corten_white', {'tower': 'corten', 'house': 'white', 'frame': 'larch'}, [10.0, -4.0, 1.7, -52, 10, 72]),
                        ('f_green_larch', {'tower': 'zinc', 'house': 'green', 'frame': 'white'}, [-6.0, -5.0, 1.7, 40, 8, 70]),
                        ('f_anthr_larch', {'tower': 'anthr', 'house': 'larch', 'frame': 'black'}, [10.0, -4.0, 1.7, -52, 10, 72])]:
        if st:
            for k, val in st.items(): pg.evaluate(f"FACADE.apply('{k}','{val}')")
        pg.evaluate("GAME.setMode('day')"); pg.evaluate(f"GAME.view({','.join(map(str, v))})"); pg.evaluate("GAME.shot(); GAME.shot()")
        d = pg.evaluate("document.querySelector('#stage canvas').toDataURL('image/jpeg',0.85)"); open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name)
    pg.evaluate("FACADE.apply('tower','yakisugi'); FACADE.apply('house','yakisugi'); FACADE.apply('frame','larch')")
    print('reset', pg.evaluate("FACADE.state()"))
    print('errors', errs[:5]); b.close()
