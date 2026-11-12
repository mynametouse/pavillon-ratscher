#!/usr/bin/env python3
"""suhl-bestand, deliverable 1: the areas of the Suhl plan -> tools/suhl/out/bestand/gebiete.geojson (EPSG:4326; every area carries its
bounding box in UTM 32N km).

  stadt      the municipal boundary, OSM relation 62450 (kreisfreie Stadt Suhl), assembled from relation/62450/full of the OSM API
  kernstadt  the contiguous built-up area around the centre. Rule: OSM buildings (building=*, footprint >= 40 m2) inside the boundary,
             each buffered by 100 m and dissolved; the part that contains the centre node; enclosed holes filled; eroded by 40 m and
             again the part with the centre (so buildings chain up over gaps of up to ~180 m and the outline runs 60 m outside the
             outermost buildings); clipped to the boundary; simplified to 5 m.
  zentrum    the pilot quarter: convex hull of the landmark geometries below (OSM), buffered by 120 m, simplified to 2 m.
  plus every place=suburb/quarter/neighbourhood/village/hamlet (and isolated_dwelling/locality with a name are counted only) inside the
  boundary as a point, mapped boundaries of Ortsteile (admin_level 9/10 or place polygons) and the landmarks of the centre as points.

  python3 -I tools/suhl/bestand/gebiete.py [--opl FILE]
"""
import argparse, json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sblib

# the landmarks the pilot quarter must contain: key -> (label, OSM type, id); checked by name below
LANDMARKS = [
    ('markt', 'Marktplatz', 'w', 44124199),
    ('markt2', 'Marktplatz (Fahrgasse)', 'w', 32083902),
    ('steinweg_n', 'Steinweg (Fußgängerzone, Nordteil)', 'w', 38570043),
    ('steinweg_m', 'Steinweg (Fußgängerzone, Mitte)', 'w', 40437966),
    ('steinweg_s', 'Steinweg (Fußgängerzone, Südteil)', 'w', 81101788),
    ('rathaus', 'Rathaus (am Markt)', 'w', 42484464),
    ('marienkirche', 'Hauptkirche St. Marien', 'w', 38867533),
    ('kreuzkirche', 'Kreuzkirche', 'w', 38807115),
    ('waffenmuseum', 'Waffenmuseum Suhl (im Malzhaus)', 'n', 10732305087),
    ('malzhaus', 'ehemaliges Malzhaus', 'r', 3313648),
    ('ccs', 'Congress Centrum Suhl (CCS)', 'w', 42871446),
    ('platz_einheit', 'Platz der Deutschen Einheit', 'w', 69995472),
    ('platz_einheit2', 'Platz der Deutschen Einheit (Nordteil)', 'w', 1157688150),
    ('bahnhof', 'Bahnhof Suhl (Empfangsgebäude)', 'w', 116951221),
    ('neues_rathaus', 'Neues Rathaus', 'w', 40348754),
]
MIN_FOOT = 40.0     # m2: smaller buildings (sheds) do not make a place built-up
GAP_BUF = 100.0     # m: buffer per building, so gaps of up to 200 m close
ERODE = 40.0        # m: taken off again
ZENTRUM_BUF = 120.0


def geom_of(o, kind, i):
    from shapely.geometry import Point, LineString
    if kind == 'n':
        return Point(o.nodes[i]) if i in o.nodes else None
    if kind == 'w':
        p = o.way_area(i)
        if p is not None and (o.ways[i][1].get('building') or o.ways[i][1].get('area') == 'yes' or o.ways[i][1].get('highway') == 'pedestrian'):
            return p
        c = o.line(i)
        return LineString(c) if c and len(c) >= 2 else None
    return o.rel_area(i)


def part_with(g, pt):
    """the polygon of a (multi)polygon that contains the point (or is nearest to it)"""
    parts = list(g.geoms) if g.geom_type == 'MultiPolygon' else [g]
    for p in parts:
        if p.contains(pt):
            return p
    return min(parts, key=lambda p: p.distance(pt))


def roundtrip(g):
    """the polygon as it is written (WGS84, 6 decimals) back in UTM, so that counts made here match what readers of the file get"""
    from shapely.geometry import mapping, shape
    ll = sblib.tf_geom(g, sblib.to_wgs)

    def rnd(c):
        if isinstance(c, (list, tuple)) and c and isinstance(c[0], (int, float)):
            return [round(c[0], 6), round(c[1], 6)]
        return [rnd(x) for x in c]
    m = mapping(ll)
    return sblib.tf_geom(shape({'type': m['type'], 'coordinates': rnd(m['coordinates'])}), sblib.to_utm)


def feat(geom_utm, props, nd=6):
    from shapely.geometry import mapping
    g = sblib.tf_geom(geom_utm, sblib.to_wgs)

    def rnd(c):
        if isinstance(c, (list, tuple)) and c and isinstance(c[0], (int, float)):
            return [round(c[0], nd), round(c[1], nd)]
        return [rnd(x) for x in c]
    m = mapping(g)
    return {'type': 'Feature', 'properties': props, 'geometry': {'type': m['type'], 'coordinates': rnd(m['coordinates'])}}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--opl', default=None)
    a = ap.parse_args()
    from shapely.geometry import Point, Polygon
    from shapely.ops import unary_union
    from shapely.strtree import STRtree
    from shapely.prepared import prep

    o = sblib.load_osm(a.opl)
    sblib.log(o.source, len(o.nodes), 'nodes', len(o.ways), 'ways', len(o.rels), 'relations')
    stadt_ll, rtags, rel = sblib.stadt_polygon_wgs()
    stadt = sblib.tf_geom(stadt_ll, sblib.to_utm)
    pstadt = prep(stadt)
    centre = Point(sblib.to_utm(sblib.CENTRE[1], sblib.CENTRE[0]))
    feats = []

    # ---- stadt
    feats.append(feat(stadt, {
        'id': 'stadt', 'art': 'gebiet', 'name': 'Stadt Suhl (Gemeindegebiet)', 'osm': f'relation/{sblib.REL_SUHL}',
        'ags': rtags.get('de:amtlicher_gemeindeschluessel'), 'wikidata': rtags.get('wikidata'),
        'flaeche_km2': round(stadt.area / 1e6, 2), 'bbox_utm32_km': sblib.bbox_km(stadt),
        'regel': 'Gemeindegrenze aus OpenStreetMap (boundary=administrative, admin_level 6), aus den 34 Grenzwegen der Relation zusammengesetzt',
        'quelle': 'OpenStreetMap, ODbL', 'osm_version': rel.get('version'), 'osm_timestamp': rel.get('timestamp')}))

    # ---- buildings inside the boundary
    blds = []
    for kind, i, tags, p in o.areas(lambda t: 'building' in t and t['building'] != 'no'):
        if pstadt.intersects(p.representative_point()):
            blds.append((kind, i, tags, p))
    big = [b[3] for b in blds if b[3].area >= MIN_FOOT]
    sblib.log(f'buildings in stadt: {len(blds)}, of them >= {MIN_FOOT:.0f} m2: {len(big)}')
    u = unary_union([p.buffer(GAP_BUF, 8) for p in big])
    comp = part_with(u, centre)
    filled = Polygon(comp.exterior)
    kern = part_with(filled.buffer(-ERODE, 8), centre).intersection(stadt)
    kern = roundtrip(part_with(kern, centre).simplify(5.0))
    pk = prep(kern)
    nk = sum(1 for b in blds if pk.contains(b[3].representative_point()))
    feats.append(feat(kern, {
        'id': 'kernstadt', 'art': 'gebiet', 'name': 'Kernstadt Suhl (zusammenhängend bebautes Gebiet um das Zentrum)',
        'flaeche_km2': round(kern.area / 1e6, 2), 'bbox_utm32_km': sblib.bbox_km(kern), 'gebaeude_osm': nk,
        'regel': (f'OSM-Gebäude (building=*, Grundfläche >= {MIN_FOOT:.0f} m²) in der Stadtgrenze, je {GAP_BUF:.0f} m gepuffert und vereinigt; '
                  f'der Teil mit dem Stadtmittelpunkt; Löcher gefüllt; um {ERODE:.0f} m zurückgenommen (Lücken bis etwa 180 m zwischen '
                  f'Gebäuden zählen als zusammenhängend, der Rand liegt {GAP_BUF - ERODE:.0f} m außerhalb der äußersten Gebäude); '
                  'auf die Stadtgrenze beschnitten; auf 5 m vereinfacht'),
        'quelle': 'OpenStreetMap, ODbL (' + o.source + ')'}))

    # ---- zentrum
    lm, missing = [], []
    for key, label, kind, i in LANDMARKS:
        g = geom_of(o, kind, i)
        if g is None:
            missing.append(key)
            continue
        tags = (o.ntags.get(i) if kind == 'n' else (o.ways[i][1] if kind == 'w' else o.rels[i][1])) or {}
        lm.append((key, label, kind, i, tags, g))
    hull = unary_union([x[5] for x in lm]).convex_hull
    zen = roundtrip(hull.buffer(ZENTRUM_BUF, 12).simplify(2.0))
    pz = prep(zen)
    inside_b = [b for b in blds if pz.contains(b[3].representative_point())]
    streets = sorted({t['name'] for w, (nd, t) in o.ways.items() if t and t.get('highway') and t.get('name')
                      and (lambda c: c and pz.intersects(__import__('shapely.geometry', fromlist=['LineString']).LineString(c)))(o.line(w))})
    named_b = sorted({b[2]['name'] for b in inside_b if b[2].get('name')})
    feats.append(feat(zen, {
        'id': 'zentrum', 'art': 'gebiet', 'name': 'Zentrum Suhl (Pilotquartier)',
        'flaeche_km2': round(zen.area / 1e6, 3), 'bbox_utm32_km': sblib.bbox_km(zen), 'gebaeude_osm': len(inside_b),
        'regel': (f'konvexe Hülle der Landmarken (Marktplatz, Steinweg, Rathaus am Markt, Hauptkirche St. Marien, Kreuzkirche, Waffenmuseum/'
                  f'Malzhaus, Congress Centrum Suhl, Platz der Deutschen Einheit, Bahnhof, Neues Rathaus) aus OSM, um {ZENTRUM_BUF:.0f} m gepuffert'),
        'landmarken': [{'key': k, 'name': lab, 'osm': {'n': 'node', 'w': 'way', 'r': 'relation'}[kd] + f'/{i}',
                        'drin': bool(pz.contains(g.representative_point()))} for k, lab, kd, i, t, g in lm],
        'strassen': streets, 'gebaeude_mit_namen': named_b, 'quelle': 'OpenStreetMap, ODbL'}))
    for k, lab, kd, i, t, g in lm:
        feats.append(feat(g.representative_point() if g.geom_type != 'Point' else g, {
            'id': 'lm_' + k, 'art': 'landmarke', 'name': lab, 'osm_name': t.get('name'),
            'osm': {'n': 'node', 'w': 'way', 'r': 'relation'}[kd] + f'/{i}', 'im_zentrum': bool(pz.contains(g.representative_point()))}))
    if missing:
        sblib.log('landmarks not found:', missing)

    # ---- Ortsteile: place nodes and mapped boundaries
    kinds = ('suburb', 'quarter', 'neighbourhood', 'village', 'hamlet')
    places = []
    for i, t in o.ntags.items():
        if t.get('place') in kinds + ('isolated_dwelling', 'locality', 'town', 'city') and t.get('name') and i in o.nodes:
            pt = Point(o.nodes[i])
            if pstadt.contains(pt):
                places.append((i, t, pt))
    for i, t, pt in sorted(places, key=lambda x: (kinds.index(x[1]['place']) if x[1]['place'] in kinds else 9, x[1]['name'])):
        if t['place'] not in kinds:
            continue
        pr = {'id': f'ort_{i}', 'art': 'ortsteil', 'name': t['name'], 'place': t['place'], 'osm': f'node/{i}',
              'in_kernstadt': bool(pk.contains(pt)), 'im_zentrum': bool(pz.contains(pt)),
              'utm32_km': [round(pt.x / 1000, 3), round(pt.y / 1000, 3)],
              'entfernung_zentrum_km': round(pt.distance(centre) / 1000, 2)}
        for k in ('population', 'wikidata', 'ele', 'postal_code'):
            if t.get(k):
                pr[k] = t[k]
        feats.append(feat(pt, pr))
    nb = 0
    for kind, i, tags, p in o.areas(lambda t: (t.get('boundary') == 'administrative' and t.get('admin_level') in ('8', '9', '10', '11'))
                                    or (t.get('place') in kinds and t.get('name'))):
        if kind == 'r' and i == sblib.REL_SUHL:
            continue
        if not pstadt.contains(p.representative_point()) or p.area > stadt.area * 0.98:
            continue
        nb += 1
        feats.append(feat(p.simplify(3.0), {
            'id': f'grenze_{kind}{i}', 'art': 'ortsteil_grenze', 'name': tags.get('name'), 'admin_level': tags.get('admin_level'),
            'place': tags.get('place'), 'osm': ('way/' if kind == 'w' else 'relation/') + str(i),
            'flaeche_km2': round(p.area / 1e6, 2), 'bbox_utm32_km': sblib.bbox_km(p)}))

    fc = {'type': 'FeatureCollection', 'name': 'suhl_gebiete', 'made': sblib.now(),
          'crs_note': 'Koordinaten WGS84 (EPSG:4326, lon/lat); bbox_utm32_km = [E0, N0, E1, N1] in ETRS89 / UTM 32N (EPSG:25832), km',
          'centre': {'lat': sblib.CENTRE[0], 'lon': sblib.CENTRE[1], 'utm32_km': [round(centre.x / 1000, 3), round(centre.y / 1000, 3)],
                     'note': 'admin_centre der Relation 62450 (Nominatim)'},
          'attribution': '© OpenStreetMap-Mitwirkende, ODbL 1.0', 'source': o.source, 'features': feats}
    p = os.path.join(sblib.OUT, 'gebiete.geojson')
    os.makedirs(sblib.OUT, exist_ok=True)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(fc, f, ensure_ascii=False, separators=(',', ':'))
        f.write('\n')
    by = {}
    for ft in feats:
        by[ft['properties']['art']] = by.get(ft['properties']['art'], 0) + 1
    sblib.log('written', p, os.path.getsize(p), 'bytes', by)
    for ft in feats:
        pr = ft['properties']
        if pr['art'] == 'gebiet':
            sblib.log(' ', pr['id'], pr['flaeche_km2'], 'km2', pr['bbox_utm32_km'], pr.get('gebaeude_osm', ''))
    sblib.log('  hull without buffer:', round(hull.area / 1e6, 3), 'km2; landmarks inside:',
              [(x['key'], x['drin']) for x in feats[2]['properties']['landmarken']])
    sblib.log('  places:', [(ft['properties']['name'], ft['properties']['place'], ft['properties']['in_kernstadt'])
                            for ft in feats if ft['properties']['art'] == 'ortsteil'])
    sblib.log('  boundaries:', [(ft['properties']['name'], ft['properties']['admin_level'], ft['properties']['flaeche_km2'])
                                for ft in feats if ft['properties']['art'] == 'ortsteil_grenze'])
    sblib.log('  other named places (not written):', sorted({(t['name'], t['place']) for i, t, pt in places if t['place'] not in kinds})[:60])


if __name__ == '__main__':
    main()
