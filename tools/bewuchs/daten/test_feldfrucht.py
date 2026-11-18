"""Unit tests of the crops (part d, feldfrucht.py): the rules per field and one class per field on a synthetic cell."""
import os, sys, unittest
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import gemeinsam as G  # noqa: E402
import feldfrucht as F  # noqa: E402


class Rules(unittest.TestCase):
    def test_crop_of(self):
        K = G.K
        self.assertEqual(F.crop_of(False, 0.08, 0.98, 0.10, 0.12), K['hackfrucht'])      # April: open soil
        self.assertEqual(F.crop_of(False, 0.55, 0.01, -0.20, -0.10), K['winterraps'])    # April: dense blue-green
        self.assertEqual(F.crop_of(False, 0.45, 0.10, -0.05, 0.05), K['wintergetreide'])  # April: green
        self.assertEqual(F.crop_of(False, 0.26, 0.42, 0.06, 0.10), K['acker'])           # April: thin, unclear
        self.assertEqual(F.crop_of(True, -0.02, 1.0, 0.13, 0.14), K['hackfrucht'])       # May: open soil
        self.assertEqual(F.crop_of(True, 0.30, 0.14, 0.24, 0.34), K['winterraps'])       # May: yellow
        self.assertEqual(F.crop_of(True, 0.55, 0.0, 0.05, 0.09), K['wintergetreide'])    # May: dense dark green
        self.assertEqual(F.crop_of(True, 0.38, 0.0, 0.12, 0.16, 100), K['kleegras'])     # May: pale (mown, thin sward)
        self.assertEqual(F.crop_of(True, 0.38, 0.0, 0.15, 0.18, 75), K['wintergetreide'])  # May: olive green
        self.assertEqual(F.crop_of(True, 0.20, 0.5, 0.0, 0.05), K['acker'])              # May: unclear

    def test_one_class_per_field(self):
        g = G.Grid(1000.0, 1100.0, 0.5, 200, 200)  # south of the flight line (April), away from the modelled site
        X, Y = g.centres()
        cls = np.full((200, 200), G.K['acker'], np.uint8)
        cls[:, 98:102] = G.K['ackerrand']  # two fields, a margin between them
        rng = np.random.default_rng(3)
        nd = np.where(X < 1050, 0.08, 0.55) + rng.normal(0, 0.03, X.shape)
        rgb = np.zeros((200, 200, 3), np.float32)
        rgb[X < 1050] = (180, 170, 160)  # soil
        rgb[X >= 1050] = (60, 90, 92)    # blue-green
        rgb[150:, 120:] = (60, 95, 70)   # a patch of another green inside the second field: the field's median decides
        st = F.apply(cls, nd.astype(np.float32), rgb, X, Y, '2024-04-07', None, 0.5)
        self.assertEqual(set(np.unique(cls[:, :98]).tolist()), {G.K['hackfrucht']})
        self.assertEqual(set(np.unique(cls[:, 102:]).tolist()), {G.K['winterraps']})
        self.assertEqual(st, {G.K['hackfrucht']: 1, G.K['winterraps']: 1})


if __name__ == '__main__':
    unittest.main()
