#!/usr/bin/env python3
"""Reference photos for modelling, fetched in GitHub Actions into the artifact (never into the repo): Wikimedia Commons files by title
(the licence and author of each go with it into fotos.json). Karten-Chat, 19.11.2026: the village wells of Ratscher – the daten-katalog
knows „Ratscher, Schleusingen 1–7“ 3–11 m from the wells (OSM water_well / fountain).

    python3 -I tools/gelaende/fotos.py --out out/fotos "File:Ratscher, Schleusingen 7.jpg" …
"""
import argparse, json, os, re, time, urllib.parse, urllib.request

UA = 'PavillonRatscher-Fotos/0.1 (+https://github.com/mynametouse/pavillon-ratscher; reference photos for a 3D model, non-commercial)'


def get(url, tries=4):
    for k in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers={'User-Agent': UA}), timeout=60) as r:
                return r.read()
        except Exception as e:
            print('retry', k, url[:120], repr(e)[:120], flush=True)
            time.sleep(5 * (k + 1))
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='out/fotos')
    ap.add_argument('--width', type=int, default=1600)
    ap.add_argument('titles', nargs='+')
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    q = {'action': 'query', 'format': 'json', 'prop': 'imageinfo', 'iiprop': 'url|extmetadata|size', 'iiurlwidth': str(a.width),
         'titles': '|'.join(a.titles)}
    d = json.loads(get('https://commons.wikimedia.org/w/api.php?' + urllib.parse.urlencode(q)))
    meta = []
    for p in d['query']['pages'].values():
        ii = (p.get('imageinfo') or [{}])[0]
        md = ii.get('extmetadata', {})
        strip = lambda s: re.sub('<[^>]+>', '', s or '').strip()
        m = {'title': p['title'], 'thumb': ii.get('thumburl'), 'page': ii.get('descriptionurl'),
             'description': strip(md.get('ImageDescription', {}).get('value'))[:500], 'licence': md.get('LicenseShortName', {}).get('value'),
             'author': strip(md.get('Artist', {}).get('value'))[:200], 'date': strip(md.get('DateTimeOriginal', {}).get('value'))[:40],
             'categories': strip(md.get('Categories', {}).get('value'))[:300]}
        if m['thumb']:
            b = get(m['thumb'])
            if b:
                fn = re.sub(r'[^A-Za-z0-9_.-]+', '_', p['title'].split(':', 1)[1])
                open(os.path.join(a.out, fn), 'wb').write(b)
                m['file'] = fn
        meta.append(m)
        print(m['title'], m.get('file'), m['licence'], m['author'][:60], m['description'][:120], flush=True)
        time.sleep(1)
    json.dump(meta, open(os.path.join(a.out, 'fotos.json'), 'w'), ensure_ascii=False, indent=1)


if __name__ == '__main__':
    main()
