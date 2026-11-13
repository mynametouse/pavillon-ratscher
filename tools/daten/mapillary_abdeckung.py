#!/usr/bin/env python3
"""Mapillary image coverage around our places (metadata only: position, date, direction, sequence). The access token comes from the
environment (GitHub secret MAPILLARY_TOKEN – never from the chat, never into the repo); without it the script says so and ends with 0.

  MAPILLARY_TOKEN=... python3 -I tools/daten/mapillary_abdeckung.py OUT_DIR

Mapillary API v4: https://graph.mapillary.com/images?bbox=W,S,E,N (a box must be smaller than 0.01 square degrees; the script walks 0.004-degree
cells). The images are CC BY-SA 4.0 by their authors (attribution: 'Mapillary, CC BY-SA 4.0, <creator>') – only metadata is stored here."""
import csv, json, os, sys, time, urllib.parse, urllib.request, urllib.error

AREAS = {'ratscher': (50.49082, 10.75362, 50.50093, 10.77794), 'schleusingen': (50.49684, 10.72576, 50.52261, 10.77567), 'vessra': (50.48815, 10.63301, 50.49882, 10.65245)}
# the roads between the places (rough boxes along L 3004 / B 247 / B 89, one cell each) – coverage there matters for the drive
STRECKEN = {'schleusingen_vessra': (50.490, 10.650, 50.512, 10.727), 'schleusingen_suhl': (50.512, 10.690, 50.560, 10.752)}
FIELDS = 'id,captured_at,compass_angle,is_pano,sequence,creator,geometry'


def get(url, token):
    for i in range(4):
        try:
            req = urllib.request.Request(url, headers={'Authorization': 'OAuth ' + token, 'User-Agent': 'pavillon-ratscher daten-katalog'})
            with urllib.request.urlopen(req, timeout=60) as r:
                return json.loads(r.read())
        except urllib.error.HTTPError as e:
            if e.code in (400, 401, 403):
                raise
            time.sleep(3 * (i + 1))
        except Exception:
            time.sleep(3 * (i + 1))
    raise RuntimeError('Mapillary API failed')


def cells(box, step=0.004):
    s, w, n, e = box
    la = s
    while la < n:
        lo = w
        while lo < e:
            yield (lo, la, min(lo + step, e), min(la + step, n))
            lo += step
        la += step


def main():
    token = os.environ.get('MAPILLARY_TOKEN', '').strip()
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    if not token:
        msg = 'MAPILLARY_TOKEN not set - skipped (add the GitHub secret MAPILLARY_TOKEN, then run the workflow again).'
        open(os.path.join(out, 'mapillary_uebersprungen.txt'), 'w').write(msg + '\n')
        print(msg)
        return 0
    rows, seen, summ = [], set(), {}
    for name, box in {**AREAS, **STRECKEN}.items():
        n0 = len(rows)
        for lo, la, lo2, la2 in cells(box):
            url = 'https://graph.mapillary.com/images?' + urllib.parse.urlencode({'bbox': f'{lo:.5f},{la:.5f},{lo2:.5f},{la2:.5f}', 'fields': FIELDS, 'limit': 2000})
            try:
                data = get(url, token).get('data', [])
            except urllib.error.HTTPError as e:
                print('HTTP', e.code, 'for', name, '- stopping:', e.read()[:200])
                return 1
            for d in data:
                if d['id'] in seen:
                    continue
                seen.add(d['id'])
                c = d['geometry']['coordinates']
                rows.append({'ort': name, 'id': d['id'], 'lat': round(c[1], 6), 'lon': round(c[0], 6), 'aufgenommen': time.strftime('%Y-%m-%d', time.gmtime(d['captured_at'] / 1000)) if d.get('captured_at') else '',
                             'blickrichtung': d.get('compass_angle', ''), 'panorama': d.get('is_pano', ''), 'sequenz': d.get('sequence', ''), 'urheber': (d.get('creator') or {}).get('username', '')})
            time.sleep(0.3)
        mine = rows[n0:]
        summ[name] = {'bilder': len(mine), 'zellen_100m': len({(round(r['lat'] / 0.0009), round(r['lon'] / 0.0014)) for r in mine}), 'sequenzen': len({r['sequenz'] for r in mine}),
                      'jahre': sorted({r['aufgenommen'][:4] for r in mine if r['aufgenommen']})}
        print(name, summ[name], flush=True)
    if rows:
        with open(os.path.join(out, 'mapillary.csv'), 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=list(rows[0]), delimiter=';')
            w.writeheader(); w.writerows(rows)
    json.dump(summ, open(os.path.join(out, 'mapillary_abdeckung.json'), 'w'), ensure_ascii=False, indent=1)
    return 0


if __name__ == '__main__':
    sys.exit(main())
