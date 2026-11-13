#!/usr/bin/env python3
"""Probe of the easygeodata.de API from GitHub Actions (stage 2 of the Suhl plan, package S2-0, step 4 of the brief suhl-daten).

    EASYGEODATA_KEY=<secret> python3 -I tools/suhl/daten/easygeodata_probe.py [--out <dir>] [--phase docs|suhl|tile|all]

Rules it keeps (docs/plans/auftraege/suhl-stufe2.md): only through the site's API with the key, only from GitHub Actions, never
scraping; polite (our User-Agent, a pause between calls, few calls); the key never reaches the log, a file or an artifact - this
repository is public, so its logs and artifacts are too. For the same reason the answers are not dumped: the script prints status
classes, sizes, the documented paths and parameters, the lines of the documentation about limits, terms and attribution, and
addresses without their query strings.

Without the key it says so and ends with status 0 (a missing secret is not a failed run).
"""
import argparse, html, json, os, re, sys, time, urllib.parse

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'lib'))
import suhllib as S   # noqa: E402

KEY = (os.environ.get('EASYGEODATA_KEY') or '').strip()
BASE = os.environ.get('EASYGEODATA_BASE') or 'https://easygeodata.de'      # EASYGEODATA_BASE: a local stand-in for the test of this script
PAUSE = 2.0
RESULT = {'made': S.now(), 'base': BASE, 'calls': [], 'facts': {}}


def scrub(s):
    """no key, no query strings with signatures, no e-mail addresses in anything we print or keep"""
    if not isinstance(s, str):
        s = str(s)
    if KEY:
        s = s.replace(KEY, '***').replace(urllib.parse.quote(KEY, safe=''), '***')
    s = re.sub(r'(?i)(bearer|token|apikey|api[_-]?key|key|signature|sig|x-amz-[a-z-]+)=[^&\s"\'<>]+', r'\1=***', s)
    return re.sub(r'[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', '<e-mail>', s)


def say(*a):
    print(scrub(' '.join(str(q) for q in a)), flush=True)


def no_query(url):
    u = urllib.parse.urlsplit(url)
    return urllib.parse.urlunsplit((u.scheme, u.netloc, u.path, '', '')) + ('?…' if u.query else '')


def auth_headers(style='both'):
    h = {'Accept': 'application/json, text/html;q=0.8, */*;q=0.5'}
    if style in ('both', 'bearer'):
        h['Authorization'] = f'Bearer {KEY}'
    if style in ('both', 'x'):
        h['X-API-Key'] = KEY
    return h


def call(path, style='both', note='', tries=2, timeout=120):
    """one polite call; returns (status, body, content type). Records status class, size, type and the rate-limit headers."""
    url = path if path.startswith('http') else BASE + path
    st, body, ct, _ = S.http_get(url, headers=auth_headers(style) if style else {'Accept': '*/*'}, tries=tries, timeout=timeout, pause=PAUSE, quiet=True)
    hd = {k: v for k, v in S.last_headers.items() if any(w in k for w in ('ratelimit', 'rate-limit', 'retry-after', 'x-quota', 'x-limit',
                                                                           'content-length', 'content-encoding', 'content-disposition',
                                                                           'last-modified', 'cache-control', 'server', 'location', 'www-authenticate'))}
    rec = {'url': no_query(url), 'auth': style or 'none', 'status': st, 'type': ct.split(';')[0], 'bytes': len(body), 'headers': hd, 'note': note}
    RESULT['calls'].append(rec)
    say(f'  {st or "no answer"}  {no_query(url)}  [{rec["type"]}, {len(body)} bytes, key: {style or "not sent"}] {note}')
    for k, v in sorted(hd.items()):
        if 'limit' in k or 'retry' in k or 'quota' in k or k in ('www-authenticate', 'location', 'content-disposition'):
            say(f'      {k}: {v}')
    return st, body, ct


def text_of(body, ct):
    t = body.decode('utf-8', 'replace')
    if 'html' in ct or t.lstrip()[:1] == '<':
        t = re.sub(r'(?is)<(script|style)\b.*?</\1>', ' ', t)
        t = re.sub(r'(?s)<[^>]+>', '\n', t)
        t = html.unescape(t)
    return re.sub(r'[ \t\r\f\v]+', ' ', re.sub(r'\n\s*\n+', '\n', t)).strip()


KEYWORDS = re.compile(r'(?i)limit|rate|quota|kontingent|pro (minute|stunde|tag)|per (minute|hour|day)|anfragen|requests|lizenz|licen[cs]e|namensnennung|'
                      r'attribution|quelle|nutzungsbedingungen|terms|agb|api[- ]?key|schl(ü|ue)ssel|authorization|bearer|header|user-agent|kachel|tile|'
                      r'cog|geotiff|ndom|dgm1|dom1|format|parallel|gleichzeitig|concurrent|cache|fair|script|skript|bot|crawler|kostenlos|free|bbox|ags|gemeinde')


def show_text(title, t, head=1800, lines=70):
    say(f'--- {title}: {len(t)} characters; the beginning:')
    say(t[:head])
    hits = [ln.strip() for ln in t.split('\n') if KEYWORDS.search(ln) and 12 <= len(ln.strip()) <= 420]
    seen, out = set(), []
    for ln in hits:
        if ln not in seen:
            seen.add(ln)
            out.append(ln)
    say(f'--- {title}: {len(out)} lines about key, limits, terms, formats (the first {lines}):')
    for ln in out[:lines]:
        say('   | ' + ln)


def show_openapi(spec):
    info = spec.get('info', {})
    say(f'--- OpenAPI {spec.get("openapi") or spec.get("swagger")}: {info.get("title")} {info.get("version")}')
    if info.get('description'):
        show_text('API description', text_of(info['description'].encode(), 'text/plain'), head=2500, lines=60)
    sec = (spec.get('components') or {}).get('securitySchemes') or spec.get('securityDefinitions') or {}
    say('--- how the key is sent (securitySchemes):', json.dumps(sec, ensure_ascii=False)[:1200])
    say('--- servers:', json.dumps(spec.get('servers', []), ensure_ascii=False)[:400])
    paths = spec.get('paths') or {}
    say(f'--- {len(paths)} paths:')
    out = {}
    for p, ops in paths.items():
        for m, op in ops.items():
            if m.lower() not in ('get', 'post', 'put', 'delete', 'head', 'patch') or not isinstance(op, dict):
                continue
            pars = [f'{q.get("name")}({q.get("in")}{", required" if q.get("required") else ""})' for q in op.get('parameters', []) if isinstance(q, dict)]
            desc = text_of(((op.get('summary') or '') + ' – ' + (op.get('description') or '')).encode(), 'text/plain').replace('\n', ' ')
            say(f'   {m.upper():6s} {p}  [{", ".join(pars)}]  {desc[:600]}')
            out[f'{m.upper()} {p}'] = {'parameters': pars, 'summary': (op.get('summary') or '')[:200], 'security': op.get('security')}
    RESULT['facts']['openapi_paths'] = out
    RESULT['facts']['security_schemes'] = sec
    return paths


def phase_docs():
    """read the documentation of the API, as the site asks of script users"""
    say('== 1. robots.txt (public): what the site says to programs')
    st, body, ct = call('/robots.txt', style=None)
    if st == 200:
        t = body.decode('utf-8', 'replace')
        say('\n'.join('   | ' + ln for ln in t.split('\n')[:60]))
        RESULT['facts']['robots_api'] = [ln.strip() for ln in t.split('\n') if 'api' in ln.lower()][:10]
    say('== 2. the documentation of the API, with the key')
    spec = None
    for path in ('/api/docs', '/api/openapi.json'):          # the documentation the site names, and the usual place of its machine-readable form
        st, body, ct = call(path, note='documentation')
        if st == 0:
            continue
        if st in (401, 403):
            say('   the answer to the refused call (beginning):', text_of(body, ct)[:700])
        if 'json' in ct:
            try:
                d = json.loads(body.decode('utf-8'))
            except Exception:
                d = None
            if isinstance(d, dict) and d.get('paths'):
                spec = d
                break
            if d is not None:
                say('   JSON:', json.dumps(d, ensure_ascii=False)[:1500])
        elif st == 200:
            t = text_of(body, ct)
            show_text(path, t)
            raw = body.decode('utf-8', 'replace')
            m = re.search(r'''["'](/[A-Za-z0-9_./-]*openapi[A-Za-z0-9_./-]*\.json)["']''', raw) or re.search(r'''url:\s*["']([^"']+)["']''', raw)
            links = sorted(set(re.findall(r'''(?:href|src)=["'](/api/[^"'#?]*)''', raw)))[:40]
            if links:
                say('   links below /api/ on that page:', ', '.join(links))
            if m and spec is None:
                st2, b2, ct2 = call(m.group(1), note='the OpenAPI description named by the page')
                try:
                    d = json.loads(b2.decode('utf-8'))
                    if isinstance(d, dict) and d.get('paths'):
                        spec = d
                        break
                except Exception:
                    pass
    if spec:
        show_openapi(spec)
    else:
        say('   no machine-readable description (OpenAPI) found - the text above is what there is')
    RESULT['facts']['openapi'] = bool(spec)
    return spec


AGS_SUHL = '16054000'            # the municipality (kreisfreie Stadt) Suhl, gebiete.geojson
TILE = (619, 5607)               # the 1-km tile with the Markt: 74 % of the Zentrum lie in it (kacheln.json)


def api_get(path, params=None, note=''):
    """a data call as the documentation describes it: the key in the header X-API-Key, base /api"""
    q = ('?' + urllib.parse.urlencode(params)) if params else ''
    return call('/api' + path + q, style='x', note=note)


def describe(spec, path):
    """the full documentation of one path: description, parameters with their descriptions, the answer's fields"""
    op = ((spec.get('paths') or {}).get(path) or {}).get('get') or {}
    say(f'--- documentation of GET {path}:')
    say('   ' + text_of((op.get('description') or op.get('summary') or '').encode(), 'text/plain').replace('\n', '\n   ')[:5000])
    for q in op.get('parameters', []):
        sch = q.get('schema') or {}
        say(f'   parameter {q.get("name")} ({q.get("in")}{", required" if q.get("required") else ""}): '
            f'{json.dumps(sch, ensure_ascii=False)[:500]} – {text_of((q.get("description") or "").encode(), "text/plain")[:900]}')
    for code, r in (op.get('responses') or {}).items():
        say(f'   answer {code}: {(r.get("description") or "")[:200]} {json.dumps(r.get("content", {}), ensure_ascii=False)[:600]}')


def shape_of(v, depth=0):
    """the structure of a JSON answer without its content: keys, types, list lengths"""
    if isinstance(v, dict):
        if depth >= 3:
            return '{…}'
        return '{' + ', '.join(f'{k}: {shape_of(q, depth + 1)}' for k, q in list(v.items())[:40]) + '}'
    if isinstance(v, list):
        return f'[{len(v)} × {shape_of(v[0], depth + 1) if v else "?"}]'
    if isinstance(v, str):
        return 'str'
    return type(v).__name__


def find_tiles(doc):
    """the list of tiles inside an answer of /…/tiles, wherever it sits"""
    if isinstance(doc, list):
        return doc
    if isinstance(doc, dict):
        for k in ('tiles', 'kacheln', 'features', 'items', 'results', 'data'):
            if isinstance(doc.get(k), list):
                return doc[k]
        for v in doc.values():
            if isinstance(v, list) and v and isinstance(v[0], dict):
                return v
    return []


def tile_name(t):
    """something that names the tile: an id, a name or the last part of its address"""
    for k in ('name', 'id', 'kachel', 'tile', 'datei', 'file', 'filename'):
        if isinstance(t.get(k), str):
            return t[k]
    for k, v in t.items():
        if isinstance(v, str) and '/api/file/' in v:
            return v.split('?')[0].rsplit('/', 1)[-1]
    return ''


def tile_url(t):
    for k in ('url', 'href', 'download', 'download_url', 'link'):
        if isinstance(t.get(k), str):
            return t[k]
    for v in t.values():
        if isinstance(v, str) and ('/api/file/' in v or v.startswith('http')):
            return v
    return None


def phase_suhl(spec):
    """what the API offers for the municipality of Suhl: the tile lists of DGM1, DOM1, nDOM1"""
    say('== 3. the rest of the documentation that matters for tiles')
    d = text_of(((spec.get('info') or {}).get('description') or '').encode(), 'text/plain')
    say('--- API description from character 2300 on:')
    say(d[2300:9000])
    for path in ('/dgm/tiles', '/ndom/tiles', '/dgm/mosaic'):
        describe(spec, path)
    sch = (spec.get('components') or {}).get('schemas') or {}
    say('--- schemas:', ', '.join(sorted(sch))[:1500])
    for name, sc in sch.items():
        if any(w in name.lower() for w in ('tile', 'kachel', 'dgm', 'dom', 'error', 'fehler')):
            say(f'   schema {name}: {json.dumps(sc, ensure_ascii=False)[:1800]}')
    say('== 4. the tile lists for Suhl (ags 16054000)')
    lists = {}
    for prod in ('dgm', 'dom', 'ndom'):
        st, body, ct = api_get(f'/{prod}/tiles', {'ags': AGS_SUHL, 'level': 'gemeinde'}, note=f'{prod}: tiles of the municipality of Suhl')
        if st != 200:
            say('   answer (beginning):', text_of(body, ct)[:900])
            RESULT['facts'][prod] = {'status': st, 'answer': scrub(text_of(body, ct)[:400])}
            continue
        try:
            doc = json.loads(body.decode('utf-8'))
        except Exception as ex:
            say('   not JSON:', ex)
            continue
        say('   structure:', shape_of(doc)[:3000])
        if isinstance(doc, dict):
            top = {k: v for k, v in doc.items() if not isinstance(v, (list, dict)) or (isinstance(v, dict) and len(json.dumps(v)) < 600)}
            say('   top-level values:', json.dumps(top, ensure_ascii=False)[:2500])
        tl = find_tiles(doc)
        lists[prod] = tl
        fact = {'status': 200, 'tiles': len(tl), 'bytes_of_answer': len(body)}
        if tl and isinstance(tl[0], dict):
            if isinstance(tl[0].get('properties'), dict) and 'geometry' in tl[0]:      # GeoJSON features
                tl = lists[prod] = [dict(t['properties']) for t in tl]
            say(f'   {len(tl)} tiles; the fields of one: {sorted(tl[0])}')
            for t in tl[:2]:
                say('   example:', json.dumps({k: (no_query(v) if isinstance(v, str) and ('/' in v) else v) for k, v in t.items()
                                              if not isinstance(v, (dict, list)) or len(json.dumps(v)) < 300}, ensure_ascii=False)[:1500])
            for k in sorted(tl[0]):
                vals = [t.get(k) for t in tl]
                if all(isinstance(v, (int, float)) and not isinstance(v, bool) for v in vals) and vals:
                    say(f'   field {k}: min {min(vals)}, max {max(vals)}, sum {sum(vals)}')
                    fact[f'sum_{k}'] = sum(vals)
                elif all(isinstance(v, (str, type(None))) for v in vals) and len(set(vals)) <= 12:
                    cnt = {}
                    for v in vals:
                        cnt[str(v)] = cnt.get(str(v), 0) + 1
                    say(f'   field {k}: {json.dumps(cnt, ensure_ascii=False)[:600]}')
                    fact[f'values_{k}'] = cnt
            names = [tile_name(t) for t in tl]
            hit = [n for n in names if f'{TILE[0]}_{TILE[1]}' in n or f'{TILE[0]}{TILE[1]}' in n]
            say(f'   names look like: {names[:3]}; the tile {TILE[0]}/{TILE[1]}: {hit[:3] or "not found by name"}')
            fact['example_names'] = names[:3]
            fact['has_619_5607'] = bool(hit)
        RESULT['facts'][prod] = fact
    return lists


def fetch_file(url, dest):
    """download one tile as the documentation says: /api/file/... with the key answers with a redirect to an address that is valid
    for 15 minutes; that second address gets NO key (it may be another server). Returns (ok, facts)."""
    import urllib.request, urllib.error

    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, *a, **k):
            return None

    full = url if url.startswith('http') else BASE + url
    time.sleep(PAUSE)
    opener = urllib.request.build_opener(NoRedirect)
    req = urllib.request.Request(full, headers={'User-Agent': S.UA, 'X-API-Key': KEY, 'Accept': '*/*'})
    facts = {'file_url': no_query(full)}
    try:
        with opener.open(req, timeout=120) as r:
            st, loc, body, hd = r.status, r.headers.get('location'), r.read(), dict(r.headers.items())
    except urllib.error.HTTPError as ex:
        st, loc, body, hd = ex.code, ex.headers.get('location') if ex.headers else None, ex.read()[:3000], dict(ex.headers.items()) if ex.headers else {}
    facts['first_status'] = st
    lim = {k: v for k, v in hd.items() if any(w in k.lower() for w in ('limit', 'quota', 'kontingent', 'retry', 'remaining'))}
    say(f'   {st}  {no_query(full)}  [key: X-API-Key]  location: {no_query(loc) if loc else "–"}  {json.dumps(lim)}')
    if st in (301, 302, 303, 307, 308) and loc:
        target = urllib.parse.urljoin(full, loc)
        facts['redirect_host'] = urllib.parse.urlsplit(target).netloc
        same = urllib.parse.urlsplit(target).netloc == urllib.parse.urlsplit(full).netloc
        req2 = urllib.request.Request(target, headers={'User-Agent': S.UA, 'Accept': '*/*'})      # no key for the second address
        try:
            with urllib.request.urlopen(req2, timeout=300) as r:
                st2, body, ct2 = r.status, r.read(), r.headers.get('content-type', '')
                hd2 = dict(r.headers.items())
        except urllib.error.HTTPError as ex:
            st2, body, ct2, hd2 = ex.code, ex.read()[:2000], '', {}
        facts.update(second_status=st2, second_type=ct2, same_host=same)
        say(f'   {st2}  {no_query(target)}  [no key; {"same" if same else "other"} server]  {ct2}, {len(body)} bytes, '
            f'{hd2.get("Content-Disposition", "")} {hd2.get("Last-Modified", "")}')
        if st2 != 200:
            say('   answer (beginning):', text_of(body, ct2)[:500])
            return False, facts
    elif st != 200:
        say('   answer (beginning):', text_of(body, hd.get('Content-Type', ''))[:900])
        facts['answer'] = scrub(text_of(body, hd.get('Content-Type', ''))[:400])
        return False, facts
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    with open(dest, 'wb') as f:
        f.write(body)
    facts['bytes'] = len(body)
    facts['magic'] = body[:4].hex()
    return True, facts


def inspect_tif(path):
    """the layout of a GeoTIFF: size, type, compression, tiling, georeference, value range"""
    import numpy as np
    import tifffile
    out = {}
    with tifffile.TiffFile(path) as t:
        pg = t.pages[0]
        out.update(shape=list(pg.shape), dtype=str(pg.dtype), compression=str(pg.compression), predictor=str(getattr(pg, 'predictor', '')),
                   tiled=bool(pg.is_tiled), tile=[int(getattr(pg, 'tilelength', 0) or 0), int(getattr(pg, 'tilewidth', 0) or 0)],
                   pages=len(t.pages), overviews=[list(p.shape) for p in t.pages[1:6]], bigtiff=bool(t.is_bigtiff))
        tags = {tg.name: tg.value for tg in pg.tags.values() if tg.name in ('ModelPixelScaleTag', 'ModelTiepointTag', 'GDAL_NODATA', 'GeoKeyDirectoryTag',
                                                                           'GeoAsciiParamsTag', 'GDAL_METADATA', 'Software', 'ImageDescription')}
        out['pixel'] = [float(v) for v in tags.get('ModelPixelScaleTag', ())][:2]
        out['tiepoint'] = [float(v) for v in tags.get('ModelTiepointTag', ())][:6]
        out['nodata'] = str(tags.get('GDAL_NODATA', ''))
        gk = tags.get('GeoKeyDirectoryTag', ())
        keys = {int(gk[q]): int(gk[q + 3]) for q in range(4, len(gk), 4)} if gk else {}
        out['epsg'] = keys.get(3072) or keys.get(2048)
        out['raster_type'] = {1: 'area', 2: 'point'}.get(keys.get(1025), str(keys.get(1025)))
        out['vertical'] = keys.get(4096)
        out['geo_ascii'] = str(tags.get('GeoAsciiParamsTag', ''))[:200]
        out['gdal_metadata'] = str(tags.get('GDAL_METADATA', ''))[:600]
        a = pg.asarray()
    nod = None
    try:
        nod = float(out['nodata'])
    except ValueError:
        pass
    v = a.astype('float64')
    bad = ~np.isfinite(v) | ((v == nod) if nod is not None else False) | (v < -1000)
    out.update(min=float(v[~bad].min()) if (~bad).any() else None, max=float(v[~bad].max()) if (~bad).any() else None,
               mean=float(v[~bad].mean()) if (~bad).any() else None, nodata_cells=int(bad.sum()),
               decimals_mm=float(np.abs(v[~bad] * 1000 - np.round(v[~bad] * 1000)).max()) if (~bad).any() else None)
    return out


def phase_tile(lists):
    """one real download: DGM1 of the tile with the Markt - the proof of the path and the layout of the file"""
    say(f'== 5. one tile: DGM1 {TILE[0]}/{TILE[1]}')
    work = os.environ.get('RUNNER_TEMP') or '/tmp'
    raw = os.path.join(work, 'suhl-raw')
    for prod, kind in (('dgm', 'dgm'), ('ndom', 'ndom')):
        tl = lists.get(prod) or []
        cand = [t for t in tl if isinstance(t, dict) and (f'{TILE[0]}_{TILE[1]}' in tile_name(t) or f'{TILE[0]}_{TILE[1]}' in (tile_url(t) or ''))]
        if not cand:
            say(f'   {prod}: the tile {TILE[0]}/{TILE[1]} was not found in the list - nothing downloaded')
            continue
        url = tile_url(cand[0])
        tif = os.path.join(raw, 'egd', f'{kind}1_32_{TILE[0]}_{TILE[1]}.tif')
        ok, facts = fetch_file(url, tif)
        RESULT['facts'][f'{prod}_tile'] = facts
        if not ok:
            continue
        try:
            lay = inspect_tif(tif)
            facts['layout'] = lay
            say(f'   {prod} file: {facts["bytes"]} bytes, {json.dumps(lay, ensure_ascii=False)[:1800]}')
        except Exception as ex:
            say(f'   {prod} file: {facts["bytes"]} bytes, starts {facts["magic"]}; could not be read as GeoTIFF: {ex!r}')
            continue
        if prod == 'dgm':                 # does tools/welt read it under the name it expects?
            import zipfile
            sys.path.insert(0, os.path.join(S.REPO, 'tools', 'welt'))
            import fetch as WF
            zp = WF.dgm1_path(raw, 'dgm', TILE[0], TILE[1])
            os.makedirs(os.path.dirname(zp), exist_ok=True)
            with zipfile.ZipFile(zp, 'w', zipfile.ZIP_STORED) as z:
                z.write(tif, os.path.basename(tif))
            got = WF.fetch_dgm1(raw, 'dgm', TILE[0], TILE[1])
            arr, e0, n1, px = WF.read_dgm1(got)
            import numpy as np
            facts['read_dgm1'] = {'zip': os.path.relpath(zp, raw), 'shape': list(arr.shape), 'e0': e0, 'n1': n1, 'px': px,
                                  'min': float(np.nanmin(arr)), 'max': float(np.nanmax(arr)), 'nan': int(np.isnan(arr).sum())}
            say(f'   tools/welt/fetch.py read_dgm1({os.path.relpath(zp, raw)}): {json.dumps(facts["read_dgm1"])}')
            fits = e0 == TILE[0] * 1000.0 and n1 == (TILE[1] + 1) * 1000.0 and px == 1.0 and arr.shape == (1000, 1000)
            say(f'   fits the 1-km tile E {TILE[0]} km, N {TILE[1]} km exactly: {fits}')
            facts['fits_tools_welt'] = bool(fits)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default=os.path.join(S.REPO, 'tools', 'suhl', 'out', 'daten'))
    ap.add_argument('--phase', default='docs')
    a = ap.parse_args()
    if not KEY:
        say('EASYGEODATA: the secret EASYGEODATA_KEY is empty or not set in this repository (Settings → Secrets and variables → Actions; '
            'the name must be exactly EASYGEODATA_KEY). Nothing was asked of easygeodata.de.')
        RESULT['facts']['key'] = 'missing'
    else:
        say(f'EASYGEODATA: the key is set ({len(KEY)} characters). User-Agent: {S.UA}')
        RESULT['facts']['key'] = 'set'
        RESULT['facts']['key_length'] = len(KEY)
        spec = phase_docs()
        if spec and a.phase in ('suhl', 'tile', 'all'):
            lists = phase_suhl(spec)
            if a.phase in ('tile', 'all'):
                phase_tile(lists)
    os.makedirs(a.out, exist_ok=True)
    with open(os.path.join(a.out, 'easygeodata_probe.json'), 'w', encoding='utf-8') as f:
        f.write(scrub(json.dumps(RESULT, ensure_ascii=False, indent=1)) + '\n')
    sp = os.environ.get('GITHUB_STEP_SUMMARY')
    if sp:
        with open(sp, 'a', encoding='utf-8') as f:
            f.write('### easygeodata-Probe\n\n')
            f.write('- Schlüssel: ' + ('gesetzt' if KEY else '**fehlt** (Geheimnis EASYGEODATA_KEY) – nichts abgefragt') + '\n')
            for c in RESULT['calls']:
                f.write(scrub(f"- HTTP {c['status']} · {c['url']} · {c['type']} · {c['bytes']} Bytes · {c['note']}\n"))
    return 0


if __name__ == '__main__':
    sys.exit(main())
