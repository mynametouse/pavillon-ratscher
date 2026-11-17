"""Rasters on a model grid (gemeinsam.Grid): the orthophoto (colour, colour infrared), the heights (DGM1, DOM1 → height above ground),
the rendered ATKIS Basis-DLM layers, and vector shapes (polygons, buffered lines) drawn into masks."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemeinsam import RAW, m2u  # noqa: E402

# the geodata work area of tools/geo (DGM1/DOM1 mosaics in out/): PAV_GEO, else <repo>/geo, else the main checkout's link
_REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
GEO = os.environ.get('PAV_GEO') or next((p for p in (os.path.join(_REPO, 'geo'), '/home/claude/pr-src/geo')
                                         if os.path.exists(os.path.join(p, 'out', 'dgm_mosaic.npy'))), os.path.join(_REPO, 'geo'))


def _sample_utm(img, e0, n1, res, grid, interp='linear'):
    """sample a north-up UTM raster (top-left corner e0, n1; pixel size res) at the centres of a model grid (cv2.remap)"""
    import cv2
    X, Y = grid.centres()
    E, N = m2u(X, Y)
    mx = ((E - e0) / res - 0.5).astype(np.float32)
    my = ((n1 - N) / res - 0.5).astype(np.float32)
    flag = cv2.INTER_LINEAR if interp == 'linear' else cv2.INTER_NEAREST
    if img.ndim == 2:
        return cv2.remap(img, mx, my, flag, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    chans = [cv2.remap(np.ascontiguousarray(img[..., k]), mx, my, flag, borderMode=cv2.BORDER_CONSTANT, borderValue=0) for k in range(img.shape[2])]
    return np.stack(chans, -1)


def dop(i, j, layer, grid):
    """the orthophoto (layer th_dop or th_dop20cir) of cell (i, j) on a model grid (uint8 RGB)"""
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    fn = os.path.join(RAW, 'dop', f'{layer}_{i}_{j}.jpg')
    meta = json.load(open(fn + '.json'))
    img = np.asarray(Image.open(fn).convert('RGB'))
    return _sample_utm(img, meta['e0'], meta['n1'], meta['res'], grid)


_MOS = {}


def mosaic(kind):
    """the 3 × 3 km mosaics of DGM1 / DOM1 (1 m, UTM 624000–627000 E, 5594000–5597000 N, row 0 north) of tools/geo/common.py"""
    if kind not in _MOS:
        fn = os.path.join(GEO, 'out', kind + '_mosaic.npy')
        _MOS[kind] = np.load(fn) if os.path.exists(fn) else None
    return _MOS[kind]


def heights(grid):
    """(ground height, height above ground) on the grid; None where the mosaics do not reach"""
    G, D = mosaic('dgm'), mosaic('dom')
    if G is None or D is None:
        return None, None
    g = _sample_utm(np.nan_to_num(G, nan=-999).astype(np.float32), 624000.0, 5597000.0, 1.0, grid)
    d = _sample_utm(np.nan_to_num(D, nan=-999).astype(np.float32), 624000.0, 5597000.0, 1.0, grid)
    bad = (g < -100) | (d < -100)
    h = np.where(bad, np.nan, d - g).astype(np.float32)
    g = np.where(bad, np.nan, g).astype(np.float32)
    return g, h


_DLM = {}


def dlm(layer, grid, name='ratscher'):
    """a rendered DLM layer (RGBA) on the grid, nearest pixel"""
    from PIL import Image
    key = (name, layer)
    if key not in _DLM:
        meta = json.load(open(os.path.join(RAW, 'dlm', f'{name}.json')))
        _DLM[key] = (np.asarray(Image.open(os.path.join(RAW, 'dlm', f'{name}_{layer}.png')).convert('RGBA')), meta)
    img, meta = _DLM[key]
    return _sample_utm(img, meta['e0'], meta['n1'], meta['res'], grid, 'nearest')


def colour_mask(rgba, col, tol=8, amin=60):
    return (np.abs(rgba[..., :3].astype(int) - np.array(col)).sum(-1) <= tol) & (rgba[..., 3] >= amin)


# ---------------- vector shapes → masks ----------------
def _rings(geom):
    """exterior and interior rings of a (multi)polygon"""
    if geom.is_empty:
        return
    gs = getattr(geom, 'geoms', [geom])
    for g in gs:
        if g.geom_type == 'Polygon':
            yield g.exterior, [r for r in g.interiors]
        elif hasattr(g, 'geoms'):
            yield from _rings(g)


def draw_polys(grid, geoms, value=1, out=None, dtype=np.uint8):
    """fill (multi)polygons (model metres) into a mask; holes stay out. A pixel is in when its centre is inside (skimage.draw.polygon
    tests the centres; PIL's ImageDraw fills half a pixel more on every side)"""
    from skimage.draw import polygon as sk_polygon
    m = np.zeros((grid.h, grid.w), bool)
    for g in geoms:
        for ext, holes in _rings(g):
            u, v = grid.to_px(*np.asarray(ext.coords).T[:2])
            rr, cc = sk_polygon(v - 0.5, u - 0.5, (grid.h, grid.w))
            part = np.zeros_like(m)
            part[rr, cc] = True
            for h in holes:
                u, v = grid.to_px(*np.asarray(h.coords).T[:2])
                rr, cc = sk_polygon(v - 0.5, u - 0.5, (grid.h, grid.w))
                part[rr, cc] = False
            m |= part
    if out is None:
        out = np.zeros((grid.h, grid.w), dtype)
    out[m] = value
    return out


def draw_lines(grid, lines, width_m, value=1, out=None, dtype=np.uint8):
    """lines (shapely LineStrings or lists of (x, y)) drawn with a width in metres (round ends: buffered)"""
    from shapely.geometry import LineString
    geoms = []
    for ln in lines:
        g = ln if hasattr(ln, 'buffer') else LineString(ln)
        if g.length > 0:
            geoms.append(g.buffer(width_m / 2, cap_style=1, join_style=1, quad_segs=6))
    return draw_polys(grid, geoms, value, out, dtype)


def disc_mask(grid, pts, r):
    """discs of radius r (scalar or per point) around points"""
    X, Y = grid.centres()
    m = np.zeros((grid.h, grid.w), bool)
    r = np.broadcast_to(np.asarray(r, float), (len(pts),))
    for (x, y), rr in zip(pts, r):
        u0, u1 = int((x - rr - grid.x0) / grid.res), int((x + rr - grid.x0) / grid.res) + 1
        v0, v1 = int((grid.y1 - y - rr) / grid.res), int((grid.y1 - y + rr) / grid.res) + 1
        u0, v0 = max(u0, 0), max(v0, 0)
        u1, v1 = min(u1, grid.w), min(v1, grid.h)
        if u1 <= u0 or v1 <= v0:
            continue
        sub = (X[v0:v1, u0:u1] - x) ** 2 + (Y[v0:v1, u0:u1] - y) ** 2 <= rr * rr
        m[v0:v1, u0:u1] |= sub
    return m
