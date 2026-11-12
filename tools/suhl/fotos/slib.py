"""Shared helpers of the Suhl photo inventory (stage 1 of the Suhl plan): polite HTTP, the areas, small geometry.
Only the standard library. Used by the scripts next to it (they add this folder to sys.path themselves)."""
import os, json, gzip, math, time, urllib.request, urllib.error

UA = 'PavillonRatscher-Suhl/0.1 (+https://github.com/mynametouse/pavillon-ratscher)'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.environ.get('SUHL_FOTOS_OUT') or os.path.normpath(os.path.join(HERE, '..', 'out', 'fotos'))   # the env variable is for tests only
CENTRE = (50.6087, 10.6926)          # centre of Suhl (lat, lon) - the common file of the Suhl agents
R_ZENTRUM, R_KERNSTADT = 900.0, 5000.0   # provisional circles until suhl-bestand publishes gebiete.geojson
M_LAT = 111320.0
M_LON = 111320.0 * math.cos(math.radians(CENTRE[0]))
_last = {}


def get(url, pause=1.0, tries=5, timeout=90, headers=None, data=None):
    """GET (or POST with data) with a pause per host, retries with backoff, Retry-After honoured. Returns bytes or raises."""
    host = url.split('/')[2]
    err = None
    for i in range(tries):
        wait = pause - (time.time() - _last.get(host, 0))
        if wait > 0: time.sleep(wait)
        _last[host] = time.time()
        req = urllib.request.Request(url, headers=dict({'User-Agent': UA}, **(headers or {})), data=data)
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r: return r.read()
        except urllib.error.HTTPError as e:
            err = e
            if e.code in (400, 401, 403, 404, 410): raise
            ra = e.headers.get('Retry-After')
            time.sleep(min(120, int(ra) + 1 if ra and ra.isdigit() else 5 * 2 ** i))
        except Exception as e:
            err = e; time.sleep(5 * (i + 1))
    raise RuntimeError(f'failed after {tries} tries: {url} ({err})')


def get_json(url, **kw):
    return json.loads(get(url, **kw))


def xy(lat, lon):
    """Local metres east/north of the centre of Suhl (equirectangular - good to well under 1 m per km at this size)."""
    return (lon - CENTRE[1]) * M_LON, (lat - CENTRE[0]) * M_LAT


def ll(x, y):
    return CENTRE[0] + y / M_LAT, CENTRE[1] + x / M_LON


def dist_m(a, b):
    ax, ay = xy(*a); bx, by = xy(*b)
    return math.hypot(ax - bx, ay - by)


def in_ring(x, y, ring):
    inside = False
    j = len(ring) - 1
    for i in range(len(ring)):
        xi, yi = ring[i]; xj, yj = ring[j]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi: inside = not inside
        j = i
    return inside


def in_geom(lat, lon, geom):
    """Point in a GeoJSON Polygon/MultiPolygon (lon/lat rings, holes honoured)."""
    polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
    for poly in polys:
        if in_ring(lon, lat, poly[0]) and not any(in_ring(lon, lat, h) for h in poly[1:]): return True
    return False


def circle(lat, lon, r, n=72):
    pts = []
    for i in range(n + 1):
        a = 2 * math.pi * i / n
        pts.append([round(lon + r * math.sin(a) / M_LON, 6), round(lat + r * math.cos(a) / M_LAT, 6)])
    return {'type': 'Polygon', 'coordinates': [pts]}


class Areas:
    """stadt / kernstadt / zentrum as GeoJSON geometries. Source: gebiete.geojson of suhl-bestand if given and usable,
    else the provisional ones (circles around the centre, the municipality from OpenStreetMap via Nominatim)."""

    def __init__(self, path=None):
        self.source = 'provisional'
        self.geom = {}
        prov = os.path.join(OUT, 'gebiete_vorlaeufig.geojson')
        for p, label in ((path, 'suhl-bestand'), (prov, 'provisional')):
            if not p or not os.path.exists(p): continue
            try: fc = json.load(open(p, encoding='utf-8'))
            except Exception: continue
            for f in fc.get('features', []):
                pr = f.get('properties') or {}
                key = ' '.join(str(pr.get(k, '')) for k in ('gebiet', 'id', 'key', 'name', 'kind', 'typ')).lower()
                if not f.get('geometry') or f['geometry']['type'] not in ('Polygon', 'MultiPolygon'): continue
                for g in ('zentrum', 'kernstadt', 'stadt'):
                    # 'stadt' must not match 'kernstadt'
                    hit = (g in key.split()) or (g != 'stadt' and g in key)
                    if hit and g not in self.geom:
                        self.geom[g] = f['geometry']
                        if label == 'suhl-bestand': self.source = 'suhl-bestand'
                        break
        self.geom.setdefault('zentrum', circle(CENTRE[0], CENTRE[1], R_ZENTRUM))
        self.geom.setdefault('kernstadt', circle(CENTRE[0], CENTRE[1], R_KERNSTADT))

    def has(self, g, lat, lon):
        return g in self.geom and in_geom(lat, lon, self.geom[g])

    def of(self, lat, lon):
        """The smallest area a point lies in: zentrum, kernstadt, stadt or umland."""
        for g in ('zentrum', 'kernstadt', 'stadt'):
            if self.has(g, lat, lon): return g
        return 'umland'

    def bbox(self, g, pad=0.0):
        polys = self.geom[g]['coordinates'] if self.geom[g]['type'] == 'MultiPolygon' else [self.geom[g]['coordinates']]
        xs = [p[0] for poly in polys for p in poly[0]]; ys = [p[1] for poly in polys for p in poly[0]]
        return min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad   # lon0, lat0, lon1, lat1


def load(name):
    p = os.path.join(OUT, name)
    with (gzip.open(p, 'rt', encoding='utf-8') if p.endswith('.gz') else open(p, encoding='utf-8')) as f: return json.load(f)


def save(name, obj, indent=None):
    p = os.path.join(OUT, name); os.makedirs(os.path.dirname(p), exist_ok=True)
    s = json.dumps(obj, ensure_ascii=False, indent=indent, separators=None if indent else (',', ':'))
    if p.endswith('.gz'):
        with gzip.GzipFile(p, 'wb', mtime=0) as f: f.write(s.encode('utf-8'))   # mtime=0: the same content gives the same file
    else:
        with open(p, 'w', encoding='utf-8') as f: f.write(s + '\n')
    return p


def angdiff(a, b):
    """Smallest difference of two compass directions in degrees (0..180)."""
    return abs((a - b + 180) % 360 - 180)


def bearing(x0, y0, x1, y1):
    """Compass direction from point 0 to point 1 (0 = north, 90 = east) in local metres."""
    return math.degrees(math.atan2(x1 - x0, y1 - y0)) % 360
