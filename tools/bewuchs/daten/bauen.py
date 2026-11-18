#!/usr/bin/env python3
"""Builds the vegetation-class maps: one PNG per 400 m cell (class + 32 × vigour), Falko's garden at 25 cm, z/index.json, the
manifest – and, with --boegen DIR, the check sheets and the table of areas (they show the orthophoto: never into the repo).

  python3 -I tools/bewuchs/daten/holen.py osm; … dlm; … dop -3 -4 3 2      # the downloads (cached in /home/claude/bewuchs-raw)
  node tools/bewuchs/daten/app_daten.mjs > /home/claude/bewuchs-raw/app.json
  nice -n 10 python3 -I tools/bewuchs/daten/bauen.py ratscher [--boegen DIR]

Part (a): Ratscher's 2.4 km square (RATSCHER.box: cells i −3…3, j −4…2) and the garden."""
import datetime, json, os, sys, time
import numpy as np
from scipy import ndimage as ndi
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemeinsam import CELL, CLASSES, NAMES_DE, OUT, RAW, REPO, Grid, K, cells_in, counts, encode, save_png, square_box, vigour_from  # noqa: E402
import garten  # noqa: E402
import klassen  # noqa: E402

QUELLE = ('OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL 1.0); Basis-DLM, Luftbild DOP 20 cm in Farbe und Farb-Infrarot (beflogen '
          '07.04.2024), DGM1/DOM1 (© GDI-Th, dl-de/by-2-0); Straßen, Gebäude und Bäume der App; Falkos Garten nach dem Modell '
          '(tools/bewuchs/daten)')
CREDIT = ('<li>Flächenart aus OpenStreetMap (© OpenStreetMap-Mitwirkende, ODbL 1.0) und dem Luftbild Thüringen (© GDI-Th, dl-de/by-2-0); '
          'dazu Basis-DLM und Höhenmodell Thüringen (© GDI-Th, dl-de/by-2-0).</li>')
WORK = os.path.join(RAW, 'work')
# vigour: NDVI within the class, lo → 0 … hi → 7 (5th and 95th percentile of the class over the area built), smoothed first (Gaussian,
# sigma 1.5 m: worn tracks and the shade of a crown stay, the pixel noise goes – and the PNGs stay small)
SMOOTH = 1.5


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


def build(area, boegen=None):
    from quellen import Quellen
    t0 = time.time()
    q = Quellen()
    if area != 'ratscher':
        sys.exit('only "ratscher" (part a) so far')
    x0, y0, x1, y1 = square_box()
    cells = cells_in(x0, y0, x1, y1)
    os.makedirs(WORK, exist_ok=True)
    # 1 the garden (finer), 2 every cell with the garden pasted in
    gcls, gg = garten.build(q)
    gx0, gy0 = gg.x0, gg.y0
    res_cells, nds = {}, {}
    for (i, j) in cells:
        t = time.time()
        cls, nd, info = klassen.classify(q, i, j, garten=(gcls, gx0, gy0, gg.res))
        res_cells[(i, j)] = cls
        nds[(i, j)] = nd
        print(f'cell {i}_{j}', f'{time.time() - t:.1f} s', flush=True)
    # 3 vigour per class, from the whole area
    samples = {}
    for c in range(32):
        samples[c] = [nds[k][res_cells[k] == c][::7] for k in cells]
    tab = vigour_table(samples)
    gnd = ndvi_on(gg, nds)
    # 4 write
    zdir = os.path.join(OUT, 'z')
    os.makedirs(zdir, exist_ok=True)
    index = {'v': 1, 'cell': int(CELL), 'classes': CLASSES, 'cells': {}, 'quelle': QUELLE, 'stand': datetime.date.today().isoformat()}
    sizes = {}
    for (i, j) in cells:
        val = encode(res_cells[(i, j)], vigour(res_cells[(i, j)], nds[(i, j)], tab, klassen.RES))
        key = f'{i}_{j}'
        sizes[key] = save_png(os.path.join(zdir, key + '.png'), val)
        index['cells'][key] = {'res': klassen.RES, 'n': counts(res_cells[(i, j)])}
        np.savez_compressed(os.path.join(WORK, key + '.npz'), cls=res_cells[(i, j)], nd=nds[(i, j)].astype(np.float16))
    gval = encode(gcls, vigour(gcls, gnd, tab, gg.res))
    sizes['garten'] = save_png(os.path.join(OUT, 'garten.png'), gval)
    index['garten'] = {'x0': gx0, 'y0': gy0, 'res': gg.res, 'w': gg.w, 'h': gg.h, 'n': counts(gcls)}
    index['vigour'] = {CLASSES[c]: [round(lo, 3), round(hi, 3)] for c, (lo, hi) in sorted(tab.items())}
    json.dump(index, open(os.path.join(zdir, 'index.json'), 'w'), ensure_ascii=False, indent=0, separators=(',', ':'))
    man = os.path.join(os.path.dirname(OUT), '..', 'manifest.json')
    json.dump({'credits_add': CREDIT}, open(os.path.normpath(man), 'w'), ensure_ascii=False, indent=1)
    np.savez_compressed(os.path.join(WORK, 'garten.npz'), cls=gcls, nd=gnd.astype(np.float16))
    tot = sum(v for k, v in sizes.items() if k != 'garten')
    print(f'{len(cells)} cells, {tot // 1024} KB (largest {max(v for k, v in sizes.items() if k != "garten") // 1024} KB), garden '
          f'{sizes["garten"] // 1024} KB; {time.time() - t0:.0f} s')
    if boegen:
        import boegen_bauen
        boegen_bauen.alle(boegen, cells, res_cells, (gcls, gg), sizes, tab)
    return index


if __name__ == '__main__':
    a = sys.argv[1:]
    bo = a[a.index('--boegen') + 1] if '--boegen' in a else None
    build(a[0] if a else 'ratscher', bo)
