#!/usr/bin/env python3
"""feat/welt-gebaeude: the roofs printed in the world's orthophoto tiles (tools/welt, published under welt-test/) go where a building stands
in 3D beyond Ratscher's square – Schleusingen's old town (welt/schleusingen.js), Kloster Veßra (welt/vessra.js) and the cells of
gebaeude/gebaeude.js (viz3/extra/welt-gebaeude/dist/gebaeude/z/). A NEW set: only the retouched image tiles, under welt-test/v2/
(i/{L}/{x}/{y}.webp + index.json with their keys); the live tiles stay untouched. The app takes them only with the switch (?welt2, or
GEB.TILES2 in gebaeude/gebaeude.js once the lead flips it).

  python3 tools/welt-gebaeude/kacheln.py --out site/v2 [--site https://mynametouse.github.io/pavillon-ratscher/welt-test/] [--levels 10,11,12]
        [--only N] [--debug DIR]

Masks: each footprint grown by its roof's overhang and the photo's lean (0.6 m + 0.08 m per metre of height, all round – the lean is
measured for Ratscher, tools/welt-gebaeude/retusche.py; here a margin covers it), plus the masks of other features in UTM 25832:
viz3/extra/*/maske*_utm.json = { "src": "…", "polys": [[[E, N], …], …], "pad": m }. The holes are filled from the lit ground around them
(retusche.py: push-pull, grain, soft edge). Runs on GitHub Actions (.github/workflows/welt-gebaeude-kacheln.yml), which publishes the set.
"""
import argparse, glob, io, json, math, os, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wglib as W
from retusche import fill

ROOT_E0, ROOT_N0, ROOT = 420700.0, 5390800.0, 409600.0
SITE = 'https://mynametouse.github.io/pavillon-ratscher/welt-test/'
SETS = ['', 'zonen/vessra/']


def get(url, tries=4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(url, timeout=120) as r:
                return r.read()
        except Exception as e:
            if '404' in str(e):
                return None
            if k == tries - 1:
                raise
            time.sleep(2 + 5 * k)


def footprints():
    """[(UTM polygon, height)] of every building standing in 3D beyond the square"""
    from shapely.geometry import Polygon
    out = []
    box = W.GEOMAN['roads']['box']

    def add(f, h):
        pts = list(zip(f[0::2], f[1::2]))
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        if box[0] + 2 < cx < box[2] - 2 and box[1] + 2 < cy < box[3] - 2:
            return   # the square has its own ground (world/ratscher.js) – tools/welt-gebaeude/retusche.py
        g = Polygon([W.to_utm(x, y) for x, y in pts]).buffer(0)
        if not g.is_empty:
            out.append((g, h))
    for rel in ('schleusingen/stadt.json', 'vessra/ort.json'):
        try:
            d = json.load(open(W.dist_file(rel)))
        except Exception as e:
            print('zone data missing', rel, e)
            continue
        for b in d['b']:
            rv = b.get('rv') or []
            top = max(rv[2::3]) if rv else b.get('e', 6)
            add(b['f'], float(top))
    zd = os.path.join(W.VIZ, 'extra', 'welt-gebaeude', 'dist', 'gebaeude', 'z')
    for fn in sorted(glob.glob(os.path.join(zd, '*_*.json'))):
        for b in json.load(open(fn))['b']:
            add(b['f'], float(b['h']))
    return out


def feature_masks():
    from shapely.geometry import Polygon
    res = []
    for fn in sorted(glob.glob(os.path.join(W.VIZ, 'extra', '*', 'maske*_utm.json'))):
        m = json.load(open(fn))
        pad = float(m.get('pad', 0.3))
        for poly in m.get('polys', []):
            if len(poly) >= 3:
                res.append(Polygon(poly).buffer(pad))
        print('mask', os.path.relpath(fn, W.REPO), len(m.get('polys', [])), flush=True)
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', required=True)
    ap.add_argument('--site', default=SITE)
    ap.add_argument('--levels', default='10,11,12')
    ap.add_argument('--only', type=int, default=0, help='at most N tiles (a quick try)')
    ap.add_argument('--debug', default=None)
    ap.add_argument('--near', default=None, help='E,N: only tiles within 600 m of this UTM point (a quick look)')
    a = ap.parse_args()
    import cv2
    from PIL import Image
    from shapely.strtree import STRtree
    from shapely.geometry import box as sbox
    metas = {}
    for st in SETS:
        b = get(a.site + st + 'meta.json')
        if b:
            metas[st] = json.loads(b)
    print('sets', list(metas), flush=True)
    fps = footprints()
    masks = [p.buffer(0.6 + 0.08 * min(h, 30), join_style=2) for p, h in fps] + feature_masks()
    tree = STRtree(masks)
    print('buildings', len(fps), 'mask polygons', len(masks), flush=True)
    levels = [int(v) for v in a.levels.split(',')]

    def set_of(L, x, y):
        for st in SETS:
            m = metas.get(st)
            r = m and m['tiling']['levels'].get(str(L), {}).get('rect')
            if r and r[0] <= x <= r[2] and r[1] <= y <= r[3]:
                return st
        return None
    jobs = []
    for L in levels:
        s = ROOT / (1 << L)
        keys = set()
        for p in masks:
            e0, n0, e1, n1 = p.bounds
            for x in range(int((e0 - ROOT_E0) // s), int((e1 - ROOT_E0) // s) + 1):
                for y in range(int((n0 - ROOT_N0) // s), int((n1 - ROOT_N0) // s) + 1):
                    keys.add((x, y))
        for x, y in sorted(keys):
            st = set_of(L, x, y)
            if st is not None:
                jobs.append((L, x, y, st))
    if a.near:
        ce, cn = (float(v) for v in a.near.split(','))
        jobs = [j for j in jobs if math.hypot(ROOT_E0 + (j[1] + 0.5) * ROOT / (1 << j[0]) - ce, ROOT_N0 + (j[2] + 0.5) * ROOT / (1 << j[0]) - cn) < 600]
    if a.only:
        jobs = jobs[:a.only]
    print('tiles to retouch', len(jobs), {L: sum(1 for j in jobs if j[0] == L) for L in levels}, flush=True)
    os.makedirs(a.out, exist_ok=True)
    done = []
    t0 = time.time()

    def one(job):
        L, x, y, st = job
        s = ROOT / (1 << L)
        e0, n0 = ROOT_E0 + x * s, ROOT_N0 + y * s
        raw = get(a.site + st + f'i/{L}/{x}/{y}.webp')
        if raw is None:
            return None
        img = np.asarray(Image.open(io.BytesIO(raw)).convert('RGB')).copy()
        n = img.shape[0]
        res = s / n
        m = np.zeros((n, n), np.uint8)
        tb = sbox(e0, n0, e0 + s, n0 + s)
        for i in tree.query(tb):
            g = masks[i]
            for q in (g.geoms if hasattr(g, 'geoms') else [g]):
                if q.is_empty or q.geom_type != 'Polygon':
                    continue
                X, Y = q.exterior.xy
                u = (np.array(X) - e0) / res - 0.5
                v = (n0 + s - np.array(Y)) / res - 0.5
                cv2.fillPoly(m, [np.stack([u, v], 1).round().astype(np.int32)], 255)
        if not m.any():
            return None
        out = fill(img, m, seed=(L * 100003 + x * 1009 + y) & 0xffff)
        d = os.path.join(a.out, 'i', str(L), str(x))
        os.makedirs(d, exist_ok=True)
        Image.fromarray(out).save(os.path.join(d, f'{y}.webp'), quality=82, method=4)
        if a.debug and len(done) < 40:
            os.makedirs(a.debug, exist_ok=True)
            both = np.concatenate([img, out], 1)
            Image.fromarray(both).save(os.path.join(a.debug, f'{L}_{x}_{y}.jpg'), quality=85)
        return f'{L}/{x}/{y}', round(100.0 * (m > 0).mean(), 1)

    with ThreadPoolExecutor(6) as ex:
        for r in ex.map(one, jobs):
            if r:
                done.append(r)
                if len(done) % 100 == 0:
                    print(len(done), 'tiles', round(time.time() - t0), 's', flush=True)
    json.dump({'v': 1, 'made': time.strftime('%Y-%m-%d %H:%M'), 'from': a.site, 'tiles': sorted(k for k, _ in done),
               'note': 'feat/welt-gebaeude: orthophoto tiles of welt-test/ (and zonen/vessra/) without the roofs of the buildings standing in 3D'},
              open(os.path.join(a.out, 'index.json'), 'w'), separators=(',', ':'))
    size = sum(os.path.getsize(f) for f in glob.glob(os.path.join(a.out, 'i', '*', '*', '*.webp')))
    print('done', len(done), 'tiles', round(size / 1e6, 1), 'MB', round(time.time() - t0), 's', flush=True)


if __name__ == '__main__':
    main()
