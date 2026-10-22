"""World test block: downloads -> height model -> roads (profile, carving, ribbons) -> terrain and imagery tiles -> buildings -> meta.
  python3 -I tools/welt/build.py --plan A --raw <cache dir> --out <dir that becomes gh-pages/welt-test>
    --plan A   4 x 4 km detail block (level 12) with levels 8-11 around it and the 25.6 km context (levels 5-7)
    --plan B   the same with levels 8-11 over 9.6 x 9.6 km (Schleusingen, Talsperre, Ratscher)
    --plan T   1.6 km block for a quick local run
    --no-dgm   skip the DGM1 download (Copernicus GLO-30 only)
Prints the road metric (waves per km per class before/after) and the sizes per level; writes meta.json and ATTRIBUTION.md."""
import argparse, json, os, subprocess, sys, time
from multiprocessing import Pool
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wlib
from wlib import log, PLANS, aligned, trange, tsize, FINEST, H0, XF, ORIGIN_LATLON, ROOT_E0, ROOT_N0, ROOT_SIZE, TILE_PX, TERR_N, CONTENT_LEVEL

ATTR_DE = """# Quellen und Lizenzen der Welt-Testkacheln

Diese Kacheln (Gelände, Luftbild, Straßen, Gebäude) sind aus offenen Daten erzeugt. Bei jeder Weitergabe oder Darstellung bitte nennen:

| Daten | Quelle | Lizenz | Namensnennung |
|---|---|---|---|
| Luftbilder (DOP20, Dienst WMS TH DOP) | Thüringer Landesamt für Bodenmanagement und Geoinformation (TLBG), Geoportal Thüringen | CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/deed.de) | © GDI-Th |
| Geländemodell DGM1 (sofern im Lauf verfügbar, siehe meta.json `sources.terrain`) | TLBG, Geoportal Thüringen | CC BY 4.0 | © GDI-Th |
| Copernicus DEM GLO-30 (Umgebung, Ersatz wenn DGM1 fehlt) | European Space Agency, Copernicus | Copernicus-Lizenz (frei, mit Namensnennung) | © DLR e.V. 2010-2014 and © Airbus Defence and Space GmbH 2014-2018 provided under COPERNICUS by the European Union and ESA; all rights reserved |
| Straßen, Gebäudegrundrisse, Landnutzung, Gewässer, Namen | OpenStreetMap | ODbL 1.0 (https://opendatacommons.org/licenses/odbl/1-0/) | © OpenStreetMap-Mitwirkende |

Bearbeitung: Höhen umgerechnet und gekachelt, Straßen als eigene Bänder mit geglättetem Längsprofil (Gelände an Straßen
angeschnitten/aufgefüllt), Gebäude aus Grundrissen hochgezogen (Höhen geschätzt), Luftbilder neu gekachelt (WebP).
Werkzeug: `tools/welt/` im Repo https://github.com/mynametouse/pavillon-ratscher (Branch `welt/woche1`).
Die aus OpenStreetMap abgeleiteten Dateien (`roads.json`, `routes.json`, `r/`, `b/`) stehen als abgeleitete Datenbank unter der ODbL 1.0.
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--plan', default='A')
    ap.add_argument('--raw', required=True)
    ap.add_argument('--out', required=True)
    ap.add_argument('--no-dgm', action='store_true')
    ap.add_argument('--quality', type=int, default=74)
    ap.add_argument('--jobs', type=int, default=os.cpu_count() or 2)
    ap.add_argument('--skip-imagery', action='store_true')
    a = ap.parse_args()
    t0 = time.time()
    plan = PLANS[a.plan]
    levels = sorted(plan)
    # areas per level: levels 5-7 share the context square, 8-11 the block (aligned at level 8), 12 the detail block
    area = {}
    ctx = aligned(min(levels), plan[min(levels)])
    blk = aligned(8, plan[8])
    det = aligned(FINEST, plan[FINEST])
    for L in levels:
        area[L] = ctx if L <= 7 else (blk if L <= 11 else det)
    os.makedirs(a.out, exist_ok=True)
    log('Plan', a.plan, {L: [round(v) for v in ar] for L, ar in area.items()})

    # ---- OpenStreetMap (roads, buildings) over the block + margin ----
    from pyproj import Transformer
    from fetch import fetch_osm
    toLL = Transformer.from_crs('EPSG:25832', 'EPSG:4326', always_xy=True)
    m = 400.0
    lo, la = toLL.transform([blk[0] - m, blk[2] + m, blk[0] - m, blk[2] + m], [blk[1] - m, blk[1] - m, blk[3] + m, blk[3] + m])
    ll = (round(min(lo), 4), round(min(la), 4), round(max(lo), 4), round(max(la), 4))
    osm = fetch_osm(a.raw, ll)
    log('OSM', {k: len(v) for k, v in osm.items() if isinstance(v, dict)})

    # ---- height model: 1 m mosaic over the block + 200 m ----
    from dem import Dem
    dem_area = (blk[0] - 200, blk[1] - 200, blk[2] + 200, blk[3] + 200)
    dem = Dem(a.raw, dem_area, ctx, use_dgm=not a.no_dgm)

    # ---- roads in the detail block (carves the mosaic) ----
    import roads
    # the axis fit needs the 1 m terrain model (on Copernicus' 30 m it would only move roads around)
    rmeta = roads.build(osm, dem, det, a.out, fit=dem.dgm_share > 0.5)

    # ---- terrain tiles ----
    dem.build_mips(8)
    tinfo = {}
    hmin, hmax = 1e9, -1e9
    for L in levels:
        n, tot, h0, h1 = __import__('tiles').terrain_level(dem, L, area[L], a.out)
        tinfo[L] = dict(n=n, bytes=tot)
        hmin, hmax = min(hmin, h0), max(hmax, h1)

    # ---- buildings over the block ----
    import buildings
    from pyproj import Transformer as _T
    tr = _T.from_crs('EPSG:4326', 'EPSG:25832', always_xy=True)
    ids = list(osm['nodes'].keys())
    lla = np.array([osm['nodes'][i][:2] for i in ids], float)
    E, N = tr.transform(lla[:, 0], lla[:, 1])
    nodeE = {i: (e, n) for i, e, n in zip(ids, E, N)}
    bmeta = buildings.build(osm, nodeE, dem, blk, a.out)

    # ---- imagery ----
    iinfo = {}
    if not a.skip_imagery:
        from tiles import ImagePyramid
        with Pool(a.jobs) as pool:
            ip = ImagePyramid(a.out, a.quality, pool)
            ip.from_wms(a.raw, FINEST, area[FINEST], chunk_level=FINEST - 3)
            ip.from_wms(a.raw, 11, area[11], chunk_level=8)
            for L in (10, 9, 8):
                ip.reduce(L, area[L])
            ip.from_wms(a.raw, 7, area[7], chunk_level=5)
            for L in (6, 5):
                ip.reduce(L, area[L])
            iinfo = {L: dict(n=ip.count.get(L, 0), bytes=ip.bytes.get(L, 0)) for L in levels}

    # ---- meta ----
    try:
        commit = subprocess.run(['git', 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True, cwd=wlib.REPO).stdout.strip()
    except Exception:
        commit = ''
    lv = {}
    for L in levels:
        x0, y0, x1, y1 = trange(L, area[L])
        lv[str(L)] = {'size': tsize(L), 'rect': [x0, y0, x1, y1], 'terrain_step': tsize(L) / (TERR_N - 1), 'px': tsize(L) / TILE_PX,
                      'terrain': tinfo.get(L), 'image': iinfo.get(L)}
    terr_src = {'dgm1': 'DGM1 Thüringen (1 m, © GDI-Th, CC BY 4.0)', 'cop30': 'Copernicus DEM GLO-30 (Oberflächenmodell 30 m; Ersatz: DGM1-Server nicht erreichbar)',
                'dgm1+cop30': 'DGM1 Thüringen, außerhalb Copernicus DEM GLO-30'}[dem.source]
    meta = {
        'format': 'welt-test/1', 'generated': time.strftime('%Y-%m-%dT%H:%M:%SZ', time.gmtime()), 'commit': commit, 'plan': a.plan,
        'crs': 'EPSG:25832', 'heights': 'NHN (DHHN2016) in m minus H0', 'H0': H0,
        'origin': {'E': XF['ex'], 'N': XF['ey'], 'H': H0, 'latlon': list(ORIGIN_LATLON),
                   'note': 'Ursprung des App-Modells (Garten): Modell (0, 0, 0) = UTM (E, N), Höhe H0'},
        'model_xf': {**XF, 'note': 'Modellmeter (x Ost, y Nord) -> UTM: E = a x - b y + ex, N = b x + a y + ey; z = H - H0. '
                                   'Umkehrung: x = (a dE + b dN) / (a²+b²), y = (-b dE + a dN) / (a²+b²) mit dE = E - ex, dN = N - ey'},
        'tiling': {'root': [ROOT_E0, ROOT_N0, ROOT_SIZE], 'y': 'north', 'tile_px': TILE_PX, 'terrain_n': TERR_N,
                   'image': 'i/{z}/{x}/{y}.webp', 'terrain': 't/{z}/{x}/{y}.bin',
                   'terrain_format': 'WTH1: Kopf 20 Byte (Magic, n, Flags, Basis cm, hmin, hmax) + zlib der Lorenzo-Reste in cm (tools/welt/tiles.py)',
                   'levels': lv, 'hmin': round(hmin - H0, 2), 'hmax': round(hmax - H0, 2), 'areas': {'context': ctx, 'block': blk, 'detail': det}},
        'content': {'level': CONTENT_LEVEL, 'roads': 'r/{z}_{x}_{y}.glb', 'buildings': 'b/{z}_{x}_{y}.glb',
                    'glb_frame': 'x = E - Ec, y = H - H0, z = -(N - Nc); (Ec, Nc) = Mitte der Kachel (auch in extras.utm_centre)',
                    'roads_tiles': sorted(rmeta['tiles']), 'buildings_tiles': sorted(bmeta['tiles']),
                    'routes': 'routes.json', 'roads_json': 'roads.json'},
        'sources': {'terrain': terr_src, 'terrain_source': dem.source, 'dgm1_tiles': list(dem.dgm_tiles), 'dgm1_share': round(dem.dgm_share, 3),
                    'copernicus_offset_m': round(dem.cop_off, 2), 'imagery': 'DOP Thüringen, WMS TH DOP (th_dop), © GDI-Th, CC BY 4.0',
                    'osm': f"OpenStreetMap ({osm.get('fetched', '')}), © OpenStreetMap-Mitwirkende, ODbL 1.0"},
        'attribution': 'Luftbild und Geländemodell: © GDI-Th (CC BY 4.0) · © OpenStreetMap-Mitwirkende (ODbL) · '
                       'Copernicus DEM GLO-30: © DLR e.V. 2010-2014 und © Airbus Defence and Space GmbH 2014-2018, bereitgestellt im Rahmen von COPERNICUS durch EU und ESA',
        'roads': {k: v for k, v in rmeta.items() if k != 'tiles'},
        'buildings': {k: v for k, v in bmeta.items() if k != 'tiles'},
    }
    json.dump(meta, open(os.path.join(a.out, 'meta.json'), 'w'), ensure_ascii=False, indent=1)
    # the same GLB tiles as 3D Tiles 1.1 tilesets (standard loaders, e.g. 3DTilesRendererJS): local frame x east, y north, z up with the
    # origin at the model origin (E, N, H0); glTF y-up content is turned z-up by the 3D Tiles convention
    for kind, sub, tl in (('roads', 'r', rmeta['tiles']), ('buildings', 'b', bmeta['tiles'])):
        kids = []
        for k in sorted(tl):
            x, y = map(int, k.split('_'))
            e0_, n0_, e1_, n1_ = wlib.tbounds(CONTENT_LEVEL, x, y)
            ec, nc = (e0_ + e1_) / 2, (n0_ + n1_) / 2
            g = dem.grid(e0_, n0_, (e1_ - e0_) / 8, 9)
            z0, z1 = float(g.min()) - H0 - 5, float(g.max()) - H0 + (40 if kind == 'buildings' else 5)
            kids.append({'boundingVolume': {'box': [0, 0, (z0 + z1) / 2, (e1_ - e0_) / 2, 0, 0, 0, (n1_ - n0_) / 2, 0, 0, 0, (z1 - z0) / 2]},
                         'transform': [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, round(ec - XF['ex'], 3), round(nc - XF['ey'], 3), 0, 1],
                         'geometricError': 0, 'content': {'uri': f'{CONTENT_LEVEL}_{x}_{y}.glb'}})
        if not kids:
            continue
        ar = det
        rb = [(ar[0] + ar[2]) / 2 - XF['ex'], (ar[1] + ar[3]) / 2 - XF['ey'], (ar[2] - ar[0]) / 2, (ar[3] - ar[1]) / 2]
        ts = {'asset': {'version': '1.1', 'generator': 'pavillon-ratscher tools/welt', 'extras': {'crs': 'EPSG:25832', 'origin_utm': [XF['ex'], XF['ey']], 'H0': H0}},
              'geometricError': 2000,
              'root': {'boundingVolume': {'box': [rb[0], rb[1], (hmin + hmax) / 2 - H0, rb[2] + 50, 0, 0, 0, rb[3] + 50, 0, 0, 0, (hmax - hmin) / 2 + 60]},
                       'geometricError': 400, 'refine': 'ADD', 'children': kids}}
        json.dump(ts, open(os.path.join(a.out, sub, 'tileset.json'), 'w'), indent=1)
    open(os.path.join(a.out, 'ATTRIBUTION.md'), 'w').write(ATTR_DE)
    tot = 0
    nf = 0
    for root, _, fs in os.walk(a.out):
        for f in fs:
            tot += os.path.getsize(os.path.join(root, f))
            nf += 1
    log(f'fertig in {time.time() - t0:.0f} s: {nf} Dateien, {tot / 1e6:.1f} MB in {a.out}')
    for L in levels:
        print(f"   Stufe {L:2d}: {lv[str(L)]['size']:8.0f} m  Gelände {tinfo[L]['n']:5d} / {tinfo[L]['bytes'] / 1e6:6.1f} MB"
              + (f"   Luftbild {iinfo[L]['n']:5d} / {iinfo[L]['bytes'] / 1e6:6.1f} MB" if L in iinfo else ''))
    json.dump({'files': nf, 'bytes': tot, 'seconds': round(time.time() - t0)}, open(os.path.join(a.out, 'build.json'), 'w'))


if __name__ == '__main__':
    main()
