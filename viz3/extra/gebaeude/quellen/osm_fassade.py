"""feat/gebaeude: what OpenStreetMap knows about the outside of the buildings of Schleusingen's old town and of Ratscher – passages through
buildings (tunnel=building_passage, covered=yes, footways and service roads that cross a footprint) and entrances (entrance=*) – in the app's
model metres, as one small JSON the app loads with the town (viz3/src/welt/schleusingen.js, viz3/src/fassade/fassade.js).
  python3 -I viz3/extra/gebaeude/quellen/osm_fassade.py [--raw <cache dir>] [--out viz3/extra/gebaeude/dist/gebaeude/osm.json]
Source: the OSM API 0.6 map call in chunks (Overpass answered with resets on 17.11.2026), © OpenStreetMap contributors (ODbL 1.0).
Needs numpy, pyproj, shapely (as tools/welt/zone_schleusingen.py). The footprints are matched with the town data by geometry later (the
app knows its own footprints), so only lines and points are stored here."""
import argparse, json, math, os, sys, time
import xml.etree.ElementTree as ET
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'welt'))
from wlib import model_from_utm, http_get, log   # noqa: E402

# lon/lat boxes: Schleusingen's old town (the zone of tools/welt/zone_schleusingen.py, ±640 m round the Markt) and Ratscher's 2.4 km square
BOXES = {'schleusingen': (10.74308, 50.5038, 10.76235, 50.51609), 'ratscher': (10.75361, 50.48646, 10.78972, 50.5095)}
PASS_HW = {'footway', 'path', 'service', 'pedestrian', 'steps', 'track', 'residential', 'living_street', 'cycleway', 'unclassified'}


def fetch(raw, box, step=0.0097):
    w, s, e, n = box
    nodes, ways = {}, {}
    x = w
    while x < e:
        y = s
        while y < n:
            bb = f'{x:.5f},{y:.5f},{min(e, x + step):.5f},{min(n, y + step * 0.64):.5f}'
            p = os.path.join(raw, f'osm_api_{bb.replace(",", "_")}.xml')
            if not os.path.exists(p):
                st, b, ct = http_get(f'https://api.openstreetmap.org/api/0.6/map?bbox={bb}', timeout=300)
                if st != 200:
                    raise RuntimeError(f'OSM API {bb}: HTTP {st}')
                open(p, 'wb').write(b)
                time.sleep(1.0)
            root = ET.parse(p).getroot()
            for el in root.iter('node'):
                tags = {t.get('k'): t.get('v') for t in el.findall('tag')}
                nodes[el.get('id')] = (float(el.get('lon')), float(el.get('lat')), tags)
            for el in root.iter('way'):
                ways[el.get('id')] = ([nd.get('ref') for nd in el.findall('nd')], {t.get('k'): t.get('v') for t in el.findall('tag')})
            y += step * 0.64
        x += step
    return nodes, ways


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', default='/tmp/geb_osm_raw')
    ap.add_argument('--out', default=os.path.join(ROOT, 'viz3', 'extra', 'gebaeude', 'dist', 'gebaeude', 'osm.json'))
    a = ap.parse_args()
    os.makedirs(a.raw, exist_ok=True)
    import numpy as np
    from pyproj import Transformer
    from shapely.geometry import Polygon, LineString
    from shapely.strtree import STRtree
    tr = Transformer.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
    out = {'v': 1, 'generated': time.strftime('%Y-%m-%dT%H:%MZ', time.gmtime()), 'src': 'Durchgänge und Eingänge: © OpenStreetMap-Mitwirkende (ODbL 1.0)'}
    for place, box in BOXES.items():
        nodes, ways = fetch(a.raw, box)
        ids = list(nodes)
        E, N = tr.transform(np.array([nodes[i][0] for i in ids]), np.array([nodes[i][1] for i in ids]))
        mx, my = model_from_utm(np.asarray(E), np.asarray(N))
        M = {i: (round(float(x), 2), round(float(y), 2)) for i, x, y in zip(ids, mx, my)}
        polys, pid = [], []
        for wid, (refs, t) in ways.items():
            if 'building' not in t or len(refs) < 4 or refs[0] != refs[-1]:
                continue
            try:
                pg = Polygon([M[r] for r in refs if r in M])
                if pg.is_valid and pg.area > 8:
                    polys.append(pg)
                    pid.append(wid)
            except Exception:
                pass
        tree = STRtree(polys)
        passes = []
        for wid, (refs, t) in ways.items():
            hw = t.get('highway')
            if not hw:
                continue
            # mapped as a passage (through a building, or a covered way / a tunnel of a footway – the castle's east gate is one):
            # kept as it is, the app finds the building it goes through
            tagged = t.get('tunnel') in ('building_passage', 'yes') or t.get('covered') == 'yes' or 'building:passage' in t
            pts = [M[r] for r in refs if r in M]
            if len(pts) < 2 or (hw == 'steps' and t.get('layer', '0').startswith('-')):
                continue   # a stair under a building (layer -1): not a way through at ground level
            if tagged:
                passes.append({'osm': 'w' + wid, 'k': hw, 'tags': ';'.join(f'{k}={t[k]}' for k in ('tunnel', 'covered', 'layer', 'surface') if k in t),
                               'p': [v for xy in pts for v in xy], 'len': round(LineString(pts).length, 1)})
                continue
            if hw not in PASS_HW:
                continue
            ls = LineString(pts)
            for j in tree.query(ls):
                inter = ls.intersection(polys[j])
                # through a wall at least once (in and out, or into a courtyard): a passage; a way wholly inside is a stair or a hall
                if inter.length < 1.5 or ls.boundary.within(polys[j]) or polys[j].exterior.intersection(ls).is_empty:
                    continue
                for g in (inter.geoms if hasattr(inter, 'geoms') else [inter]):
                    if g.length < 1.5:
                        continue
                    c = list(g.coords)
                    passes.append({'osm': 'w' + wid, 'b': 'w' + pid[j], 'k': hw, 'tags': ';'.join(f'{k}={t[k]}' for k in ('tunnel', 'covered', 'layer', 'surface') if k in t),
                                   'p': [round(v, 2) for xy in (c[0], c[-1]) for v in xy], 'len': round(g.length, 1)})
        ent = [{'osm': 'n' + i, 'x': M[i][0], 'y': M[i][1], 'e': nodes[i][2]['entrance']} for i in ids if 'entrance' in nodes[i][2]]
        out[place] = {'pass': passes, 'ent': ent}
        log(place, len(nodes), 'nodes', len(ways), 'ways:', len(passes), 'passages,', len(ent), 'entrances')
    json.dump(out, open(a.out, 'w'), ensure_ascii=False, separators=(',', ':'))
    log(a.out, os.path.getsize(a.out), 'bytes')


if __name__ == '__main__':
    main()
