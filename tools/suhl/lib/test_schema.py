#!/usr/bin/env python3
"""Unit tests of the schemas and the validator (schema 1, revision 1.1; no network, a few seconds):
    python3 -I tools/suhl/lib/test_schema.py"""
import copy, filecmp, os, shutil, subprocess, sys, tempfile, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import suhllib as S   # noqa: E402
import schema         # noqa: E402
import beispiel       # noqa: E402
import validate       # noqa: E402

DOC = os.path.join(S.REPO, 'docs', 'features', 'suhl-daten.md')


class Base(unittest.TestCase):
    def setUp(self):
        self.root = tempfile.mkdtemp(prefix='suhl-schema-')
        beispiel.write(self.root)
        self.gt = os.path.join(self.root, 'suhl', 'g', 'v0', '10', '497', '542.json')

    def tearDown(self):
        shutil.rmtree(self.root)

    def fresh(self):
        shutil.rmtree(self.root)
        self.setUp()

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
        schema.check_building(b, S.tile_frame(10, 497, 542), rep, 'test', doc)
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
        self.assertEqual((rep.stats['g: buildings'], rep.stats['b: trees'], rep.stats['w: forest cells'], rep.stats['gr: areas']), (3, 3, 3, 1))
        self.assertTrue(validate.validate(self.root, probe=True).ok(strict=True))
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
        missing = [f[0] for f in schema.BUILDING_FIELDS if f'`{f[0]}`' not in txt]
        self.assertEqual(missing, [], 'docs/features/suhl-daten.md does not name these building fields')
        missing = [w for w in ('aktuell.json', 'index.json', 'validate.py', 'suhl-publish', 'DATEN_TOKEN', 'EASYGEODATA_KEY', 'based_on', '`has`',
                               '`schema`', '`product`', 'easygeodata.py', f'Fassung {schema.REV}') if w not in txt]
        self.assertEqual(missing, [], 'docs/features/suhl-daten.md does not mention these')
        missing = [f[0] for f in schema.D_FIELDS if f'`{f[0]}`' not in txt]
        self.assertEqual(missing, [], 'docs/features/suhl-daten.md (section 13) does not name these fields of the product d')
        missing = [k for k in schema.QUARTER_SUMS + ('raster', 'viertel.json', 'SUHL.data', 'vacancyMin') if k not in txt]
        self.assertEqual(missing, [], 'docs/features/suhl-daten.md (section 13) does not name these parts of viertel.json')


class Building(Base):
    def test_valid(self):
        self.assertTrue(self.building().ok(strict=True))

    def test_required(self):
        for k in ('id', 'f', 'k', 'h', 'e', 'r', 'rq', 'rk', 'rc', 'rv', 'rt', 'F', 'q'):
            self.assertIn('missing ' + k, self.kinds(self.building(**{k: None})), k)
        for k in ('z0', 'az', 'R', 'S', 'd', 'use', 'era', 'n', 'adr', 'lv', 'src', 'fas'):
            self.assertEqual(self.building(**{k: None, **({'zv': None} if k == 'z0' else {})}).n_errors(), 0, k)

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
        self.assertEqual(self.building(fh=[cw], zv=None).n_errors(), 0)
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
        self.assertEqual(self.building(osm='way/44124199', fg=3 | 32 | 64, yr=1974, bt='wbs70', fkt='Wohnhaus', eg='handel').n_errors(), 0)

    def test_fields_of_revision_1_1(self):
        b = S.read_json(self.gt)['b'][0]
        self.assertEqual(self.building(lm='Z10', kat=1, teil='BEISPIEL_2', lvk=4).n_errors(), 0)
        for patch, kind in (({'fas': {'t': 7, 'q': 0}}, 'fas t'), ({'fas': {'t': 0, 'col': '#ffffff'}}, 'fas col'), ({'fas': {'t': 0, 'mat': 'marmor'}}, 'fas mat'),
                            ({'fas': {'t': 0, 'balk': 'ja'}}, 'fas balk'), ({'fas': 3}, 'fas'), ({'kat': 2}, 'kat'), ({'lm': ''}, 'lm'), ({'lvk': 0}, 'lvk'),
                            ({'zv': [0.0, 0.1]}, 'zv'), ({'zv': b['zv'], 'z0': None}, 'zv z0'), ({'fg': 256}, 'fg')):
            self.assertIn(kind, self.kinds(self.building(**patch)), patch)
        s = [dict(b['S'][0]), None, None, None]
        for patch, kind in (({'eg': 'shop'}, 'S eg'), ({'sign': 'Laden'}, 'S sign'), ({'hof': 0}, 'S hof')):
            self.assertIn(kind, self.kinds(self.building(S=[dict(s[0], **patch), None, None, None])), patch)
        self.assertTrue(self.building(S=[dict(s[0], hof=1), None, None, None]).ok(strict=True))
        rep = self.check_tile(lambda d: d['b'][0].update(f='abc', fh=12.4, R=[3], F='x', S=7, q=[1], d=5, rv=None, zv='hoch'))
        self.assertGreater(rep.n_errors(), 5)                                     # wrong types are errors of the record, never a crash

    def check_tile(self, fn):
        doc = S.read_json(self.gt)
        fn(doc)
        rep = schema.Report()
        schema.check_g_tile(doc, (10, 497, 542), rep, 'test')
        return rep

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
    def test_head(self):
        for fn, kind in ((lambda d: d.update(o=[0, 0]), 'o'), (lambda d: d.update(key='10/498/542'), 'key'), (lambda d: d.update(schema=2), 'schema'),
                         (lambda d: d.update(product='s'), 'product'), (lambda d: d.pop('o'), 'o'), (lambda d: d.update(b={}), 'b'),
                         (lambda d: d.update(n=7), 'n')):
            self.rewrite('suhl/g/v0/10/497/542.json', fn)
            self.assertIn(kind, self.kinds(validate.validate(self.gt)), kind)
            self.fresh()
        self.rewrite('suhl/g/v0/10/497/542.json', lambda d: d.update(eigenes={'a': 1}, frame='tile local'))   # own head fields are welcome
        self.assertTrue(validate.validate(self.gt).ok(strict=True))

    def test_id_twice(self):
        def dup(d):
            d['b'][1]['id'] = d['b'][0]['id']
        self.rewrite('suhl/g/v0/10/497/542.json', dup)
        self.assertIn('id twice', self.kinds(validate.validate(self.root)))

    def test_index_against_files(self):
        os.remove(os.path.join(self.root, 'suhl', 'g', 'v0', '10', '496', '542.json'))
        self.assertIn('listed, missing', self.kinds(validate.validate(self.root)))
        self.fresh()
        shutil.copy(self.gt, os.path.join(self.root, 'suhl', 'g', 'v0', '10', '497', '543.json'))
        k = self.kinds(validate.validate(self.root))
        self.assertTrue({'file, not listed', 'key'} <= k, k)
        self.fresh()
        os.remove(os.path.join(self.root, 'suhl', 'm', 'v0', 'index.json'))
        self.assertIn('no index', self.kinds(validate.validate(self.root)))
        self.fresh()
        self.rewrite('suhl/g/v0/index.json', lambda d: d.update(version=3))
        self.assertIn('version', self.kinds(validate.validate(self.root)))
        self.fresh()
        self.rewrite('suhl/g/v0/index.json', lambda d: d.update(version='v0', sources={'ethos': 'ETHOS.BUILDA, ODbL 1.0'}, counts={'497/542': [2, 2000]},
                                                                based_on={'boden': 'v0'}))        # "v0", a dict of sources, own keys: all fine
        self.assertTrue(validate.validate(self.root).ok(strict=True))
        self.rewrite('suhl/g/v0/index.json', lambda d: d.update(based_on={'boden': 'neu'}))
        self.assertIn('based_on', self.kinds(validate.validate(self.root)))
        self.rewrite('suhl/g/v0/index.json', lambda d: (d.pop('sources'), d.pop('has')))
        rep = validate.validate(self.root)
        self.assertIn('index core', self.kinds(rep))
        self.assertIn('--index', rep.errors[0])

    def test_normalise_index_keeps_own_keys(self):
        f = os.path.join(self.root, 'suhl', 'b', 'v0')
        S.write_json(os.path.join(f, 'index.json'), {'produkt': 'b', 'schema': 1, 'made': '2026-11-13T00:36:50Z', 'gebiet': 'probe',
                                                     'kacheln': {'497_542': 3}, 'arten': {'0': 'Laubbaum'},
                                                     'quellen': [{'name': 'DOP20', 'lizenz': 'CC BY 4.0, © GDI-Th'}], 'attribution': 'Luftbild © GDI-Th'})
        self.assertIn('index core', self.kinds(validate.validate(f)))
        doc = schema.normalise_index(f)
        self.assertEqual((doc['schema'], doc['product'], doc['version'], doc['area'], doc['made'], doc['n']['items'], doc['arten'], doc['kacheln']),
                         (1, 'b', 0, 'probe', '2026-11-13T00:36:50Z', 3, {'0': 'Laubbaum'}, {'497_542': 3}))
        self.assertEqual((doc['attribution'], doc['sources'][0]['name']), ('Luftbild © GDI-Th', 'DOP20'))
        self.assertEqual((schema.index_has(doc), doc['based_on']), ({10: [(497, 542)]}, {}))
        self.assertTrue(validate.validate(f).ok(strict=True))
        S.write_json(os.path.join(f, 'index.json'), {'v': 1, 'p': 'b', 'rev': '1.0', 'version': 0, 'made': '2026-11-13T00:36:50Z', 'area': 'probe', 'ext': {'': 'bin'},
                                                     'tiles': {'': {'10': doc['has']['10']}}, 'sources': [schema.source('dop')], 'attribution': 'x',
                                                     'note': 'bleibt', 'based_on': {'boden': 0}, 'x_z0': {'q': 1}})     # an index of revision 1.0
        doc = schema.normalise_index(f)
        self.assertEqual((doc['based_on'], doc['note'], doc['x_z0'], 'tiles' in doc, 'v' in doc, 'ext' in doc), ({'boden': 0}, 'bleibt', {'q': 1}, False, False, False))
        doc = schema.normalise_index(f, based_on={'boden': 1, 's': 1})
        self.assertEqual(doc['based_on'], {'boden': 1, 's': 1})
        os.remove(os.path.join(f, 'index.json'))
        with self.assertRaises(S.SuhlError):
            schema.normalise_index(f)                                              # nothing to take area and sources from
        doc = schema.normalise_index(f, area='probe', sources=['dop', 'osm', schema.source('ndom1', via=schema.VIA_EASYGEODATA)])
        self.assertIn('© GDI-Th', doc['attribution'])
        self.assertIn('easygeodata.de', doc['attribution'])
        with self.assertRaises(S.SuhlError):
            schema.source('google')

    def test_aktuell(self):
        a = S.read_json(os.path.join(self.root, 'suhl', 'aktuell.json'))
        self.assertEqual(sorted(a['products']), ['_probe', 'b', 'd', 'g', 'gr', 'm', 's', 'w'])
        self.assertEqual(a['products']['g'], {'version': 0, 'schema': 1, 'path': 'g/v0/', 'index': 'g/v0/index.json', 'made': beispiel.MADE,
                                              'area': 'probe', 'tiles': 2, 'bytes': a['products']['g']['bytes'], 'based_on': {}})
        idx = schema.index_doc_of(os.path.join(self.root, 'suhl', 'g', 'v0'))
        idx['version'], idx['based_on'] = 'v1', {'boden': 1}
        b = schema.make_aktuell(a, idx)
        self.assertEqual((b['products']['g']['version'], b['products']['g']['path'], b['products']['g']['based_on'], b['products']['b']['version']),
                         (1, 'g/v1/', {'boden': 1}, 0))
        self.assertEqual(a['products']['g']['version'], 0)                      # the old document is not changed
        S.write_json(os.path.join(self.root, 'suhl', 'aktuell.json'), b)
        self.assertIn('aktuell missing', self.kinds(validate.validate(self.root)))

    def test_trees_forest_green(self):
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
        for data, kind in ((bytes(2399), 'w size'), (bytes([9]) + bytes(2399), 'w kind'), (bytes(400) + bytes([150]) + bytes(1999), 'w percent')):
            rep = schema.Report()
            schema.check_w_tile(data, (10, 497, 542), rep, 't')
            self.assertIn(kind, self.kinds(rep), kind)
        for doc, kind in (({'f': [[99, 'w1', [[0, 0, 10, 0, 10, 10]]]]}, 'gr class'), ({'f': [[4, 'w1', [[0, 0, 10, 0]]]]}, 'gr ring'),
                          ({'f': [[4, 'w1', [[-47000, 0, 10, 0, 10, 10]]]]}, 'gr frame'), ({'flaechen': []}, 'gr')):
            rep = schema.Report()
            schema.check_gr_tile(doc, (10, 497, 542), rep, 't')
            self.assertIn(kind, self.kinds(rep), kind)

    def test_streets_and_furniture(self):
        fr = S.tile_frame(10, 497, 542)

        def absolute(d):
            p = d['ways'][0][6]
            d['ways'][0][6] = [v + (int(fr.o[0] * 10) if i % 3 == 0 else int(fr.o[1] * 10) if i % 3 == 1 else 0) for i, v in enumerate(p)]
        self.rewrite('suhl/s/v0/10/497/542.json', absolute)
        self.assertIn('s way frame', self.kinds(validate.validate(self.root)))
        self.fresh()
        self.rewrite('suhl/s/v0/10/497/542.json', lambda d: d.pop('unit'))
        self.assertIn('s unit', self.kinds(validate.validate(self.root)))
        self.fresh()
        self.rewrite('suhl/s/v0/10/497/542.json', lambda d: d['ways'][0].__setitem__(4, 9))
        self.assertIn('s way index', self.kinds(validate.validate(self.root)))
        self.fresh()
        self.rewrite('suhl/m/v0/10/497/542.json', lambda d: (d['lampen'].extend([-47000, 123000, 0, 0]), d['schilder'].append(['205']), d.update(pfosten=[1, 2])))
        k = self.kinds(validate.validate(self.root))
        self.assertTrue({'m frame', 'm row', 'm flat'} <= k, k)
        self.fresh()
        self.rewrite('suhl/m/v0/10/497/542.json', lambda d: d.pop('unit'))
        rep = validate.validate(self.root)
        self.assertEqual((rep.n_errors(), rep.n_warnings()), (0, 1))
        self.assertEqual(rep.stats['m: things'], 6)

    def test_ground_meta(self):
        f = os.path.join(self.root, 'suhl', 'boden', 'v0')
        for sub, ext, head in (('t', 'bin', b'WTH1' + bytes(20)), ('i', 'webp', b'RIFF\x10\x00\x00\x00WEBPVP8 ')):
            for L, x, y in ((10, 497, 542), (9, 248, 271)):
                p = os.path.join(f, sub, str(L), str(x), f'{y}.{ext}')
                os.makedirs(os.path.dirname(p), exist_ok=True)
                with open(p, 'wb') as fh:
                    fh.write(head)
        meta = {'format': 'welt-test/1', 'generated': beispiel.MADE,
                'suhl': {'product': 'boden', 'version': 'v0', 'schema': 1, 'mode': 'probe', 'balanced': False, 'based_on': {'s': 0}},
                'tiling': {'levels': {'9': {'rect': [248, 271, 248, 271], 'has': [[248, 271]]}, '10': {'rect': [497, 542, 497, 542], 'has': [[497, 542]]}}},
                'sources': {'terrain': 'erfunden'}, 'attribution': beispiel.NOTE}
        S.write_json(os.path.join(f, 'meta.json'), meta)
        self.assertTrue(validate.validate(self.root, probe=True).ok(strict=True), validate.validate(self.root).errors)
        self.assertEqual(schema.index_doc_of(f)['n']['tiles'], 4)
        akt = schema.make_aktuell(None, schema.index_doc_of(f))
        self.assertEqual((akt['products']['boden']['index'], akt['products']['boden']['based_on']), ('boden/v0/meta.json', {'s': 0}))
        del meta['suhl']['balanced'], meta['suhl']['based_on']
        S.write_json(os.path.join(f, 'meta.json'), meta)
        rep = validate.validate(self.root)
        self.assertEqual((rep.n_errors(), rep.n_warnings()), (0, 2))                      # balanced and based_on are asked for
        meta['suhl'].update(balanced=True, based_on={})
        S.write_json(os.path.join(f, 'meta.json'), meta)
        os.remove(os.path.join(f, 'i', '9', '248', '271.webp'))
        self.assertIn('listed, missing', self.kinds(validate.validate(self.root)))
        with open(os.path.join(f, 't', '10', '497', '542.bin'), 'wb') as fh:
            fh.write(b'<html>Wartung</html>')
        self.assertIn('magic', self.kinds(validate.validate(self.root)))
        meta['suhl']['schema'] = 2
        S.write_json(os.path.join(f, 'meta.json'), meta)
        self.assertIn('meta suhl', self.kinds(validate.validate(self.root)))

    def test_probe_rules_and_centre(self):
        far = os.path.join(self.root, 'suhl', 'm', 'v0', '10', '520', '560.json')
        fr = S.tile_frame(10, 520, 560)
        S.write_json(far, {'schema': 1, 'product': 'm', 'key': fr.key, 'o': fr.o_json(), 'unit': 'dm', 'lampen': [0, 0, 0, 0]})
        schema.normalise_index(os.path.join(self.root, 'suhl', 'm', 'v0'))
        self.assertNotIn('not probe', self.kinds(validate.validate(self.root)))
        self.assertIn('not probe', self.kinds(validate.validate(self.root, probe=True)))
        self.fresh()
        os.remove(self.gt)                                           # a "city" without the Markt tile
        schema.normalise_index(os.path.join(self.root, 'suhl', 'g', 'v0'), area='stadt')
        k = self.kinds(validate.validate(self.root))
        self.assertTrue({'centre of Suhl', 'plausible count'} <= k, k)

    def test_cli(self):
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
        r = subprocess.run([sys.executable, '-I', v, '--index', os.path.join(self.root, 'suhl', 's', 'v0')], capture_output=True, text=True)
        self.assertEqual(r.returncode, 0, r.stderr)
        r = subprocess.run([sys.executable, '-I', v], capture_output=True, text=True)
        self.assertEqual(r.returncode, 2)


if __name__ == '__main__':
    unittest.main(verbosity=1)
