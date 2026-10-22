# Part G: roads and paths for driving (V16b) → out/pub/roads.b64.json + entry 'roads' in out/pub/geo.json
#  OSM highways inside the inner terrain square (2.4 km, the drivable area), classified by kind / surface / width, simplified (0.25 m),
#  as polylines in model coordinates. The browser derives everything else from them: the road map texture for the ground shader
#  (edge distance, kind, phase of the dashed line), the surface under the wheels, trees standing on the road.
#  Encoding (little-endian int16): per way [n, kind, surface, width (dm), flags] then n × (x, y) in dm.
#  Also a few named routes (polylines, model coordinates) for the navigation hint and the tests.
#  © OpenStreetMap contributors (ODbL) – credited with the other geodata.
import sys, os, base64; sys.path.insert(0, os.path.dirname(__file__)); from common import *
from osm import load
from shapely.geometry import LineString, box
nodes, ways = {}, {}
for f in ['ratscher.osm'] + [os.path.join('data', f'osm_outer_{i}.osm') for i in range(4)]:
    n, w, r = load(os.path.join(HERE, f)); nodes.update(n); ways.update(w)
TM = json.load(open(os.path.join(OUT, 'terrain_meta.json'))); I = TM['terrain']['inner']
X0, Y0 = I['x0'], I['y0']; X1, Y1 = X0 + (I['n'] - 1) * I['step'], Y0 + (I['n'] - 1) * I['step']
CLIP = box(X0 + 2, Y0 + 2, X1 - 2, Y1 - 2)
# kinds (index = code in the browser, world/roads.js KINDS): name, default width (m), default surface, markings (0 none, 1 centre dashed, 2 centre + edge lines)
KINDS = [('motorway', 11.5, 'concrete', 2), ('main', 6.6, 'asphalt', 2), ('county', 6.0, 'asphalt', 1), ('street', 5.0, 'asphalt', 0), ('lane', 3.6, 'asphalt', 0),
         ('service', 3.0, 'asphalt', 0), ('track', 3.0, 'ground', 0), ('path', 1.4, 'ground', 0), ('foot', 1.8, 'paving', 0)]
KI = {k[0]: i for i, k in enumerate(KINDS)}
SURF = ['asphalt', 'concrete', 'paving', 'gravel', 'ground', 'grass']
SI = {s: i for i, s in enumerate(SURF)}
SURF_OSM = {'asphalt': 'asphalt', 'paved': 'asphalt', 'chipseal': 'asphalt', 'concrete': 'concrete', 'concrete:plates': 'concrete', 'concrete:lanes': 'concrete',
            'paving_stones': 'paving', 'sett': 'paving', 'cobblestone': 'paving', 'unhewn_cobblestone': 'paving', 'bricks': 'paving', 'wood': 'paving', 'metal': 'paving',
            'gravel': 'gravel', 'fine_gravel': 'gravel', 'compacted': 'gravel', 'pebblestone': 'gravel', 'unpaved': 'ground', 'ground': 'ground', 'dirt': 'ground', 'earth': 'ground',
            'mud': 'ground', 'sand': 'ground', 'grass': 'grass', 'grass_paver': 'grass'}
def classify(t):
    hw = t.get('highway')
    if hw in ('motorway', 'motorway_link'): k = 'motorway'
    elif hw in ('trunk', 'trunk_link', 'primary', 'primary_link', 'secondary', 'secondary_link'): k = 'main'
    elif hw in ('tertiary', 'tertiary_link'): k = 'county'
    elif hw in ('residential', 'living_street', 'road', 'raceway'): k = 'street'
    elif hw == 'unclassified': k = 'lane'
    elif hw == 'service': k = 'service'
    elif hw == 'track': k = 'track'
    elif hw in ('path', 'bridleway'): k = 'path'
    elif hw in ('footway', 'pedestrian', 'cycleway'): k = 'foot'
    else: return None
    name, wd, sf, mk = KINDS[KI[k]]
    s = SURF_OSM.get(t.get('surface', ''), None)
    if s is None:
        if k == 'track': s = {'grade1': 'asphalt', 'grade2': 'gravel', 'grade3': 'ground', 'grade4': 'ground', 'grade5': 'grass'}.get(t.get('tracktype'), 'ground')
        elif k == 'path': s = 'asphalt' if 'agricultural' in t.get('motor_vehicle', '') else 'ground'
        else: s = sf
    if k == 'track' and t.get('tracktype') == 'grade1' and s == 'ground': s = 'asphalt'
    # farm and forest roads tagged as paths but open to tractors: a lane (asphalt) or a track
    if k == 'path' and ('agricultural' in t.get('motor_vehicle', '') or s in ('asphalt', 'concrete')): k = 'lane' if s in ('asphalt', 'concrete') else 'track'; wd = 3.0
    if k == 'service' and t.get('service') in ('driveway', 'parking_aisle'): wd = 2.8
    if k == 'track' and s in ('asphalt', 'concrete', 'paving'): wd = 3.0
    if k == 'lane' and t.get('name') == 'Flurweg': wd = 3.2
    try: wd = float(t['width'].replace(',', '.').replace('m', '').strip()) if 'width' in t else wd
    except ValueError: pass
    wd = float(np.clip(wd, 1.0, 14.0))
    fl = (1 if t.get('bridge') not in (None, 'no') else 0) | (2 if t.get('tunnel') not in (None, 'no') else 0)
    return KI[k], SI[s], wd, fl
# ---- the modelled site (garden/*.js: garden, neighbours, field path, stream) and OSM differ by a few metres. Inside the site zone the model
#      has its own ground, so the OSM ways there are left out; the vehicles use the modelled field path (painted ±1.6 m gravel, garden/env.js),
#      and a gravel connector leads from it south-east over the stream (a small bridge) past Bernd's paddock to the service road towards the
#      village – the OSM line itself would cut the paddock's corner and run through the modelled stream. The north-western farm track is
#      linked down to the field path. Coordinates of the zone, path and stream as in garden/env.js, garden/stream_geo.js, npc/npc.js.
SITE = json.load(open(os.path.join(REPO, 'viz3', 'site.json')))
ZONE = box(-50, -52, 42, 48)
P1, P2 = np.array(SITE['path'][0]), np.array(SITE['path'][1]); UP = (P2 - P1) / np.linalg.norm(P2 - P1)
NP = np.array([-UP[1], UP[0]]); NP = -NP if NP[1] > 0 else NP   # from the path into the gardens (the stream side)
TO = lambda t, o: P1 + UP * t + NP * o                            # path coordinates (t along, o across) → model
CUT_AT = {'1484532662': (54.0, -18.0)}                             # the service road: only from this node on (away from the zone)
def stream_c(t):   # centre line offset of the stream (garden/stream_geo.js cOff)
    ss = lambda a, b, x: (lambda u: u * u * (3 - 2 * u))(min(1, max(0, (x - a) / (b - a))))
    TB = (2.8 - (P1[0] + NP[0] * 4.6)) / UP[0]
    return 4.6 + ss(6.5, 13, abs(t - TB)) * (0.45 * np.sin(t / 6.3 + 1.1) + 0.22 * np.sin(t / 2.6 + 0.4))
def chaikin(pts, n=3):
    p = np.array(pts, float)
    for _ in range(n): q = [p[0]]; [q.extend([0.75 * a + 0.25 * b, 0.25 * a + 0.75 * b]) for a, b in zip(p[:-1], p[1:])]; q.append(p[-1]); p = np.array(q)
    return p
out = []
for wid, (refs, tags) in ways.items():
    if 'highway' not in tags or tags.get('area') == 'yes': continue
    c = classify(tags)
    if c is None: continue
    pts = [(nodes[r][0], nodes[r][1]) for r in refs if r in nodes]
    if len(pts) < 2: continue
    E = np.array(pts); mx, my = u2m(E[:, 0], E[:, 1]); ls = LineString(np.stack([mx, my], 1))
    if wid in CUT_AT:
        from shapely.ops import substring
        from shapely.geometry import Point
        d = ls.project(Point(*CUT_AT[wid])); a, b = substring(ls, 0, d), substring(ls, d, ls.length)
        ls = a if a.distance(ZONE) > b.distance(ZONE) else b
    g = ls.intersection(CLIP).difference(ZONE)
    if g.is_empty: continue
    for part in ([g] if g.geom_type == 'LineString' else [q for q in getattr(g, 'geoms', []) if q.geom_type == 'LineString']):
        part = part.simplify(0.25)
        if part.length < 3: continue
        out.append((c, np.array(part.coords), wid, tags))
# the modelled ways: field path (t −40 … 66, to the zone edge), the link from the north-western track, the connector with its bridge
KI_T, SI_G, SI_C = KI['track'], SI['gravel'], SI['concrete']
fp = np.array([TO(t, 0) for t in np.arange(-40, 66.1, 4)]); out.append(((KI_T, SI_G, 3.2, 0), fp, 'site:fieldpath', {}))
out.append(((KI_T, SI['ground'], 3.0, 0), chaikin([(-6.0, 50.0), (-8.0, 46.5), tuple(TO(7.7, 0))], 3), 'site:link', {}))
con = chaikin([TO(*q) for q in [(44, 0), (52, 0.2), (58, 1.0), (62.5, 2.6), (64.5, 4.2), (67, 6.3), (74, 10.3), (83, 16.0)]] + [(54.0, -18.0)], 3)
cl = LineString(con); sc = LineString([TO(t, stream_c(t)) for t in np.arange(40, 80, 0.5)]); xp = cl.intersection(sc)
if xp.is_empty: print('connector does not cross the stream?'); out.append(((KI_T, SI_G, 3.4, 0), con, 'site:connector', {}))
else:
    from shapely.ops import substring
    d = cl.project(xp if xp.geom_type == 'Point' else list(xp.geoms)[0])
    for a, b, fl, sf, wd in ((0, d - 2.9, 0, SI_G, 3.4), (d - 2.9, d + 2.9, 1, SI_C, 3.6), (d + 2.9, cl.length, 0, SI_G, 3.4)):   # the ditch is 4.5 m wide at the top
        out.append(((KI_T, sf, wd, fl), np.array(substring(cl, a, b).coords), 'site:connector', {}))
    q = cl.interpolate(d); print('stream bridge at', round(q.x, 1), round(q.y, 1))
print('ways', len(out), 'length km', round(sum(LineString(p).length for _, p, _, _ in out) / 1000, 1))
cnt = {}
for (k, s, wd, fl), p, _, _ in out: cnt[KINDS[k][0] + '/' + SURF[s]] = cnt.get(KINDS[k][0] + '/' + SURF[s], 0) + round(LineString(p).length)
print(sorted(cnt.items(), key=lambda kv: -kv[1]))
i16 = lambda a: np.clip(np.round(a), -32767, 32767).astype('<i2')
blob = b''.join(np.array([len(p), k, s, round(wd * 10), fl], '<i2').tobytes() + i16(p * 10).tobytes() for (k, s, wd, fl), p, _, _ in out)
npts = sum(len(p) for _, p, _, _ in out)
PUB = os.path.join(OUT, 'pub')
json.dump({'b64': base64.b64encode(blob).decode()}, open(os.path.join(PUB, 'roads.b64.json'), 'w'))
# routes: from the garden's north entrance through Ratscher to the junction at the Untere Klinge (as driven: service road, Anger,
# Geisenhöhner Weg, farm track over the L 1625, along the forest edge) – the research polylines snapped to the OSM ways above
SP_RES = os.path.join(SP, 'research', 'klinge_geo.json')
routes = {}
if os.path.exists(SP_RES):
    R = json.load(open(SP_RES)); pl = [list(map(float, TO(t, 0))) for t in (29, 36, 44)] + [list(map(float, q)) for q in con[1:]] + [[64.0, -33.0]]
    for seg in R['route'][2:]:   # from the Anger on (Ratschner Anger, Geisenhöhner Weg, farm track over the L 1625, along the forest edge)
        for q in seg['model']:
            if not pl or np.hypot(q[0] - pl[-1][0], q[1] - pl[-1][1]) > 0.5: pl.append([float(q[0]), float(q[1])])
    # snap to the nearest way centre line (the research polylines were read off the same OSM data, mostly identical)
    segs = [(LineString(p), k) for (k, s, wd, fl), p, w_, _ in out if KINDS[k][0] not in ('motorway', 'path', 'foot') and not str(w_).startswith('site:')]
    from shapely.strtree import STRtree
    tree = STRtree([g for g, _ in segs]); snapped = []
    from shapely.geometry import Point
    for k_, (x, y) in enumerate(pl):
        if k_ < 3 + len(con): snapped.append([round(x, 1), round(y, 1)]); continue   # the modelled part stays as it is
        pt = Point(x, y); i = tree.nearest(pt); g = segs[i][0]; q = g.interpolate(g.project(pt))
        snapped.append([round(q.x, 1), round(q.y, 1)] if q.distance(pt) < 6 else [round(x, 1), round(y, 1)])
    # densify to ≤ 8 m so a follower can steer along it
    dense = [snapped[0]]
    for a, b in zip(snapped, snapped[1:]):
        L = np.hypot(b[0] - a[0], b[1] - a[1]); n = max(1, int(np.ceil(L / 8)))
        for j in range(1, n + 1): dense.append([round(a[0] + (b[0] - a[0]) * j / n, 1), round(a[1] + (b[1] - a[1]) * j / n, 1)])
    routes['klinge'] = dense
    print('route klinge', len(dense), 'points', round(sum(np.hypot(b[0] - a[0], b[1] - a[1]) for a, b in zip(dense, dense[1:]))), 'm')
meta = {'file': 'roads.b64.json', 'n': len(out), 'np': npts, 'enc': 'i16', 'kinds': [k[0] for k in KINDS], 'surf': SURF, 'mark': [k[3] for k in KINDS],
        'box': [round(X0, 2), round(Y0, 2), round(X1, 2), round(Y1, 2)], 'routes': routes}
gp = os.path.join(PUB, 'geo.json'); geo = json.load(open(gp)); geo['roads'] = meta
json.dump(geo, open(gp, 'w'), separators=(',', ':'), ensure_ascii=False)
print('roads.b64.json', os.path.getsize(os.path.join(PUB, 'roads.b64.json')), 'points', npts)
# check picture: the ways over the orthophoto of the inner square (out/chk_roads.jpg)
try:
    from PIL import Image, ImageDraw
    Image.MAX_IMAGE_PIXELS = None
    T = TM['tex']['inner']; im = Image.open(os.path.join(PUB, 'ortho_inner.jpg')).convert('RGB'); S = im.size[0]; dr = ImageDraw.Draw(im)
    col = [(255, 60, 60), (255, 140, 0), (255, 220, 0), (255, 255, 255), (200, 200, 255), (160, 255, 160), (210, 160, 90), (255, 120, 220), (120, 220, 255)]
    for (k, s, wd, fl), p, _, _ in out:
        E, N = m2u(p[:, 0], p[:, 1]); px = [((e - T['e0']) / T['w'] * S, (T['n0'] + T['w'] - n) / T['w'] * S) for e, n in zip(E, N)]
        dr.line(px, fill=col[k], width=max(1, int(wd / T['w'] * S)))
    if routes.get('klinge'):
        p = np.array(routes['klinge']); E, N = m2u(p[:, 0], p[:, 1]); dr.line([((e - T['e0']) / T['w'] * S, (T['n0'] + T['w'] - n) / T['w'] * S) for e, n in zip(E, N)], fill=(0, 255, 255), width=2)
    im.save(os.path.join(OUT, 'chk_roads.jpg'), quality=85)
except Exception as e: print('check picture', e)
