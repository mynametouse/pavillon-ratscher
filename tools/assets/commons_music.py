# polite Wikimedia Commons search for public-domain music recordings (one request every ~25 s)
import json, time, urllib.parse, urllib.request, ssl, os, sys
UA = 'PavillonRatscher/1.0 (private non-commercial garden model; https://github.com/mynametouse/pavillon-ratscher)'
CTX = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt')
OUT = sys.argv[1]
px = os.environ.get('HTTPS_PROXY')
op = urllib.request.build_opener(urllib.request.ProxyHandler({'https': px, 'http': px}), urllib.request.HTTPSHandler(context=CTX))
def api(params):
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({**params, 'format': 'json', 'maxlag': 5})
    for k in range(6):
        try:
            r = op.open(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=40)
            return json.loads(r.read())
        except urllib.error.HTTPError as e:
            ra = int(e.headers.get('retry-after') or 30); print('HTTP', e.code, 'wait', ra, flush=True); time.sleep(ra + 5)
        except Exception as e:
            print('ERR', e, flush=True); time.sleep(30)
    return None
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
Q = ['King Porter Stomp', 'Jelly Roll Morton piano', 'Maple Leaf Rag', 'Clair de lune Debussy', 'Nocturne op. 9 no. 2 Chopin', 'Gymnopedie No. 1', 'Gnossienne', 'Arabesque Debussy', 'Joplin rag piano roll', 'The Entertainer Joplin']
for q in Q:
    if q in res: continue
    d = api({'action': 'query', 'list': 'search', 'srnamespace': 6, 'srlimit': 20, 'srsearch': q})
    time.sleep(25)
    if not d: continue
    titles = [r['title'] for r in d['query']['search'] if r['title'].lower().endswith(('.ogg', '.oga', '.mp3', '.flac', '.wav', '.opus'))]
    info = {}
    if titles:
        d2 = api({'action': 'query', 'prop': 'imageinfo', 'iiprop': 'url|size|extmetadata|mediatype|metadata', 'titles': '|'.join(titles[:12])})
        time.sleep(25)
        if d2:
            for p in d2['query']['pages'].values():
                ii = (p.get('imageinfo') or [{}])[0]; em = ii.get('extmetadata', {})
                md = {m['name']: m['value'] for m in (ii.get('metadata') or []) if isinstance(m, dict) and 'name' in m}
                info[p['title']] = {'url': ii.get('url'), 'size': ii.get('size'), 'lic': em.get('LicenseShortName', {}).get('value'), 'artist': em.get('Artist', {}).get('value'), 'date': em.get('DateTimeOriginal', {}).get('value'), 'desc': (em.get('ImageDescription', {}).get('value') or '')[:300], 'length': md.get('length') or md.get('playtime_seconds')}
    res[q] = info; json.dump(res, open(OUT, 'w'), indent=1, ensure_ascii=False); print('done', q, len(info), flush=True)
print('ALL DONE', flush=True)
