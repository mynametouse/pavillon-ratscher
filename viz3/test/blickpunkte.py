# Model pictures from given viewpoints, for comparing the model with photos that stay outside the repo (Falko's garden photos are private:
# the comparison is made on the chat machine; CI only renders the model side, so the chat machine's single browser stays free).
#   python3 viz3/test/blickpunkte.py PORT [views.json]          (default: viz3/extra/blickpunkte/views.json)
# views.json: [{"name": "b01", "x": 4.6, "y": 11.3, "yaw": -58, "vfov": 62, "eye": 1.5, "pitch": 0, "w": 1024, "h": 768, "phase": 0,
#               "time": 13.5, "hideTrees": false}, ...] – x, y in model metres (x east, y north), yaw in degrees clockwise from north,
# vfov the vertical field of view (a 0.5× iPhone picture in landscape: ~74°, the 1× main camera: ~50°). Pictures: out/blickpunkte/<name>.jpg,
# plus <name>.json with the camera (to draw overlays). Groups by picture size and phase, one page load per group.
import sys, os, json, time, base64
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib

port = sys.argv[1]
SRC = sys.argv[2] if len(sys.argv) > 2 and sys.argv[2] else os.path.join(lib.ROOT, 'viz3', 'extra', 'blickpunkte', 'views.json')
OUT = lib.out('blickpunkte')
views = json.load(open(SRC if os.path.isabs(SRC) else os.path.join(lib.ROOT, SRC)))
groups = {}
for v in views: groups.setdefault((v.get('w', 1024), v.get('h', 768), v.get('phase', 0)), []).append(v)
errs, done = [], 0
with lib.browser() as b:
    for (W, H, ph), vs in groups.items():
        pg = lib.page(b, W, H, errs=errs, tier=os.environ.get('TIER', 'mittel')); E = pg.evaluate
        lib.boot(pg, port, f'?bauphase={ph}')
        E("GAME.setView3 && GAME.setView3(false)")
        E("document.querySelectorAll('#toast,#hud,#topbar,#minimap,#joy,.hud').forEach(e => e.style.visibility = 'hidden')")
        for v in vs:
            E(f"if (window.DN && !DN.active) GAME.setMode('auto'); CLOCK.t = Math.floor(CLOCK.t / 1440) * 1440 + {float(v.get('time', 13.5)) * 60}; DN.update(true)")
            lib.settle_light(pg)
            E(f"window.TREEG && (TREEG.visible = {'false' if v.get('hideTrees') else 'true'})")
            x, y, yaw, vf = v['x'], v['y'], v['yaw'], v.get('vfov', 60)
            E(f"window.FOVX = {vf}; GAME.view({x}, {y}, KERN.ground({x}, {y}) + {v.get('eye', 1.5)}, {yaw}, {v.get('pitch', 0)}, {vf}); for (let i = 0; i < 6; i++) GAME.step(0.25)")
            time.sleep(1.0); E("GAME.step(0.1)")
            d = E("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.86); })()")
            open(os.path.join(OUT, v['name'] + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1]))
            json.dump({**v, 'W': W, 'H': H}, open(os.path.join(OUT, v['name'] + '.json'), 'w'))
            done += 1; print('view', v['name'], flush=True)
        pg.close()
errs = [e for e in errs if 'Texture marked' not in e]
print('\n'.join(errs[:20]) or 'no errors')
ok = done == len(views) and not errs
print(('OK   ' if ok else 'FAIL ') + f'{done} of {len(views)} viewpoints rendered', f'{len(errs)} errors', flush=True)
print(f"{1 if ok else 0} ok, {0 if ok else 1} failed: {[] if ok else ['viewpoints rendered']}")
