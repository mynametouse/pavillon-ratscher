#!/usr/bin/env python3
"""suhl-gruen: forest stands for the whole area – product w. The closed forest is not stored tree by tree: every level-10 tile gets a
grid of 20 x 20 cells (20 m) inside the mapped forest (OSM landuse=forest, natural=wood) with what the infrared orthophoto at 1 m shows:

  art      0 no stand, 1 broadleaf forest, 2 conifer forest (spruce), 3 mixed forest, 5 young growth / grass on a clearing,
           6 bare clearing (felled, dead wood, rock, track)
  nadel    share of conifer canopy in percent (dark in the near infrared and rough)
  deckung  crown cover in percent
  hoehe    stand height in 0.25 m – ESTIMATED from the class until nDOM1 is there (merker bit 1 = measured)
  dichte   trees per hectare / 10 – estimated from class and cover; where the 20 cm crowns of product b cover the cell it is the
           count of those crowns (merker bit 0: the single trees of this cell are in b – draw those, do not fill)
  merker   bit 0 single trees in b, bit 1 height measured, bit 2 density counted from crowns

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


def block_image(bx, by):
    e0 = glib.wlib.ROOT_E0 + bx * BLOCK * 400.0
    n0 = glib.wlib.ROOT_N0 + by * BLOCK * 400.0
    return glib.wms_image('th_dop20cir', (e0, n0, e0 + BLOCK * 400.0, n0 + BLOCK * 400.0), PXW), (e0, n0)


def cells_of_block(bx, by, U):
    """-> dict of (BLOCK*NC)² arrays per plane for one image block (rows from the NORTH here), from the 1 m infrared image"""
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
    rough = veg & (ndi.uniform_filter(cv, 5) > CV_ROUGH)
    con = rough & (nirs < NIR_CON)
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
    return {'art': art, 'nadel': np.round(100 * nadel).astype(np.uint8), 'deckung': np.round(100 * r).astype(np.uint8),
            'wald_osm': fo, 'gruen': v}


def build(K, gebiet, rows, out, b_tiles=(), b_dir=None, ndom=None):
    """the stand tiles of an area; rows = stadt.tile_table; b_tiles = tiles whose single trees are in product b (their crowns
    are counted per cell when b_dir is given). -> statistics"""
    U = baeume.Umfeld(K)
    tiles = [r['t'] for r in rows]
    blocks = sorted({(t[0] // BLOCK, t[1] // BLOCK) for t in tiles})
    os.makedirs(out, exist_ok=True)
    idx_tiles, areas, n_cells = {}, {}, 0
    big = {}                                  # the class raster of the whole area for the stand polygons: (tx, ty) -> art
    planes_all = {}
    for bi, (bx, by) in enumerate(blocks):
        C = cells_of_block(bx, by, U)
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
            if (tx, ty) in b_tiles:
                merker[art > 0] |= 1
                p = os.path.join(b_dir or '', str(glib.L), str(tx), f'{ty}.bin')
                if b_dir and os.path.exists(p):
                    T = baeume.unpack(open(p, 'rb').read(), tx, ty)
                    e0, n0, _, _ = glib.wlib.tbounds(glib.L, tx, ty)
                    ci = np.clip(((T['E'] - e0) / CELL).astype(int), 0, NC - 1)
                    cj = np.clip(((T['N'] - n0) / CELL).astype(int), 0, NC - 1)
                    cnt = np.zeros((NC, NC), np.float32)
                    np.add.at(cnt, (cj, ci), 1.0)
                    cnt = cnt / (CELL * CELL / 1e4)
                    st = np.isin(art, (1, 2, 3))
                    dichte[st] = cnt[st]
                    merker[st] |= 4
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
    stands = polygons(big, planes_all, out)
    idx = {
        'produkt': 'w', 'name': 'Waldbestände (Zellen 20 m)', 'schema': 1, 'made': glib.now(), 'level': glib.L, 'kachel_m': 400.0, 'zelle_m': CELL,
        'zellen_je_seite': NC, 'pfad': '{level}/{x}/{y}.bin',
        'format': {'ebenen': ['art', 'nadel', 'deckung', 'hoehe', 'dichte', 'merker'], 'bytes_je_ebene': NC * NC,
                   'reihenfolge': 'je Ebene 20 Zeilen zu 20 Zellen; Zeile 0 = Südrand, Zelle 0 = Westrand',
                   'einheiten': {'nadel': 'Prozent Nadelholz an der Krone', 'deckung': 'Prozent Kronendeckung', 'hoehe': '0,25 m (geschätzt, solange merker Bit 1 = 0)',
                                 'dichte': 'Bäume je Hektar / 10', 'merker': 'Bit 0: Einzelbäume dieser Zelle stehen im Produkt b (zeichnen statt füllen); Bit 1: Höhe gemessen (nDOM1); Bit 2: Dichte aus gezählten Kronen'}},
        'arten': {str(k): v for k, v in ARTEN.items()}, 'hoehe_schaetzung_m': HOEHE, 'dichte_schaetzung_je_ha': DICHTE,
        'kacheln': idx_tiles, 'zellen': n_cells, 'flaeche_ha': {ARTEN[k]: round(v, 1) for k, v in sorted(areas.items())},
        'bestaende': {'datei': 'bestaende.geojson.gz', 'anzahl': stands},
        'attribution': glib.ATTRIBUTION,
        'quellen': [{'name': 'DOP20 CIR Thüringen (th_dop20cir, auf 1 m gerechnet), Bildflug 15.05.2024', 'lizenz': 'CC BY 4.0, © GDI-Th', 'url': glib.WMS},
                    {'name': 'OpenStreetMap (landuse=forest, natural=wood)', 'lizenz': 'ODbL 1.0, © OpenStreetMap-Mitwirkende'}],
    }
    glib.write_json(os.path.join(out, 'index.json'), idx, indent=1)
    return {'kacheln': len(idx_tiles), 'zellen': n_cells, 'flaeche_ha': idx['flaeche_ha'], 'flaeche_ha_summe': round(sum(areas.values()), 1),
            'bestaende': stands, 'bildbloecke': len(blocks)}


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
    a = ap.parse_args()
    import stadt
    K = kontext.load(a.kontext)
    rows = stadt.tile_table(K, a.gebiet)
    bt = set()
    if a.b:
        bt = {tuple(int(v) for v in k.split('_')) for k in json.load(open(os.path.join(a.b, 'index.json')))['kacheln']}
    print(json.dumps(build(K, a.gebiet, rows, a.out, bt, a.b or None), ensure_ascii=False, indent=1))


if __name__ == '__main__':
    main()
