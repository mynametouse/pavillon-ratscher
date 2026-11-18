#!/usr/bin/env python3
"""feat/welt-wald: the OpenStreetMap data of the forest pipeline (ODbL) from an Overpass API, in small pieces (the public servers time out on
the whole region; Geofabrik and overpass-api.de are not reachable from the chat machine – tools/welt/QUELLEN.md): ways (highways, railways,
power lines) and green areas (forest, wood, scrub, orchards, tree rows, single trees, hedges, water, landuse) with their geometry, merged
into $WW_RAW/osm/ways.json and green.json (Overpass JSON).

  python3 tools/weltwald/osm.py [lat0 lon0 lat1 lon1] [--step 0.05]
"""
import json, os, sys, time, urllib.parse
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wwlib as W

# the one that answers from the chat machine (17.11.2026); WW_OVERPASS for another
SERVERS = [os.environ.get('WW_OVERPASS', 'https://overpass.private.coffee/api/interpreter')]
Q = {
    'ways': '(way["highway"]({b});way["railway"~"^(rail|light_rail|disused|abandoned|narrow_gauge)$"]({b});way["power"="line"]({b}););',
    'green': ('(way["landuse"~"^(forest|orchard|plant_nursery)$"]({b});relation["landuse"~"^(forest|orchard)$"]({b});'
              'way["natural"~"^(wood|scrub|tree_row|heath|wetland|water)$"]({b});relation["natural"~"^(wood|scrub|water|wetland)$"]({b});'
              'node["natural"="tree"]({b});way["barrier"="hedge"]({b});'
              'way["landuse"~"^(meadow|farmland|grass|residential|industrial|commercial|farmyard|allotments|cemetery|quarry|recreation_ground)$"]({b});'
              'way["leisure"~"^(park|garden|pitch|sports_centre|golf_course|playground)$"]({b});'
              'way["waterway"~"^(river|stream|canal|ditch|drain)$"]({b}););'),
}


def fetch(kind, b):
    q = f'[out:json][timeout:180];{Q[kind].format(b=b)}out body geom;'
    last = ''
    for k in range(5):
        url = SERVERS[k % len(SERVERS)]
        try:
            raw = W.http(url, timeout=240, tries=1, data=urllib.parse.urlencode({'data': q}).encode())
            j = json.loads(raw)
            if 'remark' in j and 'runtime error' in j['remark']:
                raise RuntimeError(j['remark'][:120])
            return j['elements']
        except Exception as e:
            last = str(e)[:160]
            time.sleep(5 + 5 * k)
    raise RuntimeError(f'{kind} {b}: {last}')


def main():
    a = [float(v) for v in sys.argv[1:5]] if len(sys.argv) >= 5 else [50.36, 10.53, 50.72, 11.0]
    step = float(sys.argv[sys.argv.index('--step') + 1]) if '--step' in sys.argv else 0.05
    d = os.path.join(W.RAW, 'osm', 'parts')
    os.makedirs(d, exist_ok=True)
    la = a[0]
    while la < a[2] - 1e-9:
        lo = a[1]
        while lo < a[3] - 1e-9:
            b = f'{la:.3f},{lo:.3f},{min(a[2], la + step):.3f},{min(a[3], lo + step):.3f}'
            for kind in Q:
                p = os.path.join(d, f'{kind}_{b}.json')
                if os.path.exists(p):
                    continue
                try:
                    el = fetch(kind, b)
                    json.dump(el, open(p, 'w'))
                    W.log(kind, b, len(el))
                except Exception as e:
                    W.log('failed', e)
            lo += step
        la += step
    for kind in Q:
        seen, out = set(), []
        for f in sorted(os.listdir(d)):
            if not f.startswith(kind + '_'):
                continue
            for e in json.load(open(os.path.join(d, f))):
                k = (e['type'], e['id'])
                if k not in seen:
                    seen.add(k)
                    out.append(e)
        json.dump({'elements': out}, open(os.path.join(W.RAW, 'osm', kind + '.json'), 'w'))
        W.log(kind, len(out), 'elements merged')


if __name__ == '__main__':
    main()
