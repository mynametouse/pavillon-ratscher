# One-off probe (26.10.2026): can a web page call Microsoft's speech service (Azure AI Speech REST) directly – CORS for the TTS endpoint and
# the token endpoint, with a made-up key (the answer 401 must be readable by the page). Prints what it finds; always passes.
import sys, os, json, urllib.request
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__))); import lib
port = sys.argv[1]
REG = ['westeurope', 'germanywestcentral']
FIND = []
def raw(method, url, headers, body=None):
    try:
        req = urllib.request.Request(url, data=body, method=method, headers=headers)
        with urllib.request.urlopen(req, timeout=20) as r: return r.status, dict(r.headers)
    except urllib.error.HTTPError as e: return e.code, dict(e.headers)
    except Exception as e: return str(e), {}
for reg in REG:
    for path, host in [('/cognitiveservices/v1', f'{reg}.tts.speech.microsoft.com'), ('/sts/v1.0/issueToken', f'{reg}.api.cognitive.microsoft.com')]:
        url = f'https://{host}{path}'
        st, h = raw('OPTIONS', url, {'Origin': 'https://mynametouse.github.io', 'Access-Control-Request-Method': 'POST',
                                       'Access-Control-Request-Headers': 'ocp-apim-subscription-key,content-type,x-microsoft-outputformat'})
        print('PREFLIGHT', url, st, json.dumps({k: v for k, v in h.items() if k.lower().startswith('access-control')}), flush=True)
        if reg == 'westeurope': FIND.append(f"pre-{path.split('/')[-1][:5]} {st} o={h.get('Access-Control-Allow-Origin') or h.get('access-control-allow-origin')} h={(h.get('Access-Control-Allow-Headers') or h.get('access-control-allow-headers') or '')[:40]}")
        st, h = raw('POST', url, {'Origin': 'https://mynametouse.github.io', 'Ocp-Apim-Subscription-Key': '00000000000000000000000000000000',
                                    'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3'}, b'<speak/>')
        print('POST', url, st, json.dumps({k: v for k, v in h.items() if k.lower().startswith('access-control')}), flush=True)
with lib.browser() as b:
    pg = lib.page(b, 800, 600)
    pg.goto(f'http://localhost:{port}/index.html?nogeo=1', wait_until='domcontentloaded')
    for reg in REG:
        js = """async ([reg]) => { const out = {};
          for (const [name, url, headers, body] of [
            ['tts', `https://${reg}.tts.speech.microsoft.com/cognitiveservices/v1`, { 'Ocp-Apim-Subscription-Key': '00000000000000000000000000000000', 'Content-Type': 'application/ssml+xml', 'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3' }, '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US"><voice name="de-DE-ConradNeural">Nu.</voice></speak>'],
            ['token', `https://${reg}.api.cognitive.microsoft.com/sts/v1.0/issueToken`, { 'Ocp-Apim-Subscription-Key': '00000000000000000000000000000000' }, ''],
          ]) { try { const r = await fetch(url, { method: 'POST', headers, body }); out[name] = 'status ' + r.status + ' (CORS ok)'; } catch (e) { out[name] = 'blocked: ' + e; } }
          return out; }"""
        res = pg.evaluate(js, [reg])
        print('BROWSER', reg, json.dumps(res), flush=True)
        FIND.append(f"browser-{reg} tts={res['tts'][:40]} token={res['token'][:40]}")
# the findings as the names of (failing) checks: run.py shows them in its one verdict line in the job log
# run.py shows the first three FAIL lines (300 characters) in the job log: the browser's answer first
for f in sorted(FIND, key=lambda f: not f.startswith('browser-westeurope')):
    print('FAIL ' + f.replace('status ', '').replace(' (CORS ok)', ' ok')[:95], flush=True)
print('RESULT msprobe: 0/%d ok' % len(FIND), flush=True)
sys.exit(1)
