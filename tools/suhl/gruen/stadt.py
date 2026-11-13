#!/usr/bin/env python3
"""suhl-gruen: the whole run for an area – which tiles get single trees at 20 cm, images, trees, forest stands, green areas, checks,
statistics. Made for GitHub Actions (.github/workflows/suhl-gruen.yml); every step keeps what it has, a second start continues.

  python3 -I tools/suhl/gruen/stadt.py --gebiet stadt --out OUT [--jobs 3] [--ndom DIR]

Single trees are searched where people are near them: in the Kernstadt, in every tile with at least three buildings and in tiles
with a public road outside closed forest. The closed forest is described by stands (wald.py), not tree by tree.
"""
import argparse, json, os, sys, time
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glib, kontext, gbild, baeume


def read_order(path):
    """lauf.txt: key=value lines"""
    o = {}
    if os.path.exists(path):
        for ln in open(path, encoding='utf-8'):
            ln = ln.split('#')[0].strip()
            if '=' in ln:
                k, v = ln.split('=', 1)
                o[k.strip()] = v.strip()
    return o


def tile_table(K, gebiet):
    """every level-10 tile of the area with the number of buildings, the length of public road and the share of mapped forest"""
    from shapely.geometry import box, Polygon
    from shapely.ops import unary_union
    from shapely import STRtree
    geom = glib.area_utm(gebiet)
    s = glib.wlib.tsize(glib.L)

    def key(E, N):
        return (int((E - glib.wlib.ROOT_E0) // s), int((N - glib.wlib.ROOT_N0) // s))
    nb, rl = {}, {}
    for r in K['bld']:
        c = np.mean(np.array(r[0]), 0)
        k = key(*c)
        nb[k] = nb.get(k, 0) + 1
    for c, hw, kind, br in K['roads']:
        if kind in ('track', 'service', 'pedestrian'):
            continue
        P = np.array(c)
        seg = np.hypot(*np.diff(P, axis=0).T)
        mid = (P[1:] + P[:-1]) / 2
        for (e, n), l in zip(mid, seg):
            k = key(e, n)
            rl[k] = rl.get(k, 0.0) + float(l)
    fp = []
    for _, t, rr, _ in K['green']:
        if t.get('landuse') == 'forest' or t.get('natural') == 'wood':
            for r in rr:
                try:
                    p = Polygon(r[0], r[1:]).buffer(0)
                    if not p.is_empty:
                        fp.append(p)
                except Exception:
                    pass
    tree = STRtree(fp) if fp else None
    kern = set(glib.tiles_of(glib.area_utm('kernstadt'))) if gebiet != 'kernstadt' else None
    rows = []
    for t in glib.tiles_of(geom):
        bx = box(*glib.wlib.tbounds(glib.L, *t))
        fa = 0.0
        if tree is not None:
            fa = unary_union([fp[i].intersection(bx) for i in tree.query(bx)]).area / bx.area if len(tree.query(bx)) else 0.0
        inside = bx.intersection(geom).area / bx.area
        rows.append({'t': t, 'geb': nb.get(t, 0), 'str_m': round(rl.get(t, 0.0)), 'wald': round(fa, 3), 'im_gebiet': round(inside, 3),
                     'kern': (kern is None) or (t in kern)})
    return rows


def single_tree_tiles(rows, gebiet):
    if gebiet in ('zentrum', 'kernstadt'):
        return [r['t'] for r in rows]
    return [r['t'] for r in rows if r['kern'] or r['geb'] >= 3 or (r['str_m'] > 100 and r['wald'] < 0.85)]


def schema_check(out, gebiet, skip, version=0):
    """the common part of the three index files and the validation of suhl-daten (tools/suhl/lib/validate.py, the judge of the
    contract docs/features/suhl-daten.md), where that library is on the branch. The trees were kept off roofs and carriageways
    with footprints and road axes from OpenStreetMap and ETHOS, not with a generation of the products g or s: no based_on."""
    import subprocess
    val = os.path.join(glib.REPO, 'tools', 'suhl', 'lib', 'validate.py')
    if not os.path.exists(val):
        return {'geprueft': False, 'grund': 'tools/suhl/lib/validate.py fehlt auf diesem Zweig'}
    res = {'geprueft': True, 'index': {}}
    area = 'probe' if gebiet == 'zentrum' else gebiet
    for prod, src in (('b', 'dop,osm,ethos'), ('w', 'dop,osm'), ('gr', 'osm,dop')):
        d = os.path.join(out, 'suhl', prod, f'v{version}')
        ip = os.path.join(d, 'index.json')
        if not os.path.exists(ip):
            continue
        doc = json.load(open(ip, encoding='utf-8'))
        if prod in ('b', 'w') and (doc.get('ndom_kacheln') or doc.get('hoehe_gemessen_ha')):
            src += ',ndom1'
        r = subprocess.run([sys.executable, '-I', val, '--index', d, '--area', area, '--sources', src], capture_output=True, text=True)
        res['index'][prod] = (r.stdout + r.stderr).strip()[-240:]
    r = subprocess.run([sys.executable, '-I', val, out] + (['--probe'] if gebiet == 'zentrum' else []), capture_output=True, text=True)
    lines = (r.stdout + r.stderr).strip().splitlines()
    res['gueltig'] = r.returncode == 0
    res['meldung'] = lines[-1] if lines else ''
    res['zeilen'] = [ln for ln in lines if ln.startswith(('ERROR', 'WARNING'))][:20]
    glib.log('schema:', res['meldung'])
    return res


def _work(args):
    tiles, work, kpath, ndir = args
    U = baeume.Umfeld(kontext.load(kpath))
    nd = None
    if ndir:
        import ndom
        nd = ndom.Ndom(ndir) or None
    baeume.run(tiles, work, U, ndom=nd)
    return len(tiles)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gebiet', default='')
    ap.add_argument('--order', default=os.path.join(glib.HERE, 'lauf.txt'))
    ap.add_argument('--out', required=True)
    ap.add_argument('--work', default=os.path.join(glib.RAW, 'work'))
    ap.add_argument('--kontext', default=os.path.join(glib.RAW, 'kontext.pkl'))
    ap.add_argument('--jobs', type=int, default=2)
    ap.add_argument('--ndom', default='')
    ap.add_argument('--skip', default='', help='comma list of steps to leave out: baeume, wald, flaechen')
    ap.add_argument('--version', type=int, default=-1, help='version folder of b and w (default: from lauf.txt, else 0)')
    a = ap.parse_args()
    order = read_order(a.order)
    version = a.version if a.version >= 0 else int(order.get('version', 0) or 0)
    gebiet = a.gebiet or order.get('gebiet', 'zentrum')
    skip = set(x for x in (a.skip or order.get('ohne', '')).split(',') if x)
    t00 = time.time()
    K = kontext.load(a.kontext)
    geom = glib.area_utm(gebiet)
    glib.check_box(geom.bounds, f'area {gebiet}')
    rows = tile_table(K, gebiet)
    tiles = single_tree_tiles(rows, gebiet)
    glib.log(f'area {gebiet}: {len(rows)} tiles, single trees in {len(tiles)}')
    os.makedirs(a.out, exist_ok=True)
    res = {'made': glib.now(), 'gebiet': gebiet, 'kacheln_gebiet': len(rows), 'kacheln_einzelbaeume': len(tiles), 'schritte': {},
           'kontext': {'osm': K.get('osm_source'), 'osm_stand': K.get('osm_stamp'), 'gebaeude_osm_ringe': len(K['bld']) - K.get('ethos', 0),
                       'gebaeude_ethos': K.get('ethos', 0), 'strassen': len(K['roads']), 'osm_baeume': len(K['trees']),
                       'osm_baumreihen': len(K['rows'])}}
    if 'baeume' not in skip:
        t0 = time.time()
        bad = gbild.prefetch(tiles, workers=2)
        res['schritte']['luftbild'] = {'kacheln': len(tiles), 'fehlgeschlagen': bad, 'sekunden': round(time.time() - t0)}
        t0 = time.time()
        ndir = a.ndom if (a.ndom and os.path.isdir(a.ndom)) else ''
        n_ndom = 0
        if ndir:
            import ndom
            n_ndom = len(ndom.Ndom(ndir).files)
            ndir = ndir if n_ndom else ''
        res['ndom'] = {'kacheln_1km': n_ndom, 'ordner': bool(ndir)}
        glib.log(f'nDOM1: {n_ndom} tiles' if ndir else 'nDOM1: none – heights stay estimated')
        if a.jobs > 1 and len(tiles) > 8:
            from multiprocessing import Pool
            parts = [tiles[i::a.jobs] for i in range(a.jobs)]
            with Pool(a.jobs) as pool:
                pool.map(_work, [(p, a.work, a.kontext, ndir) for p in parts])
        else:
            _work((tiles, a.work, a.kontext, ndir))
        M, stats = baeume.merge(tiles, a.work)
        idx = baeume.write_product(M, os.path.join(a.out, 'suhl', 'b', f'v{version}'),
                                   {'stand': f'Gebiet {gebiet}, Lauf {order.get("lauf", "")}', 'gebiet': gebiet,
                                    'hoehen': ('gemessen im Höhenmodell nDOM1 (Laser 2020–2025, bezogen über easygeodata.de), wo eine Kachel vorlag und der '
                                               'Laser dort Gehölz sah; sonst geschätzt' if ndir else 'geschätzt (kein nDOM1)'),
                                    'ndom_kacheln': n_ndom})
        res['schritte']['baeume'] = {'anzahl': idx['anzahl'], 'kacheln': len(idx['kacheln']), 'sekunden': round(time.time() - t0)}
        glib.write_json(os.path.join(a.out, 'kachel_statistik.json'), stats, indent=0)
        sums = {}
        for st in stats.values():
            for k, v in st.items():
                if isinstance(v, (int, float)) and not k.endswith('_anteil') and k != 'sekunden':
                    sums[k] = sums.get(k, 0) + v
        res['kachel_summen'] = {k: (round(v, 1) if isinstance(v, float) else v) for k, v in sorted(sums.items())}
        res['kachel_summen']['hinweis'] = ('Summen über die Kacheln samt 12 m Rand – am Rand doppelt gezählt (etwa 6 %); die Zahlen der Bäume '
                                           'stehen unter "baeume"')
        import pruefen
        res['baeume'] = pruefen.statistik(M, K, rows)
        res['pruefung'] = pruefen.pruefe(M, K)
    if 'wald' not in skip:
        import wald
        t0 = time.time()
        nd = None
        if a.ndom and os.path.isdir(a.ndom):
            import ndom
            nd = ndom.Ndom(a.ndom) or None
        res['wald'] = wald.build(K, gebiet, rows, os.path.join(a.out, 'suhl', 'w', f'v{version}'), set(tiles) if 'baeume' not in skip else set(),
                                 os.path.join(a.out, 'suhl', 'b', f'v{version}') if 'baeume' not in skip else None, ndom=nd)
        res['schritte']['wald'] = {'sekunden': round(time.time() - t0)}
    if 'flaechen' not in skip:
        import flaechen
        t0 = time.time()
        res['flaechen'] = flaechen.build(K, gebiet, rows, os.path.join(a.out, 'suhl', 'gr', f'v{version}'),
                                         work=a.work if 'baeume' not in skip else None, mask_tiles=tiles)
        res['schritte']['flaechen'] = {'sekunden': round(time.time() - t0)}
    res['schema'] = schema_check(a.out, gebiet, skip, version)
    res['sekunden'] = round(time.time() - t00)
    res['kachel_tabelle'] = [[r['t'][0], r['t'][1], r['geb'], r['str_m'], r['wald'], int(r['t'] in set(tiles))] for r in rows]
    glib.write_json(os.path.join(a.out, 'statistik.json'), res, indent=1)
    glib.log('done', json.dumps({k: res[k] for k in ('schritte', 'sekunden')}))


if __name__ == '__main__':
    main()
