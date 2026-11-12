"""KartaView pictures of the Kernstadt of Suhl through the public API at api.kartaview.org (no account, no token): one question per
circle of 500 m (the largest radius the API accepts) on a 700 m grid over the Kernstadt, pages of 500. Works from the chat machine.
Replaces the first probe collect_kartaview.py, which asked the old host api.openstreetcam.org (invalid certificate) - that file is
left as it is because a change to it would start the whole workflow again.
    python3 tools/suhl/fotos/kartaview.py     ->  tools/suhl/out/fotos/kartaview.json"""
import sys, os, json, datetime, collections, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import slib

API = 'https://api.kartaview.org/2.0/photo/'
areas = slib.Areas()
b = areas.bbox('kernstadt')
x0, y0 = slib.xy(b[1], b[0]); x1, y1 = slib.xy(b[3], b[2])
S, R = 700.0, 500
cells = []
for i in range(int((x1 - x0) / S) + 2):
    for j in range(int((y1 - y0) / S) + 2):
        cx, cy = x0 + i * S, y0 + j * S
        ring = [(cx, cy)] + [(cx + R * dx, cy + R * dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1), (.7, .7), (-.7, .7), (.7, -.7), (-.7, -.7))]
        if any(areas.has('kernstadt', *slib.ll(px, py)) for px, py in ring): cells.append((cx, cy))
def control():
    """The same question at a place that has pictures (Erfurt, Domplatz): shows that an empty answer for Suhl means 'no pictures', not 'wrong question'."""
    try:
        d = slib.get_json(f'{API}?lat=50.9787&lng=11.0328&radius={R}&itemsPerPage=5&page=1', pause=1.0, tries=3, timeout=60)
        its = (d.get('result') or {}).get('data') or []
        return dict(place='Erfurt 50.9787 N, 11.0328 E', items_on_first_page_of_5=len(its), has_more=(d.get('result') or {}).get('hasMoreData'),
                    first_shot_date=(its[0].get('shotDate') if its else None))
    except Exception as e:
        return dict(place='Erfurt 50.9787 N, 11.0328 E', error=str(e)[:160])


if os.environ.get('KV_CONTROL_ONLY'):   # add the control question to an existing result without asking all circles again
    d = slib.load('kartaview.json'); d['control'] = control(); print(slib.save('kartaview.json', d), d['control']); sys.exit(0)

photos, log, calls, first_keys = {}, [], 0, None
for n, (cx, cy) in enumerate(cells):
    lat, lon = slib.ll(cx, cy)
    for page in range(1, 21):
        url = f'{API}?lat={lat:.6f}&lng={lon:.6f}&radius={R}&itemsPerPage=500&page={page}'
        try:
            d = slib.get_json(url, pause=1.0, tries=3, timeout=60); calls += 1
        except urllib.error.HTTPError as e:
            calls += 1; log.append(dict(lat=round(lat, 5), lon=round(lon, 5), page=page, status=e.code, note=e.read()[:160].decode('utf-8', 'replace'))); break
        except Exception as e:
            log.append(dict(lat=round(lat, 5), lon=round(lon, 5), page=page, status=None, note=str(e)[:160])); break
        res = d.get('result') or {}
        its = res.get('data') or []
        if its and first_keys is None: first_keys = sorted(its[0].keys())
        for it in its:
            try: la, lo = float(it.get('lat')), float(it.get('lng'))
            except (TypeError, ValueError): continue
            pid = str(it.get('id'))
            photos[pid] = dict(id='kv:' + pid, source='kartaview', lat=round(la, 7), lon=round(lo, 7),
                               heading=float(it['heading']) if it.get('heading') not in (None, '') else None,
                               fov=float(it['fieldOfView']) if it.get('fieldOfView') not in (None, '', '0') else None,
                               pano=str(it.get('projection') or '').upper() in ('SPHERE', 'EQUIRECTANGULAR'), date=str(it.get('shotDate') or it.get('dateAdded') or '')[:19],
                               author=None, license='CC BY-SA 4.0', license_url='https://creativecommons.org/licenses/by-sa/4.0/',
                               page=f"https://kartaview.org/details/{it.get('sequenceId')}/{it.get('sequenceIndex') or 0}",
                               url_small=it.get('fileurlTh') or it.get('fileurlLTh'), url=it.get('fileurlLTh') or it.get('fileurlProc'), url_large=it.get('fileurl') or it.get('fileurlProc'),
                               seq='kv' + str(it.get('sequenceId')), rank=int(it.get('sequenceIndex') or 0), camera=None)
        if not res.get('hasMoreData') or not its: break
    if n % 10 == 9: print(f'circle {n + 1}/{len(cells)}: {len(photos)} pictures, {calls} calls', flush=True)
ps = sorted(photos.values(), key=lambda p: (p['seq'], p['rank']))
for p in ps: p['gebiet'] = areas.of(p['lat'], p['lon'])
out = dict(version=2, fetched=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), api=API, where='chat machine',
           note='Kernstadt only (circles of 500 m on a 700 m grid). Licence CC BY-SA 4.0 as stated for KartaView in the OpenStreetMap wiki; no author names in the API answer. '
                'The first probe from GitHub Actions asked the old host and failed (log/kartaview.log).',
           circles=len(cells), calls=calls, errors=log, item_keys=first_keys, control=control(), photos=ps)
print(slib.save('kartaview.json', out, indent=None), len(ps), 'pictures in', len(cells), 'circles,', calls, 'calls,', len(log), 'errors')
c = collections.Counter
print('gebiet', dict(c(p['gebiet'] for p in ps)), 'years', dict(sorted(c(p['date'][:4] for p in ps).items())), 'with heading', sum(p['heading'] is not None for p in ps), 'pano', sum(p['pano'] for p in ps), 'sequences', len({p['seq'] for p in ps}))
