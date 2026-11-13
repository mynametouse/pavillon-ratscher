#!/usr/bin/env python3
"""suhl-strassen: what stands beside Suhl's roads – the furniture tiles `m` and one file in the format of strassen/ausstattung.json.

The roads chat's tool (viz3/extra/strassen/daten.py on feat/strassen) is used unchanged: its source is loaded as a module (it is not on
this branch and is never copied here), its classes get Suhl's roads (the file lauf.py wrote in the format of the drive data), Suhl's
built-up areas and Suhl's OpenStreetMap; then its own functions run: guard_rails, delineators, signs, lamps, power.
Added here is what a town has and that tool does not know: signals with a mast per approach, every pedestrian crossing with its kind,
bus stops with their names, street-name signs at the corners.

  git show origin/feat/strassen:viz3/extra/strassen/daten.py > /tmp/daten.py
  python3 -I tools/suhl/strassen/moebel.py --daten /tmp/daten.py --out tools/suhl/out/strassen/probe [--opl suhl.opl.gz]

Output: <out>/suhl/m/v0/10/<x>/<y>.json and index.json (tile-local dm, no heights: everything stands on the ground of the moment),
<out>/strassen/<name>-ausstattung.json (model dm, exactly the lists of ausstattung.json plus ampeln, querungen, halte, namen).
© OpenStreetMap contributors (ODbL 1.0); stop names checked against the timetable of DELFI e.V. (CC BY 4.0) where stage 1 kept them.
"""
import argparse, collections, glob, json, math, os, sys, time, types

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
import numpy as np
import sslib as S
import suhllib as L
import netz as NZ

VERSION = 0
ATTR = '© OpenStreetMap-Mitwirkende (ODbL 1.0); Haltestellennamen des Fahrplans: DELFI e.V. über gtfs.de (CC BY 4.0)'
CAR = ('motorway', 'main', 'county', 'street', 'lane', 'service')


def load_daten(path):
    """the roads chat's tool as a module, as if it lay at viz3/extra/strassen/daten.py of this checkout (it finds strecke.py and the
    manifest from there); nothing is written into that folder"""
    code = open(path, encoding='utf-8').read()
    m = types.ModuleType('strassen_daten')
    m.__file__ = os.path.join(S.REPO, 'viz3', 'extra', 'strassen', 'daten.py')
    exec(compile(code, m.__file__, 'exec'), m.__dict__)
    return m


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--daten', required=True)
    ap.add_argument('--out', default=os.path.join(S.OUT, 'probe'))
    ap.add_argument('--opl')
    ap.add_argument('--api-dir')
    a = ap.parse_args()
    t0 = time.time()
    fz = sorted(glob.glob(os.path.join(a.out, 'fahrt', '*.json')))
    fz = [p for p in fz if not os.path.basename(p).startswith('routen')]
    if not fz:
        raise SystemExit('no drive-format file under ' + a.out + '/fahrt – run lauf.py first')
    fz.sort(key=lambda q: ('anfahrt' in os.path.basename(q), q))
    F = json.load(open(fz[0], encoding='utf-8'))
    name = os.path.basename(fz[0])[:-5]
    for extra in fz[1:]:                 # the approach roads: the same network for the tool
        X = json.load(open(extra, encoding='utf-8'))
        off, hoff = len(F['names']), len(F.get('hws', []))
        F['names'] = F['names'] + X['names']
        hm = {i: (F['hws'].index(h_) if h_ in F['hws'] else None) for i, h_ in enumerate(X.get('hws', []))}
        for i, h_ in enumerate(X.get('hws', [])):
            if hm[i] is None:
                F['hws'].append(h_)
                hm[i] = len(F['hws']) - 1
        F['ways'] = F['ways'] + [w[:4] + [w[4] + off, w[5] + off, w[6]] for w in X['ways']]
        F['hw'] = F['hw'] + [hm[i] for i in X['hw']]
    idx = json.load(open(os.path.join(a.out, L.index_path('s', 0)), encoding='utf-8'))
    T = S.index_tiles(idx)
    Tset = set(T)
    tb = [L.tbounds(S.LEVEL, x, y) for x, y in T]
    core = (min(b[0] for b in tb), min(b[1] for b in tb), max(b[2] for b in tb), max(b[3] for b in tb))
    box = (core[0] - 300, core[1] - 300, core[2] + 300, core[3] + 300)
    L.guard(box=box, what='suhl-strassen moebel')
    lo0, la0 = S.u2ll(box[0], box[1])
    lo1, la1 = S.u2ll(box[2], box[3])
    o = S.load_osm(opl=a.opl, api_dir=a.api_dir, box=(min(lo0, lo1) - 0.002, min(la0, la1) - 0.002, max(lo0, lo1) + 0.002, max(la0, la1) + 0.002))
    D = load_daten(a.daten)
    KINDS = F['kinds']
    # ---------------- Suhl's roads as the tool's Net (pedestrian and living streets as streets: lamps follow them) ----------------
    N = D.Net()
    hws = F.get('hws', [])
    for n, (k, sf, w10, fl, ni, ri, q) in enumerate(F['ways']):
        P = np.asarray(q, float).reshape(-1, 3)[:, :2] / 10.0
        kk = 3 if hws and hws[F['hw'][n]] in ('pedestrian', 'living_street') else k
        N.add(kk, sf, w10 / 20.0, fl, P, 'f', F['names'][ri] or F['names'][ni])
    # ---------------- places ----------------
    # the places come with the drive file (lauf.py: the Kernstadt as a town, the villages as villages)
    places = F['places']
    FF = F
    PL = D.Places(FF)
    S.log('places:', [(p['n'], p['k'], len(p['a'])) for p in places])
    # ---------------- OpenStreetMap as the tool reads it (its fetch replaced by the data at hand) ----------------
    e0, n0, e1, n1 = box
    keep_n = {i for i, (E, Nn) in o.nodes.items() if e0 < E < e1 and n0 < Nn < n1}
    nodes = {i: (o.nll[i][0], o.nll[i][1], o.ntags.get(i, {})) for i in keep_n}
    ways = {}
    for wid, (nd, t) in o.ways.items():
        nn = [r for r in nd if r in keep_n]
        if len(nn) >= 2 and t:
            ways[wid] = (nn, t)
    D.SK.fetch_osm = lambda raw: (nodes, ways)
    O = D.Osm(None)
    S.log('the tool sees', len(N.ways), 'roads of the app,', len(O.roads), 'OSM roads,', len(nodes), 'nodes')
    rails = D.guard_rails(N, O)
    posts = D.delineators(N, PL, rails)
    Sg, lines = D.signs(N, PL, O, FF)
    Lm, n_osm = D.lamps(N, PL, O)
    masts, plines = D.power(O)
    S.log('tool: delineators', len(posts), '· guard rails', len(rails), '· signs', len(Sg), dict(collections.Counter(s[0].split('-')[0] for s in Sg)),
          '· lines', dict(collections.Counter(l[0] for l in lines)), '· lamps', len(Lm), '(OSM', n_osm, ') · masts', len(masts))
    # ---------------- what the tool does not know ----------------
    xy = O.xy

    def arms(n):
        """the directions (unit vectors, model) in which roads leave node n: [(ux, uy, way id, towards-node allowed (traffic may arrive))]"""
        out = []
        for wid, j in O.use.get(n, ()):
            k, t, nd = O.roads[wid]
            ow = t.get('oneway') in ('yes', '1', 'true') or t.get('junction') == 'roundabout'
            rev = t.get('oneway') == '-1'
            for step, arrive in ((-1, not rev), (1, not ow or rev)):
                jj = j + step
                if 0 <= jj < len(nd):
                    d = np.array(xy[nd[jj]]) - np.array(xy[n])
                    l = float(np.hypot(*d))
                    if l > 0.05:
                        # step -1: the way comes from nd[j-1] to n along its direction: traffic arrives unless reversed one-way
                        out.append((d[0] / l, d[1] / l, wid, arrive if step == -1 else (not ow or rev)))
        return out

    # signals: a mast to the right of every approach, facing the traffic
    ampeln = []
    for n, t in O.tags.items():
        hv, cr = t.get('highway'), t.get('crossing')
        if hv != 'traffic_signals' and not (hv == 'crossing' and cr == 'traffic_signals'):
            continue
        if n not in xy:
            continue
        x, y = xy[n]
        kind = 0 if hv == 'traffic_signals' else 1
        ms = []
        for ux, uy, wid, arrive in arms(n):
            if not arrive:
                continue
            for back in (3.0, 6.0, 10.0):
                b = D.beside(N, x + ux * back, y + uy * back, -ux, -uy, 0.9)
                if b is not None:
                    ms.append((b[0], b[1], D.hdg(b[2], b[3])))
                    break
        ampeln.append((kind, x, y, len(arms(n)), n, ms))
    # pedestrian crossings: every one, with its kind (the tool draws only zebra crossings)
    querungen = []
    for n, t in O.tags.items():
        if t.get('highway') != 'crossing' or n not in xy:
            continue
        cr = t.get('crossing', '')
        mk = t.get('crossing:markings', '')
        ty = 3 if cr == 'traffic_signals' or t.get('crossing:signals') == 'yes' else 2 if 'zebra' in (cr, mk, t.get('crossing_ref')) \
            else 1 if cr in ('marked', 'uncontrolled') or mk not in ('', 'no') else 0
        x, y = xy[n]
        r = N.near(x, y, 4.0, hard=True)
        az = D.hdg(r['ux'], r['uy']) if r else 0.0
        hw = r['w']['hw'] if r else 2.5
        querungen.append((ty, x, y, az, hw, 1 if t.get('tactile_paving') == 'yes' else 0, 1 if t.get('crossing:island') == 'yes' else 0, n))
    # bus stops: the sign beside the road, the name; `fp`: the same name stands in the timetable (stage 1 kept the names of the Zentrum)
    fp = set()
    try:
        oe = json.load(open(os.path.join(S.REPO, 'tools', 'suhl', 'out', 'bestand', 'oepnv.json'), encoding='utf-8'))
        for nm in oe['haltestellen'].get('im_zentrum_namen', []) + [m[0] for m in oe['haltestellen'].get('meiste_halte', [])]:
            fp.add(nm.replace('Suhl, ', '').strip().lower())
    except Exception as e:
        S.log('oepnv.json not read:', repr(e)[:100])
    halte = []
    for n, t in O.tags.items():
        if t.get('highway') != 'bus_stop' or n not in xy:
            continue
        x, y = xy[n]
        r = N.near(x, y, 12.0, kinds=(1, 2, 3, 4, 5))
        az = 0.0
        if r is not None:
            sd = 1 if r['lat'] < 0 else -1          # the side of the road the stop stands on: traffic passes it on its right
            az = D.hdg(r['ux'] * sd, r['uy'] * sd)
        nm = t.get('name', '')
        halte.append((x, y, az, nm, 1 if t.get('shelter') == 'yes' else 0, 1 if t.get('bench') == 'yes' else 0,
                      1 if nm.replace('Suhl, ', '').strip().lower() in fp else 0, t.get('ref:IFOPT', ''), n))
    # street-name signs: at a corner where two streets with different names meet, one post with both plates
    namen = []
    seen = []
    for n, uses in O.use.items():
        byname = collections.defaultdict(list)
        for ux, uy, wid, _ in arms(n):
            k, t, nd = O.roads[wid]
            if k <= 4 and t.get('name'):
                byname[t['name']].append((ux, uy, wid))
        if len(byname) < 2:
            continue
        x, y = xy[n]
        if PL.at(x, y) == 0:
            continue
        nm = sorted(byname, key=lambda q: -len(byname[q]))[:2]
        (ax, ay, wa), (bx, by, wb) = byname[nm[0]][0], byname[nm[1]][0]
        if abs(ax * bx + ay * by) > 0.94:
            continue      # one street changing its name on a straight
        ra = N.near(x + ax * 6, y + ay * 6, 4.0)
        rb = N.near(x + bx * 6, y + by * 6, 4.0)
        ha, hb = (ra['w']['hw'] if ra else 2.5), (rb['w']['hw'] if rb else 2.5)
        px, py = x + ax * (hb + 1.1) + bx * (ha + 1.1), y + ay * (hb + 1.1) + by * (ha + 1.1)
        q = N.near(px, py, 0.4)
        if q is not None and q['e'] > -0.4:
            continue
        if any(math.hypot(px - sx, py - sy) < 14 for sx, sy in seen):
            continue
        seen.append((px, py))
        namen.append((px, py, nm[0], D.hdg(ax, ay) % 180, nm[1], D.hdg(bx, by) % 180))
    S.log('added: signals', len(ampeln), '(masts', sum(len(m[5]) for m in ampeln), ') · crossings', len(querungen), dict(collections.Counter(q[0] for q in querungen)),
          '· bus stops', len(halte), '(named', sum(1 for h_ in halte if h_[3]), ') · street-name signs', len(namen))
    # ---------------- into tiles (only the tiles of the run) ----------------
    def tile_of(x, y):
        E, Nn = S.m2u(x, y)
        return tuple(L.tile_at(S.LEVEL, float(E), float(Nn)))
    tiles = {t: collections.defaultdict(list) for t in T}
    # absolute model dm, as strassen/ausstattung.json: a tile can go into STRDAT.add of feat/strassen as it is
    orig = {t: (0, 0) for t in T}
    cnt = collections.Counter()
    dm = lambda v: int(round(v * 10))

    def put(key, x, y, rec):
        t = tile_of(x, y)
        if t not in Tset:
            return None
        cnt[key] += 1
        tiles[t][key].append(rec(orig[t]))
        return t
    keep = collections.defaultdict(list)       # the same things in model dm for the single file
    for p in posts:
        if put('pfosten', p[0], p[1], lambda o_: [dm(p[0]) - o_[0], dm(p[1]) - o_[1], int(round(p[2]))]):
            keep['pfosten'] += [dm(p[0]), dm(p[1]), int(round(p[2]))]
    for tw, r in rails:
        mx, my = r[len(r) // 2]
        if put('planken', mx, my, lambda o_: [tw] + [v for q in r for v in (dm(q[0]) - o_[0], dm(q[1]) - o_[1])]):
            keep['planken'].append([tw] + [dm(v) for q in r for v in q])
    for s in Sg:
        if put('schilder', s[1], s[2], lambda o_: [s[0], dm(s[1]) - o_[0], dm(s[2]) - o_[1], int(round(s[3]))] + ([s[4]] if s[4] else [])):
            keep['schilder'].append([s[0], dm(s[1]), dm(s[2]), int(round(s[3]))] + ([s[4]] if s[4] else []))
    for l in Lm:
        if put('lampen', l[0], l[1], lambda o_: [dm(l[0]) - o_[0], dm(l[1]) - o_[1], int(round(l[2])), l[3]]):
            keep['lampen'] += [dm(l[0]), dm(l[1]), int(round(l[2])), l[3]]
    for l in lines:
        if put('linien', l[1], l[2], lambda o_: [l[0], dm(l[1]) - o_[0], dm(l[2]) - o_[1], int(round(l[3])), dm(l[4])]):
            keep['linien'].append([l[0], dm(l[1]), dm(l[2]), int(round(l[3])), dm(l[4])])
    # masts with the masts their lines run on to (so a tile needs no other tile to hang the wires)
    to = collections.defaultdict(list)
    for tline, kv, *ln in [(p[0], p[1], *p[2]) for p in plines]:
        for a_, b_ in zip(ln, ln[1:]):
            to[a_].append(b_)
    mi, mk = {}, []
    for i, m in enumerate(masts):
        if put('masten', m[0], m[1], lambda o_: [dm(m[0]) - o_[0], dm(m[1]) - o_[1], m[2], int(round(m[3])),
                                                [v for b_ in to.get(i, ()) for v in (dm(masts[b_][0]) - o_[0], dm(masts[b_][1]) - o_[1])]]):
            mi[i] = len(mk)
            mk.append(m)
    keep['masten'] = [v for m in mk for v in (dm(m[0]), dm(m[1]), m[2], int(round(m[3])))]
    keep['leitungen'] = [[tl, kv] + [mi[i] for i in ln if i in mi] for tl, kv, ln in plines if sum(1 for i in ln if i in mi) >= 2]
    for k_, x, y, na, n, ms in ampeln:
        if put('ampeln', x, y, lambda o_: [k_, dm(x) - o_[0], dm(y) - o_[1], na, n, [v for m in ms for v in (dm(m[0]) - o_[0], dm(m[1]) - o_[1], int(round(m[2])))]]):
            keep['ampeln'].append([k_, dm(x), dm(y), na, n, [v for m in ms for v in (dm(m[0]), dm(m[1]), int(round(m[2])))]])
    for ty, x, y, az, hw, tac, isl, n in querungen:
        if put('querungen', x, y, lambda o_: [ty, dm(x) - o_[0], dm(y) - o_[1], int(round(az)), dm(hw), tac, isl, n]):
            keep['querungen'].append([ty, dm(x), dm(y), int(round(az)), dm(hw), tac, isl, n])
    for x, y, az, nm, sh, be, fpl, ifopt, n in halte:
        if put('halte', x, y, lambda o_: [dm(x) - o_[0], dm(y) - o_[1], int(round(az)), nm, sh, be, fpl, ifopt, n]):
            keep['halte'].append([dm(x), dm(y), int(round(az)), nm, sh, be, fpl, ifopt, n])
    for px, py, n1, a1, n2, a2 in namen:
        if put('namen', px, py, lambda o_: [dm(px) - o_[0], dm(py) - o_[1], n1, int(round(a1)), n2, int(round(a2))]):
            keep['namen'].append([dm(px), dm(py), n1, int(round(a1)), n2, int(round(a2))])
    made = S.now()
    fields = {
        'pfosten': 'flat: x, y, az', 'planken': '[side, x, y, x, y, …]', 'schilder': '[code, x, y, az(, text)]', 'lampen': 'flat: x, y, az, kind (0 at a road, 1 free-standing)',
        'masten': '[x, y, type (1 Gittermast), az, [x, y, … of the next masts]]', 'linien': '[halt|warte|zebra, x, y, az, half width]',
        'ampeln': '[kind (0 Fahrzeuge, 1 Fußgänger), x, y, arms, osm node, [mast x, y, az, …]]',
        'querungen': '[type (0 ohne Markierung, 1 markiert, 2 Zebrastreifen, 3 Ampel), x, y, az of the road, half width, tactile, island, osm node]',
        'halte': '[x, y, az, name, shelter, bench, name in the timetable (1), IFOPT, osm node]',
        'namen': '[x, y, name 1, az 1, name 2, az 2]',
        'note': 'x, y: absolute model coordinates in whole decimetres, as in strassen/ausstattung.json; az in degrees clockwise from north; no heights – things stand on the ground of the moment',
    }
    root = os.path.join(a.out, L.product_dir('m', VERSION))
    nb = 0
    for t in T:
        fr = L.tile_frame(S.LEVEL, *t)
        d = tiles[t]
        # x_strdat: the lists of strassen/ausstattung.json (absolute model dm) – what STRDAT.add of feat/strassen takes;
        # items: the same things in the common layout of the contract (docs/features/suhl-daten.md: tile-local model metres)
        sd = {'unit': 'dm', 'pfosten': [v for r in d.get('pfosten', []) for v in r], 'lampen': [v for r in d.get('lampen', []) for v in r]}
        for k_ in ('planken', 'schilder', 'linien', 'masten', 'ampeln', 'querungen', 'halte', 'namen'):
            sd[k_] = d.get(k_, [])
        ox, oy = fr.o
        lx = lambda v: round(v / 10 - ox, 1)
        ly = lambda v: round(v / 10 - oy, 1)
        items = []
        for r in d.get('pfosten', []):
            items.append({'t': 'leitpfosten', 'x': lx(r[0]), 'y': ly(r[1]), 'az': r[2] % 360})
        for r in d.get('planken', []):
            items.append({'t': 'leitplanke', 'x': lx(r[1]), 'y': ly(r[2]), 'k': r[0], 'pts': [f(v) for k in range(1, len(r), 2) for f, v in ((lx, r[k]), (ly, r[k + 1]))]})
        for r in d.get('schilder', []):
            it = {'t': 'schild', 'x': lx(r[1]), 'y': ly(r[2]), 'az': r[3] % 360, 'k': r[0]}
            if len(r) > 4:
                it['n'] = r[4]
            items.append(it)
        for r in d.get('lampen', []):
            items.append({'t': 'laterne', 'x': lx(r[0]), 'y': ly(r[1]), 'az': r[2] % 360, 'k': r[3]})
        for r in d.get('linien', []):
            items.append({'t': 'sonst', 'k': 'linie ' + r[0], 'x': lx(r[1]), 'y': ly(r[2]), 'az': r[3] % 360, 'w': round(r[4] / 5, 1)})
        for r in d.get('masten', []):
            items.append({'t': 'mast', 'x': lx(r[0]), 'y': ly(r[1]), 'az': r[3] % 360, 'k': r[2]})
        for r in d.get('ampeln', []):
            ms = r[5]
            if not ms:
                items.append({'t': 'ampel', 'x': lx(r[1]), 'y': ly(r[2]), 'k': 'knoten ' + ('fuss' if r[0] else 'kfz'), 'osm': 'node/%d' % r[4]})
            for k in range(0, len(ms), 3):
                items.append({'t': 'ampel', 'x': lx(ms[k]), 'y': ly(ms[k + 1]), 'az': ms[k + 2] % 360, 'k': 'fuss' if r[0] else 'kfz', 'osm': 'node/%d' % r[4]})
        for r in d.get('querungen', []):
            items.append({'t': 'ueberweg', 'x': lx(r[1]), 'y': ly(r[2]), 'az': r[3] % 360, 'w': round(r[4] / 5, 1),
                          'k': ['ohne Markierung', 'markiert', 'zebra', 'ampel'][r[0]], 'osm': 'node/%d' % r[7]})
        for r in d.get('halte', []):
            items.append({'t': 'haltestelle', 'x': lx(r[0]), 'y': ly(r[1]), 'az': r[2] % 360, 'n': r[3], 'osm': 'node/%d' % r[8]})
            if r[4]:
                items.append({'t': 'wartehalle', 'x': lx(r[0]), 'y': ly(r[1]), 'az': r[2] % 360})
        for r in d.get('namen', []):
            items.append({'t': 'strassenschild', 'x': lx(r[0]), 'y': ly(r[1]), 'az': r[3] % 360, 'n': r[2]})
            items.append({'t': 'strassenschild', 'x': lx(r[0]), 'y': ly(r[1]), 'az': r[5] % 360, 'n': r[4]})
        doc = {'v': L.SCHEMA, 'p': 'm', 'key': fr.key, 'o': fr.o_json(), 'made': made, 'items': items, 'x_strdat': sd}
        nb += S.write_json(os.path.join(a.out, L.tile_path('m', VERSION, S.LEVEL, *t)), doc)
    numbers = {'made': made, 'tiles': len(T), 'counts': dict(cnt), 'lamps_osm_in_box': n_osm,
               'signs_by_code': dict(collections.Counter(s[0].split('-')[0] for s in Sg)),
               'crossings_by_type': {['ohne Markierung', 'markiert', 'Zebrastreifen', 'Ampel'][k]: v for k, v in sorted(collections.Counter(q[0] for q in keep['querungen']).items())},
               'signals': {'Fahrzeuge': sum(1 for q in keep['ampeln'] if q[0] == 0), 'Fußgänger': sum(1 for q in keep['ampeln'] if q[0] == 1),
                           'masts': sum(len(q[5]) // 3 for q in keep['ampeln'])},
               'bus_stops_named': sum(1 for q in keep['halte'] if q[3]), 'bus_stops_in_timetable_names': sum(1 for q in keep['halte'] if q[6]),
               'guard_rail_m': round(sum(sum(math.dist(p, q) for p, q in zip(r, r[1:])) for tw, r in rails) * S.MSCALE),
               'places': [(p['n'], p['k']) for p in places], 'bytes_tiles': nb,
               'tool': 'viz3/extra/strassen/daten.py of feat/strassen, unchanged: guard_rails, delineators, signs, lamps, power'}
    index = {'v': L.SCHEMA, 'p': 'm', 'version': VERSION, 'area': idx.get('area', 'stadt'), 'title': 'Möbel der Straße Suhl', 'made': made, 'level': S.LEVEL,
             'unit': 'items: tile-local model metres (contract); x_strdat: absolute model coordinates in whole decimetres (as strassen/ausstattung.json)',
             'tiles': {str(S.LEVEL): L.tileset_encode(T)}, 'attribution': ATTR, 'sources': {'osm': o.source, 'osm_stamp': o.stamp},
             'fields': fields, 'numbers': numbers}
    S.write_json(os.path.join(a.out, L.index_path('m', VERSION)), index)
    S.common_index(os.path.join(a.out, L.product_dir('m', VERSION)), idx.get('area', 'stadt'), ['osm', 'gtfs', 'regel'],
                   'Möbel der Straße: Werkzeug des Straßen-Chats (viz3/extra/strassen/daten.py) und Ampeln, Querungen, Haltestellen, Straßennamen aus OSM')
    one = {'v': 1, 'made': made[:10],
           'note': 'Suhl: built-up areas and road furniture in the format of strassen/ausstattung.json (feat/strassen), model metres × 10; '
                   'headings in degrees clockwise from north; ampeln, querungen, halte, namen are Suhl\'s additions',
           'credits': ATTR, 'orte': PL.out}
    for k_ in ('pfosten', 'planken', 'schilder', 'lampen', 'masten', 'leitungen', 'linien', 'ampeln', 'querungen', 'halte', 'namen'):
        one[k_] = keep.get(k_, [])
    one['fields'] = fields
    nb1 = S.write_json(os.path.join(a.out, 'strassen', name + '-ausstattung.json'), one)
    numbers['bytes_one_file'] = nb1
    S.write_json(os.path.join(a.out, 'moebel.json'), numbers, indent=1, separators=(',', ': '))
    S.log('fertig: m tiles', len(T), round(nb / 1e3), 'kB · one file', round(nb1 / 1e3), 'kB ·', dict(cnt), 'in', round(time.time() - t0), 's')


if __name__ == '__main__':
    main()
