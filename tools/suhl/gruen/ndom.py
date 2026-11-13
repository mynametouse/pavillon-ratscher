"""suhl-gruen: the switch for measured heights – the object-height model nDOM1 (surface minus terrain, 1 m; Thuringia, © GDI-Th,
CC BY 4.0, through easygeodata.de once the key EASYGEODATA_KEY exists). Give stadt.py `--ndom DIR` with 1 km tiles in DIR (GeoTIFF
or the state's zip with GeoTIFF/XYZ, the tile's lower-left corner in km in the file name as `…32_{E}_{N}…` or `…_{E}_{N}_…`):
tree heights then come from the highest point of the model under the crown, the flag "height measured" is set, and trees stay
estimated where no tile lies. NOT YET RUN AGAINST REAL DATA (no key on 13.11.2026) – the reader follows tools/welt/fetch.read_dgm1.
"""
import glob, os, re, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glib


class Ndom:
    def __init__(self, d):
        self.files = {}
        for p in sorted(glob.glob(os.path.join(d, '**', '*'), recursive=True)):
            if not p.lower().endswith(('.tif', '.tiff', '.zip')):
                continue
            m = re.search(r'(?:32_)?(\d{3})_(\d{4})(?!\d)', os.path.basename(p))
            if m:
                self.files[(int(m.group(1)), int(m.group(2)))] = p
        self.cache = {}
        glib.log(f'nDOM1: {len(self.files)} tiles in {d}')

    def tile(self, key):
        if key not in self.cache:
            if len(self.cache) > 6:
                self.cache.pop(next(iter(self.cache)))
            p = self.files.get(key)
            a = None
            if p:
                try:
                    if p.lower().endswith('.zip'):
                        import fetch                       # tools/welt/fetch.py (read only)
                        a = fetch.read_dgm1(p)
                    else:
                        import tifffile
                        with tifffile.TiffFile(p) as t:
                            pg = t.pages[0]
                            arr = pg.asarray().astype(np.float32)
                            tp, sc = pg.tags[33922].value, pg.tags[33550].value
                        arr[arr < -100] = np.nan
                        a = (arr, float(tp[3]) - float(tp[0]) * float(sc[0]), float(tp[4]) + float(tp[1]) * float(sc[1]), float(sc[0]))
                except Exception as ex:
                    glib.log('nDOM1 tile unreadable', p, ex)
            self.cache[key] = a
        return self.cache[key]

    def __call__(self, E, N, r):
        """the highest model value within min(r, 4 m) of every tree; NaN where there is no tile"""
        from scipy import ndimage as ndi
        E, N, r = np.asarray(E, float), np.asarray(N, float), np.asarray(r, float)
        out = np.full(len(E), np.nan)
        kx, ky = np.floor(E / 1000).astype(int), np.floor(N / 1000).astype(int)
        for key in set(zip(kx.tolist(), ky.tolist())):
            t = self.tile(key)
            if t is None:
                continue
            a, e0, n1, px = t
            m = (kx == key[0]) & (ky == key[1])
            for rad in (1, 2, 3, 4):
                sel = m & (np.clip(np.round(r), 1, 4) == rad)
                if not sel.any():
                    continue
                mx = ndi.maximum_filter(np.nan_to_num(a, nan=0.0), size=2 * int(rad / px) + 1)
                c = np.clip(((E[sel] - e0) / px).astype(int), 0, a.shape[1] - 1)
                rr = np.clip(((n1 - N[sel]) / px).astype(int), 0, a.shape[0] - 1)
                out[sel] = mx[rr, c]
        return out
