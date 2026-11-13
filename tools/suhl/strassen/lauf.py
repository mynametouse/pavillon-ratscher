#!/usr/bin/env python3
"""suhl-strassen: one run – Suhl's roads and ways for a set of level-10 tiles, as tiles of the product `s` and as one file in the
format of the drive data (fahrt/strassen.json: viz3/extra/fahrt/strecke.py writes it, viz3/src/welt/fahrt.js and the road map of
feat/strassen read it).

  python3 -I tools/suhl/strassen/lauf.py --gebiet probe                      the sample set: the 11 tiles touching the Zentrum
  python3 -I tools/suhl/strassen/lauf.py --gebiet stadt --opl suhl.opl.gz    the whole municipality (GitHub Actions)

  --tiles <dir>   ground tiles of suhl-boden (the t/ folder); without it Copernicus GLO-30 with the forest lowered
  --out <dir>     where suhl/s/v<N>/… and fahrt/<name>.json go (default tools/suhl/out/strassen/<gebiet>)

Output (docs/features/suhl-strassen.md, section 3):
  <out>/suhl/s/v0/10/<x>/<y>.json   per tile: the pieces of the ways inside it (cut at the tile edges) and the areas touching it
  <out>/suhl/s/v0/index.json        which tiles exist, fields, flags, sources, the numbers of the run
  <out>/fahrt/<name>.json           all of it uncut in the format of fahrt/strassen.json (model dm) – also the one source of the road
                                    heights for suhl-boden (tools/suhl/strassen/profil.py reads it)
  <out>/zahlen.json                 kilometres and counts per class, waves per km before and after, junctions, bridges
© OpenStreetMap contributors (ODbL 1.0).
"""
import argparse, collections, gzip, json, math, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
import numpy as np
import sslib as S
import suhllib as L
import netz as NZ
import hoehen as HO
import linien as LN

WR, ST = NZ.WR, NZ.ST
KINDS, SURF = NZ.KINDS, NZ.SURF
VERSION = 0
ATTR = ('Straßen, Wege, Plätze © OpenStreetMap-Mitwirkende (ODbL 1.0); Höhen: Copernicus DEM GLO-30 (© DLR e.V. 2010-2014 und © Airbus '
        'Defence and Space GmbH 2014-2018, bereitgestellt unter COPERNICUS durch die Europäische Union und ESA), Geländekacheln von '
        'suhl-boden, wo vorhanden (© GDI-Th, CC BY 4.0)')
WAY_FIELDS = ['kind', 'surf', 'width_dm', 'fl', 'name', 'ref', 'xyz_dm', 'osm_way', 's0_dm', 'lanes', 'hw', 'maxspeed', 'style']
RAIL_FIELDS = ['type (0 in Betrieb, 1 stillgelegt)', 'fl', 'name', 'xyz_dm', 'osm_way', 's0_dm', 'side (1 Nebengleis)']
RAILPT_FIELDS = ['type (0 Bahnhof, 1 Haltepunkt, 2 Bahnübergang, 3 Fußgänger-Übergang)', 'x_dm', 'y_dm', 'z_dm', 'name', 'osm_node']
WATER_FIELDS = ['type', 'fl (2 verrohrt oder überdeckt)', 'width_dm', 'name', 'xyz_dm', 'osm_way', 's0_dm']
WAREA_FIELDS = ['kind', 'name', 'osm', 'home', 'z_dm', 'xy_dm', 'holes']
AREA_FIELDS = {'k': 'type', 'surf': 'surface index', 'fl': 'flags', 'n': 'name index', 'osm': 'OSM id', 'home': '1 in the tile of its reference point', 'q': '1 plane through solved way nodes, 0 from the terrain',
               'z': 'mean height dm', 'f': 'outline x, y dm', 'fz': 'height of every vertex dm', 'h': 'holes x, y', 'hz': 'their heights',
               'x_areas': '[surface, flags, name, [x, y, z, …], [holes]] – the layout the road map takes'}


def tile_set(gebiet):
    areas, _ = S.gebiete()
    if gebiet == 'probe':
        return [(x, y) for _, x, y in L.probe_tiles()], areas['zentrum']
    return [tuple(t) for t in L.area_tiles(gebiet, S.LEVEL)], areas[gebiet]


def model_ring(coords, z=None, o=(0.0, 0.0)):
    """UTM ring -> flat ints in dm (model, relative to o), with z when given"""
    E, N = np.array(coords)[:, 0], np.array(coords)[:, 1]
    x, y = S.u2m(E, N)
    q = []
    for k in range(len(x)):
        q += [int(round(x[k] * 10)) - int(round(o[0] * 10)), int(round(y[k] * 10)) - int(round(o[1] * 10))]
        if z is not None:
            q.append(int(round((z[k] - S.H0) * 10)))
    return q


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gebiet', default='probe', choices=['probe', 'zentrum', 'kernstadt', 'stadt'])
    ap.add_argument('--opl')
    ap.add_argument('--api-dir')
    ap.add_argument('--tiles')
    ap.add_argument('--tiles-from', default='')   # where the ground tiles came from (branch and commit, or run and artifact): written into the files
    ap.add_argument('--raw', default=S.RAW)
    ap.add_argument('--out')
    ap.add_argument('--name')
    ap.add_argument('--margin', type=float, default=300.0)
    ap.add_argument('--no-trees', action='store_true')
    ap.add_argument('--grob', type=float, default=0.0)   # 0: by the source of the heights
    ap.add_argument('--korridor')                        # routen-suhl.json of routen.py: the roads for cars along the routes outside the area
    ap.add_argument('--alt', default=os.path.join(S.REPO, 'viz3', 'extra', 'fahrt', 'dist', 'fahrt', 'strassen.json'))
    a = ap.parse_args()
    t0 = time.time()
    out = a.out or os.path.join(S.OUT, a.gebiet)
    name = a.name or {'probe': 'suhl-zentrum', 'zentrum': 'suhl-zentrum'}.get(a.gebiet, 'suhl')
    T, poly = tile_set(a.gebiet)
    Tset = set(T)
    # ---------------- the corridor: tiles within 300 m of the routes garden - Suhl that are not tiles of the area ----------------
    Kset, routes_doc = set(), None
    if a.korridor and os.path.exists(a.korridor):
        routes_doc = json.load(open(a.korridor, encoding='utf-8'))
        for key, r in routes_doc['routes'].items():
            P = np.array(r['pts'], float).reshape(-1, 2) / 10
            seg = np.hypot(*np.diff(P, axis=0).T)
            cum = np.concatenate([[0], np.cumsum(seg)])
            sv = np.arange(0, cum[-1], 40.0)
            x, y = np.interp(sv, cum, P[:, 0]), np.interp(sv, cum, P[:, 1])
            for dx, dy in ((0, 0), (300, 0), (-300, 0), (0, 300), (0, -300), (212, 212), (-212, 212), (212, -212), (-212, -212)):
                E, N = S.m2u(x + dx, y + dy)
                for e_, n_ in zip(E, N):
                    k = tuple(L.tile_at(S.LEVEL, float(e_), float(n_)))
                    if k not in Tset:
                        Kset.add(k)
        S.log('corridor:', len(Kset), 'tiles along', len(routes_doc['routes']), 'routes outside the area')
        T = T + sorted(Kset)
        Tset = set(T)
    tb = [L.tbounds(S.LEVEL, x, y) for x, y in T]
    core = (min(b[0] for b in tb), min(b[1] for b in tb), max(b[2] for b in tb), max(b[3] for b in tb))
    box = (core[0] - a.margin, core[1] - a.margin, core[2] + a.margin, core[3] + a.margin)
    L.guard(box=box, what='suhl-strassen ' + a.gebiet)
    lo0, la0 = S.u2ll(box[0], box[1])
    lo1, la1 = S.u2ll(box[2], box[3])
    o = S.load_osm(opl=a.opl, api_dir=a.api_dir, box=(min(lo0, lo1) - 0.002, min(la0, la1) - 0.002, max(lo0, lo1) + 0.002, max(la0, la1) + 0.002))
    # the tiles of the run and their neighbours (400 m of context for the profiles at the edge)
    Tsel = {(x + i, y + j) for x, y in T for i in (-1, 0, 1) for j in (-1, 0, 1)}
    ways = NZ.select(o, box, tiles=Tsel)
    pin_old = None
    if Kset:
        # in the corridor only what a car takes, as the drive data of the region (viz3/extra/fahrt/strecke.py): no tracks and paths, no
        # private ways and driveways; what fahrt/strassen.json already holds stays there, what touches it is held at its profile
        Ksel = {(x + i, y + j) for x, y in Kset for i in (-1, 0, 1) for j in (-1, 0, 1)} - {t for t in Tset if t not in Kset}
        sz = S.ROOT / (1 << S.LEVEL)
        old = None
        if os.path.exists(a.alt):
            oj = json.load(open(a.alt, encoding='utf-8'))
            from scipy.spatial import cKDTree
            A_, B_, K_ = [], [], []
            for k, sf, w10, fl, ni, ri, q in oj['ways']:
                if fl & 3:
                    continue
                P = np.array(q, float).reshape(-1, 3) / 10
                for p0, p1 in zip(P[:-1], P[1:]):
                    A_.append(p0)
                    B_.append(p1)
                    K_.append(k)
            A_, B_, K_ = np.array(A_), np.array(B_), np.array(K_)
            okd = cKDTree((A_[:, :2] + B_[:, :2]) / 2)

            def old_z(x, y, kind_i, tol=1.6):
                best = None
                for i in okd.query_ball_point((x, y), 14):
                    if K_[i] != kind_i:
                        continue
                    e = B_[i, :2] - A_[i, :2]
                    t = float(np.clip(((x - A_[i, 0]) * e[0] + (y - A_[i, 1]) * e[1]) / max(float(e @ e), 1e-9), 0, 1))
                    d = math.hypot(A_[i, 0] + e[0] * t - x, A_[i, 1] + e[1] * t - y)
                    if d < tol and (best is None or d < best[0]):
                        best = (d, A_[i, 2] + (B_[i, 2] - A_[i, 2]) * t)
                return None if best is None else best[1]
            old = old_z
        keep, n_drop, n_old = [], 0, 0
        for w in ways:
            P = np.array([o.nodes[r] for r in w['refs']])
            tk = {(int(math.floor((e_ - S.ROOT_E0) / sz)), int(math.floor((n_ - S.ROOT_N0) / sz))) for e_, n_ in P}
            if tk & (Tset - Kset) or not tk & Ksel:
                keep.append(w)                # a way of the area itself (or of its margin)
                continue
            if w['kind'] == 'rail':
                continue
            if w['kind'] not in ('motorway', 'main', 'county', 'street', 'lane', 'service') or w['fl'] & NZ.FL['private'] or w['hw'] == 'pedestrian' \
                    or w['service'] in ('driveway', 'parking_aisle', 'drive-through', 'emergency_access'):
                n_drop += 1
                continue
            mx_, my_ = S.u2m(P[:, 0], P[:, 1])
            if all(ST.inside_box(float(x_), float(y_), 30) for x_, y_ in zip(mx_, my_)):
                n_drop += 1                   # inside the 2.4 km square the app has its own roads
                continue
            if w['kind'] == 'service' and S.way_len(P) < 40:
                n_drop += 1
                continue
            if old is not None and all(old(float(x_), float(y_), KINDS.index(w['kind'])) is not None for x_, y_ in zip(mx_, my_)):
                n_old += 1                    # all of it is a road of fahrt/strassen.json: left to that file
                continue
            w['korridor'] = True
            keep.append(w)
        S.log('corridor ways:', sum(1 for w in keep if w.get('korridor')), 'kept,', n_drop, 'not for cars or inside the square,', n_old, 'already in fahrt/strassen.json')
        ways = keep
        pin_old = old
    n_hw = sum(1 for w in ways if w['kind'] != 'rail')
    S.log(len(T), 'tiles,', n_hw, 'ways and', len(ways) - n_hw, 'tracks in the box', [round(v) for v in box])
    L.guard_count(n_hw, 'ways', {'probe': 'zentrum'}.get(a.gebiet, a.gebiet), what='suhl-strassen')
    fitb = NZ.fit_buildings(ways, o)
    S.log('carriageways against buildings:', fitb[0], 'narrowed,', fitb[1], 'lead into a building;', fitb[2], 'buildings')
    pos, chains = WR.network(ways, o.nodes, step=2.0)
    S.log('network:', len(pos), 'nodes,', len(chains), 'chains')
    dem = HO.Heights(a.raw, box, tiles=a.tiles, trees=not a.no_trees)
    grob = a.grob
    cache = {}
    pin = {}
    if pin_old is not None:
        px_, py_ = S.u2m(pos[:, 0], pos[:, 1])
        for w, ids in chains:
            if w.get('korridor') and not w['fl'] & 3:
                ki = KINDS.index(w['kind'])
                for i in ids:
                    z = pin_old(float(px_[i]), float(py_[i]), ki)
                    if z is not None:
                        pin[int(i)] = z + S.H0
        S.log('corridor:', len(pin), 'nodes held at the profile of fahrt/strassen.json')
    h, axis, info = NZ.solve(pos, chains, dem, grob=grob, cache=cache, pin=pin)
    if grob == 0:
        # the heights of this run come from the 30 m surface model (houses, tree tops): the small classes are smoothed over 1.3 times
        # their wavelength; with 1 m terrain (ground tiles of suhl-boden) the classes' own wavelengths hold
        grob = 1.3 if dem.coarse(T) else 1.0
        if grob != 1.0:
            h, axis, info = NZ.solve(pos, chains, dem, grob=grob, cache=cache, pin=pin)
    S.log('profiles solved:', info, 'grob', grob)
    # a bridge over another way keeps its clearance: the lift of the bridge and its approaches (viz3/extra/fahrt/strecke.py
    # overpasses, unchanged) goes into the terrain the profiles are fitted to, and the fit runs once more – one consistent profile
    # instead of a lift laid on top of it
    lift = ST.overpasses(pos, chains, h) - h
    if float(lift.max()) > 0.01:
        h, axis, info = NZ.solve(pos, chains, dem, grob=grob, cache=cache, offset=lift, pin=pin)
        axis = axis - lift
    res = WR.metrics(pos, chains, h, axis)
    WR.print_metrics(res, f'(Suhl {a.gebiet}: vorher = Gelände an der Achse, nachher = geglättetes Längsprofil)')
    # how far the profiles lie from the ground they were solved on (profile minus terrain at the axis; no bridges, tunnels, steps)
    fit = {}
    for lab, cond in (('alle', lambda w: True), ('fahrstrassen', lambda w: w['kind'] in ('motorway', 'main', 'county', 'street', 'lane', 'service')),
                      ('wege', lambda w: w['kind'] in ('track', 'path', 'foot')), ('bahn', lambda w: w['kind'] == 'rail')):
        ii = [ids for w, ids in chains if cond(w) and not w['fl'] & (3 | NZ.FL['steps'])]
        if not ii:
            continue
        ii = np.unique(np.concatenate(ii))
        dv = (h - axis)[ii]
        dv = dv[np.isfinite(dv)]
        fit[lab] = {'punkte': int(len(dv)), 'mittel_m': round(float(dv.mean()), 2), 'median_m': round(float(np.median(dv)), 2),
                    'mittel_betrag_m': round(float(np.abs(dv).mean()), 2), 'p95_betrag_m': round(float(np.percentile(np.abs(dv), 95)), 2),
                    'max_auftrag_m': round(float(dv.max()), 2), 'max_abtrag_m': round(float(-dv.min()), 2)}
    S.log('profile minus ground:', fit.get('alle'), '· roads for cars:', fit.get('fahrstrassen'))
    jst = NZ.junction_stats(pos, chains, h)
    clr = NZ.clearance(pos, chains, h)
    S.log('junctions', jst, '· bridges', {k: v for k, v in clr.items() if k != 'lowest'})
    # ---------------- places: the built-up area as a town (the style of the road map follows it) ----------------
    areas_g, orte_g = S.gebiete()
    BU = NZ.built_up(o, areas_g, orte_g)
    places, orte, pstyle = [], [], []
    from shapely.geometry import Point
    from shapely.prepared import prep
    for n_, k_, (E_, N_), g_ in BU:
        x_, y_ = S.u2m(E_, N_)
        places.append({'n': n_, 'k': k_, 'x': int(round(float(x_))), 'y': int(round(float(y_))), 'm': '' if n_ == 'Suhl' else 'Stadt Suhl', 'a': NZ.rings_model(g_)})
        orte.append({'n': n_, 't': 2 if k_ == 'town' else 1, 'a': NZ.rings_model(g_, dm=True)})
        pstyle.append((2 if k_ == 'town' else 3, prep(g_)))
    S.log('places:', [(p['n'], p['k'], len(p['a'])) for p in places])

    def style_at(E_, N_):
        pt, best = Point(E_, N_), 0
        for st_, pg_ in pstyle:
            if (st_ == 2 or best == 0) and pg_.contains(pt):
                best = st_ if st_ == 2 else max(best, st_)
                if best == 2:
                    break
        return best
    # ---------------- ways: simplified, cut at the tile edges ----------------
    mx, my = S.u2m(pos[:, 0], pos[:, 1])
    mz = h - S.H0
    names, nid = [''], {'': 0}
    hws, hid = [], {}

    def name_i(s):
        if s not in nid:
            nid[s] = len(names)
            names.append(s)
        return nid[s]

    def hw_i(s):
        if s not in hid:
            hid[s] = len(hws)
            hws.append(s)
        return hid[s]
    tiles = {t: {'ways': [], 'areas': [], 'x_areas': [], 'rail': [], 'railpts': [], 'water': [], 'wareas': [], 'm': collections.Counter()} for t in T}
    f_rail, f_water, f_wareas, f_railpts = [], [], [], []
    km_rail, km_water = collections.Counter(), collections.Counter()
    fw, f_lanes, f_ids, f_hw, f_ms, f_s0, f_kor, f_grund = [], [], [], [], [], [], [], []
    km_kor = collections.Counter()
    km_kor_g = collections.Counter()
    bridges, tunnels = [], []
    km_kind, km_hw, n_kind = collections.Counter(), collections.Counter(), collections.Counter()
    npts = 0
    def local(pts, key):
        """the points of a piece as the tile holds them: ABSOLUTE model coordinates in whole decimetres, as in fahrt/strassen.json
        (contract of suhl-daten for the product s; the road code of the region reads a tile as it is)"""
        return [int(round(v * 10)) for p in pts for v in p]

    def runs(U, P):
        """the pieces of a line per tile of the run, and the uncut runs inside the tile set -> [(key, pts, s0)], [(pts, s0)]"""
        pc, rn, run, run_s0 = [], [], None, 0.0
        for key, pts, s0 in NZ.cut(U, P):
            if key not in Tset:
                if run is not None and len(run) >= 2:
                    rn.append((np.array(run), run_s0))
                run = None
                continue
            if len(pts) >= 2 and S.way_len(pts) > 0.02:
                pc.append((key, pts, s0))
            if run is None:
                run, run_s0 = [tuple(p) for p in pts], s0
            else:
                run += [tuple(p) for p in pts[1:]]
        if run is not None and len(run) >= 2:
            rn.append((np.array(run), run_s0))
        return pc, rn
    for w, ids in chains:
        P = np.stack([mx[ids], my[ids], mz[ids]], 1)
        if w['kind'] == 'rail':
            P = ST.simplify(P, tol_xy=0.15, tol_z=0.03, max_len=30.0)
            U = np.stack(S.m2u(P[:, 0], P[:, 1]), 1)
            nm = name_i(w['name'] or w['bname'])
            pc, rn = runs(U, P)
            for key, pts, s0 in pc:
                tiles[key]['rail'].append([w['rtype'], w['fl'], nm, local(pts, key), w['id'], int(round(s0 * 10)), w['side']])
            for pts, s0 in rn:
                f_rail.append([w['rtype'], w['fl'], nm, [int(round(v * 10)) for p in pts for v in p], w['id'], w['side']])
                Lr = S.way_len(pts) * S.MSCALE
                km_rail[('in Betrieb' if w['rtype'] == 0 else 'stillgelegt') + (', Nebengleis' if w['side'] else '')] += Lr / 1000
                if w['fl'] & 1:
                    km_rail['auf Brücken'] += Lr / 1000
                    if Lr > 8:
                        bridges.append({'way': w['id'], 'name': w['bname'] or w['name'], 'ref': w['ref'], 'kind': 'rail', 'm': round(Lr),
                                        'z': round(float(pts[:, 2].mean()), 1), 'i': -1})
                if w['fl'] & 2:
                    km_rail['im Tunnel'] += Lr / 1000
            continue
        car = w['kind'] in ('motorway', 'main', 'county', 'street', 'lane', 'service')
        P = ST.simplify(P) if car else ST.simplify(P, tol_xy=0.3, tol_z=0.05, max_len=30.0)
        U = np.stack(S.m2u(P[:, 0], P[:, 1]), 1)
        mid = P[len(P) // 2]
        me, mn = S.m2u(mid[0], mid[1])
        style = style_at(float(me), float(mn))
        k_i, s_i = KINDS.index(w['kout']), SURF.index(w['surf'])
        w10 = int(round(w['w'] * 10))
        nm = name_i(w['name'] or w['bname'])
        rf = name_i(w['ref'])
        inside_m = 0.0
        pc, rn = runs(U, P)
        rn = [(r_, s_, None) for r_, s_ in rn]
        if w.get('korridor'):
            # the approach: a run ends where the ground changes hands – on the ground tiles of suhl-boden the road is cut into the
            # terrain there (no carving at run time), beyond them the drive code carves as in the rest of the region
            rn, cur = [], None
            for key, pts, s0 in pc:
                g = 1 if dem.tiles is not None and (S.LEVEL, key[0], key[1]) in dem.tiles.have else 0
                if cur is not None and cur[2] == g and abs(cur[3] - s0) < 0.5:
                    cur[0] += [tuple(q) for q in pts[1:]]
                else:
                    if cur is not None:
                        rn.append((np.array(cur[0]), cur[1], cur[2]))
                    cur = [[tuple(q) for q in pts], s0, g, s0]
                cur[3] = s0 + S.way_len(pts)
            if cur is not None:
                rn.append((np.array(cur[0]), cur[1], cur[2]))
        for key, pts, s0 in pc:
            Lp = S.way_len(pts)
            tiles[key]['ways'].append([k_i, s_i, w10, w['fl'], nm, rf, local(pts, key), w['id'], int(round(s0 * 10)), w['lanes'], hw_i(w['hw']), w['ms'], style])
            tiles[key]['m'][w['kout']] += Lp * S.MSCALE
            npts += len(pts)
            inside_m += Lp * S.MSCALE
        for run, run_s0, run_g in rn:
            f_grund.append(run_g)
            fw.append([k_i, s_i, w10, w['fl'], nm, rf, [int(round(v * 10)) for p in run for v in p]])
            f_lanes.append(w['lanes'])
            f_ids.append(w['id'])
            f_hw.append(hw_i(w['hw']))
            f_ms.append(w['ms'])
            f_s0.append(int(round(run_s0 * 10)))
            f_kor.append(bool(w.get('korridor')))
            Lr = S.way_len(run)
            if w.get('korridor'):
                km_kor[w['kout']] += Lr * S.MSCALE / 1000
                km_kor_g[run_g] += Lr * S.MSCALE / 1000
            if w['fl'] & 1 and Lr > 8:
                bridges.append({'way': w['id'], 'name': w['bname'] or w['name'], 'ref': w['ref'], 'kind': w['kout'], 'm': round(Lr * S.MSCALE),
                                'z': round(float(run[:, 2].mean()), 1), 'i': len(fw) - 1})
            if w['fl'] & 2 and Lr > 8:
                tunnels.append({'way': w['id'], 'name': w['bname'] or w['name'], 'ref': w['ref'], 'kind': w['kout'], 'm': round(Lr * S.MSCALE),
                                'i': len(fw) - 1})
        if inside_m > 0:
            km_kind[w['kout']] += inside_m / 1000
            km_hw[w['hw']] += inside_m / 1000
            n_kind[w['kout']] += 1
    S.log('ways out:', len(fw), 'runs,', npts, 'points in the tiles; tracks', {k: round(v, 2) for k, v in km_rail.items()}, 'km')
    # ---------------- railway points: stations, level crossings (the node of the crossing is a node of the network) ----------------
    from scipy.spatial import cKDTree
    kdn = cKDTree(pos)
    n_rpt = collections.Counter()
    for i, t in o.ntags.items():
        rt = {'station': 0, 'halt': 1, 'level_crossing': 2, 'crossing': 3}.get(t.get('railway'))
        if rt is None or i not in o.nodes:
            continue
        E, N = o.nodes[i]
        key = tuple(L.tile_at(S.LEVEL, E, N))
        if key not in Tset:
            continue
        d, k = kdn.query((E, N))
        z = float(h[k]) if d < 1.0 else float(dem.sample([E], [N])[0])
        x, y = S.u2m(E, N)
        nm = name_i(t.get('name', ''))
        tiles[key]['railpts'].append([rt, int(round(float(x) * 10)), int(round(float(y) * 10)), int(round((z - S.H0) * 10)), nm, i])
        f_railpts.append([rt, int(round(float(x) * 10)), int(round(float(y) * 10)), int(round((z - S.H0) * 10)), nm, i])
        n_rpt[['Bahnhof', 'Haltepunkt', 'Bahnübergang', 'Fußgänger-Übergang'][rt]] += 1
    # ---------------- water: lines downhill, ponds level ----------------
    WL = LN.water_lines(o, box, dem, pos, h)
    for wl in WL:
        x, y = S.u2m(wl['U'][:, 0], wl['U'][:, 1])
        P = ST.simplify(np.stack([x, y, wl['z'] - S.H0], 1), tol_xy=0.3, tol_z=0.05, max_len=40.0)
        U = np.stack(S.m2u(P[:, 0], P[:, 1]), 1)
        nm = name_i(wl['name'])
        ty = LN.WTYPES.index(wl['type'])
        pc, rn = runs(U, P)
        for key, pts, s0 in pc:
            tiles[key]['water'].append([ty, wl['fl'], int(round(wl['w'] * 10)), nm, local(pts, key), wl['id'], int(round(s0 * 10))])
        for pts, s0 in rn:
            f_water.append([ty, wl['fl'], int(round(wl['w'] * 10)), nm, [int(round(v * 10)) for p in pts for v in p], wl['id']])
            Lr = S.way_len(pts) * S.MSCALE / 1000
            km_water[wl['type']] += Lr
            if wl['fl'] & 2:
                km_water['verrohrt oder überdeckt'] += Lr
            if wl['name']:
                km_water['Name: ' + wl['name']] += Lr
    WA = LN.water_areas(o, core, dem)
    from shapely.geometry import box as sbox
    wa_m2 = 0.0
    for wa in WA:
        pg = wa['poly']
        touching = [t for t in T if pg.intersects(sbox(*L.tbounds(S.LEVEL, *t)))]
        if not touching:
            continue
        rp = pg.representative_point()
        home = tuple(L.tile_at(S.LEVEL, rp.x, rp.y))
        ext = list(pg.exterior.coords)[:-1]
        holes = [list(r.coords)[:-1] for r in pg.interiors]
        nm = name_i(wa['name'])
        zd = int(round((wa['z'] - S.H0) * 10))
        f_wareas.append([wa['kind'], nm, wa['id'], zd, model_ring(ext), [model_ring(r) for r in holes]])
        wa_m2 += pg.area
        for t in touching:
            tiles[t]['wareas'].append([wa['kind'], nm, wa['id'], 1 if t == home else 0, zd, model_ring(ext), [model_ring(r) for r in holes]])
    S.log('water:', {k: round(v, 2) for k, v in km_water.items() if not k.startswith('Name')}, 'km;', len(f_wareas), 'water areas', round(wa_m2), 'm²; railway points', dict(n_rpt))
    # ---------------- areas ----------------
    AR = NZ.areas(o, core, pos, h, dem)
    f_areas = []
    a_n, a_m2 = collections.Counter(), collections.Counter()
    from shapely.geometry import box as sbox
    for ar in AR:
        pg = ar['poly']
        touching = [t for t in T if pg.intersects(sbox(*L.tbounds(S.LEVEL, *t)))]
        if not touching:
            continue
        rp = pg.representative_point()
        home = tuple(L.tile_at(S.LEVEL, rp.x, rp.y))
        ext = list(pg.exterior.coords)[:-1]
        holes = [list(r.coords)[:-1] for r in pg.interiors]
        ze = NZ.plane_z(ar['plane'], [c[0] for c in ext], [c[1] for c in ext])
        zh = [NZ.plane_z(ar['plane'], [c[0] for c in r], [c[1] for c in r]) for r in holes]
        nm = name_i(ar['name'])
        f_areas.append([SURF.index(ar['surf']), ar['fl'], nm, model_ring(ext, ze), [model_ring(r, z) for r, z in zip(holes, zh)],
                        NZ.ATYPES.index(ar['type']), ar['id'], ar['q']])
        a_n[ar['type']] += 1
        a_m2[ar['type']] += pg.area
        ring, hol = model_ring(ext, ze), [model_ring(r, z) for r, z in zip(holes, zh)]
        for t in touching:
            # the contract's area (an object: kind, surface, outline, name, one height) with what Suhl adds (flags, OSM id, home, q, the
            # height of every vertex, holes); x_areas: the same in the layout the road map of feat/strassen takes (answer to wish W2)
            tiles[t]['areas'].append({'k': ar['type'], 'surf': SURF.index(ar['surf']), 'fl': ar['fl'], 'n': nm, 'osm': ar['id'], 'home': 1 if t == home else 0,
                                      'q': ar['q'], 'z': int(round(float(np.mean(ze) - S.H0) * 10)), 'f': [v for k in range(0, len(ring), 3) for v in ring[k:k + 2]],
                                      'fz': ring[2::3], 'h': [[v for k in range(0, len(r), 3) for v in r[k:k + 2]] for r in hol], 'hz': [r[2::3] for r in hol]})
            tiles[t]['x_areas'].append([SURF.index(ar['surf']), ar['fl'], nm, ring, hol])
    S.log('areas:', dict(a_n), {k: round(v) for k, v in a_m2.items()}, 'm²')
    # ---------------- write: tiles, index, the drive file, numbers ----------------
    made = S.now()
    heights = dem.info()
    g = heights.get('ground') or {}
    parts = []
    if heights['tiles']:
        share = dem.dgm1_share(T)
        heights['dgm1_share'] = round(share, 3)
        heights['tiles_from'] = a.tiles_from
        kind = g.get('terrain') or {'dgm1': 'DGM1 Thüringen (1 m)', 'dgm1+cop30': 'DGM1 Thüringen (1 m) unter %d %% der Kacheln des Laufs, sonst Copernicus GLO-30' % round(100 * share),
                                    'cop30': 'Copernicus GLO-30 (30 m)'}.get(g.get('terrain_source'), 'Quelle unbekannt')
        parts.append('ungeschnittene Geländekacheln von suhl-boden (%s; Stand %s, %s; %d Stützwerte)' % (
            kind, g.get('generated') or '?', a.tiles_from or ('Commit ' + str(g.get('commit'))), heights['tiles']))
    if heights['copernicus']:
        parts.append('eigene Abtastung von Copernicus GLO-30 (30 m, Wald um %.1f m abgesenkt; %d Stützwerte%s)' % (
            heights['copernicus_canopy_m'], heights['copernicus'], ' – nur am Rand außerhalb der Kacheln' if heights['tiles'] > heights['copernicus'] else ''))
    heights['solved_on'] = ' und '.join(parts) + ('; kleine Klassen %.1f-fach länger geglättet' % grob if grob != 1.0 else '')
    heights['own_sampling_share'] = round(heights['copernicus'] / max(1, heights['copernicus'] + heights['tiles']), 4)
    # one ground for everybody: a run counts when its heights come from the uncut ground tiles of suhl-boden
    heights['zaehlt'] = bool(heights['own_sampling_share'] < 0.25)
    if not heights['zaehlt']:
        heights['solved_on'] = 'TECHNIKPROBE, zählt nicht: ' + heights['solved_on']
    root = os.path.join(out, L.product_dir('s', VERSION))
    nbytes = 0
    for t in T:
        d = tiles[t]
        fr = L.tile_frame(S.LEVEL, *t)
        # the name table of a tile holds only what it uses
        use_n = sorted({w[4] for w in d['ways']} | {w[5] for w in d['ways']} | {ar['n'] for ar in d['areas']} | {r[2] for r in d['rail']}
                       | {r[4] for r in d['railpts']} | {r[3] for r in d['water']} | {r[1] for r in d['wareas']} | {0})
        ren = {i: k for k, i in enumerate(use_n)}
        for w in d['ways']:
            w[4], w[5] = ren[w[4]], ren[w[5]]
        for ar in d['areas']:
            ar['n'] = ren[ar['n']]
        for ar in d['x_areas']:
            ar[2] = ren[ar[2]]
        for r in d['rail']:
            r[2] = ren[r[2]]
        for r in d['railpts']:
            r[4] = ren[r[4]]
        for r in d['water']:
            r[3] = ren[r[3]]
        for r in d['wareas']:
            r[1] = ren[r[1]]
        # the head and the frame of the contract (docs/features/suhl-daten.md: v = schema number, p, key, o; unit "dm" = absolute model
        # coordinates in whole decimetres); lanes: beside ways as in the drive data, so that a tile can go into FAHRT.add as it is
        doc = {'v': L.SCHEMA, 'p': 's', 'key': fr.key, 'o': fr.o_json(), 'made': made, 'unit': 'dm', 'kinds': KINDS, 'surf': SURF,
               'names': [names[i] for i in use_n], 'ways': d['ways'], 'lanes': [w[9] for w in d['ways']], 'areas': d['areas'], 'x_areas': d['x_areas'],
               'rail': d['rail'], 'water': d['water'], 'hws': hws, 'atypes': NZ.ATYPES, 'wtypes': LN.WTYPES, 'railpts': d['railpts'],
               'wareas': d['wareas'], 'm': {k: round(v) for k, v in d['m'].items()}}
        nbytes += S.write_json(os.path.join(out, L.tile_path('s', VERSION, S.LEVEL, *t)), doc)
    numbers = {
        'made': made, 'gebiet': a.gebiet, 'tiles': len(T), 'osm': o.source, 'osm_stamp': o.stamp,
        'box_utm': [round(v) for v in core], 'ways_osm': len(ways), 'nodes': int(len(pos)), 'solve': dict(info, grob=grob, lift_max_m=round(float(lift.max()), 2)),
        'buildings': {'narrowed': fitb[0], 'into_building': fitb[1], 'buildings': fitb[2]},
        'km_by_kind': {k: round(v, 2) for k, v in km_kind.most_common()}, 'km': round(sum(km_kind.values()), 1),
        'ways_by_kind': dict(n_kind.most_common()), 'km_by_highway': {k: round(v, 2) for k, v in km_hw.most_common()},
        'note_km': 'true metres (UTM) of the ways inside the tiles of the run, by the kind written into the drive data',
        'areas': {k: {'n': a_n[k], 'm2': round(a_m2[k])} for k in a_n}, 'bridges': len(bridges), 'tunnels': len(tunnels),
        'rail_km': {k: round(v, 2) for k, v in km_rail.items()}, 'rail_points': dict(n_rpt),
        'water_km': {k: round(v, 2) for k, v in sorted(km_water.items(), key=lambda kv: -kv[1]) if not k.startswith('Name')},
        'water_named_km': {k[6:]: round(v, 2) for k, v in sorted(km_water.items(), key=lambda kv: -kv[1]) if k.startswith('Name')},
        'water_areas': {'n': len(f_wareas), 'm2': round(wa_m2)},
        'metric': res, 'junctions': jst, 'clearance': clr, 'fit_to_ground': fit, 'heights': heights, 'bytes_tiles': nbytes,
    }
    index = {'v': L.SCHEMA, 'p': 's', 'version': VERSION, 'area': a.gebiet, 'title': 'Straßenraum Suhl', 'made': made, 'level': S.LEVEL,
             'unit': 'dm: absolute model coordinates in whole decimetres (x east, y north, z = NHN - H0), as in fahrt/strassen.json',
             'tiles': {str(S.LEVEL): L.tileset_encode(T)}, 'attribution': ATTR, 'places': places, 'orte': orte,
             'sources': {'osm': o.source, 'osm_stamp': o.stamp, 'heights': heights},
             'fields': {'ways': WAY_FIELDS, 'areas': AREA_FIELDS, 'rail': RAIL_FIELDS, 'railpts': RAILPT_FIELDS, 'water': WATER_FIELDS,
                        'wareas': WAREA_FIELDS},
             'fl': NZ.FL_DOC, 'kinds': KINDS, 'surf': SURF, 'atypes': NZ.ATYPES, 'wtypes': LN.WTYPES,
             'style': {'0': 'freie Strecke', '2': 'Stadt', '3': 'Dorf'}, 'numbers': numbers}
    S.write_json(os.path.join(out, L.index_path('s', VERSION)), index)
    def drive_doc(sel, note, extra):
        """the ways with the indices `sel` as a file in the format of fahrt/strassen.json (own name table, bridges and tunnels re-indexed)"""
        ren = {i: k for k, i in enumerate(sel)}
        used = sorted({fw[i][4] for i in sel} | {fw[i][5] for i in sel} | {0} | {ar[2] for ar in extra.get('areas', [])} | {r[2] for r in extra.get('rail', [])}
                      | {r[4] for r in extra.get('railpts', [])} | {r[3] for r in extra.get('water', [])} | {r[1] for r in extra.get('wareas', [])})
        nr = {i: k for k, i in enumerate(used)}
        d = {'v': 1, 'made': made[:10], 'note': note, 'credits': ATTR, 'kinds': KINDS, 'surf': SURF, 'names': [names[i] for i in used],
             'ways': [fw[i][:4] + [nr[fw[i][4]], nr[fw[i][5]], fw[i][6]] for i in sel],
             'places': extra.get('places', []), 'signs': [], 'routes': extra.get('routes', {}), 'park': {},
             'lanes': [f_lanes[i] for i in sel], 'ids': [f_ids[i] for i in sel], 'hws': hws, 'hw': [f_hw[i] for i in sel], 'ms': [f_ms[i] for i in sel],
             's0': [f_s0[i] for i in sel], 'fl_bits': NZ.FL_DOC,
             'bridges': [dict(b, i=ren[b['i']]) for b in bridges if b['i'] in ren] + [b for b in bridges if b['i'] == -1 and extra.get('rail')],
             'tunnels': [dict(b, i=ren[b['i']]) for b in tunnels if b['i'] in ren]}
        if 'areas' in extra:
            d['areas'] = [ar[:2] + [nr[ar[2]]] + ar[3:] for ar in extra['areas']]
            d['atypes'] = NZ.ATYPES
        if 'orte' in extra:
            d['orte'] = extra['orte']
        if 'rail' in extra:
            d['rail'] = [r[:2] + [nr[r[2]]] + r[3:] for r in extra['rail']]
            d['railpts'] = [r[:4] + [nr[r[4]]] + r[5:] for r in extra['railpts']]
            d['water'] = [r[:3] + [nr[r[3]]] + r[4:] for r in extra['water']]
            d['wtypes'] = LN.WTYPES
            d['wareas'] = [r[:1] + [nr[r[1]]] + r[2:] for r in extra['wareas']]
        if extra.get('grund'):
            d['grund'] = [f_grund[i] for i in sel]
            d['grund_note'] = ('grund, eine Zahl je Weg: 1 = der Weg liegt auf den Geländekacheln von suhl-boden (dort ist er schon in den Boden '
                               'geschnitten: FAHRT.add mit carve: false), 0 = außerhalb (die Fahrt schneidet den Boden wie in der Region). '
                               'Ein Weg ist an dieser Grenze geteilt.')
        d.update(metric=res, heights=heights, junctions=jst)
        return d
    city = [i for i in range(len(fw)) if not f_kor[i]]
    drive = drive_doc(city, 'Suhl (%s): roads and ways in the format of fahrt/strassen.json (model dm: x east, y north, z = NHN - H0); the extra '
                      'fields (lanes … junctions) and the bits of fl from 32 on are Suhl\'s, the app ignores them' % a.gebiet,
                      dict(places=places, areas=f_areas, orte=orte, rail=f_rail, railpts=f_railpts, water=f_water, wareas=f_wareas))
    pf = os.path.join(out, 'fahrt', name + '.json')
    nb = S.write_json(pf, drive)
    if Kset:
        kor = [i for i in range(len(fw)) if f_kor[i]]
        rdoc = {k: {'pts': v['pts'], 'm': v['m']} for k, v in routes_doc['routes'].items()}
        nbk = S.write_json(os.path.join(out, 'fahrt', name + '-anfahrt.json'), drive_doc(
            kor, 'Suhl, the approach: the roads for cars along the routes garden - Suhl outside the city\'s tiles and outside fahrt/strassen.json, in its '
                 'format, solved in one system with the city (they meet without a step) and held at the profiles of fahrt/strassen.json where they touch; '
                 'routes: the routes of routen.py', dict(routes=rdoc, grund=True)))
        numbers['korridor'] = {'tiles': len(Kset), 'ways': len(kor), 'km_by_kind': {k: round(v, 2) for k, v in km_kor.most_common()},
                               'km': round(sum(km_kor.values()), 1), 'pinned_nodes': len(pin), 'bytes': nbk,
                               'km_auf_suhls_boden': round(km_kor_g.get(1, 0.0), 1), 'km_ausserhalb': round(km_kor_g.get(0, 0.0), 1)}
        index['numbers']['korridor'] = numbers['korridor']
        index['korridor'] = {str(S.LEVEL): L.tileset_encode(sorted(Kset))}
        S.write_json(os.path.join(out, L.index_path('s', VERSION)), index)
    numbers['bytes_drive'] = nb
    S.common_index(os.path.join(out, L.product_dir('s', VERSION)), a.gebiet, ['osm'] + (['dgm1'] if heights.get('dgm1_share') else []) + ['cop30', 'worldcover'],
                   'Straßenraum: Wege, Flächen, Gleise, Gewässer; Profile gerechnet auf: ' + heights['solved_on'])
    S.write_json(os.path.join(out, 'zahlen.json'), numbers, indent=1, separators=(',', ': '))
    S.log('fertig:', os.path.relpath(out, S.REPO), '· tiles', len(T), round(nbytes / 1e3), 'kB · drive file', round(nb / 1e3), 'kB ·',
          round(sum(km_kind.values()), 1), 'km in', round(time.time() - t0), 's')
    print(json.dumps({k: numbers[k] for k in ('km_by_kind', 'ways_by_kind', 'areas', 'bridges', 'tunnels', 'rail_km', 'rail_points', 'water_km',
                                              'water_named_km', 'water_areas', 'junctions')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
