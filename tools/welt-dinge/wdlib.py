"""Shared helpers of tools/welt-dinge (feat/welt-dinge): the model <-> UTM frame, Ratscher's OSM building footprints from the game's data,
the Thuringian orthophoto 2024 (RGB and CIR) from the state's WMS on model axes. Analysis copies only – the photos stay out of the repo."""
import io, json, base64, math, os, sys, urllib.request
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
WMS = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP'
# model (x, y) -> UTM 32N: E = ex + a x - b y, N = ey + b x + a y (GEOMAN.xf, tools/geo/dop_th.py)
A, B, EX, EY = 1.0127906473420232, 0.07715765993901931, 625469.0070213208, 5595624.323524626
K2 = A * A + B * B
ROT = math.degrees(math.atan2(B, A))  # the model's x axis is turned by this much (counter-clockwise) against UTM east


def to_utm(x, y):
    return EX + A * x - B * y, EY + B * x + A * y


def to_model(e, n):
    de, dn = e - EX, n - EY
    return (A * de + B * dn) / K2, (-B * de + A * dn) / K2


def get(url, timeout=120, tries=3):
    last = None
    for _ in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=timeout) as r:
                return r.read()
        except Exception as e:  # the WMS drops a request now and then
            last = e
    raise last


def buildings():
    """Ratscher's 337 OSM buildings (world/ratscher.js): per id the wall feet as segments in model metres."""
    j = json.load(open(os.path.join(REPO, 'viz3/dist/geo/buildings.b64.json')))
    man = json.load(open(os.path.join(REPO, 'viz3/manifests.json')))['geoman']['bld']
    buf = base64.b64decode(j['b64'])
    nw = man['walls']
    wp = np.frombuffer(buf, np.int16, nw * 3, 0).reshape(-1, 3)
    wt = np.frombuffer(buf, np.int16, nw * 4, nw * 6).reshape(-1, 4)
    out = {}
    for s in range(0, nw - 3, 4):
        bid = int(wt[s, 3]) // 4
        a = wp[s] / [10, 10, 100]
        b = wp[s + 2] / [10, 10, 100]
        out.setdefault(bid, []).append((float(a[0]), float(a[1]), float(b[0]), float(b[1])))
    return out


def fetch(x0, x1, y0, y1, s=0.1, layer='th_dop', res=0.1, cache=None):
    """The orthophoto (layer th_dop: RGB, th_dop20cir: CIR) of the model rectangle on model axes, s metres per pixel: pixel (u, v) is
    model (x0 + (u + 0.5) s, y1 - (v + 0.5) s). Returns an RGB numpy array (H, W, 3)."""
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    if cache and os.path.exists(cache):
        return np.asarray(Image.open(cache).convert('RGB'))
    xs, ys = (x0, x1, x1, x0), (y0, y0, y1, y1)
    E = [EX + A * x - B * y for x, y in zip(xs, ys)]
    N = [EY + B * x + A * y for x, y in zip(xs, ys)]
    e0, e1, n0, n1 = min(E) - 2, max(E) + 2, min(N) - 2, max(N) + 2
    W, H = round((e1 - e0) / res), round((n1 - n0) / res)
    T = 1600
    canvas = Image.new('RGB', (W, H))
    for ty in range(0, H, T):
        for tx in range(0, W, T):
            w, h = min(T, W - tx), min(T, H - ty)
            be0, bn1 = e0 + tx * res, n1 - ty * res
            q = (f'{WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS={layer}&STYLES=&CRS=EPSG:25832'
                 f'&BBOX={be0},{bn1 - h * res},{be0 + w * res},{bn1}&WIDTH={w}&HEIGHT={h}&FORMAT=image/jpeg')
            canvas.paste(Image.open(io.BytesIO(get(q))).convert('RGB'), (tx, ty))
    Wo, Ho = round((x1 - x0) / s), round((y1 - y0) / s)
    # output pixel centre (u+.5, v+.5) -> model -> UTM -> source pixel; PIL's affine maps output coords (u, v) to input coords
    cA, cB = A * s / res, B * s / res
    cC = (EX + A * x0 - B * y1 - e0) / res
    cD, cE = -B * s / res, A * s / res
    cF = (n1 - (EY + B * x0 + A * y1)) / res
    img = canvas.transform((Wo, Ho), Image.AFFINE, (cA, cB, cC, cD, cE, cF), resample=Image.BICUBIC)
    if cache:
        img.save(cache, quality=92)
    return np.asarray(img)


def roads():
    """Ratscher's OSM ways (world/roads.js, tools/geo/build_roads.py): [{ kind, surf, w, p: [(x, y), …] }] in model metres;
    kinds motorway, main, county, street, lane, service, track, path, foot (0…8)."""
    man = json.load(open(os.path.join(REPO, 'viz3/manifests.json')))['geoman']['roads']
    j = json.load(open(os.path.join(REPO, 'viz3/dist/geo', man['file'])))
    a = np.frombuffer(base64.b64decode(j['b64']), np.int16)
    out, o = [], 0
    while o + 5 <= len(a):
        n, kind, surf, w = int(a[o]), int(a[o + 1]), int(a[o + 2]), a[o + 3] / 10
        o += 5
        p = (a[o:o + 2 * n].astype(float) / 10).reshape(-1, 2)
        o += 2 * n
        out.append({'kind': kind, 'surf': surf, 'w': float(w), 'p': p})
    return out


def seg_dist(px, py, p):
    """distance from (px, py) to the polyline p (n×2), the nearest point and the unit direction of that segment"""
    a, b = p[:-1], p[1:]
    d = b - a
    L2 = (d ** 2).sum(1)
    L2[L2 == 0] = 1e-9
    t = np.clip(((px - a[:, 0]) * d[:, 0] + (py - a[:, 1]) * d[:, 1]) / L2, 0, 1)
    q = a + d * t[:, None]
    dist = np.hypot(q[:, 0] - px, q[:, 1] - py)
    i = int(dist.argmin())
    u = d[i] / max(1e-9, math.sqrt(L2[i]))
    return float(dist[i]), q[i], u


def roads_fahrt():
    """the OSM ways beyond the square (welt/fahrt.js data, viz3/extra/fahrt/dist/fahrt/strassen.json: model decimetres) in the same form"""
    j = json.load(open(os.path.join(REPO, 'viz3/extra/fahrt/dist/fahrt/strassen.json')))
    out = []
    for w in j['ways']:
        q = np.array(w[6], float).reshape(-1, 3)[:, :2] / 10
        out.append({'kind': int(w[0]), 'surf': int(w[1]), 'w': w[2] / 10, 'p': q})
    return out


def footprints(geb_dir=None):
    """every building footprint that stands in 3D (shapely polygons, model metres): Ratscher's OSM buildings (world/ratscher.js), the old
    town of Schleusingen (dist/schleusingen/stadt.json) and the buildings of feat/welt-gebaeude (ETHOS.BUILDA: its ratscher.json and the
    cells beyond the square, viz3/extra/welt-gebaeude/dist/gebaeude/) – from its folder in this checkout when merged, else from geb_dir
    (a copy of that folder, e.g. `git show origin/feat/welt-gebaeude:…`)."""
    from shapely.geometry import Polygon, LineString, MultiPoint
    from shapely.ops import polygonize, unary_union
    out = []
    for bid, segs in buildings().items():
        polys = list(polygonize([LineString([(a, b), (c, d)]) for a, b, c, d in segs]))
        out.append(unary_union(polys) if polys else MultiPoint([(s[0], s[1]) for s in segs]).convex_hull)
    st = os.path.join(REPO, 'viz3/dist/schleusingen/stadt.json')
    if os.path.exists(st):
        for b in json.load(open(st))['b']:
            f = b['f']
            if len(f) >= 6:
                out.append(Polygon(list(zip(f[0::2], f[1::2]))).buffer(0))
    gd = os.path.join(REPO, 'viz3/extra/welt-gebaeude/dist/gebaeude')
    if not os.path.isdir(gd):
        gd = geb_dir
    if gd and os.path.isdir(gd):
        files = [os.path.join(gd, 'ratscher.json')] + [os.path.join(gd, 'z', f) for f in sorted(os.listdir(os.path.join(gd, 'z')))] \
            if os.path.isdir(os.path.join(gd, 'z')) else [os.path.join(gd, 'ratscher.json')]
        for fn in files:
            if not os.path.exists(fn):
                continue
            for b in json.load(open(fn)).get('b', []):
                f = b['f']
                if len(f) >= 6:
                    out.append(Polygon(list(zip(f[0::2], f[1::2]))).buffer(0))
    return [p for p in out if not p.is_empty]
