"""index.json of a product version, suhl/aktuell.json, the ground's meta.json; checking whole folders; writing index and aktuell.

Layout in the data repo (plan 2.4), base = https://mynametouse.github.io/pavillon-daten/ :
    suhl/aktuell.json                         which version of every product is valid (the only file that is ever overwritten)
    suhl/<product>/v<N>/index.json            which tiles exist per level, sources, attribution, numbers - written once, never changed
    suhl/<product>/v<N>/[<sub>/]<L>/<x>/<y>.<ext>
"""
import json, os, re

from .core import S, is_int, unknown_keys
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
# the keys every index.json has (CORE) and the optional common ones; a product may add keys of its own next to them (the tree index
# of suhl-gruen carries format, arten, merker, kacheln ...) - they are not checked
INDEX_CORE = ('v', 'p', 'version', 'made', 'area', 'tiles', 'sources', 'attribution')
INDEX_KEYS = INDEX_CORE + ('rev', 'ext', 'n', 'marks', 'based_on', 'run', 'stats', 'note')
_ISO = re.compile(r'^20[0-9]{2}-[01][0-9]-[0-3][0-9]T[0-2][0-9]:[0-5][0-9]:[0-5][0-9]Z$')


def source(sid, **extra):
    """a source entry for an index: schema.index.source('dgm1', via=VIA_EASYGEODATA, date='2024')"""
    if sid not in CATALOGUE:
        raise S.SuhlError(f'unknown source {sid!r} (known: {", ".join(CATALOGUE)}); give a full entry instead')
    d = {'id': sid}
    d.update(CATALOGUE[sid])
    d.update(extra)
    return d


def attribution_line(sources):
    out = []
    for s in sources:
        a = s.get('attribution', '')
        if s.get('via') and a:
            a += f' – {s["via"]}'
        if a and a not in out:
            out.append(a)
    return ' · '.join(out)


def _count_items(product, path, sub):
    """how many things a tile holds (buildings, trees, items, ways) - for the numbers of the index"""
    try:
        if product == 'b':
            return os.path.getsize(path) // T.TREE_REC.size
        if product in ('g', 'm', 's', 'd', '_probe'):
            d = S.read_json(path)
            v = d.get({'g': 'b', 'm': 'items', 's': 'ways', 'd': 'd', '_probe': 'b'}[product])
            return len(v) if v is not None else 0
    except Exception:
        return 0
    return 0


def make_index(folder, product, version, area, sources, marks=None, stats=None, run=None, note=None, based_on=None, extra=None, write=True):
    """scan a product folder (<...>/suhl/<product>/v<N>) and write its index.json.
    sources = ids of CATALOGUE and/or full entries {id, title, licence, attribution, ...}; marks = {name: {level: [(x, y)]}};
    based_on = {product: version} of the products this one was computed from (g: the ground its z0 was read from);
    extra = the product's own keys (they never replace the common ones)"""
    spec = S.PRODUCTS[product]
    src = [source(s) if isinstance(s, str) else dict(s) for s in sources]
    tiles, ext, n_tiles, n_bytes, n_items = {}, {}, 0, 0, 0
    for sub, (levels, e) in spec['tiles'].items():
        lv, size = S.scan_tiles(os.path.join(folder, sub) if sub else folder, e)
        tiles[sub] = {str(L): S.tileset_encode(t) for L, t in sorted(lv.items())}
        ext[sub] = e
        n_tiles += sum(len(t) for t in lv.values())
        n_bytes += sum(size.values())
        for L, tl in lv.items():
            for x, y in tl:
                n_items += _count_items(product, os.path.join(folder, sub, str(L), str(x), f'{y}.{e}'), sub)
    doc = {'v': S.SCHEMA, 'rev': REV_, 'p': product, 'version': int(str(version).lstrip('v')), 'made': S.now(), 'area': area,
           'tiles': tiles, 'ext': ext, 'n': {'tiles': n_tiles, 'items': n_items, 'bytes': n_bytes},
           'sources': src, 'attribution': attribution_line(src)}
    if marks:
        doc['marks'] = {name: {str(L): S.tileset_encode(t) for L, t in lv.items()} for name, lv in marks.items()}
    for k, v in (('based_on', based_on), ('stats', stats), ('run', run), ('note', note)):
        if v:
            doc[k] = v
    for k, v in (extra or {}).items():
        doc.setdefault(k, v)
    if write:
        S.write_json(os.path.join(folder, 'index.json'), doc)
    return doc


def check_index(doc, rep, where, folder=None, product=None, version=None):
    """index.json of one product version; with folder: the tile lists must equal the files"""
    if not isinstance(doc, dict):
        rep.err(where, 'index.json is not a JSON object')
        return
    miss = [k for k in INDEX_CORE if k not in doc]
    if miss:
        rep.err(where, f'the common fields {miss} are missing - every index.json carries {list(INDEX_CORE)}; '
                       f'"validate.py --index <folder> --area ... --sources ..." adds them and keeps the product\'s own keys', 'index core')
        return
    if 'based_on' in doc and not (isinstance(doc['based_on'], dict) and all(k in S.PRODUCTS and is_int(v) and v >= 0 for k, v in doc['based_on'].items())):
        rep.err(where, '"based_on" must be {product: version}', 'based_on')
    if doc.get('v') != S.SCHEMA:
        rep.err(where, f'"v" must be the schema number {S.SCHEMA}, found {doc.get("v")!r}', 'v')
    p = doc.get('p')
    if p not in S.PRODUCTS or (product and p != product):
        rep.err(where, f'"p" must be the product{" " + repr(product) if product else ""}, found {p!r} (known: {sorted(S.PRODUCTS)})', 'p')
        return
    if not is_int(doc.get('version')) or doc['version'] < 0 or (version is not None and doc['version'] != version):
        rep.err(where, f'"version" must be the N of the folder v<N>{" (" + str(version) + ")" if version is not None else ""}, found {doc.get("version")!r}', 'version')
    if not (isinstance(doc.get('made'), str) and _ISO.match(doc['made'])):
        rep.err(where, f'"made" must be a UTC time like 2026-11-13T01:30:00Z, found {doc.get("made")!r}', 'made')
    if not (isinstance(doc.get('area'), str) and doc['area']):
        rep.err(where, '"area" must say in a word what the version covers (probe, zentrum, kernstadt, stadt ...)', 'area')
    src = doc.get('sources')
    if not (isinstance(src, list) and src):
        rep.err(where, '"sources" must list the sources (schema.index.source(id) gives the entries of the catalogue)', 'sources')
    else:
        for s in src:
            if not (isinstance(s, dict) and all(isinstance(s.get(k), str) and (s[k] or k == 'attribution') for k in ('id', 'title', 'licence', 'attribution'))):
                rep.err(where, f'a source needs id, title, licence, attribution: {json.dumps(s, ensure_ascii=False)[:120]}', 'source')
    if not (isinstance(doc.get('attribution'), str) and doc['attribution'].strip()):
        rep.err(where, '"attribution" must be the line the app shows (© ...)', 'attribution')
    spec = S.PRODUCTS[p]
    tl = doc.get('tiles')
    if not isinstance(tl, dict) or set(tl) != set(spec['tiles']):
        rep.err(where, f'"tiles" must have the tile folders {sorted(spec["tiles"])} of the product (""= directly in the version folder), found '
                       f'{sorted(tl) if isinstance(tl, dict) else tl!r}', 'tiles')
        return
    for sub, (levels, e) in spec['tiles'].items():
        have = {}
        if not isinstance(tl[sub], dict):
            rep.err(where, f'"tiles[{sub!r}]" must be {{level: tile set}}', 'tiles')
            continue
        for Ls, ts in tl[sub].items():
            try:
                L = int(Ls)
                have[L] = S.tileset_decode(ts)
            except Exception as ex:
                rep.err(where, f'"tiles[{sub!r}][{Ls!r}]" is not a tile set of suhllib.tileset_encode: {ex}', 'tile set')
                continue
            if not levels[0] <= L <= levels[1]:
                rep.err(where, f'level {L} is outside the levels {levels[0]}..{levels[1]} of {p}{"/" + sub if sub else ""}', 'level')
        if folder is not None:
            disk, _ = S.scan_tiles(os.path.join(folder, sub) if sub else folder, e)
            for L in sorted(set(have) | set(disk)):
                a, b = set(have.get(L, [])), set(disk.get(L, []))
                if a - b:
                    rep.err(where, f'{len(a - b)} tiles of level {L}{" in " + sub if sub else ""} are listed but missing as files, e.g. '
                                   f'{S.tile_key(L, *sorted(a - b)[0])}', 'listed, missing')
                if b - a:
                    rep.err(where, f'{len(b - a)} tile files of level {L}{" in " + sub if sub else ""} are not listed in the index, e.g. '
                                   f'{S.tile_key(L, *sorted(b - a)[0])}', 'file, not listed')
    for name, lv in (doc.get('marks') or {}).items():
        try:
            for Ls, ts in lv.items():
                int(Ls)
                S.tileset_decode(ts)
        except Exception as ex:
            rep.err(where, f'"marks.{name}" must be {{level: tile set}}: {ex}', 'marks')


def make_aktuell(old, index_doc, path=None):
    """the new suhl/aktuell.json after publishing the product version described by index_doc (old = the present document or None)"""
    doc = dict(old) if isinstance(old, dict) else {}
    doc['v'] = S.SCHEMA
    doc['made'] = S.now()
    doc.setdefault('base', S.BASE_DEFAULT)
    pr = dict(doc.get('products') or {})
    p, v = index_doc['p'], index_doc['version']
    pr[p] = {'version': v, 'schema': index_doc['v'], 'path': path or f'{p}/v{v}/', 'index': f'{p}/v{v}/index.json', 'made': index_doc['made'],
             'area': index_doc['area'], 'tiles': index_doc.get('n', {}).get('tiles', 0), 'bytes': index_doc.get('n', {}).get('bytes', 0)}
    doc['products'] = {k: pr[k] for k in sorted(pr)}
    return doc


def check_aktuell(doc, rep, where, root=None):
    """suhl/aktuell.json: {v, made, base, products: {product: {version, schema, path, index, made, area, tiles, bytes}}}"""
    if not isinstance(doc, dict) or not isinstance(doc.get('products'), dict):
        rep.err(where, 'aktuell.json must be {v, made, base, products: {...}}')
        return
    if doc.get('v') != S.SCHEMA:
        rep.err(where, f'"v" must be {S.SCHEMA}', 'v')
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
        if e.get('path') != f'{p}/v{e["version"]}/' or e.get('index') != f'{p}/v{e["version"]}/index.json':
            rep.err(w, f'"path" must be "{p}/v{e["version"]}/" and "index" "{p}/v{e["version"]}/index.json" (relative to suhl/)', 'aktuell path')
        if root is not None and not os.path.exists(os.path.join(root, 'suhl', p, f'v{e["version"]}', 'index.json')):
            rep.err(w, f'the version v{e["version"]} it names does not exist (suhl/{p}/v{e["version"]}/index.json)', 'aktuell missing')


def check_meta(doc, rep, where):
    """the ground's meta.json in the layout viz3/src/welt/welt.js reads (tools/welt/build.py, format welt-test/1) - only what Suhl relies on"""
    if not isinstance(doc, dict):
        rep.err(where, 'meta.json is not a JSON object')
        return
    if not str(doc.get('format', '')).startswith('welt-test/'):
        rep.err(where, f'"format" must be "welt-test/1" (the layout WELT reads), found {doc.get("format")!r}', 'meta format')
    lv = (doc.get('tiling') or {}).get('levels')
    if not isinstance(lv, dict) or not lv:
        rep.err(where, '"tiling.levels" is missing', 'meta levels')
    if not doc.get('attribution'):
        rep.err(where, '"attribution" is missing', 'meta attribution')
    if not doc.get('sources'):
        rep.err(where, '"sources" is missing', 'meta sources')


_CHECK = {'g': G.check_g_tile, 's': T.check_s_tile, 'm': T.check_m_tile, 'd': T.check_d_tile}
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
            from .core import check_envelope
            check_envelope(doc, '_probe', key, rep, where)
        else:
            _CHECK[product](doc, key, rep, where)
    elif product == 'b':
        T.check_b_tile(S.read_bytes(path), key, rep, where)
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
    ip = os.path.join(folder, 'index.json')
    if not os.path.exists(ip):
        rep.err(where, 'index.json is missing - schema.make_index(folder, product, version, area, sources) writes it', 'no index')
    else:
        try:
            check_index(S.read_json(ip), rep, where + '/index.json', folder=folder, product=product, version=version)
        except Exception as ex:
            rep.err(where + '/index.json', f'not valid JSON: {ex}', 'json')
    if product == 'boden':
        mp = os.path.join(folder, 'meta.json')
        if not os.path.exists(mp):
            rep.err(where, 'meta.json (the layout WELT reads) is missing', 'no meta')
        else:
            try:
                check_meta(S.read_json(mp), rep, where + '/meta.json')
            except Exception as ex:
                rep.err(where + '/meta.json', f'not valid JSON: {ex}', 'json')
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
            rep.warn(f'suhl/{p}', f'unknown product folder (known: {", ".join(sorted(S.PRODUCTS))})', 'unknown product')
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


from .core import REV as REV_   # noqa: E402
