# V16b6: textures at half size on phones. Loads the model twice on the desktop – ?tex=full and ?tex=half – and takes the same pictures:
# the halved images must look the same apart from a little blur (wrong orientation or colour of a halved texture – e.g. a glTF image drawn
# into a canvas – would show as a big difference), and they must actually be halved (count, megabytes saved). Pictures: out/texhalf/.
#   python3 viz3/test/texhalf.py 8951   (~5 min)
import sys, os, json, time, base64, io
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
from PIL import Image, ImageChops, ImageStat
port = sys.argv[1]; ok = []; fails = []; OUT = lib.out('texhalf')
def check(name, cond, info=''):
    (ok if cond else fails).append(name); print(('OK   ' if cond else 'FAIL ') + name, info, flush=True)
VIEWS = [('pavilion', "GAME.orbit(-35, 16, 24)"),
         ('garden', "GAME.view(-14, 10, GAME.floorAt ? 1.7 : 1.7, 205, -4, 62)"),
         ('forest', "GAME.view(-520, -640, ROADS.groundAt(-520, -640) + 1.7, 60, 8, 62)")]
def shots(query):
    with lib.browser() as b:
        errs = []; pg = lib.page(b, 900, 560, errs); lib.boot(pg, port, query=query)
        info = json.loads(pg.evaluate("JSON.stringify({ level: TEXHALF.level, n: TEXHALF.n, mb: Math.round(TEXHALF.mb) })"))
        ims = {}
        for name, js in VIEWS:
            pg.evaluate(js + "; GAME.step(0.3)"); time.sleep(0.5)
            data = pg.evaluate("(() => { GAME.shot(); return document.querySelector('#stage canvas').toDataURL('image/png'); })()")
            im = Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGB'); im.save(os.path.join(OUT, f"{name}_{query.split('=')[-1]}.png")); ims[name] = im
        return info, ims, [e for e in errs if 'Texture marked' not in e]
i_full, full, e_full = shots('?tex=full')
i_half, half, e_half = shots('?tex=half')
print('full', i_full, 'half', i_half, flush=True)
check('desktop default untouched (?tex=full: nothing halved)', i_full['level'] == 0 and i_full['n'] == 0, str(i_full))
check('?tex=half halves the textures', i_half['level'] == 1 and i_half['n'] > 100 and i_half['mb'] > 300, str(i_half))
for name, _ in VIEWS:
    d = ImageChops.difference(full[name], half[name]); st = ImageStat.Stat(d); mean = sum(st.mean) / 3
    big = sum(1 for p in d.convert('L').getdata() if p > 60) / (d.size[0] * d.size[1])
    check(f'{name}: halved textures look the same (mean difference, share of strongly changed pixels)', mean < 8 and big < 0.03, f"mean {mean:.2f}, {big * 100:.2f} % > 60")
check('no page errors', not e_full and not e_half, '\n'.join((e_full + e_half)[:5]))
print(f"\n{len(ok)} ok, {len(fails)} failed: {fails}")
