"""One catalogue of all photos of Suhl found so far, with one set of fields, and the numbers per source.
Takes what is there: panoramax.json.gz (chat machine), commons.json.gz and kartaview.json (GitHub Actions), openverse.json.
    python3 tools/suhl/fotos/merge.py [gebiete.geojson]     ->  tools/suhl/out/fotos/katalog_suhl.json.gz, quellen.json"""
import sys, os, re, collections, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import slib

areas = slib.Areas(sys.argv[1] if len(sys.argv) > 1 else None)
FREE = re.compile(r'^(cc0|cc[ -]by([ -]sa)?([ -]\d|$)|public domain|pd\b|pdm|no restrictions)', re.I)
NOT_RELEVANT = re.compile(r'motorcycle|motorrad|moped|simson|schwalbe|\bawo\b|oldtimer|portrait|porträt|interior|innen|museum exhibit|exponat|weapon|waffe(?!nmuseum|nschmied)|gewehr|pistole|rifle|'
                          r'concert|konzert|band\b|festival|party|people|menschen|food|essen|cat\b|dog\b|hund|katze|logo|wappen|karte|\bmap\b', re.I)
FIELDS = ('id', 'source', 'gebiet', 'lat', 'lon', 'position', 'heading', 'fov', 'pano', 'date', 'author', 'license', 'license_url', 'nutzung', 'page', 'url_small', 'url', 'url_large',
          'title', 'description', 'categories', 'relevant')


def usable(lic):
    lic = (lic or '').strip()
    if re.search(r'\b(nc|nd)\b', lic, re.I): return 'nur ansehen'
    return 'frei' if FREE.search(lic) else 'nur ansehen'


def try_load(name):
    try: return slib.load(name)
    except FileNotFoundError: return None


photos, info = [], {}
pm = try_load('panoramax.json.gz')
if pm:
    # the same picture on two Panoramax instances: same second, same place (2 m), same author apart from upper/lower case
    seen = {}
    for p in pm['photos']:
        key = ((p['author'] or '').lower(), p['date'], round(p['lat'], 5), round(p['lon'], 5))
        q = dict(p, gebiet=areas.of(p['lat'], p['lon']), position='camera', title='', description='', categories=[], relevant=True, nutzung=usable(p['license']))
        if key in seen: q['dup_of'] = seen[key]
        else: seen[key] = p['id']
        photos.append(q)
    info['panoramax'] = dict(fetched=pm['fetched'], where='chat machine', api=pm['api'], duplicates=sum(1 for q in photos if q.get('dup_of')),
                             heading_check=slib.add_course([q for q in photos if q['source'] == 'panoramax']))
co = try_load('commons.json.gz')
if co:
    for p in co['photos']:
        photos.append(dict(p, gebiet=areas.of(p['lat'], p['lon']) if p.get('lat') is not None else None, nutzung='frei' if p.get('free') else usable(p.get('license'))))
    info['commons'] = dict(fetched=co['fetched'], where='GitHub Actions', api=co['api'], counts=co.get('counts'))
kv = try_load('kartaview.json')
if kv:
    n = 0
    for p in kv.get('photos', []):
        if 'Vergleich' in (p.get('place') or ''): continue
        photos.append(dict(p, gebiet=areas.of(p['lat'], p['lon']), position='camera', title='', description='', categories=[], relevant=True, nutzung=usable(p.get('license')))); n += 1
    info['kartaview'] = dict(fetched=kv['fetched'], where=kv.get('where', 'GitHub Actions'), api=kv.get('api') or kv.get('base'), circles=kv.get('circles'), calls=kv.get('calls'),
                             errors=len(kv.get('errors') or []), control=kv.get('control'), probes=kv.get('probes'), photos_in_suhl=n)
ov = try_load('openverse.json')
if ov:
    for p in ov['photos']:
        text = ' '.join([p.get('title') or ''] + (p.get('tags') or []))
        photos.append(dict(p, gebiet=None, lat=None, lon=None, position=None, heading=None, fov=None, pano=False, date='', description='', categories=p.get('tags') or [],
                           relevant=not NOT_RELEVANT.search(text), nutzung=usable(p.get('license'))))
    info['openverse'] = dict(fetched=ov['fetched'], where='chat machine', api=ov['api'], terms=ov['terms'])

rows = []
for p in photos:
    r = {k: p.get(k) for k in FIELDS}
    for k in ('heading_fahrt', 'blick', 'blick_quelle', 'seq', 'rank', 'instance', 'camera', 'acc_m', 'dup_of', 'object', 'found_via', 'width', 'height'):
        if p.get(k) is not None: r[k] = p[k]
    rows.append(r)
slib.save('katalog_suhl.json.gz', dict(
    version=1, made=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), areas=areas.source,
    fields='id, source, gebiet (zentrum/kernstadt/stadt/umland, None = no position), lat/lon (WGS84), position (camera/object), heading (degrees, 0 = north), fov (degrees), '
           'heading_fahrt (direction of travel from the sequence), blick (best estimate of the viewing direction) with blick_quelle, pano (360 degrees), date, author, license, nutzung (frei = CC0/CC BY/CC BY-SA/public domain; nur ansehen = NC, ND or unclear), page, url_small (about 500 px), url, url_large',
    sources=info, photos=rows))


def year(p):
    m = re.search(r'(1[89]\d\d|20\d\d)', p.get('date') or '')
    return m.group(1) if m else 'ohne'


stats = collections.OrderedDict()
for src in sorted({p['source'].split('/')[0] for p in rows}):
    ps = [p for p in rows if p['source'].split('/')[0] == src]
    stats[src] = dict(
        fotos=len(ps), doppelt=sum(1 for p in ps if p.get('dup_of')), je_gebiet=dict(collections.Counter(str(p['gebiet']) for p in ps)),
        jahre=dict(sorted(collections.Counter(year(p) for p in ps).items())), lizenzen=dict(collections.Counter(p['license'] or '?' for p in ps).most_common(15)),
        nutzung=dict(collections.Counter(p['nutzung'] for p in ps)), mit_position=sum(1 for p in ps if p['lat'] is not None),
        kameraposition=sum(1 for p in ps if p.get('position') == 'camera'), mit_blickrichtung=sum(1 for p in ps if p.get('heading') is not None),
        rundum_360=sum(1 for p in ps if p.get('pano')), aussenansicht=sum(1 for p in ps if p.get('relevant')),
        urheber=dict(collections.Counter(p['author'] or '?' for p in ps).most_common(10)), bildwinkel=dict(collections.Counter(str(p.get('fov')) for p in ps).most_common(6)) if src == 'panoramax' else None)
slib.save('quellen.json', dict(version=1, made=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), areas=areas.source, quellen=stats, herkunft=info,
                               mapillary='not asked: the Mapillary API needs an access token (an account); none was created',), indent=1)
print(len(rows), 'photos in katalog_suhl.json.gz')
for s, v in stats.items(): print(' ', s, v['fotos'], 'gebiet', v['je_gebiet'], 'jahre', v['jahre'], 'mit Blickrichtung', v['mit_blickrichtung'], 'nutzung', v['nutzung'])
