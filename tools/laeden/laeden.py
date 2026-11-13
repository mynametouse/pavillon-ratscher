#!/usr/bin/env python3
"""The shops of Schleusingen as what they are (feat/laeden): the data for viz3/src/laeden/laeden.js.

  python3 -I tools/laeden/laeden.py CACHE_DIR [--debug DIR]

For each shop its building (outline from OpenStreetMap; the parts and their heights from ETHOS.BUILDA – the main hall, the entrance
annex, a portal, the lower wings), its entrances (OSM entrance=* where it has one; else after the rules of
docs/plans/daten_gebaeudetypen.md – the wide main door on the side towards its car park, the delivery at the back – and placed where the
orthophoto 2024 shows the vestibule or the canopy), its lettering (the real name in plain letters, never a logo), its car parks (OSM
amenity=parking with the aisles OSM draws through them: 2.5 x 5 m bays at right angles on both sides of each aisle), the kerbs, lamps
and trolley shelters, the drive-in lane of McDonald's (OSM service=drive-through, its direction) and the forecourt of the Shell
station. Also the ETHOS buildings the shops replace (gebaeude/gebaeude.js leaves them out) and the old-town houses they replace
(welt/schleusingen.js: McDonald's and Lidl stand in its zone).

Sources: OSM API 0.6 in small tiles (cached in CACHE_DIR, one call a second; the same tiles as tools/daten/osm_extrakt.py) –
© OpenStreetMap contributors, ODbL 1.0; ETHOS.BUILDA (Forschungszentrum Jülich, ODbL 1.0) from viz3/extra/welt-gebaeude/dist/gebaeude/z/;
positions read by eye from the orthophoto DOP 2024 (© GDI-Th, dl-de/by-2-0) where OSM has none (marked src 'luftbild').
Output: viz3/extra/laeden/dist/laeden/laeden.json (model metres: x east, y north). --debug DIR draws everything over the orthophoto
(analysis copies only – never commit the photos). Needs pyproj, shapely (and Pillow, numpy for --debug)."""
import glob, json, math, os, sys, time, urllib.request, urllib.error
import xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(REPO, 'tools', 'welt-gebaeude'))
import wglib  # noqa: E402  (the model frame: wglib.to_model / to_utm)

OUT = os.path.join(REPO, 'viz3', 'extra', 'laeden', 'dist', 'laeden', 'laeden.json')
ZDIR = os.path.join(REPO, 'viz3', 'extra', 'welt-gebaeude', 'dist', 'gebaeude', 'z')
STADT = os.path.join(REPO, 'viz3', 'extra', 'schleusingen', 'dist', 'schleusingen', 'stadt.json')
UA = 'pavillon-ratscher laeden/1.0 (open data for a hobby 3D map; github.com/mynametouse/pavillon-ratscher)'
AREA = (50.49684, 10.72576, 50.52261, 10.77567)  # S, W, N, E – Schleusingen, as tools/daten/osm_extrakt.py
TILE = 0.0125

# ---------------------------------------------------------------------------------------------------------------------------------
# The shops. Doors: 'osm' = an entrance node of OSM; 'luftbild' = the vestibule or canopy the orthophoto 2024 shows there (read by
# eye); 'regel' = the rule of daten_gebaeudetypen.md (the side towards the car park, the middle of that front). A point (x, y) near
# the facade is enough – it is moved onto the nearest wall. Parts: ETHOS buildings that make up the shop (their heights), each cut to
# the shop's outline unless 'own' (an annex or portal outside the OSM outline). Signs: on the facade nearest to the point, z = the
# letters' lower edge above the foot, h = height of the band.
# ---------------------------------------------------------------------------------------------------------------------------------
SHOPS = [
    dict(id='obi', way=34215009, art='Baumarkt', name='OBI', col='hell',
         parts=[('DEG_DETHL57P0000Lysh', 9.8), ('DEG_DETHL57P0000Lytd', 10.5), ('DEG_DETHL57P0000Lyti', 8.5), ('DEG_DETHL57P0000LyrC', 6.0)],
         annex=[dict(ids=['DEG_DETHL57P0000LCFD', 'DEG_DETHL57P0000Lytg', 'DEG_DETHL57P00014hQx', 'DEG_DETHL57P00014hQB'], h=3.9,
                     what='Windfang mit Kassenzone', glass=True),
                dict(ids=['DEG_DETHL57P00014hQy'], h=6.6, what='Portal am Eingang', sign='OBI'),
                dict(ids=['DEG_DETHL57P0000Lytj'], h=5.4, what='Gartencenter (Warmhaus)', roof='glas'),
                dict(box=[(-981.5, 1798.0), (-963.5, 1791.5), (-958.0, 1807.0), (-976.0, 1813.5)], h=4.6, what='Gartencenter (Kalthaus)',
                     roof='glas', walls='glas')],
         doors=[dict(k='main', at=(-958.5, 1866.0), w=2.6, src='luftbild', who='OBI', annex=0),
                dict(k='side', at=(-967.0, 1816.0), w=2.0, src='luftbild', who='OBI Gartencenter', annex=2),
                dict(k='liefer', at=(-905.0, 1879.0), w=4.0, src='regel'),
                dict(k='liefer', at=(-920.0, 1883.5), w=4.0, src='regel')],
         signs=[dict(t='OBI', at=(-953.0, 1862.0), z=4.6, h=3.0, st=0), dict(t='OBI', at=(-890.0, 1867.0), z=6.2, h=2.6, st=0)],
         lots=[55843094], pylon=dict(at=(-996.0, 1896.0), texts=['OBI', 'Baumarkt · Gartencenter'], h=9.0),
         carts=[(-972.0, 1861.0)]),
    dict(id='mega', way=34214973, art='Einkaufszentrum', name='Mega Center', col='hell',
         parts=[('DEG_DETHL57P0000LyrQ', 10.6)],
         # the delivery loop round the building (OSM service road, one way) and the yard inside it: on the shop's level – the 30 m
         # surface model puts the roof and the forest east of it there, 10 m above the floor
         yard=dict(ways=[226334824], w=6.0),
         annex=[dict(ids=['DEG_DETHL57P0000LCFS'], h=10.8, what='Eingangsportal Süd', glass=True, portal=True, sign='MEGA CENTER'),
                dict(ids=['DEG_DETHL57P0000LCFT'], h=10.9, what='Eingangsportal Nord', glass=True, portal=True, sign='ALDI'),
                dict(ids=['DEG_DETHL57P0000LCFC'], h=12.5, what='Turm am Restaurant', sign='MEGA CENTER')],
         doors=[dict(k='main', at=(-937.5, 1981.4), w=2.4, src='luftbild', who='Mega Center', annex=0),
                dict(k='main', at=(-922.6, 2026.6), w=2.4, src='luftbild', who='Aldi', annex=1,
                     oh='Mo-Sa 07:00-20:00; Su off', art='Discounter'),
                dict(k='main', at=(-885.5, 2065.4), w=2.0, src='regel', who='Mega-Restaurant', art='Restaurant'),
                dict(k='main', at=(-842.0, 2092.0), w=2.6, src='regel', who='Mega-Möbel', art='Möbelhaus'),
                dict(k='side', at=(-865.0, 2075.0), w=1.6, src='regel', who='Spangenberg-Apotheke', art='Apotheke',
                     oh='Mo-Fr 08:00-19:00; Sa 08:00-16:00'),
                dict(k='liefer', at=(-845.0, 1935.0), w=4.0, src='luftbild'),
                dict(k='liefer', at=(-849.0, 1917.0), w=4.0, src='luftbild'),
                dict(k='liefer', at=(-838.5, 1985.0), w=4.0, src='luftbild')],
         signs=[dict(t='MEGA CENTER', at=(-935.0, 1975.0), z=6.6, h=2.4, st=0),
                dict(t='ALDI', at=(-919.0, 2034.0), z=6.6, h=2.4, st=1),
                dict(t='Mega-Restaurant', at=(-881.0, 2064.0), z=4.2, h=1.3, st=2),
                dict(t='Mega-Möbel', at=(-830.0, 2088.0), z=6.2, h=2.6, st=1),
                dict(t='Apotheke', at=(-865.0, 2075.0), z=3.4, h=0.9, st=3)],
         board=dict(at=(-930.0, 1995.0), title='Mega Center',
                    names=['Aldi', 'JYSK', 'Mäc-Geiz', 'KiK', 'Febana', "Ernsting's family", 'Müller', 'Deichmann',
                           'Café & Backshop Drei Ähren', 'Uhren Schmuck', 'Friseur', 'Zoofachhandel', 'AWG-Modecenter', 'Repo-Markt',
                           'Mega-Restaurant', 'Mega-Möbel', 'Spangenberg-Apotheke']),
         lots=[160476205], pylon=dict(at=(-958.0, 2063.0), texts=['MEGA CENTER', 'ALDI', 'Mega-Möbel'], h=11.0),
         carts=[(-930.0, 2015.0), (-940.0, 1996.0)]),
    dict(id='edeka', way=45896502, art='Supermarkt', name='EDEKA', col='weiss',
         parts=[('DEG_DETHL57P00012tG2', 7.2), ('DEG_DETHL57P00012tG4', 5.5)],
         annex=[dict(ids=['DEG_DETHL57P00012tGg'], h=4.5, what='Windfang', glass=True)],
         doors=[dict(k='main', at=(-861.0, 2161.6), w=2.4, src='luftbild', who='EDEKA', annex=0),
                dict(k='liefer', at=(-812.0, 2124.0), w=4.0, src='regel')],
         signs=[dict(t='EDEKA', at=(-846.0, 2150.5), z=4.6, h=2.0, st=1)],
         lots=[300487853], carts=[(-842.0, 2168.0)]),
    dict(id='getraenke', way=45896503, art='Getränkemarkt', name='Getränkequelle', col='hell',
         parts=[('DEG_DETHL57P00012tGl', 8.4)],
         doors=[dict(k='main', at=(-850.0, 2214.0), w=2.0, src='regel', who='Getränkequelle')],
         signs=[dict(t='Getränkequelle', at=(-851.0, 2218.0), z=4.0, h=1.2, st=1)],
         lots=[300487855]),
    dict(id='zeile40', way=1021732056, art='Ladenzeile', name='Suhler Straße 40', col='putz',
         parts=[('DEG_DETHL57P00012tGk', 4.4)],
         doors=[dict(k='main', at=(-838.0, 2203.8), w=1.4, src='regel', who='Turan Kebap Haus', art='Imbiss'),
                dict(k='main', at=(-822.0, 2198.3), w=1.4, src='regel', who='Wäscheservice', art='Wäscheservice',
                     oh='Mo-Fr 09:00-18:00')],
         signs=[dict(t='Turan Kebap Haus', at=(-836.0, 2203.0), z=3.45, h=0.75, st=2),
                dict(t='Wäscheservice', at=(-822.0, 2198.3), z=3.45, h=0.75, st=3)]),
    dict(id='shell', way=358207615, art='Tankstelle', name='Shell', col='weiss',
         parts=[('DEG_DETHL57P0000Lyrz', 4.2), ('DEG_DETHL57P0001eBgC', 3.7)],
         doors=[dict(k='main', at=(-902.0, 2277.0), w=1.8, src='regel', who='Shell')],
         signs=[dict(t='Shell', at=(-898.0, 2276.0), z=3.3, h=0.7, st=1)],
         fuel=dict(way=56000335, h=5.2),
         pylon=dict(at=(-921.0, 2290.0), texts=['Shell'], h=7.0, prices=True)),
    dict(id='mcd', way=128886071, art='Schnellrestaurant', name="McDonald's", col='dunkel', roof='dunkel',
         parts=[('osm', 4.6)], stadt=("McDonald's", 'Kurhausstraße 1a'),
         annex=[dict(ids=['DEG_DETHL57P0000LzqP'], h=3.1, what='Nebenraum')],
         doors=[dict(k='main', osm=9423643848, w=2.0, who="McDonald's")],
         signs=[dict(t="McDonald's", at=(-1090.0, 1714.5), z=3.0, h=1.0, st=1),
                dict(t="McDonald's", at=(-1103.0, 1704.0), z=3.0, h=1.0, st=1)],
         drive=dict(way=110310970), lots=[128886077],
         pylon=dict(at=(-1078.0, 1724.5), texts=["McDonald's", 'Drive-in'], h=8.0)),
    dict(id='lidl', way=185486341, art='Discounter', name='Lidl', col='hell', roof='rotbraun',
         parts=[('osm', 6.2)], stadt=('Lidl', 'Jägerhausstraße 8'), h_src='faustwert',
         doors=[dict(k='main', at=(-1062.5, 1441.5), w=2.4, src='luftbild', who='Lidl'),
                dict(k='side', at=(-1052.5, 1452.5), w=1.6, src='regel', who='Café & Backshop Drei Ähren', art='Bäckerei',
                     oh='Mo-Fr 08:00-18:00; Sa 08:00-12:00; Su,PH off'),
                dict(k='liefer', at=(-1042.0, 1421.0), w=4.0, src='regel')],
         signs=[dict(t='LIDL', at=(-1059.0, 1445.5), z=3.8, h=1.8, st=1),
                dict(t='Café & Backshop Drei Ähren', at=(-1052.5, 1452.5), z=3.3, h=0.55, st=3)],
         lots=[55533801], carts=[(-1070.0, 1452.0)],
         pylon=dict(at=(-1105.0, 1468.0), texts=['LIDL'], h=8.0)),
    dict(id='rewe', way=55463189, art='Supermarkt', name='REWE', col='weiss', roof='weiss',
         parts=[('DEG_DETHL57P00012az4', 6.6), ('DEG_DETHL57P00012az2', 4.8)],
         doors=[dict(k='main', osm=2725921022, w=2.4, who='REWE'),
                dict(k='liefer', at=(-1730.0, 925.0), w=4.0, src='regel')],
         signs=[dict(t='REWE', at=(-1762.0, 897.0), z=3.6, h=1.8, st=1)],
         lots=[55463190], carts=[(-1781.0, 905.0)],
         pylon=dict(at=(-1786.0, 868.0), texts=['REWE'], h=8.0)),
]
# small shops in houses that stay as they are (ETHOS houses of gebaeude/gebaeude.js): a door and a sign on the facade nearest to 'at'
IN_HOUSES = [
    dict(id='waldrand', name='Am Waldrand', art='Gaststätte', ethos='DEG_DETHL57P0000LyqD', at=(-952.5, 2239.0), sign='Gaststätte Am Waldrand',
         addr='Suhler Straße 81'),
]
# opening hours of shops whose POI is a node inside a building (OSM)
OH_NODES = {'obi': None}
ART_OF = {'doityourself': 'Baumarkt', 'mall': 'Einkaufszentrum', 'supermarket': 'Supermarkt', 'beverages': 'Getränkemarkt'}
MAIN_ROADS = {'motorway', 'trunk', 'primary', 'secondary', 'tertiary', 'secondary_link', 'tertiary_link', 'primary_link',
              'residential', 'unclassified', 'living_street'}
BAY_W, BAY_D, AISLE = 2.5, 5.0, 6.0


# ------------------------------------------------------------- OSM -------------------------------------------------------------
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
            if ex.code == 400:  # too many nodes: split
                return None
            time.sleep(5 * (attempt + 1))
        except Exception:
            time.sleep(5 * (attempt + 1))
    raise RuntimeError('OSM API failed for ' + url)


def tiles(box, step):
    s, w, n, e = box
    out, la = [], s
    while la < n:
        lo = w
        while lo < e:
            out.append((la, lo, min(la + step, n), min(lo + step, e)))
            lo += step
        la += step
    return out


def load_osm(cache):
    os.makedirs(cache, exist_ok=True)
    nodes, ways = {}, {}
    todo = tiles(AREA, TILE)
    while todo:
        s, w, n, e = todo.pop()
        fn = fetch_tile(cache, s, w, n, e)
        if fn is None:
            todo += tiles((s, w, n, e), (n - s) / 2)
            continue
        for _, el in ET.iterparse(fn):
            if el.tag == 'node':
                nodes[int(el.get('id'))] = (float(el.get('lat')), float(el.get('lon')), {x.get('k'): x.get('v') for x in el.findall('tag')})
            elif el.tag == 'way':
                ways[int(el.get('id'))] = ([int(x.get('ref')) for x in el.findall('nd')], {x.get('k'): x.get('v') for x in el.findall('tag')})
            if el.tag in ('node', 'way', 'relation'):
                el.clear()
    return nodes, ways


# ------------------------------------------------------------- geometry ---------------------------------------------------------
def r1(v):
    return round(v, 2)


def flat(poly):
    """a shapely polygon's outer ring, CCW, without the closing point, as [x, y, x, y, …]"""
    from shapely.geometry.polygon import orient
    p = orient(poly, sign=1.0)
    c = list(p.exterior.coords)[:-1]
    return [r1(v) for q in c for v in q]


def ring_of(f):
    return [(f[i], f[i + 1]) for i in range(0, len(f), 2)]


def opened(P, r=0.4):
    """needles and slivers thinner than 2 r cut off (an ETHOS outline cut to the OSM one can run out into a needle along a wall: OBI's
    part Lyti 10 m, REWE's 28 m); square corners stay square (mitred), the polygon never grows"""
    Q = P.buffer(-r, join_style=2, mitre_limit=10).buffer(r, join_style=2, mitre_limit=10).intersection(P).buffer(0)
    if Q.is_empty:
        return P
    return Q.simplify(0.05)


def snap_to_facade(f, x, y):
    """the nearest point on the outline f (CCW) to (x, y): (px, py, outward nx, ny, edge index, u along it, edge length)"""
    R = ring_of(f)
    best = None
    for i in range(len(R)):
        ax, ay = R[i]
        bx, by = R[(i + 1) % len(R)]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy)
        if L < 0.3:
            continue
        t = max(0.0, min(1.0, ((x - ax) * dx + (y - ay) * dy) / (L * L)))
        px, py = ax + dx * t, ay + dy * t
        d = math.hypot(x - px, y - py)
        if best is None or d < best[0]:
            best = (d, px, py, dy / L, -dx / L, i, t * L, L)
    return best[1:]


# ------------------------------------------------------------- ETHOS ------------------------------------------------------------
def load_ethos():
    E = {}
    for fn in glob.glob(os.path.join(ZDIR, '*.json')):
        if fn.endswith('index.json'):
            continue
        for b in json.load(open(fn))['b']:
            E[b['id']] = b
    return E


def ethos_poly(b):
    from shapely.geometry import Polygon
    f = b['f']
    return Polygon(list(zip(f[0::2], f[1::2]))).buffer(0)


# ------------------------------------------------------------- opening hours ----------------------------------------------------
def poi_hours(nodes, ways, shop_way, name):
    """opening hours of the shop: its building way, else a node with the same name inside or within 3 m of it"""
    t = ways[shop_way][1]
    if t.get('opening_hours'):
        return t['opening_hours']
    return None


# ------------------------------------------------------------- bays -------------------------------------------------------------
def bays_of(lot, aisles, blockers):
    """2.5 x 5 m bays at right angles on both sides of each aisle segment inside the lot; inside the lot (0.2 m in), off every aisle's
    lane, off the blockers (buildings, roads), not overlapping each other. Without aisles: rows along the lot's long axis (as
    tools/welt-dinge/plaetze.py). Returns [(cx, cy, az of the car's front in compass degrees, polygon)]"""
    from shapely.geometry import Polygon, LineString
    from shapely.ops import unary_union
    inner = lot.buffer(-0.2)
    lanes = unary_union([a.buffer(AISLE / 2 - 0.05, cap_style=2) for a in aisles]) if aisles else None
    blk = unary_union(blockers) if blockers else None
    out = []

    def add(cx, cy, ux, uy, vx, vy):
        # u: along the row (bay width), v: into the bay from the aisle (bay depth); the car looks back to the aisle (it drove in forwards)
        P = Polygon([(cx + sx * ux * BAY_W / 2 + sy * vx * BAY_D / 2, cy + sx * uy * BAY_W / 2 + sy * vy * BAY_D / 2)
                     for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))])
        if not inner.contains(P):
            return
        if lanes is not None and P.intersection(lanes).area > 0.05:
            return
        if blk is not None and P.intersects(blk):
            return
        for q in out:
            if abs(q[0] - cx) < 6 and abs(q[1] - cy) < 6 and q[3].intersection(P).area > 0.05:
                return
        az = math.degrees(math.atan2(vx, vy)) % 360  # pointing into the bay (front first)
        out.append((cx, cy, az, P))

    if aisles:
        for A in aisles:
            cs = list(A.coords)
            for (ax, ay), (bx, by) in zip(cs, cs[1:]):
                L = math.hypot(bx - ax, by - ay)
                if L < BAY_W:
                    continue
                ux, uy = (bx - ax) / L, (by - ay) / L
                for side in (1, -1):
                    vx, vy = -uy * side, ux * side
                    off = AISLE / 2 + BAY_D / 2
                    n = int(L // BAY_W)
                    s0 = (L - n * BAY_W) / 2 + BAY_W / 2
                    for k in range(n):
                        s = s0 + k * BAY_W
                        add(ax + ux * s + vx * off, ay + uy * s + vy * off, ux, uy, vx, vy)
    else:
        mrr = lot.minimum_rotated_rectangle
        c = list(mrr.exterior.coords)
        e0 = (c[1][0] - c[0][0], c[1][1] - c[0][1])
        e1 = (c[2][0] - c[1][0], c[2][1] - c[1][1])
        long_e = e0 if math.hypot(*e0) >= math.hypot(*e1) else e1
        L = math.hypot(*long_e)
        ux, uy = long_e[0] / L, long_e[1] / L
        vx, vy = -uy, ux
        cx0, cy0 = lot.centroid.x, lot.centroid.y
        span = 200
        for row in range(-12, 13):
            # rows: back to back pairs with an aisle between the pairs (5 + 5 + 6)
            off = (row // 2) * (2 * BAY_D + AISLE) + (BAY_D / 2 if row % 2 == 0 else -BAY_D / 2 - 0.0)
            sgn = 1 if row % 2 == 0 else -1
            for k in range(-int(span / BAY_W), int(span / BAY_W)):
                add(cx0 + ux * k * BAY_W + vx * off, cy0 + uy * k * BAY_W + vy * off, ux, uy, vx * sgn, vy * sgn)
    return out


# ------------------------------------------------------------- main -------------------------------------------------------------
def main():
    from pyproj import Transformer
    from shapely.geometry import Polygon, Point, LineString, MultiPolygon
    from shapely.ops import unary_union
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        return 2
    cache = args[0]
    debug = args[args.index('--debug') + 1] if '--debug' in args else None
    T = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)

    def mxy(lat, lon):
        E, N = T.transform(lon, lat)
        x, y = wglib.to_model(E, N)
        return x, y

    nodes, ways = load_osm(cache)
    print('OSM:', len(nodes), 'nodes', len(ways), 'ways', flush=True)
    NXY = {}

    def nxy(nid):
        if nid not in NXY:
            la, lo, _ = nodes[nid]
            NXY[nid] = mxy(la, lo)
        return NXY[nid]

    def way_pts(wid):
        return [nxy(r) for r in ways[wid][0] if r in nodes]

    def way_poly(wid):
        return Polygon(way_pts(wid)).buffer(0)

    ETH = load_ethos()
    print('ETHOS:', len(ETH), 'buildings in the cells', flush=True)
    # main roads (for the pads: never level a road) and the service ways (aisles)
    roads, services = [], []
    for wid, (refs, t) in ways.items():
        hw = t.get('highway')
        if not hw:
            continue
        pts = way_pts(wid)
        if len(pts) < 2:
            continue
        if hw in MAIN_ROADS:
            lanes = int(t.get('lanes', '2').split(';')[0]) if t.get('lanes', '2').split(';')[0].isdigit() else 2
            roads.append((LineString(pts), max(2, lanes) * 3.25 / 2 + 1.8, wid))
        elif hw == 'service':
            services.append((LineString(pts), t, wid))
    shops_out, lots_out, props, pads, skip_ethos, skip_stadt = [], [], [], [], set(), []
    debug_draw = []

    def door_at(f, spec, parts_union):
        if spec.get('osm'):
            x, y = nxy(spec['osm'])
            src = 'osm'
        else:
            x, y = spec['at']
            src = spec.get('src', 'regel')
        px, py, nx, ny, ei, u, L = snap_to_facade(f, x, y)
        return dict(x=r1(px), y=r1(py), nx=round(nx, 4), ny=round(ny, 4), w=spec.get('w', 2.0), k=spec['k'], src=src,
                    who=spec.get('who'), art=spec.get('art'), oh=spec.get('oh'), annex=spec.get('annex'))

    for S in SHOPS:
        w = S['way']
        t = ways[w][1]
        outline = way_poly(w)
        # the parts: ETHOS footprints cut to the outline; what of the outline no part covers goes to the part it touches most
        parts = []
        for pid, h in S['parts']:
            if pid == 'osm':
                parts.append([outline, h, 'osm w%d' % w])
                continue
            b = ETH[pid]
            P = ethos_poly(b).intersection(outline)
            skip_ethos.add(pid)
            parts.append([P, h, 'ETHOS ' + pid])
        rest = outline.difference(unary_union([p[0] for p in parts]))
        pieces = list(rest.geoms) if hasattr(rest, 'geoms') else [rest]
        for piece in pieces:
            if piece.area < 0.5:
                continue
            best = max(parts, key=lambda p: p[0].buffer(0.3).intersection(piece.buffer(0.3)).area)
            best[0] = unary_union([best[0], piece.buffer(0.05)]).buffer(-0.05)
        out_parts = []
        for P, h, src in parts:
            P = opened(P.buffer(0.15).buffer(-0.15).simplify(0.25))
            for g in (P.geoms if hasattr(P, 'geoms') else [P]):
                if g.area < 4:
                    continue
                out_parts.append(dict(f=flat(g), h=h, src=src))
        # annexes: ETHOS buildings outside or at the outline (vestibules, portals, the garden centre) or a box read from the photo
        annexes = []
        for a in S.get('annex', []):
            if a.get('ids'):
                g = unary_union([ethos_poly(ETH[i]) for i in a['ids']]).buffer(0.2).buffer(-0.2)
                for i in a['ids']:
                    skip_ethos.add(i)
                src = 'ETHOS ' + ', '.join(a['ids'])
            else:
                g = Polygon(a['box'])
                src = 'luftbild'
            if hasattr(g, 'geoms'):
                g = max(g.geoms, key=lambda q: q.area)
            g = opened(g.simplify(0.2), 0.3)
            if hasattr(g, 'geoms'):
                g = max(g.geoms, key=lambda q: q.area)
            annexes.append(dict(f=flat(g), h=a['h'], what=a['what'], src=src, glass=bool(a.get('glass')), portal=bool(a.get('portal')),
                                roof=a.get('roof', 'flach'), walls=a.get('walls', 'blech'), sign=a.get('sign')))
        # every footprint of the shop (doors and signs go onto the nearest wall of these)
        allf = [p['f'] for p in out_parts] + [a['f'] for a in annexes]
        allh = [p['h'] for p in out_parts] + [a['h'] for a in annexes]
        vols = [(Polygon(ring_of(f)).buffer(0), h) for f, h in zip(allf, allh)]
        footprint = unary_union([v[0] for v in vols])

        def on_wall(x, y, prefer=None, z=1.0):
            """the nearest wall whose outer side is free at height z (not inside another volume that reaches higher)"""
            best = None
            for k, f in enumerate(allf):
                if prefer is not None and k != prefer:
                    continue
                R = ring_of(f)
                for i in range(len(R)):
                    ax, ay = R[i]
                    bx, by = R[(i + 1) % len(R)]
                    L = math.hypot(bx - ax, by - ay)
                    if L < 0.3:
                        continue
                    t = max(0.0, min(1.0, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / (L * L)))
                    px, py = ax + (bx - ax) * t, ay + (by - ay) * t
                    nx, ny = (by - ay) / L, -(bx - ax) / L
                    q = Point(px + nx * 0.8, py + ny * 0.8)
                    if any(h > z + 0.3 and g.contains(q) for g, h in vols):
                        continue
                    d = math.hypot(px - x, py - y)
                    if best is None or d < best[0]:
                        best = (d, (px, py, nx, ny, i, t * L, L), k)
            if best is None:
                return on_wall(x, y, None, z) if prefer is not None else None
            return best

        doors = []
        for d in S.get('doors', []):
            if d.get('osm'):
                x, y = nxy(d['osm'])
                src = 'osm'
            else:
                x, y = d['at']
                src = d.get('src', 'regel')
            pref = None if d.get('annex') is None else len(out_parts) + d['annex']
            _, (px, py, nx, ny, ei, u, L), k = on_wall(x, y, pref)
            doors.append(dict(x=r1(px), y=r1(py), nx=round(nx, 4), ny=round(ny, 4), w=d.get('w', 2.0), k=d['k'], src=src,
                              who=d.get('who'), art=d.get('art'), oh=d.get('oh')))
        signs = []
        for s in S.get('signs', []):
            _, (px, py, nx, ny, ei, u, L), k = on_wall(*s['at'], z=s['z'])
            R = ring_of(allf[k])
            ax, ay = R[ei]
            ux, uy = -ny, nx
            # the band's width from the text (plain letters: ~0.62 h per letter, a margin)
            ww = max(2.0, len(s['t']) * s['h'] * 0.62 + s['h'] * 0.8)
            # what stands in front of this wall and reaches above the band's foot (a portal, a vestibule): its stretch along the wall
            block = []
            for g0, h in vols:
                if h <= s['z'] + 0.2:
                    continue
                for g in (g0.geoms if hasattr(g0, 'geoms') else [g0]):
                    us = [((qx - ax) * ux + (qy - ay) * uy, (qx - ax) * nx + (qy - ay) * ny) for qx, qy in g.exterior.coords]
                    if max(o for _, o in us) > 0.5 and min(o for _, o in us) < 1.0:
                        block.append((min(v for v, _ in us) - 0.6, max(v for v, _ in us) + 0.6))
            # the band slides along the wall to the nearest place where it is clear of them and inside the wall's ends
            cands = [u] + [b0 - ww / 2 for b0, b1 in block] + [b1 + ww / 2 for b0, b1 in block]
            ok = [c for c in cands if c - ww / 2 >= 0.3 and c + ww / 2 <= L - 0.3 and not any(c + ww / 2 > b0 and c - ww / 2 < b1 for b0, b1 in block)]
            if not ok:
                ww = max(1.5, min(ww, min(u, L - u) * 2 - 0.6))
                ok = [u]
            u2 = min(ok, key=lambda c: abs(c - u))
            px, py = ax + ux * u2, ay + uy * u2
            signs.append(dict(t=s['t'], x=r1(px), y=r1(py), nx=round(nx, 4), ny=round(ny, 4), z=s['z'], h=s['h'], w=r1(ww), st=s.get('st', 0)))
        oh = t.get('opening_hours')
        addr = ' '.join(v for v in (t.get('addr:street'), t.get('addr:housenumber')) if v) or None
        sh = dict(id=S['id'], name=S['name'], art=S['art'], osm='w%d' % w, oh=oh, addr=addr, col=S.get('col', 'hell'), roof=S.get('roof', 'grau'),
                  parts=out_parts, annex=annexes, doors=doors, signs=signs, h_src=S.get('h_src', 'ethos'))
        if S.get('stadt'):
            skip_stadt.append(list(S['stadt']))
        # the forecourt of the station: the canopy from OSM (building=roof), pumps in two islands under it
        if S.get('fuel'):
            C = way_poly(S['fuel']['way'])
            mrr = C.minimum_rotated_rectangle
            cc = list(mrr.exterior.coords)
            e0 = (cc[1][0] - cc[0][0], cc[1][1] - cc[0][1])
            e1 = (cc[2][0] - cc[1][0], cc[2][1] - cc[1][1])
            lng = e0 if math.hypot(*e0) >= math.hypot(*e1) else e1
            Lg = math.hypot(*lng)
            ux, uy = lng[0] / Lg, lng[1] / Lg
            vx, vy = -uy, ux
            cx, cy = C.centroid.x, C.centroid.y
            # islands across the long side: two rows of pumps along it (driving through along u)
            islands = []
            for sv in (-1, 1):
                for su in (-1, 1):
                    islands.append(dict(x=r1(cx + vx * sv * 4.2 + ux * su * 4.6), y=r1(cy + vy * sv * 4.2 + uy * su * 4.6),
                                        az=round(math.degrees(math.atan2(ux, uy)) % 360, 1)))
            court = C.buffer(6.0, join_style=2)
            for Ls, wd, wid in roads:
                if Ls.distance(court) < 1:
                    court = court.difference(Ls.buffer(wd + 0.5))
            if hasattr(court, 'geoms'):
                court = max(court.geoms, key=lambda q: q.area)
            sh['fuel'] = dict(f=flat(C), h=S['fuel']['h'], islands=islands, court=flat(court.simplify(0.3)), src='osm w%d' % S['fuel']['way'])
            skip_ethos.add('DEG_DETHL57P0000LCFG')  # the canopy stood as a hall
            footprint = unary_union([footprint, C])
        # the drive-in of McDonald's: the lane (OSM, oneway in its direction), the order post before the windows, the windows on the
        # driver's side (left: the building lies left of the lane)
        if S.get('drive'):
            pts = way_pts(S['drive']['way'])
            lane = LineString(pts)
            win = []
            # the facade the lane runs along (the longest one within 4 m of the lane)
            R = ring_of(out_parts[0]['f'])
            bestf = None
            for i in range(len(R)):
                a, b = R[i], R[(i + 1) % len(R)]
                seg = LineString([a, b])
                if seg.length < 8:
                    continue
                dd = lane.distance(seg.interpolate(0.5, normalized=True))
                if dd < 5 and (bestf is None or seg.length > bestf[0]):
                    bestf = (seg.length, a, b)
            if bestf:
                L, a, b = bestf
                dx, dy = (b[0] - a[0]) / L, (b[1] - a[1]) / L
                nx, ny = dy, -dx
                # along the lane's direction: the pay window first, then the pickup window
                dirx, diry = pts[-1][0] - pts[0][0], pts[-1][1] - pts[0][1]
                if dx * dirx + dy * diry < 0:
                    a, b = b, a
                    dx, dy = -dx, -dy
                for nm, fu in (('Kasse', 0.3), ('Ausgabe', 0.68)):
                    win.append(dict(t=nm, x=r1(a[0] + dx * L * fu), y=r1(a[1] + dy * L * fu), nx=round(nx, 4), ny=round(ny, 4)))
            # the order post: 14 m before the first window along the lane, on its left
            s0 = lane.project(Point(win[0]['x'], win[0]['y'])) if win else lane.length * 0.4
            sp = max(2.0, s0 - 16.0)
            p0 = lane.interpolate(sp)
            p1 = lane.interpolate(min(lane.length, sp + 1.0))
            tx, ty = p1.x - p0.x, p1.y - p0.y
            tl = math.hypot(tx, ty) or 1
            post = dict(x=r1(p0.x - ty / tl * 2.1), y=r1(p0.y + tx / tl * 2.1), az=round(math.degrees(math.atan2(-tx, -ty)) % 360, 1))
            sh['drive'] = dict(p=[r1(v) for q in pts for v in q], w=3.4, win=win, post=post, src='osm w%d' % S['drive']['way'])
            footprint = unary_union([footprint, lane.buffer(2.2)])
        if S.get('board'):
            B = S['board']
            _, (px, py, nx, ny, ei, u, L), k = on_wall(*B['at'])
            sh['board'] = dict(x=r1(px), y=r1(py), nx=round(nx, 4), ny=round(ny, 4), title=B['title'], names=B['names'])
        # the car parks: bays on both sides of each aisle OSM draws through them
        site = [footprint.buffer(3.0)]
        if S.get('yard'):
            Y = S['yard']
            loop = unary_union([LineString(way_pts(w)).buffer(Y['w'], cap_style=2) for w in Y['ways'] if w in ways])
            site.append(unary_union([loop, footprint]).convex_hull)
        for lid in S.get('lots', []):
            if lid not in ways:
                print('no lot', lid, flush=True)
                continue
            lot = way_poly(lid)
            ais = []
            for Ls, tt, wid in services:
                if Ls.intersects(lot.buffer(2.0)):
                    q = Ls.intersection(lot.buffer(8.0))
                    for g in (q.geoms if hasattr(q, 'geoms') else [q]):
                        if g.geom_type == 'LineString' and g.length > 3:
                            ais.append(g)
            blk = [footprint.buffer(0.8)] + [Ls.buffer(wd + 0.5) for Ls, wd, _ in roads if Ls.distance(lot) < 30]
            # in front of every door a free way in: the door's width + 3 m, 7 m deep (main) or 4 m (side, delivery: the lorry's apron 12 m)
            for d in doors:
                dep = 7.0 if d['k'] == 'main' else 12.0 if d['k'] == 'liefer' else 4.0
                hw = d['w'] / 2 + 1.5
                tx, ty = -d['ny'], d['nx']
                blk.append(Polygon([(d['x'] + tx * hw, d['y'] + ty * hw), (d['x'] - tx * hw, d['y'] - ty * hw),
                                    (d['x'] - tx * hw + d['nx'] * dep, d['y'] - ty * hw + d['ny'] * dep),
                                    (d['x'] + tx * hw + d['nx'] * dep, d['y'] + ty * hw + d['ny'] * dep)]))
            bays = bays_of(lot, ais, blk)
            # trolley shelters take two bays each near their point
            carts = []
            for cp in S.get('carts', []):
                if not bays:
                    break
                bi = min(range(len(bays)), key=lambda i: math.hypot(bays[i][0] - cp[0], bays[i][1] - cp[1]))
                b0 = bays.pop(bi)
                bj = min(range(len(bays)), key=lambda i: math.hypot(bays[i][0] - b0[0], bays[i][1] - b0[1]) + 99 * (abs(((bays[i][2] - b0[2] + 180) % 360) - 180) > 5))
                b1 = bays.pop(bj)
                carts.append(dict(x=r1((b0[0] + b1[0]) / 2), y=r1((b0[1] + b1[1]) / 2), az=round(b0[2], 1)))
            # lamps along the edges, every ~28 m, 0.8 m inside, not in an aisle or a bay
            lamps = []
            ring = lot.exterior
            n = max(1, int(ring.length // 28))
            occ = unary_union([b[3] for b in bays] + [a.buffer(AISLE / 2) for a in ais]) if bays or ais else None
            inn = lot.buffer(-0.8)
            if hasattr(inn, 'geoms'):
                inn = max(inn.geoms, key=lambda q: q.area)
            for k in range(n if not inn.is_empty else 0):
                p = ring.interpolate((k + 0.5) * ring.length / n)
                q = inn.exterior.interpolate(inn.exterior.project(p))
                if occ is not None and occ.buffer(0.3).contains(q):
                    continue
                if footprint.buffer(2).contains(q):
                    continue
                lamps.append([r1(q.x), r1(q.y)])
            lots_out.append(dict(id='w%d' % lid, shop=S['id'], f=flat(lot), aisles=[[r1(v) for c in a.coords for v in c] for a in ais],
                                 bays=[[r1(b[0]), r1(b[1]), round(b[2], 1)] for b in bays], carts=carts, lamps=lamps,
                                 cap=ways[lid][1].get('capacity')))
            site.append(lot.buffer(1.0))
            debug_draw.append(('lot', lot, bays, ais))
        if S.get('pylon'):
            P0 = S['pylon']
            props.append(dict(t='pylon', shop=S['id'], x=P0['at'][0], y=P0['at'][1], h=P0['h'], texts=P0['texts'], prices=bool(P0.get('prices'))))
        # the pad: the shop and its car parks levelled (welt/welt.js setPads) – never on a road; pads that touch become one (below)
        siteU = unary_union(site).buffer(4.0)
        for Ls, wd, wid in roads:
            if Ls.distance(siteU) < 1:
                siteU = siteU.difference(Ls.buffer(wd + 1.0))
        pads.append((S['id'], siteU))
        shops_out.append(sh)
        debug_draw.append(('shop', footprint, sh))
        print(f"{S['id']:10s} parts {len(out_parts)} annex {len(annexes)} doors {len(doors)} signs {len(signs)} "
              f"bays {sum(len(l['bays']) for l in lots_out if l['shop'] == S['id'])}", flush=True)
    # pads that touch or overlap become one (one surface: no step where two shops' pads meet)
    comps = []
    for sid, g in pads:
        for g1 in (g.geoms if hasattr(g, 'geoms') else [g]):
            if g1.area < 200:
                continue
            hit = [c for c in comps if c[1].intersects(g1.buffer(0.5))]
            ids = {sid}
            geo = g1
            for c in hit:
                ids |= c[0]
                geo = unary_union([geo, c[1]])
                comps.remove(c)
            comps.append((ids, geo))
    pads = []
    for ids, g in comps:
        for g1 in (g.geoms if hasattr(g, 'geoms') else [g]):
            if g1.area >= 200:
                # the streets beside the pad (within 25 m): their level is the street level the car park meets
                near = []
                zone = g1.buffer(25.0)
                for Ls, wd, wid in roads:
                    if not Ls.intersects(zone):
                        continue
                    q = Ls.intersection(zone)
                    for part in (q.geoms if hasattr(q, 'geoms') else [q]):
                        if part.geom_type == 'LineString' and part.length > 4:
                            near.append([r1(v) for c in part.coords for v in c])
                # notches and needles of the outline closed and cut (a wall along the pad's edge follows it)
                g2 = opened(g1.buffer(1.5, join_style=2).buffer(-1.5, join_style=2), 1.0)
                if hasattr(g2, 'geoms'):
                    g2 = max(g2.geoms, key=lambda q: q.area)
                pads.append(dict(shops=sorted(ids), f=flat(g2.simplify(0.5)), roads=near))
    # every other ETHOS building that stands in a shop's footprint, on a car park or under the drive-in lane
    allfoot = []
    for sh in shops_out:
        for p in sh['parts'] + sh['annex']:
            allfoot.append(Polygon(ring_of(p['f'])).buffer(0))
        if sh.get('fuel'):
            allfoot.append(Polygon(ring_of(sh['fuel']['f'])).buffer(0))
        if sh.get('drive'):
            allfoot.append(LineString(ring_of(sh['drive']['p'])).buffer(2.0))
    for L in lots_out:
        allfoot.append(Polygon(ring_of(L['f'])).buffer(0))
    A = unary_union(allfoot)
    for pid, b in ETH.items():
        if pid in skip_ethos:
            continue
        g = ethos_poly(b)
        if g.is_empty or not g.intersects(A):
            continue
        if g.intersection(A).area > 0.12 * g.area:
            skip_ethos.add(pid)
    data = dict(v=1, generated=time.strftime('%Y-%m-%d %H:%M'),
                src='Gebäude, Läden, Türen, Parkplätze, Drive-in: © OpenStreetMap-Mitwirkende (ODbL 1.0); Teile und Höhen: ETHOS.BUILDA '
                    '(Forschungszentrum Jülich, ODbL 1.0); Vorbauten und Eingänge, wo OSM keine kennt: Luftbild DOP 2024 © GDI-Th '
                    '(dl-de/by-2-0), von Auge',
                shops=shops_out, lots=lots_out, props=props, pads=pads, houses=[],
                skip=dict(ethos=sorted(skip_ethos), stadt=skip_stadt))
    for H in IN_HOUSES:
        b = ETH[H['ethos']]
        f = b['f']
        px, py, nx, ny, ei, u, L = snap_to_facade(f, *H['at'])
        data['houses'].append(dict(id=H['id'], name=H['name'], art=H['art'], addr=H['addr'], sign=H['sign'], x=r1(px), y=r1(py),
                                   nx=round(nx, 4), ny=round(ny, 4), eave=b['e'], src='ETHOS ' + H['ethos']))
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    js = json.dumps(data, ensure_ascii=False, separators=(',', ':'))
    open(OUT, 'w').write(js)
    print('wrote', os.path.relpath(OUT, REPO), len(js) // 1024, 'KB;', len(skip_ethos), 'ETHOS buildings replaced', flush=True)
    if debug:
        draw_debug(debug, data, debug_draw)
    return 0


def draw_debug(d, data, items):
    """the data over the orthophoto (tools/welt-dinge/wdlib.fetch), one picture per shop"""
    sys.path.insert(0, os.path.join(REPO, 'tools', 'welt-dinge'))
    import wdlib
    from PIL import Image, ImageDraw
    os.makedirs(d, exist_ok=True)
    for sh in data['shops']:
        xs, ys = [], []
        for p in sh['parts'] + sh['annex']:
            xs += p['f'][0::2]
            ys += p['f'][1::2]
        for L in data['lots']:
            if L['shop'] == sh['id']:
                xs += L['f'][0::2]
                ys += L['f'][1::2]
        x0, x1, y0, y1 = min(xs) - 12, max(xs) + 12, min(ys) - 12, max(ys) + 12
        s = max(0.12, max(x1 - x0, y1 - y0) / 1400)
        img = wdlib.fetch(x0, x1, y0, y1, s=s, cache=os.path.join(d, 'dop_%s_%.2f.jpg' % (sh['id'], s)))
        im = Image.fromarray(img).convert('RGB')
        g = ImageDraw.Draw(im)
        P = lambda x, y: ((x - x0) / s, (y1 - y) / s)
        for pad in data['pads']:
            if sh['id'] in pad['shops']:
                g.line([P(*q) for q in ring_of(pad['f'])] + [P(*ring_of(pad['f'])[0])], fill=(255, 0, 255), width=1)
        for L in data['lots']:
            if L['shop'] != sh['id']:
                continue
            g.line([P(*q) for q in ring_of(L['f'])] + [P(*ring_of(L['f'])[0])], fill=(60, 160, 255), width=2)
            for a in L['aisles']:
                g.line([P(*q) for q in ring_of(a)], fill=(255, 220, 0), width=2)
            for bx, by, az in L['bays']:
                a = math.radians(az)
                vx, vy = math.sin(a), math.cos(a)
                ux, uy = vy, -vx
                c = [(bx + sx * ux * 1.25 + sy * vx * 2.5, by + sx * uy * 1.25 + sy * vy * 2.5) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
                g.polygon([P(*q) for q in c], outline=(255, 255, 255))
                g.line([P(bx, by), P(bx + vx * 2, by + vy * 2)], fill=(255, 128, 0))
            for c in L['carts']:
                g.ellipse([P(c['x'], c['y'])[0] - 6, P(c['x'], c['y'])[1] - 6, P(c['x'], c['y'])[0] + 6, P(c['x'], c['y'])[1] + 6], outline=(0, 255, 255), width=3)
            for q in L['lamps']:
                u, v = P(*q)
                g.ellipse([u - 4, v - 4, u + 4, v + 4], fill=(255, 255, 0))
        for p in sh['parts']:
            g.line([P(*q) for q in ring_of(p['f'])] + [P(*ring_of(p['f'])[0])], fill=(255, 40, 40), width=3)
        for p in sh['annex']:
            g.line([P(*q) for q in ring_of(p['f'])] + [P(*ring_of(p['f'])[0])], fill=(255, 140, 40), width=3)
        for dd in sh['doors']:
            u, v = P(dd['x'], dd['y'])
            col = (0, 255, 0) if dd['k'] == 'main' else (0, 200, 255) if dd['k'] == 'side' else (200, 0, 255)
            g.line([P(dd['x'] - dd['ny'] * dd['w'] / 2, dd['y'] + dd['nx'] * dd['w'] / 2), P(dd['x'] + dd['ny'] * dd['w'] / 2, dd['y'] - dd['nx'] * dd['w'] / 2)], fill=col, width=6)
            g.line([P(dd['x'], dd['y']), P(dd['x'] + dd['nx'] * 4, dd['y'] + dd['ny'] * 4)], fill=col, width=2)
        for sg in sh['signs']:
            a = P(sg['x'] - sg['ny'] * sg['w'] / 2, sg['y'] + sg['nx'] * sg['w'] / 2)
            b = P(sg['x'] + sg['ny'] * sg['w'] / 2, sg['y'] - sg['nx'] * sg['w'] / 2)
            g.line([a, b], fill=(255, 255, 0), width=4)
            g.text(P(sg['x'] + sg['nx'] * 2, sg['y'] + sg['ny'] * 2), sg['t'], fill=(255, 255, 0))
        if sh.get('drive'):
            dr = sh['drive']
            g.line([P(*q) for q in ring_of(dr['p'])], fill=(255, 0, 0), width=2)
            for wnd in dr['win']:
                u, v = P(wnd['x'], wnd['y'])
                g.rectangle([u - 4, v - 4, u + 4, v + 4], outline=(255, 255, 0), width=2)
            u, v = P(dr['post']['x'], dr['post']['y'])
            g.rectangle([u - 4, v - 4, u + 4, v + 4], fill=(255, 0, 0))
        if sh.get('fuel'):
            g.line([P(*q) for q in ring_of(sh['fuel']['f'])] + [P(*ring_of(sh['fuel']['f'])[0])], fill=(255, 255, 255), width=2)
            for isl in sh['fuel']['islands']:
                u, v = P(isl['x'], isl['y'])
                g.rectangle([u - 5, v - 5, u + 5, v + 5], outline=(255, 0, 0), width=2)
        for pr in data['props']:
            if pr['shop'] == sh['id']:
                u, v = P(pr['x'], pr['y'])
                g.rectangle([u - 5, v - 5, u + 5, v + 5], fill=(255, 0, 255))
        im.save(os.path.join(d, 'laeden_%s.jpg' % sh['id']), quality=88)
        print('debug', sh['id'], im.size, flush=True)


if __name__ == '__main__':
    sys.exit(main())
