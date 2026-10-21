import sys, json, base64, io
from playwright.sync_api import sync_playwright
from PIL import Image
kind, opts, n, dt, speed, mode, graze, cams, out = sys.argv[1], sys.argv[2], int(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5]), sys.argv[6], int(sys.argv[7]), sys.argv[8], sys.argv[9]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']); pg = b.new_page(viewport={'width': 500, 'height': 500}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://localhost:8811/chars/figtest.html'); pg.wait_for_function('window.ready', timeout=60000)
    pg.evaluate(f"makeFig('{kind}', {opts})")
    r = pg.evaluate(f"sim({n}, {dt}, {speed}, '{mode}', {graze}, {cams})")
    t = r['tilt']; print('tilt min/max', (min(t), max(t)) if t else None, 'errors', errs[:3])
    ims = [Image.open(io.BytesIO(base64.b64decode(s.split(',')[1]))).resize((240, 240)) for s in r['shots']]
    S = Image.new('RGB', (240 * min(6, len(ims)), 240 * ((len(ims) + 5) // 6))); [S.paste(im, ((i % 6) * 240, (i // 6) * 240)) for i, im in enumerate(ims)]; S.save(out, quality=82); b.close()
