"""Designed areas (part e): what the photo cannot tell apart but every village has – beds in the front gardens along the street side of
the houses (13), a vegetable plot behind some houses and in the allotments (14), the green of roundabouts, traffic islands, medians and
car parks (15), the paths of the cemeteries (0 in 16). Rules with a reproducible number per house or place (h01: the same house gets the
same beds in every build and in both cells it touches). The modelled site (SITE_ZONE) is left to the garden map.

  gestaltung.apply(q, g, cls, ctx)   # in klassen.classify, before the built things; ctx: carr, rkind, bldx, water, use, bare, vil, X, Y"""
import hashlib, os, sys
import numpy as np
import shapely
from shapely.geometry import LineString, Point, Polygon, box
from shapely.geometry.polygon import orient
from shapely.ops import polygonize, unary_union
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemeinsam import K, SITE_ZONE  # noqa: E402
import raster  # noqa: E402

FRONT_SHARE = 0.60        # houses with beds in the front garden
FRONT_W = (0.6, 1.5)      # m: the bed along the wall towards the street
FRONT_DEPTH = 25.0        # m: a wall faces the street when the street is this near and in front of it (cos ≥ 0.6)
VEG_SHARE = 0.30          # gardens with a vegetable plot (where the lawn behind the house has room for it)
VEG_AREA = (10.0, 40.0)   # m² of the plot
ALLOT_SHARE = 0.30        # allotments: the share of their lawn dug as beds (strips of 3 × 8 m along each allotment area's long side)
ALLOT_BED = (8.0, 3.0)    # m: a bed's length (along the area's long side) and width
HOUSE_AREA = (40.0, 400.0)
STREETS = (1, 2, 3, 4)    # road kinds a house faces (main, county, street, lane – not the motorway, driveways, tracks, paths)
MEDIAN_GAP = 6.0          # m: the gap between two one-way carriageways closed into a median
SOFT = ('zierrasen', 'oeffentlich', 'bankett', 'maehwiese', 'weide', 'saum', 'gebuesch', 'gemuese', 'sportrasen')
NOT_HOUSE = {'garage', 'garages', 'shed', 'barn', 'industrial', 'commercial', 'retail', 'farm_auxiliary', 'roof', 'carport', 'church',
             'chapel', 'cathedral', 'school', 'warehouse', 'service', 'transformer_tower', 'hut', 'cabin', 'greenhouse', 'cowshed', 'stable',
             'sty', 'hangar', 'kiosk', 'toilets', 'ruins', 'construction', 'static_caravan', 'container', 'silo', 'storage_tank', 'bunker',
             'public', 'civic', 'government', 'hospital', 'kindergarten', 'office', 'hotel', 'supermarket', 'sports_hall', 'fire_station',
             'train_station', 'transportation', 'parking', 'tower', 'water_tower', 'castle', 'monastery', 'manufacture', 'boathouse',
             'gatehouse', 'garden_shed', 'allotment_house', 'tree_house', 'digester', 'slurry_tank'}


def h01(*key):
    """a reproducible number in [0, 1) from a key (the same in every build, on every machine)"""
    return int(hashlib.md5('_'.join(str(k) for k in key).encode()).hexdigest()[:8], 16) / 2 ** 32


def is_house(poly, tags=None, kind=None):
    """a dwelling by its footprint: ETHOS kind 0 (dist/gebaeude), an OSM building that is no shed, barn, garage …, 40–400 m², not long"""
    a = poly.area
    if not (HOUSE_AREA[0] <= a <= HOUSE_AREA[1]):
        return False
    if kind is not None:
        return kind == 0
    if tags is not None and tags.get('building') in NOT_HOUSE:
        return False
    r = poly.minimum_rotated_rectangle
    xs, ys = r.exterior.coords.xy
    s1, s2 = np.hypot(xs[1] - xs[0], ys[1] - ys[0]), np.hypot(xs[2] - xs[1], ys[2] - ys[1])
    return max(s1, s2) / max(min(s1, s2), 0.1) <= 2.6


def facing(poly, streets):
    """the walls of a house that face a street: [(a, b, outward normal, distance)] – the ring counter-clockwise, its outward normal on the
    right of each edge; a wall faces the street when the nearest street point is within FRONT_DEPTH and in front of it"""
    ring = np.asarray(orient(poly, 1.0).exterior.coords)
    out = []
    a, b = ring[:-1], ring[1:]
    d = b - a
    L = np.hypot(d[:, 0], d[:, 1])
    ok = L >= 2.5
    if not ok.any():
        return out
    a, b, d, L = a[ok], b[ok], d[ok], L[ok]
    m = (a + b) / 2
    n = np.c_[d[:, 1], -d[:, 0]] / L[:, None]
    sl = shapely.shortest_line(shapely.points(m), streets)
    p = np.array([np.asarray(s.coords)[1] for s in sl])
    v = p - m
    dist = np.hypot(v[:, 0], v[:, 1])
    cos = (n * v).sum(1) / np.maximum(dist, 1e-6)
    for k in np.flatnonzero((dist <= FRONT_DEPTH) & (cos >= 0.6)):
        out.append((a[k], b[k], n[k], dist[k]))
    return out


def apply(q, g, cls, ctx):
    X, Y = ctx['X'], ctx['Y']
    zx0, zy0, zx1, zy1 = SITE_ZONE
    outside = ~((X >= zx0) & (X < zx1) & (Y >= zy0) & (Y < zy1))  # the modelled site keeps the garden map
    carr, bldx, water = ctx['carr'], ctx['bldx'], ctx['water']
    hard = carr | bldx | water
    bx = box(g.x0, g.y0, g.x1, g.y1)
    big = bx.buffer(40.0, join_style=2)
    stats = {}
    fine = g.res <= 0.5  # beds only in the villages and towns (0.5 m)
    # ---------- houses and the streets they face ----------
    houses = q.houses_in(big) if fine and hasattr(q, 'houses_in') else []
    sl = [LineString(r['p']) for r in q.roads_in(big) if r['kind'] in STREETS and not r['bridge']] if houses else []
    streets = unary_union([s for s in sl if s.intersects(big)]) if sl else None
    if houses and streets is not None and not streets.is_empty:
        beds, plots = [], []
        for poly in houses:
            c = poly.centroid
            key = (round(c.x), round(c.y))
            if h01('vorgarten', *key) < FRONT_SHARE:
                w = FRONT_W[0] + (FRONT_W[1] - FRONT_W[0]) * h01('vorgarten_w', *key)
                for a, b, n, dist in facing(poly, streets):
                    t = (b - a) / np.hypot(*(b - a))
                    a2, b2 = a + 0.3 * t, b - 0.3 * t  # (not round the corner)
                    beds.append(Polygon([a2, b2, b2 + w * n, a2 + w * n]))
            if h01('gemuese', *key) < VEG_SHARE:
                sp = shapely.shortest_line(c, streets)
                p = np.asarray(sp.coords)[1]
                dv = np.array([c.x, c.y]) - p
                dl = np.hypot(*dv)
                if 1.0 < dl <= 40.0:
                    dv /= dl
                    tv = np.array([-dv[1], dv[0]])
                    A = VEG_AREA[0] + (VEG_AREA[1] - VEG_AREA[0]) * h01('gemuese_a', *key)
                    asp = 1.3 + 1.2 * h01('gemuese_r', *key)
                    sa, sb = np.sqrt(A * asp), np.sqrt(A / asp)  # along the back wall, away from it
                    ring = np.asarray(poly.exterior.coords) - [c.x, c.y]
                    e = float((ring @ dv).max())
                    off = (h01('gemuese_o', *key) - 0.5) * 6.0
                    for gap in (3.0, 6.0, 10.0):
                        m = np.array([c.x, c.y]) + dv * (e + gap + sb / 2) + tv * off
                        rect = Polygon([m + s1 * sa / 2 * tv + s2 * sb / 2 * dv for s1, s2 in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
                        if not rect.intersects(bx):
                            break
                        rm = raster.draw_polys(g, [rect]).astype(bool)
                        if rm.sum() < 4:
                            break
                        ring_m = raster.draw_polys(g, [rect.buffer(1.0, join_style=2)]).astype(bool)
                        if (cls[rm] == K['zierrasen']).mean() >= 0.9 and not hard[ring_m].any():
                            plots.append(rect)
                            break
        if beds:
            bm = raster.draw_polys(g, beds).astype(bool) & np.isin(cls, [K['zierrasen'], K['oeffentlich']]) & ~hard & outside
            cls[bm] = K['beet']
            stats['vorgarten'] = int(bm.sum())
        if plots:
            pm = raster.draw_polys(g, plots).astype(bool) & (cls == K['zierrasen']) & outside
            cls[pm] = K['gemuese']
            stats['gemuese'] = int(pm.sum())
    # ---------- OSM: flower beds, public gardens, allotments ----------
    fb, pg, al, pk, isl = [], [], [], [], []
    for geom, kind, tags, oid in q.areas_in(bx) if hasattr(q, 'areas_in') else []:
        if tags.get('landuse') == 'flowerbed':
            fb.append(geom)
        elif tags.get('leisure') == 'garden' and tags.get('access') not in ('private', 'no') and tags.get('garden:type') != 'residential':
            pg.append(geom)
        elif tags.get('landuse') == 'allotments':
            al.append(geom)
        elif tags.get('amenity') == 'parking':
            pk.append(geom)
        elif tags.get('area:highway') == 'traffic_island' or tags.get('traffic_calming') == 'island':
            isl.append(geom)
    if fb:
        cls[raster.draw_polys(g, fb).astype(bool) & ~hard & outside] = K['beet']
    if pg:
        cls[raster.draw_polys(g, pg).astype(bool) & np.isin(cls, [K['zierrasen'], K['oeffentlich'], K['maehwiese']]) & ~hard & outside] = K['beet']
    if al and fine:
        n = 0
        for poly in al:  # beds in rows along the allotment area's long side (its own frame, the same in every cell it touches)
            am = raster.draw_polys(g, [poly]).astype(bool) & (cls == K['zierrasen']) & outside
            if not am.any():
                continue
            r = np.asarray(poly.minimum_rotated_rectangle.exterior.coords)
            e = r[1] - r[0] if np.hypot(*(r[1] - r[0])) >= np.hypot(*(r[2] - r[1])) else r[2] - r[1]
            th = np.arctan2(e[1], e[0])
            c = poly.centroid
            key = (round(c.x), round(c.y))
            dx, dy = X[am] - c.x, Y[am] - c.y
            u = np.floor((dx * np.cos(th) + dy * np.sin(th)) / ALLOT_BED[0]).astype(int)
            v = np.floor((-dx * np.sin(th) + dy * np.cos(th)) / ALLOT_BED[1]).astype(int)
            keys, inv = np.unique(np.c_[u, v], axis=0, return_inverse=True)
            dug = np.array([h01('kleingarten', *key, a, b) < ALLOT_SHARE for a, b in keys])[inv.ravel()]
            sub = cls[am]
            sub[dug] = K['gemuese']
            cls[am] = sub
            n += int(dug.sum())
        stats['kleingarten'] = n
    # ---------- traffic green: roundabouts, islands, medians, car parks ----------
    soft = np.isin(cls, [K[c] for c in SOFT]) & ~hard & outside
    tg = np.zeros(cls.shape, bool)
    rb = [ln for ln in getattr(q, 'roundabouts', []) if ln.intersects(big)]
    if rb:
        inner = [p for p in polygonize(unary_union(rb)) if p.area < 20000]
        if inner:
            tg |= raster.draw_polys(g, inner).astype(bool)
    isl += [x if x.geom_type == 'Polygon' else x.buffer(1.0) for x in getattr(q, 'islands', []) if x.intersects(big)]
    if isl:
        tg |= raster.draw_polys(g, isl).astype(bool)
    if pk:
        tg |= raster.draw_polys(g, pk).astype(bool) & ~ctx['bare']
    ow = [r for r in getattr(q, 'oneways', []) if LineString(r['p']).intersects(big)]
    if ow:
        om = np.zeros(cls.shape, np.uint8)
        for r in ow:
            raster.draw_lines(g, [LineString(r['p'])], max(r['w'], 0.6), 1, om)
        from scipy import ndimage as ndi
        P = max(1, int(round(MEDIAN_GAP / 2 / g.res)))
        tg |= ndi.binary_closing(om > 0, iterations=P) & ~(om > 0)
    tm = tg & soft
    cls[tm] = K['verkehrsgruen']
    stats['verkehrsgruen'] = int(tm.sum())
    # ---------- the cemeteries' paths (OSM footways, paths, service ways, tracks inside them): nothing ----------
    cem = cls == K['friedhof']
    if cem.any():
        cp = [r for r in getattr(q, 'highways', []) if r['kind'] >= 5 and LineString(r['p']).intersects(bx)]
        if cp:
            m = np.zeros(cls.shape, np.uint8)
            for r in cp:
                raster.draw_lines(g, [LineString(r['p'])], max(r['w'], 1.0), 1, m)
            cls[(m > 0) & cem] = K['nichts']
    return stats
