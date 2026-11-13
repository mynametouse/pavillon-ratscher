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
        if a.phase in ('docs', 'all'):
            phase_docs()
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
