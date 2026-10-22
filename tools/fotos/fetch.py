"""Fetch the photos listed in katalog.json (real photos of the detail zones as a reference for building them).
    python3 -I tools/fotos/fetch.py <outdir> [--zone ratscher,talsperre] [--source panoramax|commons|openverse] [--all] [--large] [--limit N]
    python3 -I tools/fotos/fetch.py <outdir> --geojson      # only write fotos.geojson (positions, view direction, links) for a map
By default only photos marked relevant (outside views; no museum objects, interiors, documents) at about 2048 px width.
--large: the original size. Polite: descriptive User-Agent, at most ~2 requests per second, Retry-After honoured; resumable.
The photos are not part of the app; licence and author per photo are in katalog.json (attribution required for CC BY / CC BY-SA)."""
import sys, os, json, time, urllib.request, urllib.error

HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[1:]
if not args or args[0].startswith('--'): sys.exit(__doc__)
OUT = os.path.abspath(args[0]); os.makedirs(OUT, exist_ok=True)
opt = lambda k: args[args.index(k) + 1] if k in args else None
K = json.load(open(os.path.join(HERE, 'katalog.json')))
UA = {'User-Agent': 'PavillonRatscher/1.0 (garden model, reference photos; https://github.com/mynametouse/pavillon-ratscher)'}
sel = [f for f in K['photos'] if ('--all' in args or f['relevant'])
       and (not opt('--zone') or f['zone'] in opt('--zone').split(','))
       and (not opt('--source') or f['source'].startswith(opt('--source')))]
if opt('--limit'): sel = sel[:int(opt('--limit'))]

if '--geojson' in args:
    feats = [dict(type='Feature', geometry=dict(type='Point', coordinates=[f['lon'], f['lat']]),
                  properties={k: f[k] for k in ('id', 'source', 'zone', 'heading', 'date', 'author', 'license', 'page', 'url')})
             for f in sel if f.get('lat') is not None]
    json.dump(dict(type='FeatureCollection', features=feats), open(os.path.join(OUT, 'fotos.geojson'), 'w'), ensure_ascii=False)
    sys.exit(print(len(feats), 'points ->', os.path.join(OUT, 'fotos.geojson')))

last, ok, fail = [0.0], 0, []
for n, f in enumerate(sel, 1):
    path = os.path.join(OUT, f['file'])
    if os.path.exists(path) and os.path.getsize(path) > 1000: ok += 1; continue
    os.makedirs(os.path.dirname(path), exist_ok=True)
    url = f['url_large'] if '--large' in args else f['url']
    for i in range(5):
        wait = 0.5 - (time.time() - last[0])
        if wait > 0: time.sleep(wait)
        last[0] = time.time()
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120) as r: data = r.read()
            open(path + '.part', 'wb').write(data); os.replace(path + '.part', path); ok += 1; break
        except urllib.error.HTTPError as e:
            if e.code == 404: fail.append(f['id']); break
            ra = int(e.headers.get('Retry-After') or 10); print('  HTTP', e.code, f['id'][:60], 'retry in', ra, 's', flush=True); time.sleep(min(ra, 120) + 1)
        except Exception as e:
            print('  error', e, f['id'][:60], flush=True); time.sleep(5)
    else: fail.append(f['id'])
    if n % 100 == 0: print(f'{n}/{len(sel)}', flush=True)
print(f'{ok} of {len(sel)} photos in {OUT}' + (f', {len(fail)} failed: {fail[:5]}' if fail else ''))
sys.exit(1 if fail else 0)
