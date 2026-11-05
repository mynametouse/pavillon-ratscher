#!/usr/bin/env python3
"""feat/welt-gebaeude: the roofs printed in Ratscher's ground images go where a building stands in 3D – and the things other features build
in 3D (masks of feat/welt-dinge: cars, trailers, woodpiles, pools …). This tool owns the ground: run it again after merging those branches.

  python3 tools/welt-gebaeude/retusche.py --ethos ETHOS.jsonl [--src viz3/dist/geo] [--debug DIR]

ETHOS.jsonl: tools/welt-gebaeude/filter_ethos.py (see docs/features/welt-gebaeude.md). The ground images are the published originals
(viz3/dist/geo/ortho_near.jpg 4096² over 920 m, ortho_near_lq.jpg 2048², ortho_inner.jpg 2048² over 2.4 km – from the gh-pages asset base;
not covered by the KTX2 textures of tools/tex). Written to viz3/extra/welt-gebaeude/dist/geo/: ortho_near_r.jpg, ortho_near_r_lq.jpg,
ortho_inner_r.jpg (the manifest of the extra points geoman.tex at them – remove those lines to switch back), and 1024² copies of the
originals ortho_near_dach.jpg, ortho_inner_dach.jpg, from which world/village.js takes the roof colours (they are no longer in the ground).

What is masked: every footprint that stands in 3D – the 337 OSM buildings of world/ratscher.js, the new ones of gebaeude/ratscher.json, the
ETHOS footprints in the hand-modelled site (garden, Hubert, Ronald: modelled in garden/*) – grown by the roof's overhang and swept along
its lean: an orthophoto is not a true orthophoto, a roof lies displaced away from the photo's nadir by about height × distance / flying
height (the walls show in between). The lean is measured per building in the near image (the shift of the outline that best meets the
photo's edges), smoothed with the nearest buildings (a local field: lean per metre of height) and applied with the building's height.
Masks of other features: viz3/extra/*/maske*.json = { "src": "…", "polys": [[[x, y], …], …], "pad": m } in model metres (Ratscher;
for the tiles UTM 25832 – docs/features/welt-gebaeude.md). The holes are filled from their surroundings (OpenCV Telea), given the grain
of the ring around them and blended in over a few pixels.
"""
import argparse, glob, json, math, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wglib as W

OUT = os.path.join(W.VIZ, 'extra', 'welt-gebaeude', 'dist', 'geo')
SITE = (-58.0, -52.0, 42.0, 48.0)


def utm_poly(ring_model):
    from shapely.geometry import Polygon
    return Polygon([W.to_utm(x, y) for x, y in ring_model]).buffer(0)


def buildings(ethos_path):
    """[(UTM polygon, height, source)] of everything that stands in 3D in the square"""
    from shapely.geometry import Polygon, box as sbox
    from shapely.strtree import STRtree
    out = []
    osm = W.ratscher_osm()
    for k, v in osm.items():
        out.append((utm_poly(v['ring']), max(3.0, float(v['top'])), 'osm'))
    gj = json.load(open(os.path.join(W.VIZ, 'extra', 'welt-gebaeude', 'dist', 'gebaeude', 'ratscher.json')))
    for b in gj['b']:
        f = b['f']
        out.append((utm_poly(list(zip(f[0::2], f[1::2]))), float(b['h']), 'neu'))
    site = sbox(*SITE)
    box = W.GEOMAN['roads']['box']
    if ethos_path:
        # the hand-modelled site and the slivers/parts not built: every ETHOS footprint of the square that the two lists above miss
        have = STRtree([p for p, _, _ in out])
        allp = [p for p, _, _ in out]
        for r in W.load_ethos(ethos_path):
            ring = r['poly'][0][0]
            pm = [W.to_model(e, n) for e, n in ring]
            cx = sum(p[0] for p in pm) / len(pm)
            cy = sum(p[1] for p in pm) / len(pm)
            if not (box[0] < cx < box[2] and box[1] < cy < box[3]):
                continue
            g = Polygon(ring).buffer(0)
            if g.is_empty:
                continue
            cov = sum(g.intersection(allp[i]).area for i in have.query(g)) / max(g.area, 1e-6)
            if cov > 0.6:
                continue
            if site.contains(Polygon(pm).centroid) or cov > 0.05:
                out.append((g, float(r['h'] or 3.0), 'site' if site.contains(Polygon(pm).centroid) else 'rest'))
    return out


def masks_of_features():
    """viz3/extra/*/maske*.json (model metres): [(UTM polygon, pad)]"""
    res = []
    for fn in sorted(glob.glob(os.path.join(W.VIZ, 'extra', '*', 'maske*.json'))):
        try:
            m = json.load(open(fn))
        except Exception as e:
            print('mask unreadable', fn, e)
            continue
        pad = float(m.get('pad', 0.3))
        for poly in m.get('polys', []):
            if len(poly) >= 3:
                res.append((utm_poly(poly), pad, os.path.relpath(fn, W.REPO)))
        print('mask', os.path.relpath(fn, W.REPO), len(m.get('polys', [])), 'polygons, pad', pad, flush=True)
    return res


class Img:
    def __init__(self, path, o):
        from PIL import Image
        Image.MAX_IMAGE_PIXELS = None
        self.path = path
        self.a = np.asarray(Image.open(path).convert('RGB')).copy()
        self.n = self.a.shape[0]
        self.e0, self.n0, self.w = o['e0'], o['n0'], o['w']
        self.res = self.w / self.n

    def px(self, E, N):
        return (np.asarray(E) - self.e0) / self.res - 0.5, (self.n0 + self.w - np.asarray(N)) / self.res - 0.5


def leans(img, blds):
    """lean (dE, dN) per building in metres: measured where the near image shows it, a local field (lean per metre of height) elsewhere"""
    import cv2
    L = cv2.GaussianBlur(cv2.cvtColor(img.a, cv2.COLOR_RGB2GRAY).astype(np.float32), (0, 0), 1.2)
    G = np.hypot(cv2.Sobel(L, cv2.CV_32F, 1, 0, ksize=3), cv2.Sobel(L, cv2.CV_32F, 0, 1, ksize=3))
    H, Wd = G.shape
    est = []
    for i, (p, h, src) in enumerate(blds):
        if h < 3.0 or src == 'rest':
            continue
        ring = p.buffer(0.35, join_style=2).exterior
        n = max(24, int(ring.length / 0.25))
        pts = np.array([ring.interpolate(t * ring.length / n).coords[0] for t in range(n)])
        u0, v0 = img.px(pts[:, 0], pts[:, 1])
        if u0.min() < 40 or v0.min() < 40 or u0.max() > Wd - 40 or v0.max() > H - 40:
            continue
        R = min(6.0, 0.45 * h + 1.0)
        st = 0.25
        g = np.arange(-R, R + 1e-6, st)
        sx, sy = np.meshgrid(g, g)
        sx, sy = sx.ravel(), sy.ravel()
        keep = sx * sx + sy * sy <= R * R
        sx, sy = sx[keep], sy[keep]
        uu = np.clip(np.rint(u0[None, :] + sx[:, None] / img.res), 0, Wd - 1).astype(int)
        vv = np.clip(np.rint(v0[None, :] - sy[:, None] / img.res), 0, H - 1).astype(int)
        sc = G[vv, uu].mean(axis=1)
        k = int(np.argmax(sc))
        conf = (sc[k] - np.median(sc)) / (sc.std() + 1e-6)
        est.append((i, sx[k], sy[k], conf))
    # the local field: lean per metre of height, median of the 9 nearest confident measurements
    good = [(i, dx, dy) for i, dx, dy, c in est if c > 2.0]
    cen = np.array([[blds[i][0].centroid.x, blds[i][0].centroid.y] for i, _, _ in good]) if good else np.zeros((0, 2))
    per = np.array([[dx / blds[i][1], dy / blds[i][1]] for i, dx, dy in good]) if good else np.zeros((0, 2))
    out = []
    for i, (p, h, src) in enumerate(blds):
        if len(cen):
            c = np.array([p.centroid.x, p.centroid.y])
            d = np.hypot(*(cen - c).T)
            nn = np.argsort(d)[:9]
            f = np.median(per[nn], axis=0) if d[nn[0]] < 400 else np.zeros(2)
        else:
            f = np.zeros(2)
        out.append((float(f[0] * h), float(f[1] * h)))
    print('lean: measured', len(est), 'confident', len(good), 'median per m', np.round(np.median(per, axis=0), 3) if len(per) else '-', flush=True)
    return out, est


def sweep(p, dx, dy):
    """the polygon swept along (dx, dy): itself, its shifted copy and every edge's band between them"""
    from shapely.affinity import translate
    from shapely.geometry import Polygon
    from shapely.ops import unary_union
    if abs(dx) + abs(dy) < 0.05:
        return p
    parts = [p, translate(p, dx, dy)]
    c = list(p.exterior.coords)
    for a, b in zip(c, c[1:]):
        parts.append(Polygon([a, b, (b[0] + dx, b[1] + dy), (a[0] + dx, a[1] + dy)]).buffer(0))
    return unary_union(parts)


def raster(img, polys):
    import cv2
    m = np.zeros((img.n, img.n), np.uint8)
    for g in polys:
        for q in (g.geoms if hasattr(g, 'geoms') else [g]):
            if q.is_empty or q.geom_type != 'Polygon':
                continue
            x, y = q.exterior.xy
            u, v = img.px(np.array(x), np.array(y))
            cv2.fillPoly(m, [np.stack([u, v], 1).round().astype(np.int32)], 255)
    return m


def shadows(a, mask, res, reach=10.0, k=0.62):
    """the buildings' shadows in the photo (the 3D buildings cast their own now, after the sun of the game): pixels darker than k × the
    ground around, connected to a building's mask, up to `reach` metres from it – grown into step by step"""
    import cv2
    L = cv2.GaussianBlur(cv2.cvtColor(a, cv2.COLOR_RGB2GRAY).astype(np.float32), (0, 0), 1.0)
    n, B = a.shape[0], 128
    ref = np.zeros((n // B + 1, n // B + 1), np.float32)
    for by in range(0, n, B):
        for bx in range(0, n, B):
            l = L[by:by + B, bx:bx + B][mask[by:by + B, bx:bx + B] == 0]
            ref[by // B, bx // B] = np.percentile(l, 60) if l.size > 200 else 0
    ok = ref > 0
    if ok.any():
        ref[~ok] = np.median(ref[ok])
    reff = cv2.resize(cv2.GaussianBlur(ref, (0, 0), 1.0), (n, n), interpolation=cv2.INTER_LINEAR)
    dark = (L < k * reff).astype(np.uint8) * 255
    m = mask.copy()
    k3 = np.ones((3, 3), np.uint8)
    for _ in range(max(1, int(reach / res))):
        m2 = cv2.dilate(m, k3) & (dark | m)
        if np.array_equal(m2, m):
            break
        m = m2
    return m


def pushpull(img, w):
    """holes (w = 0) filled with the weighted average of what is around them, scale by scale (normalised convolution pyramid): smooth,
    no streaks of the dark edges a fill along the border (Telea) drags in"""
    import cv2
    I = [img * w[:, :, None]]
    Wt = [w.copy()]
    while min(I[-1].shape[:2]) > 8:
        I.append(cv2.resize(I[-1], (I[-1].shape[1] // 2, I[-1].shape[0] // 2), interpolation=cv2.INTER_AREA))
        Wt.append(cv2.resize(Wt[-1], (Wt[-1].shape[1] // 2, Wt[-1].shape[0] // 2), interpolation=cv2.INTER_AREA))
    cur = I[-1] / np.maximum(Wt[-1], 1e-6)[:, :, None]
    for l in range(len(I) - 2, -1, -1):
        up = cv2.resize(cur, (I[l].shape[1], I[l].shape[0]), interpolation=cv2.INTER_LINEAR)
        ww = np.clip(Wt[l] * 4.0, 0, 1)[:, :, None]
        own = I[l] / np.maximum(Wt[l], 1e-6)[:, :, None]
        cur = own * ww + up * (1 - ww)
    return cur


def fill(a, mask, seed=1):
    """fill the masked pixels from the lit ground around them (dark pixels – shadows, gaps between houses – do not count), give them the
    grain of the ring around, blend over 3 px; the smooth fill at half resolution, the grain at full"""
    import cv2
    rng = np.random.default_rng(seed)
    big = cv2.dilate(mask, np.ones((3, 3), np.uint8), iterations=2)
    n = a.shape[0]
    h2 = n // 2
    a2 = cv2.resize(a, (h2, h2), interpolation=cv2.INTER_AREA).astype(np.float32)
    m2 = cv2.resize(big, (h2, h2), interpolation=cv2.INTER_NEAREST)
    L2 = cv2.cvtColor(a2.astype(np.uint8), cv2.COLOR_RGB2GRAY).astype(np.float32)
    lit = L2 > np.percentile(L2[m2 == 0], 35)
    w = ((m2 == 0) & lit).astype(np.float32)
    f2 = pushpull(a2, w)
    f = cv2.resize(f2, (n, n), interpolation=cv2.INTER_LINEAR)
    ring = cv2.dilate(big, np.ones((3, 3), np.uint8), iterations=6) & ~big
    dist = cv2.distanceTransform((big > 0).astype(np.uint8), cv2.DIST_L2, 3)
    out = a.copy()
    B, P = 512, 16
    for by in range(0, n, B):
        for bx in range(0, n, B):
            y0, y1, x0, x1 = max(0, by - P), min(n, by + B + P), max(0, bx - P), min(n, bx + B + P)
            mb = big[y0:y1, x0:x1]
            if not mb.any():
                continue
            af = a[y0:y1, x0:x1].astype(np.float32)
            hp = af - cv2.GaussianBlur(af, (0, 0), 1.5)
            r = ring[y0:y1, x0:x1] > 0
            sd = hp[r].std(axis=0) if r.sum() > 20 else np.full(3, 4.0, np.float32)
            noise = cv2.GaussianBlur(rng.standard_normal((y1 - y0, x1 - x0)).astype(np.float32), (0, 0), 0.6) * 1.6
            ff = f[y0:y1, x0:x1] + noise[:, :, None] * sd[None, None, :] * (mb[:, :, None] > 0)
            al = np.clip(dist[y0:y1, x0:x1] / 3.0, 0, 1)[:, :, None]
            res = np.clip(af * (1 - al) + ff * al, 0, 255).astype(np.uint8)
            iy0, ix0 = by - y0, bx - x0
            out[by:min(n, by + B), bx:min(n, bx + B)] = res[iy0:iy0 + min(B, n - by), ix0:ix0 + min(B, n - bx)]
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ethos', default=None)
    ap.add_argument('--src', default=os.path.join(W.VIZ, 'dist', 'geo'))
    ap.add_argument('--debug', default=None)
    a = ap.parse_args()
    from PIL import Image
    Image.MAX_IMAGE_PIXELS = None
    os.makedirs(OUT, exist_ok=True)
    T = W.GEOMAN['tex']
    near = Img(os.path.join(a.src, T['near']['file']), T['near'])
    inner = Img(os.path.join(a.src, T['inner']['file']), T['inner'])
    # the originals for the roof colours (world/village.js samples them at 1024²)
    for im, nm in ((near, 'ortho_near_dach.jpg'), (inner, 'ortho_inner_dach.jpg')):
        Image.fromarray(im.a).resize((1024, 1024), Image.LANCZOS).save(os.path.join(OUT, nm), quality=86)
    blds = buildings(a.ethos)
    print('buildings', len(blds), {s: sum(1 for b in blds if b[2] == s) for s in ('osm', 'neu', 'site', 'rest')}, flush=True)
    ln, est = leans(near, blds)
    polys = []
    for (p, h, src), (dx, dy) in zip(blds, ln):
        grow = 0.75 if src != 'rest' else 0.4
        polys.append(sweep(p.buffer(grow, join_style=2), dx, dy))
    feat = masks_of_features()
    for p, pad, src in feat:
        polys.append(p.buffer(pad))
    for im, outn, seed in ((near, 'ortho_near_r.jpg', 1), (inner, 'ortho_inner_r.jpg', 2)):
        m0 = raster(im, polys)
        m = shadows(im.a, m0, im.res)
        res = fill(im.a, m, seed)
        Image.fromarray(res).save(os.path.join(OUT, outn), quality=88, optimize=True)
        if outn == 'ortho_near_r.jpg':
            Image.fromarray(res).resize((2048, 2048), Image.LANCZOS).save(os.path.join(OUT, 'ortho_near_r_lq.jpg'), quality=86, optimize=True)
        print(outn, 'masked', round(100.0 * (m0 > 0).mean(), 2), '% buildings,', round(100.0 * (m > 0).mean(), 2), '% with their shadows', flush=True)
        if a.debug:
            os.makedirs(a.debug, exist_ok=True)
            Image.fromarray(m).save(os.path.join(a.debug, outn.replace('.jpg', '_mask.png')))
    for f in sorted(os.listdir(OUT)):
        print(f, os.path.getsize(os.path.join(OUT, f)), flush=True)


if __name__ == '__main__':
    main()
