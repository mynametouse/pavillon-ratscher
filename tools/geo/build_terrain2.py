# Part A/B (v2): terrain grids and orthophoto textures for the browser
#  inner: model-aligned 2.4 km square, 10 m, bare earth (DGM1) – real 3D trees and buildings stand on it
#  outer: model-aligned 24 km square, 120 m, surface (smoothed DOM1 inside the 3 km mosaic, Copernicus DSM beyond) so forests keep
#         their canopy on the skyline; earth curvature applied; a hole where the inner grid lies (shared edge = inner heights)
#  textures (UTM squares): near 640 m, inner 2.4 km, outer 10 km, far 24 km (Thuringian DOP), flight-block seams colour-matched
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from common import *
from PIL import Image, ImageFilter
from scipy import ndimage
from pyproj import Transformer
import tifffile
Image.MAX_IMAGE_PIXELS = None
H0 = json.load(open(os.path.join(OUT, 'h0.json')))['H0']
dgm = mosaic('dgm'); dom = mosaic('dom')
cmx, cmy = u2m(CX, CY); cmx, cmy = float(cmx), float(cmy)
GE, GN = m2u(2, 2); GE, GN = float(GE), float(GN)
# ---- inner (unchanged) ----
NI, SI = 241, 10.0
xs = cmx - 1200 + np.arange(NI) * SI; ys = cmy - 1200 + np.arange(NI) * SI
gx, gy = np.meshgrid(xs, ys); E, N = m2u(gx, gy); H = sample(dgm, E, N)
zi = (H - H0) * flat_k(gx, gy); d = np.maximum(np.abs(gx), np.abs(gy)); zi = np.where(d < 121.0, -0.02, zi)
# ---- outer: 24 km, 120 m ----
NO, SO = 201, 120.0
xo = cmx - 12000 + np.arange(NO) * SO; yo = cmy - 12000 + np.arange(NO) * SO
ox, oy = np.meshgrid(xo, yo); oE, oN = m2u(ox, oy)
with tifffile.TiffFile(os.path.join(DATA, 'cop30_N50_E010.tif')) as t: cop = t.pages[0].asarray().astype(np.float32)
toLL = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
def copH(E, N):
    lon, lat = toLL.transform(E, N); c = (lon - 10.0) / (1.5 / 3600) - 0.5; r = (51.0 - lat) / (1.0 / 3600) - 0.5
    c0 = np.clip(np.floor(c).astype(int), 0, cop.shape[1] - 2); r0 = np.clip(np.floor(r).astype(int), 0, cop.shape[0] - 2); fc = np.clip(c - c0, 0, 1); fr = np.clip(r - r0, 0, 1)
    return cop[r0, c0] * (1 - fc) * (1 - fr) + cop[r0, c0 + 1] * fc * (1 - fr) + cop[r0 + 1, c0] * (1 - fc) * fr + cop[r0 + 1, c0 + 1] * fc * fr
domS = ndimage.gaussian_filter(np.nan_to_num(dom, nan=float(np.nanmedian(dom))), 30)   # the surface, smoothed to the scale of the 120 m grid
inM = (oE > X0 + 5) & (oE < X0 + 2995) & (oN > Y1 - 2995) & (oN < Y1 - 5)
hc = copH(oE, oN); hd = np.where(inM, sample(domS, oE, oN), np.nan); off = float(np.nanmedian(hc[inM] - hd[inM])); print('COP - DOM(smooth) median', round(off, 2))
de = np.minimum.reduce([oE - X0, X0 + 3000 - oE, oN - (Y1 - 3000), Y1 - oN]); kb = smoothstep(0, 300, de) * inM
hb = np.where(inM, np.nan_to_num(hd) * kb + (hc - off) * (1 - kb), hc - off)
dist = np.hypot(ox - 2, oy - 2); zo = (hb - H0) * flat_k(ox, oy) - dist * dist / (2 * 6371000.0) * 0.87   # curvature with standard refraction
# the shared edge with the inner grid: exactly the inner heights (no cracks); inner square = outer indices 90..110
i0, i1 = int(round((cmx - 1200 - xo[0]) / SO)), int(round((cmx + 1200 - xo[0]) / SO)); assert abs(xo[i0] - xs[0]) < 1e-6 and abs(xo[i1] - xs[-1]) < 1e-6
for k in range(i0, i1 + 1):
    ii = int(round((xo[k] - xs[0]) / SI))
    zo[i0, k] = zi[0, ii]; zo[i1, k] = zi[-1, ii]; zo[k, i0] = zi[ii, 0]; zo[k, i1] = zi[ii, -1]
print('inner z', float(np.nanmin(zi)), float(np.nanmax(zi)), 'outer z', float(zo.min()), float(zo.max()))
def q(z): return np.clip(np.round(np.nan_to_num(z, nan=0.0) * 10), -32000, 32000).astype('<i2')
blob = q(zi).tobytes() + q(zo).tobytes(); open(os.path.join(OUT, 'terrain.bin'), 'wb').write(blob); print('terrain.bin', len(blob))
terr = {'inner': {'n': NI, 'step': SI, 'x0': float(xs[0]), 'y0': float(ys[0])}, 'outer': {'n': NO, 'step': SO, 'x0': float(xo[0]), 'y0': float(yo[0]), 'hole': [i0, i1]}, 'cm': [cmx, cmy]}
# ---- textures ----
NB = json.load(open(os.path.join(DATA, 'dop_near2.json')))   # 920 m around the garden and the village, 0.22 m per pixel
tex = {'near': {'e0': NB['e0'], 'n0': NB['n0'], 'w': NB['w']}, 'inner': {'e0': CX - 1200, 'n0': CY - 1200, 'w': 2400}, 'outer': {'e0': CX - 5000, 'n0': CY - 5000, 'w': 10000}, 'far': {'e0': CX - 12000, 'n0': CY - 12000, 'w': 24000}}
src = {'near': 'dop_near2.jpg', 'inner': 'dop_inner.jpg', 'outer': 'dop_outer.jpg', 'far': 'dop_far.jpg'}
imgs = {k: np.asarray(Image.open(os.path.join(DATA, f)).convert('RGB')).astype(np.float32) for k, f in src.items()}
def match(img, blk, ref, sb, sr):   # linear per-channel transform of the pixels in blk so that strip sb looks like strip sr
    for ch in range(3):
        ma, sa, mb, sbd = img[sb][..., ch].mean(), img[sb][..., ch].std(), img[sr][..., ch].mean(), img[sr][..., ch].std()
        v = img[..., ch]; v[blk] = (v[blk] - ma) * (sbd / max(sa, 1e-3)) + mb
# outer: two flight years (north darker) – match north to south at the seam row
o = imgs['outer']; rows = o.mean(axis=(1, 2)); dif = np.abs(np.convolve(np.diff(rows), np.ones(5) / 5, 'same')); seam = int(np.argmax(dif[50:-50]) + 50); print('outer seam row', seam, round(float(dif[seam]), 2))
if dif[seam] > 3:
    blk = np.zeros(o.shape[:2], bool); blk[:seam] = True; sb = np.zeros_like(blk); sb[max(0, seam - 120):seam - 4] = True; sr = np.zeros_like(blk); sr[seam + 4:seam + 120] = True
    match(o, blk, None, sb, sr)
# far (4096): blocks N (rows < 1792 west of col 3135, < 1619 east of it), SW (reference), E (rows >= 1619, cols >= 3135)
f = imgs['far']; Hh, Ww = f.shape[:2]; s = Hh / 4096.0; RH, RE, CV = int(1792 * s), int(1619 * s), int(3135 * s)
r_, c_ = np.mgrid[0:Hh, 0:Ww]
blkN = ((r_ < RH) & (c_ < CV)) | ((r_ < RE) & (c_ >= CV)); blkE = (r_ >= RE) & (c_ >= CV)
w = int(150 * s); g = int(4 * s)
match(f, blkN, None, (r_ >= RH - w) & (r_ < RH - g) & (c_ < CV), (r_ >= RH + g) & (r_ < RH + w) & (c_ < CV))
match(f, blkE, None, (c_ >= CV + g) & (c_ < CV + w) & (r_ >= RH), (c_ >= CV - w) & (c_ < CV - g) & (r_ >= RH))
imgs['far'] = np.clip(f, 0, 255)
# coarse to fine: one gain per channel so the borders do not show (far→outer→inner→near chain from the finest)
def region(img, t, e0, n0, w):
    T = tex[t]; px = img.shape[0] / T['w']; c0 = int((e0 - T['e0']) * px); r0 = int((T['n0'] + T['w'] - (n0 + w)) * px); n = int(w * px); return img[r0:r0 + n, c0:c0 + n]
for fine, coarse in (('near', 'inner'), ('inner', 'outer'), ('outer', 'far')):
    F = tex[fine]; cf = region(imgs[coarse], coarse, F['e0'], F['n0'], F['w']); ff = imgs[fine]
    gain = ff.reshape(-1, 3).mean(0) / np.maximum(cf.reshape(-1, 3).mean(0), 1); print('gain', coarse, 'to', fine, gain.round(3)); imgs[coarse] = np.clip(imgs[coarse] * gain, 0, 255)
os.makedirs(os.path.join(OUT, 'pub'), exist_ok=True)
for k, T in tex.items():
    im = Image.fromarray(imgs[k].astype(np.uint8))
    S_ = 4096 if k == 'near' else 2048
    if im.size[0] != S_: im = im.resize((S_, S_), Image.LANCZOS)
    if k in ('outer', 'far'): im = im.filter(ImageFilter.UnsharpMask(radius=1.2, percent=40, threshold=2))
    T['file'] = 'ortho_' + k + '.jpg'; im.save(os.path.join(OUT, 'pub', T['file']), quality=80, optimize=True, progressive=True)
    if k in ('near', 'outer', 'far'): T['lq'] = 'ortho_' + k + '_lq.jpg'; im.resize((S_ // 2, S_ // 2), Image.LANCZOS).save(os.path.join(OUT, 'pub', T['lq']), quality=82, optimize=True, progressive=True)
    print(k, os.path.getsize(os.path.join(OUT, 'pub', T['file'])))
meta = {'H0': H0, 'terrain': terr, 'tex': tex}
json.dump(meta, open(os.path.join(OUT, 'terrain_meta.json'), 'w'), indent=1)
Image.fromarray(imgs['far'].astype(np.uint8)).resize((900, 900)).save(os.path.join(OUT, 'v_far.jpg'), quality=80)
