#!/usr/bin/env python3
"""suhl-boden: picture sheets of a ground tile set, to look at (at most 1024 px each; they go to the scratch branch ref/suhl-boden,
never to the work branch).

  python3 -I tools/suhl/boden/bogen.py --set DIR --out DIR [--at E,N] [--name probe]

  <name>_1_markt12.jpg     the 2 x 2 level-12 tiles around a point (default: the centre of Suhl) at full resolution (20 cm)
  <name>_2_stufe11.jpg     the level-11 tiles around it (up to 8 x 8) with the frame of the level-12 list
  <name>_3_gelaende.jpg    the same area as a hillshade of the terrain tiles (level 11), contour lines every 10 m
  <name>_4_fern.jpg        the coarse levels 9, 8, 7, 6 around the point, one tile each
  <name>_5_listen.png      the tile lists of all levels as a map (which tiles exist)
Aerial image: (c) GDI-Th, CC BY 4.0. Terrain: see ATTRIBUTION.md of the set.
"""
import argparse, json, os, sys
import numpy as np
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blib
from blib import tbounds, tsize, wlib
import tiles as wtiles


def img(setdir, L, x, y, px):
    p = os.path.join(setdir, 'i', str(L), str(x), f'{y}.webp')
    if not os.path.exists(p):
        return Image.new('RGB', (px, px), (70, 70, 80))
    im = Image.open(p).convert('RGB')
    return im if px == im.size[0] else im.resize((px, px), Image.LANCZOS)


def heights(setdir, L, x, y):
    p = os.path.join(setdir, 't', str(L), str(x), f'{y}.bin')
    return wtiles.decode_heights(open(p, 'rb').read()) if os.path.exists(p) else None


def mosaic(setdir, L, x0, y0, nx, ny, px):
    im = Image.new('RGB', (nx * px, ny * px), (70, 70, 80))
    for j in range(ny):
        for i in range(nx):
            im.paste(img(setdir, L, x0 + i, y0 + j, px), (i * px, (ny - 1 - j) * px))
    return im


def label(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 7 * len(text) + 8, 15], fill=(0, 0, 0))
    d.text((4, 2), text, fill=(255, 255, 255))
    return im


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--set', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--at', default='')
    ap.add_argument('--name', default='boden')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    meta = json.load(open(os.path.join(a.set, 'meta.json'), encoding='utf-8'))
    T = {int(L): {tuple(t) for t in v['has']} for L, v in meta['tiling']['levels'].items()}
    E, N = [float(v) for v in a.at.split(',')] if a.at else blib.CENTRE
    made = []

    def save(im, name, q=86):
        p = os.path.join(a.out, f'{a.name}_{name}')
        im.save(p, quality=q) if name.endswith('.jpg') else im.save(p)
        made.append(p)

    # 1: 2 x 2 level-12 tiles around the point
    x, y = blib.tile_of(12, E - 50, N - 50)
    im = mosaic(a.set, 12, x, y, 2, 2, 512)
    e0, n0 = tbounds(12, x, y)[:2]
    save(label(im, f'Stufe 12 (20 cm)  E {e0:.0f}..{e0 + 200:.0f}  N {n0:.0f}..{n0 + 200:.0f}  (c) GDI-Th'), '1_markt12.jpg')
    # 2: level 11 around it, 8 x 8 tiles (1.6 km), with the frame of level 12
    x, y = blib.tile_of(11, E, N)
    x0, y0 = x - 4 + (x & 1), y - 4 + (y & 1)
    im = mosaic(a.set, 11, x0, y0, 8, 8, 128)
    d = ImageDraw.Draw(im)
    for tx, ty in T.get(12, ()):
        if (tx >> 1, ty >> 1) in T[11] and x0 <= tx >> 1 < x0 + 8 and y0 <= ty >> 1 < y0 + 8:
            u, v = (tx - 2 * x0) * 64, (2 * (y0 + 8) - 1 - ty) * 64
            if (tx - 1, ty) not in T[12]:
                d.line([u, v, u, v + 64], fill=(255, 220, 0), width=2)
            if (tx + 1, ty) not in T[12]:
                d.line([u + 63, v, u + 63, v + 64], fill=(255, 220, 0), width=2)
            if (tx, ty + 1) not in T[12]:
                d.line([u, v, u + 64, v], fill=(255, 220, 0), width=2)
            if (tx, ty - 1) not in T[12]:
                d.line([u, v + 63, u + 64, v + 63], fill=(255, 220, 0), width=2)
    e0, n0 = tbounds(11, x0, y0)[:2]
    cu, cv = (E - e0) / 1600 * 1024, (n0 + 1600 - N) / 1600 * 1024
    d.ellipse([cu - 6, cv - 6, cu + 6, cv + 6], outline=(255, 0, 0), width=2)
    save(label(im, f'Stufe 11 (39 cm)  E {e0:.0f}..{e0 + 1600:.0f}  N {n0:.0f}..{n0 + 1600:.0f}  gelb: Rand der Stufe 12'), '2_stufe11.jpg')
    # 3: hillshade of the terrain (level 11), contours every 10 m
    Hh = np.full((8 * 100 + 1, 8 * 100 + 1), np.nan)
    for j in range(8):
        for i in range(8):
            h = heights(a.set, 11, x0 + i, y0 + j)
            if h is not None:
                Hh[j * 100:j * 100 + 101, i * 100:i * 100 + 101] = h
    Hh = Hh[::-1]                                    # row 0 = north
    ok = np.isfinite(Hh)
    Hf = np.where(ok, Hh, np.nanmean(Hh))
    gy, gx = np.gradient(Hf, 2.0)                    # 2 m samples; rows run south
    shade = np.clip(0.55 + 0.9 * (-gx + gy) / np.sqrt(2), 0.05, 1.0)       # light from the north-west
    rgb = np.stack([shade * 235, shade * 232, shade * 220], -1)
    lev = np.floor((Hf + meta['H0']) / 10)
    edge = (np.abs(np.diff(lev, axis=0, prepend=lev[:1])) + np.abs(np.diff(lev, axis=1, prepend=lev[:, :1]))) > 0
    rgb[edge] = rgb[edge] * 0.55 + np.array([120, 60, 20]) * 0.45
    rgb[~ok] = (70, 70, 80)
    im = Image.fromarray(rgb.astype(np.uint8)).resize((1024, 1024), Image.LANCZOS)
    save(label(im, f'Gelände Stufe 11 (2 m), Höhenlinien 10 m, {np.nanmin(Hh) + meta["H0"]:.0f}..{np.nanmax(Hh) + meta["H0"]:.0f} m NHN, '
                   f'Quelle {meta["sources"].get("terrain_source")}'), '3_gelaende.jpg')
    # 4: the coarse levels, one tile each
    im = Image.new('RGB', (1024, 1024), (40, 40, 40))
    for k, L in enumerate((9, 8, 7, 6)):
        tx, ty = blib.tile_of(L, E, N)
        t = img(a.set, L, tx, ty, 512)
        label(t, f'Stufe {L}: {tsize(L) / 1000:.1f} km, {tsize(L) / 512:.1f} m/px')
        im.paste(t, ((k % 2) * 512, (k // 2) * 512))
    save(im, '4_fern.jpg')
    # 5: the lists
    r6 = blib.rect_of(T[min(T)])
    Lm = min(T)
    b = tbounds(Lm, r6[0], r6[1])[:2] + tbounds(Lm, r6[2], r6[3])[2:]
    sc = 1000.0 / max(b[2] - b[0], b[3] - b[1])
    W, Hp = int((b[2] - b[0]) * sc) + 1, int((b[3] - b[1]) * sc) + 1
    im = Image.new('RGB', (W, Hp), (255, 255, 255))
    d = ImageDraw.Draw(im)
    col = {6: (235, 235, 235), 7: (215, 215, 215), 8: (190, 205, 190), 9: (160, 200, 160), 10: (120, 180, 230), 11: (250, 190, 90), 12: (220, 60, 50)}
    for L in sorted(T):
        s = tsize(L)
        for tx, ty in T[L]:
            e0, n0 = tbounds(L, tx, ty)[:2]
            d.rectangle([(e0 - b[0]) * sc, (b[3] - n0 - s) * sc, (e0 + s - b[0]) * sc - (1 if L <= 9 else 0), (b[3] - n0) * sc - (1 if L <= 9 else 0)], fill=col[L])
    try:
        G, places, _ = blib.areas()
        for g, c in ((G['stadt'], (0, 0, 0)), (G['kernstadt'], (120, 60, 0)), (G['zentrum'], (0, 0, 160))):
            d.line([((px - b[0]) * sc, (b[3] - py) * sc) for px, py in g.exterior.coords], fill=c, width=2)
        for r in blib.routes().values():
            d.line([((px - b[0]) * sc, (b[3] - py) * sc) for px, py in r.coords], fill=(110, 0, 150), width=1)
    except Exception as ex:
        print('areas not drawn:', repr(ex)[:120])
    cu, cv = (blib.CENTRE[0] - b[0]) * sc, (b[3] - blib.CENTRE[1]) * sc
    d.ellipse([cu - 4, cv - 4, cu + 4, cv + 4], outline=(255, 255, 255), width=2)
    d.rectangle([0, 0, W, 15], fill=(0, 0, 0))
    d.text((4, 2), 'Kachel-Listen: ' + '  '.join(f'{L}: {len(T[L])}' for L in sorted(T)) + '   (grau 6-7, grün 8-9, blau 10, orange 11, rot 12)', fill=(255, 255, 255))
    save(im, '5_listen.png')
    for p in made:
        print(p, os.path.getsize(p))


if __name__ == '__main__':
    main()
