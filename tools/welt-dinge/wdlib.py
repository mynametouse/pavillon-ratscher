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


def dist_file(rel):
    """a file of the built app: a feature's extra first (viz3/extra/*/dist/<rel>), else viz3/dist/<rel>"""
    import glob
    for fx in sorted(glob.glob(os.path.join(REPO, 'viz3', 'extra', '*', 'dist', rel))):
        return fx
    return os.path.join(REPO, 'viz3', 'dist', rel)


def keepout(gebiet):
    """where nothing of ours may stand (model metres; a list of (shapely geometry, name)) – the lead, 6.11. ~1:45: a parked car 2.5 m in
    front of Schleusingen's Rathaus door blocked the way in. What the places model themselves, with the margins of feat/welt-gebaeude
    (tools/welt-gebaeude/prep.py keepout()): Kloster Veßra (welt/vessra.js, vessra/ort.json) – church ruin, towers and portal 8 m, the
    monastery precinct (the museum's area) 15 m, the nursery 8 m, its other areas 2 m (not the visitor car park), walls 1.5 m, gates 3 m,
    fences and hedges 0.5 m;
    Schleusingen (welt/schleusingen.js, schleusingen/stadt.json) – the Bertholdsburg 20 m, Rathaus, St. Johannis 8 m, Heckenturm 6 m, the
    Markt 3 m, fountains 4 m, benches 1.5 m, lamps 0.6 m; Ratscher – the centre as Falko filmed it (world/dorfkern_data.js: well, bus
    shelter, white box, benches, bins, limes, poles, lamps, hedges, fences, paving). And everywhere the bus stops (feat/bus,
    bus/fahrplan.json): no parking 15 m before and after the stop (StVO § 12), the road and both kerbs (5.5 m round the stop's line)."""
    from shapely.geometry import Polygon, LineString, Point
    P = lambda f, m: Polygon(list(zip(f[0::2], f[1::2]))).buffer(0).buffer(m)
    L = lambda f, m: LineString(list(zip(f[0::2], f[1::2]))).buffer(m)
    out = []
    if gebiet == 'vessra':
        try:
            v = json.load(open(dist_file('vessra/ort.json')))
            K = v.get('kirche') or {}
            if K.get('area'):
                out.append((P(K['area'], 8.0), 'Veßra: Klosterkirche'))
            for t in K.get('towers') or []:
                out.append((P(t, 8.0), 'Veßra: Türme'))
            if K.get('portal'):
                out.append((Point(*K['portal']).buffer(8.0), 'Veßra: Westportal'))
            for a in v.get('areas', []):
                m = {'museum': 15.0, 'nursery': 8.0}.get(a['k'], 2.0)
                if a['k'] == 'parking':
                    continue  # the visitor car park is where the cars belong (welt-gebaeude keeps its buildings off it)
                if len(a['p']) >= 6:
                    out.append((P(a['p'], m), 'Veßra: %s %s' % (a['k'], a.get('n') or '')))
            for w in v.get('walls', []):
                out.append((L(w['p'], 1.5), 'Veßra: Mauer'))
            for g in v.get('gates', []):
                out.append((Point(g[0], g[1]).buffer(3.0), 'Veßra: Tor'))
            for w in v.get('fences', []) + v.get('hedges', []):
                if len(w['p']) >= 4:
                    out.append((L(w['p'], 0.5), 'Veßra: Zaun/Hecke'))
        except Exception as e:
            print('no keep-out of Veßra', e, flush=True)
    if gebiet == 'schleusingen':
        try:
            s = json.load(open(dist_file('schleusingen/stadt.json')))
            for b in s['b']:
                m = {'burg': 20.0, 'rathaus': 8.0, 'kirche': 8.0, 'turm': 6.0}.get(b.get('lm'))
                if m:
                    out.append((P(b['f'], m), 'Schleusingen: ' + b['lm']))
            if len(s.get('marktplatz') or []) >= 6:
                out.append((P(s['marktplatz'], 3.0), 'Schleusingen: Markt'))
            for q in s.get('fountains', []):
                out.append((Point(q[0], q[1]).buffer(4.0), 'Schleusingen: Brunnen'))
            for q in s.get('benches', []):
                out.append((Point(q[0], q[1]).buffer(1.5), 'Schleusingen: Bank'))
            for q in s.get('lamps', []):
                out.append((Point(q[0], q[1]).buffer(0.6), 'Schleusingen: Laterne'))
        except Exception as e:
            print('no keep-out of Schleusingen', e, flush=True)
    if gebiet == 'ratscher':
        import subprocess
        try:
            js = os.path.join(REPO, 'viz3', 'src', 'world', 'dorfkern_data.js')
            o = json.loads(subprocess.run(['node', '--no-warnings', '--input-type=module', '-e',
                                           "globalThis.window = {}; const m = await import(%s); console.log(JSON.stringify(m.DKDATA.open))"
                                           % json.dumps('file://' + js)], capture_output=True, text=True, check=True).stdout)
            pt = lambda q, m, n: out.append((Point(q[0], q[1]).buffer(m), 'Dorfkern: ' + n))
            if o.get('well'):
                pt(o['well']['c'], max(o['well'].get('size') or [4.0]) / 2 + 0.5, 'Brunnen')
            if o.get('shelter'):
                pt(o['shelter']['c'], 2.5, 'Wartehäuschen')
            wb = o.get('whitebox')
            if wb:
                x, y, az, l_, d_ = wb[:5]
                ux, uy = math.sin(math.radians(az)), math.cos(math.radians(az))
                out.append((Polygon([(x + ux * s_ * l_ / 2 - uy * t_ * d_ / 2, y + uy * s_ * l_ / 2 + ux * t_ * d_ / 2)
                                     for s_, t_ in ((-1, -1), (1, -1), (1, 1), (-1, 1))]).buffer(0.5), 'Dorfkern: weißer Kasten'))
            for k_, m in (('benches', 1.2), ('bins', 0.6), ('poles', 0.6), ('lamps', 0.6), ('roundabout', 1.5), ('logs', 2.5)):
                for q in o.get(k_) or []:
                    pt(q, m, k_)
            for q in o.get('limes') or []:
                pt(q['at'], 1.0, 'Linde')
            for k_ in ('linde', 'vending', 'signpost', 'planter'):
                if o.get(k_):
                    pt(o[k_], 1.2, k_)
            for k_ in ('hedges', 'fences'):
                for q in o.get(k_) or []:
                    out.append((LineString(q['p']).buffer(0.6), 'Dorfkern: ' + k_))
            for q in o.get('paving') or []:
                out.append((Polygon(q['p']).buffer(0.3), 'Dorfkern: Pflaster'))
        except Exception as e:
            print('no keep-out of the Dorfkern', e, flush=True)
    try:
        bp = json.load(open(dist_file('bus/fahrplan.json')))
        for st in bp['stations']:
            for p in st.get('pl') or []:
                x, y, az = p[0] / 10, p[1] / 10, math.radians(p[2])
                ux, uy = math.sin(az), math.cos(az)
                out.append((LineString([(x - ux * 15, y - uy * 15), (x + ux * 15, y + uy * 15)]).buffer(5.5),
                            'Haltestelle ' + st.get('n', '')))
    except Exception as e:
        print('no bus stops', e, flush=True)
    return out
