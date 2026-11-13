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


def tri_rings(rings):
    """a polygon given by its rings (outer first, then the holes) as triangles: (vertices (n, 2), triangles (m, 3), counter-clockwise)"""
    import mapbox_earcut as earcut
    vv = np.vstack(rings).astype(np.float64)
    ends = np.cumsum([len(r) for r in rings]).astype(np.uint32)
    tri = earcut.triangulate_float64(vv, ends).reshape(-1, 3)
    cr = ((vv[tri[:, 1], 0] - vv[tri[:, 0], 0]) * (vv[tri[:, 2], 1] - vv[tri[:, 0], 1])
          - (vv[tri[:, 1], 1] - vv[tri[:, 0], 1]) * (vv[tri[:, 2], 0] - vv[tri[:, 0], 0]))
    tri[cr < 0] = tri[cr < 0][:, ::-1]
    return vv, tri


def rgb(hexcol):
    """'#rrggbb' -> [r, g, b] in sRGB 0..1"""
    return [round(int(hexcol[i:i + 2], 16) / 255.0, 2) for i in (1, 3, 5)]


SECTORS = ('N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW')
# where a field comes from when a building says nothing else (the tile's `src`); a building's `src` lists only what differs
SRC0 = {'f': 'ethos', 'h': 'ethos', 'k': 'alkis', 'use': 'alkis', 'lv': 'alkis', 'adr': 'alkis', 'rk': 'dop', 'rc': 'dop'}


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
    s = g.simplify(0.15, preserve_topology=True)
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
    ap.add_argument('--dom', default=None, help='raw folder with DOM1 and DGM1 tiles of easygeodata (dom1/, dgm1/): roofs measured on the surface model')
    ap.add_argument('--zensus', default=None, help='the census grid cells of Suhl (zensus.py --filter): era class of houses from their 100 m cell')
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
        # the tile: where the middle of the footprint's corners lies (the rule of the data contract's validator)
        c_ = np.array(b['p'].exterior.coords)[:-1]
        b['tile'] = G.tile_of(float(c_[:, 0].mean()), float(c_[:, 1].mean()))
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
        b['kq'] = useq if khint is not None else 0
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

    zgrid = None
    if a.zensus and os.path.exists(a.zensus):
        import zensus as ZS
        try:
            zgrid = ZS.Grid(a.zensus)
            G.log('census grid: cells with buildings by year', zgrid.n)
            if zgrid.n < 50:
                zgrid = None
        except Exception as ex:
            G.log('census grid not usable:', repr(ex)[:200])
    zstat = Counter()
    dom = None
    if a.dom and os.path.isdir(os.path.join(a.dom, 'dom1')) and (os.path.isdir(os.path.join(a.dom, 'dgm1')) or os.path.isdir(os.path.join(a.dom, 'ndom1'))):
        import dom as DM
        dom = DM.Dom(a.dom)
        G.log('surface model: tiles in', a.dom, {k_: len(os.listdir(os.path.join(a.dom, k_))) for k_ in ('dom1', 'dgm1', 'ndom1') if os.path.isdir(os.path.join(a.dom, k_))})
    elif a.dom:
        G.log('no DOM1 / DGM1 tiles in', a.dom, '- the roofs stay estimates by rule')
    dstat = {'why': Counter(), 'form': Counter(), 'flat_flip': Counter(), 'ridge_turned': 0, 'both_pitched': 0, 'de': [], 'dp': [], 'h_new': 0, 'gone': 0,
             'gone_seen': 0, 'dh': [], 'newer': 0}
    photo = None
    if a.dop:
        import dachbild as LB
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
             'kat': Counter(), 'src': Counter(), 'cls': Counter(), 'cq': Counter(), 'fn': Counter(), 'fnmap': {}, 'hq': Counter(),
             'rk': Counter(), 'use_out': Counter(), 'bt': Counter(), 'fg': Counter(), 'r_out': Counter(), 'lv_unfit': Counter()}
    made = time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime())
    n_tief = 0
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
        recs, tief, fat, fat_idx = [], [], [], {}
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
            # the surface model: the cells of this footprint as heights above its foot
            cells = None
            newer = False
            h_src = 'ethos' if hq == 2 else 'regel'
            if dom is not None and k != 8:
                cells = DM.measure(dom, p)
                if cells[0] is not None:
                    top = cells[3]['top']
                    if hq == 2:
                        dstat['dh'].append(top - h)
                    if b['kat'] == 0:
                        dstat['gone_seen'] += 1
                        dstat['gone'] += 1 if top < 2.0 else 0
                    if hq == 0 and top >= 2.2:
                        h, hq, h_src = float(top) + 0.2, 1, 'dom1'      # a building only the cadastre knows: its height measured
                        dstat['h_new'] += 1
                    elif hq == 0 and b['src'] == 'k' and top < 1.5 and k not in (3, 8):
                        newer = True        # in the cadastre, but the surface model shows the ground: built after the laser flight
                        dstat['newer'] += 1
            # the roof (estimate)
            ridge = D.ridge_from_neighbours(p, mains, sh) if k in (0, 6) and mains else None
            iv = None
            rel = robust(affinity.translate(p, -ec, -nc))
            if img is not None and k in (0, 1) and sh['A'] >= 60:
                iv = img.roof_hints(p, sh)
            sh_rel = dict(sh)
            sh_rel['ctr'] = np.array(sh['ctr']) - np.array([ec, nc])
            est = D.estimate(sh_rel, h, k, typ, use, gs, ot, ridge, iv, part=part_of is not None)
            r_src = 'osm' if est['rq'] == 2 else 'dop' if est['rq'] == 1 else 'regel'
            e_dom = False
            if cells is not None and k in (0, 1, 2, 6):
                if cells[0] is None:
                    dstat['why'][cells[3]['why']] += 1
                else:
                    fitd, info = DM.fit_building(dom, p, sh, h if hq >= 1 else None, k, cells)
                    if fitd is None:
                        dstat['why'][info['why']] += 1
                    elif fitd.get('partial'):
                        # not flat, but no simple roof fits: eave and top from the surface, the form stays the rule's (a flat rule becomes pitched)
                        dstat['why']['nur Höhen'] += 1
                        f_new = est['form'] if est['form'] != 0 else (3 if (typ == 'block' and sh['A'] >= 300) else 2)
                        if est['form'] == 0:
                            dstat['flat_flip']['regel flach -> gemessen geneigt (nur Höhen)'] += 1
                        top_ = min(h, fitd['top']) if hq >= 1 else fitd['top']
                        ev_ = min(max(fitd['eave'], 2.2), top_ - 0.5)
                        span_ = est['Wd'] if f_new == 1 else est['Wd'] / 2
                        dstat['de'].append(abs(est['eave'] - ev_))
                        est = dict(est, form=f_new, eave=ev_, rise=top_ - ev_, pitch=math.degrees(math.atan2(top_ - ev_, max(span_, 0.5))), rq=1)
                        est.pop('planes', None)
                        r_src, e_dom = 'dom1', True
                    else:
                        dstat['why']['gemessen'] += 1
                        dstat['form'][(est['form'], fitd['form'])] += 1
                        if (est['form'] == 0) != (fitd['form'] == 0):
                            dstat['flat_flip']['regel flach -> gemessen geneigt' if est['form'] == 0 else 'regel geneigt -> gemessen flach'] += 1
                        elif est['form'] != 0:
                            dstat['both_pitched'] += 1
                            dstat['ridge_turned'] += 1 if abs(float(np.asarray(est['ux']) @ fitd['ux'])) < 0.5 else 0
                            dstat['dp'].append(abs(est['pitch'] - fitd['pitch']))
                        dstat['de'].append(abs(est['eave'] - fitd['eave']))
                        est = dict(est, form=fitd['form'], pitch=fitd['pitch'], eave=fitd['eave'], rise=fitd['rise'], ux=fitd['ux'], Wd=fitd['Wd'], Lr=fitd['Lr'],
                                   planes=fitd['planes'], rq=1, rs=est['rs'] if fitd['form'] != 0 else None)
                        r_src, e_dom = 'dom1', True
            # floors that do not fit the eave we now have (1.9 to 6.5 m per floor): kept aside, estimated below
            gs_unfit = bool(gs and k == 0 and not (1.9 * gs <= max(est['eave'], 2.0) + 1.0 and est['eave'] <= 6.5 * gs + 3.0))
            faces, walls, rings = D.build(rel, est, sid, k, bool(others))
            # floors that do not fit under the measured height (a low part of a taller house): kept aside as lvk, estimated from the eave
            gs_src = None
            if gs and (est['gs_fit'] is None or gs_unfit):
                gs_src, gs, gsq = gs, None, 0
                stats['lv_unfit'][k] += 1
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
            era, eraq, year = RG.era_of(typ, use, ot, lm['year'] if lm else None, oldtown)
            era_src = ('osm' if (ot or {}).get('start_date') else 'wissen') if eraq else 'regel'
            if zgrid is not None and k == 0 and part_of is None and not eraq and typ not in ('hochhaus', 'platte'):
                # the census grid: the age class most buildings of this 100 m cell have
                ze = zgrid.era(b['rp'][0], b['rp'][1])
                if ze is not None:
                    if ze[1] >= 0.6:
                        era, eraq, era_src = ze[0], 1, 'zensus'
                        zstat['klar'] += 1
                    elif era == 0:
                        era, era_src = ze[0], 'zensus'
                        zstat['haeufigste'] += 1
                    else:
                        zstat['regel bleibt'] += 1
                else:
                    zstat['keine Zelle'] += 1
            # the colours of a part follow its main building (the same choice from the palette)
            fa = F.params(part_of['id'] if part_of is not None else sid, typ, k, use, gs, gsq, est['eave'], ot, era, narrow=sh['Wd'] < 3.0)
            # shops and amenities inside (or within 2 m of) the footprint: the ground-floor shop zone and the signs
            shops = []
            if ptree is not None and k in (0, 1, 6):
                for j in ptree.query(p.buffer(2.0)):
                    nm, kd, e, n, pid = pois[j]
                    if p.distance(Point(e, n)) <= 2.0:
                        shops.append((nm, kd, e, n))
            name, nq, nsrc = None, 0, None
            for cand, q_, s_src in (((alk or {}).get('name'), 2, 'alkis'), (ot.get('name'), 1, 'osm'),
                                    (lm['name'] if lm and lm['nr'].startswith('Z') and oid_ in lm['osm'] else None, 1, 'wissen')):
                if cand and cand.strip():
                    name, nq, nsrc = cand.strip(), q_, s_src
                    break
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
            rc = None
            if img is not None:
                rc = LB.roof_classes(img, [(affinity.translate(f_['_pg'], ec, nc) if f_['_pg'] is not None else None, f_['sl'], f_['a']) for f_ in faces], k, ot)
            for fi_, f_ in enumerate(faces):
                cls, col, cq = rc[fi_] if rc is not None else (None, None, 0)
                if cls is None:
                    cls, col, cq = (4, '#6f6f6c', 0) if est['form'] == 0 else (5, '#9a9c9e', 0) if k == 1 else (0, '#a8523a', 0)
                    if k == 2 and est['form'] != 0:
                        cls, col = 4, '#5f5d5a'
                f_['c'], f_['col'], f_['cq'] = cls, col, cq
                del f_['_pg']
                stats['cls'][cls] += 1
                stats['cq'][cq] += 1
            gf = b['p'].area   # the footprint as the source gives it, true m² in UTM (the simplified outline differs by less than 1 %)
            adr, adr_q = (alk or {}).get('adr') or '', 2
            if not adr:
                adr_q = 0
                if ot.get('addr:street') and ot.get('addr:housenumber'):
                    adr, adr_q = ot['addr:street'] + ' ' + ot['addr:housenumber'], 1
            form = est['form']
            # statistics (our own categories; the contract's words follow below)
            for key, val in (('k', k), ('use', use), ('typ', typ), ('r', form), ('rq', est['rq']), ('era', era), ('eraq', eraq), ('kat', b['kat']),
                             ('src', b['src']), ('hq', hq)):
                stats[key][val] += 1
            stats['gsq'][gsq if gs else -1] += 1
            stats['fn'][fn or '(nicht im Kataster)'] += 1
            stats['fnmap'][fn or '(nicht im Kataster)'] = use
            if k == 8:
                # an underground car park: nothing to draw above ground - kept beside the buildings (private field of the tile)
                tief.append({'id': sid, 'f': flat2(rings[0]), 'fkt': fn, 'adr': adr, 'fa': G.r1(gf)})
                continue
            rec = {'id': sid, 'f': flat2(rings[0])}
            if len(rings) > 1:
                rec['fh'] = [flat2(r) for r in rings[1:]]
            rec['k'] = RG.KIND_OUT[k]
            hh_ = G.r2(h)
            ee_ = min(G.r2(est['eave']), hh_)
            rec['h'], rec['e'] = hh_, ee_
            rec['r'] = RG.ROOF_FORM_OSM.get(est['rs'], form) if est['rs'] else form
            if rec['r'] == 0:
                rec['fl'] = 1
            if form != 0:
                mx, my = G.local(est['ux'][0], est['ux'][1])
                az_ = round(math.degrees(math.atan2(mx, my)) % 180.0, 1)
                rec['az'] = 0.0 if az_ >= 180.0 else az_          # the ridge, clockwise from the model's +y axis
                rec['p'] = round(est['pitch'], 1)
            rec['rq'] = 1 if est['rq'] >= 1 else 0
            # the roof: one mesh (rv, rt) and its faces (R)
            by = {}
            for f_ in faces:
                by[f_['c']] = by.get(f_['c'], 0.0) + f_['a']
            top_c = max(by, key=by.get)
            wsum = sum(f_['a'] for f_ in faces if f_['c'] == top_c) or 1.0
            rcol = [round(sum(rgb(f_['col'])[i_] * f_['a'] for f_ in faces if f_['c'] == top_c) / wsum, 2) for i_ in range(3)]
            rec['rk'], rec['rc'] = RG.ROOF_CLASS_OUT[top_c], rcol
            rv, rt, R = [], [], []
            ro = {}
            if form == 0:
                vv, tri = tri_rings(rings)
                lx, ly = G.local(vv[:, 0], vv[:, 1])
                for x_, y_ in zip(lx, ly):
                    rv += [G.r2(x_), G.r2(y_), ee_]
                rt = [int(q_) for q_ in tri.ravel()]
                a_ = max(0.1, faces[0]['a'])
                R.append({'vi': [0, len(vv)], 'ti': [0, len(tri)], 'c': RG.ROOF_CLASS_OUT[faces[0]['c']], 'sl': 0, 'a': a_})
            else:
                for f_ in faces:
                    v3 = np.asarray(f_['v'], dtype=float).reshape(-1, 3)
                    base, t0 = len(rv) // 3, len(rt) // 3
                    lx, ly = G.local(v3[:, 0], v3[:, 1])
                    for x_, y_, z_ in zip(lx, ly, v3[:, 2]):
                        rv += [G.r2(x_), G.r2(y_), G.r2(min(z_, hh_))]
                    rt += [int(q_) + base for q_ in f_['t']]
                    a_ = max(0.1, f_['a'])
                    o_ = {'vi': [base, len(v3)], 'ti': [t0, len(f_['t']) // 3], 'c': RG.ROOF_CLASS_OUT[f_['c']], 'sl': f_['sl'], 'az': f_['az'], 'a': a_,
                          'ap': max(0.1, min(a_, round(a_ * math.cos(math.radians(f_['sl'])), 1)))}
                    c_ = rgb(f_['col'])
                    if max(abs(c_[i_] - rcol[i_]) for i_ in range(3)) > 0.02:
                        o_['col'] = c_
                    if f_['az'] is None or f_['sl'] < 6.0:
                        o_.pop('az') if f_['az'] is None else None
                        sec = 'flach'
                    else:
                        sec = SECTORS[int(((f_['az'] + 22.5) % 360.0) // 45.0)]
                    ro[sec] = ro.get(sec, 0.0) + a_
                    R.append(o_)
            rec['rv'], rec['rt'], rec['R'] = rv, rt, R
            cqm = max(f_['cq'] for f_ in faces)
            # the walls (F) and what is known about each side (S, one entry per wall)
            Fw, So, any_s, sq = [], [], False, 0
            fa_out = None
            if fa is not None:
                # what is the same for all houses of a kind goes into the tile's table fat, the house keeps its own values
                common = {'mat': F.MAT[fa['mat']], 'col2': rgb(fa['col2']), 'sock': fa['sock']}
                if fa.get('win'):
                    common['win'] = fa['win']
                if fa.get('balk'):
                    common['balk'] = F.BALK[fa['balk']]
                ck_ = json.dumps(common, sort_keys=True)
                if ck_ not in fat_idx:
                    fat_idx[ck_] = len(fat)
                    fat.append(common)
                # storeys: the building's lv; storey height hf = (e - sock) / lv and ground floor h0 = hf unless given here
                fa_out = {'t': fat_idx[ck_], 'col': rgb(fa['col'])}
                if not gs:
                    fa_out['lv'] = int(fa['gs'])
            for i_, s_ in enumerate(S):
                ax, ay = G.local(s_[0], s_[1])
                bx, by_ = G.local(s_[2], s_[3])
                L_ = math.hypot(s_[2] - s_[0], s_[3] - s_[1])
                u_ = round(min(1.0, max(0.0, s_[5] / L_)), 2) if L_ > 1e-6 else 0.5
                Fw.append([G.r2(ax), G.r2(ay), G.r2(bx), G.r2(by_), min(s_[4], hh_), u_, min(s_[6], hh_), min(s_[7], hh_), s_[8] & 1,
                           G.r1(s_[9]) if s_[9] >= 0 else 99])
                o_ = {}
                q_ = 0
                if s_[8] & 8:
                    if s_[10] >= 0:
                        o_['st'] = streets[s_[10]]
                    else:
                        o_['sd'] = G.r1(s_[9])     # an unnamed road; the distance of every wall is also the last number of its row in F
                    q_ = 1
                if s_[8] & 4:
                    o_['hof'] = 1
                sp = Sp.get(i_)
                if sp:
                    if sp.get('eg'):
                        o_['eg'] = 'laden'
                    if sp.get('sign'):
                        o_['sign'] = sp['sign']
                    q_ = 1
                if o_:
                    o_['q'] = q_
                    sq = max(sq, q_)
                    any_s = True
                So.append(o_ or None)
            rec['F'] = Fw
            if any_s:
                rec['S'] = So
            if fa_out is not None:
                fq = 1 if (gsq >= 1 or fa.get('q')) else 0
                if fq:
                    fa_out['q'] = fq
                rec['fas'] = fa_out      # the facade parameters of all sides by rule (merged over fat[t] of the tile); a side of S overrides single values
            if gs:
                rec['lv'] = int(gs)
            if gs_src:
                rec['lvk'] = int(gs_src)
            uw, egw = RG.use_word(use, fn, ot, k)
            rec['use'] = uw
            shop_zone = any(v.get('eg') for v in Sp.values())
            if uw == 'wohnen' and (egw or shop_zone):
                rec['eg'] = 'handel'
            if fn:
                rec['fkt'] = fn
            rec['era'] = era
            if year:
                rec['yr'] = int(year)
            rec['bt'] = RG.BT_OUT[typ]
            if name:
                rec['n'] = name
                n_name += 1
            if adr:
                rec['adr'] = adr
                n_adr += 1
            if oid_:
                rec['osm'] = oid_
                n_osm += 1
            fg = (1 if 'lm' in fl else 0) | (2 if 'dm' in fl else 0) | (4 if 'in' in fl else 0) | (32 if b['kat'] == 0 else 0) | (64 if b['src'] == 'k' else 0) \
                | (128 if newer else 0)
            if fg:
                rec['fg'] = fg
            if 'lm' in fl:
                rec['lm'] = fl['lm']
            if rec_bt:
                rec['teil'] = rec_bt
            if b['kat'] != 2:
                rec['kat'] = b['kat']
            if Sp:
                n_shop += 1
            if front:
                n_front += 1
            # scenario numbers: true m² and m³, computed in UTM
            rf = round(sum(max(0.1, f_['a']) for f_ in faces), 1)
            vol = gf * (ee_ + (hh_ - ee_) * (0.5 if form in (1, 2) else (1.0 / 3.0) if form == 3 else 0.0)) if form else gf * hh_
            d = {'fa': max(1.0, G.r1(gf))}
            dq = {'rf': rec['rq'], 'ro': rec['rq'], 'vol': 1 if (hq == 2 and form == 0) else 0}
            if gs and k in (0, 1, 6):
                d['gfa'] = max(1, int(round(gf * gs)))      # gross floor area above ground = footprint x floors (lv)
                dq['lv'] = dq['gfa'] = gsq
            d['rf'] = max(1.0, rf)
            # (the roof area by direction is not repeated here: every face of R carries its area `a` and its direction `az`)
            # the quality of these numbers follows from the building's q.lv (floors, floor area) and rq (roof areas)
            rec['d'] = d
            # quality and source of every field (absent = 0 = rule or assumption; absent source = regel)
            q = {'f': 2, 'h': hq, 'e': 1 if (e_dom or (form == 0 and hq == 2)) else 0, 'k': b['kq'], 'use': b['useq'] if use != 'unbekannt' else 0,
                 'lv': gsq if gs else 0, 'era': eraq, 'yr': 1 if year else 0, 'rk': 1 if cqm else 0, 'rc': 1 if cqm else 0, 'n': nq, 'adr': adr_q if adr else 0,
                 'eg': 1 if (rec.get('eg') and shop_zone) else 0}
            rec['q'] = {kk: vv_ for kk, vv_ in q.items() if vv_}
            if not rec['q']:
                rec['q'] = {'f': 2}
            src = {'f': 'alkis' if b['src'] == 'k' else 'ethos', 'h': h_src}
            if r_src != 'regel':
                src['r'] = r_src
            # (the eave measured on the surface model has q.e 1; its source is that of the roof, src.r)
            for kk, q_ in (('k', b['kq']), ('use', q.get('use', 0)), ('lv', q.get('lv', 0)), ('adr', q.get('adr', 0))):
                src[kk] = 'alkis' if q_ == 2 else 'osm' if q_ == 1 else 'regel'
            if not gs:
                src.pop('lv')
            if not adr:
                src.pop('adr')
            src['rk'] = 'osm' if cqm == 2 else 'dop' if cqm else 'regel'
            src['rc'] = 'dop' if cqm else 'regel'
            if name:
                src['n'] = nsrc
            if era_src != 'regel':
                src['era'] = era_src
            # only what differs from the tile's default sources (SRC0) is written with the building
            src = {kk: vv_ for kk, vv_ in src.items() if SRC0.get(kk) != vv_}
            if src:
                rec['src'] = src
            recs.append(rec)
            sums['gf'] += gf
            sums['bgf'] += d.get('gfa', 0)
            sums['dach'] += rf
            n_lm += 1 if 'lm' in fl else 0
            n_dm += 1 if 'dm' in fl else 0
            for cc in ('rk',):
                stats['rk'][rec['rk']] += 1
            stats['use_out'][rec['use']] += 1
            stats['bt'][rec['bt']] += 1
            stats['fg'][rec.get('fg', 0)] += 1
            stats['r_out'][rec['r']] += 1
            if h >= 25:
                tall.append({'id': sid, 'h': G.r1(h), 'fa': round(gf), 'lv': gs, 'q_lv': gsq if gs else None, 'use': rec['use'], 'fkt': fn, 'bt': rec['bt'], 'k': rec['k'],
                             'r': rec['r'], 'n': name, 'adr': adr[:60], 'utm': [round(b['rp'][0]), round(b['rp'][1])], 'kat': b['kat']})
        recs.sort(key=lambda r_: r_['id'])
        fr = G.S.tile_frame(G.LEVEL, tx, ty)
        if not recs and not tief:
            continue
        doc = {'schema': G.S.SCHEMA, 'product': 'g', 'key': fr.key, 'o': fr.o_json(), 'made': made, 'n': len(recs), 'src': SRC0, 'fat': fat, 'b': recs}
        if tief:
            doc['tief'] = tief          # underground car parks: footprints only, not drawn
            n_tief += len(tief)
        fn_out = os.path.join(out_root, str(G.LEVEL), str(tx), f'{ty}.json')
        G.write_json(fn_out, doc)
        sz = os.path.getsize(fn_out)
        total_bytes += sz
        nb += len(recs)
        index[f'{tx}/{ty}'] = [len(recs), sz]          # buildings, bytes
        if len(index) % 25 == 0:
            G.log('tiles', len(index), 'of', len(tkeys), 'buildings', nb, f'{total_bytes / 1e6:.1f} MB')
    # ---------------- index and statistics ----------------
    if a.area == 'stadt' and not index:
        raise SystemExit('no tile written')
    cx, cy = G.tile_of(*G.CENTRE)
    sys.path.insert(0, os.path.join(G.REPO, 'tools', 'suhl', 'lib'))
    from schema import index as IX       # the common index of the data contract (suhl-daten)
    sources = ['ethos', 'alkis', 'osm'] + (['dop'] if a.dop else []) + ['wissen', 'regel']
    if zgrid is not None and (zstat['klar'] or zstat['haeufigste']):
        sources.insert(-2, {'id': 'zensus', 'title': 'Zensus 2022, Gitterdaten 100 m: Gebäude nach Baujahr', 'by': 'Statistische Ämter des Bundes und der Länder',
                            'licence': 'offene Daten mit Quellenangabe (Lizenzname für die Gitterdaten nicht geprüft)', 'url': 'https://www.zensus2022.de', 'date': '2022-05-15',
                            'attribution': '© Statistische Ämter des Bundes und der Länder, Zensus 2022'})
    if dom is not None and dstat['why'].get('gemessen'):
        sources = sources[:-2] + [IX.source('dom1', via='bezogen über easygeodata.de'), IX.source('dgm1', via='bezogen über easygeodata.de')] + sources[-2:]
    note = ('Ein Datensatz je Gebäudekörper des Katasters/LoD2. Dach: gemessen am Oberflächenmodell (src.r dom1), sonst OSM-Angabe, Luftbild oder '
            'Regel (rq 0); Dachdeckung und -farbe aus dem Luftbild; Fassaden nach Regeln (fas + Kachel-Tabelle fat, Güte 0-1). Die Kachel nennt in '
            'src die übliche Quelle je Feld, ein Gebäude nur Abweichungen. fg 32 = nicht mehr im Kataster (nicht zeichnen), 64 = nur im Kataster.')
    extra = {'counts': index, 'centre_tile': [cx, cy], 'osm': (osm['source'] + ' ' + osm['stamp']).strip()}
    idx = IX.make_index(out_root, 'g', a.version, a.area, sources, note=note, extra=extra,
                        run=os.environ.get('GITHUB_RUN_ID') and {'id': os.environ['GITHUB_RUN_ID'], 'workflow': 'suhl-gebaeude.yml'})
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
           'dom': None if dom is None else {
               'tiles_read_missing': len(dom.missing), 'fit': dict(dstat['why']),
               'form_rule_to_measured': {f'{a_}->{b_}': v for (a_, b_), v in sorted(dstat['form'].items())},
               'form_changed': sum(v for (a_, b_), v in dstat['form'].items() if a_ != b_), 'form_same': sum(v for (a_, b_), v in dstat['form'].items() if a_ == b_),
               'flat_or_pitched_changed': dict(dstat['flat_flip']), 'both_pitched': dstat['both_pitched'], 'ridge_turned': dstat['ridge_turned'],
               'eave_change_m': {'median': round(float(np.median(dstat['de'])), 2), 'p90': round(float(np.percentile(dstat['de'], 90)), 2)} if dstat['de'] else None,
               'pitch_change_deg': {'median': round(float(np.median(dstat['dp'])), 1), 'p90': round(float(np.percentile(dstat['dp'], 90)), 1)} if dstat['dp'] else None,
               'height_surface_minus_ethos_m': {'median': round(float(np.median(dstat['dh'])), 2), 'p10': round(float(np.percentile(dstat['dh'], 10)), 2),
                                                'p90': round(float(np.percentile(dstat['dh'], 90)), 2), 'n': len(dstat['dh'])} if dstat['dh'] else None,
               'heights_measured_for_cadastre_only': dstat['h_new'], 'cadastre_only_not_in_surface_model': dstat['newer'], 'not_in_cadastre_seen': dstat['gone_seen'], 'not_in_cadastre_flat_ground': dstat['gone']},
           'zensus': None if zgrid is None else dict(zstat, cells=zgrid.n),
           'underground': n_tief, 'floors_not_fitting_height': {str(k): v for k, v in sorted(stats['lv_unfit'].items())},
           'use_out': dict(stats['use_out'].most_common()), 'bt': dict(stats['bt'].most_common()), 'rk': {str(k): v for k, v in sorted(stats['rk'].items())},
           'fg': {str(k): v for k, v in sorted(stats['fg'].items())}, 'r_out': {str(k): v for k, v in sorted(stats['r_out'].items())},
           'tall': sorted(tall, key=lambda t_: -t_['h'])}
    G.write_json(os.path.join(G.OUT, f'bauen_{a.area}.json') if not a.out else os.path.join(os.path.dirname(out_root.rstrip('/')), f'bauen_{a.area}.json'), res, compact=False)
    G.log(json.dumps({k: v for k, v in res.items() if k not in ('function_to_use', 'tall')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
