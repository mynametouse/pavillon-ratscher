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
# ---------------- geometry ----------------
WP, WT, WI, RP, RI = [], [], [], [], []   # wall positions, wall (u, v, type), wall indices, roof positions, roof indices
TYPE = lambda t: 0 if t in ('house', 'residential', 'detached', 'semidetached_house', 'terrace', 'apartments', 'yes', 'church', 'school', 'kindergarten') else (1 if t in ('barn', 'farm_auxiliary', 'agricultural', 'industrial', 'warehouse', 'shed', 'stable', 'cowshed', 'hangar', 'greenhouse', 'commercial', 'retail', 'roof', 'carport') else 2)
nb, ntri = 0, 0
bmask = np.zeros(ndom.shape, np.uint8)
for f in foot:
    P = f['utm']; poly = Polygon(P)
    if not poly.is_valid: poly = poly.buffer(0)
    if poly.geom_type != 'Polygon' or poly.area < 10: continue
    P = np.array(poly.exterior.coords)[:-1]
    if poly.exterior.is_ccw is False: P = P[::-1]
    mx, my = u2m(P[:, 0], P[:, 1]); cxm, cym = float(mx.mean()), float(my.mean())
    if np.any(in_site(mx, my)): continue
    if Polygon(np.stack([mx, my], 1)).buffer(0).intersects(CORR): continue
    # cells inside the footprint (1 m), eroded by one cell for the roof samples
    c, r = to_px(P[:, 0], P[:, 1]); m = np.zeros((int(r.max() - r.min()) + 5, int(c.max() - c.min()) + 5), np.uint8); oc, orr = int(c.min()) - 2, int(r.min()) - 2
    cv2.fillPoly(m, [np.stack([c - oc, r - orr], 1).round().astype(np.int32)], 1); er = cv2.erode(m, np.ones((3, 3), np.uint8))
    if er.sum() < 3: er = m
    rr_, cc_ = np.nonzero(er); R_ = rr_ + orr; C_ = cc_ + oc; ok = (R_ >= 0) & (R_ < 3000) & (C_ >= 0) & (C_ < 3000); R_, C_ = R_[ok], C_[ok]
    if len(R_) < 3: continue
    gr = dgm[np.clip(rr_ + orr, 0, 2999), np.clip(cc_ + oc, 0, 2999)]; Hb = float(np.nanpercentile(sample(dgm, P[:, 0], P[:, 1]), 10)) if True else float(np.nanmin(gr))
    rel = ndimage.median_filter(np.where(er > 0, (dom - Hb)[np.clip(np.arange(m.shape[0])[:, None] + orr, 0, 2999), np.clip(np.arange(m.shape[1])[None, :] + oc, 0, 2999)], np.nan), size=3, mode='nearest')
    vals = rel[rr_[ok], cc_[ok]]; vals = np.where(np.isfinite(vals), vals, np.nanmedian(vals))
    top = float(np.percentile(vals, 92))
    if top < 2.0: top = 2.4; vals = np.full_like(vals, 2.4)
    vals = np.clip(vals, 1.8, max(2.4, top + 0.3))
    flat = np.std(vals) < 0.35 or len(vals) < 12
    if flat: vals = np.full_like(vals, float(np.median(vals)))
    bmask[R_, C_] = 1
    k = float(flat_k(cxm, cym)); zb = (Hb - H0) * k                           # base follows the flattened terrain near the garden
    # roof: decimated interior samples + boundary points (every 2 m), triangulated
    step = 1 if len(vals) < 350 else (2 if len(vals) < 2500 else 3)
    sel = ((rr_[ok] % step) == 0) & ((cc_[ok] % step) == 0); if_ = np.nonzero(sel)[0]
    ip = np.stack([X0 + C_[if_] + 0.5, Y1 - (R_[if_] + 0.5)], 1); iv = vals[if_]
    kd = cKDTree(np.stack([X0 + C_ + 0.5, Y1 - (R_ + 0.5)], 1))
    bpts = []
    for i in range(len(P)):
        a, b = P[i], P[(i + 1) % len(P)]; L = np.hypot(*(b - a)); nseg = max(1, int(np.ceil(L / 2.0)))
        for j in range(nseg): bpts.append(a + (b - a) * j / nseg)
    bpts = np.array(bpts); _, bi = kd.query(bpts); bv = vals[bi]
    pts = np.vstack([bpts, ip]); hv = np.concatenate([bv, iv])
    if len(pts) < 3: continue
    try: tri = Delaunay(pts).simplices
    except Exception: continue
    cen_ = pts[tri].mean(axis=1); keep = Path(P).contains_points(cen_, radius=-0.01) | Path(P[::-1]).contains_points(cen_, radius=-0.01); tri = tri[keep]
    if not len(tri): continue
    X, Y = u2m(pts[:, 0], pts[:, 1]); Z = zb + hv
    base = len(RP) // 3; RP += np.stack([X, Y, Z], 1).ravel().tolist(); RI += (tri + base).ravel().tolist(); ntri += len(tri)
    # walls: along the boundary points (same heights as the roof edge), from slightly below the ground up to the eaves
    bx, by = u2m(bpts[:, 0], bpts[:, 1])
    # almost every footprint here is tagged only building=yes: size and shape decide (sheds and garages, houses, barns and halls)
    _r = cv2.minAreaRect(P.astype(np.float32)); _L, _W = max(_r[1]), max(0.1, min(_r[1])); A_ = poly.area
    if f['src'] == 'osm' and f['type'] not in ('yes', None): typ = TYPE(f['type'])
    elif A_ < 45 or float(np.max(vals)) < 3.2: typ = 2
    elif A_ > 260 or (_L / _W > 3.0 and _L > 18): typ = 1
    else: typ = 0
    u = 0.0
    nB = len(bpts)
    for i in range(nB):
        j = (i + 1) % nB; seg = float(np.hypot(bx[j] - bx[i], by[j] - by[i])); w0 = len(WP) // 3
        for (x, y, h, uu) in ((bx[i], by[i], bv[i], u), (bx[j], by[j], bv[j], u + seg)):
            WP += [float(x), float(y), zb - 0.6, float(x), float(y), zb + float(h)]; WT += [uu, -0.6, float(h), typ + 4 * nb, uu, float(h), float(h), typ + 4 * nb]   # (u along the wall, v height, wall top, type + 4 * building)
        WI += [w0, w0 + 2, w0 + 1, w0 + 1, w0 + 2, w0 + 3]; u += seg
    nb += 1
print('buildings', nb, 'roof triangles', ntri, 'wall vertices', len(WP) // 3)
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
