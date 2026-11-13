#!/usr/bin/env python3
"""suhl-daten, package S2-9: the quarters of Suhl (the 17 statistical districts of the city) as a 100 m raster on the quadtree.

No outlines of the districts are published as geodata. What exists: the municipal border and the borders of Gehlberg and Schmiedefeld
from OpenStreetMap (tools/suhl/out/bestand/gebiete.geojson) and the names and residents of the districts (docs/plans/suhl/stadt.md).
So every 100 m cell (= one level-12 tile of tools/welt/wlib.py) whose centre lies in the municipality belongs
  - to Gehlberg or Schmiedefeld when its centre lies inside that border (quality 2: OpenStreetMap), else
  - to the district of the nearest seed point of viertel_saat.json (quality 0: an ASSUMPTION - every output says so).
The raster is the one definition: buildings, census cells and the runtime (SUHL.areaAt) all look a point up in it.

    python3 -I tools/suhl/daten/viertel.py            # prints the quarters with their areas
    import viertel; Q = viertel.build(); Q.nr_at(E, N) -> 1..17 or 0 (outside the municipality)
"""
import base64, json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
import suhllib as S

SEEDS = os.path.join(HERE, 'viertel_saat.json')
LEVEL = 12                       # the raster cells are the level-12 tiles (100 m)
CELL = S.tsize(LEVEL)


def load_seeds(path=None):
    doc = S.read_json(path or SEEDS)
    nrs = [q['nr'] for q in doc['viertel']]
    if sorted(nrs) != list(range(1, len(nrs) + 1)):
        raise S.SuhlError(f'viertel_saat.json: the numbers must be 1..{len(nrs)} without gaps, found {sorted(nrs)}')
    if len({q['id'] for q in doc['viertel']}) != len(nrs):
        raise S.SuhlError('viertel_saat.json: two quarters share an id')
    return doc


def _fill(rings, x0e, y0n, w, h, cell):
    """the cells whose CENTRE lies inside the rings (even-odd, so holes count) -> set of (col, row); one scan line per row"""
    edges = []
    for r in rings:
        n = len(r)
        for i in range(n):
            ax, ay = r[i]
            bx, by = r[(i + 1) % n]
            if ay != by:
                edges.append((ax, ay, bx, by) if ay < by else (bx, by, ax, ay))
    out = set()
    for row in range(h):
        y = y0n + (row + 0.5) * cell
        xs = sorted(ax + (y - ay) * (bx - ax) / (by - ay) for ax, ay, bx, by in edges if ay <= y < by)
        for i in range(0, len(xs) - 1, 2):
            c0 = max(0, int(math.ceil((xs[i] - x0e) / cell - 0.5)))
            c1 = min(w - 1, int(math.ceil((xs[i + 1] - x0e) / cell - 0.5)) - 1)
            for c in range(c0, c1 + 1):
                out.add((c, row))
    return out


def _simplify(ring, tol):
    """Douglas-Peucker on a closed ring (list of points, first != last)"""
    if len(ring) < 5:
        return ring

    def dp(pts):
        if len(pts) < 3:
            return pts
        (ax, ay), (bx, by) = pts[0], pts[-1]
        dx, dy = bx - ax, by - ay
        L = math.hypot(dx, dy)
        best, bi = -1.0, 0
        for i in range(1, len(pts) - 1):
            px, py = pts[i]
            d = abs(dx * (py - ay) - dy * (px - ax)) / L if L else math.hypot(px - ax, py - ay)
            if d > best:
                best, bi = d, i
        if best <= tol:
            return [pts[0], pts[-1]]
        return dp(pts[:bi + 1])[:-1] + dp(pts[bi:])

    # split at the point farthest from the first one, so both halves are open lines
    far = max(range(len(ring)), key=lambda i: (ring[i][0] - ring[0][0]) ** 2 + (ring[i][1] - ring[0][1]) ** 2)
    a = dp(ring[:far + 1])
    b = dp(ring[far:] + [ring[0]])
    out = a[:-1] + b[:-1]
    return out if len(out) >= 3 else ring


def _area(r):
    return 0.5 * sum(r[i][0] * r[(i + 1) % len(r)][1] - r[(i + 1) % len(r)][0] * r[i][1] for i in range(len(r)))


class Quarters:
    """the raster and the list of quarters"""

    def __init__(self, seeds=None, areas=None):
        self.doc = seeds or load_seeds()
        self.q = sorted(self.doc['viertel'], key=lambda q: q['nr'])
        self.by_id = {q['id']: q for q in self.q}
        stadt = S.area('stadt') if areas is None else areas['stadt']
        e0, n0, e1, n1 = stadt.bbox
        _, self.x0, self.y0 = (LEVEL,) + S.tile_at(LEVEL, e0, n0)
        x1, y1 = S.tile_at(LEVEL, e1, n1)
        self.w, self.h = x1 - self.x0 + 1, y1 - self.y0 + 1
        b = S.tbounds(LEVEL, self.x0, self.y0)
        self.e0, self.n0 = b[0], b[1]                       # UTM of the south-west corner of the raster
        inside = _fill(stadt.rings, self.e0, self.n0, self.w, self.h, CELL)
        cells = bytearray(self.w * self.h)
        fixed = {}
        for q in self.q:                                    # districts with a real border
            if q.get('grenze'):
                g = S.area(q['grenze']) if areas is None else areas[q['grenze']]
                for c, r in _fill(g.rings, self.e0, self.n0, self.w, self.h, CELL):
                    if (c, r) in inside:
                        fixed[(c, r)] = q['nr']
        seeds_ = [(s[0], s[1], q['nr']) for q in self.q if not q.get('grenze') for s in q['saat']]
        for c, r in inside:
            nr = fixed.get((c, r))
            if nr is None:
                E, N = self.e0 + (c + 0.5) * CELL, self.n0 + (r + 0.5) * CELL
                nr = min(seeds_, key=lambda s: (s[0] - E) ** 2 + (s[1] - N) ** 2)[2]
            cells[r * self.w + c] = nr
        self.cells = cells
        self.n_cells = {q['nr']: 0 for q in self.q}
        for v in cells:
            if v:
                self.n_cells[v] += 1

    # ---- look-up
    def nr_at(self, E, N):
        """the number of the quarter a UTM point lies in, 0 outside the municipality"""
        c, r = int((E - self.e0) // CELL), int((N - self.n0) // CELL)
        if 0 <= c < self.w and 0 <= r < self.h:
            return self.cells[r * self.w + c]
        return 0

    def nearest_nr(self, E, N, reach=3):
        """nr_at, and for a point just outside the municipality (a building on the border) the quarter of the nearest cell within
        `reach` cells - else 0"""
        nr = self.nr_at(E, N)
        if nr:
            return nr
        c0, r0 = int((E - self.e0) // CELL), int((N - self.n0) // CELL)
        best = (1e18, 0)
        for r in range(max(0, r0 - reach), min(self.h, r0 + reach + 1)):
            for c in range(max(0, c0 - reach), min(self.w, c0 + reach + 1)):
                v = self.cells[r * self.w + c]
                if v:
                    d = (c - c0) ** 2 + (r - r0) ** 2
                    if d < best[0]:
                        best = (d, v)
        return best[1]

    def at(self, E, N):
        nr = self.nr_at(E, N)
        return self.q[nr - 1] if nr else None

    def area_km2(self, nr):
        return self.n_cells[nr] * CELL * CELL / 1e6

    def centre(self, nr):
        """the middle of the quarter's cells (UTM)"""
        sx = sy = n = 0
        for r in range(self.h):
            row = self.cells[r * self.w:(r + 1) * self.w]
            for c, v in enumerate(row):
                if v == nr:
                    sx += c + 0.5
                    sy += r + 0.5
                    n += 1
        return (self.e0 + sx / n * CELL, self.n0 + sy / n * CELL) if n else None

    # ---- outlines
    def rings(self, nr, tol=60.0, min_cells=4):
        """the outline of a quarter traced along the cell edges and simplified (Douglas-Peucker, `tol` metres): the outer rings with at
        least `min_cells` cells of area, largest first, as lists of [E, N] (whole metres, anticlockwise). Holes are dropped."""
        w, h, cells = self.w, self.h, self.cells

        def val(c, r):
            return cells[r * w + c] if 0 <= c < w and 0 <= r < h else 0

        nxt = {}
        for r in range(h):
            for c in range(w):
                if cells[r * w + c] != nr:
                    continue
                if val(c, r - 1) != nr:
                    nxt.setdefault((c, r), []).append((c + 1, r))
                if val(c + 1, r) != nr:
                    nxt.setdefault((c + 1, r), []).append((c + 1, r + 1))
                if val(c, r + 1) != nr:
                    nxt.setdefault((c + 1, r + 1), []).append((c, r + 1))
                if val(c - 1, r) != nr:
                    nxt.setdefault((c, r + 1), []).append((c, r))
        out = []
        while nxt:
            start = next(iter(nxt))
            ring, p = [], start
            while True:
                ring.append(p)
                ends = nxt[p]
                q = ends.pop()
                if not ends:
                    del nxt[p]
                p = q
                if p == start:
                    break
            a = _area(ring)
            if a < min_cells:                    # holes (negative) and crumbs
                continue
            pts = [(self.e0 + c * CELL, self.n0 + r * CELL) for c, r in ring]
            pts = [pts[i] for i in range(len(pts))                      # drop the points in the middle of a straight run
                   if (pts[i][0] - pts[i - 1][0]) * (pts[(i + 1) % len(pts)][1] - pts[i][1])
                   != (pts[i][1] - pts[i - 1][1]) * (pts[(i + 1) % len(pts)][0] - pts[i][0])]
            pts = _simplify(pts, tol)
            out.append((a, [[int(round(x)), int(round(y))] for x, y in pts]))
        out.sort(key=lambda t: -t[0])
        return [r for _, r in out]

    # ---- files
    def raster_json(self):
        """the raster for viertel.json: row 0 is the southern row, column 0 the western column; one byte per cell (0 outside, else nr)"""
        return {'crs': 'EPSG:25832', 'level': LEVEL, 'cell': CELL, 'x0': self.x0, 'y0': self.y0, 'w': self.w, 'h': self.h,
                'e0': self.e0, 'n0': self.n0, 'order': 'row 0 = south, column 0 = west; byte = quarter number, 0 = outside the municipality',
                'data': base64.b64encode(bytes(self.cells)).decode('ascii')}

    def quarter_json(self, q, tol=60.0):
        nr = q['nr']
        c = self.centre(nr)
        rings = self.rings(nr, tol)
        reach = max((math.hypot(x - c[0], y - c[1]) for r in rings for x, y in r), default=0.0)
        real = bool(q.get('grenze'))
        return {'nr': nr, 'id': q['id'], 'name': q['name'], 'kind': q['kind'], 'area': round(self.area_km2(nr), 2),
                'center': [int(round(c[0])), int(round(c[1]))], 'r': int(round(reach)), 'poly': rings,
                'outline': {'q': 2 if real else 0, 'src': 'osm' if real else 'regel',
                            'how': ('Grenze aus OpenStreetMap (' + q['grenze'] + '), auf 100 m gerastert') if real else
                            'Annahme: Zellen des nächsten Saatpunkts (tools/suhl/daten/viertel_saat.json), keine amtliche Grenze'}}


def from_raster(doc, seeds=None):
    """a Quarters object from the raster of a viertel.json (for readers that must not recompute)"""
    q = Quarters.__new__(Quarters)
    q.doc = seeds or load_seeds()
    q.q = sorted(q.doc['viertel'], key=lambda v: v['nr'])
    q.by_id = {v['id']: v for v in q.q}
    q.x0, q.y0, q.w, q.h, q.e0, q.n0 = doc['x0'], doc['y0'], doc['w'], doc['h'], doc['e0'], doc['n0']
    q.cells = bytearray(base64.b64decode(doc['data']))
    q.n_cells = {v['nr']: 0 for v in q.q}
    for v in q.cells:
        if v:
            q.n_cells[v] += 1
    return q


_CACHE = {}


def build(path=None):
    key = path or SEEDS
    if key not in _CACHE:
        _CACHE[key] = Quarters(load_seeds(path))
    return _CACHE[key]


if __name__ == '__main__':
    Q = build()
    print(f'raster {Q.w} x {Q.h} cells of {CELL:.0f} m from level-12 tile {Q.x0}/{Q.y0}; municipality {sum(Q.n_cells.values()) / 100:.2f} km2')
    for q in Q.q:
        j = Q.quarter_json(q)
        print(f'{q["nr"]:2d} {q["id"]:13s} {j["area"]:7.2f} km2  centre {j["center"]}  rings {len(j["poly"])}  points {sum(len(r) for r in j["poly"])}'
              f'  outline q{j["outline"]["q"]}  residents {q["einwohner"]}')
    print('centre of Suhl lies in', Q.at(*S.CENTRE_UTM)['id'])
