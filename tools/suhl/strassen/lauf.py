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

WR, ST = NZ.WR, NZ.ST
KINDS, SURF = NZ.KINDS, NZ.SURF
VERSION = 0
ATTR = ('Straßen, Wege, Plätze © OpenStreetMap-Mitwirkende (ODbL 1.0); Höhen: Copernicus DEM GLO-30 (© DLR e.V. 2010-2014 und © Airbus '
        'Defence and Space GmbH 2014-2018, bereitgestellt unter COPERNICUS durch die Europäische Union und ESA), Geländekacheln von '
        'suhl-boden, wo vorhanden (© GDI-Th, CC BY 4.0)')
WAY_FIELDS = ['kind', 'surf', 'width_dm', 'fl', 'name', 'ref', 'xyz_dm', 'osm_way', 's0_dm', 'lanes', 'hw', 'maxspeed', 'style']
AREA_FIELDS = ['type', 'surf', 'fl', 'name', 'osm', 'home', 'q', 'xyz_dm', 'holes']


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
    ap.add_argument('--raw', default=S.RAW)
    ap.add_argument('--out')
    ap.add_argument('--name')
    ap.add_argument('--margin', type=float, default=300.0)
    ap.add_argument('--no-trees', action='store_true')
    ap.add_argument('--grob', type=float, default=0.0)   # 0: by the source of the heights
    a = ap.parse_args()
    t0 = time.time()
    out = a.out or os.path.join(S.OUT, a.gebiet)
    name = a.name or {'probe': 'suhl-zentrum', 'zentrum': 'suhl-zentrum'}.get(a.gebiet, 'suhl')
    T, poly = tile_set(a.gebiet)
    Tset = set(T)
    tb = [L.tbounds(S.LEVEL, x, y) for x, y in T]
    core = (min(b[0] for b in tb), min(b[1] for b in tb), max(b[2] for b in tb), max(b[3] for b in tb))
    box = (core[0] - a.margin, core[1] - a.margin, core[2] + a.margin, core[3] + a.margin)
    L.guard(box=box, what='suhl-strassen ' + a.gebiet)
    lo0, la0 = S.u2ll(box[0], box[1])
    lo1, la1 = S.u2ll(box[2], box[3])
    o = S.load_osm(opl=a.opl, api_dir=a.api_dir, box=(min(lo0, lo1) - 0.002, min(la0, la1) - 0.002, max(lo0, lo1) + 0.002, max(la0, la1) + 0.002))
    ways = NZ.select(o, box)
    S.log(len(T), 'tiles,', len(ways), 'ways in the box', [round(v) for v in box])
    L.guard_count(len(ways), 'ways', {'probe': 'zentrum'}.get(a.gebiet, a.gebiet), what='suhl-strassen')
    pos, chains = WR.network(ways, o.nodes, step=2.0)
    S.log('network:', len(pos), 'nodes,', len(chains), 'chains')
    dem = HO.Heights(a.raw, box, tiles=a.tiles, trees=not a.no_trees)
    grob = a.grob
    cache = {}
    h, axis, info = NZ.solve(pos, chains, dem, grob=grob, cache=cache)
    if grob == 0:
        # the heights of this run come from the 30 m surface model (houses, tree tops): the small classes are smoothed over 1.3 times
        # their wavelength; with 1 m terrain (ground tiles of suhl-boden) the classes' own wavelengths hold
        hi = dem.info()
        grob = 1.3 if hi['copernicus'] > hi['tiles'] else 1.0
        if grob != 1.0:
            h, axis, info = NZ.solve(pos, chains, dem, grob=grob, cache=cache)
    S.log('profiles solved:', info, 'grob', grob)
    # a bridge over another way keeps its clearance: the lift of the bridge and its approaches (viz3/extra/fahrt/strecke.py
    # overpasses, unchanged) goes into the terrain the profiles are fitted to, and the fit runs once more – one consistent profile
    # instead of a lift laid on top of it
    lift = ST.overpasses(pos, chains, h) - h
    if float(lift.max()) > 0.01:
        h, axis, info = NZ.solve(pos, chains, dem, grob=grob, cache=cache, offset=lift)
        axis = axis - lift
    res = WR.metrics(pos, chains, h, axis)
    WR.print_metrics(res, f'(Suhl {a.gebiet}: vorher = Gelände an der Achse, nachher = geglättetes Längsprofil)')
    jst = NZ.junction_stats(pos, chains, h)
    clr = NZ.clearance(pos, chains, h)
    S.log('junctions', jst, '· bridges', {k: v for k, v in clr.items() if k != 'lowest'})
    # ---------------- places: the built-up area as a town (the style of the road map follows it) ----------------
    areas_g, orte_g = S.gebiete()
    kern = areas_g['kernstadt'].simplify(10.0)
    kc = S.u2m(*S.CENTRE_UTM)
    rings = [list(g.exterior.coords)[:-1] for g in (kern.geoms if hasattr(kern, 'geoms') else [kern])]
    places = [{'n': 'Suhl', 'k': 'town', 'x': int(round(float(kc[0]))), 'y': int(round(float(kc[1]))), 'm': '',
               'a': [[int(round(v / 10)) for v in model_ring(r)] for r in rings]}]
    orte = [{'n': 'Suhl', 't': 2, 'a': [model_ring(r) for r in rings]}]
    from shapely.geometry import Point
    from shapely.prepared import prep
    pkern = prep(areas_g['kernstadt'])
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
    tiles = {t: {'ways': [], 'areas': [], 'm': collections.Counter()} for t in T}
    fw, f_lanes, f_ids, f_hw, f_ms, f_s0 = [], [], [], [], [], []
    bridges, tunnels = [], []
    km_kind, km_hw, n_kind = collections.Counter(), collections.Counter(), collections.Counter()
    npts = 0
    for w, ids in chains:
        P = np.stack([mx[ids], my[ids], mz[ids]], 1)
        car = w['kind'] in ('motorway', 'main', 'county', 'street', 'lane', 'service')
        P = ST.simplify(P) if car else ST.simplify(P, tol_xy=0.3, tol_z=0.05, max_len=30.0)
        U = np.stack(S.m2u(P[:, 0], P[:, 1]), 1)
        mid = P[len(P) // 2]
        me, mn = S.m2u(mid[0], mid[1])
        style = 2 if pkern.contains(Point(float(me), float(mn))) else 0
        k_i, s_i = KINDS.index(w['kout']), SURF.index(w['surf'])
        w10 = int(round(w['w'] * 10))
        nm = name_i(w['name'] or w['bname'])
        rf = name_i(w['ref'])
        run, run_s0 = None, 0.0
        inside_m = 0.0

        def flush():
            nonlocal run
            if run is not None and len(run) >= 2:
                q = [int(round(v * 10)) for p in run for v in p]
                fw.append([k_i, s_i, w10, w['fl'], nm, rf, q])
                f_lanes.append(w['lanes'])
                f_ids.append(w['id'])
                f_hw.append(hw_i(w['hw']))
                f_ms.append(w['ms'])
                f_s0.append(int(round(run_s0 * 10)))
                Lr = S.way_len(np.array(run))
                if w['fl'] & 1 and Lr > 8:
                    bridges.append({'way': w['id'], 'name': w['bname'] or w['name'], 'ref': w['ref'], 'kind': w['kout'], 'm': round(Lr * S.MSCALE),
                                    'z': round(float(np.mean([p[2] for p in run])), 1), 'i': len(fw) - 1})
                if w['fl'] & 2 and Lr > 8:
                    tunnels.append({'way': w['id'], 'name': w['bname'] or w['name'], 'ref': w['ref'], 'kind': w['kout'], 'm': round(Lr * S.MSCALE),
                                    'i': len(fw) - 1})
            run = None
        for key, pts, s0 in NZ.cut(U, P):
            if key not in Tset:
                flush()
                continue
            fr = L.tile_frame(S.LEVEL, *key)
            ox, oy = int(round(fr.o[0] * 10)), int(round(fr.o[1] * 10))
            q = []
            for p in pts:
                q += [int(round(p[0] * 10)) - ox, int(round(p[1] * 10)) - oy, int(round(p[2] * 10))]
            Lp = S.way_len(pts)
            if len(pts) >= 2 and Lp > 0.02:
                tiles[key]['ways'].append([k_i, s_i, w10, w['fl'], nm, rf, q, w['id'], int(round(s0 * 10)), w['lanes'], hw_i(w['hw']), w['ms'], style])
                tiles[key]['m'][w['kout']] += Lp * S.MSCALE
                npts += len(pts)
            inside_m += Lp * S.MSCALE
            if run is None:
                run, run_s0 = [tuple(p) for p in pts], s0
            else:
                run += [tuple(p) for p in pts[1:]]
        flush()
        if inside_m > 0:
            km_kind[w['kout']] += inside_m / 1000
            km_hw[w['hw']] += inside_m / 1000
            n_kind[w['kout']] += 1
    S.log('ways out:', len(fw), 'runs,', npts, 'points in the tiles')
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
        for t in touching:
            fr = L.tile_frame(S.LEVEL, *t)
            tiles[t]['areas'].append([NZ.ATYPES.index(ar['type']), SURF.index(ar['surf']), ar['fl'], nm, ar['id'], 1 if t == home else 0, ar['q'],
                                      model_ring(ext, ze, fr.o), [model_ring(r, z, fr.o) for r, z in zip(holes, zh)]])
    S.log('areas:', dict(a_n), {k: round(v) for k, v in a_m2.items()}, 'm²')
    # ---------------- write: tiles, index, the drive file, numbers ----------------
    made = S.now()
    heights = dem.info()
    heights['solved_on'] = ('Geländekacheln von suhl-boden (%d Stützwerte) und ' % heights['tiles'] if heights['tiles'] else '') + \
        'Copernicus GLO-30 (30 m, Wald um %.1f m abgesenkt; %d Stützwerte)' % (heights['copernicus_canopy_m'], heights['copernicus']) + \
        ('; kleine Klassen %.1f-fach länger geglättet' % grob if grob != 1.0 else '')
    root = os.path.join(out, L.product_dir('s', VERSION))
    nbytes = 0
    for t in T:
        d = tiles[t]
        fr = L.tile_frame(S.LEVEL, *t)
        # the name table of a tile holds only what it uses
        use_n = sorted({w[4] for w in d['ways']} | {w[5] for w in d['ways']} | {ar[3] for ar in d['areas']} | {0})
        ren = {i: k for k, i in enumerate(use_n)}
        for w in d['ways']:
            w[4], w[5] = ren[w[4]], ren[w[5]]
        for ar in d['areas']:
            ar[3] = ren[ar[3]]
        doc = {'v': VERSION, 'schema': L.SCHEMA, 'product': 's', 'key': fr.key, 'o': fr.o_json(),
               'unit': 'dm; x, y relative to o along the model axes, z = NHN - H0', 'kinds': KINDS, 'surf': SURF, 'hws': hws, 'atypes': NZ.ATYPES,
               'names': [names[i] for i in use_n], 'ways': d['ways'], 'areas': d['areas'],
               'm': {k: round(v) for k, v in d['m'].items()}}
        nbytes += S.write_json(os.path.join(out, L.tile_path('s', VERSION, S.LEVEL, *t)), doc)
    numbers = {
        'made': made, 'gebiet': a.gebiet, 'tiles': len(T), 'osm': o.source, 'osm_stamp': o.stamp,
        'box_utm': [round(v) for v in core], 'ways_osm': len(ways), 'nodes': int(len(pos)), 'solve': dict(info, grob=grob, lift_max_m=round(float(lift.max()), 2)),
        'km_by_kind': {k: round(v, 2) for k, v in km_kind.most_common()}, 'km': round(sum(km_kind.values()), 1),
        'ways_by_kind': dict(n_kind.most_common()), 'km_by_highway': {k: round(v, 2) for k, v in km_hw.most_common()},
        'note_km': 'true metres (UTM) of the ways inside the tiles of the run, by the kind written into the drive data',
        'areas': {k: {'n': a_n[k], 'm2': round(a_m2[k])} for k in a_n}, 'bridges': len(bridges), 'tunnels': len(tunnels),
        'metric': res, 'junctions': jst, 'clearance': clr, 'heights': heights, 'bytes_tiles': nbytes,
    }
    index = {'v': VERSION, 'schema': L.SCHEMA, 'product': 's', 'title': 'Straßenraum Suhl', 'made': made, 'level': S.LEVEL,
             'tiles': {str(S.LEVEL): L.tileset_encode(T)}, 'attribution': ATTR,
             'sources': {'osm': o.source, 'osm_stamp': o.stamp, 'heights': heights},
             'fields': {'ways': WAY_FIELDS, 'areas': AREA_FIELDS}, 'fl': NZ.FL_DOC, 'kinds': KINDS, 'surf': SURF, 'atypes': NZ.ATYPES,
             'style': {'0': 'freie Strecke', '2': 'Stadt', '3': 'Dorf'}, 'numbers': numbers}
    S.write_json(os.path.join(out, L.index_path('s', VERSION)), index)
    drive = {
        'v': 1, 'made': made[:10],
        'note': 'Suhl (%s): roads and ways in the format of fahrt/strassen.json (model dm: x east, y north, z = NHN - H0); the extra '
                'fields (lanes … clearance) and the bits of fl from 32 on are Suhl\'s, the app ignores them' % a.gebiet,
        'credits': ATTR, 'kinds': KINDS, 'surf': SURF, 'names': names, 'ways': fw, 'places': places, 'signs': [], 'routes': {}, 'park': {},
        'lanes': f_lanes, 'ids': f_ids, 'hws': hws, 'hw': f_hw, 'ms': f_ms, 's0': f_s0, 'fl_bits': NZ.FL_DOC,
        'areas': f_areas, 'atypes': NZ.ATYPES, 'orte': orte, 'bridges': bridges, 'tunnels': tunnels,
        'metric': res, 'heights': heights, 'junctions': jst,
    }
    pf = os.path.join(out, 'fahrt', name + '.json')
    nb = S.write_json(pf, drive)
    numbers['bytes_drive'] = nb
    S.write_json(os.path.join(out, 'zahlen.json'), numbers, indent=1, separators=(',', ': '))
    S.log('fertig:', os.path.relpath(out, S.REPO), '· tiles', len(T), round(nbytes / 1e3), 'kB · drive file', round(nb / 1e3), 'kB ·',
          round(sum(km_kind.values()), 1), 'km in', round(time.time() - t0), 's')
    print(json.dumps({k: numbers[k] for k in ('km_by_kind', 'ways_by_kind', 'areas', 'bridges', 'tunnels', 'junctions')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
