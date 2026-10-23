"""Detail zone Schleusingen (the old town around the Markt): buildings, streets, places, lamps from OpenStreetMap, roof colours from the
orthophoto tiles of the world (welt-test, level 11) -> one JSON the app loads when the player comes near (viz3/src/welt/schleusingen.js).
  python3 -I tools/welt/zone_schleusingen.py --raw <cache dir> [--out viz3/extra/schleusingen/dist/schleusingen] [--tiles <welt-test URL>]
Coordinates: the app's model metres (x east, y north; wlib.model_from_utm), heights relative to each building's foot (the app puts the foot on
the terrain it streams). Per building: footprint (CCW), facades (wall runs with their top line: start, apex, end), roof faces (triangles,
z above the foot), roof kind and colour, eave, storeys, name, address, shops inside. Sources: © OpenStreetMap contributors (ODbL 1.0),
DOP © GDI-Th (CC BY 4.0) for the roof colours. The landmarks (Rathaus, St. Johannis, Bertholdsburg) are flagged; the app models them."""
import argparse, io, json, math, os, sys, time, zlib
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wlib import log, XF, model_from_utm, tsize, ROOT_E0, ROOT_N0, http_get

# the Markt fountain (orthophoto) is the centre of the zone; buildings within HALF metres (model) are built
MARKT = (-1084.7, 1241.9)
HALF = 560.0
# the 2.4 km square of world/ratscher.js (inner 10 m terrain, its 337 buildings): buildings there are left to it
RBOX = (-1031.6218, -1335.5810, 1368.3782, 1064.4190)
LANDMARK = {'w34216657': 'rathaus', 'w34214541': 'kirche', 'r2742528': 'burg', 'w264583984': 'turm'}
HOUSE = {'house', 'residential', 'detached', 'semidetached_house', 'terrace', 'apartments', 'yes', 'farm', 'bungalow', 'dormitory',
         'school', 'kindergarten', 'public', 'civic', 'hotel', 'office', 'commercial', 'retail', 'townhall'}
SMALL = {'garage', 'garages', 'shed', 'carport', 'hut', 'roof', 'kiosk', 'toilets', 'service', 'transformer_tower', 'allotment_house', 'cabin'}
BIG = {'barn', 'farm_auxiliary', 'agricultural', 'industrial', 'warehouse', 'stable', 'cowshed', 'hangar', 'greenhouse', 'manufacture',
       'sports_hall', 'supermarket', 'storage_tank', 'silo', 'train_station'}
STREET_KIND = {'motorway': 0, 'trunk': 1, 'primary': 1, 'secondary': 1, 'tertiary': 2, 'unclassified': 3, 'residential': 3, 'living_street': 3,
               'pedestrian': 3, 'service': 5, 'track': 6, 'path': 7, 'footway': 8, 'steps': 8, 'cycleway': 7, 'tertiary_link': 2}


def r2(v):
    return round(float(v), 2)


def fetch_osm_zone(raw):
    from fetch import fetch_osm
    from pyproj import Transformer
    toLL = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
    a, b = XF['a'], XF['b']
    cs = [(MARKT[0] + sx * (HALF + 80), MARKT[1] + sy * (HALF + 80)) for sx in (-1, 1) for sy in (-1, 1)]
    E = [a * x - b * y + XF['ex'] for x, y in cs]
    N = [b * x + a * y + XF['ey'] for x, y in cs]
    lo, la = toLL.transform(E, N)
    ll = (round(min(lo), 4), round(min(la), 4), round(max(lo), 4), round(max(la), 4))
    os.environ.setdefault('WELT_NO_OVERPASS', '1')
    return fetch_osm(raw, ll)


class Ortho:
    """orthophoto colours from the world's level-11 imagery tiles (0.39 m per pixel), fetched once into the cache"""
    def __init__(self, raw, base):
        self.raw, self.base, self.cache = raw, base.rstrip('/') + '/', {}

    def tile(self, x, y):
        k = (x, y)
        if k in self.cache:
            return self.cache[k]
        p = os.path.join(self.raw, 'i11', f'{x}_{y}.webp')
        if not os.path.exists(p):
            try:
                st, b, ct = http_get(f'{self.base}i/11/{x}/{y}.webp', tries=3, timeout=60)
            except Exception:
                st, b = 0, b''
            if st != 200:
                self.cache[k] = None
                return None
            os.makedirs(os.path.dirname(p), exist_ok=True)
            open(p, 'wb').write(b)
        from PIL import Image
        self.cache[k] = np.asarray(Image.open(p).convert('RGB'))
        return self.cache[k]

    def __call__(self, E, N):
        s = tsize(11)
        x, y = int((E - ROOT_E0) // s), int((N - ROOT_N0) // s)
        t = self.tile(x, y)
        if t is None:
            return None
        u = (E - ROOT_E0 - x * s) / s
        v = (N - ROOT_N0 - y * s) / s
        c = t[min(511, int((1 - v) * 512)), min(511, int(u * 512))]
        return c / 255.0


def hsl(c):
    mx, mn = max(c), min(c)
    l = (mx + mn) / 2
    d = mx - mn
    if d < 1e-4:
        return 0.0, 0.0, l
    s = d / (1 - abs(2 * l - 1))
    if mx == c[0]:
        h = ((c[1] - c[2]) / d) % 6
    elif mx == c[1]:
        h = (c[2] - c[0]) / d + 2
    else:
        h = (c[0] - c[1]) / d + 4
    return (h * 60 + 360) % 360, s, l


def clip_half(pts, A, B, C):
    """Sutherland-Hodgman: keep A t + B d + C <= 0"""
    out = []
    for i in range(len(pts)):
        p, q = pts[i], pts[(i + 1) % len(pts)]
        fp, fq = A * p[0] + B * p[1] + C, A * q[0] + B * q[1] + C
        if fp <= 0:
            out.append(p)
        if (fp < 0 < fq) or (fq < 0 < fp):
            l_ = fp / (fp - fq)
            out.append((p[0] + (q[0] - p[0]) * l_, p[1] + (q[1] - p[1]) * l_))
    return out


def roof_faces(poly, planes, over, inner=()):
    """faces of the roof z = min(min(planes), max(inner)) over the footprint grown by the overhang: [(vertices (k,3), triangles (m,3))]
    in the frame of the planes. `inner` (a ring building): planes rising away from the courtyard - the roof there is their maximum."""
    from shapely.geometry import Polygon
    from shapely.geometry.polygon import orient
    from shapely.ops import unary_union
    import mapbox_earcut as earcut
    rp = orient(poly.buffer(over, join_style=2, mitre_limit=2.5), 1.0) if over > 0 else poly
    big = [(-900, -900), (900, -900), (900, 900), (-900, 900)]
    cells = []
    for j, (gt, gd, cc) in enumerate(inner):
        cell = big
        for m, (gt2, gd2, c2) in enumerate(inner):
            if m != j:
                cell = clip_half(cell, gt2 - gt, gd2 - gd, c2 - cc)   # z_j >= z_m
        for (gt2, gd2, c2) in planes:
            cell = clip_half(cell, gt - gt2, gd - gd2, cc - c2)       # z_j <= z_k
        if len(cell) >= 3:
            cells.append(((gt, gd, cc), Polygon(cell)))
    used = unary_union([c for _, c in cells]) if cells else None
    for i, (gt, gd, cc) in enumerate(planes):
        cell = big
        for j, (gt2, gd2, c2) in enumerate(planes):
            if j != i:
                cell = clip_half(cell, gt - gt2, gd - gd2, cc - c2)
        if len(cell) < 3:
            continue
        cg = Polygon(cell)
        if used is not None:
            cg = cg.difference(used)
        cells.append(((gt, gd, cc), cg))
    out = []
    for (gt, gd, cc), cg in cells:
        face = rp.intersection(cg)
        for pg in (face.geoms if hasattr(face, 'geoms') else [face]):
            if pg.geom_type != 'Polygon' or pg.area < 0.05:
                continue
            pg = orient(pg.simplify(0.02), 1.0)
            rr = [np.array(pg.exterior.coords)[:-1]] + [np.array(h.coords)[:-1] for h in pg.interiors]
            vv = np.vstack(rr)
            ends = np.cumsum([len(x) for x in rr]).astype(np.uint32)
            tri = earcut.triangulate_float64(vv.astype(np.float64), ends).reshape(-1, 3)
            if not len(tri):
                continue
            cr = ((vv[tri[:, 1], 0] - vv[tri[:, 0], 0]) * (vv[tri[:, 2], 1] - vv[tri[:, 0], 1])
                  - (vv[tri[:, 1], 1] - vv[tri[:, 0], 1]) * (vv[tri[:, 2], 0] - vv[tri[:, 0], 0]))
            tri[cr < 0] = tri[cr < 0][:, ::-1]
            z = gt * vv[:, 0] + gd * vv[:, 1] + cc
            out.append((np.column_stack([vv, z]), tri))
    return out


def zroof(planes, t, d, inner=()):
    z = min(gt * t + gd * d + c for (gt, gd, c) in planes)
    if inner:
        z = min(z, max(gt * t + gd * d + c for (gt, gd, c) in inner))
    return z


def walls_of(ring, planes, inner=()):
    """facades of one ring: per edge (a, b) the top line - start, apex (where the roof planes change along the edge), end"""
    F = []
    n = len(ring)
    for i in range(n):
        p0, p1 = ring[i], ring[(i + 1) % n]
        L = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
        if L < 0.05:
            continue
        lam = {0.0, 1.0}
        allp = list(planes) + list(inner)
        for a_ in range(len(allp)):
            for b_ in range(a_ + 1, len(allp)):
                g1, g2 = allp[a_], allp[b_]
                f0 = (g1[0] - g2[0]) * p0[0] + (g1[1] - g2[1]) * p0[1] + g1[2] - g2[2]
                f1 = (g1[0] - g2[0]) * p1[0] + (g1[1] - g2[1]) * p1[1] + g1[2] - g2[2]
                if (f0 < 0 < f1) or (f1 < 0 < f0):
                    lam.add(f0 / (f0 - f1))
        lam = sorted(lam)
        zs = [zroof(planes, p0[0] + (p1[0] - p0[0]) * l_, p0[1] + (p1[1] - p0[1]) * l_, inner) for l_ in lam]
        k = int(np.argmax(zs))
        t0, t1 = zs[0], zs[-1]
        if 0 < k < len(zs) - 1 and zs[k] > max(t0, t1) + 0.3:
            F.append((i, lam[k] * L, zs[k], t0, t1, L))
        else:
            F.append((i, L / 2, (t0 + t1) / 2, t0, t1, L))
    return F


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', required=True)
    ap.add_argument('--out', default=os.path.join(os.path.dirname(__file__), '..', '..', 'viz3', 'extra', 'schleusingen', 'dist', 'schleusingen'))
    ap.add_argument('--tiles', default='https://mynametouse.github.io/pavillon-ratscher/welt-test/')
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
    nodeU = {i: (float(e), float(n)) for i, e, n in zip(ids, E, N)}
    ortho = Ortho(a.raw, a.tiles)
    a_, b_ = XF['a'], XF['b']
    toU = lambda x, y: (a_ * x - b_ * y + XF['ex'], b_ * x + a_ * y + XF['ey'])
    zone = (MARKT[0] - HALF, MARKT[1] - HALF, MARKT[0] + HALF, MARKT[1] + HALF)
    inz = lambda x, y: zone[0] <= x <= zone[2] and zone[1] <= y <= zone[3]
    inbox = lambda x, y: RBOX[0] + 2 < x < RBOX[2] and RBOX[1] < y < RBOX[3] - 2

    # ---- footprints ----
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
            if pg.geom_type != 'Polygon' or pg.area < 8:
                continue
        except Exception:
            continue
        c = pg.centroid
        if not inz(c.x, c.y) or inbox(c.x, c.y):
            continue
        polys.append((orient(pg.simplify(0.15), 1.0), tags, fid))
    log('Gebäude in der Zone:', len(polys))
    tree = STRtree([p for p, _, _ in polys])

    # ---- streets (names for the HUD, door side, lamps) ----
    streets = []
    for wid, (refs, tags) in osm['ways'].items():
        hw = tags.get('highway')
        if hw not in STREET_KIND or len(refs) < 2:
            continue
        pts = [nodeM[r] for r in refs if r in nodeM]
        if len(pts) < 2 or not any(inz(x, y) for x, y in pts):
            continue
        ls = LineString(pts).simplify(0.5)
        streets.append({'n': tags.get('name', ''), 'k': STREET_KIND[hw], 's': tags.get('surface', ''),
                        'p': [r2(v) for xy in ls.coords for v in xy], '_ls': ls})
    st_named = [s for s in streets if s['n'] and s['k'] <= 5]
    st_tree = STRtree([s['_ls'] for s in st_named]) if st_named else None
    log('Straßen:', len(streets), 'mit Namen:', len(st_named))

    # ---- shops, offices, inns inside buildings ----
    pois = []
    for nid, nd in osm['nodes'].items():
        if len(nd) < 3:
            continue
        t = nd[2]
        kind = t.get('shop') or t.get('amenity') or t.get('craft') or t.get('office') or t.get('tourism')
        if not kind or not t.get('name'):
            continue
        x, y = nodeM[nid]
        if not inz(x, y):
            continue
        pois.append({'n': t['name'], 't': kind, 'x': r2(x), 'y': r2(y), 'a': (t.get('addr:street', '') + ' ' + t.get('addr:housenumber', '')).strip()})

    # ---- buildings ----
    out = []
    dM = lambda x, y: math.hypot(x - MARKT[0], y - MARKT[1])
    for bi, (poly, tags, fid) in enumerate(polys):
        typ = tags.get('building', 'yes')
        lm = LANDMARK.get(fid, '')
        A = poly.area
        c = poly.centroid
        old = dM(c.x, c.y) < 300
        lv = None
        try:
            lv = float(str(tags.get('building:levels', '')).replace(',', '.'))
        except ValueError:
            pass
        ht = None
        try:
            ht = float(str(tags.get('height', '')).replace('m', '').replace(',', '.'))
        except ValueError:
            pass
        small = typ in SMALL or A < 25
        big = typ in BIG or (typ in ('yes', 'industrial', 'commercial', 'retail') and A > 450)
        kind = 2 if small else 1 if big else 0
        # storeys: the tag, else 3 at the Markt, 2-3 in the old town, 2 outside; sheds one
        h = (zlib.crc32(fid.encode()) & 0xffff) / 65535.0
        if lv is None:
            lv = 1 if small else (2 if big else (3 if dM(c.x, c.y) < 70 else (2 + (h < 0.45) if old else 2)))
        if typ == 'church' or lm == 'kirche':
            kind = 3
        mrr = np.array(poly.minimum_rotated_rectangle.exterior.coords)[:4]
        e1, e2 = mrr[1] - mrr[0], mrr[2] - mrr[1]
        if np.hypot(*e1) >= np.hypot(*e2):
            ux, W, Lr = e1 / max(np.hypot(*e1), 1e-9), np.hypot(*e2), np.hypot(*e1)
        else:
            ux, W, Lr = e2 / max(np.hypot(*e2), 1e-9), np.hypot(*e1), np.hypot(*e2)
        ctr = mrr.mean(axis=0)
        uy = np.array([-ux[1], ux[0]])
        stH = 2.75 if kind == 0 else 3.0
        plinth = 0.45 if kind == 0 else 0.0
        eave = (plinth + stH * lv - 0.05) if not small else 2.4
        if big:
            eave = max(4.5, 3.6 * lv)
        if ht:
            eave = max(2.2, ht * 0.62)
        shape = tags.get('roof:shape', '')
        flat = shape == 'flat' or (A > 1400) or (big and A > 900) or len(poly.interiors) > 0
        if shape in ('gabled', 'hipped', 'pitched', 'half-hipped', 'gambrel', 'mansard'):
            flat = False
        pitch = 15.0 if big else 22.0 if small else (48.0 if old else 42.0)
        if kind == 3:
            eave, pitch = 12.5, 55.0
        hip = shape in ('hipped', 'half-hipped') or lm == 'rathaus' or (kind == 0 and A > 260 and not old and h < 0.3)
        if lm == 'burg':
            flat = False
        rise = 0.0 if flat else min(W / 2 * math.tan(math.radians(pitch)), 11.0 if kind != 3 else 16.0)
        loc = lambda Q: np.stack([(Q[:, 0] - ctr[0]) * ux[0] + (Q[:, 1] - ctr[1]) * ux[1], (Q[:, 0] - ctr[0]) * uy[0] + (Q[:, 1] - ctr[1]) * uy[1]], 1)
        back = lambda t, d: (ctr[0] + t * ux[0] + d * uy[0], ctr[1] + t * ux[1] + d * uy[1])
        k_ = rise / max(W / 2, 0.5)
        if flat:
            planes = [(0.0, 0.0, eave)]
        else:
            planes = [(0.0, -k_, eave + rise), (0.0, k_, eave + rise)]
            if hip:
                # hip planes at the ends; half-hipped ("Krüppelwalm"): the end planes only cut the upper third
                ke = k_ * (1.0 if shape != 'half-hipped' else 1.6)
                ce = eave + ke * Lr / 2 + (rise * 0.6 if shape == 'half-hipped' else 0)
                if lm == 'rathaus':
                    # the Rathaus shows its gable to the Markt (photos 2008, 2025) and is hipped at the back
                    tm = (MARKT[0] - ctr[0]) * ux[0] + (MARKT[1] - ctr[1]) * ux[1]
                    planes += [(ke, 0.0, ce)] if tm < 0 else [(-ke, 0.0, ce)]
                else:
                    planes += [(-ke, 0.0, ce), (ke, 0.0, ce)]
        ring = np.array(poly.exterior.coords)[:-1]
        if lm == 'burg':
            # the castle: four wings round the courtyard - one plane per wall line of the simplified outer and inner rings, falling inwards
            # into the wing (convex rings: the minimum of the planes is the hipped roof with its valleys)
            ctr = np.array([c.x, c.y])
            ux, uy = np.array([1.0, 0.0]), np.array([0.0, 1.0])
            outer = orient(Polygon(ring - ctr).convex_hull.simplify(1.5), 1.0)
            inner = [orient(Polygon(np.array(hh_.coords)[:-1] - ctr).convex_hull.simplify(1.0), 1.0) for hh_ in poly.interiors]
            eave, pitch = 14.0, 50.0
            kk = math.tan(math.radians(pitch))
            planes, iplanes = [], []
            for rg, sgn in [(np.array(outer.exterior.coords)[:-1], 1)] + [(np.array(q.exterior.coords)[:-1], -1) for q in inner]:
                for i in range(len(rg)):
                    p0, p1 = rg[i], rg[(i + 1) % len(rg)]
                    dx, dy = p1 - p0
                    L = math.hypot(dx, dy)
                    if L < 2:
                        continue
                    # inward normal of a CCW ring is (-dy, dx); for the courtyard (also CCW) the wing lies outside: flip
                    nx, ny = -dy / L * sgn, dx / L * sgn
                    # z = eave + kk * ((p - p0) . n)
                    (planes if sgn > 0 else iplanes).append((kk * nx, kk * ny, eave - kk * (p0[0] * nx + p0[1] * ny)))
            planes.append((0.0, 0.0, eave + 9.0))
            loc = lambda Q: np.asarray(Q, float) - ctr
            back = lambda t, d: (t + ctr[0], d + ctr[1])
        Q = loc(ring)
        ip = iplanes if lm == 'burg' else ()
        lp = Polygon(Q, [loc(np.array(hh_.coords)[:-1]) for hh_ in poly.interiors])
        # facades of the outer ring and the courtyard rings (in model coordinates)
        rings = [ring] + [np.array(hh_.coords)[:-1] for hh_ in poly.interiors]
        fac = []
        for ri, rg in enumerate(rings):
            ql = loc(rg)
            for (i, uA, tA, ta, tb, L) in walls_of([tuple(p) for p in ql], planes, ip):
                p0, p1 = rg[i], rg[(i + 1) % len(rg)]
                # a wall shared with a neighbour (another footprint along it) has no windows; a wall facing a street within 14 m gets the door
                mid = Point((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)
                dx, dy = (p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L
                nx, ny = dy, -dx   # outward for a CCW ring (inner rings are CW after orient: the normal points into the courtyard)
                probe = Point(mid.x + nx * 0.6, mid.y + ny * 0.6)
                shared = False
                for j in tree.query(probe.buffer(0.3)):
                    if j != bi and polys[j][0].distance(probe) < 0.35:
                        shared = True
                        break
                fl = 1 if shared else 0
                sd = 99.0
                if st_tree is not None and not shared and L > 2.5:
                    for d_ in (3.0, 6.0, 10.0, 14.0):
                        pr = Point(mid.x + nx * d_, mid.y + ny * d_)
                        hit = [k for k in st_tree.query(pr.buffer(2.5)) if st_named[k]['_ls'].distance(pr) < 2.5]
                        if hit:
                            sd = d_
                            break
                fac.append([r2(p0[0]), r2(p0[1]), r2(p1[0]), r2(p1[1]), r2(ta), r2(uA), r2(tA), r2(tb), fl, r2(sd)])
        # roof faces (grown by the overhang), back in model coordinates, z above the foot
        over = 0.0 if flat else (0.45 if kind == 0 else 0.3)
        if lm == 'burg':
            over = 0.35
        faces = roof_faces(lp, planes, over, ip)
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
            if not poly.contains(Point(x, y)) or poly.exterior.distance(Point(x, y)) < 0.8:
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
            col = np.array([0.55, 0.3, 0.22])
        hh, ss, ll = hsl(col)
        if flat:
            rk = 4
        elif big:
            rk = 2 if ll > 0.45 else 1 if ss < 0.2 else 0
        elif ss < 0.14 and ll < 0.36:
            rk = 3
        else:
            rk = 0
        if rk == 0 and (ss < 0.22 or (40 < hh < 300)):
            col = np.array([0.4, 0.24, 0.18]) if ll < 0.3 else np.array([0.66, 0.32, 0.22])
        if rk == 4:
            l_ = col.mean()
            col = np.minimum(0.62, l_ * 0.8 + col * 0.2)
        if lm in ('kirche',):
            rk, col = 3, np.array([0.2, 0.21, 0.23])
        if lm == 'rathaus':
            rk, col = 0, np.array([0.7, 0.3, 0.19])
        if lm == 'burg':
            rk, col = 0, np.array([0.72, 0.33, 0.2])
        shops = [p['n'] for p in pois if poly.buffer(1.5).contains(Point(p['x'], p['y']))]
        b = {'i': bi, 'k': kind, 'f': [r2(v) for xy in ring for v in xy], 'e': r2(eave), 'lv': int(lv), 'rk': rk,
             'rc': [r2(v) for v in col], 'F': fac, 'rv': V, 'rt': T}
        if poly.interiors:
            b['h'] = [[r2(v) for xy in np.array(hh_.coords)[:-1] for v in xy] for hh_ in poly.interiors]
        if flat:
            b['fl'] = 1
        if lm:
            b['lm'] = lm
        if tags.get('name'):
            b['n'] = tags['name']
        if tags.get('addr:street'):
            b['a'] = (tags['addr:street'] + ' ' + tags.get('addr:housenumber', '')).strip()
        if shops:
            b['s'] = shops
        if tags.get('building:colour'):
            b['wc'] = tags['building:colour']
        b['old'] = 1 if old else 0
        if lm in ('burg', 'turm'):
            # round towers: runs of short edges on the outline (arcs); centre from three points of the run
            pts = ring
            n_ = len(pts)
            el = [math.hypot(*(pts[(i + 1) % n_] - pts[i])) for i in range(n_)]
            runs, cur = [], []
            for i in range(n_):
                if el[i] < 4.2:
                    cur.append(i)
                elif cur:
                    runs.append(cur)
                    cur = []
            if cur:
                if runs and runs[0][0] == 0:
                    runs[0] = cur + runs[0]
                else:
                    runs.append(cur)
            tw = []
            for rn in runs:
                idx = rn + [(rn[-1] + 1) % n_]
                if len(idx) < 3:
                    continue
                P3 = [pts[idx[0]], pts[idx[len(idx) // 2]], pts[idx[-1]]]
                (x1, y1), (x2, y2), (x3, y3) = P3
                dd = 2 * (x1 * (y2 - y3) + x2 * (y3 - y1) + x3 * (y1 - y2))
                if abs(dd) < 1e-6:
                    continue
                ux_ = ((x1 * x1 + y1 * y1) * (y2 - y3) + (x2 * x2 + y2 * y2) * (y3 - y1) + (x3 * x3 + y3 * y3) * (y1 - y2)) / dd
                uy_ = ((x1 * x1 + y1 * y1) * (x3 - x2) + (x2 * x2 + y2 * y2) * (x1 - x3) + (x3 * x3 + y3 * y3) * (x2 - x1)) / dd
                rr = float(np.mean([math.hypot(pts[k][0] - ux_, pts[k][1] - uy_) for k in idx]))
                if 1.5 < rr < 7:
                    tw.append([r2(ux_), r2(uy_), r2(rr)])
            b['tw'] = tw
        out.append(b)

    # ---- lamps: OSM street lamps, then along the named old-town streets every ~24 m (alternating sides, kept off walls) ----
    lamps = []
    for nid, nd in osm['nodes'].items():
        if len(nd) > 2 and nd[2].get('highway') == 'street_lamp':
            x, y = nodeM[nid]
            if inz(x, y):
                lamps.append([r2(x), r2(y), 1])
    allp = [p for p, _, _ in polys]
    for s in st_named:
        ls = s['_ls']
        mid = ls.interpolate(0.5, normalized=True)
        if dM(mid.x, mid.y) > 330 or s['k'] > 3:
            continue
        L = ls.length
        k = 0
        d = 10.0
        while d < L - 4:
            p = ls.interpolate(d)
            q = ls.interpolate(min(L, d + 1.0))
            tx, ty = q.x - p.x, q.y - p.y
            tl = math.hypot(tx, ty) or 1
            side = 1 if k % 2 == 0 else -1
            ok = False
            for off in (3.2, 2.6, 4.2, 2.0):
                x, y = p.x - ty / tl * off * side, p.y + tx / tl * off * side
                pt = Point(x, y)
                if all(allp[j].distance(pt) > 0.45 for j in tree.query(pt.buffer(1.0))) and not any(math.hypot(x - l[0], y - l[1]) < 12 for l in lamps):
                    lamps.append([r2(x), r2(y), 0])
                    ok = True
                    break
            d += 24.0 if ok else 6.0
            k += 1
    log('Laternen:', len(lamps))

    # ---- the Markt (marketplace outline), benches, fountains ----
    markt = None
    benches, fountains = [], []
    for wid, (refs, tags) in osm['ways'].items():
        if tags.get('amenity') == 'marketplace' and tags.get('name') == 'Markt':
            markt = [r2(v) for r in refs[:-1] if r in nodeM for v in nodeM[r]]
    for nid, nd in osm['nodes'].items():
        if len(nd) < 3:
            continue
        x, y = nodeM[nid]
        if not inz(x, y):
            continue
        if nd[2].get('amenity') == 'bench':
            benches.append([r2(x), r2(y)])
        if nd[2].get('amenity') == 'fountain':
            fountains.append([r2(x), r2(y)])

    os.makedirs(a.out, exist_ok=True)
    doc = {
        'v': 1, 'generated': time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()), 'markt': list(MARKT), 'zone': [r2(v) for v in zone],
        'src': 'Gebäude, Straßen, Orte: © OpenStreetMap-Mitwirkende (ODbL 1.0); Dachfarben: Luftbild © GDI-Th (CC BY 4.0)',
        'osm': osm.get('fetched', ''),
        'b': out,
        'st': [{k: v for k, v in s.items() if k != '_ls'} for s in streets],
        'poi': pois, 'lamps': lamps, 'marktplatz': markt, 'benches': benches, 'fountains': fountains,
    }
    p = os.path.join(a.out, 'stadt.json')
    json.dump(doc, open(p, 'w'), ensure_ascii=False, separators=(',', ':'))
    log(f'{p}: {os.path.getsize(p) / 1e6:.2f} MB, {len(out)} Gebäude, {len(streets)} Straßen, {len(pois)} Orte, {time.time() - T0:.0f} s')


if __name__ == '__main__':
    main()
