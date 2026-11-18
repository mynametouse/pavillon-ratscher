#!/usr/bin/env python3
"""Builds the vegetation-class maps: one PNG per 400 m cell (class + 32 × vigour), Falko's garden at 25 cm, z/index.json, the
manifest – and, with --boegen DIR, the check sheets and the table of areas (they show the orthophoto: never into the repo).

  python3 -I tools/bewuchs/daten/holen.py osm; … dlm; … dop -3 -4 3 2      # part (a) downloads (cached in /home/claude/bewuchs-raw)
  python3 -I tools/bewuchs/daten/holen.py korridor                          # part (b) downloads
  python3 -I tools/bewuchs/daten/holen.py welt                              # part (c) downloads
  node tools/bewuchs/daten/app_daten.mjs > /home/claude/bewuchs-raw/app.json
  nice -n 19 python3 -I tools/bewuchs/daten/bauen.py ratscher korridor welt [--boegen DIR] [--spannen]

Areas (gebiete.py): ratscher – Ratscher's 2.4 km square (RATSCHER.box: cells i −3…3, j −4…2) and the garden; korridor – the road
corridors to Schleusingen and Kloster Veßra, Schleusingen's town zone and Kloster Veßra; welt – the world tiles' detail blocks (block B,
Kloster Veßra's block) and welt-orte's flat places. Cells of areas not built now stay in the index as they are.

The repo should not grow with every build: a PNG is written only when its values changed, and the vigour spans of a flight date already
in the index are kept (so a new area does not shift the vigour of the old ones); --spannen computes them anew from the cells built."""
import datetime, json, os, sys, time
import numpy as np
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemeinsam import CELL, CLASSES, OUT, RAW, SITE_ZONE, Grid, K, cells_in, counts, encode, save_png, vigour_from  # noqa: E402
import garten  # noqa: E402
import gebiete  # noqa: E402
import holen  # noqa: E402
import klassen  # noqa: E402

QUELLE = ('OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL 1.0); Basis-DLM, Luftbild DOP 20 cm in Farbe und Farb-Infrarot (beflogen '
          '07.04.2024 und 15.05.2024), DGM1/DOM1 im Quadrat (© GDI-Th, dl-de/by-2-0); Straßen, Gebäude und Bäume der App; Falkos Garten nach '
          'dem Modell (tools/bewuchs/daten)')
CREDIT = ('<li>Flächenart aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL 1.0) und dem Luftbild Thüringen (© GDI-Th, dl-de/by-2-0); '
          'dazu Basis-DLM und Höhenmodell Thüringen (© GDI-Th, dl-de/by-2-0).</li>')
WORK = os.path.join(RAW, 'work')
# vigour: NDVI within the class, lo → 0 … hi → 7 (5th and 95th percentile of the class over the cells of the same flight date – April and
# May differ), smoothed first (Gaussian, sigma 1.5 m: worn tracks and the shade of a crown stay, the pixel noise goes – the PNGs stay small)
SMOOTH = 1.5
ND_Q = (-0.3, 1.0)  # NDVI kept as 8 bit between the passes


def vigour_table(samples):
    tab = {}
    for c, v in samples.items():
        v = np.concatenate(v) if v else np.zeros(0)
        if c == K['nichts'] or v.size < 500:
            continue
        lo, hi = np.percentile(v, [5, 95])
        tab[c] = (float(lo), float(max(hi, lo + 0.05)))
    return tab


def vigour(cls, nd, tab, res):
    s = ndi.gaussian_filter(nd.astype(np.float32), SMOOTH / res)
    out = np.zeros(cls.shape, np.uint8)
    for c, (lo, hi) in tab.items():
        m = cls == c
        if m.any():
            out[m] = vigour_from(s[m], lo, hi)
    out[cls == K['nichts']] = 0
    return out


def ndvi_on(g, cells):
    """NDVI of the cells (0.5 m) sampled on another grid (nearest)"""
    X, Y = g.centres()
    out = np.zeros((g.h, g.w), np.float32)
    for (i, j), nd in cells.items():
        cg = Grid.cell(i, j, klassen.RES)
        u, v = cg.to_px(X, Y)
        ins = (u >= 0) & (u < cg.w) & (v >= 0) & (v < cg.h)
        out[ins] = nd[v[ins].astype(int), u[ins].astype(int)]
    return out


def _q8(nd):
    return np.clip((nd - ND_Q[0]) / (ND_Q[1] - ND_Q[0]) * 255 + 0.5, 0, 255).astype(np.uint8)


def _uq8(v):
    return v.astype(np.float32) / 255 * (ND_Q[1] - ND_Q[0]) + ND_Q[0]


def build(areas, boegen=None, spannen=False):
    from quellen import Quellen
    t0 = time.time()
    q = Quellen()
    cells, by_area = [], {}
    for a in areas:
        by_area[a] = gebiete.area(a)
        cells += by_area[a]
    os.makedirs(WORK, exist_ok=True)
    gk = None
    if 'ratscher' in areas:  # the garden (finer) first: the cells under it take it over
        gcls, gg = garten.build(q)
        gk = (gcls, gg.x0, gg.y0, gg.res)
    # pass 1: classes and NDVI of every cell (to the work folder), samples of the NDVI per flight date and class
    flights, samples = {}, {}
    for n, (i, j, r) in enumerate(cells):
        t = time.time()
        cls, nd, info = klassen.classify(q, i, j, res=r, garten=gk)
        fl = holen.flight(i, j)
        flights[(i, j)] = fl
        np.savez_compressed(os.path.join(WORK, f'{i}_{j}.npz'), cls=cls, nd=_q8(nd), res=r)
        S = samples.setdefault(fl, {})
        step = 7 if r <= 0.5 else 2
        for c in np.unique(cls):
            S.setdefault(int(c), []).append(nd[cls == c][::step])
        print(f'cell {n + 1}/{len(cells)} {i}_{j} {r:g} m {fl} {time.time() - t:.1f} s', flush=True)
    # pass 2: the PNGs
    zdir = os.path.join(OUT, 'z')
    os.makedirs(zdir, exist_ok=True)
    ifn = os.path.join(zdir, 'index.json')
    old = json.load(open(ifn)) if os.path.exists(ifn) else {}
    # the vigour spans: kept from the index for the flight dates it has (unless --spannen), new ones from the cells built
    kept = {} if spannen else {fl: {K[c]: tuple(v) for c, v in t.items()} for fl, t in old.get('vigour', {}).items() if fl[:2] == '20'}
    tabs = {fl: kept.get(fl) or vigour_table(S) for fl, S in samples.items()}
    # a new flight with few cells: the classes it lacks samples for take the spans of the flight with the most cells (not 0 = bare)
    big = sorted(set(tabs) | set(kept), key=lambda fl: -sum(1 for v in flights.values() if v == fl))
    for fl in tabs:
        if fl not in kept:
            for o in big:
                for c, v in (kept.get(o) or tabs.get(o) or {}).items():
                    tabs[fl].setdefault(c, v)
    index = {'v': 1, 'cell': int(CELL), 'classes': CLASSES, 'cells': dict(old.get('cells', {})), 'quelle': QUELLE,
             'stand': datetime.date.today().isoformat()}
    if 'garten' in old:
        index['garten'] = old['garten']
    vig = old.get('vigour', {})
    if vig and not all(k[:2] == '20' for k in vig):  # (part a kept one table for its one flight)
        vig = {'2024-04-07': vig}
    sizes, res_cells, wrote = {}, {}, 0
    for (i, j, r) in cells:
        d = np.load(os.path.join(WORK, f'{i}_{j}.npz'))
        cls, nd = d['cls'], _uq8(d['nd'])
        tab = tabs[flights[(i, j)]]
        key = f'{i}_{j}'
        sz, w = save_if_changed(os.path.join(zdir, key + '.png'), encode(cls, vigour(cls, nd, tab, r)))
        sizes[key], wrote = sz, wrote + w
        index['cells'][key] = {'res': r, 'n': counts(cls), 'flug': flights[(i, j)]}
        res_cells[(i, j)] = cls
    if gk is not None:
        gcls, gg = gk[0], garten.grid()
        gnd = ndvi_on(gg, {(i, j): _uq8(np.load(os.path.join(WORK, f'{i}_{j}.npz'))['nd']) for (i, j, r) in cells
                           if (i, j) in set(cells_in(*SITE_ZONE))})
        sizes['garten'], w = save_if_changed(os.path.join(OUT, 'garten.png'), encode(gcls, vigour(gcls, gnd, tabs[holen.flight(0, 0)], gg.res)))
        wrote += w
        index['garten'] = {'x0': gg.x0, 'y0': gg.y0, 'res': gg.res, 'w': gg.w, 'h': gg.h, 'n': counts(gcls)}
        np.savez_compressed(os.path.join(WORK, 'garten.npz'), cls=gcls, nd=_q8(gnd))
    for fl, tab in tabs.items():
        vig[fl] = {CLASSES[c]: [round(lo, 6), round(hi, 6)] for c, (lo, hi) in sorted(tab.items())}  # (kept as they are for later builds)
    index['vigour'] = vig
    index['cells'] = dict(sorted(index['cells'].items(), key=lambda kv: tuple(map(int, kv[0].split('_')))))
    json.dump(index, open(ifn, 'w'), ensure_ascii=False, indent=0, separators=(',', ':'))
    man = os.path.join(os.path.dirname(OUT), '..', 'manifest.json')
    json.dump({'credits_add': CREDIT}, open(os.path.normpath(man), 'w'), ensure_ascii=False, indent=1)
    cs = [v for k, v in sizes.items() if k != 'garten']
    print(f'{len(cells)} cells, {sum(cs) // 1024} KB (largest {max(cs) // 1024} KB), {wrote} PNG written (the others unchanged); '
          f'{time.time() - t0:.0f} s')
    if boegen:
        import boegen_bauen
        boegen_bauen.alle(boegen, areas, cells, res_cells, (gk[0], garten.grid()) if gk else None, sizes, tabs, by_area)
    return index


def save_if_changed(path, val):
    """write the PNG only when its values differ from the file there (the repo keeps the old bytes otherwise); (size, 1 if written)"""
    from gemeinsam import load_png
    if os.path.exists(path):
        try:
            same = np.array_equal(load_png(path), val)
        except Exception:
            same = False
        if same:
            return os.path.getsize(path), 0
    return save_png(path, val), 1


if __name__ == '__main__':
    a = sys.argv[1:]
    bo = a[a.index('--boegen') + 1] if '--boegen' in a else None
    ar = [x for x in a if x in ('ratscher', 'korridor', 'welt')] or ['ratscher']
    build(ar, bo, '--spannen' in a)
