"""Merge the photo catalogues (Panoramax, Wikimedia Commons, Openverse) into one katalog.json with one schema:
zone by position (else by category), relevance for building the detail zones (outside views of streets, houses, landscape -
not museum objects, interiors, documents, grave close-ups), licence and attribution per photo.
    python3 -I tools/fotos/merge.py <panoramax.json> <commons katalog.json> <openverse.json> tools/fotos/katalog.json"""
import sys, json, re, math, datetime

PMX, COM, OPV, OUT = sys.argv[1:5]
ZONES = {   # centre (lat, lon), radius m, name - checked with OpenStreetMap/Nominatim and the site origin of the model (garden 50.4991 N, 10.7692 E)
    'ratscher': ((50.4971, 10.7736), 1200, 'Ratscher mit Garten'),
    'talsperre': ((50.4875, 10.7913), 2600, 'Talsperre/Bergsee Ratscher mit Umgebung'),
    'schleusingen': ((50.5098, 10.7526), 1500, 'Schleusingen (Stadt)'),
    'kloster-vessra': ((50.4925, 10.6435), 1000, 'Kloster Veßra mit Klosteranlage und Baumschule Kammbach'),
    'geisenhoehn': ((50.4948, 10.7573), 600, 'Geisenhöhn'),
    'rappelsdorf': ((50.4985, 10.7208), 800, 'Rappelsdorf'),
    'suhl': ((50.6087, 10.6926), 5000, 'Suhl'),
}
CAT_ZONE = [(r'Talsperre Ratscher|Bergsee', 'talsperre'), (r'Ratscher', 'ratscher'), (r'Geisenh(ö|oe)hn', 'geisenhoehn'), (r'Rappelsdorf', 'rappelsdorf'),
            (r'Kloster Ve(ß|ss)ra|Veßra|Vessra', 'kloster-vessra'), (r'^(Markt|Bertholdsburg|Buildings in|Kirchstraße|Klosterstraße|Bertholdstraße|Christian-Juncker).*Schleusingen', 'schleusingen')]
NOT_RELEVANT = re.compile(r'exhibit|exponat|specimen|präparat|mineral|fossil|taxiderm|stuffed|insect|insekt|käfer|beetle|butterfl|schmetterling|skull|schädel|skelett|'
                          r'skeleton|\bcoins?\b|münze|medal|medaille|manuscript|handschrift|urkunde|document|\bbook|painting|gemälde|portrait|porträt|bildnis|gravestone|'
                          r'grabstein|grabmal|grave of|epitaph|siegel|\bseal\b|stamp|briefmarke|wappen|coat of arms|\bmaps?\b|\bkarte\b|logo|signature|interior|'
                          r'innenansicht|innenraum|\borgel|\borgan\b|altar|kanzel|pulpit|stained glass|glasfenster|ceiling|vitrine|showcase|zinnfigur|\bdolls?\b|'
                          r'puppe|\btoys?\b|spielzeug|uniform|weapon|waffe|rüstung|armou?r|naturhistorisches museum.*(objekt|sammlung)|collections of', re.I)

def dist(a, b):
    la = math.radians((a[0] + b[0]) / 2)
    return math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * math.cos(la))

def zone_of(pos, cats, found):
    if pos:
        best = min(((dist(pos, c), z) for z, (c, r, _) in ZONES.items() if dist(pos, c) <= r), default=None)
        if best: return best[1]
    for rx, z in CAT_ZONE:
        if any(re.search(rx, c) for c in cats): return z
    return found if not pos else 'umland'

fotos = []
for zone, items in json.load(open(PMX)).items():   # Panoramax: zone by position only
    for it in items:
        pos = (it['lat'], it['lon'])
        fotos.append(dict(id='pmx:' + it['id'], source='panoramax', zone=zone_of(pos, [], zone), lat=round(it['lat'], 7), lon=round(it['lon'], 7),
                          heading=it.get('azimuth'), fov=it.get('fov'), date=(it.get('time') or '')[:10], author=it.get('producer'), license='CC BY-SA 4.0',
                          license_url='https://creativecommons.org/licenses/by-sa/4.0/', page=it['page'], url=it['sd'], url_large=it['hd'],
                          title='', description='', categories=[], relevant=True, file=f"{zone}/pmx_{it['id']}.jpg"))
for zone, items in json.load(open(COM)).items():
    for t, m in items.items():
        pos = m['camera'] or m['object']; text = ' '.join([t, m.get('description') or '', ' '.join(m['categories'])])
        z = zone_of(tuple(pos) if pos else None, m['categories'], zone)
        head = m.get('heading')
        try: head = float(head) if head is not None else None
        except ValueError: head = {'N': 0, 'NE': 45, 'E': 90, 'SE': 135, 'S': 180, 'SW': 225, 'W': 270, 'NW': 315}.get(head)
        name = re.sub(r'[^\w.\-]+', '_', t.split(':', 1)[1], flags=re.U); base, ext = name.rsplit('.', 1) if '.' in name else (name, 'jpg')
        fotos.append(dict(id='commons:' + t, source='commons', zone=z, lat=round(pos[0], 7) if pos else None, lon=round(pos[1], 7) if pos else None,
                          position='camera' if m['camera'] else 'object' if m['object'] else None, heading=head, date=m.get('date') or '', author=m.get('author'),
                          license=m.get('license'), license_url=m.get('license_url'), page=m['page'], url=m['url'], url_large=m['original'], title=t,
                          description=m.get('description') or '', categories=m['categories'], relevant=not NOT_RELEVANT.search(text),
                          file=f"{z}/commons_{base[:100]}.{ext.lower() if ext.lower() in ('jpg', 'jpeg', 'png') else 'jpg'}"))
try: opv = json.load(open(OPV))
except FileNotFoundError: opv = {}
for zone, items in opv.items():
    for it in items:
        text = ' '.join([it.get('title') or '', ' '.join(it.get('tags') or [])])
        fotos.append(dict(id='openverse:' + it['id'], source='openverse/' + (it.get('source') or ''), zone=zone, lat=None, lon=None, heading=None, date='',
                          author=it.get('author'), license=it.get('license'), license_url=it.get('license_url'), page=it.get('page'), url=it.get('url'),
                          url_large=it.get('url'), title=it.get('title') or '', description='', categories=it.get('tags') or [],
                          relevant=not NOT_RELEVANT.search(text), file=f"{zone}/openverse_{it['id']}.jpg"))
# a photo found for two places once only (Panoramax ids are unique; Commons titles may repeat across zones)
seen, uniq = set(), []
for f in fotos:
    if f['id'] in seen: continue
    seen.add(f['id']); uniq.append(f)
# file names follow the final zone
for f in uniq: f['file'] = f['zone'] + '/' + f['file'].split('/', 1)[1]
out = dict(version=1, date=datetime.date.today().isoformat(),
           zones={z: dict(name=n, centre=list(c), radius_m=r) for z, (c, r, n) in ZONES.items()},
           sources={'panoramax': 'https://panoramax.xyz – Straßenfotos, CC BY-SA 4.0, Gesichter/Kennzeichen verpixelt; Namensnennung: Urheber, „via Panoramax“',
                    'commons': 'https://commons.wikimedia.org – Lizenz je Foto (CC0, CC BY, CC BY-SA, gemeinfrei); Namensnennung laut Feld author/license',
                    'openverse': 'https://openverse.org – offen lizenzierte Fotos u. a. von Flickr; Lizenz je Foto'},
           photos=uniq)
json.dump(out, open(OUT, 'w'), ensure_ascii=False, separators=(',', ':'))
import collections
c = collections.Counter((f['zone'], f['source'].split('/')[0], f['relevant']) for f in uniq)
for z in list(ZONES) + ['umland']:
    row = {s: f"{c[(z, s, True)]}+{c[(z, s, False)]}" for s in ('panoramax', 'commons', 'openverse') if c[(z, s, True)] + c[(z, s, False)]}
    print(f'{z:15s}', row)
print('total', len(uniq), 'relevant', sum(f['relevant'] for f in uniq))
