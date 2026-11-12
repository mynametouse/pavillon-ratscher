#!/usr/bin/env python3
"""suhl-bestand, deliverable 8: all numbers of the Suhl inventory in one machine-readable file -> tools/suhl/out/bestand/bestand.json.
It only gathers what the other scripts wrote (gebiete.py, kacheln.py, osm_bestand.py, ethos.py, luftbild.py, oepnv.py,
landesdienste.py); a part that is missing is listed under 'fehlt'.

  python3 -I tools/suhl/bestand/bestand.py
"""
import json, os, sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sblib


def load(name):
    p = os.path.join(sblib.OUT, name)
    return json.load(open(p, encoding='utf-8')) if os.path.exists(p) else None


def main():
    miss = []
    B = {'made': sblib.now(), 'auftrag': 'docs/plans/auftraege/suhl-bestand.md', 'doku': ['docs/features/suhl-bestand.md', 'docs/features/suhl-landesdaten.md'],
         'bilder': 'Zweig ref/suhl-bestand, Ordner karten/', 'quellen': {
             'OpenStreetMap': '© OpenStreetMap-Mitwirkende, ODbL 1.0; OSM-API 0.6 (map-Abrufe in Kästen, relation/62450/full), Nominatim',
             'Land Thüringen': '© GDI-Th, CC BY 4.0 (WMS/WFS des Geoproxy Thüringen: DOP, th_dop_info, ALKIS vereinfacht, Hauskoordinaten)',
             'ETHOS.BUILDA': 'Forschungszentrum Jülich, Zenodo 11845992 (DEG.csv), ODbL 1.0',
             'Fahrplan': 'gtfs.de – GTFS für Deutschland (frei), Daten bereitgestellt von DELFI e.V., CC BY 4.0',
             'basemap.de': 'GeoBasis-DE (Bund und Länder), Vektorkacheln basemap.de Web Vektor',
             'easygeodata.de': 'privates Portal mit aufbereiteten Kopien amtlicher Daten; nur die öffentlichen Seiten gelesen'}}
    g = load('gebiete.geojson')
    if g:
        B['gebiete'] = {f['properties']['id']: {k: f['properties'].get(k) for k in ('name', 'flaeche_km2', 'bbox_utm32_km', 'gebaeude_osm', 'osm', 'regel')}
                        for f in g['features'] if f['properties']['art'] == 'gebiet'}
        B['gebiete']['zentrum']['landmarken'] = [x['name'] for x in [f['properties'] for f in g['features'] if f['properties']['id'] == 'zentrum'][0]['landmarken']]
        B['ortsteile'] = [{k: f['properties'].get(k) for k in ('name', 'place', 'in_kernstadt', 'entfernung_zentrum_km', 'osm')}
                          for f in g['features'] if f['properties']['art'] == 'ortsteil']
        B['ortsteil_grenzen'] = [{k: f['properties'].get(k) for k in ('name', 'admin_level', 'flaeche_km2', 'osm')}
                                 for f in g['features'] if f['properties']['art'] == 'ortsteil_grenze']
    else:
        miss.append('gebiete.geojson')
    for key, fn, pick in (
            ('kacheln', 'kacheln.json', lambda d: {k: d[k] for k in ('produkte', 'p4_1km_kacheln_im_block_b_um_den_garten', 'routen_m', 'dateinamen', 'zeilen_csv')}),
            ('osm', 'osm_bestand.json', lambda d: {k: d[k] for k in ('quelle', 'elemente', 'gebaeude', 'strassenraum')}),
            ('ethos', 'ethos.json', lambda d: {'spalten': d['spalten'], 'im_rechteck_um_suhl': d['im_rechteck_um_suhl'], 'gebiete': d['gebiete'],
                                               'hohe_gebaeude_ab_25_m': {k: v for k, v in d['hohe_gebaeude_ab_25_m'].items() if k != 'liste'},
                                               'hohe_gebaeude_ab_25_m_und_100_m2': [x for x in d['hohe_gebaeude_ab_25_m']['liste'] if x['grundflaeche_m2'] >= 100]}),
            ('luftbild', 'luftbild.json', lambda d: {k: d[k] for k in ('quelle', 'kacheln_abgefragt', 'flugtage_P1_bis_P3', 'flugtage_je_prioritaet', 'naht_linien', 'felder_th_dop_info', 'beispiel')}),
            ('oepnv', 'oepnv.json', lambda d: {k: d[k] for k in ('quelle', 'referenzwoche', 'haltestellen', 'linien', 'fahrten_mit_halt_in_suhl', 'nach_schleusingen', 'nach_ratscher')}),
            ('landesdienste', 'landesdienste.json', lambda d: {'made': d['made'], 'von': d['von'], 'befund': d['befund'],
                                                             'proben': [{k: p.get(k) for k in ('name', 'zeit', 'status', 'art', 'bytes')} for p in d['proben']]})):
        d = load(fn)
        if d is None:
            miss.append(fn)
            continue
        try:
            B[key] = pick(d)
            B[key]['datei'] = 'tools/suhl/out/bestand/' + fn
            B[key]['stand'] = d.get('made')
        except Exception as ex:
            miss.append(f'{fn}: {ex!r}')
    act = {}
    ad = os.path.join(sblib.OUT, 'actions')
    if os.path.isdir(ad):
        for fn in sorted(os.listdir(ad)):
            if fn.endswith('.json'):
                d = json.load(open(os.path.join(ad, fn), encoding='utf-8'))
                act[fn] = {'stand': d.get('made'), 'quelle': d.get('quelle') or d.get('von')}
                if fn == 'osm_geofabrik.json':
                    act[fn]['gebaeude'] = {k: d['gebaeude'][k]['anzahl'] for k in ('stadt', 'kernstadt', 'zentrum')}
                    act[fn]['highway_km'] = {k: d['strassenraum'][k]['highway_km_gesamt'] for k in ('stadt', 'kernstadt', 'zentrum')}
                if fn == 'ethos.json':
                    act[fn]['gebaeude'] = {k: d['gebiete'][k]['anzahl'] for k in ('stadt', 'kernstadt', 'zentrum')}
                if fn == 'landesdienste.json':
                    act[fn]['befund'] = {k: d['befund'].get(k) for k in ('alte_adressen', 'neues_portal')}
    B['aus_github_actions'] = act or 'noch kein Ergebnis'
    B['fehlt'] = miss
    sblib.write_json(os.path.join(sblib.OUT, 'bestand.json'), B, indent=1)
    sblib.log('written bestand.json', os.path.getsize(os.path.join(sblib.OUT, 'bestand.json')), 'bytes; missing:', miss, '; actions:', list(act) if act else None)


if __name__ == '__main__':
    main()
