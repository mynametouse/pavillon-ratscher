#!/usr/bin/env python3
"""suhl-strassen, step 1: how much road the road map of feat/strassen (viz3/src/strassen/strassen_karte.js: a window of 1536 m around
the observer, 1.5 m per pixel; phones 1024 m, 2 m) has to raster in Suhl's centre, and what OpenStreetMap holds there that the format
of the drive data cannot carry (areas, lanes, one-way streets, tunnels, steps). Numbers only -> tools/suhl/out/strassen/fenster.json.

  python3 -I tools/suhl/strassen/fenster.py [--opl suhl.opl.gz]
"""
import argparse, collections, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sslib as S
import roads as WR   # tools/welt/roads.py (classify)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--opl')
    a = ap.parse_args()
    from shapely.geometry import LineString, Point
    areas, _ = S.gebiete()
    Z = areas['zentrum']
    T = S.tiles_touching(Z)
    e0 = min(S.tbounds(x, y)[0] for x, y in T) - 500
    n0 = min(S.tbounds(x, y)[1] for x, y in T) - 500
    e1 = max(S.tbounds(x, y)[2] for x, y in T) + 500
    n1 = max(S.tbounds(x, y)[3] for x, y in T) + 500
    S.check_box((e0, n0, e1, n1), 'fenster')
    lo0, la0 = S.u2ll(e0, n0)
    lo1, la1 = S.u2ll(e1, n1)
    o = S.load_osm(opl=a.opl, box=(lo0, la0, lo1, la1))
    out = {'made': S.now(), 'osm': o.source, 'osm_stamp': o.stamp, 'zentrum_km2': round(Z.area / 1e6, 3), 'tiles_level10': [list(t) for t in T]}
    wins = {'desktop_1536m': Point(*S.CENTRE_UTM).buffer(768 * S.MSCALE, cap_style=3), 'phone_1024m': Point(*S.CENTRE_UTM).buffer(512 * S.MSCALE, cap_style=3)}
    km_hw, km_kind = collections.Counter(), collections.Counter()
    fl = collections.Counter()
    win = {k: {'km': collections.Counter(), 'seg': collections.Counter(), 'ways': 0} for k in wins}
    for wid, (nd, t) in o.ways.items():
        if 'highway' not in t:
            continue
        P = [o.nodes[i] for i in nd if i in o.nodes]
        if len(P) < 2:
            continue
        ln = LineString(P)
        c = WR.classify(t)
        inz = ln.intersection(Z).length
        if c is None:
            if inz > 0:
                fl['not_in_format: highway=%s%s' % (t['highway'], ' area=yes' if t.get('area') == 'yes' else '')] += 1
            continue
        if inz > 0:
            km_hw[t['highway']] += inz / 1000
            km_kind[c[0]] += inz / 1000
            for key, cond in (('oneway_km', t.get('oneway') in ('yes', '1', '-1')), ('lanes_km', 'lanes' in t), ('width_km', 'width' in t),
                              ('sidewalk_tag_km', any(k.startswith('sidewalk') for k in t)), ('lit_tag_km', 'lit' in t),
                              ('maxspeed_km', 'maxspeed' in t), ('surface_km', 'surface' in t)):
                if cond:
                    fl[key] += inz / 1000
            for key, cond in (('roundabout_ways', t.get('junction') == 'roundabout'), ('bridge_ways', c[3] & 1), ('tunnel_ways', c[3] & 2),
                              ('building_passage_ways', t.get('tunnel') == 'building_passage'), ('steps_ways', t['highway'] == 'steps')):
                if cond:
                    fl[key] += 1
        for k, g in wins.items():
            L = ln.intersection(g).length
            if L > 0:
                win[k]['km'][c[0]] += L / 1000
                win[k]['seg'][c[0]] += len(P) - 1
                win[k]['ways'] += 1
    out['zentrum_km_by_highway'] = {k: round(v, 2) for k, v in km_hw.most_common()}
    out['zentrum_km_by_kind'] = {k: round(v, 2) for k, v in km_kind.most_common()}
    out['zentrum_tags'] = {k: (round(v, 2) if isinstance(v, float) else v) for k, v in sorted(fl.items())}
    for k in wins:
        out['window_' + k] = {'km_by_kind': {q: round(v, 1) for q, v in win[k]['km'].most_common()}, 'km': round(sum(win[k]['km'].values()), 1),
                              'osm_segments_by_kind': dict(win[k]['seg'].most_common()), 'osm_segments': sum(win[k]['seg'].values()),
                              'ways': win[k]['ways']}
    ar = {}
    pred = lambda t: (t.get('highway') and t.get('area') == 'yes') or t.get('place') == 'square' or t.get('amenity') in ('parking', 'bus_station')
    for kind, i, t, p in o.areas(pred):
        if not p.intersects(Z):
            continue
        k = ('highway=%s area=yes' % t['highway']) if t.get('highway') else ('place=square' if t.get('place') == 'square' else 'amenity=' + t['amenity'])
        r = ar.setdefault(k, {'n': 0, 'm2_in_zentrum': 0.0, 'named': []})
        r['n'] += 1
        r['m2_in_zentrum'] += p.intersection(Z).area
        if t.get('name') and t.get('highway'):
            r['named'].append([t['name'], t.get('surface', ''), round(p.area)])
    for r in ar.values():
        r['m2_in_zentrum'] = round(r['m2_in_zentrum'])
    out['zentrum_areas'] = ar
    p = os.path.join(S.OUT, 'fenster.json')
    S.write_json(p, out, indent=1, separators=(',', ': '))
    S.log('->', os.path.relpath(p, S.REPO))
    print(open(p).read())


if __name__ == '__main__':
    main()
