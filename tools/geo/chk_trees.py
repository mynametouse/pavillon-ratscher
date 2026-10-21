import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from common import *
from PIL import Image
T = np.frombuffer(open(os.path.join(OUT, 'trees.bin'), 'rb').read(), '<f4').reshape(-1, 6)
print('n', len(T), 'h pct', np.percentile(T[:, 3], [5, 25, 50, 75, 95]).round(1), 'r pct', np.percentile(T[:, 4], [5, 50, 95]).round(1))
cir = np.asarray(Image.open(os.path.join(DATA, 'cir_inner.jpg')).convert('RGB')).astype(np.float32)
dop = np.asarray(Image.open(os.path.join(DATA, 'dop_inner.jpg')).convert('RGB').resize((2400, 2400), Image.BILINEAR)).astype(np.float32)
E, N = m2u(T[:, 0], T[:, 1]); c = np.clip((E - (CX - 1200)).astype(int), 0, 2399); r = np.clip(((CY + 1200) - N).astype(int), 0, 2399)
br = dop[r, c].mean(1); nir = cir[r, c, 0]; red = cir[r, c, 1]; g = dop[r, c, 1]
nd = (nir - red) / np.maximum(nir + red, 1)
print('bright pct', np.percentile(br, [5, 25, 50, 75, 95]).round(0)); print('nir pct', np.percentile(nir, [5, 25, 50, 75, 95]).round(0)); print('ndvi pct', np.percentile(nd, [5, 25, 50, 75, 95]).round(2))
# 2D histogram brightness vs NIR
H, xe, ye = np.histogram2d(br, nir, bins=[np.arange(0, 200, 20), np.arange(0, 260, 30)])
print('rows=bright bins', xe.astype(int)); print('cols=nir bins', ye.astype(int)); print(H.astype(int))
print('dop img size', Image.open(os.path.join(DATA, 'dop_inner.jpg')).size)
