#!/usr/bin/env python3
"""Unit tests of the easygeodata client against two local stand-in servers (API and object storage), no network:
    python3 -I tools/suhl/lib/test_easygeodata.py
The stand-ins behave as the real API did on 13.11.2026 (runs 43340656226, 43341000214): the key in X-API-Key, /dgm/tiles lists
tiles with an address under /api/file/..., which answers 302 to a second server."""
import http.server, io, json, os, shutil, sys, tempfile, threading, unittest, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import suhllib as S          # noqa: E402
import easygeodata as EG     # noqa: E402

KEY = 'egd_TESTKEY_0123456789'
STATE = {'api_hits': [], 'store_hits': [], 'store_keys': [], 'quota_after': None, 'files_served': 0}


def have(mod):
    try:
        __import__(mod)
        return True
    except Exception:
        return False


def tif_bytes(e_km, n_km, base=400.0):
    """a small real GeoTIFF (40 x 40 cells of 25 m; larger than the 2000 bytes below which tools/welt/fetch.py takes a file for
    broken) when tifffile is there, else bytes that only start like a TIFF"""
    if not (have('tifffile') and have('numpy')):
        return b'II*\x00' + bytes(3000)
    import numpy as np
    import tifffile
    a = (base + np.arange(1600, dtype=np.float32).reshape(40, 40))
    buf = io.BytesIO()
    tifffile.imwrite(buf, a, extratags=[(33550, 'd', 3, (25.0, 25.0, 0.0)), (33922, 'd', 6, (0.0, 0.0, 0.0, e_km * 1000.0, n_km * 1000.0 + 1000.0, 0.0)),
                                        (34735, 'H', 16, (1, 1, 0, 3, 1024, 0, 1, 1, 1025, 0, 1, 1, 3072, 0, 1, 25832))])
    return buf.getvalue()


TILES = [(618, 5607), (619, 5607), (620, 5607), (619, 5608)]
FILES = {f'dgm1_32_{e}_{n}.tif': tif_bytes(e, n) for e, n in TILES}


class Api(http.server.BaseHTTPRequestHandler):
    store = ''

    def _json(self, code, obj):
        b = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def do_GET(self):
        path, _, query = self.path.partition('?')
        STATE['api_hits'].append(path)
        if self.headers.get('X-API-Key') != KEY:
            return self._json(401, {'detail': 'API-Schlüssel fehlt oder ist ungültig', 'grund': 'schluessel'})
        if path == '/api/dgm/tiles':
            base = f'http://127.0.0.1:{self.server.server_address[1]}'
            tl = [{'state': 'TH', 'tile_key': f'32_{e}_{n}', 'url': f'{base}/api/file/dgm/TH/dgm1_32_{e}_{n}.tif', 'aktualitaet': '2020-01-01',
                   'size_bytes': len(FILES[f'dgm1_32_{e}_{n}.tif']) + (1 if (e, n) == (620, 5607) else 0), 'epsg': 25832,
                   'befliegung_von': '2020-01-01', 'befliegung_bis': '2025-12-31', 'befliegung_quelle': 'zeitraum'} for e, n in TILES
                  if 'bbox' not in query]
            return self._json(200, {'count': len(tl), 'size_bytes': sum(t['size_bytes'] for t in tl), 'angemeldet': True, 'tiles': tl})
        if path.startswith('/api/file/dgm/TH/'):
            if STATE['quota_after'] is not None and STATE['files_served'] >= STATE['quota_after']:
                return self._json(429, {'detail': 'Monatskontingent erreicht', 'grund': 'kontingent'})
            STATE['files_served'] += 1
            self.send_response(302)
            self.send_header('Location', f'{Api.store}/dgm/TH/{path.rsplit("/", 1)[-1]}?X-Amz-Signature=abc')
            self.end_headers()
            return
        self._json(404, {'detail': 'not found'})

    def log_message(self, *a):
        pass


class Store(http.server.BaseHTTPRequestHandler):
    def do_GET(self):
        name = self.path.split('?')[0].rsplit('/', 1)[-1]
        STATE['store_hits'].append(name)
        STATE['store_keys'].append(self.headers.get('X-API-Key'))
        b = FILES.get(name)
        if b is None:
            self.send_response(404)
            self.end_headers()
            return
        self.send_response(200)
        self.send_header('Content-Type', 'image/tiff')
        self.send_header('Content-Length', str(len(b)))
        self.end_headers()
        self.wfile.write(b)

    def log_message(self, *a):
        pass


class Client(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        os.environ['no_proxy'] = os.environ['NO_PROXY'] = ','.join(filter(None, [os.environ.get('no_proxy'), '127.0.0.1,localhost']))
        cls.api = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Api)
        cls.sto = http.server.ThreadingHTTPServer(('127.0.0.1', 0), Store)
        Api.store = f'http://127.0.0.1:{cls.sto.server_address[1]}'
        for s in (cls.api, cls.sto):
            threading.Thread(target=s.serve_forever, daemon=True).start()
        cls.base = f'http://127.0.0.1:{cls.api.server_address[1]}/api'

    @classmethod
    def tearDownClass(cls):
        for s in (cls.api, cls.sto):
            s.shutdown()
            s.server_close()

    def setUp(self):
        self.raw = tempfile.mkdtemp(prefix='suhl-egd-')
        self.lines = []
        for k in ('api_hits', 'store_hits', 'store_keys'):
            STATE[k].clear()
        STATE['quota_after'], STATE['files_served'] = None, 0

    def tearDown(self):
        shutil.rmtree(self.raw)

    def client(self, key=KEY):
        return EG.Easygeodata(key=key, raw=self.raw, pause=0, base=self.base, log=lambda *a: self.lines.append(' '.join(str(q) for q in a)))

    def test_fetch_names_and_second_run(self):
        egd = self.client()
        rep = egd.fetch_many('dgm', [(618, 5607), (619, 5607), (619, 5608)])
        self.assertEqual((rep['present'], rep['fetched'], rep['cached'], rep['stopped'], rep['failed'], rep['missing']), (3, 3, 0, None, {}, []))
        p = os.path.join(self.raw, 'dgm1', 'dgm1_32_619_5607.zip')
        self.assertEqual(EG.raw_path(self.raw, 'dgm', 619, 5607), p)
        self.assertTrue(os.path.exists(p))
        with zipfile.ZipFile(p) as z:
            self.assertEqual(z.namelist(), ['dgm1_32_619_5607.tif'])
            self.assertEqual(z.read('dgm1_32_619_5607.tif'), FILES['dgm1_32_619_5607.tif'])
        self.assertEqual(STATE['store_keys'], [None, None, None])                 # the key never goes to the second server
        self.assertEqual(STATE['api_hits'].count('/api/dgm/tiles'), 1)
        man = S.read_json(os.path.join(self.raw, 'egd', 'manifest.json'))
        self.assertEqual(sorted(man['files']), ['dgm/618_5607', 'dgm/619_5607', 'dgm/619_5608'])
        self.assertEqual(man['files']['dgm/619_5607']['befliegung_bis'], '2025-12-31')
        self.assertEqual(egd.data_stand('dgm'), '2020–2025')
        src = egd.sources_entry('dgm')
        self.assertEqual((src['id'], src['via'], src['date'], src['licence']), ('dgm1', 'bezogen über easygeodata.de', '2020–2025', 'CC BY 4.0'))
        n = len(STATE['api_hits'])
        rep = self.client().fetch_many('dgm', [(618, 5607), (619, 5607), (619, 5608)])   # a second run asks nothing
        self.assertEqual((rep['present'], rep['fetched'], rep['cached'], len(STATE['api_hits'])), (3, 0, 3, n))
        for root, _, files in os.walk(self.raw):                                  # the key is in no file
            for fn in files:
                self.assertNotIn(KEY.encode(), S.read_bytes(os.path.join(root, fn)))
        self.assertFalse(any(KEY in ln for ln in self.lines))

    def test_no_key_and_wrong_key(self):
        egd = self.client(key='')
        self.assertFalse(egd.available())
        rep = egd.fetch_many('dgm', [(619, 5607)])
        self.assertEqual((rep['present'], rep['fetched']), (0, 0))
        self.assertIn('no key', rep['stopped'])
        self.assertEqual(STATE['api_hits'], [])                                   # nothing was asked
        self.assertTrue(any('SKIPPED' in ln for ln in self.lines))
        rep = self.client(key='egd_wrong').fetch_many('dgm', [(619, 5607), (619, 5608)])
        self.assertEqual(rep['present'], 0)
        self.assertIn('401', rep['stopped'])
        self.assertIn('key is not accepted', rep['stopped'])
        self.assertEqual(len(STATE['api_hits']), 1)                               # one refused call, then silence
        self.assertFalse(any('egd_wrong' in ln for ln in self.lines))

    def test_quota_stops_politely_and_next_run_continues(self):
        STATE['quota_after'] = 1
        rep = self.client().fetch_many('dgm', [(618, 5607), (619, 5607), (619, 5608)])
        self.assertEqual((rep['present'], rep['fetched']), (1, 1))
        self.assertIn('kontingent', rep['stopped'])
        self.assertIn('quota', rep['stopped'])
        self.assertEqual(STATE['api_hits'].count('/api/file/dgm/TH/dgm1_32_619_5608.tif'), 0)   # not asked after the stop
        STATE['quota_after'] = None
        rep = self.client().fetch_many('dgm', [(618, 5607), (619, 5607), (619, 5608)])
        self.assertEqual((rep['present'], rep['fetched'], rep['cached'], rep['stopped']), (3, 2, 1, None))

    def test_wrong_size_not_offered_and_limit(self):
        rep = self.client().fetch_many('dgm', [(620, 5607), (700, 5700)])          # listed size differs; a tile nobody offers
        self.assertEqual(rep['present'], 0)
        self.assertIn('differs', rep['failed']['620_5607'])
        self.assertEqual(rep['missing'], ['700_5700'])
        self.assertFalse(os.path.exists(EG.raw_path(self.raw, 'dgm', 620, 5607)))
        rep = self.client().fetch_many('dgm', [(618, 5607), (619, 5607), (619, 5608)], max_mb=0.001)
        self.assertEqual(rep['fetched'], 1)
        self.assertIn('limit of this run', rep['stopped'])

    def test_only_from_actions(self):
        old = os.environ.pop('GITHUB_ACTIONS', None)
        try:
            egd = EG.Easygeodata(key=KEY, raw=self.raw)                            # the real address, outside a workflow
            self.assertFalse(egd.available())
            self.assertIn('GitHub Actions only', egd.stopped)
            self.assertEqual(egd.tiles('dgm'), {})
        finally:
            if old is not None:
                os.environ['GITHUB_ACTIONS'] = old

    def test_lists(self):
        self.assertEqual(EG.tile_from_key('32_619_5607'), (619, 5607))
        p1 = EG.prio_tiles(['P1'])
        self.assertEqual(len(p1), 8)
        self.assertIn((619, 5607), p1)
        self.assertEqual((len(EG.prio_tiles(['P2'])), len(EG.prio_tiles(['P3'])), len(EG.prio_tiles(['P4']))), (49, 136, 35))   # kacheln.json
        self.assertEqual(sorted(S.area('zentrum').state_tiles_1km(300)), sorted(p1))
        self.assertEqual(sorted(S.area('stadt').state_tiles_1km(0)), sorted(EG.prio_tiles(['P1', 'P2', 'P3'])))
        self.assertTrue(set(EG.prio_tiles(['P1', 'P2'])) <= set(S.area('kernstadt').state_tiles_1km(300)))

    @unittest.skipUnless(have('tifffile') and have('numpy') and have('imagecodecs'), 'numpy, tifffile, imagecodecs not installed')
    def test_tools_welt_reads_it(self):
        egd = self.client()
        egd.fetch_many('dgm', [(619, 5607)])
        path_before = list(sys.path)
        a, e0, n1, px = egd.read('dgm', 619, 5607)
        self.assertEqual(sys.path, path_before)                                    # the caller's import path is untouched
        self.assertEqual((a.shape, e0, n1, px), ((40, 40), 619000.0, 5608000.0, 25.0))
        self.assertEqual(float(a[0, 0]), 400.0)
        self.assertIsNone(egd.read('dgm', 1, 1))


if __name__ == '__main__':
    unittest.main(verbosity=1)
