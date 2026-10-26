"""Shared definitions of the world tile pipeline (Welt, week 1 test block).

Tiling: one quadtree in UTM zone 32N (EPSG:25832, ETRS89), heights NHN (DHHN2016) relative to H0.
  root (level 0) = square of 409.6 km, lower-left corner (ROOT_E0, ROOT_N0); level L tiles have the side 409600 / 2**L m,
  so level 12 = 100 m tiles. The root centre (625500, 5595600) lies next to the garden; every level has a tile corner there.
  Tile (L, x, y): x counts east, y counts NORTH from the root corner (like TMS); bounds E0 + x*s .. E0 + (x+1)*s.
  Imagery: 512 x 512 px per tile at every level (level 12: 0.195 m/px = DOP20), pixel areas, row 0 = north edge.
  Terrain: 101 x 101 heights per tile at every level (level 12: 1 m spacing), samples on the tile edges (shared with neighbours),
  sample (i, j) at (E0 + i*s/100, N0 + j*s/100), i east, j NORTH (row 0 = south edge).
Local frame (viewer, later the app): origin = the app's model origin (geoman.xf ex/ey in viz3/manifests.json, the garden) and H0;
  glTF content: x = E - Ec, y = H - H0, z = -(N - Nc) with (Ec, Nc) the centre of the tile.
"""
import json, math, os, time, hashlib

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))

ROOT_E0, ROOT_N0, ROOT_SIZE = 420700.0, 5390800.0, 409600.0
TILE_PX = 512          # imagery tile size
TERR_N = 101           # terrain samples per tile side
FINEST = 12            # 100 m tiles, 0.195 m/px, 1 m terrain

# the app's model frame (viz3/manifests.json geoman): model metres (x east, y north) -> UTM: E = a x - b y + ex, N = b x + a y + ey;
# model z = H - H0. Read from the manifest when it is there (it is in the repo), these values are the fallback.
XF = {'a': 1.0127906473420232, 'b': 0.07715765993901931, 'ex': 625469.0070213208, 'ey': 5595624.323524626}
H0 = 374.617
try:
    _g = json.load(open(os.path.join(REPO, 'viz3', 'manifests.json')))['geoman']
    XF, H0 = dict(_g['xf']), float(_g['H0'])
except Exception:   # the pipeline also runs from a bare copy of tools/welt
    pass
ORIGIN_LATLON = (50.4991, 10.7692)   # the garden (WGS84), = model origin up to a few metres
ORIGIN_E, ORIGIN_N = XF['ex'], XF['ey']

# areas per level (UTM, aligned to the level's tile grid). Detail block A (4 x 4 km: garden, Ratscher, Talsperre Ratscher,
# the south of Schleusingen), block B (9.6 x 9.6 km around the garden) and a context square (25.6 km) for the horizon.
CTX = (612700.0, 5582800.0, 638300.0, 5608400.0)
BLOCK_B = (620700.0, 5590800.0, 630300.0, 5600400.0)
BLOCK_A = (623900.0, 5593200.0, 627900.0, 5597200.0)
PLANS = {
    # plan name -> {level: area}; the roads/buildings area and the DGM1 mosaic (with margin) follow the finest area
    'A': {5: CTX, 6: CTX, 7: CTX, 8: BLOCK_A, 9: BLOCK_A, 10: BLOCK_A, 11: BLOCK_A, 12: BLOCK_A},
    'B': {5: CTX, 6: CTX, 7: CTX, 8: BLOCK_B, 9: BLOCK_B, 10: BLOCK_B, 11: BLOCK_B, 12: BLOCK_A},
    # a 1.6 x 1.6 km block for quick local runs of the whole chain
    'T': {5: CTX, 6: CTX, 7: CTX, 8: (625500.0, 5594000.0, 627100.0, 5595600.0), 9: (625500.0, 5594000.0, 627100.0, 5595600.0),
          10: (625500.0, 5594000.0, 627100.0, 5595600.0), 11: (625500.0, 5594000.0, 627100.0, 5595600.0),
          12: (625500.0, 5594800.0, 626300.0, 5595600.0)},
}
CONTENT_LEVEL = 9      # roads and buildings are cut into level-9 tiles (800 m)

# Detail zones outside the test block get a block of their own, published under welt-test/<sub> with its own meta.json; the app
# (viz3/src/welt/welt.js) takes a tile from whichever block holds it. Kloster Veßra (~9 km west of the garden; the monastery
# 50.4915/10.6430, the tree nursery Baumschule Kammbach 50.4932/10.6417): level 12 over 2 x 2 km around both; levels 7-11 over the
# zone and the road corridor from the western edge of block B (E 620700) to the nursery - the drivable OSM route garden -> Ratschner
# Anger -> Geisenhöhner Weg -> Flurweg -> L 1625 (Schleusinger Straße) -> Schulstraße, 10.1 km; west of block B it runs within
# E 616502..620698, N 5594206..5594799, with 600 m margin E 615902..621298, N 5593606..5595399 - rounded out to the level-8 grid:
# 8.0 x 6.4 km, adjoining block B. Level 7 only feeds the colour balance of the flight days.
VESSRA_C = (616500.0, 5594650.0)
VESSRA_DET = (615500.0, 5593600.0, 617500.0, 5595600.0)
VESSRA_BLK = (614000.0, 5592150.0, 620700.0, 5597150.0)
VESSRA_ROUTE = (615902.0, 5593606.0, 620700.0, 5595399.0)   # the corridor west of block B (route + 600 m), checked in test_welt.py
PLANS['V'] = {7: VESSRA_BLK, 8: VESSRA_BLK, 9: VESSRA_BLK, 10: VESSRA_BLK, 11: VESSRA_BLK, 12: VESSRA_DET}
ZONES = {'V': {'name': 'vessra', 'title': 'Kloster Veßra', 'centre': VESSRA_C, 'sub': 'zonen/vessra/'}}
# feat/suhl: Suhl (~13 km NNW of the garden, Markt 50.6097/10.6928): a block of its own (welt-test/zonen/suhl/) whose areas per level come
# from a plan file (tools/welt/zone_suhl.py --routes -> build.py --plan S --planfile): level 12 over the town, levels 10-11 only on the
# tiles of a mask (the town + 900 m and the two road corridors from the test block to Suhl + 600 m), levels 7-9 over the block around them
SUHL_C = (620045.0, 5607990.0)
ZONES['S'] = {'name': 'suhl', 'title': 'Suhl', 'centre': SUHL_C, 'sub': 'zonen/suhl/'}
MASK = {}   # feat/suhl: level -> set of (x, y); only these tiles of a masked level are built (empty: all tiles of the level's area)
_MASK_UP = {}


def keep(L, x, y):
    return L not in MASK or (x, y) in MASK[L]


def hits(L, cl, cx, cy):
    """does chunk (cx, cy) of level cl hold a tile of level L that the mask keeps? (feat/suhl)"""
    if L not in MASK:
        return True
    k = (L, cl)
    if k not in _MASK_UP:
        _MASK_UP[k] = {(x >> (L - cl), y >> (L - cl)) for x, y in MASK[L]}
    return (cx, cy) in _MASK_UP[k]


def tsize(L):
    return ROOT_SIZE / (1 << L)


def tbounds(L, x, y):
    s = tsize(L)
    return ROOT_E0 + x * s, ROOT_N0 + y * s, ROOT_E0 + (x + 1) * s, ROOT_N0 + (y + 1) * s


def tcentre(L, x, y):
    e0, n0, e1, n1 = tbounds(L, x, y)
    return (e0 + e1) / 2, (n0 + n1) / 2


def trange(L, area):
    """inclusive tile index ranges (x0, y0, x1, y1) of the tiles covering an area (rounded outwards to the level's grid)"""
    s = tsize(L)
    fx0, fy0 = (area[0] - ROOT_E0) / s, (area[1] - ROOT_N0) / s
    fx1, fy1 = (area[2] - ROOT_E0) / s, (area[3] - ROOT_N0) / s
    return math.floor(fx0 + 1e-6), math.floor(fy0 + 1e-6), math.ceil(fx1 - 1e-6) - 1, math.ceil(fy1 - 1e-6) - 1


def aligned(L, area):
    """the area rounded outwards to the tile grid of level L"""
    x0, y0, x1, y1 = trange(L, area)
    return tbounds(L, x0, y0)[:2] + tbounds(L, x1, y1)[2:]


def tiles(L, area):
    x0, y0, x1, y1 = trange(L, area)
    return [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1) if keep(L, x, y)]


def union_area(areas):
    return (min(a[0] for a in areas), min(a[1] for a in areas), max(a[2] for a in areas), max(a[3] for a in areas))


def model_from_utm(E, N):
    """UTM -> the app's model metres (x east, y north)"""
    a, b = XF['a'], XF['b']
    s2 = a * a + b * b
    dx, dy = E - XF['ex'], N - XF['ey']
    return (a * dx + b * dy) / s2, (-b * dx + a * dy) / s2


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


# ---------------- HTTP ----------------
import threading
_local = threading.local()   # one requests session per thread (the WMS chunks are fetched three at a time)
UA = 'PavillonRatscher-Welt/0.1 (+https://github.com/mynametouse/pavillon-ratscher; open geodata test tiles, non-commercial)'


def http_get(url, tries=4, timeout=180, data=None, accept=None):
    """GET (or POST with data) with retries; returns (status, bytes, content-type). Raises after the last try."""
    import requests
    _session = getattr(_local, 'session', None)
    if _session is None:
        _session = _local.session = requests.Session()
        _session.headers['User-Agent'] = UA
    last = None
    for k in range(tries):
        try:
            if data is None:
                r = _session.get(url, timeout=timeout)
            else:
                r = _session.post(url, data=data, timeout=timeout)
            if r.status_code in (429, 502, 503, 504):
                last = f'HTTP {r.status_code}'
                time.sleep(5 + 15 * k)
                continue
            return r.status_code, r.content, r.headers.get('content-type', '')
        except Exception as e:   # network errors: retry
            last = repr(e)
            time.sleep(3 + 10 * k)
    raise RuntimeError(f'GET failed {url[:160]}: {last}')


def sha1(b):
    return hashlib.sha1(b).hexdigest()
