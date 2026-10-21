# prototype of the oak painter (numpy): end grain tiles and long grain faces; iterate here, then port to werk/werk.js
import numpy as np
from PIL import Image
rng = np.random.default_rng(3)
def lamellae(W=400):
    out = []; v = 0
    while v < W - 0.5:
        w = 40 + rng.random() * 24
        if W - (v + w) < 28: w = W - v
        quart = rng.random() < 0.3
        out.append(dict(v0=v, w=w, tone=0.9 + rng.random() * 0.18, hue=rng.random() * 2 - 1, quart=quart,
            pv=(-90 - rng.random() * 220 if rng.random() < 0.5 else w + 90 + rng.random() * 220) if quart else w * (0.15 + rng.random() * 0.7),
            pw=12 + rng.random() * 16 if quart else (-70 - rng.random() * 230 if rng.random() < 0.5 else 110 + rng.random() * 230),
            ring=1.5 + rng.random() * 1.9, ph=rng.random() * 60))
        v += w
    return out
LAM = lamellae()
def hsh(a, b):
    a = a.astype(np.int64); b = b.astype(np.int64)
    h = (a * 374761393 + b * 668265263) & 0xffffffff
    h = ((h ^ (h >> 13)) * 1274126177) & 0xffffffff
    return ((h ^ (h >> 16)) & 0xffffffff) / 4294967296.0
def lam_fields(v):
    idx = np.zeros(v.shape, int); acc = 0
    for i, l in enumerate(LAM): idx[v >= l.v0] = i if False else idx[v >= l['v0']]
    return idx
def end_color(v, w, px):   # px: pixels per mm (for anti-aliasing of the rings)
    out = np.zeros(v.shape + (3,))
    for i, l in enumerate(LAM):
        m = (v >= l['v0']) & (v < l['v0'] + l['w'] + (1e9 if i == len(LAM) - 1 else 0))
        if not m.any(): continue
        dv = v[m] - l['v0'] - l['pv']; dw = w[m] - l['pw']; r = np.hypot(dv, dw); ang = np.arctan2(dw, dv)
        rg = r / l['ring'] + 0.06 * np.sin(ang * 5 + l['ph'])
        f = rg - np.floor(rg)
        period_px = l['ring'] * px; aa = np.clip((period_px - 1.6) / 2.4, 0, 1)   # rings fade where they come close to the pixel size
        k = l['tone'] * 0.82 * np.ones_like(r)
        # latewood darker and denser, earlywood a band of pores (seen as dark dots)
        ring = 0.5 + 0.5 * np.cos(2 * np.pi * (f - 0.1))
        k *= 1 - 0.09 * aa * ring
        pore = (f < 0.22) & (hsh(np.floor(v[m] * 2.2), np.floor(w[m] * 2.2)) < 0.32)
        k[pore] *= 1 - 0.22 * aa[...] if np.ndim(aa) else 1 - 0.22 * aa
        # broad rays: short light dashes along the radius
        rid = np.floor(ang * 57.3 * 0.55 + np.sin(r * 0.05) * 0.4 + l['ph'])
        rf = ang * 57.3 * 0.55 + np.sin(r * 0.05) * 0.4 + l['ph'] - rid
        seg = hsh(rid, np.floor(r / 3.0)) < 0.55
        k[(rf < 0.07) & seg] *= 1.12
        k *= 0.97 + 0.06 * hsh(np.floor(v[m] * 4), np.floor(w[m] * 4 + 7))
        c = np.stack([202 * k + l['hue'] * 6, 160 * k, 110 * k - l['hue'] * 6], -1)
        out[m] = c
    return out
def long_color(v, w, u, px):
    out = np.zeros(v.shape + (3,))
    for i, l in enumerate(LAM):
        m = (v >= l['v0']) & (v < l['v0'] + l['w'] + (1e9 if i == len(LAM) - 1 else 0))
        if not m.any(): continue
        dv = v[m] - l['v0'] - l['pv']; dw = w[m] - l['pw']; r = np.hypot(dv, dw); uu = u[m]
        rg = r / l['ring'] + 0.55 * np.sin(uu * 0.0042 + l['ph']) + 0.18 * np.sin(uu * 0.017 + l['ph'] * 2.3)
        f = rg - np.floor(rg)
        k = l['tone'] * np.ones_like(r)
        ring = 0.5 + 0.5 * np.cos(2 * np.pi * (f - 0.1)); k *= 1 - 0.1 * ring
        # pores as short dark dashes along the grain
        pd = hsh(np.floor(uu / 2.5), np.floor((v[m] + w[m]) * 1.6)) < 0.12
        k[pd & (f < 0.3)] *= 0.86
        # fine streaks along the grain
        k *= 0.96 + 0.08 * hsh(np.floor(uu / 40), np.floor((v[m] * 3 + w[m] * 3)))
        if l['quart']:
            fl = (hsh(np.floor(uu / 14), np.floor(r * 0.6)) < 0.12) & ((uu / 14 - np.floor(uu / 14)) < 0.5)
            k[fl] *= 1.1
        c = np.stack([202 * k + l['hue'] * 6, 160 * k, 110 * k - l['hue'] * 6], -1)
        out[m] = c
    return out
# end grain board: 10 slices × 8 strips, each tile = strip cross-section (a along X = v, b along Y = w)
px = 1.6; Zp = 43; L = 10 * Zp; Wd = 320
xs = np.arange(int(L * px)) / px; ys = np.arange(int(Wd * px)) / px; X, Y = np.meshgrid(xs, ys)
j = np.floor(X / Zp); z = X - j * Zp; flip = (j % 2) == 1
z = np.where(flip, Zp - z, z); Yl = np.where(flip, Wd - Y, Y)
i = np.clip(np.floor(Yl / 40), 0, 7); b = Yl - i * 40; fb = (i % 2) == 1; w = np.where(fb, 40 - b, b)
v = i * 48.2 + z + 1
img = end_color(v, w, px)
gl = (b < 0.6 / px) | (40 - b < 0.6 / px) | (np.abs(X - np.round(X / Zp) * Zp) < 0.6 / px)
img[gl] *= 0.78
Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)).save('end.png')
# long grain face 500 × 400 (panel top, w = 40)
px2 = 0.77; xs = np.arange(int(500 * px2)) / px2; ys = np.arange(int(400 * px2)) / px2; U, Vv = np.meshgrid(xs, ys)
img2 = long_color(Vv, np.full(U.shape, 40.0), U, px2)
Image.fromarray(np.clip(img2, 0, 255).astype(np.uint8)).save('long.png')
# a close crop of the end grain at 4 px/mm
px3 = 4; xs = np.arange(int(2 * Zp * px3)) / px3; ys = np.arange(int(80 * px3)) / px3; X, Y = np.meshgrid(xs, ys)
j = np.floor(X / Zp); z = X - j * Zp; i = np.floor(Y / 40); b = Y - i * 40; v = i * 48.2 + z + 1
img3 = end_color(v, b, px3); Image.fromarray(np.clip(img3, 0, 255).astype(np.uint8)).save('end_close.png')
print('ok')
