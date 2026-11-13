"""Street-level photos of the whole municipality of Suhl from the Panoramax meta catalogue (all instances; open photos,
faces and number plates blurred). Metadata only - no image is downloaded here.
The search has no paging: a box that returns as many pictures as the limit is split into four (quadtree).
    python3 tools/suhl/fotos/collect_panoramax.py [gebiete.geojson]     ->  tools/suhl/out/fotos/panoramax.json.gz"""
import sys, os, json, collections, datetime
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import slib

API = 'https://api.panoramax.xyz/api/search'
LIMIT = 1000
areas = slib.Areas(sys.argv[1] if len(sys.argv) > 1 else None)
calls = [0]


def search(b, depth=0):
    url = f'{API}?bbox={b[0]:.6f},{b[1]:.6f},{b[2]:.6f},{b[3]:.6f}&limit={LIMIT}'
    fs = slib.get_json(url, pause=1.0).get('features', []); calls[0] += 1
    if len(fs) < LIMIT or (b[2] - b[0]) < 0.0004:
        if len(fs) >= LIMIT: print('  WARNING: box still full, pictures may be missing', b, flush=True)
        return fs
    mx, my = (b[0] + b[2]) / 2, (b[1] + b[3]) / 2
    out = []
    for q in ((b[0], b[1], mx, my), (mx, b[1], b[2], my), (b[0], my, mx, b[3]), (mx, my, b[2], b[3])): out += search(q, depth + 1)
    return out


b = areas.bbox('stadt', pad=0.003) if 'stadt' in areas.geom else areas.bbox('kernstadt', pad=0.003)
nx, ny = 6, 4   # start with a grid so that no single answer is huge
feats = {}
for i in range(nx):
    for j in range(ny):
        q = (b[0] + (b[2] - b[0]) * i / nx, b[1] + (b[3] - b[1]) * j / ny, b[0] + (b[2] - b[0]) * (i + 1) / nx, b[1] + (b[3] - b[1]) * (j + 1) / ny)
        for f in search(q): feats[f['id']] = f
    print(f'column {i + 1}/{nx}: {len(feats)} pictures so far, {calls[0]} calls', flush=True)

photos = []
for f in feats.values():
    p = f.get('properties') or {}; a = f.get('assets') or {}; io = p.get('pers:interior_orientation') or {}
    lon, lat = f['geometry']['coordinates'][:2]
    fov = io.get('field_of_view')
    lic = (p.get('license') or '').replace('CC-BY-SA-4.0', 'CC BY-SA 4.0').replace('etalab-2.0', 'Etalab 2.0')
    lic_url = next((l['href'] for l in f.get('links', []) if l.get('rel') == 'license'), None)
    inst = next((l.get('instance_name') for l in f.get('links', []) if l.get('rel') == 'via'), None)
    photos.append(dict(
        id='pmx:' + f['id'], source='panoramax', gebiet=areas.of(lat, lon), lat=round(lat, 7), lon=round(lon, 7),
        heading=p.get('view:azimuth'), fov=fov, pano=bool(fov and fov >= 300), date=(p.get('datetime') or '')[:19],
        author=(f.get('providers') or [{}])[0].get('name') or p.get('geovisio:producer'), license=lic, license_url=lic_url,
        page=f'https://api.panoramax.xyz/#focus=pic&pic={f["id"]}',
        url_small=(a.get('thumb') or {}).get('href'), url=(a.get('sd') or {}).get('href'), url_large=(a.get('hd') or {}).get('href'),
        seq=f.get('collection'), rank=p.get('geovisio:rank_in_collection'), instance=inst,
        camera=' '.join(str(v) for v in (io.get('camera_manufacturer'), io.get('camera_model')) if v) or None,
        acc_m=p.get('quality:horizontal_accuracy'), px_per_deg=p.get('panoramax:horizontal_pixel_density')))
photos.sort(key=lambda q: (q['seq'] or '', q['rank'] or 0, q['id']))
out = dict(version=1, fetched=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), api=API, bbox=[round(v, 5) for v in b],
           areas=areas.source, calls=calls[0], photos=photos)
print(slib.save('panoramax.json.gz', out), len(photos), 'pictures,', calls[0], 'calls')
c = collections.Counter
print('gebiet', dict(c(q['gebiet'] for q in photos)))
print('author', c(q['author'] for q in photos).most_common(12))
print('year', dict(sorted(c(q['date'][:4] for q in photos).items())))
print('license', dict(c(q['license'] for q in photos)), 'instance', dict(c(q['instance'] for q in photos)))
print('fov', c(q['fov'] for q in photos).most_common(8), 'pano', sum(q['pano'] for q in photos), 'with heading', sum(q['heading'] is not None for q in photos))
