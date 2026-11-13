#!/usr/bin/env python3
"""suhl-gruen: forest stands for the whole area – product w. The closed forest is not stored tree by tree: every level-10 tile gets a
grid of 20 x 20 cells (20 m) inside the mapped forest (OSM landuse=forest, natural=wood) with what the infrared orthophoto at 1 m shows:

  art      0 no stand, 1 broadleaf forest, 2 conifer forest (spruce), 3 mixed forest, 5 young growth / grass on a clearing,
           6 bare clearing (felled, dead wood, rock, track)
  nadel    share of conifer canopy in percent (dark in the near infrared and rough)
  deckung  crown cover in percent
  hoehe    stand height in 0.25 m – ESTIMATED from the class until nDOM1 is there (merker bit 1 = measured)
  dichte   trees per hectare / 10 – estimated from class and cover; where the 20 cm crowns of product b cover the cell it is the
           count of those crowns (merker bit 0: the single trees of this cell are in b – draw those, do not fill); elsewhere,
           with nDOM1, the tree tops of the 1 m laser model scaled per stand kind to the crown count of the image (see build)
  merker   bit 0 single trees in b, bit 1 height measured, bit 2 density counted (crowns of b, or laser tops scaled),
           bit 3 cleared since the laser flight (forest in the laser data, none in the image of 15.05.2024)

File w/10/{x}/{y}.bin: six planes of 400 bytes (art, nadel, deckung, hoehe, dichte, merker), each 20 rows of 20 cells, row 0 = SOUTH
edge, cell 0 = west. Stand polygons for people and scenarios (cells of one class joined, areas in UTM): bestaende.geojson.gz.

  python3 -I tools/suhl/gruen/wald.py --gebiet zentrum --out OUT/suhl/w/v0
"""
import argparse, gzip, json, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glib, kontext, baeume

PXW = 1.0            # metres per pixel of the forest image
CELL = 20.0          # metres
NC = 20              # cells per tile side
BLOCK = 10           # tiles per image block side (4 km: one WMS request of 4000 px)
ARTEN = {0: 'kein Bestand', 1: 'Laubwald', 2: 'Nadelwald (Fichte)', 3: 'Mischwald', 5: 'Jungbestand / Schlagflur (glatte Krone)',
         6: 'Blöße / Kahlfläche'}
HOEHE = {1: 24.0, 2: 26.0, 3: 25.0, 5: 6.0, 6: 0.0}          # estimates (m) until nDOM1
DICHTE = {1: 220.0, 2: 450.0, 3: 330.0, 5: 1500.0, 6: 0.0}   # trees per hectare at full cover (estimates)
NIR_CON = 125.0      # smoothed near infrared below this (and rough): conifer canopy (two modes at 95 and 160 above Goldlauter)
CV_ROUGH = 0.08      # relative roughness of the near infrared at 1 m above this: tree crowns, below: grass, young growth
CAL_MIN = 250        # cells (10 ha) of a stand kind with both counts from which on the laser count is scaled to the image's


def block_image(bx, by):
    e0 = glib.wlib.ROOT_E0 + bx * BLOCK * 400.0
    n0 = glib.wlib.ROOT_N0 + by * BLOCK * 400.0
    return glib.wms_image('th_dop20cir', (e0, n0, e0 + BLOCK * 400.0, n0 + BLOCK * 400.0), PXW), (e0, n0)


def cells_of_block(bx, by, U, ndom=None):
    """-> dict of (BLOCK*NC)² arrays per plane for one image block (rows from the NORTH here), from the 1 m infrared image and,
    where there is one, the object-height model nDOM1 (stand height = 95 % quantile of the cell, tree tops counted)"""
    from scipy import ndimage as ndi
    img, (e0, n0) = block_image(bx, by)
    cir = img.astype(np.float32)
    nir, red = cir[..., 0], cir[..., 1]
    nd = ndi.uniform_filter((nir - red) / (nir + red + 1.0), 3)
    veg = nd > baeume.ND_VEG
    nirs = ndi.uniform_filter(nir, 5)
    m = ndi.uniform_filter(nir, 7)
    m2 = ndi.uniform_filter(nir * nir, 7)
    cv = np.sqrt(np.maximum(m2 - m * m, 0)) / (m + 20.0)
    cvs = ndi.uniform_filter(cv, 5)
    rough = veg & (cvs > CV_ROUGH)
    dark = veg & (nirs < NIR_CON)
    con = rough & dark
    bb = (e0, n0, e0 + BLOCK * 400.0, n0 + BLOCK * 400.0)
    forest = U.forest_mask(bb, PXW)
    n = BLOCK * NC
    c = int(CELL / PXW)

    def agg(a):
        return a.reshape(n, c, n, c).mean(axis=(1, 3))
    fo, v, r, k = agg(forest.astype(np.float32)), agg(veg.astype(np.float32)), agg(rough.astype(np.float32)), agg(con.astype(np.float32))
    nadel = np.where(r > 0.02, k / np.maximum(r, 1e-6), 0.0)
    art = np.zeros((n, n), np.uint8)
    inf = fo >= 0.5
    art[inf & (v < 0.35)] = 6
    art[inf & (v >= 0.35) & (r < 0.35)] = 5
    wood = inf & (v >= 0.35) & (r >= 0.35)
    art[wood & (nadel >= 0.7)] = 2
    art[wood & (nadel <= 0.3)] = 1
    art[wood & (nadel > 0.3) & (nadel < 0.7)] = 3
    C = {'art': art, 'nadel': np.round(100 * nadel).astype(np.uint8), 'deckung': np.round(100 * r).astype(np.uint8), 'wald_osm': fo, 'gruen': v,
         'hoehe': None, 'tops': None, 'geraeumt': np.zeros((n, n), bool), 'laser': np.zeros((n, n), bool)}
    if ndom is not None:
        chm = ndom.window(bb)
        okc = agg(np.isfinite(chm).astype(np.float32)) > 0.9
        if okc.any():
            a0 = np.nan_to_num(chm, nan=0.0)
            cells = a0.reshape(n, c, n, c).transpose(0, 2, 1, 3).reshape(n, n, c * c)
            hp = np.partition(cells, int(0.95 * c * c), axis=2)[:, :, int(0.95 * c * c)]      # 95 % quantile: the stand's top height
            # the laser flew without leaves: bare broadleaf crowns let it through to the ground in many cells – the highest of
            # every 3 x 3 cells is the canopy (for the cover and the tree tops); the height above comes from the raw cells
            amax = ndi.maximum_filter(a0, size=3)
            tall = agg((amax >= 5.0).astype(np.float32))
            darkv = np.where(v > 0.02, agg(dark.astype(np.float32)) / np.maximum(v, 1e-6), 0.0)
            cvm = agg(np.where(veg, cvs, 0.0)) / np.maximum(v, 1e-6)
            stocked = okc & (tall >= 0.35)
            # the image (2024) decides what stands; the laser (2020–2025) gives the height where both agree
            cleared = inf & stocked & (art == 6)                                   # forest in the laser data, bare in the image
            smooth = inf & stocked & (art == 5)
            stand = smooth & ((cvm >= 0.045) | (darkv >= 0.5))                     # a calm canopy (pole wood, thicket), not grass
            art[stand & (darkv >= 0.7)] = 2
            art[stand & (darkv <= 0.3)] = 1
            art[stand & (darkv > 0.3) & (darkv < 0.7)] = 3
            C['nadel'] = np.where(stand, np.round(100 * darkv), C['nadel']).astype(np.uint8)
            C['deckung'] = np.where(stand, np.round(100 * tall), C['deckung']).astype(np.uint8)
            cleared |= smooth & ~stand                                             # very smooth and bright: grass where forest stood
            young = okc & inf & np.isin(art, (1, 2, 3)) & (hp < 3.0)               # rough green, but low: regrowth, shrubs
            art[young] = 5
            hm = np.where(okc & np.isin(art, (1, 2, 3, 5)) & ~cleared, hp, np.nan)
            C['hoehe'] = hm
            C['geraeumt'] = cleared
            C['laser'] = okc
            con1 = ndi.uniform_filter(dark.astype(np.float32), 9) > 0.5
            tr, tc, _ = baeume.chm_tops(amax, con1)
            keep = veg[tr, tc] & forest[tr, tc] & (amax[tr, tc] >= 5.0) if len(tr) else np.zeros(0, bool)
            tops = np.zeros((n, n), np.float32)
            if len(tr):
                np.add.at(tops, (tr[keep] // c, tc[keep] // c), 1.0)
            C['tops'] = np.where(okc, tops, np.nan)
    return C


def build(K, gebiet, rows, out, b_tiles=(), b_dir=None, ndom=None):
    """the stand tiles of an area; rows = stadt.tile_table; b_tiles = tiles whose single trees are in product b (their crowns
    are counted per cell when b_dir is given). -> statistics"""
    U = baeume.Umfeld(K)
    tiles = [r['t'] for r in rows]
    blocks = sorted({(t[0] // BLOCK, t[1] // BLOCK) for t in tiles})
    os.makedirs(out, exist_ok=True)
    idx_tiles, areas, n_cells, n_cleared, n_meas, n_trees = {}, {}, 0, 0, 0, 0.0
    big = {}                                  # the class raster of the whole area for the stand polygons: (tx, ty) -> art
    planes_all = {}
    todo = {}                                 # (tx, ty) -> the planes of a tile, written after the densities are on one scale
    for bi, (bx, by) in enumerate(blocks):
        C = cells_of_block(bx, by, U, ndom)
        glib.log(f'forest image block {bi + 1}/{len(blocks)} ({bx}, {by})')
        for tx, ty in tiles:
            if tx // BLOCK != bx or ty // BLOCK != by:
                continue
            i0 = (tx - bx * BLOCK) * NC
            j1 = BLOCK * NC - (ty - by * BLOCK) * NC          # rows from the north
            sl = (slice(j1 - NC, j1), slice(i0, i0 + NC))
            art = C['art'][sl][::-1]                           # row 0 = south
            if not art.any():
                continue
            nadel, deck = C['nadel'][sl][::-1], C['deckung'][sl][::-1]
            hoehe = np.zeros((NC, NC), np.float32)
            dichte = np.zeros((NC, NC), np.float32)
            merker = np.zeros((NC, NC), np.uint8)
            for k in ARTEN:
                if k:
                    hoehe[art == k] = HOEHE[k]
                    dichte[art == k] = DICHTE[k]
            dichte = dichte * np.where(np.isin(art, (1, 2, 3)), np.clip(deck / 100.0, 0.2, 1.0), 1.0)
            lt = bc = None                                        # per hectare: tops of the laser model, crowns of product b
            if C['hoehe'] is not None:
                hm = C['hoehe'][sl][::-1]
                ok = np.isfinite(hm)
                hoehe[ok] = hm[ok]
                merker[ok] |= 2                                   # stand height measured
                tp = C['tops'][sl][::-1]
                st = np.isfinite(tp) & np.isin(art, (1, 2, 3))
                lt = np.where(st, tp / (CELL * CELL / 1e4), np.nan).astype(np.float32)
                dichte[st] = lt[st]
                merker[st] |= 4
                gz = C['geraeumt'][sl][::-1]
                merker[gz] |= 8                                   # forest in the laser data, none in the image of 2024
                hoehe[gz & (art == 5)] = 2.0                      # regrowth on a fresh clearing (estimate)
                n_cleared += int(gz.sum())
                n_meas += int(ok.sum())
            if (tx, ty) in b_tiles:
                merker[art > 0] |= 1
                p = os.path.join(b_dir or '', str(glib.L), str(tx), f'{ty}.bin')
                if b_dir and os.path.exists(p):
                    T = baeume.unpack(open(p, 'rb').read(), tx, ty)
                    tree = T['kind'] != 30                        # shrubs are no trees of a stand
                    e0, n0, _, _ = glib.wlib.tbounds(glib.L, tx, ty)
                    ci = np.clip(((T['E'][tree] - e0) / CELL).astype(int), 0, NC - 1)
                    cj = np.clip(((T['N'][tree] - n0) / CELL).astype(int), 0, NC - 1)
                    cnt = np.zeros((NC, NC), np.float32)
                    np.add.at(cnt, (cj, ci), 1.0)
                    cnt = cnt / (CELL * CELL / 1e4)
                    st = np.isin(art, (1, 2, 3))
                    dichte[st] = cnt[st]
                    merker[st] |= 4
                    bc = cnt
            todo[(tx, ty)] = (art, nadel, deck, hoehe, dichte, merker, lt, bc)
    # The tops of the 1 m laser model are fewer than the crowns the 20 cm image shows, in closed conifer canopy most of all
    # (conifer cells of the single-tree tiles: 151 trees per hectare from the laser's tops in the whole-city run 43349414221,
    # 205 from the image's crowns in run 43340725672). Where both counts
    # exist - the tiles with single trees - their ratio is taken per stand kind, and the laser count of all other tiles is
    # scaled with it: one density scale for the whole forest. That makes the density outside the single-tree tiles an
    # estimate resting on a count; the factors and their basis are in the index.
    cal = {k: [0.0, 0.0, 0] for k in (1, 2, 3)}
    for art, _, _, _, _, _, lt, bc in todo.values():
        if lt is None or bc is None:
            continue
        for k in cal:
            m = (art == k) & np.isfinite(lt)
            cal[k][0] += float(bc[m].sum())
            cal[k][1] += float(lt[m].sum())
            cal[k][2] += int(m.sum())
    faktor = {k: (float(np.clip(c[0] / c[1], 0.5, 3.0)) if c[2] >= CAL_MIN and c[1] > 0 else 1.0) for k, c in cal.items()}
    n_scaled = 0
    for (tx, ty), (art, nadel, deck, hoehe, dichte, merker, lt, bc) in todo.items():
        if lt is not None and bc is None:
            for k in cal:
                m = (art == k) & np.isfinite(lt)
                dichte[m] = lt[m] * faktor[k]
                n_scaled += int(m.sum())
        n_trees += float((dichte * (CELL * CELL / 1e4))[np.isin(art, (1, 2, 3))].sum())
        planes = [art, nadel, deck, np.clip(np.round(hoehe / 0.25), 0, 255).astype(np.uint8),
                  np.clip(np.round(dichte / 10.0), 0, 255).astype(np.uint8), merker]
        p = os.path.join(out, str(glib.L), str(tx), f'{ty}.bin')
        os.makedirs(os.path.dirname(p), exist_ok=True)
        open(p, 'wb').write(b''.join(a.astype(np.uint8).tobytes() for a in planes))
        idx_tiles[f'{tx}_{ty}'] = int((art > 0).sum())
        big[(tx, ty)] = art
        planes_all[(tx, ty)] = (nadel, deck, hoehe, dichte)
        for k, c in zip(*np.unique(art, return_counts=True)):
            if k:
                areas[int(k)] = areas.get(int(k), 0.0) + c * CELL * CELL / 1e4
        n_cells += int((art > 0).sum())
    kal = {ARTEN[k]: {'faktor': round(faktor[k], 2), 'zellen_mit_beiden_zaehlungen': c[2],
                      'kronen_im_luftbild_je_ha': round(c[0] / c[2], 1) if c[2] else None,
                      'baumspitzen_im_hoehenmodell_je_ha': round(c[1] / c[2], 1) if c[2] else None} for k, c in cal.items()}
    stands = polygons(big, planes_all, out)
    idx = {
        'produkt': 'w', 'name': 'Waldbestände (Zellen 20 m)', 'schema': 1, 'made': glib.now(), 'level': glib.L, 'kachel_m': 400.0, 'zelle_m': CELL,
        'zellen_je_seite': NC, 'pfad': '{level}/{x}/{y}.bin',
        'format': {'ebenen': ['art', 'nadel', 'deckung', 'hoehe', 'dichte', 'merker'], 'bytes_je_ebene': NC * NC,
                   'reihenfolge': 'je Ebene 20 Zeilen zu 20 Zellen; Zeile 0 = Südrand, Zelle 0 = Westrand',
                   'einheiten': {'nadel': 'Prozent Nadelholz an der Krone', 'deckung': 'Prozent Kronendeckung', 'hoehe': '0,25 m (geschätzt, solange merker Bit 1 = 0)',
                                 'dichte': 'Bäume je Hektar / 10', 'merker': 'Bit 0: Einzelbäume dieser Zelle stehen im Produkt b (zeichnen statt füllen); Bit 1: Höhe gemessen (nDOM1, 95-%-Quantil der Zelle); Bit 2: Dichte gezählt (in Kacheln mit Einzelbäumen die Kronen aus b, ohne Sträucher; sonst die Baumspitzen des Höhenmodells, je Bestandsart mit dem Faktor aus dichte_faktor_laser_auf_bildkronen auf die Kronenzahl des Luftbilds hochgerechnet – eine Schätzung auf gezählter Grundlage); Bit 3: seit dem Laserflug geräumt (Laser 2020–2025 zeigt Wald, das Luftbild vom 15.05.2024 keinen)'}},
        'arten': {str(k): v for k, v in ARTEN.items()}, 'hoehe_schaetzung_m': HOEHE, 'dichte_schaetzung_je_ha': DICHTE,
        'kacheln': idx_tiles, 'zellen': n_cells, 'flaeche_ha': {ARTEN[k]: round(v, 1) for k, v in sorted(areas.items())},
        'hoehe_gemessen_ha': round(n_meas * CELL * CELL / 1e4, 1), 'seit_laserflug_geraeumt_ha': round(n_cleared * CELL * CELL / 1e4, 1),
        'baeume_in_bestaenden_geschaetzt_oder_gezaehlt': int(round(n_trees)),
        'dichte_faktor_laser_auf_bildkronen': kal, 'zellen_dichte_hochgerechnet': n_scaled,
        'dichte_faktor_hinweis': 'Das 1-m-Höhenmodell zeigt im geschlossenen Bestand weniger Baumspitzen, als das Luftbild (20 cm) Kronen zeigt. '
                                 'Wo beides gezählt ist (Kacheln mit Einzelbäumen), ergibt sich je Bestandsart ein Faktor; mit ihm ist die Laser-Zählung '
                                 f'der übrigen Kacheln hochgerechnet. Faktor 1, wenn weniger als {CAL_MIN} Zellen beide Zählungen haben.',
        'bestaende': {'datei': 'bestaende.geojson.gz', 'anzahl': stands},
        'attribution': glib.ATTRIBUTION,
        'quellen': [{'name': 'DOP20 CIR Thüringen (th_dop20cir, auf 1 m gerechnet), Bildflug 15.05.2024', 'lizenz': 'CC BY 4.0, © GDI-Th', 'url': glib.WMS},
                    {'name': 'OpenStreetMap (landuse=forest, natural=wood)', 'lizenz': 'ODbL 1.0, © OpenStreetMap-Mitwirkende'}],
    }
    glib.write_json(os.path.join(out, 'index.json'), idx, indent=1)
    return {'kacheln': len(idx_tiles), 'zellen': n_cells, 'flaeche_ha': idx['flaeche_ha'], 'flaeche_ha_summe': round(sum(areas.values()), 1),
            'bestaende': stands, 'bildbloecke': len(blocks), 'hoehe_gemessen_ha': idx['hoehe_gemessen_ha'],
            'seit_laserflug_geraeumt_ha': idx['seit_laserflug_geraeumt_ha'], 'baeume_in_bestaenden': idx['baeume_in_bestaenden_geschaetzt_oder_gezaehlt'],
            'dichte_faktor_laser_auf_bildkronen': kal, 'zellen_dichte_hochgerechnet': n_scaled}


def polygons(big, planes, out, min_cells=3):
    """join the cells of one class into stand polygons -> bestaende.geojson.gz (WGS84); returns their number"""
    if not big:
        return 0
    from scipy import ndimage as ndi
    from shapely.geometry import box, mapping
    from shapely.ops import unary_union
    import shapely
    xs = [t[0] for t in big]
    ys = [t[1] for t in big]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    W, H = (x1 - x0 + 1) * NC, (y1 - y0 + 1) * NC
    A = np.zeros((H, W), np.uint8)
    P = {k: np.zeros((H, W), np.float32) for k in ('nadel', 'deck', 'hoehe', 'dichte')}
    for (tx, ty), art in big.items():
        sl = (slice((ty - y0) * NC, (ty - y0 + 1) * NC), slice((tx - x0) * NC, (tx - x0 + 1) * NC))
        A[sl] = art
        for k, a in zip(('nadel', 'deck', 'hoehe', 'dichte'), planes[(tx, ty)]):
            P[k][sl] = a
    E0 = glib.wlib.ROOT_E0 + x0 * 400.0
    N0 = glib.wlib.ROOT_N0 + y0 * 400.0
    feats = []
    for k in sorted(ARTEN):
        if not k:
            continue
        lab, n = ndi.label(A == k)
        if not n:
            continue
        sizes = ndi.sum(np.ones_like(lab, np.float32), lab, np.arange(1, n + 1))
        objs = ndi.find_objects(lab)
        for i in range(n):
            if sizes[i] < min_cells:
                continue
            sl = objs[i]
            sub = lab[sl] == i + 1
            jj, ii = np.nonzero(sub)
            # the outline: union of the runs of cells per row (far fewer boxes than cells)
            boxes = []
            for j in np.unique(jj):
                row = np.sort(ii[jj == j])
                start = prev = row[0]
                for v in row[1:]:
                    if v != prev + 1:
                        boxes.append((start, prev, j))
                        start = v
                    prev = v
                boxes.append((start, prev, j))
            g = unary_union([box(E0 + (sl[1].start + a) * CELL, N0 + (sl[0].start + j) * CELL, E0 + (sl[1].start + b + 1) * CELL,
                                 N0 + (sl[0].start + j + 1) * CELL) for a, b, j in boxes])
            cx, cy = g.representative_point().coords[0]
            gw = shapely.transform(g, lambda c: np.column_stack(glib.to_wgs(c[:, 0], c[:, 1])))
            m = lambda a: float(a[sl][sub].mean())
            feats.append({'type': 'Feature', 'properties': {
                'id': f'w{k}_{len(feats) + 1}', 'art': k, 'name': ARTEN[k], 'flaeche_ha': round(float(sizes[i]) * CELL * CELL / 1e4, 2),
                'nadel_prozent': round(m(P['nadel'])), 'deckung_prozent': round(m(P['deck'])), 'hoehe_m_geschaetzt': round(m(P['hoehe']), 1),
                'dichte_je_ha': round(m(P['dichte'])), 'utm32': [round(cx), round(cy)]},
                'geometry': json.loads(json.dumps(mapping(gw), default=float))})
    for f in feats:                                        # 6 decimals (about 0.1 m)
        def rnd(c):
            return [rnd(x) for x in c] if isinstance(c[0], (list, tuple)) else [round(c[0], 6), round(c[1], 6)]
        f['geometry']['coordinates'] = rnd(f['geometry']['coordinates'])
    fc = {'type': 'FeatureCollection', 'name': 'suhl_waldbestaende', 'made': glib.now(),
          'crs_note': 'Koordinaten WGS84 (lon/lat); Flächen in ETRS89 / UTM 32N gerechnet; Umrisse folgen dem 20-m-Raster',
          'attribution': glib.ATTRIBUTION, 'features': feats}
    with gzip.open(os.path.join(out, 'bestaende.geojson.gz'), 'wt', encoding='utf-8') as f:
        json.dump(fc, f, ensure_ascii=False, separators=(',', ':'))
    return len(feats)


def unpack(b):
    """-> dict of (20, 20) arrays (row 0 = south): art, nadel %, deckung %, hoehe m, dichte per ha, merker"""
    a = np.frombuffer(b, np.uint8).reshape(6, NC, NC)
    return {'art': a[0], 'nadel': a[1], 'deckung': a[2], 'hoehe': a[3] * 0.25, 'dichte': a[4] * 10.0, 'merker': a[5]}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--gebiet', default='zentrum')
    ap.add_argument('--out', required=True)
    ap.add_argument('--b', default='', help='the tree product of the same area (its tiles get "single trees in b")')
    ap.add_argument('--kontext', default=os.path.join(glib.RAW, 'kontext.pkl'))
    ap.add_argument('--ndom', default='')
    a = ap.parse_args()
    import stadt
    K = kontext.load(a.kontext)
    rows = stadt.tile_table(K, a.gebiet)
    bt = set()
    if a.b:
        bt = {tuple(int(v) for v in k.split('_')) for k in json.load(open(os.path.join(a.b, 'index.json')))['kacheln']}
    nd = None
    if a.ndom:
        import ndom
        nd = ndom.Ndom(a.ndom) or None
    print(json.dumps(build(K, a.gebiet, rows, a.out, bt, a.b or None, ndom=nd), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
