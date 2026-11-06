#!/usr/bin/env python3
"""The real buses of the world (viz3/src/bus/*, feat/bus): stops, lines, trips with their minutes and the ways they drive.

    python3 -I viz3/extra/bus/quellen/fahrplan.py --gtfs <latest.zip> [--woche 2026-11-16] [--bild <png>]
        -> viz3/extra/bus/dist/bus/fahrplan.json

Bays: platforms the feed puts on one point (Schleusingen, Zentralhaltestelle: five) get their positions from OpenStreetMap (the platform
with local_ref = the feed's platform_code; API 0.6, a small box around the stop, cached with --cache).
Source: the free Germany feed of gtfs.de (https://download.gtfs.de/germany/free/latest.zip, ~280 MB, streamed: stop_times.txt is
2.2 GB unpacked and is read row by row), data provided by DELFI e.V. (feed_info.txt); gtfs.de publishes it under CC BY 4.0. Kept is
only what touches the world: the stops that lie on a road of the world (the 2.4 km square around the garden: world/roads.js, the roads
beyond it: viz3/extra/fahrt/dist/fahrt/strassen.json – Schleusingen, Rappelsdorf, Zollbrück, Kloster Veßra, Themar …), the bus trips
that call at two or more of them one after the other, cut to that run, their minutes, and on which days of a reference week they run.

- The way of a trip: from stop to stop the quickest way on the road network of the world (main and county roads before streets before
  lanes and drives; motorways not), the stop moved onto the road (≤ 45 m). A leg the timetable cannot drive (faster than 90 km/h, or
  much longer than the straight line) ends the trip's run in the world: the bus came from or goes to a road the world does not have.
- Days: the trips that run on each day of the reference week (Monday … Sunday) – the feed covers about one month; Sunday stands for the
  Thuringian public holidays too. The feed does not mark school days (it holds no school holidays); trips that start or end at a
  school stop are marked 's' – the app leaves them out on Thuringian school holidays (an estimate, docs/features/bus.md).
- Speed limits per point of a way: 50 km/h inside the built-up areas (OSM places of strassen.json, Ratscher within 330 m of the
  Anger), else by road class.
Output in model metres (x east, y north) as integers in decimetres; times in minutes after midnight of the service day.
"""
import argparse, base64, csv, datetime, heapq, io, json, math, os, re, struct, sys, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
OUT = os.path.join(REPO, 'viz3', 'extra', 'bus', 'dist', 'bus', 'fahrplan.json')
G = json.load(open(os.path.join(REPO, 'viz3', 'manifests.json')))['geoman']
XF = G['xf']
TI = G['terrain']['inner']
BOX = (TI['x0'], TI['y0'], TI['x0'] + (TI['n'] - 1) * TI['step'], TI['y0'] + (TI['n'] - 1) * TI['step'])
ANGER = (222.0, -108.0)
# Thuringian school holidays (Thüringer Ministerium für Bildung, Wissenschaft und Kultur; kalenderpedia.de, 5.11.2026)
FERIEN = [
    ('2025-12-22', '2026-01-03'), ('2026-02-16', '2026-02-21'), ('2026-04-07', '2026-04-17'), ('2026-05-15', '2026-05-15'),
    ('2026-07-04', '2026-08-14'), ('2026-10-12', '2026-10-24'), ('2026-12-23', '2027-01-02'), ('2027-02-01', '2027-02-06'),
    ('2027-03-22', '2027-04-03'), ('2027-05-07', '2027-05-07'), ('2027-07-10', '2027-08-20'),
]
PLACE = {'Ratscher, Schulbushaltestelle': (248.8, -100.8)}
SCHOOL = re.compile(r'Schule|GHS|Schulcampus|Schulbus|Gymnasium|Wallrabs', re.I)
# road classes (GEOMAN.roads.kinds): 0 motorway 1 main 2 county 3 street 4 lane 5 service
COST = {0: 6.0, 1: 1.0, 2: 1.05, 3: 1.2, 4: 1.7, 5: 3.0}
VMAX = {0: 22.0, 1: 21.0, 2: 19.0, 3: 14.0, 4: 12.0, 5: 7.0}   # m/s outside the built-up areas
VTOWN = 13.9


def model_of(lat, lon, tr):
    E, N = tr.transform(lon, lat)
    a, b = XF['a'], XF['b']
    dE, dN = E - XF['ex'], N - XF['ey']
    det = a * a + b * b
    return (a * dE + b * dN) / det, (-b * dE + a * dN) / det


# ---------------- the road network of the world ----------------
def load_ways():
    ways = []
    j = json.load(open(os.path.join(REPO, 'viz3', 'dist', 'geo', 'roads.b64.json')))
    raw = base64.b64decode(j['b64'])
    a = struct.unpack('<%dh' % (len(raw) // 2), raw)
    o = 0
    while o + 5 <= len(a):
        n, kind, surf, w, fl = a[o:o + 5]
        o += 5
        p = [(a[o + 2 * i] / 10, a[o + 2 * i + 1] / 10) for i in range(n)]
        o += 2 * n
        if kind <= 5 and n >= 2:
            ways.append(dict(kind=kind, hw=w / 20, p=p, z=None, src='in'))
    s = json.load(open(os.path.join(REPO, 'viz3', 'extra', 'fahrt', 'dist', 'fahrt', 'strassen.json')))
    for k, sf, w10, fl, ni, ri, q in s['ways']:
        if k > 5:
            continue
        n = len(q) // 3
        p = [(q[3 * i] / 10, q[3 * i + 1] / 10) for i in range(n)]
        z = [q[3 * i + 2] / 10 for i in range(n)]
        if n >= 2:
            ways.append(dict(kind=k, hw=w10 / 20, p=p, z=z, src='out', name=s['names'][ni], ref=s['names'][ri]))
    towns = []
    for pl in s['places']:
        for r in pl['a']:
            towns.append([(r[i], r[i + 1]) for i in range(0, len(r), 2)])
    return ways, towns


def in_poly(x, y, poly):
    c = False
    n = len(poly)
    for i in range(n):
        x1, y1 = poly[i]
        x2, y2 = poly[(i + 1) % n]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1 + 1e-12) + x1:
            c = not c
    return c


class Net:
    """Vertices merged within 0.8 m, way ends snapped onto other ways within 4 m, the square's roads joined to the roads beyond it."""

    def __init__(self, ways, towns):
        self.ways = ways
        CS = 20.0
        seg = {}
        for wi, w in enumerate(ways):
            p = w['p']
            for i in range(len(p) - 1):
                (ax, ay), (bx, by) = p[i], p[i + 1]
                for cx in range(int(math.floor(min(ax, bx) / CS)) - 1, int(math.floor(max(ax, bx) / CS)) + 2):
                    for cy in range(int(math.floor(min(ay, by) / CS)) - 1, int(math.floor(max(ay, by) / CS)) + 2):
                        seg.setdefault((cx, cy), []).append((wi, i))
        ins = {}
        for wi, w in enumerate(ways):
            for e in (w['p'][0], w['p'][-1]):
                best = None
                for (wj, i) in seg.get((int(math.floor(e[0] / CS)), int(math.floor(e[1] / CS))), []):
                    if wj == wi:
                        continue
                    (ax, ay), (bx, by) = ways[wj]['p'][i], ways[wj]['p'][i + 1]
                    dx, dy = bx - ax, by - ay
                    l2 = dx * dx + dy * dy
                    if l2 < 1e-6:
                        continue
                    t = max(0.0, min(1.0, ((e[0] - ax) * dx + (e[1] - ay) * dy) / l2))
                    px, py = ax + dx * t, ay + dy * t
                    d = math.hypot(e[0] - px, e[1] - py)
                    if d < 4.0 and (best is None or d < best[0]):
                        best = (d, wj, i, t, px, py)
                if best:
                    d, wj, i, t, px, py = best
                    q = ways[wj]['p']
                    if math.hypot(q[i][0] - px, q[i][1] - py) > 0.8 and math.hypot(q[i + 1][0] - px, q[i + 1][1] - py) > 0.8:
                        ins.setdefault(wj, []).append((i, t, px, py))
        for wj, lst in ins.items():
            w = ways[wj]
            lst.sort(key=lambda r: (-r[0], -r[1]))
            for i, t, px, py in lst:
                w['p'].insert(i + 1, (px, py))
                if w['z'] is not None:
                    w['z'].insert(i + 1, w['z'][i] + (w['z'][i + 1] - w['z'][i]) * t)
        # vertices
        self.X, self.Y, self.Z = [], [], []
        grid = {}

        def vid(x, y, z):
            gx, gy = int(math.floor(x)), int(math.floor(y))
            for cx in (gx - 1, gx, gx + 1):
                for cy in (gy - 1, gy, gy + 1):
                    for v in grid.get((cx, cy), []):
                        if math.hypot(self.X[v] - x, self.Y[v] - y) < 0.8:
                            if z is not None and self.Z[v] is None:
                                self.Z[v] = z
                            return v
            v = len(self.X)
            self.X.append(x)
            self.Y.append(y)
            self.Z.append(z)
            grid.setdefault((gx, gy), []).append(v)
            return v

        self.adj = {}
        self.ends = []
        for wi, w in enumerate(ways):
            ids = [vid(x, y, (w['z'][k] if w['z'] is not None else None)) for k, (x, y) in enumerate(w['p'])]
            w['ids'] = ids
            for k in range(len(ids) - 1):
                self.edge(ids[k], ids[k + 1], w['kind'], wi)
            for v in (ids[0], ids[-1]):
                self.ends.append((v, w['src']))
        # the square's roads end at its edge, the roads beyond begin there (the profiles meet the terrain at the edge)
        nearEdge = lambda v: min(abs(self.X[v] - BOX[0]), abs(self.X[v] - BOX[2]), abs(self.Y[v] - BOX[1]), abs(self.Y[v] - BOX[3])) < 40
        ins_, out_ = [v for v, s in self.ends if s == 'in' and nearEdge(v)], [v for v, s in self.ends if s == 'out' and nearEdge(v)]
        self.joins = 0
        for a in ins_:
            best = None
            for b in out_:
                d = math.hypot(self.X[a] - self.X[b], self.Y[a] - self.Y[b])
                if d < 25 and (best is None or d < best[0]):
                    best = (d, b)
            if best and best[1] not in self.adj.get(a, {}):
                self.edge(a, best[1], 1, -1)
                self.joins += 1
        # built-up areas: speed limits
        self.town = [False] * len(self.X)
        for v in range(len(self.X)):
            x, y = self.X[v], self.Y[v]
            if math.hypot(x - ANGER[0], y - ANGER[1]) < 330:
                self.town[v] = True
                continue
            for poly in towns:
                if in_poly(x, y, poly):
                    self.town[v] = True
                    break
        # a segment grid for snapping stops
        self.sg = {}
        for u, nb in self.adj.items():
            for v, (l, kind, wi) in nb.items():
                if u < v:
                    for cx in range(int(math.floor(min(self.X[u], self.X[v]) / CS)) - 1, int(math.floor(max(self.X[u], self.X[v]) / CS)) + 2):
                        for cy in range(int(math.floor(min(self.Y[u], self.Y[v]) / CS)) - 1, int(math.floor(max(self.Y[u], self.Y[v]) / CS)) + 2):
                            self.sg.setdefault((cx, cy), []).append((u, v))
        self.CS = CS

    def edge(self, a, b, kind, wi):
        if a == b:
            return
        l = math.hypot(self.X[a] - self.X[b], self.Y[a] - self.Y[b])
        for u, v in ((a, b), (b, a)):
            nb = self.adj.setdefault(u, {})
            if v not in nb or nb[v][1] > kind:
                nb[v] = (l, kind, wi)

    def snap(self, x, y, r=45.0):
        """the nearest point on a bus road: (dist, u, v, t, px, py, side) – side +1: the point lies right of u → v"""
        best = None
        CS = self.CS
        seen = set()
        for cx in range(int(math.floor((x - r) / CS)), int(math.floor((x + r) / CS)) + 1):
            for cy in range(int(math.floor((y - r) / CS)), int(math.floor((y + r) / CS)) + 1):
                for (u, v) in self.sg.get((cx, cy), []):
                    if (u, v) in seen:
                        continue
                    seen.add((u, v))
                    kind = self.adj[u][v][1]
                    ax, ay, bx, by = self.X[u], self.Y[u], self.X[v], self.Y[v]
                    dx, dy = bx - ax, by - ay
                    l2 = dx * dx + dy * dy or 1e-9
                    t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / l2))
                    px, py = ax + dx * t, ay + dy * t
                    d = math.hypot(x - px, y - py)
                    # drives and lanes only when nothing better is near; never the motorway
                    pen = d + (0 if kind <= 3 else 12 if kind == 4 else 25) + (1e6 if kind == 0 else 0)
                    if d <= r and (best is None or pen < best[0]):
                        side = 1 if ((x - ax) * dy - (y - ay) * dx) > 0 else -1
                        best = (pen, d, u, v, t, px, py, side)
        return None if best is None else best[1:]

    def tree(self, A, maxlen=8000.0):
        """from a snap A: the quickest way (by cost) to every vertex within maxlen m: (real length, previous vertex) per vertex"""
        _, ua, va, ta, ax, ay, _ = A
        la = self.adj[ua][va][0]
        ka = self.adj[ua][va][1]
        dist, real, prev = {}, {}, {}
        hp = []
        for v0, d0 in ((ua, ta * la), (va, (1 - ta) * la)):
            dist[v0] = d0 * COST.get(ka, 3.0)
            real[v0] = d0
            prev[v0] = None
            heapq.heappush(hp, (dist[v0], v0))
        done = set()
        while hp:
            d, u = heapq.heappop(hp)
            if u in done:
                continue
            done.add(u)
            if real[u] > maxlen:
                continue
            for v, (l, kind, wi) in self.adj.get(u, {}).items():
                nd = d + l * COST.get(kind, 3.0)
                if nd < dist.get(v, math.inf):
                    dist[v] = nd
                    real[v] = real[u] + l
                    prev[v] = u
                    heapq.heappush(hp, (nd, v))
        return real, prev

    def route(self, A, B):
        """quickest way from snap A to snap B: the polyline [(x, y, vid or None)] and its length"""
        _, ua, va, ta, ax, ay, _ = A
        _, ub, vb, tb, bx, by, _ = B
        if {ua, va} == {ub, vb}:
            # the same segment: straight along it
            return [(ax, ay, None), (bx, by, None)], math.hypot(bx - ax, by - ay)
        la = self.adj[ua][va][0]
        lb = self.adj[ub][vb][0]
        cost = lambda kind: COST.get(kind, 3.0)
        ka, kb = self.adj[ua][va][1], self.adj[ub][vb][1]
        dist, prev, real = {}, {}, {}
        hp = []
        for v0, d0 in ((ua, ta * la), (va, (1 - ta) * la)):
            dist[v0] = d0 * cost(ka)
            real[v0] = d0
            prev[v0] = None
            heapq.heappush(hp, (dist[v0], v0))
        goal = {ub: tb * lb, vb: (1 - tb) * lb}
        best, bestv = math.inf, None
        done = set()
        while hp:
            d, u = heapq.heappop(hp)
            if u in done:
                continue
            done.add(u)
            if d >= best:
                break
            if u in goal:
                tot = d + goal[u] * cost(kb)
                if tot < best:
                    best, bestv = tot, u
            for v, (l, kind, wi) in self.adj.get(u, {}).items():
                nd = d + l * cost(kind)
                if nd < dist.get(v, math.inf):
                    dist[v] = nd
                    real[v] = real[u] + l
                    prev[v] = u
                    heapq.heappush(hp, (nd, v))
        if bestv is None:
            return None, math.inf
        chain = []
        v = bestv
        while v is not None:
            chain.append(v)
            v = prev[v]
        chain.reverse()
        pts = [(ax, ay, None)] + [(self.X[v], self.Y[v], v) for v in chain] + [(bx, by, None)]
        L = real[bestv] + goal[bestv]
        return pts, L


# ---------------- OpenStreetMap: the bays of a stop ----------------
def osm_platforms(lat, lon, cache=None, r=0.0025):
    """the platforms (highway=bus_stop / public_transport=platform) with a local_ref (or ref) around a point: [(lat, lon, ref)]"""
    import urllib.request
    import xml.etree.ElementTree as ET
    bb = f'{lon - r * 1.6:.5f},{lat - r:.5f},{lon + r * 1.6:.5f},{lat + r:.5f}'
    fn = os.path.join(cache, 'osm_' + bb.replace(',', '_') + '.xml') if cache else None
    if fn and os.path.exists(fn):
        raw = open(fn, 'rb').read()
    else:
        req = urllib.request.Request('https://api.openstreetmap.org/api/0.6/map?bbox=' + bb,
                                     headers={'User-Agent': 'PavillonRatscher-Bus/0.1 (+https://github.com/mynametouse/pavillon-ratscher)'})
        try:
            with urllib.request.urlopen(req, timeout=90) as f:
                raw = f.read()
        except Exception as e:
            print('osm', bb, e, file=sys.stderr)
            return []
        if fn:
            os.makedirs(cache, exist_ok=True)
            open(fn, 'wb').write(raw)
    out = []
    for n in ET.fromstring(raw).iter('node'):
        t = {x.get('k'): x.get('v') for x in n.iter('tag')}
        ref = t.get('local_ref') or t.get('ref')
        if ref and (t.get('highway') == 'bus_stop' or t.get('public_transport') == 'platform'):
            out.append((float(n.get('lat')), float(n.get('lon')), ref))
    return out


# ---------------- the feed ----------------
def rd(zf, name):
    with zf.open(name) as f:
        yield from csv.DictReader(io.TextIOWrapper(f, 'utf-8-sig'))


def minutes(hms):
    h, m, s = (int(v) for v in hms.split(':'))
    return h * 60 + m + s / 60


# stops the feed keeps under two names a few metres apart where OpenStreetMap knows one (Ratscher: „Ratscher“, 9 and 28 m from „Ratscher,
# Schleusebrücke“, used by the one 700 each way – one stop with a shelter in OSM, node at 50.49938 N 10.77264 E, 6.11.2026): each
# platform of the first becomes the nearest one of the second within 40 m (the stop points of the ways moved to it), else one of its own
# (the signs stand on the right of the way a bus goes, whatever side the feed's point lies on)
ALIAS = {'Ratscher': 'Ratscher, Schleusebrücke'}


def merge_alias(out, alias=ALIAS):
    names = [st['n'] for st in out['stations']]
    for a_, b_ in alias.items():
        if a_ not in names or b_ not in names:
            continue
        ia, ib = names.index(a_), names.index(b_)
        A, B = out['stations'][ia], out['stations'][ib]
        qmap, moved = {}, set()
        for qa, pa in enumerate(A['pl']):
            best, bd = None, 40.0
            for qb, pb in enumerate(B['pl']):
                d = math.hypot(pa[0] - pb[0], pa[1] - pb[1]) / 10
                if d < bd:
                    best, bd = qb, d
            if best is None:
                B['pl'].append(list(pa))
                best = len(B['pl']) - 1
            else:
                moved.add(qa)
            qmap[qa] = best
        for P in out['pats']:
            pts = [(P['p'][2 * i] / 10, P['p'][2 * i + 1] / 10) for i in range(len(P['p']) // 2)]
            cum = [0.0]
            for i in range(1, len(pts)):
                cum.append(cum[-1] + math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
            for k, (s_, q) in enumerate(P['st']):
                if s_ != ia:
                    continue
                P['st'][k] = [ib, qmap[q]]
                if q in moved and len(pts) > 1:
                    # the stop point on this way: where the platform it now uses lies beside it (within 40 m of the old one)
                    pb = B['pl'][qmap[q]]
                    px, py, s0 = pb[0] / 10, pb[1] / 10, P['s'][k]
                    best = (1e9, s0)
                    for i in range(1, len(pts)):
                        (x0, y0), (x1, y1) = pts[i - 1], pts[i]
                        L = math.hypot(x1 - x0, y1 - y0)
                        if L < 1e-6:
                            continue
                        t = max(0.0, min(1.0, ((px - x0) * (x1 - x0) + (py - y0) * (y1 - y0)) / (L * L)))
                        d = math.hypot(x0 + (x1 - x0) * t - px, y0 + (y1 - y0) * t - py)
                        sv = cum[i - 1] + L * t
                        if abs(sv - s0) < 40 and d < best[0]:
                            best = (d, sv)
                    P['s'][k] = round(best[1], 1)
        A['pl_an'] = b_
    return out


def main():
    if len(sys.argv) == 3 and sys.argv[1] == '--zusammen':
        # only the merge of ALIAS on a timetable written before (python3 -I fahrplan.py --zusammen <fahrplan.json>)
        out = merge_alias(json.load(open(sys.argv[2])))
        with open(sys.argv[2], 'w') as f:
            json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
        print('merged', list(ALIAS.items()), file=sys.stderr)
        return
    ap = argparse.ArgumentParser()
    ap.add_argument('--gtfs', required=True)
    ap.add_argument('--woche', default='2026-11-16', help='Monday of the reference week')
    ap.add_argument('--bild', default=None, help='a picture of the ways over the roads (check)')
    ap.add_argument('--cache', default=None, help='a folder for the OpenStreetMap answers (the bays of stops)')
    a = ap.parse_args()
    from pyproj import Transformer
    tr = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
    ways, towns = load_ways()
    net = Net(ways, towns)
    X0 = min(net.X) - 50
    X1 = max(net.X) + 50
    Y0 = min(net.Y) - 50
    Y1 = max(net.Y) + 50
    print('net', len(net.X), 'vertices', len(ways), 'ways', net.joins, 'joins at the edge of the square', file=sys.stderr)
    zf = zipfile.ZipFile(a.gtfs)
    feed = next(rd(zf, 'feed_info.txt'))
    # stops on the roads of the world
    stops = {}
    names = {}
    parent = {}
    allxy = {}
    rows_ = list(rd(zf, 'stops.txt'))
    # platforms the feed puts on one point (the five of the Zentralhaltestelle in Schleusingen): their bays from OpenStreetMap
    # (public_transport=platform with local_ref = the feed's platform_code, within 250 m)
    groups = {}
    for s in rows_:
        if s['location_type'] != '1' and s['parent_station'] and s.get('platform_code'):
            groups.setdefault((s['parent_station'], s['stop_lat'], s['stop_lon']), []).append(s)
    bay = {}
    for (par, la, lo), L in groups.items():
        try:
            lat, lon = float(la), float(lo)
        except ValueError:
            continue
        if len(L) < 2 or not (50.3 < lat < 50.7 and 10.3 < lon < 11.1):
            continue
        for (blat, blon, ref) in osm_platforms(lat, lon, a.cache):
            for s in L:
                if s['platform_code'] == ref:
                    bay[s['stop_id']] = (blat, blon)
    print('platforms placed on their OSM bays', len(bay), file=sys.stderr)
    for s in rows_:
        try:
            lat, lon = float(s['stop_lat']), float(s['stop_lon'])
        except ValueError:
            continue
        names[s['stop_id']] = s['stop_name']
        if s['parent_station']:
            parent[s['stop_id']] = s['parent_station']
        if not (50.3 < lat < 50.7 and 10.3 < lon < 11.1) or s['location_type'] == '1':
            continue
        if s['stop_id'] in bay:
            lat, lon = bay[s['stop_id']]
        x, y = model_of(lat, lon, tr)
        # the world knows some stops better than the feed: the school bus stop's shelter as Falko filmed it (world/dorfkern_data.js)
        if s['stop_name'] in PLACE and math.hypot(x - PLACE[s['stop_name']][0], y - PLACE[s['stop_name']][1]) < 40:
            x, y = PLACE[s['stop_name']]
        allxy[s['stop_id']] = (x, y)
        if not (X0 < x < X1 and Y0 < y < Y1):
            continue
        sn = net.snap(x, y)
        if sn:
            stops[s['stop_id']] = dict(id=s['stop_id'], n=s['stop_name'], par=s['parent_station'], x=x, y=y, sn=sn)
    print('stops on the roads', len(stops), file=sys.stderr)
    # trips that call at two of them
    kept = {}
    cur, rows, hit = None, [], 0
    with zf.open('stop_times.txt') as f:
        r = csv.reader(io.TextIOWrapper(f, 'utf-8-sig'))
        head = next(r)
        it, ia, idp, isid, iseq = (head.index(k) for k in ('trip_id', 'arrival_time', 'departure_time', 'stop_id', 'stop_sequence'))
        for row in r:
            if row[it] != cur:
                if hit >= 2:
                    kept[cur] = rows
                cur, rows, hit = row[it], [], 0
            if row[isid] in stops:
                hit += 1
            rows.append((int(row[iseq]), row[isid], row[ia], row[idp]))
        if hit >= 2:
            kept[cur] = rows
    trips = {t['trip_id']: t for t in rd(zf, 'trips.txt') if t['trip_id'] in kept}
    routes = {r_['route_id']: r_ for r_ in rd(zf, 'routes.txt')}
    agency = {g['agency_id']: g for g in rd(zf, 'agency.txt')}
    sids = {t['service_id'] for t in trips.values()}
    cal = {c['service_id']: c for c in rd(zf, 'calendar.txt') if c['service_id'] in sids}
    cdx = {}
    for c in rd(zf, 'calendar_dates.txt'):
        if c['service_id'] in sids:
            cdx.setdefault(c['service_id'], {})[c['date']] = c['exception_type']
    mon = datetime.date.fromisoformat(a.woche)
    week = [mon + datetime.timedelta(days=i) for i in range(7)]
    WK = ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')

    def runs(sid, d):
        ds = d.strftime('%Y%m%d')
        ex = cdx.get(sid, {}).get(ds)
        if ex == '1':
            return True
        if ex == '2':
            return False
        c = cal.get(sid)
        return bool(c and c['start_date'] <= ds <= c['end_date'] and c[WK[d.weekday()]] == '1')

    # a stop's station name (the platforms' own names are short forms or misspelt: 'Schleusingen, ZH', 'Themar, Bahnof')
    # – the station's name when it is the platform's in full (same town, longer); 'Dingsleben, Dingsleben' → 'Dingsleben'
    def sname(sid):
        a, b = names.get(sid, ''), names.get(parent.get(sid, ''), '')
        n = b if b and len(b) > len(a) and b.split(',')[0].split(' ')[0] == a.split(',')[0].split(' ')[0] else a or b
        n = re.sub(r'\s+(Steig|Bussteig|Bstg\.?)\s*\w+$', '', n)
        p_ = [x.strip() for x in n.split(',')]
        return p_[0] if len(p_) == 2 and p_[0] == p_[1] else n

    # cut each trip to its run in the world: consecutive stops on the roads whose legs the timetable can drive
    legs = {}

    def leg(sa, sb):
        k = (sa, sb)
        if k not in legs:
            legs[k] = net.route(stops[sa]['sn'], stops[sb]['sn'])
        return legs[k]

    # where the roads of the world end (the edge of the data): dead ends of main and county roads (and streets beyond the square)
    ends = []
    for v, nb in net.adj.items():
        if len(nb) == 1:
            kind = next(iter(nb.values()))[1]
            x, y = net.X[v], net.Y[v]
            inside = BOX[0] + 40 < x < BOX[2] - 40 and BOX[1] + 40 < y < BOX[3] - 40
            if kind <= 2 or (kind == 3 and not inside):
                ends.append(v)
    trees = {}

    def approach(sid, far):
        """the way from a stop to the edge of the world towards a place beyond it: (vertex list from the stop to the edge, its length)"""
        if sid not in trees:
            trees[sid] = net.tree(stops[sid]['sn'])
        real, prev = trees[sid]
        sx, sy = stops[sid]['x'], stops[sid]['y']
        tot = math.hypot(far[0] - sx, far[1] - sy)
        best = None
        for v in ends:
            if v not in real:
                continue
            rest = math.hypot(net.X[v] - far[0], net.Y[v] - far[1])
            c = real[v] + 1.25 * rest
            if c <= 1.4 * tot + 600 and rest < tot and real[v] > 150 and (best is None or c < best[0]):
                best = (c, v)
        if not best:
            return None, 0.0
        chain, v = [], best[1]
        while v is not None:
            chain.append(v)
            v = prev[v]
        return chain, real[best[1]]

    patterns, pat_of = [], {}
    out_trips = []
    lines = {}
    skipped = {'not bus': 0, 'no days': 0, 'short': 0}
    for tid, rows in kept.items():
        t = trips.get(tid)
        if not t:
            continue
        ro = routes[t['route_id']]
        rt = int(ro['route_type'])
        if not (rt == 3 or 700 <= rt < 800):
            skipped['not bus'] += 1
            continue
        mask = sum(1 << i for i, d in enumerate(week) if runs(t['service_id'], d))
        if not mask:
            skipped['no days'] += 1
            continue
        rows = sorted(rows, key=lambda q: q[0])
        best_run, run = [], []
        for i, (seq, sid, arr, dep) in enumerate(rows):
            if sid in stops and (not run or True):
                if run:
                    p_sid, p_dep = run[-1][1], minutes(run[-1][3])
                    pts, L = leg(p_sid, sid)
                    dt = max(0.5, minutes(arr) - p_dep) * 60
                    straight = math.hypot(stops[sid]['x'] - stops[p_sid]['x'], stops[sid]['y'] - stops[p_sid]['y'])
                    ok = pts is not None and (L / dt < 25 or L < 300) and L < 2.2 * straight + 600
                    if not ok:
                        if len(run) > len(best_run):
                            best_run = run
                        run = []
                run.append((i, sid, arr, dep))
            else:
                if len(run) > len(best_run):
                    best_run = run
                run = []
        if len(run) > len(best_run):
            best_run = run
        if len(best_run) < 2:
            skipped['short'] += 1
            continue
        i0, i1 = best_run[0][0], best_run[-1][0]
        # coming from beyond the world: from its edge (the road towards the stop before), going on: to the edge
        vin = vout = None
        tin = tout = 0.0
        if i0 > 0 and rows[i0 - 1][1] in allxy:
            ch, Lin = approach(best_run[0][1], allxy[rows[i0 - 1][1]])
            if ch:
                far = allxy[rows[i0 - 1][1]]
                Lr = Lin + 1.25 * math.hypot(net.X[ch[-1]] - far[0], net.Y[ch[-1]] - far[1])
                dt = minutes(best_run[0][2]) - minutes(rows[i0 - 1][3])
                if dt > 0:
                    # at least the time a bus needs for it (≈ 47 km/h with starting and stopping), so it is not late at the first stop
                    vin, tin = ch, max(dt * Lin / Lr, Lin / 13.0 / 60 + 0.3)
        if i1 + 1 < len(rows) and rows[i1 + 1][1] in allxy:
            ch, Lout = approach(best_run[-1][1], allxy[rows[i1 + 1][1]])
            if ch:
                far = allxy[rows[i1 + 1][1]]
                Lr = Lout + 1.25 * math.hypot(net.X[ch[-1]] - far[0], net.Y[ch[-1]] - far[1])
                dt = minutes(rows[i1 + 1][2]) - minutes(best_run[-1][3])
                if dt > 0:
                    vout, tout = ch, max(dt * Lout / Lr, Lout / 13.0 / 60 + 0.3)
        key = (vin[-1] if vin else None,) + tuple(q[1] for q in best_run) + (vout[-1] if vout else None,)
        if key not in pat_of:
            pts, ss = [], []
            if vin:
                # from the edge (the chain runs edge → stop)
                for v in vin:
                    pts.append((net.X[v], net.Y[v], v))
                pts[0] = (pts[0][0], pts[0][1], None)
                ss.append(0.0)
            for k in range(1, len(key) - 1):
                sid = key[k]
                if k == 1:
                    q = stops[sid]['sn']
                    s0 = 0.0
                    if pts:
                        for j in range(1, len(pts)):
                            s0 += math.hypot(pts[j][0] - pts[j - 1][0], pts[j][1] - pts[j - 1][1])
                        s0 += math.hypot(q[4] - pts[-1][0], q[5] - pts[-1][1])
                    pts.append((q[4], q[5], None))
                    ss.append(s0)
                    continue
                lp, L = leg(key[k - 1], key[k])
                s0 = ss[-1]
                acc = 0.0
                for j in range(1, len(lp)):
                    acc += math.hypot(lp[j][0] - lp[j - 1][0], lp[j][1] - lp[j - 1][1])
                    pts.append(lp[j])
                ss.append(s0 + acc)
            if vout:
                s0 = ss[-1]
                acc = 0.0
                for v in reversed(vout):
                    acc += math.hypot(net.X[v] - pts[-1][0], net.Y[v] - pts[-1][1])
                    pts.append((net.X[v], net.Y[v], v))
                pts[-1] = (pts[-1][0], pts[-1][1], None)
                ss.append(s0 + acc)
            pat_of[key] = len(patterns)
            patterns.append(dict(stops=([None] if vin else []) + list(key[1:-1]) + ([None] if vout else []), pts=pts, s=ss))
        first, last = rows[0], rows[-1]
        line = ro['route_short_name'] or ro['route_long_name']
        ag = agency.get(ro['agency_id'], {}).get('agency_name', '')
        lines.setdefault(line, dict(op=ag, n=0))
        lines[line]['n'] += 1
        dep0 = minutes(best_run[0][3])
        A_ = [round(minutes(q[2]) - dep0, 2) for q in best_run]
        D_ = [round(minutes(q[3]) - dep0, 2) for q in best_run]
        if vin:
            A_ = [round(-tin - (minutes(best_run[0][3]) - minutes(best_run[0][2])), 2)] + A_
            D_ = [A_[0]] + D_
        if vout:
            A_ = A_ + [round(D_[-1] + tout, 2)]
            D_ = D_ + [A_[-1]]
        out_trips.append(dict(
            line=line, pat=pat_of[key], days=mask,
            head=t.get('trip_headsign') or sname(last[1]),
            von=sname(first[1]), nach=sname(last[1]),
            vor=sname(rows[i0 - 1][1]) if i0 > 0 else '', weiter=sname(rows[i1 + 1][1]) if i1 + 1 < len(rows) else '',
            school=bool(SCHOOL.search(names.get(first[1], '')) or SCHOOL.search(names.get(last[1], ''))),
            t0=dep0, a=A_, d=D_,
        ))
    print('trips', len(out_trips), 'patterns', len(patterns), 'skipped', skipped, file=sys.stderr)
    # stations: the stops used, grouped by name; platforms with the road point, its direction and the side of the GTFS point
    used = sorted({s for p in patterns for s in p['stops'] if s is not None})
    st_idx, stations, plat = {}, [], {}
    for sid in used:
        s = stops[sid]
        # the station: the parent's name ("Schleusingen, Zentralhaltestelle" for the platforms "Schleusingen, ZH")
        nm = names.get(s['par']) or s['n']
        if nm not in st_idx:
            st_idx[nm] = len(stations)
            stations.append(dict(n=nm, pl=[]))
        _, u, v, tt, px, py, side = s['sn']
        az = math.degrees(math.atan2(net.X[v] - net.X[u], net.Y[v] - net.Y[u])) % 360
        st = stations[st_idx[nm]]
        plat[sid] = (st_idx[nm], len(st['pl']))
        st['pl'].append([round(px * 10), round(py * 10), round(az), side, round(s['x'] * 10), round(s['y'] * 10)])
    for st in stations:
        xs = [p[0] for p in st['pl']]
        ys = [p[1] for p in st['pl']]
        st['x'], st['y'] = round(sum(xs) / len(xs)), round(sum(ys) / len(ys))
    # ways: decimetres, simplified (0.3 m), with the speed limit (m/s) and, beyond the square, the road profile (z) per point
    def simplify(pts, eps=0.3):
        keep = [False] * len(pts)
        keep[0] = keep[-1] = True
        stack = [(0, len(pts) - 1)]
        while stack:
            i0, i1 = stack.pop()
            ax, ay = pts[i0][0], pts[i0][1]
            bx, by = pts[i1][0], pts[i1][1]
            dx, dy = bx - ax, by - ay
            L = math.hypot(dx, dy) or 1e-9
            bd, bi = -1, -1
            for i in range(i0 + 1, i1):
                d = abs((pts[i][0] - ax) * dy - (pts[i][1] - ay) * dx) / L
                if d > bd:
                    bd, bi = d, i
            if bd > eps:
                keep[bi] = True
                stack += [(i0, bi), (bi, i1)]
        return keep

    out_pat = []
    for p in patterns:
        pts = p['pts']
        # the stop points stay (their s is known): mark them
        keep = simplify(pts)
        sidx, acc, k = [], 0.0, 0
        # recompute s of the stops on the kept polyline: stops are the points whose vid is None (leg ends), in order
        stop_pts = [i for i, q in enumerate(pts) if q[2] is None]
        for i in stop_pts:
            keep[i] = True
        q2 = [pts[i] for i in range(len(pts)) if keep[i]]
        S, acc = [0.0], 0.0
        for i in range(1, len(q2)):
            acc += math.hypot(q2[i][0] - q2[i - 1][0], q2[i][1] - q2[i - 1][1])
            S.append(acc)
        st_s = [S[i] for i, q in enumerate(q2) if q[2] is None]
        # the leg ends come in pairs where a leg ends and the next begins at the same stop: one s per stop
        uniq = []
        for s_ in st_s:
            if not uniq or abs(s_ - uniq[-1]) > 0.05:
                uniq.append(s_)
        while len(uniq) < len(p['stops']):
            uniq.append(uniq[-1])
        xy, vl, zz = [], [], []
        for (x, y, vid) in q2:
            xy += [round(x * 10), round(y * 10)]
            if vid is None:
                sn = None
                vl.append(round(VTOWN))
                zz.append(None)
            else:
                nb = net.adj.get(vid, {})
                kind = min((e[1] for e in nb.values()), default=3)
                vl.append(round(VTOWN if net.town[vid] else VMAX.get(kind, 14)))
                zz.append(None if net.Z[vid] is None else round(net.Z[vid] * 10))
        # fill z gaps (stop points, joins) from the neighbours beyond the square; inside the square the app asks the ground
        for i in range(len(zz)):
            if zz[i] is None:
                x, y = xy[2 * i] / 10, xy[2 * i + 1] / 10
                inside = BOX[0] < x < BOX[2] and BOX[1] < y < BOX[3]
                if not inside:
                    l = next((zz[j] for j in range(i - 1, -1, -1) if zz[j] is not None), None)
                    r_ = next((zz[j] for j in range(i + 1, len(zz)) if zz[j] is not None), None)
                    zz[i] = l if r_ is None else r_ if l is None else round((l + r_) / 2)
        out_pat.append(dict(
            st=[list(plat[s]) if s is not None else [-1, -1] for s in p['stops']], s=[round(v, 1) for v in uniq[:len(p['stops'])]],
            p=xy, v=vl, z=[-9999 if v is None else v for v in zz], L=round(S[-1], 1)))
    # trips per line, sorted by time
    out_trips.sort(key=lambda t: (t['line'], t['t0']))
    T = []
    for t in out_trips:
        T.append([t['line'], t['head'], t['pat'], t['days'], round(t['t0'], 2), t['a'], t['d'], 1 if t['school'] else 0,
                  t['von'], t['nach'], t['vor'], t['weiter']])
    out = dict(
        v=1,
        made=datetime.date.today().isoformat(),
        quelle='gtfs.de – GTFS für Deutschland (frei), Daten bereitgestellt von DELFI e.V.; ' + feed.get('feed_version', '') +
               ', Stand ' + datetime.datetime.fromtimestamp(os.path.getmtime(a.gtfs)).date().isoformat(),
        lizenz='CC BY 4.0 (gtfs.de, DELFI e.V.)',
        woche=a.woche,
        ferien=FERIEN,
        lines={k: dict(op=v['op']) for k, v in sorted(lines.items())},
        stations=stations,
        pats=out_pat,
        trips=T,
        note='trips: [line, headsign, pattern, days (bit 0 Monday … bit 6 Sunday/holiday), first departure (min), arrivals, departures '
             '(min after the first departure, per stop of the pattern), school trip, from, to (whole trip), stop before the world, stop after it]; '
             'pats: st [[station, platform]], s (m along the way), p (dm x, y), v (m/s per point), z (dm, profile beyond the square, -9999: ask the ground)',
    )
    merge_alias(out)
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w') as f:
        json.dump(out, f, ensure_ascii=False, separators=(',', ':'))
    print('written', OUT, os.path.getsize(OUT), 'bytes', file=sys.stderr)
    for k, v in sorted(lines.items()):
        print('line', k, v, file=sys.stderr)
    if a.bild:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        fig, ax = plt.subplots(figsize=(22, 12), dpi=90)
        for w in ways:
            xs = [q[0] for q in w['p']]
            ys = [q[1] for q in w['p']]
            ax.plot(xs, ys, color='#bbbbbb' if w['src'] == 'out' else '#99aacc', lw=0.6)
        cols = ['#d62728', '#1f77b4', '#2ca02c', '#ff7f0e', '#9467bd', '#8c564b', '#e377c2', '#17becf', '#bcbd22']
        for i, p in enumerate(out_pat):
            xs = [p['p'][2 * k] / 10 for k in range(len(p['p']) // 2)]
            ys = [p['p'][2 * k + 1] / 10 for k in range(len(p['p']) // 2)]
            ax.plot(xs, ys, color=cols[i % len(cols)], lw=1.4, alpha=0.6)
        for st in stations:
            ax.plot(st['x'] / 10, st['y'] / 10, 'ko', ms=3)
            ax.annotate(st['n'].replace('Schleusingen, ', 'S. '), (st['x'] / 10, st['y'] / 10), fontsize=6)
        ax.plot([BOX[0], BOX[2], BOX[2], BOX[0], BOX[0]], [BOX[1], BOX[1], BOX[3], BOX[3], BOX[1]], 'k--', lw=0.5)
        ax.set_aspect('equal')
        fig.tight_layout()
        fig.savefig(a.bild)


if __name__ == '__main__':
    main()
