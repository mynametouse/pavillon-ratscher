#!/usr/bin/env python3
"""suhl-gruen: checks and statistics of the tree product (plan 5.3): no tree on a building footprint, in a carriageway or on water,
no doubles, the centre of Suhl inside, counts against OpenStreetMap, trees per hectare by land use. All areas in UTM.

  python3 -I tools/suhl/gruen/pruefen.py --b tools/suhl/out/gruen/probe/suhl/b/v0 [--out pruefung.json]
"""
import argparse, json, os, sys
import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glib, kontext, baeume, klassen


def load_product(b):
    idx = json.load(open(os.path.join(b, 'index.json'), encoding='utf-8'))
    M = {}
    for key in idx['kacheln']:
        tx, ty = (int(v) for v in key.split('_'))
        M[(tx, ty)] = baeume.unpack(open(os.path.join(b, str(glib.L), str(tx), f'{ty}.bin'), 'rb').read(), tx, ty)
    return M, idx


def pruefe(M, K):
    """-> dict of checks; 'ok' is True when no tree stands on a roof, in a carriageway or on water and there are no doubles"""
    from scipy.spatial import cKDTree
    U = baeume.Umfeld(K)
    roof = road = wat = n = 0
    worst = []
    for (tx, ty), T in M.items():
        if not len(T['E']):
            continue
        bb = glib.wlib.tbounds(glib.L, tx, ty)
        bld, rd, water = U.raster(bb, 0.2, grow_bld=0.0, grow_road=0.0)
        ix = np.clip(((T['E'] - bb[0]) / 0.2).astype(int), 0, bld.shape[1] - 1)
        iy = np.clip(((bb[3] - T['N']) / 0.2).astype(int), 0, bld.shape[0] - 1)
        a, b, c = int(bld[iy, ix].sum()), int(rd[iy, ix].sum()), int(water[iy, ix].sum())
        roof += a; road += b; wat += c; n += len(T['E'])
        if a + b + c:
            worst.append([f'{tx}_{ty}', a, b, c])
    E = np.concatenate([T['E'] for T in M.values()]) if M else np.zeros(0)
    N = np.concatenate([T['N'] for T in M.values()]) if M else np.zeros(0)
    doubles = 0
    if len(E) > 1:
        doubles = len(cKDTree(np.stack([E, N], 1)).query_pairs(0.75))
    s = glib.wlib.tsize(glib.L)
    ck = (int((glib.CENTRE_UTM[0] - glib.wlib.ROOT_E0) // s), int((glib.CENTRE_UTM[1] - glib.wlib.ROOT_N0) // s))
    return {'baeume': int(n), 'auf_gebaeude_grundriss': roof, 'in_fahrbahn': road, 'auf_wasser': wat, 'doppelte_unter_0_75_m': int(doubles),
            'mittelpunkt_suhl_in_kachel': f'{ck[0]}_{ck[1]}', 'mittelpunkt_im_satz': ck in M, 'kacheln_mit_fund': worst[:20],
            'ok': bool(roof == 0 and road == 0 and wat == 0 and doubles == 0 and ck in M)}


def statistik(M, K, rows=None):
    """counts by kind, flags, size; trees per hectare by mapped land use (areas from a 2 m class raster of the tiles, UTM)"""
    F = klassen.Flaechen(K)
    U = baeume.Umfeld(K)
    kinds, by_class, area_class = {}, {}, {}
    # setting of a tree (not in the tile file; a proposal for the schema): forest, street (trunk within 6 m of the edge of a public
    # carriageway), park / green / cemetery / playground, garden / yard / allotment (also: residential land), other
    standort = {'Wald': 0, 'Straßenbaum': 0, 'Park, Grünanlage, Friedhof': 0, 'Garten, Hof, Kleingarten': 0, 'sonst': 0}
    st_r = {k: [] for k in standort}
    fl = {'lage_luftbild': 0, 'lage_osm': 0, 'lage_ndom': 0, 'hoehe_gemessen': 0, 'radius_gemessen': 0, 'art_kartiert': 0,
          'geruecket': 0, 'in_osm_kartiert': 0, 'im_wald': 0}
    hs, rs = [], []
    per_tile = {}
    for (tx, ty), T in M.items():
        n = len(T['E'])
        per_tile[f'{tx}_{ty}'] = n
        bb = glib.wlib.tbounds(glib.L, tx, ty)
        cl = F.raster(bb, 2.0)
        for k, c in zip(*np.unique(cl, return_counts=True)):
            area_class[int(k)] = area_class.get(int(k), 0.0) + c * 4.0 / 1e4
        if not n:
            continue
        for k, c in zip(*np.unique(T['kind'], return_counts=True)):
            kinds[int(k)] = kinds.get(int(k), 0) + int(c)
        ix = np.clip(((T['E'] - bb[0]) / 2.0).astype(int), 0, cl.shape[1] - 1)
        iy = np.clip(((bb[3] - T['N']) / 2.0).astype(int), 0, cl.shape[0] - 1)
        for k, c in zip(*np.unique(cl[iy, ix], return_counts=True)):
            by_class[int(k)] = by_class.get(int(k), 0) + int(c)
        f = T['flags']
        _, near, _ = U.raster(bb, 2.0, grow_bld=0.0, grow_road=6.0, public_only=True)
        c = cl[iy, ix]
        tree = T['kind'] != 30
        sw = ((f & 128) > 0) | (c == 1)
        ss = near[iy, ix] & ~sw
        sp = np.isin(c, (4, 5, 8, 9, 10, 3, 12)) & ~sw & ~ss
        sg = np.isin(c, (6, 7, 13, 20)) & ~sw & ~ss & ~sp
        for name, m in (('Wald', sw), ('Straßenbaum', ss), ('Park, Grünanlage, Friedhof', sp), ('Garten, Hof, Kleingarten', sg),
                        ('sonst', ~(sw | ss | sp | sg))):
            standort[name] += int((m & tree).sum())
            st_r[name].append(T['r'][m & tree])
        fl['lage_luftbild'] += int(((f & 3) == 1).sum()); fl['lage_osm'] += int(((f & 3) == 2).sum()); fl['lage_ndom'] += int(((f & 3) == 3).sum())
        fl['hoehe_gemessen'] += int(((f & 4) > 0).sum()); fl['radius_gemessen'] += int(((f & 8) > 0).sum())
        fl['art_kartiert'] += int(((f & 16) > 0).sum()); fl['geruecket'] += int(((f & 32) > 0).sum())
        fl['in_osm_kartiert'] += int(((f & 64) > 0).sum()); fl['im_wald'] += int(((f & 128) > 0).sum())
        hs.append(T['h']); rs.append(T['r'])
    hs = np.concatenate(hs) if hs else np.zeros(0)
    rs = np.concatenate(rs) if rs else np.zeros(0)
    q = lambda v: [round(float(x), 2) for x in np.quantile(v, [0.05, 0.25, 0.5, 0.75, 0.95])] if len(v) else []
    dens = {}
    for k, a in sorted(area_class.items()):
        dens[klassen.KLASSEN.get(k, str(k))] = {'flaeche_ha': round(a, 1), 'baeume': by_class.get(k, 0),
                                               'baeume_je_ha': round(by_class.get(k, 0) / a, 1) if a > 0.05 else None}
    n_all = int(len(hs))
    area_all = sum(area_class.values())
    return {'anzahl': n_all, 'kacheln': len(M), 'flaeche_ha': round(area_all, 1), 'baeume_je_ha': round(n_all / area_all, 1) if area_all else None,
            'nach_art': {baeume.KINDS.get(k, str(k)): v for k, v in sorted(kinds.items())},
            'nadel_anteil_prozent': round(100.0 * sum(v for k, v in kinds.items() if k in baeume.CONIFER) / max(1, n_all), 1),
            'merker': fl, 'hoehe_m_quantile_5_25_50_75_95': q(hs), 'kronenradius_m_quantile_5_25_50_75_95': q(rs),
            'kronenflaeche_ha': round(float((np.pi * rs ** 2).sum() / 1e4), 1),
            'nach_standort_ohne_straeucher': {k: {'baeume': v, 'kronenradius_median_m': round(float(np.median(np.concatenate(st_r[k]))), 1)
                                                  if v else None} for k, v in standort.items()},
            'nach_nutzung': dens, 'max_je_kachel': max(per_tile.values()) if per_tile else 0}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--b', required=True)
    ap.add_argument('--kontext', default=os.path.join(glib.RAW, 'kontext.pkl'))
    ap.add_argument('--out', default='')
    a = ap.parse_args()
    K = kontext.load(a.kontext)
    M, idx = load_product(a.b)
    res = {'made': glib.now(), 'produkt': a.b, 'pruefung': pruefe(M, K), 'baeume': statistik(M, K)}
    if a.out:
        glib.write_json(a.out, res, indent=1)
    print(json.dumps(res, ensure_ascii=False, indent=1))
    if not res['pruefung']['ok']:
        sys.exit(1)


if __name__ == '__main__':
    main()
