#!/usr/bin/env python3
"""suhl-gebaeude: what OpenStreetMap knows about the buildings of Suhl ((c) OpenStreetMap contributors, ODbL 1.0), in UTM 32N:
buildings with their tags (name, kind, levels, roof shape, colour and material, heritage, start date), named shops and amenities
(for the signs and the ground-floor shop zone), address nodes and the streets with their names (which street a facade faces).

Two inputs, the same in-memory model (tools/suhl/bestand/sblib.py, read only):
  --opl FILE    an OPL file cut from the Geofabrik extract with osmium (GitHub Actions; the whole municipality)
  --api DIR     the cached map calls of the OSM API in small boxes (tools/suhl/bestand/osm_api.py; from the chat machine);
                with a box only the files that touch it are read
"""
import glob, json, os, re, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gblib as G
from gblib import sblib

ROADS = {'motorway': 0, 'motorway_link': 0, 'trunk': 1, 'trunk_link': 1, 'primary': 1, 'primary_link': 1, 'secondary': 1, 'secondary_link': 1,
         'tertiary': 2, 'tertiary_link': 2, 'unclassified': 3, 'residential': 3, 'living_street': 3, 'pedestrian': 4, 'service': 5}
HALF = {0: 6.0, 1: 4.0, 2: 3.5, 3: 3.0, 4: 3.0, 5: 2.0}        # assumed half width of the carriageway by class (metres)
POI_KEYS = ('shop', 'amenity', 'tourism', 'office', 'craft', 'leisure', 'healthcare')
BTAGS = ('building', 'name', 'building:levels', 'roof:levels', 'roof:shape', 'roof:colour', 'roof:material', 'roof:orientation', 'height',
         'building:colour', 'building:material', 'heritage', 'start_date', 'addr:street', 'addr:housenumber', 'amenity', 'shop', 'tourism',
         'office', 'religion', 'man_made', 'historic', 'wikidata', 'building:use', 'ruins', 'abandoned', 'disused', 'location', 'layer',
         'tower:type', 'parking', 'leisure', 'craft', 'healthcare')


def load_api(rawdir, box=None):
    """the cached map calls (JSON of the OSM API 0.6); only the files whose lon/lat box touches `box` (UTM E0, N0, E1, N1)"""
    o = sblib.Osm()
    files = sorted(glob.glob(os.path.join(rawdir, 'map_*.json')))
    ll = None
    if box:
        lo0, la0 = sblib.to_wgs(box[0], box[1])
        lo1, la1 = sblib.to_wgs(box[2], box[3])
        ll = (lo0 - 0.002, la0 - 0.002, lo1 + 0.002, la1 + 0.002)
    used = 0
    for p in files:
        m = re.match(r'map_([\d.]+)_([\d.]+)_([\d.]+)_([\d.]+)\.json$', os.path.basename(p))
        if ll and m:
            b = [float(v) for v in m.groups()]
            if b[2] < ll[0] or b[0] > ll[2] or b[3] < ll[1] or b[1] > ll[3]:
                continue
        d = json.load(open(p, encoding='utf-8'))
        used += 1
        for el in d.get('elements', ()):
            t, i = el['type'], el['id']
            if t == 'node':
                o.nll[i] = (el['lon'], el['lat'])
                if el.get('tags'):
                    o.ntags[i] = el['tags']
            elif t == 'way':
                o.ways[i] = (el.get('nodes', []), el.get('tags') or {})
            elif t == 'relation':
                o.rels[i] = ([(m_['type'][0], m_['ref'], m_.get('role', '')) for m_ in el.get('members', ())], el.get('tags') or {})
        o.stamp = max(o.stamp, time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime(os.path.getmtime(p))))
    o.source = f'OSM API 0.6 map calls ({used} boxes)'
    return o.finish()


def extract(o, box=None):
    """-> dict: buildings [(id, tags, polygon)], pois [(name, kind, E, N, id)], addr [(E, N, street, number)], roads [(name, class, half width, line)]"""
    from shapely.geometry import LineString, Point, box as sbox
    bx = sbox(*box).buffer(60) if box else None
    blds = []
    for kind, i, tags, p in o.areas(lambda t: 'building' in t and t['building'] != 'no'):
        if bx is not None and not bx.intersects(p):
            continue
        blds.append(('way/%d' % i if kind == 'w' else 'relation/%d' % i, {k: tags[k] for k in BTAGS if k in tags}, p))
    pois, addr = [], []

    def poi_of(tags):
        if not tags.get('name'):
            return None
        for k in POI_KEYS:
            if tags.get(k) and tags[k] not in ('no', 'yes'):
                return k + '=' + tags[k]
        return None
    for i, tags in o.ntags.items():
        e, n = o.nodes[i]
        if bx is not None and not bx.contains(Point(e, n)):
            continue
        k = poi_of(tags)
        if k:
            pois.append((tags['name'], k, e, n, 'node/%d' % i))
        if tags.get('addr:housenumber'):
            addr.append((e, n, tags.get('addr:street', ''), tags['addr:housenumber']))
    for kind, i, tags, p in o.areas(lambda t: bool(t.get('name')) and any(t.get(k) for k in POI_KEYS)):
        if bx is not None and not bx.intersects(p):
            continue
        k = poi_of(tags)
        if k:
            c = p.representative_point()
            pois.append((tags['name'], k, c.x, c.y, ('way/%d' if kind == 'w' else 'relation/%d') % i))
    roads = []
    for wid, (nd, tags) in o.ways.items():
        hw = tags.get('highway')
        if hw not in ROADS or tags.get('area') == 'yes' or tags.get('tunnel') in ('yes', 'building_passage'):
            continue
        c = o.line(wid)
        if not c or len(c) < 2:
            continue
        ls = LineString(c)
        if bx is not None and not bx.intersects(ls):
            continue
        cl = ROADS[hw]
        hwid = HALF[cl]
        try:
            if tags.get('width'):
                hwid = max(1.5, min(15.0, float(tags['width'].replace(',', '.').split()[0]) / 2))
            elif tags.get('lanes') and cl <= 3:
                hwid = max(hwid, float(tags['lanes']) * 1.6)
        except ValueError:
            pass
        roads.append((tags.get('name') or tags.get('ref') or '', cl, hwid, ls))
    return {'buildings': blds, 'pois': pois, 'addr': addr, 'roads': roads, 'source': o.source, 'stamp': o.stamp}


def load(opl=None, api=None, box=None):
    o = sblib.load_osm_opl(opl) if opl else load_api(api, box)
    return extract(o, box)


if __name__ == '__main__':
    import argparse
    ap = argparse.ArgumentParser()
    ap.add_argument('--opl', default=None)
    ap.add_argument('--api', default=None)
    a = ap.parse_args()
    d = load(a.opl, a.api)
    G.log({k: (len(v) if isinstance(v, list) else v) for k, v in d.items()})
