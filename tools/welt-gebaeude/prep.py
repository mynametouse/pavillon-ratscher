#!/usr/bin/env python3
"""feat/welt-gebaeude: the buildings the app still lacks, from ETHOS.BUILDA (footprint + height of every building in Germany, Thuringia from
the state's LoD2; Forschungszentrum Jülich, Zenodo 11845992, ODbL 1.0) -> compact JSON for viz3/src/gebaeude/gebaeude.js.

  # 1. stream the Thuringian file once and keep our area (UTM 25832; ~1.5 min, ~40 MB):
  curl -sSL https://zenodo.org/api/records/11845992/files/DEG.csv/content | python3 -I tools/welt-gebaeude/filter_ethos.py ETHOS.jsonl
  # 2. the 2024 orthophoto of Ratscher's square for the roof colours (tools/welt-gebaeude/dop.py, 0.5 m/px, analysis copy):
  python3 -I tools/welt-gebaeude/dop.py DOP.jpg 624320 5594170 626980 5596830 0.5
  # 3. this script:
  python3 -I tools/welt-gebaeude/prep.py --ethos ETHOS.jsonl --dop DOP.jpg [--debug DIR]

Ratscher's 2.4 km square (world/ratscher.js): every ETHOS building whose centre lies in it and that the 337 OSM buildings there do not cover
(more than half of it under an OSM footprint: the same building; a part sticking out of one is kept as its own building when it is more than
a sliver), outside the hand-modelled site (the garden, Hubert's and Ronald's yards: garden/*) -> dist/gebaeude/ratscher.json.

Per building (the layout of viz3/extra/schleusingen/dist/schleusingen/stadt.json, so the app builds it like Schleusingen's houses with the
village's facade and roof shaders): footprint f (CCW, model metres), kind k (0 house, 1 barn or hall, 2 shed or garage, 4 round tank), eave e,
height h (ETHOS: ground to the highest point), facades F [ax, ay, bx, by, top at a, apex u, apex top, top at b, flags (1 = party wall), metres
to the nearest street], roof faces rv (x, y, z above the foot) / rt (triangles), roof kind rk and colour rc (sRGB, the 2024 orthophoto),
flat fl; and the estimate that LoD2 replaces later: roof form r (0 flat, 1 mono-pitch, 2 gable, 3 hip), ridge azimuth az (degrees from
north), pitch p; the ETHOS id (= the LoD2 building id, e.g. DETHL51P000004BA) as id.
"""
import argparse, base64, glob, json, math, os, sys, zlib
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'welt'))
import wglib as W
from zone_schleusingen import roof_faces, walls_of, hsl, r2   # the roof planes -> faces and facades of the Schleusingen zone (same layout)

# the hand-modelled site: Falko's garden, Hubert's yard with the long buildings at its west edge (to x -56), Ronald's (garden/*)
SITE = (-58.0, -52.0, 42.0, 48.0)
BOX = tuple(W.GEOMAN['roads']['box'])   # Ratscher's square [x0, y0, x1, y1]


def hh(s):
    return (zlib.crc32(s.encode()) & 0xffff) / 65535.0


def roads_ratscher():
    """the OSM ways of world/roads.js (streets only: kinds 0..5) as shapely lines with their half width"""
    from shapely.geometry import LineString
    R = W.GEOMAN['roads']
    a = np.frombuffer(base64.b64decode(json.load(open(W.dist_file('geo/' + R['file'])))['b64']), dtype='<i2')
    o, out = 0, []
    while o + 5 <= len(a):
        n, kind, surf, w, fl = (int(v) for v in a[o:o + 5])
        o += 5
        p = a[o:o + n * 2].reshape(-1, 2) / 10.0
        o += n * 2
        if kind <= 5 and n >= 2:
            out.append((LineString(p), w / 20.0))
    return out


class Photo:
    """the orthophoto in UTM (pixel centres), sampled at model points"""

    def __init__(self, path, e0, n0, res):
        from PIL import Image
        Image.MAX_IMAGE_PIXELS = None
        self.a = np.asarray(Image.open(path).convert('RGB'), dtype=np.float32) / 255.0
        self.e0, self.n1, self.res = e0, n0 + self.a.shape[0] * res, res

    def at(self, x, y):
        E, N = W.to_utm(x, y)
        u, v = int((E - self.e0) / self.res), int((self.n1 - N) / self.res)
        if 0 <= v < self.a.shape[0] and 0 <= u < self.a.shape[1]:
            return self.a[v, u]
        return None


def roof_colour(poly, photo, seed):
    """the photo inside the footprint, away from its edge, shadows and glints left out (as world/village.js and the Schleusingen zone)"""
    from shapely.geometry import Point
    if photo is None:
        return None
    rng = np.random.default_rng(seed)
    inner = poly.buffer(-0.6)
    if inner.is_empty:
        inner = poly
    bx0, by0, bx1, by1 = inner.bounds
    cs, tries = [], 0
    while len(cs) < 48 and tries < 600:
        tries += 1
        x, y = rng.uniform(bx0, bx1), rng.uniform(by0, by1)
        if not inner.contains(Point(x, y)):
            continue
        c = photo.at(x, y)
        if c is not None:
            cs.append(c)
    if len(cs) < 4:
        return None
    cs.sort(key=lambda q: float(q.sum()))
    mid = cs[len(cs) // 4: max(len(cs) // 4 + 1, int(len(cs) * 0.85))]
    return np.mean(mid, axis=0)


def ridge_from_photo(poly, ux, ctr, photo):
    """which way the ridge of a gable runs, from the photo: the two slopes of a gable are lit differently by the sun, so the line that
    splits the roof into its brightest and its darkest half is the ridge. Returns the direction (unit vector) or None when the photo
    does not tell (both splits alike – the sun along the ridge, a flat-looking roof, panels)"""
    if photo is None:
        return None
    from shapely.geometry import Point
    inner = poly.buffer(-0.5)
    if inner.is_empty:
        return None
    x0, y0, x1, y1 = inner.bounds
    pts, lum = [], []
    for x in np.arange(x0, x1, 0.5):
        for y in np.arange(y0, y1, 0.5):
            if inner.contains(Point(x, y)):
                c = photo.at(x, y)
                if c is not None:
                    pts.append((x - ctr[0], y - ctr[1]))
                    lum.append(float(c @ np.array([0.3, 0.55, 0.15])))
    if len(pts) < 40:
        return None
    P, L = np.array(pts), np.array(lum)
    best = []
    for ax in (ux, np.array([-ux[1], ux[0]])):
        nrm = np.array([-ax[1], ax[0]])
        d = P @ nrm
        a, b = L[d > 0.4], L[d < -0.4]
        if len(a) < 12 or len(b) < 12:
            return None
        best.append((abs(float(np.median(a) - np.median(b))), ax))
    (d1, a1), (d2, a2) = best
    if d2 > 1.5 * d1 and d2 > 0.035:
        return a2
    return None


def classify(poly, h, sid, photo=None):
    """kind, roof form, pitch, eave and ridge (above the foot) from footprint and height – the estimate LoD2 replaces later"""
    A = poly.area
    per = poly.length
    circ = 4 * math.pi * A / max(per * per, 1e-9)
    nv = len(poly.exterior.coords) - 1
    mrr = np.array(poly.minimum_rotated_rectangle.exterior.coords)[:4]
    e1, e2 = mrr[1] - mrr[0], mrr[2] - mrr[1]
    if np.hypot(*e1) >= np.hypot(*e2):
        ux, Wd, Lr = e1 / max(np.hypot(*e1), 1e-9), float(np.hypot(*e2)), float(np.hypot(*e1))
    else:
        ux, Wd, Lr = e2 / max(np.hypot(*e2), 1e-9), float(np.hypot(*e1)), float(np.hypot(*e2))
    rect = A / max(Wd * Lr, 1e-9)
    ctr = mrr.mean(axis=0)
    k1 = hh(sid + 'k')
    if h is None or not (h > 0.5):
        h = 3.0 if A < 40 else 6.0 if A < 300 else 8.0
    h = min(float(h), 40.0)
    if circ > 0.86 and nv >= 10:
        kind, form, pitch = 4, 0, 0.0   # a round tank (slurry, silage): flat top
    elif h > 12 and h > 2.2 * math.sqrt(A):
        kind, form, pitch = 5, 0, 0.0   # a tower, a silo, a chimney: slender and tall, flat top
    elif A >= 350:
        kind, form, pitch = 1, (2 if Wd < 45 else 0), 14.0   # a hall: low gable, very wide ones flat
    elif A >= 35 and h >= 4.5:
        if h >= 6.5 and A <= 320 and Lr / max(Wd, 0.1) <= 1.9 and Wd >= 6.0:
            kind, form, pitch = 0, (3 if A > 170 and k1 < 0.25 else 2), 45.0   # a house: gable (some bigger ones hipped)
        else:
            kind, form, pitch = 1, 2, 38.0   # a barn
    else:
        kind = 2
        if h < 3.4:
            # garages (rectangular, garage-sized) flat, garden sheds and lean-tos mono-pitch
            form, pitch = (0, 0.0) if (rect > 0.9 and 14 <= A <= 120 and k1 < 0.6) else (1, 9.0)
        else:
            form, pitch = 2, 32.0
    # a squarish house or barn: the photo may tell that the ridge runs across the longer side
    c_ = None
    if kind in (0, 1) and form in (2, 3) and Lr / max(Wd, 0.1) < 1.35:
        r_ = ridge_from_photo(poly, ux, ctr, photo)
        if r_ is not None:
            ux, Wd, Lr, c_ = r_, Lr, Wd, 'photo'
    emin = {0: 3.4, 1: 2.8, 2: 2.1, 4: h, 5: h}[kind]
    if form == 0:
        eave, rise = h, 0.0
    else:
        span = Wd if form == 1 else Wd / 2
        rise = span * math.tan(math.radians(pitch))
        if h - rise < emin:
            rise = max(0.0, h - emin)
        eave = h - rise
        if rise < 0.35:
            form, eave, rise = 0, h, 0.0
        pitch = math.degrees(math.atan2(rise, span)) if form else 0.0
    return dict(kind=kind, form=form, pitch=pitch, eave=eave, h=h, rise=rise, ux=ux, Wd=Wd, Lr=Lr, ctr=ctr, A=A, circ=circ, rect=rect, ridge=c_)


def make(poly, h, sid, ctx):
    """one building in the stadt.json layout (see the module doc)"""
    from shapely.geometry import Point, Polygon
    from shapely.geometry.polygon import orient
    c = classify(poly, h, sid, ctx.get('photo'))
    ux, ctr = c['ux'], c['ctr']
    uy = np.array([-ux[1], ux[0]])
    eave, rise, form, Wd = c['eave'], c['rise'], c['form'], c['Wd']
    k_ = rise / max(Wd / 2, 0.5)
    if form == 0:
        planes = [(0.0, 0.0, eave)]
    elif form == 1:
        sg = 1.0 if hh(sid + 'm') < 0.5 else -1.0   # which side is high: unknown (LoD2 later)
        km = rise / max(Wd, 0.5)
        planes = [(0.0, sg * km, eave + rise / 2)]
    else:
        planes = [(0.0, -k_, eave + rise), (0.0, k_, eave + rise)]
        if form == 3:
            ce = eave + k_ * c['Lr'] / 2
            planes += [(-k_, 0.0, ce), (k_, 0.0, ce)]
    loc = lambda Q: np.stack([(Q[:, 0] - ctr[0]) * ux[0] + (Q[:, 1] - ctr[1]) * ux[1], (Q[:, 0] - ctr[0]) * uy[0] + (Q[:, 1] - ctr[1]) * uy[1]], 1)
    back = lambda t, d: (ctr[0] + t * ux[0] + d * uy[0], ctr[1] + t * ux[1] + d * uy[1])
    ring = np.array(poly.exterior.coords)[:-1]
    ql = loc(ring)
    fac = []
    for (i, uA, tA, ta, tb, L) in walls_of([tuple(p) for p in ql], planes):
        p0, p1 = ring[i], ring[(i + 1) % len(ring)]
        mx, my = (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2
        dx, dy = (p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L
        nx, ny = dy, -dx   # outward for a CCW ring
        # a wall against another building (an OSM one or another part) has no windows
        shared = c['kind'] in (4, 5)
        for f in (0.25, 0.5, 0.75):
            if shared:
                break
            pr = Point(p0[0] + (p1[0] - p0[0]) * f + nx * 0.5, p0[1] + (p1[1] - p0[1]) * f + ny * 0.5)
            for j in ctx['tree'].query(pr.buffer(0.3)):
                if ctx['ids'][j] != sid and ctx['polys'][j].distance(pr) < 0.3:
                    shared = True
                    break
        sd = 99.0
        if not shared and L > 2.0 and ctx.get('roads'):
            for d_ in (2.5, 5.0, 8.0, 12.0, 16.0):
                pr = Point(mx + nx * d_, my + ny * d_)
                if any(ls.distance(pr) < hw + 1.5 for ls, hw in ctx['roads_near'](pr)):
                    sd = d_
                    break
        fac.append([r2(p0[0]), r2(p0[1]), r2(p1[0]), r2(p1[1]), r2(ta), r2(uA), r2(tA), r2(tb), 1 if shared else 0, r2(sd)])
    over = 0.0 if form == 0 else (0.45 if c['kind'] == 0 else 0.3 if c['kind'] == 1 else 0.2)
    lp = Polygon(ql)
    V, T = [], []
    for vv, tri in roof_faces(lp, planes, over):
        base = len(V) // 3
        for p in vv:
            X, Y = back(p[0], p[1])
            V += [r2(X), r2(Y), r2(p[2])]
        T += (np.asarray(tri) + base).ravel().tolist()
    col = roof_colour(poly, ctx.get('photo'), zlib.crc32(sid.encode()))
    if col is None:
        col = np.array([0.55, 0.3, 0.22])
    H, Sat, Lt = hsl(col)
    kind = c['kind']
    if form == 0:
        rk = 2 if (kind == 1 and Lt > 0.45) else 4
    elif kind == 1 and c['A'] >= 350:
        rk = 1 if (Lt > 0.5 and Sat < 0.2) else 2
    elif kind in (1, 2) and Sat < 0.16 and Lt > 0.3:
        rk = 1
    elif Sat < 0.14 and Lt < 0.33:
        rk = 3
    else:
        rk = 0
    if rk == 0 and (Sat < 0.22 or (40 < H < 300)):
        col = np.array([0.4, 0.24, 0.18]) if Lt < 0.3 else np.array([0.66, 0.32, 0.22])
    if rk == 4:
        l_ = float(col.mean())
        col = np.minimum(0.62, l_ * 0.8 + col * 0.2)
    az = (math.degrees(math.atan2(ux[0], ux[1])) + 360) % 180
    b = {'k': kind, 'f': [r2(v) for xy in ring for v in xy], 'e': r2(eave), 'h': r2(c['h']), 'rk': rk, 'rc': [r2(v) for v in col],
         'F': fac, 'rv': V, 'rt': T, 'r': form, 'az': round(az, 1), 'p': round(c['pitch'], 1), 'id': sid}
    if c.get('ridge'):
        b['rq'] = 'foto'   # the ridge's direction read from the photo (else along the longer side)
    if form == 0:
        b['fl'] = 1
    return b


def clean(g):
    """a footprint as one CCW polygon without holes, simplified (0.12 m), or None"""
    from shapely.geometry import Polygon
    from shapely.geometry.polygon import orient
    if g.is_empty:
        return None
    if g.geom_type == 'MultiPolygon':
        g = max(g.geoms, key=lambda q: q.area)
    if g.geom_type != 'Polygon':
        return None
    g = Polygon(g.exterior.coords).simplify(0.12, preserve_topology=True).buffer(0)
    if g.is_empty or g.geom_type != 'Polygon' or g.area < 4.0:
        return None
    return orient(g, 1.0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ethos', required=True)
    ap.add_argument('--dop', default=None)
    ap.add_argument('--dop-box', nargs=3, type=float, default=[624320, 5594170, 0.5], help='E0 N0 res of --dop')
    ap.add_argument('--out', default=os.path.join(W.VIZ, 'extra', 'welt-gebaeude', 'dist', 'gebaeude'))
    ap.add_argument('--debug', default=None)
    ap.add_argument('--tiles', action='store_true', help='the tiled world beyond the square instead (cells of 400 m, lazy in the app)')
    ap.add_argument('--heights', action='store_true', help='compare the heights of the 337 OSM buildings with ETHOS (a list for the lead)')
    a = ap.parse_args()
    if a.tiles:
        return main_tiles(a)
    if a.heights:
        return heights(a)
    from shapely.geometry import Polygon, box as sbox
    from shapely.strtree import STRtree
    from shapely.ops import unary_union
    osm = W.ratscher_osm()
    OP = [Polygon(v['ring']).buffer(0) for v in osm.values()]
    otree = STRtree(OP)
    site = sbox(*SITE)
    cand = []
    for r in W.load_ethos(a.ethos):
        pts = [W.to_model(e, n) for e, n in r['poly'][0][0]]
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        if not (BOX[0] + 2 < cx < BOX[2] - 2 and BOX[1] + 2 < cy < BOX[3] - 2):
            continue
        g = Polygon(pts).buffer(0)
        if g.is_empty or site.contains(g.centroid):
            continue
        cand.append((r, g))
    # what the centre as Falko filmed it places itself (world/dorfkern_data.js): not built a second time – but its printed roof still goes
    # out of the ground image (ratscher.json 'mask', read by retusche.py)
    ko = keepout('ratscher')
    kot = STRtree([g for g, _ in ko]) if ko else None
    masked, c2 = [], []
    for r, g in cand:
        why = kept_out(g, ko, kot) if ko else None
        if why:
            masked.append({'f': [r2(v) for xy in g.exterior.coords[:-1] for v in xy], 'h': r2(float(r['h'] or 3.0)), 'id': r['id'], 'why': why})
        else:
            c2.append((r, g))
    cand = c2
    st = {'ethos': len(cand), 'dup': 0, 'part': 0, 'new': 0, 'sliver': 0, 'keepout': len(masked)}
    keep = []
    for r, g in cand:
        hits = [OP[i] for i in otree.query(g)]
        ov = sum(g.intersection(o).area for o in hits) / max(g.area, 1e-6)
        if ov > 0.5:
            st['dup'] += 1
            continue
        if ov > 0.02:
            rest = g.difference(unary_union(hits).buffer(0.15, join_style=2))
            pieces = [p for p in (rest.geoms if hasattr(rest, 'geoms') else [rest]) if p.geom_type == 'Polygon']
            pieces = [p for p in pieces if p.area > 8 and p.buffer(-1.0).area > 1.5]   # no strips of a mismatched outline
            if not pieces:
                st['sliver'] += 1
                continue
            st['part'] += 1
            for k, p in enumerate(pieces):
                keep.append((r, p, r['id'] + ('' if k == 0 else '_%d' % k)))
        else:
            st['new'] += 1
            keep.append((r, g, r['id']))
    polys, ids = [], []
    for r, g, sid in keep:
        c = clean(g)
        if c is None:
            continue
        polys.append((r, c, sid))
    # every footprint (the OSM ones and the new ones) for the party walls
    allp = OP + [p for _, p, _ in polys]
    allid = ['osm%d' % i for i in range(len(OP))] + [sid for _, _, sid in polys]
    tree = STRtree(allp)
    roads = roads_ratscher()
    rtree = STRtree([ls for ls, _ in roads])
    photo = Photo(a.dop, a.dop_box[0], a.dop_box[1], a.dop_box[2]) if a.dop else None
    ctx = {'tree': tree, 'polys': allp, 'ids': allid, 'photo': photo, 'roads': roads,
           'roads_near': lambda pr: [roads[i] for i in rtree.query(pr.buffer(20))]}
    out = []
    for r, p, sid in polys:
        b = make(p, r['h'], sid, ctx)
        out.append(b)
    out.sort(key=lambda b: (b['f'][1], b['f'][0]))
    # the canopy model's 'trees' that are the roofs of these buildings (the trees were found where OSM had no footprint): a tree top well
    # inside a footprint and not much higher than the building – the app hides them (a real tree's trunk never stands in a building)
    trees = []
    tr = np.frombuffer(base64.b64decode(json.load(open(W.dist_file('geo/' + W.GEOMAN['trees']['file'])))['b64']), dtype='<i2').reshape(-1, 5)
    bp = [Polygon(np.array(b['f']).reshape(-1, 2)) for b in out]
    btree = STRtree(bp)
    from shapely.geometry import Point
    for x, y, h, rr, cc in tr:
        pt = Point(x / 10, y / 10)
        for j in btree.query(pt):
            inner = bp[j].buffer(-0.5)
            if (not inner.is_empty) and inner.contains(pt) and h / 100 < out[j]['h'] + 2.5:
                trees.append([round(x / 10, 1), round(y / 10, 1)])
                break
    st['trees_hidden'] = len(trees)
    kinds = {}
    for b in out:
        kinds[b['k']] = kinds.get(b['k'], 0) + 1
    st['built'] = len(out)
    st['kinds'] = kinds
    os.makedirs(a.out, exist_ok=True)
    doc = {'v': 1, 'src': 'ETHOS.BUILDA (Forschungszentrum Jülich, Zenodo 11845992, ODbL 1.0) from LoD2 Thüringen (© GDI-Th, dl-de/by-2-0); '
                          'roof colours DOP 2024 © GDI-Th', 'area': 'ratscher', 'box': BOX, 'site': SITE, 'stats': st, 'trees': trees, 'b': out,
           'mask': masked}
    fn = os.path.join(a.out, 'ratscher.json')
    json.dump(doc, open(fn, 'w'), separators=(',', ':'), ensure_ascii=False)
    print(json.dumps(st), os.path.getsize(fn), 'bytes', flush=True)
    if a.debug:
        debug_map(out, osm, a.debug, photo)


def heights(a):
    """the OSM buildings of world/ratscher.js (highest wall top = gable apex, from the surface model) against ETHOS (ground to the highest
    point, from LoD2): every ETHOS footprint mostly inside an OSM one counts; differences above 2.5 m listed"""
    from shapely.geometry import Polygon
    from shapely.strtree import STRtree
    osm = W.ratscher_osm()
    ids = list(osm)
    P = [Polygon(osm[k]['ring']).buffer(0) for k in ids]
    E = []
    for r in W.load_ethos(a.ethos):
        g = Polygon([W.to_model(e, n) for e, n in r['poly'][0][0]]).buffer(0)
        if not g.is_empty:
            E.append((r['h'] or 0.0, g))
    et = STRtree([g for _, g in E])
    rows = []
    for k, p in zip(ids, P):
        hs = [E[i][0] for i in et.query(p) if E[i][1].intersection(p).area > 0.5 * min(E[i][1].area, p.area)]
        if hs:
            top = osm[k]['top']
            rows.append((k, round(p.centroid.x), round(p.centroid.y), round(p.area), round(top, 1), round(max(hs), 1), round(top - max(hs), 1)))
    d = np.array([r[6] for r in rows])
    print('matched', len(rows), 'median', np.median(d), 'mean abs', round(float(np.abs(d).mean()), 2))
    for r in sorted(rows, key=lambda r: -abs(r[6])):
        if abs(r[6]) > 2.5:
            print('| %d | %d, %d | %d | %.1f | %.1f | %+.1f |' % r)


CELL = 400.0
MARKT = (-1084.7, 1241.9)


def zone_footprints():
    """the OSM buildings the zones beyond the square build themselves: Schleusingen's old town, Kloster Veßra (model metres)"""
    from shapely.geometry import Polygon
    out = []
    for rel in ('schleusingen/stadt.json', 'vessra/ort.json'):
        try:
            d = json.load(open(W.dist_file(rel)))
        except Exception as e:
            print('zone data missing', rel, e)
            continue
        for b in d['b']:
            f = b['f']
            g = Polygon(list(zip(f[0::2], f[1::2]))).buffer(0)
            if not g.is_empty:
                out.append(g)
    return out


def keepout(where):
    """what the hand-modelled places build themselves besides their OSM houses: no ETHOS building may touch it (model metres; a list of
    (shapely geometry, name)). 'zonen': Kloster Veßra (welt/vessra.js, vessra/ort.json) – the church ruin with its towers and portal
    (8 m round), the monastery precinct, i.e. the museum's area (15 m round), the tree nursery Baumschule Kammbach (8 m), its other areas
    (ponds, cemetery, gardens, parking: 2 m), walls (1.5 m), gates (3 m), fences and hedges (0.5 m); Schleusingen (welt/schleusingen.js,
    schleusingen/stadt.json) – the Bertholdsburg with its terraces and round towers (20 m), the Rathaus, St. Johannis and the Heckenturm
    (8 m), the Markt (3 m), fountains (4 m), benches (1.5 m), lamps (0.6 m). 'ratscher': the centre as Falko filmed it
    (world/dorfkern_data.js, its open space: the well, the bus shelter, the white box, benches, bins, limes, poles, lamps …)"""
    from shapely.geometry import Polygon, LineString, Point
    P = lambda f, m: Polygon(list(zip(f[0::2], f[1::2]))).buffer(0).buffer(m)
    L = lambda f, m: LineString(list(zip(f[0::2], f[1::2]))).buffer(m)
    out = []
    if where == 'zonen':
        try:
            v = json.load(open(W.dist_file('vessra/ort.json')))
            K = v.get('kirche') or {}
            if K.get('area'):
                out.append((P(K['area'], 8.0), 'Veßra: Klosterkirche (Ruine)'))
            for t in K.get('towers') or []:
                out.append((P(t, 8.0), 'Veßra: Türme der Klosterkirche'))
            if K.get('portal'):
                out.append((Point(*K['portal']).buffer(8.0), 'Veßra: Westportal'))
            for a_ in v.get('areas', []):
                m = {'museum': 15.0, 'nursery': 8.0}.get(a_['k'], 2.0)
                if len(a_['p']) >= 6:
                    out.append((P(a_['p'], m), 'Veßra: %s %s' % (a_['k'], a_.get('n') or '')))
            for w in v.get('walls', []):
                out.append((L(w['p'], 1.5), 'Veßra: Klostermauer'))
            for g in v.get('gates', []):
                out.append((Point(g[0], g[1]).buffer(3.0), 'Veßra: Tor'))
            for w in v.get('fences', []) + v.get('hedges', []):
                if len(w['p']) >= 4:
                    out.append((L(w['p'], 0.5), 'Veßra: Zaun/Hecke'))
        except Exception as e:
            print('no keep-out of Veßra', e, flush=True)
        try:
            s = json.load(open(W.dist_file('schleusingen/stadt.json')))
            for b in s['b']:
                m = {'burg': 20.0, 'rathaus': 8.0, 'kirche': 8.0, 'turm': 6.0}.get(b.get('lm'))
                if m:
                    out.append((P(b['f'], m), 'Schleusingen: ' + b['lm']))
            if len(s.get('marktplatz') or []) >= 6:
                out.append((P(s['marktplatz'], 3.0), 'Schleusingen: Markt'))
            for q in s.get('fountains', []):
                out.append((Point(q[0], q[1]).buffer(4.0), 'Schleusingen: Brunnen'))
            for q in s.get('benches', []):
                out.append((Point(q[0], q[1]).buffer(1.5), 'Schleusingen: Bank'))
            for q in s.get('lamps', []):
                out.append((Point(q[0], q[1]).buffer(0.6), 'Schleusingen: Laterne'))
        except Exception as e:
            print('no keep-out of Schleusingen', e, flush=True)
    elif where == 'ratscher':
        import subprocess
        try:
            js = os.path.join(W.VIZ, 'src', 'world', 'dorfkern_data.js')
            o = json.loads(subprocess.run(['node', '--no-warnings', '--input-type=module', '-e',
                                           "globalThis.window = {}; const m = await import(%s); console.log(JSON.stringify(m.DKDATA.open))"
                                           % json.dumps('file://' + js)], capture_output=True, text=True, check=True).stdout)
            pt = lambda q, m, n: out.append((Point(q[0], q[1]).buffer(m), 'Dorfkern: ' + n))
            if o.get('well'):
                pt(o['well']['c'], max(o['well'].get('size') or [4.0]) / 2 + 0.5, 'Brunnen')
            if o.get('shelter'):
                pt(o['shelter']['c'], 2.5, 'Wartehäuschen')
            wb = o.get('whitebox')
            if wb:
                x, y, az, l_, d_ = wb[:5]
                ux, uy = math.sin(math.radians(az)), math.cos(math.radians(az))
                out.append((Polygon([(x + ux * s_ * l_ / 2 - uy * t_ * d_ / 2, y + uy * s_ * l_ / 2 + ux * t_ * d_ / 2)
                                     for s_, t_ in ((-1, -1), (1, -1), (1, 1), (-1, 1))]).buffer(0.5), 'Dorfkern: weißer Kasten'))
            for k_, m in (('benches', 1.2), ('bins', 0.6), ('poles', 0.6), ('lamps', 0.6), ('roundabout', 1.5), ('logs', 2.5)):
                for q in o.get(k_) or []:
                    pt(q, m, k_)
            for q in o.get('limes') or []:
                pt(q['at'], 1.0, 'Linde')
            for k_ in ('linde', 'vending', 'signpost', 'planter'):
                if o.get(k_):
                    pt(o[k_], 1.2, k_)
            for k_ in ('hedges', 'fences'):
                for q in o.get(k_) or []:
                    out.append((LineString(q['p']).buffer(0.6), 'Dorfkern: ' + k_))
            for q in o.get('paving') or []:
                out.append((Polygon(q['p']).buffer(0.3), 'Dorfkern: Pflaster'))
        except Exception as e:
            print('no keep-out of the Dorfkern', e, flush=True)
    return out


def kept_out(g, ko, tree):
    """the name of the first keep-out area footprint g touches, or None"""
    for i in tree.query(g):
        if g.intersects(ko[i][0]):
            return ko[i][1]
    return None


def roads_fahrt():
    """the roads one drives beyond the square (welt/fahrt.js strassen.json, model decimetres) and Schleusingen's streets: shapely lines"""
    from shapely.geometry import LineString
    out = []
    d = json.load(open(W.dist_file('fahrt/strassen.json')))
    for w in d['ways']:
        pts = w[6]
        xy = [(pts[i] / 10.0, pts[i + 1] / 10.0) for i in range(0, len(pts) - 2, 3)]
        if len(xy) >= 2:
            out.append((LineString(xy), 3.0, w[0]))
    try:
        st = json.load(open(W.dist_file('schleusingen/stadt.json')))['st']
        for s_ in st:
            p = s_['p']
            xy = list(zip(p[0::2], p[1::2]))
            if len(xy) >= 2:
                out.append((LineString(xy), 3.0, s_.get('k', 3)))
    except Exception as e:
        print('no streets of Schleusingen', e)
    return out


def main_tiles(a):
    """the buildings beyond Ratscher's square along the roads one drives (welt/fahrt.js), in Schleusingen around the old town and at Kloster
    Veßra: cells of 400 m (model metres) the app builds when the player comes near"""
    from shapely.geometry import Polygon, Point
    from shapely.strtree import STRtree
    from shapely.ops import unary_union
    roads = roads_fahrt()
    region = unary_union([ls.buffer(260, resolution=4) for ls, _, k in roads if k <= 6] +
                         [Point(*MARKT).buffer(1700), Point(*W.to_model(616500.0, 5594650.0)).buffer(950)])
    print('region km²', round(region.area / 1e6, 1), flush=True)
    ZP = zone_footprints()
    ztree = STRtree(ZP)
    # what Kloster Veßra and Schleusingen model themselves (the church ruin, the precinct, the nursery, the castle, the Rathaus …): no ETHOS
    # building there (the zone's own tiles keep their photo there, as before)
    ko = keepout('zonen')
    kot = STRtree([g for g, _ in ko])
    kept = {}
    cand = []
    for r in W.load_ethos(a.ethos):
        pts = [W.to_model(e, n) for e, n in r['poly'][0][0]]
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        if BOX[0] + 2 < cx < BOX[2] - 2 and BOX[1] + 2 < cy < BOX[3] - 2:
            continue
        if not region.contains(Point(cx, cy)):
            continue
        g = Polygon(pts).buffer(0)
        if g.is_empty:
            continue
        why = kept_out(g, ko, kot)
        if why:
            kept[why] = kept.get(why, 0) + 1
            continue
        cand.append((r, g))
    print('kept out', json.dumps(kept, ensure_ascii=False), flush=True)
    st = {'ethos': len(cand), 'dup': 0, 'part': 0, 'new': 0, 'sliver': 0, 'keepout': sum(kept.values())}
    keep = []
    for r, g in cand:
        hits = [ZP[i] for i in ztree.query(g)]
        ov = sum(g.intersection(o).area for o in hits) / max(g.area, 1e-6) if hits else 0.0
        if ov > 0.5:
            st['dup'] += 1
            continue
        if ov > 0.02:
            rest = g.difference(unary_union(hits).buffer(0.15, join_style=2))
            pieces = [p for p in (rest.geoms if hasattr(rest, 'geoms') else [rest]) if p.geom_type == 'Polygon']
            pieces = [p for p in pieces if p.area > 8 and p.buffer(-1.0).area > 1.5]   # no strips of a mismatched outline
            if not pieces:
                st['sliver'] += 1
                continue
            st['part'] += 1
            for k, p in enumerate(pieces):
                keep.append((r, p, r['id'] + ('' if k == 0 else '_%d' % k)))
        else:
            st['new'] += 1
            keep.append((r, g, r['id']))
    polys = []
    for r, g, sid in keep:
        c = clean(g)
        if c is not None:
            polys.append((r, c, sid))
    allp = ZP + [p for _, p, _ in polys]
    allid = ['zone%d' % i for i in range(len(ZP))] + [sid for _, _, sid in polys]
    tree = STRtree(allp)
    rl = [(ls, hw) for ls, hw, k in roads if k <= 5]
    rtree = STRtree([ls for ls, _ in rl])
    # the roof colours: the 2024 orthophoto of each cell, fetched from the state's WMS (0.5 m/px)
    import dop as DOP
    cells = {}
    for r, p, sid in polys:
        c = p.representative_point()
        cells.setdefault((math.floor(c.x / CELL), math.floor(c.y / CELL)), []).append((r, p, sid))
    print('cells', len(cells), 'buildings', len(polys), flush=True)
    tmp = a.debug or '/tmp'
    out_dir = os.path.join(a.out, 'z')
    os.makedirs(out_dir, exist_ok=True)
    for f in glob.glob(os.path.join(out_dir, '*.json')):
        os.remove(f)
    index, total, kinds = {}, 0, {}
    for (i, j), lst in sorted(cells.items()):
        xs = [q for _, p, _ in lst for q in p.bounds[0::2]]
        ys = [q for _, p, _ in lst for q in p.bounds[1::2]]
        corners = [W.to_utm(x, y) for x in (min(xs) - 5, max(xs) + 5) for y in (min(ys) - 5, max(ys) + 5)]
        e0, e1 = math.floor(min(c[0] for c in corners)), math.ceil(max(c[0] for c in corners))
        n0, n1 = math.floor(min(c[1] for c in corners)), math.ceil(max(c[1] for c in corners))
        fn = os.path.join(tmp, 'dop_cell_%d_%d.jpg' % (i, j))
        photo = None
        try:
            if not os.path.exists(fn):
                DOP.fetch(fn, e0, n0, e1, n1, 0.5)
            photo = Photo(fn, e0, n0, 0.5)
        except Exception as e:
            print('no photo for cell', i, j, e, flush=True)
        ctx = {'tree': tree, 'polys': allp, 'ids': allid, 'photo': photo, 'roads': rl,
               'roads_near': lambda pr: [rl[k] for k in rtree.query(pr.buffer(20))]}
        bl = [make(p, r['h'], sid, ctx) for r, p, sid in lst]
        for b in bl:
            kinds[b['k']] = kinds.get(b['k'], 0) + 1
        key = '%d_%d' % (i, j)
        json.dump({'v': 1, 'cell': [i, j], 'b': bl}, open(os.path.join(out_dir, key + '.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
        index[key] = len(bl)
        total += len(bl)
        if not a.debug:
            try:
                os.remove(fn)
            except OSError:
                pass
    st['built'] = total
    st['kinds'] = kinds
    st['cells'] = len(index)
    json.dump({'v': 1, 'cell': CELL, 'src': 'ETHOS.BUILDA (Forschungszentrum Jülich, Zenodo 11845992, ODbL 1.0) from LoD2 Thüringen (© GDI-Th, '
                                          'dl-de/by-2-0); roof colours DOP 2024 © GDI-Th', 'stats': st, 'cells': index},
              open(os.path.join(out_dir, 'index.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    size = sum(os.path.getsize(f) for f in glob.glob(os.path.join(out_dir, '*.json')))
    print(json.dumps(st), size, 'bytes', flush=True)


def debug_map(out, osm, d, photo):
    from PIL import Image, ImageDraw
    os.makedirs(d, exist_ok=True)
    s = 1.0
    x0, y0, x1, y1 = BOX
    img = Image.new('RGB', (int((x1 - x0) / s), int((y1 - y0) / s)), (40, 40, 40))
    if photo is not None:
        # the photo on model axes (nearest pixel, coarse)
        H, Wn = img.size[1], img.size[0]
        xs = x0 + (np.arange(Wn) + 0.5) * s
        ys = y1 - (np.arange(H) + 0.5) * s
        X, Y = np.meshgrid(xs, ys)
        E, N = W.to_utm(X, Y)
        u = ((E - photo.e0) / photo.res).astype(int).clip(0, photo.a.shape[1] - 1)
        v = ((photo.n1 - N) / photo.res).astype(int).clip(0, photo.a.shape[0] - 1)
        img = Image.fromarray((photo.a[v, u] * 255).astype(np.uint8))
    dr = ImageDraw.Draw(img)
    px = lambda p: ((p[0] - x0) / s, (y1 - p[1]) / s)
    for v in osm.values():
        dr.polygon([px(p) for p in v['ring']], outline=(0, 160, 255))
    col = {0: (255, 60, 60), 1: (255, 200, 0), 2: (255, 0, 255), 4: (0, 255, 255), 5: (255, 255, 255)}
    for b in out:
        f = b['f']
        dr.polygon([px((f[i], f[i + 1])) for i in range(0, len(f), 2)], outline=col[b['k']])
    img.save(os.path.join(d, 'ratscher_map.jpg'), quality=85)


if __name__ == '__main__':
    main()
