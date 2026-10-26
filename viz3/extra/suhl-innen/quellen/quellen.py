#!/usr/bin/env python3
"""Research for the Suhl interiors (feat/suhl-innen) – runs in GitHub Actions only (the chat machine reaches neither OSM nor Commons).

Writes into OUT (default ./ref):
  osm.json            candidate buildings from OpenStreetMap (Overpass): churches, museum, CCS, cafés/bakeries at the Markt and Steinweg,
                      the sports grounds of the Aue with buildings beside them, residential blocks of the Aue and Suhl-Nord (levels), shops
                      and schools of Suhl-Nord – each with id, tags, centre and outline (WGS84)
  wiki/*.txt          plain text of the German Wikipedia articles (read for the description of the interiors, not shipped)
  sheets/*.jpg        contact sheets (≤ 1024 px) of Commons photos – only CC0, CC BY, CC BY-SA, public domain – with id, title, licence
  CREDITS.md          author, licence, source of every photo on a sheet
The results go to the scratch branch ref/suhl-innen-fotos (never merged); a summary goes into the job log.
"""
import io
import json
import math
import os
import re
import sys
import time

import requests
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1] if len(sys.argv) > 1 else 'ref'
UA = {'User-Agent': 'pavillon-ratscher-research/1.0 (https://github.com/mynametouse/pavillon-ratscher; feat/suhl-innen)'}
S = requests.Session()
S.headers.update(UA)
os.makedirs(OUT + '/wiki', exist_ok=True)
os.makedirs(OUT + '/sheets', exist_ok=True)

# ---------------------------------------------------------------- OpenStreetMap
OVERPASS = ['https://overpass-api.de/api/interpreter', 'https://overpass.kumi.systems/api/interpreter',
            'https://overpass.private.coffee/api/interpreter']


def overpass(q):
    for url in OVERPASS:
        for k in range(2):
            try:
                r = S.post(url, data={'data': q}, timeout=180)
                if r.status_code == 200:
                    return r.json()
                print('overpass', url, r.status_code, r.text[:200])
            except Exception as e:
                print('overpass', url, e)
            time.sleep(5)
    return {'elements': []}


BB = '50.575,10.630,50.650,10.760'
Q = f"""[out:json][timeout:170];
(
  nwr["amenity"="place_of_worship"]({BB});
  nwr["tourism"="museum"]({BB});
  nwr["name"~"Congress|CCS|Stadthalle|Kulturhaus",i]({BB});
  nwr["amenity"~"^(cafe|restaurant|ice_cream)$"](50.600,10.680,50.616,10.700);
  nwr["shop"~"^(bakery|pastry|confectionery)$"](50.600,10.680,50.616,10.700);
  nwr["leisure"~"^(pitch|stadium|sports_centre|sports_hall)$"]({BB});
  nwr["club"]({BB});
  nwr["shop"~"^(supermarket|mall|department_store)$"]({BB});
  nwr["amenity"~"^(school|kindergarten|community_centre)$"]({BB});
  nwr["place"~"^(suburb|quarter|neighbourhood|city)$"]({BB});
  nwr["building"="apartments"]({BB});
  nwr["building"="residential"]["building:levels"]({BB});
  nwr["building"]["building:levels"~"^(5|6|7|8|9|10|11|12|13|14|15|16|17|18)$"]({BB});
);
out tags geom;"""


def centre(el):
    if el.get('type') == 'node':
        return [el['lat'], el['lon']]
    if 'geometry' in el:
        pts = [g for g in el['geometry'] if g]
        if pts:
            return [sum(p['lat'] for p in pts) / len(pts), sum(p['lon'] for p in pts) / len(pts)]
    if 'bounds' in el:
        b = el['bounds']
        return [(b['minlat'] + b['maxlat']) / 2, (b['minlon'] + b['maxlon']) / 2]
    return None


def dist(a, b):
    return math.hypot((a[0] - b[0]) * 111320, (a[1] - b[1]) * 111320 * math.cos(math.radians(a[0])))


def outline(el):
    if el.get('type') == 'way' and 'geometry' in el:
        return [[round(g['lat'], 7), round(g['lon'], 7)] for g in el['geometry'] if g]
    if el.get('type') == 'relation':
        for m in el.get('members', []):
            if m.get('role') == 'outer' and 'geometry' in m:
                return [[round(g['lat'], 7), round(g['lon'], 7)] for g in m['geometry'] if g]
    return None


def area_m2(pts):
    if not pts or len(pts) < 3:
        return 0
    la = pts[0][0]
    k = 111320 * math.cos(math.radians(la))
    xy = [((p[1] - pts[0][1]) * k, (p[0] - pts[0][0]) * 111320) for p in pts]
    return abs(sum(xy[i][0] * xy[i - 1][1] - xy[i - 1][0] * xy[i][1] for i in range(len(xy)))) / 2


def osm():
    print('--- OSM: Overpass')
    d = overpass(Q)
    els = d.get('elements', [])
    print('elements', len(els))
    out = {'places': [], 'pois': [], 'blocks': []}
    for el in els:
        t = el.get('tags', {})
        c = centre(el)
        if not c:
            continue
        rec = {'id': el['type'][0] + str(el['id']), 'osm': el['id'], 'type': el['type'], 'tags': t, 'c': [round(c[0], 7), round(c[1], 7)]}
        ol = outline(el)
        if 'place' in t:
            out['places'].append(rec)
            continue
        is_block = t.get('building') in ('apartments', 'residential') or (
            'building' in t and t.get('building:levels', '').isdigit() and int(t['building:levels']) >= 5)
        if is_block and not any(k in t for k in ('amenity', 'shop', 'tourism', 'leisure')):
            rec['ol'] = ol
            rec['a'] = round(area_m2(ol))
            out['blocks'].append(rec)
            continue
        rec['ol'] = ol
        out['pois'].append(rec)
    # buildings around each POI that is a node or an area without building tag (the club house beside a pitch, the shop's house)
    near = []
    for p in out['pois']:
        t = p['tags']
        if p['type'] == 'node' or 'building' not in t:
            near.append(p)
    print('POIs', len(out['pois']), 'needing buildings', len(near))
    for k in range(0, len(near), 25):
        part = near[k:k + 25]
        q = '[out:json][timeout:120];(' + ''.join(
            f'way["building"](around:{60 if "leisure" in p["tags"] else 25},{p["c"][0]},{p["c"][1]});' for p in part) + ');out tags geom;'
        d2 = overpass(q)
        bl = []
        for el in d2.get('elements', []):
            ol = outline(el)
            c = centre(el)
            if ol and c:
                bl.append({'id': 'w' + str(el['id']), 'osm': el['id'], 'tags': el.get('tags', {}), 'c': [round(c[0], 7), round(c[1], 7)],
                           'ol': ol, 'a': round(area_m2(ol))})
        for p in part:
            r = 60 if 'leisure' in p['tags'] else 25
            p['near'] = sorted([b for b in bl if dist(b['c'], p['c']) < r + 30], key=lambda b: dist(b['c'], p['c']))[:8]
        time.sleep(2)
    json.dump(out, open(OUT + '/osm.json', 'w'), ensure_ascii=False, indent=0)
    # the log: what is where
    print('\n=== places')
    for p in out['places']:
        print(p['id'], p['tags'].get('place'), p['tags'].get('name'), p['c'])
    print('\n=== POIs')
    for p in sorted(out['pois'], key=lambda p: (list(p['tags'].keys())[0] if p['tags'] else '', p['c'])):
        t = p['tags']
        kind = t.get('amenity') or t.get('tourism') or t.get('leisure') or t.get('shop') or t.get('building') or t.get('club') or '?'
        print(f"{p['id']:>12} {kind:<16} {t.get('name', '')[:40]:<40} {p['c']} b={t.get('building', '')} lv={t.get('building:levels', '')} "
              f"h={t.get('height', '')} sport={t.get('sport', '')} addr={t.get('addr:street', '')} {t.get('addr:housenumber', '')} "
              f"a={round(area_m2(p.get('ol')))}")
        for b in p.get('near', []):
            bt = b['tags']
            print(f"{'':>14}near {b['id']} {bt.get('building')} lv={bt.get('building:levels', '')} {bt.get('name', '')} "
                  f"{bt.get('addr:street', '')} {bt.get('addr:housenumber', '')} a={b['a']} d={round(dist(b['c'], p['c']))}")
    print('\n=== blocks (levels ≥ 5 or apartments)', len(out['blocks']))
    from collections import Counter
    print(Counter(b['tags'].get('building:levels', '?') for b in out['blocks']).most_common(20))
    for b in out['blocks'][:400]:
        t = b['tags']
        print(f"{b['id']:>12} lv={t.get('building:levels', ''):<3} {b['c']} a={b['a']} {t.get('addr:street', '')} {t.get('addr:housenumber', '')} "
              f"roof={t.get('roof:shape', '')} h={t.get('height', '')}")
    return out


# ---------------------------------------------------------------- Wikipedia
WIKI = ['Hauptkirche St. Marien (Suhl)', 'Kreuzkirche (Suhl)', 'Waffenmuseum Suhl', 'Congress Centrum Suhl', 'Malzhaus (Suhl)',
        'Suhl-Nord', 'Suhl', 'Aue (Suhl)', 'WBS 70', 'Steinweg (Suhl)', 'Sportplatz Aue', 'Lautenberg (Suhl)', 'Kaufhalle',
        'Plattenbau', 'Ottilienstein', 'Simson (Unternehmen)', 'Stadion Auenkampfbahn', 'Auenkampfbahn', 'Kulturhaus Suhl',
        'Suhl-Mitte', 'Liste der Kulturdenkmale in Suhl', 'Neues Rathaus Suhl', 'Rathaus Suhl']


def wiki():
    print('\n--- Wikipedia (de)')
    for t in WIKI:
        try:
            r = S.get('https://de.wikipedia.org/w/api.php', params={'action': 'query', 'prop': 'extracts', 'explaintext': 1, 'redirects': 1,
                                                                    'titles': t, 'format': 'json'}, timeout=60).json()
            for pg in r['query']['pages'].values():
                txt = pg.get('extract')
                if not txt:
                    print('  missing', t)
                    continue
                fn = re.sub(r'[^A-Za-z0-9]+', '_', pg['title'])[:60] + '.txt'
                open(OUT + '/wiki/' + fn, 'w').write(pg['title'] + '\nhttps://de.wikipedia.org/wiki/' + pg['title'].replace(' ', '_') +
                                                     '\nLizenz: CC BY-SA 4.0 (Text nur gelesen)\n\n' + txt)
                print('  ok', pg['title'], len(txt))
        except Exception as e:
            print('  err', t, e)


# ---------------------------------------------------------------- Commons
API = 'https://commons.wikimedia.org/w/api.php'
OK_LIC = re.compile(r'^(cc0|cc[- ]by[- ](sa[- ])?\d|cc[- ]by[- ]\d|cc[- ]by[- ]sa[- ]\d|public domain|pd|cc-pd|cc by-sa|cc by)', re.I)
BAD_LIC = re.compile(r'(nc|nd|non[- ]?commercial|no[- ]?deriv|fair use|copyrighted)', re.I)


def capi(**p):
    p.update({'format': 'json'})
    for k in range(3):
        try:
            return S.get(API, params=p, timeout=60).json()
        except Exception as e:
            print('commons', e)
            time.sleep(3)
    return {}


def cat_files(cat, depth=1, lim=80, seen=None):
    seen = seen if seen is not None else set()
    if cat in seen or lim <= 0:
        return []
    seen.add(cat)
    out, subs = [], []
    r = capi(action='query', list='categorymembers', cmtitle=cat, cmtype='file|subcat', cmlimit=200)
    for m in r.get('query', {}).get('categorymembers', []):
        if m['ns'] == 6:
            out.append(m['title'])
        elif m['ns'] == 14:
            subs.append(m['title'])
    if depth > 0:
        for s in subs:
            if len(out) >= lim:
                break
            out += cat_files(s, depth - 1, lim - len(out), seen)
    return out[:lim]


def search(q, ns=6, lim=40):
    r = capi(action='query', list='search', srsearch=q, srnamespace=ns, srlimit=lim)
    return [m['title'] for m in r.get('query', {}).get('search', [])]


def info(titles):
    res = {}
    for k in range(0, len(titles), 40):
        r = capi(action='query', titles='|'.join(titles[k:k + 40]), prop='imageinfo', iiprop='url|extmetadata|size|mime', iiurlwidth=640)
        for pg in r.get('query', {}).get('pages', {}).values():
            ii = (pg.get('imageinfo') or [None])[0]
            if not ii or not ii.get('mime', '').startswith('image/') or ii.get('mime') == 'image/svg+xml':
                continue
            em = ii.get('extmetadata', {})
            lic = re.sub('<[^>]+>', '', em.get('LicenseShortName', {}).get('value', ''))
            art = re.sub('<[^>]+>', '', em.get('Artist', {}).get('value', '')).strip()[:80]
            date = re.sub('<[^>]+>', '', em.get('DateTimeOriginal', {}).get('value', ''))[:20]
            desc = re.sub('<[^>]+>', '', em.get('ImageDescription', {}).get('value', '')).strip()[:200]
            res[pg['title']] = {'title': pg['title'], 'thumb': ii.get('thumburl'), 'page': ii.get('descriptionurl'), 'lic': lic, 'author': art,
                                'date': date, 'desc': desc, 'w': ii.get('width'), 'h': ii.get('height')}
    return res


def lic_ok(l):
    return bool(l) and not BAD_LIC.search(l.replace('Public domain', '')) and (
        OK_LIC.search(l) or 'public domain' in l.lower() or l.lower().startswith('pd'))


FONT = None


def font(sz):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf']:
        if os.path.exists(f):
            return ImageFont.truetype(f, sz)
    return ImageFont.load_default()


CREDITS = []


def sheets(topic, recs, per=6):
    """2 × 3 photos per sheet, 1000 px wide; caption: number, title, date, licence."""
    f1, f2 = font(15), font(12)
    W, H, CH = 500, 310, 44
    n = 0
    for k in range(0, len(recs), per):
        part = recs[k:k + per]
        rows = (len(part) + 1) // 2
        sh = Image.new('RGB', (2 * W, rows * (H + CH)), (30, 30, 30))
        dr = ImageDraw.Draw(sh)
        for i, r in enumerate(part):
            x, y = (i % 2) * W, (i // 2) * (H + CH)
            try:
                im = Image.open(io.BytesIO(S.get(r['thumb'], timeout=60).content)).convert('RGB')
                im.thumbnail((W - 6, H - 6))
                sh.paste(im, (x + (W - im.width) // 2, y + (H - im.height) // 2))
            except Exception as e:
                dr.text((x + 10, y + 10), 'Fehler: ' + str(e)[:60], fill=(255, 80, 80), font=f2)
            num = f'{topic}-{k + i + 1}'
            dr.text((x + 6, y + H + 2), f"{num}  {r['title'][5:70]}", fill=(255, 255, 255), font=f1)
            dr.text((x + 6, y + H + 22), f"{r['date'][:10]}  {r['lic']}  {r['author'][:40]}", fill=(200, 200, 200), font=f2)
            CREDITS.append(f"| {num} | [{r['title'][5:]}]({r['page']}) | {r['author']} | {r['lic']} | {r['date'][:10]} | {r['desc'][:120]} |")
        n += 1
        sh.save(f'{OUT}/sheets/{topic}_{n:02d}.jpg', quality=82)
        time.sleep(0.5)
    print(f'  {topic}: {len(recs)} photos on {n} sheets')


INTERIOR = re.compile(r'(innen|interior|inside|innenraum|orgel|organ|altar|kanzel|pulpit|empore|gestühl|nave|kirchenschiff|ausstellung|'
                      r'exhibit|vitrine|saal|hall|foyer|treppe|stair|küche|kitchen|wohnzimmer|living|bad|bath|flur|museumswohnung|'
                      r'kaufhalle|supermarkt|vereinsheim|umkleide|klassenzimmer|classroom|decke|ceiling|stuck|fenster)', re.I)

TOPICS = {
    # topic: (categories to walk, searches, prefer interior)
    'marien': (['Category:Hauptkirche St. Marien (Suhl)'], ['Hauptkirche Suhl', 'Marienkirche Suhl innen', 'Suhl Hauptkirche Orgel'], True),
    'kreuz': (['Category:Kreuzkirche (Suhl)'], ['Kreuzkirche Suhl', 'Kreuzkirche Suhl innen'], True),
    'waffen': (['Category:Waffenmuseum Suhl', 'Category:Malzhaus (Suhl)'], ['Waffenmuseum Suhl', 'Malzhaus Suhl'], False),
    'ccs': (['Category:Congress Centrum Suhl'], ['Congress Centrum Suhl', 'CCS Suhl', 'Stadthalle Suhl'], False),
    'markt': (['Category:Markt (Suhl)', 'Category:Steinweg (Suhl)'], ['Suhl Steinweg', 'Suhl Markt Café'], False),
    'nord': (['Category:Suhl-Nord'], ['Suhl-Nord', 'Suhl Nord Plattenbau', 'Suhl Neubaugebiet'], False),
    'aue': (['Category:Suhl-Aue', 'Category:Aue (Suhl)'], ['Suhl Aue', 'Suhl Auenkampfbahn', 'Suhl Sportplatz'], False),
    'wbs70': (['Category:WBS 70', 'Category:Museumswohnung WBS 70'], ['WBS 70 Wohnung', 'Museumswohnung Hellersdorf', 'DDR Küche Plattenbau',
                                                                       'Plattenbau Treppenhaus', 'Plattenbau Wohnzimmer DDR'], True),
    'kaufhalle': (['Category:Kaufhallen in East Germany'], ['Kaufhalle DDR', 'Bundesarchiv Kaufhalle', 'Kaufhalle Suhl'], True),
    'historisch': ([], ['Bundesarchiv Bild 183 Suhl', 'Fotothek Suhl', 'Suhl 1980', 'Suhl Neubauten'], False),
}


def commons():
    print('\n--- Commons')
    for topic, (cats, qs, inner) in TOPICS.items():
        titles = []
        for c in cats:
            titles += cat_files(c, depth=2, lim=120)
        for q in qs:
            titles += search(q, lim=40)
        # category search: names with Suhl the walk above did not know
        if topic in ('marien', 'kreuz', 'waffen', 'ccs', 'nord', 'aue'):
            for c in search(qs[0], ns=14, lim=6):
                titles += cat_files(c, depth=1, lim=60)
        titles = list(dict.fromkeys(titles))
        inf = info(titles)
        recs = [r for r in inf.values() if lic_ok(r['lic']) and r['thumb']]
        recs.sort(key=lambda r: (0 if INTERIOR.search(r['title'] + ' ' + r['desc']) else 1) if inner else 0)
        if not inner:
            recs.sort(key=lambda r: 0 if INTERIOR.search(r['title'] + ' ' + r['desc']) else 1)
        print(f'  {topic}: {len(titles)} files, {len(recs)} with open licence; first:', [r['title'][5:50] for r in recs[:8]])
        sheets(topic, recs[:30 if inner else 24])


def panoramax(o):
    """Street photos (Panoramax, CC BY-SA 4.0, tools/fotos/katalog.json) looking at the candidate buildings – for doors and fronts."""
    print('\n--- Panoramax at the candidates')
    kat = json.load(open('tools/fotos/katalog.json'))['photos']
    pm = [p for p in kat if p.get('zone') == 'suhl' and p.get('source') == 'panoramax' and p.get('heading') is not None]
    want = []
    for p in o.get('pois', []):
        t = p['tags']
        if t.get('amenity') == 'place_of_worship' or t.get('tourism') == 'museum' or t.get('leisure') in ('pitch', 'stadium', 'sports_centre') \
                or t.get('shop') in ('supermarket', 'mall') or t.get('amenity') == 'school' or re.search('congress|ccs', t.get('name', ''), re.I) \
                or t.get('amenity') == 'cafe' or t.get('shop') == 'bakery':
            want.append(p)
    recs = []
    for p in want:
        c = p['c']
        cand = []
        for f in pm:
            d = dist([f['lat'], f['lon']], c)
            if d > 90 or d < 8:
                continue
            br = math.degrees(math.atan2((c[1] - f['lon']) * math.cos(math.radians(c[0])), c[0] - f['lat'])) % 360
            off = abs((br - f['heading'] + 180) % 360 - 180)
            if off < 35:
                cand.append((d + off, f, round(d), round(off)))
        cand.sort(key=lambda z: z[0])
        for _, f, d, off in cand[:2]:
            nm = p['tags'].get('name') or p['tags'].get('amenity') or p['tags'].get('shop') or p['tags'].get('leisure')
            recs.append({'title': f'File:{p["id"]} {nm} – {d} m, {f["heading"]}°', 'thumb': f['url'], 'page': f['page'], 'lic': f['license'],
                         'author': f['author'], 'date': f['date'], 'desc': f'{f["lat"]},{f["lon"]} heading {f["heading"]}'})
    print('  photos', len(recs))
    sheets('pmx', recs[:48])


if __name__ == '__main__':
    what = os.environ.get('WAS', 'osm,wiki,commons,panoramax').split(',')
    o = {}
    if 'osm' in what:
        try:
            o = osm()
        except Exception as e:
            print('OSM failed', e)
    if 'panoramax' in what and o:
        try:
            panoramax(o)
        except Exception as e:
            print('Panoramax failed', e)
    if 'wiki' in what:
        wiki()
    if 'commons' in what:
        commons()
    open(OUT + '/CREDITS.md', 'w').write(
        '# Fotos auf den Kontaktbögen (nur zum Ansehen, nicht Teil der App)\n\nQuelle: Wikimedia Commons; nur CC0, CC BY, CC BY-SA, '
        'gemeinfrei.\n\n| Nr. | Datei | Urheber | Lizenz | Datum | Beschreibung |\n|---|---|---|---|---|---|\n' + '\n'.join(CREDITS) + '\n')
    print('done')
