#!/usr/bin/env python3
"""suhl-gebaeude: what the aerial image tells about a roof. The Thuringian orthophoto (DOP 20 cm, flight of 15.05.2024 over all of Suhl;
(c) GDI-Th, CC BY 4.0) from the state's WMS, layers th_dop (colour) and th_dop20cir (infrared: NIR, red, green), one picture per level-10
tile at 0.4 m per pixel with a 40 m margin, cached (RAW/dop/10_<x>_<y>_<layer>.jpg - analysis copies, never committed).

Per roof face: the class (0 tile red, 1 tile dark, 2 concrete tile, 3 slate, 4 bitumen / gravel, 5 metal, 6 green roof, 7 glass) and the
colour (the middle of the pixels inside the face - shadows, glints and tree crowns left out). Per building: is the roof flat (both halves
alike, no tiles) and which way the ridge runs (the two slopes of a gable are lit differently) - ideas of tools/welt-gebaeude/prep.py.
Everything here is an estimate from one picture; the record marks it (`cq` 1, `rq` 1).

  python3 -I tools/suhl/gebaeude/dachbild.py --fetch probe        # fetch the pictures of the sample tiles (polite, cached)
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

    def face_colour(self, pg):
        """the colour of one roof face seen from above (pg: shapely polygon in UTM): the middle of its pixels - the darkest quarter
        (shadows) and the brightest 15 % (glints) left out, tree crowns (infrared) left out. -> (rgb 0..1, share of vegetation, its
        median NDVI) or None when the picture does not show the face"""
        if pg is None or pg.is_empty:
            return None
        s = self.sample(pg, 0.5) or self.sample(pg, 0.15)
        if s is None:
            return None
        P, C, nd = s
        veg, vnd = 0.0, 0.0
        if nd is not None:
            vm = nd > 0.18
            veg = float(vm.mean())
            vnd = float(np.median(nd[vm])) if vm.any() else 0.0
            if (~vm).sum() >= 6 and veg < 0.6:
                C = C[~vm]
        if len(C) < 4:
            return None
        L = C @ LUMA
        o = np.argsort(L)
        mid = C[o[len(o) // 4: max(len(o) // 4 + 1, int(len(o) * 0.85))]]
        return mid.mean(axis=0), veg, vnd


def classify(c, flat, k, veg=0.0, vnd=0.0):
    """the roof class from a colour in the sun: 0 tile red, 1 tile dark, 2 concrete tile or other grey cover, 3 slate, 4 bitumen / gravel
    / membrane, 5 metal, 6 green roof; None = the picture shows trees, not the roof"""
    H, S, Lt = hsl(c)
    warm = (H < 45 or H > 335)
    if flat:
        if veg >= 0.6:
            return None if vnd > 0.45 else 6      # a dense crown above the roof is a tree, an even low green is a green roof
        if Lt > 0.62 and S < 0.16 and k in (1, 3):
            return 5
        return 4
    if veg >= 0.6 and vnd > 0.45:
        return None
    if warm and S > 0.20 and Lt > 0.22:
        return 0
    if warm and S > 0.10:
        return 1 if Lt < 0.42 else 0 if S > 0.16 else 2
    if Lt < 0.36 and S < 0.2:
        return 3
    if Lt < 0.58:
        return 2 if k in (0, 6) else 4 if k == 2 else 5
    return 5


OSM_MAT = {'roof_tiles': -1, 'tile': -1, 'tiles': -1, 'slate': 3, 'metal': 5, 'metal_sheet': 5, 'zinc': 5, 'copper': 5, 'tin': 5, 'concrete': 2,
           'tar_paper': 4, 'bitumen': 4, 'gravel': 4, 'glass': 7, 'grass': 6, 'eternit': 2, 'asbestos': 2}


def roof_classes(img, faces, k, osm_tags):
    """class, colour and flag of every roof face of one building: [(cls, '#rrggbb', cq)] - cq 1 from the picture, 2 material tagged in
    OpenStreetMap (colour still from the picture), (None, None, 0) where the picture does not show the face.
    faces: [(polygon in UTM, slope in degrees, area)]. The slopes of one roof are lit differently by the sun: a face in the shade takes
    the class and colour of the sunlit face of the same roof when both have the same kind of colour (one roof, one cover)."""
    info = []
    for pg, slope, area in faces:
        fc = img.face_colour(pg)
        if fc is None:
            info.append(None)
            continue
        c, veg, vnd = fc
        cls = classify(c, slope < 6.0, k, veg, vnd)
        info.append(None if cls is None else {'c': c, 'cls': cls, 'hsl': hsl(c), 'a': area, 'flat': slope < 6.0})
    seen = [q for q in info if q is not None and not q['flat']]
    if len(seen) >= 2:
        tot = sum(q['a'] for q in seen)
        big = [q for q in seen if q['a'] >= 0.15 * tot] or seen
        ref = max(big, key=lambda q: q['hsl'][2])
        for q in seen:
            if q is ref or q['hsl'][2] > ref['hsl'][2] - 0.04:
                continue
            dh = abs(q['hsl'][0] - ref['hsl'][0])
            dh = min(dh, 360 - dh)
            if (q['hsl'][1] < 0.13 and ref['hsl'][1] < 0.13) or (dh < 30 and q['hsl'][1] >= 0.08 and ref['hsl'][1] >= 0.10):
                q['cls'], q['c'] = ref['cls'], ref['c']
    mat = ((osm_tags or {}).get('roof:material') or '').lower()
    out = []
    for q in info:
        if q is None:
            out.append((None, None, 0))
            continue
        cls, cq = q['cls'], 1
        if mat in OSM_MAT:
            cq = 2
            m_ = OSM_MAT[mat]
            if m_ == -1:
                cls = cls if cls in (0, 1) else (1 if q['hsl'][2] < 0.42 else 0)
            elif m_ == 2 and q['flat']:
                cls = 4
            else:
                cls = m_
        out.append((cls, G.hexcol(q['c']), cq))
    return out


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

    def prefetch(self, keys, workers=2):
        """fetch the pictures of many tiles ahead (two requests at a time at most, each followed by its pause); returns how many are there"""
        from concurrent.futures import ThreadPoolExecutor
        layers = ['th_dop'] + (['th_dop20cir'] if self.cir else [])
        jobs = [(tx, ty, l_) for tx, ty in keys for l_ in layers
                if not os.path.exists(os.path.join(self.raw, f'{G.LEVEL}_{tx}_{ty}_{l_}.jpg'))]
        G.log('aerial images to fetch', len(jobs), 'of', len(keys) * len(layers))
        done = [0]

        def one(j):
            try:
                self._get(*j)
                done[0] += 1
                if done[0] % 100 == 0:
                    G.log('aerial images fetched', done[0], 'of', len(jobs))
                return True
            except Exception as ex:
                G.log('aerial image failed', j, repr(ex)[:160])
                return False
        with ThreadPoolExecutor(max(1, workers)) as ex:
            ok = sum(1 for r in ex.map(one, jobs) if r)
        return ok, len(jobs)

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
