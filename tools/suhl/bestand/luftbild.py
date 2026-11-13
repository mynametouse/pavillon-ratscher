#!/usr/bin/env python3
"""suhl-bestand, deliverable 6: the flight date of the state's orthophoto (DOP20, WMS layer th_dop) per 1-km tile over Suhl and the
road corridors, from the metadata layer th_dop_info (GetFeatureInfo at the tile centre, as tools/welt/fetch.py flight_dates), and what
else the DOP service offers -> tools/suhl/out/bestand/luftbild.json. One request per tile, three at a time.

  python3 -I tools/suhl/bestand/luftbild.py
"""
import csv, json, os, re, sys, time
from concurrent.futures import ThreadPoolExecutor

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sblib

WMS = 'https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP'


def one(key):
    e, n = key
    E, N = e * 1000 + 500, n * 1000 + 500
    url = (f'{WMS}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS=th_dop_info&QUERY_LAYERS=th_dop_info&STYLES='
           f'&CRS=EPSG:25832&BBOX={E - 50},{N - 50},{E + 50},{N + 50}&WIDTH=101&HEIGHT=101&I=50&J=50&INFO_FORMAT=text/plain')
    st, b, _ = sblib.http_get(url, timeout=60)
    t = b.decode('utf-8', 'replace') if st == 200 else ''
    m = re.search(r'Erstellung=(\d\d)\.(\d\d)\.(\d{4})', t)
    kv = dict(x.split('=', 1) for x in re.split(r'\$#\$|\n', t) if '=' in x and not x.lstrip().startswith('<'))
    kv = {k.strip(): v.strip() for k, v in kv.items()}
    time.sleep(0.15)
    return key, (f'{m.group(3)}-{m.group(2)}-{m.group(1)}' if m else None), kv


def main():
    rows = list(csv.DictReader(open(os.path.join(sblib.OUT, 'kacheln.csv'), encoding='utf-8')))
    keys = sorted({(int(r['e_km']), int(r['n_km'])) for r in rows if r['produkt'] == 'DGM1'})
    prio = {(int(r['e_km']), int(r['n_km'])): r['prio'] for r in rows if r['produkt'] == 'DGM1'}
    with ThreadPoolExecutor(3) as ex:
        res = list(ex.map(one, keys))
    tiles, days, fields, sample = {}, {}, set(), None
    for key, d, kv in res:
        tiles[f'{key[0]}_{key[1]}'] = {'flug': d, 'publikation': kv.get('Publikation'), 'bezug': kv.get('Bezug'), 'prio': prio[key]}
        fields |= set(kv)
        sample = sample or kv
        if prio[key] != 'P4':
            days[d] = days.get(d, 0) + 1
    # seams: neighbouring tiles (inside P1-P3) with different flight days
    seams = []
    for (e, n) in keys:
        for de, dn in ((1, 0), (0, 1)):
            a, b = tiles.get(f'{e}_{n}'), tiles.get(f'{e + de}_{n + dn}')
            if a and b and a['flug'] != b['flug'] and a['prio'] != 'P4' and b['prio'] != 'P4':
                seams.append({'zwischen': [f'{e}_{n}', f'{e + de}_{n + dn}'], 'tage': [a['flug'], b['flug']],
                              'naht': ('E %d km' % (e + 1)) if de else ('N %d km' % (n + 1))})
    by_prio = {}
    for k, t in tiles.items():
        by_prio.setdefault(t['prio'], {}).setdefault(str(t['flug']), 0)
        by_prio[t['prio']][str(t['flug'])] += 1
    out = {'made': sblib.now(), 'quelle': WMS + ' (Ebene th_dop_info, GetFeatureInfo je Kachelmitte), © GDI-Th, CC BY 4.0',
           'kacheln_abgefragt': len(keys), 'flugtage_P1_bis_P3': dict(sorted(days.items(), key=lambda kv: str(kv[0]))),
           'flugtage_je_prioritaet': by_prio, 'naehte': seams, 'naht_linien': sorted({s['naht'] for s in seams}),
           'felder_th_dop_info': sorted(fields), 'beispiel': sample, 'kacheln': tiles}
    sblib.write_json(os.path.join(sblib.OUT, 'luftbild.json'), out, indent=0)
    sblib.log(json.dumps({k: out[k] for k in ('kacheln_abgefragt', 'flugtage_P1_bis_P3', 'flugtage_je_prioritaet', 'naht_linien', 'felder_th_dop_info', 'beispiel')}, ensure_ascii=False))


if __name__ == '__main__':
    main()
