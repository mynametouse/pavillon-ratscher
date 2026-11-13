"""suhl-strassen: shared helpers of package S2-3 „Straßen“ (stage 2 of the Suhl plan, docs/plans/auftraege/suhl-strassen.md).

Suhl builds no second road system: its roads are delivered in the format of the drive data (viz3/extra/fahrt/strecke.py ->
fahrt/strassen.json, read by viz3/src/welt/fahrt.js and by the road map of feat/strassen). The tools of that system are imported here and
never edited: tools/welt/roads.py (classify, network, solve_profile, metrics), viz3/extra/fahrt/strecke.py (u2m, simplify, overpasses).

Raw data live outside git: SUHL_RAW (default /tmp/suhl-strassen/raw; ~/suhl-raw in GitHub Actions). OpenStreetMap comes from an OPL file
cut from the Geofabrik extract with osmium (GitHub Actions) or from cached map calls of the OSM API (chat machine; stage 1 left the whole
municipality in /tmp/suhl-bestand/raw/osm). All metric work in ETRS89 / UTM 32N (EPSG:25832); model metres only in the output.
© OpenStreetMap contributors (ODbL 1.0).
"""
import glob, json, math, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
OUT = os.path.join(REPO, 'tools', 'suhl', 'out', 'strassen')
RAW = os.environ.get('SUHL_RAW', '/tmp/suhl-strassen/raw')
UA = 'PavillonRatscher-Suhl/0.1 (+https://github.com/mynametouse/pavillon-ratscher)'
for _p in (os.path.join(REPO, 'tools', 'welt'), os.path.join(REPO, 'viz3', 'extra', 'fahrt'), os.path.join(REPO, 'tools', 'suhl', 'bestand')):
    if _p not in sys.path:
        sys.path.insert(0, _p)

import numpy as np

CENTRE_UTM = (619762.0, 5607680.0)       # the centre of Suhl (brief; gebiete.geojson: 619765, 5607674)
GARDEN_LL = (50.4991, 10.7692)
ROOT_E0, ROOT_N0, ROOT = 420700.0, 5390800.0, 409600.0   # the quadtree of tools/welt/wlib.py
LEVEL = 10                               # content tiles: 400 m
_G = json.load(open(os.path.join(REPO, 'viz3', 'manifests.json')))['geoman']
XF, H0 = dict(_G['xf']), float(_G['H0'])
MSCALE = math.hypot(XF['a'], XF['b'])    # one model metre in UTM metres (1.0157)


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def now():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


# ---------------- coordinates ----------------
def u2m(E, N):
    """UTM 32N -> model metres (x east, y north), as viz3/extra/fahrt/strecke.py"""
    a, b = XF['a'], XF['b']
    s2 = a * a + b * b
    dx, dy = np.asarray(E, float) - XF['ex'], np.asarray(N, float) - XF['ey']
    return (a * dx + b * dy) / s2, (-b * dx + a * dy) / s2


def m2u(x, y):
    x, y = np.asarray(x, float), np.asarray(y, float)
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


_tf = {}


def ll2u(lon, lat):
    from pyproj import Transformer
    t = _tf.get('f') or _tf.setdefault('f', Transformer.from_crs(4326, 25832, always_xy=True))
    return t.transform(lon, lat)


def u2ll(E, N):
    from pyproj import Transformer
    t = _tf.get('b') or _tf.setdefault('b', Transformer.from_crs(25832, 4326, always_xy=True))
    return t.transform(E, N)


# ---------------- tiles (level 10 = 400 m, keys as tools/welt/wlib.py: x east, y north from the root corner) ----------------
def tsize(L=LEVEL):
    return ROOT / (1 << L)


def tkey(E, N, L=LEVEL):
    s = tsize(L)
    return int((E - ROOT_E0) // s), int((N - ROOT_N0) // s)


def tbounds(x, y, L=LEVEL):
    s = tsize(L)
    return ROOT_E0 + x * s, ROOT_N0 + y * s, ROOT_E0 + (x + 1) * s, ROOT_N0 + (y + 1) * s


def tiles_touching(poly, L=LEVEL):
    """the level-L tiles whose square touches a shapely polygon (UTM), sorted"""
    from shapely.geometry import box
    e0, n0, e1, n1 = poly.bounds
    x0, y0 = tkey(e0, n0, L)
    x1, y1 = tkey(e1, n1, L)
    out = []
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            if box(*tbounds(x, y, L)).intersects(poly):
                out.append((x, y))
    return sorted(out)


# ---------------- areas (stage 1: tools/suhl/out/bestand/gebiete.geojson) ----------------
def gebiete():
    """{'stadt' | 'kernstadt' | 'zentrum': shapely polygon in UTM}, and the Ortsteile as (name, place, E, N)"""
    from shapely.geometry import shape
    from shapely.ops import transform
    g = json.load(open(os.path.join(REPO, 'tools', 'suhl', 'out', 'bestand', 'gebiete.geojson'), encoding='utf-8'))
    areas, orte = {}, []
    for f in g['features']:
        p = f['properties']
        if p.get('art') == 'gebiet':
            areas[p['id']] = transform(lambda x, y, z=None: ll2u(x, y), shape(f['geometry']))
        elif p.get('art') == 'ortsteil':
            lon, lat = f['geometry']['coordinates'][:2]
            E, N = ll2u(lon, lat)
            orte.append((p['name'], p.get('place', ''), float(E), float(N)))
    return areas, orte


def check_box(box, what='box'):
    """the lesson of the first attempt (a search frame in Nigeria): the centre of Suhl must lie inside the UTM box (e0, n0, e1, n1)"""
    e0, n0, e1, n1 = box
    if not (e0 < CENTRE_UTM[0] < e1 and n0 < CENTRE_UTM[1] < n1):
        raise SystemExit(f'{what}: the centre of Suhl {CENTRE_UTM} is not inside {tuple(round(v) for v in box)} – wrong frame, stop')
    return True


# ---------------- OpenStreetMap ----------------
def load_osm(opl=None, api_dir=None, box=None):
    """the OSM model of tools/suhl/bestand/sblib.py (nodes: id -> UTM, nll: id -> lon/lat, ntags, ways: id -> (node ids, tags), rels).
    opl: a file from osmium (GitHub Actions); api_dir: cached map calls of the OSM API (map_<w>_<s>_<e>_<n>.json); box (lon0, lat0,
    lon1, lat1): only the cached calls touching it are read (the chat machine is small)."""
    import sblib
    if opl:
        o = sblib.load_osm_opl(opl)
        log('OSM', o.source, len(o.nodes), 'nodes', len(o.ways), 'ways', len(o.rels), 'relations')
        return o
    api_dir = api_dir or '/tmp/suhl-bestand/raw/osm'
    files = sorted(glob.glob(os.path.join(api_dir, 'map_*.json')))
    if box:
        keep = []
        for p in files:
            w, s, e, n = (float(v) for v in os.path.basename(p)[4:-5].split('_'))
            if not (e < box[0] or w > box[2] or n < box[1] or s > box[3]):
                keep.append(p)
        files = keep
    if not files:
        raise SystemExit(f'no cached OSM map calls in {api_dir} for {box}')
    o = sblib.Osm()
    stamp = 0.0
    for p in files:
        d = json.load(open(p, encoding='utf-8'))
        for el in d.get('elements', ()):
            t, i = el['type'], el['id']
            if t == 'node':
                o.nll[i] = (el['lon'], el['lat'])
                if el.get('tags'):
                    o.ntags[i] = el['tags']
            elif t == 'way':
                o.ways[i] = (el.get('nodes', []), el.get('tags') or {})
            elif t == 'relation':
                o.rels[i] = ([(m['type'][0], m['ref'], m.get('role', '')) for m in el.get('members', ())], el.get('tags') or {})
        stamp = max(stamp, os.path.getmtime(p))
    o.source = f'OSM API 0.6 map calls ({len(files)} boxes, cached by stage 1)'
    o.stamp = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(stamp))
    o.finish()
    log('OSM', o.source, o.stamp, len(o.nodes), 'nodes', len(o.ways), 'ways', len(o.rels), 'relations')
    return o


def way_len(P):
    P = np.asarray(P, float)
    return float(np.hypot(*np.diff(P[:, :2], axis=0).T).sum()) if len(P) > 1 else 0.0


def write_json(path, obj, **kw):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, separators=kw.pop('separators', (',', ':')), **kw)
    return os.path.getsize(path)


def common_index(folder, area, sources, note=''):
    """the common head of an index.json (tile lists, sources, attribution of the contract docs/features/suhl-daten.md), written by the
    shared tool tools/suhl/lib/validate.py --index; the product's own keys stay"""
    import subprocess
    v = os.path.join(REPO, 'tools', 'suhl', 'lib', 'validate.py')
    if not os.path.exists(v):
        log('validate.py of suhl-daten is not there: the index keeps its own head')
        return False
    r = subprocess.run([sys.executable, '-I', v, '--index', folder, '--area', area, '--sources', ','.join(sources)] + (['--note', note] if note else []),
                       capture_output=True, text=True)
    if r.returncode != 0:
        log('validate.py --index:', (r.stdout + r.stderr).strip()[-400:])
    return r.returncode == 0


def index_tiles(idx, L=LEVEL):
    """the tiles of a product's index.json as [(x, y)] – the common layout {"": {"10": bit field}} or the bare {"10": bit field}"""
    import suhllib
    t = idx['tiles']
    if '' in t:
        t = t['']
    return [tuple(q) for q in suhllib.tileset_decode(t[str(L)])]
