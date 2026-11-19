#!/usr/bin/env python3
"""feat/welt-wald: every tree of the region's forests, copses, rows and fields as a record – for viz3/src/weltwald/weltwald.js.

Where: the 400 m cells (the grid of gebaeude/z/) along the roads one drives (welt/fahrt.js: Schleusingen's Markt, Kloster Veßra; Suhl's
approach), CORRIDOR m both sides, then any other cell asked for – never where others plant (wwlib.keepout(): Ratscher's square, Schleusingen's
town zone, Suhl's tiles, what Kloster Veßra models).

Sources (all open, credited in viz3/extra/welt-wald/manifest.json):
- Digitale Orthophotos Thüringen 20 cm, RGB and colour infrared (WMS th_dop, th_dop20cir; © GDI-Th, dl-de/by-2-0): what stands there now
  (flights 2024/2025) – green (NDVI from the infrared), conifer or broadleaf (in May broadleaf crowns are bright in the near infrared,
  conifers dark; in the April flights broadleaf is still bare: its crowns have no green), clearings since the canopy model.
- High Resolution Canopy Height Maps by WRI and Meta (Tolan et al. 2024, 1 m, CC BY 4.0; public COG on AWS): the height of the canopy,
  its tops (one tree each) – the GDI-Th surface model DOM1 is not reachable (CAPTCHA, tools/welt/QUELLEN.md).
- OpenStreetMap (ODbL): the roads and tracks a tree must not stand on, forest areas; the app's own roads (welt/fahrt.js, Suhl's approach);
  ETHOS.BUILDA footprints (ODbL) – no tree in a building.

Per tree: position, height (the canopy model under its crown, its 90th percentile), crown radius (half the way to its neighbours, within the
limits of its height), kind (0 spruce, 1 pine, 2 larch, 3 beech/broadleaf in the forest, 4 large broadleaf in the open (oak, lime, maple),
5 birch, 6 small broadleaf (fruit trees, rows), 7 shrub/young growth), flags (16 edge – its crown is seen from outside the stand; 32 height
measured; 64 in the forest; 128 young), a rank 0–255 (which trees stay when a level thins them).

  python3 tools/weltwald/baeume.py --corridor [--routes suhl_land,markt,baumschule] [--ethos ETHOS.jsonl] [--osm-ways W.json --osm-green G.json]
  python3 tools/weltwald/baeume.py --cells -4_15,-3_15 [--debug DIR]
Raw downloads are cached in $WW_RAW (default ~/ww-raw), outside the repo.
"""
import argparse, io, json, math, os, struct, sys, zlib
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wwlib as W

RES = 0.5          # analysis grid (m)
MARG = 16.0        # margin around a cell (neighbourhood of the trees at its edge)
CORRIDOR = 400.0   # metres either side of the routes
WMS = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP'
CHM_URL = 'https://dataforgood-fb-data.s3.amazonaws.com/forests/v1/alsgedi_global_v6_float/chm/{q}.tif'
KINDS = ['Fichte', 'Kiefer', 'Lärche', 'Buche (Laubwald)', 'Eiche/Linde (Laubbaum frei)', 'Birke', 'Obstbaum/kleiner Laubbaum', 'Strauch/Jungwuchs']


# ---------------------------------------------------------------- the analysis grid of a cell ----------------------------------------
class Grid:
    """model-aligned grid over a cell with margin: column u east, row v from the NORTH edge; pixel centres"""

    def __init__(self, i, j, res=RES, m=MARG):
        self.i, self.j, self.res, self.m = i, j, res, m
        self.x0, self.y0, self.x1, self.y1 = W.cell_box(i, j, m)
        self.n = int(round((self.x1 - self.x0) / res))

    def xy(self, u, v):
        return self.x0 + (u + 0.5) * self.res, self.y1 - (v + 0.5) * self.res

    def uv(self, x, y):
        return (x - self.x0) / self.res - 0.5, (self.y1 - y) / self.res - 0.5

    def mesh(self):
        u = np.arange(self.n)
        X = self.x0 + (u + 0.5) * self.res
        Y = self.y1 - (u + 0.5) * self.res
        return np.meshgrid(X, Y)

    def utm_box(self, pad=4.0):
        cs = [W.to_utm(x, y) for x in (self.x0, self.x1) for y in (self.y0, self.y1)]
        return (min(c[0] for c in cs) - pad, min(c[1] for c in cs) - pad, max(c[0] for c in cs) + pad, max(c[1] for c in cs) + pad)


def wms_layer(G, layer):
    """a DOP layer on the model grid (H x W x 3 float 0..255): fetched in UTM at 0.5 m (cached), turned onto the model axes"""
    from PIL import Image
    e0, n0, e1, n1 = G.utm_box()
    e0, n0 = math.floor(e0), math.floor(n0)
    e1, n1 = math.ceil(e1), math.ceil(n1)
    r = 0.5
    w, h = int((e1 - e0) / r), int((n1 - n0) / r)
    q = (f'{WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS={layer}&STYLES=&CRS=EPSG:25832'
         f'&BBOX={e0},{n0},{e1},{n1}&WIDTH={w}&HEIGHT={h}&FORMAT=image/jpeg')
    b = W.cached(f'dop/{layer}/{G.i}_{G.j}.jpg', lambda: W.http(q))
    src = Image.open(io.BytesIO(b)).convert('RGB')
    # output pixel (u, v) -> model (x0 + (u+.5) s, y1 - (v+.5) s) -> UTM -> source pixel ((E - e0)/r, (n1 - N)/r)
    s = G.res
    cA, cB = W.A * s / r, W.B * s / r
    cD, cE = -W.B * s / r, W.A * s / r
    E00, N00 = W.to_utm(G.x0, G.y1)
    cC = (E00 - e0) / r
    cF = (n1 - N00) / r
    img = src.transform((G.n, G.n), Image.AFFINE, (cA, cB, cC, cD, cE, cF), resample=Image.BILINEAR)
    return np.asarray(img, dtype=np.float32)


_CHM = {}


def chm_grid(G):
    """the canopy height model (m) on the model grid (cached per cell)"""
    p = os.path.join(W.RAW, 'chm', f'{G.i}_{G.j}_{G.res}.npy')
    if os.path.exists(p):
        return np.load(p)
    # compact cache (decimetres, compressed: ~0.3 MB a cell instead of 3 MB – the whole region is ~1 900 cells)
    pz = p[:-4] + '.npz'
    if os.path.exists(pz):
        return np.load(pz)['dm'].astype(np.float32) / 10
    import rasterio
    from rasterio.windows import from_bounds
    from pyproj import Transformer
    os.environ.setdefault('CURL_CA_BUNDLE', '/root/.ccr/ca-bundle.crt')
    os.environ.setdefault('GDAL_HTTP_TIMEOUT', '90')
    X, Y = G.mesh()
    E, N = W.to_utm(X, Y)
    tr = Transformer.from_crs('EPSG:25832', 'EPSG:3857', always_xy=True)
    mx, my = tr.transform(E, N)
    lat = math.degrees(2 * math.atan(math.exp(float(my.mean()) / 6378137.0)) - math.pi / 2)
    lon = math.degrees(float(mx.mean()) / 6378137.0)
    q = quadkey(lat, lon, 9)
    out = np.zeros(X.shape, np.float32)
    for attempt in range(3):
        try:
            if q not in _CHM:
                _CHM[q] = rasterio.open('/vsicurl/' + CHM_URL.format(q=q))
            src = _CHM[q]
            w = from_bounds(mx.min() - 4, my.min() - 4, mx.max() + 4, my.max() + 4, src.transform).round_offsets().round_lengths()
            a = src.read(1, window=w, boundless=True, fill_value=0).astype(np.float32)
            T = src.window_transform(w)
            fc = (mx - T.c) / T.a - 0.5
            fr = (my - T.f) / T.e - 0.5
            c0 = np.clip(np.floor(fc).astype(int), 0, a.shape[1] - 2)
            r0 = np.clip(np.floor(fr).astype(int), 0, a.shape[0] - 2)
            tc, tr_ = np.clip(fc - c0, 0, 1), np.clip(fr - r0, 0, 1)
            out = ((a[r0, c0] * (1 - tc) + a[r0, c0 + 1] * tc) * (1 - tr_) + (a[r0 + 1, c0] * (1 - tc) + a[r0 + 1, c0 + 1] * tc) * tr_)
            break
        except Exception as e:
            W.log('CHM retry', G.i, G.j, e)
            _CHM.pop(q, None)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    dm = np.clip(np.round(out * 10), 0, 65535).astype(np.uint16)
    np.savez_compressed(pz, dm=dm)
    return dm.astype(np.float32) / 10


def quadkey(lat, lon, z):
    x = (lon + 180) / 360
    s = math.sin(math.radians(lat))
    y = 0.5 - math.log((1 + s) / (1 - s)) / (4 * math.pi)
    n = 1 << z
    tx, ty = int(x * n), int(y * n)
    q = ''
    for k in range(z, 0, -1):
        d, m = 0, 1 << (k - 1)
        if tx & m:
            d += 1
        if ty & m:
            d += 2
        q += str(d)
    return q


_INFO = None


def flight(E, N):
    """the flight date of the DOP's 1 km tile at UTM E, N: 'dd.mm.yyyy' (GetFeatureInfo th_dop_info, cached)"""
    global _INFO
    p = os.path.join(W.RAW, 'dop_info.json')
    if _INFO is None:
        _INFO = json.load(open(p)) if os.path.exists(p) else {}
    k = f'{int(E // 1000)}_{int(N // 1000)}'
    if k not in _INFO:
        e, n = int(E // 1000) * 1000 + 500, int(N // 1000) * 1000 + 500
        q = (f'{WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=th_dop_info&QUERY_LAYERS=th_dop_info&STYLES=&CRS=EPSG:25832'
             f'&BBOX={e - 50},{n - 50},{e + 50},{n + 50}&WIDTH=100&HEIGHT=100&I=50&J=50&INFO_FORMAT=text/plain')
        try:
            t = W.http(q, 60).decode('utf-8', 'replace')
            d = {a: b for a, b in (s.split('=', 1) for s in t.split('$#$') if '=' in s)}
            _INFO[k] = d.get('Erstellung', '')
        except Exception:
            _INFO[k] = ''
        os.makedirs(os.path.dirname(p), exist_ok=True)
        json.dump(_INFO, open(p, 'w'))
    return _INFO[k]


def leaf_off_grid(G):
    """True where the DOP was flown before the leaves (April): a boolean grid (per 1 km tile of the flights)"""
    X, Y = G.mesh()
    E, N = W.to_utm(X, Y)
    ke = (E // 1000).astype(int)
    kn = (N // 1000).astype(int)
    out = np.zeros(X.shape, bool)
    for a in np.unique(ke):
        for b in np.unique(kn):
            sel = (ke == a) & (kn == b)
            if not sel.any():
                continue
            d = flight(a * 1000 + 1, b * 1000 + 1)
            try:
                mon = int(d.split('.')[1])
            except Exception:
                mon = 5
            out[sel] = mon <= 4
    return out


# ---------------------------------------------------------------- exclusions on the grid ---------------------------------------------
def rasterize(G, geoms):
    """a boolean grid: True inside any of the shapely (multi)polygons"""
    from PIL import Image, ImageDraw
    im = Image.new('L', (G.n, G.n), 0)
    dr = ImageDraw.Draw(im)
    for g in geoms:
        for p in getattr(g, 'geoms', [g]):
            if p.is_empty or p.geom_type != 'Polygon':
                continue
            dr.polygon([G.uv(x, y) for x, y in p.exterior.coords], fill=1)
            for r in p.interiors:
                dr.polygon([G.uv(x, y) for x, y in r.coords], fill=0)
    return np.asarray(im, bool)


def road_dist(G, lines):
    """distance (m) from every pixel to the edge of the nearest road (negative on it), from lines [(LineString, half width)]"""
    from scipy import ndimage
    from PIL import Image, ImageDraw
    # rasterise each road's carriageway (buffer by its half width), then a distance transform outside
    im = Image.new('L', (G.n, G.n), 0)
    dr = ImageDraw.Draw(im)
    bx = (G.x0 - 20, G.y0 - 20, G.x1 + 20, G.y1 + 20)
    for ls, hw in lines:
        a, b, c, d = ls.bounds
        if c < bx[0] or a > bx[2] or d < bx[1] or b > bx[3]:
            continue
        pts = [G.uv(x, y) for x, y in ls.coords]
        dr.line(pts, fill=1, width=max(1, int(round(2 * hw / G.res))), joint='curve')
        r = hw / G.res
        for u, v in (pts[0], pts[-1]):
            dr.ellipse([u - r, v - r, u + r, v + r], fill=1)
    on = np.asarray(im, bool)
    if not on.any():
        return np.full((G.n, G.n), 1e3, np.float32)
    return ndimage.distance_transform_edt(~on).astype(np.float32) * G.res


# ---------------------------------------------------------------- trees of one cell --------------------------------------------------
DLT = ('https://image.discomap.eea.europa.eu/arcgis/rest/services/GioLandPublic/HRL_DominantLeafType2018/ImageServer/exportImage'
       '?bbox={e0},{n0},{e1},{n1}&bboxSR=25832&imageSR=25832&size={w},{h}&format=tiff&pixelType=U8'
       '&interpolation=RSP_NearestNeighbor&f=image')


def dlt_grid(G):
    """Copernicus HRL Dominant Leaf Type 2018 (10 m; 0 no tree, 1 broadleaf, 2 conifer) on the model grid (nearest)"""
    from rasterio.io import MemoryFile
    e0, n0, e1, n1 = G.utm_box(12)
    e0, n0 = math.floor(e0 / 10) * 10, math.floor(n0 / 10) * 10
    e1, n1 = math.ceil(e1 / 10) * 10, math.ceil(n1 / 10) * 10
    w, h = int((e1 - e0) / 10), int((n1 - n0) / 10)
    b = W.cached(f'dlt/{G.i}_{G.j}.tif', lambda: W.http(DLT.format(e0=e0, n0=n0, e1=e1, n1=n1, w=w, h=h)))
    with MemoryFile(b) as mf, mf.open() as src:
        a = src.read(1)
        T = src.transform
    X, Y = G.mesh()
    E, N = W.to_utm(X, Y)
    c = np.clip(((E - T.c) / T.a).astype(int), 0, a.shape[1] - 1)
    r = np.clip(((N - T.f) / T.e).astype(int), 0, a.shape[0] - 1)
    out = a[r, c]
    return np.where(out > 2, 0, out).astype(np.uint8)


def seed(G, k):
    """a non-negative seed per cell (cells west and south of the origin have negative indices)"""
    return zlib.crc32(f'{G.i}_{G.j}_{k}'.encode())


def spacing(h, con):
    """the distance between two tops of a stand of height h (m): conifers narrower, broadleaf crowns wider"""
    return float(np.clip(0.17 * h + 1.6, 2.6, 6.0)) if con else float(np.clip(0.26 * h + 2.0, 3.2, 9.0))


def trees_of(G, ctx, debug=None):
    from scipy import ndimage
    rgb = wms_layer(G, 'th_dop')
    cir = wms_layer(G, 'th_dop20cir')
    H = chm_grid(G)
    off = leaf_off_grid(G)
    dlt = dlt_grid(G)
    nir, red = cir[..., 0], cir[..., 1]
    ndvi = (nir - red) / (nir + red + 1.0)
    lum = rgb.mean(axis=2)
    Hs = ndimage.gaussian_filter(H, 1.2 / G.res)
    green = ndimage.uniform_filter(ndvi, 3)
    lumS = ndimage.uniform_filter(lum, 5)
    # leaf type of every pixel: the 2018 map where it knows the place (dlt 1/2, 3x3 majority against single pixels), else from the photo –
    # green in an April flight is a conifer, in May conifers are bluer and darker than broadleaf
    con18 = ndimage.uniform_filter((dlt == 2).astype(np.float32), int(15 / G.res) | 1)
    brd18 = ndimage.uniform_filter((dlt == 1).astype(np.float32), int(15 / G.res) | 1)
    known = (con18 + brd18) > 0.25
    bg = ndimage.uniform_filter(rgb[..., 2] / (rgb[..., 1] + 1.0), 5)
    score = (bg - 0.86) * 12.0 - (ndimage.uniform_filter(rgb[..., 1], 5) - 72.0) / 10.0
    con_photo = np.where(off, green > 0.2, score > 0.4)
    con = np.where(known, con18 > brd18, con_photo)
    # the larch: a conifer of the 2018 map that the photo shows like broadleaf – bare in an April flight (tall, not green, not bright), in
    # May light yellow-green and bright (its fresh needles). Dead spruce still standing looks the same in April (grey, bare): drawn as a
    # bare larch, which is what one sees there
    larch = known & (con18 > brd18) & np.where(off, (green < 0.1) & (Hs >= 6.0) & (lumS < 95), (score < -0.75) & (green > 0.3))
    # the canopy now: tall in the canopy model (2018–2020) and alive in the photo of 2024/25 – green; in an April flight the broadleaf is
    # still bare (tall, not green, not bright ground); a conifer stand without green since is a clearing (bark beetle)
    # (bright ground – a clearing's grass, felled timber, a road – is no crown: crowns are darker than 92–95 in the mean of 2.5 m)
    can_on = (Hs >= 2.5) & (green > 0.17) & (lumS < 92)
    can_off = (Hs >= 2.5) & (lumS < 95) & ((green > 0.14) | ((~con | larch) & (Hs >= 5.0) & (green > -0.06)))
    canopy = np.where(off, can_off, can_on)
    rough = np.sqrt(np.maximum(ndimage.uniform_filter(nir * nir, 5) - ndimage.uniform_filter(nir, 5) ** 2, 0))
    # exclusions: roads (the app's own and OSM's, with rails), buildings, the keep-out areas
    # the roads the app draws (welt/fahrt.js, Suhl's approach): a trunk 1.5 m off the carriageway at least (verge, ditch); OSM's tracks and
    # paths 0.8 m (the aerial image keeps the crowns off them anyway)
    rd_app = road_dist(G, ctx['app_roads'])
    rd_osm = road_dist(G, [(ls, hw) for ls, hw, k in ctx['osm_ways'] if k not in ('power',)])
    rd = np.minimum(rd_app, rd_osm)
    near = lambda g: g.bounds[2] > G.x0 and g.bounds[0] < G.x1 and g.bounds[3] > G.y0 and g.bounds[1] < G.y1
    bld = rasterize(G, [g for g in ctx['bld'] if near(g)])
    bdist = ndimage.distance_transform_edt(~bld).astype(np.float32) * G.res if bld.any() else np.full(bld.shape, 1e3, np.float32)
    ko = rasterize(G, [g for g, n in ctx['keepout'] if near(g)])
    forest = rasterize(G, [g for g, t in ctx['forest'] if near(g)])
    free = (rd_app > 1.5) & (rd_osm > 0.8) & (bdist > 0.5) & ~ko
    canopy &= free
    canopy = ndimage.binary_opening(canopy, iterations=1)
    young = ~canopy & (Hs >= 1.0) & (Hs < 2.5) & (green > 0.2) & (rough > 16) & free & (rd > 1.0) & (bdist > 1.0)
    # the tops: local maxima of the smoothed canopy – broadleaf smoothed wider (one crown, one top) – with a touch of the near infrared (the
    # sunlit top of a crown is its brightest part); the tallest first, none closer than the spacing of its kind
    Fc = ndimage.gaussian_filter(H, 0.9 / G.res)
    Fb = ndimage.gaussian_filter(H, 1.8 / G.res)
    F = np.where(con, Fc, Fb) + 0.012 * ndimage.gaussian_filter(nir, 0.6 / G.res)
    F = np.where(canopy, F, 0)
    mx = ndimage.maximum_filter(F, size=int(2.2 / G.res) | 1)
    cand = np.argwhere((F == mx) & canopy & (Hs >= 3.0))
    cand = cand[np.argsort(-H[cand[:, 0], cand[:, 1]])]
    tops = []
    taken = np.zeros_like(canopy, bool)

    def claim(u, v, sp):
        rp = int(sp / G.res)
        v0, v1, u0, u1 = max(0, v - rp), min(G.n, v + rp + 1), max(0, u - rp), min(G.n, u + rp + 1)
        yy, xx = np.ogrid[v0:v1, u0:u1]
        taken[v0:v1, u0:u1] |= (yy - v) ** 2 + (xx - u) ** 2 <= rp * rp

    for v, u in cand:
        if taken[v, u]:
            continue
        tops.append((int(u), int(v)))
        claim(u, v, spacing(float(Hs[v, u]), bool(con[v, u])))
    # canopy no top reached (a smooth stretch of the model): filled at the spacing of its stand, in random order
    rng = np.random.default_rng(seed(G, 11))
    idx = np.argwhere(canopy & ~taken)
    rng.shuffle(idx)
    for v, u in idx:
        if taken[v, u]:
            continue
        tops.append((int(u), int(v)))
        claim(u, v, spacing(float(Hs[v, u]), bool(con[v, u])))
    # young growth and bushes: sparse, where nothing else stands
    if young.any():
        yy = np.argwhere(young & ~taken)
        keep = rng.random(len(yy)) < 0.01
        for v, u in yy[keep]:
            if not taken[v, u]:
                tops.append((int(u), int(v)))
                claim(u, v, 2.0)
    if not tops:
        return []
    T = np.array(tops)
    from scipy.spatial import cKDTree
    kd = cKDTree(T * G.res)
    dd, _ = kd.query(T * G.res, k=2)
    nn = dd[:, 1] if len(T) > 1 else np.full(len(T), 6.0)
    # stand context: the share of canopy within 12 m (at the edge a crown is seen from outside)
    cfrac = ndimage.uniform_filter(canopy.astype(np.float32), int(24 / G.res) | 1)
    out = []
    rng = np.random.default_rng(seed(G, 3))
    for t, (u, v) in enumerate(T):
        x, y = G.xy(u, v)
        if not (G.x0 + G.m <= x < G.x1 - G.m and G.y0 + G.m <= y < G.y1 - G.m):
            continue
        r1 = int(1.5 / G.res)
        win = H[max(0, v - r1):v + r1 + 1, max(0, u - r1):u + r1 + 1]
        h = float(np.percentile(win, 90)) if win.size else float(H[v, u])
        meas = h >= 3.0
        is_young = bool(young[v, u]) and not canopy[v, u]
        if is_young:
            h = max(1.2, min(3.5, h + 0.4))
        elif h < 3.0:
            h = 4.0 + 3.0 * rng.random()
        c = bool(con[v, u])
        lw = larch[max(0, v - r1):v + r1 + 1, max(0, u - r1):u + r1 + 1]
        is_larch = c and lw.size and float(lw.mean()) > 0.5
        r = float(np.clip(nn[t] * 0.6, 0.9, (0.2 if c else 0.36) * h + 1.0))
        fr = float(cfrac[v, u])
        in_forest = bool(forest[v, u]) or fr > 0.55
        edge = fr < 0.62 or float(rd[v, u]) < 8.0
        if is_young or h < 3.0:
            k = 7
        elif c:
            k = 2 if is_larch else 0
        elif in_forest:
            k = 5 if (h < 13 and edge and rng.random() < 0.45) else 3
        else:
            k = 6 if h < 9.0 else 4
        fl = (16 if edge else 0) | (32 if meas else 0) | (64 if in_forest else 0) | (128 if is_young else 0)
        out.append((x, y, h, r, k, fl, int(rng.integers(0, 256))))
    if debug:
        debug_pic(G, rgb, cir, H, canopy, out, debug)
    return out


def debug_pic(G, rgb, cir, H, canopy, trees, d):
    from PIL import Image, ImageDraw
    os.makedirs(d, exist_ok=True)
    col = [(0, 90, 30), (40, 140, 160), (200, 160, 40), (250, 230, 60), (255, 120, 40), (255, 255, 255), (255, 80, 200), (160, 160, 160)]
    for name, base in (('rgb', rgb), ('cir', cir)):
        im = Image.fromarray(np.clip(base, 0, 255).astype(np.uint8))
        dr = ImageDraw.Draw(im)
        for x, y, h, r, k, fl, a in trees:
            u, v = G.uv(x, y)
            rr = r / G.res
            dr.ellipse([u - rr, v - rr, u + rr, v + rr], outline=col[k])
            dr.point((u, v), fill=col[k])
        im.save(os.path.join(d, f'{G.i}_{G.j}_{name}.jpg'), quality=85)
    can = Image.fromarray((canopy * 255).astype(np.uint8))
    can.save(os.path.join(d, f'{G.i}_{G.j}_canopy.png'))
    Image.fromarray(np.clip(H * 8, 0, 255).astype(np.uint8)).save(os.path.join(d, f'{G.i}_{G.j}_chm.png'))


# ---------------------------------------------------------------- output -------------------------------------------------------------
def pack(i, j, trees):
    """WWB2: magic, n (uint32), then zlib of the trees sorted by 25 m block (16 x 16 in the cell), y, x: x (uint16 dm in the cell) as low
    and high byte planes, y the same as differences to the tree before, h (uint8, 0.25 m), r (uint8, 0.1 m), kind | flags (uint8). The
    rank of a tree (which ones a level thins) is a hash of its place at runtime"""
    n = len(trees)
    x0, y0 = i * W.CELL, j * W.CELL
    a = np.array(trees, dtype=np.float64).reshape(-1, 7) if n else np.zeros((0, 7))
    xs = np.clip(np.round((a[:, 0] - x0) * 10), 0, 3999).astype(np.int64)
    ys = np.clip(np.round((a[:, 1] - y0) * 10), 0, 3999).astype(np.int64)
    blk = np.minimum(xs // 250, 15) + 16 * np.minimum(ys // 250, 15)
    o = np.lexsort((xs, ys, blk))
    xs, ys = xs[o], ys[o]
    dy = np.diff(ys, prepend=0) & 0xFFFF
    hs = np.clip(np.round(a[o, 2] * 4), 1, 255).astype('u1')
    rs = np.clip(np.round(a[o, 3] * 10), 5, 255).astype('u1')
    ks = (a[o, 4].astype(int) | a[o, 5].astype(int)).astype('u1')
    pl = lambda v: (v & 255).astype('u1').tobytes() + (v >> 8).astype('u1').tobytes()
    body = pl(xs) + pl(dy) + hs.tobytes() + rs.tobytes() + ks.tobytes()
    return b'WWB2' + struct.pack('<I', n) + zlib.compress(body, 9)


def unpack(b):
    """the trees of a cell file (WWB1 or WWB2), in model metres relative to the cell: [(x, y, h, r, kind, flags)]"""
    n = struct.unpack('<I', b[4:8])[0]
    raw = np.frombuffer(zlib.decompress(b[8:]), 'u1')
    if b[:4] == b'WWB1':
        xs = raw[:2 * n].view('<u2').astype(np.int64)
        ys = raw[2 * n:4 * n].view('<u2').astype(np.int64)
        o = 4 * n
    else:
        xs = raw[:n].astype(np.int64) | raw[n:2 * n].astype(np.int64) << 8
        ys = np.cumsum(raw[2 * n:3 * n].astype(np.int64) | raw[3 * n:4 * n].astype(np.int64) << 8) & 0xFFFF
        o = 4 * n
    return [(xs[t] / 10, ys[t] / 10, raw[o + t] / 4, raw[o + n + t] / 10, raw[o + 2 * n + t] & 15, raw[o + 2 * n + t] & 240) for t in range(n)]


def drop_in_buildings(margin=0.8):
    """the trees whose trunk stands in a building of the app's cells (gebaeude/z/: ETHOS and the villages of welt-orte) or within margin of
    its walls go – the cells as they are, nothing computed again (after new buildings came)"""
    from shapely.geometry import Point, Polygon
    from shapely.strtree import STRtree
    gz = os.path.join(W.VIZ, 'extra', 'welt-gebaeude', 'dist', 'gebaeude', 'z')
    ip = os.path.join(W.OUT, 'z', 'index.json')
    idx = json.load(open(ip))
    gone = 0
    for key in sorted(idx['cells']):
        p = os.path.join(gz, key + '.json')
        if not os.path.exists(p):
            continue
        polys = []
        for b in json.load(open(p)).get('b', []):
            f = b.get('f') or []
            if len(f) >= 6:
                g = Polygon(list(zip(f[0::2], f[1::2])))
                polys.append((g if g.is_valid else g.buffer(0)).buffer(margin))
        if not polys:
            continue
        st = STRtree(polys)
        i, j = (int(v) for v in key.split('_'))
        fp = os.path.join(W.OUT, 'z', key + '.bin')
        T = unpack(open(fp, 'rb').read())
        keep = []
        for x, y, h, r, k, fl in T:
            X, Y = i * W.CELL + x, j * W.CELL + y
            pt = Point(X, Y)
            if any(polys[q].contains(pt) for q in st.query(pt)):
                continue
            keep.append((X, Y, h, r, k, fl, 0))
        if len(keep) == len(T):
            continue
        b = pack(i, j, keep)
        open(fp, 'wb').write(b)
        ks = [0] * 8
        for t in keep:
            ks[int(t[4])] += 1
        idx['cells'][key] = [len(keep), len(b), ks]
        gone += len(T) - len(keep)
        W.log(key, len(T) - len(keep), 'trees in or at buildings dropped')
    idx['n'] = sum(v[0] for v in idx['cells'].values())
    idx['bytes'] = sum(v[1] for v in idx['cells'].values())
    json.dump(idx, open(ip, 'w'), separators=(',', ':'))
    W.log('dropped', gone, 'trees; now', idx['n'])


def corridor_cells(names, width=CORRIDOR):
    from shapely.geometry import LineString, box
    from shapely.ops import unary_union
    R = W.routes()
    lines = [LineString(R[k]) for k in names if k in R and len(R[k]) > 1]
    reg = unary_union([ls.buffer(width, resolution=4) for ls in lines])
    x0, y0, x1, y1 = reg.bounds
    out = []
    for i in range(int(math.floor(x0 / W.CELL)), int(math.floor(x1 / W.CELL)) + 1):
        for j in range(int(math.floor(y0 / W.CELL)), int(math.floor(y1 / W.CELL)) + 1):
            if reg.intersects(box(*W.cell_box(i, j))):
                out.append((i, j))
    return out, reg


def tile_cells():
    """every cell under the world's tiles of level 10 (the main set, Kloster Veßra's, Trusetal's, Meiningen's, the Werra valley's,
    Suhl's corridor ground): [(i, j)]"""
    from shapely.geometry import Polygon, box
    from shapely.ops import unary_union
    site = 'https://mynametouse.github.io/pavillon-ratscher/welt-test/'
    polys = []
    # the zones of the Karten-Chat (19.11.2026): Trusetal, Meiningen, the Werra valley on the way
    for name, url in (('main', site + 'meta.json'), ('vessra', site + 'zonen/vessra/meta.json'),
                      ('trusetal', site + 'zonen/trusetal/meta.json'), ('meiningen', site + 'zonen/meiningen/meta.json'),
                      ('werratal', site + 'zonen/werratal/meta.json'), ('suhl', W.SUHL_BASE + 'boden/v2/meta.json')):
        try:
            m = json.loads(W.cached(f'meta/{name}.json', lambda: W.http(url)))
        except Exception as e:
            W.log('no tile set', name, e)
            continue
        lv = m['tiling']['levels'].get('10')
        if not lv:
            continue
        has = [tuple(q) for q in lv['has']] if isinstance(lv.get('has'), list) else \
            [(x, y) for x in range(lv['rect'][0], lv['rect'][2] + 1) for y in range(lv['rect'][1], lv['rect'][3] + 1)]
        for x, y in has:
            polys.append(Polygon(W.suhl_tile_poly(x, y)))
    reg = unary_union(polys)
    x0, y0, x1, y1 = reg.bounds
    out = []
    for i in range(int(math.floor(x0 / W.CELL)), int(math.floor(x1 / W.CELL)) + 1):
        for j in range(int(math.floor(y0 / W.CELL)), int(math.floor(y1 / W.CELL)) + 1):
            if reg.intersection(box(*W.cell_box(i, j))).area > 400:
                out.append((i, j))
    return out


# the sources (the index says them; the credits of viz3/extra/welt-wald/manifest.json the same)
SRC = ('Luftbild DOP 20 cm RGB und Infrarot © GDI-Th (dl-de/by-2-0, Bildflüge 2024/2025); Kronenhöhen: High Resolution Canopy Height '
       'Maps by WRI and Meta (Tolan et al. 2024, CC BY 4.0); Laub oder Nadel: Copernicus High Resolution Layer Dominant Leaf Type 2018 '
       '© European Union, Copernicus Land Monitoring Service, EEA; Straßen, Wald: © OpenStreetMap-Mitwirkende (ODbL 1.0); Gebäude: '
       'ETHOS.BUILDA, Forschungszentrum Jülich (ODbL 1.0)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--corridor', action='store_true')
    ap.add_argument('--routes', default='suhl_land,markt,baumschule')
    ap.add_argument('--cells', default='')
    ap.add_argument('--tiles', action='store_true', help='every cell under the world tiles (after the corridors)')
    ap.add_argument('--skip-done', action='store_true', help='leave out cells already in the index')
    ap.add_argument('--ethos', default='')
    ap.add_argument('--osm-ways', default=os.path.join(W.RAW, 'osm', 'ways.json'))
    ap.add_argument('--osm-green', default=os.path.join(W.RAW, 'osm', 'green.json'))
    ap.add_argument('--debug', default='')
    ap.add_argument('--nir-con', type=float, default=150.0)
    ap.add_argument('--limit', type=int, default=0)
    ap.add_argument('--drop-in-buildings', action='store_true', help='only: drop the trees in the buildings of gebaeude/z/ (new villages)')
    a = ap.parse_args()
    if a.drop_in_buildings:
        drop_in_buildings()
        return
    from shapely.geometry import box, Polygon
    from shapely.strtree import STRtree
    cells = []
    if a.corridor:
        cells, _ = corridor_cells([s for s in a.routes.split(',') if s])
    if a.cells:
        cells += [tuple(int(v) for v in c.split('_')) for c in a.cells.split(',')]
    if a.tiles:
        cells += tile_cells()
    cells = list(dict.fromkeys(cells))
    ko = W.keepout()
    # cells entirely inside a keep-out area are skipped
    keep = []
    for i, j in cells:
        b = box(*W.cell_box(i, j))
        if any(g.contains(b) for g, n in ko):
            continue
        keep.append((i, j))
    if a.skip_done:
        ip0 = os.path.join(W.OUT, 'z', 'index.json')
        done = set(json.load(open(ip0))['cells']) if os.path.exists(ip0) else set()
        keep = [c for c in keep if f'{c[0]}_{c[1]}' not in done]
    cells = keep[:a.limit] if a.limit else keep
    W.log(len(cells), 'cells')
    allb = box(min(i for i, j in cells) * W.CELL - 50, min(j for i, j in cells) * W.CELL - 50,
               (max(i for i, j in cells) + 1) * W.CELL + 50, (max(j for i, j in cells) + 1) * W.CELL + 50)
    ctx = {
        'app_roads': W.app_roads(),
        'osm_ways': W.osm_ways(a.osm_ways),
        'keepout': ko,
        'nir_con': a.nir_con,
        'cellpoly': lambda G: box(G.x0, G.y0, G.x1, G.y1),
        'forest': W.osm_areas(a.osm_green, {'landuse': {'forest'}, 'natural': {'wood'}}),
        'bld': W.ethos_polys(a.ethos, allb.bounds) if a.ethos else [],
    }
    W.log('roads', len(ctx['app_roads']), 'osm ways', len(ctx['osm_ways']), 'forest areas', len(ctx['forest']), 'buildings', len(ctx['bld']))
    os.makedirs(os.path.join(W.OUT, 'z'), exist_ok=True)
    ip = os.path.join(W.OUT, 'z', 'index.json')
    idx = json.load(open(ip)) if os.path.exists(ip) else {'v': 1, 'cell': W.CELL, 'cells': {}}
    tot = 0
    for c, (i, j) in enumerate(cells):
        G = Grid(i, j)
        try:
            T = trees_of(G, ctx, a.debug or None)
        except Exception as e:
            W.log('cell', i, j, 'failed:', e)
            continue
        b = pack(i, j, T)
        open(os.path.join(W.OUT, 'z', f'{i}_{j}.bin'), 'wb').write(b)
        ks = [0] * 8
        for t in T:
            ks[t[4]] += 1
        idx['cells'][f'{i}_{j}'] = [len(T), len(b), ks]
        tot += len(T)
        W.log(f'{c + 1}/{len(cells)} cell {i}_{j}: {len(T)} trees {len(b) // 1024} kB kinds {ks}')
    idx['kinds'] = KINDS
    idx['made'] = __import__('time').strftime('%Y-%m-%d')
    idx['src'] = SRC
    idx['n'] = sum(v[0] for v in idx['cells'].values())
    idx['bytes'] = sum(v[1] for v in idx['cells'].values())
    json.dump(idx, open(ip, 'w'), separators=(',', ':'))
    W.log('done', tot, 'trees in', len(cells), 'cells; all', idx['n'], 'trees,', idx['bytes'] // 1024, 'kB')


if __name__ == '__main__':
    main()
