#!/usr/bin/env python3
"""suhl-bestand, deliverables 2 (end) and 3: what answers today at the Thuringian download addresses, and which public services could
replace the manual download - probes only, one small request each, no bulk download -> landesdienste.json (in tools/suhl/out/bestand/,
or the path given with --out when it runs in GitHub Actions).

  python3 -I tools/suhl/bestand/landesdienste.py [--out FILE]
"""
import argparse, io, json, os, re, struct, sys, time
import xml.etree.ElementTree as ET

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import sblib

GP = 'https://www.geoproxy.geoportal-th.de/geoproxy/services'
OLD = 'https://geoportal.geoportal-th.de'
# a point on a building near the Markt and a 1-km tile of the centre
E0, N0 = 619808.0, 5607859.0
TE, TN = 619, 5607


def text_of(b):
    t = b.decode('utf-8', 'replace')
    t = re.sub(r'<script.*?</script>|<style.*?</style>', '', t, flags=re.S | re.I)
    return re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', t)).strip()


def probe(name, url, note='', limit=3000000, **kw):
    t0 = time.time()
    st, b, ct = sblib.http_get(url, timeout=kw.get('timeout', 60), tries=kw.get('tries', 2), limit=limit)
    kind = 'zip' if b[:2] == b'PK' else ('tiff' if b[:4] in (b'II*\x00', b'MM\x00*') else ('png' if b[:4] == b'\x89PNG' else ('jpeg' if b[:2] == b'\xff\xd8' else '')))
    txt = '' if kind else text_of(b[:6000])
    if not kind:
        low = txt.lower()
        if 'captcha' in low:
            kind = 'captcha'
        elif 'nicht verf' in low and 'serviceinformation' in low:
            kind = 'wartungsseite'
        elif 'exception' in low:
            kind = 'exception'
        elif b.lstrip()[:5] in (b'<?xml', b'<wfs:', b'<WMS_', b'<wms:', b'<Capa') or b'Capabilities' in b[:600]:
            kind = 'xml'
        elif b.lstrip()[:1] in (b'{', b'['):
            kind = 'json'
        else:
            kind = 'html' if 'html' in ct else (ct or 'leer')
    r = {'name': name, 'url': url, 'zeit': sblib.now(), 'status': st, 'content_type': ct, 'bytes': len(b), 'art': kind,
         'sekunden': round(time.time() - t0, 1), 'auszug': txt[:260], 'notiz': note}
    sblib.log(f"{name:34s} {st} {kind:13s} {len(b):8d} B  {txt[:90]}")
    time.sleep(0.7)
    return r, b


def names(b, tag):
    try:
        root = ET.fromstring(b)
    except Exception:
        return []
    out = []
    for el in root.iter():
        if el.tag.split('}')[-1] == tag:
            for c in el:
                if c.tag.split('}')[-1] in ('Name', 'Identifier', 'CoverageId') and c.text:
                    out.append(c.text.strip())
                    break
    return out


def tiff_info(b):
    """bits per sample, sample format, size of a (Geo)TIFF from its first IFD"""
    try:
        bo = '<' if b[:2] == b'II' else '>'
        off = struct.unpack(bo + 'I', b[4:8])[0]
        n = struct.unpack(bo + 'H', b[off:off + 2])[0]
        tags = {}
        for i in range(n):
            tag, typ, cnt, val = struct.unpack(bo + 'HHII', b[off + 2 + 12 * i: off + 14 + 12 * i])
            if typ == 3 and cnt == 1:
                val = struct.unpack(bo + 'H', b[off + 10 + 12 * i: off + 12 + 12 * i])[0]
            tags[tag] = (typ, cnt, val)
        g = lambda k: tags.get(k, (0, 0, None))[2]
        return {'breite': g(256), 'hoehe': g(257), 'bits': g(258) if tags.get(258, (0, 1, 0))[1] == 1 else 'mehrere', 'samples': g(277),
                'sampleformat': {1: 'uint', 2: 'int', 3: 'float'}.get(g(339), g(339)), 'geotiff': 33922 in tags or 34735 in tags}
    except Exception as ex:
        return {'fehler': repr(ex)[:80]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(sblib.OUT, 'landesdienste.json'))
    a = ap.parse_args()
    R = {'made': sblib.now(), 'von': 'GitHub Actions' if os.environ.get('GITHUB_ACTIONS') else 'Chat-Rechner', 'proben': [], 'befund': {}}
    P = R['proben']

    # ---- 1 the old download addresses for one tile of the centre, each product; the new portal
    for name, url in (
            ('DGM1 2020-2025', f'{OLD}/hoehendaten/DGM/dgm_2020-2025/dgm1_32_{TE}_{TN}_1_th_2020-2025.zip'),
            ('DGM1 2014-2019', f'{OLD}/hoehendaten/DGM/dgm_2014-2019/dgm1_32_{TE}_{TN}_1_th_2014-2019.zip'),
            ('DOM1 2020-2025', f'{OLD}/hoehendaten/DOM/dom_2020-2025/dom1_32_{TE}_{TN}_1_th_2020-2025.zip'),
            ('LoD2', f'{OLD}/3dgebaeude/LoD2/LoD2_32_618_5606_2_TH.zip'),
            ('ATOM Höhendaten DGM', f'{OLD}/dienste/atom_th_hoehendaten_dgm'),
            ('README Höhendaten', f'{OLD}/hoehendaten/Uebersichten/README_Hoehendaten_2020-2025.pdf'),
            ('neues Portal Höhendaten', 'https://geoportal.thueringen.de/gdi-th/download-offene-geodaten/download-hoehendaten'),
            ('neues Portal Start', 'https://geoportal.thueringen.de/gdi-th/download-offene-geodaten')):
        r, b = probe(name, url, limit=200000)
        P.append(r)
    R['befund']['alte_adressen'] = sorted({p['art'] for p in P[:6]})
    R['befund']['neues_portal'] = sorted({p['art'] for p in P[6:8]})

    # ---- 2 the geoproxy: all WMS layers and WFS feature types
    r, b = probe('WMS alle Ebenen', f'{GP}?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0', limit=None)
    lay = names(b, 'Layer')
    r['ebenen'] = len(lay)
    want = ['Gebaeude', 'GebaeudeAusLuftbild', 'Firstlinie', 'Bauteil', 'Gebaeudefunktion', 'DachformGebaeude', 'GeschossanzahlGebaeude',
            'alkis_geb', 'AngabeZurGebaeudefunktion', 'DGM2', 'DGM5', 'hangneigung', 'versiegelung', 'EL.GridCoverage', 'AD.Address',
            'gaz_hnr_wms', 'ampel', 'laermschutzwand', 'th_dop', 'th_dop20cir', 'th_dop_info', 'th_dtk', 'TN.RoadTransportNetwork.RoadLink']
    r['gesucht_vorhanden'] = [w for w in want if w in lay]
    r['gesucht_fehlt'] = [w for w in want if w not in lay]
    r['mit_dom_lod_3d_mesh_schraeg_true'] = [n for n in lay if re.search(r'dom|lod|3d|mesh|schr|true|oblique|bdom|ndom', n, re.I)]
    P.append(r)
    r, b = probe('WFS alle Objektarten', f'{GP}?SERVICE=WFS&REQUEST=GetCapabilities&VERSION=2.0.0', limit=None)
    ft = names(b, 'FeatureType')
    r['objektarten'] = ft
    P.append(r)

    # ---- 3 what the building layers tell at one building (GetFeatureInfo), no bulk
    gfi = {}
    for layer in ('Gebaeude', 'Gebaeudefunktion', 'DachformGebaeude', 'GeschossanzahlGebaeude', 'Firstlinie', 'Bauteil', 'alkis_geb',
                  'AngabeZurGebaeudefunktion', 'GebaeudeAusLuftbild', 'EL.GridCoverage', 'DGM2', 'gaz_hnr_wms', 'AD.Address'):
        url = (f'{GP}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetFeatureInfo&LAYERS={layer}&QUERY_LAYERS={layer}&STYLES=&CRS=EPSG:25832'
               f'&BBOX={E0 - 25},{N0 - 25},{E0 + 25},{N0 + 25}&WIDTH=101&HEIGHT=101&I=50&J=50&INFO_FORMAT=text/plain&FEATURE_COUNT=3')
        r, b = probe('GetFeatureInfo ' + layer, url, limit=20000)
        t = b.decode('utf-8', 'replace')
        kv = [x.split('=', 1) for x in re.split(r'\$#\$|\n', t) if '=' in x and not x.lstrip().startswith('<')]
        keys = sorted({k.strip() for k, v in kv})
        r['felder'] = keys[:60]
        if layer == 'alkis_geb':     # the values of one building near the Markt as an example of what the layer tells
            r['beispiel'] = {k.strip(): v.strip()[:60] for k, v in kv if not re.search(r'name|lage|strasse|haus', k, re.I)}
        gfi[layer] = {'status': r['status'], 'art': r['art'], 'felder': keys[:60]}
        P.append(r)
    R['befund']['getfeatureinfo'] = gfi

    # ---- 4 elevation as data? WCS, and the INSPIRE elevation layer as TIFF
    for name, url in (
            ('WCS am Geoproxy', f'{GP}?SERVICE=WCS&REQUEST=GetCapabilities'),
            ('WCS Dienst DGM', f'{GP}/DGM?SERVICE=WCS&REQUEST=GetCapabilities'),
            ('WMS Dienst DGM', f'{GP}/DGM?SERVICE=WMS&REQUEST=GetCapabilities'),
            ('WMS Dienst DOM', f'{GP}/DOM?SERVICE=WMS&REQUEST=GetCapabilities'),
            ('WMS Dienst ALKIS', f'{GP}/ALKIS?SERVICE=WMS&REQUEST=GetCapabilities'),
            ('WFS Dienst INSPIRE bu', f'{GP}/INSPIREbu?SERVICE=WFS&REQUEST=GetCapabilities'),
            ('WMS Dienst LoD2', f'{GP}/LoD2?SERVICE=WMS&REQUEST=GetCapabilities')):
        r, b = probe(name, url, limit=400000)
        if r['art'] == 'xml':
            r['ebenen'] = names(b, 'Layer')[:40] or names(b, 'CoverageSummary')[:40] or names(b, 'FeatureType')[:40]
        P.append(r)
    box = f'{E0 - 100},{N0 - 100},{E0 + 100},{N0 + 100}'
    for layer, fmt in (('EL.GridCoverage', 'image/tiff'), ('DGM2', 'image/tiff')):
        r, b = probe(f'GetMap {layer} als TIFF', f'{GP}?SERVICE=WMS&VERSION=1.3.0&REQUEST=GetMap&LAYERS={layer}&STYLES=&CRS=EPSG:25832&BBOX={box}'
                     f'&WIDTH=200&HEIGHT=200&FORMAT={fmt}', limit=None)
        if r['art'] == 'tiff':
            r['tiff'] = tiff_info(b)
        P.append(r)

    # ---- 5 house coordinates by WFS (attributes only, three features)
    r, b = probe('WFS Hauskoordinaten', f'{GP}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=tlvermgeo:GAZHKO_HNR&COUNT=3'
                 f'&SRSNAME=EPSG:25832&BBOX={E0 - 80},{N0 - 80},{E0 + 80},{N0 + 80},EPSG:25832', limit=60000)
    t = b.decode('utf-8', 'replace')
    r['felder'] = sorted(set(re.findall(r'<(?:tlvermgeo|\w+):([A-Za-z_]\w*)>[^<]', t)))[:40]
    r['auszug'] = ''          # addresses are not kept
    P.append(r)

    # ---- 5b the cadastre's buildings as data: WFS 'ALKIS vereinfacht' (AdV product), feature type ave:GebaeudeBauwerk, a 200 m box
    AW = GP + '/adv_alkis_wfs'
    r, b = probe('WFS ALKIS vereinfacht Capabilities', f'{AW}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetCapabilities', limit=400000)
    t = b.decode('utf-8', 'replace')
    r['objektarten'] = sorted(set(re.findall(r'<(?:\w+:)?Name[^>]*>\s*(ave:[\w.-]+)\s*</(?:\w+:)?Name>', t)))
    r['lizenz'] = (re.findall(r'<ows:Fees>(.*?)</ows:Fees>', t, re.S) or [''])[0].strip()[:200]
    P.append(r)
    r, b = probe('WFS ALKIS vereinfacht Gebäude', f'{AW}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAMES=ave:GebaeudeBauwerk&COUNT=200'
                 f'&SRSNAME=urn:ogc:def:crs:EPSG::25832&BBOX={E0 - 100:.0f},{N0 - 100:.0f},{E0 + 100:.0f},{N0 + 100:.0f},urn:ogc:def:crs:EPSG::25832', limit=None)
    t = b.decode('utf-8', 'replace')
    feats = re.findall(r'<ave:GebaeudeBauwerk .*?</ave:GebaeudeBauwerk>', t, flags=re.S)
    from collections import Counter
    keys, vals = Counter(), {}
    for f in feats:
        for k, v in re.findall(r'<ave:(\w+)>([^<]*)</ave:\w+>', f):
            keys[k] += 1
            if k in ('funktion', 'gebnutzbez', 'anzahlgs'):
                vals.setdefault(k, Counter())[v[:50]] += 1
            if k == 'aktualit':
                vals.setdefault(k, Counter())[v[:4]] += 1
    r['gebaeude_im_200_m_quadrat'] = len(feats)
    r['felder'] = dict(keys)
    r['werte'] = {k: dict(c.most_common(8)) for k, c in vals.items()}
    r['geometrie'] = dict(Counter(re.findall(r'<gml:(Polygon|MultiSurface|Surface|Point|MultiPolygon)\b', t)))
    r['auszug'] = ''          # addresses are not kept
    R['befund']['alkis_wfs'] = {k: r[k] for k in ('url', 'status', 'bytes', 'sekunden', 'gebaeude_im_200_m_quadrat', 'felder', 'werte', 'geometrie')}
    P.append(r)

    # ---- 6 basemap.de: vector tiles (buildings with height?), hillshade
    r, b = probe('basemap.de Vektor TileJSON', 'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/tiles/v2/bm_web_de_3857/bm_web_de_3857.json', limit=400000)
    try:
        tj = json.loads(b)
        r['tilejson'] = {'tiles': tj.get('tiles'), 'minzoom': tj.get('minzoom'), 'maxzoom': tj.get('maxzoom'), 'attribution': tj.get('attribution'),
                         'ebenen': [(v.get('id'), sorted((v.get('fields') or {}).keys())[:25]) for v in tj.get('vector_layers', [])
                                    if re.search(r'geb|build|haus|adress', str(v.get('id')), re.I)],
                         'alle_ebenen': [v.get('id') for v in tj.get('vector_layers', [])]}
    except Exception as ex:
        r['tilejson'] = {'fehler': repr(ex)[:100]}
    P.append(r)
    r, b = probe('basemap.de Schummerung WMS', 'https://sgx.geodatenzentrum.de/wms_basemapde_schummerung?REQUEST=GetCapabilities&Version=1.3.0&SERVICE=WMS', limit=400000)
    r['ebenen'] = names(b, 'Layer')
    P.append(r)

    # one vector tile of the centre (zoom 15): how many buildings, which attributes
    import math
    lat, lon = sblib.CENTRE
    z = 15
    x = int((lon + 180) / 360 * 2 ** z)
    y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * 2 ** z)
    r, b = probe('basemap.de Vektorkachel Zentrum', f'https://sgx.geodatenzentrum.de/gdz_basemapde_vektor/tiles/v2/bm_web_de_3857/{z}/{x}/{y}.pbf', limit=None)
    try:
        import gzip as _gz
        import mapbox_vector_tile
        raw = _gz.decompress(b) if b[:2] == b'\x1f\x8b' else b
        t = mapbox_vector_tile.decode(raw)
        g = t.get('Gebaeudeflaeche', {}).get('features', [])
        hs = [f['properties'].get('hoehe') for f in g if f['properties'].get('hoehe') is not None]
        r['kachel'] = {'z_x_y': [z, x, y], 'ebenen': {k: len(v.get('features', [])) for k, v in t.items()},
                       'gebaeudeflaechen': len(g), 'mit_hoehe': len(hs), 'hoehe_min_max': [min(hs), max(hs)] if hs else None,
                       'beispiel': g[0]['properties'] if g else None, 'extent': t.get('Gebaeudeflaeche', {}).get('extent')}
    except Exception as ex:
        r['kachel'] = {'fehler': repr(ex)[:160]}
    P.append(r)

    # ---- 7 catalogues: GeoMIS.Th (CSW GetRecords, a few words), the GDI-DE catalogue
    csw = 'https://geomis.geoportal-th.de/geonetwork/srv/ger/csw'
    found = {}
    for word in ('LoD2', '3D-Gebäude', 'WCS', 'Digitales Oberflächenmodell', 'bDOM', 'Schrägluftbild', 'TrueDOP', '3D-Mesh', 'Hausumringe', 'INSPIRE Gebäude', 'Historische Orthophotos'):
        import urllib.parse
        q = urllib.parse.quote(f"AnyText like '%{word}%'")
        url = (f'{csw}?SERVICE=CSW&VERSION=2.0.2&REQUEST=GetRecords&resultType=results&typeNames=csw:Record&elementSetName=summary'
               f'&outputSchema=http://www.opengis.net/cat/csw/2.0.2&constraintLanguage=CQL_TEXT&constraint_language_version=1.1.0'
               f'&constraint={q}&maxRecords=12')
        r, b = probe('GeoMIS Suche ' + word, url, limit=400000, tries=1, timeout=40)
        t = b.decode('utf-8', 'replace')
        m = re.search(r'numberOfRecordsMatched="(\d+)"', t)
        recs = []
        for rec in re.findall(r'<csw:SummaryRecord.*?</csw:SummaryRecord>', t, flags=re.S):
            ti = re.search(r'<dc:title>(.*?)</dc:title>', rec, re.S)
            ty = re.search(r'<dc:type>(.*?)</dc:type>', rec, re.S)
            idn = re.search(r'<dc:identifier>(.*?)</dc:identifier>', rec, re.S)
            recs.append({'titel': ti.group(1).strip()[:110] if ti else '', 'typ': ty.group(1).strip() if ty else '', 'id': idn.group(1).strip() if idn else ''})
        r['treffer'] = int(m.group(1)) if m else None
        r['titel'] = recs
        r['auszug'] = ''
        found[word] = {'treffer': r['treffer'], 'titel': [f"{x['titel']} [{x['typ']}]" for x in recs]}
        P.append(r)
    R['befund']['geomis'] = found

    # ---- 8 catalogues (capabilities)
    for name, url in (
            ('GeoMIS.Th CSW', 'https://geomis.geoportal-th.de/geonetwork/srv/ger/csw?SERVICE=CSW&VERSION=2.0.2&REQUEST=GetCapabilities'),
            ('GDI-DE Katalog CSW', 'https://gdk.gdi-de.org/gdi-de/srv/ger/csw?SERVICE=CSW&VERSION=2.0.2&REQUEST=GetCapabilities')):
        r, b = probe(name, url, limit=100000, tries=1, timeout=40)
        P.append(r)

    sblib.write_json(a.out, R, indent=1)
    sblib.log('written', a.out, len(P), 'probes')


if __name__ == '__main__':
    main()
