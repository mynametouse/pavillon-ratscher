"""After the Commons collection (GitHub Actions, called by the workflow if this file is on the branch):
1. the merged catalogue katalog_suhl.json.gz (merge.py, if present),
2. Commons photos per landmark and per street of the Zentrum (by the names in title, description and categories, and by
   camera position) -> tools/suhl/out/fotos/commons_zentrum.json,
3. contact sheets of those photos (free licences only: CC0, CC BY, CC BY-SA, public domain; 500 px thumbnails, one per
   second) with CREDITS.md into <refdir>/commons/ - the workflow puts that folder on the scratch branch ref/suhl-fotos.
    python tools/suhl/fotos/nach_commons.py <refdir> [gebiete.geojson]"""
import sys, os, re, json, subprocess, collections
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import slib, sheetlib

REF = os.path.abspath(sys.argv[1]); OUTDIR = os.path.join(REF, 'commons'); CACHE = os.path.join(REF, '..', 'commons-cache')
areas = slib.Areas()   # the copy of the areas next to the results (tools/suhl/out/fotos/gebiete.geojson), the same as on the chat machine
PER_GROUP = 12
NO_SHEETS = '--no-sheets' in sys.argv   # on the chat machine (no access to the Commons image host): only the numbers
GROUPS = [   # landmark or place -> words to look for (title, description, categories)
    ('Rathaus am Markt', r'\bRathaus\b|Rotes Rathaus'), ('Markt', r'\bMarkt(platz)?\b'), ('Steinweg', r'Steinweg'),
    ('Hauptkirche St. Marien', r'Marienkirche|St\.? ?Marien|Hauptkirche'), ('Kreuzkirche', r'Kreuzkirche'),
    ('Waffenmuseum (Malzhaus)', r'Waffenmuseum|Malzhaus'), ('Congress Centrum Suhl', r'Congress Centrum|\bCCS\b|Stadthalle'),
    ('Bahnhof', r'Bahnhof'), ('Lauterbogen-Center', r'Lauterbogen'), ('Stadtbücherei', r'Stadtbücherei|Stadtbibliothek'),
    ('Haus Philharmonie und Kulturhaus', r'Philharmonie|Kulturhaus'), ('Waffenschmied und Brunnen', r'Waffenschmied|Dianabrunnen|Diana auf|Vogelbrunnen'),
    ('Hochhäuser und Plattenbauten', r'Hochhaus|Hochhäuser|high-rise|Plattenbau|Wohnscheibe'), ('Luftbilder und Stadtansichten', r'aerial|Luftbild|Luftaufnahme|Panorama|Blick auf Suhl|Stadtansicht|view of Suhl|Views of Suhl|Domberg'),
    ('Villa Simson', r'Villa Simson'), ('St. Kilian', r'Kilian'), ('Kaufhaus und Centrum-Warenhaus', r'Kaufhaus|Warenhaus|Centrum'),
]


def text_of(p):
    return ' '.join([p.get('title') or '', p.get('description') or '', ' '.join(p.get('categories') or []), p.get('found_via') or ''])


def year_of(p):
    m = re.search(r'(1[89]\d\d|20\d\d)', p.get('date') or '')
    return int(m.group(1)) if m else None


def date_text(p):
    """The date as Commons gives it, without the words around it ('Taken on 28 April 2025' -> '28 April 2025')."""
    d = re.sub(r'^(taken on|photographed on|date)\s*:?\s*', '', (p.get('date') or '').strip(), flags=re.I)
    m = re.match(r'\d{4}-\d{2}-\d{2}', d)
    return m.group(0) if m else (d[:20] or 'ohne Datum')


def pick(ps, n):
    """Newest first, but no more than a third from one author and day, so that a sheet shows different views."""
    ps = sorted(ps, key=lambda p: (-(year_of(p) or 0), p['id']))
    out, per = [], collections.Counter()
    for p in ps:
        k = (p.get('author'), (p.get('date') or '')[:10])
        if per[k] >= max(2, n // 3): continue
        per[k] += 1; out.append(p)
        if len(out) >= n: break
    for p in ps:
        if len(out) >= n: break
        if p not in out: out.append(p)
    return out


def main():
    if os.path.exists(os.path.join(slib.HERE, 'merge.py')):
        r = subprocess.run([sys.executable, os.path.join(slib.HERE, 'merge.py')], capture_output=True, text=True)
        print(r.stdout[-3000:], r.stderr[-2000:], flush=True)
    com = slib.load('commons.json.gz')
    photos = com['photos']
    try: streets = [s for s in slib.load('abdeckung.json')['strassen'] if s.get('zentrum') and s['zentrum']['laenge_m'] >= 30]
    except Exception: streets = []
    in_z = lambda p: p.get('lat') is not None and areas.has('zentrum', p['lat'], p['lon'])
    groups = collections.OrderedDict()
    for name, rx in GROUPS:
        groups[name] = [p for p in photos if re.search(rx, text_of(p), re.I) and (p.get('lat') is None or p.get('gebiet') in ('zentrum', 'kernstadt', 'stadt'))]
    for s in sorted(streets, key=lambda s: s['name']):
        if s['name'] in groups or s['name'] in ('Markt', 'Marktplatz', 'Steinweg'): continue
        rx = r'(?<![\w-])' + re.escape(s['name']) + r'(?![\w-])'
        hit = [p for p in photos if re.search(rx, text_of(p)) and (p.get('lat') is None or in_z(p) or p.get('gebiet') == 'kernstadt')]
        if hit: groups['Straße: ' + s['name']] = hit
    named = {p['id'] for ps in groups.values() for p in ps}
    rest = [p for p in photos if in_z(p) and p['id'] not in named]
    if rest: groups['Zentrum, sonst (nach Position)'] = rest
    hist = [p for p in photos if (year_of(p) or 9999) < 1991 and (in_z(p) or p.get('lat') is None)]
    if hist: groups['Historisch (vor 1991)'] = hist

    summary, credits, n_sheets = [], [], 0
    for name, ps in groups.items():
        ok = [p for p in ps if p.get('free') and p.get('relevant')]
        years = sorted(y for y in (year_of(p) for p in ps) if y)
        row = dict(gruppe=name, fotos=len(ps), frei_und_aussen=len(ok), mit_kameraposition=sum(1 for p in ps if p.get('position') == 'camera'),
                   mit_blickrichtung=sum(1 for p in ps if p.get('heading') is not None), jahre=[years[0], years[-1]] if years else None,
                   lizenzen=dict(collections.Counter(p.get('license') or '?' for p in ps).most_common(8)), blaetter=[],
                   titel=[p['title'] for p in sorted(ps, key=lambda p: p['id'])][:200])
        sel = [] if NO_SHEETS else pick(ok, PER_GROUP)
        for k in range(0, len(sel), 6):
            cells = []
            for p in sel[k:k + 6]:
                im = sheetlib.fetch_image(p['url_small'], CACHE, pause=1.0)
                head = f"Blick {sheetlib.wind16(p['heading'])} ({p['heading']:.0f}°)" if p.get('heading') is not None else 'Blickrichtung unbekannt'
                pos = 'Kamera' if p.get('position') == 'camera' else 'Objekt' if p.get('position') == 'object' else 'ohne'
                where = f"{p['lat']:.5f}, {p['lon']:.5f} ({pos})" if p.get('lat') is not None else 'ohne Position'
                cells.append((im, p['title'].replace('File:', '')[:90], f"{name} · {where} · {head} · {date_text(p)} · {(p.get('author') or '?')[:28]} · {p.get('license')}"))
                credits.append((name, p))
            fn = f"{sheetlib.slug(name)}_{k // 6 + 1}.jpg"
            sheetlib.sheet('Commons: ' + name, f'{len(ps)} Fotos, davon {len(ok)} frei lizenzierte Außenansichten; Blatt {k // 6 + 1}', cells, os.path.join(OUTDIR, fn))
            row['blaetter'].append('commons/' + fn); n_sheets += 1
        summary.append(row)
    slib.save('commons_zentrum_lokal.json' if NO_SHEETS else 'commons_zentrum.json', dict(version=1, fetched=com.get('fetched'), areas=areas.source, counts=com.get('counts'),
                                           note='Gruppen nach Wörtern in Titel, Beschreibung und Kategorien (nicht geprüft, ob jedes Foto das Objekt wirklich zeigt); Blätter nur mit CC0, CC BY, CC BY-SA, gemeinfrei',
                                           gruppen=summary), indent=1)
    if NO_SHEETS: print('numbers only, no sheets'); return
    os.makedirs(OUTDIR, exist_ok=True)
    with open(os.path.join(OUTDIR, 'CREDITS.md'), 'w', encoding='utf-8') as f:
        f.write('# Kontaktabzüge Wikimedia Commons – Urheber und Lizenzen\n\nNur Fotos mit CC0, CC BY, CC BY-SA oder gemeinfrei. Verkleinert (500 px), unverändert bis auf die Beschriftung.\n\n')
        last = None
        for name, p in credits:
            if name != last: f.write(f'\n## {name}\n\n'); last = name
            f.write(f"- [{p['title'].replace('File:', '')}]({p['page']}) – {p.get('author') or 'unbekannt'}, {p.get('license')}"
                    + (f" ({p['license_url']})" if p.get('license_url') else '') + f", {date_text(p)}\n")
    print(n_sheets, 'sheets,', len(credits), 'pictures,', len(groups), 'groups')
    for r in summary: print(' ', r['gruppe'], r['fotos'], r['frei_und_aussen'], len(r['blaetter']))


main()
