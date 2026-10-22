"""Street-level photos from Panoramax (open, CC BY-SA 4.0, faces and plates blurred): metadata of every picture in the area
(one box from Kloster Vessra to the Ratscher reservoir, one for Suhl); zones are assigned by position in merge.py.
    python3 -I tools/fotos/collect_panoramax.py <outdir> [--download]     # --download: also the ~2048 px images"""
import sys, os, json, time, urllib.request

OUT = os.path.abspath(sys.argv[1]); os.makedirs(OUT, exist_ok=True)
COUNT_ONLY = '--download' not in sys.argv
UA = {'User-Agent': 'PavillonRatscherResearch/1.0 (https://github.com/mynametouse/pavillon-ratscher)'}
API = 'https://api.panoramax.xyz/api/search'
ZONES = {  # lon0, lat0, lon1, lat1 (one box for the whole area from Kloster Vessra to the reservoir; zones are assigned by position later)
    'region': (10.620, 50.455, 10.815, 50.530),
    'suhl': (10.640, 50.590, 10.730, 50.630),
}

def get(u):
    for i in range(5):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=90) as r: return json.load(r)
        except Exception as e:
            print('  retry', e, flush=True); time.sleep(5 * (i + 1))
    raise SystemExit('failed ' + u)

def search(b):
    feats, url = [], f'{API}?bbox={b[0]},{b[1]},{b[2]},{b[3]}&limit=10000'
    while url:
        d = get(url); feats += d.get('features', [])
        nxt = [l['href'] for l in d.get('links', []) if l.get('rel') == 'next']
        url = nxt[0] if nxt and len(d.get('features', [])) else None
    return feats

catalog, seen = {}, set()
for zone, b in ZONES.items():
    fs = [f for f in search(b) if f['id'] not in seen]
    for f in fs: seen.add(f['id'])
    items = []
    for f in fs:
        p = f.get('properties', {}); a = f.get('assets', {})
        items.append(dict(id=f['id'], lon=f['geometry']['coordinates'][0], lat=f['geometry']['coordinates'][1], time=p.get('datetime'),
                          azimuth=p.get('view:azimuth'), license=p.get('license'), collection=f.get('collection'),
                          producer=(f.get('providers') or [{}])[0].get('name'), camera=(p.get('pers:interior_orientation') or {}).get('camera_model'),
                          fov=(p.get('pers:interior_orientation') or {}).get('field_of_view'),
                          hd=(a.get('hd') or {}).get('href'), sd=(a.get('sd') or {}).get('href'),
                          page=f'https://api.panoramax.xyz/#focus=pic&pic={f["id"]}'))
    catalog[zone] = items
    print(f'{zone}: {len(items)} pictures', flush=True)
json.dump(catalog, open(os.path.join(OUT, 'panoramax.json'), 'w'), ensure_ascii=False, indent=1)
if COUNT_ONLY: sys.exit(0)
for zone, items in catalog.items():
    d = os.path.join(OUT, zone); os.makedirs(d, exist_ok=True)
    for it in items:
        fn = os.path.join(d, it['id'] + '.jpg'); it['file'] = f'{zone}/{it["id"]}.jpg'
        if os.path.exists(fn) and os.path.getsize(fn) > 1000: continue
        for i in range(4):
            try:
                with urllib.request.urlopen(urllib.request.Request(it['sd'], headers=UA), timeout=90) as r: open(fn, 'wb').write(r.read()); break
            except Exception as e:
                print('  img retry', e, flush=True); time.sleep(3 * (i + 1))
        time.sleep(0.15)
    print(f'{zone}: downloaded {len(os.listdir(d))}', flush=True)
json.dump(catalog, open(os.path.join(OUT, 'panoramax.json'), 'w'), ensure_ascii=False, indent=1)
