"""Unit tests: the hand-made data still agrees with the app, and the built maps keep the format of the brief (index, sizes, PNGs)."""
import json, os, re, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gemeinsam as G  # noqa: E402
import handdaten  # noqa: E402

SRC = os.path.join(G.REPO, 'viz3', 'src')
IDX = os.path.join(G.OUT, 'z', 'index.json')


def read(*p):
    with open(os.path.join(*p), encoding='utf-8') as fh:
        return fh.read()


class AppAgrees(unittest.TestCase):
    def test_paddock(self):  # npc/npc.js export const PAD = { x0: 19.5, x1: 34, y0: -52, y1: -33.5, … }
        s = read(SRC, 'npc', 'npc.js')
        m = re.search(r'export const PAD = \{([^}]*)\}', s)
        d = dict((k.strip(), float(v)) for k, v in re.findall(r'(\w+):\s*(-?[\d.]+)', m.group(1)))
        for k in ('x0', 'x1', 'y0', 'y1'):
            self.assertEqual(d[k], handdaten.PAD[k], k)

    def test_site_zone(self):  # garden/env.js uGeoZone (x0, x1, y0, y1): where the model, not the photo, draws the ground
        s = read(SRC, 'garden', 'env.js')
        m = re.search(r'uGeoZone: \{ value: new THREE\.Vector4\(([^)]*)\)', s)
        x0, x1, y0, y1 = (float(v) for v in m.group(1).split(','))
        self.assertEqual((x0, y0, x1, y1), G.SITE_ZONE)

    def test_tree_patches(self):  # garden/garten_heute.js: the dug patches of the young trees
        s = read(SRC, 'garden', 'garten_heute.js')
        pts = [(float(a), float(b)) for a, b in re.findall(r"\[(-?[\d.]+), (-?[\d.]+), [\d.]+, '(?:red|berry|apple|yellow)'", s)]
        pts += [(float(a), float(b)) for a, b in re.findall(r'patch\((-?[\d.]+), (-?[\d.]+), [\d.]+\);', s)]
        self.assertEqual(sorted(pts), sorted((p[0], p[1]) for p in handdaten.PFLANZFLECKEN))


@unittest.skipUnless(os.path.exists(IDX), 'maps not built')
class Built(unittest.TestCase):
    def setUp(self):
        self.idx = json.loads(read(IDX))

    def test_index(self):
        i = self.idx
        self.assertEqual(i['v'], 1)
        self.assertEqual(i['cell'], 400)
        self.assertEqual(i['classes'], G.CLASSES)
        self.assertRegex(i['stand'], r'^\d{4}-\d\d-\d\d$')
        self.assertTrue(i['quelle'])
        self.assertEqual((i['garten']['x0'], i['garten']['y0'], i['garten']['res']), (-50.0, -52.0, 0.25))

    def test_cells(self):
        tot = 0
        sq = {f'{i}_{j}' for i, j in G.cells_in(*G.square_box())}
        for key, c in self.idx['cells'].items():
            fn = os.path.join(G.OUT, 'z', key + '.png')
            self.assertTrue(os.path.exists(fn), key)
            sz = os.path.getsize(fn)
            self.assertLess(sz, 200 * 1024, key)
            self.assertIn(c['res'], (0.5, 1.0), key)
            tot += sz if key in sq else 0
            n = int(round(400 / c['res']))
            v = G.load_png(fn)
            self.assertEqual(v.shape, (n, n), key)
            cls, vig = G.decode(v)
            self.assertLessEqual(int(cls.max()), len(G.CLASSES) - 1, key)
            self.assertEqual(G.counts(cls), c['n'], key)
            self.assertEqual(sum(c['n'].values()), n * n, key)
        self.assertLess(tot, 3 * 1024 * 1024)  # Ratscher's square together under 3 MB

    def test_square_covered(self):
        keys = set(self.idx['cells'])
        for i, j in G.cells_in(*G.square_box()):
            self.assertIn(f'{i}_{j}', keys)

    def test_garden(self):
        gi = self.idx['garten']
        v = G.load_png(os.path.join(G.OUT, 'garten.png'))
        self.assertEqual(v.shape, (round(100 / gi['res']), round(92 / gi['res'])))
        cls, vig = G.decode(v)
        # the pavilion's slab (−1…6.8, −1…5) is the runtime's: lawn under it; the brook's banks are there; no class beyond the table
        u, v0 = int((2 - gi['x0']) / gi['res']), int((gi['y0'] + 100 - 2) / gi['res'])
        self.assertEqual(int(cls[v0, u]), G.K['zierrasen'])
        self.assertIn(G.K['ufer'], np.unique(cls).tolist())
        self.assertLessEqual(int(cls.max()), len(G.CLASSES) - 1)


if __name__ == '__main__':
    unittest.main()


class Roads(unittest.TestCase):
    def test_same_rules_as_build_roads(self):  # quellen.road_of keeps the rules of tools/geo/build_roads.py classify()
        import ast
        import quellen
        src = read(G.REPO, 'tools', 'geo', 'build_roads.py')
        tree = ast.parse(src)
        keep = [n for n in tree.body if (isinstance(n, ast.Assign) and any(getattr(t, 'id', '') in ('KINDS', 'KI', 'SURF', 'SI', 'SURF_OSM')
                                                                             for t in n.targets)) or (isinstance(n, ast.FunctionDef) and n.name == 'classify')]
        ns = {'np': np}
        exec(compile(ast.Module(body=keep, type_ignores=[]), 'build_roads', 'exec'), ns)
        for t in [{'highway': 'secondary'}, {'highway': 'residential', 'surface': 'sett'}, {'highway': 'track', 'tracktype': 'grade1'},
                  {'highway': 'track', 'surface': 'asphalt'}, {'highway': 'path', 'motor_vehicle': 'agricultural'}, {'highway': 'service', 'service': 'driveway'},
                  {'highway': 'footway'}, {'highway': 'unclassified', 'width': '4,5 m'}, {'highway': 'motorway_link', 'bridge': 'yes'},
                  {'highway': 'path', 'surface': 'concrete'}, {'highway': 'steps'}, {'highway': 'tertiary', 'width': '30'}]:
            a, b = ns['classify'](t), quellen.road_of(t)
            if a is None:
                self.assertIsNone(b, t)
                continue
            self.assertEqual((a[0], a[1], round(a[2], 2), bool(a[3] & 1)), (b[0], b[1], round(b[2], 2), b[3]), t)


class Areas(unittest.TestCase):
    def test_korridor(self):
        import gebiete
        sq = set(G.cells_in(*G.square_box()))
        c = gebiete.korridor()
        keys = {(i, j) for i, j, r in c}
        self.assertFalse(keys & sq)
        self.assertTrue({r for i, j, r in c} <= {0.5, 1.0})
        for z in gebiete.zones().values():  # the town zones are all in, at 0.5 m
            for k in G.cells_in(*z):
                if k not in sq:
                    self.assertIn((k[0], k[1], 0.5), c)

