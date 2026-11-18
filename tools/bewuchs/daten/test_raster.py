"""Unit tests: shapes drawn into masks, the road raster (carriageway, edge distance, kind), the brook's offsets of the garden map."""
import os, sys, unittest
import numpy as np
from shapely.geometry import LineString, Polygon
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gemeinsam as G  # noqa: E402
import raster  # noqa: E402


class Shapes(unittest.TestCase):
    def setUp(self):
        self.g = G.Grid(0, 100, 0.5, 200, 200)  # x 0…100, y 0…100

    def test_square(self):
        m = raster.draw_polys(self.g, [Polygon([(10, 10), (30, 10), (30, 20), (10, 20)])])
        self.assertEqual(int(m.sum()), 40 * 20)  # 20 × 10 m at 0.5 m
        u, v = self.g.to_px(20, 15)
        self.assertEqual(m[int(v), int(u)], 1)
        u, v = self.g.to_px(5, 15)
        self.assertEqual(m[int(v), int(u)], 0)

    def test_hole(self):
        p = Polygon([(0, 0), (40, 0), (40, 40), (0, 40)], [[(10, 10), (30, 10), (30, 30), (10, 30)]])
        m = raster.draw_polys(self.g, [p])
        self.assertAlmostEqual(m.sum() * 0.25, 1600 - 400, delta=40)

    def test_line_width(self):
        m = raster.draw_lines(self.g, [LineString([(10, 50), (90, 50)])], 4.0)
        self.assertAlmostEqual(m.sum() * 0.25, 80 * 4 + np.pi * 4, delta=12)  # 80 m × 4 m plus round ends

    def test_disc(self):
        m = raster.disc_mask(self.g, [(50, 50), (20, 80)], [3.0, 1.0])
        self.assertAlmostEqual(m.sum() * 0.25, np.pi * 9 + np.pi * 1, delta=2.5)


class Roads(unittest.TestCase):
    def test_edge_and_kind(self):
        import klassen

        class Q:  # a straight county road, 6 m wide, and a track crossing it
            roads = [{'kind': 2, 'surf': 0, 'w': 6.0, 'bridge': False, 'p': np.array([[0.0, 50.0], [100.0, 50.0]])},
                     {'kind': 6, 'surf': 4, 'w': 3.0, 'bridge': False, 'p': np.array([[50.0, 0.0], [50.0, 50.0]])}]
        g = G.Grid(0, 100, 0.5, 200, 200)
        carr, edge, kind = klassen.roads_raster(Q, g)
        at = lambda x, y: tuple(int(a) for a in g.to_px(x, y))[::-1]  # noqa: E731
        self.assertTrue(carr[at(20, 50)])
        self.assertTrue(carr[at(20, 52.8)])
        self.assertFalse(carr[at(20, 53.4)])
        self.assertAlmostEqual(edge[at(20, 55.1)], 2.0, delta=0.5)  # 5 m from the centre line = 2 m beyond the edge
        self.assertEqual(kind[at(20, 56)], 2)
        self.assertEqual(kind[at(53.5, 20)], 6)
        self.assertEqual(len(klassen.VERGE), 9)  # one width per road kind of world/roads.js


class Brook(unittest.TestCase):
    def test_across(self):
        import garten
        app = {'stream': {'U': [1.0, 0.0], 'N': [0.0, -1.0], 'P1': [0.0, 0.0], 'line': [[-100, 4.6, 0, 0], [100, 4.6, 0, 0]]}}
        a, t, o = garten.brook_across(app, np.array([10.0, 10.0]), np.array([-4.6, -6.85]))
        self.assertTrue(np.allclose(a, [0.0, 2.25]))
        self.assertTrue(np.allclose(t, [10.0, 10.0]))


if __name__ == '__main__':
    unittest.main()
