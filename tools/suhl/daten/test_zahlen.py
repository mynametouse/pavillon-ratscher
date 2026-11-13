#!/usr/bin/env python3
"""Tests of the scenario numbers (package S2-9): quarters, geometry in UTM, roof planes, the solar rule, a whole run on the invented
example. No network, a few seconds:   python3 -I tools/suhl/daten/test_zahlen.py"""
import math, os, shutil, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
sys.path.insert(0, HERE)
import suhllib as S        # noqa: E402
import schema              # noqa: E402
import beispiel            # noqa: E402
import viertel as V        # noqa: E402
import zahlen as Z         # noqa: E402


class Quarters(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.Q = V.build()

    def test_raster_covers_the_municipality(self):
        Q = self.Q
        km2 = sum(Q.n_cells.values()) / 100.0
        self.assertTrue(141.0 < km2 < 142.6, km2)                    # the city: 141.62 km2
        self.assertEqual(len(Q.q), 17)
        self.assertTrue(all(Q.n_cells[q['nr']] > 0 for q in Q.q))
        self.assertEqual(sum(q['einwohner'] for q in Q.q), 36999)    # docs/plans/suhl/stadt.md

    def test_lookups(self):
        Q = self.Q
        self.assertEqual(Q.at(*S.CENTRE_UTM)['id'], 'mitte')
        self.assertEqual(Q.nr_at(600000.0, 5600000.0), 0)            # far outside
        self.assertEqual(Q.at(626458.0, 5615656.0)['id'], 'gehlberg')
        self.assertEqual(Q.at(628390.0, 5607866.0)['id'], 'schmiedefeld')
        self.assertEqual(Q.at(612680.0, 5606798.0)['id'], 'dietzhausen')
        # the two districts with a border of OpenStreetMap keep its area
        self.assertAlmostEqual(Q.area_km2(Q.by_id['gehlberg']['nr']), 20.62, delta=0.3)
        self.assertAlmostEqual(Q.area_km2(Q.by_id['schmiedefeld']['nr']), 18.26, delta=0.3)

    def test_outline_and_raster_json(self):
        Q = self.Q
        j = Q.quarter_json(Q.by_id['mitte'])
        self.assertEqual(j['outline']['q'], 0)                       # an assumption, and it says so
        self.assertEqual(Q.quarter_json(Q.by_id['gehlberg'])['outline']['q'], 2)
        ring = j['poly'][0]
        self.assertGreaterEqual(len(ring), 4)
        area = abs(sum(ring[i][0] * ring[(i + 1) % len(ring)][1] - ring[(i + 1) % len(ring)][0] * ring[i][1] for i in range(len(ring)))) / 2e6
        self.assertAlmostEqual(area, j['area'], delta=0.25 * j['area'])       # simplified, so only roughly
        R = V.from_raster(Q.raster_json())
        self.assertEqual(bytes(R.cells), bytes(Q.cells))
        self.assertEqual(R.nr_at(*S.CENTRE_UTM), Q.nr_at(*S.CENTRE_UTM))


class Geometry(unittest.TestCase):
    def test_area_and_centre_with_utm_numbers(self):
        E, N = S.CENTRE_UTM
        sq = [(E, N), (E + 10, N), (E + 10, N + 10), (E, N + 10)]
        self.assertAlmostEqual(Z.ring_area(sq), 100.0, places=6)
        self.assertAlmostEqual(Z.ring_area(sq[::-1]), -100.0, places=6)
        cx, cy = Z.ring_centroid(sq)
        self.assertAlmostEqual(cx, E + 5, places=5)
        self.assertAlmostEqual(cy, N + 5, places=5)
        sliver = [(E, N), (E + 30, N), (E + 30, N + 0.001), (E, N + 0.001)]      # no area: the mean of the points
        cx, cy = Z.ring_centroid(sliver)
        self.assertAlmostEqual(cx, E + 15, places=3)
        bow = [(E, N), (E + 10, N + 10), (E + 10, N), (E, N + 10.2)]             # crosses itself: stays near its points
        cx, cy = Z.ring_centroid(bow)
        self.assertTrue(E - 1 <= cx <= E + 11 and N - 1 <= cy <= N + 11, (cx - E, cy - N))

    def test_irradiation_and_direction(self):
        self.assertEqual(Z.irradiation(180, 30), 100)
        self.assertEqual(Z.irradiation(None, 0), 87)
        self.assertEqual(Z.irradiation(0, 40), 53)
        self.assertEqual(Z.irradiation(90, 30), 84)
        self.assertEqual(Z.irradiation(270, 30), 84)
        self.assertTrue(Z.irradiation(180, 35) > Z.irradiation(135, 35) > Z.irradiation(90, 35) > Z.irradiation(45, 35) > Z.irradiation(0, 35))
        self.assertEqual([Z.direction(a) for a in (0, 359, 22.4, 22.6, 90, 135, 180, 225, 270, 315, 337.6)],
                         ['N', 'N', 'N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW', 'N'])


class OneBuilding(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.Q = V.build()
        cls.fr = S.tile_frame(10, 497, 542)

    def house(self, az=30.0, pitch=42.0, **extra):
        return beispiel.house(self.fr, 'TEST_1', 20.0, -30.0, 14.0, 9.0, az, 6.2, pitch, bt='efh', **extra)

    def test_areas_are_true_square_metres(self):
        b = self.house()
        d, ex = Z.numbers(b, self.fr, self.Q)
        fa = 14.0 * 9.0 * S.MODEL_SCALE ** 2                        # the file holds model metres, the numbers are true metres
        self.assertAlmostEqual(ex['fa'], fa, delta=0.001 * fa)      # the example rounds its corners to centimetres
        self.assertEqual(d['lv'], b['lv'])
        self.assertAlmostEqual(d['gfa'], fa * b['lv'], delta=1.0)
        self.assertEqual(d['vt'], self.Q.by_id['mitte']['nr'])
        self.assertAlmostEqual(d['rf'], sum(f['a'] for f in b['R']), delta=0.3)
        rise = b['h'] - b['e']
        self.assertAlmostEqual(d['vol'], fa * (b['e'] + rise / 2), delta=0.01 * d['vol'])       # a gable roof: half the rise
        self.assertEqual(d['q']['pv'], 0)                            # the roof is a rule here (rq 0)
        self.assertEqual(len(d['R']), 2)
        self.assertEqual(len(d['R'][0]), len(schema.R_COLS))

    def test_directions_are_from_true_north(self):
        # ridge along model azimuth 30: the planes face model 120 and 300; true north is 3.05 degrees less
        d, _ = Z.numbers(self.house(az=30.0), self.fr, self.Q)
        shift = -S.MODEL_TURN_DEG + S.convergence_deg(*self.fr.centre_utm)
        self.assertAlmostEqual(shift, -3.05, delta=0.03)
        got = sorted(r[2] for r in d['R'])
        self.assertAlmostEqual(got[0], 120 + shift, delta=0.6)       # rows hold whole degrees
        self.assertAlmostEqual(got[1], 300 + shift, delta=0.6)
        self.assertEqual({r[3] for r in d['R']}, {42})

    def test_overhang_of_the_mesh_is_not_counted(self):
        b = self.house()
        plain, _ = Z.numbers(b, self.fr, self.Q)
        # push the eave points of the mesh 0.5 m outwards and down the slope, as the meshes of g do
        import copy
        o = copy.deepcopy(b)
        a = math.radians(30.0)
        vx, vy = math.cos(a), -math.sin(a)                           # across the ridge
        drop = 0.5 * S.MODEL_SCALE * math.tan(math.radians(42.0))
        for i in range(len(o['rv']) // 3):
            if abs(o['rv'][3 * i + 2] - o['e']) < 1e-6:
                side = 1 if (o['rv'][3 * i] - 20.0) * vx + (o['rv'][3 * i + 1] + 30.0) * vy > 0 else -1
                o['rv'][3 * i] += side * 0.5 * vx
                o['rv'][3 * i + 1] += side * 0.5 * vy
                o['rv'][3 * i + 2] -= drop
        over, ex = Z.numbers(o, self.fr, self.Q)
        self.assertTrue(ex['mesh_ok'])
        self.assertEqual([r[0] for r in over['R']], [r[0] for r in plain['R']])       # the areas g gives, without overhang
        self.assertEqual([r[2] for r in over['R']], [r[2] for r in plain['R']])
        self.assertAlmostEqual(over['vol'], plain['vol'], delta=0.02 * plain['vol'])

    def test_solar_rule(self):
        d, _ = Z.numbers(self.house(az=90.0, pitch=40.0), self.fr, self.Q)        # ridge east-west: one plane south, one north
        south = next(r for r in d['R'] if 150 < r[2] < 210)
        north = next(r for r in d['R'] if r[2] < 30 or r[2] > 330)
        self.assertGreaterEqual(south[7], 99)
        self.assertLess(north[7], Z.RULES['pv_ir_min'])
        self.assertAlmostEqual(south[5], 0.7 * south[0], delta=0.2)
        self.assertAlmostEqual(d['pv'], south[6], delta=0.11)        # only the south plane counts
        self.assertAlmostEqual(d['ru'], south[5], delta=0.11)
        b = self.house(az=90.0, pitch=40.0)
        b['bt'] = 'laube'
        hut, _ = Z.numbers(b, self.fr, self.Q)
        self.assertNotIn('pv', hut)
        gone = self.house(fg=32)
        self.assertEqual(Z.numbers(gone, self.fr, self.Q), (None, None))            # no longer standing: no numbers

    def test_storeys_by_rule(self):
        b = self.house()
        del b['lv']
        d, _ = Z.numbers(b, self.fr, self.Q)
        self.assertEqual((d['lv'], d['q']['lv']), (2, 0))            # eave 6.2 m / 2.9 m
        b['use'], b['k'] = 'neben', 2
        d, _ = Z.numbers(b, self.fr, self.Q)
        self.assertEqual(d['lv'], 1)
        self.assertNotIn('heat', d)


class WholeRun(unittest.TestCase):
    def test_example_set_gives_a_valid_product(self):
        tmp = tempfile.mkdtemp(prefix='suhl-zahlen-')
        try:
            beispiel.write(tmp)
            out = os.path.join(tmp, 'aus', 'suhl', 'd', 'v3')
            rep = Z.run(os.path.join(tmp, 'suhl', 'g', 'v0'), out, 3, area='probe', quiet=True, min_buildings=1)
            self.assertEqual(rep['buildings'], 3)
            r = schema.Report()
            schema.check_product(out, r, probe=True)
            self.assertTrue(r.ok(strict=True), (r.errors[:5], r.warnings[:5]))
            v = S.read_json(os.path.join(out, 'viertel.json'))
            self.assertTrue(v['partial'])
            self.assertEqual(len(v['viertel']), 17)
            mitte = next(q for q in v['viertel'] if q['id'] == 'mitte')
            self.assertEqual(mitte['buildings'], 3)
            self.assertFalse(mitte['complete'])
            self.assertEqual(mitte['official']['residents'], 5943)
            self.assertIsNone(mitte['pvKwpToday'])                   # not known, and the file says so
            self.assertEqual(sorted(mitte['tiles']), ['496/542', '497/542'])
            idx = S.read_json(os.path.join(out, 'index.json'))
            self.assertEqual(idx['based_on'], {'g': 0})
            self.assertEqual(idx['fields']['R'], list(schema.R_COLS))
            ids = {a['id'] for a in v['meta']['annahmen']}
            self.assertTrue({'flaeche', 'richtung', 'solar_leistung', 'waerme', 'viertel', 'zensus'} <= ids)
            self.assertNotIn('{', ' '.join(a['text'] for a in v['meta']['annahmen']))      # every number filled in
        finally:
            shutil.rmtree(tmp, ignore_errors=True)

    def test_guard_refuses_a_wrong_folder(self):
        tmp = tempfile.mkdtemp(prefix='suhl-zahlen-')
        try:
            beispiel.write(tmp)
            with self.assertRaises(SystemExit):                      # three buildings are not a city
                Z.run(os.path.join(tmp, 'suhl', 'g', 'v0'), os.path.join(tmp, 'aus', 'suhl', 'd', 'v1'), 1, area='stadt', quiet=True)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


if __name__ == '__main__':
    unittest.main(verbosity=1)
