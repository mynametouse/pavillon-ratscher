# V16a: a day as a time-lapse from one place (frames every N game minutes) → mp4 and a contact sheet; shows whether the light blends without jumps
import sys, os, time, base64, subprocess
import sys as _sys, os as _os; _sys.path.insert(0, _os.path.dirname(_os.path.abspath(__file__))); import lib
from playwright.sync_api import sync_playwright
from PIL import Image, ImageDraw
port = sys.argv[1]; day = int(sys.argv[2]); t0m = int(sys.argv[3]); t1m = int(sys.argv[4]); stepm = int(sys.argv[5]); view = sys.argv[6] if len(sys.argv) > 6 else '2.0,-9.0,1.65,0,6,70'
name = sys.argv[7] if len(sys.argv) > 7 else 'lapse'
OUT = lib.out('v16a/' + name)
for f in os.listdir(OUT): os.remove(os.path.join(OUT, f))
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 960, 'height': 540}); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGEERR ' + str(e))); pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.goto(f'http://localhost:{port}/index.html', timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded && GAME.loaded()", timeout=1500000, polling=2000)
    time.sleep(3); pg.evaluate("window.FREEZE = true"); E = lambda js: pg.evaluate(js)
    E("document.querySelectorAll('#toast,header,.ov,#doorbtn').forEach(e => e.style.visibility = 'hidden'); GAME.setView3(false, true)")
    frames = []; k = 0
    for m in range(t0m, t1m + 1, stepm):
        E(f"CLOCK.t = {(day - 1) * 1440 + m}; GAME.view({view}); DN.update(true)")
        for i in range(80):
            E("GAME.step(0.05)")
            if E("DN.ready()"): break
            time.sleep(0.3)
        E("DN.update(true); GAME.step(0.05)")
        d = E("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/jpeg', 0.9); })()")
        fn = os.path.join(OUT, 'f%03d.jpg' % k); open(fn, 'wb').write(base64.b64decode(d.split(',')[1])); k += 1
        im = Image.open(fn); dr = ImageDraw.Draw(im); lbl = E("CLOCK.hm() + ' · ' + DN.dateStr()"); dr.rectangle([8, 8, 190, 34], fill=(0, 0, 0)); dr.text((14, 14), lbl, fill=(255, 255, 255)); im.save(fn, quality=90)
        frames.append((fn, lbl)); print(lbl, E("JSON.stringify(Object.assign({ el: +DN.state.sunEl.toFixed(1) }, DN.dbg()))"), flush=True)
    print('\n'.join(errs[:20]) or 'no errors'); b.close()
subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-framerate', '6', '-i', os.path.join(OUT, 'f%03d.jpg'), '-vf', 'scale=960:-2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '23', os.path.join(OUT, '..', name + '.mp4')])
cols = 6; th = [Image.open(f).resize((320, 180)) for f, _ in frames]; rows = (len(th) + cols - 1) // cols
sheet = Image.new('RGB', (cols * 320, rows * 180)); [sheet.paste(t, ((i % cols) * 320, (i // cols) * 180)) for i, t in enumerate(th)]; sheet.save(os.path.join(OUT, '..', name + '_sheet.jpg'), quality=85)
print('done', len(frames))
