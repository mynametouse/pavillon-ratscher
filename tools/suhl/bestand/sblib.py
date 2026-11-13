"""suhl-bestand: shared helpers of the Suhl inventory (stage 1 of the Suhl plan, docs/plans/auftraege/suhl-bestand.md).

Raw downloads live outside git: SUHL_RAW (default /tmp/suhl-bestand/raw; ~/suhl-raw in GitHub Actions). Results: tools/suhl/out/bestand/.
OpenStreetMap comes from two sources into the same in-memory model (load_osm): the OSM API map call in small boxes (osm_api.py, from the
chat machine) or an OPL file cut from the Geofabrik extract with osmium (GitHub Actions). All metric work in ETRS89 / UTM 32N (EPSG:25832).
"""
import glob, gzip, json, math, os, sys, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(os.path.dirname(HERE)))
OUT = os.path.join(REPO, 'tools', 'suhl', 'out', 'bestand')
RAW = os.environ.get('SUHL_RAW', '/tmp/suhl-bestand/raw')
UA = 'PavillonRatscher-Suhl/0.1 (+https://github.com/mynametouse/pavillon-ratscher)'
REL_SUHL = 62450                       # OSM relation of the kreisfreie Stadt Suhl (admin_level 6, AGS 16054000)
CENTRE = (50.6086518, 10.6926437)      # lat, lon of the admin centre node (Nominatim, 12.11.2026)
GARDEN = (50.4991, 10.7692)


def log(*a):
    print(*a, flush=True)


def now():
    return time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())


def http_get(url, timeout=90, tries=4, pause=4.0, headers=None, limit=None):
    """GET with our User-Agent, retries with backoff on 429/5xx/network errors. Returns (status, body bytes, content-type)."""
    h = {'User-Agent': UA}
    h.update(headers or {})
    last = (0, b'', '')
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers=h)
            with urllib.request.urlopen(req, timeout=timeout) as r:
                b = r.read(limit) if limit else r.read()
                return r.status, b, r.headers.get('content-type', '')
        except urllib.error.HTTPError as ex:
            b = ex.read()[:4000]
            last = (ex.code, b, ex.headers.get('content-type', '') if ex.headers else '')
            if ex.code not in (429, 500, 502, 503, 504, 509):
                return last
        except Exception as ex:   # timeouts, resets
            last = (0, repr(ex).encode()[:400], '')
        time.sleep(pause * (k + 1))
    return last


_tf = {}


def to_utm(lon, lat):
    """WGS84 -> ETRS89 / UTM 32N (EPSG:25832); scalars or numpy arrays"""
    from pyproj import Transformer
    t = _tf.get('f') or _tf.setdefault('f', Transformer.from_crs(4326, 25832, always_xy=True))
    return t.transform(lon, lat)


def to_wgs(e, n):
    from pyproj import Transformer
    t = _tf.get('b') or _tf.setdefault('b', Transformer.from_crs(25832, 4326, always_xy=True))
    return t.transform(e, n)


# ---------------- OpenStreetMap model ----------------
class Osm:
    """nodes: id -> (E, N); ntags: id -> tags (tagged nodes only); ways: id -> (node ids, tags); rels: id -> (members, tags)"""

    def __init__(self):
        self.nll, self.nodes, self.ntags, self.ways, self.rels = {}, {}, {}, {}, {}
        self.source, self.stamp = '', ''

    def finish(self):
        import numpy as np
        ids = list(self.nll)
        if ids:
            ll = np.array([self.nll[i] for i in ids])
            e, n = to_utm(ll[:, 0], ll[:, 1])
            self.nodes = {i: (float(a), float(b)) for i, a, b in zip(ids, e, n)}
        return self

    def line(self, wid):
        """UTM coordinates of a way, None when a node is missing"""
        w = self.ways.get(wid)
        if not w:
            return None
        try:
            return [self.nodes[i] for i in w[0]]
        except KeyError:
            return None

    def way_area(self, wid):
        """shapely polygon of a closed way (valid), or None"""
        from shapely.geometry import Polygon
        c = self.line(wid)
        if not c or len(c) < 4 or c[0] != c[-1]:
            return None
        p = Polygon(c)
        if not p.is_valid:
            p = p.buffer(0)
        return p if (not p.is_empty and p.area > 0) else None

    def rel_area(self, rid):
        """multipolygon relation -> shapely geometry from the member ways that are present (outer minus inner), or None"""
        from shapely.geometry import LineString
        from shapely.ops import polygonize, unary_union
        r = self.rels.get(rid)
        if not r:
            return None
        outer, inner = [], []
        for m in r[0]:
            if m[0] != 'w':
                continue
            c = self.line(m[1])
            if c and len(c) >= 2:
                (inner if m[2] == 'inner' else outer).append(LineString(c))
        if not outer:
            return None
        try:
            po = unary_union(list(polygonize(unary_union(outer))))
            if inner:
                pi = list(polygonize(unary_union(inner)))
                if pi:
                    po = po.difference(unary_union(pi))
        except Exception:
            return None
        if not po.is_valid:
            po = po.buffer(0)
        return po if (not po.is_empty and po.area > 0) else None

    def areas(self, pred):
        """yield (kind 'w'|'r', id, tags, polygon) for closed ways and multipolygon relations whose tags satisfy pred"""
        for wid, (nd, tags) in self.ways.items():
            if tags and pred(tags):
                p = self.way_area(wid)
                if p is not None:
                    yield 'w', wid, tags, p
        for rid, (mem, tags) in self.rels.items():
            if tags and tags.get('type') in ('multipolygon', 'boundary') and pred(tags):
                p = self.rel_area(rid)
                if p is not None:
                    yield 'r', rid, tags, p


def load_osm_api(rawdir=None):
    """merge the cached map calls of osm_api.py (JSON of the OSM API 0.6)"""
    o = Osm()
    files = sorted(glob.glob(os.path.join(rawdir or os.path.join(RAW, 'osm'), 'map_*.json')))
    for p in files:
        try:
            d = json.load(open(p, encoding='utf-8'))
        except Exception as ex:
            log('unreadable', p, ex)
            continue
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
        o.stamp = max(o.stamp, os.path.basename(p) and time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(os.path.getmtime(p))))
    o.source = f'OSM API 0.6 map calls ({len(files)} boxes)'
    return o.finish()


def _opl_unesc(s):
    if '%' not in s:
        return s
    out, parts = [], s.split('%')
    for k, part in enumerate(parts):
        out.append(chr(int(part, 16)) if (k % 2 == 1 and part) else part)
    return ''.join(out)


def load_osm_opl(path):
    """an OPL file (osmium cat -f opl), plain or .gz"""
    o = Osm()
    op = gzip.open if path.endswith('.gz') else open
    with op(path, 'rt', encoding='utf-8') as f:
        for ln in f:
            ln = ln.rstrip('\n')
            if not ln:
                continue
            t, f0 = ln[0], ln.split(' ')
            i = int(f0[0][1:])
            tags, x, y, nd, mem = {}, None, None, [], []
            for fld in f0[1:]:
                if not fld:
                    continue
                c, v = fld[0], fld[1:]
                if c == 'T' and v:
                    for kv in v.split(','):
                        k, _, val = kv.partition('=')
                        tags[_opl_unesc(k)] = _opl_unesc(val)
                elif c == 'x' and v:
                    x = float(v)
                elif c == 'y' and v:
                    y = float(v)
                elif c == 'N' and v:
                    nd = [int(q[1:].split('x')[0]) for q in v.split(',')]
                elif c == 'M' and v:
                    for q in v.split(','):
                        ref, _, role = q.partition('@')
                        mem.append((ref[0], int(ref[1:]), _opl_unesc(role)))
            if t == 'n' and x is not None:
                o.nll[i] = (x, y)
                if tags:
                    o.ntags[i] = tags
            elif t == 'w':
                o.ways[i] = (nd, tags)
            elif t == 'r':
                o.rels[i] = (mem, tags)
    o.source, o.stamp = 'Geofabrik extract thueringen-latest.osm.pbf, cut with osmium', now()
    return o.finish()


def load_osm(opl=None):
    return load_osm_opl(opl) if opl else load_osm_api()


def stadt_polygon_wgs(path=None):
    """the municipal boundary of Suhl from the cached relation/62450/full.json: shapely polygon in lon/lat, relation tags"""
    from shapely.geometry import LineString
    from shapely.ops import polygonize, unary_union
    d = json.load(open(path or os.path.join(RAW, 'rel62450_full.json'), encoding='utf-8'))
    nd = {e['id']: (e['lon'], e['lat']) for e in d['elements'] if e['type'] == 'node'}
    ways = {e['id']: e for e in d['elements'] if e['type'] == 'way'}
    rel = [e for e in d['elements'] if e['type'] == 'relation' and e['id'] == REL_SUHL][0]
    outer = [LineString([nd[i] for i in ways[m['ref']]['nodes']]) for m in rel['members'] if m['type'] == 'way' and m['role'] in ('outer', '')]
    inner = [LineString([nd[i] for i in ways[m['ref']]['nodes']]) for m in rel['members'] if m['type'] == 'way' and m['role'] == 'inner']
    po = unary_union(list(polygonize(unary_union(outer))))
    if inner:
        po = po.difference(unary_union(list(polygonize(unary_union(inner)))))
    return po, rel['tags'], rel


def tf_geom(g, fn):
    """transform a shapely geometry with fn(x, y) -> (x, y)"""
    from shapely.ops import transform
    return transform(lambda x, y, z=None: fn(x, y), g)


def bbox_km(g_utm):
    """bounding box of a UTM geometry in km, 3 decimals: [E0, N0, E1, N1]"""
    b = g_utm.bounds
    return [round(v / 1000, 3) for v in b]


def write_json(path, obj, **kw):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(obj, f, ensure_ascii=False, **kw)
        f.write('\n')
