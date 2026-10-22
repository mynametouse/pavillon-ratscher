"""Smooth, even roads on the published 10 m terrain (prototype of 22.10.2026, not applied yet - interim fix until the tile world
builds roads as their own geometry from DGM1 1 m profiles, see claude/pavillon-welt.md).
Why the roads are bumpy: OpenStreetMap has no heights; the ground under a road comes from the 10 m grid, point-sampled from DGM1,
which catches ditches and slopes beside the road. Measured on the main road: 55 waves/km before, under 4 after.
- Network: ways share a node where they share a vertex; a way end lying on another way (T junction, within 3 m) is joined to it.
- Profile: least squares over all roads together - stay near the terrain (long waves), penalise curvature by road class
  (Whittaker smoother: waves shorter than L are removed), the modelled square (|x|,|y| < 120 m) fixed at 0, bridges straight.
- Terrain: grid vertices within half width + FULL are set to the road, fading out over FADE; where several roads are near,
  their heights are averaged (they agree at junctions now). Near building walls the change is limited (walls reach 0.6 m below ground).
- Measured like the app sees it: the triangles of the 10 m mesh with the grid lines next to +-120 m moved onto the edge.
    python3 -I tools/geo/smooth_roads.py viz3/dist/geo viz3/manifests.json <outdir> [FULL FADE]
    python3 -I tools/geo/smooth_roads.py viz3/dist/geo viz3/manifests.json <outdir> --measure   # check only: exit 1 if roads are too wavy
writes <outdir>/terrain.b64.json (replaces viz3/dist/geo/terrain.b64.json; outer grid unchanged) and prints the metrics before/after;
once applied, viz3/manifests.json gets geoman.terrain.roads = '<what, when>' so it is not applied twice;
z0.npy, z1.npy, network.json are for diagnostics. Before using it: look at it in the app (drive the main road, the village, bridges).
Known limits: the bench beside a road is as wide as the 10 m grid allows (cut/fill up to ~2 m on slopes); junction steps are much
smaller but not gone; near building walls the change is limited."""
import sys, os, json, base64, collections, numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import spsolve
from scipy.spatial import cKDTree

A = [a for a in sys.argv[1:] if not a.startswith('--')]
G, MAN, OUT = A[:3]; os.makedirs(OUT, exist_ok=True)
FULL = float(A[3]) if len(A) > 3 else 6.0
FADE = float(A[4]) if len(A) > 4 else 8.0
M = json.load(open(MAN))['geoman']; I = M['terrain']['inner']; n, st, x0, y0 = I['n'], I['step'], I['x0'], I['y0']
MEASURE = '--measure' in sys.argv   # only measure the given terrain (CI check), change nothing
if M['terrain'].get('roads') and '--force' not in sys.argv and not MEASURE:   # the published terrain is smoothed already (marker in the manifest)
    sys.exit(f"terrain already smoothed ({M['terrain']['roads']}) – smoothing it again would flatten it twice; --force to do it anyway")
raw = bytearray(base64.b64decode(json.load(open(os.path.join(G, 'terrain.b64.json')))['b64']))
z0 = np.frombuffer(bytes(raw), dtype='<i2', count=n * n).reshape(n, n).astype(float) / 10.0
XS = x0 + np.arange(n) * st; YS = y0 + np.arange(n) * st
iL, iR, jB, jT = round((-120 - x0) / st), round((120 - x0) / st), round((-120 - y0) / st), round((120 - y0) / st)
XS[iL], XS[iR], YS[jB], YS[jT] = -120.0, 120.0, -120.0, 120.0
JOIN = 3.0   # m: a way end this close to another way is joined to it (T junction); farther ends stay free (was 30 by mistake until 22.10. 23:00)
L_CUT = {'motorway': 320, 'main': 240, 'county': 210, 'street': 130, 'lane': 130, 'service': 100, 'track': 100}   # m: shorter waves removed
GMAX = {'motorway': 5, 'main': 9, 'county': 10, 'street': 12, 'lane': 14, 'service': 15, 'track': 18}               # % over 10 m (check only)

def hmesh(z, x, y):
    if abs(x) < 120 and abs(y) < 120: return 0.0
    i = int(np.floor((x - x0) / st)); j = int(np.floor((y - y0) / st))
    if i < 0 or j < 0 or i > n - 2 or j > n - 2: return np.nan
    if i > 0 and x < XS[i]: i -= 1
    elif i < n - 2 and x >= XS[i + 1]: i += 1
    if j > 0 and y < YS[j]: j -= 1
    elif j < n - 2 and y >= YS[j + 1]: j += 1
    u = (x - XS[i]) / (XS[i + 1] - XS[i]); v = (y - YS[j]) / (YS[j + 1] - YS[j])
    za, zb, zc, zd = z[j, i], z[j, i + 1], z[j + 1, i + 1], z[j + 1, i]
    return za + u * (zb - za) + v * (zc - zb) if u >= v else za + v * (zd - za) + u * (zc - zd)

# ---- ways (coordinates kept in exact decimetres for node matching) ----
KINDS = M['roads']['kinds']
a = np.frombuffer(base64.b64decode(json.load(open(os.path.join(G, 'roads.b64.json')))['b64']), dtype='<i2'); o = 0; ways = []
while o + 5 <= len(a):
    k = int(a[o]); kind = KINDS[int(a[o + 1])]; w = a[o + 3] / 10; fl = int(a[o + 4]); o += 5
    q = [tuple(v) for v in a[o:o + k * 2].astype(np.int64).reshape(-1, 2)]; o += k * 2
    ways.append(dict(kind=kind, w=w, fl=fl, q=q))
use = [wy for wy in ways if wy['kind'] in L_CUT]
# T junctions: a way end that is no vertex of another way but lies within 3 m of one gets inserted into that way
count = collections.Counter(v for wy in use for v in set(wy['q']))
joined = 0
for wy in use:
    for e in (wy['q'][0], wy['q'][-1]):
        if count[e] > 1: continue
        best = None
        for ot in use:
            if ot is wy: continue
            P = np.array(ot['q'], float)
            for s in range(len(P) - 1):
                A, B = P[s], P[s + 1]; AB = B - A; L2 = AB @ AB
                if L2 < 1: continue
                t = np.clip((np.array(e, float) - A) @ AB / L2, 0, 1); d = np.hypot(*(A + t * AB - e))
                if d < JOIN and (best is None or d < best[0]): best = (d, ot, s, t)
        if best and 0 < best[3] < 1:
            best[1]['q'].insert(best[2] + 1, e); count[e] += 1; joined += 1
        elif best:   # nearest point is the other way's vertex: snap the end onto it
            v = best[1]['q'][best[2] + (1 if best[3] >= 1 else 0)]; wy['q'][wy['q'].index(e)] = v; count[v] += 1; joined += 1
print('T junctions joined:', joined)

# ---- nodes: shared vertices + samples every <= 2 m ----
key2id, pos, chains = {}, [], []
def node(key=None, xy=None):
    if key is not None and key in key2id: return key2id[key]
    pos.append(np.array(key, float) / 10 if key is not None else xy); nid = len(pos) - 1
    if key is not None: key2id[key] = nid
    return nid
for wy in use:
    ids = []
    for s in range(len(wy['q'])):
        nid = node(wy['q'][s])
        if s:
            A, B = pos[ids[-1]], pos[nid]; m = int(np.ceil(np.hypot(*(B - A)) / 2.0))
            for t in range(1, m): ids.append(node(xy=A + (B - A) * t / m))
        ids.append(nid)
    chains.append((wy, ids))
pos = np.array(pos); N = len(pos)
deg = collections.Counter(i for _, ids in chains for i in set(ids))
print('nodes', N, 'junction nodes', sum(1 for i, c in deg.items() if c > 1))

# ---- measure like the app ----
def stats(z, label):
    out = {}; steep = collections.Counter()
    for wy, ids in chains:
        if wy['fl'] & 1: continue
        P = pos[ids]; seg = np.hypot(*np.diff(P, axis=0).T); cum = np.concatenate([[0], np.cumsum(seg)])
        s = np.arange(0, cum[-1], 2.0)
        if len(s) < 30: continue
        xs, ys = np.interp(s, cum, P[:, 0]), np.interp(s, cum, P[:, 1])
        hh = np.array([hmesh(z, x, y) for x, y in zip(xs, ys)])
        g10 = (hh[5:] - hh[:-5]) / 10 * 100; dg = np.abs(np.diff(g10[::5]))
        sm = np.convolve(np.pad(hh, 15, mode='edge'), np.ones(31) / 31, 'valid'); dev = hh - sm
        bumps = int(np.sum((np.abs(np.diff(np.sign(np.diff(hh)))) > 0) & (np.abs(dev[1:-1]) > 0.15)))
        rr = out.setdefault(wy['kind'], dict(km=0, dg=[], bumps=0, maxg=0)); rr['km'] += cum[-1] / 1000; rr['dg'] += list(dg); rr['bumps'] += bumps
        rr['maxg'] = max(rr['maxg'], float(np.max(np.abs(g10)))); steep[wy['kind']] += int(np.sum(np.abs(g10) > GMAX[wy['kind']] + 3))
    print(f'== {label}')
    for k, rr in sorted(out.items(), key=lambda kv: -kv[1]['km']):
        print(f"  {k:8s} {rr['km']:5.1f} km  Steigungswechsel je 10 m Ø {np.mean(rr['dg']):4.1f} % (p90 {np.percentile(rr['dg'], 90):4.1f})"
              f"  Wellen/km {rr['bumps'] / rr['km']:5.1f}  max Steigung {rr['maxg']:5.1f} %  Stellen über Klassengrenze+3 % {steep[k]}")
    return out
WAVES_MAX = {'motorway': 4, 'main': 8, 'county': 8}   # waves per km the smoothed roads must stay below (CI)
if MEASURE:
    r = stats(z0, 'gemessen')
    bad = [f"{k} {r[k]['bumps'] / r[k]['km']:.1f}/km > {lim}" for k, lim in WAVES_MAX.items() if k in r and r[k]['bumps'] / r[k]['km'] > lim]
    print('Straßen zu wellig: ' + ', '.join(bad) if bad else 'Straßen glatt genug: ' + ', '.join(f"{k} {r[k]['bumps'] / r[k]['km']:.1f}/km" for k in WAVES_MAX if k in r))
    sys.exit(1 if bad else 0)

# ---- least squares: data rows + curvature rows ----
t = np.array([hmesh(z0, x, y) for x, y in pos]); t = np.where(np.isnan(t), np.nanmean(t), t)
insite = (np.abs(pos[:, 0]) < 120) & (np.abs(pos[:, 1]) < 120)
on_bridge = np.zeros(N, bool); only_bridge = np.ones(N, bool); ds = np.zeros(N)
for wy, ids in chains:
    P = pos[ids]; seg = np.hypot(*np.diff(P, axis=0).T)
    for j, i in enumerate(ids):
        ds[i] += ((seg[j - 1] if j else 0) + (seg[j] if j < len(seg) else 0)) / 2
        if wy['fl'] & 1: on_bridge[i] = True
        else: only_bridge[i] = False
rows, cols, vals, rhs = [], [], [], []
r = 0
for i in range(N):
    if only_bridge[i]: continue                  # under a bridge the terrain is the valley: no data
    wgt = 1e4 if insite[i] else max(ds[i], 0.5)   # the modelled square stays at 0
    rows.append(r); cols.append(i); vals.append(np.sqrt(wgt)); rhs.append(np.sqrt(wgt) * t[i]); r += 1
for wy, ids in chains:
    lam = 1e9 if wy['fl'] & 1 else (L_CUT[wy['kind']] / (2 * np.pi)) ** 4
    P = pos[ids]
    for j in range(1, len(ids) - 1):
        d1 = np.hypot(*(P[j] - P[j - 1])); d2 = np.hypot(*(P[j + 1] - P[j])); dm = (d1 + d2) / 2
        if d1 < 0.05 or d2 < 0.05: continue
        sw = np.sqrt(lam * dm)
        for c, v in ((ids[j - 1], 1 / (d1 * dm)), (ids[j], -(1 / d1 + 1 / d2) / dm), (ids[j + 1], 1 / (d2 * dm))):
            rows.append(r); cols.append(c); vals.append(sw * v)
        rhs.append(0.0); r += 1
A = coo_matrix((vals, (rows, cols)), shape=(r, N)).tocsr(); b = np.array(rhs)
h = spsolve((A.T @ A).tocsc(), A.T @ b)
print('profile solved; road height change vs terrain: mean %.2f m, p95 %.2f m, max %.2f m' % (
    np.mean(np.abs(h - t)[~only_bridge]), np.percentile(np.abs(h - t)[~only_bridge], 95), np.max(np.abs(h - t)[~only_bridge])))

# ---- pull the grid to the profiles ----
hwN = np.zeros(N); wayN = np.full(N, -1); rast = np.zeros(N, bool)
for wi, (wy, ids) in enumerate(chains):
    for i in ids:
        if wy['fl'] & 1: continue
        if wy['w'] / 2 >= hwN[i]: hwN[i] = wy['w'] / 2
        wayN[i] = wi; rast[i] = True
idx = np.flatnonzero(rast); tree = cKDTree(pos[idx])
# under and beside a bridge the valley stays as it is (the deck is drawn by world/roads.js between the two ends)
bnodes = [i for wy, ids in chains if wy['fl'] & 1 for i in ids]; bhw = max([wy['w'] / 2 for wy, ids in chains if wy['fl'] & 1] or [0])
btree = cKDTree(pos[bnodes]) if bnodes else None
# building walls: change limited within 6 m, free from 10 m
bl = M['bld']; wb = np.frombuffer(base64.b64decode(json.load(open(os.path.join(G, 'buildings.b64.json')))['b64']), dtype='<i2', count=bl['walls'] * 3).reshape(-1, 3)
wall = cKDTree(wb[:, :2].astype(float) / 10)
z1 = z0.copy(); RE = max(hwN) + FULL + FADE + 1.5
gxx, gyy = np.meshgrid(XS, YS)
cand = tree.query_ball_point(np.stack([gxx.ravel(), gyy.ravel()], 1), RE)
for flat, nb in enumerate(cand):
    if not nb: continue
    j, i = divmod(flat, n); X, Y = XS[i], YS[j]
    if abs(X) <= 120 and abs(Y) <= 120: continue
    if btree is not None and btree.query([X, Y])[0] < bhw + 6: continue
    per = {}
    for q in nb:
        g = idx[q]; d = np.hypot(X - pos[g, 0], Y - pos[g, 1]); w_ = wayN[g]
        if w_ not in per or d < per[w_][0]: per[w_] = (d, g)
    ws = hs = wmax = 0.0
    for d, g in per.values():
        tt = np.clip((d - (hwN[g] + FULL)) / FADE, 0, 1); wv = 1 - tt * tt * (3 - 2 * tt)
        ws += wv; hs += wv * h[g]; wmax = max(wmax, wv)
    if ws <= 0: continue
    dz = wmax * (hs / ws - z0[j, i])
    dw = wall.query([X, Y])[0]
    if dw < 10:   # near a wall: limit (lowering reveals the wall foot, raising buries doors)
        f = np.clip((dw - 6) / 4, 0, 1); lo, hi = -0.4 + f * (-50 + 0.4), 0.3 + f * (50 - 0.3); dz = min(max(dz, lo), hi)
    z1[j, i] = z0[j, i] + dz

before = stats(z0, 'vorher'); after = stats(z1, f'nachher v3 (FULL {FULL}, FADE {FADE})')
mv = np.abs(z1 - z0); print(f'Geländepunkte verändert: {(mv > 0.05).sum()} von {n * n}, Ø {mv[mv > 0.05].mean():.2f} m, p95 {np.percentile(mv[mv > 0.05], 95):.2f} m, max {mv.max():.2f} m')
zi = np.round(z1 * 10).astype('<i2').tobytes(); raw[0:n * n * 2] = zi
json.dump({'b64': base64.b64encode(bytes(raw)).decode()}, open(os.path.join(OUT, 'terrain.b64.json'), 'w'))
np.save(os.path.join(OUT, 'z0.npy'), z0); np.save(os.path.join(OUT, 'z1.npy'), z1)
json.dump({'pos': pos.tolist(), 'h': h.tolist(), 'chains': [[wy['kind'], int(wy['fl']), ids] for wy, ids in chains]}, open(os.path.join(OUT, 'network.json'), 'w'))
print('written', OUT)
