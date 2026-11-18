#!/usr/bin/env python3
"""feat/welt-wald: the OpenStreetMap data of the forest pipeline (ODbL) from an Overpass API, in small pieces (the public servers time out on
the whole region; Geofabrik and overpass-api.de are not reachable from the chat machine – tools/welt/QUELLEN.md): ways (highways, railways,
power lines) and green areas (forest, wood, scrub, orchards, tree rows, single trees, hedges, water, landuse) with their geometry, merged
into $WW_RAW/osm/ways.json and green.json (Overpass JSON).

  python3 tools/weltwald/osm.py [lat0 lon0 lat1 lon1] [--step 0.05]
  python3 tools/weltwald/osm.py --api [--routes markt,baumschule | --cells -4_-1,-3_-1]   # the OSM API 0.6 instead (see api_main)
"""
import json, math, os, re, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wwlib as W

# the one that answers from the chat machine (17.11.2026); WW_OVERPASS for another
SERVERS = [os.environ.get('WW_OVERPASS', 'https://overpass.private.coffee/api/interpreter')]
Q = {
    'ways': '(way["highway"]({b});way["railway"~"^(rail|light_rail|disused|abandoned|narrow_gauge)$"]({b});way["power"="line"]({b}););',
    'green': ('(way["landuse"~"^(forest|orchard|plant_nursery)$"]({b});relation["landuse"~"^(forest|orchard)$"]({b});'
              'way["natural"~"^(wood|scrub|tree_row|heath|wetland|water)$"]({b});relation["natural"~"^(wood|scrub|water|wetland)$"]({b});'
              'node["natural"="tree"]({b});way["barrier"="hedge"]({b});'
              'way["landuse"~"^(meadow|farmland|grass|residential|industrial|commercial|farmyard|allotments|cemetery|quarry|recreation_ground)$"]({b});'
              'way["leisure"~"^(park|garden|pitch|sports_centre|golf_course|playground)$"]({b});'
              'way["waterway"~"^(river|stream|canal|ditch|drain)$"]({b}););'),
}


def fetch(kind, b):
    q = f'[out:json][timeout:180];{Q[kind].format(b=b)}out body geom;'
    last = ''
    for k in range(5):
        url = SERVERS[k % len(SERVERS)]
        try:
            raw = W.http(url, timeout=240, tries=1, data=urllib.parse.urlencode({'data': q}).encode())
            j = json.loads(raw)
            if 'remark' in j and 'runtime error' in j['remark']:
                raise RuntimeError(j['remark'][:120])
            return j['elements']
        except Exception as e:
            last = str(e)[:160]
            time.sleep(5 + 5 * k)
    raise RuntimeError(f'{kind} {b}: {last}')


# ---------------------------------------------------------------- the OSM API 0.6 (welt-wald-2) ---------------------------------------
# Overpass did not answer from the chat machine on 18.11.2026 (private.coffee timed out); the editing API's /map does (as for
# viz3/extra/fahrt/strecke.py): every node, way and relation of a small box. Boxes of 0.03° x 0.013° (~2.1 x 1.4 km) over the cells
# asked for, split in four when the API refuses one (more than 50 000 nodes), cached as XML under $WW_RAW/osm/api/. The ways and areas
# the Overpass queries above ask for are written as Overpass JSON (ways.json, green.json) – baeume.py reads them as before. A
# multipolygon keeps only the members whose way came in some box (an area cut by the boxes' edge loses its open rings: no area there).
API = 'https://api.openstreetmap.org/api/0.6/map?bbox='
WAYS_RE = {'highway': re.compile('.'), 'railway': re.compile('^(rail|light_rail|disused|abandoned|narrow_gauge)$'),
           'power': re.compile('^line$')}
GREEN_RE = {'landuse': re.compile('^(forest|orchard|plant_nursery|meadow|farmland|grass|residential|industrial|commercial|farmyard|'
                                  'allotments|cemetery|quarry|recreation_ground)$'),
            'natural': re.compile('^(wood|scrub|tree_row|heath|wetland|water)$'), 'barrier': re.compile('^hedge$'),
            'leisure': re.compile('^(park|garden|pitch|sports_centre|golf_course|playground)$'),
            'waterway': re.compile('^(river|stream|canal|ditch|drain)$')}


def api_box(bb, d, depth=0):
    """the XML of one box (lon0, lat0, lon1, lat1), or of its four quarters when the API refuses it: [bytes]"""
    import urllib.error, urllib.request
    s = ','.join(f'{v:.5f}' for v in bb)
    p = os.path.join(d, 'c_' + s.replace(',', '_') + '.xml')
    if os.path.exists(p) and os.path.getsize(p) > 0:
        return [open(p, 'rb').read()]
    last = None
    for k in range(4):
        try:
            req = urllib.request.Request(API + s, headers={'User-Agent': W.UA})
            with urllib.request.urlopen(req, timeout=180) as r:
                b = r.read()
            open(p, 'wb').write(b)
            W.log('OSM API', s, len(b) // 1024, 'kB')
            return [b]
        except urllib.error.HTTPError as e:
            last = e
            if e.code in (400, 509) and depth < 3:  # too many nodes (or bandwidth): the quarters
                lo0, la0, lo1, la1 = bb
                lm, am = (lo0 + lo1) / 2, (la0 + la1) / 2
                out = []
                for q in ((lo0, la0, lm, am), (lm, la0, lo1, am), (lo0, am, lm, la1), (lm, am, lo1, la1)):
                    out += api_box(q, d, depth + 1)
                return out
            time.sleep(5 + 10 * k)
        except Exception as e:
            last = e
            time.sleep(5 + 10 * k)
    raise RuntimeError(f'OSM API {s}: {last}')


def api_main(cells):
    """the OSM data of the model cells [(i, j)] (and 60 m round them) from the OSM API into ways.json and green.json"""
    import xml.etree.ElementTree as ET
    from pyproj import Transformer
    tr = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
    lon0 = lat0 = 1e9
    lon1 = lat1 = -1e9
    want = []
    for i, j in cells:
        x0, y0, x1, y1 = W.cell_box(i, j, 60)
        ll = [tr.transform(*W.to_utm(x, y)) for x in (x0, x1) for y in (y0, y1)]
        b = (min(p[0] for p in ll), min(p[1] for p in ll), max(p[0] for p in ll), max(p[1] for p in ll))
        want.append(b)
        lon0, lat0, lon1, lat1 = min(lon0, b[0]), min(lat0, b[1]), max(lon1, b[2]), max(lat1, b[3])
    d = os.path.join(W.RAW, 'osm', 'api')
    os.makedirs(d, exist_ok=True)
    SL, SA = 0.03, 0.013
    boxes = []
    for a in range(int(math.floor(lon0 / SL)), int(math.floor(lon1 / SL)) + 1):
        for c in range(int(math.floor(lat0 / SA)), int(math.floor(lat1 / SA)) + 1):
            bb = (a * SL, c * SA, (a + 1) * SL, (c + 1) * SA)
            if any(w[0] < bb[2] and w[2] > bb[0] and w[1] < bb[3] and w[3] > bb[1] for w in want):
                boxes.append(bb)
    W.log(len(cells), 'cells,', len(boxes), 'boxes of the OSM API')
    nodes, ways, rels = {}, {}, {}
    for bb in boxes:
        for x in api_box(bb, d):
            for e in ET.fromstring(x):
                i = int(e.get('id', 0))
                tags = {t.get('k'): t.get('v') for t in e.findall('tag')}
                if e.tag == 'node':
                    nodes[i] = (float(e.get('lat')), float(e.get('lon')))
                elif e.tag == 'way':
                    ways[i] = ([int(n.get('ref')) for n in e.findall('nd')], tags)
                elif e.tag == 'relation':
                    rels[i] = ([(m.get('type'), int(m.get('ref')), m.get('role', '')) for m in e.findall('member')], tags)
    geo = lambda refs: [{'lat': nodes[r][0], 'lon': nodes[r][1]} for r in refs if r in nodes]
    match = lambda t, R: any(k in t and R[k].search(str(t[k])) for k in R)
    out_w, out_g = [], []
    for i, (refs, t) in ways.items():
        g = geo(refs)
        if len(g) < 2:
            continue
        if match(t, WAYS_RE):
            out_w.append({'type': 'way', 'id': i, 'tags': t, 'geometry': g})
        if match(t, GREEN_RE):
            out_g.append({'type': 'way', 'id': i, 'tags': t, 'geometry': g})
    for i, (mem, t) in rels.items():
        if t.get('type') != 'multipolygon' or not match(t, {k: GREEN_RE[k] for k in ('landuse', 'natural')}):
            continue
        ms = [{'type': 'way', 'ref': r, 'role': ro, 'geometry': geo(ways[r][0])} for ty, r, ro in mem if ty == 'way' and r in ways]
        if ms:
            out_g.append({'type': 'relation', 'id': i, 'tags': t, 'members': ms})
    json.dump({'elements': out_w}, open(os.path.join(W.RAW, 'osm', 'ways.json'), 'w'))
    json.dump({'elements': out_g}, open(os.path.join(W.RAW, 'osm', 'green.json'), 'w'))
    W.log('OSM API:', len(nodes), 'nodes', len(ways), 'ways', len(rels), 'relations →', len(out_w), 'ways,', len(out_g), 'areas')


def main():
    if '--api' in sys.argv:
        import baeume as BA
        cells = []
        if '--routes' in sys.argv:
            cells += BA.corridor_cells(sys.argv[sys.argv.index('--routes') + 1].split(','))[0]
        if '--cells' in sys.argv:
            cells += [tuple(int(v) for v in c.split('_')) for c in sys.argv[sys.argv.index('--cells') + 1].split(',')]
        api_main(list(dict.fromkeys(cells)))
        return
    a = [float(v) for v in sys.argv[1:5]] if len(sys.argv) >= 5 else [50.36, 10.53, 50.72, 11.0]
    step = float(sys.argv[sys.argv.index('--step') + 1]) if '--step' in sys.argv else 0.05
    d = os.path.join(W.RAW, 'osm', 'parts')
    os.makedirs(d, exist_ok=True)
    la = a[0]
    while la < a[2] - 1e-9:
        lo = a[1]
        while lo < a[3] - 1e-9:
            b = f'{la:.3f},{lo:.3f},{min(a[2], la + step):.3f},{min(a[3], lo + step):.3f}'
            for kind in Q:
                p = os.path.join(d, f'{kind}_{b}.json')
                if os.path.exists(p):
                    continue
                try:
                    el = fetch(kind, b)
                    json.dump(el, open(p, 'w'))
                    W.log(kind, b, len(el))
                except Exception as e:
                    W.log('failed', e)
            lo += step
        la += step
    for kind in Q:
        seen, out = set(), []
        for f in sorted(os.listdir(d)):
            if not f.startswith(kind + '_'):
                continue
            for e in json.load(open(os.path.join(d, f))):
                k = (e['type'], e['id'])
                if k not in seen:
                    seen.add(k)
                    out.append(e)
        json.dump({'elements': out}, open(os.path.join(W.RAW, 'osm', kind + '.json'), 'w'))
        W.log(kind, len(out), 'elements merged')


if __name__ == '__main__':
    main()
