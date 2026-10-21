# python3 rt.py SRC TGT CLIPINDEX NAME OUTJSON SHEET
import sys, json, base64, io
from playwright.sync_api import sync_playwright
from PIL import Image
src, tgt, ci, name, out, sheet = sys.argv[1:7]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']); pg = b.new_page(viewport={'width': 420, 'height': 540}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('http://localhost:8811/chars/rt.html'); pg.wait_for_function('window.ready', timeout=60000)
    r = pg.evaluate(f"RT('{src}', '{tgt}', {ci}, '{name}', [0, 0.125, 0.25, 0.375, 0.5, 0.625])")
    open(out, 'w').write(json.dumps({'clip': json.loads(r['json']), 'stand': json.loads(r['stand']), 'speed': r['speed'], 'hip': r['hip']})); print(name, 'speed', round(r['speed'], 4), 'hip', round(r['hip'], 4), 'k', round(r['k'], 4), 'mapped', r['mapped'], 'tracks', r['tracks'], 'dur', r['dur'], 'errors', errs[:3])
    ims = [Image.open(io.BytesIO(base64.b64decode(s.split(',')[1]))).resize((200, 260)) for s in r['shots']]
    S = Image.new('RGB', (200 * 6, 260 * 2)); [S.paste(im, ((i // 2) * 200, (i % 2) * 260)) for i, im in enumerate(ims)]; S.save(sheet, quality=82); b.close()
