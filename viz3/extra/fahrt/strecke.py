"""Roads, places and signs beyond the 2.4 km square for the drive (viz3/src/welt/fahrt.js, feat/fahrt).

    python3 -I viz3/extra/fahrt/strecke.py --raw <cache dir>      -> viz3/extra/fahrt/dist/fahrt/strassen.json

- OpenStreetMap (API 0.6 /map in cells, cached under <raw>/osm/): the roads a car takes around Schleusingen and on to Kloster Veßra
  (motorway … service; no tracks, paths, footways), the villages (place nodes, built-up areas from landuse), the city-limit signs.
- Heights: the world tiles (welt-test/ and welt-test/zonen/vessra/ on the website, cached under <raw>/tiles/), finest level at each point
  (level 12 = 1 m, already carved by tools/welt; level 11 = 2 m elsewhere). The longitudinal profile of every road comes from the same
  least-squares smoother as the tile pipeline (tools/welt/roads.py: network, solve_profile – shared junctions, bridges straight), so the
  car rolls on a smooth profile and the app carves the tile mesh to it.
- Places: built-up area per village (landuse polygons, buffered), the yellow place-name signs where roads enter it (OSM city_limit nodes
  where mapped), direction signs at the junctions of the two routes, the routes garden → Markt Schleusingen and garden → Baumschule
  Kammbach (shortest by time, Dijkstra), the parking place at the nursery.
Output in model metres (x east, y north, z = NHN - H0) as integers in decimetres. © OpenStreetMap contributors (ODbL 1.0).
"""
import argparse, heapq, json, math, os, struct, sys, time, urllib.request, zlib
from concurrent.futures import ThreadPoolExecutor
import xml.etree.ElementTree as ET
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'tools', 'welt'))
import roads as WR  # tools/welt/roads.py – its functions only (classify, load_ways, network, solve_profile, metrics)

UA = 'PavillonRatscher-Fahrt/0.1 (+https://github.com/mynametouse/pavillon-ratscher; open geodata, non-commercial)'
SITE = 'https://mynametouse.github.io/pavillon-ratscher/welt-test/'
SETS = ['', 'zonen/vessra/']
G = json.load(open(os.path.join(REPO, 'viz3', 'manifests.json')))['geoman']
XF, H0 = G['xf'], float(G['H0'])
TI = G['terrain']['inner']
BOX = (TI['x0'], TI['y0'], TI['x0'] + (TI['n'] - 1) * TI['step'], TI['y0'] + (TI['n'] - 1) * TI['step'])
# the OSM cells (lon0, lon1, lat0, lat1): Ratscher, Schleusingen, the road to Kloster Veßra
LL = (10.615, 10.795, 50.465, 50.530)
ROOT_E0, ROOT_N0, ROOT = 420700.0, 5390800.0, 409600.0
GARDEN = (7.5, 31.2)        # the car's place in front of the garden (first point of the route to the Klinge)
MARKT = (-1084.7, 1241.9)   # welt/schleusingen.js
NURSERY = 'Baumschule Kammbach'
NURSERY_GATE = (-8863.3, -171.3)   # welt/vessra.js: in front of the gate on the Schulstraße
KINDS = ['motorway', 'main', 'county', 'street', 'lane', 'service', 'track', 'path', 'foot']
SURF = ['asphalt', 'concrete', 'paving', 'gravel', 'ground', 'grass']
# second line of the place-name sign: the municipality of an Ortsteil (OSM is_in / boundaries), else the district
MUNI = {'Ratscher': 'Stadt Schleusingen', 'Geisenhöhn': 'Stadt Schleusingen', 'Rappelsdorf': 'Stadt Schleusingen',
        'Gottfriedsberg': 'Stadt Schleusingen', 'Fischbach': 'Stadt Schleusingen', 'St. Kilian': 'Stadt Schleusingen',
        'Gethles': 'Stadt Schleusingen', 'Hinternah': 'Stadt Schleusingen', 'Heckengereuth': 'Stadt Schleusingen',
        'Waldau': 'Stadt Schleusingen', 'Breitenbach': 'Stadt Schleusingen', 'Erlau': 'Stadt Schleusingen',
        'Wiedersbach': 'Stadt Schleusingen', 'Oberrod': 'Stadt Schleusingen', 'Schwarzbach': 'Stadt Schleusingen',
        'Zollbrück': 'Gemeinde Kloster Veßra', 'Neuhof': 'Gemeinde Kloster Veßra', 'Gerhardtsgereuth': 'Stadt Hildburghausen',
        'Neuendambach': 'Stadt Hildburghausen', 'Tachbach': 'Stadt Themar'}


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def get(url, path, tries=4):
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return open(path, 'rb').read()
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=120) as r:
                b = r.read()
            open(path, 'wb').write(b)
            return b
        except urllib.error.HTTPError as e:
            if e.code == 404:
                return None
            time.sleep(3 + 5 * k)
        except Exception:
            time.sleep(3 + 5 * k)
    return None


# ---------------- coordinates ----------------
from pyproj import Transformer
_tr = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)


def u2m(E, N):
    a, b = XF['a'], XF['b']
    s2 = a * a + b * b
    dx, dy = np.asarray(E) - XF['ex'], np.asarray(N) - XF['ey']
    return (a * dx + b * dy) / s2, (-b * dx + a * dy) / s2


def m2u(x, y):
    return XF['a'] * x - XF['b'] * y + XF['ex'], XF['b'] * x + XF['a'] * y + XF['ey']


# ---------------- OpenStreetMap ----------------
def fetch_osm(raw):
    d = os.path.join(raw, 'osm')
    nodes, ways = {}, {}
    lo = LL[0]
    while lo < LL[1] - 1e-9:
        la = LL[2]
        while la < LL[3] - 1e-9:
            bb = f'{lo:.4f},{la:.4f},{min(lo + 0.03, LL[1]):.4f},{min(la + 0.013, LL[3]):.4f}'
            b = get('https://api.openstreetmap.org/api/0.6/map?bbox=' + bb, os.path.join(d, f'c_{bb.replace(",", "_")}.xml'))
            if b is None:
                raise RuntimeError('OSM cell ' + bb)
            for e in ET.fromstring(b):
                if e.tag == 'node':
                    i = int(e.get('id'))
                    if i not in nodes:
                        nodes[i] = (float(e.get('lon')), float(e.get('lat')), {t.get('k'): t.get('v') for t in e.findall('tag')})
                elif e.tag == 'way':
                    i = int(e.get('id'))
                    if i not in ways:
                        ways[i] = ([int(n.get('ref')) for n in e.findall('nd')], {t.get('k'): t.get('v') for t in e.findall('tag')})
            la += 0.013
        lo += 0.03
    log('OSM', len(nodes), 'Knoten', len(ways), 'Wege')
    return nodes, ways


# ---------------- heights from the world tiles ----------------
def decode(b):
    magic, n, flags, base, hmin, hmax = struct.unpack('<4sHHiff', b[:20])
    raw = zlib.decompress(b[20:])
    if flags & 1:
        r = np.frombuffer(raw, '<i4').reshape(n, n).astype(np.int64)
    else:
        lo = np.frombuffer(raw[:n * n], np.uint8).astype(np.int64)
        hi = np.frombuffer(raw[n * n:], np.uint8).astype(np.int64)
        zz = lo | (hi << 8)
        r = ((zz >> 1) ^ -(zz & 1)).reshape(n, n)
    q = np.zeros((n, n), np.int64)
    q[0, 0] = base
    q[0, 1:] = base + np.cumsum(r[0, 1:])
    q[1:, 0] = base + np.cumsum(r[1:, 0])
    for j in range(1, n):
        q[j, 1:] = q[j, 0] + np.cumsum(r[j, 1:] + q[j - 1, 1:] - q[j - 1, :-1])
    return (q / 100.0).astype(np.float32)


class Inner:
    """the app's 10 m terrain of the square (world/ratscher.js hMesh: the drawn triangles), model metres -> height above H0"""

    def __init__(self, raw):
        import base64
        p = os.path.join(REPO, 'viz3', 'dist', 'geo', G['terrain']['file'])
        b = open(p, 'rb').read() if os.path.exists(p) else get(SITE.replace('welt-test/', 'geo/') + G['terrain']['file'], os.path.join(raw, 'geo', G['terrain']['file']))
        j = json.loads(b)
        u = j['b64']
        buf = base64.b64decode(u[u.index(',') + 1:] if ',' in u else u)
        n = TI['n']
        self.z = np.frombuffer(buf, '<i2', n * n).reshape(n, n).astype(np.float64) / 10.0
        self.n, self.x0, self.y0, self.st = n, TI['x0'], TI['y0'], TI['step']

    def __call__(self, x, y):
        n, st = self.n, self.st
        fu = (np.asarray(x) - self.x0) / st
        fv = (np.asarray(y) - self.y0) / st
        i = np.clip(np.floor(fu).astype(int), 0, n - 2)
        j = np.clip(np.floor(fv).astype(int), 0, n - 2)
        u = np.clip(fu - i, 0, 1)
        v = np.clip(fv - j, 0, 1)
        Z = self.z
        za, zb, zc, zd = Z[j, i], Z[j, i + 1], Z[j + 1, i + 1], Z[j + 1, i]
        return np.where(u >= v, za + u * (zb - za) + v * (zc - zb), za + v * (zd - za) + u * (zc - zd))


class TileDem:
    """dem.sample(E, N) for tools/welt/roads.py: NHN heights from the finest tile level holding each point (both tile sets); inside
    the square the app's own 10 m terrain, so that the profiles meet the roads there"""

    def __init__(self, raw):
        self.raw = raw
        self.inner = Inner(raw)
        self.meta = []
        for sub in SETS:
            b = get(SITE + sub + 'meta.json', os.path.join(raw, 'tiles', sub or 'main', 'meta.json'))
            self.meta.append((sub, json.loads(b)) if b else (sub, None))
        self.T = {}

    def which(self, L, x, y):
        for sub, m in self.meta:
            if not m:
                continue
            r = m['tiling']['levels'].get(str(L), {}).get('rect')
            if r and r[0] <= x <= r[2] and r[1] <= y <= r[3]:
                return sub
        return None

    def keys(self, E, N):
        """tile key (L, x, y, sub) of the finest level for each point"""
        out = []
        for e, n in zip(E, N):
            k = None
            for L in (12, 11, 10):
                s = ROOT / (1 << L)
                x, y = int((e - ROOT_E0) // s), int((n - ROOT_N0) // s)
                sub = self.which(L, x, y)
                if sub is not None:
                    k = (L, x, y, sub)
                    break
            out.append(k)
        return out

    def prefetch(self, E, N):
        ks = {k for k in self.keys(E, N) if k and k not in self.T}

        def one(k):
            L, x, y, sub = k
            b = get(SITE + sub + f't/{L}/{x}/{y}.bin', os.path.join(self.raw, 'tiles', sub or 'main', 't', str(L), str(x), f'{y}.bin'))
            return k, (decode(b) if b else None)
        with ThreadPoolExecutor(8) as ex:
            for k, h in ex.map(one, sorted(ks)):
                self.T[k] = h
        log('Kacheln', len(ks), 'neu, zusammen', len(self.T))

    def sample(self, E, N):
        E = np.asarray(E, float).ravel()
        N = np.asarray(N, float).ravel()
        ks = self.keys(E, N)
        if any(k and k not in self.T for k in ks):
            self.prefetch(E, N)
        out = np.full(len(E), np.nan)
        groups = {}
        for i, k in enumerate(ks):
            if k and self.T.get(k) is not None:
                groups.setdefault(k, []).append(i)
        for (L, x, y, sub), idx in groups.items():
            h = self.T[(L, x, y, sub)]
            n = h.shape[0]
            s = ROOT / (1 << L)
            idx = np.array(idx)
            fu = (E[idx] - ROOT_E0 - x * s) / s * (n - 1)
            fv = (N[idx] - ROOT_N0 - y * s) / s * (n - 1)
            i0 = np.clip(np.floor(fu).astype(int), 0, n - 2)
            j0 = np.clip(np.floor(fv).astype(int), 0, n - 2)
            u = np.clip(fu - i0, 0, 1)
            v = np.clip(fv - j0, 0, 1)
            out[idx] = (h[j0, i0] * (1 - u) + h[j0, i0 + 1] * u) * (1 - v) + (h[j0 + 1, i0] * (1 - u) + h[j0 + 1, i0 + 1] * u) * v
        # inside the square (but off the flat garden near ground): the 10 m terrain the vehicles drive on there
        mx, my = u2m(E, N)
        ins = (mx > BOX[0]) & (mx < BOX[2]) & (my > BOX[1]) & (my < BOX[3]) & ~((np.abs(mx) < 125) & (np.abs(my) < 125))
        if ins.any():
            out[ins] = self.inner(mx[ins], my[ins])
        return out + H0   # NHN, as roads.py expects


# ---------------- helpers ----------------
def simplify(P, tol_xy=0.2, tol_z=0.03, max_len=24.0):
    """Douglas-Peucker on (x, y) and z together, keeping segments short enough for the profile"""
    n = len(P)
    keep = np.zeros(n, bool)
    keep[0] = keep[-1] = True
    st = [(0, n - 1)]
    while st:
        a, b = st.pop()
        if b <= a + 1:
            continue
        A, B = P[a], P[b]
        d = B[:2] - A[:2]
        L = max(np.hypot(*d), 1e-9)
        t = np.clip(((P[a + 1:b, 0] - A[0]) * d[0] + (P[a + 1:b, 1] - A[1]) * d[1]) / (L * L), 0, 1)
        exy = np.hypot(P[a + 1:b, 0] - (A[0] + d[0] * t), P[a + 1:b, 1] - (A[1] + d[1] * t))
        ez = np.abs(P[a + 1:b, 2] - (A[2] + (B[2] - A[2]) * t))
        e = np.maximum(exy / tol_xy, ez / tol_z)
        k = int(np.argmax(e))
        if e[k] > 1 or L > max_len:
            m = a + 1 + k if e[k] > 1 else (a + b) // 2
            keep[m] = True
            st += [(a, m), (m, b)]
    return P[keep]


def overpasses(pos, chains, h, clear=4.7, taper=120.0):
    """a bridge over another road keeps at least `clear` metres above it: the bridge is raised and its approaches follow over `taper`
    metres (the 30 m surface model does not know how high a bridge is)"""
    from scipy.spatial import cKDTree
    segs = []   # (chain index, a, b) of the roads that are no bridges
    for ci, (w, ids) in enumerate(chains):
        if not w['fl'] & 3:
            for a, b in zip(ids[:-1], ids[1:]):
                segs.append((ci, a, b))
    if not segs:
        return h
    mid = np.array([(pos[a] + pos[b]) / 2 for _, a, b in segs])
    kd = cKDTree(mid)
    adj = {}
    for w, ids in chains:
        for a, b in zip(ids[:-1], ids[1:]):
            d = float(np.hypot(*(pos[a] - pos[b])))
            adj.setdefault(int(a), []).append((int(b), d))
            adj.setdefault(int(b), []).append((int(a), d))
    raise_ = np.zeros(len(h))
    n = 0
    for ci, (w, ids) in enumerate(chains):
        if not w['fl'] & 1:
            continue
        need = 0.0
        low = set()
        idset = {int(i) for i in ids}
        for a, b in zip(ids[:-1], ids[1:]):
            P, Q = pos[a], pos[b]
            for k in kd.query_ball_point((P + Q) / 2, float(np.hypot(*(Q - P))) / 2 + 3):
                cj, c, d = segs[k]
                if int(c) in idset or int(d) in idset:
                    continue   # the roads that join the bridge at its ends
                A, B = pos[c], pos[d]
                r, sv = Q - P, B - A
                den = r[0] * sv[1] - r[1] * sv[0]
                if abs(den) < 1e-9:
                    continue
                t = ((A[0] - P[0]) * sv[1] - (A[1] - P[1]) * sv[0]) / den
                u = ((A[0] - P[0]) * r[1] - (A[1] - P[1]) * r[0]) / den
                if not (0 <= t <= 1 and 0 <= u <= 1):
                    continue
                zb = h[a] + t * (h[b] - h[a])
                zr = h[c] + u * (h[d] - h[c])
                if os.environ.get('FAHRT_DEBUG'):
                    log('Kreuzung', w['id'], w['ref'] or w['name'], chains[cj][0]['ref'] or chains[cj][0]['name'], round(float(zb - H0), 2), round(float(zr - H0), 2))
                if zb - zr > -1.0 and zb - zr < clear:
                    need = max(need, clear - (zb - zr))
                    low.add(cj)
        if need <= 0 or need > 3.5:
            continue   # more than 3.5 m: the heights there are not to be trusted – left as they are
        n += 1
        lowset = {int(i) for cj in low for i in chains[cj][1]}
        # how far (along the roads) each node is from the road below: a ramp down to it keeps its foot
        dlow = {i: 0.0 for i in lowset}
        pq = [(0.0, i) for i in lowset]
        heapq.heapify(pq)
        while pq:
            d0, u0 = heapq.heappop(pq)
            if d0 > dlow.get(u0, 1e18) or d0 > 90:
                continue
            for v0, L in adj.get(u0, ()):
                if d0 + L < dlow.get(v0, 1e18):
                    dlow[v0] = d0 + L
                    heapq.heappush(pq, (d0 + L, v0))
        dist = {int(i): 0.0 for i in ids}
        pq = [(0.0, int(i)) for i in ids]
        heapq.heapify(pq)
        while pq:
            d0, u0 = heapq.heappop(pq)
            if d0 > dist.get(u0, 1e18) or d0 > taper:
                continue
            for v0, L in adj.get(u0, ()):
                if v0 in lowset:
                    continue
                if d0 + L < dist.get(v0, 1e18):
                    dist[v0] = d0 + L
                    heapq.heappush(pq, (d0 + L, v0))
        for i, d0 in dist.items():
            if d0 < taper:
                k = min(1.0, dlow.get(i, 1e9) / 90.0)
                raise_[i] = max(raise_[i], need * 0.5 * (1 + math.cos(math.pi * d0 / taper)) * k * k * (3 - 2 * k))
    log('Überführungen angehoben:', n, 'Brücken, bis', round(float(raise_.max()), 2), 'm')
    return h + raise_


def inside_box(x, y, m=0.0):
    return BOX[0] + m < x < BOX[2] - m and BOX[1] + m < y < BOX[3] - m


def solve_pinned(pos, chains, dem, pin=1e7):
    """tools/welt/roads.py solve_profile (the same data and curvature terms), and the nodes inside the square held at the app's 10 m
    terrain – the ground the car drives on there. Smoothed freely, a profile that leaves the square could sit a metre and more off that
    terrain at the edge (L 1625 west: 1.4 m below it; the tiles outside are lower) – a step at the edge. Held, it leaves the square at
    the terrain's height and slope and the smoothing happens outside."""
    from scipy.sparse import coo_matrix, diags
    from scipy.sparse.linalg import spsolve
    N = len(pos)
    rows_d, vals_d, rhs_d = [], [], []
    axis = dem.sample(pos[:, 0], pos[:, 1])
    data_t = np.full(N, np.nan)
    for w, ids in chains:
        P = pos[ids]
        t, L = WR.tangents(P)
        nrm = np.stack([-t[:, 1], t[:, 0]], 1)
        hw = max(w['w'] / 2, 1.0)
        offs = np.linspace(-hw, hw, max(3, int(round(2 * hw / 0.5)) + 1))
        S = P[:, None, :] + offs[None, :, None] * nrm[:, None, :]
        H = dem.sample(S[..., 0].ravel(), S[..., 1].ravel()).reshape(len(P), len(offs))
        med = np.nanmedian(H, axis=1)
        mad = np.nanmedian(np.abs(H - med[:, None]), axis=1)
        ds = np.zeros(len(P))
        ds[:-1] += L / 2
        ds[1:] += L / 2
        conf = 1.0 / (1.0 + (mad / 0.35) ** 2)
        wgt = np.where(w['fl'] & 3, 1e-6, np.maximum(ds, 0.2) * conf)
        rows_d.append(ids)
        vals_d.append(wgt)
        rhs_d.append(wgt * med)
        data_t[ids] = np.where(np.isfinite(data_t[ids]), data_t[ids], med)
    I = np.concatenate(rows_d)
    Wd = np.bincount(I, weights=np.concatenate(vals_d), minlength=N)
    bd = np.bincount(I, weights=np.concatenate(rhs_d), minlength=N)
    Wd += 1e-6
    bd += 1e-6 * np.nan_to_num(axis, nan=np.nanmean(axis))
    # held: inside the square, at the terrain under the axis (TileDem.sample gives the 10 m terrain there)
    mx, my = u2m(pos[:, 0], pos[:, 1])
    ins = (mx > BOX[0]) & (mx < BOX[2]) & (my > BOX[1]) & (my < BOX[3]) & np.isfinite(axis)
    Wd[ins] += pin
    bd[ins] += pin * axis[ins]
    rr, cc, vv = [], [], []
    r0 = 0
    for w, ids in chains:
        if len(ids) < 3:
            continue
        P = pos[ids]
        d = np.maximum(np.hypot(*np.diff(P, axis=0).T), 0.05)
        d1, d2 = d[:-1], d[1:]
        dm = (d1 + d2) / 2
        lam = 1e9 if w['fl'] & 3 else (WR.KINDS[w['kind']][3] / (2 * math.pi)) ** 4
        sw = np.sqrt(lam * dm)
        n = len(d1)
        rows = np.arange(r0, r0 + n)
        rr += [rows, rows, rows]
        cc += [ids[:-2], ids[1:-1], ids[2:]]
        vv += [sw / (d1 * dm), -sw * (1 / d1 + 1 / d2) / dm, sw / (d2 * dm)]
        r0 += n
    C = coo_matrix((np.concatenate(vv), (np.concatenate(rr), np.concatenate(cc))), shape=(r0, N)).tocsr()
    A = (C.T @ C + diags(Wd)).tocsc()
    h = spsolve(A, bd)
    log('Profile: im Quadrat gehalten', int(ins.sum()), 'Knoten')
    return h, axis, data_t


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', required=True)
    ap.add_argument('--out', default=os.path.join(HERE, 'dist', 'fahrt', 'strassen.json'))
    a = ap.parse_args()
    t0 = time.time()
    nodes, ways_osm = fetch_osm(a.raw)
    osm = {'nodes': nodes, 'ways': ways_osm}
    dem = TileDem(a.raw)
    # the area: the OSM cells (UTM, a little inside so that the ways are complete)
    cs = [_tr.transform(lo, la) for lo in LL[:2] for la in LL[2:]]
    area = (min(c[0] for c in cs) + 150, min(c[1] for c in cs) + 150, max(c[0] for c in cs) - 150, max(c[1] for c in cs) - 150)
    W, nodeE = WR.load_ways(osm, area, margin=0)
    keep = []
    for w in W:
        t = ways_osm[w['id']][1]
        if w['kind'] in ('track', 'path', 'foot'):
            continue
        if t.get('access') in ('private', 'no') or t.get('motor_vehicle') in ('private', 'no'):
            continue
        if w['kind'] == 'service' and t.get('service') in ('driveway', 'parking_aisle', 'drive-through', 'emergency_access'):
            continue
        P = np.array([nodeE[r] for r in w['refs']])
        x, y = u2m(P[:, 0], P[:, 1])
        if all(inside_box(xx, yy, 30) for xx, yy in zip(x, y)):
            continue   # inside the square the app has its own roads (world/roads.js)
        if w['kind'] == 'service' and np.hypot(*np.diff(P, axis=0).T).sum() < 40:
            continue
        if any(k is None for k in dem.keys(P[:, 0], P[:, 1])):
            continue   # beyond the world tiles there is nothing to drive on
        keep.append(w)
    log('Straßen', len(keep), 'von', len(W))
    pos, chains = WR.network(keep, nodeE, step=2.0)
    dem.prefetch(pos[:, 0], pos[:, 1])
    h, axis, data_t = solve_pinned(pos, chains, dem)
    h = overpasses(pos, chains, h)
    res = WR.metrics(pos, chains, h, axis)
    WR.print_metrics(res, '(Fahrt: vorher = Kachelhöhe an der Achse, nachher = geglättetes Längsprofil)')
    # ---- ways (model dm) ----
    names = ['']
    nid = {}

    def name_i(s):
        if s not in nid:
            nid[s] = len(names)
            names.append(s)
        return nid[s]
    out_ways = []
    npts = 0
    mx, my = u2m(pos[:, 0], pos[:, 1])
    mz = h - H0
    for w, ids in chains:
        P = np.stack([mx[ids], my[ids], mz[ids]], 1)
        P = simplify(P)
        npts += len(P)
        t = ways_osm[w['id']][1]
        fl = (1 if w['fl'] & 1 else 0) | (2 if w['fl'] & 2 else 0) | (4 if t.get('oneway') == 'yes' or t.get('junction') == 'roundabout' else 0)
        out_ways.append([KINDS.index(w['kind']), SURF.index(w['surf']), int(round(w['w'] * 10)), fl, name_i(w['name']), name_i(w['ref']),
                         [int(round(v * 10)) for v in P.ravel()]])
    log('Wege', len(out_ways), 'Punkte', npts)
    # ---- routing (by time) over the drivable OSM ways, also tracks for the first metres from the garden ----
    M = {}
    for i, (lo, la, tg) in nodes.items():
        E, N = _tr.transform(lo, la)
        M[i] = u2m(E, N)
    SPD = {'motorway': 110, 'main': 80, 'county': 70, 'lane': 50, 'street': 30, 'service': 15, 'track': 8}
    Gr = {}
    for wid, (refs, tg) in ways_osm.items():
        c = WR.classify(tg) if 'highway' in tg else None
        if not c or c[0] not in SPD:
            continue
        if tg.get('access') in ('private', 'no') or tg.get('motor_vehicle') in ('private', 'no'):
            continue
        ow = tg.get('oneway') == 'yes' or tg.get('junction') == 'roundabout' or c[0] == 'motorway'
        v = SPD[c[0]] / 3.6
        for p, q in zip(refs, refs[1:]):
            if p in M and q in M:
                L = math.dist(M[p], M[q])
                Gr.setdefault(p, []).append((q, L / v, L, wid))
                if not ow:
                    Gr.setdefault(q, []).append((p, L / v, L, wid))

    def nearest(x, y):
        return min(Gr, key=lambda k: (M[k][0] - x) ** 2 + (M[k][1] - y) ** 2)

    def dijkstra(s, goal=None):
        dist, prev, pq = {s: 0.0}, {}, [(0.0, s)]
        while pq:
            d, u = heapq.heappop(pq)
            if u == goal:
                break
            if d > dist[u]:
                continue
            for v, c, L, wid in Gr.get(u, ()):
                if d + c < dist.get(v, 1e18):
                    dist[v] = d + c
                    prev[v] = (u, L, wid)
                    heapq.heappush(pq, (d + c, v))
        return dist, prev

    def path(prev, s, g):
        p = [g]
        while p[-1] != s:
            p.append(prev[p[-1]][0])
        return p[::-1]
    # the nursery: its landuse polygon, the parking place on the street beside it
    # the nursery's gate on the Schulstraße (welt/vessra.js builds the yard behind it: KERN.spot 'baumschule')
    nc = np.array(NURSERY_GATE)
    s0 = nearest(*GARDEN)
    dist, prev = dijkstra(s0)
    routes = {}
    for key, (x, y) in {'markt': MARKT, 'baumschule': tuple(nc)}.items():
        # the goal: a reachable node near the target (the Markt itself is a one-way loop)
        cand = sorted((k for k in dist if (M[k][0] - x) ** 2 + (M[k][1] - y) ** 2 < 120 ** 2 and k in Gr), key=lambda k: math.dist(M[k], (x, y)))
        g = cand[0]
        p = path(prev, s0, g)
        pts = np.array([M[k] for k in p])
        L = float(np.hypot(*np.diff(pts, axis=0).T).sum())
        routes[key] = {'pts': [int(round(v * 10)) for v in pts.ravel()], 'm': round(L), 'nodes': p}
        log('Route', key, round(L), 'm', len(p), 'Knoten')
    # parking at the nursery: the last route point, turned along the street
    rb = np.array(routes['baumschule']['pts']).reshape(-1, 2) / 10
    pk = rb[-1]
    hd = math.degrees(math.atan2(rb[-1][0] - rb[-2][0], rb[-1][1] - rb[-2][1]))
    park = {'baumschule': [round(float(pk[0]), 1), round(float(pk[1]), 1), round(hd, 1)]}
    # ---- places: built-up areas (landuse polygons, buffered) per place node ----
    from shapely.geometry import Polygon, Point, LineString
    from shapely.ops import unary_union
    places = [(tg['name'], tg['place'], M[i]) for i, (lo, la, tg) in nodes.items()
              if tg.get('place') in ('town', 'village', 'hamlet') and tg.get('name')]
    polys = {p[0]: [] for p in places}
    for wid, (refs, tg) in ways_osm.items():
        if tg.get('landuse') in ('residential', 'farmyard', 'commercial', 'retail', 'industrial') and len(refs) > 3 and refs[0] == refs[-1]:
            pts = [M[r] for r in refs if r in M]
            if len(pts) < 4:
                continue
            pg = Polygon(pts)
            if not pg.is_valid:
                pg = pg.buffer(0)
            c = pg.centroid
            # the nearest place – a town reaches further (its suburbs lie closer to the next village than to its centre)
            eff = lambda p: math.dist(p[2], (c.x, c.y)) * (0.45 if p[1] == 'town' else 1.0)
            best = min(places, key=eff)
            if eff(best) < 1200:
                polys[best[0]].append(pg)
    out_places = []
    areas = {}
    for name, kind, (x, y) in places:
        if not polys[name]:
            continue
        # closed over gaps below ~120 m (a park, a stream between two parts of a village), then shrunk back to the houses
        u = unary_union([p.buffer(60) for p in polys[name]]).buffer(-45)
        geoms = list(u.geoms) if hasattr(u, 'geoms') else [u]
        geoms = [g for g in geoms if g.area > 2000 and g.distance(Point(x, y)) < 600]
        if not geoms:
            continue
        areas[name] = unary_union(geoms)
        out_places.append({'n': name, 'k': kind, 'x': round(x), 'y': round(y), 'm': MUNI.get(name, ''),
                           'a': [[int(round(v)) for xy in g.simplify(4).exterior.coords[:-1] for v in xy] for g in geoms]})
    log('Orte', [p['n'] for p in out_places])
    # ---- place-name signs: where a road (main/county/lane/street) enters a built-up area ----
    signs = []
    osm_cl = [(tg['name'], M[i]) for i, (lo, la, tg) in nodes.items() if tg.get('traffic_sign') == 'city_limit' and tg.get('name')]
    for wid, (refs, tg) in ways_osm.items():
        c = WR.classify(tg) if 'highway' in tg else None
        if not c or c[0] not in ('main', 'county', 'lane', 'street'):
            continue
        pts = [M[r] for r in refs if r in M]
        if len(pts) < 2:
            continue
        ln = LineString(pts)
        for name, ar in areas.items():
            if not ln.intersects(ar.boundary):
                continue
            xs = ln.intersection(ar.boundary)
            for q in (list(xs.geoms) if hasattr(xs, 'geoms') else [xs]):
                if q.geom_type != 'Point':
                    continue
                # the direction into the area along the way
                d0 = ln.project(q)
                a1 = ln.interpolate(max(0, d0 - 3))
                a2 = ln.interpolate(min(ln.length, d0 + 3))
                into = ar.contains(Point(a2.x, a2.y))
                dx, dy = (a2.x - a1.x, a2.y - a1.y) if into else (a1.x - a2.x, a1.y - a2.y)
                L = math.hypot(dx, dy) or 1
                dx, dy = dx / L, dy / L
                # the road must lead somewhere: at least 150 m of it outside the area
                out_len = ln.difference(ar).length
                if out_len < 150:
                    continue
                # a mapped city-limit sign of this place nearby wins
                cl = [p for n2, p in osm_cl if n2 == name and math.dist(p, (q.x, q.y)) < 250]
                px, py = cl[0] if cl else (q.x + dx * 4, q.y + dy * 4)
                if inside_box(*next(p2 for n2, k2, p2 in places if n2 == name)):
                    continue   # the villages of the square (Ratscher, Geisenhöhn) keep their own look
                hw = c[2] / 2
                # on the right side for the incoming traffic, facing it
                sx, sy = px + dy * (hw + 1.4), py - dx * (hw + 1.4)
                face = math.degrees(math.atan2(-dx, -dy))
                if any(s['n'] == name and math.dist((s['x'], s['y']), (sx, sy)) < 60 for s in signs):
                    continue
                signs.append({'t': 'ort', 'n': name, 'm': MUNI.get(name, 'Landkreis Hildburghausen'), 'x': round(sx, 1), 'y': round(sy, 1),
                              'h': round(face, 1)})
    # the back of each sign (end of the place): the next place along the road away from the area
    for s in signs:
        best, bd = None, 1e18
        fx, fy = -math.sin(math.radians(s['h'])), -math.cos(math.radians(s['h']))   # the direction out of the place
        for name, kind, (x, y) in places:
            if name == s['n'] or name not in areas:
                continue
            dx, dy = x - s['x'], y - s['y']
            d = math.hypot(dx, dy)
            if d < 6000 and (dx * -fx + dy * -fy) / d > 0.5 and d < bd:
                bd, best = d, name
        s['b'] = best or ''
    log('Ortstafeln', len(signs), sorted({s['n'] for s in signs}))
    # ---- direction signs: on the two routes at the junctions with main, county and connecting roads – the route's destination with
    # its arrow, and where the other road leads (the first village along it) ----
    RANK = {'motorway': 0, 'main': 1, 'county': 2, 'lane': 3, 'street': 4, 'service': 5, 'track': 6}
    wclass = {wid: WR.classify(tg) for wid, (refs, tg) in ways_osm.items() if 'highway' in tg}
    key_of = lambda wid: (ways_osm[wid][1].get('ref') or ways_osm[wid][1].get('name') or str(wid))

    def lead(u, v, wid, maxd=9000):
        """follow the road from u over v (the same ref or name, else the straightest continuation) until it enters a village"""
        k0, d, prev_n, cur = key_of(wid), math.dist(M[u], M[v]), u, v
        seen = {u, v}
        while d < maxd:
            pl = next((n for n, ar in areas.items() if ar.contains(Point(*M[cur]))), None)
            if pl:
                return pl, d
            nxt = [(q, w2) for q, c, L, w2 in Gr.get(cur, ()) if q not in seen and wclass.get(w2) and RANK.get(wclass[w2][0], 9) <= 4]
            if not nxt:
                return None, d
            same = [t for t in nxt if key_of(t[1]) == k0]
            if same:
                q, w2 = same[0]
            else:
                ax, ay = M[cur][0] - M[prev_n][0], M[cur][1] - M[prev_n][1]
                q, w2 = max(nxt, key=lambda t: ((M[t[0]][0] - M[cur][0]) * ax + (M[t[0]][1] - M[cur][1]) * ay) / (math.dist(M[t[0]], M[cur]) * math.hypot(ax, ay) + 1e-9))
            d += math.dist(M[cur], M[q])
            seen.add(q)
            prev_n, cur = cur, q
        return None, d
    wsigns = []
    for key, dest in (('markt', 'Schleusingen'), ('baumschule', 'Kloster Veßra')):
        p = routes[key]['nodes']
        cum = [0.0]
        for u, v in zip(p, p[1:]):
            cum.append(cum[-1] + math.dist(M[u], M[v]))
        tot = cum[-1]
        for k in range(2, len(p) - 1):
            u = p[k]
            if u not in prev or p[k + 1] not in prev:
                continue
            wid_in, wid_out = prev[u][2], prev[p[k + 1]][2]
            cin = wclass.get(wid_in)
            # the other roads at this junction (not the way in, not the way on)
            others = [(q, w2) for q, c, L, w2 in Gr.get(u, ()) if q not in (p[k - 1], p[k + 1]) and wclass.get(w2) and RANK.get(wclass[w2][0], 9) <= 3]
            turned = key_of(wid_in) != key_of(wid_out)
            if not cin or (not others and not turned) or RANK.get(cin[0], 9) > 4:
                continue
            x, y = M[u]
            if inside_box(x, y, 300) or tot - cum[k] < 200:
                continue
            ax, ay = M[p[k - 1]]
            dx, dy = x - ax, y - ay
            L = math.hypot(dx, dy) or 1
            dx, dy = dx / L, dy / L

            def arrow(q, wid2):
                # the direction 25 m along the road that leaves over q
                prv, cur, d = u, q, math.dist(M[u], M[q])
                while d < 25:
                    nx = [t for t in Gr.get(cur, ()) if t[0] != prv and key_of(t[3]) == key_of(wid2)]
                    if not nx:
                        break
                    prv, cur = cur, nx[0][0]
                    d += math.dist(M[prv], M[cur])
                bx, by = M[cur]
                t = math.degrees(math.atan2((bx - x) * dy - (by - y) * dx, (bx - x) * dx + (by - y) * dy))
                return 'r' if t > 35 else 'l' if t < -35 else 'g'
            rest = tot - cum[k]
            name = dest if rest > 1500 else {'markt': 'Zentrum', 'baumschule': 'Baumschule'}[key]
            lines = [[name, round(rest / 1000, 1), arrow(p[k + 1], wid_out)]]
            for q, w2 in others[:2]:
                pl, d2 = lead(u, q, w2)
                if pl and d2 > 300 and pl != dest and pl not in [l[0] for l in lines]:
                    lines.append([pl, round(d2 / 1000, 1), arrow(q, w2)])
            if len(lines) < 2 and not turned:
                continue
            back = 18 if RANK.get(cin[0], 9) <= 2 else 12
            sx, sy = x - dx * back + dy * (cin[2] / 2 + 1.8), y - dy * back - dx * (cin[2] / 2 + 1.8)
            if any(math.dist((w['x'], w['y']), (sx, sy)) < 60 for w in wsigns):
                continue
            wsigns.append({'t': 'weg', 'x': round(sx, 1), 'y': round(sy, 1), 'h': round(math.degrees(math.atan2(-dx, -dy)), 1),
                           'n': dest, 'l': lines})
    log('Wegweiser', len(wsigns), [w['l'] for w in wsigns])
    for r in routes.values():
        r.pop('nodes')
    out = {
        'v': 1,
        'made': time.strftime('%Y-%m-%d'),
        'note': 'welt/fahrt.js: roads beyond the 2.4 km square (model dm: x east, y north, z = NHN - H0), places, signs, routes',
        'credits': 'Straßen, Orte, Schilder © OpenStreetMap-Mitwirkende (ODbL 1.0); Höhen aus den Welt-Kacheln (© GDI-Th, Copernicus DEM)',
        'kinds': KINDS, 'surf': SURF, 'names': names,
        'ways': out_ways, 'places': out_places, 'signs': signs + wsigns, 'routes': routes, 'park': park,
        'metric': res,
    }
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    json.dump(out, open(a.out, 'w'), ensure_ascii=False, separators=(',', ':'))
    log('fertig:', a.out, round(os.path.getsize(a.out) / 1e3), 'kB in', round(time.time() - t0), 's')


if __name__ == '__main__':
    main()
