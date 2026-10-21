# download the chosen public-domain recordings from Wikimedia Commons (slowly) and note their credits
import json, time, urllib.parse, urllib.request, ssl, os, sys, re, html
UA = 'PavillonRatscher/1.0 (private non-commercial garden model; https://github.com/mynametouse/pavillon-ratscher)'
CTX = ssl.create_default_context(cafile='/root/.ccr/ca-bundle.crt'); px = os.environ.get('HTTPS_PROXY')
op = urllib.request.build_opener(urllib.request.ProxyHandler({'https': px, 'http': px}), urllib.request.HTTPSHandler(context=CTX))
OUT = sys.argv[1]; os.makedirs(OUT, exist_ok=True)
FILES = {'gymnopedie': 'File:Erik Satie - gymnopedies - la 1 ere. lent et douloureux.ogg',
         'nocturne': 'File:Chopin - Nocturne No. 2 in E-flat major, Op. 9 No. 2 (Frank Levy).flac',
         'mapleleaf': 'File:Maple leaf rag - played by Scott Joplin 1916 V2.ogg',
         'gnossienne': 'File:Satie - Gnossienne 1.ogg'}
def get(url, tries=6):
    for k in range(tries):
        try: return op.open(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=120).read()
        except urllib.error.HTTPError as e:
            ra = int(e.headers.get('retry-after') or 30); print('HTTP', e.code, url[:80], 'wait', ra, flush=True); time.sleep(ra + 5)
        except Exception as e: print('ERR', e, flush=True); time.sleep(30)
    return None
meta = json.load(open(os.path.join(OUT, 'meta.json'))) if os.path.exists(os.path.join(OUT, 'meta.json')) else {}
q = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'titles': '|'.join(FILES.values()), 'format': 'json'})
d = json.loads(get(q)) if not meta else {'query': {'pages': {}}}
if not meta: time.sleep(20)
strip = lambda s: re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s or ''))).strip()
for p in d['query']['pages'].values():
    key = [k for k, v in FILES.items() if v.replace('_', ' ') == p['title'].replace('_', ' ')]
    if not key: print('?', p['title']); continue
    ii = p['imageinfo'][0]; em = ii.get('extmetadata', {})
    meta[key[0]] = {'title': p['title'], 'url': ii['url'], 'page': ii.get('descriptionurl'), 'lic': strip(em.get('LicenseShortName', {}).get('value')), 'artist': strip(em.get('Artist', {}).get('value')), 'credit': strip(em.get('Credit', {}).get('value')), 'desc': strip(em.get('ImageDescription', {}).get('value'))[:400], 'size': ii.get('size')}
if d['query']['pages']: json.dump(meta, open(os.path.join(OUT, 'meta.json'), 'w'), indent=1, ensure_ascii=False)
for k in sorted(meta, key=lambda k: meta[k]['size'] or 0):
    m = meta[k]; url = m['url']
    if url.endswith('.flac'):   # Commons keeps an MP3 transcode of every FLAC: much smaller
        a, b = url.split('/wikipedia/commons/'); url = a + '/wikipedia/commons/transcoded/' + b + '/' + b.split('/')[-1] + '.mp3'
    ext = os.path.splitext(url)[1]; f = os.path.join(OUT, k + ext)
    if os.path.exists(f) and os.path.getsize(f) > 100000: continue
    b = get(url)
    if b: open(f, 'wb').write(b); print('got', k, len(b), flush=True)
    time.sleep(15)
print('ALL DONE', flush=True)
