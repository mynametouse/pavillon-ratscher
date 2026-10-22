"""Collect freely licensed real photos of the detail zones from Wikimedia Commons (categories + geotagged files near each place),
with metadata (author, licence, date, camera/object location, heading), then download 2048 px versions.
    python3 -I tools/fotos/collect_commons.py <outdir> [--download]
Polite: descriptive User-Agent, maxlag, one API request per second, Retry-After honoured."""
import sys, os, re, json, time, html, urllib.request, urllib.parse, urllib.error

OUT = os.path.abspath(sys.argv[1]); os.makedirs(OUT, exist_ok=True)
DOWNLOAD = '--download' in sys.argv
UA = 'PavillonRatscherResearch/1.0 (https://github.com/mynametouse/pavillon-ratscher; noreply@anthropic.com) python-urllib'
API = 'https://commons.wikimedia.org/w/api.php'
ZONES = {
    # category trees (deepcat search) + geotagged files around the place; centres checked with OpenStreetMap
    'ratscher': {'cats': ['Ratscher (Schleusingen)', 'Talsperre Ratscher'], 'geo': [(50.4971, 10.7736, 1500), (50.4875, 10.7913, 2500)]},
    'schleusingen': {'cats': ['Schleusingen'], 'geo': [(50.5098, 10.7526, 2000)]},
    'kloster-vessra': {'cats': ['Kloster Veßra'], 'geo': [(50.4925, 10.6435, 1500)]},
    'geisenhoehn': {'cats': ['Geisenhöhn', 'Geisenhöhn (Schleusingen)'], 'geo': [(50.4948, 10.7573, 700)]},
    'rappelsdorf': {'cats': ['Rappelsdorf', 'Rappelsdorf (Schleusingen)'], 'geo': [(50.4985, 10.7208, 900)]},
}
SKIP_CAT = re.compile(r'maps? of|coats? of arms|wappen|people of|stamps|flags of|logos|documents|signatures|portraits|audio|videos|sound', re.I)
SKIP_FILE = re.compile(r'wappen|coat[_ ]of[_ ]arms|karte|\bmap\b|locator|lage|siegel|logo|\.svg$|\.pdf$|\.djvu$|\.tif$|\.ogg$|\.webm$|\.ogv$|\.mp3$|in HBN\.png', re.I)
last = [0.0]

def api(params, tries=6):
    params = dict(params, format='json', maxlag='5', formatversion='2')
    url = API + '?' + urllib.parse.urlencode(params)
    for i in range(tries):
        wait = 1.0 - (time.time() - last[0])
        if wait > 0: time.sleep(wait)
        last[0] = time.time()
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                d = json.load(r)
            if 'error' in d and d['error'].get('code') == 'maxlag':
                time.sleep(5); continue
            return d
        except urllib.error.HTTPError as e:
            ra = int(e.headers.get('Retry-After') or 10)
            print('  HTTP', e.code, 'retry in', ra, 's', flush=True); time.sleep(ra + 1)
        except Exception as e:
            print('  error', e, flush=True); time.sleep(5)
    raise SystemExit('API failed: ' + url)

def members(cat, kind):
    out, cont = [], {}
    while True:
        d = api(dict(action='query', list='categorymembers', cmtitle=cat, cmtype=kind, cmlimit='500', **cont))
        out += [m['title'] for m in d['query']['categorymembers']]
        if 'continue' not in d: return out
        cont = {'cmcontinue': d['continue']['cmcontinue']}

def deepcat(zone, seeds):
    # one search per category tree (CirrusSearch deepcat) instead of crawling every subcategory: far fewer API calls
    files = {}
    for c in seeds:
        off = 0
        while True:
            d = api(dict(action='query', list='search', srsearch=f'deepcat:"{c}"', srnamespace='6', srlimit='500', sroffset=str(off), srprop=''))
            for r in d.get('query', {}).get('search', []): files.setdefault(r['title'], 'Category:' + c)
            if 'continue' not in d: break
            off = d['continue']['sroffset']
    print(f'{zone}: {len(files)} files in the category trees', flush=True)
    return files


def geo(lat, lon, r):
    d = api(dict(action='query', list='geosearch', gscoord=f'{lat}|{lon}', gsradius=str(r), gsnamespace='6', gslimit='500'))
    return [g['title'] for g in d['query']['geosearch']]

def plain(s):
    s = re.sub(r'<[^>]+>', ' ', s or ''); s = html.unescape(s); return re.sub(r'\s+', ' ', s).strip()

def details(titles):
    meta = {}
    for i in range(0, len(titles), 50):
        chunk = titles[i:i + 50]
        d = api(dict(action='query', titles='|'.join(chunk), prop='imageinfo|coordinates|revisions', iiprop='url|size|mime|extmetadata|timestamp',
                     iiurlwidth='2048', iiextmetadatafilter='Artist|LicenseShortName|LicenseUrl|ImageDescription|DateTimeOriginal|ObjectName|Credit|AttributionRequired|Copyrighted',
                     coprop='type|name', coprimary='all', rvprop='content', rvslots='main'))
        for p in d['query'].get('pages', []):
            if 'imageinfo' not in p: continue
            ii = p['imageinfo'][0]; em = ii.get('extmetadata', {})
            g = lambda k: (em.get(k) or {}).get('value', '')
            text = ''
            try: text = p['revisions'][0]['slots']['main']['content']
            except Exception: pass
            cam = re.search(r'\{\{\s*Location(?:\s*dec)?\s*\|\s*([-\d.]+)\s*\|\s*([-\d.]+)([^}]*)\}\}', text, re.I)
            obj = re.search(r'\{\{\s*Object location(?:\s*dec)?\s*\|\s*([-\d.]+)\s*\|\s*([-\d.]+)', text, re.I)
            head = re.search(r'heading:\s*([-\d.]+|[NSEW]{1,3})', cam.group(3)) if cam else None
            meta[p['title']] = dict(
                title=p['title'], page='https://commons.wikimedia.org/wiki/' + urllib.parse.quote(p['title'].replace(' ', '_')),
                url=ii.get('thumburl') or ii['url'], original=ii['url'], width=ii.get('width'), height=ii.get('height'), mime=ii.get('mime'),
                author=plain(g('Artist')), license=plain(g('LicenseShortName')), license_url=g('LicenseUrl'),
                date=plain(g('DateTimeOriginal'))[:40], description=plain(g('ImageDescription'))[:300],
                camera=[float(cam.group(1)), float(cam.group(2))] if cam else None, heading=head.group(1) if head else None,
                object=[float(obj.group(1)), float(obj.group(2))] if obj else None,
                categories=re.findall(r'\[\[\s*Category\s*:\s*([^\]|]+)', text)[:12])
    return meta

def main():
    catalog = {}
    for zone, z in ZONES.items():
        files = deepcat(zone, z['cats'])
        for lat, lon, r in z['geo']:
            g = geo(lat, lon, r); print(f'{zone}: {len(g)} geotagged files within {r} m', flush=True)
            for t in g: files.setdefault(t, 'geo')
        titles = [t for t in files if not SKIP_FILE.search(t)]
        meta = details(titles)
        keep = {}
        for t, m in meta.items():
            if not (m['mime'] or '').startswith('image/') or (m['width'] or 0) < 800: continue
            m['found_via'] = files[t]; keep[t] = m
        catalog[zone] = keep
        print(f'{zone}: {len(keep)} photos kept (of {len(titles)})', flush=True)
        json.dump(catalog, open(os.path.join(OUT, 'katalog.json'), 'w'), ensure_ascii=False, indent=1)
    # one place per photo: the zone whose list it came from first (Ratscher before Schleusingen)
    seen = set()
    for zone in list(catalog):
        catalog[zone] = {t: m for t, m in catalog[zone].items() if not (t in seen or seen.add(t))}
    json.dump(catalog, open(os.path.join(OUT, 'katalog.json'), 'w'), ensure_ascii=False, indent=1)
    print('catalog:', {z: len(v) for z, v in catalog.items()}, flush=True)
    if DOWNLOAD: download(catalog)

def safe(t):
    n = t.split(':', 1)[1]; n = re.sub(r'[^\w.\-]+', '_', n, flags=re.U)
    base, ext = os.path.splitext(n); return (base[:110] + (ext if ext.lower() in ('.jpg', '.jpeg', '.png') else '.jpg'))

def download(catalog):
    for zone, items in catalog.items():
        d = os.path.join(OUT, zone); os.makedirs(d, exist_ok=True)
        for t, m in items.items():
            fn = safe(t); path = os.path.join(d, fn); m['file'] = f'{zone}/{fn}'
            if os.path.exists(path) and os.path.getsize(path) > 1000: continue
            for i in range(5):
                wait = 1.0 - (time.time() - last[0])
                if wait > 0: time.sleep(wait)
                last[0] = time.time()
                try:
                    req = urllib.request.Request(m['url'], headers={'User-Agent': UA})
                    with urllib.request.urlopen(req, timeout=120) as r: data = r.read()
                    open(path, 'wb').write(data); break
                except urllib.error.HTTPError as e:
                    ra = int(e.headers.get('Retry-After') or 10); print('  img HTTP', e.code, t, 'retry', ra, flush=True); time.sleep(ra + 1)
                except Exception as e:
                    print('  img error', e, t, flush=True); time.sleep(5)
        print(f'{zone}: downloaded', len(os.listdir(d)), flush=True)
    json.dump(catalog, open(os.path.join(OUT, 'katalog.json'), 'w'), ensure_ascii=False, indent=1)

main()
