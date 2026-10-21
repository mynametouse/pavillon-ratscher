import time, json, math
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 480, 'height': 320}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.goto('http://localhost:8765/index.html?offline=1', timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded()", timeout=600000, polling=2000)
    E = lambda js: pg.evaluate(js)
    def at(x, y, z, yaw): E(f"(()=>{{const P=GAME.P; P.mode='walk'; P.x={x}; P.y={y}; P.feet={z}; P.vz=0; P.yaw={yaw}; P.pitch=0;}})()")
    def walk(secs, yaw=None):
        if yaw is not None: E(f"GAME.P.yaw={yaw}")
        return E(f"GAME.sim(1,0,0,{secs})")
    def door(k, v=True): E(f"GAME.setDoorNow('{k}', {str(v).lower()})")
    G = E("window.GEO"); SC = G['SC']
    E("""window.__climb = (secs, r0) => { const SC = GEO.SC; let out = []; for (let t = 0; t < secs; t += 0.05) { const P = GAME.P; const dx = P.x - SC[0], dy = P.y - SC[1]; const r = Math.hypot(dx, dy), phi = Math.atan2(dy, dx);
        const dir = phi + Math.PI / 2 + Math.max(-0.6, Math.min(0.6, (r - r0) * 1.5)); P.yaw = 90 - dir * 180 / Math.PI; GAME.sim(1, 0, 0, 0.05); }
        const P = GAME.P; return { x: +P.x.toFixed(2), y: +P.y.toFixed(2), feet: +P.feet.toFixed(2), where: GAME.sim(0,0,0,0.05).where }; }""")
    print('GEO', {k: G[k] for k in ['zF', 'zO', 'zD', 'zT0', 'zTH']}, 'TW', G['TW'], 'SC', SC, 'PASS', G['PASS'], 'DOORY', G['DOORY'])
    print('doors', E("Object.keys(GAME.DOOR||{})"))
    dy = sum(G['DOORY']) / 2
    # yaw: 0 = north (+y), 90 = east, 180 = south, -90 = west
    at(8.0, dy, 0, -90); print('tower door closed:', walk(2.0))
    door('tower'); at(8.0, dy, 0, -90); print('tower door open -> passage:', walk(1.6))
    print('library door closed:', walk(2.0)); door('eg'); print('library door open -> library:', walk(1.8))
    print(' to window seat:', walk(2.0, -110))
    # spiral: from the passage south into the NE quadrant, onto tread 1 (front edge at the north), one turn up to the OG landing
    at(SC[0] + 0.45, G['PASS']['y0'] + 0.3, G['zT0'], 180); print('into NE quadrant:', walk(0.5))
    print('climb A (1 turn):', E("__climb(9.0, 0.6)"))
    r = E("(()=>{ const P=GAME.P; return [P.x, P.y, P.feet]; })()"); print('on landing feet', r[2])
    at(SC[0] + 0.3, G['PASS']['y0'] + 0.35, G['zO'], -90); print('landing -> OG door closed:', walk(2.0)); door('ogE'); at(SC[0] + 0.3, G['PASS']['y0'] + 0.35, G['zO'], -90); print('OG door open -> work room:', walk(2.4))
    at(SC[0] + 0.25, G['PASS']['y0'] - 0.25, G['zO'], -90); print('climb B (1 turn):', E("__climb(9.5, 0.6)"))
    at(SC[0] + 0.4, dy, G['zD'], -90); print('head door closed:', walk(2.0)); door('box'); at(SC[0] + 0.4, dy, G['zD'], -90); print('head door open -> terrace:', walk(2.5)); print('terrace west:', walk(3.0))
    # head: stairwell rail stops a fall
    at(SC[0] - 0.4, dy, G['zD'], 180); print('head rail over the stairwell:', walk(1.5))
    at(SC[0] + 0.8, dy, G['zO'], 180); print('landing rail east:', walk(1.5))
    # OG walls, terrace rail
    at(1.0, 2.0, G['zO'], -90); print('glass W:', walk(3.0)); at(1.0, 2.0, G['zO'], 0); print('band N:', walk(3.0))
    at(2.0, 2.0, G['zD'], -90); print('terrace rail W:', walk(4.0)); at(2.0, 4.0, G['zD'], 90); print('terrace east strip:', walk(3.0))
    # EG/OG walkways
    at(3.3, dy, G['zF'], -90); print('eg door -> stove zone:', walk(2.0)); at(0.9, 1.5, G['zF'], 0); print('eg west passage:', walk(1.5))
    at(3.3, dy, G['zO'], -125); print('og door -> desk:', walk(2.6)); at(3.3, dy, G['zO'], 0); print('og door -> piano:', walk(1.5, -60))
    # site buildings
    at(-1.0, 11.5, 0, 0); print('carport/caravan from S:', walk(3.0)); at(-0.9, 17.3, 0, 180); print('caravan door closed (from N):', walk(2.0))
    at(8.5, -3.5, 0, 90); print('holzhaus from W:', walk(3.0)); at(9.5, -0.6, 0, 90); print('greenhouse from W:', walk(3.0)); at(8.6, 20.5, 0, 180); print('bungalow from N:', walk(3.0)); at(10.0, 3.3, 0, 90); print('washhouse from W:', walk(3.0))
    at(17.0, -1.5, 0, 90); print('paddock gate gap:', walk(3.5)); at(17.0, 3.7, 0, 90); print('paddock fence:', walk(3.5)); at(-10.5, 26.7, 0, -90); print('tractor:', walk(4.0))
    E("GAME.setCollide(false)"); at(1.0, 2.0, G['zO'], -90); print('ghost through glass:', walk(2.5))
    print('errors', errs[:8]); b.close()
