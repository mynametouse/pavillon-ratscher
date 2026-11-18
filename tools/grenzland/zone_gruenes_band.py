#!/usr/bin/env python3
"""feat/grenzland-zone: the data of the border zone at the Grünes Band south of Eisfeld (Grenzland, Kapitel 2, Etappe 2).

The zone lies ~13 km south-east of the garden, beyond every tile set and beyond the 120 m terrain of world/ratscher.js. This script
builds what the zone needs, small, into viz3/extra/grenzland-zone/dist/grenzland-zone/ (copied into viz3/dist by build.py):

  welt/                  a tile set in the format of tools/welt (welt/welt.js draws it: WELT.addSet with its own base, hook W1)
    meta.json            levels 10 and 11 over the zone's rectangle, level 12 only along the Kolonnenweg, the museum and the heath
                         (`has` lists, hook W2)
    t/L/x/y.bin          terrain (WTH1, 101 x 101 heights, cm relative to H0)
    i/L/x/y.webp         orthophoto, 512 px
  zone.json              the zone in model metres: the Kolonnenweg (its centre line, smoothed profile), the old border, roads and
                         tracks, places, the land cover (heath, open strip, forest) as a small grid, trees at the forest edges

Sources (all open):
  terrain  DGM1 Bayern (1 m, bare earth; the border tiles reach a few hundred metres into Thuringia), © Bayerische
           Vermessungsverwaltung, CC BY 4.0 – https://geodaten.bayern.de/opengeodata/ ; where it ends: Copernicus DEM GLO-30
           (a surface model: the forest's crowns lowered by the land cover, then fitted to the DGM1 at its edge)
  imagery  DOP Thüringen (WMS th_dop, © GDI-Th, CC BY 4.0) and DOP20 Bayern (WMS by_dop20c, © Bayerische Vermessungsverwaltung,
           CC BY 4.0) – the Thuringian photo is white beyond the border, the Bavarian one beyond its buffer: joined with a fitted colour
  OSM      © OpenStreetMap contributors, ODbL 1.0 (OSM API map call)

  python3 tools/grenzland/zone_gruenes_band.py [fetch|terrain|image|tiles|zone|all] [--raw DIR]
Raw downloads go to --raw (default ~/.cache/pavillon-zone), never into the repo.
"""
import io, json, math, os, sys, time, zlib
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(REPO, 'tools', 'welt'))
from wlib import ROOT_E0, ROOT_N0, tsize, tbounds, model_from_utm, XF, H0, log  # noqa: E402
from tiles import encode_heights  # noqa: E402

OUT = os.path.join(REPO, 'viz3', 'extra', 'grenzland-zone', 'dist', 'grenzland-zone')
RAW = os.path.expanduser('~/.cache/pavillon-zone')
UA = 'PavillonRatscher-Zone/0.1 (open geodata, non-commercial game)'

# the zone's rectangle (UTM 32N), aligned to the level-10 grid (400 m): from the old crossing point at the Coburger Straße (K 530)
# east along the Kolonnenweg to where it turns south-east through the Görsdorfer Heide
L10 = (539, 481, 545, 483)                       # level-10 tile range x0, y0, x1, y1 (7 x 3 tiles)
ZONE = (ROOT_E0 + L10[0] * 400, ROOT_N0 + L10[1] * 400, ROOT_E0 + (L10[2] + 1) * 400, ROOT_N0 + (L10[3] + 1) * 400)
MARGIN = 60.0                                    # the terrain grid reaches this far beyond (smoothing, tile edges)
GRID = 1.0                                       # m per terrain sample
CORRIDOR = 55.0                                  # level 12 within this distance of the Kolonnenweg and the other places
OSM_BB = (10.900, 50.376, 10.968, 50.404)        # lon0, lat0, lon1, lat1 (the zone with a margin)
WMS_TH = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP'
WMS_BY = 'https://geoservices.bayern.de/od/wms/dop/v1/dop20'
DGM_BY = 'https://download1.bayernwolke.de/a/dgm/dgm1/{e}_{n}.tif'
COP = 'https://copernicus-dem-30m.s3.amazonaws.com/{n}/{n}.tif'


def http(url, timeout=180, tries=3):
    import requests
    last = None
    for k in range(tries):
        try:
            r = requests.get(url, timeout=timeout, headers={'User-Agent': UA})
            if r.status_code in (429, 502, 503, 504):
                last = f'HTTP {r.status_code}'
                time.sleep(4 + 8 * k)
                continue
            return r.status_code, r.content, r.headers.get('content-type', '')
        except Exception as e:
            last = repr(e)
            time.sleep(3 + 6 * k)
    raise RuntimeError(f'GET failed {url[:140]}: {last}')


def cached(path, url, ok=lambda st, b, ct: st == 200, timeout=180):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return open(path, 'rb').read()
    st, b, ct = http(url, timeout)
    if not ok(st, b, ct):
        open(path + '.missing', 'w').write(f'{st} {ct}\n')
        return None
    os.makedirs(os.path.dirname(path), exist_ok=True)
    open(path, 'wb').write(b)
    return b


# ---------------------------------------------------------------- fetch ----------------------------------------------------------------
def fetch_osm():
    p = os.path.join(RAW, 'osm', 'zone.osm')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    bb = ','.join(f'{v:.4f}' for v in OSM_BB)
    b = cached(p, f'https://api.openstreetmap.org/api/0.6/map?bbox={bb}', timeout=300)
    log('OSM', len(b) if b else 0, 'bytes')
    return p


def dgm_tiles():
    """the 1 km DGM1 tiles of Bavaria over the grid (they exist where a tile touches Bavaria)"""
    e0, n0 = int((ZONE[0] - MARGIN) // 1000), int((ZONE[1] - MARGIN) // 1000)
    e1, n1 = int((ZONE[2] + MARGIN) // 1000), int((ZONE[3] + MARGIN) // 1000)
    return [(e, n) for e in range(e0, e1 + 1) for n in range(n0, n1 + 1)]


def fetch_dgm():
    os.makedirs(os.path.join(RAW, 'dgm1'), exist_ok=True)
    have = []
    for e, n in dgm_tiles():
        p = os.path.join(RAW, 'dgm1', f'{e}_{n}.tif')
        if os.path.exists(p + '.missing'):
            continue
        b = cached(p, DGM_BY.format(e=e, n=n), ok=lambda st, b, ct: st == 200 and b[:2] in (b'II', b'MM'), timeout=300)
        log('DGM1 Bayern', e, n, len(b) if b else 'fehlt')
        if b:
            have.append((e, n))
    return have


def fetch_cop():
    name = 'Copernicus_DSM_COG_10_N50_00_E010_00_DEM'
    p = os.path.join(RAW, 'cop30', name + '.tif')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    b = cached(p, COP.format(n=name), ok=lambda st, b, ct: st == 200 and b[:2] in (b'II', b'MM'), timeout=600)
    log('Copernicus', len(b) if b else 'fehlt')
    return p


def wms(base, layer, bbox, w, h, sub):
    e0, n0, e1, n1 = bbox
    p = os.path.join(RAW, sub, f'{layer}_{w}x{h}_{e0:.0f}_{n0:.0f}_{e1:.0f}_{n1:.0f}.jpg')
    url = (f'{base}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS={layer}&STYLES=&CRS=EPSG:25832'
           f'&BBOX={e0:.2f},{n0:.2f},{e1:.2f},{n1:.2f}&WIDTH={w}&HEIGHT={h}&FORMAT=image/jpeg')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    b = cached(p, url, ok=lambda st, b, ct: st == 200 and ct.startswith('image/'), timeout=300)
    if b is None:
        raise RuntimeError(f'WMS {layer} {bbox}: kein Bild')
    from PIL import Image
    return np.asarray(Image.open(io.BytesIO(b)).convert('RGB'))


# ---------------------------------------------------------------- terrain ----------------------------------------------------------------
def read_tif(p):
    import tifffile
    with tifffile.TiffFile(p) as t:
        pg = t.pages[0]
        a = pg.asarray().astype(np.float32)
        tp = pg.tags[33922].value
        sc = pg.tags[33550].value
    a[a < -1000] = np.nan
    return a, float(tp[3]), float(tp[4]), float(sc[0])


def grid_frame():
    E0, N0 = ZONE[0] - MARGIN, ZONE[1] - MARGIN
    nx = int(round((ZONE[2] - ZONE[0] + 2 * MARGIN) / GRID)) + 1
    ny = int(round((ZONE[3] - ZONE[1] + 2 * MARGIN) / GRID)) + 1
    return E0, N0, nx, ny          # sample (i, j) at (E0 + i, N0 + j), j north


def cop_heights(E, N):
    """Copernicus GLO-30 bilinear at UTM points (EGM2008 ~ NHN here within decimetres)"""
    import tifffile
    from pyproj import Transformer
    p = os.path.join(RAW, 'cop30', 'Copernicus_DSM_COG_10_N50_00_E010_00_DEM.tif')
    with tifffile.TiffFile(p) as t:
        a = t.pages[0].asarray().astype(np.float32)
    toLL = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
    lon, lat = toLL.transform(E, N)
    lon, lat = np.asarray(lon), np.asarray(lat)
    nr, nc = a.shape
    c = (lon - 10) * nc - 0.5
    r = (51 - lat) * nr - 0.5
    c0 = np.clip(np.floor(c).astype(int), 0, nc - 2)
    r0 = np.clip(np.floor(r).astype(int), 0, nr - 2)
    fc, fr = np.clip(c - c0, 0, 1), np.clip(r - r0, 0, 1)
    return (a[r0, c0] * (1 - fc) * (1 - fr) + a[r0, c0 + 1] * fc * (1 - fr) + a[r0 + 1, c0] * (1 - fc) * fr +
            a[r0 + 1, c0 + 1] * fc * fr)


def box_blur(a, r):
    """mean over a (2r+1)² box (separable, edges clamped)"""
    if r <= 0:
        return a.copy()
    k = 2 * r + 1
    p = np.pad(a, r, mode='edge').astype(np.float64)
    c = np.cumsum(p, axis=0)
    c = np.vstack([np.zeros((1, c.shape[1])), c])
    p = (c[k:] - c[:-k]) / k
    c = np.cumsum(p, axis=1)
    c = np.hstack([np.zeros((c.shape[0], 1)), c])
    return ((c[:, k:] - c[:, :-k]) / k).astype(np.float32)


def build_terrain(forest=None):
    """the 1 m height grid over the zone: DGM1 Bayern where it is, Copernicus with lowered crowns elsewhere, joined without a step"""
    E0, N0, nx, ny = grid_frame()
    H = np.full((ny, nx), np.nan, np.float32)      # row j = north index (j = 0 south)
    for e, n in dgm_tiles():
        p = os.path.join(RAW, 'dgm1', f'{e}_{n}.tif')
        if not os.path.exists(p):
            continue
        a, el, nt, px = read_tif(p)                # row 0 = north edge; pixel areas (corner tie point)
        rows, cols = a.shape
        # cell centres of the tile: E = el + (c + 0.5) px, N = nt - (r + 0.5) px  -> our samples sit on whole metres + 0 (E0 integer)
        for_r = np.arange(rows)
        Nc = nt - (for_r + 0.5) * px
        Ec = el + (np.arange(cols) + 0.5) * px
        jj = np.round((Nc - 0.5 - N0) / GRID).astype(int)
        ii = np.round((Ec - 0.5 - E0) / GRID).astype(int)
        mr = (jj >= 0) & (jj < ny)
        mc = (ii >= 0) & (ii < nx)
        if not mr.any() or not mc.any():
            continue
        sub = a[np.ix_(for_r[mr], np.arange(cols)[mc])]
        tgt = H[np.ix_(jj[mr], ii[mc])]
        H[np.ix_(jj[mr], ii[mc])] = np.where(np.isnan(sub), tgt, sub)
    have = ~np.isnan(H)
    log(f'DGM1: {have.mean() * 100:.1f} % des Rasters')
    if have.all():
        return H, have
    # Copernicus on a 4 m lattice, crowns lowered where the land cover says forest
    st = 4
    js, is_ = np.arange(0, ny, st), np.arange(0, nx, st)
    EE, NN = np.meshgrid(E0 + is_ * GRID, N0 + js * GRID)
    C = cop_heights(EE.ravel(), NN.ravel()).reshape(EE.shape).astype(np.float32)
    if forest is not None:
        f = forest[np.ix_(js, is_)].astype(np.float32)
        for _ in range(3):
            f = box_blur(f, 3)
        C -= 17.0 * f                              # spruce and pine stands here: crowns ~15–25 m (the CHM of world/ratscher.js)
    C = upsample(C, st, ny, nx)
    for _ in range(3):
        C = box_blur(C, 5)                         # a 30 m product: no facets of its cells, no edges of the boxes in the light
    # the offset between the two where both are (DGM1 against the lowered surface), spread out from the DGM1's edge
    d = np.where(have, H - C, np.nan)
    off = fill_smooth(d, 50)
    Hc = C + off
    # a soft seam: 30 m blend into the DGM1 from its edge
    dist = edge_distance(have)
    w = np.clip(dist / 30.0, 0, 1)
    H = np.where(have, w * H + (1 - w) * Hc, Hc).astype(np.float32)
    return H, have


def upsample(a, st, ny, nx):
    """bilinear from a lattice of step st (samples at 0, st, 2 st …) to ny x nx"""
    j = np.arange(ny) / st
    i = np.arange(nx) / st
    j0 = np.clip(np.floor(j).astype(int), 0, a.shape[0] - 2)
    i0 = np.clip(np.floor(i).astype(int), 0, a.shape[1] - 2)
    fj = np.clip(j - j0, 0, 1)[:, None]
    fi = np.clip(i - i0, 0, 1)[None, :]
    a00 = a[np.ix_(j0, i0)]
    a01 = a[np.ix_(j0, i0 + 1)]
    a10 = a[np.ix_(j0 + 1, i0)]
    a11 = a[np.ix_(j0 + 1, i0 + 1)]
    return (a00 * (1 - fi) * (1 - fj) + a01 * fi * (1 - fj) + a10 * (1 - fi) * fj + a11 * fi * fj).astype(np.float32)


def fill_smooth(d, r):
    """a smooth field from the known values of d (NaN elsewhere): a normalised convolution with a near-Gaussian kernel (three box
    blurs of radius r); far from every known value it tends to their median"""
    known = ~np.isnan(d)
    med = float(np.nanmedian(d)) if known.any() else 0.0
    num = np.where(known, d - med, 0).astype(np.float32)
    w = known.astype(np.float32)
    for _ in range(3):
        num = box_blur(num, r)
        w = box_blur(w, r)
    return (med + num / (w + 0.02)).astype(np.float32)


def edge_distance(mask):
    """metres from the edge of mask, inside it (0 outside) – a cheap chamfer by repeated erosion, capped at 64"""
    dist = np.zeros(mask.shape, np.float32)
    cur = mask.copy()
    for k in range(1, 65):
        e = cur.copy()
        e[1:, :] &= cur[:-1, :]
        e[:-1, :] &= cur[1:, :]
        e[:, 1:] &= cur[:, :-1]
        e[:, :-1] &= cur[:, 1:]
        dist[cur & ~e] = k
        cur = e
        if not cur.any():
            break
    dist[cur] = 64
    return dist


def height_at(H, E, N):
    E0, N0, nx, ny = grid_frame()
    fi = (np.asarray(E) - E0) / GRID
    fj = (np.asarray(N) - N0) / GRID
    i0 = np.clip(np.floor(fi).astype(int), 0, nx - 2)
    j0 = np.clip(np.floor(fj).astype(int), 0, ny - 2)
    u, v = np.clip(fi - i0, 0, 1), np.clip(fj - j0, 0, 1)
    return (H[j0, i0] * (1 - u) * (1 - v) + H[j0, i0 + 1] * u * (1 - v) + H[j0 + 1, i0] * (1 - u) * v + H[j0 + 1, i0 + 1] * u * v)


# ---------------------------------------------------------------- imagery ----------------------------------------------------------------
def join_photos(th, by):
    """the Thuringian photo (white beyond the border) and the Bavarian one (white beyond its buffer) as one: the Bavarian colours fitted
    to the Thuringian ones where both show the land, a soft edge where the Thuringian ends"""
    th = th.astype(np.float32)
    by = by.astype(np.float32)
    vt = ~(th.min(axis=2) > 247)
    vb = ~(by.min(axis=2) > 247)
    both = vt & vb
    if both.sum() > 2000:
        idx = np.flatnonzero(both.ravel())
        idx = idx[:: max(1, len(idx) // 200000)]
        for c in range(3):
            x = by[..., c].ravel()[idx]
            y = th[..., c].ravel()[idx]
            # quantile matching (robust against the different seasons): 32 quantiles, a piecewise linear map
            qs = np.linspace(0.01, 0.99, 33)
            qx, qy = np.quantile(x, qs), np.quantile(y, qs)
            qx = np.maximum.accumulate(qx + np.arange(33) * 1e-3)
            by[..., c] = np.interp(by[..., c], qx, qy)
    w = box_blur(vt.astype(np.float32), 6)
    w = np.where(vt, w, 0)
    w = np.where(vb, w, np.where(vt, 1, 0))
    out = th * w[..., None] + by * (1 - w[..., None])
    none = ~vt & ~vb
    out[none] = (118, 124, 96)
    return np.clip(out, 0, 255).astype(np.uint8)


def mosaic(L, area=None, chunk=None):
    """the joined photo of level L over an area (default the zone) – rows from the north; requests of chunk metres"""
    from concurrent.futures import ThreadPoolExecutor
    area = area or ZONE
    px = tsize(L) / 512
    chunk = chunk or (800.0 if L <= 11 else 400.0)
    W = int(round((area[2] - area[0]) / px))
    Hh = int(round((area[3] - area[1]) / px))
    img = np.zeros((Hh, W, 3), np.uint8)
    n = int(round(chunk / px))
    jobs = []
    for ce in np.arange(area[0], area[2], chunk):
        for cn in np.arange(area[1], area[3], chunk):
            jobs.append((ce, cn))

    def one(job):
        ce, cn = job
        bb = (ce, cn, ce + chunk, cn + chunk)
        th = wms(WMS_TH, 'th_dop', bb, n, n, f'dop{L}')
        by = wms(WMS_BY, 'by_dop20c', bb, n, n, f'dop{L}')
        return job, join_photos(th, by)
    with ThreadPoolExecutor(3) as ex:
        for (ce, cn), a in ex.map(one, jobs):
            c0 = int(round((ce - area[0]) / px))
            r0 = int(round((area[3] - (cn + chunk)) / px))
            rs, cs = max(0, r0), max(0, c0)
            re_, ce_ = min(Hh, r0 + n), min(W, c0 + n)
            if re_ > rs and ce_ > cs:
                img[rs:re_, cs:ce_] = a[rs - r0:re_ - r0, cs - c0:ce_ - c0]
    log(f'Luftbild Stufe {L}: {W} x {Hh} px')
    return img


def land_cover(img, px):
    """classes on a 1 m grid over the zone from the photo (May 2024/2025): 0 open land (grass, fields), 1 conifers (spruce, pine:
    dark, rough, blue-green), 2 heath (Calluna: neutral grey-brown, smooth), 3 bare (sand, tracks, roads, roofs: bright, warm),
    4 broadleaves and young growth (birch, aspen: light green, rough). Measured on the zone's photo: conifers r-b -0.055, g-r +0.06,
    texture 0.05; heather r-b -0.01, g-r +0.015, texture 0.03; meadow g-r +0.09, texture 0.02; sand r-b +0.03, luminance 0.38."""
    from PIL import Image
    a = img.astype(np.float32) / 255.0
    lum = 0.3 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]
    m1 = box_blur(lum, 3)
    m2 = box_blur(lum * lum, 3)
    tex = np.sqrt(np.maximum(m2 - m1 * m1, 0))
    W = int(round(img.shape[1] * px))
    Hh = int(round(img.shape[0] * px))
    down = lambda q: np.asarray(Image.fromarray(q.astype(np.float32)).resize((W, Hh), Image.BOX))
    L = box_blur(down(lum), 1)
    T = box_blur(down(tex), 1)
    RB = box_blur(down(a[..., 0] - a[..., 2]), 2)
    GR = box_blur(down(a[..., 1] - a[..., 0]), 2)
    cls = np.zeros(L.shape, np.uint8)
    conifer = (RB < -0.032) & (GR > 0.03) & (GR < 0.085) & ((T > 0.034) | (L < 0.27)) & (L < 0.33)
    broad = (GR >= 0.075) & (T > 0.036) & (L < 0.36)
    heath = (GR < 0.035) & (RB > -0.032) & (L > 0.17) & (L < 0.36)
    bare = (L >= 0.36) & (GR < 0.04) & (RB > -0.02)
    cls[conifer] = 1
    cls[broad] = 4
    cls[heath] = 2
    cls[bare] = 3
    one = lambda k: box_blur((cls == k).astype(np.float32), 2)
    votes = np.stack([one(k) for k in range(5)])
    cls = np.argmax(votes, axis=0).astype(np.uint8)
    return cls[::-1].copy()       # row j = 0 south (the zone only, without the terrain grid's margin)

# ---------------------------------------------------------------- OSM ----------------------------------------------------------------
def osm_load():
    import xml.etree.ElementTree as ET
    from pyproj import Transformer
    T = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
    r = ET.parse(os.path.join(RAW, 'osm', 'zone.osm')).getroot()
    nodes, ntags, ways, rels = {}, {}, {}, {}
    for n in r.iter('node'):
        i = int(n.get('id'))
        nodes[i] = T.transform(float(n.get('lon')), float(n.get('lat')))
        t = {c.get('k'): c.get('v') for c in n.findall('tag')}
        if t:
            ntags[i] = t
    for w in r.iter('way'):
        ways[int(w.get('id'))] = ([int(c.get('ref')) for c in w.findall('nd')], {c.get('k'): c.get('v') for c in w.findall('tag')})
    for rl in r.iter('relation'):
        rels[int(rl.get('id'))] = ([(m.get('type'), int(m.get('ref')), m.get('role')) for m in rl.findall('member')],
                                   {c.get('k'): c.get('v') for c in rl.findall('tag')})
    return nodes, ntags, ways, rels


def chain(segs):
    """join polylines that share end points into as few chains as possible"""
    segs = [list(s) for s in segs if len(s) > 1]
    out = []
    while segs:
        c = segs.pop(0)
        grew = True
        while grew:
            grew = False
            for k, s in enumerate(segs):
                if s[0] == c[-1]:
                    c += s[1:]
                elif s[-1] == c[-1]:
                    c += s[::-1][1:]
                elif s[-1] == c[0]:
                    c = s[:-1] + c
                elif s[0] == c[0]:
                    c = s[::-1][:-1] + c
                else:
                    continue
                segs.pop(k)
                grew = True
                break
        out.append(c)
    return out


def inside(E, N, m=0.0):
    return ZONE[0] - m <= E <= ZONE[2] + m and ZONE[1] - m <= N <= ZONE[3] + m


def resample(P, step):
    """a polyline (list of (E, N)) at even steps"""
    P = np.asarray(P, np.float64)
    d = np.r_[0, np.cumsum(np.hypot(*np.diff(P, axis=0).T))]
    s = np.arange(0, d[-1] + 1e-6, step)
    if d[-1] - s[-1] > step * 0.3:
        s = np.r_[s, d[-1]]
    return np.c_[np.interp(s, d, P[:, 0]), np.interp(s, d, P[:, 1])], s


def smooth_profile(z, s, win):
    """a longitudinal profile without the bumps: a moving mean over win metres, twice (the slabs follow the land, not each tussock)"""
    z = np.asarray(z, np.float64)
    if len(z) < 3:
        return z
    st = max(1e-6, float(np.median(np.diff(s))))
    k = max(1, int(round(win / st / 2)))
    for _ in range(2):
        p = np.pad(z, k, mode='edge')
        c = np.cumsum(np.r_[0, p])
        z = (c[2 * k + 1:] - c[:-2 * k - 1]) / (2 * k + 1)
    return z


def osm_zone():
    """what the zone takes from OSM, in UTM: the Kolonnenweg, roads and tracks, the old border, the places"""
    nodes, ntags, ways, rels = osm_load()
    pts = lambda nd: [nodes[n] for n in nd if n in nodes]
    Z = {'kolonnen': [], 'roads': [], 'border': [], 'park': [], 'nsg': [], 'pois': []}
    kol = []
    for wid, (nd, t) in ways.items():
        P = pts(nd)
        if not P or not any(inside(E, N, 250) for E, N in P):
            continue
        hw = t.get('highway')
        if hw == 'track' and (t.get('surface') or '').startswith('grass_paver'):
            kol.append([n for n in nd if n in nodes])
        elif hw in ('motorway', 'motorway_link', 'tertiary', 'tertiary_link', 'unclassified', 'residential', 'service', 'track',
                    'path', 'footway'):
            Z['roads'].append({'id': wid, 'hw': hw, 'name': t.get('name', ''), 'ref': t.get('ref', ''), 'surf': t.get('surface', ''),
                               'svc': t.get('service', ''), 'oneway': t.get('oneway', '') == 'yes' or hw == 'motorway',
                               'bridge': t.get('bridge', '') == 'yes', 'p': P})
        if t.get('amenity') == 'parking':
            Z['park'].append(P)
        if t.get('name') == 'Görsdorfer Heide':
            Z['nsg'].append(P)
        if t.get('tourism') == 'museum':
            Z['pois'].append({'k': 'museum', 'name': t.get('name', ''), 'p': P})
    for c in chain(kol):
        Z['kolonnen'].append([nodes[n] for n in c])
    # the old border (OSM relation „Innerdeutsche Grenze“, historic boundary), else the state border
    for rid, (mem, t) in rels.items():
        if t.get('name') == 'Innerdeutsche Grenze':
            segs = [ways[ref][0] for ty, ref, role in mem if ty == 'way' and ref in ways]
            for c in chain(segs):
                P = [nodes[n] for n in c if n in nodes]
                if any(inside(E, N, 300) for E, N in P):
                    Z['border'].append(P)
    for nid, t in ntags.items():
        E, N = nodes[nid]
        if not inside(E, N, 300):
            continue
        k = None
        if t.get('amenity') == 'hunting_stand':
            k = 'hochsitz'
        elif t.get('historic') == 'boundary_stone':
            k = 'grenzstein'
        elif t.get('historic') == 'memorial':
            k = 'mauerreste'
        elif t.get('tourism') == 'information':
            k = 'tafel'
        elif t.get('amenity') == 'shelter':
            k = 'unterstand'
        elif t.get('amenity') == 'fuel':
            k = 'tankstelle'
        elif t.get('barrier') == 'gate':
            k = 'schranke'
        if k:
            Z['pois'].append({'k': k, 'name': t.get('name', ''), 'p': [(E, N)]})
    log(f"OSM: Kolonnenweg {len(Z['kolonnen'])} Züge, {len(Z['roads'])} Wege, Grenze {len(Z['border'])}, {len(Z['pois'])} Punkte")
    return Z


# ---------------------------------------------------------------- carving ----------------------------------------------------------------
def carve(H, line, half, shoulder, win, drop=0.0):
    """the ground under a way set to its smoothed longitudinal profile (flat across, half wide each side), blended into the land over
    the shoulder; returns the profile (E, N, z) at 2 m steps"""
    E0, N0, nx, ny = grid_frame()
    P, s = resample(line, 2.0)
    z = smooth_profile(height_at(H, P[:, 0], P[:, 1]), s, win) - drop
    # each grid cell near the line: its nearest point on the line (by the resampled points), the profile there
    R = half + shoulder
    i0 = max(0, int((P[:, 0].min() - R - E0) / GRID) - 1)
    i1 = min(nx - 1, int((P[:, 0].max() + R - E0) / GRID) + 1)
    j0 = max(0, int((P[:, 1].min() - R - N0) / GRID) - 1)
    j1 = min(ny - 1, int((P[:, 1].max() + R - N0) / GRID) + 1)
    if i1 <= i0 or j1 <= j0:
        return np.c_[P, z]
    from scipy.spatial import cKDTree
    tree = cKDTree(P)
    jj, ii = np.mgrid[j0:j1 + 1, i0:i1 + 1]
    Eg, Ng = E0 + ii * GRID, N0 + jj * GRID
    d, k = tree.query(np.c_[Eg.ravel(), Ng.ravel()], distance_upper_bound=R + 2)
    ok = np.isfinite(d)
    d = d[ok]
    k = k[ok]
    t = np.clip((d - half) / max(shoulder, 1e-3), 0, 1)
    w = 1 - t * t * (3 - 2 * t)
    J, I = jj.ravel()[ok], ii.ravel()[ok]
    H[J, I] = H[J, I] * (1 - w) + z[k] * w
    return np.c_[P, z]


def carve_poly(H, poly, z=None, shoulder=6.0):
    """a level area (a car park): its mean height (or z), blended over the shoulder"""
    from matplotlib.path import Path
    E0, N0, nx, ny = grid_frame()
    P = np.asarray(poly)
    i0 = max(0, int((P[:, 0].min() - shoulder - E0) / GRID))
    i1 = min(nx - 1, int((P[:, 0].max() + shoulder - E0) / GRID) + 1)
    j0 = max(0, int((P[:, 1].min() - shoulder - N0) / GRID))
    j1 = min(ny - 1, int((P[:, 1].max() + shoulder - N0) / GRID) + 1)
    jj, ii = np.mgrid[j0:j1 + 1, i0:i1 + 1]
    pts = np.c_[(E0 + ii * GRID).ravel(), (N0 + jj * GRID).ravel()]
    m = Path(P).contains_points(pts).reshape(jj.shape)
    if z is None:
        z = float(np.median(H[jj[m], ii[m]])) if m.any() else float(H[jj, ii].mean())
    dist = edge_distance(~m)                       # metres outside the area (inside: 0)
    t = np.clip(dist / shoulder, 0, 1)
    w = 1 - t * t * (3 - 2 * t)
    sub = H[j0:j1 + 1, i0:i1 + 1]
    H[j0:j1 + 1, i0:i1 + 1] = sub * (1 - w) + z * w
    return z


# ---------------------------------------------------------------- tiles ----------------------------------------------------------------
def l12_tiles(lines, pts):
    """the level-12 tiles (100 m) within CORRIDOR of the lines and the points"""
    from scipy.spatial import cKDTree
    P = []
    for ln in lines:
        q, _ = resample(ln, 5.0)
        P.append(q)
    P.append(np.asarray(pts, np.float64).reshape(-1, 2))
    tree = cKDTree(np.vstack(P))
    s = tsize(12)
    out = []
    for x in range(L10[0] * 4, (L10[2] + 1) * 4):
        for y in range(L10[1] * 4, (L10[3] + 1) * 4):
            e0, n0 = ROOT_E0 + x * s, ROOT_N0 + y * s
            c = (e0 + s / 2, n0 + s / 2)
            d, _ = tree.query(c)
            if d < CORRIDOR + s * 0.71:
                out.append((x, y))
    return out


def write_tiles(H, imgs, l12):
    """terrain and imagery of levels 10, 11 (whole zone) and 12 (the list) into OUT/welt"""
    from PIL import Image
    base = os.path.join(OUT, 'welt')
    stats = {}
    for L in (10, 11, 12):
        s = tsize(L)
        if L == 12:
            lst = l12
        else:
            k = 1 << (L - 10)
            lst = [(x, y) for x in range(L10[0] * k, (L10[2] + 1) * k) for y in range(L10[1] * k, (L10[3] + 1) * k)]
        nb = ni = 0
        for x, y in lst:
            e0, n0 = ROOT_E0 + x * s, ROOT_N0 + y * s
            g = np.arange(101) * (s / 100)
            EE, NN = np.meshgrid(e0 + g, n0 + g)       # row j = north index (0 south), as WTH1 wants
            h = height_at(H, EE.ravel(), NN.ravel()).reshape(EE.shape)
            b = encode_heights(h)
            pt = os.path.join(base, 't', str(L), str(x), f'{y}.bin')
            os.makedirs(os.path.dirname(pt), exist_ok=True)
            open(pt, 'wb').write(b)
            nb += len(b)
            if callable(imgs[L]):
                tile = imgs[L](x, y)
            else:
                img, area, px = imgs[L]
                c0 = int(round((e0 - area[0]) / px))
                r0 = int(round((area[3] - (n0 + s)) / px))
                tile = img[r0:r0 + 512, c0:c0 + 512]
            if tile.shape[:2] != (512, 512):
                raise RuntimeError(f'tile {L}/{x}/{y} outside its photo: {tile.shape} at {r0},{c0}')
            pi = os.path.join(base, 'i', str(L), str(x), f'{y}.webp')
            os.makedirs(os.path.dirname(pi), exist_ok=True)
            Image.fromarray(np.ascontiguousarray(tile)).save(pi, 'WEBP', quality=62 if L == 12 else 66, method=6)
            ni += os.path.getsize(pi)
        stats[L] = {'n': len(lst), 'terrain_bytes': nb, 'image_bytes': ni}
        log(f'Stufe {L}: {len(lst)} Kacheln, Gelände {nb / 1e3:.0f} kB, Luftbild {ni / 1e6:.2f} MB')
    return stats


def write_meta(stats, l12):
    levels = {}
    for L in (10, 11, 12):
        k = 1 << (L - 10)
        rect = [L10[0] * k, L10[1] * k, (L10[2] + 1) * k - 1, (L10[3] + 1) * k - 1]
        lv = {'size': tsize(L), 'rect': rect, 'terrain_step': tsize(L) / 100, 'px': tsize(L) / 512,
              'terrain': {'n': stats[L]['n'], 'bytes': stats[L]['terrain_bytes']},
              'image': {'n': stats[L]['n'], 'bytes': stats[L]['image_bytes']}}
        if L == 12:
            xs, ys = [q[0] for q in l12], [q[1] for q in l12]
            lv['rect'] = [min(xs), min(ys), max(xs), max(ys)]
            lv['has'] = [list(q) for q in sorted(l12)]
        levels[str(L)] = lv
    meta = {
        'format': 'welt-test/1', 'generated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'plan': 'grenzland-zone',
        'crs': 'EPSG:25832', 'heights': 'NHN (DHHN2016) in m minus H0', 'H0': H0,
        'model_xf': dict(XF), 'tiling': {'root': [ROOT_E0, ROOT_N0, 409600.0], 'levels': levels},
        'sources': {
            'terrain': 'DGM1 Bayern (1 m, Gelände), wo es reicht; sonst Copernicus DEM GLO-30 mit abgesenkten Kronen, an das DGM1 angepasst',
            'imagery': 'DOP Thüringen (WMS th_dop) und DOP20 Bayern (WMS by_dop20c), Farben angeglichen',
            'osm': 'OpenStreetMap (Wege zum Glätten), ODbL 1.0'},
        'attribution': ('Luftbild: © GDI-Th (CC BY 4.0) und © Bayerische Vermessungsverwaltung – www.geodaten.bayern.de (CC BY 4.0) · '
                        'Gelände: © Bayerische Vermessungsverwaltung (DGM1, CC BY 4.0), Copernicus DEM GLO-30: © DLR e.V. 2010-2014 und '
                        '© Airbus Defence and Space GmbH 2014-2018, bereitgestellt im Rahmen von COPERNICUS durch EU und ESA · '
                        '© OpenStreetMap-Mitwirkende (ODbL)'),
    }
    p = os.path.join(OUT, 'welt', 'meta.json')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(meta, open(p, 'w'), ensure_ascii=False, indent=1)


# ---------------------------------------------------------------- the way there ----------------------------------------------------------------
OSRM = ('https://router.project-osrm.org/route/v1/driving/10.7563,50.5103;10.9216,50.3929'
        '?overview=full&geometries=geojson&steps=true')   # Schleusingen, Markt → the car park at the tower (OSM data, ODbL)


def anfahrt():
    """the drive from Schleusingen over the A 73 to Eisfeld-Süd and the Coburger Straße (K 530) to the tower: the line in model
    metres for the radar and the legs with their names (OSRM demo server on OpenStreetMap data, fetched once into the raw cache)"""
    from pyproj import Transformer
    p = os.path.join(RAW, 'route', 'osrm.json')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    b = cached(p, OSRM, ok=lambda st, b, ct: st == 200 and b[:1] == b'{', timeout=60)
    if not b:
        return None
    j = json.loads(b)
    r = j['routes'][0]
    T = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
    E, N = T.transform(*np.asarray(r['geometry']['coordinates']).T)
    P = np.c_[E, N]
    Q, s = resample(P, 25.0)
    x, y = to_model(Q[:, 0], Q[:, 1])
    legs, at = [], 0.0
    for st in r['legs'][0]['steps']:
        nm = st.get('ref') or st.get('name') or ''
        if st['distance'] > 30 and nm and (not legs or legs[-1][0] != nm):
            legs.append([nm, round(at)])
        at += st['distance']
    return {'p': [v for i in range(len(x)) for v in (int(round(x[i] * 10)), int(round(y[i] * 10)))], 'km': round(r['distance'] / 1000, 1),
            'min': round(r['duration'] / 60), 'abschnitte': legs, 'quelle': 'OSRM auf OpenStreetMap-Daten (ODbL)'}


# ---------------------------------------------------------------- the zone's own data (model metres) ----------------------------------------------------------------
BUNKER = (637986.0, 5583712.0)       # invented: at the south end of the big heath patch, under the foundation of a removed tower
HIDE = (638118.0, 5583632.0)         # a hide for birdwatchers at the edge of the second heath patch (invented, plausible)


def to_model(E, N):
    x, y = model_from_utm(np.asarray(E, np.float64), np.asarray(N, np.float64))
    return np.asarray(x), np.asarray(y)


def dm(v):
    return [int(round(float(q) * 10)) for q in v]


def nearest_on(line, E, N):
    P = np.asarray(line)
    d = np.hypot(P[:, 0] - E, P[:, 1] - N)
    return int(np.argmin(d)), float(d.min())


def build_zone(H, Z, cls):
    """zone.json: what the runtime builds from (model metres, heights relative to H0 as the tiles have them)"""
    E0, N0, nx, ny = grid_frame()
    rnd = np.random.default_rng(1973)
    out = {'v': 1, 'made': time.strftime('%Y-%m-%d'), 'credits': '© OpenStreetMap-Mitwirkende (ODbL 1.0); Gelände © Bayerische '
           'Vermessungsverwaltung (CC BY 4.0), Copernicus DEM GLO-30; Luftbild © GDI-Th, © Bayerische Vermessungsverwaltung (CC BY 4.0)'}
    cx, cy = to_model([ZONE[0], ZONE[2], ZONE[0], ZONE[2]], [ZONE[1], ZONE[1], ZONE[3], ZONE[3]])
    out['rect'] = [round(float(cx.min()), 1), round(float(cy.min()), 1), round(float(cx.max()), 1), round(float(cy.max()), 1)]
    out['utm'] = list(ZONE)
    # the Kolonnenweg: the chain through the zone, its smoothed profile (as carved into the terrain)
    kol = []
    for c in Z['kolonnen']:
        P = np.asarray(c)
        keep = [(E, N) for E, N in P if inside(E, N, 40)]
        if len(keep) < 2:
            continue
        prof = Z['profiles'].get(id(c))
        Q, s = resample(keep, 2.0)
        z = height_at(H, Q[:, 0], Q[:, 1])
        x, y = to_model(Q[:, 0], Q[:, 1])
        kol.append({'p': [v for i in range(len(x)) for v in (int(round(x[i] * 10)), int(round(y[i] * 10)), int(round(z[i] * 100 - H0 * 100)))]})
    kol.sort(key=lambda k: -len(k['p']))
    out['kolonnenweg'] = kol
    # the old border
    bd = []
    for P in Z['border']:
        keep = [(E, N) for E, N in P if inside(E, N, 120)]
        if len(keep) < 2:
            continue
        Q, s = resample(keep, 10.0)
        x, y = to_model(Q[:, 0], Q[:, 1])
        bd.append([v for i in range(len(x)) for v in (int(round(x[i] * 10)), int(round(y[i] * 10)))])
    out['grenze'] = bd
    # roads and tracks for the small map and the place names (FAHRT's way format: kind, surface, width·10, flags, name, ref, x y z dm)
    KINDS = ['motorway', 'main', 'county', 'street', 'lane', 'service', 'track', 'path', 'foot']
    SURFS = ['asphalt', 'concrete', 'paving', 'gravel', 'ground', 'grass']
    names = ['']
    nm = lambda t: names.index(t) if t in names else (names.append(t) or len(names) - 1)
    ways = []
    for r in Z['roads']:
        P = [(E, N) for E, N in r['p']]
        if not any(inside(E, N, 30) for E, N in P):
            continue
        hw = r['hw']
        kind = {'motorway': 0, 'motorway_link': 0, 'tertiary': 2, 'tertiary_link': 2, 'unclassified': 4, 'residential': 3,
                'service': 5, 'track': 6, 'path': 7, 'footway': 8}[hw]
        sf = r['surf']
        surf = 0 if sf in ('asphalt', '') and kind <= 5 else 3 if sf in ('gravel', 'compacted', 'fine_gravel') else \
            4 if kind >= 6 else 0
        w = {0: 11.0, 2: 6.5, 3: 5.0, 4: 4.0, 5: 3.5, 6: 3.0, 7: 1.2, 8: 1.5}[kind]
        Q, s = resample(P, 4.0)
        z = height_at(H, Q[:, 0], Q[:, 1])
        x, y = to_model(Q[:, 0], Q[:, 1])
        fl = (4 if r['oneway'] else 0) | (1 if r['bridge'] else 0)
        ways.append([kind, surf, int(w * 10), fl, nm(r['name']), nm(r['ref']),
                     [v for i in range(len(x)) for v in (int(round(x[i] * 10)), int(round(y[i] * 10)), int(round((z[i] - H0) * 10)))]])
    # the Kolonnenweg itself as a track of concrete (the small map, KERN.place, the autopilot's graph)
    for k in out['kolonnenweg']:
        p = k['p']
        ways.append([6, 1, 23, 0, nm('Kolonnenweg'), 0, [p[i] if i % 3 < 2 else int(round(p[i] / 10)) for i in range(len(p))]])
    out['wege'] = {'kinds': KINDS, 'surf': SURFS, 'names': names, 'ways': ways}
    # places
    def put(name, E, N, hd=0.0):
        x, y = to_model([E], [N])
        z = float(height_at(H, np.array([E]), np.array([N]))[0]) - H0
        out.setdefault('orte', {})[name] = [round(float(x[0]), 2), round(float(y[0]), 2), round(z, 2), round(hd, 1)]
    mus = [q for q in Z['pois'] if q['k'] == 'museum']
    if mus:
        P = np.asarray(mus[0]['p'])
        put('museum', P[:, 0].mean(), P[:, 1].mean())
        out['turm'] = [v for E, N in P[:-1] for v in dm(np.concatenate(to_model([E], [N])))]
    for q in Z['pois']:
        if q['k'] in ('hochsitz', 'grenzstein', 'mauerreste', 'tafel', 'unterstand', 'schranke'):
            E, N = q['p'][0]
            if inside(E, N, 0):
                x, y = to_model([E], [N])
                z = float(height_at(H, np.array([E]), np.array([N]))[0]) - H0
                out.setdefault('punkte', []).append([q['k'], round(float(x[0]), 2), round(float(y[0]), 2), round(z, 2), q['name']])
    # the parking where one arrives (the car park beside the tower) and its outline
    if Z['park']:
        P = max(Z['park'], key=lambda p: len(p))
        out['parkplatz_ring'] = [v for E, N in P for v in dm(np.concatenate(to_model([E], [N])))]
    K0 = np.asarray(Z['kolonnen'][0]) if Z['kolonnen'] else None
    main = max(Z['kolonnen'], key=len)
    M = np.asarray([(E, N) for E, N in main if inside(E, N, 0)])
    # a: the Kolonnenweg's end at the old crossing (west), b: where it leaves the zone to the south-east
    a = M[np.argmin(M[:, 0])]
    b = M[np.argmax(M[:, 0] - M[:, 1])]
    put('kolonnenweg_a', a[0], a[1])
    put('kolonnenweg_b', b[0], b[1])
    put('bunker', *BUNKER)
    put('hide', *HIDE)
    # the heath: the middle of the largest heath patch near the Kolonnenweg
    put('heide', 637962.0, 5583800.0)
    put('parkplatz', 636652.0, 5584102.0, 200.0)
    put('ankunft', 636530.0, 5583890.0, 17.3)      # on the K 530 coming from Eisfeld-Süd, towards the tower
    # the land cover as a small grid (2 m, uint8 classes, zlib + base64), UTM-aligned
    c2 = cls[::2, ::2]
    out['bewuchs'] = {'E0': ZONE[0], 'N0': ZONE[1], 'step': 2.0, 'nx': int(c2.shape[1]), 'ny': int(c2.shape[0]),
                      'klassen': ['offen', 'nadel', 'heide', 'kahl', 'laub'],
                      'b64': __import__('base64').b64encode(zlib.compress(c2.astype(np.uint8).tobytes(), 9)).decode()}
    # trees: in the forest within 120 m of the Kolonnenweg and 90 m of the tower's place, young pines and birches in the heath
    from scipy.spatial import cKDTree
    ref = [resample([(E, N) for E, N in c], 4.0)[0] for c in Z['kolonnen']]
    tK = cKDTree(np.vstack(ref))
    tM = cKDTree(np.asarray([[636626.0, 5584081.0], [636560.0, 5583900.0]]))
    cop = None
    trees = []
    for kind, step, cls_ok in ((4, 4.3, (1,)), (3, 5.5, (4,)), (9, 9.0, (2, 3))):
        g = np.arange(0, ZONE[2] - ZONE[0], step)
        h = np.arange(0, ZONE[3] - ZONE[1], step)
        EE, NN = np.meshgrid(ZONE[0] + g, ZONE[1] + h)
        EE = EE.ravel() + rnd.uniform(-0.42, 0.42, EE.size) * step
        NN = NN.ravel() + rnd.uniform(-0.42, 0.42, NN.size) * step
        ii = np.clip(((EE - ZONE[0]) / 1.0).astype(int), 0, cls.shape[1] - 1)
        jj = np.clip(((NN - ZONE[1]) / 1.0).astype(int), 0, cls.shape[0] - 1)
        c = cls[jj, ii]
        m = np.isin(c, cls_ok)
        dK, _ = tK.query(np.c_[EE, NN])
        dM, _ = tM.query(np.c_[EE, NN])
        m &= (dK < 120) | (dM < 90)
        m &= dK > 3.6                                      # the Kolonnenweg and its edge stay free
        if kind == 9:
            m &= rnd.random(EE.size) < 0.22                 # the heath: a scattered young pine or birch
        EE, NN, dK = EE[m], NN[m], dK[m]
        if not len(EE):
            continue
        if kind == 9:
            k = np.where(rnd.random(len(EE)) < 0.55, 4, 3)
            ht = np.where(k == 4, rnd.uniform(1.6, 5.5, len(EE)), rnd.uniform(2.5, 8.0, len(EE)))
        else:
            k = np.full(len(EE), kind)
            if cop is None:
                st = 8
                gE, gN = np.meshgrid(np.arange(E0, E0 + nx, st), np.arange(N0, N0 + ny, st))
                C = cop_heights(gE.ravel(), gN.ravel()).reshape(gE.shape)
                Hs = H[::st, ::st][:C.shape[0], :C.shape[1]]
                cop = (C - Hs, st)
            CH, st = cop
            ci = np.clip(((EE - E0) / st).astype(int), 0, CH.shape[1] - 1)
            cj = np.clip(((NN - N0) / st).astype(int), 0, CH.shape[0] - 1)
            chm = CH[cj, ci]
            base = np.where(k == 4, rnd.uniform(15, 25, len(EE)), rnd.uniform(9, 17, len(EE)))
            ht = np.clip(np.where(np.isfinite(chm) & (chm > 6), 0.5 * base + 0.5 * chm, base), 6, 29)
            # at the edge of a stand the trees are lower and fuller (the strip was kept open until 1989)
            ht = np.where(dK < 25, ht * (0.72 + 0.28 * np.clip((dK - 4) / 21, 0, 1)), ht)
        x, y = to_model(EE, NN)
        z = height_at(H, EE, NN) - H0
        for q in range(len(x)):
            trees.append((x[q], y[q], z[q], ht[q], int(k[q])))
    ox, oy = round(float(np.mean([t[0] for t in trees])), 1), round(float(np.mean([t[1] for t in trees])), 1)
    arr = np.array([[(t[0] - ox) * 10, (t[1] - oy) * 10, t[2] * 10, t[3] * 10, t[4]] for t in trees]).round().astype(np.int16)
    out['baeume'] = {'o': [ox, oy], 'n': len(trees), 'feld': ['x dm', 'y dm', 'z dm', 'h dm', 'art 4 Kiefer/Fichte, 3 Birke/Laub'],
                     'b64': __import__('base64').b64encode(arr.tobytes()).decode()}
    af = anfahrt()
    if af:
        out['anfahrt'] = af
    log(f"zone.json: Kolonnenweg {len(kol)} Züge ({sum(len(k['p']) // 3 for k in kol)} Punkte), {len(ways)} Wege, {len(trees)} Bäume")
    p = os.path.join(OUT, 'zone.json')
    os.makedirs(OUT, exist_ok=True)
    json.dump(out, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
    log('zone.json', os.path.getsize(p) // 1024, 'kB')
    return out


def run_all():
    from PIL import Image
    Z = osm_zone()
    cls = np.load(os.path.join(RAW, 'cover.npy')) if os.path.exists(os.path.join(RAW, 'cover.npy')) else None
    img11 = np.load(os.path.join(RAW, 'mosaic11.npy')) if os.path.exists(os.path.join(RAW, 'mosaic11.npy')) else mosaic(11)
    np.save(os.path.join(RAW, 'mosaic11.npy'), img11)
    if cls is None:
        cls = land_cover(img11, tsize(11) / 512)
        np.save(os.path.join(RAW, 'cover.npy'), cls)
    E0, N0, nx, ny = grid_frame()
    m = int(MARGIN)
    forest = np.zeros((ny, nx), bool)
    forest[m:m + cls.shape[0], m:m + cls.shape[1]] = (cls == 1) | (cls == 4)
    H, have = build_terrain(forest)
    # carve: the roads and the car parks first, the bunker's pad, then the Kolonnenweg over them (2.3 m of slabs, flat across, 1.8 m
    # shoulder, profile over 30 m; the longest chain last – where a branch meets it, the main way wins)
    Z['profiles'] = {}
    for r in Z['roads']:
        if r['hw'] in ('tertiary', 'tertiary_link', 'service', 'unclassified', 'residential', 'motorway', 'motorway_link'):
            if any(inside(E, N, 60) for E, N in r['p']):
                hw = {'motorway': 6.0, 'motorway_link': 3.5, 'tertiary': 3.6, 'tertiary_link': 3.0}.get(r['hw'], 2.4)
                carve(H, r['p'], hw, 4.0, 40.0)
    for P in Z['park']:
        if any(inside(E, N, 30) for E, N in P):
            carve_poly(H, P)
    bx, by = BUNKER
    carve_poly(H, [(bx - 5, by - 5), (bx + 5, by - 5), (bx + 5, by + 5), (bx - 5, by + 5)], shoulder=4.0)
    for c in sorted(Z['kolonnen'], key=len):
        carve(H, c, 1.6, 1.8, 30.0)
    np.save(os.path.join(RAW, 'terrain_carved.npy'), H)
    # imagery
    imgs = {11: (img11, ZONE, tsize(11) / 512)}
    im10 = np.asarray(Image.fromarray(img11).resize((img11.shape[1] // 2, img11.shape[0] // 2), Image.BOX))
    imgs[10] = (im10, ZONE, tsize(10) / 512)
    pts = [(636626.0, 5584081.0), (636600.0, 5583950.0), BUNKER, HIDE, (637962.0, 5583800.0)]
    l12 = l12_tiles([c for c in Z['kolonnen']], pts)
    # level 12: the photo of each level-10 tile that holds corridor tiles (2048 px at 0.195 m), joined, cut into its 16 tiles
    cache = {}

    def tile12(x, y):
        k = (x // 4, y // 4)
        if k not in cache:
            cache.clear()
            bb = tbounds(10, *k)
            cache[k] = join_photos(wms(WMS_TH, 'th_dop', bb, 2048, 2048, 'dop12'), wms(WMS_BY, 'by_dop20c', bb, 2048, 2048, 'dop12'))
        a = cache[k]
        i, j = x % 4, y % 4
        return a[(3 - j) * 512:(4 - j) * 512, i * 512:(i + 1) * 512]
    l12.sort(key=lambda q: (q[0] // 4, q[1] // 4, q[0], q[1]))
    imgs[12] = tile12
    stats = write_tiles(H, imgs, l12)
    write_meta(stats, l12)
    build_zone(H, Z, cls)


if __name__ == '__main__':
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if '--raw' in sys.argv:
        RAW = sys.argv[sys.argv.index('--raw') + 1]
        args = [a for a in args if a != RAW]
    step = args[0] if args else 'all'
    os.makedirs(RAW, exist_ok=True)
    if step in ('fetch', 'all'):
        fetch_osm()
        fetch_dgm()
        fetch_cop()
    if step in ('build', 'all'):
        run_all()
