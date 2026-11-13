"""KartaView (formerly OpenStreetCam): is there an open API and does it have pictures of Suhl? Runs in GitHub Actions
(api.openstreetcam.org is not reachable from the chat machine). A probe, written without a test run: it asks the documented
public endpoints around a few points of the city, without any account or token, and writes down honestly what came back
(HTTP status, field names, number of pictures). Whatever has a position is kept in a simple list.
    python tools/suhl/fotos/collect_kartaview.py     ->  tools/suhl/out/fotos/kartaview.json"""
import sys, os, json, datetime, urllib.parse, urllib.error
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import slib

BASE = 'https://api.openstreetcam.org'
POINTS = {'zentrum': (50.6087, 10.6926), 'suhl-nord': (50.6230, 10.7030), 'heinrichs': (50.5950, 10.6690), 'zella-mehlis (Vergleich)': (50.6580, 10.6650)}
log, photos = [], {}


def ask(name, url, data=None):
    e = dict(probe=name, url=url, post=bool(data))
    try:
        raw = slib.get(url, pause=2.0, tries=2, timeout=60, data=urllib.parse.urlencode(data).encode() if data else None)
        e['status'] = 200; e['bytes'] = len(raw)
        try: d = json.loads(raw)
        except ValueError:
            e['note'] = 'answer is not JSON: ' + raw[:120].decode('utf-8', 'replace'); log.append(e); return None
        e['keys'] = sorted(d.keys())[:20] if isinstance(d, dict) else type(d).__name__
        log.append(e); return d
    except urllib.error.HTTPError as ex:
        e['status'] = ex.code; e['note'] = str(ex.reason)[:120]
    except Exception as ex:
        e['status'] = None; e['note'] = str(ex)[:160]
    log.append(e); return None


def items_of(d):
    """The list of pictures in an answer, wherever the API version puts it."""
    if not isinstance(d, dict): return []
    for path in (('result', 'data'), ('currentPageItems',), ('result',), ('data',)):
        x = d
        for k in path: x = x.get(k) if isinstance(x, dict) else None
        if isinstance(x, list): return x
    return []


for place, (lat, lon) in POINTS.items():
    d = ask(f'v2 photo near {place}', f'{BASE}/2.0/photo/?lat={lat}&lng={lon}&radius=1500&itemsPerPage=500&page=1')
    its = items_of(d)
    if not its:
        d = ask(f'v1 nearby-photos near {place}', f'{BASE}/1.0/list/nearby-photos/', data=dict(lat=lat, lng=lon, radius=1500))
        its = items_of(d)
    log[-1]['items'] = len(its)
    if its and isinstance(its[0], dict): log[-1]['item_keys'] = sorted(its[0].keys())[:40]
    for it in its:
        if not isinstance(it, dict): continue
        try: la, lo = float(it.get('lat')), float(it.get('lng') if it.get('lng') is not None else it.get('lon'))
        except (TypeError, ValueError): continue
        pid = str(it.get('id') or f'{la},{lo}')
        photos[pid] = dict(id='kv:' + pid, source='kartaview', lat=round(la, 7), lon=round(lo, 7), heading=it.get('heading'), fov=it.get('fieldOfView'),
                           pano=str(it.get('projection') or '').upper() in ('SPHERE', 'EQUIRECTANGULAR'), date=str(it.get('shotDate') or it.get('shot_date') or it.get('dateAdded') or '')[:19],
                           author=it.get('username') or it.get('userId'), license='CC BY-SA 4.0', license_url='https://creativecommons.org/licenses/by-sa/4.0/',
                           page=f'https://kartaview.org/details/{it.get("sequenceId") or it.get("sequence_id")}/{it.get("sequenceIndex") or it.get("sequence_index") or 0}',
                           url_small=it.get('fileurlTh') or it.get('lth_name'), url=it.get('fileurlLTh') or it.get('fileurlProc') or it.get('name'), url_large=it.get('fileurl') or it.get('name'),
                           seq=it.get('sequenceId') or it.get('sequence_id'), place=place)
out = dict(version=1, fetched=datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%MZ'), base=BASE,
           note='Probe without account or token. The licence CC BY-SA 4.0 is what KartaView states for its pictures; check per picture before use. '
                'Pictures near Zella-Mehlis are only a comparison (does the service answer at all?) and are not part of Suhl.',
           probes=log, photos=[p for p in photos.values()])
print(slib.save('kartaview.json', out, indent=1), len(photos), 'pictures')
for e in log: print(' ', e.get('probe'), '->', e.get('status'), e.get('items'), e.get('note', ''))
