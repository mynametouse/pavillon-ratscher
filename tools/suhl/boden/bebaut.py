#!/usr/bin/env python3
"""suhl-boden: how many buildings stand in every level-10 tile (400 m) of the municipality -> tools/suhl/boden/bebaut10.json.
The tile plan (plan.py) gives level 11 to the tiles with at least plan.BUILT buildings ("built-up parts").

  python3 -I tools/suhl/boden/bebaut.py --osm-raw /tmp/suhl-bestand/raw/osm     the cached OSM API map calls of stage 1 (suhl-bestand)
  python3 -I tools/suhl/boden/bebaut.py --opl suhl.opl.gz                       an OPL file cut from the Geofabrik extract with osmium

Buildings as stage 1 counted them (tools/suhl/bestand/gebiete.py): OSM building=* (not 'no'), footprint >= 40 m2, placed by a point
inside the footprint. Source OpenStreetMap, ODbL 1.0. The file is small and committed, so the tile lists do not change from run to
run; make it again when suhl-gebaeude has the footprints of the whole city.
"""
import argparse, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(1, os.path.join(os.path.dirname(HERE), 'bestand'))
import blib
import sblib          # the OSM model of stage 1 (read and imported, never edited)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--osm-raw', default='')
    ap.add_argument('--opl', default='')
    ap.add_argument('--min-area', type=float, default=40.0)
    a = ap.parse_args()
    o = sblib.load_osm_opl(a.opl) if a.opl else sblib.load_osm_api(a.osm_raw or None)
    G, _, _ = blib.areas()
    stadt = G['stadt']
    from shapely.prepared import prep
    ps = prep(stadt.buffer(600))
    cnt, n = {}, 0
    for kind, i, tags, poly in o.areas(lambda t: 'building' in t and t['building'] != 'no'):
        if poly.area < a.min_area:
            continue
        p = poly.representative_point()
        if not ps.contains(p):
            continue
        t = blib.tile_of(10, p.x, p.y)
        cnt[t] = cnt.get(t, 0) + 1
        n += 1
    out = {'made': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()),
           'what': 'buildings (OSM building=*, footprint >= %g m2) per level-10 tile (400 m) in the municipality of Suhl + 600 m' % a.min_area,
           'source': o.source + (f', {o.stamp}' if o.stamp else ''), 'attribution': '© OpenStreetMap-Mitwirkende, ODbL 1.0',
           'buildings': n, 'tiles_with_buildings': len(cnt),
           'tiles': {f'{x}/{y}': c for (x, y), c in sorted(cnt.items())}}
    p = os.path.join(HERE, 'bebaut10.json')
    json.dump(out, open(p, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    print('written', p, os.path.getsize(p), 'bytes;', n, 'buildings in', len(cnt), 'tiles')
    import numpy as np
    v = np.array(sorted(cnt.values()))
    for th in (1, 2, 4, 6, 8, 12, 20, 40):
        print(f'  tiles with >= {th:2d} buildings: {int((v >= th).sum())}')


if __name__ == '__main__':
    main()
