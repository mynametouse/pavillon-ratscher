#!/usr/bin/env python3
"""suhl-gebaeude: one parametric record per building of Suhl -> level-10 tiles g/<version>/10/<x>/<y>.json and index.json
(docs/features/suhl-gebaeude.md describes every field; plan docs/plans/plan_suhl.md sections 2.3, 2.4).

  # the sample set of the Zentrum (the level-10 tiles that touch the area `zentrum`), from this machine:
  python3 -I tools/suhl/gebaeude/bauen.py --area probe --ethos RAW/ethos/suhl.jsonl --alkis RAW/alkis/probe.jsonl --osm-api RAW/osm [--dop]
  # the whole municipality (GitHub Actions, .github/workflows/suhl-gebaeude.yml):
  python3 -I tools/suhl/gebaeude/bauen.py --area stadt --ethos … --alkis RAW/alkis/stadt.jsonl --opl suhl.opl.gz --dop --out DIR --version v1

Sources, joined by the building id (ETHOS id without 'DEG_' = LoD2 id = the first 16 characters of the cadastre's oid):
ETHOS.BUILDA (footprint, height; ODbL), the cadastre WFS 'ALKIS vereinfacht' (function, floors, addresses; (c) GDI-Th, CC BY 4.0),
OpenStreetMap (names, shops, roof tags, heritage, streets; ODbL), the aerial image (roof class and colour; (c) GDI-Th, CC BY 4.0),
docs/plans/suhl/wahrzeichen.md (landmarks). Everything estimated carries a flag. Areas are computed in UTM metres.
"""
import argparse, json, math, os, sys, time
from collections import Counter, defaultdict
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gblib as G
from gblib import wlib, sblib
import regeln as RG
import dach as D
import fassade as F
import osmdaten as O

ATTR = ('Gebäude: ETHOS.BUILDA v1.0.0 (Forschungszentrum Jülich, Zenodo 11845992, ODbL 1.0), aus LoD2 Thüringen (© GDI-Th); '
        'Nutzung, Geschosse, Adressen: ALKIS vereinfacht © GDI-Th, CC BY 4.0; Namen, Läden, Dachangaben, Straßen: © OpenStreetMap-Mitwirkende, '
        'ODbL 1.0; Dachfarben und Dachklassen: Digitale Orthophotos © GDI-Th, CC BY 4.0')


def clean_ring(c, tol=0.05):
    """drop repeated points (closer than tol) of a ring given without its closing point"""
    out = []
    for p in c:
        if not out or math.hypot(p[0] - out[-1][0], p[1] - out[-1][1]) >= tol:
            out.append((float(p[0]), float(p[1])))
    while len(out) > 3 and math.hypot(out[0][0] - out[-1][0], out[0][1] - out[-1][1]) < tol:
        out.pop()
    # spikes of no width (the outline runs to a point and back along the same line): they turn into self-intersections when rounded
    changed = True
    while changed and len(out) > 3:
        changed = False
        n = len(out)
        for i in range(n):
            a, b, c = out[i - 1], out[i], out[(i + 1) % n]
            v1, v2 = (b[0] - a[0], b[1] - a[1]), (c[0] - b[0], c[1] - b[1])
            l1, l2 = math.hypot(*v1), math.hypot(*v2)
            if l1 < tol or l2 < tol or (v1[0] * v2[0] + v1[1] * v2[1] < 0 and abs(v1[0] * v2[1] - v1[1] * v2[0]) < 0.03 * l1 * l2):
                del out[i]
                changed = True
                break
    return out


def flat2(ring):
    """a ring (array of metres on the UTM axes relative to the tile centre) as [x, y, x, y, ...] in the tile-local frame"""
    lx, ly = G.local(ring[:, 0], ring[:, 1])
    return [G.r2(q) for xy in zip(lx, ly) for q in xy]


def rounded_ok(g):
    """does the footprint stay a valid polygon when written (tile-local frame, centimetres)?"""
    from shapely.geometry import Polygon
    try:
        rr = []
        for r in [g.exterior] + list(g.interiors):
            c = np.array(r.coords)[:-1]
            lx, ly = G.local(c[:, 0], c[:, 1])
            rr.append(list(zip(np.round(lx, 2), np.round(ly, 2))))
        q = Polygon(rr[0], rr[1:])
        return q.is_valid and q.area > 0.5
    except Exception:
        return False


def robust(g):
    """a footprint that pinches (two corners centimetres apart) can turn invalid when rounded: open it a little until it survives"""
    from shapely.geometry.polygon import orient
    if rounded_ok(g):
        return g
    for d in (0.04, -0.04, 0.08, -0.08, 0.15, -0.15, 0.3, -0.3):
        try:
            q = g.buffer(-d, join_style=2).buffer(d, join_style=2)       # d > 0 opens (outward spikes), d < 0 closes (slits)
        except Exception:
            continue
        if q.is_empty:
            continue
        if q.geom_type == 'MultiPolygon':
            q = max(q.geoms, key=lambda t_: t_.area)
        if q.geom_type == 'Polygon' and q.area > 0.8 * g.area:
            q = orient(q.simplify(0.02), 1.0)
            if rounded_ok(q):
                return q
    return g


def footprint(rings):
    """one valid polygon (CCW, holes CW, simplified by 0.12 m like prep.py clean) from [outer, hole, ...] in UTM, or None"""
    from shapely.geometry import Polygon
    from shapely.geometry.polygon import orient
    try:
        g = Polygon(rings[0], [r for r in rings[1:] if len(r) >= 4])
    except Exception:
        return None
    if not g.is_valid:
        g = g.buffer(0)
    if g.is_empty:
        return None
    if g.geom_type == 'MultiPolygon':
        g = max(g.geoms, key=lambda q: q.area)
    if g.geom_type != 'Polygon' or g.area < 1.0:
        return None
    s = g.simplify(0.12, preserve_topology=True)
    if s.is_valid and not s.is_empty and s.geom_type == 'Polygon' and s.area > 0.9 * g.area:
        g = s
    g = Polygon(clean_ring(list(g.exterior.coords)[:-1]), [clean_ring(list(r.coords)[:-1]) for r in g.interiors if Polygon(r).area >= 1.5])
    if not g.is_valid:
        g = g.buffer(0)
        if g.geom_type == 'MultiPolygon':
            g = max(g.geoms, key=lambda q: q.area)
    if g.is_empty or g.geom_type != 'Polygon' or g.area < 1.0:
        return None
    return orient(g, 1.0)


def load_ethos(path, keep):
    """ETHOS bodies [(id16, height, polygon UTM)] whose first point passes keep(E, N)"""
    out = []
    for ln in open(path, encoding='utf-8'):
        d = json.loads(ln)
        if 'header' in d or not d.get('poly'):
            continue
        r = d['poly'][0]
        if not keep(r[0][0][0], r[0][0][1]):
            continue
        p = footprint(r)
        if p is None:
            continue
        sid = str(d['id'])
        out.append((sid[4:] if sid.startswith('DEG_') else sid, d.get('h'), p))
    return out


def load_alkis(path):
    K = {}
    for ln in open(path, encoding='utf-8'):
        d = json.loads(ln)
        p = footprint(d['poly'][0])
        if p is None:
            continue
        d['p'] = p
        K[d['oid'][:16]] = d
    return K


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--area', default='probe', choices=['probe', 'stadt'])
    ap.add_argument('--ethos', default=os.path.join(G.RAW, 'ethos', 'suhl.jsonl'))
    ap.add_argument('--alkis', default=None)
    ap.add_argument('--osm-api', default=None)
    ap.add_argument('--opl', default=None)
    ap.add_argument('--dop', action='store_true', help='roof class and colour from the aerial image (WMS th_dop, cached per tile)')
    ap.add_argument('--dop-workers', type=int, default=0, help='fetch the aerial images ahead with this many requests at a time (GitHub Actions: 2)')
    ap.add_argument('--out', default=None)
    ap.add_argument('--version', default='v0')
    ap.add_argument('--limit-tiles', type=int, default=0, help='for tests: only the first n tiles')
    a = ap.parse_args()
    from shapely.geometry import Point, box as sbox
    from shapely.prepared import prep
    from shapely.strtree import STRtree
    from shapely.ops import unary_union
    from shapely import affinity
    t_start = time.time()
    A = G.areas()
    stadt = prep(A['stadt'])
    zentrum, kern = prep(A['zentrum']), prep(A['kernstadt'])
    alkis_path = a.alkis or os.path.join(G.RAW, 'alkis', f'{a.area}.jsonl')
    out_root = a.out or os.path.join(G.OUT, 'probe' if a.area == 'probe' else 'stadt', 'suhl', 'g', a.version)
    if a.area == 'probe':
        want = set(G.sample_tiles())
        bbs = [wlib.tbounds(G.LEVEL, x, y) for x, y in want]
        bb = (min(b[0] for b in bbs), min(b[1] for b in bbs), max(b[2] for b in bbs), max(b[3] for b in bbs))
    else:
        want = None
        bb = A['stadt'].bounds
    G.check_centre(bb, 'building area')
    M = 120.0   # context margin: neighbours for party walls, streets
    keep = lambda e, n: bb[0] - M <= e <= bb[2] + M and bb[1] - M <= n <= bb[3] + M
    E = load_ethos(a.ethos, keep)
    K = load_alkis(alkis_path)
    G.log('ETHOS bodies in the frame', len(E), 'cadastre buildings', len(K))
    if a.area == 'stadt' and len(E) < 10000:
        raise SystemExit('fewer than 10 000 buildings found - wrong area or broken input, stopping (plan 5.3)')
    osm = O.load(a.opl, a.osm_api, (bb[0] - M, bb[1] - M, bb[2] + M, bb[3] + M)) if (a.opl or a.osm_api) else \
        {'buildings': [], 'pois': [], 'addr': [], 'roads': [], 'source': 'none', 'stamp': ''}
    G.log('OSM', {k: (len(v) if isinstance(v, list) else v) for k, v in osm.items()})

    # ---------------- join ETHOS <-> cadastre ----------------
    eid = {e[0] for e in E}
    kkeys = list(K)
    ktree = STRtree([K[k]['p'] for k in kkeys]) if kkeys else None
    st = Counter()
    B = []          # every building of the frame: dict(id, p, h, hq, kat, alk)
    for sid, h, p in E:
        alk, kat = K.get(sid), 2
        if alk is None:
            kat = 0
            if ktree is not None:
                best = (0.0, None)
                for j in ktree.query(p):
                    ia = p.intersection(K[kkeys[j]]['p']).area
                    if ia > best[0]:
                        best = (ia, kkeys[j])
                if best[1] and best[0] >= 0.5 * min(p.area, K[best[1]]['p'].area):
                    alk, kat = K[best[1]], 1
        hq = 2 if isinstance(h, (int, float)) and h > 0.5 else 0
        B.append({'id': sid, 'p': p, 'h': float(h) if hq else None, 'hq': hq, 'kat': kat, 'alk': alk, 'src': 'e'})
    etree = STRtree([b['p'] for b in B])
    for k in kkeys:
        if k in eid:
            continue
        p = K[k]['p']
        cov = sum(p.intersection(B[j]['p']).area for j in etree.query(p)) / max(p.area, 1e-6)
        if cov >= 0.3:
            st['kataster_nur_ueberdeckt'] += 1
            continue
        if not keep(p.exterior.coords[0][0], p.exterior.coords[0][1]):
            continue
        B.append({'id': k, 'p': p, 'h': None, 'hq': 0, 'kat': 2, 'alk': K[k], 'src': 'k'})
    # which buildings are built: representative point in a wanted tile (sample) or inside the municipality (city)
    for b in B:
        rp = b['p'].representative_point()
        b['rp'] = (rp.x, rp.y)
        b['tile'] = G.tile_of(rp.x, rp.y)
        b['on'] = (b['tile'] in want) if want is not None else stadt.contains(rp)
    tree = STRtree([b['p'] for b in B])
    ids = [b['id'] for b in B]
    polys = [b['p'] for b in B]
    if len(set(ids)) != len(ids):
        dup = [k for k, v in Counter(ids).items() if v > 1]
        raise SystemExit(f'ids not unique: {dup[:5]}')

    # ---------------- OpenStreetMap: best overlapping building, shops inside, streets ----------------
    ob = osm['buildings']
    otree = STRtree([p for _, _, p in ob]) if ob else None
    pois = osm['pois']
    ptree = STRtree([Point(e, n) for _, _, e, n, _ in pois]) if pois else None
    roads = [(nm, cl, hw, ls) for nm, cl, hw, ls in osm['roads']]
    rtree = STRtree([r[3] for r in roads]) if roads else None
    named = [r for r in roads if r[0] and r[1] <= 4]
    ntree = STRtree([r[3] for r in named]) if named else None
    LM = RG.landmarks(G.REPO)
    lm_by_osm = {}
    for l_ in LM:
        for o_ in l_['osm']:
            lm_by_osm[o_] = l_
    lm_pts = []
    for l_ in LM:
        if l_['lat'] is not None and any(o_.startswith('node/') for o_ in l_['osm']):
            e, n = sblib.to_utm(l_['lon'], l_['lat'])
            lm_pts.append((float(e), float(n), l_))
    orte = [(nm, e, n) for nm, e, n in A['orte'] if nm in RG.VILLAGES]

    # ---------------- pass 1: what every body of the frame is (also the neighbours outside the tiles we build) ----------------
    GENERIC = ('handel und dienstleistung', 'wirtschaft oder gewerbe', 'öffentliche zwecke', 'nicht zu spezifizieren', 'sonstiges')
    for b in B:
        p, alk = b['p'], b['alk']
        sh = b['sh'] = RG.shape_of(p)
        ot, oid_ = {}, None
        if otree is not None:
            best = (0.0, None)
            for j in otree.query(p):
                try:
                    ia = p.intersection(ob[j][2]).area
                except Exception:
                    continue
                if ia > best[0]:
                    best = (ia, j)
            # the same building: more than half of this footprint under the OSM one, or the OSM one mostly inside this footprint
            if best[1] is not None and (best[0] > 0.5 * p.area or (best[0] > 0.5 * ob[best[1]][2].area and best[0] > 0.3 * p.area)):
                oid_, ot = ob[best[1]][0], ob[best[1]][1]
        b['osm'], b['ot'] = oid_, ot
        fn = b['fn'] = (alk or {}).get('fn', '')
        use, khint, useq = RG.use_kind(fn, (alk or {}).get('nutz', ''), ot)
        if useq == 2 and ot and any(w in fn.lower() for w in GENERIC):
            u2, k2, q2 = RG.use_kind('', '', ot)        # the cadastre's word is generic: OpenStreetMap may know it better (hotel, museum ...)
            if q2 == 1 and u2 != 'unbekannt' and u2 != use:
                use, khint, useq = u2, (k2 if k2 is not None else khint), 1
        gs, gsq = (alk or {}).get('gs'), 2
        if not gs:
            gs, gsq = None, 0
            try:
                lv = float(str(ot.get('building:levels', '')).replace(',', '.'))
                if 1 <= lv <= 40:
                    gs, gsq = int(round(lv)), 1
            except ValueError:
                pass
        # the height: ETHOS (from LoD2: ground to the highest point); a building only the cadastre knows gets an estimate (hq 0)
        h = b['h']
        if h is None:
            h = (gs * 3.0 + 1.5) if gs else (3.0 if sh['A'] < 40 else 6.0 if sh['A'] < 300 else 8.0)
            if khint == 3 or use in ('garage', 'neben'):
                h = 2.8
            if khint == 8:
                h = 0.5
        b['use'], b['useq'], b['gs'], b['gsq'], b['hh'] = use, useq, gs, gsq, float(h)
        b['k'] = RG.kind_of(use, khint, sh, h, gs)
        b['main'] = b['k'] in (0, 1, 6) and sh['A'] >= 40 and h >= 5.0
    # the neighbours that touch a footprint; a small body attached to a bigger one is a part of it (`bt`): a stair tower, a bay, an annex
    for i, b in enumerate(B):
        if not b['on']:
            continue
        p = b['p']
        nb_ = [j for j in tree.query(p.buffer(0.35)) if j != i and polys[j].distance(p) < 0.35]
        b['nb'] = nb_
        b['bt'] = None
        if nb_ and b['k'] in (0, 2, 3, 5) and b['sh']['A'] < 60:
            j = max(nb_, key=lambda j_: B[j_]['sh']['A'])
            if B[j]['sh']['A'] >= 2.0 * b['sh']['A'] and B[j]['k'] in (0, 1, 6):
                try:
                    if p.buffer(0.35).intersection(polys[j].exterior).length >= 1.5:
                        b['bt'] = j
                        if b['k'] == 3 and b['hh'] >= 6.0:
                            b['k'] = 0      # a tall 'roofing' against a house is a stack of balconies or loggias, not a carport
                except Exception:
                    pass

    photo = None
    if a.dop:
        import luftbild as LB
        photo = LB.Tiles(os.path.join(G.RAW, 'dop'))

    tiles = defaultdict(list)
    for i, b in enumerate(B):
        if b['on']:
            tiles[b['tile']].append(i)
    tkeys = sorted(tiles)
    if a.limit_tiles:
        tkeys = tkeys[:a.limit_tiles]
    G.log('buildings to build', sum(len(tiles[k]) for k in tkeys), 'tiles', len(tkeys))
    if a.area == 'stadt':
        G.S.guard(buildings=sum(len(tiles[k]) for k in tkeys), area='stadt', what='suhl-gebaeude bauen')
    if photo is not None and a.dop_workers > 0:
        photo.prefetch(tkeys, a.dop_workers)
    stats = {'k': Counter(), 'use': Counter(), 'typ': Counter(), 'r': Counter(), 'rq': Counter(), 'gsq': Counter(), 'era': Counter(), 'eraq': Counter(),
             'kat': Counter(), 'src': Counter(), 'cls': Counter(), 'cq': Counter(), 'fn': Counter(), 'fnmap': {}, 'hq': Counter()}
    tall, index, total_bytes, nb = [], {}, 0, 0
    sums = {'gf': 0.0, 'bgf': 0.0, 'dach': 0.0}
    n_adr = n_name = n_osm = n_front = n_shop = n_lm = n_dm = 0
    for (tx, ty) in tkeys:
        e0, n0, e1, n1 = wlib.tbounds(G.LEVEL, tx, ty)
        ec, nc = (e0 + e1) / 2, (n0 + n1) / 2
        streets, sidx = [], {}
        fnT, fidx = [], {}

        def street_index(name):
            if not name:
                return -1
            if name not in sidx:
                sidx[name] = len(streets)
                streets.append(name)
            return sidx[name]
        img = photo.tile(tx, ty) if photo is not None else None
        recs = []
        for i in tiles[(tx, ty)]:
            b = B[i]
            p, sid, alk = b['p'], b['id'], b['alk']
            sh, ot, oid_, fn = b['sh'], b['ot'], b['osm'], b['fn']
            use, gs, gsq, h, hq, k = b['use'], b['gs'], b['gsq'], b['hh'], b['hq'], b['k']
            others = [polys[j] for j in b['nb']]
            mains = [polys[j] for j in b['nb'] if B[j]['main']]
            part_of = B[b['bt']] if b['bt'] is not None else None
            # the nearest named street and the village core
            near = None
            if ntree is not None:
                c = Point(b['rp'])
                bd = 1e9
                for j in ntree.query(c.buffer(60)):
                    d_ = named[j][3].distance(c)
                    if d_ < bd:
                        bd, near = d_, named[j][0]
            village = any(math.hypot(b['rp'][0] - e, b['rp'][1] - n) < 280 for _, e, n in orte)
            oldtown = near in RG.OLD_TOWN and zentrum.contains(Point(b['rp']))
            typ = RG.type_of(k, use, sh, h, gs, len(mains), village, oldtown)
            if part_of is not None and k == 0:
                # a part looks like the building it belongs to
                pm = part_of
                typ = RG.type_of(pm['k'], pm['use'], pm['sh'], pm['hh'], pm['gs'], 1, village, oldtown)
            # the roof (estimate)
            ridge = D.ridge_from_neighbours(p, mains, sh) if k in (0, 6) and mains else None
            iv = None
            rel = robust(affinity.translate(p, -ec, -nc))
            if img is not None and k in (0, 1) and sh['A'] >= 60:
                iv = img.roof_hints(p, sh)
            sh_rel = dict(sh)
            sh_rel['ctr'] = np.array(sh['ctr']) - np.array([ec, nc])
            est = D.estimate(sh_rel, h, k, typ, use, gs, ot, ridge, iv, part=part_of is not None)
            faces, walls, rings = D.build(rel, est, sid, k, bool(others))
            # floors where neither the cadastre nor OpenStreetMap knows them: from the eave
            if gs is None and k in (0, 1, 6):
                hf0 = D.STOREY.get(typ, 3.0)
                gs = 1 if k in (1, 6) else max(1, int(round((est['eave'] - D.PLINTH.get(typ, 0.4)) / hf0)))
            ctx = {'tree': tree, 'ids': ids, 'polys': [None], 'rtree': rtree, 'roads': roads, 'street_index': street_index}
            ctx['polys'] = polys
            # sides are probed in UTM: shift rings back
            ringsU = [r + np.array([ec, nc]) for r in rings]
            S, shared_n, front = F.sides(ringsU, walls, sid, p, ctx, k)
            for s_ in S:
                s_[0], s_[1], s_[2], s_[3] = G.r2(s_[0] - ec), G.r2(s_[1] - nc), G.r2(s_[2] - ec), G.r2(s_[3] - nc)
            # landmark, monument, enterable
            fl = {}
            lm = lm_by_osm.get(oid_) if oid_ else None
            if lm is None:
                for e, n, l_ in lm_pts:
                    if abs(e - b['rp'][0]) < 150 and abs(n - b['rp'][1]) < 150 and p.contains(Point(e, n)):
                        lm = l_
                        break
            if lm is not None:
                fl['lm'] = lm['nr']
                if lm['enter']:
                    fl['in'] = 1
                if lm['monument']:
                    fl['dm'] = 1
            if ot.get('heritage'):
                fl['dm'] = 1
            if part_of is not None:
                rec_bt = part_of['id']
            else:
                rec_bt = None
            if b['kat'] == 0:
                fl['nk'] = 1        # not in the cadastre at the time of the request: possibly demolished since LoD2
            if h >= 25 and sh['A'] >= 100:
                fl['hh'] = 1
            era, eraq = RG.era_of(typ, use, ot, lm['year'] if lm else None, oldtown)
            # the colours of a part follow its main building (the same choice from the palette)
            fa = F.params(part_of['id'] if part_of is not None else sid, typ, k, use, gs, gsq, est['eave'], ot, era, narrow=sh['Wd'] < 3.0)
            # shops and amenities inside (or within 2 m of) the footprint: the ground-floor shop zone and the signs
            shops = []
            if ptree is not None and k in (0, 1, 6):
                for j in ptree.query(p.buffer(2.0)):
                    nm, kd, e, n, pid = pois[j]
                    if p.distance(Point(e, n)) <= 2.0:
                        shops.append((nm, kd, e, n))
            name = (alk or {}).get('name') or ot.get('name') or (lm['name'] if lm and lm['nr'].startswith('Z') and oid_ in lm['osm'] else None)
            Sp = {}
            if fa is not None and k == 0 and front:
                shoplike = [s_ for s_ in shops if RG.shoplike(s_[1])]
                if shoplike or (use == 'handel' and sh['A'] >= 40):
                    # the shop zone goes to the sides that face a street
                    for si_ in front:
                        Sp[si_] = {'eg': 1}
                    fa['q'] = 1
                # a sign for every named place inside, on the street side nearest to it
                for nm, kd, e, n in shops:
                    best = min(front, key=lambda si_: abs((e - ec - S[si_][0]) * (S[si_][3] - S[si_][1]) - (n - nc - S[si_][1]) * (S[si_][2] - S[si_][0]))
                               / max(0.1, math.hypot(S[si_][2] - S[si_][0], S[si_][3] - S[si_][1])))
                    sg = Sp.setdefault(best, {}).setdefault('sign', [])
                    if nm not in sg and len(sg) < 4:
                        sg.append(nm)
            # roof class and colour per face from the aerial image
            for f_ in faces:
                cls, col, cq = None, None, 0
                if img is not None and f_['_pg'] is not None:
                    cls, col, cq = img.roof_class(affinity.translate(f_['_pg'], ec, nc), f_['sl'], k, ot)
                if cls is None:
                    cls, col = (4, '#6f6f6c') if est['form'] == 0 else (5, '#9a9c9e') if k == 1 else (0, '#a8523a')
                    if k == 2 and est['form'] != 0:
                        cls, col = 4, '#5f5d5a'
                f_['c'], f_['col'], f_['cq'] = cls, col, cq
                del f_['_pg']
                stats['cls'][cls] += 1
                stats['cq'][cq] += 1
            gf = b['p'].area   # the footprint as the source gives it, true m² in UTM (the simplified outline differs by less than 1 %)
            rec = {'id': sid}
            if oid_:
                rec['osm'] = oid_
                n_osm += 1
            rec['k'] = k
            rec['use'] = use
            if fn:
                if fn not in fidx:
                    fidx[fn] = len(fnT)
                    fnT.append(fn)
                rec['fn'] = fidx[fn]
            rec['typ'] = typ
            if rec_bt:
                rec['bt'] = rec_bt
            if gs:
                rec['gs'], rec['gsq'] = int(gs), gsq
            rec['era'], rec['eraq'] = era, eraq
            if name:
                rec['n'] = name
                n_name += 1
            adr = (alk or {}).get('adr') or ''
            if not adr and ot.get('addr:street') and ot.get('addr:housenumber'):
                adr = ot['addr:street'] + ' ' + ot['addr:housenumber']
            if adr:
                rec['adr'] = adr
                n_adr += 1
            if fl:
                rec['fl'] = fl
            rec['kat'] = b['kat']
            if b['src'] != 'e':
                rec['src'] = b['src']
            rec['f'] = flat2(rings[0])
            if len(rings) > 1:
                rec['h'] = [flat2(r) for r in rings[1:]]
            rec['e'], rec['hr'], rec['hq'] = G.r2(est['eave']), G.r2(h), hq
            rec['r'], rec['rq'] = est['form'], est['rq']
            if est['form']:
                rec['az'] = round((math.degrees(math.atan2(est['ux'][0], est['ux'][1])) + G.CONV) % 180.0, 1)
                rec['p'] = round(est['pitch'], 1)
            if est['rs']:
                rec['rs'] = est['rs']
            R = []
            for f_ in faces:
                o_ = {'c': f_['c'], 'col': f_['col'], 'cq': f_['cq'], 'a': f_['a']}
                if est['form'] != 0:
                    v3 = np.asarray(f_['v'], dtype=float).reshape(-1, 3)
                    lx, ly = G.local(v3[:, 0], v3[:, 1])
                    o_['sl'], o_['az'], o_['t'] = f_['sl'], f_['az'], f_['t']
                    o_['v'] = [G.r2(q) for row in zip(lx, ly, v3[:, 2]) for q in row]
                R.append(o_)
            rec['R'] = R
            # sides: [top a, top b, flags, street distance, street index (, apex u, apex top)] - one per ring edge, outer ring first
            rec['S'] = [[s_[4], s_[7], s_[8], s_[9], s_[10]] + ([G.r2(s_[5] / G.SCALE), s_[6]] if s_[8] & 2 else []) for s_ in S]
            if len(S) != sum(len(r) for r in rings):
                # sides do not match the ring edges one to one (should not happen): explicit ends
                rec['Sx'] = [[G.r2(q) for q in (*G.local(s_[0], s_[1]), *G.local(s_[2], s_[3]))] for s_ in S]
            if fa is not None:
                rec['fa'] = fa
            if Sp:
                rec['Sp'] = {str(k_): v for k_, v in sorted(Sp.items())}
                n_shop += 1
            if front:
                n_front += 1
            d = {'gf': G.r1(gf)}
            if k in (0, 1, 6) and gs:
                d['bgf'] = int(round(gf * gs))      # gross floor area above ground = footprint x floors
            d['da'] = G.r1(sum(f_['a'] for f_ in faces))
            rec['d'] = d
            recs.append(rec)
            # statistics
            for key, val in (('k', k), ('use', use), ('typ', typ), ('r', est['form']), ('rq', est['rq']), ('era', era), ('eraq', eraq), ('kat', b['kat']),
                             ('src', b['src']), ('hq', hq)):
                stats[key][val] += 1
            stats['gsq'][gsq if gs else -1] += 1
            stats['fn'][fn or '(nicht im Kataster)'] += 1
            stats['fnmap'][fn or '(nicht im Kataster)'] = use
            sums['gf'] += gf
            sums['bgf'] += d.get('bgf', 0)
            sums['dach'] += d['da']
            n_lm += 1 if 'lm' in fl else 0
            n_dm += 1 if 'dm' in fl else 0
            if h >= 25:
                tall.append({'id': sid, 'hr': G.r1(h), 'gf': round(gf), 'gs': gs, 'gsq': gsq if gs else None, 'use': use, 'fn': fn, 'typ': typ, 'k': k, 'r': est['form'],
                             'n': name, 'adr': adr[:60], 'utm': [round(b['rp'][0]), round(b['rp'][1])], 'kat': b['kat']})
        recs.sort(key=lambda r_: r_['id'])
        fr = G.S.tile_frame(G.LEVEL, tx, ty)
        doc = {'schema': G.SCHEMA, 'product': 'g', 'version': a.version, 'key': fr.key, 'o': fr.o_json(), 'utm': list(fr.utm),
               'frame': 'tile local: x = model x - o[0], y = model y - o[1] (model metres); heights true metres above the foot z0',
               'str': streets, 'fn': fnT, 'n': len(recs), 'b': recs}
        fn_out = os.path.join(out_root, str(G.LEVEL), str(tx), f'{ty}.json')
        G.write_json(fn_out, doc)
        sz = os.path.getsize(fn_out)
        total_bytes += sz
        nb += len(recs)
        index[f'{tx}/{ty}'] = [len(recs), sz]          # buildings, bytes
        if len(index) % 25 == 0:
            G.log('tiles', len(index), 'of', len(tkeys), 'buildings', nb, f'{total_bytes / 1e6:.1f} MB')
    # ---------------- index and statistics ----------------
    xs = [int(k.split('/')[0]) for k in index]
    ys = [int(k.split('/')[1]) for k in index]
    cx, cy = G.tile_of(*G.CENTRE)
    tl = sorted(((int(k.split('/')[0]), int(k.split('/')[1])) for k in index), key=lambda t_: (t_[1], t_[0]))
    idx = {'schema': G.SCHEMA, 'product': 'g', 'version': a.version, 'area': a.area, 'level': G.LEVEL,
           'frame': 'tile local (tools/suhl/lib/suhllib.py TileFrame): model metres relative to the tile centre o',
           'made': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'attribution': ATTR,
           'has': {str(G.LEVEL): G.S.tileset_encode(tl)},
           'sources': {'ethos': 'ETHOS.BUILDA v1.0.0, Zenodo 11845992, DEG.csv; ODbL 1.0', 'alkis': 'WFS ALKIS vereinfacht, ave:GebaeudeBauwerk; © GDI-Th, CC BY 4.0',
                       'osm': osm['source'] + (' ' + osm['stamp'] if osm['stamp'] else '') + '; © OpenStreetMap contributors, ODbL 1.0',
                       'dop': 'WMS th_dop (DOP20, flight 15.05.2024); © GDI-Th, CC BY 4.0' if a.dop else None,
                       'landmarks': 'docs/plans/suhl/wahrzeichen.md'},
           'model_scale': round(G.SCALE, 6), 'model_turn_deg': round(G.ROT, 5),
           'range': [min(xs), min(ys), max(xs), max(ys)], 'centre_tile': [cx, cy], 'buildings': nb, 'bytes': total_bytes, 'tiles': index}
    G.write_json(os.path.join(out_root, 'index.json'), idx)
    res = {'made': idx['made'], 'area': a.area, 'version': a.version, 'seconds': round(time.time() - t_start, 1), 'tiles': len(index), 'buildings': nb,
           'bytes': total_bytes, 'kb_per_building': round(total_bytes / 1024 / max(nb, 1), 2), 'centre_tile_present': f'{cx}/{cy}' in index,
           'ethos_in_frame': len(E), 'cadastre_in_frame': len(K), 'join': dict(st),
           'kat': {str(k): v for k, v in stats['kat'].items()}, 'src': dict(stats['src']), 'hq': {str(k): v for k, v in stats['hq'].items()},
           'kind': {str(k): v for k, v in sorted(stats['k'].items())}, 'use': dict(stats['use'].most_common()), 'typ': dict(stats['typ'].most_common()),
           'roof_form': {str(k): v for k, v in sorted(stats['r'].items())}, 'roof_rq': {str(k): v for k, v in sorted(stats['rq'].items())},
           'floors_gsq': {str(k): v for k, v in sorted(stats['gsq'].items())}, 'era': {str(k): v for k, v in sorted(stats['era'].items())},
           'era_q': {str(k): v for k, v in sorted(stats['eraq'].items())}, 'roof_class': {str(k): v for k, v in sorted(stats['cls'].items())},
           'roof_class_q': {str(k): v for k, v in sorted(stats['cq'].items())},
           'with_address': n_adr, 'with_name': n_name, 'with_osm': n_osm, 'with_street_side': n_front, 'with_shop_zone': n_shop, 'landmarks': n_lm,
           'monuments': n_dm, 'footprint_ha': round(sums['gf'] / 1e4, 2), 'floor_area_ha': round(sums['bgf'] / 1e4, 2), 'roof_area_ha': round(sums['dach'] / 1e4, 2),
           'function_to_use': {k: [stats['fn'][k], stats['fnmap'][k]] for k, _ in stats['fn'].most_common()},
           'tall': sorted(tall, key=lambda t_: -t_['hr'])}
    G.write_json(os.path.join(G.OUT, f'bauen_{a.area}.json') if not a.out else os.path.join(os.path.dirname(out_root.rstrip('/')), f'bauen_{a.area}.json'), res, compact=False)
    G.log(json.dumps({k: v for k, v in res.items() if k not in ('function_to_use', 'tall')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
