"""What stands beside the roads, and where towns and villages are – for viz3/src/strassen/ (feat/strassen, package 1: the roads).

    python3 -I viz3/extra/strassen/daten.py --raw <cache dir> [--plot out.png]   -> viz3/extra/strassen/dist/strassen/ausstattung.json
    python3 -I viz3/extra/strassen/daten.py --fahrt <roads.json> --osm <extract.opl> --out <furniture.json>   (another area, round 2)

Round 2 (13.11.2026, wish W5 of the Suhl chat): --fahrt takes the roads from one file of the shape of fahrt/strassen.json instead of the
region's two files (the square of the app is left out), --osm reads OpenStreetMap from an OPL file (osmium export … -f opl) instead of
the cells of the API cache, --out names the file to write. The result goes into the app with STRDAT.add(name, json).

Sources: OpenStreetMap (API 0.6 /map in cells, the cache of viz3/extra/fahrt/strecke.py under <raw>/osm/) and the app's own roads – the
2.4 km square (dist/geo/roads.b64.json, world/roads.js) and the roads beyond it (viz3/extra/fahrt/dist/fahrt/strassen.json, welt/fahrt.js).
Everything is placed against the app's roads (their axis and half width), so that nothing stands on a carriageway the app draws.

- orte:      built-up areas (the polygons of strassen.json): t 2 = town (kerbs, pavements), 1 = village
- pfosten:   delineators (Leitpfosten) on main and county roads in open country, both sides, 50 m apart and closer in curves –
             by rule (StVO/HAV practice), nobody surveyed them; none along guard rails, at junction mouths, on bridges
- planken:   guard rails (OSM barrier=guard_rail), set 0.6 m beside the carriageway of the road they follow
- schilder:  traffic signs: speed limits where OSM's maxspeed changes, give way / stop (OSM nodes, and by rule where a street joins a
             classified road), priority signs on the classified road before such a junction, roundabouts, St Andrew's crosses at level
             crossings, zebra crossings, station signs (OSM milestones), chevrons in tight curves, deer crossing where a road enters a wood
- lampen:    street lamps: OSM street_lamp nodes; along lit streets (lit=yes) and the streets of the built-up areas every ~36 m (by rule)
- masten, leitungen: power poles and towers with their lines (OSM power=pole/tower, line/minor_line)
- linien:    stop and give-way lines, zebra crossings on the asphalt

Model metres (x east, y north) as integers in decimetres; headings in degrees clockwise from north (the direction of travel a thing
belongs to). © OpenStreetMap contributors (ODbL 1.0).
"""
import argparse, base64, json, math, os, sys, time
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(HERE, '..', 'fahrt'))
import strecke as SK  # fetch_osm, the coordinate transform, the kinds (its cache is reused)

KINDS = SK.KINDS
MAN = json.load(open(os.path.join(REPO, 'viz3', 'manifests.json')))['geoman']
TI = MAN['terrain']['inner']
BOX = (TI['x0'], TI['y0'], TI['x0'] + (TI['n'] - 1) * TI['step'], TI['y0'] + (TI['n'] - 1) * TI['step'])


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def hdg(dx, dy):
    """heading in degrees clockwise from north of the direction (dx east, dy north)"""
    return math.degrees(math.atan2(dx, dy)) % 360


# ---------------- the app's roads ----------------
class Net:
    def __init__(self):
        self.ways = []
        self.grid = {}
        self.cell = 40.0

    def add(self, kind, surf, hw, fl, P, src, name=''):
        P = np.asarray(P, float)
        if len(P) < 2:
            return
        d = np.hypot(*(P[1:] - P[:-1]).T)
        w = dict(kind=kind, surf=surf, hw=hw, fl=fl, P=P, cum=np.concatenate([[0], np.cumsum(d)]), src=src, name=name)
        wi = len(self.ways)
        self.ways.append(w)
        for i in range(len(P) - 1):
            r = hw + 14
            x0, x1 = sorted((P[i, 0], P[i + 1, 0]))
            y0, y1 = sorted((P[i, 1], P[i + 1, 1]))
            for cx in range(int((x0 - r) // self.cell), int((x1 + r) // self.cell) + 1):
                for cy in range(int((y0 - r) // self.cell), int((y1 + r) // self.cell) + 1):
                    self.grid.setdefault((cx, cy), []).append((wi, i))

    def near(self, x, y, reach=12.0, kinds=None, skip=None, hard=False):
        """the road whose edge is nearest to (x, y) within reach of it: dict(w, wi, i, t, d, e, lat, ux, uy, s) or None
        (e: distance inside the edge, negative outside; lat: lateral offset, + to the left of the way's direction)"""
        best, be = None, 1e9
        for wi, i in self.grid.get((int(x // self.cell), int(y // self.cell)), ()):
            w = self.ways[wi]
            if kinds is not None and w['kind'] not in kinds:
                continue
            if skip is not None and wi == skip:
                continue
            if hard and w['surf'] > 2:
                continue
            a, b = w['P'][i], w['P'][i + 1]
            ex, ey = b - a
            l2 = ex * ex + ey * ey or 1e-9
            t = max(0.0, min(1.0, ((x - a[0]) * ex + (y - a[1]) * ey) / l2))
            d = math.hypot(x - a[0] - ex * t, y - a[1] - ey * t)
            edge = d - w['hw']
            if edge > reach or edge >= be:
                continue
            be = edge
            L = math.sqrt(l2)
            best = dict(w=w, wi=wi, i=i, t=t, d=d, e=-edge, lat=(ex * (y - a[1]) - ey * (x - a[0])) / L, ux=ex / L, uy=ey / L,
                        s=w['cum'][i] + t * L)
        return best

    def at(self, w, s):
        """point and direction at s metres along the way"""
        cum, P = w['cum'], w['P']
        s = max(0.0, min(cum[-1], s))
        i = min(len(P) - 2, int(np.searchsorted(cum, s, 'right')) - 1)
        L = cum[i + 1] - cum[i] or 1e-9
        f = (s - cum[i]) / L
        u = (P[i + 1] - P[i]) / L
        return P[i] + (P[i + 1] - P[i]) * f, u

    def radius(self, w, s, arm=14.0):
        L = w['cum'][-1]
        if L < 2 * arm:
            return 1e9, 0
        sm = max(arm, min(L - arm, s))
        a, _ = self.at(w, sm - arm)
        b, _ = self.at(w, sm)
        c, _ = self.at(w, sm + arm)
        u, v = b - a, c - b
        th = math.atan2(u[0] * v[1] - u[1] * v[0], u[0] * v[0] + u[1] * v[1])
        if abs(th) < 1e-4:
            return 1e9, 0
        return (np.hypot(*u) + np.hypot(*v)) / 2 / abs(th), (1 if th > 0 else -1)   # + : turning left


def load_net(fahrt=None):
    N = Net()
    if fahrt:
        # another area: its roads from one file of the shape of fahrt/strassen.json
        F = json.load(open(fahrt))
        for row in F['ways']:
            k, sf, w10, fl, ni, ri, q = row[:7]
            P = np.asarray(q, float).reshape(-1, 3)[:, :2] / 10.0
            N.add(k, sf, w10 / 20.0, fl, P, 'f', F['names'][ri] or F['names'][ni])
        log('roads of', os.path.basename(fahrt) + ':', len(N.ways))
        return N, F
    # the square: world/roads.js
    R = MAN['roads']
    j = json.load(open(os.path.join(REPO, 'viz3', 'dist', 'geo', R['file'])))
    u = j['b64']
    a = np.frombuffer(base64.b64decode(u[u.index(',') + 1:] if ',' in u else u), '<i2')
    o = 0
    while o + 5 <= len(a):
        n, kind, surf, w10, fl = (int(v) for v in a[o:o + 5])
        o += 5
        P = a[o:o + 2 * n].reshape(n, 2) / 10.0
        o += 2 * n
        N.add(kind, surf, w10 / 20.0, fl, P, 'q')
    nq = len(N.ways)
    # beyond it: welt/fahrt.js (bit 0 of fl: bridge, bit 1: tunnel)
    F = json.load(open(os.path.join(REPO, 'viz3', 'extra', 'fahrt', 'dist', 'fahrt', 'strassen.json')))
    for k, sf, w10, fl, ni, ri, q in F['ways']:
        P = np.asarray(q, float).reshape(-1, 3)[:, :2] / 10.0
        N.add(k, sf, w10 / 20.0, fl, P, 'f', F['names'][ri] or F['names'][ni])
    log('roads of the app:', nq, 'in the square,', len(N.ways) - nq, 'beyond')
    return N, F


class Places:
    def __init__(self, F):
        self.P = []
        for p in F['places']:
            for r in p['a']:
                r = np.asarray(r, float).reshape(-1, 2)
                self.P.append((2 if p['k'] == 'town' else 1, p['n'], r, (r[:, 0].min(), r[:, 1].min(), r[:, 0].max(), r[:, 1].max())))
        # for the roads' look a hamlet is open country (no kerbs); the lamps still follow its streets
        self.out = [dict(n=p['n'], t=2 if p['k'] == 'town' else 1, a=[[int(round(v * 10)) for v in r] for r in p['a']]) for p in F['places'] if p['k'] != 'hamlet']

    @staticmethod
    def inpoly(r, x, y):
        c = False
        j = len(r) - 1
        for i in range(len(r)):
            if (r[i, 1] > y) != (r[j, 1] > y) and x < (r[j, 0] - r[i, 0]) * (y - r[i, 1]) / (r[j, 1] - r[i, 1]) + r[i, 0]:
                c = not c
            j = i
        return c

    def at(self, x, y):
        best = 0
        for t, n, r, bb in self.P:
            if t > best and bb[0] < x < bb[2] and bb[1] < y < bb[3] and self.inpoly(r, x, y):
                best = t
        return best

    def name(self, x, y):
        for t, n, r, bb in self.P:
            if bb[0] < x < bb[2] and bb[1] < y < bb[3] and self.inpoly(r, x, y):
                return n
        return None


# ---------------- OpenStreetMap in model metres ----------------
def read_opl(path):
    """OpenStreetMap from an OPL file (one object per line: n… / w… with the fields T tags, x, y, N node refs) → nodes, ways as SK.fetch_osm"""
    import re
    esc = re.compile(r'%([0-9a-fA-F]+)%')
    un = lambda v: esc.sub(lambda m: chr(int(m.group(1), 16)), v)

    def tags(v):
        t = {}
        for kv in v.split(',') if v else []:
            k, _, val = kv.partition('=')
            t[un(k)] = un(val)
        return t
    nodes, ways = {}, {}
    with open(path, encoding='utf-8') as f:
        for ln in f:
            if not ln or ln[0] not in 'nw':
                continue
            parts = ln.rstrip('\n').split(' ')
            fld = {q[0]: q[1:] for q in parts[1:] if q}
            if fld.get('d') == 'D':
                continue
            i = int(parts[0][1:])
            if ln[0] == 'n':
                if fld.get('x') and fld.get('y'):
                    nodes[i] = (float(fld['x']), float(fld['y']), tags(fld.get('T', '')))
            else:
                ways[i] = ([int(r[1:]) for r in fld.get('N', '').split(',') if r[:1] == 'n'], tags(fld.get('T', '')))
    log('OSM (OPL)', len(nodes), 'nodes', len(ways), 'ways')
    return nodes, ways


class Osm:
    def __init__(self, raw, opl=None):
        self.nodes, self.ways = read_opl(opl) if opl else SK.fetch_osm(raw)
        ids = list(self.nodes)
        lon = np.array([self.nodes[i][0] for i in ids])
        lat = np.array([self.nodes[i][1] for i in ids])
        E, Nn = SK._tr.transform(lon, lat)
        x, y = SK.u2m(E, Nn)
        self.xy = {i: (float(a), float(b)) for i, a, b in zip(ids, x, y)}
        self.tags = {i: self.nodes[i][2] for i in ids if self.nodes[i][2]}
        # the roads of OSM (cars): way id -> (kind index, tags, node ids)
        self.roads = {}
        for wid, (nd, t) in self.ways.items():
            if 'highway' not in t:
                continue
            c = SK.WR.classify(t)
            if not c:
                continue
            k = KINDS.index(c[0]) if isinstance(c, (tuple, list)) else None
            if k is None or k > 5:
                continue
            nd = [n for n in nd if n in self.xy]
            if len(nd) >= 2:
                self.roads[wid] = (k, t, nd)
        # which roads use a node
        self.use = {}
        for wid, (k, t, nd) in self.roads.items():
            for j, n in enumerate(nd):
                self.use.setdefault(n, []).append((wid, j))

    def pts(self, nd):
        return np.array([self.xy[n] for n in nd])


def speed(t):
    v = t.get('maxspeed', '')
    try:
        return int(v)
    except ValueError:
        return None


def inbox(x, y, m=0.0):
    return BOX[0] + m < x < BOX[2] - m and BOX[1] + m < y < BOX[3] - m


# ---------------- the furniture ----------------
def delineators(N, PL, rails):
    """both sides of main and county roads in open country; on the motorway the outer edge"""
    out = []
    railpts = np.array([p for t, r in rails for p in r]) if rails else np.zeros((0, 2))
    rg = {}
    for p in railpts:
        rg.setdefault((int(p[0] // 20), int(p[1] // 20)), []).append(p)

    def at_rail(x, y):
        for cx in (-1, 0, 1):
            for cy in (-1, 0, 1):
                for p in rg.get((int(x // 20) + cx, int(y // 20) + cy), ()):
                    if math.hypot(p[0] - x, p[1] - y) < 2.5:
                        return True
        return False

    for wi, w in enumerate(N.ways):
        if w['kind'] > 2 or w['fl'] & 3 or w['surf'] > 1:
            continue
        L = w['cum'][-1]
        if L < 25:
            continue
        s = 12.0 if L > 60 else L / 2
        while s < L - 4:
            (x, y), u = N.at(w, s)
            R, turn = N.radius(w, s)
            step = 50.0 if R >= 260 else 25.0 if R >= 150 else 15.0 if R >= 80 else 10.0
            if PL.at(x, y) == 0:
                sides = (1,) if w['kind'] == 0 else (1, -1)     # 1: to the right of the way's direction
                for sd in sides:
                    off = w['hw'] + 0.55
                    px, py = x + u[1] * sd * off, y - u[0] * sd * off
                    # not in the mouth of another road, not behind a guard rail
                    o = N.near(px, py, 1.2, skip=wi)
                    if o is not None and o['e'] > -1.2 and o['w']['kind'] <= 5:
                        continue
                    if at_rail(px, py):
                        continue
                    # the heading of the traffic that has the post on its right
                    out.append((px, py, hdg(u[0] * sd, u[1] * sd)))
            s += step
    return out


def guard_rails(N, O):
    """OSM guard rails, moved beside the carriageway of the road they follow (0.6 m from its edge), every 2 m a point"""
    out = []
    for wid, (nd, t) in O.ways.items():
        if t.get('barrier') != 'guard_rail':
            continue
        P = O.pts([n for n in nd if n in O.xy])
        if len(P) < 2:
            continue
        cum = np.concatenate([[0], np.cumsum(np.hypot(*(P[1:] - P[:-1]).T))])
        if cum[-1] < 4:
            continue
        run = []
        side0 = None
        for s in np.arange(0, cum[-1] + 1e-6, 2.0):
            i = min(len(P) - 2, int(np.searchsorted(cum, s, 'right')) - 1)
            f = (s - cum[i]) / ((cum[i + 1] - cum[i]) or 1e-9)
            x, y = P[i] + (P[i + 1] - P[i]) * f
            r = N.near(x, y, 9.0, kinds=(0, 1, 2, 3, 4), hard=True)
            if r is None:
                if len(run) >= 3:
                    out.append(run)
                run = []
                side0 = None
                continue
            sd = 1 if r['lat'] >= 0 else -1          # + : left of the road's direction
            off = max(abs(r['lat']), r['w']['hw'] + 0.6)
            off = min(off, r['w']['hw'] + 1.6)
            a = r['w']['P'][r['i']]
            b = r['w']['P'][r['i'] + 1]
            q = a + (b - a) * r['t']
            px, py = q[0] - r['uy'] * sd * off, q[1] + r['ux'] * sd * off
            key = (r['wi'], sd)
            if side0 is not None and key != side0 and run and math.hypot(px - run[-1][0], py - run[-1][1]) > 4.5:
                if len(run) >= 3:
                    out.append(run)
                run = []
            side0 = key
            if not run or math.hypot(px - run[-1][0], py - run[-1][1]) > 0.8:
                run.append((px, py, q[0], q[1]))
        if len(run) >= 3:
            out.append(run)
    # which side the road lies on, seen along the run: +1 left, -1 right (the wave of the beam faces it)
    res = []
    for run in out:
        sgn = 0.0
        for (a, b) in zip(run, run[1:]):
            dx, dy = b[0] - a[0], b[1] - a[1]
            sgn += dx * (a[3] - a[1]) - dy * (a[2] - a[0])
        res.append((1 if sgn >= 0 else -1, [(p[0], p[1]) for p in run]))
    return res


def beside(N, x, y, ux, uy, off=1.1, kinds=(0, 1, 2, 3, 4, 5)):
    """the spot to the right of the traffic heading (ux, uy) at (x, y): beside the carriageway of the app's road there (off metres from
    its edge); None when the app has no road there"""
    r = N.near(x, y, 6.0, kinds=kinds)
    if r is None:
        return None
    a = r['w']['P'][r['i']]
    b = r['w']['P'][r['i'] + 1]
    q = a + (b - a) * r['t']
    # the road's own direction, turned to the traffic's
    dx, dy = r['ux'], r['uy']
    if dx * ux + dy * uy < 0:
        dx, dy = -dx, -dy
    d = r['w']['hw'] + off
    px, py = q[0] + dy * d, q[1] - dx * d
    # not on the carriageway of another road (the mouth of a junction): the caller tries a spot further back
    o = N.near(px, py, 0.8, skip=r['wi'])
    if o is not None and o['e'] > -0.8 and o['w']['kind'] <= 5 and o['w']['surf'] <= 3:
        return None
    return px, py, dx, dy, r


def signs(N, PL, O, F):
    S = []          # (code, x, y, heading the sign is read from = direction of travel, text)
    lines = []      # (type, x, y, heading, half width)
    seen = {}

    def add(code, x, y, h, txt='', gap=7.0):
        # one sign of a kind per spot
        key = (code, int(x // gap), int(y // gap))
        if key in seen:
            return False
        seen[key] = 1
        S.append((code, x, y, h % 360, txt))
        return True

    def way_dir(nd, j, fwd):
        """unit direction of travel at node j of the way (fwd: along the node order)"""
        P = O.pts(nd)
        a = P[max(0, j - 1)]
        b = P[min(len(P) - 1, j + 1)]
        d = b - a
        l = np.hypot(*d) or 1e-9
        d = d / l
        return d if fwd else -d

    def ahead(nd, j, fwd, dist):
        """the point dist metres after node j in the direction of travel, and the direction there"""
        P = O.pts(nd if fwd else nd[::-1])
        jj = j if fwd else len(nd) - 1 - j
        d = 0.0
        for k in range(jj, len(P) - 1):
            L = float(np.hypot(*(P[k + 1] - P[k])))
            if d + L >= dist:
                u = (P[k + 1] - P[k]) / (L or 1e-9)
                return P[k] + u * (dist - d), u
            d += L
        u = P[-1] - P[-2]
        return P[-1], u / (np.hypot(*u) or 1e-9)

    ortsign = [(s['x'], s['y']) for s in F['signs'] if s['t'] == 'ort']

    def at_ortsign(x, y, r=90):
        return any(math.hypot(x - a, y - b) < r for a, b in ortsign)

    # ---- speed limits: where two roads of OSM that continue each other carry different limits ----
    for n, uses in O.use.items():
        if len(uses) != 2:
            continue      # a junction of three: the limits there belong to the turn, not to a sign (kept simple)
        (wa, ja), (wb, jb) = uses
        ka, ta, na = O.roads[wa]
        kb, tb, nb = O.roads[wb]
        if ja not in (0, len(na) - 1) or jb not in (0, len(nb) - 1) or max(ka, kb) > 4:
            continue
        va, vb = speed(ta), speed(tb)
        if va == vb or (va is None and vb is None):
            continue
        x, y = O.xy[n]
        for (wid, k, t, nd, j, v, vo) in ((wb, kb, tb, nb, jb, vb, va), (wa, ka, ta, na, ja, va, vb)):
            fwd = j == 0                    # traffic entering this way at the node runs along its order when the node is its first
            if t.get('oneway') in ('yes', '1') and not fwd:
                continue
            if t.get('oneway') == '-1' and fwd:
                continue
            p, u = ahead(nd, j, fwd, 7.0)
            inside = PL.at(p[0], p[1])
            code = None
            if v is None:
                # the limit ends: outside a place the sign 'end of …' (278), inside nothing (50 holds)
                if vo is not None and vo < 100 and not inside and not at_ortsign(x, y):
                    code = '278-%d' % vo
            elif inside and v == 50:
                continue                    # the place-name sign says it
            elif not inside and v >= 100:
                if vo is not None and vo < 100 and not at_ortsign(x, y):
                    code = '278-%d' % vo
            elif v in (10, 20, 30, 40, 50, 60, 70, 80):
                if at_ortsign(x, y) and v == 50:
                    continue
                zone = 'zone' in t.get('source:maxspeed', '') or 'zone:maxspeed' in t or ('zone:traffic' in t and v == 30)
                code = ('274.1-%d' if zone and v in (20, 30) else '274-%d') % v
            if not code:
                continue
            b = None
            for dist in (7.0, 12.0, 18.0):
                p, u = ahead(nd, j, fwd, dist)
                b = beside(N, p[0], p[1], u[0], u[1])
                if b is not None:
                    break
            if b is None:
                continue
            add(code, b[0], b[1], hdg(b[2], b[3]))

    # ---- give way and stop: OSM nodes, then by rule where a street or lane meets a classified road ----
    done_minor = set()

    def junction_end(wid):
        """for a minor road: at which of its ends it meets a road of a higher class → list of (node index, fwd towards it)"""
        k, t, nd = O.roads[wid]
        res = []
        for j, fwd in ((len(nd) - 1, True), (0, False)):
            for (w2, j2) in O.use.get(nd[j], ()):
                if w2 != wid and O.roads[w2][0] < k and O.roads[w2][0] <= 2:
                    res.append((j, fwd))
                    break
        return res

    def give(code, wid, j, fwd, back=4.0):
        k, t, nd = O.roads[wid]
        # the spot `back` metres before the junction (further back while that is still the junction's own asphalt), for the traffic
        # running towards node j
        b = None
        for bk in (back, back + 3, back + 6, back + 10, back + 15):
            p, u = ahead(nd, j, not fwd, bk)      # walk back from the junction
            u = -u
            b = beside(N, p[0], p[1], u[0], u[1], 0.9)
            if b is not None:
                break
        if b is None or b[4]['w']['surf'] > 2:
            return False
        if add(code, b[0], b[1], hdg(b[2], b[3]), gap=12.0):
            # the line across the lane: on asphalt of two lanes only (a village lane has none)
            r = b[4]
            if r['w']['hw'] >= 2.4 and r['w']['kind'] <= 3:
                jn = O.xy[nd[j]]
                # 1.2 m before the edge of the road it meets
                major = N.near(jn[0], jn[1], 3.0, skip=r['wi'])
                d0 = (major['w']['hw'] if major else 3.0) + 1.0
                q, uq = ahead(nd, j, not fwd, d0)
                uq = -uq
                rr = N.near(q[0], q[1], 4.0, kinds=(r['w']['kind'],))
                if rr is not None:
                    a = rr['w']['P'][rr['i']] + (rr['w']['P'][rr['i'] + 1] - rr['w']['P'][rr['i']]) * rr['t']
                    hw2 = rr['w']['hw']
                    # the right-hand half of the road, as seen by the waiting traffic
                    dx, dy = (rr['ux'], rr['uy']) if rr['ux'] * uq[0] + rr['uy'] * uq[1] > 0 else (-rr['ux'], -rr['uy'])
                    cx, cy = a[0] + dy * hw2 / 2, a[1] - dx * hw2 / 2
                    lines.append(('halt' if code == '206' else 'warte', cx, cy, hdg(dx, dy), hw2 / 2 - 0.15))
        return True

    for n, t in O.tags.items():
        hv = t.get('highway')
        if hv not in ('give_way', 'stop') or n not in O.use:
            continue
        for (wid, j) in O.use[n][:1]:
            k, tw, nd = O.roads[wid]
            d = t.get('direction', '')
            ends = junction_end(wid)
            if d in ('forward', 'backward'):
                fwd = d == 'forward'
            elif ends:
                # towards the nearer junction end
                jj, fwd = min(ends, key=lambda e: abs(e[0] - j))
            else:
                fwd = j > len(nd) / 2
            jend = len(nd) - 1 if fwd else 0
            if give('206' if hv == 'stop' else '205', wid, jend, fwd):
                done_minor.add((wid, jend))
    for wid, (k, t, nd) in O.roads.items():
        if k not in (3, 4) or t.get('junction') == 'roundabout':
            continue
        if t.get('surface') in ('unpaved', 'gravel', 'ground', 'grass', 'dirt', 'compacted', 'fine_gravel'):
            continue
        for j, fwd in junction_end(wid):
            if (wid, j) in done_minor:
                continue
            if t.get('oneway') in ('yes', '1') and not fwd:
                continue
            x, y = O.xy[nd[j]]
            # another give-way of OSM close by on this road: done
            if any(math.hypot(O.xy[m][0] - x, O.xy[m][1] - y) < 30 and O.tags.get(m, {}).get('highway') in ('give_way', 'stop') for m in nd):
                continue
            if give('205', wid, j, fwd):
                done_minor.add((wid, j))
                # the classified road: 'priority at the next junction' (301) 150 m before, in open country only
                for (w2, j2) in O.use.get(nd[j], ()):
                    k2, t2, n2 = O.roads[w2]
                    if w2 == wid or k2 > 2:
                        continue
                    for fw2 in (True, False):
                        if t2.get('oneway') in ('yes', '1') and not fw2:
                            continue
                        p, u = ahead(n2, j2, not fw2, 140.0)
                        u = -u
                        if PL.at(p[0], p[1]) or PL.at(x, y):
                            continue
                        if math.hypot(p[0] - x, p[1] - y) < 100:
                            continue                 # the road ends before (another way goes on: kept simple)
                        b = beside(N, p[0], p[1], u[0], u[1])
                        if b is not None:
                            add('301', b[0], b[1], hdg(b[2], b[3]), gap=40.0)

    # ---- roundabouts: at every entry 'give way' with the blue roundabout sign ----
    rb_nodes = set()
    for wid, (k, t, nd) in O.roads.items():
        if t.get('junction') == 'roundabout':
            rb_nodes.update(nd)
    for wid, (k, t, nd) in O.roads.items():
        if t.get('junction') == 'roundabout':
            continue
        for j, fwd in ((len(nd) - 1, True), (0, False)):
            if nd[j] not in rb_nodes:
                continue
            if t.get('oneway') in ('yes', '1') and not fwd:
                continue
            for bk in (5.0, 8.0, 12.0):
                p, u = ahead(nd, j, not fwd, bk)
                u = -u
                b = beside(N, p[0], p[1], u[0], u[1], 0.9)
                if b is not None:
                    add('205+215', b[0], b[1], hdg(b[2], b[3]), gap=10.0)
                    break

    # ---- level crossings of railways in use: St Andrew's cross on both sides ----
    rail_nodes = set()
    for wid, (nd, t) in O.ways.items():
        if t.get('railway') in ('rail', 'light_rail', 'narrow_gauge') and t.get('service') not in ('siding', 'yard', 'spur'):
            rail_nodes.update(nd)
    for n, t in O.tags.items():
        if t.get('railway') != 'level_crossing' or n not in O.use or n not in rail_nodes:
            continue
        for (wid, j) in O.use[n][:1]:
            k, tw, nd = O.roads[wid]
            for fwd in (True, False):
                for bk in (5.0, 8.0, 12.0):
                    p, u = ahead(nd, j, not fwd, bk)
                    u = -u
                    b = beside(N, p[0], p[1], u[0], u[1], 0.9)
                    if b is not None:
                        if b[4]['w']['surf'] <= 3:
                            add('201', b[0], b[1], hdg(b[2], b[3]), gap=6.0)
                        break

    # ---- zebra crossings ----
    for n, t in O.tags.items():
        if not (t.get('crossing') == 'zebra' or t.get('crossing_ref') == 'zebra' or t.get('crossing:markings') == 'zebra') or n not in O.use:
            continue
        wid, j = O.use[n][0]
        k, tw, nd = O.roads[wid]
        x, y = O.xy[n]
        r = N.near(x, y, 4.0, hard=True)
        if r is None:
            continue
        lines.append(('zebra', x, y, hdg(r['ux'], r['uy']), r['w']['hw'] - 0.2))
        for fwd in (True, False):
            u = way_dir(nd, j, fwd)
            p = np.array([x, y]) - u * 1.5
            b = beside(N, p[0], p[1], u[0], u[1], 0.8)
            if b is not None:
                add('350', b[0], b[1], hdg(b[2], b[3]), gap=4.0)

    # ---- station signs (OSM milestones) ----
    for n, t in O.tags.items():
        if t.get('highway') != 'milestone':
            continue
        x, y = O.xy[n]
        r = N.near(x, y, 10.0, kinds=(0, 1, 2))
        if r is None:
            continue
        sd = 1 if r['lat'] < 0 else -1          # the side the node lies on (+1: right of the way's direction)
        off = r['w']['hw'] + 1.3
        a = r['w']['P'][r['i']] + (r['w']['P'][r['i'] + 1] - r['w']['P'][r['i']]) * r['t']
        px, py = a[0] + r['uy'] * sd * off, a[1] - r['ux'] * sd * off
        txt = (t.get('distance') or t.get('pk') or t.get('name') or '').replace(' km', '').strip()
        add('km', px, py, hdg(r['ux'] * sd, r['uy'] * sd), txt[:8], gap=3.0)

    # ---- tight curves on classified roads in open country: chevron boards on the outside ----
    for wi, w in enumerate(N.ways):
        if w['kind'] not in (1, 2) or w['fl'] & 3:
            continue
        L = w['cum'][-1]
        s = 10.0
        last = -1e9
        while s < L - 10:
            R, turn = N.radius(w, s, 10.0)
            if R < 62 and s - last > 60:
                # the apex: the tightest point of the next 40 m
                ss = min(np.arange(s, min(L - 10, s + 40), 2.0), key=lambda q: N.radius(w, q, 10.0)[0])
                R2, turn = N.radius(w, ss, 10.0)
                (x, y), u = N.at(w, ss)
                if PL.at(x, y) == 0 and turn != 0:
                    # the total turn of the bend
                    a0, _ = N.at(w, ss - 25)
                    a1, _ = N.at(w, ss + 25)
                    _, u0 = N.at(w, max(0, ss - 25))
                    _, u1 = N.at(w, min(L, ss + 25))
                    defl = abs(math.atan2(u0[0] * u1[1] - u0[1] * u1[0], u0[0] * u1[0] + u0[1] * u1[1]))
                    if defl > math.radians(42):
                        # outside of the curve: turning left (turn > 0) → the outside is to the right of the way's direction
                        sd = 1 if turn > 0 else -1
                        for ds in (-9.0, 0.0, 9.0):
                            (cx, cy), cu = N.at(w, ss + ds)
                            off = w['hw'] + 1.6
                            px, py = cx + cu[1] * sd * off, cy - cu[0] * sd * off
                            if N.near(px, py, 0.8, skip=wi) is None:
                                # the board faces the inside of the curve; the arrows point the way the bend goes: one per direction
                                add('625', px, py, hdg(-cu[1] * sd, cu[0] * sd), 'L' if turn > 0 else 'R', gap=3.0)
                    last = ss
                    s = ss + 30
            s += 4.0

    # ---- deer crossing: where a classified road in open country runs into a wood for 350 m and more ----
    woods = []
    for wid, (nd, t) in O.ways.items():
        if (t.get('landuse') == 'forest' or t.get('natural') == 'wood') and len(nd) >= 4 and nd[0] == nd[-1]:
            P = O.pts([n for n in nd if n in O.xy])
            if len(P) >= 4:
                woods.append((P, (P[:, 0].min(), P[:, 1].min(), P[:, 0].max(), P[:, 1].max())))

    def in_wood(x, y):
        for P, bb in woods:
            if bb[0] < x < bb[2] and bb[1] < y < bb[3] and Places.inpoly(P, x, y):
                return True
        return False

    for wi, w in enumerate(N.ways):
        if w['kind'] not in (1, 2) or w['fl'] & 3 or w['cum'][-1] < 150:
            continue
        L = w['cum'][-1]
        ss = np.arange(0, L, 25.0)
        iw = [in_wood(*N.at(w, s)[0]) for s in ss]
        k = 0
        while k < len(ss):
            if iw[k]:
                k2 = k
                while k2 + 1 < len(ss) and iw[k2 + 1]:
                    k2 += 1
                if (k2 - k) * 25 >= 350:
                    for (s0, fw) in ((ss[k] - 40, True), (ss[k2] + 40, False)):
                        if 0 < s0 < L:
                            (x, y), u = N.at(w, s0)
                            if PL.at(x, y):
                                continue
                            u = u if fw else -u
                            b = beside(N, x, y, u[0], u[1])
                            if b is not None:
                                add('142', b[0], b[1], hdg(b[2], b[3]), gap=150.0)
                k = k2 + 1
            else:
                k += 1
    return S, lines


def lamps(N, PL, O):
    out = []
    grid = {}

    def free(x, y, r):
        for cx in (-1, 0, 1):
            for cy in (-1, 0, 1):
                for p in grid.get((int(x // 30) + cx, int(y // 30) + cy), ()):
                    if math.hypot(p[0] - x, p[1] - y) < r:
                        return False
        return True

    def put(x, y, h, kind):
        grid.setdefault((int(x // 30), int(y // 30)), []).append((x, y))
        out.append((x, y, h, kind))

    # the lamps OpenStreetMap knows: set beside the road they stand at, turned to it
    for n, t in O.tags.items():
        if t.get('highway') != 'street_lamp':
            continue
        x, y = O.xy[n]
        if PL.name(x, y) == 'Ratscher':
            continue
        r = N.near(x, y, 9.0, kinds=(1, 2, 3, 4, 5))
        if r is None:
            put(x, y, 0.0, 1)
            continue
        sd = 1 if r['lat'] < 0 else -1
        off = max(abs(r['lat']), r['w']['hw'] + 0.9)
        a = r['w']['P'][r['i']] + (r['w']['P'][r['i'] + 1] - r['w']['P'][r['i']]) * r['t']
        px, py = a[0] + r['uy'] * sd * off, a[1] - r['ux'] * sd * off
        put(px, py, hdg(-r['uy'] * sd, r['ux'] * sd), 0)
    n_osm = len(out)
    # by rule: lit streets, and the streets of the built-up areas that OSM does not call unlit – one side, every 36 m
    for wid, (k, t, nd) in sorted(O.roads.items()):
        if k not in (1, 2, 3, 4) or t.get('lit') == 'no' or t.get('tunnel') == 'yes' or t.get('bridge') == 'yes':
            continue
        P = O.pts(nd)
        cum = np.concatenate([[0], np.cumsum(np.hypot(*(P[1:] - P[:-1]).T))])
        L = cum[-1]
        if L < 20:
            continue
        lit = t.get('lit') in ('yes', '24/7', 'automatic')
        sd = 1 if (wid // 7) % 2 else -1
        if t.get('sidewalk') == 'left':
            sd = -1
        elif t.get('sidewalk') == 'right':
            sd = 1
        s = 18.0 if L > 50 else L / 2
        while s < L:
            i = min(len(P) - 2, int(np.searchsorted(cum, s, 'right')) - 1)
            f = (s - cum[i]) / ((cum[i + 1] - cum[i]) or 1e-9)
            x, y = P[i] + (P[i + 1] - P[i]) * f
            s += 36.0
            if not lit and PL.at(x, y) == 0:
                continue
            if PL.name(x, y) == 'Ratscher':
                continue                         # the village has its lanterns (world/village_props.js, after the photos)
            r = N.near(x, y, 5.0, kinds=(1, 2, 3, 4))
            if r is None or r['w']['fl'] & 3:
                continue
            a = r['w']['P'][r['i']] + (r['w']['P'][r['i'] + 1] - r['w']['P'][r['i']]) * r['t']
            off = r['w']['hw'] + 0.9
            for sgn in (sd, -sd):
                px, py = a[0] + r['uy'] * sgn * off, a[1] - r['ux'] * sgn * off
                o = N.near(px, py, 0.6, skip=r['wi'])
                if o is not None and o['w']['kind'] <= 5:
                    continue                     # in the mouth of another road
                if free(px, py, 24.0):
                    put(px, py, hdg(-r['uy'] * sgn, r['ux'] * sgn), 0)
                break
    return out, n_osm


def power(O):
    idx = {}
    masts = []
    lines = []
    for wid, (nd, t) in sorted(O.ways.items()):
        pw = t.get('power')
        if pw not in ('line', 'minor_line'):
            continue
        ln = []
        for n in nd:
            if n not in O.xy:
                continue
            tg = O.tags.get(n, {})
            if tg.get('power') not in ('pole', 'tower', 'portal'):
                continue
            if n not in idx:
                idx[n] = len(masts)
                x, y = O.xy[n]
                masts.append([x, y, 1 if tg.get('power') == 'tower' or pw == 'line' else 0, 0.0, []])
            ln.append(idx[n])
        if len(ln) >= 2:
            try:
                kv = int(str(t.get('voltage', '0')).split(';')[0]) // 1000
            except ValueError:
                kv = 0
            lines.append((1 if pw == 'line' else 0, kv, ln))
            for a, b in zip(ln, ln[1:]):
                d = math.atan2(masts[b][0] - masts[a][0], masts[b][1] - masts[a][1])
                masts[a][4].append(d)
                masts[b][4].append(d)
    for m in masts:
        # the cross-arms stand across the line: the mean direction of its spans (as an axis)
        if m[4]:
            sx = sum(math.sin(2 * d) for d in m[4])
            cx = sum(math.cos(2 * d) for d in m[4])
            m[3] = math.degrees(math.atan2(sx, cx) / 2) % 180
    return [(m[0], m[1], m[2], m[3]) for m in masts], lines


# ---------------- main ----------------
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', help='the cache of viz3/extra/fahrt/strecke.py (OpenStreetMap in cells under <raw>/osm/)')
    ap.add_argument('--plot')
    ap.add_argument('--fahrt', help='the roads of another area: a file of the shape of fahrt/strassen.json (then without the app\'s square)')
    ap.add_argument('--osm', help='OpenStreetMap as an OPL file instead of the cells of --raw')
    ap.add_argument('--out', help='the file to write (default: dist/strassen/ausstattung.json beside this script)')
    A = ap.parse_args()
    if not A.raw and not A.osm:
        ap.error('--raw <cache dir> or --osm <file.opl>')
    N, F = load_net(A.fahrt)
    PL = Places(F)
    O = Osm(A.raw, A.osm)
    log('OSM roads', len(O.roads))
    rails = guard_rails(N, O)
    posts = delineators(N, PL, rails)
    S, lines = signs(N, PL, O, F)
    L, n_osm = lamps(N, PL, O)
    masts, plines = power(O)
    import collections
    log('delineators', len(posts), '· guard rails', len(rails), 'runs,', round(sum(sum(math.dist(a, b) for a, b in zip(r, r[1:])) for t, r in rails)), 'm')
    log('signs', len(S), dict(collections.Counter(s[0].split('-')[0] for s in S)))
    log('lines', dict(collections.Counter(l[0] for l in lines)))
    log('lamps', len(L), '(OSM', n_osm, ')', '· masts', len(masts), 'towers', sum(1 for m in masts if m[2]), 'lines', len(plines))
    dm = lambda v: int(round(v * 10))
    out = dict(
        v=1, made=time.strftime('%Y-%m-%d'),
        note='feat/strassen: built-up areas and road furniture, model metres × 10; headings in degrees clockwise from north',
        credits='© OpenStreetMap contributors (ODbL 1.0)',
        orte=PL.out,
        pfosten=[v for p in posts for v in (dm(p[0]), dm(p[1]), int(round(p[2])))],
        planken=[[t] + [dm(v) for p in r for v in p] for t, r in rails],
        schilder=[[s[0], dm(s[1]), dm(s[2]), int(round(s[3]))] + ([s[4]] if s[4] else []) for s in S],
        lampen=[v for p in L for v in (dm(p[0]), dm(p[1]), int(round(p[2])), p[3])],
        masten=[v for m in masts for v in (dm(m[0]), dm(m[1]), m[2], int(round(m[3])))],
        leitungen=[[t, kv] + ln for t, kv, ln in plines],
        linien=[[l[0], dm(l[1]), dm(l[2]), int(round(l[3])), dm(l[4])] for l in lines],
    )
    p = os.path.abspath(A.out) if A.out else os.path.join(HERE, 'dist', 'strassen', 'ausstattung.json')
    os.makedirs(os.path.dirname(p), exist_ok=True)
    json.dump(out, open(p, 'w'), separators=(',', ':'), ensure_ascii=False)
    log('→', p, round(os.path.getsize(p) / 1024), 'KB')
    if A.plot:
        plot(A.plot, N, PL, out)


def plot(path, N, PL, out):
    from PIL import Image, ImageDraw
    x0, y0, x1, y1 = -11500, -4000, 2500, 4500
    sc = 0.5
    im = Image.new('RGB', (int((x1 - x0) * sc), int((y1 - y0) * sc)), 'white')
    d = ImageDraw.Draw(im)
    X = lambda x: (x - x0) * sc
    Y = lambda y: (y1 - y) * sc
    for t, n, r, bb in PL.P:
        d.polygon([(X(a), Y(b)) for a, b in r], fill=(255, 232, 215) if t == 2 else (228, 242, 220))
    col = {0: (200, 0, 0), 1: (230, 120, 0), 2: (200, 170, 0), 3: (110, 110, 110), 4: (150, 150, 150), 5: (200, 200, 200)}
    for w in N.ways:
        if w['kind'] <= 5:
            d.line([(X(a), Y(b)) for a, b in w['P']], fill=col[w['kind']], width=2 if w['kind'] < 3 else 1)
    d.rectangle([X(BOX[0]), Y(BOX[3]), X(BOX[2]), Y(BOX[1])], outline=(0, 0, 255))
    q = out['pfosten']
    for i in range(0, len(q), 3):
        d.point((X(q[i] / 10), Y(q[i + 1] / 10)), fill=(0, 0, 0))
    for r in out['planken']:
        d.line([(X(r[i] / 10), Y(r[i + 1] / 10)) for i in range(1, len(r), 2)], fill=(0, 160, 255), width=2)
    q = out['lampen']
    for i in range(0, len(q), 4):
        x, y = X(q[i] / 10), Y(q[i + 1] / 10)
        d.ellipse([x - 1.5, y - 1.5, x + 1.5, y + 1.5], fill=(255, 190, 0))
    for s in out['schilder']:
        x, y = X(s[1] / 10), Y(s[2] / 10)
        d.rectangle([x - 2, y - 2, x + 2, y + 2], fill=(220, 0, 0))
        d.text((x + 3, y - 5), s[0], fill=(120, 0, 0))
    q = out['masten']
    for ln in out['leitungen']:
        d.line([(X(q[i * 4] / 10), Y(q[i * 4 + 1] / 10)) for i in ln[2:]], fill=(150, 0, 200) if ln[0] else (200, 120, 220), width=1)
    for l in out['linien']:
        x, y = X(l[1] / 10), Y(l[2] / 10)
        d.ellipse([x - 3, y - 3, x + 3, y + 3], outline=(0, 120, 0))
    im.save(path)
    log('plot', path, im.size)


if __name__ == '__main__':
    main()
