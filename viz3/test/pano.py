# Render 360° panoramas: six 100° views per point from the live model (full pipeline), converted to an equirectangular JPEG.
# Usage: python3 pano.py A|B [ids...]   → public/pano/<var>_<id>.jpg + public/pano/pano.json
import sys, os, json, base64, io, math, time
import numpy as np
from PIL import Image
from playwright.sync_api import sync_playwright
H = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); OUTD = os.path.join(H, 'public', 'pano'); os.makedirs(OUTD, exist_ok=True)
VAR = sys.argv[1] if len(sys.argv) > 1 else 'B'; ONLY = sys.argv[2:]
FACES = {'px': ([1, 0, 0], [0, 1, 0]), 'nx': ([-1, 0, 0], [0, 1, 0]), 'py': ([0, 1, 0], [0, 0, 1]), 'ny': ([0, -1, 0], [0, 0, -1]), 'pz': ([0, 0, 1], [0, 1, 0]), 'nz': ([0, 0, -1], [0, 1, 0])}
S, FOV, W = 1024, 100, 4096
# (id, label, x, y, eye height or level key, start yaw (0 = north, 90 = east))
P_B = [('garten', 'Garten', 3.4, 15.8, 1.65, 175), ('eingang', 'Vor der Haustür', 7.2, 3.3, 1.65, -95), ('west', 'Westwiese', -5.5, 1.0, 1.65, 80),
       ('bibliothek', 'Bibliothek', 2.0, 2.45, 'zF', -120), ('leiter', 'An der Leitertreppe', 3.3, 2.45, 'zF', 180), ('arbeitsraum', 'Arbeitsraum', 2.1, 2.3, 'zO', -110),
       ('lounge', 'Lounge', 0.95, 2.0, 'zO', -90), ('dach', 'Dachterrasse', 1.6, 2.6, 'zD', -95), ('dachost', 'Dachterrasse Ost', 4.3, 4.45, 'zD', -130),
       ('bruecke', 'Brücke', 3.53, 29.83, 1.71, -177), ('werkstatt', 'Werkstatt', -2.0, -37.55, 1.69, 190)]
P_A = [('garten', 'Garten', 3.4, 15.8, 1.65, 175), ('eingang', 'Vor der Turmtür', 9.2, 3.7, 1.65, -105), ('west', 'Westwiese', -5.5, 1.0, 1.65, 80),
       ('bibliothek', 'Bibliothek', 2.0, 2.45, 'zF', -120), ('turm', 'Im Treppenturm', 6.15, 3.12, 'zT0', -96), ('arbeitsraum', 'Arbeitsraum', 2.1, 2.3, 'zO', -110),
       ('lounge', 'Lounge', 0.95, 2.0, 'zO', -90), ('dach', 'Dachterrasse', 1.6, 2.6, 'zD', -95), ('turmkopf', 'Turmkopf', 5.4, 3.0, 'zD', -100),
       ('bruecke', 'Brücke', 3.53, 29.83, 1.71, -177), ('werkstatt', 'Werkstatt', -2.0, -37.55, 1.69, 190)]
# neighbours (hotspots in the viewer) and, for the ways through a hatch, where the marker sits (site x, y, z); start pitch in degrees
NB_B = {'bruecke': ['garten'], 'werkstatt': ['garten', 'west'], 'garten': ['eingang', 'west', 'bruecke', 'werkstatt'], 'eingang': ['garten', 'west', 'leiter', 'bibliothek'], 'west': ['garten', 'eingang', 'werkstatt'], 'bibliothek': ['leiter', 'eingang'],
        'leiter': ['eingang', 'bibliothek', 'arbeitsraum'], 'arbeitsraum': ['leiter', 'lounge', 'dachost'], 'lounge': ['arbeitsraum'], 'dach': ['dachost'], 'dachost': ['dach', 'arbeitsraum']}
NB_A = {'bruecke': ['garten'], 'werkstatt': ['garten', 'west'], 'garten': ['eingang', 'west', 'bruecke', 'werkstatt'], 'eingang': ['garten', 'west', 'turm'], 'west': ['garten', 'eingang', 'werkstatt'], 'bibliothek': ['turm'], 'turm': ['eingang', 'bibliothek', 'arbeitsraum', 'turmkopf'],
        'arbeitsraum': ['turm', 'lounge'], 'lounge': ['arbeitsraum'], 'dach': ['turmkopf'], 'turmkopf': ['turm', 'dach']}
VIA_B = {'leiter': {'arbeitsraum': [3.3, 1.07, 'zO+0.35']}, 'arbeitsraum': {'leiter': [3.3, 1.07, 'zO-0.2'], 'dachost': [4.19, 3.15, 'zK-0.25']}, 'dachost': {'arbeitsraum': [4.19, 3.15, 'zD-0.2']}}
PITCH = {'leiter': 18}
NB, VIA = (NB_B, VIA_B) if VAR == 'B' else (NB_A, {})
PTS = P_B if VAR == 'B' else P_A
def zval(G, e):
    if isinstance(e, (int, float)): return e
    for op in ('+', '-'):
        if op in e[1:]: k, v = e.split(op, 1); return G[k] + (float(v) if op == '+' else -float(v))
    return G[e]
def equirect(faces):
    Hh = W // 2; t = math.tan(math.radians(FOV) / 2)
    lon = (np.arange(W) + 0.5) / W * 2 * np.pi - np.pi; lat = np.pi / 2 - (np.arange(Hh) + 0.5) / Hh * np.pi
    LON, LAT = np.meshgrid(lon, lat)
    D = np.stack([np.cos(LAT) * np.sin(LON), np.sin(LAT), -np.cos(LAT) * np.cos(LON)], -1)   # three coords of site (east, north, up) directions
    names = list(FACES); dots = np.stack([D @ np.array(FACES[n][0], float) for n in names], -1); which = np.argmax(dots, -1)
    out = np.zeros((Hh, W, 3), np.float32)
    for k, n in enumerate(names):
        m = which == k; if_ = None
        if not m.any(): continue
        F = np.array(FACES[n][0], float); U = np.array(FACES[n][1], float); Rv = np.cross(F, U); d = D[m]; f = d @ F
        x = (d @ Rv) / (f * t); y = (d @ U) / (f * t)
        px = (x + 1) / 2 * (S - 1); py = (1 - y) / 2 * (S - 1)
        img = faces[n]; x0 = np.clip(np.floor(px).astype(int), 0, S - 2); y0 = np.clip(np.floor(py).astype(int), 0, S - 2); fx = (px - x0)[:, None]; fy = (py - y0)[:, None]
        c = img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x0 + 1] * fx * (1 - fy) + img[y0 + 1, x0] * (1 - fx) * fy + img[y0 + 1, x0 + 1] * fx * fy
        out[m] = c
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
man_path = os.path.join(OUTD, 'pano.json'); man = json.load(open(man_path)) if os.path.exists(man_path) else {}
with sync_playwright() as p:
    b = p.chromium.launch(args=['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'])
    pg = b.new_page(viewport={'width': 800, 'height': 500}); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script("try{localStorage.setItem('pav-variant','%s')}catch(e){}" % VAR)
    pg.goto('http://localhost:%s/index.html?offline=1' % os.environ.get('PORT', '8765'), timeout=300000, wait_until='domcontentloaded'); pg.wait_for_function("window.GAME && GAME.loaded()", timeout=900000, polling=2000)
    try: pg.wait_for_function("!window.CHARMAN || (window.NPC && NPC.real && (NPC.real.ready || NPC.real.failed))", timeout=600000, polling=1000)
    except Exception as e: print('figures not ready', e)
    pg.evaluate("document.querySelectorAll('.ov,#doorbtn,#joy,header,#ppanel,#talkbtn,#npcsub,#toast').forEach(e=>e.style.visibility='hidden')")
    pg.evaluate(f"GAME.setVariant('{VAR}'); GAME.setMode('gold'); GAME.setPhase(GAME.PHASES.length-1); GAME.doorsAll(true)")
    G = pg.evaluate("window.GEO"); lst = man.get(VAR, [])
    for pid, label, x, y, z, yaw in PTS:
        if ONLY and pid not in ONLY: continue
        ze = G[z] + 1.62 if isinstance(z, str) else z; t0 = time.time()
        r = pg.evaluate(f"panoCapture({x}, {y}, {ze}, {S}, {FOV})")
        faces = {n: np.asarray(Image.open(io.BytesIO(base64.b64decode(r[n].split(',')[1]))).convert('RGB'), dtype=np.float32) for n in FACES}
        im = equirect(faces); fn = f'{VAR.lower()}_{pid}.jpg'; im.save(os.path.join(OUTD, fn), quality=84, optimize=True, progressive=True)
        ent = {'id': pid, 'label': label, 'x': x, 'y': y, 'z': round(ze, 3), 'yaw': yaw, 'file': 'pano/' + fn}
        if pid in NB: ent['nb'] = NB[pid]
        if pid in VIA: ent['via'] = {k: [v[0], v[1], round(zval(G, v[2]), 3)] for k, v in VIA[pid].items()}
        if pid in PITCH: ent['pitch'] = PITCH[pid]
        lst = [e for e in lst if e['id'] != pid] + [ent]
        print('pano', VAR, pid, round(time.time() - t0, 1), 's', os.path.getsize(os.path.join(OUTD, fn)) // 1024, 'KB', flush=True)
    order = [q[0] for q in PTS]; man[VAR] = sorted(lst, key=lambda e: order.index(e['id']) if e['id'] in order else 99)
    json.dump(man, open(man_path, 'w'), ensure_ascii=False, indent=1)
    print('errors', errs[:5]); b.close()
