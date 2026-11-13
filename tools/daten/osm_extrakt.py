#!/usr/bin/env python3
"""OpenStreetMap extract for our places: every place of interest with its real name, the entrances (entrance=*), the passages under
buildings (tunnel=building_passage), the courtyards of the building blocks and whether OSM knows a way into them, plus the building
attributes (levels, roof shape, height, address) and how complete they are.

  python3 -I tools/daten/osm_extrakt.py CACHE_DIR OUT_DIR

Data: the OSM API (https://api.openstreetmap.org/api/0.6/map, small tiles, cached in CACHE_DIR, one call a second) – no Geofabrik or
Overpass needed. © OpenStreetMap contributors, ODbL 1.0. No phone numbers or e-mail addresses are kept (only business data: name, brand,
type, address, opening hours, website). Output (OUT_DIR): pois.csv, entrances.csv, passages.csv, hofzugaenge.csv, gebaeude.csv,
windanlagen.csv, stats.json.  Needs pyproj and shapely."""
import csv, json, math, os, sys, time, urllib.request, urllib.error
import xml.etree.ElementTree as ET
from pyproj import Transformer
from shapely.geometry import Point, LineString, Polygon, MultiPolygon
from shapely.ops import unary_union, polygonize
from shapely.strtree import STRtree

UA = 'pavillon-ratscher daten-katalog/1.0 (open-data research for a hobby 3D map; github.com/mynametouse/pavillon-ratscher)'
# the places (S, W, N, E): built-up areas with a margin – the same boxes as tools/welt-dinge/osm_parkplaetze.py, Ratscher with Geisenhoehn
AREAS = {
    'ratscher': (50.49082, 10.75362, 50.50093, 10.77794),
    'schleusingen': (50.49684, 10.72576, 50.52261, 10.77567),
    'vessra': (50.48815, 10.63301, 50.49882, 10.65245),
}
TILE = 0.0125
TR = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
TRI = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)


def fetch_tile(cache, s, w, n, e):
    fn = os.path.join(cache, f'osm_{s:.5f}_{w:.5f}_{n:.5f}_{e:.5f}.xml')
    if os.path.exists(fn):
        return fn
    url = f'https://api.openstreetmap.org/api/0.6/map?bbox={w:.5f},{s:.5f},{e:.5f},{n:.5f}'
    for attempt in range(4):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=120) as r:
                data = r.read()
            open(fn, 'wb').write(data)
            time.sleep(1.2)
            return fn
        except urllib.error.HTTPError as ex:
            if ex.code == 400:  # too many nodes: split in four
                return None
            time.sleep(5 * (attempt + 1))
        except Exception:
            time.sleep(5 * (attempt + 1))
    raise RuntimeError('OSM API failed for ' + url)


def tiles(box, step):
    s, w, n, e = box
    out = []
    la = s
    while la < n:
        lo = w
        while lo < e:
            out.append((la, lo, min(la + step, n), min(lo + step, e)))
            lo += step
        la += step
    return out


def load(cache):
    nodes, ways, rels = {}, {}, {}
    for area, box in AREAS.items():
        todo = tiles(box, TILE)
        while todo:
            s, w, n, e = todo.pop()
            fn = fetch_tile(cache, s, w, n, e)
            if fn is None:
                h = TILE / 2
                todo += tiles((s, w, n, e), (n - s) / 2 if (n - s) > 0.002 else h)
                continue
            for _, el in ET.iterparse(fn):
                if el.tag == 'node':
                    t = {x.get('k'): x.get('v') for x in el.findall('tag')}
                    nodes[el.get('id')] = (float(el.get('lat')), float(el.get('lon')), t, (el.get('timestamp') or '')[:10])
                elif el.tag == 'way':
                    ways[el.get('id')] = ([x.get('ref') for x in el.findall('nd')], {x.get('k'): x.get('v') for x in el.findall('tag')},
                                          (el.get('timestamp') or '')[:10])
                elif el.tag == 'relation':
                    rels[el.get('id')] = ([(m.get('type'), m.get('ref'), m.get('role')) for m in el.findall('member')],
                                          {x.get('k'): x.get('v') for x in el.findall('tag')}, (el.get('timestamp') or '')[:10])
                if el.tag in ('node', 'way', 'relation'):
                    el.clear()
    return nodes, ways, rels


def xy(lat, lon):
    return TR.transform(lon, lat)


def way_coords(ways, nodes, wid):
    refs = ways[wid][0]
    return [xy(nodes[r][0], nodes[r][1]) for r in refs if r in nodes]


NOT_AREA = {'highway', 'railway', 'waterway', 'barrier', 'power', 'natural'}
AMEN_SKIP = {'parking', 'parking_space', 'parking_entrance', 'bench', 'waste_basket', 'bicycle_parking', 'shelter', 'grit_bin', 'clock', 'post_box',
             'drinking_water', 'toilets', 'waste_disposal', 'recycling', 'vending_machine', 'fire_hydrant', 'bbq', 'give_box', 'hunting_stand',
             'lounger', 'kneipp_water_cure', 'water_point', 'device_charging_station', 'letter_box', 'telephone', 'bicycle_repair_station', 'dog_toilet'}
LEIS = {'sports_centre', 'swimming_pool', 'stadium', 'fitness_centre', 'golf_course', 'sports_hall', 'garden', 'miniature_golf', 'water_park'}
TOUR = {'attraction', 'museum', 'hotel', 'guest_house', 'camp_site', 'apartment', 'gallery', 'viewpoint', 'hostel', 'motel', 'chalet', 'caravan_site',
        'zoo', 'theme_park', 'artwork'}


def poi_kind(t):
    if t.get('highway') or t.get('railway') == 'rail':
        return None
    if 'shop' in t and t['shop'] not in ('no', 'vacant'):
        return 'shop=' + t['shop']
    if t.get('shop') == 'vacant' or t.get('disused:shop'):
        return 'leer=' + (t.get('disused:shop') or 'shop')
    if t.get('amenity') and t['amenity'] not in AMEN_SKIP:
        return 'amenity=' + t['amenity']
    if t.get('tourism') in TOUR:
        return 'tourism=' + t['tourism']
    if 'office' in t:
        return 'office=' + t['office']
    if 'craft' in t:
        return 'craft=' + t['craft']
    if 'healthcare' in t:
        return 'healthcare=' + t['healthcare']
    if t.get('leisure') in LEIS:
        return 'leisure=' + t['leisure']
    if 'historic' in t and (t.get('name') or t.get('heritage')):
        return 'historic=' + t['historic']
    if t.get('man_made') in ('works', 'water_tower', 'windmill', 'watermill', 'chimney', 'silo', 'wastewater_plant', 'water_works') and (t.get('name') or t['man_made'] == 'works'):
        return 'man_made=' + t['man_made']
    if 'industrial' in t:
        return 'industrial=' + t['industrial']
    if t.get('landuse') == 'farmyard' and t.get('name'):
        return 'landuse=farmyard'
    if t.get('club'):
        return 'club=' + t['club']
    if t.get('building') in ('farm', 'church', 'chapel', 'cathedral', 'school', 'kindergarten', 'hospital', 'fire_station', 'train_station', 'civic', 'public') and t.get('name'):
        return 'building=' + t['building']
    return None


def build_geoms(nodes, ways, rels):
    """element key -> (kind, tags, shapely geometry in UTM, ts). Closed ways of area-like objects are polygons, others lines, nodes points."""
    feats = {}
    in_rel_ways = set()
    for rid, (mem, t, ts) in rels.items():
        if t.get('type') != 'multipolygon':
            continue
        outs = [m[1] for m in mem if m[0] == 'way' and m[1] in ways and m[2] in ('outer', '')]
        ins = [m[1] for m in mem if m[0] == 'way' and m[1] in ways and m[2] == 'inner']
        if not outs:
            continue
        try:
            of = unary_union([LineString(way_coords(ways, nodes, w)) for w in outs if len(way_coords(ways, nodes, w)) > 1])
            op = list(polygonize(of))
            if not op:
                continue
            geom = unary_union(op)
            if ins:
                inf = unary_union([LineString(way_coords(ways, nodes, w)) for w in ins if len(way_coords(ways, nodes, w)) > 1])
                ip = list(polygonize(inf))
                if ip:
                    geom = geom.difference(unary_union(ip))
        except Exception:
            continue
        feats['r' + rid] = ('relation', t, geom, ts)
        for w in outs + ins:
            if not ways[w][1].get('building') and not any(k in ways[w][1] for k in ('amenity', 'shop')):
                in_rel_ways.add(w)  # untagged parts of a multipolygon are not objects of their own
    for wid, (refs, t, ts) in ways.items():
        if wid in in_rel_ways and not t:
            continue
        c = way_coords(ways, nodes, wid)
        if len(c) < 2:
            continue
        closed = refs[0] == refs[-1] and len(c) >= 4
        isarea = closed and not (set(t) & NOT_AREA) and t.get('area') != 'no' and (
            any(k in t for k in ('building', 'amenity', 'shop', 'leisure', 'landuse', 'tourism', 'office', 'craft', 'historic', 'man_made', 'healthcare', 'industrial')) or t.get('area') == 'yes')
        if isarea:
            p = Polygon(c)
            if not p.is_valid:
                p = p.buffer(0)
            if p.is_empty:
                continue
            feats['w' + wid] = ('way', t, p, ts)
        else:
            feats['w' + wid] = ('way', t, LineString(c), ts)
    for nid, (lat, lon, t, ts) in nodes.items():
        if t:
            feats['n' + nid] = ('node', t, Point(*xy(lat, lon)), ts)
    return feats


def latlon(g):
    p = g.centroid if not isinstance(g, Point) else g
    lon, lat = TRI.transform(p.x, p.y)
    return round(lat, 6), round(lon, 6)


def area_of(box_name):
    s, w, n, e = AREAS[box_name]
    return s, w, n, e


def in_area(lat, lon):
    for k, (s, w, n, e) in AREAS.items():
        if s <= lat <= n and w <= lon <= e:
            return k
    return None


def addr(t):
    return (t.get('addr:street', ''), t.get('addr:housenumber', ''), t.get('addr:postcode', ''), t.get('addr:city', ''))


def main():
    cache, out = sys.argv[1], sys.argv[2]
    os.makedirs(cache, exist_ok=True)
    os.makedirs(out, exist_ok=True)
    nodes, ways, rels = load(cache)
    print('elements', len(nodes), len(ways), len(rels), flush=True)
    feats = build_geoms(nodes, ways, rels)
    newest = max([v[3] for v in feats.values() if v[3]] or [''])
    # --- buildings --------------------------------------------------------------------------------------------------------------------------
    bld = {k: v for k, v in feats.items() if 'building' in v[1] and isinstance(v[2], (Polygon, MultiPolygon)) and v[1]['building'] not in ('roof', 'no')}
    bkeys = list(bld)
    bgeoms = [bld[k][2] for k in bkeys]
    btree = STRtree(bgeoms)
    # --- entrances --------------------------------------------------------------------------------------------------------------------------
    ent_rows, ent_pts = [], []
    way_nodes = set()
    for k in bkeys:
        if k.startswith('w'):
            way_nodes.update(ways[k[1:]][0])
    for k, (kind, t, g, ts) in feats.items():
        if kind == 'node' and ('entrance' in t or (t.get('door') and t.get('building') is None and 'shop' not in t)):
            lat, lon = latlon(g)
            area = in_area(lat, lon)
            if not area:
                continue
            host, hd = '', ''
            for i in btree.query(g.buffer(6)):
                d = bgeoms[i].distance(g)
                if d <= 6 and (hd == '' or d < hd):
                    host, hd = bkeys[i], d
            ht = bld[host][1] if host else {}
            ent_rows.append({'ort': area, 'id': k, 'lat': lat, 'lon': lon, 'entrance': t.get('entrance', ''), 'door': t.get('door', ''), 'access': t.get('access', ''),
                             'strasse': t.get('addr:street', ''), 'hausnr': t.get('addr:housenumber', ''), 'name': t.get('name', ''), 'ebene': t.get('level', ''),
                             'rollstuhl': t.get('wheelchair', ''), 'an_gebaeudekante': 'ja' if k[1:] in way_nodes else 'nein',
                             'gebaeude': host, 'gebaeude_art': ht.get('building', ''), 'gebaeude_adresse': ' '.join(x for x in addr(ht)[:2] if x),
                             'abstand_m': round(hd, 1) if host else '', 'osm_stand': ts})
            ent_pts.append(g)
    ent_tree = STRtree(ent_pts) if ent_pts else None
    # --- passages ---------------------------------------------------------------------------------------------------------------------------
    pas_rows, pas_geoms = [], []
    for k, (kind, t, g, ts) in feats.items():
        if kind == 'way' and (t.get('tunnel') == 'building_passage' or (t.get('covered') == 'yes' and t.get('highway') in ('footway', 'service', 'path', 'pedestrian'))):
            lat, lon = latlon(g)
            area = in_area(lat, lon)
            if not area:
                continue
            pas_rows.append({'ort': area, 'id': k, 'lat': lat, 'lon': lon, 'highway': t.get('highway', ''), 'tunnel': t.get('tunnel', ''), 'covered': t.get('covered', ''),
                             'name': t.get('name', ''), 'access': t.get('access', ''), 'foot': t.get('foot', ''), 'vehicle': t.get('vehicle', '') or t.get('motor_vehicle', ''),
                             'surface': t.get('surface', ''), 'breite': t.get('width', ''), 'hoehe': t.get('maxheight', ''), 'laenge_m': round(g.length, 1), 'osm_stand': ts})
            pas_geoms.append(g)
    # --- places of interest -----------------------------------------------------------------------------------------------------------------
    parks = [(k, v) for k, v in feats.items() if v[1].get('amenity') == 'parking' and v[1].get('access') not in ('private',)]
    pgeoms = [v[2] for _, v in parks]
    ptree = STRtree(pgeoms) if pgeoms else None
    poi_rows = []
    seen = set()
    for k, (kind, t, g, ts) in feats.items():
        pk = poi_kind(t)
        if not pk:
            continue
        if kind == 'way' and isinstance(g, LineString):
            continue
        if kind == 'node' and k[1:] in way_nodes and not t.get('name') and not t.get('shop'):
            pass
        lat, lon = latlon(g)
        area = in_area(lat, lon)
        if not area:
            continue
        # entrances on or next to the object (outline or point), parking close by
        ne = 0
        if ent_tree is not None:
            ne = sum(1 for i in ent_tree.query(g.buffer(25)) if ent_pts[i].distance(g) <= 25)
        # a shop mapped as a point inside a building: the building around it
        host = ''
        if isinstance(g, Point):
            for i in btree.query(g):
                if bgeoms[i].contains(g):
                    host = bkeys[i]
                    break
        near_park = []
        if ptree is not None:
            for i in ptree.query(g.buffer(120)):
                d = pgeoms[i].distance(g)
                if d <= 120:
                    pt = parks[i][1][1]
                    near_park.append((d, f"{parks[i][0]}{'(' + pt['name'] + ')' if pt.get('name') else ''}"))
        near_park.sort()
        ht = bld[host][1] if host else (t if 'building' in t else {})
        ad = addr(t) if t.get('addr:street') or t.get('addr:housenumber') else addr(ht)
        poi_rows.append({'ort': area, 'art': pk, 'name': t.get('name', ''), 'marke': t.get('brand', ''), 'betreiber': t.get('operator', ''), 'strasse': ad[0], 'hausnr': ad[1], 'plz': ad[2],
                         'stadt': ad[3], 'oeffnungszeiten': t.get('opening_hours', ''), 'web': t.get('website', '') or t.get('contact:website', ''), 'wikidata': t.get('wikidata', '') or t.get('brand:wikidata', ''),
                         'gebaeude': t.get('building', '') or ht.get('building', ''), 'etagen': t.get('building:levels', '') or ht.get('building:levels', ''), 'ebene': t.get('level', ''),
                         'flaeche_m2': round(g.area) if isinstance(g, (Polygon, MultiPolygon)) else '', 'drive_through': t.get('drive_through', ''), 'rollstuhl': t.get('wheelchair', ''),
                         'eingaenge_25m': ne, 'parkplaetze_120m': '; '.join(p[1] for p in near_park[:3]), 'denkmal': t.get('heritage', '') or ('ja' if t.get('historic') else ''),
                         'lat': lat, 'lon': lon, 'osm': k, 'osm_stand': ts})
    poi_rows.sort(key=lambda r: (r['ort'], r['art'], r['name']))
    # --- wind turbines in or near the areas (for the wind-priority-area question) ---------------------------------------------------------------
    wind_rows = []
    for k, (kind, t, g, ts) in feats.items():
        if kind == 'node' and t.get('power') == 'generator' and t.get('generator:source') == 'wind':
            lat, lon = latlon(g)
            wind_rows.append({'id': k, 'lat': lat, 'lon': lon, 'name': t.get('name', ''), 'leistung': t.get('generator:output:electricity', ''), 'betreiber': t.get('operator', ''), 'osm_stand': ts})
    # --- courtyards -------------------------------------------------------------------------------------------------------------------------
    cy_rows = []
    main = [bld[k][2] for k in bkeys if bld[k][1]['building'] not in ('garage', 'garages', 'carport', 'shed', 'hut', 'greenhouse', 'service', 'roof', 'kiosk', 'container')]
    uni = unary_union([g.buffer(1.0) for g in main])
    holes = []
    for poly in (uni.geoms if hasattr(uni, 'geoms') else [uni]):
        for ring in poly.interiors:
            h = Polygon(ring)
            if 40 <= h.area <= 4000:
                holes.append(h)
    foot_ways = [(k, v) for k, v in feats.items() if v[0] == 'way' and isinstance(v[2], LineString) and v[1].get('highway') in ('footway', 'path', 'service', 'track', 'pedestrian', 'steps', 'cycleway', 'living_street', 'residential', 'unclassified')
                 and v[1].get('tunnel') != 'building_passage']
    for h in holes:
        lat, lon = latlon(h)
        area = in_area(lat, lon)
        if not area:
            continue
        acc = []
        for g_i, g in enumerate(pas_geoms):
            if g.distance(h) <= 4:
                acc.append('Durchgang ' + pas_rows[g_i]['id'])
        for i, g in enumerate(ent_pts):
            if g.distance(h) <= 6:
                acc.append('Tür ' + ent_rows[i]['id'])
        for k, v in foot_ways:
            if v[2].intersects(h):
                acc.append('Weg ' + k)
        around = []
        for i in btree.query(h.buffer(3)):
            tt = bld[bkeys[i]][1]
            if tt.get('addr:street') and bgeoms[i].distance(h) <= 3:
                around.append(f"{tt['addr:street']} {tt.get('addr:housenumber', '')}".strip())
        around = sorted(set(around))
        cy_rows.append({'ort': area, 'lat': lat, 'lon': lon, 'flaeche_m2': round(h.area), 'zugang_in_osm': 'ja' if acc else 'nein', 'zugaenge': '; '.join(acc[:6]),
                        'anschriften_ringsum': '; '.join(around[:6])})
    cy_rows.sort(key=lambda r: (r['ort'], r['zugang_in_osm'], -r['flaeche_m2']))
    # --- building attributes ----------------------------------------------------------------------------------------------------------------
    brows, stats = [], {}
    for k in bkeys:
        _, t, g, ts = bld[k]
        lat, lon = latlon(g)
        area = in_area(lat, lon)
        if not area:
            continue
        a = addr(t)
        brows.append({'ort': area, 'id': k, 'building': t['building'], 'etagen': t.get('building:levels', ''), 'dachgeschoss': t.get('roof:levels', ''), 'dachform': t.get('roof:shape', ''),
                      'hoehe': t.get('height', ''), 'dachhoehe': t.get('roof:height', ''), 'material': t.get('building:material', ''), 'fassade_farbe': t.get('building:colour', ''),
                      'dach_farbe': t.get('roof:colour', ''), 'dach_material': t.get('roof:material', ''), 'baujahr': t.get('start_date', ''), 'name': t.get('name', ''), 'strasse': a[0], 'hausnr': a[1],
                      'nutzung': poi_kind(t) or '', 'denkmal': t.get('heritage', ''), 'flaeche_m2': round(g.area), 'lat': lat, 'lon': lon, 'osm_stand': ts})
    for area in AREAS:
        rs = [r for r in brows if r['ort'] == area]
        n = len(rs) or 1
        stats[area] = {'gebaeude': len(rs), 'mit_etagen': sum(1 for r in rs if r['etagen']), 'mit_dachform': sum(1 for r in rs if r['dachform']), 'mit_hoehe': sum(1 for r in rs if r['hoehe']),
                       'mit_adresse': sum(1 for r in rs if r['hausnr']), 'mit_baujahr': sum(1 for r in rs if r['baujahr']), 'mit_dachfarbe': sum(1 for r in rs if r['dach_farbe']),
                       'mit_fassadenmaterial_oder_farbe': sum(1 for r in rs if r['material'] or r['fassade_farbe']),
                       'pois': sum(1 for r in poi_rows if r['ort'] == area), 'pois_mit_oeffnungszeiten': sum(1 for r in poi_rows if r['ort'] == area and r['oeffnungszeiten']),
                       'pois_mit_eingang_25m': sum(1 for r in poi_rows if r['ort'] == area and r['eingaenge_25m']), 'eingaenge': sum(1 for r in ent_rows if r['ort'] == area),
                       'eingaenge_an_adresse': sum(1 for r in ent_rows if r['ort'] == area and r['hausnr']), 'durchgaenge': sum(1 for r in pas_rows if r['ort'] == area),
                       'hoefe': sum(1 for r in cy_rows if r['ort'] == area), 'hoefe_ohne_zugang_in_osm': sum(1 for r in cy_rows if r['ort'] == area and r['zugang_in_osm'] == 'nein')}
        del n
    stats['_meta'] = {'quelle': '© OpenStreetMap-Mitwirkende, ODbL 1.0 (OSM-API, Abruf %s)' % time.strftime('%d.%m.%Y'), 'neuester_objektstand': newest,
                      'elemente': {'nodes': len(nodes), 'ways': len(ways), 'relations': len(rels)}}

    def wr(name, rows):
        if not rows:
            open(os.path.join(out, name), 'w').write('')
            return
        with open(os.path.join(out, name), 'w', newline='', encoding='utf-8') as f:
            wtr = csv.DictWriter(f, fieldnames=list(rows[0].keys()), delimiter=';')
            wtr.writeheader()
            wtr.writerows(rows)
    wr('pois.csv', poi_rows)
    wr('entrances.csv', ent_rows)
    wr('passages.csv', pas_rows)
    wr('hofzugaenge.csv', cy_rows)
    wr('gebaeude.csv', brows)
    wr('windanlagen.csv', wind_rows)
    json.dump(stats, open(os.path.join(out, 'stats.json'), 'w'), ensure_ascii=False, indent=1)
    print(json.dumps(stats, ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
