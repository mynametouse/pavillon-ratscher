#!/usr/bin/env python3
"""Trusetal's known places for welt/trusetal.js (Karten-Chat, 19.11.2026; Falko 18:15: „Trusetal und Umgebung verfeinern inkl. bekannter
Gebäude und Sehenswürdigkeiten“) – from OpenStreetMap (ODbL, the editing API in pieces, cached), in model metres:

- the church (Dorfkirche Trusetal, Q16831110: footprint with its three-sided east end), the Wallenburger Turm on the Hühnberg (Q2664433,
  27.5 m), the Trusetaler Wasserfall (Q1544479: the Wasserfallgraben's last metres, the aqueduct, the fall down to the Truse), the
  Zwergen-Park (footprint and its path), the Besucherbergwerk Hühn (the adit, the mine cart), the town hall;
- the named streets of the zone (for the street in the place display of karte/karte.js), the named places (sights, inns, shops) as points;
- the ETHOS buildings that stand where a model of its own stands (church, tower) – dropped from the cells of gebaeude/z/ (--drop-cells).

  python3 -I tools/welt/zone_trusetal.py [--cache /tmp/zone-trusetal] [--drop-cells]
Writes viz3/extra/trusetal/dist/trusetal/ort.json.
"""
import argparse, glob, json, math, os, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import wlib

OUT = os.path.join(REPO, 'viz3', 'extra', 'trusetal', 'dist', 'trusetal', 'ort.json')
ZDIR = os.path.join(REPO, 'viz3', 'extra', 'welt-gebaeude', 'dist', 'gebaeude', 'z')
API = 'https://api.openstreetmap.org/api/0.6/map.json?bbox='
UA = 'pavillon-ratscher-tools/1.0 (+https://github.com/mynametouse/pavillon-ratscher)'
# OSM ids of the places (checked 19.11.2026)
CHURCH, TOWER, PARK, PARK_PATH, TOWNHALL = 194693132, 179877646, 182012161, 23442746, 248360064
FALLS = [23471777, 974611622, 974611623, 23471776]   # Wasserfallgraben (its end), the stream to the aqueduct, the aqueduct, the fall
FALL_NODE, ADIT, CART = 253875887, 8448040645, 9020104886
# the kind of a street for the place display (karte/karte.js: 0 motorway … 6 track)
KIND = {'motorway': 0, 'trunk': 1, 'primary': 1, 'secondary': 2, 'tertiary': 2, 'residential': 3, 'living_street': 3,
        'unclassified': 4, 'pedestrian': 4, 'service': 5, 'track': 6}


def to_model(e, n):
    """UTM 32N → model metres (the inverse of wlib.XF)"""
    a, b = wlib.XF['a'], wlib.XF['b']
    dx, dy = e - wlib.XF['ex'], n - wlib.XF['ey']
    d = a * a + b * b
    return (a * dx + b * dy) / d, (-b * dx + a * dy) / d


def pairs_(a):
    return [(a[i], a[i + 1]) for i in range(0, len(a) - 1, 2)]


def log(*a):
    print(time.strftime('%H:%M:%S'), *a, flush=True)


def fetch(cache, blk=None, k=3):
    """a zone's block (default wlib.TRUSE_BLK) in k x k pieces of the editing API: nodes, ways, relations by id"""
    from pyproj import Transformer
    tr = Transformer.from_crs(25832, 4326, always_xy=True)
    e0, n0, e1, n1 = blk or wlib.TRUSE_BLK
    lo0, la0 = tr.transform(e0, n0)
    lo1, la1 = tr.transform(e1, n1)
    N, W, R = {}, {}, {}
    os.makedirs(cache, exist_ok=True)
    for i in range(k):
        for j in range(k):
            fn = os.path.join(cache, f'p{i}{j}.json')
            if not os.path.exists(fn):
                a, b = lo0 + (lo1 - lo0) * i / k, lo0 + (lo1 - lo0) * (i + 1) / k
                c, d = la0 + (la1 - la0) * j / k, la0 + (la1 - la0) * (j + 1) / k
                url = API + f'{a:.5f},{c:.5f},{b:.5f},{d:.5f}'
                for tr_ in range(4):
                    try:
                        body = urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=180).read()
                        break
                    except Exception as e:
                        log('retry', i, j, e)
                        time.sleep(5 + 10 * tr_)
                else:
                    raise SystemExit('OSM API not reachable')
                open(fn, 'wb').write(body)
            for el in json.load(open(fn))['elements']:
                {'node': N, 'way': W, 'relation': R}[el['type']][el['id']] = el
    log('OSM', len(N), 'nodes', len(W), 'ways', len(R), 'relations')
    return N, W, R


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--cache', default='/tmp/zone-trusetal')
    ap.add_argument('--drop-cells', action='store_true', help='drop the ETHOS buildings under the church and the tower from gebaeude/z/')
    ap.add_argument('--zone', default='TS', help='TS (Trusetal, with its places) or another key of wlib.ZONES (streets and named places)')
    a = ap.parse_args()
    from pyproj import Transformer
    from shapely.geometry import Polygon, LineString
    if a.zone != 'TS':
        return streets_only(a)
    N, W, R = fetch(a.cache)
    ti = Transformer.from_crs(4326, 25832, always_xy=True)
    r1 = lambda v: round(v, 1)

    def pt(n):
        x, y = to_model(*ti.transform(N[n]['lon'], N[n]['lat']))
        return [r1(x), r1(y)]

    def line(wid):
        return [pt(n) for n in W[wid]['nodes'] if n in N]

    flat = lambda pts: [v for p in pts for v in p]
    out = {'v': 1, 'made': time.strftime('%Y-%m-%d'),
           'src': 'OpenStreetMap-Mitwirkende (ODbL 1.0), Stand ' + time.strftime('%d.%m.%Y') + '; tools/welt/zone_trusetal.py'}
    ch = line(CHURCH)
    out['church'] = {'f': flat(ch[:-1]), 'name': W[CHURCH]['tags'].get('name'), 'q': 'Q16831110'}
    tw = line(TOWER)[:-1]
    cx, cy = sum(p[0] for p in tw) / len(tw), sum(p[1] for p in tw) / len(tw)
    rr = sum(math.hypot(p[0] - cx, p[1] - cy) for p in tw) / len(tw)
    out['tower'] = {'c': [r1(cx), r1(cy)], 'r': round(rr, 2), 'h': float(W[TOWER]['tags'].get('height', 27.5)), 'name': 'Wallenburger Turm'}
    # the falls: from the Wasserfallgraben's last 30 m over the aqueduct and down to the Truse, one line top → bottom
    g = line(FALLS[0])
    k = len(g) - 1
    acc = 0.0
    while k > 0 and acc < 30:
        acc += math.hypot(g[k][0] - g[k - 1][0], g[k][1] - g[k - 1][1])
        k -= 1
    fl = g[k:]
    for wid in FALLS[1:]:
        for p in line(wid):
            if p != fl[-1]:
                fl.append(p)
    out['falls'] = {'p': flat(fl), 'top': pt(FALL_NODE), 'name': 'Trusetaler Wasserfall', 'q': 'Q1544479'}
    out['park'] = {'f': flat(line(PARK)[:-1]), 'path': flat(line(PARK_PATH)), 'name': 'Zwergen-Park Trusetal'}
    out['mine'] = {'adit': pt(ADIT), 'cart': pt(CART), 'name': 'Besucherbergwerk Hühn'}
    out['townhall'] = {'f': flat(line(TOWNHALL)[:-1]), 'name': 'Rathaus'}
    # named places (points): sights, inns, shops, town hall, school …
    pois = []
    want = lambda t: (t.get('name') and (t.get('tourism') in ('attraction', 'museum', 'theme_park', 'viewpoint', 'hotel', 'guest_house')
                      or t.get('historic') or t.get('amenity') in ('place_of_worship', 'townhall', 'school', 'restaurant', 'cafe', 'pub',
                      'pharmacy', 'post_office', 'fire_station', 'bank', 'kindergarten') or t.get('shop') or t.get('natural') == 'peak'
                      or t.get('man_made') in ('adit', 'tower')))
    for el in list(N.values()) + list(W.values()):
        t = el.get('tags') or {}
        if not want(t):
            continue
        if el['type'] == 'node':
            p = pt(el['id'])
        else:
            q = line(el['id'])
            if not q:
                continue
            p = [r1(sum(v[0] for v in q) / len(q)), r1(sum(v[1] for v in q) / len(q))]
        kind = t.get('tourism') or t.get('historic') and 'historic' or t.get('amenity') or (t.get('shop') and 'shop') or t.get('natural') or t.get('man_made')
        pois.append([t['name'], kind, p[0], p[1]])
    pois.sort()
    out['pois'] = pois
    # named streets
    st = []
    for w in W.values():
        t = w.get('tags') or {}
        kd = KIND.get(t.get('highway'))
        if kd is None or not (t.get('name') or t.get('ref')):
            continue
        q = line(w['id'])
        if len(q) >= 2:
            st.append({'name': t.get('name', ''), 'ref': t.get('ref', ''), 'kind': kd, 'p': flat(q)})
    st.sort(key=lambda s: (s['name'], s['p'][0]))
    out['streets'] = st
    log('church', len(ch) - 1, 'corners; tower r', round(rr, 2), '; falls', len(fl), 'points; pois', len(pois), '; streets', len(st))
    # the ETHOS buildings under the church and the tower (a model of its own stands there)
    cut = [Polygon(ch).buffer(1.0), Polygon(tw).buffer(1.0)]
    drop = []
    idx_fn = os.path.join(ZDIR, 'index.json')
    idx = json.load(open(idx_fn))
    for key in idx['cells']:
        i, j = (int(v) for v in key.split('_'))
        if i > -50:
            continue
        fn = os.path.join(ZDIR, key + '.json')
        d = json.load(open(fn))
        keep = []
        for b in d['b']:
            fp = b['f']
            g = Polygon([(fp[k], fp[k + 1]) for k in range(0, len(fp), 2)]).buffer(0)
            if any(g.intersection(c).area > 0.5 * g.area for c in cut):
                drop.append(b['id'])
            else:
                keep.append(b)
        if len(keep) != len(d['b']) and a.drop_cells:
            d['b'] = keep
            json.dump(d, open(fn, 'w'), separators=(',', ':'), ensure_ascii=False)
            idx['cells'][key] = len(keep)
    if a.drop_cells and drop:
        json.dump(idx, open(idx_fn, 'w'), separators=(',', ':'), ensure_ascii=False)
    out['dropped'] = drop
    # the buildings in the gnome park (no gnome inside them)
    park = Polygon(pairs_(out['park']['f'])).buffer(3)
    holes = []
    for key in idx['cells']:
        i, j = (int(v) for v in key.split('_'))
        if i > -50:
            continue
        for b in json.load(open(os.path.join(ZDIR, key + '.json')))['b']:
            fp = b['f']
            g = Polygon([(fp[k], fp[k + 1]) for k in range(0, len(fp), 2)]).buffer(0)
            if g.intersects(park):
                holes.append([r1(v) for v in fp])
    out['park']['bld'] = holes
    log('buildings in the gnome park:', len(holes))
    log('ETHOS buildings under the models:', drop, '(dropped from the cells)' if a.drop_cells else '(dry)')
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    json.dump(out, open(OUT, 'w'), separators=(',', ':'), ensure_ascii=False)
    log('wrote', OUT, os.path.getsize(OUT) // 1024, 'kB')


def named(N, W, pt, line, r1):
    """the named places (points) and the named streets of an OSM dump"""
    want = lambda t: (t.get('name') and (t.get('tourism') in ('attraction', 'museum', 'theme_park', 'viewpoint', 'hotel', 'guest_house')
                      or t.get('historic') or t.get('amenity') in ('place_of_worship', 'townhall', 'school', 'restaurant', 'cafe', 'pub',
                      'pharmacy', 'post_office', 'fire_station', 'bank', 'kindergarten', 'theatre', 'cinema', 'hospital', 'library')
                      or t.get('shop') or t.get('natural') == 'peak' or t.get('railway') == 'station' or t.get('man_made') in ('adit', 'tower')))
    pois = []
    for el in list(N.values()) + list(W.values()):
        t = el.get('tags') or {}
        if not want(t):
            continue
        if el['type'] == 'node':
            p = pt(el['id'])
        else:
            q = line(el['id'])
            if not q:
                continue
            p = [r1(sum(v[0] for v in q) / len(q)), r1(sum(v[1] for v in q) / len(q))]
        kind = (t.get('tourism') or (t.get('historic') and 'historic') or t.get('amenity') or (t.get('shop') and 'shop') or t.get('natural')
                or t.get('railway') or t.get('man_made'))
        pois.append([t['name'], kind, p[0], p[1]])
    pois.sort()
    st = []
    for w in W.values():
        t = w.get('tags') or {}
        kd = KIND.get(t.get('highway'))
        if kd is None or not (t.get('name') or t.get('ref')):
            continue
        q = line(w['id'])
        if len(q) >= 2:
            st.append({'name': t.get('name', ''), 'ref': t.get('ref', ''), 'kind': kd, 'p': [v for p in q for v in p]})
    st.sort(key=lambda s: (s['name'], s['p'][0]))
    return pois, st


def drop_under(polys, apply):
    """the ETHOS buildings of the cells (zones west of x -50 cells) more than half under one of polys; dropped when apply"""
    from shapely.geometry import Polygon
    idx_fn = os.path.join(ZDIR, 'index.json')
    idx = json.load(open(idx_fn))
    drop = []
    for key in idx['cells']:
        if int(key.split('_')[0]) > -40:
            continue
        fn = os.path.join(ZDIR, key + '.json')
        d = json.load(open(fn))
        keep = []
        for b in d['b']:
            fp = b['f']
            g = Polygon([(fp[k], fp[k + 1]) for k in range(0, len(fp), 2)]).buffer(0)
            (drop if any(g.intersection(c).area > 0.5 * g.area for c in polys) else keep).append(b if g.area else b)
            if drop and drop[-1] is b:
                drop[-1] = b['id']
        if apply and len(keep) != len(d['b']):
            d['b'] = keep
            json.dump(d, open(fn, 'w'), separators=(',', ':'), ensure_ascii=False)
            idx['cells'][key] = len(keep)
    if apply and drop:
        json.dump(idx, open(idx_fn, 'w'), separators=(',', ':'), ensure_ascii=False)
    return drop


def landmarks_mg(W, line, r1, a):
    """Meiningen: the Stadtkirche (Q2327360: its west towers, the hall, the choir) and the theatre (Q486132: the body, the portico)"""
    from shapely.geometry import Polygon, box as sbox
    from shapely import affinity
    out = {}
    ch = line(500215490)[:-1]
    P = Polygon(ch).buffer(0)
    # the axis: the longest edge of the hull's minimum rectangle, pointing east
    mr = list(P.minimum_rotated_rectangle.exterior.coords)[:4]
    e = max([(mr[i], mr[(i + 1) % 4]) for i in range(4)], key=lambda q: math.dist(*q))
    ax = [(e[1][0] - e[0][0]) / math.dist(*e), (e[1][1] - e[0][1]) / math.dist(*e)]
    if ax[0] < 0:
        ax = [-ax[0], -ax[1]]
    c = P.centroid
    U = lambda p: (p[0] - c.x) * ax[0] + (p[1] - c.y) * ax[1]
    V = lambda p: -(p[0] - c.x) * ax[1] + (p[1] - c.y) * ax[0]
    W_ = lambda u, v: [r1(c.x + ax[0] * u - ax[1] * v), r1(c.y + ax[1] * u + ax[0] * v)]
    us, vs = [U(p) for p in ch], [V(p) for p in ch]
    u0, u1, v0, v1 = min(us), max(us), min(vs), max(vs)
    T = 8.6   # the depth of the tower block (OSM: the west front to the hall)
    hull = P.convex_hull
    half = sbox(-1e4, -1e4, 1e4, 1e4)
    cut = Polygon([W_(u0 + T, v0 - 5), W_(u1 + 5, v0 - 5), W_(u1 + 5, v1 + 5), W_(u0 + T, v1 + 5)])
    roof = list(hull.intersection(cut).exterior.coords)[:-1]
    tw = (v1 - v0 - 4.5) / 2   # two towers and the bay between them (4.5 m)
    out['church'] = {'f': [v for p in ch for v in p], 'roof': [r1(v) for p in roof for v in p], 'ax': [round(v, 4) for v in ax],
                     'towers': [W_(u0 + T / 2, v0 + tw / 2), W_(u0 + T / 2, v1 - tw / 2)], 'tw': round(min(tw, T), 2),
                     'bay': W_(u0, (v0 + v1) / 2), 'name': 'Stadtkirche Unserer lieben Frauen', 'q': 'Q2327360'}
    th = line(49286126)[:-1]
    Q = Polygon(th).buffer(0)
    xs = [p[0] for p in th]
    x0 = min(xs)
    body = Q.difference(sbox(x0 - 1, -1e6, x0 + 8.0, 1e6))
    py = [p[1] for p in th if p[0] < x0 + 1.5]   # the portico's front: the vertices of the west face
    out['theatre'] = {'body': [r1(v) for p in list(body.exterior.coords)[:-1] for v in p],
                      'front': [[r1(x0), r1(min(py))], [r1(x0), r1(max(py))]], 'depth': 8.0, 'name': 'Meininger Staatstheater', 'q': 'Q486132'}
    out['dropped'] = drop_under([P.buffer(1.0), Q.buffer(1.0)], a.drop_cells)
    log('Meiningen: church axis', out['church']['ax'], 'towers', out['church']['towers'], 'tower', out['church']['tw'], 'm; theatre front',
        out['theatre']['front'], '; ETHOS under them', out['dropped'])
    return out


def streets_only(a):
    """another zone (wlib.ZONES[a.zone]): its named streets and places → viz3/extra/<name>/dist/<name>/ort.json"""
    from pyproj import Transformer
    z = wlib.ZONES[a.zone]
    blk = wlib.PLANS[a.zone][8]
    N, W, R = fetch(os.path.join(a.cache, z['name']), blk, 4)
    ti = Transformer.from_crs(4326, 25832, always_xy=True)
    r1 = lambda v: round(v, 1)

    def pt(n):
        x, y = to_model(*ti.transform(N[n]['lon'], N[n]['lat']))
        return [r1(x), r1(y)]

    def line(wid):
        return [pt(n) for n in W[wid]['nodes'] if n in N]

    pois, st = named(N, W, pt, line, r1)
    lm = landmarks_mg(W, line, r1, a) if a.zone == 'MG' else {}
    out = {**lm, 'v': 1, 'made': time.strftime('%Y-%m-%d'), 'zone': z['name'], 'pois': pois, 'streets': st,
           'src': 'OpenStreetMap-Mitwirkende (ODbL 1.0), Stand ' + time.strftime('%d.%m.%Y') + '; tools/welt/zone_trusetal.py --zone ' + a.zone}
    fn = os.path.join(REPO, 'viz3', 'extra', z['name'], 'dist', z['name'], 'ort.json')
    os.makedirs(os.path.dirname(fn), exist_ok=True)
    json.dump(out, open(fn, 'w'), separators=(',', ':'), ensure_ascii=False)
    log(z['name'], len(pois), 'places,', len(st), 'streets →', fn, os.path.getsize(fn) // 1024, 'kB')


if __name__ == '__main__':
    main()
