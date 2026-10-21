# Part D/E: 3D buildings (OSM footprints + unmapped ones found in the surface model) with roofs from the 1 m surface model (DOM),
# and real trees (tree tops in the canopy height model, vegetation from the colour-infrared orthophoto). Output in model coordinates.
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from common import *
import cv2
from PIL import Image
from scipy import ndimage
from scipy.spatial import Delaunay, cKDTree
from matplotlib.path import Path
from shapely.geometry import Polygon
from skimage.feature import peak_local_max
H0 = json.load(open(os.path.join(OUT, 'h0.json')))['H0']
dgm = mosaic('dgm'); dom = mosaic('dom'); ndom = np.nan_to_num(dom - dgm)
# colour infrared → vegetation index on the mosaic grid (CIR covers the inner square CX±1200 at 1 m: mosaic rows 300.., cols 450..)
cir = np.asarray(Image.open(os.path.join(DATA, 'cir_inner.jpg')).convert('RGB')).astype(np.float32)
ndvi = np.full(ndom.shape, -1.0, np.float32); r0, c0 = int(Y1 - (CY + 1200)), int(CX - 1200 - X0)
ndvi[r0:r0 + 2400, c0:c0 + 2400] = (cir[..., 0] - cir[..., 1]) / np.maximum(cir[..., 0] + cir[..., 1], 1)
dop = np.asarray(Image.open(os.path.join(DATA, 'dop_inner.jpg')).convert('RGB').resize((2400, 2400), Image.BILINEAR)).astype(np.float32)
bright = np.zeros(ndom.shape, np.float32); bright[r0:r0 + 2400, c0:c0 + 2400] = dop.mean(axis=2)
inner = np.zeros(ndom.shape, bool); inner[r0:r0 + 2400, c0:c0 + 2400] = True
def to_px(E, N): return (np.asarray(E) - X0), (Y1 - np.asarray(N))          # (col, row) float, pixel centres at +0.5
def in_site(x, y): return (x > -50) & (x < 42) & (y > -52) & (y < 48)     # the model's own garden and neighbours: no real buildings or trees there
# the model's field path and stream run 23 degrees off the real ones: keep their corridor free inside the flat near ground (+-122 m)
P1 = np.array([-18.36, 44.36]); U_ = np.array([28.08, 20.67]) - P1; U_ /= np.linalg.norm(U_); N_ = np.array([-U_[1], U_[0]]); N_ = -N_ if N_[1] > 0 else N_
def corr_o(x, y): return (np.asarray(x) - P1[0]) * N_[0] + (np.asarray(y) - P1[1]) * N_[1]
def in_corr(x, y, pad=0.0): x = np.asarray(x); y = np.asarray(y); o = corr_o(x, y); return (o > -3.5 - pad) & (o < 9.5 + pad) & (np.maximum(np.abs(x), np.abs(y)) < 122 + pad)
from shapely.geometry import box as _box
_c = [P1 + U_ * t + N_ * o for t, o in ((-400, -3.5), (400, -3.5), (400, 9.5), (-400, 9.5))]
CORR = Polygon(_c).intersection(_box(-122, -122, 122, 122))
# ---------------- footprints ----------------
osmb = json.load(open(os.path.join(OUT, 'osm_buildings.json')))
foot = []
for b in osmb: foot.append({'utm': np.array(b['utm']), 'type': b['type'] or 'yes', 'src': 'osm'})
mask_osm = np.zeros(ndom.shape, np.uint8)
for f in foot: c, r = to_px(f['utm'][:, 0], f['utm'][:, 1]); cv2.fillPoly(mask_osm, [np.stack([c, r], 1).astype(np.int32)], 1)
# unmapped buildings: high (>2.5 m), not vegetation, compact, not near a mapped one
cand = (ndom > 2.5) & (ndvi < 0.06) & inner & (cv2.dilate(mask_osm, np.ones((5, 5), np.uint8)) == 0)
cand = cv2.morphologyEx(cand.astype(np.uint8), cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)); cand = cv2.morphologyEx(cand, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
n, lab, st, cen = cv2.connectedComponentsWithStats(cand, 8); extra = 0
for i in range(1, n):
    a = st[i, cv2.CC_STAT_AREA]
    if a < 22 or a > 6000: continue
    comp = (lab[st[i, 1]:st[i, 1] + st[i, 3], st[i, 0]:st[i, 0] + st[i, 2]] == i).astype(np.uint8)
    cs, _ = cv2.findContours(comp, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE); cnt = max(cs, key=cv2.contourArea)
    rect = cv2.minAreaRect(cnt); rw, rh = rect[1]
    if min(rw, rh) < 3.0 or a / max(1, rw * rh) < 0.55: continue   # thin or ragged: hedges, wires, trucks
    hgt = np.percentile(ndom[lab == i], 90)
    if hgt > 22: continue                                           # a tall object without leaves is a mast or a dead tree, not a house
    approx = cv2.approxPolyDP(cnt, 0.9, True).reshape(-1, 2).astype(float)
    if len(approx) < 4 or cv2.contourArea(approx.astype(np.float32)) < 0.75 * a: approx = cv2.boxPoints(rect).astype(float) - [st[i, 0], st[i, 1]]
    px = approx + [st[i, 0], st[i, 1]]; E = X0 + px[:, 0]; N = Y1 - px[:, 1]
    foot.append({'utm': np.stack([E, N], 1), 'type': 'yes', 'src': 'dom'}); extra += 1
print('footprints', len(foot), 'of them from the surface model', extra)
# ---------------- geometry: LoD2-like roofs (flat, shed, gable, hip) fitted to the surface model, walls with gables ----------------
import mapbox_earcut as earcut
from shapely.geometry import MultiPolygon
from shapely.geometry.polygon import orient
WP, WT, RP, RI = [], [], [], []   # wall positions, wall (u, v, top, type + 4 * building), roof positions, roof indices
TYPE = lambda t: 0 if t in ('house', 'residential', 'detached', 'semidetached_house', 'terrace', 'apartments', 'yes', 'church', 'school', 'kindergarten') else (1 if t in ('barn', 'farm_auxiliary', 'agricultural', 'industrial', 'warehouse', 'shed', 'stable', 'cowshed', 'hangar', 'greenhouse', 'commercial', 'retail', 'roof', 'carport') else 2)
def robust_lin(X, y):   # least squares, three rounds without outliers (trees over the roof, chimneys, dormers)
    m = np.ones(len(y), bool); coef = np.zeros(X.shape[1])
    for _ in range(3):
        if m.sum() < X.shape[1] + 2: break
        coef = np.linalg.lstsq(X[m], y[m], rcond=None)[0]; res = y - X @ coef
        mad = np.median(np.abs(res[m])) * 1.48 + 0.1; m = np.abs(res) < max(0.8, 2.5 * mad)
    res = (y - X @ coef)[m]; return coef, (float(np.sqrt(np.mean(res ** 2))) if len(res) else 9.0)
def fit_roof(t, d, h, L, W, A):
    one = np.ones_like(h); cands = []
    cf, rf = robust_lin(one[:, None], h); cands.append(('flat', [(0.0, 0.0, cf[0])], rf))
    cg, rg = robust_lin(np.stack([one, np.abs(d)], 1), h); r, s = cg[0], -cg[1]
    if 0.12 < s < 1.7: cands.append(('gable', [(0.0, -s, r), (0.0, s, r)], rg))
    cg2, rg2 = robust_lin(np.stack([one, np.abs(t)], 1), h); r3, s3 = cg2[0], -cg2[1]   # ridge across the short side (gable towards the long side)
    if 0.12 < s3 < 1.7 and L < 1.6 * W: cands.append(('gable2', [(-s3, 0.0, r3), (s3, 0.0, r3)], rg2))
    a = max(0.0, (L - W) / 2); mh = np.maximum(np.abs(d), np.abs(t) - a)
    ch, rh = robust_lin(np.stack([one, mh], 1), h); r2, s2 = ch[0], -ch[1]
    if 0.12 < s2 < 1.7 and L > 6: cands.append(('hip', [(0.0, -s2, r2), (0.0, s2, r2), (-s2, 0.0, r2 + s2 * a), (s2, 0.0, r2 + s2 * a)], rh))
    cs, rs = robust_lin(np.stack([one, t, d], 1), h)
    if A < 120 and np.hypot(cs[1], cs[2]) < 1.2: cands.append(('shed', [(cs[1], cs[2], cs[0])], rs))
    best = cands[0]
    for c in cands[1:]:
        need = {'gable': 0.85, 'gable2': 0.85 if best[0] == 'flat' else 0.9, 'hip': 0.9 if best[0] == 'gable' else 0.8, 'shed': 0.72}[c[0]]
        if c[2] < need * best[2]: best = c
    STATS.append({c[0]: round(c[2], 2) for c in cands}); STATS[-1].update(L=round(L, 1), W=round(W, 1), A=round(A), best=best[0])
    return best
STATS = []
def zroof(planes, t, d): return np.min([gt * t + gd * d + c for (gt, gd, c) in planes], axis=0)
def clip_half(poly_pts, A, B, C):   # Sutherland–Hodgman: keep A t + B d + C <= 0
    out = []
    for i in range(len(poly_pts)):
        p, q = poly_pts[i], poly_pts[(i + 1) % len(poly_pts)]; fp, fq = A * p[0] + B * p[1] + C, A * q[0] + B * q[1] + C
        if fp <= 0: out.append(p)
        if (fp < 0 < fq) or (fq < 0 < fp): l = fp / (fp - fq); out.append((p[0] + (q[0] - p[0]) * l, p[1] + (q[1] - p[1]) * l))
    return out
def regions(poly, planes):   # where each plane is the lowest: the faces of the roof
    for i, (gi, di, ci) in enumerate(planes):
        cell = [(-900, -900), (900, -900), (900, 900), (-900, 900)]
        for j, (gj, dj, cj) in enumerate(planes):
            if j != i: cell = clip_half(cell, gi - gj, di - dj, ci - cj)
            if len(cell) < 3: break
        if len(cell) < 3: continue
        g = poly.intersection(Polygon(cell))
        for pg in (g.geoms if hasattr(g, 'geoms') else [g]):
            if pg.geom_type == 'Polygon' and pg.area > 0.05: yield i, orient(pg, 1.0)
nb, ntri, kinds = 0, 0, {}
bmask = np.zeros(ndom.shape, np.uint8)
for f in foot:
    P = f['utm']; poly = Polygon(P)
    if not poly.is_valid: poly = poly.buffer(0)
    if poly.geom_type == 'MultiPolygon': poly = max(poly.geoms, key=lambda g: g.area)
    if poly.geom_type != 'Polygon' or poly.area < 10: continue
    poly = orient(poly.simplify(0.25), 1.0); P = np.array(poly.exterior.coords)[:-1]
    mx, my = u2m(P[:, 0], P[:, 1]); cxm, cym = float(mx.mean()), float(my.mean())
    if np.any(in_site(mx, my)): continue
    if Polygon(np.stack([mx, my], 1)).buffer(0).intersects(CORR): continue
    # surface samples (1 m cells, one cell inside the outline)
    c, r = to_px(P[:, 0], P[:, 1]); m = np.zeros((int(r.max() - r.min()) + 5, int(c.max() - c.min()) + 5), np.uint8); oc, orr = int(c.min()) - 2, int(r.min()) - 2
    cv2.fillPoly(m, [np.stack([c - oc, r - orr], 1).round().astype(np.int32)], 1); bm = m.copy(); er = cv2.erode(m, np.ones((3, 3), np.uint8))
    if er.sum() < 6: er = m
    rr_, cc_ = np.nonzero(er); R_ = np.clip(rr_ + orr, 0, 2999); C_ = np.clip(cc_ + oc, 0, 2999)
    if len(R_) < 4: continue
    Hb = float(np.nanpercentile(sample(dgm, P[:, 0], P[:, 1]), 10)); hv = dom[R_, C_] - Hb; okv = np.isfinite(hv); hv = hv[okv]
    if len(hv) < 4: continue
    rb, cb = np.nonzero(bm); bmask[np.clip(rb + orr, 0, 2999), np.clip(cb + oc, 0, 2999)] = 1
    # local frame: t along the long side of the smallest enclosing rectangle (the ridge), d across
    (rcx, rcy), (rw, rh), ang = cv2.minAreaRect(P.astype(np.float32)); ang = np.radians(ang)
    ux, uy = (np.cos(ang), np.sin(ang)) if rw >= rh else (-np.sin(ang), np.cos(ang)); L, W = max(rw, rh), max(0.5, min(rw, rh))
    loc = lambda E, N: ((E - rcx) * ux + (N - rcy) * uy, -(E - rcx) * uy + (N - rcy) * ux)
    sE = X0 + C_[okv] + 0.5; sN = Y1 - (R_[okv] + 0.5); st_, sd_ = loc(sE, sN)
    kind, planes, rms = fit_roof(st_, sd_, hv, L, W, poly.area)
    if kind in ('gable', 'gable2', 'hip'):   # plausible pitch (14°–50°)
        s0 = abs(planes[0][0]) + abs(planes[0][1]); s1 = float(np.clip(s0, 0.25, 1.2)); ridge = planes[0][2]
        planes = [(gt / s0 * s1 if gt else 0.0, gd / s0 * s1 if gd else 0.0, ridge + (c_ - ridge) / s0 * s1 if abs(c_ - ridge) > 1e-6 else c_) for (gt, gd, c_) in planes]
    pl = Polygon(np.stack(loc(P[:, 0], P[:, 1]), 1))
    if not pl.is_valid: pl = pl.buffer(0)
    if pl.geom_type == 'MultiPolygon': pl = max(pl.geoms, key=lambda g: g.area)
    pl = orient(pl, 1.0)
    eave = float(np.min(zroof(planes, *np.array(pl.exterior.coords).T)))
    if eave < 2.3: planes = [(gt, gd, c_ + 2.3 - eave) for (gt, gd, c_) in planes]
    kinds[kind] = kinds.get(kind, 0) + 1
    k = float(flat_k(cxm, cym)); zb = (Hb - H0) * k                           # base follows the flattened terrain near the garden
    back = lambda t, d: u2m(rcx + t * ux - d * uy, rcy + t * uy + d * ux)
    # roof faces: the outline plus 35 cm of eaves, cut where the planes meet, triangulated
    roofp = orient(pl.buffer(0.35, join_style=2, mitre_limit=2.5), 1.0)
    for i, face in regions(roofp, planes):
        rings = [np.array(face.exterior.coords)[:-1]] + [np.array(h.coords)[:-1] for h in face.interiors]
        vv = np.vstack(rings); ends = np.cumsum([len(x) for x in rings]).astype(np.uint32)
        tri = earcut.triangulate_float64(vv.astype(np.float64), ends).reshape(-1, 3)
        if not len(tri): continue
        X, Y = back(vv[:, 0], vv[:, 1]); gt, gd, c_ = planes[i]; Z = zb + gt * vv[:, 0] + gd * vv[:, 1] + c_
        base = len(RP) // 3; RP += np.stack([X, Y, Z], 1).ravel().tolist(); RI += (tri + base).ravel().tolist(); ntri += len(tri)
    # walls: every ring of the outline, split where the roof above changes plane (gables), from below the ground up to the roof
    A_ = poly.area
    if f['src'] == 'osm' and f['type'] not in ('yes', None): typ = TYPE(f['type'])
    elif A_ < 45 or float(np.percentile(hv, 90)) < 3.2: typ = 2
    elif A_ > 260 or (L / W > 3.0 and L > 18): typ = 1
    else: typ = 0
    for ring in [pl.exterior] + list(pl.interiors):
        Q = np.array(ring.coords)[:-1]; u = 0.0
        for i in range(len(Q)):
            p0, p1 = Q[i], Q[(i + 1) % len(Q)]; lam = [0.0, 1.0]
            for a_ in range(len(planes)):
                for b_ in range(a_ + 1, len(planes)):
                    ga, da, ca = planes[a_]; gb, db, cb = planes[b_]; f0 = (ga - gb) * p0[0] + (da - db) * p0[1] + (ca - cb); f1 = (ga - gb) * p1[0] + (da - db) * p1[1] + (ca - cb)
                    if (f0 < 0 < f1) or (f1 < 0 < f0): lam.append(f0 / (f0 - f1))
            lam = sorted(set(round(l_, 5) for l_ in lam)); pts = np.array([p0 + (p1 - p0) * l_ for l_ in lam]); zt = zroof(planes, pts[:, 0], pts[:, 1])
            X, Y = back(pts[:, 0], pts[:, 1]); seg = np.hypot(*(p1 - p0))
            for q in range(len(pts) - 1):
                w0 = len(WP) // 3; u0 = u + seg * lam[q]; u1 = u + seg * lam[q + 1]
                for (x, y, h, uu) in ((X[q], Y[q], zt[q], u0), (X[q + 1], Y[q + 1], zt[q + 1], u1)):
                    WP += [float(x), float(y), zb - 0.6, float(x), float(y), zb + float(h)]; WT += [uu, -0.6, float(h), typ + 4 * nb, uu, float(h), float(h), typ + 4 * nb]
            u += seg
    nb += 1
WI = []
print('buildings', nb, 'roof triangles', ntri, 'wall vertices', len(WP) // 3, 'roof kinds', kinds); json.dump(STATS, open(os.path.join(OUT, 'roof_stats.json'), 'w'))
# ---------------- trees ----------------
veg = (ndvi > 0.10) & inner & (cv2.dilate(bmask, np.ones((3, 3), np.uint8)) == 0)
chm = np.where(veg & (ndom > 2.5), ndom, 0).astype(np.float32); chs = ndimage.gaussian_filter(chm, 1.2)
pk = peak_local_max(chs, min_distance=2, threshold_abs=3.2, exclude_border=False)
h = chs[pk[:, 0], pk[:, 1]]; order = np.argsort(-h); pk, h = pk[order], h[order]
E = X0 + pk[:, 1] + 0.5; N = Y1 - (pk[:, 0] + 0.5); tx, ty = u2m(E, N); rad = np.clip(0.2 * h + 0.9, 1.4, 6.5)
# non-maximum suppression: a lower top within 0.55 of the higher crown's radius belongs to the same tree
kd = cKDTree(np.stack([tx, ty], 1)); alive = np.ones(len(h), bool)
for i in range(len(h)):
    if not alive[i]: continue
    for j in kd.query_ball_point([tx[i], ty[i]], rad[i] * 0.55):
        if j > i: alive[j] = False
ok = alive & ~in_site(tx, ty) & ~in_corr(tx, ty, 0.0)
ndv = ndvi[pk[:, 0], pk[:, 1]]; br = bright[pk[:, 0], pk[:, 1]]
brs = ndimage.gaussian_filter(bright, 4)[pk[:, 0], pk[:, 1]]                  # crown brightness (smoothed over ~4 m)
nbr = np.array([len(x) for x in cKDTree(np.stack([tx, ty], 1)).query_ball_point(np.stack([tx, ty], 1), 15.0)])
pc = np.where(brs < 74, 0.85, np.where(brs < 92, 0.45, 0.12)) * np.where(nbr >= 6, 1.0, 0.35)
hsh = (np.sin(tx * 12.9898 + ty * 78.233) * 43758.5453) % 1.0
con = hsh < pc
gz = (sample(dgm, E, N) - H0) * flat_k(tx, ty)
T = np.stack([tx, ty, gz, h, rad, con.astype(np.float32)], 1)[ok].astype('<f4')
print('trees', len(T), 'conifers', int(T[:, 5].sum()))
open(os.path.join(OUT, 'trees.bin'), 'wb').write(T.tobytes())
wp = np.array(WP, '<f4'); wt = np.array(WT, '<f4'); wi = np.array(WI, '<u4'); rp = np.array(RP, '<f4'); ri = np.array(RI, '<u4')
blob = wp.tobytes() + wt.tobytes() + wi.tobytes() + rp.tobytes() + ri.tobytes(); open(os.path.join(OUT, 'buildings.bin'), 'wb').write(blob)
json.dump({'walls': {'n': len(wp) // 3, 'idx': len(wi), 'k': 4}, 'roofs': {'n': len(rp) // 3, 'idx': len(ri)}, 'trees': len(T), 'buildings': nb}, open(os.path.join(OUT, 'bld_meta.json'), 'w'))
print('buildings.bin', len(blob), 'trees.bin', T.nbytes)
