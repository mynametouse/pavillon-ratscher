# Ratscher surroundings: boot under the artifact CSP, errors, geo state, views (plan view at several zooms, map, model view, walk views)
import sys, os, time, base64, json
from playwright.sync_api import sync_playwright
port = sys.argv[1]; OUT = '/tmp/claude-0/-home-claude/c5ba8437-b351-5b29-96e3-f852e8e82b48/scratchpad/geoshots'; os.makedirs(OUT, exist_ok=True)
only = sys.argv[2].split(',') if len(sys.argv) > 2 else None
def shot(pg, name, ui=False):
    if ui: pg.evaluate("GAME.shot()"); pg.screenshot(path=os.path.join(OUT, name + '.png'), timeout=240000); print('ui', name, flush=True); return
    d = pg.evaluate("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.86); })()"); open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, flush=True)
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1100, 'height': 640}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.type + ' ' + m.text) if m.type in ('error', 'warning') else None); pg.on('response', lambda r: errs.append('HTTP %d %s' % (r.status, r.url)) if r.status >= 400 else None)
    t0 = time.time(); pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded')
    pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000); print('loaded', round(time.time() - t0), 's', flush=True)
    time.sleep(1); pg.evaluate("window.FREEZE = true")
    print('geo', pg.evaluate("JSON.stringify({ on: RATSCHER.on, ready: RATSCHER.ready, meshes: RATSCHER.meshes.length, trees: RATSCHER.trees.length, mid: RATSCHER.mid.length, bld: RATSCHER.bld.length, water: RATSCHER.water.length, fog: scene.fog.type || scene.fog.constructor.name, far: GAME.cam.far, progs: GAME.R.info.programs.length, tris: GAME.R.info.render.triangles, calls: GAME.R.info.render.calls })".replace('scene.', 'GAME.scene.')), flush=True)
    print('errors so far', [e for e in errs if 'Texture marked' not in e][:12], flush=True)
    def want(n): return not only or n in only
    if want('top'):
        pg.evaluate("GAME.go('draufsicht'); GAME.P.tx = 2; GAME.P.ty = 2; GAME.P.th = 110; GAME.step(0.1)"); shot(pg, 't_110', ui=True)
        pg.evaluate("GAME.P.tx = 60; GAME.P.ty = -40; GAME.P.th = 420; GAME.step(0.1)"); shot(pg, 't_420', ui=True)
        pg.evaluate("GAME.P.tx = 160; GAME.P.ty = -120; GAME.P.th = 1500; GAME.step(0.1)"); shot(pg, 't_1500', ui=True)
        pg.evaluate("GAME.P.tx = 0; GAME.P.ty = 0; GAME.P.th = 8000; GAME.step(0.1)"); shot(pg, 't_8000', ui=True)
        pg.evaluate("RATSCHER.setMap(true)"); pg.wait_for_function("RATSCHER.mapTex && RATSCHER.mapTex.near && RATSCHER.mapTex.inner && RATSCHER.mapTex.outer", timeout=120000)
        pg.evaluate("GAME.P.tx = 160; GAME.P.ty = -120; GAME.P.th = 1500; GAME.step(0.1)"); shot(pg, 't_map_1500', ui=True)
        pg.evaluate("GAME.P.tx = 0; GAME.P.ty = 0; GAME.P.th = 6000; GAME.step(0.1)"); shot(pg, 't_map_6000', ui=True)
        pg.evaluate("RATSCHER.setMap(false)")
    if want('model'):
        pg.evaluate("GAME.go('modell'); GAME.step(0.1)"); shot(pg, 'm_default')
        pg.evaluate("GAME.orbit(150, 24, 70, [2, 2, 3])"); shot(pg, 'm_se_70')
        pg.evaluate("GAME.orbit(300, 12, 70, [2, 2, 3])"); shot(pg, 'm_nw_70')
    if want('walk'):
        for (nm, yaw, pitch) in (('w_se_village', 135, 1), ('w_sw_hills', 220, 2), ('w_n_field', 10, 1), ('w_e', 85, 1), ('w_w_hubert', 275, 1)):
            pg.evaluate(f"GAME.view(3.6, 15.2, 1.62, {yaw}, {pitch}); GAME.step(0.05)"); shot(pg, nm)
        pg.evaluate("GAME.view(14, -40, 1.62, 140, 0); GAME.step(0.05)"); shot(pg, 'w_south_edge')
        for m in ('day', 'dusk'):
            pg.evaluate(f"GAME.setMode('{m}'); GAME.view(3.6, 15.2, 1.62, 135, 1); GAME.step(0.05)"); shot(pg, 'w_se_' + m)
        pg.evaluate("GAME.setMode('gold')")
    if want('village'):
        pg.evaluate("GAME.orbit(200, 22, 70, [296, -235, 4])"); shot(pg, 'v_orbit_ssw')
        pg.evaluate("GAME.orbit(40, 30, 70, [296, -235, 4])"); shot(pg, 'v_orbit_ne')
        pg.evaluate("GAME.orbit(120, 18, 70, [-20, -95, 4])"); shot(pg, 'v_farm')
        for (nm, x, y, yaw) in (('v_street_s', 292, -170, 170), ('v_street_e', 250, -228, 95), ('v_street_w', 345, -262, 290)):
            pg.evaluate(f"(() => {{ const z = RATSCHER.hAt({x}, {y}) + 1.7; GAME.view({x}, {y}, z, {yaw}, 2); }})()"); shot(pg, nm)
        pg.evaluate("GAME.orbit(150, 8, 70, [2, 2, 3])"); shot(pg, 'v_from_garden_low')
    print('perf', pg.evaluate("JSON.stringify(GAME.perf())"), flush=True)
    print('errors', [e for e in errs if 'Texture marked' not in e][:20], flush=True); b.close()
