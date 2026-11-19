#!/usr/bin/env python3
"""Geländeprüfung (Karten-Chat, 19.11.2026): how good is the ground the app shows today, and what would DGM1 change?

In GitHub Actions only (.github/workflows/gelaende-pruefung.yml – the keys live there as secrets, never in the repo):

    python3 -I -u tools/gelaende/pruefung.py --raw ~/gel-raw --out out/gelaende --egd ext/suhl/tools/suhl/lib

1. DGM1 Thüringen (1 m, bare earth, © GDI-Th, CC BY 4.0, bezogen über easygeodata.de) for block B – the 9.6 km square of the
   world tiles around the garden, 121 tiles of 1 km² – through the easygeodata client of the Suhl data house (tools/suhl/lib,
   checked out read-only at a fixed commit; the key goes to easygeodata.de only). The zips land in <raw>/dgm1/ under the names
   tools/welt/fetch.py reads, so the next build of the world tiles can take them as they are.
2. The ground of the app today: the terrain tiles of welt-test/ (level 11 = 2 m in block B, level 7 = 32 m in the context square),
   Ratscher's own 2.4 km square (geo/terrain.b64.json, 10 m), the baked longitudinal profiles of the roads (fahrt/strassen.json).
3. Compared with DGM1: by land cover (ESA WorldCover 2021), by slope, along the roads (by class, the worst stretches by name),
   in the square, at the summits with an official height (Wikidata P2044).
4. Independent points from space, also beyond block B: ICESat-2 ATL08 (terrain height of 100 m segments, also under forest) and
   GEDI L2A (lowest mode of each 25 m footprint), through SlideRule (NASA's public subsetting service); ellipsoid heights to NHN
   with the EGM2008 geoid (PROJ). The Earthdata login (secrets EARTHDATA_USERNAME / _PASSWORD) is checked and used for ATL08
   granules directly when SlideRule cannot answer.

Output (<out>): maengel.md (German, for people: the table of defects), pruefung.json (all numbers), diff_b.png (today − DGM1 in
block B, 4 m), strassen.csv, gipfel.csv, satelliten.csv. Every part runs on its own: a failing source is reported, not fatal.
Heights: NHN (DHHN2016) minus H0 = 374.617 m as in the app; d = today − DGM1 (positive: the app's ground lies too high).
"""
import argparse, base64, csv, json, math, os, sys, time, traceback, urllib.parse, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'tools', 'welt'))
from tiles import decode_heights          # noqa: E402  (tools/welt: the codec of the terrain tiles, row 0 = south)

UA = 'PavillonRatscher-Gelaendepruefung/0.1 (+https://github.com/mynametouse/pavillon-ratscher; open geodata, non-commercial)'
SITES = ([os.environ['GEL_SITE']] if os.environ.get('GEL_SITE') else []) + [
    'https://mynametouse.github.io/pavillon-ratscher/welt-test/', 'https://pub-7f0c44b2c13e4f6695947e67f760b20e.r2.dev/welt-test/']
G = json.load(open(os.path.join(REPO, 'viz3', 'manifests.json')))['geoman']
XF, H0 = G['xf'], float(G['H0'])
ROOT_E0, ROOT_N0, ROOT = 420700.0, 5390800.0, 409600.0
# block B: level 11 tiles 1000..1047 (200 m) = E 620 700 .. 630 300, N 5 590 800 .. 5 600 400; the context square: level 7 tiles 60..67
B_E0, B_N0, B_SIZE, STEP = 620700.0, 5590800.0, 9600.0, 2.0
NB = int(B_SIZE / STEP) + 1                       # 4801 points per side, row 0 = south
C_E0, C_N0, C_SIZE, C_STEP = 612700.0, 5582800.0, 25600.0, 32.0
NC = int(C_SIZE / C_STEP) + 1                     # 801
WC_URL = 'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_{tile}_Map.tif'
WC_NAMES = {10: 'Wald', 20: 'Gebüsch', 30: 'Grünland', 40: 'Acker', 50: 'bebaut', 60: 'offener Boden', 80: 'Wasser', 90: 'Feuchtgebiet'}
GROUPS = [('Wald', (10,)), ('Grünland', (30,)), ('Acker', (40,)), ('bebaut', (50,)), ('Gebüsch, Feuchtgebiet, offener Boden', (20, 60, 90))]
KINDS = ['motorway', 'main', 'county', 'street', 'lane', 'service', 'track', 'path', 'foot']
KIND_DE = {'motorway': 'Autobahn', 'main': 'Bundes-/Landesstraße', 'county': 'Kreisstraße', 'street': 'Ortsstraße', 'lane': 'Nebenstraße',
           'service': 'Zufahrt', 'track': 'Feldweg', 'path': 'Pfad', 'foot': 'Fußweg'}

_t0 = time.time()


def log(*a):
    print(f'[{time.time() - _t0:7.1f}s]', *a, flush=True)


# ------------------------------------------------------------------ coordinates
def utm_from_model(x, y):
    x, y = np.asarray(x, float), np.asarray(y, float)
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


def model_from_utm(E, N):
    dE, dN = np.asarray(E, float) - XF['ex'], np.asarray(N, float) - XF['ey']
    s2 = XF['a'] ** 2 + XF['b'] ** 2
    return (XF['a'] * dE + XF['b'] * dN) / s2, (-XF['b'] * dE + XF['a'] * dN) / s2


_tr = {}


def transformer(a, b):
    if (a, b) not in _tr:
        from pyproj import Transformer
        _tr[(a, b)] = Transformer.from_crs(a, b, always_xy=True)
    return _tr[(a, b)]


def lonlat_from_utm(E, N):
    return transformer('EPSG:25832', 'EPSG:4326').transform(E, N)


def utm_from_lonlat(lon, lat):
    return transformer('EPSG:4326', 'EPSG:25832').transform(lon, lat)


def bilinear(Z, E, N, e0, n0, step):
    """Z row 0 = south at n0, column 0 at e0; NaN outside"""
    E, N = np.asarray(E, float), np.asarray(N, float)
    nr, nc = Z.shape
    c, r = (E - e0) / step, (N - n0) / step
    ok = (c >= 0) & (c <= nc - 1) & (r >= 0) & (r <= nr - 1)
    c0 = np.clip(np.floor(c).astype(int), 0, nc - 2)
    r0 = np.clip(np.floor(r).astype(int), 0, nr - 2)
    fc, fr = np.clip(c - c0, 0, 1), np.clip(r - r0, 0, 1)
    v = (Z[r0, c0] * (1 - fc) * (1 - fr) + Z[r0, c0 + 1] * fc * (1 - fr) + Z[r0 + 1, c0] * (1 - fc) * fr + Z[r0 + 1, c0 + 1] * fc * fr)
    return np.where(ok, v, np.nan)


def stats(d):
    d = np.asarray(d, float)
    d = d[np.isfinite(d)]
    if d.size == 0:
        return {'n': 0}
    a = np.abs(d)
    return {'n': int(d.size), 'mittel': round(float(d.mean()), 2), 'median': round(float(np.median(d)), 2),
            'p5': round(float(np.percentile(d, 5)), 2), 'p95': round(float(np.percentile(d, 95)), 2),
            'rmse': round(float(np.sqrt((d * d).mean())), 2), 'ueber2m': round(float((a > 2).mean()) * 100, 1),
            'ueber5m': round(float((a > 5).mean()) * 100, 1)}


def http(url, headers=None, timeout=60, tries=3):
    last = None
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, **(headers or {})})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return (r.status or 200), r.read()                  # (file:// for local tests has no status)
        except urllib.error.HTTPError as e:
            if e.code in (400, 403, 404, 410):
                return e.code, b''
            last = e
            if e.code == 429:                                       # Wikidata: one request a minute while it is rate-limited
                time.sleep(65)
                continue
        except Exception as e:
            last = e
        time.sleep(2 * (k + 1))
    raise RuntimeError(f'{url}: {last!r}')


# ------------------------------------------------------------------ 1. DGM1
def dgm1_tiles():
    return [(e, n) for n in range(int(B_N0 // 1000), int((B_N0 + B_SIZE) // 1000) + 1)
            for e in range(int(B_E0 // 1000), int((B_E0 + B_SIZE) // 1000) + 1)]


def fetch_dgm1(raw, egd_dir, max_mb):
    sys.path.insert(0, os.path.abspath(egd_dir))
    import easygeodata as EG
    egd = EG.Easygeodata(raw=raw, log=log)
    rep = egd.fetch_many('dgm', dgm1_tiles(), max_mb=max_mb)
    rep['data_stand'] = egd.data_stand('dgm')
    return rep, EG.read_tile


class Mosaic:
    """DGM1 of block B at 1 m (pixel areas; one pixel of margin around the block), absolute NHN heights"""

    def __init__(self, raw, read_tile):
        self.e0, self.n1 = B_E0 - 1.0, B_N0 + B_SIZE + 1.0          # left edge, top edge of the mosaic
        n = int(B_SIZE) + 2
        self.M = np.full((n, n), np.nan, np.float32)                 # row 0 = north
        self.ok, self.bad = [], []
        for e, nn in dgm1_tiles():
            p = os.path.join(raw, 'dgm1', f'dgm1_32_{e}_{nn}.zip')
            if not os.path.exists(p):
                continue
            try:
                a, el, nt, px = read_tile(p)
            except Exception as ex:
                self.bad.append((e, nn, repr(ex)[:120]))
                continue
            if abs(px - 1.0) > 1e-6:
                self.bad.append((e, nn, f'pixel {px}'))
                continue
            a = np.where((a > -100) & (a < 3000), a, np.nan).astype(np.float32)
            c0, r0 = int(round(el - self.e0)), int(round(self.n1 - nt))
            rs0, cs0 = max(0, -r0), max(0, -c0)
            r1, c1 = min(n, r0 + a.shape[0]), min(n, c0 + a.shape[1])
            if r1 <= max(r0, 0) or c1 <= max(c0, 0):
                continue
            self.M[max(r0, 0):r1, max(c0, 0):c1] = a[rs0:rs0 + r1 - max(r0, 0), cs0:cs0 + c1 - max(c0, 0)]
            self.ok.append((e, nn))
        Mf = self.M[::-1]                                             # row 0 = south: centre of row R at N0 - 0.5 + R
        self.G = 0.25 * (Mf[0::2, 0::2] + Mf[1::2, 0::2] + Mf[0::2, 1::2] + Mf[1::2, 1::2]) - H0   # 2 m grid of block B, rel. H0
        self.share = float(np.isfinite(self.G).mean())
        log(f'DGM1: {len(self.ok)} Kacheln gelesen, {len(self.bad)} unlesbar, Anteil am Block {self.share * 100:.1f} %')

    def at(self, E, N):
        """bilinear between pixel centres, rel. H0"""
        Mf = self.M[::-1]
        return bilinear(Mf, E, N, self.e0 + 0.5, B_N0 - 0.5, 1.0) - H0

    def max_within(self, E, N, r):
        c, rr = int(round(E - self.e0)), int(round(self.n1 - N))
        k = int(math.ceil(r))
        if c - k < 0 or rr - k < 0 or c + k >= self.M.shape[1] or rr + k >= self.M.shape[0]:
            return float('nan')
        w = self.M[rr - k:rr + k + 1, c - k:c + k + 1]
        yy, xx = np.mgrid[-k:k + 1, -k:k + 1]
        w = np.where(xx * xx + yy * yy <= r * r, w, np.nan)
        return float(np.nanmax(w)) - H0 if np.isfinite(w).any() else float('nan')


# ------------------------------------------------------------------ 2. the ground of the app today
def fetch_level(L, x0, x1, y0, y1, n_side, e0, n0, step):
    """the terrain tiles of a level into one grid (row 0 = south), rel. H0"""
    n = (x1 - x0 + 1) * (n_side - 1) + 1
    Z = np.full((n, n), np.nan, np.float32)
    jobs = [(x, y) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
    site = [None]

    def get(xy):
        x, y = xy
        for s in ([site[0]] if site[0] else []) + SITES:
            try:
                st, b = http(f'{s}t/{L}/{x}/{y}.bin', timeout=60)
            except Exception:
                continue
            if st == 200 and b[:4] == b'WTH1':
                site[0] = s
                return xy, decode_heights(b)
        return xy, None
    miss = 0
    with ThreadPoolExecutor(12) as ex:
        for (x, y), h in ex.map(get, jobs):
            if h is None:
                miss += 1
                continue
            i0, j0 = (x - x0) * (n_side - 1), (y - y0) * (n_side - 1)
            Z[j0:j0 + n_side, i0:i0 + n_side] = h
    log(f'welt-test Stufe {L}: {len(jobs) - miss} von {len(jobs)} Kacheln ({site[0]})')
    return Z, miss, site[0]


def inner_square():
    """Ratscher's 2.4 km square: (x, y, z) in model metres of the 10 m grid of geo/terrain.b64.json (the app's dist)"""
    T = G['terrain']
    I = T['inner']
    for p in ('viz3/dist/geo/terrain.b64.json', 'viz3/extra/fahrt/dist/geo/terrain.b64.json'):
        fp = os.path.join(REPO, p)
        if os.path.exists(fp):
            raw = np.frombuffer(base64.b64decode(json.load(open(fp))['b64']), '<i2').astype(np.float32) / 10
            zi = raw[:I['n'] ** 2].reshape(I['n'], I['n'])
            xs = I['x0'] + np.arange(I['n']) * I['step']
            ys = I['y0'] + np.arange(I['n']) * I['step']
            X, Y = np.meshgrid(xs, ys)
            return X, Y, zi, p
    return None


# ------------------------------------------------------------------ land cover
def worldcover(raw, e0, n0, size, res=10.0):
    """ESA WorldCover 2021 classes on a UTM grid, row 0 = NORTH (as rasterio writes it)"""
    W = int(round(size / res))
    p = os.path.join(raw, 'worldcover', f'wc_{e0:.0f}_{n0:.0f}_{size:.0f}_{res:.0f}.npy')
    if os.path.exists(p):
        return np.load(p)
    import rasterio
    from rasterio.warp import reproject, Resampling
    from rasterio.transform import from_origin
    from rasterio.windows import from_bounds
    lons, lats = lonlat_from_utm([e0, e0 + size, e0, e0 + size], [n0, n0, n0 + size, n0 + size])
    lo0, lo1, la0, la1 = min(lons) - 0.01, max(lons) + 0.01, min(lats) - 0.01, max(lats) + 0.01
    la, lo = int(math.floor(la0 / 3) * 3), int(math.floor(lo0 / 3) * 3)
    name = f"{'N' if la >= 0 else 'S'}{abs(la):02d}{'E' if lo >= 0 else 'W'}{abs(lo):03d}"
    out = np.zeros((W, W), np.uint8)
    with rasterio.open(WC_URL.format(tile=name)) as src:
        win = from_bounds(lo0, la0, lo1, la1, src.transform).round_offsets().round_lengths()
        a = src.read(1, window=win)
        reproject(source=a, destination=out, src_transform=src.window_transform(win), src_crs=src.crs,
                  dst_transform=from_origin(e0, n0 + size, res, res), dst_crs='EPSG:25832', resampling=Resampling.nearest)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    np.save(p, out)
    log(f'WorldCover {name}: {W} x {W} Zellen, Wald {100 * (out == 10).mean():.0f} %')
    return out


def wc_at(WC, E, N, e0, n0, size, res=10.0):
    W = WC.shape[0]
    c = np.clip(((np.asarray(E) - e0) / res).astype(int), 0, W - 1)
    r = np.clip(((n0 + size - np.asarray(N)) / res).astype(int), 0, W - 1)
    return WC[r, c]


# ------------------------------------------------------------------ places for the names in the tables
class Places:
    def __init__(self):
        self.p = []
        fp = os.path.join(REPO, 'viz3', 'extra', 'karte', 'dist', 'karte', 'orte.json')
        try:
            d = json.load(open(fp))                                   # rows [name, kind, x, y, gemeinde, kreis, einwohner, rang, karte]
            for o in d['orte']:
                if o[1] in ('Ortsteil', 'Gemeinde', 'Stadtteil', 'Stadt', 'Dorf', 'Weiler'):
                    self.p.append((o[2], o[3], o[0]))
        except Exception as ex:
            log('Orte nicht gelesen:', repr(ex)[:120])
        self.a = np.array([(x, y) for x, y, _ in self.p]) if self.p else None

    def near(self, x, y):
        if self.a is None:
            return ''
        d = np.hypot(self.a[:, 0] - x, self.a[:, 1] - y)
        i = int(np.argmin(d))
        return f'bei {self.p[i][2]}' if d[i] > 400 else self.p[i][2]


# ------------------------------------------------------------------ 3. roads
def roads(mos, cur_at, places):
    fp = os.path.join(REPO, 'viz3', 'extra', 'fahrt', 'dist', 'fahrt', 'strassen.json')
    d = json.load(open(fp))
    names = d.get('names') or []
    by_kind, rows = {}, []
    allr, allt = [], []
    for w in d['ways']:
        k, sf, w10, fl, ni, ri, q = w[:7]
        if fl & 3 or len(q) < 6:                                   # bridges, tunnels: their own height
            continue
        P = np.asarray(q, float).reshape(-1, 3) / 10.0
        # points every 10 m along the way
        seg = np.hypot(np.diff(P[:, 0]), np.diff(P[:, 1]))
        s = np.concatenate([[0], np.cumsum(seg)])
        if s[-1] < 20:
            continue
        ss = np.arange(0, s[-1], 10.0)
        x, y, z = (np.interp(ss, s, P[:, i]) for i in range(3))
        E, N = utm_from_model(x, y)
        g = mos.at(E, N)
        t = cur_at(E, N)
        ok = np.isfinite(g)
        if ok.sum() < 3:
            continue
        kn = KINDS[k] if 0 <= k < len(KINDS) else str(k)
        dr, dt = (z - g)[ok], (t - g)[ok]
        b = by_kind.setdefault(kn, {'r': [], 't': [], 'km': 0.0})
        b['r'].append(dr)
        b['t'].append(dt)
        b['km'] += ok.sum() * 0.01
        allr.append(dr)
        allt.append(dt)
        # the worst 200 m stretch of the way (mean |road - DGM1|)
        dd = np.where(ok, z - g, np.nan)
        if dd.size >= 20:
            m = np.convolve(np.nan_to_num(np.abs(dd)), np.ones(20) / 20, 'valid')
            i = int(np.argmax(m))
            sl = dd[i:i + 20]
            if np.isfinite(sl).sum() >= 15:
                c = i + 10
                nm = names[ni] if 0 <= ni < len(names) and names[ni] else ''
                rf = names[ri] if 0 <= ri < len(names) and names[ri] else ''
                rows.append({'strasse': (rf + ' ' + nm).strip() or KIND_DE.get(kn, kn), 'klasse': KIND_DE.get(kn, kn),
                             'ort': places.near(x[c], y[c]), 'x': round(float(x[c])), 'y': round(float(y[c])),
                             'abw_m': round(float(np.nanmean(sl)), 2), 'max_m': round(float(sl[np.nanargmax(np.abs(sl))]), 2),
                             'heute_gelaende_m': round(float(np.nanmean((t - g)[i:i + 20])), 2)})
    out = {'je_klasse': {}, 'alle': {'strasse': stats(np.concatenate(allr)) if allr else {'n': 0},
                                     'gelaende': stats(np.concatenate(allt)) if allt else {'n': 0}}}
    for kn, b in by_kind.items():
        out['je_klasse'][kn] = {'km': round(b['km'], 1), 'strasse': stats(np.concatenate(b['r'])), 'gelaende': stats(np.concatenate(b['t']))}
    rows.sort(key=lambda r: -abs(r['abw_m']))
    return out, rows


# ------------------------------------------------------------------ peaks (Wikidata)
def peaks(lon0, lat0, lon1, lat1):
    # the form of tools/karte/wd_orte.py (box first, then the classes): mountain, hill, summit, mountain range peak
    q = """SELECT ?p ?pLabel ?ele ?lat ?lon WHERE {
  SERVICE wikibase:box { ?p wdt:P625 ?c . bd:serviceParam wikibase:cornerSouthWest "Point(%f %f)"^^geo:wktLiteral .
                         bd:serviceParam wikibase:cornerNorthEast "Point(%f %f)"^^geo:wktLiteral . }
  ?p wdt:P31 ?t .
  VALUES ?t { wd:Q8502 wd:Q54050 wd:Q207326 wd:Q1595289 }
  ?p wdt:P2044 ?ele .
  BIND(geof:latitude(?c) AS ?lat) BIND(geof:longitude(?c) AS ?lon)
  SERVICE wikibase:label { bd:serviceParam wikibase:language "de,en". }
}""" % (lon0, lat0, lon1, lat1)
    st, b = http('https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': q, 'format': 'json'}),
                 headers={'Accept': 'application/sparql-results+json'}, timeout=120)
    if st != 200:
        raise RuntimeError(f'Wikidata HTTP {st}')
    seen, out = set(), []
    for r in json.loads(b.decode())['results']['bindings']:
        pid = r['p']['value'].rsplit('/', 1)[-1]
        if pid in seen:
            continue
        seen.add(pid)
        lon, lat = float(r['lon']['value']), float(r['lat']['value'])
        try:
            ele = float(r['ele']['value'])
        except Exception:
            continue
        if not (150 < ele < 1200):
            continue
        out.append({'qid': pid, 'name': r.get('pLabel', {}).get('value', pid), 'lon': lon, 'lat': lat, 'ele': ele})
    return out


# ------------------------------------------------------------------ 4. satellites
def geoid_fn(raw):
    """ellipsoid (WGS84) -> NHN: the EGM2008 geoid (2.5' grid of the PROJ CDN, a window around the context square, cached); the
    German quasigeoid GCG2016 differs from it here by a few decimetres – the median against DGM1 on open land shows what is left"""
    try:
        p = os.path.join(raw, 'geoid', 'egm08_window.npz')
        if os.path.exists(p):
            z = np.load(p)
            A, lon0, lat0, st = z['a'], float(z['lon0']), float(z['lat0']), float(z['st'])
        else:
            import rasterio
            from rasterio.windows import from_bounds
            with rasterio.open('https://cdn.proj.org/us_nga_egm08_25.tif') as src:
                win = from_bounds(10.2, 50.1, 11.4, 50.9, src.transform).round_offsets().round_lengths()
                A = src.read(1, window=win).astype(np.float64)
                t = src.window_transform(win)
            st = float(t.a)
            lon0, lat0 = float(t.c + t.a / 2), float(t.f + t.e / 2)       # first grid node (top-left), rows go south
            os.makedirs(os.path.dirname(p), exist_ok=True)
            np.savez(p, a=A, lon0=lon0, lat0=lat0, st=st)

        def N(lon, lat):
            c = (np.asarray(lon, float) - lon0) / st
            r = (lat0 - np.asarray(lat, float)) / st
            c0 = np.clip(np.floor(c).astype(int), 0, A.shape[1] - 2)
            r0 = np.clip(np.floor(r).astype(int), 0, A.shape[0] - 2)
            fc, fr = np.clip(c - c0, 0, 1), np.clip(r - r0, 0, 1)
            return (A[r0, c0] * (1 - fc) * (1 - fr) + A[r0, c0 + 1] * fc * (1 - fr) + A[r0 + 1, c0] * (1 - fc) * fr + A[r0 + 1, c0 + 1] * fc * fr)
        n0 = float(N(10.7692, 50.4991))
        if 40 < n0 < 55:
            return (lambda lon, lat, he: np.asarray(he, float) - N(lon, lat)), f'EGM2008 (Geoidhöhe am Garten {n0:.2f} m)'.replace('.', ',')
    except Exception as ex:
        log('EGM2008 nicht verfügbar:', repr(ex)[:160])
    return (lambda lon, lat, he: np.asarray(he) - 47.1), 'fester Wert 47,1 m (EGM2008 nicht erreichbar)'


def poly_ll(e0, n0, size):
    lons, lats = lonlat_from_utm([e0, e0 + size, e0 + size, e0, e0], [n0, n0, n0 + size, n0 + size, n0])
    return [{'lon': float(a), 'lat': float(b)} for a, b in zip(lons, lats)]


def _frame(df):
    """a GeoDataFrame of SlideRule -> dict of numpy columns with lon, lat"""
    out = {c: np.asarray(df[c]) for c in df.columns if c != 'geometry'}
    if 'geometry' in df.columns:
        out['lon'] = np.asarray(df.geometry.x)
        out['lat'] = np.asarray(df.geometry.y)
    return out


def sliderule_get(api, parms):
    import sliderule
    try:
        sliderule.init(verbose=False)
    except TypeError:
        sliderule.init()
    except Exception as ex:
        log('sliderule.init:', repr(ex)[:160])
    errs = []
    # (an empty answer is no answer: the client turns connection errors into empty frames)
    if hasattr(sliderule, 'run'):
        try:
            D = _frame(sliderule.run(api, parms))
            if len(D.get('lon', [])):
                return D, f'SlideRule {api}'
            errs.append(f'{api}: keine Punkte')
        except Exception as ex:
            errs.append(f'{api}: {ex!r}'[:200])
    if api.startswith('gedi'):
        try:
            from sliderule import gedi
            D = _frame(gedi.gedi02ap(parms))
            if len(D.get('lon', [])):
                return D, 'SlideRule gedi02ap'
            errs.append('gedi02ap: keine Punkte')
        except Exception as ex:
            errs.append(f'gedi02ap: {ex!r}'[:200])
    raise RuntimeError('; '.join(errs) or 'keine passende Funktion in sliderule')


def atl08_earthaccess(raw, bbox, max_granules=200):
    """ATL08 granules through earthaccess (Earthdata login), land segments inside bbox"""
    import earthaccess, h5py
    earthaccess.login(strategy='environment')
    res = earthaccess.search_data(short_name='ATL08', bounding_box=bbox, temporal=('2018-10-01', '2030-01-01'), count=2000)
    best = {}                                                      # one version per granule (ATL08_<time>_<track>_<version>_<rev>.h5)
    for r in res:
        try:
            ur = r['umm']['GranuleUR']
        except Exception:
            ur = str(r)
        k = '_'.join(ur.split('_')[:3])
        if k not in best or ur > best[k][0]:
            best[k] = (ur, r)
    res = [v[1] for _, v in sorted(best.items())][-max_granules:]
    import tempfile
    d = tempfile.mkdtemp(prefix='atl08-')                          # not into the raw cache: granules are large
    files = earthaccess.download(res, d)
    cols = {k: [] for k in ('lon', 'lat', 'h_te_median', 'h_te_uncertainty', 'h_canopy', 'night_flag', 'time')}
    for f in files:
        try:
            with h5py.File(f, 'r') as h:
                for gt in ('gt1l', 'gt1r', 'gt2l', 'gt2r', 'gt3l', 'gt3r'):
                    if gt not in h or 'land_segments' not in h[gt]:
                        continue
                    L = h[gt]['land_segments']
                    lat, lon = L['latitude'][:], L['longitude'][:]
                    m = (lon >= bbox[0]) & (lon <= bbox[2]) & (lat >= bbox[1]) & (lat <= bbox[3])
                    if not m.any():
                        continue
                    T = L['terrain']
                    hte = T['h_te_median'][:] if 'h_te_median' in T else T['h_te_best_fit'][:]
                    cols['lon'].append(lon[m]); cols['lat'].append(lat[m]); cols['h_te_median'].append(hte[m])
                    cols['h_te_uncertainty'].append(T['h_te_uncertainty'][:][m])
                    cols['h_canopy'].append(L['canopy']['h_canopy'][:][m])
                    cols['night_flag'].append(L['night_flag'][:][m])
                    cols['time'].append(np.full(int(m.sum()), os.path.basename(f)[6:14]))
        except Exception as ex:
            log('ATL08', os.path.basename(f), repr(ex)[:120])
    return {k: (np.concatenate(v) if v else np.array([])) for k, v in cols.items()}, f'earthaccess ({len(files)} Granulen)'


def satellites(raw, mos, cur_at, WCc, geoid):
    out, rows = {}, []
    poly = poly_ll(C_E0, C_N0, C_SIZE)
    lons, lats = [p['lon'] for p in poly], [p['lat'] for p in poly]
    bbox = (min(lons), min(lats), max(lons), max(lats))
    login = None
    try:
        import earthaccess
        a = earthaccess.login(strategy='environment')
        login = bool(getattr(a, 'authenticated', False))
    except Exception as ex:
        login = f'Fehler: {ex!r}'[:160]
    out['earthdata_login'] = login
    for key in ('atl08', 'gedi'):
        try:
            if key == 'atl08':
                D, how = atl08_earthaccess(raw, bbox)
            else:
                parts, notes = [], []
                tg0 = time.time()
                try:
                    import sliderule
                    sliderule.set_rqst_timeout((10, 300))   # the public cluster is often busy: no year may take longer than 5 min
                except Exception:
                    pass
                # (19.11.: 2019 gave 20 287 footprints in 8 min, 2021 8 932; busy years fail – enough once ~15 000 are there or after 25 min)
                for y0, y1 in ((2019, 2020), (2021, 2022), (2020, 2021), (2022, 2023), (2024, 2025), (2025, 2027)):
                    if sum(len(p['lon']) for p in parts) >= 15000 or time.time() - tg0 > 1500:
                        break
                    try:
                        Dp, how = sliderule_get('gedi02ax', {'poly': poly, 'degrade_filter': True, 'l2_quality_filter': True,
                                                             't0': f'{y0}-01-01T00:00:00Z', 't1': f'{y1}-01-01T00:00:00Z'})
                        parts.append(Dp)
                        notes.append(f'{y0}: {len(Dp["lon"])}')
                    except Exception as ex:
                        notes.append(f'{y0}: {str(ex)[:60]}')
                    log('GEDI', y0, notes[-1])
                if not parts:
                    raise RuntimeError('; '.join(notes))
                keys = set.intersection(*(set(p) for p in parts))
                D = {k: np.concatenate([p[k] for p in parts]) for k in keys}
                how = 'SlideRule gedi02ax je Jahr (' + ', '.join(notes) + ')'
            log(key, 'Spalten:', sorted(D)[:40])
            if key == 'atl08':
                he = next((D[c] for c in ('h_te_median', 'h_te_best_fit', 'h_te_mean') if c in D), None)
                if he is None:
                    raise RuntimeError(f'keine Geländehöhe in den Spalten {sorted(D)[:20]}')
                good = np.isfinite(he) & (he < 1e4)
                if 'h_te_uncertainty' in D:
                    good &= np.asarray(D['h_te_uncertainty'], float) < 5
            else:
                he = next((D[c] for c in ('elevation_lm', 'elev_lowestmode') if c in D), None)
                if he is None:
                    raise RuntimeError(f'keine Bodenhöhe in den Spalten {sorted(D)[:20]}')
                good = np.isfinite(he) & (he < 1e4)
                if 'sensitivity' in D:
                    good &= np.asarray(D['sensitivity'], float) >= 0.9
            lon, lat = np.asarray(D['lon'], float)[good], np.asarray(D['lat'], float)[good]
            h = geoid(lon, lat, np.asarray(he, float)[good]) - H0
            E, N = utm_from_lonlat(lon, lat)
            E, N = np.asarray(E), np.asarray(N)
            inC = (E >= C_E0) & (E <= C_E0 + C_SIZE) & (N >= C_N0) & (N <= C_N0 + C_SIZE)
            E, N, h, lon, lat = E[inC], N[inC], h[inC], lon[inC], lat[inC]
            g = mos.at(E, N)
            t = cur_at(E, N)
            cls = wc_at(WCc, E, N, C_E0, C_N0, C_SIZE)
            # slope from DGM1 where it is, else from today's ground (the satellites measure a footprint, not a point)
            res = {'quelle': how, 'punkte': int(h.size)}
            okg = np.isfinite(g)
            # robust: drop gross outliers (clouds, wrong ground) by |sat - reference| > 30 m
            sl = np.full(h.shape, np.nan)
            if okg.any():
                gy, gx = np.gradient(mos.G, STEP)
                sl = bilinear(np.degrees(np.arctan(np.hypot(gx, gy))).astype(np.float32), E, N, B_E0, B_N0, STEP)
            with np.errstate(invalid='ignore'):
                mb = okg & np.isfinite(t) & (np.abs(h - g) < 30) & (np.abs(h - t) < 30)    # the same points for DGM1 and today in block B
                mc = np.isfinite(t) & (np.abs(h - t) < 30)
            for ref, vals, m in (('dgm1', g, mb), ('heute_block', t, mb), ('heute', t, mc)):
                dd = h - vals
                res[ref] = {'alle': stats(dd[m]), 'wald': stats(dd[m & (cls == 10)]), 'offen': stats(dd[m & np.isin(cls, (30, 40))]),
                            'flach': stats(dd[m & (sl < 5)])}
            res['heute_minus_dgm1_an_den_punkten'] = stats((t - g)[okg])
            out[key] = res
            for i in range(h.size):
                rows.append({'quelle': key, 'lon': round(float(lon[i]), 6), 'lat': round(float(lat[i]), 6), 'sat': round(float(h[i]), 2),
                             'dgm1': (round(float(g[i]), 2) if np.isfinite(g[i]) else ''), 'heute': (round(float(t[i]), 2) if np.isfinite(t[i]) else ''),
                             'klasse': WC_NAMES.get(int(cls[i]), str(int(cls[i])))})
            log(f'{key}: {h.size} Punkte ({how}); im DGM1-Block {int(okg.sum())}')
        except Exception as ex:
            out[key] = {'fehler': repr(ex)[:400]}
            log(key, 'FEHLER', repr(ex)[:300])
    return out, rows


# ------------------------------------------------------------------ the difference image
def diff_png(D, path, lim=8.0):
    from PIL import Image
    d = D[::-2, ::2]                                               # 4 m, row 0 = north
    v = np.clip(np.nan_to_num(d, nan=0.0) / lim, -1, 1)
    r = np.where(v > 0, 1.0, 1.0 + v)
    b = np.where(v < 0, 1.0, 1.0 - v)
    g = 1.0 - np.abs(v)
    img = np.stack([r, g, b], -1)
    img[~np.isfinite(d)] = 0.55
    Image.fromarray((img * 255).astype(np.uint8)).save(path, optimize=True)


# ------------------------------------------------------------------ the report
def fmt(s, key='median'):
    if not s or not s.get('n'):
        return '–'
    return f"{s[key]:+.1f}".replace('.', ',')


def row(name, s, extra=''):
    if not s or not s.get('n'):
        return f'| {name} | – | – | – | – | – | – |{extra}'
    f = lambda v: f'{v:+.1f}'.replace('.', ',')
    g = lambda v: f'{v:.1f}'.replace('.', ',')
    return (f"| {name} | {f(s['median'])} | {f(s['mittel'])} | {f(s['p5'])} … {f(s['p95'])} | {g(s['rmse'])} | {g(s['ueber2m'])} % | "
            f"{g(s['ueber5m'])} % |{extra}")


HDR = '| Gebiet | Median (m) | Mittel (m) | 5 … 95 % (m) | RMSE (m) | > 2 m | > 5 m |\n|---|---|---|---|---|---|---|'


def report(R, out):
    L = []
    a = L.append
    a('# Geländeprüfung – Mängel-Tabelle (Block B um den Garten, 9,6 × 9,6 km)')
    a('')
    a(f"Lauf {R.get('lauf', 'lokal')} vom {R['datum']} · Werkzeug `tools/gelaende/pruefung.py` · Abweichung = **heutiges Gelände der App − DGM1** "
      '(positiv: der Boden der App liegt zu hoch). DGM1 Thüringen 1 m © GDI-Th (CC BY 4.0), bezogen über easygeodata.de.')
    a('')
    dg = R.get('dgm1', {})
    a(f"**DGM1:** {dg.get('present', 0)} von {dg.get('wanted', 0)} Kacheln (km²) da, Anteil am Block {dg.get('anteil', 0):.1f} %"
      + (f", Befliegung {dg['data_stand']}" if dg.get('data_stand') else '') + (f" – gestoppt: {dg['stopped']}" if dg.get('stopped') else '') + '.')
    a('')
    if 'flaeche' in R:
        a('## 1. Heutiger Boden gegen DGM1, nach Bodenbedeckung (ESA WorldCover 2021, 2-m-Raster)')
        a('')
        a(HDR)
        a(row('**ganzer Block**', R['flaeche']['alle']))
        for k, s in R['flaeche']['klassen'].items():
            a(row(k, s))
        a('')
        a('### nach Hangneigung (aus DGM1)')
        a('')
        a(HDR)
        for k, s in R['flaeche']['hang'].items():
            a(row(k, s))
        a('')
    if 'quadrat' in R:
        a('## 2. Ratschers 2,4-km-Quadrat (eigenes 10-m-Gelände der App, ohne die flache Mitte von ± 330 m) gegen DGM1')
        a('')
        a(HDR)
        a(row('Quadrat', R['quadrat']))
        a('')
    if 'strassen' in R and 'fehler' not in R['strassen']:
        S = R['strassen']
        a('## 3. Straßen: das Längsprofil der Fahrt (`fahrt/strassen.json`) gegen DGM1')
        a('')
        a('Profil = die Höhe, auf der das Auto fährt (aus dem heutigen Gelände geglättet). Brücken und Tunnel ausgenommen.')
        a('')
        a('| Klasse | km | Profil − DGM1: Median | 5 … 95 % | RMSE | > 2 m | Gelände − DGM1: Median |')
        a('|---|---|---|---|---|---|---|')
        f = lambda v: f'{v:+.1f}'.replace('.', ',')
        g1 = lambda v: f'{v:.1f}'.replace('.', ',')
        for kn, b in sorted(S['je_klasse'].items(), key=lambda kv: -kv[1]['km']):
            s = b['strasse']
            if not s.get('n'):
                continue
            a(f"| {KIND_DE.get(kn, kn)} | {g1(b['km'])} | {f(s['median'])} | {f(s['p5'])} … {f(s['p95'])} | {g1(s['rmse'])} | {s['ueber2m']:.0f} % | "
              f"{fmt(b['gelaende'])} |")
        a('')
        a('### die 15 größten Abweichungen (200-m-Abschnitt)')
        a('')
        a('| Straße | Klasse | Ort | Profil − DGM1 (Mittel) | größte | Gelände − DGM1 |')
        a('|---|---|---|---|---|---|')
        for r in R.get('strassen_rows', [])[:15]:
            gl = r['heute_gelaende_m']
            a(f"| {r['strasse']} | {r['klasse']} | {r['ort']} | {f(r['abw_m'])} m | {f(r['max_m'])} m | "
              f"{f(gl) + ' m' if isinstance(gl, float) and math.isfinite(gl) else '–'} |")
        a('')
    if 'gipfel' in R and isinstance(R['gipfel'], dict) and 'rows' in R['gipfel']:
        a('## 4. Gipfel mit amtlicher Höhe (Wikidata) – höchster Punkt im Umkreis')
        a('')
        a('| Gipfel | amtlich (m NHN) | DGM1 (30 m) | heute (60 m) | heute − amtlich | DGM1 − amtlich |')
        a('|---|---|---|---|---|---|')
        for r in R['gipfel']['rows'][:40]:
            f = lambda v: (f'{v:+.1f}'.replace('.', ',') if isinstance(v, (int, float)) and math.isfinite(v) else '–')
            h = lambda v: (f'{v:.1f}'.replace('.', ',') if isinstance(v, (int, float)) and math.isfinite(v) else '–')
            a(f"| {r['name']} | {h(r['ele'])} | {h(r['dgm1'])} | {h(r['heute'])} | {f(r['heute'] - r['ele'])} | {f(r['dgm1'] - r['ele'])} |")
        s1, s2 = R['gipfel'].get('heute_minus_amtlich', {}), R['gipfel'].get('dgm1_minus_amtlich', {})
        a('')
        a(f"Im Mittel: heute {fmt(s1, 'mittel')} m ({s1.get('n', 0)} Gipfel), DGM1 {fmt(s2, 'mittel')} m ({s2.get('n', 0)} Gipfel im Block).")
        a('')
    if 'satelliten' in R:
        a('## 5. Messpunkte aus dem All (Kontextquadrat 25,6 km): Satellit − Gelände')
        a('')
        Sx = R['satelliten']
        a(f"Earthdata-Anmeldung: {Sx.get('earthdata_login')}; Höhenbezug {R.get('geoid', '')}. Ausreißer über 30 m (Wolken, falscher Boden) "
          'nicht gezählt. Negativ = das Gelände liegt höher als der Satellit misst.')
        a('')
        a('| Quelle | Punkte | gegen | alle: Median | RMSE | Wald: Median | RMSE | offen: Median | RMSE | flach (< 5°): Median | RMSE |')
        a('|---|---|---|---|---|---|---|---|---|---|---|')
        for key, nm in (('atl08', 'ICESat-2 ATL08'), ('gedi', 'GEDI L2A')):
            s = Sx.get(key, {})
            if 'fehler' in s:
                a(f"| {nm} | – | – | Fehler: {s['fehler'][:160]} | | | | | | | |")
                continue
            for ref, rn in (('dgm1', 'DGM1 (Block B)'), ('heute_block', 'heute (dieselben Punkte)'), ('heute', 'heute (ganzes Quadrat)')):
                q = s.get(ref, {})
                rr = lambda z: (f"{fmt(z)} | {str(z.get('rmse', '–')).replace('.', ',')}" if z and z.get('n') else '– | –')
                n = (q.get('alle') or {}).get('n', 0)
                a(f"| {nm} | {n} | {rn} | {rr(q.get('alle'))} | {rr(q.get('wald'))} | {rr(q.get('offen'))} | {rr(q.get('flach'))} |")
        a('')
        a(f"Quellen: ATL08 {Sx.get('atl08', {}).get('quelle', '–')}; GEDI {Sx.get('gedi', {}).get('quelle', '–')}. "
          'ATL08 misst je 100-m-Abschnitt (Median der Bodenphotonen), GEDI je 25-m-Fleck – am Hang streut das gegen einen Punkt des '
          'Rasters; die Spalte „flach“ zeigt den Höhenbezug am klarsten.')
        a('')
    a('## Was daraus folgt')
    a('')
    for t in R.get('folgen', []):
        a(f'- {t}')
    a('')
    if R.get('fehler'):
        a('## Fehler in diesem Lauf')
        a('')
        for k, v in R['fehler'].items():
            a(f'- {k}: `{v[:300]}`')
    open(os.path.join(out, 'maengel.md'), 'w').write('\n'.join(L) + '\n')


def conclusions(R):
    F = []
    fl = R.get('flaeche', {})
    w = fl.get('klassen', {}).get('Wald', {})
    o = fl.get('alle', {})
    if w.get('n'):
        F.append(f"Unter Wald liegt der heutige Boden im Median {fmt(w)} m neben DGM1 (95 % zwischen {fmt(w, 'p5')} und {fmt(w, 'p95')} m) – "
                 'dort sinken Wege, Bäume und Häuser mit DGM1 auf den echten Boden.')
    if o.get('n'):
        F.append(f"Über den ganzen Block: Median {fmt(o)} m, RMSE {str(o['rmse']).replace('.', ',')} m, {str(o['ueber2m']).replace('.', ',')} % "
                 'der Fläche über 2 m daneben.')
    s = R.get('strassen', {}).get('alle', {}).get('strasse', {})
    if s.get('n'):
        F.append(f"Straßenprofile: Median {fmt(s)} m, {str(s['ueber2m']).replace('.', ',')} % der Punkte über 2 m neben DGM1 – beim Umstieg "
                 'auf DGM1 die Profile neu rechnen (`viz3/extra/fahrt/strecke.py` liest dann die neuen Kacheln), sonst stehen die Straßen '
                 'in Einschnitten oder auf Dämmen.')
    q = R.get('quadrat', {})
    if q.get('n'):
        F.append(f"Ratschers Quadrat (10 m aus DGM1): Median {fmt(q)} m, RMSE {str(q['rmse']).replace('.', ',')} m – "
                 + ('passt; der Übergang zum Weltgelände wird mit DGM1 glatter.' if q['rmse'] < 1.5 else 'auffällig, prüfen.'))
    return F


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', default=os.path.expanduser('~/gel-raw'))
    ap.add_argument('--out', default='out/gelaende')
    ap.add_argument('--egd', default='ext/suhl/tools/suhl/lib', help='folder of easygeodata.py (tools/suhl/lib of suhl/daten)')
    ap.add_argument('--max-mb', type=float, default=900.0)
    ap.add_argument('--no-sat', action='store_true')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    os.makedirs(a.raw, exist_ok=True)
    R = {'datum': time.strftime('%d.%m.%Y %H:%M UTC', time.gmtime()), 'lauf': os.environ.get('GITHUB_RUN_ID', 'lokal'), 'fehler': {}}

    def part(name, fn):
        try:
            return fn()
        except Exception as ex:
            R['fehler'][name] = repr(ex)
            log(name, 'FEHLER', repr(ex)[:300])
            traceback.print_exc()
            return None

    # 1. DGM1
    got = part('dgm1_holen', lambda: fetch_dgm1(a.raw, a.egd, a.max_mb))
    rep, read_tile = got if got else ({}, None)
    if read_tile is None:
        sys.path.insert(0, os.path.join(REPO, 'tools', 'welt'))
        from fetch import read_dgm1 as read_tile
    mos = Mosaic(a.raw, read_tile)
    R['dgm1'] = {k: rep.get(k) for k in ('wanted', 'present', 'fetched', 'cached', 'bytes', 'missing', 'failed', 'stopped', 'data_stand')}
    R['dgm1'].update({'gelesen': len(mos.ok), 'unlesbar': mos.bad[:10], 'anteil': round(mos.share * 100, 1)})

    # 2. today's ground
    C11 = part('welt11', lambda: fetch_level(11, 1000, 1047, 1000, 1047, 101, B_E0, B_N0, STEP))
    C7 = part('welt7', lambda: fetch_level(7, 60, 67, 60, 67, 101, C_E0, C_N0, C_STEP))
    Cb = C11[0] if C11 else np.full((NB, NB), np.nan, np.float32)
    Cc = C7[0] if C7 else np.full((NC, NC), np.nan, np.float32)

    def cur_at(E, N):
        v = bilinear(Cb, E, N, B_E0, B_N0, STEP)
        return np.where(np.isfinite(v), v, bilinear(Cc, E, N, C_E0, C_N0, C_STEP))

    WCc = part('worldcover', lambda: worldcover(a.raw, C_E0, C_N0, C_SIZE))
    if WCc is None:
        WCc = np.zeros((int(C_SIZE / 10), int(C_SIZE / 10)), np.uint8)

    # 3. area comparison in block B
    def area():
        D = Cb - mos.G
        jj, ii = np.mgrid[0:NB, 0:NB]
        E, N = B_E0 + ii * STEP, B_N0 + jj * STEP
        cls = wc_at(WCc, E, N, C_E0, C_N0, C_SIZE)
        gy, gx = np.gradient(mos.G, STEP)
        slope = np.degrees(np.arctan(np.hypot(gx, gy)))
        ok = np.isfinite(D) & (cls != 80)
        res = {'alle': stats(D[ok]), 'klassen': {}, 'hang': {}}
        for nm, cc in GROUPS:
            res['klassen'][nm] = stats(D[ok & np.isin(cls, cc)])
        for nm, lo, hi in (('flach (unter 5°)', 0, 5), ('mäßig (5–15°)', 5, 15), ('steil (15–30°)', 15, 30), ('sehr steil (über 30°)', 30, 90)):
            res['hang'][nm] = stats(D[ok & (slope >= lo) & (slope < hi)])
        diff_png(D, os.path.join(a.out, 'diff_b.png'))
        return res
    if mos.ok and C11:
        R['flaeche'] = part('flaeche', area)

    # the square
    def square():
        X, Y, Z, src = inner_square()
        E, N = utm_from_model(X, Y)
        # the model's own ground is flat within +-120 m of the garden and fades into the real heights up to 330 m (tools/geo/common.py
        # flat_k): only beyond that the square shows the terrain
        far = np.maximum(np.abs(X), np.abs(Y)) >= 330
        return stats((Z - mos.at(E, N))[far])
    if mos.ok:
        R['quadrat'] = part('quadrat', square)

    places = Places()
    if mos.ok:
        got = part('strassen', lambda: roads(mos, cur_at, places))
        if got:
            R['strassen'], R['strassen_rows'] = got
            with open(os.path.join(a.out, 'strassen.csv'), 'w', newline='') as f:
                w = csv.DictWriter(f, fieldnames=list(got[1][0].keys()) if got[1] else ['strasse'])
                w.writeheader()
                w.writerows(got[1])

    # 4. summits
    def summits():
        lons, lats = lonlat_from_utm([C_E0, C_E0 + C_SIZE], [C_N0, C_N0 + C_SIZE])
        P = peaks(min(lons), min(lats), max(lons), max(lats))
        rows = []
        for p in P:
            E, N = utm_from_lonlat(p['lon'], p['lat'])
            if not (C_E0 <= E <= C_E0 + C_SIZE and C_N0 <= N <= C_N0 + C_SIZE):
                continue
            dg = mos.max_within(E, N, 30.0) + H0
            # today: highest of the grid points within 60 m
            rr = np.linspace(-60, 60, 25)
            XX, YY = np.meshgrid(rr, rr)
            m = XX ** 2 + YY ** 2 <= 3600
            tv = cur_at(E + XX[m], N + YY[m])
            hv = float(np.nanmax(tv)) + H0 if np.isfinite(tv).any() else float('nan')
            rows.append({'name': p['name'], 'qid': p['qid'], 'ele': p['ele'], 'dgm1': dg, 'heute': hv, 'E': round(E), 'N': round(N)})
        rows.sort(key=lambda r: -r['ele'])
        with open(os.path.join(a.out, 'gipfel.csv'), 'w', newline='') as f:
            w = csv.DictWriter(f, fieldnames=['name', 'qid', 'ele', 'dgm1', 'heute', 'E', 'N'])
            w.writeheader()
            w.writerows(rows)
        return {'rows': rows, 'heute_minus_amtlich': stats([r['heute'] - r['ele'] for r in rows]),
                'dgm1_minus_amtlich': stats([r['dgm1'] - r['ele'] for r in rows])}
    R['gipfel'] = part('gipfel', summits)

    # 5. satellites
    if not a.no_sat:
        geoid, note = geoid_fn(a.raw)
        R['geoid'] = note
        got = part('satelliten', lambda: satellites(a.raw, mos, cur_at, WCc, geoid))
        if got:
            R['satelliten'], rows = got
            with open(os.path.join(a.out, 'satelliten.csv'), 'w', newline='') as f:
                w = csv.DictWriter(f, fieldnames=['quelle', 'lon', 'lat', 'sat', 'dgm1', 'heute', 'klasse'])
                w.writeheader()
                w.writerows(rows)

    R['folgen'] = conclusions(R)
    js = {k: v for k, v in R.items() if k != 'strassen_rows'}
    js['strassen_top'] = R.get('strassen_rows', [])[:40]
    if isinstance(js.get('gipfel'), dict):
        js['gipfel'] = {k: v for k, v in js['gipfel'].items()}
    json.dump(js, open(os.path.join(a.out, 'pruefung.json'), 'w'), ensure_ascii=False, indent=1, default=float)
    report(R, a.out)
    log('fertig:', os.path.join(a.out, 'maengel.md'))


if __name__ == '__main__':
    main()
