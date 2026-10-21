# Part A/B: terrain grids (inner 2.4 km from DGM1, outer 10 km from DGM1 + Copernicus DEM), orthophoto textures (colour-matched)
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from common import *
from PIL import Image, ImageFilter
from pyproj import Transformer
import tifffile
H0 = json.load(open(os.path.join(OUT, 'h0.json')))['H0']
dgm = mosaic('dgm')
cmx, cmy = u2m(CX, CY); cmx, cmy = float(cmx), float(cmy)
# ---- inner terrain: model-aligned grid, 10 m, +-1200 m around the centre ----
NI, SI = 241, 10.0
xs = cmx - 1200 + np.arange(NI) * SI; ys = cmy - 1200 + np.arange(NI) * SI
gx, gy = np.meshgrid(xs, ys)          # row = y (south → north), col = x
E, N = m2u(gx, gy); H = sample(dgm, E, N)
zi = (H - H0) * flat_k(gx, gy)
d = np.maximum(np.abs(gx), np.abs(gy)); zi = np.where(d < 121.0, -0.02, zi)
print('inner z', float(np.nanmin(zi)), float(np.nanmax(zi)))
# ---- outer terrain: 10 km, 80 m; DGM where the mosaic reaches, Copernicus DEM beyond (blended), slightly lowered under the inner area ----
NO, SO = 126, 80.0
xo = cmx - 5000 + np.arange(NO) * SO; yo = cmy - 5000 + np.arange(NO) * SO
ox, oy = np.meshgrid(xo, yo); oE, oN = m2u(ox, oy)
with tifffile.TiffFile(os.path.join(DATA, 'cop30_N50_E010.tif')) as t: cop = t.pages[0].asarray().astype(np.float32)
toLL = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
lon, lat = toLL.transform(oE, oN); hc = sample(cop, lon, lat, x0=10.0, y1=51.0, px=None) if False else None
# Copernicus: 1.5" x 1" cells, tie point (10E, 51N) = top-left corner
c = (lon - 10.0) / (1.5 / 3600) - 0.5; r = (51.0 - lat) / (1.0 / 3600) - 0.5
c0 = np.clip(np.floor(c).astype(int), 0, cop.shape[1] - 2); r0 = np.clip(np.floor(r).astype(int), 0, cop.shape[0] - 2); fc = c - c0; fr = r - r0
hc = cop[r0, c0] * (1 - fc) * (1 - fr) + cop[r0, c0 + 1] * fc * (1 - fr) + cop[r0 + 1, c0] * (1 - fc) * fr + cop[r0 + 1, c0 + 1] * fc * fr
# vertical datum / surface offset: median(COP - DGM) where both exist (fields are many, so the median is the ground offset)
inM = (oE > X0 + 5) & (oE < X0 + 2995) & (oN > Y1 - 2995) & (oN < Y1 - 5)
hd = np.where(inM, sample(dgm, oE, oN), np.nan); off = float(np.nanmedian(hc[inM] - hd[inM])); print('COP - DGM median', off)
# blend: DGM inside the mosaic (with a 300 m margin), Copernicus outside
de = np.minimum.reduce([oE - X0, X0 + 3000 - oE, oN - (Y1 - 3000), Y1 - oN]); kb = smoothstep(0, 300, de) * inM
hb = np.where(inM, np.nan_to_num(hd) * kb + (hc - off) * (1 - kb), hc - off)
zo = (hb - H0) * flat_k(ox, oy)
ini = (np.abs(ox - cmx) < 1200) & (np.abs(oy - cmy) < 1200); zo = np.where(ini, zo - 1.5, zo)
print('outer z', float(zo.min()), float(zo.max()))
meta = {'H0': H0, 'inner': {'n': NI, 'step': SI, 'x0': float(xs[0]), 'y0': float(ys[0])}, 'outer': {'n': NO, 'step': SO, 'x0': float(xo[0]), 'y0': float(yo[0])}, 'cm': [cmx, cmy]}
# heights as int16 decimetres (row-major, row = y)
def q(z): return np.clip(np.round(np.nan_to_num(z, nan=0.0) * 10), -32000, 32000).astype('<i2')
blob = q(zi).tobytes() + q(zo).tobytes(); open(os.path.join(OUT, 'terrain.bin'), 'wb').write(blob); print('terrain.bin', len(blob))
# ---- textures: UTM squares; JPEG row 0 = north ----
GE, GN = m2u(2, 2); GE, GN = float(GE), float(GN)
tex = {'near': {'file': 'ortho_near.jpg', 'e0': GE - 320, 'n0': GN - 320, 'w': 640}, 'inner': {'file': 'ortho_inner.jpg', 'e0': CX - 1200, 'n0': CY - 1200, 'w': 2400}, 'outer': {'file': 'ortho_outer.jpg', 'e0': CX - 5000, 'n0': CY - 5000, 'w': 10000}}
src = {'near': 'dop_near.jpg', 'inner': 'dop_inner.jpg', 'outer': 'dop_outer.jpg'}
imgs = {k: np.asarray(Image.open(os.path.join(DATA, f)).convert('RGB')).astype(np.float32) for k, f in src.items()}
# the outer mosaic has a seam between two flight years (north part darker): find the row where the colour jumps and match the north part to the south
o = imgs['outer']; rows = o.mean(axis=(1, 2)); dif = np.abs(np.convolve(np.diff(rows), np.ones(5) / 5, 'same')); seam = int(np.argmax(dif[50:-50]) + 50); print('outer seam row', seam, float(dif[seam]))
if dif[seam] > 3:
    a_ = o[max(0, seam - 120):seam - 4]; b_ = o[seam + 4:seam + 120]
    for ch in range(3):
        ma, sa, mb, sb = a_[..., ch].mean(), a_[..., ch].std(), b_[..., ch].mean(), b_[..., ch].std(); o[:seam, :, ch] = (o[:seam, :, ch] - ma) * (sb / max(sa, 1e-3)) + mb
    imgs['outer'] = np.clip(o, 0, 255)
# match the colours of the coarser textures to the finer ones where they overlap (one gain per channel), so the borders do not show
def region(img, t, e0, n0, w):   # crop of img (texture t) covering the UTM square (e0, n0, w)
    T = tex[t]; px = img.shape[0] / T['w']; c0 = int((e0 - T['e0']) * px); r0 = int((T['n0'] + T['w'] - (n0 + w)) * px); n = int(w * px); return img[r0:r0 + n, c0:c0 + n]
for fine, coarse in (('inner', 'outer'), ('near', 'inner')):
    F = tex[fine]; cf = region(imgs[coarse], coarse, F['e0'], F['n0'], F['w']); gain = imgs[fine].reshape(-1, 3).mean(0) / np.maximum(cf.reshape(-1, 3).mean(0), 1)
    print('gain', coarse, 'to', fine, gain.round(3)); imgs[coarse] = np.clip(imgs[coarse] * gain, 0, 255)
os.makedirs(os.path.join(OUT, 'pub'), exist_ok=True)
for k, T in tex.items():
    im = Image.fromarray(imgs[k].astype(np.uint8)); 
    if k == 'outer': im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
    im.save(os.path.join(OUT, 'pub', T['file']), quality=80, optimize=True, progressive=True); print(k, os.path.getsize(os.path.join(OUT, 'pub', T['file'])))
meta['tex'] = tex
json.dump(meta, open(os.path.join(OUT, 'terrain_meta.json'), 'w'), indent=1)
