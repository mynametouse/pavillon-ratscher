#!/usr/bin/env python3
"""Which sources answer from this machine? Fetches the first bytes of each URL (GET, Range 0-2047, 30 s) and writes OUT_DIR/probe.csv
(status, type, size, first characters) – run on GitHub Actions for the sources the chat machine cannot reach, and for the ones whose
download URL is only a guess.   python3 -I tools/daten/quellen_probe.py OUT_DIR"""
import csv, os, re, sys, urllib.request, urllib.error
UA = 'pavillon-ratscher daten-katalog/1.0 (open-data research; github.com/mynametouse/pavillon-ratscher)'
URLS = [
    ('Geofabrik Thüringen (PBF, Kopf)', 'https://download.geofabrik.de/europe/germany/thueringen-latest.osm.pbf'),
    ('Overpass API', 'https://overpass-api.de/api/status'),
    ('Wikidata SPARQL', 'https://query.wikidata.org/sparql?query=SELECT%20%3Fa%20WHERE%20%7B%20wd%3AQ504914%20wdt%3AP1082%20%3Fa%20%7D&format=json'),
    ('TH DGM1-Kachel (Beispiel)', 'https://geoportal.geoportal-th.de/hoehendaten/DGM/dgm_2020-2025/dgm1_32_625_5595_1_th_2020-2025.zip'),
    ('TH ATOM Höhendaten DGM', 'https://geoportal.geoportal-th.de/dienste/atom_th_hoehendaten_dgm'),
    ('TH ATOM 3D-Gebäude (Rate 1)', 'https://geoportal.geoportal-th.de/dienste/atom_th_lod2'),
    ('TH ATOM 3D-Gebäude (Rate 2)', 'https://geoportal.geoportal-th.de/dienste/atom_th_3d_gebaeudemodell'),
    ('TH ATOM ALKIS (Rate)', 'https://geoportal.geoportal-th.de/dienste/atom_th_alkis'),
    ('TH Download-Portal', 'https://geoportal.thueringen.de/gdi-th/download-offene-geodaten'),
    ('TH Geoproxy ALKIS WMS (Rate)', 'https://www.geoproxy.geoportal-th.de/geoproxy/services/alkis?SERVICE=WMS&REQUEST=GetCapabilities'),
    ('TH Geoproxy Liste', 'https://www.geoproxy.geoportal-th.de/geoproxy/services'),
    ('BKG LoD2-DE Produktseite', 'https://gdz.bkg.bund.de/index.php/default/digitale-geodaten/sonstige-geodaten/3d-gebaudemodelle-lod2-deutschland-lod2-de.html'),
    ('BKG Open-Data-Hinweis', 'https://gdz.bkg.bund.de/index.php/default/open-data.html'),
    ('BASt Zählstellen (Seite)', 'https://www.bast.de/DE/Verkehrstechnik/Fachthemen/v2-verkehrszaehlung/Verkehrszaehlung_node.html'),
    ('BASt Zähldaten (Seite)', 'https://www.bast.de/DE/Verkehrstechnik/Fachthemen/v2-verkehrszaehlung/Daten/Daten_node.html'),
    ('Mapillary Graph (ohne Token)', 'https://graph.mapillary.com/images?bbox=10.74,50.50,10.75,50.51&fields=id&limit=1'),
    ('Panoramax Suche', 'https://api.panoramax.xyz/api/search?bbox=10.75,50.495,10.78,50.502&limit=1'),
    ('Ladesäulenregister BNetzA (Seite)', 'https://www.bundesnetzagentur.de/DE/Fachthemen/ElektrizitaetundGas/E-Mobilitaet/Ladesaeulenkarte/start.html'),
    ('Breitbandatlas (Seite)', 'https://www.breitbandatlas.de/'),
    ('DWD Open Data Wetterstation Suhl', 'https://opendata.dwd.de/climate_environment/CDC/observations_germany/climate/daily/kl/recent/'),
    ('Marktstammdatenregister Hilfe (Open Data)', 'https://www.marktstammdatenregister.de/MaStR/Datendownload'),
    ('SLUB Kartenforum', 'https://kartenforum.slub-dresden.de/'),
    ('Deutsche Fotothek API', 'https://api.deutsche-digitale-bibliothek.de/'),
    ('Thüringen Denkmal (TLDA Seite)', 'https://denkmalpflege.thueringen.de/'),
    ('Landkreis Hildburghausen', 'https://www.landkreis-hildburghausen.de/'),
    ('Stadt Schleusingen', 'https://www.schleusingen.de/'),
    ('OBI Markt Schleusingen (Seite)', 'https://www.obi.de/markt/schleusingen'),
    ('McDonalds Restaurantsuche', 'https://www.mcdonalds.com/de/de-de/restaurant-suche.html'),
]


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    rows = []
    for label, url in URLS:
        try:
            req = urllib.request.Request(url, headers={'User-Agent': UA, 'Range': 'bytes=0-2047'})
            with urllib.request.urlopen(req, timeout=30) as r:
                b = r.read(2048)
                rows.append({'quelle': label, 'url': url, 'status': r.status, 'typ': r.headers.get('Content-Type', ''), 'laenge': r.headers.get('Content-Range') or r.headers.get('Content-Length', ''),
                             'anfang': re.sub(r'\s+', ' ', b.decode('utf-8', 'replace'))[:160]})
        except urllib.error.HTTPError as e:
            rows.append({'quelle': label, 'url': url, 'status': e.code, 'typ': e.headers.get('Content-Type', ''), 'laenge': '', 'anfang': ''})
        except Exception as e:
            rows.append({'quelle': label, 'url': url, 'status': 'FEHLER', 'typ': '', 'laenge': '', 'anfang': str(e)[:120]})
        print(rows[-1]['status'], label, flush=True)
    with open(os.path.join(out, 'probe.csv'), 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), delimiter=';')
        w.writeheader(); w.writerows(rows)


if __name__ == '__main__': main()
