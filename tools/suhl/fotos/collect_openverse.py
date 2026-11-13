"""Openly licensed photos of Suhl from Openverse (mostly Flickr; Wikimedia is left out - collected separately).
Without an account the API gives at most 240 hits per search word, 20 per page. No positions, no viewing directions.
Hits must name Suhl in title or tags. NC and ND licences are kept in the list but marked "nur ansehen" by merge.py.
    python3 tools/suhl/fotos/collect_openverse.py     ->  tools/suhl/out/fotos/openverse.json"""
import sys, os, re, json, datetime, urllib.parse, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import slib

TERMS = ['Suhl', 'Suhl Thüringen', 'Suhl Rathaus', 'Suhl Steinweg', 'Suhl Waffenmuseum', 'Suhl Stadthalle', 'Suhl Congress Centrum', 'Suhl Bahnhof', 'Suhl Kirche', 'Suhl Hochhaus', 'Suhl DDR']
items, seen, log = [], set(), []
for t in TERMS:
    n_term = 0
    for page in range(1, 13):
        try:
            d = slib.get_json('https://api.openverse.org/v1/images/?' + urllib.parse.urlencode({'q': t, 'page_size': 20, 'page': page}), pause=2.0, tries=3, timeout=60)
        except Exception as e:
            log.append(f'{t} page {page}: {e}'[:200]); break
        res = d.get('results', [])
        for x in res:
            if x.get('source') == 'wikimedia' or x['id'] in seen: continue
            tags = [tg.get('name', '') for tg in (x.get('tags') or [])]
            text = ' '.join([x.get('title') or ''] + tags)
            if not re.search(r'\bsuhl\b', text, re.I): continue
            seen.add(x['id']); n_term += 1
            items.append(dict(id='openverse:' + x['id'], source='openverse/' + (x.get('source') or ''), title=x.get('title') or '', author=x.get('creator'), author_url=x.get('creator_url'),
                              license=f"CC {x.get('license', '').upper()} {x.get('license_version') or ''}".strip().replace('CC CC0', 'CC0').replace('CC PDM', 'Public Domain Mark'),
                              license_url=x.get('license_url'), page=x.get('foreign_landing_url'), url_small=x.get('thumbnail'), url=x.get('url'), url_large=x.get('url'),
                              width=x.get('width'), height=x.get('height'), tags=tags[:15], term=t))
        if len(res) < 20 or page >= (d.get('page_count') or 1): break
    log.append(f'{t}: {n_term} new'); print(log[-1], flush=True)
out = dict(version=1, fetched=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), api='https://api.openverse.org/v1/images/', terms=TERMS, log=log, photos=items)
print(slib.save('openverse.json', out, indent=1), len(items), 'photos', dict(collections.Counter(i['license'] for i in items)))
