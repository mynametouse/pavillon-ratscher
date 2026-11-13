"""suhllib – the common ground of all Suhl data tools (stage 2 of the Suhl plan, package S2-0 "Datenhaus", agent suhl-daten).

Use it from any tool below tools/suhl/ (works with `python3 -I`, needs only the standard library; numpy arrays are accepted where noted):

    import os, sys
    sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'lib'))
    import suhllib as S

    S.guard(box=my_utm_box, what='suhl-gebaeude')            # FIRST call of every tool: is the centre of Suhl inside my box?
    for x, y in S.area_tiles('zentrum', 10): ...              # level-10 tiles (400 m) touching an area
    S.tile_path('g', 0, 10, x, y)                             # 'suhl/g/v0/10/497/542.json'
    S.guard_count(len(buildings), 'buildings', 'stadt')       # plausible number? otherwise stop with a clear message

What is here:
  tiles        the quadtree of tools/welt/wlib.py (imported, never copied): keys, bounds, tiles touching an area, parents and children
  paths        suhl/<product>/v<N>/<L>/<x>/<y>.<ext> (plan 2.4), the registry PRODUCTS
  coordinates  UTM 32N <-> model metres (xf of viz3/manifests.json), UTM <-> WGS84 (Krüger series, sub-millimetre, no pyproj needed)
  areas        stadt, kernstadt, zentrum from tools/suhl/out/bestand/gebiete.geojson: point in area, tiles of an area
  probe        the sample tiles (level 10, touching zentrum) -> probe.json next to this file
  guard        centre of Suhl inside the box, plausible counts (the lesson of 26.10.2026: a typo sent the old run to Nigeria)
  tile sets    which tiles exist per level, as a bit field (index.json)
  http         polite GET with our User-Agent, pauses per host, retries with backoff, an on-disk cache given by the caller

Frames: UTM = ETRS89 / UTM zone 32N (EPSG:25832), metres. Model = the app's metres (x east, y north), origin Falko's garden;
one model metre is 1.0157 m and the axes are turned by 4.36 degrees: areas and lengths for scenarios are computed in UTM, never in the
model. Longitude/latitude: WGS84 = ETRS89 here (the 0.8 m plate drift is ignored, exactly as EPSG:25832 <-> EPSG:4326 in pyproj does).
ALL functions take and return (lon, lat) - x first, like GeoJSON - and refuse swapped arguments.
"""
import base64, hashlib, json, math, os, sys, time, urllib.error, urllib.parse, urllib.request

VERSION = '0.1.0'          # of this library
SCHEMA = 1                 # schema number of the Suhl products (docs/features/suhl-daten.md); raised when a reader must change

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))


def _load_wlib():
    """tools/welt/wlib.py (the quadtree and xf live there; imported, never copied or changed) - loaded by its file path, so that
    sys.path stays as the caller set it: a tool's own roads.py or fetch.py is never shadowed by the modules of tools/welt"""
    import importlib.util
    path = os.path.join(REPO, 'tools', 'welt', 'wlib.py')
    m = sys.modules.get('wlib')
    if m is not None and os.path.abspath(getattr(m, '__file__', '') or '') == path:
        return m
    spec = importlib.util.spec_from_file_location('wlib' if m is None else 'suhl_wlib', path)
    m = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = m
    spec.loader.exec_module(m)
    return m


wlib = _load_wlib()

UA = 'PavillonRatscher-Suhl/0.1 (+https://github.com/mynametouse/pavillon-ratscher)'
CENTRE_UTM = (619762.0, 5607680.0)       # the centre of Suhl every tool checks (brief suhl-daten; the Markt)
CENTRE_LONLAT = (10.6926437, 50.6086518)  # admin centre of OSM relation 62450 (gebiete.geojson), 7 m from CENTRE_UTM
GARDEN_LONLAT = (10.7692, 50.4991)        # the model origin, up to a few metres
O_MODEL = (-4698.2, 12255.7)              # SUHL.O of the plan (6.1): CENTRE_LONLAT in model metres, the reference point for people and tests
CONTENT_LEVEL = 10                        # buildings, streets, trees, furniture: level-10 tiles (400 m)
FAR_LEVEL = 8                             # far models: level-8 tiles (1.6 km)
DATA_REPO = 'mynametouse/pavillon-daten'
BASE_DEFAULT = 'https://mynametouse.github.io/pavillon-daten/suhl/'   # SUHL.BASE in the app (override ?suhl=<url>)
GEBIETE = os.path.join(REPO, 'tools', 'suhl', 'out', 'bestand', 'gebiete.geojson')
PROBE_JSON = os.path.join(HERE, 'probe.json')

# the products of plan 2.4. 'tiles': sub folder -> (levels, extension); '' = the tiles lie directly in the version folder.
PRODUCTS = {
    'boden': {'title': 'Gelände und Luftbild', 'owner': 'suhl-boden', 'index': 'index.json',     # plus meta.json in the layout WELT reads
              'tiles': {'t': ((6, 12), 'bin'), 'i': ((6, 12), 'webp')}},
    'g': {'title': 'Gebäude', 'owner': 'suhl-gebaeude', 'index': 'index.json', 'tiles': {'': ((10, 10), 'json')}},
    'da': {'title': 'Dach-Atlas', 'owner': 'suhl-dach (Stufe 3)', 'index': 'index.json', 'tiles': {'': ((10, 10), 'webp')}},
    's': {'title': 'Straßenraum', 'owner': 'suhl-strassen', 'index': 'index.json', 'tiles': {'': ((10, 10), 'json')}},
    'b': {'title': 'Bäume', 'owner': 'suhl-gruen', 'index': 'index.json', 'tiles': {'': ((10, 10), 'bin')}},
    'm': {'title': 'Möbel der Straße', 'owner': 'suhl-strassen', 'index': 'index.json', 'tiles': {'': ((10, 10), 'json')}},
    'f': {'title': 'Fernmodell', 'owner': 'suhl-fern', 'index': 'index.json', 'tiles': {'': ((8, 8), 'bin')}},
    'd': {'title': 'Szenario-Zahlen', 'owner': 'suhl-daten', 'index': 'index.json', 'tiles': {'': ((10, 10), 'json')}},
    '_probe': {'title': 'Probe des Veröffentlichens', 'owner': 'suhl-daten', 'index': 'index.json', 'tiles': {'': ((10, 10), 'json')}},
}


class SuhlError(Exception):
    pass


class GuardError(SystemExit):
    """raised by the guards: an uncaught one ends the tool with the message on stderr and exit status 1 (no traceback)"""


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


# ------------------------------------------------------------------ tiles (the quadtree of tools/welt/wlib.py)
ROOT_E0, ROOT_N0, ROOT_SIZE = wlib.ROOT_E0, wlib.ROOT_N0, wlib.ROOT_SIZE
tsize, tbounds, tcentre = wlib.tsize, wlib.tbounds, wlib.tcentre


def tile_at(L, E, N):
    """the tile (x, y) of level L that holds the UTM point (a point on an edge belongs to the tile north-east of it)"""
    s = tsize(L)
    return int(math.floor((E - ROOT_E0) / s)), int(math.floor((N - ROOT_N0) / s))


def tile_key(L, x, y):
    return f'{int(L)}/{int(x)}/{int(y)}'


def parse_key(key):
    """'10/497/542' (also with a file extension or a path in front) -> (10, 497, 542)"""
    p = str(key).replace('\\', '/').split('/')[-3:]
    if len(p) != 3:
        raise SuhlError(f'not a tile key: {key!r}')
    p[2] = p[2].split('.')[0]
    try:
        L, x, y = (int(v) for v in p)
    except ValueError:
        raise SuhlError(f'not a tile key: {key!r}') from None
    if not (0 <= L <= 20 and 0 <= x < (1 << L) and 0 <= y < (1 << L)):
        raise SuhlError(f'tile key out of range: {key!r}')
    return L, x, y


def tile_parent(L, x, y, up=1):
    return L - up, x >> up, y >> up


def tile_children(L, x, y, down=1):
    """the tiles of level L + down inside the tile, rows from the south, each row from the west"""
    k = 1 << down
    return [(L + down, x * k + i, y * k + j) for j in range(k) for i in range(k)]


def tiles_in_box(L, box):
    """tiles (x, y) of level L covering the UTM box (E0, N0, E1, N1), rounded outwards; rows from the south"""
    return wlib.tiles(L, box)


def tile_model(L, x, y):
    """the tile in model metres: {'centre': (x, y), 'corners': [SW, SE, NE, NW], 'bbox': (x0, y0, x1, y1)}.
    A tile is a square in UTM and therefore a square turned by 4.36 degrees in the model; 'bbox' is its axis-parallel hull."""
    e0, n0, e1, n1 = tbounds(L, x, y)
    c = [model_from_utm(e, n) for e, n in ((e0, n0), (e1, n0), (e1, n1), (e0, n1))]
    return {'centre': model_from_utm((e0 + e1) / 2, (n0 + n1) / 2), 'corners': c,
            'bbox': (min(p[0] for p in c), min(p[1] for p in c), max(p[0] for p in c), max(p[1] for p in c))}


def utm_tiles_1km(box):
    """the state's 1-km tiles (DGM1, DOM1) touching a UTM box: [(E km, N km)] of their lower-left corners"""
    x0, y0 = int(math.floor(box[0] / 1000 + 1e-9)), int(math.floor(box[1] / 1000 + 1e-9))
    x1, y1 = int(math.ceil(box[2] / 1000 - 1e-9)), int(math.ceil(box[3] / 1000 - 1e-9))
    return [(x, y) for y in range(y0, y1) for x in range(x0, x1)]


# ------------------------------------------------------------------ product paths (plan 2.4)
def product_dir(product, version):
    """'suhl/g/v0' - the folder of one product version in the data repo (never overwritten, see aktuell.json)"""
    if product not in PRODUCTS:
        raise SuhlError(f'unknown product {product!r} (known: {", ".join(sorted(PRODUCTS))})')
    v = int(str(version).lstrip('v'))
    if v < 0:
        raise SuhlError(f'version must be >= 0: {version!r}')
    return f'suhl/{product}/v{v}'


def tile_path(product, version, L, x, y, sub=None, ext=None):
    """'suhl/g/v0/10/497/542.json'; for the ground: tile_path('boden', 1, 12, x, y, sub='t') -> 'suhl/boden/v1/t/12/x/y.bin'"""
    d = product_dir(product, version)
    t = PRODUCTS[product]['tiles']
    if sub is None:
        if '' not in t:
            raise SuhlError(f'product {product!r} needs sub= one of {sorted(t)}')
        sub = ''
    if sub not in t:
        raise SuhlError(f'product {product!r} has no tile folder {sub!r} (has {sorted(t)})')
    (l0, l1), e = t[sub]
    if not l0 <= L <= l1:
        raise SuhlError(f'product {product!r}{"/" + sub if sub else ""} has levels {l0}..{l1}, not {L}')
    return f'{d}/{sub + "/" if sub else ""}{tile_key(L, x, y)}.{ext or e}'


def index_path(product, version):
    return f'{product_dir(product, version)}/{PRODUCTS[product]["index"]}'


# ------------------------------------------------------------------ coordinates
XF, H0 = wlib.XF, wlib.H0          # model -> UTM: E = a x - b y + ex, N = b x + a y + ey; model z = NHN - H0
MODEL_SCALE = math.hypot(XF['a'], XF['b'])                 # 1.015725 m per model metre
MODEL_TURN_DEG = math.degrees(math.atan2(XF['b'], XF['a']))   # 4.3566 degrees


def model_from_utm(E, N):
    """UTM -> model metres (x east, y north); scalars or numpy arrays"""
    a, b = XF['a'], XF['b']
    s2 = a * a + b * b
    dx, dy = E - XF['ex'], N - XF['ey']
    return (a * dx + b * dy) / s2, (-b * dx + a * dy) / s2


def utm_from_model(x, y):
    """model metres -> UTM; scalars or numpy arrays"""
    a, b = XF['a'], XF['b']
    return a * x - b * y + XF['ex'], b * x + a * y + XF['ey']


def model_z(nhn):
    """height above NHN (DHHN2016) -> model z; heights are true metres"""
    return nhn - H0


# ETRS89 / UTM zone 32N on GRS80, Krüger series to n^4 (error below 0.01 mm inside the zone)
_A, _F, _K0, _LON0, _FE = 6378137.0, 1 / 298.257222101, 0.9996, math.radians(9.0), 500000.0
_N = _F / (2 - _F)
_AA = _A / (1 + _N) * (1 + _N ** 2 / 4 + _N ** 4 / 64 + _N ** 6 / 256)
_ALPHA = (_N / 2 - 2 * _N ** 2 / 3 + 5 * _N ** 3 / 16 + 41 * _N ** 4 / 180, 13 * _N ** 2 / 48 - 3 * _N ** 3 / 5 + 557 * _N ** 4 / 1440,
          61 * _N ** 3 / 240 - 103 * _N ** 4 / 140, 49561 * _N ** 4 / 161280)
_BETA = (_N / 2 - 2 * _N ** 2 / 3 + 37 * _N ** 3 / 96 - _N ** 4 / 360, _N ** 2 / 48 + _N ** 3 / 15 - 437 * _N ** 4 / 1440,
         17 * _N ** 3 / 480 - 37 * _N ** 4 / 840, 4397 * _N ** 4 / 161280)
_DELTA = (2 * _N - 2 * _N ** 2 / 3 - 2 * _N ** 3 + 116 * _N ** 4 / 45, 7 * _N ** 2 / 3 - 8 * _N ** 3 / 5 - 227 * _N ** 4 / 45,
          56 * _N ** 3 / 15 - 136 * _N ** 4 / 35, 4279 * _N ** 4 / 630)
_E2N = 2 * math.sqrt(_N) / (1 + _N)


class _NP:
    """numpy under the names of math (only used when an argument is an array)"""
    def __init__(self):
        import numpy as np
        self.sin, self.cos, self.sinh, self.cosh, self.sqrt = np.sin, np.cos, np.sinh, np.cosh, np.sqrt
        self.atan2, self.atanh, self.asin, self.radians, self.degrees = np.arctan2, np.arctanh, np.arcsin, np.radians, np.degrees


_np_ns = []


def _ns(*v):
    if any(hasattr(q, '__len__') for q in v):
        if not _np_ns:
            _np_ns.append(_NP())
        return _np_ns[0], True
    return math, False


def _check_lonlat(lon, lat, arr):
    if arr:
        import numpy as np
        lo0, lo1, la0, la1 = float(np.min(lon)), float(np.max(lon)), float(np.min(lat)), float(np.max(lat))
    else:
        lo0 = lo1 = float(lon)
        la0 = la1 = float(lat)
    if 45.0 <= lo0 and lo1 <= 56.0 and 4.0 <= la0 and la1 <= 17.0:
        raise SuhlError(f'longitude {lo0:.4f} / latitude {la0:.4f}: looks like (lat, lon) - suhllib takes (lon, lat), x first')
    if not (-180.0 <= lo0 and lo1 <= 180.0 and -90.0 <= la0 and la1 <= 90.0):
        raise SuhlError(f'longitude {lo0}..{lo1} / latitude {la0}..{la1} out of range')


def utm_from_lonlat(lon, lat):
    """WGS84 (lon, lat in degrees) -> UTM 32N (E, N); scalars or numpy arrays"""
    m, arr = _ns(lon, lat)
    if arr:
        import numpy as np
        lon, lat = np.asarray(lon, float), np.asarray(lat, float)
    _check_lonlat(lon, lat, arr)
    ph, dl = m.radians(lat), m.radians(lon) - _LON0
    sp = m.sin(ph)
    t = m.sinh(m.atanh(sp) - _E2N * m.atanh(_E2N * sp))
    xi, eta = m.atan2(t, m.cos(dl)), m.atanh(m.sin(dl) / m.sqrt(1 + t * t))
    x, y = xi, eta
    for j, al in enumerate(_ALPHA, 1):
        x = x + al * m.sin(2 * j * xi) * m.cosh(2 * j * eta)
        y = y + al * m.cos(2 * j * xi) * m.sinh(2 * j * eta)
    return _FE + _K0 * _AA * y, _K0 * _AA * x


def lonlat_from_utm(E, N):
    """UTM 32N -> WGS84 (lon, lat in degrees); scalars or numpy arrays"""
    m, arr = _ns(E, N)
    if arr:
        import numpy as np
        E, N = np.asarray(E, float), np.asarray(N, float)
    xi, eta = N / (_K0 * _AA), (E - _FE) / (_K0 * _AA)
    x, y = xi, eta
    for j, be in enumerate(_BETA, 1):
        x = x - be * m.sin(2 * j * xi) * m.cosh(2 * j * eta)
        y = y - be * m.cos(2 * j * xi) * m.sinh(2 * j * eta)
    chi = m.asin(m.sin(x) / m.cosh(y))
    ph = chi
    for j, de in enumerate(_DELTA, 1):
        ph = ph + de * m.sin(2 * j * chi)
    return m.degrees(_LON0 + m.atan2(m.sinh(y), m.cos(x))), m.degrees(ph)


def model_from_lonlat(lon, lat):
    return model_from_utm(*utm_from_lonlat(lon, lat))


def lonlat_from_model(x, y):
    return lonlat_from_utm(*utm_from_model(x, y))


def convergence_deg(E, N):
    """meridian convergence at a UTM point in degrees: grid north lies this far EAST (clockwise) of true north (+1.31 at Suhl)"""
    lon, lat = lonlat_from_utm(E, N)
    return math.degrees(math.atan(math.tan(math.radians(lon) - _LON0) * math.sin(math.radians(lat))))


def true_azimuth_from_grid(az, E=None, N=None):
    """a bearing on the UTM grid (degrees clockwise from grid north) -> azimuth from geographic north"""
    return (az + convergence_deg(*(CENTRE_UTM if E is None else (E, N)))) % 360.0


def true_azimuth_from_model(az, E=None, N=None):
    """an azimuth in the model (degrees clockwise from the model's +y axis) -> azimuth from geographic north (about az - 3.05 at Suhl)"""
    return (az - MODEL_TURN_DEG + convergence_deg(*(CENTRE_UTM if E is None else (E, N)))) % 360.0


def model_azimuth_from_true(az, E=None, N=None):
    return (az + MODEL_TURN_DEG - convergence_deg(*(CENTRE_UTM if E is None else (E, N)))) % 360.0


class TileFrame:
    """the local frame of one tile, in which every Suhl content file gives its positions:
        x = model x - ox, y = model y - oy   with (ox, oy) = the tile centre in model metres (the file's field 'o'),
        z = NHN - H0 (true metres, the model's z).
    Axes parallel to the model axes (x east, y north, both turned 4.36 degrees against UTM); lengths are model metres
    (1 model metre = 1.0157 m). In three.js: mesh.position = (ox, 0, -oy), vertex = (x, z, -y)."""

    def __init__(self, L, x, y):
        self.L, self.x, self.y = L, x, y
        self.key = tile_key(L, x, y)
        self.utm = tbounds(L, x, y)
        self.centre_utm = tcentre(L, x, y)
        self.o = model_from_utm(*self.centre_utm)

    def from_utm(self, E, N):
        """UTM -> tile-local metres; scalars or numpy arrays"""
        mx, my = model_from_utm(E, N)
        return mx - self.o[0], my - self.o[1]

    def to_utm(self, x, y):
        return utm_from_model(x + self.o[0], y + self.o[1])

    def from_model(self, mx, my):
        return mx - self.o[0], my - self.o[1]

    def to_model(self, x, y):
        return x + self.o[0], y + self.o[1]

    def holds(self, E, N):
        """does the tile own the UTM point? (west and south edges belong to it, east and north edges to the neighbours)"""
        return tile_at(self.L, E, N) == (self.x, self.y)

    def o_json(self):
        return [round(self.o[0], 3), round(self.o[1], 3)]


def tile_frame(L, x, y):
    return TileFrame(L, x, y)


def in_box(box, E, N):
    return box[0] <= E <= box[2] and box[1] <= N <= box[3]


# ------------------------------------------------------------------ polygons (plain Python; rings are lists of (E, N))
def _ring_area(r):
    s = 0.0
    for k in range(len(r)):
        (x0, y0), (x1, y1) = r[k - 1], r[k]
        s += x0 * y1 - x1 * y0
    return s / 2


def _point_in_rings(rings, x, y):
    """even-odd rule over all rings (outer rings and holes of all parts)"""
    c = False
    for r in rings:
        n = len(r)
        j = n - 1
        for i in range(n):
            xi, yi = r[i]
            xj, yj = r[j]
            if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
                c = not c
            j = i
    return c


def _seg_hits_box(x0, y0, x1, y1, bx0, by0, bx1, by1):
    """does the segment touch the closed box? (Liang-Barsky)"""
    dx, dy = x1 - x0, y1 - y0
    t0, t1 = 0.0, 1.0
    for p, q in ((-dx, x0 - bx0), (dx, bx1 - x0), (-dy, y0 - by0), (dy, by1 - y0)):
        if p == 0:
            if q < 0:
                return False
        else:
            t = q / p
            if p < 0:
                if t > t1:
                    return False
                t0 = max(t0, t)
            else:
                if t < t0:
                    return False
                t1 = min(t1, t)
    return True


def rings_tiles(rings, L):
    """tiles (x, y) of level L whose closed square touches the polygon given by its rings (even-odd), sorted by (y, x)"""
    s = tsize(L)
    out = set()
    for r in rings:                                   # 1. tiles crossed by the boundary
        n = len(r)
        for i in range(n):
            (ax, ay), (bx, by) = r[i - 1], r[i]
            tx0, ty0 = tile_at(L, min(ax, bx), min(ay, by))
            tx1, ty1 = tile_at(L, max(ax, bx), max(ay, by))
            for ty in range(ty0, ty1 + 1):
                for tx in range(tx0, tx1 + 1):
                    if (tx, ty) in out:
                        continue
                    e0, n0 = ROOT_E0 + tx * s, ROOT_N0 + ty * s
                    if _seg_hits_box(ax, ay, bx, by, e0, n0, e0 + s, n0 + s):
                        out.add((tx, ty))
    ys = [p[1] for r in rings for p in r]             # 2. tiles whose centre lies inside (scan line per row of centres)
    y0, y1 = tile_at(L, 0, min(ys))[1], tile_at(L, 0, max(ys))[1]
    for ty in range(y0, y1 + 1):
        yc = ROOT_N0 + (ty + 0.5) * s
        xs = []
        for r in rings:
            n = len(r)
            for i in range(n):
                (ax, ay), (bx, by) = r[i - 1], r[i]
                if (ay > yc) != (by > yc):
                    xs.append(ax + (bx - ax) * (yc - ay) / (by - ay))
        xs.sort()
        for k in range(0, len(xs) - 1, 2):
            c0 = int(math.ceil((xs[k] - ROOT_E0) / s - 0.5))
            c1 = int(math.floor((xs[k + 1] - ROOT_E0) / s - 0.5))
            for tx in range(c0, c1 + 1):
                out.add((tx, ty))
    return sorted(out, key=lambda t: (t[1], t[0]))


def rings_touch_box(rings, box):
    """does the polygon (its rings, even-odd) touch the closed UTM box (E0, N0, E1, N1)?"""
    bx0, by0, bx1, by1 = box
    for r in rings:
        for i in range(len(r)):
            (ax, ay), (bx, by) = r[i - 1], r[i]
            if _seg_hits_box(ax, ay, bx, by, bx0, by0, bx1, by1):
                return True
    return _point_in_rings(rings, (bx0 + bx1) / 2, (by0 + by1) / 2)


# ------------------------------------------------------------------ areas (stadt, kernstadt, zentrum)
class Area:
    """one area of gebiete.geojson in UTM. rings: every ring of every part (outer and holes, closing point dropped)"""

    def __init__(self, aid, props, rings):
        self.id, self.props, self.rings = aid, props, rings
        self.name = props.get('name', aid)
        es = [p[0] for r in rings for p in r]
        ns = [p[1] for r in rings for p in r]
        self.bbox = (min(es), min(ns), max(es), max(ns))
        self._tiles = {}

    def contains(self, E, N):
        """is the UTM point inside the area?"""
        b = self.bbox
        return b[0] <= E <= b[2] and b[1] <= N <= b[3] and _point_in_rings(self.rings, E, N)

    def contains_lonlat(self, lon, lat):
        return self.contains(*utm_from_lonlat(lon, lat))

    def contains_model(self, x, y):
        return self.contains(*utm_from_model(x, y))

    def tiles(self, L=CONTENT_LEVEL):
        """tiles (x, y) of level L touching the area, sorted by (y, x)"""
        if L not in self._tiles:
            self._tiles[L] = rings_tiles(self.rings, L)
        return list(self._tiles[L])

    def touches_box(self, box):
        """does the area touch the UTM box (E0, N0, E1, N1)?"""
        b = self.bbox
        return not (box[2] < b[0] or box[0] > b[2] or box[3] < b[1] or box[1] > b[3]) and rings_touch_box(self.rings, box)

    def state_tiles_1km(self, margin=0.0):
        """the state's 1-km tiles (DGM1, DOM1, nDOM1) that come within `margin` metres of the area: [(E km, N km)], rows from the south"""
        b = self.bbox
        out = []
        for e, n in utm_tiles_1km((b[0] - margin, b[1] - margin, b[2] + margin, b[3] + margin)):
            if self.touches_box((e * 1000 - margin, n * 1000 - margin, e * 1000 + 1000 + margin, n * 1000 + 1000 + margin)):
                out.append((e, n))
        return out

    def area_m2(self):
        """area on the UTM grid (the grid scale at Suhl is 0.99978: true areas are 0.04 % larger)"""
        return sum(_ring_area(r) for r in self.rings)     # outer rings are counter-clockwise (+), holes clockwise (-)

    def __repr__(self):
        return f'<Area {self.id} {len(self.rings)} ring(s) bbox {tuple(round(v) for v in self.bbox)}>'


_areas = {}


def load_areas(path=None):
    """{id: Area} for every polygon of gebiete.geojson (stadt, kernstadt, zentrum, the Ortsteil boundaries); cached per path"""
    path = path or GEBIETE
    if path in _areas:
        return _areas[path]
    if not os.path.exists(path):
        raise SuhlError(f'{path} is missing - it comes with the branch suhl/basis (stage 1, agent suhl-bestand)')
    d = read_json(path)
    out = {}
    for f in d['features']:
        g = f.get('geometry') or {}
        if g.get('type') not in ('Polygon', 'MultiPolygon'):
            continue
        parts = [g['coordinates']] if g['type'] == 'Polygon' else g['coordinates']
        rings = []
        for part in parts:
            for k, ring in enumerate(part):
                pts = [utm_from_lonlat(float(c[0]), float(c[1])) for c in ring]
                if len(pts) > 1 and pts[0] == pts[-1]:
                    pts = pts[:-1]
                if (_ring_area(pts) > 0) != (k == 0):     # outer rings counter-clockwise, holes clockwise
                    pts.reverse()
                rings.append(pts)
        out[f['properties']['id']] = Area(f['properties']['id'], f['properties'], rings)
    for need in ('stadt', 'kernstadt', 'zentrum'):
        if need not in out:
            raise SuhlError(f'{path}: area {need!r} is missing')
    _areas[path] = out
    return out


def area(aid, path=None):
    a = load_areas(path)
    if aid not in a:
        raise SuhlError(f'unknown area {aid!r} (known: {", ".join(a)})')
    return a[aid]


def in_area(aid, E, N):
    """is the UTM point inside 'stadt' | 'kernstadt' | 'zentrum' | '<Ortsteil boundary id>'?"""
    return area(aid).contains(E, N)


def area_tiles(aid, L=CONTENT_LEVEL):
    """tiles (x, y) of level L touching the area, sorted by (y, x)"""
    return area(aid).tiles(L)


def areas_at(E, N):
    """ids of the three main areas holding the UTM point, largest first"""
    return [k for k in ('stadt', 'kernstadt', 'zentrum') if in_area(k, E, N)]


def landmarks(path=None):
    """the points of gebiete.geojson (landmarks, Ortsteile): [{'id', 'art', 'name', 'utm': (E, N), 'model': (x, y), ...}]"""
    d = read_json(path or GEBIETE)
    out = []
    for f in d['features']:
        g = f.get('geometry') or {}
        if g.get('type') != 'Point':
            continue
        e, n = utm_from_lonlat(float(g['coordinates'][0]), float(g['coordinates'][1]))
        p = dict(f['properties'])
        p['utm'], p['model'] = (e, n), model_from_utm(e, n)
        out.append(p)
    return out


# ------------------------------------------------------------------ the sample set (Probesatz)
def probe_tiles():
    """the sample tiles: [(10, x, y)] of the level-10 tiles touching zentrum"""
    return [(CONTENT_LEVEL, x, y) for x, y in area_tiles('zentrum', CONTENT_LEVEL)]


def probe_doc():
    """the content of probe.json (deterministic: no time stamp)"""
    z = area('zentrum')
    tl = []
    for L, x, y in probe_tiles():
        e0, n0, e1, n1 = tbounds(L, x, y)
        m = tile_model(L, x, y)
        r3 = lambda v: round(v, 3)   # noqa: E731
        tl.append({'key': tile_key(L, x, y), 'x': x, 'y': y, 'utm': [e0, n0, e1, n1], 'centre_utm': [(e0 + e1) / 2, (n0 + n1) / 2],
                   'centre_model': [r3(v) for v in m['centre']], 'corners_model': [[r3(v) for v in c] for c in m['corners']],
                   'bbox_model': [r3(v) for v in m['bbox']], 'o': [r3(v) for v in m['centre']], 'centre_in_zentrum': z.contains((e0 + e1) / 2, (n0 + n1) / 2),
                   'has_markt': in_box((e0, n0, e1, n1), *CENTRE_UTM)})
    box = (min(t['utm'][0] for t in tl), min(t['utm'][1] for t in tl), max(t['utm'][2] for t in tl), max(t['utm'][3] for t in tl))
    cm = model_from_utm(*CENTRE_UTM)
    return {
        'v': 1, 'what': 'Probesatz Zentrum: the level-10 tiles (400 m) touching the area zentrum; every data package delivers these first',
        'area': 'zentrum', 'level': CONTENT_LEVEL, 'tile_m': tsize(CONTENT_LEVEL), 'n': len(tl),
        'from': 'tools/suhl/out/bestand/gebiete.geojson (suhl-bestand, OSM, ODbL) with tools/suhl/lib/suhllib.py probe_doc()',
        'frames': {'utm': 'ETRS89 / UTM 32N (EPSG:25832) [E0, N0, E1, N1] metres',
                   'model': 'the app metres [x east, y north]; a tile is a square turned by 4.36 degrees there',
                   'tile local': 'x = model x - o[0], y = model y - o[1] with o = centre_model of the tile (model metres, axes parallel '
                                 'to the model axes), z = NHN - H0 (true metres); see suhllib.TileFrame',
                   'H0': H0, 'xf': XF},
        'centre_utm': list(CENTRE_UTM), 'centre_model': [round(v, 3) for v in cm], 'suhl_o_model': list(O_MODEL), 'centre_tile': tile_key(CONTENT_LEVEL, *tile_at(CONTENT_LEVEL, *CENTRE_UTM)),
        'bbox_utm': list(box), 'state_tiles_1km': [list(t) for t in utm_tiles_1km(box)],
        'children': 'level 11: (2x, 2y) .. (2x+1, 2y+1); level 12: (4x, 4y) .. (4x+3, 4y+3)',
        'tiles': tl,
    }


def probe_text():
    """probe.json as text: one key per line, one tile per line (readable in a diff)"""
    d = probe_doc()
    dj = lambda v: json.dumps(v, ensure_ascii=False, separators=(', ', ': '))   # noqa: E731
    rows = [f' {dj(k)}: {dj(v)}' for k, v in d.items() if k != 'tiles']
    rows.append(' "tiles": [\n' + ',\n'.join('  ' + dj(t) for t in d['tiles']) + '\n ]')
    return '{\n' + ',\n'.join(rows) + '\n}\n'


def probe(path=None):
    """probe.json as it is committed (for tools that only need the list)"""
    return read_json(path or PROBE_JSON)


# ------------------------------------------------------------------ the guard
# plausible counts, (min, max) per area; None = no bound. Reference numbers (13.11.2026): OSM buildings >= 40 m2 kernstadt 16 168,
# zentrum 595 (gebiete.geojson); named streets kernstadt 358, zentrum 49 (suhl-fotos abdeckung.json); OSM ways in the frame of the
# kernstadt 6 577; plan 5.3: "more than 10 000 buildings found, otherwise stop".
PLAUSIBLE = {
    'buildings': {'stadt': (10000, 80000), 'kernstadt': (10000, 60000), 'zentrum': (300, 3000)},
    'streets': {'stadt': (300, 3000), 'kernstadt': (250, 2000), 'zentrum': (30, 300)},      # named streets
    'ways': {'stadt': (4000, 80000), 'kernstadt': (3000, 40000), 'zentrum': (150, 6000)},   # OSM highway ways
    'trees': {'stadt': (20000, None), 'kernstadt': (5000, None), 'zentrum': (100, None)},
}


def guard_box(box, what=''):
    """box = (E0, N0, E1, N1) in UTM 32N. Stops when the centre of Suhl is not inside."""
    try:
        e0, n0, e1, n1 = (float(v) for v in box)
    except Exception:
        raise GuardError(f'SUHL GUARD {what}: the box {box!r} is not (E0, N0, E1, N1)') from None
    hint = ''
    if -180 <= e0 <= 180 and -180 <= e1 <= 180:
        hint = ' - these look like degrees: use guard(lonlat_box=(lon0, lat0, lon1, lat1))'
    elif e0 > 1e6 or n0 < 1e6:
        hint = ' - E and N swapped, or a zone prefix (32...) in front of E?'
    if not (e0 < e1 and n0 < n1):
        raise GuardError(f'SUHL GUARD {what}: the box {box!r} is empty or turned round (need E0 < E1, N0 < N1){hint}')
    if not in_box((e0, n0, e1, n1), *CENTRE_UTM):
        raise GuardError(f'SUHL GUARD {what}: the centre of Suhl (UTM 32N E {CENTRE_UTM[0]:.0f}, N {CENTRE_UTM[1]:.0f}) is NOT inside the box '
                         f'E {e0:.0f}..{e1:.0f}, N {n0:.0f}..{n1:.0f}{hint}. Nothing was fetched or written. '
                         f'(If the box is a part of the city on purpose, pass part_of="stadt" and the guard checks that instead.)')
    return True


def guard_part(box, part_of='stadt', what=''):
    """for tools that work on a part (one tile, one block): the box must overlap the area's bounding box and lie in Thuringia's south"""
    e0, n0, e1, n1 = (float(v) for v in box)
    b = area(part_of).bbox
    if not (e0 < e1 and n0 < n1) or e1 < b[0] or e0 > b[2] or n1 < b[1] or n0 > b[3]:
        raise GuardError(f'SUHL GUARD {what}: the box E {e0:.0f}..{e1:.0f}, N {n0:.0f}..{n1:.0f} does not touch the area {part_of!r} '
                         f'(E {b[0]:.0f}..{b[2]:.0f}, N {b[1]:.0f}..{b[3]:.0f}). Nothing was fetched or written.')
    return True


def guard_count(n, kind, aid='stadt', lo=None, hi=None, what=''):
    """a plausible number of buildings / streets / ways / trees for the area? kind in PLAUSIBLE, or give lo/hi yourself"""
    p = PLAUSIBLE.get(kind, {}).get(aid, (None, None))
    lo = p[0] if lo is None else lo
    hi = p[1] if hi is None else hi
    if lo is None and hi is None:
        raise GuardError(f'SUHL GUARD {what}: no plausible range known for {kind!r} in {aid!r} - pass lo= and/or hi=')
    if (lo is not None and n < lo) or (hi is not None and n > hi):
        raise GuardError(f'SUHL GUARD {what}: {n} {kind} in {aid!r} is not plausible (expected {lo if lo is not None else "…"}..'
                         f'{hi if hi is not None else "…"}). Wrong box, wrong file, or a service answered with an error page? Stopped.')
    return True


def guard(box=None, lonlat_box=None, model_box=None, part_of=None, what='', **counts):
    """the guard every Suhl tool calls first (and again when it has counted what it got):
        S.guard(box=(E0, N0, E1, N1))                    UTM box - or lonlat_box=(lon0, lat0, lon1, lat1) - or model_box=(x0, y0, x1, y1)
        S.guard(box=tile_box, part_of='stadt')           a deliberate part of the city: must touch the area instead
        S.guard(buildings=31234, area='stadt')           counts: buildings, streets, ways, trees (see PLAUSIBLE)
    Raises GuardError (a SystemExit: the tool ends with the message) - otherwise returns True."""
    aid = counts.pop('area', 'stadt')
    if lonlat_box is not None:
        lo0, la0, lo1, la1 = (float(v) for v in lonlat_box)
        try:
            _check_lonlat(lo0, la0, False)
            _check_lonlat(lo1, la1, False)
        except SuhlError as ex:
            raise GuardError(f'SUHL GUARD {what}: {ex}') from None
        c = [utm_from_lonlat(lo, la) for lo, la in ((lo0, la0), (lo1, la0), (lo1, la1), (lo0, la1))]
        if not (lo0 < lo1 and la0 < la1 and lo0 <= CENTRE_LONLAT[0] <= lo1 and la0 <= CENTRE_LONLAT[1] <= la1):
            raise GuardError(f'SUHL GUARD {what}: the centre of Suhl (lon {CENTRE_LONLAT[0]:.4f}, lat {CENTRE_LONLAT[1]:.4f}) is NOT inside '
                             f'lon {lo0}..{lo1}, lat {la0}..{la1}. Nothing was fetched or written.')
        box = (max(c[0][0], c[3][0]), max(c[0][1], c[1][1]), min(c[1][0], c[2][0]), min(c[2][1], c[3][1])) if box is None else box
    if model_box is not None:
        c = [utm_from_model(x, y) for x, y in ((model_box[0], model_box[1]), (model_box[2], model_box[1]),
                                               (model_box[2], model_box[3]), (model_box[0], model_box[3]))]
        mc = model_from_utm(*CENTRE_UTM)
        if not (model_box[0] <= mc[0] <= model_box[2] and model_box[1] <= mc[1] <= model_box[3]) and not part_of:
            raise GuardError(f'SUHL GUARD {what}: the centre of Suhl (model x {mc[0]:.0f}, y {mc[1]:.0f}) is NOT inside the model box '
                             f'{tuple(model_box)!r}. Nothing was fetched or written.')
        box = (min(p[0] for p in c), min(p[1] for p in c), max(p[0] for p in c), max(p[1] for p in c)) if box is None else box
    if box is not None:
        if part_of:
            guard_part(box, part_of, what)
        elif lonlat_box is None and model_box is None:
            guard_box(box, what)
    elif not counts:
        raise GuardError(f'SUHL GUARD {what}: called without a box and without counts')
    for kind, n in counts.items():
        guard_count(n, kind, aid, what=what)
    return True


# ------------------------------------------------------------------ tile sets (which tiles exist, per level) as a bit field
def tileset_encode(tiles):
    """[(x, y)] of ONE level -> {'x0', 'y0', 'w', 'h', 'n', 'bits'}: bit k = (y - y0) * w + (x - x0) of the byte string
    (bit 0 = the lowest bit of byte 0), base64. An empty list -> {'x0': 0, 'y0': 0, 'w': 0, 'h': 0, 'n': 0, 'bits': ''}."""
    ts = sorted(set((int(x), int(y)) for x, y in tiles))
    if not ts:
        return {'x0': 0, 'y0': 0, 'w': 0, 'h': 0, 'n': 0, 'bits': ''}
    x0, y0 = min(t[0] for t in ts), min(t[1] for t in ts)
    w, h = max(t[0] for t in ts) - x0 + 1, max(t[1] for t in ts) - y0 + 1
    b = bytearray((w * h + 7) // 8)
    for x, y in ts:
        k = (y - y0) * w + (x - x0)
        b[k >> 3] |= 1 << (k & 7)
    return {'x0': x0, 'y0': y0, 'w': w, 'h': h, 'n': len(ts), 'bits': base64.b64encode(bytes(b)).decode('ascii')}


def tileset_decode(ts):
    """the inverse of tileset_encode: sorted [(x, y)] by (y, x)"""
    if not ts or not ts.get('n'):
        return []
    b = base64.b64decode(ts['bits'])
    w, h, x0, y0 = ts['w'], ts['h'], ts['x0'], ts['y0']
    if len(b) != (w * h + 7) // 8:
        raise SuhlError(f'tile set: {len(b)} bytes for {w} x {h} tiles')
    out = [(x0 + k % w, y0 + k // w) for k in range(w * h) if b[k >> 3] >> (k & 7) & 1]
    if len(out) != ts['n']:
        raise SuhlError(f'tile set: n = {ts["n"]} but {len(out)} bits are set')
    return out


def tileset_has(ts, x, y):
    i, j = x - ts['x0'], y - ts['y0']
    if not (0 <= i < ts['w'] and 0 <= j < ts['h']):
        return False
    if '_b' not in ts:
        ts['_b'] = base64.b64decode(ts['bits'])
    k = j * ts['w'] + i
    return bool(ts['_b'][k >> 3] >> (k & 7) & 1)


def scan_tiles(folder, ext=None):
    """the tile files below a folder laid out <L>/<x>/<y>.<ext>: {L: [(x, y)]} and the bytes per level {L: bytes}"""
    lv, size = {}, {}
    if not os.path.isdir(folder):
        return lv, size
    for Ls in sorted(os.listdir(folder)):
        if not Ls.isdigit() or not os.path.isdir(os.path.join(folder, Ls)):
            continue
        L = int(Ls)
        for xs in os.listdir(os.path.join(folder, Ls)):
            dx = os.path.join(folder, Ls, xs)
            if not xs.isdigit() or not os.path.isdir(dx):
                continue
            for fn in os.listdir(dx):
                st, _, e = fn.partition('.')
                if st.isdigit() and (ext is None or e == ext):
                    lv.setdefault(L, []).append((int(xs), int(st)))
                    size[L] = size.get(L, 0) + os.path.getsize(os.path.join(dx, fn))
    for L in lv:
        lv[L].sort(key=lambda t: (t[1], t[0]))
    return lv, size


# ------------------------------------------------------------------ polite HTTP with an on-disk cache
SECRET_PARAMS = ('key', 'apikey', 'api_key', 'token', 'access_token', 'secret', 'password', 'auth', 'signature', 'sig')
_last_call = {}
last_headers = {}        # the response headers (lower-case names) of the latest real request of http_get, e.g. rate-limit headers


def redact(url):
    """the URL with the values of secret-looking query parameters replaced by '***' (for logs and cache records)"""
    u = urllib.parse.urlsplit(url)
    if not u.query:
        return url
    q = [(k, '***' if any(s in k.lower() for s in SECRET_PARAMS) else v) for k, v in urllib.parse.parse_qsl(u.query, keep_blank_values=True)]
    return urllib.parse.urlunsplit((u.scheme, u.netloc, u.path, urllib.parse.urlencode(q, safe='*,:/'), ''))


def _cache_file(cache, url):
    u = urllib.parse.urlsplit(url)
    h = hashlib.sha1(redact(url).encode('utf-8')).hexdigest()
    return os.path.join(cache, u.netloc.replace(':', '_') or 'local', h[:2], h)


def http_get(url, cache=None, max_age=None, headers=None, tries=4, timeout=120, pause=1.0, backoff=5.0, ok=(200,), quiet=False,
             data=None):
    """polite GET (POST when data is given): our User-Agent, at least `pause` seconds between two calls to the same host, retries with
    growing waits on 429/5xx and network errors (a Retry-After header is honoured up to 120 s).
    cache = a directory given by the caller: an answer with a status in `ok` is stored there and returned from there the next time
    (max_age in seconds; None = for ever). Header values and secret query parameters never reach the cache or the log.
    Returns (status, body bytes, content type, from_cache). status 0 = no answer after all tries (body = the error text)."""
    cf = _cache_file(cache, url) if cache else None
    if cf and data is None and os.path.exists(cf + '.bin') and os.path.exists(cf + '.json'):
        try:
            meta = read_json(cf + '.json')
            if max_age is None or time.time() - meta.get('t', 0) <= max_age:
                return meta.get('status', 200), read_bytes(cf + '.bin'), meta.get('type', ''), True
        except Exception:
            pass
    host = urllib.parse.urlsplit(url).netloc
    h = {'User-Agent': UA, 'Accept': '*/*'}
    h.update(headers or {})
    last = (0, b'', '')
    for k in range(tries):
        wait = _last_call.get(host, 0) + pause - time.time()
        if wait > 0:
            time.sleep(wait)
        retry_after = None
        try:
            req = urllib.request.Request(url, headers=h, data=data)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                body = r.read()
                last = (r.status, body, r.headers.get('content-type', '') or '')
                last_headers.clear()
                last_headers.update({k.lower(): v for k, v in r.headers.items()})
        except urllib.error.HTTPError as ex:
            last = (ex.code, ex.read()[:20000], (ex.headers.get('content-type', '') if ex.headers else '') or '')
            retry_after = ex.headers.get('retry-after') if ex.headers else None
            last_headers.clear()
            last_headers.update({k.lower(): v for k, v in (ex.headers.items() if ex.headers else ())})
        except Exception as ex:   # timeouts, resets, DNS
            last = (0, repr(ex).encode()[:400], '')
        _last_call[host] = time.time()
        if last[0] in ok:
            if cf and data is None:
                os.makedirs(os.path.dirname(cf), exist_ok=True)
                with open(cf + '.part', 'wb') as f:
                    f.write(last[1])
                os.replace(cf + '.part', cf + '.bin')
                with open(cf + '.json', 'w', encoding='utf-8') as f:
                    json.dump({'url': redact(url), 'status': last[0], 'type': last[2], 't': time.time(), 'bytes': len(last[1])}, f)
            return last[0], last[1], last[2], False
        if last[0] not in (0, 408, 425, 429, 500, 502, 503, 504, 509):
            break                       # a clear answer (403, 404 ...): asking again would be impolite
        if k + 1 < tries:
            w = backoff * (k + 1)
            try:
                w = max(w, min(120.0, float(retry_after))) if retry_after else w
            except ValueError:
                pass
            if not quiet:
                log(f'http {last[0] or "error"} {redact(url)[:140]} - try {k + 2}/{tries} in {w:.0f} s')
            time.sleep(w)
    return last[0], last[1], last[2], False


def http_json(url, **kw):
    """http_get + JSON: (status, object or None, from_cache)"""
    st, b, ct, fc = http_get(url, **kw)
    try:
        return st, json.loads(b.decode('utf-8')), fc
    except Exception:
        return st, None, fc


def http_download(url, dest, headers=None, tries=4, timeout=300, pause=1.0, backoff=5.0, min_bytes=1, magic=None, quiet=False):
    """download to a file unless it is already there (a second start continues with the next file): writes dest + '.part', then renames.
    magic = bytes the file must start with (e.g. b'PK', b'II*'). Returns (path or None, status, note)."""
    if os.path.exists(dest) and os.path.getsize(dest) >= min_bytes:
        return dest, 200, 'cached'
    st, b, ct, _ = http_get(url, headers=headers, tries=tries, timeout=timeout, pause=pause, backoff=backoff, quiet=quiet)
    if st != 200:
        return None, st, f'HTTP {st} {ct} {b[:120].decode("latin-1", "replace")!r}'
    if len(b) < min_bytes or (magic and not b.startswith(magic)):
        return None, st, f'unexpected content: {len(b)} bytes, {ct}, starts {b[:16]!r}'
    os.makedirs(os.path.dirname(os.path.abspath(dest)), exist_ok=True)
    with open(dest + '.part', 'wb') as f:
        f.write(b)
    os.replace(dest + '.part', dest)
    return dest, st, f'{len(b)} bytes'


def write_json(path, obj, compact=True):
    """JSON as the app reads it: UTF-8, compact, a newline at the end; written to .part and renamed"""
    os.makedirs(os.path.dirname(os.path.abspath(path)), exist_ok=True)
    with open(path + '.part', 'w', encoding='utf-8') as f:
        if compact:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        else:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write('\n')
    os.replace(path + '.part', path)


def now():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def read_json(path):
    with open(path, encoding='utf-8') as f:
        return json.load(f)


def read_bytes(path):
    with open(path, 'rb') as f:
        return f.read()


if __name__ == '__main__':
    # python3 -I tools/suhl/lib/suhllib.py            -> a short self description
    # python3 -I tools/suhl/lib/suhllib.py probe      -> (re)write probe.json
    # python3 -I tools/suhl/lib/suhllib.py tiles <area> <level>
    a = sys.argv[1:]
    if a[:1] == ['probe']:
        with open(PROBE_JSON, 'w', encoding='utf-8') as f:
            f.write(probe_text())
        print(PROBE_JSON, len(probe_doc()['tiles']), 'tiles')
    elif a[:1] == ['tiles']:
        for x, y in area_tiles(a[1], int(a[2]) if len(a) > 2 else CONTENT_LEVEL):
            print(tile_key(int(a[2]) if len(a) > 2 else CONTENT_LEVEL, x, y))
    else:
        print(f'suhllib {VERSION}, schema {SCHEMA}; centre of Suhl UTM {CENTRE_UTM}, model {tuple(round(v, 1) for v in model_from_utm(*CENTRE_UTM))}')
        for k in ('stadt', 'kernstadt', 'zentrum'):
            print(f'  {k}: {area(k).area_m2() / 1e6:.2f} km2, tiles level 10/11/12: ' + ' / '.join(str(len(area_tiles(k, L))) for L in (10, 11, 12)))
