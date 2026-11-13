#!/usr/bin/env python3
"""suhl-bestand, deliverables 4a and 5: what OpenStreetMap holds for Suhl - buildings and their attributes inside stadt, kernstadt and
zentrum, and the street space (roads by class and their attributes, signals, crossings, lamps, stops, trees, walls, steps, bridges,
railway, waterways, parking, playgrounds, shops and amenities) -> osm_bestand.json. Counts and shares only, no object lists.

  python3 -I tools/suhl/bestand/osm_bestand.py                    # from the cached OSM API boxes (chat machine)
  python3 -I tools/suhl/bestand/osm_bestand.py --opl suhl.opl.gz --out FILE     # from the Geofabrik extract (GitHub Actions)
"""
import argparse, json, os, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sblib

ROADS = ['motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street', 'pedestrian',
         'service', 'track', 'footway', 'path', 'cycleway', 'steps', 'bridleway', 'construction', 'platform']
CAR = ('motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'unclassified', 'residential', 'living_street')


def pct(a, b):
    return round(100.0 * a / b, 1) if b else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--opl', default=None)
    ap.add_argument('--out', default=os.path.join(sblib.OUT, 'osm_bestand.json'))
    a = ap.parse_args()
    from shapely.geometry import shape, Point, LineString
    from shapely.prepared import prep

    o = sblib.load_osm(a.opl)
    fc = json.load(open(os.path.join(sblib.OUT, 'gebiete.geojson'), encoding='utf-8'))
    G = {f['properties']['id']: sblib.tf_geom(shape(f['geometry']), sblib.to_utm) for f in fc['features'] if f['properties']['art'] == 'gebiet'}
    PG = {k: prep(v) for k, v in G.items()}
    areas = ('stadt', 'kernstadt', 'zentrum')

    def where(pt):
        return [k for k in areas if PG[k].contains(pt)]

    res = {'made': sblib.now(), 'quelle': o.source, 'lizenz': '© OpenStreetMap-Mitwirkende, ODbL 1.0',
           'elemente': {'nodes': len(o.nodes), 'ways': len(o.ways), 'relations': len(o.rels)}, 'gebaeude': {}, 'strassenraum': {}}

    # ---------------- buildings
    B = {k: Counter() for k in areas}
    btype = {k: Counter() for k in areas}
    roofs = {k: Counter() for k in areas}
    tall = []
    for kind, i, t, p in o.areas(lambda t: 'building' in t and t['building'] != 'no'):
        rp = p.representative_point()
        for k in where(rp):
            c = B[k]
            c['anzahl'] += 1
            c['grundflaeche_m2'] += p.area
            c['ab_40_m2'] += p.area >= 40
            c['levels'] += 'building:levels' in t
            c['height'] += 'height' in t
            c['levels_oder_height'] += ('building:levels' in t or 'height' in t)
            c['roof_shape'] += 'roof:shape' in t
            c['roof_levels'] += 'roof:levels' in t
            c['dachfarbe_oder_material'] += ('roof:colour' in t or 'roof:material' in t)
            c['fassade_farbe_oder_material'] += ('building:colour' in t or 'building:material' in t)
            c['start_date'] += ('start_date' in t or 'construction_date' in t or 'year_of_construction' in t)
            c['name'] += 'name' in t
            c['hausnummer'] += 'addr:housenumber' in t
            c['typ_nicht_yes'] += t['building'] != 'yes'
            c['wikidata_oder_wikipedia'] += ('wikidata' in t or 'wikipedia' in t)
            c['denkmal'] += ('heritage' in t or t.get('historic') or 'ref:denkmal' in str(t)) is not None and ('heritage' in t or 'historic' in t)
            btype[k][t['building']] += 1
            if 'roof:shape' in t:
                roofs[k][t['roof:shape']] += 1
        try:
            h = float(str(t.get('height', '')).replace('m', '').replace(',', '.').strip() or 0)
        except ValueError:
            h = 0
        try:
            lv = float(str(t.get('building:levels', '')).split(';')[0].replace(',', '.') or 0)
        except ValueError:
            lv = 0
        if (h >= 25 or lv >= 9) and PG['stadt'].contains(rp):
            lon, lat = sblib.to_wgs(rp.x, rp.y)
            tall.append({'osm': ('way/' if kind == 'w' else 'relation/') + str(i), 'name': t.get('name'), 'building': t['building'],
                         'height': t.get('height'), 'levels': t.get('building:levels'), 'lat': round(lat, 6), 'lon': round(lon, 6)})
    parts = Counter()
    for kind, i, t, p in o.areas(lambda t: 'building:part' in t and t['building:part'] != 'no'):
        for k in where(p.representative_point()):
            parts[k] += 1
    addr_nodes = Counter()
    for i, t in o.ntags.items():
        if 'addr:housenumber' in t and i in o.nodes:
            for k in where(Point(o.nodes[i])):
                addr_nodes[k] += 1
    for k in areas:
        c, n = B[k], B[k]['anzahl']
        res['gebaeude'][k] = {
            'anzahl': n, 'ab_40_m2': c['ab_40_m2'], 'grundflaeche_ha': round(c['grundflaeche_m2'] / 1e4, 1), 'gebaeudeteile_building_part': parts[k],
            'adressknoten_addr_housenumber': addr_nodes[k],
            'anteil_prozent': {f: pct(c[f], n) for f in ('levels', 'height', 'levels_oder_height', 'roof_shape', 'roof_levels', 'dachfarbe_oder_material',
                                                         'fassade_farbe_oder_material', 'start_date', 'name', 'hausnummer', 'typ_nicht_yes',
                                                         'wikidata_oder_wikipedia', 'denkmal')},
            'anzahl_mit': {f: c[f] for f in ('levels', 'height', 'roof_shape', 'dachfarbe_oder_material', 'fassade_farbe_oder_material', 'start_date', 'name', 'hausnummer')},
            'building_werte': dict(btype[k].most_common(14)), 'roof_shape_werte': dict(roofs[k].most_common(8))}
    res['gebaeude']['hoch_laut_osm_ab_25m_oder_9_geschosse'] = sorted(tall, key=lambda x: -(float(x['levels'] or 0) if str(x['levels'] or '').replace('.', '').isdigit() else 0))

    # ---------------- street space, per area
    def clip_len(line, k):
        if PG[k].contains(line):
            return line.length
        if not PG[k].intersects(line):
            return 0.0
        return G[k].intersection(line).length

    for k in areas:
        km, attr = Counter(), {c: Counter() for c in ('auto', 'alle')}
        misc, names_water, culvert = Counter(), Counter(), 0.0
        bridges, tunnels = Counter(), Counter()
        for w, (nd, t) in o.ways.items():
            if not t:
                continue
            c = o.line(w)
            if not c or len(c) < 2:
                continue
            ln = LineString(c)
            hw = t.get('highway')
            if hw or t.get('railway') or t.get('waterway') or t.get('barrier') or t.get('natural') == 'tree_row':
                L = clip_len(ln, k)
                if L <= 0:
                    continue
            else:
                continue
            if hw:
                cls = hw[:-5] if hw.endswith('_link') else hw
                cls = cls if cls in ROADS else 'sonstige'
                if t.get('area') == 'yes':
                    misc['highway_flaechen'] += 1
                    continue
                km[cls] += L
                if cls == 'footway' and t.get('footway') == 'sidewalk':
                    misc['gehweg_als_eigener_weg_m'] += L
                if cls == 'footway' and t.get('footway') == 'crossing':
                    misc['querung_als_eigener_weg_m'] += L
                if cls in CAR:
                    A = attr['auto']
                    A['m'] += L
                    for f, has in (('lanes', 'lanes' in t), ('surface', 'surface' in t), ('maxspeed', 'maxspeed' in t),
                                   ('sidewalk', any(x.startswith('sidewalk') for x in t)), ('lit', 'lit' in t),
                                   ('cycleway', any(x.startswith('cycleway') for x in t)), ('name', 'name' in t), ('width', 'width' in t),
                                   ('oneway', 'oneway' in t), ('parking', any(x.startswith('parking:') for x in t)),
                                   ('smoothness', 'smoothness' in t), ('incline', 'incline' in t)):
                        A[f] += L if has else 0
                if t.get('bridge') and t.get('bridge') != 'no':
                    bridges['strasse_anzahl'] += 1
                    bridges['strasse_m'] += L
                if t.get('tunnel') and t.get('tunnel') != 'no':
                    tunnels['strasse_anzahl'] += 1
                    tunnels['strasse_m'] += L
                if cls == 'steps':
                    misc['treppen_anzahl'] += 1
            if t.get('railway') in ('rail', 'light_rail', 'narrow_gauge', 'disused', 'abandoned', 'tram'):
                misc['bahn_%s_m' % t['railway']] += L
                if t.get('bridge') and t.get('bridge') != 'no':
                    bridges['bahn_anzahl'] += 1
                    bridges['bahn_m'] += L
                if t.get('tunnel') and t.get('tunnel') != 'no':
                    tunnels['bahn_anzahl'] += 1
                    tunnels['bahn_m'] += L
            if t.get('waterway') in ('river', 'stream', 'ditch', 'canal', 'drain'):
                misc['gewaesser_%s_m' % t['waterway']] += L
                names_water[t.get('name', '(ohne Namen)')] += L
                if t.get('tunnel') in ('culvert', 'yes', 'flooded') or t.get('covered') == 'yes':
                    culvert += L
            if t.get('barrier') in ('retaining_wall', 'wall', 'fence', 'hedge', 'guard_rail', 'city_wall', 'kerb'):
                misc['barriere_%s_m' % t['barrier']] += L
                misc['barriere_%s_anzahl' % t['barrier']] += 1
            if t.get('natural') == 'tree_row':
                misc['baumreihen_m'] += L
                misc['baumreihen_anzahl'] += 1
        # nodes
        nc, crossing, shops, amen, tour = Counter(), Counter(), Counter(), Counter(), Counter()
        for i, t in o.ntags.items():
            if i not in o.nodes or not PG[k].contains(Point(o.nodes[i])):
                continue
            hw = t.get('highway')
            if hw == 'traffic_signals':
                nc['ampeln_knoten'] += 1
            if hw == 'crossing' or t.get('railway') == 'crossing':
                nc['querungen'] += 1
                crossing[t.get('crossing', t.get('crossing:markings', '(ohne Angabe)'))] += 1
                nc['querungen_mit_tactile_paving'] += 'tactile_paving' in t
                nc['querungen_mit_kerb'] += 'kerb' in t
            if hw == 'street_lamp':
                nc['strassenlaternen'] += 1
            if hw == 'bus_stop':
                nc['bushaltestellen_bus_stop'] += 1
            if t.get('public_transport') == 'platform':
                nc['bussteige_platform_knoten'] += 1
            if t.get('public_transport') == 'stop_position':
                nc['haltepunkte_stop_position'] += 1
            if t.get('natural') == 'tree':
                nc['einzelbaeume'] += 1
                nc['einzelbaeume_mit_art'] += ('species' in t or 'genus' in t or 'taxon' in t or 'leaf_type' in t)
            if t.get('railway') == 'level_crossing':
                nc['bahnuebergaenge'] += 1
            if t.get('railway') in ('station', 'halt'):
                nc['bahnhoefe_haltepunkte'] += 1
            if hw in ('give_way', 'stop'):
                nc['vorfahrt_stop_schilder'] += 1
            if t.get('traffic_sign'):
                nc['verkehrszeichen'] += 1
            if hw == 'mini_roundabout' or hw == 'turning_circle':
                nc['wendekreise_minikreisel'] += 1
            if t.get('amenity') in ('bench', 'waste_basket', 'bicycle_parking', 'recycling', 'post_box', 'telephone', 'vending_machine', 'fountain', 'clock'):
                nc['moebel_' + t['amenity']] += 1
            if t.get('barrier') in ('bollard', 'gate', 'lift_gate'):
                nc['barriere_' + t['barrier']] += 1
            if t.get('emergency') == 'fire_hydrant':
                nc['hydranten'] += 1
            if t.get('man_made') in ('manhole', 'street_cabinet', 'surveillance'):
                nc['man_made_' + t['man_made']] += 1
            if t.get('advertising'):
                nc['werbung'] += 1
            if 'name' in t:
                if t.get('shop'):
                    shops[t['shop']] += 1
                if t.get('amenity'):
                    amen[t['amenity']] += 1
                if t.get('tourism'):
                    tour[t['tourism']] += 1
        # areas: parking, playgrounds, pitches, named shops/amenities mapped as areas
        ac = Counter()
        for kind, i, t, p in o.areas(lambda t: t.get('amenity') == 'parking' or t.get('leisure') in ('playground', 'pitch', 'park', 'garden')
                                     or ('name' in t and (t.get('shop') or t.get('amenity') or t.get('tourism'))) or t.get('landuse') == 'allotments'):
            if not PG[k].contains(p.representative_point()):
                continue
            if t.get('amenity') == 'parking':
                ac['parkplaetze_flaechen'] += 1
                ac['parkplaetze_m2'] += p.area
                ac['parkplaetze_mit_capacity'] += 'capacity' in t
            if t.get('leisure') in ('playground', 'pitch', 'park', 'garden'):
                ac[{'playground': 'spielplaetze', 'pitch': 'sportfelder', 'park': 'parks', 'garden': 'gaerten'}[t['leisure']]] += 1
            if t.get('landuse') == 'allotments':
                ac['kleingartenanlagen'] += 1
            if 'name' in t:
                if t.get('shop'):
                    shops[t['shop']] += 1
                if t.get('amenity') and t.get('amenity') != 'parking':
                    amen[t['amenity']] += 1
                if t.get('tourism'):
                    tour[t['tourism']] += 1
        for i, t in o.ntags.items():
            if t.get('amenity') == 'parking' and i in o.nodes and PG[k].contains(Point(o.nodes[i])):
                ac['parkplaetze_knoten'] += 1
            if t.get('leisure') == 'playground' and i in o.nodes and PG[k].contains(Point(o.nodes[i])):
                ac['spielplaetze'] += 1
        pw = sum(1 for w, (nd, t) in o.ways.items() if t and t.get('public_transport') == 'platform' and o.line(w)
                 and PG[k].contains(Point(o.line(w)[0])))
        A = attr['auto']
        res['strassenraum'][k] = {
            'highway_km': {c: round(v / 1000, 2) for c, v in sorted(km.items(), key=lambda kv: -kv[1])},
            'highway_km_gesamt': round(sum(km.values()) / 1000, 1),
            'fahrstrassen_km': round(A['m'] / 1000, 1),
            'fahrstrassen_klassen': list(CAR),
            'fahrstrassen_anteil_prozent_nach_laenge': {f: pct(A[f], A['m']) for f in ('name', 'surface', 'maxspeed', 'lanes', 'lit', 'sidewalk', 'cycleway',
                                                                                    'oneway', 'width', 'parking', 'smoothness', 'incline')},
            'gehweg_als_eigener_weg_km': round(misc['gehweg_als_eigener_weg_m'] / 1000, 2),
            'querung_als_eigener_weg_km': round(misc['querung_als_eigener_weg_m'] / 1000, 2),
            'knoten': dict(sorted(nc.items())), 'querungen_nach_art': dict(crossing.most_common(10)),
            'bussteige_platform_wege': pw,
            'treppen_anzahl': misc['treppen_anzahl'], 'treppen_km': round(km['steps'] / 1000, 2),
            'bruecken': {a_: (round(v / 1000, 2) if a_.endswith('_m') else v) for a_, v in bridges.items()},
            'tunnel': {a_: (round(v / 1000, 2) if a_.endswith('_m') else v) for a_, v in tunnels.items()},
            'bahn_km': {a_[5:-2]: round(v / 1000, 2) for a_, v in misc.items() if a_.startswith('bahn_')},
            'gewaesser_km': {a_[10:-2]: round(v / 1000, 2) for a_, v in misc.items() if a_.startswith('gewaesser_')},
            'gewaesser_namen_km': {n: round(v / 1000, 2) for n, v in names_water.most_common(12)},
            'gewaesser_verrohrt_km': round(culvert / 1000, 2),
            'barrieren': {a_[9:]: (round(v / 1000, 2) if a_.endswith('_m') else v) for a_, v in sorted(misc.items()) if a_.startswith('barriere_')},
            'baumreihen': {'anzahl': misc['baumreihen_anzahl'], 'km': round(misc['baumreihen_m'] / 1000, 2)},
            'flaechen': {a_: (round(v / 1e4, 1) if a_.endswith('_m2') else v) for a_, v in sorted(ac.items())},
            'geschaefte_mit_namen': {'anzahl': sum(shops.values()), 'nach_art': dict(shops.most_common(20))},
            'einrichtungen_mit_namen': {'anzahl': sum(amen.values()), 'nach_art': dict(amen.most_common(24))},
            'tourismus_mit_namen': {'anzahl': sum(tour.values()), 'nach_art': dict(tour.most_common(10))}}
    sblib.write_json(a.out, res, indent=1)
    sblib.log('written', a.out)
    for k in areas:
        g, s = res['gebaeude'][k], res['strassenraum'][k]
        sblib.log(k, 'buildings', g['anzahl'], g['anteil_prozent'], '| highway km', s['highway_km_gesamt'], 'car roads km', s['fahrstrassen_km'],
                  s['fahrstrassen_anteil_prozent_nach_laenge'])


if __name__ == '__main__':
    main()
