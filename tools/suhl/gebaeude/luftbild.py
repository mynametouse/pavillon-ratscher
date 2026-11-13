#!/usr/bin/env python3
"""suhl-gebaeude: what the aerial image tells about a roof. The Thuringian orthophoto (DOP 20 cm, flight of 15.05.2024 over all of Suhl;
(c) GDI-Th, CC BY 4.0) from the state's WMS, layers th_dop (colour) and th_dop20cir (infrared: NIR, red, green), one picture per level-10
tile at 0.4 m per pixel with a 40 m margin, cached (RAW/dop/10_<x>_<y>_<layer>.jpg - analysis copies, never committed).

Per roof face: the class (0 tile red, 1 tile dark, 2 concrete tile, 3 slate, 4 bitumen / gravel, 5 metal, 6 green roof, 7 glass) and the
colour (the middle of the pixels inside the face - shadows, glints and tree crowns left out). Per building: is the roof flat (both halves
alike, no tiles) and which way the ridge runs (the two slopes of a gable are lit differently) - ideas of tools/welt-gebaeude/prep.py.
Everything here is an estimate from one picture; the record marks it (`cq` 1, `rq` 1).

  python3 -I tools/suhl/gebaeude/luftbild.py --fetch probe        # fetch the pictures of the sample tiles (polite, cached)
"""
import io, math, os, sys, time
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gblib as G
from gblib import wlib

WMS = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP'
RES, MARGIN = 0.4, 40.0
CLASSES = ['ziegel_rot', 'ziegel_dunkel', 'betonstein', 'schiefer', 'bitumen_kies', 'blech', 'gruendach', 'glas']
LUMA = np.array([0.3, 0.55, 0.15], dtype=np.float32)


def hsl(c):
    mx, mn = float(max(c)), float(min(c))
    l = (mx + mn) / 2
    d = mx - mn
    if d < 1e-4:
        return 0.0, 0.0, l
    s = d / (1 - abs(2 * l - 1) + 1e-9)
    if mx == c[0]:
        h = ((c[1] - c[2]) / d) % 6
    elif mx == c[1]:
        h = (c[2] - c[0]) / d + 2
    else:
        h = (c[0] - c[1]) / d + 4
    return (h * 60 + 360) % 360, min(1.0, s), l


class Img:
    """one tile's pictures in UTM: pixel (u, v) centre = (e0 + (u + 0.5) res, n1 - (v + 0.5) res)"""

    def __init__(self, rgb, cir, e0, n1, res):
        self.rgb, self.cir, self.e0, self.n1, self.res = rgb, cir, e0, n1, res
        self.h, self.w = rgb.shape[:2]

    def sample(self, poly, inset=0.5):
        """the pixels inside a polygon (UTM), `inset` metres in from its edge -> (points (n, 2), colours (n, 3), ndvi (n) or None)"""
        import shapely
        inner = poly.buffer(-inset) if inset > 0 else poly
        if inner.is_empty:
            return None
        x0, y0, x1, y1 = inner.bounds
        u0, u1 = max(0, int((x0 - self.e0) / self.res)), min(self.w, int(math.ceil((x1 - self.e0) / self.res)))
        v0, v1 = max(0, int((self.n1 - y1) / self.res)), min(self.h, int(math.ceil((self.n1 - y0) / self.res)))
        if u1 - u0 < 1 or v1 - v0 < 1:
            return None
        us, vs = np.arange(u0, u1), np.arange(v0, v1)
        X = self.e0 + (us + 0.5) * self.res
        Y = self.n1 - (vs + 0.5) * self.res
        XX, YY = np.meshgrid(X, Y)
        m = shapely.contains_xy(inner, XX, YY)
        if m.sum() < 4:
            return None
        C = self.rgb[v0:v1, u0:u1][m]
        nd = None
        if self.cir is not None:
            q = self.cir[v0:v1, u0:u1][m]
            nd = (q[:, 0] - q[:, 1]) / (q[:, 0] + q[:, 1] + 1e-6)
        return np.column_stack([XX[m], YY[m]]), C, nd

    def roof_hints(self, poly, sh):
        """{'flat': True | False | None, 'ridge': unit vector or None}: flat = both halves of the roof alike and no tiles; ridge = the
        line that splits a pitched roof into its brighter and its darker half"""
        s = self.sample(poly, 0.6)
        if s is None or len(s[0]) < 40:
            return {}
        P, C, nd = s
        if nd is not None:
            keep = nd < 0.18                    # tree crowns over the roof say nothing about it
            if keep.sum() < 40:
                return {}
            P, C = P[keep], C[keep]
        L = C @ LUMA
        ux = np.array(sh['ux'], dtype=float)
        ctr = np.array(sh['ctr'], dtype=float)
        Q = P - ctr
        res = []
        for ax in (ux, np.array([-ux[1], ux[0]])):
            nrm = np.array([-ax[1], ax[0]])
            d = Q @ nrm
            a_, b_ = L[d > 0.4], L[d < -0.4]
            if len(a_) < 12 or len(b_) < 12:
                return {}
            res.append((abs(float(np.median(a_) - np.median(b_))), ax))
        (d1, a1), (d2, a2) = res        # d1: halves split along the long axis (a ridge along it), d2: split across
        red = float(np.mean(C[:, 0] - np.maximum(C[:, 1], C[:, 2]) > 0.05))
        out = {'flat': bool(max(d1, d2) < 0.03 and red < 0.25), 'ridge': None, 'red': red, 'd': (d1, d2)}
        if d2 > 1.5 * d1 and d2 > 0.035:
            out['ridge'] = a2
        elif d1 > 1.5 * d2 and d1 > 0.035:
            out['ridge'] = a1
        return out

    def roof_class(self, pg, slope, k, osm_tags):
        """class, colour '#rrggbb' and flag of one roof face (pg: the face seen from above, a shapely polygon in UTM): (cls, col, cq) -
        cq 1 from the picture, 2 material tagged in OpenStreetMap (the colour still from the picture); (None, None, 0) when the
        picture does not show it"""
        if pg is None or pg.is_empty:
            return None, None, 0
        s = self.sample(pg, 0.5) or self.sample(pg, 0.15)
        if s is None:
            return None, None, 0
        P, C, nd = s
        veg = 0.0
        if nd is not None:
            vm = nd > 0.18
            veg = float(vm.mean())
            if (~vm).sum() >= 6 and veg < 0.6:
                C = C[~vm]
        if len(C) < 4:
            return None, None, 0
        L = C @ LUMA
        o = np.argsort(L)
        mid = C[o[len(o) // 4: max(len(o) // 4 + 1, int(len(o) * 0.85))]]
        c = mid.mean(axis=0)
        H, S, Lt = hsl(c)
        flat = slope < 6.0
        t = osm_tags or {}
        mat = (t.get('roof:material') or '').lower()
        cq = 1
        warm = (H < 45 or H > 335)
        if flat:
            if veg >= 0.6:
                cls = 6
            elif Lt > 0.62 and S < 0.16:
                cls = 5
            else:
                cls = 4
        else:
            if warm and S > 0.20 and Lt > 0.22:
                cls = 0
            elif warm and S > 0.10:
                cls = 1 if Lt < 0.42 else 0 if S > 0.16 else 2
            elif Lt < 0.30:
                cls = 3
            elif Lt < 0.55:
                cls = 2 if k in (0, 6) else 4 if k == 2 else 5
            else:
                cls = 5
        m_ = {'roof_tiles': None, 'tile': None, 'tiles': None, 'slate': 3, 'metal': 5, 'metal_sheet': 5, 'zinc': 5, 'copper': 5, 'tin': 5,
              'concrete': 2 if not flat else 4, 'tar_paper': 4, 'bitumen': 4, 'gravel': 4, 'glass': 7, 'grass': 6, 'eternit': 2, 'asbestos': 2}
        if mat in m_:
            cq = 2
            if m_[mat] is not None:
                cls = m_[mat]
            elif cls not in (0, 1):
                cls = 1 if Lt < 0.42 else 0
        return cls, G.hexcol(c), cq


class Tiles:
    """the pictures of level-10 tiles, fetched once and cached"""

    def __init__(self, raw, cir=True, pause=0.6):
        self.raw, self.cir, self.pause, self.failed = raw, cir, pause, 0
        os.makedirs(raw, exist_ok=True)

    def _get(self, tx, ty, layer):
        e0, n0, e1, n1 = wlib.tbounds(G.LEVEL, tx, ty)
        e0, n0, e1, n1 = e0 - MARGIN, n0 - MARGIN, e1 + MARGIN, n1 + MARGIN
        w, h = int(round((e1 - e0) / RES)), int(round((n1 - n0) / RES))
        path = os.path.join(self.raw, f'{G.LEVEL}_{tx}_{ty}_{layer}.jpg')
        url = (f'{WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS={layer}&STYLES=&CRS=EPSG:25832'
               f'&BBOX={e0},{n0},{e1},{n1}&WIDTH={w}&HEIGHT={h}&FORMAT=image/jpeg')
        body, cached = G.http_cached(url, path, pause=self.pause, timeout=120, tries=3, min_bytes=2000)
        from PIL import Image
        im = Image.open(io.BytesIO(body)).convert('RGB')
        if im.size != (w, h):
            raise RuntimeError(f'picture {layer} {tx}/{ty}: size {im.size}, asked {(w, h)}')
        return np.asarray(im, dtype=np.float32) / 255.0, e0, n1

    def tile(self, tx, ty):
        try:
            rgb, e0, n1 = self._get(tx, ty, 'th_dop')
        except Exception as ex:
            self.failed += 1
            G.log('no aerial image for tile', tx, ty, repr(ex)[:200])
            return None
        if float(rgb.mean()) < 0.02 or float(rgb.std()) < 0.005:
            G.log('aerial image of tile', tx, ty, 'is empty')
            return None
        cir = None
        if self.cir:
            try:
                cir = self._get(tx, ty, 'th_dop20cir')[0]
            except Exception as ex:
                G.log('no infrared image for tile', tx, ty, repr(ex)[:160])
        return Img(rgb, cir, e0, n1, RES)


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--fetch', default='probe')
    a = ap.parse_args()
    T = Tiles(os.path.join(G.RAW, 'dop'))
    for tx, ty in G.sample_tiles():
        im = T.tile(tx, ty)
        G.log(tx, ty, None if im is None else (im.rgb.shape, im.cir is not None, round(float(im.rgb.mean()), 3)))
