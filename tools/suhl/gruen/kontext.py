#!/usr/bin/env python3
"""suhl-gruen: the context of the tree search, cut once from OpenStreetMap (and ETHOS.BUILDA footprints where a file is given) and kept
as one compact pickle in the raw cache: building footprints (no tree on a roof), carriageways with an estimated half width (no trunk in a
road), water, the mapped single trees and tree rows (natural=tree, natural=tree_row) and the green and forest areas with their tags.
All coordinates ETRS89 / UTM 32N. Raw data: never committed.

  python3 -I tools/suhl/gruen/kontext.py [--opl suhl.opl.gz] [--ethos suhl.jsonl] [--out RAW/kontext.pkl]
"""
import argparse, json, os, pickle, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glib

GREEN_KEYS = ('landuse', 'leisure', 'natural', 'amenity', 'tourism')
GREEN_VALUES = {
    'landuse': {'forest', 'grass', 'meadow', 'orchard', 'allotments', 'cemetery', 'village_green', 'recreation_ground', 'farmland',
                'residential', 'industrial', 'commercial', 'retail', 'railway', 'plant_nursery', 'greenfield', 'brownfield',
                'flowerbed', 'vineyard', 'quarry', 'construction', 'military', 'garages', 'farmyard', 'education', 'religious'},
    'leisure': {'park', 'garden', 'pitch', 'playground', 'sports_centre', 'golf_course', 'dog_park', 'nature_reserve', 'stadium',
                'swimming_pool', 'track'},
    'natural': {'wood', 'scrub', 'heath', 'grassland', 'water', 'wetland', 'bare_rock', 'scree', 'tree_row'},
    'amenity': {'grave_yard', 'parking', 'school', 'kindergarten'},
    'tourism': {'camp_site', 'picnic_site'},
}
KEEP_TAGS = ('landuse', 'leisure', 'natural', 'amenity', 'tourism', 'leaf_type', 'leaf_cycle', 'wood', 'name', 'sport', 'surface',
             'species', 'species:de', 'genus', 'genus:de', 'taxon', 'height', 'diameter_crown', 'circumference', 'denotation',
             'garden:type', 'water', 'access')


def rings(poly):
    """a shapely Polygon or MultiPolygon -> [[exterior, hole, ...], ...] as lists of (E, N) rounded to cm"""
    out = []
    for p in (poly.geoms if poly.geom_type == 'MultiPolygon' else [poly]):
        if p.geom_type != 'Polygon' or p.is_empty:
            continue
        out.append([[(round(x, 2), round(y, 2)) for x, y in p.exterior.coords]] +
                   [[(round(x, 2), round(y, 2)) for x, y in r.coords] for r in p.interiors])
    return out


def tree_stamps(opl=None):
    """{node id: (version, timestamp)} of the mapped trees, read from the raw OSM files (the shared OSM model drops them)"""
    import glob, gzip
    out = {}
    if opl:
        op = gzip.open if opl.endswith('.gz') else open
        with op(opl, 'rt', encoding='utf-8') as f:
            for ln in f:
                if ln[0] != 'n':
                    if ln[0] in 'wr':
                        break                    # nodes come first in an OPL file
                    continue
                if 'natural=tree' not in ln:
                    continue
                v = t = None
                fl = ln.split(' ')
                for x in fl[1:]:
                    if x[:1] == 'v':
                        v = x[1:]
                    elif x[:1] == 't':
                        t = x[1:]
                try:
                    out[int(fl[0][1:])] = (int(v or 0), t or '')
                except ValueError:
                    pass
        return out
    d = os.environ.get('SUHL_OSM_API', '/tmp/suhl-bestand/raw/osm')
    for p in sorted(glob.glob(os.path.join(d, 'map_*.json'))):
        try:
            for el in json.load(open(p, encoding='utf-8')).get('elements', ()):
                if el['type'] == 'node' and (el.get('tags') or {}).get('natural') == 'tree':
                    out[el['id']] = (int(el.get('version', 0)), el.get('timestamp', ''))
        except Exception as ex:
            glib.log('unreadable', p, ex)
    return out


def build(opl=None, ethos=None):
    osm = glib.load_osm(opl)
    glib.log(f'OSM: {len(osm.nodes)} nodes, {len(osm.ways)} ways, {len(osm.rels)} relations ({osm.source})')
    K = {'made': glib.now(), 'osm_source': osm.source, 'osm_stamp': osm.stamp, 'bld': [], 'roads': [], 'rail': [], 'water': [],
         'trees': [], 'rows': [], 'green': [], 'ethos': 0}
    for kind, i, tags, poly in osm.areas(lambda t: 'building' in t and t.get('building') != 'no'):
        K['bld'].extend(rings(poly))
    n_osm_b = len(K['bld'])
    for wid, (nd, tags) in osm.ways.items():
        if not tags:
            continue
        if 'highway' in tags:
            hw = glib.road_half_width(tags)
            c = osm.line(wid)
            if hw is not None and c and len(c) >= 2:
                K['roads'].append((c, hw, tags.get('highway'), tags.get('bridge') == 'yes' or tags.get('bridge') == 'viaduct'))
        elif tags.get('railway') in ('rail', 'light_rail', 'tram') and tags.get('tunnel') != 'yes':
            c = osm.line(wid)
            if c and len(c) >= 2:
                K['rail'].append(c)
        elif tags.get('natural') == 'tree_row':
            c = osm.line(wid)
            if c and len(c) >= 2:
                K['rows'].append((c, {k: tags[k] for k in KEEP_TAGS if k in tags}))
    stamps = tree_stamps(opl)
    for i, tags in osm.ntags.items():
        if tags.get('natural') == 'tree' and i in osm.nodes:
            e, n = osm.nodes[i]
            t = {k: tags[k] for k in KEEP_TAGS if k in tags}
            if i in stamps:                      # version and time of the node's last edit: a tree mapped after the flight
                t['_v'], t['_t'] = stamps[i]     # that the image does not show is a new planting, an older one was felled
            K['trees'].append((round(e, 2), round(n, 2), i, t))

    def green(t):
        return any(t.get(k) in GREEN_VALUES[k] for k in GREEN_KEYS)
    for kind, i, tags, poly in osm.areas(green):
        t = {k: tags[k] for k in KEEP_TAGS if k in tags}
        rr = rings(poly)
        if tags.get('natural') == 'water':
            K['water'].extend(rr)
        K['green'].append((f'{kind}{i}', t, rr, round(poly.area, 1)))
    if ethos and os.path.exists(ethos):
        for ln in open(ethos, encoding='utf-8'):
            d = json.loads(ln)
            if 'poly' not in d:
                continue
            for p in d['poly']:
                K['bld'].append([[(float(x), float(y)) for x, y in r] for r in p])
                K['ethos'] += 1
    glib.log(f"context: {n_osm_b} OSM building rings + {K['ethos']} ETHOS, {len(K['roads'])} roads, {len(K['trees'])} OSM trees, "
             f"{len(K['rows'])} tree rows, {len(K['green'])} green/land-use areas, {len(K['water'])} water")
    return K


def load(path=None):
    return pickle.load(open(path or os.path.join(glib.RAW, 'kontext.pkl'), 'rb'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--opl', default='')
    ap.add_argument('--ethos', default=os.environ.get('SUHL_ETHOS', '/tmp/suhl-bestand/raw/ethos/suhl.jsonl'))
    ap.add_argument('--out', default=os.path.join(glib.RAW, 'kontext.pkl'))
    a = ap.parse_args()
    K = build(a.opl or None, a.ethos)
    os.makedirs(os.path.dirname(a.out), exist_ok=True)
    pickle.dump(K, open(a.out + '.part', 'wb'), protocol=4)
    os.replace(a.out + '.part', a.out)
    glib.log('written', a.out, os.path.getsize(a.out))


if __name__ == '__main__':
    main()
