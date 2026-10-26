"""Detail zone Suhl (~13 km NNW of the garden): the town in the valley of the Lauter and the Hasel - the Zentrum (Markt, Rathaus,
Hauptkirche St. Marien, Kreuzkirche, Steinweg, Malzhaus with the Waffenmuseum, Congress Centrum Suhl at the Platz der Deutschen Einheit),
the Suhler Aue with its sports ground and housing estate, Suhl-Nord (WBS 70 blocks) - from OpenStreetMap; roof colours from the orthophoto.
Two modes:
  python3 -I tools/welt/zone_suhl.py --routes --raw <cache> --plan <plan.json> [--out viz3/extra/suhl/dist/suhl]
      the two drives garden -> Markt Suhl (country road, motorway A73/A71) from OSM, their corridors (+600 m) as tile masks of levels 10
      and 11 and the town block of level 12 -> plan.json for tools/welt/build.py --plan S --planfile (and routes.json for the app)
  python3 -I tools/welt/zone_suhl.py --raw <cache> [--out viz3/extra/suhl/dist/suhl]
      the town -> index.json (areas, landmarks, streets, places, lamps, benches, stops, trees, cells) and c/<i>_<j>.json (buildings of
      400 m cells in the zone_vessra.py layout plus the OSM id and a few tags) - loaded by viz3/src/welt/suhl.js cell by cell
Coordinates: the app's model metres (x east, y north; wlib.model_from_utm), heights relative to each building's foot.
Sources: © OpenStreetMap contributors (ODbL 1.0), DOP © GDI-Th (CC BY 4.0) for the roof colours."""
import argparse, json, math, os, sys, time, zlib
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wlib
from wlib import log, XF, model_from_utm, tsize, tbounds, ROOT_E0, ROOT_N0, http_get
from zone_schleusingen import roof_faces, walls_of, hsl

MARKT_LL = (50.6097, 10.6928)          # Markt Suhl (lat, lon), refined from OSM (the square or the Rathaus)
BBOX = (10.625, 10.570, 10.765, 10.660)  # w, s, e, n: the town and its edges (OSM)
HALF = 3400.0                           # buildings within this distance (model m) of the Markt are exported
CELL = 400.0
ROUTE_BBOX = (10.600, 10.470, 10.830, 10.665)   # roads for the drives garden -> Suhl
MARGIN = 600.0
SMALL = {'garage', 'garages', 'shed', 'carport', 'hut', 'roof', 'kiosk', 'toilets', 'service', 'transformer_tower', 'allotment_house', 'cabin'}
BIG = {'barn', 'farm_auxiliary', 'agricultural', 'industrial', 'warehouse', 'stable', 'cowshed', 'hangar', 'greenhouse', 'manufacture',
       'sports_hall', 'supermarket', 'storage_tank', 'silo', 'train_station', 'retail', 'commercial', 'grandstand', 'parking'}
STREET_KIND = {'motorway': 0, 'motorway_link': 0, 'trunk': 1, 'trunk_link': 1, 'primary': 1, 'primary_link': 1, 'secondary': 1,
               'secondary_link': 1, 'tertiary': 2, 'tertiary_link': 2, 'unclassified': 3, 'residential': 3, 'living_street': 3,
               'pedestrian': 4, 'service': 5, 'track': 6, 'path': 7, 'cycleway': 7, 'footway': 8, 'steps': 8}
KEEP_TAGS = ('building', 'name', 'addr:street', 'addr:housenumber', 'building:levels', 'roof:shape', 'roof:levels', 'height', 'amenity',
             'shop', 'tourism', 'historic', 'leisure', 'office', 'heritage', 'start_date', 'building:material', 'roof:material',
             'building:colour', 'roof:colour', 'operator', 'religion', 'denomination', 'wikidata', 'wikipedia')


def r2(v):
    return round(float(v), 2)


QUERY_ALL = '[out:json][timeout:240][bbox:{s},{w},{n},{e}];(nwr;);out body;>;out skel qt;'
QUERY_ROADS = ('[out:json][timeout:240][bbox:{s},{w},{n},{e}];(way["highway"~"^(motorway|motorway_link|trunk|trunk_link|primary|primary_link|'
               'secondary|secondary_link|tertiary|tertiary_link|unclassified|residential|living_street)$"];);out body;>;out skel qt;')


def overpass(raw, name, q):
    from fetch import OVERPASS, osm_from_overpass
    p = os.path.join(raw, 'osm', name)
    if os.path.exists(p):
        return json.load(open(p))
    os.makedirs(os.path.dirname(p), exist_ok=True)
    for url in OVERPASS[:3]:
        try:
            st, b, ct = http_get(url, tries=1, timeout=300, data={'data': q})
            if st == 200 and b[:1] == b'{':
                j = json.loads(b)
                if j.get('remark') and ('error' in j['remark'].lower() or 'timed out' in j['remark'].lower()):
                    log('Overpass', url, 'remark', j['remark'][:200])
                    continue
                d = osm_from_overpass(j)
                d['fetched'] = time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())
                json.dump(d, open(p, 'w'))
                log('Overpass', url, len(b), 'bytes', {k: len(v) for k, v in d.items() if isinstance(v, dict)})
                return d
            log('Overpass', url, st, ct, b[:200])
        except Exception as ex:
            log('Overpass', url, 'failed', repr(ex)[:200])
    return None


def fetch_town(raw):
    w, s, e, n = BBOX
    d = overpass(raw, f'suhl_all_{w}_{s}_{e}_{n}.json', QUERY_ALL.format(s=s, w=w, n=n, e=e))
    if d is None:
        from fetch import osm_from_api
        p = os.path.join(raw, 'osm', f'suhl_api_{w}_{s}_{e}_{n}.json')
        if os.path.exists(p):
            return json.load(open(p))
        d = osm_from_api(BBOX)
        d['fetched'] = time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime())
        json.dump(d, open(p, 'w'))
    return d


def utm_of(lat, lon):
    from pyproj import Transformer
    E, N = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True).transform(lon, lat)
    return E, N


def model_of(lat, lon):
    return model_from_utm(*utm_of(lat, lon))


# ---------------------------------------------------------------- routes and the tile plan ----------------------------------------------
def routes(a):
    from pyproj import Transformer
    from scipy.sparse import coo_matrix
    from scipy.sparse.csgraph import dijkstra
    w, s, e, n = ROUTE_BBOX
    osm = overpass(a.raw, f'suhl_roads_{w}_{s}_{e}_{n}.json', QUERY_ROADS.format(s=s, w=w, n=n, e=e))
    if osm is None:
        osm = geofabrik_roads(a.raw)
    tr = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
    ids = list(osm['nodes'].keys())
    lla = np.array([osm['nodes'][i][:2] for i in ids], float)
    E, N = tr.transform(lla[:, 0], lla[:, 1])
    idx = {k: i for i, k in enumerate(ids)}
    SPEED = {'motorway': 120, 'motorway_link': 60, 'trunk': 100, 'trunk_link': 50, 'primary': 90, 'primary_link': 50, 'secondary': 80,
             'secondary_link': 50, 'tertiary': 70, 'tertiary_link': 40, 'unclassified': 50, 'residential': 30, 'living_street': 10}
    edges = {'land': ([], [], []), 'bahn': ([], [], [])}
    wayof = {}
    for wid, (refs, tags) in osm['ways'].items():
        hw = tags.get('highway')
        if hw not in SPEED:
            continue
        ow = tags.get('oneway', 'no')
        motor = hw.startswith('motorway')
        one = 1 if (ow in ('yes', '1', 'true') or motor or tags.get('junction') == 'roundabout') else (-1 if ow == '-1' else 0)
        r = [idx[q] for q in refs if q in idx]
        for p, q in zip(r[:-1], r[1:]):
            L = math.hypot(E[q] - E[p], N[q] - N[p])
            t = L / (SPEED[hw] / 3.6)
            for mode in ('land', 'bahn'):
                if mode == 'land' and (motor or hw.startswith('trunk')):
                    continue
                tt = t * (1.0 if mode == 'bahn' or hw in ('secondary', 'primary', 'tertiary') else 1.15)
                I, J, W_ = edges[mode]
                if one >= 0:
                    I.append(p); J.append(q); W_.append(tt)
                if one <= 0:
                    I.append(q); J.append(p); W_.append(tt)
            wayof[(p, q)] = wayof[(q, p)] = (tags.get('ref', ''), tags.get('name', ''), hw)
    nn = len(ids)
    gE, gN = XF['ex'], XF['ey']
    mE, mN = utm_of(*MARKT_LL)
    def nearest(E0, N0, good):
        d = np.hypot(E - E0, N - N0)
        d[~good] = 1e12
        return int(np.argmin(d))
    has = np.zeros(nn, bool)
    for mode in edges:
        I, J, _ = edges[mode]
        has[I] = True
        has[J] = True
    a0 = nearest(gE, gN, has)
    b0 = nearest(mE, mN, has)
    out = {}
    for mode in ('land', 'bahn'):
        I, J, W_ = edges[mode]
        G = coo_matrix((W_, (I, J)), shape=(nn, nn)).tocsr()
        dist, pred = dijkstra(G, directed=True, indices=a0, return_predecessors=True)
        if not np.isfinite(dist[b0]):
            log('Route', mode, 'nicht gefunden')
            continue
        path = [b0]
        while path[-1] != a0:
            path.append(int(pred[path[-1]]))
        path = path[::-1]
        pts = [(float(E[i]), float(N[i])) for i in path]
        L = sum(math.hypot(pts[k + 1][0] - pts[k][0], pts[k + 1][1] - pts[k][1]) for k in range(len(pts) - 1))
        refs = []
        for p, q in zip(path[:-1], path[1:]):
            r_ = wayof.get((p, q), ('', '', ''))
            lab = r_[0] or r_[1]
            if lab and (not refs or refs[-1] != lab):
                refs.append(lab)
        ex = (min(p[0] for p in pts), min(p[1] for p in pts), max(p[0] for p in pts), max(p[1] for p in pts))
        out[mode] = {'pts': pts, 'len': L, 'min': dist[b0] / 60, 'via': refs, 'bounds': ex}
        log(f'Route {mode}: {L / 1000:.1f} km, {dist[b0] / 60:.1f} min, über {" → ".join(refs[:40])}')
        log(f'   UTM-Rahmen E {ex[0]:.0f}–{ex[2]:.0f}, N {ex[1]:.0f}–{ex[3]:.0f}; mit {MARGIN:.0f} m: E {ex[0] - MARGIN:.0f}–{ex[2] + MARGIN:.0f}, '
            f'N {ex[1] - MARGIN:.0f}–{ex[3] + MARGIN:.0f}')
    return out


def geofabrik_roads(raw):
    """fallback: the Thuringia extract of Geofabrik, roads inside ROUTE_BBOX (pyosmium)"""
    import osmium
    p = os.path.join(raw, 'geofabrik', 'thueringen-latest.osm.pbf')
    if not os.path.exists(p):
        os.makedirs(os.path.dirname(p), exist_ok=True)
        st, b, ct = http_get('https://download.geofabrik.de/europe/germany/thueringen-latest.osm.pbf', timeout=900)
        if st != 200:
            raise RuntimeError('Geofabrik ' + str(st))
        open(p, 'wb').write(b)
    w, s, e, n = ROUTE_BBOX
    nodes, ways = {}, {}

    class H(osmium.SimpleHandler):
        def way(self, wy):
            hw = wy.tags.get('highway')
            if not hw or hw not in ('motorway', 'motorway_link', 'trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link',
                                    'tertiary', 'tertiary_link', 'unclassified', 'residential', 'living_street'):
                return
            refs = []
            inside = False
            for nd in wy.nodes:
                if not nd.location.valid():
                    continue
                lo, la = nd.location.lon, nd.location.lat
                if w <= lo <= e and s <= la <= n:
                    inside = True
                nodes[str(nd.ref)] = [lo, la]
                refs.append(str(nd.ref))
            if inside and len(refs) > 1:
                ways[str(wy.id)] = [refs, {k.k: k.v for k in wy.tags}]
    H().apply_file(p, locations=True)
    log('Geofabrik: Straßen', len(ways))
    return {'nodes': nodes, 'ways': ways, 'rels': {}}


def plan(a):
    R = routes(a)
    mE, mN = utm_of(*MARKT_LL)
    # the town block of level 12: the Zentrum, the Aue, Suhl-Nord and the valley between them (from the town data when it is there)
    town = None
    ip = os.path.join(a.out, 'index.json')
    if os.path.exists(ip):
        try:
            town = json.load(open(ip)).get('det_utm')
        except Exception:
            town = None
    if not town:
        town = (mE - 1900.0, mN - 1700.0, mE + 1700.0, mN + 2300.0)
    det = wlib.aligned(12, town)
    near = (det[0] - 900, det[1] - 900, det[2] + 900, det[3] + 900)
    s11 = tsize(11)
    m11 = set()
    def add_box(bb):
        x0, y0, x1, y1 = wlib.trange(11, bb)
        for x in range(x0, x1 + 1):
            for y in range(y0, y1 + 1):
                m11.add((x, y))
    add_box(near)
    for mode, r in R.items():
        pts = np.array(r['pts'])
        # densify every 40 m, then every level-11 tile within MARGIN of the line
        dense = [pts[0]]
        for k in range(len(pts) - 1):
            L = np.hypot(*(pts[k + 1] - pts[k]))
            for t in np.arange(40.0, L, 40.0):
                dense.append(pts[k] + (pts[k + 1] - pts[k]) * t / L)
            dense.append(pts[k + 1])
        for E_, N_ in dense:
            add_box((E_ - MARGIN, N_ - MARGIN, E_ + MARGIN, N_ + MARGIN))
    # leave out what the test block (levels 8-11 over block B) and the Veßra block already have
    def inside(L, x, y, area):
        e0, n0, e1, n1 = tbounds(L, x, y)
        return e0 >= area[0] and n0 >= area[1] and e1 <= area[2] and n1 <= area[3]
    others = [wlib.BLOCK_B, wlib.VESSRA_BLK]
    m11 = {t for t in m11 if not any(inside(11, *t, o) for o in others)}
    # level 10: the parents; level 11 completed to whole parents (the app refines a level-10 tile only where all four children exist)
    m10 = {(x // 2, y // 2) for x, y in m11}
    m11 = {(2 * x + i, 2 * y + j) for x, y in m10 for i in (0, 1) for j in (0, 1)}
    m10 = {t for t in m10 if not any(inside(10, *t, o) for o in others)}
    def ext(L, S_):
        bbs = [tbounds(L, x, y) for x, y in S_]
        return (min(b[0] for b in bbs), min(b[1] for b in bbs), max(b[2] for b in bbs), max(b[3] for b in bbs))
    blk = wlib.aligned(8, wlib.union_area([ext(10, m10), ext(11, m11), det]))
    pl = {'plan': {str(L): list(blk) for L in (7, 8, 9, 10, 11)}, 'det': list(det), 'blk': list(blk)}
    pl['plan']['12'] = list(det)
    pl['mask'] = {'10': sorted([list(t) for t in m10]), '11': sorted([list(t) for t in m11])}
    n12 = len(wlib.tiles(12, det))
    log(f'Plan S: Stufe 12 {n12} Kacheln über E {det[0]:.0f}–{det[2]:.0f}, N {det[1]:.0f}–{det[3]:.0f}; Stufe 11 {len(m11)}, Stufe 10 {len(m10)}; '
        f'Block E {blk[0]:.0f}–{blk[2]:.0f}, N {blk[1]:.0f}–{blk[3]:.0f}')
    log(f'Schätzung: {(n12 + len(m11) + len(m10)) * 0.05:.0f} MB (≈ 50 kB je Kachel)')
    pl['routes'] = {m: {'len_km': round(r['len'] / 1000, 2), 'min': round(r['min'], 1), 'via': r['via'], 'bounds_utm': [round(v) for v in r['bounds']],
                        'corridor_utm': [round(r['bounds'][0] - MARGIN), round(r['bounds'][1] - MARGIN), round(r['bounds'][2] + MARGIN), round(r['bounds'][3] + MARGIN)]}
                    for m, r in R.items()}
    json.dump(pl, open(a.plan, 'w'), indent=None, separators=(',', ':'))
    # the routes in model metres for the app and the drive (suhl-fahrt)
    os.makedirs(a.out, exist_ok=True)
    rj = {'src': 'Straßen © OpenStreetMap-Mitwirkende (ODbL 1.0)', 'generated': time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()), 'routes': {}}
    for m, r in R.items():
        P = np.array(r['pts'])
        x, y = model_from_utm(P[:, 0], P[:, 1])
        rj['routes'][m] = {'name': 'Landstraße' if m == 'land' else 'Autobahn', 'km': round(r['len'] / 1000, 2), 'via': r['via'],
                           'p': [r2(v) for xy in zip(x, y) for v in xy], 'corridor_utm': pl['routes'][m]['corridor_utm']}
    json.dump(rj, open(os.path.join(a.out, 'routes.json'), 'w'), ensure_ascii=False, separators=(',', ':'))


# ---------------------------------------------------------------- the town -----------------------------------------------------------
class OrthoWMS:
    """orthophoto colours from one WMS image over the zone (~1.4 m per pixel), cached in <raw>/dop"""
    def __init__(self, raw, cE, cN, half):
        from fetch import fetch_wms
        e0, n0, e1, n1 = math.floor(cE - half), math.floor(cN - half), math.ceil(cE + half), math.ceil(cN + half)
        w = h = 4800
        self.img = fetch_wms(raw, 'th_dop', (e0, n0, e1, n1), w, h)
        self.bb = (e0, n0, e1, n1)

    def __call__(self, E, N):
        e0, n0, e1, n1 = self.bb
        H, W = self.img.shape[:2]
        c, r = int((E - e0) / (e1 - e0) * W), int((n1 - N) / (n1 - n0) * H)
        if not (0 <= c < W and 0 <= r < H):
            return None
        return self.img[r, c] / 255.0


def num(v):
    try:
        return float(str(v).replace('m', '').replace(',', '.').strip())
    except (ValueError, TypeError):
        return None


def town(a):
    T0 = time.time()
    from pyproj import Transformer
    from shapely.geometry import Polygon, LineString, Point
    from shapely.geometry.polygon import orient
    from shapely.strtree import STRtree
    from buildings import rings_of
    osm = fetch_town(a.raw)
    tr = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
    ids = list(osm['nodes'].keys())
    lla = np.array([osm['nodes'][i][:2] for i in ids], float)
    E, N = tr.transform(lla[:, 0], lla[:, 1])
    mx, my = model_from_utm(np.asarray(E), np.asarray(N))
    nodeM = {i: (float(x), float(y)) for i, x, y in zip(ids, mx, my)}
    ways = osm['ways']
    line = lambda wid: [nodeM[r] for r in ways[wid][0] if r in nodeM]
    flat2 = lambda pts: [r2(v) for xy in pts for v in xy]
    a_, b_ = XF['a'], XF['b']
    toU = lambda x, y: (a_ * x - b_ * y + XF['ex'], b_ * x + a_ * y + XF['ey'])

    # ---- what the data say about the town: places, squares, sports grounds, landmarks (printed for the docs) ----
    def tagged(pred):
        res = []
        for nid, nd in osm['nodes'].items():
            if len(nd) > 2 and pred(nd[2]):
                res.append(('n' + nid, nd[2], nodeM[nid]))
        for wid, (refs, tags) in ways.items():
            if pred(tags):
                pts = line(wid)
                if pts:
                    res.append(('w' + wid, tags, tuple(np.mean(pts, axis=0))))
        for rid, (mem, tags) in osm['rels'].items():
            if pred(tags):
                pts = [p for t_, ref, _ in mem if t_ == 'way' and ref in ways for p in line(ref)]
                if pts:
                    res.append(('r' + rid, tags, tuple(np.mean(pts, axis=0))))
        return res
    report = {}
    for k, pred in {
        'places': lambda t: t.get('place') in ('suburb', 'quarter', 'neighbourhood', 'town', 'village', 'hamlet', 'locality', 'city_block'),
        'sport': lambda t: t.get('leisure') in ('stadium', 'sports_centre', 'pitch', 'track') and (t.get('name') or t.get('leisure') != 'pitch'),
        'church': lambda t: t.get('amenity') == 'place_of_worship' or t.get('building') in ('church', 'chapel'),
        'townhall': lambda t: t.get('amenity') == 'townhall',
        'museum': lambda t: t.get('tourism') == 'museum' or 'Malzhaus' in t.get('name', '') or 'Waffenmuseum' in t.get('name', ''),
        'ccs': lambda t: 'Congress' in t.get('name', '') or 'Einheit' in t.get('name', '') or 'CCS' == t.get('name', ''),
        'squares': lambda t: t.get('place') == 'square' or (t.get('highway') == 'pedestrian' and t.get('area') == 'yes') or 'Markt' in t.get('name', ''),
        'school': lambda t: t.get('amenity') in ('school', 'kindergarten'),
    }.items():
        report[k] = [(i, t.get('name', ''), t.get('leisure') or t.get('place') or t.get('amenity') or t.get('building') or '', r2(c[0]), r2(c[1]))
                     for i, t, c in tagged(pred)]
        log(f'== {k}: {len(report[k])}')
        for row in report[k][:60]:
            log('   ', *row)

    # the Markt: the square named Markt, else the Rathaus, else the constant
    MK = model_of(*MARKT_LL)
    cand = [r for r in report['squares'] if r[1] in ('Markt', 'Marktplatz')] or [r for r in report['townhall']]
    if cand:
        best = min(cand, key=lambda r: math.hypot(r[3] - MK[0], r[4] - MK[1]))
        if math.hypot(best[3] - MK[0], best[4] - MK[1]) < 600:
            MK = (best[3], best[4])
    log('Markt (Modell):', r2(MK[0]), r2(MK[1]))
    inz = lambda x, y: math.hypot(x - MK[0], y - MK[1]) <= HALF

    # ---- buildings ----
    feats = rings_of(osm, nodeM)
    polys = []
    for P, holes, tags, fid in feats:
        try:
            pg = Polygon(P, [h for h in holes if len(h) >= 3])
            if not pg.is_valid:
                pg = pg.buffer(0)
            if pg.geom_type == 'MultiPolygon':
                pg = max(pg.geoms, key=lambda g: g.area)
            if pg.geom_type != 'Polygon' or pg.area < 6:
                continue
        except Exception:
            continue
        c = pg.centroid
        if not inz(c.x, c.y):
            continue
        polys.append((orient(pg.simplify(0.15), 1.0), tags, fid))
    log('Gebäude in der Zone:', len(polys))
    tree = STRtree([p for p, _, _ in polys])

    # ---- streets ----
    streets = []
    for wid, (refs, tags) in ways.items():
        hw = tags.get('highway')
        if hw not in STREET_KIND or len(refs) < 2:
            continue
        pts = line(wid)
        if len(pts) < 2 or not any(inz(x, y) for x, y in pts):
            continue
        ls = LineString(pts).simplify(0.5)
        s = {'n': tags.get('name', ''), 'k': STREET_KIND[hw], 's': tags.get('surface', ''), 'p': flat2(ls.coords), '_ls': ls}
        if tags.get('ref'):
            s['r'] = tags['ref']
        if tags.get('bridge') in ('yes', 'viaduct'):
            s['b'] = 1
        if tags.get('tunnel') in ('yes', 'building_passage'):
            s['t'] = 1
        if tags.get('area') == 'yes':
            s['a'] = 1
        if hw == 'pedestrian':
            s['ped'] = 1
        streets.append(s)
    st_named = [s for s in streets if s['n'] and s['k'] <= 5]
    st_tree = STRtree([s['_ls'] for s in st_named]) if st_named else None
    log('Straßen:', len(streets), 'mit Namen:', len(st_named), 'Namen:', len({s['n'] for s in st_named}))

    # ---- areas of the town (for the style of the buildings) ----
    def area_polys(pred):
        out = []
        for wid, (refs, tags) in ways.items():
            if len(refs) >= 4 and refs[0] == refs[-1] and pred(tags):
                pts = line(wid)[:-1]
                if len(pts) >= 3:
                    try:
                        out.append((Polygon(pts).buffer(0), tags, 'w' + wid))
                    except Exception:
                        pass
        for rid, (mem, tags) in osm['rels'].items():
            if tags.get('type') == 'multipolygon' and pred(tags):
                from buildings import _join
                outers = [[r for r in ways[ref][0] if r in nodeM] for t_, ref, role in mem if t_ == 'way' and ref in ways and role != 'inner']
                for ring in _join(outers):
                    if len(ring) >= 4:
                        try:
                            out.append((Polygon([nodeM[r] for r in ring[:-1]]).buffer(0), tags, 'r' + rid))
                        except Exception:
                            pass
        return out

    # ---- landmarks after the names and tags in OSM ----
    def lm_of(tags, fid, c):
        nm = tags.get('name', '')
        d = math.hypot(c.x - MK[0], c.y - MK[1])
        if tags.get('amenity') == 'townhall' and d < 500:
            return 'rathaus'
        if ('Marien' in nm or 'Hauptkirche' in nm) and (tags.get('building') in ('church', 'yes', 'cathedral') or tags.get('amenity') == 'place_of_worship'):
            return 'marien'
        if 'Kreuzkirche' in nm or ('Kreuz' in nm and tags.get('building') == 'church'):
            return 'kreuz'
        if 'Malzhaus' in nm or 'Waffenmuseum' in nm:
            return 'malzhaus'
        if 'Congress' in nm or nm == 'CCS':
            return 'ccs'
        if tags.get('building') == 'church' or tags.get('amenity') == 'place_of_worship':
            return 'kirche'
        if tags.get('building') == 'grandstand' or tags.get('leisure') == 'stadium':
            return 'tribuene'
        return ''

    # ---- buildings: footprint, facades, roof (as zone_vessra.py) ----
    out = []
    MRK = Point(*MK)
    ortho = None
    try:
        cE, cN = toU(*MK)
        ortho = OrthoWMS(a.raw, cE, cN, HALF + 100)
    except Exception as e:
        log('Luftbild für Dachfarben nicht abrufbar:', repr(e)[:200])
    for bi, (poly, tags, fid) in enumerate(polys):
        typ = tags.get('building', 'yes')
        name = tags.get('name', '')
        A = poly.area
        c = poly.centroid
        lm = lm_of(tags, fid, c)
        lv = num(tags.get('building:levels'))
        rl = num(tags.get('roof:levels')) or 0
        ht = num(tags.get('height'))
        small = (typ in SMALL or A < 22) and not lm
        big = (typ in BIG or (typ in ('yes', 'industrial', 'commercial', 'retail') and A > 900 and not lv)) and not lm
        kind = 2 if small else 1 if big else 0
        h = (zlib.crc32(fid.encode()) & 0xffff) / 65535.0
        dM = c.distance(MRK)
        mrr = np.array(poly.minimum_rotated_rectangle.exterior.coords)[:4]
        e1, e2 = mrr[1] - mrr[0], mrr[2] - mrr[1]
        pick = np.hypot(*e1) >= np.hypot(*e2)
        if pick:
            ux, W, Lr = e1 / max(np.hypot(*e1), 1e-9), np.hypot(*e2), np.hypot(*e1)
        else:
            ux, W, Lr = e2 / max(np.hypot(*e2), 1e-9), np.hypot(*e1), np.hypot(*e2)
        shape = tags.get('roof:shape', '')
        # the era/type: WBS 70 slabs (Aue, Suhl-Nord: 5-11 storeys, ~12 m deep, long), the old town (Gründerzeit, half-timbering,
        # slate) near the Markt, the 1970s-80s centre (CCS, department stores: big and flat)
        era = ''
        if kind == 0 and not lm:
            if (lv and lv >= 5) or (not lv and 10.5 <= W <= 14.5 and Lr >= 28 and shape in ('', 'flat') and typ in ('apartments', 'residential', 'yes')):
                era = 'platte'
            elif dM < 650 and shape not in ('flat',) and A < 700:
                era = 'alt'
            elif dM < 900 and (A > 700 or shape == 'flat'):
                era = 'ddr'
        if lv is None:
            if small:
                lv = 1
            elif era == 'platte':
                lv = 5 if Lr < 60 else 6
            elif era == 'alt':
                lv = 3 if A > 120 else 2
            elif era == 'ddr':
                lv = 4
            elif big:
                lv = 1
            elif lm in ('marien', 'kreuz', 'kirche'):
                lv = 3
            else:
                lv = 2 if A > 70 else 1
        if ht and not num(tags.get('building:levels')) and kind == 0 and not lm:
            lv = max(1, round(ht / 3.0))
        stH = 2.8 if kind == 0 else 3.0
        plinth = 0.45 if kind == 0 else 0.0
        eave = (plinth + stH * lv - 0.05) if not small else 2.4
        if era == 'platte':
            eave = 2.8 * lv + 0.9   # WBS 70: 2.8 m storeys over a 0.9 m basement storey, flat roof with attic
        if big:
            eave = max(4.2, 3.6 * lv)
        if lm in ('marien', 'kreuz', 'kirche'):
            eave = max(eave, 11.0 if lm != 'kirche' else 7.0)
        flat = shape == 'flat' or era in ('platte', 'ddr') or (A > 1600 and kind == 1) or len(poly.interiors) > 0
        if shape in ('gabled', 'hipped', 'pitched', 'half-hipped', 'gambrel', 'mansard', 'pyramidal'):
            flat = False
        pitch = 35.0 if big else 25.0 if small else 50.0 if era == 'alt' else 42.0
        if lm in ('marien', 'kreuz', 'kirche'):
            pitch = 52.0
        hip = shape in ('hipped', 'half-hipped', 'pyramidal') or (kind == 0 and A > 240 and era != 'alt' and h < 0.3)
        rise = 0.0 if flat else min(W / 2 * math.tan(math.radians(pitch)), 14.0)
        if ht and not flat:
            # a height tag: the eave from it (the roof as computed)
            eave = max(2.2, ht - rise * 0.9)
        elif ht and flat:
            eave = max(2.2, ht)
        if rl and not flat:
            eave = max(2.2, eave - rl * 1.2)
        ctr = mrr.mean(axis=0)
        uy = np.array([-ux[1], ux[0]])
        loc = lambda Q: np.stack([(Q[:, 0] - ctr[0]) * ux[0] + (Q[:, 1] - ctr[1]) * ux[1], (Q[:, 0] - ctr[0]) * uy[0] + (Q[:, 1] - ctr[1]) * uy[1]], 1)
        back = lambda t, d: (ctr[0] + t * ux[0] + d * uy[0], ctr[1] + t * ux[1] + d * uy[1])
        k_ = rise / max(W / 2, 0.5)
        if flat:
            planes = [(0.0, 0.0, eave)]
        else:
            planes = [(0.0, -k_, eave + rise), (0.0, k_, eave + rise)]
            if hip:
                ke = k_ * (1.0 if shape != 'half-hipped' else 1.6)
                ce = eave + ke * Lr / 2 + (rise * 0.6 if shape == 'half-hipped' else 0)
                planes += [(-ke, 0.0, ce), (ke, 0.0, ce)]
        ring = np.array(poly.exterior.coords)[:-1]
        try:
            lp = Polygon(loc(ring), [loc(np.array(hh_.coords)[:-1]) for hh_ in poly.interiors])
            rings = [ring] + [np.array(hh_.coords)[:-1] for hh_ in poly.interiors]
            fac = []
            for ri, rg in enumerate(rings):
                ql = loc(rg)
                for (i, uA, tA, ta, tb, L) in walls_of([tuple(p) for p in ql], planes):
                    p0, p1 = rg[i], rg[(i + 1) % len(rg)]
                    mid = Point((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
                    dx, dy = (p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L
                    nx, ny = dy, -dx
                    probe = Point(mid.x + nx * 0.6, mid.y + ny * 0.6)
                    shared = False
                    for j in tree.query(probe.buffer(0.3)):
                        if j != bi and polys[j][0].distance(probe) < 0.35:
                            shared = True
                            break
                    fl = 1 if shared else 0
                    sd = 99.0
                    if st_tree is not None and not shared and L > 2.5:
                        for d_ in (3.0, 6.0, 10.0, 14.0, 20.0):
                            pr = Point(mid.x + nx * d_, mid.y + ny * d_)
                            hit = [k for k in st_tree.query(pr.buffer(2.5)) if st_named[k]['_ls'].distance(pr) < 2.5]
                            if hit:
                                sd = d_
                                break
                    fac.append([r2(p0[0]), r2(p0[1]), r2(p1[0]), r2(p1[1]), r2(ta), r2(uA), r2(tA), r2(tb), fl, r2(sd)])
            over = 0.0 if flat else (0.4 if kind == 0 else 0.3)
            faces = roof_faces(lp, planes, over)
        except Exception as e:
            log('Gebäude übersprungen', fid, repr(e)[:120])
            continue
        V, T = [], []
        for vv, tri in faces:
            base = len(V) // 3
            for p in vv:
                X, Y = back(p[0], p[1])
                V += [r2(X), r2(Y), r2(p[2])]
            T += (tri + base).ravel().tolist()
        # roof colour: the orthophoto inside the footprint (shadows and glints left out), and its kind
        col = None
        if ortho is not None:
            cs = []
            rng = np.random.default_rng(zlib.crc32(fid.encode()))
            bx0, by0, bx1, by1 = poly.bounds
            tries = 0
            while len(cs) < 24 and tries < 200:
                tries += 1
                x, y = rng.uniform(bx0, bx1), rng.uniform(by0, by1)
                if not poly.contains(Point(x, y)) or poly.exterior.distance(Point(x, y)) < 0.8:
                    continue
                cc = ortho(*toU(x, y))
                if cc is not None:
                    cs.append(cc)
            if cs:
                cs.sort(key=lambda q: q.sum())
                mid = cs[len(cs) // 4: max(len(cs) // 4 + 1, int(len(cs) * 0.85))]
                col = np.mean(mid, axis=0)
        if col is None:
            col = np.array([0.36, 0.36, 0.38]) if era == 'alt' else np.array([0.6, 0.3, 0.2])
        hh_, ss, ll = hsl(col)
        if flat:
            rk = 4
        elif big:
            rk = 2 if ll > 0.45 else 1 if ss < 0.2 else 0
        elif ss < 0.16 and ll < 0.4:
            rk = 3   # slate (dark grey-blue: the old town)
        else:
            rk = 0
        if rk == 0 and (ss < 0.22 or (40 < hh_ < 300)):
            col = np.array([0.42, 0.25, 0.18]) if ll < 0.3 else np.array([0.66, 0.34, 0.22])
        if rk == 4:
            l_ = col.mean()
            col = np.minimum(0.62, l_ * 0.8 + col * 0.2)
        oid = ('way/' if fid[0] == 'w' else 'relation/') + fid[1:]
        b = {'id': fid, 'k': kind, 'f': flat2(ring), 'e': r2(eave), 'lv': int(lv), 'rk': rk, 'rc': [r2(v) for v in col], 'F': fac, 'rv': V, 'rt': T,
             'hr': r2(eave + rise)}
        if poly.interiors:
            b['h'] = [flat2(np.array(hh_r.coords)[:-1]) for hh_r in poly.interiors]
        if flat:
            b['fl'] = 1
        if lm:
            b['lm'] = lm
        if era:
            b['era'] = era
        if name:
            b['n'] = name
        if shape:
            b['rs'] = shape
        tg = {k: tags[k] for k in KEEP_TAGS if k in tags}
        if tg:
            b['tg'] = tg
        if tags.get('addr:street'):
            b['a'] = (tags['addr:street'] + ' ' + tags.get('addr:housenumber', '')).strip()
        b['_c'] = (c.x, c.y)
        out.append(b)
    log('Gebäude:', len(out), 'Arten:', {e_: sum(1 for b in out if b.get('era') == e_) for e_ in ('platte', 'alt', 'ddr', '')},
        'Wahrzeichen:', [(b['lm'], b.get('n', ''), b['id']) for b in out if b.get('lm')])

    # ---- areas: water, parking, parks, playgrounds, pitches, tracks, schools, cemeteries, squares ----
    areas = []
    AK = lambda t: ('water' if (t.get('natural') == 'water' or t.get('water') or t.get('waterway') == 'riverbank') else
                    'parking' if t.get('amenity') == 'parking' else
                    'pitch' if t.get('leisure') == 'pitch' else
                    'track' if t.get('leisure') == 'track' else
                    'stadium' if t.get('leisure') in ('stadium', 'sports_centre') else
                    'playground' if t.get('leisure') == 'playground' else
                    'park' if t.get('leisure') in ('park', 'garden') else
                    'school' if t.get('amenity') in ('school', 'kindergarten') else
                    'cemetery' if (t.get('landuse') == 'cemetery' or t.get('amenity') == 'grave_yard') else
                    'square' if (t.get('place') == 'square' or (t.get('highway') in ('pedestrian', 'footway') and t.get('area') == 'yes')) else
                    'grass' if (t.get('landuse') in ('grass', 'village_green') or t.get('leisure') == 'common') else None)
    for pg, tags, fid in area_polys(lambda t: AK(t) is not None):
        if pg.is_empty or pg.geom_type not in ('Polygon', 'MultiPolygon'):
            continue
        if pg.geom_type == 'MultiPolygon':
            pg = max(pg.geoms, key=lambda g: g.area)
        c = pg.centroid
        if not inz(c.x, c.y):
            continue
        rec = {'k': AK(tags), 'id': fid, 'p': flat2(np.array(pg.simplify(0.4).exterior.coords)[:-1])}
        if tags.get('name'):
            rec['n'] = tags['name']
        if tags.get('sport'):
            rec['sp'] = tags['sport']
        if tags.get('surface'):
            rec['s'] = tags['surface']
        areas.append(rec)
    rivers = []
    for wid, (refs, tags) in ways.items():
        ww = tags.get('waterway')
        if ww not in ('river', 'stream', 'canal', 'ditch'):
            continue
        pts = line(wid)
        if len(pts) < 2 or not any(inz(x, y) for x, y in pts):
            continue
        rivers.append({'k': ww, 'n': tags.get('name', ''), 'w': {'river': 9.0, 'canal': 6.0, 'stream': 3.0, 'ditch': 1.2}[ww],
                       'p': flat2(LineString(pts).simplify(0.5).coords), 'tu': 1 if tags.get('tunnel') else 0})
    log('Flächen:', {k: sum(1 for r in areas if r['k'] == k) for k in sorted({r['k'] for r in areas})}, 'Gewässer:', len(rivers),
        sorted({r['n'] for r in rivers if r['n']}))

    # ---- trees, lamps, benches, bus stops, places, shops ----
    trees, lamps, benches, stops, pois, names = [], [], [], [], [], []
    for nid, nd in osm['nodes'].items():
        if len(nd) < 3:
            continue
        t = nd[2]
        x, y = nodeM[nid]
        if not inz(x, y):
            continue
        if t.get('natural') == 'tree':
            trees.append([r2(x), r2(y), 0, 1])
        elif t.get('highway') == 'street_lamp':
            lamps.append([r2(x), r2(y), 1])
        elif t.get('amenity') == 'bench' or t.get('leisure') == 'picnic_table':
            benches.append([r2(x), r2(y)])
        if t.get('highway') == 'bus_stop' or (t.get('public_transport') == 'platform' and t.get('bus') == 'yes'):
            stops.append({'n': t.get('name', ''), 'x': r2(x), 'y': r2(y), 's': 1 if t.get('shelter') == 'yes' else 0})
        kind = t.get('shop') or t.get('amenity') or t.get('tourism') or t.get('historic') or t.get('craft') or t.get('office') or t.get('leisure')
        if kind and t.get('name') and kind not in ('bench', 'waste_basket', 'bicycle_parking'):
            pois.append({'n': t['name'], 't': kind, 'x': r2(x), 'y': r2(y)})
        if t.get('place') and t.get('name'):
            names.append({'n': t['name'], 't': t['place'], 'x': r2(x), 'y': r2(y)})
    for wid, (refs, tags) in ways.items():
        if tags.get('natural') == 'tree_row':
            ls = LineString(line(wid))
            d = 0.0
            while d <= ls.length:
                p = ls.interpolate(d)
                if inz(p.x, p.y):
                    trees.append([r2(p.x), r2(p.y), 0, 1])
                d += 8.0
    # shops and offices in buildings (named, a shop/amenity tag on the building)
    for b in out:
        tg = b.get('tg', {})
        kind = tg.get('shop') or tg.get('amenity') or tg.get('tourism') or tg.get('office')
        if kind and b.get('n'):
            pois.append({'n': b['n'], 't': kind, 'x': r2(b['_c'][0]), 'y': r2(b['_c'][1]), 'b': b['id']})
    # lamps along the named streets near houses (every ~32 m, alternating sides), where OSM has none
    allp = [p for p, _, _ in polys]
    from shapely.strtree import STRtree as _T
    lamp_tree_pts = [(l[0], l[1]) for l in lamps]
    for s in st_named:
        ls = s['_ls']
        if s['k'] > 4 or s.get('t'):
            continue
        L = ls.length
        k = 0
        d = 12.0
        while d < L - 4:
            p = ls.interpolate(d)
            if not inz(p.x, p.y):
                d += 30.0
                continue
            q = ls.interpolate(min(L, d + 1.0))
            tx, ty = q.x - p.x, q.y - p.y
            tl = math.hypot(tx, ty) or 1
            side = 1 if k % 2 == 0 else -1
            ok = False
            near_house = len(tree.query(p.buffer(30)))
            if near_house:
                off0 = {1: 6.0, 2: 5.2, 3: 4.2, 4: 3.0}.get(s['k'], 4.0)
                for off in (off0, off0 - 0.6, off0 + 1.0):
                    x, y = p.x - ty / tl * off * side, p.y + tx / tl * off * side
                    pt = Point(x, y)
                    if all(allp[j].distance(pt) > 0.5 for j in tree.query(pt.buffer(1.0))) and \
                            not any(abs(x - lx) < 15 and abs(y - ly) < 15 and math.hypot(x - lx, y - ly) < 15 for lx, ly in lamp_tree_pts[-60:]):
                        lamps.append([r2(x), r2(y), 0])
                        lamp_tree_pts.append((x, y))
                        ok = True
                        break
            d += 32.0 if ok else 8.0
            k += 1
    # trees from the orthophoto: dark green crowns (conifers and early leaves - the flight is from spring), at least 7 m apart, outside
    # buildings, roads, water and pitches -> [x, y, crown radius, 0]
    if ortho is not None:
        from scipy import ndimage
        img = ortho.img.astype(np.float32) / 255.0
        e0, n0, e1, n1 = ortho.bb
        H, W = img.shape[:2]
        px = (e1 - e0) / W
        r_, g_, b_ = img[..., 0], img[..., 1], img[..., 2]
        lum = 0.3 * r_ + 0.59 * g_ + 0.11 * b_
        veg = ((2 * g_ - r_ - b_) > 0.035) & (lum < 0.32) & (lum > 0.04)
        sm = ndimage.gaussian_filter(veg.astype(np.float32), max(0.8, 1.8 / px))
        mx_ = ndimage.maximum_filter(sm, size=int(7.0 / px) | 1)
        peaks = np.argwhere((sm == mx_) & (sm > 0.6))
        block = [s_['_ls'].buffer({0: 9, 1: 6.0, 2: 5.0, 3: 4.2, 4: 3.0, 5: 3.0}.get(s_['k'], 1.5)) for s_ in streets if s_['k'] <= 8]
        block += [Polygon(list(zip(r['p'][::2], r['p'][1::2]))).buffer(1.0) for r in areas if r['k'] in ('water', 'pitch', 'track', 'parking', 'square')]
        bt = _T(block) if block else None
        found = []
        for (r0, c0) in peaks:
            E_ = e0 + (c0 + 0.5) * px
            N_ = n1 - (r0 + 0.5) * px
            x, y = model_from_utm(E_, N_)
            if not inz(x, y):
                continue
            pt = Point(x, y)
            if any(allp[j].distance(pt) < 1.5 for j in tree.query(pt.buffer(2.0))):
                continue
            if bt is not None and len(bt.query(pt, predicate='intersects')):
                continue
            found.append((math.hypot(x - MK[0], y - MK[1]), x, y))
        found.sort()
        # only in and near the town (the forests around stay the tiles' orthophoto)
        nT = 0
        for d_, x, y in found:
            if len(tree.query(Point(x, y).buffer(60))) == 0:
                continue
            trees.append([r2(x), r2(y), r2(2.5 + (zlib.crc32(f'{x:.1f}'.encode()) % 100) / 40.0), 0])
            nT += 1
            if nT >= 4000:
                break
        log('Bäume aus dem Luftbild:', nT, 'von', len(found))
    log('Bäume:', len(trees), 'Laternen:', len(lamps), 'Bänke:', len(benches), 'Haltestellen:', len(stops), 'Orte:', len(pois))

    # ---- the town block (level 12): the bounding box of the 400 m cells with at least 25 buildings, connected to the Markt ----
    from collections import Counter
    cnt = Counter((math.floor(b['_c'][0] / CELL), math.floor(b['_c'][1] / CELL)) for b in out)
    dense = {k for k, v in cnt.items() if v >= 25}
    mk = (math.floor(MK[0] / CELL), math.floor(MK[1] / CELL))
    seen, todo = set(), [mk] if mk in dense else []
    while todo:
        k = todo.pop()
        if k in seen:
            continue
        seen.add(k)
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                q = (k[0] + di, k[1] + dj)
                if q in dense and q not in seen and math.hypot((q[0] + 0.5) * CELL - MK[0], (q[1] + 0.5) * CELL - MK[1]) < 2900:
                    todo.append(q)
    if seen:
        xs = [k[0] for k in seen]
        ys = [k[1] for k in seen]
        bx0, by0, bx1, by1 = min(xs) * CELL, min(ys) * CELL, (max(xs) + 1) * CELL, (max(ys) + 1) * CELL
        cs = [toU(x, y) for x in (bx0, bx1) for y in (by0, by1)]
        det_utm = [min(c[0] for c in cs), min(c[1] for c in cs), max(c[0] for c in cs), max(c[1] for c in cs)]
    else:
        cE, cN = toU(*MK)
        det_utm = [cE - 1800, cN - 1800, cE + 1800, cN + 1800]
    log('Stadtblock (dichte Zellen):', len(seen), 'UTM', [round(v) for v in det_utm])

    # ---- write: cells of buildings, the index ----
    os.makedirs(os.path.join(a.out, 'c'), exist_ok=True)
    for f in os.listdir(os.path.join(a.out, 'c')):
        os.remove(os.path.join(a.out, 'c', f))
    cells = {}
    for b in out:
        k = f"{math.floor(b['_c'][0] / CELL)}_{math.floor(b['_c'][1] / CELL)}"
        cells.setdefault(k, []).append(b)
    cidx = []
    tot = 0
    for k, bl in sorted(cells.items()):
        for b in bl:
            b.pop('_c', None)
        p = os.path.join(a.out, 'c', k + '.json')
        json.dump({'v': 1, 'cell': k, 'b': bl}, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
        sz = os.path.getsize(p)
        tot += sz
        i, j = map(int, k.split('_'))
        cidx.append({'k': k, 'n': len(bl), 'kb': round(sz / 1024), 'x0': i * CELL, 'y0': j * CELL})
    doc = {
        'v': 1, 'generated': time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()), 'markt': [r2(v) for v in MK], 'half': HALF, 'cell': CELL,
        'src': 'Gebäude, Straßen, Orte: © OpenStreetMap-Mitwirkende (ODbL 1.0); Dachfarben: Luftbild © GDI-Th (CC BY 4.0)',
        'osm': osm.get('fetched', ''), 'det_utm': [round(v) for v in det_utm], 'cells': cidx,
        'lm': [{'lm': b['lm'], 'id': b['id'], 'n': b.get('n', ''), 'f': b['f']} for bl in cells.values() for b in bl if b.get('lm')],
        'st': [{k: v for k, v in s.items() if k != '_ls'} for s in streets], 'areas': areas, 'rivers': rivers,
        'trees': trees, 'lamps': lamps, 'benches': benches, 'stops': stops, 'poi': pois, 'names': names,
        'report': {k: v[:80] for k, v in report.items()},
    }
    p = os.path.join(a.out, 'index.json')
    json.dump(doc, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
    log(f'{p}: {os.path.getsize(p) / 1e6:.2f} MB; Zellen {len(cidx)}: {tot / 1e6:.2f} MB (größte {max(c["kb"] for c in cidx)} kB); '
        f'{len(out)} Gebäude, {len(streets)} Straßen; {time.time() - T0:.0f} s')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', required=True)
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', '..', 'viz3', 'extra', 'suhl', 'dist', 'suhl'))
    ap.add_argument('--routes', action='store_true')
    ap.add_argument('--plan', default='plan.json')
    a = ap.parse_args()
    if a.routes:
        plan(a)
    else:
        town(a)


if __name__ == '__main__':
    main()
