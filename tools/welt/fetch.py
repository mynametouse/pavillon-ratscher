"""Downloads for the world tiles (run in GitHub Actions; the chat sandbox only reaches an allowlist).
Everything lands in a raw cache directory (kept between runs with actions/cache) and is reused when present.
  DGM1 / DOM1 Thüringen   1 km tiles (zip with GeoTIFF or XYZ), © GDI-Th, CC BY 4.0
  Copernicus DEM GLO-30   1° COG tiles from the AWS open data bucket, © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018,
                          provided under COPERNICUS by the European Union and ESA
  DOP Thüringen (WMS)     orthophotos at any resolution (the server scales), © GDI-Th, CC BY 4.0
  OpenStreetMap           Overpass API (fallback: OSM API map calls in chunks), © OpenStreetMap contributors, ODbL 1.0
"""
import io, json, os, sys, time, zipfile
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wlib import http_get, log

DGM_PERIODS = ('2020-2025', '2014-2019')
_host_down = {}


def dgm1_path(raw, kind, ex, ny):
    return os.path.join(raw, f'{kind}1', f'{kind}1_32_{ex}_{ny}.zip')


def fetch_dgm1(raw, kind, ex, ny):
    """kind 'dgm' or 'dom'; ex, ny = km indices of the lower-left corner (EPSG:25832). Returns the zip path or None."""
    p = dgm1_path(raw, kind, ex, ny)
    if os.path.exists(p) and os.path.getsize(p) > 2000:
        return p
    if _host_down.get('th'):
        return None
    K = kind.upper()
    for per in DGM_PERIODS:
        url = f'https://geoportal.geoportal-th.de/hoehendaten/{K}/{kind}_{per}/{kind}1_32_{ex}_{ny}_1_th_{per}.zip'
        try:
            st, b, ct = http_get(url, tries=2, timeout=120)
        except Exception as e:
            log('DGM1', kind, ex, ny, per, 'error', e)
            continue
        if st == 200 and b[:2] == b'PK':
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(b)
            log('DGM1', kind, ex, ny, per, len(b), 'bytes')
            return p
        log('DGM1', kind, ex, ny, per, 'no data', st, len(b), ct, b[:80].decode('latin-1', 'replace').replace('\n', ' '))
        if b'nicht verf' in b or (ct.startswith('text/html') and len(b) < 2000):
            # the geoportal answers every path with its maintenance page: do not hammer it for every tile
            _host_down['th'] = True
            log('DGM1: Thüringen download host shows its maintenance page – falling back to Copernicus GLO-30')
            return None
    return None


def read_dgm1(p):
    """-> (heights float32 [row 0 = north], E_left, N_top, pixel size). GeoTIFF (pixel areas) or XYZ text (cell centres)."""
    z = zipfile.ZipFile(p)
    names = z.namelist()
    tifs = [n for n in names if n.lower().endswith(('.tif', '.tiff'))]
    if tifs:
        import tifffile
        with tifffile.TiffFile(io.BytesIO(z.read(tifs[0]))) as t:
            pg = t.pages[0]
            a = pg.asarray().astype(np.float32)
            tp = pg.tags[33922].value          # ModelTiepoint: (i, j, k, X, Y, Z)
            sc = pg.tags[33550].value          # ModelPixelScale
            raster_is_point = False
            try:
                gk = pg.tags[34735].value      # GeoKeyDirectory: key 1025 GTRasterTypeGeoKey (1 area, 2 point)
                for q in range(4, len(gk), 4):
                    if gk[q] == 1025:
                        raster_is_point = gk[q + 3] == 2
            except KeyError:
                pass
        a[a < -1000] = np.nan
        px = float(sc[0])
        e0, n1 = float(tp[3]) - float(tp[0]) * px, float(tp[4]) + float(tp[1]) * px
        if raster_is_point:                    # tie point is a cell centre: shift to the cell corner
            e0 -= px / 2
            n1 += px / 2
        return a, e0, n1, px
    xyz = [n for n in names if n.lower().endswith(('.xyz', '.txt', '.asc', '.csv'))]
    if not xyz:
        raise ValueError(f'{p}: neither GeoTIFF nor XYZ inside ({names[:5]})')
    v = np.loadtxt(io.BytesIO(z.read(xyz[0])), dtype=np.float64, usecols=(0, 1, 2))
    E, N, H = v[:, 0], v[:, 1], v[:, 2]
    px = float(np.median(np.diff(np.unique(E)[:50])))
    e0, n1 = E.min() - px / 2, N.max() + px / 2
    nc, nr = int(round((E.max() - E.min()) / px)) + 1, int(round((N.max() - N.min()) / px)) + 1
    a = np.full((nr, nc), np.nan, np.float32)
    a[np.round((N.max() - N) / px).astype(int), np.round((E - E.min()) / px).astype(int)] = H
    return a, e0, n1, px


# ---------------- Copernicus GLO-30 ----------------
def cop30_name(lat, lon):
    ns, ew = ('N' if lat >= 0 else 'S'), ('E' if lon >= 0 else 'W')
    return f'Copernicus_DSM_COG_10_{ns}{abs(lat):02d}_00_{ew}{abs(lon):03d}_00_DEM'


def fetch_cop30(raw, lat, lon):
    name = cop30_name(lat, lon)
    p = os.path.join(raw, 'cop30', name + '.tif')
    if os.path.exists(p) and os.path.getsize(p) > 100000:
        return p
    st, b, ct = http_get(f'https://copernicus-dem-30m.s3.amazonaws.com/{name}/{name}.tif', timeout=300)
    if st != 200 or b[:2] not in (b'II', b'MM'):
        raise RuntimeError(f'Copernicus {name}: HTTP {st} {ct}')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, 'wb').write(b)
    log('Copernicus', name, len(b), 'bytes')
    return p


class Cop30:
    """bilinear heights from the 1° Copernicus GLO-30 tiles touching a UTM area (EGM2008 heights ~ NHN here within decimetres)"""
    def __init__(self, raw, area):
        from pyproj import Transformer
        import tifffile
        self.toLL = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
        lons, lats = self.toLL.transform([area[0], area[2], area[0], area[2]], [area[1], area[1], area[3], area[3]])
        self.tiles = {}
        for la in range(int(np.floor(min(lats))), int(np.floor(max(lats))) + 1):
            for lo in range(int(np.floor(min(lons))), int(np.floor(max(lons))) + 1):
                with tifffile.TiffFile(fetch_cop30(raw, la, lo)) as t:
                    self.tiles[(la, lo)] = t.pages[0].asarray().astype(np.float32)

    def __call__(self, E, N):
        E = np.asarray(E, float)
        N = np.asarray(N, float)
        lon, lat = self.toLL.transform(E, N)
        lon = np.asarray(lon)
        lat = np.asarray(lat)
        out = np.full(E.shape, np.nan, np.float32)
        for (la, lo), a in self.tiles.items():
            m = (lat >= la) & (lat < la + 1) & (lon >= lo) & (lon < lo + 1)
            if not m.any():
                continue
            nr, nc = a.shape                    # rows from the north edge, pixel areas, 1" in latitude
            c = (lon[m] - lo) * nc - 0.5
            r = (la + 1 - lat[m]) * nr - 0.5
            c0 = np.clip(np.floor(c).astype(int), 0, nc - 2)
            r0 = np.clip(np.floor(r).astype(int), 0, nr - 2)
            fc = np.clip(c - c0, 0, 1)
            fr = np.clip(r - r0, 0, 1)
            out[m] = (a[r0, c0] * (1 - fc) * (1 - fr) + a[r0, c0 + 1] * fc * (1 - fr) + a[r0 + 1, c0] * (1 - fc) * fr + a[r0 + 1, c0 + 1] * fc * fr)
        return out


# ---------------- orthophotos (WMS) ----------------
WMS_TH = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP'


def fetch_wms(raw, layer, bbox, w, h, fmt='image/jpeg'):
    """one GetMap request (EPSG:25832), cached; returns an RGB uint8 array (row 0 = north)"""
    from PIL import Image
    e0, n0, e1, n1 = bbox
    p = os.path.join(raw, 'dop', f'{layer}_{w}x{h}_{e0:.0f}_{n0:.0f}_{e1:.0f}_{n1:.0f}.jpg')
    if not (os.path.exists(p) and os.path.getsize(p) > 1000):
        url = (f'{WMS_TH}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS={layer}&STYLES=&CRS=EPSG:25832'
               f'&BBOX={e0:.2f},{n0:.2f},{e1:.2f},{n1:.2f}&WIDTH={w}&HEIGHT={h}&FORMAT={fmt}')
        for k in range(4):
            st, b, ct = http_get(url, timeout=300)
            if st == 200 and ct.startswith('image/'):
                break
            log('WMS retry', st, ct, b[:200])
            time.sleep(5 + 10 * k)
        else:
            raise RuntimeError(f'WMS {layer} {bbox}: no image')
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'wb').write(b)
    return np.asarray(Image.open(p).convert('RGB'))


# ---------------- OpenStreetMap ----------------
OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
            'https://overpass.private.coffee/api/interpreter', 'https://maps.mail.ru/osm/tools/overpass/api/interpreter']
QUERY = """[out:json][timeout:300][maxsize:1073741824][bbox:{s},{w},{n},{e}];
(
  way["highway"];
  way["building"]; relation["building"]["type"="multipolygon"];
  way["building:part"];
  way["landuse"]; relation["landuse"]["type"="multipolygon"];
  way["natural"]; relation["natural"]["type"="multipolygon"];
  way["waterway"]; way["water"]; relation["water"]["type"="multipolygon"];
  way["leisure"]; way["amenity"="parking"];
  way["railway"]; way["barrier"~"wall|fence|hedge"];
  node["place"]; node["natural"~"peak|tree"]; node["highway"~"street_lamp|traffic_signals"];
);
out body;
>;
out skel qt;"""


def fetch_osm(raw, ll):
    """ll = (west, south, east, north) WGS84 -> {'nodes': {id: [lon, lat, tags?]}, 'ways': {id: [refs, tags]}, 'rels': {id: [members, tags]}}"""
    w, s, e, n = ll
    p = os.path.join(raw, 'osm', f'osm_{w:.4f}_{s:.4f}_{e:.4f}_{n:.4f}.json')
    if os.path.exists(p):
        return json.load(open(p))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    q = QUERY.format(s=s, w=w, n=n, e=e)
    data = None
    for url in ([] if os.environ.get('WELT_NO_OVERPASS') else OVERPASS):
        try:
            st, b, ct = http_get(url, tries=2, timeout=300, data={'data': q})
            if st == 200 and b[:1] == b'{':
                j = json.loads(b)
                if j.get('remark') and 'error' in j['remark'].lower():
                    log('Overpass', url, 'remark', j['remark'][:200])
                    continue
                data = osm_from_overpass(j)
                log('Overpass', url, len(b), 'bytes', {k: len(v) for k, v in data.items()})
                break
            log('Overpass', url, st, ct, b[:200])
        except Exception as ex:
            log('Overpass', url, 'failed', ex)
    if data is None:
        data = osm_from_api(ll)
    data['source'] = 'OpenStreetMap'
    data['fetched'] = time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())
    json.dump(data, open(p, 'w'))
    return data


def osm_from_overpass(j):
    nodes, ways, rels = {}, {}, {}
    for el in j['elements']:
        t = el['type']
        if t == 'node':
            cur = nodes.get(str(el['id']))
            tags = el.get('tags') or (cur[2] if cur and len(cur) > 2 else None)
            nodes[str(el['id'])] = [el['lon'], el['lat']] + ([tags] if tags else [])
        elif t == 'way':
            ways[str(el['id'])] = [[str(r) for r in el['nodes']], el.get('tags', {})]
        elif t == 'relation':
            rels[str(el['id'])] = [[(m['type'], str(m['ref']), m.get('role', '')) for m in el['members']], el.get('tags', {})]
    return {'nodes': nodes, 'ways': ways, 'rels': rels}


def osm_from_api(ll, step=0.02):
    """fallback: OSM API 0.6 map calls in chunks (each ~1.4 x 2.2 km, below the 50 000 node limit)"""
    import xml.etree.ElementTree as ET
    w, s, e, n = ll
    nodes, ways, rels = {}, {}, {}
    lon = w
    while lon < e - 1e-9:
        lat = s
        while lat < n - 1e-9:
            bb = f'{lon:.5f},{lat:.5f},{min(lon + step * 1.5, e):.5f},{min(lat + step, n):.5f}'
            st, b, ct = http_get(f'https://api.openstreetmap.org/api/0.6/map?bbox={bb}', timeout=300)
            if st != 200:
                raise RuntimeError(f'OSM API {bb}: HTTP {st} {b[:200]}')
            root = ET.fromstring(b)
            for el in root.iter('node'):
                tags = {t.get('k'): t.get('v') for t in el.findall('tag')}
                nodes[el.get('id')] = [float(el.get('lon')), float(el.get('lat'))] + ([tags] if tags else [])
            for el in root.iter('way'):
                ways[el.get('id')] = [[nd.get('ref') for nd in el.findall('nd')], {t.get('k'): t.get('v') for t in el.findall('tag')}]
            for el in root.iter('relation'):
                rels[el.get('id')] = [[(m.get('type'), m.get('ref'), m.get('role')) for m in el.findall('member')],
                                      {t.get('k'): t.get('v') for t in el.findall('tag')}]
            log('OSM API chunk', bb, len(b), 'bytes')
            time.sleep(1.5)
            lat += step
        lon += step * 1.5
    # the map call only returns nodes inside the box: ways crossing chunk borders are complete because every chunk returns all
    # nodes of its ways ("map" includes them), relations may miss members outside the whole area (fine for a test block)
    return {'nodes': nodes, 'ways': ways, 'rels': rels}
