#!/usr/bin/env python3
"""feat/welt-orte: no village of the region lies flat any more – every building the world's tiles show only in the aerial image stands in 3D.

Extends the cells of prep.py --tiles (400 m in model metres, viz3/extra/welt-gebaeude/dist/gebaeude/z/<i>_<j>.json and z/index.json, built
by gebaeude/gebaeude.js when the player comes near, freed behind) with the ETHOS.BUILDA buildings (Forschungszentrum Jülich, ODbL 1.0; for
Thuringia from the state's LoD2) that stand in the world's fine tiles and are not built yet – the same record per building as prep.py
make() (footprint, kind, eave, height, facades, roof faces; roof colour and ridge from the 2024 orthophoto of the cell, the state's WMS):

  --stage suhl   600 m either side of the way to Suhl that welt/suhl.js hands to welt/fahrt.js (the Suhl chat's street product
                 anfahrt.json / anfahrt-grund.json: the country road L 3247 over St. Kilian, Erlau and Hirschbach, the A 73), as the
                 corridors of V17r along fahrt/strassen.json;
  --stage welt   then everything else inside the fine level (10, 0.8 m per pixel) of the tile sets the game drives on – the test block
                 (welt-test/), Kloster Veßra's (welt-test/zonen/vessra/) and Trusetal's (welt-test/zonen/trusetal/) – the villages, hamlets and farms off the roads; on Suhl's
                 ground (pavillon-daten suhl/boden) only the corridor of the first stage: the rest of its tiles is the town and its edge
                 (the part of Zella-Mehlis its tiles' frame cuts – the Suhl chat's area).

Left out – others model it: Ratscher's 2.4 km square (gebaeude/ratscher.json, world/ratscher.js); what the cells hold already (by ETHOS
id); the town of Suhl – its whole municipality, the Suhl chat's own buildings (lazy/suhl/, product g of the data repo); keepout('zonen')
of wglib (Schleusingen's castle, Rathaus, church, Markt …, Kloster Veßra's ruin, precinct, nursery …) and the OSM buildings the two zones
build themselves (more than half under one: the same building; a part sticking out is kept when it is more than a sliver). Cut back to
the edge of a drawn road (fahrt/strassen.json, Schleusingen's streets, the approach to Suhl), left out where a road runs through.

  python3 -I tools/welt-gebaeude/orte.py --ethos ETHOS.jsonl --stage suhl [--cache DIR] [--dry]
  python3 -I tools/welt-gebaeude/orte.py --ethos ETHOS.jsonl --stage welt [--cache DIR] [--dry]
  python3 -I tools/welt-gebaeude/orte.py --ethos ETHOS.jsonl --list [--cache DIR]      # the places that still lie flat, with counts

ETHOS.jsonl: tools/welt-gebaeude/filter_ethos.py (its area holds all three tile sets). The cache (default /tmp/welt-orte) keeps what is
fetched – the tiles' meta files, the approach ways, OSM places and streets (Overpass), the orthophoto of each cell (never in git).
A stage may run again: what it built before is in the cells, so only what is still missing comes in.
"""
import argparse, glob, json, math, os, re, subprocess, sys, time, urllib.request
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(os.path.dirname(HERE), 'welt'))
import wglib as W
import prep as PR

SITE = 'https://mynametouse.github.io/pavillon-ratscher/welt-test/'
DATEN = 'https://mynametouse.github.io/pavillon-daten/suhl/'
OVERPASS = ['https://overpass.kumi.systems/api/interpreter', 'https://overpass-api.de/api/interpreter',
            'https://overpass.private.coffee/api/interpreter']
ROOT_E0, ROOT_N0, ROOT = 420700.0, 5390800.0, 409600.0
ZDIR = os.path.join(W.VIZ, 'extra', 'welt-gebaeude', 'dist', 'gebaeude', 'z')
CELL = PR.CELL
CORRIDOR = PR.CORRIDOR
# OSM street kinds for the facades' distance to the street (half widths, m)
STREET_HW = {'motorway': 5.5, 'trunk': 4.5, 'primary': 4.0, 'secondary': 3.5, 'tertiary': 3.2, 'unclassified': 2.8, 'residential': 2.8,
             'living_street': 2.5, 'service': 2.0, 'tertiary_link': 3.0, 'secondary_link': 3.0, 'primary_link': 3.0}


def log(*a):
    print(*a, flush=True)


def fetch(url, path, tries=4, data=None, timeout=240):
    """a file into the cache once (urllib through the proxy); returns its path"""
    if os.path.exists(path) and os.path.getsize(path) > 0:
        return path
    os.makedirs(os.path.dirname(path), exist_ok=True)
    for k in range(tries):
        try:
            rq = urllib.request.Request(url, data=data, headers={'User-Agent': 'pavillon-ratscher-tools/1.0'})
            with urllib.request.urlopen(rq, timeout=timeout) as r:
                b = r.read()
            open(path, 'wb').write(b)
            return path
        except Exception as e:
            if k == tries - 1:
                raise
            log('retry', url[:90], e)
            time.sleep(3 + 6 * k)


def jfetch(url, cache, name):
    return json.load(open(fetch(url, os.path.join(cache, name))))


# ---------------------------------------------------------------- what the game drives on ------------------------------------------
def tile_sets(cache):
    """the level-10 tiles (400 m, UTM quadtree of tools/welt) of the three sets: {name: set of (x, y)}"""
    out = {}
    m = jfetch(SITE + 'meta.json', cache, 'meta_main.json')
    r = m['tiling']['levels']['10']['rect']
    out['welt-test'] = {(x, y) for x in range(r[0], r[2] + 1) for y in range(r[1], r[3] + 1)}
    v = jfetch(SITE + 'zonen/vessra/meta.json', cache, 'meta_vessra.json')
    r = v['tiling']['levels']['10']['rect']
    out['vessra'] = {(x, y) for x in range(r[0], r[2] + 1) for y in range(r[1], r[3] + 1)}
    # the zone Trusetal (Karten-Chat 19.11.2026, tools/welt/wlib.py ZONES['TS']): its fine level, once the zone is published
    try:
        t = jfetch(SITE + 'zonen/trusetal/meta.json', cache, 'meta_trusetal.json')
        r = t['tiling']['levels']['10']['rect']
        out['trusetal'] = {(x, y) for x in range(r[0], r[2] + 1) for y in range(r[1], r[3] + 1)}
    except Exception as e:
        log('zone Trusetal not published yet:', e)
    ak = suhl_products(cache)
    b = jfetch(DATEN + ak['boden']['index'], cache, 'meta_suhl_boden.json')
    out['suhl'] = {tuple(t) for t in b['tiling']['levels']['10']['has']}
    return out


def suhl_products(cache):
    return jfetch(DATEN + 'aktuell.json', cache, 'suhl_aktuell.json')['products']


def tile_poly(x, y, L=10):
    """a tile of the quadtree as a polygon in model metres"""
    from shapely.geometry import Polygon
    s = ROOT / (1 << L)
    e0, n0 = ROOT_E0 + x * s, ROOT_N0 + y * s
    return Polygon([W.to_model(e0, n0), W.to_model(e0 + s, n0), W.to_model(e0 + s, n0 + s), W.to_model(e0, n0 + s)])


def extent(sets):
    from shapely.ops import unary_union
    allt = set().union(*sets.values())
    return unary_union([tile_poly(x, y) for x, y in allt])


def approach(cache):
    """the way to Suhl as the game gets it (welt/suhl.js → FAHRT.add): [(LineString, half width, kind, flags)] in model metres and the
    named routes {name: LineString}"""
    from shapely.geometry import LineString
    ak = suhl_products(cache)
    p = ak['s']['path']
    ways, routes = [], {}
    for fn in ('anfahrt.json', 'anfahrt-grund.json'):
        d = jfetch(DATEN + p + fn, cache, 'suhl_' + fn)
        for w in d['ways']:
            k, w10, fl, pts = w[0], w[2], w[3], w[6]
            xy = [(pts[i] / 10.0, pts[i + 1] / 10.0) for i in range(0, len(pts) - 2, 3)]
            if len(xy) >= 2:
                ways.append((LineString(xy), w10 / 20.0, k, fl))
        for name, r in (d.get('routes') or {}).items():
            q = r['pts']
            xy = [(q[i] / 10.0, q[i + 1] / 10.0) for i in range(0, len(q) - 1, 2)]
            if len(xy) >= 2:
                routes[name] = LineString(xy)
    return ways, routes


def suhl_town(cache):
    """the municipality of Suhl in model metres – the Suhl chat builds every building in it (product g of the data repo); from its
    inventory (origin/suhl/bestand: tools/suhl/out/bestand/gebiete.geojson, OSM relation 62450), else the tiles of its product g"""
    from shapely.geometry import shape, Polygon
    from shapely.ops import unary_union
    from pyproj import Transformer
    fn = os.path.join(cache, 'suhl_gebiete.geojson')
    if not os.path.exists(fn):
        try:
            b = subprocess.run(['git', '-C', W.REPO, 'show', 'origin/suhl/bestand:tools/suhl/out/bestand/gebiete.geojson'],
                               capture_output=True, check=True).stdout
            open(fn, 'wb').write(b)
        except Exception as e:
            log('no Suhl inventory in git', e)
    if os.path.exists(fn):
        tr = Transformer.from_crs(4326, 25832, always_xy=True)
        for f in json.load(open(fn))['features']:
            if f['properties'].get('id') == 'stadt':
                g = shape(f['geometry'])
                ring = [W.to_model(*tr.transform(lo, la)) for lo, la in g.exterior.coords]
                return Polygon(ring).buffer(0), 'Gemeindegrenze (OSM relation 62450)'
    import base64
    ak = suhl_products(cache)
    gi = jfetch(DATEN + ak['g']['index'], cache, 'suhl_g_index.json')
    h = gi['has']['10']
    bits = base64.b64decode(h['bits'])
    ts = []
    for j in range(h['h']):
        for i in range(h['w']):
            k = j * h['w'] + i
            if bits[k >> 3] >> (k & 7) & 1:
                ts.append(tile_poly(h['x0'] + i, h['y0'] + j))
    return unary_union(ts), 'Kacheln des Produkts g'


def overpass(q, path):
    if os.path.exists(path) and os.path.getsize(path) > 100:
        return json.load(open(path))
    import urllib.parse
    last = None
    for u in OVERPASS:
        try:
            fetch(u, path, tries=1, data=urllib.parse.urlencode({'data': q}).encode(), timeout=90)
            return json.load(open(path))
        except Exception as e:
            last = e
            log('overpass', u, e)
            if os.path.exists(path):
                os.remove(path)
    raise last


def ll_box(poly, pad=300):
    from pyproj import Transformer
    tr = Transformer.from_crs(25832, 4326, always_xy=True)
    x0, y0, x1, y1 = poly.bounds
    cs = [tr.transform(*W.to_utm(x, y)) for x in (x0 - pad, x1 + pad) for y in (y0 - pad, y1 + pad)]
    return (round(min(c[1] for c in cs), 4), round(min(c[0] for c in cs), 4), round(max(c[1] for c in cs), 4), round(max(c[0] for c in cs), 4))


def osm_places(cache, poly):
    """OSM place nodes (village, hamlet, suburb, isolated dwelling, farm …) in model metres: [(name, kind, x, y, municipality)]"""
    from pyproj import Transformer
    s, w, n, e = ll_box(poly, 2000)
    q = (f'[out:json][timeout:120];node["place"~"^(city|town|village|hamlet|suburb|quarter|neighbourhood|isolated_dwelling|farm|locality)$"]'
         f'({s},{w},{n},{e});out body;')
    d = overpass(q, os.path.join(cache, 'osm_places.json'))
    tr = Transformer.from_crs(4326, 25832, always_xy=True)
    out = []
    for el in d['elements']:
        t = el.get('tags', {})
        if not t.get('name'):
            continue
        x, y = W.to_model(*tr.transform(el['lon'], el['lat']))
        out.append((t['name'], t['place'], x, y, t.get('is_in:municipality') or t.get('is_in') or ''))
    return out


def osm_streets(cache, poly):
    """the OSM streets around the new buildings (the facades' distance to the street, as the roads one drives in prep.py): [(line, hw)]"""
    from shapely.geometry import LineString
    from pyproj import Transformer
    s, w, n, e = ll_box(poly, 200)
    kinds = '|'.join(STREET_HW)
    q = f'[out:json][timeout:180];way["highway"~"^({kinds})$"]({s},{w},{n},{e});out geom;'
    d = overpass(q, os.path.join(cache, 'osm_streets_%s.json' % ('%.3f_%.3f_%.3f_%.3f' % (s, w, n, e))))
    tr = Transformer.from_crs(4326, 25832, always_xy=True)
    out = []
    for el in d['elements']:
        g = el.get('geometry') or []
        if len(g) < 2:
            continue
        xy = [W.to_model(*tr.transform(p['lon'], p['lat'])) for p in g]
        out.append((LineString(xy), STREET_HW.get(el['tags'].get('highway'), 2.5)))
    return out


OSMAPI = 'https://api.openstreetmap.org/api/0.6/map?bbox='
# OSM buildings that are no closed house: left out (a carport or a roof on posts as a closed shed would be wrong, a greenhouse of glass too)
OSM_SKIP = {'roof', 'carport', 'construction', 'ruins', 'collapsed', 'destroyed', 'demolished', 'proposed', 'no', 'greenhouse',
            'canopy', 'bridge', 'disused', 'abandoned', 'container', 'tent', 'static_caravan', 'city_wall', 'wall'}
# OSM buildings looked at in the 2024 photo and left out
OSM_NOT = {'w170780442': 'without a roof in the photo of 2024 (the walls of a former cowshed, 1 900 m²)'}
# heights where OSM has none (ground to ridge, m): by the kind of building, else by its size
OSM_H = {'house': 8.5, 'detached': 8.5, 'semidetached_house': 8.5, 'residential': 9.0, 'terrace': 9.0, 'apartments': 12.0, 'farm': 9.0,
         'bungalow': 5.0, 'garage': 2.8, 'garages': 2.8, 'shed': 3.0, 'hut': 3.0, 'cabin': 3.5, 'allotment_house': 3.0, 'barn': 8.0,
         'farm_auxiliary': 7.0, 'stable': 7.0, 'cowshed': 7.0, 'agricultural': 8.0, 'industrial': 9.0, 'warehouse': 9.0, 'commercial': 9.0,
         'retail': 7.0, 'church': 14.0, 'chapel': 8.0, 'school': 11.0, 'public': 10.0, 'service': 3.0, 'transformer_tower': 9.0,
         'kindergarten': 6.0, 'hotel': 11.0, 'office': 10.0, 'sports_hall': 9.0, 'fire_station': 8.0}


def osm_square(cache, i, j, pad=30.0):
    """OpenStreetMap of one square kilometre of the model (i, j: 1000 m cells) from the API (map call; split in four when the API says
    the box holds too much), cached: {'b': [[id, tags, ring (model m)]], 'h': [[kind, line (model m)]]}"""
    import xml.etree.ElementTree as ET
    from pyproj import Transformer
    fn = os.path.join(cache, 'osm_api', '%d_%d.json' % (i, j))
    if os.path.exists(fn):
        return json.load(open(fn))
    toLL = Transformer.from_crs(25832, 4326, always_xy=True)
    toU = Transformer.from_crs(4326, 25832, always_xy=True)
    cs = [toLL.transform(*W.to_utm(x, y)) for x in (i * 1000 - pad, (i + 1) * 1000 + pad) for y in (j * 1000 - pad, (j + 1) * 1000 + pad)]
    box = (min(c[0] for c in cs), min(c[1] for c in cs), max(c[0] for c in cs), max(c[1] for c in cs))
    nodes, ways, rels = {}, {}, {}

    def chunk(w, s_, e, n, depth=0):
        url = OSMAPI + '%.6f,%.6f,%.6f,%.6f' % (w, s_, e, n)
        rq = urllib.request.Request(url, headers={'User-Agent': 'pavillon-ratscher-tools/1.0'})
        try:
            with urllib.request.urlopen(rq, timeout=180) as r:
                b = r.read()
        except urllib.error.HTTPError as ex:
            if ex.code == 400 and depth < 3:
                xm, ym = (w + e) / 2, (s_ + n) / 2
                for q in ((w, s_, xm, ym), (xm, s_, e, ym), (w, ym, xm, n), (xm, ym, e, n)):
                    chunk(*q, depth=depth + 1)
                return
            raise
        root = ET.fromstring(b)
        for el in root.iter('node'):
            nodes[el.get('id')] = (float(el.get('lon')), float(el.get('lat')))
        for el in root.iter('way'):
            ways[el.get('id')] = ([nd.get('ref') for nd in el.findall('nd')], {t.get('k'): t.get('v') for t in el.findall('tag')})
        for el in root.iter('relation'):
            rels[el.get('id')] = ([(m.get('type'), m.get('ref'), m.get('role')) for m in el.findall('member')],
                                  {t.get('k'): t.get('v') for t in el.findall('tag')})
        time.sleep(1.0)
    import urllib.error
    chunk(*box)

    def ring_of(refs):
        pts = [nodes[r] for r in refs if r in nodes]
        if len(pts) < len(refs) or len(pts) < 4:
            return None
        return [list(map(lambda v: round(v, 2), W.to_model(*toU.transform(lo, la)))) for lo, la in pts]
    out = {'b': [], 'h': []}
    for wid, (refs, tags) in ways.items():
        if tags.get('building') and refs and refs[0] == refs[-1]:
            r = ring_of(refs)
            if r:
                out['b'].append(['w' + wid, tags, r])
        hw = tags.get('highway')
        if hw in STREET_HW and len(refs) >= 2:
            pts = [nodes[r] for r in refs if r in nodes]
            if len(pts) >= 2:
                out['h'].append([hw, [list(map(lambda v: round(v, 2), W.to_model(*toU.transform(lo, la)))) for lo, la in pts]])
    for rid, (mem, tags) in rels.items():
        if tags.get('type') == 'multipolygon' and tags.get('building'):
            for typ, ref, role in mem:
                if typ == 'way' and role == 'outer' and ref in ways and ways[ref][0] and ways[ref][0][0] == ways[ref][0][-1]:
                    r = ring_of(ways[ref][0])
                    if r:
                        out['b'].append(['r' + rid + '_' + ref, tags, r])
    os.makedirs(os.path.dirname(fn), exist_ok=True)
    json.dump(out, open(fn, 'w'), separators=(',', ':'), ensure_ascii=False)
    log('OSM square', i, j, len(out['b']), 'buildings', len(out['h']), 'streets')
    return out


def osm_squares(cache, squares):
    """OSM of several squares: buildings deduplicated by id, the streets as (LineString, half width)"""
    from shapely.geometry import LineString
    bs, hs, seen = [], [], set()
    for (i, j) in sorted(squares):
        try:
            d = osm_square(cache, i, j)
        except Exception as e:
            log('no OSM for square', i, j, e)
            continue
        for bid, tags, ring in d['b']:
            if bid not in seen:
                seen.add(bid)
                bs.append((bid, tags, ring))
        for hw, line in d['h']:
            hs.append((LineString(line), STREET_HW.get(hw, 2.5)))
    return bs, hs


def squares_of(polys, cells):
    """the square kilometres with buildings: the new ones and those of the cells"""
    sq = set()
    for p in polys:
        c = p.representative_point()
        sq.add((math.floor(c.x / 1000), math.floor(c.y / 1000)))
    for L in cells.values():
        for b in L:
            f = b['f']
            sq.add((math.floor(sum(f[0::2]) / (len(f) / 2) / 1000), math.floor(sum(f[1::2]) / (len(f) / 2) / 1000)))
    return sq


def osm_height(tags, area):
    """ground to the highest point from the OSM tags (height, building:levels, roof:levels), else by kind and size"""
    def num(v):
        try:
            return float(str(v).replace(',', '.').split()[0].rstrip('m'))
        except Exception:
            return None
    h = num(tags.get('height')) if tags.get('height') else None
    if h and 2.0 <= h <= 60.0:
        return h
    lv = num(tags.get('building:levels')) if tags.get('building:levels') else None
    if lv and 0 < lv < 20:
        return lv * 2.9 + (num(tags.get('roof:levels')) or 0) * 2.5 + (2.5 if tags.get('roof:shape', 'gabled') != 'flat' else 0.3)
    k = tags.get('building', 'yes')
    if k in OSM_H:
        return OSM_H[k]
    # a large hall newer than the LoD2 (the logistics hall north of Schleusingen, 37 000 m²): as high as such halls are
    return 3.0 if area < 30 else 5.5 if area < 70 else 8.5 if area < 350 else 8.0 if area < 5000 else 12.0


# ---------------------------------------------------------------- the cells as they are -------------------------------------------
def base_id(sid):
    return re.sub(r'_\d+$', '', sid)


def cells_now():
    """{key: [records]} of the cells as they are"""
    out = {}
    for fn in sorted(glob.glob(os.path.join(ZDIR, '*_*.json'))):
        key = os.path.basename(fn)[:-5]
        out[key] = json.load(open(fn))['b']
    return out


# ---------------------------------------------------------------- the stages -------------------------------------------------------
def region_of(stage, cache, sets, ext):
    """the area of a stage (model metres) and the lines of its roads (for the corridor)"""
    from shapely.ops import unary_union
    if stage == 'suhl':
        ways, routes = approach(cache)
        lines = [ls for ls, hw, k, fl in ways if k <= 6] + list(routes.values())
        reg = unary_union([ls.buffer(CORRIDOR, resolution=4) for ls in lines]).intersection(ext)
        return reg
    # on Suhl's ground only the corridor of the approach: the rest of its tiles is the town and its edge (Zella-Mehlis beyond it, cut
    # by the tiles' frame – the Suhl chat's area)
    return unary_union([extent({k: v for k, v in sets.items() if k != 'suhl'}), region_of('suhl', cache, sets, ext)])


def osm_candidates(a, cache):
    """the buildings OSM has and ETHOS not (newer than the state's LoD2, or missed there): every OSM building of the square kilometres
    with buildings in the cells, inside the tiles one drives on (stage welt's area), that no ETHOS footprint covers (15 % of it, an
    ETHOS middle inside it or its own inside an ETHOS one) and no building of the cells; the same keep-outs as the other stages. Height from its tags, else by kind
    and size (OSM_H)"""
    from shapely.geometry import Polygon, Point
    from shapely.strtree import STRtree
    from shapely.prepared import prep
    sets = tile_sets(cache)
    ext = extent(sets)
    reg = region_of('welt', cache, sets, ext)
    town, how = suhl_town(cache)
    cells = cells_now()
    bs, hs = osm_squares(cache, squares_of([], cells))
    log('stage osm: OSM buildings', len(bs), 'in the square kilometres of the cells')
    x0, y0, x1, y1 = reg.bounds
    E = []
    for r in W.load_ethos(a.ethos):
        pts = [W.to_model(e, n) for e, n in r['poly'][0][0]]
        if not (x0 - 50 < pts[0][0] < x1 + 50 and y0 - 50 < pts[0][1] < y1 + 50):
            continue
        g = Polygon(pts).buffer(0)
        if not g.is_empty:
            E.append(g)
    etree = STRtree(E)
    CP = [Polygon(np.array(b['f']).reshape(-1, 2)).buffer(0) for L in cells.values() for b in L]
    ctree = STRtree(CP)
    preg, ptown = prep(reg), prep(town.buffer(5.0))
    ko = W.keepout('zonen')
    kot = STRtree([g for g, _ in ko])
    BOX = PR.BOX
    st = {'osm': 0, 'skip_kind': 0, 'small': 0, 'square': 0, 'suhl': 0, 'keepout': 0, 'ethos': 0, 'cells': 0}
    out = []
    for bid, tags, ring in bs:
        g = Polygon(ring).buffer(0)
        if g.is_empty:
            continue
        c = g.representative_point()
        if not preg.contains(c):
            continue
        st['osm'] += 1
        if tags.get('building') in OSM_SKIP or tags.get('building:part') or bid in OSM_NOT:
            st['skip_kind'] += 1
            continue
        if g.area < 6.0:
            st['small'] += 1
            continue
        if BOX[0] + 2 < c.x < BOX[2] - 2 and BOX[1] + 2 < c.y < BOX[3] - 2:
            st['square'] += 1
            continue
        if ptown.contains(c):
            st['suhl'] += 1
            continue
        if W.kept_out(g, ko, kot):
            st['keepout'] += 1
            continue
        hit = [E[i] for i in etree.query(g)]
        if sum(g.intersection(e).area for e in hit) > 0.15 * g.area or any(g.contains(e.representative_point()) for e in hit) \
                or any(e.contains(c) for e in hit):
            st['ethos'] += 1
            continue
        hit = [CP[i] for i in ctree.query(g)]
        if sum(g.intersection(e).area for e in hit) > 0.25 * g.area:
            st['cells'] += 1
            continue
        out.append(({'id': 'osm_' + bid, 'h': osm_height(tags, g.area), 'tags': tags}, g))
    log('OSM only', len(out), json.dumps(st))
    return out, st, cells, reg, ext


def candidates(a, stage, cache):
    """the ETHOS buildings of the stage not built yet, after the keep-outs: [(record, polygon)], the stats"""
    from shapely.geometry import Polygon, Point
    from shapely.strtree import STRtree
    from shapely.prepared import prep
    if stage == 'osm':
        return osm_candidates(a, cache)
    sets = tile_sets(cache)
    ext = extent(sets)
    reg = region_of(stage, cache, sets, ext)
    log('stage', stage, 'area km²', round(reg.area / 1e6, 1), '(fine tiles of the three sets', round(ext.area / 1e6, 1), 'km²)')
    town, how = suhl_town(cache)
    log('Suhl:', how, round(town.area / 1e6, 1), 'km²')
    cells = cells_now()
    have = {base_id(b['id']) for L in cells.values() for b in L}
    log('cells now', len(cells), 'buildings', sum(len(L) for L in cells.values()), 'ETHOS ids', len(have))
    BOX = PR.BOX
    preg, ptown = prep(reg), prep(town.buffer(5.0))
    ko = W.keepout('zonen')
    kot = STRtree([g for g, _ in ko])
    st = {'ethos': 0, 'have': 0, 'square': 0, 'suhl': 0, 'keepout': 0}
    kept, out = {}, []
    for r in W.load_ethos(a.ethos):
        pts = [W.to_model(e, n) for e, n in r['poly'][0][0]]
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        c = Point(cx, cy)
        if not preg.contains(c):
            continue
        st['ethos'] += 1
        if BOX[0] + 2 < cx < BOX[2] - 2 and BOX[1] + 2 < cy < BOX[3] - 2:
            st['square'] += 1
            continue
        if r['id'] in have:
            st['have'] += 1
            continue
        if ptown.contains(c):
            st['suhl'] += 1
            continue
        g = Polygon(pts).buffer(0)
        if g.is_empty:
            continue
        why = W.kept_out(g, ko, kot)
        if why:
            st['keepout'] += 1
            kept[why] = kept.get(why, 0) + 1
            continue
        out.append((r, g))
    log('kept out', json.dumps(kept, ensure_ascii=False))
    return out, st, cells, reg, ext


def build(a, stage, cache):
    from shapely.geometry import Polygon, Point
    from shapely.strtree import STRtree
    from shapely.ops import unary_union
    t0 = time.time()
    cand, st, cells, reg, ext = candidates(a, stage, cache)
    log('candidates', len(cand), json.dumps(st))
    # the OSM buildings the zones build themselves (Schleusingen's old town, Kloster Veßra): the same building or a part sticking out
    ZP = PR.zone_footprints()
    ztree = STRtree(ZP)
    st.update({'dup': 0, 'part': 0, 'new': 0, 'sliver': 0})
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
            pieces = [p for p in pieces if p.area > 8 and p.buffer(-1.0).area > 1.5]
            if not pieces:
                st['sliver'] += 1
                continue
            st['part'] += 1
            for k, p in enumerate(pieces):
                keep.append((r, p, r['id'] + ('' if k == 0 else '_%d' % k)))
        else:
            st['new'] += 1
            keep.append((r, g, r['id']))
    # the drawn roads: the region's (fahrt/strassen.json, Schleusingen) and the approach to Suhl (no bridges, no tunnels)
    surf = PR.road_surfaces()
    ways, routes = approach(cache)
    for ls, hw, k, fl in ways:
        if k <= 4 and not fl & 3:
            surf.append((ls.buffer(hw, resolution=4), 'suhl'))
    stree = STRtree([s for s, _ in surf])
    st['road_cut'], st['road_out'] = 0, 0
    k2 = []
    for r, g, sid in keep:
        hit = [surf[i][0] for i in stree.query(g) if g.intersects(surf[i][0])]
        U = unary_union(hit) if hit else None
        if U is None or g.intersection(U).area < 0.2:
            k2.append((r, g, sid))
            continue
        rest = g.difference(U)
        pieces = sorted([p for p in (rest.geoms if hasattr(rest, 'geoms') else [rest]) if p.geom_type == 'Polygon'], key=lambda p: -p.area)
        if pieces and pieces[0].area >= 0.75 * g.area and pieces[0].area > 8 and pieces[0].buffer(-1.0).area > 1.5:
            st['road_cut'] += 1
            k2.append((r, pieces[0], sid))
        else:
            st['road_out'] += 1
    polys = []
    for r, g, sid in k2:
        c = PR.clean(g)
        if c is not None:
            polys.append((r, c, sid))
    st['clean_out'] = len(k2) - len(polys)
    log('to build', len(polys), json.dumps(st))
    if a.dry:
        return polys, st
    # party walls: every footprint – the zones', the cells' as they are and the new ones
    old = [(Polygon(np.array(b['f']).reshape(-1, 2)).buffer(0), b['id']) for L in cells.values() for b in L]
    allp = ZP + [p for p, _ in old] + [p for _, p, _ in polys]
    allid = ['zone%d' % i for i in range(len(ZP))] + [i for _, i in old] + [sid for _, _, sid in polys]
    tree = STRtree(allp)
    # streets for the facades: the roads one drives, the approach, OSM's streets in the villages
    rl = [(ls, hw) for ls, hw, k in PR.roads_fahrt() if k <= 5] + [(ls, max(hw, 2.5)) for ls, hw, k, fl in ways if k <= 5]
    if not a.no_osm:
        try:
            rl += osm_squares(cache, squares_of([p for _, p, _ in polys], {}))[1]
        except Exception as e:
            log('no OSM streets (the facades know only the roads one drives)', e)
    rtree = STRtree([ls for ls, _ in rl])
    import dop as DOP
    groups = {}
    for r, p, sid in polys:
        c = p.representative_point()
        groups.setdefault('%d_%d' % (math.floor(c.x / CELL), math.floor(c.y / CELL)), []).append((r, p, sid))
    log('cells', len(groups), '(new', sum(1 for k in groups if k not in cells), ') buildings', len(polys))
    dop_dir = os.path.join(cache, 'dop')
    os.makedirs(dop_dir, exist_ok=True)
    made, kinds, times = {}, {}, []
    for n_, (key, lst) in enumerate(sorted(groups.items())):
        t1 = time.time()
        xs = [q for _, p, _ in lst for q in p.bounds[0::2]]
        ys = [q for _, p, _ in lst for q in p.bounds[1::2]]
        corners = [W.to_utm(x, y) for x in (min(xs) - 5, max(xs) + 5) for y in (min(ys) - 5, max(ys) + 5)]
        e0, e1 = math.floor(min(c[0] for c in corners)), math.ceil(max(c[0] for c in corners))
        n0, n1 = math.floor(min(c[1] for c in corners)), math.ceil(max(c[1] for c in corners))
        fn = os.path.join(dop_dir, 'dop_%s_%d_%d_%d_%d.jpg' % (key, e0, n0, e1, n1))
        photo = None
        try:
            if not os.path.exists(fn):
                DOP.fetch(fn, e0, n0, e1, n1, 0.5)
            photo = PR.Photo(fn, e0, n0, 0.5)
        except Exception as e:
            log('no photo for cell', key, e)
        ctx = {'tree': tree, 'polys': allp, 'ids': allid, 'photo': photo, 'roads': rl,
               'roads_near': lambda pr: [rl[k] for k in rtree.query(pr.buffer(20))]}
        bl = []
        for r, p, sid in lst:
            # a large OSM-only footprint whose inside is green in the 2024 photo has no roof (a ruin, an overgrown base): not built
            if sid.startswith('osm_') and p.area > 150 and photo is not None:
                smp = PR.roof_samples(p, (0.0, 0.0), photo, step=1.0)
                if smp is not None:
                    C = smp[1]
                    green = float(np.mean((C[:, 1] > C[:, 0] + 0.02) & (C[:, 1] > C[:, 2] + 0.02)))
                    if green > 0.35:
                        st['osm_green'] = st.get('osm_green', 0) + 1
                        log('no roof in the photo (green %.0f %%): not built' % (100 * green), sid, round(p.area))
                        continue
            try:
                b = PR.make(p, r['h'], sid, ctx)
                b['o'] = stage   # which stage of feat/welt-orte built it (the loader ignores it; tests and the list count by it)
                bl.append(b)
            except Exception as e:
                log('skip', sid, e)
        bl.sort(key=lambda b: (b['f'][1], b['f'][0]))
        for b in bl:
            kinds[b['k']] = kinds.get(b['k'], 0) + 1
        made[key] = bl
        times.append(time.time() - t1)
        if n_ % 25 == 0:
            log('cell', n_, '/', len(groups), key, len(bl), 'buildings', round(time.time() - t0), 's')
    # write: a new cell as prep.py writes it; a cell that exists keeps its records as they are, the new ones after them
    write(made, cells, stage, st, kinds)
    log('done', round(time.time() - t0), 's')
    return polys, st


def write(made, cells, stage, st, kinds):
    idx_fn = os.path.join(ZDIR, 'index.json')
    idx = json.load(open(idx_fn))
    for key, bl in made.items():
        if not bl:
            continue
        i, j = (int(v) for v in key.split('_'))
        old = cells.get(key, [])
        doc = {'v': 1, 'cell': [i, j], 'b': old + bl}
        json.dump(doc, open(os.path.join(ZDIR, key + '.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
        idx['cells'][key] = len(doc['b'])
    o = idx.setdefault('orte', {})
    o[stage] = dict(st, built=sum(len(b) for b in made.values()), kinds=kinds,
                    cells_new=sum(1 for k, b in made.items() if b and k not in cells),
                    cells_added_to=sum(1 for k, b in made.items() if b and k in cells), made=time.strftime('%Y-%m-%d'))
    # the order of the cells as they came: the loader numbers a cell's buildings from its place in the list of keys (10000 + 400 k, the
    # seed of their random style) – sorted keys would move every old cell when new ones come between them; 'order' keeps the old first
    order = idx.get('order') or sorted(k for k in idx['cells'] if k not in made or k in cells)
    idx['order'] = order + sorted(k for k in idx['cells'] if k not in order)
    idx['cells'] = dict(sorted(idx['cells'].items()))
    if 'feat/welt-orte' not in idx.get('src', ''):
        idx['src'] += '; feat/welt-orte: the flat places of the region (tools/welt-gebaeude/orte.py)'
    json.dump(idx, open(idx_fn, 'w'), separators=(',', ':'), ensure_ascii=False)
    size = sum(os.path.getsize(f) for f in glob.glob(os.path.join(ZDIR, '*.json')))
    log('cells', len(idx['cells']), 'buildings', sum(idx['cells'].values()), round(size / 1e6, 2), 'MB')


# ---------------------------------------------------------------- the list of places ----------------------------------------------
def places_list(a, cache, polys=None, stage='welt'):
    """the places inside the fine tiles with the buildings each still lacks (or got): nearest OSM place node within 1.2 km, else
    'einzeln' (farms, mills, huts in the fields and woods)"""
    from shapely.geometry import Point
    if polys is None:
        polys, st = build_dry(a, stage, cache)
    sets = tile_sets(cache)
    ext = extent(sets)
    pl = [p for p in osm_places(cache, ext) if p[1] in ('town', 'village', 'hamlet', 'suburb', 'isolated_dwelling', 'farm', 'locality',
                                                         'quarter', 'neighbourhood')]
    import collections
    cnt = collections.Counter()
    where = {}
    for r, p, sid in polys:
        c = p.representative_point()
        best, bd = None, 1200.0
        for name, kind, x, y, mun in pl:
            d = math.hypot(c.x - x, c.y - y) * (0.7 if kind in ('town', 'village') else 1.0)
            if d < bd:
                best, bd = (name, kind), d
        cnt[best or ('einzeln', '')] += 1
        if best:
            where.setdefault(best, [0, 0, 0])
            where[best][0] += c.x
            where[best][1] += c.y
            where[best][2] += 1
    rows = []
    for k, n in cnt.most_common():
        w = where.get(k)
        rows.append((k[0], k[1], n, (round(w[0] / w[2]), round(w[1] / w[2])) if w else None))
    return rows


def nearest_place(pl, x, y):
    best, bd = None, 1200.0
    for name, kind, px, py, mun in pl:
        d = math.hypot(x - px, y - py) * (0.7 if kind in ('town', 'village') else 1.0)
        if d < bd:
            best, bd = (name, kind), d
    return best or ('einzeln', '')


def report(a, cache):
    """every ETHOS building inside the tiles the game drives on (Suhl's town left out), by place: how many stood in 3D before, how many
    each stage built, how many stay out (the zones' own houses, keep-outs, roads, footprints under 4 m²) – a markdown table"""
    from shapely.geometry import Point
    from shapely.prepared import prep
    import collections
    sets = tile_sets(cache)
    ext = extent(sets)
    reg = prep(region_of('welt', cache, sets, ext))
    town = prep(suhl_town(cache)[0].buffer(5.0))
    tag = {}
    for L in cells_now().values():
        for b in L:
            tag[base_id(b['id'])] = b.get('o', 'zuvor')
    pl = [p for p in osm_places(cache, ext) if p[1] in ('town', 'village', 'hamlet', 'suburb', 'isolated_dwelling', 'farm', 'locality',
                                                         'quarter', 'neighbourhood')]
    from shapely.geometry import Polygon
    from shapely.strtree import STRtree
    ZP = PR.zone_footprints()
    ztree = STRtree(ZP)
    BOX = PR.BOX
    T = collections.defaultdict(collections.Counter)
    where = collections.defaultdict(lambda: [0.0, 0.0, 0])
    for r in W.load_ethos(a.ethos):
        pts = [W.to_model(e, n) for e, n in r['poly'][0][0]]
        cx = sum(p[0] for p in pts) / len(pts)
        cy = sum(p[1] for p in pts) / len(pts)
        c = Point(cx, cy)
        if not reg.contains(c) or town.contains(c):
            continue
        if BOX[0] + 2 < cx < BOX[2] - 2 and BOX[1] + 2 < cy < BOX[3] - 2:
            st = 'quadrat'
        else:
            st = tag.get(r['id'], 'aus')
        if st == 'aus':
            g = Polygon(pts).buffer(0)
            hits = [ZP[i] for i in ztree.query(g)]
            if hits and sum(g.intersection(o).area for o in hits) > 0.5 * max(g.area, 1e-6):
                st = 'zone'   # the zone builds it itself (Schleusingen's old town, Kloster Veßra: their OSM houses)
            elif g.area < 4.0:
                st = 'klein'
        k = nearest_place(pl, cx, cy)
        T[k][st] += 1
        T[k]['alle'] += 1
        w = where[k]
        w[0] += cx
        w[1] += cy
        w[2] += 1
    # the buildings OSM has and ETHOS not (stage osm): counted apart
    for L in cells_now().values():
        for b in L:
            if b.get('o') == 'osm':
                f = b['f']
                x, y = sum(f[0::2]) / (len(f) / 2), sum(f[1::2]) / (len(f) / 2)
                k = nearest_place(pl, x, y)
                T[k]['osm'] += 1
                w = where[k]
                if not w[2]:
                    w[0], w[1], w[2] = x, y, 1
    rows = sorted(T.items(), key=lambda kv: -(kv[1]['suhl'] + kv[1]['welt'] + kv[1]['osm'] + 0.001 * kv[1]['alle']))
    print('| Ort | Art | ETHOS-Gebäude | vorher in 3D | neu: Weg nach Suhl | neu: übrige Orte | neu aus OSM (ETHOS hat sie nicht) | '
          'nicht gebaut (klein, frei gehalten, Straße) | Mitte (x, y) |')
    print('|---|---|---|---|---|---|---|---|---|')
    tot = collections.Counter()
    for (name, kind), c in rows:
        w = where[(name, kind)]
        tot.update(c)
        print(f"| {name} | {kind or '–'} | {c['alle']} | {c['zuvor'] + c['quadrat'] + c['zone']} | {c['suhl']} | {c['welt']} | {c['osm']} | {c['aus'] + c['klein']} | "
              f"{round(w[0] / w[2])}, {round(w[1] / w[2])} |")
    print(f"| **zusammen** | | **{tot['alle']}** | **{tot['zuvor'] + tot['quadrat'] + tot['zone']}** | **{tot['suhl']}** | **{tot['welt']}** | "
          f"**{tot['osm']}** | **{tot['aus'] + tot['klein']}** | |")
    print('vorher: in den Zellen %d, im Quadrat %d, von den Orten selbst %d; nicht gebaut: unter 4 m² %d, sonst %d' %
          (tot['zuvor'], tot['quadrat'], tot['zone'], tot['klein'], tot['aus']), file=sys.stderr)


def build_dry(a, stage, cache):
    a.dry = True
    return build(a, stage, cache)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--ethos', required=True)
    ap.add_argument('--stage', choices=['suhl', 'welt', 'osm'], default='suhl')
    ap.add_argument('--cache', default='/tmp/welt-orte')
    ap.add_argument('--dry', action='store_true', help='count only, write nothing')
    ap.add_argument('--list', action='store_true', help='the places of the stage and their buildings (json on stdout)')
    ap.add_argument('--report', action='store_true', help='every building of the tiles by place: before, built by each stage, left out (markdown)')
    ap.add_argument('--no-osm', action='store_true', help='no OSM streets from Overpass (the facades then know only the roads one drives)')
    a = ap.parse_args()
    os.makedirs(a.cache, exist_ok=True)
    if a.report:
        return report(a, a.cache)
    if a.list:
        rows = places_list(a, a.cache, stage=a.stage)
        print(json.dumps(rows, ensure_ascii=False))
        return
    build(a, a.stage, a.cache)


if __name__ == '__main__':
    main()
