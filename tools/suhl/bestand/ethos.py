#!/usr/bin/env python3
"""suhl-bestand, deliverable 4b: ETHOS.BUILDA (Forschungszentrum Jülich, Zenodo record 11845992, DEG.csv = Thuringia, ODbL) for Suhl:
how many buildings inside stadt, kernstadt, zentrum, which fields, the height distribution, how well the footprints match
OpenStreetMap (by overlap) and the tall buildings (>= 25 m) with their position -> ethos.json.
Input: the JSON lines of ethos_filter.py (raw data, never committed).

  python3 -I tools/suhl/bestand/ethos.py [--jsonl FILE] [--opl FILE] [--out FILE]
"""
import argparse, json, os, sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sblib

BINS = [(0, 3), (3, 6), (6, 10), (10, 15), (15, 25), (25, 40), (40, 1000)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--jsonl', default=os.path.join(sblib.RAW, 'ethos', 'suhl.jsonl'))
    ap.add_argument('--opl', default=None)
    ap.add_argument('--out', default=os.path.join(sblib.OUT, 'ethos.json'))
    a = ap.parse_args()
    import numpy as np
    from shapely.geometry import shape, Polygon, MultiPolygon
    from shapely.prepared import prep
    from shapely.strtree import STRtree

    fc = json.load(open(os.path.join(sblib.OUT, 'gebiete.geojson'), encoding='utf-8'))
    G = {f['properties']['id']: sblib.tf_geom(shape(f['geometry']), sblib.to_utm) for f in fc['features'] if f['properties']['art'] == 'gebiet'}
    PG = {k: prep(v) for k, v in G.items()}
    areas = ('stadt', 'kernstadt', 'zentrum')
    header, E = None, []
    for ln in open(a.jsonl, encoding='utf-8'):
        d = json.loads(ln)
        if 'header' in d:
            header = d['header']
            continue
        polys = [Polygon(r[0], r[1:]) for r in d['poly'] if len(r[0]) >= 4]
        if not polys:
            continue
        g = polys[0] if len(polys) == 1 else MultiPolygon(polys)
        if not g.is_valid:
            g = g.buffer(0)
        if g.is_empty:
            continue
        E.append((d, g))
    sblib.log('ETHOS in the box:', len(E), 'header:', header)
    res = {'made': sblib.now(), 'quelle': 'ETHOS.BUILDA v1.0.0, Zenodo 11845992, DEG.csv (Thüringen), Forschungszentrum Jülich; Lizenz ODbL 1.0',
           'spalten': header, 'im_rechteck_um_suhl': len(E), 'gebiete': {}}
    inside = {k: [] for k in areas}
    for d, g in E:
        rp = g.representative_point()
        for k in areas:
            if PG[k].contains(rp):
                inside[k].append((d, g))
    for k in areas:
        hs = np.array([d['h'] for d, g in inside[k] if isinstance(d.get('h'), (int, float))], dtype=float)
        ar = np.array([g.area for d, g in inside[k]])
        res['gebiete'][k] = {
            'anzahl': len(inside[k]), 'mit_hoehe': int(len(hs)), 'grundflaeche_ha': round(float(ar.sum()) / 1e4, 1),
            'ab_40_m2': int((ar >= 40).sum()),
            'hoehe_m': {'min': round(float(hs.min()), 1), 'p10': round(float(np.percentile(hs, 10)), 1), 'median': round(float(np.median(hs)), 1),
                        'p90': round(float(np.percentile(hs, 90)), 1), 'p99': round(float(np.percentile(hs, 99)), 1), 'max': round(float(hs.max()), 1)} if len(hs) else None,
            'hoehenklassen': {f'{lo}-{hi} m' if hi < 1000 else f'ab {lo} m': int(((hs >= lo) & (hs < hi)).sum()) for lo, hi in BINS},
            'quelle_grundriss': dict(Counter(str(d.get('src')) for d, g in inside[k]).most_common(6)),
            'hoehe_herkunft': dict(Counter(str(d.get('lin')) for d, g in inside[k]).most_common(6)),
            'hoehe_quelle': dict(Counter(str(d.get('hs')) for d, g in inside[k]).most_common(6)),
            'id_muster': dict(Counter(('DETHL' if str(d['id']).startswith('DETHL') else str(d['id'])[:5]) for d, g in inside[k]).most_common(5))}
    # ---- match with OpenStreetMap by overlap
    o = sblib.load_osm(a.opl)
    O = [(t, p) for kind, i, t, p in o.areas(lambda t: 'building' in t and t['building'] != 'no') if PG['stadt'].contains(p.representative_point())]
    res['osm_quelle'] = o.source
    for k in areas:
        eg = [g for d, g in inside[k]]
        og = [p for t, p in O if PG[k].contains(p.representative_point())]
        if not eg or not og:
            continue
        te, to = STRtree(eg), STRtree(og)

        def cover(src, tree, other, big_only=False):
            hit50 = hit10 = n = 0
            inter_sum = 0.0
            for g in src:
                if big_only and g.area < 40:
                    continue
                n += 1
                inter = 0.0
                for j in tree.query(g):
                    try:
                        inter += g.intersection(other[j]).area
                    except Exception:
                        pass
                inter = min(inter, g.area)
                inter_sum += inter
                hit50 += inter >= 0.5 * g.area
                hit10 += inter >= 0.1 * g.area
            return n, hit50, hit10, inter_sum
        n1, a50, a10, inter = cover(og, te, eg)
        n1b, b50, b10, _ = cover(og, te, eg, True)
        n2, c50, c10, inter2 = cover(eg, to, og)
        n2b, d50, d10, _ = cover(eg, to, og, True)
        ao, ae = sum(p.area for p in og), sum(g.area for g in eg)
        res['gebiete'][k]['abgleich_osm'] = {
            'osm_gebaeude': n1, 'ethos_gebaeude': n2,
            'osm_zu_mind_50_prozent_von_ethos_bedeckt_prozent': round(100 * a50 / n1, 1),
            'osm_ab_40_m2_zu_mind_50_prozent_bedeckt_prozent': round(100 * b50 / n1b, 1) if n1b else None,
            'osm_ohne_ethos_unter_10_prozent': n1 - a10,
            'ethos_zu_mind_50_prozent_von_osm_bedeckt_prozent': round(100 * c50 / n2, 1),
            'ethos_ab_40_m2_zu_mind_50_prozent_bedeckt_prozent': round(100 * d50 / n2b, 1) if n2b else None,
            'ethos_ohne_osm_unter_10_prozent': n2 - c10,
            'grundflaeche_osm_ha': round(ao / 1e4, 1), 'grundflaeche_ethos_ha': round(ae / 1e4, 1),
            'gemeinsame_flaeche_ha': round(inter / 1e4, 1), 'gemeinsam_anteil_an_osm_prozent': round(100 * inter / ao, 1),
            'gemeinsam_anteil_an_ethos_prozent': round(100 * inter2 / ae, 1)}
    # ---- the skyline: ETHOS buildings >= 25 m inside stadt, with the OSM name where footprints overlap
    to = STRtree([p for t, p in O])
    tall = []
    for d, g in inside['stadt']:
        if isinstance(d.get('h'), (int, float)) and d['h'] >= 25:
            rp = g.representative_point()
            lon, lat = sblib.to_wgs(rp.x, rp.y)
            best, bt = 0.0, None
            for j in to.query(g):
                ia = g.intersection(O[j][1]).area
                if ia > best:
                    best, bt = ia, O[j][0]
            tall.append({'id': d['id'], 'hoehe_m': round(d['h'], 1), 'grundflaeche_m2': round(g.area), 'lat': round(lat, 6), 'lon': round(lon, 6),
                         'utm32_km': [round(rp.x / 1000, 3), round(rp.y / 1000, 3)], 'in_kernstadt': bool(PG['kernstadt'].contains(rp)),
                         'im_zentrum': bool(PG['zentrum'].contains(rp)), 'osm_name': (bt or {}).get('name'), 'osm_building': (bt or {}).get('building'),
                         'osm_levels': (bt or {}).get('building:levels')})
    tall.sort(key=lambda x: -x['hoehe_m'])
    res['hohe_gebaeude_ab_25_m'] = {'anzahl': len(tall), 'mit_grundflaeche_ab_100_m2': sum(1 for x in tall if x['grundflaeche_m2'] >= 100),
                                    'hinweis': 'Körper unter 100 m² Grundfläche sind meist Dachaufbauten, Aufzugsschächte, Schornsteine oder Teile eines Hochhauses',
                                    'im_zentrum': sum(1 for x in tall if x['im_zentrum']),
                                    'in_kernstadt': sum(1 for x in tall if x['in_kernstadt']), 'liste': tall}
    sblib.write_json(a.out, res, indent=1)
    sblib.log('written', a.out)
    for k in areas:
        r = res['gebiete'][k]
        sblib.log(k, r['anzahl'], r['hoehe_m'], r['hoehenklassen'], r.get('abgleich_osm'))
    sblib.log('tall:', len(tall), [(x['hoehe_m'], x['osm_name'] or x['osm_building'], x['grundflaeche_m2']) for x in tall[:14]])
    sblib.log('src', res['gebiete']['stadt']['quelle_grundriss'], res['gebiete']['stadt']['hoehe_herkunft'], res['gebiete']['stadt']['hoehe_quelle'])


if __name__ == '__main__':
    main()
