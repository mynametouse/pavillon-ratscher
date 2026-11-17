#!/usr/bin/env python3
"""Street trees and green of Schleusingen, step 1: fetch the open data for the town's zone into a cache OUTSIDE the repository.

  python3 -I tools/stadtgruen/fetch.py <cache dir> [--ratscher] [--osm]

- OpenStreetMap (ODbL 1.0) of the zone: the OSM API's map call in four chunks (Overpass reset the connection here, 17.11.2026)
- DGM1 and DOM1 (1 m terrain and surface model, © GDI-Th, dl-de/by-2-0): the four 1 km tiles under the zone
- DOP 20 cm in colour and colour infrared (© GDI-Th, dl-de/by-2-0) over the zone at 0.25 m/px, UTM axes (north up)

Nothing of this goes into the repository; tools/stadtgruen/build.py makes the small JSON the app loads from it."""
import io, json, math, os, ssl, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
G = json.load(open(os.path.join(REPO, 'viz3', 'manifests.json')))['geoman']['xf']
A, B, EX, EY = G['a'], G['b'], G['ex'], G['ey']
# the town's zone of viz3/extra/schleusingen/dist/schleusingen/stadt.json (model metres: x0, y0, x1, y1), with a margin for the roads' ends;
# with --ratscher the village of Ratscher and its roads (the 2.4 km square of world/ratscher.js, its northern half and the L 3004)
ZONE = (-1644.7, 681.9, -524.7, 1801.9)
MARGIN = 60.0
if '--ratscher' in sys.argv:
    ZONE = (-1000.0, -1250.0, 1000.0, 700.0)
    MARGIN = 0.0
WMS = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP'
UA = 'PavillonRatscher/1.0 (private non-commercial model)'


def opener():
    px = os.environ.get('HTTPS_PROXY')
    ca = '/root/.ccr/ca-bundle.crt'
    ctx = ssl.create_default_context(cafile=ca) if os.path.exists(ca) else ssl.create_default_context()
    hs = [urllib.request.HTTPSHandler(context=ctx)]
    if px:
        hs.insert(0, urllib.request.ProxyHandler({'https': px, 'http': px}))
    return urllib.request.build_opener(*hs)


OP = opener()


def get(url, tries=4, timeout=240):
    for k in range(tries):
        try:
            return OP.open(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=timeout).read()
        except Exception as e:  # noqa: BLE001 - network: retry, then give up
            print('retry', k, url[:120], e, flush=True)
            time.sleep(4 + 8 * k)
    raise RuntimeError('failed ' + url)


def m2u(x, y):
    return EX + A * x - B * y, EY + B * x + A * y


def utm_box():
    x0, y0, x1, y1 = ZONE[0] - MARGIN, ZONE[1] - MARGIN, ZONE[2] + MARGIN, ZONE[3] + MARGIN
    pts = [m2u(x, y) for x, y in ((x0, y0), (x1, y0), (x1, y1), (x0, y1))]
    E = [p[0] for p in pts]
    N = [p[1] for p in pts]
    return math.floor(min(E)), math.floor(min(N)), math.ceil(max(E)), math.ceil(max(N))


def fetch_osm(raw):
    from pyproj import Transformer
    out = os.path.join(raw, 'osm')
    os.makedirs(out, exist_ok=True)
    e0, n0, e1, n1 = utm_box()
    T = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
    lo0, la0 = T.transform(e0, n0)
    lo1, la1 = T.transform(e1, n1)
    k = 2 if (e1 - e0) < 1500 else 4  # chunks small enough for the API's 50 000 nodes
    for i in range(k):
        for j in range(k):
            a0 = lo0 + (lo1 - lo0) * i / k
            a1 = lo0 + (lo1 - lo0) * (i + 1) / k
            b0 = la0 + (la1 - la0) * j / k
            b1 = la0 + (la1 - la0) * (j + 1) / k
            fn = os.path.join(out, f'osm_{i}{j}.xml')
            if os.path.exists(fn):
                continue
            b = get(f'https://api.openstreetmap.org/api/0.6/map?bbox={a0:.5f},{b0:.5f},{a1:.5f},{b1:.5f}')
            open(fn, 'wb').write(b)
            print('osm', fn, len(b), flush=True)
            time.sleep(2)


def fetch_dem(raw):
    e0, n0, e1, n1 = utm_box()
    out = os.path.join(raw, 'dem')
    os.makedirs(out, exist_ok=True)
    for kind in ('DGM', 'DOM'):
        k = kind.lower()
        for ex in range(e0 // 1000, (e1 - 1) // 1000 + 1):
            for ny in range(n0 // 1000, (n1 - 1) // 1000 + 1):
                fn = os.path.join(out, f'{k}1_{ex}_{ny}.zip')
                if os.path.exists(fn):
                    continue
                url = f'https://geoportal.geoportal-th.de/hoehendaten/{kind}/{k}_2020-2025/{k}1_32_{ex}_{ny}_1_th_2020-2025.zip'
                b = get(url)
                open(fn, 'wb').write(b)
                print('dem', fn, len(b), flush=True)
                time.sleep(1)


def fetch_dop(raw, layer, name, res=0.25):
    """the zone (with margin) in UTM axes, north up, res m/px, in pieces of at most 2000 px"""
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    fn = os.path.join(raw, f'{name}.png')
    if os.path.exists(fn):
        return
    e0, n0, e1, n1 = utm_box()
    W, H = round((e1 - e0) / res), round((n1 - n0) / res)
    canvas = Image.new('RGB', (W, H))
    T = 2000
    for ty in range(0, H, T):
        for tx in range(0, W, T):
            w, h = min(T, W - tx), min(T, H - ty)
            be0, bn1 = e0 + tx * res, n1 - ty * res
            q = (f'{WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS={layer}&STYLES=&CRS=EPSG:25832'
                 f'&BBOX={be0},{bn1 - h * res},{be0 + w * res},{bn1}&WIDTH={w}&HEIGHT={h}&FORMAT=image/png')
            canvas.paste(Image.open(io.BytesIO(get(q))).convert('RGB'), (tx, ty))
            print('dop', layer, tx, ty, flush=True)
            time.sleep(1)
    canvas.save(fn)
    json.dump({'e0': e0, 'n1': n1, 'res': res, 'w': W, 'h': H, 'layer': layer}, open(fn + '.json', 'w'))
    print('saved', fn, W, H, flush=True)


if __name__ == '__main__':
    raw = sys.argv[1]
    os.makedirs(raw, exist_ok=True)
    print('UTM box', utm_box(), flush=True)
    fetch_osm(raw)
    if '--osm' in sys.argv:
        sys.exit(0)
    fetch_dem(raw)
    fetch_dop(raw, 'th_dop20cir', 'cir')
    fetch_dop(raw, 'th_dop', 'rgb')
    print('ALL DONE', flush=True)
