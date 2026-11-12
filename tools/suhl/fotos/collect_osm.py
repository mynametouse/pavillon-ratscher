"""The street network of the Kernstadt of Suhl from OpenStreetMap, for the photo coverage: every way with a highway tag,
the place points (quarters, villages) and named objects that can be landmarks (town hall, churches, museums, station ...).
Made on the chat machine with the map call of the OSM API in small boxes, one request per second (Geofabrik and Overpass
are not reachable from here; a box that is refused for having too many nodes is split into four).
Data (c) OpenStreetMap contributors, ODbL.
    python3 tools/suhl/fotos/collect_osm.py [gebiete.geojson]     ->  tools/suhl/out/fotos/strassen.json.gz"""
import sys, os, io, datetime, collections, urllib.error
import xml.etree.ElementTree as ET
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import slib

API = 'https://api.openstreetmap.org/api/0.6/map'
areas = slib.Areas(sys.argv[1] if len(sys.argv) > 1 else None)
WAY_TAGS = ('name', 'highway', 'ref', 'surface', 'smoothness', 'lit', 'maxspeed', 'oneway', 'lanes', 'sidewalk', 'sidewalk:both', 'sidewalk:left', 'sidewalk:right',
            'width', 'tunnel', 'bridge', 'layer', 'service', 'area', 'access', 'incline', 'cycleway', 'bicycle', 'foot', 'junction', 'covered')
OBJ_AMENITY = {'townhall', 'place_of_worship', 'theatre', 'cinema', 'library', 'arts_centre', 'community_centre', 'courthouse', 'marketplace', 'fountain',
               'bus_station', 'university', 'college', 'hospital', 'events_venue', 'conference_centre', 'exhibition_centre'}
OBJ_BUILDING = {'train_station', 'church', 'cathedral', 'chapel', 'civic', 'public', 'government', 'museum', 'tower', 'retail', 'hotel'}
calls, refused = [0], [0]
ways, places, objs = {}, {}, {}


def is_obj(t):
    if not t.get('name'): return False
    return bool(t.get('tourism') in ('museum', 'attraction', 'gallery', 'viewpoint', 'hotel', 'artwork') or t.get('historic') or t.get('amenity') in OBJ_AMENITY
                or t.get('building') in OBJ_BUILDING or t.get('railway') in ('station', 'halt') or t.get('shop') in ('mall', 'department_store')
                or t.get('man_made') in ('tower', 'bridge') or t.get('place') == 'square' or t.get('leisure') in ('stadium', 'park', 'sports_centre')
                or (t.get('building') and (t.get('wikidata') or t.get('wikipedia') or t.get('heritage'))))


def box(b):
    url = f'{API}?bbox={b[0]:.5f},{b[1]:.5f},{b[2]:.5f},{b[3]:.5f}'
    try:
        raw = slib.get(url, pause=1.1, tries=4, timeout=120); calls[0] += 1
    except urllib.error.HTTPError as e:
        calls[0] += 1
        if e.code in (400, 509) and (b[2] - b[0]) > 0.002:   # too many nodes: four smaller boxes
            refused[0] += 1
            mx, my = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
            for q in ((b[0], b[1], mx, my), (mx, b[1], b[2], my), (b[0], my, mx, b[3]), (mx, my, b[2], b[3])): box(q)
            return
        raise
    nodes, wgeo = {}, {}
    for ev, el in ET.iterparse(io.BytesIO(raw), events=('end',)):
        if el.tag == 'node':
            nid = el.get('id'); lat, lon = float(el.get('lat')), float(el.get('lon'))
            nodes[nid] = (round(lat, 7), round(lon, 7))
            if len(el):
                t = {c.get('k'): c.get('v') for c in el if c.tag == 'tag'}
                if t.get('place') in ('suburb', 'quarter', 'neighbourhood', 'village', 'hamlet', 'town', 'city') and t.get('name'):
                    places['n' + nid] = dict(id='n' + nid, name=t['name'], place=t['place'], lat=nodes[nid][0], lon=nodes[nid][1])
                if is_obj(t): objs['n' + nid] = dict(id='n' + nid, tags=t, pts=[list(nodes[nid])])
            el.clear()
        elif el.tag == 'way':
            wid = el.get('id')
            t = {c.get('k'): c.get('v') for c in el if c.tag == 'tag'}
            pts = [list(nodes[c.get('ref')]) for c in el if c.tag == 'nd' and c.get('ref') in nodes]
            wgeo[wid] = pts
            if t.get('highway') and len(pts) >= 2 and wid not in ways:
                ways[wid] = dict(id=int(wid), tags={k: t[k] for k in WAY_TAGS if k in t}, pts=pts)
            if is_obj(t) and len(pts) >= 3 and not (t.get('highway') and t.get('area') != 'yes'):
                objs['w' + wid] = dict(id='w' + wid, tags=t, pts=pts)
            el.clear()
        elif el.tag == 'relation':
            t = {c.get('k'): c.get('v') for c in el if c.tag == 'tag'}
            if t.get('type') == 'multipolygon' and is_obj(t):
                pts = []
                for c in el:
                    if c.tag == 'member' and c.get('type') == 'way' and c.get('role') in ('outer', '') and c.get('ref') in wgeo: pts += wgeo[c.get('ref')]
                if len(pts) >= 3: objs['r' + el.get('id')] = dict(id='r' + el.get('id'), tags=t, pts=pts)
            el.clear()


b = areas.bbox('kernstadt', pad=0.001)
sx, sy = 0.0250, 0.0160   # about 1.8 km x 1.8 km to start with
nx, ny = int((b[2] - b[0]) / sx) + 1, int((b[3] - b[1]) / sy) + 1
todo = []
for i in range(nx):
    for j in range(ny):
        q = (b[0] + i * sx, b[1] + j * sy, min(b[2], b[0] + (i + 1) * sx), min(b[3], b[1] + (j + 1) * sy))
        # only boxes that touch the area (corners, centre and edge midpoints)
        pts = [(q[1] + (q[3] - q[1]) * v, q[0] + (q[2] - q[0]) * u) for u in (0, .5, 1) for v in (0, .5, 1)]
        if any(areas.has('kernstadt', la, lo) for la, lo in pts): todo.append(q)
print(f'{len(todo)} boxes of {nx * ny} touch the Kernstadt', flush=True)
failed = []
for k, q in enumerate(todo):
    try: box(q)
    except Exception as e:   # a box that cannot be had is written down, the rest goes on
        failed.append([round(v, 5) for v in q]); print('  box failed', q, e, flush=True)
    if k % 5 == 4: print(f'box {k + 1}/{len(todo)}: {len(ways)} highway ways, {calls[0]} calls ({refused[0]} refused and split)', flush=True)

out = dict(version=1, fetched=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'),
           source='OpenStreetMap API 0.6 map call in boxes; (c) OpenStreetMap contributors, ODbL', bbox=[round(v, 5) for v in b], areas=areas.source,
           calls=calls[0], failed_boxes=failed, ways=sorted(ways.values(), key=lambda w: w['id']), places=sorted(places.values(), key=lambda p: p['id']),
           objects=sorted(objs.values(), key=lambda o: o['id']))
print(slib.save('strassen.json.gz', out), len(ways), 'ways,', len(places), 'places,', len(objs), 'objects,', calls[0], 'calls')
c = collections.Counter(w['tags']['highway'] for w in ways.values())
print('highway', c.most_common(30))
print('named', sum(1 for w in ways.values() if w['tags'].get('name')), 'places', sorted(p['name'] + '/' + p['place'] for p in places.values()))
