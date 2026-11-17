"""feat/welt-wald: shared helpers of the forest pipeline – the model frame, the 400 m cells (the grid of gebaeude/z/), the routes one drives,
the places other features plant themselves (keep-out), roads and buildings to keep trees off.

Model metres (x east, y north) <-> UTM 32N (EPSG:25832): E = ex + a x - b y, N = ey + b x + a y (viz3/manifests.json geoman.xf).
A cell (i, j) is the model square [400 i, 400 (i + 1)) x [400 j, 400 (j + 1)), key 'i_j' – the same grid as viz3/src/gebaeude/gebaeude.js.
"""
import json, math, os, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
VIZ = os.path.join(REPO, 'viz3')
MAN = json.load(open(os.path.join(VIZ, 'manifests.json')))
GEOMAN = MAN['geoman']
XF = GEOMAN['xf']
A, B, EX, EY = XF['a'], XF['b'], XF['ex'], XF['ey']
S2 = A * A + B * B
H0 = float(GEOMAN['H0'])
CELL = 400.0
# where the generated data go (the app's extras) and where raw downloads are cached (outside the repo)
OUT = os.environ.get('WW_OUT', os.path.join(VIZ, 'extra', 'welt-wald', 'dist', 'weltwald'))  # WW_OUT: elsewhere (a long run)
RAW = os.environ.get('WW_RAW', os.path.join(os.path.expanduser('~'), 'ww-raw'))
UA = 'weltwald-geodata/0.1 (open geodata processing)'
# Suhl's published data (the city's own trees stand in the tiles of its product b): the data repo beside the site
SUHL_BASE = 'https://mynametouse.github.io/pavillon-daten/suhl/'


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def to_utm(x, y):
    return EX + A * x - B * y, EY + B * x + A * y


def to_model(E, N):
    dx, dy = E - EX, N - EY
    return (A * dx + B * dy) / S2, (-B * dx + A * dy) / S2


def dist_file(rel):
    """a file of the built app: the feature extras first (they override dist/), then viz3/dist"""
    import glob
    for fx in sorted(glob.glob(os.path.join(VIZ, 'extra', '*', 'dist', rel))):
        return fx
    return os.path.join(VIZ, 'dist', rel)


def http(url, timeout=180, tries=4, data=None):
    last = None
    for k in range(tries):
        try:
            req = urllib.request.Request(url, data=data, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except Exception as e:  # network hiccups: retry with a pause
            last = e
            time.sleep(3 + 8 * k)
    raise RuntimeError(f'GET failed {url[:140]}: {last}')


def cached(rel, fetch):
    """bytes of a raw download, cached under RAW/rel"""
    p = os.path.join(RAW, rel)
    if os.path.exists(p) and os.path.getsize(p) > 0:
        return open(p, 'rb').read()
    b = fetch()
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'wb').write(b)
    return b


# ---------------------------------------------------------------- cells --------------------------------------------------------------
def cell_of(x, y):
    return int(math.floor(x / CELL)), int(math.floor(y / CELL))


def cell_key(i, j):
    return f'{i}_{j}'


def cell_box(i, j, m=0.0):
    return (i * CELL - m, j * CELL - m, (i + 1) * CELL + m, (j + 1) * CELL + m)


# ---------------------------------------------------------------- routes -------------------------------------------------------------
def routes():
    """the routes one drives beyond the square: {name: [(x, y), ...]} in model metres – welt/fahrt.js (Schleusingen's Markt, the tree
    nursery at Kloster Veßra) and Suhl's approach (the country road and the motorway, from Suhl's data repo)"""
    out = {}
    d = json.load(open(dist_file('fahrt/strassen.json')))
    for k, r in (d.get('routes') or {}).items():
        p = r['pts'] if isinstance(r, dict) else r
        out[k] = [(p[i] / 10, p[i + 1] / 10) for i in range(0, len(p) - 1, 2)]
    try:
        a = json.loads(cached('suhl/anfahrt.json', lambda: suhl_file('s', 'anfahrt.json')))
        for k, r in (a.get('routes') or {}).items():
            if k.endswith('_rueck'):
                continue
            p = r['pts']
            out[k] = [(p[i] / 10, p[i + 1] / 10) for i in range(0, len(p) - 1, 2)]
    except Exception as e:
        log('no approach to Suhl:', e)
    return out


def suhl_file(prod, name):
    akt = json.loads(http(SUHL_BASE + 'aktuell.json'))
    p = akt['products'][prod]['path']
    return http(SUHL_BASE + p + name)


# ---------------------------------------------------------------- keep-out -----------------------------------------------------------
def ratscher_box():
    T = GEOMAN['terrain']['inner']
    return (T['x0'], T['y0'], T['x0'] + (T['n'] - 1) * T['step'], T['y0'] + (T['n'] - 1) * T['step'])


def schleusingen_zone():
    """the town's zone of welt/schleusingen.js (stadt.json zone: the helper stadtgruen plants the town's trees there)"""
    s = json.load(open(dist_file('schleusingen/stadt.json')))
    return tuple(s['zone'])


def suhl_tiles():
    """the level-10 tiles (UTM quadtree of tools/welt/wlib.py) in which Suhl's runtime plants its own trees (product b): {(x, y)}"""
    import base64
    j = json.loads(cached('suhl/b_index.json', lambda: suhl_file('b', 'index.json')))
    h = j['has']['10']
    bits = base64.b64decode(h['bits'])
    out = set()
    for k in range(h['w'] * h['h']):
        if bits[k >> 3] >> (k & 7) & 1:
            out.add((h['x0'] + k % h['w'], h['y0'] + k // h['w']))
    if len(out) != h.get('n', len(out)):  # the other bit order
        out = set()
        for k in range(h['w'] * h['h']):
            if bits[k >> 3] >> (7 - (k & 7)) & 1:
                out.add((h['x0'] + k % h['w'], h['y0'] + k // h['w']))
    return out


ROOT_E0, ROOT_N0, ROOT = 420700.0, 5390800.0, 409600.0


def suhl_tile_poly(tx, ty, L=10):
    """a Suhl tile as a model polygon"""
    s = ROOT / (1 << L)
    e0, n0 = ROOT_E0 + tx * s, ROOT_N0 + ty * s
    return [to_model(e0, n0), to_model(e0 + s, n0), to_model(e0 + s, n0 + s), to_model(e0, n0 + s)]


def keepout():
    """the areas where others plant (model metres): [(shapely geometry, name)] – Ratscher's square (its measured trees and the Klinge),
    Schleusingen's town zone (stadtgruen), Suhl's tiles (the Suhl chat), what Kloster Veßra models itself (welt/vessra.js)"""
    from shapely.geometry import box, Polygon
    from shapely.ops import unary_union
    out = [(box(*ratscher_box()), 'Ratscher (Quadrat)'), (box(*schleusingen_zone()), 'Schleusingen (Stadtzone)')]
    try:
        st = suhl_tiles()
        out.append((unary_union([Polygon(suhl_tile_poly(x, y)) for x, y in st]), 'Suhl (%d Kacheln)' % len(st)))
    except Exception as e:
        log('Suhl tiles unknown:', e)
    sys.path.insert(0, os.path.join(REPO, 'tools', 'welt-gebaeude'))
    try:
        import wglib
        for g, n in wglib.keepout('zonen'):
            if n.startswith('Veßra'):
                out.append((g, n))
    except Exception as e:
        log('no keep-out of Veßra:', e)
    return out


# ---------------------------------------------------------------- roads and the like -------------------------------------------------
# half widths of OSM highways (m) when the way names none; the carriageway – a trunk keeps a further margin
HW = {'motorway': 6.0, 'trunk': 5.0, 'primary': 3.6, 'secondary': 3.4, 'tertiary': 3.2, 'unclassified': 2.8, 'residential': 2.8,
      'living_street': 2.5, 'service': 2.0, 'track': 1.6, 'path': 0.8, 'footway': 0.9, 'cycleway': 1.0, 'bridleway': 0.9,
      'steps': 1.0, 'pedestrian': 2.5, 'road': 2.8, 'construction': 2.8}


def app_roads():
    """the roads the app draws beyond the square: [(LineString, half width)] in model metres – welt/fahrt.js and Suhl's approach"""
    from shapely.geometry import LineString
    out = []
    for name in ('fahrt/strassen.json',):
        d = json.load(open(dist_file(name)))
        for w in d['ways']:
            p = w[6]
            pts = [(p[i] / 10, p[i + 1] / 10) for i in range(0, len(p) - 2, 3)]
            if len(pts) >= 2:
                out.append((LineString(pts), max(1.5, w[2] / 20.0)))
    try:
        a = json.loads(cached('suhl/anfahrt.json', lambda: suhl_file('s', 'anfahrt.json')))
        for w in a['ways']:
            p = w[6]
            pts = [(p[i] / 10, p[i + 1] / 10) for i in range(0, len(p) - 2, 3)]
            if len(pts) >= 2:
                out.append((LineString(pts), max(1.5, w[2] / 20.0)))
    except Exception as e:
        log('no approach ways of Suhl:', e)
    return out


def osm_ways(path):
    """OSM highways, railways and power lines (Overpass JSON with geometry): [(LineString model, half width, kind)]"""
    from shapely.geometry import LineString
    els = osm_elements(path)
    out = []
    for e in els:
        if e['type'] != 'way' or 'geometry' not in e:
            continue
        t = e.get('tags', {})
        if t.get('tunnel') in ('yes', 'building_passage'):
            continue
        if 'highway' in t:
            k = t['highway']
            hw = HW.get(k)
            if hw is None:
                continue
            try:
                w = float(str(t.get('width', '')).replace(',', '.').split()[0])
                hw = max(hw, w / 2)
            except Exception:
                pass
        elif 'railway' in t:
            k, hw = 'rail', 2.5 if t['railway'] in ('rail', 'light_rail', 'narrow_gauge') else 2.0
        elif t.get('power') == 'line':
            k, hw = 'power', 7.0  # the strip under a high-voltage line is kept low
        else:
            continue
        pts = [to_model(*utm_of(g['lat'], g['lon'])) for g in e['geometry']]
        if len(pts) >= 2:
            out.append((LineString(pts), hw, k))
    return out


def osm_elements(path):
    """the elements of an Overpass JSON file, or [] (missing or broken – the pipeline runs without OSM then)"""
    if not path or not os.path.exists(path):
        return []
    try:
        return json.load(open(path)).get('elements', [])
    except Exception as e:
        log('OSM file unreadable:', path, e)
        return []


_TR = None


def utm_of(lat, lon):
    global _TR
    if _TR is None:
        from pyproj import Transformer
        _TR = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
    return _TR.transform(lon, lat)


def osm_areas(path, keys):
    """OSM areas (ways and multipolygon relations with geometry) whose tags match keys {tag: set(values)}: [(Polygon model, tags)]"""
    from shapely.geometry import Polygon
    from shapely.ops import unary_union, polygonize
    out = []
    for e in osm_elements(path):
        t = e.get('tags', {})
        if not any(t.get(k) in v for k, v in keys.items()):
            continue
        try:
            if e['type'] == 'way' and 'geometry' in e and len(e['geometry']) >= 4:
                g = Polygon([to_model(*utm_of(q['lat'], q['lon'])) for q in e['geometry']]).buffer(0)
            elif e['type'] == 'relation':
                from shapely.geometry import LineString
                outer, inner = [], []
                for m in e.get('members', []):
                    if m.get('type') != 'way' or 'geometry' not in m or len(m['geometry']) < 2:
                        continue
                    ls = LineString([to_model(*utm_of(q['lat'], q['lon'])) for q in m['geometry']])
                    (inner if m.get('role') == 'inner' else outer).append(ls)
                po = list(polygonize(outer))
                if not po:
                    continue
                g = unary_union(po)
                pi = list(polygonize(inner))
                if pi:
                    g = g.difference(unary_union(pi))
                g = g.buffer(0)
            else:
                continue
        except Exception:
            continue
        if not g.is_empty:
            out.append((g, t))
    return out


def ethos_polys(path, bbox_model):
    """ETHOS.BUILDA footprints (JSON lines in UTM, tools/welt-gebaeude/filter_ethos.py) inside a model box: [Polygon model]"""
    from shapely.geometry import Polygon
    if not path or not os.path.exists(path):
        return []
    x0, y0, x1, y1 = bbox_model
    cs = [to_utm(x0, y0), to_utm(x1, y0), to_utm(x0, y1), to_utm(x1, y1)]
    E0, E1 = min(c[0] for c in cs) - 50, max(c[0] for c in cs) + 50
    N0, N1 = min(c[1] for c in cs) - 50, max(c[1] for c in cs) + 50
    out = []
    for ln in open(path):
        k = ln.find('"poly":')
        if k < 0:
            continue
        k += 7
        while k < len(ln) and ln[k] == '[':
            k += 1
        # a cheap test on the first vertex before parsing the line
        try:
            c1 = ln.index(',', k)
            e0 = float(ln[k:c1])
            n0 = float(ln[c1 + 1:ln.index(']', c1)])
        except ValueError:
            continue
        if not (E0 <= e0 <= E1 and N0 <= n0 <= N1):
            continue
        d = json.loads(ln)
        for rings in d['poly']:
            try:
                g = Polygon([to_model(a, b) for a, b in rings[0]], [[to_model(a, b) for a, b in r] for r in rings[1:]]).buffer(0)
                if not g.is_empty:
                    out.append(g)
            except Exception:
                pass
    return out
