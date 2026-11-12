"""The provisional areas of the Suhl inventory as one GeoJSON: `stadt` = the municipality of Suhl from OpenStreetMap
(relation 62450, through Nominatim; ODbL), `kernstadt` = circle of 5 km and `zentrum` = circle of 900 m around the centre
(50.6087 N, 10.6926 E). Replaced by tools/suhl/out/bestand/gebiete.geojson of the agent suhl-bestand as soon as it exists.
    python3 tools/suhl/fotos/gebiete.py        ->  tools/suhl/out/fotos/gebiete_vorlaeufig.geojson"""
import sys, os, json
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import slib

d = slib.get_json('https://nominatim.openstreetmap.org/lookup?osm_ids=R62450&format=jsonv2&polygon_geojson=1&polygon_threshold=0.0001')
x = d[0]
assert x.get('osm_id') == 62450 and x['geojson']['type'] in ('Polygon', 'MultiPolygon'), x.get('display_name')
feats = [
    {'type': 'Feature', 'properties': {'gebiet': 'stadt', 'name': x.get('display_name'), 'quelle': 'OpenStreetMap relation 62450 via Nominatim, ODbL (© OpenStreetMap-Mitwirkende)'},
     'geometry': x['geojson']},
    {'type': 'Feature', 'properties': {'gebiet': 'kernstadt', 'quelle': f'provisional: circle of {slib.R_KERNSTADT:.0f} m around {slib.CENTRE}'},
     'geometry': slib.circle(slib.CENTRE[0], slib.CENTRE[1], slib.R_KERNSTADT)},
    {'type': 'Feature', 'properties': {'gebiet': 'zentrum', 'quelle': f'provisional: circle of {slib.R_ZENTRUM:.0f} m around {slib.CENTRE}'},
     'geometry': slib.circle(slib.CENTRE[0], slib.CENTRE[1], slib.R_ZENTRUM)},
]
p = slib.save('gebiete_vorlaeufig.geojson', {'type': 'FeatureCollection', 'features': feats})
a = slib.Areas()
print(p, 'stadt bbox', [round(v, 4) for v in a.bbox('stadt')], 'centre in', a.of(*slib.CENTRE))
