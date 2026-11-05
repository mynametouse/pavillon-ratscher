#!/usr/bin/env python3
"""Merge detection passes (detect.py) into candidates and lay them out on contact sheets to check by eye (feat/welt-dinge).

  python review.py IMG.jpg x0 y1 s OUT_DIR det1.json [det2.json …] [--min 0.05]

Writes OUT_DIR/kandidaten.json (merged: one per place, the best class by summed confidence) and OUT_DIR/blatt_NN.jpg – 6×5 crops of 14 m
(numbered like the list, the box drawn thin) for deciding by eye; the decisions go to viz3/extra/welt-dinge/entscheidungen.json (by position)."""
import json, math, os, sys
from PIL import Image, ImageDraw

VEH = {'small vehicle', 'large vehicle'}
KEEP = VEH | {'swimming pool', 'storage tank', 'tennis court', 'ship', 'plane', 'helicopter', 'basketball court', 'roundabout',
              'soccer ball field', 'baseball diamond', 'ground track field', 'harbor', 'bridge'}


def merge(files, minp):
    dets = []
    for f in files:
        for d in json.load(open(f)):
            if d['p'] >= minp and d['c'] in KEEP:
                dets.append(d)
    dets.sort(key=lambda d: -d['p'])
    out = []
    for d in dets:
        r = max(1.2, 0.45 * d['w'])
        hit = next((k for k in out if math.hypot(k['x'] - d['x'], k['y'] - d['y']) < max(r, 0.45 * k['w'])), None)
        if hit:
            hit['votes'][d['c']] = hit['votes'].get(d['c'], 0) + d['p']
            hit['n'] += 1
            continue
        k = dict(d)
        k['votes'] = {d['c']: d['p']}
        k['n'] = 1
        out.append(k)
    for k in out:
        # vehicles: the class with the most confidence (a van may be small or large in different passes)
        k['c'] = max(k['votes'], key=k['votes'].get)
    out.sort(key=lambda k: (round(-k['y'] / 40), k['x']))
    for i, k in enumerate(out):
        k['id'] = i
    return out


def sheets(img, x0, y1, s, cands, outdir, R=7.0, cols=6, rows=5, px=180, prefix='blatt', crop=None):
    """crop(k, r_metres) → a PIL image centred on the candidate (several photos), else one photo img with x0, y1, s"""
    Image.MAX_IMAGE_PIXELS = None
    im = Image.open(img).convert('RGB') if img else None
    per = cols * rows
    for b in range(0, len(cands), per):
        sheet = Image.new('RGB', (cols * px, rows * (px + 16)), (20, 20, 20))
        dr = ImageDraw.Draw(sheet)
        for j, k in enumerate(cands[b:b + per]):
            r = R / s
            if crop:
                c = crop(k, R).resize((px, px), Image.BICUBIC)
            else:
                u, v = (k['x'] - x0) / s, (y1 - k['y']) / s
                c = im.crop((int(u - r), int(v - r), int(u + r), int(v + r))).resize((px, px), Image.BICUBIC)
            d = ImageDraw.Draw(c)
            sc = px / (2 * r)
            a = math.radians(k['az'])
            fx, fy = math.sin(a) / s * sc, -math.cos(a) / s * sc
            rx, ry = -fy, fx
            hl, hw = k['l'] / 2, k['w'] / 2
            P = [(px / 2 + fx * hl * sl + rx * hw * sw, px / 2 + fy * hl * sl + ry * hw * sw) for sl, sw in ((1, 1), (1, -1), (-1, -1), (-1, 1))]
            d.polygon(P, outline=(255, 60, 60) if k['c'] in VEH else (255, 255, 0))
            X, Y = (j % cols) * px, (j // cols) * (px + 16)
            sheet.paste(c, (X, Y + 16))
            dr.text((X + 3, Y + 2), f"{k['id']} {k['c'][:9]} {k['p']:.2f} {k['l']:.1f}x{k['w']:.1f}", fill=(255, 255, 255))
        sheet.save(os.path.join(outdir, f'{prefix}_{b // per:02d}.jpg'), quality=88)


if __name__ == '__main__':
    a = [x for x in sys.argv[1:] if not x.startswith('--')]
    minp = float(sys.argv[sys.argv.index('--min') + 1]) if '--min' in sys.argv else 0.05
    img, x0, y1, s, outdir, files = a[0], float(a[1]), float(a[2]), float(a[3]), a[4], a[5:]
    if '--min' in sys.argv:
        files = [f for f in files if f != str(minp)]
    os.makedirs(outdir, exist_ok=True)
    c = merge(files, minp)
    json.dump(c, open(os.path.join(outdir, 'kandidaten.json'), 'w'), indent=0)
    sheets(img, x0, y1, s, c, outdir)
    from collections import Counter
    print(len(c), 'candidates', dict(Counter(k['c'] for k in c)))
