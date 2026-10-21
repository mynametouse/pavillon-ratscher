# shared helpers for the Ratscher geodata build: transforms model <-> UTM32, the 1 m DGM/DOM mosaics, sampling
import json, os, io, zipfile, numpy as np, tifffile
HERE = os.path.dirname(os.path.dirname(os.path.abspath(__file__))); DATA = os.path.join(HERE, 'data'); OUT = os.path.join(HERE, 'out')
SP = os.path.dirname(HERE)
G = json.load(open(os.path.join(HERE, 'model2utm.json'))); A, B, EX, EY = G['a'], G['b'], G['ex'], G['ey']; S2 = A * A + B * B
def m2u(x, y): x = np.asarray(x, float); y = np.asarray(y, float); return A * x - B * y + EX, B * x + A * y + EY
def u2m(E, N): dx = np.asarray(E, float) - EX; dy = np.asarray(N, float) - EY; return (A * dx + B * dy) / S2, (-B * dx + A * dy) / S2
CX, CY = 625650.0, 5595500.0                       # centre of the inner and outer areas (UTM)
X0, Y1 = 624000.0, 5597000.0                       # mosaic: 3 x 3 km, 1 m, row 0 = north
def mosaic(kind):
    cache = os.path.join(OUT, kind + '_mosaic.npy')
    if os.path.exists(cache): return np.load(cache)
    M = np.full((3000, 3000), np.nan, np.float32)
    for ex in (624, 625, 626):
        for ny in (5594, 5595, 5596):
            z = zipfile.ZipFile(os.path.join(DATA, f'{kind}1_{ex}_{ny}.zip')); tif = [n for n in z.namelist() if n.endswith('.tif')][0]
            with tifffile.TiffFile(io.BytesIO(z.read(tif))) as t: a = t.pages[0].asarray().astype(np.float32); tp = t.pages[0].tags[33922].value
            a[a < -1000] = np.nan; r0 = int(round(Y1 - tp[4])); c0 = int(round(tp[3] - X0)); M[r0:r0 + a.shape[0], c0:c0 + a.shape[1]] = a
    np.save(cache, M); return M
def sample(M, E, N, x0=X0, y1=Y1, px=1.0):   # bilinear, pixel centres at (x0 + (c + 0.5) px, y1 - (r + 0.5) px)
    E = np.asarray(E, float); N = np.asarray(N, float); c = (E - x0) / px - 0.5; r = (y1 - N) / px - 0.5
    c0 = np.clip(np.floor(c).astype(int), 0, M.shape[1] - 2); r0 = np.clip(np.floor(r).astype(int), 0, M.shape[0] - 2); fc = np.clip(c - c0, 0, 1); fr = np.clip(r - r0, 0, 1)
    v = (M[r0, c0] * (1 - fc) * (1 - fr) + M[r0, c0 + 1] * fc * (1 - fr) + M[r0 + 1, c0] * (1 - fc) * fr + M[r0 + 1, c0 + 1] * fc * fr); return v
def smoothstep(a, b, x): t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)
def flat_k(x, y):   # the model's own ground is flat inside +-120 m around (0,0): real heights fade in from 121 m to 330 m (square distance)
    d = np.maximum(np.abs(np.asarray(x, float)), np.abs(np.asarray(y, float))); return smoothstep(121.0, 330.0, d)
