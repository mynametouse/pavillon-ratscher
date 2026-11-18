"""Unit tests of the pure parts (no network, no orthophoto):  python3 -m unittest discover -s tools/bewuchs/daten -p 'test_*.py'"""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gemeinsam as G  # noqa: E402


class Frame(unittest.TestCase):
    def test_origin_and_round_trip(self):
        E, N = G.m2u(0, 0)
        self.assertAlmostEqual(float(E), G.EX, places=6)
        self.assertAlmostEqual(float(N), G.EY, places=6)
        x, y = np.array([-1031.6, 0, 1368.4, 250.25]), np.array([-1335.6, 0, 1064.4, -108.5])
        x2, y2 = G.u2m(*G.m2u(x, y))
        self.assertTrue(np.allclose(x, x2, atol=1e-6) and np.allclose(y, y2, atol=1e-6))

    def test_scale_and_turn(self):  # 100 model metres east are 101.57 m in UTM, turned 4.36° to the north
        E0, N0 = G.m2u(0, 0)
        E1, N1 = G.m2u(100, 0)
        self.assertAlmostEqual(float(np.hypot(E1 - E0, N1 - N0)), 101.57, places=1)
        self.assertAlmostEqual(float(np.degrees(np.arctan2(N1 - N0, E1 - E0))), 4.36, places=1)


class Cells(unittest.TestCase):
    def test_keys(self):
        self.assertEqual(G.cell_of(0, 0), '0_0')
        self.assertEqual(G.cell_of(-0.1, 399.9), '-1_0')
        self.assertEqual(G.cell_of(-1031.6, -1335.6), '-3_-4')
        self.assertEqual(G.cell_of(400, -400), '1_-1')

    def test_cells_in_square(self):
        c = G.cells_in(-1031.62, -1335.58, 1368.38, 1064.42)
        self.assertEqual(len(c), 49)
        self.assertEqual(min(c), (-3, -4))
        self.assertEqual(max(c), (3, 2))

    def test_pixel_centres(self):  # brief: centre of pixel (u, v) is (400 i + (u + 0.5) res, 400 (j + 1) − (v + 0.5) res)
        g = G.Grid.cell(-2, 1, 0.5)
        X, Y = g.centres()
        self.assertEqual(X.shape, (800, 800))
        self.assertAlmostEqual(X[0, 0], -800 + 0.25)
        self.assertAlmostEqual(Y[0, 0], 800 - 0.25)
        self.assertAlmostEqual(X[5, 7], -800 + 7.5 * 0.5)
        self.assertAlmostEqual(Y[5, 7], 800 - 5.5 * 0.5)
        u, v = g.to_px(X[5, 7], Y[5, 7])
        self.assertEqual((int(u), int(v)), (7, 5))

    def test_margin(self):
        g = G.Grid.cell(0, 0, 0.5, 10)
        self.assertEqual((g.w, g.h), (840, 840))
        self.assertAlmostEqual(g.x0, -10)
        self.assertAlmostEqual(g.y1, 410)
        X, Y = g.centres()
        core = g.inner(20)
        self.assertAlmostEqual(X[core][0, 0], 0.25)
        self.assertAlmostEqual(Y[core][0, 0], 399.75)


class Coding(unittest.TestCase):
    def test_classes_fixed(self):  # ids of the brief docs/plans/auftraege/bewuchs-daten.md; 19–22 the crops (part d, lead 18.11.)
        self.assertEqual(G.CLASSES, ['nichts', 'zierrasen', 'oeffentlich', 'bankett', 'maehwiese', 'weide', 'streuobst', 'saum', 'ufer', 'acker',
                                     'ackerrand', 'waldboden', 'gebuesch', 'beet', 'gemuese', 'verkehrsgruen', 'friedhof', 'sportrasen',
                                     'reserviert', 'wintergetreide', 'winterraps', 'hackfrucht', 'kleegras'])
        self.assertEqual(set(G.COLOURS), set(range(len(G.CLASSES))))
        self.assertEqual(set(G.NAMES_DE), set(range(len(G.CLASSES))))

    def test_encode_decode(self):
        cls = np.array([[0, 1, 17], [31, 9, 4]])
        vig = np.array([[0, 7, 3], [5, 9, -2]])  # out of range vigour is clipped to 0..7
        v = G.encode(cls, vig)
        self.assertEqual(v.dtype, np.uint8)
        self.assertEqual(v.tolist(), [[0, 1 + 224, 17 + 96], [31 + 160, 9 + 224, 4]])
        c2, g2 = G.decode(v)
        self.assertEqual(c2.tolist(), cls.tolist())
        self.assertEqual(g2.tolist(), [[0, 7, 3], [5, 7, 0]])
        with self.assertRaises(ValueError):
            G.encode(np.array([32]), np.array([0]))

    def test_vigour(self):
        self.assertEqual(G.vigour_from([0.1, 0.2, 0.45, 0.7, 0.9], 0.2, 0.7).tolist(), [0, 0, 4, 7, 7])

    def test_counts(self):
        self.assertEqual(G.counts(np.array([[1, 1, 4], [4, 4, 0]], np.uint8) | (3 << 5)), {'0': 1, '1': 2, '4': 3})


if __name__ == '__main__':
    unittest.main()
