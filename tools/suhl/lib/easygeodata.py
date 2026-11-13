#!/usr/bin/env python3
"""easygeodata.de: terrain DGM1, surface DOM1 and object heights nDOM1 (1 m) for 1-km tiles, through the site's documented API
with the key of Falko's free account (secrets.EASYGEODATA_KEY). Standard library only for fetching; reading needs numpy, tifffile
and imagecodecs (the tiles are LERC-compressed GeoTIFFs).

In a workflow (the only place it may run - rule of the Suhl project: never from the chat machine, never by scraping):

      - uses: actions/cache@v4                 # the raw folder of THIS workflow; Actions caches are per branch
        with: { path: ~/suhl-raw, key: suhl-raw-egd-v1-${{ github.run_id }}, restore-keys: suhl-raw-egd-v1- }
      - run: pip install --quiet numpy tifffile imagecodecs
      - env: { EASYGEODATA_KEY: '${{ secrets.EASYGEODATA_KEY }}' }
        run: python3 -I tools/suhl/lib/easygeodata.py --product dgm --prio P1 --raw ~/suhl-raw --report egd.json

    or from Python:   import easygeodata as EG;  egd = EG.Easygeodata(raw=RAW);  rep = egd.fetch_many('dgm', [(619, 5607), ...])

What it does, as the API description (https://easygeodata.de/api/docs, read 13.11.2026 with the key) says:
  GET /api/{dgm|dom|ndom}/tiles?ags=16054000&level=gemeinde   (or bbox=minx,miny,maxx,maxy in EPSG:4326), header X-API-Key
      -> {count, size_bytes, tiles: [{tile_key: "32_619_5607", url: ".../api/file/dgm/TH/dgm1_32_619_5607.tif", size_bytes, aktualitaet, ...}]}
  GET <url> with the key -> 302 to an address on the site's object storage that is valid for 15 minutes -> the GeoTIFF.
      The key is sent to easygeodata.de only, never to the second address.
The files land where tools/welt/fetch.py looks first (fetch_dgm1 / read_dgm1 need no change):
      <raw>/dgm1/dgm1_32_{E}_{N}.zip   <raw>/dom1/dom1_32_{E}_{N}.zip   <raw>/ndom1/ndom1_32_{E}_{N}.zip      (the GeoTIFF inside, stored)
  and <raw>/egd/manifest.json says what came when, with the data stand - for the sources of a product (sources_entry()).

Polite and bounded: our User-Agent, one call at a time, 2 s between calls, files that are there are not asked again, at most
--max-mb per run (default 1000). The free account has 20 GB per month; the whole municipality is 282 MB (DGM1), 361 MB (DOM1),
190 MB (nDOM1) in 193 tiles each. A missing key, a used-up quota or a daily limit is NOT an error of the run: the client says
so, stops asking, and the next run goes on where this one stopped. Licence of the data: (c) GDI-Th (TLBG), CC BY 4.0 / dl-de/by-2-0;
name it and add "bezogen über easygeodata.de".
"""
import argparse, csv, json, os, sys, time, urllib.error, urllib.parse, urllib.request, zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import suhllib as S   # noqa: E402

BASE = 'https://easygeodata.de/api'
AGS_SUHL = '16054000'
PRODUCTS = {'dgm': ('DGM1', 'dgm1'), 'dom': ('DOM1', 'dom1'), 'ndom': ('nDOM1', 'ndom1')}     # API name -> (title, folder and file prefix, source id)
VIA = 'bezogen über easygeodata.de'
LIST_MAX_AGE = 7 * 86400
STOP_REASONS = {'kontingent': 'the monthly quota of the account is used up (20 GB per month)',
                'tageslimit': 'the daily limit of the account is reached',
                'tageslimit_server': 'the daily limit of the server is reached',
                'schluessel': 'the key is not accepted (wrong, revoked or copied incompletely)',
                'api': 'the API refuses programs without a valid key',
                'anmeldung': 'this needs a (free) account - the key does not belong to one?',
                'groesse': 'the request is too large for the access level'}


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *a, **k):
        return None


def tile_from_key(tile_key):
    """'32_619_5607' -> (619, 5607)"""
    p = str(tile_key).split('_')
    return int(p[-2]), int(p[-1])


def raw_path(raw, product, e_km, n_km):
    """where the tile lies in the raw folder - the name tools/welt/fetch.py dgm1_path() gives for kind dgm / dom / ndom"""
    pre = PRODUCTS[product][1]
    return os.path.join(raw, pre, f'{pre}_32_{int(e_km)}_{int(n_km)}.zip')


def prio_tiles(prios, csv_path=None):
    """the 1-km tiles of the priorities P1..P4 of tools/suhl/out/bestand/kacheln.csv (suhl-bestand): [(E km, N km)] in file order"""
    path = csv_path or os.path.join(S.REPO, 'tools', 'suhl', 'out', 'bestand', 'kacheln.csv')
    want = {p.strip().upper() for p in prios}
    out = []
    with open(path, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            if r['produkt'] == 'DGM1' and r['prio'] in want:
                t = (int(r['e_km']), int(r['n_km']))
                if t not in out:
                    out.append(t)
    return out


class Easygeodata:
    def __init__(self, key=None, raw=None, pause=2.0, base=None, log=None):
        self.key = (key if key is not None else os.environ.get('EASYGEODATA_KEY') or '').strip()
        self.base = (base or os.environ.get('EASYGEODATA_BASE') or BASE).rstrip('/')
        self.raw = os.path.expanduser(raw or os.environ.get('SUHL_RAW') or '~/suhl-raw')
        self.pause = max(1.0, float(pause)) if self.base == BASE else float(pause)
        self.log = log or S.log
        self.stopped = None            # the reason why no further call is made in this run
        self._last = 0.0
        self.calls = 0
        if not self.key:
            self.stopped = 'no key: the secret EASYGEODATA_KEY is empty or not set'
        elif self.base == BASE and os.environ.get('GITHUB_ACTIONS') != 'true':
            self.stopped = 'easygeodata is used from GitHub Actions only (rule of the Suhl project) - this is not a workflow run'

    # ---------------------------------------------------------- plumbing
    def available(self):
        return self.stopped is None

    def _scrub(self, s):
        s = str(s)
        return s.replace(self.key, '***') if self.key else s

    def _wait(self):
        w = self._last + self.pause - time.time()
        if w > 0:
            time.sleep(w)
        self._last = time.time()
        self.calls += 1

    def _reason(self, status, body):
        """the reason of a refused call in words; sets self.stopped when asking again today is pointless"""
        grund, detail = '', ''
        try:
            d = json.loads(body.decode('utf-8'))
            grund, detail = str(d.get('grund') or ''), str(d.get('detail') or '')[:300]
        except Exception:
            detail = body[:200].decode('utf-8', 'replace')
        why = STOP_REASONS.get(grund)
        if why or status in (401, 402, 403, 429):
            self.stopped = f'HTTP {status}{" (" + grund + ")" if grund else ""}: {why or self._scrub(detail) or "refused"}'
            return self.stopped
        return f'HTTP {status}{" (" + grund + ")" if grund else ""} {self._scrub(detail)}'

    # ---------------------------------------------------------- the list of tiles
    def tiles(self, product, ags=AGS_SUHL, level='gemeinde', bbox=None):
        """{(E km, N km): {url, size_bytes, aktualitaet, befliegung_von, befliegung_bis, ...}} for a municipality (ags, level) or a
        box (lon0, lat0, lon1, lat1 in WGS84). Kept in <raw>/egd/ for a week. {} when the API cannot be asked (see self.stopped)."""
        if product not in PRODUCTS:
            raise S.SuhlError(f'unknown product {product!r} (dgm, dom, ndom)')
        q = {'bbox': ','.join(f'{v:.5f}' for v in bbox)} if bbox else {'ags': ags, 'level': level}
        tag = ('bbox_' + q['bbox'].replace(',', '_')) if bbox else f'{ags}_{level}'
        cf = os.path.join(self.raw, 'egd', f'tiles_{product}_{tag}.json')
        doc = None
        if os.path.exists(cf) and time.time() - os.path.getmtime(cf) < LIST_MAX_AGE:
            try:
                doc = S.read_json(cf)
            except Exception:
                doc = None
        if doc is None:
            if not self.available():
                return {}
            self._wait()
            st, body, ct, _ = S.http_get(f'{self.base}/{product}/tiles?{urllib.parse.urlencode(q)}', headers={'X-API-Key': self.key, 'Accept': 'application/json'},
                                         tries=3, timeout=120, pause=0, quiet=True)
            if st != 200:
                self.log(f'easygeodata: list of {PRODUCTS[product][0]} tiles failed - {self._reason(st, body)}')
                return {}
            try:
                doc = json.loads(body.decode('utf-8'))
                assert isinstance(doc.get('tiles'), list)
            except Exception:
                self.log(f'easygeodata: the list of {PRODUCTS[product][0]} tiles is not the documented JSON ({len(body)} bytes)')
                return {}
            S.write_json(cf, doc)
        out = {}
        for t in doc['tiles']:
            try:
                out[tile_from_key(t['tile_key'])] = t
            except Exception:
                continue
        return out

    # ---------------------------------------------------------- one file
    def fetch(self, product, e_km, n_km, entry=None):
        """one tile into the raw folder. Returns (zip path or None, note). A file that is already there is not asked again."""
        dest = raw_path(self.raw, product, e_km, n_km)
        if os.path.exists(dest) and os.path.getsize(dest) > 2000:
            return dest, 'cached'
        if not self.available():
            return None, self.stopped
        if entry is None:
            entry = self.tiles(product).get((int(e_km), int(n_km)))
            if entry is None and self.available():
                lon0, lat0 = S.lonlat_from_utm(e_km * 1000 + 100, n_km * 1000 + 100)
                lon1, lat1 = S.lonlat_from_utm(e_km * 1000 + 900, n_km * 1000 + 900)
                entry = self.tiles(product, bbox=(lon0, lat0, lon1, lat1)).get((int(e_km), int(n_km)))
        if entry is None:
            return None, self.stopped or 'not offered: the API lists no such tile'
        url = entry['url'] if entry['url'].startswith('http') else urllib.parse.urljoin(self.base + '/', entry['url'])
        if urllib.parse.urlsplit(url).netloc != urllib.parse.urlsplit(self.base).netloc:
            return None, f'the list names an address on another server ({urllib.parse.urlsplit(url).netloc}) - not asked with the key'
        body, note = None, ''
        for k in range(3):
            self._wait()
            try:
                req = urllib.request.Request(url, headers={'User-Agent': S.UA, 'X-API-Key': self.key, 'Accept': '*/*'})
                with urllib.request.build_opener(_NoRedirect).open(req, timeout=120) as r:
                    st, loc, body = r.status, None, r.read()               # the file itself, without a redirect
            except urllib.error.HTTPError as ex:
                st, loc, body = ex.code, (ex.headers.get('location') if ex.headers else None), ex.read()[:4000]
            except Exception as ex:
                st, loc, body = 0, None, repr(ex).encode()[:300]
            if st in (301, 302, 303, 307, 308) and loc:
                target = urllib.parse.urljoin(url, loc)
                try:                                                        # the second address gets NO key: it is another server
                    req2 = urllib.request.Request(target, headers={'User-Agent': S.UA, 'Accept': '*/*'})
                    with urllib.request.urlopen(req2, timeout=300) as r:
                        st, body = r.status, r.read()
                except urllib.error.HTTPError as ex:
                    st, body = ex.code, ex.read()[:2000]
                except Exception as ex:
                    st, body = 0, repr(ex).encode()[:300]
            if st == 200 and body[:4] in (b'II*\x00', b'MM\x00*', b'II+\x00', b'MM\x00+'):
                break
            note = self._reason(st, body) if st != 200 else f'not a TIFF ({len(body)} bytes, starts {body[:8]!r})'
            body = None
            if self.stopped or st in (400, 404, 410, 422):
                break
            time.sleep(5 * (k + 1))
        if body is None:
            return None, note
        want = entry.get('size_bytes')
        if isinstance(want, int) and want != len(body):
            return None, f'size {len(body)} bytes differs from the listed {want} bytes - not kept'
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        pre = PRODUCTS[product][1]
        with zipfile.ZipFile(dest + '.part', 'w', zipfile.ZIP_STORED) as z:
            z.writestr(f'{pre}_32_{int(e_km)}_{int(n_km)}.tif', body)
        os.replace(dest + '.part', dest)
        self._manifest(product, e_km, n_km, entry, len(body))
        return dest, f'{len(body)} bytes'

    def _manifest(self, product, e_km, n_km, entry, n):
        mp = os.path.join(self.raw, 'egd', 'manifest.json')
        try:
            m = S.read_json(mp) if os.path.exists(mp) else {}
        except Exception:
            m = {}
        m.setdefault('note', 'tiles fetched through the API of easygeodata.de; data (c) GDI-Th (TLBG), CC BY 4.0 / dl-de/by-2-0')
        m.setdefault('files', {})[f'{product}/{int(e_km)}_{int(n_km)}'] = {
            'bytes': n, 'fetched': S.now(), 'url': S.redact(entry.get('url', '')).split('?')[0],
            **{k: entry.get(k) for k in ('aktualitaet', 'datum_typ', 'befliegung_von', 'befliegung_bis', 'befliegung_quelle', 'quelle_typ',
                                         'quelle_produkt', 'dgm_aktualitaet', 'abstand_tage', 'hoehe_max') if entry.get(k) is not None}}
        S.write_json(mp, m)

    # ---------------------------------------------------------- many files
    def fetch_many(self, product, tiles, max_mb=1000.0):
        """the tiles [(E km, N km)] into the raw folder, in the given order. Never raises for a missing key or a limit.
        Returns {'product', 'wanted', 'present', 'fetched', 'cached', 'bytes', 'missing': [...], 'failed': {...}, 'stopped': reason or None}"""
        tiles = [(int(e), int(n)) for e, n in tiles]
        rep = {'product': product, 'wanted': len(tiles), 'present': 0, 'fetched': 0, 'cached': 0, 'bytes': 0, 'missing': [], 'failed': {},
               'stopped': None, 'calls': 0}
        todo = [t for t in tiles if not (os.path.exists(raw_path(self.raw, product, *t)) and os.path.getsize(raw_path(self.raw, product, *t)) > 2000)]
        rep['cached'] = len(tiles) - len(todo)
        title = PRODUCTS[product][0]
        if todo and not self.available():
            rep['stopped'] = self.stopped
            rep['present'] = rep['cached']
            self.log(f'easygeodata {title}: SKIPPED - {self.stopped}. {rep["cached"]} of {len(tiles)} tiles are in the raw folder.')
            return rep
        offered = self.tiles(product) if todo else {}
        need = sum(offered[t].get('size_bytes', 0) for t in todo if t in offered)
        if todo:
            self.log(f'easygeodata {title}: {len(todo)} of {len(tiles)} tiles to fetch, about {need / 1e6:.1f} MB (limit of this run {max_mb:.0f} MB; '
                     f'the account has 20 GB per month), {self.pause:.0f} s between calls')
        fails = 0
        for t in todo:
            if rep['bytes'] / 1e6 >= max_mb:
                rep['stopped'] = f'the limit of this run ({max_mb:.0f} MB) is reached - the next run goes on'
                break
            p, note = self.fetch(product, t[0], t[1], offered.get(t))
            if p:
                rep['fetched'] += 1
                rep['bytes'] += os.path.getsize(p)
                fails = 0
                continue
            if note.startswith('not offered'):
                rep['missing'].append(f'{t[0]}_{t[1]}')
                continue
            rep['failed'][f'{t[0]}_{t[1]}'] = note
            fails += 1
            if self.stopped:
                rep['stopped'] = self.stopped
                break
            if fails >= 3:
                rep['stopped'] = f'three tiles in a row failed (last: {note}) - not asking further in this run'
                break
        rep['present'] = sum(1 for t in tiles if os.path.exists(raw_path(self.raw, product, *t)))
        rep['calls'] = self.calls
        self.log(f'easygeodata {title}: {rep["present"]} of {len(tiles)} tiles present ({rep["fetched"]} fetched, {rep["bytes"] / 1e6:.1f} MB; '
                 f'{rep["cached"]} were there; {len(rep["missing"])} not offered; {len(rep["failed"])} failed)'
                 + (f' - STOPPED: {rep["stopped"]}' if rep['stopped'] else ''))
        return rep

    # ---------------------------------------------------------- reading and sources
    def read(self, product, e_km, n_km):
        """(heights float32 [row 0 = north], E of the left edge, N of the top edge, pixel size) of a fetched tile, read with
        tools/welt/fetch.py read_dgm1; None when the tile is not in the raw folder"""
        p = raw_path(self.raw, product, e_km, n_km)
        if not os.path.exists(p):
            return None
        return read_tile(p)

    def data_stand(self, product):
        """the data stand of the fetched tiles of a product in words, from the manifest: '2020-2025' or ''"""
        mp = os.path.join(self.raw, 'egd', 'manifest.json')
        if not os.path.exists(mp):
            return ''
        f = [v for k, v in S.read_json(mp).get('files', {}).items() if k.startswith(product + '/')]
        ys = sorted({str(v.get('befliegung_von') or v.get('aktualitaet') or '')[:4] for v in f} | {str(v.get('befliegung_bis') or '')[:4] for v in f})
        ys = [y for y in ys if y]
        return ys[0] if len(ys) == 1 else (f'{ys[0]}–{ys[-1]}' if ys else '')

    def sources_entry(self, product):
        """the entry for index.json 'sources' of a product computed from these tiles"""
        import schema
        return schema.source(PRODUCTS[product][1], via=VIA, date=self.data_stand(product))


def read_tile(zip_path):
    """read a fetched tile with the reader of the world pipeline (tools/welt/fetch.py read_dgm1, unchanged)"""
    try:
        import imagecodecs   # noqa: F401
    except Exception:
        raise S.SuhlError('the tiles of easygeodata are LERC-compressed: pip install imagecodecs (next to numpy and tifffile)') from None
    import importlib.util
    spec = importlib.util.spec_from_file_location('suhl_welt_fetch', os.path.join(S.REPO, 'tools', 'welt', 'fetch.py'))
    m = sys.modules.get('suhl_welt_fetch')
    if m is None:
        m = importlib.util.module_from_spec(spec)
        saved = list(sys.path)                    # fetch.py puts its own folder on sys.path to import wlib: undo that afterwards,
        try:                                      # so that the caller's own modules (roads.py, fetch.py ...) are never shadowed
            spec.loader.exec_module(m)
        finally:
            sys.path[:] = saved
        sys.modules['suhl_welt_fetch'] = m
    return m.read_dgm1(zip_path)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--product', required=True, help='dgm, dom, ndom - several with commas')
    ap.add_argument('--raw', default=None, help='the raw folder (default $SUHL_RAW or ~/suhl-raw)')
    ap.add_argument('--prio', help='priorities of tools/suhl/out/bestand/kacheln.csv: P1 (8 tiles around the Zentrum), P2 (Kernstadt), P3, P4')
    ap.add_argument('--tiles', help='1-km tiles as E_N,E_N,... (lower-left corner in km): 619_5607,620_5607')
    ap.add_argument('--area', help='zentrum, kernstadt or stadt: the 1-km tiles touching the area (with --margin metres around it)')
    ap.add_argument('--margin', type=float, default=300.0)
    ap.add_argument('--max-mb', type=float, default=1000.0, help='stop fetching after this many MB in this run (per product)')
    ap.add_argument('--pause', type=float, default=2.0)
    ap.add_argument('--report', help='write the report as JSON')
    a = ap.parse_args()
    tiles = []
    if a.prio:
        tiles += prio_tiles(a.prio.split(','))
    if a.tiles:
        tiles += [tuple(int(v) for v in t.split('_')) for t in a.tiles.split(',') if t.strip()]
    if a.area:
        tiles += S.area(a.area).state_tiles_1km(a.margin)
    tiles = list(dict.fromkeys(tiles))
    if not tiles:
        print('nothing to fetch: give --prio, --tiles or --area', file=sys.stderr)
        return 2
    egd = Easygeodata(raw=a.raw, pause=a.pause)
    reports = [egd.fetch_many(p.strip(), tiles, max_mb=a.max_mb) for p in a.product.split(',') if p.strip()]
    if a.report:
        S.write_json(a.report, {'made': S.now(), 'raw': egd.raw, 'reports': reports}, compact=False)
    sp, op = os.environ.get('GITHUB_STEP_SUMMARY'), os.environ.get('GITHUB_OUTPUT')
    if sp:
        with open(sp, 'a', encoding='utf-8') as f:
            f.write('### easygeodata\n\n')
            for r in reports:
                f.write(f'- {PRODUCTS[r["product"]][0]}: {r["present"]} von {r["wanted"]} Kacheln vorhanden ({r["fetched"]} geholt, {r["bytes"] / 1e6:.1f} MB; '
                        f'{r["cached"]} waren da; {len(r["missing"])} nicht im Angebot; {len(r["failed"])} fehlgeschlagen)'
                        + (f' – **angehalten:** {r["stopped"]}' if r['stopped'] else '') + '\n')
    if op:
        with open(op, 'a', encoding='utf-8') as f:
            for r in reports:
                f.write(f'{r["product"]}_present={r["present"]}\n{r["product"]}_wanted={r["wanted"]}\n{r["product"]}_complete={"true" if r["present"] == r["wanted"] else "false"}\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
