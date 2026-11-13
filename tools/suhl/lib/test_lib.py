#!/usr/bin/env python3
"""Unit tests of tools/suhl/lib (no network, a few seconds):  python3 -I tools/suhl/lib/test_lib.py
pyproj, shapely and numpy are used for cross-checks when they are installed and skipped otherwise."""
import http.server, json, os, shutil, sys, tempfile, threading, unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import suhllib as S   # noqa: E402


def have(mod):
    try:
        __import__(mod)
        return True
    except Exception:
        return False


class Tiles(unittest.TestCase):
    def test_quadtree_is_wlibs(self):
        import wlib
        self.assertIs(S.tbounds, wlib.tbounds)
        self.assertEqual(S.tsize(10), 400.0)
        self.assertEqual(S.tsize(12), 100.0)
        self.assertEqual(S.tsize(8), 1600.0)

    def test_centre_tile(self):
        x, y = S.tile_at(10, *S.CENTRE_UTM)
        self.assertEqual((x, y), (497, 542))
        self.assertEqual(S.tbounds(10, x, y), (619500.0, 5607600.0, 619900.0, 5608000.0))
        self.assertEqual(S.tile_key(10, x, y), '10/497/542')
        self.assertEqual(S.parse_key('suhl/g/v0/10/497/542.json'), (10, 497, 542))
        self.assertEqual(S.parse_key('10/497/542'), (10, 497, 542))
        for bad in ('10/497', 'a/b/c', '10/5000/1', '10/-1/3'):
            with self.assertRaises(S.SuhlError):
                S.parse_key(bad)

    def test_edges_parent_children(self):
        e0, n0, e1, n1 = S.tbounds(10, 497, 542)
        self.assertEqual(S.tile_at(10, e0, n0), (497, 542))          # south-west corner belongs to the tile
        self.assertEqual(S.tile_at(10, e1, n1), (498, 543))          # north-east corner to the neighbour
        self.assertEqual(S.tile_parent(10, 497, 542), (9, 248, 271))
        self.assertEqual(S.tile_parent(12, 1990, 2170, 2), (10, 497, 542))
        ch = S.tile_children(10, 497, 542, 2)
        self.assertEqual(len(ch), 16)
        self.assertEqual(ch[0], (12, 1988, 2168))
        self.assertTrue(all(S.tile_parent(*c, 2) == (10, 497, 542) for c in ch))
        self.assertEqual(S.tiles_in_box(10, (619500, 5607600, 620300, 5608000)), [(497, 542), (498, 542)])
        self.assertEqual(S.utm_tiles_1km((618700, 5606800, 620300, 5608400)),
                         [(x, y) for y in (5606, 5607, 5608) for x in (618, 619, 620)])

    def test_paths(self):
        self.assertEqual(S.tile_path('g', 0, 10, 497, 542), 'suhl/g/v0/10/497/542.json')
        self.assertEqual(S.tile_path('b', 'v3', 10, 497, 542), 'suhl/b/v3/10/497/542.bin')
        self.assertEqual(S.tile_path('boden', 1, 12, 1990, 2170, sub='t'), 'suhl/boden/v1/t/12/1990/2170.bin')
        self.assertEqual(S.tile_path('boden', 1, 6, 31, 33, sub='i'), 'suhl/boden/v1/i/6/31/33.webp')
        self.assertEqual(S.tile_path('f', 2, 8, 124, 135), 'suhl/f/v2/8/124/135.bin')
        self.assertEqual(S.index_path('g', 0), 'suhl/g/v0/index.json')
        self.assertEqual(S.index_path('boden', 1), 'suhl/boden/v1/index.json')
        for bad in (lambda: S.tile_path('g', 0, 11, 1, 1), lambda: S.tile_path('x', 0, 10, 1, 1), lambda: S.tile_path('boden', 0, 10, 1, 1),
                    lambda: S.product_dir('g', -1)):
            with self.assertRaises(S.SuhlError):
                bad()


class Coordinates(unittest.TestCase):
    def test_centre(self):
        e, n = S.utm_from_lonlat(*S.CENTRE_LONLAT)
        self.assertAlmostEqual(e, 619765.0969, places=3)      # pyproj 3.8 (EPSG:4326 -> 25832), 13.11.2026
        self.assertAlmostEqual(n, 5607674.3209, places=3)
        lon, lat = S.lonlat_from_utm(e, n)
        self.assertAlmostEqual(lon, S.CENTRE_LONLAT[0], places=10)
        self.assertAlmostEqual(lat, S.CENTRE_LONLAT[1], places=10)
        self.assertLess(((e - S.CENTRE_UTM[0]) ** 2 + (n - S.CENTRE_UTM[1]) ** 2) ** 0.5, 10.0)

    def test_model(self):
        self.assertAlmostEqual(S.MODEL_SCALE, 1.015725, places=5)
        self.assertAlmostEqual(S.MODEL_TURN_DEG, 4.3566, places=3)
        x, y = S.model_from_lonlat(*S.CENTRE_LONLAT)
        self.assertAlmostEqual(x, S.O_MODEL[0], delta=0.05)        # SUHL.O of the plan
        self.assertAlmostEqual(y, S.O_MODEL[1], delta=0.05)
        gx, gy = S.model_from_lonlat(*S.GARDEN_LONLAT)
        self.assertLess((gx * gx + gy * gy) ** 0.5, 30.0)          # the garden is the model origin
        for p in ((0.0, 0.0), (-4698.2, 12255.7), (6396.0, 21920.0)):
            q = S.model_from_utm(*S.utm_from_model(*p))
            self.assertAlmostEqual(q[0], p[0], places=6)
            self.assertAlmostEqual(q[1], p[1], places=6)
        self.assertAlmostEqual(S.model_z(374.617), 0.0)
        lon, lat = S.lonlat_from_model(*S.O_MODEL)
        self.assertAlmostEqual(lon, S.CENTRE_LONLAT[0], places=5)
        self.assertAlmostEqual(lat, S.CENTRE_LONLAT[1], places=5)

    def test_swapped_and_range(self):
        with self.assertRaises(S.SuhlError):
            S.utm_from_lonlat(50.6087, 10.6926)                    # (lat, lon)
        with self.assertRaises(S.SuhlError):
            S.utm_from_lonlat(10.69, 95.0)
        S.utm_from_lonlat(10.6926, 50.6087)

    def test_azimuth(self):
        g = S.convergence_deg(*S.CENTRE_UTM)
        self.assertAlmostEqual(g, 1.308, places=2)
        e0, n0 = S.utm_from_lonlat(*S.CENTRE_LONLAT)               # true north = moving along the meridian
        e1, n1 = S.utm_from_lonlat(S.CENTRE_LONLAT[0], S.CENTRE_LONLAT[1] + 0.01)
        import math
        grid_bearing_of_true_north = math.degrees(math.atan2(e1 - e0, n1 - n0))
        self.assertAlmostEqual(grid_bearing_of_true_north, -g, places=3)
        t = S.true_azimuth_from_grid(grid_bearing_of_true_north % 360)
        self.assertLess(min(t, 360 - t), 2e-3)
        mx, my = S.model_from_utm(e1, n1)[0] - S.model_from_utm(e0, n0)[0], S.model_from_utm(e1, n1)[1] - S.model_from_utm(e0, n0)[1]
        model_az_of_true_north = math.degrees(math.atan2(mx, my)) % 360
        t = S.true_azimuth_from_model(model_az_of_true_north)
        self.assertLess(min(t, 360 - t), 2e-3)
        self.assertAlmostEqual(S.true_azimuth_from_model(0.0), 356.95, places=1)
        self.assertAlmostEqual(S.model_azimuth_from_true(S.true_azimuth_from_model(123.0)), 123.0, places=9)

    def test_tile_frame(self):
        f = S.tile_frame(10, 497, 542)
        self.assertEqual(f.centre_utm, (619700.0, 5607800.0))
        self.assertEqual(f.from_utm(*f.centre_utm), (0.0, 0.0))
        x, y = f.from_utm(619900.0, 5608000.0)                      # the north-east corner: 200 m east and north in UTM
        self.assertAlmostEqual((x * x + y * y) ** 0.5 * S.MODEL_SCALE, 200 * 2 ** 0.5, places=6)
        e, n = f.to_utm(x, y)
        self.assertAlmostEqual(e, 619900.0, places=6)
        self.assertAlmostEqual(n, 5608000.0, places=6)
        self.assertEqual(f.to_model(*f.from_model(1.5, 2.5)), (1.5, 2.5))
        self.assertTrue(f.holds(619500.0, 5607600.0))
        self.assertFalse(f.holds(619900.0, 5607700.0))
        self.assertEqual(f.o_json(), [-4752.698, 12383.984])

    @unittest.skipUnless(have('pyproj'), 'pyproj not installed')
    def test_against_pyproj(self):
        from pyproj import Transformer
        f = Transformer.from_crs(4326, 25832, always_xy=True)
        for lon, lat in ((10.6926437, 50.6086518), (10.7692, 50.4991), (9.0, 50.0), (11.9, 51.5), (6.1, 47.3), (13.4, 52.5), (10.4, 50.2)):
            e, n = S.utm_from_lonlat(lon, lat)
            e2, n2 = f.transform(lon, lat)
            self.assertLess(abs(e - e2) + abs(n - n2), 1e-4, (lon, lat))
            lo, la = S.lonlat_from_utm(e2, n2)
            self.assertLess(abs(lo - lon) + abs(la - lat), 1e-9, (lon, lat))

    @unittest.skipUnless(have('numpy'), 'numpy not installed')
    def test_arrays(self):
        import numpy as np
        lon, lat = np.linspace(10.5, 10.9, 9), np.linspace(50.5, 50.7, 9)
        e, n = S.utm_from_lonlat(lon, lat)
        for k in range(9):
            es, ns = S.utm_from_lonlat(float(lon[k]), float(lat[k]))
            self.assertAlmostEqual(float(e[k]), es, places=6)
            self.assertAlmostEqual(float(n[k]), ns, places=6)
        lo, la = S.lonlat_from_utm(e, n)
        self.assertLess(float(np.abs(lo - lon).max() + np.abs(la - lat).max()), 1e-9)
        x, y = S.model_from_utm(e, n)
        e2, n2 = S.utm_from_model(x, y)
        self.assertLess(float(np.abs(e2 - e).max() + np.abs(n2 - n).max()), 1e-6)
        with self.assertRaises(S.SuhlError):
            S.utm_from_lonlat(lat, lon)


class Areas(unittest.TestCase):
    # numbers of plan 1.1 (suhl-technik, 13.11.2026), computed there independently with shapely
    PLAN = {'stadt': (141.81, 1013, 3814, 14746), 'kernstadt': (22.04, 216, 722, 2581), 'zentrum': (0.68, 11, 31, 93)}

    def test_numbers_of_the_plan(self):
        for aid, (km2, n10, n11, n12) in self.PLAN.items():
            a = S.area(aid)
            self.assertAlmostEqual(a.area_m2() / 1e6, km2, delta=0.006, msg=aid)
            self.assertEqual((len(a.tiles(10)), len(a.tiles(11)), len(a.tiles(12))), (n10, n11, n12), aid)
        self.assertEqual(len(S.area_tiles('stadt', 8)), 83)
        self.assertEqual(len(S.area_tiles('kernstadt', 8)), 22)

    def test_points(self):
        self.assertEqual(S.areas_at(*S.CENTRE_UTM), ['stadt', 'kernstadt', 'zentrum'])
        garden = S.utm_from_lonlat(*S.GARDEN_LONLAT)
        self.assertEqual(S.areas_at(*garden), [])
        self.assertTrue(S.area('zentrum').contains_lonlat(*S.CENTRE_LONLAT))
        self.assertTrue(S.area('stadt').contains_model(*S.O_MODEL))
        self.assertFalse(S.in_area('stadt', 625469.0, 5595624.0))
        gehlberg = [p for p in S.landmarks() if p['name'] == 'Gehlberg'][0]
        self.assertTrue(S.in_area('stadt', *gehlberg['utm']))
        self.assertFalse(S.in_area('kernstadt', *gehlberg['utm']))
        lm = {p['id']: p for p in S.landmarks()}
        self.assertTrue(S.in_area('zentrum', *lm['lm_markt']['utm']))
        with self.assertRaises(S.SuhlError):
            S.area('suhl')

    def test_tiles_are_sorted_and_nested(self):
        z, k, s = (set(S.area_tiles(a, 10)) for a in ('zentrum', 'kernstadt', 'stadt'))
        self.assertTrue(k <= s)
        self.assertEqual(len(z - s), 0)
        t = S.area_tiles('stadt', 10)
        self.assertEqual(t, sorted(t, key=lambda q: (q[1], q[0])))
        self.assertIn((497, 542), z)

    @unittest.skipUnless(have('shapely') and have('pyproj'), 'shapely/pyproj not installed')
    def test_against_shapely(self):
        from shapely.geometry import Polygon, box
        for aid in ('stadt', 'kernstadt', 'zentrum'):
            a = S.area(aid)
            po = Polygon(a.rings[0], a.rings[1:])
            self.assertAlmostEqual(po.area, a.area_m2(), delta=1.0)
            for L in (9, 10, 11):
                ref = sorted(((x, y) for x, y in S.tiles_in_box(L, po.bounds) if po.intersects(box(*S.tbounds(L, x, y)))),
                             key=lambda q: (q[1], q[0]))
                self.assertEqual(a.tiles(L), ref, (aid, L))

    def test_rings_with_hole(self):
        s = S.tsize(10)
        e0, n0 = S.tbounds(10, 500, 500)[:2]
        outer = [(e0 + 10, n0 + 10), (e0 + 5 * s - 10, n0 + 10), (e0 + 5 * s - 10, n0 + 5 * s - 10), (e0 + 10, n0 + 5 * s - 10)]
        hole = [(e0 + 2 * s - 10, n0 + 2 * s - 10), (e0 + 2 * s - 10, n0 + 3 * s + 10), (e0 + 3 * s + 10, n0 + 3 * s + 10),
                (e0 + 3 * s + 10, n0 + 2 * s - 10)]
        t = S.rings_tiles([outer, hole], 10)
        self.assertEqual(len(t), 24)                               # 5 x 5 without the middle tile, which lies inside the hole
        self.assertNotIn((502, 502), t)
        a = S.Area('x', {}, [outer, hole])
        self.assertTrue(a.contains(e0 + 50, n0 + 50))
        self.assertFalse(a.contains(e0 + 2.5 * s, n0 + 2.5 * s))


class Probe(unittest.TestCase):
    def test_probe_json_is_current(self):
        self.assertEqual(S.read_bytes(S.PROBE_JSON).decode('utf-8'), S.probe_text(),
                         'probe.json is stale: python3 -I tools/suhl/lib/suhllib.py probe')

    def test_probe_content(self):
        d = S.probe()
        self.assertEqual(d['n'], 11)
        self.assertEqual([t['key'] for t in d['tiles']],
                         ['10/495/540', '10/496/540', '10/495/541', '10/496/541', '10/497/541', '10/496/542', '10/497/542', '10/498/542',
                          '10/496/543', '10/497/543', '10/498/543'])
        self.assertEqual(sum(t['has_markt'] for t in d['tiles']), 1)
        self.assertEqual(d['bbox_utm'], [618700.0, 5606800.0, 620300.0, 5608400.0])
        self.assertEqual(len(d['state_tiles_1km']), 9)
        for t in d['tiles']:
            self.assertEqual(t['o'], S.tile_frame(10, t['x'], t['y']).o_json())


class Guard(unittest.TestCase):
    def test_passes(self):
        self.assertTrue(S.guard(box=S.area('stadt').bbox, what='test'))
        self.assertTrue(S.guard(lonlat_box=(10.55, 50.55, 10.85, 50.70)))
        self.assertTrue(S.guard(model_box=(-14860, 6180, 6396, 21920)))
        self.assertTrue(S.guard(box=S.tbounds(10, 495, 540), part_of='zentrum'))
        self.assertTrue(S.guard(buildings=31000, area='stadt'))
        self.assertTrue(S.guard(box=S.area('kernstadt').bbox, buildings=16168, streets=358, area='kernstadt'))
        self.assertTrue(S.guard(buildings=595, streets=49, area='zentrum'))

    def test_stops(self):
        cases = [
            dict(lonlat_box=(50.55, 10.55, 50.70, 10.85)),                 # lat and lon swapped (the typo of 26.10.)
            dict(lonlat_box=(8.4, 9.0, 8.6, 9.2)),                         # Nigeria
            dict(box=(10.55, 50.55, 10.85, 50.70)),                        # degrees given as UTM
            dict(box=(620700.0, 5590800.0, 630300.0, 5600400.0)),          # block B around the garden: Suhl is not in it
            dict(box=(5602294.0, 609823.0, 5616762.0, 630374.0)),          # E and N swapped
            dict(box=(630374.0, 5602294.0, 609823.0, 5616762.0)),          # turned round
            dict(box=(32609823.0, 5602294.0, 32630374.0, 5616762.0)),      # zone prefix
            dict(model_box=(-1500, 800, -600, 1700)),                      # Schleusingen
            dict(box=S.tbounds(10, 300, 300), part_of='stadt'),
            dict(buildings=120, area='stadt'),                             # an error page parsed as data
            dict(buildings=5_000_000, area='stadt'),                       # the whole state
            dict(streets=3, area='zentrum'),
            dict(box=S.area('stadt').bbox, buildings=9000),
            dict(),
            dict(hamsters=4),
        ]
        for kw in cases:
            with self.assertRaises(S.GuardError, msg=str(kw)) as cm:
                S.guard(what='test', **kw)
            self.assertIn('SUHL GUARD', str(cm.exception))
        with self.assertRaises(SystemExit):                                # an uncaught guard ends the tool
            S.guard(box=(0, 0, 1, 1))

    def test_message_names_the_problem(self):
        with self.assertRaises(S.GuardError) as cm:
            S.guard(lonlat_box=(50.55, 10.55, 50.70, 10.85), what='suhl-x')
        self.assertIn('(lat, lon)', str(cm.exception))
        with self.assertRaises(S.GuardError) as cm:
            S.guard(box=(10.55, 50.55, 10.85, 50.70))
        self.assertIn('degrees', str(cm.exception))


class TileSets(unittest.TestCase):
    def test_round_trip(self):
        for aid, L in (('zentrum', 10), ('kernstadt', 11), ('stadt', 12)):
            t = S.area_tiles(aid, L)
            ts = S.tileset_encode(t)
            self.assertEqual(ts['n'], len(t))
            self.assertEqual(S.tileset_decode(json.loads(json.dumps(ts))), t)
            self.assertTrue(all(S.tileset_has(ts, x, y) for x, y in t[:200]))
            self.assertFalse(S.tileset_has(ts, ts['x0'] - 1, ts['y0']))
        z = S.tileset_encode(S.area_tiles('zentrum', 10))
        self.assertEqual((z['x0'], z['y0'], z['w'], z['h'], z['n']), (495, 540, 4, 4, 11))
        self.assertEqual(z['bits'], 'c+4=')                               # rows from the south: 1100 1110 0111 0111 (bit 0 first)
        self.assertFalse(S.tileset_has(z, 497, 540))
        self.assertEqual(S.tileset_decode(S.tileset_encode([])), [])
        with self.assertRaises(S.SuhlError):
            S.tileset_decode({'x0': 0, 'y0': 0, 'w': 4, 'h': 4, 'n': 3, 'bits': 'c+4='})

    def test_scan(self):
        d = tempfile.mkdtemp(prefix='suhl-test-')
        try:
            for x, y in ((497, 542), (498, 542)):
                S.write_json(os.path.join(d, '10', str(x), f'{y}.json'), {'v': 1})
            with open(os.path.join(d, '10', '497', 'notes.txt'), 'w') as f:
                f.write('x')
            lv, size = S.scan_tiles(d, 'json')
            self.assertEqual(lv, {10: [(497, 542), (498, 542)]})
            self.assertEqual(size[10], 2 * len('{"v":1}\n'))
        finally:
            shutil.rmtree(d)


class _Handler(http.server.BaseHTTPRequestHandler):
    hits, agents = {}, []

    def do_GET(self):
        p = self.path.split('?')[0]
        _Handler.hits[p] = _Handler.hits.get(p, 0) + 1
        _Handler.agents.append(self.headers.get('User-Agent'))
        if p == '/flaky' and _Handler.hits[p] < 3:
            self.send_response(503)
            self.end_headers()
            return
        if p == '/missing':
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b'not here')
            return
        body = b'PK-data' if p == '/zip' else json.dumps({'path': p, 'n': _Handler.hits[p]}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *a):
        pass


class Http(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['no_proxy'] = os.environ['NO_PROXY'] = ','.join(filter(None, [os.environ.get('no_proxy'), '127.0.0.1,localhost']))
        cls.srv = http.server.ThreadingHTTPServer(('127.0.0.1', 0), _Handler)
        threading.Thread(target=cls.srv.serve_forever, daemon=True).start()
        cls.base = f'http://127.0.0.1:{cls.srv.server_address[1]}'
        cls.cache = tempfile.mkdtemp(prefix='suhl-test-cache-')

    @classmethod
    def tearDownClass(cls):
        cls.srv.shutdown()
        cls.srv.server_close()
        shutil.rmtree(cls.cache)

    def test_cache_and_user_agent(self):
        st, b, ct, fc = S.http_get(self.base + '/ok', cache=self.cache, pause=0)
        self.assertEqual((st, fc, json.loads(b)['n']), (200, False, 1))
        st, b, ct, fc = S.http_get(self.base + '/ok', cache=self.cache, pause=0)
        self.assertEqual((st, fc, json.loads(b)['n']), (200, True, 1))
        self.assertEqual(_Handler.hits['/ok'], 1)
        self.assertEqual(ct, 'application/json')
        st, b, ct, fc = S.http_get(self.base + '/ok', cache=self.cache, pause=0, max_age=-1)     # too old: asked again
        self.assertEqual((fc, json.loads(b)['n']), (False, 2))
        self.assertTrue(all(a == S.UA for a in _Handler.agents))
        self.assertIn('PavillonRatscher-Suhl', S.UA)

    def test_retry_and_no_retry(self):
        st, b, ct, fc = S.http_get(self.base + '/flaky', pause=0, backoff=0.01, quiet=True)
        self.assertEqual((st, _Handler.hits['/flaky']), (200, 3))
        st, b, ct, fc = S.http_get(self.base + '/missing', pause=0, backoff=0.01, quiet=True)
        self.assertEqual((st, _Handler.hits['/missing'], b), (404, 1, b'not here'))                # a clear no is not asked again
        st, obj, fc = S.http_json(self.base + '/missing', pause=0, quiet=True)
        self.assertEqual((st, obj), (404, None))
        st, b, ct, fc = S.http_get('http://127.0.0.1:9/', pause=0, backoff=0.01, tries=2, timeout=2, quiet=True)
        self.assertEqual(st, 0)

    def test_secrets_never_reach_cache_or_log(self):
        self.assertEqual(S.redact('https://x.example/a?bbox=1,2&key=SECRET123&f=tif'), 'https://x.example/a?bbox=1,2&key=***&f=tif')
        self.assertEqual(S.redact('https://x.example/a?API_KEY=SECRET123'), 'https://x.example/a?API_KEY=***')
        self.assertEqual(S.redact('https://x.example/a'), 'https://x.example/a')
        st, b, ct, fc = S.http_get(self.base + '/ok2?token=SECRET123', cache=self.cache, pause=0, headers={'Authorization': 'Bearer SECRET456'})
        self.assertEqual(st, 200)
        for root, _, files in os.walk(self.cache):
            for fn in files:
                txt = S.read_bytes(os.path.join(root, fn))
                self.assertNotIn(b'SECRET123', txt)
                self.assertNotIn(b'SECRET456', txt)

    def test_download_resumes(self):
        dest = os.path.join(self.cache, 'dl', 'a.zip')
        p, st, note = S.http_download(self.base + '/zip', dest, pause=0, magic=b'PK')
        self.assertEqual((p, st), (dest, 200))
        n = _Handler.hits['/zip']
        p, st, note = S.http_download(self.base + '/zip', dest, pause=0, magic=b'PK')
        self.assertEqual((p, note, _Handler.hits['/zip']), (dest, 'cached', n))
        p, st, note = S.http_download(self.base + '/ok', os.path.join(self.cache, 'dl', 'b.zip'), pause=0, magic=b'PK')
        self.assertIsNone(p)
        self.assertFalse(os.path.exists(os.path.join(self.cache, 'dl', 'b.zip')))


if __name__ == '__main__':
    unittest.main(verbosity=1)
