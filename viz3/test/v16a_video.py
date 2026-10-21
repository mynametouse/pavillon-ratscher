# V16a: a day in Ratscher as a short film for the release note: 1 June, 4:00–23:50 every 10 game minutes, view from the south-east into the
# north-western evening sky (the sun sets there in June), frames labelled with the time → mp4 (H.264, 12 fps)
import sys, os, time, base64, subprocess
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw, ImageFont
port = sys.argv[1]; OUT = lib.out('v16a/video'); os.makedirs(OUT, exist_ok=True)
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
VIEW = sys.argv[2] if len(sys.argv) > 2 else '9.9,-1.0,1.65,-55,9,72'
T0, T1, ST = 4 * 60, 23 * 60 + 50, 10
try: FONT = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 22)
except Exception: FONT = None
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 960, 'height': 540}); lib.preset(pg, 'hoch'); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
    time.sleep(3); pg.evaluate("window.FREEZE = true"); E = lambda js: pg.evaluate(js)
    E("document.querySelectorAll('#toast,header,.ov,#doorbtn').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false, true)")
    k = 0
    for m in range(T0, T1 + 1, ST):
        E(f"CLOCK.t = {m}; GAME.view({VIEW}); DN.update(true)")
        for i in range(80):
            E("GAME.step(0.05)")
            if E("DN.ready()"): break
            time.sleep(0.3)
        E("DN.update(true); GAME.step(0.05)")
        d = E("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.92); })()")
        fn = os.path.join(OUT, 'f%03d.jpg' % k); open(fn, 'wb').write(base64.b64decode(d.split(',')[1])); k += 1
        im = Image.open(fn); dr = ImageDraw.Draw(im); lbl = E("CLOCK.hm() + ' Uhr · 1. Juni'"); dr.rounded_rectangle([16, 16, 232, 54], 10, fill=(18, 20, 24)); dr.text((28, 22), lbl, fill=(245, 240, 228), font=FONT); im.save(fn, quality=92)
        print(lbl, flush=True)
    print('\n'.join(errs[:20]) or 'no errors'); b.close()
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '12', '-i', os.path.join(OUT, 'f%03d.jpg'), '-vf', 'scale=960:-2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '21', '-movflags', '+faststart', os.path.join(OUT, '..', 'tag_in_ratscher.mp4')])
print('video done', k)
