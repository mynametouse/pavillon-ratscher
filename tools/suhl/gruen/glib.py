"""suhl-gruen: shared helpers of the package S2-4 "Grün" (trees, forest stands, green areas of Suhl; stage 2 of the Suhl plan,
docs/plans/auftraege/suhl-gruen.md). Everything metric in ETRS89 / UTM 32N (EPSG:25832); tiles on the quadtree of tools/welt/wlib.py
(level 10 = 400 m). Raw downloads live outside git: SUHL_RAW (default /tmp/suhl-gruen/raw; ~/suhl-raw in GitHub Actions).
Results: tools/suhl/out/gruen/. Nothing here changes a file outside tools/suhl/gruen and tools/suhl/out/gruen.
"""
import glob, gzip, json, math, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
for _p in (os.path.join(REPO, 'tools', 'welt'), os.path.join(REPO, 'tools', 'suhl', 'bestand')):   # read only; appended, so that
    if _p not in sys.path:                                                                        # this package's modules win
        sys.path.append(_p)
import wlib                      # the quadtree, xf, H0 (read only)

OUT = os.path.join(REPO, 'tools', 'suhl', 'out', 'gruen')
RAW = os.environ.get('SUHL_RAW', '/tmp/suhl-gruen/raw')
UA = 'PavillonRatscher-Suhl/0.1 (+https://github.com/mynametouse/pavillon-ratscher)'
WMS = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP'
CENTRE_UTM = (619762.0, 5607680.0)       # the centre of Suhl (Markt), from the lead's brief; gebiete.geojson: (619765, 5607674)
L = 10                                   # content tiles: 400 m
GEBIETE = os.path.join(REPO, 'tools', 'suhl', 'out', 'bestand', 'gebiete.geojson')
ATTRIBUTION = ('Luftbild (DOP20 RGB und CIR, Bildflug 15.05.2024): © GDI-Th, CC BY 4.0 (dl-de/by-2-0); '
               'Bäume, Baumreihen, Wald- und Grünflächen: © OpenStreetMap-Mitwirkende, ODbL 1.0')


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def now():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


_tf = {}


def to_utm(lon, lat):
    from pyproj import Transformer
    t = _tf.get('f') or _tf.setdefault('f', Transformer.from_crs(4326, 25832, always_xy=True))
    return t.transform(lon, lat)


def to_wgs(e, n):
    from pyproj import Transformer
    t = _tf.get('b') or _tf.setdefault('b', Transformer.from_crs(25832, 4326, always_xy=True))
    return t.transform(e, n)


def area_utm(name):
    """the polygon of an area ('stadt', 'kernstadt', 'zentrum') of gebiete.geojson as a shapely geometry in UTM"""
    from shapely.geometry import shape
    from shapely.ops import transform
    g = json.load(open(GEBIETE, encoding='utf-8'))
    for f in g['features']:
        if f['properties'].get('id') == name:
            return transform(lambda x, y, z=None: to_utm(x, y), shape(f['geometry']))
    raise KeyError(name)


def tiles_of(geom, level=L):
    """the tiles (x, y) of a level that touch a UTM geometry, sorted"""
    from shapely.geometry import box
    x0, y0, x1, y1 = wlib.trange(level, geom.bounds)
    out = []
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if box(*wlib.tbounds(level, x, y)).intersects(geom):
                out.append((x, y))
    return out


def check_box(bbox, what=''):
    """the lesson of the old Suhl data: stop when the box of a city-wide fetch does not hold the centre of Suhl"""
    e0, n0, e1, n1 = bbox
    if not (e0 <= CENTRE_UTM[0] <= e1 and n0 <= CENTRE_UTM[1] <= n1):
        raise SystemExit(f'{what}: the centre of Suhl {CENTRE_UTM} is outside the box {bbox}')


# ---------------- polite HTTP with a cache ----------------
_last = [0.0]


def http_get(url, timeout=180, tries=4, pause=1.2):
    """GET with our User-Agent, at most one request at a time with a pause between requests, retries with backoff.
    Returns (status, bytes, content-type)."""
    import urllib.request, urllib.error
    last = (0, b'', '')
    for k in range(tries):
        dt = time.time() - _last[0]
        if dt < pause:
            time.sleep(pause - dt)
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                b = r.read()
                _last[0] = time.time()
                return r.status, b, r.headers.get('content-type', '')
        except urllib.error.HTTPError as ex:
            last = (ex.code, ex.read()[:2000], ex.headers.get('content-type', '') if ex.headers else '')
            _last[0] = time.time()
            if ex.code not in (429, 500, 502, 503, 504, 509):
                return last
        except Exception as ex:
            last = (0, repr(ex).encode()[:400], '')
            _last[0] = time.time()
        time.sleep(4.0 * (k + 1))
    return last


def wms_image(layer, bbox, px, raw=None):
    """one GetMap of the Thuringian orthophoto service (EPSG:25832, JPEG), cached; -> uint8 array (rows from the north), 3 channels.
    th_dop = red, green, blue; th_dop20cir = near infrared, red, green. bbox = (E0, N0, E1, N1) in metres, px = metres per pixel."""
    import numpy as np
    from PIL import Image
    e0, n0, e1, n1 = bbox
    w, h = int(round((e1 - e0) / px)), int(round((n1 - n0) / px))
    if w > 5000 or h > 5000:
        raise ValueError('the service allows at most 5000 x 5000 px per request')
    p = os.path.join(raw or RAW, 'dop', f'{layer}_{int(round(px * 100))}cm_{e0:.0f}_{n0:.0f}_{e1:.0f}_{n1:.0f}.jpg')
    if not (os.path.exists(p) and os.path.getsize(p) > 2000):
        url = (f'{WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS={layer}&STYLES=&CRS=EPSG:25832'
               f'&BBOX={e0:.2f},{n0:.2f},{e1:.2f},{n1:.2f}&WIDTH={w}&HEIGHT={h}&FORMAT=image/jpeg')
        st, b, ct = http_get(url)
        if st != 200 or not ct.startswith('image/'):
            raise RuntimeError(f'WMS {layer} {bbox}: HTTP {st} {ct} {b[:200]!r}')
        os.makedirs(os.path.dirname(p), exist_ok=True)
        tmp = p + '.part'
        open(tmp, 'wb').write(b)
        os.replace(tmp, p)
    return np.asarray(Image.open(p).convert('RGB'))


# ---------------- OpenStreetMap: the model of tools/suhl/bestand/sblib.py (read only) ----------------
def load_osm(opl=None, api_dir=None):
    """OSM as sblib.Osm: from an OPL file (osmium, GitHub Actions) or from the cached OSM API map calls of stage 1 (chat machine)"""
    import sblib
    if opl:
        return sblib.load_osm_opl(opl)
    d = api_dir or os.environ.get('SUHL_OSM_API', '/tmp/suhl-bestand/raw/osm')
    return sblib.load_osm_api(d)


HALF_WIDTH = {  # carriageway half widths by highway class (m) – estimates until suhl-strassen delivers measured cross sections
    'motorway': 5.75, 'motorway_link': 3.25, 'trunk': 5.0, 'trunk_link': 3.0, 'primary': 3.75, 'primary_link': 2.75,
    'secondary': 3.5, 'secondary_link': 2.75, 'tertiary': 3.25, 'tertiary_link': 2.5, 'unclassified': 2.75, 'residential': 2.75,
    'living_street': 2.25, 'service': 1.75, 'pedestrian': 0.0, 'track': 1.5, 'busway': 3.25, 'road': 2.5,
}


def road_half_width(tags):
    hw = tags.get('highway')
    if hw not in HALF_WIDTH or tags.get('tunnel') in ('yes', 'building_passage') or tags.get('area') == 'yes':
        return None
    w = HALF_WIDTH[hw]
    try:
        if tags.get('width'):
            w = max(1.0, float(tags['width'].replace(',', '.').split()[0]) / 2)
        elif tags.get('lanes') and hw not in ('service', 'track'):
            w = max(w, float(tags['lanes']) * 1.6)
    except ValueError:
        pass
    if tags.get('service') in ('driveway', 'parking_aisle', 'alley'):
        w = min(w, 1.5)
    return w


def write_json(path, obj, **kw):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, **kw)
        f.write('\n')
