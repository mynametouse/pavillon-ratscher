"""suhl-gruen: measured heights – the object-height model nDOM1 (surface minus terrain, 1 m; Thuringia, © GDI-Th, CC BY 4.0,
laser flights 2020–2025, fetched through easygeodata.de by tools/suhl/lib/easygeodata.py, only in GitHub Actions). The tiles lie as
<raw>/ndom1/ndom1_32_{E}_{N}.zip (1 km, the GeoTIFF inside, LERC: reading needs tifffile and imagecodecs).

Ndom(dir).window(box) gives the heights of a box on the 1 m grid (NaN where no tile lies); baeume.py uses it for the woody mask,
the tree tops, the heights; wald.py for the stand heights. Without tiles everything stays estimated – nothing else changes.
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
            m = re.search(r'(\d{3})_(\d{4})(?!\d)', os.path.basename(p))
            if m:
                self.files[(int(m.group(1)), int(m.group(2)))] = p
        self.cache = {}
        self.bad = 0

    def __bool__(self):
        return bool(self.files)

    def tile(self, key):
        """-> 1000 x 1000 float32 (row 0 = north) or None"""
        if key not in self.cache:
            if len(self.cache) >= 6:
                self.cache.pop(next(iter(self.cache)))
            p = self.files.get(key)
            a = None
            if p:
                try:
                    if p.lower().endswith('.zip'):
                        import fetch                       # tools/welt/fetch.py (read only): GeoTIFF or XYZ in a zip
                        arr, e0, n1, px = fetch.read_dgm1(p)
                    else:
                        import tifffile
                        with tifffile.TiffFile(p) as t:
                            pg = t.pages[0]
                            arr = pg.asarray().astype(np.float32)
                            tp, sc = pg.tags[33922].value, pg.tags[33550].value
                        arr[arr < -1000] = np.nan
                        e0, n1, px = float(tp[3]) - float(tp[0]) * float(sc[0]), float(tp[4]) + float(tp[1]) * float(sc[1]), float(sc[0])
                    ok = abs(px - 1.0) < 1e-6 and arr.shape == (1000, 1000) and abs(e0 - key[0] * 1000) < 0.6 and abs(n1 - (key[1] + 1) * 1000) < 0.6
                    if ok:
                        a = arr.astype(np.float32)
                    else:
                        glib.log('nDOM1 tile with an unexpected frame', p, arr.shape, e0, n1, px)
                        self.bad += 1
                except Exception as ex:
                    glib.log('nDOM1 tile unreadable', p, repr(ex)[:200])
                    self.bad += 1
            self.cache[key] = a
        return self.cache[key]

    def window(self, bb):
        """heights on the 1 m grid of a box with whole-metre edges (E0, N0, E1, N1) -> float32 (rows from the north), NaN = no data"""
        e0, n0, e1, n1 = (int(round(v)) for v in bb)
        out = np.full((n1 - n0, e1 - e0), np.nan, np.float32)
        for kx in range(e0 // 1000, (e1 - 1) // 1000 + 1):
            for ky in range(n0 // 1000, (n1 - 1) // 1000 + 1):
                a = self.tile((kx, ky))
                if a is None:
                    continue
                te0, tn1 = kx * 1000, (ky + 1) * 1000
                c0, c1 = max(e0, te0), min(e1, te0 + 1000)
                r0, r1 = max(n0, tn1 - 1000), min(n1, tn1)          # northings of the overlap
                out[n1 - r1:n1 - r0, c0 - e0:c1 - e0] = a[tn1 - r1:tn1 - r0, c0 - te0:c1 - te0]
        return out
