#!/usr/bin/env python3
"""Where do open street photos exist? Panoramax (api.panoramax.xyz, pictures CC-BY-SA 4.0 by their authors) and geotagged files on
Wikimedia Commons around our places. Writes OUT_DIR/panoramax.csv, commons_dateien.csv and abdeckung.json (counts per place and 100-m cell).
  python3 -I tools/daten/abdeckung.py OUT_DIR
Only metadata (position, date, id, licence) is stored, no pictures."""
import csv, json, math, os, sys, time, urllib.parse, urllib.request
UA = 'pavillon-ratscher daten-katalog/1.0 (open-data research for a hobby 3D map; github.com/mynametouse/pavillon-ratscher)'
AREAS = {'ratscher': (50.49082, 10.75362, 50.50093, 10.77794), 'schleusingen': (50.49684, 10.72576, 50.52261, 10.77567), 'vessra': (50.48815, 10.63301, 50.49882, 10.65245)}
CENTER = {'ratscher': (50.4991, 10.7692), 'schleusingen': (50.5100, 10.7525), 'vessra': (50.4935, 10.6420)}


def get(url):
    for i in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r:
                return json.loads(r.read())
        except Exception as e:
            time.sleep(2 * (i + 1))
    raise RuntimeError(url)


def panoramax(box):
    s, w, n, e = box
    out, seen = [], set()
    # the search is capped per call: walk the box in small cells
    step = 0.004
    la = s
    while la < n:
        lo = w
        while lo < e:
            url = 'https://api.panoramax.xyz/api/search?' + urllib.parse.urlencode({'bbox': f'{lo:.5f},{la:.5f},{lo + step:.5f},{la + step:.5f}', 'limit': 1000})
            for f in get(url).get('features', []):
                if f['id'] in seen:
                    continue
                seen.add(f['id'])
                c = f['geometry']['coordinates']
                p = f.get('properties', {})
                out.append({'id': f['id'], 'lat': round(c[1], 6), 'lon': round(c[0], 6), 'datum': (p.get('datetime') or '')[:10], 'sammlung': f.get('collection', ''),
                            'lizenz': p.get('license', ''), 'azimut': p.get('view:azimuth', '')})
            lo += step
            time.sleep(0.2)
        la += step
    return out


def commons(c, radius=1500):
    out = []
    url = 'https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode({'action': 'query', 'list': 'geosearch', 'gscoord': f'{c[0]}|{c[1]}', 'gsradius': radius, 'gslimit': 500,
                                                                                'gsnamespace': 6, 'format': 'json'})
    for r in get(url).get('query', {}).get('geosearch', []):
        out.append({'titel': r['title'], 'lat': r['lat'], 'lon': r['lon'], 'abstand_m': round(r['dist'])})
    return out


def main():
    out = sys.argv[1]
    os.makedirs(out, exist_ok=True)
    pan, com, summ = [], [], {}
    for k, box in AREAS.items():
        p = panoramax(box)
        for r in p: r['ort'] = k
        pan += p
        cells = {(round(r['lat'] / 0.0009), round(r['lon'] / 0.0014)) for r in p}
        summ[k] = {'panoramax_bilder': len(p), 'panoramax_zellen_100m': len(cells), 'sammlungen': sorted({r['sammlung'][:8] for r in p}), 'jahre': sorted({r['datum'][:4] for r in p})}
        if '--ohne-commons' not in sys.argv:  # the Wikimedia APIs answer 429 on shared proxy addresses: run that part on GitHub Actions
            try:
                c = commons(CENTER[k])
            except RuntimeError as ex:
                print('commons failed', ex); c = []
            for r in c: r['ort'] = k
            com += c
            summ[k]['commons_dateien_1500m'] = len(c)
        print(k, summ[k], flush=True)
    for name, rows in (('panoramax.csv', pan), ('commons_dateien.csv', com)):
        if not rows: continue
        with open(os.path.join(out, name), 'w', newline='', encoding='utf-8') as f:
            w = csv.DictWriter(f, fieldnames=['ort'] + [x for x in rows[0] if x != 'ort'], delimiter=';')
            w.writeheader(); w.writerows(rows)
    json.dump(summ, open(os.path.join(out, 'abdeckung.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__': main()
