#!/usr/bin/env python3
"""Research for the zombie night's interiors (feat/zombie) – runs in GitHub Actions only (the chat machine reaches neither Commons nor
Wikipedia). Real photos of Thuringian (and Franconian-Henneberg) village interiors as models for the furnishing of the enterable houses:
the Stube with tiled stove and corner bench, the kitchen, the chamber, cellar, attic, barn, bathroom with coal water heater, the GDR living
room with its wall unit – plus the E57 siren on a roof and siren recordings (audio only listed).

Writes into OUT (default ./ref):
  wiki/*.txt     plain text of German Wikipedia articles (read for layouts and furnishing, not shipped)
  sheets/*.jpg   contact sheets (2 × 3 photos, 1000 px wide) of Commons photos – only CC0, CC BY, CC BY-SA, public domain
  audio.json     Commons audio files for the siren (title, url, licence, author, duration) – not downloaded
  CREDITS.md     author, licence, source of every photo on a sheet
The results go to the scratch branch ref/zombie-innen-fotos (never merged, deleted at the end); a summary goes into the job log.
"""
import io
import json
import os
import re
import sys
import time

import requests
from PIL import Image, ImageDraw, ImageFont

OUT = sys.argv[1] if len(sys.argv) > 1 else 'ref'
S = requests.Session()
S.headers.update({'User-Agent': 'pavillon-ratscher-research/1.0 (https://github.com/mynametouse/pavillon-ratscher; feat/zombie)'})
os.makedirs(OUT + '/wiki', exist_ok=True)
os.makedirs(OUT + '/sheets', exist_ok=True)

# ---------------------------------------------------------------- Wikipedia
WIKI = ['Mitteldeutsches Ernhaus', 'Ernhaus', 'Stube (Raum)', 'Bauernstube', 'Kachelofen', 'Hinterlader (Ofen)', 'Ofenbank', 'Eckbank',
        'Herrgottswinkel', 'Küchenbuffet', 'Kohleherd', 'Schrankwand', 'Wohnkultur in der DDR', 'Badeofen', 'Waschküche', 'Einkochen',
        'Einmachglas', 'Hausschlachtung', 'Räucherkammer', 'Dachboden', 'Tenne', 'Fachwerkhaus', 'Fränkisches Gehöft', 'Wohnstallhaus',
        'Hennebergisches Museum Kloster Veßra', 'Thüringer Freilichtmuseum Hohenfelden', 'Thüringer Bauernhäuser Rudolstadt',
        'Fränkisches Freilandmuseum Fladungen', 'Lauschaer Glas', 'Christbaumschmuck', 'Kuckucksuhr', 'Röhrender Hirsch',
        'Motorsirene', 'E57 (Sirene)', 'Sirene (Signalgeber)', 'Bockdoppelflinte', 'Waffenschrank', 'Simson S51', 'Konsum (Handelskette)',
        'Thüringer Klöße', 'Thüringer Rostbratwurst', 'Ratscher', 'Schleusingen', 'Plauener Spitze', 'Gardine']


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
        time.sleep(0.3)


# ---------------------------------------------------------------- Commons
API = 'https://commons.wikimedia.org/w/api.php'
OK_LIC = re.compile(r'^(cc0|cc[- ]by[- ](sa[- ])?\d|cc[- ]by[- ]\d|cc[- ]by[- ]sa[- ]\d|public domain|pd|cc-pd|cc by-sa|cc by)', re.I)
BAD_LIC = re.compile(r'(nc|nd|non[- ]?commercial|no[- ]?deriv|fair use|copyrighted)', re.I)


def capi(**p):
    p.update({'format': 'json'})
    for k in range(4):
        try:
            r = S.get(API, params=p, timeout=60)
            if r.status_code == 429:
                time.sleep(int(r.headers.get('Retry-After') or 10) + 1)
                continue
            return r.json()
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


def strip(s):
    return re.sub(r'\s+', ' ', re.sub('<[^>]+>', ' ', s or '')).strip()


def info(titles, mime='image/'):
    res = {}
    for k in range(0, len(titles), 40):
        r = capi(action='query', titles='|'.join(titles[k:k + 40]), prop='imageinfo', iiprop='url|extmetadata|size|mime', iiurlwidth=640)
        for pg in r.get('query', {}).get('pages', {}).values():
            ii = (pg.get('imageinfo') or [None])[0]
            if not ii or not ii.get('mime', '').startswith(mime) or ii.get('mime') == 'image/svg+xml':
                continue
            em = ii.get('extmetadata', {})
            res[pg['title']] = {'title': pg['title'], 'thumb': ii.get('thumburl'), 'url': ii.get('url'), 'page': ii.get('descriptionurl'),
                                'lic': strip(em.get('LicenseShortName', {}).get('value', '')),
                                'author': strip(em.get('Artist', {}).get('value', ''))[:80],
                                'date': strip(em.get('DateTimeOriginal', {}).get('value', ''))[:20],
                                'desc': strip(em.get('ImageDescription', {}).get('value', ''))[:240], 'w': ii.get('width'),
                                'h': ii.get('height'), 'mime': ii.get('mime'), 'dur': ii.get('duration')}
    return res


def lic_ok(l):
    return bool(l) and not BAD_LIC.search(l.replace('Public domain', '')) and (
        OK_LIC.search(l) or 'public domain' in l.lower() or l.lower().startswith('pd'))


def font(sz):
    for f in ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', '/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf']:
        if os.path.exists(f):
            return ImageFont.truetype(f, sz)
    return ImageFont.load_default()


CREDITS = []


def sheets(topic, recs, per=6):
    """2 × 3 photos per sheet, 1000 px wide; caption: number, title, date, licence."""
    f1, f2 = font(15), font(12)
    W, H, CH = 500, 330, 44
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
            CREDITS.append(f"| {num} | [{r['title'][5:]}]({r['page']}) | {r['author']} | {r['lic']} | {r['date'][:10]} | {r['desc'][:160]} |")
        n += 1
        sh.save(f'{OUT}/sheets/{topic}_{n:02d}.jpg', quality=82)
        time.sleep(0.3)
    print(f'  {topic}: {len(recs)} photos on {n} sheets')


# a photo of the room itself, not of a façade, a sign or a single museum object
ROOM = re.compile(r'(stube|küche|kueche|kitchen|kammer|chamber|keller|cellar|ofen|stove|innen|interior|inside|zimmer|room|bett|bed|'
                  r'diele|flur|hall|treppe|stair|boden|attic|scheune|barn|tenne|bad|bath|wohnung|flat|apartment|möbel|furniture|'
                  r'schrank|cupboard|tisch|table|bank|regal|shelf|gläser|jars|werkstatt|workshop)', re.I)
NOT = re.compile(r'(außen|aussen|exterior|fassade|facade|luftbild|aerial|karte|map|schild|sign|logo|plan |grundriss|portrait|porträt)', re.I)

TOPICS = {
    # topic: (categories to walk, searches, how many photos, what the photo should show – those come first)
    'hohenfelden': (['Category:Thüringer Freilichtmuseum Hohenfelden'], ['Freilichtmuseum Hohenfelden Stube', 'Freilichtmuseum Hohenfelden Küche',
                     'Freilichtmuseum Hohenfelden innen'], 30, r'stube|küche|kammer|innen|ofen|bett|interior|room|zimmer|tisch|herd|schrank'),
    'vessra': (['Category:Hennebergisches Museum Kloster Veßra'], ['Kloster Veßra Museum', 'Hennebergisches Museum innen'], 18,
               r'museum|innen|ofen|stube|küche|kammer|zimmer|interior|bett|schrank'),
    'fladungen': (['Category:Fränkisches Freilandmuseum Fladungen'], ['Freilandmuseum Fladungen Stube', 'Freilandmuseum Fladungen Küche'], 18,
                  r'stube|küche|kammer|innen|ofen|bett|interior|room|zimmer|tisch|herd|schrank'),
    'stube': ([], ['Bauernstube Thüringen', 'Bauernstube Freilichtmuseum', 'Wohnstube Bauernhaus Museum', 'Stube Eckbank Kachelofen',
                   'Heimatstube Thüringen', 'Bauernstube Museum Ofen', 'Stube Fachwerkhaus innen'], 24, r'stube|eckbank|ofen|zimmer|innen|interior|room'),
    'ofen': (['Category:Tiled stoves in Thuringia'], ['Kachelofen Bauernstube', 'Kachelofen grün Stube', 'Kachelofen Thüringen', 'Ofenbank Kachelofen',
                                                      'Kanonenofen', 'Küchenhexe Herd'], 18, r'kachelofen|ofen|stove|herd'),
    'kueche': ([], ['Bauernküche Freilichtmuseum', 'Küchenbuffet alt', 'Kohleherd Küche', 'alte Küche Museum Thüringen', 'Wohnküche Bauernhaus',
                    'DDR Küche', 'DDR-Museum Küche', 'Küche 1960er'], 24, r'küche|kueche|kitchen|herd|buffet|büfett'),
    'ddr': (['Category:Museumswohnung WBS 70', 'Category:Dokumentationszentrum Alltagskultur der DDR'],
            ['DDR Wohnzimmer Schrankwand', 'Schrankwand DDR', 'Wohnzimmer 1970er DDR Museum', 'DDR Schlafzimmer Museum', 'DDR Kinderzimmer Museum',
             'DDR Museum Wohnzimmer', 'Wohnzimmer 1980er', 'DDR-Museum Pirna Wohnzimmer'], 24, r'wohnzimmer|schrankwand|living|zimmer|schlafzimmer|kinderzimmer'),
    'kammer': ([], ['Schlafkammer Bauernhaus', 'Schlafzimmer Freilichtmuseum', 'Bauernbett Museum', 'Kammer Bauernhaus Museum', 'Schlafstube Bauernhaus'],
               12, r'schlaf|bett|bed|kammer'),
    'keller': (['Category:Home canning'], ['Kohlenkeller', 'Gewölbekeller Bauernhaus', 'Einweckgläser Regal', 'Kartoffelkeller', 'Keller Einmachgläser',
                                           'Vorratskeller'], 18, r'keller|cellar|gläser|einweck|einmach|kohle|kartoffel|vorrat|jar'),
    'bad': ([], ['Badeofen Kohle', 'Badeofen Museum', 'Badezimmer DDR', 'Waschküche Museum', 'Waschkessel Waschküche'], 12, r'bad|bath|wasch'),
    'flur': ([], ['Treppenhaus Fachwerkhaus', 'Flur Freilichtmuseum', 'Diele Bauernhaus', 'Hausflur alt Treppe', 'Holztreppe alt Haus',
                  'Treppe Bauernhaus Museum'], 12, r'treppe|flur|diele|stair|hall'),
    'boden': (['Category:Attics in Germany'], ['Dachboden Bauernhaus', 'Dachboden Fachwerkhaus', 'Dachstuhl innen Bauernhaus', 'Heuboden Scheune',
                                                'Räucherkammer Dachboden'], 12, r'dachboden|attic|dachstuhl|boden|speicher|räucher'),
    'scheune': ([], ['Scheune innen Thüringen', 'Scheune innen Fachwerk', 'Tenne Scheune innen', 'Holzlege Bauernhof', 'Werkstatt Bauernhof alt',
                     'Leiterwagen Scheune'], 12, r'innen|interior|tenne|heu|stroh|werkstatt|holzlege'),
    'jaeger': ([], ['Jagdzimmer Geweih', 'Jagdstube', 'Waffenschrank Jagd', 'Geweih Wand Stube', 'Jagdhütte innen'], 12, r'jagd|geweih|hunting'),
    'sirene': (['Category:E57 sirens'], ['Sirene E57', 'E57 Sirene Dach', 'Motorsirene Dach', 'Sirene Feuerwehr Dach Dorf'], 12, r'sirene|siren|e57'),
}


def commons():
    print('\n--- Commons')
    only = os.environ.get('THEMEN', '')
    for topic, (cats, qs, lim, want) in TOPICS.items():
        if only and topic not in only.split(','):
            continue
        titles = []
        for c in cats:
            titles += cat_files(c, depth=2, lim=160)
        for q in qs:
            titles += search(q, lim=40)
        titles = list(dict.fromkeys(titles))
        inf = info(titles)
        recs = [r for r in inf.values() if lic_ok(r['lic']) and r['thumb']]
        txt = lambda r: r['title'] + ' ' + r['desc']
        W = re.compile(want, re.I)
        recs.sort(key=lambda r: (0 if W.search(txt(r)) and not NOT.search(txt(r)) else 1 if ROOM.search(txt(r)) and not NOT.search(txt(r)) else 2))
        print(f'  {topic}: {len(titles)} files, {len(recs)} with open licence; first:', [r['title'][5:60] for r in recs[:10]])
        sheets(topic, recs[:lim])


WANT_AUDIO = ['E57 Motorsirene Heulton', 'Motorsirene - Feuerwehralarm', 'Civil-defense-siren-waver', 'Sirene und Kirchenglocken Eschelbronn 2018 07 07.ogg',
              'Pneumatische Sirene - Alarm', 'De-Luftschutzsirene', 'Sirenenalarm.ogg']


def audio():
    print('\n--- Commons audio (siren)')
    titles = []
    for q in ['Sirene E57', 'Sirene Feuerwehr', 'air raid siren', 'Luftschutzsirene', 'Motorsirene', 'siren wail', 'Hochleistungssirene']:
        titles += search(q + ' filetype:audio', lim=30) + search(q, lim=20)
    titles += cat_files('Category:Audio files of sirens', depth=1, lim=80)
    titles = list(dict.fromkeys(titles))
    inf = info(titles, mime='audio/') | info(titles, mime='application/ogg') | info(titles, mime='video/')
    recs = [{k: r[k] for k in ('title', 'url', 'page', 'lic', 'author', 'date', 'desc', 'mime', 'dur')} for r in inf.values()]
    recs = [r for r in recs if lic_ok(r['lic'])]
    json.dump(recs, open(OUT + '/audio.json', 'w'), ensure_ascii=False, indent=1)
    # the originals of the few that may be used (public domain, CC0, CC BY-SA – converted and trimmed on the chat machine with ffmpeg)
    os.makedirs(OUT + '/audio', exist_ok=True)
    for r in recs:
        if any(k in r['title'] for k in WANT_AUDIO):
            fn = OUT + '/audio/' + re.sub(r'[^A-Za-z0-9._-]+', '_', r['title'][5:])
            try:
                open(fn, 'wb').write(S.get(r['url'], timeout=120).content)
                print('  saved', fn, os.path.getsize(fn))
            except Exception as e:
                print('  audio download failed', r['title'], e)
    for r in recs:
        print(f"  {r['title'][5:80]:<80} {r['lic']:<14} {r['dur']} s  {r['mime']}")


if __name__ == '__main__':
    what = os.environ.get('WAS', 'wiki,commons,audio').split(',')
    if 'wiki' in what:
        wiki()
    if 'commons' in what:
        commons()
    if 'audio' in what:
        try:
            audio()
        except Exception as e:
            print('audio failed', e)
    open(OUT + '/CREDITS.md', 'w').write(
        '# Fotos auf den Kontaktbögen (nur zum Ansehen, nicht Teil der App)\n\nQuelle: Wikimedia Commons; nur CC0, CC BY, CC BY-SA, '
        'gemeinfrei.\n\n| Nr. | Datei | Urheber | Lizenz | Datum | Beschreibung |\n|---|---|---|---|---|---|\n' + '\n'.join(CREDITS) + '\n')
    print('done')
