"""Wikimedia Commons photos of Suhl - runs in GitHub Actions only (the chat machine gets HTTP 429 from the Wikimedia APIs).
Three ways in: (1) geotagged files in a grid of circles over the municipality (camera and object positions),
(2) the category tree below Category:Suhl (walked level by level; people, products, maps ... are skipped),
(3) two text searches for historic pictures (Bundesarchiv, Deutsche Fotothek).
Then the details of every file: author, licence, date, positions, heading (wikitext template or structured data), categories.
Polite: the User-Agent of the Suhl agents, maxlag, one request per second, Retry-After honoured. No image is downloaded.
    python tools/suhl/fotos/collect_commons.py [gebiete.geojson]     ->  tools/suhl/out/fotos/commons.json.gz"""
import sys, os, re, json, html, math, time, collections, datetime, urllib.parse, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import slib

API = 'https://commons.wikimedia.org/w/api.php'
ROOT = 'Category:Suhl'
MAX_CATS, MAX_DEPTH, MAX_FILES = 700, 6, 12000
SKIP_CAT = re.compile(r'people|persons|births|deaths|personen|born in|alumni|mayors|honorary|ehrenbürger|portraits|signatures|'
                      r'simson|motorcycles|mopeds|scooters|automobiles|vehicles|fahrzeuge|bicycles|'
                      r'firearms|rifles|shotguns|pistols|revolvers|\bguns\b|weapons of|sauer ?& ?sohn|haenel|merkel|krieghoff|anschütz|'
                      r'maps|coats of arms|wappen|logos|stamps|flags|seals|audio|videos|pronunciation|'
                      r'sportspeople|athletes|footballers|players|olympi|world cup|championships|'
                      r'books|documents|newspapers|postcards by|taken with|photographs by|files by|uploaded|quality images|featured|valued images|'
                      r'media needing|unidentified|templates|user:', re.I)
SKIP_FILE = re.compile(r'wappen|coat[_ ]of[_ ]arms|karte|\bmap\b|locator|lagekarte|siegel|logo|\.svg$|\.pdf$|\.djvu$|\.tiff?$|\.og[gva]$|\.webm$|\.mp3$|\.wav$|\.stl$', re.I)
NOT_RELEVANT = re.compile(r'exhibit|exponat|specimen|präparat|mineral|fossil|taxiderm|insect|insekt|\bcoins?\b|münze|medal|medaille|manuscript|handschrift|'
                          r'urkunde|document|\bbook|painting|gemälde|portrait|porträt|bildnis|gravestone|grabstein|grabmal|epitaph|siegel|\bseal\b|stamp|'
                          r'briefmarke|wappen|coat of arms|\bmaps?\b|\bkarte\b|logo|signature|interior|innenansicht|innenraum|\borgel|\borgan\b|altar|kanzel|'
                          r'pulpit|stained glass|glasfenster|ceiling|vitrine|showcase|\bdolls?\b|\btoys?\b|spielzeug|uniform|weapon|waffe|gewehr|pistole|'
                          r'rifle|rüstung|armou?r|motorcycle|motorrad|moped|simson|schwalbe|\bawo\b|automobile|oldtimer|collections of', re.I)
FREE = re.compile(r'^(cc0|cc[ -]by([ -]sa)?[ -]\d|cc[ -]by([ -]sa)?$|public domain|pd\b|pdm|no restrictions|attribution$)', re.I)
areas = slib.Areas(sys.argv[1] if len(sys.argv) > 1 else None)
calls = [0]


def api(params):
    params = dict(params, format='json', maxlag='5', formatversion='2')
    for i in range(8):
        d = json.loads(slib.get(API + '?' + urllib.parse.urlencode(params), pause=1.0, tries=6)); calls[0] += 1
        if 'error' in d and d['error'].get('code') == 'maxlag': time.sleep(6); continue
        if 'error' in d: print('  API error', d['error'].get('code'), str(d['error'].get('info'))[:160], flush=True)
        return d
    raise RuntimeError('maxlag for too long')


def geo_cells():
    """Circles that cover the municipality: square grid of 1500 m, radius 1100 m, only where the circle touches the area."""
    b = areas.bbox('stadt') if 'stadt' in areas.geom else areas.bbox('kernstadt')
    s, r = 1500.0, 1100.0
    x0, y0 = slib.xy(b[1], b[0]); x1, y1 = slib.xy(b[3], b[2])
    g = 'stadt' if 'stadt' in areas.geom else 'kernstadt'
    nx, ny = int((x1 - x0) / s) + 2, int((y1 - y0) / s) + 2
    for i in range(nx):
        for j in range(ny):
            cx, cy = x0 + i * s, y0 + j * s
            ring = [(cx, cy)] + [(cx + r * math.cos(a * math.pi / 4), cy + r * math.sin(a * math.pi / 4)) for a in range(8)]
            if any(areas.has(g, *slib.ll(px, py)) for px, py in ring): yield cx, cy, s, r


def geosearch():
    found, queue, n = {}, list(geo_cells()), 0
    print(f'geosearch: {len(queue)} circles to ask', flush=True)
    while queue:
        cx, cy, s, r = queue.pop(); n += 1
        lat, lon = slib.ll(cx, cy)
        d = api(dict(action='query', list='geosearch', gscoord=f'{lat:.6f}|{lon:.6f}', gsradius=str(int(r)), gsnamespace='6', gslimit='500', gsprimary='all'))
        res = (d.get('query') or {}).get('geosearch', [])
        if len(res) >= 500 and r > 80:   # full answer: four smaller circles instead
            for dx in (-s / 4, s / 4):
                for dy in (-s / 4, s / 4): queue.append((cx + dx, cy + dy, s / 2, r / 2))
            continue
        for g in res:
            e = found.setdefault(g['title'], {})
            e['camera' if g.get('primary') else 'object'] = [round(g['lat'], 7), round(g['lon'], 7)]
    print(f'geosearch: {len(found)} geotagged files, {n} circles asked', flush=True)
    return found


def cat_tree():
    files, cats, seen, level = {}, collections.OrderedDict(), {ROOT}, [(ROOT, 'Suhl')]
    for depth in range(MAX_DEPTH + 1):
        nxt = []
        for cat, path in level:
            if len(cats) >= MAX_CATS or len(files) >= MAX_FILES: break
            cont, nf = {}, 0
            while True:
                d = api(dict(action='query', list='categorymembers', cmtitle=cat, cmtype='subcat|file', cmprop='title|type', cmlimit='500', **cont))
                for m in (d.get('query') or {}).get('categorymembers', []):
                    if m.get('type') == 'file':
                        nf += 1; files.setdefault(m['title'], path)
                    elif m.get('type') == 'subcat' and m['title'] not in seen and not SKIP_CAT.search(m['title']):
                        seen.add(m['title']); nxt.append((m['title'], path + ' > ' + m['title'].split(':', 1)[1]))
                if 'continue' not in d: break
                cont = {'cmcontinue': d['continue']['cmcontinue']}
            cats[cat.split(':', 1)[1]] = dict(depth=depth, files=nf, path=path)
        print(f'category tree: level {depth}: {len(level)} categories, {len(files)} files so far', flush=True)
        level = nxt
        if not level: break
    return files, cats


def text_search(q):
    out, off = [], 0
    while off < 1500:
        d = api(dict(action='query', list='search', srsearch=q, srnamespace='6', srlimit='500', sroffset=str(off), srprop=''))
        out += [r['title'] for r in (d.get('query') or {}).get('search', [])]
        if 'continue' not in d: break
        off = d['continue']['sroffset']
    print(f'search {q!r}: {len(out)} files', flush=True)
    return out


def plain(s):
    s = re.sub(r'<[^>]+>', ' ', s or ''); s = html.unescape(s); return re.sub(r'\s+', ' ', s).strip()


def details(titles):
    meta = {}
    for i in range(0, len(titles), 50):
        chunk, cont, pages = titles[i:i + 50], {}, {}
        for _ in range(12):   # follow continuation (large wikitexts, many coordinates)
            d = api(dict(action='query', titles='|'.join(chunk), prop='imageinfo|coordinates|revisions', iiprop='url|size|mime|extmetadata', iiurlwidth='500',
                         iiextmetadatafilter='Artist|LicenseShortName|LicenseUrl|ImageDescription|DateTimeOriginal|Credit',
                         coprop='type|name', coprimary='all', colimit='500', rvprop='content', rvslots='main', **cont))
            for p in (d.get('query') or {}).get('pages', []):
                q = pages.setdefault(p['title'], {})
                for k, v in p.items():
                    if k in ('coordinates', 'revisions', 'imageinfo') and k in q and isinstance(v, list): q[k] = q[k] + v
                    else: q[k] = v
            if 'continue' not in d: break
            cont = {k: v for k, v in d['continue'].items() if k != 'continue'}
        sdc = {}
        try:   # structured data: P1259 = point of view (qualifier P7787 = heading), P9149 = coordinates of the depicted place
            ids = '|'.join(f'M{p["pageid"]}' for p in pages.values() if p.get('pageid'))
            if ids:
                e = api(dict(action='wbgetentities', ids=ids, props='claims'))
                for mid, ent in (e.get('entities') or {}).items():
                    st = ent.get('statements') or ent.get('claims') or {}
                    r = {}
                    for prop, key in (('P1259', 'camera'), ('P9149', 'object')):
                        for c in st.get(prop, []) if isinstance(st, dict) else []:
                            v = ((c.get('mainsnak') or {}).get('datavalue') or {}).get('value') or {}
                            if 'latitude' in v: r[key] = [round(v['latitude'], 7), round(v['longitude'], 7)]
                            for hq in (c.get('qualifiers') or {}).get('P7787', []):
                                try: r['heading'] = float(((hq.get('datavalue') or {}).get('value') or {}).get('amount'))
                                except (TypeError, ValueError): pass
                    sdc[mid] = r
        except Exception as ex:
            print('  structured data skipped:', ex, flush=True)
        for t, p in pages.items():
            if not p.get('imageinfo'): continue
            ii = p['imageinfo'][0]; em = ii.get('extmetadata') or {}
            g = lambda k: (em.get(k) or {}).get('value', '')
            try: text = p['revisions'][0]['slots']['main']['content']
            except Exception: text = ''
            cam = obj = None
            for c in p.get('coordinates', []):
                if c.get('primary'): cam = [round(c['lat'], 7), round(c['lon'], 7)]
                else: obj = obj or [round(c['lat'], 7), round(c['lon'], 7)]
            s = sdc.get(f'M{p.get("pageid")}', {})
            cam = cam or s.get('camera'); obj = obj or s.get('object')
            hm = re.search(r'\{\{\s*(?:Camera location|Location dec|Location)\b[^{}]*?heading:\s*([-\d.]+|[NSEW]{1,3})', text, re.I)
            head = s.get('heading')
            if hm:
                try: head = float(hm.group(1))
                except ValueError: head = {'N': 0, 'NNE': 22.5, 'NE': 45, 'ENE': 67.5, 'E': 90, 'ESE': 112.5, 'SE': 135, 'SSE': 157.5, 'S': 180, 'SSW': 202.5,
                                           'SW': 225, 'WSW': 247.5, 'W': 270, 'WNW': 292.5, 'NW': 315, 'NNW': 337.5}.get(hm.group(1).upper(), head)
            orig, w = ii['url'], ii.get('width') or 0
            small = ii.get('thumburl') or orig
            meta[t] = dict(title=t, page='https://commons.wikimedia.org/wiki/' + urllib.parse.quote(t.replace(' ', '_')), url_small=small,
                           url=small.replace('/500px-', '/1920px-') if w > 1920 and '/500px-' in small else orig, url_large=orig,
                           width=w, height=ii.get('height'), mime=ii.get('mime'), author=plain(g('Artist'))[:200], license=plain(g('LicenseShortName')),
                           license_url=g('LicenseUrl'), date=plain(g('DateTimeOriginal'))[:40], description=plain(g('ImageDescription'))[:300],
                           credit=plain(g('Credit'))[:160], camera=cam, object=obj, heading=head,
                           categories=[c.strip() for c in re.findall(r'\[\[\s*Category\s*:\s*([^\]|]+)', text)][:15])
        if (i // 50) % 10 == 0: print(f'details: {min(i + 50, len(titles))}/{len(titles)}', flush=True)
    return meta


def main():
    geo = geosearch()
    tree, cats = cat_tree()
    hist = {}
    for q in ('Suhl Bundesarchiv', 'Suhl "Deutsche Fotothek"'):
        for t in text_search(q): hist.setdefault(t, 'search: ' + q)
    via = {}
    for t in geo: via[t] = 'geo'
    for t, path in tree.items(): via[t] = (via[t] + '; ' if t in via else '') + 'cat: ' + path
    for t, q in hist.items(): via.setdefault(t, q)
    titles = sorted(t for t in via if not SKIP_FILE.search(t))
    print(f'{len(titles)} files to describe ({len(via) - len(titles)} skipped by name)', flush=True)
    meta = details(titles)
    photos = []
    for t in titles:
        m = meta.get(t)
        if not m or not (m['mime'] or '').startswith('image/') or (m['width'] or 0) < 600: continue
        pos = m['camera'] or m['object'] or (geo.get(t) or {}).get('camera') or (geo.get(t) or {}).get('object')
        text = re.sub(r'waffenmuseum|waffenschmied|fahrzeugmuseum|weapons? museum', '', ' '.join([t, m['description'], ' '.join(m['categories'])]), flags=re.I)
        gebiet = areas.of(pos[0], pos[1]) if pos else None
        if via[t].startswith('search:') and not pos and not re.search(r'suhl', text, re.I): continue
        photos.append(dict(id='commons:' + t, source='commons', gebiet=gebiet, lat=pos[0] if pos else None, lon=pos[1] if pos else None,
                           position='camera' if m['camera'] else 'object' if pos else None, object=m['object'] if m['camera'] and m['object'] else None,
                           heading=m['heading'], fov=None, pano=False, date=m['date'], author=m['author'], license=m['license'], license_url=m['license_url'],
                           page=m['page'], url_small=m['url_small'], url=m['url'], url_large=m['url_large'], title=t, description=m['description'],
                           categories=m['categories'], found_via=via[t], width=m['width'], height=m['height'],
                           relevant=not NOT_RELEVANT.search(text), free=bool(FREE.search(m['license'] or ''))))
    out = dict(version=1, fetched=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), api=API, areas=areas.source, calls=calls[0],
               counts=dict(geotagged=len(geo), in_category_tree=len(tree), historic_search=len(hist), described=len(meta), kept=len(photos)),
               category_tree=cats, photos=photos)
    print(slib.save('commons.json.gz', out), out['counts'], calls[0], 'calls')
    c = collections.Counter
    print('gebiet', dict(c(str(p['gebiet']) for p in photos)))
    print('position', dict(c(str(p['position']) for p in photos)), 'with heading', sum(p['heading'] is not None for p in photos))
    print('license', c(p['license'] for p in photos).most_common(12))
    print('relevant', sum(p['relevant'] for p in photos), 'free', sum(p['free'] for p in photos))


main()
