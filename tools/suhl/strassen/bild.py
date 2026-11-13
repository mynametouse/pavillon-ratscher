#!/usr/bin/env python3
"""suhl-strassen: a quick picture of a run for the eye (never committed: pictures stay outside the work branch) – the ways of the
s/ tiles by kind, the areas, water and rail, the tile grid; north is up (model axes).

  python3 -I tools/suhl/strassen/bild.py <out dir of lauf.py> <png> [--scale 1.0] [--z]
"""
import argparse, glob, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sslib as S


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('png')
    ap.add_argument('--scale', type=float, default=1.0)      # pixels per model metre
    ap.add_argument('--z', action='store_true')               # colour by height instead of kind
    a = ap.parse_args()
    from PIL import Image, ImageDraw
    files = sorted(glob.glob(os.path.join(a.out, 'suhl', 's', 'v*', '10', '*', '*.json')))
    T = [json.load(open(p)) for p in files]
    xs, ys, zs = [], [], []
    for t in T:
        ox, oy = t['o']
        for w in t['ways']:
            q = w[6]
            xs += [ox + v / 10 for v in q[0::3]]
            ys += [oy + v / 10 for v in q[1::3]]
            zs += [v / 10 for v in q[2::3]]
    x0, x1, y0, y1 = min(xs) - 20, max(xs) + 20, min(ys) - 20, max(ys) + 20
    z0, z1 = min(zs), max(zs)
    sc = a.scale
    im = Image.new('RGB', (int((x1 - x0) * sc), int((y1 - y0) * sc)), (246, 244, 238))
    d = ImageDraw.Draw(im)
    X = lambda x: (x - x0) * sc
    Y = lambda y: (y1 - y) * sc
    col = {0: (200, 0, 0), 1: (225, 110, 0), 2: (200, 160, 0), 3: (70, 70, 70), 4: (110, 110, 110), 5: (150, 150, 150), 6: (150, 110, 60),
           7: (120, 160, 90), 8: (60, 110, 200)}
    acol = {0: (230, 205, 170), 1: (205, 205, 215), 2: (220, 190, 200), 3: (190, 220, 220)}
    for t in T:
        ox, oy = t['o']
        for ar in t['areas']:
            if not ar[5]:
                continue
            q = ar[7]
            d.polygon([(X(ox + q[i] / 10), Y(oy + q[i + 1] / 10)) for i in range(0, len(q), 3)], fill=acol[ar[0]])
        for key in ('water', 'rail'):
            for r in t.get(key, []):
                q = r[-1]
                st = 3 if key == 'rail' else 2
                pts = [(X(ox + q[i] / 10), Y(oy + q[i + 1] / 10)) for i in range(0, len(q), 3)]
                if len(pts) >= 2:
                    d.line(pts, fill=(40, 40, 40) if key == 'rail' else (60, 150, 230), width=2)
    for t in T:
        ox, oy = t['o']
        for w in sorted(t['ways'], key=lambda w: -w[0]):
            q = w[6]
            pts = [(X(ox + q[i] / 10), Y(oy + q[i + 1] / 10)) for i in range(0, len(q), 3)]
            if a.z:
                zm = sum(q[2::3]) / len(q[2::3]) / 10
                f = (zm - z0) / max(z1 - z0, 1e-6)
                c = (int(255 * f), int(80 + 100 * (1 - abs(2 * f - 1))), int(255 * (1 - f)))
            else:
                c = col[w[0]]
                if w[3] & 1:
                    c = (255, 0, 255)
                elif w[3] & 2:
                    c = (0, 200, 200)
            d.line(pts, fill=c, width=max(1, int(round(w[2] / 10 * sc))) if not a.z else 2)
    for t in T:
        k = t['key'].split('/')
        e0, n0, e1, n1 = S.tbounds(int(k[1]), int(k[2]))
        cx, cy = S.u2m([e0, e1, e1, e0, e0], [n0, n0, n1, n1, n0])
        d.line([(X(float(u)), Y(float(v))) for u, v in zip(cx, cy)], fill=(0, 0, 255), width=1)
        d.text((X(float(cx[3])) + 4, Y(float(cy[3])) + 3), t['key'], fill=(0, 0, 200))
    os.makedirs(os.path.dirname(os.path.abspath(a.png)), exist_ok=True)
    im.save(a.png)
    S.log('picture', a.png, im.size, 'z', round(z0, 1), round(z1, 1))


if __name__ == '__main__':
    main()
