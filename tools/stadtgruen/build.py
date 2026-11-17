#!/usr/bin/env python3
"""Street trees and green of Schleusingen, step 2: the trees the app draws (viz3/src/stadtgruen/) from the data fetched by fetch.py.

  python3 -I tools/stadtgruen/build.py <cache dir> [--out viz3/extra/stadtgruen/dist/stadtgruen] [--debug <dir>]

Sources: the town's data of the app (viz3/extra/schleusingen/dist/schleusingen/stadt.json: buildings, streets, lamps, the Markt), the
shops' pads, doors and bays (viz3/extra/laeden/dist/laeden/laeden.json), the parking places (viz3/extra/welt-dinge/plaetze_schleusingen.json),
the roads' furniture (viz3/extra/strassen/dist/strassen/ausstattung.json: lamps, signs, bus stops), OpenStreetMap of the zone (ODbL 1.0:
natural=tree, tree_row, barrier=hedge, every building), the orthophotos DOP 20 cm in colour and colour infrared (© GDI-Th, dl-de/by-2-0,
flown 07.04.2024 – before the leaves: the verges' grass shows, the crowns of broadleaved trees mostly do not).

Rows (ROWS below): the avenues and the street trees along Hildburghäuser, Suhler and Ilmenauer Straße – side, stretch, species, spacing,
distance from the kerb – checked against private views from the street (October 2022; not in the repository). The kerb comes from the
orthophotos (the asphalt band across the road at every metre), a tree stands only where the verge is green (no drive, no entrance).
Where a tree must not stand (each with a margin): in or at a building, on a carriageway or a footway, in a parking bay or on a shop's
pad, before a door, under a lamp or a sign, at a bus stop, on the Markt (its trees are welt/schleusingen.js's).
Output: baeume.json – b: 6 integers per tree (x, y in dm of the model, species, height dm, crown radius dm, flags), the rows, counts."""
import argparse, glob, json, math, os, sys, time
import xml.etree.ElementTree as ET
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
XF = json.load(open(os.path.join(REPO, 'viz3', 'manifests.json')))['geoman']['xf']
A, B, EX, EY = XF['a'], XF['b'], XF['ex'], XF['ey']
ARTEN = ['linde', 'ahorn', 'kastanie', 'birke', 'esche', 'eiche', 'nadel', 'obst', 'hecke']
AI = {a: i for i, a in enumerate(ARTEN)}
F_ROW, F_STREET, F_YARD, F_PARK, F_IMG, F_OSM, F_HEDGE = 1, 2, 4, 8, 16, 32, 64
# the carriageway's half width by the town's street class (welt/schleusingen.js streetMap) and a footway's
HALF_W = {1: 4.0, 2: 3.5, 3: 2.8, 5: 1.8, 6: 1.5, 7: 1.0, 8: 1.1}

# ---- the rows: street, side ('l' left / 'r' right of the street's direction in stadt.json), from and to (model points projected onto
# the street), species, spacing (m), distance of the trunks from the kerb (m), height and crown radius (m), checked against the views ----
ROWS = [
    # Hildburghäuser Straße by the blocks Nr. 15–24 (towards Hildburghausen): limes on the grass strips between kerb and footway on both
    # sides, golden in October; south-east side to about Nr. 18, north-west side to about Nr. 20
    dict(n='Hildburghäuser Straße', s='r', a=(-1700.0, 905.0), b=(-1562.0, 1009.0), art='linde', sp=9.5, kerb=1.6, h=14.0, r=4.2),
    dict(n='Hildburghäuser Straße', s='l', a=(-1700.0, 905.0), b=(-1574.0, 1000.0), art='linde', sp=9.5, kerb=1.6, h=14.0, r=4.2),
]


def m2u(x, y):
    return EX + A * x - B * y, EY + B * x + A * y


def u2m(E, N):
    s2 = A * A + B * B
    dx, dy = E - EX, N - EY
    return (A * dx + B * dy) / s2, (-B * dx + A * dy) / s2


# ---------------------------------------------------------------- data ------------------------------------------------------------
class Ortho:
    """the zone's orthophotos (UTM axes, north up, kept as bytes) → NDVI at model points; the crowns are found tile by tile (crowns())"""

    def __init__(self, raw):
        from PIL import Image
        Image.MAX_IMAGE_PIXELS = None
        self.meta = json.load(open(os.path.join(raw, 'cir.png.json')))
        self.cir = np.asarray(Image.open(os.path.join(raw, 'cir.png')).convert('RGB'))
        rgbp = os.path.join(raw, 'rgb.png')
        self.rgb = np.asarray(Image.open(rgbp).convert('RGB')) if os.path.exists(rgbp) else None
        self.res = self.meta['res']

    def px(self, x, y):
        E, N = m2u(np.asarray(x, float), np.asarray(y, float))
        return (E - self.meta['e0']) / self.res, (self.meta['n1'] - N) / self.res

    def model(self, c, r):
        """pixel (column, row) centre → model metres"""
        E = self.meta['e0'] + (np.asarray(c, float) + 0.5) * self.res
        N = self.meta['n1'] - (np.asarray(r, float) + 0.5) * self.res
        return u2m(E, N)

    def ndvi(self, x, y, rad=0.0):
        """the NDVI (CIR: near infrared, red) at model points, averaged over a disc of rad metres"""
        c, r = self.px(x, y)
        c = np.round(np.atleast_1d(c)).astype(int)
        r = np.round(np.atleast_1d(r)).astype(int)
        k = int(round(rad / self.res))
        H, Wd = self.cir.shape[:2]
        acc = np.zeros(len(c))
        n = np.zeros(len(c))
        for dr in range(-k, k + 1):
            for dc in range(-k, k + 1):
                if dr * dr + dc * dc > k * k:
                    continue
                rr, cc = r + dr, c + dc
                ok = (rr >= 0) & (rr < H) & (cc >= 0) & (cc < Wd)
                v = self.cir[np.clip(rr, 0, H - 1), np.clip(cc, 0, Wd - 1)].astype(np.float32)
                nd = (v[:, 0] - v[:, 1]) / (v[:, 0] + v[:, 1] + 1e-3)
                acc += np.where(ok, nd, 0)
                n += ok
        out = np.where(n > 0, acc / np.maximum(n, 1), np.nan)
        return out if out.size > 1 else float(out[0])


def load_osm(raw):
    nodes, ways = {}, {}
    for f in sorted(glob.glob(os.path.join(raw, 'osm', 'osm_*.xml'))):
        r = ET.parse(f).getroot()
        for n in r.iter('node'):
            tags = {t.get('k'): t.get('v') for t in n.iter('tag')}
            nodes[n.get('id')] = (float(n.get('lon')), float(n.get('lat')), tags)
        for w in r.iter('way'):
            tags = {t.get('k'): t.get('v') for t in w.iter('tag')}
            ways[w.get('id')] = ([nd.get('ref') for nd in w.iter('nd')], tags)
    from pyproj import Transformer
    T = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
    ids = list(nodes)
    lo = np.array([nodes[i][0] for i in ids])
    la = np.array([nodes[i][1] for i in ids])
    E, N = T.transform(lo, la)
    x, y = u2m(np.asarray(E), np.asarray(N))
    xy = {i: (float(x[k]), float(y[k])) for k, i in enumerate(ids)}
    return nodes, ways, xy


# ---------------------------------------------------------------- geometry --------------------------------------------------------
def inside(poly, x, y):
    c = False
    n = len(poly)
    for i in range(n):
        (xi, yi), (xj, yj) = poly[i], poly[i - 1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            c = not c
    return c


def seg_dist(px, py, ax, ay, bx, by):
    dx, dy = bx - ax, by - ay
    l2 = dx * dx + dy * dy or 1.0
    t = max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / l2))
    return math.hypot(px - ax - dx * t, py - ay - dy * t)


def poly_dist(poly, x, y):
    return min(seg_dist(x, y, *poly[i - 1], *poly[i]) for i in range(len(poly)))


def line_dist(pts, x, y):
    return min(seg_dist(x, y, *pts[i], *pts[i + 1]) for i in range(len(pts) - 1))


class Hash:
    """a spatial hash of items with a bounding box (x0, y0, x1, y1) → candidates near a point"""

    def __init__(self, cell=16.0):
        self.cell, self.m = cell, {}

    def add(self, bb, item):
        c = self.cell
        for i in range(int(math.floor(bb[0] / c)), int(math.floor(bb[2] / c)) + 1):
            for j in range(int(math.floor(bb[1] / c)), int(math.floor(bb[3] / c)) + 1):
                self.m.setdefault((i, j), []).append(item)

    def near(self, x, y, r=0.0):
        c, out, seen = self.cell, [], set()
        for i in range(int(math.floor((x - r) / c)), int(math.floor((x + r) / c)) + 1):
            for j in range(int(math.floor((y - r) / c)), int(math.floor((y + r) / c)) + 1):
                for it in self.m.get((i, j), ()):
                    if id(it) not in seen:
                        seen.add(id(it))
                        out.append(it)
        return out


def bbox(pts, m=0.0):
    xs = [p[0] for p in pts]
    ys = [p[1] for p in pts]
    return (min(xs) - m, min(ys) - m, max(xs) + m, max(ys) + m)


# ---------------------------------------------------------------- the world a tree must keep clear of ----------------------------
class World:
    def __init__(self, raw):
        J = lambda *p: json.load(open(os.path.join(REPO, *p)))
        self.stadt = J('viz3', 'extra', 'schleusingen', 'dist', 'schleusingen', 'stadt.json')
        self.zone = self.stadt['zone']
        self.laeden = J('viz3', 'extra', 'laeden', 'dist', 'laeden', 'laeden.json')
        self.plaetze = J('viz3', 'extra', 'welt-dinge', 'plaetze_schleusingen.json')
        self.strassen = J('viz3', 'extra', 'strassen', 'dist', 'strassen', 'ausstattung.json')
        self.nodes, self.ways, self.xy = load_osm(raw)
        self.bld = Hash(16)
        self.roads = Hash(16)
        self.points = Hash(8)   # lamps, signs, posts, stops: (x, y, radius, what)
        self.bays = Hash(8)
        self.pads = Hash(16)
        self.n = {}
        # buildings: the town's footprints with their doors, and every OSM building (garages, sheds, the edge of the zone)
        for b in self.stadt['b']:
            f = list(zip(b['f'][0::2], b['f'][1::2]))
            self.bld.add(bbox(f, 1), ('b', f))
        for wid, (refs, tags) in self.ways.items():
            if 'building' in tags and refs[0] == refs[-1] and all(r in self.xy for r in refs):
                f = [self.xy[r] for r in refs[:-1]]
                self.bld.add(bbox(f, 1), ('b', f))
        # streets of the town (class, width) and the footways
        for s in self.stadt['st']:
            p = list(zip(s['p'][0::2], s['p'][1::2]))
            hw = HALF_W.get(s['k'], 1.5)
            for i in range(len(p) - 1):
                self.roads.add(bbox([p[i], p[i + 1]], hw + 2), (p[i], p[i + 1], hw, s.get('n', ''), s['k']))
        # the shops: their buildings and pads, doors, the car parks' bays
        # the corridors in front of a door or a sign that stay clear (x, y, nx, ny, depth, half width, what)
        self.fronts = Hash(16)

        def front(x, y, nx, ny, L, hw, what):
            n = math.hypot(nx, ny) or 1
            nx, ny = nx / n, ny / n
            pts = [(x + nx * L + ny * hw, y + ny * L - nx * hw), (x - ny * hw, y + nx * hw), (x + ny * hw, y - nx * hw),
                   (x + nx * L - ny * hw, y + ny * L + nx * hw)]
            self.fronts.add(bbox(pts, 1), (x, y, nx, ny, L, hw, what))
        for sh in self.laeden.get('shops', []):
            for part in sh.get('parts', []) + sh.get('annex', []):
                f = list(zip(part['f'][0::2], part['f'][1::2]))
                self.pads.add(bbox(f, 1), f)
            for d in sh.get('doors', []):
                self.points.add((d['x'] - 4, d['y'] - 4, d['x'] + 4, d['y'] + 4), (d['x'], d['y'], 3.5, 'Ladentür'))
                if 'nx' in d:
                    front(d['x'], d['y'], d['nx'], d['ny'], 8.0, d.get('w', 2) / 2 + 1.5, 'vor der Ladentür')
            for g in sh.get('signs', []):
                if 'nx' in g:
                    front(g['x'], g['y'], g['nx'], g['ny'], 12.0, g.get('w', 3) / 2 + 1.0, 'vor dem Schild')
        for lot in self.laeden.get('lots', []):
            for bx, by, az in lot.get('bays', []):
                self.bays.add((bx - 4, by - 4, bx + 4, by + 4), (bx, by, az))
            f = list(zip(lot['f'][0::2], lot['f'][1::2]))
            self.pads.add(bbox(f, 1), f)
        for p in self.plaetze.get('plaetze', []):
            self.bays.add((p['x'] - 4, p['y'] - 4, p['x'] + 4, p['y'] + 4), (p['x'], p['y'], p.get('az', 0)))
        # the parking places and things the parked-things module draws (cars and lorries seen on the aerial photo, welt-dinge)
        try:
            D = J('viz3', 'extra', 'welt-dinge', 'dist', 'dinge', 'schleusingen.json')
        except Exception:
            D = {}
        for q in D.get('autos', []):
            self.bays.add((q[0] - 4, q[1] - 4, q[0] + 4, q[1] + 4), (q[0], q[1], q[2]))
        for q in D.get('dinge', []):
            kind, x, y, az, L, Wd = q[:6]
            a = math.radians(az)
            ux, uy, vx, vy = math.sin(a), math.cos(a), math.cos(a), -math.sin(a)
            f = [(x + ux * su * L / 2 + vx * sv * Wd / 2, y + uy * su * L / 2 + vy * sv * Wd / 2) for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            self.pads.add(bbox(f, 1), f)
        # lamps of the town and of the roads, signs and posts, bus stops (×10 dm in ausstattung.json)
        for l in self.stadt.get('lamps', []):
            self.points.add((l[0] - 3, l[1] - 3, l[0] + 3, l[1] + 3), (l[0], l[1], 2.2, 'Laterne'))
        S = self.strassen
        L = S.get('lampen', [])
        for i in range(0, len(L) - 3, 4):
            x, y = L[i] / 10, L[i + 1] / 10
            self.points.add((x - 3, y - 3, x + 3, y + 3), (x, y, 2.2, 'Laterne'))
        for s in S.get('schilder', []):
            x, y = s[1] / 10, s[2] / 10
            self.points.add((x - 2, y - 2, x + 2, y + 2), (x, y, 1.2, 'Schild'))
        P = S.get('pfosten', [])
        for i in range(0, len(P) - 2, 3):
            x, y = P[i] / 10, P[i + 1] / 10
            self.points.add((x - 2, y - 2, x + 2, y + 2), (x, y, 0.8, 'Pfosten'))
        for l in S.get('linien', []):
            if l[0] in ('halt', 'warte'):
                x, y = l[1] / 10, l[2] / 10
                self.points.add((x - 6, y - 6, x + 6, y + 6), (x, y, 4.5, 'Haltestelle'))
        # the bus stops' platforms of the timetable (bus/bus.js): both ends of each
        try:
            BUSD = J('viz3', 'extra', 'bus', 'dist', 'bus', 'fahrplan.json')
        except Exception:
            BUSD = {}
        for stn in BUSD.get('stations', []):
            for pl in stn.get('pl', []):
                for x, y in ((pl[0] / 10, pl[1] / 10), (pl[4] / 10, pl[5] / 10)):
                    self.points.add((x - 7, y - 7, x + 7, y + 7), (x, y, 6.0, 'Haltestelle'))
        # the doors of the town's houses as welt/schleusingen.js puts them are known only in the app (checked there); here the OSM
        # entrances
        for nid, (lo, la, tags) in self.nodes.items():
            if 'entrance' in tags or tags.get('door'):
                x, y = self.xy[nid]
                self.points.add((x - 4, y - 4, x + 4, y + 4), (x, y, 3.0, 'Eingang'))
        m = self.stadt.get('marktplatz')
        self.markt = list(zip(m[0::2], m[1::2])) if m else None
        # the pads and car parks as a list (masks), water (OSM), the kind of place (park, cemetery, garden) for the species
        self.pads_list = [f for it in self.pads.m.values() for f in it]
        self.water_polys, self.water_lines = [], []
        self.places = Hash(32)
        KIND = {('leisure', 'park'): 'park', ('landuse', 'cemetery'): 'friedhof', ('amenity', 'grave_yard'): 'friedhof',
                ('leisure', 'garden'): 'garten', ('landuse', 'allotments'): 'garten', ('landuse', 'grass'): 'park',
                ('natural', 'wood'): 'park', ('landuse', 'forest'): 'park'}
        for wid, (refs, tags) in self.ways.items():
            if not all(r in self.xy for r in refs):
                continue
            pts = [self.xy[r] for r in refs]
            if tags.get('natural') == 'water' or tags.get('landuse') in ('basin', 'reservoir'):
                if refs[0] == refs[-1]:
                    self.water_polys.append(pts[:-1])
            elif tags.get('waterway') in ('river', 'stream', 'canal', 'ditch', 'drain'):
                self.water_lines.append((pts, {'river': 4.0, 'canal': 3.0, 'stream': 1.6}.get(tags['waterway'], 0.8)))
            for (k, v), kind in KIND.items():
                if tags.get(k) == v and refs[0] == refs[-1] and len(pts) > 3:
                    self.places.add(bbox(pts), (kind, pts[:-1]))

    def place_kind(self, x, y):
        """'wasser' near a brook, else the kind of the OSM area the point is in (park, friedhof, garten), else ''"""
        for p, hw in self.water_lines:
            if line_dist(p, x, y) < hw + 6:
                return 'wasser'
        for kind, f in self.places.near(x, y):
            if inside(f, x, y):
                return kind
        return ''

    def half_width(self, name, x, y):
        """the drawn half width of the named street nearest to (x, y)"""
        best = (1e9, 3.5)
        for a, b, hw, n, k in self.roads.near(x, y, 4):
            if n == name:
                d = seg_dist(x, y, *a, *b)
                if d < best[0]:
                    best = (d, hw)
        return best[1]

    def in_zone(self, x, y, m=0.0):
        Z = self.zone
        return Z[0] - m <= x <= Z[2] + m and Z[1] - m <= y <= Z[3] + m

    def why_not(self, x, y, tr=0.3, hedge=False, own=None):
        """'' where a trunk of radius tr may stand, else the reason (own: a row's own street – its kerb is measured, not taken from OSM)"""
        if not self.in_zone(x, y):
            return 'außerhalb'
        for kind, f in self.bld.near(x, y, 2):
            if inside(f, x, y) or poly_dist(f, x, y) < tr + (0.35 if hedge else 0.6):
                return 'Gebäude'
        for f in self.pads.near(x, y, 2):
            if inside(f, x, y) or poly_dist(f, x, y) < tr + 0.4:
                return 'Ladenfläche/Parkplatz'
        for a, b, hw, name, k in self.roads.near(x, y, 6):
            if own and name == own:
                continue
            m = 0.45 if k == 8 else 0.7
            if seg_dist(x, y, *a, *b) < hw + tr + (0.2 if hedge else m):
                return 'Fußweg' if k == 8 else 'Fahrbahn'
        for px, py, r, what in self.points.near(x, y, 6):
            if math.hypot(px - x, py - y) < (r * 0.45 if hedge else r):
                return what
        for fx, fy, nx, ny, L, hw, what in self.fronts.near(x, y, 2):
            a = (x - fx) * nx + (y - fy) * ny
            c = (x - fx) * ny - (y - fy) * nx
            if -0.5 <= a <= L and abs(c) <= hw + (0 if hedge else tr):
                return what
        for bx, by, az in self.bays.near(x, y, 4):
            dx, dy = x - bx, y - by
            a = math.radians(az or 0)
            along = dx * math.sin(a) + dy * math.cos(a)
            across = dx * math.cos(a) - dy * math.sin(a)
            if abs(along) < 2.5 + tr + 0.2 and abs(across) < 1.25 + tr + 0.2:
                return 'Parkbucht'
        if self.markt and (inside(self.markt, x, y) or poly_dist(self.markt, x, y) < 4):
            return 'Markt'
        return ''


# ---------------------------------------------------------------- the rows along the streets ---------------------------------------
def street_line(W, name):
    """the street's polylines joined into one line (by their ends), as stadt.json gives them"""
    segs = [list(zip(s['p'][0::2], s['p'][1::2])) for s in W.stadt['st'] if s.get('n') == name]
    if not segs:
        return []
    segs.sort(key=lambda p: -len(p))
    line = segs.pop(0)
    while segs:
        best = None
        for k, p in enumerate(segs):
            for rev in (False, True):
                q = p[::-1] if rev else p
                for at_end in (True, False):
                    d = math.dist(line[-1], q[0]) if at_end else math.dist(line[0], q[-1])
                    if best is None or d < best[0]:
                        best = (d, k, q, at_end)
        d, k, q, at_end = best
        if d > 25:
            break
        segs.pop(k)
        line = line + q[1:] if at_end else q[:-1] + line
    return line


def stations(line, step=1.0):
    """points every step metres along the line: (s, x, y, tx, ty) with the unit tangent"""
    out, s0 = [], 0.0
    for i in range(len(line) - 1):
        (ax, ay), (bx, by) = line[i], line[i + 1]
        L = math.hypot(bx - ax, by - ay)
        if L < 1e-6:
            continue
        tx, ty = (bx - ax) / L, (by - ay) / L
        t = (math.ceil(s0 / step) * step - s0) if out else 0.0
        while t < L:
            out.append((s0 + t, ax + tx * t, ay + ty * t, tx, ty))
            t += step
        s0 += L
    return out


def project(st, p):
    """the station nearest to the point p"""
    return min(st, key=lambda q: (q[1] - p[0]) ** 2 + (q[2] - p[1]) ** 2)[0]


def kerbs(O, st, thr=0.2):
    """the asphalt band across the street at each station from the infrared picture: (lo, hi) offsets of the left normal (m), smoothed"""
    offs = np.arange(-11, 11.01, 0.25)
    lo, hi = [], []
    for s, x, y, tx, ty in st:
        nx, ny = -ty, tx
        prof = np.zeros(len(offs))
        for a in (-2.0, -1.0, 0.0, 1.0, 2.0):
            prof += O.ndvi(x + nx * offs + tx * a, y + ny * offs + ty * a)
        prof /= 5
        road = prof < thr
        c = len(offs) // 2
        # the run of asphalt round the centre line (it may be off by a metre or two in OSM)
        k = c + int(np.argmin(np.abs(np.where(road[c - 8:c + 9], 0, 99)))) - 8 if road[c - 8:c + 9].any() else None
        if k is None:
            lo.append(np.nan)
            hi.append(np.nan)
            continue
        a = k
        while a > 0 and road[a - 1]:
            a -= 1
        b = k
        while b < len(offs) - 1 and road[b + 1]:
            b += 1
        lo.append(offs[a] - 0.125)
        hi.append(offs[b] + 0.125)
    lo, hi = np.array(lo), np.array(hi)
    # implausible widths (a car park, a drive beside the road) → none; then a running median over ±12 m
    w = hi - lo
    bad = (w < 4.5) | (w > 10.5)
    lo[bad] = np.nan
    hi[bad] = np.nan

    def smooth(v, k=12):
        out = np.copy(v)
        for i in range(len(v)):
            win = v[max(0, i - k):i + k + 1]
            win = win[~np.isnan(win)]
            out[i] = np.median(win) if len(win) >= 4 else np.nan
        return out
    return smooth(lo), smooth(hi)


def rows(W, O, log):
    out = []
    for R in ROWS:
        line = street_line(W, R['n'])
        if len(line) < 2:
            log(f"Reihe {R['n']} {R['s']}: Straße fehlt")
            continue
        st = stations(line, 1.0)
        lo, hi = kerbs(O, st) if O else (np.full(len(st), -3.5), np.full(len(st), 3.5))
        s0, s1 = sorted((project(st, R['a']), project(st, R['b'])))
        side = 1 if R['s'] == 'l' else -1
        placed, skipped = [], {}
        s = s0
        first = True
        while s <= s1 + 1e-6:
            i = min(range(len(st)), key=lambda k: abs(st[k][0] - s))
            _, x, y, tx, ty = st[i]
            nx, ny = -ty, tx
            # the tree stands by the road as the app draws it (the OSM centre line and the class's width, welt/schleusingen.js
            # streetMap); whether the verge is green there (no drive, no entrance) is looked up where the real kerb is (orthophoto)
            hw = W.half_width(R['n'], x, y)
            px, py = x + nx * side * (hw + R['kerb']), y + ny * side * (hw + R['kerb'])
            edge = hi[i] if side > 0 else lo[i]
            qx, qy = (x + nx * (edge + side * R['kerb']), y + ny * (edge + side * R['kerb'])) if not np.isnan(edge) else (px, py)
            why = W.why_not(px, py, 0.25, own=R['n'])
            if not why and O is not None:
                g = float(O.ndvi(qx, qy, 0.6))
                if not (g > 0.24):
                    why = 'kein Grünstreifen'
            if why:
                skipped[why] = skipped.get(why, 0) + 1
                # a gap (a drive, a junction): try again a third of the spacing on
                s += R['sp'] / 3 if not first else 1.0
                continue
            # height and crown a little different from tree to tree
            hs = (math.sin(px * 12.9898 + py * 78.233) * 43758.5453) % 1
            placed.append((px, py, AI[R['art']], R['h'] * (0.9 + 0.2 * hs), R['r'] * (0.9 + 0.2 * hs), F_ROW | F_STREET, R['n']))
            first = False
            s += R['sp']
        log(f"Reihe {R['n']} {R['s']}: {len(placed)} Bäume auf {s1 - s0:.0f} m, ausgelassen {skipped}")
        out.append(dict(n=R['n'], s=R['s'], art=R['art'], sp=R['sp'], trees=placed))
    return out


# ---------------------------------------------------------------- crowns in the orthophotos ----------------------------------------
# The southern tiles were flown on 07.04.2024, before the leaves: a broadleaved crown is a grey-brown tangle of branches over the grass
# with its shadows – the lawn under it is smooth, the crown is rough at a scale of about 2 m (the grey value's standard deviation over
# 2.25 m: crowns 13–27, lawns 7–8, measured by the castle, along Hildburghäuser Straße and in the gardens); conifers and evergreen shrubs
# are vegetated (high NDVI) and dark. The northern tiles (N ≥ 5 597 000) were flown on 15.05.2024 with the leaves: every crown green
# and rough, a conifer darker in the infrared. Buildings with 2.5 m round them (their shadows and edges), carriageways, footways, water and car parks are left out.
# Crowns: the rough, vegetated places smoothed over ~1.5 m, as blobs; a tree at each peak of the distance to the blob's edge (≥ 3.5 m
# apart), its crown radius from that distance.
TILE, PAD = 1000, 48


def lstd(a, w):
    from scipy import ndimage as ndi
    m = ndi.uniform_filter(a, w)
    m2 = ndi.uniform_filter(a * a, w)
    return np.sqrt(np.maximum(0, m2 - m * m))


def crowns(W, O, log):
    from scipy import ndimage as ndi
    from PIL import Image, ImageDraw
    res = O.res
    H, Wd = O.cir.shape[:2]
    # what is drawn into the mask, in pixels of the whole picture
    polys, lines = [], []
    for it in W.bld.m.values():
        for kind, f in it:
            polys.append((f, 2.5))
    for f in W.pads_list:
        polys.append((f, 0.5))
    for f in W.water_polys:
        polys.append((f, 0.5))
    for s_ in W.stadt['st']:
        p = list(zip(s_['p'][0::2], s_['p'][1::2]))
        lines.append((p, HALF_W.get(s_['k'], 1.5)))
    for p, hw in W.water_lines:
        lines.append((p, hw))
    seen = set()
    P = []
    for f, m in polys:
        key = (round(f[0][0], 1), round(f[0][1], 1), len(f))
        if key in seen:
            continue
        seen.add(key)
        c, r = O.px([q[0] for q in f], [q[1] for q in f])
        P.append((np.stack([c, r], 1), m / res))
    L = []
    for p, hw in lines:
        c, r = O.px([q[0] for q in p], [q[1] for q in p])
        L.append((np.stack([c, r], 1), hw / res))
    # the rows of the tiles flown in May (north of N = 5 597 000)
    may_rows = int(round((O.meta['n1'] - 5597000.0) / res))
    found = []
    for r0 in range(0, H, TILE):
        for c0 in range(0, Wd, TILE):
            ra, ca = max(0, r0 - PAD), max(0, c0 - PAD)
            rb, cb = min(H, r0 + TILE + PAD), min(Wd, c0 + TILE + PAD)
            cir = O.cir[ra:rb, ca:cb].astype(np.float32)
            rgb = O.rgb[ra:rb, ca:cb].astype(np.float32)
            ndvi = (cir[..., 0] - cir[..., 1]) / (cir[..., 0] + cir[..., 1] + 1e-3)
            g = rgb.mean(-1)
            t2 = lstd(g, 9)
            mask = Image.new('L', (cb - ca, rb - ra), 0)
            d = ImageDraw.Draw(mask)
            for pts, m in P:
                if pts[:, 0].max() < ca - 20 or pts[:, 0].min() > cb + 20 or pts[:, 1].max() < ra - 20 or pts[:, 1].min() > rb + 20:
                    continue
                q = [(x - ca, y - ra) for x, y in pts]
                d.polygon(q, fill=255)
                if m > 0:
                    d.line(q + [q[0]], fill=255, width=max(1, int(2 * m)))
            for pts, hw in L:
                if pts[:, 0].max() < ca - 40 or pts[:, 0].min() > cb + 40 or pts[:, 1].max() < ra - 40 or pts[:, 1].min() > rb + 40:
                    continue
                d.line([(x - ca, y - ra) for x, y in pts], fill=255, width=max(1, int(2 * hw + 2)))
            M = np.asarray(mask) > 0
            # the northern tiles were flown on 15.05.2024, with the leaves: there every crown is green, a conifer the darker in the
            # infrared (its blob's mean below 138); in the April tiles a conifer is the only crown green and dark
            may = (np.arange(ra, rb) < may_rows)[:, None] & np.ones((1, cb - ca), bool)
            rough = (t2 > 11) & (ndvi > 0.17) & (g > 50) & (g < 175)
            ever = (ndvi > 0.3) & (g < 80) & (t2 > 8) & ~may
            score = (rough | ever) & ~M
            sm = ndi.gaussian_filter(score.astype(np.float32), 5)
            blob = ndi.binary_opening(sm > 0.5, iterations=2)
            lab, n = ndi.label(blob)
            if not n:
                continue
            idx = range(1, n + 1)
            area = ndi.sum(blob, lab, idx) * res * res
            mayf = ndi.mean(may, lab, idx)
            nirm = ndi.mean(cir[..., 0], lab, idx)
            gm = ndi.mean(g, lab, idx)
            evf = np.where(mayf > 0.5, ((nirm < 138) & (gm < 75)).astype(float), ndi.mean(ever & blob, lab, idx))
            dist = ndi.distance_transform_edt(blob) * res
            peaks = (dist == ndi.maximum_filter(dist, size=int(3.5 / res))) & (dist > 1.1)
            pr, pc = np.nonzero(peaks)
            for rr, cc in zip(pr, pc):
                R, C = rr + ra, cc + ca
                if not (r0 <= R < r0 + TILE and c0 <= C < c0 + TILE):
                    continue
                k = lab[rr, cc] - 1
                if area[k] < 12:
                    continue
                x, y = O.model(C, R)
                found.append((float(x), float(y), float(dist[rr, cc]), float(evf[k]), float(area[k])))
    log(f'Kronen in den Luftbildern: {len(found)}')
    return found


def crown_trees(W, found):
    """the found crowns as trees: species from the place (conifer when evergreen; park, cemetery, garden, by the water), size from the crown"""
    out = []
    for x, y, d, evf, area in found:
        hs = (math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1
        hs2 = (math.sin(x * 39.3468 + y * 11.135) * 24634.6345) % 1
        place = W.place_kind(x, y)
        if evf > 0.45:
            art = 'nadel'
        elif place == 'wasser':
            art = ['esche', 'ahorn', 'birke', 'esche'][int(hs * 4)]
        elif place in ('park', 'friedhof'):
            art = ['linde', 'ahorn', 'kastanie', 'eiche', 'esche', 'linde'][int(hs * 6)]
        elif place == 'garten':
            art = ['obst', 'obst', 'obst', 'birke', 'ahorn', 'nadel'][int(hs * 6)]
        else:
            # yards and gardens of the houses: fruit trees, a conifer (spruce, thuja) in many front gardens, birch, maple, lime, ash
            art = ['obst', 'obst', 'nadel', 'ahorn', 'birke', 'linde', 'esche', 'kastanie', 'obst', 'nadel'][int(hs * 10)]
        r = max(1.6, min(6.5, d * 1.35))
        if art == 'nadel':
            h = max(5.0, min(22.0, 3.2 * r + 2 + 3 * hs2))
            r = min(r, 3.2)
        elif art == 'obst':
            h = max(3.5, min(9.0, 1.4 * r + 2.5 + 1.5 * hs2))
            r = min(r, 4.0)
        else:
            h = max(6.0, min(24.0, 2.3 * r + 3.5 + 3 * hs2))
        flags = F_IMG | (F_PARK if place in ('park', 'friedhof') else F_YARD)
        out.append((x, y, AI[art], h, r, flags))
    return out


# ---------------------------------------------------------------- OSM: single trees, tree rows, hedges ------------------------------
def osm_green(W, log):
    trees, hedges = [], []
    LEAF = {'needleleaved': 'nadel'}
    GENUS = {'Tilia': 'linde', 'Acer': 'ahorn', 'Aesculus': 'kastanie', 'Betula': 'birke', 'Fraxinus': 'esche', 'Quercus': 'eiche',
             'Picea': 'nadel', 'Pinus': 'nadel', 'Abies': 'nadel', 'Larix': 'nadel', 'Thuja': 'nadel', 'Malus': 'obst', 'Pyrus': 'obst',
             'Prunus': 'obst'}

    def art_of(tags, default='linde'):
        g = (tags.get('genus') or tags.get('species') or '').split(' ')[0]
        return GENUS.get(g) or LEAF.get(tags.get('leaf_type', '')) or default
    for nid, (lo, la, tags) in W.nodes.items():
        if tags.get('natural') == 'tree':
            x, y = W.xy[nid]
            h = float(tags.get('height', '0').split()[0] or 0) if tags.get('height', '').replace('.', '').isdigit() else 0
            trees.append((x, y, AI[art_of(tags, 'ahorn')], h or 11.0, 3.5, F_OSM))
    for wid, (refs, tags) in W.ways.items():
        if not all(r in W.xy for r in refs):
            continue
        pts = [W.xy[r] for r in refs]
        if tags.get('natural') == 'tree_row':
            st = stations(pts, 8.0)
            for s, x, y, tx, ty in st:
                trees.append((x, y, AI[art_of(tags, 'linde')], 12.0, 3.6, F_OSM | F_ROW))
        elif tags.get('barrier') == 'hedge':
            hedges.append(pts)
    log(f'OSM: {len(trees)} Bäume (einzeln und in Reihen), {len(hedges)} Hecken')
    return trees, hedges


def hedge_bushes(W, hedges):
    out = []
    for pts in hedges:
        for s, x, y, tx, ty in stations(pts, 1.4):
            hs = (math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1
            out.append((x, y, AI['hecke'], 1.6 + 0.5 * hs, 0.9, F_OSM | F_HEDGE))
    return out


# ---------------------------------------------------------------- putting it together -----------------------------------------------
def thin(trees, dmin_tree=3.0, dmin_hedge=0.9):
    """the first one wins: a tree within dmin of one kept is dropped (rows first, then OSM, then the pictures)"""
    H = Hash(8)
    kept = []
    for t in trees:
        hedge = t[5] & F_HEDGE
        d = dmin_hedge if hedge else dmin_tree
        ok = True
        for q in H.near(t[0], t[1], d):
            qh = q[5] & F_HEDGE
            dd = (dmin_hedge if (hedge and qh) else 1.6 if (hedge or qh) else d)
            if math.hypot(q[0] - t[0], q[1] - t[1]) < dd:
                ok = False
                break
        if ok:
            kept.append(t)
            H.add((t[0], t[1], t[0], t[1]), t)
    return kept


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('raw')
    ap.add_argument('--out', default=os.path.join(REPO, 'viz3', 'extra', 'stadtgruen', 'dist', 'stadtgruen'))
    ap.add_argument('--debug', default=None)
    a = ap.parse_args()
    t0 = time.time()
    logs = []

    def log(m):
        logs.append(m)
        print(m, flush=True)
    W = World(a.raw)
    O = Ortho(a.raw) if os.path.exists(os.path.join(a.raw, 'cir.png')) else None
    R = rows(W, O, log)
    osm_t, osm_h = osm_green(W, log)
    found = crowns(W, O, log) if O is not None and O.rgb is not None else []
    cand = [t for r in R for t in r['trees']] + osm_t + hedge_bushes(W, osm_h) + crown_trees(W, found)
    why = {}
    ok = []
    for t in cand:
        hedge = bool(t[5] & F_HEDGE)
        w = W.why_not(t[0], t[1], 0.08 if hedge else 0.25, hedge, own=t[6] if len(t) > 6 else None)
        if w:
            why[w] = why.get(w, 0) + 1
            continue
        ok.append(t[:6])
    trees = thin(ok)
    log(f'{len(cand)} Kandidaten, {len(trees)} Bäume und Büsche; ausgelassen: {why}')
    b = []
    for x, y, art, h, r, f in trees:
        b += [int(round(x * 10)), int(round(y * 10)), int(art), int(round(h * 10)), int(round(r * 10)), int(f)]
    by_art = {}
    for t in trees:
        by_art[ARTEN[t[2]]] = by_art.get(ARTEN[t[2]], 0) + 1
    out = {
        'v': 1,
        'made': time.strftime('%Y-%m-%d'),
        'src': 'Straßenbäume und Grün von Schleusingen: Lage aus den Orthophotos DOP 20 cm in Farbe und Infrarot © GDI-Th (dl-de/by-2-0) '
               'und OpenStreetMap © OpenStreetMap-Mitwirkende (ODbL 1.0); Arten, Größe und Abstand der Alleen geprüft an privaten '
               'Ansichten von der Straße (nicht veröffentlicht).',
        'zone': W.zone,
        'arten': ARTEN,
        'b': b,
        'reihen': [{'n': r['n'], 's': r['s'], 'art': r['art'], 'sp': r['sp'], 'n_b': len(r['trees'])} for r in R],
        'anzahl': by_art,
    }
    os.makedirs(a.out, exist_ok=True)
    p = os.path.join(a.out, 'baeume.json')
    json.dump(out, open(p, 'w'), separators=(',', ':'))
    log(f'{p}: {len(trees)} ({by_art}), {os.path.getsize(p) / 1024:.0f} KB in {time.time() - t0:.0f} s')
    if a.debug:
        os.makedirs(a.debug, exist_ok=True)
        json.dump({'trees': trees, 'logs': logs}, open(os.path.join(a.debug, 'baeume_debug.json'), 'w'))


if __name__ == '__main__':
    main()
