#!/usr/bin/env python3
"""The things of the aerial photo for the game (feat/welt-dinge): the checked detections (viz3/extra/welt-dinge/pruefung_<gebiet>.json)
→ parking places and things with type, place, heading, colour → viz3/extra/welt-dinge/dist/dinge/<gebiet>.json, and the masks for the
ground retouch of welt-gebaeude → viz3/extra/welt-dinge/maske_dinge.json (model metres, Ratscher).

  python3 tools/welt-dinge/prep.py ratscher IMG.jpg x0 y1 s       # the photo on model axes (wdlib.fetch) for the colours

Cars: body type from the measured length (klein < 4.05 m ≤ kompakt < 4.45 m ≤ kombi/SUV; vans from the checked type), colour from the
photo (median of the middle of the box) to the nearest of the common German car colours, the place kind from the roads (at the kerb of a
street = 'strasse', inside a farm or works yard = 'betrieb', else a private drive or yard = 'hof'), the heading: along the road on its
right-hand side, on a drive away from the road (driven in forwards)."""
import json, math, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wdlib

EXTRA = os.path.join(wdlib.REPO, 'viz3/extra/welt-dinge')
TYPES = ['klein', 'kompakt', 'kombi', 'suv', 'van']
# colours of cars on German roads (KBA stock: grey/silver ~ 35 %, black ~ 25 %, white ~ 15 %, blue ~ 10 %, red ~ 6 %, …) – sRGB
PAL = [('schwarz', (18, 18, 20)), ('dunkelgrau', (58, 60, 64)), ('silber', (150, 152, 155)), ('weiss', (225, 225, 220)),
       ('dunkelblau', (25, 38, 72)), ('blau', (52, 92, 160)), ('rot', (150, 22, 20)), ('dunkelgruen', (30, 62, 40)),
       ('beige', (160, 135, 100)), ('gelb', (210, 160, 30))]
# the hand-modelled grounds (garden, the neighbours, the brook): their own things, nothing from the photo there
SKIP = [(-50, 42, -52, 48)]
# works yards: the agricultural cooperative west of the garden, the yards at the east end of the village
WORKS = [(-150, -40, -165, -30), (295, 450, -330, -220)]
HEIGHT = {'auto': 1.5, 'van': 2.3, 'wohnmobil': 3.0, 'lkw': 3.6, 'anhaenger': 1.0, 'wohnwagen': 2.6, 'traktor': 2.8,
          'pool_rund': 1.1, 'pool_eckig': 0.1, 'trampolin': 0.9, 'rundballen': 1.5, 'quaderballen': 1.8, 'holzstapel': 1.6,
          'stammholz': 1.2, 'container': 2.6}
HAZE = np.array([55.0, 70.0, 86.0])
SUN = (-0.34, 0.94)  # where the shadows of the photo fall (07.04.2024, late morning): north-north-west, ~1 m per m of height


def in_rect(x, y, R):
    return any(a <= x <= b and c <= y <= d for a, b, c, d in R)


def colour(img, x0, y1, s, k):
    """median colour of the middle of the box (half its length, half its width) → palette index"""
    a = math.radians(k['az'])
    f = (math.sin(a), math.cos(a))
    r = (f[1], -f[0])
    pts = []
    for i in np.linspace(-0.25, 0.25, 7):
        for j in np.linspace(-0.22, 0.22, 5):
            x = k['x'] + f[0] * i * k['l'] + r[0] * j * k['w']
            y = k['y'] + f[1] * i * k['l'] + r[1] * j * k['w']
            u, v = int((x - x0) / s), int((y1 - y) / s)
            if 0 <= v < img.shape[0] and 0 <= u < img.shape[1]:
                pts.append(img[v, u])
    if not pts:
        return 1
    m = np.median(np.array(pts, float), 0)
    # the haze of the photo lifts the darks towards blue (a black car's roof reads (75, 95, 110)): take it off before naming the colour
    m = np.clip((m - HAZE) / (1 - HAZE / 255), 0, 255)
    br = m.mean()
    sat = (m.max() - m.min()) / max(1, m.max())
    if sat > 0.42 and br > 45:
        h = np.argmax(m)
        if h == 0:
            return 6 if m[1] < m[0] * 0.6 else (9 if m[1] > m[0] * 0.75 and m[2] < m[1] * 0.6 else 8)
        if h == 2:
            return 5 if br > 75 else 4
        return 7
    if br > 170:
        return 3
    if br > 95:
        return 2
    if br > 50:
        return 1
    return 0


def main():
    gebiet, img, x0, y1, s = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    im = np.asarray(Image.open(img).convert('RGB'))
    P = json.load(open(os.path.join(EXTRA, f'pruefung_{gebiet}.json')))
    ways = [w for w in wdlib.roads() if w['kind'] <= 5]
    autos, dinge, masks = [], [], []
    for n, k in enumerate(P['ja'] + P.get('dazu', [])):
        x, y, t = k['x'], k['y'], k['t']
        if in_rect(x, y, SKIP):
            continue
        a = math.radians(k['az'])
        ax = (math.sin(a), math.cos(a))
        # the nearest street, lane or service way
        best = None
        for w in ways:
            d, q, u = wdlib.seg_dist(x, y, w['p'])
            if best is None or d - w['w'] / 2 < best[0]:
                best = (d - w['w'] / 2, d, q, u, w)
        edge, d, q, u, w = best
        h = HEIGHT.get(t if t in HEIGHT else 'auto', 1.5)
        # the mask: the box with a margin, stretched towards where its shadow fell
        hl, hw = k['l'] / 2 + 0.35, k['w'] / 2 + 0.35
        r = (ax[1], -ax[0])
        C = [(x + ax[0] * hl * i + r[0] * hw * j, y + ax[1] * hl * i + r[1] * hw * j) for i, j in ((1, 1), (1, -1), (-1, -1), (-1, 1))]
        sh = [(cx + SUN[0] * h, cy + SUN[1] * h) for cx, cy in C]
        masks.append(hull(C + sh))
        if t in ('auto', 'van', 'wohnmobil'):
            kind = 'betrieb' if in_rect(x, y, WORKS) else ('strasse' if edge < 1.2 else 'hof')
            if kind == 'strasse':
                o = (x - q[0], y - q[1])
                cr = u[0] * o[1] - u[1] * o[0]
                dirv = (u[0], u[1]) if cr < 0 else (-u[0], -u[1])
                if abs(dirv[0] * ax[0] + dirv[1] * ax[1]) < 0.5:
                    dirv = ax  # parked across the way (a bay): keep the photo's axis
            else:
                o = (x - q[0], y - q[1])
                dirv = ax if o[0] * ax[0] + o[1] * ax[1] >= 0 else (-ax[0], -ax[1])
            az = (math.degrees(math.atan2(dirv[0], dirv[1])) + 360) % 360
            if t == 'van' or t == 'wohnmobil':
                ty = 4
            else:
                L = k['l']
                hsh = (int(abs(x) * 7.31 + abs(y) * 3.17) % 100) / 100
                ty = 0 if L < 4.05 else 1 if L < 4.45 else (3 if hsh < 0.3 else 2)
            col = colour(im, x0, y1, s, k)
            autos.append([round(x, 2), round(y, 2), round(az, 1), ty, col, ['hof', 'strasse', 'betrieb'].index(kind)])
        else:
            dinge.append([t, round(x, 2), round(y, 2), round(k['az'], 1), round(k['l'], 2), round(k['w'], 2), round(h, 2)])
    out = {'v': 1, 'gebiet': gebiet,
           'quelle': 'Luftbild DOP 2024 © GDI-Th (dl-de/by-2-0), erkannt mit YOLO11-OBB (DOTAv1) und von Auge geprüft – tools/welt-dinge',
           'typen': TYPES, 'farben': [p[0] for p in PAL], 'arten': ['hof', 'strasse', 'betrieb'], 'autos': autos, 'dinge': dinge}
    os.makedirs(os.path.join(EXTRA, 'dist/dinge'), exist_ok=True)
    json.dump(out, open(os.path.join(EXTRA, f'dist/dinge/{gebiet}.json'), 'w'), separators=(',', ':'))
    mfile = os.path.join(EXTRA, 'maske_dinge.json')
    M = json.load(open(mfile)) if os.path.exists(mfile) else {'src': 'welt-dinge', 'polys': [], 'pad': 0.35}
    M['src'] = 'welt-dinge'
    M['pad'] = 0.35
    M.setdefault('gebiete', {})[gebiet] = [[[round(a, 2), round(b, 2)] for a, b in p] for p in masks]
    M['polys'] = [p for g in sorted(M['gebiete']) for p in M['gebiete'][g]]
    M['hinweis'] = ('Modellmeter (x Ost, y Nord) für Ratscher; je Fahrzeug/Ding die Box mit 0,35 m Rand, zur Schattenseite (NNW, ~1 m je m Höhe '
                    'beim Flug 07.04.2024) gestreckt. Alle erkannten – auch Stellplätze, die gerade leer sind.')
    json.dump(M, open(mfile, 'w'), separators=(',', ':'))
    from collections import Counter
    print(gebiet, len(autos), 'cars', dict(Counter(TYPES[a[3]] for a in autos)), dict(Counter(['hof', 'strasse', 'betrieb'][a[5]] for a in autos)),
          dict(Counter(PAL[a[4]][0] for a in autos)), len(dinge), 'things', dict(Counter(d[0] for d in dinge)), len(masks), 'masks')


def hull(pts):
    pts = sorted(set(pts))
    if len(pts) < 3:
        return pts

    def cross(o, a, b):
        return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0])

    lo, up = [], []
    for p in pts:
        while len(lo) >= 2 and cross(lo[-2], lo[-1], p) <= 0:
            lo.pop()
        lo.append(p)
    for p in reversed(pts):
        while len(up) >= 2 and cross(up[-2], up[-1], p) <= 0:
            up.pop()
        up.append(p)
    return lo[:-1] + up[:-1]


if __name__ == '__main__':
    main()
