"""OpenStreetMap XML (the API's cached tiles) → areas and lines with their tags in model metres (shapely). Multipolygon relations are
assembled from their outer and inner ways. © OpenStreetMap contributors, ODbL 1.0."""
import os, sys
import xml.etree.ElementTree as ET
from pyproj import Transformer
from shapely.geometry import LineString, Polygon, MultiPolygon
from shapely.ops import linemerge, polygonize, unary_union
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemeinsam import u2m  # noqa: E402

TR = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
# tags that make a closed way an area (a closed highway, barrier or waterway stays a line unless area=yes)
AREA_KEYS = ('landuse', 'leisure', 'natural', 'amenity', 'building', 'man_made', 'place', 'area:highway', 'water', 'waterway', 'surface',
             'parking', 'landcover', 'garden:type', 'tourism')
LINE_ONLY = {'barrier', 'highway', 'waterway', 'railway', 'power'}


def load(files):
    nodes, ways, rels = {}, {}, {}
    for fn in files:
        for _, el in ET.iterparse(fn):
            if el.tag == 'node':
                nodes[el.get('id')] = (float(el.get('lon')), float(el.get('lat')), {t.get('k'): t.get('v') for t in el.findall('tag')})
            elif el.tag == 'way':
                ways[el.get('id')] = ([n.get('ref') for n in el.findall('nd')], {t.get('k'): t.get('v') for t in el.findall('tag')})
            elif el.tag == 'relation':
                rels[el.get('id')] = ([(m.get('type'), m.get('ref'), m.get('role')) for m in el.findall('member')],
                                      {t.get('k'): t.get('v') for t in el.findall('tag')})
            if el.tag in ('node', 'way', 'relation'):
                el.clear()
    # model coordinates of every node
    ids = list(nodes)
    lon = [nodes[k][0] for k in ids]
    lat = [nodes[k][1] for k in ids]
    E, N = TR.transform(lon, lat)
    X, Y = u2m(E, N)
    xy = {k: (float(x), float(y)) for k, x, y in zip(ids, X, Y)}
    return nodes, ways, rels, xy


def is_area(tags, closed):
    if not closed:
        return False
    if tags.get('area') == 'yes':
        return True
    if tags.get('area') == 'no':
        return False
    if any(k in tags for k in LINE_ONLY) and not any(k in tags for k in ('landuse', 'leisure', 'amenity', 'natural', 'building')):
        return tags.get('waterway') in ('riverbank', 'dock')
    return any(k in tags for k in AREA_KEYS)


def extract(files):
    """→ areas [(Polygon|MultiPolygon, tags, id)], lines [(LineString, tags, id)], points [((x, y), tags, id)]"""
    nodes, ways, rels, xy = load(files)
    areas, lines, points = [], [], []
    member_of_mp = set()
    for rid, (mem, tags) in rels.items():
        if tags.get('type') not in ('multipolygon', 'boundary') or tags.get('type') == 'boundary':
            continue
        outer, inner = [], []
        for typ, ref, role in mem:
            if typ != 'way' or ref not in ways:
                continue
            pts = [xy[r] for r in ways[ref][0] if r in xy]
            if len(pts) >= 2:
                (inner if role == 'inner' else outer).append(LineString(pts))
            if not ways[ref][1] or set(ways[ref][1]) <= {'source', 'created_by', 'note'}:
                member_of_mp.add(ref)
        try:
            po = list(polygonize(linemerge(outer))) if outer else []
            pi = list(polygonize(linemerge(inner))) if inner else []
        except Exception:
            continue
        if not po:
            continue
        g = unary_union(po)
        if pi:
            g = g.difference(unary_union(pi))
        if not g.is_empty:
            areas.append((g, tags, 'r' + rid))
    for wid, (refs, tags) in ways.items():
        if not tags or wid in member_of_mp and not any(k in tags for k in AREA_KEYS + tuple(LINE_ONLY)):
            continue
        pts = [xy[r] for r in refs if r in xy]
        if len(pts) < 2:
            continue
        closed = refs[0] == refs[-1] and len(pts) >= 4
        if is_area(tags, closed):
            p = Polygon(pts)
            if not p.is_valid:
                p = p.buffer(0)
            if not p.is_empty:
                areas.append((p, tags, 'w' + wid))
            if any(k in tags for k in ('barrier',)):  # a closed hedge round a garden is also a line
                lines.append((LineString(pts), tags, 'w' + wid))
        else:
            lines.append((LineString(pts), tags, 'w' + wid))
    for nid, (lo, la, tags) in nodes.items():
        if tags and nid in xy:
            points.append((xy[nid], tags, 'n' + nid))
    return areas, lines, points
