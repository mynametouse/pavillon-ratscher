"""Unit tests of the designed areas (part e, gestaltung.py): the reproducible numbers, what counts as a house, which walls face the street,
and the rules on a small synthetic cell (front beds only on lawn, a vegetable plot behind the house, a roundabout's centre)."""
import os, sys, unittest
import numpy as np
from shapely.geometry import LineString, Polygon, box
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gemeinsam as G  # noqa: E402
import gestaltung as GS  # noqa: E402


class Pure(unittest.TestCase):
    def test_h01(self):
        a = GS.h01('vorgarten', 120, -35)
        self.assertEqual(a, GS.h01('vorgarten', 120, -35))
        self.assertTrue(0 <= a < 1)
        self.assertNotEqual(a, GS.h01('vorgarten', 121, -35))
        share = np.mean([GS.h01('vorgarten', x, 7) < GS.FRONT_SHARE for x in range(2000)])
        self.assertAlmostEqual(share, GS.FRONT_SHARE, delta=0.04)

    def test_is_house(self):
        self.assertTrue(GS.is_house(box(0, 0, 10, 12), tags={'building': 'yes'}))
        self.assertFalse(GS.is_house(box(0, 0, 10, 12), tags={'building': 'garage'}))
        self.assertFalse(GS.is_house(box(0, 0, 4, 5)))            # a shed
        self.assertFalse(GS.is_house(box(0, 0, 40, 30)))          # a hall
        self.assertFalse(GS.is_house(box(0, 0, 30, 6)))           # long: a barn or a row of garages
        self.assertTrue(GS.is_house(box(0, 0, 10, 12), kind=0))
        self.assertFalse(GS.is_house(box(0, 0, 10, 12), kind=1))  # ETHOS: a barn

    def test_facing(self):
        house = box(0, 10, 10, 20)               # the street runs along y = 0, south of the house
        street = LineString([(-50, 0), (60, 0)])
        f = GS.facing(house, street)
        self.assertEqual(len(f), 1)
        a, b, n, d = f[0]
        self.assertAlmostEqual(float(n[1]), -1.0)  # the south wall, its normal towards the street
        self.assertAlmostEqual(float(d), 10.0)
        self.assertEqual(GS.facing(house, LineString([(-50, -40), (60, -40)])), [])  # too far


class Synthetic(unittest.TestCase):
    """a 40 × 40 m patch of lawn with a house, a street south of it and a roundabout"""

    def test_rules(self):
        g = G.Grid(1000.0, 1040.0, 0.5, 80, 80)
        X, Y = g.centres()
        house = box(1015, 1012, 1025, 1022)
        street = LineString([(990, 1004), (1050, 1004)])

        class Q:
            def houses_in(self, bx):
                return [house]

            def roads_in(self, bx):
                return [{'kind': 3, 'w': 5.0, 'bridge': False, 'p': np.asarray(street.coords)}]

            def areas_in(self, bx):
                return []
            roundabouts = [LineString([(1035, 1030), (1039, 1030), (1039, 1034), (1035, 1034), (1035, 1030)])]
            islands, oneways, highways = [], [], []

        cls = np.full((g.h, g.w), G.K['zierrasen'], np.uint8)
        import raster
        carr = raster.draw_lines(g, [street], 5.0).astype(bool)
        bld = raster.draw_polys(g, [house]).astype(bool)
        carr |= raster.draw_lines(g, Q.roundabouts, 1.0).astype(bool)
        cls[carr | bld] = G.K['nichts']
        ctx = {'X': X, 'Y': Y, 'carr': carr, 'bldx': bld, 'water': np.zeros_like(carr), 'bare': np.zeros_like(carr), 'use': None}
        key = (round(house.centroid.x), round(house.centroid.y))
        GS.apply(Q(), g, cls, ctx)
        beds = cls == G.K['beet']
        if GS.h01('vorgarten', *key) < GS.FRONT_SHARE:  # a bed along the south wall, between the house and the street
            self.assertTrue(beds.any())
            self.assertTrue(np.all(Y[beds] < 1012) and np.all(Y[beds] > 1010))
        else:
            self.assertFalse(beds.any())
        self.assertFalse((beds & (bld | carr)).any())
        veg = cls == G.K['gemuese']
        if veg.any():  # behind the house (north of it), on the lawn
            self.assertTrue(np.all(Y[veg] > 1022))
        self.assertTrue((cls == G.K['verkehrsgruen']).any())  # the roundabout's centre


if __name__ == '__main__':
    unittest.main()
