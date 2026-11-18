#!/usr/bin/env python3
"""Part (d): the crop of each field – the arable pixels (9) split into crop classes from the orthophoto of its flight (07.04.2024 or
15.05.2024, colour and colour infrared), one class per field (the median of the field decides; fields: the connected arable land of a cell
between its margins, split by the OSM farmland areas and by the flight line). 9 stays where it is not clear.

  19 wintergetreide – green in April (yellow-green, the tramlines show), dense dark green in May
  20 winterraps     – dense blue-green in April (the leaves of rapeseed), yellow in May (flowering)
  21 hackfrucht     – maize, beet, potato: open soil in April and May (and the spring crops not up yet)
  22 kleegras       – clover grass and field fodder: pale or olive green in May (mown in May, or a thin sward); not told in April

The vigour of a crop class is measured on the span of arable land (9) of its flight, so splitting does not change it.
classify() calls apply() on the cell's core; for maps built before part (d) the step runs on the work files:

  nice -n 19 python3 -I tools/bewuchs/daten/feldfrucht.py          # the work files (bauen.py) → crop classes → PNGs (only changed), index"""
import json, os, sys, time
import numpy as np
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemeinsam import CLASSES, K, OUT, RAW, SITE_ZONE, Grid, counts, encode, m2u  # noqa: E402

CROPS = (19, 20, 21, 22)
FLIGHT_N = 5597000.0  # UTM northing: the flight of 15.05.2024 north of it, of 07.04.2024 south (holen.flight per cell: one exception, far west)
MIN_FIELD = 400.0     # m²: smaller pieces of arable land stay 9
BARE_ND = 0.25        # NDVI below: open soil


def stats(nd, rgb):
    """the medians of a field: NDVI, the share of open soil, the yellowness (R + G) / 2 − B relative to the brightness (+ yellow, − blue)
    and its 90th percentile, the brightness"""
    R, G, B = rgb[:, 0], rgb[:, 1], rgb[:, 2]
    lum = np.maximum((R + G + B) / 3, 1.0)
    yel = ((R + G) / 2 - B) / lum
    return (float(np.median(nd)), float(np.mean(nd < BARE_ND)), float(np.median(yel)), float(np.percentile(yel, 90)),
            float(np.median(lum)))


def crop_of(may, nd_m, bare, yel, yel90, lum=80.0):
    """the crop class of a field from its medians (thresholds read off the fields of the two flights, docs/features/bewuchs-daten.md)"""
    if bare >= 0.6:
        return K['hackfrucht']
    if not may:  # 07.04.2024
        if nd_m >= 0.45 and yel <= -0.12:
            return K['winterraps']
        if nd_m >= 0.30:
            return K['wintergetreide']
        return K['acker']
    # 15.05.2024 (a darker, warmer picture than April's: dense cereals NDVI 0.5–0.6, olive ones 0.35–0.45)
    if yel >= 0.18 or yel90 >= 0.28:
        return K['winterraps']
    if nd_m >= 0.45 and yel <= -0.12:
        return K['winterraps']  # (after flowering: the pods blue-green)
    if lum >= 90.0 and 0.25 <= nd_m < 0.45 and bare < 0.3 and 0.05 <= yel < 0.18:
        return K['kleegras']  # pale: mown in May, or a thin sward
    if nd_m >= 0.30 and bare < 0.3:
        return K['wintergetreide']
    return K['acker']


def apply(cls, nd, rgb, X, Y, flight, farm=None, res=0.5):
    """cls, nd, rgb (h, w, 3), X, Y: the cell's core; flight: the cell's flight date; farm: an int label image of the OSM farmland areas
    (0 outside) or None. Returns the stats {class: fields}; cls is changed in place."""
    ar = cls == K['acker']
    zx0, zy0, zx1, zy1 = SITE_ZONE
    ar &= ~((X >= zx0) & (X < zx1) & (Y >= zy0) & (Y < zy1))  # the modelled site keeps the garden map's field
    if not ar.any():
        return {}
    E, N = m2u(X, Y)
    may = N >= FLIGHT_N  # the flight of each pixel by the line (a cell across it has both)
    if flight == '2024-04-07' and float(E.mean()) < 615000.0:
        may = np.zeros(cls.shape, bool)  # (far west: April north of the line too)
    lab, n = ndi.label(ar)
    key = lab.astype(np.int64) * 4 + may.astype(np.int64) * 2
    if farm is not None:
        key = key * 100003 + farm
    key = np.where(ar, key, -1)
    out = {}
    ids, inv = np.unique(key[ar], return_inverse=True)
    inv = inv.ravel()
    sel_nd, sel_rgb, sel_may = nd[ar], rgb[ar], may[ar]
    order = np.argsort(inv, kind='stable')
    bounds = np.r_[0, np.cumsum(np.bincount(inv, minlength=len(ids)))]
    new = np.full(len(ids), K['acker'], np.uint8)
    for u in range(len(ids)):
        idx = order[bounds[u]:bounds[u + 1]]
        if idx.size * res * res < MIN_FIELD:
            continue
        new[u] = crop_of(bool(sel_may[idx[0]]), *stats(sel_nd[idx], sel_rgb[idx]))
        out[int(new[u])] = out.get(int(new[u]), 0) + 1
    sub = cls[ar]
    sub[:] = new[inv]
    cls[ar] = sub
    return out


def farm_labels(q, g):
    """the OSM farmland areas on a grid as labels (1, 2, … in a fixed order: by their centres)"""
    from shapely.geometry import box
    import raster
    bx = box(g.x0, g.y0, g.x1, g.y1)
    polys = sorted((geom for geom, kind, tags, oid in q.areas_in(bx) if tags.get('landuse') == 'farmland'),
                   key=lambda p: (round(p.centroid.x, 1), round(p.centroid.y, 1)))
    lab = np.zeros((g.h, g.w), np.int64)
    for k, p in enumerate(polys, 1):
        raster.draw_polys(g, [p], k, lab, np.int64)
    return lab


def main():
    """the work files of the built cells (bauen.py pass 1) → crop classes → PNGs (only changed ones written) and the index"""
    import bauen
    import holen
    import klassen
    from quellen import Quellen
    t0 = time.time()
    q = Quellen()
    ifn = os.path.join(OUT, 'z', 'index.json')
    index = json.load(open(ifn))
    tabs = {fl: {K[c]: tuple(v) for c, v in t.items()} for fl, t in index['vigour'].items()}
    for t in tabs.values():
        for c in CROPS:
            if K['acker'] in t:
                t[c] = t[K['acker']]
    wrote, done, tot = 0, 0, {}
    for key, meta in index['cells'].items():
        if not (meta['n'].get(str(K['acker'])) or any(meta['n'].get(str(c)) for c in CROPS)):
            continue
        i, j = map(int, key.split('_'))
        r = meta['res']
        fn = os.path.join(bauen.WORK, f'{key}.npz')
        d = np.load(fn)
        cls, ndq = d['cls'].copy(), d['nd']
        cls[np.isin(cls, CROPS)] = K['acker']  # (again from the arable land)
        f = klassen.features(i, j, r)
        core = f['grid'].inner(int(round(klassen.MARGIN / r)))
        g = Grid.cell(i, j, r)
        X, Y = g.centres()
        st = apply(cls, f['ndvi'][core], f['rgb'][core], X, Y, holen.flight(i, j), farm_labels(q, g), r)
        for c, v in st.items():
            tot[c] = tot.get(c, 0) + v
        np.savez_compressed(fn, cls=cls, nd=ndq, res=r)
        sz, w = bauen.save_if_changed(os.path.join(OUT, 'z', key + '.png'), encode(cls, bauen.vigour(cls, bauen._uq8(ndq), tabs[meta['flug']], r)))
        wrote += w
        meta['n'] = counts(cls)
        done += 1
        if done % 50 == 0:
            print(f'{done} cells, {wrote} PNG written; {time.time() - t0:.0f} s', flush=True)
    index['classes'] = CLASSES
    for fl, t in index['vigour'].items():
        if 'acker' in t:
            for c in CROPS:
                t[CLASSES[c]] = t['acker']
    import datetime
    index['stand'] = datetime.date.today().isoformat()
    json.dump(index, open(ifn, 'w'), ensure_ascii=False, indent=0, separators=(',', ':'))
    print(f'{done} cells with arable land, {wrote} PNG written; fields {({CLASSES[c]: n for c, n in sorted(tot.items())})}; '
          f'{time.time() - t0:.0f} s')


if __name__ == '__main__':
    main()
