import sys, json, base64, io
from playwright.sync_api import sync_playwright
from PIL import Image
urls = sys.argv[2].split(','); out = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']); pg = b.new_page(viewport={'width': 420, 'height': 540})
    pg.goto('http://localhost:8811/chars/rt.html'); pg.wait_for_function('window.ready', timeout=60000); ims = []
    for u in urls:
        r = pg.evaluate(f"dbg('{u}')"); print(u, json.dumps(r['out'])); print('  bm', json.dumps(r['bm'])[:400]); ims += [Image.open(io.BytesIO(base64.b64decode(s.split(',')[1]))).resize((200, 260)) for s in r['shots']]
    S = Image.new('RGB', (200 * len(ims), 260)); [S.paste(im, (i * 200, 0)) for i, im in enumerate(ims)]; S.save(out, quality=82); b.close()
