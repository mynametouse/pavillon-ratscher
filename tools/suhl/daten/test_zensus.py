#!/usr/bin/env python3
"""Tests of the census step (package S2-9): cutting a grid file to Suhl, reading cells, distributing residents, sums - with invented
numbers, no network:   python3 -I tools/suhl/daten/test_zensus.py"""
import os, shutil, sys, tempfile, unittest, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
sys.path.insert(0, HERE)
import suhllib as S        # noqa: E402
import beispiel            # noqa: E402
import viertel as V        # noqa: E402
import zahlen as Z         # noqa: E402
import zensus as C         # noqa: E402

CX, CY = S.census_cell(*S.CENTRE_UTM)            # the census cell of the Markt


def grid_doc(theme, cols, rows):
    """a <theme>.json as cut() writes it; rows = [(column, row, values...)]"""
    return {'thema': theme, 'quelle': 'erfunden', 'lizenz': 'erfunden', 'abruf': '2026-11-13', 'spalten': ['GITTER_ID_100m', 'x_mp_100m', 'y_mp_100m'] + cols,
            'x': 1, 'y': 2, 'cells': [[S.census_cell_id(c, r), str(c * 100 + 50), str(r * 100 + 50)] + [str(v) for v in vals] for c, r, *vals in rows]}


class Cutting(unittest.TestCase):
    def test_numbers_and_missing_values(self):
        self.assertEqual([C.num(v) for v in ('3', '12,5', ' 7 ', '–', '-', '', '.', None, 'x')], [3.0, 12.5, 7.0, None, None, None, None, None, None])

    def test_cut_keeps_the_cells_of_suhl_only(self):
        tmp = tempfile.mkdtemp(prefix='suhl-zensus-')
        try:
            lines = ['GITTER_ID_100m;x_mp_100m;y_mp_100m;Einwohner']
            for i in range(1200):                                   # Germany far away from Suhl
                lines.append(f'{S.census_cell_id(41000 + i, 27000)};{4100050 + i * 100};2700050;{3 + i % 40}')
            zx, zy = S.laea_from_lonlat(10.6667, 50.6592)            # Zella-Mehlis: a neighbour, not Suhl
            near = [(CX, CY, 25), (CX + 1, CY, 4), (CX, CY + 3, '–'), (int(zx // 100), int(zy // 100), 99)]
            for c, r, v in near:
                lines.append(f'{S.census_cell_id(c, r)};{c * 100 + 50};{r * 100 + 50};{v}')
            zp = os.path.join(tmp, 'Zensus2022_Test.zip')
            with zipfile.ZipFile(zp, 'w', zipfile.ZIP_DEFLATED) as z:
                z.writestr('Zensus2022_Test_1km-Gitter.csv', 'GITTER_ID_1km;x_mp_1km;y_mp_1km;Einwohner\n')
                z.writestr('Zensus2022_Test_100m-Gitter.csv', '\n'.join(lines) + '\n')
            doc = C.cut(zp, 'einwohner', log=lambda *a: None)
            self.assertEqual(doc['zellen'], 3)
            self.assertEqual(doc['zeilen_gelesen'], 1204)
            self.assertEqual(doc['spalten'], ['GITTER_ID_100m', 'x_mp_100m', 'y_mp_100m', 'Einwohner'])
            self.assertEqual(sorted(r[3] for r in doc['cells']), ['25', '4', '–'])       # the value the census does not show stays as it is
            S.write_json(os.path.join(tmp, 'einwohner.json'), doc)
            g = C.Grid(os.path.join(tmp, 'einwohner.json'))
            self.assertEqual(g.cells[(CX, CY)], {'Einwohner': 25.0})
            self.assertEqual(g.cells[(CX, CY + 3)], {'Einwohner': None})
            self.assertEqual(g.at(*S.CENTRE_UTM), {'Einwohner': 25.0})
            with zipfile.ZipFile(zp, 'w') as z:
                z.writestr('x_100m-Gitter.csv', 'GITTER_ID_100m;x_mp_100m;y_mp_100m;Einwohner\n1;2;3;4\n')
            with self.assertRaises(SystemExit):                      # a handful of rows is not a grid of Germany
                C.cut(zp, 'einwohner', log=lambda *a: None)
        finally:
            shutil.rmtree(tmp, ignore_errors=True)


class Distributing(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.Q = V.build()
        cls.fr = S.tile_frame(10, 497, 542)

    def setUp(self):
        self.tmp = tempfile.mkdtemp(prefix='suhl-zensus-')

    def tearDown(self):
        shutil.rmtree(self.tmp, ignore_errors=True)

    def house_at(self, bid, col, row, dx=50.0, dy=50.0, length=14.0, **extra):
        """an invented house whose middle lies dx, dy metres from the south-west corner of the census cell (col, row)"""
        E, N = S.utm_from_laea(col * 100 + dx, row * 100 + dy)
        x, y = self.fr.from_utm(E, N)
        b = beispiel.house(self.fr, bid, x, y, length, 9.0, 30.0, 6.2, 42.0, bt='efh', **extra)
        d, ex = Z.numbers(b, self.fr, self.Q)
        return (497, 542), d, ex

    def write(self, theme, cols, rows):
        S.write_json(os.path.join(self.tmp, theme + '.json'), grid_doc(theme, cols, rows))

    def test_residents_follow_the_housing_floor_area(self):
        small = self.house_at('A', CX, CY, 30, 30)
        big = self.house_at('B', CX, CY, 70, 70, lv=4)
        shed = self.house_at('C', CX, CY, 50, 80, k=2, use='neben')
        alone = self.house_at('D', CX + 2, CY)
        office = self.house_at('E', CX + 4, CY, use='buero')
        hidden = self.house_at('F', CX + 6, CY)
        self.write('einwohner', ['Einwohner'], [(CX, CY, 30), (CX + 2, CY, 5), (CX + 4, CY, 8), (CX + 6, CY, '–'), (CX + 1, CY + 1, 12)])
        exs = [small, big, shed, alone, office, hidden]
        A = C.apply(self.tmp, exs, self.Q, log=lambda *a: None)
        wa, wb = C.housing_weight(small[1], small[2]), C.housing_weight(big[1], big[2])
        self.assertAlmostEqual(small[1]['res'], 30 * wa / (wa + wb), delta=0.06)
        self.assertAlmostEqual(big[1]['res'], 30 * wb / (wa + wb), delta=0.06)
        self.assertAlmostEqual(small[1]['res'] + big[1]['res'], 30, delta=0.11)       # the cell's residents, nothing invented
        self.assertEqual(small[1]['q']['res'], 1)
        self.assertNotIn('res', shed[1])                                              # nobody lives in the shed
        self.assertEqual(alone[1]['res'], 5.0)
        self.assertEqual((office[1]['res'], office[1]['q']['res']), (8.0, 0))         # no dwelling house in the cell: an assumption, q 0
        self.assertNotIn('res', hidden[1])                                            # the census shows no value: it stays unknown
        self.assertEqual(A.unassigned, {(CX + 1, CY + 1): 12.0})                          # residents without a building are counted, not dropped
        nr = self.Q.by_id['mitte']['nr']
        self.assertEqual({ex['nr'] for _, _, ex in exs} | {A.nr[(CX + 1, CY + 1)]}, {nr})      # all of this lies in Suhl-Mitte
        j = A.quarter(nr)
        self.assertAlmostEqual(j['residents']['model'], 30 + 5 + 8 + 12, delta=0.2)
        self.assertEqual(j['residents']['unassigned'], 12)
        self.assertEqual(j['census']['residents'], 55)
        self.assertEqual(j['census']['cells'], 4)
        self.assertIn('Schätzung', j['residents']['how'])

    def test_a_long_block_counts_in_every_cell_it_reaches(self):
        block = self.house_at('L', CX, CY, 100.0, 50.0, length=60.0, lv=5)            # across the edge between two cells
        sh = C.cell_shares(block[2]['ring'], (block[2]['E'], block[2]['N']))
        self.assertEqual(len(sh), 2)
        self.assertAlmostEqual(sum(sh.values()), 1.0, places=6)
        self.assertTrue(all(0.3 < v < 0.7 for v in sh.values()), sh)
        self.write('einwohner', ['Einwohner'], [(k[0], k[1], 20) for k in sh])
        C.apply(self.tmp, [block], self.Q, log=lambda *a: None)
        self.assertEqual(block[1]['res'], 40.0)                                       # both cells' residents live in the one block

    def test_classes_are_summed_as_shown_never_completed(self):
        h = self.house_at('A', CX, CY)
        self.write('einwohner', ['Einwohner'], [(CX, CY, 20)])
        self.write('energietraeger', ['Insgesamt_Energietraeger', 'Gas', 'Heizoel', 'Biomasse_Biogas', 'Fernwaerme'], [(CX, CY, 10, 4, '–', '–', 3)])
        self.write('alter', ['Insgesamt_Bevoelkerung', 'Unter18', 'a18bis29', 'a30bis49', 'a50bis64', 'a65undaelter'], [(CX, CY, 20, '–', '–', 6, 5, 7)])
        self.write('wohnungen', ['Insgesamt_Wohnungen', 'FreiEFH'], [(CX, CY, 10, 10), (CX + 1, CY, 30, '–')])
        self.write('leerstand', ['Leerstandsquote', 'werterlaeuternde_Zeichen'], [(CX, CY, '20,0', ''), (CX + 1, CY, '–', '')])
        A = C.apply(self.tmp, [h], self.Q, log=lambda *a: None)
        self.assertEqual(h[1]['heat']['k'], 'gas')
        self.assertEqual(h[1]['heat']['p'], 0.4)                    # 4 of the 10 buildings of the cell
        self.assertEqual(h[1]['q']['heat'], 0)                      # below 0.6: an assumption
        self.assertIn('d', h[1]['heat'])                            # the demand by rule stays
        c = A.quarter(self.Q.by_id['mitte']['nr'])['census']
        self.assertEqual(c['heatBy'], {'gas': 4, 'fern': 3, 'shown': 7})                 # 7 shown of 10 - the rest is NOT filled in
        self.assertEqual(c['age'], {'30_49': 6, '50_64': 5, '65plus': 7, 'shown': 18, 'share65': 0.389, 'shareU18': 0.0})
        self.assertEqual((c['dwellings'], c['vacantShown'], c['vacancyMin']), (40, 2, 0.05))   # a lower bound: 2 of 40

    def test_without_population_grid_nothing_is_written(self):
        h = self.house_at('A', CX, CY)
        self.assertIsNone(C.apply(self.tmp, [h], self.Q, log=lambda *a: None))
        self.assertNotIn('res', h[1])


if __name__ == '__main__':
    unittest.main(verbosity=1)
