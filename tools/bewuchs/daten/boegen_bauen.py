"""The check sheets and the table of areas for the report folder (they show the orthophoto: never into the repo)."""
import json, os, sys
import numpy as np
from PIL import Image
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemeinsam import CLASSES, NAMES_DE, Grid  # noqa: E402
import boegen  # noqa: E402
import raster  # noqa: E402

# close-ups: name, model box (x0, y0, x1, y1), metres per pixel
NAH = [
    ('nah_garten', (-16, -48, 20, 40), 0.1),
    ('nah_anger', (170, -150, 300, -70), 0.2),
    ('nah_hubert_ronald', (-50, -52, 42, 48), 0.15),
    ('nah_l3004_bankett', (420, -830, 560, -720), 0.2),
    ('nah_feldrand', (60, -340, 220, -200), 0.2),
    ('nah_feldblock', (-160, -330, -40, -230), 0.2),
]


def photo_on(g, cells):
    """the orthophoto of the cells warped onto any grid"""
    out = np.zeros((g.h, g.w, 3), np.uint8)
    for (i, j) in cells:
        cg = Grid.cell(i, j, 0.5)
        if g.x1 <= cg.x0 or g.x0 >= cg.x1 or g.y1 <= cg.y0 or g.y0 >= cg.y1:
            continue
        img = raster.dop(i, j, 'th_dop', g)
        X, Y = g.centres()
        m = (X >= cg.x0) & (X < cg.x1) & (Y >= cg.y0) & (Y < cg.y1)
        out[m] = img[m]
    return out


def classes_on(g, cells, res_cells, garten=None):
    X, Y = g.centres()
    out = np.zeros((g.h, g.w), np.uint8)
    for (i, j), cls in res_cells.items():
        cg = Grid.cell(i, j, 0.5)
        u, v = cg.to_px(X, Y)
        ins = (u >= 0) & (u < cg.w) & (v >= 0) & (v < cg.h)
        out[ins] = cls[v[ins].astype(int), u[ins].astype(int)]
    if garten is not None:
        gm, gg = garten
        u, v = gg.to_px(X, Y)
        ins = (u >= 0) & (u < gg.w) & (v >= 0) & (v < gg.h)
        out[ins] = gm[v[ins].astype(int), u[ins].astype(int)]
    return out


def alle(folder, cells, res_cells, garten, sizes, tab):
    os.makedirs(folder, exist_ok=True)
    i0, j0 = min(c[0] for c in cells), min(c[1] for c in cells)
    i1, j1 = max(c[0] for c in cells), max(c[1] for c in cells)
    # the whole square: 2 m per pixel side by side, and the classes alone at 1 m
    for name, res, side in (('quadrat', 2.0, True), ('quadrat_1m', 1.0, False)):
        g = Grid(400 * i0, 400 * (j1 + 1), res, int(400 * (i1 - i0 + 1) / res), int(400 * (j1 - j0 + 1) / res))
        rgb = photo_on(g, cells)
        cls = classes_on(g, cells, res_cells)
        labels = {(i - i0, j1 - j): f'{i}_{j}' for (i, j) in cells}
        boegen.sheet(os.path.join(folder, name + '.jpg'), rgb, cls, f'Ratschers Quadrat – Flächenart ({res:g} m je Bildpunkt; Zellen 400 m)',
                     side=side, grid=(400 / res, labels))
    for name, (x0, y0, x1, y1), res in NAH:
        g = Grid(x0, y1, res, int((x1 - x0) / res), int((y1 - y0) / res))
        rgb = photo_on(g, cells)
        cls = classes_on(g, cells, res_cells, garten if name in ('nah_garten', 'nah_hubert_ronald') else None)
        boegen.sheet(os.path.join(folder, name + '.jpg'), rgb, cls, f'{name[4:]}: x {x0}…{x1}, y {y0}…{y1} ({res:g} m je Bildpunkt)')
    # the table of areas (ha) per cell and class
    rows = []
    tot = np.zeros(32)
    for (i, j) in sorted(cells, key=lambda c: (-c[1], c[0])):
        c = np.bincount(res_cells[(i, j)].ravel() & 31, minlength=32) * 0.25 / 1e4
        tot += c
        rows.append((f'{i}_{j}', c))
    present = [k for k in range(32) if tot[k] > 0]
    with open(os.path.join(folder, 'flaechen.csv'), 'w') as fh:
        fh.write('zelle;' + ';'.join(CLASSES[k] for k in present) + ';kb\n')
        for key, c in rows:
            fh.write(key + ';' + ';'.join(f'{c[k]:.2f}' for k in present) + f';{sizes.get(key, 0) / 1024:.0f}\n')
        fh.write('summe;' + ';'.join(f'{tot[k]:.2f}' for k in present) + f';{sum(v for k, v in sizes.items() if k != "garten") / 1024:.0f}\n')
    with open(os.path.join(folder, 'klassen.md'), 'w') as fh:
        fh.write('| id | Klasse | ha im Quadrat | Anteil | Wuchs-Spanne NDVI (p5–p95) |\n|---|---|---|---|---|\n')
        for k in present:
            lo, hi = tab.get(k, (None, None))
            fh.write(f'| {k} | {NAMES_DE[k]} | {tot[k]:.1f} | {100 * tot[k] / tot.sum():.1f} % | '
                     f'{"–" if lo is None else f"{lo:.2f}–{hi:.2f}"} |\n')
        gm, gg = garten
        gc = np.bincount(gm.ravel() & 31, minlength=32) * gg.res ** 2
        fh.write('\nGarten (x −50…42, y −52…48, 25 cm):\n\n| id | Klasse | m² |\n|---|---|---|\n')
        for k in range(32):
            if gc[k] > 0:
                fh.write(f'| {k} | {NAMES_DE[k]} | {gc[k]:.0f} |\n')
    json.dump({k: v for k, v in sizes.items()}, open(os.path.join(folder, 'groessen.json'), 'w'), indent=0)
    print('sheets in', folder)
