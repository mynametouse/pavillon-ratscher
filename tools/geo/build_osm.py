# Part C: OSM (inner + outer extracts) → labels for the map view, water bodies (triangulated), building footprints for Part D, map-style textures
import sys, os; sys.path.insert(0, os.path.dirname(__file__)); from common import *
from osm import load
import mapbox_earcut as earcut
from shapely.geometry import Polygon, LineString, MultiPolygon
from shapely.ops import unary_union, linemerge
from PIL import Image, ImageDraw, ImageFont
H0 = json.load(open(os.path.join(OUT, 'h0.json')))['H0']
nodes, ways, rels = {}, {}, {}
for f in ['ratscher.osm'] + [os.path.join('data', f'osm_outer_{i}.osm') for i in range(4)]:
    n, w, r = load(os.path.join(HERE, f)); nodes.update(n); ways.update(w); rels.update(r)
print('osm', len(nodes), len(ways), len(rels))
def wcoords(wid): refs = ways[wid][0]; return [(nodes[r][0], nodes[r][1]) for r in refs if r in nodes]
def rings(rid):   # outer/inner rings of a multipolygon relation, joined from member ways
    out, inn = [], []
    for typ, ref, role in rels[rid][0]:
        if typ == 'way' and ref in ways: (inn if role == 'inner' else out).append(LineString(wcoords(ref)))
    def join(ls):
        res = []; m = linemerge(ls) if ls else None
        for g in ([m] if m is not None and m.geom_type == 'LineString' else (list(m.geoms) if m is not None else [])):
            if g.is_ring or (len(g.coords) > 3 and g.coords[0] == g.coords[-1]): res.append(Polygon(g.coords))
        return res
    o = join(out); i_ = join(inn); res = []
    for p in o:
        q = p
        for h in i_:
            if p.contains(h.representative_point()): q = q.difference(h)
        res.append(q)
    return res
def areas(pred):
    res = []
    for wid, (refs, tags) in ways.items():
        if pred(tags) and len(refs) > 3 and refs[0] == refs[-1]:
            c = wcoords(wid)
            if len(c) > 3: res.append((Polygon(c), tags))
    for rid, (mem, tags) in rels.items():
        if tags.get('type') == 'multipolygon' and pred(tags):
            for p in rings(rid): res.append((p, tags))
    return res
EXT = {'inner': (CX - 1200, CY - 1200, 2400), 'outer': (CX - 5000, CY - 5000, 10000)}
# ---- water bodies (lakes, reservoir, ponds) → triangles in model coordinates at their water level ----
dgm = mosaic('dgm')
water = []
for p, tags in areas(lambda t: t.get('natural') == 'water' or t.get('landuse') == 'reservoir' or t.get('water') in ('reservoir', 'pond', 'lake')):
    if not p.is_valid: p = p.buffer(0)
    if p.area < 150: continue
    b = p.bounds
    if b[2] < CX - 5000 or b[0] > CX + 5000 or b[3] < CY - 5000 or b[1] > CY + 5000: continue
    polys = list(p.geoms) if p.geom_type == 'MultiPolygon' else [p]
    for q in polys:
        q = q.simplify(1.0)
        ext = np.array(q.exterior.coords)[:-1]; holes = [np.array(h.coords)[:-1] for h in q.interiors]
        # water level: low percentile of the 1 m DGM inside (where available), else the shore height from the terrain
        inside = ext[(ext[:, 0] > X0) & (ext[:, 0] < X0 + 3000) & (ext[:, 1] > Y1 - 3000) & (ext[:, 1] < Y1)]
        lvl = float(np.nanpercentile(sample(dgm, ext[:, 0], ext[:, 1]), 10)) if len(inside) > 3 else None
        verts = np.vstack([ext] + holes); ring_ends = np.cumsum([len(ext)] + [len(h) for h in holes]).astype(np.uint32)
        tri = earcut.triangulate_float64(verts, ring_ends)
        mx, my = u2m(verts[:, 0], verts[:, 1])
        water.append({'name': tags.get('name', ''), 'level': lvl, 'area': round(q.area), 'x': np.round(mx, 2).tolist(), 'y': np.round(my, 2).tolist(), 'tri': tri.astype(int).tolist(), 'utm': [float(q.centroid.x), float(q.centroid.y)]})
print('water bodies', [(w['name'], w['area'], None if w['level'] is None else round(w['level'], 1)) for w in water][:12])
# ---- labels: places, water, roads (ref / name), some landmarks ----
labels = []
def addl(text, E, N, kind, prio):
    x, y = u2m(E, N); labels.append({'t': text, 'x': round(float(x), 1), 'y': round(float(y), 1), 'k': kind, 'p': prio})
for nid, (E, N, tags) in nodes.items():
    if abs(E - CX) > 5200 or abs(N - CY) > 5200: continue
    pl = tags.get('place'); nm = tags.get('name')
    if pl and nm: addl(nm, E, N, 'place', {'town': 9, 'village': 8, 'suburb': 6, 'hamlet': 6, 'isolated_dwelling': 3, 'locality': 3}.get(pl, 2))
    elif nm and tags.get('natural') == 'peak': addl(nm + (' ' + tags['ele'] + ' m' if tags.get('ele') else ''), E, N, 'peak', 5)
    elif nm and tags.get('amenity') == 'place_of_worship': addl(nm, E, N, 'poi', 4)
for w in water:
    if w['name']: addl(w['name'], *w['utm'], 'water', 8 if w['area'] > 100000 else 4)
rivers = {}
for wid, (refs, tags) in ways.items():
    if tags.get('waterway') in ('river', 'stream') and tags.get('name'): rivers.setdefault(tags['name'], []).append(LineString(wcoords(wid)))
for nm, ls in rivers.items():
    m = linemerge(ls); geoms = [m] if m.geom_type == 'LineString' else list(m.geoms); g = max(geoms, key=lambda q: q.length)
    if g.length < 200: continue
    for f in ((0.3, 0.7) if g.length > 2500 else (0.5,)):
        p = g.interpolate(f, normalized=True); p2 = g.interpolate(min(1, f + 0.01), normalized=True); x, y = u2m(p.x, p.y); x2, y2 = u2m(p2.x, p2.y)
        if abs(p.x - CX) < 5000 and abs(p.y - CY) < 5000: labels.append({'t': nm, 'x': round(float(x), 1), 'y': round(float(y), 1), 'k': 'river', 'p': 5, 'a': round(float(np.degrees(np.arctan2(y2 - y, x2 - x))), 1)})
roads = {}
for wid, (refs, tags) in ways.items():
    hw = tags.get('highway')
    if not hw or hw in ('footway', 'path', 'cycleway', 'steps', 'service', 'track'): continue
    key = tags.get('ref') or tags.get('name')
    if key: roads.setdefault(key, []).append((LineString(wcoords(wid)), hw))
for key, ls in roads.items():
    m = linemerge([q for q, _ in ls]); geoms = [m] if m.geom_type == 'LineString' else list(m.geoms); g = max(geoms, key=lambda q: q.length)
    cen = g.interpolate(0.5, normalized=True)
    if abs(cen.x - CX) > 4800 or abs(cen.y - CY) > 4800 or g.length < 120: continue
    p2 = g.interpolate(0.5 + min(0.02, 15 / g.length), normalized=True); x, y = u2m(cen.x, cen.y); x2, y2 = u2m(p2.x, p2.y)
    big = any(h in ('motorway', 'trunk', 'primary', 'secondary', 'tertiary') for _, h in ls)
    inner = abs(cen.x - CX) < 1200 and abs(cen.y - CY) < 1200
    if not big and not inner: continue
    labels.append({'t': key, 'x': round(float(x), 1), 'y': round(float(y), 1), 'k': 'road', 'p': 6 if big else 3, 'a': round(float(np.degrees(np.arctan2(y2 - y, x2 - x))), 1)})
print('labels', len(labels), sorted([l['t'] for l in labels if l['p'] >= 6]))
# ---- building footprints (inner area) for Part D ----
blds = []
for p, tags in areas(lambda t: 'building' in t and t.get('building') != 'no'):
    if not p.is_valid: p = p.buffer(0)
    if p.geom_type != 'Polygon' or p.area < 8: continue
    c = p.centroid
    if abs(c.x - CX) > 1180 or abs(c.y - CY) > 1180: continue
    blds.append({'utm': np.round(np.array(p.exterior.coords)[:-1], 2).tolist(), 'type': tags.get('building'), 'levels': tags.get('building:levels'), 'roof': tags.get('roof:shape'), 'name': tags.get('name')})
print('osm buildings (inner)', len(blds))
json.dump(blds, open(os.path.join(OUT, 'osm_buildings.json'), 'w'))
json.dump({'water': water, 'labels': labels}, open(os.path.join(OUT, 'osm_meta.json'), 'w'))
# ---- map-style textures (like a printed map): land use, water, roads, buildings; same squares as the orthophotos ----
FILL = [('forest', lambda t: t.get('landuse') == 'forest' or t.get('natural') == 'wood', (173, 209, 158)), ('farmland', lambda t: t.get('landuse') in ('farmland', 'farmyard'), (238, 240, 213)),
        ('meadow', lambda t: t.get('landuse') in ('meadow', 'grass', 'village_green', 'orchard', 'allotments') or t.get('natural') in ('grassland', 'scrub', 'heath'), (205, 235, 176)),
        ('resid', lambda t: t.get('landuse') in ('residential', 'retail', 'commercial'), (224, 223, 223)), ('ind', lambda t: t.get('landuse') in ('industrial', 'railway'), (235, 219, 232)),
        ('sport', lambda t: t.get('leisure') in ('pitch', 'park', 'sports_centre', 'garden') , (200, 230, 190))]
fills = {k: areas(pr) for k, pr, _ in FILL}
waterp = areas(lambda t: t.get('natural') == 'water' or t.get('landuse') == 'reservoir')
allb = areas(lambda t: 'building' in t)
RW = {'motorway': (9, (233, 144, 160)), 'trunk': (8, (249, 178, 156)), 'primary': (7, (252, 214, 164)), 'secondary': (6, (246, 250, 187)), 'tertiary': (5, (255, 255, 255)), 'unclassified': (4, (255, 255, 255)), 'residential': (4, (255, 255, 255)),
      'living_street': (4, (255, 255, 255)), 'service': (2.5, (255, 255, 255)), 'track': (1.6, (172, 131, 39)), 'path': (1.0, (250, 128, 114)), 'footway': (1.0, (250, 128, 114)), 'cycleway': (1.0, (60, 60, 255))}
road_lines = [(wcoords(wid), tags['highway']) for wid, (refs, tags) in ways.items() if tags.get('highway') in RW]
river_lines = [(wcoords(wid), tags['waterway']) for wid, (refs, tags) in ways.items() if tags.get('waterway') in ('river', 'stream', 'canal', 'ditch')]
from common import m2u as _m2u
GE, GN = [float(v) for v in m2u(2, 2)]
_NB = json.load(open(os.path.join(DATA, 'dop_near2.json')))
SQ = {'near': (_NB['e0'], _NB['n0'], _NB['w']), 'inner': (CX - 1200, CY - 1200, 2400), 'outer': (CX - 5000, CY - 5000, 10000)}
for k, (e0, n0, w) in SQ.items():
    S = 2048; ss = 2; img = Image.new('RGB', (S * ss, S * ss), (242, 239, 233)); dr = ImageDraw.Draw(img)
    f = lambda pts: [((x - e0) / w * S * ss, (n0 + w - y) / w * S * ss) for x, y in pts]
    pxm = S * ss / w   # pixels per metre
    def poly(p, col):
        for q in (list(p.geoms) if p.geom_type == 'MultiPolygon' else [p]):
            if q.is_empty: continue
            dr.polygon(f(q.exterior.coords), fill=col)
            for h in q.interiors: dr.polygon(f(h.coords), fill=(242, 239, 233))
    for (kk, _, col) in FILL:
        for p, _t in fills[kk]: poly(p, col)
    for p, _t in waterp: poly(p, (170, 211, 223))
    for pts, ww in river_lines: dr.line(f(pts), fill=(170, 211, 223), width=max(1, int((6 if ww == 'river' else 2.5) * pxm)))
    for order in ('track', 'path', 'footway', 'cycleway', 'service', 'residential', 'living_street', 'unclassified', 'tertiary', 'secondary', 'primary', 'trunk', 'motorway'):
        wdt, col = RW[order]
        for pts, hw in road_lines:
            if hw != order: continue
            if order not in ('track', 'path', 'footway', 'cycleway'): dr.line(f(pts), fill=(180, 170, 160), width=max(2, int((wdt + 1.6) * pxm)))
            dr.line(f(pts), fill=col, width=max(1, int(wdt * pxm)))
    for p, _t in allb: poly(p, (217, 208, 201))
    for p, _t in allb:
        for q in (list(p.geoms) if p.geom_type == 'MultiPolygon' else [p]): dr.line(f(q.exterior.coords), fill=(190, 178, 168), width=max(1, int(0.4 * pxm)))
    img = img.resize((S, S), Image.LANCZOS); img.save(os.path.join(OUT, 'pub', f'map_{k}.jpg'), quality=86, optimize=True); print('map', k, os.path.getsize(os.path.join(OUT, 'pub', f'map_{k}.jpg')))
