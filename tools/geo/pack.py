# Part F: final geo package for the browser → out/pub/: geo.json (manifest, water, labels), terrain.bin (water carved), buildings.bin, trees.bin
import sys, os, shutil; sys.path.insert(0, os.path.dirname(__file__)); from common import *
from matplotlib.path import Path
from PIL import Image
TM = json.load(open(os.path.join(OUT, 'terrain_meta.json'))); H0 = TM['H0']; T = TM['terrain']; I, O = T['inner'], T['outer']
raw = np.frombuffer(open(os.path.join(OUT, 'terrain.bin'), 'rb').read(), '<i2').astype(np.float32) / 10
zi = raw[:I['n'] ** 2].reshape(I['n'], I['n']).copy(); zo = raw[I['n'] ** 2:].reshape(O['n'], O['n']).copy()
xi = I['x0'] + np.arange(I['n']) * I['step']; yi = I['y0'] + np.arange(I['n']) * I['step']; xo = O['x0'] + np.arange(O['n']) * O['step']; yo = O['y0'] + np.arange(O['n']) * O['step']
def zAt(x, y):
    x = np.asarray(x, float); y = np.asarray(y, float); out = np.empty_like(x)
    for (Z, X0_, Y0_, st, n) in ((zo, O['x0'], O['y0'], O['step'], O['n']), (zi, I['x0'], I['y0'], I['step'], I['n'])):
        c = (x - X0_) / st; r = (y - Y0_) / st; ok = (c >= 0) & (c <= n - 1) & (r >= 0) & (r <= n - 1)
        c0 = np.clip(np.floor(c).astype(int), 0, n - 2); r0 = np.clip(np.floor(r).astype(int), 0, n - 2); fc = np.clip(c - c0, 0, 1); fr = np.clip(r - r0, 0, 1)
        v = Z[r0, c0] * (1 - fc) * (1 - fr) + Z[r0, c0 + 1] * fc * (1 - fr) + Z[r0 + 1, c0] * (1 - fc) * fr + Z[r0 + 1, c0 + 1] * fc * fr; out = np.where(ok, v, out) if Z is zi else v
    return out
osm = json.load(open(os.path.join(OUT, 'osm_meta.json')))
GX, GY = np.meshgrid(xi, yi); OX, OY = np.meshgrid(xo, yo); inI = lambda x, y: (x >= xi[0]) & (x <= xi[-1]) & (y >= yi[0]) & (y <= yi[-1])
water = []
for w in osm['water']:
    x = np.array(w['x']); y = np.array(w['y']); cx, cy = float(x.mean()), float(y.mean()); d = float(np.hypot(cx - 2, cy - 2))
    inner = bool(np.any(inI(x, y)))
    if not inner and w['area'] < 20000: continue
    if w['level'] is not None: z = (w['level'] - H0) * float(flat_k(cx, cy)) - d * d / (2 * 6371000.0) * 0.87
    else: z = float(np.percentile(zAt(x, y), 10)) - 0.3
    P = Path(np.stack([x, y], 1))
    for (Z, X, Y) in ((zi, GX, GY), (zo, OX, OY)):
        m = P.contains_points(np.stack([X.ravel(), Y.ravel()], 1)).reshape(X.shape); Z[m] = np.minimum(Z[m], z - 1.6)
    water.append({'name': w['name'], 'z': round(z, 2), 'x': w['x'], 'y': w['y'], 'tri': w['tri'], 'area': w['area']})
# shared edge again exactly the inner heights
i0, i1 = O['hole']
for k in range(i0, i1 + 1):
    ii = int(round((xo[k] - xi[0]) / I['step'])); zo[i0, k] = zi[0, ii]; zo[i1, k] = zi[-1, ii]; zo[k, i0] = zi[ii, 0]; zo[k, i1] = zi[ii, -1]
PUB = os.path.join(OUT, 'pub')
q = lambda z: np.clip(np.round(z * 10), -32000, 32000).astype('<i2')
open(os.path.join(PUB, 'terrain.bin'), 'wb').write(q(zi).tobytes() + q(zo).tobytes())
BM = json.load(open(os.path.join(OUT, 'bld_meta.json'))); G = json.load(open(os.path.join(os.path.dirname(OUT), 'model2utm.json')))
# compact int16 encoding: x, y in dm, z in cm; wall attributes u (dm), v (cm), top (cm), type + 4 * building; wall indices are implicit (4 vertices per segment)
b = open(os.path.join(OUT, 'buildings.bin'), 'rb').read(); nw, iw, nr, ir = BM['walls']['n'], BM['walls']['idx'], BM['roofs']['n'], BM['roofs']['idx']; o = 0
wp = np.frombuffer(b, '<f4', nw * 3, o).reshape(-1, 3); o += nw * 12; wt = np.frombuffer(b, '<f4', nw * 4, o).reshape(-1, 4); o += nw * 16; o += iw * 4
rp = np.frombuffer(b, '<f4', nr * 3, o).reshape(-1, 3); o += nr * 12; ri = np.frombuffer(b, '<u4', ir, o)
i16 = lambda a: np.clip(np.round(a), -32767, 32767).astype('<i2')
enc = lambda P: np.stack([i16(P[:, 0] * 10), i16(P[:, 1] * 10), i16(P[:, 2] * 100)], 1)
assert nw % 4 == 0 and iw in (0, nw // 4 * 6)
blob = enc(wp).tobytes() + np.stack([i16(wt[:, 0] * 10), i16(wt[:, 1] * 100), i16(wt[:, 2] * 100), i16(wt[:, 3])], 1).tobytes() + enc(rp).tobytes() + ri.astype('<u4').tobytes()
open(os.path.join(PUB, 'buildings.bin'), 'wb').write(blob)
t = np.frombuffer(open(os.path.join(OUT, 'trees.bin'), 'rb').read(), '<f4').reshape(-1, 6)
open(os.path.join(PUB, 'trees.bin'), 'wb').write(np.stack([i16(t[:, 0] * 10), i16(t[:, 1] * 10), i16(t[:, 3] * 100), i16(t[:, 4] * 100), i16(t[:, 5])], 1).tobytes())   # x, y (dm), height, crown radius (cm), conifer
mapt = {k: {'file': f'map_{k}.jpg'} for k in ('near', 'inner', 'outer')}
im = Image.open(os.path.join(PUB, 'map_outer.jpg')); im.resize((1024, 1024), Image.LANCZOS).save(os.path.join(PUB, 'map_outer_lq.jpg'), quality=84, optimize=True); mapt['outer']['lq'] = 'map_outer_lq.jpg'
labels = [l for l in osm['labels']]
for l in labels: l['z'] = round(float(zAt(l['x'], l['y'])), 1)
geo = {'v': 2, 'H0': round(H0, 3), 'xf': {'a': G['a'], 'b': G['b'], 'ex': G['ex'], 'ey': G['ey']}, 'terrain': {'file': 'terrain.bin', **T}, 'tex': TM['tex'], 'map': mapt,
       'bld': {'file': 'buildings.bin', 'walls': nw, 'roofs': nr, 'ridx': ir, 'n': BM['buildings'], 'enc': 'i16'}, 'trees': {'file': 'trees.bin', 'n': BM['trees'], 'enc': 'i16x5'}, 'water': water, 'labels': labels,
       'site': {'x0': -50, 'x1': 42, 'y0': -52, 'y1': 48}}
import base64
for f in ('terrain', 'buildings', 'trees'):
    b = open(os.path.join(PUB, f + '.bin'), 'rb').read(); json.dump({'b64': base64.b64encode(b).decode()}, open(os.path.join(PUB, f + '.b64.json'), 'w')); os.remove(os.path.join(PUB, f + '.bin'))
geo['terrain']['file'] = 'terrain.b64.json'; geo['bld']['file'] = 'buildings.b64.json'; geo['trees']['file'] = 'trees.b64.json'
json.dump(geo, open(os.path.join(PUB, 'geo.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
print('water', len(water), [(w['name'], w['z'], w['area']) for w in water if w['area'] > 5000][:8])
print({f: os.path.getsize(os.path.join(PUB, f)) for f in sorted(os.listdir(PUB))})
