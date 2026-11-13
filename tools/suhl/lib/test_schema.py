#!/usr/bin/env python3
"""Unit tests of the schemas and the validator (no network, a few seconds):  python3 -I tools/suhl/lib/test_schema.py"""
import copy, filecmp, json, os, shutil, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import suhllib as S   # noqa: E402
import schema         # noqa: E402
import beispiel       # noqa: E402
import validate       # noqa: E402

REPO = S.REPO
DOC = os.path.join(REPO, 'docs', 'features', 'suhl-daten.md')


class Base(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp(prefix='suhl-schema-')
        beispiel.write(self.root)
        self.gt = os.path.join(self.root, 'suhl', 'g', 'v0', '10', '497', '542.json')

    def tearDown(self):
        shutil.rmtree(self.root)

    def kinds(self, rep):
        return {k for (e, k), n in rep.count.items() if e}

    def building(self, **patch):
        """the report for the first example building with fields replaced (None = removed)"""
        doc = S.read_json(self.gt)
        b = copy.deepcopy(doc['b'][0])
        for k, v in patch.items():
            if v is None:
                b.pop(k, None)
            else:
                b[k] = v
        rep = schema.Report()
        schema.check_building(b, S.tile_frame(10, 497, 542), rep, 'test')
        return rep

    def rewrite(self, rel, fn):
        p = os.path.join(self.root, rel)
        d = S.read_json(p)
        fn(d)
        S.write_json(p, d)


class Example(Base):
    def test_example_is_valid(self):
        rep = validate.validate(self.root)
        self.assertEqual((rep.errors, rep.warnings), ([], []))
        self.assertEqual(rep.stats['g: buildings'], 3)
        self.assertEqual(rep.stats['b: trees'], 3)
        rep = validate.validate(self.root, probe=True)
        self.assertTrue(rep.ok(strict=True), rep.errors)
        for t in (os.path.join(self.root, 'suhl'), os.path.join(self.root, 'suhl', 'g'), os.path.join(self.root, 'suhl', 'g', 'v0'), self.gt,
                  os.path.join(self.root, 'suhl', 'g', 'v0', 'index.json'), os.path.join(self.root, 'suhl', 'aktuell.json')):
            self.assertTrue(validate.validate(t).ok(strict=True), t)

    def test_committed_example_is_current(self):
        d = os.path.join(HERE, 'beispiel')
        self.assertTrue(os.path.isdir(d), 'tools/suhl/lib/beispiel is missing: python3 -I tools/suhl/lib/beispiel.py')
        for base, _, files in os.walk(self.root):
            for fn in files:
                rel = os.path.relpath(os.path.join(base, fn), self.root)
                self.assertTrue(os.path.exists(os.path.join(d, rel)) and filecmp.cmp(os.path.join(base, fn), os.path.join(d, rel), shallow=False),
                                f'{rel} differs: python3 -I tools/suhl/lib/beispiel.py')

    def test_example_numbers_are_true_metres(self):
        b = S.read_json(self.gt)['b'][0]
        self.assertAlmostEqual(b['d']['fa'], 14.0 * 9.0 * S.MODEL_SCALE ** 2, places=1)          # 130.0 m2 in UTM, 126.0 in the model
        self.assertAlmostEqual(sum(f['ap'] for f in b['R']), b['d']['fa'], places=1)
        self.assertAlmostEqual(abs(b['R'][0]['az'] - b['R'][1]['az']), 180.0, places=1)
        self.assertAlmostEqual(b['R'][0]['az'], (30 + 90 - 4.3566 + 1.308) % 360, places=1)    # model -> true north

    def test_doc_names_every_field(self):
        self.assertTrue(os.path.exists(DOC), 'docs/features/suhl-daten.md is missing')
        txt = S.read_bytes(DOC).decode('utf-8')
        for f in schema.BUILDING_FIELDS:
            self.assertIn(f'`{f[0]}`', txt, f'docs/features/suhl-daten.md does not name the building field {f[0]}')
        for word in ('aktuell.json', 'index.json', 'validate.py', 'suhl-publish', 'DATEN_TOKEN', 'EASYGEODATA_KEY', 'based_on'):
            self.assertIn(word, txt)


class Building(Base):
    def test_valid(self):
        self.assertTrue(self.building().ok(strict=True))

    def test_required(self):
        for k in ('id', 'f', 'k', 'h', 'e', 'r', 'rq', 'rk', 'rc', 'rv', 'rt', 'F', 'q'):
            self.assertIn('missing ' + k, self.kinds(self.building(**{k: None})), k)
        for k in ('z0', 'az', 'R', 'S', 'd', 'use', 'era', 'n', 'adr', 'lv', 'src'):
            self.assertEqual(self.building(**{k: None}).n_errors(), 0, k)

    def test_frame_and_rings(self):
        b = S.read_json(self.gt)['b'][0]
        fr = S.tile_frame(10, 497, 542)
        absolute = [v + (fr.o[0] if i % 2 == 0 else fr.o[1]) for i, v in enumerate(b['f'])]
        self.assertIn('f frame', self.kinds(self.building(f=absolute)))
        cw = [c for k in range(len(b['f']) // 2 - 1, -1, -1) for c in b['f'][2 * k:2 * k + 2]]
        self.assertIn('f orientation', self.kinds(self.building(f=cw)))
        self.assertIn('f closed', self.kinds(self.building(f=b['f'] + b['f'][:2])))
        self.assertIn('f', self.kinds(self.building(f=b['f'][:4])))
        self.assertIn('outside tile', self.kinds(self.building(f=[v + 400.0 for v in b['f']])))
        self.assertEqual(self.building(fh=[cw]).n_errors(), 0)
        self.assertIn('fh orientation', self.kinds(self.building(fh=[b['f']])))

    def test_codes_and_ranges(self):
        for patch, kind in (({'k': 7}, 'k'), ({'r': 12}, 'r'), ({'rk': 9}, 'rk'), ({'rq': 'foto'}, 'rq'), ({'rq': 4}, 'rq'), ({'era': 5}, 'era'),
                            ({'h': 0}, 'h'), ({'h': 400}, 'h'), ({'e': 30.0}, 'e > h'), ({'rc': [200, 80, 60]}, 'rc'), ({'az': 360}, 'az'),
                            ({'p': 90}, 'p'), ({'use': 'Wohnen'}, 'use'), ({'eg': 'laden'}, 'eg'), ({'lv': 0}, 'lv'), ({'yr': 26}, 'yr'),
                            ({'osm': '44124199'}, 'osm'), ({'fg': 300}, 'fg'), ({'fl': 2}, 'fl'), ({'fl': 1}, 'fl r'), ({'n': ''}, 'n'),
                            ({'id': 'x'}, 'id'), ({'z0': 9000}, 'z0'), ({'q': {'h': 5}}, 'q value'), ({'src': {'f': 'google'}}, 'src value'),
                            ({'d': {'fa': -3}}, 'd fa'), ({'d': {'ro': {'Nord': 3}}}, 'd ro')):
            self.assertIn(kind, self.kinds(self.building(**patch)), patch)
        self.assertIn('prep.py', self.building(rq='foto').errors[0])
        self.assertEqual(self.building(osm='way/44124199', fg=3, yr=1974, bt='wbs70', fkt='Wohnhaus', eg='handel').n_errors(), 0)

    def test_roof(self):
        b = S.read_json(self.gt)['b'][0]
        self.assertIn('rt range', self.kinds(self.building(rt=b['rt'][:-1] + [99])))
        self.assertIn('rv', self.kinds(self.building(rv=b['rv'][:-1])))
        R = copy.deepcopy(b['R'])
        R[0]['vi'] = [6, 4]
        self.assertIn('R vi', self.kinds(self.building(R=R)))
        R = copy.deepcopy(b['R'])
        R[1]['a'] = 0
        R[0]['c'] = 12
        k = self.kinds(self.building(R=R))
        self.assertTrue({'R a', 'R c'} <= k, k)
        R = copy.deepcopy(b['R'])
        for f in R:
            f['ap'] *= 0.3
            f['a'] *= 0.3
        rep = self.building(R=R)
        self.assertEqual(rep.n_errors(), 0)
        self.assertEqual(rep.n_warnings(), 1)                       # the faces do not cover the footprint

    def test_walls_and_sides(self):
        b = S.read_json(self.gt)['b'][0]
        self.assertIn('F row', self.kinds(self.building(F=[b['F'][0][:9]] + b['F'][1:])))
        self.assertIn('S length', self.kinds(self.building(S=b['S'][:2])))
        s = copy.deepcopy(b['S'])
        s[0]['mat'] = 'marmor'
        s[1] = {'st': 'Steinweg'}
        k = self.kinds(self.building(S=s))
        self.assertTrue({'S mat', 'S q'} <= k, k)
        s = copy.deepcopy(b['S'])
        s[0]['q'] = 2
        self.assertEqual(self.building(S=s).n_warnings(), 1)        # quality 2 needs a photo id
        s[0]['src'] = ['panoramax:1234']
        self.assertTrue(self.building(S=s).ok(strict=True))

    def test_unknown_field_is_a_warning(self):
        rep = self.building(farbe='rot')
        self.assertEqual((rep.n_errors(), rep.n_warnings()), (0, 1))
        self.assertTrue(self.building(x_meins=1).ok(strict=True))   # private fields start with x_


class Tiles(Base):
    def test_envelope(self):
        for fn, kind in ((lambda d: d.update(o=[0, 0]), 'o'), (lambda d: d.update(key='10/498/542'), 'key'), (lambda d: d.update(v=2), 'v'),
                         (lambda d: d.update(p='s'), 'p'), (lambda d: d.pop('o'), 'o'), (lambda d: d.update(b={}), 'b')):
            self.setUp()
            self.rewrite('suhl/g/v0/10/497/542.json', fn)
            self.assertIn(kind, self.kinds(validate.validate(self.gt)), kind)
            shutil.rmtree(self.root)
        self.setUp()

    def test_id_twice(self):
        def dup(d):
            d['b'][1]['id'] = d['b'][0]['id']
        self.rewrite('suhl/g/v0/10/497/542.json', dup)
        self.assertIn('id twice', self.kinds(validate.validate(self.root)))

    def test_index_against_files(self):
        os.remove(os.path.join(self.root, 'suhl', 'g', 'v0', '10', '496', '542.json'))
        self.assertIn('listed, missing', self.kinds(validate.validate(self.root)))
        self.setUp()
        shutil.copy(self.gt, os.path.join(self.root, 'suhl', 'g', 'v0', '10', '497', '543.json'))
        k = self.kinds(validate.validate(self.root))
        self.assertTrue({'file, not listed', 'key'} <= k, k)
        self.setUp()
        os.remove(os.path.join(self.root, 'suhl', 'm', 'v0', 'index.json'))
        self.assertIn('no index', self.kinds(validate.validate(self.root)))
        self.setUp()
        self.rewrite('suhl/g/v0/index.json', lambda d: d.update(version=3))
        self.assertIn('version', self.kinds(validate.validate(self.root)))
        self.setUp()
        self.rewrite('suhl/g/v0/index.json', lambda d: (d.pop('sources'), d.pop('tiles')))
        self.assertIn('index core', self.kinds(validate.validate(self.root)))
        self.setUp()
        self.rewrite('suhl/g/v0/index.json', lambda d: d.update(kacheln={'497_542': 2}, based_on={'boden': 1}))   # own keys are welcome
        self.assertTrue(validate.validate(self.root).ok(strict=True))

    def test_make_index_keeps_own_keys(self):
        f = os.path.join(self.root, 'suhl', 'b', 'v0')
        doc = schema.make_index(f, 'b', 0, 'probe', ['dop', 'osm', schema.source('ndom1', via=schema.index.VIA_EASYGEODATA)],
                                extra={'arten': {'0': 'Laubbaum'}, 'v': 99}, based_on={'boden': 1})
        self.assertEqual((doc['v'], doc['p'], doc['version'], doc['n']['items'], doc['arten'], doc['based_on']),
                         (1, 'b', 0, 3, {'0': 'Laubbaum'}, {'boden': 1}))
        self.assertIn('© GDI-Th', doc['attribution'])
        self.assertIn('OpenStreetMap', doc['attribution'])
        self.assertIn('easygeodata.de', doc['attribution'])
        self.assertTrue(validate.validate(f).ok(strict=True))
        with self.assertRaises(S.SuhlError):
            schema.source('google')

    def test_aktuell(self):
        a = S.read_json(os.path.join(self.root, 'suhl', 'aktuell.json'))
        self.assertEqual(sorted(a['products']), ['_probe', 'b', 'd', 'g', 'm', 's'])
        self.assertEqual(a['products']['g'], {'version': 0, 'schema': 1, 'path': 'g/v0/', 'index': 'g/v0/index.json', 'made': beispiel.MADE,
                                              'area': 'probe', 'tiles': 2, 'bytes': a['products']['g']['bytes']})
        idx = S.read_json(os.path.join(self.root, 'suhl', 'g', 'v0', 'index.json'))
        idx['version'] = 1
        b = schema.make_aktuell(a, idx)
        self.assertEqual((b['products']['g']['version'], b['products']['g']['path'], b['products']['b']['version']), (1, 'g/v1/', 0))
        self.assertEqual(a['products']['g']['version'], 0)                      # the old document is not changed
        S.write_json(os.path.join(self.root, 'suhl', 'aktuell.json'), b)
        self.assertIn('aktuell missing', self.kinds(validate.validate(self.root)))

    def test_trees(self):
        t = [(0.0, 0.0, 12.0, 3.5, 13, 1 | 8), (399.99, 123.45, 30.0, 4.0, 2, 3 | 4)]
        b = schema.tree_pack(t)
        self.assertEqual(len(b), 16)
        u = schema.tree_unpack(b)
        self.assertEqual(u[1], (399.99, 123.45, 30.0, 4.0, 2, 7))
        mx, my = schema.tree_model((10, 497, 542), u[0])
        self.assertEqual((round(mx, 3), round(my, 3)), tuple(round(v, 3) for v in S.model_from_utm(619500.0, 5607600.0)))
        with self.assertRaises(S.SuhlError):
            schema.tree_pack([(400.0, 0.0, 10, 3, 0, 0)])
        for data, kind in ((b[:-1], 'b size'), (b[:6] + bytes([99, 0]) + b[8:], 'b kind'), (bytes([0x41, 0x9c]) + b[2:], 'b outside'),
                           (b[:4] + bytes([0]) + b[5:], 'b zero')):
            rep = schema.Report()
            schema.check_b_tile(data, (10, 497, 542), rep, 't')
            self.assertIn(kind, self.kinds(rep), kind)

    def test_streets_and_furniture(self):
        def local(d):
            d['ways'][0][6] = [v % 1000 for v in d['ways'][0][6]]
        self.rewrite('suhl/s/v0/10/497/542.json', local)
        self.assertIn('s way frame', self.kinds(validate.validate(self.root)))
        self.setUp()
        self.rewrite('suhl/s/v0/10/497/542.json', lambda d: d.pop('unit'))
        self.assertIn('s unit', self.kinds(validate.validate(self.root)))
        self.setUp()
        self.rewrite('suhl/m/v0/10/497/542.json', lambda d: d['items'].append({'t': 'ufo', 'x': -4700.0, 'y': 12300.0}))
        k = self.kinds(validate.validate(self.root))
        self.assertTrue({'m t', 'm frame'} <= k, k)

    def test_probe_rules_and_centre(self):
        far = os.path.join(self.root, 'suhl', 'm', 'v0', '10', '520', '560.json')
        fr = S.tile_frame(10, 520, 560)
        S.write_json(far, {'v': 1, 'p': 'm', 'key': fr.key, 'o': fr.o_json(), 'items': []})
        schema.make_index(os.path.join(self.root, 'suhl', 'm', 'v0'), 'm', 0, 'probe', ['osm'])
        self.assertNotIn('not probe', self.kinds(validate.validate(self.root)))
        self.assertIn('not probe', self.kinds(validate.validate(self.root, probe=True)))
        self.setUp()
        os.remove(self.gt)                                           # a "city" without the Markt tile
        schema.make_index(os.path.join(self.root, 'suhl', 'g', 'v0'), 'g', 0, 'stadt', ['ethos'])
        k = self.kinds(validate.validate(self.root))
        self.assertTrue({'centre of Suhl', 'plausible count'} <= k, k)

    def test_cli(self):
        import subprocess
        v = os.path.join(HERE, 'validate.py')
        r = subprocess.run([sys.executable, '-I', v, self.root, '--probe', '--json', os.path.join(self.root, 'r.json')], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stdout + r.stderr)
        self.assertIn('VALID', r.stdout)
        self.assertTrue(S.read_json(os.path.join(self.root, 'r.json'))['valid'])
        self.rewrite('suhl/g/v0/10/497/542.json', lambda d: d['b'][0].pop('f'))
        r = subprocess.run([sys.executable, '-I', v, self.root], capture_output=True, text=True)
        self.assertEqual(r.returncode, 1)
        self.assertIn('NOT VALID', r.stdout)
        r = subprocess.run([sys.executable, '-I', v, '--doc'], capture_output=True, text=True)
        self.assertIn('| `id` | R |', r.stdout)
        r = subprocess.run([sys.executable, '-I', v], capture_output=True, text=True)
        self.assertEqual(r.returncode, 2)


if __name__ == '__main__':
    unittest.main(verbosity=1)
