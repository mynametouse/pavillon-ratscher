# Hubert's textures from Rocketbox Construction_Male_01 (m111): his face without the grey full beard but with a moustache (lower face of
# Medical_Male_03, m153: its fine detail on m111's skin colour), a few more lines on the forehead, the dark hair kept; the jeans turned into
# grey-olive work trousers.
#   python3 -I hubert_tex.py <m111 head tga> <m153 head tga> <m111 body tga> <out dir> [preview dir]
import sys, os
import numpy as np
import cv2
from PIL import Image

A_f, B_f, BODY_f, OUT = sys.argv[1:5]
PV = sys.argv[5] if len(sys.argv) > 5 else None
os.makedirs(OUT, exist_ok=True)

def load(f):
    return np.asarray(Image.open(f).convert('RGB')).astype(np.float32) / 255.0

def sat(a):
    mx = a.max(axis=2); mn = a.min(axis=2)
    return (mx - mn) / np.maximum(mx, 1e-4), mx

def blur(m, s):   # float Gaussian, sigma s px
    return cv2.GaussianBlur(np.ascontiguousarray(m, np.float32), (0, 0), s, borderType=cv2.BORDER_REFLECT)

def box(h, w, x0, x1, y0, y1, feather=0):
    yy, xx = np.mgrid[0:h, 0:w]
    xn, yn = xx / w, yy / h
    m = ((xn > x0) & (xn < x1) & (yn > y0) & (yn < y1)).astype(np.float32)
    return blur(m, feather) if feather else m

def field(img, m):
    """colour field of img where m=1, spread smoothly into the rest (normalized convolution, finest scale that reaches)"""
    out = np.zeros_like(img); got = np.zeros(m.shape, np.float32)
    for s in (16, 32, 64, 128, 256, 512):
        num = blur(img * m[..., None], s); den = blur(m, s)
        est = num / np.maximum(den, 1e-6)[..., None]
        take = (got < 0.5) & (den > 0.08)
        out[take] = est[take]; got[take] = 1
    rest = got < 0.5
    out[rest] = img[m > 0.5].mean(axis=0)
    return blur(out, 6)

lum = lambda a: 0.30 * a[..., 0] + 0.59 * a[..., 1] + 0.11 * a[..., 2]
A = load(A_f); B = load(B_f)
h, w, _ = A.shape
SA, VA = sat(A); SB, VB = sat(B)
# --- where the new lower face goes: A's beard (grey: low saturation) in the jaw region, grown and softened, plus the box below the nose ---
beard = ((SA < 0.26) & (VA > 0.25)).astype(np.float32) * box(h, w, 0.22, 0.78, 0.30, 0.70)
beard = np.minimum(1, blur(np.minimum(1, blur(beard, 10) * 3.0), 10))
lower = np.maximum(box(h, w, 0.26, 0.74, 0.355, 0.60, 22), beard) * (VB > 0.12)
# --- colour: B's detail up to ~50 px (pores, folds, moustache, lips) on the skin colour of A around the beard ---
skinA = ((SA > 0.28) & (VA > 0.33) & (beard < 0.03)).astype(np.float32) * box(h, w, 0.18, 0.82, 0.10, 0.72)
skinA *= 1 - box(h, w, 0.24, 0.76, 0.33, 0.63)   # nothing from inside the beard area (stubble at its edge darkens it)
C = field(A, skinA)
lb = lum(B)
LB = lum(C) + (lb - blur(lb, 50)) * 1.05
Bm = np.clip(C * (LB / np.maximum(lum(C), 1e-3))[..., None], 0, 1)
out = A * (1 - lower[..., None]) + Bm * lower[..., None]
# --- forehead and eyes: the fine lines of B (high-pass) on A's skin – a few years more ---
hpB = B - blur(B, 6)
fore = blur(box(h, w, 0.31, 0.69, 0.14, 0.36, 12) * ((SA > 0.22) & (VA > 0.30)), 4)
out = np.clip(out + hpB * 0.9 * fore[..., None], 0, 1)
Image.fromarray((out * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, 'm111_head_color.tga'))
# --- body: the jeans (two blocks at the top) become grey-olive work trousers; belt, shirt, boots stay ---
Bd = load(BODY_f)
hb, wb, _ = Bd.shape
blue = (Bd[..., 2] >= Bd[..., 0]) & (Bd[..., 2] >= Bd[..., 1] - 0.02)
legs = (box(hb, wb, -0.01, 0.282, 0.015, 0.425) + box(hb, wb, 0.718, 1.01, 0.015, 0.425)) > 0.5
m = blur((legs & blue).astype(np.float32), 1.5)
L = 0.30 * Bd[..., 0] + 0.50 * Bd[..., 1] + 0.20 * Bd[..., 2]
work = np.clip((L[..., None] * 0.92 + 0.035) * np.array([0.80, 0.80, 0.66], np.float32), 0, 1)
Bd2 = Bd * (1 - m[..., None]) + work * m[..., None]
Image.fromarray((Bd2 * 255 + 0.5).astype(np.uint8)).save(os.path.join(OUT, 'm111_body_color.tga'))
if PV:
    os.makedirs(PV, exist_ok=True)
    cr = (int(w * .22), 0, int(w * .78), int(h * .66))
    f = Image.fromarray((out * 255).astype(np.uint8)).crop(cr).resize((640, 754))
    a = Image.fromarray((A * 255).astype(np.uint8)).crop(cr).resize((640, 754))
    sh = Image.new('RGB', (1280, 754)); sh.paste(a, (0, 0)); sh.paste(f, (640, 0)); sh.save(os.path.join(PV, 'hubert_face.jpg'), quality=88)
    Image.fromarray((Bd2 * 255).astype(np.uint8)).resize((720, 720)).save(os.path.join(PV, 'hubert_body.jpg'), quality=88)
print('ok', OUT)
