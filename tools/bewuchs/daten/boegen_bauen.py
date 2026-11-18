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
    X, Y = g.centres()
    for c in cells:
        i, j = c[0], c[1]
        cg = Grid.cell(i, j, 0.5)
        if g.x1 <= cg.x0 or g.x0 >= cg.x1 or g.y1 <= cg.y0 or g.y0 >= cg.y1:
            continue
        m = (X >= cg.x0) & (X < cg.x1) & (Y >= cg.y0) & (Y < cg.y1)
        if not m.any():
            continue
        # only the part of the grid over this cell (a sub-grid, so a coarse overview does not warp the whole picture each time)
        rows, cols = np.nonzero(m.any(1))[0], np.nonzero(m.any(0))[0]
        sub = Grid(g.x0 + cols[0] * g.res, g.y1 - rows[0] * g.res, g.res, cols[-1] - cols[0] + 1, rows[-1] - rows[0] + 1)
        img = raster.dop(i, j, 'th_dop', sub)
        sl = np.s_[rows[0]:rows[-1] + 1, cols[0]:cols[-1] + 1]
        mm = m[sl]
        out[sl][mm] = img[mm]
    return out


def classes_on(g, cells, res_cells, garten=None):
    X, Y = g.centres()
    out = np.zeros((g.h, g.w), np.uint8)
    for c, cls in res_cells.items():
        i, j = c[0], c[1]
        r = 400.0 / cls.shape[0]
        cg = Grid.cell(i, j, r)
        u, v = cg.to_px(X, Y)
        ins = (u >= 0) & (u < cg.w) & (v >= 0) & (v < cg.h)
        out[ins] = cls[v[ins].astype(int), u[ins].astype(int)]
    if garten is not None:
        gm, gg = garten
        u, v = gg.to_px(X, Y)
        ins = (u >= 0) & (u < gg.w) & (v >= 0) & (v < gg.h)
        out[ins] = gm[v[ins].astype(int), u[ins].astype(int)]
    return out


# close-ups of part (b): Schleusingen's market and old town, Kloster Veßra, a village on the way, the verges of the L 1625 at 1 m
NAH_B = [
    ('nah_schleusingen_markt', (-1200, 1150, -980, 1330), 0.25),
    ('nah_schleusingen_rand', (-1650, 700, -1300, 980), 0.4),
    ('nah_vessra', (-8990, -420, -8700, -180), 0.3),
]


def alle(folder, areas, cells, res_cells, garten, sizes, tabs):
    os.makedirs(folder, exist_ok=True)
    keys = [(c[0], c[1]) for c in cells]
    if 'ratscher' in areas:
        sq = [k for k in keys if -3 <= k[0] <= 3 and -4 <= k[1] <= 2]
        rc = {k: res_cells[k] for k in sq}
        i0, j0 = min(c[0] for c in sq), min(c[1] for c in sq)
        i1, j1 = max(c[0] for c in sq), max(c[1] for c in sq)
        for name, res, side in (('quadrat', 2.0, True), ('quadrat_1m', 1.0, False)):
            g = Grid(400 * i0, 400 * (j1 + 1), res, int(400 * (i1 - i0 + 1) / res), int(400 * (j1 - j0 + 1) / res))
            labels = {(i - i0, j1 - j): f'{i}_{j}' for (i, j) in sq}
            boegen.sheet(os.path.join(folder, name + '.jpg'), photo_on(g, sq), classes_on(g, sq, rc),
                         f'Ratschers Quadrat – Flächenart ({res:g} m je Bildpunkt; Zellen 400 m)', side=side, grid=(400 / res, labels))
        for name, (x0, y0, x1, y1), res in NAH:
            g = Grid(x0, y1, res, int((x1 - x0) / res), int((y1 - y0) / res))
            boegen.sheet(os.path.join(folder, name + '.jpg'), photo_on(g, sq),
                         classes_on(g, sq, rc, garten if name in ('nah_garten', 'nah_hubert_ronald') else None),
                         f'{name[4:]}: x {x0}…{x1}, y {y0}…{y1} ({res:g} m je Bildpunkt)')
    if 'korridor' in areas:
        kc = [k for k in keys if not (-3 <= k[0] <= 3 and -4 <= k[1] <= 2)]
        rc = {k: res_cells[k] for k in kc}
        i0, j0 = min(c[0] for c in kc), min(c[1] for c in kc)
        i1, j1 = max(c[0] for c in kc), max(c[1] for c in kc)
        res = 5.0
        g = Grid(400 * i0, 400 * (j1 + 1), res, int(400 * (i1 - i0 + 1) / res), int(400 * (j1 - j0 + 1) / res))
        labels = {(i - i0, j1 - j): f'{i}_{j}' for (i, j) in kc if (i + j) % 3 == 0}
        boegen.sheet(os.path.join(folder, 'korridor.jpg'), photo_on(g, kc), classes_on(g, kc, rc),
                     'Strecken nach Schleusingen und Kloster Veßra – Flächenart (5 m je Bildpunkt; Zellen 400 m)', side=False,
                     grid=(400 / res, labels))
        rall = {k: res_cells[k] for k in keys}
        for name, (x0, y0, x1, y1), r in NAH_B + [(n, b, r) for n, b, r in extra_nah(kc, rc)]:
            g = Grid(x0, y1, r, int((x1 - x0) / r), int((y1 - y0) / r))
            boegen.sheet(os.path.join(folder, name + '.jpg'), photo_on(g, keys), classes_on(g, keys, rall),
                         f'{name[4:]}: x {x0:.0f}…{x1:.0f}, y {y0:.0f}…{y1:.0f} ({r:g} m je Bildpunkt)')
    tables(folder, keys, res_cells, garten, sizes, tabs, areas)
    print('sheets in', folder)


def extra_nah(kc, rc):
    """a close-up of the open land (a 1 m cell with the most verge) and of a village on the way (a 0.5 m cell with the most lawn)"""
    out = []
    one = [k for k in kc if rc[k].shape[0] == 400]
    half = [k for k in kc if rc[k].shape[0] == 800 and not (-5 <= k[0] <= -1 and 1 <= k[1] <= 5) and not (-24 <= k[0] <= -20 and -3 <= k[1] <= 1)]
    if one:
        k = max(one, key=lambda k: (rc[k] == 3).sum())
        out.append(('nah_bankett_1m', (400 * k[0], 400 * k[1] + 100, 400 * k[0] + 250, 400 * k[1] + 300), 0.5))
    if half:
        k = max(half, key=lambda k: (rc[k] == 1).sum())
        out.append(('nah_dorf', (400 * k[0] + 75, 400 * k[1] + 75, 400 * k[0] + 325, 400 * k[1] + 275), 0.25))
    return out


def tables(folder, keys, res_cells, garten, sizes, tabs, areas):
    rows = []
    tot = np.zeros(32)
    for (i, j) in sorted(keys, key=lambda c: (-c[1], c[0])):
        cls = res_cells[(i, j)]
        px = (400.0 / cls.shape[0]) ** 2
        c = np.bincount(cls.ravel() & 31, minlength=32) * px / 1e4
        tot += c
        rows.append((f'{i}_{j}', c, 400.0 / cls.shape[0]))
    present = [k for k in range(32) if tot[k] > 0]
    tag = '_'.join(areas)
    with open(os.path.join(folder, f'flaechen_{tag}.csv'), 'w') as fh:
        fh.write('zelle;res;' + ';'.join(CLASSES[k] for k in present) + ';kb\n')
        for key, c, r in rows:
            fh.write(f'{key};{r:g};' + ';'.join(f'{c[k]:.2f}' for k in present) + f';{sizes.get(key, 0) / 1024:.0f}\n')
        fh.write('summe;;' + ';'.join(f'{tot[k]:.2f}' for k in present) + f';{sum(v for k, v in sizes.items() if k != "garten") / 1024:.0f}\n')
    with open(os.path.join(folder, f'klassen_{tag}.md'), 'w') as fh:
        fh.write(f'Gebiete: {", ".join(areas)} – {len(keys)} Zellen, {tot.sum():.0f} ha\n\n')
        fh.write('| id | Klasse | ha | Anteil |\n|---|---|---|---|\n')
        for k in present:
            fh.write(f'| {k} | {NAMES_DE[k]} | {tot[k]:.1f} | {100 * tot[k] / tot.sum():.1f} % |\n')
        fh.write('\nWuchs-Spannen (NDVI p5–p95) je Flugtag:\n\n')
        for fl, tab in sorted(tabs.items()):
            fh.write(f'- {fl}: ' + ', '.join(f'{CLASSES[c]} {lo:.2f}–{hi:.2f}' for c, (lo, hi) in sorted(tab.items())) + '\n')
        if garten is not None:
            gm, gg = garten
            gc = np.bincount(gm.ravel() & 31, minlength=32) * gg.res ** 2
            fh.write('\nGarten (x −50…42, y −52…48, 25 cm):\n\n| id | Klasse | m² |\n|---|---|---|\n')
            for k in range(32):
                if gc[k] > 0:
                    fh.write(f'| {k} | {NAMES_DE[k]} | {gc[k]:.0f} |\n')
    json.dump(sizes, open(os.path.join(folder, f'groessen_{tag}.json'), 'w'), indent=0)
