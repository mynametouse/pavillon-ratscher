# coverage map image: land cover muted, what is in 3D in strong colours, the map's tiers outlined
#   python3 tools/karte/karte_bild.py RAW      (after abdeckung.py; writes abdeckung_karte.png into RAW)
import json, sys, numpy as np
from PIL import Image, ImageDraw, ImageFont
A = sys.argv[1] if len(sys.argv) > 1 else '/tmp/an'
M = np.load(f'{A}/masks.npz'); G = json.load(open(f'{A}/grid.json')); r = json.load(open(f'{A}/abdeckung.json'))
LC, karte, img10, dgm1, bld, tree, veg, kreis = (M[k] for k in ['LC', 'karte', 'img10', 'dgm1', 'bld3d', 'tree3d', 'veg3d', 'kreis'])
s = 2  # 40 m per pixel
sl = (slice(None, None, s), slice(None, None, s))
LC, karte, img10, dgm1, bld, tree, veg, kreis = (x[sl] for x in (LC, karte, img10, dgm1, bld, tree, veg, kreis))
H, W = LC.shape
img = np.full((H, W, 3), 246, np.uint8)
flat = {10: (196, 214, 190), 20: (214, 220, 196), 30: (232, 236, 205), 40: (240, 226, 196), 50: (214, 196, 196), 60: (226, 222, 216), 80: (190, 210, 230), 90: (200, 220, 220)}
full = {10: (28, 110, 52), 30: (128, 186, 72), 40: (214, 160, 48), 50: (196, 48, 48)}
for c, col in flat.items():
    img[LC == c] = col
img[(LC == 10) & tree] = full[10]
img[(LC == 30) & veg] = full[30]
img[(LC == 40) & veg] = full[40]
img[(LC == 50) & bld] = full[50]
# outside the map: paler
off = ~karte & (kreis > 0)
img[off] = (img[off] * 0.55 + 255 * 0.45).astype(np.uint8)
out = ~karte & (kreis == 0)
img[out] = (img[out] * 0.3 + 255 * 0.7).astype(np.uint8)
im = Image.fromarray(img)
d = ImageDraw.Draw(im)
def edges(m, col, w=1):
    e = m & ~(np.roll(m, 1, 0) & np.roll(m, -1, 0) & np.roll(m, 1, 1) & np.roll(m, -1, 1))
    ys, xs = np.nonzero(e)
    for x, y in zip(xs, ys):
        d.rectangle([x - w // 2, y - w // 2, x + w // 2, y + w // 2], fill=col)
edges(kreis > 0, (90, 90, 90), 1)
k2 = kreis.astype(np.int16)
kb = (k2 != np.roll(k2, 1, 0)) | (k2 != np.roll(k2, 1, 1))
ys, xs = np.nonzero(kb & (kreis > 0)); [d.point((x, y), fill=(120, 120, 120)) for x, y in zip(xs, ys)]
edges(karte, (30, 30, 30), 3)
edges(img10, (40, 90, 200), 3)
edges(dgm1, (150, 40, 170), 1)
try:
    F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 22); Fb = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 26)
except Exception:
    F = Fb = ImageFont.load_default()
E0, N1, RES = G['E0'], G['N1'], G['RES'] * s
lab = ['Ratscher', 'Schleusingen', 'Suhl', 'Hildburghausen', 'Eisfeld', 'Themar', 'Kloster Veßra', 'Meiningen', 'Zella-Mehlis', 'Schmalkalden',
       'Sonneberg', 'Hirschbach', 'Oberhof', 'Ilmenau', 'Schmiedefeld am Rennsteig', 'Steinbach-Hallenberg', 'Bad Colberg-Heldburg', 'Neuhaus am Rennweg', 'Waldau', 'St. Bernhard', 'Römhild']
seen = set()
for o in r['orte']:
    if o['n'] in lab and o['n'] not in seen:
        seen.add(o['n'])
        x, y = (o['E'] - E0) / RES, (N1 - o['N']) / RES
        d.ellipse([x - 5, y - 5, x + 5, y + 5], fill=(0, 0, 0))
        d.text((x + 8, y - 13), o['n'], fill=(0, 0, 0), font=F, stroke_width=3, stroke_fill=(255, 255, 255))
# legend
L = [((28, 110, 52), 'Wald in 3D'), (flat[10], 'Wald nur Luftbild (flach)'), ((128, 186, 72), 'Wiese/Weide in 3D'), (flat[30], 'Wiese flach'),
     ((214, 160, 48), 'Acker in 3D'), (flat[40], 'Acker flach'), ((196, 48, 48), 'Siedlung mit 3D-Gebäuden'), (flat[50], 'Siedlung flach')]
x0, y0 = 20, H - 20 - 34 * (len(L) + 4)
d.rectangle([x0 - 10, y0 - 10, x0 + 470, H - 10], fill=(255, 255, 255), outline=(120, 120, 120))
for i, (c, t) in enumerate(L):
    d.rectangle([x0, y0 + i * 34, x0 + 26, y0 + i * 34 + 24], fill=c); d.text((x0 + 36, y0 + i * 34), t, fill=(0, 0, 0), font=F)
for i, (c, t) in enumerate([((30, 30, 30), 'Rand der Karte (irgendein Luftbild)'), ((40, 90, 200), 'Luftbild fein (≤ 0,8 m) – fahr-/begehbar'), ((150, 40, 170), 'Gelände 1 m (DGM1)')]):
    yy = y0 + (len(L) + i) * 34 + 10
    d.line([x0, yy + 12, x0 + 26, yy + 12], fill=c, width=4); d.text((x0 + 36, yy), t, fill=(0, 0, 0), font=F)
d.text((20, 16), 'Südthüringen – was im Modell in 3D steht (Stand V19r, 19.11.2026)', fill=(0, 0, 0), font=Fb)
d.text((20, 50), 'Landbedeckung: ESA WorldCover 2021 (CC BY 4.0) · Grenzen: © OpenStreetMap-Mitwirkende · 1 Pixel = 40 m', fill=(60, 60, 60), font=F)
im.save(f'{A}/abdeckung_karte.png', optimize=True)
im.resize((W // 2, H // 2), Image.LANCZOS).save(f'{A}/abdeckung_karte_klein.png', optimize=True)
print(im.size)
