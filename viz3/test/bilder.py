import sys, time, base64, json, os
from playwright.sync_api import sync_playwright
# 12 final images for the Bilder tab (new design: tower east, OG cantilever, west glass)
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'dist', 'img'); os.makedirs(OUT, exist_ok=True)
G = None
VIEWS = [
  ('01', 'day',  'walk',  [3.4, 15.8, 1.65, None, 4, 64]),           # arrival from the garden gate, between carport and bungalow
  ('02', 'day',  'walk',  [-5.8, -5.2, 1.65, None, 8, 66]),           # from SW: west glass + tower behind
  ('03', 'day',  'walk',  [9.9, -1.0, 1.65, -55, 12, 72]),           # from SE: tower entrance, Holzhaus + greenhouse
  ('04', 'dusk', 'walk',  [-6.4, -3.8, 1.65, None, 8, 64]),           # evening lantern from SW
  ('05', 'day',  'orbit', [205, 50, 30, [4.5, 5.0, 2.0]]),           # bird's eye
  ('06', 'gold', 'walk',  [6.15, 3.12, 'zT0', -128, 20, 80]),         # inside the tower: spiral stair
  ('07', 'gold', 'walk',  [3.35, 3.05, 'zF', -110, -8, 76]),          # library from the door: window seat, stove, daybed
  ('08', 'gold', 'walk',  [0.95, 1.45, 'zF', 52, -6, 76]),            # library: reading chair + bookcase + door
  ('09', 'gold', 'walk',  [2.9, 2.7, 'zO', -150, -10, 76]),           # OG: desk under the south band
  ('10', 'gold', 'walk',  [3.1, 0.55, 'zO', -50, -6, 78]),            # OG: lounge + music corner
  ('11', 'gold', 'walk',  [4.35, 3.1, 'zD', -122, -6, 72]),           # roof: terrace seen from the tower head door
  ('12', 'gold', 'walk',  [1.0, 2.2, 'zD', -92, 0, 64]),              # roof: view west
]
# variant B (no tower, ladder stairs): files b01 … b13
VIEWS_B = [
  ('b01', 'day',  'walk',  [3.4, 15.8, 1.65, None, 4, 64]),
  ('b02', 'day',  'walk',  [-5.8, -5.2, 1.65, None, 8, 66]),
  ('b03', 'day',  'walk',  [9.0, -0.6, 1.65, -58, 10, 72]),           # from SE: front door under the east cantilever
  ('b04', 'dusk', 'walk',  [-6.4, -3.8, 1.65, None, 8, 64]),
  ('b05', 'day',  'orbit', [205, 50, 30, [4.5, 5.0, 2.0]]),
  ('b06', 'gold', 'walk',  [3.32, 2.62, 'zF', 180, 26, 80]),          # library: ladder up through the open trapdoor
  ('b07', 'gold', 'walk',  [3.35, 3.05, 'zF', -110, -8, 76]),
  ('b08', 'gold', 'walk',  [0.95, 1.45, 'zF', 52, -6, 76]),
  ('b09', 'gold', 'walk',  [2.9, 2.7, 'zO', -150, -10, 76]),
  ('b10', 'gold', 'walk',  [2.45, 0.15, 'zO', -48, -6, 78]),
  ('b11', 'gold', 'walk',  [1.0, -0.1, 'zO', 58, -12, 80]),           # OG: open trapdoor with rails, roof ladder behind
  ('b12', 'gold', 'walk',  [4.25, 4.35, 'zD', -122, -6, 72]),         # roof: terrace seen from the hatch exit
  ('b13', 'gold', 'walk',  [1.0, 2.2, 'zD', -92, 0, 64]),
  ('b14', 'day',  'walk',  [3.48, 29.74, 1.71, -176.9, -1, 68]),     # V11: arrival over the bridge
  ('b15', 'gold', 'walk',  [8.25, 22.58, 1.65, -50.0, -14, 66]),     # stream with bridge from the east bank
  ('b16', 'gold', 'walk',  [5.11, 26.33, 0.33, -63.0, 2, 72]),        # at the water on the east landing
  ('b17', 'gold', 'walk',  [2.5, -30.0, 1.65, -155.3, -2, 64]),       # workshop from the garden
  ('b18', 'gold', 'walk',  [-2.2, -37.0, 1.65, 190, -14, 74]),        # inside the workshop
  ('b19', 'gold', 'walk',  [1.7, -27.2, 1.65, 216, -15, 66]),          # band sawmill outside (V15b)
  ('b20', 'day',  'walk',  [17.6, 0.2, 1.65, 285, -3, 70]),          # fence and gate towards Ronald
  ('b21', 'night', 'walk', [-6.4, -3.8, 1.65, 55, 8, 64]),          # V16a: full-moon night (27 Aug, 23:30), moonlight from the SSE
  ('b22', 'gold', 'veh',   ['car', 108.0, -93.0, 116, 8.5, 3.2, 1.55, 58, '']),   # V16b: with the car through Ratscher (Anger)
  ('b23', 'gold', 'veh',   ['tractor', None, None, None, 9.5, -4.5, 1.7, 60, "VEH.by.tractor.model.load([0.25, 0.3])"]),   # V16b: the tractor at the Untere Klinge, fork raised
]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 1280, 'height': 720}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e)))
    pg.goto('http://localhost:%s/index.html?offline=1' % os.environ.get('PORT', '8765'), timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded()", timeout=600000, polling=2000)
    try: pg.wait_for_function("!window.CHARMAN || (window.NPC && NPC.real && (NPC.real.ready || NPC.real.failed))", timeout=600000, polling=1000)
    except Exception as e: print('figures not ready', e)
    pg.evaluate("document.querySelectorAll('.ov,#doorbtn,#joy,header,#ppanel').forEach(e=>e.style.visibility='hidden')")
    VAR = 'B' if (len(sys.argv) > 2 and sys.argv[2] == 'B') else 'A'
    pg.evaluate(f"GAME.setVariant('{VAR}')"); pg.evaluate("document.querySelectorAll('#toast').forEach(e=>e.style.visibility='hidden')")
    G = pg.evaluate("window.GEO"); pg.evaluate("GAME.setPhase(GAME.PHASES.length-1)")
    try: pg.evaluate("GAME.setView3 && GAME.setView3(false, true)")   # the gallery shows the place, not the player figure
    except Exception as e: print('view', e)
    try: pg.evaluate("GAME.setQuality && GAME.setQuality(true)")
    except Exception as e: print('quality', e)
    only = sys.argv[1].split(',') if len(sys.argv) > 1 and sys.argv[1] != 'all' else None
    for name, mode, kind, a in (VIEWS_B if VAR == 'B' else VIEWS):
        if only and name not in only: continue
        pg.evaluate(f"GAME.setMode('{mode}')")
        if mode in ('night', 'auto'): pg.wait_for_function("window.DN && DN.ready()", timeout=300000, polling=500); time.sleep(1.5)
        if kind == 'orbit': pg.evaluate(f"GAME.orbit({a[0]},{a[1]},{a[2]},{json.dumps(a[3])})")
        elif kind == 'veh':   # V16b: a vehicle placed on the road (or at its home), the camera ahead of it to the side, looking back at it
            vid, x, y, psi, dist, side, hgt, fov, js = a
            if x is not None: pg.evaluate(f"VEH.place('{vid}', {x}, {y}, {psi} * Math.PI / 180)")
            if js: pg.evaluate(js)
            pg.evaluate(f"""(() => {{ const v = VEH.by['{vid}'], s = v.st, f = [Math.sin(s.psi), Math.cos(s.psi)], l = [-Math.cos(s.psi), Math.sin(s.psi)], c = VEH.toW(v, 0, v.spec.box.cy);
              const cx = c[0] + f[0] * {dist} + l[0] * {side}, cy = c[1] + f[1] * {dist} + l[1] * {side}, cz = ROADS.groundAt(cx, cy) + {hgt};
              GAME.view(cx, cy, cz, Math.atan2(c[0] - cx, c[1] - cy) * 180 / Math.PI, Math.atan2(s.z + 0.8 - cz, Math.hypot(c[0] - cx, c[1] - cy)) * 180 / Math.PI, {fov}); }})()""")
            time.sleep(1.5)
        else:
            x, y, z, yaw, pitch, fov = a
            if isinstance(z, str): z = G[z] + 1.65
            pg.evaluate("GAME.doorsAll(true)")
            if VAR == 'B' and name in ('b02', 'b03', 'b04'): pg.evaluate("GAME.setDoorNow('eg', false)")
            if yaw is None:  # look at house centre
                import math; yaw = math.degrees(math.atan2(2.0 - x, 2.2 - y))
            pg.evaluate(f"GAME.view({x},{y},{z},{yaw},{pitch},{fov})")
        time.sleep(0.3); t = time.time(); pg.evaluate("GAME.shot()"); pg.evaluate("GAME.shot()")
        d = pg.evaluate("document.querySelector('#stage canvas').toDataURL('image/jpeg',0.9)")
        open(os.path.join(OUT, name + '.jpg'), 'wb').write(base64.b64decode(d.split(',')[1])); print('shot', name, round(time.time() - t, 1), 's', flush=True)
    print('errors', errs[:6]); b.close()
