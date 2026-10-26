"""Research for the people of Suhl (feat/suhl-leute) – runs on GitHub Actions (.github/workflows/suhl-leute.yml), whose runners reach
OpenStreetMap and Wikipedia; the chat machine does not. Writes into an output folder that the workflow pushes to the scratch branch
ref/suhl-leute-fotos (never merged):
  osm.json   – named places (shops, churches, the hospital, the sports fields, benches, bus stops, quarters) and the walkable ways of Suhl,
               in the app's model metres (x east, y north: WGS84 -> UTM 32N -> xf of viz3/manifests.json, as tools/welt/wlib.py)
  wiki/*.txt – plain-text extracts of German Wikipedia articles about Suhl (facts to check the people's lines against; CC BY-SA 4.0)
  wiki/_suche.txt – what the search found for the topics without a known article title
Sources: OpenStreetMap contributors (ODbL), Wikipedia (CC BY-SA 4.0). Only derived small data goes to the feature branch.
  python3 -I viz3/extra/suhl-leute/recherche.py <out>
"""
import json, os, sys, time, urllib.parse
import requests
from pyproj import Transformer

OUT = sys.argv[1] if len(sys.argv) > 1 else 'recherche'
os.makedirs(os.path.join(OUT, 'wiki'), exist_ok=True)
REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
G = json.load(open(os.path.join(REPO, 'viz3', 'manifests.json')))['geoman']
XF = G['xf']
UA = 'pavillon-ratscher research (github.com/mynametouse/pavillon-ratscher)'
S = requests.Session()
S.headers['User-Agent'] = UA
tr = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)


def model(lon, lat):
    E, N = tr.transform(lon, lat)
    a, b = XF['a'], XF['b']
    s2 = a * a + b * b
    dx, dy = E - XF['ex'], N - XF['ey']
    return round((a * dx + b * dy) / s2, 1), round((-b * dx + a * dy) / s2, 1)


# ---------------- OpenStreetMap ----------------
BB = (50.585, 10.645, 50.650, 10.740)   # s, w, n, e: the town of Suhl with the centre, the Aue and Suhl-Nord
Q = """[out:json][timeout:240][bbox:{0},{1},{2},{3}];
(
  way["highway"];
  nwr["name"]["amenity"]; nwr["name"]["shop"]; nwr["name"]["leisure"]; nwr["name"]["tourism"]; nwr["name"]["historic"];
  nwr["name"]["office"]; nwr["name"]["craft"]; nwr["name"]["club"]; nwr["name"]["healthcare"]; nwr["name"]["sport"];
  nwr["name"]["building"]; nwr["name"]["landuse"]; nwr["name"]["public_transport"];
  node["amenity"~"bench|bicycle_parking|waste_basket|fountain|drinking_water"]; node["highway"="bus_stop"];
  way["leisure"~"pitch|stadium|sports_centre|park|playground|track"]; nwr["place"];
  way["amenity"~"parking|school|kindergarten|hospital"];
);
out body;
>;
out skel qt;""".format(*BB)
ENDPOINTS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
             'https://overpass.private.coffee/api/interpreter']
j = None
for url in ENDPOINTS:
    try:
        r = S.post(url, data={'data': Q}, timeout=300)
        print('Overpass', url, r.status_code, len(r.content), flush=True)
        if r.status_code == 200 and r.content[:1] == b'{':
            j = r.json()
            break
    except Exception as e:
        print('Overpass', url, 'failed', e, flush=True)
    time.sleep(5)
if j:
    nodes = {}
    for el in j['elements']:
        if el['type'] == 'node':
            nodes[el['id']] = (el['lon'], el['lat'])
    KEEP = ('name', 'amenity', 'shop', 'leisure', 'tourism', 'historic', 'office', 'craft', 'club', 'healthcare', 'sport', 'building',
            'landuse', 'place', 'highway', 'public_transport', 'addr:street', 'addr:housenumber', 'opening_hours', 'denomination',
            'religion', 'operator', 'website', 'wikipedia', 'wikidata', 'surface', 'backrest', 'bus', 'route_ref', 'level', 'cuisine',
            'description', 'start_date', 'heritage', 'foot', 'access', 'service', 'footway', 'width', 'lit', 'incline', 'bridge', 'tunnel',
            'layer', 'oneway')
    pois, ways = [], []
    for el in j['elements']:
        t = el.get('tags') or {}
        if not t:
            continue
        tags = {k: v for k, v in t.items() if k in KEEP}
        if el['type'] == 'node':
            x, y = model(el['lon'], el['lat'])
            pois.append({'id': 'n' + str(el['id']), 'll': [round(el['lat'], 6), round(el['lon'], 6)], 'xy': [x, y], 't': tags})
        elif el['type'] == 'way':
            pts = [nodes[n] for n in el.get('nodes', []) if n in nodes]
            if not pts:
                continue
            xy = [list(model(lo, la)) for lo, la in pts]
            if 'highway' in t and not any(k in t for k in ('amenity', 'shop', 'leisure', 'tourism', 'building')):
                ways.append({'id': 'w' + str(el['id']), 't': tags, 'xy': xy, 'n': [n for n in el.get('nodes', []) if n in nodes]})
            else:
                cx = sum(p[0] for p in xy) / len(xy)
                cy = sum(p[1] for p in xy) / len(xy)
                la = sum(p[1] for p in pts) / len(pts)
                lo = sum(p[0] for p in pts) / len(pts)
                pois.append({'id': 'w' + str(el['id']), 'll': [round(la, 6), round(lo, 6)], 'xy': [round(cx, 1), round(cy, 1)], 't': tags,
                             'ring': xy if len(xy) < 400 else None})
        elif el['type'] == 'relation' and 'name' in t:
            pois.append({'id': 'r' + str(el['id']), 'll': None, 'xy': None, 't': tags})
    json.dump({'source': 'OpenStreetMap contributors, ODbL', 'fetched': time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()), 'bbox': BB,
               'pois': pois, 'ways': ways}, open(os.path.join(OUT, 'osm.json'), 'w'), separators=(',', ':'), ensure_ascii=False)
    print('osm.json', len(pois), 'pois', len(ways), 'ways', os.path.getsize(os.path.join(OUT, 'osm.json')) // 1024, 'KB', flush=True)
    # a readable list of the named places
    with open(os.path.join(OUT, 'orte.txt'), 'w') as f:
        for p in sorted(pois, key=lambda p: (p['t'].get('amenity') or p['t'].get('shop') or p['t'].get('leisure') or p['t'].get('place') or 'zz',
                                             p['t'].get('name', ''))):
            if 'name' not in p['t'] and p['t'].get('amenity') not in ('bench',) and p['t'].get('highway') != 'bus_stop':
                continue
            kind = next((k + '=' + p['t'][k] for k in ('place', 'amenity', 'shop', 'leisure', 'tourism', 'historic', 'office', 'craft', 'club',
                                                        'healthcare', 'sport', 'highway', 'public_transport', 'building', 'landuse') if k in p['t']), '?')
            f.write(f"{p['id']}\t{kind}\t{p['t'].get('name', '')}\t{p['xy']}\t{p['ll']}\t{p['t'].get('addr:street', '')} {p['t'].get('addr:housenumber', '')}\n")
        streets = {}
        for w in ways:
            n = w['t'].get('name')
            if n:
                streets.setdefault(n, []).append(w['xy'][len(w['xy']) // 2])
        for n, v in sorted(streets.items()):
            f.write(f"STREET\t{n}\t{len(v)}\t{v[0]}\n")
else:
    print('no OSM data', flush=True)

# ---------------- Wikipedia (de) ----------------
TITLES = ['Suhl', 'Suhl-Nord', 'Suhler Aue', 'Aue (Suhl)', 'Simson (Unternehmen)', 'Simson S51', 'Simson Schwalbe', 'Waffenmuseum Suhl',
          'Congress Centrum Suhl', 'SRH Zentralklinikum Suhl', 'Hauptkirche St. Marien (Suhl)', 'Kreuzkirche (Suhl)', 'Schießsportzentrum Suhl',
          'C. G. Haenel', 'Merkel Jagd- und Sportwaffen', 'J. P. Sauer & Sohn', 'Lauter (Hasel)', 'Hasel (Werra)', 'Hennebergisch',
          'Bezirk Suhl', 'WBS 70', 'Domberg (Suhl)', 'Ottilienstein', 'Steinweg (Suhl)', 'Rathaus Suhl', 'Waffenschmied (Suhl)',
          'Suhler Verkehrsgesellschaft', 'Friedberg (Suhl)', 'Oberhof', 'Heinrichs (Suhl)', 'Lautenberg (Suhl)', 'Döllberg',
          'Sportzentrum Suhl', 'VfB 91 Suhl', 'Liste der Kulturdenkmale in Suhl', 'Wolfsgrube (Suhl)', 'Suhler Neuendorf',
          'Fahrzeug- und Jagdwaffenwerk „Ernst Thälmann“ Suhl', 'Ringberg (Suhl)', 'Thüringer Rostbratwurst', 'Suhler Wurst']
SEARCH = ['Suhl Fußballverein Aue', 'Suhl Fußball Stadion Aue', 'Suhl Plattenbau Rückbau', 'Suhl Nord Neubaugebiet', 'Suhl Büchsenmacher Gravur',
          'Suhl Weihnachtsmarkt', 'Suhl Stadtbus', 'Suhl Repair-Café', 'Suhl Markt Wochenmarkt', 'Suhler Mundart', 'Suhl Simson Museum',
          'Suhl Schießsport Weltcup Friedberg', 'Suhl Tierpark', 'Suhl Gymnasium', 'Suhl Kirche Organist', 'Suhl Zella-Mehlis Waffenproduktion',
          'Suhl Einwohnerentwicklung', 'Suhl Lauter Fluss Innenstadt']
API = 'https://de.wikipedia.org/w/api.php'


def extract(title):
    r = S.get(API, params={'action': 'query', 'prop': 'extracts|info', 'explaintext': 1, 'redirects': 1, 'inprop': 'url', 'titles': title,
                           'format': 'json', 'formatversion': 2}, timeout=60)
    p = r.json()['query']['pages'][0]
    if p.get('missing'):
        return None, None
    return p['title'], p.get('extract') or ''


got = []
for t in TITLES:
    try:
        name, txt = extract(t)
        if not name:
            print('wiki missing', t, flush=True)
            continue
        fn = name.replace('/', '_').replace(' ', '_')[:80] + '.txt'
        open(os.path.join(OUT, 'wiki', fn), 'w').write(f'{name}\nhttps://de.wikipedia.org/wiki/{urllib.parse.quote(name.replace(" ", "_"))}\n'
                                                       'Lizenz: CC BY-SA 4.0 (Wikipedia-Autoren)\n\n' + txt)
        got.append((name, len(txt)))
        print('wiki', name, len(txt), flush=True)
    except Exception as e:
        print('wiki', t, 'failed', e, flush=True)
    time.sleep(0.4)
with open(os.path.join(OUT, 'wiki', '_suche.txt'), 'w') as f:
    for q in SEARCH:
        try:
            r = S.get(API, params={'action': 'query', 'list': 'search', 'srsearch': q, 'srlimit': 6, 'format': 'json', 'formatversion': 2}, timeout=60)
            f.write('## ' + q + '\n')
            for h in r.json()['query']['search']:
                sn = h['snippet'].replace('<span class="searchmatch">', '').replace('</span>', '')
                f.write(f"- {h['title']}: {sn}\n")
            f.write('\n')
        except Exception as e:
            f.write(f'## {q}: failed {e}\n')
        time.sleep(0.4)
print('wiki articles', len(got), flush=True)
