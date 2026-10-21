# horizon profile seen from the garden (eye 1.7 m): which distances form the skyline?
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from common import *
import tifffile
from pyproj import Transformer
H0 = json.load(open(os.path.join(OUT, 'h0.json')))['H0']
with tifffile.TiffFile(os.path.join(DATA, 'cop30_N50_E010.tif')) as t: cop = t.pages[0].asarray().astype(np.float32)
toLL = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
GE, GN = m2u(2, 2); eye = H0 + 1.7
res = []
for az in range(0, 360, 2):
    a = np.radians(az); d = np.arange(60, 30000, 30.0); E = GE + np.sin(a) * d; N = GN + np.cos(a) * d
    lon, lat = toLL.transform(E, N); ok = lon < 11.0
    c = (lon - 10.0) / (1.5 / 3600) - 0.5; r = (51.0 - lat) / (1.0 / 3600) - 0.5
    h = np.where(ok, cop[np.clip(r.astype(int), 0, 3599), np.clip(c.astype(int), 0, 2399)], np.nan) - 1.27
    h = h - d * d / (2 * 6371000) * 0.87
    ang = np.degrees(np.arctan2(h - eye, d)); i = np.nanargmax(ang); res.append((az, round(float(ang[i]), 2), int(d[i]), bool(ok.all())))
far = [r for r in res if r[2] > 5000]
print('azimuths with skyline beyond 5 km:', len(far), 'of', len(res))
print([r for r in res][::5])
