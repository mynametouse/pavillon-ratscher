# The gazetteer of the map (feat/karte): settlements, mountains, forests, waters and landmarks of South Thuringia from Wikidata (CC0),
# the districts from OpenStreetMap (ODbL) – in model metres, with where each lies on the map (2 fine, 1 coarse, 0 not on the map).
#   python3 -I tools/karte/orte.py RAW OUT.json     RAW = folder with wd_orte.json (wd_orte.py), kreis_*.json/nk_*.json (Nominatim),
#                                                         masks.npz + grid.json (abdeckung.py)
import json, sys, os, glob, math
import numpy as np
import pyproj
from shapely.geometry import shape, Point, mapping
from shapely.ops import unary_union
import shapely

RAW, OUT = sys.argv[1], sys.argv[2]
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
XF = json.load(open(os.path.join(REPO, 'viz3', 'manifests.json')))['geoman']['xf']
a, b, ex, ey = XF['a'], XF['b'], XF['ex'], XF['ey']
S2 = a * a + b * b
to_utm = pyproj.Transformer.from_crs(4326, 25832, always_xy=True).transform
def model(E, N):
    dE, dN = E - ex, N - ey
    return (a * dE + b * dN) / S2, (-b * dE + a * dN) / S2
def ll2m(lon, lat):
    return model(*to_utm(lon, lat))

# ---- districts ----
KR = []
for f in sorted(glob.glob(os.path.join(RAW, 'kreis_*.json')) + glob.glob(os.path.join(RAW, 'nk_*.json'))):
    d = [r for r in json.load(open(f)) if r['geojson']['type'] in ('Polygon', 'MultiPolygon')]
    if not d: continue
    r = d[0]
    name = r['display_name'].split(',')[0]
    if name == 'Suhl': name = 'Stadt Suhl'
    g = shapely.transform(shape(r['geojson']), lambda c: np.array([ll2m(x, y) for x, y in c]))
    KR.append((name, g))
def kreis_of(x, y):
    p = Point(x, y)
    for i, (n, g) in enumerate(KR):
        if g.contains(p): return i
    return -1
kreise = []
for n, g in KR:
    s = g.simplify(120)
    polys = list(s.geoms) if s.geom_type == 'MultiPolygon' else [s]
    kreise.append({'n': n, 'p': [[round(v) for xy in list(pg.exterior.coords)[:-1] for v in xy] for pg in polys if pg.area > 2e6]})

# ---- where on the map ----
M = np.load(os.path.join(RAW, 'masks.npz')); G = json.load(open(os.path.join(RAW, 'grid.json')))
def onmap(E, N):
    c, r = int((E - G['E0']) / G['RES']), int((G['N1'] - N) / G['RES'])
    if not (0 <= c < G['W'] and 0 <= r < G['H']): return 0
    return 2 if M['img10'][r, c] else 1 if M['karte'][r, c] else 0

# ---- places ----
KIND = {  # Wikidata class → (German kind, rank: larger = more important in search and on the map)
    'Q1549591': ('Stadt', 9), 'Q515': ('Stadt', 8), 'Q42744322': ('Stadt', 8), 'Q3957': ('Stadt', 8),
    'Q262166': ('Gemeinde', 6), 'Q116457956': ('Gemeinde', 6), 'Q253019': ('Ortsteil', 5), 'Q532': ('Dorf', 5),
    'Q123705': ('Stadtteil', 5), 'Q5084': ('Weiler', 3), 'Q2514025': ('Wohnplatz', 2), 'Q1115575': ('Ort', 3),
    'Q1867183': ('Ort', 3), 'Q15715406': ('Ort', 2),
    'Q8502': ('Berg', 4), 'Q54050': ('Hügel', 3), 'Q46831': ('Gebirge', 6), 'Q4421': ('Wald', 4), 'Q131681': ('Talsperre', 5),
    'Q23397': ('See', 4), 'Q4022': ('Fluss', 4), 'Q47521': ('Bach', 2), 'Q179049': ('Naturschutzgebiet', 3), 'Q1286517': ('Landschaft', 3),
    'Q1898954': ('Berg', 3), 'Q190429': ('Senke', 2),
    'Q23413': ('Burg', 5), 'Q16560': ('Schloss', 5), 'Q16970': ('Kirche', 3), 'Q2977': ('Kirche', 4), 'Q44539': ('Kirche', 3),
    'Q33506': ('Museum', 4), 'Q12323': ('Talsperre', 5), 'Q751876': ('Schloss', 5), 'Q1785071': ('Burg', 5), 'Q44613': ('Kloster', 5), 'Q160742': ('Kloster', 5), 'Q109607': ('Ruine', 4), 'Q22698': ('Park', 3), 'Q12518': ('Turm', 3), 'Q1440300': ('Aussichtsturm', 4), 'Q820477': ('Bergwerk', 3), 'Q130003': ('Skigebiet', 4), 'Q1076486': ('Sportstätte', 3), 'Q35509': ('Höhle', 3), 'Q15243209': ('Gebäude', 2), 'Q55488': ('Bahnhof', 4), 'Q12280': ('Brücke', 2), 'Q1137809': ('Gebäude', 2),
}
NOTGEM = ('Verwaltungsgemeinschaft', 'Landkreis', 'Kreis', 'Thüringen', 'Bayern', 'Deutschland', 'Erfüllende Gemeinde', 'Planungsregion')
wd = json.load(open(os.path.join(RAW, 'wd_orte.json')))
rows = []
for o in wd:
    n = o['n'].strip()
    if not n or (n[0] == 'Q' and n[1:].isdigit()) or '#' in n or len(n) > 48: continue
    ks = [KIND[t] for t in o['t'] if t in KIND]
    if not ks: continue
    kind, rank = max(ks, key=lambda k: k[1])
    E, N = to_utm(o['lon'], o['lat'])
    om = onmap(E, N)
    if o['g'] != 'ort' and om == 0: continue      # mountains, waters, landmarks only where the map is
    x, y = model(E, N)
    pop = o.get('pop') or 0
    if pop >= 20000: rank = max(rank, 9)
    elif pop >= 5000: rank = max(rank, 8)
    gem = ''
    if kind in ('Ortsteil', 'Stadtteil', 'Dorf', 'Weiler', 'Wohnplatz', 'Ort') or o['g'] != 'ort':
        for v in o['in'].values():
            if v and not any(v.startswith(s) for s in NOTGEM): gem = v; break
    k = kreis_of(x, y)
    rows.append([n, kind, round(x), round(y), gem, k, int(pop), rank, om])
# one entry per place: the same name within 400 m is one place (keep the more important kind)
rows.sort(key=lambda r: (-r[7], -r[6]))
keep = []
for r in rows:
    if any(q[0] == r[0] and math.hypot(q[2] - r[2], q[3] - r[3]) < 400 for q in keep): continue
    keep.append(r)
keep.sort(key=lambda r: (r[3] // 5000, r[2]))
out = {
    'v': 1, 'made': '2026-11-19',
    'src': 'Orte, Berge, Gewässer, Bauwerke: Wikidata (CC0); Kreisgrenzen: © OpenStreetMap-Mitwirkende (ODbL 1.0) über Nominatim',
    'fields': ['name', 'kind', 'x', 'y', 'gemeinde', 'kreis', 'einwohner', 'rang', 'karte (2 fein, 1 grob, 0 nicht)'],
    'kreise': kreise, 'orte': keep,
}
json.dump(out, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
from collections import Counter
print(len(keep), Counter(r[1] for r in keep).most_common(12), Counter(r[8] for r in keep), os.path.getsize(OUT), 'B')
