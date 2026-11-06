#!/usr/bin/env python3
"""OpenStreetMap: the car parks (amenity=parking) of the areas of feat/welt-dinge and what they belong to (supermarket, shop, church,
school, kindergarten, cemetery, doctor …) – for parking places that fill by the time (the photo of 07.04.2024 was a Sunday morning:
a supermarket's car park is empty there, so the photo alone gives it no places).

Runs on GitHub Actions (.github/workflows/welt-dinge-osm.yml – neither Overpass nor Geofabrik is reachable from the chat machine) and
writes OUT.json: { "areas": { name: { "parking": [ { "id", "tags", "ring": [[lat, lon], …] | null, "c": [lat, lon] } ], "pois": [ { "k",
"name", "c": [lat, lon], "ring" } ] } } }. © OpenStreetMap contributors, ODbL 1.0.

  python3 tools/welt-dinge/osm_parkplaetze.py OUT.json                        # from the Overpass API
  python3 tools/welt-dinge/osm_parkplaetze.py OUT.json --geojsonseq FILE      # from an extract: osmium export -f geojsonseq -a type,id"""
import json, sys, time, urllib.parse, urllib.request

AREAS = {
    'ratscher': (50.49482, 10.76539, 50.49993, 10.77694),
    'schleusingen': (50.49684, 10.72576, 50.52261, 10.77567),  # the town with its outer parts (round 3)
    'geisenhoehn': (50.49086, 10.75362, 50.49655, 10.76050),
    'talsperre': (50.49186, 10.78387, 50.49477, 10.78938),
    'vessra': (50.48815, 10.63301, 50.49882, 10.65245),
    'zollbrueck': (50.48595, 10.68973, 50.48886, 10.69496),
    # the villages of the tiled world beyond them (their built-up area from the buildings + 100 m)
    'grimmelshausen': (50.47801, 10.63235, 50.48471, 10.64141),
    'themar': (50.49814, 10.60667, 50.51302, 10.62984),
    'siegritz': (50.46534, 10.65609, 50.47190, 10.66826),
    'ehrenberg': (50.47784, 10.65257, 50.48384, 10.66382),
    'gethles': (50.50843, 10.69362, 50.51741, 10.70529),
    'neuhof': (50.51128, 10.66965, 50.51775, 10.67817),
    'neuendambach': (50.46844, 10.71761, 50.47331, 10.72708),
    'rappelsdorf': (50.49347, 10.71559, 50.50367, 10.72956),
    'fischbach': (50.52469, 10.72530, 50.53175, 10.73493),
    'gerhardtsgereuth': (50.46751, 10.74273, 50.47286, 10.75309),
    'gottfriedsberg': (50.48214, 10.75422, 50.48739, 10.76292),
    'stkilian': (50.52114, 10.75541, 50.53114, 10.76991),
    # the settlements of the tiled world that have no place node in the drive's data (welt/fahrt.js) – named by the extract's 'orte'
    'hinternah': (50.51145, 10.78058, 50.52680, 10.80466),
    'wiedersbach': (50.47331, 10.78949, 50.47875, 10.80276),
    'heckengereuth': (50.48607, 10.78819, 50.49471, 10.80173),
}
OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
            'https://overpass.private.coffee/api/interpreter']
POI = ['["shop"]', '["amenity"~"^(place_of_worship|school|kindergarten|doctors|pharmacy|townhall|community_centre|restaurant|pub|'
       'cafe|fast_food|bank|post_office|fuel|hospital|clinic|library|grave_yard|marketplace)$"]', '["landuse"="cemetery"]',
       '["leisure"~"^(sports_centre|pitch|swimming_pool|stadium)$"]', '["tourism"~"^(museum|attraction|hotel|camp_site)$"]', '["office"]',
       '["craft"]']


def query(bbox):
    s, w, n, e = bbox
    b = f'({s},{w},{n},{e})'
    parts = [f'way["amenity"="parking"]{b};', f'relation["amenity"="parking"]{b};', f'node["amenity"="parking"]{b};']
    for sel in POI:
        parts += [f'node{sel}{b};', f'way{sel}{b};']
    return '[out:json][timeout:90];(' + ''.join(parts) + ');out tags geom center;'


def fetch(q):
    last = None
    for url in OVERPASS:
        for _ in range(2):
            try:
                data = urllib.parse.urlencode({'data': q}).encode()
                req = urllib.request.Request(url, data=data, headers={'User-Agent': 'pavillon-ratscher welt-dinge (github actions)'})
                with urllib.request.urlopen(req, timeout=90) as r:
                    return json.loads(r.read())
            except Exception as e:
                last = e
                time.sleep(5)
    raise last


AMEN = {'place_of_worship', 'school', 'kindergarten', 'doctors', 'pharmacy', 'townhall', 'community_centre', 'restaurant', 'pub', 'cafe',
        'fast_food', 'bank', 'post_office', 'fuel', 'hospital', 'clinic', 'library', 'grave_yard', 'marketplace'}
LEIS = {'sports_centre', 'pitch', 'swimming_pool', 'stadium'}
TOUR = {'museum', 'attraction', 'hotel', 'camp_site'}


def poi_key(t):
    """The key=value a place of interest is known by (same choice as the Overpass query), or None."""
    if 'shop' in t:
        return f"shop={t['shop']}"
    if t.get('amenity') in AMEN:
        return f"amenity={t['amenity']}"
    if t.get('landuse') == 'cemetery':
        return 'landuse=cemetery'
    if t.get('leisure') in LEIS:
        return f"leisure={t['leisure']}"
    if t.get('tourism') in TOUR:
        return f"tourism={t['tourism']}"
    for key in ('office', 'craft'):
        if key in t:
            return f'{key}={t[key]}'
    return None


PLACES = []  # the named places of the extract (place=town/village/hamlet/suburb …): what the areas are called


def from_extract(path):
    """The same result from a regional extract (osmium export -f geojsonseq -a type,id): closed ways and multipolygons come as polygons
    (a closed way may come twice, as a line and as a polygon – the polygon wins), nodes as points."""
    feats = {}
    with open(path, encoding='utf-8') as f:
        for line in f:
            line = line.lstrip('\x1e').strip()
            if not line:
                continue
            ft = json.loads(line)
            p = ft.get('properties') or {}
            t = {k: v for k, v in p.items() if not k.startswith('@')}
            if t.get('place') in ('town', 'village', 'hamlet', 'suburb', 'isolated_dwelling', 'locality') and t.get('name'):
                g = ft.get('geometry') or {}
                if g.get('type') == 'Point':
                    PLACES.append({'name': t['name'], 'place': t['place'], 'c': [g['coordinates'][1], g['coordinates'][0]]})
            if t.get('amenity') != 'parking' and not poi_key(t):
                continue
            g = ft.get('geometry') or {}
            ring = None
            if g.get('type') == 'Polygon':
                ring = g['coordinates'][0]
            elif g.get('type') == 'MultiPolygon':
                ring = max((pl[0] for pl in g['coordinates']), key=len)
            elif g.get('type') == 'LineString' and len(g['coordinates']) >= 4 and g['coordinates'][0] == g['coordinates'][-1]:
                ring = g['coordinates']
            elif g.get('type') != 'Point':
                continue
            key = f"{p.get('@type', '?')}/{p.get('@id', len(feats))}"
            if key in feats and feats[key][1] is not None and ring is None:
                continue
            if ring:
                lon = sum(c[0] for c in ring[:-1]) / max(1, len(ring) - 1)
                lat = sum(c[1] for c in ring[:-1]) / max(1, len(ring) - 1)
            else:
                lon, lat = g['coordinates'][:2]
            feats[key] = (t, [[c[1], c[0]] for c in ring] if ring else None, [lat, lon])
    out = {}
    for name, (s, w, n, e) in AREAS.items():
        park, pois = [], []
        for key, (t, ring, c) in feats.items():
            if not (s <= c[0] <= n and w <= c[1] <= e):
                continue
            if t.get('amenity') == 'parking':
                park.append({'id': key, 'tags': t, 'ring': ring, 'c': c})
            else:
                pois.append({'k': poi_key(t), 'name': t.get('name', ''), 'c': c, 'ring': ring})
        out[name] = {'parking': park, 'pois': pois}
        print(name, len(park), 'car parks', len(pois), 'places of interest', flush=True)
    return out


def main():
    if '--geojsonseq' in sys.argv:
        src = sys.argv[sys.argv.index('--geojsonseq') + 1]
        out = {'quelle': '© OpenStreetMap-Mitwirkende, ODbL 1.0 (Geofabrik-Auszug Thüringen)', 'areas': from_extract(src), 'orte': PLACES}
        json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False, indent=0)
        return
    out = {'quelle': '© OpenStreetMap-Mitwirkende, ODbL 1.0 (Overpass API)', 'areas': {}}
    for name, bbox in AREAS.items():
        j = fetch(query(bbox))
        park, pois = [], []
        for el in j.get('elements', []):
            t = el.get('tags', {})
            c = el.get('center') or ({'lat': el['lat'], 'lon': el['lon']} if 'lat' in el else None)
            ring = [[g['lat'], g['lon']] for g in el.get('geometry', [])] if el.get('geometry') else None
            if t.get('amenity') == 'parking':
                park.append({'id': f"{el['type']}/{el['id']}", 'tags': t, 'ring': ring, 'c': [c['lat'], c['lon']] if c else None})
            elif c:
                k = next((f'{key}={t[key]}' for key in ('shop', 'amenity', 'landuse', 'leisure', 'tourism', 'office', 'craft') if key in t), '?')
                pois.append({'k': k, 'name': t.get('name', ''), 'c': [c['lat'], c['lon']], 'ring': ring})
        out['areas'][name] = {'parking': park, 'pois': pois}
        print(name, len(park), 'car parks', len(pois), 'places of interest', flush=True)
        time.sleep(2)
    json.dump(out, open(sys.argv[1], 'w'), ensure_ascii=False, indent=0)


if __name__ == '__main__':
    main()
