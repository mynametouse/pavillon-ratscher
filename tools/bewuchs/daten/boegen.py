"""Check sheets: the orthophoto with the classes drawn over it, half transparent, with a legend – for the square and close-ups. They
show the orthophoto, so they go to the report folder, never into the repo."""
import os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemeinsam import COLOURS, NAMES_DE  # noqa: E402

_FONT = None


def font(size=14):
    global _FONT
    for p in ('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/dejavu/DejaVuSans.ttf'):
        if os.path.exists(p):
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


def overlay(rgb, cls, alpha=0.5, vig=None):
    """RGB (h, w, 3) uint8 and classes (h, w) → blended image; class 0 stays the photo, darkened a little"""
    lut = np.zeros((256, 3), np.float32)
    for k, c in COLOURS.items():
        lut[k] = c
    col = lut[cls]
    a = np.where(cls == 0, 0.0, alpha)[..., None]
    out = rgb.astype(np.float32) * (1 - a) + col * a
    out[cls == 0] *= 0.75
    return np.clip(out, 0, 255).astype(np.uint8)


def legend(classes, w=260, fs=14):
    rows = [k for k in sorted(classes)]
    img = Image.new('RGB', (w, 10 + len(rows) * (fs + 8)), (255, 255, 255))
    d = ImageDraw.Draw(img)
    f = font(fs)
    for n, k in enumerate(rows):
        y = 5 + n * (fs + 8)
        d.rectangle([6, y, 6 + fs + 4, y + fs + 2], fill=COLOURS[k], outline=(0, 0, 0))
        d.text((16 + fs, y), f'{k} {NAMES_DE[k]}', fill=(0, 0, 0), font=f)
    return img


def sheet(path, rgb, cls, title='', scale=1.0, alpha=0.5, side=True, grid=None):
    """one sheet: photo | photo + classes, legend and title; grid = (px per cell, labels) draws the 400 m cells"""
    ov = overlay(rgb, cls, alpha)
    A = Image.fromarray(rgb)
    Bm = Image.fromarray(ov)
    if scale != 1.0:
        sz = (max(1, int(A.width * scale)), max(1, int(A.height * scale)))
        A = A.resize(sz, Image.LANCZOS)
        Bm = Bm.resize(sz, Image.NEAREST if scale > 1 else Image.LANCZOS)
    if grid:
        d = ImageDraw.Draw(Bm)
        step, labels = grid
        s = step * scale
        for k in range(0, int(Bm.width / s) + 1):
            d.line([(k * s, 0), (k * s, Bm.height)], fill=(255, 255, 255), width=1)
        for k in range(0, int(Bm.height / s) + 1):
            d.line([(0, k * s), (Bm.width, k * s)], fill=(255, 255, 255), width=1)
        f = font(12)
        for (u, v), t in labels.items():
            d.text((u * s + 4, v * s + 3), t, fill=(255, 255, 255), font=f)
    L = legend(set(np.unique(cls).tolist()) | {0})
    tw = (A.width + 10 if side else 0) + Bm.width + L.width + 20
    th = max(A.height, Bm.height, L.height) + 40
    out = Image.new('RGB', (tw, th), (255, 255, 255))
    x = 5
    if side:
        out.paste(A, (x, 35))
        x += A.width + 10
    out.paste(Bm, (x, 35))
    out.paste(L, (x + Bm.width + 10, 35))
    ImageDraw.Draw(out).text((8, 8), title, fill=(0, 0, 0), font=font(18))
    out.save(path, quality=88)
    return path
