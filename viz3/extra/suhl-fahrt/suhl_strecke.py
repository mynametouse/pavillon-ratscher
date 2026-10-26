"""The drive Ratscher -> Suhl (viz3/src/welt/fahrt.js, feat/suhl-fahrt): roads, motorway, signs and routes north of Schleusingen.

    python3 -I viz3/extra/suhl-fahrt/suhl_strecke.py --raw <cache dir>
        -> viz3/extra/suhl-fahrt/dist/fahrt/suhl.json    (the app's data, the same format as fahrt/strassen.json plus the motorway)
        -> viz3/extra/suhl-fahrt/recherche.json         (the research: both routes with their way ids, numbers, lengths, junctions,
                                                          bridges, tunnels, speed limits, town-limit signs)

Runs in GitHub Actions (.github/workflows/suhl-fahrt.yml): the chat machine reaches neither OpenStreetMap nor the website.
- OpenStreetMap (Overpass, else the OSM API in cells): the drivable roads from Ratscher to Suhl and Zella-Mehlis (motorway … service),
  motorway junctions (exit numbers and names), destination tags of the links (the blue signs), town-limit signs, places, built-up areas.
- Heights: the world tiles on the website (welt-test/, welt-test/zonen/suhl/ once the suhl agent publishes it; finest level at each
  point), elsewhere Copernicus GLO-30 with the forest lowered (tools/welt/dem.py CopGround, as the tile pipeline does without DGM1).
  The longitudinal profiles come from the smoother of the tile pipeline (tools/welt/roads.py; viz3/extra/fahrt/strecke.py): shared
  junctions, bridges and tunnels straight; where a road continues a road of fahrt/strassen.json its nodes are held at that profile, so
  the two data sets meet without a step.
- Routes (Dijkstra by time): garden -> Suhl Markt over the motorway (A 73 north, Dreieck Suhl, A 71, off at a Suhl exit) and over the
  country roads (no motorway), and both back.
Output in model metres (x east, y north, z = NHN - H0), integers in decimetres. (c) OpenStreetMap contributors (ODbL 1.0).
"""
import argparse, heapq, json, math, os, sys, time, urllib.request, urllib.parse
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, os.path.join(REPO, 'viz3', 'extra', 'fahrt'))
sys.path.insert(0, os.path.join(REPO, 'tools', 'welt'))
import strecke as ST   # viz3/extra/fahrt/strecke.py: u2m, m2u, simplify, overpasses, TileDem, WR = tools/welt/roads.py
WR = ST.WR

UA = 'PavillonRatscher-SuhlFahrt/0.1 (+https://github.com/mynametouse/pavillon-ratscher; open geodata, non-commercial)'
# the area: Ratscher (south) to Zella-Mehlis (north), Schleusingen (east) to the A 71 west of Suhl
LL = (10.60, 10.86, 50.49, 50.668)          # lon0, lon1, lat0, lat1
SUHL_C = (10.6930, 50.6106)                  # Suhl, Markt (lon, lat)
GARDEN = ST.GARDEN
OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
            'https://overpass.private.coffee/api/interpreter']
HW_ROADS = ('motorway|motorway_link|trunk|trunk_link|primary|primary_link|secondary|secondary_link|tertiary|tertiary_link|'
            'unclassified|residential|living_street|service|road')
KINDS, SURF = ST.KINDS, ST.SURF
# second line of the place-name sign (strecke.py MUNI plus the places towards Suhl; Suhl's quarters say „Stadt Suhl“)
MUNI = dict(ST.MUNI)
MUNI.update({'Suhl': '', 'Hirschbach': 'Landkreis Hildburghausen', 'Schmiedefeld am Rennsteig': 'Stadt Suhl',
             'Zella-Mehlis': 'Landkreis Schmalkalden-Meiningen', 'Dietzhausen': 'Stadt Suhl', 'Wichtshausen': 'Stadt Suhl',
             'Mäbendorf': 'Stadt Suhl', 'Albrechts': 'Stadt Suhl', 'Heinrichs': 'Stadt Suhl', 'Neundorf': 'Stadt Suhl',
             'Lautenthal': 'Stadt Suhl', 'Goldlauter': 'Stadt Suhl', 'Heidersbach': 'Stadt Suhl', 'Vesser': 'Stadt Suhl',
             'Gehlberg': 'Stadt Suhl', 'Wilhelmsthal': 'Stadt Suhl'})
# destinations far away for the distance boards (lon, lat): straight line x 1.22 – the boards say roughly how far
FAR = {'Erfurt': (11.03, 50.98), 'Coburg': (10.964, 50.258), 'Schweinfurt': (10.233, 50.05), 'Meiningen': (10.415, 50.567),
       'Würzburg': (9.93, 49.79), 'Nürnberg': (11.077, 49.452), 'Bamberg': (10.887, 49.898), 'Arnstadt': (10.947, 50.835),
       'Ilmenau': (10.914, 50.684), 'Oberhof': (10.727, 50.705), 'Eisfeld': (10.909, 50.426), 'Zella-Mehlis': (10.663, 50.655),
       'Hildburghausen': (10.731, 50.426), 'Schleusingen': (10.754, 50.511), 'Suhl': SUHL_C}


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def http(url, data=None, timeout=240, tries=3):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, data=urllib.parse.urlencode(data).encode() if data else None, headers={'User-Agent': UA})
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.status, r.read()
        except urllib.error.HTTPError as e:
            if e.code in (400, 404):
                return e.code, b''
            log('HTTP', e.code, url[:80])
        except Exception as e:
            log('HTTP failed', url[:80], repr(e)[:120])
        time.sleep(5 + 10 * k)
    return 0, b''


# ---------------- OpenStreetMap ----------------
def fetch_osm(raw):
    p = os.path.join(raw, 'osm_suhl_v1.json')
    if os.path.exists(p):
        j = json.load(open(p))
        log('OSM aus dem Cache', p)
    else:
        lo0, lo1, la0, la1 = LL
        bb = f'{la0},{lo0},{la1},{lo1}'
        gb = f'{50.492},{10.755},{50.506},{10.785}'   # tracks only around the garden (the first metres of the routes)
        q = f"""[out:json][timeout:300];
(
  way[highway~"^({HW_ROADS})$"]({bb});
  way[highway=track]({gb});
  node[highway=motorway_junction]({bb});
  node[traffic_sign]({bb});
  node[place~"^(city|town|village|hamlet|suburb|quarter|isolated_dwelling)$"]({bb});
  way[landuse~"^(residential|farmyard|commercial|retail|industrial)$"]({bb});
  way[place=square]({bb});
);
out body;
>;
out skel qt;"""
        j = None
        for url in OVERPASS:
            st, b = http(url, data={'data': q}, timeout=330, tries=2)
            if st == 200 and b[:1] == b'{':
                jj = json.loads(b)
                if jj.get('remark') and 'error' in jj['remark'].lower():
                    log('Overpass', url, jj['remark'][:200])
                    continue
                j = jj
                log('Overpass', url, len(b), 'Bytes,', len(j['elements']), 'Elemente')
                break
            log('Overpass', url, st)
        if j is None:
            # the OSM API in cells (as strecke.py)
            log('Overpass nicht erreichbar – OSM-API in Zellen')
            ST.LL = LL
            nodes, ways = ST.fetch_osm(raw)
            j = {'elements': [{'type': 'node', 'id': i, 'lon': n[0], 'lat': n[1], 'tags': n[2]} for i, n in nodes.items()] +
                             [{'type': 'way', 'id': i, 'nodes': w[0], 'tags': w[1]} for i, w in ways.items()]}
        json.dump(j, open(p, 'w'))
    nodes, ways = {}, {}
    for el in j['elements']:
        if el['type'] == 'node':
            i = int(el['id'])
            tg = el.get('tags') or (nodes[i][2] if i in nodes else {})
            nodes[i] = (float(el['lon']), float(el['lat']), tg)
        elif el['type'] == 'way':
            ways[int(el['id'])] = ([int(r) for r in el['nodes']], el.get('tags', {}))
    log('OSM', len(nodes), 'Knoten', len(ways), 'Wege')
    return nodes, ways


# ---------------- heights: the tiles of the website, else Copernicus (forest lowered) ----------------
class Heights:
    def __init__(self, raw):
        ST.SETS = ['', 'zonen/vessra/', 'zonen/suhl/']
        self.tiles = ST.TileDem(raw)
        self.sets = [s for s, m in self.tiles.meta if m]
        log('Kachelsätze', self.sets or 'keine')
        cs = [ST._tr.transform(lo, la) for lo in LL[:2] for la in LL[2:]]
        ctx = (min(c[0] for c in cs) - 500, min(c[1] for c in cs) - 500, max(c[0] for c in cs) + 500, max(c[1] for c in cs) + 500)
        from dem import CopGround
        self.cop = CopGround(raw, ctx)
        self.n_tile = self.n_cop = 0

    def sample(self, E, N):
        E = np.asarray(E, float).ravel()
        N = np.asarray(N, float).ravel()
        out = self.tiles.sample(E, N)
        bad = ~np.isfinite(out)
        if bad.any():
            out[bad] = self.cop(E[bad], N[bad])
        self.n_tile += int((~bad).sum())
        self.n_cop += int(bad.sum())
        return out


# ---------------- fahrt/strassen.json: the roads south of here, their profiles (to hold ours at) ----------------
class Old:
    def __init__(self):
        j = json.load(open(os.path.join(REPO, 'viz3', 'extra', 'fahrt', 'dist', 'fahrt', 'strassen.json')))
        self.j = j
        segs = []
        for k, sf, w10, fl, ni, ri, q in j['ways']:
            if fl & 3:
                continue
            P = np.array(q, float).reshape(-1, 3) / 10
            for a, b in zip(P[:-1], P[1:]):
                segs.append((a, b, k))
        self.A = np.array([s[0] for s in segs])
        self.B = np.array([s[1] for s in segs])
        self.K = np.array([s[2] for s in segs])
        from scipy.spatial import cKDTree
        self.kd = cKDTree((self.A[:, :2] + self.B[:, :2]) / 2)
        self.L = np.hypot(*(self.B[:, :2] - self.A[:, :2]).T)

    def near(self, x, y, kind, tol=1.6):
        """the profile height of an old road of the same class within tol m of (x, y), else None"""
        best = None
        for i in self.kd.query_ball_point((x, y), 14):
            if self.K[i] != kind:
                continue
            a, b = self.A[i], self.B[i]
            e = b[:2] - a[:2]
            t = float(np.clip(((x - a[0]) * e[0] + (y - a[1]) * e[1]) / max(self.L[i] ** 2, 1e-9), 0, 1))
            d = math.hypot(a[0] + e[0] * t - x, a[1] + e[1] * t - y)
            if d < tol and (best is None or d < best[0]):
                best = (d, a[2] + (b[2] - a[2]) * t)
        return None if best is None else best[1]


def solve(pos, chains, dem, pin):
    """tools/welt/roads.py solve_profile with held nodes (pin: index -> model z of fahrt/strassen.json)"""
    from scipy.sparse import coo_matrix, diags
    from scipy.sparse.linalg import spsolve
    N = len(pos)
    rows_d, vals_d, rhs_d = [], [], []
    axis = dem.sample(pos[:, 0], pos[:, 1])
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
    I = np.concatenate(rows_d)
    Wd = np.bincount(I, weights=np.concatenate(vals_d), minlength=N) + 1e-6
    bd = np.bincount(I, weights=np.concatenate(rhs_d), minlength=N) + 1e-6 * np.nan_to_num(axis, nan=np.nanmean(axis))
    H0 = ST.H0
    for i, z in pin.items():
        Wd[i] += 1e7
        bd[i] += 1e7 * (z + H0)
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
    h = spsolve((C.T @ C + diags(Wd)).tocsc(), bd)
    log('Profile:', len(pin), 'Knoten am Profil von strassen.json gehalten')
    return h, axis


# ---------------- helpers ----------------
def poly_len(P):
    P = np.asarray(P, float)
    return float(np.hypot(*np.diff(P, axis=0).T).sum()) if len(P) > 1 else 0.0


def seg_dist(px, py, A, B):
    """distance of points (px, py) to the polyline segments A -> B (arrays (n, 2))"""
    e = B - A
    L2 = np.maximum((e ** 2).sum(1), 1e-9)
    t = np.clip(((px[:, None] - A[None, :, 0]) * e[None, :, 0] + (py[:, None] - A[None, :, 1]) * e[None, :, 1]) / L2[None], 0, 1)
    dx = A[None, :, 0] + e[None, :, 0] * t - px[:, None]
    dy = A[None, :, 1] + e[None, :, 1] * t - py[:, None]
    return np.sqrt(dx * dx + dy * dy).min(1)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', required=True)
    ap.add_argument('--out', default=os.path.join(HERE, 'dist', 'fahrt', 'suhl.json'))
    ap.add_argument('--research', default=os.path.join(HERE, 'recherche.json'))
    a = ap.parse_args()
    t0 = time.time()
    os.makedirs(a.raw, exist_ok=True)
    nodes, ways = fetch_osm(a.raw)
    M = {}
    ids = list(nodes)
    E, N = ST._tr.transform([nodes[i][0] for i in ids], [nodes[i][1] for i in ids])
    mx, my = ST.u2m(np.array(E), np.array(N))
    for i, x, y in zip(ids, mx, my):
        M[i] = (float(x), float(y))
    tgw = lambda wid: ways[wid][1]
    # ---------------- the graph (by time) ----------------
    SPD = {'motorway': 120, 'motorway_link': 55, 'trunk': 90, 'main': 80, 'county': 70, 'lane': 50, 'street': 30, 'service': 12, 'track': 8}
    G = {}
    for wid, (refs, tg) in ways.items():
        c = WR.classify(tg) if 'highway' in tg else None
        if not c or c[0] not in SPD:
            continue
        if tg.get('access') in ('private', 'no') or tg.get('motor_vehicle') in ('private', 'no') or tg.get('motorcar') == 'no':
            continue
        if tg.get('service') in ('parking_aisle', 'driveway', 'drive-through', 'emergency_access'):
            continue
        hwv = tg['highway']
        mw = hwv in ('motorway', 'motorway_link')
        ow = tg.get('oneway') in ('yes', '1', 'true') or tg.get('junction') == 'roundabout' or hwv == 'motorway'
        rev = tg.get('oneway') == '-1'
        kmh = SPD['motorway_link'] if hwv == 'motorway_link' else SPD[c[0]]
        try:
            ms = tg.get('maxspeed', '')
            if ms.isdigit():
                kmh = min(kmh, int(ms) * 0.95)
        except Exception:
            pass
        v = kmh / 3.6
        for p, q in zip(refs, refs[1:]):
            if p in M and q in M:
                if rev:
                    p, q = q, p
                L = math.dist(M[p], M[q])
                G.setdefault(p, []).append((q, L / v, L, wid, mw))
                if not ow and not rev:
                    G.setdefault(q, []).append((p, L / v, L, wid, mw))
                elif rev:
                    pass

    def nearest(x, y, cond=None):
        return min((k for k in G if cond is None or cond(k)), key=lambda k: (M[k][0] - x) ** 2 + (M[k][1] - y) ** 2)

    def dijkstra(s, goal=None, motorway=True):
        dist, prev, pq = {s: 0.0}, {}, [(0.0, s)]
        while pq:
            d, u = heapq.heappop(pq)
            if u == goal:
                break
            if d > dist[u]:
                continue
            for v, c, L, wid, mw in G.get(u, ()):
                if mw and not motorway:
                    continue
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

    def route(stops, motorway=True):
        """the time-shortest path through the stops; nodes, ways along it"""
        out, wids = [stops[0]], []
        for s, g in zip(stops, stops[1:]):
            dist, prev = dijkstra(s, g, motorway)
            if g not in dist:
                raise RuntimeError(f'keine Verbindung {s} -> {g}')
            p = path(prev, s, g)
            wids += [prev[k][2] for k in p[1:]]
            out += p[1:]
        return out, wids
    # ---------------- key places: the garden, Suhl Markt, the motorway junctions ----------------
    sE, sN = ST._tr.transform(*SUHL_C)
    smx, smy = [float(v) for v in ST.u2m(sE, sN)]
    markt = None
    for wid, (refs, tg) in ways.items():
        if tg.get('name') in ('Markt', 'Marktplatz') and refs[0] in M and math.dist(M[refs[0]], (smx, smy)) < 1500:
            cand = [r for r in refs if r in G]
            if cand:
                markt = min(cand, key=lambda r: math.dist(M[r], (smx, smy)))
                log('Suhl: Straße', tg.get('name'), wid, 'Knoten', markt, [round(v) for v in M[markt]])
                break
    if markt is None:
        markt = nearest(smx, smy, lambda k: any(not mw for *_, mw in G[k]))
        log('Suhl: kein Weg „Markt“ – nächster Knoten', markt, [round(v) for v in M[markt]])
    s0 = nearest(*GARDEN)
    junctions = {}
    for i, (lo, la, tg) in nodes.items():
        if tg.get('highway') == 'motorway_junction' and i in M:
            junctions[i] = {'id': i, 'ref': tg.get('ref', ''), 'name': tg.get('name', ''), 'x': round(M[i][0], 1), 'y': round(M[i][1], 1),
                            'lat': la, 'lon': lo}
    # which motorways pass each junction
    mw_of = {}
    for wid, (refs, tg) in ways.items():
        if tg.get('highway') == 'motorway':
            for r in refs:
                if r in junctions:
                    mw_of.setdefault(r, set()).add(tg.get('ref', ''))
    for i, J in junctions.items():
        J['on'] = sorted(mw_of.get(i, ()))
    log('Anschlussstellen:', json.dumps(sorted(junctions.values(), key=lambda J: -J['y']), ensure_ascii=False))
    # ---------------- the routes ----------------
    routes, rinfo = {}, {}
    p_ab, w_ab = route([s0, markt], True)
    p_land, w_land = route([s0, markt], False)
    used_mw = [wid for wid in w_ab if tgw(wid).get('highway') == 'motorway']
    refs_on = [tgw(wid).get('ref') for wid in used_mw]
    log('Route Autobahn (frei):', sorted(set(refs_on), key=refs_on.index))
    # the brief: north on the A 73 to the Dreieck Suhl and on the A 71 off at a Suhl exit – through the Dreieck when the free route
    # leaves earlier
    drei = [J for J in junctions.values() if 'Dreieck' in J['name'] or ('A 71' in ' '.join(J['on']) and 'A 73' in ' '.join(J['on']))]
    log('Dreieck:', drei)
    if drei and not any(n in [J['id'] for J in drei] for n in p_ab):
        best = None
        for J in drei:
            try:
                pp, ww = route([s0, J['id'], markt], True)
            except Exception as e:
                log('über', J['name'], 'nicht:', e)
                continue
            Lp = sum(math.dist(M[u], M[v]) for u, v in zip(pp, pp[1:]))
            if best is None or Lp < best[0]:
                best = (Lp, pp, ww)
        if best:
            _, p_ab, w_ab = best
            log('Route Autobahn über das Dreieck erzwungen')
    p_ab_r, w_ab_r = route([markt, s0], True)
    if drei and not any(n in [J['id'] for J in drei] for n in p_ab_r):
        for J in drei:
            try:
                p_ab_r, w_ab_r = route([markt, J['id'], s0], True)
                break
            except Exception:
                continue
    p_land_r, w_land_r = route([markt, s0], False)
    for key, (p, w) in {'suhl_ab': (p_ab, w_ab), 'suhl_land': (p_land, w_land), 'suhl_ab_rueck': (p_ab_r, w_ab_r),
                        'suhl_land_rueck': (p_land_r, w_land_r)}.items():
        pts = np.array([M[k] for k in p])
        L = poly_len(pts)
        routes[key] = {'pts': [int(round(v * 10)) for v in pts.ravel()], 'm': round(L), 'nodes': p, 'ways': w}
        # the legs: consecutive pieces on the same road (ref or name)
        legs = []
        for k, wid in enumerate(w):
            tg = tgw(wid)
            lab = tg.get('ref') or tg.get('name') or tg.get('highway')
            dL = math.dist(M[p[k]], M[p[k + 1]])
            if legs and legs[-1]['road'] == lab:
                legs[-1]['m'] += dL
                if wid not in legs[-1]['ways']:
                    legs[-1]['ways'].append(wid)
            else:
                legs.append({'road': lab, 'hw': tg.get('highway'), 'name': tg.get('name', ''), 'm': dL, 'ways': [wid]})
        for lg in legs:
            lg['m'] = round(lg['m'])
        jn = [junctions[n] for n in p if n in junctions]
        rinfo[key] = {'m': round(L), 'legs': [lg for lg in legs if lg['m'] >= 30], 'junctions': jn}
        log('Route', key, round(L), 'm:', ' → '.join(f"{lg['road']} {lg['m']}" for lg in legs if lg['m'] >= 150))
    # ---------------- the ways to keep: near the routes, outside the square, not already in strassen.json ----------------
    old = Old()
    RP = np.concatenate([np.array(r['pts'], float).reshape(-1, 2) / 10 for r in routes.values()])
    RA, RB = RP[:-1], RP[1:]
    from scipy.spatial import cKDTree
    rkd = cKDTree(RP)
    cs = [ST._tr.transform(lo, la) for lo in LL[:2] for la in LL[2:]]
    area = (min(c[0] for c in cs), min(c[1] for c in cs), max(c[0] for c in cs), max(c[1] for c in cs))
    osm = {'nodes': {i: (n[0], n[1], n[2]) for i, n in nodes.items()}, 'ways': ways}
    W, nodeE = WR.load_ways(osm, area, margin=0)
    keep, dropped_old = [], 0
    for w in W:
        t = ways[w['id']][1]
        if w['kind'] in ('track', 'path', 'foot'):
            continue
        if t.get('access') in ('private', 'no') or t.get('motor_vehicle') in ('private', 'no'):
            continue
        if w['kind'] == 'service' and t.get('service') in ('driveway', 'parking_aisle', 'drive-through', 'emergency_access'):
            continue
        P = np.array([M[r] for r in w['refs'] if r in M])
        if len(P) < 2:
            continue
        if all(ST.inside_box(xx, yy, 30) for xx, yy in P):
            continue
        reach = 900 if w['kind'] in ('motorway', 'main', 'county') else 250
        d, _ = rkd.query(P)
        if d.min() > reach:
            continue
        if w['kind'] == 'service' and poly_len(P) < 40:
            continue
        # all of it on a road of strassen.json (the same road there): left to that file
        hold = [old.near(x, y, KINDS.index(w['kind'])) for x, y in P]
        if all(h is not None for h in hold):
            dropped_old += 1
            continue
        # the motorway as built: per carriageway the left edge strip, the lanes, the hard shoulder (RQ 31); links one lane + strips
        hwv = t.get('highway')
        try:
            lanes = int(t.get('lanes', '0'))
        except ValueError:
            lanes = 0
        if hwv == 'motorway':
            lanes = lanes or 2
            w['w'] = 0.75 + lanes * 3.75 + 2.5
        elif hwv == 'motorway_link':
            lanes = lanes or 1
            w['w'] = lanes * 3.6 + 2.0
        w['lanes'] = lanes
        w['hwv'] = hwv
        keep.append(w)
    log('Straßen', len(keep), 'von', len(W), '(', dropped_old, 'ganz in strassen.json )')
    pos, chains = WR.network(keep, nodeE, step=2.0)
    dem = Heights(a.raw)
    dem.tiles.prefetch(pos[:, 0], pos[:, 1])
    px, py = ST.u2m(pos[:, 0], pos[:, 1])
    pin = {}
    for w, ids_ in chains:
        if w['fl'] & 3:
            continue
        k = KINDS.index(w['kind'])
        for i in ids_:
            z = old.near(px[i], py[i], k)
            if z is not None:
                pin[int(i)] = z
    h, axis = solve(pos, chains, dem, pin)
    h = ST.overpasses(pos, chains, h)
    res = WR.metrics(pos, chains, h, axis)
    WR.print_metrics(res, '(Suhl: vorher = Gelände an der Achse, nachher = geglättetes Längsprofil)')
    log('Höhen: Kacheln', dem.n_tile, 'Copernicus', dem.n_cop)
    # ---------------- ways out (model dm), the motorway's lanes ----------------
    names, nid = [''], {}

    def name_i(s):
        if s not in nid:
            nid[s] = len(names)
            names.append(s)
        return nid[s]
    out_ways, lanes_out, npts = [], [], 0
    mz = h - ST.H0
    tunnels, bridges = [], []
    for w, ids_ in chains:
        P = np.stack([px[ids_], py[ids_], mz[ids_]], 1)
        P = ST.simplify(P)
        npts += len(P)
        t = ways[w['id']][1]
        oneway = t.get('oneway') == 'yes' or t.get('junction') == 'roundabout' or w.get('hwv') == 'motorway'
        fl = (1 if w['fl'] & 1 else 0) | (2 if w['fl'] & 2 else 0) | (4 if oneway else 0)
        # feat/suhl-fahrt: 8 = motorway carriageway, 16 = motorway link
        fl |= 8 if w.get('hwv') == 'motorway' else 16 if w.get('hwv') == 'motorway_link' else 0
        nm = w['name'] or t.get('bridge:name', '') or t.get('tunnel:name', '')
        out_ways.append([KINDS.index(w['kind']), SURF.index(w['surf']), int(round(w['w'] * 10)), fl, name_i(nm), name_i(w['ref']),
                         [int(round(v * 10)) for v in P.ravel()]])
        lanes_out.append(w.get('lanes', 0))
        L = poly_len(P[:, :2])
        if w['fl'] & 2 and L > 40:
            tunnels.append({'way': w['id'], 'name': t.get('tunnel:name') or t.get('name', ''), 'ref': w['ref'], 'm': round(L),
                            'i': len(out_ways) - 1})
        if w['fl'] & 1 and L > 40:
            bridges.append({'way': w['id'], 'name': t.get('bridge:name') or t.get('name', ''), 'ref': w['ref'], 'm': round(L),
                            'z': round(float(P[:, 2].mean()), 1), 'i': len(out_ways) - 1})
    log('Wege', len(out_ways), 'Punkte', npts, 'Tunnel', len(tunnels), 'Brücken', len(bridges))
    # ---------------- places, built-up areas, place-name signs ----------------
    from shapely.geometry import Polygon, Point, LineString
    from shapely.ops import unary_union
    places = [(tg['name'], tg['place'], M[i]) for i, (lo, la, tg) in nodes.items()
              if tg.get('place') in ('town', 'city', 'village', 'hamlet') and tg.get('name') and i in M]
    polys = {p[0]: [] for p in places}
    for wid, (refs, tg) in ways.items():
        if tg.get('landuse') in ('residential', 'farmyard', 'commercial', 'retail', 'industrial') and len(refs) > 3 and refs[0] == refs[-1]:
            pts = [M[r] for r in refs if r in M]
            if len(pts) < 4:
                continue
            pg = Polygon(pts)
            if not pg.is_valid:
                pg = pg.buffer(0)
            c = pg.centroid
            eff = lambda p: math.dist(p[2], (c.x, c.y)) * (0.35 if p[1] in ('town', 'city') else 1.0)
            best = min(places, key=eff)
            if eff(best) < 1200:
                polys[best[0]].append(pg)
    areas, out_places = {}, []
    old_names = {p['n'] for p in old.j['places']}
    for name, kind, (x, y) in places:
        if not polys[name] or name in old_names:
            continue
        u = unary_union([p.buffer(60) for p in polys[name]]).buffer(-45)
        geoms = list(u.geoms) if hasattr(u, 'geoms') else [u]
        lim = 3000 if kind in ('town', 'city') else 600
        geoms = [g for g in geoms if g.area > 2000 and g.distance(Point(x, y)) < lim]
        if not geoms:
            continue
        ar = unary_union(geoms)
        # only places near the routes
        if ar.distance(LineString(RP)) > 1500:
            continue
        areas[name] = ar
        out_places.append({'n': name, 'k': kind, 'x': round(x), 'y': round(y), 'm': MUNI.get(name, ''),
                           'a': [[int(round(v)) for xy in g.simplify(4).exterior.coords[:-1] for v in xy] for g in geoms]})
    log('Orte', [p['n'] for p in out_places])
    osm_cl = [(tg.get('name', ''), M[i]) for i, (lo, la, tg) in nodes.items() if 'city_limit' in tg.get('traffic_sign', '') and i in M]
    log('Ortstafeln in OSM:', [(n, [round(v) for v in p]) for n, p in osm_cl])
    old_signs = old.j['signs']
    signs = []
    wclass = {wid: WR.classify(tg) for wid, (refs, tg) in ways.items() if 'highway' in tg}
    for key in ('suhl_land', 'suhl_land_rueck', 'suhl_ab', 'suhl_ab_rueck'):
        p = routes[key]['nodes']
        ln = LineString([M[k] for k in p])
        for name, ar in areas.items():
            if not ln.intersects(ar.boundary):
                continue
            xs = ln.intersection(ar.boundary)
            for q in (list(xs.geoms) if hasattr(xs, 'geoms') else [xs]):
                if q.geom_type != 'Point':
                    continue
                d0 = ln.project(q)
                a1, a2 = ln.interpolate(max(0, d0 - 3)), ln.interpolate(min(ln.length, d0 + 3))
                if not ar.contains(Point(a2.x, a2.y)):
                    continue   # leaving: the back of the sign of the other direction
                # the road there: no place-name signs on motorways and their links
                k_near = min(range(len(p) - 1), key=lambda k: Point(M[p[k]]).distance(q))
                wid = routes[key]['ways'][k_near]
                c = wclass.get(wid)
                if not c or tgw(wid).get('highway') in ('motorway', 'motorway_link'):
                    continue
                dx, dy = a2.x - a1.x, a2.y - a1.y
                L = math.hypot(dx, dy) or 1
                dx, dy = dx / L, dy / L
                cl = [pp for n2, pp in osm_cl if n2 == name and math.dist(pp, (q.x, q.y)) < 250]
                px0, py0 = cl[0] if cl else (q.x + dx * 4, q.y + dy * 4)
                hw = c[2] / 2
                sx, sy = px0 + dy * (hw + 1.4), py0 - dx * (hw + 1.4)
                if any(s['n'] == name and math.dist((s['x'], s['y']), (sx, sy)) < 60 for s in signs + old_signs):
                    continue
                signs.append({'t': 'ort', 'n': name, 'm': MUNI.get(name, 'Landkreis Hildburghausen'), 'x': round(sx, 1), 'y': round(sy, 1),
                              'h': round(math.degrees(math.atan2(-dx, -dy)), 1), 'route': key})
    for s in signs:
        best, bd = None, 1e18
        fx, fy = -math.sin(math.radians(s['h'])), -math.cos(math.radians(s['h']))
        for name, kind, (x, y) in places:
            if name == s['n'] or name not in areas and name not in old_names:
                continue
            dx, dy = x - s['x'], y - s['y']
            d = math.hypot(dx, dy)
            if 300 < d < 8000 and (dx * -fx + dy * -fy) / d > 0.5 and d < bd:
                bd, best = d, name
        s['b'] = best or ''
    log('Ortstafeln', len(signs), [(s['n'], s['route']) for s in signs])
    # ---------------- direction signs (yellow) at the junctions of the country road ----------------
    RANK = {'motorway': 0, 'main': 1, 'county': 2, 'lane': 3, 'street': 4, 'service': 5, 'track': 6}
    key_of = lambda wid: (tgw(wid).get('ref') or tgw(wid).get('name') or str(wid))

    def lead(u, v, wid, maxd=9000):
        k0, d, prev_n, cur = key_of(wid), math.dist(M[u], M[v]), u, v
        seen = {u, v}
        while d < maxd:
            pl = next((n for n, ar in areas.items() if ar.contains(Point(*M[cur]))), None)
            if pl:
                return pl, d
            nxt = [(q, w2) for q, c, L, w2, mw in G.get(cur, ()) if q not in seen and wclass.get(w2) and RANK.get(wclass[w2][0], 9) <= 4]
            if not nxt:
                return None, d
            same = [t for t in nxt if key_of(t[1]) == k0]
            if same:
                q, w2 = same[0]
            else:
                ax_, ay_ = M[cur][0] - M[prev_n][0], M[cur][1] - M[prev_n][1]
                q, w2 = max(nxt, key=lambda t: ((M[t[0]][0] - M[cur][0]) * ax_ + (M[t[0]][1] - M[cur][1]) * ay_) /
                            (math.dist(M[t[0]], M[cur]) * math.hypot(ax_, ay_) + 1e-9))
            d += math.dist(M[cur], M[q])
            seen.add(q)
            prev_n, cur = cur, q
        return None, d

    def arrow(u, q, wid2, dx, dy):
        prv, cur, d = u, q, math.dist(M[u], M[q])
        while d < 25:
            nx = [t for t in G.get(cur, ()) if t[0] != prv and key_of(t[3]) == key_of(wid2)]
            if not nx:
                break
            prv, cur = cur, nx[0][0]
            d += math.dist(M[prv], M[cur])
        bx, by = M[cur]
        x, y = M[u]
        t = math.degrees(math.atan2((bx - x) * dy - (by - y) * dx, (bx - x) * dx + (by - y) * dy))
        return 'r' if t > 35 else 'l' if t < -35 else 'g'
    wsigns = []
    for key, dest in (('suhl_land', 'Suhl'), ('suhl_land_rueck', 'Schleusingen'), ('suhl_ab', 'Suhl')):
        p, wl = routes[key]['nodes'], routes[key]['ways']
        cum = [0.0]
        for u, v in zip(p, p[1:]):
            cum.append(cum[-1] + math.dist(M[u], M[v]))
        tot = cum[-1]
        for k in range(2, len(p) - 1):
            u = p[k]
            wid_in, wid_out = wl[k - 1], wl[k]
            cin = wclass.get(wid_in)
            if not cin or RANK.get(cin[0], 9) > 4 or tgw(wid_in).get('highway') in ('motorway', 'motorway_link'):
                continue
            others = [(q, w2) for q, c, L, w2, mw in G.get(u, ()) if q not in (p[k - 1], p[k + 1]) and wclass.get(w2) and RANK.get(wclass[w2][0], 9) <= 3]
            turned = key_of(wid_in) != key_of(wid_out)
            if not others and not turned:
                continue
            x, y = M[u]
            if ST.inside_box(x, y, 300) or tot - cum[k] < 250:
                continue
            ax_, ay_ = M[p[k - 1]]
            dx, dy = x - ax_, y - ay_
            L = math.hypot(dx, dy) or 1
            dx, dy = dx / L, dy / L
            rest = tot - cum[k]
            out_mw = tgw(wid_out).get('highway') == 'motorway_link'
            if out_mw:
                # onto the motorway: the blue sign with the motorway and its destinations (the link's destination tags)
                tg = tgw(wid_out)
                ds = (tg.get('destination') or '').split(';')
                lines = [['A ' + (tg.get('destination:ref', '') or '73').replace('A ', '').split(';')[0], ' / '.join(d for d in ds[:2] if d) or dest, arrow(u, p[k + 1], wid_out, dx, dy)]]
                kind = 'abweg'
            else:
                name = dest if rest > 1500 else ('Zentrum' if dest == 'Suhl' else dest)
                lines = [[name, round(rest / 1000, 1), arrow(u, p[k + 1], wid_out, dx, dy)]]
                for q, w2 in others[:2]:
                    pl, d2 = lead(u, q, w2)
                    if pl and d2 > 300 and pl != dest and pl not in [l[0] for l in lines]:
                        lines.append([pl, round(d2 / 1000, 1), arrow(u, q, w2, dx, dy)])
                kind = 'weg'
                if len(lines) < 2 and not turned:
                    continue
            back = 18 if RANK.get(cin[0], 9) <= 2 else 12
            sx, sy = x - dx * back + dy * (cin[2] / 2 + 1.8), y - dy * back - dx * (cin[2] / 2 + 1.8)
            if any(math.dist((w['x'], w['y']), (sx, sy)) < 60 for w in wsigns + old_signs):
                continue
            wsigns.append({'t': kind, 'x': round(sx, 1), 'y': round(sy, 1), 'h': round(math.degrees(math.atan2(-dx, -dy)), 1), 'n': dest,
                           'l': lines, 'route': key})
    log('Wegweiser', len(wsigns), [w['l'] for w in wsigns])
    # ---------------- motorway signs (blue): advance signs, exits, the Dreieck, distance boards ----------------
    def far_km(x, y, name):
        lo, la = FAR[name]
        e, n = ST._tr.transform(lo, la)
        fx_, fy_ = ST.u2m(e, n)
        return round(math.dist((x, y), (float(fx_), float(fy_))) * 1.22 / 1000)
    msigns = []
    for key in ('suhl_ab', 'suhl_ab_rueck'):
        p, wl = routes[key]['nodes'], routes[key]['ways']
        cum = [0.0]
        for u, v in zip(p, p[1:]):
            cum.append(cum[-1] + math.dist(M[u], M[v]))
        onmw = [tgw(w).get('highway') == 'motorway' for w in wl]

        def at(s, side=1, off=None):
            """the point s metres along the route, beside the carriageway on the right (side 1) – facing the traffic"""
            k = max(0, min(len(p) - 2, int(np.searchsorted(cum, s)) - 1))
            u, v = p[k], p[k + 1]
            L = max(1e-6, cum[k + 1] - cum[k])
            t = (s - cum[k]) / L
            x = M[u][0] + (M[v][0] - M[u][0]) * t
            y = M[u][1] + (M[v][1] - M[u][1]) * t
            dx, dy = (M[v][0] - M[u][0]) / L, (M[v][1] - M[u][1]) / L
            c = wclass.get(wl[k])
            o = off if off is not None else (c[2] / 2 if c else 5) + 2.2
            if tgw(wl[k]).get('highway') == 'motorway':
                lanes = int(tgw(wl[k]).get('lanes', '2') or 2)
                o = (0.75 + lanes * 3.75 + 2.5) / 2 + 2.5
            return round(x + dy * o * side, 1), round(y - dx * o * side, 1), round(math.degrees(math.atan2(-dx, -dy)), 1)
        for k in range(1, len(p) - 1):
            J = junctions.get(p[k])
            if not J or not onmw[k - 1]:
                continue
            s = cum[k]
            # the way the route takes at J and the links leaving there
            links = [(q, w2) for q, c, L, w2, mw in G.get(p[k], ()) if tgw(w2).get('highway') == 'motorway_link']
            take = wl[k] if k < len(wl) else None
            leaving = take is not None and tgw(take).get('highway') == 'motorway_link'
            lk = take if leaving else (links[0][1] if links else None)
            tg = tgw(lk) if lk else {}
            dst = [d for d in (tg.get('destination') or '').split(';') if d][:3]
            dref = (tg.get('destination:ref') or '').split(';')[0]
            is_drei = 'Dreieck' in J['name'] or 'Kreuz' in J['name'] or len(J['on']) > 1
            # how far back the route has been on this motorway
            k0 = k - 1
            while k0 > 0 and onmw[k0 - 1]:
                k0 -= 1
            room = s - cum[k0]
            for dist_ in (1000, 500):
                if room > dist_ + 150:
                    x, y, hd = at(s - dist_)
                    msigns.append({'t': 'ab_vor', 'x': x, 'y': y, 'h': hd, 'n': J['name'], 'nr': J['ref'], 'd': dist_, 'dst': dst,
                                   'dref': dref, 'drei': is_drei, 'route': key})
            if room > 120:
                x, y, hd = at(s + 40, off=None)
                msigns.append({'t': 'ab_aus', 'x': x, 'y': y, 'h': hd, 'n': J['name'], 'nr': J['ref'], 'dst': dst, 'dref': dref,
                               'drei': is_drei, 'route': key})
        # distance boards: 600 m after each start of a stretch on the motorway (on-ramp merged, or through the Dreieck)
        for k in range(1, len(p) - 1):
            if onmw[k] and not onmw[k - 1]:
                s = cum[k] + 600
                kk = int(np.searchsorted(cum, s))
                if kk >= len(onmw) or not onmw[min(kk, len(onmw) - 1)]:
                    continue
                x, y, hd = at(s)
                ref = tgw(wl[kk]).get('ref', '')
                # towards where the route goes and the motorway's far ends
                end_s = cum[-1]
                lines = [['Suhl' if key == 'suhl_ab' else 'Schleusingen', round((end_s - s) / 1000) if key == 'suhl_ab' else max(1, round((end_s - s) / 1000))]]
                hd_r = math.radians(hd + 180)
                fx_, fy_ = math.sin(hd_r), math.cos(hd_r)
                for nm in ('Erfurt', 'Schweinfurt', 'Coburg', 'Nürnberg', 'Meiningen', 'Würzburg'):
                    lo, la = FAR[nm]
                    e, n = ST._tr.transform(lo, la)
                    tx, ty = [float(v) for v in ST.u2m(e, n)]
                    dx, dy = tx - x, ty - y
                    d = math.hypot(dx, dy)
                    if (dx * fx_ + dy * fy_) / d > 0.35 and nm not in [l[0] for l in lines]:
                        lines.append([nm, far_km(x, y, nm)])
                lines = lines[:3]
                msigns.append({'t': 'ab_dist', 'x': x, 'y': y, 'h': hd, 'n': ref, 'l': lines, 'route': key})
    # thin out: one sign per 80 m
    ms2 = []
    for s in msigns:
        if any(math.dist((s['x'], s['y']), (q['x'], q['y'])) < 80 for q in ms2):
            continue
        ms2.append(s)
    msigns = ms2
    log('Autobahnschilder', len(msigns), [(s['t'], s.get('nr'), s['n'], s.get('dst')) for s in msigns])
    for r in routes.values():
        r.pop('nodes')
        r['ways'] = sorted(set(r['ways']))
    out = {
        'v': 1, 'made': time.strftime('%Y-%m-%d'),
        'note': 'welt/fahrt.js (feat/suhl-fahrt): roads Schleusingen -> Suhl, the A 73 and A 71 (model dm: x east, y north, z = NHN - H0), places, signs, routes',
        'credits': 'Straßen, Orte, Schilder © OpenStreetMap-Mitwirkende (ODbL 1.0); Höhen aus den Welt-Kacheln (© GDI-Th, Copernicus DEM)',
        'kinds': KINDS, 'surf': SURF, 'names': names, 'ways': out_ways, 'lanes': lanes_out, 'places': out_places,
        'signs': signs + wsigns + msigns, 'routes': {k: {'pts': v['pts'], 'm': v['m']} for k, v in routes.items()},
        'park': {}, 'tunnels': tunnels, 'bridges': bridges, 'metric': res, 'heights': {'tiles': dem.n_tile, 'copernicus': dem.n_cop, 'sets': dem.sets},
    }
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    json.dump(out, open(a.out, 'w'), ensure_ascii=False, separators=(',', ':'))
    log('fertig:', a.out, round(os.path.getsize(a.out) / 1e3), 'kB')
    # ---------------- the research ----------------
    def wayinfo(wid):
        t = tgw(wid)
        refs = ways[wid][0]
        L = poly_len([M[r] for r in refs if r in M])
        return {'id': wid, 'highway': t.get('highway'), 'ref': t.get('ref', ''), 'name': t.get('name', ''), 'm': round(L),
                'lanes': t.get('lanes', ''), 'maxspeed': t.get('maxspeed', ''), 'bridge': t.get('bridge', ''), 'tunnel': t.get('tunnel', ''),
                'bridge:name': t.get('bridge:name', ''), 'tunnel:name': t.get('tunnel:name', ''), 'destination': t.get('destination', ''),
                'destination:ref': t.get('destination:ref', '')}
    rs = {'made': time.strftime('%Y-%m-%d %H:%M UTC', time.gmtime()), 'source': 'OpenStreetMap (ODbL 1.0)', 'routes': {}}
    for key, r in rinfo.items():
        wl = routes[key]['ways']
        rs['routes'][key] = {'m': r['m'], 'legs': r['legs'], 'junctions': r['junctions'],
                             'bridges': [wayinfo(w) for w in wl if tgw(w).get('bridge') not in (None, 'no')],
                             'tunnels': [wayinfo(w) for w in wl if tgw(w).get('tunnel') not in (None, 'no')],
                             'maxspeed': sorted({tgw(w).get('maxspeed', '') for w in wl if tgw(w).get('highway') == 'motorway'})}
    rs['junctions'] = sorted(junctions.values(), key=lambda J: -J['y'])
    rs['tunnels'] = [{k: v for k, v in t.items() if k != 'i'} for t in tunnels]
    rs['bridges_motorway'] = [{k: v for k, v in b.items() if k != 'i'} for b in bridges if any(ways[b['way']][1].get('highway', '').startswith('motorway') for _ in [0])]
    rs['city_limits'] = [{'name': n, 'x': round(p[0]), 'y': round(p[1])} for n, p in osm_cl]
    rs['links'] = [wayinfo(wid) for wid, (refs, t) in ways.items() if t.get('highway') == 'motorway_link' and (t.get('destination') or t.get('destination:ref'))]
    rs['metric'] = res
    json.dump(rs, open(a.research, 'w'), ensure_ascii=False, indent=1)
    log('Recherche:', a.research, 'in', round(time.time() - t0), 's')
    print(json.dumps({k: {'m': v['m'], 'legs': [(l['road'], l['m']) for l in v['legs']], 'junctions': [(j['ref'], j['name']) for j in v['junctions']]}
                      for k, v in rs['routes'].items()}, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
