"""Buildings from OpenStreetMap footprints, extruded on the carved terrain (LoD2 from the state is the goal; the Thuringian download
host was down on 22.10.2026). Height from height / building:levels / roof tags, else a default per building type; pitched roofs
(gable along the long side of the smallest enclosing rectangle) for houses and small buildings, flat roofs for large ones.
Output: GLB per level-9 tile (x east, y up = H - H0, z = -(N - Nc)), vertex colours, flat normals."""
import collections, math, os, sys, zlib
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from wlib import log, H0, CONTENT_LEVEL, tcentre, ROOT_E0, ROOT_N0, tsize
from glb import write_glb

HOUSE = {'house', 'residential', 'detached', 'semidetached_house', 'terrace', 'apartments', 'yes', 'farm', 'bungalow', 'dormitory',
         'school', 'kindergarten', 'church', 'chapel', 'public', 'civic', 'hotel', 'office', 'cabin'}
SMALL = {'garage', 'garages', 'shed', 'carport', 'hut', 'roof', 'kiosk', 'toilets', 'service', 'transformer_tower', 'allotment_house'}
BIG = {'barn', 'farm_auxiliary', 'agricultural', 'industrial', 'warehouse', 'commercial', 'retail', 'stable', 'cowshed', 'hangar',
       'greenhouse', 'manufacture', 'sports_hall', 'supermarket', 'storage_tank', 'silo'}
WALLS = [(0.86, 0.83, 0.76), (0.90, 0.88, 0.84), (0.80, 0.76, 0.68), (0.84, 0.80, 0.70), (0.76, 0.75, 0.73), (0.88, 0.82, 0.70)]
ROOFS = [(0.52, 0.24, 0.18), (0.46, 0.22, 0.17), (0.28, 0.28, 0.30), (0.58, 0.30, 0.20), (0.36, 0.30, 0.28)]


def _num(v):
    try:
        return float(str(v).replace(',', '.').replace('m', '').strip())
    except (ValueError, TypeError):
        return None


def rings_of(osm, nodeE):
    """footprints: [(polygon coords (k,2) UTM, holes, tags, id)] from building ways and multipolygon relations"""
    out = []
    for wid, (refs, tags) in osm['ways'].items():
        if 'building' not in tags or tags.get('building') == 'no' or len(refs) < 4 or refs[0] != refs[-1]:
            continue
        P = [nodeE[r] for r in refs if r in nodeE]
        if len(P) >= 4:
            out.append((np.array(P[:-1]), [], tags, 'w' + wid))
    for rid, (mem, tags) in osm['rels'].items():
        if 'building' not in tags or tags.get('type') != 'multipolygon':
            continue
        outers, inners = [], []
        for typ, ref, role in mem:
            if typ != 'way' or ref not in osm['ways']:
                continue
            (outers if role != 'inner' else inners).append([r for r in osm['ways'][ref][0] if r in nodeE])
        for ring in _join(outers):
            P = np.array([nodeE[r] for r in ring[:-1]])
            if len(P) >= 3:
                holes = [np.array([nodeE[r] for r in h[:-1]]) for h in _join(inners)]
                out.append((P, holes, tags, 'r' + rid))
    return out


def _join(ways):
    ways = [list(w) for w in ways if len(w) >= 2]
    rings = []
    while ways:
        cur = ways.pop(0)
        changed = True
        while cur[0] != cur[-1] and changed:
            changed = False
            for i, w in enumerate(ways):
                if w[0] == cur[-1]:
                    cur += w[1:]
                elif w[-1] == cur[-1]:
                    cur += w[::-1][1:]
                elif w[-1] == cur[0]:
                    cur = w + cur[1:]
                elif w[0] == cur[0]:
                    cur = w[::-1] + cur[1:]
                else:
                    continue
                ways.pop(i)
                changed = True
                break
        if cur[0] == cur[-1] and len(cur) >= 4:
            rings.append(cur)
    return rings


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


def zroof(planes, t, d):
    return np.min([gt * t + gd * d + c for (gt, gd, c) in planes], axis=0)


def build(osm, nodeE, dem, area, out_dir):
    from shapely.geometry import Polygon
    from shapely.geometry.polygon import orient
    import mapbox_earcut as earcut
    feats = rings_of(osm, nodeE)
    groups = collections.defaultdict(lambda: dict(pos=[], col=[], idx=[], n=0))
    s9 = tsize(CONTENT_LEVEL)
    stats = collections.Counter()
    for P, holes, tags, fid in feats:
        try:
            poly = Polygon(P, [h for h in holes if len(h) >= 3])
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.geom_type == 'MultiPolygon':
                poly = max(poly.geoms, key=lambda g: g.area)
            if poly.geom_type != 'Polygon' or poly.area < 6:
                continue
        except Exception:
            continue
        c = poly.centroid
        if not (area[0] <= c.x < area[2] and area[1] <= c.y < area[3]):
            continue
        poly = orient(poly.simplify(0.2), 1.0)
        typ = tags.get('building', 'yes')
        A = poly.area
        lv = _num(tags.get('building:levels'))
        ht = _num(tags.get('height'))
        shape = tags.get('roof:shape', '')
        # local frame of the smallest enclosing rectangle: t along the long side (ridge), d across
        mrr = np.array(poly.minimum_rotated_rectangle.exterior.coords)[:4]
        e1, e2 = mrr[1] - mrr[0], mrr[2] - mrr[1]
        if np.hypot(*e1) >= np.hypot(*e2):
            ux = e1 / max(np.hypot(*e1), 1e-9)
            L, W = np.hypot(*e1), np.hypot(*e2)
        else:
            ux = e2 / max(np.hypot(*e2), 1e-9)
            L, W = np.hypot(*e2), np.hypot(*e1)
        ctr = mrr.mean(axis=0)
        uy = np.array([-ux[1], ux[0]])
        small = typ in SMALL or A < 30
        big = typ in BIG or (typ == 'yes' and A > 400)
        if small:
            eave, pitch = 2.6, 18.0
        elif big:
            eave, pitch = 5.5, 15.0
        else:
            eave, pitch = 2.9 * (lv if lv else (3 if typ == 'apartments' else 2)) - 0.2, 42.0
        if typ in ('church', 'chapel'):
            eave, pitch = 9.0, 50.0
        if lv and not small:
            eave = 2.9 * lv - 0.2
        flat = shape == 'flat' or (A > 1500) or (big and A > 900) or len(holes) > 0
        if shape in ('gabled', 'hipped', 'pitched', 'half-hipped', 'gambrel', 'mansard'):
            flat = False
        rise = 0.0 if flat else min(W / 2 * math.tan(math.radians(pitch)), 9.0)
        if ht:
            if ht > rise + 2.0:
                eave = ht - rise
            else:
                rise, flat = 0.0, True
                eave = ht
        loc = lambda Q: np.stack([(Q[:, 0] - ctr[0]) * ux[0] + (Q[:, 1] - ctr[1]) * ux[1],
                                  (Q[:, 0] - ctr[0]) * uy[0] + (Q[:, 1] - ctr[1]) * uy[1]], 1)
        back = lambda t, d: (ctr[0] + t * ux[0] + d * uy[0], ctr[1] + t * ux[1] + d * uy[1])
        ext = np.array(poly.exterior.coords)[:-1]
        zg = dem.sample(ext[:, 0], ext[:, 1])
        zb = float(np.nanmin(zg))
        planes = [(0.0, 0.0, eave)] if flat else [(0.0, -rise / (W / 2), eave + rise), (0.0, rise / (W / 2), eave + rise)]
        key = (int(math.floor((c.x - ROOT_E0) / s9)), int(math.floor((c.y - ROOT_N0) / s9)))
        g = groups[key]
        hsh = (zlib.crc32(fid.encode()) & 0xffff) / 65535.0   # deterministic (str hash is salted per process)
        wc = WALLS[int(hsh * len(WALLS)) % len(WALLS)]
        rc = (0.50, 0.50, 0.50) if (big or flat) else ROOFS[int(hsh * 97) % len(ROOFS)]
        # walls: every ring, split where the roof changes plane (the gable ends)
        rings = [np.array(poly.exterior.coords)[:-1]] + [np.array(h.coords)[:-1] for h in poly.interiors]
        for ring in rings:
            Q = loc(ring)
            for i in range(len(Q)):
                p0, p1 = Q[i], Q[(i + 1) % len(Q)]
                lam = [0.0, 1.0]
                if len(planes) == 2:
                    f0, f1 = p0[1], p1[1]          # the ridge is d = 0
                    if (f0 < 0 < f1) or (f1 < 0 < f0):
                        lam.append(f0 / (f0 - f1))
                lam = sorted(lam)
                pts = np.array([p0 + (p1 - p0) * l_ for l_ in lam])
                zt = zroof(planes, pts[:, 0], pts[:, 1])
                for q in range(len(pts) - 1):
                    xa, ya = back(*pts[q])
                    xb, yb = back(*pts[q + 1])
                    quad = [(xa, ya, zb - 0.5), (xb, yb, zb - 0.5), (xb, yb, zb + zt[q + 1]), (xa, ya, zb + zt[q])]
                    g['pos'].append(np.array(quad))
                    g['col'].append(np.tile(wc, (4, 1)))
                    # outer ring counter-clockwise from above -> wall faces outwards with (0, 1, 2), (0, 2, 3) seen from outside
                    g['idx'].append(np.array([0, 1, 2, 0, 2, 3]) + g['n'])
                    g['n'] += 4
        # roof faces: the outline plus 0.3 m eaves, cut where the planes meet, triangulated
        rp = orient(Polygon(loc(np.array(poly.exterior.coords)[:-1]), [loc(np.array(h.coords)[:-1]) for h in poly.interiors]).buffer(
            0.3 if not flat else 0.0, join_style=2, mitre_limit=2.5), 1.0)
        for i, (gt, gd, cc) in enumerate(planes):
            cell = [(-900, -900), (900, -900), (900, 900), (-900, 900)]
            for j, (gt2, gd2, c2) in enumerate(planes):
                if j != i:
                    cell = clip_half(cell, gt - gt2, gd - gd2, cc - c2)
            if len(cell) < 3:
                continue
            face = rp.intersection(Polygon(cell))
            for pg in (face.geoms if hasattr(face, 'geoms') else [face]):
                if pg.geom_type != 'Polygon' or pg.area < 0.05:
                    continue
                pg = orient(pg, 1.0)
                rr = [np.array(pg.exterior.coords)[:-1]] + [np.array(h.coords)[:-1] for h in pg.interiors]
                vv = np.vstack(rr)
                ends = np.cumsum([len(x) for x in rr]).astype(np.uint32)
                tri = earcut.triangulate_float64(vv.astype(np.float64), ends).reshape(-1, 3)
                if not len(tri):
                    continue
                X, Y = back(vv[:, 0], vv[:, 1])
                Z = zb + gt * vv[:, 0] + gd * vv[:, 1] + cc + (0.0 if not flat else 0.0)
                g['pos'].append(np.stack([X, Y, Z], 1))
                g['col'].append(np.tile(rc, (len(vv), 1)))
                # earcut on a counter-clockwise outline gives triangles of either winding: make them face up
                t3 = tri.copy()
                p3 = np.stack([vv[:, 0], vv[:, 1]], 1)
                cr = ((p3[t3[:, 1], 0] - p3[t3[:, 0], 0]) * (p3[t3[:, 2], 1] - p3[t3[:, 0], 1])
                      - (p3[t3[:, 1], 1] - p3[t3[:, 0], 1]) * (p3[t3[:, 2], 0] - p3[t3[:, 0], 0]))
                t3[cr < 0] = t3[cr < 0][:, ::-1]
                g['idx'].append(t3.ravel() + g['n'])
                g['n'] += len(vv)
        stats['flach' if flat else 'Satteldach'] += 1
    os.makedirs(os.path.join(out_dir, 'b'), exist_ok=True)
    files = {}
    for (tx, ty), g in groups.items():
        if not g['pos']:
            continue
        Ec, Nc = tcentre(CONTENT_LEVEL, tx, ty)
        P = np.concatenate(g['pos'])
        idx = np.concatenate(g['idx']).astype(np.uint32)
        col = np.concatenate(g['col'])
        # (E, N, H) counter-clockwise seen from outside -> (x, y, z) = (E, H, -N) keeps the orientation (a rotation): glTF front faces
        pos = np.stack([P[:, 0] - Ec, P[:, 2] - H0, -(P[:, 1] - Nc)], 1).astype(np.float32)
        # flat normals: every face has its own vertices already (walls: quads, roofs: per face) -> per-face normal, averaged per vertex
        from glb import flat_normals
        nrm = flat_normals(pos, idx)
        fn = os.path.join(out_dir, 'b', f'{CONTENT_LEVEL}_{tx}_{ty}.glb')
        files[f'{tx}_{ty}'] = write_glb(fn, [dict(name='buildings', pos=pos, idx=idx, nrm=nrm, col=col, rough=0.85)],
                                        extras={'utm_centre': [Ec, Nc], 'H0': H0, 'crs': 'EPSG:25832'})
    log(f'Gebäude: {sum(stats.values())} ({dict(stats)}), {len(files)} Kacheln, {sum(files.values()) / 1e6:.1f} MB')
    return {'count': sum(stats.values()), 'roofs': dict(stats), 'tiles': files}
