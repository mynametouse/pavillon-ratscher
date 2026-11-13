"""suhl-gebaeude (stage 2 of the Suhl plan, package S2-2 "Gebäude", docs/plans/auftraege/suhl-gebaeude.md): shared helpers.

One parametric record per building of the municipality of Suhl, in level-10 tiles (400 m) of the world quadtree (tools/welt/wlib.py,
ETRS89 / UTM 32N). Raw downloads live outside git: SUHL_RAW (default /tmp/suhl-gebaeude/raw; ~/suhl-raw in GitHub Actions).
Results: tools/suhl/out/gebaeude/ (small files, `git add -f`). All metric work in UTM 32N (EPSG:25832): one model metre of the app is
1.0157 m and the model axes are turned by 4.36 degrees, so areas and lengths are never taken from model geometry.

Frame of a tile's records: the tile-local frame of the Suhl data library (tools/suhl/lib/suhllib.py TileFrame): x = model x - ox,
y = model y - oy with (ox, oy) = the tile centre in model metres (the tile's field `o`), axes parallel to the model axes; heights in
true metres (absolute heights as model z = NHN - H0). The geometry is computed in UTM and turned into that frame only when written.
"""
import json, math, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
# the tools we read from other packages come AFTER our own folder on the path (stage 1 has modules with everyday names of its own)
for _d in (HERE, os.path.join(REPO, 'tools', 'suhl', 'lib'), os.path.join(REPO, 'tools', 'suhl', 'bestand'), os.path.join(REPO, 'tools', 'welt')):
    while _d in sys.path:
        sys.path.remove(_d)
    sys.path.append(_d)
sys.path.insert(0, HERE)
import wlib      # the quadtree and the model frame (read only)
import sblib     # stage 1: polite HTTP, the OSM model, WGS84 <-> UTM (read only)
import suhllib as S   # the common ground of the Suhl data tools (suhl-daten): tile frame, guards, tile sets, paths

OUT = os.path.join(REPO, 'tools', 'suhl', 'out', 'gebaeude')
BESTAND = os.path.join(REPO, 'tools', 'suhl', 'out', 'bestand')
RAW = os.environ.get('SUHL_RAW', '/tmp/suhl-gebaeude/raw')
UA = sblib.UA
LEVEL = 10                               # content tiles: 400 m
CENTRE = (619762.0, 5607680.0)           # the centre of Suhl in UTM 32N (E, N) - must lie inside everything we fetch for the city
SCHEMA = 1                               # schema number of the building tiles (tile header `schema`)
A_, B_ = wlib.XF['a'], wlib.XF['b']
ROT = math.degrees(math.atan2(B_, A_))   # the model axes are turned by this angle against UTM (4.36 degrees)
SCALE = math.hypot(A_, B_)               # one model metre in UTM metres (1.0157)
# grid convergence at the centre of Suhl: UTM grid north lies this far east of true north (+1.31 degrees).
# Azimuths in the records are degrees from TRUE north, clockwise.
CONV = round(S.convergence_deg(*CENTRE), 4)
S2 = A_ * A_ + B_ * B_


def local(dx, dy):
    """metres on the UTM axes relative to a tile centre -> the tile-local frame (model metres, model axes); scalars or numpy arrays"""
    return (A_ * dx + B_ * dy) / S2, (-B_ * dx + A_ * dy) / S2


def unlocal(x, y):
    """the inverse of local(): tile-local model metres -> metres on the UTM axes relative to the tile centre"""
    return A_ * x - B_ * y, B_ * x + A_ * y


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def tile_of(E, N, L=LEVEL):
    s = wlib.tsize(L)
    return int(math.floor((E - wlib.ROOT_E0) / s)), int(math.floor((N - wlib.ROOT_N0) / s))


def tiles_touching(geom, L=LEVEL):
    """the tiles of level L whose square intersects a shapely geometry (UTM)"""
    from shapely.geometry import box
    x0, y0, x1, y1 = wlib.trange(L, geom.bounds)
    out = []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if geom.intersects(box(*wlib.tbounds(L, x, y))):
                out.append((x, y))
    return out


_areas = None


def areas():
    """the areas of stage 1 (tools/suhl/out/bestand/gebiete.geojson) as shapely polygons in UTM: stadt, kernstadt, zentrum;
    plus 'orte': the Ortsteil points [(name, E, N)]"""
    global _areas
    if _areas is None:
        from shapely.geometry import shape
        fc = json.load(open(os.path.join(BESTAND, 'gebiete.geojson'), encoding='utf-8'))
        A = {}
        orte = []
        for f in fc['features']:
            p = f['properties']
            if p.get('art') == 'gebiet':
                A[p['id']] = sblib.tf_geom(shape(f['geometry']), sblib.to_utm)
            elif f['geometry']['type'] == 'Point' and p.get('art') == 'ortsteil':
                e, n = sblib.to_utm(*f['geometry']['coordinates'][:2])
                orte.append((p.get('name') or p.get('id'), float(e), float(n)))
        A['orte'] = orte
        _areas = A
    return _areas


def sample_tiles():
    """the level-10 tiles that touch the pilot quarter `zentrum` (the sample set, 'Probesatz')"""
    return tiles_touching(areas()['zentrum'])


def check_centre(box, what):
    """lesson of the old Suhl run: stop when the centre of Suhl is not inside what we fetch for the city (suhllib.guard)"""
    S.guard(box=box, what='suhl-gebaeude ' + what)


def http_cached(url, path, pause=1.5, timeout=180, tries=4, min_bytes=200):
    """polite GET into a cache file: returns (bytes, from_cache). Pauses after a real request; retries with backoff (sblib.http_get)."""
    if os.path.exists(path) and os.path.getsize(path) >= min_bytes:
        return open(path, 'rb').read(), True
    st, body, ct = sblib.http_get(url, timeout=timeout, tries=tries, pause=6.0)
    if st != 200 or len(body) < min_bytes:
        raise RuntimeError(f'GET {url[:140]} -> HTTP {st}, {len(body)} bytes: {body[:200]!r}')
    os.makedirs(os.path.dirname(path), exist_ok=True)
    tmp = path + '.part'
    open(tmp, 'wb').write(body)
    os.replace(tmp, path)
    time.sleep(pause)
    return body, False


def write_json(path, obj, compact=True):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        if compact:
            json.dump(obj, f, ensure_ascii=False, separators=(',', ':'))
        else:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        f.write('\n')


def r1(v):
    return round(float(v), 1)


def r2(v):
    return round(float(v), 2)


def hexcol(c):
    """sRGB 0..1 -> '#rrggbb'"""
    return '#%02x%02x%02x' % tuple(int(max(0, min(255, round(float(v) * 255)))) for v in c[:3])
