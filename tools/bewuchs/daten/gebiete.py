"""The areas built (part a: Ratscher's square; part b: the road corridors to Schleusingen and Kloster Veßra – the cells of
dist/gebaeude/z/index.json beyond the square and those along the drive's routes –, Schleusingen's town zone and Kloster Veßra) and the
resolution of each cell: 0.5 m where a village or town is (a built-up area of dist/strassen/ausstattung.json, or a town zone), 1 m
elsewhere."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gemeinsam import CELL, DIST, cells_in, square_box  # noqa: E402

MIN_BUILT = 1000.0  # m² of built-up area in a cell for 0.5 m


def _load(p):
    with open(os.path.join(DIST, p)) as fh:
        return json.load(fh)


def zones():
    """the town zones (x0, y0, x1, y1): Schleusingen (dist/schleusingen/stadt.json), Kloster Veßra (dist/vessra/ort.json)"""
    return {'schleusingen': tuple(_load('schleusingen/stadt.json')['zone']), 'vessra': tuple(_load('vessra/ort.json')['zone'])}


def orte_polys():
    from shapely.geometry import Polygon
    out = []
    for o in _load('strassen/ausstattung.json').get('orte', []):
        for q in o['a']:
            p = Polygon(np.asarray(q, float).reshape(-1, 2) / 10)
            out.append((o['n'], o['t'], p if p.is_valid else p.buffer(0)))
    return out


def ratscher():
    return [(i, j, 0.5) for i, j in cells_in(*square_box())]


ROUTE_PAD = 60.0  # m either side of the drive's routes


def route_cells():
    """the cells within 60 m of the drive's routes (dist/fahrt/strassen.json routes: to the market of Schleusingen, to the tree nursery at
    Kloster Veßra) – the stretches between the villages, where the building cells leave gaps"""
    import math
    from shapely.geometry import LineString, box
    out = set()
    for r in _load('fahrt/strassen.json').get('routes', {}).values():
        ln = LineString(np.asarray(r['pts'], float).reshape(-1, 2) / 10).buffer(ROUTE_PAD)
        x0, y0, x1, y1 = ln.bounds
        for i in range(math.floor(x0 / CELL), math.floor(x1 / CELL) + 1):
            for j in range(math.floor(y0 / CELL), math.floor(y1 / CELL) + 1):
                if ln.intersects(box(CELL * i, CELL * j, CELL * (i + 1), CELL * (j + 1))):
                    out.add((i, j))
    return out


def korridor():
    """part (b): the cells of the buildings beyond the square, of the drive's routes and of the two town zones, minus the square; with
    their resolution"""
    from shapely.geometry import box
    sq = set(cells_in(*square_box()))
    idx = _load('gebaeude/z/index.json')
    gk = list(idx['cells'])
    if isinstance(idx.get('order'), list) and isinstance(idx.get('stats'), dict) and 'cells' in idx['stats']:
        gk = idx['order'][:int(idx['stats']['cells'])]  # the corridors' cells; welt-orte's flat places of the region came after (part c)
    keys = {tuple(map(int, k.split('_'))) for k in gk} | route_cells()
    for z in zones().values():
        keys |= set(cells_in(*z))
    keys -= sq
    orte = orte_polys()
    zb = [box(*z) for z in zones().values()]
    out = []
    for i, j in sorted(keys, key=lambda c: (c[1], c[0])):
        cb = box(CELL * i, CELL * j, CELL * (i + 1), CELL * (j + 1))
        built = sum(p.intersection(cb).area for n, t, p in orte if p.intersects(cb))
        town = any(z.intersects(cb) for z in zb)
        out.append((i, j, 0.5 if built >= MIN_BUILT or town else 1.0))
    return out


def area(name):
    return {'ratscher': ratscher, 'korridor': korridor}[name]()


if __name__ == '__main__':
    for n in ('ratscher', 'korridor'):
        c = area(n)
        print(n, len(c), 'cells,', sum(1 for x in c if x[2] == 0.5), 'at 0.5 m')
