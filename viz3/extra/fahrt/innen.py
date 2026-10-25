"""The roads inside the 2.4 km square on the app's 10 m terrain, repaired for driving (feat/fahrt, round 2).

    python3 -I viz3/extra/fahrt/innen.py <published geo dir> viz3/manifests.json   -> viz3/extra/fahrt/dist/geo/terrain.b64.json
    <published geo dir>: terrain.b64.json, roads.b64.json, buildings.b64.json as on the site (…/pavillon-ratscher/geo/) – not viz3/dist/geo,
    where the build has put this file already (the script refuses a terrain that carries its mark)

Why: the published inner terrain (gh-pages geo/terrain.b64.json, smoothed along the roads in V16f with tools/geo/smooth_roads.py) still
throws a car into the air on the L 3004 before Schleusingen (grade 5 -> 17 % within 10 m, airborne at 60 km/h) and has grade jumps of
8-34 % elsewhere on the way garden -> Schleusingen. Causes found (23.10.2026): a grid vertex near several roads took the plain average of
their profiles, so a track or a street beside the county road pulled the county road's carriageway to its own height; the vertices within
half width + 6 m of a bridge were left alone, so the approach to a deck kept the valley's slope; T junctions were joined only within 0.3 m
(decimetres compared with 3).
What this does, on the published terrain (no originals needed): the same network and least-squares profiles as smooth_roads.py (shared
junctions, bridges straight, the modelled square fixed at 0, waves shorter than L_CUT removed per class), then the grid pulled to the
profiles with the classes in order - a vertex within reach of a higher road takes that road's height (the lower ones only fill in where
it does not reach), so the carriageway of the L 3004 is the L 3004's. Bridges: only the vertices under a deck stay (the valley), the
approach is pulled to the profile, which runs straight over the bridge. Building walls limit the change as in smooth_roads.py.
Output: the same file layout (inner grid replaced, outer grid unchanged) as an extra of the drive (viz3/extra/README.md) - build.py copies
it over dist/geo/terrain.b64.json, so the app, the CI and the next deploy use it; prints the grade jumps along the two routes and the
waves per km by class (as smooth_roads.py --measure) before and after."""
import sys, os, json, base64, collections, math
import numpy as np
from scipy.sparse import coo_matrix
from scipy.sparse.linalg import spsolve
from scipy.spatial import cKDTree

HERE = os.path.dirname(os.path.abspath(__file__))
GEO, MAN = sys.argv[1], sys.argv[2]
OUT = os.path.join(HERE, 'dist', 'geo', 'terrain.b64.json')
DBG = [float(v) for v in sys.argv[sys.argv.index('--dbg') + 1].split(',')] if '--dbg' in sys.argv else None   # print the vertices near x,y
M = json.load(open(MAN))['geoman']
I = M['terrain']['inner']
n, st, x0, y0 = I['n'], I['step'], I['x0'], I['y0']
src = json.load(open(os.path.join(GEO, 'terrain.b64.json')))
if 'fahrt' in src:
    sys.exit(f"{GEO}/terrain.b64.json is the repaired terrain already ({src['fahrt']}) – give the published one (the site's geo/)")
raw = bytearray(base64.b64decode(src['b64']))
z0 = np.frombuffer(bytes(raw), dtype='<i2', count=n * n).reshape(n, n).astype(float) / 10.0
XS = x0 + np.arange(n) * st
YS = y0 + np.arange(n) * st
iL, iR, jB, jT = round((-120 - x0) / st), round((120 - x0) / st), round((-120 - y0) / st), round((120 - y0) / st)
XS[iL], XS[iR], YS[jB], YS[jT] = -120.0, 120.0, -120.0, 120.0
JOIN = 3.0      # m: a way end this close to another way is joined to it (T junction; smooth_roads.py compares decimetres with 3, i.e. 0.3 m)
FULL, FADE = 6.0, 8.0
L_CUT = {'motorway': 320, 'main': 240, 'county': 210, 'street': 130, 'lane': 130, 'service': 100, 'track': 100}
RANK = {'motorway': 6, 'main': 6, 'county': 5, 'street': 4, 'lane': 3, 'service': 2, 'track': 1}
GMAX = {'motorway': 5, 'main': 9, 'county': 10, 'street': 12, 'lane': 14, 'service': 15, 'track': 18}


def hmesh(z, x, y):
    if abs(x) < 120 and abs(y) < 120:
        return 0.0
    i = int(np.floor((x - x0) / st))
    j = int(np.floor((y - y0) / st))
    if i < 0 or j < 0 or i > n - 2 or j > n - 2:
        return np.nan
    if i > 0 and x < XS[i]:
        i -= 1
    elif i < n - 2 and x >= XS[i + 1]:
        i += 1
    if j > 0 and y < YS[j]:
        j -= 1
    elif j < n - 2 and y >= YS[j + 1]:
        j += 1
    u = (x - XS[i]) / (XS[i + 1] - XS[i])
    v = (y - YS[j]) / (YS[j + 1] - YS[j])
    za, zb, zc, zd = z[j, i], z[j, i + 1], z[j + 1, i + 1], z[j + 1, i]
    return za + u * (zb - za) + v * (zc - zb) if u >= v else za + v * (zd - za) + u * (zc - zd)


# ---- the app's roads (world/roads.js data), building walls ----
KINDS = M['roads']['kinds']
a = np.frombuffer(base64.b64decode(json.load(open(os.path.join(GEO, 'roads.b64.json')))['b64']), dtype='<i2')
o = 0
ways = []
while o + 5 <= len(a):
    k = int(a[o])
    kind = KINDS[int(a[o + 1])]
    w = a[o + 3] / 10
    fl = int(a[o + 4])
    o += 5
    q = [tuple(v) for v in a[o:o + k * 2].astype(np.int64).reshape(-1, 2)]
    o += k * 2
    ways.append(dict(kind=kind, w=w, fl=fl, q=q))
use = [wy for wy in ways if wy['kind'] in L_CUT]
bl = M['bld']
wb = np.frombuffer(base64.b64decode(json.load(open(os.path.join(GEO, 'buildings.b64.json')))['b64']), dtype='<i2', count=bl['walls'] * 3).reshape(-1, 3)
wall = cKDTree(wb[:, :2].astype(float) / 10)
# T junctions (as smooth_roads.py, a little wider)
count = collections.Counter(v for wy in use for v in set(wy['q']))
joined = 0
for wy in use:
    for e in (wy['q'][0], wy['q'][-1]):
        if count[e] > 1:
            continue
        best = None
        for ot in use:
            if ot is wy:
                continue
            P = np.array(ot['q'], float)
            for s in range(len(P) - 1):
                A, B = P[s], P[s + 1]
                AB = B - A
                L2 = AB @ AB
                if L2 < 1:
                    continue
                t = np.clip((np.array(e, float) - A) @ AB / L2, 0, 1)
                d = np.hypot(*(A + t * AB - e)) / 10
                if d < JOIN and (best is None or d < best[0]):
                    best = (d, ot, s, t)
        if best and 0 < best[3] < 1:
            best[1]['q'].insert(best[2] + 1, e)
            count[e] += 1
            joined += 1
        elif best:
            v = best[1]['q'][best[2] + (1 if best[3] >= 1 else 0)]
            wy['q'][wy['q'].index(e)] = v
            count[v] += 1
            joined += 1
print('T-Kreuzungen verbunden:', joined)
# ---- nodes every <= 2 m ----
key2id, pos, chains = {}, [], []


def node(key=None, xy=None):
    if key is not None and key in key2id:
        return key2id[key]
    pos.append(np.array(key, float) / 10 if key is not None else xy)
    nid = len(pos) - 1
    if key is not None:
        key2id[key] = nid
    return nid


for wy in use:
    ids = []
    for s in range(len(wy['q'])):
        nid = node(wy['q'][s])
        if s:
            A, B = pos[ids[-1]], pos[nid]
            m = int(np.ceil(np.hypot(*(B - A)) / 2.0))
            for t in range(1, m):
                ids.append(node(xy=A + (B - A) * t / m))
        ids.append(nid)
    chains.append((wy, ids))
pos = np.array(pos)
N = len(pos)


def stats(z, label):
    """waves per km by class, like smooth_roads.py --measure"""
    out = {}
    for wy, ids in chains:
        if wy['fl'] & 1:
            continue
        P = pos[ids]
        seg = np.hypot(*np.diff(P, axis=0).T)
        cum = np.concatenate([[0], np.cumsum(seg)])
        s = np.arange(0, cum[-1], 2.0)
        if len(s) < 30:
            continue
        xs, ys = np.interp(s, cum, P[:, 0]), np.interp(s, cum, P[:, 1])
        hh = np.array([hmesh(z, x, y) for x, y in zip(xs, ys)])
        g10 = (hh[5:] - hh[:-5]) / 10 * 100
        dg = np.abs(np.diff(g10[::5]))
        sm = np.convolve(np.pad(hh, 15, mode='edge'), np.ones(31) / 31, 'valid')
        dev = hh - sm
        bumps = int(np.sum((np.abs(np.diff(np.sign(np.diff(hh)))) > 0) & (np.abs(dev[1:-1]) > 0.15)))
        rr = out.setdefault(wy['kind'], dict(km=0, dg=[], bumps=0, maxg=0))
        rr['km'] += cum[-1] / 1000
        rr['dg'] += list(dg)
        rr['bumps'] += bumps
        rr['maxg'] = max(rr['maxg'], float(np.max(np.abs(g10))))
    print(f'== {label}')
    for k, rr in sorted(out.items(), key=lambda kv: -kv[1]['km']):
        print(f"  {k:8s} {rr['km']:5.1f} km  Steigungswechsel je 10 m Ø {np.mean(rr['dg']):4.1f} % (p90 {np.percentile(rr['dg'], 90):4.1f})"
              f"  Wellen/km {rr['bumps'] / rr['km']:5.1f}  max Steigung {rr['maxg']:5.1f} %")
    return out


# ---- profiles on the published terrain (as smooth_roads.py) ----
t = np.array([hmesh(z0, x, y) for x, y in pos])
t = np.where(np.isnan(t), np.nanmean(t), t)
insite = (np.abs(pos[:, 0]) < 120) & (np.abs(pos[:, 1]) < 120)
only_bridge = np.ones(N, bool)
on_bridge = np.zeros(N, bool)
ds = np.zeros(N)
for wy, ids in chains:
    P = pos[ids]
    seg = np.hypot(*np.diff(P, axis=0).T)
    for j, i in enumerate(ids):
        ds[i] += ((seg[j - 1] if j else 0) + (seg[j] if j < len(seg) else 0)) / 2
        if wy['fl'] & 1:
            on_bridge[i] = True
        else:
            only_bridge[i] = False
rows, cols, vals, rhs = [], [], [], []
r = 0
for i in range(N):
    if only_bridge[i]:
        continue
    wgt = 1e4 if insite[i] else max(ds[i], 0.5)
    rows.append(r)
    cols.append(i)
    vals.append(np.sqrt(wgt))
    rhs.append(np.sqrt(wgt) * t[i])
    r += 1
for wy, ids in chains:
    lam = 1e9 if wy['fl'] & 1 else (L_CUT[wy['kind']] / (2 * np.pi)) ** 4
    P = pos[ids]
    for j in range(1, len(ids) - 1):
        d1 = np.hypot(*(P[j] - P[j - 1]))
        d2 = np.hypot(*(P[j + 1] - P[j]))
        dm = (d1 + d2) / 2
        if d1 < 0.05 or d2 < 0.05:
            continue
        sw = np.sqrt(lam * dm)
        for c, v in ((ids[j - 1], 1 / (d1 * dm)), (ids[j], -(1 / d1 + 1 / d2) / dm), (ids[j + 1], 1 / (d2 * dm))):
            rows.append(r)
            cols.append(c)
            vals.append(sw * v)
        rhs.append(0.0)
        r += 1
# where one way ends and the road goes on in another (OSM splits roads at junctions, bridges, name changes) the curvature rows of the
# two chains stop at the shared node – the profile could bend there freely, a kink at every split. Across such joints (two way ends at
# one node, nearly straight on: within 40°) the curvature is penalised too, with the weaker class's smoothing.
ends = collections.defaultdict(list)
for ci, (wy, ids) in enumerate(chains):
    if len(ids) < 2:
        continue
    ends[ids[0]].append((ci, ids[1]))
    ends[ids[-1]].append((ci, ids[-2]))
nj = 0
for jn, lst in ends.items():
    if len(lst) < 2:
        continue
    pairs = []
    for a_i in range(len(lst)):
        for b_i in range(a_i + 1, len(lst)):
            (ca, na), (cb, nb) = lst[a_i], lst[b_i]
            if ca == cb:
                continue
            da, db = pos[na] - pos[jn], pos[nb] - pos[jn]
            la, lb = np.hypot(*da), np.hypot(*db)
            if la < 0.05 or lb < 0.05:
                continue
            c = (da @ db) / (la * lb)
            if c < -math.cos(math.radians(40)):
                pairs.append((c, a_i, b_i, la, lb))
    used = set()
    for c, a_i, b_i, d1, d2 in sorted(pairs):
        if a_i in used or b_i in used:
            continue
        used |= {a_i, b_i}
        (ca, na), (cb, nb) = lst[a_i], lst[b_i]
        ka, kb = chains[ca][0], chains[cb][0]
        lam = (min(L_CUT[ka['kind']], L_CUT[kb['kind']]) / (2 * np.pi)) ** 4
        dm = (d1 + d2) / 2
        sw = np.sqrt(lam * dm)
        for cc, v in ((na, 1 / (d1 * dm)), (jn, -(1 / d1 + 1 / d2) / dm), (nb, 1 / (d2 * dm))):
            rows.append(r)
            cols.append(cc)
            vals.append(sw * v)
        rhs.append(0.0)
        r += 1
        nj += 1
print('Stöße zwischen Wegen geglättet:', nj)
A_ = coo_matrix((vals, (rows, cols)), shape=(r, N)).tocsr()
h = spsolve((A_.T @ A_).tocsc(), A_.T @ np.array(rhs))
if DBG:
    for wy, ids in chains:
        dd = np.hypot(pos[ids, 0] - DBG[0], pos[ids, 1] - DBG[1])
        if dd.min() < 20:
            sel = [i for i, d_ in zip(ids, dd) if d_ < 25]
            print(' ', wy['kind'], [(round(pos[i, 0], 1), round(pos[i, 1], 1), round(h[i], 2), round(t[i], 2)) for i in sel[::2]])
print('Profile: Abweichung vom Gelände Ø %.2f m, p95 %.2f m, max %.2f m' % (
    np.mean(np.abs(h - t)[~only_bridge]), np.percentile(np.abs(h - t)[~only_bridge], 95), np.max(np.abs(h - t)[~only_bridge])))
# ---- the grid pulled to the profiles, the higher class first ----
hwN = np.zeros(N)
wayN = np.full(N, -1)
rankN = np.zeros(N, int)
rast = np.zeros(N, bool)
for wi, (wy, ids) in enumerate(chains):
    if wy['fl'] & 1:
        continue
    for i in ids:
        if RANK[wy['kind']] >= rankN[i]:
            rankN[i] = RANK[wy['kind']]
            hwN[i] = max(hwN[i], wy['w'] / 2)
        wayN[i] = wi
        rast[i] = True
idx = np.flatnonzero(rast)
tree = cKDTree(pos[idx])
# under a deck the valley stays – but not under its first and last 9 m: there the ground rises to the road (the abutment), else the
# cell between the last road vertex and the valley sloped down into a dip right before the deck (main road south of the stream, 0.9 m)
ABUT = 9.0
under = []
for wy, ids in chains:
    if not wy['fl'] & 1:
        continue
    P = pos[ids]
    cum = np.concatenate([[0], np.cumsum(np.hypot(*np.diff(P, axis=0).T))])
    under += [i for i, c in zip(ids, cum) if only_bridge[i] and ABUT <= c <= cum[-1] - ABUT]
bidx = np.array(sorted(set(under)), int)
btree = cKDTree(pos[bidx]) if len(bidx) else None
ball = np.flatnonzero(only_bridge)
batree = cKDTree(pos[ball]) if len(ball) else None
# world/roads.js sets a deck's end on the highest ground across its width + 0.08 m (+ 0.02 on the deck): with the abutment at the road's
# height the deck stood 10-20 cm above the road – a step at 50 km/h. The ground under the deck's first metres lies 0.12 m below the profile,
# so the deck's end meets the road.
ABUT_DZ = 0.0   # tried -0.12: the deck end still stood 0.1 m above the road (its corners sample the approach) – the ramp is in welt/fahrt.js now
bhw = max([wy['w'] / 2 for wy, ids in chains if wy['fl'] & 1] or [0])
z1 = z0.copy()
RE = max(hwN) + FULL + FADE + 1.5
gxx, gyy = np.meshgrid(XS, YS)
cand = tree.query_ball_point(np.stack([gxx.ravel(), gyy.ravel()], 1), RE)
for flat, nb in enumerate(cand):
    if not nb:
        continue
    j, i = divmod(flat, n)
    X, Y = XS[i], YS[j]
    if abs(X) <= 120 and abs(Y) <= 120:
        continue
    # under a deck the valley stays (the vertex is nearer a node that lies only on a bridge than any road node)
    dr = min(np.hypot(X - pos[idx[q], 0], Y - pos[idx[q], 1]) for q in nb)
    if btree is not None:
        db, _ = btree.query([X, Y])
        if db < bhw + 2 and db < dr:
            continue
    abut = False
    if batree is not None:
        dba, _ = batree.query([X, Y])
        abut = dba < bhw + 2 and dba < dr
    # per class the nearest road node (nodes every <= 2 m): its profile height – not the nearest node of every way, which near a split
    # (way ends at a junction) averaged in the other way's end 8 m further along the road
    per = {}
    for q in nb:
        g = idx[q]
        d = np.hypot(X - pos[g, 0], Y - pos[g, 1])
        rk = rankN[g]
        if rk not in per or d < per[rk][0]:
            per[rk] = (d, g)
    acc = {}
    for rk, (d, g) in per.items():
        tt = np.clip((d - (hwN[g] + FULL)) / FADE, 0, 1)
        wv = 1 - tt * tt * (3 - 2 * tt)
        if wv > 0:
            acc[rk] = [wv, wv * h[g], wv]
    if not acc:
        continue
    # the highest class that reaches the vertex with full weight decides; lower classes only where the higher ones fade out
    tgt, wtot = 0.0, 0.0
    rem = 1.0
    for rk in sorted(acc, reverse=True):
        ws, hs, wm = acc[rk]
        take = rem * wm
        tgt += take * hs / ws
        wtot += take
        rem -= take
        if rem <= 1e-6:
            break
    if wtot <= 0:
        continue
    dz = wtot * (tgt / wtot - z0[j, i]) + (ABUT_DZ if abut else 0.0)
    if DBG and math.hypot(X - DBG[0], Y - DBG[1]) < 16:
        print(f'  Punkt ({X:.1f}, {Y:.1f}) z {z0[j, i]:.2f} -> {z0[j, i] + dz:.2f}', {k: (round(v[1] / v[0], 2), round(v[2], 2)) for k, v in acc.items()})
    dw = wall.query([X, Y])[0]
    if dw < 10:   # near a wall: limited as in smooth_roads.py (lowering reveals the wall foot, raising buries doors)
        f = np.clip((dw - 6) / 4, 0, 1)
        lo, hi = -0.4 + f * (-50 + 0.4), 0.3 + f * (50 - 0.3)
        dz = min(max(dz, lo), hi)
    z1[j, i] = z0[j, i] + dz
before = stats(z0, 'vorher (veröffentlicht)')
after = stats(z1, 'nachher')
mv = np.abs(z1 - z0)
print(f'Geländepunkte verändert (> 5 cm): {(mv > 0.05).sum()} von {n * n}, Ø {mv[mv > 0.05].mean():.2f} m, p95 {np.percentile(mv[mv > 0.05], 95):.2f} m, max {mv.max():.2f} m')
raw[0:n * n * 2] = np.round(z1 * 10).astype('<i2').tobytes()
os.makedirs(os.path.dirname(OUT), exist_ok=True)
json.dump({'b64': base64.b64encode(bytes(raw)).decode(), 'fahrt': 'Straßen nachgebessert, viz3/extra/fahrt/innen.py 23.10.2026'}, open(OUT, 'w'))
print('geschrieben:', OUT, os.path.getsize(OUT) // 1024, 'kB')
