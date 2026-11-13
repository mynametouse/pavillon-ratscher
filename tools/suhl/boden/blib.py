"""suhl-boden (stage 2, package S2-1 'Boden'): shared helpers - the areas of Suhl, tile lists on the quadtree of tools/welt/wlib.py,
the road corridors garden -> Suhl, the guard 'is the centre of Suhl inside'.

tools/welt/*.py is imported and never edited. Everything metric is ETRS89 / UTM 32N (EPSG:25832). A tile list is a set of (x, y) of
one level; x counts east, y north from the root corner (wlib.py). Results: tools/suhl/out/boden/ (git add -f), raw downloads outside
git (SUHL_RAW, default /tmp/suhl-boden/raw; ~/suhl-boden-raw in GitHub Actions).
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
sys.path.insert(0, os.path.join(REPO, 'tools', 'welt'))
import wlib                                    # noqa: E402  (the shared pipeline)
from wlib import ROOT_E0, ROOT_N0, tbounds, tsize, log   # noqa: E402,F401

# every request of tools/welt/fetch.py goes out with the Suhl agents' User-Agent (wlib builds its session lazily from this name)
UA = 'PavillonRatscher-Suhl/0.1 (+https://github.com/mynametouse/pavillon-ratscher)'
wlib.UA = UA

OUT = os.path.join(REPO, 'tools', 'suhl', 'out', 'boden')
BESTAND = os.path.join(REPO, 'tools', 'suhl', 'out', 'bestand')
RAW = os.environ.get('SUHL_RAW', '/tmp/suhl-boden/raw')
CENTRE = (619762.0, 5607680.0)                 # the centre of Suhl (50.6087 N, 10.6926 E): must lie inside whatever a run builds
LEVELS = (6, 7, 8, 9, 10, 11, 12)
# the existing world (https://mynametouse.github.io/pavillon-ratscher/welt-test/meta.json and zonen/vessra/meta.json, read 13.11.2026):
BLOCK_B = wlib.aligned(8, wlib.PLANS['B'][8])        # test block, levels 8-11: E 620700..630300, N 5590800..5600400
BLOCK_V = wlib.aligned(8, wlib.PLANS['V'][8])        # zone Kloster Vessra, levels 7-11: E 612700..620700, N 5590800..5597200
# its outer terrain (viz3/manifests.json geoman.terrain.outer): 201 x 201 points, 120 m, a square in MODEL metres (x east, y north)
OUTER_MODEL = (-11831.621801963107, -12135.581023315744, -11831.621801963107 + 200 * 120.0, -12135.581023315744 + 200 * 120.0)


def utm_from_model(x, y):
    """the app's model metres -> UTM (inverse of wlib.model_from_utm)"""
    a, b = wlib.XF['a'], wlib.XF['b']
    return a * x - b * y + wlib.XF['ex'], b * x + a * y + wlib.XF['ey']


def outer_square():
    """the outer terrain of the existing world as a UTM polygon (turned by 4.36 degrees against the grid)"""
    from shapely.geometry import Polygon
    x0, y0, x1, y1 = OUTER_MODEL
    return Polygon([utm_from_model(x, y) for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))])


def areas():
    """the areas of Suhl (stage 1: tools/suhl/out/bestand/gebiete.geojson, OSM, ODbL) in UTM ->
    ({'stadt' | 'kernstadt' | 'zentrum': polygon}, [(name, place, (E, N)) of the Ortsteile], centre (E, N) of the file)"""
    from shapely.geometry import shape
    from shapely.ops import transform
    from pyproj import Transformer
    tf = Transformer.from_crs(4326, 25832, always_xy=True).transform
    fc = json.load(open(os.path.join(BESTAND, 'gebiete.geojson'), encoding='utf-8'))
    G, places = {}, []
    for f in fc['features']:
        p = f['properties']
        if p['art'] == 'gebiet':
            G[p['id']] = transform(lambda x, y, z=None: tf(x, y), shape(f['geometry']))
        elif p['art'] == 'ortsteil':
            places.append((p['name'], p.get('place'), tuple(tf(*f['geometry']['coordinates'][:2]))))
    c = fc.get('centre', {})
    return G, places, tuple(tf(c['lon'], c['lat'])) if c else CENTRE


# ---------------- tile lists ----------------
def tile_of(L, E, N):
    s = tsize(L)
    return int(math.floor((E - ROOT_E0) / s)), int(math.floor((N - ROOT_N0) / s))


def touching(L, geom, min_area=1.0):
    """the tiles of level L whose square has more than min_area m2 in common with a UTM geometry"""
    from shapely.geometry import box
    from shapely.prepared import prep
    b = geom.bounds
    x0, y0 = tile_of(L, b[0], b[1])
    x1, y1 = tile_of(L, b[2], b[3])
    pg = prep(geom)
    out = set()
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            q = box(*tbounds(L, x, y))
            if pg.intersects(q) and (pg.contains(q) or geom.intersection(q).area > min_area):
                out.add((x, y))
    return out


def in_rect(L, area):
    """the tiles of level L inside a UTM rectangle that is aligned to the level's grid (an existing block)"""
    return set(wlib.tiles(L, area))


def kids(ts):
    return {(2 * x + i, 2 * y + j) for x, y in ts for i in (0, 1) for j in (0, 1)}


def parents(ts):
    return {(x >> 1, y >> 1) for x, y in ts}


def ring(ts):
    """the tiles and their eight neighbours"""
    return {(x + i, y + j) for x, y in ts for i in (-1, 0, 1) for j in (-1, 0, 1)}


def rect_of(ts):
    xs, ys = [t[0] for t in ts], [t[1] for t in ts]
    return [min(xs), min(ys), max(xs), max(ys)]


def bbox_of(L, ts):
    """UTM bounding box of a tile list"""
    r = rect_of(ts)
    return tbounds(L, r[0], r[1])[:2] + tbounds(L, r[2], r[3])[2:]


def guard(lists):
    """the lesson of the first Suhl attempt (a block built 1.1 km beside the town): the tile holding the centre of Suhl must be in the
    list of every level; raises otherwise"""
    for L, ts in lists.items():
        if tile_of(L, *CENTRE) not in ts:
            raise SystemExit(f'guard: the centre of Suhl {CENTRE} is not inside the level-{L} tile list (rect {rect_of(ts) if ts else None})')
    return True


# ---------------- the road corridors garden -> Suhl ----------------
KORRIDOR = os.path.join(HERE, 'korridor.json')


def routes_from_fahrt(path):
    """the routes of feat/suhl-fahrt (viz3/extra/suhl-fahrt/dist/fahrt/suhl.json: pts = x, y in model decimetres) as UTM line strings"""
    from shapely.geometry import LineString
    out = {}
    for k, r in json.load(open(path))['routes'].items():
        p = r['pts']
        out[k] = LineString([utm_from_model(p[i] / 10.0, p[i + 1] / 10.0) for i in range(0, len(p) - 1, 2)])
    return out


def routes():
    """the committed copy (korridor.json, simplified to 2 m) -> {name: LineString in UTM}"""
    from shapely.geometry import LineString
    j = json.load(open(KORRIDOR, encoding='utf-8'))
    return {k: LineString(v) for k, v in j['routes'].items()}


# ---------------- the road profiles of suhl-strassen ----------------
def load_profil():
    """tools/suhl/strassen/profil.py (package S2-3, the owner of the road heights; imported, never edited). Its folder also holds a
    bild.py and a lauf.py, so it must not stay on sys.path: our own modules of the same name would be shadowed."""
    d = os.path.join(REPO, 'tools', 'suhl', 'strassen')
    if not os.path.exists(os.path.join(d, 'profil.py')):
        raise SystemExit('tools/suhl/strassen/profil.py is missing: merge origin/suhl/strassen')
    saved = list(sys.path)
    try:
        sys.path.insert(0, d)
        import profil
    finally:
        sys.path[:] = saved
    return profil
