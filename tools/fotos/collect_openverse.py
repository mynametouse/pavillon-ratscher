"""Openly licensed photos from Openverse (indexes Flickr and other collections; Wikimedia left out - collected separately).
Search terms per zone; keeps title, author, licence, source page; downloads the image (or the Openverse thumbnail if the original fails).
    python3 -I tools/fotos/collect_openverse.py <outdir> [--download]"""
import sys, os, json, time, urllib.request, urllib.parse

OUT = os.path.abspath(sys.argv[1]); os.makedirs(OUT, exist_ok=True)
UA = {'User-Agent': 'PavillonRatscherResearch/1.0 (https://github.com/mynametouse/pavillon-ratscher)'}
TERMS = {   # zones here are a first guess only; merge.py assigns by position or category
    'ratscher': ['Ratscher', 'Talsperre Ratscher', 'Bergsee Ratscher'],
    'schleusingen': ['Schleusingen', 'Bertholdsburg'],
    'kloster-vessra': ['Kloster Veßra', 'Kloster Vessra', 'Vessra', 'Hennebergisches Museum'],
    'geisenhoehn': ['Geisenhöhn'],
    'rappelsdorf': ['Rappelsdorf'],
}

def get(u, tries=4):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=90) as r: return r.read()
        except Exception as e:
            print('  retry', e, flush=True); time.sleep(10 * (i + 1))
    return None

catalog, seen = {}, set()
for zone, terms in TERMS.items():
    items = []
    for t in terms:
        for page in (1, 2, 3):
            b = get('https://api.openverse.org/v1/images/?' + urllib.parse.urlencode({'q': t, 'page_size': 20, 'page': page}))
            if not b: break
            d = json.loads(b); res = d.get('results', [])
            for x in res:
                if x.get('source') == 'wikimedia' or x['id'] in seen: continue
                text = ' '.join([x.get('title') or '', ' '.join(tg.get('name', '') for tg in (x.get('tags') or []))]).lower()
                # keep only hits that really name the place (Openverse also matches loosely)
                if not any(w.lower().replace('ß', 'ss') in text.replace('ß', 'ss') for w in terms): continue
                seen.add(x['id'])
                items.append(dict(id=x['id'], title=x.get('title'), author=x.get('creator'), author_url=x.get('creator_url'), license=f"{x.get('license', '').upper()} {x.get('license_version') or ''}".strip(),
                                  license_url=x.get('license_url'), source=x.get('source'), page=x.get('foreign_landing_url'), url=x.get('url'), thumb=x.get('thumbnail'),
                                  width=x.get('width'), height=x.get('height'), tags=[tg.get('name') for tg in (x.get('tags') or [])][:15], term=t))
            if len(res) < 20 or page >= (d.get('page_count') or 1): break
            time.sleep(2)
    catalog[zone] = items
    print(f'{zone}: {len(items)} photos', flush=True)
    json.dump(catalog, open(os.path.join(OUT, 'openverse.json'), 'w'), ensure_ascii=False, indent=1)
for zone, items in (catalog.items() if '--download' in sys.argv else []):
    d = os.path.join(OUT, zone); os.makedirs(d, exist_ok=True)
    for it in items:
        fn = os.path.join(d, it['id'] + '.jpg'); it['file'] = f'{zone}/{it["id"]}.jpg'
        if os.path.exists(fn) and os.path.getsize(fn) > 1000: continue
        b = get(it['url'], 2) or get(it['thumb'], 2)
        if b: open(fn, 'wb').write(b)
        else: it['file'] = None
        time.sleep(0.5)
json.dump(catalog, open(os.path.join(OUT, 'openverse.json'), 'w'), ensure_ascii=False, indent=1)
print('done', {z: len(v) for z, v in catalog.items()}, flush=True)
