#!/usr/bin/env python3
"""suhl-bestand, deliverable 3 (one step further): the cadastre's buildings of the pilot quarter from the state's WFS 'ALKIS vereinfacht'
(feature type ave:GebaeudeBauwerk, CC BY 4.0, (c) GDI-Th) - ONE request for the bounding box of zentrum, to see what stage 2 gets:
how many buildings, how many with floors and function, and whether their ids are the ids of ETHOS.BUILDA / LoD2.
Counts only -> alkis_zentrum.json; no addresses, no parcels (ave:Flurstueck is never asked).

  python3 -I tools/suhl/bestand/alkis_probe.py
"""
import json, os, re, sys, time
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sblib

WFS = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/adv_alkis_wfs'


def main():
    from shapely.geometry import shape, Polygon
    from shapely.prepared import prep
    fc = json.load(open(os.path.join(sblib.OUT, 'gebiete.geojson'), encoding='utf-8'))
    zen = sblib.tf_geom(shape([f for f in fc['features'] if f['properties']['id'] == 'zentrum'][0]['geometry']), sblib.to_utm)
    pz = prep(zen)
    b = zen.bounds
    url = (f'{WFS}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=ave:GebaeudeBauwerk&COUNT=6000&SRSNAME=urn:ogc:def:crs:EPSG::25832'
           f'&BBOX={b[0]:.0f},{b[1]:.0f},{b[2]:.0f},{b[3]:.0f},urn:ogc:def:crs:EPSG::25832')
    t0 = time.time()
    st, body, ct = sblib.http_get(url, timeout=180, tries=2)
    dt = time.time() - t0
    t = body.decode('utf-8', 'replace')
    feats = re.findall(r'<ave:GebaeudeBauwerk .*?</ave:GebaeudeBauwerk>', t, flags=re.S)
    m = re.search(r'numberReturned="(\d+)"', t)
    inside, ids = [], set()
    for f in feats:
        pl = re.search(r'<gml:posList[^>]*>([^<]+)</gml:posList>', f)
        if not pl:
            continue
        v = [float(x) for x in pl.group(1).split()]
        if len(v) < 8:
            continue
        p = Polygon(list(zip(v[0::2], v[1::2])))
        if not p.is_valid:
            p = p.buffer(0)
        if p.is_empty or not pz.contains(p.representative_point()):
            continue
        a = dict(re.findall(r'<ave:(\w+)>([^<]*)</ave:\w+>', f))
        inside.append((a, p))
        ids.add(a.get('oid', ''))
    n = len(inside)
    res = {'made': sblib.now(), 'quelle': WFS + ' (ave:GebaeudeBauwerk), © GDI-Th, CC BY 4.0', 'abruf': {'status': st, 'bytes': len(body), 'sekunden': round(dt, 1),
           'zurueckgegeben': int(m.group(1)) if m else None, 'rechteck_utm': [round(x) for x in b]},
           'im_zentrum': n, 'ab_40_m2': sum(1 for a, p in inside if p.area >= 40), 'grundflaeche_ha': round(sum(p.area for a, p in inside) / 1e4, 1),
           'mit_geschosszahl': sum(1 for a, p in inside if a.get('anzahlgs')), 'mit_namen': sum(1 for a, p in inside if a.get('name')),
           'geschosse': dict(sorted(Counter(a.get('anzahlgs', '(ohne)') for a, p in inside).items())),
           'funktion': dict(Counter(a.get('funktion', '(ohne)') for a, p in inside).most_common(14)),
           'art': dict(Counter(a.get('gebnutzbez', '(ohne)') for a, p in inside).most_common(6)),
           'stand_jahr': dict(sorted(Counter(a.get('aktualit', '')[:4] for a, p in inside).items()))}
    # the ids: ALKIS oid (e.g. DETHL57P00006G1eBL) against ETHOS ids (DEG_DETHL57P00006G0l) of the buildings in zentrum
    ej = os.path.join(sblib.RAW, 'ethos', 'suhl.jsonl')
    if os.path.exists(ej):
        eids = set()
        for ln in open(ej, encoding='utf-8'):
            d = json.loads(ln)
            if 'header' in d or not d.get('poly'):
                continue
            r = d['poly'][0][0]
            p = Polygon(r) if len(r) >= 4 else None
            if p is not None and pz.contains((p if p.is_valid else p.buffer(0)).representative_point()):
                eids.add(str(d['id']))
        strip = lambda s: re.sub(r'^DEG_', '', s)
        e16 = {strip(x)[:16] for x in eids}
        a16 = {x[:16] for x in ids}
        res['kennungen'] = {'ethos_im_zentrum': len(eids), 'alkis_im_zentrum': len(ids), 'beispiel_ethos': sorted(eids)[:2], 'beispiel_alkis': sorted(ids)[:2],
                            'ethos_kennung_auch_in_alkis': len(e16 & a16), 'anteil_ethos_prozent': round(100 * len(e16 & a16) / max(1, len(e16)), 1),
                            'anteil_alkis_prozent': round(100 * len(e16 & a16) / max(1, len(a16)), 1),
                            'regel': 'ETHOS-Kennung ohne Vorsatz DEG_ und ALKIS-oid, jeweils die ersten 16 Zeichen'}
    sblib.write_json(os.path.join(sblib.OUT, 'alkis_zentrum.json'), res, indent=1)
    sblib.log(json.dumps(res, ensure_ascii=False)[:2400])


if __name__ == '__main__':
    main()
