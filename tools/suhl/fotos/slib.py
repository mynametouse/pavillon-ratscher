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


class FastGeom:
    """Point-in-polygon for many points: the edges of all rings are sorted into latitude bands (even-odd rule, so holes work)."""

    def __init__(self, geom, bands=400):
        polys = geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]
        edges = [(r[i][0], r[i][1], r[i + 1][0], r[i + 1][1]) for poly in polys for r in poly for i in range(len(r) - 1) if r[i][1] != r[i + 1][1]]
        self.y0 = min(min(e[1], e[3]) for e in edges); self.y1 = max(max(e[1], e[3]) for e in edges)
        self.x0 = min(min(e[0], e[2]) for e in edges); self.x1 = max(max(e[0], e[2]) for e in edges)
        self.n = bands; self.h = (self.y1 - self.y0) / bands or 1e-9
        self.band = [[] for _ in range(bands)]
        for e in edges:
            a = int((min(e[1], e[3]) - self.y0) / self.h); b = int((max(e[1], e[3]) - self.y0) / self.h)
            for k in range(max(0, a), min(bands - 1, b) + 1): self.band[k].append(e)

    def has(self, lat, lon):
        if not (self.y0 <= lat <= self.y1 and self.x0 <= lon <= self.x1): return False
        inside = False
        for xi, yi, xj, yj in self.band[min(self.n - 1, int((lat - self.y0) / self.h))]:
            if (yi > lat) != (yj > lat) and lon < (xj - xi) * (lat - yi) / (yj - yi) + xi: inside = not inside
        return inside


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
        self.geom, self._fast = {}, {}
        prov = os.path.join(OUT, 'gebiete_vorlaeufig.geojson')
        self.landmarks, self.quarters = [], []
        # 1. a file given by the caller, 2. the copy of suhl-bestand's gebiete.geojson kept next to the results (so that the chat
        # machine and GitHub Actions use the same areas), 3. the provisional circles
        for p, label in ((path, 'suhl-bestand'), (os.path.join(OUT, 'gebiete.geojson'), 'suhl-bestand'), (prov, 'provisional')):
            if not p or not os.path.exists(p): continue
            try: fc = json.load(open(p, encoding='utf-8'))
            except Exception: continue
            for f in fc.get('features', []):
                pr = f.get('properties') or {}
                gt = (f.get('geometry') or {}).get('type')
                # the area is named by the property id (suhl-bestand) or gebiet (provisional file) - exactly, never by a word in the long name
                g = str(pr.get('id') or pr.get('gebiet') or '').lower()
                if g in ('zentrum', 'kernstadt', 'stadt') and gt in ('Polygon', 'MultiPolygon') and g not in self.geom:
                    self.geom[g] = f['geometry']
                    if label == 'suhl-bestand': self.source = 'suhl-bestand'
                elif label == 'suhl-bestand' and pr.get('art') == 'landmarke' and pr.get('osm'): self.landmarks.append(pr)
                elif label == 'suhl-bestand' and pr.get('art') == 'ortsteil' and gt == 'Point':
                    self.quarters.append(dict(name=pr.get('name'), place=pr.get('place'), lat=f['geometry']['coordinates'][1], lon=f['geometry']['coordinates'][0]))
        self.geom.setdefault('zentrum', circle(CENTRE[0], CENTRE[1], R_ZENTRUM))
        self.geom.setdefault('kernstadt', circle(CENTRE[0], CENTRE[1], R_KERNSTADT))

    def has(self, g, lat, lon):
        if g not in self.geom: return False
        if g not in self._fast: self._fast[g] = FastGeom(self.geom[g])
        return self._fast[g].has(lat, lon)

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
