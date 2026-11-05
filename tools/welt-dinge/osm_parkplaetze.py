#!/usr/bin/env python3
"""OpenStreetMap: the car parks (amenity=parking) of the areas of feat/welt-dinge and what they belong to (supermarket, shop, church,
school, kindergarten, cemetery, doctor …) – for parking places that fill by the time (the photo of 07.04.2024 was a Sunday morning:
a supermarket's car park is empty there, so the photo alone gives it no places).

Runs on GitHub Actions (.github/workflows/welt-dinge-osm.yml – Overpass is not reachable from the chat machine) and writes
OUT.json: { "areas": { name: { "parking": [ { "id", "tags", "ring": [[lat, lon], …] | null, "c": [lat, lon] } ], "pois": [ { "k", "name",
"c": [lat, lon] } ] } } }. © OpenStreetMap contributors, ODbL 1.0.

  python3 tools/welt-dinge/osm_parkplaetze.py OUT.json"""
import json, sys, time, urllib.parse, urllib.request

AREAS = {
    'ratscher': (50.49482, 10.76539, 50.49993, 10.77694),
    'schleusingen': (50.50197, 10.74346, 50.51587, 10.76457),
    'geisenhoehn': (50.49086, 10.75362, 50.49655, 10.76050),
    'talsperre': (50.49186, 10.78387, 50.49477, 10.78938),
    'vessra': (50.48815, 10.63301, 50.49882, 10.65245),
    'zollbrueck': (50.48595, 10.68973, 50.48886, 10.69496),
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
                with urllib.request.urlopen(req, timeout=180) as r:
                    return json.loads(r.read())
            except Exception as e:
                last = e
                time.sleep(5)
    raise last


def main():
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
