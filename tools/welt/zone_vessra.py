"""Detail zone Kloster Veßra (~9 km west of the garden): the walled monastery district (the Romanesque church as a ruin with its twin west
towers, the Henneberg chapel, the gate church, the claustral ranges, the farm buildings and the half-timbered houses of the open-air museum
Hennebergisches Museum), the village and the tree nursery Baumschule Kammbach from OpenStreetMap; roof colours from the orthophoto
-> one JSON the app loads when the player comes near (viz3/src/welt/vessra.js).
  python3 -I tools/welt/zone_vessra.py --raw <cache dir> [--out viz3/extra/vessra/dist/vessra] [--tiles <dir or URL of welt-test/zonen/vessra/>]
Without --tiles the roof colours come straight from the WMS (DOP Thüringen, one image of the zone, cached in <raw>/dop).
Coordinates: the app's model metres (x east, y north; wlib.model_from_utm), heights relative to each building's foot. Buildings as in
zone_schleusingen.py (footprint, facades with their top line, roof faces, roof kind and colour, eave, storeys, name) plus the material
(stone, half-timbering, plaster) after the photos and OSM. The church is exported as its parts (towers, westwork, nave walls, transept,
chapels) - the app models the ruin. Sources: © OpenStreetMap contributors (ODbL 1.0), DOP © GDI-Th (CC BY 4.0) for the roof colours."""
import argparse, json, math, os, sys, time, zlib
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wlib import log, XF, model_from_utm, tsize, ROOT_E0, ROOT_N0, http_get
from zone_schleusingen import roof_faces, walls_of, hsl, Ortho

# the zone: between the monastery and the nursery; buildings within HALF metres (model) are built
ORT = (-8850.0, -300.0)
HALF = 560.0
KIRCHE = (-8770.0, -377.0)   # the church (crossing of the nave axis and the middle of the ruin)
# OSM ids: the church parts the app models itself, and buildings with a role
LANDMARK = {'w117931129': 'turm', 'w121648569': 'turm', 'w121648570': 'westbau', 'w121648567': 'henneberg', 'w121648571': 'apsis',
            'w121648574': 'suedkapelle', 'w121648572': 'apsis', 'w121649693': 'torkirche', 'w117931177': 'torhaus',
            'w117931173': 'kornhaus', 'w121649695': 'klausur', 'w121649703': 'klausur', 'w117931181': 'kreuzgang'}
RUIN = {'area': 'w948084437', 'transept': 'w948084438', 'north': 'w948084439', 'south': 'w948084440'}
# the masonry ranges of the monastery and the domain (red sandstone rubble, photos 2022, 2025)
STONE = {'Westklausur', 'Südklausur', 'Kreuzgang', 'Domänenscheune', 'Pferdestall', 'Domänenstallgebäude', 'Neuer Pferdestall',
         'Schafstall / Alter Pferdestall', 'Torhaus', 'Henneberger Kapelle', 'Südkapelle', 'Torkirche St. Erhard', 'Klostermühle',
         'Hofteichscheune', 'Domänengebäude'}
FW = {'Bauernhaus', 'Schmiede', 'Dorfbrauhaus', 'Totenhofkapelle', 'Karstmühle', 'Backhaus', 'Gemeindehaus', 'Schweinestall', 'Bienenhaus',
      'Scheune', 'Neubauerngehöft'}
SMALL = {'garage', 'garages', 'shed', 'carport', 'hut', 'roof', 'kiosk', 'toilets', 'service', 'transformer_tower', 'allotment_house', 'cabin'}
BIG = {'barn', 'farm_auxiliary', 'agricultural', 'industrial', 'warehouse', 'stable', 'cowshed', 'hangar', 'greenhouse', 'manufacture',
       'sports_hall', 'supermarket', 'storage_tank', 'silo', 'train_station', 'retail', 'commercial'}
STREET_KIND = {'motorway': 0, 'trunk': 1, 'primary': 1, 'secondary': 1, 'tertiary': 2, 'unclassified': 3, 'residential': 3, 'living_street': 3,
               'pedestrian': 3, 'service': 5, 'track': 6, 'path': 7, 'footway': 8, 'steps': 8, 'cycleway': 7, 'tertiary_link': 2}


def r2(v):
    return round(float(v), 2)


def fetch_osm_zone(raw):
    from fetch import fetch_osm
    from pyproj import Transformer
    toLL = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
    a, b = XF['a'], XF['b']
    cs = [(ORT[0] + sx * (HALF + 80), ORT[1] + sy * (HALF + 80)) for sx in (-1, 1) for sy in (-1, 1)]
    E = [a * x - b * y + XF['ex'] for x, y in cs]
    N = [b * x + a * y + XF['ey'] for x, y in cs]
    lo, la = toLL.transform(E, N)
    ll = (round(min(lo), 4), round(min(la), 4), round(max(lo), 4), round(max(la), 4))
    os.environ.setdefault('WELT_NO_OVERPASS', '1')
    return fetch_osm(raw, ll)


class OrthoWMS:
    """orthophoto colours from one WMS image over the zone (0.3 m per pixel), cached in <raw>/dop"""
    def __init__(self, raw, toU):
        from fetch import fetch_wms
        cs = [toU(ORT[0] + sx * (HALF + 40), ORT[1] + sy * (HALF + 40)) for sx in (-1, 1) for sy in (-1, 1)]
        e0, n0 = math.floor(min(c[0] for c in cs)), math.floor(min(c[1] for c in cs))
        e1, n1 = math.ceil(max(c[0] for c in cs)), math.ceil(max(c[1] for c in cs))
        w = min(4800, int((e1 - e0) / 0.3))
        h = min(4800, int((n1 - n0) / 0.3))
        self.img = fetch_wms(raw, 'th_dop', (e0, n0, e1, n1), w, h)
        self.bb = (e0, n0, e1, n1)

    def __call__(self, E, N):
        e0, n0, e1, n1 = self.bb
        H, W = self.img.shape[:2]
        c, r = int((E - e0) / (e1 - e0) * W), int((n1 - N) / (n1 - n0) * H)
        if not (0 <= c < W and 0 <= r < H):
            return None
        return self.img[r, c] / 255.0


class OrthoDir(Ortho):
    """the level-11 imagery tiles of a local tile directory (the workflow's fresh build)"""
    def tile(self, x, y):
        k = (x, y)
        if k not in self.cache:
            p = os.path.join(self.base, 'i', '11', str(x), f'{y}.webp')
            from PIL import Image
            self.cache[k] = np.asarray(Image.open(p).convert('RGB')) if os.path.exists(p) else None
        return self.cache[k]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', required=True)
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', '..', 'viz3', 'extra', 'vessra', 'dist', 'vessra'))
    ap.add_argument('--tiles', default='')
    a = ap.parse_args()
    T0 = time.time()
    from pyproj import Transformer
    from shapely.geometry import Polygon, LineString, Point
    from shapely.geometry.polygon import orient
    from shapely.strtree import STRtree
    osm = fetch_osm_zone(a.raw)
    tr = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
    ids = list(osm['nodes'].keys())
    lla = np.array([osm['nodes'][i][:2] for i in ids], float)
    E, N = tr.transform(lla[:, 0], lla[:, 1])
    mx, my = model_from_utm(np.asarray(E), np.asarray(N))
    nodeM = {i: (float(x), float(y)) for i, x, y in zip(ids, mx, my)}
    a_, b_ = XF['a'], XF['b']
    toU = lambda x, y: (a_ * x - b_ * y + XF['ex'], b_ * x + a_ * y + XF['ey'])
    if a.tiles and os.path.isdir(a.tiles):
        ortho = OrthoDir(a.raw, a.tiles)
        ortho.base = a.tiles
    elif a.tiles:
        ortho = Ortho(a.raw, a.tiles)
    else:
        ortho = OrthoWMS(a.raw, toU)
    zone = (ORT[0] - HALF, ORT[1] - HALF, ORT[0] + HALF, ORT[1] + HALF)
    inz = lambda x, y: zone[0] <= x <= zone[2] and zone[1] <= y <= zone[3]
    ways = osm['ways']
    line = lambda wid: [nodeM[r] for r in ways[wid][0] if r in nodeM]
    flat2 = lambda pts: [r2(v) for xy in pts for v in xy]

    # ---- the monastery district: the area inside the wall (for the museum styles and the place name) ----
    from buildings import rings_of
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
        polys.append((orient(pg.simplify(0.12), 1.0), tags, fid))
    log('Gebäude in der Zone:', len(polys))
    tree = STRtree([p for p, _, _ in polys])

    # ---- streets (names for the HUD, the overlay, door side, lamps) ----
    streets = []
    for wid, (refs, tags) in ways.items():
        hw = tags.get('highway')
        if hw not in STREET_KIND or len(refs) < 2:
            continue
        pts = [nodeM[r] for r in refs if r in nodeM]
        if len(pts) < 2 or not any(inz(x, y) for x, y in pts):
            continue
        ls = LineString(pts).simplify(0.4)
        s = {'n': tags.get('name', ''), 'k': STREET_KIND[hw], 's': tags.get('surface', ''), 'p': flat2(ls.coords), '_ls': ls}
        if tags.get('ref'):
            s['r'] = tags['ref']
        if tags.get('bridge') == 'yes':
            s['b'] = 1
        streets.append(s)
    st_named = [s for s in streets if s['n'] and s['k'] <= 5]
    st_tree = STRtree([s['_ls'] for s in st_named]) if st_named else None
    log('Straßen:', len(streets), 'mit Namen:', len(st_named))

    # ---- the church: parts of the ruin (the app builds the walls, arcades, towers) ----
    kirche = {}
    for k, wid in RUIN.items():
        w = wid[1:]
        if w in ways:
            kirche[k] = flat2(line(w))
    tw = []
    for P, holes, tags, fid in feats:
        lm = LANDMARK.get(fid)
        if lm in ('turm', 'westbau'):
            ring = [tuple(p) for p in np.asarray(P)]
            if lm == 'turm':
                tw.append(flat2(ring))
            else:
                kirche['westbau'] = flat2(ring)
    kirche['towers'] = tw
    for nid, nd in osm['nodes'].items():
        if len(nd) > 2 and nd[2].get('entrance') and nid == '1020955880':
            kirche['portal'] = [r2(v) for v in nodeM[nid]]

    # ---- buildings ----
    out = []
    museum = None
    for wid, (refs, tags) in ways.items():
        if tags.get('tourism') == 'attraction' and 'Museum' in tags.get('name', ''):
            pts = line(wid)
            if len(pts) >= 4:
                museum = Polygon(pts)
    for bi, (poly, tags, fid) in enumerate(polys):
        lm = LANDMARK.get(fid, '')
        if lm in ('turm', 'westbau'):
            continue
        typ = tags.get('building', 'yes')
        name = tags.get('name', '')
        A = poly.area
        c = poly.centroid
        lv = None
        try:
            lv = float(str(tags.get('building:levels', '')).replace(',', '.'))
        except ValueError:
            pass
        small = (typ in SMALL or A < 22) and not lm
        big = (typ in BIG or (typ in ('yes', 'industrial', 'commercial', 'retail') and A > 380)) and not lm and name not in FW
        kind = 2 if small else 1 if big else 0
        h = (zlib.crc32(fid.encode()) & 0xffff) / 65535.0
        mat = tags.get('building:material', '')
        stone = name in STONE or mat == 'sandstone' or lm in ('klausur', 'kreuzgang', 'torhaus', 'torkirche', 'henneberg', 'suedkapelle')
        fw = (name in FW or mat == 'timber_framing') and not stone
        hist = bool(tags.get('historic')) or stone or fw
        if lm in ('klausur', 'kornhaus') or name in ('Domänenscheune', 'Domänenstallgebäude', 'Pferdestall', 'Neuer Pferdestall'):
            kind = 0 if lm else 1
        if lv is None:
            if small:
                lv = 1
            elif lm in ('klausur',):
                lv = 2
            elif lm in ('kornhaus',):
                lv = 3
            elif lm in ('henneberg', 'suedkapelle', 'torkirche', 'kreuzgang', 'apsis', 'torhaus'):
                lv = 1
            elif big:
                lv = 1
            elif fw:
                lv = 1 if A < 70 else 2
            else:
                lv = 2 if A > 70 else 1
        mrr = np.array(poly.minimum_rotated_rectangle.exterior.coords)[:4]
        e1, e2 = mrr[1] - mrr[0], mrr[2] - mrr[1]
        if lm == 'torhaus':
            # the gate tower: its ridge along the passage (north–south), the gables to the street and the courtyard (photo 2025)
            n1, n2 = abs(e1[1]) / max(np.hypot(*e1), 1e-9), abs(e2[1]) / max(np.hypot(*e2), 1e-9)
            pick = n1 >= n2
        else:
            pick = np.hypot(*e1) >= np.hypot(*e2)
        if pick:
            ux, W, Lr = e1 / max(np.hypot(*e1), 1e-9), np.hypot(*e2), np.hypot(*e1)
        else:
            ux, W, Lr = e2 / max(np.hypot(*e2), 1e-9), np.hypot(*e1), np.hypot(*e2)
        ctr = mrr.mean(axis=0)
        uy = np.array([-ux[1], ux[0]])
        stH = 2.75 if kind == 0 else 3.0
        plinth = 0.45 if kind == 0 else 0.0
        eave = (plinth + stH * lv - 0.05) if not small else 2.4
        if big:
            eave = max(4.2, 3.4 * lv)
        if lm in ('henneberg', 'suedkapelle'):
            eave = 6.5   # the chapels: tall walls under steep roofs (photos 2019, 2025)
        if lm == 'torkirche':
            eave = 7.0   # the gate church: the passage below, the chapel above (photos 2019, 2025)
        if lm == 'kreuzgang':
            eave = 4.0
        if lm == 'torhaus':
            eave = 11.5   # the gate tower: the vaulted passage below, two storeys of slit windows over it (photo 2025 „Torgebäude“)
        if lm == 'apsis':
            eave = 4.2
        ht = None
        try:
            ht = float(str(tags.get('height', '')).replace('m', '').replace(',', '.'))
        except ValueError:
            pass
        if ht:
            eave = max(2.2, ht * 0.62)
        shape = tags.get('roof:shape', '')
        flat = shape == 'flat' or (A > 1600 and kind == 1) or len(poly.interiors) > 0
        if shape in ('gabled', 'hipped', 'pitched', 'half-hipped', 'gambrel', 'mansard'):
            flat = False
        pitch = 35.0 if big else 25.0 if small else 48.0 if hist else 42.0
        if lm == 'kornhaus':
            pitch = 52.0
        if lm in ('henneberg', 'suedkapelle', 'torkirche', 'torhaus'):
            pitch = 50.0
        hip = shape in ('hipped', 'half-hipped') or (kind == 0 and A > 240 and not hist and h < 0.3)
        rise = 0.0 if flat else min(W / 2 * math.tan(math.radians(pitch)), 12.0)
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
        Q = loc(ring)
        lp = Polygon(Q, [loc(np.array(hh_.coords)[:-1]) for hh_ in poly.interiors])
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
        V, T = [], []
        for vv, tri in faces:
            base = len(V) // 3
            for p in vv:
                X, Y = back(p[0], p[1])
                V += [r2(X), r2(Y), r2(p[2])]
            T += (tri + base).ravel().tolist()
        # roof colour: the orthophoto inside the footprint (shadows and glints left out), and its kind
        cs = []
        rng = np.random.default_rng(zlib.crc32(fid.encode()))
        bx0, by0, bx1, by1 = poly.bounds
        tries = 0
        while len(cs) < 40 and tries < 400:
            tries += 1
            x, y = rng.uniform(bx0, bx1), rng.uniform(by0, by1)
            if not poly.contains(Point(x, y)) or poly.exterior.distance(Point(x, y)) < 0.7:
                continue
            col = ortho(*toU(x, y))
            if col is not None:
                cs.append(col)
        col = None
        if cs:
            cs.sort(key=lambda q: q.sum())
            mid = cs[len(cs) // 4: max(len(cs) // 4 + 1, int(len(cs) * 0.85))]
            col = np.mean(mid, axis=0)
        if col is None:
            col = np.array([0.6, 0.3, 0.2])
        hh_, ss, ll = hsl(col)
        if flat:
            rk = 4
        elif big:
            rk = 2 if ll > 0.45 else 1 if ss < 0.2 else 0
        elif ss < 0.14 and ll < 0.36:
            rk = 3
        else:
            rk = 0
        if rk == 0 and (ss < 0.22 or (40 < hh_ < 300)):
            col = np.array([0.42, 0.25, 0.18]) if ll < 0.3 else np.array([0.68, 0.34, 0.22])
        if rk == 4:
            l_ = col.mean()
            col = np.minimum(0.62, l_ * 0.8 + col * 0.2)
        if hist and not flat:
            rk = 0   # the monastery and the museum: red clay tiles everywhere (drone photos 2021)
            if not (ss > 0.25 and 5 < hh_ < 40):
                col = np.array([0.7, 0.36, 0.22])
        b = {'i': bi, 'k': kind, 'f': flat2(ring), 'e': r2(eave), 'lv': int(lv), 'rk': rk, 'rc': [r2(v) for v in col], 'F': fac, 'rv': V, 'rt': T}
        if poly.interiors:
            b['h'] = [flat2(np.array(hh_r.coords)[:-1]) for hh_r in poly.interiors]
        if flat:
            b['fl'] = 1
        if lm:
            b['lm'] = lm
        if name:
            b['n'] = name
        if tags.get('description'):
            b['d'] = tags['description']
        if tags.get('addr:street'):
            b['a'] = (tags['addr:street'] + ' ' + tags.get('addr:housenumber', '')).strip()
        b['m'] = 'stone' if stone else 'fw' if fw else ''
        if hist:
            b['old'] = 1
        if museum is not None and museum.contains(c):
            b['mu'] = 1
        out.append(b)

    # ---- walls (the monastery wall and others), fences, hedges, gates ----
    ruinw = {w[1:] for w in RUIN.values()}
    walls, fences, hedges = [], [], []
    for wid, (refs, tags) in ways.items():
        br = tags.get('barrier')
        if br not in ('wall', 'fence', 'hedge', 'retaining_wall') or wid in ruinw:
            continue
        pts = line(wid)
        if len(pts) < 2 or not any(inz(x, y) for x, y in pts):
            continue
        rec = {'p': flat2(LineString(pts).simplify(0.2).coords)}
        if br in ('wall', 'retaining_wall'):
            rec['h'] = r2(float(str(tags.get('height', '0')).replace('m', '').replace(',', '.') or 0) or 3.2)
            walls.append(rec)
        elif br == 'fence':
            if tags.get('material'):
                rec['m'] = tags['material']
            fences.append(rec)
        else:
            hedges.append(rec)
    gates = []
    for nid, nd in osm['nodes'].items():
        if len(nd) < 3:
            continue
        t = nd[2]
        if t.get('barrier') in ('gate', 'entrance', 'lift_gate') or (t.get('entrance') and t.get('entrance') != 'yes'):
            x, y = nodeM[nid]
            if inz(x, y):
                gates.append([r2(x), r2(y), t.get('barrier') or t.get('entrance')])
    log('Mauern:', len(walls), 'Zäune:', len(fences), 'Hecken:', len(hedges), 'Tore:', len(gates))

    # ---- areas: water, parking, the nursery, the cemetery, gardens, meadows; rivers ----
    areas = []
    for wid, (refs, tags) in ways.items():
        if len(refs) < 4 or refs[0] != refs[-1]:
            continue
        k = None
        if tags.get('natural') == 'water' or tags.get('water'):
            k = 'water'
        elif tags.get('amenity') == 'parking':
            k = 'parking'
        elif tags.get('landuse') == 'plant_nursery':
            k = 'nursery'
        elif tags.get('landuse') == 'cemetery' or tags.get('amenity') == 'grave_yard':
            k = 'cemetery'
        elif tags.get('leisure') == 'garden':
            k = 'garden'
        elif tags.get('tourism') == 'attraction' and 'Museum' in tags.get('name', ''):
            k = 'museum'
        if not k:
            continue
        pts = line(wid)[:-1]
        if len(pts) < 3 or not any(inz(x, y) for x, y in pts):
            continue
        rec = {'k': k, 'p': flat2(pts)}
        if tags.get('name'):
            rec['n'] = tags['name']
        areas.append(rec)
    rivers = []
    for wid, (refs, tags) in ways.items():
        ww = tags.get('waterway')
        if ww not in ('river', 'stream', 'canal', 'ditch'):
            continue
        pts = line(wid)
        if len(pts) < 2 or not any(inz(x, y) for x, y in pts):
            continue
        rivers.append({'k': ww, 'n': tags.get('name', ''), 'w': {'river': 9.0, 'canal': 6.0, 'stream': 2.5, 'ditch': 1.2}[ww], 'p': flat2(LineString(pts).simplify(0.5).coords)})
    log('Flächen:', {k: sum(1 for r in areas if r['k'] == k) for k in ('water', 'parking', 'nursery', 'cemetery', 'garden')}, 'Gewässer:', len(rivers))

    # ---- trees, lamps, benches, places ----
    trees, lamps, benches, pois = [], [], [], []
    for nid, nd in osm['nodes'].items():
        if len(nd) < 3:
            continue
        t = nd[2]
        x, y = nodeM[nid]
        if not inz(x, y):
            continue
        if t.get('natural') == 'tree':
            trees.append([r2(x), r2(y)])
        elif t.get('highway') == 'street_lamp':
            lamps.append([r2(x), r2(y), 1])
        elif t.get('amenity') == 'bench':
            benches.append([r2(x), r2(y)])
        kind = t.get('shop') or t.get('amenity') or t.get('tourism') or t.get('historic') or t.get('craft') or t.get('office')
        if kind and t.get('name'):
            pois.append({'n': t['name'], 't': kind, 'x': r2(x), 'y': r2(y)})
    for wid, (refs, tags) in ways.items():
        if tags.get('natural') == 'tree_row':
            ls = LineString(line(wid))
            d = 0.0
            while d <= ls.length:
                p = ls.interpolate(d)
                if inz(p.x, p.y):
                    trees.append([r2(p.x), r2(p.y)])
                d += 8.0
    allp = [p for p, _, _ in polys]
    for s in st_named:
        ls = s['_ls']
        if s['k'] > 3:
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
            near_house = any(allp[j].distance(p) < 35 for j in tree.query(p.buffer(35)))
            if near_house:
                for off in (3.6, 3.0, 4.6, 2.4):
                    x, y = p.x - ty / tl * off * side, p.y + tx / tl * off * side
                    pt = Point(x, y)
                    if all(allp[j].distance(pt) > 0.5 for j in tree.query(pt.buffer(1.0))) and not any(math.hypot(x - l[0], y - l[1]) < 15 for l in lamps):
                        lamps.append([r2(x), r2(y), 0])
                        ok = True
                        break
            d += 32.0 if ok else 8.0
            k += 1
    # trees from the orthophoto: dark green crowns (excess green, low luminance), smoothed; local maxima at least 6 m apart, outside
    # buildings, roads, water, the church and the nursery (the app plants its own stock there) -> [x, y, crown radius]
    if isinstance(ortho, OrthoWMS):
        from scipy import ndimage
        img = ortho.img.astype(np.float32) / 255.0
        e0, n0, e1, n1 = ortho.bb
        H, W = img.shape[:2]
        px = (e1 - e0) / W
        r_, g_, b_ = img[..., 0], img[..., 1], img[..., 2]
        lum = 0.3 * r_ + 0.59 * g_ + 0.11 * b_
        veg = ((2 * g_ - r_ - b_) > 0.035) & (lum < 0.3) & (lum > 0.04)
        sm = ndimage.gaussian_filter(veg.astype(np.float32), 1.6 / px)
        mx_ = ndimage.maximum_filter(sm, size=int(6.0 / px) | 1)
        peaks = np.argwhere((sm == mx_) & (sm > 0.62))
        blocked = [p for p, _, _ in polys]
        nurs = [Polygon(list(zip(r['p'][::2], r['p'][1::2]))) for r in areas if r['k'] in ('nursery', 'water')]
        if kirche.get('area'):
            nurs.append(Polygon(list(zip(kirche['area'][::2], kirche['area'][1::2]))).buffer(2.0))
        road_ls = [s_['_ls'].buffer({1: 4.5, 2: 4.0, 3: 3.5, 5: 2.5}.get(s_['k'], 1.5)) for s_ in streets if s_['k'] <= 8]
        from shapely.strtree import STRtree as _T
        rt = _T(road_ls) if road_ls else None
        found = []
        for (r0, c0) in peaks:
            E_ = e0 + (c0 + 0.5) * px
            N_ = n1 - (r0 + 0.5) * px
            x, y = model_from_utm(E_, N_)
            if not inz(x, y):
                continue
            pt = Point(x, y)
            if any(bp.distance(pt) < 1.5 for bp in (blocked[j] for j in tree.query(pt.buffer(2.0)))):
                continue
            if any(n_.contains(pt) for n_ in nurs):
                continue
            if rt is not None and len(rt.query(pt, predicate='intersects')):
                continue
            # crown radius: how far the smoothed mask stays above half its peak along four directions
            rad = []
            for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                k = 1
                while k < int(9 / px) and 0 <= r0 + dr * k < H and 0 <= c0 + dc * k < W and sm[r0 + dr * k, c0 + dc * k] > sm[r0, c0] * 0.5:
                    k += 1
                rad.append(k * px)
            found.append((float(sm[r0, c0]), x, y, float(np.clip(np.mean(rad), 1.8, 7.5))))
        # the forests around are full of them: the nearest to the place first
        found.sort(key=lambda q: math.hypot(q[1] - ORT[0], q[2] - ORT[1]))
        for sc_, x, y, rr in found[:450]:
            trees.append([r2(x), r2(y), r2(rr), 0])
        log('Bäume aus dem Luftbild:', min(len(found), 450), 'von', len(found))
    # deciduous trees: the DOP flight of 7 April 2024 shows them leafless (no green crowns to find) - on the lawns of the monastery grounds
    # and in the village gardens, after the drone photos 2021 (Ermell): a jittered 10 m grid away from buildings, streets, paths, water
    from shapely.strtree import STRtree as _T2
    mus = next((Polygon(list(zip(r['p'][::2], r['p'][1::2]))) for r in areas if r['k'] == 'museum'), None)
    block = [p.buffer(4.0) for p, _, _ in polys]
    block += [s_['_ls'].buffer({1: 5.0, 2: 4.5, 3: 4.0, 5: 3.0, 6: 2.5}.get(s_['k'], 2.0)) for s_ in streets]
    block += [Polygon(list(zip(r['p'][::2], r['p'][1::2]))).buffer(1.5) for r in areas if r['k'] in ('water', 'cemetery', 'nursery', 'parking', 'garden')]
    if kirche.get('area'):
        block.append(Polygon(list(zip(kirche['area'][::2], kirche['area'][1::2]))).buffer(9.0))
    block += [LineString(list(zip(w['p'][::2], w['p'][1::2]))).buffer(1.5) for w in walls if len(w['p']) >= 4]
    bt = _T2(block)
    houses = _T2([p for p, _, _ in polys])
    rng2 = np.random.default_rng(11)
    have = [(t_[0], t_[1]) for t_ in trees]
    nd = 0
    for gx in np.arange(zone[0], zone[2], 10.0):
        for gy in np.arange(zone[1], zone[3], 10.0):
            x, y = gx + rng2.uniform(-3.5, 3.5), gy + rng2.uniform(-3.5, 3.5)
            pt = Point(x, y)
            if mus is not None and mus.contains(pt):
                pr = 0.42
            elif len(houses.query(pt.buffer(28.0))):
                pr = 0.14
            else:
                continue
            if rng2.random() > pr or len(bt.query(pt, predicate='intersects')):
                continue
            if any(abs(hx - x) < 6 and abs(hy - y) < 6 for hx, hy in have):
                continue
            have.append((x, y))
            trees.append([r2(x), r2(y), r2(rng2.uniform(2.8, 5.5)), 1])
            nd += 1
    log('Laubbäume auf den Wiesen und in den Gärten:', nd)
    log('Bäume:', len(trees), 'Laternen:', len(lamps), 'Bänke:', len(benches), 'Orte:', len(pois))

    os.makedirs(a.out, exist_ok=True)
    doc = {
        'v': 1, 'generated': time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()), 'ort': list(ORT), 'kirche_c': list(KIRCHE),
        'zone': [r2(v) for v in zone],
        'src': 'Gebäude, Straßen, Orte: © OpenStreetMap-Mitwirkende (ODbL 1.0); Dachfarben: Luftbild © GDI-Th (CC BY 4.0)',
        'osm': osm.get('fetched', ''),
        'b': out, 'st': [{k: v for k, v in s.items() if k != '_ls'} for s in streets], 'kirche': kirche,
        'walls': walls, 'fences': fences, 'hedges': hedges, 'gates': gates, 'areas': areas, 'rivers': rivers,
        'trees': trees, 'lamps': lamps, 'benches': benches, 'poi': pois,
    }
    p = os.path.join(a.out, 'ort.json')
    json.dump(doc, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
    log(f'{p}: {os.path.getsize(p) / 1e6:.2f} MB, {len(out)} Gebäude, {len(streets)} Straßen, {len(walls)} Mauern, {time.time() - T0:.0f} s')


if __name__ == '__main__':
    main()
