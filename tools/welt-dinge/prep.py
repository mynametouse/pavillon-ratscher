#!/usr/bin/env python3
"""The things of the aerial photo for the game (feat/welt-dinge): the checked detections (viz3/extra/welt-dinge/pruefung_<gebiet>.json)
→ parking places and things with type, place, heading, colour → viz3/extra/welt-dinge/dist/dinge/<gebiet>.json, and the masks for the
ground retouch of welt-gebaeude → viz3/extra/welt-dinge/maske_dinge.json (model metres, Ratscher).

  python3 tools/welt-dinge/prep.py ratscher IMG.jpg x0 y1 s       # the photo on model axes (wdlib.fetch) for the colours
  python3 tools/welt-dinge/prep.py schleusingen DIR                # a folder of blocks b_<x0>_<y1>.jpg (0.1 m/px, as fetched by area.py)

The masks also go to maske_dinge_utm.json (UTM 25832, every area) for the tiles of the world beyond the square.

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
SKIP = [(-58, 42, -52, 48)]
# works yards: the agricultural cooperative west of the garden, the yards at the east end of the village
WORKS = [(-150, -40, -165, -30), (295, 450, -330, -220)]
HEIGHT = {'auto': 1.5, 'van': 2.3, 'wohnmobil': 3.0, 'lkw': 3.6, 'anhaenger': 1.0, 'wohnwagen': 2.6, 'traktor': 2.8,
          'pool_rund': 1.1, 'pool_eckig': 0.1, 'trampolin': 0.9, 'rundballen': 1.5, 'quaderballen': 1.8, 'holzstapel': 1.6,
          'stammholz': 1.2, 'container': 2.6, 'tank': 3.0}
HAZE = np.array([55.0, 70.0, 86.0])
S_DRIVING = []
SUN = (-0.34, 0.94)  # where the shadows of the photo fall (07.04.2024, late morning): north-north-west, ~1 m per m of height


def in_rect(x, y, R):
    return any(a <= x <= b and c <= y <= d for a, b, c, d in R)


class Photo:
    """the photo on model axes: one image (x0, y1, s) or a folder of blocks b_<x0>_<y1>.jpg at 0.1 m/px"""

    def __init__(self, a):
        from PIL import Image
        Image.MAX_IMAGE_PIXELS = None
        self.Image, self.cache = Image, {}
        if len(a) == 1:
            self.blocks = []
            for f in os.listdir(a[0]):
                if f.startswith('b_') and f.endswith('.jpg'):
                    x, y = f[2:-4].split('_')
                    self.blocks.append((float(x), float(y), os.path.join(a[0], f)))
            self.s = 0.1
        else:
            self.blocks = [(float(a[1]), float(a[2]), a[0])]
            self.s = float(a[3])

    def at(self, x, y):
        for x0, y1, f in self.blocks:
            u, v = int((x - x0) / self.s), int((y1 - y) / self.s)
            if u < 0 or v < 0:
                continue
            if f not in self.cache:
                if len(self.cache) > 3:
                    self.cache.pop(next(iter(self.cache)))
                self.cache[f] = np.asarray(self.Image.open(f).convert('RGB'))
            im = self.cache[f]
            if v < im.shape[0] and u < im.shape[1]:
                return im[v, u]
        return None


def colour(photo, k):
    """median colour of the middle of the box (half its length, half its width) → palette index"""
    a = math.radians(k['az'])
    f = (math.sin(a), math.cos(a))
    r = (f[1], -f[0])
    pts = []
    for i in np.linspace(-0.25, 0.25, 7):
        for j in np.linspace(-0.22, 0.22, 5):
            x = k['x'] + f[0] * i * k['l'] + r[0] * j * k['w']
            y = k['y'] + f[1] * i * k['l'] + r[1] * j * k['w']
            c = photo.at(x, y)
            if c is not None:
                pts.append(c)
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
    gebiet = sys.argv[1]
    photo = Photo([a for a in sys.argv[2:] if not a.startswith('--')][:4])
    # nothing of ours on a building that stands in 3D (OSM, the old town, welt-gebaeude's ETHOS buildings): a tank or shed that is a
    # building there, a 'car' that was a roof window
    from shapely.geometry import Polygon
    from shapely.strtree import STRtree
    geb = sys.argv[sys.argv.index('--geb') + 1] if '--geb' in sys.argv else None
    FP = wdlib.footprints(geb)
    tree = STRtree(FP)
    dropped = []
    P = json.load(open(os.path.join(EXTRA, f'pruefung_{gebiet}.json')))
    ways = [w for w in wdlib.roads() + (wdlib.roads_fahrt() if gebiet != 'ratscher' else []) if w['kind'] <= 5]
    autos, dinge, masks = [], [], []
    S_DRIVING.clear()
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
        h = k.get('h') or HEIGHT.get(t if t in HEIGHT else 'auto', 1.5)
        hl0, hw0 = k['l'] / 2, k['w'] / 2
        r0 = (ax[1], -ax[0])
        box = Polygon([(x + ax[0] * hl0 * i + r0[0] * hw0 * j, y + ax[1] * hl0 * i + r0[1] * hw0 * j) for i, j in ((1, 1), (1, -1), (-1, -1), (-1, 1))])
        if t in ('tank', 'pool_rund', 'trampolin'):
            box = box.centroid.buffer(hw0, 16)
        over = sum(box.intersection(FP[i]).area for i in tree.query(box))
        if over > 0.25 * box.area:
            dropped.append((t, round(x, 1), round(y, 1), round(over / box.area, 2)))
            continue
        # the mask: the box with a margin, stretched towards where its shadow fell
        hl, hw = k['l'] / 2 + 0.35, k['w'] / 2 + 0.35
        r = (ax[1], -ax[0])
        C = [(x + ax[0] * hl * i + r[0] * hw * j, y + ax[1] * hl * i + r[1] * hw * j) for i, j in ((1, 1), (1, -1), (-1, -1), (-1, 1))]
        sh = [(cx + SUN[0] * h, cy + SUN[1] * h) for cx, cy in C]
        masks.append(hull(C + sh))
        if t in ('auto', 'van') and edge < -1.0 and w['kind'] <= 2:
            S_DRIVING.append((x, y))  # in the lane of a main or county road: driving when the photo was taken, no parking place
            continue
        if t in ('auto', 'van'):
            kind = 'betrieb' if in_rect(x, y, WORKS) else ('strasse' if edge < 2.5 else 'hof')
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
            if t == 'van':
                ty = 4
            else:
                L = k['l']
                hsh = (int(abs(x) * 7.31 + abs(y) * 3.17) % 100) / 100
                ty = 0 if L < 4.05 else 1 if L < 4.45 else (3 if hsh < 0.3 else 2)
            col = colour(photo, k)
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
    U = {'src': 'welt-dinge', 'crs': 'EPSG:25832', 'pad': 0.35, 'hinweis': M['hinweis'].replace('Modellmeter (x Ost, y Nord) für Ratscher', 'UTM 32N (EPSG:25832, E/N in m)'),
         'gebiete': {g: [[[round(c, 2) for c in wdlib.to_utm(a, b)] for a, b in p] for p in L] for g, L in M['gebiete'].items()}}
    U['polys'] = [p for g in sorted(U['gebiete']) for p in U['gebiete'][g]]
    json.dump(U, open(os.path.join(EXTRA, 'maske_dinge_utm.json'), 'w'), separators=(',', ':'))
    from collections import Counter
    print(gebiet, len(autos), 'cars', dict(Counter(TYPES[a[3]] for a in autos)), dict(Counter(['hof', 'strasse', 'betrieb'][a[5]] for a in autos)),
          dict(Counter(PAL[a[4]][0] for a in autos)), len(dinge), 'things', dict(Counter(d[0] for d in dinge)), len(masks), 'masks',
          len(S_DRIVING), 'driving (left out)', len(dropped), 'on buildings (left out):', dropped[:12])


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
