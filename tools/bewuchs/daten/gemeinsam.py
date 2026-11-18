"""Shared parts of the vegetation-class maps (feat/bewuchs-daten): the model frame, the 400 m cells, the class table, the pixel grid,
the PNG coding and the paths. Pure – no network, no app – so the unit tests (test_gemeinsam.py) cover it.

The model frame is the one of tools/geo/dop_th.py and viz3/manifests.json (geoman.xf): model (x, y) in metres, x east, y north of the
garden, UTM 32N (EPSG:25832) E = EX + A x − B y, N = EY + B x + A y (scale 1.0157, turned 4.36°)."""
import json, os
import numpy as np

A, B, EX, EY = 1.0127906473420232, 0.07715765993901931, 625469.0070213208, 5595624.323524626
S2 = A * A + B * B
CELL = 400.0
REPO = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
RAW = os.environ.get('BEWUCHS_RAW', '/home/claude/bewuchs-raw')  # caches of OSM XML, orthophotos, DLM maps – never into the repo
OUT = os.path.join(REPO, 'viz3', 'extra', 'bewuchs-daten', 'dist', 'bewuchs')
DIST = os.path.join(REPO, 'viz3', 'dist')

# ---- the classes (ids fixed by the brief docs/plans/auftraege/bewuchs-daten.md; 18–31 reserved) ----
CLASSES = ['nichts', 'zierrasen', 'oeffentlich', 'bankett', 'maehwiese', 'weide', 'streuobst', 'saum', 'ufer', 'acker', 'ackerrand',
           'waldboden', 'gebuesch', 'beet', 'gemuese', 'verkehrsgruen', 'friedhof', 'sportrasen']
K = {n: i for i, n in enumerate(CLASSES)}
# colours of the check sheets (not used by the app)
COLOURS = {
    0: (0, 0, 0), 1: (120, 230, 60), 2: (40, 200, 200), 3: (250, 170, 40), 4: (240, 240, 60), 5: (170, 120, 60), 6: (250, 120, 200),
    7: (200, 90, 255), 8: (40, 110, 255), 9: (150, 100, 40), 10: (255, 60, 40), 11: (0, 110, 40), 12: (0, 200, 120), 13: (255, 0, 160),
    14: (140, 60, 10), 15: (255, 255, 255), 16: (110, 110, 160), 17: (190, 255, 160)}
NAMES_DE = {0: 'nichts (Fahrbahn, Weg, Hof, Gebäude, Wasser)', 1: 'Zierrasen', 2: 'öffentliches Grün', 3: 'Bankett', 4: 'Mähwiese',
            5: 'Weide', 6: 'Streuobstwiese', 7: 'Saum, Brache, Graben', 8: 'Ufer', 9: 'Acker', 10: 'Ackerrand', 11: 'Waldboden',
            12: 'Gebüsch', 13: 'Beet', 14: 'Gemüsebeet', 15: 'Verkehrsgrün', 16: 'Friedhof', 17: 'Sportrasen'}


def m2u(x, y):
    """model metres → UTM 32N (E, N)"""
    x = np.asarray(x, float)
    y = np.asarray(y, float)
    return EX + A * x - B * y, EY + B * x + A * y


def u2m(E, N):
    """UTM 32N → model metres"""
    dE = np.asarray(E, float) - EX
    dN = np.asarray(N, float) - EY
    return (A * dE + B * dN) / S2, (-B * dE + A * dN) / S2


def cell_of(x, y):
    """the cell key 'i_j' of a model point (the grid of dist/gebaeude/z: i = floor(x / 400), j = floor(y / 400))"""
    return f'{int(np.floor(x / CELL))}_{int(np.floor(y / CELL))}'


def cell_box(i, j):
    """model box [x0, y0, x1, y1] of cell (i, j)"""
    return 400.0 * i, 400.0 * j, 400.0 * (i + 1), 400.0 * (j + 1)


def cells_in(x0, y0, x1, y1):
    """all cells (i, j) that a model box touches"""
    return [(i, j) for j in range(int(np.floor(y0 / CELL)), int(np.floor((y1 - 1e-9) / CELL)) + 1)
            for i in range(int(np.floor(x0 / CELL)), int(np.floor((x1 - 1e-9) / CELL)) + 1)]


class Grid:
    """A north-up pixel grid on model axes: pixel (u, v) has its centre at (x0 + (u + 0.5) res, y1 − (v + 0.5) res), u east, v south –
    the layout of the PNGs (brief: model (400 i + (u + 0.5) res, 400 (j + 1) − (v + 0.5) res))."""

    def __init__(self, x0, y1, res, w, h):
        self.x0, self.y1, self.res, self.w, self.h = float(x0), float(y1), float(res), int(w), int(h)

    @classmethod
    def cell(cls, i, j, res, margin=0.0):
        """the grid of cell (i, j); margin (m, a multiple of res) widens it on all sides (filters see their neighbours)"""
        n = int(round(CELL / res))
        mp = int(round(margin / res))
        return cls(400.0 * i - mp * res, 400.0 * (j + 1) + mp * res, res, n + 2 * mp, n + 2 * mp)

    @property
    def x1(self):
        return self.x0 + self.w * self.res

    @property
    def y0(self):
        return self.y1 - self.h * self.res

    def centres(self):
        """model x, y of every pixel centre (two (h, w) arrays)"""
        u = self.x0 + (np.arange(self.w) + 0.5) * self.res
        v = self.y1 - (np.arange(self.h) + 0.5) * self.res
        return np.meshgrid(u, v)

    def to_px(self, x, y):
        """model → continuous pixel coordinates (u, v); the centre of pixel (0, 0) is (0.5, 0.5)"""
        return (np.asarray(x, float) - self.x0) / self.res, (self.y1 - np.asarray(y, float)) / self.res

    def inner(self, margin_px):
        """slice of the core of a grid built with Grid.cell(..., margin)"""
        return np.s_[margin_px:self.h - margin_px, margin_px:self.w - margin_px]


# ---- PNG value: class in bits 0–4, vigour 0–7 in bits 5–7 ----
def encode(cls, vig):
    cls = np.asarray(cls)
    vig = np.clip(np.asarray(vig), 0, 7)
    if cls.min(initial=0) < 0 or cls.max(initial=0) > 31:
        raise ValueError('class out of 0..31')
    return (cls.astype(np.uint8) & 31) | (vig.astype(np.uint8) << 5)


def decode(v):
    v = np.asarray(v, np.uint8)
    return v & 31, v >> 5


def vigour_from(score, lo, hi):
    """a score (NDVI-like) mapped to 0..7 between lo (0) and hi (7)"""
    t = (np.asarray(score, float) - lo) / max(hi - lo, 1e-6)
    return np.clip(np.round(t * 7), 0, 7).astype(np.uint8)


def save_png(path, val):
    from PIL import Image
    os.makedirs(os.path.dirname(path), exist_ok=True)
    Image.fromarray(np.asarray(val, np.uint8), 'L').save(path, optimize=True)
    return os.path.getsize(path)


def load_png(path):
    from PIL import Image
    return np.asarray(Image.open(path).convert('L'))


def counts(cls):
    """pixels per class id (as str keys, only those present)"""
    c = np.bincount(np.asarray(cls, np.uint8).ravel() & 31, minlength=32)
    return {str(k): int(n) for k, n in enumerate(c) if n}


def square_box():
    """Ratscher's 2.4 km square (RATSCHER.box: the inner 10 m terrain, viz3/manifests.json geoman.terrain.inner)"""
    with open(os.path.join(REPO, 'viz3', 'manifests.json')) as fh:
        M = json.load(fh)['geoman']['terrain']['inner']
    return M['x0'], M['y0'], M['x0'] + (M['n'] - 1) * M['step'], M['y0'] + (M['n'] - 1) * M['step']


# the modelled site (garden, Hubert, Ronald, field path, brook): there the model applies, not OSM (docs/ARCHITECTURE.md §11)
SITE_ZONE = (-50.0, -52.0, 42.0, 48.0)
