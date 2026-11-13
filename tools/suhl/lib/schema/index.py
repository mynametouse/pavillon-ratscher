"""index.json of a product version, suhl/aktuell.json, the ground's meta.json; checking whole folders; writing index and aktuell.

Layout in the data repo (plan 2.4), base = https://mynametouse.github.io/pavillon-daten/ :
    suhl/aktuell.json                         which version of every product is valid (the only file that is ever overwritten)
    suhl/<product>/v<N>/index.json            which tiles exist per level, sources, attribution, numbers - written once, never changed
    suhl/<product>/v<N>/[<sub>/]<L>/<x>/<y>.<ext>
    suhl/boden/v<N>/meta.json                 the ground keeps the layout WELT reads (tools/welt/build.py) with a list `has` per level;
                                              it is the ground's index (no index.json)
"""
import json, os, re

from .core import S, REV, check_envelope, is_int
from . import g as G, tiles as T

# sources every product names in its index (licences travel with the data). 'attribution' is the text the app shows.
CATALOGUE = {
    'ethos': {'title': 'ETHOS.BUILDA – Gebäudebestand Deutschland (Grundriss, Höhe), Thüringen aus dem LoD2 des Landes',
              'by': 'Forschungszentrum Jülich', 'licence': 'ODbL 1.0', 'url': 'https://zenodo.org/records/11845992',
              'attribution': 'Gebäude: ETHOS.BUILDA, Forschungszentrum Jülich (ODbL 1.0), aus LoD2 Thüringen © GDI-Th'},
    'alkis': {'title': 'ALKIS vereinfacht – Gebäude und Bauwerke (WFS adv_alkis_wfs, ave:GebaeudeBauwerk)', 'by': 'TLBG, GDI-Th',
              'licence': 'CC BY 4.0', 'url': 'https://www.geoproxy.geoportal-th.de/geoproxy/services/adv_alkis_wfs',
              'attribution': 'Gebäudefunktion, Geschosse, Adressen: ALKIS © GDI-Th (CC BY 4.0)'},
    'lod2': {'title': '3D-Gebäudemodell LoD2 Thüringen', 'by': 'TLBG, GDI-Th', 'licence': 'CC BY 4.0',
             'url': 'https://geoportal.thueringen.de/gdi-th/download-offene-geodaten', 'attribution': 'Dachformen: LoD2 © GDI-Th (CC BY 4.0)'},
    'dop': {'title': 'Digitale Orthophotos Thüringen 20 cm (WMS th_dop, th_dop20cir)', 'by': 'TLBG, GDI-Th', 'licence': 'CC BY 4.0',
            'url': 'https://www.geoproxy.geoportal-th.de/geoproxy/services/DOP', 'attribution': 'Luftbild: © GDI-Th (CC BY 4.0)'},
    'dgm1': {'title': 'Digitales Geländemodell DGM1 Thüringen (1 m)', 'by': 'TLBG, GDI-Th', 'licence': 'CC BY 4.0',
             'url': 'https://geoportal.thueringen.de/gdi-th/download-offene-geodaten', 'attribution': 'Gelände: DGM1 © GDI-Th (CC BY 4.0)'},
    'dom1': {'title': 'Digitales Oberflächenmodell DOM1 Thüringen (1 m)', 'by': 'TLBG, GDI-Th', 'licence': 'CC BY 4.0',
             'url': 'https://geoportal.thueringen.de/gdi-th/download-offene-geodaten', 'attribution': 'Oberflächenmodell: DOM1 © GDI-Th (CC BY 4.0)'},
    'ndom1': {'title': 'Normalisiertes Oberflächenmodell nDOM1 (Objekthöhen 1 m, DOM1 − DGM1) Thüringen', 'by': 'TLBG, GDI-Th',
              'licence': 'CC BY 4.0', 'url': 'https://easygeodata.de', 'attribution': 'Objekthöhen: nDOM1 © GDI-Th (CC BY 4.0)'},
    'cop30': {'title': 'Copernicus DEM GLO-30 (Oberflächenmodell 30 m)', 'by': 'DLR, Airbus, EU/ESA', 'licence': 'Copernicus DEM licence',
              'url': 'https://copernicus-dem-30m.s3.amazonaws.com/',
              'attribution': 'Copernicus DEM GLO-30: © DLR e.V. 2010-2014 und © Airbus Defence and Space GmbH 2014-2018, bereitgestellt im Rahmen '
                             'von COPERNICUS durch EU und ESA'},
    'osm': {'title': 'OpenStreetMap', 'by': 'OpenStreetMap-Mitwirkende', 'licence': 'ODbL 1.0', 'url': 'https://www.openstreetmap.org/copyright',
            'attribution': '© OpenStreetMap-Mitwirkende (ODbL)'},
    'gtfs': {'title': 'Soll-Fahrplandaten Deutschland (GTFS, gtfs.de aus DELFI)', 'by': 'DELFI e.V.', 'licence': 'CC BY 4.0',
             'url': 'https://gtfs.de/de/feeds/', 'attribution': 'Fahrplan: DELFI e.V. (CC BY 4.0), aufbereitet von gtfs.de'},
    'worldcover': {'title': 'ESA WorldCover 2021 v200 (Landbedeckung 10 m)', 'by': 'ESA', 'licence': 'CC BY 4.0',
                   'url': 'https://esa-worldcover.org', 'attribution': 'Landbedeckung: © ESA WorldCover project 2021 (CC BY 4.0)'},
    'wissen': {'title': 'Recherche des Projekts (docs/plans/suhl/*.md, Quellen dort je Angabe)', 'by': 'Pavillon Ratscher',
               'licence': 'eigene Zusammenstellung', 'url': 'https://github.com/mynametouse/pavillon-ratscher/tree/src/docs/plans/suhl',
               'attribution': 'Angaben zu Bauten und Vierteln: eigene Recherche'},
    'regel': {'title': 'Regeln und Annahmen der Pipeline (als Schätzung gekennzeichnet)', 'by': 'Pavillon Ratscher', 'licence': '–', 'url': '',
              'attribution': ''},
}
VIA_EASYGEODATA = 'bezogen über easygeodata.de'
# the keys every index.json has (CORE); a product adds keys of its own next to them (they are not checked)
INDEX_CORE = ('schema', 'product', 'version', 'made', 'area', 'has', 'based_on', 'sources', 'attribution')
INDEX_COMMON = INDEX_CORE + ('rev', 'n', 'marks', 'run', 'note')
_ISO = re.compile(r'^20[0-9]{2}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z$')
ITEMS = {'g': 'b', 's': 'ways', 'd': 'd', 'gr': 'f', '_probe': 'b'}       # where a JSON tile keeps its things (m: tiles.m_count)


def version_of(v):
    """the N of a version given as 3, '3' or 'v3'; None when it is none of these"""
    if is_int(v) and v >= 0:
        return v
    if isinstance(v, str) and re.fullmatch(r'v?[0-9]+', v):
        return int(v.lstrip('v'))
    return None


def source(sid, **extra):
    """a source entry for an index: schema.source('dgm1', via=VIA_EASYGEODATA, date='2020–2025')"""
    if sid not in CATALOGUE:
        raise S.SuhlError(f'unknown source {sid!r} (known: {", ".join(CATALOGUE)}); give a full entry instead')
    d = {'id': sid}
    d.update(CATALOGUE[sid])
    d.update(extra)
    return d


def attribution_line(sources):
    out = []
    for s in sources:
        a = s.get('attribution', '') if isinstance(s, dict) else ''
        if isinstance(s, dict) and s.get('via') and a:
            a += f' – {s["via"]}'
        if a and a not in out:
            out.append(a)
    return ' · '.join(out)


def _count_items(product, path):
    """how many things a tile holds (buildings, trees, ways ...) - for the numbers of the index"""
    try:
        if product == 'b':
            return os.path.getsize(path) // T.TREE_REC.size
        if product == 'w':
            return sum(1 for k in S.read_bytes(path)[:T.W_CELLS * T.W_CELLS] if k)
        if product == 'm':
            return T.m_count(S.read_json(path))
        if product in ITEMS:
            v = S.read_json(path).get(ITEMS[product])
            return len(v) if v is not None else 0
    except Exception:
        return 0
    return 0


def make_index(folder, product, version, area, sources, marks=None, run=None, note=None, based_on=None, extra=None, write=True):
    """scan a product folder (<...>/suhl/<product>/v<N>) and write its index.json: the common part
    {schema, rev, product, version, made, area, has: {level: tile set}, based_on, n: {tiles, items, bytes}, sources, attribution} plus `extra`,
    the product's own keys (they never replace the common ones).
    sources = ids of CATALOGUE and/or full entries {id, title, licence, attribution, ...} - or a dict {id: text} as it is;
    marks = {name: {level: [(x, y)]}}; based_on = {product: version}: the generation of the other products this one was computed on
    (g: the ground its z0 was read from) - {} when it stands on none."""
    spec = S.PRODUCTS[product]
    if len(spec['tiles']) != 1 or '' not in spec['tiles']:
        raise S.SuhlError(f'product {product!r} has several tile folders: its index is meta.json, written by its own pipeline')
    levels, e = spec['tiles']['']
    src = sources if isinstance(sources, dict) else [source(s) if isinstance(s, str) else dict(s) for s in sources]
    lv, size = S.scan_tiles(folder, e)
    n_items = sum(_count_items(product, os.path.join(folder, str(L), str(x), f'{y}.{e}')) for L, tl in lv.items() for x, y in tl)
    doc = {'schema': S.SCHEMA, 'rev': REV, 'product': product, 'version': version_of(version), 'made': S.now(), 'area': area,
           'has': {str(L): S.tileset_encode(t) for L, t in sorted(lv.items())},
           'n': {'tiles': sum(len(t) for t in lv.values()), 'items': n_items, 'bytes': sum(size.values())},
           'based_on': {k: version_of(v) for k, v in (based_on or {}).items()},
           'sources': src, 'attribution': attribution_line(src) if isinstance(src, list) else ''}
    if marks:
        doc['marks'] = {name: {str(L): S.tileset_encode(t) for L, t in mlv.items()} for name, mlv in marks.items()}
    for k, v in (('run', run), ('note', note)):
        if v:
            doc[k] = v
    for k, v in (extra or {}).items():
        if k not in INDEX_COMMON or (k == 'attribution' and v and not doc['attribution']):
            doc[k] = v
    if write:
        S.write_json(os.path.join(folder, 'index.json'), doc)
    return doc


def normalise_index(folder, area=None, sources=None, note=None, based_on=None):
    """add the common part to an index.json that a pipeline wrote in its own words, and keep everything else of it.
    Taken from the old index where it is there: made, area (also `gebiet`), sources (also `quellen`), attribution, based_on
    (an index without it gets based_on: {} - say with based_on= which generation of the other products it was computed on)."""
    f = os.path.abspath(folder).rstrip('/')
    product, vname = os.path.basename(os.path.dirname(f)), os.path.basename(f)
    old = {}
    if os.path.exists(os.path.join(f, 'index.json')):
        try:
            old = S.read_json(os.path.join(f, 'index.json'))
        except Exception:
            old = {}
    area = area or old.get('area') or old.get('gebiet') or (old.get('numbers') or {}).get('gebiet')
    src = sources or old.get('sources') or old.get('quellen')
    if not area:
        raise S.SuhlError('the index needs an area: --area probe|zentrum|kernstadt|stadt (none found in the old index)')
    if not src:
        raise S.SuhlError('the index needs sources: --sources ethos,osm,... (ids: validate.py --sources-list; none found in the old index)')
    legacy = {'v', 'p', 'ext'}                                             # the head of revision 1.0
    if isinstance(old.get('tiles'), dict) and ('' in old['tiles'] or any(isinstance(v, dict) and 'bits' in v for v in old['tiles'].values())):
        legacy.add('tiles')                                                # tile sets under their old name (now `has`)
    doc = make_index(f, product, vname, area, src, note=note or old.get('note'), write=False,
                     based_on=based_on if based_on is not None else old.get('based_on') if isinstance(old.get('based_on'), dict) else None,
                     extra={k: v for k, v in old.items() if k not in INDEX_COMMON and k not in legacy})
    if isinstance(old.get('made'), str) and _ISO.match(old['made']):
        doc['made'] = old['made']
    if isinstance(old.get('attribution'), str) and old['attribution'].strip():
        doc['attribution'] = old['attribution']                        # the product's own wording of its attribution stays
    if not doc['attribution']:
        raise S.SuhlError('the index needs an attribution line: sources from the catalogue (--sources) give one')
    S.write_json(os.path.join(f, 'index.json'), doc)
    return doc


def index_has(doc):
    """{level: [(x, y)]} of an index document (or of a ground meta.json)"""
    out = {}
    if isinstance(doc.get('has'), dict):
        for Ls, ts in doc['has'].items():
            out[int(Ls)] = S.tileset_decode(ts)
    elif isinstance((doc.get('tiling') or {}).get('levels'), dict):
        for Ls, lv in doc['tiling']['levels'].items():
            if isinstance(lv.get('has'), list):
                out[int(Ls)] = sorted(((int(x), int(y)) for x, y in lv['has']), key=lambda t: (t[1], t[0]))
            elif isinstance(lv.get('rect'), list):
                x0, y0, x1, y1 = lv['rect']
                out[int(Ls)] = [(x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
    return out


def check_index(doc, rep, where, folder=None, product=None, version=None):
    """index.json of one product version; with folder: the tile lists must equal the files"""
    if not isinstance(doc, dict):
        rep.err(where, 'index.json is not a JSON object')
        return
    miss = [k for k in INDEX_CORE if k not in doc]
    if miss:
        rep.err(where, f'the common fields {miss} are missing - every index.json carries {list(INDEX_CORE)}; '
                       f'"python3 -I tools/suhl/lib/validate.py --index <folder> [--area ...] [--sources ...]" adds them and keeps all other keys',
                'index core')
        return
    if doc.get('schema') != S.SCHEMA:
        rep.err(where, f'"schema" must be the schema number {S.SCHEMA}, found {doc.get("schema")!r}', 'schema')
    p = doc.get('product')
    if p not in S.PRODUCTS or (product and p != product):
        rep.err(where, f'"product" must be {repr(product) if product else "a product"}, found {p!r} (known: {sorted(S.PRODUCTS)})', 'product')
        return
    v = version_of(doc.get('version'))
    if v is None or (version is not None and v != version):
        rep.err(where, f'"version" must be the N of the folder v<N>{" (" + str(version) + ")" if version is not None else ""} as a number or '
                       f'"v<N>", found {doc.get("version")!r}', 'version')
    if not (isinstance(doc.get('made'), str) and _ISO.match(doc['made'])):
        rep.err(where, f'"made" must be a UTC time like 2026-11-13T01:30:00Z, found {doc.get("made")!r}', 'made')
    if not (isinstance(doc.get('area'), str) and doc['area']):
        rep.err(where, '"area" must say in a word what the version covers (probe, zentrum, kernstadt, stadt ...)', 'area')
    src = doc.get('sources')
    if not (isinstance(src, (list, dict)) and src):
        rep.err(where, '"sources" must name the sources: a list of entries (schema.source(id) gives those of the catalogue) or {id: text}', 'sources')
    elif isinstance(src, list):
        for s in src:
            if not (isinstance(s, dict) and (s.get('title') or s.get('name')) and (s.get('licence') or s.get('lizenz'))):
                rep.err(where, f'a source needs a title and a licence: {json.dumps(s, ensure_ascii=False)[:120]}', 'source')
    if not (isinstance(doc.get('attribution'), str) and doc['attribution'].strip()):
        rep.err(where, '"attribution" must be the line the app shows (© ...)', 'attribution')
    if not (isinstance(doc.get('based_on'), dict) and all(k in S.PRODUCTS and version_of(q) is not None for k, q in doc['based_on'].items())):
        rep.err(where, '"based_on" must be {product: version} - the generation of the other products this one was computed on ({} when none)', 'based_on')
    spec = S.PRODUCTS[p]
    levels, e = spec['tiles'].get('', ((0, 20), None))
    try:
        have = index_has(doc)
        assert isinstance(doc['has'], dict)
    except Exception as ex:
        rep.err(where, f'"has" must be {{level: tile set}} with tile sets of suhllib.tileset_encode: {ex}', 'has')
        return
    for L in have:
        if not levels[0] <= L <= levels[1]:
            rep.err(where, f'level {L} is outside the levels {levels[0]}..{levels[1]} of {p}', 'level')
    if folder is not None and e:
        disk, _ = S.scan_tiles(folder, e)
        _lists_against_files(have, disk, rep, where, '')
    for name, lv in (doc.get('marks') or {}).items():
        try:
            for Ls, ts in lv.items():
                int(Ls)
                S.tileset_decode(ts)
        except Exception as ex:
            rep.err(where, f'"marks.{name}" must be {{level: tile set}}: {ex}', 'marks')


def _lists_against_files(have, disk, rep, where, sub):
    for L in sorted(set(have) | set(disk)):
        a, b = set(have.get(L, [])), set(disk.get(L, []))
        if a - b:
            rep.err(where, f'{len(a - b)} tiles of level {L}{" in " + sub if sub else ""} are listed but missing as files, e.g. '
                           f'{S.tile_key(L, *sorted(a - b)[0])}', 'listed, missing')
        if b - a:
            rep.err(where, f'{len(b - a)} tile files of level {L}{" in " + sub if sub else ""} are not listed, e.g. '
                           f'{S.tile_key(L, *sorted(b - a)[0])}', 'file, not listed')


def check_meta(doc, rep, where, folder=None, version=None):
    """the ground's meta.json in the layout viz3/src/welt/welt.js reads (tools/welt/build.py, format welt-test/1) with the Suhl
    additions of suhl-boden: suhl: {product, version, schema, ...} and a list `has` per level - only what Suhl relies on"""
    if not isinstance(doc, dict):
        rep.err(where, 'meta.json is not a JSON object')
        return
    if not str(doc.get('format', '')).startswith('welt-test/'):
        rep.err(where, f'"format" must be "welt-test/1" (the layout WELT reads), found {doc.get("format")!r}', 'meta format')
    lv = (doc.get('tiling') or {}).get('levels')
    if not isinstance(lv, dict) or not lv:
        rep.err(where, '"tiling.levels" is missing', 'meta levels')
        return
    su = doc.get('suhl')
    if not (isinstance(su, dict) and su.get('product') == 'boden' and su.get('schema') == S.SCHEMA and version_of(su.get('version')) is not None):
        rep.err(where, f'"suhl" must be {{product: "boden", version, schema: {S.SCHEMA}, ...}}', 'meta suhl')
    elif version is not None and version_of(su['version']) != version:
        rep.err(where, f'"suhl.version" {su["version"]!r} is not the version of the folder (v{version})', 'version')
    if not doc.get('attribution'):
        rep.err(where, '"attribution" is missing', 'meta attribution')
    if not doc.get('sources'):
        rep.err(where, '"sources" is missing', 'meta sources')
    if not all(isinstance(q.get('has'), list) for q in lv.values() if isinstance(q, dict)):
        rep.warn(where, 'a level has no list "has": WELT then takes the whole rectangle "rect" (hook W2 reads "has")', 'meta has')
    if isinstance(su, dict):
        if not isinstance(su.get('balanced'), bool):
            rep.warn(where, '"suhl.balanced" (true | false) is missing: are the image tiles colour-balanced like the rest of the world?', 'meta balanced')
        if not (isinstance(su.get('based_on'), dict) and all(k in S.PRODUCTS and version_of(q) is not None for k, q in su['based_on'].items())):
            rep.warn(where, '"suhl.based_on" ({product: version}, e.g. {"s": 1} once the roads are cut in; {} when none) is missing', 'meta based_on')
    if folder is not None:
        try:
            have = index_has(doc)
        except Exception as ex:
            rep.err(where, f'the lists "has" cannot be read: {ex}', 'meta has')
            return
        for sub, (levels, e) in S.PRODUCTS['boden']['tiles'].items():
            disk, _ = S.scan_tiles(os.path.join(folder, sub), e)
            _lists_against_files(have, disk, rep, where, sub)


def index_doc_of(folder):
    """the common index facts of a product version folder, whatever file holds them: {schema, product, version, made, area, n}"""
    f = os.path.abspath(folder).rstrip('/')
    product, vname = os.path.basename(os.path.dirname(f)), os.path.basename(f)
    if product == 'boden':
        m = S.read_json(os.path.join(f, 'meta.json'))
        su = m.get('suhl') or {}
        nb = nt = 0
        for sub, (levels, e) in S.PRODUCTS['boden']['tiles'].items():
            lv, size = S.scan_tiles(os.path.join(f, sub), e)
            nt += sum(len(t) for t in lv.values())
            nb += sum(size.values())
        return {'schema': su.get('schema', S.SCHEMA), 'product': 'boden', 'version': version_of(su.get('version', vname)),
                'made': m.get('generated') or S.now(), 'area': str(su.get('area') or su.get('mode') or ''), 'n': {'tiles': nt, 'bytes': nb},
                'based_on': su.get('based_on') if isinstance(su.get('based_on'), dict) else {}, 'index': 'meta.json'}
    d = S.read_json(os.path.join(f, 'index.json'))
    out = {k: d.get(k) for k in ('schema', 'product', 'made', 'area', 'based_on')}
    out['version'] = version_of(d.get('version'))
    out['n'] = d.get('n') or {}
    out['index'] = 'index.json'
    return out


def make_aktuell(old, index_doc):
    """the new suhl/aktuell.json after publishing the product version described by index_doc (index_doc_of(folder) or an index
    document); old = the present document or None"""
    doc = dict(old) if isinstance(old, dict) else {}
    doc.pop('v', None)
    doc['schema'] = S.SCHEMA
    doc['made'] = S.now()
    doc.setdefault('base', S.BASE_DEFAULT)
    pr = dict(doc.get('products') or {})
    p, v = index_doc['product'], version_of(index_doc['version'])
    e = {'version': v, 'schema': index_doc.get('schema', S.SCHEMA), 'path': f'{p}/v{v}/', 'index': f'{p}/v{v}/{index_doc.get("index", "index.json")}',
         'made': index_doc.get('made'), 'area': index_doc.get('area'), 'tiles': (index_doc.get('n') or {}).get('tiles', 0),
         'bytes': (index_doc.get('n') or {}).get('bytes', 0)}
    e['based_on'] = {k: version_of(v) for k, v in (index_doc.get('based_on') or {}).items()}
    pr[p] = e
    doc['products'] = {k: pr[k] for k in sorted(pr)}
    return doc


def check_aktuell(doc, rep, where, root=None):
    """suhl/aktuell.json: {schema, made, base, products: {product: {version, schema, path, index, made, area, tiles, bytes}}}"""
    if not isinstance(doc, dict) or not isinstance(doc.get('products'), dict):
        rep.err(where, 'aktuell.json must be {schema, made, base, products: {...}}')
        return
    if doc.get('schema') != S.SCHEMA:
        rep.err(where, f'"schema" must be {S.SCHEMA}', 'schema')
    if not (isinstance(doc.get('made'), str) and _ISO.match(doc['made'])):
        rep.err(where, '"made" must be a UTC time like 2026-11-13T01:30:00Z', 'made')
    for p, e in doc['products'].items():
        w = f'{where} products.{p}'
        if p not in S.PRODUCTS:
            rep.err(w, f'unknown product (known: {sorted(S.PRODUCTS)})', 'aktuell product')
            continue
        if not (isinstance(e, dict) and is_int(e.get('version')) and e['version'] >= 0 and is_int(e.get('schema')) and e['schema'] >= 1):
            rep.err(w, 'needs "version" (the N of v<N>) and "schema" (the schema number the app must know at least)', 'aktuell entry')
            continue
        ix = S.PRODUCTS[p]['index']
        if e.get('path') != f'{p}/v{e["version"]}/' or e.get('index') != f'{p}/v{e["version"]}/{ix}':
            rep.err(w, f'"path" must be "{p}/v{e["version"]}/" and "index" "{p}/v{e["version"]}/{ix}" (relative to suhl/)', 'aktuell path')
        if root is not None and not os.path.exists(os.path.join(root, 'suhl', p, f'v{e["version"]}', ix)):
            rep.err(w, f'the version v{e["version"]} it names does not exist (suhl/{p}/v{e["version"]}/{ix})', 'aktuell missing')


_CHECK = {'g': G.check_g_tile, 's': T.check_s_tile, 'm': T.check_m_tile, 'd': T.check_d_tile, 'gr': T.check_gr_tile}
_CHECK_BIN = {'b': T.check_b_tile, 'w': T.check_w_tile}
_MAGIC = {'bin': {'t': b'WTH1'}, 'webp': {'i': b'RIFF', '': b'RIFF'}}


def check_tile_file(path, rep, product=None, sub='', key=None):
    """one tile file; product, sub folder and key are read from the path .../suhl/<product>/v<N>/[<sub>/]<L>/<x>/<y>.<ext> when not given"""
    parts = os.path.abspath(path).replace('\\', '/').split('/')
    where = '/'.join(parts[-6:])
    if key is None:
        try:
            key = S.parse_key(path)
        except S.SuhlError:
            rep.err(where, 'the path does not end with <L>/<x>/<y>.<ext>')
            return
    if product is None:
        vi = [i for i, q in enumerate(parts) if re.fullmatch(r'v[0-9]+', q) and i >= 1]
        product = parts[vi[-1] - 1] if vi else None
        if vi and len(parts) - vi[-1] == 5:
            sub = parts[vi[-1] + 1]
    if product not in S.PRODUCTS:
        rep.err(where, f'cannot tell the product from the path (expected .../suhl/<product>/v<N>/...), found {product!r}')
        return
    where = f'{product}{"/" + sub if sub else ""}/{S.tile_key(*key)}'
    size = os.path.getsize(path)
    rep.stat(f'{product}: tiles')
    rep.stat(f'{product}: bytes', size)
    if size == 0:
        rep.err(where, 'the file is empty', 'empty file')
        return
    if product in _CHECK or product == '_probe':
        try:
            doc = S.read_json(path)
        except Exception as ex:
            rep.err(where, f'not valid JSON: {ex}', 'json')
            return
        if product == '_probe':
            check_envelope(doc, '_probe', key, rep, where)
        else:
            _CHECK[product](doc, key, rep, where)
    elif product in _CHECK_BIN:
        _CHECK_BIN[product](S.read_bytes(path), key, rep, where)
    else:                                   # boden t/ i/, da, f: the first bytes only
        with open(path, 'rb') as f:
            head = f.read(12)
        ext = path.rsplit('.', 1)[-1]
        want = _MAGIC.get(ext, {}).get(sub)
        if want and not head.startswith(want):
            rep.err(where, f'the file does not start with {want!r} (found {head[:4]!r})', 'magic')
        if ext == 'webp' and head[8:12] != b'WEBP':
            rep.err(where, 'not a WebP file', 'magic')


def check_product(folder, rep, probe=False):
    """a folder <...>/suhl/<product>/v<N>: its index, every tile file, lists against files. probe=True: the rules of a sample set
    (only tiles of the Probesatz and their parents and children; at most 3 MB, the ground 8 MB)."""
    parts = os.path.abspath(folder).replace('\\', '/').rstrip('/').split('/')
    product, vname = parts[-2], parts[-1]
    where = f'{product}/{vname}'
    if product not in S.PRODUCTS or not re.fullmatch(r'v[0-9]+', vname):
        rep.err(folder, 'not a product folder: expected <...>/suhl/<product>/v<N> with a known product '
                        f'({", ".join(sorted(S.PRODUCTS))})')
        return
    version = int(vname[1:])
    spec = S.PRODUCTS[product]
    ip = os.path.join(folder, spec['index'])
    if not os.path.exists(ip):
        rep.err(where, f'{spec["index"]} is missing' + (' - "python3 -I tools/suhl/lib/validate.py --index <folder> --area ... --sources ..." writes it'
                                                    if spec['index'] == 'index.json' else ' (the layout WELT reads, with the lists "has")'), 'no index')
    else:
        try:
            doc = S.read_json(ip)
            if product == 'boden':
                check_meta(doc, rep, f'{where}/meta.json', folder=folder, version=version)
            else:
                check_index(doc, rep, f'{where}/index.json', folder=folder, product=product, version=version)
        except Exception as ex:
            rep.err(f'{where}/{spec["index"]}', f'cannot be read: {ex}', 'json')
    total = 0
    probe_set = set(S.probe_tiles()) if probe else None
    for sub, (levels, e) in spec['tiles'].items():
        base = os.path.join(folder, sub) if sub else folder
        lv, size = S.scan_tiles(base, e)
        total += sum(size.values())
        for L, tl in sorted(lv.items()):
            for x, y in tl:
                if probe_set is not None:
                    rel = (S.tile_parent(L, x, y, L - S.CONTENT_LEVEL) in probe_set) if L >= S.CONTENT_LEVEL else \
                        any(S.tile_parent(*t, S.CONTENT_LEVEL - L) == (L, x, y) for t in probe_set)
                    if not rel:
                        rep.err(f'{where}/{sub + "/" if sub else ""}{S.tile_key(L, x, y)}', 'not a tile of the sample set (suhllib.probe_tiles(), '
                                'their children and parents)', 'not probe')
                check_tile_file(os.path.join(base, str(L), str(x), f'{y}.{e}'), rep, product=product, sub=sub, key=(L, x, y))
    if probe:
        lim = 8e6 if product == 'boden' else 3e6
        if total > lim:
            rep.err(where, f'the sample set has {total / 1e6:.2f} MB, the limit is {lim / 1e6:.0f} MB', 'probe size')
    rep.stat(f'{product}: versions checked')


def check_root(root, rep, probe=False):
    """a folder that holds suhl/ (a copy of the data repo, a sample set .../probe, a workflow artifact): every product version in it"""
    sd = os.path.join(root, 'suhl')
    if not os.path.isdir(sd):
        rep.err(root, 'no folder suhl/ inside')
        return
    n = 0
    for p in sorted(os.listdir(sd)):
        pd = os.path.join(sd, p)
        if not os.path.isdir(pd):
            continue
        if p not in S.PRODUCTS:
            rep.warn(f'suhl/{p}', f'unknown product folder (known: {", ".join(sorted(S.PRODUCTS))}; a new product: tell suhl-daten)', 'unknown product')
            continue
        for v in sorted(os.listdir(pd)):
            if re.fullmatch(r'v[0-9]+', v) and os.path.isdir(os.path.join(pd, v)):
                rep.ids = {}                         # ids are unique within one product version
                check_product(os.path.join(pd, v), rep, probe=probe)
                n += 1
    ap = os.path.join(sd, 'aktuell.json')
    if os.path.exists(ap):
        try:
            check_aktuell(S.read_json(ap), rep, 'suhl/aktuell.json', root=root)
        except Exception as ex:
            rep.err('suhl/aktuell.json', f'not valid JSON: {ex}', 'json')
    if n == 0:
        rep.err(root, 'no product version found below suhl/ (expected suhl/<product>/v<N>/)')
