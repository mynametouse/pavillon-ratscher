#!/usr/bin/env python3
"""suhl-boden (stage 2, package S2-1): the ground of Suhl as tiles - terrain t/{L}/{x}/{y}.bin (WTH1) and aerial image
i/{L}/{x}/{y}.webp (512 px), levels 6-12, with a meta.json in the format the app's WELT reads (tools/welt/build.py), extended by the
list `has` per level: the municipality and the road corridors are no rectangles.

  python3 -I tools/suhl/boden/boden.py --mode probe --out tools/suhl/out/boden/probe/suhl/boden/v0     the sample set (Zentrum), locally
  python3 -I tools/suhl/boden/boden.py --mode stadt --out site/suhl/boden/v1 --jobs 4                  the whole city (GitHub Actions)
      --raw DIR        raw downloads and intermediate results (default $SUHL_RAW or /tmp/suhl-boden/raw); kept between runs
      --no-dgm         do not look for DGM1 (Copernicus GLO-30 only)
      --skip-terrain | --skip-imagery   build only one of the two (meta.json then keeps the other's numbers of the last run)
      --cut N          mode probe: 1 = level 12 only for the quads of the level-12 tiles touching `zentrum`, 2 = only within 300 m of
                       the centre, 3 = only the four tiles around the Markt;  --max-mb M  raises the cut by itself while the tiles
                       are bigger than M MB (a sample set of the ground may have 8 MB)
      --roads FILE     cut the roads into the ground from the profiles of suhl-strassen (file in the format of the drive data)
      --roh DIR        also write the terrain tiles BEFORE the cut (levels 10-12) to DIR - what suhl-strassen solves its profiles on
  python3 -I tools/suhl/boden/boden.py --mode probe-roh --skip-imagery --out TMP --roh DIR         only the ground before the cut, a ring wider
A second start goes on where the first stopped: downloads, finished blocks and image tiles are kept.
Sources and licences: aerial image and DGM1 (c) GDI-Th, CC BY 4.0; Copernicus DEM GLO-30; ESA WorldCover 2021; areas and routes from
OpenStreetMap (ODbL) - written into meta.json and ATTRIBUTION.md of the product.
"""
import argparse, json, os, subprocess, sys, time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import blib
from blib import log, tsize, wlib, rect_of, kids, parents
import plan as planmod

SCHEMA = 1
ATTRIBUTION = ('Luftbild: © GDI-Th (CC BY 4.0) · Gelände: Copernicus DEM GLO-30, © DLR e.V. 2010-2014 und © Airbus Defence and Space GmbH '
               '2014-2018, bereitgestellt im Rahmen von COPERNICUS durch EU und ESA{dgm} · Landbedeckung (Kronenabzug im Gelände): '
               '© ESA WorldCover project 2021 (CC BY 4.0) · Gebietsgrenzen und Straßenkorridore: © OpenStreetMap-Mitwirkende (ODbL)')
ATTR_DE = """# Quellen und Lizenzen der Boden-Kacheln von Suhl (Gelände `t/`, Luftbild `i/`)

Bei jeder Weitergabe oder Darstellung bitte nennen:

| Daten | Quelle | Lizenz | Namensnennung |
|---|---|---|---|
| Luftbilder (DOP20, Dienst WMS TH DOP, Ebene `th_dop`; Bildflug über Suhl am 15.05.2024) | Thüringer Landesamt für Bodenmanagement und Geoinformation (TLBG), Geoportal Thüringen | CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/deed.de) | © GDI-Th |
| Geländemodell DGM1 (nur wo `meta.json` → `sources.dgm1_tiles_km` Kacheln nennt{via}) | TLBG, Geoportal Thüringen | CC BY 4.0 | © GDI-Th |
| Copernicus DEM GLO-30 (Gelände überall sonst) | European Space Agency, Copernicus | Copernicus-Lizenz (frei, mit Namensnennung) | © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved |
| Landbedeckung (Wald: Kronenabzug im Copernicus-Gelände) | ESA WorldCover 2021 | CC BY 4.0 | © ESA WorldCover project 2021 / Contains modified Copernicus Sentinel data (2021) processed by ESA WorldCover consortium |
| Gebietsgrenzen (Stadt, Kernstadt, Zentrum), Ortsteile, Straßenkorridore, Gebäudezahl je Kachel – daraus die Kachel-Listen | OpenStreetMap | ODbL 1.0 (https://opendatacommons.org/licenses/odbl/1-0/) | © OpenStreetMap-Mitwirkende |

Bearbeitung: Höhen umgerechnet, gemischt und gekachelt (Format WTH1), Luftbilder neu gekachelt (WebP 512 px).
Werkzeug: `tools/suhl/boden/` im Repo https://github.com/mynametouse/pavillon-ratscher (Branch `suhl/boden`), aufgebaut auf `tools/welt/`.
"""


def shrink_probe(T, step):
    """mode probe: less of level 12 (complete quads stay)"""
    G, _, _ = blib.areas()
    if step == 1:
        T[12] = kids(parents(blib.touching(12, G['zentrum'])))
        return 'level 12 only for the quads of the level-12 tiles touching zentrum'
    if step == 2:      # every step keeps a part of the step before
        from shapely.geometry import Point
        T[12] = kids(blib.touching(11, Point(*blib.CENTRE).buffer(300)) & parents(T[12]))
        return 'level 12 only for the level-11 tiles of the sample within 300 m of the centre of Suhl'
    c = blib.tile_of(11, *blib.CENTRE)
    T[12] = kids({c})
    return 'level 12 only for the four tiles around the Markt'


def tile_bytes(out):
    """bytes of the tiles t/ and i/ (what the 8 MB limit of a sample set counts, tools/suhl/lib/validate.py --probe)"""
    tot = 0
    for sub in ('t', 'i'):
        for root, _, fs in os.walk(os.path.join(out, sub)):
            tot += sum(os.path.getsize(os.path.join(root, f)) for f in fs)
    return tot


def total_bytes(out):
    tot = n = 0
    for root, _, fs in os.walk(out):
        for f in fs:
            tot += os.path.getsize(os.path.join(root, f))
            n += 1
    return n, tot


def prune(out, T):
    """remove tile files that are not in the lists (after a cut of level 12, or when a list changed between two starts)"""
    gone = 0
    for sub, ext in (('t', '.bin'), ('i', '.webp')):
        base = os.path.join(out, sub)
        if not os.path.isdir(base):
            continue
        for Ls in os.listdir(base):
            for xs in os.listdir(os.path.join(base, Ls)):
                d = os.path.join(base, Ls, xs)
                for f in os.listdir(d):
                    y = f.split('.')[0]
                    ok = Ls.isdigit() and xs.isdigit() and y.isdigit() and f.endswith(ext) and (int(xs), int(y)) in T.get(int(Ls), ())
                    if not ok:
                        os.remove(os.path.join(d, f))
                        gone += 1
                if not os.listdir(d):
                    os.rmdir(d)
    return gone


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--mode', default='probe')
    ap.add_argument('--raw', default=blib.RAW)
    ap.add_argument('--out', required=True)
    ap.add_argument('--version', default='')
    ap.add_argument('--jobs', type=int, default=1)
    ap.add_argument('--quality', type=int, default=74)
    ap.add_argument('--no-dgm', action='store_true')
    ap.add_argument('--no-trees', action='store_true')
    ap.add_argument('--skip-terrain', action='store_true')
    ap.add_argument('--skip-imagery', action='store_true')
    ap.add_argument('--wms-threads', type=int, default=2)
    ap.add_argument('--roads', default='', help='road profiles of suhl-strassen to cut into the ground: file(s) in the format of the drive data, comma separated')
    ap.add_argument('--roh', default='', help='folder for the terrain tiles before the cut (levels 10-12, with a meta.json) - for suhl-strassen')
    ap.add_argument('--max-mb', type=float, default=0)
    ap.add_argument('--cut', type=int, default=0, help='mode probe: 1 = level 12 only for the quads touching zentrum, 2 = only within 300 m of the centre, '
                                                       '3 = only the four tiles around the Markt')
    ap.add_argument('--dgm-via', default='', help="how the DGM1 tiles of the raw folder came: 'easygeodata' adds 'bezogen über easygeodata.de' to the sources")
    ap.add_argument('--farbe', default='garten', choices=('garten', 'wie-geflogen'),
                    help='garten = colours balanced to the garden flight like the rest of the world (farbe.py); wie-geflogen = as the service delivers')
    ap.add_argument('--bild-store', default='', help='folder kept between runs: encoded image tiles per set of image inputs, reused byte for byte')
    ap.add_argument('--s-version', type=int, default=None, help='version of the product s whose profiles are cut in (default: the newest v<N> beside the road file)')
    ap.add_argument('--t-version', type=int, default=None, help='version of the terrain part (default: the number of --version)')
    ap.add_argument('--i-version', type=int, default=None, help='version of the image part (default: the number of --version)')
    a = ap.parse_args()
    t0 = time.time()
    os.makedirs(a.out, exist_ok=True)
    os.makedirs(a.raw, exist_ok=True)
    version = a.version or os.path.basename(os.path.normpath(a.out))
    T, pinfo = planmod.make(a.mode)
    log('Plan', a.mode, pinfo['counts'])
    mp = os.path.join(a.out, 'meta.json')
    old = json.load(open(mp, encoding='utf-8')) if os.path.exists(mp) else {}
    cut, step = None, 0
    if a.mode == 'probe':
        for step in range(1, a.cut + 1):
            cut = shrink_probe(T, step)
        if cut:
            log('Probesatz:', cut, '->', len(T[12]), 'Kacheln der Stufe 12')
            pinfo['counts']['12'] = len(T[12])

    # ---- terrain ----
    tinfo = None
    if not a.skip_terrain:
        import gelaende
        providers = []      # DGM1 comes into <raw>/dgm1/ before the build: the workflow fetches it with tools/suhl/lib/easygeodata.py
        roads = [p for p in a.roads.split(',') if p]
        # the uncut set carries one more ring of level-10 tiles: the road solver's margin then lies on this ground too
        roh_extra = {10: blib.ring(T[10]) - T[10]} if (a.roh and a.mode == 'stadt') else None
        tinfo = gelaende.build(a.raw, a.out, T, jobs=a.jobs, use_dgm=not a.no_dgm, providers=providers, use_trees=not a.no_trees,
                               roads=roads, roh=a.roh or None, roh_extra=roh_extra)
        if a.dgm_via and tinfo['dgm'].get('from_cache'):
            tinfo['dgm']['via'] = a.dgm_via
        if a.roh:      # a small meta.json so that the folder is a tile set of its own (hoehe.py, suhl-strassen --tiles <roh>/t)
            fine = {L: [tuple(t) for t in v] for L, v in tinfo['roh_lists'].items() if v}
            os.makedirs(a.roh, exist_ok=True)
            json.dump({'format': 'welt-test/1', 'generated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'plan': 'suhl-' + a.mode.replace('-roh', '') + '-roh',
                       'H0': wlib.H0, 'note': 'Gelände VOR dem Straßeneinschnitt (nur Stufen 10-12): darauf rechnet suhl-strassen seine Profile. '
                                               'Nicht für die App.',
                       'tiling': {'root': [wlib.ROOT_E0, wlib.ROOT_N0, wlib.ROOT_SIZE], 'terrain': 't/{z}/{x}/{y}.bin', 'terrain_n': wlib.TERR_N,
                                  'levels': {str(L): {'size': tsize(L), 'rect': rect_of(v), 'has': sorted(list(t) for t in v),
                                                      'terrain': {'n': len(v), 'bytes': sum(os.path.getsize(os.path.join(a.roh, 't', str(L), str(x), f'{y}.bin'))
                                                                                            for x, y in v)}} for L, v in fine.items()}},
                       'sources': {'terrain_source': tinfo['source'], 'dgm1': tinfo['dgm'], 'dgm1_tiles_km': tinfo['dgm_tiles_km'], 'canopy_m': tinfo['canopy_m'],
                                   'copernicus_offset_m': tinfo['copernicus_offset_m'],
                                   'dgm1_share_level10': {k: v for k, v in sorted(tinfo['dgm10'].items())}},
                       'attribution': ATTRIBUTION.format(dgm=' · Geländemodell DGM1: © GDI-Th (CC BY 4.0)' + (', bezogen über easygeodata.de'
                                                         if tinfo['dgm'].get('via') == 'easygeodata' else '') if tinfo['dgm_tiles_km'] else '')},
                      open(os.path.join(a.roh, 'meta.json'), 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))

    # ---- imagery ----
    iinfo = None
    if not a.skip_imagery:
        import bild
        harm = None
        if a.farbe == 'garten':
            import farbe
            harm = farbe.Balance(a.raw)
        fl = bild.flight_at(*blib.CENTRE)
        day = '-'.join(reversed(fl.get('Erstellung', '').split('.'))) or 'unbekannt'
        bname = harm.name if harm else 'wie-geflogen'
        ikey = f"{bild.LAYER}-f{day}-p{fl.get('Publikation', 'x')}-{bname}-q{a.quality}"
        store = os.path.join(a.bild_store, ikey) if a.bild_store else None
        log(f'Luftbild: {ikey}' + (f' (Ablage {store})' if store else ''))
        iinfo = bild.build(a.raw, a.out, T, quality=a.quality, jobs=a.jobs, harm=harm, threads=a.wms_threads, store=store)
        iinfo.update({'key': ikey, 'balance': bname, 'flight': day, 'publication': fl.get('Publikation'), 'bezug': fl.get('Bezug'),
                      'balance_info': harm.info() if harm else None})
        if a.mode == 'probe' and a.max_mb:
            while tile_bytes(a.out) > a.max_mb * 1e6 and step < 3:
                step += 1
                cut = shrink_probe(T, step)
                log('Probesatz zu groß –', cut, '->', prune(a.out, T), 'Dateien entfernt')
                pinfo['counts']['12'] = len(T[12])
        if harm:
            iinfo['balance_info']['set'] = harm.cells_of(T)
    prune(a.out, T)

    def on_disk(sub, ext, L):
        """number and bytes of the level's tiles that are there (None when the product was never built)"""
        ps = [os.path.join(a.out, sub, str(L), str(x), f'{y}{ext}') for x, y in T[L]]
        ps = [q for q in ps if os.path.exists(q)]
        return {'n': len(ps), 'bytes': sum(os.path.getsize(q) for q in ps)} if ps else None

    # ---- meta ----
    try:
        commit = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True, cwd=blib.REPO).stdout.strip()
    except Exception:
        commit = ''
    XF, H0 = wlib.XF, wlib.H0
    oldlv = (old.get('tiling') or {}).get('levels') or {}
    lv = {}
    for L in sorted(T):
        has = sorted(list(t) for t in T[L])
        lv[str(L)] = {'size': tsize(L), 'rect': rect_of(T[L]), 'has': has, 'terrain_step': tsize(L) / (wlib.TERR_N - 1), 'px': tsize(L) / wlib.TILE_PX,
                      'terrain': on_disk('t', '.bin', L), 'image': on_disk('i', '.webp', L)}
    src_old = old.get('sources') or {}
    if tinfo:
        d10 = tinfo['dgm10']
        lv['10']['dgm'] = [1 if d10.get(f'{x}/{y}', 0) >= 0.99 else 0 for x, y in lv['10']['has']]
        terr = {'terrain': {'cop30': 'Copernicus DEM GLO-30 (Oberflächenmodell 30 m) mit abgesenktem Wald (ESA WorldCover); DGM1 Thüringen noch nicht verfügbar',
                            'dgm1+cop30': 'DGM1 Thüringen (1 m, © GDI-Th, CC BY 4.0), außerhalb Copernicus DEM GLO-30 mit abgesenktem Wald'}[tinfo['source']],
                'terrain_source': tinfo['source'], 'dgm1': tinfo['dgm'], 'dgm1_tiles_km': tinfo['dgm_tiles_km'],
                'dgm1_level10_tiles': sum(lv['10']['dgm']), 'copernicus_offset_m': tinfo['copernicus_offset_m'],
                'canopy_m': tinfo['canopy_m'], 'canopy_fit_m': tinfo['canopy_fit_m'], 'canopy_fit_window': tinfo['canopy_fit_window'],
                'worldcover': tinfo['worldcover'], 'roads': tinfo['roads'],
                'terrain_method': {'block_level': tinfo['block_level'], 'margin_m': tinfo['margin_m'], 'blend_m': tinfo['blend_m'],
                                   'coarse_cell_m': tinfo['coarse_cell_m'], 'blocks': len(tinfo['blocks']), 'seam': tinfo.get('seam'),
                                   'seconds': tinfo['seconds']}}
        hm = {'hmin': round(tinfo['hmin'] - H0, 2), 'hmax': round(tinfo['hmax'] - H0, 2)}
    else:
        terr = {k: src_old[k] for k in ('terrain', 'terrain_source', 'dgm1', 'dgm1_tiles_km', 'dgm1_level10_tiles', 'copernicus_offset_m', 'canopy_m',
                                        'canopy_fit_m', 'canopy_fit_window', 'worldcover', 'roads', 'terrain_method') if k in src_old}
        hm = {k: old['tiling'][k] for k in ('hmin', 'hmax') if k in (old.get('tiling') or {})}
        if 'dgm' in (oldlv.get('10') or {}) and oldlv['10'].get('has') == lv['10']['has']:
            lv['10']['dgm'] = oldlv['10']['dgm']
    img = ({'imagery': 'DOP Thüringen, WMS TH DOP (th_dop, 20 cm), © GDI-Th, CC BY 4.0', 'imagery_flight': f"{iinfo['flight']} über der ganzen Gemeinde "
            f"(th_dop_info, tools/suhl/out/bestand/luftbild.json); Veröffentlichung {iinfo['publication']}; Bezug {iinfo['bezug']}",
            'imagery_balance': iinfo['balance_info'],
            'imagery_method': {'quality': iinfo['quality'], 'requests': iinfo['requests'], 'seconds': iinfo['seconds'], 'key': iinfo['key'],
                               'store': iinfo['store'], 'note': 'jede Stufe in ihrer eigenen Auflösung vom Dienst geholt'}}
           if iinfo else {k: src_old[k] for k in ('imagery', 'imagery_flight', 'imagery_balance', 'imagery_method') if k in src_old})
    vnum = int(version.lstrip('v')) if version.lstrip('v').isdigit() else 0
    tver = a.t_version if a.t_version is not None else vnum
    iver = a.i_version if a.i_version is not None else vnum
    image = ({'version': iver, 'balance': iinfo['balance'], 'key': iinfo['key'], 'quality': iinfo['quality'], 'flight': iinfo['flight'],
              'publication': iinfo['publication'], 'path': 'i/'} if iinfo else old.get('image'))
    terrain = ({'version': tver, 'source': tinfo['source'], 'roads_cut': bool(tinfo['roads']), 'dgm1_tiles_km': len(tinfo['dgm_tiles_km']), 'path': 't/'}
               if tinfo else old.get('terrain'))
    cx, cy = wlib.model_from_utm(*blib.CENTRE)
    # which generation of the roads is cut in: the version of the product s the profiles belong to ({} = no roads cut)
    based_on = {}
    rds = terr.get('roads')
    if rds:
        sv = a.s_version
        if sv is None:
            import glob, re as _re
            f0 = os.path.join(blib.REPO, rds['files'][0]['file'])
            vs = [int(_re.search(r'v(\d+)$', q).group(1)) for q in glob.glob(os.path.join(os.path.dirname(os.path.dirname(f0)), 'suhl', 's', 'v*'))
                  if _re.search(r'v(\d+)$', q)]
            sv = max(vs) if vs else 0
        based_on = {'s': int(sv)}
    has_dgm = bool(terr.get('dgm1_tiles_km'))
    meta = {
        'format': 'welt-test/1', 'generated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'commit': commit, 'plan': 'suhl-' + a.mode,
        'crs': 'EPSG:25832', 'heights': 'NHN (DHHN2016) in m minus H0', 'H0': H0,
        'origin': {'E': XF['ex'], 'N': XF['ey'], 'H': H0, 'latlon': list(wlib.ORIGIN_LATLON),
                   'note': 'Ursprung des App-Modells (Garten): Modell (0, 0, 0) = UTM (E, N), Höhe H0'},
        'model_xf': {**XF, 'note': 'Modellmeter (x Ost, y Nord) -> UTM: E = a x - b y + ex, N = b x + a y + ey; z = H - H0. Die Kacheln sind echte UTM-Meter.'},
        'terrain': terrain, 'image': image,
        'suhl': {'product': 'boden', 'version': version, 'schema': SCHEMA, 'area': 'probe' if a.mode.startswith('probe') else 'stadt',
                 't_version': (terrain or {}).get('version'), 'i_version': (image or {}).get('version'), 'i_key': (image or {}).get('key'),
                 'balanced': bool(image and str(image.get('balance', '')).startswith('garten')), 'based_on': based_on,
                 'mode': a.mode, 'centre_utm': list(blib.CENTRE),
                 'parts': 'Gelände (t/) und Luftbild (i/) haben je eine eigene Version: terrain.version, image.version. Das Luftbild ändert sich '
                          'nur, wenn image.key sich ändert (Bildflug, Farbausgleich, Qualität); bei gleichem image.key sind die Dateien i/ Byte '
                          'für Byte dieselben wie im vorigen Satz.',
                 'centre_model': [round(cx, 1), round(cy, 1)], 'plan': {k: v for k, v in pinfo.items() if k not in ('rule',)}, 'cut': cut,
                 'has': 'tiling.levels[L].has = sortierte Liste [x, y] der vorhandenen Kacheln der Stufe L; rect ist nur ihr Rahmen. '
                        'Stufen 11 und 12 stehen in ganzen Vierern (alle vier Kinder einer Kachel), jede Kachel der Stufen 7-12 hat ihre '
                        'Elternkachel. tiling.levels["10"].dgm läuft parallel zu has: 1 = die Kachel steht zu mindestens 99 % auf echtem '
                        '1-m-Gelände (DGM1), 0 = Copernicus 30 m.'},
        'tiling': {'root': [wlib.ROOT_E0, wlib.ROOT_N0, wlib.ROOT_SIZE], 'y': 'north', 'tile_px': wlib.TILE_PX, 'terrain_n': wlib.TERR_N,
                   'image': 'i/{z}/{x}/{y}.webp', 'terrain': 't/{z}/{x}/{y}.bin',
                   'terrain_format': 'WTH1: Kopf 20 Byte (Magic, n, Flags, Basis cm, hmin, hmax) + zlib der Lorenzo-Reste in cm (tools/welt/tiles.py)',
                   'levels': lv, **hm},
        'sources': {**terr, **img, 'areas': 'Gebiete und Ortsteile: tools/suhl/out/bestand/gebiete.geojson; Korridore: tools/suhl/boden/korridor.json '
                                            '(© OpenStreetMap-Mitwirkende, ODbL 1.0)'},
        'attribution': ATTRIBUTION.format(dgm=(' · Geländemodell DGM1: © GDI-Th (CC BY 4.0)'
                                              + (', bezogen über easygeodata.de' if (terr.get('dgm1') or {}).get('via') == 'easygeodata' else '')) if has_dgm else ''),
    }
    json.dump(meta, open(mp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
    via = ', bezogen über easygeodata.de' if (terr.get('dgm1') or {}).get('via') == 'easygeodata' else ''
    open(os.path.join(a.out, 'ATTRIBUTION.md'), 'w', encoding='utf-8').write(ATTR_DE.replace('{via}', via))
    if os.path.exists(os.path.join(a.out, 'index.json')):      # schema rev 1.1: the ground has no index.json, meta.json is its index
        os.remove(os.path.join(a.out, 'index.json'))
    nf, tot = total_bytes(a.out)
    log(f'fertig in {time.time() - t0:.0f} s: {nf} Dateien, {tot / 1e6:.2f} MB in {a.out}')
    for L in sorted(T):
        t, i = lv[str(L)]['terrain'] or {}, lv[str(L)]['image'] or {}
        print(f"   Stufe {L:2d}: {tsize(L):6.0f} m  {len(T[L]):5d} Kacheln   Gelände {t.get('bytes', 0) / 1e6:7.2f} MB   Luftbild {i.get('bytes', 0) / 1e6:7.2f} MB", flush=True)
    json.dump({'files': nf, 'bytes': tot, 'seconds': round(time.time() - t0), 'mode': a.mode, 'version': version,
               'levels': {str(L): {'n': len(T[L]), 'terrain_bytes': (lv[str(L)]['terrain'] or {}).get('bytes'),
                                   'image_bytes': (lv[str(L)]['image'] or {}).get('bytes')} for L in sorted(T)}},
              open(os.path.join(a.raw, f'build_{a.mode}.json'), 'w'))


if __name__ == '__main__':
    main()
