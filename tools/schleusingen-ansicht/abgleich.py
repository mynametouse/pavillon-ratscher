#!/usr/bin/env python3
"""feat/schleusingen-ansicht: compare the model with the private views from the street, spot by spot – on the chat machine only, which
has the views (nothing of them goes into the repository, a CI artifact, a doc or the game; the side-by-sides stay outside the repo).

  python3 tools/schleusingen-ansicht/abgleich.py --ref DIR --out DIR [--model out/schleusingen_ansicht] [--views v000,p5_0] [--top 20]

For every viewpoint of viz3/extra/schleusingen-ansicht/views.json that has a reference picture DIR/<name>.jpg and a model picture
<model>/<name>.jpg (the test's section bilder: python3 viz3/test/schleusingen_ansicht.py PORT bilder – the same camera):
  - the buildings the view shows: per column the nearest facade of stadt.json within MAX_D (as check.py), its band between foot and
    eave (flat ground at the camera's foot, heights from stadt.json – good enough for a colour band),
  - per building the median colour of that band in both pictures (sky-like, very dark and very bright pixels and the overlays of the
    viewer dropped) → difference ΔE (CIELAB 1976, lightness at half weight: the model's light is not the photo's),
  - the skyline: per column the first row below the sky that touches the top edge, in both pictures → mean difference in degrees over
    the columns that show a building,
  - score = mean ΔE of the buildings (weighted by their columns) + 2 × skyline difference in degrees.
Written: <out>/abgleich.json (ranked, worst first; numbers only) and <out>/<name>.jpg (reference above, model below, each building's
band outlined with its index and ΔE). Each round of reading starts with the worst spots."""
import argparse, json, math, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
EXTRA = os.path.join(ROOT, 'viz3', 'extra', 'schleusingen-ansicht')
STADT = os.path.join(ROOT, 'viz3', 'extra', 'schleusingen', 'dist', 'schleusingen', 'stadt.json')
W, H, MAX_D, MIN_COLS = 1366, 559, 60.0, 24
# the street viewer's overlays in the reference pictures (search box, info card, mini map, buttons, the footer line)
MASKS = [(0, 0, 400, 200), (0, 380, 175, 559), (1180, 0, 1366, 70), (1290, 380, 1366, 559), (660, 535, 1366, 559)]


def lab(rgb):
    """sRGB 0–1 (…, 3) → CIELAB (D65)"""
    c = np.where(rgb <= 0.04045, rgb / 12.92, ((rgb + 0.055) / 1.055) ** 2.4)
    M = np.array([[0.4124, 0.3576, 0.1805], [0.2126, 0.7152, 0.0722], [0.0193, 0.1192, 0.9505]])
    xyz = c @ M.T / np.array([0.95047, 1.0, 1.08883])
    f = np.where(xyz > 0.008856, np.cbrt(xyz), 7.787 * xyz + 16 / 116)
    return np.stack([116 * f[..., 1] - 16, 500 * (f[..., 0] - f[..., 1]), 200 * (f[..., 1] - f[..., 2])], -1)


def sky_like(a):
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    mx, mn = a.max(-1), a.min(-1)
    sat = (mx - mn) / np.maximum(mx, 1e-3)
    lum = 0.3 * r + 0.59 * g + 0.11 * b
    return ((b > 0.45) & (b >= r + 0.04) & (b >= g - 0.02)) | ((lum > 0.78) & (sat < 0.12))


def skyline(a):
    """per column the first row (from the top) that is not sky, the sky reaching the top edge; H if all sky, 0 if no sky at the top"""
    s = sky_like(a)
    out = np.zeros(W, int)
    for u in range(W):
        col = s[:, u]
        if not col[0]:
            continue
        nz = np.nonzero(~col)[0]
        out[u] = nz[0] if len(nz) else H
    return out


def columns(stadt, v):
    """per image column: (building i, distance, eave height) of the nearest facade within MAX_D, or None"""
    segs = []
    for b in stadt['b']:
        if b.get('lm'):
            continue
        for f in b['F']:
            ax, ay, bx, by = f[0], f[1], f[2], f[3]
            if math.hypot(bx - ax, by - ay) > 0.05:
                segs.append((b['i'], ax, ay, bx, by, b.get('e', 6.0)))
    cx, cy = v['x'], v['y']
    near = [s for s in segs if min(math.hypot(s[1] - cx, s[2] - cy), math.hypot(s[3] - cx, s[4] - cy)) < MAX_D + 30]
    fpx = (H / 2) / math.tan(math.radians(v['vfov'] / 2))
    out = []
    for u in range(W):
        a = math.radians(v['yaw'] + math.degrees(math.atan((u + 0.5 - W / 2) * math.cos(math.radians(v['pitch'])) / fpx)))
        dx, dy = math.sin(a), math.cos(a)
        best = None
        for (i, ax, ay, bx, by, e) in near:
            ex, ey = bx - ax, by - ay
            den = dx * ey - dy * ex
            if abs(den) < 1e-9:
                continue
            t = ((ax - cx) * ey - (ay - cy) * ex) / den
            s = ((ax - cx) * dy - (ay - cy) * dx) / den
            if 0.3 < t < MAX_D and 0 <= s <= 1 and (best is None or t < best[1]):
                best = (i, t, e)
        out.append(best)
    return out, fpx


def row(v, fpx, ang):
    return H / 2 - fpx * math.tan(math.radians(ang - v['pitch']))


def compare(v, ref, mod, stadt):
    A = np.asarray(Image.open(ref).convert('RGB').resize((W, H))).astype(np.float32) / 255
    B = np.asarray(Image.open(mod).convert('RGB').resize((W, H))).astype(np.float32) / 255
    ok = np.ones((H, W), bool)
    for x0, y0, x1, y1 in MASKS:
        ok[y0:y1, x0:x1] = False
    cols, fpx = columns(stadt, v)
    eye = v.get('eye', 2.5)
    bands = {}
    for u, c in enumerate(cols):
        if not c:
            continue
        i, t, e = c
        top = row(v, fpx, math.degrees(math.atan2(e - eye - 0.4, t)))
        foot = row(v, fpx, math.degrees(math.atan2(0.8 - eye, t)))
        y0, y1 = int(max(0, min(H, top))), int(max(0, min(H, foot)))
        if y1 - y0 >= 4:
            bands.setdefault(i, []).append((u, y0, y1, t))
    LA, LB = lab(A), lab(B)
    sa, sb = skyline(A), skyline(B)   # the sky is what reaches the top edge – a white wall below the roofs is no sky
    res = []
    for i, cs in bands.items():
        if len(cs) < MIN_COLS:
            continue
        mA, mB = [], []
        for u, y0, y1, t in cs:
            ys = np.arange(y0, y1)
            sel = ok[y0:y1, u] & (ys >= sa[u]) & (ys >= sb[u])
            mA.append(LA[y0:y1, u][sel]); mB.append(LB[y0:y1, u][sel])
        qa, qb = np.concatenate(mA), np.concatenate(mB)
        keep = (qa[:, 0] > 15) & (qa[:, 0] < 97) & (qb[:, 0] > 15) & (qb[:, 0] < 97)
        if keep.sum() < 60:
            continue
        a, b = np.median(qa[keep], 0), np.median(qb[keep], 0)
        dE = float(math.sqrt((0.5 * (a[0] - b[0])) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2))
        res.append({'i': i, 'cols': len(cs), 'dE': round(dE, 1), 'd': round(min(c[3] for c in cs), 1),
                    'u0': min(c[0] for c in cs), 'u1': max(c[0] for c in cs), 'y0': min(c[1] for c in cs), 'y1': max(c[2] for c in cs)})
    us = [u for u, c in enumerate(cols) if c and ok[max(0, min(H - 1, sa[u])), u] and 0 < sa[u] < H and 0 < sb[u] < H]
    sky = float(np.mean([abs(math.degrees(math.atan((H / 2 - sa[u]) / fpx)) - math.degrees(math.atan((H / 2 - sb[u]) / fpx))) for u in us])) if len(us) > 40 else None
    n = sum(r['cols'] for r in res)
    mdE = sum(r['dE'] * r['cols'] for r in res) / n if n else None
    score = (mdE or 0) + 2 * (sky or 0)
    return {'name': v['name'], 'score': round(score, 1), 'dE': round(mdE, 1) if mdE is not None else None,
            'sky': round(sky, 1) if sky is not None else None, 'buildings': sorted(res, key=lambda r: -r['dE'])}, A, B


def sheet(r, A, B, dst):
    a = Image.fromarray((A * 255).astype(np.uint8)); b = Image.fromarray((B * 255).astype(np.uint8))
    o = Image.new('RGB', (W, 2 * H + 6), (20, 20, 20)); o.paste(a, (0, 0)); o.paste(b, (0, H + 6))
    d = ImageDraw.Draw(o)
    try:
        F = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf', 14)
    except OSError:
        F = ImageFont.load_default()
    for q in r['buildings']:
        col = (255, 60, 60) if q['dE'] > 25 else (255, 200, 0) if q['dE'] > 12 else (80, 255, 80)
        for oy in (0, H + 6):
            d.rectangle([q['u0'], q['y0'] + oy, q['u1'], q['y1'] + oy], outline=col, width=2)
            d.text((q['u0'] + 3, q['y0'] + oy + 2), f"{q['i']} ΔE {q['dE']:.0f}", font=F, fill=col)
    t = f"{r['name']}  Wertung {r['score']}  ΔE {r['dE']}  Dachlinie {r['sky']}°  (oben Ansicht, unten Modell)"
    d.rectangle([0, 2 * H + 6 - 24, d.textlength(t, font=F) + 12, 2 * H + 6], fill=(0, 0, 0))
    d.text((6, 2 * H + 6 - 21), t, font=F, fill=(255, 255, 255))
    o.save(dst, quality=82)


def main(argv):
    ap = argparse.ArgumentParser()
    ap.add_argument('--ref', required=True, help='folder of the private views (<name>.jpg) – outside the repository')
    ap.add_argument('--out', required=True, help='folder for the side-by-sides and the list – outside the repository')
    ap.add_argument('--model', default=os.path.join(ROOT, 'out', 'schleusingen_ansicht'))
    ap.add_argument('--views', default='')
    ap.add_argument('--top', type=int, default=20)
    a = ap.parse_args(argv)
    if os.path.abspath(a.out).startswith(ROOT + os.sep) or os.path.abspath(a.ref).startswith(ROOT + os.sep):
        sys.exit('--ref and --out must lie outside the repository')
    os.makedirs(a.out, exist_ok=True)
    stadt = json.load(open(STADT))
    views = json.load(open(os.path.join(EXTRA, 'views.json')))
    only = set(filter(None, a.views.split(',')))
    rows = []
    for v in views:
        if only and v['name'] not in only:
            continue
        ref, mod = os.path.join(a.ref, v['name'] + '.jpg'), os.path.join(a.model, v['name'] + '.jpg')
        if not (os.path.exists(ref) and os.path.exists(mod)):
            continue
        r, A, B = compare(v, ref, mod, stadt)
        sheet(r, A, B, os.path.join(a.out, v['name'] + '.jpg'))
        rows.append(r)
    rows.sort(key=lambda r: -r['score'])
    json.dump({'views': rows}, open(os.path.join(a.out, 'abgleich.json'), 'w'), ensure_ascii=False, indent=1)
    print(f'{len(rows)} spots compared; worst first:')
    for r in rows[:a.top]:
        w = ', '.join(f"{q['i']} ({q['dE']:.0f})" for q in r['buildings'][:3])
        print(f"  {r['name']:8s} score {r['score']:5.1f}  ΔE {r['dE']}  skyline {r['sky']}°  worst: {w}")
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
